#!/usr/bin/env node
/* 작업 74 — «눌림 효과는 뜨는데 실제 동작이 안 되는» 탭 유실 검증 게이트
 *
 *   node tools/verify74.js               # 200회/대상 (기본)
 *   TAP_N=50 node tools/verify74.js      # 횟수 조절
 *   TAP_HOLD=90 node tools/verify74.js   # 손가락 접촉 시간(ms) — 실제 탭 ~80~120ms
 *
 * 재현 조건(PROGRESS 74 비고): 자동 전투 중 uiDirty 재렌더가 도는 채로,
 * Playwright «터치» 에뮬레이션(CDP dispatchTouchEvent, hold 90ms)으로 탭한다.
 * 헤드리스 마우스 클릭(page.click)은 down↔up 이 같은 tick 이라 재현되지 않는다.
 *
 * 측정: document 캡처 단계에서 «click 이 의도한 요소(e.target.closest(sel))에 도달했는가» 를 센다.
 *  - down↔up 사이에 innerHTML 재렌더로 노드가 갈리면 click 은 공통 조상(컨테이너)에서 발화해
 *    closest(sel) 이 비고, 위임/직결 핸들러 모두 빈손이 된다 — 그게 이 버그다.
 *  - 훈련 ↑ 만은 pointerdown 구매(작업 64)라 «골드가 실제로 줄었는가» 로 센다.
 * 대상 6종: ①스킬 패널 장착 행(0.35s 재렌더 전형) ②퀘스트 토글(수령 팝업, 이벤트 재렌더)
 *          ③상점 카테고리 탭 ④상점 카드(🔍 확률 보기) ⑤탭바 ⑥사이드 아이콘 · ⑦훈련 ↑
 * 통과: 모든 대상 성공률 100% + 콘솔 에러 0
 */
const path = require('path');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const fs = require('fs'), os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음 — npm i --no-save playwright'); process.exit(2);
})();

