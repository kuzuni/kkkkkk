/* 작업 148 — L1 «[미션-n]» 의 열별 잉크 화소 수를 그대로 찍어 융착 지점을 눈이 아니라 수로 본다.
   실행: node tools/dump148.js ["<b> <s> <i> <em> <u좌> <u우>"] */
const path = require('path');
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  const c = process.argv[2] || 'CURRENT';
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    GUIDE[0].goal = 10; uiDirty = true; renderUI(); drawTuto();
  });
  await p.evaluate((c) => {
    if (c === 'CURRENT') return;
    const [mb, ms, mi, me, ul, ur] = c.split(/\s+/).map(Number);
    const st = document.createElement('style');
    st.textContent = `
      #tuto.todo .tbtn b,#tuto.todo .tpg b{margin:0 ${mb}px !important}
      #tuto.todo .tbtn s,#tuto.todo .tpg s{margin:0 ${ms}px !important}
      #tuto.todo .tbtn i{margin:0 ${mi}px !important}
      #tuto.todo .tbtn em,#tuto.todo .tpg em{margin:0 ${me}px !important}
      #tuto.todo .tbtn u,#tuto.todo .tpg u,#tuto.todo .tt u{margin:0 ${ur}px 0 ${ul}px !important}`;
    document.head.appendChild(st);
  }, c);
  await p.waitForTimeout(200);

  const r = await p.evaluate(() => {
    const el = document.querySelector('#tuto .tbtn'), b = el.getBoundingClientRect();
    return { x: Math.round(b.x) - 14, y: Math.round(b.y) - 8,
             width: Math.round(b.width) + 28, height: Math.round(b.height) + 16 };
  });
  const buf = await p.screenshot({ clip: r });
  const img = PNG.sync.read(buf);
  const W = img.width, H = img.height;
  let line = '';
  for (let x = 0; x < W; x++) {
    let mint = 0, blk = 0;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4, R = img.data[i], G = img.data[i+1], B = img.data[i+2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (mx > 120 && (mx - mn > 40 || mx > 200)) mint++;
      else if (mx < 60) blk++;
    }
    line += `${x + r.x}:${mint}/${blk}  `;
    if ((x + 1) % 8 === 0) { console.log(line); line = ''; }
  }
  if (line) console.log(line);
  console.log('클립 x0=' + r.x + ' w=' + W);
  await b.close();
})();
