/* 작업 565 재현 — `tools/verify195.js` G1 이 잡는 13,000 / 19,000 / 21,000 의 정체.
   실행: node tools/probe565.js

   등재문(PROGRESS 565): G1 「함수형 보상 = 그 소환의 10연(1,000) · 하드코딩 유입 0」이
   `13000,19000,21000` 을 잡는다. 세 값이 «10연 정가 1,000» 과 자릿수가 다르므로
     ⓐ 보상 표가 함수형에서 **하드코딩으로 되돌아갔거나**
     ⓑ 자가 **다른 표를 읽고** 있거나
   둘 중 하나다 — 338 규칙대로 제품에게 먼저 묻는다.

   여기서 재는 것 다섯:
     [1] 재현      — G1 이 읽는 그 자리(`GUIDE` 의 함수형 칸)에서 실제로 그 세 값이 나오는가
     [2] 뿌리      — 세 값이 498 곡선 `gmDiaAt(i) = GM_DIA0 + GM_DIA_D·i` 와 **정확히** 같은가
                     (같으면 ⓐ 가 아니다 — 하드코딩이 아니라 «곡선이 하한을 이겼다» 는 뜻)
     [3] 결합      — 상자 10연을 곡선 위로 올리면 세 칸이 **그 10연을 그대로 따라가는가**
                     (= `dia:() => summonCost(...)` 결합이 살아 있는가. 어느 상자가 어느 칸을
                      움직이는지도 같이 찍어 «73 ② — 다음 미션의 상자» 를 행동으로 확인한다)
     [4] 음성 대조 — 그 칸을 **상수로 갈아 끼운 사본**에서는 [3] 이 안 움직인다
                     (= [3] 이 실제로 «하드코딩 유입» 을 잡는 자다)
     [5] 복원      — 상자 값을 되돌리면 세 칸이 다시 곡선값 (max 는 대체가 아니라 **하한**)
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const R = [];
const yes = (n, got, extra) => R.push({ n, got: String(got) + (extra ? ' :: ' + extra : ''), want: 'true', pass: got === true });
const eq  = (n, got, want) => R.push({ n, got: String(got), want: String(want), pass: String(got) === String(want) });

/* 곡선 최대(idx 19 = 49,000)보다 확실히 큰 상자 값 — 10연 = cost×10 */
const HIGH = 90000;

