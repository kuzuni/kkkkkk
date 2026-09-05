#!/usr/bin/env node
/* 작업 95 검증 게이트 — PC 마우스 드래그 스크롤 (전역 1개 핸들러)
 *
 *   node tools/verify95.js
 *
 * 배경(PROGRESS 95): 폰에서는 드래그로 스크롤이 되는데 PC 에서는 «안 되는 곳이 많다».
 * 브라우저는 터치 드래그만 네이티브 스크롤로 처리하고 마우스 드래그는 스크롤이 아니다.
 * 수정은 화면별 땜질이 아니라 #app 위임 1쌍(index.html «95» 절)이라, 검증도
 * «화면을 열고 진짜 마우스로 끌어서 scrollTop 이 움직였는가» 를 화면마다 실측한다.
 *
 * ⚠ 화면마다 페이지를 새로 연다. 한 페이지에서 팝업을 갈아 끼우면 앞 화면의 렌더 상태가
 *   남아 격자가 한 프레임 0×0 이 되는 등 «작업과 무관한» 흔들림이 섞인다(1회차 실측).
 *
 * 검사 항목
 *   [A] 드래그 스크롤 — 스크롤 가능한 화면 전부에서 마우스 down→move(−400px)→up 후
 *       scrollTop 이 min(300, 최대스크롤) 이상. 뗀 뒤 0.6초 값도 같이 기록한다
 *       (재렌더로 0 으로 되돌아가는 화면이 있는데 그건 작업 107 소관이라 95 통과를 막지 않는다)
 *   [B] 클릭 억제 — 드래그(≥8px)한 제스처는 click 이 발화하지 않는다(74 합성기 포함)
 *   [B2] 같은 규칙을 **느린 제스처**로도 (562) — 떼기 전 3.2초 머문 드래그도 click 0건.
 *        [B] 하나만 두면 판정을 기계 속도가 정한다(74 삼키기 창이 down 기준 3초다)
 *   [C] 탭 회귀 — 5px 만 움직인 제스처는 click 이 정상 발화한다(74 탭 유실 수정 유지)
 *   [D] 휠 — mouse.wheel 로 scrollTop 이 증가한다(막는 리스너 없음)
 *   [E] 관성 — 빠른 드래그 뒤 손을 떼도 scrollTop 이 더 흐른다
 *   [F] 터치 회귀 — 터치 드래그는 네이티브 스크롤만 (ds-drag 안 붙음 = 관성 이중 적용 없음)
 *   [G] 레이아웃 중립 — 스크롤바 거터(offsetWidth−clientWidth)가 0 유지 · #dsbar 는 오버레이
 *   [H] overscroll-behavior:contain 이 스크롤 컨테이너 전부에 걸려 있다
 *   [I] 콘솔 에러 / pageerror 0건
 * 통과: 실패 0건
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
/* 305 — 실패 항목을 «절 이름» 과 함께 들고 있다가 **표 뒤에** 다시 찍는다.
   왜: 실패는 원래도 `  ✗ …` 로 찍혔지만, [A] 20줄 + 표 20줄에 밀려 `tail` 로 보면
   마지막 줄(`VERIFY95 FAIL — n건`)만 남는다 — 292 가 «무엇이 실패했는지 알 수가 없다»
   고 적은 것이 이 자리다(226·236 의 «게이트가 자기 실패를 말하게 하라»). */
let sec = '?';
const section = (s) => { sec = s; console.log(s); };
const fails = [];
const fail = (m) => { fails.push({ sec, m }); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);


