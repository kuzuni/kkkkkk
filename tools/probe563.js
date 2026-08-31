#!/usr/bin/env node
/* 재현 — 작업 563 「`tools/verify47.js` 11 건: 레드닷 27×27 이 «칸 밖으로 2.5px 돌출»」
 *
 *   node tools/probe563.js          사람용 표
 *   node tools/probe563.js --json   기계용
 *
 * 338 규칙대로 **처방 전에 재현한다.** 등재문(409 8회차 곁다리 관측)의 가설은
 * «돌출량이 어느 자리에서나 정확히 2.5px 이라 «닷이 커졌다» 가 아니라 **기준선 하나가
 * 2.5 옮겨 간 것** — 유력 용의자는 471 의 레드닷 통일 규약» 이다. 여기서 묻는 것은 둘이다:
 *
 *   ⓐ **제품이 정말 삐져나오나** — 찍힌 화소로 «칸 오른변 밖에 닷이 그려져 있나» 를 본다.
 *      (350·368 처방 — 캡처를 data URL 로 페이지에 되돌려 `getImageData` 로 읽는다.)
 *   ⓑ **그 돌출이 «규약» 인가 «사고» 인가** — 471 규약식
 *        right = --dot-in − --dot-r − --dot-bw   (index.html `:root{--dot-in:11px}` 옆)
 *      이 참이면 돌출량은 **--dot-r + --dot-bw − --dot-in** 으로 **닫힌 식**이다.
 *      `.stab>.bdg` 는 `--dot-r:13.5` · `--dot-bw` 선언 없음(칸 테두리 0) ⇒ 13.5 − 11 = **2.5**.
 *      즉 «칸 안(돌출 0)» 과 471 규약은 **동시에 참일 수 없다**. 이 자는 그 셋(선언식·실측
 *      돌출·닫힌 식)이 서로 맞는지를 자리마다 확인한다.
 *
 * ⚠ 「반달」 검사도 같이 한다 — 471 이 고친 결함이 «닷이 조상에게 잘린다» 였으므로,
 *   돌출한 쪽(오른쪽) 바깥 링이 **끝까지 그려지는지**를 화소로 본다. 잘려 있으면 이것은
 *   자 부패가 아니라 제품 결함이고 처방이 통째로 달라진다.
 * ⚠ 입장 연출(`jzPgIn` .12s · `jzSheetIn` .24s)이 도는 동안은 프레임 스케일 s ≠ 1 이라
 *   절대 좌표가 540·(1/s−1) 만큼 밀린다(verify47 서두 221 주석) — settle 뒤에 잰다.
 * ⚠ 맥박(`jzDotPulse` scale 1.14)이 켜져 있으면 닷이 12.5% 부푼 채로 찍힌다(471 5회차 사고) —
 *   자는 닷의 애니를 끄고 잰다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(process.env.P563_FILE || path.join(__dirname, '..', 'index.html'));
const KEY = 'idle_hunter_save_v4';
const JSONOUT = process.argv.includes('--json');
const W = 1080, H = 2280;
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);

/* 네 바 — 여는 코드는 `verify47.js` BARS 와 같은 것을 쓴다(385 «자매 자 드리프트» 방지) */
const BARS = [
  { key: 'sk',   name: '07 영웅 시트(스킬)', sel: '#bSk .stabs', open: 'goTab("hero",true); heroSubGo("sk");' },
  { key: 'eq',   name: '06 장비',            sel: '#eqTabs',     open: 'goTab("hero",true); heroSubGo("eq");' },
  { key: 'dun',  name: '03 던전',            sel: '#dunSub',     open: 'goTab("adv");',  close: 'closeDungeon();' },
  { key: 'shop', name: '10 상점',            sel: '#shopCats',   open: 'goTab("shop");', close: 'closeShopPage();' },
];

const SETTLE = `() => { const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length))))); }`;

