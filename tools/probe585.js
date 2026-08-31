#!/usr/bin/env node
/* 작업 585 재현자 — «03 던전의 화폐·입장권 아이콘이 얼마나 작은가»
 *
 *   node tools/probe585.js         → 마지막 줄이 `PROBE585 n/n PASS`
 *   node tools/probe585.js --json  → 표를 JSON 으로도 찍는다(게이트가 읽는다)
 *
 * 저장소 주인 지시(2026-08-31): «던전행에서도 화폐들 크기좀 키우기».
 *
 * 338 규칙 — **처방 전에 재현한다.** 등재문이 지목한 기준선은 «훈련 팝업에서 처럼» 이므로
 * 이 자는 **먼저 23 훈련 팝업의 화폐 아이콘을 재고**, 그 값에 03 던전의 세 자리
 * (① `.pcb` 골드·다이아 알약 ② 던전 카드 입장권 8종 ③ 04 세부 팝업 입장권)를 견준다.
 *
 * ⚠ 재는 것은 **상자가 아니라 잉크**다(340 교훈 — 상자를 재는 자로는 «작다» 가 안 보인다).
 *   `.cic` 는 `object-fit:contain` 인 정사각 SVG 라
 *       잉크 = 렌더 상자 × (그 SVG 의 알파 bbox ÷ viewBox)
 *   이고, 알파 bbox 는 about:blank 에서 각 자산을 크게 그려 한 번만 잰다(412 방식).
 *   렌더 상자는 `getBoundingClientRect()` = 조상 transform 까지 반영된 실제 자리다.
 *
 * ⚠ 이 자는 **채점하지 않는다**(제품이 어때야 한다고 말하지 않는다). 판정은 `verify585` 가 한다.
 *   여기의 ok/FAIL 은 «표본을 얻었는가» 뿐이다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const JSON_OUT = process.argv.includes('--json');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));
const r2 = (n) => Math.round(n * 100) / 100;

/* ── ① 자산별 «알파 bbox ÷ viewBox» — 잉크비 ───────────────────────────── */
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
      img.width = N; img.height = N;
      await new Promise((ok2, no) => { img.onload = ok2; img.onerror = () => no(new Error('load ' + f)); img.src = url; });
      const cv = document.createElement('canvas');
      cv.width = N; cv.height = N;
      const g = cv.getContext('2d');
      g.drawImage(img, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      let x1 = N, y1 = N, x2 = -1, y2 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (d[(y * N + x) * 4 + 3] > 16) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
      }
      res[f] = x2 < 0 ? { w: 0, h: 0 } : { w: (x2 - x1 + 1) / N, h: (y2 - y1 + 1) / N };
    }
    return res;
  }, { src, N: 512 });
  await page.close();
  return out;
}

/* ── ② 화면에서 렌더 상자를 걷는다 ────────────────────────────────────── */

/* 던전을 전부 열어 둔다(카드 8장이 다 그려져야 입장권 8종이 다 나온다) */
const SETUP = `S.guide.idx = 99;
  Object.keys(DUN_UI).forEach(function(id){ S.dun[id] = 1; S.dunTk[id] = 9; });
  S.gold = 1e12; S.dia = 1e9; S.tstone = 9999; S.rstone = 9999; S.relic = 9999;
  markDirty && markDirty(); renderUI && renderUI();`;

/* 한 셀렉터의 `.cic` 들을 «자리 이름 · src · 렌더 상자» 로 걷어 온다 */
/* ⚠ `getBoundingClientRect()` 는 **회전된 bbox** 다 — 04 세부 슬롯은 `rotate(-18deg)` 라
     그 값을 그대로 «상자» 로 읽으면 26% 크게 잡힌다(정사각 43.2 → 54.42).
     그래서 상자는 `offsetWidth × 실효 배율`(누적 행렬의 스케일 성분)로 따로 재고,
     회전각도 같이 돌려받아 «그려진 잉크의 회전 bbox» 를 노드에서 계산한다. */
