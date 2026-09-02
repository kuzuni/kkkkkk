/* 작업 820 재현 프로브 — «`verify753` [B1] 알 잉크 중심 ↔ 아이콘 잉크 중심 Δ3.00px»
 *
 *   node tools/probe820.js
 *
 * 338·341·350·363·654·682·683·753 규칙 — **처방을 고르기 전에 «어느 쪽 중심이 움직였는가» 를
 * 제품에게 직접 묻는다.** 등재문(PROGRESS 820)이 갈래를 둘로 적어 뒀다:
 *   ⓐ **회귀** — 753 이 닫은 뒤 다른 작업이 알·아이콘 중 한쪽의 «중심» 을 3px 옮겼다.
 *   ⓑ **자** — [B1] 이 세로를 아이콘 **잉크**로 재기 시작한 뒤 이모지 고유 비대칭이 들어왔다.
 *
 * 두 갈래를 가르는 것은 **중심 하나가 아니라 네 변**이다 — [B1] 은 중심만 찍어서
 * «어느 쪽이 얼마나» 를 못 말한다. 그래서 이 자는 같은 두 마스크를 각각 찍되
 * **상·하·좌·우 변을 따로** 내고, 기하 상자(줄상자 중심)와 나란히 놓는다.
 *
 *   [1] 두 잉크의 네 변 — 알이 아이콘보다 위로/아래로 각각 몇 px 넘치는가(대칭이면 후광, 어긋나면 자리)
 *   [2] 기하 — `<i>` 줄상자 중심 ↔ 알 상자 중심(`rwGainFx` 가 계산한 cx·cy). 여기서 이미 어긋나면 ⓐ.
 *   [3] 글리프만의 잉크 — 후광(`filter`)을 끈 사본으로 알을 다시 찍는다. 후광을 뺀 두 잉크가
 *       일치하면 결손은 **후광의 몫**이고, 그래도 어긋나면 **자리**다.
 *   [4] 후광 봉투 — `.fx-rlic` 의 여덟 방향 drop-shadow + 글로우가 상자를 넘어 잘리는가
 *       (알 상자 158 vs 잉크 139 + 후광 2×12 = 163 — **세로만 5px 모자란다**는 가설).
 *
 * ⚑ 재현은 수리 전에 **[1] 의 비대칭이 보이는 것**이 정상이다(그것이 등재문의 «Δ3.00px» 이다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 찍힌 픽셀을 페이지로 되돌려 읽는다(350 처방 · verify753 [B] 와 같은 자) */
