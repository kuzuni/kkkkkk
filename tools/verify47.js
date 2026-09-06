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
/* 437 (2026-08-30) 이관 — **셋을 한꺼번에**: BAR_H 97 → **98** · BAR_BORDER 6 → **7** ·
   CELL_H 85 → **84**. 337 이 «검정 테두리 행» 으로 97 을 읽고 «AA 를 먹은 99» 를 기각한 것은
   문턱 하나로 두 값을 동시에 판정한 것이었다. `python3 tools/probe437.py` 는 문턱을 다투는 대신
   **자를 먼저 검산했다** — 순검정·느슨·50%교차·커버리지 넷을 우리 캡처(진실은 CSS 가 안다)에
   대니 **넷 다 오차 0.00**. 그래서 ref 는 문턱이 아니라 **색 분류**로 읽었다:
       ref 07 x330(알약 열) K2021..2027(**7**) B(7) F(63) B(7) D(7) K2112..2117(6+AA)
   ⇒ 테두리 **7** · 칸 **84** · 바깥 **98**, 그리고 7+84+7 = 98 로 셋이 서로를 검산한다.
   06·07·23 세 스크린샷이 소수 둘째 자리까지 같다(상 8.50 / 하 6.98 — 상변의 +1.4 는 테두리가
   아니라 **셸 안쪽 어두운 립**이고 활성 알약이 닿는 면에서는 7.0 으로 읽힌다 → **450** 등재).
   ⚠ 세 값은 **한 덩어리다** — 하나만 바꾸면 나머지 둘이 어긋난다. 그 결속을 `verify437` [G] 가 문다.
   상세 docs/review/437-서브탭셸테두리.md */
const BAR_H = 98, BAR_BORDER = 7, CELL_H = 84;
/* 379 — 활성 알약이 «자기 격자 칸» 보다 넓은 양(한 면). ref 07 활성 알약 291/261 ↔
   그 칸(바깥 4등분 2번째) 302.5..540 ⇒ 좌 +11.5 · 우 +12.0 = 총 23.5 ⇒ 면당 11.75.
   좌·우 0.5 차는 352 정오표가 밝힌 JPEG AA 편향(양쪽 같은 방향)이라 구조가 아니다. */
const PILL_OVER = 11.75;
/* 활성 알약의 좌우 «검정 7 + 밝은 림 7» = 면이 시작되는 안쪽 여백 */
const PILL_LIP = 14;
/* 378 (2026-08-29) — **셸 콘텐츠 변에 닿는 면**은 검정 7 을 셸 테두리에 넘기므로 림이 베벨 7 뿐이다
   (ref 는 그 자리에 검정을 겹치지 않는다 — 352 §8 · `tools/probe378.js`). 끝 칸이 활성일 때만 쓴다. */
const PILL_EDGE_LIP = 7;
/* 389 이관 (2026-08-29) — **4칸 격자의 리터럴 네 쌍을 지웠다.**
   종전 `GRID4 = [[0,224],[220,261],[481,223],[709,229]]` 은 측정표 07 §9 「탭 경계」 를 그대로
   옮겨 적은 것인데, 379 정오표가 그 다섯 수 중 **칸 경계는 777 하나뿐**이라고 밝혔다(나머지는
   알약 변 295·547 과 패딩 변 73·1006). 그래서 c1·c3·c4 는 «비활성 라벨이 맞는 자리» 였고
   활성이 되는 순간 **칸 == 알약**이었다(`probe379` 실측 오버행 −6/−7.5 · −12/−2.5 · −2.5/−6).
   ⇒ 4칸 격자도 균등분할 바와 **같은 규칙 하나**(바깥 ÷N + 면당 11.75 오버행)로 잰다.
   ⚠ 값을 «ow/4» 로 갈기만 하면 «칸 == 알약» 이던 옛 그림도 그대로 초록이다(LESSONS 328-330) —
      아래 [2] 는 격자를 **비활성 칸으로만** 재고 활성 알약의 오버행을 **따로** 묻는다.
   구분선(4칸 격자에만 있다)은 분할 종류로 갈리므로 그 항만 갈래로 남는다. */
