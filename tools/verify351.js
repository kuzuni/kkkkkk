#!/usr/bin/env node
/* 351 게이트 — 9:13.3(1080×1600) 가독성 루프 1회차가 고친 두 자리.
 *
 * 실행: node tools/verify351.js
 *
 * 잠그는 것 (전부 «짧은 프레임에서만 갈리고 9:19 는 Δ0» 이 조건이다):
 *   §1 34 축복 — 블록(1842px)이 1600 에 242px 넘쳐 **닫기 ✕ 가 프레임 밖 112px** 이던 것.
 *   §2 08 영웅 장비 `.eqp` — 가드가 **HUD 상자 104** 로 잡혀 1600 에서 시트 상변이 104 에 붙던 것.
 *   §4 08 영웅 스킬·코스튬·펫 시트 `#panel` — 같은 결함이 **가드가 아예 없는 채**로 남아 있던 것.
 *   §5 69 우편함 ✕ — 1600 에서 **하단 탭바 안으로 51px** 들어가 던전 칸을 가리던 것.
 *   §9 390 공용 모달 «띠» — `#modal` 의 126/150 이 실측된 값이 아니라, 1600 에서 22 퀘스트 상자가
 *      HUD 잉크 끝(142)을 16px · 탭바 상변(1420)을 30px 물고 21 도감 리본이 **116** 에 서던 것.
 *      ⚠ 여기는 **상자가 아니라 «잉크»** 로 잰다 — 상자 밖으로 나오는 부품이 실재한다
 *        (`.ml69` ✕ 아래 57 · `#collw` 리본 위 10 · 깃발 서브탭 아래 149). LESSONS 390-①.
 *
 * ⚑ 4회차 정정 — «잉크 끝» 은 129 가 아니라 **142** 다.
 *   2회차는 꼬리판의 **글자줄** `.pcp`(92..129)를 잉크 끝으로 봤지만, 사람이 보는 판때기는
 *   `.plate`(135) 와 그 검정 테두리 `.pedge`(**142**)까지다. 129 로는 `elementFromPoint(202,138)`
 *   이 1600 에서 `.eqp-hd` 를 돌려준다(2280 은 `.dim`) = 13px 이 여전히 덮여 있었다.
 *   그래서 이 게이트는 이제 **142 를 축으로** 묻는다(비평가 BS·BT·BU 3인이 독립으로 같은 자리를 1순위로 짚었다).
 *
 * §R 되돌림 시험 — 처방을 뺀 사본에서 **같은 항이 빨개지는지** 를 본다.
 *   이게 없으면 «이미 참인 것을 굳힌 게이트»(338 교훈)와 구별이 안 된다.
 *
 * ⚠ 9:16(1920)은 `.shortf` 임계(1842) 위라 규칙이 아예 안 붙는다 — §3 가 그것을 단언한다.
 *   여기가 빨개지면 임계를 누가 내린 것이고, 그러면 9:16 기기의 배치가 조용히 바뀐다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log(`  ok  ${m}${d ? ' — ' + d : ''}`); };
const no = (m, d) => { fail++; console.log(`  NG  ${m}${d ? ' — ' + d : ''}`); };
const eq = (m, got, want, tol = 0) => (Math.abs(got - want) <= tol ? ok(m, `${got}`) : no(m, `${got} (기대 ${want}±${tol})`));

/* §7·§R-i 전용 사본 — 시트 위 딤을 **413 이전 값**(`pointer-events:none`)으로 되돌린다.
   ⚑ **413(2026-08-29)이 이 상수의 방향을 뒤집었다.** 406 당시 제품은 `none` 이었고 이 사본이
   `auto` 를 주입해 «통로는 그 한 속성» 임을 증명하는 자였다. 413 이 그 진단을 받아 제품을
   `auto` 로 고쳤으므로, 이제 같은 일을 하는 사본은 **반대 방향**이다 — `none` 으로 되돌리면
   2280 레일 3칸 + 두 프레임의 HUD 알약 2칸이 다시 누출돼야 한다.
   방향만 뒤집고 «무엇을 증명하는가» 는 그대로다(338 교훈 — 뿌리를 안 짚은 게이트는 헛초록이 된다). */
const DIMPE = `#panel:has(:is(#bSk,#bPet,#bCos).on)::before{pointer-events:none !important}`;

/* 처방을 걷어낸 사본 — §R 에서만 주입한다 */
const REVERT = `
  #blsw{padding-bottom:146px !important}
  #app.shortf .bls-x{position:relative !important;top:16px !important;right:auto !important;margin:5px 0 auto !important}
  .eqp{max-height:calc(100% - 104px) !important}
  #panel{max-height:calc(100% - 284px) !important}
  #app.shortf #modal.ml69{padding:126px 91px !important}
  #app.shortf #modal.ml69 .mbox{max-height:min(1303px,calc(100% - 120px)) !important}
  #svw .sv-hint{bottom:var(--hnb,195px) !important}
  .spc-list{height:760px !important}
  .spc-tabs{top:1242px !important;bottom:auto !important}
  #app.shortf #modal{padding-top:126px !important;padding-bottom:150px !important}
  #app.shortf #modal.sk8{padding-top:132px !important}
  #app.shortf #modal.at70{padding-top:159px !important;padding-bottom:150px !important}
  #app.shortf #collw{padding:168px 0 276px !important}
`;

