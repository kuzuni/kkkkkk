/* 작업 291 — 게이트 공용 «입장 연출 정착» 장치
 *
 * 병: 60 의 페이지 등장 연출(`jzPgIn` .12s · `jzSheetIn` .24s)은 **느린 러너에서 훨씬 늦게
 * 시작·종료한다**. 게이트 44개는 여는 동작 뒤를 고정 `waitForTimeout(700~1800ms)` 로만 기다리고
 * 곧바로 `getBoundingClientRect()` 를 부른다 — 그 고정 대기가 끝난 프레임이 «연출이 끝난 뒤» 일
 * 수도, «연출이 아직 시작도 안 한 뒤» 일 수도 있다.
 *
 * 재현(`node tools/repro291.js --runs 3 --parallel 3 --load 6`): 한가할 때 1/12 · **부하에서 24/36**.
 * 그때 잡히는 오차는 47 §221 이 적어 둔 것과 **똑같은 지문**이다 —
 *   `jzPgIn` 0% 프레임의 scale 은 .985 이고, rect.x 는 화면 절대 좌표라
 *   x' = 540 + (x−540)·s  →  좌변이 **540·(1/s−1) = 8.22px** 밀린다(폭은 1080 → 1063.8).
 * 122 §17 의 «실행마다 3.8/4.0/6.1/6.2 로 흔들리는 자» 가 바로 이것이었다.
 *
 * 처방(새로 설계하지 않는다 — 47 이 이미 쓰던 것을 공용으로 올린 것뿐이다):
 *   자를 대기 전에 `jzPg…`·`jzSheet…` 가 **끝나기를 기다린다**. 무한 루프 연출
 *   (`jzDotPulse`·`jz122*`·`bgm*`)은 `finished` 가 영원히 안 오므로 **이름으로 걸러낸다**.
 *   끝난 뒤 rAF 를 두 프레임 더 줘서 스타일이 확정된 프레임에서 재게 한다.
 *
 * 어디에 붙나: `pwlaunch.launch()` 가 만든 브라우저의 페이지에 자동으로 붙는다(§arm).
 * 붙는 자리는 `page.waitForTimeout()` **직후** 하나뿐이다 — 게이트 44개의 «고정 대기» 가
 * 전부 그 함수를 지나가므로, 게이트 파일을 한 줄도 안 고치고 44개가 동시에 낫는다.
 *
 * ⚠ 작업 353 — **그 훅이 못 보는 자리가 있다.** 게이트가 대기를 페이지 **안에서** 할 때다:
 *     page.evaluate(() => new Promise(res => { openDungeon(); setTimeout(() => res(잰다()), 700); }))
 *   이 모양은 `page.waitForTimeout` 을 한 번도 안 지나므로 정착이 **0회** 돈다(`tools/probe353.js` ①).
 *   `verify96` [6] 이 그 자리였고, 부하에서 8회 중 1회 «좌 157 · 우 141»(= `jzPgIn` 0% 프레임,
 *   폭 794 → 782.09 = ×.985)로 빨개졌다. 재현은 부하가 없어도 결정적이다 — 같은 evaluate 안에서
 *   40~60ms 뒤에 재면 **항상** 157/141 이 나온다(`probe353` ③ 위상 스윕).
 *   ⇒ 훅과 **같은 본체**를 페이지 안에도 심어 둔다(§in-page). 게이트는 재기 직전에 한 줄:
 *       setTimeout(() => settle291().then(() => res(잰다())), 700)
 *   전수 조사 결과 이 모양을 쓰는 게이트는 5개다(96·22·46·125·299) — 그 중 «페이지 입장 연출을
 *   같은 블록에서 여는» 것은 96 과 77 뿐이고, 77 은 rect 가 아니라 노드 개수·스태킹을 세므로
 *   이 흔들림에 안 걸린다. 나머지는 필요할 때 같은 한 줄을 쓰면 된다.
 *
 * 왜 «전부» 가 아니라 조건을 다나:
 *   ⓐ **entry 가 `verify*.js` 일 때만.** `cap*.js` 계열은 연출을 **일부러 한복판에서** 80~100ms
 *      간격으로 연속 캡처하는 하네스다(지시서 [3]-(다)). 거기서 정착을 걸면 찍으려던 프레임이 사라진다.
 *   ⓑ **250ms 이상 기다릴 때만.** 그보다 짧은 대기는 «프레임 하나 넘기기» 라 정착 대상이 아니다.
 *   ⓒ 정착 자체에 **상한 1500ms** 를 건다. 어떤 이유로든 `finished` 가 안 오면 그냥 지나간다 —
 *      게이트가 멈추는 것보다는 종전 동작이 낫다.
 * 환경변수 `PW_SETTLE=0` 이면 통째로 끈다(되돌림 스위치) · `PW_SETTLE=1` 이면 entry 조건을 무시하고 켠다.
 */

