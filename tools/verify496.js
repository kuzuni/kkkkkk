/* 496 검증 — 소환 레벨 만렙 50 · 경험치 식 200 + 210·n · 해금 사다리 · 구 세이브 이관
 *
 * 저장소 주인 확정(2026-08-31): «100 만개 팩 유지 · 소환 레벨 50 · 소환 경험치 조정 ·
 * 소환 레벨은 **다 합쳐서**(배너 공용)».
 *
 * ⚑⚑ **714 (주인 지시 2026-09-02 03:00) 가 그 «다 합쳐서» 를 번복했다** — «무기 방패 목걸이
 * 스킬 펫 소환레벨이랑 경험치 … 분리해라». 그래서 이 자의 «주머니가 하나인가» 축은
 * **333 처방대로 방향을 뒤집어 갈아 끼웠다**(자리를 비우지 않았다 — [A]·[D]·[E]·[R] 은
 * 같은 물음을 반대 답으로 묻는다). 496 이 세운 **곡선·만렙·사다리([B]·[C])는 714 가 한 줄도
 * 안 건드렸고**, 그것이 이 자가 지금도 지키는 496 의 몫이다.
 * ⚠ 이 항들을 그냥 지우면 «496 이 통째로 사라져도 초록인 게이트» 가 된다(328-330 교훈).
 *
 * 196 게이트와의 분담(둘이 같은 것을 두 번 묻지 않게 갈라 둔다):
 *   · `verify196` — «만렙·필요 경험치·해금 사다리가 **주인 확정값**인가»(값의 게이트)
 *   · `verify496` — «곡선이 식 하나인가 · 구 세이브를 이관할 때 **뽑기 수를 안 잃는가**»
 *   · `verify714` — «주머니가 배너마다 따로인가»(714 가 가져간 축의 본체)
 *
 * 절:
 *   [A] 주머니 — 714 이후: 배너마다 따로다(496 의 «다섯이 같이 오른다» 를 뒤집은 자리)
 *   [B] 곡선 — need(n) = SUM_EXP_A + SUM_EXP_B·n · 누적 = 주인 목표 268,000 ±1% · 만렙 50
 *   [C] 해금 사다리 — 25 기준 → 50 기준 비례 · 불멸 = 만렙 − 1 · 바닥 두 행은 1 유지
 *   [D] 세이브 — 구 세이브(배너별 12/8/3/20/5) 이관 후 **배너별 뽑기 수 보존** · 멱등
 *   [E] 10 상점 카드 — 5 장이 **그 배너의** Lv·need 를 보인다 · NaN 0 건
 *   [R] 되돌림 시험 — 공용으로 되돌린 사본은 [A] 가 **빨개진다**
 *
 * 실행: node tools/verify496.js
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* 소스 스캔은 **주석을 걷어낸 사본**에 댄다 — 496 의 설명 주석이 옛 이름을 인용하고 있어
   날 소스에 대면 «주석 때문에 빨간» 게이트가 된다(A7 1 회차에 실제로 그랬다). */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* 주인 확정값 — 게이트에 한 번만 적고 아래 단언은 전부 이것과 대조한다 */
const MAXLV = 50;
const A_ = 200, B_ = 210;
const TARGET_PULLS = 268000;          /* 주인 확정 «약 268,000 뽑» (±1%) */
const LADDER    = [1, 1, 10, 16, 24, 32];
const LADDER_EQ = LADDER.concat([40, MAXLV - 1]);
/* 구 곡선(196) — [D] 이관 대조용. 게이트가 제품과 **독립으로** 같은 수를 계산해야 «보존» 이 증명된다 */
const TBL196 = [50, 200, 500, 800, 1200, 1500, 1800, 2100, 2300, 2600,
                3000, 3300, 3600, 4000, 4500, 5000];