/* [화면, 여는 식(전역 open…/gmHero), 스크롤 컨테이너 셀렉터, 프레임 높이] */
const SCREENS = [
  ['04 스킬 카드 격자', `gmHero('sk')`,                  '#panel .sk-gp,#panel .shsc', 2280],
  ['06 장비 시트',      `gmHero('eq')`,                  '#eqw .shsc',                 2280],
  ['06 장비 시트 9:16', `gmHero('eq')`,                  '#eqw .shsc',                 1920],
  ['50 코스튬 격자',    `gmHero('cos')`,                 '#bCos .sk-gp',               2280],
  ['26 동료 격자',      `gmHero('pet')`,                 '#panel .sk-gp,#panel .shsc', 2280],
  ['05 무기 카드 격자', `openWeapon('sword','weapon')`,  '.wm-grid',                   2280],
  ['10 상점(소환)',     `openShopPage()`,                '.shp-list',                  2280],
  ['13 상점(재화)',     `openShopPage('coin')`,          '.shp-list',                  2280],
  ['03 던전 리스트',    `openDungeon()`,                 '.dns-list',                  2280],
  ['21 도감',           `openColl21()`,                  '.cl-body',                   2280],
  ['22 퀘스트',         `openQuest()`,                   '.qs-pn',                     2280],
  ['69 우편함',         `openMail()`,                    '.ml-pn',                     2280],
  /* 53 은 «가벼운 시드» — 스킬을 보유시키면 renderBag 이 터진다(SKILLS 의 중복 키 `n` 버그,
     PROGRESS 109 로 신설). 95 와 무관한 크래시라 여기서는 피해 가고 «스크롤 컨테이너 없음» 만 본다. */
  ['53 가방',           `openBag()`,                     '.bg53-panel,.bg53-grid',     2280, 'light'],
  ['20 스펙',           `openSpec()`,                    '.spc-list',                  2280],
  ['54 랭킹',           `openRank()`,                    '.rk-list',                   2280],
  ['35 패스',           `openPass()`,                    '.ps-list',                   2280],
  ['19 프로필',         `openProfile()`,                 '.pf-grid',                   2280],
  ['34 축복',           `openBless()`,                   '#blsw',                      2280],
];

/* 스크롤 컨테이너 CSS 셀렉터 — [G]·[H] 용 (index.html «95» CSS 블록과 같은 목록) */
const CONTAINERS = ['.body', '.shsc', '.mbody', '.qs-pn', '.ml-pn', '.dns-list', '.shp-list',
  '.wm-body', '.wm-grid', '.prb-list', '.cl-body', '.pf-grid', '.spc-list', '.sk-gp',
  '.sm-grid', '.ps-list', '.rk-list', '#blsw'];

/* 격자가 실제로 넘치도록 보유 목록을 채운다. ⚠ S.stage/S.best 는 건드리지 않는다 —
   스테이지를 점프시키면 전투 루프가 «e.born of undefined» 로 터진다(95 와 무관한 기존 레이스). */