const PICK = `(function(sels){
  var out = [];
  var M = (window.DOMMatrixReadOnly || window.DOMMatrix);
  sels.forEach(function(s){
    document.querySelectorAll(s.q).forEach(function(im, i){
      var r = im.getBoundingClientRect();
      if(r.width <= 0) return;
      /* 상자는 offsetWidth(정수 반올림) 말고 계산된 used value 로 잰다 —
           .cic 의 1.08em × fs56 = 60.48 이 60 으로 깎여 0.8% 작게 읽힌다. */
      /* 조상까지 누적된 변환 — 스케일 성분과 회전각을 뽑는다 */
      var m = new M(getComputedStyle(im).transform === 'none' ? '' : getComputedStyle(im).transform);
      var el = im.parentElement;
      while(el && el !== document.documentElement){
        var t = getComputedStyle(el).transform;
        if(t && t !== 'none') m = new M(t).multiply(m);
        el = el.parentElement;
      }
      var sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
      var deg = Math.atan2(m.b, m.a) * 180 / Math.PI;
      out.push({ slot: s.n, i: i, src: (im.getAttribute('src')||'').split('/').pop(),
                 bw: parseFloat(getComputedStyle(im).width) * sx,
                 bh: parseFloat(getComputedStyle(im).height) * sy, deg: deg,
                 rw: r.width, rh: r.height, x: r.x, y: r.y,
                 host: (im.parentElement && im.parentElement.className) || '' });
    });
  });
  return out;
})`;

