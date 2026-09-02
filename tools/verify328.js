#!/usr/bin/env node
/* 게이트 — 작업 328 「10 상점 소환 레드닷을 «상자 카드» 가 아니라 «10회 소환 n/n» 버튼으로」
 *          (저장소 주인 정정 2026-08-28 — «그 행에 뜨라는게 아니라 10회 소환 2/2 이 버튼에 빨간점 하라는거임»)
 *
 *   node tools/verify328.js
 *
 * 294 가 켠 판정(`sumFreeReady(b) = freeLeft(b) > 0`)은 **한 글자도 안 바꾼다** — 자리만 옮긴 작업이다.
 * 그래서 이 게이트가 지키는 것은 «켜지는가» 가 아니라 **«어디에 켜지는가»** 다.
 *
 *   [A] 자리 — 닷 중심이 그 카드의 `.cbtn.b1` **우상단 코너**에 ±0.6px 로 앉는다.
 *       ⚠ 되돌림 감시: 294 의 옛 값(카드 우상단 바깥 −7,−7)으로 되돌리면 코너 차가 −250px 넘게 벌어져 빨개진다.
 *   [B] 버튼 기준 299 규약 — 중심이 **버튼 상자**의 우상단 사분면(카드 사분면보다 강한 조건).
 *   [C] 안 잘림 — 60 쥬시 `jzDotIn` 봉우리(scale 1.3)에서도 카드 상자 안이고,
 *       라벨(«10회 소환») · 부제(«n/n») · 헤더 밴드 · 🔍 잉크를 안 밟는다(322 «봉우리에서 재라»).
 *   [D] 상자별 판정 유지 — 무료가 남은 상자만 켜진다(294 회귀). 화소로도 본다(«헛초록» 처방).
 *   [E] 음성 — 무료 0 이면 다이아가 1e12 여도 꺼진다(유료 10·30연은 점등 대상이 아니다).
 *   [F] 166 규약 — 부품은 `<s class="updot">` 하나 · 점등은 호스트 `.alert` 로만.
 *       ⚠ `#shopw s{display:inline-block}`(ID 급) 스코프 짝이 없으면 상시 점등이 된다.
 *   [G] «도감 완성» 칸 — 무료 버튼이 유료 소환으로 떨어지는 국면(index.html 25121)이라
 *       딤(`.clk`)이 닷을 **덮어야** 한다(321 «레드닷 = 지금 누를 수 있다» 약속).
 *   [H] 102·136 회귀 — 배지를 옮겨도 `.cbtn` 3종의 rect 가 한 픽셀도 안 움직인다.
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

/* 화소 — bbox 안 «빨강» 수. 안 보이면 0 이다(292 «열렸는가 ≠ 보이는가»). */
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

/* 페이지 안 계측기 — 잉크 bbox 는 Range 로(글자 상자가 아니라 실제 글리프) */
const MEAS = `
window.__ink = function(el){ if(!el) return null; const r=document.createRange(); r.selectNodeContents(el);
  const b=r.getBoundingClientRect(); return [b.left,b.top,b.width,b.height]; };
window.__cards = function(){
  return [...document.querySelectorAll('#shopList .shp-card')].map(c => {
    const b1 = c.querySelector('.cbtn.b1'), d = c.querySelector(':scope > .updot');
    const cr = c.getBoundingClientRect(), br = b1.getBoundingClientRect();
    let dot = null;
    if(d){ const prev=d.style.animation; d.style.animation='none';
      const dr=d.getBoundingClientRect(); d.style.animation=prev;
      dot = { rect:[dr.left,dr.top,dr.width,dr.height], display:getComputedStyle(d).display,
              pe:getComputedStyle(d).pointerEvents, z:+getComputedStyle(d).zIndex };
    }
    return { alert:c.classList.contains('alert'), card:[cr.left,cr.top,cr.width,cr.height],
      b1:[br.left,br.top,br.width,br.height], dot,
      lab:__ink(b1.querySelector('.lab')), sub:__ink(b1.querySelector('.sub')),
      chd:(e=>e?e.getBoundingClientRect():null)(c.querySelector('.chd')),
      cmag:(e=>e?e.getBoundingClientRect():null)(c.querySelector('.cmag')),
      locked:!!c.querySelector('.clk'),
      clkZ:(e=>e?+getComputedStyle(e).zIndex:null)(c.querySelector('.clk')),
      btns:[...c.querySelectorAll('.cbtn[data-shsum]')].map(b=>{const r=b.getBoundingClientRect();
        return [Math.round(r.left*100)/100,Math.round(r.top*100)/100,Math.round(r.width*100)/100,Math.round(r.height*100)/100];}) };
  });
};`;

