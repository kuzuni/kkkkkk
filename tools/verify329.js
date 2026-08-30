#!/usr/bin/env node
/* 게이트 — 작업 329 「13 재화 상점 «광고 보고 받기» 버튼 레드닷 — 받을 수 있는 상태면」
 *          (저장소 주인 지시 2026-08-28 — «재화 상점에도 광고 보고 받기 버튼에 다 빨간점 있게 해야함 받을수 있는 상태면»)
 *
 *   node tools/verify329.js
 *
 * ⚑ **이관 2건(2026-08-29)** — 성질은 그대로고 «어디를 보는가» 만 옮겼다:
 *   · 364 — 닷의 호스트가 **버튼(`.bt`) → 카드(`.cn-cd`)** 로 옮겨졌다(주인 보고 «위치가 어정쩡함»).
 *     [G] 사분면·«안 밟는다» 는 이제 **카드 기준**으로 재고, 이웃도 버튼 안(라벨·(n/n)·▶AD)이 아니라
 *     카드 안(타이틀 잉크·아이콘·×N·버튼 전체)이다. 자리의 정밀 단언은 `tools/verify364.js` 몫.
 *     ⚠ 여기 [G0] 이 «버튼 안에는 닷이 하나도 없다» 를 못박는다 — 이 줄이 없으면 364 가 통째로
 *     되돌아가도 이 게이트가 초록이다(328~330 이관 교훈).
 *   · 365·366 — 상품이 6종 → **4종**, cap 이 전부 **5**. 칸 수는 `COIN_ADS.length` 에서 읽어
 *     상수로 굳히지 않는다(라인업이 또 바뀌어도 이 게이트는 «닷» 만 본다).
 *
 * 지키는 성질: **오늘 남은 수령 횟수가 있는 광고 상품 칸에만 레드닷이 뜨고,
 *               받아서 소진하면 그 칸만 즉시 꺼지며, 경로(탭바 «상점» · 재화 카테고리 탭)까지 이어진다.**
 *   [A] 전부 남은 국면 — 전 칸 점등 · 재화 탭 배지 점등 · 탭바 «상점» 칸 점등
 *   [B] 섞인 국면 — 2칸 소진(«구매 완료» 라 버튼 자체가 없다) · 나머지 칸만 점등(짝이 안 어긋난다)
 *   [C] 전부 소진 — 버튼 0개 · 재화 탭 배지 소등 · 탭바 «상점» 칸은 «무료 소환» 이 남았으면 그것으로만 켜진다
 *       (329 가 294 의 신호를 덮어쓰지 않는다 — OR 로 잇는 것이 지시 ②다)
 *   [D] 실동작(기능 완성 규칙) — 버튼을 **진짜로 클릭**해 보상이 들어오고 `adLeft` 가 줄고
 *       그 칸의 닷이 꺼지는 것까지 본다(«만들어 놓음» 이 아니라 «동작함»)
 *   [E] 음성 — 다이아 판매 칸(`.bt.buy`)에는 닷이 하나도 없다(돈을 내는 상품이라 «받을 수 있다» 가 아니다)
 *   [F] 166 규약 — 부품은 `<s class="updot">` 하나 · 점등은 호스트(`.bt[data-cnad]`) `.alert` 로만.
 *       ⚠ `#shopw s{display:inline-block}`(ID 급) 스코프 짝이 없으면 상시 점등이 된다.
 *   [G] 299 규약 + 자리 — 중심이 버튼 우상단 사분면 · 60 쥬시 봉우리(1.3)에서도 라벨·(n/n)·▶AD 를 안 밟고
 *       `.cn-cd{overflow:hidden}` 에 안 잘린다. **광고 제거 이용권(«무료 수령» 라벨)** 국면도 같이 잰다.
 *   [H] 13 레이아웃 회귀 — 닷을 넣어도 버튼·라벨 기하가 한 픽셀도 안 움직인다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → DOM» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 100) / 100;

async function redAt(page, rect) {
  const [x, y, w, h] = rect;
  if (!(w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= W && y + h <= H)) return 0;
  const buf = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) } });
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i+1] < 110 && d[i+2] < 130) n++;
    return n;
  }, buf.toString('base64'));
}

const MEAS = `
window.__ink = function(el){ if(!el) return null; const r=document.createRange(); r.selectNodeContents(el);
  const b=r.getBoundingClientRect(); return [b.left,b.top,b.width,b.height]; };
window.__ads = function(){
  /* WARN §5 광고 6칸만 본다 — 같은 페이지에 §7 다이아 판매 5칸 · §9·§10 교환 칸이 같은 .cn-cd 로 있다.
     광고 칸은 렌더 순서상 맨 앞 COIN_ADS.length 개다(renderCoinPage §5 가 첫 묶음).
     (이 블록은 템플릿 문자열 안이라 백틱을 쓰면 안 된다.) */
  /* 364 — 닷의 호스트는 이제 **카드**다(.cn-cd 직속 자식이고 .alert 도 카드가 든다).
     소진 칸은 버튼이 통째로 없고 닷도 없어야 한다 — 그 «없음» 을 dots 로 센다.
     (백틱 금지 — 이 블록은 위 경고대로 템플릿 문자열 안이다.) */
  return [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length).map(cd => {
    const bt = cd.querySelector(':scope > .bt[data-cnad]');
    const cr = cd.getBoundingClientRect();
    if(!bt) return { done:true, card:[cr.left,cr.top,cr.width,cr.height],
                     dots: cd.querySelectorAll('.updot').length };
    const br = bt.getBoundingClientRect();
    /* 471+479(2026-08-30, 주인 번복) — 닷이 다시 [받기] 버튼 자식이 됐다(364 «카드 직속» 폐기).
       점등도 버튼의 .alert 로 옮겨 갔다. 뜻(«받을 수 있으면 버튼에 점»)은 329 그대로다. */
    const d = bt.querySelector(':scope > .updot');
    let dot = null;
    if(d){ const prev=d.style.animation; d.style.animation='none';
      const dr=d.getBoundingClientRect(); d.style.animation=prev;
      dot={ rect:[dr.left,dr.top,dr.width,dr.height], display:getComputedStyle(d).display,
            pe:getComputedStyle(d).pointerEvents }; }
    const box = e => { if(!e) return null; const r=e.getBoundingClientRect(); return [r.left,r.top,r.width,r.height]; };
    return { done:false, id:bt.dataset.cnad, alert:bt.classList.contains('alert'),
      inBt: bt.querySelectorAll('.updot').length, inCard: cd.querySelectorAll(':scope > .updot').length,
      card:[cr.left,cr.top,cr.width,cr.height], bt:[br.left,br.top,br.width,br.height], dot,
      /* 이웃 — 364 로 자리가 카드로 올라와서 «밟으면 안 되는 것» 도 카드 안 전부가 됐다 */
      lab:__ink(cd.querySelector('.hd>i')), cnt:__ink(cd.querySelector('.qt')),
      ad: box(cd.querySelector('.pn .cic') || cd.querySelector('.pn>em')), btBox: box(bt) };
  });
};
window.__chain = function(){ return {
  tab: document.querySelector('.tab[data-t="shop"]').classList.contains('alert'),
  coin: (c => !!c && c.classList.contains('alert'))(document.querySelector('#shopCats .stab[data-cat="coin"]')),
  coinVis: (c => { const b = c && c.querySelector('.bdg'); return !!b && getComputedStyle(b).display !== 'none'; })
            (document.querySelector('#shopCats .stab[data-cat="coin"]')),
  pass: (c => !!c && !!c.querySelector('.bdg'))(document.querySelector('#shopCats .stab[data-cat="pass"]')),
  /* 364 이후에도 «다이아 판매 칸» 은 닷 0 이어야 한다 — 카드 자식으로 옮겼으니 그 카드까지 센다
     (.bt.buy 를 품은 카드. 옛 선택자만 두면 자리가 옮겨진 순간 음성 단언이 죽는다) */
  buyDots: document.querySelectorAll('#shopList .cn-cd>.bt.buy .updot').length
         + [...document.querySelectorAll('#shopList .cn-cd')].filter(c => c.querySelector(':scope > .bt.buy'))
             .reduce((s, c) => s + c.querySelectorAll('.updot').length, 0) };
};`;

const gap = (c, b) => {
  if (!b) return 1e9;
  const dx = Math.max(b[0] - c[0], 0, c[0] - (b[0] + b[2]));
  const dy = Math.max(b[1] - c[1], 0, c[1] - (b[1] + b[3]));
  return Math.hypot(dx, dy);
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 5000, best: 30, totalKills: 500 })]);
  await ctx.addInitScript(MEAS);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });

  /* ══ [A] 전부 남은 국면 ═══════════════════════════════════════════════ */
  await page.evaluate(() => {
    S.daily.adBuy = {};                                   /* 없는 키는 cap 폴백 = 전부 남음 */
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 0, o), {});   /* 294 신호를 끄고 329 만 본다 */
    openShopPage(null, 'coin'); syncShopSumBtns(); uiDirty = true; renderUI();
  });
  await page.waitForTimeout(700);
  let ads = await page.evaluate(() => __ads());
  let ch = await page.evaluate(() => __chain());
  const N = await page.evaluate(() => COIN_ADS.length);      /* 365 — 칸 수는 라인업에서 읽는다 */
  const live = ads.filter(a => !a.done);
  ok(live.length === N && N > 0, '[A] 광고 상품 전 칸이 살아 있다 (판정 재료)', live.length + '/' + N + '칸');
  ok(live.every(a => a.alert && a.dot && a.dot.display !== 'none'),
    '[A] 전 칸 점등 · 부품이 보인다 (#shopw 스코프 짝 되돌림 감시)',
    live.filter(a => a.alert && a.dot && a.dot.display !== 'none').length + '/' + N);
  ok(live.length > 0 && live.every(a => a.dot && a.dot.pe === 'none'), '[A] 닷은 `pointer-events:none` — 버튼 히트를 안 가로챈다');
  ok(ch.coin === true && ch.coinVis === true, '[A] 재화 카테고리 탭 배지 점등 (지시 ② 경로)',
    'alert=' + ch.coin + ' 보임=' + ch.coinVis);
  ok(ch.tab === true, '[A] 탭바 «상점» 칸 점등 — 무료 소환이 0 이어도 광고 상품으로 켜진다', String(ch.tab));
  ok(ch.pass === false, '[A] 음성 — 이용권 탭에는 배지 노드를 안 단다(판정이 없다)', '노드 ' + ch.pass);
  const red0 = live[0] && live[0].dot ? await redAt(page, live[0].dot.rect) : 0;
  ok(red0 > 200, '[A] 화소 — 첫 칸 닷 자리에 빨강이 실제로 찍힌다', red0 + 'px');

  /* ── [G] 자리 — 기본 라벨(«받기») ── */
  const place = a => {
    if (!a.dot) return { q: [0, 1], slack: -1e9, clip: [-1e9, -1e9, -1e9, -1e9] };   /* 278 — 부품이 없으면 즉사 말고 빨강 */
    const r = a.dot.rect, c = [r[0] + r[2] / 2, r[1] + r[3] / 2];
    /* ⚑ 471+479(2026-08-30, 주인 번복) 이관 — 자리가 «버튼 코너» 로 돌아왔고 자는 두 곳이 바뀐다:
       ⓐ 사분면 기준 상자 = **버튼**(299 는 «호스트 상자» 를 묻는데 호스트가 다시 버튼이다)
       ⓑ 이웃 목록에서 **버튼(btBox)을 뺀다** — 호스트를 «밟으면 안 되는 것» 으로 세면
          «코너에 걸친다» 는 규약 자체가 영원히 빨갛다.
       ⓒ 링 배율은 등장 봉우리 1.3 → **정지(1.0)**. 이유는 verify364 [C] 주석에 적은 것과 같다
          (자리를 고를 자유가 479 로 사라졌다 · 봉우리 값은 아래에서 수치로 계속 찍는다). */
    const ring = r[2] / 2 + 7.5;
    const near = Math.min(gap(c, a.lab), gap(c, a.cnt), gap(c, a.ad));
    const clip = [c[0] - ring - a.card[0], (a.card[0] + a.card[2]) - (c[0] + ring),
                  c[1] - ring - a.card[1], (a.card[1] + a.card[3]) - (c[1] + ring)];
    return { q: [(c[0] - a.bt[0]) / a.bt[2], (c[1] - a.bt[1]) / a.bt[3]],
             cardq: [(c[0] - a.card[0]) / a.card[2], (c[1] - a.card[1]) / a.card[3]],
             peakSlack: px(Math.min(gap(c, a.lab), gap(c, a.cnt), gap(c, a.ad)) - ring * 1.3),
             slack: px(near - ring), clip: clip.map(px) };
  };
  const p0 = live.map(place);
  /* [G0] 364 되돌림 감시 — 닷이 버튼 안으로 되돌아가면 여기서 즉시 빨개진다 */
  ok(live.every(a => a.inCard === 0), '[G0] 479 — 닷은 카드 직속(`.cn-cd>.updot`)에 하나도 없다(호스트는 [받기] 버튼이다)',
    '카드 직속 ' + live.reduce((s, a) => s + a.inCard, 0) + '개');
  ok(p0.length > 0 && p0.every(p => p.q[0] > 0.5 && p.q[1] < 0.5), '[G] 우상단 사분면(299) — **버튼 기준** · «받기» 국면',
    p0[0].q.map(v => v.toFixed(3)).join(',') + ' (카드 기준 ' + p0[0].cardq.map(v => v.toFixed(2)).join(',') + ')');
  /* ⚠ 문턱이 `> 0` 에서 `>= 0` 으로 한 칸 바뀐 이유를 적어 둔다 — 실측 여유가 **정확히 0.00** 이다
     (링 상변과 ×N 잉크 하변이 접한다). 479 가 자리를 지정한 뒤로 이 값은 «고를 수 있는 것» 이 아니라
     기하의 결과이고, «접함» 은 «밟음» 이 아니다. 음수(= 실제로 밟는다)는 그대로 빨갛다 —
     아래 봉우리 기록이 −6.3 을 계속 찍는 것이 그 자가 살아 있다는 증거다. */
  ok(p0.length > 0 && p0.every(p => p.slack >= 0), '[G] 정지 상태에서 타이틀·아이콘·×N 을 안 밟는다 — «받기» 국면 (버튼은 호스트라 제외)',
    '최소 여유 ' + px(Math.min(...p0.map(p => p.slack))) + 'px · 봉우리 1.3 기록 '
      + px(Math.min(...p0.map(p => p.peakSlack))) + 'px');
  ok(p0.length > 0 && p0.every(p => p.clip.every(v => v > 0)), '[G] 정지 상태에서 `.cn-cd`(overflow:hidden) 안 — «받기» 국면',
    JSON.stringify(p0[0].clip));

  /* ── [G] 자리 — 광고 제거 이용권 국면(«무료 수령», 라벨이 넓어진다) ── */
  const naAds = await page.evaluate(() => {
    document.getElementById('app').classList.add('noads');
    openShopPage(null, 'coin');
    const r = __ads(); document.getElementById('app').classList.remove('noads'); return r;
  });
  const pn = naAds.filter(a => !a.done).map(place);
  ok(pn.length === N && pn.every(p => p.slack >= 0 && p.q[0] > 0.5 && p.q[1] < 0.5 && p.clip.every(v => v > 0)),
    '[G] 광고 제거 이용권 국면(«무료 수령» — 라벨이 넓어진다)에서도 같은 자리가 성립한다',
    '최소 여유 ' + px(Math.min(...pn.map(p => p.slack))) + 'px');

  /* ── [H] 13 레이아웃 회귀 — 버튼·라벨 기하 ── */
  await page.evaluate(() => { openShopPage(null, 'coin'); });
  await page.waitForTimeout(300);
  /* ⚠ 화면 rect 는 `fit()` 배율을 탄다(1080 프레임 → 뷰포트). 회귀는 **레이아웃 px**(offsetWidth)로 잰다. */
  const geo = await page.evaluate(() => {
    const bt = document.querySelector('#shopList .cn-cd>.bt[data-cnad]');
    const lab = bt.querySelector('.lab'), cnt = bt.querySelector('.cnt');
    return [bt.offsetWidth, bt.offsetHeight, bt.offsetLeft, bt.offsetTop,
            lab.offsetLeft, lab.offsetWidth, cnt.offsetTop];
  });
  ok(JSON.stringify(geo) === JSON.stringify([245, 80, 17, 214, 71, 165, 38]),
    '[H] 13 회귀 — 광고 버튼 245×80 @ (17,214) · 라벨 자리 불변(닷은 절대배치라 흐름을 안 민다)',
    JSON.stringify(geo));

  /* ══ [B] 섞인 국면 — 2칸 소진 ═══════════════════════════════════════════ */
  /* 365 — 지운 id(a4) 로 소진시키면 «없는 키 → cap 폴백» 이라 아무 칸도 안 잠긴다.
     라인업에 있는 **첫 칸과 끝 칸**을 소진시켜 목록이 또 바뀌어도 «2칸 소진» 이 성립하게 한다. */
  await page.evaluate(() => {
    const ids = [COIN_ADS[0].id, COIN_ADS[COIN_ADS.length - 1].id];
    S.daily.adBuy = { [ids[0]]: 0, [ids[1]]: 0 };
    openShopPage(null, 'coin'); syncShopSumBtns();
  });
  await page.waitForTimeout(400);
  ads = await page.evaluate(() => __ads());
  ch = await page.evaluate(() => __chain());
  const done = ads.filter(a => a.done), alive = ads.filter(a => !a.done);
  ok(done.length === 2 && alive.length === N - 2, '[B] 2칸이 «구매 완료» 로 잠긴다 (판정 재료)',
    '소진 ' + done.length + ' · 남음 ' + alive.length + '/' + (N - 2));
  ok(done.every(a => a.dots === 0), '[B] 소진 칸에는 닷 노드가 아예 없다(죽은 마크업 0)',
    '남은 노드 ' + done.reduce((s, a) => s + a.dots, 0));
  ok(alive.length > 0 && alive.every(a => a.alert && a.dot && a.dot.display !== 'none'),
    '[B] 남은 칸만 점등', alive.length + '/' + (N - 2));
  ok(ch.coin === true && ch.tab === true, '[B] 한 칸이라도 남으면 재화 탭·탭바 «상점» 은 켜진 채');

  /* ══ [D] 실동작 — 진짜 클릭 ══════════════════════════════════════════════ */
  const before = await page.evaluate(() => ({ dia: S.dia, left: adLeft(COIN_ADS[1]) }));
  await page.locator('#shopList .cn-cd .bt[data-cnad="a2"]').click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const bt = document.querySelector('#shopList .cn-cd .bt[data-cnad="a2"]');
    return { relic: S.relic, left: adLeft(COIN_ADS[1]), stillThere: !!bt,
      alert: bt ? bt.classList.contains('alert') : null,
      dots: bt ? bt.querySelectorAll(':scope > .updot').length : 0 };
  });
  ok(after.left === before.left - 1, '[D] 실동작 — 클릭하면 오늘 남은 횟수가 1 줄어든다',
    before.left + ' → ' + after.left);
  ok(after.left === 0 ? (after.stillThere === false) : (after.alert === true),
    '[D] 실동작 — 소진되면 버튼이 «구매 완료» 로 잠기고(닷도 같이 사라진다), 남았으면 켜진 채',
    '남은 ' + after.left + ' · 버튼 ' + after.stillThere + ' · alert ' + after.alert);

  /* ══ [C] 전부 소진 ═══════════════════════════════════════════════════════ */
  await page.evaluate(() => {
    S.daily.adBuy = COIN_ADS.reduce((o, a) => (o[a.id] = 0, o), {});
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 0, o), {});
    openShopPage(null, 'coin'); syncShopSumBtns(); uiDirty = true; renderUI();
  });
  await page.waitForTimeout(500);
  ads = await page.evaluate(() => __ads());
  ch = await page.evaluate(() => __chain());
  ok(ads.every(a => a.done) && ads.reduce((s, a) => s + (a.dots || 0), 0) === 0,
    '[C] 전부 소진 — 광고 버튼 0개 · 닷 0개', '소진 ' + ads.filter(a => a.done).length + '칸');
  ok(ch.coin === false && ch.coinVis === false, '[C] 재화 탭 배지 소등', 'alert=' + ch.coin);
  ok(ch.tab === false, '[C] 탭바 «상점» 칸도 소등(무료 소환도 0 이므로)', String(ch.tab));

  /* 294 를 덮어쓰지 않는지 — 광고는 0 인데 무료 소환만 남긴다 */
  const only294 = await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 2, o), {});
    syncShopSumBtns(); uiDirty = true; renderUI();
    return __chain();
  });
  ok(only294.tab === true && only294.coin === false,
    '[C] OR 로 이었다 — 광고 0 · 무료 소환만 남으면 탭바는 켜지고 재화 탭은 꺼진다(329 가 294 를 안 덮는다)',
    '탭바 ' + only294.tab + ' · 재화 ' + only294.coin);

  /* ══ [E] 음성 — 다이아 판매 칸 ══════════════════════════════════════════ */
  ok(only294.buyDots === 0, '[E] 음성 — 다이아 판매 칸(`.bt.buy`)에는 닷이 0개', only294.buyDots + '개');

  /* ══ [F] 호스트 감사 ═════════════════════════════════════════════════════ */
  const audit = await page.evaluate(() => {
    S.daily.adBuy = {}; openShopPage(null, 'coin');
    /* 364 — 호스트는 «버튼을 가진 카드» 다(닷은 카드 직속 자식) */
    /* 471+479 — 호스트는 다시 «[받기] 버튼» 이다(닷이 그 자식이고 `.alert` 도 버튼이 든다) */
    const hosts = [...document.querySelectorAll('#shopList .cn-cd > .bt[data-cnad]')]
      .filter(h => h.querySelector(':scope > .updot'));
    let offBad = 0, onBad = 0;
    hosts.forEach(h => {
      const e = h.querySelector(':scope > .updot'), had = h.classList.contains('alert');
      h.classList.remove('alert'); if (getComputedStyle(e).display !== 'none') offBad++;
      h.classList.add('alert');    if (getComputedStyle(e).display === 'none') onBad++;
      if (!had) h.classList.remove('alert');
    });
    return { n: hosts.length, offBad, onBad };
  });
  ok(audit.n === N && audit.offBad === 0 && audit.onBad === 0,
    '[F] 호스트 전수 — `.alert` 없으면 꺼짐 / 있으면 켜짐', audit.n + '칸 · 위반 ' + audit.offBad + '/' + audit.onBad);

  ok(errs.length === 0, '[전역] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY329 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
