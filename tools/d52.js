/* d52.js — 두 레퍼런스 JPEG 의 블록 차분 지도.
   52(메뉴 열림) 와 02(기본 메인) 를 대조해 «메뉴가 차지하는 영역» 만 뽑아낸다.
   전투 콘텐츠(캐릭터·몹·데미지)는 원래 다르므로 큰 차분이 나오지만,
   고정 UI(HUD·탭바·사이드)는 Δ≈0 이라 «새로 생긴 UI» 가 선명하게 드러난다.
   사용: node tools/d52.js [A.jpg] [B.jpg] [step]  */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const A = process.argv[2] || 'docs/ref/52-메뉴-버튼-클릭시.jpg';
const B = process.argv[3] || 'docs/ref/02-기본-메인-화면.jpg';
const ST = parseInt(process.argv[4] || '20', 10);

(async () => {
  const a64 = fs.readFileSync(path.resolve(A)).toString('base64');
  const b64 = fs.readFileSync(path.resolve(B)).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<canvas id=x></canvas><canvas id=y></canvas>');
  const out = await page.evaluate(async ([a64, b64, ST]) => {
    const load = async (b64, id) => {
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + b64;
      await img.decode();
      const c = document.getElementById(id);
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return { W: c.width, H: c.height, D: ctx.getImageData(0, 0, c.width, c.height).data };
    };
    const a = await load(a64, 'x'), b = await load(b64, 'y');
    const W = Math.min(a.W, b.W), H = Math.min(a.H, b.H);
    const lines = [];
    for (let y = 0; y < H; y += ST) {
      let s = '';
      for (let x = 0; x < W; x += ST) {
        let sum = 0, n = 0;
        for (let yy = y; yy < Math.min(y + ST, H); yy++)
          for (let xx = x; xx < Math.min(x + ST, W); xx++) {
            const i = (yy * a.W + xx) * 4, j = (yy * b.W + xx) * 4;
            sum += Math.abs(a.D[i] - b.D[j]) + Math.abs(a.D[i + 1] - b.D[j + 1]) + Math.abs(a.D[i + 2] - b.D[j + 2]);
            n++;
          }
        const m = sum / n;                       // 0..765
        s += m < 8 ? '.' : m < 25 ? ':' : m < 60 ? '+' : m < 120 ? '*' : '#';
        }
      lines.push(String(y).padStart(4) + ' ' + s);
    }
    return { W, H, lines };
  }, [a64, b64, ST]);
  await browser.close();
  console.log(`DIFF ${A}  vs  ${B}   ${out.W}x${out.H} step${ST}`);
  console.log('  . <8   : <25   + <60   * <120   # >=120');
  for (const l of out.lines) console.log(l);
})();
