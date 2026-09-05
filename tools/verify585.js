#!/usr/bin/env node
/* 작업 585 게이트 — «03 던전의 화폐·입장권 잉크가 ref 상자를 채운다»
 *
 *   node tools/verify585.js   → 마지막 줄이 `VERIFY585 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-31): «던전행에서도 화폐들 크기좀 키우기».
 *
 * 재현은 `tools/probe585.js` 가 했다(338 규칙). 그 자가 **등재문 처방 ①·②(«`.pcb` 를 세 화면
 * 같이 올린다»)를 기각했다** — `.pcb` 두 아이콘은 기준선(23 훈련 골드 52.97)보다 이미 +11~23%
 * 이고 340 이 HUD 값으로 맞춰 둔 자리다. 남은 세 자리가 전부 **«상자를 재고 잉크를 안 봤다»** 였다.
 *
 * ⚑ **이 게이트의 눈금을 먼저 적는다(394 규약).** 재는 것은 상자가 아니라 **그려진 잉크**이고,
 *   잉크 = 렌더 상자 × (그 SVG 의 알파 bbox ÷ viewBox) 다. 자산마다 이 비가 달라서
 *   «상자는 여덟 칸 다 같은데 그림만 제각각 작은» 상태가 만들어졌다(340 계열).
 *   목표는 «기준선과 같은 수» 가 아니라 **측정표가 적어 둔 ref 잉크 상자**다 —
 *   동전은 정사각이고 입장권은 가로로 긴 티켓이라 한 수로 묶으면 모양이 크기로 읽힌다.
 *   그래서 **등방 contain 의 «묶는 축»이 ref 와 Δ0 인가**를 묻고(§2·§3·§4),
 *   남는 축은 **아트/각도 몫**으로 따로 이름을 붙여 둔다(review §4 · 596 등재).
 *
 * 절:
 *   §1 잉크비  입장권 8장의 잉크비가 **완전히 같다**(그래서 크기 규칙이 한 줄이면 된다).
 *   §2 카드권  03 카드 입장권 8종 — 묶는 축(폭)이 ref 64 와 ±1% · 8종이 서로 ±0.5%.
 *   §3 보상권  03 카드 보상 알약 코인 8칸 — 각 칸이 ref 51×53 에 등방 contain(묶는 축 ±1%).
 *   §4 세부권  04 세부 입장권 — 18° bbox 의 묶는 축이 ref 69 와 ±1%,
 *              그리고 **같은 슬롯의 비-입장권(209 탑 보상 재화)은 안 커진다**(상자 밖으로 안 나간다).
 *   §5 pcb     `.pcb` 골드·다이아가 **불변**이고 03 ↔ 10 이 같은 값이다(공용 부품이 안 갈렸다).
 *              [전제]로 «잰 순간 알약에 펄스가 안 걸려 있었다» 를 먼저 못박는다(609).
 *   §6 특이성  4491 의 ID 급 짝(`#dunw .pcb-p>i{display:flex}`)이 살아 있다.
 *   §7 543     13 재화 탭 예외 가드가 그대로다(`.cbox i>.cic` 55).
 *   §8 잘림    9:19 · 9:13.3 둘 다 — 잉크가 호스트 카드/팝업과 프레임 안에 있다.
 *   §9 겹침    카드 입장권 잉크가 위 라벨(`.lb`)·옆 숫자(`.sp.tk>i`)와 안 겹친다.
 *   §R 되돌림  옛 배율을 심은 사본에서 §2·§3·§4 가 **빨개진다**(무르게 푼 자가 아님을 못박는다).
 *              [R4](609) `.pcb-p` 에 **정적** 배율을 심은 사본에서 §5 가 빨개진다 —
 *              «펄스를 껐다» 가 §5 를 무르게 푼 것이 아님을 못박는다.
 *   §E 에러    pageerror 0건.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const RAW = fs.readFileSync(SRC, 'utf8');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));
const r2 = (n) => Math.round(n * 100) / 100;
const near = (a, b, pct) => Math.abs(a / b - 1) <= pct / 100;

/* ── ref 잉크 상자 — 측정표가 적어 둔 값. 이 게이트의 «정답» 은 전부 여기서 온다 ──
   03 §3-5-3 «입장권 아이콘 bbox 64 × 50» · 03 §3-4-1 «코인 51 × 53» · 04 §6 «티켓 아이콘 69 × 54» */
const REF = { tkCard: [64, 50], pill: [51, 53], tkDetail: [69, 54] };
const TK_ROT = 18;                      /* 04 세부 슬롯의 기울기(제품 `rotate(-18deg)`) */

