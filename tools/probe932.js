/* 재현·전수 932 — «정수로 세는 자» 가 이 저장소에 또 어디 있는가
 *
 *   node tools/probe932.js                — 갈래별 표
 *   node tools/probe932.js --list R       — 그 갈래의 파일 이름만 (한 줄에 하나)
 *   node tools/probe932.js --json         — 기계가 읽을 꼴
 *   node tools/probe932.js --physics      — 물리 재현(합성 프로파일) 한 표
 *
 * 왜 이 자가 있나 —
 *   895 2회차가 자기 자(`tools/scan895.py` 의 획 걸음)를 «검정 화소를 한 칸씩 세는» 정수에서
 *   **부분 화소**로 갈아 끼웠다. 그때 남긴 교훈이 «7 이 맞다» 가 아니라
 *   **«정수로 세는 자로 ref 를 재면 언제나 우리가 더 두껍게 나온다»** 였고,
 *   «같은 자를 쓰는 축이 더 있는지» 를 이 번호(932)로 넘겼다.
 *
 *   ⚑ 결함의 조건은 셋이 **동시에** 서야 성립한다 —
 *     ① **얇은 축**   참값이 ref 1 px 안팎인 것(획·테두리·틈·경계선). 바닥깎기가 값의 몇십 %다.
 *     ② **비대칭**   ref 의 «가장자리 한 겹» 이 우리 것보다 넓다. 문턱 자는 그 한 겹을 버리므로
 *                     **ref 만** 얇아진다. 비대칭의 뿌리는 둘이고 크기가 다르다 —
 *                       ⓐ **축척** (K=2.0628 · S=2.2222) — 잘라 낸 ref 두 장. ref 1 px = 우리 2.06~2.22 px.
 *                       ⓑ **번짐** (1:1 인 전체 화면 ref) — ref 는 JPEG 사진, 우리는 딱 떨어지는 렌더.
 *                          ⚑ 추측이 아니다: `probe409i.py` `cov_ray()` 주석이 «같은 7px 띠가
 *                          ref 6.0 / cap 7.0» 이라고 적어 뒀다 — **1:1 인데 −14%**.
 *     ③ **정수 걸음** 길이를 «이진 마스크 화소 세기» 로 낸다(합·run-length·EDT·정수 while 걷기).
 *   셋 중 하나만 빠져도 결함이 아니다 — ① 이 없으면 1 px 이 1% 미만이고,
 *   ② 가 없으면 두 쪽이 **같은 만큼** 깎여 상쇄되며, ③ 이 없으면 애초에 안 깎인다.
 *
 * ⚠⚠ **1회차가 처음에 ② 를 «ref 를 읽는가» 로 물었다가 44개를 후보로 잡았다.**
 *   전체 화면 ref 는 1080×2340 · 우리 캡처는 1080×2280 으로 **가로가 1:1** 이라(변환은 y−84 뿐)
 *   축척 편향이 원리적으로 없다 — 그런데 번짐 편향은 남는다. 그래서 ② 를 둘로 갈랐다.
 *
 * ⚠ **이 자는 «판정기» 가 아니라 «선별기» 다.** 소스 글자만 보고는 «그 자가 재는 참값이 얇은가» 를
 *   못 가른다(같은 `.sum()` 이 획에도 쓰이고 판 넓이에도 쓰인다). 그래서 갈래는
 *   **신호(자동) + 판정(손으로 읽어 적은 장부)** 둘로 적는다 —
 *   신호가 바뀌거나 새 자가 생기면 판정이 **다시 열린다**(`verify932.js` [2] 가 그것을 못박는다).
 *   931 이 «갈래를 손으로 적으면 다음에 자가 늘 때 아무도 안 센다» 고 적어 둔 그 함정을
 *   여기서는 «신호는 기계가 · 판정은 사람이, 단 신호가 바뀌면 판정 무효» 로 피한다.
 *
 * 갈래 —
 *   R  빨강   ①∧②ⓐ∧③ — 895 와 **같은 얼굴**(축척 비대칭). 부분 화소로 갈아 끼워야 한다.
 *   B  주홍   ①∧②ⓑ∧③ — 같은 뿌리, 1:1 이라 크기가 작다(저장소 실측 −14%). **942 로 등재**한다.
 *   S  면역   얇은 축을 **부분 화소**로 잰다. 이 저장소의 선례는 둘이고 **서로 다른 처방**이다:
 *              ⓐ 문턱 교차점 선형 보간 — `scan895.py` `stroke_thk()`
 *              ⓑ 검정 «질량» 적분 Σ(1 − L/L_고원) — `scan667c.py` `dark_mass()`
 *              ⓑ 는 AA 화소를 자기 비율만큼만 세므로 «AA 가 있는 ref ↔ 없는 우리» 를 같은 자로 견준다.
 *   A  주황   ②∧③ 이지만 축이 얇지 않다(bbox·피치·중심). 1 px 바닥깎기가 비율로 묻힌다.
 *   N  무관   ① 도 ② 도 아니다(ref 한 장만 열거나, 우리 쪽을 화소로 안 재거나, 길이를 안 낸다).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const TOOLS = __dirname;

/* ── 신호(자동) ─────────────────────────────────────────────────────────────
   넷 다 «소스 글자» 다. 판정이 아니라 **선별**이라는 것을 이름으로 못박는다. */