const SEED = (light) => {
  S.gold = 1e15; S.dia = 1e9; S.relic = 1e6;
  if (!light) {
    for (const s of SKILLS) S.own[s.id] = { n: 50, l: 5 };
    for (const p of PETS) S.own[p.id] = { n: 50, l: 5 };
    for (const e of EQUIPS) S.own[e.id] = { n: 50, l: 5 };
  }
  window.__clk = 0;
  document.addEventListener('click', () => { window.__clk++; }, true);
  uiDirty = true; renderUI();
};

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const errs = [];

  /* 화면 1개 = 페이지 1개. 앞 화면의 렌더 상태가 다음 화면에 섞이지 않게 매번 새로 연다. */
  /* ⚠ 기본은 hasTouch:false 다 — 터치를 켜면 크로뮴의 주 포인터가 coarse 가 되어
     `(pointer:fine)` 로 게이트한 스크롤 인디케이터(#dsbar)가 «PC 인데도» 안 뜬다. */
  const fresh = async (h = 2280, touch = false, light = false) => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1, hasTouch: touch });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
    await page.waitForTimeout(1000);
    await page.evaluate(SEED, light);
    await page.waitForTimeout(500);
    return { ctx, page };
  };

  /* 화면을 열고 «지금 살아 있는» 컨테이너를 셀렉터로 다시 찾는 리더(window.__top)를 심는다.
     ⚠ 노드를 쥐고 재면 재렌더로 갈린 옛(detached) 노드의 0 을 읽는다 — 실제로 그렇게 오판했다. */
  const open = async (page, expr, sel) => {
    const info = await page.evaluate(([expr, sel]) => {
      try { eval(expr); } catch (e) { return { err: String(e) }; }
      uiDirty = true; try { renderUI(); } catch (_) {}
      window.__sel = sel;
      window.__box = () => {
        const l = [...document.querySelectorAll(window.__sel)]
          .filter((e) => { const q = e.getBoundingClientRect(); return q.width > 4 && q.height > 4; });
        return l.find((e) => e.scrollHeight - e.clientHeight > 1) || l[0] || null;
      };
      window.__top = () => { const b = window.__box(); return b ? b.scrollTop : -1; };
      const el = window.__box();
      if (!el) return { err: '컨테이너 없음' };
      el.scrollTop = 0;
      const r = el.getBoundingClientRect();
      return { max: el.scrollHeight - el.clientHeight, x: Math.round(r.x + r.width / 2),
               y: Math.round(r.y + Math.min(r.height * 0.65, r.height - 60)) };
    }, [expr, sel]);
    await page.waitForTimeout(350);           /* 연 직후 재렌더 한 바퀴를 지나서 잡는다 */
    return info;
  };

  /* pause — 스텝을 다 밟은 뒤 **떼기 전에** 머무는 시간(562). 포인터가 안 움직이므로
     거리·속도는 그대로고 **제스처 길이만** 늘어난다. */
  const drag = async (page, x, y, dy, steps = 12, hold = 12, pause = 0) => {
    const t0 = Date.now();
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y + (dy * i) / steps); await page.waitForTimeout(hold); }
    if (pause) await page.waitForTimeout(pause);
    await page.mouse.up();
    return Date.now() - t0;
  };
  /* 관성이 멎을 때까지 훑어 최댓값 — 재렌더로 한 프레임 사라지는 화면이 있어 단발 측정은 못 믿는다 */
  const peak = async (page, ms = 320) => {
    let v = -1;
    for (let i = 0; i * 40 < ms; i++) { const t = await page.evaluate(() => window.__top()); if (t > v) v = t; await page.waitForTimeout(40); }
    return v;
  };

  /* ---------- [A] 화면별 마우스 드래그 스크롤 ---------- */
  section('[A] 마우스 드래그 스크롤 — 화면별 실측 (화면마다 새 페이지)');
  const table = [];
  for (const [name, expr, sel, vh, light] of SCREENS) {
    const { ctx, page } = await fresh(vh, false, light === 'light');
    const info = await open(page, expr, sel);
    if (info.err) {
      if (info.err === '컨테이너 없음') { console.log(`  · ${name} — 스크롤 컨테이너 없음 (해당 없음)`); table.push([name, sel, '없음', '—', '—', '해당없음']); }
      else { fail(`${name}: ${info.err}`); table.push([name, sel, '—', '—', '—', 'ERR']); }
      await ctx.close(); continue;
    }
    if (info.max < 20) {
      console.log(`  · ${name} — 스크롤 여지 ${info.max}px (해당 없음)`);
      table.push([name, sel, info.max, '—', '—', '해당없음']); await ctx.close(); continue;
    }
    await drag(page, info.x, info.y, -400);
    const up = await peak(page);
    await page.waitForTimeout(300);
    const late = await page.evaluate(() => window.__top());
    const want = Math.min(300, info.max);
    if (up >= want) ok(`${name} (${sel}) — 최대 ${info.max}px 중 ${Math.round(up)}px 스크롤`
      + (late < up - 8 ? `  ⚠ 0.6초 뒤 ${Math.round(late)}px 로 되돌아감 (재렌더 — 작업 107 소관)` : ''));
    else fail(`${name} (${sel}) — 드래그 −400px 후 scrollTop ${Math.round(up)} < ${want} (최대 ${info.max})`);
    table.push([name, sel, info.max, Math.round(up), Math.round(late), up >= want ? 'PASS' : 'FAIL']);
    await ctx.close();
  }

  /* ---------- [B] 드래그한 제스처는 click 없음 / [C] 5px 은 여전히 탭 ---------- */
  {
    const { ctx, page } = await fresh();
    const info = await open(page, `openShopPage()`, '.shp-list');
    section('[B] 드래그 = 탭 아님 (click 억제)');
    await page.evaluate(() => { window.__clk = 0; });
    const bms = await drag(page, info.x, info.y, -260);
    await page.waitForTimeout(400);
    const c = await page.evaluate(() => window.__clk);
    if (c === 0) ok(`260px 드래그 → click 0건 (제스처 ${bms}ms)`);
    else fail(`260px 드래그인데 click ${c}건 발화 (74 합성기 억제 실패 · 제스처 ${bms}ms)`);

    /* 562 — 위 한 줄만으로는 **기계 속도가 판정을 정한다.** 74 의 네이티브 click 삼키기는
       pointerdown 으로부터 3초짜리 창이라, 같은 제스처가 한가한 기계에서는 1.5초에 끝나
       초록이고 밀린 기계에서는 4초가 걸려 빨갛다(2026-08-31 실측: 워커 A 는 연속 4회 빨강,
       다른 컨테이너는 연속 4회 초록 — 같은 커밋이다). 그래서 **길이를 자가 정하는** 항을
       하나 더 세운다: 궤적·거리·속도는 [B] 와 같고 떼기 전에 3.2초 머문다.
       이 항이 초록이려면 제품이 «드래그로 끝났다» 를 시간과 무관하게 알아야 한다. */
    section('[B2] 느린 드래그도 탭 아님 — 떼기 전 3.2초 머묾 (562)');
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__clk = 0; });
    const b2ms = await drag(page, info.x, info.y, -260, 12, 12, 3200);
    await page.waitForTimeout(400);
    const c3 = await page.evaluate(() => window.__clk);
    if (b2ms < 3000) fail(`[B2] 전제 — 제스처가 ${b2ms}ms 로 3초를 못 넘겼다(이 항이 아무것도 안 재고 있다)`);
    else if (c3 === 0) ok(`3.2초 머문 드래그(제스처 ${b2ms}ms) → click 0건`);
    else fail(`3.2초 머문 드래그(제스처 ${b2ms}ms)인데 click ${c3}건 발화 — 562 재발(네이티브 click 이 삼키기 창 밖으로 샜다)`);

    section('[C] 탭 회귀 — 5px 이동은 click 정상');
    await page.waitForTimeout(400);                      /* 74 ③ 딤 가드(250ms) 를 지나서 누른다 */
    await page.evaluate(() => { window.__clk = 0; });
    await drag(page, info.x, info.y, -5, 2, 30);
    await page.waitForTimeout(400);
    const c2 = await page.evaluate(() => window.__clk);
    if (c2 >= 1) ok(`5px 이동 → click ${c2}건 정상 발화`);
    else fail('5px 이동인데 click 0건 — 탭이 죽었다(74 회귀)');
    await ctx.close();
  }

  /* ---------- [D] 휠 (마우스 컨텍스트) ---------- */
  {
    const { ctx, page } = await fresh();
    const info = await open(page, `openRank()`, '.rk-list');
    section('[D] 휠');
    await page.mouse.move(info.x, info.y);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => window.__top());
    if (w > 100) ok(`휠 600 → scrollTop ${Math.round(w)}`);
    else fail(`휠 600 후 scrollTop ${Math.round(w)} (막는 리스너 의심)`);
    await ctx.close();
  }

  /* ---------- [F] 터치 회귀 (터치 컨텍스트) ---------- */
  {
    const { ctx, page } = await fresh(2280, true);
    const info = await open(page, `openRank()`, '.rk-list');
    section('[F] 터치 회귀 — 네이티브 스크롤만');
    const cdp = await ctx.newCDPSession(page);
    const pt = (type, y, on) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: on ? [{ x: info.x, y }] : [] });
    await pt('touchStart', info.y, 1);
    for (let i = 1; i <= 8; i++) { await pt('touchMove', info.y - i * 40, 1); await page.waitForTimeout(16); }
    const mid = await page.evaluate(() => ({ top: window.__top(), drag: document.body.classList.contains('ds-drag') }));
    await pt('touchEnd', info.y - 320, 0);
    await page.waitForTimeout(400);
    if (!mid.drag) ok('터치 드래그에 ds-drag 안 붙음 (마우스 전용 — 관성 이중 적용 없음)');
    else fail('터치인데 ds-drag 가 붙었다 — 네이티브 스크롤과 관성이 겹친다');
    const af = await page.evaluate(() => window.__top());
    if (af > 100) ok(`터치 드래그 → scrollTop ${Math.round(af)} (네이티브 경로 그대로)`);
    else fail(`터치 드래그 후 scrollTop ${Math.round(af)} — 네이티브 스크롤이 죽었다`);
    await ctx.close();
  }

  /* ---------- [E] 관성 ---------- */
  {
    const { ctx, page } = await fresh();
    const info = await open(page, `openPass()`, '.ps-list');
    section('[E] 관성(fling)');
    /* 305 — 이 절이 «4회 중 1회» FAIL 하던 자리다. 제품은 멀쩡했고 **게이트가 창의 앞턱에 서 있었다**
       (226 «게이트가 잰 시점이 흔들렸다» 와 같은 형태).
       index.html «95» 의 end 는 `performance.now() - r.t < 90` 일 때만 fling 을 건다
       (= «멈춘 채로 뗐으면 관성 없음»). 그런데 playwright 의 page.mouse 는 호출마다 왕복을
       기다려서 «마지막 move → up» 사이에 클라우드 컨테이너 기준 84~134ms 가 끼었다.
       10회 프로브(`node tools/probe305.js`) 실측 — gap<90 인 3회는 전부 fling ○ PASS,
       gap≥90 인 7회는 전부 fling ✗ FAIL 로 **부호가 gap 하나에 완전히 갈렸다**.
       → 같은 CDP 세션에 마지막 move 와 up 을 «연달아»(왕복을 안 기다리고) 보내면 순서는 보장되면서
         간격이 0.7~0.9ms 로 떨어진다(실측 6/6 PASS). 입력 경로 자체는 page.mouse 와 같다. */
    await page.evaluate(() => {
      window.__lm = 0; window.__gap = null;
      addEventListener('pointermove', () => { window.__lm = performance.now(); }, true);
      addEventListener('pointerup', () => { window.__gap = window.__lm ? performance.now() - window.__lm : -1; }, true);
    });
    const cdp = await ctx.newCDPSession(page);
    const mev = (type, y, buttons) => cdp.send('Input.dispatchMouseEvent',
      { type, x: info.x, y, button: 'left', buttons, clickCount: 1, pointerType: 'mouse' });
    await mev('mousePressed', info.y, 1);
    for (let i = 1; i <= 5; i++) { await mev('mouseMoved', info.y - i * 60, 1); await page.waitForTimeout(8); }
    await Promise.all([mev('mouseMoved', info.y - 360, 1), mev('mouseReleased', info.y - 360, 0)]);
    const t0 = await page.evaluate(() => window.__top());
    const gap = await page.evaluate(() => window.__gap);
    await page.waitForTimeout(450);
    const t1 = await page.evaluate(() => window.__top());
    const gs = typeof gap === 'number' && gap >= 0 ? `${Math.round(gap)}ms` : '측정불가';
    /* 표본이 창 밖에 섰으면 «제품이 틀렸다» 고 말하지 않는다 — 게이트 자신을 지목한다. */
    if (typeof gap === 'number' && gap >= 90)
      fail(`게이트 계측 — 마지막 move → up 간격 ${gs} 가 제품의 관성 창(90ms) 밖이라 관성을 판정할 수 없다 (제품 결함 아님 · 305)`);
    else if (t1 - t0 > 20) ok(`뗀 뒤 ${Math.round(t1 - t0)}px 더 흐름 (${Math.round(t0)} → ${Math.round(t1)} · move→up ${gs})`);
    else fail(`관성 없음 — 뗀 직후 ${Math.round(t0)} → ${Math.round(t1)} (move→up ${gs} — 창 안인데 안 흘렀다)`);
    await ctx.close();
  }

  /* ---------- [G]·[H] ---------- */
  {
    const { ctx, page } = await fresh();
    const info = await open(page, `openRank()`, '.rk-list');
    await drag(page, info.x, info.y, -200);              /* #dsbar 는 첫 드래그 때 만들어진다 */
    await page.waitForTimeout(200);
    if (page.settle291) await page.settle291();   /* 921 — 여는 동작 뒤 <250ms 대기라 291 훅이 구조적으로 안 돈다(915 선례) */
    section('[G] 레이아웃 중립 — 스크롤바 거터');
    const g = await page.evaluate((sels) => {
      const out = [];
      for (const s of sels) document.querySelectorAll(s).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 4) return;
        const cs = getComputedStyle(el);
        out.push({ s, gutter: el.offsetWidth - el.clientWidth - (parseFloat(cs.borderLeftWidth) || 0) - (parseFloat(cs.borderRightWidth) || 0) });
      });
      const bar = document.getElementById('dsbar');
      return { out, bar: bar ? { pe: getComputedStyle(bar).pointerEvents, pos: getComputedStyle(bar).position, w: bar.offsetWidth } : null };
    }, CONTAINERS);
    /* .body·.mbody 는 이번 작업 전부터 10px 스크롤바를 갖고 있다 — 그대로 두는 게 «중립» 이다 */
    const bad = g.out.filter((r) => r.gutter > 0 && r.s !== '.body' && r.s !== '.mbody');
    if (!bad.length) ok(`거터 0 유지 (${g.out.length}개 컨테이너 실측 · .body/.mbody 기존 10px 제외)`);
    else bad.forEach((r) => fail(`${r.s} 스크롤바 거터 ${r.gutter}px — 콘텐츠 폭이 줄어 레이아웃 점수가 흔들린다`));
    if (!g.bar) fail('#dsbar 가 만들어지지 않았다 (스크롤 단서 없음)');
    else if (g.bar.pe === 'none' && g.bar.pos === 'absolute') ok(`#dsbar 오버레이 (absolute · pointer-events:none · 폭 ${g.bar.w})`);
    else fail(`#dsbar 가 오버레이가 아니다: ${JSON.stringify(g.bar)}`);

    section('[H] overscroll-behavior:contain');
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
    const rule = (src.match(/[^{}]*\{[^{}]*overscroll-behavior:\s*contain[^{}]*\}/g) || []).join(' ');
    const missSrc = CONTAINERS.filter((c) => !rule.includes(c));
    if (!missSrc.length) ok(`CSS 규칙에 ${CONTAINERS.length}개 셀렉터 전부 포함`);
    else missSrc.forEach((m) => fail('overscroll-behavior 규칙 누락: ' + m));
    const r = await page.evaluate((sels) => {
      const seen = [], miss = [];
      for (const s of sels) { const el = document.querySelector(s); if (!el) continue; seen.push(s);
        if (getComputedStyle(el).overscrollBehaviorY !== 'contain') miss.push(s); }
      return { seen: seen.length, miss };
    }, CONTAINERS);
    if (!r.miss.length) ok(`DOM 실측 ${r.seen}개 전부 contain`);
    else r.miss.forEach((m) => fail('overscroll-behavior computed 불일치: ' + m));
    await ctx.close();
  }

  section('[I] 콘솔');
  if (!errs.length) ok('에러 0건'); else errs.slice(0, 8).forEach((e) => fail(e));

  console.log('\n| 화면 | 컨테이너 | 최대 스크롤 | 드래그 −400 직후 | 0.6초 뒤 | 판정 |');
  console.log('|---|---|---|---|---|---|');
  for (const t of table) console.log(`| ${t[0]} | \`${t[1]}\` | ${t[2]} | ${t[3]} | ${t[4]} | ${t[5]} |`);

  await browser.close();
  /* 305 — 실패 목록을 표 «뒤» 에 다시 찍는다. `tail` 로 잘라 봐도 무엇이 실패했는지 남는다. */
  if (fails.length) {
    console.log('\n실패 항목 (절 · 내용)');
    fails.forEach((f, i) => console.log(`  ${i + 1}. ${f.sec}\n     ✗ ${f.m}`));
  }
  console.log(fails.length ? `\nVERIFY95 FAIL — ${fails.length}건` : '\nVERIFY95 PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
