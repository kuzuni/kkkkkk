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
      /* 52 ▦ 메뉴 8칸 — 메뉴를 연 뒤 칸을 누르는 2단계 오프너. `data-mn` 속성 하나로 표시되므로
         칸이 늘거나 줄면 여기 목록이 자동으로 따라간다(33 «속성 + 위임 핸들러 1개» 방식). */
      const mns = await page.$$eval('#mnw [data-mn]', (els) => els.map((e) => e.dataset.mn)).catch(() => []);
      mns.forEach((k) => openers.push({ label: 'menu:' + k, sel: null, mn: k }));
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
      /* 07·26·50 바닥 시트 «안쪽» 서브탭 바(장비·스킬·코스튬·동료) — 06 시트가 아니라 시트 안에 있어서
         «영웅 탭 → 06 서브탭 → 시트 안 서브탭» 3단계다(작업 50). 코스튬 시트의 [착용]/[구매] 도 같이 본다. */
      await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click()).catch(() => {});
      await page.waitForTimeout(400);
      const costabs = await page.$$eval('#bCos [data-costab]', (els) => els.map((e) => e.dataset.costab)).catch(() => []);
      costabs.forEach((k) => openers.push({ label: 'costab:' + k, sel: null, cos: `#bCos [data-costab="${k}"]` }));
      for (const b of ['data-coswear', 'data-cosbuy', 'data-cosun'])
        if (await page.$(`#bCos [${b}]`)) openers.push({ label: 'cos:' + b, sel: null, cos: `#bCos [${b}]` });
      /* 10·13 상점 카테고리 탭 — 상점 페이지(#shopw)를 연 뒤에만 보이므로 2단계 오프너다.
         재화 탭에는 44(다이아 상품 5종 + 마일리지 교환)가 붙어 있어 여기서만 렌더된다. */
      await page.click('.tab[data-t="shop"]', { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(400);
      const cats = await page.$$eval('#shopCats .shp-ct[data-cat]', (els) => els.map((e) => e.dataset.cat)).catch(() => []);
      cats.forEach((k) => openers.push({ label: 'shopcat:' + k, sel: null, shop: `#shopCats .shp-ct[data-cat="${k}"]` }));
      /* 03 던전 페이지 서브탭(레이드 · 던전) — 던전 페이지를 연 뒤에만 보이는 2단계 오프너다(작업 46).
         «레이드» 칸은 DPS 측정 던전 카드 리스트로 갈아 끼운다. */
      await page.click('.tab[data-t="adv"]', { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(400);
      const dsubs = await page.$$eval('#dunSub [data-dsub]', (els) => els.map((e) => e.dataset.dsub)).catch(() => []);
      dsubs.forEach((k) => openers.push({ label: 'dunsub:' + k, sel: null, dun: `#dunSub [data-dsub="${k}"]` }));
      /* 23 훈련 시트 서브탭(훈련 · 스탯 훈련) — 훈련 시트를 연 뒤에만 보이는 2단계 오프너다(작업 47).
         «스탯 훈련» 칸은 카드 3장의 재화를 골드 → 스탯 포인트로 갈아 끼운다. */
      await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(400);
      const tsubs = await page.$$eval('#trSub [data-trsub]', (els) => els.map((e) => e.dataset.trsub)).catch(() => []);
      tsubs.forEach((k) => openers.push({ label: 'trsub:' + k, sel: null, tr: `#trSub [data-trsub="${k}"]` }));
      /* 19 프로필(#pfw) · 20 스펙 정보(#specw) — 상단 HUD 초상화가 19 를 열고, 19 의 하단 토글이 20 을 연다.
         둘 다 위 셀렉터 수집(.tab/.side/[data-cur])에 안 걸리는 오프너다(작업 20). */
      if (await page.$('#profBtn')) {
        openers.push({ label: 'prof:19', sel: '#profBtn' });
        openers.push({ label: 'prof:20-스펙', sel: null, prof: '.pf-tgl>.lb' });
      }
      /* 21 도감 보너스 팝업(#collw) — 진입이 «보물상자 탭 → [📖 세트 도감]» 2단계라 위 수집에 안 걸린다.
         팝업 안의 깃발 서브탭 4개(무기·방어구·스킬·동료)도 각각 오프너로 돈다(작업 21). */
      await page.click('.tab[data-t="box"]', { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(400);
      if (await page.$('[data-opencoll]')) {
        openers.push({ label: 'coll21', sel: null, coll: true });
        const cts = await page.$$eval('#collTabs .cltab[data-ct]', (els) => els.map((e) => e.dataset.ct)).catch(() => []);
        cts.forEach((k) => openers.push({ label: 'colltab:' + k, sel: null, coll: `#collTabs .cltab[data-ct="${k}"]` }));
      }
      /* 22 퀘스트 팝업의 하단 2분할 토글(일일 · 반복) — 팝업을 연 뒤에만 보이는 2단계 오프너다(작업 22).
         «일일» 칸은 리스트를 일일 퀘스트 5행(다른 데이터 소스)으로 통째로 갈아 끼운다. */
      openers.push({ label: 'qtab:daily', sel: null, quest: 'daily' });
      openers.push({ label: 'qtab:rep', sel: null, quest: 'rep' });
      /* 35 패스 페이지(#psw) — 진입이 «▦ 메뉴 → 🎫 패스» 2단계라 위 수집(.tab/.side/[data-cur])에 안 걸린다.
         하단 패스 종류 탭 4칸(스테이지·보물상자🔒·시련의탑🔒·출석)과 뒤로가기까지 전부 돈다(작업 35). */
      if (await page.$('#psw')) {
        openers.push({ label: 'pass:35', sel: null, pass: true });
        for (const k of ['stage', 'box', 'tower', 'att'])
          openers.push({ label: 'ptab:' + k, sel: null, pass: `#psBar [data-ptab="${k}"]` });
        openers.push({ label: 'pass:back', sel: null, pass: '#psBar [data-pback]' });
      }
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
        } else if (o.mn) {
          /* 위임 핸들러(.mn-col)를 타야 하므로 query 와 click 을 같은 evaluate 안에서(LESSONS 50-①) */
          await page.evaluate(() => document.querySelector('#menub').click());
          await page.waitForTimeout(320);
          await page.evaluate((k) => document.querySelector(`#mnw [data-mn="${k}"]`).click(), o.mn);
        } else if (o.dun) {
          await page.click('.tab[data-t="adv"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          const hit = await page.$eval(o.dun, (el) => { el.click(); return true; }).catch(() => false);
          if (!hit) await page.click(o.dun, { timeout: 3000, force: true });
        } else if (o.tr) {
          await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          const hit = await page.$eval(o.tr, (el) => { el.click(); return true; }).catch(() => false);
          if (!hit) await page.click(o.tr, { timeout: 3000, force: true });
        } else if (o.pass) {
          /* 35 — «▦ 메뉴 → 🎫 패스» 로 페이지를 연 뒤, 필요하면 하단 패스 탭까지 한 번 더 누른다.
             query+click 을 한 evaluate 안에 넣는다(LESSONS 50-①). */
          await page.evaluate(() => document.getElementById('menub').click());
          await page.waitForTimeout(300);
          await page.evaluate(() => document.getElementById('psGo').click());
          await page.waitForTimeout(400);
          if (typeof o.pass === 'string') await page.evaluate((s) => document.querySelector(s).click(), o.pass);
        } else if (o.cos) {
          /* `page.$eval` 은 «resolve → 평가» 2왕복이라 그 사이 `renderCos()` 가 innerHTML 을 갈아끼우면
             detach 된 노드를 클릭하게 되고 위임 핸들러가 안 탄다. query+click 을 한 evaluate 에 넣는다. */
          await page.click('.tab[data-t="hero"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click());
          await page.waitForTimeout(400);
          await page.evaluate((s) => document.querySelector(s).click(), o.cos);
        } else if (o.prof) {
          /* 2단계 — HUD 초상화로 19 를 연 뒤 하단 토글 «종합 스탯» 으로 20 으로 넘어간다 */
          await page.click('#profBtn', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          await page.evaluate((s) => document.querySelector(s).click(), o.prof);
        } else if (o.coll) {
          /* 보물상자 탭 → [📖 세트 도감] → (탭 오프너면) 깃발 서브탭까지 (작업 21) */
          await page.click('.tab[data-t="box"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          await page.evaluate(() => document.querySelector('[data-opencoll]').click());
          await page.waitForTimeout(400);
          if (typeof o.coll === 'string') await page.evaluate((s) => document.querySelector(s).click(), o.coll);
        } else if (o.quest) {
          /* 사이드 «퀘스트» → 팝업 하단 토글. «반복» 은 기본 선택이라 그냥 누르면 no-op 이므로
             일일을 먼저 눌러 갔다가 되돌아오는 경로까지 본다(작업 22). */
          await page.click('.side .ibtn[data-pop="quest"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          if (o.quest === 'rep') {
            await page.evaluate(() => document.querySelector('.qs-tg b[data-t="daily"]').click());
            await page.waitForTimeout(300);
          }
          await page.evaluate((t) => document.querySelector(`.qs-tg b[data-t="${t}"]`).click(), o.quest);
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

    /* ---------- 2-1. 던전 입장 화면 (작업 30) ----------
       04 [도전] → 30초 제한 전투 «런» 이라 탭/사이드 오프너 수집에 안 걸린다.
       상단 HUD·탭바가 통째로 사라지는 유일한 상태라 여기서 별도로 본다. */
    console.log('[2-1] 던전 입장 화면(30)');
    {
      const { ctx, page, errs } = await fresh(browser, 1080, 2280);
      const enter = await page.evaluate(() => {
        if (typeof challengeDungeon !== 'function' || typeof DUNGEONS === 'undefined') return 'challengeDungeon 없음';
        const d = DUNGEONS[0]; S.daily.dun[d.id] = 3;
        challengeDungeon(d);
        return (typeof dunRun !== 'undefined' && dunRun) ? null : '던전 런이 시작되지 않음';
      }).catch((e) => String(e.message || e));
      if (enter) fail('던전 입장: ' + enter);
      else {
        await page.waitForTimeout(700);
        const st = await page.evaluate(() => {
          const app = document.getElementById('app'), A = app.getBoundingClientRect();
          const vis = (id) => { const e = document.getElementById(id); const r = e && e.getBoundingClientRect(); return !!(r && r.width); };
          const outs = [];
          for (const id of ['dunHud', 'dunBar', 'dunTm', 'dunOut']) {
            const e = document.getElementById(id); if (!e) { outs.push(id + ' 없음'); continue; }
            const r = e.getBoundingClientRect();
            if (!r.width) { outs.push(id + ' 안 보임'); continue; }
            if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5 || r.left < A.left - 1.5 || r.right > A.right + 1.5)
              outs.push(id + ' 프레임 밖');
          }
          if (vis('top')) outs.push('상단 HUD 가 안 숨겨짐');
          if (vis('tabbar')) outs.push('탭바가 안 숨겨짐');
          return outs;
        });
        st.length ? st.forEach((m) => fail('던전 입장: ' + m)) : ok('던전 HUD 표시 + 상단 HUD·탭바 숨김 + 프레임 안');
        const bt = await badText(page);
        if (bt) fail('던전 입장 화면 텍스트에 ' + bt); else ok('던전 입장 NaN/undefined 없음');
        const back = await page.evaluate(async () => {
          document.getElementById('dunOut').click();
          await new Promise((r) => setTimeout(r, 400));
          const vis = (id) => { const e = document.getElementById(id); const r = e && e.getBoundingClientRect(); return !!(r && r.width); };
          return { run: typeof dunRun !== 'undefined' && !!dunRun, top: vis('top'), tab: vis('tabbar') };
        });
        (!back.run && back.top && back.tab) ? ok('나가기 → 기본 화면 복귀') : fail('던전 나가기 후 상태 이상: ' + JSON.stringify(back));
        if (errs.length) errs.forEach((e) => fail('던전 입장 중 ' + e)); else ok('던전 입장 콘솔 에러 0');
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
      /* 21 도감 팝업은 모달 «밑으로» 깃발탭이 145px 삐져나오는 유일한 껍데기라 화면비마다 같이 본다 */
      await page.evaluate(() => { if (typeof openColl21 === 'function') openColl21('armor'); }).catch(() => {});
      /* 34 축복 팝업은 «팝업 + 팝업 밖 초록 스트립 + 닫기 X» 블록 1574px 이라 짧은 프레임에서 제일 먼저 넘친다 */
      await page.evaluate(() => { if (typeof openBless === 'function') openBless(); }).catch(() => {});
      /* 53 가방 팝업은 948×967 가운데 다이얼로그라 짧은 프레임(1600)에서 max-height 로 눌린다 —
         눌렸을 때 격자가 프레임 밖으로 나가지 않는지 화면비마다 같이 본다(LESSONS 22-4). */
      await page.evaluate(() => { if (typeof openBag === 'function') openBag(); }).catch(() => {});
      await page.waitForTimeout(300);
      const cut = await page.evaluate(() => {
        const app = document.getElementById('app'); if (!app) return null;
        const A = app.getBoundingClientRect();
        const cands = [...document.querySelectorAll('#panel, #trw, #eqw, #relicw, #shopw, #dunw, #ciw, #pfw, #specw, #collw .cl, #collw .cl-tabs, #dunHud, #dunOut, #blsw .bls, #mnw .mn-col, #bagw .bg53, #bagw .bg53-tabs')]
          .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
          .filter((e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0; });
        for (const e of cands) {
          const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
          if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5) return `${e.id || e.className} top ${Math.round(r.top - A.top)} bottom ${Math.round(r.bottom - A.bottom)} (프레임 기준)`;
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