/* 중심 → 잉크 상자 최근접점 거리(닷은 원이다 — 322 처방) */
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

  /* ══ 전부 무료 2회 — 켜진 국면 ══════════════════════════════════════════ */
  await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 2, o), {});
    openShopPage(null, 'summon'); renderShopPage(); syncShopSumBtns();
  });
  await page.waitForTimeout(700);
  const on = await page.evaluate(() => __cards());

  ok(on.length > 0, '[D] 소환 카드가 그려졌다 (판정 재료)', on.length + '칸');
  ok(on.every(c => c.alert), '[D] 무료가 남은 상자는 전부 `.alert`', on.filter(c => c.alert).length + '/' + on.length);
  ok(on.every(c => c.dot && c.dot.display !== 'none'),
    '[F] 부품 `<s class="updot">` 가 카드마다 하나 · 보인다 (#shopw 스코프 짝 되돌림 감시)',
    on.filter(c => c.dot && c.dot.display !== 'none').length + '/' + on.length);
  ok(on.every(c => c.dot && c.dot.pe === 'none'), '[F] 닷은 `pointer-events:none` — 버튼 히트를 안 가로챈다');

  /* ── [A] 자리 — 버튼 우상단 코너 ── */
  const corner = on.map(c => {
    const cx = c.dot.rect[0] + c.dot.rect[2] / 2, cy = c.dot.rect[1] + c.dot.rect[3] / 2;
    return [px(cx - (c.b1[0] + c.b1[2])), px(cy - c.b1[1])];
  });
  /* ⚑ 471(2026-08-30, 주인 보고) 이관 — 328 은 «중심이 버튼 코너에 **정확히**» 였다(허용 ±0.6).
     471 규약은 그 코너에서 **안쪽으로 `--dot-in`**(= 주인이 기준으로 지목한 [모두 받기] 실측 11px)
     이므로 기대값을 그만큼 옮긴다. **허용 오차는 한 칸도 안 넓혔다**(±0.6 그대로) — 자리를 무르게
     푼 것이 아니라 «어느 점에 앉는가» 한 값만 이동한 것이다. 규약값은 상수로 적지 않고
     `--dot-in` 을 제품에게 물어서 쓴다(상수를 두 곳에 적으면 402 «표는 뒤처진다» 가 된다). */
  const inset = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dot-in')));
  ok(corner.every(d => Math.abs(d[0] + inset) <= 0.6 && Math.abs(d[1] - inset) <= 0.6),
    '[A] 닷 중심이 «10회 소환 n/n» 버튼 우상단 코너에서 안쪽 --dot-in (471 규약)',
    JSON.stringify(corner[0]) + ' · 규약 ' + inset + ' (전 칸 최대 어긋남 '
      + px(Math.max(...corner.map(d => Math.max(Math.abs(d[0] + inset), Math.abs(d[1] - inset))))) + 'px)');

  /* ── [B] 버튼 기준 299 사분면 ── */
  const quad = on.map(c => {
    const cx = c.dot.rect[0] + c.dot.rect[2] / 2, cy = c.dot.rect[1] + c.dot.rect[3] / 2;
    return [(cx - c.b1[0]) / c.b1[2], (cy - c.b1[1]) / c.b1[3]];
  });
  ok(quad.every(q => q[0] > 0.5 && q[1] < 0.5), '[B] 버튼 상자 기준 우상단 사분면(299)',
    quad[0].map(v => v.toFixed(3)).join(','));

  /* ── [C] 봉우리(1.3) 에서 안 잘리고 안 밟는다 ── */
  const worst = on.map(c => {
    const r = c.dot.rect, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    const ring = (r[2] / 2 + 7.5) * 1.3;
    const inks = [c.lab, c.sub,
      c.chd && [c.chd.left, c.chd.top, c.chd.width, c.chd.height],
      c.cmag && [c.cmag.left, c.cmag.top, c.cmag.width, c.cmag.height]];
    const near = Math.min(...inks.map(b => gap([cx, cy], b)));
    const clip = [cx - ring - c.card[0], (c.card[0] + c.card[2]) - (cx + ring),
                  cy - ring - c.card[1], (c.card[1] + c.card[3]) - (cy + ring)];
    return { slack: px(near - ring), clip: clip.map(px) };
  });
  ok(worst.every(w => w.slack > 0), '[C] 등장 1.3 배율에서도 라벨·부제·헤더·🔍 잉크를 안 밟는다',
    '최소 여유 ' + px(Math.min(...worst.map(w => w.slack))) + 'px');
  ok(worst.every(w => w.clip.every(v => v > 0)), '[C] 등장 1.3 배율에서도 카드 상자 안',
    JSON.stringify(worst[0].clip));

  /* ── [D] 화소 — 실제로 빨간 점이 찍힌다 ── */
  const red0 = await redAt(page, on[0].dot.rect);
  ok(red0 > 200, '[D] 화소 — 첫 상자 닷 자리에 빨강이 실제로 찍힌다', red0 + 'px');

  /* ══ 상자별 — 첫 상자만 남긴다 ══════════════════════════════════════════ */
  await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x, i) => (o[x.b] = i === 0 ? 1 : 0, o), {});
    uiDirty = true; renderUI(); renderShopPage(); syncShopSumBtns();
  });
  await page.waitForTimeout(500);
  const one = await page.evaluate(() => __cards());
  ok(one.filter(c => c.alert).length === 1 && one[0].alert,
    '[D] 상자별 판정 — 첫 상자만 남기면 그 버튼 하나만 켜진다(294 회귀)',
    'alert ' + one.filter(c => c.alert).length + '칸');
  const redOff = await redAt(page, one[1].dot.rect);
  ok(redOff === 0, '[D] 화소 — 꺼진 상자 자리에는 빨강이 0 이다', redOff + 'px');

  /* ══ [E] 음성 — 무료 0 · 다이아 1e12 ══════════════════════════════════ */
  await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 0, o), {});
    S.dia = 1e12; uiDirty = true; renderUI(); renderShopPage(); syncShopSumBtns();
  });
  await page.waitForTimeout(500);
  const off = await page.evaluate(() => ({
    cards: __cards(), tab: document.querySelector('.tab[data-t="shop"]').classList.contains('alert'),
    cat: document.querySelector('#shopCats .stab[data-cat="summon"]').classList.contains('alert') }));
  ok(off.cards.every(c => !c.alert), '[E] 음성 — 무료 0 이면 다이아 1e12 여도 전부 꺼진다',
    'alert ' + off.cards.filter(c => c.alert).length + '칸');
  ok(off.cat === false, '[E] 음성 — 소환 카테고리 탭 배지도 꺼진다');
  const redAll = await redAt(page, off.cards[0].dot.rect);
  ok(redAll === 0, '[E] 화소 — 꺼진 국면에 빨강 0', redAll + 'px');

  /* ══ [F] 호스트 감사 — `.alert` 를 떼면 꺼지고 붙이면 켜진다 ══════════════ */
  const audit = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('#shopList .shp-card')].filter(h => h.querySelector('.updot'));
    let offBad = 0, onBad = 0;
    hosts.forEach(h => {
      const e = h.querySelector('.updot'), had = h.classList.contains('alert');
      h.classList.remove('alert'); if (getComputedStyle(e).display !== 'none') offBad++;
      h.classList.add('alert');    if (getComputedStyle(e).display === 'none') onBad++;
      if (!had) h.classList.remove('alert');
    });
    return { n: hosts.length, offBad, onBad };
  });
  ok(audit.n > 0 && audit.offBad === 0 && audit.onBad === 0,
    '[F] 호스트 전수 — `.alert` 없으면 꺼짐 / 있으면 켜짐', audit.n + '칸 · 위반 ' + audit.offBad + '/' + audit.onBad);

  /* ══ [G] «최대치 달성» 칸 — 딤이 닷을 덮는다 ══════════════════════════════ */
  /* 720 이관 — 이 칸의 이름이 «도감 완성» 에서 «최대치 달성» 으로 바뀌었다(주인 지시 2026-09-02).
     [G] 가 재는 성질(«잠기면 딤이 닷을 덮는가» = z 관계)은 이름과 무관하지만, 주입 표본은
     제품이 실제로 찍는 문자열이어야 «죽은 표본» 이 안 된다(334 처방). */
  /* ⚠ 잠금 국면을 «상태로» 만들 수는 없다 — `maxLv()` 가 최고 등급 장비에 Infinity 를 주므로
     `allMaxed()` 가 그 상자에서는 영원히 거짓이다(20889). 그래서 renderShopPage 가 찍는 것과
     **같은 노드**(`<div class="clk">`)를 그 자리에 직접 넣고 z 겨루기만 잰다 — 이 게이트가 지키려는
     성질은 «잠기면 딤이 닷을 덮는가» 하나이고, 그 성질은 노드 두 개의 z 관계가 전부다. */
  const locked = await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 2, o), {});
    uiDirty = true; renderShopPage(); syncShopSumBtns();
    const c = document.querySelector('#shopList .shp-card');
    c.insertAdjacentHTML('beforeend', '<div class="clk">' + MAXED_TXT + ' 🏆</div>');
    const d = c.querySelector(':scope > .updot'), clk = c.querySelector('.clk');
    const dr = d.getBoundingClientRect(), kr = clk.getBoundingClientRect();
    /* 닷이 딤 상자 안에 있어야 «덮인다» 가 성립한다(딤은 inset:7px) */
    const inside = dr.left >= kr.left && dr.top >= kr.top
      && dr.left + dr.width <= kr.left + kr.width && dr.top + dr.height <= kr.top + kr.height;
    return { locked: !!clk, inside, dz: +getComputedStyle(d).zIndex, cz: clk ? +getComputedStyle(clk).zIndex : null };
  });
  ok(locked.locked === true && locked.inside === true,
    '[G] 잠금 딤(`.clk`, inset 7px)의 상자 안에 닷이 들어온다 (294 의 카드 바깥 코너였다면 안 덮인다)',
    'inside=' + locked.inside);
  ok(locked.cz > locked.dz, '[G] 잠금 딤(`.clk`)이 닷 위에 온다 — 못 누르는 버튼에 «누를 수 있다» 를 안 남긴다',
    'clk z' + locked.cz + ' > updot z' + locked.dz);

  /* ══ [H] 102·136 회귀 — 버튼 rect 불변 ══════════════════════════════════ */
  const EXP = { b1: [770, 312, 200, 98], b2: [526, 428, 208, 127], b3: [767, 428, 206, 127] };
  const rects = (await page.evaluate(() => __cards()))[1].btns;   /* 잠기지 않은 둘째 카드 */
  const dy = rects[0][1] - EXP.b1[1];
  const okRect = rects.length === 3
    && Math.abs(rects[0][0] - EXP.b1[0]) < .5 && Math.abs(rects[0][2] - EXP.b1[2]) < .5 && Math.abs(rects[0][3] - EXP.b1[3]) < .5
    && Math.abs(rects[1][0] - EXP.b2[0]) < .5 && Math.abs(rects[1][2] - EXP.b2[2]) < .5 && Math.abs(rects[1][3] - EXP.b2[3]) < .5
    && Math.abs(rects[2][0] - EXP.b3[0]) < .5 && Math.abs(rects[2][2] - EXP.b3[2]) < .5 && Math.abs(rects[2][3] - EXP.b3[3]) < .5
    && Math.abs((rects[1][1] - rects[0][1]) - (EXP.b2[1] - EXP.b1[1])) < .5
    && Math.abs((rects[2][1] - rects[0][1]) - (EXP.b3[1] - EXP.b1[1])) < .5;
  ok(okRect, '[H] 102·136 회귀 — `.cbtn` 3종 기하 불변(배지는 카드 자식이라 버튼을 안 건드린다)',
    JSON.stringify(rects) + ' (카드 오프셋 dy' + px(dy) + ')');

  ok(errs.length === 0, '[전역] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY328 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
