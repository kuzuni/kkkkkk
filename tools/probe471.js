#!/usr/bin/env node
/* 재현 — 작업 471 「레드닷 위치 전면 통일」 (저장소 주인 보고 2026-08-30, 스크린샷 3장)
 *
 *   node tools/probe471.js            전수 실측표 (상자 축)
 *   node tools/probe471.js --ink      + «그려진 잉크» 축 (5회차 신설 — 느리다: 자리마다 클립 2장)
 *   node tools/probe471.js --json     기계용
 *
 * 338 규칙대로 **처방 전에 재현한다.** 등재문은 «자리가 호스트마다 제각각 · 잘리는 곳이 있다» 인데
 * 그것이 실제로 몇 px 인지, 어디가 잘리는지를 **찍힌 상자**로 먼저 받는다.
 *
 * 재는 것 (닷 하나마다):
 *   · dxR = 호스트 **테두리 바깥 상자(border box)** 우변 − 닷 코어 중심 x   (+ = 안쪽)
 *   · dyT = 닷 코어 중심 y − 호스트 border box 상변                          (+ = 안쪽)
 *   · cut = 닷 **바깥 링까지 포함한 원**(반지름 21 = 코어 13.5 + 검정 테 7.5)이
 *           조상 클리핑(overflow≠visible)에 잘리는 양 [상/우/하/좌] px
 *   · bw  = 호스트 테두리 두께(우/상) — 규약을 «테두리 바깥 코너» 로 잡을 때 필요한 값
 *
 * ⚑ 5회차 신설 «잉크 축»(`--ink`) — 비평가 BM(1회차)·BP(2회차)·BO(2회차) **3인 독립 일치**:
 *   «상자가 그려진 그림보다 넓어서, 규약대로 상자 코너를 써도 **눈에는** 코너 걸침이 아니다».
 *   그래서 상자가 아니라 **호스트가 실제로 칠한 화소**의 우상단을 같이 잰다(350·368 «찍힌 픽셀» 처방):
 *     ① 닷을 숨긴 클립 1장 → ② 호스트를 `visibility:hidden` 한 같은 클립 1장 → ③ 두 장의 차분
 *   차분이 곧 «이 호스트가 칠한 것» 이라 배경색을 추측할 필요가 없다.
 *   · dxRi / dyTi = **잉크 상자** 우상단 코너 기준 안쪽 거리
 *   · inkR / inkT = 상자 코너 ↔ 잉크 코너의 어긋남(+ = 잉크가 상자보다 안쪽)
 *
 * 진입·상태 강제는 `tools/verify299.js` 의 목록을 그대로 쓴다(같은 자리를 재야 대조가 된다 —
 * 385 «자매 자 드리프트» 방지). 조건부 노드는 **실물이 찍히도록 상태를 만들고** 되돌린다.
 *
 * ⚑ 550 «두 축을 같은 순간에 잰다»(2026-08-30) — 상자 축도 **등장 애니가 멎은 뒤**에 읽는다.
 *   수리 전에는 `settle()` 이 잉크 루프 안에서만 돌아 상자와 잉크가 다른 프레임을 봤고,
 *   35 패스 탭이 `jzPgIn`(scale .985, 축은 패널 중심) 한복판에서 읽혀 «어긋남 상 14.5px» 로 나왔다.
 *   ⇒ 상자 축의 값이 4회차와 소수점에서 달라진다(예: `.pt` 20.7/10.8 → 21/11 · 닷 지름 26.6 → 27).
 *      **자리가 바뀐 것이 아니라 흔들림이 멎은 것**이고, [A] 허용 ±2 는 한 칸도 안 넓혔다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
/* 439 선례 — 재는 «대상 파일» 을 밖에서 갈아 끼울 수 있게 한다(`P471_FILE`).
   `verify471` 의 되돌림 시험이 «규약을 어긴 사본» 을 만들어 이 자에게 물어보기 위해서다.
   ⚠ 사본은 **저장소 루트**에 둔다 — /tmp 에 두면 assets/** 가 통째로 404 다. */
const URL = process.env.P471_FILE
  ? ('file://' + path.resolve(process.env.P471_FILE))
  : ('file://' + path.resolve(__dirname, '..', 'index.html'));
const KEY = 'idle_hunter_save_v4';
const JSONOUT = process.argv.includes('--json');
const INK = process.argv.includes('--ink');
/* 550 — 되돌림 시험용 손잡이. 평소에는 둘 다 꺼져 있다.
     P471_NODRAIN=1   «멎을 때까지 기다렸다 읽기» 를 끈다(수리 전 자로 되돌린다)
     P471_FORCEANIM=1 장면을 연 뒤 등장 애니를 0프레임으로 되돌려 최악을 결정적으로 만든다 */
const NODRAIN = process.env.P471_NODRAIN === '1';
const FORCEANIM = process.env.P471_FORCEANIM === '1';

