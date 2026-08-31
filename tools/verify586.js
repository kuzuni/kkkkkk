/* 작업 586 게이트 — «던전 팝업을 열 때 화면이 깜빡인다» (저장소 주인 보고 2026-08-31)
 *
 *   node tools/verify586.js
 *
 * 증상의 정체는 «반짝임» 이 아니라 **«얼어 있음»** 이었다(재현: `tools/probe586.js`) —
 * 03 던전 페이지를 켠 뒤에도 화면이 **아래 화면 그대로** 0.6~0.8초 멈춰 있다가 툭 바뀐다.
 * 뿌리는 켜지는 **그 한 프레임이 너무 비싼 것**이고, 두 조각이었다:
 *   ⓐ `@keyframes jzPgIn{0%{opacity:0}}` — 전체화면 페이지를 **투명하게 붙든다**(딤이 없으므로
 *      그 구간은 곧 «아래 화면이 그대로 보이는» 구멍이다).
 *   ⓑ 켜는 프레임에 **카드 8장을 전부 칠한다** — `probe586` 실측으로 그 시간의 전부가 이것이었다.
 *
 * ── 이 게이트가 재는 것 ────────────────────────────────────────────────────
 *  [A] 선언 — ⓐⓑ 처방이 소스에 그 모양으로 서 있다(문자열이 아니라 **CSSOM 승자**로 묻는다).
 *  [B] 거동 — 실제로 열어서 «켠 프레임에 카드가 안 칠해지고, 다음 프레임에 칠해진다» 를 확인.
 *  [C] 픽셀 — 찍힌 프레임으로 T_hold(아래 화면이 그대로인 시간)를 재고 **계측 바닥 대비** 판정.
 *  [R] 되돌림 — ⓐⓑ 를 되돌린 사본이 **더 오래 얼어 있다**(무르게 푼 수리가 아님을 못박는다).
 *
 * ⚠ **«비치는 프레임 0장» 으로는 못 짠다**(등재문 ⑴ 정정). 내용이 **없는** 불투명 면을 같은
 *   사각에 켜도 이 러너에서 T_hold 가 **125~140ms** 다 — 0 을 요구하면 어떤 처방으로도 못 닿는
 *   영원히 빨간 게이트가 된다. 그래서 **바닥을 같은 실행에서 같이 재고 그 배수로** 묻는다
 *   (하드웨어가 빨라지든 느려지든 같이 움직이는 자다).
 * ⚠ 픽셀은 CDP 스크린캐스트로 받는다 — `page.screenshot()` 은 이 화면에서 한 장에 4.4초가 걸려
 *   전환을 통째로 놓친다(실측). 받은 jpeg 는 다른 페이지의 캔버스로 되돌려 읽는다(368).
 * ⚠ 배경 탭에서는 `img.decode()` 가 EncodingError 로 즉사한다 — `onload` 로 받는다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const REPS = (() => { const i = process.argv.indexOf('--reps'); return i > 0 ? (process.argv[i + 1] | 0) || 3 : 3; })();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✅ ' + m + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  ❌ ' + m + (d ? ' — ' + d : '')); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

/* 586 «이전» 을 되돌리는 두 조각 — [R] 이 쓴다 */
const OLD_KF    = '@keyframes jzPgIn{0%{opacity:0;scale:.985}35%{opacity:1}100%{opacity:1;scale:1}}';
const OLD_PAINT = '#dunw.on:not(.warm) .dnc{visibility:visible}';

