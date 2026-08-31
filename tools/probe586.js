/* 작업 586 재현 프로브 — «던전 팝업을 열 때 화면이 깜빡인다» (저장소 주인 보고 2026-08-31)
 *
 *   node tools/probe586.js              # 03 던전 — 재현 + 옛 키프레임 인터리브 A/B
 *   node tools/probe586.js --all        # 네 탭 페이지 전수(#dunw·#shopw·#trw·#eqw)
 *   node tools/probe586.js --reps 7     # A/B 반복 수(기본 5)
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **무엇이 몇 ms 비치는가** 를 찍는 자리다(338 규칙).
 * 등재문이 후보를 여섯(ⓐ~ⓕ) 남겼으므로 갈래를 고르기 **전에** 찍힌 픽셀부터 본다.
 *
 * ── 재는 법 ────────────────────────────────────────────────────────────────
 * 탭 페이지는 딤이 없는 **불투명한 면**이라, 열리는 동안 화면에 찍히는 것은
 *     F = α·page + (1−α)·old        (α = 실제로 렌더된 페이지 불투명도)
 * 다. 그래서 «비친다» 를 눈대중이 아니라 α 로 잰다 — 최소제곱 한 줄이면 나온다.
 *     α = <F−old, page−old> / |page−old|²
 * 축은 **둘**이다 — 하나로는 증상을 못 짚는다:
 *   **T_hold** = 켠 시각 → α ≥ 0.10 인 첫 프레임 = «화면이 아래 것 그대로 얼어 있는 시간».
 *                주인이 «깜빡인다» 고 한 것이 이 구간이다(눌렀는데 아무 일도 안 일어나다가 툭 바뀐다).
 *   **T_show** = 켠 시각 → α ≥ 0.9 인 첫 프레임 = 카드까지 다 칠해져 «정착» 하기까지.
 * ⚠ T_show 만 보면 처방을 잘못 고른다 — 카드가 기준 프레임의 대부분이라, 껍데기가 먼저 떠도
 *   T_show 는 거의 안 움직인다(실측: 껍데기 249ms · 정착 546ms).
 * ⚠ «α < 0.9 인 프레임 수» 를 축으로 쓰면 안 된다 — 페이드를 빼면 그 구간에 프레임이 아예
 *   안 나온다(합성기가 새로 보여 줄 것이 없다). 장수는 줄고 화면은 그대로 멈춰 있다.
 * ⚠ 픽셀은 CDP `Page.startScreencast` 로 받는다. rAF 로그로는 스톨 구간이 통째로 «없는 시간» 이
 *   되어 안 보인다(실제로 첫 시도에서 그렇게 놓쳤다). 받은 jpeg 는 **다른 페이지의 캔버스로
 *   되돌려** 읽는다(node 에 디코더가 없다 — 368 처방).
 * ⚠ 이 러너는 느리다. 그래서 ① **계측 바닥**(내용 없는 불투명 면을 같은 사각에 켜기)을 같이 재고
 *   ② 옛 키프레임 사본과 **인터리브**로 번갈아 돌려 드리프트를 상쇄하고 ③ 중앙값을 쓴다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const ALL = process.argv.includes('--all');
const REPS = (() => { const i = process.argv.indexOf('--reps'); return i > 0 ? (process.argv[i + 1] | 0) || 5 : 5; })();

/* 586 «이전» 을 되돌리는 두 조각 — 축을 따로 재려면 하나씩 되돌려야 한다.
   ⓐ 여는 프레임을 **투명하게 붙들던** 키프레임 · ⓑ 여는 프레임에 **카드를 칠하던** 것 */
const OLD_KF    = '@keyframes jzPgIn{0%{opacity:0;scale:.985}35%{opacity:1}100%{opacity:1;scale:1}}';
const OLD_PAINT = '#dunw.on:not(.warm) .dnc{visibility:visible}';
const REVERT = { now: '', kf: OLD_KF, paint: OLD_PAINT, old: OLD_KF + OLD_PAINT };

const PAGES = [
  { id: 'dunw',  n: '03 던전', open: "document.querySelector('#tabbar [data-t=\"adv\"]').click()" },
  { id: 'shopw', n: '10 상점', open: "openShopPage()" },
  { id: 'trw',   n: '23 훈련', open: "openTrain()" },
  { id: 'eqw',   n: '06 장비', open: "document.querySelector('#tabbar [data-t=\"hero\"]').click()" },
];

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 64 - t.length)));
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

const SETUP = `S.guide.idx = 99;
  Object.keys(DUN_UI).forEach(function(id){ if(DUN_UI[id].pre) S.dun[id] = 1; });
  Object.values(DUN_UI).forEach(function(u){ if(u.pre) S.dun[u.pre.id] = (u.pre.f|0)+1; });`;