const GRID4_N = 4;

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
    /* 409 — 검정 옆띠는 ::after 의 등폭 링이고, 어느 면에 붙는지는 마스크 기둥이 정한다.
       ⚠ 이 블록은 SNAP 템플릿 리터럴 안이라 **주석에도 백틱을 쓰면 안 된다**(서두 경고). */
    onRing: onIdx >= 0 ? getComputedStyle(cells[onIdx], '::after').boxShadow : '',
    onMask: onIdx >= 0 ? (getComputedStyle(cells[onIdx], '::after').maskImage
      || getComputedStyle(cells[onIdx], '::after').webkitMaskImage || '') : '',
    labels: cells.map(c => (c.querySelector('i') || {}).textContent || ''),
    ink, seps, host: hostEl ? R(hostEl) : null,
    /* 563 (2026-08-31) — 471 규약값도 같이 읽어 온다. 게이트가 «11» 을 손으로 들면 규약이
       움직일 때마다 빨개진다(276 «리터럴 기대값은 그때의 데이터를 감시한다», 185-①) —
       자리는 제품이 선언한 --dot-in (호스트별 예외는 --dot-in-x) 에서 파생시킨다.
       ⚠ 이 블록은 SNAP 템플릿 리터럴 안이라 주석에도 백틱을 쓰면 안 된다(서두 경고 — 실제로 밟았다). */
    bdg: [...bar.querySelectorAll('.bdg')].map(b => {
      const ci = cells.findIndex(c => c.contains(b));
      const bs = getComputedStyle(b), cc = ci >= 0 ? getComputedStyle(cells[ci]) : null;
      const v = n => (bs.getPropertyValue(n) || '').trim();
      return { cell: ci, r: R(b),
        dotIn: v('--dot-in'), dotInX: v('--dot-in-x'), dotInY: v('--dot-in-y'),
        dotR: v('--dot-r'), dotBw: v('--dot-bw'),
        cellBw: cc ? (parseFloat(cc.borderRightWidth) || 0) : 0 };
    }),
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
    const nDecl = g.sp || 0, n = nDecl || GRID4_N;
    ok('전제 — 바가 칸 수를 스스로 선언한다 (.spN 균등분할 · 없으면 96 의 4칸 격자)',
      nDecl >= 2 || g.cells.length === GRID4_N,
      nDecl ? '.sp' + nDecl : '선언 없음 → 4칸 격자');
    ok('칸 ' + n + '개' + (nDecl ? ' (바의 .sp' + nDecl + ' 선언에서 파생)' : ' (.stab-cN 격자)'),
      g.cells.length === n, g.cells.length + '개');
    ok('칸 높이 85 · top 0 (바 안에 앉는다)',
      g.cells.every(c => near(c.h, CELL_H, 0.6)) && g.cellTop.every(t => t === '0px'),
      g.cells.map(c => f1(c.h)).join('/') + ' · top ' + [...new Set(g.cellTop)].join(','));

    /* ---- 2. 칸 격자 ---- */
    console.log('\n[2] ' + b.name + ' — 칸 격자');
    const cx = g.bar.x + BAR_BORDER, cw = g.bar.w - BAR_BORDER * 2;   /* 바 «콘텐츠»(패딩) 상자 */
    const ox = g.bar.x, ow = g.bar.w;                                 /* 바 «바깥» 상자 — 379 가 격자를 여기로 옮겼다 */
    /* 124 — 균등분할 바(.spN)는 칸 수와 무관하게 «콘텐츠 상자 ÷ N» 규칙 하나로 본다.
       279 — N 은 [1] 에서 바의 선언으로 파생한 값이다. 이 절이 그 선언을 **실측으로 되받는 자리**다:
       `.sp4` 로 고쳐 놓고 CSS 규칙을 안 만들면 폭이 100/N% 가 안 나와 여기서 빨개진다.
       389 (2026-08-29) — **갈래를 없앴다.** 종전에는 균등분할 바만 아래 규칙으로 재고 4칸 격자는
       리터럴 네 쌍으로 쟀는데, 그 리터럴이 곧 이 작업이 고친 결함이었다. 두 분할이 **같은 부품**의
       같은 규약(바깥 ÷N + 면당 11.75)을 따르므로 자도 하나다 — 갈리는 것은 구분선뿐이다. */
    {
      /* ── 379 이관 (2026-08-29) — 이 절의 **정의가 바뀌었다.**
         종전에는 «콘텐츠(패딩) 상자 ÷ N» 이었다. 379 가 ref 07 에서 **픽셀로 확정된 유일한 칸
         경계**(세로 구분선 3 중심 777 · 측정표 07 §9)가 바깥 4등분 경계 777.5 와 Δ0.5 임을 들어
         나누는 상자를 **바깥 상자**로 옮겼다(수리 전 03 칸 폭 260.66 ↔ 264.67 = −4.01).
         ⚠ **값만 갈지 않았다** — 값만 `ow/n` 으로 고치면 «칸 == 알약» 이던 옛 그림도 초록이다.
         두 가지를 새로 묻는다: ⓐ 격자는 **비활성 칸**으로만 재고(활성 칸은 알약이라 상자가 다르다)
         ⓑ 그 활성 알약이 자기 «격자 칸» 보다 얼마나 넓은지를 **직접** 묻는다. */
      const sw = ow / n;
      const rest = g.cells.map((c, i) => ({ c, i })).filter(o => o.i !== g.onIdx);
      ok('전제 — 활성 칸을 가려낼 수 있다 (알약은 칸과 상자가 다르다)',
        g.onIdx >= 0 && rest.length === n - 1, '활성 idx ' + g.onIdx + ' · 비활성 ' + rest.length + '칸');
      ok(n + '칸 균등 — 비활성 칸끼리 (Δ ≤ 0.5)',
        rest.every(o => near(o.c.w, rest[0].c.w, 0.5)), rest.map(o => f1(o.c.w)).join(' / '));
      ok('칸 폭 = **바깥** ÷' + n + ' = ' + f1(sw) + ' (379 — 콘텐츠 ÷' + n + ' = ' + f1(cw / n) + ' 이 아니다)',
        rest.every(o => near(o.c.w, sw, 0.6)), rest.map(o => f1(o.c.w)).join(' / '));
      rest.forEach(o => {
        ok('칸' + (o.i + 1) + ' 왼끝 = 바깥 ' + o.i + '/' + n + ' 지점',
          near(o.c.x, ox + sw * o.i, 0.6),
          f1(o.c.x - ox) + ' vs ' + f1(sw * o.i));
      });
      ok('첫 칸 왼끝 = 바 **바깥** 왼끝 (379 — 콘텐츠 왼끝이 아니다)',
        near(g.cells[0].x, ox, 0.6) || g.onIdx === 0,
        f1(g.cells[0].x - ox) + (g.onIdx === 0 ? ' (활성 — 면제)' : ''));
      ok('마지막 칸 오른끝 = 바 **바깥** 오른끝',
        near(g.cells[n - 1].x + g.cells[n - 1].w, ox + ow, 0.6) || g.onIdx === n - 1,
        f1(g.cells[n - 1].x + g.cells[n - 1].w - ox) + ' vs ' + f1(ow)
        + (g.onIdx === n - 1 ? ' (활성 — 면제)' : ''));
      /* ⓑ 오버행 — 379 의 본체. ref 07 활성 알약 291/261 ↔ 그 칸(바깥 4등분 2번째) 302.5..540
         ⇒ 좌 +11.5 · 우 +12.0 = 총 23.5 ⇒ 자유로운 면마다 11.75.
         셸 안쪽 변에 닿는 면은 오버행을 내밀지 않고 콘텐츠 변에 붙는다(378 이 그 면의 검정을
         셸 테두리에 넘긴 전제 — 내밀면 알약이 셸 검정을 덮어 378 이 되돌아간다). */
      if (g.onIdx >= 0) {
        const p = g.cells[g.onIdx];
        const gl = ox + sw * g.onIdx, gr = gl + sw;
        const firstCell = g.onIdx === 0, lastCell = g.onIdx === n - 1;
        ok('활성 알약 좌 오버행 ' + (firstCell ? '= 콘텐츠 왼변에 붙음 (378 규약)' : '+' + PILL_OVER),
          firstCell ? near(p.x, cx, 0.6) : near(gl - p.x, PILL_OVER, 0.6),
          firstCell ? f1(p.x - cx) : '+' + f1(gl - p.x));
        ok('활성 알약 우 오버행 ' + (lastCell ? '= 콘텐츠 오른변에 붙음 (378 규약)' : '+' + PILL_OVER),
          lastCell ? near(p.x + p.w, cx + cw, 0.6) : near(p.x + p.w - gr, PILL_OVER, 0.6),
          lastCell ? f1(p.x + p.w - (cx + cw)) : '+' + f1(p.x + p.w - gr));
        ok('활성 알약 폭 = 칸 + 오버행 (자유로운 면만)',
          near(p.w, sw + (firstCell ? 0 : PILL_OVER) + (lastCell ? 0 : PILL_OVER)
            - (firstCell || lastCell ? BAR_BORDER : 0), 0.8),
          f1(p.w) + ' vs 칸 ' + f1(sw));
      }
    }
    if (nDecl >= 2) {
      ok('구분선 0개 (균등분할 바는 구분선을 두지 않는다 — 96)', g.seps.length === 0, g.seps.length + '개');
    } else {
      /* 352 ⓒ 이관 (2026-08-29) — 54 → **55** · 그리고 **top 을 새로 묻는다**.
         여기가 폭·높이·left 만 보고 있어서 «세로로 2px 내려앉은 것»(ref +22 ↔ 우리 +24)을
         한 번도 못 봤다. 값은 `python3 tools/probe352.py` ⓒ 실측(ref x777 y2043~2097).
         ⚑⚑ **968 (2026-09-06) — 아래 두 항의 대역 0.6 이 무엇을 담는지 밝힌다.**
         이 둘은 **DOM 값**을 담는다(우리 h 54.00 · top +16.00 — 캡처 부분화소도 54.00). ref 의
         54.59 는 **이 대역과 무관하다** — 968 등재문 ⓑ 의 «대역 0.6 이 54.59 를 98% 로 아슬아슬하게
         담는다(좁히면 즉시 빨개진다)» 는 **기각**됐다(두 자를 섞은 짝이다). 좁혀도 안 빨개지지만
         좁히지도 않는다 — 우리 값이 정확히 54.00 이라 좁혀서 잡는 것이 0 이고, 0.6 은 호스트·반올림
         여유다. 이 뜻을 `verify968` [3] 이 못박는다.
         ⚑ **ref 와의 어긋남 둘은 «한 사실» 이다** — 원점을 리터럴이 아니라 같은 자로 재면
         ref 상변 **+22.40** · h **54.59** ⇒ **하변 +76.99**, 우리 **+23.00 · 54.00 ⇒ +77.00**.
         하변이 **Δ0.01** 이므로 «키가 다른 것» 이 아니라 **상변만 0.6 위**다(두 수가 아니라 한 수). */
      ok('구분선 1개 · 6x54 · 3·4칸 사이(중심 706)',
        g.seps.length === 1 && near(g.seps[0].w, 6, 0.6) && near(g.seps[0].h, 54, 0.6)
        && near(g.seps[0].x + g.seps[0].w / 2 - cx, 706, 0.6),
        g.seps.length + '개 ' + (g.seps[0] ? f1(g.seps[0].w) + 'x' + f1(g.seps[0].h) + ' @' + f1(g.seps[0].x - cx) : ''));
      ok('구분선 상변 = 바 콘텐츠 상변 + 16 (352 ⓒ · ref 셸 바깥 +22)',
        g.seps.length === 1 && near(g.seps[0].y - (g.bar.y + BAR_BORDER), 16, 0.6),
        g.seps[0] ? f1(g.seps[0].y - (g.bar.y + BAR_BORDER)) : '없음');
    }
    /* 379 이관 — 이 항도 **정의째** 바뀐다. 균등분할 바의 칸은 이제 «바깥 상자» 를 나누므로
       끝 칸은 콘텐츠 변보다 6px(테두리) 밖에 있다. 대신 **두 가지**를 나눠서 묻는다:
         ⓐ 칸은 바 «바깥» 을 안 넘는다        — 격자가 바를 벗어나지 않는다
         ⓑ **배경을 가진 알약**은 콘텐츠 안에 머문다 — 이것이 셸 검정을 지키는 항이다
            (칸은 배경이 없어 테두리 밑에 들어가도 아무것도 안 덮지만, 알약이 나가면
             셸 테두리를 덮어 378 이 통째로 되돌아간다).
       389 (2026-08-29) — **4칸 격자도 이제 같다.** 종전 «모든 칸이 콘텐츠 안» 은 그 격자가
       콘텐츠를 나누던 시절의 물음이라, 그대로 두면 389 를 되돌린 트리에서도 초록이었다. */
    ok('모든 칸이 바 **바깥** 안 (돌출 0)',
      g.cells.every(c => c.x >= ox - 0.6 && c.x + c.w <= ox + ow + 0.6),
      g.cells.map(c => f1(c.x - ox) + '..' + f1(c.x + c.w - ox)).join(' '));
    ok('활성 알약은 바 **콘텐츠** 안 (셸 검정을 안 덮는다 — 378 이 여기에 얹혀 있다)',
      g.onIdx < 0 || (g.cells[g.onIdx].x >= cx - 0.6
        && g.cells[g.onIdx].x + g.cells[g.onIdx].w <= cx + cw + 0.6),
      g.onIdx < 0 ? '활성 없음'
        : f1(g.cells[g.onIdx].x - cx) + '..' + f1(g.cells[g.onIdx].x + g.cells[g.onIdx].w - cx)
          + ' / 콘텐츠 0..' + f1(cw));

    /* ---- 3. 칸 안 정합 ---- */
    console.log('\n[3] ' + b.name + ' — 활성 알약 · 라벨 잉크');
    ok('활성 칸 정확히 1개', g.onN === 1, g.onN + '개');
    /* 352 ⓐ 이관 (2026-08-29) — 36 → **32**. 묻는 것은 그대로다(«반경과 좌우 밴드»).
       ⚑⚑ **968 (2026-09-06) — 과녁을 다시 세웠다. 옛 주석의 «ref 32.0 ↔ 우리 32.0» 은
       두 자를 섞은 짝이었다.** `probe352.py` ⓐ 가 내는 수는 **반경(rx)이 아니라 «원호지수»** 다 —
       이 코너는 원이 아니라 **타원**(`.stab.on::after{border-radius:30px/33px}` · `top:-3px` 이라
       링 상단이 `pill_t` 보다 3 위)인데 자는 거기에 **원 모델**(`r = (d+ins) + √(2·d·ins)`)을 씌운다.
       대조군이 그것을 못박는다 — 참값이 CSS 로 **30** 인 우리 캡처를 같은 자로 재면 **28.1** 이고,
       그 타원 기하를 손으로 넣은 모델 예측이 **28.03**(Δ 0.07)이다. 자는 정상이고 출력이 rx 가 아니다.
       ⇒ **선언 30 과 자 눈금을 직접 빼지 마라.** 같은 자끼리의 짝은 이렇다:
           `--int` 옛 자   ref **32.0**(좌 30.1 · 우 33.9)  ↔ 우리 **28.7**
           부분화소 새 자  ref **30.6**(좌 28.7 · 우 32.5)  ↔ 우리 **28.1**   ⇒ Δ **+2.5**
       모델 역산(대조군이 30.00 으로 닫는 그 모델 · 종횡비 30:33 고정)으로 ref 를 rx 로 옮기면
       **rx ≈ 32.7**(눈금 중앙값 역산 32.65) ~ **33.0**(프로파일 최소제곱 · 대조군 rx 30.00 · RMS 0.18)이고,
       `radius(ref7, …, 2027)` 의 **원점 리터럴 1px 당 ∓1.3** 이 붙는다(2027 = 셸 2021 + 테두리 6 인데
       437 이 테두리를 7 로 확정했다 ⇒ 2028 이면 31.4) ⇒ 과녁은 **rx = 32.7 ± 1.3** 이다.
       ⇒ 선언 30 과의 차는 최소로 잡아도 **+1.4**, 리터럴 그대로면 **+2.7** — 어느 쪽이든 «0.6» 이 아니다.
       ⚠ **그래서 제품은 968 에서 0줄이다** — 선언 30 을 32 대로 옮기는 것은 409 의 코너 장치
       (타원 30/33 · 마스크 기둥 30px · 어깨 원판 `23px 25.3px at 30px 33px`)를 통째로 다시 세우는
       레이아웃 변경이고 352 5인 평균 30.2 와 정면으로 갈린다 ⇒ **970 으로 등재**(969 는 등재 경쟁으로 남에게 갔다). 못은 `verify968`.
       ⚠ `PILL_LIP 14`(좌우 검정 7 + 림 7)는 **세로 한복판**의 두께라 반경과 무관하게 불변이다. */
    /* 378 이관 (2026-08-29) — 이 항은 «네 겹이 다 있나» 를 물었다. 378 이 **셸 안쪽 변에 닿는 면**
       의 검정 7 을 셸 테두리에 넘겼다(ref 는 그 자리에 검정을 겹치지 않는다 — 352 §8 실측 ·
       `tools/probe378.js` 재현: 수리 전 닿는 면 9/9 가 `#000000 ×13`, 수리 후 9/9 가 ×6).
       ⚠ **기대값만 갈면 안 된다** — «검정이 통째로 사라져도 초록» 이 되기 때문이다.
       물음을 **면별로** 옮긴다. 두 갈래를 둘 다 단언하므로 어느 쪽을 지워도 빨개진다:
         · 셸 콘텐츠 변에 **닿는** 면 → 검정 없음 + 베벨 `#634F37` 7 (셸 테두리가 그 변을 겸한다)
         · **안 닿는** 면            → 검정 7 + 베벨 14 (측정표 07 §9 «좌우 테두리 7px #000000») */
    const bwn = parseFloat(g.bw), ccx = g.bar.x + bwn, ccw = g.bar.w - 2 * bwn;
    const onC = g.onIdx >= 0 ? g.cells[g.onIdx] : null;
    const touchL = !!onC && Math.abs(onC.x - ccx) <= 0.6;
    const touchR = !!onC && Math.abs(onC.x + onC.w - (ccx + ccw)) <= 0.6;
    /* 409 이관 (2026-08-29) — **검정이 밴드에서 «등폭 링» 으로 옮겨 갔다**(`::after` 에 스프레드
       인셋 7px, 코너 기둥 30px 마스크). 그래서 이 항의 «검정 7» 은 부모 box-shadow 에 더 이상
       없다 — 없다고 기대값만 지우면 «검정이 통째로 사라져도 초록» 이 되므로 378 때와 같은 규칙으로
       **묻는 자리를 옮긴다**: 검정은 링에서, 베벨은 그대로 부모 밴드에서, 그리고 «그 면에 링이
       붙어 있나» 는 마스크 기둥에서 묻는다(닿는 면은 기둥이 빠져 있어야 한다).
       ⇒ 어느 하나를 지워도 빨개진다: 링 제거 → ringOK 빨강 · 마스크 예외 제거 → 닿는 면 빨강 ·
         베벨 밴드 제거 → sideOK 빨강. 찍힌 픽셀 쪽은 `verify378` [2][3]·`verify409` 가 문다. */
    const sh = g.onShadow || '';
    const ring = g.onRing || '';           /* ::after box-shadow */
    const mask = g.onMask || '';           /* ::after mask-image */
    const has = re => new RegExp(re + ' 0px 0px 0px inset').test(sh);
    const BLK = 'rgb\\(0, 0, 0\\)', BEV = 'rgb\\(99, 79, 55\\)';
    const ringOK = /rgb\(0, 0, 0\) 0px 0px 0px 7px inset/.test(ring);
    /* 마스크 기둥 — 좌 기둥은 «rgb(0,0,0) 0px» 로 시작하고, 우 기둥은 «rgb(0,0,0) calc(100% - 30px)» 로 끝난다.
       409 11회차 이관 (2026-08-31) — 마스크가 다층이 됐다(기둥 + «어깨» 원판·보호 `radial-gradient` 넷).
       기둥은 **첫 층**이므로 거기서만 읽는다 — 옛 자는 우 기둥을 문자열 **끝**에서 찾아, 층이 하나
       늘어난 것만으로 빨개졌다(제품 결함이 아니다). 기둥 층이 사라지면 여전히 빨개진다. */
    const col = mask.split(/,\s*radial-gradient/)[0];
    const colL = /linear-gradient\(90deg, rgb\(0, 0, 0\) 0px/.test(col);
    const colR = /rgb\(0, 0, 0\) calc\(100% - 30px\)\)$/.test(col.trim());
    const sideOK = (t, sign) => t
      ? (has(BEV + ' ' + sign + '7px') && !has(BLK + ' ' + sign + '7px')
         && !(sign === '' ? colL : colR))
      : (ringOK && (sign === '' ? colL : colR) && has(BEV + ' ' + sign + '14px'));
    ok('활성 알약 radius 30 · 좌 ' + (touchL ? '셸에 닿음 → 베벨 7 (검정 0)' : '검정 7 + 베벨 14')
      + ' · 우 ' + (touchR ? '셸에 닿음 → 베벨 7 (검정 0)' : '검정 7 + 베벨 14'),
      g.onRadius === '30px' && sideOK(touchL, '') && sideOK(touchR, '-'),
      g.onRadius + ' / ' + sh.slice(0, 60));
    g.cells.forEach((c, i) => {
      const k = g.ink[i];
      if (!k) { ok('칸' + (i + 1) + ' 라벨 <i> 존재', false); return; }
      const on = i === g.onIdx;
      ok('칸' + (i + 1) + '«' + g.labels[i] + '» 잉크 중심 = 칸 중심 (Δ ≤ 2)',
        near(k.x + k.w / 2, c.x + c.w / 2, 2), 'Δ' + f1(k.x + k.w / 2 - (c.x + c.w / 2)));
      /* 활성 칸은 «면» 안(좌우 림 침범 0), 비활성 칸은 칸 안.
         378 이관 — 림은 이제 **면마다 다르다**: 셸 콘텐츠 변에 닿는 면은 검정 7 을 셸에 넘겨
         `PILL_EDGE_LIP 7`, 안 닿는 면은 그대로 `PILL_LIP 14`. 실제 림보다 넓게 잡으면
         «면 밖으로 나간 잉크» 를 놓치므로 값을 면별로 쓴다. */
      const lipL = on && touchL ? PILL_EDGE_LIP : PILL_LIP;
      const lipR = on && touchR ? PILL_EDGE_LIP : PILL_LIP;
      const lo = c.x + (on ? lipL : 0), hi = c.x + c.w - (on ? lipR : 0);
      ok('칸' + (i + 1) + ' 잉크 ' + (on ? '알약 면(림 ' + lipL + '/' + lipR + ')' : '칸') + ' 안 (잘림 0)',
        k.x >= lo - 0.5 && k.x + k.w <= hi + 0.5,
        f1(k.x - c.x) + '..' + f1(k.x + k.w - c.x) + ' / ' + (on ? f1(lipL) + '..' + f1(c.w - lipR) : '0..' + f1(c.w)));
      ok('칸' + (i + 1) + ' 라벨 외곽선 = ' + (on ? 'ol4(활성)' : 'ol3(비활성)'),
        on ? (k.ol4 && !k.ol3) : (k.ol3 && !k.ol4), 'ol3=' + k.ol3 + ' ol4=' + k.ol4);
    });
    /* ══ 563 이관 (2026-08-31) — «칸 안 (돌출 0)» 은 471 **이전**의 기준선이었다 ═══════════
       이 항이 네 바에서 **11 자리 전부** 빨갰고 돌출량이 어디서나 정확히 2.5px 이었다.
       338 규칙대로 처방 전에 `tools/probe563.js` 로 재현했고 **뿌리는 제품이 아니라 이 항**이다:
         · 찍힌 화소로 칸 오른변 «밖» 에 닷이 실제로 그려진다(11/11) — 그리고 **안 잘린다**
           (오른쪽 검정 외곽이 끝까지 있다 = 471 이 고친 «반달» 이 아니다).
         · 중심은 자리마다 **칸 우상단 코너 안쪽 11.0/11.0** = 471 규약 그대로다.
         · 돌출량은 규약식이 만드는 **닫힌 값**이다 — index.html 의
           right: calc(var(--dot-in-x, var(--dot-in)) - var(--dot-r) - var(--dot-bw, 0px))
           ⇒ 돌출 = --dot-r + --dot-bw − --dot-in = 13.5 + 0 − 11 = **2.5**.
       즉 «돌출 0» 과 471 규약(«닷 중심이 호스트 코너 안쪽 --dot-in» = 바깥 링이 코너에 «걸친다»)은
       **동시에 참일 수 없다.** 471 이 15+ 호스트를 한 규약으로 통일할 때 이 자만 옛 기준선에 굳었다.
       처방은 333·334·368 과 같다 — 허용을 넓히지 않는다(«2.5 까지 봐준다» 로 풀면 닷이 코너를
       떠나도 초록이라 «레드닷 자리» 라는 뜻을 통째로 잃는다). **묻는 자리를 옮긴다**:
       «칸 안» → «중심이 칸 우상단 코너에서 안쪽 --dot-in», 그리고 그 값은 손으로 적지 않고
       **제품이 선언한 것을 읽는다**(276 · 185-①). 무르게 푼 수리가 아님은 `tools/neg563.js` 가 못박는다.
       ⚠ 47 이 여기서 지키던 뜻(«배지는 자기 칸의 것이고 이웃 칸으로 옮겨 가지 않는다»)은 ③ 이
         그대로 받는다 — 걸치는 면은 **코너 쪽 둘뿐**이고 좌·하변은 칸 안이다.
       ⚠ «잘림 0(반달)» 은 여기서 다시 묻지 않는다 — `verify471` [B][C] 가 조상 overflow 와
         찍힌 화소로 이미 문다(자매 자 드리프트 방지 · 385). */
    ok('전제 — 배지가 있고 471 규약 상수를 제품이 선언한다 (--dot-in · --dot-r = 상자 반지름)',
      g.bdg.length > 0 && g.bdg.every(d => d.cell >= 0
        && parseFloat(d.dotInX || d.dotIn) > 0
        && Math.abs(parseFloat(d.dotR) - d.r.w / 2) <= 0.6),
      g.bdg.length ? '배지 ' + g.bdg.length + '개 · --dot-in ' + (g.bdg[0].dotInX || g.bdg[0].dotIn)
        + ' · --dot-r ' + g.bdg[0].dotR + ' ↔ 상자 반지름 ' + f1(g.bdg[0].r.w / 2)
        + ' · 칸 테두리 ' + f1(g.bdg[0].cellBw) : '배지 0개');
    g.bdg.forEach(d => {
      const c = g.cells[d.cell];
      const inX = parseFloat(d.dotInX || d.dotIn) || 0;
      const inY = parseFloat(d.dotInY || d.dotIn) || 0;
      /* 471 규약의 기준은 «테두리 **바깥** 상자» = 사람이 보는 칸 변이고, rect 가 곧 그것이다
         (되빼기 `--dot-bw` 는 절대배치가 패딩 상자 기준이라 생기는 값 — 칸은 테두리 0 이라 0). */
      const dxR = (c.x + c.w) - (d.r.x + d.r.w / 2);        /* 칸 우변 ↔ 닷 중심 */
      const dyT = (d.r.y + d.r.h / 2) - c.y;                /* 칸 상변 ↔ 닷 중심 */
      ok('레드닷 상자 27x27 · 칸' + (d.cell + 1),
        near(d.r.w, 27, 0.8) && near(d.r.h, 27, 0.8), f1(d.r.w) + 'x' + f1(d.r.h));
      ok('레드닷 중심 = 칸' + (d.cell + 1) + ' 우상단 코너에서 안쪽 --dot-in (471 규약 · ±0.5)',
        Math.abs(dxR - inX) <= 0.5 && Math.abs(dyT - inY) <= 0.5,
        '안쪽 ' + f1(dxR) + '/' + f1(dyT) + ' vs 규약 ' + f1(inX) + '/' + f1(inY)
          + ' · 코너 걸침 ' + f1(d.r.x + d.r.w - (c.x + c.w)) + 'px');
      ok('레드닷이 걸치는 면은 코너 쪽 둘뿐 — 칸' + (d.cell + 1) + ' 좌·하변은 안 넘는다',
        d.r.x >= c.x - 0.5 && d.r.y + d.r.h <= c.y + c.h + 0.5,
        '좌 여유 ' + f1(d.r.x - c.x) + ' · 하 여유 ' + f1(c.y + c.h - (d.r.y + d.r.h)));
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
      /* 활성 스타일은 fs43→41 · scaleX .914→.893 으로 잉크가 바뀐다 — 옮겨간 칸에서 다시 잰다.
         378 이관 — 옮겨간 칸도 끝 칸일 수 있다(03 은 «컨텐츠» = 첫 칸으로 옮긴다) → 림을 면별로. */
      const bw2 = parseFloat(g2.bw), cx2 = g2.bar.x + bw2, cw2 = g2.bar.w - 2 * bw2;
      const lipL2 = Math.abs(c.x - cx2) <= 0.6 ? PILL_EDGE_LIP : PILL_LIP;
      const lipR2 = Math.abs(c.x + c.w - (cx2 + cw2)) <= 0.6 ? PILL_EDGE_LIP : PILL_LIP;
      ok('옮겨간 활성 칸 잉크도 알약 면 안 (잘림 0 · 림 ' + lipL2 + '/' + lipR2 + ')',
        k && k.x >= c.x + lipL2 - 0.5 && k.x + k.w <= c.x + c.w - lipR2 + 0.5,
        k ? f1(k.x - c.x) + '..' + f1(k.x + k.w - c.x) + ' / 면 ' + lipL2 + '..' + f1(c.w - lipR2) : '잉크 없음');
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
