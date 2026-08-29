/* 47 게이트 — 서브탭 «칸 기하·정합» (2026-08-26 작업 134 로 되살림)
 *
 *   실행: node tools/verify47.js   (1080x2280 기준 · 헤드리스)
 *
 * 이력 — 왜 검사 대상이 바뀌었나:
 *   원래 47 은 «23 훈련 팝업 서브탭 4칸 → 2칸(훈련 · 스탯 훈련)» 게이트였다.
 *   작업 88 이 «스탯 훈련» 을 폐기하면서 훈련은 단일 화면이 됐고, `#trSub` 가 사라져
 *   이 게이트는 FAIL 도 아니고 **예외로 즉사**했다(`getElementById('trSub')` → null).
 *   즉 88 이후로 한 줄도 돈 적이 없다(작업 134 로 등재 — `docs/review/132-verify64죽은게이트.md` §7).
 *
 *   폐기된 절은 «지우기» 가 아니라 «같은 취지를 지금 있는 대상으로 옮기기» 다(LESSONS 132-3).
 *   47 이 지키던 성질은 «훈련» 이라는 화면이 아니라 **서브탭 바의 기하**였다 —
 *   칸이 균등한가 · 칸끼리 벌어지거나 겹치지 않는가 · 활성 알약이 칸을 넘지 않는가 ·
 *   라벨 잉크가 칸(활성이면 알약 «면») 안에 들어오는가 · 활성 칸이 정확히 1개인가 ·
 *   닫았다 다시 열어도 그대로인가. 이 성질들은 작업 96 이 서브탭을 공용 부품
 *   `.stabs > .stab` 으로 합친 뒤 **네 화면(07 영웅 시트 · 06 장비 · 03 던전 · 10 상점)** 에
 *   그대로 살아 있고, **아무 게이트도 보고 있지 않다**:
 *     · `tools/verify88.js` [B] = «훈련에 서브탭이 없다»(폐기 확인)  ← 47 의 옛 대상
 *     · `tools/verify96.js` ①  = «네 바의 색·테두리·폰트가 같다» — 주석에 «위치·폭은 화면별
 *                                실측이라 다르다» 고 적고 **기하를 일부러 뺐다**
 *   그래서 47 = «공용 서브탭 부품의 기하 게이트» 로 옮겼다. 파일명·ID 는 참조가 걸려 있어 유지한다.
 *
 * 작업 279(2026-08-28) — **7건 FAIL(132/139) 게이트 부패 수리.** 두 갈래가 한 파일에 섞여 있었다.
 *   ⓐ §[0] «옛 대상 폐기» 2건 — 물음이 «그 **이름**이 있나» 였다(`[data-trsub]` 0개 · `/\.tr-sub/`).
 *      203(룬)·210(단련)이 주인 지시로 23 훈련 팝업에 새 3칸 바를 세우며 `#trSubs`·`.tr-subs`·`data-trsub`
 *      로 **같은 이름을 다시 쓰기 시작해** 그 뒤로 원리적으로 영영 빨갰다. 277 이 `verify88` 에서 고친
 *      것과 동형이라 처방도 같다 — 지우지 말고 «이름» → «**스탯 칸**» 으로 물음을 옮기고 토큰 경계로 잰다.
 *   ⓑ 나머지 5건 — `BARS` 의 `n: 2`(03 던전) 가 209 의 «탑» 칸을 못 따라와 칸 수·폭·경계·오른끝·재진입이
 *      **연쇄로** 빨갰다. 리터럴을 빼고 **바가 선언한 분할(.spN)** 에서 파생시킨다(276 «리터럴 기대값은
 *      그때의 데이터를 감시한다», 185-①). 제품(`index.html`)은 **0줄** — 게임이 옳고 게이트가 낡았다.
 *   되돌림 시험 `tools/neg279.js`(N1~N10) 가 두 갈래를 각각 반증한다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 DOM 실측 판정이라 비평가를 띄우지 않는다.
 *
 * 측정 주의 — **스케일 s 의 정체**(221 에서 확정): 프레임(`#app`)은 1080x2280 뷰포트에서 scale 1 이고,
 *   `rect ≠ 프레임 px` 가 되는 구간은 **페이지가 열리는 120ms 뿐**이다 —
 *   60·122 쥬시의 입장 연출 `.jz-o.jz-pg{animation:jzPgIn .12s}` / `@keyframes jzPgIn{0%{scale:.985}→100%{scale:1}}`
 *   이 **호스트(#dunw·#shopw)를 통째로** 축소한 채 시작한다(바 794 → 782.1 · h 99 → 97.5).
 *   바의 `rect.width / offsetWidth` 로 그 s 를 구해 **프레임 px 로 환산한 뒤** 판정한다.
 *
 *   ⚠ ÷s 는 **크기만** 되살린다. `rect.x` 는 «화면 절대 좌표» 라 축소 중심(프레임 중앙 540)이 함께
 *   들어가 있어서 ÷s 로도 안 지워진다:  x' = 540 + (x−540)·s  →  x'/s − x = **540·(1/s−1)**.
 *   s=.985 이면 정확히 **+8.22px**, 그리고 이 값은 x 와 무관하므로 **모든 칸·두 바가 똑같이 8.2** 어긋난다.
 *   221 의 «재진입 Δ8.2 간헐 FAIL» 이 바로 이것이었다(제품은 무변경 — 스냅샷을 입장 연출 도중에 찍었을 뿐).
 *   그래서 이 게이트는 두 가지를 지킨다:
 *     ① 스냅샷 전에 `jzPg*`/`jzSheet*` 입장 연출이 **끝나기를 기다린다**(settle).
 *     ② 스냅샷끼리 비교하는 위치는 절대 x 가 아니라 **«바 안에서의 위치»·«호스트 안에서의 바 위치»**
 *        처럼 같은 스냅샷 안의 차분으로만 본다(차분은 균일 축소에 불변).
 *   한 스냅샷 «안» 의 비교([2]·[3])는 원래부터 차분이라 안전하다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);

/* 96 이 못박은 부품 규격 (index.html `.stabs`/`.stab` — 호스트는 위치만 정한다) */
/* 337 (2026-08-28) 이관 — BAR_H 99 → **97**. 96 이 «둘 사이의 타협값» 으로 알던 것이 아니라
   살아 있는 ref 둘(03 §4-1 · 07 §9)이 검정 테두리 행으로 **97 을 같이 말한다**
   (2021~2026 상변 / 2112~2117 하변 → 2021..2117). 07 측정표의 «2020..2118 = 99» 는
   JPEG AA 를 위아래 한 줄씩 먹은 값이라 같은 표의 테두리 행과 어긋나 있었다.
   ⚠ **CELL_H 85 는 그대로다** — 고친 것은 셸뿐이고, 그래서 패딩박스(97−12=85)가 알약과 같아지며
   AL·AM 이 지적한 «알약 하단 바 면 2px 노출» 이 값 하나로 사라진다. 상세 docs/review/337-공용서브탭부품.md */
