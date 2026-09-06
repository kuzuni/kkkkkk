/* 작업 970 — 알약 코너 반경: **과녁 재수립 + 제품 판단** 게이트.
 *
 *   node tools/verify970.js
 *
 * 968 이 «ref rx **32.7 ± 1.3** ↔ 제품 선언 **30**» 을 과녁으로 남기고 제품 이동을 970 으로 넘겼다.
 * 970 은 그 이동을 하기 전에 **과녁부터 다시 물었고, 과녁이 틀렸다**는 것이 이 회차의 본체다.
 *
 *   ⓐ **±1.3 은 오차막대가 아니라 «두 자를 섞은 짝» 이었다.**
 *      `probe352.radius()` 의 ref 원점만 «셸상변 2021 + 테두리 **6**» = 2027 이고
 *      cap 은 «1960 + **7**» = 1967 이었다 — 437 이 ref 테두리를 7 로 확정한 뒤에도 이 리터럴만
 *      안 따라왔다. 직접 단면이 못박는다(ref x420 y2021..2027 검정 **7행** · cap x420 y1960..1966 **7행**).
 *      ⇒ 원점을 **2028** 로 모으면 눈금이 30.6 → **29.6**, 968 의 모델 역산으로 rx **32.65 → 31.62**.
 *
 *   ⓑ **더 나은 자를 세웠다 — 원점에 «면역» 인 자.** 원점이 e 만큼 틀리면 인셋이 전부 `ins + e`
 *      로 같이 밀리므로, 같은 그림 안 **두 깊이의 차**를 쓰면 e 가 소거된다. 그 차는 여전히 rx 에
 *      1차라 `rx_ref/rx_cap` 이 그대로 나온다(원점·원 모델·좌표 규약 셋 다 안 쓴다).
 *      ⚑ **그 자가 참값을 아는 짝에서 검산된다** — 제품을 rx 34 로 한 번 그려 두 캡처를 견주면
 *        **34.23**(오차 +0.23)이 나온다. 자기 자신과 견주면 정확히 **1.000**.
 *      ⇒ ref **rx 31.28** (사분위 29.5~33.4). 968 모델 역산 31.62 와 **0.34 안에서 만난다.**
 *
 *   ⓒ **그래서 제품을 안 옮겼다(0줄) — 그것이 이 회차의 판단이다.**
 *      두 자가 모이는 31.3~31.6 은 선언 30 과 **1.3~1.6** 떨어져 있는데 ref 쪽 사분위 폭이
 *      **±1.9** 라 그 안에 30 이 들어 있고, 같은 양을 **눈으로** 잰 표본(352 비평가 5인 평균
 *      **30.2**)과도 어긋나지 않는다. LESSONS 352-⑤(«소수 쪽으로 값을 옮기지 마라 ·
 *      같은 양을 잰 표본 수로 판단하라»)가 못박은 자리가 정확히 여기다. 409 가 18회차에 세운
 *      코너 장치 넷을 오차막대 **안쪽** 1.4px 때문에 다시 세우지 않는다.
 *      ⚠ **되돌리는 법**: 옮기기로 하면 `.stab.on::after{border-radius:30px / 33px}` 와 함께
 *        마스크 기둥 `calc(100% - 30px)` · 어깨 원판 `23px 25.3px at 30px 33px` ·
 *        `.stab-c4::before{border-radius:30px}` **넷을 같이** 옮기고
 *        `verify352` RADIUS · `verify47` '30px' · `verify409` · `verify378` 을 이관한다.
 *
 * ⚠ 캡처(`docs/review/96-full-hero.png`)는 **커밋 금지 자산**이라 없는 클론이 정상이다 —
 *   그림이 없으면 소스 절만 돌고 실측 절은 SKIP 한다(942·958 계열과 같은 얼굴).
 *   그림은 `node tools/cap96.js` 가 만든다.
 */
const fs = require('fs');
const path = require('path');
const { py } = require('./pydep937');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');

let bad = 0, tot = 0, skip = 0;
const ok = (name, cond, got) => {
  tot++;
  if (cond) console.log('  PASS ' + name + (got === undefined ? '' : ' — ' + got));
  else { bad++; console.log('  FAIL ' + name + (got === undefined ? '' : ' — ' + got)); }
};
const sk = (name, why) => { skip++; console.log('  SKIP ' + name + ' — ' + why); };
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);

/* 968 의 모델 — **사본이 아니다**: 저 게이트는 이 값을 «자기 과녁» 으로 쓰고, 여기서는
   «원점을 고치면 그 과녁이 어디로 가는가» 를 묻는다. 식은 한 줄도 안 바꿨다. */
const insetAt = (rx, ry, off, d) => {
  const dd = d + off;
  return dd < ry ? rx * (1 - Math.sqrt(Math.max(0, 1 - ((ry - dd) / ry) ** 2))) : rx;
};
const arcIndex = (rx, ry, off, span = 25) => {
  const est = [];
  for (let d = 3; d <= span; d++) {
    const ins = insetAt(rx, ry, off, d);
    if (ins > 0) est.push((d + ins) + Math.sqrt(2 * d * ins));
  }
  est.sort((a, b) => a - b);
  return est[Math.floor(est.length / 2)];
};
const toRx = (index, off) => {
  let lo = 0.5, hi = 3.0;
  for (let i = 0; i < 90; i++) {
    const k = (lo + hi) / 2;
    if (arcIndex(30 * k, 33 * k, off) < index) lo = k; else hi = k;
  }
  return 30 * (lo + hi) / 2;
};