/* ── 장면표 ────────────────────────────────────────────────────────────────
   `open`/`close` 는 페이지 안에서 그대로 도는 소스다(`wait(ms)` 를 쓸 수 있다).
   한 장면의 `items` 는 그 상태에서 한꺼번에 재는 자리들이다.
   ⚠ 장면을 쪼갠 이유는 잉크 축 때문이다 — 클립 촬영이 node 쪽이라 상태를 열어 둔 채로 나와야 한다.
      상자 축만 볼 때(기본)의 순서·상태·값은 4회차와 **한 글자도 다르지 않다.** */
const SCENES = [
  { open: '', close: '', items: [
    { label: 'HUD ▦ 메뉴 #menub .bdg', dot: '#menub .bdg', host: '#menub' },
    { label: 'HUD 사이드 .ibtn .bdg', dot: '.ibtn .bdg', host: '.ibtn' },
    { label: 'HUD 탭바 .tab .bdg', dot: '#tabbar .tab .bdg', host: '.tab' },
  ] },
  { open: 'openMenu(); await wait(150);', close: 'closeMenu(); await wait(120);', items: [
    { label: '▦ 메뉴 칸 .mn-b>.bdg', dot: '#mnw .mn-b>.bdg', host: '.mn-b' },
  ] },
  { open: 'openDungeon(); await wait(350);',
    close: "if (typeof closeDungeon === 'function') closeDungeon(); else document.getElementById('dunw').classList.remove('on'); await wait(150);",
    items: [
      { label: '03 카드 .dnc .dot', dot: '#dunw .dnc .dot', host: '.dnc', mk: { host: '#dunw .dns-list .dnc', cls: 'dot' } },
      { label: '03 서브탭 .stab>.bdg', dot: '#dunw .stab>.bdg', host: '.stab' },
    ] },
  { open: 'openColl21(); await wait(200);', close: 'closeColl21(); await wait(120);', items: [
    { label: '21 도감 탭 .cltab>s.dot', dot: '.cltab>s.dot', host: '.cltab' },
  ] },
  { open: 'openWeapon(); await wait(200);', close: 'closeWeapon(); await wait(120);', items: [
    { label: '05 카드 .wgc>.updot', dot: '#wpnw .wgc>.updot', host: '.wgc', mk: { host: '#wpnw .wgc', cls: 'updot' } },
    { label: '05 [일괄 강화] .wm-btn>.updot', dot: '.wm-btn>.updot', host: '.wm-btn', mk: { host: '#wpnw .wm-btn', cls: 'updot' } },
  ] },
  { open: "goTab('hero', true); heroSubGo('eq'); await wait(300);", close: '', items: [
    { label: '06 슬롯 .eqsl>.updot', dot: '.eqsl>.updot', host: '.eqsl', mk: { host: '.eqsl', cls: 'updot' } },
  ] },
  { open: "heroSubGo('sk'); await wait(300);", close: '', items: [
    { label: '07 카드 .sk-card>.updot', dot: '#bSk .sk-card>.updot', host: '.sk-card', mk: { host: '#bSk .sk-card', cls: 'updot' } },
    { label: '07 [일괄 강화] .sk-btn>.updot', dot: '.sk-btn>.updot', host: '.sk-btn', mk: { host: '.sk-btn', cls: 'updot' } },
    { label: '07 시트 서브탭 .stab>.bdg', dot: '#bSk .stab>.bdg,#eqTabs .stab>.bdg', host: '.stab' },
  ] },
  { open: 'openTrain(); await wait(200);', close: 'closeTrain(); await wait(120);', items: [
    { label: '23 카드 .tr-card>.dot', dot: '.tr-card>.dot', host: '.tr-card' },
  ] },
  { open: 'openShopPage(); await wait(250);', close: '', items: [
    { label: '10 «10회 소환» 버튼 .cbtn.b1 (328 — 노드는 카드 자식)', dot: '.shp-card>.updot', host: '.shp-card', mHost: '.cbtn.b1' },
    { label: '10 탭 #shopCats .stab>.bdg', dot: '#shopCats .stab>.bdg', host: '.stab' },
  ] },
  { open: "S.daily.adBuy = {}; openShopPage(null, 'coin'); await wait(300);",
    close: "openShopPage(null, 'summon'); await wait(150); closeShopPage(); await wait(120);", items: [
      { label: '13 광고 [받기] 버튼 .cn-cd .bt>.updot (479)', dot: '#shopList .cn-cd .bt>.updot', host: '.cn-cd>.bt' },
    ] },
  { open: 'S.relic = 1e6; openRelw(); await wait(250);', close: 'closeRelw(); await wait(120);', items: [
    { label: '89 유물 수반 #rwBasin>.updot', dot: '#rwBasin>.updot', host: '#rwBasin' },
  ] },
  { open: "window.__attSnap = JSON.stringify(S.att); S.att = { n: 3, date: '' }; openAttend(); await wait(250);",
    close: 'closeModal(); S.att = JSON.parse(window.__attSnap); uiDirty = true; await wait(150);', items: [
      { label: '70 출석 «오늘 카드» .at-c>.updot', dot: '#mbox [data-att]>s.updot', host: '.at-c,.at-c7' },
    ] },
  { open: 'window.__qSnap = JSON.stringify({ q: S.quest, k: S.totalKills, b: S.best, sm: S.summons, up: S.upgrades });'
        + ' QUESTS.forEach(q => { S.quest[q.id].base = 0; });'
        + " S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9; openQuest('rep'); await wait(250);",
    close: 'closeModal(); { const s = JSON.parse(window.__qSnap); S.quest = s.q; S.totalKills = s.k; S.best = s.b; S.summons = s.sm; S.upgrades = s.up; } uiDirty = true; await wait(150);',
    items: [
      { label: '22 행 [보상 받기] .qs-b>.updot', dot: '.qs-b>.updot', host: '.qs-b' },
      { label: '22 [모두 받기] #qAll>.updot ★기준', dot: '#qAll>.updot', host: '#qAll' },
    ] },
  { open: 'openPromo(); await wait(250);', close: 'closeModal(); await wait(150);', items: [
    { label: '승급전 [승급전 시작] #pgo>.updot', dot: '#pgo>.updot', host: '.ifbtn.pbtn', mk: { host: '#pgo', cls: 'updot' } },
  ] },
  { open: "renderSt(); document.getElementById('panel').style.display = 'flex';"
        + " document.getElementById('bSt').classList.add('on'); await wait(150);",
    close: "document.getElementById('bSt').classList.remove('on');"
         + " document.getElementById('panel').style.display = ''; await wait(150);", items: [
      { label: '내 정보 [승급전 도전] #promoBtn>.updot', dot: '#promoBtn>.updot', host: '.ifbtn.pbtn', mk: { host: '#promoBtn', cls: 'updot' } },
    ] },
  { open: 'window.__spSnap = S.daily.spins; S.daily.spins = 1; openRoulette(); await wait(250);',
    close: 'closeModal(); S.daily.spins = window.__spSnap; uiDirty = true; await wait(150);', items: [
      { label: '29 룰렛 [룰렛 돌리기] #rouBtn>.updot', dot: '#rouBtn>s.updot', host: '#rouBtn' },
    ] },
  { open: 'window.__blSnap = JSON.stringify(S.bless.exp); S.bless.exp = { atk: 0, hp: 0, rate: 0 }; openBless(); await wait(250);',
    close: 'closeBless(); S.bless.exp = JSON.parse(window.__blSnap); uiDirty = true; await wait(150);', items: [
      { label: '34 축복 «받기» 알약 .bls-c .tm>.updot', dot: '.bls-c .tm>.updot', host: '.tm' },
    ] },
  { open: "openPass('stage'); await wait(250);", close: 'closePass();', items: [
    { label: '35 패스 탭 #psBar .pt>.bdg', dot: '#psBar .pt>.bdg', host: '.pt' },
    { label: '35 보상 칸 .ps-bx>.updot', dot: '#psTk .ps-bx>s.updot', host: '.ps-bx' },
  ] },
];