const BAR_H = 97, BAR_BORDER = 6, CELL_H = 85;
/* 활성 알약의 좌우 «검정 7 + 밝은 림 7» = 면이 시작되는 안쪽 여백 */
const PILL_LIP = 14;
/* 4칸 격자 — 바 콘텐츠 기준 상대 좌표(.stab-c1~c4) */
const GRID4 = [[0, 224], [220, 261], [481, 223], [709, 229]];

/* 입장 연출 settle — `jzPgIn`(.12s) · `jzSheetIn`(.24s) 이 끝나기를 기다린다.
   무한 루프 연출(`jzDotPulse`·`jz122*`·`bgm*`)은 `finished` 가 영원히 안 오므로 이름으로 걸러낸다.
   끝난 뒤 rAF 2 프레임을 더 줘서 스타일이 확정된 프레임에서 재게 한다. */
const SETTLE = `() => { const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length))))); }`;

/* 본문 반응 probe — «지금 보이는 본문 컨테이너» 를 이름으로 돌려준다.
   `!!document.querySelector('#bSk')` 류는 노드가 늘 남아 있어 true→true 로 **아무것도 검사하지 않는다**. */
const BODY_VIS = 'JSON.stringify(["bSk","bPet","bCos","eqw"].filter(id => { const e = document.getElementById(id);'
  + ' return e && e.offsetParent !== null; }))';

/* 검사 대상 네 바. open/close/restore 는 페이지 컨텍스트에서 돈다.
   279 — **`n:` 리터럴을 뺐다.** 칸 수는 바의 `.spN` 선언(균등분할)에서 파생하고, 선언이 없으면
   96 의 4칸 격자(GRID4)로 본다. 종전에는 `n: 2`(03 던전) 가 209 의 «탑» 칸을 못 따라와
   폭·경계·오른끝·재진입이 **연쇄로** 빨갰다. 파생이 헛돌지 않게 [1] 에서 «선언 = 실제 칸 수» 를
   전제로 박고, [2] 가 «칸 폭 = 콘텐츠 ÷ 선언» 을 실측으로 되받는다 — 선언만 바꾸고 CSS 를
   안 고치면(예: `.sp4` 규칙 부재) 폭이 안 맞아 빨개진다. */
