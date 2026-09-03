/* 작업 862 — 게이트: **공용 `.fx-flash` 는 호스트의 «액자 띠» 를 안 먹는다.**
 *
 *   node tools/verify862.js
 *
 * ── 무엇을 지키는가 ──────────────────────────────────────────────────────
 * 재현자(`probe862`)가 낸 사실 셋 위에 선다:
 *   ⓐ 유물 카드 `.rw-c` 는 액자를 **두 겹**으로 그린다 — `border:4px` + `inset … 2px` = 띠 **6px**.
 *   ⓑ 수리 전 `fxRingIn` 은 **안쪽 링(2px)만** 답했고, 들이기는 `inset` 인자를 준 호출(619 회당 발화)
 *      에만 걸려 있었다 ⇒ 단발 호출인 유물 카드는 흰 테 9px 이 [0,9] 를 먹어 **액자선 잔존 3.1%**.
 *   ⓒ 띠 전부를 들이고 흰 테를 그 띠로 누르면 **액자선 100% · 라벨 4.5:1 미만 6%**(수리 전 7%).
 * 이 자는 그 처방이 **파생으로** 서 있는지(손 상수 0개), **액자가 없는 호스트는 한 픽셀도 안 바뀌는지**,
 * 그리고 되돌리면 **다시 빨개지는지**를 묻는다.
 *
 * 절:
 *   [A] 선언 — `fxRingIn` 이 «테두리 + 안쪽 링» 을 돌려준다 · 값이 CSS 를 따라 움직인다(파생)
 *   [B] 기하 — 실제 발화에서 상자가 띠만큼 들어가고 흰 테가 띠를 안 넘는다
 *   [C] 화소 — 액자선 잔존 · 라벨 «4.5:1 미만» 비율
 *   [D] 불변 — 액자가 없는 호스트(09·12·17·코스튬·장비 축)는 상자도 흰 테도 그대로다
 *   [R] 되돌림 — 두 손잡이를 각각 되돌리면 [C] 가 무너진다
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

/* 한 프레임 — 팝을 끝낸 뒤 같은 자리에 다시 띄운다(`probe862` 와 같은 전제: 팝이 상자를 흔들면
   판마다 다른 상자가 나온다 — 실측 139.8 ↔ 151). RINGFN 이 수면 `fxRingIn` 을, NOCAP 이 수면
   흰 테 상한을 되돌린 사본이 된다(§R). */
