/* 작업 753 재현 프로브 — «683 유물 획득 파티클 스펙 보강 3항 + 주인 보강 1항»
 *
 *   node tools/probe753.js
 *
 * 338·341·350·363·372·429·654·655·682·683 규칙 — **처방을 따르기 전에 주인 지시의 각 항이
 * 지금 제품에서 참인지 거짓인지 제품에게 직접 묻는다.**
 *
 * 주인 원문(2026-09-02 05:30 + 05:32 보강):
 *   «유물소환으로 유물에 뜨는 이펙트도 캔슬 되지 말라하고, 유물에 뜨는 파티클 크기 유물 아이콘이랑
 *    크기 똑같게 하고, 한번 강화당 알갱이 하나 뜨고 유물 위치에서 터지게 하기 주변에서 터지지 말고»
 *   «랜덤방향으로 터지게 하기»
 *
 * 네 항 = 네 절이다:
 *   [1] **획득 1회당 알갱이 정확히 1개**            (수리 전 6/5 = 빨강이 정상)
 *   [2] **스폰 원점 = 그 유물 아이콘 중심 ±0**      (수리 전 반경 `RW_GAIN_R0` 링 = 빨강이 정상)
 *   [3] **크기 = 유물 아이콘과 동일**(등방 · 356)   (수리 전 글리프 ≈ 아이콘의 15% = 빨강이 정상)
 *   [4] **캔슬 금지 · 조기 소멸 0**(660 보강2)      (수리 전 홀드 틱이 수명을 `fxTickLife` 로 자른다 = 빨강이 정상)
 *   [5] **방향은 매번 랜덤**(682 지터 — 고정 패턴이면 빨강)
 *
 * ⚑ 세는 것은 «코드» 가 아니라 **찍힌 노드**다. `rwSummonFx` 를 감싸(683 과 같은 이유로
 *   MutationObserver 를 안 쓴다 — 감싸기는 동기라 버스트 경계가 정확하다) 그 버스트에서 새로 난
 *   `.fx-spark` 를 훑고, **획득 이미터의 알은 `.fx-rlic` 클래스로 갈린다**(`rwGainFx` 의 갈아 끼우기가
 *   `rwSummonFx` 가 돌아오기 «전» 에 동기로 끝난다 — 683 §3-ⓐ 가 append 훅에서 밟은 함정의 반대편).
 *
 * ⚑ [3] 의 «잉크» 는 DOM 상자가 아니라 **글리프가 실제로 칠하는 넓이**로 잰다
 *   (`canvas.measureText` 의 actualBoundingBox — 같은 font shorthand 로 둘을 같은 자에 올린다).
 *   상자만 맞추고 글리프가 작으면 주인 지시가 조용히 안 지켜진다(394·411 규약).
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다 — [1]~[4] 는 «지시가 지금 지켜지는가» 라
 *   수리 전에 빨간 것이 정상이고, [5]·[6] 은 구조 축이다.
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
const HOLD = 3600;
const EPS_C = 2.0;      /* 스폰 원점 ↔ 아이콘 중심 허용 오차(px) — «±0» 의 실무 문턱 */
const EPS_S = 0.06;     /* 잉크 크기 등가 허용 오차(6%) — drop-shadow 림 2px 이 양변에 붙는다 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 버스트 관찰자 — 한 번의 감싸기에서 ① 당첨 유물 ② 그 칸·그 칸 아이콘의 bbox
   ③ 이번에 난 «획득 알»(.fx-rlic)의 자리·상자·글리프·수명 을 같이 받는다. */
