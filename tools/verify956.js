/* 게이트 956 — 장부(`probe932` LEDGER)의 판정은 «지금 자» 를 읽고 적힌 것이다
 *
 *   node tools/verify956.js
 *
 * 무엇을 지키는가 —
 *   932 는 «신호가 바뀌면 판정 무효» 라는 장치를 세웠다(`verify932` [2-c]). 그 장치의 구멍은
 *   **초록으로 만드는 가장 짧은 길이 «sig 만 베껴 넣기»** 라는 것이다 — 자에 얇은 축이 하나
 *   더 생겨도 `sig` 한 줄만 갱신하면 [2-c] 는 조용히 초록으로 돌아가고, 늘어난 걸음은
 *   **아무도 안 센다**(931 «손으로 적은 갈래는 자가 늘 때 아무도 안 센다»).
 *   956 이 실제로 그 자리였다 — 923 8회차가 `scan923.py` 에 `--band`(검정 띠 두께 ≈10 우리 px)를
 *   신설했는데 `.sum()` 계열이 안 늘어 **`i2` 가 그대로**였고, 옛 `fix` 는 «두 자리만 다시 보면
 *   된다» 라고 적혀 있었다. 그 말대로만 했으면 **새로 생긴 얇은 축을 한 번도 안 보고** 초록이 된다.
 *
 * 절 —
 *   [1] 신호   — 장부의 `sig` 가 지금 소스와 같다(= [2-c] 초록의 근거를 여기서도 직접 잰다).
 *   [2] 판정   — `scan923.py` 의 판정문이 **늘어난 걸음의 이름**을 든다(sig 만 베낀 것이 아니다).
 *   [3] 자     — `--band` 의 두 모서리가 소스에서 실제로 부분 화소다(면역 판정의 근거).
 *   [4] 정수   — `scan923.py` 의 정수 걸음은 여전히 **둘뿐이고 길이가 아니다**(셋째가 생기면 빨강).
 *   [R] 되돌림 — `--band` 이전 사본에서는 지금 `sig` 가 **안 맞는다**(= sig 가 진짜 지금 것이다).
 *
 * ⚠ 화소도 브라우저도 안 쓴다 — 소스와 git 이력뿐이다(913·937 계열 즉사 없음).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./probe932');
const G = require('./gitrev756');

const TOOLS = __dirname;
let pass = 0, fail = 0, skip = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};
const hold = (msg, why) => { skip++; console.log('  ⏸ ' + msg + ' — ' + why); };

const FILE = 'scan923.py';
const SRC = fs.readFileSync(path.join(TOOLS, FILE), 'utf8');
const LED = P.LEDGER[FILE];

/* 923 8회차가 `--band` 를 신설한 커밋 — 그 부모가 «늘기 전» 사본이다. */
const BAND_SHA = '4b34940';

const sigStr = s => `k${s.scale ? 1 : 0} r${s.refimg ? 1 : 0} t${s.thin} i${s.intlen} f${s.frac ? 1 : 0}`;

console.log('[1] 신호 — 장부의 sig 가 지금 소스와 같다');
{
  ok('[1-a] 장부에 `' + FILE + '` 행이 있다', !!LED, LED ? LED.v : '없다');
  const now = sigStr(P.signals(SRC));
  ok('[1-b] `sig` 가 지금 신호와 글자까지 같다', !!LED && LED.sig === now,
    `장부 ${LED ? LED.sig : '—'} ↔ 지금 ${now}`);
  ok('[1-c] 판정은 면역(S) 이다 — 두 모서리가 다 부분 화소라는 [3] 의 결론과 짝이다',
    !!LED && LED.v === 'S', LED ? LED.v : '—');
}

console.log('\n[2] 판정 — 늘어난 걸음의 이름을 든다 (sig 만 베낀 것이 아니다)');
{
  const txt = [LED && LED.axis, LED && LED.why, LED && LED.fix].join(' ');
  /* 늘어난 걸음의 «이름» 셋 — 소스에 실제로 있는 식별자라야 한다(말만 적는 것을 막는다). */
  const NAMES = ['--band', 'inner_x', 'band_prof'];
  const inSrc = NAMES.filter(n => SRC.includes(n));
  ok('[2-a] 그 이름들이 소스에 실제로 있다 (자가 먼저 참이다)',
    inSrc.length === NAMES.length, inSrc.join(' '));
  const named = NAMES.filter(n => txt.includes(n));
  ok('[2-b] **판정문이 늘어난 걸음을 이름으로 든다** — 하나라도 빠지면 «읽었다» 가 아니다',
    named.length === NAMES.length, `${named.length}/${NAMES.length} — ${named.join(' ')}`);
  ok('[2-c] 판정문이 그 축을 «얇은 축» 으로 밝힌다 (두께를 말한다)',
    /띠 두께/.test(txt));
  /* ⚑ 이 항이 956 의 본체다 — 옛 fix 의 «두 자리만 다시 보면 된다» 가 왜 못 미더웠는지를
     장부 자신이 들고 있어야 다음 워커가 같은 지름길로 안 간다. */
  ok('[2-d] ⚑ 장부가 «i 가 안 움직여도 축은 늘 수 있다» 를 스스로 적어 둔다',
    /i2 가 그대로|안 늘어|늘어난 걸음/.test(txt));
}

