#!/usr/bin/env node
/* 헤드리스 스모크 테스트 — push 전 필수 게이트 (docs/ROUTINE.md [6])
 *
 *   node tools/smoke.js            # 기본: 자동 플레이 20초 + 전 팝업 오픈 + 화면비 2종
 *   SMOKE_SECS=60 node tools/smoke.js
 *
 * 통과 조건 (하나라도 걸리면 exit 1):
 *   1. 콘솔 error / pageerror 0건 (로드·자동 플레이·팝업 오픈 전 구간)
 *   2. 화면 텍스트에 NaN / undefined / Infinity 0건
 *   3. 하단 탭 7종 · 사이드 아이콘 전부 · ▦ 메뉴 · 영웅 서브탭이 에러 없이 열림
 *   4. 9:19(1080×2280 기준)·9:16·16:9 가로·4:3·9:19.5·9:21 에서 #app 이 뷰포트 안에 완전히 들어옴(37 회귀) + 바닥 시트 잘림 없음(51)
 *   5. 자동 플레이 후 게임 상태가 살아 있음 (S.stage 숫자, 플레이어 HP 유한값)
 * 참고: 비평(점수)은 이 스크립트가 하지 않는다. 이건 «깨졌나» 만 본다.
 */
const path = require('path');
const { chromium } = (() => {
  /* 1) 저장소/전역에서 resolve  2) 안 되면 npx 캐시(리눅스 ~/.npm/_npx, 윈도 %LOCALAPPDATA%/npm-cache/_npx)에서 찾기 */
  try { return require('playwright'); } catch (_) {}
  const fs = require('fs'), os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다 — `npm i -D playwright && npx playwright install chromium` 후 재실행');
  process.exit(2);
})();

const SECS = Number(process.env.SMOKE_SECS || 20);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const BAD_TEXT = /\bNaN\b|\bundefined\b|\bInfinity\b/;

const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

async function fresh(browser, vw, vh) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  return { ctx, page, errs };
}

async function badText(page) {
  const t = await page.evaluate(() => document.body.innerText || '');
  const m = t.match(BAD_TEXT);
  return m ? m[0] : null;
}

async function appInside(page) {
  return page.evaluate(() => {
    const a = document.getElementById('app'); if (!a) return 'no #app';
    const r = a.getBoundingClientRect();
    const eps = 1.5;
    if (r.left < -eps || r.top < -eps || r.right > innerWidth + eps || r.bottom > innerHeight + eps)
      return `#app ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} vs viewport ${innerWidth}×${innerHeight}`;
    return null;
  });
}

/* 번들 브라우저를 못 찾는 환경(클라우드 러너는 /opt/pw-browsers 에 미리 깔려 있고
   playwright 버전이 올라가면 기대 경로가 어긋난다) 대비 — 있으면 그걸 쓴다.
   PW_CHROMIUM 으로 강제 지정도 가능. */
