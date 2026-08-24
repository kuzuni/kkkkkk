/* 작업 27 검증 — [3]-(가) 기계적 작업용.
   [스킬 소환] 이 그 자리 소환이 아니라 «스킬 팝업 닫고 10 상점 소환 탭 열기» 인지,
   버튼 규격·메인 화면 좌표(작업 38)·다른 경로가 회귀 없는지 실측한다. */
const { chromium } = require('playwright');
const path = require('path');

const MAIN = ['#top', '#sideL', '#sideR', '#slots', '#stagearea', '#gamecanvas',
  '#tabbar', '#tuto', '#menub', '#facb'];

async function boot(file) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 5e12, dia: 500000, stage: 12, best: 12, tuto: 3,
      heroTab: 'sk', seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1, grow: 1 }
    }));
  });
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(900);
  return { browser, page, errs };
}

const RECT = `(s) => { const e = document.querySelector(s); if(!e) return null;
  const b = e.getBoundingClientRect();
  return { x:+b.x.toFixed(2), y:+b.y.toFixed(2), w:+b.width.toFixed(2), h:+b.height.toFixed(2) }; }`;

async function rects(page, list) {
  return page.evaluate(([ls, fn]) => {
    const r = eval(fn); const o = {};
    ls.forEach(s => o[s] = r(s));
    return o;
  }, [list, RECT]);
}

function diff(a, b, label, fails) {
  Object.keys(a).forEach(k => {
    const p = a[k], q = b[k];
    if (!p && !q) return;
    if (!p || !q) { fails.push(`${label} ${k}: 한쪽만 존재 (${JSON.stringify(p)} vs ${JSON.stringify(q)})`); return; }
    ['x', 'y', 'w', 'h'].forEach(f => {
      if (Math.abs(p[f] - q[f]) > 0.01) fails.push(`${label} ${k}.${f}: ${p[f]} → ${q[f]}`);
    });
  });
}