console.log('\n[3] 자 — `--band` 의 두 모서리가 소스에서 실제로 부분 화소다');
{
  const band = SRC.slice(SRC.indexOf('def inner_x'), SRC.indexOf('def band_table'));
  ok('[3-a] `--band` 절을 소스에서 찾았다 (아래 항들이 헛초록이 아니다)',
    band.length > 400, `${band.length}자`);
  /* 안쪽 모서리 = 문턱 교차 선형 보간(ⓐ) — `i + f` 로 소수를 낸다 */
  ok('[3-b] 안쪽 모서리 `inner_x` 가 문턱을 **선형 보간**으로 지난다(ⓐ)',
    /f\s*=\s*\(g\[i\]\s*-\s*lvl\)/.test(band) && /return\s+i\s*\+\s*f/.test(band));
  /* 두께 = 두 부분화소 점구름의 최소 유클리드 거리 — 화소 세기가 없다 */
  ok('[3-c] 두께가 **점구름 최소 거리**다 (화소를 세지 않는다)',
    /np\.hypot\(/.test(band) && /argmin\(\)/.test(band));
  ok('[3-d] 바깥 모서리는 이미 면역인 `outer_x`(덮개 적분)를 그대로 부른다 — 사본 0',
    /outer_x\(/.test(band) && /def outer_x/.test(SRC));
  /* [2-g] 와 같은 말을 이 자도 직접 묻는다(선별기 신호 f0 는 관용구 이름만 본다). */
  ok('[3-e] ⚠ 선별기 `frac` 은 **0** 인데도 면역이다 — 이름이 다른 부분화소라 이 자가 직접 봤다',
    P.signals(SRC).frac === false && LED.v === 'S');
}

console.log('\n[4] 정수 — 정수 걸음은 여전히 둘뿐이고 길이가 아니다');
{
  const lines = SRC.split('\n');
  const hits = [];
  lines.forEach((l, i) => {
    if (/\.sum\(\)|count_nonzero|np\.ptp|\bptp\(|argwhere|distance_transform_edt|np\.where\(|len\(runs?\b/.test(l))
      hits.push({ n: i + 1, l: l.trim() });
  });
  ok('[4-a] 정수 걸음이 **정확히 둘**이다 (셋째가 생기면 여기가 먼저 빨개진다)',
    hits.length === 2, hits.map(h => 'L' + h.n).join(' '));
  ok('[4-b] 하나는 색 거리(덮개의 분모)다 — 길이가 아니다',
    hits.some(h => /np\.abs\(blk\s*-\s*np\.array\(bg\)\)\.sum\(\)/.test(h.l)),
    hits[0] ? hits[0].l.slice(0, 60) : '—');
  ok('[4-c] 다른 하나는 카드 띠를 **찾는** 행 술어다 — 길이가 아니다',
    hits.some(h => /sum\(1\)\s*>\s*t\)\.sum\(\)\s*>\s*W\s*\*\s*0\.40/.test(h.l)),
    hits[1] ? hits[1].l.slice(0, 60) : '—');
  ok('[4-d] 장부가 그 둘을 **지금 줄 번호**로 부른다 (옛 번호로 굳지 않는다)',
    hits.every(h => (LED.why || '').includes('L' + h.n)),
    hits.map(h => 'L' + h.n).join(' '));
}

console.log('\n[R] 되돌림 — `--band` 이전 사본에서는 지금 sig 가 안 맞는다');
{
  const r = G.show(BAND_SHA + '^', 'tools/' + FILE);
  if (!r.ok && r.env) {
    hold('[R-a][R-b] 늘기 전 사본을 못 꺼냈다', G.skipNote(r));
  } else if (!r.ok) {
    ok('[R-a] 늘기 전 사본을 꺼냈다', false, r.why);
  } else {
    const old = r.buf.toString('utf8');
    const oldSig = sigStr(P.signals(old));
    ok('[R-a] 늘기 전 사본에서는 지금 `sig` 가 **안 맞는다** — sig 가 진짜 지금 것이다',
      oldSig !== LED.sig, `옛 ${oldSig} ↔ 장부 ${LED.sig}`);
    ok('[R-b] 그 차이가 «얇은 말» 축이다 — 축이 늘어난 것이 신호에 남아 있다',
      P.signals(old).thin < P.signals(SRC).thin
      && P.signals(old).intlen === P.signals(SRC).intlen,
      `t ${P.signals(old).thin} → ${P.signals(SRC).thin} · i ${P.signals(old).intlen} → ${P.signals(SRC).intlen}`);
    ok('[R-c] 늘기 전 사본에는 `inner_x`·`band_prof` 가 **없다** (늘어난 걸음이 맞다)',
      !old.includes('def inner_x') && !old.includes('def band_prof'));
  }
}

console.log(`\nVERIFY956 ${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`
  + (skip ? ` (⏸ ${skip})` : ''));
process.exit(fail === 0 ? 0 : 1);
