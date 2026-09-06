/* 작업 683 — 연출 연속 프레임 캡처 하네스 (지시서 [3]-(다): 정지 1장이 아니라 연속 프레임)
 *
 *   node tools/cap683.js [라운드]          기본 r1
 *   node tools/cap683.js [라운드] --scene B   씬 하나만(A · B · AB — 기본 AB)
 *   node tools/cap683.js [라운드] --b-legacy  씬 B 를 **옛 방식**(프레임마다 새 브라우저)으로 —
 *                                            되돌림 시험 전용(`tools/verify975.js` §R), 채점용 아님
 *   → docs/shots/683-<라운드>-<n>.png       (캡처는 커밋 금지 — .gitignore `docs/shots/`)
 *   → 정답표는 stdout 으로 낸다(사람이 읽는 근거는 docs/review/683-*.md 에 옮겨 적는다)
 *
 * 방식은 `cap666.js` 를 그대로 물려받는다(58 31~42회차의 «강제 합성 + 얼리기 네 겹» · 시드 고정 ·
 * 트리거는 실제 사용자 경로 · 시간은 «기다려서» 가 아니라 `currentTime` 으로 «감아서» 맞춘다).
 * ⚠ 바뀐 것은 **무엇을 세는가** 하나다 — 666 은 «버튼에서 터지는 지불 알» 을 셌고, 이 자는
 *   **«획득한 그 유물 카드에서 터지는 획득 알»**(683)을 센다. 두 이미터가 한 화면에 있으므로
 *   정답표는 둘을 **갈라서** 적는다(비평가가 «어느 알을 보고 있는가» 를 헷갈리지 않게).
 *
 * 씬 둘:
 *   A 단발 — 소환 1회. `currentTime` 을 감아 0~340ms 를 여덟 장으로 덮는다(한 궤적의 여덟 시각).
 *   B 연속 — 홀드. 여러 세대가 섞이므로 `currentTime` 감기를 **안 쓴다**(세대마다 시작 시각이
 *     달라 한 값으로 감으면 거짓 그림이 된다) — 실시간으로 홀드하다 그 순간 얼린다.
 *     주인 지시의 후반(«연속소환일때도 그런식으로 되게»)이 이 씬이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

/* ⚑ 975 — 깃발이 생겼으므로 라운드 이름은 «깃발이 아닌 첫 인자» 로 읽는다
   (`node tools/cap683.js --scene B` 가 라운드 이름을 «--scene» 으로 잡는 것을 막는다). */
const ARGV = process.argv.slice(2);
const ROUND = (() => {
  for (let i = 0; i < ARGV.length; i++) {
    if (ARGV[i] === '--scene') { i++; continue; }
    if (ARGV[i].startsWith('--')) continue;
    return ARGV[i];
  }
  return 'r1';
})();
const OUT = path.resolve(__dirname, '../docs/shots');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const STOPS = [0, 40, 80, 130, 180, 240, 290, 340];      /* 씬 A — 666 과 같은 봉투(수명 380ms) */
/* ⚑⚑ 2회차 — 씬 B 의 표본 시각을 **이음매에서 뺐다.** 1회차의 420ms 는 하필
   «첫 발(수명 380ms)이 죽는 시각 ↔ 첫 틱(`TR_HOLD_DELAY` 350ms)이 사는 시각» 의 **틈**이고,
   러너의 타이머가 밀리면 그 틈이 벌어져 **빈 프레임**이 찍힌다(1회차 B1 이 그랬다 —
   비평가 둘이 독립으로 «연출이 통째로 없다» 로 잡았고, `probe683b` 로 찍힌 픽셀을 세어 보니
   당첨 칸 258px vs 정상 발화 8285px 로 **비평가가 옳았다**).
   ⇒ 첫 틱이 확실히 지난 뒤(가속으로 간격이 60~160ms 인 구간)를 고르게 덮는다. */
const HOLDS = [560, 760, 980, 1240];                     /* 씬 B — 홀드 시작 후 실시간 ms */
const SEED = 20260902;