const UNLOCK = () => {
  S.guide.idx = 99;
  Object.keys(DUN_UI).forEach((id) => { if (DUN_UI[id].pre) S.dun[id] = 1; });
  Object.values(DUN_UI).forEach((u) => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
};

/* 한 번 열고 T_hold 를 잰다. revert: 되돌릴 CSS(없으면 '') · cal: 내용 없는 면(계측 바닥) */
async function open1(ctx, lab, { revert = '', cal = false } = {}) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1500);
  await page.evaluate(UNLOCK);
  if (revert) await page.evaluate((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); }, revert);
  if (cal) await page.evaluate(() => {
    const d = document.createElement('div'); d.id = '__cal586';
    d.style.cssText = 'position:absolute;left:0;right:0;top:104px;bottom:180px;background:#26211B;z-index:9;display:none';
    document.getElementById('app').appendChild(d);
  });
  await page.waitForTimeout(400);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, d: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (_) {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 2280, everyNthFrame: 1 });
  await page.waitForTimeout(700);

  const onAt = await page.evaluate((c) => {
    if (c) { document.getElementById('__cal586').style.display = 'block'; return Date.now(); }
    const t = Date.now();
    document.querySelector('#tabbar [data-t="adv"]').click();
    return t;
  }, cal);
  await page.waitForTimeout(2800);
  await cdp.send('Page.stopScreencast');

  await lab.bringToFront();
  const res = await lab.evaluate(async ({ list, box }) => {
    const dec = (d) => new Promise((r) => {
      const im = new Image();
      im.onload = () => { try {
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        c.getContext('2d').drawImage(im, 0, 0);
        r(c.getContext('2d').getImageData(box[0], box[1], box[2], box[3]).data);
      } catch (e) { r(null); } };
      im.onerror = () => r(null);
      im.src = 'data:image/jpeg;base64,' + d;
    });
    const px = [], keep = [];
    for (let i = 0; i < list.length; i++) { const p = await dec(list[i].d); if (p) { px.push(p); keep.push(i); } }
    if (px.length < 4) return { bad: true };
    const old = px[0], pg = px[px.length - 1];
    const alpha = (F) => { let n = 0, d = 0;
      for (let i = 0; i < F.length; i += 16) for (let k = 0; k < 3; k++) {
        const q = pg[i + k] - old[i + k]; if (Math.abs(q) < 24) continue;
        n += (F[i + k] - old[i + k]) * q; d += q * q; }
      return d ? n / d : 1; };
    return { keep, a: px.map((p) => +alpha(p).toFixed(3)) };
  }, { list: frames.map((f) => ({ d: f.d })), box: [0, 104, 1080, 1996] });

  await page.close();
  if (res.bad) return { tHold: null, errs };
  const rows = res.keep.map((fi, i) => ({ t: Math.round(frames[fi].t - onAt), a: res.a[i] })).filter((r) => r.t >= -30);
  const moved = rows.find((r) => r.a >= 0.10);
  return { tHold: moved ? Math.max(0, moved.t) : null, errs, rows };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const lab = await ctx.newPage();
  await lab.setContent('<canvas id="a"></canvas>');
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1500);

  /* ── [A] 선언 — 문자열이 아니라 CSSOM 승자에게 묻는다 ────────────────── */
  blk('[A] 선언 — 여는 프레임을 «투명하게 붙들지 않는다» · «카드를 안 칠한다»');
  const decl = await page.evaluate(() => {
    const out = { kf0: null, kfHasOpacity: null, cOpen: null, cClose: null, warmRule: null, fadeKf: null };
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (const r of rs) {
        if (r.type === CSSRule.KEYFRAMES_RULE && r.name === 'jzPgIn') {
          out.kf0 = r.cssText;
          out.kfHasOpacity = /opacity/.test(r.cssText);
        }
        if (r.type === CSSRule.KEYFRAMES_RULE && r.name === 'jzPgFade') out.fadeKf = r.cssText;
        if (!r.selectorText) continue;
        if (r.selectorText === '.jz-o.jz-pg') out.cOpen = r.style.animation;
        if (r.selectorText === '.jz-c.jz-pg') out.cClose = r.style.animation;
        if (/#dunw\.on:not\(\.warm\)/.test(r.selectorText)) out.warmRule = r.selectorText + '{' + r.style.cssText + '}';
      }
    }
    return out;
  });
  ok(decl.kf0 !== null, '[A1] `@keyframes jzPgIn` 이 있다', decl.kf0 ? decl.kf0.slice(0, 70) : '(없음)');
  ok(decl.kfHasOpacity === false,
    '[A2] ⓐ 여는 키프레임에 `opacity` 가 **없다**(전체화면 페이지는 첫 커밋부터 불투명하다)',
    decl.kf0 ? decl.kf0.replace(/\s+/g, ' ').slice(0, 80) : '');
  ok(/jzPgIn/.test(decl.cOpen || ''), '[A3] 여는 선언은 그대로 `jzPgIn` 이다(이름을 안 바꿨다 — settle291·neg221 이 이름으로 찾는다)', decl.cOpen);
  ok(/jzPgFade/.test(decl.cClose || '') && /opacity/.test(decl.fadeKf || ''),
    '[A4] **닫는 쪽 페이드는 살아 있다** — 자기 애니메이션(`jzPgFade`)으로 갈랐다', decl.cClose);
  ok(!!decl.warmRule && /visibility:\s*hidden/.test(decl.warmRule),
    '[A5] ⓑ `#dunw.on:not(.warm) .dnc{visibility:hidden}` 규칙이 있다', decl.warmRule || '(없음)');
  ok(!/content-visibility/.test(decl.warmRule || ''),
    '[A6] `content-visibility` 가 아니다(크기 억제가 걸리면 그 프레임에 리스트 높이가 접힌다)');

  /* ── [B] 거동 — 켠 프레임 ↔ 다음 프레임 ─────────────────────────────── */
  blk('[B] 거동 — 켠 프레임에는 안 칠하고, 다음 프레임에 칠한다');
  const beh = await page.evaluate((u) => new Promise((done) => {
    (new Function(u))();
    document.querySelector('#tabbar [data-t="adv"]').click();
    const w = document.getElementById('dunw');
    const card = () => document.querySelector('#dunList .dnc');
    const snap = () => ({ cls: w.className, vis: card() ? getComputedStyle(card()).visibility : '(카드 없음)',
      n: document.querySelectorAll('#dunList .dnc').length,
      h: card() ? Math.round(card().getBoundingClientRect().height) : 0 });
    const t0 = snap();
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      const t2 = snap();
      /* 닫으면 `.warm` 이 떨어져야 다음에 열 때 다시 효과가 난다 */
      closeDungeon();
      done({ t0, t2, afterClose: w.className });
    })));
  }), '(' + UNLOCK.toString() + ')()');
  ok(beh.t0.n >= 6, '[B1] 켜는 시점에 카드가 **이미 DOM 에 있다**(«빈 상자» 를 새로 만들지 않았다 — 그리고 나서 켠다)', beh.t0.n + '장');
  ok(beh.t0.vis === 'hidden', '[B2] 켠 프레임의 카드는 `visibility:hidden`', beh.t0.cls + ' / ' + beh.t0.vis);
  ok(beh.t0.h > 100, '[B3] 그런데 **배치는 그대로다** — 카드 높이가 살아 있다(크기 억제가 아니다)', beh.t0.h + 'px');
  ok(beh.t2.vis === 'visible' && /\bwarm\b/.test(beh.t2.cls), '[B4] 다음 프레임에는 `.warm` 이 붙고 카드가 보인다', beh.t2.cls + ' / ' + beh.t2.vis);
  ok(!/\bwarm\b/.test(beh.afterClose), '[B5] 닫으면 `.warm` 이 같이 떨어진다(안 떼면 두 번째 열기부터 처방이 죽는다)', beh.afterClose || '(빈 클래스)');
  await page.close();

  /* ── [C]·[R] 픽셀 ───────────────────────────────────────────────────── */
  blk('[C] 픽셀 — T_hold(아래 화면이 그대로인 시간) · 같은 실행에서 잰 계측 바닥 대비');
  const cal = await open1(ctx, lab, { cal: true });
  console.log('  계측 바닥(내용 없는 불투명 면) T_hold = ' + cal.tHold + 'ms');
  const now = [], old = [];
  for (let i = 0; i < REPS; i++) {
    const a = await open1(ctx, lab);
    const b = await open1(ctx, lab, { revert: OLD_KF + OLD_PAINT });
    if (a.tHold !== null) now.push(a.tHold);
    if (b.tHold !== null) old.push(b.tHold);
    console.log('  #' + (i + 1) + '  지금 ' + String(a.tHold).padStart(5) + 'ms   ↔   586 이전 ' + String(b.tHold).padStart(5) + 'ms');
    errs.push.apply(errs, a.errs); errs.push.apply(errs, b.errs);
  }
  const mNow = med(now), mOld = med(old), floor = cal.tHold;
  console.log('  ⇒ 중앙값 — 지금 ' + mNow + 'ms · 586 이전 ' + mOld + 'ms · 바닥 ' + floor + 'ms');
  ok(floor !== null && mNow !== null && mOld !== null, '[C1] 세 값이 다 측정됐다');
  /* 문턱 3.5배 — 실측 분포에서 고른 값이다(러너 5회):
       수리 후 바닥의 **1.91 · 1.99 · 2.12 · 2.43** 배 ↔ 수리 전 **4.86 · 5.08 · 6.46** 배.
     둘 사이가 비어 있는 구간의 한복판이라 어느 쪽으로도 한 칸 흔들려서는 안 넘는다.
     ⚠ 절대 ms 로 박으면 안 된다 — 러너 속도가 바뀌면 통째로 거짓말이 된다. 그래서 **바닥을
       같은 실행에서 같이 재고 그 배수로** 묻는다. */
  ok(mNow !== null && floor !== null && mNow <= floor * 3.5,
    '[C2] 얼어 있는 시간이 **계측 바닥의 3.5배 안**이다', mNow + 'ms ≤ ' + Math.round(floor * 3.5) + 'ms (바닥 ' + floor + 'ms · ' + (mNow / floor).toFixed(2) + '배)');

  blk('[R] 되돌림 — 처방을 되돌리면 다시 얼어붙는다(무르게 푼 수리가 아니다)');
  ok(mOld !== null && mNow !== null && mOld >= mNow * 1.6,
    '[R1] 586 이전 사본이 **1.6배 이상** 오래 얼어 있다', mOld + 'ms ↔ ' + mNow + 'ms (' + (mOld / mNow).toFixed(2) + '배)');
  ok(mOld !== null && floor !== null && mOld > floor * 3.5,
    '[R2] 그리고 그 사본은 [C2] 의 선(바닥 ×3.5)을 **넘는다** — 이 자가 실제로 빨개진다', mOld + 'ms > ' + Math.round(floor * 3.5) + 'ms');

  blk('콘솔');
  ok(errs.length === 0, '콘솔 에러 0건', errs.length ? errs.slice(0, 3).join(' | ') : '');

  console.log('\nVERIFY586 ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