/* ── 자산 잉크비 — about:blank 에서 512px 로 그려 알파 bbox 를 잰다(412 방식) ── */
const ASSETS = fs.readdirSync(path.join(ROOT, 'assets/ui')).filter((f) => /^cur-.*\.svg$/.test(f));
async function inkRatio(ctx) {
  const src = {};
  for (const f of ASSETS) src[f] = fs.readFileSync(path.join(ROOT, 'assets/ui', f), 'utf8');
  const page = await ctx.newPage();
  await page.goto('about:blank');
  const out = await page.evaluate(async ({ src, N }) => {
    const res = {};
    for (const f in src) {
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src[f]);
      const img = new Image();
      await new Promise((y, n) => { img.onload = y; img.onerror = () => n(new Error(f)); img.src = url; });
      const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      let x1 = N, y1 = N, x2 = -1, y2 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        if (d[(y * N + x) * 4 + 3] > 16) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
      res[f] = x2 < 0 ? { w: 0, h: 0 } : { w: (x2 - x1 + 1) / N, h: (y2 - y1 + 1) / N };
    }
    return res;
  }, { src, N: 512 });
  await page.close();
  return out;
}

const SETUP = `S.guide.idx = 99;
  Object.keys(DUN_UI).forEach(function(id){ S.dun[id] = 1; S.dunTk[id] = 9; });
  S.gold = 1e12; S.dia = 1e9; S.tstone = 9999; S.rstone = 9999; S.relic = 9999;
  markDirty && markDirty(); renderUI && renderUI();`;

/* 상자는 offsetWidth(정수 반올림) 말고 계산된 used value 로 잰다 — 1.08em×56 = 60.48 이 60 으로 깎인다 */
const PICK = `(function(sels){
  var out = [], M = (window.DOMMatrixReadOnly || window.DOMMatrix);
  sels.forEach(function(s){
    document.querySelectorAll(s.q).forEach(function(im, i){
      var r = im.getBoundingClientRect();
      if(r.width <= 0) return;
      var m = new M(getComputedStyle(im).transform === 'none' ? '' : getComputedStyle(im).transform);
      var el = im.parentElement;
      while(el && el !== document.documentElement){
        var t = getComputedStyle(el).transform;
        if(t && t !== 'none') m = new M(t).multiply(m);
        el = el.parentElement;
      }
      var host = im.closest(s.host || 'body');
      var hr = host ? host.getBoundingClientRect() : null;
      out.push({ slot: s.n, i: i, src: (im.getAttribute('src')||'').split('/').pop(),
                 key: im.getAttribute('data-cur-ic') || '',
                 bw: parseFloat(getComputedStyle(im).width) * Math.hypot(m.a, m.b),
                 bh: parseFloat(getComputedStyle(im).height) * Math.hypot(m.c, m.d),
                 deg: Math.atan2(m.b, m.a) * 180 / Math.PI,
                 cx: r.x + r.width / 2, cy: r.y + r.height / 2,
                 hx: hr && hr.x, hy: hr && hr.y, hw: hr && hr.width, hh: hr && hr.height });
    });
  });
  return out;
})`;

/* 겹침 축 — 카드 입장권 잉크가 위 라벨·옆 숫자와 안 겹치는지 볼 이웃들
   ⚑ 596 이관 — 라벨은 **상자가 아니라 잉크**로 잰다. 이 자는 «커진 아이콘이 이웃을 밟는가» 를
   묻는데, `.lb.b` 상자(400..438)는 글리프가 없는 반각 여백까지 물고 있어 596 이 티켓을 눕히자
   «밟는다»(−3.6) 는 **거짓 신호**를 냈다. 찍힌 픽셀(`probe596` [4] 차분)은 401..432 이고
   아래 자(canvas TextMetrics)도 **같은 401..432** 를 준다 — 검산이 붙은 자다(`verify596` §5).
   ⚠ 무르게 푼 것이 아니다: 잉크가 상자 밖으로 나가면(= 자가 헛값을 주면) [전제] 항이 빨개진다. */
const NEIGH = `(function(){
  var c = document.querySelector('#dunw .dnc');
  if(!c) return null;
  var q = function(s){ var e = c.querySelector(s); if(!e) return null; var r = e.getBoundingClientRect();
                       return { x:r.x, y:r.y, w:r.width, h:r.height }; };
  var ink = function(s){
    var e = c.querySelector(s); if(!e) return null;
    var cs = getComputedStyle(e), r = e.getBoundingClientRect();
    var g = document.createElement('canvas').getContext('2d');
    g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
    var m = g.measureText(e.textContent), lh = parseFloat(cs.lineHeight);
    var base = r.y + (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    var sw = (parseFloat(cs.webkitTextStrokeWidth) || 0) / 2;
    return { top: base - m.actualBoundingBoxAscent - sw, bottom: base + m.actualBoundingBoxDescent + sw };
  };
  return { card: q(':scope'), lb: q('.lb.b'), num: q('.sp.tk>i'), pill: q('.sp.tk'), lbInk: ink('.lb.b') };
})`;

