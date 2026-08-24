/* 작업 51 검증 — [3]-(가) 기계적 작업용.
   9:16 보다 넓은 화면(frameH 가 1600 으로 clamp)에서 바닥 시트가 프레임 위로 잘리는지,
   고친 뒤 9:16 이상에서 회귀가 없는지 실측한다.
   사용: NODE_PATH=/opt/node22/lib/node_modules node verify51.js [index.html] */
const { chromium } = require('playwright');
const path = require('path');

/* 검증 화면비 — 넓은 쪽 3종 + 세로 폰 4종(회귀 대조군) */
const RATIOS = [
  { n: '16:9가로', w: 1600, h: 900 },
  { n: '4:3태블릿', w: 1024, h: 768 },
  { n: '3:4세로', w: 768, h: 1024 },
  { n: '9:16기준', w: 1080, h: 1920 },
  { n: '9:18', w: 1080, h: 2160 },
  { n: '9:19.5', w: 1080, h: 2340 },
  { n: '9:21', w: 1080, h: 2520 },
];

/* 시트 7종 — [이름, 여는 키, 시트 셀렉터] */
const SHEETS = [
  { id: '훈련#trw', key: 'grow', hero: null, sel: '.tr-sheet' },
  { id: '장비#eqw', key: 'hero', hero: 'eq', sel: '.eqp' },
  { id: '스킬#panel', key: 'hero', hero: 'sk', sel: '#panel' },
  { id: '동료#panel', key: 'hero', hero: 'pet', sel: '#panel' },
  { id: '유물#rlw', key: 'box', hero: null, sel: '#rlw', relic: 'rel' },
  { id: '던전#dunw', key: 'adv', hero: null, sel: '#dunw' },
  { id: '상점#shopw', key: 'shop', hero: null, sel: '#shopw' },
];

/* 메인 화면 회귀 대조 — 작업 38 규칙(패널 개폐가 메인 요소를 움직이면 안 된다) */
const MAIN = ['#top', '#sideL', '#sideR', '#slots', '#stagearea', '#tabbar', '#tuto'];

function closeAll() {
  closeTrain(); closeDungeon(); closeShopPage(); closeRelicPage(); closeRelicTab();
  if (panelOpen) { panelOpen = false; syncPanel(); }
}

function openSheet(o) {
  if (o.hero) { heroTab = o.hero; S.heroTab = o.hero; }
  if (o.relic) relicSub = o.relic;
  goTab(o.key);
}

/* 프레임(#app) 로컬 좌표로 환산한 시트 사각형 + 내부 스크롤 상태 */
function probe(sel) {
  const app = document.getElementById('app'), e = document.querySelector(sel);
  const ar = app.getBoundingClientRect(), sc = ar.width / 1080 || 1;
  const frameH = +(ar.height / sc).toFixed(1);
  if (!e) return { missing: true, frameH };
  const b = e.getBoundingClientRect();
  /* 시트 안에서 실제로 스크롤되는 자식이 있는지 */
  let scroll = 0;
  e.querySelectorAll('*').forEach(x => {
    if (x.scrollHeight - x.clientHeight > 2 && x.clientHeight > 0) {
      const cs = getComputedStyle(x);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') scroll++;
    }
  });
  const cs = getComputedStyle(e);
  if (e.scrollHeight - e.clientHeight > 2 && (cs.overflowY === 'auto' || cs.overflowY === 'scroll')) scroll++;
  return {
    top: +((b.top - ar.top) / sc).toFixed(1),
    bottom: +((b.bottom - ar.top) / sc).toFixed(1),
    h: +(b.height / sc).toFixed(1),
    frameH, scroll
  };
}

/* 프레임 밖(위/아래)으로 «실제로 보이는 채» 나간 요소 수.
   스크롤 컨테이너 밖으로 나간 자식은 조상이 클립하므로 세면 안 된다 —
   조상의 overflow(hidden/auto/scroll) 사각형으로 먼저 잘라내고 남은 것만 센다. */
