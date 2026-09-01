/* 작업 683 — 연출 연속 프레임 캡처 하네스 (지시서 [3]-(다): 정지 1장이 아니라 연속 프레임)
 *
 *   node tools/cap683.js [라운드]          기본 r1
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

const ROUND = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/shots');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const STOPS = [0, 40, 80, 130, 180, 240, 290, 340];      /* 씬 A — 666 과 같은 봉투(수명 380ms) */
const HOLDS = [420, 700, 1000, 1300];                    /* 씬 B — 홀드 시작 후 실시간 ms */
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
  const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
    return +cs.opacity > 0.06 && Math.min(bb.width, bb.height) >= 6; };
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
  return { gain: gain.length, onCard, other, glyph, gsz, gsp,
           pay: pay.length, payOut, bead: bead.length, text: text.length, flash: flash.length,
           id: w.id || '', ic: w.ic || '', name: w.name || '',
           card: cr ? { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) } : null };
};

const FREEZE = () => {
  window.requestAnimationFrame = () => 0;
  try { const ids = window.__capIds; if (ids) { ids.t.forEach(clearTimeout); ids.i.forEach(clearInterval); } } catch (e) {}
  window.setTimeout = () => 0; window.setInterval = () => 0;
};

async function open(sd) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript((s) => {
    try { localStorage.clear(); } catch (e) {}
    const _st = window.setTimeout, _si = window.setInterval;
    const ids = { t: new Set(), i: new Set() };
    window.__capIds = ids;
    window.setTimeout = function (...a) { const id = _st.apply(window, a); ids.t.add(id); return id; };
    window.setInterval = function (...a) { const id = _si.apply(window, a); ids.i.add(id); return id; };
    let q = s >>> 0;
    Math.random = function () {
      q |= 0; q = (q + 0x6D2B79F5) | 0;
      let t = Math.imul(q ^ (q >>> 15), 1 | q);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, sd);
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.relic = 250000; S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
    try { RELICS.slice(0, 4).forEach(r => { S.own[r.id] = { n: 0, l: 3 }; }); } catch (e) {}
    /* 당첨 유물을 기록해 둔다 — 정답표·비평 프롬프트가 «어느 칸을 보라» 를 말할 수 있게 */
    window.__cap683 = {};
    const o = window.rwSummonFx;
    window.rwSummonFx = function (it, first, iv) {
      if (it) { window.__cap683.id = it.id; window.__cap683.ic = it.ic; window.__cap683.name = it.n; }
      return o.apply(this, arguments);
    };
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    openRelw();
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
    let at = 0;
    try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = T; at = T; } catch (e) {} }); } catch (e) {}
    return Object.assign({ at: Math.round(at) }, eval('(' + tally + ')')());
  }, { T, sd: SEED, tally: TALLY.toString(), freeze: FREEZE.toString(), seedfn: SEEDFN.toString() });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '683-' + ROUND + '-A' + idx + '.png');
  await p.screenshot({ path: file });
  await b.close();
  return { T, file, info, errs: errs.length };
}

/* 씬 B — 연속(홀드). 세대가 섞이므로 `currentTime` 을 안 감고 **실시간**으로 홀드하다 그 순간 얼린다. */
async function shotB(T, idx) {
  const { b, p, errs } = await open(SEED + idx);
  const el = await p.$('#rwBasin');
  const bb = await el.boundingBox();
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart',
    touchPoints: [{ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }] });
  await p.waitForTimeout(T);
  const info = await p.evaluate(({ tally, freeze }) => {
    eval('(' + freeze + ')')();
    try { document.getAnimations().forEach(a => a.pause()); } catch (e) {}
    return Object.assign({ at: -1 }, eval('(' + tally + ')')());
  }, { tally: TALLY.toString(), freeze: FREEZE.toString() });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '683-' + ROUND + '-B' + idx + '.png');
  await p.screenshot({ path: file });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
  await b.close();
  return { T, file, info, errs: errs.length };
}

const row = (tag, i, r) => '| ' + tag + (i + 1) + ' | ' + r.T + ' | ' + r.info.name + ' ' + r.info.ic
  + ' | ' + r.info.gain + ' | ' + r.info.onCard + ' | ' + r.info.other + ' | ' + r.info.glyph
  + ' | ' + r.info.gsz + 'px | ' + r.info.gsp + 'px | ' + r.info.pay + ' | ' + r.info.payOut
  + ' | ' + r.info.bead + ' | ' + r.info.text + ' | ' + r.info.flash + ' |';

(async () => {
  const A = [], B = [];
  for (let i = 0; i < STOPS.length; i++) A.push(await shotA(STOPS[i], i + 1));
  for (let i = 0; i < HOLDS.length; i++) B.push(await shotB(HOLDS[i], i + 1));
  console.log('\n# 683 ' + ROUND + ' 정답표 (시드 ' + SEED + ')');
  console.log('\n«획득» = 683 이 신설한 획득 이미터(`.fx-rlic`, 원점 = 획득 유물 카드)');
  console.log('«지불» = 666 의 지불 이미터(`.fx-cic`, 원점 = 소환 버튼) — 이 작업이 안 건드린 축\n');
  console.log('| # | t(ms) | 당첨 유물 | 획득 알 | 그 카드 위 | 다른 칸 침범 | 글리프 일치 | 평균 크기 | 최대 반경 | 지불 알 | 버튼 밖 | 구슬 | 글자 | 플래시 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  A.forEach((r, i) => console.log(row('A', i, r)));
  B.forEach((r, i) => console.log(row('B', i, r)));
  console.log('\nA = 단발(트리거 = 0ms · `currentTime` 으로 감은 정확한 시각) · B = 연속 홀드(실시간 ms)');
  const c = A[0].info.card;
  console.log('당첨 카드 상자(A씬): ' + JSON.stringify(c));
  console.log('콘솔 에러: ' + A.concat(B).reduce((s, r) => s + r.errs, 0) + '건');
  console.log('캡처: ' + path.join(OUT, '683-' + ROUND + '-*.png'));
})();