/* 닷 화소 분류 — 코어 #F22E52 · 분홍 링 #FF7596 · 검정 외곽 */
const CORE = [242, 46, 82], RIM = [255, 117, 150];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(k => { try { localStorage.removeItem(k); } catch (_) {} }, KEY);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const rows = [];
  for (const b of BARS) {
    await page.evaluate(o => eval(o), b.open);
    await page.waitForTimeout(650);
    await page.evaluate(o => eval(o)(), SETTLE);

    /* 배지는 «기본 꺼짐 + .alert 로 점등» 이다(166) — 이 자가 재는 것은 «켜졌을 때의 기하» 라
       인라인으로 강제한다(인라인이 어떤 선택자보다 세다 — 166 특이성 함정 회피). */
    const geo = await page.evaluate(sel => {
      const bar = document.querySelector(sel);
      if (!bar) return { missing: true };
      const s = bar.getBoundingClientRect().width / bar.offsetWidth;
      if (!isFinite(s) || s <= 0) return { missing: true, hidden: true };
      const out = [];
      [...bar.querySelectorAll('.bdg')].forEach((d, i) => {
        d.style.setProperty('display', 'block', 'important');
        d.style.setProperty('animation', 'none', 'important');
        d.style.setProperty('transform', 'none', 'important');
        d.style.setProperty('opacity', '1', 'important');
        const cell = d.closest('.stab');
        if (!cell) return;
        const cells = [...bar.querySelectorAll(':scope > .stab')];
        const dr = d.getBoundingClientRect(), cr = cell.getBoundingClientRect();
        const ds = getComputedStyle(d), csl = getComputedStyle(cell);
        const num = v => parseFloat(v) || 0;
        /* 조상 클리핑 — 닷을 자를 수 있는 첫 조상(overflow ≠ visible) */
        let clipEl = null, p = d.parentElement;
        while (p && p !== document.body) {
          const c = getComputedStyle(p);
          if (c.overflow !== 'visible' || c.overflowX !== 'visible' || c.overflowY !== 'visible') { clipEl = p; break; }
          p = p.parentElement;
        }
        const clipR = clipEl ? clipEl.getBoundingClientRect() : null;
        out.push({
          cell: cells.indexOf(cell), label: (cell.querySelector('i') || {}).textContent || '',
          scale: s,
          dot: { x: dr.x / s, y: dr.y / s, w: dr.width / s, h: dr.height / s },
          cellR: { x: cr.x / s, y: cr.y / s, w: cr.width / s, h: cr.height / s },
          abs: { cx: dr.x + dr.width / 2, cy: dr.y + dr.height / 2, r2: dr.x + dr.width, cellR2: cr.x + cr.width },
          dotIn: (ds.getPropertyValue('--dot-in') || '').trim(),
          dotInX: (ds.getPropertyValue('--dot-in-x') || '').trim(),
          dotR: (ds.getPropertyValue('--dot-r') || '').trim(),
          dotBw: (ds.getPropertyValue('--dot-bw') || '').trim(),
          right: ds.right, top: ds.top,
          cellBw: num(csl.borderRightWidth),
          shadow: ds.boxShadow === 'none' ? '' : ds.boxShadow,
          clipSel: clipEl ? (clipEl.id ? '#' + clipEl.id : '.' + [...clipEl.classList].join('.')) : '',
          clipCut: clipR ? +((dr.x + dr.width) - clipR.right).toFixed(2) : null,
        });
      });
      return { bar: out, s };
    }, b.sel);

    if (geo.missing) { rows.push({ bar: b.name, missing: true }); if (b.close) await page.evaluate(o => eval(o), b.close); continue; }

    for (const d of geo.bar) {
      /* ── 찍힌 화소 — 칸 오른변을 가로지르는 가로 광선 하나 ─────────────────────
         칸 오른변 −6 부터 닷 오른끝 +10 까지 훑어 «어디까지가 닷인가» 를 색으로 읽는다. */
      const cy = Math.round(d.abs.cy);
      const x0 = Math.round(d.abs.cellR2 - 8), x1 = Math.round(d.abs.r2 + 12);
      const clip = { x: Math.max(0, x0), y: Math.max(0, cy - 1), width: Math.max(4, x1 - x0), height: 3 };
      const png = (await page.screenshot({ clip })).toString('base64');
      const scan = await page.evaluate(async ({ png, x0 }) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + png; });
        const cv = document.createElement('canvas');
        cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0);
        const dt = g.getImageData(0, 0, cv.width, cv.height).data;
        const row = [];
        const y = Math.min(1, cv.height - 1);
        for (let x = 0; x < cv.width; x++) { const i = (y * cv.width + x) * 4; row.push([dt[i], dt[i + 1], dt[i + 2], x0 + x]); }
        return row;
      }, { png, x0: clip.x });

      const nearC = (p, c, t) => Math.abs(p[0] - c[0]) <= t && Math.abs(p[1] - c[1]) <= t && Math.abs(p[2] - c[2]) <= t;
      const isCore = p => nearC(p, CORE, 26);
      const isRim = p => nearC(p, RIM, 40) && !isCore(p);
      const isBlk = p => p[0] < 60 && p[1] < 60 && p[2] < 60;
      const dotPx = scan.filter(p => isCore(p) || isRim(p));
      const outside = dotPx.filter(p => p[3] + 0.5 > d.abs.cellR2);      /* 칸 오른변 밖에 그려진 닷 화소 */
      /* 오른쪽 검정 외곽선이 끝까지 있나(반달이면 여기서 끊긴다) */
      const lastDot = dotPx.length ? Math.max(...dotPx.map(p => p[3])) : null;
      const blkAfter = lastDot === null ? 0
        : scan.filter(p => p[3] > lastDot && p[3] <= lastDot + 9 && isBlk(p)).length;

      const prot = (d.dot.x + d.dot.w) - (d.cellR.x + d.cellR.w);
      const inX = (d.cellR.x + d.cellR.w) - (d.dot.x + d.dot.w / 2);
      const inY = (d.dot.y + d.dot.h / 2) - d.cellR.y;
      const rNum = parseFloat(d.dotR) || 0, bwNum = parseFloat(d.dotBw) || 0;
      const inNum = parseFloat(d.dotInX || d.dotIn) || 0;
      rows.push({
        bar: b.name, cell: d.cell + 1, label: d.label,
        w: d.dot.w, h: d.dot.h, prot, inX, inY,
        formula: rNum + bwNum - inNum,          /* 471 규약이 만드는 «닫힌 돌출량» */
        dotIn: d.dotIn, dotR: d.dotR, dotBw: d.dotBw || '(없음)', cellBw: d.cellBw,
        right: d.right, top: d.top,
        pxOutside: outside.length, pxTotal: dotPx.length, blkAfter,
        clipSel: d.clipSel || '(없음)', clipCut: d.clipCut,
      });
    }
    if (b.close) await page.evaluate(o => eval(o), b.close);
    await page.waitForTimeout(200);
  }
  await browser.close();

  if (JSONOUT) { console.log(JSON.stringify({ rows, errs }, null, 2)); return; }

  console.log('PROBE563 — 서브탭 레드닷이 «칸 밖으로» 나가는가 (1080×2280 · 찍힌 화소)\n');
  console.log('  바 / 칸                     상자     돌출   코너안쪽    규약식   밖 화소  검정꼬리  자르는 조상');
  for (const r of rows) {
    if (r.missing) { console.log('  ' + r.bar.padEnd(26) + ' — 바 없음'); continue; }
    console.log('  ' + (r.bar + ' 칸' + r.cell + '«' + r.label + '»').padEnd(26) +
      (f1(r.w) + '×' + f1(r.h)).padStart(10) +
      f2(r.prot).padStart(8) +
      (f1(r.inX) + '/' + f1(r.inY)).padStart(11) +
      f2(r.formula).padStart(9) +
      String(r.pxOutside).padStart(8) + String(r.blkAfter).padStart(9) +
      '   ' + r.clipSel + (r.clipCut !== null ? ' (닷 우끝 − 조상 우변 ' + f2(r.clipCut) + ')' : ''));
  }
  const real = rows.filter(r => !r.missing);
  const allProt = real.every(r => Math.abs(r.prot - 2.5) <= 0.2);
  const allForm = real.every(r => Math.abs(r.prot - r.formula) <= 0.2);
  const allPaint = real.every(r => r.pxOutside > 0);
  const allRing = real.every(r => r.blkAfter >= 3);
  console.log('\n  선언 — right: ' + (real[0] || {}).right + ' · top: ' + (real[0] || {}).top
    + ' · --dot-in ' + (real[0] || {}).dotIn + ' · --dot-r ' + (real[0] || {}).dotR
    + ' · --dot-bw ' + (real[0] || {}).dotBw + ' · 칸 테두리 ' + (real[0] || {}).cellBw + 'px');
  console.log('  ⓐ 제품이 정말 칸 밖으로 나간다     : ' + (allProt ? '예 — ' + real.length + '자리 전부 2.5px' : '아니오/불균일'));
  console.log('  ⓐ2 그 자리에 실제로 화소가 찍힌다  : ' + (allPaint ? '예 (칸 밖 닷 화소 > 0)' : '아니오'));
  console.log('  ⓑ 돌출량 = --dot-r + --dot-bw − --dot-in (471 닫힌 식): ' + (allForm ? '예 — 자리마다 일치' : '아니오'));
  console.log('  ⓒ 반달(조상 클리핑)인가            : ' + (allRing ? '아니오 — 오른쪽 검정 외곽이 끝까지 그려진다' : '예 — 잘린 자리가 있다'));
  console.log('  콘솔 에러 ' + errs.length + '건');
  console.log('\n  ⇒ ⓐ·ⓑ 가 참이고 ⓒ 가 거짓이면 «제품이 471 규약대로 걸쳐 있고, «돌출 0» 을 묻는');
  console.log('     `verify47` 쪽이 471 이전의 옛 기준선» 이다(자 부패).');
})();
