/* 126 ③ 11회차 — `--sh-drop` 오프셋 보정기.
 *
 *   node tools/cal126sh.js
 *
 * 왜 필요한가 — index.html 안에 «`text-shadow:0 4px 0` 의 오프셋이 stroke 두께보다 작아
 * 통째로 stroke 안에 묻혔다» 는 앞 세션의 실측 메모가 있다. 즉 Blink 에서 text-shadow 는
 * **`-webkit-text-stroke` 를 포함하지 않고 글리프 채움만** 그림자로 뜬다. 그러면 잉크 아래로
 * 실제로 튀어나오는 양은 `offset − 바깥스트로크` 이지 `offset` 이 아니다.
 *
 * 추측하지 말고 잰다 — 후보 오프셋을 하나씩 걸고 «잉크 위/아래 검정» 을 m126sh 와 **같은 방법**으로
 * 재서, ref 실측(위 4 · 아래 6~7 · drop +3)에 맞는 값을 고른다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SEL = '.shp-card>.chd>i';
const CANDS = [0, 2, 3, 4, 5, 6, 6.5, 7, 8, 9, 10];  /* px @ fs51 */

const MEASURE = fs.readFileSync(path.join(__dirname, 'm126sh.js'), 'utf8')
  .match(/const MEASURE = `([\s\S]*?)`;/)[1];

async function main() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.click('.tab[data-t="shop"]', { force: true }).catch(() => {});
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await page.waitForTimeout(400);

  const P = { TH: 150, BLK: 90, RAD: 5, EXIT: 110, MAXD: 16, EDGE: 4 };
  console.log('\n126 ③ `--sh-drop` 보정 — 대상 ' + SEL + ' (fs 51 · 스트로크 6.63 = 바깥 3.31)');
  console.log('ref 실측(m126sh): 위 4 · 아래 6~7 · drop +3\n');
  console.log('오프셋px   위    아래   drop   (표본 위/아래)');

  for (const off of CANDS) {
    await page.evaluate(({ sel, off }) => {
      let st = document.getElementById('__cal126');
      if (!st) { st = document.createElement('style'); st.id = '__cal126'; document.head.appendChild(st); }
      st.textContent = off === 0 ? '' : `${sel}{text-shadow:0 ${off}px 0 #000}`;
    }, { sel: SEL, off });
    await page.waitForTimeout(180);

    const wins = await page.evaluate((sel) => {
      const out = [];
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom < 4 || r.top > innerHeight - 4) return;
        out.push({ t: (el.textContent || '').trim().slice(0, 8),
          win: [Math.floor(r.left - 16), Math.ceil(r.right + 16), Math.floor(r.top - 16), Math.ceil(r.bottom + 16)] });
      });
      return out;
    }, SEL);

    const shot = (await page.screenshot()).toString('base64');
    const res = await page.evaluate(async ({ shot, wins, P, SRC }) => {
      eval(SRC);
      const im = new Image(); im.src = 'data:image/png;base64,' + shot; await im.decode();
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      return wins.map((w) => measure(d, c.width, c.height, w.win[0], w.win[1], w.win[2], w.win[3], P));
    }, { shot, wins, P, SRC: MEASURE });

    const ok = res.filter((r) => r && r.core && r.top != null && r.bot != null);
    const avg = (f) => ok.length ? +(ok.reduce((a, r) => a + f(r), 0) / ok.length).toFixed(2) : null;
    console.log(`${String(off).padStart(7)}  ${String(avg((r) => r.top)).padStart(5)} ${String(avg((r) => r.bot)).padStart(6)} ` +
      `${String(avg((r) => r.drop)).padStart(6)}   ${ok.map((r) => r.nT + '/' + r.nB).join(' ')}`);
  }
  console.log('');
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