async function shot(browser, h, opener, revert) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  if (revert) await page.addStyleTag({ content: revert === 'dimpe' ? DIMPE : REVERT });
  if (opener === 'bless') await page.click('.side .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
  else if (opener === 'hero') await page.click('.tab[data-t="hero"]', { force: true }).catch(() => {});
  else if (opener === 'sheet') {
    /* 08 영웅 → 스킬 시트. ⚠ 진입을 «화면» 으로 확인한다 — 조용히 실패한 클릭은 다른 화면을
       재고 초록을 준다(LESSONS 356-⑬). `#bSk.on` 이 그 확인이다. */
    await page.click('.tab[data-t="hero"]', { force: true }).catch(() => {});
    await page.waitForTimeout(420);
    await page.evaluate(() => { const e = document.querySelector('#eqTabs [data-eqtab="sk"]'); if (e) e.click(); }).catch(() => {});
  } else if (opener === 'mail') {
    await page.evaluate(() => document.querySelector('#menub').click()).catch(() => {});
    await page.waitForTimeout(340);
    await page.evaluate(() => { const e = document.querySelector('#mnw [data-mn="mail"]'); if (e) e.click(); }).catch(() => {});
  } else if (opener === 'spec') {
    /* 20 스펙 정보 = 19 프로필 → 하단 토글. ⚠ 진입 확인은 `#specw.on` 이다(LESSONS 356-⑬). */
    await page.click('#profBtn', { force: true }).catch(() => {});
    await page.waitForTimeout(420);
    await page.evaluate(() => { const e = document.querySelector('.pf-tgl>.lb'); if (e) e.click(); }).catch(() => {});
  } else if (opener === 'saver') {
    /* 56 절전은 오프너가 함수 하나다(다른 후보와 같이 열면 `#app.sv` 가 서로를 지운다 — smoke 472 주석). */
    await page.evaluate(() => { if (typeof openSaver === 'function') openSaver(); }).catch(() => {});
  } else if (opener === 'quest') {
    /* §8(390) — 22 퀘스트. 공용 `#modal` 중 **상한에 걸린** 상자라 띠를 그대로 드러낸다. */
    await page.click('.side .ibtn[data-pop="quest"]', { force: true }).catch(() => {});
  } else if (opener === 'coll') {
    /* §8(390) — 21 도감(`#collw`). 공용 `#modal` 을 한 번도 안 지나는 **자기 오버레이**다. */
    await page.click('.side .ibtn[data-pop="coll"]', { force: true }).catch(() => {});
  } else if (opener === 'plain') {
    /* §8(390) 음성항 — 상한에 **안 걸린** 작은 상자. 제품 자신의 공용 다이얼로그 경로
       (`popup()` — 약관·고객지원·랭커 상세·승급 성공·notify 폴백이 쓴다). */
    await page.evaluate(() => { if (typeof popup === 'function') popup('안내', '<p>한 줄</p>'); }).catch(() => {});
  }
  await page.waitForTimeout(700);
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
  const m = await page.evaluate(() => {
    const app = document.getElementById('app'), A = app.getBoundingClientRect();
    const box = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.top), h: Math.round(r.height) }; };
    const w = document.getElementById('blsw');
    /* HUD 꼬리판(🔥 연속출석) 중심에서 실제로 포인터가 닿는 것 */
    let pcp = null, hit = null;
    const p = document.querySelector('#top .pcp');
    if (p) { const r = p.getBoundingClientRect();
      pcp = { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.top) };
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      hit = el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.')) : null;
      /* ⚠ 여기서 `#eqw` 로 물으면 안 된다 — `#eqw>.dim` 은 `inset:0` 인 딤이라 **두 해상도 모두**
         꼬리판 위를 덮고, 그건 모달의 정의지 결함이 아니다(1회차에 이 자로 [2-d][2-e] 가 같이
         빨개져 자를 고쳤다). 묻는 것은 **패널 `.eqp` 가 덮었는가** 하나다. */
      var inEq = !!(el && el.closest && el.closest('.eqp'));
    }
    /* 4회차 — «잉크 끝» 자를 판때기 전체로 바꾼다. `.pedge`(검정 테두리)가 가장 아래다.
       그 바로 위 한 점(y = 하변 − 4)에서 포인터가 무엇에 닿는지가 «덮였는가» 의 답이다. */
    const pe = document.querySelector('#top .pedge');
    let pedge = null, deepHit = null, deepInSheet = false;
    if (pe) {
      const r = pe.getBoundingClientRect();
      pedge = { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.top) };
      const py = r.bottom - 4;
      const el = document.elementFromPoint(202, py);
      deepHit = el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.')) : null;
      /* ⚠ 413(2026-08-29) — `closest('#panel')` 만으로는 «시트가 덮었나» 를 못 묻는다.
         `#panel` 의 딤은 **자기 ::before** 라 `elementFromPoint` 가 `#panel` 자신을 돌려주고,
         413 이 그 딤을 `pointer-events:auto` 로 돌린 뒤로는 꼬리판 위 어느 점이든 `#panel` 이 나온다.
         이것은 열두 줄 위 `#eqw>.dim` 주석이 이미 적어 둔 함정과 **같은 것**이다 — «딤이 덮는 것은
         모달의 정의지 결함이 아니다». 묻는 것은 언제나 **시트 상자가 내려왔는가** 하나다.
         ⇒ `#panel` 에 닿았을 때는 그 점이 **시트 상자 안**일 때만 «덮음» 으로 센다
            (딤은 `bottom:calc(100% + 7px)` 라 상자보다 **위**에만 있다).
         무르게 푼 것이 아님은 §R [R-d] 가 못박는다 — 되돌린 사본에서 시트가 104 로 내려오면
         그 점(y 138)이 상자 «안» 이라 이 항은 그대로 빨개진다. */
      const pnl = document.getElementById('panel');
      const pr = pnl ? pnl.getBoundingClientRect() : null;
      const inPanelBox = !!(el && el.closest && el.closest('#panel') && pr && py >= pr.top - 0.5);
      deepInSheet = !!(el && el.closest && (el.closest('.eqp') || inPanelBox));
    }
    const bd = document.querySelector('.ml69 .mbody');
    const tabs = document.getElementById('tabbar');
    /* 오버레이의 «지금 실제로 그려지는» 세로 범위 — 자손 union 에 클리핑을 접어 넣는다. */
    function ink(hostSel) {
      const host = document.querySelector(hostSel); if (!host) return null;
      let y1 = Infinity, y2 = -Infinity;
      host.querySelectorAll('*').forEach((n) => {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
        const r = n.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        let a = r.top, b = r.bottom;
        for (let p = n.parentElement; p && p !== document.documentElement; p = p.parentElement) {
          const pcs = getComputedStyle(p);
          if (pcs.overflowY === 'visible') continue;
          const pr = p.getBoundingClientRect();
          a = Math.max(a, pr.top); b = Math.min(b, pr.bottom);
        }
        if (b - a < 2) return;
        y1 = Math.min(y1, a); y2 = Math.max(y2, b);
      });
      return isFinite(y1) ? { top: Math.round(y1 - A.top), bot: Math.round(y2 - A.top) } : null;
    }
    return {
      frameH: Math.round(A.height),
      shortf: app.classList.contains('shortf'),
      bls: box('#blsw .bls'), promo: box('.bls-promo'), blsX: box('#blsX'),
      blswFits: w ? (w.scrollHeight <= w.clientHeight + 1) : null,
      blswOver: w ? (w.scrollHeight - w.clientHeight) : null,
      eqp: box('#eqw .eqp'),
      panel: box('#panel'), sheetOn: !!document.querySelector('#bSk.on'),
      mbox: box('#modal.ml69 .mbox'), mailX: box('#mailX'),
      /* §8(390) — 공용 모달 «띠». `.pedge` 하변(위)·탭바 상변(아래)이 금지구역이고,
         그 사이에 **정확히** 서는지를 본다. `qbody` 는 반대급부(본문을 눌러 자르는 것).
         ⚠ 재는 것은 상자가 아니라 **잉크**다 — `.ml69` 의 ✕(57px) · 21 도감의 리본(10px)과
         깃발 서브탭(149px)이 상자 **밖으로** 나온다. 상자만 보면 «띠 안» 이라고 초록을 주면서
         그 부품이 탭바 밑에 묻히는 것을 못 본다(1회차에 실제로 그랬다 — LESSONS 390-②).
         ⚠ 클리핑은 접는다(LESSONS 351-⑧) — 도감 목록은 그릇 밖으로 3601px 뻗지만 안 그려진다. */
      qbox: box('#modal.on .mbox'), cl: box('#collw.on .cl'),
      qink: ink('#modal.on'), clink: ink('#collw.on'),
      collTabs: box('#collTabs'), clRib: box('#collw.on .cl-rib'),
      qbody: (() => { const b = document.querySelector('#modal.on .mbody');
        return b ? { over: b.scrollHeight - b.clientHeight } : null; })(),
      clBody: (() => { const b = document.querySelector('#collw.on .cl-body');
        return b ? { h: Math.round(b.getBoundingClientRect().height) } : null; })(),
      mailFits: bd ? (bd.scrollHeight <= bd.clientHeight + 1) : null,
      mailOver: bd ? (bd.scrollHeight - bd.clientHeight) : null,
      tabsTop: tabs ? Math.round(tabs.getBoundingClientRect().top - A.top) : null,
      pcp, hit, pcpCoveredByEq: !!inEq,
      pedge, deepHit, deepInSheet,
      /* 56 절전 — 하단 앵커(안내문) ↔ 상단 앵커(통계 패널) 충돌을 재는 세 상자 */
      svP: box('#svw .sv-p'), svHint: box('#svw .sv-hint'), svR3: box('#svw .sv-r:nth-of-type(3)'),
      /* §8(7회차) — 20 스펙 정보. `.spc` 가 `max-height:100%` 로 눌리는데 `.spc-tabs` 만
         위에 못 박혀 있어 패널 밖으로 밀려나던 자리다. */
      specOn: !!document.querySelector('#specw.on'),
      spc: box('.spc'), spcBody: box('.spc-body'), spcList: box('.spc-list'), spcTabs: box('.spc-tabs'),
      /* §7(406) — 배경 고정 조작 요소가 **닿나**. «덮였나» 가 아니다:
         덮임은 딤만으로도 생기지만 조작 상실은 «포인터가 못 간다» 일 때만 생긴다. */
      reach: (() => {
        const hitOf = (el) => {
          const r = el.getBoundingClientRect();
          const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const nm = h ? (h.id ? '#' + h.id : h.tagName.toLowerCase() + '.' + String(h.className).trim().split(/\s+/).slice(0, 2).join('.')) : null;
          return { on: !!(h && (h === el || el.contains(h))), by: nm };
        };
        const o = {};
        for (const id of ['attend', 'roul', 'quest', 'promo', 'coll', 'bless']) {
          const el = document.querySelector('.side .ibtn[data-pop="' + id + '"]');
          if (el) o[id] = hitOf(el);
        }
        const mb = document.getElementById('menub');
        if (mb) o.menub = hitOf(mb);
        /* 413 — HUD 재화 알약. **등재문이 못 본 자리**라 자에도 없었다:
           406 은 레일·▦ 만 세서 «2280 100% → 1600 0%» 로 읽었지만, 화면 맨 위 알약은
           **두 프레임 다** 딤 구역에 있어 딤 말고는 막을 것이 없다 = 두 프레임 다 누출이었다
           (`probe413` [N2b]). 자에 없는 자리는 고쳐도 초록이 안 움직인다. */
        for (const c of ['gold', 'dia']) {
          const el = document.querySelector('.curs [data-cur="' + c + '"]');
          if (el) o['cur_' + c] = hitOf(el);
        }
        /* 나갈 길 — `#panel` 계열은 열린 탭이 탭바에서 ✕ 칸으로 치환된다(마크업 13970) */
        const cl = document.querySelector('#tabbar .tab.close');
        o.escClose = cl ? hitOf(cl) : { on: false, by: '(.tab.close 없음)' };
        return o;
      })(),
    };
  });
  await ctx.close();
  return m;
}

