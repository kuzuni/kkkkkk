#!/usr/bin/env node
/* 작업 63 — 기준 화면비 9:16(1080×1920) → 9:19(1080×2280) 전환 회귀 확인
 *
 *   node tools/aspect63.js                 # 2280 캡처 + 기하 감사
 *   node tools/aspect63.js --no-shot       # 캡처 없이 감사만
 *
 * 하는 일
 *   1. 구현된 화면을 하나씩 1080×2280 으로 열어 `docs/shots/63-<ID>.png` 로 1장씩 캡처
 *   2. 각 화면의 «떠 있는 오버레이» 안 요소를 훑어 아래를 텍스트로 보고한다
 *      - 프레임(0..frameH) 밖으로 나간 요소 (잘림)
 *      - 탭바(#tabbar) 를 침범한 콘텐츠
 *      - 콘텐츠 최하단 ~ 탭바 상단 사이의 «빈 구간»  ← 1920 기준 절대 top 을 그대로 둔 화면이 여기서 드러난다
 *   3. 같은 화면을 1080×1920 / 1080×2520 에서도 열어 «캔버스만 변하는가»(고정 요소 Δy=0) 를 확인
 *
 * 비평(점수)은 하지 않는다 — 지시서 [3]-(가) 기계적 작업용.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const NOSHOT = process.argv.includes('--no-shot');

/* 화면 목록 — id, 이름, 오버레이 셀렉터(빈 문자열이면 메인), 여는 코드(페이지 안에서 평가) */
const SCREENS = [
  { id: '02', name: '기본-메인', sel: '#app', open: `1` },
  { id: '01', name: '오프라인보상', sel: '#offw', open: `showOfflineReward(7200, 12000, 30)` },
  { id: '03', name: '던전팝업', sel: '#dunw', open: `openDungeon()` },
  { id: '04', name: '던전세부', sel: '#dgdw,#modal', open: `openDungeon(); openDunDetail(DUNGEONS[0])` },
  { id: '05', name: '무기팝업', sel: '#wpnw', open: `openWeapon(null,'weapon')` },
  { id: '06', name: '장비팝업', sel: '#eqw', open: `document.querySelector('.tab[data-t="hero"]').click()` },
  { id: '07', name: '스킬팝업', sel: '#panel', open: `document.querySelector('.tab[data-t="hero"]').click(); document.querySelector('[data-hero="sk"]').click()` },
  { id: '08', name: '스킬세부', sel: '#modal', open: `showSkillDetail(SKILLS[0].id)` },
  { id: '09', name: '일괄강화결과', sel: '#upw', open: `openUpAll([0,1,2].map(i=>({it:SKILLS[i],from:4,to:5})))` },
  { id: '10', name: '상점소환탭', sel: '#shopw', open: `openShopPage()` },
  { id: '11', name: '소환부분정보', sel: '#prbw', open: `openProbInfo('weapon',1)` },
  { id: '12', name: '소환결과', sel: '#sumw', open: `showSummonResult('weapon',10,SKILLS.concat(PETS).slice(0,10).map(it=>({it})),0)` },
  { id: '13', name: '상점재화탭', sel: '#shopw', open: `openShopPage(); (document.querySelector('[data-shopcat="coin"]')||{click(){}}).click()` },
  { id: '14', name: '유물보물상자탭', sel: '#relicw', open: `openRelicPage()` },
  { id: '15', name: '유물탭', sel: '#rlw', open: `openRelicTab()` },
  { id: '16', name: '유물세부', sel: '#modal', open: `showRelicDetail(RELICS[0].id)` },
  { id: '17', name: '스탯업보너스', sel: '#statw', open: `openStatUp({ic:'⚔️',desc:'공격력 30% 증가'})` },
  { id: '18', name: '패배화면', sel: '#defw', open: `openDefeat()` },
  { id: '19', name: '프로필', sel: '#pfw', open: `openProfile()` },
  { id: '20', name: '스펙정보', sel: '#specw', open: `openSpec()` },
  { id: '21', name: '도감보너스', sel: '#collw', open: `openColl21()` },
  { id: '22', name: '퀘스트', sel: '#modal', open: `openQuest()` },
  { id: '23', name: '훈련팝업', sel: '#trw', open: `openTrain()` },
  { id: '26', name: '동료팝업', sel: '#panel', open: `document.querySelector('.tab[data-t="hero"]').click(); document.querySelector('[data-hero="pet"]').click()` },
  { id: '29', name: '룰렛', sel: '#modal', open: `openRoulette()` },
  { id: '33', name: '재화정보', sel: '#ciw', open: `openCurInfo('gold')` },
];

