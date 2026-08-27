/* 작업 258 진단 프로브 ④ — «프레임마다 그리는 크기가 달라지는가».
 * `drawSpriteTo(fit)` 는 **그 프레임의 아틀라스 rect** 를 슬롯에 contain 한다. 아이들 창의
 * 프레임끼리 원본 크기가 다르면 배율 k 가 프레임마다 달라져 그림이 커졌다 작아졌다 한다 —
 * 8fps 로 그러면 «깜빡거림» 이다. 배너(300×214)와 03 행 카드를 같이 잰다.
 *
 * 실행: node tools/probe258d.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const SEED = () => {
  S.guide.idx = 99; S.best = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  save();
};

const REPORT = () => {
  const out = [];
  const slot = (W, H, sp, fr) => {
    const k = sp ? Math.min((W - sp * 2) / fr[2], (H - sp * 2) / fr[3]) : 0;
    const dw = sp ? Math.max(1, Math.round(fr[2] * k)) : W;
    const dh = sp ? Math.max(1, Math.round(fr[3] * k)) : Math.max(1, H);
    return { dw, dh, dx: Math.round((W - dw) / 2), dy: Math.round((H - dh) / 2) };
  };
  const cv = document.getElementById('dgdTh');
  const row = document.querySelector('#dunList canvas.thcv');
  for (const id of Object.keys(DUN_UI)) {
    const u = DUN_UI[id];
    if (!u || !u.thk) continue;
    const A = ATLAS[u.thk];
    if (!A || !A.f) { out.push({ id, err: 'atlas 없음' }); continue; }
    const win = (typeof TH_IDLE !== 'undefined' && TH_IDLE[u.thk + '/' + u.thi]) || (A.a && A.a[u.thi]) || [u.thf];
    const rows = win.map(f => {
      const fr = A.f[f];
      if (!fr) return { f, err: '프레임 없음' };
      const bn = slot(cv.width, cv.height, 16, fr);
      const rw = row ? slot(row.width, row.height, 16, fr) : null;
      return { f, src: [fr[2], fr[3]], bn: [bn.dw, bn.dh, bn.dx, bn.dy], rw: rw ? [rw.dw, rw.dh, rw.dx, rw.dy] : null };
    });
    out.push({ id, thk: u.thk, thi: u.thi, win, rows });
  }
  return { cv: [cv.width, cv.height], row: row ? [row.width, row.height] : null, out };
};

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1400);
  await p.evaluate(SEED);
  await p.evaluate(() => { openDungeon(); });
  await p.waitForTimeout(700);
  const r = await p.evaluate(REPORT);
  console.log(`배너 캔버스 ${r.cv.join('×')} · 03 행 카드 캔버스 ${r.row ? r.row.join('×') : '없음'} · fit=16\n`);
  for (const e of r.out) {
    if (e.err) { console.log(`${e.id}: ${e.err}`); continue; }
    console.log(`■ ${e.id}  (${e.thk}/${e.thi})  아이들 창 [${e.win.join(', ')}]`);
    let bw = [], bh = [], bdy = [], rw = [], rh = [];
    for (const x of e.rows) {
      if (x.err) { console.log(`    ${x.f}: ${x.err}`); continue; }
      console.log(`    ${String(x.f).padEnd(12)} src ${String(x.src[0]).padStart(3)}×${String(x.src[1]).padStart(3)}` +
        `  배너 dw×dh ${String(x.bn[0]).padStart(3)}×${String(x.bn[1]).padStart(3)} @${x.bn[2]},${x.bn[3]}` +
        (x.rw ? `  행 ${String(x.rw[0]).padStart(3)}×${String(x.rw[1]).padStart(3)} @${x.rw[2]},${x.rw[3]}` : ''));
      bw.push(x.bn[0]); bh.push(x.bn[1]); bdy.push(x.bn[3]);
      if (x.rw) { rw.push(x.rw[0]); rh.push(x.rw[1]); }
    }
    const sp = a => a.length ? (Math.max(...a) - Math.min(...a)) : 0;
    const pct = a => a.length ? ((Math.max(...a) - Math.min(...a)) / Math.max(...a) * 100).toFixed(1) : '0';
    console.log(`    → 배너 프레임간 흔들림: 폭 ${sp(bw)}px(${pct(bw)}%) · 높이 ${sp(bh)}px(${pct(bh)}%) · 상단 y ${sp(bdy)}px` +
      (rw.length ? ` | 행 폭 ${sp(rw)}px(${pct(rw)}%) 높이 ${sp(rh)}px` : ''));
  }
  await ctx.close(); await b.close();
})();