(async () => {
  const br = await launch(chromium);
  const p = await br.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1200);

  const D = await p.evaluate((HIGH) => {
    const fnIdx = GUIDE.map((m, i) => (typeof m.dia === 'function' ? i : -1)).filter(i => i >= 0);
    const vals  = fnIdx.map(i => gmDia(GUIDE[i]));
    const curve = fnIdx.map(i => gmDiaAt(i));
    const c10   = BKEYS.reduce((o, b) => (o[b] = summonCost(b, 10), o), {});

    /* [3] 상자를 한 종류씩 곡선 위로 올려 «어느 칸이 따라오는가» 를 행동으로 잰다 */
    const moved = {};
    for (const b of BKEYS) {
      const keep = BANNERS[b].cost;
      BANNERS[b].cost = HIGH;
      const want = summonCost(b, 10);
      moved[b] = fnIdx.filter(i => gmDia(GUIDE[i]) === want);
      BANNERS[b].cost = keep;
    }
    /* [5] 복원 확인 — 되돌리면 곡선값으로 돌아온다 */
    const back = fnIdx.map(i => gmDia(GUIDE[i]));

    /* 다음 미션의 `ban`(73 ② 가 말하는 «다음 소환») */
    const nextBan = fnIdx.map(i => (GUIDE[i + 1] || {}).ban || null);

    /* [4] 음성 사본 — 함수형 칸을 상수로 갈아 끼우면 결합이 죽는다 */
    const keepFns = fnIdx.map(i => GUIDE[i].dia);
    fnIdx.forEach((i, k) => { GUIDE[i].dia = vals[k]; });
    const negMoved = {};
    for (const b of BKEYS) {
      const keep = BANNERS[b].cost;
      BANNERS[b].cost = HIGH;
      const want = summonCost(b, 10);
      negMoved[b] = fnIdx.filter(i => gmDia(GUIDE[i]) === want);
      BANNERS[b].cost = keep;
    }
    fnIdx.forEach((i, k) => { GUIDE[i].dia = keepFns[k]; });
    const restored = fnIdx.map(i => typeof GUIDE[i].dia === 'function');

    return { fnIdx, vals, curve, c10, moved, back, nextBan, negMoved, restored,
             d0: GM_DIA0, dd: GM_DIA_D, n: GUIDE.length };
  }, HIGH);

  console.log('  · [1] 함수형 칸 idx  : ' + D.fnIdx.join(', '));
  console.log('  · [1] 그 칸의 보상   : ' + D.vals.join(', '));
  console.log('  · [1] 498 곡선 값    : ' + D.curve.join(', ') + '   (GM_DIA0 ' + D.d0 + ' + ' + D.dd + '·i)');
  console.log('  · [1] 상자 10연 정가 : ' + Object.entries(D.c10).map(([k, v]) => k + ':' + v).join(' '));
  console.log('  · [3] 상자를 ' + (HIGH * 10).toLocaleString() + ' 로 올렸을 때 따라온 칸: '
            + Object.entries(D.moved).map(([b, a]) => b + '→[' + a.join(',') + ']').join(' '));
  console.log('  · [4] 상수 사본에서 따라온 칸: '
            + Object.entries(D.negMoved).map(([b, a]) => b + '→[' + a.join(',') + ']').join(' '));

  /* ── [1] 재현 ── */
  eq('[1] 함수형 칸은 3개다(498 이 «결합을 버리지 않았다» 고 적은 그 세 칸)', D.fnIdx.length, 3);
  yes('[1] G1 이 찍은 값이 그대로 재현된다 — 13000,19000,21000',
      D.vals.join(',') === '13000,19000,21000', D.vals.join(','));
  yes('[1] 그 값은 상자 10연 정가(1,000)가 아니다 — G1 이 빨간 이유',
      D.vals.every(v => v !== 1000));

  /* ── [2] 뿌리 — 하드코딩이 아니라 «곡선이 하한을 이겼다» ── */
  yes('[2] 세 값 = 498 곡선 gmDiaAt(i) 와 **정확히** 같다 (⇒ 등재문 갈래 ⓐ «하드코딩으로 되돌아갔다» 기각)',
      D.vals.every((v, k) => v === D.curve[k]),
      D.vals.map((v, k) => v + (v === D.curve[k] ? '=' : '≠') + D.curve[k]).join(' '));
  yes('[2] 세 칸은 여전히 **함수**다 (`typeof m.dia === "function"` — 표는 함수형 그대로다)',
      D.restored.every(Boolean));
  yes('[2] 곡선이 상자 10연보다 크다 — max 하한에서 곡선이 이기는 것이 지금 상태다',
      D.curve.every(c => c > Math.max(...Object.values(D.c10))),
      '곡선 min ' + Math.min(...D.curve) + ' > 10연 max ' + Math.max(...Object.values(D.c10)));

  /* ── [3] 결합이 살아 있다 ── */
  const movedAll = Object.values(D.moved).reduce((a, x) => a.concat(x), []).sort((a, b) => a - b);
  yes('[3] 상자를 곡선 위로 올리면 세 칸이 **전부** 그 10연을 따라간다 (결합이 살아 있다)',
      movedAll.join(',') === D.fnIdx.join(','), '[' + movedAll.join(',') + ']');
  yes('[3] 한 칸은 **한 상자**에만 반응한다 (칸↔상자가 1:1 — 두 상자가 같은 칸을 움직이지 않는다)',
      movedAll.length === new Set(movedAll).size);
  const pair = {};
  Object.entries(D.moved).forEach(([b, a]) => a.forEach(i => { pair[i] = b; }));
  yes('[3] 결합 상대 = **다음 미션의 상자**(73 ②) — 행동으로 확인',
      D.fnIdx.every((i, k) => pair[i] === D.nextBan[k]),
      D.fnIdx.map((i, k) => 'idx' + i + '→' + pair[i] + '(다음 ' + D.nextBan[k] + ')').join(' · '));
  yes('[3] 결합이 없는 상자(스킬·펫)는 아무 칸도 안 움직인다',
      (D.moved.skill || []).length === 0 && (D.moved.pet || []).length === 0);

  /* ── [4] 음성 대조 ── */
  const negAll = Object.values(D.negMoved).reduce((a, x) => a.concat(x), []);
  eq('[4] 세 칸을 **상수로 갈아 끼우면** 아무 상자도 칸을 못 움직인다 (= [3] 이 하드코딩 유입을 실제로 잡는다)',
     negAll.length, 0);

  /* ── [5] 복원 — max 는 대체가 아니라 하한 ── */
  yes('[5] 상자 값을 되돌리면 세 칸이 다시 곡선값이다 (max 는 «대체» 가 아니라 «하한»)',
      D.back.every((v, k) => v === D.curve[k]), D.back.join(','));

  eq('[6] 콘솔 에러 0건', errs.length, 0);

  await p.close(); await br.close();
  const fail = R.filter(x => !x.pass);
  R.forEach(x => console.log((x.pass ? ' ok  ' : 'FAIL ') + x.n + '  →  ' + x.got + ' (want ' + x.want + ')'));
  console.log('\nPROBE565 ' + (R.length - fail.length) + '/' + R.length + ' ' + (fail.length ? 'FAIL' : 'PASS'));
  process.exit(fail.length ? 1 : 0);
})();
