/* 작업 385 — 좌측 사이드 «잉크» 차분법의 공용 판(plate)
 *
 *   const { plate, PLATE_CSS } = require('./plate360');
 *   await plate(p);                 // 얼리기(rAF·interval·animation) **뒤에** 부른다
 *
 * ── 왜 파일 하나인가 ───────────────────────────────────────────────────────────
 * 382 가 `tools/verify360.js` 에만 이 두 줄을 넣어 자를 정착시켰는데, **같은 차분법을 쓰는
 * 자매 자 셋**(`probe360.js`·`cal360.js`·`probe371.js`)에는 안 갔다. 그래서 같은 «잉크» 라는
 * 말이 도구마다 다른 숫자를 가리키게 됐고(385 실측: 게이트 attend 98×100 ↔ 자매 자 96×99,
 * 게다가 로드마다 ±1~2px), `cal360`/`probe371` 이 뱉는 `--sf` 역산치를 그대로 index.html 에
 * 옮겨 적으면 **게이트가 재는 것과 2px 어긋난 값**이 심긴다. 실제로 `probe371 😇` 는 연속
 * 두 실행에서 `--sf 0.846` 과 `0.859` 를 돌려줬다(1.5% 차이 — 심는 값이 실행마다 달랐다).
 *
 * 규칙을 네 파일에 네 번 적는 대신 **한 곳에 두고 넷이 그것을 부른다** — 351 6회차가
 * `probe351lib.js` 로 «자매 자 드리프트» 를 막은 것과 같은 처방이다. 두 줄을 복붙으로 두면
 * 다음에 한쪽만 고쳐지는 것이 이 결함의 전부였다.
 *
 * ── 무엇을 하는가 ─────────────────────────────────────────────────────────────
 * 차분법은 「그 행의 `.si` 만 숨긴 캡처」와 「그대로인 캡처」의 픽셀 차가 임계 8 을 넘는 자리를
 * 세어 잉크 bbox 를 잡는다. 그런데 글리프 가장자리의 안티에일리어싱 픽셀은 **뒤에 깔린 색과
 * 섞인 값**이다. 아이콘 뒤는 전투 캔버스(`#view`)라 로드마다 그림이 달라서 테두리 한 줄이
 * 임계를 넘었다 말았다 한다 = 6칸 전부 ±1~2px, 분모(형제 4칸 평균)까지 흔들린다.
 * ⇒ 캔버스를 끄고 **단색 판**을 깐다. 아이콘은 z 3, 캔버스는 그 아래라 **측정 대상은 안 바뀐다**.
 *
 * ── ⚠ 판 색은 규약이다. 아무 색이나 고르면 «다른 것을 재는 자» 가 된다 (382 §3 실측) ──
 *   · 근흑 `#0a0c16` — 외곽선 `--o`(#080a0a · drop-shadow 4겹)가 임계 8 을 못 넘어 실루엣에서
 *                      통째로 빠진다(잉크 96 → 86 · 분모 100.0 → 89.5).
 *   · 흰   `#ffffff` — 📅 처럼 **흰 잉크**를 가진 글리프가 판에 먹힌다.
 *   · **마젠타 `#ff00ff`** — 근흑 외곽선과도 흰 잉크와도 멀어 실루엣을 통째로 센다 ⇒ 이것을 쓴다.
 * 이 판을 걷거나 색을 바꾸면 네 도구가 전부 다시 흔들린다. 회귀는 `node tools/verify385.js`.
 */
'use strict';

/* 판 색을 바꾸려면 여기 한 곳만 고친다 — 그리고 verify385 [R] 이 그것을 막는다. */
const PLATE_BG = '#ff00ff';
const PLATE_CSS =
  `#view{visibility:hidden!important}#stagearea{background:${PLATE_BG}!important}`;

/* ── 시험용 문 `PLATE360` — 되돌림 시험(§R)이 쓰는 자리다. 평상시에는 비어 있어야 한다 ──
 *   PLATE360=off       판을 안 깐다(= 382 이전 상태: 전투 캔버스 위에서 잰다)
 *   PLATE360=#0a0c16   판 색만 갈아 끼운다(근흑이면 외곽선이 통째로 빠지는 것을 실증한다)
 * 이 문이 없으면 «판이 실제로 무언가를 바꾸는가» 를 자로 물을 방법이 없어 verify385 가
 * 항등식이 된다(382 교훈 3 — 되돌림 없는 단언은 헐겁다). 도구 자신은 이 문을 안 쓴다. */
function plateCss() {
  const v = (process.env.PLATE360 || '').trim();
  if (v.toLowerCase() === 'off') return null;
  const bg = v && v.toLowerCase() !== 'on' ? v : PLATE_BG;
  return `#view{visibility:hidden!important}#stagearea{background:${bg}!important}`;
}

/* 판을 깔고 리페인트를 기다린다. 얼리기(rAF·interval·animation-play-state) 뒤에 불러야
   판이 깔리는 프레임과 재는 프레임이 같은 그림이다. */
async function plate(p, wait = 250) {
  const css = plateCss();
  if (css) await p.addStyleTag({ content: css });
  if (wait) await p.waitForTimeout(wait);
}

module.exports = { PLATE_BG, PLATE_CSS, plateCss, plate };