(async () => {
  const fails = [];
  const log = [];

  /* ---- 1. 수정 전(HEAD) 대조본: 버튼 규격·메인 좌표가 그대로인지 ---- */
  const A = await boot('.before27.tmp.html');
  await A.page.evaluate(() => { goTab('hero'); heroTab = 'sk'; S.heroTab = 'sk'; syncPanel(); renderUI(); });
  await A.page.waitForTimeout(400);
  const beforeBtn = await rects(A.page, ['.sk-btn.sk-b1', '.sk-btn.sk-b2', '.sk-tabs', '.sk-tot']);
  const beforeMain = await rects(A.page, MAIN);
  await A.browser.close();

  /* ---- 2. 수정 후 ---- */
  const { browser, page, errs } = await boot('index.html');
  const mainClosed = await rects(page, MAIN);

  await page.evaluate(() => { goTab('hero'); heroTab = 'sk'; S.heroTab = 'sk'; syncPanel(); renderUI(); });
  await page.waitForTimeout(400);

  const st1 = await page.evaluate(() => ({
    panelOpen, curTab, heroTab,
    bSkOn: document.getElementById('bSk').classList.contains('on'),
    panelDisp: getComputedStyle(document.getElementById('panel')).display,
    shopOn: document.getElementById('shopw').classList.contains('on'),
    gold: S.gold, dia: S.dia,
    ownSkills: SKILLS.filter(s => has(s.id)).length, summons: S.summons
  }));
  if (!st1.bSkOn || st1.panelDisp === 'none') fails.push('사전조건: 스킬 시트가 안 열렸다 ' + JSON.stringify(st1));
  log.push('시트 열림: ' + JSON.stringify(st1));

  const afterBtn = await rects(page, ['.sk-btn.sk-b1', '.sk-btn.sk-b2', '.sk-tabs', '.sk-tot']);
  const mainOpen = await rects(page, MAIN);
  diff(beforeBtn, afterBtn, '버튼규격(수정전→후)', fails);
  diff(beforeMain, mainOpen, '메인좌표(수정전→후,시트열림)', fails);
  diff(mainClosed, mainOpen, '메인좌표(닫힘→시트열림, 작업38)', fails);
  log.push('버튼 규격: ' + JSON.stringify(afterBtn['.sk-btn.sk-b1']) + ' / ' + JSON.stringify(afterBtn['.sk-btn.sk-b2']));

  /* ---- 3. [스킬 소환] 클릭 ---- */
  await page.click('.sk-btn.sk-b1');
  await page.waitForTimeout(500);

  const st2 = await page.evaluate(() => {
    const shopTab = document.querySelector('.tab[data-t="shop"]');
    const cats = [...document.querySelectorAll('#shopCats .shp-ct')].map(c => c.dataset.cat + (c.classList.contains('on') ? '*' : ''));
    return {
      panelOpen, panelDisp: getComputedStyle(document.getElementById('panel')).display,
      bSkOn: document.getElementById('bSk').classList.contains('on'),
      shopOn: document.getElementById('shopw').classList.contains('on'),
      shopCat, cats, scrollTop: document.getElementById('shopList').scrollTop,
      shopTabClose: shopTab.classList.contains('close'),
      shopTabW: +shopTab.getBoundingClientRect().width.toFixed(1),
      tabbarOpen: document.getElementById('tabbar').classList.contains('open'),
      /* 그 자리 소환이 일어나지 않았는지 */
      sumwOn: !!(document.getElementById('sumw') && document.getElementById('sumw').classList.contains('on')),
      modalOn: !!(document.getElementById('modal') && document.getElementById('modal').classList.contains('on')),
      gold: S.gold, dia: S.dia,
      ownSkills: SKILLS.filter(s => has(s.id)).length, summons: S.summons,
      /* 다른 페이지가 같이 열려 있지 않은지(배타) */
      openPages: ['shopw', 'dunw', 'relicw', 'rlw', 'trw', 'eqw'].filter(id => {
        const e = document.getElementById(id); return e && e.classList.contains('on');
      })
    };
  });
  log.push('클릭 후: ' + JSON.stringify(st2));

  if (st2.panelOpen !== false || st2.panelDisp !== 'none') fails.push('스킬 팝업이 안 닫혔다: ' + st2.panelDisp);
  if (st2.bSkOn) fails.push('#bSk 가 아직 on');
  if (!st2.shopOn) fails.push('#shopw 가 안 열렸다');
  if (st2.shopCat !== 'summon') fails.push('상점 카테고리가 summon 이 아니다: ' + st2.shopCat);
  if (!st2.cats.includes('summon*')) fails.push('소환 카테고리 탭이 활성이 아니다: ' + st2.cats);
  if (!st2.shopTabClose) fails.push('탭바 «상점» 칸이 ✕ 로 안 바뀜');
  if (Math.abs(st2.shopTabW - 296) > 2) fails.push('✕ 칸 폭 296 아님: ' + st2.shopTabW);
  if (st2.sumwOn || st2.modalOn) fails.push('그 자리 소환 연출이 떴다(sumw/modal)');
  /* 스킬 소환 비용 통화는 다이아다(doSummon → summonCost/payFor). 골드는 유휴 루프가 계속 굴려
     클릭과 무관하게 변하므로 소환 발생 판정에 쓰지 않는다 — 아래 무클릭 대조군으로 확인한다. */
  if (st2.dia !== st1.dia) fails.push(`다이아가 변했다(그 자리 소환 발생): ${st1.dia} → ${st2.dia}`);
  if (st2.ownSkills !== st1.ownSkills) fails.push(`보유 스킬 수가 변했다: ${st1.ownSkills} → ${st2.ownSkills}`);
  if (st2.summons !== st1.summons) fails.push(`소환 횟수가 늘었다: ${st1.summons} → ${st2.summons}`);
  const ctrl = await page.evaluate(() => new Promise(r => {
    const g0 = S.gold; setTimeout(() => r({ g0, g1: S.gold, dia: S.dia, summons: S.summons }), 500);
  }));
  log.push('무클릭 대조군(0.5s): ' + JSON.stringify(ctrl) + ' → 골드 드리프트 ' + (ctrl.g1 - ctrl.g0).toFixed(1));
  if (ctrl.dia !== st2.dia || ctrl.summons !== st2.summons) fails.push('대조군에서 다이아/소환수가 변했다');
  if (st2.openPages.length !== 1 || st2.openPages[0] !== 'shopw') fails.push('열린 페이지가 shopw 단독이 아니다: ' + st2.openPages);

  const mainShop = await rects(page, MAIN);
  diff(mainClosed, mainShop, '메인좌표(닫힘→상점열림, 작업38)', fails);

  /* ---- 4. 프레임 밖 요소 ---- */
  const over = await page.evaluate(() => {
    const a = document.getElementById('app').getBoundingClientRect();
    const bad = [];
    document.querySelectorAll('#app *').forEach(e => {
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
      if (b.left < a.left - 1 || b.right > a.right + 1 || b.top < a.top - 1 || b.bottom > a.bottom + 1) {
        const p = e.parentElement, pcs = p ? getComputedStyle(p) : null;
        if (pcs && (pcs.overflowY === 'auto' || pcs.overflowY === 'scroll' || pcs.overflow === 'auto' || pcs.overflow === 'hidden')) return;
        bad.push(e.id || e.className || e.tagName);
      }
    });
    return bad;
  });
  if (over.length) fails.push('프레임 밖 요소: ' + over.join(', '));

  /* ---- 5. 회귀 — 상점 소환 탭에서의 실제 소환(doSummon 경로)이 살아 있는지 ---- */
  const sum = await page.evaluate(() => {
    const g0 = S.dia, n0 = SKILLS.filter(s => has(s.id)).length;
    const btn = [...document.querySelectorAll('#shopList [data-shsum]')]
      .find(b => b.dataset.shsum === 'skill' && b.dataset.shn === '10' && !b.dataset.shfree);
    if (!btn) return { found: false };
    btn.click();
    return { found: true, diaBefore: g0, diaAfter: S.dia, ownBefore: n0, ownAfter: SKILLS.filter(s => has(s.id)).length };
  });
  log.push('상점 스킬 소환 경로: ' + JSON.stringify(sum));

  /* ---- 6. 회귀 — 시트 재진입 · 일괄 강화 · 서브탭 · 26 동료 소환 ---- */
  await page.evaluate(() => {
    ['sumw', 'upw', 'modal'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('on'); });
    closeShopPage(); goTab('hero'); heroTab = 'sk'; S.heroTab = 'sk'; syncPanel(); renderUI();
  });
  await page.waitForTimeout(300);
  const reopen = await page.evaluate(() => ({
    bSkOn: document.getElementById('bSk').classList.contains('on'),
    shopOn: document.getElementById('shopw').classList.contains('on'),
    hasSumBtn: !!document.querySelector('.sk-btn.sk-b1[data-sksum]'),
    hasUpBtn: !!document.querySelector('.sk-btn.sk-b2[data-skup]')
  }));
  if (!reopen.bSkOn || !reopen.hasSumBtn || !reopen.hasUpBtn) fails.push('시트 재진입 회귀: ' + JSON.stringify(reopen));
  log.push('시트 재진입: ' + JSON.stringify(reopen));

  await page.click('.sk-btn.sk-b2');
  await page.waitForTimeout(400);
  const up = await page.evaluate(() => ({
    upw: !!(document.getElementById('upw') && document.getElementById('upw').classList.contains('on')),
    modal: !!(document.getElementById('modal') && document.getElementById('modal').classList.contains('on')),
    shopOn: document.getElementById('shopw').classList.contains('on')
  }));
  if (up.shopOn) fails.push('[일괄 강화] 가 상점을 열었다(핸들러 오연결)');
  if (!up.upw && !up.modal) fails.push('[일괄 강화] 가 아무 반응 없음');
  log.push('일괄 강화: ' + JSON.stringify(up));

  await page.evaluate(() => {
    const w = document.getElementById('upw'); if (w) w.classList.remove('on');
    const m = document.getElementById('modal'); if (m) m.classList.remove('on');
    heroTab = 'pet'; S.heroTab = 'pet'; goTab('hero', true); syncPanel(); renderUI();
  });
  await page.waitForTimeout(400);
  await page.click('.sk-btn.sk-b1[data-ptsum]');
  await page.waitForTimeout(400);
  const pet = await page.evaluate(() => ({
    shopOn: document.getElementById('shopw').classList.contains('on'),
    shopCat, panelOpen
  }));
  if (!pet.shopOn || pet.shopCat !== 'summon' || pet.panelOpen) fails.push('26 동료 소환 회귀: ' + JSON.stringify(pet));
  log.push('26 동료 소환(회귀): ' + JSON.stringify(pet));

  await page.screenshot({ path: 'docs/review/27-r1.png' });
  await browser.close();

  console.log('--- 실측 ---');
  log.forEach(l => console.log('  ' + l));
  console.log('--- 콘솔 에러 ' + errs.length + ' ---');
  errs.forEach(e => console.log('  ' + e));
  console.log('--- 실패 ' + fails.length + ' ---');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (fails.length || errs.length) process.exit(1);
  console.log('ALL PASS');
})();