const WATCH = () => {
  window.__p753 = { bursts: [], sparkMs: (typeof FXSPARK_MS === 'number') ? FXSPARK_MS : null };
  const L = () => document.getElementById('fxl');
  const scan = seen => {
    const out = [], l = L(); if (!l) return out;
    for (const nd of l.children) {
      if (seen.has(nd)) continue;
      const cls = nd.className + '';
      if (!/fx-spark/.test(cls)) continue;
      const cs = getComputedStyle(nd);
      out.push({
        gain: /fx-rlic/.test(cls),
        x: parseFloat(nd.style.left), y: parseFloat(nd.style.top),
        w: parseFloat(nd.style.width), h: parseFloat(nd.style.height),
        fs: parseFloat(cs.fontSize), ff: cs.fontFamily,
        dx: parseFloat(nd.style.getPropertyValue('--dx')),
        dy: parseFloat(nd.style.getPropertyValue('--dy')),
        dur: nd.style.animationDuration || '',
        txt: (nd.textContent || '').trim()
      });
    }
    return out;
  };
  /* 그 순간의 칸·아이콘 bbox — 제품 자신의 자(fxRect)로 잰다(배율·프레임 보정이 그 안에 있다) */
  const cards = () => {
    const g = document.getElementById('rwGrid'), out = {};
    if (!g || typeof fxRect !== 'function') return out;
    for (const el of g.querySelectorAll('[data-rw]')) {
      const r = fxRect(el), i = el.querySelector('i');
      const ri = i ? fxRect(i) : null;
      const cs = i ? getComputedStyle(i) : null;
      if (r) out[el.getAttribute('data-rw')] = { r, ri, fs: cs ? parseFloat(cs.fontSize) : null, lh: cs ? parseFloat(cs.lineHeight) : 0, ff: cs ? cs.fontFamily : '', ic: i ? (i.textContent || '').trim() : '' };
    }
    return out;
  };
  const o = window.rwSummonFx;
  if (typeof o !== 'function') return false;
  window.rwSummonFx = function (it, first) {
    const l = L(), seen = new Set(l ? l.children : []);
    const rc = cards();
    const r = o.apply(this, arguments);
    window.__p753.bursts.push({ id: it && it.id, first: !!first, cards: rc, born: scan(seen) });
    return r;
  };
  return true;
};
const RESET = () => { window.__p753.bursts = [];
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild); };

/* 글리프 잉크 — 같은 font shorthand 로 두 크기를 같은 자에 올린다(actualBoundingBox) */
const INK = a => {
  const c = document.createElement('canvas').getContext('2d');
  const out = [];
  for (const q of a) {
    c.font = q.fs + 'px ' + q.ff;
    const m = c.measureText(q.ch);
    out.push({
      w: (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0),
      h: (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0)
    });
  }
  return out;
};

