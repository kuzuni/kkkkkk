#!/usr/bin/env node
/* 작업 528 — 「만렙(`SUM_MAXLV`)을 손으로 적은 «잠복» 자리」 재현 + 되돌림 시험 (338 규칙)
 *
 *   node tools/probe528.js
 *
 * 등재문이 말하는 것은 «지금 빨간 게이트» 가 아니라 **잠복**이다 — 네 자리 전부 지금은 초록이고,
 * 초록인 이유가 «맞아서» 가 아니라 **100 이 만렙 50 보다 커서 우연히 MAX 로 튕기기 때문**이다.
 * 그래서 재현은 두 겹이어야 뜻이 산다:
 *
 *   §A 현재 트리(만렙 50) — 리터럴 100 이 «무엇으로 읽히는가». 지금 초록인 것이 우연임을 못박는다.
 *   §B 사본(만렙 150)     — 만렙이 100 **이상**으로 오르는 날 같은 리터럴이 무엇이 되는가.
 *                           옛 형태는 뜻을 잃고(§B 옛), `SUM_MAXLV` 에서 역산한 새 형태는 그대로 산다(§B 새).
 *
 * ⚠ 제품(`index.html`)은 한 줄도 안 고친다. §B 는 `const SUM_MAXLV = 50;` **한 줄만** 갈아 끼운
 *    사본(`.p528-max.html`)을 저장소 루트에 잠깐 뽑아 쓰고 끝나면 지운다.
 *    ⚠ 루트에 두는 이유는 360·367·438·439·453·467·471·541 선례와 같다 — /tmp 에 두면
 *      index.html 이 상대 경로로 무는 `assets/**` 가 통째로 404 다.
 */
const fs   = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const IDX  = path.join(ROOT, 'index.html');
const COPY = path.join(ROOT, `.p528-max-${process.pid}.html`);
const url  = f => 'file://' + f.replace(/\\/g, '/');

const LIT = 100;          /* 하네스 네 자리가 손으로 적어 둔 그 수 */
const BIG = 150;          /* §B 의 «만렙이 100 이상으로 오른 날» */

let pass = 0, fail = 0;
const ok = (b, name, got) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + name + ' — ' + got); b ? pass++ : fail++; };

/* 페이지에 «옛 형태 / 새 형태» 를 같은 순서로 물어보는 한 벌.
   ⚠ 판정식을 여기 베끼지 않는다 — 물어보는 것은 전부 제품이 그린 결과(단계 라벨·행 수·확률)다. */
function measure(lit) {
  const probe = b => {
    const h = document.getElementById('prbList').innerHTML;
    return { lv: document.getElementById('prbLv').textContent,
             imm: /불멸/.test(h), tr: /초월/.test(h),
             rows: document.querySelectorAll('#prbList .prb-row').length,
             heads: document.querySelectorAll('#prbList .prb-gh').length };
  };
  /* 768 — 저장·복원의 «자리» 는 714 뒤로 배너 칸이다. 496 의 공용 스칼라(`S.sumLv`)에 담으면
     읽기는 `undefined`, 되돌리기는 **아무 데도 안 닿는 새 전역**이라 원복이 조용히 사라진다. */
  const probsAt = v => { const o = S.sum.weapon.lv; S.sum.weapon.lv = v;
                         const p = gradeProbs('weapon'); S.sum.weapon.lv = o; return p; };
  const MAX = SUM_MAXLV;
  /* 773 — «몇 등급 · 몇 행이 나와야 하나» 도 손 상수가 아니라 **제품에서 파생**한다.
     757 이 확률표를 «그 배너가 파는 종» 까지 자른 뒤 펫이 8등급/36행 → 7등급/35행이 됐는데
     자만 옛 수에 굳어 [A2]·[B3] 이 빨갰다(제품이 옳고 자가 낡았다). 숫자만 7·35 로 내리면
     종이 다시 늘어나는 날 같은 자리가 또 부패하므로(처방 ⓑ 기각) 표와 종 목록에게 직접 묻는다.
     `gated` = «그 표에 옛 리터럴보다 늦게 열리는 행이 있나» — 되돌림 시험의 갈래 축이다. */
  const specOf = b => { const tab = rollOf(b), gs = new Set(BANNERS[b].list.map(x => x.g));
    return { heads: [...gs].filter(g => g < tab.length).length,
             rows:  BANNERS[b].list.filter(x => x.g < tab.length).length,
             gated: tab.some(g => g.unlock > lit) }; };
  const spec = { pet: specOf('pet'), weapon: specOf('weapon') };

  openProbInfo('weapon', lit);  const wOld = probe();
  openProbInfo('weapon', MAX);  const wNew = probe();
  openProbInfo('pet',   lit);   const pOld = probe();
  openProbInfo('pet',   MAX);   const pNew = probe();
  closeProbInfo();

  /* verify85 [D]·[E] 가 서 있던 상태 — 옛 형태는 lv 를 «100» 으로, 새 형태는 만렙으로 세운다 */
  const dOld = probsAt(lit), dNew = probsAt(MAX);
  const top = GRADE.length - 1;

  /* [E] 3,000연 — 옛/새 상태에서 최고 등급이 실제로 나오는가 (씨앗 없이 세므로 표본을 크게) */
  const sim = v => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = v;   /* 768 — 배너 칸으로 저장·복원 */
    const got = {}; let bad = 0;
    for (let i = 0; i < 3000; i++) { const r = summonOne('weapon');
      if (!r || !r.it || !EQ[r.it.id]) { bad++; continue; } got[r.it.g] = (got[r.it.g] || 0) + 1; }
    S.sum.weapon.lv = o; return { g7: got[top] || 0, g6: got[top - 1] || 0, bad };
  };
  const eOld = sim(lit), eNew = sim(MAX);

  return { max: MAX, lit, top, spec,
           live: (() => { const o = S.sum.weapon.lv; S.sum.weapon.lv = lit;
                          const v = S.sum.weapon.lv; S.sum.weapon.lv = o; return v; })(),
           wOld, wNew, pOld, pNew,
           dOld: dOld[top], dNew: dNew[top], dOld6: dOld[top - 1], dNew6: dNew[top - 1],
           eOld, eNew };
}

