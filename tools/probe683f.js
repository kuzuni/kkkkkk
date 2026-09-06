/* 작업 683 — **16회차 재현자**: §15-5 의 1·2번을 **처방보다 먼저** 잰다(338 규칙).
 *
 *   node tools/probe683f.js
 *
 * ── 무엇을 묻는가 ─────────────────────────────────────────────────────────
 * 15회차 채점은 2인이 **각자** 같은 것을 지목했다 — «판(플래시)» 이 ①②③④ 를 한꺼번에 쥔다.
 * 그 지목은 두 문장이고, 이 자는 그 둘을 갈라 각각 참·거짓을 묻는다:
 *
 *   [2] «액자가 위로 쏠려 있다 — 아래 여백 34~37px ↔ 위 4~17px · 중심 10~15px 위 · **과보정 20px**»
 *       (CT·CU·CV·CW 4인 · 3회차 연속). 뿌리 가설은 §15-5 2번이 적었다: 13회차의 클램프가
 *       멈추는 자리를 **노드 상자 윗변**(`fxRect(.rw-c>u)`)으로 잡는데, 그 노드는 35px 글자를
 *       담는 줄상자라 **글리프 잉크 윗변이 그보다 한참 아래**다. 그 차이가 곧 과보정이다.
 *       ⇒ 이 자는 잉크 윗변을 **찍힌 픽셀**로 재서(라벨 글자를 지운 사본과의 차) 노드 상자와 견준다.
 *   [3] «판이 카드를 씻는다 — 순수 플래시 열창 L8 24.9 → 118.8(**+94**)»(CW). 15-5 1번 ⓑ 가
 *       그 증분을 **+40 이하**로 깎으라고 적었다. 이 자는 알을 숨긴 사본(NOGAIN)에서 판만 남겨
 *       **최대 증분**을 재고, 814 가 만든 호스트 신고 손잡이(`--flash-k`)를 스윕해 **어느 값이
 *       그 과녁에 닿는지**를 찍는다. ⚠ 새 손잡이를 만들지 않는다 — 이미 있는 것을 스윕할 뿐이다.
 *
 * ⚠ 자는 제품을 한 줄도 안 건드린다 — 사본은 전부 주입 CSS(`__p6v`) 한 장이다.
 * ⚠ 난수는 `probe683d`(992) 와 같은 씨앗 규약으로 얼린다 — 알 자리가 실행마다 달라지면
 *   [3] 의 «판만» 측정이 흔들린다(이 자는 알을 숨기지만 위상 소비는 같게 둔다).
 *
 * 종료 코드: 0 통과 · 1 FAIL (환경 없음은 `pwlaunch` 가 코드 2 로 낸다)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const ID = 'rl0';
const STOPS = [0, 40, 80];
const KS = [0.70, 0.55, 0.45, 0.35];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const ev = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; } };
const r2 = v => (v == null ? '—' : Math.round(v * 100) / 100);

/* 992 규약 — 부팅부터 결정적 난수(설정 루프도 난수를 먹는다) */
const SEEDER = () => {
  let s = 20260906 >>> 0;
  window.__p6seed = v => { s = (v >>> 0) || 1; };
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};

