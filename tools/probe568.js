/* 작업 568 재현 — `tools/verify76.js` 22/24 의 두 항이 무엇을 잡고 있는가.
   실행: node tools/probe568.js

   등재문(PROGRESS 568): 실패는 두 항이고 **뿌리가 다르다**.
     ① §6 `idx5 «방패 1종 보유하기» 보상 21000 = 목걸이 10연` — 498 이 가이드 보상을 곡선
        `gmDiaAt(i)` 으로 갈면서 73 ② 결합을 `max(곡선, 그 상자 10연)` **하한**으로 남겼는데,
        76 의 이 항은 73 ② 시절의 «값»(1,000)에 굳어 있다.
     ② §4 `ⓐⓑ amulet 키 없음 → freeLeft 2(폴백) · S.sum.amulet {lv1,exp0}` — 496 이 소환
        레벨을 «배너 5 벌» 에서 «공용 스칼라 둘» 로 내렸다.
   338 규칙대로 고치기 전에 제품에게 직접 묻는다.

   ⚑ 776(2026-09-01 등재 · 2026-09-02 수리) — [1] ① 이 «21,000» 을 **손으로** 적고 있었다.
     199 22회차(결1 ⓑ)가 가이드 곡선 계수를 11000/2000 → 7750/500 으로 밀자 `gmDiaAt(5)` 가
     10,250 이 되어 그 한 항만 빨개졌다(20/21). 제품은 정상 — **자가 굳은 것**이다(522-①).
     같은 값을 «제품에서 역산» 으로 묻는 [2] ① 은 내내 초록이었다(522-②).
     ⇒ [1] ① 을 `verify76:305` 와 같은 술어 `max(곡선, 목걸이 10연)` 로 다시 적고,
        파생만 남기면 헛초록이므로(522-③) **[R] 되돌림 시험 4항**을 신설했다.

   여기서 재는 것:
     [1] 재현     — 두 항이 읽는 그 자리에서 실패값이 그대로 나오는가(결정적인가)
     [2] ① 뿌리   — idx5 의 그 값이 498 곡선 `gmDiaAt(5)` 와 **정확히** 같은가
                    (같으면 «하드코딩으로 되돌아갔다» 가 아니라 «곡선이 하한을 이겼다» 다)
     [3] ① 결합   — 목걸이 상자 10연을 곡선 위로 올리면 idx5 가 **그 값을 따라가는가**
                    (76 이 원래 물으려던 «idx5 ↔ 목걸이 배선» 을 값이 아니라 행동으로)
     [4] ① 음성   — idx5 를 상수로 굳힌 사본에서는 [3] 이 안 움직인다(= [3] 이 진짜 자다)
     [5] ② 갈래   — 두 연언(`freeLeft === 2` · `{lv1,exp0}`) 중 **어느 쪽이** 빨간가
     [6] ② 뿌리   — 496 이관은 «총 뽑기 수 보존» 이다. 그 표본(skill lv3·exp2)의 뽑기 수를
                    구 곡선으로 되돌려 세면 exp 가 0 이 아니라 그 값이어야 정상이다
     [7] ② 대조   — 진행도 0 인 구 세이브(전 배너 lv1·exp0)면 {lv1,exp0} 이 그대로 나온다
                    (= 옛 기대값은 «틀린 규칙» 이 아니라 «표본이 안 맞는 규칙» 이다)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const yes = (n, got, extra) => R.push({ n, got: String(got) + (extra ? ' :: ' + extra : ''), want: 'true', pass: got === true });
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });

const HIGH = 90000;   /* 10연 = 900,000 — 곡선 최대(idx19 = 49,000)보다 확실히 크다 */

