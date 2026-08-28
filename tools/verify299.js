#!/usr/bin/env node
/* 게이트 — 작업 299 「레드닷 위치 전부 «우상단» 통일」 (저장소 주인 지시 2026-08-27)
 *
 *   node tools/verify299.js
 *
 * 규약: 모든 레드닷(배지)의 **중심이 부모(호스트) 상자의 우상단 사분면**에 있다
 *       (중심 x > 호스트 중심 x, 중심 y < 호스트 중심 y).
 * 계측: 배지는 대부분 기본 display:none 이라 rect 가 0 이다 — 노드에 인라인
 *       display:block 을 잠깐 강제해 재고 되돌린다(조건 클래스는 안 건드린다).
 * 300 회귀: 룬 탭·룬 하위 탭에는 배지 노드가 없어야 하므로 SITES 에 넣지 않고 부재를 단언한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e8, dia: 50000, best: 17, totalKills: 5000, summons: 300, upgrades: 500 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* 화면을 차례로 열어 배지 노드를 DOM 에 만든다 — 잰 다음 바로 닫는다 */
  const measure = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const out = [];
    /* (호스트셀렉터 는 closest 로 찾는다) */
    /* mk: 조건부 렌더 노드(강화 가능일 때만 등)는 호스트에 임시 노드를 만들어 CSS 위치만 잰다 —
       299 의 본질은 «그 클래스의 CSS 위치 규약» 이다. 만든 노드는 잰 뒤 바로 지운다. */
    const sweep = (label, dotSel, hostSel, mk) => {
      let dots = [...document.querySelectorAll(dotSel)];
      let tmp = null;
      if (!dots.length && mk) {
        const h = document.querySelector(mk.host);
        if (h) {
          tmp = document.createElement(mk.tag || 's');
          tmp.className = mk.cls;
          h.appendChild(tmp);
          dots = [tmp];
        }
      }
      if (!dots.length) { out.push({ label, missing: true }); return; }
      let bad = 0, n = 0, worst = '';
      dots.forEach(d => {
        const h = hostSel ? d.closest(hostSel) : d.parentElement;
        if (!h) return;
        const prev = d.style.display, prevA = d.style.animation;
        d.style.display = 'block';
        d.style.animation = 'none';       /* jzDotIn 이 scale(0)에서 시작해 rect 가 0 이 된다(104 함정) */
        const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
        d.style.display = prev; d.style.animation = prevA;
        if (!hr.width || !dr.width) return;
        n++;
        const cx = dr.left + dr.width / 2, cy = dr.top + dr.height / 2;
        const hx = hr.left + hr.width / 2, hy = hr.top + hr.height / 2;
        if (!(cx > hx && cy < hy)) { bad++; worst = 'cx ' + Math.round(cx - hr.left) + '/' + Math.round(hr.width) + ' cy ' + Math.round(cy - hr.top) + '/' + Math.round(hr.height); }
      });
      if (tmp) tmp.remove();
      out.push({ label, n, bad, worst });
    };

    /* ── 메인 HUD ── */
    sweep('▦ 메뉴 버튼 #menub .bdg', '#menub .bdg', '#menub');
    sweep('좌측 사이드 .ibtn .bdg', '.ibtn .bdg', '.ibtn');
    sweep('하단 탭바 .tab .bdg', '#tabbar .tab .bdg', '.tab');

    /* ── ▦ 메뉴 ── */
    openMenu(); await wait(150);
    sweep('▦ 메뉴 칸 .mn-b>.bdg', '#mnw .mn-b>.bdg', '.mn-b');
    closeMenu();

    /* ── 03 던전 ── */
    openDungeon(); await wait(350);
    sweep('03 카드 .dnc .dot', '#dunw .dnc .dot', '.dnc', { host: '#dunw .dns-list .dnc', cls: 'dot' });
    sweep('03 서브탭 .stab>.bdg', '#dunw .stab>.bdg', '.stab');
    if (typeof closeDungeon === 'function') closeDungeon(); else document.getElementById('dunw').classList.remove('on');

    /* ── 21 도감 ── */
    openColl21(); await wait(200);
    sweep('21 도감 탭 .cltab>s.dot', '.cltab>s.dot', '.cltab');
    closeColl21();

    /* ── 05 무기 시트 ── */
    openWeapon(); await wait(200);
    sweep('05 카드 .wgc>.updot', '#wpnw .wgc>.updot', '.wgc', { host: '#wpnw .wgc', cls: 'updot' });
    closeWeapon();

    /* ── 영웅 패널: 06 장비 · 07 스킬 ── */
    goTab('hero', true); heroSubGo('eq'); await wait(300);
    sweep('06 슬롯 .eqsl>.updot', '.eqsl>.updot', '.eqsl', { host: '.eqsl', cls: 'updot' });
    heroSubGo('sk'); await wait(300);
    sweep('07 카드 .sk-card>.updot', '#bSk .sk-card>.updot', '.sk-card', { host: '#bSk .sk-card', cls: 'updot' });
    sweep('07 버튼 .sk-btn>.updot', '.sk-btn>.updot', '.sk-btn', { host: '.sk-btn', cls: 'updot' });

    /* ── 23 훈련 ── */
    openTrain(); await wait(200);
    sweep('23 카드 .tr-card>.dot', '.tr-card>.dot', '.tr-card');
    /* 300 회귀 — 룬 탭·하위 탭 배지 부재 */
    setTrSub('rune'); await wait(100);
    out.push({ label: '300 룬 배지 부재', n: 1,
      bad: (document.querySelectorAll('#trSubs [data-trsub="rune"] .bdg').length
          + document.querySelectorAll('#rnSubs .bdg').length) ? 1 : 0, worst: '' });
    setTrSub('train'); closeTrain();

    /* ── 10 상점 ── */
    openShopPage(); await wait(250);
    sweep('10 카드 .shp-card>.updot', '.shp-card>.updot', '.shp-card');
    sweep('10 탭 #shopCats .stab>.bdg', '#shopCats .stab>.bdg', '.stab');
    closeShopPage();

    /* ── 70 출석 (318 신설) ──
       «오늘 카드» 는 미출석일 때만 찍히므로 상태를 잠깐 만들었다가 되돌린다. */
    const attSnap = JSON.stringify(S.att);
    S.att = { n: 3, date: '' }; openAttend(); await wait(250);
    sweep('70 출석 «오늘 카드» .at-c>s.updot', '#mbox [data-att]>s.updot', '.at-c,.at-c7');
    closeModal(); S.att = JSON.parse(attSnap); uiDirty = true; await wait(100);

    /* ── 승급전 (323 신설) ──
       배지는 «권장 충족» 일 때만 찍히므로 여기서는 `mk` 로 임시 노드를 만들어 CSS 위치만 잰다
       (조건별 점등·소등은 `tools/verify320.js` 가 본다). */
    openPromo(); await wait(250);
    sweep('승급전 [승급전 시작] #pgo>.updot', '#pgo>.updot', '.ifbtn.pbtn', { host: '#pgo', cls: 'updot' });
    closeModal(); await wait(120);

    /* ── 내 정보 [승급전 도전] (323 신설) ──
       이 패널은 탭 매핑이 가리키지 않는 자리라 저절로 안 열린다 — verify267 [D] 와 같이 펴 준다. */
    renderSt();
    document.getElementById('panel').style.display = 'flex';
    document.getElementById('bSt').classList.add('on');
    await wait(150);
    sweep('내 정보 [승급전 도전] #promoBtn>.updot', '#promoBtn>.updot', '.ifbtn.pbtn', { host: '#promoBtn', cls: 'updot' });
    document.getElementById('bSt').classList.remove('on');
    document.getElementById('panel').style.display = '';
    await wait(120);

    /* ── 29 룰렛 (321 신설) ──
       [룰렛 돌리기] 버튼 배지는 «돌릴 수 있을 때만» 켜지므로 상태를 잠깐 만들었다가 되돌린다.
       노드 자체는 조건과 무관하게 렌더되므로 mk 없이 그대로 잰다. */
    const spSnap = S.daily.spins;
    S.daily.spins = 1; openRoulette(); await wait(250);
    sweep('29 룰렛 [룰렛 돌리기] #rouBtn>s.updot', '#rouBtn>s.updot', '#rouBtn');
    closeModal(); S.daily.spins = spSnap; uiDirty = true; await wait(100);

    /* ── 35 패스 ── */
    openPass('stage'); await wait(250);
    sweep('35 탭 #psBar .pt>.bdg', '#psBar .pt>.bdg', '.pt');
    sweep('35 보상 칸 .ps-bx>s.updot', '#psTk .ps-bx>s.updot', '.ps-bx');
    closePass();

    return out;
  });

  measure.forEach(m => {
    if (m.missing) { ok(false, m.label + ' — 노드를 찾았다', '없음'); return; }
    ok(m.n > 0 && m.bad === 0, m.label + ' — ' + m.n + '개 전부 중심이 우상단 사분면',
       m.n === 0 ? '측정 0개(호스트가 안 보임)' : (m.bad ? m.bad + '개 위반 (' + m.worst + ')' : ''));
  });

  ok(errs.length === 0, '콘솔·런타임 에러 0', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY299 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
