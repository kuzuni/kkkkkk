/* 게이트 932 — «정수로 세는 자» 는 한 자도 판정 없이 남지 않는다
 *
 *   node tools/verify932.js
 *
 * 무엇을 지키는가 —
 *   895 2회차가 자기 획 걸음을 정수 → 부분 화소로 갈아 끼우며 남긴 교훈은 «7 이 맞다» 가 아니라
 *   **«정수로 세는 자로 ref 를 재면 우리와 견줄 수 없다»** 였고, «같은 걸음을 쓰는 축이 더 있는가» 를
 *   932 로 넘겼다. 이 자는 그 전수를 **닫힌 채로** 지킨다 —
 *   자가 늘거나 신호가 바뀌면 판정이 다시 열리고(=빨강), 아무도 모르게 지나가지 못한다.
 *
 * 절 —
 *   [1] 규칙   — 선별기(`probe932.signals`)가 합성 소스에서 넷을 제대로 갈라 읽는가(거짓 양성·음성 0).
 *   [2] 전수   — 미판정(U) 0 · 판정 무효(?) 0 · 빨강 목록이 기록과 같다(래칫).
 *   [3] 물리   — 세 자를 합성 프로파일에 돌려 «왜 ref 만 얇아지는가» 를 매 실행 다시 찍는다.
 *   [4] 선례   — 두 처방이 **말이 아니라 코드로** 저장소 안에 있다(교차점 보간 · 질량 적분).
 *   [R] 되돌림 — 부분 화소 자를 정수로 되돌리면 895 의 지문(ref 값이 K 의 배수로 굳는다)이 되돌아온다.
 *
 * ⚠ 화소도 브라우저도 안 쓴다 — 소스와 합성 프로파일뿐이라 환경에 안 걸린다(913·937 계열 즉사 없음).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./probe932');

const TOOLS = __dirname;
const ROOT = path.resolve(__dirname, '..');   /* 932 4회차 §7 — 파이썬 자를 저장소 뿌리에서 부른다 */
let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* 이 회차가 읽어 판정한 두 목록 — 래칫이다. 늘면 이 자가 먼저 짖는다.
   R = 축척 비대칭(②ⓐ · 895 와 같은 얼굴) · B = 번짐 비대칭(②ⓑ · 1:1 · 942 로 등재) */
/* ⚑ 3회차 — `scan667b.py` 가 R 에서 빠졌다(얇은 축 넷이 전부 부분 화소다 · §6).
   래칫은 «늘면 빨강» 이므로 **줄어든 것도 여기서 다시 적어야** 지나간다 — 그 자리가 이 줄이다. */
/* ⚑ 4회차 — `probe866.py` 가 R 에서 빠졌다(알약 바깥·속 여덟 모서리가 전부 부분 화소다 · §7). */
const RED = ['scan885b.py', 'scan885e.py', 'scan887.py'];
const FIXED = ['scan667b.py', 'probe866.py'];  /* 이 번호가 실제로 갈아 끼운 자 — [6-e] 가 «비어서 초록» 을 막는다 */
/* ⚑ 942 1회차 — `probe409g.py` 가 B 에서 빠졌다(`--diag` 를 «이웃 두 층에 비례로 나누는» 자로 갈아 끼웠다 ·
   자는 `tools/verify942.js`). 주홍 래칫도 «줄어든 것을 여기 다시 적어야» 지나간다 — 그 자리가 이 줄이다. */
const FIXED942 = ['probe409g.py'];
const BRK = ['probe352.py', 'probe384.py', 'probe409.py', 'probe409c.py', 'probe409f.py',
  'probe409i.py', 'probe449.py', 'scan335.py', 'scanA4.py', 'scanA4b.py'];

/* ⚠ 선별기의 `frac` 신호는 **관용구 이름**만 본다. 면역 판정의 근거는 그보다 넓다 —
   커버리지 적분(`r_cov`)·색 사영 교차(`_cross`)처럼 이름이 다른 사본이 있다.
   그래서 «면역이라고 적은 자가 정말 부분 화소를 쓰는가» 는 **이 자가 직접** 묻는다. */