function launchOpts(){
  const fs = require('fs');
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const o = launchOpts();
    if (!o.executablePath) throw e;
    console.log('[i] 번들 브라우저 없음 → ' + o.executablePath + ' 사용');
    browser = await chromium.launch(o);
  }
  try {
    /* ---------- 1. 로드 + 자동 플레이 ---------- */
    console.log(`[1] 로드 + 자동 플레이 ${SECS}s (1080×2280 · 9:19 기준)`);
    {
      const { ctx, page, errs } = await fresh(browser, 1080, 2280);
      await page.waitForTimeout(SECS * 1000);
      const st = await page.evaluate(() => ({
        stage: typeof S !== 'undefined' ? S.stage : null,
        hp: typeof player !== 'undefined' ? player.hp : null,
        enemies: typeof enemies !== 'undefined' ? enemies.length : null,
      })).catch((e) => ({ err: String(e) }));
      if (st.err) fail('상태 읽기 실패: ' + st.err);
      else {
        if (!Number.isFinite(st.stage)) fail('S.stage 가 숫자가 아님: ' + st.stage); else ok('S.stage = ' + st.stage);
        if (!Number.isFinite(st.hp)) fail('player.hp 가 유한값이 아님: ' + st.hp); else ok('player.hp = ' + Math.round(st.hp));
      }
      const bt = await badText(page); if (bt) fail('화면 텍스트에 ' + bt); else ok('NaN/undefined/Infinity 없음');
      if (errs.length) errs.forEach((e) => fail('자동 플레이 중 ' + e)); else ok('콘솔 에러 0');
      await ctx.close();
    }

    /* ---------- 2. 팝업 전부 열기 (각각 새 페이지) ---------- */
    console.log('[2] 팝업 오픈');
    const openers = [];
    {
      const { ctx, page } = await fresh(browser, 1080, 2280);
      const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t));
      const pops = await page.$$eval('.side .ibtn[data-pop]', (els) => els.map((e) => e.dataset.pop));
      tabs.forEach((t) => openers.push({ label: 'tab:' + t, sel: `.tab[data-t="${t}"]` }));
      pops.forEach((p) => openers.push({ label: 'side:' + p, sel: `.side .ibtn[data-pop="${p}"]` }));
      if (await page.$('#menub')) openers.push({ label: 'menu', sel: '#menub' });
      /* 33 재화 정보 팝업 — «모든 재화 아이콘» 이 오프너다. 아이콘은 data-cur 속성 하나로 표시되므로
         새 화면이 재화 아이콘을 추가해도 여기 목록이 자동으로 늘어난다(작업 33). */
      const curs = await page.$$eval('[data-cur]', (els) => els.map((e) => e.dataset.cur)).catch(() => []);
      [...new Set(curs)].forEach((c) => openers.push({ label: 'cur:' + c, sel: `[data-cur="${c}"]` }));
      /* 영웅 서브탭 (있으면) */
      const subs = await page.$$eval('#panel [id^="b"][class*="sub"], #panel .sub [data-sub], #panel .subtab', (els) => els.map((e) => e.id || e.dataset.sub || e.textContent.trim()).filter(Boolean)).catch(() => []);
      subs.forEach((s) => openers.push({ label: 'sub:' + s, sel: null, sub: s }));
      /* 06 장비 페이지 — 부위 슬롯 3칸이 각각 05 아이템 팝업(#wpnw)을 연다 (작업 25).
         진입이 «영웅 탭 → 슬롯» 2단계라 위 셀렉터 수집에 안 걸린다. 06 의 서브탭도 같이 본다. */
      await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(400);
      const slots = await page.$$eval('#eqCards [data-eqslot]', (els) => els.map((e) => e.dataset.eqslot)).catch(() => []);
      slots.forEach((k) => openers.push({ label: 'eqslot:' + k, sel: null, hero: `#eqCards [data-eqslot="${k}"]` }));
      const eqtabs = await page.$$eval('#eqTabs [data-eqtab]', (els) => els.map((e) => e.dataset.eqtab)).catch(() => []);
      eqtabs.forEach((k) => openers.push({ label: 'eqtab:' + k, sel: null, hero: `#eqTabs [data-eqtab="${k}"]` }));
      /* 10·13 상점 카테고리 탭 — 상점 페이지(#shopw)를 연 뒤에만 보이므로 2단계 오프너다.
         재화 탭에는 44(다이아 상품 5종 + 마일리지 교환)가 붙어 있어 여기서만 렌더된다. */
      await page.click('.tab[data-t="shop"]', { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(400);
      const cats = await page.$$eval('#shopCats .shp-ct[data-cat]', (els) => els.map((e) => e.dataset.cat)).catch(() => []);
      cats.forEach((k) => openers.push({ label: 'shopcat:' + k, sel: null, shop: `#shopCats .shp-ct[data-cat="${k}"]` }));
      await ctx.close();
    }
    for (const o of openers) {
      const { ctx, page, errs } = await fresh(browser, 1080, 2280);
      try {
        if (o.sel) await page.click(o.sel, { timeout: 3000, force: true });
        else if (o.hero) {
          await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          /* `renderEqPage()` 는 dirty 프레임마다 `#eqCards.innerHTML` 을 통째로 갈아끼운다.
             page.click 은 셀렉터를 한 번 resolve 한 뒤 클릭하므로 그 사이에 노드가 detach 되면
             «Element is not visible» 로 죽는다(자동 플레이 중이라 재렌더가 잦다).
             페이지 안에서 resolve+click 을 한 번에 해 레이스를 없앤다 — 위임 핸들러는 그대로 탄다. */
          const hit = await page.$eval(o.hero, (el) => { el.click(); return true; }).catch(() => false);
          if (!hit) await page.click(o.hero, { timeout: 3000, force: true });
        } else if (o.shop) {
          await page.click('.tab[data-t="shop"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          const hit = await page.$eval(o.shop, (el) => { el.click(); return true; }).catch(() => false);
          if (!hit) await page.click(o.shop, { timeout: 3000, force: true });
        } else {
          await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true }).catch(() => {});
          await page.waitForTimeout(200);
          const el = await page.$(`#${o.sub}`); if (el) await el.click({ force: true });
        }
        await page.waitForTimeout(500);
        const bt = await badText(page);
        if (errs.length) errs.forEach((e) => fail(`${o.label} 열 때 ${e}`));
        else if (bt) fail(`${o.label} 열었더니 화면 텍스트에 ${bt}`);
        else ok(o.label);
      } catch (e) {
        fail(`${o.label} 클릭 실패: ${String(e.message || e).split('\n')[0]}`);
      }
      await ctx.close();
    }

    /* ---------- 3. 화면비 회귀 (37/51) ---------- */
    console.log('[3] 화면비 — #app 이 뷰포트 안에');
    for (const [w, h] of [[1080, 2280], [1080, 1920], [1920, 1080], [1024, 768], [1080, 2340], [1080, 2520]]) {
      const { ctx, page, errs } = await fresh(browser, w, h);
      const r = await appInside(page);
      if (r) fail(`${w}×${h}: ${r}`); else ok(`${w}×${h}`);
      /* 바닥 시트 하나 열어서 프레임 밖 잘림 확인 (51) */
      await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(400);
      const cut = await page.evaluate(() => {
        const app = document.getElementById('app'); if (!app) return null;
        const A = app.getBoundingClientRect();
        const cands = [...document.querySelectorAll('#panel, #trw, #eqw, #relicw, #shopw, #dunw, #ciw')]
          .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
          .filter((e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0; });
        for (const e of cands) {
          const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
          if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5) return `${e.id} top ${Math.round(r.top - A.top)} bottom ${Math.round(r.bottom - A.bottom)} (프레임 기준)`;
        }
        return null;
      });
      if (cut) fail(`${w}×${h}: 바닥 시트가 프레임 밖으로 — ${cut}`); else ok(`${w}×${h} 시트 잘림 없음`);
      if (errs.length) errs.forEach((e) => fail(`${w}×${h}: ${e}`));
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\nSMOKE FAIL — ${fails.length}건` : '\nSMOKE PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('SMOKE CRASH', e); process.exit(2); });