(async () => {
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  /* ── ① 가이드 보상 ── */
  const A = await p.evaluate((HIGH) => {
    const d5 = gmDia(GUIDE[5]);
    const fn5 = typeof GUIDE[5].dia === 'function';
    const curve5 = gmDiaAt(5);
    const c10 = BKEYS.reduce((o, b) => (o[b] = summonCost(b, 10), o), {});
    const ban6 = GUIDE[6].ban;

    /* [3] 상자를 한 종류씩 곡선 위로 올려 «idx5 가 어느 상자에 반응하는가» 를 행동으로 */
    const moved = {};
    for (const b of BKEYS) {
      const keep = BANNERS[b].cost;
      BANNERS[b].cost = HIGH;
      moved[b] = gmDia(GUIDE[5]) === summonCost(b, 10);
      BANNERS[b].cost = keep;
    }
    const back = gmDia(GUIDE[5]);

    /* [4] 음성 사본 — idx5 를 «지금 값» 상수로 굳히면 결합이 죽어야 한다 */
    const keepFn = GUIDE[5].dia;
    GUIDE[5].dia = d5;
    const negMoved = {};
    for (const b of BKEYS) {
      const keep = BANNERS[b].cost;
      BANNERS[b].cost = HIGH;
      negMoved[b] = gmDia(GUIDE[5]) === summonCost(b, 10);
      BANNERS[b].cost = keep;
    }
    GUIDE[5].dia = keepFn;

    /* 776 — 곡선의 «계수» 도 제품에서 역산한다(손으로 안 적는다). 등차수열이라 두 점이면 충분하다. */
    const a0 = gmDiaAt(0), dstep = gmDiaAt(1) - gmDiaAt(0);

    return { d5, fn5, curve5, c10, ban6, n5: GUIDE[5].n, moved, negMoved, back, a0, dstep,
             restored: typeof GUIDE[5].dia === 'function' };
  }, HIGH);

  /* ── ② 구 세이브 이관 ──
     ⚠ verify76 §4 는 §2·§3 에서 목걸이 10연(10뽑) + 무료 10연 ×2(20뽑)를 **먼저 돌린 뒤**
        `JSON.stringify(S)` 를 «구 세이브의 뼈대» 로 쓴다. 그 스냅샷에는 496 이 신설한
        `sumLv`/`sumExp` 가 들어 있으므로 여기서도 그 상태를 만들어 놓고 잰다. */
  const B = await p.evaluate(() => {
    closeModal && closeModal(); gmCloseAll();
    /* 714 — 배너 칸 다섯으로 돌아왔다. «30 뽑» 상태를 다섯 칸에 같이 둔다 */
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = 30; });   /* §2·§3 이 남기는 «30 뽑» 상태 */
    const snap = JSON.stringify(S);
    const run = old => {
      localStorage.setItem(KEY, JSON.stringify(old));
      load();
      return { free: freeLeft('amulet'),
               lv: S.sum.amulet && S.sum.amulet.lv, exp: S.sum.amulet && S.sum.amulet.exp,
               sumLv: S.sum.weapon.lv, sumExp: S.sum.weapon.exp,
               /* 별칭이 «다섯이 자동으로 같다» 를 지키는가 */
               /* 714 — «다섯이 한 값인가» 가 아니라 «다섯이 이 표본에서 같게 놓였는가» 를 본다 */
               allSame: BKEYS.every(b => S.sum[b].lv === S.sum.weapon.lv && S.sum[b].exp === S.sum.weapon.exp),
               /* 714 — 표본의 다른 배너(skill lv3/exp2)가 **그 칸에** 남는지 */
               skill: { lv: S.sum.skill.lv, exp: S.sum.skill.exp },
               cells: BKEYS.map(b => b + ':' + S.sum[b].lv + '/' + S.sum[b].exp).join(' ') };
    };
    const base = JSON.parse(snap);

    /* verify76 §4 가 쓰는 그 표본 그대로 */
    const oldSave = JSON.parse(JSON.stringify(base));
    oldSave.daily.freeSum = { weapon: 1, shield: 2, skill: 0 };
    oldSave.sum = { skill: { lv: 3, exp: 2 }, weapon: { lv: 1, exp: 0 }, shield: { lv: 1, exp: 0 },
                    pet: { lv: 1, exp: 0 }, relic: { lv: 1, exp: 0 } };
    oldSave.guide = { idx: 7, prog: 55, gv: 2 };
    const r1 = run(oldSave);

    /* [7] 대조 — **진짜** 구 세이브(그 판이 신설한 키를 지운 것)
       714 — 갈래를 가르는 키가 둘이 됐다: `sumVer`(714) · `sumLv`(496). 둘 다 지워야 구 세이브다. */
    const real = JSON.parse(JSON.stringify(oldSave));
    delete real.sumVer; delete real.sumLv; delete real.sumExp;
    const r0 = run(real);

    /* [7-b] 대조 — 두 키를 지우고 진행도까지 0 이면 옛 기대 {lv1,exp0} 가 그대로 나온다 */
    const zero = JSON.parse(JSON.stringify(real));
    zero.sum = { skill: { lv: 1, exp: 0 }, weapon: { lv: 1, exp: 0 }, shield: { lv: 1, exp: 0 },
                 pet: { lv: 1, exp: 0 }, relic: { lv: 1, exp: 0 } };
    const rz = run(zero);

    /* [6] «그 배너의 뽑기 수» 를 구 곡선으로 되돌려 센 기대값.
       714 — 496 은 다섯 칸을 **합쳤고** 714 는 배너마다 따로 센다. 이 절이 읽는 칸은
       목걸이(`amulet`)이고, 그 표본에는 목걸이 항이 아예 없으므로 기대는 다시 «0 뽑» 이다. */
    const pullsOf = k => {
      const o = (oldSave.sum && oldSave.sum[k]) || {};
      const lv = Math.min(SUM_MAXLV_V196, Math.max(1, o.lv | 0 || 1));
      let s = 0;
      for (let n = 1; n < lv; n++) s += sumNeedExpV196(n);
      const cap = (lv >= SUM_MAXLV_V196) ? 0 : sumNeedExpV196(lv) - 1;
      if (o.exp > 0) s += Math.min(Math.floor(o.exp), cap);
      return s;
    };
    const pulls = pullsOf('amulet');
    const pullsSkill = pullsOf('skill');
    let lv = 1, e = pulls;
    while (lv < SUM_MAXLV && e >= sumNeedExp(lv)) { e -= sumNeedExp(lv); lv++; }

    Object.assign(S, JSON.parse(snap)); save();
    return { r1, r0, rz, pulls, pullsSkill, wantLv: lv, wantExp: (lv >= SUM_MAXLV) ? 0 : e,
             free0: SHOP_FREE,
             hasKeys: ('sumLv' in oldSave) || ('sumVer' in oldSave),
             snapExp: JSON.parse(snap).sumExp !== undefined ? JSON.parse(snap).sumExp
                                                            : JSON.parse(snap).sum.amulet.exp };
  });

  console.log('  · ① idx5 «' + A.n5 + '» 보상 ' + A.d5 + ' / 곡선 gmDiaAt(5) ' + A.curve5
            + ' / 상자 10연 ' + Object.entries(A.c10).map(([k, v]) => k + ':' + v).join(' '));
  console.log('  · ① 곡선 계수(제품 역산) ' + A.a0 + ' + ' + A.dstep + '·i'
            + '   [776 — 옛 판 11000 + 2000·i ⇒ idx5 21,000. 그 값을 손으로 적었던 것이 이 자가 굳은 자리다]');
  console.log('  · ① 상자를 올렸을 때 idx5 가 따라온 상자: '
            + (Object.keys(A.moved).filter(b => A.moved[b]).join(',') || '없음')
            + '   (음성 사본: ' + (Object.keys(A.negMoved).filter(b => A.negMoved[b]).join(',') || '없음') + ')');
  console.log('  · ② 표본(자가 쓰는 그대로 — sumLv/sumExp 가 남아 있다) → freeLeft ' + B.r1.free
            + ' · lv ' + B.r1.lv + ' · exp ' + B.r1.exp + '   (스냅샷 sumExp ' + B.snapExp + ')');
  console.log('  · ② 두 키를 지운 **진짜** 구 세이브 → lv ' + B.r0.lv + ' · exp ' + B.r0.exp
            + '   (구 곡선 총 뽑기 ' + B.pulls + ' ⇒ 기대 lv' + B.wantLv + '·exp' + B.wantExp + ')');
  console.log('  · ② 두 키 없음 + 진행도 0 대조 → freeLeft ' + B.rz.free + ' · lv ' + B.rz.lv + ' · exp ' + B.rz.exp);

  /* ── [1] 재현 ──
     ⚠ 776 — 옛 판은 여기에 **21,000 을 손으로** 적고 있었다. 199 22회차(결1 ⓑ)가 곡선 계수를
        11000/2000 → 7750/500 으로 밀자 그 한 항만 빨개졌다(20/21) — 값은 정상이고 **자가 굳은 것**이다.
        바로 아래 [2] ① 이 «제품에서 역산» 이라 같은 값을 묻고도 초록이었다(522-② «같은 숫자가
        자리마다 다르게 읽힌다»). ⇒ 기대값을 `verify76:305` 와 **같은 술어**(하한 결합)로 다시 적는다.
        파생만 남기면 헛초록이므로(522-③) «그 자리에서만 참인 조항» 을 옆에 세우고([1] ①-b·①-c),
        무르게 푼 수리가 아님은 아래 **[R] 되돌림 시험**이 못박는다. */
  eq('[1] ① 76 이 «값» 으로 묻던 그 자리가 그대로 재현된다 — 손 상수가 아니라 max(498 곡선, 목걸이 10연) 하한',
     A.d5, Math.max(A.curve5, A.c10.amulet));
  yes('[1] ① 그 값은 목걸이 10연 정가가 아니다 — 옛 항이 빨간 이유(그 정가도 제품에서 읽는다)',
      A.d5 !== A.c10.amulet, A.d5 + ' vs ' + A.c10.amulet);
  /* ⚑ 714 로 방향이 뒤집힌 항 — 496 이 «다섯을 한 주머니에» 붓느라 목걸이 칸이 0 이 아니게
     됐던 것이 568 의 뿌리였는데, 714 가 배너 독립으로 되돌리면서 그 칸은 다시 {lv1,exp0} 이다.
     자리는 안 비운다(333 처방) — 물음(«표본 이관이 옛 기대를 만족하는가»)은 그대로다. */
  yes('[1] ② 표본 이관이 옛 기대 {lv1,exp0} 를 **다시** 만족한다 — 714 가 568 의 뿌리를 걷어냈다',
      B.r1.lv === 1 && B.r1.exp === 0, 'lv' + B.r1.lv + '·exp' + B.r1.exp);

  /* ── [2] ① 뿌리 ── */
  yes('[2] ① 그 값은 498 곡선 gmDiaAt(5) 와 **정확히** 같다 (⇒ «하드코딩으로 되돌아갔다» 기각)',
      A.d5 === A.curve5, A.d5 + (A.d5 === A.curve5 ? '=' : '≠') + A.curve5);
  yes('[2] ① idx5 의 보상은 여전히 **함수**다 — 표는 함수형 그대로', A.fn5);
  yes('[2] ① 곡선이 목걸이 10연보다 크다 — max 하한에서 곡선이 이기는 것이 지금 상태다',
      A.curve5 > A.c10.amulet, A.curve5 + ' > ' + A.c10.amulet);

  /* ── [3] ① 결합 — 76 이 원래 물으려던 배선 ── */
  yes('[3] ① 목걸이 상자 10연을 곡선 위로 올리면 idx5 가 그 값을 그대로 따라간다 (73 ② 결합이 살아 있다)',
      A.moved.amulet === true);
  yes('[3] ① idx5 를 움직이는 상자는 **목걸이 하나뿐**이다 (= idx6 의 ban — 칸↔상자 1:1)',
      Object.keys(A.moved).filter(b => A.moved[b]).join(',') === 'amulet' && A.ban6 === 'amulet',
      '움직인 상자 [' + Object.keys(A.moved).filter(b => A.moved[b]).join(',') + '] · idx6.ban=' + A.ban6);
  yes('[3] ① 상자 값을 되돌리면 다시 곡선값 — max 는 «대체» 가 아니라 «하한»',
      A.back === A.curve5 && A.restored, String(A.back));

  /* ── [4] ① 음성 대조 ── */
  yes('[4] ① idx5 를 상수로 굳힌 사본에서는 어느 상자도 그 칸을 못 움직인다 (= [3] 이 실제로 결합을 잰다)',
      Object.values(A.negMoved).every(v => v === false),
      Object.keys(A.negMoved).filter(b => A.negMoved[b]).join(',') || '0개');

  /* ── [5] ② 어느 연언이 빨간가 ── */
  eq('[5] ② `freeLeft(\'amulet\')` 는 여전히 폴백 2 다 — 이쪽은 안 깨졌다', B.r1.free, B.free0);
  eq('[5] ② `lv` 도 1 그대로다', B.r1.lv, 1);
  yes('[5] ② 714 이후 그 exp 는 0 이다 — 496 이 부어 넣던 몫이 **스킬 칸에** 남는다',
      B.r1.exp === 0 && B.r1.skill.exp === 2, 'amulet exp ' + B.r1.exp + ' · ' + B.r1.cells);

  /* ── [6] ② 뿌리 — 표본이 «구 세이브» 이기를 그만뒀다 ── */
  yes('[6] ② 자가 «구 세이브» 라며 심는 덩어리에 그 판의 새 키(714 `sumVer` · 496 `sumLv`)가 '
    + '**들어 있다**(뼈대가 `JSON.stringify(S)` 라 살아 있는 상태를 그대로 물려받는다)', B.hasKeys === true);
  yes('[6] ② 그래서 이관이 «구 세이브 환산» 이 아니라 **«이미 새 세이브 — 클램프만»** 으로 빠진다 — '
    + '나온 칸이 `d.sum` 을 구 곡선으로 되돌려 센 값이 아니라 심은 값 그대로다',
      B.r1.skill.lv === 3 && B.r1.skill.exp === 2, '스킬 칸 ' + B.r1.skill.lv + '/' + B.r1.skill.exp);
  yes('[6] ② ⇒ 이 표본은 «구 곡선 환산» 경로를 **한 번도 밟지 않는다** — '
    + '항의 이름이 재는 것과 실제로 도는 코드가 다르다',
      B.r1.skill.exp === 2 && B.hasKeys === true);

  /* ── [7] ② 두 키를 지우면 진짜 구 세이브가 되고, 496 규약대로 «총 뽑기 수» 가 보존된다 ── */
  yes('[7] ② 그 키들을 지우면 «구 곡선 환산» 으로 들어가 **그 배너의** 뽑기 수가 그대로 나온다 (714 «손해 0»)',
      B.r0.lv === B.wantLv && B.r0.exp === B.wantExp,
      'lv' + B.r0.lv + '·exp' + B.r0.exp + ' vs 기대 lv' + B.wantLv + '·exp' + B.wantExp + '(목걸이 뽑기 ' + B.pulls + ')');
  yes('[7] ★ 714 — skill lv3·exp2 의 ' + B.pullsSkill + ' 뽑은 **스킬 칸에 남는다** — '
    + '496 처럼 목걸이로 흘러오지 않는다(그것이 568 의 뿌리였다)',
      B.pulls === 0 && B.pullsSkill > 0 && B.r0.skill.exp === B.pullsSkill,
      '목걸이 ' + B.pulls + ' 뽑 · 스킬 ' + B.pullsSkill + ' 뽑 → ' + B.r0.cells);
  yes('[7] ② 다섯 칸이 **각자** 논다 — 496 의 «별칭이라 자동으로 같다» 를 714 가 뒤집었다',
      !B.r0.allSame, B.r0.cells);
  yes('[7-b] ② 두 키 없음 + 진행도 0 이면 옛 기대 {lv1,exp0} 이 그대로 나온다 — '
    + '규칙이 틀린 게 아니라 **표본이 구 세이브가 아니었다**',
      B.rz.lv === 1 && B.rz.exp === 0 && B.rz.free === B.free0,
      'lv' + B.rz.lv + '·exp' + B.rz.exp + '·free' + B.rz.free);

  /* ── [R] 되돌림 시험(776) — 파생으로 다시 적은 [1] ① 이 «항상 초록» 이 아님을 못박는다.
     전부 페이지 밖 산수라 제품·자의 다른 항을 건드리지 않는다(334 방식). ── */
  yes('[R1] ★ 옛 손 상수 21,000 은 오늘 술어를 통과하지 못한다 — 그것이 이 항이 빨갰던 이유'
    + '(옛 계수 11000/2000 · 199 22회차가 7750/500 으로 밀었다)',
      11000 + 2000 * 5 === 21000 && 21000 !== Math.max(A.curve5, A.c10.amulet),
      '옛 21000 vs 오늘 ' + Math.max(A.curve5, A.c10.amulet));
  yes('[R2] ★ 곡선 계수를 손으로 적는 자는 «판이 밀리면 반드시» 썩는다 — 오늘 곡선은 제품 역산으로만 맞는다',
      A.curve5 === A.a0 + A.dstep * 5 && A.a0 + A.dstep * 5 !== 21000,
      A.a0 + '+' + A.dstep + '·5 = ' + A.curve5);
  yes('[R3] ★ idx5 를 한 칸 어긋난 상수로 굳히면 [1] ① 술어가 깨진다 (= 그 항이 실제로 값을 잰다)',
      (A.d5 + 1) !== Math.max(A.curve5, A.c10.amulet), '어긋난 사본 ' + (A.d5 + 1));
  yes('[R4] ★ [1] ① 과 [2] ① 은 서로 다른 것을 잰다 — 상자 10연이 곡선을 이기는 판에서는 '
    + '하한 술어만 살아남는다(그때 «d5 = 곡선» 은 깨지는 것이 옳다)',
      Math.max(A.curve5, HIGH * 10) === HIGH * 10 && HIGH * 10 !== A.curve5,
      '상자 10연 ' + (HIGH * 10) + ' > 곡선 ' + A.curve5);

  eq('[8] 콘솔 에러 0건', errs.length, 0);

  await p.close(); await br.close();
  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nPROBE568 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
