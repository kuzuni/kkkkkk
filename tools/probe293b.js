/* 작업 293 진단 ② — «사용자가 실제로 누르는 순서» 로 재현한다(클릭 위주).
 *   실행: node tools/probe293b.js
 * ①~④ 화면비 4종에서 ▦ 배지의 «논리 상태» 와 «실제 화소» 를 같이 본다.
 *   논리: #menub.alert + getComputedStyle(.bdg).display
 *   화소: 배지 bbox 안의 빨강(#F22E52 근방) 화소 수 — 0 이면 «떠 있다고 하지만 안 보인다»
 * 그리고 ▦ 메뉴를 «열었을 때» 우편 칸에 알림 표시가 있는지도 같이 센다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SIZES = [[1080, 2280], [1080, 1920], [1080, 2520], [768, 1024]];

const redCount = async (page, rect) => page.evaluate(async r => {
  if (!r || !r.w) return -1;
  return -2;  /* 자리표시 — 실제 카운트는 아래 스크린샷 경로에서 한다 */
}, rect);

(async () => {
  const browser = await launch(chromium);
  for (const [W, H] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1200);

    const look = async label => {
      const s = await page.evaluate(() => {
        const mb = document.getElementById('menub');
        const bd = mb.querySelector('.bdg');
        const r = bd.getBoundingClientRect();
        return {
          left: typeof mailLeft === 'function' ? mailLeft() : -1,
          cls: mb.className,
          disp: getComputedStyle(bd).display,
          rect: [r.x, r.y, r.width, r.height],
          mbRect: (q => [q.x, q.y, q.width, q.height])(mb.getBoundingClientRect()),
        };
      });
      /* 화소 확인 — 배지 bbox 를 잘라 빨강 비율을 센다 */
      let red = -1;
      if (s.rect[2] > 0 && s.rect[0] >= 0 && s.rect[1] >= 0
          && s.rect[0] + s.rect[2] <= W && s.rect[1] + s.rect[3] <= H) {
        const buf = await page.screenshot({
          clip: { x: Math.floor(s.rect[0]), y: Math.floor(s.rect[1]),
                  width: Math.ceil(s.rect[2]), height: Math.ceil(s.rect[3]) },
        });
        red = await page.evaluate(async b64 => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + b64;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let n = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 130) n++;
          }
          return n;
        }, buf.toString('base64'));
      }
      console.log('   ' + label + ': mailLeft=' + s.left + ' cls="' + s.cls + '" disp=' + s.disp
        + ' rect=' + s.rect.map(v => Math.round(v)).join(',')
        + ' 빨강화소=' + red);
    };

    console.log('\n== ' + W + 'x' + H + ' ==');
    await look('로드 직후');
    /* ▦ 버튼을 «클릭» 으로 연다 */
    await page.evaluate(() => document.getElementById('menub').click());
    await page.waitForTimeout(500);
    const menu = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('#mnw .mn-b')];
      return {
        open: document.getElementById('mnw').classList.contains('on'),
        cells: cells.length,
        badges: cells.filter(c => c.querySelector('.bdg,s.dot,.updot')).length,
        mailCell: (c => c ? c.outerHTML.slice(0, 90) : 'none')(cells.find(c => c.dataset.mn === 'mail')),
      };
    });
    console.log('   메뉴 열림=' + menu.open + ' 칸 ' + menu.cells + '개 · 배지 달린 칸 ' + menu.badges + '개');
    console.log('   우편 칸: ' + menu.mailCell);
    await look('메뉴 열린 동안');
    /* 우편 칸 클릭 → 우편함 */
    await page.evaluate(() => document.querySelector('#mnw .mn-b[data-mn="mail"]').click());
    await page.waitForTimeout(700);
    await look('우편함 연 뒤');
    /* 우편함 닫기 */
    await page.evaluate(() => { closeModal(); });
    await page.waitForTimeout(600);
    await look('우편함 닫은 뒤');
    console.log('   pageerror ' + errs.length + (errs.length ? ': ' + errs[0] : ''));
    await ctx.close();
  }
  await browser.close();
})();
