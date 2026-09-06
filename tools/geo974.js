/* 작업 974 — 공용 «낡은 rect 읽기» 감사 장치
 *
 * ── 병 ──────────────────────────────────────────────────────────────────
 * 화소를 재는 자는 두 가지를 한 판에서 얻는다: ① 스크린샷(찍힌 화소) ② `getBoundingClientRect()`
 * (그 화소를 자를 **창**). 두 번째를 **첫 번째보다 먼저** 읽으면, 그 사이에 DOM 이 바뀌는 호스트에서
 * 창이 찍힌 것과 다른 판을 가리킨다 — 그리고 **아무도 안 짖는다.**
 *
 * 실물(814 13회차 · `probe814d` [D0]): 50 코스튬 [강화] 워시 봉우리에서 `.sk-clv` Range bbox 가
 * 같은 프레임에 **찍기 전 55.3×21.8 ↔ 찍은 뒤 65.9×26.0**(×1.19)로 갈린다. 뿌리는 팝
 * (`fxCvSwapS` 55% 프레임 `scale(1.18)`)이 `renderUI()` 재렌더로 풀리는 것이고, 애니를 `pause()`
 * 해도 이 호스트는 격자를 통째로 갈아 끼운다(840 머리말). 그 갈림 하나로 같은 프레임의 대비가
 * **3.19:1 ↔ 5.08:1** 로 읽혔다 — 작은 창이 찍힌 잉크의 67.5% 만 담아 **분자(순백 글리프)를
 * 잘라 내기** 때문이다. 회차 하나가 여기에 탔다.
 *
 * ⚑ **플레이키가 아니라 결정적 오측이다** — 같은 트리에서 언제나 같은 값이 나오되 **읽는 시점이
 * 다르면 다른 값**이다. 그래서 «3회 돌려 보기» 로는 안 걸리고, 두 자가 갈릴 때까지 아무도 모른다.
 *
 * ── 이 장치가 하는 일 ────────────────────────────────────────────────────
 * 페이지 안에서 `Element.prototype.getBoundingClientRect` 와 `Range.prototype.getBoundingClientRect`
 * 를 감싸 **건네준 값을 기억**해 두고, `page.screenshot()` 이 불릴 때 그 자리에서 **다시 재서**
 * 건네준 값과 다른 것을 센다. 다르면 그것이 «낡은 읽기» — 찍힌 화소를 가리키지 않는 창이다.
 *
 * 「사용을 안 보고 읽기를 본다」가 설계의 핵심이다. 창으로 «썼는지» 는 노드 밖에서 알 수 없지만,
 * **찍기 전에 건네준 rect 가 찍는 순간 다른 값이면** 그것을 창으로 쓴 자는 예외 없이 틀린다.
 *
 * ── 왜 사본을 안 심나(955 교훈) ──────────────────────────────────────────
 * rect 를 재는 자만 365자다. 자마다 한 줄씩 심으면 402 가 지운 병(사본)을 그만큼 새로 만든다.
 * ⇒ `pwlaunch.launch()` 가 만든 브라우저에 **한 자리**에서 붙는다(settle291·evguard·shell918 과 같은 사슬).
 *
 * ── 켜고 끄기 ────────────────────────────────────────────────────────────
 * 기본은 **꺼짐**이다 — 이것은 상시 게이트가 아니라 **감사자**이고, 모든 rect 호출에 얹히는
 * 비용(자에 따라 수천 회)을 평소에 물 이유가 없다. 켜는 법:
 *     PW_GEO974=1                 → 감사만 하고 요약을 stderr 로
 *     PW_GEO974=<파일 경로>        → 그 파일에 JSON 으로 (스윕이 읽는다)
 * 창 허용 오차는 `PW_GEO974_TOL`(기본 0.75px — 서브픽셀 반올림은 안 세고 팝 변형은 센다).
 *
 * 읽는 법(921 규약): «낡은 읽기 0» 은 «그 자가 안전하다» 가 아니라 **«이 판에서는 안 걸렸다»** 다.
 * 걸린 자는 확실히 병이 있다(양성이 곧 증거) — 음성은 그 판의 성질이다.
 */