const SEEDFN = sd => {
  let s = sd >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* 페이지 안에서 «지금 보이는 것» 을 센다 — 666 과 같은 가시성 자(불투명도 .06 · 최소변 6px) */
const TALLY = () => {
  /* ⚑⚑ 2회차 — **가시성 문턱을 0.06 → 0.25 로 올렸다.** 1회차의 0.06 은 `.fx-spark` 키프레임이
     끝으로 가며 `opacity:0`·`scale(.62)` 로 사그라든 «거의 안 보이는 잔해» 까지 «보인다» 로 셌다 —
     그래서 정답표가 «획득 6알» 이라고 적은 프레임의 찍힌 픽셀이 258px(정상 8285px 의 3%)였다.
     비평가 둘이 독립으로 그것을 잡았고 `tools/probe683b.js` 가 찍힌 픽셀로 확인했다.
     ⚠ **자가 거짓말하면 정답표가 비평을 오염시킨다** — 이 표는 비평가가 «내가 본 것이 맞나» 를
       대조하는 근거라, 표가 틀리면 회차가 통째로 «계측기부터 고쳐라» 로 끝난다(1회차가 그랬다). */
  const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
    return +cs.opacity > 0.25 && Math.min(bb.width, bb.height) >= 6; };
  const L = [...document.querySelectorAll('#fxl > *')].filter(vis);
  const cls = n => (n.className || '') + '';
  const gain = L.filter(n => /fx-rlic/.test(cls(n)));       /* 683 획득 이미터 */
  const pay  = L.filter(n => /fx-cic/.test(cls(n)));        /* 666 지불 이미터 */
  const flash = L.filter(n => /fx-flash/.test(cls(n)));
  const text = L.filter(n => /fx-plus|fx-delta/.test(cls(n)));
  const bead = L.filter(n => /fx-spark/.test(cls(n)) && !/fx-rlic|fx-cic/.test(cls(n)));
  const w = window.__cap683 || {};
  const card = w.id ? document.querySelector('[data-rw="' + w.id + '"]') : null;
  const cr = card ? card.getBoundingClientRect() : null;
  const br = document.getElementById('rwBasin').getBoundingClientRect();
  const inBox = (n, r, pad) => { if (!r) return false; const b = n.getBoundingClientRect();
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    return cx >= r.x - pad && cx <= r.x + r.width + pad && cy >= r.y - pad && cy <= r.y + r.height + pad; };
  /* 획득 알이 «그 카드» 위에 있는가 / 다른 칸을 침범했는가 */
  const onCard = gain.filter(n => inBox(n, cr, 60)).length;
  let other = 0;
  for (const n of gain) for (const el of document.querySelectorAll('[data-rw]')) {
    if (w.id && el.getAttribute('data-rw') === w.id) continue;
    if (inBox(n, el.getBoundingClientRect(), 0)) { other++; break; }
  }
  const gsz = gain.length ? Math.round(gain.reduce((s, n) => s + n.getBoundingClientRect().width, 0) / gain.length) : 0;
  const glyph = w.ic ? gain.filter(n => (n.textContent || '').trim() === w.ic).length : 0;
  const gsp = (gain.length && cr) ? Math.round(Math.max(...gain.map(n => { const b = n.getBoundingClientRect();
    return Math.hypot(b.x + b.width / 2 - (cr.x + cr.width / 2), b.y + b.height / 2 - (cr.y + cr.height / 2)); }))) : 0;
  const payOut = pay.filter(n => !inBox(n, br, 2)).length;
  /* ⚑ 975 — **알마다 나이(ms)**. 「한 홀드의 연속 네 장」인지는 «몇 알인가» 로는 안 보인다 —
     네 장이 전부 «갓 태어난 틱»(나이 0) 이면 그것이 바로 등재 975 가 잡은 얼굴이다.
     나이는 그 노드에 걸린 애니의 `currentTime` 최댓값으로 잰다(얼려 놓고 재므로 멈춘 값이다). */
  const age = n => {
    /* ⚠ 애니의 `currentTime` 은 «갓 붙은 노드» 에서 아직 null/0 이라 나이를 못 판다(975 1회차 실측 —
       네 프레임이 전부 0). ⇒ 태어난 시각을 **우리가 찍는다**(`#fxl` MutationObserver · open() 참조).
       시계는 얼림을 뺀 시계라 스크린샷에 걸린 1~2초가 나이에 안 섞인다. */
    if (typeof n.__born === 'number') return Math.round(performance.now() - n.__born);
    try { const A = n.getAnimations(); return A.length
      ? Math.round(Math.max(...A.map(a => +a.currentTime || 0))) : -1; } catch (e) { return -1; }
  };
  const ages = gain.map(age).sort((a, b) => a - b);
  /* ⚑ 975 — 「보임」 자(불투명도 0.25)를 통과 못 한 알까지 **DOM 에 몇이 살아 있는가**를 같이 낸다.
     «겹침이 안 보인다» 가 제품 탓인지 이 문턱 탓인지를 표가 스스로 가르게 하려는 것이다. */
  const gainAll = [...document.querySelectorAll('#fxl > *')].filter(n => /fx-rlic/.test(cls(n)));
  const agesAll = gainAll.map(age).sort((a, b) => a - b);
  /* ⚑ 975 — **칸별 보유 레벨**. 꼬리의 «레벨 합» 자기검산 줄은 서로 다른 실행의 합을 견주면
     언제나 그럴듯해서 못 잡는다(CO 가 칸별로 갈라 10칸 중 6칸이 «감소» 하는 것을 찍었다).
     그래서 합만이 아니라 **칸별 벡터**를 같이 낸다 — 한 홀드에서는 어느 칸도 줄 수 없다. */
  let lv = {}, lvSum = -1;
  try {
    lvSum = 0;
    for (const x of RELICS) { const o = S.own[x.id]; const l = o ? (o.l || 0) : 0; lv[x.id] = l; lvSum += l; }
  } catch (e) { lv = {}; lvSum = -1; }
  /* ⚑ 976 — **이 표본이 틱 주기의 어디에 섰나**를 표가 스스로 적는다(두 사법 모두).
     `since` = 직전 소환 틱으로부터의 ms · `iv` = 최근 네 주기의 **실측** 중앙값
     (선언 `h.iv` 60ms 는 이 러너에서 36~603ms 로 흔들려 눈금이 못 된다 — `probe976` [1]). */
  let tick = null;
  try { const T = window.__tick976; if (T && T.at.length) {
    const a = T.at, g = [];
    for (let i = Math.max(1, a.length - 4); i < a.length; i++) g.push(a[i] - a[i - 1]);
    g.sort((x, y) => x - y);
    tick = { n: a.length, since: Math.round(performance.now() - a[a.length - 1]),
             iv: g.length ? g[Math.floor(g.length / 2)] : 0, eggs: T.egg.length };
  } } catch (e) {}
  return { tick, gain: gain.length, onCard, other, glyph, gsz, gsp, ages, lv, lvSum,
           gainAll: gainAll.length, agesAll, page: window.__capPage || '?',
           pay: pay.length, payOut, bead: bead.length, text: text.length, flash: flash.length,
           id: w.id || '', ic: w.ic || '', name: w.name || '',
           card: cr ? { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) } : null };
};

/* ⚑⚑ 2회차 신설 — **찍힌 픽셀을 표에 같이 적는다**(350 처방 · `probe683b` 와 같은 방법).
   DOM 을 세는 자와 «화면에 칠해진 것» 이 갈릴 수 있다는 것을 1회차가 비싸게 배웠다 ⇒
   정답표가 스스로를 검산하게 만든다: 방금 찍은 PNG 를 페이지로 되돌려 당첨 카드 상자 안의
   밝은 잉크 픽셀을 센다. «획득 알 N» 과 이 값이 같이 0 이거나 같이 크지 않으면 표가 거짓이다. */
/* ⚑ 3회차 — 재는 상자를 **카드 + 24px** 로 넓혔다. `RW_GAIN_R1` 80 이면 알이 카드 테(75.5) 밖으로
   나가므로 카드 상자만 세면 «퍼진 뒤» 프레임이 되레 작아 보인다(A6·A7). 24 인 이유는 이웃 칸의
   가까운 변이 중심에서 100.5px 이라 75.5 + 24 = 99.5 가 이웃을 안 물고 잡을 수 있는 최대치다. */
const EXP = 24;
const grow = b => b && { x: Math.max(0, b.x - EXP), y: Math.max(0, b.y - EXP), w: b.w + 2 * EXP, h: b.h + 2 * EXP };

async function paintedPx(p, file, box) {
  if (!box) return -1;
  const url = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  return await p.evaluate(async ({ url, b }) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(b.x, b.y, b.w, b.h).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] > 200) n++;
    }
    return n;
  }, { url, b: box });
}

