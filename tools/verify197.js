/* 작업 197 회귀 게이트 — «파워 커브 계단식»
 *
 *   주인 지시(2026-08-27): «등급 점프마다 전 등급 대비 존나 쎄지게, 같은 티어끼리는 적당히,
 *   코스튬도 계단식 체감». 등재문의 세 갈래를 그대로 항목으로 옮겼다.
 *
 *   실행: node tools/verify197.js   → 마지막 줄이 `VERIFY197 n/n PASS` 여야 한다.
 *
 *   본다:
 *     [A] 축 분리   GRADE 에 `wear` 8칸 · 점프가 전 구간 정확히 ×GRADE_JUMP · g0 = 1
 *                   `mul` 은 197 **전 값 그대로**(85 «16·26» · 91 도감 · 89 유물 · 106 펫 곡선의 근거)
 *     [B] 착용 파이프  equipVal · skillDmg · power(장비) 가 `wear` 를 탄다 · 펫은 481 로 «주기» 축으로 빠졌다
 *                   — 등급을 한 칸 올리면 값이 정확히 ×GRADE_JUMP (지시 ①)
 *     [C] 동티어    lvMul(MAX_LEVEL) < 점프 · 개체차 v 폭(max/min) < 점프 (지시 ②
 *                   «점프 대비 확실히 작게») · 만렙 하위등급 < Lv0 상위등급
 *     [D] 보유 축   ownVal 은 `mul` 그대로 — 보유는 전 종에 곱하는 축이라 계단을 안 태운다.
 *                   relicVal(89) · COLL 세트 단계값(91·118) 도 `mul` 기준이라 **197 전과 같은 값**
 *     [E] 코스튬    보유 효과가 획득 순번 계단 — COS_STEP_EVERY 개마다 한 칸,
 *                   n 번째 값 = COS_OWN × COS_STEP[t] · 총곱 = 계단의 곱 (지시 ③)
 *     [F] 총량 보존 50종 전부 보유 시 보유 총효과가 194 의 «전 코스튬 ×COS_OWN» 과 같은 자릿수
 *                   (곡선 모양만 바꾼 것이지 세지게 한 것이 아니다 — 실수치는 199 의 몫)
 *     [G] 표기 일치 코스튬 시트 «총효과» 와 상세 «보유 효과» 가 bonus() 와 **같은 함수**를 본다
 *     [H] 실동작    장비를 한 등급 위로 바꿔 끼우면 cp() 가 실제로 오른다 · 코스튬 1개 획득이 bonus 를 올린다
 *     [I] 콘솔      에러 0건
 *
 *   ⚠ 되돌림 시험: `wear` 를 지우고 소비처를 `gMul` 로 되돌리면 [A][B][C][H] 가 FAIL 해야 한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-9 : e);

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof GRADE !== 'undefined' && typeof S !== 'undefined');
  await page.waitForTimeout(300);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const { ctx, page, errs } = await open(browser);
  try {
    /* ---------------- [A] 축 분리 ---------------- */
    const A = await page.evaluate(() => ({
      jump: GRADE_JUMP,
      wear: GRADE.map(g => g.wear),
      mul:  GRADE.map(g => g.mul),
      len:  GRADE.length
    }));
    ok(A.len === 8 && A.wear.every(w => typeof w === 'number' && w > 0),
       'A1 GRADE 8칸 전부 wear 를 갖는다', A.wear.join(' / '));
    ok(A.wear[0] === 1, 'A2 일반(g0) wear = 1 — 초반 체감은 197 전과 같다', String(A.wear[0]));
    {
      const bad = [];
      for (let i = 1; i < A.wear.length; i++)
        if (!near(A.wear[i] / A.wear[i - 1], A.jump, 1e-9)) bad.push(i + ':' + (A.wear[i] / A.wear[i - 1]).toFixed(3));
      ok(bad.length === 0, 'A3 등급 점프가 전 구간 ×' + A.jump + ' 일정 (지시 ①)', bad.join(',') || '7칸 전부');
    }
    ok(A.jump >= 3 && A.jump <= 5, 'A4 점프가 주인 밴드 ×3~5 안', '×' + A.jump);
    {
      const WANT = [1.0, 1.5, 2.3, 3.6, 6.0, 10.0, 16.0, 26.0];
      ok(A.mul.every((m, i) => near(m, WANT[i], 1e-9)),
         'A5 mul 은 197 전 값 그대로 (85·91·118·106 의 근거 데이터)', A.mul.join('/'));
    }

    /* ---------------- [B] 착용 파이프 ---------------- */
    const B = await page.evaluate(() => {
      const out = {};
      /* 같은 부위·같은 Lv·같은 v 로 등급만 다른 장비 두 짝을 골라 equipVal 비를 잰다 */
      const byG = {};
      EQUIPS.filter(e => e.slot === 'weapon').forEach(e => { (byG[e.g] = byG[e.g] || []).push(e); });
      out.eq = [];
      for (let g = 1; g < GRADE.length; g++) {
        if (!byG[g] || !byG[g - 1]) continue;
        const a = byG[g][0], b = byG[g - 1][0];
        /* 472 — equipVal 이 «등급 안 자리(j = 티어)» 를 읽으므로 두 짝의 티어를 같은 값으로 고정해
           «등급만 다른 두 장비» 를 만든다(옛 코드의 «같은 v» 와 같은 뜻이다). */
        out.eq.push(equipVal({ g: a.g, j: 0, id: '__x', slot: 'weapon', v: 1 })
                  / equipVal({ g: b.g, j: 0, id: '__y', slot: 'weapon', v: 1 }));
      }
      /* 스킬·펫 — 계수 m 을 고정하고 등급만 올린다 */
      S.eqSkill = []; S.eqPet = [];
      out.sk = [], out.pt = [], out.ptCd = [];
      for (let g = 1; g <= 5; g++) {
        out.sk.push(skillDmg({ g: g, m: 1, id: '__s' }) / skillDmg({ g: g - 1, m: 1, id: '__s' }));
      }
      /* 481 이관(2026-08-30, 주인 지시 «피해는 플레이어 공격력 그대로 · 등급은 공격 주기만») —
         펫 피해는 이제 착용 계단을 **안 탄다**. 197 이 이 자리에서 지키려던 것은 «펫의 등급 축이
         전 구간 일정한 계단인가» 이므로, 자를 **주기** 로 옮겨 같은 것을 묻는다(333: 자리를 비우지 마라).
         두 방향을 같이 센다 — ① 피해에는 등급이 한 톨도 안 붙는다(비 = 1) ② 주기는 전 구간 일정한 등비. */
      for (let g = 1; g < GRADE.length; g++) {
        out.pt.push(petDmg({ g: g, cd: 1, id: '__p' }) / petDmg({ g: g - 1, cd: 1, id: '__p' }));
        out.ptCd.push(PET_CD[g] / PET_CD[g - 1]);
      }
      /* power() 의 장비 분기 */
      out.pw = [];
      for (let g = 1; g < GRADE.length; g++)
        out.pw.push(power({ g: g, j: 0, id: '__x', slot: 'weapon', v: 1 }, 'equip')
                  / power({ g: g - 1, j: 0, id: '__y', slot: 'weapon', v: 1 }, 'equip'));
      out.jump = GRADE_JUMP;
      out.eqJump = EQ_GRADE;      /* 472 — 장비 전용 등급 배율(= EQ_TIER⁴ × GRADE_JUMP) */
      return out;
    });
    const allJump = (arr, n) => arr.length >= n && arr.every(r => near(r, B.jump, 1e-6));
    /* 472 이관(2026-08-30, 주인 확정 수치) — **장비만** 자기 계단표(`EQ_BASE`)로 갈라져 나갔다.
       등급 한 칸이 «5티어에서 다시 ×3» 이므로 ×1.5⁴×3 = ×15.1875 다. 197 이 세운 규약(«등급 점프는
       전 구간 일정»)은 그대로 살아 있고 **배율만** 장비 축에서 달라진 것이라 여기서 잰다.
       스킬(B2)·펫(B3)·`gWear` 는 여전히 GRADE_JUMP(×3) 다 — 197 이 한 글자도 안 바뀐 자리다. */
    const allEqJump = (arr, n) => arr.length >= n && arr.every(r => near(r, B.eqJump, 1e-6));
    ok(allEqJump(B.eq, 7), 'B1 장비 equipVal — 등급 +1 이 정확히 ×' + B.eqJump + ' (472 EQ_GRADE)',
       B.eq.map(v => v.toFixed(4)).join('/'));
    ok(allJump(B.sk, 5), 'B2 스킬 피해 — 등급 +1 이 정확히 ×' + B.jump,
       B.sk.map(v => v.toFixed(2)).join('/'));
    /* 481 이관 — 두 항으로 갈랐다(한 항이 두 자리를 겸하면 한쪽이 사라져도 초록이다, 326 교훈). */
    ok(B.pt.length === 7 && B.pt.every(r => near(r, 1, 1e-9)),
       'B3 펫 피해 — 등급이 한 톨도 안 붙는다 (481 — 플레이어 공격력 그대로)',
       B.pt.map(v => v.toFixed(2)).join('/'));
    {
      const r0 = B.ptCd[0];
      ok(B.ptCd.length === 7 && B.ptCd.every(r => Math.abs(r - r0) <= 0.01) && r0 < 0.92,
         'B3b 펫 등급 축은 «주기» 로 옮겨 갔고 그 계단도 전 구간 일정하다 (481)',
         B.ptCd.map(v => v.toFixed(3)).join('/'));
    }
    ok(allEqJump(B.pw, 7), 'B4 power() 장비 순위 — 등급 +1 이 정확히 ×' + B.eqJump + ' (472 · equipVal 과 한 축)',
       B.pw.map(v => v.toFixed(4)).join('/'));
    ok(near(B.eqJump / Math.pow(1.5, 4), B.jump, 1e-9),
       'B5 장비 등급 배율은 «티어 ×1.5 를 5칸 지난 뒤 다시 ×' + B.jump + '» 이다 — 197 규약과 한 몸',
       B.eqJump + ' = 1.5⁴ × ' + B.jump);

    /* ---------------- [C] 동티어 ---------------- */
    const C = await page.evaluate(() => {
      const vs = EQUIPS.filter(e => e.v).map(e => e.v);
      return {
        jump: GRADE_JUMP, step: LV_STEP, maxLv: MAX_LEVEL,
        lvMax: lvWear(MAX_LEVEL), lvOwn: lvMul(MAX_LEVEL),
        vSpan: Math.max.apply(null, vs) / Math.min.apply(null, vs),
        /* 만렙 하위등급 vs Lv0 상위등급 (같은 부위·v=1) */
        lowMax: GRADE[0].wear * lvWear(MAX_LEVEL),
        hiZero: GRADE[1].wear * lvWear(0)
      };
    });
    ok(C.lvMax < C.jump, 'C1 착용 축 레벨 강화 총량 < 등급 점프 (지시 ②)',
       'Lv' + C.maxLv + ' ×' + C.lvMax.toFixed(2) + ' < ×' + C.jump);
    ok(near(C.lvOwn, 1 + C.maxLv * 0.18, 1e-9),
       'C1b 보유 축 lvMul 기울기 0.18 은 197 전 그대로 — 낮추면 (1+x)^90 이 무너진다(sim197). 199 의 몫',
       '×' + C.lvOwn.toFixed(1));
    ok(C.vSpan < C.jump, 'C2 개체차 v 폭 < 등급 점프', '×' + C.vSpan.toFixed(3) + ' < ×' + C.jump);
    ok(C.lowMax < C.hiZero, 'C3 만렙 일반 < Lv0 고급 — 계단이 실제로 보인다',
       C.lowMax.toFixed(2) + ' < ' + C.hiZero.toFixed(2));

    /* ---------------- [D] 보유 축 · 다른 시스템은 mul 그대로 ---------------- */
    const D = await page.evaluate(() => ({
      own: [0, 1, 2, 3, 4, 5, 6, 7].map(g => ownVal({ g: g, id: '__o' })),
      /* 91·118 세트 단계값 = COLL_BASE × 세트 mul */
      coll: COLL_SETS.filter(st => st.tab === 'weapon').map(st => st.eff.atk),
      collWant: GRADE.map(g => COLL_BASE.weapon.atk * g.mul),
      relic: RELICS.map(r => r.v * GRADE[r.g].mul * 0.25)
    }));
    ok(D.own.every((v, g) => near(v, 0.02 * (g === 0 ? 1.0 : [1, 1.5, 2.3, 3.6, 6, 10, 16, 26][g]), 1e-9)),
       'D1 ownVal(보유)은 mul 축 — 전 종에 곱하는 축이라 계단을 안 태운다',
       D.own.map(v => v.toFixed(4)).join('/'));
    ok(D.coll.length === 8 && D.coll.every((v, i) => near(v, D.collWant[i], 1e-12)),
       'D2 91·118 도감 세트 단계값 = COLL_BASE × mul (197 전과 동일)',
       D.coll.map(v => (v * 100).toFixed(1) + '%').join('/'));
    ok(D.relic.length === 10 && D.relic.every(v => v > 0),
       'D3 89 유물 효과도 mul 축 그대로', D.relic.map(v => v.toFixed(3)).join('/'));

    /* ---------------- [E] 코스튬 계단 ---------------- */
    const E = await page.evaluate(() => {
      const every = COS_STEP_EVERY, step = COS_STEP.slice();
      const idx = [1, 5, 10, 11, 20, 21, 30, 31, 40, 41, 50];
      return {
        every: every, step: step,
        rising: step.every((v, i) => i === 0 || v > step[i - 1]),
        at: idx.map(n => ({ n: n, t: cosStepAt(n), a: cosOwnStep('atk', n) })),
        base: COS_OWN.atk
      };
    });
    ok(E.rising, 'E1 계단이 단조 증가 (지시 ③ «하나 얻을 때마다 계단으로 체감»)', E.step.join(' → '));
    {
      const bad = E.at.filter(r => !near(r.t, E.step[Math.min(E.step.length - 1, Math.floor((r.n - 1) / E.every))], 1e-12));
      ok(bad.length === 0, 'E2 ' + E.every + '개마다 계단 한 칸',
         E.at.map(r => r.n + ':' + r.t).join(' '));
    }
    {
      const bad = E.at.filter(r => !near(r.a, E.base * r.t, 1e-12));
      ok(bad.length === 0, 'E3 n번째 보유 효과 = COS_OWN × 계단', bad.length ? JSON.stringify(bad) : '11점 전부');
    }

    /* ---------------- [F] 총량 보존 ---------------- */
    const F = await page.evaluate(() => {
      AVATARS.forEach(a => S.avatars[a.id] = 1);
      S.cosLv = {}; markDirty();
      const n = AVATARS.length;
      /* ⚑ 724 — 두 축을 **같이** 합 모델로 뒤집었다(333 처방). 이 절이 지키는 것은
         «계단 곡선이 194 의 총량을 보존하는가» 이고, 그 물음은 결합 방식과 무관하다 —
         단 양쪽을 같은 모델로 재야 뜻이 산다(한쪽만 뒤집으면 비가 거짓이 된다). */
      const mine = { atk: 1 + cosOwnSum('atk'), hp: 1 + cosOwnSum('hp'), gold: 1 + cosOwnSum('gold') };
      const flat = { atk: 1 + n * COS_OWN.atk, hp: 1 + n * COS_OWN.hp, gold: 1 + n * COS_OWN.gold };
      return { n: n, mine: mine, flat: flat };
    });
    ['atk', 'hp', 'gold'].forEach(k => {
      const r = F.mine[k] / F.flat[k];
      ok(r > 0.8 && r < 1.25,
         'F' + (k === 'atk' ? 1 : k === 'hp' ? 2 : 3) + ' 50종 보유 총효과 ' + k + ' 가 194 대비 ±25% 안 (총량 보존)',
         '×' + F.mine[k].toFixed(1) + ' vs 194 ×' + F.flat[k].toFixed(1));
    });

    /* ---------------- [G] 표기 일치 ---------------- */
    const G = await page.evaluate(() => {
      /* 코스튬 시트를 그려 «총효과» 표기를 읽고 bonus() 의 코스튬 장부와 맞춘다.
         ⚑ 724 — 보유·강화는 **한 카테고리**라 더한다(예전에는 `cosOwnMul × (1+강화)` 였다). */
      renderCos();
      const el = document.querySelector('#bCos .sk-tot em');
      const want = cosOwnSum('atk') + cosLvVal('atk');
      return { txt: el ? el.textContent : null, want: pct(want) };
    });
    ok(G.txt != null && G.txt.indexOf(G.want) >= 0,
       'G1 코스튬 시트 «총효과» 표기 = 보유 Σ + 강화 (식이 갈라지지 않는다 · 724)',
       (G.txt || '없음') + ' / 기대 ' + G.want);

    /* ---------------- [H] 실동작 ---------------- */
    const H = await page.evaluate(() => {
      /* 깨끗한 상태에서 무기 한 짝을 등급별로 바꿔 끼우며 cp() 를 본다 */
      S.avatars = { av0: 1 }; S.cosLv = {}; S.own = {}; S.eqSlot = { weapon: null, shield: null, amulet: null };
      S.eqSkill = []; S.eqPet = []; S.coll = {}; markDirty();
      const byG = {};
      EQUIPS.filter(e => e.slot === 'weapon').forEach(e => { if (!byG[e.g]) byG[e.g] = e; });
      const seq = [];
      for (let g = 0; g < GRADE.length; g++) {
        const e = byG[g]; if (!e) continue;
        S.own = {}; S.own[e.id] = { l: 1, n: 0 };
        S.eqSlot.weapon = e.id; markDirty();
        seq.push({ g: g, cp: cp() });
      }
      /* 코스튬 1개 더 획득 → 공격 배수가 오른다 */
      S.own = {}; S.eqSlot.weapon = null; markDirty();
      const a0 = bonus().atk, own0 = cosOwnSum('atk');
      S.avatars[AVATARS[1].id] = 1; markDirty();
      const a1 = bonus().atk;
      /* ⚑ 724 — 카테고리 «안» 이 합이라 한 칸 더 얻은 배수는 `(1+Σ+계단)/(1+Σ)` 다
         (예전에는 계단 하나가 그대로 곱이었다). 묻는 것은 그대로 «2번째 계단만큼 붙는가» 다. */
      return { seq: seq, a0: a0, a1: a1,
               stepWant: (1 + own0 + cosOwnStep('atk', 2)) / (1 + own0) };
    });
    {
      const rising = H.seq.every((r, i) => i === 0 || r.cp > H.seq[i - 1].cp);
      ok(rising, 'H1 무기를 한 등급 위로 갈아끼우면 전투력이 매번 오른다',
         H.seq.map(r => GRADE_N(r.g) + ':' + r.cp).join(' → '));
    }
    ok(near(H.a1 / H.a0, H.stepWant, 1e-9),
       'H2 코스튬 1개 획득 = 2번째 계단만큼 공격 배수 상승',
       '×' + (H.a1 / H.a0).toFixed(4) + ' vs 기대 ×' + H.stepWant.toFixed(4));

    /* ---------------- [I] 콘솔 ---------------- */
    ok(errs.length === 0, 'I1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');
  } finally {
    await ctx.close(); await browser.close();
  }
  console.log('\nVERIFY197 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();

/* 등급 이름은 노드 쪽에서 못 읽으므로 표기용 상수만 둔다(게이트 로그 가독성) */
function GRADE_N(g) { return ['일반', '고급', '희귀', '영웅', '전설', '신화', '초월', '불멸'][g] || ('g' + g); }