const READ = async (page, buf) => page.evaluate(u => new Promise(res => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    res({ w: img.width, h: img.height, d: Array.from(g.getImageData(0, 0, img.width, img.height).data) });
  };
  img.src = u;
}), 'data:image/png;base64,' + buf.toString('base64'));

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  /* ⚠ `verify753` [B] 와 **같은 상태**에서 재야 같은 수가 나온다 — 그 자는 6초 홀드로
     유물을 실제로 뽑은 뒤에 [B] 를 잰다(칸이 «미보유» 면 딤·물음표가 같이 지워져 잉크가 통째로
     커진다 — 1회차에 아이콘 잉크가 119×139 가 아니라 319×319 로 나온 자리다). */
  {
    const cdp = await p.context().newCDPSession(p);
    const c = await p.evaluate(() => { const e = document.querySelector('#rwBasin'); if (!e) return null;
      const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    if (c) {
      const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        await new Promise(r => setTimeout(r, 80));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await st.catch(() => {});
      await p.waitForTimeout(400);
    }
  }

  /* 네 변까지 내는 잉크 자 — verify753 [B] 의 `inkOf` 와 같은 차분 마스크 */
  const inkOf = async (clip, hide) => {
    const A = await READ(p, await p.screenshot({ clip }));
    await ev(p, hide, true); await p.waitForTimeout(120);
    const Bb = await READ(p, await p.screenshot({ clip }));
    await ev(p, hide, false); await p.waitForTimeout(60);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
      const o = (y * A.w + x) * 4;
      if (Math.abs(A.d[o] - Bb.d[o]) + Math.abs(A.d[o + 1] - Bb.d[o + 1]) + Math.abs(A.d[o + 2] - Bb.d[o + 2]) > 24) {
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return n < 40 ? null : { L: clip.x + x0, R: clip.x + x1, T: clip.y + y0, B: clip.y + y1,
                             cx: clip.x + (x0 + x1) / 2, cy: clip.y + (y0 + y1) / 2,
                             w: x1 - x0 + 1, h: y1 - y0 + 1, n };
  };

  const geo = await ev(p, () => {
    const el = document.querySelector('#rwGrid [data-rw]'); const b = el.getBoundingClientRect();
    document.getAnimations().forEach(a => { try { a.pause(); } catch (_) {} });
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const i = el.querySelector('i'), ri = i.getBoundingClientRect(), cs = getComputedStyle(i);
    return { clip: { x: Math.max(0, b.left - 90), y: Math.max(0, b.top - 90), width: b.width + 180, height: b.height + 180 },
             scale: b.width / 151, id: el.getAttribute('data-rw'),
             cell: { x: b.left, y: b.top, w: b.width, h: b.height },
             i: { x: ri.left, y: ri.top, w: ri.width, h: ri.height },
             fs: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight) };
  });
  if (!geo) { console.log('PROBE820 — 그리드를 못 열었다'); await browser.close(); process.exit(1); }
  const s = geo.scale || 1;

  /* 알 하나를 띄우고 그 자리에서 멈춘다(verify753 [B] 와 같은 절차) */
  const fire = async () => ev(p, id => {
    const it = RELICS.find(r => r.id === id); if (!it) return null;
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    window.__oldBye = window.fxBye; window.fxBye = () => null;
    rwSummonFx(it, true);
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.target;
      if (t && L && L.contains(t)) { try { a.pause(); a.currentTime = 0; } catch (_) {} }
    }
    const nd = document.querySelector('#fxl .fx-rlic'); if (!nd) return null;
    const r = nd.getBoundingClientRect(), cs = getComputedStyle(nd);
    return { x: r.left, y: r.top, w: r.width, h: r.height,
             fs: parseFloat(cs.fontSize), lh: cs.lineHeight,
             left: nd.style.left, top: nd.style.top, margin: nd.style.margin };
  }, geo.id);
  const restore = async () => ev(p, () => {
    for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.remove();
    if (window.__oldBye) { window.fxBye = window.__oldBye; delete window.__oldBye; }
  });

  const icInk = await inkOf(geo.clip, h => {
    const i = document.querySelector('#rwGrid [data-rw] i'); if (i) i.style.visibility = h ? 'hidden' : '';
  });
  const eggBox = await fire();
  const pInk = eggBox ? await inkOf(geo.clip, h => {
    for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.visibility = h ? 'hidden' : '';
  }) : null;
  await restore();

  /* ── [1] 네 변 ────────────────────────────────────────────────────── */
  blk('1] 두 잉크의 네 변 — 후광이 대칭인가, 자리가 밀렸는가');
  if (!icInk || !pInk) { ok(false, '1-a 두 잉크를 다 찍었다'); }
  else {
    info('아이콘 잉크', 'L' + icInk.L.toFixed(1) + ' R' + icInk.R.toFixed(1)
         + ' T' + icInk.T.toFixed(1) + ' B' + icInk.B.toFixed(1)
         + ' · ' + icInk.w + '×' + icInk.h + ' · 중심 ' + icInk.cx.toFixed(1) + ',' + icInk.cy.toFixed(1));
    info('알   잉크', 'L' + pInk.L.toFixed(1) + ' R' + pInk.R.toFixed(1)
         + ' T' + pInk.T.toFixed(1) + ' B' + pInk.B.toFixed(1)
         + ' · ' + pInk.w + '×' + pInk.h + ' · 중심 ' + pInk.cx.toFixed(1) + ',' + pInk.cy.toFixed(1));
    const oL = (icInk.L - pInk.L) / s, oR = (pInk.R - icInk.R) / s;
    const oT = (icInk.T - pInk.T) / s, oB = (pInk.B - icInk.B) / s;
    info('알이 아이콘 밖으로 넘치는 폭(px · +면 밖)',
         '좌 ' + oL.toFixed(1) + ' · 우 ' + oR.toFixed(1) + ' · 상 ' + oT.toFixed(1) + ' · 하 ' + oB.toFixed(1));
    const dy = (pInk.cy - icInk.cy) / s, dx = (pInk.cx - icInk.cx) / s;
    ok(Math.hypot(dx, dy) > 2.0,
       '1-a ★ **등재문 재현** — 두 잉크 중심이 허용(±2)을 넘는다(이 항이 초록인 것이 «재현 성공»)',
       'Δ ' + dx.toFixed(2) + ', ' + dy.toFixed(2) + ' = ' + Math.hypot(dx, dy).toFixed(2) + 'px');
    ok(Math.abs(oL - oR) <= 1.0,
       '1-b 가로 후광은 **대칭**이다(좌 ≈ 우) — 가로가 Δ0.00 인 이유',
       '좌 ' + oL.toFixed(1) + ' ↔ 우 ' + oR.toFixed(1) + ' · 차 ' + Math.abs(oL - oR).toFixed(2));
    ok(Math.abs(oT - oB) > 1.0,
       '1-c ★ **세로 후광이 비대칭이다**(상 ≠ 하) — 결손의 자리(이 항이 초록인 것이 재현)',
       '상 ' + oT.toFixed(1) + ' ↔ 하 ' + oB.toFixed(1) + ' · 차 ' + Math.abs(oT - oB).toFixed(2));
  }

  /* ── [2] 기하 ─────────────────────────────────────────────────────── */
  blk('2] 기하 — `<i>` 줄상자 중심 ↔ 알 상자 중심(자리가 밀렸는가)');
  if (!eggBox) { ok(false, '2-a 알 상자를 못 읽었다'); }
  else {
    const icx = geo.i.x + geo.i.w / 2, icy = geo.i.y + (geo.lh > 0 ? geo.lh / 2 : geo.i.h / 2);
    const ecx = eggBox.x + eggBox.w / 2, ecy = eggBox.y + eggBox.h / 2;
    info('`<i>` 상자', geo.i.w.toFixed(1) + '×' + geo.i.h.toFixed(1)
         + ' · fs ' + geo.fs + ' · line-height ' + geo.lh + ' ⇒ 줄상자 중심 ' + icx.toFixed(1) + ',' + icy.toFixed(1));
    info('알 상자', eggBox.w.toFixed(1) + '×' + eggBox.h.toFixed(1)
         + ' · fs ' + eggBox.fs + ' · line-height ' + eggBox.lh
         + ' · 중심 ' + ecx.toFixed(1) + ',' + ecy.toFixed(1));
    ok(Math.hypot((ecx - icx) / s, (ecy - icy) / s) <= 0.6,
       '2-a ★ **상자 중심은 어긋나지 않았다** — 자리(`rwGainFx` 의 cx·cy)는 옳다 ⇒ 갈래 ⓐ(회귀) 기각',
       'Δ ' + ((ecx - icx) / s).toFixed(2) + ', ' + ((ecy - icy) / s).toFixed(2) + 'px');
  }

  /* ── [3] 후광을 끈 사본 ───────────────────────────────────────────── */
  blk('3] 후광(`filter`)을 끈 알 — 글리프만의 잉크는 아이콘과 맞는가');
  const eggBox2 = await fire();
  await ev(p, () => { for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.filter = 'brightness(0)'; });
  await p.waitForTimeout(80);
  const gInk = eggBox2 ? await inkOf(geo.clip, h => {
    for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.visibility = h ? 'hidden' : '';
  }) : null;
  await restore();
  if (!gInk || !icInk) { ok(false, '3-a 글리프 잉크를 못 찍었다'); }
  else {
    info('알 글리프 잉크(후광 없음)', gInk.w + '×' + gInk.h
         + ' · 중심 ' + gInk.cx.toFixed(1) + ',' + gInk.cy.toFixed(1));
    const dx = (gInk.cx - icInk.cx) / s, dy = (gInk.cy - icInk.cy) / s;
    ok(Math.hypot(dx, dy) <= 1.0,
       '3-a ★ **후광을 빼면 두 글리프 중심이 맞는다** ⇒ 결손은 «자리» 가 아니라 **후광이 잘린 몫**이다',
       'Δ ' + dx.toFixed(2) + ', ' + dy.toFixed(2) + ' = ' + Math.hypot(dx, dy).toFixed(2) + 'px');
    ok(Math.abs(gInk.h - icInk.h) <= 2 && Math.abs(gInk.w - icInk.w) <= 2,
       '3-b 글리프 잉크 크기도 항등이다(같은 글리프 · 같은 font-size)',
       gInk.w + '×' + gInk.h + ' ↔ 아이콘 ' + icInk.w + '×' + icInk.h);
  }

  /* ── [4] 후광 봉투가 상자를 넘는가 ────────────────────────────────── */
  blk('4] 후광 봉투 ↔ 알 상자 — 세로만 잘리는가');
  if (icInk && eggBox) {
    const HALO = 12;  /* 여덟 방향 2px 사슬 + 글로우 6px — 가로 실측에서 나온 값 */
    const needW = icInk.w / s + HALO * 2, needH = icInk.h / s + HALO * 2;
    const boxW = eggBox.w / s, boxH = eggBox.h / s;
    info('필요 봉투 ÷ 알 상자', needW.toFixed(0) + '×' + needH.toFixed(0) + ' ÷ ' + boxW.toFixed(0) + '×' + boxH.toFixed(0));
    ok(needH > boxH,
       '4-a ★ **세로 봉투가 알 상자를 넘는다** — 넘친 몫이 잘려 상·하가 어긋난다(가설 확인)',
       '필요 ' + needH.toFixed(0) + ' > 상자 ' + boxH.toFixed(0) + ' (초과 ' + (needH - boxH).toFixed(0) + 'px)');
    ok(needW <= boxW,
       '4-b 가로 봉투는 상자 안이다 — 그래서 가로만 Δ0.00 이었다',
       '필요 ' + needW.toFixed(0) + ' ≤ 상자 ' + boxW.toFixed(0));
  } else ok(false, '4-a 상자·잉크를 못 읽었다');

  /* ── [5] 후광을 쪼갠다 — 흰 테(불투명)와 글로우(반투명)를 따로 ────────── */
  blk('5] 후광 분해 — 어느 층이 비대칭을 만드는가');
  const haloRun = async css => {
    const b0 = await fire(); if (!b0) return null;
    await ev(p, f => { for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.filter = f; }, css);
    await p.waitForTimeout(80);
    const r = await inkOf(geo.clip, h => {
      for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.visibility = h ? 'hidden' : '';
    });
    await restore();
    return r;
  };
  const RING = 'brightness(0) drop-shadow(0 2px 0 #FFF) drop-shadow(0 -2px 0 #FFF)'
    + ' drop-shadow(2px 0 0 #FFF) drop-shadow(-2px 0 0 #FFF)'
    + ' drop-shadow(1.4px 1.4px 0 #FFF) drop-shadow(-1.4px -1.4px 0 #FFF)'
    + ' drop-shadow(1.4px -1.4px 0 #FFF) drop-shadow(-1.4px 1.4px 0 #FFF)';
  const ring = await haloRun(RING);
  if (ring && icInk) {
    const oT = (icInk.T - ring.T) / s, oB = (ring.B - icInk.B) / s;
    const oL = (icInk.L - ring.L) / s, oR = (ring.R - icInk.R) / s;
    info('흰 테만(불투명 · 배경 무관)', ring.w + '×' + ring.h
         + ' · 넘침 좌 ' + oL.toFixed(1) + ' 우 ' + oR.toFixed(1) + ' 상 ' + oT.toFixed(1) + ' 하 ' + oB.toFixed(1));
    ok(Math.abs(oT - oB) <= 1.5,
       '5-a ★ **흰 테는 대칭이다** — 불투명 층은 상·하가 같다(비대칭의 원인이 아니다)',
       '상 ' + oT.toFixed(1) + ' ↔ 하 ' + oB.toFixed(1) + ' · 차 ' + Math.abs(oT - oB).toFixed(2));
    ok(Math.hypot((ring.cx - icInk.cx) / s, (ring.cy - icInk.cy) / s) <= 1.0,
       '5-b ★ 흰 테까지 켠 알의 잉크 중심도 아이콘과 맞는다(±1)',
       'Δ ' + ((ring.cx - icInk.cx) / s).toFixed(2) + ', ' + ((ring.cy - icInk.cy) / s).toFixed(2) + 'px');
  } else ok(false, '5-a 흰 테 사본을 못 찍었다');

  /* ── [6] 글로우가 «비대칭» 인가, «위쪽 배경이 밝아 안 잡히는» 것인가 ──── */
  blk('6] 글로우 — 색을 바꾸면 상·하 넘침이 같아지는가(대비 함정)');
  const glowAmber = await haloRun(RING + ' drop-shadow(0 0 6px #FFE07A)');
  const glowBlack = await haloRun(RING + ' drop-shadow(0 0 6px #000)');
  const span = (r, tag) => {
    if (!r || !icInk) return null;
    const oT = (icInk.T - r.T) / s, oB = (r.B - icInk.B) / s;
    const oL = (icInk.L - r.L) / s, oR = (r.R - icInk.R) / s;
    info(tag, r.w + '×' + r.h + ' · 넘침 좌 ' + oL.toFixed(1) + ' 우 ' + oR.toFixed(1)
         + ' 상 ' + oT.toFixed(1) + ' 하 ' + oB.toFixed(1)
         + ' · 상하 차 ' + Math.abs(oT - oB).toFixed(1));
    return { oT, oB, cy: r.cy };
  };
  const gA = span(glowAmber, '흰 테 + 앰버 글로우(CSS 폴백색)');
  const gB = span(glowBlack, '흰 테 + **검정** 글로우(색만 바꿈)');
  if (gA && gB && pInk && icInk) {
    const dyProd = (pInk.cy - icInk.cy) / s;          /* 제품 값 — `--c` = 그 유물의 RW_GLOW 색 */
    const dyA = (gA.cy - icInk.cy) / s, dyB = (gB.cy - icInk.cy) / s;
    const spread = Math.max(dyProd, dyA, dyB) - Math.min(dyProd, dyA, dyB);
    ok(spread >= 2.0,
       '6-a ★★ **노드도 자리도 그대로인데 «글로우 색» 만으로 잉크 중심이 허용폭(±2)만큼 움직인다**'
       + ' — 이 자로는 «자리» 를 못 잰다(A3-ⓔ 마스크 함정 · 반투명 층은 배경 대비로 문턱을 넘고 못 넘는다)',
       '제품 Δy ' + dyProd.toFixed(2) + ' · 앰버 ' + dyA.toFixed(2) + ' · 검정 ' + dyB.toFixed(2)
       + ' ⇒ 폭 ' + spread.toFixed(2) + 'px');
    ok(Math.abs(gA.oT - gA.oB) <= 2.0,
       '6-b ★ **«위가 구조적으로 잘린다» 는 기각** — 색 하나만 바꾸면 상·하 넘침이 같아진다'
       + '(그릇이 잘랐다면 색과 무관해야 한다)',
       '앰버 상 ' + gA.oT.toFixed(1) + ' ↔ 하 ' + gA.oB.toFixed(1) + ' · 차 ' + Math.abs(gA.oT - gA.oB).toFixed(1));
  } else ok(false, '6-a 글로우 사본을 못 찍었다');

  console.log('\nPROBE820 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
