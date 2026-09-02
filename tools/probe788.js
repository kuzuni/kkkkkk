/* 작업 788 재현 — `tools/verify683.js` [H] 가 «다른 카드» 의 라벨을 재고 있는가
 *
 *   node tools/probe788.js            (기본 3라운드)
 *   node tools/probe788.js 5          (5라운드)
 *
 * 등재문(PROGRESS 788 · `docs/review/753-…md` §7-b)의 주장은 셋이다:
 *   ⓐ `labelShot()` 이 표본마다 `summonRelic(true)` 로 **무작위 유물**을 뽑는데,
 *      마스크·상자는 «정착» 프레임 **하나**에서 떠서 모든 표본에 같은 좌표로 적용된다
 *      ⇒ 정착과 표본이 다른 칸이면 «라벨이 아닌 곳» 이 아니라 **연출이 안 걸린 남의 라벨**을 잰다.
 *   ⓑ 그래서 [H2] 가 실행마다 20~100% 로 갈린다.
 *   ⓒ 칸을 고정하고 보유시켜 재면 값이 안정되고 **[H1] 이 실제로는 3:1 미만**이다.
 *
 * 338 규약 — 처방을 따르기 전에 재현부터 한다. 이 자는 **아무것도 안 고친다**(제품·게이트 0줄).
 * 두 모드를 같은 페이지·같은 라운드에서 번갈아 재서 «자의 차이» 말고 다른 변수를 남기지 않는다.
 *
 *   RND — 788 당시의 verify683 [H] 와 **같은 코드 경로**(표본마다 `summonRelic(true)`)
 *   FIX — 대상 칸을 `RELICS[0]`(rl0) 로 고정하고 **실제 경로로 보유시킨 뒤** 그 칸만 재는 경로
 *
 * ⚑⚑ 819(2026-09-02) — **[4] 를 «수리 전 사본» 에 다시 매달았다**(803 방법 · 제품 0줄).
 *   788 이 [4] 를 쓸 때의 세계는 **795 이전**(라벨 패치 없음)이고, 795 가 «덮는 대신 라벨을 플래시
 *   위에 되그린다»(`FXKEEP_TXT`)로 닫은 뒤로는 «봉우리에서 라벨이 씻긴다» 가 **구조적으로** 다시
 *   참이 될 수 없다 — 그대로 두면 이 항은 영원히 빨갛다(803-① «재현 항이 이미 지나간 상태를 묻고 있으면
 *   고칠 것이 아니라 옮길 것이다»). ⇒ 재는 대상을 **패치를 걷은 사본**(`fxFlash` 넷째 인자만 떨굼 —
 *   verify683 `labelShot(…, noKeep)` 과 같은 방법)으로 옮기고, «그럼 지금은?» 을 묻는 **짝 항 [4-c]**
 *   를 세웠다(사본만 재고 현행을 안 묻는 것도 헛초록이다 · 328~330).
 *   ⇒ 마스크도 [7] 의 **글리프 차분**으로 올렸다(788-③). 상자 마스크는 `.rw-c>u` 가 `left/right:-40px`
 *   라 **카드 밖 배경**을 함께 재서 같은 세계를 2.75 ↔ 3.15 로 흔든다(819 등재문 — 그 흔들림이 이 항을
 *   문턱 3 에 붙여 놓았다). 상자 값 자체는 [7] 에서 **측정만** 으로 계속 찍는다.
 *   ⚠ **문턱은 한 칸도 안 움직였다**(334) — 3:1 그대로다. 바뀐 것은 «누구에게 묻는가» 뿐이다.
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;
const ROUNDS = Number(process.argv[2] || 3);
const LT = [0, 20, 40, 60, 90, 130, 200, 260];      /* verify683 [H] 와 같은 표본 시각 */
const FIXED = 'rl0';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n[' + t);
const r2 = v => Math.round(v * 100) / 100;
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 한 프레임 — verify683 `labelShot()` 을 그대로 옮겨 오되 «어느 칸을 쓰는가» 만 인자로 뺐다.
   FIX 모드는 `summonRelic` 을 아예 안 부르고 고정 칸 객체로 `rwSummonFx` 를 부른다.
   ⚑ 819 — `o.noKeep` = **795 이전 사본**(넷째 인자만 떨굼) · `o.blank` = **라벨 글자만 지운 사본**
     (글리프 차분 마스크의 재료 · 788-③). 둘 다 제품·페이지 선언은 한 줄도 안 바꾼다. */
const shot = async (p, t, mode, o) => {
  o = o || {};
  const st = await ev(p, async ({ T, FIX, ID, NOKEEP, BLANK }) => {
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    if (!window.__p788to) { window.__p788to = window.setTimeout; window.__p788ri = window.requestAnimationFrame; }
    window.setTimeout = () => 0; window.requestAnimationFrame = () => 0;
    /* [H1][H2] 와 **같은 조건** — 알갱이는 숨긴다(그 축은 683 의 ⏸ 대기 항이고,
       각도가 매 실행 달라 여기 섞이면 «자리» 말고 다른 변수가 들어온다). */
    if (!document.getElementById('__p788nogain')) {
      const s = document.createElement('style'); s.id = '__p788nogain';
      s.textContent = '.fx-spark.fx-rlic{display:none !important}'; document.head.appendChild(s);
    }
    /* ⚑ 819 — «수리 전 사본»: `fxFlash` 의 **넷째 인자만** 떨군다(길이·상자·세기는 그대로).
       verify683 `labelShot(…, noKeep)` 과 글자 하나까지 같은 방법이라 두 자가 같은 세계를 잰다. */
    if (window.__p788ff) { window.fxFlash = window.__p788ff; window.__p788ff = null; }
    if (NOKEEP) { window.__p788ff = window.fxFlash;
      window.fxFlash = function (el, iv, inset) { return window.__p788ff.call(this, el, iv, inset); }; }
    const it = FIX ? RELICS.filter(r => r.id === ID)[0] : summonRelic(true);
    if (!it) return null;
    if (T >= 0) rwSummonFx(it, true, null);
    try {
      document.getAnimations().forEach(a => {
        const tg = a.effect && a.effect.target;
        if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = Math.max(0, T); } catch (_) {} }
        else { a.pause(); try { a.finish(); } catch (_) {} }
      });
    } catch (e) {}
    const el = document.querySelector('[data-rw="' + it.id + '"]');
    const u = el.querySelector('u'), b = u.getBoundingClientRect();
    const lab = u.textContent;
    if (BLANK) { window.__p788lab = lab; u.textContent = ''; }
    return { id: it.id, lab: lab,
             box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } };
  }, { T: t, FIX: mode === 'FIX', ID: FIXED, NOKEEP: !!o.noKeep, BLANK: !!o.blank });
  if (!st) return null;
  const png = (await p.screenshot()).toString('base64');
  if (o.blank) await ev(p, ID => {                                   /* 지운 라벨은 그 자리에서 되돌린다 */
    const el = document.querySelector('[data-rw="' + ID + '"]'), u = el && el.querySelector('u');
    if (u && window.__p788lab != null) { u.textContent = window.__p788lab; window.__p788lab = null; }
  }, FIXED);
  return { id: st.id, lab: st.lab, box: st.box, png };
};

