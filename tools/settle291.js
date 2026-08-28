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

function enabled() {
  const v = process.env.PW_SETTLE;
  if (v === '0' || v === 'off') return false;
  if (v === '1' || v === 'on') return true;
  /* 기본값 — 게이트(`verify*.js`)만. 연출 캡처 하네스(`cap*.js`)는 건드리지 않는다. */
  const entry = String(process.argv[1] || '').replace(/\\/g, '/').split('/').pop();
  return /^verify.*\.js$/.test(entry);
}

/* 페이지 하나에 정착을 심는다. 두 번 불러도 한 번만 감싼다. */
function arm(page) {
  if (!page || page.__settle291) return page;
  page.__settle291 = true;
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

/* 브라우저(그리고 그 컨텍스트)가 만드는 모든 페이지에 자동으로 심는다. */
function armBrowser(browser) {
  if (!browser || browser.__settle291) return browser;
  browser.__settle291 = true;
  const wrapNewPage = obj => {
    const orig = obj.newPage.bind(obj);
    obj.newPage = async (...a) => arm(await orig(...a));
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

module.exports = { SETTLE_SRC, arm, armBrowser, enabled, CAP_MS, MIN_WAIT };
