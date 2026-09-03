/* 작업 862 — **재현자**: 공용 `.fx-flash` 의 흰 테(9px)가 «액자 링이 얇은 호스트»(유물 카드 `.rw-c` 링 2px)의
 * 액자선을 통째로 먹는다. 처방을 따르기 전에 제품에게 직접 묻는다(338·341·350·363·372·654·683 규칙).
 *
 *   node tools/probe862.js
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────
 * 683 9회차(`probe683c`)가 남긴 것은 **사실 둘과 막다른 손잡이 하나**다:
 *   ⓐ 흰 판이 카드 액자선 열을 먹어 «정착과 같은 색» 잔존이 **3.1%** (CM ⓐ · 실재)
 *   ⓑ 그 하나의 손잡이(`inset` = 링 두께만큼 들이기)를 켜면 액자선은 **38.3%** 로 살아나지만
 *      흰 테 9px 이 [ring, ring+9] 를 먹어 **라벨 획↔주변 대비가 15.26 → 3.77:1** 로 무너진다.
 * 즉 «들이기» 도 «그대로» 도 답이 아니다. 이 자는 **왜 그런가**(두께 비)와
 * **세 번째 자리가 있는가**(흰 테를 링에서 파생 = `min(css, ring)`)를 화소로 가른다.
 *
 * ⚑ 619 18회차의 처방(«들이기 = 액자 링 두께»)은 옳았지만 **«흰 테 ≤ 링» 일 때만** 성립한다
 *   — 619 의 호스트 셋은 링 8px(흰 테 9px 과 거의 같다)이고, 유물 카드는 링 **2px**(4.5배)다.
 *
 * 절:
 *   [1] 선언 — `.rw-c` 의 액자 링 · `.fx-flash` 의 흰 테 · 둘의 비
 *   [2] 액자선 — 카드 좌·우 6px 기둥의 «정착과 같은 색» 잔존율 (현행 / 들이기만 / 들이기+파생 테)
 *   [3] 라벨 — 획 ↔ 국소 배경(3~4px 중앙값) 대비 (같은 세 판)
 *   [4] 판정 — 두 축을 **동시에** 지키는 판이 있는가
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const ID = 'rl0';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; } };
const r2 = v => Math.round(v * 100) / 100;

/* 프레임 한 장 — T ms 로 감은 연출.
   INSET 이면 `fxFlash` 셋째 인자를 켠 사본으로 부르고, RIM 이 수면 흰 테를 그 두께로 갈아 끼우고,
   RINGFN 이 수면 `fxRingIn` 을 그 값으로 갈아 끼운다
   (셋 다 **제품을 안 고치고** 사본으로만 — 수리 전 트리에서 네 판을 나란히 재기 위해서다).
   ⚠⚠ **RESPAWN 이 이 자의 전제다** — 카드는 소환마다 «팝» 애니로 크기가 오간다. 발화 시각의
     rect 로 한 번 찍는 `fxFlash`(단발 호출은 추적을 안 켠다)는 그래서 **그 판마다 다른 상자**를
     만든다(실측 139.8 ↔ 151 — 판 사이 차가 9.3px 로, 재려는 «들이기 2px» 보다 크다).
     ⇒ 팝을 끝낸 **뒤** 플래시를 다시 띄워 네 판이 **같은 상자**에서 출발하게 한다. */