/* ⚑⚑ 3회차 신설 — **기준선.** 2회차의 «찍힌 잉크 px» 는 카드 상자 안 밝은 픽셀을 통째로 세서
   **카드 자기 아이콘까지** 포함했다(비평가 지적: «A8 은 0알인데 7,030px — 그 열은 파티클을 못 가려낸다»).
   ⇒ 연출이 하나도 없는 정착 화면을 한 장 찍어 **칸마다** 기준선을 만들고, 표에는 **Δ(그 프레임 − 기준선)**
   을 적는다. 그러면 «알이 0인데 값이 크다» 가 구조적으로 안 나온다. */
async function baseline() {
  const { b, p } = await open(SEED);
  await p.evaluate(() => {
    try { document.getAnimations().forEach(a => { a.pause(); try { a.finish(); } catch (_) { a.currentTime = 1e7; } }); } catch (e) {}
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  });
  const boxes = await p.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('#rwGrid [data-rw]')) {
      const r = el.getBoundingClientRect();
      out[el.getAttribute('data-rw')] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }
    return out;
  });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '683-' + ROUND + '-base.png');
  await p.screenshot({ path: file });
  const out = {};
  for (const k of Object.keys(boxes)) out[k] = await paintedPx(p, file, grow(boxes[k]));
  await b.close();
  try { fs.unlinkSync(file); } catch (e) {}
  return out;
}

const FREEZE = () => {
  window.requestAnimationFrame = () => 0;
  try { const ids = window.__capIds; if (ids) { ids.t.forEach(clearTimeout); ids.i.forEach(clearInterval); } } catch (e) {}
  window.setTimeout = () => 0; window.setInterval = () => 0;
};

/* ⚑⚑ 975 — **페이지마다 유일한 표.** 「네 프레임이 정말 한 홀드인가」를 값·시각으로 «추정» 하지 말고
   **못박는다**: 페이지가 열릴 때 Node 가 유일한 표를 심고, 정답표 꼬리가 네 프레임의 표를 나란히 적는다.
   한 홀드면 넷이 같고, 프레임마다 브라우저를 새로 열면(등재 975 의 옛 방식) 넷이 전부 다르다.
   ⚠ 시드 안에서 만든 난수로는 이 표를 못 만든다 — 시드가 같으니 «다른 페이지» 도 같은 값이 나온다. */
let PAGE_N = 0;
async function open(sd) {
  const pid = 'pg' + (++PAGE_N) + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(({ s, pid }) => {
    try { localStorage.clear(); } catch (e) {}
    window.__capPage = pid;
    const _st = window.setTimeout, _si = window.setInterval, _ct = window.clearTimeout,
          _raf = window.requestAnimationFrame.bind(window);
    const ids = { t: new Set(), i: new Set() };
    window.__capIds = ids;
    /* ⚑⚑ 975 — **되돌릴 수 있는 얼림.** 종전 `FREEZE()` 는 타이머를 통째로 지워서 한 번 얼리면
       그 페이지는 죽는다(그래서 씬 B 가 프레임마다 브라우저를 새로 열었고, 네 장이 «한 홀드» 가
       아니게 됐다 — 등재 975). 여기서는 지우는 대신 **미룬다**: 얼어 있는 동안 도착한 콜백은
       자기를 16ms 뒤로 다시 걸고, 녹으면 그대로 이어서 뛴다. 시계(`performance.now`/`Date.now`)도
       얼어 있는 만큼 빼서 «얼린 시간은 흐르지 않은 것» 으로 만든다 — 그래야 스크린샷에 걸린
       1~2초가 홀드의 틱 간격(60~160ms)을 오염시키지 않는다.
       ⚠ `clearTimeout` 도 같이 갈아야 한다 — 미루면서 id 가 바뀌므로 원래 id 로 끄면 안 꺼진다. */
    let frozen = false, frzAt = 0, frzTot = 0;
    const _pn = performance.now.bind(performance), _dn = Date.now;
    const off = () => frzTot + (frozen ? _pn() - frzAt : 0);
    performance.now = () => _pn() - off();
    Date.now = () => _dn() - Math.round(off());
    const remap = new Map();
    window.setTimeout = function (fn, ms) {
      if (typeof fn !== 'function') return _st.apply(window, arguments);
      const a = [].slice.call(arguments, 2);
      let id;
      const wrap = function () {
        if (frozen) { const nid = _st(wrap, 16); ids.t.add(nid); remap.set(id, nid); return; }
        remap.delete(id); fn.apply(window, a);
      };
      id = _st(wrap, ms); ids.t.add(id); remap.set(id, id); return id;
    };
    window.clearTimeout = function (id) {
      const cur = remap.has(id) ? remap.get(id) : id; remap.delete(id); return _ct(cur);
    };
    window.setInterval = function (fn, ms) {
      if (typeof fn !== 'function') return _si.apply(window, arguments);
      const a = [].slice.call(arguments, 2);
      const id = _si(function () { if (frozen) return; fn.apply(window, a); }, ms);
      ids.i.add(id); return id;
    };
    window.requestAnimationFrame = function (cb) {
      return _raf(function (ts) { if (frozen) { window.requestAnimationFrame(cb); return; } cb(ts); });
    };
    /* 얼림 = 미루기 + **뛰던 애니만** 멈춤(멈춰 있던 것을 나중에 잘못 되살리지 않게 목록에 담는다) */
    window.__capFreeze = function () {
      if (frozen) return -1;
      frozen = true; frzAt = _pn();
      const held = [];
      try { document.getAnimations().forEach(a => { if (a.playState === 'running') { a.pause(); held.push(a); } }); } catch (e) {}
      window.__capHeld = held;
      return held.length;
    };
    window.__capResume = function () {
      if (!frozen) return -1;
      frzTot += _pn() - frzAt; frozen = false;
      const held = window.__capHeld || []; window.__capHeld = [];
      held.forEach(a => { try { a.play(); } catch (e) {} });
      return held.length;
    };
    window.__capFrozenMs = () => Math.round(frzTot);
    let q = s >>> 0;
    Math.random = function () {
      q |= 0; q = (q + 0x6D2B79F5) | 0;
      let t = Math.imul(q ^ (q >>> 15), 1 | q);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, { s: sd, pid });
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.relic = 250000; S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
    try { RELICS.slice(0, 4).forEach(r => { S.own[r.id] = { n: 0, l: 3 }; }); } catch (e) {}
    /* 당첨 유물을 기록해 둔다 — 정답표·비평 프롬프트가 «어느 칸을 보라» 를 말할 수 있게 */
    window.__cap683 = {};
    /* ⚑ 976 — **틱 시각·간격을 페이지가 스스로 적는다.** 위상을 고르려면(아래 `sceneB`) «방금 틱이
       언제였고 다음 틱까지 얼마인가» 를 페이지 안에서 알아야 한다. `rwSummonFx(it, first, iv)` 의
       `iv` 가 바로 **다음 틱까지의 간격**이다 — `rwHoldTick` 이 `h.iv` 를 먼저 갱신해서 넘기고
       같은 값으로 타이머를 건다(index.html `rwHoldTick`). `js` 는 그 틱의 JS 버스트 길이다
       (표본이 «틱 직후» 로 쏠리는 기계를 설명하는 값 — 등재 976). */
    window.__tick976 = { at: [], iv: [], js: [], first: [], mo: [], egg: [] };
    const o = window.rwSummonFx;
    window.rwSummonFx = function (it, first, iv) {
      if (it) { window.__cap683.id = it.id; window.__cap683.ic = it.ic; window.__cap683.name = it.n; }
      const T = window.__tick976, t0 = performance.now();
      T.at.push(Math.round(t0)); T.iv.push(Math.round(iv || 0)); T.first.push(!!first);
      const r = o.apply(this, arguments);
      T.js.push(Math.round(performance.now() - t0));
      return r;
    };
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    openRelw();
    /* ⚑ 975 — **알이 태어난 시각을 찍는다.** 정답표의 «나이(ms)» 열이 이 값을 읽는다(TALLY `age()`).
       MutationObserver 는 마이크로태스크라 얼림(타이머 미루기)과 무관하게 정확하다. */
    const FXL = document.getElementById('fxl');
    if (FXL) new MutationObserver(ms => {
      const t = Math.round(performance.now());
      for (const m of ms) for (const n of m.addedNodes) {
        try { n.__born = performance.now(); } catch (e) {}
        /* ⚑ 976 — **획득 알이 태어난 시각**을 따로 적는다. 975 가 본 «나이 최솟값» 은 소환 틱이 아니라
           이 목록의 마지막 값에서 잰 나이다 — 둘이 같은 수가 아니라는 것이 976 의 답이다. */
        try { const T = window.__tick976;
          if (T && /fx-rlic/.test((n.className || '') + '')) T.egg.push(t); } catch (e) {}
      }
      /* ⚑ 976 — 무더기는 **한 시각**으로 접는다(문턱 25ms — 가장 짧은 틱 간격 `TR_HOLD_IVMIN` 60ms 의
         절반 아래라 서로 다른 틱을 접을 수 없다). 위 `rwSummonFx` 훅과 **서로 다른 두 자**이고,
         둘이 같은 수를 내는지가 곧 자기검산이다(`probe976` [1] — 실측은 안 같고, 그게 결론이다). */
      try { const T = window.__tick976; if (T) {
        if (!T.mo.length || t - T.mo[T.mo.length - 1] > 25) T.mo.push(t); } } catch (e) {}
    }).observe(FXL, { childList: true });
  });
  await p.waitForTimeout(600);
  await p.waitForFunction(() => document.querySelectorAll('#fxl > *').length === 0, null, { timeout: 5000 }).catch(() => {});
  return { b, p, errs };
}

