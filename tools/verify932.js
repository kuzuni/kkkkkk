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
/* ⚑ 5회차 — `scan885b.py` 가 R 에서 빠졌다(글리프 덩이의 모서리가 전부 부분 화소다 · §8). */
/* ⚑ 6회차 — `scan885e.py` 가 R 에서 빠졌다(거리장을 1/4 px 격자에서 깐다 · §9). */
/* ⚑ 7회차 — `scan887.py` 가 R 에서 빠졌다(네 끝점 교차 보간 + 금테 띠 덮개 적분 · §10).
   **이로써 R 은 0 이다** — 래칫이 «비어서» 초록인 것이 아님은 [R4] 가 FIXED 다섯으로 못박는다. */
const RED = [];
const FIXED = ['scan667b.py', 'probe866.py', 'scan885b.py', 'scan885e.py', 'scan887.py'];  /* 이 번호가 실제로 갈아 끼운 자 — [6-e] 가 «비어서 초록» 을 막는다 */
const RED0 = ['scan667b.py', 'probe866.py', 'scan885b.py', 'scan885e.py', 'scan887.py'];   /* 1회차 전수가 세운 **원래 R 다섯** — 줄어든 것을 여기 다시 적어야 지나간다 */
/* ⚑ 942 1회차 — `probe409g.py` 가 B 에서 빠졌다(`--diag` 를 «이웃 두 층에 비례로 나누는» 자로 갈아 끼웠다 ·
   자는 `tools/verify942.js`). 주홍 래칫도 «줄어든 것을 여기 다시 적어야» 지나간다 — 그 자리가 이 줄이다. */
/* ⚑ 942 2회차 — `probe409c.py` 가 B 에서 빠졌다(열별 «검정 화소 수» 를 **K 층 두께의 합** 으로 ·
   `probe409g.runs_from` 을 부른다 — 사본 0). 자는 `tools/verify942.js` §7. */
/* ⚛ 942 3회차 — `probe409i.py` 가 B 에서 빠졌다(층 두께를 승자독식 런에서 «층 질량 분배» 로 ·
   그 자가 처방으로 들고 있던 `cov_ray` 자신이 «사이 색 S» 로 새던 것까지 같이 닫았다).
   자는 `tools/verify942.js` §8. */
/* ⚛ 942 4회차 — `probe409f.py` 가 B 에서 빠졌다(기둥 윗끝을 정수 while 걷기에서
   문턱 교차 보간으로 · 옛 자가 두 판을 한 화소 갈라 놓던 자리). 자는 `tools/verify942.js` §9. */
/* ⚛ 942 5회차 — `probe409.py` 가 B 에서 빠졌다(각도별 «법선 검정 두께» 를 승자독식 런에서
   **층 질량 분배**로 · `probe409g.runs_from` 을 부른다 — 사본 0). 옛 자는 번진 판에서만
   **정확히 0.50px** 를 잃었고(판정값 2~7px 이라 −7~−25%) 새 자는 ±0.06px 다.
   자는 `tools/verify942.js` §10. */
const FIXED942 = ['probe409g.py', 'probe409c.py', 'probe409i.py', 'probe409f.py', 'probe409.py'];
/* ⚛ 958 1회차 — `probe384.py` 가 B 에서 빠졌다(코너 행의 «검정 화소 개수»·«F 런 시작 번호» 를
   **두 모서리의 문턱 교차 보간**으로 · 932 처방 ⓐ). ⚑ 942 가 다섯 자에 쓴 팔레트 길
   (`probe409g.runs_from`)은 **여기 못 쓴다** — 이 자의 걸음이 1px 이라 그 자의 경사면 접기가
   원리적으로 한 번도 안 돈다(표본 1개짜리 런은 t 훑음이 언제나 0). 자는 `tools/verify958.js`.
   ⇒ 942 와 958 은 **다른 처방**이므로 이름을 한 목록에 섞지 않고 따로 든다. */