const SHOT = async ({ T, RID, RINGFN, NOCAP, BLANK, PHASE }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  if (!window.__v862to) { window.__v862to = window.setTimeout; window.__v862ri = window.requestAnimationFrame; }
  window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
  /* ⚑ 876 — **위상 고정(deterministic phase-pin).** t0 프레임은 `@keyframes fxFlash`(340ms)의
     0% 여야 한다(opacity:1·scale(1) — 흰 판이 떠 있고 상자가 안 커진 자리). 그런데 캡처는
     `evaluate` 가 끝난 **뒤** 별도 CDP 호출로 찍혀 그 사이 컴포지터가 계속 돈다. 부하가 실리면
     갓 만든 CSS 애니가 `document.getAnimations()` 에 아직 안 올라와 아래 일시정지 루프가 놓치고
     (그 순간 «running» 이던 것이 «paused» 로 안 바뀐다), 남은 애니는 그 340ms 안에서 **임의 위상**에
     걸린다 — 52% 봉우리(scale 1.06)면 흰 판이 띠 6px 을 4px 씩 밟아 액자선 잔존이 100%→1% 로 뒤집힌다.
     ⇒ `#fxl` 의 모든 애니를 **선언으로** 정지(`animation-play-state:paused`)해 «지금 생기든 나중에
     생기든» 첫 프레임(0%)에서 멈춘 채로 태어나게 한다. getAnimations 타이밍과 무관해진다.
     여기에 실제 위상은 아래 WAAPI 루프가 `currentTime = T` 로 못박아 이중으로 고정한다(§C4).
     ⚑ `.fx-toast`(cp 알림)는 스폰이 **비동기**라 gap 에서 떠오른다 — 측정 구획(카드 띠·라벨) 밖이지만
        전체 스크린샷의 잡음이라 캡처에서만 숨긴다(제품 불변 · 09·12·17 축과 무관). */
  { let s = document.getElementById('__v862nogain');
    if (!s) { s = document.createElement('style'); s.id = '__v862nogain';
      s.textContent = '.fx-spark.fx-rlic{display:none !important}.fx-toast{display:none !important}'
        + '#fxl,#fxl *{animation-play-state:paused !important}'; document.head.appendChild(s); } }
  { const o = document.getElementById('__v862nocap'); if (o) o.remove(); }
  if (NOCAP) { const s = document.createElement('style'); s.id = '__v862nocap';
    s.textContent = '.fx-flash{border-width:' + NOCAP + 'px !important}'; document.head.appendChild(s); }
  if (window.__v862ring) { window.fxRingIn = window.__v862ring; window.__v862ring = null; }
  if (RINGFN != null) { window.__v862ring = window.fxRingIn; window.fxRingIn = () => RINGFN; }
  const it = RELICS.filter(r => r.id === RID)[0]; if (!it) return null;
  const el = document.querySelector('[data-rw="' + RID + '"]');
  if (T >= 0) {
    rwSummonFx(it, true, null);
    try { document.getAnimations().forEach(a => { const tg = a.effect && a.effect.target;
      if (!(tg && tg.closest && tg.closest('#fxl'))) { a.pause(); try { a.finish(); } catch (_) {} } }); } catch (e) {}
    for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-flash,.fx-keep'))) nd.remove();
    fxFlash(el, null, false, true);                 /* 유물 카드의 실제 호출 꼴 — **단발**(`inset` 없음) */
  }
  try { document.getAnimations().forEach(a => {
    const tg = a.effect && a.effect.target;
    if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
    else { a.pause(); try { a.finish(); } catch (_) {} }
  }); } catch (e) {}
  const u = el.querySelector('u'), b = u.getBoundingClientRect(), c = el.getBoundingClientRect();
  if (BLANK) { window.__v862lab = u.textContent; u.textContent = ''; }
  let box = null, rim = null; const fl = L && L.querySelector('.fx-flash');
  /* ⚑ 876 §C4 — 위상 고정이 «일부러 고른 자리» 임을 못박는 되돌림 손잡이: PHASE(ms)를 주면
     흰 판 애니를 그 시각으로 돌려(선언 정지 위에서도 WAAPI currentTime 은 그 프레임을 그린다)
     캡처가 봉우리(52%)에 걸렸을 때의 값을 재현한다 — 그 값이 0% 와 다르면 «어느 프레임을 재는가»
     가 실제로 결과를 바꾼다는 뜻이고, 그래서 위상을 0 으로 못박은 것이 무른 수리가 아니다. */
  if (PHASE != null && fl) { try { for (const a of fl.getAnimations()) a.currentTime = PHASE; } catch (_) {} }
  if (fl) { const q = fl.getBoundingClientRect();
    box = { x: +q.x.toFixed(2), y: +q.y.toFixed(2), w: +q.width.toFixed(2), h: +q.height.toFixed(2) };
    try { rim = parseFloat(getComputedStyle(fl).borderTopWidth); } catch (_) {} }
  return { box, rim,
    lab: { x: Math.round(Math.max(b.x, c.x)), y: Math.round(b.y),
           w: Math.round(Math.min(b.x + b.width, c.x + c.width) - Math.max(b.x, c.x)), h: Math.round(b.height) },
    card: { x: +c.x.toFixed(2), y: +c.y.toFixed(2), w: +c.width.toFixed(2), h: +c.height.toFixed(2) } };
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
  await ev(p, RID => { for (let i = 0; i < 4000 && !has(RID); i++) summonRelic(true); renderRelw(); }, ID);

  const shot = async o => {
    const st = await ev(p, SHOT, Object.assign({ RID: ID, T: 0 }, o));
    if (!st) return null;
    const png = (await p.screenshot()).toString('base64');
    if (o.BLANK) await ev(p, RID => { const el = document.querySelector('[data-rw="' + RID + '"]');
      const u = el && el.querySelector('u');
      if (u && window.__v862lab != null) { u.textContent = window.__v862lab; window.__v862lab = null; } }, ID);
    return { st, png };
  };

  /* ═══ [A] 선언 ═══════════════════════════════════════════════════════ */
  blk('A] 선언 — `fxRingIn` 이 «테두리 + 안쪽 링» 을 돌려준다(파생 · 손 상수 0개)');
  const A = await ev(p, RID => {
    const el = document.querySelector('[data-rw="' + RID + '"]');
    const cs = getComputedStyle(el);
    const spread = e => { let v = 0;
      for (const part of String(getComputedStyle(e).boxShadow).split(/,(?![^(]*\))/)) {
        if (!/\binset\b/.test(part)) continue;
        const px = part.match(/-?\d*\.?\d+px/g);
        if (px && px.length >= 4) { const q = parseFloat(px[3]); if (isFinite(q) && q > 0) { v = q; break; } } }
      return v; };
    /* 파생 시험 — 테두리를 늘리면 답도 그만큼 따라와야 한다(어딘가에 6 을 적어 둔 게 아니다) */
    const before = fxRingIn(el);
    const keep = el.style.borderWidth; el.style.borderWidth = (parseFloat(cs.borderTopWidth) + 5) + 'px';
    const after = fxRingIn(el); el.style.borderWidth = keep;
    /* 액자가 없는 호스트 · 테두리만 있는 호스트 — 09·12·17 축과 «둘째 갈래» */
    const mk = css => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:-9999px;top:0;width:60px;height:60px;' + css;
      document.body.appendChild(d); const v = fxRingIn(d); d.remove(); return v; };
    return { bord: parseFloat(cs.borderTopWidth) || 0, sp: spread(el), ring: before, ring5: after,
             none: mk(''), bordOnly: mk('border:7px solid #000'), insOnly: mk('box-shadow:inset 0 0 0 3px #000') };
  }, ID);
  info('`.rw-c` 테두리 · 안쪽 링', A ? (A.bord + 'px + ' + A.sp + 'px = 띠 ' + (A.bord + A.sp) + 'px') : '측정 실패');
  ok(!!A && A.ring === A.bord + A.sp,
     'A1 ★ `fxRingIn(.rw-c)` = 테두리 + 안쪽 링 (수리 전 값은 안쪽 링만인 ' + (A ? A.sp : '?') + ')',
     A ? (A.ring + 'px ↔ ' + A.bord + ' + ' + A.sp) : '측정 실패');
  ok(!!A && A.ring5 === A.ring + 5,
     'A2 ★ **파생이다** — 호스트 테두리를 5px 늘리면 답도 5px 따라온다(상수를 적어 둔 것이 아니다)',
     A ? (A.ring + ' → ' + A.ring5) : '측정 실패');
  ok(!!A && A.none === 0,
     'A3 ★ 액자가 없는 호스트는 0 이다 — 09·12·17·코스튬·장비의 단발 플래시가 안 바뀌는 근거',
     A ? ('' + A.none) : '측정 실패');
  ok(!!A && A.bordOnly === 7 && A.insOnly === 3,
     'A4 두 겹 중 한 겹만 있는 호스트도 제 값을 답한다(테두리만 7 · 안쪽 링만 3)',
     A ? ('테두리만 ' + A.bordOnly + ' · 안쪽 링만 ' + A.insOnly) : '측정 실패');

  /* ═══ [B] 기하 ═══════════════════════════════════════════════════════ */
  blk('B] 기하 — 상자가 띠만큼 들어가고 흰 테가 띠를 안 넘는다');
  const cssRim = await ev(p, () => { const s = document.createElement('s'); s.className = 'fx-flash';
    s.style.cssText = 'position:absolute;left:-9999px;top:0;width:40px;height:40px;animation:none';
    (document.getElementById('fxl') || document.body).appendChild(s);
    const v = parseFloat(getComputedStyle(s).borderTopWidth) || 0; s.remove(); return v; });
  const band = A ? A.bord + A.sp : 6;
  const live = await shot({ T: 0 });
  const B = live && live.st;
  info('`.fx-flash` CSS 흰 테', cssRim + 'px');
  info('카드 ↔ 플래시 상자', B ? (JSON.stringify(B.card) + ' ↔ ' + JSON.stringify(B.box)) : '측정 실패');
  ok(!!B && !!B.box && Math.abs((B.box.x - B.card.x) - band) < 0.6 && Math.abs((B.box.y - B.card.y) - band) < 0.6
     && Math.abs((B.card.w - B.box.w) - 2 * band) < 1.2 && Math.abs((B.card.h - B.box.h) - 2 * band) < 1.2,
     'B1 ★ **단발 호출에서도** 상자가 네 변 모두 띠(' + band + 'px)만큼 들어간다 — 들이기는 `inset` 인자가 아니라 «액자가 있는가» 가 정한다',
     B && B.box ? ('좌 Δ' + r2(B.box.x - B.card.x) + ' · 상 Δ' + r2(B.box.y - B.card.y)
                   + ' · 폭 −' + r2(B.card.w - B.box.w) + ' · 높이 −' + r2(B.card.h - B.box.h)) : '측정 실패');
  ok(!!B && B.rim != null && B.rim === Math.min(cssRim, band) && B.rim < cssRim,
     'B2 ★ 흰 테가 «CSS 값 ↔ 띠» 중 작은 쪽이다 — 액자선 자리를 넘지 않는다',
     B ? (B.rim + 'px = min(' + cssRim + ', ' + band + ')') : '측정 실패');
  /* ⚑ **두 띠가 겹치지 않는다** — 액자선은 카드 안쪽 [0, 띠] · 흰 테는 [띠, 띠+흰 테].
     이 항이 [B1]·[B2] 를 «그래서 무엇이 되는가» 로 합친다(그림에서 [C1] 이 100% 인 이유). */
  ok(!!B && !!B.box && B.rim != null && (B.box.y - B.card.y) >= band - 0.6 && (B.box.x - B.card.x) >= band - 0.6,
     'B3 ★ 두 띠가 안 겹친다 — 액자선 [0, ' + band + '] · 흰 테 [' + band + ', ' + (band + (B && B.rim || 0)) + ']',
     B && B.box ? ('흰 테 바깥 끝 ' + r2(B.box.y - B.card.y) + 'px (띠 안쪽 끝 ' + band + 'px)') : '측정 실패');

  /* ═══ 화소 도구 ═══ */
  const RINGPX = async (aPng, zPng, card, w) => ev(p, async ({ a, z, c, bw }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(Math.round(c.x), Math.round(c.y), Math.round(c.w), Math.round(c.h)).data; };
    const A2 = await px(a), Z = await px(z);
    const W2 = Math.round(c.w), H2 = Math.round(c.h);
    const lum = d => (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A2), lz = lum(Z);
    let same = 0, tot = 0;
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      if (x >= bw && x < W2 - bw) continue;
      const i = (y * W2 + x) * 4; tot++;
      if (Math.abs(la(i) - lz(i)) <= 24) same++;
    }
    return { same, tot, pct: tot ? Math.round(same / tot * 1000) / 10 : 0 };
  }, { a: aPng, z: zPng, c: card, bw: w });

  const CL = async (aPng, zPng, box) => ev(p, async ({ a, z, bx }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(bx.x, bx.y, bx.w, bx.h).data; };
    const A2 = await px(a), Z = await px(z);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = d => (i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = d => (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A2), lz = lum(Z);
    const ink = []; for (let i = 0; i < A2.length; i += 4) if (Math.abs(la(i) - lz(i)) >= 24) ink.push(i);
    if (ink.length < 120) return { ink: ink.length };
    const iv = ink.map(la).sort((x, y) => x - y);
    const hiT = iv[Math.floor(iv.length * 0.75)];
    const fill = ink.filter(i => la(i) >= hiT);
    const isInk = new Uint8Array(bx.w * bx.h); for (const i of ink) isInk[i / 4] = 1;
    const rr = rl(A2), out = [];
    for (const i of fill) { const q = i / 4, x = q % bx.w, y = (q / bx.w) | 0; const cand = [];
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const m = Math.abs(dx) + Math.abs(dy); if (m < 3 || m > 4) continue;
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bx.w || ny >= bx.h) continue;
        const j = (ny * bx.w + nx); if (isInk[j]) continue; cand.push(rr(j * 4)); }
      if (!cand.length) continue;
      cand.sort((u, v) => u - v);
      const bg = cand[cand.length >> 1], fg = rr(i);
      out.push((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)); }
    out.sort((u, v) => u - v);
    return { ink: ink.length, nf: fill.length, med: out.length ? out[out.length >> 1] : null,
             under45: out.length ? out.filter(v => v < 4.5).length / out.length : null };
  }, { a: aPng, z: zPng, bx: box });

  /* ═══ [C] 화소 ═══════════════════════════════════════════════════════ */
  blk('C] 화소 — 액자선 잔존 · 라벨 «4.5:1 미만» 비율');
  const settled = await shot({ T: -1 });
  const blank = await shot({ T: -1, BLANK: true });
  const CARD = settled && settled.st.card, LAB = settled && settled.st.lab;
  const now = live && settled ? await RINGPX(live.png, settled.png, CARD, band) : null;
  info('액자선 잔존(카드 좌·우 ' + band + 'px 기둥 · t0 ↔ 정착)', now ? (now.pct + '% (' + now.same + '/' + now.tot + ')') : '측정 실패');
  ok(!!now && now.pct >= 90,
     'C1 ★ **액자선이 산다** — 흰 판이 떠 있는 프레임에서도 띠 화소의 90% 이상이 정착과 같은 색이다 (수리 전 3.1%)',
     now ? now.pct + '%' : '측정 실패');
  const baseCL = settled && blank ? await CL(settled.png, blank.png, LAB) : null;
  const liveCL = live && blank ? await CL(live.png, blank.png, LAB) : null;
  const u45 = v => v == null ? '?' : Math.round(v * 100) + '%';
  info('라벨 «Lv.n» — 정착', baseCL ? (r2(baseCL.med) + ':1 · 4.5:1 미만 ' + u45(baseCL.under45)) : '측정 실패');
  info('라벨 «Lv.n» — t0', liveCL ? (r2(liveCL.med) + ':1 · 4.5:1 미만 ' + u45(liveCL.under45)) : '측정 실패');
  /* ⚠ 자는 «중앙값» 이 아니라 **읽을 수 있는가**(4.5:1 미만 비율)를 묻는다 — 플래시가 하는 일이
     곧 워시라 어느 판이든 중앙값은 내려간다(정착 17.71). 683 9회차가 ⓑⓒ 를 기각한 축도 이것이고
     (64~66%), 수리 전 값이 7% 다. 문턱 10% 는 그 둘 사이가 아니라 **수리 전 + 3%p** 다. */
  ok(!!liveCL && liveCL.under45 != null && liveCL.under45 <= 0.10,
     'C2 ★ 라벨이 읽힌다 — 획 화소의 «4.5:1 미만» 이 10% 이하다 (수리 전 7% · 등재문이 기각한 판 64~66%)',
     liveCL ? u45(liveCL.under45) : '측정 실패');
  ok(!!baseCL && !!liveCL && baseCL.under45 != null && liveCL.under45 <= baseCL.under45,
     'C3 연출이 도는 프레임이 **정착보다 나쁘지 않다**',
     baseCL && liveCL ? ('t0 ' + u45(liveCL.under45) + ' ↔ 정착 ' + u45(baseCL.under45)) : '측정 실패');
  /* ⚑ 876 §C4 — **위상 고정 회귀 게이트.** t0 를 여러 번 다시 찍어 [C1] 값이 실행마다 흔들리지
     않음을 못박는다. 등재문의 사고(같은 트리·같은 명령이 1%↔16.5%↔100% 로 튀어 14/17↔17/17)가
     되살아나면 **바로 이 항이 빨개진다** — [C1] 문턱(90%)을 넓히지 않고 «어느 프레임을 재는가» 를
     고정한 것이 수리의 본체임을 굳힌다(872 처방의 골자 — 다만 여기서는 중앙값이 아니라 **분산 0**
     을 요구할 수 있다: 위상이 선언으로 정지돼 판마다 같은 0% 프레임이 나오기 때문이다). */
  const reC1 = [];
  for (let g = 0; g < 4 && now; g++) { const s = await shot({ T: 0 });
    const q = s && settled ? await RINGPX(s.png, settled.png, CARD, band) : null; if (q) reC1.push(q.pct); }
  const c1Min = reC1.length ? Math.min(...reC1) : null, c1Max = reC1.length ? Math.max(...reC1) : null;
  info('t0 [C1] 5판(now 포함) 재현', now ? ([now.pct].concat(reC1).join('% · ') + '%') : '측정 실패');
  ok(reC1.length === 4 && c1Max - c1Min === 0 && c1Min === now.pct,
     'C4 ★ **위상 고정** — t0 [C1] 이 다섯 판 모두 같다(분산 0). 등재 사고(1↔16.5↔100)의 회귀 게이트',
     reC1.length ? ('진폭 ' + r2(c1Max - c1Min) + '%p (' + c1Min + '~' + c1Max + ' ↔ now ' + now.pct + ')') : '측정 실패');

  /* ═══ [D] 불변 ═══════════════════════════════════════════════════════ */
  blk('D] 불변 — 액자가 없는 호스트는 상자도 흰 테도 그대로다(09·12·17·코스튬·장비 축)');
  const D = await ev(p, () => {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:40px;top:40px;width:120px;height:80px;background:#333';
    document.body.appendChild(host);
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    fxFlash(host);                                    /* 09·12·17 과 같은 **단발** 호출 */
    const fl = L.querySelector('.fx-flash');
    const r = host.getBoundingClientRect(), q = fl ? fl.getBoundingClientRect() : null;
    const out = { ring: fxRingIn(host),
                  dx: q ? +(q.x - r.x).toFixed(2) : null, dy: q ? +(q.y - r.y).toFixed(2) : null,
                  dw: q ? +(q.width - r.width).toFixed(2) : null,
                  rim: fl ? parseFloat(getComputedStyle(fl).borderTopWidth) : null };
    host.remove(); while (L && L.firstChild) L.removeChild(L.firstChild);
    return out;
  });
  ok(!!D && D.ring === 0 && D.dx === 0 && D.dy === 0 && D.dw === 0,
     'D1 ★ 상자가 호스트 rect 그대로다(들이기 0)',
     D ? ('링 ' + D.ring + ' · Δx ' + D.dx + ' · Δy ' + D.dy + ' · Δw ' + D.dw) : '측정 실패');
  ok(!!D && D.rim === cssRim,
     'D2 ★ 흰 테가 CSS 값 그대로다 — 상한은 «액자가 있는 호스트» 에만 걸린다',
     D ? (D.rim + 'px ↔ CSS ' + cssRim + 'px') : '측정 실패');

  /* ═══ [R] 되돌림 ═════════════════════════════════════════════════════ */
  blk('R] 되돌림 — 두 손잡이를 각각 되돌리면 [C] 가 무너진다');
  const oldRing = await shot({ T: 0, RINGFN: A ? A.sp : 2 });   /* 수리 전 답(안쪽 링만) */
  const rOld = oldRing && settled ? await RINGPX(oldRing.png, settled.png, CARD, band) : null;
  ok(!!rOld && !!now && rOld.pct < now.pct - 30,
     'R1 ★ `fxRingIn` 을 «안쪽 링만» 으로 되돌리면 액자선이 다시 무너진다 — [C1] 이 «원래부터 참» 을 굳힌 항이 아니다',
     rOld && now ? (rOld.pct + '% ↔ 지금 ' + now.pct + '%') : '측정 실패');
  const zeroRing = await shot({ T: 0, RINGFN: 0 });             /* 수리 전 단발 호출(들이기 0) */
  const rZero = zeroRing && settled ? await RINGPX(zeroRing.png, settled.png, CARD, band) : null;
  ok(!!rZero && rZero.pct < 10,
     'R2 ★ 들이기를 0 으로 되돌리면(= 수리 전 단발 호출) 액자선 잔존이 10% 아래로 떨어진다',
     rZero ? rZero.pct + '%' : '측정 실패');
  const noCap = await shot({ T: 0, NOCAP: cssRim });             /* 흰 테 상한만 되돌린 사본 */
  const capCL = noCap && blank ? await CL(noCap.png, blank.png, LAB) : null;
  ok(!!capCL && !!liveCL && capCL.under45 != null && capCL.under45 > liveCL.under45,
     'R3 ★ 흰 테 상한만 되돌리면 라벨의 «4.5:1 미만» 이 는다 — 상한이 헛일이 아니다',
     capCL && liveCL ? (u45(capCL.under45) + ' ↔ 지금 ' + u45(liveCL.under45)) : '측정 실패');
  /* 원복이 «자를 무르게 잡아» 통과한 게 아님을 못박는다 — 같은 자로 다시 초록 */
  const back = await shot({ T: 0 });
  const rBack = back && settled ? await RINGPX(back.png, settled.png, CARD, band) : null;
  ok(!!rBack && rBack.pct >= 90,
     'R4 원복하면 같은 자로 다시 초록',
     rBack ? rBack.pct + '%' : '측정 실패');
  /* ⚑ 876 §R5 — **위상 민감도(«어느 프레임을 재는가» 가 실제로 결과를 바꾼다).** 흰 판을 봉우리
     (52% = FXFLASH_MS 의 scale 1.06 자리)로 돌려 찍으면 상자가 띠를 4px 씩 밟아 액자선 잔존이
     확 떨어진다 — 이 값이 0% 프레임(now)과 크게 다르다는 것이 곧 «위상이 안 고정되면 게이트가
     흔들린다» 는 증거고, 그래서 §C4 의 위상 고정이 무른 수리가 아니라 **결함을 없앤 수리**임을 굳힌다.
     ⚠ 이 항은 «봉우리에서 나빠야 한다» 를 단언할 뿐, 문턱(90%)을 봉우리 값으로 낮추지 않는다. */
  const peakMs = await ev(p, () => (typeof FXFLASH_MS === 'number' ? FXFLASH_MS : 340)) || 340;
  const peak = await shot({ T: 0, PHASE: Math.round(peakMs * 0.52) });
  const rPeak = peak && settled ? await RINGPX(peak.png, settled.png, CARD, band) : null;
  ok(!!rPeak && !!now && rPeak.pct < now.pct - 30,
     'R5 ★ 봉우리(52%) 프레임은 액자선 잔존이 확 낮다 — 위상이 결과를 가른다(∴ 고정이 결함 수리다)',
     rPeak && now ? (rPeak.pct + '% ↔ 0% 프레임 ' + now.pct + '%') : '측정 실패');

  ok(errs.length === 0, 'R6 콘솔 에러 0건', errs.length + '건' + (errs.length ? ' — ' + errs.join(' / ') : ''));
  console.log('\nVERIFY862 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
