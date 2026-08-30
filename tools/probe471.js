#!/usr/bin/env node
/* 재현 — 작업 471 「레드닷 위치 전면 통일」 (저장소 주인 보고 2026-08-30, 스크린샷 3장)
 *
 *   node tools/probe471.js            전수 실측표
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
 * 진입·상태 강제는 `tools/verify299.js` 의 목록을 그대로 쓴다(같은 자리를 재야 대조가 된다 —
 * 385 «자매 자 드리프트» 방지). 조건부 노드는 **실물이 찍히도록 상태를 만들고** 되돌린다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const JSONOUT = process.argv.includes('--json');

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

  const rows = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const out = [];

    /* 닷 바깥 링 반지름 — `.updot`/`.bdg` 는 27px 코어 + `0 0 0 7.5px #000` 이라 21 이다.
       («찍힌 픽셀» 이 아니라 «그려질 상자» 로 잰다 — 잘림 판정에는 이쪽이 맞다.) */
    const RING = 7.5;

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

    /* mHost: «재는 호스트» 를 따로 줄 때(노드의 부모와 시각적 호스트가 다른 자리 — 328). */
    const sweep = (label, dotSel, hostSel, mk, mHost) => {
      let dots = [...document.querySelectorAll(dotSel)];
      let tmp = null;
      if (!dots.length && mk) {
        const h = document.querySelector(mk.host);
        if (h) { tmp = document.createElement(mk.tag || 's'); tmp.className = mk.cls; h.appendChild(tmp); dots = [tmp]; }
      }
      if (!dots.length) { out.push({ label, missing: true }); return; }
      const seen = [];
      dots.forEach(d => {
        let h = hostSel ? d.closest(hostSel) : d.parentElement;
        if (mHost && h) h = h.querySelector(mHost) || h;
        if (!h) return;
        const prev = d.style.display, prevA = d.style.animation;
        d.style.display = 'block'; d.style.animation = 'none';
        const dr = d.getBoundingClientRect(), hr = h.getBoundingClientRect();
        const cs = getComputedStyle(d), hs = getComputedStyle(h);
        const clip = clipOf(d);
        d.style.display = prev; d.style.animation = prevA;
        if (!hr.width || !dr.width) return;
        const cx = dr.left + dr.width / 2, cy = dr.top + dr.height / 2;
        const R = dr.width / 2 + RING;
        /* ⚠ 스크롤 그릇 밖으로 밀려난 행(«지금 안 보이는 카드»)은 «잘림» 이 아니다 —
           그 자리의 결함은 스크롤하면 사라진다. 호스트가 클립 띠 안에 있을 때만 센다. */
        const inBand = hr.top >= clip.r.t - 1 && hr.bottom <= clip.r.b + 1;
        const cut = !inBand ? [0, 0, 0, 0] : [
          Math.max(0, clip.r.t - (cy - R)),      /* 위 */
          Math.max(0, (cx + R) - clip.r.rt),     /* 우 */
          Math.max(0, (cy + R) - clip.r.b),      /* 아래 */
          Math.max(0, clip.r.l - (cx - R)),      /* 좌 */
        ].map(v => Math.round(v * 10) / 10);
        seen.push({
          dxR: Math.round((hr.right - cx) * 10) / 10,
          dyT: Math.round((cy - hr.top) * 10) / 10,
          bwR: Math.round(parseFloat(hs.borderRightWidth) * 10) / 10,
          bwT: Math.round(parseFloat(hs.borderTopWidth) * 10) / 10,
          w: Math.round(dr.width * 10) / 10,
          css: cs.right + '/' + cs.top,
          host: h.className || h.id,
          hw: Math.round(hr.width), hh: Math.round(hr.height),
          cut, clipper: clip.host ? (clip.host.id || clip.host.className).slice(0, 28) : '',
        });
      });
      if (tmp) tmp.remove();
      if (!seen.length) { out.push({ label, missing: true, why: '상자 0' }); return; }
      /* 같은 자리는 첫 개만 대표로 싣되, 편차가 있으면 최댓값도 싣는다 */
      const rep = seen[0];
      const spread = Math.round(Math.max(...seen.map(s => Math.abs(s.dxR - rep.dxR))) * 10) / 10;
      const cutMax = [0, 1, 2, 3].map(i => Math.max(...seen.map(s => s.cut[i])));
      out.push({ label, n: seen.length, ...rep, spread, cutMax });
    };

    /* ── 메인 HUD ── */
    sweep('HUD ▦ 메뉴 #menub .bdg', '#menub .bdg', '#menub');
    sweep('HUD 사이드 .ibtn .bdg', '.ibtn .bdg', '.ibtn');
    sweep('HUD 탭바 .tab .bdg', '#tabbar .tab .bdg', '.tab');

    openMenu(); await wait(150);
    sweep('▦ 메뉴 칸 .mn-b>.bdg', '#mnw .mn-b>.bdg', '.mn-b');
    closeMenu(); await wait(120);

    openDungeon(); await wait(350);
    sweep('03 카드 .dnc .dot', '#dunw .dnc .dot', '.dnc', { host: '#dunw .dns-list .dnc', cls: 'dot' });
    sweep('03 서브탭 .stab>.bdg', '#dunw .stab>.bdg', '.stab');
    if (typeof closeDungeon === 'function') closeDungeon(); else document.getElementById('dunw').classList.remove('on');
    await wait(150);

    openColl21(); await wait(200);
    sweep('21 도감 탭 .cltab>s.dot', '.cltab>s.dot', '.cltab');
    closeColl21(); await wait(120);

    openWeapon(); await wait(200);
    sweep('05 카드 .wgc>.updot', '#wpnw .wgc>.updot', '.wgc', { host: '#wpnw .wgc', cls: 'updot' });
    sweep('05 [일괄 강화] .wm-btn>.updot', '.wm-btn>.updot', '.wm-btn', { host: '#wpnw .wm-btn', cls: 'updot' });
    closeWeapon(); await wait(120);

    goTab('hero', true); heroSubGo('eq'); await wait(300);
    sweep('06 슬롯 .eqsl>.updot', '.eqsl>.updot', '.eqsl', { host: '.eqsl', cls: 'updot' });
    heroSubGo('sk'); await wait(300);
    sweep('07 카드 .sk-card>.updot', '#bSk .sk-card>.updot', '.sk-card', { host: '#bSk .sk-card', cls: 'updot' });
    sweep('07 [일괄 강화] .sk-btn>.updot', '.sk-btn>.updot', '.sk-btn', { host: '.sk-btn', cls: 'updot' });
    sweep('07 시트 서브탭 .stab>.bdg', '#bSk .stab>.bdg,#eqTabs .stab>.bdg', '.stab');

    openTrain(); await wait(200);
    sweep('23 카드 .tr-card>.dot', '.tr-card>.dot', '.tr-card');
    closeTrain(); await wait(120);

    openShopPage(); await wait(250);
    sweep('10 «10회 소환» 버튼 .cbtn.b1 (328 — 노드는 카드 자식)', '.shp-card>.updot', '.shp-card', null, '.cbtn.b1');
    sweep('10 탭 #shopCats .stab>.bdg', '#shopCats .stab>.bdg', '.stab');
    S.daily.adBuy = {};
    openShopPage(null, 'coin'); await wait(300);
    sweep('13 광고 [받기] 버튼 .cn-cd .bt>.updot (479)', '#shopList .cn-cd .bt>.updot', '.cn-cd>.bt');
    openShopPage(null, 'summon'); await wait(150);
    closeShopPage(); await wait(120);

    S.relic = 1e6; openRelw(); await wait(250);
    sweep('89 유물 수반 #rwBasin>.updot', '#rwBasin>.updot', '#rwBasin');
    closeRelw(); await wait(120);

    const attSnap = JSON.stringify(S.att);
    S.att = { n: 3, date: '' }; openAttend(); await wait(250);
    sweep('70 출석 «오늘 카드» .at-c>.updot', '#mbox [data-att]>s.updot', '.at-c,.at-c7');
    closeModal(); S.att = JSON.parse(attSnap); uiDirty = true; await wait(150);

    const qSnap = JSON.stringify({ q: S.quest, k: S.totalKills, b: S.best, sm: S.summons, up: S.upgrades });
    QUESTS.forEach(q => { S.quest[q.id].base = 0; });
    S.totalKills = 1e9; S.best = 9999; S.summons = 1e9; S.upgrades = 1e9;
    openQuest('rep'); await wait(250);
    sweep('22 행 [보상 받기] .qs-b>.updot', '.qs-b>.updot', '.qs-b');
    sweep('22 [모두 받기] #qAll>.updot ★기준', '#qAll>.updot', '#qAll');
    closeModal();
    { const s = JSON.parse(qSnap); S.quest = s.q; S.totalKills = s.k; S.best = s.b; S.summons = s.sm; S.upgrades = s.up; }
    uiDirty = true; await wait(150);

    openPromo(); await wait(250);
    sweep('승급전 [승급전 시작] #pgo>.updot', '#pgo>.updot', '.ifbtn.pbtn', { host: '#pgo', cls: 'updot' });
    closeModal(); await wait(150);

    renderSt();
    document.getElementById('panel').style.display = 'flex';
    document.getElementById('bSt').classList.add('on');
    await wait(150);
    sweep('내 정보 [승급전 도전] #promoBtn>.updot', '#promoBtn>.updot', '.ifbtn.pbtn', { host: '#promoBtn', cls: 'updot' });
    document.getElementById('bSt').classList.remove('on');
    document.getElementById('panel').style.display = '';
    await wait(150);

    const spSnap = S.daily.spins;
    S.daily.spins = 1; openRoulette(); await wait(250);
    sweep('29 룰렛 [룰렛 돌리기] #rouBtn>.updot', '#rouBtn>s.updot', '#rouBtn');
    closeModal(); S.daily.spins = spSnap; uiDirty = true; await wait(150);

    const blSnap = JSON.stringify(S.bless.exp);
    S.bless.exp = { atk: 0, hp: 0, rate: 0 };
    openBless(); await wait(250);
    sweep('34 축복 «받기» 알약 .bls-c .tm>.updot', '.bls-c .tm>.updot', '.tm');
    closeBless(); S.bless.exp = JSON.parse(blSnap); uiDirty = true; await wait(150);

    openPass('stage'); await wait(250);
    sweep('35 패스 탭 #psBar .pt>.bdg', '#psBar .pt>.bdg', '.pt');
    sweep('35 보상 칸 .ps-bx>.updot', '#psTk .ps-bx>s.updot', '.ps-bx');
    closePass();

    return out;
  });

  if (JSONOUT) { console.log(JSON.stringify(rows, null, 1)); }
  else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log('PROBE471 — 레드닷 자리 전수 실측 (1080×2280)\n');
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
    if (errs.length) console.log('콘솔 에러: ' + errs.slice(0, 3).join(' | '));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
