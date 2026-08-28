/* 작업 293 진단 ③ — «앱 상태 전수» 에서 ▦ 배지가 실제로 보이는지 센다.
 *   실행: node tools/probe293c.js
 * mailLeft() > 0 을 유지한 채 상태를 하나씩 만들고, 그때마다
 *   ⓐ #menub.alert 여부 ⓑ .bdg computed display ⓒ 배지 bbox 의 빨강 화소 수
 * 를 잰다. «논리는 켜졌는데 화소 0» = 사용자에게는 «안 뜬다».
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;

(async () => {
  const browser = await launch(chromium);
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
        left: mailLeft(), cls: mb.className,
        mbDisp: getComputedStyle(mb).display,
        disp: getComputedStyle(bd).display,
        rect: [r.x, r.y, r.width, r.height],
        top: r.width ? (e => e ? (e.id || e.className || e.tagName) : 'none')(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) : '-',
      };
    });
    let red = -1;
    if (s.rect[2] > 0 && s.rect[0] >= 0 && s.rect[1] >= 0
        && s.rect[0] + s.rect[2] <= W && s.rect[1] + s.rect[3] <= H) {
      const buf = await page.screenshot({
        clip: { x: Math.floor(s.rect[0]), y: Math.floor(s.rect[1]),
                width: Math.ceil(s.rect[2]), height: Math.ceil(s.rect[3]) } });
      red = await page.evaluate(async b64 => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i+1] < 110 && d[i+2] < 130) n++;
        return n;
      }, buf.toString('base64'));
    }
    const bad = s.left > 0 && red === 0;
    console.log((bad ? ' ✗ ' : '   ') + label.padEnd(28)
      + ' left=' + s.left + ' cls="' + s.cls + '" #menub=' + s.mbDisp
      + ' .bdg=' + s.disp + ' 빨강=' + red + ' top=' + String(s.top).slice(0, 24));
  };

  const step = async (label, fn) => {
    try { await page.evaluate(fn); } catch (e) { console.log('   (' + label + ' 실행 실패: ' + e.message.slice(0, 60) + ')'); }
    await page.waitForTimeout(600);
    await look(label);
  };

  console.log('== 293 상태 전수 (mailLeft > 0 유지) ==');
  await look('기본 메인');
  await step('하단탭 영웅 열기', () => goTab('hero'));
  await step('하단탭 닫기', () => { const t = document.querySelector('#tabbar .tab[data-t="hero"]'); if (t) t.click(); });
  await step('하단탭 성장 열기', () => goTab('grow'));
  await step('하단탭 닫기2', () => { const t = document.querySelector('#tabbar .tab[data-t="grow"]'); if (t) t.click(); });
  await step('상점 페이지', () => openShopPage('sum'));
  await step('상점 닫기', () => closeShopPage());
  await step('던전 페이지', () => openDun());
  await step('던전 닫기', () => closeModalAll ? closeModalAll() : $('dunw').classList.remove('on'));
  await step('가방(53)', () => openBag());
  await step('가방 닫기', () => closeModal());
  await step('절전 진입', () => openSaver());
  await step('절전 해제', () => { if (typeof svExit === 'function') svExit(); else saverOn = false, document.getElementById('svw').classList.remove('on'); });
  await step('설정', () => openConf());
  await step('설정 닫기', () => closeModal());
  await step('보스전 강제', () => { S.stage = 10; killed = stageTotal(); uiDirty = true; renderUI(); });
  console.log('\npageerror ' + errs.length + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
})();