function outside(sel) {
  const app = document.getElementById('app'), root = document.querySelector(sel);
  if (!root) return -1;
  const ar = app.getBoundingClientRect();
  let n = 0;
  root.querySelectorAll('*').forEach(x => {
    const cs = getComputedStyle(x);
    let b = x.getBoundingClientRect();
    if (!b.width || !b.height || cs.visibility === 'hidden' || cs.opacity === '0') return;
    let t = b.top, bo = b.bottom;
    for (let p = x.parentElement; p; p = p.parentElement) {
      const pc = getComputedStyle(p);
      if (pc.overflowY !== 'visible' || pc.overflowX !== 'visible') {
        const pb = p.getBoundingClientRect();
        t = Math.max(t, pb.top); bo = Math.min(bo, pb.bottom);
      }
      if (p === document.documentElement) break;
    }
    if (bo - t <= 0.5) return;                       /* 완전히 클립됨 = 안 보임 */
    if (t < ar.top - 1 || bo > ar.bottom + 1) n++;
  });
  return n;
}

function rects(list) {
  const app = document.getElementById('app');
  const ar = app.getBoundingClientRect(), sc = ar.width / 1080 || 1;
  const o = {};
  list.forEach(s => {
    const e = document.querySelector(s);
    o[s] = e ? [((e.getBoundingClientRect().x - ar.x) / sc).toFixed(2),
                ((e.getBoundingClientRect().y - ar.y) / sc).toFixed(2),
                (e.getBoundingClientRect().width / sc).toFixed(2),
                (e.getBoundingClientRect().height / sc).toFixed(2)].join(',') : null;
  });
  return o;
}

async function boot(file, w, h) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 5e12, dia: 500000, stage: 12, best: 12, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1, grow: 1 }
    }));
  });
  await page.goto('file://' + path.resolve(file));
  await page.waitForTimeout(700);
  return { browser, page, errs };
}

