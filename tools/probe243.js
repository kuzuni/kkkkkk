/* 243 진단 — «잉크 중심 − 앵커» 를 **실제 drawFrame 으로 그려서** 잰다.
   ATLAS 표에서 산술로 내는 것과 달리, 그리기 코드(플립·배율·트림)를 그대로 통과한 값이다.
   실행: node tools/probe243.js [--all]
        --all 이면 애니의 모든 프레임을, 없으면 0프레임만 잰다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs'), http = require('http');

const ROOT = path.resolve(__dirname, '..');
const ALL = process.argv.includes('--all');
/* file:// 로 열면 스프라이트가 캔버스를 오염시켜 getImageData 가 SecurityError 다 — http 로 띄운다 */
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png', '.svg':'image/svg+xml',
               '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.json':'application/json', '.jpg':'image/jpeg',
               '.woff2':'font/woff2', '.ttf':'font/ttf', '.css':'text/css' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!p.startsWith(ROOT) || !fs.existsSync(p)){ res.writeHead(204); res.end(); return; }
  const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(r => srv.listen(0, r));
  const URL = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);

  const rows = await page.evaluate((all) => {
    const out = [];
    const W = cvs.width, H = cvs.height;
    const X = Math.round(W / 2), Y = Math.round(H * 0.72);
    for (const key of Object.keys(ATLAS)) {
      const A = ATLAS[key];
      if (!A || !A.image || !A.a) continue;
      for (const anim of Object.keys(A.a)) {
        const list = A.a[anim];
        const names = all ? list : [list[0]];
        for (const fn of names) {
          const fr = A.f[fn];
          if (!fr) continue;
          /* 화면 안에 들어오는 최대 정수 배율 */
          const sc = Math.max(1, Math.min(Math.floor((W * 0.8) / fr[6]), Math.floor((H * 0.6) / fr[7])));
          for (const flip of [false, true]) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, W, H);
            const ok = drawFrame(key, fn, X, Y, sc, flip, 1, null);
            let res = null;
            if (ok) {
              const d = ctx.getImageData(0, 0, W, H).data;
              let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
              for (let y = 0; y < H; y++) {
                const row = y * W * 4;
                for (let x = 0; x < W; x++) {
                  if (d[row + x * 4 + 3] > 8) {
                    if (x < x0) x0 = x; if (x > x1) x1 = x;
                    if (y < y0) y0 = y; if (y > y1) y1 = y;
                  }
                }
              }
              if (x1 >= x0) res = { x0, x1, y0, y1 };
            }
            ctx.restore();
            if (res) out.push({
              key, anim, fn, sc, flip,
              w: res.x1 - res.x0 + 1,
              dx: (res.x0 + res.x1) / 2 - X,
              foot: Y - res.y1
            });
          }
        }
      }
    }
    return out;
  }, ALL);

  console.log('atlas/anim/frame            배율 flip   잉크폭   Δx(잉크중심−앵커)  Δx/폭');
  let worst = 0, worstRow = null;
  for (const r of rows) {
    const rel = r.dx / r.w;
    if (Math.abs(rel) > Math.abs(worst)) { worst = rel; worstRow = r; }
    console.log(
      (r.key + '/' + r.fn).padEnd(28) + String(r.sc).padStart(3)
      + (r.flip ? '  flip' : '      ')
      + String(r.w).padStart(8) + r.dx.toFixed(1).padStart(12)
      + (rel >= 0 ? '   +' : '   ') + rel.toFixed(3));
  }
  console.log('\n표본 ' + rows.length + '개 · 최악 Δx/폭 = ' + worst.toFixed(3)
    + ' (' + (worstRow ? worstRow.key + '/' + worstRow.fn + (worstRow.flip ? ' flip' : '') : '-') + ')');
  await browser.close();
  srv.close();
})();
