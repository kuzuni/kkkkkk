#!/usr/bin/env node
/* 작업 619 **11회차** — §6 처방 세 건이 실제로 값을 움직였는지 재는 자 (338 규칙 — 눈보다 먼저 잰다)
 *
 *   node tools/probe619b.js
 *
 * 비평가 DZ·EA 의 10회차 지적 셋은 전부 «수치» 로 쓰여 있었다. 그러면 처방도 수치로 확인해야 한다 —
 * 「좋아 보인다」가 아니라 그 수치가 문턱을 넘었는가로 닫는다.
 *
 *   ⓐ **플로터 스폰 최소거리**(DZ «룬 f3 Δ60px · 단련 f4 Δ15px») —
 *      홀드 동안 `#fxl` 을 매 프레임 훑어 **동시에 살아 있는 같은 줄기(ok/no ↔ pay)** 의 좌표쌍을
 *      전부 모으고 그 **최솟값**을 적는다. 자를 «내가 만든 순번» 이 아니라 **찍힌 노드의 style.left**
 *      에 댄다 — 칸 산수는 칸 번호만 알지 픽셀은 모르기 때문에 이 결함이 났다(350 «찍힌 픽셀» 규칙).
 *      ⚠ 줄기 구분은 클래스로 한다: `.dn` 이 붙은 것이 비용(pay) 줄기, 안 붙은 것이 결과 줄기다.
 *
 *   ⓑ **스파크 크기**(DZ ② · EA ② «룬 48~52px 융합 블롭») — 홀드 동안 새로 붙은 `.fx-spark` 의
 *      실제 렌더 크기(getBoundingClientRect)를 세 화면에서 모아 최대·중앙값을 적는다.
 *      호스트 폭 대비 %도 같이 적는다 — 6회차가 «룬이 작아 보인다» 로 올린 값이라 되깎을 때
 *      그 회수분이 얼마나 남는지가 같이 보여야 한다.
 *
 *   ⓒ **«타격 순간» 몫의 대비**(EA ①④ · DX ②④ «훈련 f1 앰버가 크림 위 유백») —
 *      첫 발 버스트의 색과 호스트 바탕색을 둘 다 읽어 **상대 휘도 대비비**(WCAG 식)를 적는다.
 *
 * 세 값을 수리 전(`git stash`)·후로 각각 돌려 비교하는 것은 호출자 몫이다 — 이 자는 «지금 트리» 만 잰다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P619B_HOLD || 2600);

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',  n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',     n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0', n: '단련 [단련]' },
];

/* WCAG 상대 휘도 — 색 두 개의 대비비를 «수치» 로 말하기 위해서만 쓴다 */
const lum = ([r, g, b]) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const parseRGB = s => { const m = String(s).match(/(\d+(?:\.\d+)?)/g); return m ? m.slice(0, 3).map(Number) : null; };
const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const r2 = v => Math.round(v * 100) / 100;

/* 홀드 동안 매 프레임 `#fxl` 을 훑는 관찰자 — 함수를 감싸지 않고 **찍힌 노드**만 본다 */
const ARM = () => {
  const P = (window.__p619b = { pairs: [], sparks: [], firstCol: null });
  const L = document.getElementById('fxl');
  if (!L) return;
  const seen = new WeakSet();
  const scan = () => {
    const lanes = { res: [], pay: [] };
    for (const nd of L.querySelectorAll('.fx-plus.hb')) {
      const x = parseFloat(nd.style.left);
      if (Number.isFinite(x)) lanes[nd.classList.contains('dn') ? 'pay' : 'res'].push(x);
    }
    /* 같은 줄기에서 «동시에 살아 있는» 쌍의 거리 — 최솟값이 곧 «붙어 보이는» 정도다 */
    for (const k of ['res', 'pay']) {
      const xs = lanes[k];
      for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++)
        P.pairs.push({ lane: k, d: Math.abs(xs[i] - xs[j]) });
    }
    for (const nd of L.querySelectorAll('.fx-spark')) {
      if (seen.has(nd)) continue;
      seen.add(nd);
      const b = nd.getBoundingClientRect();
      if (b.width) P.sparks.push({ w: b.width, h: b.height });
      if (!P.firstCol) {
        const c = getComputedStyle(nd);
        P.firstCol = c.getPropertyValue('--c').trim() || c.backgroundColor;
      }
    }
    P.raf = requestAnimationFrame(scan);
  };
  scan();
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  console.log('작업 619 11회차 — §6 처방 실측 (홀드 ' + HOLD_MS + 'ms)\n');
  console.log('ⓐ 플로터 스폰 최소거리 — 동시 생존 같은 줄기 쌍의 Δx');
  console.log('ⓑ 스파크 실제 크기 · 호스트 폭 대비');
  console.log('─'.repeat(78));

  const rows = [];
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(420);
    await page.evaluate(ARM);
    const r = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sp.sel);
    const hb = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { w: b.width, h: b.height,
        bg: getComputedStyle(el).backgroundColor }; }, sp.host);
    if (!r || !r.w) { console.log('  ' + sp.n + ' — 대상 없음'); continue; }
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    await page.waitForTimeout(300);
    const d = await page.evaluate(() => { const P = window.__p619b;
      if (P.raf) cancelAnimationFrame(P.raf);
      return { pairs: P.pairs.slice(), sparks: P.sparks.slice(), firstCol: P.firstCol }; });

    const ds = d.pairs.map(p => p.d);
    const minD = ds.length ? Math.min(...ds) : null;
    const ws = d.sparks.map(s => s.w);
    const row = {
      id: sp.id, n: sp.n,
      hostW: Math.round(hb ? hb.w : 0), hostBg: hb && hb.bg,
      pairs: ds.length, minD: minD === null ? null : r2(minD), medD: r2(med(ds)),
      sparks: ws.length, maxW: r2(Math.max(0, ...ws)), medW: r2(med(ws)),
      pct: hb && hb.w ? r2(100 * med(ws) / hb.w) : 0,
      col: d.firstCol,
    };
    rows.push(row);
    console.log('  ' + sp.n);
    console.log('    ⓐ 동시 생존 쌍 ' + row.pairs + '개 · **최소 Δx ' + row.minD + 'px** · 중앙 ' + row.medD + 'px');
    console.log('    ⓑ 스파크 ' + row.sparks + '개 · 최대 ' + row.maxW + 'px · 중앙 ' + row.medW
      + 'px = 호스트 폭 ' + row.hostW + 'px 의 ' + row.pct + '%');
    console.log('       색 ' + (row.col || '?') + ' · 호스트 바탕 ' + (row.hostBg || '?'));
  }

  console.log('\nⓒ «타격 순간» 몫 대비비 (WCAG 상대 휘도)');
  for (const row of rows) {
    const a = parseRGB(row.col), b = parseRGB(row.hostBg);
    if (a && b && lum(b) > 0) console.log('    ' + row.n + ' — ' + r2(contrast(a, b)) + ' : 1');
    else console.log('    ' + row.n + ' — 바탕이 투명이라 대비비를 못 잰다(부모가 칠한다)');
  }

  console.log('\n' + '─'.repeat(78));
  console.log('문턱: ⓐ 최소 Δx ≥ 글리프 폭 69px(설계 피치가 더 좁은 훈련은 피치 64) · ⓑ 룬 스파크 ≤ 46px');
  await browser.close();
})();
