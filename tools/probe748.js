#!/usr/bin/env node
/* 748 재현 — 9:13.3(1600) 프레임에서 «12 소환 결과 팝업» 이 팝업 **밖** 요소와 겹친다
 *
 *   node tools/probe748.js
 *
 * ⚑ 338 규칙 — 처방을 따르기 전에 **찍힌 값**으로 재현부터 한다.
 *   등재문(713 1회차 비평 2인 독립 일치)이 셋을 적었다(1080×1600 실측):
 *     ① 리본 타이틀 글리프 122~161 을 «⚔️ 전투력 +22» 토스트(147~217)가 35~49% 덮는다
 *     ② «터치하여 닫기» 1440~1468 이 하단 내비 상단(≈1420)·NEW 배지(1425~1460)와 겹친다
 *     ③ 재소환 버튼 줄 1274~1409 가 무기 슬롯 원형(≈1250~1400)을 덮는다
 *   그리고 «2280 에서는 셋 다 안 난다» 도 같이 주장한다(①은 리본 541~641 ↔ 토스트 152~217,
 *   ②는 2103 ↔ 2105 로 2px, ③은 애초에 자리가 다르다).
 *
 * ⚠ **이 자는 아무것도 고치지 않는다 — 수치만 찍는다.** 묻는 것은 네 층이고 답이 다를 수 있다:
 *   [1] ① 이 **지금 트리에서도** 나는가 — 761(토스트 ↔ 팝업 타이틀 앵커 화해)이 `#sumw .sm-band`
 *       를 이름표 목록에 이미 넣었으므로, 등재문의 ① 은 그 사이에 닫혔을 수 있다.
 *       ⚠ 761 은 «토스트를 만드는 순간» 에만 판정한다 — 그래서 **두 순서를 다 잰다**:
 *         ⓐ 팝업이 먼저 열리고 토스트가 뒤에(= 684 가 실측한 실제 순서: 배치 → 팝업 → 다음 프레임)
 *         ⓑ 토스트가 먼저 뜨고 팝업이 뒤에(순서가 뒤집히면 761 의 판정이 아예 안 걸린다)
 *   [2] ②③ 이 나는가 — 닫기·버튼이 배경 UI(탭바·NEW 배지·스킬 슬롯)와 실제로 겹치는 세로 px.
 *   [3] 2280 에서는 셋 다 0 인가(= «짧은 프레임만의 병» 이라는 주장).
 *   [4] 뿌리 — 팝업 자신의 상자는 두 프레임에서 같은데(패널 하단 앵커 1248) **짧은 프레임
 *       보호항**(`.sm-btns` `min(426px,100% - 1416px)` · `.sm-close` `min(170px,100% - 1475px)`)이
 *       팝업을 위로 당길 때 **배경 UI 와의 좌표 관계를 안 본다**.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const G756 = require('./gitrev756');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const CUR = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PRE = process.env.PROBE748_PRE || '24198e4';   /* claim(748) — 수리 직전 트리 */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const say = (name, detail) => console.log('    · ' + name + (detail ? ' — ' + detail : ''));

const open = async (browser, h, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url || CUR);
  await page.waitForFunction(() => typeof fxToast === 'function' && typeof showSummonResult === 'function');
  await page.waitForTimeout(900);
  /* 73 ③ 가이드 소환 미션이 «지정된 상자» 외 소환을 막는다 — 84·187·327 게이트와 같은 처리 */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
  return { page, errs };
};

/* 결과 n칸을 팝업에 넣는다 — verify327/probe745 의 SETUP 과 같은 식(값이 두 벌이 되지 않게) */
const OPEN_POPUP = (n) => `(() => {
  S.dia = 1e12;
  const res = [], seen = new Set();
  for (const bk of BKEYS) {
    for (let i = 0; i < 20000 && res.length < ${n}; i++) {
      const r = summonOne(bk);
      if (!r || !r.it || seen.has(r.it.id)) continue;
      seen.add(r.it.id); res.push(r);
    }
    if (res.length >= ${n}) break;
  }
  showSummonResult('weapon', res.length, res, false);
  return res.length;
})()`;

