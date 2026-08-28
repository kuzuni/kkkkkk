/* 작업 328·329·330 — «버튼 레드닷» 3자리 실측 (자리 선택 근거).
 *
 *   node tools/probe328.js
 *
 * 세 자리는 전부 «호스트 버튼이 무엇에 잘리는가 / 안쪽 우상단이 비어 있는가» 가 갈림길이다.
 * 322 가 남긴 «버튼마다 다시 재라» 교훈대로, 규약(12,12 / −9,−9)을 베끼기 전에 잉크를 잰다.
 *
 *   328  10 상점 소환 카드 «10회 소환 n/n» 버튼 `.cbtn.b1`   — `.cbtn{overflow:hidden}`
 *   329  13 재화 탭 광고 상품 «받기» 버튼 `.cn-cd>.bt`        — `.cn-cd{overflow:hidden}`
 *   330  89 유물 페이지 수반 `#rwBasin`                        — 클립 없음 / `.rw-cost` 가 아래를 먹는다
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const px = n => Math.round(n * 100) / 100;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* 페이지 안에서 쓸 공용 계측기 — 잉크 bbox 는 Range 로 잰다(글자 상자가 아니라 실제 글리프 폭) */
const MEAS = `
window.__ink = function(el){
  if(!el) return null;
  const r = document.createRange(); r.selectNodeContents(el);
  const b = r.getBoundingClientRect(); r.detach && r.detach();
  return [Math.round(b.left*100)/100, Math.round(b.top*100)/100,
          Math.round(b.width*100)/100, Math.round(b.height*100)/100];
};
window.__geo = function(el){
  if(!el) return null;
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const bw = parseFloat(cs.borderTopWidth) || 0;
  return { rect:[Math.round(r.left*100)/100, Math.round(r.top*100)/100,
                 Math.round(r.width*100)/100, Math.round(r.height*100)/100],
           bw, ov: cs.overflow, pad:[Math.round((r.width-bw*2)*100)/100, Math.round((r.height-bw*2)*100)/100] };
};`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(MEAS);
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* ───────── 328 — 10 상점 소환 탭 `.cbtn.b1` ───────── */
  const m328 = await page.evaluate(() => {
    openShopPage(null, 'summon');
    const card = document.querySelector('#shopList .shp-card');
    const b1 = card.querySelector('.cbtn.b1');
    const cr = card.getBoundingClientRect();
    return { card: __geo(card), b1: __geo(b1),
      lab: __ink(b1.querySelector('.lab')), sub: __ink(b1.querySelector('.sub')),
      ad: __geo(card.querySelector('.adbadge')),
      /* 카드 기준 버튼 좌표 */
      b1InCard: [Math.round((b1.getBoundingClientRect().left - cr.left) * 100) / 100,
                 Math.round((b1.getBoundingClientRect().top - cr.top) * 100) / 100] };
  });
  console.log('\n[328] 10 상점 «10회 소환 n/n» 버튼');
  console.log('   카드 ' + JSON.stringify(m328.card.rect) + ' overflow=' + m328.card.ov);
  console.log('   .cbtn.b1 ' + JSON.stringify(m328.b1.rect) + ' 검정' + m328.b1.bw
    + ' 패딩상자 ' + JSON.stringify(m328.b1.pad) + ' overflow=' + m328.b1.ov);
  console.log('   카드기준 버튼 좌상단 ' + JSON.stringify(m328.b1InCard));
  console.log('   .lab 잉크 ' + JSON.stringify(m328.lab) + '  .sub 잉크 ' + JSON.stringify(m328.sub));
  console.log('   .adbadge ' + JSON.stringify(m328.ad.rect));
  {
    const b = m328.b1.rect, bw = m328.b1.bw, lab = m328.lab;
    const padR = b[0] + b[2] - bw;                       /* 패딩 상자 우변 */
    const freeW = px(padR - (lab[0] + lab[2]));          /* 라벨 잉크 오른쪽으로 남는 폭 */
    console.log('   ▶ 라벨 오른쪽 남는 폭 = ' + freeW + 'px (닷 27 + 링 7.5×2 = 42 필요)');
    ok(m328.b1.ov === 'hidden', '[328-1] `.cbtn` 은 overflow:hidden 이다(바깥 코너 불가)', 'overflow=' + m328.b1.ov);
    ok(freeW < 42, '[328-2] 안쪽 우상단은 42px 이 안 나온다 → 바깥 코너로 나가야 한다', freeW + 'px');
    ok(m328.card.ov !== 'hidden', '[328-3] 카드는 안 자른다 → 닷을 카드 자식으로 두면 안 잘린다', 'overflow=' + m328.card.ov);
  }

  /* ───────── 329 — 13 재화 탭 `.cn-cd>.bt[data-cnad]` ───────── */
  const m329 = await page.evaluate(() => {
    openShopPage(null, 'coin');
    const cd = document.querySelector('#shopList .cn-cd');
    const bt = cd.querySelector('.bt[data-cnad]');
    const cr = cd.getBoundingClientRect(), br = bt.getBoundingClientRect();
    return { cd: __geo(cd), bt: __geo(bt),
      lab: __ink(bt.querySelector('.lab')), cnt: __ink(bt.querySelector('.cnt')),
      ad: __geo(bt.querySelector('.ad')),
      btInCard: [Math.round((br.left - cr.left) * 100) / 100, Math.round((br.top - cr.top) * 100) / 100],
      n: document.querySelectorAll('#shopList .cn-cd .bt[data-cnad]').length };
  });
  console.log('\n[329] 13 재화 탭 광고 상품 «받기» 버튼 (' + m329.n + '칸)');
  console.log('   .cn-cd ' + JSON.stringify(m329.cd.rect) + ' overflow=' + m329.cd.ov);
  console.log('   .bt ' + JSON.stringify(m329.bt.rect) + ' 검정' + m329.bt.bw
    + ' 패딩상자 ' + JSON.stringify(m329.bt.pad) + ' overflow=' + m329.bt.ov);
  console.log('   카드기준 버튼 좌상단 ' + JSON.stringify(m329.btInCard));
  console.log('   .lab 잉크 ' + JSON.stringify(m329.lab) + '  .cnt 잉크 ' + JSON.stringify(m329.cnt));
  console.log('   .ad 뱃지 ' + JSON.stringify(m329.ad.rect));
  {
    const b = m329.bt.rect, bw = m329.bt.bw, lab = m329.lab;
    const padR = b[0] + b[2] - bw;
    const freeW = px(padR - (lab[0] + lab[2]));
    const cd = m329.cd.rect;
    const outR = px(b[0] + b[2] + 13.5 + 7.5 - (cd[0] + cd[2]));   /* 바깥 코너 닷 링이 카드를 넘는 양 */
    console.log('   ▶ 라벨 오른쪽 남는 폭 = ' + freeW + 'px / 바깥 코너 링이 카드를 넘는 양 = ' + outR + 'px');
    ok(m329.cd.ov === 'hidden', '[329-1] `.cn-cd` 는 overflow:hidden — 카드 밖으로 못 나간다', 'overflow=' + m329.cd.ov);
    ok(outR > 0, '[329-2] 바깥 코너(−9,−9)는 카드에 잘린다', '+' + outR + 'px 초과');
    ok(freeW >= 42, '[329-3] 안쪽 우상단이 42px 이상 비어 있다', freeW + 'px');
  }

  /* ───────── 330 — 89 유물 페이지 `#rwBasin` ───────── */
  const m330 = await page.evaluate(() => {
    document.querySelectorAll('#shopw').forEach(w => w.classList.remove('on'));
    openRelw();
    const bs = document.getElementById('rwBasin');
    const mid = document.querySelector('.rw-mid');
    const mr = mid.getBoundingClientRect(), br = bs.getBoundingClientRect();
    return { basin: __geo(bs), mid: __geo(mid), cost: __geo(document.getElementById('rwCost')),
      stone: __geo(bs.querySelector('.rw-stone')), lab: __ink(bs.querySelector('b')),
      basinInMid: [Math.round((br.left - mr.left) * 100) / 100, Math.round((br.top - mr.top) * 100) / 100],
      /* #relw 의 ID 급 `s{display:inline-block}` 특이성 함정 확인 */
      sRule: (() => { let hit = 0; for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch (e) { continue; }
        for (const r of rs) if (r.selectorText && /#relw\s+s\b/.test(r.selectorText)) hit++; } return hit; })() };
  });
  console.log('\n[330] 89 유물 수반 «유물 소환» 버튼');
  console.log('   #rwBasin ' + JSON.stringify(m330.basin.rect) + ' overflow=' + m330.basin.ov);
  console.log('   .rw-mid ' + JSON.stringify(m330.mid.rect) + ' overflow=' + m330.mid.ov);
  console.log('   .rw-stone ' + JSON.stringify(m330.stone.rect) + '  라벨 잉크 ' + JSON.stringify(m330.lab));
  console.log('   #rwCost ' + JSON.stringify(m330.cost.rect));
  console.log('   .rw-mid 기준 수반 좌상단 ' + JSON.stringify(m330.basinInMid));
  console.log('   #relw s{…} ID 급 규칙 = ' + m330.sRule + '개');
  {
    const b = m330.basin.rect;
    /* SVG 수반의 «그릇 테두리» 는 y 4..64 에 폭 32..368 — 우상단 코너 (400,0) 근처는 투명이다.
       그래서 코너에 앉히면 허공에 뜬다. 그릇 림(타원) 오른쪽 끝 x368 을 기준으로 잡는다. */
    console.log('   ▶ 수반 400×216 — 그릇 림은 x32..368 / y4..64, 우상단 코너는 투명');
    ok(m330.sRule > 0, '[330-1] `#relw s{…}` ID 급 규칙이 있다 → 스코프 짝 필수', m330.sRule + '개');
    ok(m330.basin.ov !== 'hidden', '[330-2] `#rwBasin` 은 안 자른다', 'overflow=' + m330.basin.ov);
    ok(b[2] === 400 && b[3] === 216, '[330-3] 수반 400×216', JSON.stringify(b));
  }

  /* ───────── 실제로 앉힌 닷 — 322 가 남긴 «봉우리 배율에서 재라» 검사 ─────────
     닷은 원이므로 상자 겹침이 아니라 «중심 → 잉크 상자 최근접점» 거리를 반지름×1.3 과 견준다.
     `jzDotIn` 0→1.3→1 · `jzDotPulse` 1.14 가 이 닷들에 영구히 걸린다(11073). */
  await page.addInitScript(`window.__dot = function(host, inks, clip){
    const h = host.getBoundingClientRect();
    const d = host.querySelector(':scope > .updot') || host.querySelector('.updot');
    if(!d) return { missing:true };
    const prev = d.style.animation; d.style.animation = 'none';
    const r = d.getBoundingClientRect(); d.style.animation = prev;
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const ring = r.width/2 + 7.5;                       /* 닷 반지름 + 바깥 링 7.5 */
    const near = inks.filter(Boolean).map(b => {
      const dx = Math.max(b[0]-cx, 0, cx-(b[0]+b[2])), dy = Math.max(b[1]-cy, 0, cy-(b[1]+b[3]));
      return Math.round(Math.hypot(dx,dy)*100)/100; });
    return { cx:Math.round(cx*100)/100, cy:Math.round(cy*100)/100, ring,
      q:[ (cx-h.left)/h.width, (cy-h.top)/h.height ],
      near, slack: Math.round((Math.min.apply(null, near.concat([1e9])) - ring*1.3)*100)/100,
      clipOut: clip ? [Math.round((cx-ring*1.3 - clip[0])*100)/100,
                       Math.round((clip[0]+clip[2] - (cx+ring*1.3))*100)/100,
                       Math.round((cy-ring*1.3 - clip[1])*100)/100,
                       Math.round((clip[1]+clip[3] - (cy+ring*1.3))*100)/100] : null,
      vis: getComputedStyle(d).display };
  };`);
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  const d328 = await page.evaluate(() => {
    S.daily.freeSum = SHOP_BOXES.reduce((o, x) => (o[x.b] = 2, o), {});
    openShopPage(null, 'summon'); renderShopPage();
    const card = document.querySelector('#shopList .shp-card'), b1 = card.querySelector('.cbtn.b1');
    const br = b1.getBoundingClientRect(), cr = card.getBoundingClientRect();
    const r = __dot(card, [__ink(b1.querySelector('.lab')), __ink(b1.querySelector('.sub')),
                           __geo(card.querySelector('.chd')) && (b => [b[0],b[1],b[2],b[3]])(__geo(card.querySelector('.chd')).rect),
                           __geo(card.querySelector('.cmag')).rect],
                    [cr.left, cr.top, cr.width, cr.height]);
    /* 버튼 우상단 코너와의 어긋남 — 328 의 지시 자체다 */
    r.dCorner = [Math.round((r.cx - (br.left + br.width)) * 100) / 100, Math.round((r.cy - br.top) * 100) / 100];
    r.qBtn = [(r.cx - br.left) / br.width, (r.cy - br.top) / br.height];
    return r;
  });
  console.log('\n[328-닷] 중심 ' + d328.cx + ',' + d328.cy + ' · 버튼 코너와의 차 ' + JSON.stringify(d328.dCorner)
    + ' · 버튼 사분면 ' + d328.qBtn.map(v => v.toFixed(3)).join(',') + ' · 여유 ' + d328.slack + 'px'
    + ' · 카드 클립 여유 ' + JSON.stringify(d328.clipOut) + ' · display=' + d328.vis);
  ok(Math.abs(d328.dCorner[0]) < 0.6 && Math.abs(d328.dCorner[1]) < 0.6,
    '[328-4] 닷 중심이 «10회 소환» 버튼 우상단 코너에 정확히 앉는다', JSON.stringify(d328.dCorner));
  ok(d328.qBtn[0] > 0.5 && d328.qBtn[1] < 0.5, '[328-5] 버튼 기준으로도 우상단 사분면(299)', d328.qBtn.map(v => v.toFixed(3)).join(','));
  ok(d328.slack > 0, '[328-6] 등장 1.3 배율에서도 라벨·헤더·🔍 잉크를 안 밟는다', '여유 ' + d328.slack + 'px');
  ok(d328.clipOut.every(v => v > 0), '[328-7] 1.3 배율에서도 카드 안', JSON.stringify(d328.clipOut));

  for (const noads of [false, true]) {
    const d329 = await page.evaluate((na) => {
      document.getElementById('app').classList.toggle('noads', na);
      openShopPage(null, 'coin');
      const cd = document.querySelector('#shopList .cn-cd'), bt = cd.querySelector('.bt[data-cnad]');
      const cr = cd.getBoundingClientRect();
      const r = __dot(bt, [__ink(bt.querySelector('.lab')), __ink(bt.querySelector('.cnt')), __geo(bt.querySelector('.ad')).rect],
                      [cr.left, cr.top, cr.width, cr.height]);
      const brr = bt.getBoundingClientRect();
      r.qBtn = [(r.cx - brr.left) / brr.width, (r.cy - brr.top) / brr.height];
      r.lab = __ink(bt.querySelector('.lab'));
      document.getElementById('app').classList.remove('noads');
      return r;
    }, noads);
    const tag = noads ? '광고제거 ON(«무료 수령»)' : '기본(«받기»)';
    console.log('\n[329-닷 ' + tag + '] 중심 ' + d329.cx + ',' + d329.cy + ' · 사분면 '
      + d329.qBtn.map(v => v.toFixed(3)).join(',') + ' · 잉크까지 ' + JSON.stringify(d329.near)
      + ' · 여유 ' + d329.slack + 'px · 카드 클립 여유 ' + JSON.stringify(d329.clipOut) + ' · display=' + d329.vis);
    ok(d329.qBtn[0] > 0.5 && d329.qBtn[1] < 0.5, '[329-4] 우상단 사분면(299) — ' + tag, d329.qBtn.map(v => v.toFixed(3)).join(','));
    ok(d329.slack > 0, '[329-5] 등장 1.3 배율에서도 라벨·(n/n)·▶AD 를 안 밟는다 — ' + tag, '여유 ' + d329.slack + 'px');
    ok(d329.clipOut.every(v => v > 0), '[329-6] 1.3 배율에서도 카드(overflow:hidden) 안 — ' + tag, JSON.stringify(d329.clipOut));
  }

  const d330 = await page.evaluate(() => {
    closeShopPage(); S.relic = 1e6; openRelw();
    const bs = document.getElementById('rwBasin');
    const r = __dot(bs, [__ink(bs.querySelector('b')), __geo(document.getElementById('rwCost')).rect]);
    const br = bs.getBoundingClientRect();
    r.inBasin = [Math.round((r.cx - br.left) * 100) / 100, Math.round((r.cy - br.top) * 100) / 100];
    return r;
  });
  console.log('\n[330-닷] 수반기준 중심 ' + JSON.stringify(d330.inBasin) + ' · 사분면 '
    + d330.q.map(v => v.toFixed(3)).join(',') + ' · 잉크까지 ' + JSON.stringify(d330.near)
    + ' · 여유 ' + d330.slack + 'px · display=' + d330.vis);
  ok(d330.q[0] > 0.5 && d330.q[1] < 0.5, '[330-4] 우상단 사분면(299)', d330.q.map(v => v.toFixed(3)).join(','));
  ok(d330.slack > 0, '[330-5] 등장 1.3 배율에서도 «유물 소환» 라벨·코스트 알약을 안 밟는다', '여유 ' + d330.slack + 'px');
  ok(d330.inBasin[0] >= 336 && d330.inBasin[0] <= 372 && d330.inBasin[1] <= 56,
    '[330-6] 그릇 림(x32..368 · y4..64) 오른쪽 끝에 물린다 — 투명한 코너에 안 뜬다', JSON.stringify(d330.inBasin));

  console.log('\nPROBE328 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
