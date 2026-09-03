#!/usr/bin/env node
/* 815 게이트 — 06 장비 시트의 **그릇 앵커 모드**를 못박는다.
 *
 * 등재문(754 6회차 비평가 CE 단독)은 «시트 상변이 38 → 732px 로 표류하니 상·하 동시 앵커
 * 또는 중앙 피벗으로 바꿔라» 였다. `tools/probe815.js` 의 재현이 **수치는 그대로 확인**했고
 * (38/38/52/412/732 · ×19.3) **판정은 뒤집었다** — 표류는 결함이 아니라 두 규약의 결과다:
 *
 *   ① 06 은 «바닥 시트»(측정표 `docs/measure/06-장비팝업.md` §0 — 폭 1080 · 위쪽만 radius ·
 *      하변은 하단 네비바에 «잘린다»). 그릇의 정체가 서랍이므로 하변이 앵커고 상변이 종속이다.
 *   ② 지시서 [2] — «폭 1080 고정 · 세로 가변 · **남는 높이는 전투 캔버스가 흡수**».
 *      시트 위의 띠가 바로 그 전투 캔버스다. 기준 프레임보다 긴 기기에서 띠가 자라는 것은
 *      규칙대로 흡수한 결과다.
 *   ③ 짧은 프레임에서 시트가 위로 자라는 것은 **403**(주인 지시 «06 이 9:13.3 에서 스크롤 없이
 *      다 보이게»)이 직접 세운 기하다 — 가드 142 는 351 이 두 번 올린 값이다.
 *   ④ CE 가 나란히 놓은 다섯(03·10·89·52·54)은 전부 **페이지·전면 오버레이**라 자기 몸이
 *      프레임을 따라 ~1000px 자란다. «상변 불변» 은 그들의 규약이 아니라 **몸이 자란 결과**다.
 *
 * 그래서 이 자는 «상변을 고정하라» 가 아니라 **«서랍 규약이 지켜지는가»** 를 잰다.
 * 반대 방향으로 무르지 않다는 것은 [R] 되돌림 시험이 못박는다 — CE 처방 두 안을 실제로
 * 주입해 기준 프레임(2280)이 깨지는 것을 찍는다.
 *
 * 실행: node tools/verify815.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const HEIGHTS = [1600, 1841, 1920, 2280, 2600];
const HUD_B = 104;   /* 상단 HUD 바 하변 */
const TABBAR = 180;  /* 하단 네비바 높이(24) */
const GUARD = 142;   /* 351 4회차가 올린 HUD 잉크 가드 */
const DRAWER = 1584; /* 레퍼런스 시트 가시 높이(측정표 §1) */

/* 기준 프레임(2280) 레퍼런스 값 — ref y 577 − 84 = 493 에 캔버스 흡수 24 를 더한 516 */
const REF2280 = { y: 516, b: 2100, h: DRAWER, view: 1444, pitch: 400, gap3st: 46 };

const PAGES = [
  { id: '03', sel: '#dunw', open: 'openDungeon()' },
  { id: '10', sel: '#shopw', open: 'openShopPage()' },
  { id: '89', sel: '#relw', open: 'openRelw()' },
  { id: '52', sel: '#mnw', open: 'openMenu()' },
  { id: '54', sel: '#rkw', open: 'openRank()' },
];

const near = (a, b, t = 1) => Math.abs(a - b) <= t;

async function fresh(browser, h, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e)));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  if (css) await page.addStyleTag({ content: css });
  return { ctx, page, errs };
}

async function settle(page) {
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(180);
}

const measure = () => {
  const R = (e) => { const b = e.getBoundingClientRect(); return { y: +b.y.toFixed(1), b: +b.bottom.toFixed(1), h: +b.height.toFixed(1), x: +b.x.toFixed(1), w: +b.width.toFixed(1) }; };
  const sheet = document.querySelector('.eqp');
  if (!sheet) return { err: 'no .eqp' };
  const cs = getComputedStyle(sheet);
  const sc = sheet.querySelector('.shsc');
  const sl = [...sheet.querySelectorAll('.eqsl')].map(R);
  const st = sheet.querySelector('.eqst.a');
  const tab = document.getElementById('tabbar');
  return {
    frameH: window.innerHeight,
    sheet: R(sheet),
    radius: cs.borderTopLeftRadius + '/' + cs.borderTopRightRadius + '/' + cs.borderBottomRightRadius + '/' + cs.borderBottomLeftRadius,
    view: sc ? +sc.getBoundingClientRect().height.toFixed(1) : null,
    slack: sc ? sc.scrollHeight - sc.clientHeight : null,
    slots: sl,
    pitch: sl.length >= 2 ? +(sl[1].y - sl[0].y).toFixed(1) : null,
    gap3st: (sl.length >= 3 && st) ? +(R(st).y - sl[2].b).toFixed(1) : null,
    tabTop: tab ? +tab.getBoundingClientRect().y.toFixed(1) : null,
  };
};

