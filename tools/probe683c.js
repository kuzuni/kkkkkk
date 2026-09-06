/* 작업 683 — **9회차 재현자**: 비평가 둘(CL·CM)이 그림에서 잰 것과 `verify683` [H] 가 적은 것이
 * 어긋난다. 처방을 따르기 전에 제품에게 직접 묻는다(338·341·350·363·372·429·654·655·683 규칙).
 *
 *   node tools/probe683c.js
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────
 * `verify683` [H1] 은 «봉투 전 구간 21:1(정착과 동일)» 로 초록인데, 9회차 비평가 둘이 각자
 * 픽셀을 세어 **다른 답**을 냈다:
 *   · CL — «Lv.n» 획 대 **국소 배경**(반경 3~4px 중앙값) 대비가 t0 에서 **4.29:1**(정착 20.67:1).
 *   · CM — 「Lv.n」 채움 화소 658 중 **347(52.7%)** 이 알(`.fx-rlic`)에 눌려 L<0.5 로 내려간다.
 *          그리고 씬 B(151px 칸)에서는 흰 판이 카드 테 열을 **전부** 덮어 등급 테 잔존 **0px**.
 * 표와 그림 중 하나가 거짓이면 **표부터 의심하라**(LESSONS 666-⑧ — 이 화면에서 이미 두 번 맞았다).
 *
 * ⚑ [H] 의 축은 «채움↔테»(글리프 **자기 안**)다. 795 가 라벨을 플래시 «위» 에 되그리므로 그 축은
 *   패치가 살아 있는 한 정착값 그대로다 — **거짓말이 아니라 «다른 것을 묻는 축»** 이다.
 *   비평가가 잰 것은 ⓐ 글리프 ↔ **주변**(플래시 판) ⓑ 글리프가 **알에 눌리는가** 둘이고,
 *   이 자는 그 둘을 제품에게 직접 묻는다. 어느 쪽이 참인지는 이 자가 답한다.
 *
 * ⚑⚑ **9회차 판정(이 자가 낸 답)** — **CM ⓐ(등급 테)만 실재한다**(잔존 3.1%). CL 의 «라벨 4.29:1» 과
 *   CM ⓑ(«채움 화소 52.7% 눌림»)는 **재현 안 됐다**(15.26:1 · 0.5%). 같은 프레임임은 [3-전제] 가
 *   못박는다(코너 t0 0.85 ↔ 정착 0.06 = 실캡처 A1 0.943 / A8 0.010). 그리고 그 하나의 손잡이
 *   (`inset`)는 [2-c] 가 기각했다 — 등급 테는 살지만 라벨을 잃는다. 뿌리(흰 테 9px ↔ 링 2px)는
 *   공용 `.fx-flash` 라 이 행이 못 고친다 ⇒ **862 등재**. 아래 항들은 그 판정을 지키는 방향이다.
 *
 * 절:
 *   [1] 액자 링 — `.rw-c` 가 자기 테를 무엇으로 그리는가 · `fxRingIn()` 이 얼마를 돌려주는가
 *       (= `inset` 을 켜면 상자가 실제로 들어가는가. 0 이면 `inset` 은 아무 일도 안 한다)
 *   [2] 등급 테 — 흰 판이 카드 테 열을 덮는가(CM ⓐ) · `inset` A/B
 *   [3] 라벨 ↔ 주변 — 획 대 국소 배경 대비(CL 축) · 알 끔/켬 A/B
 *   [4] 라벨 ↔ 알 — 채움 화소 중 알에 눌린 비율(CM ⓑ) · 패치를 알 «위» 로 올린 사본 A/B
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

/* 프레임 한 장 — T ms 로 감은 연출. NOGAIN 이면 알을 숨기고, RAISE 면 라벨 패치를 알 «위» 로 올린다.
   INSET 이면 `fxFlash` 셋째 인자를 켠 사본으로 부른다.
   ⚑ 10회차 신설 — **NOKEEP 이면 795 의 라벨 패치(`.fx-keep`)를 걷는다**(`verify683` [H4] 와 같은 축).
     [3-a] 가 «정착의 절반» 이라는 **절대 문턱**을 쓰고 있었는데, 862 가 흰 판을 액자 띠(6px)만큼
     들이면서 라벨 주변의 흰 바탕이 줄어 그 절대값이 통째로 이동했다(15.26 → 5.16). 문턱을 낮추면
     «패치가 죽어도 초록» 이 되고, 그대로 두면 «영영 빨간 자» 가 된다 ⇒ 둘 다 피하는 길은
     **되돌림 대비**뿐이다(패치를 걷은 사본과 견준다 — 기하가 또 바뀌어도 같이 움직인다). */
