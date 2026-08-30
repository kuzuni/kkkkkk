#!/usr/bin/env node
/* 432 프로브 — 89 유물 페이지 `.rw-panel` 이 1600 에서 `overflow:hidden` 인 채
 * 내용이 **60px** 넘치는 자리를 «찍힌 값» 으로 좁힌다(338 규칙 — 처방 전에 재현부터).
 *
 * 실행: node tools/probe432.js [--frames 1600,1920,2280,2600]
 *
 * 등재문의 가설:
 *   ⓐ 100/120 이 넣은 `--rwc` 스케일의 «바닥» — 패널만 줄고 안의 내용은 스케일 밖 상수라
 *      패널이 짧아지는 만큼 내용이 안 따라온다.
 *
 * 재는 것:
 *   [1] 프레임별 `.rw-panel` clientH / scrollH / ovfY  (= probe351 D2 와 같은 축)
 *   [2] **누가 넘치는가** — 패널의 모든 자손을 패널 상단 기준으로 재서 bottom 이 clientH 를
 *       넘는 자를 전부 찍는다(scrollHeight 를 만드는 자는 «직속 자식» 이 아닐 수 있다)
 *   [3] 그 순간의 세로 예산 변수 전부(--rwc·--rw-sp·--rw-gt·--rw-bt·--rw-fl·--rw-sh·--rw-gd·--rw-gs·--rw-av)
 *   [4] 41 재화 바 `.pcb` 3알약의 자리(수리가 이것을 잘라선 안 된다 — 100 게이트 ⑤)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');

const FRAMES = (() => {
  const i = process.argv.indexOf('--frames');
  if (i > 0) return process.argv[i + 1].split(',').map(Number);
  return [1600, 1700, 1842, 1920, 2280, 2600];
})();
const OPENER = { label: 'tab:box', sel: '.tab[data-t="box"]' };

const DISSECT = function () {
  const pn = document.querySelector('#relw>.rw-panel');
  if (!pn) return { err: 'no .rw-panel' };
  const pr = pn.getBoundingClientRect();
  const cs = getComputedStyle(pn);
  /* ⚠ 커스텀 속성은 `getPropertyValue` 로 읽으면 **풀리지 않은 calc 문자열**이 나온다
     (`--rw-gt` 는 6줄짜리 중첩 calc 이라 그대로 찍으면 읽을 수 없다).
     ⇒ 임시 자식에 `height: var(--x)` 로 먹여 **레이아웃이 푼 px** 을 읽는다. */
  const vars = {};
  const t = document.createElement('div');
  t.style.cssText = 'position:absolute;left:0;top:0;width:1px;visibility:hidden;pointer-events:none';
  pn.appendChild(t);
  for (const k of ['--rwc', '--rw-sp', '--rw-av', '--rw-ah', '--rw-gt', '--rw-tt', '--rw-bt',
    '--rw-fl', '--rw-sh', '--rw-gd', '--rw-gs', '--rw-lt', '--rw-g3']) {
    if (k === '--rwc') { vars[k] = cs.getPropertyValue(k).trim(); continue; }
    t.style.height = `var(${k})`;
    vars[k] = +t.getBoundingClientRect().height.toFixed(2);
  }
  t.remove();
  /* 패널 안 모든 자손 — 패널 상단 기준 bottom 이 clientH 를 넘는 자 */
  const over = [];
  const rows = [];
  /* ⚠ 필터를 걸지 않는다 — `scrollHeight` 는 **투명·0크기·의사요소까지** 세므로
     «보이는 것만» 걸러 보면 «넘치는 자손 0건» 이라는 유령이 나온다(1회차에 밟았다). */
  for (const el of pn.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const top = +(r.top - pr.top).toFixed(2), bot = +(r.bottom - pr.top).toFixed(2);
    /* 의사요소도 같이 — `::before/::after` 는 rect 가 없으니 계산값(top+height)으로 잰다 */
    for (const q of ['::before', '::after']) {
      const ps = getComputedStyle(el, q);
      if (ps.content === 'none' || ps.display === 'none') continue;
      const pt = parseFloat(ps.top), ph = parseFloat(ps.height), pb = parseFloat(ps.bottom);
      if (!isFinite(pt) || !isFinite(ph)) continue;
      const pbot = top + pt + ph + (parseFloat(ps.borderBottomWidth) || 0) * 2;
      if (pbot > pn.clientHeight + 0.5) over.push({ path: 'PSEUDO ' + q + ' of ' + (el.className || el.tagName), top: +(top + pt).toFixed(2), bot: +pbot.toFixed(2), h: ph, by: +(pbot - pn.clientHeight).toFixed(2), _pb: pb });
    }
    const path = (() => {
      let p = [], n = el;
      while (n && n !== pn) { p.unshift(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).trim().replace(/\s+/g, '.') : '')); n = n.parentElement; }
      return p.join('>');
    })();
    rows.push({ path, top, bot, h: +r.height.toFixed(2) });
    if (bot > pn.clientHeight + 0.5) over.push({ path, top, bot, h: +r.height.toFixed(2), by: +(bot - pn.clientHeight).toFixed(2) });
  }
  over.sort((a, b) => b.by - a.by);
  /* 41 재화 바 알약 — 수리가 이것을 자르면 안 된다 */
  const pcb = document.querySelector('#relw>.pcb');
  const pills = pcb ? [...pcb.children].map((c) => {
    const r = c.getBoundingClientRect();
    return { cls: String(c.className || ''), y1: Math.round(r.top), y2: Math.round(r.bottom), w: Math.round(r.width) };
  }) : [];
  return {
    clientH: pn.clientHeight, scrollH: pn.scrollHeight,
    ovfY: pn.scrollHeight - pn.clientHeight,
    ovfX: pn.scrollWidth - pn.clientWidth,
    panelTop: +pr.top.toFixed(1), panelH: +pr.height.toFixed(1),
    overflowY: cs.overflowY,
    vars, over: over.slice(0, 12), nAll: rows.length,
    deepest: rows.slice().sort((a, b) => b.bot - a.bot).slice(0, 6),
    pills,
  };
};

