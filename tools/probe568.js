/* 작업 568 재현 — `tools/verify76.js` 22/24 의 두 항이 무엇을 잡고 있는가.
   실행: node tools/probe568.js

   등재문(PROGRESS 568): 실패는 두 항이고 **뿌리가 다르다**.
     ① §6 `idx5 «방패 1종 보유하기» 보상 21000 = 목걸이 10연` — 498 이 가이드 보상을 곡선
        `gmDiaAt(i)` 으로 갈면서 73 ② 결합을 `max(곡선, 그 상자 10연)` **하한**으로 남겼는데,
        76 의 이 항은 73 ② 시절의 «값»(1,000)에 굳어 있다.
     ② §4 `ⓐⓑ amulet 키 없음 → freeLeft 2(폴백) · S.sum.amulet {lv1,exp0}` — 496 이 소환
        레벨을 «배너 5 벌» 에서 «공용 스칼라 둘» 로 내렸다.
   338 규칙대로 고치기 전에 제품에게 직접 묻는다.

   여기서 재는 것:
     [1] 재현     — 두 항이 읽는 그 자리에서 실패값이 그대로 나오는가(결정적인가)
     [2] ① 뿌리   — idx5 의 21,000 이 498 곡선 `gmDiaAt(5)` 와 **정확히** 같은가
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

    return { d5, fn5, curve5, c10, ban6, n5: GUIDE[5].n, moved, negMoved, back,
             restored: typeof GUIDE[5].dia === 'function' };
  }, HIGH);

  /* ── ② 구 세이브 이관 ──
     ⚠ verify76 §4 는 §2·§3 에서 목걸이 10연(10뽑) + 무료 10연 ×2(20뽑)를 **먼저 돌린 뒤**
        `JSON.stringify(S)` 를 «구 세이브의 뼈대» 로 쓴다. 그 스냅샷에는 496 이 신설한
        `sumLv`/`sumExp` 가 들어 있으므로 여기서도 그 상태를 만들어 놓고 잰다. */
  const B = await p.evaluate(() => {
    closeModal && closeModal(); gmCloseAll();
    S.sumLv = 1; S.sumExp = 30;              /* §2·§3 이 남기는 «30 뽑» 상태 */
    const snap = JSON.stringify(S);
    const run = old => {
      localStorage.setItem(KEY, JSON.stringify(old));
      load();
      return { free: freeLeft('amulet'),
               lv: S.sum.amulet && S.sum.amulet.lv, exp: S.sum.amulet && S.sum.amulet.exp,
               sumLv: S.sumLv, sumExp: S.sumExp,
               /* 별칭이 «다섯이 자동으로 같다» 를 지키는가 */
               allSame: BKEYS.every(b => S.sum[b].lv === S.sumLv && S.sum[b].exp === S.sumExp) };
    };
    const base = JSON.parse(snap);

    /* verify76 §4 가 쓰는 그 표본 그대로 */
    const oldSave = JSON.parse(JSON.stringify(base));
    oldSave.daily.freeSum = { weapon: 1, shield: 2, skill: 0 };
    oldSave.sum = { skill: { lv: 3, exp: 2 }, weapon: { lv: 1, exp: 0 }, shield: { lv: 1, exp: 0 },
                    pet: { lv: 1, exp: 0 }, relic: { lv: 1, exp: 0 } };
    oldSave.guide = { idx: 7, prog: 55, gv: 2 };
    const r1 = run(oldSave);

    /* [7] 대조 — **진짜** 구 세이브(496 이 신설한 두 키를 지운 것) */
    const real = JSON.parse(JSON.stringify(oldSave));
    delete real.sumLv; delete real.sumExp;
    const r0 = run(real);

    /* [7-b] 대조 — 두 키를 지우고 진행도까지 0 이면 옛 기대 {lv1,exp0} 가 그대로 나온다 */
    const zero = JSON.parse(JSON.stringify(real));
    zero.sum = { skill: { lv: 1, exp: 0 }, weapon: { lv: 1, exp: 0 }, shield: { lv: 1, exp: 0 },
                 pet: { lv: 1, exp: 0 }, relic: { lv: 1, exp: 0 } };
    const rz = run(zero);

    /* [6] «총 뽑기 수» 를 구 곡선으로 되돌려 센 기대값 */
    const pulls = (() => {
      let s = 0;
      const old = oldSave.sum;
      BKEYS.forEach(k => {
        const o = old[k] || {};
        const lv = Math.min(SUM_MAXLV_V196, Math.max(1, o.lv | 0 || 1));
        for (let n = 1; n < lv; n++) s += sumNeedExpV196(n);
        const cap = (lv >= SUM_MAXLV_V196) ? 0 : sumNeedExpV196(lv) - 1;
        if (o.exp > 0) s += Math.min(Math.floor(o.exp), cap);
      });
      return s;
    })();
    let lv = 1, e = pulls;
    while (lv < SUM_MAXLV && e >= sumNeedExp(lv)) { e -= sumNeedExp(lv); lv++; }

    Object.assign(S, JSON.parse(snap)); save();
    return { r1, r0, rz, pulls, wantLv: lv, wantExp: (lv >= SUM_MAXLV) ? 0 : e, free0: SHOP_FREE,
             hasKeys: 'sumLv' in oldSave, snapExp: JSON.parse(snap).sumExp };
  });

  console.log('  · ① idx5 «' + A.n5 + '» 보상 ' + A.d5 + ' / 곡선 gmDiaAt(5) ' + A.curve5
            + ' / 상자 10연 ' + Object.entries(A.c10).map(([k, v]) => k + ':' + v).join(' '));
  console.log('  · ① 상자를 올렸을 때 idx5 가 따라온 상자: '
            + (Object.keys(A.moved).filter(b => A.moved[b]).join(',') || '없음')
            + '   (음성 사본: ' + (Object.keys(A.negMoved).filter(b => A.negMoved[b]).join(',') || '없음') + ')');
  console.log('  · ② 표본(자가 쓰는 그대로 — sumLv/sumExp 가 남아 있다) → freeLeft ' + B.r1.free
            + ' · lv ' + B.r1.lv + ' · exp ' + B.r1.exp + '   (스냅샷 sumExp ' + B.snapExp + ')');
  console.log('  · ② 두 키를 지운 **진짜** 구 세이브 → lv ' + B.r0.lv + ' · exp ' + B.r0.exp
            + '   (구 곡선 총 뽑기 ' + B.pulls + ' ⇒ 기대 lv' + B.wantLv + '·exp' + B.wantExp + ')');
  console.log('  · ② 두 키 없음 + 진행도 0 대조 → freeLeft ' + B.rz.free + ' · lv ' + B.rz.lv + ' · exp ' + B.rz.exp);

  /* ── [1] 재현 ── */
  eq('[1] ① verify76 이 찍은 21000 이 그대로 재현된다', A.d5, 21000);
  yes('[1] ① 그 값은 목걸이 10연 정가(1,000)가 아니다 — 옛 항이 빨간 이유',
      A.d5 !== A.c10.amulet, A.d5 + ' vs ' + A.c10.amulet);
  yes('[1] ② 표본 이관이 옛 기대 {lv1,exp0} 를 만족하지 않는다 — 그 항이 빨간 이유',
      !(B.r1.lv === 1 && B.r1.exp === 0), 'lv' + B.r1.lv + '·exp' + B.r1.exp);

  /* ── [2] ① 뿌리 ── */
  yes('[2] ① 21,000 = 498 곡선 gmDiaAt(5) 와 **정확히** 같다 (⇒ «하드코딩으로 되돌아갔다» 기각)',
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
  eq('[5] ② `lv` 도 1 그대로다 — 빨간 것은 `exp` 한 칸이다', B.r1.lv, 1);
  yes('[5] ② 그 exp 가 0 이 아니다 (자가 잡는 그 값)', B.r1.exp !== 0, String(B.r1.exp));

  /* ── [6] ② 뿌리 — 표본이 «구 세이브» 이기를 그만뒀다 ── */
  yes('[6] ② 자가 «구 세이브» 라며 심는 덩어리에 496 이 신설한 `sumLv` 가 **들어 있다** '
    + '(뼈대가 `JSON.stringify(S)` 라 살아 있는 상태를 그대로 물려받는다)', B.hasKeys === true);
  yes('[6] ② 그래서 이관이 ⓑ(구 세이브) 가 아니라 **ⓐ(새 세이브 — 클램프만)** 로 빠진다 — '
    + '나온 exp 가 `d.sum` 이 아니라 **스냅샷의 sumExp** 와 같다',
      B.r1.exp === B.snapExp, 'exp ' + B.r1.exp + ' = 스냅샷 sumExp ' + B.snapExp);
  yes('[6] ② ⇒ 이 표본은 «amulet 키 없음 → 폴백» 경로를 **한 번도 밟지 않는다** — '
    + '항의 이름이 재는 것과 실제로 도는 코드가 다르다', B.r1.exp === B.snapExp && B.hasKeys === true);

  /* ── [7] ② 두 키를 지우면 진짜 구 세이브가 되고, 496 규약대로 «총 뽑기 수» 가 보존된다 ── */
  yes('[7] ② 두 키를 지우면 ⓑ 로 들어가 «구 곡선으로 되돌려 센 총 뽑기 수» 가 그대로 나온다 (496 «손해 0»)',
      B.r0.lv === B.wantLv && B.r0.exp === B.wantExp,
      'lv' + B.r0.lv + '·exp' + B.r0.exp + ' vs 기대 lv' + B.wantLv + '·exp' + B.wantExp + '(뽑기 ' + B.pulls + ')');
  yes('[7] ② 그 뽑기 수는 **다른 배너**(skill lv3·exp2)에서 왔다 — 목걸이 칸은 원래 없었다',
      B.pulls > 0, '총 ' + B.pulls + ' 뽑');
  yes('[7] ② 별칭 뷰라 다섯 배너가 자동으로 같은 값이다 (496 «공용 하나»)', B.r0.allSame);
  yes('[7-b] ② 두 키 없음 + 진행도 0 이면 옛 기대 {lv1,exp0} 이 그대로 나온다 — '
    + '규칙이 틀린 게 아니라 **표본이 구 세이브가 아니었다**',
      B.rz.lv === 1 && B.rz.exp === 0 && B.rz.free === B.free0,
      'lv' + B.rz.lv + '·exp' + B.rz.exp + '·free' + B.rz.free);

  eq('[8] 콘솔 에러 0건', errs.length, 0);

  await p.close(); await br.close();
  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nPROBE568 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
