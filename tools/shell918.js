/* 작업 918 — «껍데기가 측정 창을 덮는다» 를 한곳에서 막는 걷개 (공용)
 *
 * # 병 (914 가 이름까지 붙여 찍어 둔 것)
 * `verify463` `[0]` 은 «스타일을 붙였다 뗀 판끼리 화소 차분» 을 세면서
 * **«그 200ms 동안 그림을 바꿀 수 있는 것은 내가 주입한 스타일뿐»** 을 전제한다.
 * 그런데 그 자는 게임 루프를 세우지 않으므로 자동 전투가 그대로 돌고,
 * 스테이지 보스에게 지면 `playerDied()` → `openDefeat()` 가 `#defw`(inset:0 · z39)를 켠다 —
 * 측정 창 한복판에 들면 알약의 **90%** 가 «달라졌다» 로 세어지고(914 §3 · 21,375px),
 * 창 가장자리에 걸치면 112px 이 된다. **언제 지느냐가 실행마다 다른 것**이 곧 플레이키의 기계다.
 *
 * # 왜 자마다 적지 않고 여기인가 (907 교훈 ① · 540 머리말이 이미 예언한 자리)
 * 907 판별기(`raster907` — ① 스타일 태그를 붙였다 뗀다 ② 그 판끼리 화소 차분)를 갖춘 자는
 * 918 착수 시점에 **34개**이고 그중 `closers540` 을 손으로 거는 자는 **3개**뿐이었다
 * (`verify409` · `verify463` · `probe914`). 나머지 **31개**가 463 과 같은 자리에 서 있었다.
 * 31곳에 한 줄씩 흩어 적으면 **빠진 자리를 아무도 안 센다** — 그것이 463 이 409 에서 갈라져
 * 나오며 그 한 줄을 잃고도 아무도 못 셌던 이유다(914 §4). ⇒ 907 깃발·291 정착·731 소실 차단기와
 * **같은 자리**(`pwlaunch.launch()`)에 건다. 조건을 갖춘 자가 새로 생기면 **자동으로 켜지고**,
 * 조건 밖 자의 세상은 **한 칸도 안 바뀐다**.
 *
 * # 무엇을 하나 — 판정은 한 글자도 안 바꾼다
 * 540 이 정한 그대로다: `#defw` 는 닫개 함수가 **없는** 껍데기라 DOM 으로 직접 끈다.
 * 제품 경로(`openDefeat`)는 그대로 불리고(표시 전용 · 자동 부활은 진행 — index.html 24952),
 * 껍데기만 **칠해지기 전에** 걷는다. `MutationObserver` 콜백은 마이크로태스크 체크포인트에서
 * 돌아 **페인트보다 먼저**이므로, 걷은 판은 어느 프레임에도 딤이 안 그려진다.
 * 그리고 **막은 횟수를 센다** — 늘 0 인 팔은 아무것도 증명하지 않는다(LESSONS 353-④).
 *
 * # 대상에서 빼는 자 — «껍데기를 이름으로 말하는 자는 스스로 정한다»
 * `verify356` 은 `open:['js:openDefeat()']` 로 **18 패배 화면을 일부러 열어** 그 안의 아이콘을
 * 잰다(1843·1958행). 여기서 걷어 버리면 그 자가 볼 것이 사라진다. `verify409`·`verify463`·
 * `probe914` 는 이미 `closers540.install(page,{arm:true})` 를 손으로 건다.
 * ⇒ **주석을 걷어낸 소스에 `defw`/`openDefeat`/`playerDied` 가 있으면 자동 걷개는 안 건다.**
 * (이것은 «절반만 풀리는 정적 조건» 이 아니다 — 껍데기를 재거나 여는 자는 그 이름을 **반드시**
 *  적는다. 907 교훈 ③ 이 경계한 것은 «문턱» 처럼 정적으로 못 푸는 값이었다.)
 *
 * # 손잡이
 *  - `PW_SHELL918=0|off`   — 통째로 끈다(되돌림 시험 — `verify918` [R] 이 이걸로 «걷개 없는 세상» 을 짓는다).
 *  - `PW_SHELL918=report`  — **걷지 않고 세기만** 한다(노출 갈래 세기 — `probe918` 이 이걸로 31개를 돈다).
 *                            이 모드에서만 rAF 를 감싸 «루프가 살아 있나» 도 같이 적는다.
 *  - `PW_SHELL918=1|on`    — entry 조건을 무시하고 켠다.
 *  - `SHELL918_LOG=<파일>`  — 판이 닫힐 때 한 줄 JSON 으로 붙여 적는다(entry·모드·본 횟수·막은 횟수·
 *                            `S.playtime` 증가분·벽시계). `probe918` 의 장부가 이 파일이다.
 *
 * 약속을 이름으로 지키는 자는 `tools/verify918.js`, 재현·전수 세기는 `tools/probe918.js` 다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const raster907 = require('./raster907');
const { SHELL_IDS } = require('./closers540');

/* 껍데기를 이름으로 말하는 자 — 스스로 정한다(위 머리말 §대상에서 빼는 자) */
const RE_SELF = /\bdefw\b|openDefeat|playerDied/;