/* verify683 [H] 의 «채움↔테 WCAG 대비비» 산수를 한 글자도 안 바꾸고 옮겼다 —
   재는 방법이 같아야 «자리만 다르다» 를 말할 수 있다. */
const RATIO = async ({ a, shots, box }) => {
  const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
  const px = async u => {
    const im = await load(u); const cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    return g.getImageData(box.x, box.y, box.w, box.h).data;
  };
  const A = await px(a);
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
  const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  const vals = []; for (let i = 0; i < A.length; i += 4) vals.push(lum(A, i));
  const srt = [...vals].sort((x, y) => x - y);
  const loT = srt[Math.floor(srt.length * 0.12)], hiT = srt[Math.floor(srt.length * 0.88)];
  const fill = [], stroke = [];
  for (let i = 0, k = 0; i < A.length; i += 4, k++) { if (vals[k] >= hiT) fill.push(i); else if (vals[k] <= loT) stroke.push(i); }
  const ratio = d => {
    if (!fill.length || !stroke.length) return 0;
    const mf = fill.reduce((s, i) => s + rl(d, i), 0) / fill.length;
    const ms = stroke.reduce((s, i) => s + rl(d, i), 0) / stroke.length;
    const hi = Math.max(mf, ms), lo = Math.min(mf, ms);
    return (hi + 0.05) / (lo + 0.05);
  };
  const per = [];
  for (const sh of shots) per.push({ t: sh.t, r: ratio(await px(sh.png)) });
  const worst = per.reduce((m, o) => (o.r < m.r ? o : m), per[0]);
  const late = per.filter(o => o.t >= 130).sort((x, y) => x.r - y.r)[0] || worst;
  return { base: ratio(A), per, worst, late };
};

