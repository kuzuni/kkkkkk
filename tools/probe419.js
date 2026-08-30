#!/usr/bin/env node
/* 419 재현기 — «짧은 프레임에서 전체 높이 시트·공용 모달이 미션 배너(#tuto)를 덮는다» 를
 * 처방 **전에** 직접 재서 등재문의 값(17건 · 화면 7개 · 대부분 150px)을 확인하고,
 * 그 다음 «무엇이 실제로 나빠졌는가» 를 한 축 더 세운다.
 *
 * 실행: node tools/probe419.js [--frames 2280,1600] [--json <경로>]
 *
 * 338 규칙(«처방 전에 재현») — 407 은 가설이 맞았고 338·341 은 기각됐다. 그래서 이 자리도 먼저 묻는다.
 *
 * D7(probe351)이 내는 값은 «세로 겹침 px» 하나다. 그 값만으로는 두 그림을 구별할 수 없다:
 *   ⓐ 배너가 **통째로** 상자 뒤로 들어간다(사람 눈에는 «배너가 없다» — 깨져 보이지 않는다)
 *   ⓑ 배너가 **일부만** 덮여 오른쪽에 노란 **토막**이 삐져나온다(«깨져 보인다»)
 * 407 이 고친 자리는 ⓑ 였다(배너 [진행중] 버튼 잉크 87.5% 덮임 = 나머지가 보였다).
 * ⇒ 이 프로브는 겹침 px 말고 **«배너의 보이는 면적 %»** 를 잰다. 그것이 이 작업의 판정축이다.
 *
 * 그리고 «언제부터» 를 잰다 — 프레임을 내리며 겹침이 처음 생기는 지점(교차점)을 찾는다.
 * `.shortf`(frameH < 1842)를 처방의 문턱으로 쓸 수 있는지는 그 값으로만 정할 수 있다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const { fresh, settle, drive, collectOpeners } = require('./probe351lib');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ALL = process.argv.includes('--all');
const FRAMES = arg('--frames', ALL ? '2280,1920,1600' : '2280,1920,1850,1842,1841,1800,1741,1700,1600')
  .split(',').map((s) => parseInt(s, 10)).filter(Boolean);
const JSONOUT = arg('--json', null);

/* 419 등재문이 짚은 7화면 + 407 이 고친 2화면(음성 대조) */
const SCREENS = [
  { label: 'side:attend', sel: '.side .ibtn[data-pop="attend"]' },
  { label: 'side:roul', sel: '.side .ibtn[data-pop="roul"]' },
  { label: 'side:promo', sel: '.side .ibtn[data-pop="promo"]' },
  { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' },
  { label: 'menu:mail', mn: 'mail' },
  { label: 'menu:bag', mn: 'bag' },
  { label: 'prof:19', sel: '#profBtn' },
  { label: 'prof:20-스펙', prof: '.pf-tgl>.lb' },
  { label: 'cur:gold', sel: '[data-cur="gold"]' },       /* 407 이 닫은 자리 — 음성 대조 */
  { label: 'menu:conf', mn: 'conf' },                    /* 결함 없던 화면 — 음성 대조 */
];

/* ---- 페이지 안에서 재는 자 ---------------------------------------------------------------
   D7 과 «불투명 상자» 판정을 정확히 같게 둔다(같은 자리를 다른 자로 재면 값이 안 붙는다). */
const SCAN = function () {
  const app = document.getElementById('app');
  const tuto = document.getElementById('tuto');
  if (!app) return { err: 'no #app' };
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
  };
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    return d;
  };
  const A = app.getBoundingClientRect();
  if (!tuto || !vis(tuto)) return { frameH: Math.round(A.height), banner: null, hidden: true, covers: [], visPct: null };
  const b = tuto.getBoundingClientRect();
  const banner = { x1: b.left - A.left, y1: b.top - A.top, x2: b.right - A.left, y2: b.bottom - A.top };
  const area = (b.right - b.left) * (b.bottom - b.top);

  /* 배너를 덮는 «불투명 상자» 전부 — D7 과 같은 필터 */
  const covers = [];
  const rects = [];
  for (const el of app.querySelectorAll('*')) {
    if (!vis(el)) continue;
    if (el === tuto || el.contains(tuto) || tuto.contains(el)) continue;
    if (el.classList.contains('dim')) continue;
    const cs = getComputedStyle(el);
    const m = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    const parts = m ? m[1].split(',').map((s) => parseFloat(s)) : [];
    const alpha = m ? (parts.length > 3 ? parts[3] : 1) : 0;
    if (!(alpha >= 0.9 || cs.backgroundImage !== 'none')) continue;
    const d = clipped(el);
    const w = d.x2 - d.x1, h = d.y2 - d.y1;
    if (w < 300 || h < 200) continue;
    if (w * h < 120000) continue;
    const ov = Math.min(d.y2, b.bottom) - Math.max(d.y1, b.top);
    const ox = Math.min(d.x2, b.right) - Math.max(d.x1, b.left);
    if (ov <= 2 || ox <= 40) continue;
    let s = el.tagName.toLowerCase(), path = [];
    for (let e = el; e && e !== document.body && path.length < 4; e = e.parentElement) {
      if (e.id) { path.unshift('#' + e.id); break; }
      const c = (e.className && typeof e.className === 'string') ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      path.unshift(c ? e.tagName.toLowerCase() + '.' + c : e.tagName.toLowerCase());
    }
    covers.push({ path: path.join('>'), by: Math.round(ov), wide: Math.round(ox) });
    rects.push({ x1: Math.max(d.x1, b.left), y1: Math.max(d.y1, b.top), x2: Math.min(d.x2, b.right), y2: Math.min(d.y2, b.bottom) });
  }

  /* 덮인 «면적» — 상자들의 합집합을 x 좌표 이벤트로 쪼개 잰다(겹쳐도 두 번 안 센다) */
  let covered = 0;
  if (rects.length) {
    const xs = [...new Set(rects.flatMap((r) => [r.x1, r.x2]))].sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i++) {
      const x1 = xs[i], x2 = xs[i + 1];
      if (x2 <= x1) continue;
      const spans = rects.filter((r) => r.x1 <= x1 && r.x2 >= x2).map((r) => [r.y1, r.y2]).sort((p, q) => p[0] - q[0]);
      let cy = 0, cur = null;
      for (const [y1, y2] of spans) {
        if (!cur) { cur = [y1, y2]; continue; }
        if (y1 <= cur[1]) cur[1] = Math.max(cur[1], y2);
        else { cy += cur[1] - cur[0]; cur = [y1, y2]; }
      }
      if (cur) cy += cur[1] - cur[0];
      covered += (x2 - x1) * cy;
    }
  }
  /* «오른쪽 토막» — 배너 우변에서 덮이지 않고 남는 가로 폭(사람이 보는 그 노란 조각) */
  let stub = b.right - b.left;
  for (const r of rects) if (r.y2 - r.y1 > (b.bottom - b.top) * 0.9) stub = Math.min(stub, b.right - r.x2);

  return {
    frameH: Math.round(A.height), hidden: false,
    banner: { x1: Math.round(banner.x1), y1: Math.round(banner.y1), x2: Math.round(banner.x2), y2: Math.round(banner.y2) },
    covers, coveredPct: Math.round(1000 * covered / area) / 10,
    visPct: Math.round(1000 * (1 - covered / area)) / 10,
    stub: Math.round(stub * 10) / 10,
  };
};