/* 프레임 한 장 — `probe683d`·`probe683e` 의 SHOT 과 같은 규약(같은 것을 재려면 같은 자리를 얼린다) */
const SHOT = async ({ T, RID, NOGAIN, NOFLASH, KVAL, CSS, BLANK }) => {
  const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
  if (!window.__p6to) { window.__p6to = window.setTimeout; window.__p6ri = window.requestAnimationFrame; }
  window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
  const old = document.getElementById('__p6v'); if (old) old.remove();
  let css = '';
  if (NOGAIN) css += '.fx-spark.fx-rlic{display:none !important}';
  if (NOFLASH) css += '.fx-flash{display:none !important}';
  if (KVAL) css += '.rw-c{--flash-k:' + KVAL + '}';
  if (CSS) css += CSS;
  if (css) { const t = document.createElement('style'); t.id = '__p6v'; t.textContent = css; document.head.appendChild(t); }
  const el0 = document.querySelector('[data-rw="' + RID + '"]');
  const u0 = el0 && el0.querySelector('u');
  if (BLANK === 'lab' && u0) { window.__p6lab = u0.textContent; u0.textContent = ''; }
  const i0 = el0 && el0.querySelector('i');
  if (BLANK === 'ico' && i0) { window.__p6ico = i0.textContent; i0.textContent = ''; }
  if (window.__p6seed) window.__p6seed(20260906);
  /* ⚑ 992 의 나머지 반쪽 — 씨앗만 얼리면 **위상**이 남는다. `rwGainW`·`rwFxW` 는 버스트마다
     황금비로 굴러가는 «저불일치 위상» 이라 같은 상태를 두 번 떠도 알이 다른 방향으로 난다
     (1판 실측: 같은 k 를 두 번 재면 T=40 대비가 1.98 ↔ 3.31 로 갈렸다). 스폰 전에 되감는다. */
  try { rwGainW = 0; rwFxW = 0; } catch (_) {}
  const it = RELICS.filter(r => r.id === RID)[0]; if (!it) return null;
  if (T >= 0) rwSummonFx(it, true, null);
  try {
    document.getAnimations().forEach(a => {
      const tg = a.effect && a.effect.target;
      if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
      else { a.pause(); try { a.finish(); } catch (_) {} }
    });
  } catch (e) {}
  const el = document.querySelector('[data-rw="' + RID + '"]');
  const c = el.getBoundingClientRect();
  const u = el.querySelector('u'), ur = u ? u.getBoundingClientRect() : null;
  const fl = L ? L.querySelector('.fx-flash') : null;
  const fr = fl ? fl.getBoundingClientRect() : null;
  return {
    card: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) },
    lab: ur ? { x: +ur.x.toFixed(2), y: +ur.y.toFixed(2), w: +ur.width.toFixed(2), h: +ur.height.toFixed(2) } : null,
    flash: fr ? { x: +fr.x.toFixed(2), y: +fr.y.toFixed(2), w: +fr.width.toFixed(2), h: +fr.height.toFixed(2) } : null
  };
};

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.addInitScript(SEEDER);
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
      const u = el && el.querySelector('u'), i = el && el.querySelector('i');
      if (u && window.__p6lab != null) { u.textContent = window.__p6lab; window.__p6lab = null; }
      if (i && window.__p6ico != null) { i.textContent = window.__p6ico; window.__p6ico = null; } }, ID);
    return { st, png };
  };

  /* 두 장의 화소를 같은 상자에서 읽어 «행별 최대 |ΔL8|» 과 «영역 평균/최대 ΔL8» 을 낸다 */
  const rows = async (aPng, zPng, box) => ev(p, async ({ a, z, bx }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(bx.x, bx.y, bx.w, bx.h).data; };
    const A = await px(a), Z = await px(z);
    const lum = d => i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const la = lum(A), lz = lum(Z);
    const out = [];
    let mx = 0, sum = 0, n = 0;
    for (let y = 0; y < bx.h; y++) {
      let rmax = 0, cnt = 0;
      for (let x = 0; x < bx.w; x++) {
        const i = (y * bx.w + x) * 4, d = la(i) - lz(i), ad = Math.abs(d);
        if (ad > rmax) rmax = ad;
        if (ad >= 24) cnt++;
        if (d > mx) mx = d;
        sum += d; n++;
      }
      out.push({ y: bx.y + y, max: +rmax.toFixed(1), n: cnt });
    }
    return { rows: out, maxUp: +mx.toFixed(1), mean: +(sum / Math.max(1, n)).toFixed(1) };
  }, { a: aPng, z: zPng, bx: box });

  /* ── 정착·라벨 마스크 ── */
  const settled = await shot({ T: -1, NOGAIN: true });
  const blank = await shot({ T: -1, NOGAIN: true, BLANK: 'lab' });
  if (!settled || !blank) { console.log('\n캡처 실패 — 중단'); await browser.close(); process.exit(1); }
  const CARD = settled.st.card, LAB = settled.st.lab;

  blk('1] 기하 — 카드 · 라벨 노드 상자 · 현행 플래시 판');
  info('카드 상자', JSON.stringify(CARD) + ' → 하변 y=' + (CARD.y + CARD.h) + ' · 중심 y=' + (CARD.y + CARD.h / 2));
  info('라벨 `.rw-c>u` 노드 상자', JSON.stringify(LAB) + ' → 윗변 y=' + LAB.y);
  const live = await shot({ T: 0 });
  const FL = live && live.st.flash;
  info('현행 플래시 판(T=0)', FL ? JSON.stringify(FL) + ' → 하변 y=' + r2(FL.y + FL.h) + ' · 중심 y=' + r2(FL.y + FL.h / 2) : '없음');

  /* ── [2] 클램프 과보정 — 노드 상자 윗변 ↔ **찍힌 잉크** 윗변 ── */
  blk('2] 클램프 과보정 — 멈추는 자리는 «노드 상자» 인데 글자는 그보다 아래에서 시작한다');
  /* 라벨 글자만 지운 사본과의 차 = 라벨 잉크(획 + 검은 테). 카드 폭 구간만 본다. */
  const labBox = { x: CARD.x, y: Math.round(LAB.y) - 6, w: CARD.w, h: Math.round(LAB.h) + 14 };
  const dl = await rows(settled.png, blank.png, labBox);
  let inkTop = null, inkBot = null;
  if (dl && dl.rows) for (const r of dl.rows) { if (r.n >= 2) { if (inkTop == null) inkTop = r.y; inkBot = r.y; } }
  info('라벨 잉크(획+테) 행 범위', inkTop == null ? '못 찾음' : inkTop + ' … ' + inkBot);
  const over = inkTop == null ? null : inkTop - LAB.y;
  info('노드 상자 윗변 ↔ 잉크 윗변', over == null ? '—' : r2(over) + 'px');
  /* ⚑⚑ 이 자가 §15-5 2번의 **가설을 기각한다** — 과보정의 임자는 «노드 상자 ↔ 잉크» 가 아니다.
     그 차는 3~4px 뿐이고, 아래 여백 21px 의 임자는 **라벨 자체가 카드 하변 20px 위에서 시작하는 것**이다.
     ⇒ 대칭은 «아래를 더 내리는 것» 으로는 못 얻는다(내리면 글자를 밟는다 — 13회차 규약). */
  ok(inkTop != null && over < 8, '★ **가설 기각** — 잉크 윗변은 노드 상자 윗변 바로 아래다(3~4px). 아래 여백 21px 의 임자가 아니다', r2(over) + 'px');
  ok(inkTop != null && (CARD.y + CARD.h) - inkTop > 15, '★ 진짜 임자 — **라벨 잉크가 카드 하변보다 한참 위에서 시작한다**(플래시가 하변까지 못 간다)', r2((CARD.y + CARD.h) - inkTop) + 'px');

  /* 제품 산수 그대로 예측: lim = 2·(kt − top)/(1 + PEAK) — kt 만 «노드» → «잉크» 로 갈아 끼운다 */
  const PEAK = await ev(p, () => (typeof FXFLASH_PEAK === 'number' ? FXFLASH_PEAK : null));
  info('`FXFLASH_PEAK`', PEAK);
  const top = FL ? FL.y : null;
  const hNow = FL ? FL.h : null;
  const ring = FL ? FL.x - CARD.x : null;            /* 862 들이기(액자 띠) — 좌우에서 읽는다 */
  const hAv = (ring != null) ? CARD.h - 2 * ring : null;   /* 들인 뒤 쓸 수 있는 세로 */
  const gapTop = FL ? FL.y - CARD.y : null;
  const gapBot = FL ? (CARD.y + CARD.h) - (FL.y + FL.h) : null;
  const gapL = FL ? FL.x - CARD.x : null, gapR = FL ? (CARD.x + CARD.w) - (FL.x + FL.w) : null;
  info('현행 판 높이 h', r2(hNow) + 'px  (들이기 ' + r2(ring) + ' · 쓸 수 있는 세로 ' + r2(hAv) + ')');
  info('여백 — 위/아래/좌/우', r2(gapTop) + ' / ' + r2(gapBot) + ' / ' + r2(gapL) + ' / ' + r2(gapR));
  ok(Math.abs(gapL - gapR) < 1, '· 좌우는 처음부터 대칭이었다(어긋난 축은 세로 하나)', r2(gapL) + ' ↔ ' + r2(gapR));

  /* ── 되돌림 시험 — **15회차 판(«윗변 고정»)을 주입해** 네 비평가가 본 비대칭을 재현한다 ──
     사본은 손 상수로 안 적는다: 제품이 지금 그리는 값(들이기·라벨 윗변·`FXFLASH_PEAK`)에서 파생한다
     (402 «표 두 벌» 금지 · `probe683e`(997) 가 13회차 사본을 제품 사슬에서 뽑은 것과 같은 처방). */
  const yPre = CARD.y + ring, hPre = 2 * (LAB.y - yPre) / (1 + PEAK);
  const pre = await shot({ T: 0, CSS: '#fxl .fx-flash{top:' + yPre.toFixed(2) + 'px !important;height:' + hPre.toFixed(2) + 'px !important}' });
  const PF = pre && pre.st.flash;
  const gapTopP = PF ? PF.y - CARD.y : null, gapBotP = PF ? (CARD.y + CARD.h) - (PF.y + PF.h) : null;
  const cOffP = PF ? (CARD.y + CARD.h / 2) - (PF.y + PF.h / 2) : null;
  info('15회차 사본(윗변 고정)', PF ? 'y ' + r2(PF.y) + ' · h ' + r2(PF.h) + ' → 위/아래 여백 ' + r2(gapTopP) + ' / ' + r2(gapBotP) : '실패');
  ok(gapBotP - gapTopP > 15, '★ **재현** — 15회차 판은 아래 여백이 위보다 15px 넘게 크다(CV·CW 실측 34~37 ↔ 4~17 · §13-5-2 21px)', r2(gapBotP - gapTopP) + 'px');
  ok(cOffP > 8, '★ **재현** — 그 판의 중심은 카드 중심보다 8px 넘게 위다(CW 10.0~15.0px)', r2(cOffP) + 'px');

  /* ── 수리 후(제품 HEAD) ── */
  const cOffNow = FL ? (CARD.y + CARD.h / 2) - (FL.y + FL.h / 2) : null;
  info('중심 어긋남(카드 중심 − 판 중심)', r2(cOffNow) + 'px');
  ok(Math.abs(gapBot - gapTop) <= 1, '★ **수리** — 위·아래 여백이 1px 안에서 같다(4인·3회차 지적이 닫힌다)', r2(gapTop) + ' ↔ ' + r2(gapBot));
  ok(Math.abs(cOffNow) <= 1, '★ **수리** — 판 중심이 카드 중심과 1px 안에서 같다(③ «터진 자리가 둘»)', r2(cOffNow) + 'px');
  ok(hNow < hPre, '★ 같은 손이 ② 도 준다 — 액자가 15회차보다 작아진다(15-3 «액자를 같이 줄여라»)', r2(hPre) + ' → ' + r2(hNow) + 'px');
  const icoFs = await ev(p, RID => { const el = document.querySelector('[data-rw="' + RID + '"]'), i = el && el.querySelector('i');
    return i ? parseFloat(getComputedStyle(i).fontSize) : null; }, ID);
  ok(icoFs && hNow < icoFs, '★ 액자가 아이콘 글리프 상자(`font-size`)보다 **한 단계 작다**(§15-5 3번)', r2(hNow) + ' < ' + r2(icoFs));
  const peakBot = FL ? (FL.y + FL.h / 2) + FL.h * PEAK / 2 : null;
  info('봉우리 아래변', r2(peakBot) + ' ↔ 라벨 노드 윗변 ' + r2(LAB.y) + ' · 잉크 윗변 ' + inkTop);
  ok(peakBot != null && peakBot <= inkTop + 0.5, '★ 짝 항 — 봉우리에서도 아래변이 **글자 잉크를 안 밟는다**(13회차 규약 유지)', r2(inkTop - peakBot) + 'px 여유');

  /* ── [3] ④ 축 — «획득 유물의 속:바깥 대비» 를 CW 와 같은 산수로 재고 손잡이를 스윕한다 ──
     ⚠ 「최대 증분」 을 상자 전체에서 재면 **흰 테(순백)** 가 그 최댓값을 혼자 정한다(1판 실측 +226).
       CW 가 잰 것은 그 최댓값이 아니라 **아이콘 잉크의 대비**이므로 그 축으로 옮긴다. */
  blk('3] ④ 축 — 아이콘 잉크 : 국소 배경 대비(CW 정착 11.42:1 → A2 2.18:1) · `--flash-k` 스윕');
  const icoBox = { x: CARD.x, y: CARD.y, w: CARD.w, h: Math.round(inkTop != null ? inkTop - CARD.y : CARD.h) };
  const blankI = await shot({ T: -1, NOGAIN: true, BLANK: 'ico' });
  info('측정 상자(카드 안 · 라벨 잉크 위까지)', JSON.stringify(icoBox));
  /* 아이콘 잉크 마스크는 **정착 프레임에서 한 번만** 뜬다(10회차 생존자 편향 규약) */
  const CR = async (aPng, zPng, box, mask) => ev(p, async ({ a, z, bx, mk }) => {
    const load = u => new Promise((okp, no) => { const i = new Image(); i.onload = () => okp(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(bx.x, bx.y, bx.w, bx.h).data; };
    const A = await px(a), Z = await px(z);
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rl = d => i => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const lum = d => i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    let ink, fill;
    if (mk && mk.ink && mk.ink.length) { ink = mk.ink; fill = mk.fill; }
    else {
      const la = lum(A), lz = lum(Z); ink = [];
      for (let i = 0; i < A.length; i += 4) if (Math.abs(la(i) - lz(i)) >= 24) ink.push(i);
      if (ink.length < 120) return { ink: ink.length };
      const iv = ink.map(la).sort((x, y) => x - y);
      const hiT = iv[Math.floor(iv.length * 0.75)];
      fill = ink.filter(i => la(i) >= hiT);
    }
    const isInk = new Uint8Array(bx.w * bx.h);
    for (const i of ink) isInk[i / 4] = 1;
    const rr = rl(A), out = [];
    for (const i of fill) {
      const q = i / 4, x = q % bx.w, y = (q / bx.w) | 0, cand = [];
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const m = Math.abs(dx) + Math.abs(dy); if (m < 3 || m > 4) continue;
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bx.w || ny >= bx.h) continue;
        const j = ny * bx.w + nx; if (isInk[j]) continue; cand.push(rr(j * 4));
      }
      if (!cand.length) continue;
      cand.sort((u, v) => u - v);
      const bg = cand[cand.length >> 1], fg = rr(i);
      const hi = Math.max(bg, fg), lo = Math.min(bg, fg);
      out.push((hi + 0.05) / (lo + 0.05));
    }
    out.sort((u, v) => u - v);
    return { ink: ink.length, nf: fill.length,
             med: out.length ? out[out.length >> 1] : null,
             under45: out.length ? out.filter(v => v < 4.5).length / out.length : null,
             mask: mk ? null : { ink, fill } };
  }, { a: aPng, z: zPng, bx: box, mk: mask || null });

  const m0 = await CR(settled.png, blankI.png, icoBox, null);
  const MASK = m0 && m0.mask;
  info('아이콘 잉크 마스크', m0 ? (m0.ink + '화소(채움 ' + m0.nf + ')') : '실패');
  info('정착 대비(중앙값)', m0 && m0.med ? r2(m0.med) + ':1' : '—');
  const meas = async o => {
    const out = [];
    for (const T of STOPS) {
      const s = await shot(Object.assign({ T }, o));
      if (!s) { out.push(null); continue; }
      const d = await CR(s.png, blankI.png, icoBox, MASK);
      out.push(d ? d.med : null);
    }
    return out;
  };
  const mn = a => Math.min.apply(null, a.filter(v => v != null));
  const base = await meas({});
  info('현행(알 + 판) — T=0/40/80 대비', base.map(v => r2(v) + ':1').join(' / '));
  ok(m0 && m0.med > 6 && mn(base) < 4.5, '★ CW 의 ④ 가 재현된다 — 정착에서는 읽히는 아이콘이 플래시 창 안에서 **큰 글자 최소선(4.5:1) 아래**로 내려간다', r2(m0.med) + ':1 → 최악 ' + r2(mn(base)) + ':1');

  /* ⚑⚑ **성분 분해 — 씻는 손이 «판» 인가 «알» 인가**(CW 는 판이라고 적었다 · 그 진술을 자로 가른다) */
  const noG = await meas({ NOGAIN: true });     /* 판만 */
  const noF = await meas({ NOFLASH: true });    /* 알만 */
  info('판만(알 숨김)', noG.map(v => r2(v) + ':1').join(' / ') + '  → 최악 ' + r2(mn(noG)) + ':1');
  info('알만(판 숨김)', noF.map(v => r2(v) + ':1').join(' / ') + '  → 최악 ' + r2(mn(noF)) + ':1');
  ok(true, '· 성분 분해 — 어느 쪽을 걷어야 대비가 돌아오는지', '판만 ' + r2(mn(noG)) + ' · 알만 ' + r2(mn(noF)) + ' · 둘 다 ' + r2(mn(base)));

  const tab = [];
  for (const k of KS) {
    const m = await meas({ KVAL: k });
    tab.push({ k, mn: mn(m) });
    info('`--flash-k:' + k + '`', m.map(v => r2(v) + ':1').join(' / ') + '  → 최악 ' + r2(mn(m)) + ':1');
  }
  const hit = tab.filter(t => t.mn >= 4.5).sort((a, b) => b.k - a.k)[0];
  info('과녁(최악 4.5:1 이상)에 닿는 가장 큰 k', hit ? hit.k + ' (최악 ' + r2(hit.mn) + ':1)' : '없음');
  ok(!hit, '★ **`--flash-k` 는 이 축의 손잡이가 아니다**(619 16·18·19회차의 «0 도 답이 아니다» 와 같은 결론) — 스윕 전 구간이 과녁 미달이고 단조롭지도 않다', tab.map(t => t.k + ':' + r2(t.mn)).join(' · '));

  /* 15회차 사본(윗변 고정) ↔ 제품 — 대칭으로 바꾼 손이 ④ 를 **깎지 않았는가** */
  const preCR = await meas({ CSS: '#fxl .fx-flash{top:' + yPre.toFixed(2) + 'px !important;height:' + hPre.toFixed(2) + 'px !important}' });
  info('15회차 사본(윗변 고정)', preCR.map(v => r2(v) + ':1').join(' / ') + '  → 최악 ' + r2(mn(preCR)) + ':1');
  ok(mn(base) >= mn(preCR) - 0.15, '★ 액자를 줄여 대칭으로 만든 대가가 ④ 에서 **0 이다**(②③ 를 공짜로 얻었다)', r2(mn(preCR)) + ' → ' + r2(mn(base)));

  blk('4] 콘솔');
  ok(errs.length === 0, '콘솔 에러 0', errs.slice(0, 2).join(' | '));

  console.log('\nPROBE683F ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
