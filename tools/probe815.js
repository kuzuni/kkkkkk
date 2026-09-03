#!/usr/bin/env node
/* 815 프로브 — «06 장비 시트가 하단 앵커 + 최대높이라 상변이 프레임마다 38 → 732px 로 표류한다»
 * (754 6회차 비평가 CE 단독 지적)를 **처방 전에** 자로 재현한다(338 규칙).
 *
 * 등재문이 근거로 든 문장은 둘이다.
 *   ⓐ «다른 다섯 화면은 그릇 상변이 프레임 불변인데 06 만 아니다» — 표본의 성격을 확인한다.
 *   ⓑ «2280 에서 시트 상변이 뒤 HUD 의 «퀘스트» 라벨을 가로로 잘라먹고,
 *      2600 에서는 732px 띠에 좌측 아이콘 열이 드러난다» — 시트 상변 선이 무엇을 자르는지 본다.
 *
 * 재는 것 (프레임 5종 — 1600 / 1841 / 1920 / 2280(기준) / 2600):
 *   A 06 시트 `.eqp` — y · 하변 · 높이 · HUD 하변(104) 대비 상변
 *   B 비교 표본 다섯의 그릇 — 상변 «그리고 높이». 상변이 불변이면서 높이가 프레임을 따라
 *     자라면 그것은 «페이지»(띠 전체를 채운다)고, 06 처럼 높이가 상한에 걸린 «서랍» 이 아니다.
 *   C 시트 상변 선이 자르는 것 — 그 y 에서 보이는(딤 뒤라도 visibility 가 살아 있는) HUD 요소
 *   D 파생 압축 — 슬롯 피치(s1→s2) · 슬롯3 하변 ↔ 스탯 알약 상변
 *
 * 실행: node tools/probe815.js [--json <경로>]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

const HEIGHTS = [1600, 1841, 1920, 2280, 2600];
const HUD_B = 104; /* 상단 HUD 바 하변 — CE 가 기준으로 쓴 선 */

/* 비교 표본 다섯(754 6회차 r6 세트에서 06 을 뺀 것) */
const PAGES = [
  { id: '03', name: '던전 페이지', sel: '#dunw', open: 'openDungeon()' },
  { id: '10', name: '상점 페이지', sel: '#shopw', open: 'openShopPage()' },
  { id: '89', name: '유물 소환', sel: '#relw', open: 'openRelw()' },
  { id: '52', name: '▦ 메뉴', sel: '#mnw', open: 'openMenu()' },
  { id: '54', name: '랭킹', sel: '#rkw', open: 'openRank()' },
];

async function fresh(browser, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page };
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

/* ── 06 시트를 열고 잰다 ─────────────────────────────────────────────── */
const measureEqp = () => {
  const R = (e) => { const b = e.getBoundingClientRect(); return { y: +b.y.toFixed(1), b: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; };
  const sheet = document.querySelector('.eqp');
  if (!sheet) return { err: 'no .eqp' };
  const sl = [...sheet.querySelectorAll('.eqsl')].map(R);
  const st = sheet.querySelector('.eqst.a');
  const sc = sheet.querySelector('.shsc');
  /* 시트 상변 선이 지나는 «시트 밖» 요소 — 딤·시트 자신·전투 캔버스는 뺀다 */
  const top = sheet.getBoundingClientRect().y;
  const cut = [];
  document.querySelectorAll('#top *,#tuto,#tuto *,#slots,#slots *,#sidebar,#sidebar *,.ibtn,#botleft *').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
    if (b.y < top && b.bottom > top) {
      const above = +(top - b.y).toFixed(1), below = +(b.bottom - top).toFixed(1);
      cut.push({
        el: (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        txt: (el.textContent || '').trim().slice(0, 12),
        y: +b.y.toFixed(1), b: +b.bottom.toFixed(1), above, below,
      });
    }
  });
  /* 띠(HUD 하변 ~ 시트 상변) 안에서 «보이는» HUD 요소 수 */
  const band = [];
  document.querySelectorAll('#tuto,#slots,#sidebar .ibtn,#botleft .ubtn').forEach((el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (b.height < 4) return;
    band.push({ el: el.id ? '#' + el.id : '.' + String(el.className).trim().split(/\s+/)[0], y: +b.y.toFixed(1), b: +b.bottom.toFixed(1) });
  });
  const hud = document.getElementById('top');
  return {
    frameH: window.innerHeight,
    sheet: R(sheet),
    hudVis: hud ? getComputedStyle(hud).visibility : null,
    viewH: sc ? +sc.getBoundingClientRect().height.toFixed(1) : null,
    slack: sc ? sc.scrollHeight - sc.clientHeight : null,
    slots: sl,
    pitch: sl.length >= 2 ? +(sl[1].y - sl[0].y).toFixed(1) : null,
    gap3st: (sl.length >= 3 && st) ? +(R(st).y - sl[2].b).toFixed(1) : null,
    cut, band,
  };
};

const measurePage = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return { err: 'no ' + sel };
  const b = el.getBoundingClientRect();
  /* «그릇» = 그 화면의 눈에 보이는 판. 페이지형은 자신이 판이다. */
  return { y: +b.y.toFixed(1), b: +b.bottom.toFixed(1), h: +b.height.toFixed(1) };
};

