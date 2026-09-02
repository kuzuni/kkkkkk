#!/usr/bin/env node
/* 게이트 577 — 「[충전] 버튼·두 줄 라벨은 **폐지된 채로 남는다**」 (613 방향 전환, 2026-08-31)
 *
 *   node tools/verify577.js
 *
 * ⚑ 613(주인 지시 2026-09-01: «단련석으로 바로 단련» · «포인트 표시부를 없애라»)이 [충전] 버튼과
 *   «단련석 → 포인트» 전환 단계를 **기능째 폐지**했다. 577 의 원래 주제(라벨 두 줄·자릿수 샘)는
 *   대상이 사라져 같이 닫혔다 — 그 재현·자릿수 표는 `tools/probe577.js` 와 review 577 에 남아 있다.
 *
 * 333·399 규약(«죽은 분기와 게이트 항을 같이 걷어내되 자리는 비우지 않는다»)대로 이 자는
 * 방향을 뒤집는다 — **[충전]이 되살아나면 빨갛다**:
 *   §1 노드   — 단련 탭에 `.cg`·`[data-tpchg]` 가 0개 · 헤더는 «단련석 보유» 한 줄(.pv)뿐이다.
 *   §2 선언   — temperCharge/temperChargeBtn/rtChargeHold/TEMPER_PT_COST 가 소스에서 선언째 없다.
 *   §3 표시   — 헤더가 «현재 단련석 개수» 를 아이콘과 함께 말한다(주인 보강 원문 그대로).
 *   §4 두 벌  — 통짜 렌더와 liveTemper() 가 같은 헤더 문자열을 그린다(262 교훈 2ⓑ — 살아남은 항).
 *
 * ⚠ 옛 §1~§6(라벨 두 줄·잉크 좌표)을 «숫자만 고쳐» 되살리지 마라 — 대상 노드가 없다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 자릿수 d 의 최악값(9·99·999…) — 값이 아니라 «자릿수» 가 이 결함의 축이다 */
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const worst = d => Math.pow(10, d) - 1;

/* 브라우저 안에서 한 자릿수를 그리고 «행 · 샘 · 상자» 를 한 번에 돌려주는 프로브.
   ⚠ 행은 `.cg` 가 아니라 라벨 `<i>` **의 내용**을 재야 한다 — `.cg` 를 재면 `<i>` 블록의
     테두리 상자가 한 행으로 더 세어진다(probe577 첫 시안의 오독).
   ⚠ 아이콘(<img class=cic>)과 글자 em 상자는 같은 행에서도 top 이 다르므로 **중심**으로 묶는다. */
const SNAP = `(n => {
  S.tstone = n;
  const w = $('trTemper'); if (!w) return null;
  w.dataset.sig = '';                        /* 서명 우회 — 통짜 렌더를 강제한다 */
  renderTrain();
  const L = document.getElementById('fxl'); if (L) L.innerHTML = '';   /* 플로터 잔상 배제 */
  const cg = w.querySelector('.tp-hd .cg'), hd = w.querySelector('.tp-hd'), k0 = w.querySelector('.tr-tp.k0');
  const lab = cg.querySelector('i');
  const rg = document.createRange(); rg.selectNodeContents(lab);
  const rows = [];
  [...rg.getClientRects()].forEach(r => {
    if (r.width < 0.5 || r.height < 0.5) return;
    const c = (r.top + r.bottom) / 2;
    const g = rows.find(g => Math.abs((g.top + g.bottom) / 2 - c) < 13);
    if (g) { g.left = Math.min(g.left, r.left); g.right = Math.max(g.right, r.right);
             g.top = Math.min(g.top, r.top); g.bottom = Math.max(g.bottom, r.bottom); }
    else rows.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
  });
  rows.sort((a, b) => a.top - b.top);
  const B = cg.getBoundingClientRect(), H = hd.getBoundingClientRect(), K = k0.getBoundingClientRect();
  const last = rows[rows.length - 1] || { top: 0, bottom: 0, left: 0, right: 0 };
  return {
    text: cg.textContent.trim(),
    lines: rows.length,
    wmax: Math.max.apply(null, rows.map(r => r.right - r.left)),
    /* 라벨 잉크가 버튼 상자 밖으로 나간 양(네 변) */
    outT: Math.max(0, B.top - rows[0].top), outB: Math.max(0, last.bottom - B.bottom),
    outL: Math.max(0, B.left - Math.min.apply(null, rows.map(r => r.left))),
    outR: Math.max(0, Math.max.apply(null, rows.map(r => r.right)) - B.right),
    outHd: Math.max(0, last.bottom - H.bottom),               /* 헤더 밑변 밖 */
    hitCard: Math.max(0, last.bottom - K.top),                /* 1행 카드를 밟은 양 */
    gutter: K.top - H.bottom,
    labDisp: getComputedStyle(lab).display,
    box: { w: B.width, h: B.height, top: B.top - H.top, right: H.right - B.right,
           hdH: H.height, k0Top: K.top - H.top },
    abs: { bx: B.left, by: B.top, hb: H.bottom, kt: K.top }
  };
})`;

/* 찍힌 픽셀 — 캡처를 data URL 로 페이지에 되돌려 실제로 칠해진 흰 잉크를 센다(350 처방).
   `elementFromPoint` 는 못 쓴다(글자에는 히트 영역이 없다). */
/* ⚠ 문자열이 아니라 **함수**로 넘긴다 — playwright 는 첫 인자가 문자열이면 «식» 으로 보고
   두 번째 인자를 아예 안 준다(첫 시안이 그래서 `undefined` 를 받았다). */