/* ---- 페이지 안 본체 — `addInitScript` 로 심는다(켤 때만) ---- */
const REC_SRC = function () {
  if (window.__geo974) return;
  var origE = Element.prototype.getBoundingClientRect;
  var origR = (window.Range && Range.prototype.getBoundingClientRect) || null;
  var rec = [], on = false, depth = 0;
  var MAX = 8000;               /* 한 장 사이의 기억 상한 — 넘으면 그냥 안 센다(멈추지 않는다) */
  /* ⚑⚑ **제품이 부른 rect 는 안 센다 — 이 가름이 없으면 감사자가 배경 잡음에 묻힌다.**
     `drawHud`→`cpRoom`·`fitNum`→`fitRoom` 은 매 프레임 rect 를 부르고 HUD 숫자는 팝
     (`jz-up-n`)까지 걸려 있어서, 안 가르면 «낡은 읽기» 가 자마다 수백 건 나오는데 **그중
     자가 창으로 쓴 것은 하나도 없다**. 가름은 호출 스택이 준다(실측):
       제품  … at cpRoom (file:///…/index.html:29979)      ← `index.html` 이 있다
       자    … at eval (eval at evaluate) / UtilityScript.evaluate ← 없다
     ⚠ 스택을 뜨는 값이 싸지 않아 `stackTraceLimit` 을 4 로 줄인다 — 감사자를 **켰을 때만** 이므로
     평소 자의 예외 보고는 그대로다. */
  try { Error.stackTraceLimit = 4; } catch (_) {}
  function mine() {
    try {
      var s = new Error().stack || '';
      return s.indexOf('index.html') < 0;
    } catch (_) { return false; }
  }
  function push(o, r) {
    if (!on || depth || rec.length >= MAX) return;
    if (!mine()) return;
    rec.push({ o: o, x: r.x, y: r.y, w: r.width, h: r.height, t: performance.now() });
  }
  Element.prototype.getBoundingClientRect = function () {
    var r = origE.call(this); push(this, r); return r;
  };
  if (origR) Range.prototype.getBoundingClientRect = function () {
    var r = origR.call(this); push(this, r); return r;
  };
  function measure(o) {
    /* 감사 자신의 재기는 기억에 안 남긴다(depth) */
    if (o instanceof Element) return origE.call(o);
    if (origR && window.Range && o instanceof Range) return origR.call(o);
    return null;
  }
  function alive(o) {
    try {
      if (o instanceof Element) return o.isConnected !== false;
      var n = o.startContainer || null;
      return !n || n.isConnected !== false;
    } catch (_) { return true; }
  }
  function tag(o) {
    try {
      var e = (o instanceof Element) ? o : (o.startContainer && (o.startContainer.nodeType === 1
        ? o.startContainer : o.startContainer.parentElement));
      if (!e) return '(range)';
      var s = e.tagName.toLowerCase();
      if (e.id) s += '#' + e.id;
      if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\s+/).join('.');
      return ((o instanceof Element) ? '' : 'range→') + s;
    } catch (_) { return '(?)'; }
  }
  window.__geo974 = {
    start: function () { on = true; rec.length = 0; },
    stop: function () { on = false; rec.length = 0; },
    /* 찍는 순간 다시 재서 «건네준 값 ↔ 지금 값» 을 견준다.
       ⚑ **나이로 가른다.** 자를 부팅하는 동안(로딩 막이 걷히고 HUD 숫자가 오르는 사이)에도 rect 는
       수백 건 읽히는데, 그것은 «창» 이 아니라 **준비**다. 창은 «재고 곧바로 찍는» 것이라 나이가 짧다.
       ⇒ `young` = 찍기 직전 `win` ms 안에 읽힌 것 — **이 축이 병이고, 나머지는 배경이다.** */
    audit: function (tol, win) {
      depth++;
      var t = (tol === null || tol === undefined) ? 0.75 : tol;
      var W = (win === null || win === undefined) ? 1500 : win;
      var now = performance.now();
      var stale = 0, young = 0, detached = 0, seen = rec.length, worst = null, sample = [];
      for (var i = 0; i < rec.length; i++) {
        var e = rec[i], r = null;
        if (!alive(e.o)) { detached++; continue; }
        try { r = measure(e.o); } catch (_) { continue; }
        if (!r) continue;
        /* ⚑ **«사라진 노드» 와 «크기가 변한 노드» 는 다른 축이다.** Range 는 DOM 이 바뀌면
           스스로 접히면서(collapse) 컨테이너를 살아 있는 조상으로 올려 잡는다 — `alive()` 가
           못 거르고 0×0 으로 나온다. 그것은 «창이 어긋났다» 가 아니라 «잰 것이 없어졌다» 이고,
           974 가 쫓는 것은 **둘 다 실물인데 값이 갈리는** 쪽이다. */
        if ((r.width === 0 && r.height === 0) && (e.w > 0 || e.h > 0)) { detached++; continue; }
        var d = Math.max(Math.abs(r.x - e.x), Math.abs(r.y - e.y),
                         Math.abs(r.width - e.w), Math.abs(r.height - e.h));
        if (d > t) {
          var age = now - e.t;
          stale++;
          if (age <= W) {
            young++;
            var one = { d: d, age: +age.toFixed(0), tag: tag(e.o),
                        before: [+e.w.toFixed(2), +e.h.toFixed(2), +e.x.toFixed(2), +e.y.toFixed(2)],
                        after: [+r.width.toFixed(2), +r.height.toFixed(2), +r.x.toFixed(2), +r.y.toFixed(2)] };
            if (sample.length < 8) sample.push(one);
            if (!worst || d > worst.d) worst = one;
          }
        }
      }
      rec.length = 0;
      depth--;
      return { reads: seen, stale: stale, young: young, detached: detached, worst: worst, sample: sample };
    },
  };
  window.__geo974.start();
};