const SHOT = async ({ T, RIM, INSET, RINGFN, RID, BLANK, NOGAIN, RESPAWN }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  if (!window.__p8to) { window.__p8to = window.setTimeout; window.__p8ri = window.requestAnimationFrame; }
  window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
  const st0 = document.getElementById('__p8nogain'); if (st0) st0.remove();
  if (NOGAIN) { const t = document.createElement('style'); t.id = '__p8nogain';
    t.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(t); }
  const st = document.getElementById('__p8rim'); if (st) st.remove();
  if (RIM != null) { const t = document.createElement('style'); t.id = '__p8rim';
    t.textContent = '.fx-flash{border-width:' + RIM + 'px !important}'; document.head.appendChild(t); }
  if (window.__p8ff) { window.fxFlash = window.__p8ff; window.__p8ff = null; }
  if (INSET) { window.__p8ff = window.fxFlash;
    window.fxFlash = function (el, iv, inset, keep) { return window.__p8ff.call(this, el, iv, true, keep); }; }
  if (window.__p8ri2) { window.fxRingIn = window.__p8ri2; window.__p8ri2 = null; }
  if (RINGFN != null) { window.__p8ri2 = window.fxRingIn; window.fxRingIn = () => RINGFN; }
  const it = RELICS.filter(r => r.id === RID)[0]; if (!it) return null;
  const el0 = document.querySelector('[data-rw="' + RID + '"]');
  if (T >= 0) rwSummonFx(it, true, null);
  /* 팝을 끝낸 뒤 같은 자리에 다시 띄운다 — 네 판의 상자를 같게 만드는 전제(위 머리말) */
  if (T >= 0 && RESPAWN !== false) {
    try { document.getAnimations().forEach(a => { const tg = a.effect && a.effect.target;
      if (!(tg && tg.closest && tg.closest('#fxl'))) { a.pause(); try { a.finish(); } catch (_) {} } }); } catch (e) {}
    for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-flash,.fx-keep'))) nd.remove();
    fxFlash(el0, null, !!INSET, true);
  }
  try { document.getAnimations().forEach(a => {
    const tg = a.effect && a.effect.target;
    if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
    else { a.pause(); try { a.finish(); } catch (_) {} }
  }); } catch (e) {}
  const el = document.querySelector('[data-rw="' + RID + '"]');
  const u = el.querySelector('u'), b = u.getBoundingClientRect(), c = el.getBoundingClientRect();
  if (BLANK) { window.__p8lab = u.textContent; u.textContent = ''; }
  /* 흰 테 실측 — 지금 이 프레임의 플래시 노드가 실제로 두른 두께(사본이든 제품이든 «찍힌 값») */
  let rim = null; const fl = L && L.querySelector('.fx-flash');
  if (fl) { try { rim = parseFloat(getComputedStyle(fl).borderTopWidth); } catch (_) {} }
  return { rim,
    /* 라벨 상자를 **카드 폭으로 좁힌다** — `.rw-c>u` 는 좌우 −40 이라 상자째 재면 카드 밖이 섞인다(788 ⓑ) */
    box: { x: Math.round(Math.max(b.x, c.x)), y: Math.round(b.y),
           w: Math.round(Math.min(b.x + b.width, c.x + c.width) - Math.max(b.x, c.x)), h: Math.round(b.height) },
    card: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) } };
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);
  await ev(p, RID => { for (let i = 0; i < 4000 && !has(RID); i++) summonRelic(true);
    renderRelw(); return has(RID) ? oLv(RID) : null; }, ID);

  const shot = async o => {
    const st = await ev(p, SHOT, Object.assign({ RID: ID, T: 0 }, o));
    if (!st) return null;
    const png = (await p.screenshot()).toString('base64');
    if (o.BLANK) await ev(p, RID => { const el = document.querySelector('[data-rw="' + RID + '"]');
      const u = el && el.querySelector('u');
      if (u && window.__p8lab != null) { u.textContent = window.__p8lab; window.__p8lab = null; } }, ID);
    return { st, png };
  };

  /* ── [1] 선언 ── */
  blk('1] 선언 — `.rw-c` 액자 링 ↔ `.fx-flash` 흰 테');
  const dec = await ev(p, RID => {
    const el = document.querySelector('[data-rw="' + RID + '"]');
    const cs = getComputedStyle(el);
    const probe = document.createElement('s'); probe.className = 'fx-flash';
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:40px;height:40px;animation:none';
    (document.getElementById('fxl') || document.body).appendChild(probe);
    const bw = parseFloat(getComputedStyle(probe).borderTopWidth) || 0;
    probe.remove();
    /* 안쪽 링 = 첫 inset 그림자의 spread(네 번째 길이) — 자가 «수리 전 값» 을 스스로 잰다 */
    let sp = 0;
    for (const part of String(cs.boxShadow).split(/,(?![^(]*\))/)) {
      if (!/\binset\b/.test(part)) continue;
      const px = part.match(/-?\d*\.?\d+px/g);
      if (px && px.length >= 4) { const v = parseFloat(px[3]); if (isFinite(v) && v > 0) { sp = v; break; } }
    }
    return { ring: (typeof fxRingIn === 'function') ? fxRingIn(el) : -1, sp,
             bs: cs.boxShadow.slice(0, 120), bord: parseFloat(cs.borderTopWidth) || 0, bw };
  }, ID);
  info('`.rw-c` box-shadow', dec && dec.bs);
  info('`.rw-c` border-width (액자 **바깥** 겹)', dec && (dec.bord + 'px'));
  info('`.rw-c` inset 그림자 spread (액자 **안쪽** 겹 — 618 이 읽던 유일한 값)', dec && (dec.sp + 'px'));
  info('`fxRingIn()` 이 지금 돌려주는 값', dec && (dec.ring + 'px'));
  info('`.fx-flash` border-width (흰 테)', dec && (dec.bw + 'px'));
  const band = dec ? dec.bord + dec.sp : 6;          /* 호스트가 실제로 그리는 액자 띠 = 테두리 + 안쪽 링 */
  info('호스트가 실제로 그리는 액자 띠', band + 'px (테두리 ' + (dec && dec.bord) + ' + 안쪽 링 ' + (dec && dec.sp) + ')');
  ok(!!dec && dec.sp > 0 && dec.bw > 0,
     '1-a 두 값이 다 읽힌다(둘 다 CSS 에서 나온다 — 손 상수 0개)',
     dec ? ('안쪽 링 ' + dec.sp + 'px · 흰 테 ' + dec.bw + 'px') : '측정 실패');
  ok(!!dec && dec.bw > dec.sp,
     '1-b ★ **뿌리 ①** — 흰 테가 안쪽 링보다 두껍다(619 18회차의 «들이기 = 링» 은 «흰 테 ≤ 링» 일 때만 성립한다)',
     dec ? (r2(dec.bw / dec.sp) + '배 (' + dec.bw + ' ↔ ' + dec.sp + ')') : '측정 실패');
  /* ⚑⚑ **뿌리 ②는 등재문이 못 본 자리다** — `fxRingIn` 은 `box-shadow` 의 inset spread «만» 읽는다.
     619 의 호스트 셋은 `border` 가 0 이라 그것이 곧 액자 띠 전부였지만, 유물 카드는 액자를
     **두 겹**으로 그린다: `border:4px solid #A67B50` **＋** `inset 0 0 0 2px #8A6732`.
     ⇒ 이 호스트의 액자 띠는 2px 이 아니라 **6px** 이고, 자신이 «링 2» 라고 답하는 한
       어떤 들이기도 액자선의 **바깥 4px 을 못 살린다**. */
  ok(!!dec && dec.bord > 0 && dec.sp < band,
     '1-c ★ **뿌리 ②** — 이 호스트는 액자를 **두 겹**으로 그린다(안쪽 링만 세면 띠 ' + band + 'px 중 ' + (dec && dec.sp) + 'px 다)',
     dec ? ('테두리 ' + dec.bord + ' + 안쪽 링 ' + dec.sp + ' = ' + band + ' ↔ 안쪽 링만 ' + dec.sp) : '측정 실패');

  /* ── 화소 도구 ── */
  const RINGPX = async (aPng, zPng, card) => ev(p, async ({ a, z, c }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(c.x, c.y, c.w, c.h).data; };
    const A = await px(a), Z = await px(z);
    const lum = d => (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A), lz = lum(Z);
    let same = 0, tot = 0;
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      if (x >= 6 && x < c.w - 6) continue;
      const i = (y * c.w + x) * 4; tot++;
      if (Math.abs(la(i) - lz(i)) <= 24) same++;
    }
    return { same, tot, pct: tot ? Math.round(same / tot * 1000) / 10 : 0 };
  }, { a: aPng, z: zPng, c: card });

  const CL = async (aPng, zPng, box) => ev(p, async ({ a, z, bx }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(bx.x, bx.y, bx.w, bx.h).data; };
    const A = await px(a), Z = await px(z);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = d => (i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = d => (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A), lz = lum(Z);
    const ink = [];
    for (let i = 0; i < A.length; i += 4) if (Math.abs(la(i) - lz(i)) >= 24) ink.push(i);
    if (ink.length < 120) return { ink: ink.length };
    const iv = ink.map(la).sort((x, y) => x - y);
    const hiT = iv[Math.floor(iv.length * 0.75)];
    const fill = ink.filter(i => la(i) >= hiT);
    const isInk = new Uint8Array(bx.w * bx.h);
    for (const i of ink) isInk[i / 4] = 1;
    const rr = rl(A), out = [];
    for (const i of fill) { const q = i / 4, x = q % bx.w, y = (q / bx.w) | 0; const cand = [];
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const m = Math.abs(dx) + Math.abs(dy); if (m < 3 || m > 4) continue;
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bx.w || ny >= bx.h) continue;
        const j = (ny * bx.w + nx); if (isInk[j]) continue; cand.push(rr(j * 4));
      }
      if (!cand.length) continue;
      cand.sort((u, v) => u - v);
      const bg = cand[cand.length >> 1], fg = rr(i);
      out.push((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05));
    }
    out.sort((u, v) => u - v);
    return { ink: ink.length, nf: fill.length,
             med: out.length ? out[out.length >> 1] : null,
             under45: out.length ? out.filter(v => v < 4.5).length / out.length : null };
  }, { a: aPng, z: zPng, bx: box });

  /* ── 기준 프레임 ── */
  const settled = await shot({ T: -1, NOGAIN: true });
  const blank = await shot({ T: -1, NOGAIN: true, BLANK: true });
  const CARD = settled && settled.st.card, BOX = settled && settled.st.box;
  info('카드 상자', CARD && JSON.stringify(CARD));
  info('라벨 상자(카드 폭으로 좁힘)', BOX && JSON.stringify(BOX));

  const ring = dec ? dec.sp : 2, cssRim = dec ? dec.bw : 9;
  /* ⚑ **판은 전부 «사본» 으로 만든다 — 수리 전·후 어느 트리에서 돌려도 같은 여섯 판이 나온다.**
     `fxRingIn` 과 흰 테를 판마다 못박으므로 제품이 무엇을 하든 이 표는 안 흔들린다
     (ⓐ 가 곧 «수리 전» 이다 — 들이기 0 · 흰 테 CSS 값). */
  const PLANS = [
    ['ⓐ 수리 전 (들이기 0 · 흰 테 ' + cssRim + ')',              { T: 0, NOGAIN: true, RINGFN: 0, RIM: cssRim }],
    ['ⓑ 들이기 = 안쪽 링만 (683 이 기각한 손잡이 · ' + ring + ' · 흰 테 ' + cssRim + ')', { T: 0, NOGAIN: true, INSET: true, RINGFN: ring, RIM: cssRim }],
    ['ⓒ 안쪽 링 들이기 + 흰 테 파생 (' + ring + ' · ' + Math.min(cssRim, ring) + ') — 등재문 처방 ①', { T: 0, NOGAIN: true, INSET: true, RINGFN: ring, RIM: Math.min(cssRim, ring) }],
    ['ⓔ **띠 전부**(테두리+링 = ' + band + ') 들이기 + 흰 테 ' + Math.min(cssRim, band) + ' — **채택**', { T: 0, NOGAIN: true, INSET: true, RINGFN: band, RIM: Math.min(cssRim, band) }],
    ['ⓕ **띠 전부**(' + band + ') 들이기 + 흰 테는 CSS 그대로(' + cssRim + ')', { T: 0, NOGAIN: true, INSET: true, RINGFN: band, RIM: cssRim }],
    ['ⓓ 대조 — 흰 테만 파생(들이기 0)',                          { T: 0, NOGAIN: true, RINGFN: 0, RIM: Math.min(cssRim, ring) }],
  ];
  const R = {};
  blk('2] 액자선 — 카드 좌·우 6px 기둥의 «정착과 같은 색» 잔존율');
  for (const [name, o] of PLANS) {
    const s = await shot(o); if (!s || !settled) { info(name, '캡처 실패'); continue; }
    const r = await RINGPX(s.png, settled.png, CARD);
    R[name] = { ring: r && r.pct, rim: s.st.rim };
    info(name, r ? (r.pct + '% (' + r.same + '/' + r.tot + ') · 찍힌 흰 테 ' + s.st.rim + 'px') : '측정 실패');
  }
  blk('3] 라벨 — 획 ↔ 국소 배경(3~4px 중앙값) 대비');
  const base = settled && blank ? await CL(settled.png, blank.png, BOX) : null;
  info('정착(연출 0)', base && base.med
    ? ('글리프 ' + base.ink + ' · 채움 ' + base.nf + ' · 중앙값 ' + r2(base.med) + ':1 · 4.5:1 미만 ' + Math.round(base.under45 * 100) + '%')
    : '측정 실패');
  for (const [name, o] of PLANS) {
    const s = await shot(o); if (!s || !blank) { info(name, '캡처 실패'); continue; }
    const r = await CL(s.png, blank.png, BOX);
    if (R[name]) R[name].lab = r && r.med, R[name].u45 = r && r.under45;
    info(name, r && r.med
      ? ('중앙값 ' + r2(r.med) + ':1 · 4.5:1 미만 ' + Math.round(r.under45 * 100) + '%')
      : '측정 실패');
  }

  /* ── [4] 판정 ── */
  blk('4] 판정 — 두 축을 **동시에** 지키는 판');
  const A = R[PLANS[0][0]], B = R[PLANS[1][0]], C = R[PLANS[2][0]], E = R[PLANS[3][0]], F = R[PLANS[4][0]], D = R[PLANS[5][0]];
  info('ⓕ(흰 테 CSS 그대로) — 액자선 · 라벨', F ? (F.ring + '% · ' + r2(F.lab) + ':1 · 4.5:1 미만 ' + Math.round(F.u45 * 100) + '%') : '측정 실패');
  const b0 = base && base.med ? base.med : 0;
  ok(!!A && A.ring != null && A.ring < 10,
     '4-a ★ **등재문 ⓒ 재현** — 현행은 액자선 열을 먹는다(잔존 10% 아래)',
     A ? A.ring + '%' : '측정 실패');
  ok(!!B && !!A && B.ring > A.ring + 5 && b0 > 0 && B.lab != null && B.lab < b0 * 0.5,
     '4-b ★ **등재문 ⓓ 재현** — 들이기만 켜면 액자선은 살지만 **라벨을 잃는다**(정착의 절반 아래)',
     B ? ('액자선 ' + A.ring + '% → ' + B.ring + '% · 라벨 ' + r2(B.lab) + ':1 ↔ 정착 ' + r2(b0) + ':1') : '측정 실패');
  ok(!!C && !!A && C.ring > A.ring + 5,
     '4-c ★ **세 번째 자리가 있다 ①** — 흰 테를 링에서 파생하면 액자선이 산다',
     C ? (A.ring + '% → ' + C.ring + '%') : '측정 실패');
  /* ⚑⚑ **라벨 축의 자는 «중앙값» 이 아니라 «읽을 수 있는가» 다** — 이 판단을 여기 적어 둔다.
     플래시가 하는 일이 곧 «카드를 워시로 덮는» 것이라 어느 판이든 중앙값은 내려간다(정착 17.71).
     683 9회차가 실제로 통과선으로 쓴 것도 **4.5:1 미만 비율**이고(«0%» 로 적혀 있다),
     ⓑⓒ 를 기각한 근거도 그 축이 **64~66%** 로 터진 것이지 중앙값이 아니었다.
     ⇒ 아래 두 항은 «4.5:1 미만 비율이 **현행보다 나쁘지 않은가**» 로 묻는다(중앙값은 기록만).
     ⚠ 무르게 잡은 자가 아님은 4-b 가 못박는다 — 같은 자로 ⓑ 는 **빨갛다**(64% ≫ 7%). */
  const u45 = v => v == null ? '?' : Math.round(v * 100) + '%';
  ok(!!C && !!A && C.u45 != null && A.u45 != null && C.u45 > A.u45 + 0.2,
     '4-d ★ **등재문 처방 ① 은 라벨을 못 살린다**(기각) — 흰 테만 링에서 파생하면 4.5:1 미만이 현행보다 크게 는다',
     C ? ('4.5:1 미만 ' + u45(C.u45) + ' ↔ 현행 ' + u45(A.u45) + ' · 중앙값 ' + r2(C.lab) + ':1') : '측정 실패');
  ok(!!E && !!A && E.ring != null && A.ring != null && E.ring > A.ring + 5
     && E.u45 != null && A.u45 != null && E.u45 <= A.u45 + 0.02,
     '4-e ★ **띠 전부(테두리+링)를 들이면 두 축이 같이 산다** — 액자선이 살고 4.5:1 미만도 현행 이하다',
     E ? ('액자선 ' + A.ring + '% → ' + E.ring + '% · 4.5:1 미만 ' + u45(E.u45) + ' ↔ 현행 ' + u45(A.u45)
          + ' · 중앙값 ' + r2(E.lab) + ':1(정착 ' + r2(b0) + ':1)') : '측정 실패');
  ok(!!E && !!F && E.u45 != null && F.u45 != null && E.u45 < F.u45,
     '4-f ★ **흰 테 상한(min(css, 띠))이 값을 한다** — 안 씌우면 같은 들이기에서도 4.5:1 미만이 늘어난다',
     E && F ? ('상한 있음 ' + u45(E.u45) + ' ↔ 없음 ' + u45(F.u45) + ' (둘 다 액자선 ' + E.ring + '%)') : '측정 실패');
  ok(!!D && !!A && D.ring != null && A.ring != null && D.ring < A.ring + 5,
     '4-g ★ **흰 테만 얇게 하는 것은 답이 아니다** — 들이기가 없으면 얇은 테가 액자선 자리에 그대로 앉는다',
     D ? ('들이기 0 · 흰 테 ' + Math.min(cssRim, ring) + ' → 잔존 ' + D.ring + '% (현행 ' + A.ring + '%)') : '측정 실패');

  info('페이지 에러', errs.length ? errs.join(' / ') : '0건');
  ok(errs.length === 0, '4-h 콘솔 에러 0건', errs.length + '건');
  console.log('\nPROBE862 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
