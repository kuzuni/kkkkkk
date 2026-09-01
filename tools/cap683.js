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
  return { gain: gain.length, onCard, other, glyph, gsz, gsp,
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
  const px = await paintedPx(p, file, grow(info.card));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
  await b.close();
  return { T, file, info, px, errs: errs.length };
}

const row = (tag, i, r) => '| ' + tag + (i + 1) + ' | ' + r.T + ' | ' + r.info.name + ' ' + r.info.ic
  + ' | ' + JSON.stringify(r.info.card) + ' | ' + r.info.gain + ' | ' + r.info.onCard + ' | ' + r.info.other
  + ' | ' + r.info.glyph + ' | ' + r.info.gsz + 'px | ' + r.info.gsp + 'px | ' + r.dpx
  + ' | ' + r.info.pay + ' | ' + r.info.bead + ' | ' + r.info.text + ' | ' + r.info.flash + ' |';

(async () => {
  const BASE = await baseline();
  const A = [], B = [];
  for (let i = 0; i < STOPS.length; i++) A.push(await shotA(STOPS[i], i + 1));
  for (let i = 0; i < HOLDS.length; i++) B.push(await shotB(HOLDS[i], i + 1));
  /* 기준선을 빼서 «파티클·플래시가 더한 잉크» 만 남긴다(위 baseline 머리말) */
  for (const r of A.concat(B)) {
    const b0 = BASE[r.info.id];
    r.dpx = (Number.isFinite(b0) && Number.isFinite(r.px)) ? (r.px - b0) : r.px;
  }
  console.log('\n# 683 ' + ROUND + ' 정답표 (시드 ' + SEED + ')');
  console.log('\n«획득» = 683 이 신설한 획득 이미터(`.fx-rlic`, 원점 = 획득 유물 카드)');
  console.log('«지불» = 666 의 지불 이미터(`.fx-cic`, 원점 = 소환 버튼) — 이 작업이 안 건드린 축\n');
  console.log('| # | t(ms) | 당첨 유물 | 당첨 카드 상자 | 획득 알 | 그 카드 위 | 다른 칸 침범 | 글리프 일치 | 평균 크기 | 최대 반경 | **찍힌 잉크 Δpx** | 지불 알 | 구슬 | 글자 | 플래시 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  A.forEach((r, i) => console.log(row('A', i, r)));
  B.forEach((r, i) => console.log(row('B', i, r)));
  console.log('\nA = 단발(트리거 = 0ms · `currentTime` 으로 감은 정확한 시각) · B = 연속 홀드(실시간 ms)');
  const c = A[0].info.card;
  console.log('당첨 카드 상자(A씬): ' + JSON.stringify(c));
  console.log('기준선(연출 0인 정착 화면, 칸별 밝은 px): ' + JSON.stringify(BASE));
  console.log('콘솔 에러: ' + A.concat(B).reduce((s, r) => s + r.errs, 0) + '건');
  console.log('캡처: ' + path.join(OUT, '683-' + ROUND + '-*.png'));
})();