const BARS = [
  { key: 'sk', name: '07 영웅 시트(스킬)', sel: '#bSk .stabs', host: '#bSk',
    open: 'goTab("hero",true); heroSubGo("sk");',
    click: '#bSk [data-sktab="cos"]', afterSel: '#bCos .stabs', afterLabel: '코스튬',
    body: BODY_VIS, restore: 'heroSubGo("sk");' },
  { key: 'eq', name: '06 장비', sel: '#eqTabs', host: '.eqp',
    open: 'goTab("hero",true); heroSubGo("eq");',
    click: '#eqTabs [data-eqtab="sk"]', afterSel: '#bSk .stabs', afterLabel: '스킬',
    body: BODY_VIS, restore: 'heroSubGo("eq");' },
  { key: 'dun', name: '03 던전', sel: '#dunSub', host: '#dunw',
    open: 'goTab("adv");', close: 'closeDungeon();',
    /* 123 — 라벨이 «레이드» → «컨텐츠» 로 바뀌었다(data-dsub 키는 raid 유지) */
    click: '#dunSub [data-dsub="raid"]', afterSel: '#dunSub', afterLabel: '컨텐츠',
    body: 'document.getElementById("dunList").innerHTML.length', restore: 'document.querySelector(\'#dunSub [data-dsub="dun"]\').click();' },
  /* 124 — «이용권» 탭이 붙어 2칸 → 3칸(.sp3) */
  { key: 'shop', name: '10 상점', sel: '#shopCats', host: '#shopw',
    open: 'goTab("shop");', close: 'closeShopPage();',
    click: '#shopCats [data-cat="coin"]', afterSel: '#shopCats', afterLabel: '재화',
    body: 'document.getElementById("shopList").innerHTML.length', restore: 'document.querySelector(\'#shopCats [data-cat="summon"]\').click();' },
];