/* ⚛ 958 2회차 — `probe352.py` 가 B 에서 빠졌다(세 축 전부 — 테두리 두께 · 구분선 h ·
   알약 코너 인셋 — 을 «문턱 이하 화소의 개수» 에서 **두 모서리의 차**로 · 932 처방 ⓐ).
   ⚑ 이 자가 «검정 문턱을 둘»(느슨 ≤24 ↔ 순검정 ≤4) 들고 있던 것 자체가 증상이었다 —
   부분 화소로 세면 8 ↔ 7 이 **한 값(8.38)으로 모이고**, 그 값이 CSS 항등식
   (테두리 7 + 안쪽 립 `--sl` 1.5 = 8.5)과 맞는다. 자는 `tools/verify958.js` §[9]. */
/* ⚛ 958 3회차 — `probe449.py` 가 B 에서 빠졌다. **축이 둘이고 걸음이 달라 처방도 둘**이었다:
   코너 광선(0.5px)은 942 의 팔레트 길(`probe409g.runs_from` · 팔레트를 넘겨서),
   알약 윤곽·세로 모서리(1px)는 932 처방 ⓐ(문턱 교차 보간). 자는 `tools/verify958.js` §[10]. */
/* ⚛ 958 4회차 — `scan335.py` 가 B 에서 빠졌다(색 밴드 두께를 «화소 개수» 에서 **두 모서리의
   차**로 · 932 처방 ⓐ · 걸음 1px). 합성 재현이 크기를 못박는다 — 번진 판 부호 편향
   **−1.417 → −0.020px**(참값 7px 테두리에서 −20% → −0.3%). ⚑ ref 실측이 **437 을 독립으로
   재확인한다**: 옛 정수 자가 6·6·5·5·5 로 읽던 다섯 밴드가 새 자에서 전부 **CSS 선언 7**
   (437 셸 테두리 7 · 352 «네 면 7px 림»)에 앉는다. 자는 `tools/verify958.js` §[11]. */
/* ⚛ 958 5회차 — `scanA4.py` 가 B 에서 빠졌다(링 «어두운 띠» 두께를 «문턱 아래 표본의 런»
   에서 **두 모서리의 차**로 · 932 처방 ⓐ · 걸음 0.5px). 번진 판 부호 편향 **+1.333 → −0.033px**.
   ⚑ 여기서 처방이 한 겹 깊어졌다 — 두께 문턱은 **스윕값이 아니라 이웃 두 고원의 한복판**이고
   (스윕값을 쓰면 칼같은 판까지 +0.214 밀린다), 그 한복판 교차는 선별 경계 쌍의 **안쪽**에
   있을 수 있다(4회차 `scan335` 는 바깥이었다 — 방향까지 갈렸다). 자는 `tools/verify958.js` §[12]. */