/* entry 파일이 자동 걷개 대상인가 — 순수 함수(브라우저 없이 `verify918` [1] 이 이 규칙을 묻는다) */
const cache = new Map();
function qualifies(entryPath) {
  const p = String(entryPath || '');
  if (!p) return false;
  if (cache.has(p)) return cache.get(p);
  let v = false;
  try {
    const src = fs.readFileSync(p, 'utf8');
    const base = path.basename(p);
    /* 907 과 같은 선 — 연출 캡처 하네스(`cap*.js`)는 조건을 갖춰도 안 건다 */
    v = /^(verify|probe).*\.js$/.test(base)
      && raster907.classifySource(src, base).hit
      && !RE_SELF.test(raster907.stripComments(src));
  } catch (_) { v = false; }
  cache.set(p, v);
  return v;
}

/* 모드 결정 — 환경변수가 entry 규칙을 이긴다(양방향). 순수 함수. */
function mode(ctx) {
  const env = (ctx && ctx.env) || process.env;
  const v = env.PW_SHELL918;
  if (v === '0' || v === 'off') return 'off';
  if (v === 'report') return 'report';
  if (v === '1' || v === 'on') return 'sweep';
  const full = String((ctx && ctx.entry) !== undefined ? ctx.entry : (process.argv[1] || ''));
  if (!full) return 'off';
  const p = (full.includes('/') || full.includes('\\')) ? full : path.join(__dirname, full);
  return qualifies(p) ? 'sweep' : 'off';
}

/* 페이지 안에서 도는 본체 — 껍데기가 `on` 이 되는 순간을 보고, sweep 이면 그 자리에서 걷는다. */
const IN_PAGE_SRC = `(o) => {
  if (window.__shell918) return;
  const st = window.__shell918 = { mode: o.mode, ids: o.ids.slice(), seen: 0, swept: 0,
                                   names: [], base: null, last: null, raf: 0, t0: Date.now() };
  /* «켜졌다» 는 **오르는 모서리**로만 센다 — 딤이 켜진 채 다른 클래스(60 쥬시 \`jz-bg\` 등)가
     붙으면 class 속성이 또 바뀌므로, 그대로 세면 한 사건이 여러 번으로 부풀어 report 모드의
     장부가 «몇 번 노출됐나» 를 못 말한다(실측 — 한 번 켜진 판이 5로 세어졌다). */
  st.prev = {};
  st.sample = () => { try {
    if (typeof S === 'object' && S && typeof S.playtime === 'number') {
      if (st.base === null) st.base = S.playtime;
      st.last = S.playtime;
    }
  } catch (_) {} };
  const hit = t => {
    if (!t || t.nodeType !== 1 || st.ids.indexOf(t.id) < 0) return;
    const on = t.classList.contains('on');
    if (on && !st.prev[t.id]) {
      st.seen++;
      if (st.names.length < 8) st.names.push('#' + t.id);
      if (st.mode === 'sweep') { t.classList.remove('on'); st.swept++; st.prev[t.id] = false; return; }
    }
    st.prev[t.id] = on;
    if (st.sample) st.sample();
  };
  const observe = () => {
    if (st.obs || !document.documentElement) return;
    st.obs = new MutationObserver(ms => { for (const m of ms) hit(m.target); });
    st.obs.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
    st.ids.forEach(id => hit(document.getElementById(id)));
  };
  observe();
  document.addEventListener('DOMContentLoaded', observe);
  document.addEventListener('readystatechange', observe);
  /* «루프가 살아 있나» 는 report 모드에서만 잰다 — 기본(sweep)에서는 rAF 를 한 겹도 안 감싼다. */
  if (st.mode === 'report') {
    const _raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => _raf(t => { st.raf++; st.sample(); return cb(t); });
  }
  window.__shell918stuck = () => st.ids.some(id => {
    const d = document.getElementById(id); return !!d && d.classList.contains('on');
  });
}`;

