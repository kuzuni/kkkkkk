#!/usr/bin/env node
/* 헤드리스 스모크 테스트 — push 전 필수 게이트 (docs/ROUTINE.md [6])
 *
 *   node tools/smoke.js            # 기본: 자동 플레이 20초 + 전 팝업 오픈 + 화면비 2종
 *   SMOKE_SECS=60 node tools/smoke.js
 *
 * 통과 조건 (하나라도 걸리면 exit 1):
 *   1. 콘솔 error / pageerror 0건 (로드·자동 플레이·팝업 오픈 전 구간)
 *   2. 화면 텍스트에 NaN / undefined / Infinity 0건
 *   3. 하단 탭 7종 · 사이드 아이콘 전부 · ▦ 메뉴 · 영웅 서브탭이 에러 없이 열림 + 런 화면 2종(30 던전 · 123 아레나)
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

/* ---------- 0. 정적 문법 — 브라우저를 띄우기 전에 본다 ----------
   CSS 의 «닫히지 않은 / 이미 닫힌» 주석은 **브라우저가 조용히 삼킨다**: 콘솔 에러도 없고
   페이지도 뜨는데 그 뒤 규칙 하나가 통째로 사라진다. 작업 92 에서 긴 설명 주석을 덧붙이다
   «닫는 표시» 뒤에 산문을 이어 써서 **네 번** 재발했고, 그때마다 애니메이션이 «안 도는» 것처럼 보였다.
   여는 표시와 닫는 표시 **개수만 세도** 전부 잡힌다. (JS 는 파싱해서 본다.)
   — 이 주석 안에 그 두 기호를 «그대로» 쓰면 여기서도 같은 사고가 난다. 실제로 났다. */
function staticSyntax() {
  console.log('[0] 정적 문법 — CSS 주석 균형 · 인라인 JS 파싱');
  const fsx = require('fs');
  const h = fsx.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].forEach((m, i) => {
    const o = (m[1].match(/\/\*/g) || []).length, c = (m[1].match(/\*\//g) || []).length;
    if (o === c) ok('<style> ' + i + ' 주석 균형 (' + o + '쌍)');
    else fail('<style> ' + i + ' 주석 불균형 — 여는 ' + o + ' vs 닫는 ' + c + ' (규칙이 조용히 사라진다)');
  });
  [...h.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    try { new Function(m[1]); ok('<script> ' + i + ' 파싱 OK'); }
    catch (e) { fail('<script> ' + i + ' 파싱 실패 — ' + e.message); }
  });
}