/* 한 번 열고 T_show 를 잰다. mode: 'now' | 'old'(옛 키프레임 되돌림) | 'cal'(계측 바닥) */
async function measure(ctx, lab, P, mode) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1500);
  await page.evaluate(new Function(SETUP));
  if (REVERT[mode]) {
    await page.evaluate((kf) => { const s = document.createElement('style'); s.textContent = kf; document.head.appendChild(s); }, REVERT[mode]);
  }
  if (mode === 'cal') {
    await page.evaluate(() => {
      const d = document.createElement('div'); d.id = '__cal586';
      d.style.cssText = 'position:absolute;left:0;right:0;top:104px;bottom:180px;background:#26211B;z-index:9;display:none';
      document.getElementById('app').appendChild(d);
    });
  }
  await page.waitForTimeout(400);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, d: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (_) {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 2280, everyNthFrame: 1 });
  await page.waitForTimeout(700);

  const onAt = await page.evaluate(new Function('src', mode === 'cal'
    ? "document.getElementById('__cal586').style.display='block'; return Date.now();"
    : 'var t = Date.now(); (0,eval)(src); return t;'), P.open);

  await page.waitForTimeout(2800);
  await cdp.send('Page.stopScreencast');
  const box = mode === 'cal' ? [0, 104, 1080, 1996]
    : (await page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, P.id)).map(Math.round);

  /* ⚠ 배경 탭에서는 이미지 로드가 통째로 지연돼 한 장도 안 읽힌다 — 읽는 동안만 앞으로 낸다. */
  await lab.bringToFront();
  const res = await lab.evaluate(async ({ list, box }) => {
    /* ⚠ 스크린캐스트는 드물게 못 읽는 프레임을 준다(중단 직후 잘린 것). 즉사시키지 말고
       그 장만 버린다(LESSONS 319 — evaluate 예외는 블록만 빨갛게). */
    /* ⚠ `img.decode()` 는 **배경 탭에서 EncodingError 로 즉사한다**(전 프레임이 통째로 버려졌다).
       onload 로 받으면 같은 데이터가 그대로 읽힌다. */
    const dec = (d) => new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          c.getContext('2d').drawImage(im, 0, 0);
          res(c.getContext('2d').getImageData(box[0], box[1], box[2], box[3]).data);
        } catch (e) { res(null); }
      };
      im.onerror = () => res(null);
      im.src = 'data:image/jpeg;base64,' + d;
    });
    const px = [], keep = [];
    for (let i = 0; i < list.length; i++) { const p = await dec(list[i].d); if (p) { px.push(p); keep.push(i); } }
    if (px.length < 3) return { bad: true };
    const old = px[0], pg = px[px.length - 1];
    const alpha = (F) => { let n = 0, d = 0;
      for (let i = 0; i < F.length; i += 16) for (let k = 0; k < 3; k++) {
        const q = pg[i + k] - old[i + k]; if (Math.abs(q) < 24) continue;
        n += (F[i + k] - old[i + k]) * q; d += q * q; }
      return d ? n / d : 1; };
    return { keep, a: px.map((p) => +alpha(p).toFixed(3)) };
  }, { list: frames.map((f) => ({ d: f.d })), box });

  if (process.env.P586_DEBUG) console.log('    [dbg] frames=' + frames.length + ' first=' + JSON.stringify((frames[0]||{}).d||'').slice(0,40) + ' bad=' + !!res.bad);
  if (res.bad) { await page.close(); return { tShow: null, rows: [], box, errs }; }
  const rows = res.keep.map((fi, i) => ({ t: Math.round(frames[fi].t - onAt), a: res.a[i] })).filter((r) => r.t >= -30);
  const shown = rows.find((r) => r.a >= 0.9);
  const moved = rows.find((r) => r.a >= 0.10);
  await page.close();
  return { tShow: shown ? Math.max(0, shown.t) : null,
    tHold: moved ? Math.max(0, moved.t) : null, rows, box, errs };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const lab = await ctx.newPage();
  await lab.setContent('<canvas id="a"></canvas>');
  const P0 = PAGES[0];

  /* ── ① 재현 — 지금 트리에서 한 번 열어 프레임을 그대로 찍는다 ─────────── */
  blk('① 재현 — 03 던전 열기 전후, 렌더된 페이지 불투명도 α');
  const one = await measure(ctx, lab, P0, 'now');
  console.log('  패널 사각 ' + one.box.join(',') + ' · 켠 뒤 프레임 ' + one.rows.length + '장');
  for (const r of one.rows.slice(0, 14)) {
    console.log('    t=' + String(r.t).padStart(5) + 'ms  α=' + r.a.toFixed(3)
      + (r.a < 0.9 ? '   ← 아래 화면이 ' + Math.round((1 - r.a) * 100) + '% 비친다' : ''));
  }
  console.log('  ⇒ T_hold(화면이 아래 것 그대로) = ' + one.tHold + 'ms · T_show(정착) = ' + one.tShow + 'ms');
  ok(one.tShow !== null, '열기가 재현된다(끝내 α ≥ 0.9 에 닿는다)');
  ok(one.errs.length === 0, '콘솔 예외 0건');

  /* ── ② 계측 바닥 ───────────────────────────────────────────────────── */
  blk('② 계측 바닥 — 내용 없는 불투명 면을 같은 사각에 켜면 몇 ms 인가');
  const cal = await measure(ctx, lab, P0, 'cal');
  console.log('  ⇒ 바닥 T_hold = ' + cal.tHold + 'ms · T_show = ' + cal.tShow + 'ms (이 밑으로는 어떤 처방도 못 내려간다)');
  ok(cal.tHold !== null && cal.tHold < 400, '바닥이 측정된다 — T_hold ' + cal.tHold + 'ms');

  /* ── ③ 갈래 — 되돌림 인터리브 A/B ─────────────────────────────────── */
  blk('③ 갈래 — 586 의 두 조각을 하나씩 되돌린다 (인터리브 ' + REPS + '회)');
  console.log('    ⓐ kf    = 여는 키프레임을 `0%{opacity:0}` 로 되돌림');
  console.log('    ⓑ paint = 여는 프레임에 카드를 도로 칠하게 함(`.warm` 무력화)');
  const arms = { now: [], kf: [], paint: [], old: [] }, armsS = {};
  for (let i = 0; i < REPS; i++) {
    const line = [];
    for (const k of ['now', 'kf', 'paint', 'old']) {
      const r = await measure(ctx, lab, P0, k);
      if (r.tHold !== null) arms[k].push(r.tHold);
      if (r.tShow !== null) (armsS[k] = armsS[k] || []).push(r.tShow);
      line.push(k + ' ' + String(r.tHold).padStart(5) + '/' + String(r.tShow).padStart(5));
    }
    console.log('  #' + (i + 1) + '  ' + line.join('  ·  '));
  }
  const M = {}, MS = {};
  for (const k of Object.keys(arms)) { M[k] = med(arms[k]); MS[k] = med(armsS[k] || []); }
  console.log('  (칸은 T_hold / T_show)');
  console.log('  ⇒ T_hold 중앙값 — 지금 ' + M.now + 'ms · ⓐ만 되돌림 ' + M.kf + 'ms · ⓑ만 되돌림 ' + M.paint
    + 'ms · 둘 다(= 586 이전) ' + M.old + 'ms · 계측 바닥 ' + cal.tHold + 'ms');
  console.log('     T_show 중앙값 — 지금 ' + MS.now + 'ms · 586 이전 ' + MS.old + 'ms');
  console.log('     얼어 있는 시간(바닥 위) — 지금 ' + (M.now - cal.tHold) + 'ms ↔ 586 이전 ' + (M.old - cal.tHold) + 'ms');
  ok(M.old > M.now, '586 이전이 더 오래 비친다 — 수리가 실재한다 (' + M.old + ' ↔ ' + M.now + 'ms)');
  ok(M.paint > M.now, 'ⓑ «여는 프레임에 카드를 칠한다» 가 지배항이다 (' + M.paint + ' ↔ ' + M.now + 'ms)');
  ok(M.kf >= M.now, 'ⓐ «투명하게 붙드는 키프레임» 도 같은 방향이다 (' + M.kf + ' ↔ ' + M.now + 'ms)');

  /* ── ④ 같은 부품을 쓰는 네 탭 페이지 ───────────────────────────────── */
  if (ALL) {
    blk('④ 전수 — 같은 `jz-pg` 부품을 쓰는 네 탭 페이지');
    for (const P of PAGES) {
      const a = await measure(ctx, lab, P, 'now');
      const b = await measure(ctx, lab, P, 'old');
      console.log('  ' + P.n.padEnd(8) + ' T_hold 지금 ' + String(a.tHold).padStart(5) + 'ms ↔ 586 이전 '
        + String(b.tHold).padStart(5) + 'ms   ·   T_show ' + String(a.tShow).padStart(5) + ' ↔ ' + String(b.tShow).padStart(5));
    }
  }

  console.log('\nPROBE586 ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