(async () => {
  const file = process.argv[2] || 'index.html';
  const rows = [];
  let fails = 0; const allErrs = [];
  for (const r of RATIOS) {
    const { browser, page, errs } = await boot(file, r.w, r.h);
    const base = await page.evaluate(rects, MAIN);      /* 패널 닫힘 기준 메인 좌표 */
    for (const s of SHEETS) {
      await page.evaluate(closeAll);
      await page.evaluate(openSheet, s);
      await page.waitForTimeout(150);
      const m = await page.evaluate(probe, s.sel);
      const out = await page.evaluate(outside, s.sel);
      const now = await page.evaluate(rects, MAIN);
      await page.evaluate(closeAll);
      const moved = MAIN.filter(k => base[k] !== now[k]);
      if (m.missing) { rows.push({ r: r.n, s: s.id, missing: true }); fails++; continue; }
      const limit = m.frameH - 104 - 180;
      const cut = m.top < -0.5 ? +(-m.top).toFixed(1) : 0;
      const over = m.h > limit + 0.5 ? +(m.h - limit).toFixed(1) : 0;
      const bad = cut > 0 || over > 0 || out > 0 || moved.length > 0;
      if (bad) fails++;
      rows.push({ r: r.n, s: s.id, frameH: m.frameH, top: m.top, h: m.h, limit,
        cut, over, out, scroll: m.scroll, moved: moved.length, bad });
    }
    allErrs.push(...errs.map(e => r.n + ': ' + e));
    await browser.close();
  }
  /* 2차 — 접힌 시트에서 «끝까지 스크롤» 했을 때
     ① 헤더·서브탭 바가 안 움직이고 ② 본문 마지막 요소가 뷰포트 안에 들어오는지 */
  const SCROLLED = [
    { id: '장비#eqw', key: 'hero', hero: 'eq', sel: '.eqp',
      head: '.eqp-hd', foot: '.eqtb', last: '.eqc-fr' },
    /* ⚠ `.sk-head` 는 #bSk·#bPet 양쪽에 있다. 스코프를 안 주면 document.querySelector 가
       문서 순서상 앞선 «숨은» #bSk 쪽을 잡아 좌표가 전부 0 으로 나온다. */
    { id: '스킬#panel', key: 'hero', hero: 'sk', sel: '#bSk',
      head: '#bSk .sk-head', foot: '#bSk .sk-tabs', last: '#bSk .sk-b2' },
    { id: '동료#panel', key: 'hero', hero: 'pet', sel: '#bPet',
      head: '#bPet .sk-head', foot: '#bPet .sk-tabs', last: '#bPet .sk-b2' },
  ];
  function scrollProbe(o) {
    const app = document.getElementById('app');
    const ar = app.getBoundingClientRect(), sc = ar.width / 1080 || 1;
    const y = s => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect();
      return [+((b.top - ar.top) / sc).toFixed(1), +((b.bottom - ar.top) / sc).toFixed(1)]; };
    const v = document.querySelector(o.sel + ' .shsc');
    return { head: y(o.head), foot: y(o.foot), last: y(o.last),
      vp: v ? y(o.sel + ' .shsc') : null,
      max: v ? v.scrollHeight - v.clientHeight : -1, at: v ? v.scrollTop : -1 };
  }
  console.log('\n[2차] 접힌 시트 끝까지 스크롤 — 헤더·서브탭 고정 / 본문 마지막 요소 노출 (4:3, frameH 1600)');
  {
    const { browser, page, errs } = await boot(file, 1024, 768);
    for (const o of SCROLLED) {
      await page.evaluate(closeAll);
      await page.evaluate(openSheet, o);
      await page.waitForTimeout(150);
      const top = await page.evaluate(scrollProbe, o);
      await page.evaluate(s => { const v = document.querySelector(s + ' .shsc');
        if (v) v.scrollTop = v.scrollHeight; }, o.sel);
      /* 재렌더(renderUI)가 스크롤을 되돌리지 않는지까지 보려고 한 박자 기다린다 */
      await page.waitForTimeout(700);
      const bot = await page.evaluate(scrollProbe, o);
      await page.evaluate(closeAll);
      const pinned = JSON.stringify(top.head) === JSON.stringify(bot.head)
        && JSON.stringify(top.foot) === JSON.stringify(bot.foot);
      /* 본문 마지막 요소의 «아래 끝» 이 뷰포트 안으로 들어왔는가
         (요소 자체가 뷰포트보다 길 수 있으므로 위 끝은 보지 않는다) */
      const shown = !!(bot.last && bot.vp
        && bot.last[1] <= bot.vp[1] + 0.5 && bot.last[1] > bot.vp[0]);
      const kept = bot.max > 0 && Math.abs(bot.at - bot.max) <= 1;   /* 재렌더 후에도 유지 */
      if (!pinned || !shown || !kept) fails++;
      console.log('  ' + o.id.padEnd(12)
        + ' 스크롤 ' + String(bot.at + '/' + bot.max).padEnd(9)
        + ' 헤더 ' + JSON.stringify(bot.head)
        + ' 서브탭 ' + JSON.stringify(bot.foot)
        + ' 본문끝 ' + JSON.stringify(bot.last) + ' 뷰포트 ' + JSON.stringify(bot.vp)
        + (pinned ? ' · 고정 OK' : ' · 고정 실패')
        + (shown ? ' · 노출 OK' : ' · 노출 실패')
        + (kept ? ' · 유지 OK' : ' · 유지 실패'));
    }
    allErrs.push(...errs.map(e => '스크롤: ' + e));
    await browser.close();
  }

  const W = [10, 12, 7, 8, 7, 7, 6, 6, 5, 5, 5];
  const pad = (v, i) => String(v).padEnd(W[i] || 6);
  console.log(['화면비', '시트', 'frameH', '시트top', '높이', '상한', '잘림', '초과', '밖', '스크', '이동']
    .map((h, i) => pad(h, i)).join(' '));
  console.log('-'.repeat(92));
  for (const x of rows) {
    if (x.missing) { console.log(pad(x.r, 0) + ' ' + pad(x.s, 1) + ' 요소 없음  ← 실패'); continue; }
    console.log([x.r, x.s, x.frameH, x.top, x.h, x.limit, x.cut, x.over, x.out, x.scroll, x.moved]
      .map(pad).join(' ') + (x.bad ? '  ← 실패' : ''));
  }
  console.log('\n실패 ' + fails + '건 / 콘솔 에러 ' + allErrs.length + '건');
  allErrs.slice(0, 12).forEach(e => console.log('  ' + e));
  process.exit(fails || allErrs.length ? 1 : 0);
})();