(async () => {
  const S352 = fs.readFileSync(path.join(TOOLS, 'probe352.py'), 'utf8');
  const S970 = fs.readFileSync(path.join(TOOLS, 'probe970.py'), 'utf8');
  const S958 = fs.readFileSync(path.join(TOOLS, 'verify958.js'), 'utf8');
  const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hasCap = fs.existsSync(path.join(ROOT, 'docs/review/96-full-hero.png'));

  /* ── [1] ⓐ 원점 규칙이 **하나**다 ─────────────────────────────────────── */
  console.log('\n[1] ⓐ — ref·cap 원점이 같은 규칙이다 (셸 바깥 상변 + 테두리 7)');
  ok('[1-a] ref 원점이 **2028** 이다 (2021 + 7)',
    /radius\(ref7, 292, 551, 2028, 'ref'\)/.test(S352));
  ok('[1-b] cap 원점이 **1967** 이다 (1960 + 7) — 이 쪽은 처음부터 옳았다',
    /radius\(cap7, 291, 551, 1967, 'cap'\)/.test(S352));
  ok('[1-c] 두 셸 상변이 자 안에 적혀 있다 (규칙이 산수로 검산된다)',
    /y 2021~2117/.test(S352) && /y 1960~2057/.test(S352));
  ok('[1-d] 옛 리터럴 **2027 이 남아 있지 않다**',
    !/radius\(ref7, 292, 551, 2027/.test(S352));
  ok('[1-e] `verify958` [9-w] 가 새 원점을 물고, [9-w2] 가 **규칙**을 든다 (자리를 안 비웠다 · 333 처방)',
    /\[9-w\]/.test(S958) && /2028, 'ref'/.test(S958) && /\[9-w2\]/.test(S958));

  /* ── [2] ⓑ 새 자가 «원점을 그림에 묻는다» ──────────────────────────────── */
  console.log('\n[2] ⓑ — `probe970` 은 원점을 리터럴이 아니라 **그림**에서 찾는다');
  ok('[2-a] 상변·좌변·우변을 찾는 함수가 있다', /def top_edge\(/.test(S970) && /def side_edges\(/.test(S970) && /def origins\(/.test(S970));
  ok('[2-b] 깊이를 **표본 중심**으로 잡는다 (`d = (y + 0.5) − top`)', /d = \(y \+ 0\.5\) - top/.test(S970));
  ok('[2-c] 손 값은 «탐색 시작점» 이라고 적혀 있다', /탐색 \*\*시작점\*\*|탐색 시작점/.test(S970));
  ok('[2-d] 원점 면역 자가 **인셋의 차**로 묻는다', /def ratio_diff\(/.test(S970) && /da, db = a1 - a2, b1 - b2/.test(S970));
  ok('[2-e] `probe352` 의 부품을 **빌려 쓴다** (사본 0)',
    /import probe352 as P/.test(S970) && /P\._cross\(/.test(S970) && !/def _cross\(cols/.test(S970));

  /* ── [3] 모델 — 원점 1px 이 과녁을 어디로 옮기는가 (그림 없이 닫힌다) ──── */
  console.log('\n[3] ⓐ — 원점 1px 이 968 의 과녁을 통째로 옮긴다 (그림 없이)');
  const rxOld = toRx(30.6, 3), rxNew = toRx(29.6, 3), rxCap = toRx(28.1, 3);
  ok('[3-a] 모델이 우리 캡처를 재현한다 — 눈금 28.1 → rx **30.08** (선언 30)',
    Math.abs(rxCap - 30) < 0.2, f2(rxCap));
  ok('[3-b] 옛 원점(2027)의 눈금 30.6 이 968 의 과녁 **32.65** 를 낸다 (출처 확인)',
    Math.abs(rxOld - 32.65) < 0.1, f2(rxOld));
  ok('[3-c] ⚑ 새 원점(2028)의 눈금 29.6 은 **31.62** — 과녁이 1.03px 내려온다',
    Math.abs(rxNew - 31.62) < 0.1 && rxNew < rxOld, f2(rxNew));
  ok('[3-d] ⚑⚑ 968 의 «± 1.3» 은 오차막대가 아니라 **이 리터럴 1px** 이었다',
    Math.abs(rxOld - rxNew) > 0.9 && Math.abs(rxOld - rxNew) < 1.6, f2(rxOld - rxNew));

  /* ── [4] 실측 — 자기검산 · ref 판정 · 좌우 일치 (캡처 필요) ────────────── */
  console.log('\n[4] ⓑ — 실측: 자기검산 · ref 판정 · **좌우가 만나는가**');
  let OUT = '';
  if (hasCap) {
    try {
      OUT = String(py(['tools/probe970.py'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
    } catch (e) { console.log('  (probe970 실행 실패 — ' + String(e.message || e).slice(0, 90) + ')'); }
  }
  const num = re => { const m = OUT.match(re); return m ? Number(m[1]) : NaN; };
  /* ① 절(대조군)이 먼저 찍히므로 첫 «원 모델(옛 눈금) … 평균» 이 우리 캡처의 눈금이다. */
  const capIdx = num(/원 모델\(옛 눈금\) 좌 [\d.]+ · 우 [\d.]+ · 평균 ([\d.]+)/);
  const immRx = num(/좌우 합친 중앙값 \*\*[\d.]+\*\* ⇒ \*\*rx ([\d.]+)\*\*/);
  const immSplit = num(/면역 L ⇒ rx [\d.]+ · R ⇒ rx [\d.]+ · \*\*좌우 갈림 ([\d.]+) px\*\*/);
  const absSplit = num(/절대 L 중앙값 [\d.]+ ⇒ rx [\d.]+ · R 중앙값 [\d.]+ ⇒ rx [\d.]+ · \*\*좌우 갈림 ([\d.]+) px\*\*/);

  if (!hasCap || !OUT) {
    sk('[4-a] 대조군 — 자가 우리 캡처에서 선언값 언저리를 돌려준다', '캡처 없음(커밋 금지 자산) — `node tools/cap96.js`');
    sk('[4-b] ref 판정 rx 가 30.0~33.0 안이다', '캡처 없음');
    sk('[4-c] ⚑ 원점 면역 자는 **좌·우가 만난다** (≤1.5px)', '캡처 없음');
  } else {
    ok('[4-a] 대조군 — 우리 캡처의 옛 눈금이 **28.1 언저리**다 (자가 안 흔들렸다)',
      Math.abs(capIdx - 28.1) < 0.8, f2(capIdx));
    ok('[4-b] ref 판정 rx 가 **30.0~33.0** 안이다 (968 의 32.7 은 위 끝에 걸린다)',
      immRx >= 30.0 && immRx <= 33.0, f2(immRx));
    ok('[4-c] ⚑⚑ 원점 면역 자는 **좌·우가 만난다** (갈림 ≤ 1.5px)',
      immSplit <= 1.5, f2(immSplit) + 'px');
  }

  /* ── [R] 되돌림 시험 — 면역이 실제로 일을 하는가 ───────────────────────── */
  console.log('\n[R] 되돌림 — 원점을 되살리면 자가 무너진다 (항이 헛초록이 아니다)');
  if (!hasCap || !OUT) {
    sk('[R1] 절대 인셋 비율(원점 의존)로 되돌리면 좌·우가 크게 갈린다', '캡처 없음');
  } else {
    ok('[R1] ⚑ 절대 인셋 비율(원점 의존)로 되돌리면 좌·우가 **4px 넘게** 갈린다',
      absSplit > 4.0 && absSplit > immSplit * 3,
      '절대 ' + f2(absSplit) + 'px ↔ 면역 ' + f2(immSplit) + 'px');
  }
  ok('[R2] 원점을 2027 로 되돌리면 과녁이 **32.65** 로 되돌아간다 (옛 과녁의 출처가 이 한 글자다)',
    Math.abs(toRx(30.6, 3) - 32.65) < 0.1);
  ok('[R3] 종횡비를 원(30:30)으로 되돌리면 대조군이 선언 30 을 못 낸다 — 타원이 [3-a] 를 떠받친다',
    Math.abs(arcIndex(30, 30, 3) - 28.1) > 1.0, f2(arcIndex(30, 30, 3)));

  /* ── [5] ⓒ 제품 판단 — 안 옮겼다 ──────────────────────────────────────── */
  console.log('\n[5] ⓒ — 제품 판단: **안 옮겼다**(0줄). 코너 장치 넷이 그대로다');
  ok('[5-a] 링 타원이 `30px / 33px` 그대로다', /border-radius:30px \/ 33px/.test(HTML));
  ok('[5-b] 마스크 기둥이 `calc(100% - 30px)` 그대로다', /linear-gradient\(90deg,#000 0 30px,transparent 30px calc\(100% - 30px\),#000 calc\(100% - 30px\)\)/.test(HTML));
  ok('[5-c] 어깨 원판이 `23px 25.3px at 30px 33px` 그대로다', /radial-gradient\(23px 25\.3px at 30px 33px/.test(HTML));
  ok('[5-d] `.stab-c4::before` 반경 30 그대로다', /\.stab\.on\.stab-c4::before\{top:0;bottom:0;border-radius:30px/.test(HTML));
  ok('[5-e] ⚑ 판단 근거가 자 안에 적혀 있다 (되돌림 방법 포함 · 위임 규약 표식)',
    /되돌리는 법/.test(fs.readFileSync(__filename, 'utf8')));

  console.log('\nVERIFY970 ' + (tot - bad) + '/' + tot + (skip ? ' (SKIP ' + skip + ')' : '') + (bad ? ' FAIL — ' + bad + '건' : ' PASS'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