const SHOT = async ({ T, NOGAIN, RAISE, INSET, RID, BLANK, NOKEEP }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  if (!window.__p3to) { window.__p3to = window.setTimeout; window.__p3ri = window.requestAnimationFrame; }
  window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
  const st = document.getElementById('__p3nogain'); if (st) st.remove();
  if (NOGAIN) { const t = document.createElement('style'); t.id = '__p3nogain';
    t.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(t); }
  if (window.__p3ff) { window.fxFlash = window.__p3ff; window.__p3ff = null; }
  if (INSET) { window.__p3ff = window.fxFlash;
    window.fxFlash = function (el, iv, inset, keep) { return window.__p3ff.call(this, el, iv, true, keep); }; }
  const it = RELICS.filter(r => r.id === RID)[0]; if (!it) return null;
  if (T >= 0) rwSummonFx(it, true, null);
  /* RAISE — 패치를 레이어 맨 끝으로 옮긴다(그리는 순서가 곧 위아래다 · `fxFlashKeep` 머리말) */
  if (RAISE && L) for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-keep'))) L.appendChild(nd);
  /* NOKEEP — 795 의 라벨 패치를 통째로 걷는다(= 795 이전 그림) */
  if (NOKEEP && L) for (const nd of Array.prototype.slice.call(L.querySelectorAll('.fx-keep'))) nd.remove();
  try { document.getAnimations().forEach(a => {
    const tg = a.effect && a.effect.target;
    if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
    else { a.pause(); try { a.finish(); } catch (_) {} }
  }); } catch (e) {}
  const el = document.querySelector('[data-rw="' + RID + '"]');
  const u = el.querySelector('u'), b = u.getBoundingClientRect(), c = el.getBoundingClientRect();
  if (BLANK) { window.__p3lab = u.textContent; u.textContent = ''; }
  return { lab: u.textContent,
    /* 라벨 상자를 **카드 폭으로 좁힌다** — `.rw-c>u` 는 좌우 −40 이라 상자째 재면 카드 밖이 섞인다(788 ⓑ) */
    box: { x: Math.round(Math.max(b.x, c.x)), y: Math.round(b.y),
           w: Math.round(Math.min(b.x + b.width, c.x + c.width) - Math.max(b.x, c.x)), h: Math.round(b.height) },
    card: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) } };
};
const RESTORE = () => { const el = document.querySelector('[data-rw="' + '@' + '"]'); void el; };

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
  const own = await ev(p, RID => { for (let i = 0; i < 4000 && !has(RID); i++) summonRelic(true);
    renderRelw(); return has(RID) ? oLv(RID) : null; }, ID);

  const shot = async o => {
    const st = await ev(p, SHOT, Object.assign({ RID: ID, T: 0 }, o));
    if (!st) return null;
    const png = (await p.screenshot()).toString('base64');
    if (o.BLANK) await ev(p, RID => { const el = document.querySelector('[data-rw="' + RID + '"]');
      const u = el && el.querySelector('u');
      if (u && window.__p3lab != null) { u.textContent = window.__p3lab; window.__p3lab = null; } }, ID);
    return { st, png };
  };

  /* ── [1] 액자 링 ── */
  blk('1] 액자 링 — `.rw-c` 가 자기 테를 무엇으로 그리는가 (`inset` 이 실제로 무엇을 하는가)');
  const ring = await ev(p, RID => {
    const el = document.querySelector('[data-rw="' + RID + '"]');
    const cs = getComputedStyle(el);
    return { ring: (typeof fxRingIn === 'function') ? fxRingIn(el) : -1,
             bw: cs.borderTopWidth, bs: cs.boxShadow.slice(0, 190), pad: cs.padding, rad: cs.borderRadius };
  }, ID);
  info('`.rw-c` border', ring && ring.bw);
  info('`.rw-c` box-shadow', ring && ring.bs);
  info('`fxRingIn()`', ring && (ring.ring + 'px'));
  ok(!!ring && ring.ring > 0,
     '1-a `inset` 을 켜면 상자가 실제로 들어간다(링 > 0) — 0 이면 `inset` 은 **아무 일도 안 한다**',
     ring ? ('링 ' + ring.ring + 'px') : '측정 실패');

  /* 화소 도구 — 페이지 안에서 두 PNG 를 겹쳐 센다 */
  const PIX = async ({ a, b, box, mode, thr }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(box.x, box.y, box.w, box.h).data; };
    const A = await px(a), B = b ? await px(b) : null;
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    if (mode === 'ring') {
      /* 테 열 — 카드 좌·우 끝 6px 기둥의 «탄색이 남아 있는가»(정착과 같은 색인 화소 비율) */
      let same = 0, tot = 0;
      for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) {
        if (x >= 6 && x < box.w - 6) continue;
        const i = (y * box.w + x) * 4; tot++;
        if (Math.abs(lum(A, i) - lum(B, i)) <= (thr || 24)) same++;
      }
      return { same, tot, pct: tot ? Math.round(same / tot * 1000) / 10 : 0 };
    }
    /* 잉크 마스크 — «글자 있는 정착» ↔ «글자 지운 정착» 차분 */
    return { A: Array.from(A), B: B ? Array.from(B) : null };
  };

  /* ── 잉크 마스크(정착 프레임) ── */
  const settled = await shot({ T: -1, NOGAIN: true });
  const blank = await shot({ T: -1, NOGAIN: true, BLANK: true });
  const BOX = settled && settled.st.box, CARD = settled && settled.st.card;
  info('라벨 상자(카드 폭으로 좁힘)', BOX && JSON.stringify(BOX));
  info('카드 상자', CARD && JSON.stringify(CARD));

  /* 글리프 화소 + 국소 배경 대비 — CL 축 */
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
    /* 채움 = 정착에서 밝은 위 25% */
    const iv = ink.map(la).sort((x, y) => x - y);
    const hiT = iv[Math.floor(iv.length * 0.75)];
    const fill = ink.filter(i => la(i) >= hiT);
    /* 국소 배경 = 글리프에서 3~4px 떨어진 «잉크가 아닌» 화소 (CL 이 잰 축) */
    const isInk = new Uint8Array(bx.w * bx.h);
    for (const i of ink) isInk[i / 4] = 1;
    const bgOf = (d) => {
      const lm = lum(d), rr = rl(d), out = [];
      for (const i of fill) { const q = i / 4, x = q % bx.w, y = (q / bx.w) | 0; const cand = [];
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const m = Math.abs(dx) + Math.abs(dy); if (m < 3 || m > 4) continue;
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bx.w || ny >= bx.h) continue;
          const j = (ny * bx.w + nx); if (isInk[j]) continue; cand.push(rr(j * 4));
        }
        if (!cand.length) continue;
        cand.sort((u, v) => u - v);
        const bg = cand[cand.length >> 1], fg = rr(i);
        const hi = Math.max(bg, fg), lo = Math.min(bg, fg);
        out.push((hi + 0.05) / (lo + 0.05));
      }
      out.sort((u, v) => u - v);
      return out.length ? { n: out.length, med: out[out.length >> 1], q1: out[out.length >> 2],
                            under45: out.filter(v => v < 4.5).length / out.length } : null;
    };
    return { ink: ink.length, nf: fill.length, base: bgOf(A) };
  }, { a: aPng, z: zPng, bx: box });

  blk('3] 라벨 ↔ **주변**(CL 축 — 획 대 국소 배경 3~4px 중앙값)');
  const baseCL = settled && blank ? await CL(settled.png, blank.png, BOX) : null;
  info('정착(연출 0 · 알 숨김)', baseCL && baseCL.base
       ? ('글리프 화소 ' + baseCL.ink + ' · 채움 ' + baseCL.nf + ' · 중앙값 ' + r2(baseCL.base.med)
          + ':1 · 하사분위 ' + r2(baseCL.base.q1) + ':1 · 4.5:1 미만 ' + Math.round(baseCL.base.under45 * 100) + '%')
       : '측정 실패');
  const cases = [
    ['t0 현행(알 숨김 — [H1] 과 같은 조건)', { T: 0, NOGAIN: true }],
    ['t0 현행(알 켬 — 비평가가 본 화면)',    { T: 0 }],
    ['t20 현행(알 켬)',                      { T: 20 }],
    ['t40 현행(알 켬)',                      { T: 40 }],
    /* ⚑ 10회차 — 꼬리의 63% 가 **알**인지 **플래시**인지 가르는 짝(알만 숨긴다 · 나머지 동일) */
    ['t20 현행(알 숨김)',                    { T: 20, NOGAIN: true }],
    ['t40 현행(알 숨김)',                    { T: 40, NOGAIN: true }],
    ['t0 A/B — `inset` 켬(알 켬)',           { T: 0, INSET: true }],
    ['t0 A/B — 패치를 알 위로(알 켬)',       { T: 0, RAISE: true }],
    ['t0 A/B — `inset` + 패치 올림(알 켬)',  { T: 0, INSET: true, RAISE: true }],
    /* ⚑ 10회차 — [3-a] 의 되돌림 짝. 795 의 패치를 걷으면 옛 씻김이 돌아온다. */
    ['t0 되돌림 — 795 패치 걷음(알 켬)',     { T: 0, NOKEEP: true }],
    /* ⚑ 10회차 — 꼬리에서도 패치가 일을 하는가(패치 수명 ↔ 플래시 수명이 어긋나는지) */
    ['t20 되돌림 — 795 패치 걷음(알 켬)',    { T: 20, NOKEEP: true }],
    ['t40 되돌림 — 795 패치 걷음(알 켬)',    { T: 40, NOKEEP: true }],
  ];
  const CLv = {};
  const CLu = {};   /* ⚑ 10회차 — «4.5:1 미만» 도 같이 담는다([3-a] 가 이 축으로 옮겼다) */
  for (const [name, o] of cases) {
    const s = await shot(o); if (!s) { info(name, '캡처 실패'); continue; }
    const r = await CL(s.png, blank.png, BOX);
    CLv[name] = r && r.base ? r.base.med : null;
    CLu[name] = r && r.base ? r.base.under45 : null;
    info(name, r && r.base
      ? ('중앙값 ' + r2(r.base.med) + ':1 · 하사분위 ' + r2(r.base.q1) + ':1 · 4.5:1 미만 '
         + Math.round(r.base.under45 * 100) + '%')
      : '측정 실패');
  }
  /* ⚑ 자기검산 — 이 자가 «그림» 과 같은 프레임을 재고 있는가. 흰 판이 실제로 떠 있는지
     카드 좌하 코너(CL 이 지목한 자리와 같은 상대 좌표)의 휘도를 정착과 나란히 찍는다.
     여기서 정착과 안 갈리면 **이 자가 연출이 없는 프레임을 재고 있는 것**이다(1회차 사고의 재발). */
  const CORNER = async (aPng, zPng, card) => ev(p, async ({ a, z, c }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(c.x + 7, c.y + c.h - 13, 10, 10).data; };
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const mean = d => { let s = 0; for (let i = 0; i < d.length; i += 4)
      s += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]); return s / (d.length / 4); };
    return { a: mean(await px(a)), z: mean(await px(z)) };
  }, { a: aPng, z: zPng, c: card });
  {
    const s = await shot({ T: 0 });
    const cr = s && settled ? await CORNER(s.png, settled.png, CARD) : null;
    info('자기검산 — 카드 좌하 코너 휘도(흰 판이 떠 있는가)',
         cr ? ('t0 L=' + r2(cr.a) + ' ↔ 정착 L=' + r2(cr.z)) : '측정 실패');
    ok(!!cr && cr.a > 0.5 && cr.z < 0.2,
       '3-전제 이 자가 «연출이 떠 있는» 프레임을 재고 있다 — 아니면 아래 [3][4] 는 무의미하다',
       cr ? ('t0 ' + r2(cr.a) + ' ↔ 정착 ' + r2(cr.z)) : '측정 실패');
  }
  const b0 = baseCL && baseCL.base ? baseCL.base.med : 0;
  const now = CLv['t0 현행(알 켬 — 비평가가 본 화면)'];
  /* ⚑⚑ **9회차 판정 — 이 항은 «비평가 주장이 참이다» 가 아니라 «재현이 낸 사실» 을 묻는다.**
     첫 판은 CL 의 «t0 4.29:1(정착 20.67)» 을 그대로 단언했는데 실측이 **15.26:1(정착 17.71) ·
     4.5:1 미만 0%** 였다. 어긋난 것은 «프레임» 이 아니다 — 바로 위 [3-전제] 가 같은 흰 판을
     같은 밝기로 찍는다(코너 t0 0.85 ↔ 정착 0.06 ↔ 실캡처 A1 0.943/A8 0.010). **축이 다르다**
     (획 주변을 어디까지 «배경» 으로 세는가). 주장을 그대로 자로 굳혔으면 **영원히 빨간 자**가
     된다(680) — 그래서 방향을 «795 가 듣고 있는가» 로 돌렸다(333 처방).
     ⚠ 문턱은 안 무르게 잡았다: 795 의 라벨 패치가 죽으면 옛 씻김(2.2~2.5:1)이 돌아와
       정착의 절반(8.9) 아래로 즉시 내려간다 — `verify683` [H4] 가 같은 것을 «패치 걷기» 로 잰다. */
  /* ⚑⚑ **10회차 이관(862) — 옛 항이 «제품이 좋아진 것» 을 빨강으로 읽게 됐다.**
     옛 항: «t0 중앙값 ≥ 정착의 절반(8.85)» — 9회차엔 15.26 이라 넉넉히 초록이었다.
     862 가 흰 판을 호스트 액자 띠(6px)만큼 **들이자** 라벨 띠 위의 «흰 바탕» 이 줄어
     **중앙값이 15.26 → 5.16 으로 내려갔다**(정착 17.71 불변). ⚠ 이 하강은 «가독성이 나빠졌다»
     가 아니다 — 흰 바탕이 곧 «획을 돋보이게 하던 배경» 이었기 때문에 **대비가 크던 이유가
     사라진 것**이고, 같은 프레임의 «4.5:1 미만» 은 **0% → 2%** 로 정착(14%)보다도 낮다.
     ⚑⚑ **되돌림 대비(패치 걷기)로 옮기려던 첫 시도는 스스로 기각했다** — 이 축(획↔**국소 배경**)은
       795 의 패치에 **반응하지 않는다**(패치 걷음도 5.16:1 · 배수 1.00). 패치가 지키는 것은
       «채움↔테»(글리프 안)이고 그 축은 `verify683` [H4] 가 이미 배수 6.5 로 소유한다.
       반응 안 하는 축에 되돌림을 걸면 **영원히 빨간 자**가 된다(680) ⇒ 안 걸었다.
     ⇒ 이 항이 실제로 묻는 것을 적는다: **봉우리(t0)에서 «읽기 어려운 획» 비율이 정착보다
       안 나쁘다.** 헛초록이 아님은 같은 표의 **t20·t40 이 62%** 인 것이 보증한다(정착 14%) —
       이 자가 그 축에서 실제로 빨개질 수 있다는 뜻이다. 그 t20·t40 은 아래 ⏸ 로 매 실행 찍는다. */
  const u0 = CLu['t0 현행(알 켬 — 비평가가 본 화면)'], ub = baseCL && baseCL.base ? baseCL.base.under45 : null;
  ok(u0 != null && ub != null && u0 <= ub,
     '3-a **봉우리에서 라벨이 정착보다 안 나쁘다** — t0 의 «4.5:1 미만» 획 비율이 정착 이하다(862 이관 — 옛 문턱 «중앙값 ≥ 정착의 절반»)',
     u0 != null && ub != null
       ? (Math.round(u0 * 100) + '% ↔ 정착 ' + Math.round(ub * 100) + '% · 중앙값 ' + r2(now) + ':1 ↔ 정착 ' + r2(b0) + ':1')
       : '측정 실패');
  /* ⏸ **실패로 안 센다 — 이 회차가 넘기는 관측이다.** 862 가 흰 판을 들인 뒤 봉우리(t0)는 좋아졌는데
     **꼬리(t20~t40)** 에서 «4.5:1 미만» 이 62% 로 오른다(정착 14% · t0 2%). 축이 «획↔국소 배경» 이라
     `verify683` [H1](채움↔테)이 안 보는 자리다. 10회차 비평 결과와 함께 판단할 것. */
  {
    const t20 = CLu['t20 현행(알 켬)'], t40 = CLu['t40 현행(알 켬)'];
    if (t20 != null && t40 != null) console.log('  ⏸  [관측 · 실패 아님] 꼬리에서 «4.5:1 미만» 이 오른다 — t20 '
      + Math.round(t20 * 100) + '% · t40 ' + Math.round(t40 * 100) + '% (t0 ' + Math.round(u0 * 100)
      + '% · 정착 ' + Math.round(ub * 100) + '%)');
  }

  /* ── [2] 등급 테 ── */
  blk('2] 등급 테 — 흰 판이 카드 테 열을 덮는가 (CM ⓐ) · `inset` A/B');
  const ringBox = CARD;
  const zero = await shot({ T: -1, NOGAIN: true });
  for (const [name, o] of [['현행(t0)', { T: 0, NOGAIN: true }], ['`inset` 켬(t0)', { T: 0, NOGAIN: true, INSET: true }]]) {
    const s = await shot(o); if (!s || !zero) { info(name, '캡처 실패'); continue; }
    const r = await ev(p, PIX, { a: s.png, b: zero.png, box: ringBox, mode: 'ring', thr: 24 });
    info('테 열 잔존율 — ' + name, r ? (r.pct + '% (' + r.same + '/' + r.tot + ')') : '측정 실패');
    if (name === '현행(t0)') CLv.__ring0 = r && r.pct;
    else CLv.__ring1 = r && r.pct;
  }
  /* ⚑⚑ **10회차 이관(862 완료) — 방향을 뒤집었다(333 처방).** 아래 세 항은 9회차에
     «CM ⓐ 가 실재한다 · `inset` 이 그것을 되살리기는 한다 · 그런데 라벨을 잃는다» 를 쟀다.
     862 가 흰 테를 **호스트 액자 띠에서 파생**시키자(`min(CSS, 띠)` · 들이기는 «액자가 있는가»)
     세 값이 전부 뒤집혔다 — 잔존 **3.1% → 100%** · `inset` A/B **차이 0** · 라벨 대가 **0**.
     ⚠ **지우지 않았다** — 지우면 «대가가 있었다» 는 사실이 사라져 누가 흰 테를 다시 상수로
       되돌려도 아무 자도 안 짖는다(9회차 주석이 그렇게 적어 둔 그대로). 항의 이름만 뒤집는다. */
  ok(CLv.__ring0 != null && CLv.__ring0 >= 90,
     '2-a **CM ⓐ 는 862 로 닫혔다** — 흰 판이 카드 액자선 열을 더는 안 덮는다(정착색 잔존 90% 위 · 9회차 3.1%)',
     '잔존 ' + CLv.__ring0 + '%');
  ok(CLv.__ring1 != null && CLv.__ring0 != null && Math.abs(CLv.__ring1 - CLv.__ring0) <= 5,
     '2-b `inset` 인자는 이제 **아무 일도 안 한다** — 862 가 들이기를 «액자가 있는가» 로 옮겨 기본이 됐다',
     '현행 ' + CLv.__ring0 + '% → inset ' + CLv.__ring1 + '%');
  /* ⚑⚑ **이 항이 683 9회차가 손잡이를 기각한 근거다** — `inset` 을 켜면 등급 테는 살지만
     상자가 라벨 쪽으로 링(2px)만큼 밀려 라벨 축이 무너진다. 뿌리는 두께 비 하나다:
     `.rw-c` 의 액자 링 **2px** ↔ `.fx-flash` 의 흰 테 **9px**(4.5배) — 619 18회차의 처방
     («링 두께만큼 들인다»)은 **«흰 테 ≤ 링» 일 때만** 성립한다(619 호스트는 링 8px).
     ⚠ **862 가 흰 테를 링에서 파생시키면 이 항은 뒤집힌다** — 그때 이 항을 지우지 말고
       333 처방대로 «대가가 사라졌는가» 로 방향만 뒤집어라(지우면 대가가 있었다는 사실이 사라진다). */
  /* ⚑ 9회차의 [2-c] 는 «등급 테를 사면 라벨을 잃는다» 였다(3.77:1 ↔ 15.26:1). 862 뒤로 그 대가가
     사라졌다 — 흰 테가 띠를 안 넘으므로 상자가 라벨 쪽으로 밀리지 않는다. «대가가 사라졌는가» 로
     방향만 뒤집는다(문턱은 «같은 값이다» = 상대 5% — 절대값을 안 쓰므로 기하 변경에 안 죽는다). */
  {
    const ins = CLv['t0 A/B — `inset` 켬(알 켬)'];
    ok(ins != null && now != null && now > 0 && Math.abs(ins - now) <= now * 0.05,
       '2-c 그 **대가가 사라졌다** — `inset` 을 켜도 라벨 대비가 그대로다 (9회차엔 정착의 절반 아래로 무너졌다 · 862)',
       ins != null ? (r2(ins) + ':1 ↔ 현행 ' + r2(now) + ':1 · 정착 ' + r2(b0) + ':1') : '측정 실패');
  }

  /* ── [4] 라벨 ↔ 알 ── */
  blk('4] 라벨 ↔ **알**(CM ⓑ — 채움 화소 중 알에 눌린 비율)');
  const PRESS = async (aPng, gPng, zPng, box) => ev(p, async ({ a, g, z, bx }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const q = cv.getContext('2d'); q.drawImage(im, 0, 0);
      return q.getImageData(bx.x, bx.y, bx.w, bx.h).data; };
    const A = await px(a), G = await px(g), Z = await px(z);
    const lum = d => (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A), lz = lum(Z), lg = lum(G);
    const ink = []; for (let i = 0; i < A.length; i += 4) if (Math.abs(la(i) - lz(i)) >= 24) ink.push(i);
    if (ink.length < 120) return null;
    const iv = ink.map(la).sort((x, y) => x - y); const hiT = iv[Math.floor(iv.length * 0.75)];
    const fill = ink.filter(i => la(i) >= hiT);
    /* 눌림 = 정착에서 밝던 채움 화소가 그 프레임에서 절반 아래로 내려갔는가 */
    const down = fill.filter(i => lg(i) < la(i) * 0.5);
    return { nf: fill.length, down: down.length, pct: Math.round(down.length / fill.length * 1000) / 10 };
  }, { a: aPng, g: gPng, z: zPng, bx: box });
  for (const [name, o] of [['현행(t0 · 알 켬)', { T: 0 }], ['패치를 알 위로(t0)', { T: 0, RAISE: true }]]) {
    const s = await shot(o); if (!s || !settled || !blank) { info(name, '캡처 실패'); continue; }
    const r = await PRESS(settled.png, s.png, blank.png, BOX);
    info('채움 화소 눌림 — ' + name, r ? (r.pct + '% (' + r.down + '/' + r.nf + ')') : '측정 실패');
    if (name.indexOf('현행') === 0) CLv.__press0 = r && r.pct; else CLv.__press1 = r && r.pct;
  }
  /* ⚑ 같은 이유로 방향을 돌렸다 — CM ⓑ(«채움 화소 52.7% 가 알에 눌린다»)는 실측 **0.5%**(2/370)로
     재현 안 됐다. 알은 아이콘 중심에서 나고 라벨은 그 발자국 «안» 이지만, 7회차가 출생 α 를
     1.00 → .55 로 낮춘 뒤로 채움(흰 획)은 알을 뚫고 읽힌다. 이 항은 그 상태를 지킨다. */
  ok(CLv.__press0 != null && CLv.__press0 < 10,
     '4-a 라벨 채움 화소가 알에 안 눌린다(10% 미만) — 7회차 α .55 가 지키는 자리(CM 의 «52.7%» 는 재현 안 됨)',
     CLv.__press0 + '%');
  ok(CLv.__press1 != null && CLv.__press0 != null && CLv.__press1 <= CLv.__press0,
     '4-b 패치를 알 «위» 로 올려도 더 나빠지지 않는다 — 이 손잡이는 남는 여지가 0.5%p 뿐이다(답이 아니다)',
     CLv.__press0 + '% → ' + CLv.__press1 + '%');

  info('보유 레벨', own != null ? ('Lv.' + own) : '보유 실패');
  ok(errs.length === 0, 'Z1 콘솔 에러 0', errs.length ? errs.slice(0, 2).join(' / ') : '없음');
  await browser.close();
  console.log('\nPROBE683C ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