const SCAN = ([url, x0, y0, w, h, band]) => new Promise(res => {
  const im = new Image();
  im.onload = () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(im, -x0, -y0);
    const d = g.getImageData(0, 0, w, h).data;
    let n = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, bandN = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      /* ⚠ 임계 250 — 헤더 면색 `#FFFDF2`(255,253,242)가 radius 18 코너로 비쳐 들어온다.
         240 으로 잡으면 그 크림이 «흰 잉크» 로 세어져 bbox 가 상자 전체가 된다(첫 시안). */
      if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250 || d[i + 3] < 200) continue;
      n++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (band && y >= band[0] && y < band[1]) bandN++;
    }
    res({ n, minX, minY, maxX, maxY, bandN });
  };
  im.src = url;
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  console.log('=== §1 노드 — [충전]이 화면에서 죽어 있다 ===');
  const n1 = await page.evaluate(() => {
    S.tstone = 1234567; S.temper = { alloc: { atk: 5, hp: 0, regen: 0 } };
    openTrain(); setTrSub('temper'); renderTrain();
    const w = document.getElementById('trTemper');
    return {
      cg: w.querySelectorAll('.cg').length,
      chg: document.querySelectorAll('[data-tpchg]').length,
      pv: w.querySelectorAll('.tp-hd .pv').length,
      kids: w.querySelectorAll('.tp-hd > *').length
    };
  });
  ok(n1.cg === 0 && n1.chg === 0, '[1-a] `.cg`·`[data-tpchg]` 노드 0개 — [충전]이 되살아나지 않았다',
    JSON.stringify(n1));
  ok(n1.pv === 1 && n1.kids === 1, '[1-b] 헤더 자식은 보유 줄(.pv) 하나뿐이다', n1.kids + '개');

  console.log('\n=== §2 선언 — 전환 계열이 선언째 없다(죽은 코드 금지) ===');
  const live = await page.evaluate(() => ({
    charge: typeof temperCharge, chargeBtn: typeof temperChargeBtn,
    hold: typeof rtChargeHold, cost: typeof TEMPER_PT_COST
  }));
  ok(Object.values(live).every(v => v === 'undefined'),
    '[2-a] temperCharge/temperChargeBtn/rtChargeHold/TEMPER_PT_COST 전부 undefined', JSON.stringify(live));
  ok(!/data-tpchg\s*=/.test(CODE) && !/closest\(\s*'\[data-tpchg\]'/.test(CODE),
    '[2-b] 소스에 data-tpchg 마크업·리스너가 없다(주석 언급은 허용)');
  ok(!/function rtChargeHold|const temperCharge\b/.test(CODE),
    '[2-c] 소스에 전환 함수 선언이 없다(주석 언급은 허용)');

  console.log('\n=== §3 표시 — 헤더 = 현재 단련석 개수(주인 보강) ===');
  const disp = await page.evaluate(() => {
    S.tstone = 987654; renderTemper();
    const i = document.querySelector('#trTemper .tp-hd .pv i');
    return { html: i ? i.innerHTML : '', txt: i ? i.textContent : '' };
  });
  ok(/cur-tstone\.svg/.test(disp.html), '[3-a] 단련석 아이콘(.cic)으로 화폐를 말한다(125)');
  /* ⚑ 688 이관(2026-09-02, 주인 지시) — 333 처방: 자리를 비우지 않고 **방향만** 뒤집었다.
     이 항이 지키던 뜻은 «보유 개수가 그대로 찍힌다» 이고 그건 그대로다. 한글 라벨은 이제
     금지이므로 «있어야 한다» 를 «수(콤마)뿐이어야 한다» 로 갈아 끼운다(라벨이 돌아오면 빨강). */
  ok(/987,?654/.test(disp.txt) && /^[\d,]+$/.test(disp.txt.trim()),
    '[3-b] «(아이콘) 987,654» — 보유 개수가 그대로 찍힌다(688 — 한글 재화명 0자)', disp.txt.trim());
  ok(!/포인트|pt\b/.test(disp.txt), '[3-c] «포인트» 라는 말이 헤더에서 사라졌다', disp.txt.trim());

  console.log('\n=== §4 두 벌 — 통짜 렌더 ≡ liveTemper() (262 교훈 2ⓑ) ===');
  const same = await page.evaluate(() => {
    const read = () => document.querySelector('#trTemper .tp-hd .pv i').innerHTML;
    S.tstone = 40; S.temper = { alloc: { atk: 0, hp: 0, regen: 0 } };
    openTrain(); setTrSub('temper'); renderTrain();
    rtHold = { tag: 'temper' };
    S.tstone = 7; renderTemper();          /* 홀드 경로 → liveTemper 가 그린다 */
    const liveTxt = read();
    rtHold = null; renderTemper();          /* 통짜 경로 */
    const fullTxt = read();
    return { liveTxt, fullTxt, moved: /7/.test(fullTxt) };
  });
  ok(same.moved, '[4-a] 대조군 — 통짜 렌더가 실제로 새 값(7)을 말한다');
  ok(same.liveTxt === same.fullTxt, '[4-b] 홀드 중 문자열과 통짜 문자열이 한 글자도 다르지 않다');

  ok(errs.length === 0, '[Z] 콘솔 에러 0건', errs.slice(0, 3).join(' / '));

  await browser.close();
  console.log('\nverify577: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