async function shot(ctx, openJs, sels, label) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  await page.waitForTimeout(200);
  await page.evaluate(new Function(openJs));
  await page.waitForTimeout(700);
  const rows = await page.evaluate(PICK + '(' + JSON.stringify(sels) + ')');
  await page.close();
  if (errs.length) console.log('    ⚠ ' + label + ' 콘솔 예외 ' + errs.length + '건: ' + errs[0].slice(0, 120));
  return rows;
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  const ratio = await inkRatio(ctx);

  /* 23 훈련 — 기준선. 훈련 탭(골드) · 룬 탭 · 단련 탭을 한 번에 본다 */
  const tr = await shot(ctx, "openTrain();", [
    { n: '23 훈련 비용 버튼(골드)', q: '#trw .tr-card>.cb>s>.cic' },
    { n: '23 룬 버튼(룬강화석)',     q: '#trw .tr-rn .cic' },
    { n: '23 단련 헤더(단련석)',     q: '#trw .tr-temp .cic' },
  ], '23 훈련');

  /* 03 던전 — .pcb 알약 2개 + 카드 입장권 8종 */
  const dn = await shot(ctx, "document.querySelector('#tabbar [data-t=\"adv\"]').click();", [
    { n: '03 .pcb 골드',   q: '#dunw .pcb-g>i>.cic' },
    { n: '03 .pcb 다이아', q: '#dunw .pcb-d>i>.cic' },
    { n: '03 카드 입장권', q: '#dunw .dnc .sp.tk>em>.cic' },
    { n: '03 카드 보상 코인', q: '#dunw .dnc .pill>em>.cic' },
  ], '03 던전');

  /* 04 세부 팝업 — 같은 입장권을 다른 상자로 그린다 */
  const dg = await shot(ctx,
    "document.querySelector('#tabbar [data-t=\"adv\"]').click();"
    + " openDunDetail(DUNGEONS.find(function(d){ return d.id === 'gold'; }));",
    [{ n: '04 세부 입장권', q: '#dgdTki>.cic' },
     { n: '04 세부 버튼',   q: '#dgd .dgd-b .cic' }], '04 세부');

  /* 89 유물 · 10 상점 — 같은 `.pcb` 를 쓰는 나머지 두 화면(처방이 셋을 같이 움직이는지 본다) */
  const rl = await shot(ctx, "openRelw();", [
    { n: '89 .pcb 골드',    q: '#relw .pcb-g>i>.cic' },
    { n: '89 .pcb 다이아',  q: '#relw .pcb-d>i>.cic' },
    { n: '89 .pcb 유물조각', q: '#relw .pcb-r>i>.cic' },
  ], '89 유물');
  const sh = await shot(ctx, "openShopPage();", [
    { n: '10 .pcb 골드',   q: '#shopw .pcb-g>i>.cic' },
    { n: '10 .pcb 다이아', q: '#shopw .pcb-d>i>.cic' },
  ], '10 상점');

  await browser.close();

  /* ── 표 ──────────────────────────────────────────────────────────────── */
  /* 잉크 = 상자 × 자산 잉크비. `rot` 은 그 잉크를 화면 각도로 돌린 bbox(측정표가 재는 자리) */
  const ink = (r) => {
    const f = ratio[r.src] || { w: 1, h: 1 };
    const w = r.bw * f.w, h = r.bh * f.h;
    const t = Math.abs(r.deg) * Math.PI / 180, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
    return { w, h, rw: w * c + h * s, rh: w * s + h * c, area: w * h };
  };
  /* 눈금 = **잉크 면적의 제곱근**(«시각 덩치»). 394 규약 — 무엇을 재는지 먼저 적는다.
     동전은 정사각·입장권은 가로로 긴 티켓이라 «높이» 로 견주면 모양 차이가 크기 차이로 읽힌다. */
  const bulk = (r) => Math.sqrt(ink(r).area);
  const line = (r) => {
    const k = ink(r);
    const rot = Math.abs(r.deg) > 0.5 ? ' ∠' + r2(r.deg) + '° bbox ' + r2(k.rw) + '×' + r2(k.rh) : '';
    return '    ' + r.slot.padEnd(22) + ' ' + r.src.padEnd(24)
      + ' 상자 ' + String(r2(r.bw)).padStart(6) + '×' + String(r2(r.bh)).padEnd(6)
      + ' 잉크 ' + String(r2(k.w)).padStart(6) + '×' + String(r2(k.h)).padEnd(6)
      + ' 덩치 ' + String(r2(bulk(r))).padStart(6) + rot;
  };

  blk('[1] 기준선 — 23 훈련 팝업(주인이 지목한 자리)');
  tr.forEach((r) => console.log(line(r)));
  const base = tr.find((r) => r.slot.startsWith('23 훈련'));
  ok(!!base, '기준선 표본(훈련 탭 골드 아이콘)을 얻었다', base ? r2(ink(base).h) + 'px 잉크' : '없음');

  blk('[2] 03 던전 — .pcb 알약');
  dn.filter((r) => r.slot.includes('.pcb')).forEach((r) => console.log(line(r)));

  blk('[3] 03 던전 — 카드 입장권 (402: 던전마다 다른 그림)');
  const tks = dn.filter((r) => r.slot.includes('입장권'));
  tks.forEach((r) => console.log(line(r)));
  ok(tks.length >= 8, '입장권 표본 8종 이상', tks.length + '종 · ' + [...new Set(tks.map((t) => t.src))].length + '가지 그림');
  const tkH = tks.map((r) => bulk(r));
  ok(tks.length > 0 && Math.max(...tkH) / Math.min(...tkH) <= 1.05,
    '입장권 8종이 서로 같은 크기', tks.length ? '최대÷최소 ' + r2(Math.max(...tkH) / Math.min(...tkH)) : '표본 없음');

  blk('[4] 04 세부 팝업');
  dg.forEach((r) => console.log(line(r)));

  blk('[5] `.pcb` 를 쓰는 나머지 두 화면 (89 유물 · 10 상점)');
  rl.concat(sh).forEach((r) => console.log(line(r)));
  ok(rl.length + sh.length >= 4, '세 화면이 같은 `.pcb` 를 쓰는지 볼 표본', (rl.length + sh.length) + '자리');

  blk('[6] 기준선 대비 — «얼마나 작은가» (눈금 = √잉크면적 = 시각 덩치)');
  if (base) {
    const b = bulk(base);
    const cmp = dn.concat(dg).filter((r) => !r.slot.includes('버튼'));
    cmp.forEach((r) => {
      const k = bulk(r);
      console.log('    ' + r.slot.padEnd(22) + ' ' + String(r2(k)).padStart(6) + 'px'
        + '  기준선 대비 ' + (k >= b ? '+' : '') + r2((k / b - 1) * 100) + '%');
    });
    const small = cmp.filter((r) => bulk(r) < b * 0.97);
    ok(true, '기준선보다 작은 자리', small.length + '자리 / ' + cmp.length);
  }

  blk('[7] ref 잉크 상자 대비 — 측정표가 적어 둔 값 (03 §3-5-3 · 04 §6)');
  const REF = { '03 카드 입장권': [64, 50], '04 세부 입장권': [69, 54], '03 카드 보상 코인': [51, 53] };
  dn.concat(dg).forEach((r) => {
    const R = REF[r.slot]; if (!R) return;
    const k = ink(r);
    console.log('    ' + r.slot.padEnd(22) + ' 그려짐 ' + r2(k.rw) + '×' + r2(k.rh)
      + '  ref ' + R[0] + '×' + R[1]
      + '  → ' + r2((k.rw / R[0] - 1) * 100) + '% / ' + r2((k.rh / R[1] - 1) * 100) + '%');
  });
  ok(true, 'ref 상자 대비 표를 얻었다');

  if (JSON_OUT) {
    console.log('\nJSON ' + JSON.stringify({ ratio, tr, dn, dg, rl, sh }));
  }

  console.log('\nPROBE585 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