const SIG = {
  /* ②ⓐ **축척이 다르다** — ref↔우리 환산 배율을 든다. 축척이 다른 ref 는 잘라 낸 두 장뿐이다:
       151-이용권-카드.png 504×709 (K = 2.0628) · 89-유물-팝업.png 486×687 (S = 2.2222)
     전체 화면 ref 는 1080×2340 이고 우리 캡처는 1080×2280 이라 **가로가 1:1** 이다(변환은 y−84 뿐). */
  scale: /151-이용권-카드|89-유물-팝업|2\.0628|2\.2222|978\s*\/\s*474|1080\s*\/\s*486/,
  /* ②ⓑ **가장자리 폭이 다르다** — 축척이 같아도 ref 는 JPEG 사진이라 가장자리 경사면이
     우리 렌더보다 넓다. 문턱 자는 그 경사면을 «검정이 아니다» 로 버리므로 **ref 만** 얇아진다.
     ⚑ 이것은 추측이 아니라 저장소 안의 실측이다 — `probe409i.py` `cov_ray()` 주석이
     «같은 7px 띠가 ref 6.0 / cap 7.0» 이라고 적어 두었다(1:1 인데 −14%). */
  refimg: /docs\/ref\//,
  /* ① 얇은 축 — 얇은 것을 말하는 낱말이 있는가 (있다고 재는 것은 아니다) */
  thin: /획|두께|틈|테두리|외곽선|경계선|hairline|stroke|thk|thick|\bgap\b|border|edge|ring/g,
  /* ③ 정수 걸음 — 길이를 화소 세기로 내는 관용구 */
  intlen: /\.sum\(\)|count_nonzero|np\.ptp|\bptp\(|argwhere|distance_transform_edt|np\.where\(|len\(runs?\b/g,
  /* 부분 화소 관용구 — 교차점 보간 ⓐ 또는 질량 적분 ⓑ */
  frac: /_bilin|np\.interp|map_coordinates|부분 화소|서브픽셀|질량|dark_mass|1 - prof\[|1 - p\[/,
};

function signals(src) {
  return {
    scale: SIG.scale.test(src),
    refimg: SIG.refimg.test(src),
    thin: (src.match(SIG.thin) || []).length,
    intlen: (src.match(SIG.intlen) || []).length,
    frac: SIG.frac.test(src),
  };
}

/* ── 판정(장부) ───────────────────────────────────────────────────────────
   손으로 소스를 읽어 적은 값이다. `sig` 는 **적을 당시의 신호**이고,
   지금 신호가 그것과 다르면 판정은 무효다(= verify932 [2] 가 빨개진다).
   sig 표기: k=축척(0/1) · r=ref 그림(0/1) · t=얇은 말(개수) · i=정수 걸음(개수) · f=부분 화소(0/1) */
const LEDGER = {
  'scan885e.py': {
    v: 'R', sig: 'k1 r1 t20 i7 f0',
    axis: "금색에 붙은 «검정 띠» 두께 ring_thickness (ref 2.83~4.00 ref px)",
    why: "이진 마스크에 distance_transform_edt — 실측으로 ref 값이 격자값 {2√2, 3.414, 4.0} 에만 떨어진다. 그 위에 ×K 가 곱해진다(파일 자신이 L26~29 에서 «부호만 읽으라» 고 경고한다).",
    fix: "금색·검정을 부분 피복 α 로 만든 뒤 경계 법선에 dark_mass(ⓑ) 를 걸어라. sil_ratio 의 정수 bbox 도 같이.",
  },
  'scan885b.py': {
    v: 'R', sig: 'k1 r1 t6 i3 f0',
    axis: "윗줄 «2000%» 글리프 사이 «틈»(ref 2~5 ref px = 4.1~10.3 우리 px)",
    why: "glyph_split 이 «잉크 없는 열 개수» 로 틈을 세고(gaps = runs[i+1][0]−runs[i][1]−1) ref 에만 ×K 를 곱한다 — ref 틈이 2.06 우리 px 눈금에 갇힌다. 이 값이 885 3회차 처방을 letter-spacing 으로 뒤집은 근거였다.",
    fix: "열 합 프로파일의 문턱 교차 보간(ⓐ) 이나 열별 노랑 피복 질량(ⓑ). bbox 의 +1 폭도 같이 — 그래야 «글리프 합 + 틈 합 = 총 bbox» 가 두 해상도에서 닫힌다.",
  },
  'scan887.py': {
    v: 'R', sig: 'k1 r1 t25 i0 f0',
    axis: "하단 «금테 띠» 두께(ref 2 px = 4.44 프레임 px ↔ 우리 5 px)",
    why: "find_border 가 띠와 어두운 안쪽 선의 경계를 «문턱을 넘는 행» 으로 세어 두께가 정수다. 파일이 스스로 «ref ±1 눈금 = 비 ±11%» 라고 적어 둔 그 흔들림이 곧 이 결함이다.",
    fix: "gold_top·gold_bot·dark_top 을 두 밝은 고원 사이 50% 교차나 질량 적분으로. find_base_u3 의 행 걷기도 같이.",
  },
  'scan667b.py': {
    v: 'R', sig: 'k1 r1 t11 i4 f1',
    axis: "리본 좌단 돌출 prot(ref ≈ −1.6~0 px) · 금판 솟음 ptop · dtop",
    why: "932 1회차가 **`left_edge` 만** 갈아 끼웠다(문턱 교차 선형 보간 · `--int` 로 옛 자 대조) — 옛 자는 ref 네 줄 전부 정확히 +0.00 이었고 이제 +0.41/+0.00/+0.39/+0.00 이다. ⚠ **`bbox` 축 셋(띠 두께·금판·수량 잉크)은 아직 정수**라 R 로 남는다.",
    fix: "모서리마다 «바깥이 무엇인가» 를 따로 적어야 한다 — 금판 채움의 바깥은 배경이 아니라 **밝은 금 테**라, 창 전체 정규화로 갈면 폭 33 → 36.4(+10%) 로 재는 것이 바뀐다(1회차 실측). `scan667c.dark_mass` 가 두 밝은 고원을 각각 재는 이유가 이것이다.",
  },
  'probe866.py': {
    v: 'R', sig: 'k1 r1 t17 i0 f0',
    axis: "알약 «테» 두께 = 바깥 117×24 − 속 113×20 ⇒ **2 ref px = 4.4 우리 px**",
    why: "모든 치수가 정수 ref px 이고 S=2.2222 로 곱해 우리와 견준다 — 1 ref px 바닥깎기가 속 세로에 5%, 파생된 «테 2px» 에는 100% 다.",
    fix: "속·바깥 경계를 #191614↔검정 문턱의 선형 교차로. 우리 쪽 flat() 도 같이 — 안 그러면 ref 만 격자에 갇힌 채 ×2.2222 된다.",
  },
  'probe352.py': {
    v: 'B', sig: 'k0 r1 t12 i0 f0',
    axis: "셸 검정 테두리 두께(6~8px) · .stab-sep 구분선 h · 알약 코너 인셋",
    why: "runlen 이 문턱 이하 화소를 센다. 파일 자신이 ««97·85·6» 은 정수 문턱이 부분화소를 버린 값» 이라며 결론을 폐기해 뒀다.",
  },
  'probe384.py': {
    v: 'B', sig: 'k0 r1 t3 i0 f0',
    axis: "검정 옆띠 두께(≈7px) · 채움면 좌 경계 인셋",
    why: "최근접 팔레트 분류 문자열의 런/개수를 세므로 값이 언제나 정수 — ref 의 JPEG 경사면이 통째로 깎인다.",
  },
  'probe409.py': {
    v: 'B', sig: 'k0 r1 t10 i0 f0',
    axis: "코너 법선 «검정 옆띠» 두께(≈7px)",
    why: "걸음은 0.5px 인데 표본이 **최근접**이라 경계가 화소에 스냅한다 — 겹선형도 문턱 보간도 없다.",
  },
  'probe409c.py': {
    v: 'B', sig: 'k0 r1 t6 i0 f0',
    axis: "열별 «검정 화소 수»(0~7px · 접선 3열이 판정값)",
    why: "sum(1 for … == \"K\") — 불리언 세기 그 자체. ±1px 이 곧 ±14%.",
  },
  'probe409f.py': {
    v: 'B', sig: 'k0 r1 t4 i0 f0',
    axis: "«어깨» = 검정 기둥 윗끝 증가분",
    why: "top_of_column 이 while y -= 1 로 정수 y 만 잡는다.",
  },
  'probe409g.py': {
    v: 'B', sig: 'k0 r1 t10 i0 f1',
    axis: "--diag 코너 층 두께(K7.0 · B7.0 …)",
    why: "--edge·--apex 는 이미 문턱 교차 보간인데 --diag 만 최근접 런이라 **같은 파일 안에서 자가 갈린다**.",
  },
  'probe409i.py': {
    v: 'B', sig: 'k0 r1 t33 i0 f1',
    axis: "층 두께 K(≈7) · 1층 D · 2층 B(2~7px)",
    why: "상자·윤곽은 서브픽셀로 잡아 놓고 정작 «층 두께» 는 최근접 런으로 센다. ⚑ cov_ray 의 주석이 «같은 7px 띠가 ref 6.0 / cap 7.0» 이라고 이 결함을 이미 실측해 적어 뒀다 — 1:1 인데 −14%.",
  },
  'probe449.py': {
    v: 'B', sig: 'k0 r1 t2 i0 f0',
    axis: "코너 광선 «첫 실런» 두께(K/B ≈7px)",
    why: "ref 쪽 «목표값» 을 정수 최근접 런으로 뽑아 짝인 probe449.js 에 넘긴다 = 결함 있는 상수의 **생산지**.",
  },
  'scan335.py': {
    v: 'B', sig: 'k0 r1 t3 i0 f0',
    axis: "색 밴드 두께 h(검정 테·이음매 띠 · h≥2 만 남긴다)",
    why: "정수 y 걸음으로 밴드를 센다. 1회차 판정자는 «축척이 같아 상쇄된다» 로 N 을 냈으나, 번짐 비대칭(②ⓑ)에서는 상쇄가 안 된다.",
  },
  'scanA4.py': {
    v: 'B', sig: 'k0 r1 t8 i0 f0',
    axis: "링 어두운 띠 두께 · 노란 밴드 두께",
    why: "0.5px 반지름 걸음이지만 두께를 b−a+.5 로 내는 문턱 자다. 1:1 이라 축척 편향은 없고 번짐 편향만 남는다.",
  },
  'scanA4b.py': {
    v: 'B', sig: 'k0 r1 t2 i0 f0',
    axis: "노란 밴드 두께",
    why: "scanA4 와 같은 규약·같은 이유.",
  },
  'scan895.py': {
    v: 'S', sig: 'k1 r1 t56 i11 f1',
    axis: "배지 두 줄의 «검정 획»(stroke_thk)",
    why: "895 2회차가 갈아 끼운 자리 — R_MID 교차점을 STEP 0.1 로 선형 보간한다(ⓐ 선례).",
  },
  'scan667c.py': {
    v: 'S', sig: 'k1 r1 t22 i7 f1',
    axis: "리본·글자의 «검정 테» 두께(dark_mass)",
    why: "Σ(1 − L/L고원) 질량 적분 — AA 화소가 자기 비율만큼만 세어진다(ⓑ 선례). 모서리도 ±0.5 소수로 낸다.",
  },
  'scan833.py': {
    v: 'S', sig: 'k1 r1 t2 i3 f1',
    axis: "머리띠 «위 검정 테»(ref 4.37~4.92 ref px)",
    why: "cross() 50% 교차 선형보간으로 테·채움·총높이를 전부 낸다.",
  },
  'scan885f.py': {
    v: 'S', sig: 'k1 r1 t2 i0 f0',
    axis: "리본 크림 캡의 «검정 립»(ref 0.8 ref px)",
    why: "«몇 열이냐»(2)와 «잉크로 세면»(0.8)의 차이를 문서에 적고 후자를 택했다 — 처방 ⓑ 를 이미 쓴 자.",
  },
  'probe409d.py': {
    v: 'S', sig: 'k0 r1 t23 i2 f1',
    axis: "링 두께 th=r_o−r_i(≈7px) · 링↔바 «틈»",
    why: "0.1px 걸음 겹선형 프로파일 + 문턱 교차 보간(ⓐ 와 같은 자).",
  },
  'probe437.py': {
    v: 'S', sig: 'k0 r1 t11 i0 f0',
    axis: "셸 검정 테두리 · 알약 검정(6~8px)",
    why: "r_cov 커버리지 적분(ⓑ) 이 본표다. 우리 캡처의 CSS 진실값(6.00/7.00)으로 자를 먼저 검산한다.",
  },
  'probe450.py': {
    v: 'S', sig: 'k0 r1 t7 i0 f0',
    axis: "검정 두께(≈7px) · «립»(≈1.4px) · «림»(1~2px) — 저장소에서 가장 얇은 축",
    why: "두께는 질량 적분, 경계는 색 사영 부분화소. 1.4px 축을 정수로 못 잰다는 것을 알고 설계됐다.",
  },
  'scan667.py': {
    v: 'A', sig: 'k1 r1 t6 i2 f0',
    axis: "노치 깊이 ≈15 ref px(≈31 우리 px)",
    why: "정수 인덱스지만 깊이가 두꺼워 ±1 ref px 이 6% 수준이다.",
  },
  'scan892.py': {
    v: 'A', sig: 'k1 r0 t2 i0 f0',
    axis: "라벨 잉크 w×h (ref 65×15 = 우리 144×33)",
    why: "⚠ 자 자신이 «±1 ref px = 세로 ±6.7%» 라 적고 그 차를 «분해 불가» 로 처리한다 — 얇아지면 R 로 넘어갈 자리.",
  },
  'scan885c.py': {
    v: 'A', sig: 'k1 r1 t13 i6 f0',
    axis: "각도 · cen 38.5 · base 35.8 (우리 px)",
    why: "마스크는 정수지만 cen 은 수백 화소의 평균 · base 는 99.5 분위라 바닥깎기가 안 생긴다.",
  },
  'scan885g.py': {
    v: 'A', sig: 'k1 r1 t1 i4 f0',
    axis: "낱자 폭 중앙값(ref 8 ref px) · 피치 · 라벨 bbox",
    why: "⚠ 폭은 ref ±1px = ±12% 라 8회차가 다툰 −8~−11% 와 크기가 맞먹는다. **피치만 부분화소인 것이 비대칭**이다.",
  },
  'scan923.py': {
    v: 'A', sig: 'k1 r1 t14 i1 f0',
    axis: "평탄부 F · 깊이 D · 노치 길이",
    why: "가로 축은 이미 부분화소(895 교훈을 docstring 이 인용한다). 세로 행 세기만 정수인데 그 축이 6 우리 px 대역 밖이다.",
  },
  'scan833b.py': {
    v: 'A', sig: 'k0 r0 t13 i9 f0',
    axis: "리본 좌·우단·높이 · 라벨 잉크 · 탭 솟은 높이 · 제목 피치",
    why: "전부 20 우리 px 이상 — 이진 마스크지만 바닥깎기가 비율로 묻힌다.",
  },
  'probeA3.py': {
    v: 'A', sig: 'k0 r1 t1 i1 f0',
    axis: "판·알약·배너·플레이트 bbox(w 32~500 · h 40~166)",
    why: "두께·틈 축을 아예 안 잰다(잉크는 inkA3.py 몫). 1px 이 0.2~2.5%.",
  },
  'scan01.py': {
    v: 'A', sig: 'k0 r1 t8 i0 f0',
    axis: "버튼 외곽·알약·아트·글자 잉크 bbox(64~500px)",
    why: "헤더가 «두께는 순색 코어끼리» 를 인용하지만 실제로 두께 축은 하나도 안 잰다.",
  },
  'scan12r.py': {
    v: 'A', sig: 'k0 r1 t5 i0 f0',
    axis: "잉크 bbox · 런의 시작 x · 검정 런의 아래 끝 · 패널 상변(위치 축)",
    why: "두께를 안 낸다 — 위치 축이라 바닥깎기가 양쪽에 같은 방향으로 걸려 상쇄된다.",
  },
  'scan151.py': {
    v: 'N', sig: 'k1 r1 t1 i6 f0',
    axis: "ref 카드 테 두께(card_frame)",
    why: "**ref 한 장만** 연다 — 캡처를 아예 안 열어 견줄 상대가 없다.",
  },
  'scan207.py': {
    v: 'N', sig: 'k1 r0 t1 i0 f0',
    axis: "젬 잉크 bbox 52×50 · 판 중심 Δ",
    why: "ref 는 손으로 적힌 상수(REF_W/REF_H)라 ref 쪽에 바닥깎기가 생길 코드가 없다.",
  },
  'scan813c.py': {
    v: 'N', sig: 'k1 r1 t25 i0 f0',
    axis: "위 12 : 아래 9 ref px 여백과 그 비",
    why: "ref 한 장만 연다. 금테 띠는 y 좌표만 인쇄하고 두께 수치를 안 낸다.",
  },
  'scan885.py': {
    v: 'N', sig: 'k1 r1 t32 i1 f0',
    axis: "아트 덩이 bbox · 돌출 20.6 · 카드-로컬 오프셋",
    why: "ref 만 화소로 재고 우리 값은 geo JSON 의 DOM 상자다 — «같은 자로 두 해상도» 가 성립 안 한다.",
  },
  'scan813d.py': {
    v: 'N', sig: 'k0 r0 t7 i0 f0',
    axis: "위 ~26 : 아래 ~20 프레임 px 와 그 비",
    why: "비(무차원)만 내므로 K 가 안 곱해진다. ⚠ 다만 그 과녁 0.750 자체가 scan887 의 정수 자에서 나왔다.",
  },
  'scan13.py': {
    v: 'N', sig: 'k0 r1 t1 i1 f0',
    axis: "색 영역 bbox x,y,w,h",
    why: "1:1 · 큰 축.",
  },
  'scan335x.py': {
    v: 'N', sig: 'k0 r1 t3 i0 f0',
    axis: "바 안쪽 폭·바깥 폭·좌우 여백",
    why: "테두리 위를 정수로 걷지만 그 두께 자체를 출력하지 않는다.",
  },
  'scan337.py': {
    v: 'N', sig: 'k0 r1 t1 i0 f0',
    axis: "알약 위/아래 여백 · 바 면 노출",
    why: "잉크 bbox 는 큰 축이고 1:1 이다.",
  },
  'scan342.py': {
    v: 'N', sig: 'k0 r1 t6 i0 f0',
    axis: "던전명·알약 라벨 bbox · 알약 우측 여백",
    why: "재는 축이 전부 6px 을 훨씬 넘는다.",
  },
  'scan35.py': {
    v: 'N', sig: 'k0 r1 t3 i1 f0',
    axis: "아이콘·배지·자물쇠·육각·리본 bbox w×h",
    why: "축이 전부 큰 bbox 이고 1:1.",
  },
  'scan36.py': {
    v: 'N', sig: 'k0 r1 t1 i3 f0',
    axis: "글자 코어·배지·알약 캡슐 bbox w×h",
    why: "같은 임계·같은 창을 같은 축척 두 장에 댄다.",
  },
  'scan55.py': {
    v: 'N', sig: 'k0 r1 t3 i0 f0',
    axis: "row/col 색 전이 구간 폭",
    why: "IMG 로 받은 **한 장**만 연다 — 대조 코드가 없다.",
  },
  'scan70.py': {
    v: 'N', sig: 'k0 r1 t2 i0 f0',
    axis: "row/col 전이 구간 폭 · ink bbox",
    why: "ref 전용 대화형 스캐너.",
  },
  'scan72.py': {
    v: 'N', sig: 'k0 r1 t4 i0 f0',
    axis: "썸네일 그라디언트 밀도 bbox",
    why: "ref 한 장에서 큰 bbox 만 뽑는다.",
  },
};

const ORDER = { R: 0, B: 1, S: 2, A: 3, U: 4, N: 5 };

function census() {
  const files = fs.readdirSync(TOOLS)
    .filter(f => /^(scan|probe)\w*\.py$/.test(f))
    .sort();
  return files.map(f => {
    const src = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    const s = signals(src);
    const key = `k${s.scale ? 1 : 0} r${s.refimg ? 1 : 0} t${s.thin} i${s.intlen} f${s.frac ? 1 : 0}`;
    const led = LEDGER[f];
    /* 후보 = ① 낌새 ∧ ② 낌새. 후보가 아니면 판정 없이 N 이다. */
    const cand = (s.scale || s.refimg) && s.thin > 0;
    let verdict, stale = false;
    if (led) {
      stale = led.sig !== key;
      verdict = stale ? '?' : led.v;
    } else if (!cand) {
      verdict = 'N';                 /* 후보조차 아니다 — ① 도 ② 도 낌새가 없다 */
    } else {
      verdict = 'U';                 /* ⚠ 후보인데 장부에 없다 = **아직 안 읽었다.** 초록이 아니다. */
    }
    return { file: f, sig: key, ...s, cand, verdict, stale, led: led || null };
  });
}

/* ── 물리 재현 ───────────────────────────────────────────────────────────
   합성 1차원 프로파일로 «정수 걸음이 왜 ref 만 깎는가» 를 그대로 보인다.
   같은 참값 W(우리 px)를 두 해상도로 그린다 — 우리(1배)와 ref(1/K 배) —
   두 자로 재서 우리 px 로 환산해 견준다. 이미지도 브라우저도 안 쓴다. */
const K = 2.0628;
const R_MID = 125.0;

/* 번짐 — 어느 그림이든 **자기 화소 단위로** 이만큼 번진다(렌더러 AA · 축소 · JPEG).
   ⚑ 이 한 상수가 결함의 전부다: ref 의 0.6 ref px 는 **우리 px 로 1.24** 라,
   같은 «가장자리 한 겹» 이 ref 에서는 얇은 띠의 절반을 차지한다. */
const SIGMA = 0.6;

/** 밝은 고원(255) 위에 검정(0) 띠 하나. 화소 값은 «덮인 넓이» 를 자기 화소 단위로 번지게 한 것. */
function profile(widthPx, startPx, n, sigma = SIGMA) {
  /* 잘게 나눠 적분 → 가우시안 번짐 → 화소로 모은다. 번짐은 «이 그림의 화소» 단위다. */
  const SS = 16;                       /* 화소당 표본 수 */
  const cov = [];
  for (let s = 0; s < n * SS; s++) {
    const x = (s + 0.5) / SS;
    cov.push(x >= startPx && x < startPx + widthPx ? 1 : 0);
  }
  const rad = Math.ceil(3 * sigma * SS);
  const ker = [];
  for (let d = -rad; d <= rad; d++) ker.push(Math.exp(-0.5 * ((d / SS) / sigma) ** 2));
  const ksum = ker.reduce((a, b) => a + b, 0);
  const p = [];
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let j = 0; j < SS; j++) {
      const s = i * SS + j;
      let v = 0;
      for (let d = -rad; d <= rad; d++) {
        const t = s + d;
        v += (t >= 0 && t < cov.length ? cov[t] : 0) * ker[d + rad];
      }
      acc += v / ksum;
    }
    p.push(255 * (1 - acc / SS));
  }
  return p;
}

/* «확실히 검정» 문턱 — 옛 `scan895` 의 `BLACK_T` 와 같은 값이다.
   ⚑ 두 자의 차이는 «걸음» 만이 아니라 **묻는 말**이다:
     정수 걸음은 «이 화소가 검정인가»(BLACK_T) 를 묻고,
     부분 화소는 «어디서 한가운데를 지나는가»(R_MID) 를 묻는다.
   번짐 경사면은 앞의 물음에 «아니오» 라고 답한다 — 그 경사면이 ref 에서 K 배 넓다. */
const BLACK_T = 90.0;

/** ③ 정수 걸음 — «검정» 화소를 한 칸씩 센다. 값이 언제나 정수다. */
function intRuler(p, t = BLACK_T) {
  let n = 0;
  for (const v of p) if (v < t) n++;
  return n;
}

/** ⓐ 부분 화소 — 문턱 교차점을 선형 보간해 두 점 사이를 잰다. */
function fracRuler(p) {
  let a = null, b = null;
  for (let i = 1; i < p.length; i++) {
    if (a === null && p[i - 1] >= R_MID && p[i] < R_MID) {
      a = i - 1 + (p[i - 1] - R_MID) / (p[i - 1] - p[i]);
    } else if (a !== null && b === null && p[i - 1] < R_MID && p[i] >= R_MID) {
      b = i - 1 + (R_MID - p[i - 1]) / (p[i] - p[i - 1]);
    }
  }
  return a === null || b === null ? NaN : b - a;
}

/** ⓑ 질량 적분 — Σ(1 − L/L_고원). AA 화소가 자기 비율만큼만 세어진다. */
function massRuler(p) {
  let m = 0;
  for (const v of p) m += Math.max(0, 1 - v / 255);
  return m;
}

/** 참값 W(우리 px)를 두 해상도에서 세 자로 잰 표 한 줄. */
function physicsRow(W, phase) {
  const our = profile(W, 8 + phase, 40);
  const ref = profile(W / K, (8 + phase) / K, 40);
  return {
    W,
    ourInt: intRuler(our), refInt: intRuler(ref) * K,
    ourFrac: fracRuler(our), refFrac: fracRuler(ref) * K,
    ourMass: massRuler(our), refMass: massRuler(ref) * K,
  };
}

/** 여러 위상에서 평균 — 한 위상만 보면 «우연히 맞는» 자리가 나온다. */
function physics(widths = [2.0, 3.0, 3.73, 4.13, 5.0, 7.0]) {
  const PH = [0, 0.17, 0.33, 0.5, 0.67, 0.83];
  return widths.map(W => {
    const rows = PH.map(ph => physicsRow(W, ph));
    const avg = k => rows.reduce((s, r) => s + r[k], 0) / rows.length;
    const o = { W, int: [avg('ourInt'), avg('refInt')], frac: [avg('ourFrac'), avg('refFrac')], mass: [avg('ourMass'), avg('refMass')] };
    o.intBias = (o.int[1] - o.int[0]) / o.int[0] * 100;   /* «ref 가 우리보다 얼마나 얇게 읽히는가» */
    o.fracBias = (o.frac[1] - o.frac[0]) / o.frac[0] * 100;
    o.massBias = (o.mass[1] - o.mass[0]) / o.mass[0] * 100;
    return o;
  });
}

/* ── 출력 ───────────────────────────────────────────────────────────────── */
function main() {
  const args = process.argv.slice(2);
  const rows = census();
  if (args[0] === '--json') {
    console.log(JSON.stringify({ census: rows, physics: physics() }, null, 2));
    return;
  }
  if (args[0] === '--list') {
    rows.filter(r => r.verdict === (args[1] || 'R')).forEach(r => console.log(r.file));
    return;
  }
  if (args[0] === '--physics') {
    console.log('=== 물리 재현 — 같은 참값 W 를 두 해상도로 그려 세 자로 잰다 (우리 px 환산 · 위상 6개 평균) ===');
    console.log(`    번짐 σ = ${SIGMA} (각 그림의 **자기 화소** 단위 — ref 의 σ 는 우리 px 로 ${(SIGMA * K).toFixed(2)})\n`);
    const f = (x, w = 5) => (Number.isFinite(x) ? x.toFixed(2) : 'nan').padStart(w);
    const pc = x => (x >= 0 ? '+' : '') + x.toFixed(1) + '%';
    console.log('    참값 W │ ③ 정수 걸음            │ ⓐ 교차점 보간          │ ⓑ 질량 적분');
    for (const p of physics()) {
      console.log(`    ${p.W.toFixed(2).padStart(6)} │ 우리${f(p.int[0])} ref${f(p.int[1])} ${pc(p.intBias).padStart(7)} │`
        + ` 우리${f(p.frac[0])} ref${f(p.frac[1])} ${pc(p.fracBias).padStart(7)} │`
        + ` 우리${f(p.mass[0])} ref${f(p.mass[1])} ${pc(p.massBias).padStart(7)}`);
    }
    console.log('\n    (% = ref 가 우리보다 얼마나 크게 읽히는가. 음수 = **ref 가 얇게 읽힌다** = 895 가 겪은 얼굴)');
    return;
  }
  const by = {};
  for (const r of rows) (by[r.verdict] = by[r.verdict] || []).push(r);
  console.log(`=== 932 전수 — tools/scan*.py · tools/probe*.py ${rows.length} 개 ===\n`);
  for (const v of Object.keys(ORDER).concat('?').filter(k => by[k])) {
    const label = {
      R: '빨강 — ①∧②ⓐ 축척 비대칭 (895 와 같은 얼굴)',
      B: '주홍 — ①∧②ⓑ 번짐 비대칭 (1:1 · 942 로 등재)',
      S: '면역 — 얇은 축을 부분 화소로 잰다',
      A: '주황 — 정수 걸음이지만 축이 얇지 않다',
      U: '⚠ 미판정 후보(아직 안 읽었다 — 초록이 아니다)',
      N: '무관 — ① 도 ② 도 아니다', '?': '⚠ 판정 무효(신호가 바뀌었다 — 다시 읽어라)',
    }[v];
    console.log(`[${v}] ${label} — ${by[v].length}개`);
    for (const r of by[v]) {
      const tail = r.led ? `  ← ${r.led.axis}` : '';
      console.log(`    ${r.file.padEnd(18)} ${r.sig}${tail}`);
    }
    console.log('');
  }
}

module.exports = { census, signals, physics, intRuler, fracRuler, massRuler, profile, LEDGER, K, R_MID };
if (require.main === module) main();