const FILE = process.env.TAP_FILE || 'index.html';   /* before/after 비교용 — 저장소 루트 기준 상대경로 */
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const N = Number(process.env.TAP_N || 200);
const HOLD = Number(process.env.TAP_HOLD || 90);
const PTR = process.env.TAP_PTR || 'touch';        /* touch | mouse — 실기기 터치와 데스크톱 마우스 의미론이 다르다 */

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    S.gold = 1e13; S.dia = 1e9; uiDirty = true;
    window.__hits = 0; window.__sel = '';
    document.addEventListener('click', e => {
      if (window.__sel && e.target && e.target.closest && e.target.closest(window.__sel)) window.__hits++;
    }, true);
  });
  const cdp = await ctx.newCDPSession(page);
  const tap = PTR === 'mouse'
    ? async (x, y) => {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await new Promise(r => setTimeout(r, HOLD));
        await page.mouse.up();
      }
    : async (x, y) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await new Promise(r => setTimeout(r, HOLD));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
  const rectOf = (sel, i) => page.evaluate(([s, idx]) => {
    const list = document.querySelectorAll(s);
    const el = list[Math.min(idx, list.length - 1)];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [sel, i || 0]);

  const results = [];
  async function run(name, { setup, targets, countSel, between, metric, gap }) {
    await page.evaluate(setup);
    await page.waitForTimeout(600);
    let okCnt = 0, miss = 0;
    for (let i = 0; i < N; i++) {
      const sel = targets[i % targets.length];
      const p = await rectOf(sel.q, sel.i || 0);
      if (!p) { miss++; continue; }
      let before;
      if (metric) before = await page.evaluate(metric);
      else await page.evaluate(s => { window.__sel = s; window.__hits = 0; }, countSel);
      await tap(p.x, p.y);
      await page.waitForTimeout(50);
      if (metric) { const after = await page.evaluate(metric); if (after !== before) okCnt++; }
      else { if (await page.evaluate(() => window.__hits) > 0) okCnt++; }
      if (between) await page.evaluate(between);
      /* 닫힘 애니메이션(jzClose)이 도는 동안 오버레이가 다음 탭을 가로챈다 — 가라앉을 때까지 쉰다.
         (이건 버그가 아니라 하네스 페이스 문제다: 사람은 팝업이 닫히는 걸 보고 다음 탭을 한다) */
      if (gap) await page.waitForTimeout(gap);
    }
    await page.evaluate(() => { window.__sel = ''; });
    const rate = (okCnt / N * 100).toFixed(1);
    results.push({ name, okCnt, rate, miss });
    console.log(`  ${okCnt === N ? '✓' : '✗'} ${name}: ${okCnt}/${N} (${rate}%)` + (miss ? ` · 대상 미발견 ${miss}` : ''));
  }

  /* ① 스킬 패널 장착/해제 행 — renderUI 가 0.35s 마다 setBody 로 통째 재작성하는 전형 */
  await run('스킬 패널 행(0.35s 재렌더)', {
    setup: () => { closeShopPage(); closeTrain(); closeDungeon(); closeRelicPage(); closeRelicTab();
      heroTab = 'sk'; S.heroTab = 'sk'; curTab = 'hero'; panelOpen = true; syncPanel(); uiDirty = true; renderUI(); },
    targets: [{ q: '#bSk [data-skeq], #bSk [data-skun]' }],
    countSel: '#bSk [data-skeq], #bSk [data-skun]',
  });

  /* ② 퀘스트 팝업 일일/반복 토글 — 성공할 때마다 openQuest() 가 mbox 를 통째 재작성 + 전투 이벤트 재렌더 */
  await run('퀘스트 토글(이벤트 재렌더)', {
    setup: () => { panelOpen = false; syncPanel(); openQuest('rep'); },
    targets: [{ q: '#mbox .qs-tg b[data-t="daily"]' }, { q: '#mbox .qs-tg b[data-t="rep"]' }],
    countSel: '#mbox .qs-tg b',
  });

  /* ③ 상점 카테고리 탭 — 성공 시 renderShopPage() 전체 재작성 */
  await run('상점 카테고리 탭', {
    setup: () => { closeModal(); openShopPage(); },
    targets: [{ q: '#shopCats [data-cat="coin"]' }, { q: '#shopCats [data-cat="summon"]' }],
    countSel: '#shopCats [data-cat]',
  });

  /* ④ 상점 카드 🔍(소환 확률) — 카드 자체는 재화 변동 재렌더 대상 */
  await run('상점 카드 🔍', {
    setup: () => { openShopPage(); },
    targets: [{ q: '#shopList .shp-card [data-shinfo]' }],
    countSel: '#shopList [data-shinfo]',
    between: () => { if (typeof closeProbInfo === 'function') closeProbInfo(); },
    gap: 400,
  });

  /* ⑤ 탭바 — 던전/보물상자 페이지 왕복 */
  await run('탭바 탭', {
    setup: () => { closeShopPage(); if (typeof closeProbInfo === 'function') closeProbInfo(); },
    targets: [{ q: '.tab[data-t="adv"]' }, { q: '.tab[data-t="box"]' }],
    countSel: '.tab',
  });

  /* ⑥ 사이드 아이콘(퀘스트) — 직결 onclick, 성공 시 모달이 열리므로 매회 닫는다 */
  await run('사이드 아이콘', {
    setup: () => { closeDungeon(); closeRelicPage(); closeRelicTab(); closeModal(); },
    targets: [{ q: '#sideL .ibtn[data-pop="quest"]' }],
    countSel: '#sideL .ibtn[data-pop]',
    between: () => closeModal(),
    gap: 400,
  });

  /* ⑦ 훈련 ↑ — 작업 64 가 pointerdown 구매로 바꿔 둠 → 골드 감소로 판정 */
  await run('훈련 카드 ↑(pointerdown 구매)', {
    setup: () => { closeModal(); goTab('grow'); S.gold = 1e13; S.trainStage = 9999; /* 상한(full) 정지 배제 — 유실만 잰다 */ },
    targets: [{ q: '#trw [data-tr] .tr-up, #trw [data-tr]' }],
    metric: () => S.gold,
  });

  await browser.close();

  console.log('');
  const bad = results.filter(r => r.okCnt !== N);
  if (errs.length) console.log('  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  if (!bad.length && !errs.length) { console.log('VERIFY74 PASS — 전 대상 ' + N + '/' + N); process.exit(0); }
  console.log('VERIFY74 FAIL — ' + bad.map(r => `${r.name} ${r.okCnt}/${N}`).join(' · '));
  process.exit(1);
})();