/* 페이지 컨텍스트에서 도는 본체 — 47 `tools/verify47.js` SETTLE 과 같은 식이다. */
const SETTLE_SRC = `() => { const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length))))); }`;

/* 값싼 선검사 — 기다릴 연출이 **하나도 없으면** 위 본체(= rAF 2프레임)를 아예 안 돈다.
   이게 없으면 «시간 자체를 재는 게이트» 가 깨진다: 64·262 는 «300ms 눌러 1회 · 350ms 전엔
   반복 없음» 을, 107 은 «멎은 뒤 몇 프레임 움직이나» 를 잰다. rAF 2프레임(≈32ms, 부하에선 더)이
   얹히면 300ms 홀드가 350ms 문턱을 넘어 **Δ2** 가 된다(실제로 그렇게 빨개졌다).
   정착이 필요한 순간에는 어차피 연출이 «돌고 있을 때» 뿐이므로, 선검사로 갈라도 병은 그대로 닫힌다. */
const PENDING_SRC = `() => { const A = document.getAnimations ? document.getAnimations() : [];
  return A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '') && a.playState !== 'finished').length; }`;

const CAP_MS = 1500;    /* 정착 대기 상한 — 넘으면 포기하고 진행 */
const MIN_WAIT = 250;   /* 이 값 이상 기다린 «고정 대기» 뒤에만 정착한다 */

/* ---- §in-page (작업 353) — 페이지 안에서 부를 수 있는 같은 본체 ----
   `addInitScript` 로 심으므로 **부르지 않으면 아무 일도 안 한다**(정의만 올라간다).
   위 훅과 다른 점은 하나 — 2 rAF 를 준 뒤 **다시 본다**. 고정 대기가 «연출이 시작되기 직전» 에
   끝나면 그 순간엔 pending 이 0 이라 그냥 지나가는데, 바로 다음 프레임에 연출이 붙으면 잰 값이
   0% 프레임이 된다(353 이 잡은 바로 그 모양). 다시 보면 그 창이 닫힌다.
   상한은 훅과 같은 1500ms — 어떤 이유로든 `finished` 가 안 오면 게이트를 멈추지 않고 지나간다.
   되돌림 스위치 `PW_SETTLE=0` 은 여기에도 걸린다(`window.__settle291off`). */
const IN_PAGE_SRC = `(cap) => { const t0 = performance.now(); const lim = (cap | 0) || ${CAP_MS};
  const pend = () => (document.getAnimations ? document.getAnimations() : [])
    .filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '') && a.playState !== 'finished');
  const step = (n) => {
    if (window.__settle291off) return Promise.resolve(n);
    const P = pend();
    if (!P.length || performance.now() - t0 > lim) return Promise.resolve(n);
    return Promise.all(P.map(a => a.finished.catch(() => 0)))
      .then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(0)))))
      .then(() => step(n + P.length)); };
  return step(0); }`;

