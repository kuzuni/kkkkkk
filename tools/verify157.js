#!/usr/bin/env node
/* 157 — 34 축복 프로모 행 «자동으로 모든 축복 받기» + [이동] 기하 프로브.
 *   node tools/verify157.js
 * 지시서 [3]-(가) 기계적 검증용 자(尺): 문구가 길어졌으므로 «잉크가 상자 밖으로 나가지 않는가»
 * (= 잘림 0건)와 «버튼·일러스트와 겹치지 않는가» 만 실측한다. 레퍼런스 대조가 아니다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof openBless === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => openBless());
  await page.waitForTimeout(400);

  const r = await page.evaluate(() => {
    const strip = document.querySelector('.bls-promo');
    const tx = document.querySelector('.bls-promo .tx');
    const ic = document.querySelector('.bls-promo .ic');
    const gb = document.getElementById('blsAll');
    const rc = e => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), r: +(b.x + b.width).toFixed(2) }; };
    /* 실제 글자 «잉크» 폭은 Range 로 잰다 — 상자(470)가 아니라 글리프 advance 합이다.
       ⚠ `scrollWidth <= clientWidth` 는 **줄바꿈을 못 잡는다**(접히면 넘치지 않으니 항상 같다).
       줄 수는 `getClientRects()` 로만 알 수 있다 — 이 한 줄이 157 의 진짜 게이트다. */
    const rg = document.createRange(); rg.selectNodeContents(tx);
    const ink = rg.getBoundingClientRect();
    const lines = [...rg.getClientRects()].map(b => ({ y: +b.y.toFixed(1), w: +b.width.toFixed(1) }));
    return {
      strip: rc(strip), tx: rc(tx), ic: rc(ic), gb: rc(gb),
      ink: { x: +ink.x.toFixed(2), w: +ink.width.toFixed(2), r: +(ink.x + ink.width).toFixed(2), h: +ink.height.toFixed(2) },
      lines,
      txt: tx.textContent, gbTxt: gb.textContent,
      off: gb.classList.contains('off'),
      scrollW: tx.scrollWidth, clientW: tx.clientWidth,
    };
  });

  const fail = [];
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail.push(m); };

  console.log(JSON.stringify(r, null, 1));
  console.log('---');
  ok(r.txt === '자동으로 모든 축복 받기', '[A] 헤드라인 문구 = «자동으로 모든 축복 받기» (실제 «' + r.txt + '»)');
  ok(r.gbTxt === '이동', '[B] 버튼 라벨 = «이동» (실제 «' + r.gbTxt + '»)');
  ok(!r.off, '[C] 이동 버튼은 항상 활성(.off 없음)');
  /* [D] 줄바꿈 0 — 157 이 실제로 깨졌던 지점이다(두 줄째가 [이동] 버튼 위로 내려앉았다) */
  ok(r.lines.length === 1, '[D] 헤드라인 1줄 — getClientRects ' + r.lines.length + '개 ' + JSON.stringify(r.lines));
  /* [D2] 보이는 잉크 폭은 13회차가 쓰던 «상자 470»(= 프레임 x489..959) 안에 들어와야 한다.
     상자 자체는 636 으로 넓혀 두었으므로(우측 정렬을 살리려고) 상자와 비교하면 의미가 없다. */
  ok(r.ink.w <= 470, '[D2] 잉크 advance ' + r.ink.w + ' ≤ 470 (13회차 상자 폭)');
  ok(r.ink.x - 6 >= r.ic.r, '[E] 헤드라인 좌끝(외곽선 6 포함) ' + (r.ink.x - 6).toFixed(2) + ' ≥ 일러스트 우끝 ' + r.ic.r + ' (겹침 없음)');
  /* [F] 13회차가 확정한 우측 정렬 «우끝 959~961» 이 157 로 흔들리지 않았는지 */
  ok(Math.abs(r.ink.r - 959) <= 2, '[F] 헤드라인 우끝 ' + r.ink.r + ' ≈ 959 (13회차 우측 정렬 불변)');
  /* 세로 겹침은 «상자» 가 아니라 «실제 잉크 하단» 으로 본다 — 한 줄이면 상자 안에 들어온다 */
  ok(r.lines.length === 1 && r.lines[0].y + r.ink.h <= r.gb.y,
     '[G] 헤드라인 잉크 하단 ' + (r.lines.length ? (r.lines[0].y + r.ink.h).toFixed(2) : '?') + ' ≤ 버튼 상단 ' + r.gb.y);

  /* [H] 이동 동작 — 축복 팝업이 닫히고 상점이 이용권 탭으로 열린다 */
  await page.click('#blsAll');
  await page.waitForTimeout(500);
  const nav = await page.evaluate(() => ({
    bls: document.getElementById('blsw').classList.contains('on'),
    shop: document.getElementById('shopw').classList.contains('on'),
    cat: typeof shopCat !== 'undefined' ? shopCat : null,
    tabOn: (document.querySelector('#shopCats .on') || {}).dataset ? document.querySelector('#shopCats .on').dataset.cat : null,
    pass: !!document.querySelector('#shopList.pass'),
  }));
  console.log(JSON.stringify(nav));
  ok(!nav.bls, '[H1] 클릭 후 축복 팝업 닫힘');
  ok(nav.shop, '[H2] 클릭 후 상점 열림');
  ok(nav.cat === 'pass', '[H3] shopCat = pass (실제 ' + nav.cat + ')');
  ok(nav.pass, '[H4] 리스트가 이용권 탭 렌더(.pass)');

  /* [I] 일괄 활성화가 사라졌는지 — 이동 버튼이 축복을 켜면 안 된다 */
  const before = await page.evaluate(() => BLESS.map(x => blessOn(x.k) ? 1 : 0).join(''));
  ok(before === '000', '[I] 이동 버튼은 축복을 활성화하지 않는다 (상태 ' + before + ')');

  ok(errs.length === 0, '[J] 콘솔 에러 0건' + (errs.length ? ' — ' + errs.join(' | ') : ''));

  console.log('---');
  console.log(fail.length ? 'VERIFY157 FAIL ' + fail.length : 'VERIFY157 PASS');
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