/* 페이지 안에서 도는 실측기 — 프레임 px 로 환산해 돌려준다 */
const SNAP = `(sel, host) => {
  const bar = document.querySelector(sel);
  if (!bar) return { missing: true };
  const s = bar.getBoundingClientRect().width / bar.offsetWidth;   /* 프레임 스케일 */
  /* 숨은 바는 rect 0 → 0/0 = NaN 이라 «Δ NaN 인데 PASS» 가 나올 수 있다. 여기서 잘라낸다 */
  if (!isFinite(s) || s <= 0) return { missing: true, hidden: true };
  const R = e => { const b = e.getBoundingClientRect();
    return { x: b.x / s, y: b.y / s, w: b.width / s, h: b.height / s }; };
  const cs = getComputedStyle(bar);
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  const ink = cells.map(c => { const i = c.querySelector('i'); if (!i) return null;
    const rg = document.createRange(); rg.selectNodeContents(i);
    const b = rg.getBoundingClientRect();
    return { x: b.x / s, w: b.width / s, ol4: i.classList.contains('ol4'), ol3: i.classList.contains('ol3') }; });
  const seps = [...bar.querySelectorAll(':scope > .stab-sep')].map(R);
  const hostEl = document.querySelector(host);
  const onIdx = cells.findIndex(c => c.classList.contains('on'));
  const onCs = onIdx >= 0 ? getComputedStyle(cells[onIdx]) : null;
  return {
    scale: s, bar: R(bar), radius: cs.borderRadius, bw: cs.borderTopWidth, bc: cs.borderTopColor,
    boxSizing: cs.boxSizing,
    /* 279 — 바가 **스스로 선언한** 균등 분할 수(96 의 .sp2 / .sp3). 없으면 4칸 비균등 격자(.stab-cN).
       게이트가 «2» 같은 숫자를 손으로 들고 있으면 칸이 늘 때마다 빨개진다(276·185-①) — 여기서 파생시킨다.
       분할 «선언» 은 class 토큰이므로 classList 로 가른다 — 문자열 대조는 sp3 이 sp30 을 물 수 있다.
       ⚠ 이 블록은 SNAP 템플릿 리터럴 안이다 — 주석·정규식에 백틱을 쓰면 리터럴이 끊기고,
          정규식에 \\s·\\d 를 쓰면 리터럴 이스케이프로 먹혀 s·d 가 된다(둘 다 실제로 밟았다). */
    sp: (([...bar.classList].find(c => /^sp[0-9]+$/.test(c)) || '').slice(2)) | 0,
    cells: cells.map(R), cellTop: cells.map(c => getComputedStyle(c).top),
    onN: cells.filter(c => c.classList.contains('on')).length, onIdx,
    onRadius: onCs ? onCs.borderRadius : '', onShadow: onCs ? onCs.boxShadow : '',
    labels: cells.map(c => (c.querySelector('i') || {}).textContent || ''),
    ink, seps, host: hostEl ? R(hostEl) : null,
    bdg: [...bar.querySelectorAll('.bdg')].map(b => ({ cell: cells.findIndex(c => c.contains(b)), r: R(b) })),
  };
}`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  /* `V47_SRC` — 되돌림 시험(tools/neg221.js)이 «한 곳만 갈아 끼운 사본» 을 물릴 때 쓴다 */
  await page.goto('file://' + path.resolve(process.env.V47_SRC || path.join(__dirname, '..', 'index.html')));
  await page.waitForTimeout(900);
  /* 스냅샷 직전마다 부른다 — 입장 연출 도중에 재면 s ≠ 1 이 되고, 절대 x 가 540·(1/s−1) 만큼 밀린다(221) */
  const settle = () => page.evaluate(o => eval(o)(), SETTLE);

  /* ---- 0. 47 의 «옛 대상» 은 폐기됐다 (88) ----
     279 — 옛 물음은 «그 **이름**이 있나» 였다: `[data-trsub]` 0개 · 정규식 `/\.tr-sub/`.
     203(룬)·210(단련)이 주인 지시로 23 훈련 팝업에 **새 3칸 바**(`#trSubs` · `.tr-subs` · `data-trsub`)를
     세우면서 같은 이름을 다시 쓰기 시작했다 → 그 뒤로 **원리적으로 영영 빨간** 단언이 됐다
     (`/\.tr-sub/` 는 `.tr-subs` 를 부분문자열로 문다). 277 이 `verify88` [A][B] 에서 고친 것과 **동형**이다.
     단언을 지우지 않고 물음을 옮긴다 — «이름이 있나» → «**스탯 칸**이 있나»(`docs/review/277-verify88게이트.md` §2).
     47 이 여기서 지키는 것은 «옛 47 의 대상(«훈련 | 스탯 훈련» 2칸 바)이 안 돌아온다» 하나다. */
  console.log('\n[0] 옛 대상(23 훈련 «훈련 | 스탯 훈련» 서브탭) 폐기 확인 — 되살아나면 이 게이트의 전제가 깨진다');
  const old = await page.evaluate(() => {
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (_) { return []; } })
      .map(r => r.selectorText || '').join(' | ');
    const keys = [...document.querySelectorAll('[data-trsub]')];
    return { trSub: !!document.getElementById('trSub'),
      keys: keys.map(e => e.dataset.trsub),
      /* 203/210 의 바 밖에서 그 이름을 쓰는 칸 = 되살아난 옛 바 */
      stray: keys.filter(e => !e.closest('#trSubs')).length,
      /* 마크업 표기(`class="tr-sub"`)도 같이 본다 — 선택자 표기만 보면 놓친다(277 함정 1건) */
      oldCls: [...document.querySelectorAll('[class]')].some(e => e.classList.contains('tr-sub')),
      statTxt: keys.some(e => /스탯/.test(e.textContent)),
      statUI: document.querySelectorAll('#trw [data-sp], #trw [data-spauto], #trw [data-spreset], #trw [data-uptab]').length,
      /* 토큰 경계 — `.tr-subs`(203) 를 부분문자열로 물지 않게 */
      css: /\.tr-sub(?![\w-])/.test(css), cssSubs: /\.tr-subs(?![\w-])/.test(css) };
  });
  ok('#trSub 노드 0 (88 이 지운 바의 id — 203 의 #trSubs 는 다른 이름)', old.trSub === false, String(old.trSub));
  ok('전제 — [data-trsub] 칸을 읽었고 전부 203/210 의 #trSubs 안에 있다',
    old.keys.length > 0 && old.stray === 0,
    (old.keys.join('/') || '없음') + (old.stray ? ' · 바 밖 ' + old.stray + '개' : ''));
  ok('«스탯 훈련» 칸·분배 UI 0개 (47 의 옛 대상 — 상세 게이트는 verify88 [A2][B])',
    !old.keys.includes('stat') && !old.statTxt && old.statUI === 0,
    '칸 ' + (old.keys.join('/') || '없음') + ' · 분배 UI ' + old.statUI + '개');
  ok('.tr-sub CSS 규칙·class 토큰 0건 (토큰 경계 — 203 의 .tr-subs 는 별개)',
    old.css === false && old.oldCls === false, 'rule ' + old.css + ' · class ' + old.oldCls);
  /* «0건» 은 매처가 죽어도 초록이다(185-②) — 스타일시트를 실제로 읽었고 토큰 매처가 산다는 것을 반대편으로 건다 */
  ok('[0] 자가검사 — 같은 매처가 203 의 .tr-subs 는 «있다» 로 읽는다',
    old.cssSubs === true, String(old.cssSubs));

  const snaps = {};
  for (const b of BARS) {
    console.log('\n[1] ' + b.name + ' — 부품 규격 (' + b.sel + ')');
    await page.evaluate(o => eval(o), b.open);
    await page.waitForTimeout(650);
    await settle();
    /* 작업 166 — `.stab>.bdg` 는 «기본 꺼짐 + .alert 로 점등» 이 됐다(종전에는 마크업만으로 상시 점등).
       이 게이트가 지키는 것은 «배지가 켜졌을 때의 기하»(27x27 · 칸 안)이지 «언제 켜지는가» 가 아니므로,
       측정 동안만 강제로 보이게 한다. `.alert` 클래스로 켜면 renderUI() 가 0.35초마다 조건대로 되돌려
       스냅샷 직전에 다시 꺼지므로, 토글이 못 이기는 `!important` 스타일로 켠다(측정 후 제거).
       점등 «조건» 은 작업 166 의 전용 게이트 `tools/verify166.js` 가 본다. */
    const bdgOn = await page.addStyleTag({ content: '.stab>.bdg{display:block!important}' });
    const g = await page.evaluate(([fn, sel, host]) => eval(fn)(sel, host), [SNAP, b.sel, b.host]);
    await bdgOn.evaluate(el => el.remove());
    snaps[b.key] = g;
    if (g.missing) { ok('바 존재', false, b.sel + ' 없음 — 이후 절 건너뜀'); continue; }

    ok('바 높이 ' + BAR_H, near(g.bar.h, BAR_H, 0.6), f1(g.bar.h));
    ok('바 radius 43 · border 6 #000 · border-box',
      g.radius === '43px' && g.bw === BAR_BORDER + 'px' && g.bc === 'rgb(0, 0, 0)' && g.boxSizing === 'border-box',
      g.radius + ' / ' + g.bw + ' ' + g.bc + ' / ' + g.boxSizing);
    /* 279 — 칸 수는 «게이트가 든 숫자» 가 아니라 «바가 선언한 분할» 이다.
       전제를 결론과 갈라 둔다(185-③): 선언을 못 읽으면 결론(격자 판정)이 아니라 **이 줄**이 빨개진다. */
    const nDecl = g.sp || 0, n = nDecl || GRID4.length;
    ok('전제 — 바가 칸 수를 스스로 선언한다 (.spN 균등분할 · 없으면 96 의 4칸 격자)',
      nDecl >= 2 || g.cells.length === GRID4.length,
      nDecl ? '.sp' + nDecl : '선언 없음 → 4칸 격자');
    ok('칸 ' + n + '개' + (nDecl ? ' (바의 .sp' + nDecl + ' 선언에서 파생)' : ' (.stab-cN 격자)'),
      g.cells.length === n, g.cells.length + '개');
    ok('칸 높이 85 · top 0 (바 안에 앉는다)',
      g.cells.every(c => near(c.h, CELL_H, 0.6)) && g.cellTop.every(t => t === '0px'),
      g.cells.map(c => f1(c.h)).join('/') + ' · top ' + [...new Set(g.cellTop)].join(','));

    /* ---- 2. 칸 격자 ---- */
    console.log('\n[2] ' + b.name + ' — 칸 격자');
    const cx = g.bar.x + BAR_BORDER, cw = g.bar.w - BAR_BORDER * 2;   /* 바 «콘텐츠» 상자 */
    /* 124 — 균등분할 바(.spN)는 칸 수와 무관하게 «콘텐츠 상자 ÷ N» 규칙 하나로 본다.
       279 — N 은 [1] 에서 바의 선언으로 파생한 값이다. 이 절이 그 선언을 **실측으로 되받는 자리**다:
       `.sp4` 로 고쳐 놓고 CSS 규칙을 안 만들면 폭이 100/N% 가 안 나와 여기서 빨개진다. */
    if (nDecl >= 2) {
      const sw = cw / n;
      ok(n + '칸 균등 (Δ ≤ 0.5)', g.cells.every(c => near(c.w, g.cells[0].w, 0.5)),
        g.cells.map(c => f1(c.w)).join(' / '));
      ok('칸 폭 = 콘텐츠 ÷' + n + ' = ' + f1(sw), near(g.cells[0].w, sw, 0.6), f1(g.cells[0].w));
      for (let i = 1; i < n; i++) {
        ok('칸 경계' + i + ' 맞닿음 (빈틈·겹침 0)',
          near(g.cells[i - 1].x + g.cells[i - 1].w, g.cells[i].x, 0.5),
          'Δ' + f1(g.cells[i].x - g.cells[i - 1].x - g.cells[i - 1].w));
        ok('경계' + i + ' = 콘텐츠 ' + i + '/' + n + ' 지점', near(g.cells[i].x, cx + sw * i, 0.6),
          f1(g.cells[i].x - cx) + ' vs ' + f1(sw * i));
      }
      ok('마지막 칸 오른끝 = 콘텐츠 오른끝',
        near(g.cells[n - 1].x + g.cells[n - 1].w, cx + cw, 0.6),
        f1(g.cells[n - 1].x + g.cells[n - 1].w - cx) + ' vs ' + f1(cw));
      ok('구분선 0개 (균등분할 바는 구분선을 두지 않는다 — 96)', g.seps.length === 0, g.seps.length + '개');
    } else {
      GRID4.forEach(([l, w], i) => {
        ok('칸' + (i + 1) + ' 격자 left ' + l + ' · w ' + w,
          near(g.cells[i].x - cx, l, 0.6) && near(g.cells[i].w, w, 0.6),
          f1(g.cells[i].x - cx) + ' / ' + f1(g.cells[i].w));
      });
      ok('마지막 칸 오른끝 = 콘텐츠 오른끝',
        near(g.cells[3].x + g.cells[3].w, cx + cw, 0.6),
        f1(g.cells[3].x + g.cells[3].w - cx) + ' vs ' + f1(cw));
      /* 352 ⓒ 이관 (2026-08-29) — 54 → **55** · 그리고 **top 을 새로 묻는다**.
         여기가 폭·높이·left 만 보고 있어서 «세로로 2px 내려앉은 것»(ref +22 ↔ 우리 +24)을
         한 번도 못 봤다. 값은 `python3 tools/probe352.py` ⓒ 실측(ref x777 y2043~2097). */
      ok('구분선 1개 · 6x54 · 3·4칸 사이(중심 706)',
        g.seps.length === 1 && near(g.seps[0].w, 6, 0.6) && near(g.seps[0].h, 54, 0.6)
        && near(g.seps[0].x + g.seps[0].w / 2 - cx, 706, 0.6),
        g.seps.length + '개 ' + (g.seps[0] ? f1(g.seps[0].w) + 'x' + f1(g.seps[0].h) + ' @' + f1(g.seps[0].x - cx) : ''));
      ok('구분선 상변 = 바 콘텐츠 상변 + 16 (352 ⓒ · ref 셸 바깥 +22)',
        g.seps.length === 1 && near(g.seps[0].y - (g.bar.y + BAR_BORDER), 16, 0.6),
        g.seps[0] ? f1(g.seps[0].y - (g.bar.y + BAR_BORDER)) : '없음');
    }
    ok('모든 칸이 바 콘텐츠 안 (돌출 0)',
      g.cells.every(c => c.x >= cx - 0.6 && c.x + c.w <= cx + cw + 0.6),
      g.cells.map(c => f1(c.x - cx) + '..' + f1(c.x + c.w - cx)).join(' '));

    /* ---- 3. 칸 안 정합 ---- */
    console.log('\n[3] ' + b.name + ' — 활성 알약 · 라벨 잉크');
    ok('활성 칸 정확히 1개', g.onN === 1, g.onN + '개');
    /* 352 ⓐ 이관 (2026-08-29) — 36 → **32**. 묻는 것은 그대로다(«반경과 좌우 밴드»).
       값은 `python3 tools/probe352.py` ⓐ 의 원호 역산 — ref 32.0(좌 30.1 · 우 33.9) ↔ 우리 32.0.
       ⚠ `PILL_LIP 14`(좌우 검정 7 + 림 7)는 **세로 한복판**의 두께라 반경과 무관하게 불변이다. */
    ok('활성 알약 radius 30 · 좌우 검정 7 + 림 14 (칸 안쪽에만)',
      g.onRadius === '30px' && /rgb\(0, 0, 0\) 7px 0px 0px 0px inset/.test(g.onShadow)
      && /rgb\(0, 0, 0\) -7px 0px 0px 0px inset/.test(g.onShadow)
      && /14px 0px 0px 0px inset/.test(g.onShadow) && /-14px 0px 0px 0px inset/.test(g.onShadow),
      g.onRadius + ' / ' + g.onShadow.slice(0, 60));
    g.cells.forEach((c, i) => {
      const k = g.ink[i];
      if (!k) { ok('칸' + (i + 1) + ' 라벨 <i> 존재', false); return; }
      const on = i === g.onIdx;
      ok('칸' + (i + 1) + '«' + g.labels[i] + '» 잉크 중심 = 칸 중심 (Δ ≤ 2)',
        near(k.x + k.w / 2, c.x + c.w / 2, 2), 'Δ' + f1(k.x + k.w / 2 - (c.x + c.w / 2)));
      /* 활성 칸은 «면» 안(좌우 림 14 침범 0), 비활성 칸은 칸 안 */
      const lo = c.x + (on ? PILL_LIP : 0), hi = c.x + c.w - (on ? PILL_LIP : 0);
      ok('칸' + (i + 1) + ' 잉크 ' + (on ? '알약 면' : '칸') + ' 안 (잘림 0)',
        k.x >= lo - 0.5 && k.x + k.w <= hi + 0.5,
        f1(k.x - c.x) + '..' + f1(k.x + k.w - c.x) + ' / ' + (on ? f1(PILL_LIP) + '..' + f1(c.w - PILL_LIP) : '0..' + f1(c.w)));
      ok('칸' + (i + 1) + ' 라벨 외곽선 = ' + (on ? 'ol4(활성)' : 'ol3(비활성)'),
        on ? (k.ol4 && !k.ol3) : (k.ol3 && !k.ol4), 'ol3=' + k.ol3 + ' ol4=' + k.ol4);
    });
    g.bdg.forEach(d => {
      const c = g.cells[d.cell];
      ok('레드닷 27x27 · 칸' + (d.cell + 1) + ' 안 (돌출 0)',
        near(d.r.w, 27, 0.8) && near(d.r.h, 27, 0.8)
        && d.r.x >= c.x - 0.5 && d.r.x + d.r.w <= c.x + c.w + 0.5,
        f1(d.r.w) + 'x' + f1(d.r.h) + ' @' + f1(d.r.x - c.x) + '..' + f1(d.r.x + d.r.w - c.x) + ' / 칸 ' + f1(c.w));
    });
    ok('바가 호스트(' + b.host + ') 안 (잘림 0)',
      !!g.host && g.bar.x >= g.host.x - 0.6 && g.bar.x + g.bar.w <= g.host.x + g.host.w + 0.6
      && g.bar.y + g.bar.h <= g.host.y + g.host.h + 0.6,
      g.host ? 'bar ' + f1(g.bar.x) + '+' + f1(g.bar.w) + ' y' + f1(g.bar.y + g.bar.h)
        + ' / host ' + f1(g.host.x) + '+' + f1(g.host.w) + ' y' + f1(g.host.y + g.host.h) : '호스트 없음');

    /* ---- 4. 실동작 — 칸을 누르면 활성이 옮겨가고 본문이 바뀐다 ---- */
    console.log('\n[4] ' + b.name + ' — 전환 실동작');
    const before = await page.evaluate(o => eval(o), b.body);
    const clicked = await page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; e.click(); return true; }, b.click);
    ok('비활성 칸 클릭 가능 (' + b.click + ')', clicked);
    await page.waitForTimeout(600);
    await settle();
    const g2 = await page.evaluate(([fn, sel, host]) => eval(fn)(sel, host), [SNAP, b.afterSel, b.host]);
    const after = await page.evaluate(o => eval(o), b.body);
    ok('활성이 «' + b.afterLabel + '» 칸으로 이동 · 활성 1개',
      !g2.missing && g2.onN === 1 && g2.labels[g2.onIdx] === b.afterLabel,
      g2.missing ? '바 없음' : g2.labels[g2.onIdx] + ' (.on ' + g2.onN + '개)');
    ok('본문이 실제로 반응했다', !!after && after !== before, String(before) + ' → ' + String(after));
    if (!g2.missing) {
      const c = g2.cells[g2.onIdx], k = g2.ink[g2.onIdx];
      /* 활성 스타일은 fs43→41 · scaleX .914→.893 으로 잉크가 바뀐다 — 옮겨간 칸에서 다시 잰다 */
      ok('옮겨간 활성 칸 잉크도 알약 면 안 (잘림 0)',
        k && k.x >= c.x + PILL_LIP - 0.5 && k.x + k.w <= c.x + c.w - PILL_LIP + 0.5,
        k ? f1(k.x - c.x) + '..' + f1(k.x + k.w - c.x) + ' / 면 ' + PILL_LIP + '..' + f1(c.w - PILL_LIP) : '잉크 없음');
      ok('옮겨간 활성 칸 라벨 외곽선 ol4 (stabInk 토글)', !!k && k.ol4 && !k.ol3,
        k ? 'ol3=' + k.ol3 + ' ol4=' + k.ol4 : '잉크 없음');
    }
    await page.evaluate(o => eval(o), b.restore);
    await page.waitForTimeout(500);
  }

  /* ---- 5. 닫았다 다시 열어도 그대로 (원래 47 §3 꼬리 — 잔존 상태 버그) ---- */
  console.log('\n[5] 닫기 → 재진입');
  for (const key of ['dun', 'shop']) {
    const b = BARS.find(x => x.key === key);
    await page.evaluate(o => eval(o), b.open);              /* 확실히 연 상태로 만든 뒤 */
    await page.waitForTimeout(400);
    await page.evaluate(o => eval(o), b.close);             /* 닫고 */
    await page.waitForTimeout(400);
    await page.evaluate(o => eval(o), b.open);              /* 다시 연다 */
    await page.waitForTimeout(650);
    await settle();
    const g = await page.evaluate(([fn, sel, host]) => eval(fn)(sel, host), [SNAP, b.sel, b.host]);
    const g0 = snaps[key];
    /* 279 — 기대 칸 수는 «게이트가 든 숫자» 가 아니라 **첫 진입 스냅샷**이다. 이 절의 주제가
       «닫았다 다시 열어도 그대로» 이므로 기준은 처음 잰 그 바여야 한다(그 바가 몇 칸인지는 [1] 이 본다). */
    ok(b.name + ' 재진입 — 칸 ' + g0.cells.length + '개(첫 진입과 같은 수) · 활성 1개',
      !g.missing && g.cells.length === g0.cells.length && g.onN === 1,
      g.missing ? '바 없음' : g.cells.length + '칸 · .on ' + g.onN + '개');
    /* 221 — «위치» 는 화면 절대 x 가 아니라 **바 안에서의 위치**로 본다.
       절대 x 는 입장 연출(jzPgIn scale .985) 이 걸리면 모든 칸이 한꺼번에 540·(1/s−1)=8.2px 밀려
       «칸이 하나도 안 움직였는데» 빨개진다(간헐 FAIL 의 정체). 바 기준 차분은 균일 축소에 불변이다. */
    ok(b.name + ' 재진입 — 칸 폭·바 안 위치 그대로 (Δ ≤ 0.6)',
      !g.missing && g.cells.every((c, i) =>
        near(c.x - g.bar.x, g0.cells[i].x - g0.bar.x, 0.6) && near(c.w, g0.cells[i].w, 0.6)),
      g.missing ? '-' : g.cells.map((c, i) =>
        'Δ' + f1((c.x - g.bar.x) - (g0.cells[i].x - g0.bar.x)) + '/' + f1(c.w - g0.cells[i].w)).join(' '));
    /* 위 단언이 «바째로 옮겨간» 회귀를 놓치지 않도록, 바 자신도 호스트 기준으로 같이 본다 */
    ok(b.name + ' 재진입 — 바 폭·호스트 안 위치 그대로 (Δ ≤ 0.6)',
      !g.missing && !!g.host && !!g0.host
      && near(g.bar.x - g.host.x, g0.bar.x - g0.host.x, 0.6)
      && near(g.bar.y - g.host.y, g0.bar.y - g0.host.y, 0.6)
      && near(g.bar.w, g0.bar.w, 0.6) && near(g.bar.h, g0.bar.h, 0.6),
      g.missing || !g.host || !g0.host ? '-'
        : 'Δx' + f1((g.bar.x - g.host.x) - (g0.bar.x - g0.host.x))
          + ' Δy' + f1((g.bar.y - g.host.y) - (g0.bar.y - g0.host.y))
          + ' Δw' + f1(g.bar.w - g0.bar.w) + ' Δh' + f1(g.bar.h - g0.bar.h));
    /* 그리고 «잰 순간이 연출 도중이 아니었다» 는 것 자체를 못 박는다 — settle 이 죽으면 여기가 빨개진다 */
    ok(b.name + ' 재진입 — 입장 연출 종료 후 측정 (s = 1)', !g.missing && near(g.scale, 1, 0.002),
      g.missing ? '-' : 's ' + (Math.round(g.scale * 10000) / 10000));
  }

  /* ---- 6. 콘솔 ---- */
  console.log('\n[6] 콘솔');
  ok('에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  /* 캡처 — 네 바를 한눈에 볼 수 있게 상점 바 주변만 잘라 남긴다 */
  /* 되돌림 시험(V47_SRC)은 «일부러 망가뜨린 사본» 이라 산출물을 덮어쓰면 안 된다 */
  const sc = process.env.V47_SRC ? null : snaps.shop;
  if (sc && !sc.missing) {
    await page.evaluate(o => eval(o), BARS.find(b => b.key === 'shop').open);
    await page.waitForTimeout(600);
    const r = await page.evaluate(sel => { const b = document.querySelector(sel).getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height }; }, '#shopCats');
    await page.screenshot({ path: path.resolve(__dirname, '..', 'docs/review/47-subtab.png'),
      clip: { x: 0, y: Math.max(0, r.y - 40), width: W, height: Math.min(180, H - Math.max(0, r.y - 40)) } });
  }

  console.log('\nVERIFY47 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