/* ---- §box (작업 950) — «가운데 다이얼로그» 개폐 연출 정착 ----
   위 §in-page 사다리로는 **못 닫는 창이 하나 더** 있다. 두 가지가 겹친 자리다:
     ⓐ **필터가 이름으로 갈라 놓았다.** 훅·§in-page 는 `/^jz(Pg|Sheet)/` 만 본다 —
        전체화면 페이지와 바닥 시트다. 가운데 다이얼로그는 `jzBoxIn`(`.jz-o.jz-dlg>*`, .22s)이라
        그 정규식에 **안 걸린다.** 그래서 `settle291()` 을 불러도 상자 연출은 그냥 지나간다.
     ⓑ **사다리가 «부를 때 pending 이 0 이면 곧바로 끝낸다»** 라서, 연출이 **다음 프레임에
        붙는** 자리의 창은 못 닫는다(764 가 `verify429` 에서 실측했다).
   ⇒ «**두 프레임 연속으로 돌 것이 없을 때만** 끝낸다» 로 세운다. 상한은 291 과 같은 1500ms —
     어떤 이유로든 `finished` 가 안 오면 자를 멈추지 않고 지나간다.

   ⚠ **훅(`/^jz(Pg|Sheet)/`)을 넓혀서 풀지 않았다** — 764 가 적어 둔 이유 그대로다: 그 필터는
     `page.waitForTimeout` 훅으로 게이트 44개를 전부 지나가는데, 64·262·107 처럼 **시간 자체를
     재는** 자는 rAF 두 프레임이 얹히면 문턱을 넘는다(위 PENDING_SRC 주석). 그래서 §box 는
     **부르는 자만 지나가는** 별도 부품이고, 훅은 한 글자도 안 건드렸다.

   왜 `jzBoxIn` 한 프레임이 «값이 틀렸다» 로 읽히나(950 위상 스윕 — 부하 없이 결정적):
     0~60ms **690×267**(0% `scale:.92`) · 100ms 737×285 · 150ms 750×290 · 200~220ms **764×295**
     (62% `scale:1.02`) · 260ms~ 750×290. 고정 대기는 이 곡선 위 아무 데나 떨어진다 —
     한 배율이 가로·세로에 **같이** 걸리므로 «자리가 틀렸다» 가 아니라 «한 프레임을 읽었다» 다.

   ⚑ **작업 957 — 이 규칙이 이제 «하나» 다.** 950 이 §box 를 세울 때 같은 일을 손으로 적은 자가
     다섯 남아 있었다(`probe950` [5]): `verify46`(244 · 셀렉터형) · `verify429`(764) · `probe764` ·
     `verify268`(135) · `smoke.js`(135). 957 이 그 중 **넷**을 이 부품으로 모았고, 그러면서 위
     `pend()` 에 **«무한 반복은 안 기다린다»** 한 항이 붙었다 — 135 계열(`verify268`·`smoke`)이
     `/^jz/` 로 넓게 보는데 `jzDotPulse`·`bgmA` 같은 상시 애니는 `finished` 가 **영원히 안 온다**.
     그 둘이 손으로 적은 규칙에도 같은 항(`iterations !== Infinity`)이 있었다 — 사본을 접는 것이
     아니라 **사본이 알던 것을 부품이 배우는 것**이 이 이관의 몫이다(`^jzBox` 에는 무한 연출이
     하나도 없으므로 950·485 의 기존 호출자는 동작이 한 프레임도 안 바뀐다 · `verify957` [2]).
     남긴 하나는 `verify46` 이다 — 그 자의 축은 «요소 자신의 애니 + bbox 연속 3회» 라 이름
     패턴 하나로는 못 적는다(사유·표는 `docs/review/957-상자정착사본접기.md` §2 · `verify957` [5]).

   되돌림 스위치는 `PW_SETTLEBOX=0`(`window.__settleBoxOff`) — 켜면 §box 는 기다리지 않고
   즉시 0 을 돌려주므로 부르는 자의 폴백(= 종전 고정 대기)이 그대로 산다. 291 의 `PW_SETTLE`
   과 **가르는 이유**: 931·946 의 전후 대조가 `PW_SETTLE=0` 으로 «장치 없는 세상» 을 만드는데,
   거기에 §box 까지 묶이면 그 대조가 이 부품의 회귀까지 같이 뒤집는다. */
const QUIET_SRC = `(pat, cap) => { const lim = (cap | 0) || ${CAP_MS}; const t0 = performance.now();
  const re = new RegExp(pat || '^jzBox');
  const pend = () => (document.getAnimations ? document.getAnimations() : [])
    .filter(a => re.test(a.animationName || '') && a.playState !== 'finished'
      && !(a.effect && a.effect.getTiming && a.effect.getTiming().iterations === Infinity));
  const step = (quiet, n) => {
    if (window.__settleBoxOff) return Promise.resolve(n);
    if (quiet >= 2 || performance.now() - t0 > lim) return Promise.resolve(n);
    const P = pend();
    /* 957 — 상한을 **기다리는 동안에도** 지킨다. finished 는 «끝나지 않는 연출»(무한 반복 ·
       멈춘 애니)에서 영원히 안 오는데, 위 상한 검사는 걸음 **사이**에만 돌아 그 자리에서
       통째로 붙잡힌다(실측: 무한 반복 하나면 evaluate 가 안 돌아온다 · verify957 [2d]). */
    const left = Math.max(0, lim - (performance.now() - t0));
    return (P.length ? Promise.race([Promise.all(P.map(a => a.finished.catch(() => 0))),
                                     new Promise(r => setTimeout(r, left))])
                     : Promise.resolve())
      .then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
      .then(() => step(P.length ? 0 : quiet + 1, n + P.length)); };
  return step(0, 0); }`;

function enabled() {
  const v = process.env.PW_SETTLE;
  if (v === '0' || v === 'off') return false;
  if (v === '1' || v === 'on') return true;
  /* 기본값 — 게이트(`verify*.js`)만. 연출 캡처 하네스(`cap*.js`)는 건드리지 않는다. */
  const entry = String(process.argv[1] || '').replace(/\\/g, '/').split('/').pop();
  return /^verify.*\.js$/.test(entry);
}

/* 페이지 하나에 정착을 심는다. 두 번 불러도 한 번만 감싼다.
   353 — `addInitScript` 때문에 async 가 됐다(심는 것은 첫 goto **전에** 끝나야 한다).
   `armBrowser` 가 유일한 호출자이고 거기서 await 한다. */