const FRAC_DEEP = /_bilin|np\.interp|map_coordinates|dark_mass|r_cov|_cross\(|def cross\(|1 - prof\[|커버리지|피복|질량|적분|서브픽셀|부분 ?화소/;

/* ── [1] 규칙 ─────────────────────────────────────────────────────────── */
console.log('\n[1] 규칙 — 선별기가 넷을 갈라 읽는가');
{
  const s1 = P.signals("K = 2.0628\n# 검정 획 두께\nn = mask.sum()\n");
  ok('[1-a] 환산 배율 + 얇은 말 + 화소 세기 = 축척 후보(②ⓐ)',
    s1.scale && s1.thin > 0 && s1.intlen > 0 && !s1.frac, JSON.stringify(s1));

  const s2 = P.signals("REF='docs/ref/13-상점.jpg'   # 1080x2340 — 가로 1:1\n# 검정 테두리 두께\nn = mask.sum()\n");
  ok('[1-b] ⚑ **ref 를 읽어도 배율이 없으면 축척 후보가 아니다** — 전체 화면 ref 는 가로 1:1 이라 ②ⓑ(번짐) 로만 남는다',
    !s2.scale && s2.refimg && s2.thin > 0 && s2.intlen > 0, JSON.stringify(s2));

  const s3 = P.signals("K = 2.0628\n# 검정 획\nt = _bilin(a, y, x)\n");
  ok('[1-c] 교차점 보간(ⓐ)을 쓰면 frac 이 선다', s3.scale && s3.thin > 0 && s3.frac);

  const s4 = P.signals("K = 2.0628\n# 검정 테 두께 — 질량\nm += 1 - prof[j] / lo\n");
  ok('[1-d] 질량 적분(ⓑ)을 써도 frac 이 선다 — 처방이 둘인 것을 규칙이 안다', s4.scale && s4.frac);

  /* ⚠ 선별기는 «판정기» 가 아니다 — 그 한계를 항으로 세워 둔다.
     같은 `.sum()` 이 획에도 판 넓이에도 쓰이므로 소스 글자만으로는 못 가른다. */
  const s5 = P.signals("K = 2.0628\n# 판 넓이\narea = mask.sum()\n");
  ok('[1-e] «얇은 말» 이 없으면 화소를 세도 후보가 아니다 — 선별기의 한계를 인정한 자리',
    s5.scale && s5.thin === 0 && s5.intlen > 0);
}

/* ── [2] 전수 ─────────────────────────────────────────────────────────── */
console.log('\n[2] 전수 — 미판정 0 · 판정 무효 0 · 빨강 래칫');
{
  const rows = P.census();
  const by = v => rows.filter(r => r.verdict === v).map(r => r.file);
  ok('[2-a] 자를 하나도 안 빠뜨렸다 (scan*.py · probe*.py)', rows.length >= 70, `${rows.length}개`);
  ok('[2-b] **미판정 후보 0** — 후보는 전부 사람이 읽어 장부에 적혔다',
    by('U').length === 0, by('U').length ? by('U').join(' ') : '0개');
  ok('[2-c] **판정 무효 0** — 장부의 신호가 지금 소스와 같다(누가 자를 고치면 여기가 먼저 빨개진다)',
    by('?').length === 0, by('?').length ? by('?').join(' ') : '0개');
  const red = by('R');
  ok('[2-d] 빨강 목록이 기록과 같다 (래칫 — 늘면 빨강)',
    red.length === RED.length && red.every(f => RED.includes(f)),
    `지금 [${red.join(' ')}] ↔ 기록 [${RED.join(' ')}]`);
  const brk = by('B');
  ok('[2-e] 주홍 목록이 기록과 같다 (래칫 — 942 가 잡을 자리)',
    brk.length === BRK.length && brk.every(f => BRK.includes(f)),
    `${brk.length}개`);
  const S = by('S');
  /* 줄어드는 쪽은 늘어나는 쪽보다 조용해서 위험하다 — 942 가 갈아 끼운 자를 이름으로 들고 있는다. */
  ok('[2-h] 주홍이 «비어서» 줄어든 것이 아니다 — 942 가 갈아 끼운 자가 이름으로 있고 이제 면역이다',
    FIXED942.length > 0 && FIXED942.every(f => !BRK.includes(f) && S.includes(f)),
    FIXED942.join(' '));
  const bad = S.filter(f => !FRAC_DEEP.test(fs.readFileSync(path.join(TOOLS, f), 'utf8')));
  ok('[2-g] 면역으로 적은 자는 **소스에 실제로** 부분 화소 코드를 든다 (선별기 신호가 아니라 이 자가 직접 본다)',
    S.length > 0 && bad.length === 0, bad.length ? bad.join(' ') : `${S.length}개`);
  /* 헛초록 방지 — 후보가 0 이면 [2-b]~[2-d] 는 «셀 것이 없어서» 초록이다. */
  ok('[2-f] 후보가 실제로 여럿이다 (헛초록 아님)',
    rows.filter(r => r.cand).length >= 15, `${rows.filter(r => r.cand).length}개`);
}

/* ── [3] 물리 ─────────────────────────────────────────────────────────── */
console.log('\n[3] 물리 — 세 자를 같은 참값에 돌린다 (합성 · 위상 6개 평균)');
{
  const ph = P.physics();
  const at = W => ph.find(p => Math.abs(p.W - W) < 1e-6);
  const thin = ph.filter(p => p.W <= 3.0);      /* ref 에서 1.5 ref px 이하 = «얇은 축» */

  ok('[3-a] ③ 정수 걸음은 얇은 축에서 **ref 를 30% 넘게 얇게** 읽는다',
    thin.every(p => p.intBias <= -30), thin.map(p => `W${p.W}:${p.intBias.toFixed(1)}%`).join(' '));
  ok('[3-b] ⓑ 질량 적분은 같은 자리에서 **±2% 안**이다 — 결함이 «해상도» 가 아니라 «걸음» 임을 못박는다',
    thin.every(p => Math.abs(p.massBias) <= 2), thin.map(p => `W${p.W}:${p.massBias.toFixed(1)}%`).join(' '));
  ok('[3-c] ⓑ 는 굵은 축에서도 ±2% 안 (한 자로 전 구간을 덮는다)',
    ph.every(p => Math.abs(p.massBias) <= 2), ph.map(p => p.massBias.toFixed(1)).join('/'));
  /* ⚑ 이 항이 이 회차의 두 번째 결과다 — 895 가 고른 처방 ⓐ 에도 바닥이 있다. */
  ok('[3-d] ⚑ ⓐ 교차점 보간은 **W=2 에서 무너진다**(−50% 넘게) — 얇은 축의 1순위는 ⓐ 가 아니라 ⓑ 다',
    at(2).fracBias <= -50, `${at(2).fracBias.toFixed(1)}%`);
  ok('[3-e] ⓐ 는 W≥3.7(=895 가 실제로 재는 굵기)부터 ±3% 안 — 895 의 수리 자체는 유효하다',
    ph.filter(p => p.W >= 3.7).every(p => Math.abs(p.fracBias) <= 3),
    ph.filter(p => p.W >= 3.7).map(p => p.fracBias.toFixed(1)).join('/'));
}

/* ── [4] 선례 ─────────────────────────────────────────────────────────── */
console.log('\n[4] 선례 — 두 처방이 말이 아니라 코드로 있다');
{
  const s895 = fs.readFileSync(path.join(TOOLS, 'scan895.py'), 'utf8');
  ok('[4-a] ⓐ 교차점 보간 — `scan895.py` `stroke_thk()` 가 `_bilin` 으로 문턱을 지난다',
    /def stroke_thk\(/.test(s895) && /_bilin\(/.test(s895) && /STEP\s*=\s*0\./.test(s895));
  const s667 = fs.readFileSync(path.join(TOOLS, 'scan667c.py'), 'utf8');
  ok('[4-b] ⓑ 질량 적분 — `scan667c.py` `dark_mass()` 가 Σ(1 − L/L고원) 을 적분한다',
    /def dark_mass\(/.test(s667) && /1 - prof\[j\] \/ lo/.test(s667));
  ok('[4-c] ⓑ 는 소수 모서리까지 낸다 (±0.5 — 두께와 모서리가 항등식으로 묶인다)',
    /a=s - 0\.5 - ml/.test(s667) && /b=e \+ 0\.5 \+ mr/.test(s667));
}

/* ── [5][6] 수리 — `scan667b.py` (2회차 prot · 3회차 ptop·dtop·두께) ───── */
console.log('\n[5] 수리 — `scan667b.py` 의 리본 좌단이 부분 화소로 읽히는가 (ref 는 저장소 안에 있다)');
{
  const { py } = require('./pydep937');
  const run = (extra) => String(py(['tools/scan667b.py', ...extra], {
    cwd: path.resolve(TOOLS, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }));
  /* ref 쪽만 본다 — 우리 크롭은 캡처가 있어야 하고 이 자는 화소를 안 찍는 자다. */
  const nums = (out, re) => (out.match(re) || []).map((m) => parseFloat(m.replace(/[^-+0-9.]/g, '')));
  const prot = (o) => nums(o, /좌단돌출\(바깥선\) \*\*([-+0-9.]+)\*\*/g);
  const ptop = (o) => nums(o, /띠상변 위로 \*\*([-+0-9.]+)\*\*/g);
  const dtop = (o) => nums(o, /잉크상변 − 띠하변 \*\*([-+0-9.]+)\*\*/g);
  const thk = (o) => nums(o, /두께 \*\*([0-9.]+)\*\*/g);
  const frac = (a) => a.filter((v) => Math.abs(v - Math.round(v)) > 1e-6).length;
  let oldOut, newOut;
  try {
    oldOut = run(['--ref-only', '--int']);
    newOut = run(['--ref-only']);
  } catch (e) {
    if (e && e.status === 2) { console.log('  SKIP [5][6] 파이썬 의존 없음 — pip3 install pillow numpy'); }
    else throw e;
  }
  if (oldOut && newOut) {
    const o = prot(oldOut), n = prot(newOut);
    ok('[5-a] 자가 ref 리본 넷을 다 읽는다', o.length === 4 && n.length === 4, `${o.length} ↔ ${n.length}`);
    ok('[5-b] ⚑ **옛 정수 자는 넷 다 정확히 +0.00** — 참값이 1~2 ref px 인 축이 격자에 통째로 잠겼다는 지문',
      o.length === 4 && o.every((v) => v === 0), o.join(' '));
    ok('[5-c] 부분 화소 자는 **정수가 아닌 값을 낸다**(적어도 둘) — 이제 이 축이 표현된다',
      frac(n) >= 2, n.join(' '));
    /* ⚠ 3회차 이관 — 옛 [5-d]는 «그 밖의 축은 한 글자도 안 바뀌었다» 였다.
       3회차가 나머지 얇은 축 셋을 갈아 끼웠으므로 그 문장은 이제 거짓이다.
       333 처방대로 **자리를 비우지 않고 방향을 옮긴다**: «무르게 풀지 않았다» 의 증거는
       이제 «값이 안 움직였다» 가 아니라 **«창(문턱으로 잡은 정수 상자)이 안 움직였다»** 다.
       이것이 2회차 ⓗ 가 얻은 교훈의 기계적 표현이다 — 부분 화소는 문턱을 무르게 하는 일이 아니다. */
    const wins = (t) => t.split('\n').filter((l) => l.includes('창(정수)')).join('\n');
    ok('[5-d] ⚑ **창(문턱으로 잡은 정수 상자)은 두 모드에서 한 글자도 안 다르다** — 부분 화소가 «문턱을 무르게 하는 일» 이 아님을 못박는다',
      wins(oldOut).length > 0 && wins(oldOut) === wins(newOut), `${wins(newOut).split('\n').length}줄`);

    console.log('\n[6] 3회차 수리 — 남은 얇은 축 셋(ptop · dtop · 띠 두께)');
    const K = P.K;
    const isMulK = (v) => Math.abs(v * K / K - Math.round(v)) < 1e-6;   /* ref 눈금 = 정수 ref px */
    for (const [name, f, min] of [['ptop 금판 솟음', ptop, 3], ['dtop 잉크 솟음', dtop, 3], ['띠 두께', thk, 4]]) {
      const oo = f(oldOut), nn = f(newOut);
      ok(`[6-a] ⚑ 옛 자의 **${name}** 은 ref 값이 전부 정수 ref px 에 굳어 있다 (지문 — 환산은 K 배수)`,
        oo.length >= min && oo.every(isMulK), oo.join(' '));
      ok(`[6-b] 부분 화소 자의 **${name}** 은 정수가 아니다 (넷 중 ${min} 이상)`,
        frac(nn) >= min, nn.join(' '));
      /* ⚑ 무르게 푼 것이 아니라 **같은 것을 더 곱게** 잰 것 — 옛 값에서 ±1 눈금 안이다. */
      ok(`[6-c] **${name}** 이 옛 값에서 ±1.0 px 안이다 — 정의가 안 바뀌었다(2회차가 겪은 +10~13% 가 아니다)`,
        nn.length === oo.length && nn.every((v, i) => Math.abs(v - oo[i]) <= 1.0),
        nn.map((v, i) => (v - oo[i]).toFixed(2)).join(' '));
    }
    /* 남긴 축은 «못 고친 것» 이 아니라 «고치면 안 되는 것» — 그 판정을 자가 들고 있는다. */
    const wid = nums(newOut, /폭 ([0-9.]+)/g);
    ok('[6-d] ⚑ 판·잉크 **폭은 정수 그대로다** — 얇은 축이 아니고(33~47 px) 바깥이 밝은 금 테라 두 색 경계가 아니다 (3회차 판정)',
      wid.length >= 8 && wid.every((v) => Number.isInteger(v)), wid.join(' '));
    ok('[6-e] 이 번호가 실제로 갈아 끼운 자가 있다 (래칫이 «비어서» 줄어든 것이 아니다)',
      FIXED.length > 0 && FIXED.every((f) => !RED.includes(f)), FIXED.join(' '));
  }
}

/* ── [7] 4회차 수리 — `probe866.py` (알약 바깥·속 여덟 모서리) ──────────────
   ⚠ ref 절만 돌린다(`--cap` 없이) — 우리 쪽은 캡처가 있어야 하고, 캡처는 커밋 금지 자산이다.
   같은 규약을 §5 가 `--ref-only` 로 이미 쓰고 있다. */
console.log('\n[7] 4회차 수리 — `probe866.py` 알약 «테» (바깥 − 속) 가 격자에서 풀렸는가');
{
  const { py } = require('./pydep937');
  let oldOut, newOut;
  try {
    oldOut = String(py(['tools/probe866.py', '--int'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    newOut = String(py(['tools/probe866.py'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    if (e && e.status === 2) console.log('  SKIP [7] 파이썬 의존 없음 — pip3 install pillow numpy');
    else throw e;
  }
  if (oldOut && newOut) {
    /* «속 AxB» 와 «바깥 AxB» 네 수 + 테 두 수를 문자열이 아니라 **수**로 뽑는다. */
    const four = (o) => {
      const a = o.match(/평평한 #191614 칠\) ([0-9.]+)x([0-9.]+) ref px/);
      const b = o.match(/검정 테두리 바깥 x\d+\.\.\d+ · y\d+\.\.\d+ = ([0-9.]+)x([0-9.]+) ref px/);
      return a && b ? [+a[1], +a[2], +b[1], +b[2]] : [];
    };
    const ring = (o) => {
      const m = o.match(/테\(속→바깥\) 가로 ([0-9.]+) · 세로 ([0-9.]+) ref px/);
      return m ? [+m[1], +m[2]] : [];
    };
    const oo = four(oldOut), nn = four(newOut);
    const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
    ok('[7-a] ⚑ 옛 자의 알약 네 치수는 **전부 정수 ref px** — ×K(2.2222) 되기 전에 이미 격자에 굳어 있었다 (지문)',
      oo.length === 4 && oo.every(isInt), oo.join(' '));
    ok('[7-b] 부분 화소 자는 넷 다 정수가 아니다 — 이제 이 축들이 표현된다',
      nn.length === 4 && nn.every((v) => !isInt(v)), nn.join(' '));
    ok('[7-c] 넷 다 옛 값에서 ±1.0 ref px 안이다 — 정의가 안 바뀌었다(걸음만 곱아졌다)',
      nn.length === 4 && nn.every((v, i) => Math.abs(v - oo[i]) <= 1.0),
      nn.map((v, i) => (v - oo[i]).toFixed(2)).join(' '));
    /* ⚑ 되돌림 — `--int` 가 **옛 값을 한 글자도 안 틀리고** 되살린다. 이 항이 없으면
       «새 자가 옛 자와 다르다» 만 남고 «옛 자를 그대로 재현할 수 있다» 가 사라진다. */
    ok('[7-d] ⚑ `--int` 는 904 가 못박은 옛 값(117×24 · 113×20)을 그대로 되살린다 — 되돌림이 가능하다',
      oo.length === 4 && oo[0] === 113 && oo[1] === 20 && oo[2] === 117 && oo[3] === 24, oo.join(' '));
    const ro = ring(oldOut), rn = ring(newOut);
    ok('[7-e] ⚑ 옛 자의 «테» 는 가로·세로가 **둘 다 정확히 2** — 904 의 «등방 2» 는 이 격자 위에서 나온 값이다',
      ro.length === 2 && ro[0] === 2 && ro[1] === 2, ro.join(' / '));
    /* ⚠⚠ 이 회차가 `verify866` 의 과녁을 **안 옮긴 이유**를 자가 들고 있는다.
       부분 화소 자는 테를 가로 2.31 · 세로 2.65 로 가르는데, 그 «세로» 는
       `measure_pill` 이 세로를 재는 열 `vx = l + 10` 이 알약의 **둥근 캡**을 가로지르기 때문이다
       (평평한 가운데 열에서는 2.14~2.28 로 가로와 같다 — 4회차 열 스윕 실측).
       ⇒ 904 의 «등방» 판정은 **살아 있고**, 과녁을 이 값으로 옮기면 캡 인공물을 제품에 굽게 된다.
       창을 옮기는 것은 «재는 것을 바꾸는» 일이라 별도 번호(945)로 등재했다. */
    ok('[7-f] ⚑ 부분 화소 테는 «세로 > 가로» 로 갈린다 — 다음 자리(945)가 여기서 시작한다',
      rn.length === 2 && rn[1] > rn[0] && rn[1] - rn[0] > 0.2, rn.join(' / '));
    let sweep = '';
    ok('[7-g] ★ 그 갈림이 **창의 인공물**임을 자가 스스로 보인다 — 세로를 재는 열이 둥근 캡 위다 (평평한 열에서는 가로와 같다)',
      (() => {
        /* 같은 ref 를 열마다 다시 재서 «캡 ↔ 가운데» 를 가른다 — 945 의 근거를 매 실행 다시 찍는다. */
        const s = String(py(['tools/probe866.py', '--ring-sweep'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
        const med = +(s.match(/가운데 중앙값 ([0-9.]+)/) || [])[1];
        const cap = +(s.match(/캡 최대 ([0-9.]+)/) || [])[1];
        sweep = `가운데 중앙값 ${med} ↔ 캡 ${cap} (가로 ${rn[0]})`;
        /* 캡은 가운데보다 한 눈금 넘게 두껍고, 가운데는 **가로 테와 같은 수**다 = 등방. */
        return Number.isFinite(med) && Number.isFinite(cap)
          && cap > med + 1.0 && Math.abs(med - rn[0]) <= 0.35;
      })(), sweep);
  }
}

/* ── [R] 되돌림 ───────────────────────────────────────────────────────── */
console.log('\n[R] 되돌림 — 정수로 되돌리면 895 의 지문이 되돌아온다');
{
  /* 895 2회차가 세운 지문: 정수로 세면 **ref 값이 K 의 배수로 굳는다**(÷K 가 정수). */
  const K = P.K;
  const isMulK = v => Math.abs(v / K - Math.round(v / K)) < 1e-6;
  const W = 3.73;                       /* 895 가 실제로 잰 ref 아랫줄 획(우리 px) */
  const refInt = P.intRuler(P.profile(W / K, 8.4 / K, 40)) * K;
  ok('[R1] 정수 걸음의 ref 값은 K 의 배수다 (÷K 가 정수 — 지문 그대로)',
    isMulK(refInt), `${refInt.toFixed(3)} ÷ K = ${(refInt / K).toFixed(3)}`);
  const refFrac = P.fracRuler(P.profile(W / K, 8.4 / K, 40)) * K;
  const refMass = P.massRuler(P.profile(W / K, 8.4 / K, 40)) * K;
  ok('[R2] 부분 화소 두 자의 ref 값은 K 의 배수가 **아니다**',
    !isMulK(refFrac) && !isMulK(refMass),
    `ⓐ ${refFrac.toFixed(3)} · ⓑ ${refMass.toFixed(3)}`);
  ok('[R3] 그 자리에서 ⓑ 는 참값을 되찾는다 (±2%)',
    Math.abs(refMass - W) / W <= 0.02, `${refMass.toFixed(3)} ↔ 참값 ${W}`);
  /* 장부가 «비어서» 초록인 것이 아님 — 빨강이 실제로 하나 서 있다. */
  ok('[R4] 빨강이 0 이 아니다 — 전수가 «찾은 것이 없어서» 닫힌 것이 아니다', RED.length > 0, RED.join(' '));
}

console.log(`\nVERIFY932 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