async function open(ctx, css, w, h) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: w || 1080, height: h || 2280 });
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  if (css) await page.evaluate((t) => { const s = document.createElement('style'); s.textContent = t; document.head.appendChild(s); }, css);
  await page.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await page.waitForTimeout(600);
  /* ⚠ 58/93 «톡톡» 펄스를 **재기 전에 무력화한다.** 이 자는 크기를 묻는 자인데
       그 연출은 알약에 한시적 배율을 얹는다 — 그 프레임에 재면 «`.pcb` 가 커졌다» 는
       **거짓 신호**가 난다(이 자의 실행마다 골드가 65.3 / 66.85 / 70.01 로 흔들렸다).
     ⚠ «연출이 걷힐 때까지 기다린다» 로는 못 잡는다 — 게임이 자동 전투로 골드를 계속 벌어
       펄스가 **반복해서 다시 붙는다**(기다림이 잡는 것은 순간의 틈뿐이다).
     ⚑ **609 — 종전 무력화는 «결과» 를 눌렀고, 그래서 절반만 덮었다.**
       옛 처방은 `.pcb-p.fx-punch{animation:none!important;transform:none!important}` 였는데
       93/13회차가 «UI 발» 펄스를 CSS 애니메이션에서 **JS 진폭 경로**로 옮긴 뒤
       (`fxPzHit` → `fxPzTick` 이 매 프레임 `el.style.transform` 을 직접 쓴다)
       그 선택자가 자리를 통째로 지나쳤다 — **클래스가 안 붙는다.**
       `probe609` [2] 가 어긋난 프레임에서 «클래스 `pcb-p pcb-g` · 인라인 `scale(1.0345)`» 을 찍었고,
       [3] 이 «골드는 결정적 드리프트 · 다이아는 플레이키» 라는 등재문의 **두 갈래를 기각**했다
       (둘이 같은 `fxPz` 표에 같이 올라 **같은 배율**로 어긋난다 — 뿌리도 처방도 하나다).
     ⇒ 결과가 아니라 **만드는 쪽(두 입구)** 을 끈다. 그래야 제품이 `.pcb-p` 에 **정적** 배율을
       얹는 회귀는 자가 여전히 본다(`probe609` [6] · 아래 §R4 가 못박는다).
       끈 상태는 쉬는 상태와 같은 값을 준다(§5 [전제] 가 «인라인 transform 0건» 으로 확인한다). */
  await page.evaluate(() => {
    window.fxPunch = () => false;      /* 전투 발 — `fx-punch` 클래스 경로 */
    window.fxPzHit = () => false;      /* UI 발 — JS 진폭 경로(93/13회차) */
    try { fxPz.clear(); } catch (e) { /* 표가 없으면 끌 것도 없다 */ }
    document.querySelectorAll('.pcb-p').forEach((e) => {
      e.classList.remove('fx-punch');               /* 897 — `fx-punch2` 는 제품에서 삭제됐다 */
      e.style.transform = ''; e.style.transformOrigin = '';
    });
  });
  await page.waitForTimeout(150);
  return { page, errs };
}

/* 609 — §5 [전제]. «잰 순간의 알약이 정말 쉬는 상태였나» 를 같은 프레임에 같이 찍는다.
   이 항이 없으면 무력화가 다시 새는 날 자는 **조용히 흔들리기만** 한다(609 가 그랬다). */
const PCBST = `(function(sel){
  return Array.prototype.map.call(document.querySelectorAll(sel), function(p){
    return { cls: p.className, tr: p.style.transform || '',
             pz: (typeof fxPz !== 'undefined' && fxPz.get(p)) ? fxPz.get(p).a : null };
  });
})`;

const DUN_SEL = [
  { n: 'tkCard', q: '#dunw .dnc .sp.tk>em>.cic', host: '.dnc' },
  { n: 'pill',   q: '#dunw .dnc .pill>em>.cic',  host: '.dnc' },
  { n: 'pcbG',   q: '#dunw .pcb-g>i>.cic',       host: '.pcb' },
  { n: 'pcbD',   q: '#dunw .pcb-d>i>.cic',       host: '.pcb' },
];