const MAX196 = 25;
const need196 = lv => TBL196[Math.min(Math.max(lv | 0, 1), TBL196.length) - 1];
const needNew = lv => A_ + B_ * Math.min(Math.max(lv | 0, 1), MAXLV - 1);
const TOTAL = (() => { let t = 0; for (let n = 1; n < MAXLV; n++) t += needNew(n); return t; })();

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  (b ? pass++ : fail++);
  console.log((b ? 'PASS ' : 'FAIL ') + name + (detail != null ? ' — ' + detail : ''));
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* ================= [A] 주머니 =================
     ⚑ 714 로 **방향이 뒤집힌 절**이다(333 처방). 496 은 여기서 «다섯이 같이 오른다» 를 물었고
     지금은 «따로 오른다» 를 묻는다 — 물음(어느 배너로 뽑으면 무엇이 오르는가)은 그대로다. */
  console.log('[A] 소환 레벨 주머니 — 714 이후 «배너마다 따로»');
  const A = await page.evaluate(() => {
    const out = {};
    out.cells = !!(S.sum && BKEYS.every(k => S.sum[k] && typeof S.sum[k].lv === 'number'));
    out.scalarGone = (typeof S.sumLv === 'undefined' && typeof S.sumExp === 'undefined');
    /* 배너마다 한 번씩 뽑아 «누가 오르는지» — 각 배너 뒤의 스냅샷을 전부 남긴다 */
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    out.steps = BKEYS.map(b => { sumAddExp(b, 7); return BKEYS.map(k => sumLv(k) + '/' + sumExp(k)).join(' '); });
    out.after = BKEYS.map(k => sumExp(k));
    /* 옛 이름으로 쓰면 **그 칸만** 움직인다(496 별칭 뷰 폐지) */
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    S.sum.weapon.lv = 9; S.sum.weapon.exp = 33;
    out.write = BKEYS.map(k => S.sum[k].lv + '/' + S.sum[k].exp);
    /* 접근자는 인자를 **읽는다** */
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
    S.sum.pet.lv = 4;
    out.readArg = (sumLv('pet') === 4 && sumLv('skill') === 1 && sumLv('없는배너') === 1);
    /* 저장 — 다섯 벌이 담기고 496 의 스칼라 둘은 안 담긴다 */
    out.json = JSON.stringify(S);
    return out;
  });
  ok(A.cells, 'A1 저장 자리는 배너 다섯 벌 — `S.sum[b] = {lv,exp}`(714 가 496 의 스칼라 둘을 갈았다)');
  /* 스냅샷은 배너를 하나씩 «누적으로» 채운다(496 의 표본을 그대로 물려받았다) — 그러니
     j 회차에는 정확히 j+1 칸만 7 이어야 한다. 마지막 회차가 다섯 다 7 인 것은 정상이다. */
  ok(A.steps.every((s, j) => s.split(' ').filter(v => v === '1/7').length === j + 1),
    'A2 ★ 뽑은 **그 배너만** 오른다(496 의 «다섯이 같이» 를 714 가 뒤집었다) — 회차마다 딱 한 칸씩 는다',
    A.steps[0] + '  →  ' + A.steps[A.steps.length - 1]);
  ok(A.after.filter(v => v === 7).length === 5,
    'A3 5 배너 × 7 뽑 = 다섯 주머니에 7 씩(합 35 을 한 곳에 붓지 않는다)',
    A.after.join(','));
  ok(A.write.filter(s => s === '9/33').length === 1 && A.write.filter(s => s === '1/0').length === 4,
    'A4 `S.sum[b]` 는 별칭이 아니라 **실물 칸** — 옛 이름으로 써도 그 칸만 움직인다',
    A.write.join(' · '));
  ok(A.readArg && A.scalarGone,
    'A5 `sumLv/sumExp` 는 인자를 **읽는다** · 496 의 공용 스칼라 둘은 사라졌다');
  ok(/"sum":\{/.test(A.json) && !/"sumLv":/.test(A.json) && !/"sumExp":/.test(A.json),
    'A6 ★ 새 세이브에 배너별 5 벌이 **담긴다**(496 의 «스칼라 둘만» 을 714 가 뒤집었다)',
    (A.json.match(/"sum[A-Za-z]*":/g) || []).join(' '));
  ok(!/sumAliasView/.test(CODE),
    'A7 496 의 별칭 뷰는 **선언째** 사라졌다 — 죽은 코드 0 건(주석 걷어낸 소스 스캔)');

  /* ================= [B] 곡선 ================= */
  console.log('[B] 경험치 곡선 — need(n) = ' + A_ + ' + ' + B_ + '·n');
  const B = await page.evaluate(() => {
    const need = [];
    for (let lv = 1; lv < SUM_MAXLV; lv++) need.push(sumNeedExp(lv));
    return { maxlv: SUM_MAXLV, a: SUM_EXP_A, b: SUM_EXP_B, need,
             tot: need.reduce((x, c) => x + c, 0),
             over: sumNeedExp(SUM_MAXLV + 99), under: sumNeedExp(-5) };
  });
  ok(B.maxlv === MAXLV, 'B1 SUM_MAXLV = ' + MAXLV + ' (25 → 50)', String(B.maxlv));
  ok(B.a === A_ && B.b === B_, 'B2 상수 둘 — SUM_EXP_A/SUM_EXP_B', B.a + ' / ' + B.b);
  ok(B.need.length === MAXLV - 1 && B.need.every((v, i) => v === needNew(i + 1)),
    'B3 Lv1..' + (MAXLV - 1) + ' need 가 식과 한 칸도 안 어긋난다',
    B.need.slice(0, 3).join(',') + ' … ' + B.need.slice(-2).join(','));
  ok(B.need[0] === 410 && B.need[9] === 2300 && B.need[24] === 5450 && B.need[48] === 10490,
    'B4 이정표 — Lv1→2 410 · Lv10 2,300 · Lv25 5,450 · Lv49 10,490',
    [B.need[0], B.need[9], B.need[24], B.need[48]].join(' · '));
  ok(B.tot === TOTAL, 'B5 만렙까지 누적 = ' + TOTAL.toLocaleString() + ' 뽑', B.tot.toLocaleString());
  ok(Math.abs(B.tot - TARGET_PULLS) / TARGET_PULLS < 0.01,
    'B6 ★ 주인 확정 «약 ' + TARGET_PULLS.toLocaleString() + ' 뽑» ±1% 안',
    ((B.tot - TARGET_PULLS) / TARGET_PULLS * 100).toFixed(2) + '%');
  ok(B.over === needNew(MAXLV - 1) && B.under === needNew(1),
    'B7 범위 밖 인자는 양 끝으로 접힌다(구 표의 클램프 규약 유지)', B.under + ' / ' + B.over);
  ok(!/const\s+SUM_EXP_TABLE\s*=/.test(CODE),
    'B8 살아 있는 표 `SUM_EXP_TABLE` 부재 — 곡선은 식 하나다(소스 스캔)');
  ok(/SUM_EXP_TABLE_V196/.test(CODE) && /sumNeedExpV196/.test(CODE),
    'B9 구 표는 **이관 전용** 이름으로만 남아 있다(`_V196`)');

  /* ================= [C] 해금 사다리 ================= */
  console.log('[C] 등급 해금 사다리 — 25 기준 → 50 기준 비례');
  const C = await page.evaluate(() => ({
    base: GRADE_ROLL.map(g => g.unlock),
    eq: GRADE_ROLL_EQ.map(g => g.unlock),
    over: GRADE_ROLL_EQ.filter(g => g.unlock > SUM_MAXLV).length,
    lv1: gradeProbs('weapon'),
    /* 714 — 레벨 자리가 배너 칸으로 옮겨졌다(496 의 `S.sumLv` 스칼라는 없다) */
    max: (() => { S.sum.weapon.lv = SUM_MAXLV; const p = gradeProbs('weapon'); S.sum.weapon.lv = 1; return p; })()
  }));
  ok(C.base.join(',') === LADDER.join(','), 'C1 6 행 표 = ' + LADDER.join('/'), C.base.join(','));
  ok(C.eq.join(',') === LADDER_EQ.join(','), 'C2 8 행 표 = +초월 40 · 불멸 ' + (MAXLV - 1), C.eq.join(','));
  ok(C.eq[7] === MAXLV - 1, 'C3 불멸 = 만렙 − 1 «1 레벨 램프»(196 규칙 유지)', String(C.eq[7]));
  ok(C.over === 0, 'C4 만렙을 넘는 해금 레벨 0 개 — 전 등급 도달 가능', '초과 ' + C.over + ' 행');
  ok(C.base[0] === 1 && C.base[1] === 1,
    'C5 ★ 바닥 두 행은 1 그대로 — ×2 하면 Lv1 에 뽑을 등급이 없다(probe496 ⓔ1·ⓔ2)',
    C.base.slice(0, 2).join(','));
  ok(Math.abs(C.lv1.reduce((a, c) => a + c, 0) - 1) < 1e-9 && C.lv1[0] > 0,
    'C6 Lv1 확률 합 = 1 · 일반 > 0(«뽑을 등급이 없는 레벨» 0 개)',
    'p0 = ' + C.lv1[0].toFixed(3));
  ok(C.max.slice(0, 8).every(v => v > 0), 'C7 만렙에서 8 등급 전부 확률 > 0',
    C.max.slice(0, 8).map(v => (v * 100).toFixed(2) + '%').join(' '));
  ok(Math.abs(C.max[7] - 0.001) < 5e-5,
    'C8 ★ 불멸 실효 @만렙 = 0.10%(115 규약 — 개편이 밟지 않았다)', (C.max[7] * 100).toFixed(4) + '%');

  /* ================= [D] 세이브 이관 =================
     ⚠ 살아 있는 페이지에 localStorage 를 쓰고 reload 하면 그 페이지의 자동 저장이 먼저 덮어쓴다
     (LESSONS 87-3 · 43-①). 주입은 «새 컨텍스트 + addInitScript» 로 한다(LESSONS 44-①). */
  /* ⚑ 714 로 방향이 뒤집힌 절 — 496 은 «다섯을 하나로 합쳐도 뽑기 수를 안 잃는가» 를 물었고
     지금은 «배너마다 따로 환산해도 그 배너의 뽑기 수를 안 잃는가» 를 묻는다. 보존 축은 그대로다. */
  console.log('[D] 세이브 이관 — 배너마다 환산, 뽑기 수 보존');
  const KEYV = await page.evaluate(() => KEY);
  const inject = async obj => {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    await c.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
      [KEYV, JSON.stringify(obj)]);
    const p2 = await c.newPage();
    p2.on('pageerror', e => errs.push('pageerror(세이브 이관): ' + String(e)));
    await p2.goto(URL);
    await p2.waitForTimeout(900);
    const r = await p2.evaluate(() => ({
      cells: JSON.parse(JSON.stringify(BKEYS.map(k => ({ b: k, lv: S.sum[k].lv, exp: S.sum[k].exp })))),
      /* 714 — 대표 한 칸(무기)을 옛 이름 자리에 실어 아래 단언 모양을 지킨다 */
      lv: S.sum.weapon.lv, exp: S.sum.weapon.exp,
      alias: JSON.parse(JSON.stringify(BKEYS.map(k => S.sum[k].lv + '/' + S.sum[k].exp)))
    }));
    await c.close();
    return r;
  };
  /* 게이트가 **독립으로** 같은 수를 센다 — 구 곡선으로 되돌려 센 뽑기 수.
     714 — 496 은 이것을 다섯 칸에 걸쳐 **합**했다. 배너가 다시 독립이므로 칸 하나씩 센다. */
  const oldPullsOne = c => {
    const lv = Math.min(MAX196, Math.max(1, (c && c.lv) || 1));
    let s = 0; for (let n = 1; n < lv; n++) s += need196(n);
    return s + Math.min((c && c.exp) || 0, lv >= MAX196 ? 0 : need196(lv) - 1);
  };
  const place = pulls => { let lv = 1, e = pulls;
    while (lv < MAXLV && e >= needNew(lv)) { e -= needNew(lv); lv++; }
    return { lv, exp: lv >= MAXLV ? 0 : e }; };

  const SAVE1 = { weapon: { lv: 12, exp: 0 }, shield: { lv: 8, exp: 0 }, amulet: { lv: 3, exp: 0 },
                  skill: { lv: 20, exp: 0 }, pet: { lv: 5, exp: 0 } };
  const D1 = await inject({ sum: SAVE1 });
  const want1 = place(oldPullsOne(SAVE1.weapon));
  ok(D1.lv === want1.lv && D1.exp === want1.exp,
    'D1 ★ 구 세이브의 **무기 칸** 12 → Lv' + want1.lv + ' · exp ' + want1.exp
      + ' (그 배너 구 누적 ' + oldPullsOne(SAVE1.weapon).toLocaleString() + ' 뽑 — 714 는 다섯을 안 합친다)',
    JSON.stringify(D1.cells));
  {   /* 보존을 «되돌려 세서» 못박는다 — 다섯 칸 **전부** 그 배너의 뽑기 수로 되돌아와야 한다 */
    const back = D1.cells.map(c => { let t = c.exp; for (let n = 1; n < c.lv; n++) t += needNew(n); return t; });
    ok(back.every((v, i) => v === oldPullsOne(SAVE1[D1.cells[i].b])),
      'D2 ★ 배너별 누적 뽑기 수 보존 — 새 곡선에서 되돌려 세도 칸마다 같다',
      back.join(' · '));
  }
  const SAVE2 = { weapon: { lv: 12, exp: 700 }, shield: { lv: 8, exp: 5 }, amulet: { lv: 3, exp: 111 },
                  skill: { lv: 20, exp: 4321 }, pet: { lv: 5, exp: 9 } };
  const D3 = await inject({ sum: SAVE2 });
  ok(D3.cells.every(c => {
      const w = place(oldPullsOne(SAVE2[c.b]));
      return c.lv === w.lv && c.exp === w.exp;
    }), 'D3 잔여 경험치가 있는 구 세이브도 **그 배너의** 셈에 그대로 들어간다',
    D3.cells.map(c => c.b + ' ' + c.lv + '/' + c.exp).join(' · '));
  const SAVE3 = { weapon: { lv: 25, exp: 0 }, shield: { lv: 25, exp: 0 }, amulet: { lv: 25, exp: 0 },
                  skill: { lv: 25, exp: 0 }, pet: { lv: 25, exp: 0 } };
  const D4 = await inject({ sum: SAVE3 });
  const want4 = place(oldPullsOne(SAVE3.weapon));
  ok(D4.cells.every(c => c.lv === want4.lv && c.exp === want4.exp) && want4.lv < MAXLV,
    'D4 ★ 구 배너 만렙(76,450 뽑) < 새 만렙 ' + TOTAL.toLocaleString()
      + ' — 다섯 칸이 나란히 Lv' + want4.lv + '(눈금이 길어진 것이지 레벨을 잃은 게 아니다)',
    D4.cells.map(c => c.lv + '/' + c.exp).join(' · '));
  const D5 = await inject({ sumVer: 2, sum: SAVE1 });
  ok(D5.cells.every(c => c.lv === SAVE1[c.b].lv && c.exp === SAVE1[c.b].exp),
    'D5 이관은 멱등 — 714 판(`sumVer`)이 붙은 세이브는 그대로 다시 실린다',
    D5.cells.map(c => c.lv + '/' + c.exp).join(' · '));
  const D6 = await inject({ sum: { weapon: { lv: -7, exp: -3 }, skill: { lv: '9', exp: 'x' },
                                   shield: { lv: 1 / 0, exp: NaN }, amulet: null,
                                   pet: { lv: 2, exp: 999999 } } });
  /* 셈: 음수·문자열·비유한·null 넷은 전부 Lv1/0 뽑 → 0. 남는 것은 `pet {lv:2, exp:999999}` 하나 —
     Lv1→2 를 지난 몫 구need(1) = 50 에, 잔여는 구 need(2) − 1 = 199 로 접혀 **249 뽑**이다.
     (999,999 를 그대로 더했으면 Lv14 짜리 세이브가 공짜로 생긴다 — 그것을 막는 것이 이 항이다.)
     714 — 그 249 는 이제 **펫 칸에만** 들어간다(496 은 합쳐서 무기에도 실렸다). */
  {
    const pet = D6.cells.find(c => c.b === 'pet');
    ok(pet.lv === 1 && pet.exp === 249 && D6.cells.filter(c => c.b !== 'pet').every(c => c.lv === 1 && c.exp === 0),
      'D6 ★ 손댄 세이브 방어 — 넷은 0 뽑 · `exp:999999` 는 구 need−1 로 접혀 50 + 199 = 249 뽑(펫 칸에만)',
      D6.cells.map(c => c.b + ' ' + c.lv + '/' + c.exp).join(' · '));
  }
  ok(D6.cells.every(c => Number.isFinite(c.lv) && Number.isFinite(c.exp)) && new Set(D6.alias).size === 2,
    'D7 이관 후 값 유한(NaN 0 건) · 다섯 칸이 한 값으로 접히지 않는다', D6.alias.join(' · '));
  const D8 = await inject({});
  ok(D8.cells.every(c => c.lv === 1 && c.exp === 0),
    'D8 `sum` 이 아예 없는 세이브 → 다섯 칸 Lv1/0', D8.cells.map(c => c.lv + '/' + c.exp).join(' · '));

  /* ================= [E] 10 상점 소환 카드 =================
     ⚑ 714 로 방향이 뒤집힌 절 — 496 은 «다섯 장이 같은 값» 을 물었고 지금은
     «다섯 장이 **그 배너의** 값» 을 묻는다. 카드 마크업·좌표는 496·714 둘 다 안 건드렸다. */
  console.log('[E] 10 상점 소환 카드 — 다섯 장이 그 배너의 레벨을 보인다');
  const E = await page.evaluate(() => {
    S.dia = 2e6;
    BKEYS.forEach(k => { S.sum[k].lv = 7; S.sum[k].exp = 100; });
    openShopPage(null, 'sum'); renderShopPage();
    const cards = [...document.querySelectorAll('#shopList .shp-card')];
    const lvs = cards.map(c => c.querySelector('.clv>i').textContent.trim());
    const bars = cards.map(c => c.querySelector('.cbar>b').textContent.trim());
    const w = cards.map(c => c.querySelector('.cbar .trk>i').style.width);
    /* 만렙 — 714 이후에는 **그 배너만** MAX 가 된다 */
    const maxed = (() => {
      BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 0; });
      S.sum.weapon.lv = SUM_MAXLV; renderShopPage();
      const cs = [...document.querySelectorAll('#shopList .shp-card')];
      return { b: cs.map(c => c.querySelector('.cmag').dataset.shinfo),
               lv: cs.map(c => c.querySelector('.clv>i').textContent.trim()),
               bar: cs.map(c => c.querySelector('.cbar>b').textContent.trim()),
               w: cs.map(c => c.querySelector('.cbar .trk>i').style.width) };
    })();
    const txt = document.getElementById('shopList').textContent;
    return { n: cards.length, lvs, bars, w, maxed, bad: /NaN|undefined/.test(txt) };
  });
  ok(E.n === 5, 'E1 소환 카드 5 장', String(E.n));
  ok(E.lvs.every(v => v === 'Lv.7'),
    'E2 다섯 칸에 7 을 넣으면 다섯 장이 «Lv.7» — 알약은 그 배너의 값을 읽는다', E.lvs.join(' · '));
  ok(E.bars.every(b => b === '100/' + needNew(7)),
    'E3 경험치 표기 = 100/' + needNew(7) + '(need 가 그 배너 레벨을 따라간다)', E.bars.join(' · '));
  ok(E.w.every(v => parseFloat(v) === Math.round(100 / needNew(7) * 100)),
    'E4 채움률도 그 배너 값에서 나온다', E.w.join(' · '));
  ok(E.maxed.bar.filter(b => b === 'MAX').length === 1
     && E.maxed.lv[E.maxed.b.indexOf('weapon')] === 'Lv.' + MAXLV
     && parseFloat(E.maxed.w[E.maxed.b.indexOf('weapon')]) === 100,
    'E5 ★ 무기만 만렙 — «Lv.' + MAXLV + ' / MAX» 도 그 한 장뿐(496 의 «다섯 장 전부» 를 뒤집었다)',
    E.maxed.b.map((b, i) => b + ' ' + E.maxed.lv[i] + ' ' + E.maxed.bar[i]).join(' · '));
  ok(!E.bad, 'E6 카드 표기 NaN/undefined 0 건');

  /* ================= [R] 되돌림 시험 =================
     ⚑ 714 로 방향이 뒤집힌 절 — 이제 되돌리는 대상은 «496 의 공용 하나» 다.
     그 사본에서 [A2] 가 **빨개져야** 무르게 푼 수리가 아니다. */
  console.log('[R] 되돌림 시험 — 496 공용 하나로 되돌린 사본');
  {
    const rev = SRC
      .replace('const sumLv  = b => sumOf(b).lv;', 'const sumLv  = _b => S.__sh.lv;')
      .replace('const sumExp = b => sumOf(b).exp;', 'const sumExp = _b => S.__sh.exp;')
      .replace(/function sumAddExp\(b, n\)\{[\s\S]*?\n\}/,
        'function sumAddExp(_b, n){ const s = S.__sh; s.exp += n; let up = 0;\n'
        + '  while(s.lv < SUM_MAXLV && s.exp >= sumNeedExp(s.lv)){ s.exp -= sumNeedExp(s.lv); s.lv++; up++; }\n'
        + '  if(s.lv >= SUM_MAXLV) s.exp = 0; return up; }')
      .replace('let S = DEF();', 'let S = DEF(); S.__sh = { lv:1, exp:0 };');
    const rp = path.join(ROOT, `.verify496-rev-${process.pid}.html`);
    fs.writeFileSync(rp, rev);
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p2 = await c.newPage();
    const rerr = [];
    p2.on('pageerror', e => rerr.push(String(e)));
    await p2.goto('file://' + rp.replace(/\\/g, '/'));
    await p2.waitForTimeout(900);
    const R = await p2.evaluate(() => {
      S.__sh = { lv:1, exp:0 };
      sumAddExp('weapon', 7);
      return { snap: BKEYS.map(k => sumLv(k) + '/' + sumExp(k)) };
    });
    await c.close();
    try { fs.unlinkSync(rp); } catch (e) {}
    ok(new Set(R.snap).size === 1 && R.snap[0] === '1/7',
      'R1 ★ 되돌린 사본에서는 다섯이 **같이 오른다** — [A2] 가 빨개진다(무르게 풀지 않았다)',
      R.snap.join(' · '));
    ok(rerr.length === 0, 'R2 되돌린 사본도 콘솔 에러 0 건(되돌림이 딴 데를 안 깬다)', rerr.slice(0, 2).join(' | '));
  }

  ok(errs.length === 0, 'Z1 콘솔 에러 0 건', errs.slice(0, 3).join(' | '));

  console.log('');
  console.log('VERIFY496 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
