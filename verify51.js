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
  /* 403 — 유물 시트는 `#rlw`(옛 이름)·`relicSub`(옛 전역) 둘 다 없어져 이 행이 «요소 없음» 으로
     **즉사**하고 있었다(2026-08-29 실측: 첫 화면비에서 예외로 프로세스가 죽어 표가 한 줄도 안 나온다).
     지금 이름은 `#relw` 이고 여는 곳은 탭이 아니라 `openRelw()` 다(26387) — 자리를 비우지 않고
     살아 있는 경로로 갈아 끼운다(333 처방). */
  { id: '유물#relw', key: 'box', hero: null, sel: '#relw', fn: 'openRelw' },
  { id: '던전#dunw', key: 'adv', hero: null, sel: '#dunw' },
  { id: '상점#shopw', key: 'shop', hero: null, sel: '#shopw' },
];

/* 메인 화면 회귀 대조 — 작업 38 규칙(패널 개폐가 메인 요소를 움직이면 안 된다) */
const MAIN = ['#top', '#sideL', '#sideR', '#slots', '#stagearea', '#tabbar', '#tuto'];

/* 403 — `closeRelicPage`/`closeRelicTab` 은 제품에서 사라진 이름이라 이 함수가 **첫 호출에서
   ReferenceError 로 즉사**했다(319 와 같은 «게이트 부패»). 278 처방대로 «즉사» 대신 «그 항만»
   빠지게 이름별로 감싼다 — 새 이름(`closeRelw`)까지 같이 부른다. */
function closeAll() {
  ['closeTrain', 'closeDungeon', 'closeShopPage', 'closeRelicPage', 'closeRelicTab', 'closeRelw']
    .forEach(n => { try { if (typeof window[n] === 'function') window[n](); } catch (e) {} });
  if (typeof panelOpen !== 'undefined' && panelOpen) { panelOpen = false; syncPanel(); }
}

/* 403 — 옛 방식(`heroTab` 을 미리 적고 goTab)은 **159 가 지운다**: `goTab('hero')` 가
   «여는 순간 서브탭을 장비로 리셋»(index.html 29777) 하므로 스킬·동료 시트가 한 번도 열린 적이
   없었다(표에서 `#panel` 이 전 화면비 0×0 인 이유가 이것이다). 연 «뒤에» `heroSubGo` 로 옮긴다. */
function openSheet(o) {
  goTab(o.key);
  if (o.hero && typeof heroSubGo === 'function') heroSubGo(o.hero);
  if (o.fn && typeof window[o.fn] === 'function') window[o.fn]();
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
      await page.waitForTimeout(800);   /* 403 — 150ms 는 fit()/ResizeObserver 가 끝나기 전이라 시트가 그 뒤 181px 움직였다(«고정 실패» 오탐) */
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
  /* 403·404 이관 — 이 절의 뜻이 바뀌었다.
     ① 종전 `kept`(= «스크롤 끝이 재렌더 뒤에도 유지된다»)는 **시트가 스크롤된다는 전제**에 서 있었다.
        403·404 가 그 전제를 뒤집었으므로(주인 지시 «스크롤 안 해도 보이게») 그 항을 «시트 자체가
        스크롤되지 않는다»(`noScroll`)로 갈아 끼운다. 자리를 비우지 않고 **더 센 쪽**으로 바꾼 것이다 —
        되돌리면(콘텐츠를 다시 상수로 박으면) 곧바로 빨개진다.
     ② `shown` 도 «스크롤 **끝에서** 보이나» 에서 «스크롤 **0 에서** 보이나»(`shown0`)로 올린다.
        351 이 두 번 «스크롤로 회수되니 감점 아님» 으로 넘긴 자리가 정확히 여기다.
     ⚑ **410 이 그 대기를 걷어냈다(2026-08-29).** 종전에는 closeAll 뒤 **250ms** 를 기다렸다 —
        60 쥬시의 닫힘 연출(0.12s)이 끝나기 전에 다시 열면 그 연출의 마무리가 `#panel` 의
        inline display 를 'none' 으로 되돌려 시트가 **0×0** 이 됐기 때문이다(등재 405 → 번호 개정 **410**).
        403·404 는 축이 달라 «기다려서 비켜 갔고», 410 이 그 제품 결함을 고쳤다(닫힘 연출은 이제
        inline display 를 안 쓴다). ⇒ **대기를 빼서 이 절이 410 의 회귀를 잡게 한다** — 410 이
        되돌아가면 `shown0`·`noScroll` 이 «0×0 인 시트» 를 재게 되어 여기가 곧바로 빨개진다. */
  console.log('\n[2차] 접힌 시트 — 헤더·서브탭 고정 / 본문 마지막 요소가 «스크롤 0 에서» 보임 (4:3, frameH 1600)');
  {
    const { browser, page, errs } = await boot(file, 1024, 768);
    for (const o of SCROLLED) {
      await page.evaluate(closeAll);
      await page.evaluate(openSheet, o);
      await page.waitForTimeout(800);   /* 403 — 150ms 는 fit()/ResizeObserver 가 끝나기 전이라 시트가 그 뒤 181px 움직였다(«고정 실패» 오탐) */
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
      /* 403·404 — 본문 마지막 요소가 **스크롤 0 에서** 통째로 뷰포트 안에 있는가(위·아래 둘 다) */
      const shown0 = !!(top.last && top.vp
        && top.last[1] <= top.vp[1] + 0.5 && top.last[0] >= top.vp[0] - 0.5);
      const noScroll = top.max === 0 && bot.max === 0;   /* 시트 자체는 스크롤되지 않는다 */
      if (!pinned || !shown0 || !noScroll) fails++;
      console.log('  ' + o.id.padEnd(12)
        + ' 스크롤 ' + String(top.at + '/' + top.max).padEnd(9)
        + ' 헤더 ' + JSON.stringify(bot.head)
        + ' 서브탭 ' + JSON.stringify(bot.foot)
        + ' 본문끝 ' + JSON.stringify(top.last) + ' 뷰포트 ' + JSON.stringify(top.vp)
        + (pinned ? ' · 고정 OK' : ' · 고정 실패')
        + (shown0 ? ' · 무스크롤 노출 OK' : ' · 무스크롤 노출 실패')
        + (noScroll ? ' · 시트 스크롤 0 OK' : ' · 시트 스크롤 0 실패'));
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