/* 두 상자의 세로 교집합 */
const MEASURE = `(() => {
  const r = o => { if(!o) return null; const b = o.getBoundingClientRect();
    return { y: +b.y.toFixed(2), b: +(b.y + b.height).toFixed(2), h: +b.height.toFixed(2),
             x: +b.x.toFixed(2), rt: +(b.x + b.width).toFixed(2) }; };
  const ink = n => { if(!n) return null; const rg = document.createRange(); rg.selectNodeContents(n);
    const b = rg.getBoundingClientRect();
    return { y: +b.y.toFixed(2), b: +(b.y + b.height).toFixed(2), h: +b.height.toFixed(2),
             x: +b.x.toFixed(2), rt: +(b.x + b.width).toFixed(2) }; };
  const ovY = (a, b) => (!a || !b) ? 0 : +Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y)).toFixed(2);
  const ovX = (a, b) => (!a || !b) ? 0 : +Math.max(0, Math.min(a.rt, b.rt) - Math.max(a.x, b.x)).toFixed(2);
  const q = s => document.querySelector(s);

  const toastEl = document.querySelector('#fxl .fx-toast');
  const toast = r(toastEl);
  const band  = r(q('#sumw .sm-band'));
  const title = ink(q('#sumw .sm-band > i'));
  const close = ink(q('#sumw .sm-close > i'));
  const btns  = r(q('#sumw .sm-btns'));
  const bar   = r(q('#tabbar'));
  const grid  = r(q('#sumGrid'));
  /* ⚠ 카드 한 장(맨 왼쪽)만 보면 «안 겹친다» 가 나온다 — 토스트는 화면 중앙이라 좌단 카드와는
     가로가 안 물린다. **전 카드 중 최악**을 봐야 한다. */
  const cards = [...document.querySelectorAll('#sumGridIn > *')].map(r).filter(b => b && b.h > 0);
  const card0 = cards.length ? cards[0] : null;
  const nws   = [...document.querySelectorAll('#tabbar .tab .nw')]
                  .map(r).filter(b => b && b.h > 0);
  const slots = [...document.querySelectorAll('#slots .slot2')].map(r).filter(b => b && b.h > 0);
  /* 겹침은 «세로 ∩ 가로» 둘 다 있어야 한다 — 가로가 안 겹치면 같은 띠라도 안 가린다 */
  const both = (a, b) => (ovY(a, b) > 0 && ovX(a, b) > 0) ? ovY(a, b) : 0;
  const worst = (a, list) => list.reduce((m, b) => Math.max(m, both(a, b)), 0);

  return {
    frameH: +document.getElementById('app').getBoundingClientRect().height.toFixed(1),
    open: document.getElementById('sumw').classList.contains('on'),
    toast, band, title, close, btns, bar, grid, card0,
    ovToastCard: worst(toast, cards),
    nw: nws.length ? { y: Math.min(...nws.map(b => b.y)), b: Math.max(...nws.map(b => b.b)) } : null,
    slot: slots.length ? { y: Math.min(...slots.map(b => b.y)), b: Math.max(...slots.map(b => b.b)) } : null,
    ovTitle: both(toast, title),
    ovTitlePct: title && title.h ? +(100 * both(toast, title) / title.h).toFixed(1) : 0,
    ovCloseBar: close && bar ? +Math.max(0, close.b - bar.y).toFixed(2) : 0,
    ovCloseNw: worst(close, nws),
    ovBtnSlot: worst(btns, slots),
    zPop: getComputedStyle(document.getElementById('sumw')).zIndex,
    zBar: getComputedStyle(document.getElementById('tabbar')).zIndex,
    zFxl: getComputedStyle(document.getElementById('fxl')).zIndex,
    cssBtns: getComputedStyle(q('#sumw .sm-btns')).bottom,
    cssClose: getComputedStyle(q('#sumw .sm-close')).bottom,
    toastTop: toastEl ? getComputedStyle(toastEl).top : null
  };
})()`;

/* ⓐ 팝업이 먼저 열리고 토스트가 뒤에 (684 가 실측한 실제 순서) */
const shootA = async (page, n) => {
  await page.evaluate(OPEN_POPUP(n || 10));
  await page.waitForTimeout(700);
  await page.evaluate(() => { fxToast('⚔️ 전투력 <b>+22</b>'); });
  await page.waitForTimeout(320);        /* 등장 애니 정착(25% = 190ms)을 지나서 잰다 */
  return page.evaluate(MEASURE);
};
/* ⓑ 토스트가 먼저 뜨고 팝업이 뒤에 */
const shootB = async (page) => {
  await page.evaluate(() => { fxToast('⚔️ 전투력 <b>+22</b>'); });
  await page.waitForTimeout(320);
  await page.evaluate(OPEN_POPUP(10));
  await page.waitForTimeout(700);
  return page.evaluate(MEASURE);
};