/* [5] «찍힌 픽셀» — 클립이 **실제로 지우는 잉크가 있는가**(350 처방).
   `.rw-panel` 의 `overflow` 를 `visible` 로 바꾼 판과 원판을 같은 프레임에서 찍어 **차분**한다.
   클립은 «상자 밖» 만 지우므로, 두 장이 완전히 같으면 지워진 것이 **투명한 꼬리뿐**이라는 뜻이다. */
async function inkDiff(browser, h) {
  const shots = [];
  for (const vis of [false, true]) {
    const { ctx, page } = await fresh(browser, 1080, h);
    await drive(page, OPENER);
    if (vis) await page.addStyleTag({ content: '#relw>.rw-panel{overflow:visible !important}' });
    await settle(page);
    shots.push(await page.screenshot({ type: 'png' }));
    await ctx.close();
  }
  /* 두 PNG 를 페이지 안에서 캔버스로 풀어 픽셀 차분한다 */
  const { ctx, page } = await fresh(browser, 1080, h);
  const r = await page.evaluate(async ([a, b]) => {
    const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const mk = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return c.getContext('2d').getImageData(0, 0, im.width, im.height).data; };
    const A = mk(ia), B = mk(ib);
    let n = 0, worst = 0, wy = -1, wx = -1, minY = 1e9, maxY = -1;
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
      if (d > 1) {
        n++; const p = i / 4, y = Math.floor(p / ia.width), x = p % ia.width;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (d > worst) { worst = d; wy = y; wx = x; }
      }
    }
    return { w: ia.width, h: ia.height, diffPx: n, worst, wx, wy, minY: minY === 1e9 ? -1 : minY, maxY };
  }, [shots[0].toString('base64'), shots[1].toString('base64')]);
  await ctx.close();
  return r;
}

(async () => {
  const browser = await launch(chromium);
  const out = [];
  const inks = [];
  try {
    for (const h of FRAMES) {
      const { ctx, page } = await fresh(browser, 1080, h);
      await drive(page, OPENER);
      await settle(page);
      const d = await page.evaluate(DISSECT).catch((e) => ({ err: String(e.message || e) }));
      out.push({ frame: h, ...d });
      await ctx.close();
    }
    for (const h of FRAMES) inks.push({ frame: h, ...(await inkDiff(browser, h)) });
  } finally { await browser.close(); }

  console.log('=== 432 프로브 — .rw-panel 세로 넘침 ===');
  for (const r of out) {
    if (r.err) { console.log(`[${r.frame}] ERR ${r.err}`); continue; }
    console.log(`\n[${r.frame}] clientH=${r.clientH} scrollH=${r.scrollH} **ovfY=${r.ovfY}** ovfX=${r.ovfX} overflowY=${r.overflowY}`);
    console.log('   vars: ' + Object.entries(r.vars).map(([k, v]) => `${k}=${v}`).join(' · '));
    console.log(`   넘치는 자손 ${r.over.length}건 (자손 총 ${r.nAll}):`);
    for (const o of r.over) console.log(`     +${o.by}  ${o.path}  top=${o.top} bot=${o.bot} h=${o.h}`);
    console.log('   가장 깊은 6: ' + r.deepest.map((d) => `${d.path}@${d.bot}`).join(' · '));
    console.log('   .pcb 알약: ' + r.pills.map((p) => `${p.cls}[${p.y1}..${p.y2}]`).join(' · '));
  }
  console.log('\n=== [5] 찍힌 픽셀 — 클립이 지우는 잉크(overflow hidden ↔ visible 차분) ===');
  for (const k of inks) {
    console.log(`[${k.frame}] 다른 픽셀 ${k.diffPx}개 · 최대 Δ${k.worst}` +
      (k.diffPx ? ` @ (${k.wx},${k.wy}) · y 범위 ${k.minY}..${k.maxY}` : '  ⇒ 클립이 지우는 잉크 **0개**'));
  }
  const bad = out.filter((r) => !r.err && r.ovfY > 2);
  console.log(`\n요약 — 넘치는 프레임 ${bad.length}/${out.length}: ` +
    out.map((r) => `${r.frame}:${r.err ? 'ERR' : r.ovfY}`).join(' · '));
  console.log('       잉크 차분: ' + inks.map((k) => `${k.frame}:${k.diffPx}`).join(' · '));
})();