/* 글리프 차분 마스크 — «글자가 있는 프레임 ↔ 글자만 지운 프레임» 의 차분이 곧 글리프 화소다.
   백분위로 «글자일 것 같은 밝기» 를 고르는 대신 제품에게 «어디가 글자인가» 를 직접 묻는다(788-③).
   ⚑ 819 — [7] 안에 인라인으로 있던 것을 그대로 끌어올렸다(글자 하나 안 고쳤다) — 이제 [4] 도 이 자를 쓴다. */
const INK = async ({ a, blank, shots, box }) => {
  const load = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
  const px = async u => { const im = await load(u); const cv = document.createElement('canvas');
    cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    return g.getImageData(box.x, box.y, box.w, box.h).data; };
  const A = await px(a), Z = await px(blank);
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const rl = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
  const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  const ink = [];
  for (let i = 0; i < A.length; i += 4) if (Math.abs(lum(A, i) - lum(Z, i)) >= 24) ink.push(i);
  if (ink.length < 200) return { ink: ink.length, per: [], base: 0 };
  const iv = ink.map(i => lum(A, i)).sort((x, y) => x - y);
  const loT = iv[Math.floor(iv.length * 0.25)], hiT = iv[Math.floor(iv.length * 0.75)];
  const fill = ink.filter(i => lum(A, i) >= hiT), stroke = ink.filter(i => lum(A, i) <= loT);
  if (!fill.length || !stroke.length) return { ink: ink.length, per: [], base: 0 };
  const ratio = d => {
    const mf = fill.reduce((s, i) => s + rl(d, i), 0) / fill.length;
    const ms = stroke.reduce((s, i) => s + rl(d, i), 0) / stroke.length;
    const hi = Math.max(mf, ms), lo = Math.min(mf, ms);
    return (hi + 0.05) / (lo + 0.05);
  };
  const per = [];
  for (const sh of shots) per.push({ t: sh.t, r: ratio(await px(sh.png)) });
  const worst = per.reduce((m, o) => (o.r < m.r ? o : m), per[0]);
  const late = per.filter(o => o.t >= 130).sort((x, y) => x.r - y.r)[0] || worst;
  return { ink: ink.length, nf: fill.length, ns: stroke.length, base: ratio(A), per, worst, late };
};

const round = async (p, mode) => {
  const settled = await shot(p, -1, mode);
  if (!settled) return null;
  const shots = [], ids = [];
  for (const t of LT) {
    const sh = await shot(p, t, mode);
    if (sh) { shots.push({ t, png: sh.png }); ids.push(sh.id); }
  }
  const m = await ev(p, RATIO, { a: settled.png, shots, box: settled.box });
  if (!m) return null;
  const same = ids.filter(i => i === settled.id).length;
  return Object.assign({ settledId: settled.id, lab: settled.lab, ids, same, n: ids.length }, m);
};

/* ⚑ 819 — 한 세계(패치 있음 / 걷음)를 **한 벌의 프레임**으로 재고 마스크만 둘로 나눠 계산한다.
   같은 PNG 를 두 마스크가 나눠 쓰므로 [4](글리프)와 [7](상자 대조)이 «다른 판» 을 비교할 일이 없다
   — 그리고 찍는 횟수도 안 는다(789-② «판이 달라지면 축이 하나 더 생긴다»). */