function tol() {
  const v = parseFloat(process.env.PW_GEO974_TOL);
  return Number.isFinite(v) ? v : 0.75;
}

/* «창» 으로 볼 나이(ms) — 재고 곧바로 찍는 것만 센다. `PW_GEO974_WIN` 으로 바꾼다. */
function win() {
  const v = parseFloat(process.env.PW_GEO974_WIN);
  return Number.isFinite(v) ? v : 1500;
}

function enabled() {
  const v = process.env.PW_GEO974;
  return !!v && v !== '0';
}

/* ---- 집계 — 프로세스 하나가 여러 페이지를 써도 한 장부에 모인다 ---- */
const ledger = { shots: 0, reads: 0, stale: 0, young: 0, detached: 0, worst: null, sample: [] };

function fold(r) {
  if (!r) return;
  ledger.shots++;
  ledger.reads += r.reads | 0;
  ledger.stale += r.stale | 0;
  ledger.young += r.young | 0;
  ledger.detached += r.detached | 0;
  if (r.worst && (!ledger.worst || r.worst.d > ledger.worst.d)) ledger.worst = r.worst;
  for (const s of r.sample || []) if (ledger.sample.length < 12) ledger.sample.push(s);
}

let reported = false;
function report() {
  if (reported || !enabled()) return;
  reported = true;
  const out = Object.assign({ entry: require('path').basename(process.argv[1] || '') }, ledger);
  const dest = process.env.PW_GEO974;
  if (dest && dest !== '1') {
    try { require('fs').writeFileSync(dest, JSON.stringify(out, null, 1)); } catch (_) {}
  }
  console.error('[geo974] ' + out.entry + ' — 찍기 ' + out.shots + '장 · 읽기 ' + out.reads
    + '건 · **창 나이 안 낡은 읽기 ' + out.young + '건**(전체 낡음 ' + out.stale + ')'
    + (out.detached ? ' · 떨어진 노드 ' + out.detached + '건' : '')
    + (out.worst ? ' · 최악 Δ' + out.worst.d.toFixed(2) + 'px ' + out.worst.tag : ''));
}

async function arm(page) {
  if (!enabled() || page.__geo974) return page;
  page.__geo974 = true;
  try { await page.addInitScript(REC_SRC); } catch (_) { return page; }
  const orig = page.screenshot.bind(page);
  page.screenshot = async (...a) => {
    /* ⚑ **찍기 «직전» 에 감사한다** — 그래야 «건네준 값 ↔ 찍히는 판» 을 견주는 것이 된다 */
    try {
      const r = await page.evaluate(
        (a) => (window.__geo974 ? window.__geo974.audit(a[0], a[1]) : null), [tol(), win()]);
      fold(r);
    } catch (_) {}
    return await orig(...a);
  };
  return page;
}

function armBrowser(browser) {
  if (!enabled() || !browser || browser.__geo974) return browser;
  browser.__geo974 = true;
  const wrapNewPage = (obj) => {
    const orig = obj.newPage.bind(obj);
    obj.newPage = async (...a) => await arm(await orig(...a));
  };
  try { wrapNewPage(browser); } catch (_) {}
  try {
    const origCtx = browser.newContext.bind(browser);
    browser.newContext = async (...a) => {
      const ctx = await origCtx(...a);
      try { wrapNewPage(ctx); } catch (_) {}
      return ctx;
    };
  } catch (_) {}
  process.once('exit', report);
  return browser;
}

module.exports = { REC_SRC, arm, armBrowser, enabled, tol, report, ledger };