/* 찍힌 픽셀을 페이지로 되돌려 읽는다(350 처방 · probe683b 와 같은 길) */
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
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const cdp = await p.context().newCDPSession(p);
  const box = async sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  const tap = async c => {
    if (!c) return;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await p.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(220);
  };
  const holdTouch = async (c, ms) => {
    if (!c) return;
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 80));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(250);
  };

  const wrapped = await ev(p, WATCH);
  blk('[0] 전제 — 관찰자·화면');
  ok(wrapped === true, '[0-a] `rwSummonFx` 를 감쌌다');
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  const opened = await ev(p, () => ({
    on: !!document.getElementById('relw').classList.contains('on'),
    cells: (document.getElementById('rwGrid') || { querySelectorAll: () => [] }).querySelectorAll('[data-rw]').length
  }));
  ok(!!opened && opened.on && opened.cells === 10, '[0-b] 89 유물 페이지 · 격자 10칸', opened ? String(opened.cells) : '');

  /* 첫 발 + 홀드를 이어서 한 번에 모은다(연속 획득의 각도 시퀀스를 [5] 가 본다) */
  await ev(p, RESET);
  await tap(await box('#rwBasin'));
  const B1 = (await ev(p, () => window.__p753.bursts)) || [];
  await ev(p, RESET);
  await holdTouch(await box('#rwBasin'), HOLD);
  const B2 = (await ev(p, () => window.__p753.bursts)) || [];
  const SPARK = await ev(p, () => window.__p753.sparkMs);
  const ALL = B1.concat(B2);
  const gains = b => (b.born || []).filter(q => q.gain);

  /* ── [1] 획득 1회당 알갱이 정확히 1개 ── */
  blk('[1] 획득 1회당 알갱이 정확히 1개 — 주인 지시 ③(수리 전 빨강이 정상)');
  const n1 = B1[0] ? gains(B1[0]).length : -1;
  info('첫 발 알 수', String(n1));
  ok(n1 === 1, '[1-a] 첫 발 = 1개', String(n1));
  const hb = B2.filter(b => gains(b).length || b.id);
  const cnts = hb.map(b => gains(b).length);
  info('홀드 버스트', hb.length + '회 · 알 수 ' + cnts.join('·'));
  ok(hb.length >= 4, '[1-pre] 홀드로 버스트 4회 이상', String(hb.length));
  ok(cnts.length > 0 && cnts.every(c => c === 1), '[1-b] 홀드 틱마다 정확히 1개',
     cnts.filter(c => c === 1).length + '/' + cnts.length);

  /* ── [2] 스폰 원점 = 아이콘 중심 ──
     ⚑ **기준을 «상자» 가 아니라 «찍힌 잉크» 로 든다(350 규칙 · 683 이 다섯 번 배운 것).**
     `<i>` 상자 중심(= 칸 중심)과 글리프 줄상자 중심은 `line-height`(143) 때문에 4px 어긋나 있어,
     상자로 재면 **옳은 자리를 빨갛게** 만든다. 그래서 두 잉크의 중심을 직접 찍어 비교한다:
       ⓐ 정착 화면에서 `<i>` 를 숨겼다/보였다 하며 diff → 아이콘 잉크 bbox
       ⓑ 버스트를 t=0 으로 얼리고 `.fx-rlic` 를 숨겼다/보였다 하며 diff → 알 잉크 bbox
     ⚠ 두 shot 사이에 배경 애니가 움직이면 diff 가 화면 전체를 잡는다 — 먼저 전부 멈춘다. */
  blk('[2] 스폰 원점 = 그 유물 아이콘 중심 ±0 — 주인 지시 ③ «주변에서 터지지 말고»');
  const inkOf = async (clip, hide) => {
    const A = await READ(p, await p.screenshot({ clip }));
    await ev(p, hide, true); await p.waitForTimeout(120);
    const B = await READ(p, await p.screenshot({ clip }));
    await ev(p, hide, false); await p.waitForTimeout(60);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
      const o = (y * A.w + x) * 4;
      if (Math.abs(A.d[o] - B.d[o]) + Math.abs(A.d[o + 1] - B.d[o + 1]) + Math.abs(A.d[o + 2] - B.d[o + 2]) > 24) {
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return n < 40 ? null : { cx: clip.x + (x0 + x1) / 2, cy: clip.y + (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1, n };
  };
  const geo = await ev(p, () => {
    const el = document.querySelector('#rwGrid [data-rw]');
    const b = el.getBoundingClientRect();
    document.getAnimations().forEach(a => { try { a.pause(); } catch (_) {} });
    return { clip: { x: Math.max(0, b.left - 90), y: Math.max(0, b.top - 90), width: b.width + 180, height: b.height + 180 },
             scale: b.width / 151, id: el.getAttribute('data-rw') };
  });
  const icInk = geo ? await inkOf(geo.clip, h => { const i = document.querySelector('#rwGrid [data-rw] i'); if (i) i.style.visibility = h ? 'hidden' : ''; }) : null;
  /* 그 칸을 실제로 획득시키고 봉투를 t=0 으로 얼린다(#fxl 안만 감는다 — 683 2회차의 유령 방지) */
  const fired = await ev(p, id => {
    const it = RELICS.find(r => r.id === id); if (!it) return false;
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    /* ⚠ `fxBye` 는 «애니 끝 + 여유» 를 **setTimeout** 으로 재므로 애니를 멈춰도 노드가 사라진다
       (스크린샷 두 장을 찍는 데 그보다 오래 걸린다). 이 절 동안만 퇴장을 끈다. */
    window.__oldBye = window.fxBye; window.fxBye = () => null;
    rwSummonFx(it, true);
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.target;
      if (t && L && L.contains(t)) { try { a.pause(); a.currentTime = 0; } catch (_) {} }
    }
    return (L ? L.querySelectorAll('.fx-rlic').length : 0) === 1;
  }, geo && geo.id);
  ok(fired === true, '[2-pre] 그 칸에 획득 버스트 1알을 세우고 t=0 으로 얼렸다');
  const pInk = geo ? await inkOf(geo.clip, h => {
    for (const nd of document.querySelectorAll('#fxl .fx-rlic')) nd.style.visibility = h ? 'hidden' : '';
  }) : null;
  await ev(p, () => { if (window.__oldBye) { window.fxBye = window.__oldBye; delete window.__oldBye; } });
  if (icInk) info('아이콘 잉크', Math.round(icInk.w) + '×' + Math.round(icInk.h) + ' css · 화소 ' + icInk.n);
  if (pInk) info('알 잉크(t=0)', Math.round(pInk.w) + '×' + Math.round(pInk.h) + ' css · 화소 ' + pInk.n);
  ok(!!icInk && !!pInk, '[2-pre2] 두 잉크를 다 찍었다');
  if (icInk && pInk) {
    const s = geo.scale || 1;
    const dx = (pInk.cx - icInk.cx) / s, dy = (pInk.cy - icInk.cy) / s;
    info('잉크 중심 Δ(FRAME px)', dx.toFixed(2) + ', ' + dy.toFixed(2) + ' · 거리 ' + Math.hypot(dx, dy).toFixed(2));
    ok(Math.hypot(dx, dy) <= EPS_C, '[2-a] 알 잉크 중심 = 아이콘 잉크 중심(±' + EPS_C + 'px)',
       Math.hypot(dx, dy).toFixed(2) + 'px');
  }
  /* 이동은 «자리» 가 아니라 «방향» 이다 — 탄생 반경이 0 인지는 소스가 아니라 노드로 센다 */
  let r0max = -1, r0n = 0, r0t = 0;
  for (const b of ALL) {
    const c = b.cards[b.id]; if (!c || !c.ri) continue;
    const ax = c.ri.x + c.ri.w / 2, ay = c.ri.y + (c.lh > 0 ? c.lh / 2 : c.ri.h / 2);
    for (const q of gains(b)) {
      const d = Math.hypot(q.x - ax, q.y - ay);
      r0t++; if (d <= EPS_C) r0n++; if (d > r0max) r0max = d;
    }
  }
  info('탄생 반경', r0t + '알 · 최대 ' + (r0max < 0 ? '—' : r0max.toFixed(1)) + 'px');
  ok(r0t > 0 && r0n === r0t, '[2-b] 탄생 반경 0 — 링이 아니라 한 점에서 난다(옛 `R0` 38 이 빨개지는 자리)',
     r0n + '/' + r0t);

  /* ── [3] 크기 = 유물 아이콘과 동일 ── */
  blk('[3] 크기 = 유물 아이콘과 동일(등방 · 356) — 주인 지시 ②');
  const smp = [];
  for (const b of ALL) {
    const c = b.cards[b.id]; if (!c || !c.fs) continue;
    for (const q of gains(b)) smp.push({ id: b.id, icFs: c.fs, icFf: c.ff, icCh: c.ic, fs: q.fs, ff: q.ff, ch: q.txt, w: q.w, h: q.h });
  }
  ok(smp.length > 0, '[3-pre] 표본이 있다', String(smp.length));
  if (smp.length) {
    const s0 = smp[0];
    info('아이콘 font-size', s0.icFs + 'px · 알 font-size ' + s0.fs + 'px');
    ok(smp.every(q => Math.abs(q.fs - q.icFs) <= 0.5), '[3-a] 알 font-size = 아이콘 font-size',
       smp.filter(q => Math.abs(q.fs - q.icFs) <= 0.5).length + '/' + smp.length);
    ok(smp.every(q => Math.abs(q.w - q.h) <= 1), '[3-b] 알 상자가 정사각(등방 · 356)',
       smp.filter(q => Math.abs(q.w - q.h) <= 1).length + '/' + smp.length);
    /* 잉크 등가 — 같은 글리프를 두 font-size 로 캔버스에 올려 actualBoundingBox 를 비교 */
    const inks = await ev(p, INK, [
      { fs: s0.icFs, ff: s0.icFf, ch: s0.icCh }, { fs: s0.fs, ff: s0.ff, ch: s0.ch || s0.icCh }
    ]);
    if (inks && inks[0] && inks[1]) {
      const rw = inks[1].w / (inks[0].w || 1), rh = inks[1].h / (inks[0].h || 1);
      info('글리프 잉크', '아이콘 ' + inks[0].w.toFixed(1) + '×' + inks[0].h.toFixed(1)
         + ' · 알 ' + inks[1].w.toFixed(1) + '×' + inks[1].h.toFixed(1)
         + ' (비 ' + rw.toFixed(3) + ' × ' + rh.toFixed(3) + ')');
      ok(Math.abs(rw - 1) <= EPS_S && Math.abs(rh - 1) <= EPS_S,
         '[3-c] 찍히는 글리프 잉크가 아이콘과 같다(±' + Math.round(EPS_S * 100) + '%)',
         rw.toFixed(3) + '×' + rh.toFixed(3));
    } else ok(false, '[3-c] 잉크 자를 못 돌렸다');
  }

  /* ── [4] 캔슬 금지 · 조기 소멸 0 ── */
  blk('[4] 캔슬 금지 · 조기 소멸 0 — 주인 지시 ①(660 보강2 «날아가던 입자는 수명 끝까지»)');
  info('공용 수명 FXSPARK_MS', SPARK + 'ms');
  const durs = [];
  for (const b of B2) for (const q of gains(b)) durs.push(q.dur ? parseFloat(q.dur) : SPARK);
  info('홀드 알 수명', durs.length ? durs.map(d => Math.round(d)).join('·') + 'ms' : '없음');
  ok(durs.length > 0 && durs.every(d => Math.abs(d - SPARK) <= 1), '[4-a] 홀드 틱의 알도 수명을 안 자른다',
     durs.filter(d => Math.abs(d - SPARK) <= 1).length + '/' + durs.length);

  /* ── [5] 방향은 매번 랜덤 — 주인 보강(고정 패턴이면 빨강) ── */
  blk('[5] 방향은 매번 랜덤 — 주인 보강 2026-09-02 05:32');
  const angs = [];
  for (const b of ALL) for (const q of gains(b))
    if (Number.isFinite(q.dx) && Number.isFinite(q.dy) && (q.dx || q.dy))
      angs.push((Math.atan2(q.dy, q.dx) * 180 / Math.PI + 360) % 360);
  info('각도', angs.map(a => Math.round(a)).join('°·') + '°');
  ok(angs.length >= 5, '[5-pre] 각도 표본 5개 이상', String(angs.length));
  if (angs.length >= 5) {
    const q4 = new Set(angs.map(a => Math.floor(a / 90)));
    ok(q4.size >= 3, '[5-a] 사분면 3개 이상에 흩어진다', q4.size + '/4');
    const df = [];
    for (let i = 1; i < angs.length; i++) { let d = (angs[i] - angs[i - 1] + 360) % 360; df.push(d); }
    const mu = df.reduce((a, b) => a + b, 0) / df.length;
    const sd = Math.sqrt(df.reduce((a, b) => a + (b - mu) * (b - mu), 0) / df.length);
    info('연속 각 차', '평균 ' + mu.toFixed(1) + '° · 표준편차 ' + sd.toFixed(1) + '°');
    ok(sd >= 10, '[5-b] 연속 각 차가 «고정 증분» 이 아니다(표준편차 ≥ 10°)', sd.toFixed(1) + '°');
  }

  /* ── [6] 콘솔 ── */
  blk('[6] 콘솔');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nPROBE753 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
