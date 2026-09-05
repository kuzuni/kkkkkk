/* 작업 258 진단 프로브 ⑤ — A/B. 「아이들 타이머를 멈추면 깜빡임이 사라지는가」 +
 * 「던전마다 얼마나 심한가」. 던전 7종 × (타이머 켬/끔) 으로 팝업 안 프레임간 diff 를 잰다.
 *
 * 실행: node tools/probe258e.js [--n 10] [--gap 60]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const N = arg('--n', 10), GAP = arg('--gap', 60);
const TMP = path.join(ROOT, 'docs', 'review', '258-frames');

const SEED = () => {
  S.guide.idx = 99; S.best = 99;
  DUNGEONS.forEach(d => { S.dun[d.id] = 5; S.dunTk[d.id] = 2; });
  save();
};

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1400);
  await p.evaluate(SEED);
  await p.evaluate(() => { openDungeon(); });
  await p.waitForTimeout(700);
  const ids = await p.evaluate(() => DUNGEONS.map(d => d.id));

  console.log(`팝업 안(.dgd-bn 배너 영역) 프레임간 diff — ${N}장 ${GAP}ms\n`);
  console.log('던전       타이머ON 평균px  최대px | 타이머OFF 평균px  최대px');
  for (const id of ids) {
    const row = [];
    for (const froz of [false, true]) {
      await p.evaluate(f => { window.__idleFrozen = f; }, froz);
      await p.evaluate(i => { closeDunDetail(); openDunDetail(DUNGEONS.find(d => d.id === i)); }, id);
      await p.waitForTimeout(1300);
      const bn = await p.evaluate(() => {
        const r = document.getElementById('dgdBn').getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      });
      const imgs = [];
      for (let i = 0; i < N; i++) {
        const f = path.join(TMP, 'e.png');
        await p.screenshot({ path: f });
        imgs.push(PNG.sync.read(fs.readFileSync(f)));
        await p.waitForTimeout(GAP);
      }
      const W = imgs[0].width;
      const ds = [];
      for (let k = 1; k < imgs.length; k++) {
        const A = imgs[k - 1].data, B = imgs[k].data;
        let n = 0;
        for (let y = bn.y; y < bn.y + bn.h; y++) for (let x = bn.x; x < bn.x + bn.w; x++) {
          const i = (y * W + x) * 4;
          if (Math.abs(A[i] - B[i]) > 8 || Math.abs(A[i + 1] - B[i + 1]) > 8 || Math.abs(A[i + 2] - B[i + 2]) > 8) n++;
        }
        ds.push(n);
      }
      row.push([Math.round(ds.reduce((a, c) => a + c, 0) / ds.length), Math.max(...ds)]);
    }
    console.log(`${id.padEnd(9)} ${String(row[0][0]).padStart(12)} ${String(row[0][1]).padStart(7)} | ` +
                `${String(row[1][0]).padStart(13)} ${String(row[1][1]).padStart(7)}`);
  }
  await ctx.close(); await b.close();
})();
