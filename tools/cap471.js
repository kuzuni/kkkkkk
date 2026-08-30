#!/usr/bin/env node
/* 채점 캡처 — 작업 471 비평 루프 (주인 지시: 비평가 2명 독립 · 둘 다 ≥9/10)
 *
 *   node tools/cap471.js [회차]
 *
 * 주인 보강대로 채점 축은 하나다 — «전 화면 레드닷이 기준 그림과 같은 코너 걸침인가 ·
 * 잘린 점 0 · 호스트별 일관성». 그러려면 **나란히 놓아야 한다**(411 이 남긴 교훈:
 * 따로 보면 셋 다 그럴듯하다). 그래서 자리마다 «호스트 + 닷» 만 잘라 한 장에 격자로 붙인다.
 *
 * 출력 — `docs/review/471-r<n>-대조.png` (한 장) · 좌표·라벨은 stdout 의 표.
 * ⚠ `docs/review/*.png` 는 .gitignore 로 막혀 있다(커밋하지 마라 — 증거는 review .md 의 수치다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review', '471-r' + R + '-대조.png');

/* 자리 = probe471 과 **같은 순서·같은 진입**(자매 자 드리프트 방지). 여기서는 «잘라 낼 상자» 만 더 준다. */
const STEPS = [
  ['HUD 탭바', async p => {}, '#tabbar .tab.alert .bdg', '.tab'],
  ['HUD 사이드', async p => {}, '.ibtn.on .bdg', '.ibtn'],
  ['▦ 메뉴 버튼', async p => {}, '#menub .bdg', '#menub'],
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* 화면을 차례로 열며 «호스트 상자 + 여백 46» 을 잘라 모은다. 진입은 verify299/probe471 과 같은 목록. */
  const shots = [];
  const grab = async (label, hostSel, note) => {
    const box = await page.evaluate((s) => {
      const h = document.querySelector(s);
      if (!h) return null;
      h.getAnimations({ subtree: true }).forEach(a => { try { a.pause(); a.currentTime = (a.effect.getTiming().duration || 0); } catch (_) {} });
      const r = h.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, hostSel);
    if (!box) { console.log('  (건너뜀) ' + label + ' — 상자 없음'); return; }
    const pad = 46;
    const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
                   width: Math.min(1080 - Math.max(0, box.x - pad), box.w + pad * 2),
                   height: Math.min(2280 - Math.max(0, box.y - pad), box.h + pad * 2) };
    const buf = await page.screenshot({ clip });
    shots.push({ label, note, b64: buf.toString('base64'), w: clip.width, h: clip.height });
    console.log('  ' + label.padEnd(28) + Math.round(box.w) + '×' + Math.round(box.h)
      + ' @ (' + Math.round(box.x) + ',' + Math.round(box.y) + ')' + (note ? '  ' + note : ''));
  };

  const ev = f => page.evaluate(f).catch(() => {});
  const wait = ms => page.waitForTimeout(ms);

  console.log('CAP471 — ' + R + '회차 대조 캡처\n');
  await ev(() => { document.querySelectorAll('#tabbar .tab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('01 탭바 «상점» 칸', '#tabbar .tab:last-child', '예외 — 프레임 변');
  await grab('02 사이드 아이콘', '.side .ibtn.on', '');
  await ev(() => { document.getElementById('menub').classList.add('alert'); });
  await wait(150);
  await grab('03 ▦ 메뉴 버튼', '#menub', '');

  await ev(async () => { openDungeon(); });
  await wait(500);
  await ev(() => { document.querySelectorAll('#dunw .stab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('04 03 던전 서브탭', '#dunw .stab', '');
  await grab('05 03 던전 카드', '#dunw .dnc', '');
  await ev(() => { if (typeof closeDungeon === 'function') closeDungeon(); });
  await wait(200);

  await ev(async () => { QUESTS.forEach(q => { S.quest[q.id].base = 0; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9; openQuest('rep'); });
  await wait(600);
  await grab('06 22 [모두 받기] ★기준', '#qAll', '주인이 «맞다» 고 지목한 모양');
  await grab('07 22 행 [보상 받기]', '.qs-b', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.att = { n: 3, date: '' }; openAttend(); });
  await wait(500);
  await grab('08 70 출석 «오늘 카드»', '#mbox [data-att]', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.daily.adBuy = {}; openShopPage(null, 'coin'); });
  await wait(600);
  await grab('09 13 광고 [받기] 버튼', '#shopList .cn-cd .bt[data-cnad]', '479 — 카드에서 버튼으로');
  await ev(() => { document.querySelectorAll('#shopCats .stab').forEach(t => t.classList.add('alert')); });
  await wait(200);
  await grab('10 10 상점 서브탭', '#shopCats .stab', '주인 스크린샷 ① «반달» 자리');
  await ev(async () => { openShopPage(null, 'summon'); });
  await wait(500);
  await grab('11 10 «10회 소환» 카드', '#shopList .shp-card', '예외 — 노드는 카드 자식');
  await ev(() => closeShopPage());
  await wait(200);

  await ev(async () => { S.bless.exp = { atk: 0, hp: 0, rate: 0 }; openBless(); });
  await wait(500);
  await grab('12 34 축복 «받기» 알약', '.bls-c .tm', '');
  await ev(() => closeBless());
  await wait(200);

  await ev(async () => { S.daily.spins = 1; openRoulette(); });
  await wait(500);
  await grab('13 29 [룰렛 돌리기]', '#rouBtn', '');
  await ev(() => closeModal());
  await wait(200);

  await ev(async () => { S.relic = 1e6; openRelw(); });
  await wait(500);
  await grab('14 89 유물 수반', '#rwBasin', '예외 — 상자 코너가 투명(림에 맞춤)');
  await ev(() => closeRelw());
  await wait(200);

  await ev(async () => { goTab('hero', true); heroSubGo('eq'); });
  await wait(600);
  await grab('15 06 장비 슬롯', '.eqsl', '');
  await ev(async () => { heroSubGo('sk'); });
  await wait(600);
  await grab('16 07 [일괄 강화] 버튼', '.sk-btn', '');
  await grab('17 07 스킬 카드', '#bSk .sk-card', '예외 — 코너가 .sk-eq 자리');

  await ev(async () => { openPass('stage'); });
  await wait(600);
  await grab('18 35 패스 보상 칸', '#psTk .ps-bx', '');
  await grab('19 35 패스 하단 탭', '#psBar .pt', '예외 — 프레임 변');
  await ev(() => closePass());

  /* 한 장으로 붙인다 — 나란히 안 놓으면 어긋남이 안 보인다(411 교훈) */
  const sheet = await page.evaluate(async (items) => {
    const imgs = await Promise.all(items.map(async it => {
      const im = new Image();
      await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + it.b64; });
      return { im, label: it.label, note: it.note };
    }));
    const COL = 4, CELL = 470, PADT = 54;
    const rows = Math.ceil(imgs.length / COL);
    const c = document.createElement('canvas');
    c.width = COL * CELL; c.height = rows * (CELL + PADT);
    const g = c.getContext('2d');
    g.fillStyle = '#101014'; g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((o, i) => {
      const cx = (i % COL) * CELL, cy = Math.floor(i / COL) * (CELL + PADT);
      g.fillStyle = '#EDEAE3'; g.font = 'bold 22px sans-serif'; g.textBaseline = 'top';
      g.fillText(o.label, cx + 12, cy + 8);
      if (o.note) { g.fillStyle = '#9AA0AA'; g.font = '18px sans-serif'; g.fillText(o.note, cx + 12, cy + 32); }
      const k = Math.min((CELL - 24) / o.im.width, CELL / o.im.height, 1.6);
      const w = o.im.width * k, h = o.im.height * k;
      g.drawImage(o.im, cx + (CELL - w) / 2, cy + PADT + (CELL - h) / 2, w, h);
    });
    return c.toDataURL('image/png');
  }, shots);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('\n대조 시트 저장 — ' + OUT + ' (' + shots.length + '자리)');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
