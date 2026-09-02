/* 785 — «꾹 눌러 표본을 모으는» 자들의 공용 부품 (하네스 문턱을 러너 속도에서 떼어낸다)
 *
 *   const { holdUntil } = require('./holdburst');
 *   const H = await holdUntil(page, { at:'#rwBasin', need:6, count:()=>window.__v683.bursts.length,
 *                                     maxMs:20000, mode:'touch', cdp });
 *   ok(H.n >= 6, 'B2 …', H.note);
 *
 * ── 왜 부품이 필요한가 ────────────────────────────────────────────────────
 * 홀드 표본을 요구하는 자가 넷이다 — `verify683` [B2](6회) · `verify666` [B1](4회) ·
 * `verify682` [B0](4버스트) · `verify619` [B1](시도 8회). 넷 다 **«N밀리초 누른다» 로 적혀 있었고**,
 * 그래서 문턱이 사실은 **러너의 틱 속도**에 붙어 있었다:
 *   제품 설계는 `TR_HOLD_DELAY` 350ms 뒤 `TR_HOLD_IV0` 160ms → `TR_HOLD_IVMIN` 60ms 가속
 *   (= 6~16회/초)인데, 클라우드 러너 실측은 **1.3~1.9회/초**다(`probe785`). 3000ms 가
 *   산술적으로 6회를 못 채운다 — 753 이 그래서 3000 → 6000 으로 늘렸고, 그 값이 다시
 *   러너에 붙어 있다는 것이 785 다.
 *
 * ⚑ **고치는 방향은 «문턱을 내린다» 가 아니라 «하네스가 기다린다»** 이다.
 *   문턱을 내리면 표본이 굶어 그 위에 선 통계 항(`verify683` [D4]·[H2] · `verify666` [E1])이
 *   **헛초록**이 된다 — 실제로 [E1] 은 `buys >= 4` 를 분모 전제로 접어 두고 있어서,
 *   문턱만 내렸으면 «2/2 = 1.0 이라 초록» 이 됐을 자리다(수리 전 실측이 그 값이었다).
 *   ⇒ **표본 수를 문턱으로 삼고, 시간은 «상한» 으로만 쓴다.** 빠른 기계에서는 일찍 떼고
 *   느린 기계에서는 더 눌러, **같은 표본을 실제로 얻는다**.
 *
 * ⚠ 상한(`maxMs`)에 걸려 끊긴 것은 **실패가 아니라 관측**이다 — 반환값 `reached` 로 알린다.
 *   부르는 자는 여전히 자기 문턱(`H.n >= need`)으로 판정한다(이 부품은 «묻는 것» 을 안 바꾼다).
 */
'use strict';

const DEF = { need: 1, maxMs: 20000, minMs: 0, stepMs: 80, settleMs: 250, mode: 'mouse', jitter: 2 };

/* 페이지 안에서 표본 수를 센다 — 예외는 «지금까지 센 값» 으로 삼는다(LESSONS 319: 즉사 금지)
   `arg` 는 세는 식에 넘길 인자(`verify619` 처럼 «어느 자리의 표본인가» 를 가려야 하는 자를 위해). */
async function poll(page, countFn, last, arg) {
  try {
    const v = arg === undefined ? await page.evaluate(countFn) : await page.evaluate(countFn, arg);
    return Number.isFinite(v) ? v : (Array.isArray(v) ? v.length : last);
  } catch (_) { return last; }
}

/* 누를 자리 — 선택자면 화면 중심 좌표로 바꾼다 */
async function center(page, at) {
  if (!at) return null;
  if (typeof at === 'object') return at;
  return page.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect();
    if (!b.width || !b.height) return null;
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, at);
}

/**
 * 표본이 찰 때까지 누른다.
 * @returns {{n:number, ms:number, reached:boolean, polls:number, rate:number, note:string, c:object}}
 */
async function holdUntil(page, opt) {
  const o = Object.assign({}, DEF, opt || {});
  const c = await center(page, o.at);
  if (!c) return { n: 0, ms: 0, reached: false, polls: 0, rate: 0, note: '누를 자리를 못 찾았다', c: null };
  const touch = o.mode === 'touch';
  if (touch && !o.cdp) return { n: 0, ms: 0, reached: false, polls: 0, rate: 0, note: 'touch 모드인데 cdp 가 없다', c };

  const down = async () => touch
    ? o.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] })
    : (await page.mouse.move(c.x, c.y), page.mouse.down());
  const move = async () => {
    const j = () => (Math.random() * 2 - 1) * o.jitter;
    if (touch) return o.cdp.send('Input.dispatchTouchEvent',
      { type: 'touchMove', touchPoints: [{ x: c.x + j(), y: c.y + j() }] }).catch(() => {});
  };
  const up = async () => touch
    ? o.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {})
    : page.mouse.up();

  const t0 = Date.now();
  const st = down();
  let n = 0, polls = 0;
  /* 상한까지 누르되, 표본이 차면(그리고 최소 누름 시간을 넘겼으면) 바로 뗀다.
     ⚠ 상한은 **폴링 사이에서** 재므로 실제 누름은 한 폴링 주기만큼 넘칠 수 있다
     (느린 기계에서 `evaluate` 한 번이 1초 넘게 걸린다 — `probe785` [4-a] 실측 4000 → 5543ms).
     상한은 «데드라인» 이 아니라 «더 안 기다린다» 는 뜻이라 그 초과는 무해하다. */
  while (true) {
    await new Promise(r => setTimeout(r, o.stepMs));
    if (Date.now() - t0 >= o.maxMs) break;
    await move();
    n = await poll(page, o.count, n, o.countArg); polls++;
    if (n >= o.need && Date.now() - t0 >= o.minMs) break;
  }
  const ms = Date.now() - t0;
  await up();
  await (st && st.catch ? st.catch(() => {}) : Promise.resolve());
  await page.waitForTimeout(o.settleMs);
  /* 뗀 뒤에 마지막 한 번 더 센다 — 마지막 틱이 폴링 사이에 들어올 수 있다 */
  n = Math.max(n, await poll(page, o.count, n, o.countArg));

  const reached = n >= o.need;
  const rate = ms > 0 ? +(n / (ms / 1000)).toFixed(2) : 0;
  const note = n + '/' + o.need + '회 · ' + ms + 'ms(상한 ' + o.maxMs + ') · ' + rate + '회/초'
             + (reached ? '' : ' · ⚠ 상한에서 끊겼다');
  return { n, ms, reached, polls, rate, note, c };
}

module.exports = { holdUntil, center, DEF };