(async () => {
  const browser = await launch(chromium);
  const open = async f => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.goto(url(f));
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProbInfo === 'function'
                                     && typeof summonOne === 'function');
    await page.waitForTimeout(500);
    return page;
  };

  /* ── §A 현재 트리 ─────────────────────────────────────────────────────────────────── */
  const now = await open(IDX);
  const A = await now.evaluate(measure, LIT);
  await now.close();

  ok(A.max < A.lit,
     'A0 전제 — 하네스가 적어 둔 ' + A.lit + ' 은 지금 만렙보다 크다(그래서 «단계» 로는 존재하지 않는다)',
     '만렙 SUM_MAXLV=' + A.max + ' · 리터럴 ' + A.lit + ' = 만렙의 ' + (A.lit / A.max).toFixed(2) + '배');
  ok(A.wOld.lv === 'MAX' && A.wOld.lv === A.wNew.lv && A.wOld.imm === A.wNew.imm,
     'A1 재현 — openProbInfo(weapon, ' + A.lit + ') 는 «cur 이하 가장 높은 단계» 규칙에 걸려 MAX 로 튕긴다',
     '옛 단계=' + A.wOld.lv + ' 불멸행=' + A.wOld.imm + ' ↔ 새(SUM_MAXLV) 단계=' + A.wNew.lv + ' 불멸행=' + A.wNew.imm);
  ok(A.pOld.rows === A.pNew.rows && A.pOld.heads === A.pNew.heads
     && A.pNew.heads === A.spec.pet.heads && A.pNew.rows === A.spec.pet.rows,
     'A2 재현 — openProbInfo(pet, ' + A.lit + ') 도 같은 이유로 MAX 와 구별되지 않는다'
     + '(106 E7 이 세는 ' + A.spec.pet.rows + '행 — 773 이후 rollOf(pet) 파생)',
     '옛 ' + A.pOld.rows + '행/' + A.pOld.heads + '등급 ↔ 새 ' + A.pNew.rows + '행/' + A.pNew.heads
     + '등급 · 파생 ' + A.spec.pet.rows + '행/' + A.spec.pet.heads + '등급');
  ok(A.live === A.lit && Math.abs(A.dOld - A.dNew) < 1e-12,
     'A3 재현 — S.sum.weapon.lv = ' + A.lit + ' 은 496 별칭 뷰에 setter 클램프가 없어 그대로 들어가지만, '
     + 'gradeProbs 의 t 가 1 로 clamp 돼 만렙과 **같은 확률**이 된다',
     'live=' + A.live + '(만렙 ' + A.max + ') · 최고등급 확률 옛 ' + (A.dOld * 100).toFixed(4)
     + '% ↔ 새 ' + (A.dNew * 100).toFixed(4) + '%');
  ok(A.eOld.g7 > 0 && A.eNew.g7 > 0 && A.eOld.bad === 0,
     'A4 재현 — [E] 3,000연도 옛/새 둘 다 최고 등급이 나온다(지금은 두 형태가 «같은 물건»)',
     '옛 g' + A.top + '=' + A.eOld.g7 + ' · 새 g' + A.top + '=' + A.eNew.g7);

  /* ── §B 사본(만렙 150) ────────────────────────────────────────────────────────────── */
  const src = fs.readFileSync(IDX, 'utf8');
  const ANCH = 'const SUM_MAXLV = ' + A.max + ';';
  ok(src.split(ANCH).length === 2, 'B0 전제 — 사본 편집 자리 「' + ANCH + '」 를 소스에서 정확히 1건 찾았다',
     src.split(ANCH).length - 1 + '건');
  fs.writeFileSync(COPY, src.replace(ANCH, 'const SUM_MAXLV = ' + BIG + ';'));

  let B;
  try {
    const big = await open(COPY);
    B = await big.evaluate(measure, LIT);
    await big.close();
  } finally { try { fs.unlinkSync(COPY); } catch (_) {} }

  ok(B.max === BIG && B.max > B.lit,
     'B1 전제 — 사본은 만렙 ' + B.max + ' 다(리터럴 ' + B.lit + ' 이 이제 «만렙 아래의 평범한 단계» 가 된다)',
     'SUM_MAXLV=' + B.max);
  ok(B.wOld.lv === String(B.lit) && !B.wOld.imm && B.wNew.lv === 'MAX' && B.wNew.imm,
     'B2 되돌림 — 그 날 옛 형태는 «MAX 단계» 가 아니라 Lv' + B.lit + ' 을 열고 불멸 행이 사라진다 '
     + '(verify85 [G1] 이 뜻을 잃는다) · 새 형태는 그대로 MAX',
     '옛 단계=' + B.wOld.lv + ' 불멸행=' + B.wOld.imm + ' 초월행=' + B.wOld.tr
     + ' ↔ 새 단계=' + B.wNew.lv + ' 불멸행=' + B.wNew.imm);
  ok(B.pNew.rows === B.spec.pet.rows && B.pNew.heads === B.spec.pet.heads
     && (B.spec.pet.gated ? B.pOld.rows < B.pNew.rows : B.pOld.rows === B.pNew.rows)
     && B.spec.weapon.gated && B.wOld.rows < B.wNew.rows,
     'B3 되돌림 — 106 [E7] 이 세는 행은 «만렙 문턱 행» 이 있는 표에서만 옛 형태에서 줄어든다 '
     + '(757 이 펫에서 불멸을 걷어내 지금 줄어드는 쪽은 무기다 — 대조군)',
     '펫 옛 ' + B.pOld.rows + '행/' + B.pOld.heads + '등급 ↔ 새 ' + B.pNew.rows + '행/' + B.pNew.heads
     + '등급(파생 ' + B.spec.pet.rows + '행/' + B.spec.pet.heads + '등급 · 문턱행 '
     + (B.spec.pet.gated ? '있음' : '없음') + ') · 무기 옛 ' + B.wOld.rows + '행 ↔ 새 ' + B.wNew.rows + '행');
  ok(B.dOld === 0 && B.dNew > 0,
     'B4 되돌림 — [D2] «Lv' + B.lit + ' 에서 최고 등급 확률 > 0» 은 그 날 거짓이 된다(해금 전이라 0)',
     '옛 g' + B.top + ' 확률=' + (B.dOld * 100).toFixed(4) + '% ↔ 새 ' + (B.dNew * 100).toFixed(4) + '%');
  ok(B.eOld.g7 === 0 && B.eNew.g7 > 0,
     'B5 되돌림 — [E2] «3,000연에서 최고 등급 실제 등장» 도 옛 형태에선 0건',
     '옛 g' + B.top + '=' + B.eOld.g7 + ' · 새 g' + B.top + '=' + B.eNew.g7);
  ok(B.live === B.lit && Math.abs(B.dOld - B.dNew) > 1e-9,
     'B6 되돌림 — S.sum[b].lv = ' + B.lit + ' 도 그 날 «만렙» 이 아니게 되어 [D]·[E] 가 다른 상태를 잰다',
     'live=' + B.live + ' (만렙 ' + B.max + ')');

  await browser.close();
  console.log('\nPROBE528 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); try { fs.unlinkSync(COPY); } catch (_) {} process.exit(2); });
