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

/* 처방을 걷어낸 사본 — §R 에서만 주입한다 */
const REVERT = `
  #blsw{padding-bottom:146px !important}
  #app.shortf .bls-x{position:relative !important;top:16px !important;right:auto !important;margin:5px 0 auto !important}
  .eqp{max-height:calc(100% - 104px) !important}
  #panel{max-height:calc(100% - 284px) !important}
  #app.shortf #modal.ml69{padding:126px 91px !important}
  #app.shortf #modal.ml69 .mbox{max-height:min(1303px,calc(100% - 120px)) !important}
`;

async function shot(browser, h, opener, revert) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  if (revert) await page.addStyleTag({ content: REVERT });
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
      const el = document.elementFromPoint(202, r.bottom - 4);
      deepHit = el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.')) : null;
      deepInSheet = !!(el && el.closest && (el.closest('.eqp') || el.closest('#panel')));
    }
    const bd = document.querySelector('.ml69 .mbody');
    const tabs = document.getElementById('tabbar');
    return {
      frameH: Math.round(A.height),
      shortf: app.classList.contains('shortf'),
      bls: box('#blsw .bls'), promo: box('.bls-promo'), blsX: box('#blsX'),
      blswFits: w ? (w.scrollHeight <= w.clientHeight + 1) : null,
      blswOver: w ? (w.scrollHeight - w.clientHeight) : null,
      eqp: box('#eqw .eqp'),
      panel: box('#panel'), sheetOn: !!document.querySelector('#bSk.on'),
      mbox: box('#modal.ml69 .mbox'), mailX: box('#mailX'),
      mailFits: bd ? (bd.scrollHeight <= bd.clientHeight + 1) : null,
      mailOver: bd ? (bd.scrollHeight - bd.clientHeight) : null,
      tabsTop: tabs ? Math.round(tabs.getBoundingClientRect().top - A.top) : null,
      pcp, hit, pcpCoveredByEq: !!inEq,
      pedge, deepHit, deepInSheet,
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
    const r19 = await shot(br, 2280, 'bless', true);
    eq('[R-c] 되돌려도 2280 ✕ 상변은 같다(9:19 무관)', r19.blsX.top, 1793);
  } finally { await br.close(); }

  console.log(`\nVERIFY351 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY351 CRASH', e); process.exit(2); });
