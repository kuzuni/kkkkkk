#!/usr/bin/env node
/* 게이트 — 작업 364 「13 재화 탭 광고 상품 레드닷을 «버튼 안» 에서 **카드 우상단**으로」
 *          (저장소 주인 보고 2026-08-29 — «광고 상품에 빨간점 위치가 어정쩡함. 스샷찍고 바꾸쇼»)
 *
 *   node tools/verify364.js
 *
 * 지키는 성질: **닷은 카드의 우상단 사분면에 있고(299), 어느 잉크도 안 밟으며, 잘리지 않는다.**
 *   [A] 호스트 — 노드는 `.cn-cd` 직속 자식 · 버튼(`.bt`) 안에는 0개(329 자리로 되돌아가면 빨강)
 *   [B] 299 — 중심이 **카드** 우상단 사분면. ⚠ 수리 전 자리는 카드 기준 (226,229) = **우하단**이었다
 *       (`tools/probe364.js` 재현). 그래서 이 항은 «옮겼다» 가 아니라 «규약을 처음 지킨다» 는 뜻이다.
 *   [C] 겹침 — 등장 봉우리 1.3(`jzDotIn`)에서도 타이틀 잉크·아이콘·×N·버튼 상자와 겹침 0px
 *   [D] 잘림 — 같은 봉우리에서 `.cn-cd{overflow:hidden;border-radius:35px}` 안. 둥근 모서리까지 본다
 *       (코너에 두면 329 가 실측한 5.24px 이 잘린다 — 그래서 헤더 띠 아래로 내렸다)
 *   [E] 화소 — 그 자리에 빨강이 실제로 찍힌다(«CSS 는 맞는데 안 보인다» 를 막는다)
 *   [F] 판정 불변 — 자리만 옮겼다. 받을 수 있으면 켜지고 소진하면 꺼진다(329 계약)
 *   [R] 되돌림 시험 — 자리를 옛 값(버튼 안 right4/top10)으로 되돌리면 [B] 가 **빨개진다**.
 *       이 항이 없으면 «무르게 푼 게이트» 다(334 교훈).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → 기하» 판정이라 비평가를 띄우지 않는다.
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

const MEAS = `
window.__dots = function(){
  /* 광고 칸은 렌더 순서상 맨 앞 COIN_ADS.length 개다(§7 다이아 판매 칸도 같은 .cn-cd 를 쓴다).
     (백틱 금지 — 이 블록은 템플릿 문자열 안이다.) */
  var ink = function(el){ if(!el) return null; var r=document.createRange(); r.selectNodeContents(el);
    var b=r.getBoundingClientRect(); return [b.left,b.top,b.width,b.height]; };
  var box = function(el){ if(!el) return null; var r=el.getBoundingClientRect(); return [r.left,r.top,r.width,r.height]; };
  return [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length).map(function(cd, i){
    var d = cd.querySelector(':scope > .updot');
    var cr = cd.getBoundingClientRect();
    var dot = null;
    if(d){ var pa=d.style.animation; d.style.animation='none';
      var dr=d.getBoundingClientRect(); d.style.animation=pa;
      dot = { rect:[dr.left,dr.top,dr.width,dr.height], display:getComputedStyle(d).display,
              pe:getComputedStyle(d).pointerEvents, parent:d.parentElement.className }; }
    return { id: COIN_ADS[i] && COIN_ADS[i].id, name: COIN_ADS[i] && COIN_ADS[i].n,
      alert: cd.classList.contains('alert'), done: cd.classList.contains('done'),
      inBt: cd.querySelectorAll('.bt .updot').length, dot: dot,
      card:[cr.left,cr.top,cr.width,cr.height],
      title: ink(cd.querySelector('.hd>i')), icon: box(cd.querySelector('.pn .cic') || cd.querySelector('.pn>em')),
      qt: ink(cd.querySelector('.qt')), bt: box(cd.querySelector(':scope > .bt')),
      radius: parseFloat(getComputedStyle(cd).borderTopRightRadius) || 0,
      overflow: getComputedStyle(cd).overflow };
  });
};`;

/* 봉우리 1.3 · 외곽 링 7.5 를 포함한 닷의 실제 잉크 상자 */
const peak = r => {
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2, k = 1.3;
  const hw = (r[2] / 2 + 7.5) * k, hh = (r[3] / 2 + 7.5) * k;
  return [cx - hw, cy - hh, hw * 2, hh * 2];
};
const overlap = (a, b) => {
  if (!a || !b) return 0;
  const ox = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const oy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return ox > 0 && oy > 0 ? Math.min(ox, oy) : 0;
};

async function redAt(page, rect) {
  const [x, y, w, h] = rect;
  if (!(w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= W && y + h <= H)) return 0;
  const buf = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) } });
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 130) n++;
    return n;
  }, buf.toString('base64'));
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 5000, best: 30 })]);
  await ctx.addInitScript(MEAS);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.evaluate(() => { S.daily.adBuy = {}; openShopPage(null, 'coin'); });
  await page.waitForTimeout(600);

  const cards = await page.evaluate(() => __dots());
  const live = cards.filter(c => !c.done);
  ok(live.length > 0 && live.every(c => c.dot), '[A] 살아 있는 칸마다 닷 노드가 하나 있다',
    live.filter(c => c.dot).length + '/' + live.length + '칸');
  ok(live.every(c => c.dot && c.dot.parent.indexOf('cn-cd') >= 0),
    '[A] 노드의 부모가 카드(`.cn-cd`)다 — 329 의 «버튼 안» 이 아니다',
    live[0] && live[0].dot ? live[0].dot.parent : '없음');
  ok(live.every(c => c.inBt === 0), '[A] 버튼(`.bt`) 안에는 닷이 0개 (364 되돌림 감시)',
    live.reduce((s, c) => s + c.inBt, 0) + '개');
  ok(live.every(c => c.dot && c.dot.pe === 'none'), '[A] 닷은 `pointer-events:none` — 버튼 히트를 안 가로챈다');

  /* ── [B] 299 우상단 사분면 (카드 기준) ── */
  const quad = live.map(c => {
    const r = c.dot.rect, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    return { id: c.id, qx: (cx - c.card[0]) / c.card[2], qy: (cy - c.card[1]) / c.card[3] };
  });
  ok(quad.every(q => q.qx > 0.5 && q.qy < 0.5), '[B] 299 — 중심이 카드 우상단 사분면 (수리 전은 (0.81, 0.74) = 우하단)',
    quad.map(q => q.id + ' ' + q.qx.toFixed(2) + ',' + q.qy.toFixed(2)).join(' · '));

  /* ── [C] 봉우리 1.3 에서 이웃 잉크와 겹침 0 ── */
  let worst = null;
  live.forEach(c => {
    const p = peak(c.dot.rect);
    [['타이틀', c.title], ['아이콘', c.icon], ['×N', c.qt], ['버튼', c.bt]].forEach(([n, b]) => {
      const o = overlap(p, b);
      if (o > 0 && (!worst || o > worst.o)) worst = { id: c.id, n, o };
    });
  });
  ok(!worst, '[C] 봉우리 1.3 에서도 타이틀 잉크·아이콘·×N·버튼과 겹침 0px',
    worst ? worst.id + ' ' + worst.n + ' ' + px(worst.o) + 'px' : '0px');
  /* 가장 긴 타이틀(«스킨 강화석»)의 여유를 수치로 남긴다 — 글자가 길어지면 여기가 먼저 좁아진다 */
  const tight = live.map(c => {
    const p = peak(c.dot.rect);
    return { id: c.id, dy: px(p[1] - (c.title[1] + c.title[3])), dx: px(p[0] - (c.title[0] + c.title[2])) };
  }).sort((a, b) => Math.max(a.dx, a.dy) - Math.max(b.dx, b.dy))[0];
  ok(tight && (tight.dx > 0 || tight.dy > 0), '[C] 타이틀 잉크와 최소 여유 (한 축만 벌어져도 안 물린다)',
    tight ? tight.id + ' 가로 ' + tight.dx + 'px · 세로 ' + tight.dy + 'px' : '—');

  /* ── [D] 카드에 안 잘린다 (둥근 모서리 포함) ── */
  const clip = live.map(c => {
    const p = peak(c.dot.rect);
    return [p[0] - c.card[0], (c.card[0] + c.card[2]) - (p[0] + p[2]),
            p[1] - c.card[1], (c.card[1] + c.card[3]) - (p[1] + p[3])].map(px);
  });
  ok(clip.every(v => v.every(x => x > 0)), '[D] 봉우리 1.3 에서도 카드(overflow:hidden) 안',
    '여유 [좌,우,상,하] = ' + JSON.stringify(clip[0]));
  const rad = cards[0].radius;
  ok(live.every(c => {
    const p = peak(c.dot.rect);
    return (p[1] - c.card[1]) >= rad || ((c.card[0] + c.card[2]) - (p[0] + p[2])) >= rad;
  }), '[D] 둥근 모서리(r' + rad + ') 구간을 안 밟는다 — 코너에 두면 5.24px 이 잘린다(329 실측)',
    'r' + rad);
  ok(cards[0].overflow === 'hidden', '[D] 전제 — 카드는 overflow:hidden 이다 (자리 선택의 근거)', cards[0].overflow);

  /* ── [E] 화소 ── */
  const red = await redAt(page, live[0].dot.rect);
  ok(red > 200, '[E] 화소 — 첫 칸 닷 자리에 빨강이 실제로 찍힌다', red + 'px');

  /* ── [F] 판정 불변 — 자리만 옮겼다 ── */
  const gate = await page.evaluate(() => {
    const id = COIN_ADS[0].id;
    S.daily.adBuy = {}; openShopPage(null, 'coin');
    const on = document.querySelectorAll('#shopList .cn-cd.alert > .updot').length;
    S.daily.adBuy = { [id]: 0 }; openShopPage(null, 'coin');
    const cd = [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length)[0];
    const off = { alert: cd.classList.contains('alert'), dots: cd.querySelectorAll('.updot').length };
    S.daily.adBuy = COIN_ADS.reduce((o, a) => (o[a.id] = 0, o), {}); openShopPage(null, 'coin');
    const none = document.querySelectorAll('#shopList .cn-cd > .updot').length;
    S.daily.adBuy = {}; openShopPage(null, 'coin');
    return { on, off, none, n: COIN_ADS.length };
  });
  ok(gate.on === gate.n, '[F] 받을 수 있으면 전 칸 점등 (329 계약 불변)', gate.on + '/' + gate.n);
  ok(gate.off.alert === false && gate.off.dots === 0, '[F] 소진한 칸은 소등 · 죽은 노드 0',
    'alert ' + gate.off.alert + ' · 노드 ' + gate.off.dots);
  ok(gate.none === 0, '[F] 전부 소진하면 닷 0개', gate.none + '개');

  /* ── [R] 되돌림 시험 — 옛 자리로 되돌리면 [B] 가 빨개진다 ── */
  const revert = await page.evaluate(() => {
    const st = document.createElement('style');
    /* 329 의 옛 값 — 버튼 안 right4/top10. 노드를 버튼으로 되돌리는 대신 좌표만 그 자리로 옮겨
       «자리가 규약을 어기면 게이트가 빨개지는가» 만 본다(자리 판정이 이 게이트의 본체다). */
    st.textContent = '#shopList .cn-cd>.updot{right:4px !important;top:238px !important}';
    document.head.appendChild(st);
    const out = [...document.querySelectorAll('#shopList .cn-cd')].slice(0, COIN_ADS.length)
      .map(cd => { const d = cd.querySelector(':scope > .updot'); if (!d) return null;
        const pa = d.style.animation; d.style.animation = 'none';
        const dr = d.getBoundingClientRect(), cr = cd.getBoundingClientRect(); d.style.animation = pa;
        return [(dr.left + dr.width / 2 - cr.left) / cr.width, (dr.top + dr.height / 2 - cr.top) / cr.height]; })
      .filter(Boolean);
    st.remove();
    return out;
  });
  ok(revert.length > 0 && revert.every(q => !(q[0] > 0.5 && q[1] < 0.5)),
    '[R] 되돌림 시험 — 옛 자리(버튼 안 높이)로 되돌리면 우상단 사분면 단언이 실제로 깨진다',
    revert[0].map(v => v.toFixed(2)).join(','));
  const back = await page.evaluate(() => {
    const cd = document.querySelector('#shopList .cn-cd'), d = cd.querySelector(':scope > .updot');
    const dr = d.getBoundingClientRect(), cr = cd.getBoundingClientRect();
    return [(dr.left + dr.width / 2 - cr.left) / cr.width, (dr.top + dr.height / 2 - cr.top) / cr.height];
  });
  ok(back[0] > 0.5 && back[1] < 0.5, '[R] 되돌림을 걷으면 다시 초록 (시험이 상태를 안 남긴다)',
    back.map(v => v.toFixed(2)).join(','));

  ok(errs.length === 0, '[전역] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY364 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