(async () => {
  const browser = await launch(chromium);
  const out = [];
  for (const h of HEIGHTS) {
    const { ctx, page } = await fresh(browser, h);
    await page.evaluate(() => { panelOpen = true; curTab = 'hero'; heroTab = 'eq'; syncPanel(); }).catch(() => {});
    await page.waitForTimeout(520);
    await settle(page);
    const eqp = await page.evaluate(measureEqp);
    const pages = {};
    for (const p of PAGES) {
      await page.evaluate((o) => { try { eval(o); } catch (e) { /* noop */ } }, p.open).catch(() => {});
      await page.waitForTimeout(320);
      pages[p.id] = await page.evaluate(measurePage, p.sel);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(120);
    }
    out.push({ h, eqp, pages });
    await ctx.close();
  }
  await browser.close();

  let pass = 0, tot = 0;
  const ck = (label, cond, detail) => { tot++; if (cond) pass++; console.log(`  ${cond ? 'ok ' : '✗  '} ${label} — ${detail}`); };

  console.log('[A] 06 장비 시트 `.eqp` — 프레임 5종');
  const tops = [];
  for (const o of out) {
    const e = o.eqp;
    if (e.err) { console.log(`  ?? ${o.h}: ${e.err}`); continue; }
    const rel = +(e.sheet.y - HUD_B).toFixed(1);
    tops.push(rel);
    console.log(`  ${o.h}: 시트 ${e.sheet.y}..${e.sheet.b}(h${e.sheet.h}) · HUD 하변 대비 상변 **${rel}** · 뷰포트 ${e.viewH} · 스크롤 여유 ${e.slack} · #top visibility=${e.hudVis}`);
  }
  if (tops.length === HEIGHTS.length) {
    const mn = Math.min(...tops), mx = Math.max(...tops);
    ck('CE 실측 재현 — 상변이 38/38/52/412/732 로 표류한다',
      Math.abs(tops[0] - 38) <= 2 && Math.abs(tops[1] - 38) <= 2 && Math.abs(tops[2] - 52) <= 2
      && Math.abs(tops[3] - 412) <= 2 && Math.abs(tops[4] - 732) <= 2,
      `실측 ${tops.join(' / ')} (최단↔최장 ×${(mx / Math.max(mn, 1)).toFixed(1)})`);
  }

  console.log('[B] 비교 표본 다섯 — 상변이 불변인 대신 «높이가 프레임을 따라 자라는가»(= 페이지인가)');
  for (const p of PAGES) {
    const row = out.map((o) => o.pages[p.id]).filter((x) => x && !x.err);
    if (row.length !== HEIGHTS.length) { console.log(`  ?? ${p.id} ${p.name}: 표본 ${row.length}/5`); continue; }
    const ys = row.map((r) => r.y), hs = row.map((r) => r.h);
    /* ⚠ «상변 불변» 을 ±1px 로 물으면 10·89 가 7.5px 로 빨개진다 — 그 7.5 는 자기 재화 바(`.pcb`)
       자리가 프레임을 조금 타는 것이고 이 절이 묻는 것이 아니다. 이 절이 묻는 것은 **성격**이다:
       «몸이 프레임을 따라 자라는가»(= 페이지) — 상변이 안 움직이는 것은 그 결과다. */
    const grows = (Math.max(...hs) - Math.min(...hs)) >= 900; /* 2600−1600 = 1000 만큼 자라야 페이지 */
    console.log(`  ${p.id} ${p.name}: 상변 ${ys.join('/')} · 높이 ${hs.join('/')}`);
    ck(`${p.id} 은 «페이지»다(몸이 프레임을 따라 자란다 ⇒ 상변이 종속으로 고정된다)`, grows,
      `상변 진폭 ${(Math.max(...ys) - Math.min(...ys)).toFixed(1)}px · 높이 진폭 ${(Math.max(...hs) - Math.min(...hs)).toFixed(1)}px`);
  }
  const eqHs = out.map((o) => o.eqp.sheet && o.eqp.sheet.h).filter(Boolean);
  ck('06 만 «높이가 상한(1584)에 걸리는 서랍» 이다', Math.max(...eqHs) <= 1585,
    `06 높이 ${eqHs.join('/')} (상한 1584)`);

  console.log('[C] 시트 상변 선이 자르는 «시트 밖» 요소');
  for (const o of out) {
    const e = o.eqp;
    if (e.err) continue;
    console.log(`  ${o.h}: ${e.cut.length ? e.cut.map((c) => `${c.el}${c.txt ? '「' + c.txt + '」' : ''} ${c.y}..${c.b}(위 ${c.above} / 아래 ${c.below})`).join(' · ') : '없음'}`);
  }
  const cut2280 = (out.find((o) => o.h === 2280) || {}).eqp;
  if (cut2280 && !cut2280.err) {
    ck('CE ⓑ 재현 — 2280 에서 시트 상변이 HUD 요소를 가로로 자른다', cut2280.cut.length > 0,
      cut2280.cut.length ? cut2280.cut.map((c) => c.el).join(' · ') : '자르는 요소 0건');
  }

  console.log('[D] 파생 — 슬롯 피치 · 슬롯3 하변 ↔ 스탯 알약');
  for (const o of out) {
    const e = o.eqp;
    if (e.err) continue;
    console.log(`  ${o.h}: 피치 ${e.pitch} · 슬롯3↔스탯 ${e.gap3st}`);
  }

  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(out, null, 2));
  console.log(`\nPROBE815 ${pass}/${tot} ${pass === tot ? 'PASS' : 'FAIL'}`);
})();
