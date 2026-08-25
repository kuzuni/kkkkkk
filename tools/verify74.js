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
/* 110 — 모듈 해석 + 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 복붙돼 있던 해석 블록은
   번들 브라우저가 없는 환경(클라우드 컨테이너)에서 launch 가 즉사하는 문제를 못 막았다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = process.env.TAP_FILE || 'index.html';   /* before/after 비교용 — 저장소 루트 기준 상대경로 */
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const N = Number(process.env.TAP_N || 200);
const HOLD = Number(process.env.TAP_HOLD || 90);
const PTR = process.env.TAP_PTR || 'touch';        /* touch | mouse — 실기기 터치와 데스크톱 마우스 의미론이 다르다 */

(async () => {
  const browser = await launch(chromium);
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
    /* 110 — 오디오는 끄고 잰다. 이 게이트는 «탭이 핸들러에 도달했는가» 만 보는데,
       78 오디오의 `<audio>` 폴백 경로(`auMode==='el'`)가 `sfx()` 마다 `cloneNode()` 로
       엘리먼트를 새로 만들고 회수하지 않아, 1400탭짜리 장시간 런에서 크로미움의
       WebMediaPlayer 상한(~75)을 넘겨 «Blocked attempt to create a WebMediaPlayer»
       콘솔 에러가 1000건 넘게 쌓인다 → 콘솔 에러 0 조건이 무너지고 탭도 밀린다.
       측정 대상과 무관한 소음이라 여기서 끈다(누수 자체는 별도 작업 단위 — PROGRESS 111). */
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }   /* 이미 물린 트랙도 놓는다 */
    window.__hits = 0; window.__sel = ''; window.__land = '';
    /* 110 — 빗나간 탭의 «착지 지점» 을 남기려고 요소를 짧게 적는다 */
    window.__desc = el => {
      if (!el) return '(null)';
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
      return s;
    };
    document.addEventListener('click', e => {
      window.__land = window.__desc(e.target) + ' ← ' + (e.composedPath() || []).slice(0, 4).map(window.__desc).join(' < ');
      if (window.__sel && e.target && e.target.closest && e.target.closest(window.__sel)) window.__hits++;
    }, true);

    /* 110 — «열려 있는 것 전부 닫기».
       이 게이트는 setup 마다 `closeRelicPage(); closeRelicTab();` 을 직접 불렀는데, 89 유물 개편이
       두 함수를 `closeRelw()` 하나로 갈면서 **첫 setup 에서 ReferenceError 로 즉사**했다 —
       74 는 전역 입력 경로라, 게이트가 죽은 채로 굴린 동안 회귀를 아무도 못 잡았다.
       그래서 «이름을 하나 부르는» 대신 «현재 존재하는 닫기 함수를 전부 부르고, 사라진 이름은
       기록해서 끝에 경고» 한다. 다음 개편이 또 이름을 갈아도 게이트는 죽지 않고 «이름이 바뀌었다»
       고 알려 준다. 새 오버레이를 만들면 이 목록에 닫기 함수 이름을 추가하는 것까지가 그 작업 범위다. */
    window.__CLOSERS = ['closeShopPage', 'closeTrain', 'closeDungeon', 'closeRelw', 'closeModal',
      'closeProbInfo', 'closeBag', 'closeMenu', 'closeBless', 'closeColl21', 'closeConf',
      'closeCurInfo', 'closeDunClear', 'closeDunDetail', 'closeOfflineReward', 'closePass',
      'closeProfile', 'closeRank', 'closeSaver', 'closeSpec', 'closeSummonResult',
      'closeUpAll', 'closeWeapon'];
    window.__missing = [];
    window.__closeAll = () => {
      for (const n of window.__CLOSERS) {
        const f = window[n];
        if (typeof f === 'function') { try { f(); } catch (_) {} }
        else if (window.__missing.indexOf(n) < 0) window.__missing.push(n);
      }
    };
  });
  {
    /* 이름이 사라진 닫기 함수가 있으면 «게이트가 현행 API 와 어긋났다» 는 뜻 — 즉사시키지 않고 알린다 */
    const gone = await page.evaluate(() => { window.__closeAll(); return window.__missing; });
    if (gone.length) console.log('  [!] 사라진 닫기 함수 ' + gone.length + '개: ' + gone.join(', ') + ' — tools/verify74.js __CLOSERS 갱신 필요');
  }
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
  /* 110 — «조준» 단계. 좌표만 주던 것을 «그 좌표의 최상위 요소가 정말 대상인가» 까지 본다.
     이유: 닫힘 애니메이션(jzClose)이 도는 0.2~0.3초 동안 오버레이가 탭바·사이드 아이콘 위에
     남아 있어서, 그때 던진 탭은 **대상에 닿지도 못하고** 오버레이에 먹힌다. 그건 74 가 잡으려는
     «닿았는데 핸들러가 빈손» 과 전혀 다른 사건인데 같은 «실패» 로 세고 있었다(196~199/200 의 정체).
     기존 대책은 대상마다 손으로 넣은 `gap` 이었고, 페이지가 조금만 느려지면 그대로 새어 나왔다.
     여기서는 «가려져 있으면 최대 800ms 까지 기다렸다가 조준» 한다 — 사람이 팝업이 사라지는 걸
     보고 누르는 것과 같다. **게이트의 강도는 그대로다**: 노드가 죽는 건 tap 의 down↔up «사이» 라
     조준 시점 검사로는 절대 가려지지 않는다. 그래도 안 걷히면 covered:true 로 돌려 이유를 남긴다. */
  const aim = async (sel, idx) => {
    const t0 = Date.now();
    for (;;) {
      const r = await page.evaluate(([s, i]) => {
        const list = document.querySelectorAll(s);
        const el = list[Math.min(i, list.length - 1)];
        if (!el) return null;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return null;
        const x = b.left + b.width / 2, y = b.top + b.height / 2;
        const top = document.elementFromPoint(x, y);
        return {
          x, y,
          covered: !(top && top.closest && top.closest(s)),
          top: window.__desc ? window.__desc(top) : '',
          anims: document.getAnimations().filter(a => a.playState === 'running')
            .map(a => a.animationName || '?').slice(0, 4),
        };
      }, [sel, idx || 0]);
      if (!r || !r.covered || Date.now() - t0 > 800) return r;
      await page.waitForTimeout(40);
    }
  };

  const results = [];
  async function run(name, { setup, targets, countSel, between, metric, gap }) {
    await page.evaluate(setup);
    await page.waitForTimeout(600);
    let okCnt = 0, miss = 0; const why = [];
    for (let i = 0; i < N; i++) {
      const sel = targets[i % targets.length];
      const p = await aim(sel.q, sel.i || 0);
      if (!p) { miss++; continue; }
      let before;
      if (metric) before = await page.evaluate(metric);
      else await page.evaluate(s => { window.__sel = s; window.__hits = 0; window.__land = ''; }, countSel);
      await tap(p.x, p.y);
      await page.waitForTimeout(50);
      let hit;
      if (metric) { const after = await page.evaluate(metric); hit = after !== before; }
      else { hit = await page.evaluate(() => window.__hits) > 0; }
      if (hit) okCnt++;
      /* 110 — 빗나갔으면 «왜» 를 남긴다. covered=true 면 오버레이가 가로챈 것(페이스),
         false 면 대상이 맨 위였는데도 핸들러가 빈손 = 74 계열의 진짜 유실이다. */
      else if (why.length < 5) {
        const land = metric ? '(metric 판정)' : await page.evaluate(() => window.__land || '(click 없음)');
        why.push(`#${i} ${p.covered ? '가려짐' : '**대상이 최상위**'} · 최상위=${p.top} · 애니=${(p.anims || []).join(',') || '없음'} · 착지=${land}`);
      }
      if (between) await page.evaluate(between);
      /* 닫힘 애니메이션(jzClose)이 도는 동안 오버레이가 다음 탭을 가로챈다 — 가라앉을 때까지 쉰다.
         (이건 버그가 아니라 하네스 페이스 문제다: 사람은 팝업이 닫히는 걸 보고 다음 탭을 한다) */
      if (gap) await page.waitForTimeout(gap);
    }
    await page.evaluate(() => { window.__sel = ''; });
    const rate = (okCnt / N * 100).toFixed(1);
    results.push({ name, okCnt, rate, miss, why });
    console.log(`  ${okCnt === N ? '✓' : '✗'} ${name}: ${okCnt}/${N} (${rate}%)` + (miss ? ` · 대상 미발견 ${miss}` : ''));
    why.forEach(w => console.log('      ' + w));
  }

  /* ① 스킬 패널 장착/해제 행 — renderUI 가 0.35s 마다 setBody 로 통째 재작성하는 전형 */
  await run('스킬 패널 행(0.35s 재렌더)', {
    setup: () => { window.__closeAll();
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
    setup: () => { window.__closeAll(); openShopPage(); },
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
    setup: () => { window.__closeAll(); },
    targets: [{ q: '.tab[data-t="adv"]' }, { q: '.tab[data-t="box"]' }],
    countSel: '.tab',
  });

  /* ⑥ 사이드 아이콘(퀘스트) — 직결 onclick, 성공 시 모달이 열리므로 매회 닫는다 */
  await run('사이드 아이콘', {
    setup: () => { window.__closeAll(); },
    targets: [{ q: '#sideL .ibtn[data-pop="quest"]' }],
    countSel: '#sideL .ibtn[data-pop]',
    between: () => closeModal(),
    gap: 400,
  });

  /* ⑦ 훈련 ↑ — 작업 64 가 pointerdown 구매로 바꿔 둠 → 골드 감소로 판정 */
  await run('훈련 카드 ↑(pointerdown 구매)', {
    setup: () => { window.__closeAll(); goTab('grow'); S.gold = 1e15; S.trainStage = 9999; /* 상한(full) 정지 배제 — 유실만 잰다 */ },
    targets: [{ q: '#trw [data-tr] .tr-up, #trw [data-tr]' }],
    metric: () => S.gold,
    /* 200연속 구매는 레벨을 200 올려 비용이 지수로 큰다(첫 카드 atk: 45×1.19^l → +175레벨이면
       ≈7e14). 한 번 넣은 예산은 ~120탭에서 고갈되고(4런 전부 114~121 정지), 리필만 하면
       ~175탭에서 단일 비용이 예산을 다시 넘는다(실측 175/200) — 즉 «유실»이 아니라 잔고·비용 곡선.
       매 탭 뒤 골드와 «구매로 오른 레벨»을 함께 원복해 탭마다 동일 조건으로 만든다. */
    between: () => { S.gold = 1e15; for(const k in S.lv) if(S.lv[k] > 1) S.lv[k] = 1; },
  });

  await browser.close();

  console.log('');
  const bad = results.filter(r => r.okCnt !== N);
  if (errs.length) console.log('  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  if (!bad.length && !errs.length) { console.log('VERIFY74 PASS — 전 대상 ' + N + '/' + N); process.exit(0); }
  console.log('VERIFY74 FAIL — ' + bad.map(r => `${r.name} ${r.okCnt}/${N}`).join(' · '));
  process.exit(1);
})();