/* 프레임 기준 기하 리포트 — «떠 있는 것» 만 본다 */
const PROBE = (SEL) => `(() => {
  const sel = ${JSON.stringify(SEL)};
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const px = (v) => Math.round(v);
  const fy = (v) => Math.round(v - A.top);
  const vis = (e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const tb = document.getElementById('tabbar');
  const tbTop = tb && vis(tb) ? fy(tb.getBoundingClientRect().top) : null;
  /* 대상 오버레이 = sel 중 실제로 보이는 첫 번째 */
  let host = null;
  for (const s of sel.split(',')) { const e = document.querySelector(s.trim()); if (e && vis(e)) { host = e; break; } }
  if (!host) return { missing: true };
  const H = host.getBoundingClientRect();
  const out = { host: host.id || host.className || host.tagName, frameH: px(A.height), tbTop,
    hostRect: [px(H.left - A.left), fy(H.top), px(H.width), px(H.height)],
    clipped: [], overTab: [], lowest: null, items: [] };
  /* 오버레이의 «자식 레이어» — 직계+2대까지. 텍스트 노드 상자까지 훑으면 노이즈가 커진다 */
  const kids = [...host.querySelectorAll(':scope > *, :scope > * > *')].filter(vis);
  let low = -1, lowEl = '';
  for (const e of kids) {
    const r = e.getBoundingClientRect();
    if (r.height < 2 || r.width < 2) continue;
    const t = fy(r.top), b = fy(r.bottom);
    const tag = (e.id ? '#' + e.id : '.' + (e.className || '').toString().trim().split(/\\s+/)[0]);
    if (t < -1.5 || b > px(A.height) + 1.5) out.clipped.push(tag + ' y' + t + '..' + b);
    if (tbTop != null && host.id !== 'app' && b > tbTop + 1.5 && t < tbTop && getComputedStyle(e).position === 'absolute')
      out.overTab.push(tag + ' y' + t + '..' + b);
    if (b > low) { low = b; lowEl = tag; }
  }
  out.lowest = { el: lowEl, bottom: low };
  if (tbTop != null && low > 0) out.gapToTab = tbTop - low;
  /* 절대 top 을 쓴 «떠 있는» 요소의 프레임 y — 화면비를 바꿔 비교하기 위한 지문 */
  out.items = kids.slice(0, 60).map(e => {
    const r = e.getBoundingClientRect();
    return [(e.id ? '#' + e.id : '.' + (e.className || '').toString().trim().split(/\\s+/)[0]),
            px(r.left - A.left), fy(r.top), px(r.width), px(r.height)];
  });
  return out;
})()`;

async function openScreen(page, sc) {
  await page.evaluate(`try{ ${sc.open} }catch(e){ window.__o63 = String(e && e.message || e); }`);
  await page.waitForTimeout(450);
  return page.evaluate(() => window.__o63 || null);
}

(async () => {
  const exePath = ['/opt/pw-browsers/chromium', process.env.PW_CHROMIUM].filter(Boolean).find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: exePath }); }
  if (!NOSHOT) fs.mkdirSync(SHOTS, { recursive: true });

  const rows = [];
  for (const sc of SCREENS) {
    const rec = { id: sc.id, name: sc.name, err: null, h: {} };
    for (const [w, h] of [[1080, 2280], [1080, 1920], [1080, 2520]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      const oe = await openScreen(page, sc);
      if (oe && !rec.err) rec.err = oe;
      /* 28-③ — 캔버스 데미지 숫자가 스캔·캡처를 오염시킨다 */
      await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
      const probe = await page.evaluate(PROBE(sc.sel)).catch((e) => ({ probeErr: String(e.message || e) }));
      probe.console = errs.slice(0, 3);
      rec.h[h] = probe;
      if (h === 2280 && !NOSHOT && !probe.missing) {
        await page.locator('#app').screenshot({ path: path.join(SHOTS, `63-${sc.id}.png`) }).catch(() => {});
      }
      await ctx.close();
    }
    rows.push(rec);
    const a = rec.h[2280] || {};
    const flag = a.missing ? 'MISSING' : [
      a.clipped && a.clipped.length ? '잘림' + a.clipped.length : '',
      a.overTab && a.overTab.length ? '탭바침범' + a.overTab.length : '',
      (a.gapToTab != null && a.gapToTab > 150) ? '하단공백' + a.gapToTab : '',
      a.console && a.console.length ? 'ERR' : '',
    ].filter(Boolean).join(' ') || 'ok';
    console.log(`${sc.id} ${sc.name.padEnd(14)} ${flag}${rec.err ? ' openErr:' + rec.err : ''}`);
  }

  /* 화면비 3종에서 «고정 요소가 안 움직이는가» — 같은 요소의 프레임 y 비교 */
  console.log('\n[화면비 3종 — 고정 요소 프레임 y 변동]');
  for (const r of rows) {
    const A = r.h[2280], B = r.h[1920], C = r.h[2520];
    if (!A || A.missing || !B || B.missing) continue;
    const map = (x) => new Map((x.items || []).map((it) => [it[0] + '@' + it[1], it[2]]));
    const mA = map(A), mB = map(B), mC = map(C || { items: [] });
    const moved = [];
    for (const [k, y] of mA) {
      const yb = mB.get(k), yc = mC.get(k);
      const d1 = yb == null ? null : yb - y, d2 = yc == null ? null : yc - y;
      if ((d1 != null && d1 !== 0) || (d2 != null && d2 !== 0)) moved.push(`${k} Δ1920=${d1} Δ2520=${d2}`);
    }
    console.log(`${r.id} ${r.name}: 이동 ${moved.length}건${moved.length ? ' — ' + moved.slice(0, 6).join(' · ') : ''}`);
  }

  fs.writeFileSync(path.join(ROOT, 'docs', 'shots', '63-report.json'), JSON.stringify(rows, null, 1));
  await browser.close();
})();