(async () => {
  staticSyntax();
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
      /* 103 채팅 페이지 — 02 좌하단 💬 가 오프너다(.tab/.side/[data-cur] 수집에 안 걸린다) */
      if (await page.$('#chw')) openers.push({ label: 'util:chat', sel: '#botleft .ubtn[data-util="chat"]' });
      /* 52 ▦ 메뉴 8칸 — 메뉴를 연 뒤 칸을 누르는 2단계 오프너. `data-mn` 속성 하나로 표시되므로
         칸이 늘거나 줄면 여기 목록이 자동으로 따라간다(33 «속성 + 위임 핸들러 1개» 방식). */
      const mns = await page.$$eval('#mnw [data-mn]', (els) => els.map((e) => e.dataset.mn)).catch(() => []);
      mns.forEach((k) => openers.push({ label: 'menu:' + k, sel: null, mn: k }));
      /* 33 재화 정보 팝업 — «모든 재화 아이콘» 이 오프너다. 아이콘은 data-cur 속성 하나로 표시되므로
         새 화면이 재화 아이콘을 추가해도 여기 목록이 자동으로 늘어난다(작업 33). */
      const curs = await page.$$eval('[data-cur]', (els) => els.map((e) => e.dataset.cur)).catch(() => []);
      /* 89 — «유물조각» 알약은 #relw 페이지 안에만 있어 유물 탭을 먼저 연다(pre) */
      [...new Set(curs)].forEach((c) => openers.push({ label: 'cur:' + c, sel: `[data-cur="${c}"]`,
        pre: c === 'relic' ? '.tab[data-t="box"]' : null }));
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
         «영웅 탭 → 06 서브탭 → 시트 안 서브탭» 3단계다(작업 50). 코스튬 시트의 [착용]/[강화] 도 같이 본다
         (182 — [구매] 폐지로 두 번째 버튼이 `data-cospromo` · 194 — 그 자리가 **`data-cosup`([강화])** 로 바뀌었다.
          목록에 셋을 다 두는 이유: 있는 것만 오프너로 잡히므로 옛 이름이 남아도 조용히 건너뛴다). */
      await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="cos"]').click()).catch(() => {});
      await page.waitForTimeout(400);
      const costabs = await page.$$eval('#bCos [data-costab]', (els) => els.map((e) => e.dataset.costab)).catch(() => []);
      costabs.forEach((k) => openers.push({ label: 'costab:' + k, sel: null, cos: `#bCos [data-costab="${k}"]` }));
      /* 269 — 코스튬 시트 헤더 좌상단 [?] 도움말도 팝업 오프너다(신설 팝업은 여기 등재하는 것까지가 범위) */
      for (const b of ['data-coswear', 'data-cosup', 'data-cospromo', 'data-cosun', 'data-coshelp'])
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
      /* 203 — 23 훈련 팝업(#trw) 안의 «훈련 · 룬» 탭. 진입이 «훈련 탭 → 팝업 안 서브탭» 2단계라
         위 수집(.tab/.side/[data-cur])에 안 걸린다. 칸이 늘면 이 목록이 자동으로 따라간다. */
      const tsubs = await page.$$eval('#trSubs [data-trsub]', (els) => els.map((e) => e.dataset.trsub)).catch(() => []);
      tsubs.forEach((k) => openers.push({ label: 'trsub:' + k, sel: null, tr: `#trSubs [data-trsub="${k}"]` }));
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
      /* 429 — 89 유물 페이지(#relw) 좌상단 [?] 도움말이 여는 A5 팝업. 진입이 «보물상자 탭 → [?]»
         2단계라 위 수집(.tab/.side/[data-cur])에 안 걸린다(269 [?] 를 여기 등재한 것과 같은 자리). */
      if (await page.$('#relw [data-rlhelp]'))
        openers.push({ label: 'rel:help', sel: null, rel: '#relw [data-rlhelp]' });
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
         하단 패스 종류 탭 4칸과 뒤로가기까지 전부 돈다(작업 35).
         428(주인 지시 2026-08-30) — 잠겨 있던 «보물상자🔒·시련의탑🔒» 두 칸이 **두 탑의 실제 패스 탭**
         (tower·tower2)이 됐다. 죽은 키 `box` 를 그대로 두면 여기서 `null.click()` 으로 즉사한다. */
      if (await page.$('#psw')) {
        openers.push({ label: 'pass:35', sel: null, pass: true });
        for (const k of ['stage', 'tower', 'tower2', 'att'])
          openers.push({ label: 'ptab:' + k, sel: null, pass: `#psBar [data-ptab="${k}"]` });
        openers.push({ label: 'pass:back', sel: null, pass: '#psBar [data-pback]' });
      }
      await ctx.close();
    }
    for (const o of openers) {
      const { ctx, page, errs } = await fresh(browser, 1080, 2280);
      try {
        if (o.sel) {
          if (o.pre) { await page.click(o.pre, { timeout: 3000, force: true }); await page.waitForTimeout(400); }
          await page.click(o.sel, { timeout: 3000, force: true });
        }
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
          /* 203 — 하단 «훈련» 탭이 23 팝업을 열고, 그 안의 서브탭을 한 번 더 누른다.
             query+click 을 한 evaluate 안에서 한다(renderTrain 이 본문을 갈아끼운다 — LESSONS 50-①). */
          await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          await page.evaluate((s2) => { const el = document.querySelector(s2); if (el) el.click(); }, o.tr);
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
        } else if (o.rel) {
          /* 429 — «보물상자 탭 → 89 유물 페이지 → 좌상단 [?]». query+click 을 한 evaluate 안에서(LESSONS 50-①) */
          await page.click('.tab[data-t="box"]', { timeout: 3000, force: true });
          await page.waitForTimeout(400);
          await page.evaluate((s) => document.querySelector(s).click(), o.rel);
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
        const d = DUNGEONS[0]; S.dunTk[d.id] = 3;
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

    /* ---------- 2-2. 아레나 입장 화면 (작업 123) ----------
       «컨텐츠» 탭 → 아레나 [도전] → 30초 1:1 대전 «런». 던전 런과 같은 상태(#app.dunrun)를 쓰되
       HUD 가 통째로 다르므로(양쪽 닉네임·HP 바) 여기서 별도로 본다. */
    console.log('[2-2] 아레나 입장 화면(123)');
    {
      const { ctx, page, errs } = await fresh(browser, 1080, 2280);
      const enter = await page.evaluate(() => {
        if (typeof startArena !== 'function' || typeof ARENA === 'undefined') return 'startArena 없음';
        S.best = 999;
        startArena();
        return (typeof arena !== 'undefined' && arena) ? null : '아레나가 시작되지 않음';
      }).catch((e) => String(e.message || e));
      if (enter) fail('아레나 입장: ' + enter);
      else {
        await page.waitForTimeout(700);
        const st = await page.evaluate(() => {
          const app = document.getElementById('app'), A = app.getBoundingClientRect();
          const vis = (id) => { const e = document.getElementById(id); const r = e && e.getBoundingClientRect(); return !!(r && r.width); };
          const outs = [];
          for (const id of ['arnHud', 'arnTm', 'arnHpL', 'arnHpR', 'dunOut']) {
            const e = document.getElementById(id); if (!e) { outs.push(id + ' 없음'); continue; }
            const r = e.getBoundingClientRect();
            if (!r.width) { outs.push(id + ' 안 보임'); continue; }
            if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5 || r.left < A.left - 1.5 || r.right > A.right + 1.5)
              outs.push(id + ' 프레임 밖');
          }
          if (vis('dunHud')) outs.push('던전 HUD 가 같이 떠 있음');
          if (vis('top')) outs.push('상단 HUD 가 안 숨겨짐');
          if (vis('tabbar')) outs.push('탭바가 안 숨겨짐');
          if (!document.getElementById('arnNmR').textContent.trim()) outs.push('상대 닉네임이 비어 있음');
          return outs;
        });
        st.length ? st.forEach((m) => fail('아레나 입장: ' + m)) : ok('아레나 HUD 표시 + 던전 HUD 숨김 + 상단 HUD·탭바 숨김 + 프레임 안');
        const bt = await badText(page);
        if (bt) fail('아레나 입장 화면 텍스트에 ' + bt); else ok('아레나 입장 NaN/undefined 없음');
        const back = await page.evaluate(async () => {
          document.getElementById('dunOut').click();
          await new Promise((r) => setTimeout(r, 400));
          const vis = (id) => { const e = document.getElementById(id); const r = e && e.getBoundingClientRect(); return !!(r && r.width); };
          return { run: typeof arena !== 'undefined' && !!arena, top: vis('top'), tab: vis('tabbar') };
        });
        (!back.run && back.top && back.tab) ? ok('나가기 → 기본 화면 복귀') : fail('아레나 나가기 후 상태 이상: ' + JSON.stringify(back));
        if (errs.length) errs.forEach((e) => fail('아레나 입장 중 ' + e)); else ok('아레나 입장 콘솔 에러 0');
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
      /* 69 우편함은 A5 공용 모달을 쓰되 ✕ 가 상자 «바닥 테두리에 걸쳐» 밖으로 나가는 유일한 모달이라
         (상자 1310 + ✕ 아래 절반 58) 짧은 프레임에서 같이 본다. #bagw 와 오버레이가 달라 겹치지 않는다. */
      await page.evaluate(() => { if (typeof openMail === 'function') openMail(); }).catch(() => {});
      /* 55 설정은 798×1347 — 지금까지 중 «가장 키가 큰» 가운데 다이얼로그라 짧은 프레임(1600)에서
         max-height 로 제일 많이 눌린다. 눌린 상자가 프레임 밖으로 나가지 않는지 화면비마다 본다. */
      await page.evaluate(() => { if (typeof openConf === 'function') openConf(); }).catch(() => {});
      /* 54 랭킹은 «전체화면 페이지 + bottom 앵커 3장» 이라 짧은 프레임에서 리스트 패널만 줄어야 한다
         (LESSONS 22-④). 패널 높이가 음수로 접히면 여기서 잡힌다. */
      await page.evaluate(() => { if (typeof openRank === 'function') openRank(); }).catch(() => {});
      /* 103 채팅은 «전체화면 페이지 + bottom 앵커 입력 바» 라 짧은 프레임에서 리스트만 줄어야 한다.
         입력 바(186px)가 프레임 밖으로 밀리거나 리스트 높이가 음수로 접히면 여기서 잡힌다. */
      await page.evaluate(() => { if (typeof openChat === 'function') openChat(); }).catch(() => {});
      /* ⚠ 300ms 는 60 쥬시의 개봉 연출(`jz-o …`, 최대 ~600ms)이 **아직 도는 중**이라
         마지막에 연 오버레이가 scale 구간에서 잡혀 «프레임 밖» 오검출이 났다
         (1920×1080 에서 #chw top −10 — 700ms 뒤 재측정하면 정확히 0). 연출이 끝난 뒤 잰다.
         ⚠⚠ 작업 135 — **고정 800ms 로는 부족하다.** 오버레이 7개를 연달아 열면 아바타 캔버스·
         아틀라스 때문에 메인 스레드가 막혀 CSS 애니메이션의 «첫 프레임» 자체가 밀린다:
         프로브 실측(`node tools/probe135.js`)에서 `jzBoxIn` 이 **420ms 동안 currentTime 0** 에
         멈춰 있다가 t≈450 에야 출발했다 → 800ms 시점이 연출 한복판이라 3~6회에 1회 FAIL 이 났다.
         시계로 기다리지 말고 **`jz*` 애니메이션이 실제로 다 끝날 때까지** 기다린다(상한 3초). */
      await page.waitForFunction(() => {
        const app = document.getElementById('app'); if (!app) return true;
        return !app.getAnimations({ subtree: true })
          .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
            && a.effect && a.effect.getTiming().iterations !== Infinity);
      }, null, { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(120);
      const cut = await page.evaluate(() => {
        const app = document.getElementById('app'); if (!app) return null;
        const A = app.getBoundingClientRect();
        /* ⚠ 작업 241(2026-08-27) — 후보에 **오버레이를 적으면 안 된다.**
           `#pfw{inset:0}`·`#trw{top:0;bottom:180}`·`#shopw{top:104;bottom:180}` 는 전부
           프레임에 앵커된 껍데기라 «항상 프레임과 같은 크기» 다 → 그 팝업은 **원리적으로
           절대 안 걸린다**(189-③ «헛초록»). 실제로 19 프로필 `.pf` 가 9:16 에서 바닥 227px
           잘려 있는데도 이 절은 계속 초록이었다 — `#pfw` 를 재고 있었기 때문이다.
           그래서 껍데기 8개를 전부 **안쪽 박스**로 바꿨다(오버레이 → 내용이 든 상자):
             #pfw→.pf · #specw→.spc · #ciw→.ci · #trw→.tr-sheet · #eqw→.eqp
             · #shopw→.shp-list · #dunw→.dns-list · #relw→.rw-grid
           전수 확인은 `node tools/audit241.js`(읽기 전용) — 화면비 4종 × 상자 22개. */
        const cands = [...document.querySelectorAll('#panel, #trw .tr-sheet, #eqw .eqp, #relw .rw-grid, #shopw .shp-list, #dunw .dns-list, #ciw .ci, #pfw .pf, #specw .spc, #collw .cl, #collw .cl-tabs, #dunHud, #dunOut, #blsw .bls, #mnw .mn-col, #bagw .bg53, #cfw .cf55, #modal.ml69 .mbox, #modal.ml69 .ml-close, #rkw .rk-panel, #rkw .rk-me, #rkw .rk-nav, #chw .ch-list, #chw .ch-bar')]
          .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
          .filter((e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0; });
        for (const e of cands) {
          const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
          if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5) return `${e.id || e.className} top ${Math.round(r.top - A.top)} bottom ${Math.round(r.bottom - A.bottom)} (프레임 기준)`;
        }
        return null;
      });
      if (cut) fail(`${w}×${h}: 바닥 시트가 프레임 밖으로 — ${cut}`); else ok(`${w}×${h} 시트 잘림 없음`);
      /* 56 절전 모드는 «아래 레이어를 통째로 visibility:hidden» 으로 눕히는 유일한 오버레이라
         위 후보들과 같이 열면 서로의 검사를 지운다 — 그래서 따로 열고 자기 요소만 본다.
         짧은 프레임(1600)에서 시계·패널·하단 안내가 프레임 밖으로 나가지 않는지가 요지다. */
      const svCut = await page.evaluate(() => {
        if (typeof openSaver !== 'function') return null;
        openSaver();
        const app = document.getElementById('app'), A = app.getBoundingClientRect();
        let bad = null;
        for (const sel of ['#svw .sv-bat', '#svw .sv-clk', '#svw .sv-dt', '#svw .sv-st', '#svw .sv-p', '#svw .sv-hint']) {
          const e = document.querySelector(sel); if (!e) continue;
          const r = e.getBoundingClientRect();
          if (r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5) {
            bad = `${sel} top ${Math.round(r.top - A.top)} bottom ${Math.round(r.bottom - A.bottom)}`; break;
          }
        }
        closeSaver();
        return bad;
      }).catch((e) => 'openSaver 실패: ' + String(e.message || e));
      if (svCut) fail(`${w}×${h}: 절전 모드가 프레임 밖으로 — ${svCut}`); else ok(`${w}×${h} 절전 모드 잘림 없음`);
      if (errs.length) errs.forEach((e) => fail(`${w}×${h}: ${e}`));
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(fails.length ? `\nSMOKE FAIL — ${fails.length}건` : '\nSMOKE PASS');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('SMOKE CRASH', e); process.exit(2); });