/* 씬 A — 단발. 트리거 직전에 난수를 다시 심어 여덟 장이 «한 궤적의 여덟 시각» 이 되게 한다(666 5회차) */
async function shotA(T, idx) {
  const { b, p, errs } = await open(SEED);
  const info = await p.evaluate(async ({ T, sd, tally, freeze, seedfn }) => {
    Math.random = eval('(' + seedfn + ')')(sd);
    const el = document.getElementById('rwBasin');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    eval('(' + freeze + ')')();
    /* ⚑⚑ 3회차 — **감는 대상을 연출 레이어로 좁혔다.** 2회차는 `getAnimations()` **전부**에
       `currentTime = T` 를 걸어서, 격자 카드의 «등장» 애니까지 t=T 로 **되감겼다** ⇒ t=0·40ms 프레임에
       카드 아이콘·«Lv.n» 이 아직 안 그려진 채 알만 만개한 그림이 찍혔다. 비평가 **둘이 독립으로**
       그것을 «버스트가 제 숙주보다 130ms 먼저 켜진다» 로 감점했는데 **제품이 아니라 하네스가 만든 그림**이다
       (`probe683b` 로 이웃 칸을 세어 보면 A1·A2 에서 이웃 카드 잉크가 0px = 격자가 통째로 덜 그려졌다).
       ⇒ `#fxl` 안(연출)만 T 로 감고, **나머지는 «끝난 상태» 로 보낸다**(무한 반복이라 `finish()` 가
       던지면 큰 값으로 감아 정착시킨다). 58 36회차의 «캡처가 시각을 흐리면 정답표가 거짓» 의 반대편 —
       **연출 아닌 것까지 같이 흐리면 배경이 거짓**이 된다. */
    let at = 0;
    try {
      document.getAnimations().forEach(a => {
        const tg = a.effect && a.effect.target;
        const inFx = !!(tg && tg.closest && tg.closest('#fxl'));
        a.pause();
        try {
          if (inFx) { a.currentTime = T; at = T; }
          else { try { a.finish(); } catch (_) { a.currentTime = 1e7; } }
        } catch (e) {}
      });
    } catch (e) {}
    return Object.assign({ at: Math.round(at) }, eval('(' + tally + ')')());
  }, { T, sd: SEED, tally: TALLY.toString(), freeze: FREEZE.toString(), seedfn: SEEDFN.toString() });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '683-' + ROUND + '-A' + idx + '.png');
  await p.screenshot({ path: file });
  const px = await paintedPx(p, file, grow(info.card));
  await b.close();
  return { T, file, info, px, errs: errs.length };
}