(async () => {
  const br = await launch(chromium);
  try {
    /* ---------------- §1 34 축복 ---------------- */
    console.log('[§1] 34 축복 — 블록이 1600 에 들어오고 ✕ 가 첫 화면 안에');
    const b19 = await shot(br, 2280, 'bless', false);
    const b13 = await shot(br, 1600, 'bless', false);

    /* 9:19 는 Δ0 — 이 세 값은 34 폴리시가 못 박아 둔 자리다(측정표 §13-2: 스트립 하단+21 = ✕ 1792) */
    eq('[1-a] 2280 팝업 .bls 상변', b19.bls.top, 345);
    eq('[1-b] 2280 스트립 상변', b19.promo.top, 1523);
    eq('[1-c] 2280 ✕ 상변', b19.blsX.top, 1793);
    b19.shortf ? no('[1-d] 2280 은 .shortf 가 안 붙는다', '붙었다') : ok('[1-d] 2280 .shortf 없음');

    /* 1600 — 넘침 0, ✕ 가 프레임 안 */
    b13.blswFits ? ok('[1-e] 1600 블록이 프레임에 들어온다', `넘침 ${b13.blswOver}px`)
                 : no('[1-e] 1600 블록이 프레임에 들어온다', `넘침 ${b13.blswOver}px`);
    b13.shortf ? ok('[1-f] 1600 .shortf 적용') : no('[1-f] 1600 .shortf 적용', '안 붙었다');
    (b13.blsX.top >= 0 && b13.blsX.bot <= b13.frameH)
      ? ok('[1-g] 1600 ✕ 가 프레임 안', `${b13.blsX.top}..${b13.blsX.bot} ⊂ 0..${b13.frameH}`)
      : no('[1-g] 1600 ✕ 가 프레임 안', `${b13.blsX.top}..${b13.blsX.bot} / 프레임 ${b13.frameH}`);
    /* ✕ 는 위 가드(126)를 넘어 HUD 로 올라가면 안 된다 */
    (b13.blsX.top >= 126) ? ok('[1-h] 1600 ✕ 가 HUD 가드(126) 아래', `top ${b13.blsX.top}`)
                          : no('[1-h] 1600 ✕ 가 HUD 가드(126) 아래', `top ${b13.blsX.top}`);
    /* 팝업 본체·스트립도 프레임 안 */
    (b13.promo.bot <= b13.frameH) ? ok('[1-i] 1600 스트립 하변이 프레임 안', `${b13.promo.bot}`)
                                  : no('[1-i] 1600 스트립 하변이 프레임 안', `${b13.promo.bot}`);

    /* ---------------- §2 08 영웅 ---------------- */
    console.log('[§2] 08 영웅 — 시트가 HUD 꼬리판 잉크를 안 덮는다');
    const h19 = await shot(br, 2280, 'hero', false);
    const h13 = await shot(br, 1600, 'hero', false);
    eq('[2-a] 2280 .eqp 상변(불변)', h19.eqp.top, 516);
    eq('[2-b] HUD 꼬리판 글자줄 .pcp 하변', h13.pcp.bot, 129);
    /* ⚑ 4회차 정정 — 가드의 축은 글자줄 129 가 아니라 판때기 테두리 `.pedge` 의 142 다. */
    eq('[2-b2] HUD 꼬리판 잉크 끝 .pedge 하변', h13.pedge.bot, 142);
    eq('[2-c] 1600 .eqp 상변 = 잉크 끝 142', h13.eqp.top, 142);
    h13.pcpCoveredByEq ? no('[2-d] 1600 글자줄을 시트가 안 덮는다', `덮었다(${h13.hit})`)
                       : ok('[2-d] 1600 글자줄을 시트가 안 덮는다', `포인터 ${h13.hit}`);
    h19.pcpCoveredByEq ? no('[2-e] 2280 도 안 덮는다', `덮었다(${h19.hit})`)
                       : ok('[2-e] 2280 도 안 덮는다', `포인터 ${h19.hit}`);
    /* 129 가드로는 [2-d] 가 초록인데 이 항이 빨갰다 — 그 13px 이 이 게이트의 새 자리다. */
    h13.deepInSheet ? no('[2-f] 1600 판때기 아래끝(y138)도 시트 밖', `덮었다(${h13.deepHit})`)
                    : ok('[2-f] 1600 판때기 아래끝(y138)도 시트 밖', `포인터 ${h13.deepHit}`);
    h19.deepInSheet ? no('[2-g] 2280 도 같다', `덮었다(${h19.deepHit})`)
                    : ok('[2-g] 2280 도 같다', `포인터 ${h19.deepHit}`);

    /* ---------------- §4 08 스킬·코스튬·펫 시트(#panel) ---------------- */
    console.log('[§4] 08 스킬 시트 — `#panel` 가드도 같은 축(142)으로');
    const s19 = await shot(br, 2280, 'sheet', false);
    const s13 = await shot(br, 1600, 'sheet', false);
    s19.sheetOn ? ok('[4-a] 2280 스킬 시트 진입 확인(#bSk.on)') : no('[4-a] 2280 스킬 시트 진입 확인', '안 열렸다');
    s13.sheetOn ? ok('[4-b] 1600 스킬 시트 진입 확인(#bSk.on)') : no('[4-b] 1600 스킬 시트 진입 확인', '안 열렸다');
    eq('[4-c] 2280 #panel 상변(불변)', s19.panel.top, 616);
    eq('[4-d] 2280 #panel 높이(불변)', s19.panel.h, 1484);
    eq('[4-e] 1600 #panel 상변 = 잉크 끝 142', s13.panel.top, 142);
    s13.deepInSheet ? no('[4-f] 1600 꼬리판을 시트가 안 덮는다', `덮었다(${s13.deepHit})`)
                    : ok('[4-f] 1600 꼬리판을 시트가 안 덮는다', `포인터 ${s13.deepHit}`);
    s19.deepInSheet ? no('[4-g] 2280 도 안 덮는다', `덮었다(${s19.deepHit})`)
                    : ok('[4-g] 2280 도 안 덮는다', `포인터 ${s19.deepHit}`);

    /* ---------------- §5 69 우편함 ✕ ---------------- */
    console.log('[§5] 69 우편함 — ✕ 가 하단 탭바 안으로 안 들어간다');
    const m19 = await shot(br, 2280, 'mail', false);
    const m13 = await shot(br, 1600, 'mail', false);
    /* 9:19 Δ0 — 이 두 값이 움직이면 `.shortf` 밖으로 규칙이 샌 것이다 */
    eq('[5-a] 2280 우편 상자 상변(불변)', m19.mbox.top, 489, 1);
    eq('[5-b] 2280 ✕ 상변(불변)', m19.mailX.top, 1734, 1);
    /* ⚠ 탭바를 못 찾으면 «침범 없음» 이 아니라 **판정 불가**다 — null 을 초록으로 흘리면
       이 절이 통째로 헛초록이 된다(첫 판에 `#tabs` 로 물어 실제로 그랬다). */
    (typeof m13.tabsTop !== 'number')
      ? no('[5-c] 1600 ✕ 가 탭바 위', '탭바를 못 찾았다 — 판정 불가')
      : (m13.mailX.bot <= m13.tabsTop)
        ? ok('[5-c] 1600 ✕ 가 탭바 위', `✕ 하변 ${m13.mailX.bot} ≤ 탭바 상변 ${m13.tabsTop}`)
        : no('[5-c] 1600 ✕ 가 탭바 위', `✕ 하변 ${m13.mailX.bot} > 탭바 상변 ${m13.tabsTop} (침범 ${m13.mailX.bot - m13.tabsTop}px)`);
    (m13.mbox.top >= 142)
      ? ok('[5-d] 1600 상자 상변이 HUD 잉크(142) 아래', `${m13.mbox.top}`)
      : no('[5-d] 1600 상자 상변이 HUD 잉크(142) 아래', `${m13.mbox.top}`);
    /* ⚠ ✕ 를 띄우려고 상자를 눌러 **본문을 자르면** 안 된다 — 이 항이 그 반대급부를 막는다. */
    m13.mailFits ? ok('[5-e] 1600 우편 본문이 안 잘린다', `넘침 ${m13.mailOver}px`)
                 : no('[5-e] 1600 우편 본문이 안 잘린다', `넘침 ${m13.mailOver}px`);
    m19.mailFits ? ok('[5-f] 2280 우편 본문이 안 잘린다', `넘침 ${m19.mailOver}px`)
                 : no('[5-f] 2280 우편 본문이 안 잘린다', `넘침 ${m19.mailOver}px`);

    /* ---------------- §3 9:16(1920) 은 규칙 밖 ---------------- */
    console.log('[§3] 9:16(1920) 은 임계(1842) 위 — 규칙이 안 붙는다');
    const b16 = await shot(br, 1920, 'bless', false);
    b16.shortf ? no('[3-a] 1920 .shortf 없음', '붙었다 — 임계가 내려갔다')
               : ok('[3-a] 1920 .shortf 없음');
    eq('[3-b] 1920 ✕ 가 흐름 그대로(스트립 하변 +21)', b16.blsX.top - b16.promo.bot, 21);

    /* ---------------- §6 56 절전 (6회차 신설) ----------------
       왜 이 절이 생겼나: 6회차 비평가 BY·BZ·CA 3인이 **각자 독립으로** «밀어서 잠금 해제» 가
       통계 패널 안으로 빨려 들어가 «획득한 골드» 와 서로 못 읽게 된다고 적었고, 새 자
       `probe351c` 의 E3(잉크 충돌)가 **겹침 77%** 로 같은 자리를 짚었다 — 눈과 자가 다른
       경로로 같은 답을 냈다(LESSONS 351-⑨). 뿌리는 **앵커가 둘**이라는 것이다:
       `.sv-hint` 만 bottom 기준(LESSONS 30-⑤)이고 `.sv-p` 는 top 기준이라, 프레임이 짧아지면
       둘이 마주 보고 다가온다. 처방은 클램프 한 겹이고, 이 절이 그것을 지킨다. */
    console.log('[§6] 56 절전 — 하단 앵커 안내문이 상단 앵커 패널을 침범하지 않는가');
    const v19 = await shot(br, 2280, 'saver', false);
    const v13 = await shot(br, 1600, 'saver', false);
    /* [6-a] 9:19 는 Δ0 — 레퍼런스가 정한 하단 여백 195 를 처방이 한 픽셀도 안 건드렸다는 증거 */
    eq('[6-a] 2280 안내문 하단 여백 195', v19.frameH - v19.svHint.bot, 195);
    eq('[6-b] 2280 안내문 상변 2033', v19.svHint.top, 2033);
    /* [6-c] 패널은 두 해상도가 같은 자리다(상단 앵커) — 이 항이 빨개지면 아래 판정의 전제가 깨진 것 */
    (v19.svP.top === v13.svP.top && v19.svP.bot === v13.svP.bot)
      ? ok('[전제 6-c] 통계 패널은 두 해상도가 같은 자리', `${v13.svP.top}..${v13.svP.bot}`)
      : no('[전제 6-c] 통계 패널은 두 해상도가 같은 자리', `2280 ${v19.svP.top}..${v19.svP.bot} ↔ 1600 ${v13.svP.top}..${v13.svP.bot}`);
    /* [6-d] 본체 — 1600 에서 안내문이 패널 하변 아래에 있다 */
    (v13.svHint.top >= v13.svP.bot)
      ? ok('[6-d] 1600 안내문이 패널 아래', `안내 ${v13.svHint.top} ≥ 패널 하변 ${v13.svP.bot} (여백 ${v13.svHint.top - v13.svP.bot}px)`)
      : no('[6-d] 1600 안내문이 패널 아래', `안내 ${v13.svHint.top} < 패널 하변 ${v13.svP.bot} (침범 ${v13.svP.bot - v13.svHint.top}px)`);
    /* [6-e] 3행 알약과 세로로 안 겹친다 — 비평가 3인이 실제로 «못 읽는다» 고 적은 그 자리 */
    (v13.svHint.top >= v13.svR3.bot)
      ? ok('[6-e] 1600 안내문 ↔ 3행 알약 겹침 0', `안내 ${v13.svHint.top} ≥ 3행 하변 ${v13.svR3.bot}`)
      : no('[6-e] 1600 안내문 ↔ 3행 알약 겹침 0', `겹침 ${v13.svR3.bot - v13.svHint.top}px`);
    /* [6-f] 그러면서 프레임 밖으로도 안 나간다(클램프가 반대쪽으로 넘치면 안 된다) */
    (v13.svHint.bot <= v13.frameH)
      ? ok('[6-f] 1600 안내문이 프레임 안', `하변 ${v13.svHint.bot} ≤ ${v13.frameH} (여백 ${v13.frameH - v13.svHint.bot}px)`)
      : no('[6-f] 1600 안내문이 프레임 안', `하변 ${v13.svHint.bot} > ${v13.frameH}`);
    /* [6-g] 교차점 1756 에서 두 항이 정확히 만난다 = 클램프가 «끊기지» 않는다.
       이 항이 없으면 «어딘가에서 툭 튀는» 처방과 구별이 안 된다. */
    const v17 = await shot(br, 1756, 'saver', false);
    eq('[6-g] 교차 프레임 1756 에서 하단 여백이 여전히 195', v17.frameH - v17.svHint.bot, 195);
    eq('[6-h] 교차 프레임 1756 에서 패널↔안내 여백 30', v17.svHint.top - v17.svP.bot, 30);

    /* ---------------- §7 406 — «덮임» 이 아니라 «닿음» 이 축이다 ----------------
       406 이 정한 규약을 잠근다. 6회차의 자(E1)는 «불투명 상자가 배경 조작 요소를 덮는 %»
       를 세어 88건을 냈고 비평가 셋이 그 자리에서 갈렸다(CB·CC 1순위 ↔ CD 없음).
       406 이 88건을 `elementFromPoint` 로 전수 재판정하니 **76건은 2280 에서도 이미 안 닿았다**
       (딤이 막는다) — 1600 에서 더 «덮이는» 것은 6회차가 E2 를 버린 그 이유와 같다.
       ⇒ 규약: **오버레이가 소유한 화면에서 배경 레일이 안 눌리는 것은 설계다.**
                감점은 «2280 에서는 닿는데 1600 에서 안 닿는» 자리 뿐이고, 그런 자리는
                `#panel` 계열 세 시트(07 스킬·26 펫·50 코스튬)에만 있다.
       그 셋의 뿌리는 «시트가 자란다» 가 아니라 **딤만 `pointer-events:none` 이라는 것**이다
       (`#panel:has(…)::before`). 2280 에서 레일이 눌리는 것은 딤을 «뚫고» 눌리는 것이었다.
       ⚑⚑ **413(2026-08-29)이 그 진단을 받아 제품을 고쳤다 — 이 절의 방향이 통째로 뒤집힌다.**
       406 은 «여기를 바꾸면 42 조이스틱이 같이 바뀐다» 며 지금 값을 못박아 두고 별도 등재했고,
       413 이 그 «조작 설계 결정» 을 **찍힌 값으로** 닫았다(`tools/probe413.js`):
         · 대조군 — «자기 클릭으로 닫는» 오버레이 5종 전부 그 아래에서 조이스틱이 **이미 죽는다**.
         · 이 세 시트조차 **1600 에서는 이미 죽는다**(시트 본문이 캔버스를 덮는다).
         ⇒ «시트 위 이동» 은 규약이 아니라 `#panel` × 2280 한 자리의 사고였다 ⇒ 딤이 막는다.
       ⇒ 이제 §7 이 못박는 규약은 **«오버레이가 소유한 화면에서 배경은 안 눌린다 — 나갈 길만 남는다»**
         이고, 감점 축(«2280 은 닿는데 1600 은 안 닿는») 은 **양쪽 다 안 닿음**으로 닫혔다. */
    console.log('[§7] 406·413 규약 — 오버레이가 소유한 화면에서 배경은 안 눌린다(나갈 길만 남는다)');
    const RAIL = ['attend', 'roul', 'quest'];
    const HUDC = ['cur_gold', 'cur_dia'];
    const rc19 = s19.reach, rc13 = s13.reach;
    /* [전제 7-a] — 자가 «닿음» 을 실제로 잴 수 있고, 시트가 정말로 열렸는가.
       ⚠ 이 전제가 없으면 아래 «안 닿는다» 항 전부가 **진입 실패로도 초록**이 된다(LESSONS 356-⑬). */
    (s19.panel && s13.panel && s19.reach.escClose.on && s13.reach.escClose.on)
      ? ok('[전제 7-a] 두 해상도 다 시트가 열렸고 자가 닿음을 잴 수 있다(✕ 칸이 닿는다)')
      : no('[전제 7-a] 두 해상도 다 시트가 열렸고 자가 닿음을 잰다', `2280 ✕=${s19.reach.escClose.by} · 1600 ✕=${s13.reach.escClose.by}`);
    /* [7-a2] 413 본체 — 2280 레일 3칸이 이제 **딤에 막힌다**(종전엔 닿았다). */
    RAIL.every((k) => rc19[k] && !rc19[k].on && rc19[k].by === '#panel')
      ? ok('[7-a2] 2280 레일 3칸이 딤(#panel)에 막힌다 — 413 이 닫은 통로', RAIL.map((k) => k + '=' + rc19[k].by).join(' · '))
      : no('[7-a2] 2280 레일 3칸이 딤에 막힌다', RAIL.map((k) => k + '=' + (rc19[k] ? (rc19[k].on ? '여전히 닿음' : rc19[k].by) : '?')).join(' · '));
    /* [7-a3] ⚑ 등재문이 못 본 자리 — HUD 재화 알약은 **두 프레임 다** 새고 있었다(`probe413` [N2b]).
       이 항이 없으면 413 은 «2280 만 고친 수리» 로 남고 1600 의 누출 2칸이 조용히 살아 있게 된다. */
    HUDC.every((k) => rc19[k] && !rc19[k].on && rc13[k] && !rc13[k].on)
      ? ok('[7-a3] HUD 재화 알약 2칸이 두 프레임 다 막힌다 — 등재문의 «2280 만» 을 넓힌 자리',
        HUDC.map((k) => k + '=' + rc19[k].by + '/' + rc13[k].by).join(' · '))
      : no('[7-a3] HUD 재화 알약 2칸이 두 프레임 다 막힌다',
        HUDC.map((k) => k + '=' + (rc19[k] ? (rc19[k].on ? '2280닿음' : rc19[k].by) : '?') + '/' + (rc13[k] ? (rc13[k].on ? '1600닿음' : rc13[k].by) : '?')).join(' · '));
    (rc19.promo && !rc19.promo.on && rc19.coll && !rc19.coll.on)
      ? ok('[7-b] 2280 아래 두 칸(promo·coll)은 시트 본문이 막는다 — 딤 말고 다른 축도 산다',
        `promo=${rc19.promo.by} · coll=${rc19.coll.by}`)
      : no('[7-b] 2280 아래 두 칸은 시트가 막는다', `promo=${rc19.promo && rc19.promo.by} · coll=${rc19.coll && rc19.coll.by}`);
    RAIL.every((k) => rc13[k] && !rc13[k].on)
      ? ok('[7-c] 1600 에서도 그 3칸이 안 닿는다 — 두 해상도가 같아졌다', RAIL.map((k) => k + '=' + rc13[k].by).join(' · '))
      : no('[7-c] 1600 에서도 그 3칸이 안 닿는다', RAIL.map((k) => k + '=' + (rc13[k] ? (rc13[k].on ? '닿음' : rc13[k].by) : '?')).join(' · '));
    /* [7-d] ⚑ 1600 에서 막는 것이 **여전히 시트 본문**임을 남겨 둔다 — 413 은 딤 한 속성만
       바꿨으므로 시트 본문이 캔버스를 덮는다는 1600 의 사실은 그대로여야 한다. 이 항이
       «#panel 이어도 통과» 로 물러지면 «시트가 사라져도 딤이 막으니 초록» 이 된다. */
    RAIL.every((k) => rc13[k] && !rc13[k].on && rc13[k].by && rc13[k].by !== '#panel')
      ? ok('[7-d] 1600 에서 막는 것은 딤이 아니라 여전히 시트 본문이다', RAIL.map((k) => rc13[k].by).join(' · '))
      : no('[7-d] 1600 에서 막는 것은 시트 본문이다', RAIL.map((k) => rc13[k] && rc13[k].by).join(' · '));
    /* 나갈 길 — 규약이 «레일은 조작 대상이 아니다» 로 가는 대가로, 닫는 길은 반드시 있어야 한다. */
    (s19.reach.escClose.on && s13.reach.escClose.on)
      ? ok('[7-e] 나갈 길(탭바 ✕ 칸)이 두 해상도 모두 닿는다')
      : no('[7-e] 나갈 길(탭바 ✕ 칸)이 두 해상도 모두 닿는다', `2280=${s19.reach.escClose.by} · 1600=${s13.reach.escClose.by}`);
    /* 음성항 — 오버레이가 «안 열린» 화면에서는 레일이 두 해상도 다 닿아야 한다.
       이게 없으면 §7 은 «레일은 언제나 안 닿아도 된다» 는 게이트가 된다. */
    const p19 = await shot(br, 2280, 'none', false);
    const p13 = await shot(br, 1600, 'none', false);
    ['attend', 'roul', 'quest', 'promo', 'coll', 'bless'].every((k) => p19.reach[k].on && p13.reach[k].on)
      ? ok('[7-f] 음성항 — 시트가 안 열린 화면에서는 레일 6칸이 두 해상도 다 닿는다')
      : no('[7-f] 음성항 — 시트가 안 열린 화면에서는 레일 6칸이 두 해상도 다 닿는다',
        ['attend', 'roul', 'quest', 'promo', 'coll', 'bless'].map((k) => k + '=' + (p13.reach[k].on ? '1600닿음' : '1600' + p13.reach[k].by)).join(' · '));

    /* ---------------- §8 20 스펙 정보(7회차) ---------------- */
    console.log('[§8] 20 스펙 — 눌린 패널을 리스트가 흡수하고, 탭 줄은 패널 안에 남는다');
    const sp19 = await shot(br, 2280, 'spec', false);
    const sp13 = await shot(br, 1600, 'spec', false);
    /* [전제] — 진입에 실패하면 아래 값이 전부 «없음» 인 채 초록이 될 수 있다(LESSONS 356-⑬). */
    (sp19.specOn && sp13.specOn && sp19.spcTabs && sp13.spcTabs)
      ? ok('[8-전제] 두 해상도 다 20 스펙 화면에 들어갔다')
      : no('[8-전제] 두 해상도 다 20 스펙 화면에 들어갔다', `2280 ${sp19.specOn} · 1600 ${sp13.specOn}`);
    /* 9:19 Δ0 — 이 셋이 폴리시 20 이 못 박아 둔 절대값이다(측정표 20 §7-1·§9) */
    eq('[8-a] 2280 리스트 높이(불변)', sp19.spcList.h, 760);
    eq('[8-b] 2280 탭 줄 상변(불변)', sp19.spcTabs.top, 1692, 1);
    eq('[8-c] 2280 탭 줄 하변(불변)', sp19.spcTabs.bot, 1786, 1);
    /* 1600 — 눌린 만큼을 리스트가 흡수했나.
       705 이관(2026-09-02) — 여기 있던 «패널 = **1240**» 은 20 이 `#specw` 의 flex 중앙정렬과
       `max-height:100%` 로 **혼자** 눌리던 시절의 값이다. 705(주인 지시 «두 팝업 위치 통일»)로
       상자가 19 프로필과 **한 선언**을 읽게 되면서 같은 프레임에서 1296(= 1396 − pfsh 100)이 된다.
       상수를 새 값으로 갈아 끼우면 이 항은 «흡수 구조가 사라져도 초록» 이 되므로(333 처방)
       **묻는 것을 관계로 바꾼다**: 짧은 프레임에서 ⓐ 패널이 실제로 눌리고 ⓑ 그 눌린 만큼을 리스트가 먹는다. */
    (sp13.spc.h < sp19.spc.h && sp13.spcList.h < sp19.spcList.h
      && (sp19.spc.h - sp13.spc.h) >= (sp19.spcList.h - sp13.spcList.h) - 1)
      ? ok('[8-d] 1600 패널이 눌리면 그만큼 리스트가 줄어든다',
        `패널 ${sp19.spc.h}→${sp13.spc.h}(−${sp19.spc.h - sp13.spc.h}) · 리스트 ${sp19.spcList.h}→${sp13.spcList.h}(−${sp19.spcList.h - sp13.spcList.h})`)
      : no('[8-d] 1600 패널이 눌리면 그만큼 리스트가 줄어든다',
        `패널 ${sp19.spc.h}→${sp13.spc.h} · 리스트 ${sp19.spcList.h}→${sp13.spcList.h}`);
    /* ⚑ 본체 — 탭 줄이 패널(크림 본문) 안에 남는가. 이것이 8841 주석이 «삐져나온다» 고 적어 둔 자리다. */
    (sp13.spcTabs.bot <= sp13.spcBody.bot)
      ? ok('[8-e] 1600 탭 줄이 크림 본문 안', `탭 ${sp13.spcTabs.bot} ≤ 본문 ${sp13.spcBody.bot}`)
      : no('[8-e] 1600 탭 줄이 크림 본문 안', `탭 ${sp13.spcTabs.bot} > 본문 ${sp13.spcBody.bot} (밖으로 ${sp13.spcTabs.bot - sp13.spcBody.bot}px)`);
    /* 705 이관(2026-09-02) — 옛 항은 «탭 줄 하변 ≤ 앱 탭바 상변» 이었다. 705 로 20 이 19 프로필과
       **같은 상자**가 되면서 1600 에서 탭 줄이 19 의 하단 토글 줄과 **정확히 같은 자리**(둘 다 상자 로컬 1161)에
       서고, 그 자리는 앱 탭바 띠와 겹친다 — 즉 지금 이 값은 «20 의 결함» 이 아니라 **19 가 통과한 규격**이다
       (19 는 415 폴리시로 이 자리에서 8점을 받았고 아무도 지적한 적이 없다. 팝업은 z 33/34 로 탭바 **위**에
        딤째 얹히므로 탭바가 탭 줄을 가리지도 않는다).
       그래서 «탭바를 문다» 를 «19 와 같은 자리인가» 로 옮긴다 — 그 짝 항은 상자를 둘 다 여는
       `tools/verify705.js` [C4] 가 든다. 여기 남기는 것은 **프레임 밖으로 나가지 않는다**(진짜 손실)이다.
       ⚠ 이 항을 옛 문장으로 되돌리려면 19 의 `.pf` 기하(415 계약 «1700 = 142 + 81 + 1396 + 81»)를
         같이 바꿔야 한다 — 20 만 도로 눌러 놓으면 주인 지시(«위치 통일»)가 깨진다. */
    (typeof sp13.tabsTop === 'number' && sp13.spcTabs.bot <= sp13.tabsTop + 180)
      ? ok('[8-f] 1600 탭 줄이 프레임 안에 남는다(19 와 같은 자리 — 705 [C4] 가 짝)',
        `탭 줄 하변 ${sp13.spcTabs.bot} ≤ 프레임 하변 ${sp13.tabsTop + 180} (탭바 상변 ${sp13.tabsTop})`)
      : no('[8-f] 1600 탭 줄이 프레임 안에 남는다(19 와 같은 자리 — 705 [C4] 가 짝)',
        `탭 줄 하변 ${sp13.spcTabs.bot} · 프레임 하변 ${sp13.tabsTop + 180}`);
    /* 흡수한 대가가 «리스트가 탭 줄을 먹는 것» 이면 안 된다 — 간격은 2280 과 같은 38.5 여야 한다 */
    eq('[8-g] 1600 리스트↔탭 줄 간격 = 2280 과 같다', sp13.spcTabs.top - sp13.spcList.bot,
      sp19.spcTabs.top - sp19.spcList.bot, 1);
    /* ---------------- §9 390 공용 모달 «띠» ---------------- */
    /* 잠그는 것: 짧은 프레임의 띠는 **위 = `.pedge` 하변 · 아래 = 탭바 상변**이고,
       상자는 그 사이에 **정확히** 선다(142 + 180 = 322 는 프레임 높이와 무관한 상수).
       ⚠ 세 축을 같이 묻는다 — ⓐ 2280 Δ0 · ⓑ 1600 침범 0 · ⓒ **반대급부**(띠를 넓혀 상자를
       눌러 본문을 자르는 것). ⓒ 가 없으면 «패딩을 크게 주면 늘 초록» 인 게이트가 된다. */
    console.log('[§9] 390 공용 모달 — 짧은 프레임에서 상자가 «진짜 띠» 안에 정확히 선다');
    const q19 = await shot(br, 2280, 'quest', false);
    const q13 = await shot(br, 1600, 'quest', false);
    const c19 = await shot(br, 2280, 'coll', false);
    const c13 = await shot(br, 1600, 'coll', false);
    const n13 = await shot(br, 1600, 'plain', false);
    /* 9:19 Δ0 — 이 셋이 움직이면 `.shortf` 밖으로 규칙이 샌 것이다(패딩은 가운데 정렬의 입력이다). */
    eq('[9-a] 2280 22 퀘스트 상자 상변(불변)', q19.qbox.top, 380, 1);
    eq('[9-b] 2280 22 퀘스트 상자 하변(불변)', q19.qbox.bot, 1877, 1);
    eq('[9-c] 2280 21 도감 상자 상변(불변)', c19.cl.top, 273, 1);
    eq('[9-d] 2280 21 도감 상자 하변(불변)', c19.cl.bot, 1816, 1);
    /* ⚠ 기준선을 못 찾으면 «침범 없음» 이 아니라 **판정 불가**다(LESSONS 351-④ — 「A > null」 은 true). */
    /* ⚠ 재는 것은 **잉크**다(상자가 아니다) — 상자 밖으로 나온 부품이 실재한다.
       ⚠ 기준선·잉크를 못 찾으면 «침범 없음» 이 아니라 **판정 불가**다(LESSONS 351-④ — 「A > null」 은 true). */
    const band = (tag, d, b) => {
      if (!b || typeof d.tabsTop !== 'number' || !d.pedge) { no(tag, '잉크·기준선을 못 찾았다 — 판정 불가'); return; }
      (b.top >= d.pedge.bot && b.bot <= d.tabsTop)
        ? ok(tag, `잉크 ${b.top}..${b.bot} ⊂ 띠 ${d.pedge.bot}..${d.tabsTop}`)
        : no(tag, `잉크 ${b.top}..${b.bot} ⊄ 띠 ${d.pedge.bot}..${d.tabsTop}`);
    };
    band('[9-e] 1600 22 퀘스트 잉크가 띠 안', q13, q13.qink);
    band('[9-f] 1600 21 도감 잉크(리본~깃발탭)가 띠 안', c13, c13.clink);
    /* 음성항 — 상한에 **안 걸린** 작은 상자도 띠 안이어야 한다(가운데 정렬이 띠를 따라 움직인다).
       이게 없으면 §9 는 «큰 상자만 보는» 게이트가 된다. */
    band('[9-g] 1600 작은 다이얼로그(popup)도 띠 안', n13, n13.qink);
    /* ⓒ 반대급부 ① — 띠를 **다 쓴다**. 더 비우면 상자가 그만큼 눌린다.
       공용 `#modal` 은 상자가 곧 잉크라 142+180 = **322**.
       21 도감은 위아래 오버행(리본 10 · 깃발탭 149)까지 비워야 하므로 위 패딩 + 287 이다.
       ⚑ **이관(451, 2026-08-30 · 351 15회차가 잡았다)** — 451 이 리본 상변과 HUD 판때기 하변이
          맞닿던 것(여유 0.0)을 «햇빛» **12px** 로 갈랐다(`#collw` 위 패딩 194 → **206**).
          제품이 옳고 여기 적힌 194/481 이 그 전 값이라 [9-i]·[9-k] 두 항이 같이 빨개져 있었다
          (451 이 `verify447`·`verify436` 만 이관하고 이 자를 안 봤다 — 328~330 «이관이 본체다»).
          ⇒ 숫자를 무르게 늘리지 않고 **햇빛을 이름 붙여 상수로 세운다**: 451 이 되돌아가
          햇빛이 0 이 되면 두 항이 즉시 다시 빨개진다(그것이 이 항의 뜻이다). */
    const CL_SUN = 12;                    /* 451 «리본 이음매 햇빛» */
    const CL_PADT = 194 + CL_SUN;         /* = 206 — HUD 142 + translateY 42 + 리본 오버행 10 + 햇빛 */
    eq('[9-h] 1600 22 퀘스트 상자 높이 = 프레임 − 322', q13.qbox.h, 1600 - 322, 1);
    eq(`[9-i] 1600 21 도감 상자 높이 = 프레임 − ${CL_PADT + 287}(위 ${CL_PADT} + 아래 287)`,
      c13.cl.h, 1600 - (CL_PADT + 287), 1);
    /* ⓒ 반대급부 ② — 상자를 눌러 본문을 자르지 않는다. */
    (q13.qbody && q13.qbody.over <= 1)
      ? ok('[9-j] 1600 22 퀘스트 본문이 안 잘린다', `넘침 ${q13.qbody.over}px`)
      : no('[9-j] 1600 22 퀘스트 본문이 안 잘린다', `넘침 ${q13.qbody ? q13.qbody.over : '?'}px`);
    /* ⓒ 반대급부 ③ — 21 도감의 **두 오버행을 각각** 못박는다. 하나만 물으면 나머지가 조용히
       금지구역으로 넘어간다(1회차에 깃발탭이 그렇게 1419..1569 로 탭바 밑에 묻혔다). */
    /* ⚑ 451 이관 — «정확히 선다» 가 «햇빛 12px 만큼 띄우고 선다» 로 바뀌었다(위 CL_SUN 주석).
       ⚠ `>= pedge.bot` 로 무르게 풀지 않는다 — 그러면 리본이 얼마든지 내려가도 초록이라
          «리본이 띠를 다 쓴다» 는 뜻(9-i 의 짝)이 사라진다. 등호로 못박는다. */
    (c13.clRib && c13.clRib.top === c13.pedge.bot + CL_SUN)
      ? ok(`[9-k] 1600 21 도감 리본 상변 = HUD 잉크 끝 + 햇빛 ${CL_SUN}(451)`, `${c13.clRib.top} = ${c13.pedge.bot} + ${CL_SUN}`)
      : no(`[9-k] 1600 21 도감 리본 상변 = HUD 잉크 끝 + 햇빛 ${CL_SUN}(451)`, `${c13.clRib ? c13.clRib.top : '?'} vs ${c13.pedge.bot} + ${CL_SUN}`);
    (c13.collTabs && c13.collTabs.bot === c13.tabsTop)
      ? ok('[9-l] 1600 21 도감 깃발 서브탭 하변이 탭바 상변에 정확히 선다', `${c13.collTabs.bot} = ${c13.tabsTop}`)
      : no('[9-l] 1600 21 도감 깃발 서브탭 하변이 탭바 상변에 정확히 선다', `${c13.collTabs ? c13.collTabs.bot : '?'} vs ${c13.tabsTop}`);
    /* 2280 대조 — 깃발탭은 9:19 에서 탭바보다 한참 위다(여기가 움직이면 규칙이 샌 것이다). */
    eq('[9-m] 2280 21 도감 깃발 서브탭 하변(불변)', c19.collTabs.bot, 1965, 1);

    /* ---------------- §R 되돌림 시험 ---------------- */
    console.log('[§R] 처방을 뺀 사본에서 같은 항이 빨개지는가');
    const r13 = await shot(br, 1600, 'bless', true);
    (!r13.blswFits && r13.blsX.bot > r13.frameH)
      ? ok('[R-a] 되돌리면 1600 에서 ✕ 가 프레임 밖', `${r13.blsX.bot} > ${r13.frameH} (넘침 ${r13.blswOver}px)`)
      : no('[R-a] 되돌리면 1600 에서 ✕ 가 프레임 밖', `blsX.bot ${r13.blsX.bot} · 넘침 ${r13.blswOver}`);
    const rh13 = await shot(br, 1600, 'hero', true);
    (rh13.eqp.top === 104 && rh13.pcpCoveredByEq)
      ? ok('[R-b] 되돌리면 1600 에서 시트가 꼬리판을 덮는다', `.eqp top ${rh13.eqp.top} · 포인터 ${rh13.hit}`)
      : no('[R-b] 되돌리면 1600 에서 시트가 꼬리판을 덮는다', `.eqp top ${rh13.eqp.top} · 포인터 ${rh13.hit}`);
    /* 4회차 신설 3항 — 이 셋이 없으면 «이미 참인 것을 굳힌 게이트» 와 구별이 안 된다(338 교훈). */
    const rs13 = await shot(br, 1600, 'sheet', true);
    (rs13.panel.top === 104 && rs13.deepInSheet)
      ? ok('[R-d] 되돌리면 1600 스킬 시트가 104 로 내려와 꼬리판을 덮는다', `#panel top ${rs13.panel.top} · 포인터 ${rs13.deepHit}`)
      : no('[R-d] 되돌리면 1600 스킬 시트가 104 로 내려와 꼬리판을 덮는다', `#panel top ${rs13.panel.top} · 포인터 ${rs13.deepHit}`);
    const rm13 = await shot(br, 1600, 'mail', true);
    (typeof rm13.tabsTop === 'number' && rm13.mailX.bot > rm13.tabsTop)
      ? ok('[R-e] 되돌리면 1600 ✕ 가 탭바 안으로', `✕ 하변 ${rm13.mailX.bot} > 탭바 ${rm13.tabsTop} (침범 ${rm13.mailX.bot - rm13.tabsTop}px)`)
      : no('[R-e] 되돌리면 1600 ✕ 가 탭바 안으로', `✕ 하변 ${rm13.mailX.bot} · 탭바 ${rm13.tabsTop}`);
    const rm19 = await shot(br, 2280, 'mail', true);
    eq('[R-f] 되돌려도 2280 우편 ✕ 는 같다(9:19 무관)', rm19.mailX.top, 1734, 1);
    /* 되돌린 사본에서도 2280 은 같아야 한다 = 처방이 9:19 를 안 건드렸다는 두 번째 증거 */
    /* 6회차 신설 — 클램프를 걷어낸 사본에서 §6 이 실제로 빨개지는가.
       [R-g] 가 없으면 [6-d][6-e] 는 «이미 참인 것을 굳힌 게이트» 일 수 있다(338 교훈). */
    const rs56 = await shot(br, 1600, 'saver', true);
    (rs56.svHint.top < rs56.svP.bot && rs56.svHint.top < rs56.svR3.bot)
      ? ok('[R-g] 되돌리면 1600 안내문이 패널·3행 알약 안으로', `안내 ${rs56.svHint.top} < 패널 하변 ${rs56.svP.bot} · 3행 하변 ${rs56.svR3.bot}`)
      : no('[R-g] 되돌리면 1600 안내문이 패널·3행 알약 안으로', `안내 ${rs56.svHint.top} · 패널 ${rs56.svP.bot} · 3행 ${rs56.svR3.bot}`);
    const rs56t = await shot(br, 2280, 'saver', true);
    eq('[R-h] 되돌려도 2280 안내문은 같다(9:19 무관)', rs56t.frameH - rs56t.svHint.bot, 195);

    /* [R-i](406 → **413 에서 방향을 뒤집었다**) — §7 의 처방을 되돌림으로 못박는다.
       406 때는 제품이 `none` 이라 «auto 로 바꾸면 막히나» 가 진단이었다. 413 이 제품을 `auto` 로
       고쳤으므로 이제 물어야 할 것은 그 반대다 — **`none` 으로 되돌리면 통로가 다시 열리나.**
       열리면 §7 은 «이미 참인 것을 굳힌 게이트» 가 아니라 실제로 그 한 속성을 잡고 있는 것이다
       (338 교훈). ⚠ 두 프레임 다 되돌린다 — HUD 알약은 1600 에서도 새던 자리라 2280 만 보면
       [7-a3] 의 절반이 되돌림 없이 남는다. */
    const dp19 = await shot(br, 2280, 'sheet', 'dimpe');
    const dp13 = await shot(br, 1600, 'sheet', 'dimpe');
    ['attend', 'roul', 'quest'].every((k) => dp19.reach[k].on)
      ? ok('[R-i] 딤을 pointer-events:none 으로 되돌리면 2280 레일 3칸이 다시 닿는다 = 통로는 그 한 속성이다',
        ['attend', 'roul', 'quest'].map((k) => k + '=닿음').join(' · '))
      : no('[R-i] 되돌리면 2280 레일 3칸이 다시 닿는다',
        ['attend', 'roul', 'quest'].map((k) => k + '=' + (dp19.reach[k].on ? '닿음' : dp19.reach[k].by)).join(' · '));
    /* [R-i2] — 되돌리면 HUD 알약은 **두 프레임 다** 새야 한다. [7-a3] 의 짝이다. */
    (['cur_gold', 'cur_dia'].every((k) => dp19.reach[k].on) && ['cur_gold', 'cur_dia'].every((k) => dp13.reach[k].on))
      ? ok('[R-i2] 되돌리면 HUD 알약 2칸이 두 프레임 다 다시 닿는다 — 1600 누출도 413 이 닫은 것이다')
      : no('[R-i2] 되돌리면 HUD 알약 2칸이 두 프레임 다 다시 닿는다',
        ['cur_gold', 'cur_dia'].map((k) => k + '=' + (dp19.reach[k].on ? '2280닿음' : dp19.reach[k].by) + '/' + (dp13.reach[k].on ? '1600닿음' : dp13.reach[k].by)).join(' · '));
    /* [R-i3] 음성항 — 되돌려도 **나갈 길은 그대로**다. 되돌림이 «전부를 바꾼다» 면
       [R-i]·[R-i2] 는 그 속성이 아니라 사본 주입 자체를 잰 것이 된다. */
    (dp19.reach.escClose.on && dp13.reach.escClose.on)
      ? ok('[R-i3] 음성항 — 되돌려도 나갈 길(✕ 칸)은 두 해상도 다 그대로 닿는다')
      : no('[R-i3] 음성항 — 되돌려도 나갈 길은 그대로', `2280=${dp19.reach.escClose.by} · 1600=${dp13.reach.escClose.by}`);
    /* [R-n][R-o][R-p][R-q](390) — 띠를 옛 상수(126/150 · 168/276)로 되돌리면 §9 가 실제로 빨개지는가.
       이게 없으면 [9-e][9-f] 는 «이미 참인 것을 굳힌 게이트» 와 구별이 안 된다(338 교훈).
       ⚠ **두 자리를 따로 되돌려 따로 잡는다** — 한 항으로 묶으면 «둘 중 하나만 되돌려도
       조용한 게이트» 가 된다(369 [R] 선례). */
    const rq13 = await shot(br, 1600, 'quest', true);
    (rq13.qbox.top < rq13.pedge.bot && rq13.qbox.bot > rq13.tabsTop)
      ? ok('[R-n] 되돌리면 1600 22 퀘스트 상자가 HUD·탭바를 둘 다 문다',
        `${rq13.qbox.top}..${rq13.qbox.bot} vs 띠 ${rq13.pedge.bot}..${rq13.tabsTop} (위 ${rq13.pedge.bot - rq13.qbox.top} · 아래 ${rq13.qbox.bot - rq13.tabsTop})`)
      : no('[R-n] 되돌리면 1600 22 퀘스트 상자가 HUD·탭바를 둘 다 문다',
        `${rq13.qbox.top}..${rq13.qbox.bot} vs 띠 ${rq13.pedge.bot}..${rq13.tabsTop}`);
    const rk13 = await shot(br, 1600, 'coll', true);
    /* ⚠ **두 오버행을 각각** 되돌림으로 잡는다 — 리본(위)과 깃발탭(아래)은 서로 다른 값이 만든다.
       한 항만 두면 «둘 중 하나만 되돌려도 조용한 게이트» 가 된다(369 [R] 선례). */
    (rk13.clRib.top < rk13.pedge.bot)
      ? ok('[R-o] 되돌리면 1600 21 도감 리본이 HUD 를 문다', `리본 상변 ${rk13.clRib.top} < ${rk13.pedge.bot} (침범 ${rk13.pedge.bot - rk13.clRib.top}px)`)
      : no('[R-o] 되돌리면 1600 21 도감 리본이 HUD 를 문다', `리본 상변 ${rk13.clRib.top} · 잉크 끝 ${rk13.pedge.bot}`);
    (rk13.collTabs.bot > rk13.tabsTop)
      ? ok('[R-p] 되돌리면 1600 21 도감 깃발 서브탭이 탭바를 문다', `깃발탭 하변 ${rk13.collTabs.bot} > 탭바 ${rk13.tabsTop} (침범 ${rk13.collTabs.bot - rk13.tabsTop}px)`)
      : no('[R-p] 되돌리면 1600 21 도감 깃발 서브탭이 탭바를 문다', `깃발탭 하변 ${rk13.collTabs.bot} · 탭바 ${rk13.tabsTop}`);
    /* 되돌린 사본에서도 2280 은 같아야 한다 = 처방이 9:19 를 안 건드렸다는 세 번째 증거 */
    const rq19 = await shot(br, 2280, 'quest', true);
    eq('[R-q] 되돌려도 2280 22 퀘스트 상자 상변은 같다(9:19 무관)', rq19.qbox.top, 380, 1);
    const r19 = await shot(br, 2280, 'bless', true);
    eq('[R-c] 되돌려도 2280 ✕ 상변은 같다(9:19 무관)', r19.blsX.top, 1793);
    /* 7회차 신설 — 무르게 푼 수리가 아님을 두 항이 못박는다. [R-j] 는 «되돌리면 탭 줄이 패널 밖으로
       나가 탭바를 문다», [R-k] 는 «되돌려도 2280 은 같다»(= 처방이 9:19 를 안 건드렸다). */
    const rp13 = await shot(br, 1600, 'spec', true);
    (rp13.spcTabs && rp13.spcTabs.bot > rp13.spcBody.bot && rp13.spcTabs.bot > rp13.tabsTop)
      ? ok('[R-j] 되돌리면 1600 탭 줄이 패널 밖으로 나가 탭바를 문다',
        `탭 줄 ${rp13.spcTabs.top}..${rp13.spcTabs.bot} · 본문 하변 ${rp13.spcBody.bot} · 탭바 ${rp13.tabsTop} (침범 ${rp13.spcTabs.bot - rp13.tabsTop}px)`)
      : no('[R-j] 되돌리면 1600 탭 줄이 패널 밖으로 나가 탭바를 문다',
        `탭 줄 ${rp13.spcTabs && rp13.spcTabs.bot} · 본문 ${rp13.spcBody && rp13.spcBody.bot} · 탭바 ${rp13.tabsTop}`);
    const rp19 = await shot(br, 2280, 'spec', true);
    eq('[R-k] 되돌려도 2280 탭 줄 상변은 같다(9:19 무관)', rp19.spcTabs.top, 1692, 1);
  } finally { await br.close(); }

  console.log(`\nVERIFY351 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY351 CRASH', e); process.exit(2); });