/* `--file <경로>` — 되돌림 사본(선언을 뺀 index) 을 그대로 잴 수 있게. `fresh()` 는 파일을 못 받으므로
   같은 절차(뷰포트·goto·1100ms)를 여기서 편다. 공용 하네스(`probe351lib`)는 351 세션이 쓰고 있어 안 건드린다. */
const SRCFILE = 'file://' + require('path').resolve(__dirname, '..', arg('--file', 'index.html'));
async function open(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRCFILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page };
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  /* `--all` — 45 오프너 전수. 묻는 것은 «몇 px 겹치나» 가 아니라 **불변식**이다:
     배너는 **온전히 보이거나(덮임 0%) 아예 안 보인다(숨김 or 덮임 100%)**. 그 사이 =
     «토막» 이고, 이 작업이 지우는 것이 그것이다. 목록을 손으로 안 적으므로 새 오버레이가
     생겨도 자가 먼저 빨개진다(402 «표는 뒤처진다»). */
  const screens = ALL ? await collectOpeners(browser) : SCREENS;
  for (const s of screens) {
    for (const H of FRAMES) {
      const { ctx, page } = await open(browser, H);
      /* ⚠ 순서가 «열고 → 세운다» 여야 한다(probe351 277~278행과 같은 순서). 1회차에 이걸 뒤집었더니
         **열림 연출 한복판**에서 재게 돼 89 유물 페이지(`#relw`)가 `opacity:0` 로 읽혔고,
         불투명 상자에서 빠져 «배너가 1.8% 보인다» 는 유령이 나왔다 — 찍힌 픽셀로는 0 이다. */
      await drive(page, s);
      await settle(page);
      const r = await page.evaluate(SCAN);
      rows.push({ screen: s.label, H, ...r });
      await ctx.close();
    }
  }
  await browser.close();

  const pad = (v, n) => String(v).padStart(n);
  if (ALL) {
    const bad = rows.filter((r) => !r.hidden && r.coveredPct > 0.05 && r.visPct > 0.05);
    console.log('[419] 전수 — «토막»(0% < 덮임 < 100%) 만 낸다. 온전히 보임·완전덮임·숨김은 통과.');
    for (const r of bad) {
      console.log(`  ⚠ ${r.screen.padEnd(22)} ${pad(r.H, 4)}  보임 ${pad(r.visPct, 5)}%  토막 ${pad(r.stub, 6)}px  ` +
        r.covers.map((c) => `${c.path} ${c.by}/${c.wide}`).join(' · '));
    }
    console.log(`\n[419] 토막 ${bad.length}건 · 화면 ${new Set(bad.map((r) => r.screen)).size}/${screens.length}`);
    if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(rows, null, 1)); console.log('  → ' + JSONOUT); }
    return;
  }
  console.log('[419] 배너(#tuto) 덮임 — «겹침 px» 이 아니라 «보이는 면적 %» 와 «오른쪽 토막 px»');
  let cur = null;
  for (const r of rows) {
    if (r.screen !== cur) { cur = r.screen; console.log('\n  ' + cur); }
    if (r.hidden) { console.log(`    ${pad(r.H, 4)}  배너 숨김(display:none) — 판정 대상 아님`); continue; }
    const flag = r.coveredPct > 0 ? (r.visPct > 0.5 ? '⚠ 토막' : '· 완전덮임') : '·';
    console.log(`    ${pad(r.H, 4)}  보임 ${pad(r.visPct, 5)}%  덮임 ${pad(r.coveredPct, 5)}%  토막 ${pad(r.stub, 6)}px  ${flag}` +
      (r.covers.length ? '  [' + r.covers.map((c) => `${c.path} ${c.by}/${c.wide}`).join(' · ') + ']' : ''));
  }
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(rows, null, 1)); console.log('\n  → ' + JSONOUT); }
})();