const inkRound = async (p, noKeep) => {
  const settled = await shot(p, -1, 'FIX', { noKeep });
  if (!settled) return null;
  const blank = await shot(p, -1, 'FIX', { noKeep, blank: true });
  if (!blank) return null;
  const shots = [];
  for (const t of LT) { const sh = await shot(p, t, 'FIX', { noKeep }); if (sh) shots.push({ t, png: sh.png }); }
  if (!shots.length) return null;
  const ink = await ev(p, INK, { a: settled.png, blank: blank.png, shots, box: settled.box });
  const box = await ev(p, RATIO, { a: settled.png, shots, box: settled.box });
  if (!ink || !box) return null;
  return { id: settled.id, lab: settled.lab, ink, box };
};

(async () => {
  console.log('=== probe788 — verify683 [H] 가 «다른 카드» 를 재는가 (라운드 ' + ROUNDS + ') ===');
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  await ev(p, () => { try { closeModal(); } catch (_) {} S.relic = 1e12; openRelw(); });
  await p.waitForTimeout(400);

  /* FIX 모드의 전제 — 고정 칸을 **실제 경로로** 보유시킨다(`off` 딤이 프레임마다 달라지면
     라벨 색이 통째로 바뀌어 «자리» 말고 다른 변수가 섞인다). */
  const own = await ev(p, ID => {
    for (let i = 0; i < 4000 && !has(ID); i++) summonRelic(true);
    renderRelw();
    return { owned: has(ID), lv: oLv(ID) };
  }, FIXED);

  blk('1] 전제 — 고정 칸이 실제 경로로 보유됐다');
  ok(!!own && own.owned, '1-a 고정 칸 ' + FIXED + ' 을 `summonRelic()` 반복으로 보유시켰다(스텁 없음)', own ? ('Lv.' + own.lv) : '실패');

  const R = { RND: [], FIX: [] };
  for (let i = 0; i < ROUNDS; i++) {
    for (const mode of ['RND', 'FIX']) {
      const r = await round(p, mode);
      if (r) R[mode].push(r);
      await ev(p, () => { const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
        const o = document.getElementById('__p788nogain'); if (o) o.remove();
        if (window.__p788to) { window.setTimeout = window.__p788to; window.requestAnimationFrame = window.__p788ri;
          window.__p788to = null; window.__p788ri = null; } });
      await p.waitForTimeout(120);
    }
  }

  const pct = r => Math.round(r.late.r / r.base * 100);
  /* ⚠ 819 — 여기의 «RND» 도 이미 **사본**이다(788 이 그 경로를 고친 뒤라 verify683 은 칸을 고정해 잰다).
     [2]·[3] 은 그 사본을 이 자 안에서 만들어 재므로 «이미 지나간 상태» 를 남에게 요구하지 않는다 —
     [4] 만 현행 트리에 매달려 있었고 그것이 819 였다. */
  blk('2] 재현 ⓐ — 788 당시의 자(RND 사본)는 표본이 정착과 «다른 칸» 이다');
  R.RND.forEach((r, i) => info('RND 라운드 ' + (i + 1),
    '정착 ' + r.settledId + ' ' + r2(r.base) + ':1 · 같은 칸 표본 ' + r.same + '/' + r.n
    + ' · 최악 t' + r.worst.t + ' ' + r2(r.worst.r) + ':1 · [H2] ' + r2(r.late.r) + '/' + r2(r.base) + ' = ' + pct(r) + '%'));
  const sameAll = R.RND.every(r => r.same === r.n);
  ok(R.RND.length > 0 && !sameAll,
     '2-a ★ RND 에서 표본 칸이 정착 칸과 어긋난다 — «라벨이 아닌 곳» 을 재는 뿌리(등재문 ⓐ)',
     R.RND.map(r => r.same + '/' + r.n).join(' · '));

  blk('3] 재현 ⓑ — 그래서 [H2] 백분율이 실행마다 갈린다');
  const rp = R.RND.map(pct), fp = R.FIX.map(pct);
  const spread = a => (a.length ? Math.max.apply(null, a) - Math.min.apply(null, a) : 0);
  info('RND [H2] %', rp.join(' · ') + '  (폭 ' + spread(rp) + '%p)');
  info('FIX [H2] %', fp.join(' · ') + '  (폭 ' + spread(fp) + '%p)');
  ok(R.FIX.length > 1 && spread(fp) <= 5,
     '3-a ★ 칸을 고정하면 [H2] 백분율이 라운드마다 5%p 안에서 안정된다(등재문 ⓒ)',
     '폭 ' + spread(fp) + '%p');
  ok(R.RND.length > 1 && R.FIX.length > 1 && spread(rp) > spread(fp),
     '3-b ★ 흔들림은 «제품» 이 아니라 «자» 의 것이다 — 같은 제품에서 RND 만 폭이 넓다',
     'RND ' + spread(rp) + '%p ↔ FIX ' + spread(fp) + '%p');

  /* ⚑⚑ 819 — [4]·[7] 이 쓰는 두 세계를 여기서 한 번에 잰다(글리프 마스크 + 상자 마스크 한 벌).
       KEEP   = 지금 트리(795 의 라벨 패치가 산 세계)
       NOKEEP = **수리 전 사본** — `fxFlash` 넷째 인자만 떨군 세계(788 이 [4] 를 쓸 때의 그 세계) */
  const G = { keep: [], nokeep: [] };
  for (let i = 0; i < ROUNDS; i++) {
    for (const nk of [false, true]) {
      const g = await inkRound(p, nk);
      if (g) G[nk ? 'nokeep' : 'keep'].push(g);
      await ev(p, () => { const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
        const o = document.getElementById('__p788nogain'); if (o) o.remove();
        if (window.__p788ff) { window.fxFlash = window.__p788ff; window.__p788ff = null; }
        if (window.__p788to) { window.setTimeout = window.__p788to; window.requestAnimationFrame = window.__p788ri;
          window.__p788to = null; window.__p788ri = null; } });
      await p.waitForTimeout(120);
    }
  }
  const wst = a => a.map(r => r.ink.worst.r);
  const avg = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

  blk('4] 재현 ⓒ — «수리 전 사본»(라벨 패치를 걷은 세계)에서 봉우리가 실제로 3:1 아래다');
  G.nokeep.forEach((r, i) => info('사본(패치 걷음) 라운드 ' + (i + 1),
    '정착 ' + r.id + ' «' + r.lab + '» ' + r2(r.ink.base) + ':1 · 봉투 '
    + r.ink.per.map(o => 't' + o.t + ' ' + r2(o.r)).join(' · ') + ' · 최악 t' + r.ink.worst.t + ' ' + r2(r.ink.worst.r) + ':1'));
  G.keep.forEach((r, i) => info('현행(패치 있음) 라운드 ' + (i + 1),
    '정착 ' + r2(r.ink.base) + ':1 · 최악 t' + r.ink.worst.t + ' ' + r2(r.ink.worst.r) + ':1'));
  ok(G.nokeep.length > 0 && G.nokeep.every(r => r.ink.ink >= 200),
     '4-s 표본이 있다 — 글리프 차분이 두 세계 모두에서 화소를 실제로 골랐다(≥200)',
     '사본 ' + G.nokeep.map(r => r.ink.ink).join(' · ') + ' · 현행 ' + G.keep.map(r => r.ink.ink).join(' · ') + '개');
  ok(G.nokeep.length > 0 && wst(G.nokeep).every(v => v < 3),
     '4-a ★ **사본**에서 [H1] 문턱(≥3:1)이 **일관되게** 미달이다 — 788 이 잡은 «헛초록의 정체»',
     wst(G.nokeep).map(r2).join(' · ') + ':1');
  ok(G.keep.length > 0 && G.nokeep.length > 0
     && G.keep.every(r => r.ink.base > 4) && G.nokeep.every(r => r.ink.base > 4),
     '4-b 정착 대비는 두 세계 다 문제없다(≥4:1) — 빨간 것은 «정착» 이 아니라 «연출 중» 이다',
     '현행 ' + G.keep.map(r => r2(r.ink.base)).join(' · ') + ' ↔ 사본 ' + G.nokeep.map(r => r2(r.ink.base)).join(' · ') + ':1');
  /* ⚑ 짝 항 — 사본만 재고 «그럼 지금은?» 을 안 물으면 이 자는 795 가 되돌려져도 초록이다(328~330). */
  ok(G.keep.length > 0 && wst(G.keep).every(v => v >= 3),
     '4-c ★ **현행**에서는 봉우리가 3:1 이상이다 — 795(`FXKEEP_TXT` 라벨 패치)가 닫은 자리',
     wst(G.keep).map(r2).join(' · ') + ':1');

  /* ⚑ 다음 세션을 위한 갈래 — «봉우리에서 라벨을 씻는 것» 이 플래시의 **어느 부품**인가.
     `.fx-flash` 는 09·12·17·코스튬·장비 공용이라(LESSONS 666-⑨) 이 행에서 손대지 않는다.
     그래도 «어디를 만져야 하는가» 는 여기서 재 둔다 — 안 재 두면 다음 세션이 같은 재현을 또 짠다. */
  blk('6] 갈래 — 봉우리(t20)의 워시가 플래시의 어느 부품인가 (측정만 · 제품 0줄)');
  const LAYERS = [
    ['전부(현행)', ''],
    ['채움 워시만 끔', '.fx-flash{background:transparent !important}'],
    ['흰 테만 끔', '.fx-flash{border-color:transparent !important}'],
    ['바깥 글로우만 끔', '.fx-flash{box-shadow:none !important}'],
    ['플래시 통째로 끔', '.fx-flash{display:none !important}'],
  ];
  const settled6 = await shot(p, -1, 'FIX');
  for (const [name, css] of LAYERS) {
    await ev(p, C => {
      const o = document.getElementById('__p788lyr'); if (o) o.remove();
      if (C) { const s = document.createElement('style'); s.id = '__p788lyr'; s.textContent = C; document.head.appendChild(s); }
    }, css);
    const sh = await shot(p, 20, 'FIX');
    const m = sh && settled6 ? await ev(p, RATIO, { a: settled6.png, shots: [{ t: 20, png: sh.png }], box: settled6.box }) : null;
    info('t20 대비 — ' + name, m ? (r2(m.per[0].r) + ':1  (정착 ' + r2(m.base) + ':1)') : '측정 실패');
  }
  await ev(p, () => { const o = document.getElementById('__p788lyr'); if (o) o.remove();
    const L = document.getElementById('fxl'); while (L && L.firstChild) L.removeChild(L.firstChild);
    const g = document.getElementById('__p788nogain'); if (g) g.remove(); });

  /* ⚑⚑ [6] 이 뜻밖의 것을 말한다 — 봉우리를 만드는 것은 «채움 워시»(2.75 → 2.84, 거의 안 움직인다)가
     아니라 **흰 테**(→4.75)와 **바깥 글로우**(→3.55)다. 그런데 그 둘은 카드 **가장자리·바깥**에 있고,
     `.rw-c>u` 는 `left:-40px;right:-40px;top:123px` 이라 **상자의 대부분이 카드 밖**이다(223×~40 중
     좌우 40px 기둥과 아래 ~10px 이 카드 밖 · 카드 높이 151). ⇒ 지금의 자는 «라벨 화소» 가 아니라
     «라벨 띠 **주변 배경**» 을 상당 부분 재고 있고, 어두운 쪽 마스크(하위 12%)에 **카드 밖 어두운 배경**이
     섞여 들어간다. 플래시가 그 배경을 밝히면 «테↔채움» 이 아니라 «배경↔채움» 이 좁아진다.
     ⇒ 그래서 이 자는 **글리프 화소만** 고르는 마스크를 따로 둔다: 같은 프레임에서 라벨 글자만 지운
     사본을 한 장 더 찍어 **차분**(제품에게 «어디가 글자인가» 를 직접 묻는다 · [G] 가 알 잉크에 쓰는
     방법과 같다)으로 화소 집합을 만든다. 손 상수 0개.
     ⚑ 819 — 그 마스크는 위 `INK` 로 올라갔고 **[4] 의 판정이 그것을 쓴다.** 아래 [7] 에 남은 것은
       «상자로 재면 같은 프레임이 어떻게 보이는가» 라는 **축 대조**다. */
  /* ⚑⚑ 819 — [7] 은 이제 «같은 프레임을 두 마스크로 재면 얼마나 다르게 보이는가» 다.
     [4] 가 글리프로 옮겨 갔으므로 여기서 다시 잴 것은 «값» 이 아니라 **자의 성질**이다:
     상자 마스크는 배경을 섞어 **두 세계의 차이를 좁힌다** — 그래서 문턱 3 에 붙어 흔들렸다.
     ⚠ «사본의 상자 값이 3 을 넘는가» 로는 단언하지 않는다 — 그 값이 2.75(788) ↔ 3.15(795 착수)로
       기계·그 사이 배경 변화에 흔들리는 것이 바로 이 절이 말하는 결함이고, 그것을 항으로 세우면
       **또 기계의 운을 묻는 항**이 된다(803-① 이 지운 바로 그 종류). 값은 찍고 판정은 «분리도» 로 한다. */
  blk('7] 축 대조 — 같은 프레임을 «상자 마스크» 로 재면 (값은 측정만 · 판정은 분리도)');
  const sep = a => (a.length ? avg(a.map(r => r.ink.worst.r)) : 0);
  const sepB = a => (a.length ? avg(a.map(r => r.box.worst.r)) : 0);
  G.nokeep.forEach((r, i) => info('사본 라운드 ' + (i + 1) + ' — 상자 ↔ 글리프',
    '상자 최악 ' + r2(r.box.worst.r) + ':1 (정착 ' + r2(r.box.base) + ') ↔ 글리프 최악 '
    + r2(r.ink.worst.r) + ':1 (정착 ' + r2(r.ink.base) + ') · 글리프 화소 ' + r.ink.ink + '개'));
  G.keep.forEach((r, i) => info('현행 라운드 ' + (i + 1) + ' — 상자 ↔ 글리프',
    '상자 최악 ' + r2(r.box.worst.r) + ':1 (정착 ' + r2(r.box.base) + ') ↔ 글리프 최악 '
    + r2(r.ink.worst.r) + ':1 (정착 ' + r2(r.ink.base) + ') · 글리프 화소 ' + r.ink.ink + '개'));
  const gK = sep(G.keep), gN = sep(G.nokeep), bK = sepB(G.keep), bN = sepB(G.nokeep);
  info('세계 간 분리도(현행 ÷ 사본)', '글리프 ' + r2(gK / (gN || 1)) + '배  ↔  상자 ' + r2(bK / (bN || 1)) + '배');
  ok(G.keep.length > 0 && G.nokeep.length > 0 && gN > 0 && bN > 0 && (gK / gN) > (bK / bN),
     '7-a ★ 글리프 마스크가 두 세계를 더 크게 가른다 — 상자 마스크는 배경을 섞어 차이를 좁힌다(788-②)',
     '글리프 ' + r2(gN) + ' → ' + r2(gK) + ' (×' + r2(gK / gN) + ') · 상자 ' + r2(bN) + ' → ' + r2(bK) + ' (×' + r2(bK / bN) + ')');
  info('7-b 판정 — 상자 마스크로 재면 사본이 문턱 3 을 넘는가',
       bN >= 3 ? '넘는다(' + r2(bN) + ':1) — 상자로 재면 **결함이 안 보인다**(788 당시 2.75~2.82 · 795 착수 3.06~3.15)'
               : '안 넘는다(' + r2(bN) + ':1) — 이 실행에서는 상자도 결함을 봤다. 값이 문턱에 붙어 있다는 것이 요점이다');

  blk('5] 위생');
  ok(errs.length === 0, '5-a 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nPROBE788 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
