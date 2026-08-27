#!/usr/bin/env node
/* 작업 181 진단 — «룰렛 회전 중 팝업(박스)이 흔들린다» 의 진짜 소스 찾기
 *
 *   node tools/probe181.js
 *
 * verify65 는 `.mbox`/`.rlt`/버튼/`#app` **5개만** 본다. 그 5개가 Δ0 인데도 주인이
 * 흔들림을 본다면 «자를 안 댄 곳» 이 움직이는 것이다. 그래서 여기서는
 *   · `#app` 안의 **모든 요소**(HUD·연출 레이어 `#fxl` 포함)
 *   · 회전 구간 전체(버튼 누른 순간부터 rouSpinning=false 까지)
 * 를 프레임마다 훑어 rect / transform / scale / translate / rotate / filter / opacity 변화를 센다.
 * 전투 캔버스(#view)는 **가리지 않는다** — 실제 플레이 상태 그대로 본다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const FRAMES = Number(process.env.P181_FRAMES || 60);
const GAP = Number(process.env.P181_GAP || 60);

const key = (el) => el;

async function main() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  await page.evaluate(() => { S.daily.spins = 30; openRoulette(); });
  await page.waitForTimeout(600);

  const probe = () => {
    const out = {};
    const root = document.getElementById('app');
    if (!root) return { __none: true };
    const walk = (el, p) => {
      const r = el.getBoundingClientRect();
      if (r.width || r.height) {
        const cs = getComputedStyle(el);
        out[p] = [Math.round(r.x * 100) / 100, Math.round(r.y * 100) / 100,
                  Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100,
                  cs.transform, cs.scale, cs.translate, cs.rotate, cs.filter, cs.opacity];
      }
      let i = 0;
      for (const c of el.children) { walk(c, p + '>' + c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + '.' + (c.className && c.className.baseVal !== undefined ? '' : String(c.className).trim().split(/\s+/).join('.')) + ':' + (i++)); }
    };
    walk(root, 'app');
    return { out, spin: typeof rouSpinning !== 'undefined' ? rouSpinning : null };
  };

  await page.click('#rouBtn');
  const shots = [];
  for (let i = 0; i < FRAMES; i++) {
    shots.push(await page.evaluate(probe));
    await page.waitForTimeout(GAP);
  }

  const spinShots = shots.filter((s) => s.spin);
  console.log('총 ' + shots.length + '프레임 · 회전 중 ' + spinShots.length + '프레임 (간격 ' + GAP + 'ms)');

  /* 회전 중 프레임들 사이에서 변한 노드를 모은다 */
  const moved = {};
  for (let i = 1; i < spinShots.length; i++) {
    const a = spinShots[i - 1].out, b = spinShots[i].out;
    for (const k of Object.keys(b)) {
      if (!(k in a)) { (moved[k] = moved[k] || { n: 0, why: new Set() }).why.add('등장/소멸'); moved[k].n++; continue; }
      const A = a[k], B = b[k];
      const names = ['x', 'y', 'w', 'h', 'transform', 'scale', 'translate', 'rotate', 'filter', 'opacity'];
      let diff = [];
      for (let j = 0; j < names.length; j++) if (String(A[j]) !== String(B[j])) diff.push(names[j] + ' ' + A[j] + ' → ' + B[j]);
      if (diff.length) {
        const m = (moved[k] = moved[k] || { n: 0, why: new Set() });
        m.n++; diff.forEach((d) => m.why.add(d.length > 90 ? d.slice(0, 90) + '…' : d));
      }
    }
    for (const k of Object.keys(a)) if (!(k in b)) { (moved[k] = moved[k] || { n: 0, why: new Set() }).why.add('소멸'); moved[k].n++; }
  }

  /* 원판(#rouDisc)과 그 자손은 «돌아야 하는» 것이라 제외한다 */
  const list = Object.entries(moved).filter(([k]) => !k.includes('rouDisc')).sort((x, y) => y[1].n - x[1].n);
  console.log('\n회전 중 «변한» 노드(원판 제외) ' + list.length + '개');
  for (const [k, v] of list.slice(0, 40)) {
    console.log('  · [' + v.n + '회] ' + k);
    [...v.why].slice(0, 4).forEach((w) => console.log('        ' + w));
  }
  /* 회전 «직후»(rouSpinning=false 로 내려간 뒤) 구간도 따로 본다 — 당첨 연출이 박스를 흔드는가 */
  const endAt = shots.findIndex((s, i) => i > 0 && !s.spin && shots[i - 1].spin);
  if (endAt > 0) {
    const post = shots.slice(endAt - 1);
    const pm = {};
    for (let i = 1; i < post.length; i++) {
      const a = post[i - 1].out, b = post[i].out;
      for (const k of Object.keys(b)) {
        if (k.includes('rouDisc')) continue;
        if (!(k in a)) { (pm[k] = pm[k] || { n: 0, why: new Set() }).why.add('등장'); pm[k].n++; continue; }
        const A = a[k], B = b[k];
        const names = ['x', 'y', 'w', 'h', 'transform', 'scale', 'translate', 'rotate', 'filter', 'opacity'];
        let diff = [];
        for (let j = 0; j < names.length; j++) if (String(A[j]) !== String(B[j])) diff.push(names[j] + ' ' + A[j] + ' → ' + B[j]);
        if (diff.length) { const m = (pm[k] = pm[k] || { n: 0, why: new Set() }); m.n++; diff.forEach((d) => m.why.add(d.slice(0, 90))); }
      }
    }
    const inBox = Object.entries(pm).filter(([k]) => k.includes('mbox') || k.includes('#modal'));
    console.log('\n회전 «직후» 구간(' + (post.length - 1) + '프레임) 중 모달 안에서 변한 노드 ' + inBox.length + '개');
    for (const [k, v] of inBox.sort((x, y) => y[1].n - x[1].n).slice(0, 25)) {
      console.log('  · [' + v.n + '회] ' + k);
      [...v.why].slice(0, 3).forEach((w) => console.log('        ' + w));
    }
  }
  if (errs.length) console.log('\n콘솔 에러 ' + errs.length + '건:\n  ' + errs.slice(0, 5).join('\n  '));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