/* 씬 B — 연속(홀드). **한 번의 `open()` 안에서, 끊지 않은 한 홀드의 네 시각을 이어서 찍는다.**
   ⚠⚠ **등재 975 가 잡은 하네스 결함** — 종전 판은 표본마다 `open(SEED)` 로 **브라우저를 새로
     열어** 「홀드 → T ms → 얼림」을 네 번 독립으로 돌렸다. 시드가 같으니 얼는 위상도 늘 같은
     자리(«갓 태어난 틱»)에 떨어져 **세 프레임이 픽셀까지 같았고**(비평 CN·CO 독립 실측 —
     용의 심장 카드 상자 22,801px 에서 차이 0), 그러면 ①(«홀드에서 틱마다 새로 터지는가»)도
     §3-4(«앞 틱의 알이 수명 끝까지 산다» 의 겹침)도 **한 프레임도 못 보여 준다.**
     꼬리의 «레벨 합» 자기검산 줄조차 서로 다른 실행의 합을 견주던 줄이라 언제나 그럴듯했다.
   ⚠ 5회차가 이 길을 한 번 포기했던 이유는 **얼리기를 잃기 때문**이었다 — 스크린샷 한 장에
     1~2초가 걸리고 그동안 홀드가 계속 돌면 «DOM 을 센 표» 와 «찍힌 그림» 이 어긋난다.
   ⇒ 975 는 둘을 다 지킨다: 얼림을 **되돌릴 수 있게** 만들었다(위 `__capFreeze`/`__capResume` —
     타이머를 지우는 대신 미루고, 시계는 얼어 있는 만큼 빼고, 뛰던 애니만 멈췄다 되살린다).
     프레임마다 «얼림 → 표 → 스크린샷 → 녹임» 이라 표와 그림은 같은 순간이고, 얼려 있던 1~2초는
     페이지 시계에 안 흐르므로 틱 간격(60~160ms)도 안 오염된다.
   ⇒ 검산은 셋이다: ① 실측 t 증가 ② **칸별** 보유 레벨이 한 칸도 안 줄고 합은 늘어난다
     ③ 프레임 쌍 중 픽셀 동일 0쌍. 셋 다 «한 홀드» 가 아니면 즉시 깨진다.
   ⚠ `--b-legacy` 는 **옛 방식(프레임마다 새 브라우저)** 을 그대로 남겨 둔 것이다 — 되돌림 시험
     전용(`tools/verify975.js` §R)이고 채점용 캡처에 쓰면 안 된다. */
const LEGACY_B = process.argv.includes('--b-legacy');
/* ⚠ 976 — `--b-nophase` 는 **얼리는 순간만** 975 방식(폴링이 떨어진 자리)으로 되돌린다.
   되돌림 시험 전용(`tools/verify976.js` §R)이고 채점용 캡처에 쓰면 안 된다. */
const NOPHASE = process.argv.includes('--b-nophase');

/* 한 홀드 안에서 «페이지 시각 T» 까지 실시간으로 누르고 있는다.
   ⚠ 시각의 기준은 **페이지 시계**여야 한다(Node 쪽 `Date.now()` 로 세면 CDP 왕복·스크린샷이
     통째로 섞인다 — 975 1회차 실측: 목표 760ms 표본이 페이지 시계로 1,619ms 였고, 그 다음
     표본은 대기가 **0ms** 로 접혀 B2↔B3 이 화소까지 같아졌다 = 고치려던 병이 그대로 재발).
   ⚠ 그렇다고 촘촘히 폴링하면 그 왕복이 페이지 이벤트 루프를 굶겨 **틱이 안 돈다**
     (실측: 1208ms 눌렀는데 소환 2회). ⇒ **60ms 통째 대기 한 번 = 읽기 한 번**으로 묶는다
     (`touchMove` 와 같은 빈도라 굶기는 이미 감당하던 부하 안이다). */
const PAGE_MS = () => Math.round(performance.now() - (window.__capT0 || 0));

/* ⚑ 975 — **눈금은 «절대 시각» 이 아니라 «앞 표본으로부터의 간격» 으로 잡는다.**
   pointerdown 뒤 첫 읽기까지 이 환경에서 0.5~1.2초가 들고(첫 소환 버스트의 렌더가 주범 · 실행마다
   흔들린다), 절대 눈금으로 세면 그 아래 칸이 전부 «이미 지났다» 로 접혀 **네 장이 80ms 안에 몰린다**
   — 그러면 고치려던 «두 장이 화소까지 같다» 가 그대로 되돌아온다(975 1회차 실측 B3↔B4 차이 0).
   ⇒ 선언 눈금에서 **간격만**(200·220·260ms) 꺼내 쓰고, 다음 목표는 **직전 표본의 실측 t + 간격**이다.
   틱 간격이 최대 160ms 이므로 200ms 간격이면 표본 사이에 반드시 새 틱이 있고, 앞 세대는 그만큼 늙는다.
   ⚠ 밀린 양을 숨기지 않는다 — 꼬리에 «선언 → 실제» 를 같이 적는다. */
const GAPS = HOLDS.slice(1).map((h, i) => h - HOLDS[i]);
async function holdUntil(p, cdp, c, target) {
  let e = await p.evaluate(PAGE_MS);
  while (e < target) {
    await p.waitForTimeout(Math.max(20, Math.min(60, target - e)));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
      touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    e = await p.evaluate(PAGE_MS);
  }
  return e;
}

async function frame(p, info, tag, idx) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '683-' + ROUND + '-' + tag + idx + '.png');
  await p.screenshot({ path: file });
  const px = await paintedPx(p, file, grow(info.card));
  return { file, px };
}

const FREEZE_TALLY = ({ tally }) => {
  const held = window.__capFreeze();
  const r = eval('(' + tally + ')')();
  r.at = Math.round(performance.now() - (window.__capT0 || 0));
  r.held = held;
  return r;
};

/* ⚑⚑ 976 — **표본을 «틱 주기의 어디서» 뜨는지 우리가 고른다.**
   975 까지의 표본은 「Node 가 폴링하다 목표 시각을 넘으면 그 자리에서 `evaluate` 로 얼린다」였다.
   그 순간은 우리가 고른 시각이 아니라 **러너 왕복이 떨어진 자리**이고, 재 보니 틱 직후에 쏠린다
   (`probe976` — 지금 방식 위상 중앙값 3.5% · 첫 사분면 12/12). 그러면 네 장이 늘 «갓 태어난 알»
   국면만 보여 주므로 683 ① 「틱마다 새로 터지는가」를 **고르게** 볼 수 없다.
   ⇒ 얼리는 시각을 **페이지 안에서** 정한다: 다음 틱을 기다렸다가 그 틱의 `iv`(= 다음 틱까지의
   간격) 의 `frac` 만큼 지난 뒤 얼린다. Node 왕복이 위상에 안 섞인다(왕복은 «기다리는 동안» 이지
   «얼리는 순간» 이 아니다).
   ⚠ **사양을 굳히는 것이 아니다**(232-① · 등재 976) — 「겹침이 몇 알인가」는 제품의 값이고 683
     채점이 볼 축이다. 이 자는 «위상을 고르게 덮었는가» 만 말한다.
   ⚠ 틱이 안 오면(홀드가 끊겼다·팝업이 닫혔다) `wait` ms 뒤 **그 자리에서** 얼리고 `ph.ms = -1` 로
     밝힌다 — 조용히 옛 자리로 돌아가면 그것이 헛초록이다. */
