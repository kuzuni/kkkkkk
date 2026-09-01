#!/usr/bin/env node
/* 작업 522 — `tools/fnchk115.js` 9/11 «게이트 부패» 재현 + 되돌림 시험 (338 규칙)
 *
 *   node tools/probe522.js
 *
 * 이 자는 **제품에게 직접 묻는다**. 두 가지를 못박는 것이 목적이다:
 *   ⓐⓑ 재현 — 옛 하네스가 박아 둔 숫자(Lv75 · Lv100)가 496(만렙 50) 아래에서 «무엇으로 읽히는가».
 *   ⓒ~ⓕ 되돌림 — 새로 적은 판정이 **무르지 않다**(성질을 깨면 실제로 빨개진다).
 *
 * ⚠ 제품(`index.html`)은 한 줄도 안 고친다. 조작은 전부 페이지 안 임시 변조이고 ⓔ 에서 원복한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, got) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + name + ' — ' + got); b ? pass++ : fail++; };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProbInfo === 'function');
  await page.waitForTimeout(500);

  /* ── ⓐ 재현: 옛 ② 의 «Lv75» 는 만렙 50 아래에서 MAX 로 튕긴다 ───────────────────────── */
  const a = await page.evaluate(() => {
    openProbInfo('weapon', 75);                       /* 옛 하네스가 박아 둔 숫자 그대로 */
    const h = document.getElementById('prbList').innerHTML;
    const r = { max: SUM_MAXLV, lv: document.getElementById('prbLv').textContent,
                imm: /불멸/.test(h), tr: /초월/.test(h) };
    closeProbInfo();
    return r;
  });
  ok(a.lv === 'MAX' && a.imm === true,
     'ⓐ 옛 ② — openProbInfo(weapon, 75) 는 만렙 ' + a.max + ' 아래에서 MAX 로 튕긴다',
     '단계=' + a.lv + '(기대 «75») · 불멸행=' + a.imm + '(옛 기대 false) · 초월행=' + a.tr);

  /* ── ⓑ 재현: 옛 ⑩ 의 «lv = 100» 은 런타임에선 그대로 들어가고 재로드에서 만렙으로 깎인다 ── */
  const b1 = await page.evaluate(() => {
    S.sum.weapon.lv = 100;                            /* 496 별칭 뷰 — 런타임 클램프가 없다 */
    S.sum.weapon.exp = 0; S.guide.idx = GUIDE.length; save();
    return { live: S.sum.weapon.lv, max: SUM_MAXLV };
  });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof gradeProbs === 'function');
  await page.waitForTimeout(500);
  const b2 = await page.evaluate(() => ({ lv: S.sum.weapon.lv, max: SUM_MAXLV }));
  ok(b1.live === 100 && b2.lv === b2.max && b2.lv !== 100,
     'ⓑ 옛 ⑩ — lv=100 은 load() 클램프가 만렙으로 내린다(«100 유지» 는 영영 거짓)',
     '저장 직전 live=' + b1.live + ' → 재로드 후 ' + b2.lv + ' (만렙 ' + b2.max + ')');

  /* ── ⓒ 되돌림: «불멸 램프는 만렙 직전 1레벨» 을 깨면 새 ② 가 빨개진다 ────────────────── */
  const c = await page.evaluate(() => {
    const R = rollOf('weapon'), row = R[R.length - 1], keep = row.unlock;
    row.unlock = SUM_MAXLV - 3;                       /* 램프를 3레벨로 늘린다(규칙 위반) */
    const immU = R[R.length - 1].unlock;
    openProbInfo('weapon', immU);
    const h = document.getElementById('prbList').innerHTML;
    const r = { keep, immU, max: SUM_MAXLV, lv: document.getElementById('prbLv').textContent,
                imm: /불멸/.test(h), tr: /초월/.test(h) };
    closeProbInfo();
    /* 새 ② 의 판정식을 그대로 옮겨 적어 «빨개지는가» 를 본다 */
    r.verdict = (r.immU === r.max - 1) && (R[R.length - 2].unlock < r.immU)
                && r.lv === String(r.immU) && !r.imm && r.tr;
    /* ⓓ — 램프 조항을 뺀 «무른» 판정은 같은 변조에서 여전히 초록이다 */
    r.soft = !r.imm && r.tr;
    return r;
  });
  ok(c.verdict === false,
     'ⓒ 되돌림 — 불멸 해금을 만렙−1 에서 만렙−3 으로 밀면 새 ② 가 빨강',
     '불멸해금 ' + c.keep + ' → ' + c.immU + ' (만렙 ' + c.max + ') · 새 판정=' + c.verdict);
  ok(c.soft === true,
     'ⓓ 무른 판정 대조 — «불멸 행 없음 · 초월 행 있음» 만 보면 같은 변조에서 초록',
     '무른 판정=' + c.soft + ' → 램프 조항(immU === 만렙−1)이 있어야 이 고장이 잡힌다');

  /* ── ⓔ 원복하면 새 ② 가 다시 초록 (양성항) ──────────────────────────────────────────── */
  const e = await page.evaluate(() => {
    const R = rollOf('weapon');
    R[R.length - 1].unlock = SUM_MAXLV - 1;           /* 원복 */
    const immU = R[R.length - 1].unlock;
    openProbInfo('weapon', immU);
    const h = document.getElementById('prbList').innerHTML;
    const r = { immU, max: SUM_MAXLV, lv: document.getElementById('prbLv').textContent,
                imm: /불멸/.test(h), tr: /초월/.test(h) };
    closeProbInfo();
    r.verdict = (r.immU === r.max - 1) && (R[R.length - 2].unlock < r.immU)
                && r.lv === String(r.immU) && !r.imm && r.tr;
    return r;
  });
  ok(e.verdict === true, 'ⓔ 원복 — 새 ② 가 다시 초록',
     '불멸해금=' + e.immU + ' 단계=' + e.lv + ' 불멸행=' + e.imm + ' 초월행=' + e.tr);

  /* ── ⓕ 새 ⑪(만렙 아닌 레벨 왕복) — 양성 1 · 음성 1 ─────────────────────────────────── */
  const mid = await page.evaluate(() => {
    const m = Math.max(1, SUM_MAXLV - 7);
    S.sum.weapon.lv = m; S.sum.weapon.exp = 0; save();
    return m;
  });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof gradeProbs === 'function');
  await page.waitForTimeout(400);
  const f = await page.evaluate(m => {
    const kept = S.sum.weapon.lv;                     /* 양성 — 넣은 값 그대로 */
    /* 714 — 레벨 자리가 배너 칸이다. 음성 표본은 다섯 칸을 다 만렙으로 둔다 */
    BKEYS.forEach(k => { S.sum[k].lv = SUM_MAXLV; });   /* 음성 — «load() 가 만렙으로 올린» 상태 모사 */
    return { kept, broken: S.sum.weapon.lv, want: m, max: SUM_MAXLV };
  }, mid);
  ok(f.kept === f.want && f.broken !== f.want,
     'ⓕ 새 ⑪ — 만렙 아닌 Lv' + f.want + ' 왕복은 그대로(양성) · «만렙으로 올림» 상태에선 빨강(음성)',
     '재로드 Lv=' + f.kept + ' · 고장 모사 Lv=' + f.broken + ' (만렙 ' + f.max + ')');

  await browser.close();
  console.log('\nPROBE522 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
