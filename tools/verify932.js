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
let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* 이 회차가 읽어 판정한 두 목록 — 래칫이다. 늘면 이 자가 먼저 짖는다.
   R = 축척 비대칭(②ⓐ · 895 와 같은 얼굴) · B = 번짐 비대칭(②ⓑ · 1:1 · 942 로 등재) */
const RED = ['probe866.py', 'scan667b.py', 'scan885b.py', 'scan885e.py', 'scan887.py'];
const BRK = ['probe352.py', 'probe384.py', 'probe409.py', 'probe409c.py', 'probe409f.py',
  'probe409g.py', 'probe409i.py', 'probe449.py', 'scan335.py', 'scanA4.py', 'scanA4b.py'];

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