/* ⚠ **«주기의 몇 %» 로 겨누는 길은 이 러너에서 막혀 있다**(976 1회차에 실제로 해 보고 버렸다) —
   선언 60ms 가 실측 21~652ms 로 흔들려 «주기» 라는 눈금 자체가 매 틱 달라지고, 추정에서 뽑은
   목표는 실측 위상 0.43~0.99 로 흩어졌다(겨눈 0.125 가 43% 에 떨어졌다). ⇒ 겨누는 값을
   **소환 뒤 절대 ms** 로 바꿨다: 「이 프레임은 그 알이 태어난 지 X ms 인 순간」이다.
   눈금 넷은 알 수명(`RW_GAIN` 380ms · 666 봉투)을 네 토막으로 덮는다. */
const PHASE_MS = [10, 40, 100, 200];
const PHASE_FREEZE_TALLY = ({ tally, off, wait }) => new Promise(res => {
  const T = window.__tick976 || { at: [] };
  const n0 = T.at.length, t0 = performance.now();
  const grab = ph => {
    const held = window.__capFreeze();
    const r = eval('(' + tally + ')')();
    r.at = Math.round(performance.now() - (window.__capT0 || 0));
    r.held = held; r.ph = ph;
    res(r);
  };
  /* **닻을 옮기지 않는다.** 겨누는 것은 «마지막 틱으로부터» 가 아니라 «이 틱이 낳은 알의 나이» 라,
     기다리는 사이에 새 틱이 와도 그대로 기다린다 — 그 새 틱들이 곧 683 이 보고 싶어 하는 «겹침» 이다
     (몇 개가 겹치는지는 제품의 값이고 이 자는 안 정한다 · 232-①). 그 수를 `newTicks` 로 밝힌다. */
  let anchor = -1;
  const spin = () => {
    if (anchor < 0 && T.at.length > n0) anchor = T.at.length - 1;
    if (anchor >= 0) {
      const d = performance.now() - T.at[anchor];
      if (d >= off) return grab({ ms: Math.round(d), off, k: anchor, late: false,
                                 newTicks: T.at.length - 1 - anchor });
      if (performance.now() - t0 > wait) return grab({ ms: Math.round(d), off, k: anchor, late: true,
                                 newTicks: T.at.length - 1 - anchor });
      return setTimeout(spin, Math.max(2, Math.min(8, off - d)));
    }
    if (performance.now() - t0 > wait) return grab({ ms: -1, off, k: -1, late: true, newTicks: 0 });
    setTimeout(spin, 4);
  };
  spin();
});