async function arm(page) {
  if (!page || page.__settle291) return page;
  page.__settle291 = true;
  /* 353 — 페이지 안에서 부를 수 있는 본체를 심는다. 정의만 올리므로 안 부르면 무해하다. */
  try {
    await page.addInitScript(
      ({ src, quiet, off, boxOff }) => {
        window.__settle291off = off; window.settle291 = (cap) => eval(src)(cap);
        /* 950 §box — 이름 패턴을 받는 일반형 하나와, 가장 흔한 자리(가운데 다이얼로그) 별칭 하나 */
        window.__settleBoxOff = boxOff;
        window.settleAnim291 = (pat, cap) => eval(quiet)(pat, cap);
        window.settleBox = (cap) => eval(quiet)('^jzBox', cap);
      },
      /* ⚠ 여기는 `enabled()`(= entry 가 verify 인가) 를 안 본다 — 이 본체는 **부르는 게이트만**
         지나가므로 연출 캡처 하네스(`cap*.js`)에는 애초에 영향이 없다. 끄는 것은 되돌림 스위치뿐이다. */
      { src: IN_PAGE_SRC, quiet: QUIET_SRC,
        off: process.env.PW_SETTLE === '0' || process.env.PW_SETTLE === 'off',
        boxOff: process.env.PW_SETTLEBOX === '0' || process.env.PW_SETTLEBOX === 'off' },
    );
  } catch (_) { /* 이미 네비게이션이 시작됐으면 심을 자리가 없다 — 훅만으로 간다 */ }
  page.settle291 = async () => {
    try {
      if (!(await page.evaluate(src => eval(src)(), PENDING_SRC))) return 0;
      return await Promise.race([
        page.evaluate(src => eval(src)(), SETTLE_SRC),
        new Promise(r => setTimeout(() => r(-1), CAP_MS)),
      ]);
    } catch (_) { /* 네비게이션·닫힘 중이면 잴 것도 없다 */ return 0; }
  };
  if (!enabled()) return page;
  const orig = page.waitForTimeout.bind(page);
  page.waitForTimeout = async ms => {
    await orig(ms);
    if (typeof ms === 'number' && ms >= MIN_WAIT) await page.settle291();
  };
  return page;
}

/* ---- §box-node (작업 957) — 노드 쪽에서 §box 를 부르는 한 자리 ----
   `verify268`·`smoke.js` 는 대기를 **노드 쪽**에서 한다(`page.waitForFunction`). 둘 다 §box 와
   같은 일을 손으로 적고 있었으므로 여기 한 줄로 모은다. 심긴 페이지면 심긴 본체를 부르고,
   안 심긴 페이지(= `pwlaunch` 밖에서 만든 페이지)면 **같은 소스 문자열**을 그 자리에서 돌린다 —
   어느 길로 가도 규칙은 `QUIET_SRC` 하나뿐이다(402 «사본을 지운다»).
   ⚠ 상한은 부르는 자가 정한다(135 계열은 3000ms 를 쓰던 자리라 그 값을 그대로 넘긴다).
   ⚠ 페이지가 네비게이션 중이거나 닫혔으면 **자를 멈추지 않고** 0 을 돌려준다(291 ⓒ 와 같은 태도). */
async function settleAnimOn(page, pat = '^jzBox', cap = CAP_MS) {
  const lim = (cap | 0) || CAP_MS;
  try {
    const armed = await page.evaluate(() => typeof window.settleAnim291 === 'function');
    const run = armed
      ? page.evaluate(([p, c]) => window.settleAnim291(p, c), [pat, lim])
      : page.evaluate(([src, p, c]) => eval(src)(p, c), [QUIET_SRC, pat, lim]);
    return await Promise.race([run, new Promise(r => setTimeout(() => r(-1), lim + 500))]);
  } catch (_) { return 0; }
}

/* 브라우저(그리고 그 컨텍스트)가 만드는 모든 페이지에 자동으로 심는다. */
function armBrowser(browser) {
  if (!browser || browser.__settle291) return browser;
  browser.__settle291 = true;
  const wrapNewPage = obj => {
    const orig = obj.newPage.bind(obj);
    obj.newPage = async (...a) => await arm(await orig(...a));
  };
  wrapNewPage(browser);
  const origNewCtx = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const ctx = await origNewCtx(...a);
    wrapNewPage(ctx);
    return ctx;
  };
  return browser;
}

module.exports = { SETTLE_SRC, IN_PAGE_SRC, QUIET_SRC, arm, armBrowser, enabled,
                   settleAnimOn, CAP_MS, MIN_WAIT };