const dump = (tag, m) => {
  say(tag + ' 프레임 ' + m.frameH + ' · 팝업 ' + (m.open ? '열림' : '닫힘'));
  say('  리본 판 ' + (m.band ? m.band.y + '..' + m.band.b : '-')
    + ' · 타이틀 글리프 ' + (m.title ? m.title.y + '..' + m.title.b : '-')
    + ' · 토스트 ' + (m.toast ? m.toast.y + '..' + m.toast.b + ' (css top ' + m.toastTop + ')' : '없음')
    + ' ⇒ 덮임 ' + m.ovTitle + 'px (' + m.ovTitlePct + '%)');
  say('  닫기 잉크 ' + (m.close ? m.close.y + '..' + m.close.b : '-')
    + ' · 탭바 상변 ' + (m.bar ? m.bar.y : '-')
    + ' · NEW ' + (m.nw ? m.nw.y + '..' + m.nw.b : '-')
    + ' ⇒ 탭바 침범 ' + m.ovCloseBar + 'px · NEW 겹침 ' + m.ovCloseNw + 'px');
  say('  버튼 줄 ' + (m.btns ? m.btns.y + '..' + m.btns.b : '-')
    + ' · 스킬 슬롯 ' + (m.slot ? m.slot.y + '..' + m.slot.b : '-')
    + ' ⇒ 겹침 ' + m.ovBtnSlot + 'px');
  say('  첫 행 카드 ' + (m.card0 ? m.card0.y + '..' + m.card0.b : '-')
    + ' ⇒ 토스트 ↔ 카드 겹침 ' + m.ovToastCard + 'px');
  say('  보호항 실효값 — .sm-btns bottom ' + m.cssBtns + ' · .sm-close bottom ' + m.cssClose);
};