/* 판이 닫힐 때 남길 한 줄 — `SHELL918_LOG` 가 없으면 아무것도 안 한다. */
function logPath() { return process.env.SHELL918_LOG || ''; }

async function collect(page) {
  try {
    const st = await page.evaluate(() => {
      const s = window.__shell918;
      if (!s) return null;
      if (s.sample) s.sample();
      return { mode: s.mode, seen: s.seen, swept: s.swept, names: s.names.slice(0, 8), raf: s.raf,
               dt: (s.base === null || s.last === null) ? null : +(s.last - s.base).toFixed(2),
               wall: +((Date.now() - s.t0) / 1000).toFixed(1),
               stuck: !!(window.__shell918stuck && window.__shell918stuck()) };
    });
    return st;
  } catch (_) { return null; }
}

async function flush(page) {
  const f = logPath();
  if (!f || !page || page.__shell918done) return;
  page.__shell918done = true;
  const st = await collect(page);
  if (!st) return;
  st.entry = String(process.argv[1] || '').replace(/\\/g, '/').split('/').pop();
  try { fs.appendFileSync(f, JSON.stringify(st) + '\n'); } catch (_) {}
}

/* 페이지 하나에 심는다. 두 번 불러도 한 번만 감싼다. */
async function arm(page, ctx) {
  if (!page || page.__shell918) return page;
  page.__shell918 = true;
  const m = mode(ctx);
  if (m === 'off') return page;
  try {
    await page.addInitScript((o) => { eval(o.src)(o); }, { src: IN_PAGE_SRC, mode: m, ids: SHELL_IDS });
  } catch (_) { /* 이미 네비게이션이 시작됐으면 심을 자리가 없다 */ return page; }
  page.shell918 = () => collect(page);
  if (logPath()) {
    const origClose = page.close.bind(page);
    page.close = async (...a) => { await flush(page); return origClose(...a); };
  }
  return page;
}

/* 브라우저(그리고 그 컨텍스트)가 만드는 모든 페이지에 자동으로 심는다 — 291·731 과 같은 꼴. */
function armBrowser(browser, ctx) {
  if (!browser || browser.__shell918) return browser;
  browser.__shell918 = true;
  const wrapNewPage = obj => {
    const orig = obj.newPage.bind(obj);
    obj.newPage = async (...a) => await arm(await orig(...a), ctx);
  };
  wrapNewPage(browser);
  const origNewCtx = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const c = await origNewCtx(...a);
    wrapNewPage(c);
    return c;
  };
  if (logPath()) {
    const origClose = browser.close.bind(browser);
    browser.close = async (...a) => {
      for (const c of browser.contexts()) for (const p of c.pages()) { try { await flush(p); } catch (_) {} }
      return origClose(...a);
    };
  }
  return browser;
}

module.exports = { IN_PAGE_SRC, RE_SELF, SHELL_IDS, qualifies, mode, arm, armBrowser, collect, flush };
