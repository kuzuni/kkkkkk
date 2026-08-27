/* 작업 191 — 89 유물 페이지 슬롯 격자(.rw-grid) 캡처.
   191 은 «아이콘이 슬롯 안에서 옆으로 밀렸는가» 만 본다 → 프레임 전체가 아니라 격자만 찍는다.
   슬롯 10칸의 프레임 좌표를 같이 내보내(docs/review/191-<회차>.json) scan191.py 가 그대로 쓴다.

   실행: node tools/cap191.js <회차> [높이]      기본 2280
   출력: docs/review/191-<회차>.png (격자 클립) + 191-<회차>.json (슬롯 rect)

   cap120 과 같은 이유로 **고정 대기 금지** — 60 쥬시 팝인이 끝날 때까지 기하를 폴링한다. */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const RND = process.argv[2] || 'r1';
const H = Number(process.argv[3] || 2280);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'docs', 'review');

(async () => {
  const b = await launch(chromium);
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
  const ok = await p.evaluate(async () => {
    const sig = () => [...document.querySelectorAll('#relw .rw-c')]
      .map(e => { const q = e.getBoundingClientRect(); return `${q.left.toFixed(2)},${q.top.toFixed(2)},${q.width.toFixed(2)}`; }).join('|');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let prev = '', same = 0, waited = 0;
    while (waited < 6000) { await wait(60); waited += 60; const s = sig(); same = (s === prev && s !== '') ? same + 1 : 0; prev = s; if (same >= 4) return true; }
    return false;
  });
  if (!ok) { console.error('FAIL — 기하가 안 멈췄다'); process.exit(1); }

  const meta = await p.evaluate(() => {
    const cs = [...document.querySelectorAll('#relw .rw-c')];
    const g = document.getElementById('rwGrid').getBoundingClientRect();
    return {
      grid: [g.left, g.top, g.width, g.height].map(v => +v.toFixed(2)),
      slots: cs.map(c => {
        const r = c.getBoundingClientRect();
        return { id: c.dataset.rw, ch: c.querySelector('i').textContent,
                 rect: [r.left, r.top, r.width, r.height].map(v => +v.toFixed(2)) };
      }),
    };
  });
  /* 슬롯 규격 확인 — 151×151 ×10 이 아니면 팝인 중간이다 */
  const bad = meta.slots.filter(s => Math.abs(s.rect[2] - 151) > .6 || Math.abs(s.rect[3] - 151) > .6);
  if (meta.slots.length !== 10 || bad.length) { console.error('FAIL — 슬롯 규격 이상', meta.slots.length, bad); process.exit(1); }

  const clip = { x: 0, y: Math.floor(meta.grid[1]) - 8, width: 1080, height: Math.ceil(meta.grid[3]) + 16 };
  await p.screenshot({ path: path.join(OUT, `191-${RND}.png`), clip });
  fs.writeFileSync(path.join(OUT, `191-${RND}.json`), JSON.stringify({ H, clip, ...meta }, null, 1));
  console.log(`OK docs/review/191-${RND}.png (${clip.width}x${clip.height}) · 콘솔 에러 ${errs.length}`);
  await b.close();
})();