(async () => {
  const browser = await launch(chromium);

  /* ── 수리 전 트리 ─────────────────────────────────────────────────────── */
  let preUrl = null, tmp = null;
  const got = G756.show(PRE, 'index.html');
  if (got.ok) {
    if (got.how) console.log('[i]' + got.how);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe748-'));
    fs.writeFileSync(path.join(tmp, 'index.html'), got.buf);
    preUrl = 'file://' + path.join(tmp, 'index.html').replace(/\\/g, '/');
  }

  let P16 = null, P22 = null;
  if (preUrl) {
    const a16 = await open(browser, 1600, preUrl); P16 = await shootA(a16.page);
    const b16 = await open(browser, 1600, preUrl); const PB16 = await shootB(b16.page);
    const a22 = await open(browser, 2280, preUrl); P22 = await shootA(a22.page);

    console.log('\n[1] 재현 — 수리 전 트리(' + PRE + ')');
    dump('1600 ⓐ(팝업 먼저)', P16);
    dump('1600 ⓑ(토스트 먼저)', PB16);
    dump('2280 ⓐ', P22);
    ok(P16.open, '[1-a] 1600 에서 12 결과 팝업이 열렸다', '#sumw.on');
    /* ⚑ 338 규칙이 여기서 값을 했다 — 등재문 ① 은 **이미 닫혀 있었다**(761 이 `#sumw .sm-band` 를
       이름표 목록에 넣었다). 처방을 그대로 따랐으면 이미 참인 것을 게이트로 굳혔을 자리다. */
    ok(P16.ovTitle === 0,
      '[1-b] ① 은 수리 전에도 0 — 761 이 이미 닫았다(팝업 → 토스트 순서)', m0(P16.ovTitle));
    ok(PB16.ovTitle === 0, '[1-c] ① 은 순서를 뒤집어도 0', m0(PB16.ovTitle));
    ok(P16.ovCloseBar > 40,
      '[1-d] ② «터치하여 닫기» 가 하단 탭바 띠를 깊이 침범한다', m0(P16.ovCloseBar));
    ok(P16.ovCloseNw > 40,
      '[1-e] ② 그 침범이 NEW 배지와 실제로 겹친다(세로 ∩ 가로)', m0(P16.ovCloseNw));
    ok(P16.ovBtnSlot > 100,
      '[1-f] ③ 재소환 버튼 줄이 스킬 슬롯 원형을 덮는다', m0(P16.ovBtnSlot));

    console.log('\n[2] 대조 — 2280 은 같은 관계가 «레퍼런스가 허용한 접점» 이다');
    /* ⚠ 등재문의 «2280 은 2px 차이로 피한다» 는 **CSS 상자** 기준이고, 잉크로 재면 10px 스친다 —
       즉 «닫기가 탭바를 조금 문다» 는 레퍼런스 그림 자체다. 결함은 그 접점이 아니라 **1600 의 배율**이다. */
    ok(P22.ovCloseBar > 0 && P22.ovCloseBar < 20,
      '[2-a] 2280 닫기 ↔ 탭바 접점은 작다(레퍼런스 그림)', m0(P22.ovCloseBar));
    ok(P16.ovCloseBar > P22.ovCloseBar * 3,
      '[2-b] 1600 은 그 접점의 3배 이상이다 — 이것이 결함의 크기',
      P22.ovCloseBar + ' → ' + P16.ovCloseBar + 'px (×' + (P16.ovCloseBar / P22.ovCloseBar).toFixed(1) + ')');
    ok(P22.ovBtnSlot === 0, '[2-c] 2280 버튼 ↔ 슬롯 겹침 0', m0(P22.ovBtnSlot));

    console.log('\n[3] 뿌리 — 짧은 프레임 보호항이 팝업 밖을 안 본다');
    ok(P16.cssBtns !== P22.cssBtns && P16.cssClose !== P22.cssClose,
      '[3-a] 1600 에서만 보호항이 이긴다(두 프레임의 bottom 이 다르다)',
      'btns ' + P22.cssBtns + ' → ' + P16.cssBtns + ' · close ' + P22.cssClose + ' → ' + P16.cssClose);
    ok(P16.zPop === '37' && (P16.zBar === 'auto' || +P16.zBar < 37),
      '[3-b] 배경 UI 는 딤(z37) 아래다 — 겹침은 «가려짐» 이 아니라 «딤 너머로 비침»',
      '팝업 z' + P16.zPop + ' · 탭바 z' + P16.zBar + ' · 연출층 z' + P16.zFxl);
    await a16.page.context().close(); await b16.page.context().close(); await a22.page.context().close();
  } else {
    console.log('\n⏸ SKIP [1]~[3] 수리 전 트리 — ' + PRE + ' 를 못 꺼냈다(얕은 클론 · 환경) — 실패 아님');
  }

  /* ── 현재 트리 ────────────────────────────────────────────────────────── */
  const c16 = await open(browser, 1600); const N16 = await shootA(c16.page);
  const c22 = await open(browser, 2280); const N22 = await shootA(c22.page);
  const c19 = await open(browser, 1920); const N19 = await shootA(c19.page);

  console.log('\n[4] 수리 후 — 현재 트리');
  dump('1600', N16); dump('1920', N19); dump('2280', N22);
  ok(N16.ovTitle === 0 && N22.ovTitle === 0, '[4-a] ① 타이틀 덮임 0 (두 프레임)',
    N16.ovTitle + ' / ' + N22.ovTitle);
  ok(N16.ovCloseBar <= N22.ovCloseBar + 0.5,
    '[4-b] ② 1600 탭바 침범이 2280 의 접점 이하로 내려왔다',
    N16.ovCloseBar + 'px ≤ ' + N22.ovCloseBar + 'px');
  ok(P16 === null || N16.ovBtnSlot < P16.ovBtnSlot,
    '[4-c] ③ 버튼 ↔ 슬롯 겹침은 줄었다(0 은 아니다 — 구조 한계 · 811 몫)',
    (P16 ? P16.ovBtnSlot + ' → ' : '') + N16.ovBtnSlot + 'px');
  ok(P22 === null || (N22.cssBtns === P22.cssBtns && N22.cssClose === P22.cssClose
      && Math.abs(N22.band.y - P22.band.y) < .5),
    '[4-d] 2280 Δ0px — 긴 프레임은 한 픽셀도 안 움직였다',
    P22 ? ('btns ' + P22.cssBtns + '→' + N22.cssBtns + ' · close ' + P22.cssClose + '→' + N22.cssClose
      + ' · 리본 ' + P22.band.y + '→' + N22.band.y) : '(수리 전 트리 없음 — 보류)');
  ok(N19.cssBtns === '426px' && N19.cssClose === '170px',
    '[4-e] 1920 프레임도 자연 앵커가 이긴다(Δ0px)', N19.cssBtns + ' / ' + N19.cssClose);
  /* ⚑ 대가를 숨기지 않는다 — 리본이 100 → 55 로 올라간 만큼 토스트(자리 상수 143)가 1600 에서만
     패널 위에 걸린다. 타이틀은 여전히 0px 가리고(761 규약), 겹치는 것은 첫 행 카드 상단뿐이며
     수명은 1.06s 다. 상시 겹침(②)과 맞바꾼 값이라 **찍어서 기록한다**(관측 · 통과 조건 아님). */
  const w16 = await open(browser, 1600); const W16 = await shootA(w16.page, 30);
  dump('1600 · 30칸(그리드 가득 = 최악)', W16);
  say('[4-g] 대가(관측) — 1600 토스트 ↔ 첫 행 카드: 10칸 ' + N16.ovToastCard + 'px · '
    + '30칸(최악) ' + W16.ovToastCard + 'px'
    + ' (2280 ' + N22.ovToastCard + ' · 1920 ' + N19.ovToastCard + 'px)');

  const errs = c16.errs.concat(c22.errs, c19.errs);
  ok(errs.length === 0, '[4-f] 콘솔 에러 0', errs.join(' | ') || '0건');

  await browser.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\nPROBE748 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();

function m0(v) { return v + 'px'; }
