/* 작업 191 — 89 유물 페이지 «아이콘이 전부 옆으로 밀림» 실측 프로브.
   슬롯(.rw-c) · 아이콘 상자(.rw-c>i) · 글리프 advance 박스(Range) · Lv 라벨(.rw-c>u) 의
   중심 x/y 를 한 줄씩 찍는다. «다 밀림» 이면 Δ 부호가 10칸 전부 같게 나온다.

   실행: node tools/probe191.js [높이…]   (기본 2280) */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const HEIGHTS = (process.argv.slice(2).length ? process.argv.slice(2) : ['2280']).map(Number);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const b = await launch(chromium);
  for (const H of HEIGHTS) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL);
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      document.querySelector('#tabbar [data-t="box"]').click();
    });
    /* 기하 정지 대기 */
    await p.evaluate(async () => {
      const sig = () => [...document.querySelectorAll('#relw .rw-c')]
        .map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(2)},${q.top.toFixed(2)},${q.width.toFixed(2)}`; }).join('|');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      let prev = '', same = 0, waited = 0;
      while (waited < 6000) { await wait(60); waited += 60; const s = sig(); same = (s === prev && s !== '') ? same + 1 : 0; prev = s; if (same >= 4) return; }
    });

    const rows = await p.evaluate(() => {
      const out = [];
      const cs = [...document.querySelectorAll('#relw .rw-c')];
      for (const c of cs) {
        const cr = c.getBoundingClientRect();
        const i = c.querySelector('i'), u = c.querySelector('u');
        const ir = i.getBoundingClientRect();
        const rg = document.createRange(); rg.selectNodeContents(i);
        const gr = rg.getBoundingClientRect();
        const ur = u.getBoundingClientRect();
        const st = getComputedStyle(i);
        out.push({
          id: c.dataset.rw, ch: i.textContent,
          slot: [+cr.left.toFixed(2), +cr.top.toFixed(2), +cr.width.toFixed(2), +cr.height.toFixed(2)],
          ibox: [+ir.left.toFixed(2), +ir.top.toFixed(2), +ir.width.toFixed(2), +ir.height.toFixed(2)],
          glyph: [+gr.left.toFixed(2), +gr.top.toFixed(2), +gr.width.toFixed(2), +gr.height.toFixed(2)],
          lv: [+ur.left.toFixed(2), +ur.top.toFixed(2), +ur.width.toFixed(2)],
          ff: st.fontFamily.slice(0, 40), fs: st.fontSize, ls: st.letterSpacing, ti: st.textIndent,
          dir: st.direction, ta: st.textAlign,
        });
      }
      return out;
    });

    console.log(`\n=== H=${H} · 슬롯 중심 대비 Δ (양수 = 오른쪽으로 밀림) ===`);
    console.log('id   ch  slotCx  iboxCx  Δibox   glyphCx  Δglyph  glyphW  glyphCy  ΔglyphY');
    for (const r of rows) {
      const scx = r.slot[0] + r.slot[2] / 2, scy = r.slot[1] + r.slot[3] / 2;
      const icx = r.ibox[0] + r.ibox[2] / 2;
      const gcx = r.glyph[0] + r.glyph[2] / 2, gcy = r.glyph[1] + r.glyph[3] / 2;
      console.log(`${r.id} ${r.ch.padEnd(3)} ${scx.toFixed(1).padStart(7)} ${icx.toFixed(1).padStart(7)} `
        + `${(icx - scx).toFixed(2).padStart(6)} ${gcx.toFixed(1).padStart(8)} ${(gcx - scx).toFixed(2).padStart(7)} `
        + `${r.glyph[2].toFixed(1).padStart(6)} ${gcy.toFixed(1).padStart(8)} ${(gcy - scy).toFixed(2).padStart(7)}`);
    }
    console.log('\n스타일:', JSON.stringify(rows[0] && { ff: rows[0].ff, fs: rows[0].fs, ls: rows[0].ls, ti: rows[0].ti, ta: rows[0].ta }));
    console.log('Lv 라벨 중심 Δ:', rows.map(r => (r.lv[0] + r.lv[2] / 2 - (r.slot[0] + r.slot[2] / 2)).toFixed(2)).join(' '));
    console.log('콘솔 에러:', errs.length);
    await ctx.close();
  }
  await b.close();
})();