const FIXED958 = ['probe384.py', 'probe352.py', 'probe449.py', 'scan335.py', 'scanA4.py'];
const BRK = ['scanA4b.py'];

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
  /* 958 도 같은 자리를 같은 규칙으로 지킨다 — 처방이 달라서 목록만 갈랐다(위 주석). */
  ok('[2-i] 958 이 갈아 끼운 다섯도 이름으로 있고 이제 면역이다 (주홍 6 → 5 → 4 → 3 → 2 → **1**)',
    FIXED958.length > 0 && FIXED958.every(f => !BRK.includes(f) && S.includes(f)),
    FIXED958.join(' '));
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
  /* ⚑⚑ 8회차 — ② 짝인 관측(«배지 윗줄 검정 획 자 갈림»)을 닫은 자다.
     [4-a]·[4-b] 는 두 처방이 **코드로** 있다는 것만 지켰는데, 갈림을 실제로 가른 것은
     «둘을 **같은 광선** 위에 얹은 자» 다. 그 성질이 이 자의 전부이므로 여기서 못박는다 —
     창을 따로 잡는 자로 바뀌면 두 값의 차가 «추정기 차이» 가 아니게 되고 판정이 무효가 된다.
     ⚠ 화소 판정은 여기가 아니라 `verify895` §B'(캡처를 찍는 자) 몫이다 — 이 자는 소스만 본다. */
  const s932 = fs.readFileSync(path.join(TOOLS, 'scan932.py'), 'utf8');
  ok('[4-d] 셋째 자 `scan932.py` 가 ⓐ·ⓑ 를 **한 광선**에서 낸다 (같은 `ray()` 표본을 `cross_on`·`mass_on` 둘이 먹는다)',
    /def ray\(/.test(s932) && /def cross_on\(/.test(s932) && /def mass_on\(/.test(s932)
    && /ts, ps = ray\(/.test(s932) && /cross_on\(ts, ps\)/.test(s932) && /mass_on\(ts, ps\)/.test(s932));
  ok('[4-e] 그 자의 ⓑ 는 안쪽·바깥 고원을 **각각** 잡는다 (노랑 255 ↔ 분홍 244 — 하나로 뭉개면 895 2회차 ⓗ 의 함정에 빠진다)',
    /lo = max\(ps\[:i_in\]\)/.test(s932) && /hi = max\(ps\[i_out:/.test(s932)
    && /ps\[j\] \/ lo/.test(s932) && /ps\[j\] \/ hi/.test(s932));
  ok('[4-f] 판정은 `verify895` §B\' 가 화소로 내린다 — 이 자가 그 자리를 가리키고 있다 (판정이 저장소에서 사라지면 여기가 짖는다)',
    /\[B4\]/.test(fs.readFileSync(path.join(TOOLS, 'verify895.js'), 'utf8'))
    && /scan932\.py/.test(fs.readFileSync(path.join(TOOLS, 'verify895.js'), 'utf8')));
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
       부분 화소 자는 테를 가로 2.31 · 세로 2.65 로 갈랐는데, 그 «세로» 는
       `measure_pill` 이 세로를 재던 열 `vx = l + 10` 이 알약의 **둥근 캡**을 가로지르기 때문이었다
       (평평한 가운데 열에서는 2.14~2.28 로 가로와 같다 — 4회차 열 스윕 실측).
       ⇒ 904 의 «등방» 판정은 **살아 있고**, 과녁을 그 값으로 옮겼으면 캡 인공물을 제품에 구웠을 것이다.
       ⚑⚑ **945 가 창을 옮겨 그 갈림을 닫았다**(`v_band` = 바깥 폭 18~82% 열들의 중앙값).
       이 항은 **방향을 뒤집어** 남긴다 — 333 처방: 자리를 비우지 말고 지금 참인 것을 묻는다.
       «세로 > 가로» 로 되돌아가면(= 누가 창을 캡으로 되돌리면) 여기가 다시 빨개진다. */
    ok('[7-f] ★ 945 가 창을 옮겨 갈림이 닫혔다 — 부분 화소 테가 세로 ≈ 가로 (창이 캡으로 되돌아가면 빨강)',
      rn.length === 2 && Math.abs(rn[1] - rn[0]) <= 0.2, rn.join(' / '));
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

/* ── [8] 5회차 수리 — `scan885b.py` 글리프 «틈» ─────────────────────────────
   ref 절만 돌린다(`--ref-only`) — 우리 쪽은 캡처가 있어야 하고 캡처는 커밋 금지 자산이다.
   같은 규약을 §5(`scan667b`)·§7(`probe866`)이 이미 쓰고 있다. */
console.log('\n[8] 5회차 수리 — `scan885b.py` 윗줄 글리프 «틈» 이 격자에서 풀렸는가');
{
  const { py } = require('./pydep937');
  const run = (extra) => String(py(['tools/scan885b.py', '--glyph', '--ref-only', ...extra],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  let oldOut, newOut;
  try { oldOut = run(['--int']); newOut = run([]); } catch (e) {
    if (e && e.status === 2) console.log('  SKIP [8] 파이썬 의존 없음 — pip3 install pillow numpy');
    else throw e;
  }
  if (oldOut && newOut) {
    const K = P.K;
    /* 문턱 90 줄(885 3회차가 결론을 낸 그 단)의 «틈 합 (a b c d)» 을 낱개로 뽑는다. */
    const gaps = (o) => {
      const seg = o.split('문턱 90')[1] || '';
      const m = (seg.split('문턱 110')[0] || '').match(/틈 합 \*\*[0-9.]+\*\* \(([^)]+)\)/);
      return m ? m[1].trim().split(/\s+/).map(Number) : [];
    };
    const glyphs = (o) => {
      const seg = o.split('문턱 90')[1] || '';
      const m = (seg.split('문턱 110')[0] || '').match(/글리프 폭 합 \*\*[0-9.]+\*\* \(([^)]+)\)/);
      return m ? m[1].trim().split(/\s+/).map(Number) : [];
    };
    const total = (o) => {
      const seg = o.split('문턱 90')[1] || '';
      const m = (seg.split('문턱 110')[0] || '').match(/총 bbox ([0-9.]+)/);
      return m ? +m[1] : NaN;
    };
    /* 출력이 소수 두 자리(0.005 우리 px = 0.0024 ref px)라 ÷K 반올림 여유는 0.005 면 넉넉하다. */
    const isMulK = (v) => Math.abs(v / K - Math.round(v / K)) < 5e-3;
    const og = gaps(oldOut), ng = gaps(newOut);
    ok('[8-a] ⚑ 옛 자의 ref «틈» 넷은 **전부 K 의 배수** — 참값 2~5 ref px 인 축이 격자에 통째로 잠겨 있었다 (지문)',
      og.length === 4 && og.every(isMulK), og.join(' ') + ` (÷K ${og.map((v) => (v / K).toFixed(2)).join(' ')})`);
    ok('[8-b] 부분 화소 자의 «틈» 은 K 의 배수가 아니다 (넷 중 3 이상) — 이제 이 축이 표현된다',
      ng.length === 4 && ng.filter((v) => !isMulK(v)).length >= 3,
      ng.join(' ') + ` (÷K ${ng.map((v) => (v / K).toFixed(2)).join(' ')})`);
    ok('[8-c] «틈» 넷이 옛 값에서 ±1.0 **ref px** 안이다 — 정의가 안 바뀌었다(걸음만 곱아졌다)',
      ng.length === og.length && ng.every((v, i) => Math.abs(v - og[i]) / K <= 1.0),
      ng.map((v, i) => ((v - og[i]) / K).toFixed(2)).join(' '));
    /* ⚑ 장부(`probe932` fix 칸)가 요구한 항등식 — 모서리 좌표로 적으므로 **정의상** 닫힌다.
       이 항이 없으면 «글리프를 줄여 틈을 늘리는» 무른 수리가 통과한다. */
    const closes = (o) => {
      const g = glyphs(o), p = gaps(o), t = total(o);
      return g.length === 5 && p.length === 4 && Number.isFinite(t)
        && Math.abs(g.reduce((a, b) => a + b, 0) + p.reduce((a, b) => a + b, 0) - t) <= 0.15;
    };
    ok('[8-d] ★ «글리프 폭 합 + 틈 합 = 총 bbox» 가 두 걸음에서 다 닫힌다 (장부가 요구한 항등식)',
      closes(oldOut) && closes(newOut),
      `옛 ${total(oldOut).toFixed(1)} · 새 ${total(newOut).toFixed(1)}`);
    /* ⚑ 무르게 풀지 않았다는 증거 — §5-d 와 같은 꼴이다. 문턱을 한 칸도 안 흔들었으므로
       «덩이(창)» 는 두 걸음에서 한 글자도 안 다르다. 부분 화소는 그 창의 모서리를 미는 데만 쓴다. */
    const wins = (t) => t.split('\n').filter((l) => l.includes('창(정수)')).join('\n');
    ok('[8-e] ⚑ **덩이(창)는 두 걸음에서 한 글자도 안 다르다** — 부분 화소가 «문턱을 무르게 하는 일» 이 아님을 못박는다',
      wins(oldOut).length > 0 && wins(oldOut) === wins(newOut), `${wins(newOut).split('\n').length}줄`);
    /* 되돌림 — `--int` 가 885 3회차가 근거로 쓴 옛 수(틈 6.2 ×4 · 글리프 합 130.0)를 그대로 되살린다. */
    ok('[8-f] ⚑ `--int` 는 885 3회차가 근거로 쓴 옛 수(틈 6.2 ×4 · 글리프 합 130.0)를 그대로 되살린다 — 되돌림이 가능하다',
      og.length === 4 && og.every((v) => Math.abs(v - 3 * K) < 0.02)
      && Math.abs(glyphs(oldOut).reduce((a, b) => a + b, 0) - 63 * K) < 0.05,
      og.join(' '));
  }
}

/* ── [9] 6회차 수리 — `scan885e.py` 거리장 두께 ────────────────────────────
   ref 절만 본다(`--cap` 에 ref 를 주면 «★ 창 자동 탐색 실패» 로 코드 3 이니, ref 표는
   `--cap` 없이 못 낸다 — 그래서 이 자는 **캡처가 있을 때만** 값을 재고 없으면 SKIP 한다.
   ⚠ scipy 는 상시 의존이 아니다(938) — 없으면 코드 2 로 SKIP. */
console.log('\n[9] 6회차 수리 — `scan885e.py` 거리장 두께가 정수 격자에서 풀렸는가');
{
  const { py, available } = require('./pydep937');
  const CAP = process.env.SCAN885E_CAP || 'scratch/151-r932.png';
  const run = (extra) => String(py(['tools/scan885e.py', '--cap', CAP, ...extra],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  let oldOut, newOut;
  /* ⚠⚠ **`py()` 는 코드 2·3 을 만나면 부모를 그대로 내린다**(`process.exit` — 자기 완결적인 스캔 자에게는
     그것이 옳다). 그래서 «없어도 되는 것» 은 부르기 **전에** 물어야 이 절만 SKIP 된다:
       ⓐ 캡처는 **커밋 금지 자산**이라 갓 클론한 트리에는 없는 것이 정상이다(있으면 재고 없으면 건너뛴다).
       ⓑ scipy 는 **상시 의존이 아니다**(938 — `scan885e` 하나만 쓴다). `available()` 은 안 죽이고 묻는다.
     ⚠ python3 를 직접 spawn 하면 `verify937` [D1] 이 빨개진다 — 반드시 `py()`/`available()` 을 거친다. */
  const capOk = fs.existsSync(path.join(ROOT, CAP));
  const sciOk = available('scipy');
  if (!capOk) console.log(`  SKIP [9] 캡처가 없다(${CAP}) — node tools/cap151.js ${CAP} --geo 로 찍고 다시 돌려라`);
  else if (!sciOk) console.log('  SKIP [9] scipy 없음 — pip3 install scipy (938 — 상시 의존이 아니다)');
  else { oldOut = run(['--int']); newOut = run([]); }
  if (oldOut && newOut) {
    /* ref 절 16단의 «T(2·중앙값)» 을 뽑는다 — 표의 첫 블록이 ref 다. */
    const refTable = (o) => (o.split('== cap')[0] || '');
    const med = (o) => [...refTable(o).matchAll(/^\s+\d+\s+\d+ \|\s+([0-9.]+)\s+([0-9.]+)/gm)].map((m) => +m[1]);
    const oo = med(oldOut), nn = med(newOut);
    const uniq = (a) => [...new Set(a.map((v) => v.toFixed(2)))];
    /* ⚑ 지문 — 정수 EDT 는 거리를 «정수 격자의 √합» 에만 떨어뜨린다. 2·중앙값이라 √2·√5 꼴이 그대로 보인다. */
    const isGrid = (v) => [2.83, 3.41, 3.85, 4.00, 2.00, 2.24, 4.47].some((g) => Math.abs(v - g) < 0.02);
    ok('[9-a] ⚑ 옛 자의 ref 두께 16단은 **격자값 몇 개에만** 앉는다 (2√2 · √(1+4) 꼴 — 정수 EDT 의 지문)',
      oo.length === 16 && uniq(oo).length <= 4 && oo.every(isGrid), uniq(oo).join(' '));
    ok('[9-b] 1/4 px 걸음은 그 격자를 벗어난다 (서로 다른 값이 여섯 단 이상)',
      nn.length === 16 && uniq(nn).length >= 6, uniq(nn).join(' '));
    /* 정의가 안 바뀌었다 — 같은 단끼리 ±0.6 ref px 안이고 **부호(우리가 얇다)는 그대로**다. */
    ok('[9-c] 같은 단끼리 옛 값에서 ±0.6 ref px 안이다 — 걸음만 곱아졌지 재는 것이 안 바뀌었다',
      nn.length === oo.length && nn.every((v, i) => Math.abs(v - oo[i]) <= 0.6),
      nn.map((v, i) => (v - oo[i]).toFixed(2)).slice(0, 8).join(' ') + ' …');
    /* ⚑ 되돌림 — `--int` 는 옛 자의 출력을 **한 글자도 안 틀리고** 되살린다(표 전체를 글자로 견준다). */
    ok('[9-d] ⚑ `--int` 가 낸 ref 표는 옛 걸음의 격자값 그대로다 — 되돌림이 가능하다',
      oo.length === 16 && oo.filter((v) => Math.abs(v - 2.83) < 0.005).length >= 10, oo.slice(0, 4).join(' '));
    /* ⚑⚑ 이 회차의 두 번째 결과 — 손 상수 과녁의 근거였던 «ref 가 안 움직인다» 가 격자였다. */
    const ratios = (o) => [...o.matchAll(/같은 단의 ref\s+([0-9.]+) \/ ([0-9.]+)/g)].map((m) => [+m[1], +m[2]]);
    let gOld, gNew;
    try {
      gOld = run(['--gate', '--int']); gNew = run(['--gate']);
    } catch (e) { if (e && e.status === 1) { gOld = String(e.stdout || ''); gNew = String(e.stdout || ''); } else throw e; }
    const ro = ratios(gOld), rn = ratios(gNew);
    ok('[9-e] ⚑ 옛 걸음의 ref «실루엣 ÷ 금색» 은 문턱 네 단에서 **안 움직인다**(손 상수 과녁 1.176/1.231 의 근거)',
      ro.length === 4 && ro.slice(0, 3).every(([w]) => Math.abs(w - 1.176) < 0.002),
      ro.map(([w, h]) => `${w}/${h}`).join(' '));
    ok('[9-f] ★ 1/4 px 걸음에서는 **단마다 움직인다** — 그 부동이 곧 격자였다 (그래서 과녁을 «같은 단의 ref» 로 옮겼다)',
      rn.length === 4 && rn[3][0] - rn[0][0] > 0.05 && rn[3][1] - rn[0][1] > 0.05,
      rn.map(([w, h]) => `${w}/${h}`).join(' '));
    ok('[9-g] 그래도 제품은 두 판정에서 다 통과한다 (자를 갈아 과녁을 무르게 하거나 조인 것이 아니다)',
      /SCAN885E PASS/.test(gOld) && /SCAN885E PASS/.test(gNew),
      `옛 ${/PASS/.test(gOld) ? 'PASS' : 'FAIL'} · 새 ${/PASS/.test(gNew) ? 'PASS' : 'FAIL'}`);
  }
}

/* ── [10] 7회차 수리 — `scan887.py` 네 끝점 + 금테 띠 ──────────────────────
   이 자는 캡처 다섯 장(`docs/shots/887-*.png`)이 있을 때만 우리 쪽 값을 잰다 —
   그 다섯은 `node tools/verify887.js` 가 찍는다(scan887 혼자서는 안 찍는다).
   레퍼런스 절은 캡처가 없어도 나오므로 ref 항만은 언제나 판정한다. */
console.log('\n[10] 7회차 수리 — `scan887.py` 가 정수 걸음에서 풀렸는가');
{
  const { py } = require('./pydep937');
  const SHOTS = [1600, 1841, 1920, 2280, 2600].map((h) => path.join('docs', 'shots', `887-${h}.png`));
  const have = SHOTS.filter((s) => fs.existsSync(path.join(ROOT, s)));
  const run = (extra) => {
    const o = String(py([path.join(__dirname, 'scan887.py'), '--json', ...have, ...extra],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
    return JSON.parse(o.slice(o.indexOf('{')));
  };
  const nw = run([]), old = run(['--int']);
  const R = nw.ref, C = nw.caps, k = R.k;
  const b = R.border;
  const gInt = b.gold_bot - b.gold_top + 1;
  const ourInt = C.length ? C[0].border.gold_bot - C[0].border.gold_top + 1 : null;

  ok('[10-a] 옛 걸음의 띠 두께는 두 정수다 (지문 — 장부가 «ref 2 ↔ 우리 5» 로 적어 둔 그 값)',
    gInt === 2 && (ourInt === null || ourInt === 5), `ref ${gInt} ↔ 우리 ${ourInt}`);

  /* 덮개 적분으로 재면 ref 띠는 2 가 아니다 — y681 이 금색 고원의 47% 인 부분 화소다. */
  const gRef = b.gold_th * k, gOur = C.length ? C[0].border.gold_th * C[0].k : null;
  const skewOld = ourInt === null ? null : (5 - gInt * k) / (gInt * k) * 100;
  const skewNew = gOur === null ? null : (gOur - gRef) / gRef * 100;
  ok('[10-b] 덮개 적분은 ref 띠를 **1.470 px** 로 읽는다 — 어긋남이 +12.5% 가 아니라 +53% 다',
    Math.abs(b.gold_th - 1.470) < 0.02
    && (skewNew === null || (skewNew > 45 && skewNew < 60 && skewOld < 20)),
    `ref ${b.gold_th.toFixed(3)}px = ${gRef.toFixed(2)}프 ↔ 우리 ${gOur === null ? '—' : gOur.toFixed(2)}프`
    + ` · 옛 ${skewOld === null ? '—' : skewOld.toFixed(1)}% → 새 ${skewNew === null ? '—' : skewNew.toFixed(1)}%`);

  /* ⚑ 네 끝점 중 둘은 **원래 격자 위**였다 — 이 절이 그 사실을 지문으로 박는다.
     («부분 화소로 갈면 어디든 움직인다» 는 거짓이고, 그래서 이 자의 결함은 잉크 두 끝이었다.) */
  const dtd = [R, ...C].map((r) => r.border.dark_top_f - r.border.dark_top);
  ok('[10-c] `dark_top`(B3)은 여섯 장 전부 Δ 0.000 — 아래 끝점은 원래 격자 위에 앉아 있었다',
    dtd.every((d) => Math.abs(d) < 5e-3), dtd.map((d) => d.toFixed(3)).join(' · '));

  /* ⚑ 953 — 이 물음은 **둘**이다: ref 쪽은 저장소 안 그림이라 언제나 재지고, 우리 쪽은
     캡처 다섯 장이 있어야 재진다. 한 항에 묶여 있던 탓에 **캡처가 없는 클론**(= 커밋 금지
     자산이라 없는 것이 정상)에서 «우리 값 없음» 이 빨강으로 나왔다(출력 오른쪽이 빈 채).
     짝인 [10-e] 는 같은 조건을 이미 SKIP 으로 내고 있었다 — 그 규약을 여기에도 맞춘다.
     ⚠ 무르게 하는 것이 아니다: 캡처가 있으면 [10-d2] 는 그대로 판정하고, 잉크가 안 밀리면
     빨개진다(자는 `tools/verify953.js` §3·§4 가 그 예민함을 실측으로 못박는다). */
  const dIt = (r) => r.th['110'].sub.ink_top - r.th['110'].ink_top;
  ok('[10-d] 위 끝점의 ref 는 거의 격자 위였다 — ref `ink_top` 은 −0.07 뿐이다',
    Math.abs(dIt(R)) < 0.2, `ref ${dIt(R).toFixed(3)}`);
  if (C.length) {
    ok('[10-d2] 움직인 것은 잉크다 — 우리 `ink_top` 은 **한 행 통째**(−0.98)다',
      C.every((c) => Math.abs(dIt(c) + 0.981) < 0.05),
      `ref ${dIt(R).toFixed(3)} ↔ 우리 ${C.map((c) => dIt(c).toFixed(3)).join(' ')}`);
  } else {
    console.log('  SKIP [10-d2] 우리 `ink_top` 은 캡처가 있어야 잰다(지금 0장)'
      + ' — node tools/verify887.js 가 찍는다');
  }

  /* 1600 은 정수 자에서 «혼자 어긋난 칸»(0.714)이었다 — 부분 화소로는 ref 에 가장 가깝다. */
  const rat = (r, key) => (key === 'int' ? r.th['110'].ratio.B3 : r.th['110'].sub.ratio.B3);
  if (C.length === 5) {
    const refI = rat(R, 'int'), refF = rat(R, 'sub');
    const dI = C.map((c) => Math.abs(rat(c, 'int') - refI));
    const dF = C.map((c) => Math.abs(rat(c, 'sub') - refF));
    const worstInt = dI.indexOf(Math.max(...dI)), bestFrac = dF.indexOf(Math.min(...dF));
    ok('[10-e] ⚑ 1600 이 이상치에서 풀린다 — 정수 자로는 다섯 중 **최악**, 부분 화소로는 **최선**',
      worstInt === 0 && bestFrac === 0,
      `정수 ref ${refI.toFixed(3)} ↔ ${C.map((c) => rat(c, 'int').toFixed(3)).join(' ')}`
      + ` │ 부분화소 ref ${refF.toFixed(4)} ↔ ${C.map((c) => rat(c, 'sub').toFixed(4)).join(' ')}`);
  } else {
    console.log(`  SKIP [10-e] 캡처 다섯 장이 있어야 순위를 센다(지금 ${C.length}장) — node tools/verify887.js 가 찍는다`);
  }

  ok('[10-f] `--int` 되돌림 — 옛 정수 답이 한 자리도 안 틀리고 되살아난다',
    old.ref.th['110'].ratio.B3 === 0.75 && old.ref.th['110'].sub === null
    && old.caps.every((c) => c.th['110'].sub === null),
    `ref ${old.ref.th['110'].ratio.B3} · sub ${old.ref.th['110'].sub}`);

  /* 6회차 [9-g] 와 같은 규율 — 자를 갈아 과녁을 무르게 하거나 조인 것이 아니다. */
  const BAND = [0.67, 0.83], TGT_INT = 0.750;
  const inB = (v) => v >= BAND[0] && v <= BAND[1];
  /* ⚑ 953 곁다리 — 옛 조건 `C.length === 0 || (…)` 은 캡처가 없으면 **과녁 항까지** 통째로
     건너뛰어 초록이었다(ref 0.750 은 캡처 없이도 재진다 — 헛초록). 캡처 의존은 `C.every` 가
     빈 배열에서 참인 것으로 이미 갈리므로, 과녁 항을 밖으로 꺼내 **언제나** 판정한다. */
  ok('[10-g] 제품은 두 판정에서 다 통과한다 (과녁·대역은 한 자도 안 옮겼다 — 재수립은 별도 등재다)',
    Math.abs(rat(R, 'int') - TGT_INT) < 1e-6
    && C.every((c) => inB(rat(c, 'int'))) && C.every((c) => inB(rat(c, 'sub'))),
    `ref 과녁 ${rat(R, 'int').toFixed(3)} (${TGT_INT})`
    + ` · 정수 ${C.length ? C.map((c) => rat(c, 'int').toFixed(3)).join(' ') : '—(캡처 0장)'}`
    + ` · 부분화소 ${C.length ? C.map((c) => rat(c, 'sub').toFixed(4)).join(' ') : '—'}`
    + ` · 대역 ${BAND[0]}~${BAND[1]}`);
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
  /* ⚑ 7회차 이관(333 처방 — 자리를 비우지 않고 **방향을 뒤집었다**).
     6회차까지 이 항은 «빨강이 0 이 아니다» 로 «전수가 찾은 것이 없어서 닫힌 것이 아님» 을 지켰다.
     7회차에 마지막 하나(`scan887.py`)가 갈려 **R 이 진짜로 0** 이 됐으므로, 이제 지킬 것은
     «0 인 이유가 **다섯을 실제로 갈아 끼웠기 때문**이다» 다. 원래 다섯(`RED0`)이 전부 FIXED 에
     들어 있어야 하고, 하나라도 빠지면(= 조용히 지워 0 을 만들면) 여기가 빨개진다. */
  ok('[R4] R 이 0 인 것은 **원래 다섯을 전부 갈아 끼웠기 때문**이다 (찾은 것이 없어서가 아니다)',
    RED.length === 0 && RED0.length === 5 && RED0.every((f) => FIXED.includes(f)),
    `원래 R ${RED0.length}개 → 갈아 끼운 것 [${FIXED.join(' ')}] · 남은 빨강 ${RED.length}`);
}

console.log(`\nVERIFY932 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