/* 장면 안의 자리들을 재고, 잉크 축을 위해 대표 호스트에 `data-p471` 을 남긴다. */
function collect(items) {
  const RING = 7.5;   /* 닷 바깥 링 — 코어 13.5 + 검정 테 7.5 («그려질 상자» 로 잰다: 잘림 판정은 이쪽이 맞다) */
  const out = [];
  const clipOf = (el) => {
    /* 조상 클리핑 상자의 교집합. border-radius 는 무시한다(코너에서 더 많이 잘리므로 하한이다). */
    let r = { l: -1e9, t: -1e9, rt: 1e9, b: 1e9 }, p = el.parentElement, host = null;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const q = p.getBoundingClientRect();
        if (cs.overflowX !== 'visible') { r.l = Math.max(r.l, q.left); r.rt = Math.min(r.rt, q.right); }
        if (cs.overflowY !== 'visible') { r.t = Math.max(r.t, q.top); r.b = Math.min(r.b, q.bottom); }
        if (!host) host = p;
      }
      p = p.parentElement;
    }
    return { r, host };
  };
  items.forEach((it, idx) => {
    let dots = [...document.querySelectorAll(it.dot)];
    let tmp = null;
    if (!dots.length && it.mk) {
      const h = document.querySelector(it.mk.host);
      if (h) { tmp = document.createElement(it.mk.tag || 's'); tmp.className = it.mk.cls; h.appendChild(tmp); dots = [tmp]; }
    }
    if (!dots.length) { out.push({ label: it.label, missing: true }); return; }
    const seen = [];
    let rep = null;
    dots.forEach(d => {
      let h = it.host ? d.closest(it.host) : d.parentElement;
      if (it.mHost && h) h = h.querySelector(it.mHost) || h;
      if (!h) return;
      const prev = d.style.display, prevA = d.style.animation;
      d.style.display = 'block'; d.style.animation = 'none';
      const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
      const cs = getComputedStyle(d), hs = getComputedStyle(h);
      const clip = clipOf(d);
      d.style.display = prev; d.style.animation = prevA;
      if (!hr.width || !dr.width) return;
      const cx = dr.left + dr.width / 2, cy = dr.top + dr.height / 2;
      /* ⚑ 4회차 — 링을 상수 7.5 로 두면 **`border` 로 링을 그리는 부품**(`.tab .bdg` — 41 상자 안에
         검정 5px)에서 바깥 반지름을 7.5px 과대평가한다. 그 칸을 프레임 변에 접하게 두면 [B] 가
         있지도 않은 잘림 7.5px 을 잡는다(4회차에 실제로 그랬다). ⇒ **링이 상자 밖에 그려질 때만**
         더한다 — `box-shadow` 로 그린 부품(`.updot`·`#psBar .pt>.bdg` 계열)이 그쪽이다. */
      const outside = cs.boxShadow && cs.boxShadow !== 'none';
      const R = dr.width / 2 + (outside ? RING : 0);
      /* ⚠ 스크롤 그릇 밖으로 밀려난 행(«지금 안 보이는 카드»)은 «잘림» 이 아니다 —
         그 자리의 결함은 스크롤하면 사라진다. 호스트가 클립 띠 안에 있을 때만 센다. */
      const inBand = hr.top >= clip.r.t - 1 && hr.bottom <= clip.r.b + 1;
      const cut = !inBand ? [0, 0, 0, 0] : [
        Math.max(0, clip.r.t - (cy - R)),      /* 위 */
        Math.max(0, (cx + R) - clip.r.rt),     /* 우 */
        Math.max(0, (cy + R) - clip.r.b),      /* 아래 */
        Math.max(0, clip.r.l - (cx - R)),      /* 좌 */
      ].map(v => Math.round(v * 10) / 10);
      const row = {
        dxR: Math.round((hr.right - cx) * 10) / 10,
        dyT: Math.round((cy - hr.top) * 10) / 10,
        bwR: Math.round(parseFloat(hs.borderRightWidth) * 10) / 10,
        bwT: Math.round(parseFloat(hs.borderTopWidth) * 10) / 10,
        w: Math.round(dr.width * 10) / 10,
        css: cs.right + '/' + cs.top,
        host: h.className || h.id,
        hw: Math.round(hr.width), hh: Math.round(hr.height),
        cut, clipper: clip.host ? (clip.host.id || clip.host.className).slice(0, 28) : '',
        _cx: cx, _cy: cy,
        _hr: { l: hr.left, t: hr.top, r: hr.right, b: hr.bottom },
      };
      seen.push(row);
      if (!rep) { rep = { el: h, dots: [d] }; } else if (rep.el === h) { rep.dots.push(d); }
    });
    if (tmp) tmp.remove();
    if (!seen.length) { out.push({ label: it.label, missing: true, why: '상자 0' }); return; }
    /* 같은 자리는 첫 개만 대표로 싣되, 편차가 있으면 최댓값도 싣는다 */
    const r0 = seen[0];
    const spread = Math.round(Math.max(...seen.map(s => Math.abs(s.dxR - r0.dxR))) * 10) / 10;
    const cutMax = [0, 1, 2, 3].map(i => Math.max(...seen.map(s => s.cut[i])));
    if (rep) rep.el.setAttribute('data-p471', String(idx));
    out.push({ label: it.label, n: seen.length, ...r0, spread, cutMax, _idx: idx });
  });
  return out;
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  /* ⚠ 잉크 축은 **같은 화면을 두 번 찍어 뺀다** — 두 장 사이에 애니메이션이 한 프레임이라도 움직이면
     그 화소가 통째로 «잉크» 로 읽힌다. 그래서 `--ink` 일 때만 움직임을 세운다.
     ⚠ **`animation-play-state:paused` 로 세우면 안 된다** — 팝업 등장 애니메이션이 **0프레임(opacity 0)**
        에 얼어 화면이 통째로 비고, 차분이 «잉크 0» 으로 나온다(1차 시도에서 27자리 중 23자리가 그랬다).
        유한 애니메이션은 **끝까지 보내고**(`finish()`) 무한 애니메이션(레드닷 맥박 등)만 0프레임에 세운다. */
  if (INK) await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });
  /* ⚠ 잉크 축에서는 전투 캔버스를 **도로 보이게** 한다(`step` 은 이미 빈 함수라 정지 화면이다).
     숨긴 채로 재면 뒤가 새까매서 **반투명 배경이 통째로 «안 칠한 것» 으로 읽힌다** —
     `#menub{background:rgba(0,0,0,.24)}` 이 검정 위 검정이 되어 잉크가 ▦ 글리프 59×57 로 나오고,
     «상자가 그림보다 20px 넓다» 는 **자가 만든 유령**이 된다(1차 측정에서 실제로 그랬다). */
  if (INK) await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = ''; });
  const settle = () => page.evaluate(() => {
    document.getAnimations().forEach(a => {
      try {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
        if (t && t.iterations === Infinity) { a.currentTime = 0; a.pause(); } else { a.finish(); }
      } catch (e) { /* 못 세우는 것은 그냥 둔다 — 차분에 잡히면 잉크가 커질 뿐 작아지지 않는다 */ }
    });
  });

  const run = (src) => src
    ? page.evaluate(async (s) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        await (0, eval)('(async (wait) => {' + s + '})')(wait);
      }, src)
    : Promise.resolve();

  /* 클립 차분 → 잉크 bbox (페이지 좌표).
     ⚑ 세 장을 찍는다 — A(닷만 숨김) · B(호스트도 숨김) · A2(되돌린 뒤 다시 A).
     화면이 스스로 다시 그리는 자리(퀘스트 팝업처럼 목록을 갱신하는 곳)에서는 A↔B 차분에
     **호스트와 무관한 흔들림**이 섞여 들어와 잉크 상자가 회차마다 튄다(기준 `#qAll` 이
     0/0.6 ↔ −10.9/35.3 으로 흔들려 게이트가 플레이키해졌다 — 344 규칙).
     ⇒ **A 와 A2 가 서로 다른 화소는 통째로 뺀다.** 남는 것만 «호스트가 칠한 것» 이다. */
  /* ⚑ 4회차 신설 «상단 띠» 축 — 비평가 BQ 가 3회차에 낸 지적 하나를 자로 받는다.
     `.ibtn`(02 사이드) 의 차분 잉크는 **아이콘 글리프 + 그 아래 라벨(`.sl`)의 합집합**이라
     우변이 라벨 쪽에서 결정된다. 그런데 **우상단 코너에서 눈이 견주는 변은 글리프의 것**이다
     (BQ: «달력 우변이 점 중심보다 36 시트px 왼쪽 = 겹침 0%» — union 축은 6.5px 안쪽으로 읽었다).
     ⇒ 같은 차분을 **호스트 높이의 위 1/3 안에서만** 다시 재서 `core3` 로 싣는다.
     ⚠ 이 축은 «union 이 틀렸다» 가 아니다 — 둘 다 맞고, 코너 규약이 쓸 것이 어느 쪽이냐다. */
  const diff = async (a, b, a2, clip, band) => page.evaluate(async ([a64, b64, a264, cl, bandY]) => {
    const load = async (s) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + s; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.getContext('2d').getImageData(0, 0, img.width, img.height);
    };
    const A = await load(a64), B = await load(b64), A2 = await load(a264);
    if (A.width !== B.width || A.height !== B.height) return null;
    if (A2.width !== A.width || A2.height !== A.height) return null;
    /* ⚑ 문턱을 **둘** 둔다. 한 겹으로는 답이 안 나온다는 것을 1차 측정이 보여 줬다 —
       «칠한 화소» 를 다 세면 **번짐(box-shadow·glow·drop-shadow)까지 잉크**가 되어
       `.cbtn.b1` 이 상자보다 26px **큰** 잉크로 나온다(= 사람이 보는 버튼 변이 아니다).
         · any(>10)  = 조금이라도 칠한 것 — «번짐 포함 실루엣»
         · core(>60) = 진하게 칠한 것 — **사람이 «변» 으로 보는 단단한 모양**
       규약의 기준은 core 쪽이다. 둘 다 싣는 이유는 다음 세션이 이 판단을 되짚을 수 있게 하려는 것. */
    const bb = (th, yLim) => {
      let l = 1e9, t = 1e9, r = -1e9, bo = -1e9, n = 0;
      const H = yLim === undefined ? A.height : Math.max(1, Math.min(A.height, Math.ceil(yLim - cl.y)));
      for (let y = 0; y < H; y++) for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]),
          Math.abs(A.data[i + 2] - B.data[i + 2]), Math.abs(A.data[i + 3] - B.data[i + 3]));
        /* 스스로 다시 그리는 화소는 제외 — «호스트를 숨겨서» 달라진 것만 잉크다 */
        const j = Math.max(Math.abs(A.data[i] - A2.data[i]), Math.abs(A.data[i + 1] - A2.data[i + 1]),
          Math.abs(A.data[i + 2] - A2.data[i + 2]), Math.abs(A.data[i + 3] - A2.data[i + 3]));
        if (d > th && j <= 10) { n++; if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bo) bo = y; }
      }
      return n ? { l: cl.x + l, t: cl.y + t, r: cl.x + r + 1, b: cl.y + bo + 1, n } : null;
    };
    const any = bb(10), core = bb(60);
    const core3 = bandY === null ? null : bb(60, bandY);
    return any ? { any, core, core3 } : null;
  }, [a.toString('base64'), b.toString('base64'), a2.toString('base64'), clip, band === undefined ? null : band]);

  /* ⚑ 550 — **상자 축도 «멎은 뒤» 에 읽는다.**
     수리 전에는 `settle()` 이 잉크 루프 **안에서만** 돌아서, 상자(`collect`)는 장면 대기가 끝난
     순간에 읽고 잉크(클립 3장)는 그보다 뒤에 읽었다. 두 읽기 사이에 등장 애니메이션이 남아 있으면
     **같은 호스트를 다른 순간에 잰다** — 그것이 `verify471` [F] 의 «35 패스 탭 어긋남 0.8/14.5» 였다.
     ⚠ 뿌리는 장면 대기가 짧아서가 아니다(`wait(250)` > `jzPgIn .12s`). **패스는 여는 데만 ~190ms**
       (493 이 리스트를 600행으로 늘렸다 — 526)라 `jz-o jz-pg` 가 대기가 끝날 무렵에야 붙는다.
       그래서 시간을 더 주는 처방은 «지금은 초록» 일 뿐이고, 리스트가 더 길어지면 도로 빨개진다.
     ⇒ 시간이 아니라 **상태**로 닫는다 — 도는 유한 애니가 0이 될 때까지 `settle()` 을 반복한다
       (늦게 시작하는 애니도 다음 바퀴에 잡힌다). `probe550` [4] 가 5/5 로 이 처방을 찍었다.
     ⚠ 이 드레인은 **잉크 축 전용이 아니다** — 두 축이 같은 상태를 봐야 대조가 성립한다.
       부수 효과로 무한 애니(닷 맥박)도 0프레임에 서므로 상자 축의 닷 지름이 회차마다 26.6↔26.9 로
       흔들리던 것까지 멎는다([G] 가 기준 그림에 요구하는 바로 그 base 상태다). */
  const drain = async (tries = 12) => {
    if (NODRAIN) return -1;
    for (let i = 0; i < tries; i++) {
      await settle();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const live = await page.evaluate(() => document.getAnimations().filter(a => {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
        return !(t && t.iterations === Infinity) && a.playState === 'running';
      }).length);
      if (!live) return i;
    }
    return tries;
  };

  /* §R 용 — 등장 애니를 **일부러** 되돌려 «애니 중에 읽는» 최악을 결정적으로 만든다.
     ⚑ 560 (2026-08-31) — «열고 나서 찾아 얼린다» 는 **그 자체가 경합**이었다.
       `jzOpen` 은 등장 애니가 끝나면 `jzDoneThen` 이 `jz-o jz-pg` 를 **떼므로**, 장면 대기
       (`openPass('stage'); await wait(250)`) 안에 애니가 끝나 버린 회차에는 **얼릴 것이 남아 있지 않다.**
       그러면 드레인이 있으나 없으나 «멎은 상자»(289×166) 를 읽어 `verify471` [R] 이
       «두 읽기가 같다» 로 죽는다 — 실측 `probe560` **14회 중 1회**(결정적 사망이 아니라 플레이키).
       늘 그렇듯 **시간을 더 주는 처방은 방향이 반대다**(550-②): 기다릴수록 애니는 더 확실히 끝나 있다.
     ⇒ 장면을 **열기 전에** 감시자를 걸어 `jz-pg` 가 붙는 **그 순간** 0프레임에 세운다.
       `MutationObserver` 콜백은 클래스가 붙은 스크립트가 스택을 비우는 즉시(마이크로태스크) 도는데,
       `jzDoneThen` 의 `finish`/`animationend` 는 **그보다 뒤 태스크**라 클래스가 아직 살아 있다.
       얼린 애니는 영영 안 끝나므로 `offO` 는 2.5초 타임아웃까지 안 돈다 = 읽는 동안 상태가 고정된다.
     ⚠ 이 손잡이는 켠 회차에서 «몇 개를 얼렸는가»(`froze`)를 같이 싣는다 — 0이면 최악을 못 만든 것이고,
       그 회차의 [R] 은 «시험이 죽은 것» 이 아니라 **«시험을 못 돌린 것»** 이다. `verify471` [R] 전제항이
       그 구별을 묻는다(333 처방 — 항을 지우거나 허용을 넓혀서 닫지 않는다). */
  if (FORCEANIM) await page.evaluate(() => {
    window.__p471froze = 0;
    const grab = (el) => el.getAnimations().forEach(a => {
      try { a.pause(); a.currentTime = 0; window.__p471froze++; } catch (_) {}
    });
    const mo = new MutationObserver(recs => {
      for (const r of recs) {
        const el = r.target;
        if (el && el.classList && el.classList.contains('jz-pg')) grab(el);
      }
    });
    mo.observe(document.documentElement,
      { subtree: true, attributes: true, attributeFilter: ['class'] });
    window.__p471mo = mo;
    document.querySelectorAll('.jz-pg').forEach(grab);   /* 이미 붙어 있던 것도 한 번 */
  });

  const rows = [];
  for (const sc of SCENES) {
    /* `froze` 는 **장면마다** 센다 — 그래야 PT 장면이 실제로 얼려졌는지를 [R] 이 물을 수 있다. */
    if (FORCEANIM) await page.evaluate(() => { window.__p471froze = 0; });
    await run(sc.open);
    /* 감시자가 이미 얼렸다 — 여기서는 «얼릴 것이 붙었는지» 만 기다린다(붙는 데 렌더 시간이 든다).
       끝까지 0이면 그 장면엔 등장 애니가 없었다는 뜻이고, 그 사실이 `froze` 로 그대로 실린다. */
    if (FORCEANIM) await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 16 && !window.__p471froze; i++) await wait(50);
    });
    const drained = await drain();
    const got = await page.evaluate(collect, sc.items);
    const live = await page.evaluate(() => document.getAnimations().filter(a => {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
      return !(t && t.iterations === Infinity) && a.playState === 'running';
    }).length);
    const froze = await page.evaluate(() => (window.__p471froze === undefined ? null : window.__p471froze));
    got.forEach(r => { r.live = live; r.drained = drained; r.froze = froze; });
    /* ⚑ 550 «읽은 값이 흔들리지 않는다» 를 **자 자신이** 증언한다.
       드레인이 진짜로 멎혔는지는 «도는 애니 수» 로 물으면 안 된다 — 관계 없는 자리에서
       유한 애니가 계속 나고 지므로 그 수는 늘 0이 아니고, 그것으로 단언하면 플레이키해진다.
       물어야 할 것은 하나다: **같은 호스트를 다시 재면 같은 값이 나오는가.**
       (`verify471` [F] 가 재는 어긋남은 상자와 잉크의 «두 읽기» 차이라 이 값이 곧 그 상한이다.) */
    await drain();
    const again = await page.evaluate(() => {
      const o = {};
      document.querySelectorAll('[data-p471]').forEach(e => {
        const q = e.getBoundingClientRect();
        o[e.getAttribute('data-p471')] = { t: q.top, r: q.right, w: q.width, h: q.height };
      });
      return o;
    });
    got.forEach(r => {
      const a = r._hr, b = again[String(r._idx)];
      r.mv = (a && b) ? Math.round(Math.max(Math.abs(a.t - b.t), Math.abs(a.r - b.r),
        Math.abs((a.b - a.t) - b.h), Math.abs((a.r - a.l) - b.w)) * 10) / 10 : null;
    });
    if (INK) {
      for (const row of got) {
        if (row.missing) continue;
        const i = row._idx;
        const cl = await page.evaluate((k) => {
          const h = document.querySelector('[data-p471="' + k + '"]');
          if (!h) return null;
          const q = h.getBoundingClientRect(), M = 26;
          const x = Math.max(0, Math.floor(q.left - M)), y = Math.max(0, Math.floor(q.top - M));
          return { x, y,
            width: Math.min(1080 - x, Math.ceil(q.width + M * 2)),
            height: Math.min(2280 - y, Math.ceil(q.height + M * 2)) };
        }, i);
        if (!cl || cl.width <= 0 || cl.height <= 0) continue;
        await settle();
        await page.evaluate((k) => {
          const h = document.querySelector('[data-p471="' + k + '"]');
          h.querySelectorAll('.updot,.bdg,s.dot,.dot').forEach(d => { d.dataset.p471h = d.style.visibility; d.style.visibility = 'hidden'; });
        }, i);
        const A = await page.screenshot({ clip: cl });
        await page.evaluate((k) => {
          const h = document.querySelector('[data-p471="' + k + '"]');
          h.dataset.p471v = h.style.visibility; h.style.visibility = 'hidden';
        }, i);
        const B = await page.screenshot({ clip: cl });
        await page.evaluate((k) => {
          const h = document.querySelector('[data-p471="' + k + '"]');
          h.style.visibility = h.dataset.p471v || ''; delete h.dataset.p471v;
        }, i);
        const A2 = await page.screenshot({ clip: cl });
        await page.evaluate((k) => {
          const h = document.querySelector('[data-p471="' + k + '"]');
          h.querySelectorAll('.updot,.bdg,s.dot,.dot').forEach(d => { d.style.visibility = d.dataset.p471h || ''; delete d.dataset.p471h; });
        }, i);
        const got2 = await diff(A, B, A2, cl, row._hr.t + (row._hr.b - row._hr.t) / 3);
        if (got2) {
          const ink = got2.core || got2.any;
          if (got2.core3) {
            row.dxRi3 = Math.round((got2.core3.r - row._cx) * 10) / 10;
            row.dyTi3 = Math.round((row._cy - got2.core3.t) * 10) / 10;
            row.inkR3 = Math.round((row._hr.r - got2.core3.r) * 10) / 10;
            row.inkT3 = Math.round((got2.core3.t - row._hr.t) * 10) / 10;
          }
          row.ink = { w: Math.round(ink.r - ink.l), h: Math.round(ink.b - ink.t) };
          row.inkAny = got2.any ? { w: Math.round(got2.any.r - got2.any.l), h: Math.round(got2.any.b - got2.any.t) } : null;
          row.dxRi = Math.round((ink.r - row._cx) * 10) / 10;
          row.dyTi = Math.round((row._cy - ink.t) * 10) / 10;
          row.inkR = Math.round((row._hr.r - ink.r) * 10) / 10;
          row.inkT = Math.round((ink.t - row._hr.t) * 10) / 10;
          if (got2.any) {
            row.anyR = Math.round((row._hr.r - got2.any.r) * 10) / 10;
            row.anyT = Math.round((got2.any.t - row._hr.t) * 10) / 10;
          }
        }
      }
    }
    await page.evaluate(() => document.querySelectorAll('[data-p471]').forEach(e => e.removeAttribute('data-p471')));
    got.forEach(r => { delete r._cx; delete r._cy; delete r._hr; delete r._idx; rows.push(r); });
    await run(sc.close);
  }

  if (JSONOUT) { console.log(JSON.stringify(rows, null, 1)); }
  else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log('PROBE471 — 레드닷 자리 전수 실측 (1080×2280)' + (INK ? ' + 잉크 축' : '') + '\n');
    if (INK) {
      console.log(pad('자리', 40) + pad('n', 3) + pad('상자 dxR/dyT', 14) + pad('잉크 dxRi/dyTi', 16)
        + pad('상자↔잉크 우/상', 16) + pad('상단띠 dxRi3/dyTi3', 19) + '잉크 w×h (core)');
      console.log('-'.repeat(160));
      rows.forEach(r => {
        if (r.missing) { console.log(pad(r.label, 40) + '  — 노드 없음 ' + (r.why || '')); return; }
        console.log(pad(r.label, 40) + pad(r.n, 3) + pad(r.dxR + '/' + r.dyT, 14)
          + pad(r.dxRi === undefined ? '—' : r.dxRi + '/' + r.dyTi, 16)
          + pad(r.inkR === undefined ? '—' : r.inkR + '/' + r.inkT, 16)
          + pad(r.dxRi3 === undefined ? '—' : r.dxRi3 + '/' + r.dyTi3, 19)
          + (r.ink ? r.ink.w + '×' + r.ink.h : ''));
      });
      const gap = rows.filter(r => !r.missing && r.inkR !== undefined
        && (Math.abs(r.inkR) > 3 || Math.abs(r.inkT) > 3));
      console.log('\n요약: 상자와 잉크가 3px 넘게 어긋난 자리 ' + gap.length + '개 — '
        + (gap.map(r => r.label.split(' ')[0] + ' ' + r.inkR + '/' + r.inkT).join(' · ') || '없음'));
    } else {
      console.log(pad('자리', 40) + pad('n', 3) + pad('dxR', 7) + pad('dyT', 7) + pad('테(우/상)', 10)
        + pad('css(right/top)', 18) + pad('잘림 상/우/하/좌', 22) + '자르는 조상');
      console.log('-'.repeat(140));
      rows.forEach(r => {
        if (r.missing) { console.log(pad(r.label, 40) + '  — 노드 없음 ' + (r.why || '')); return; }
        console.log(pad(r.label, 40) + pad(r.n, 3) + pad(r.dxR, 7) + pad(r.dyT, 7)
          + pad(r.bwR + '/' + r.bwT, 10) + pad(r.css, 18)
          + pad(r.cutMax.join('/'), 22) + (r.cutMax.some(v => v > 0.05) ? r.clipper : ''));
      });
      const cut = rows.filter(r => !r.missing && r.cutMax.some(v => v > 0.05));
      const xs = rows.filter(r => !r.missing).map(r => r.dxR);
      console.log('\n요약: 자리 ' + rows.filter(r => !r.missing).length + '개 · 잘리는 자리 ' + cut.length
        + '개 · dxR 범위 ' + Math.min(...xs) + ' ~ ' + Math.max(...xs)
        + ' (폭 ' + Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10 + 'px)');
    }
    if (errs.length) console.log('콘솔 에러: ' + errs.slice(0, 3).join(' | '));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
