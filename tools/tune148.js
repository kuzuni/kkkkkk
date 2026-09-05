/* 작업 148 — 가이드 미션 배너 L1 «[미션-n]» / L3 «(0/10)» 의 «글리프 융착» 을 푸는 margin 탐색기.
   실행: node tools/tune148.js "bl br il ir ils sl sr el er ul ur" ...
     bl/br   : 대괄호 `<b>` 좌/우 margin
     il/ir   : 한글 `<i>` 좌/우 margin      ils : `<i>` 안 letter-spacing(미↔션 사이)
     sl/sr   : 하이픈·슬래시 `<s>` 좌/우 margin
     el/er   : 숫자 `<em>` 좌/우 margin
     ul/ur   : 숫자 1 `<u>` 좌/우 margin
   인자가 없으면 현행값만 잰다. `CURRENT` 도 같은 뜻.

   판정: **런(=끊어진 잉크 덩어리) 개수가 글자 수와 같아야 한다.**
   ref(측정표 61 §글리프 열, 1080 기준 1:1): `[`714-723 · `미`727-750 · `션`755-778 ·
   `-`785-797 · 숫자… · `]`863-873 → 어간 4 · 5 · 7 · 6 · … · 4. */
const path = require('path');
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* 글자는 민트(#83FFE7)·주황(#FFC26A)이고 외곽선은 검정이다 → «유채 화소» 만 잉크로 센다.
   덕분에 검정 스트로크가 서로 붙어도 런이 안 붙는다 — 융착 판정이 «색 잉크» 기준이 된다. */
function cols(buf) {
  const img = PNG.sync.read(buf);
  const W = img.width, H = img.height;
  const c = new Array(W).fill(0);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4, R = img.data[i], G = img.data[i+1], B = img.data[i+2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (mx > 120 && (mx - mn > 40 || mx > 200)) c[x]++;
    }
  return c;
}
function runs(c, x0) {
  const out = []; let s = -1;
  for (let x = 0; x <= c.length; x++) {
    if (x < c.length && c[x] > 0) { if (s < 0) s = x; }
    else if (s >= 0) { out.push([s + x0, x - 1 + x0]); s = -1; }
  }
  return out;
}
const gaps = rs => rs.slice(1).map((r, i) => r[0] - rs[i][1] - 1);

const CSS = c => {
  const [bl, br, il, ir, ils, sl, sr, el, er, ul, ur] = c.split(/\s+/).map(Number);
  return `
    #tuto.todo .tbtn b,#tuto.todo .tpg b{margin:0 ${br}px 0 ${bl}px !important}
    #tuto.todo .tbtn i{margin:0 ${ir}px 0 ${il}px !important;letter-spacing:${ils}px !important}
    #tuto.todo .tbtn s,#tuto.todo .tpg s{margin:0 ${sr}px 0 ${sl}px !important}
    #tuto.todo .tbtn em,#tuto.todo .tpg em{margin:0 ${er}px 0 ${el}px !important}
    #tuto.todo .tbtn u,#tuto.todo .tpg u,#tuto.todo .tt u{margin:0 ${ur}px 0 ${ul}px !important}`;
};

(async () => {
  const cands = process.argv.slice(2);
  if (!cands.length) cands.push('CURRENT');
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    GUIDE[0].goal = 10;                    /* ref 와 같은 «(0/10)» 로 맞춘다 */
    uiDirty = true; renderUI(); drawTuto();
  });
  await p.waitForTimeout(250);

  for (const c of cands) {
    await p.evaluate(({ c, css }) => {
      let st = document.getElementById('t148');
      if (!st) { st = document.createElement('style'); st.id = 't148'; document.head.appendChild(st); }
      st.textContent = c === 'CURRENT' ? '' : css;
    }, { c, css: c === 'CURRENT' ? '' : CSS(c) });
    await p.waitForTimeout(140);
    const grab = async sel => {
      const r = await p.evaluate((sel) => {
        const el = document.querySelector(sel), b = el.getBoundingClientRect();
        return { x: Math.round(b.x) - 20, y: Math.round(b.y) - 8,
                 width: Math.round(b.width) + 40, height: Math.round(b.height) + 16 };
      }, sel);
      return [await p.screenshot({ clip: r }), r.x];
    };
    const [b1, x1] = await grab('#tuto .tbtn');
    const [b3, x3] = await grab('#tuto .tpg');
    const r1 = runs(cols(b1), x1), r3 = runs(cols(b3), x3);
    console.log(`\n[${c}]`);
    console.log('  L1 런 ' + r1.length + '/6 : ' + r1.map(r => `${r[0]}-${r[1]}(w${r[1]-r[0]+1})`).join(' · '));
    console.log('     어간 ' + gaps(r1).join(' , '));
    console.log('  L3 런 ' + r3.length + '/5 : ' + r3.map(r => `${r[0]}-${r[1]}(w${r[1]-r[0]+1})`).join(' · '));
    console.log('     어간 ' + gaps(r3).join(' , '));
  }
  await b.close();
})();