const measurePage = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return { err: 'no ' + sel };
  const b = el.getBoundingClientRect();
  return { y: +b.y.toFixed(1), h: +b.height.toFixed(1) };
};

async function openEqp(page) {
  await page.evaluate(() => { panelOpen = true; curTab = 'hero'; heroTab = 'eq'; syncPanel(); }).catch(() => {});
  await page.waitForTimeout(520);
  await settle(page);
}

(async () => {
  const browser = await launch(chromium);
  const base = {};
  const errAll = [];
  for (const h of HEIGHTS) {
    const { ctx, page, errs } = await fresh(browser, h);
    await openEqp(page);
    base[h] = await page.evaluate(measure);
    errAll.push(...errs);
    await ctx.close();
  }
  /* 표본 성격 — 1600 ↔ 2600 두 끝에서 다섯의 몸이 자라는가 */
  const pageRows = {};
  for (const h of [1600, 2600]) {
    const { ctx, page } = await fresh(browser, h);
    pageRows[h] = {};
    for (const p of PAGES) {
      await page.evaluate((o) => { try { eval(o); } catch (e) { /* noop */ } }, p.open).catch(() => {});
      await page.waitForTimeout(320);
      pageRows[h][p.id] = await page.evaluate(measurePage, p.sel);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(120);
    }
    await ctx.close();
  }
  /* [R] 되돌림 시험 — CE 처방 두 안 */
  const REV_BOTH = '.eqp{top:142px!important;bottom:0!important;height:auto!important;max-height:none!important}';
  const REV_MID = '.eqp{top:calc(142px + (100% - 1726px)/2)!important;bottom:auto!important;height:1584px!important;max-height:none!important}';
  const rev = {};
  for (const [nm, css] of [['both', REV_BOTH], ['mid', REV_MID]]) {
    const { ctx, page } = await fresh(browser, 2280, css);
    await openEqp(page);
    rev[nm] = await page.evaluate(measure);
    await ctx.close();
  }
  await browser.close();

  let pass = 0, tot = 0;
  const ck = (label, cond, detail) => { tot++; if (cond) pass++; console.log(`  ${cond ? 'ok ' : '✗  '} ${label} — ${detail}`); };

  /* ---------- [A] 바닥 시트 규약 ---------- */
  console.log('[A] 06 = «바닥 시트» — 하변이 앵커다(측정표 §0 · 하변은 네비바에 잘린다)');
  for (const h of HEIGHTS) {
    const m = base[h];
    if (m.err) { ck(`${h} 시트가 열린다`, false, m.err); continue; }
    ck(`${h} 시트 하변 = 하단 네비바 상변(프레임 ${h} − ${TABBAR})`, near(m.sheet.b, h - TABBAR, 1),
      `하변 ${m.sheet.b} vs ${h - TABBAR} (네비바 상변 ${m.tabTop})`);
    ck(`${h} 시트 폭 1080 · 좌변 0`, near(m.sheet.w, 1080, 1) && near(m.sheet.x, 0, 1), `${m.sheet.x}..${(m.sheet.x + m.sheet.w).toFixed(1)}`);
    ck(`${h} radius 는 «위쪽만»(38/38/0/0)`, /^38px\/38px\/0px\/0px$/.test(m.radius), m.radius);
  }

  /* ---------- [B] 기준 프레임 Δ0 ---------- */
  console.log('[B] 기준 프레임 2280 — 레퍼런스(ref y577 − 84 = 493 + 캔버스 흡수 24) 그대로인가');
  {
    const m = base[2280];
    ck('2280 시트 516..2100 (h1584)', near(m.sheet.y, REF2280.y, 1) && near(m.sheet.b, REF2280.b, 1) && near(m.sheet.h, REF2280.h, 1),
      `${m.sheet.y}..${m.sheet.b} (h${m.sheet.h})`);
    ck('2280 본문 뷰포트 1444', near(m.view, REF2280.view, 1), `${m.view}`);
    ck('2280 슬롯 피치 400 · 슬롯3↔스탯 46', near(m.pitch, REF2280.pitch, 1) && near(m.gap3st, REF2280.gap3st, 1),
      `피치 ${m.pitch} · 간극 ${m.gap3st}`);
    ck('2280 HUD 하변 대비 상변 412(= 레퍼런스 409 + 캔버스 흡수 3 이내)', near(m.sheet.y - HUD_B, 412, 2), `${(m.sheet.y - HUD_B).toFixed(1)}`);
  }

  /* ---------- [C] 표류는 «임의» 가 아니라 두 손잡이의 산수다 ---------- */
  console.log('[C] 상변 = max(가드 142, 프레임 − 1764) — 표류의 값이 규칙에서 나오는가');
  for (const h of HEIGHTS) {
    const m = base[h];
    if (m.err) continue;
    const want = Math.max(GUARD, h - TABBAR - DRAWER);
    ck(`${h} 시트 상변 = max(${GUARD}, ${h} − ${TABBAR} − ${DRAWER}) = ${want}`, near(m.sheet.y, want, 1), `${m.sheet.y}`);
    ck(`${h} 시트 높이 = min(${DRAWER}, 프레임 − 322)`, near(m.sheet.h, Math.min(DRAWER, h - 322), 1),
      `${m.sheet.h} vs ${Math.min(DRAWER, h - 322)}`);
  }

  /* ---------- [D] CE 가 나란히 놓은 다섯은 «페이지» 다 ---------- */
  console.log('[D] 비교 표본 다섯 — 몸이 프레임을 따라 자란다(그래서 상변이 불변이다)');
  for (const p of PAGES) {
    const a = pageRows[1600][p.id], b = pageRows[2600][p.id];
    if (!a || a.err || !b || b.err) { ck(`${p.id} 표본을 잰다`, false, (a && a.err) || (b && b.err) || '없음'); continue; }
    ck(`${p.id} 는 페이지 — 1600 → 2600 에서 몸이 900px 이상 자란다`, (b.h - a.h) >= 900,
      `높이 ${a.h} → ${b.h} (Δ${(b.h - a.h).toFixed(1)})`);
  }
  ck('06 만 서랍 — 몸이 상한 1584 에서 멈춘다(자라지 않는다)',
    near(base[2600].sheet.h, DRAWER, 1) && near(base[2280].sheet.h, DRAWER, 1),
    `1600 ${base[1600].sheet.h} → 2600 ${base[2600].sheet.h}`);

  /* ---------- [E] 403 보증 ---------- */
  console.log('[E] 403 보증(주인 지시) — 어느 프레임에서도 시트가 스크롤을 요구하지 않는다');
  for (const h of HEIGHTS) {
    const m = base[h];
    if (m.err) continue;
    ck(`${h} 스크롤 여유 0`, m.slack === 0, `${m.slack}px`);
  }
  ck('콘솔 런타임 에러 0', errAll.length === 0, errAll.slice(0, 2).join(' / ') || '없음');

  /* ---------- [R] 되돌림 시험 — CE 처방 두 안의 대가 ---------- */
  console.log('[R] 되돌림 시험 — CE 처방을 실제로 주입하면 기준 프레임이 깨진다');
  {
    const m = rev.both;
    ck('[R-a 전제] «상·하 동시 앵커» 주입이 실제로 먹었다(상변 142)', near(m.sheet.y, GUARD, 1), `상변 ${m.sheet.y}`);
    ck('[R-a] 상·하 동시 앵커 ⇒ 2280 시트가 1584 → 1958 로 부푼다(기준 프레임 이탈)',
      m.sheet.h > DRAWER + 300, `높이 ${m.sheet.h} (레퍼런스 ${DRAWER})`);
    ck('[R-b] 그 대가로 슬롯 피치가 레퍼런스 400 을 38% 넘게 벌어진다(89 가 «여백만 벌어진다» 로 걸린 그 결함)',
      m.pitch > REF2280.pitch * 1.3, `피치 ${m.pitch} vs 레퍼런스 ${REF2280.pitch}`);
  }
  {
    const m = rev.mid;
    ck('[R-c 전제] «중앙 피벗» 주입이 실제로 먹었다(높이 1584 유지)', near(m.sheet.h, DRAWER, 1), `높이 ${m.sheet.h}`);
    ck('[R-d] 중앙 피벗 ⇒ 2280 에서 시트 하변이 네비바 상변에서 뜬다(측정표 §0 «바닥은 잘린다» 위반)',
      m.sheet.b < 2100 - 100, `하변 ${m.sheet.b} vs 네비바 상변 ${m.tabTop}`);
    ck('[R-e] 중앙 피벗으로도 상변은 여전히 프레임 가변이다(표류를 «절반» 으로 줄일 뿐)',
      m.sheet.y > GUARD + 100, `상변 ${m.sheet.y} (가드 ${GUARD})`);
  }

  console.log(`\nVERIFY815 ${pass}/${tot} ${pass === tot ? 'PASS' : 'FAIL'}`);
  process.exit(pass === tot ? 0 : 1);
})();