/* 새 방식 — 한 브라우저, 한 홀드, 네 프레임 */
async function sceneB() {
  const { b, p, errs } = await open(SEED);
  const el = await p.$('#rwBasin');
  const bb = await el.boundingBox();
  const cdp = await p.context().newCDPSession(p);
  const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  /* ⚑ 시작 시각은 **페이지가 pointerdown 을 받은 순간**이다 — 종전처럼 touchStart 를 «보내기 전»
     에 찍으면 첫 CDP 입력의 왕복(실측 1~2초)이 통째로 t 에 섞여 «560ms 표본» 이 2,597ms 로 찍힌다. */
  await p.evaluate(() => {
    window.__capT0 = 0;
    document.getElementById('rwBasin').addEventListener('pointerdown',
      () => { if (!window.__capT0) window.__capT0 = performance.now(); }, true);
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  const out = [];
  let target = HOLDS[0];
  for (let i = 0; i < HOLDS.length; i++) {
    const last = await holdUntil(p, cdp, c, target);
    /* ⚑⚑ 976 — **얼리는 순간을 우리가 고른다.** 종전(NOPHASE)은 「Node 폴링이 목표를 넘은 그 자리」라
       표본이 **알이 갓 태어난 자리에 몰렸다**(`probe976` 실측 — 나이 ≤5ms 가 5/16 = 31%, 고르면 4%).
       ⇒ 다음 틱을 기다렸다가 그 틱의 «최근 실측 주기 × frac» 만큼 지난 뒤 페이지 안에서 얼린다.
       ⚠ 이것은 **사양이 아니다** — 「알이 몇 개 겹쳐 있어야 하는가」는 제품의 값이고 683 채점의 몫이다.
         이 자가 고치는 것은 «네 장이 주기의 같은 자리만 본다» 는 표본 쪽 결함뿐이다(등재 976). */
    const info = NOPHASE
      ? await p.evaluate(FREEZE_TALLY, { tally: TALLY.toString() })
      : await p.evaluate(PHASE_FREEZE_TALLY,
          { tally: TALLY.toString(), off: PHASE_MS[i % PHASE_MS.length], wait: 900 });
    if (process.env.CAP683_DEBUG) console.error('[dbg] B' + (i + 1) + ' target=' + target + ' lastPoll=' + last + ' at=' + info.at);
    const { file, px } = await frame(p, info, 'B', i + 1);
    await p.evaluate(() => window.__capResume());
    out.push({ T: target, file, info, px, errs: errs.length });
    if (i < GAPS.length) target = info.at + GAPS[i];   /* 다음 목표 = 직전 «실측» + 간격 */
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
  await b.close();
  return out;
}

/* 옛 방식(되돌림 시험 전용) — 표본마다 브라우저를 새로 연다 = 「네 번의 독립 실행」 */
async function sceneBLegacy() {
  const out = [];
  for (let i = 0; i < HOLDS.length; i++) {
    const { b, p, errs } = await open(SEED);
    const el = await p.$('#rwBasin');
    const bb = await el.boundingBox();
    const cdp = await p.context().newCDPSession(p);
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    await p.evaluate(() => {
      window.__capT0 = 0;
      document.getElementById('rwBasin').addEventListener('pointerdown',
        () => { if (!window.__capT0) window.__capT0 = performance.now(); }, true);
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const T = HOLDS[i];
    await holdUntil(p, cdp, c, T);
    const info = await p.evaluate(FREEZE_TALLY, { tally: TALLY.toString() });
    const { file, px } = await frame(p, info, 'B', i + 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
    await b.close();
    out.push({ T, file, info, px, errs: errs.length });
  }
  return out;
}

/* ⚑ 975 — «나이(ms)» 한 칸을 늘렸다(줄과 머리글을 **같이** 고친다 — 753 정정의 교훈).
   빈 목록은 `–`, 애니를 못 읽은 알은 `?` 로 적는다(0 으로 적으면 «갓 태어남» 과 못 가른다). */
const ageCell = a => (!a || !a.length) ? '–' : a.map(x => x < 0 ? '?' : x).join('·');
const row = (tag, i, r) => '| ' + tag + (i + 1) + ' | ' + r.T + ' | ' + r.info.name + ' ' + r.info.ic
  + ' | ' + JSON.stringify(r.info.card) + ' | ' + r.info.gain + ' | ' + ageCell(r.info.ages)
  + ' | ' + r.info.onCard + ' | ' + r.info.other
  + ' | ' + r.info.glyph + ' | ' + (r.info.at != null && r.info.at >= 0 ? r.info.at : r.T) + ' | ' + r.info.gsz + 'px | ' + r.info.gsp + 'px | ' + r.dpx
  + ' | ' + r.info.pay + ' | ' + r.info.bead + ' | ' + r.info.text + ' | ' + r.info.flash + ' |';

/* ⚑ 975 — 프레임 쌍의 **픽셀 동일** 여부. 「한 홀드의 연속 네 장」이라면 두 장이 화소까지 같을 수
   없다(등재 975 의 얼굴이 바로 그것이었다). 새 의존을 안 들이려고 `paintedPx` 와 같은 방법으로
   페이지 안 캔버스에서 센다. */
async function diffPx(p, fa, fb) {
  const ua = 'data:image/png;base64,' + fs.readFileSync(fa).toString('base64');
  const ub = 'data:image/png;base64,' + fs.readFileSync(fb).toString('base64');
  return await p.evaluate(async ({ ua, ub }) => {
    const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u; });
    const [a, b] = await Promise.all([load(ua), load(ub)]);
    if (a.width !== b.width || a.height !== b.height) return -1;
    const mk = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, img.width, img.height).data; };
    const da = mk(a), db = mk(b);
    let n = 0;
    for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) n++;
    return n;
  }, { ua, ub });
}

const SCENE = (() => { const i = process.argv.indexOf('--scene'); return i > 0 ? (process.argv[i + 1] || 'AB').toUpperCase() : 'AB'; })();

/* ⚑ 976 — 이 파일은 **실행도 되고 require 도 된다.** `probe976` 이 「지금 방식 ↔ 위상 지정」을
   견주려면 이 자의 `open()`·`holdUntil()` 을 **그대로** 써야 한다(사본을 뜨면 재는 대상이 사본이
   되어 «자를 재는 자» 가 거짓이 된다 — 402 «사본을 지운다»). 그래서 아래 본체는 직접 실행일
   때만 돈다. */
async function main() {
  const BASE = await baseline();
  const A = [], B = [];
  if (SCENE.includes('A')) for (let i = 0; i < STOPS.length; i++) A.push(await shotA(STOPS[i], i + 1));
  if (SCENE.includes('B')) B.push(...(LEGACY_B ? await sceneBLegacy() : await sceneB()));
  /* 기준선을 빼서 «파티클·플래시가 더한 잉크» 만 남긴다(위 baseline 머리말) */
  for (const r of A.concat(B)) {
    const b0 = BASE[r.info.id];
    r.dpx = (Number.isFinite(b0) && Number.isFinite(r.px)) ? (r.px - b0) : r.px;
  }
  console.log('\n# 683 ' + ROUND + ' 정답표 (시드 ' + SEED + ')');
  console.log('\n«획득» = 683 이 신설한 획득 이미터(`.fx-rlic`, 원점 = 획득 유물 카드)');
  console.log('«지불» = 666 의 지불 이미터(`.fx-cic`, 원점 = 소환 버튼) — 이 작업이 안 건드린 축\n');
  /* ⚠ 753 정정 — **머리글과 줄의 차례가 어긋나 있었다**(5회차가 «실측 t» 를 줄의 9번째로 찍으면서
     머리글에는 5번째로 적었다). 그러면 «다른 칸 침범 1 · 글리프 일치 0» 같은 **거짓 읽기**가 나온다
     (실제 값은 «침범 0 · 일치 1» 이었다). 683 이 다섯 번 배운 «표와 그림 중 하나가 거짓이면 표부터
     의심하라»(LESSONS 666-⑧)가 이 표 자신에게 걸린 자리라, 머리글을 줄의 차례에 맞춘다. */
  console.log('| # | t(ms) | 당첨 유물 | 당첨 카드 상자 | 획득 알 | 나이(ms) | 그 카드 위 | 다른 칸 침범 | 글리프 일치 | 실측 t | 평균 크기 | 최대 반경 | **찍힌 잉크 Δpx** | 지불 알 | 구슬 | 글자 | 플래시 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  A.forEach((r, i) => console.log(row('A', i, r)));
  B.forEach((r, i) => console.log(row('B', i, r)));
  console.log('\nA = 단발(트리거 = 0ms · `currentTime` 으로 감은 정확한 시각) · B = 연속 홀드(한 브라우저·한 홀드의 실시간 ms)');
  const c = (A[0] || B[0]).info.card;
  console.log('당첨 카드 상자: ' + JSON.stringify(c));
  console.log('기준선(연출 0인 정착 화면, 칸별 밝은 px): ' + JSON.stringify(BASE));
  /* ⚑⚑ 975 — **자기검산 세 줄.** 종전의 «레벨 합» 한 줄은 서로 다른 실행의 합을 견주는 줄이라
     네 장이 독립이어도 그럴듯했다(등재 975). ⇒ ① 실측 t 증가 ② 칸별 레벨 비감소 + 합 증가
     ③ 프레임 쌍 픽셀 동일 0쌍 — 셋 다 «한 홀드» 가 아니면 즉시 깨진다.
     ⚠ 판정을 말로 적지 말고 **값과 함께** 적는다(58 38회차 «흐리게 잴 바에는 흐린 값을 밝혀라»). */
  if (B.length) {
    const at = B.map(r => r.info.at);
    const upT = at.every((v, i) => i === 0 || v > at[i - 1]);
    console.log('씬 B 실측 t(한 홀드 = 증가해야 한다): ' + at.join(' → ') + ' — ' + (upT ? '증가 ✅' : '**깨짐 ❌**'));
    const sum = B.map(r => r.info.lvSum);
    const upSum = sum.every((v, i) => i === 0 || v >= sum[i - 1]) && sum[sum.length - 1] > sum[0];
    console.log('씬 B 보유 유물 레벨 합(한 홀드 = 단조 증가여야 한다): ' + sum.join(' → ')
      + ' — ' + (upSum ? '단조 증가 ✅' : '**깨짐 ❌**'));
    const keys = Object.keys(B[0].info.lv || {});
    const down = keys.filter(k => B.some((r, i) => i > 0 && (r.info.lv[k] < B[i - 1].info.lv[k])));
    console.log('씬 B 칸별 레벨(한 홀드 = 어느 칸도 줄 수 없다): '
      + keys.map(k => k + ' ' + B.map(r => r.info.lv[k]).join('→')).join(' · ')
      + ' — ' + (down.length ? '**감소 ' + down.length + '칸 ❌ (' + down.join(',') + ')**' : '감소 0칸 ✅'));
    /* 픽셀 동일 쌍은 아무 페이지에서나 셀 수 있다 — 캔버스만 있으면 된다(기준선 페이지를 재활용) */
    const { b: db, p: dp } = await open(SEED);
    const pairs = [];
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++)
      pairs.push({ i, j, d: await diffPx(dp, B[i].file, B[j].file) });
    await db.close();
    const same = pairs.filter(x => x.d === 0);
    console.log('씬 B 프레임 쌍 화소 차이: ' + pairs.map(x => 'B' + (x.i + 1) + '↔B' + (x.j + 1) + ' ' + x.d).join(' · ')
      + ' — ' + (same.length ? '**픽셀 동일 ' + same.length + '쌍 ❌**' : '픽셀 동일 0쌍 ✅'));
    console.log('씬 B 눈금(선언 ' + HOLDS.join('·') + ' → 목표 ' + B.map(r => r.T).join('·')
      + ' · 목표는 «직전 실측 + 간격»): 실측 간격 '
      + B.slice(1).map((r, i) => r.info.at - B[i].info.at).join('·') + 'ms');
    const pg = B.map(r => r.info.page);
    const onePage = pg.every(v => v === pg[0] && v !== '?');
    console.log('씬 B 페이지 표(한 홀드 = 넷이 같아야 한다): ' + pg.join(' · ')
      + ' — ' + (onePage ? '한 홀드 ✅' : '**서로 다른 실행 ' + new Set(pg).size + '개 ❌**'));
    console.log('씬 B DOM 알(보임/전체 · 나이 전체): '
      + B.map((r, i) => 'B' + (i + 1) + ' ' + r.info.gain + '/' + r.info.gainAll
        + '[' + ageCell(r.info.agesAll) + ']').join(' · '));
    /* ⚑⚑ 976 — **자기검산 여섯째 줄: 표본 위상.** 네 장이 「알이 갓 태어난 자리」만 보면
       683 ① 「틱마다 새로 터지는가」를 고르게 볼 수 없다(975 가 남긴 곁다리 · `probe976` 실측
       나이 ≤5ms 가 5/16 = 31%). 겨눈 나이와 실제 나이를 **값으로** 나란히 적는다(58 38회차 —
       판정을 말로만 적지 않는다).
       ⚠ 「알이 몇 개 겹쳐 있는가」는 여기서 판정하지 않는다(제품의 값 · 683 채점 몫 · 232-①). */
    const ph = B.map(r => r.info.ph), tk = B.map(r => r.info.tick);
    const band = [0, 40, 100, 200], bn = a => { let i = 0; while (i < 3 && a >= band[i + 1]) i++; return i; };
    const minAge = B.map(r => (r.info.agesAll && r.info.agesAll.length) ? r.info.agesAll[0] : -1);
    const cov = new Set(minAge.filter(a => a >= 0).map(bn)).size;
    console.log('씬 B 표본 위상(겨눈 나이 → 실측 · 네 장이 알 수명을 고르게 덮어야 한다): '
      + B.map((r, i) => 'B' + (i + 1) + ' ' + (ph[i] ? ph[i].off + '→' + ph[i].ms + 'ms'
          + (ph[i].late ? '(놓침)' : '') + (ph[i].ms > 380 ? '(수명 넘김)' : '')
          + (ph[i].newTicks ? '+틱' + ph[i].newTicks : '') : '겨눔 없음')
          + '/직전 틱 ' + (tk[i] ? tk[i].since + 'ms' : '–')).join(' · ')
      + ' — 겨눈 눈금 ' + (NOPHASE ? '없음(--b-nophase · 975 방식)' : PHASE_MS.join('·') + 'ms'));
    /* ⚠ 한 실행의 4/4 는 러너 기분에 달렸다(스핀이 렌더 뒤로 밀린다) — 여기서는 «한 토막에
       뭉쳤는가» 까지만 판정하고, «고르게 덮는가» 는 표본 12~16개를 쓰는 `probe976` [3c] 가 센다. */
    console.log('씬 B 알 나이 최솟값(위 위상의 결과 — 사양 아님, 683 채점의 재료): '
      + minAge.map(a => a < 0 ? '–' : a + 'ms').join(' · ')
      + ' — 수명 네 토막(0~40·40~100·100~200·200~) ' + cov + '/4 '
      + (cov >= 2 ? '✅' : '**한 토막에 뭉침 ❌**'));
    console.log('씬 B 봉투: 브라우저 ' + (LEGACY_B ? HOLDS.length + '회(--b-legacy · 옛 방식)' : '1회(한 홀드)')
      + ' · 얼림은 되돌림식(타이머 미루기 + 시계 정지 + 애니 pause/play)');
  }
  console.log('콘솔 에러: ' + A.concat(B).reduce((s, r) => s + r.errs, 0) + '건');
  console.log('캡처: ' + path.join(OUT, '683-' + ROUND + '-*.png'));
}

module.exports = { open, holdUntil, TALLY, FREEZE_TALLY, PHASE_FREEZE_TALLY, SEED, HOLDS, GAPS, PHASE_MS };
if (require.main === module) main();