/* 옛 배율을 되돌리는 사본 — §R 이 심는다 */
/* ⚠ 596 이관 — 카드 입장권 규칙이 `:has(>[data-cur-ic^="tk"])` 로 좁아지면서 특이도가 올랐다.
   옛 `.dnc .sp.tk>em` 한 줄로는 **더 이상 안 덮이고**, 그러면 [R1] 이 «옛 값에서도 초록» 이 되어
   되돌림 시험이 통째로 죽는다(헛초록). 같은 스코프로 적어 특이도를 맞춘다. */
const OLD_CSS =
  '.dnc .sp.tk>em:has(>[data-cur-ic^="tk"]){transform:scale(.8269);top:0}'
  + '.dnc .pill>em:has(>[data-cur-ic="dia"]),.dnc .pill>em:has(>[data-cur-ic="relic"]),'
  + '.dnc .pill>em:has(>[data-cur-ic="stone"]),.dnc .pill>em:has(>[data-cur-ic="rstone"])'
  + '{transform:scale(1.0732)}'
  + '.dgd-tki:has(>[data-cur-ic^="tk"]){transform:rotate(-18deg)}';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const ratio = await inkRatio(ctx);

  const ink = (r) => {
    const f = ratio[r.src] || { w: 1, h: 1 };
    const w = r.bw * f.w, h = r.bh * f.h;
    const t = Math.abs(r.deg) * Math.PI / 180, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
    return { w, h, rw: w * c + h * s, rh: w * s + h * c };
  };
  /* 등방 contain 의 «묶는 축» — ref 를 먼저 넘는 축이 배율을 정한다 */
  const bind = (k, ref) => (k.rw / ref[0] >= k.rh / ref[1] ? 'w' : 'h');

  /* ── §1 ─────────────────────────────────────────────────────────────── */
  blk('§1 잉크비 — 입장권 8장이 같은 그림 기하인가 (크기 규칙이 한 줄이면 되는 근거)');
  const tkFiles = ASSETS.filter((f) => /^cur-ticket-/.test(f));
  ok(tkFiles.length === 8, '입장권 자산 8장', tkFiles.length + '장');
  const tkR = tkFiles.map((f) => ratio[f]);
  ok(tkR.every((r) => Math.abs(r.w - tkR[0].w) < 1e-9 && Math.abs(r.h - tkR[0].h) < 1e-9),
    '8장의 잉크비가 완전히 같다 (412·430 «껍데기 픽셀 동일»)',
    r2(tkR[0].w) + ' × ' + r2(tkR[0].h));
  ok(tkR[0].h < 0.6, '입장권 아트는 viewBox 세로를 절반쯤만 채운다 (이 행의 뿌리)', r2(tkR[0].h * 64) + '/64');

  /* ── 본 측정 ─────────────────────────────────────────────────────────── */
  const { page, errs } = await open(ctx, null, 1080, 2280);
  const dun = await page.evaluate(PICK + '(' + JSON.stringify(DUN_SEL) + ')');
  const pcbSt = await page.evaluate(PCBST + '("#dunw .pcb-p")');
  const neigh = await page.evaluate(NEIGH + '()');
  await page.evaluate(() => openDunDetail(DUNGEONS.find((d) => d.id === 'gold')));
  await page.waitForTimeout(400);
  const det = await page.evaluate(PICK + '(' + JSON.stringify([{ n: 'tkDetail', q: '#dgdTki>.cic', host: '.dgd-tki' }]) + ')');
  /* 209 탑 — 같은 슬롯에 정사각 보상 재화를 그린다 */
  const tower = await page.evaluate(() => {
    const el = document.getElementById('dgdTki');
    curIcEl(el, 'gold');
    const im = el.querySelector('.cic');
    const cs = getComputedStyle(el);
    return { tr: cs.transform, box: parseFloat(getComputedStyle(im).width) };
  });
  const shop = await page.evaluate(() => { openShopPage(); return 1; });
  await page.waitForTimeout(500);
  const shp = await page.evaluate(PICK + '(' + JSON.stringify([
    { n: 'pcbG', q: '#shopw .pcb-g>i>.cic', host: '.pcb' },
    { n: 'pcbD', q: '#shopw .pcb-d>i>.cic', host: '.pcb' }]) + ')');
  /* 543 예외는 «13 재화 탭이 열렸을 때만 55» 다 — 탭을 안 열고 재면 평소값(65.3)이 나와
     무엇을 물었는지 알 수 없다. 두 상태를 **둘 다** 재야 가드가 살아 있음이 보인다. */
  const g543off = await page.evaluate(() => {
    const im = document.querySelector('#top .curs .cGold i>.cic');
    return im ? parseFloat(getComputedStyle(im).width) : null;
  });
  const g543on = await page.evaluate(() => {
    shopCat = 'coin';                 /* 29584 — 상점 카테고리는 이 한 변수가 정한다 */
    renderShopPage();
    const im = document.querySelector('#top .curs .cbox i>.cic');
    return { on: !!document.querySelector('#shopw.on .shp-list.coin'),
             w: im ? parseFloat(getComputedStyle(im).width) : null };
  });
  const spec = await page.evaluate(() =>
    getComputedStyle(document.querySelector('#dunw .pcb-p>i')).display);

  const cards = dun.filter((r) => r.slot === 'tkCard');
  const pills = dun.filter((r) => r.slot === 'pill');

  /* ── §2 ─────────────────────────────────────────────────────────────── */
  blk('§2 03 카드 입장권 8종 — ref 64 × 50 (측정표 §3-5-3)');
  ok(cards.length === 8, '카드 입장권 8종이 그려진다', cards.length + '종 · '
    + new Set(cards.map((c) => c.src)).size + '가지 그림');
  cards.forEach((c) => {
    const k = ink(c);
    console.log('    ' + c.key.padEnd(10) + ' 잉크 ' + r2(k.w) + ' × ' + r2(k.h));
  });
  const k0 = ink(cards[0]);
  const b0 = bind(k0, REF.tkCard);
  ok(b0 === 'w', '묶는 축은 폭이다 (세로는 각도 몫 — review §4-ⓐ · 596)', '묶는 축 ' + b0);
  ok(near(k0.rw, REF.tkCard[0], 1), '묶는 축(폭)이 ref 64 와 ±1%',
    r2(k0.rw) + ' / 64 = ' + r2((k0.rw / 64 - 1) * 100) + '%');
  const cw = cards.map((c) => ink(c).w);
  ok(Math.max(...cw) / Math.min(...cw) <= 1.005, '8종이 서로 ±0.5%',
    '최대÷최소 ' + r2(Math.max(...cw) / Math.min(...cw)));
  /* ⚑ 596 이관 — 눈금이 «잉크 폭» 이면 각도가 붙는 순간 뜻을 잃는다. 585 는 평평한 티켓이라
     폭 = 차지하는 자리였지만, 596 이 −18° 를 얹은 뒤로는 **차지하는 자리 = 회전 bbox** 이고
     제 축 폭은 오히려 줄어든다(63.99 → 56.83 — 같은 자리를 눕혀서 채우니 당연하다).
     그래서 «커졌는가» 는 **찍히는 면적의 제곱근(시각 덩치)** 으로 묻는다 — 585 의 뜻
     («주인이 작다고 한 것보다 커졌다»)은 그대로 두고 각도에 안 흔들리는 축으로만 옮긴다.
     수리 전 46.51 × 26.36(평평) ⇒ 덩치 35.02 · 지금 64.00 × 48.19 ⇒ 55.5(+58%). */
  const bulk0 = Math.sqrt(k0.rw * k0.rh), bulkPre = Math.sqrt(46.51 * 26.36);
  ok(bulk0 > bulkPre * 1.3, '수리 전(덩치 35.02 = 46.51×26.36)보다 30% 이상 커졌다',
    r2(bulk0) + ' / ' + r2(bulkPre) + ' = +' + r2((bulk0 / bulkPre - 1) * 100) + '%');
  ok(k0.w > 46.51, '제 축 폭도 수리 전보다는 크다 (줄어든 것이 아니다)', r2(k0.w) + ' > 46.51');

  /* ── §3 ─────────────────────────────────────────────────────────────── */
  blk('§3 03 카드 보상 알약 코인 8칸 — ref 51 × 53 (측정표 §3-4-1)');
  ok(pills.length === 8, '보상 코인 8칸', pills.length + '칸');
  let bad = [];
  pills.forEach((p) => {
    const k = ink(p), b = bind(k, REF.pill);
    const got = b === 'w' ? k.rw : k.rh, want = b === 'w' ? REF.pill[0] : REF.pill[1];
    const good = near(got, want, 1);
    if (!good) bad.push(p.key + ' ' + r2(got) + '≠' + want);
    console.log('    ' + p.key.padEnd(8) + ' 잉크 ' + r2(k.w) + ' × ' + r2(k.h)
      + '  묶는 축 ' + b + ' → ' + r2((got / want - 1) * 100) + '%');
  });
  ok(bad.length === 0, '8칸 전부 묶는 축이 ref 와 ±1%', bad.length ? bad.join(' · ') : '전부 Δ0');
  const pb = pills.map((p) => Math.sqrt(ink(p).w * ink(p).h));
  const noR = pills.filter((p) => p.key !== 'rstone').map((p) => Math.sqrt(ink(p).w * ink(p).h));
  ok(Math.max(...noR) / Math.min(...noR) <= 1.05,
    'rstone(아트 몫) 빼면 덩치가 ±5% 안', '최대÷최소 ' + r2(Math.max(...noR) / Math.min(...noR)));
  ok(Math.max(...pb) / Math.min(...pb) < 1.60,
    '수리 전 편차(1.600)보다 좁아졌다', '최대÷최소 ' + r2(Math.max(...pb) / Math.min(...pb)));

  /* ── §4 ─────────────────────────────────────────────────────────────── */
  blk('§4 04 세부 입장권 — ref 69 × 54 (측정표 04 §6, 기울어진 티켓)');
  ok(det.length === 1, '세부 팝업 입장권 1자리', det.length + '자리');
  const kd = ink(det[0]);
  ok(Math.abs(Math.abs(det[0].deg) - TK_ROT) < 0.5, '슬롯 기울기 18° 유지', r2(det[0].deg) + '°');
  const bd = bind(kd, REF.tkDetail);
  ok(near(bd === 'w' ? kd.rw : kd.rh, bd === 'w' ? REF.tkDetail[0] : REF.tkDetail[1], 1),
    '묶는 축이 ref 와 ±1%', r2(kd.rw) + ' × ' + r2(kd.rh) + ' (bbox)');
  ok(kd.rw <= REF.tkDetail[0] + 0.5 && kd.rh <= REF.tkDetail[1] + 0.5,
    'ref 상자(69×54) 를 안 넘는다', r2(kd.rw) + ' × ' + r2(kd.rh));
  ok(kd.rw > 45.4 * 1.3, '수리 전(45.40)보다 30% 이상 커졌다', r2(kd.rw));
  /* 209 탑 — 같은 슬롯이 **정사각 재화**를 그릴 때는 안 커져야 한다(`:has(tk)` 스코프).
     ⚠ 상자(`getComputedStyle().width`)로는 못 묻는다 — transform 은 그 값을 안 움직인다.
       슬롯에 실제로 걸린 행렬에서 **배율 성분**을 뽑아야 자가 산다. */
  const towerSc = (() => {
    const m = /matrix\(([^)]+)\)/.exec(tower.tr);
    if (!m) return 1;
    const v = m[1].split(',').map(Number);
    return Math.hypot(v[0], v[1]);
  })();
  ok(Math.abs(towerSc - 1) < 0.01,
    '209 탑 보상 재화(정사각)에는 확대가 안 걸린다 — `:has(tk)` 스코프',
    '배율 ' + r2(towerSc) + ' (입장권 자리는 1.51276)');
  ok(tower.box * towerSc <= REF.tkDetail[1],
    '그래서 탑 아이콘이 슬롯(69×54) 안에 남는다', r2(tower.box * towerSc) + 'px');

  /* ── §5 ─────────────────────────────────────────────────────────────── */
  blk('§5 `.pcb` 불변 — 이 행이 손대지 않은 것(공용 부품이 안 갈렸다)');
  /* [전제] 609 — 아래 세 항은 «쉬는 상태의 크기» 를 묻는 자다. 펄스가 걸린 프레임에서 재면
     세 항 전부 뜻을 잃으므로, 잰 순간이 정말 쉬는 상태였는지를 **먼저** 못박는다.
     ⚠ 이것이 빨개지면 «제품이 커졌다» 가 아니라 «무력화가 다시 샌다» 는 뜻이다(609 의 자리). */
  const live = pcbSt.filter((p) => p.tr || /fx-punch/.test(p.cls) || p.pz != null);
  ok(pcbSt.length >= 2, '[전제] `#dunw .pcb-p` 알약 표본을 얻었다', pcbSt.length + '칸');
  ok(live.length === 0,
    '[전제] 잰 순간 알약에 펄스가 안 걸려 있다 — 인라인 transform · `fx-punch` · `fxPz` 항 0건',
    live.length ? live.map((p) => '[' + p.cls + '] ' + (p.tr || 'a=' + p.pz)).join(' · ') : '0건');
  const dg = dun.find((r) => r.slot === 'pcbG'), dd = dun.find((r) => r.slot === 'pcbD');
  const sg = shp.find((r) => r.slot === 'pcbG'), sd = shp.find((r) => r.slot === 'pcbD');
  ok(near(ink(dg).w, 65.3, 0.5), '03 `.pcb` 골드 잉크 65.3 그대로 (340 값)', r2(ink(dg).w));
  /* ⚑ 671 이관 — 59.06 → **65.3**. 이 절이 지키는 것은 «알약 펄스가 아이콘 잉크를 흔들지 않는다» 이고
     기대값은 그 시각의 확정 상자다. 671 이 젬 아트를 .875 등방으로 다시 그려 코인과 한 값이 됐다
     (`verify125` D1·D3 · `verify340` [3]). 음성항 [R4] 는 아래에서 같은 값으로 다시 잰다. */
  ok(near(ink(dd).w, 65.3, 0.5), '03 `.pcb` 다이아 잉크 65.3 그대로 (671 — 코인과 한 값)', r2(ink(dd).w));
  ok(near(ink(dg).w, ink(sg).w, 0.5) && near(ink(dd).w, ink(sd).w, 0.5),
    '03 던전 ↔ 10 상점이 같은 값 (공용 `.pcb` 가 안 갈렸다)',
    r2(ink(sg).w) + ' / ' + r2(ink(sd).w));

  /* ── §6 · §7 ────────────────────────────────────────────────────────── */
  blk('§6·§7 특이성 짝과 543 예외');
  ok(spec === 'flex', '4491 ID 급 짝이 살아 있다 (`#dunw .pcb-p>i{display:flex}`)', spec);
  ok(/#dunw \.pcb-p>i,#relw \.pcb-p>i,#shopw \.pcb-p>i\{display:flex\}/.test(RAW),
    '그 짝의 선언이 소스에 그대로', '4491');
  ok(/#app:not\(:has\(#shopw\.on \.shp-list\.coin\)\)/.test(RAW),
    '543 의 13 재화 탭 예외 가드가 그대로', '소스 존재');
  ok(Math.abs(g543off - 65.3) < 0.6, '재화 탭이 닫혔을 때 HUD 골드 상자는 평소값 65.3', String(g543off));
  ok(g543on.on && Math.abs(g543on.w - 55) < 0.6,
    '재화 탭을 열면 543 가드가 55 로 좁힌다 (이 행이 그 가드를 안 건드렸다)',
    (g543on.on ? '탭 열림 · ' : '탭 안 열림 · ') + String(g543on.w));

  await page.close();

  /* ── §8 잘림 — 9:19 · 9:13.3 ──────────────────────────────────────── */
  blk('§8 잘림 — 9:19(2280) · 9:13.3(1600) 둘 다');
  for (const [w, h, nm] of [[1080, 2280, '9:19'], [1080, 1600, '9:13.3']]) {
    const o = await open(ctx, null, w, h);
    const rows = await o.page.evaluate(PICK + '(' + JSON.stringify(DUN_SEL) + ')');
    /* ⚠ «프레임 세로 밖» 은 잘림이 아니다 — 03 은 스크롤 리스트라 접힌 카드는 원래 화면 밖이다.
         잘림을 묻는 자리는 **호스트(카드 `.dnc` · 바 `.pcb`)를 잉크가 넘는가** 와 **가로 프레임**이다. */
    const out = rows.filter((r) => {
      const k = ink(r);
      return (r.cx - k.rw / 2) < 0 || (r.cx + k.rw / 2) > w;
    });
    ok(out.length === 0, nm + ' — 가로 프레임 밖으로 나간 아이콘 0개',
      rows.length + '노드 중 ' + out.length);
    const spill = rows.filter((r) => {
      if (r.hw == null) return false;
      const k = ink(r);
      return (r.cx - k.rw / 2) < r.hx - 1 || (r.cx + k.rw / 2) > r.hx + r.hw + 1
          || (r.cy - k.rh / 2) < r.hy - 1 || (r.cy + k.rh / 2) > r.hy + r.hh + 1;
    });
    ok(spill.length === 0, nm + ' — 호스트(카드 `.dnc` · 바 `.pcb`) 밖으로 샌 아이콘 0개',
      rows.length + '노드 중 ' + spill.length);
    await o.page.close();
  }

  /* ── §9 겹침 ───────────────────────────────────────────────────────── */
  blk('§9 겹침 — 커진 입장권이 이웃을 밟지 않는가');
  const kc = ink(cards[0]);
  const top = cards[0].cy - kc.rh / 2, right = cards[0].cx + kc.rw / 2;
  ok(neigh && neigh.lb && neigh.lbInk, '이웃 표본(라벨 `.lb.b` · 숫자 `.sp.tk>i`)을 얻었다');
  ok(neigh.lbInk.top >= neigh.lb.y - 0.5 && neigh.lbInk.bottom <= neigh.lb.y + neigh.lb.h + 0.5,
    '[전제] 라벨 잉크 자가 헛값이 아니다 — 잉크가 제 상자 안에 있다',
    '잉크 ' + r2(neigh.lbInk.top) + '..' + r2(neigh.lbInk.bottom) + ' ⊂ 상자 '
    + r2(neigh.lb.y) + '..' + r2(neigh.lb.y + neigh.lb.h));
  ok(top >= neigh.lbInk.bottom - 0.5, '위 라벨 **잉크**와 안 겹친다 (596 이관 — 상자가 아니라 잉크)',
    '잉크 상변 ' + r2(top) + ' ≥ 라벨 잉크 하변 ' + r2(neigh.lbInk.bottom)
    + ' (여유 ' + r2(top - neigh.lbInk.bottom) + 'px · ref 4.5px)');
  ok(right <= neigh.num.x + 0.5, '옆 숫자와 안 겹친다',
    '잉크 우변 ' + r2(right) + ' ≤ 숫자 좌변 ' + r2(neigh.num.x));

  /* ── §R 되돌림 ─────────────────────────────────────────────────────── */
  blk('§R 되돌림 — 옛 배율을 심으면 §2·§3·§4 가 빨개진다');
  const o = await open(ctx, OLD_CSS, 1080, 2280);
  const oldRows = await o.page.evaluate(PICK + '(' + JSON.stringify(DUN_SEL) + ')');
  const oc = oldRows.filter((r) => r.slot === 'tkCard'), op = oldRows.filter((r) => r.slot === 'pill');
  const ok0 = ink(oc[0]);
  ok(!near(ok0.rw, REF.tkCard[0], 1), '[R1] 옛 `.8269` 에서 카드 입장권 폭이 ref 를 벗어난다',
    r2(ok0.rw) + ' vs 64 (' + r2((ok0.rw / 64 - 1) * 100) + '%)');
  const oBad = op.filter((p) => {
    const k = ink(p), b = bind(k, REF.pill);
    return !near(b === 'w' ? k.rw : k.rh, b === 'w' ? REF.pill[0] : REF.pill[1], 1);
  });
  ok(oBad.length >= 4, '[R2] 옛 `1.0732` 한 값에서 보상 코인 4칸 이상이 ref 를 벗어난다',
    oBad.length + '칸: ' + oBad.map((p) => p.key).join(','));
  await o.page.evaluate(() => openDunDetail(DUNGEONS.find((d) => d.id === 'gold')));
  await o.page.waitForTimeout(400);
  const oDet = await o.page.evaluate(PICK + '(' + JSON.stringify([{ n: 'tkDetail', q: '#dgdTki>.cic', host: '.dgd-tki' }]) + ')');
  const okd = ink(oDet[0]);
  ok(!near(okd.rw, REF.tkDetail[0], 1), '[R3] 확대를 뺀 04 세부는 ref 69 에 한참 못 미친다',
    r2(okd.rw) + ' vs 69 (' + r2((okd.rw / 69 - 1) * 100) + '%)');
  const oErr = o.errs.slice();
  await o.page.close();

  /* [R4] 609 — «펄스를 껐다» 가 §5 를 무르게 푼 것이 아님을 못박는다.
     끈 것은 **연출을 만드는 쪽**이지 `.pcb-p` 의 transform 자체가 아니므로,
     제품이 그 알약에 **정적** 배율을 얹으면 §5 는 그대로 빨개져야 한다. */
  const o2 = await open(ctx, '#dunw .pcb-p{transform:scale(1.05)}', 1080, 2280);
  const r4rows = await o2.page.evaluate(PICK + '(' + JSON.stringify(DUN_SEL) + ')');
  const r4g = r4rows.find((r) => r.slot === 'pcbG'), r4d = r4rows.find((r) => r.slot === 'pcbD');
  ok(!near(ink(r4g).w, 65.3, 0.5) && !near(ink(r4d).w, 65.3, 0.5),
    '[R4] `.pcb-p` 에 정적 `scale(1.05)` 을 심은 사본에서 §5 골드·다이아가 둘 다 빨개진다',
    r2(ink(r4g).w) + ' / ' + r2(ink(r4d).w) + ' (기대 65.3 / 65.3 — 671)');
  await o2.page.close();

  /* ── §E ────────────────────────────────────────────────────────────── */
  blk('§E 콘솔');
  ok(errs.length === 0, '본 측정 pageerror 0건', errs.length ? errs[0].slice(0, 120) : '0');
  ok(oErr.length === 0, '되돌림 사본 pageerror 0건', oErr.length ? oErr[0].slice(0, 120) : '0');

  await browser.close();
  console.log('\nVERIFY585 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
