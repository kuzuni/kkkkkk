#!/usr/bin/env node
/* 게이트 — 작업 377 「13 재화 탭 광고 카드의 수량 라벨(`.qt`)이 카드 밖으로 안 나간다」
 *
 *   node tools/verify377.js
 *
 * 결함(2026-08-29 등재, 356 3회차 비평가 AT·AU 2인 독립 일치):
 *   «보석 ×100» 칸의 수량 라벨 **잉크**(검정 외곽선 8px 의 절반 4px 포함)가 카드 우변을 넘어
 *   `.cn-cd{overflow:hidden}` 에 잘리고, 흰 채움이 카드 검정 테(`.fr` border 7px) 위로 올라탔다.
 *
 * ⚑ **자를 잘못 대면 이 결함은 안 보인다.** 그래서 이 게이트는 상자가 아니라 **찍힌 픽셀**을 잰다:
 *   · `scrollWidth == clientWidth` (넘침 0) · `.qt` 의 rect 우변도 카드 안쪽 2.87px
 *   → 상자 자·overflow 자로는 셋 다 «정상» 이라고 답한다. 잰 것이 advance 이지 잉크가 아니기 때문이다.
 *
 * 지키는 성질
 *   [전제] 하네스 — 정식 경로로 13 재화 탭이 열리고 광고 칸이 4개다
 *   [A] 네 칸 전부 라벨 잉크가 **카드 검정 테 안쪽**에 들어온다(테까지 여유 ≥ 6px)
 *   [B] 화면 픽셀 — 흰 채움과 검정 테 사이에 여백이 있다(사람이 보는 결함이 사라졌는가)
 *   [C] 레퍼런스 대조(측정표 §5-3 · 6회차 정오) — «×50» 잉크폭 81 · «×100» 97.5 에서 ±5 이내
 *   [D] 네 칸의 `qx` 가 **같다** — 한 칸만 줄이면 이웃과 글자 폭이 19% 어긋난다.
 *       레퍼런스는 두 문자열을 같은 크기로 쓴다(§5-3 fs(라틴) ×100·×50 둘 다 42.9)
 *   [E] 넘침은 **열 위치와 무관**하다 — 같은 문자열의 칸은 좌·우열에서 카드 기준 dx 가 같다
 *       (등재문이 뿌리로 지목한 «365 의 4종 2열 재배치» 를 기각하는 항. 365 **이전 커밋**에서도
 *        같은 +1px 넘침이 재현된다 — `node tools/probe377.js <옛 사본>`)
 *   [F] 자르는 조상은 그대로다 — `.cn-cd{overflow:hidden}` 를 풀어서 «해결» 한 것이 아니다
 *   [R] 되돌림 시험 — `qx` 를 옛 1.24 로 되돌린 **사본**에서는 [A]·[B] 가 빨개진다
 *       (무르게 푼 수리가 아님의 증명. 여기가 0 이면 이 게이트는 헛초록이다)
 *   [G] 콘솔 에러 0
 *
 * [3]-(가) 기계적 검증 — 레퍼런스 «대조» 는 측정표에 적힌 수치와의 산술 비교라 비평가를 안 띄운다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const SRC = path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;

/* 측정표 §5-3(ref ② 공물 «×50» 잉크 81×30) · index.html 6회차 정오(ref ① «×100» 잉크 97~98×31) */
const REF = { '×50': 81, '×100': 97.5 };
const TOL = 5;
const OLD_QX = '1.24', NEW_QX = '1.08';

let pass = 0, fail = 0;
const is = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : ' FAIL ') + m); };
const r1 = (v) => Math.round(v * 100) / 100;

/* 페이지를 열고 13 재화 탭까지 간다(cap13 하네스와 같은 정식 경로) */
const open = async (ctx, url) => {
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopPage === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    window.step = () => {};
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.dia = 30000; S.gold = 1e9; S.relic = 5000;
    S.daily = S.daily || {}; S.daily.adBuy = {};
    openShopPage();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('#shopCats [data-cat]')].find(x => x.dataset.cat === 'coin');
    if (t) t.click();
  });
  await page.waitForTimeout(700);
  /* ⚠ 122 «상시 연출» 은 의사요소에도 걸려 있어 요소 인라인 `animation:none` 으로는 안 멈춘다 */
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important}';
    document.head.appendChild(st);
  });
  await page.waitForTimeout(150);
  return { page, errs };
};

/* 라벨의 «잘리지 않았다면 어디까지 가는가» — 계산 스타일을 그대로 복사한 사본을 마젠타 판 위에
   띄워 찍고 잉크 bbox 를 재서 실제 상자에 되붙인다(probe377 과 같은 자). */
const measure = async (page) => {
  const M = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.shp-list.coin .cn-cd:not(.dia):not(.rel):not(.dtk)')];
    const HX = 60, HY = 300, PAD = 240, PITCH = 60;
    const host = document.createElement('div');
    host.id = '__v377host';
    host.style.cssText = 'position:fixed;left:' + HX + 'px;top:' + HY + 'px;width:900px;height:'
      + (10 + cards.length * PITCH + 50) + 'px;background:#FF00FF;z-index:2147483647;'
      + 'overflow:visible;pointer-events:none';
    document.body.appendChild(host);
    const CP = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'color', 'white-space', 'text-indent', 'transform', 'transform-origin', 'paint-order',
      '-webkit-text-stroke-width', '-webkit-text-stroke-color'];
    const out = cards.map((c, i) => {
      const q = c.querySelector('.qt');
      const cr = c.getBoundingClientRect(), qr = q.getBoundingClientRect();
      const cs = getComputedStyle(q);
      const clone = document.createElement('div');
      clone.textContent = q.textContent;
      CP.forEach(k => clone.style.setProperty(k, cs.getPropertyValue(k)));
      clone.style.position = 'absolute';
      clone.style.left = PAD + 'px';
      clone.style.top = (10 + i * PITCH) + 'px';
      clone.style.height = cs.height;
      host.appendChild(clone);
      const clr = clone.getBoundingClientRect();
      return { txt: q.textContent, card: { l: cr.left, r: cr.right }, qt: { l: qr.left, r: qr.right },
        qx: getComputedStyle(c).getPropertyValue('--qx').trim(),
        scrollOver: q.scrollWidth - q.clientWidth, cloneL: clr.left - HX };
    });
    return { cards: out, host: { x: HX, y: HY, w: 900, h: 10 + cards.length * PITCH + 50 }, pitch: PITCH };
  });
  const shot = (await page.screenshot({ clip: { x: M.host.x, y: M.host.y, width: M.host.w, height: M.host.h } })).toString('base64');
  const rows = await page.evaluate(async ([b64, hw, hh]) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = hw; cv.height = hh;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, hw, hh).data;
    const out = [];
    for (let y = 0; y < hh; y++) {
      let l = -1, r = -1;
      for (let x = 0; x < hw; x++) {
        const o = (y * hw + x) * 4;
        if (Math.max(255 - d[o], d[o + 1], 255 - d[o + 2]) > 40) { if (l < 0) l = x; r = x; }
      }
      out.push([l, r]);
    }
    return out;
  }, [shot, M.host.w, M.host.h]);
  await page.evaluate(() => { const h = document.getElementById('__v377host'); if (h) h.remove(); });

  return M.cards.map((c, i) => {
    const y0 = Math.max(0, 10 + i * M.pitch - 12), y1 = Math.min(M.host.h - 1, 10 + i * M.pitch + 42);
    let l = Infinity, r = -Infinity;
    for (let y = y0; y <= y1; y++) { const [a, z] = rows[y]; if (a >= 0) { l = Math.min(l, a); r = Math.max(r, z); } }
    const inkR = c.qt.l + ((r + 1) - c.cloneL), inkL = c.qt.l + (l - c.cloneL);
    return { txt: c.txt, qx: c.qx, scrollOver: c.scrollOver,
      cardR: c.card.r, rim: c.card.r - 7,            // `.fr` 검정 테 안쪽 우변
      inkW: (r + 1) - l, inkR, dxR: inkR - c.card.l, dxL: inkL - c.card.l,
      slack: (c.card.r - 7) - inkR };                // 검정 테까지 여유(음수면 테 위로 올라탄다)
  });
};

/* 화면 픽셀 — 라벨 띠에서 흰 채움의 우변 */
const whiteRight = async (page) => {
  const band = await page.evaluate(() => {
    const c = document.querySelector('.shp-list.coin .cn-cd:not(.dia):not(.rel):not(.dtk)');
    const q = c.querySelector('.qt'), cr = c.getBoundingClientRect(), qr = q.getBoundingClientRect();
    return { x: Math.floor(cr.left), y: Math.floor(qr.top) - 6, w: Math.ceil(cr.width), h: Math.ceil(qr.height) + 12, rim: cr.right - 7 };
  });
  const shot = (await page.screenshot({ clip: { x: band.x, y: band.y, width: band.w, height: band.h } })).toString('base64');
  const wr = await page.evaluate(async ([b64, w, h]) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let r = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (d[o] > 235 && d[o + 1] > 235 && d[o + 2] > 235) r = Math.max(r, x);
    }
    return r;
  }, [shot, band.w, band.h]);
  return { white: band.x + wr, rim: band.rim };
};

(async () => {
  console.log('=== VERIFY 377 — 13 재화 광고 카드 수량 라벨이 카드 밖으로 안 나간다 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');

  /* [R] 용 «수리 전» 사본 — 상대 경로 자산(웹폰트 126) 때문에 **반드시 같은 폴더**에 둔다.
     ⚑ 이것은 취향이 아니라 실측이다: 저장소 밖(/tmp)에 두면 GameKR 이 안 붙어 글자 폭이 통째로
     달라지고, 같은 커밋인데 넘침이 +1 → +3 으로 바뀐다(1회차에 실제로 그랬다). */
  const revSrc = src.replace(/qx:1\.08/g, 'qx:' + OLD_QX);
  const revPath = path.join(path.dirname(SRC), '.verify377-rev.html');
  fs.writeFileSync(revPath, revSrc);
  process.on('exit', () => { try { fs.unlinkSync(revPath); } catch (e) {} });

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

  const cur = await open(ctx, 'file://' + SRC);
  const M = await measure(cur.page);
  is(M.length === 4, '[전제] 13 재화 탭 광고 칸 ' + M.length + '개(4)');
  is(M.some(c => c.txt === '×100'), '[전제] «×100» 칸이 있다 — ' + M.map(c => c.txt).join(' · '));

  console.log('\n[A] 라벨 잉크가 카드 검정 테 안쪽에 들어온다 (외곽선 4px 포함 · 사본 실측)');
  M.forEach(c => is(c.slack >= 6,
    '  A ' + c.txt.padEnd(5) + ' 잉크폭 ' + c.inkW + ' · 우변 dx' + r1(c.dxR)
    + ' · 검정 테(dx' + r1(c.rim - (c.cardR - 278)) + ')까지 여유 ' + r1(c.slack) + 'px ≥ 6'));
  /* «상자 자로는 안 보인다» 를 게이트가 스스로 기록한다 — 다음 세션이 같은 자를 다시 대지 않게 */
  is(M.every(c => c.scrollOver === 0),
    '  A-b 같은 칸을 advance 자로 재면 넘침 0 이다(scrollWidth==clientWidth) — **이 자로는 결함이 안 보인다**');

  console.log('\n[B] 화면 픽셀 — 흰 채움과 검정 테 사이 여백');
  const w0 = await whiteRight(cur.page);
  is(w0.white <= w0.rim - 6, '  B 흰 채움 우변 ' + w0.white + ' ≤ 검정 테 안쪽 ' + r1(w0.rim)
    + ' − 6 (여유 ' + r1(w0.rim - w0.white) + 'px)');

  console.log('\n[C] 레퍼런스 대조 — 측정표 §5-3 «×50» 81 · 6회차 정오 «×100» 97.5 (±' + TOL + ')');
  M.forEach(c => {
    const ref = REF[c.txt];
    if (ref == null) { is(true, '  C ' + c.txt + ' — ref 목표폭 없음(대조 생략)'); return; }
    is(Math.abs(c.inkW - ref) <= TOL, '  C ' + c.txt.padEnd(5) + ' 잉크폭 ' + c.inkW + ' vs ref ' + ref
      + ' (Δ' + r1(c.inkW - ref) + ')');
  });

  console.log('\n[D] 네 칸의 글자 폭 보정이 같다 — 한 칸만 줄이면 이웃과 어긋난다');
  is(new Set(M.map(c => c.qx)).size === 1, '  D `--qx` 4칸 동일 — ' + [...new Set(M.map(c => c.qx))].join(' / '));
  is(M.every(c => c.qx === NEW_QX), '  D-b `--qx` = ' + NEW_QX + ' (레퍼런스 잉크폭 역산값)');

  console.log('\n[E] 넘침은 열 위치와 무관 — 같은 문자열은 좌·우열에서 카드 기준 dx 가 같다');
  {
    const g = {};
    M.forEach(c => { (g[c.txt] = g[c.txt] || []).push(c.dxR); });
    const multi = Object.entries(g).filter(([, v]) => v.length > 1);
    is(multi.length > 0 && multi.every(([, v]) => v.every(x => Math.abs(x - v[0]) < 0.5)),
      '  E ' + multi.map(([k, v]) => k + ' dx' + v.map(r1).join('/')).join(' · ')
      + ' — 365 의 «2열 재배치» 는 뿌리가 아니다');
  }

  console.log('\n[F] 자르는 조상은 그대로다 — overflow 를 풀어서 «해결» 한 것이 아니다');
  {
    const ov = await cur.page.evaluate(() => {
      const c = document.querySelector('.shp-list.coin .cn-cd');
      const s = getComputedStyle(c); return s.overflow + ' / r' + parseFloat(s.borderTopRightRadius);
    });
    is(/hidden/.test(ov), '  F `.cn-cd` overflow = ' + ov);
  }

  console.log('\n[R] 되돌림 시험 — `qx` 를 옛 ' + OLD_QX + ' 로 되돌린 사본에서는 [A]·[B] 가 빨개진다');
  {
    const rev = await open(ctx, 'file://' + revPath);
    const RM = await measure(rev.page);
    const r100 = RM.find(c => c.txt === '×100');
    is(!!r100 && r100.slack < 0, '  R-a 사본 «×100» 잉크가 검정 테 위로 올라탄다 — 여유 '
      + (r100 ? r1(r100.slack) : '—') + 'px < 0 (0 이상이면 이 게이트는 헛초록이다)');
    is(!!r100 && r100.inkR > r100.cardR, '  R-b 사본 «×100» 잉크 우변 ' + (r100 ? r1(r100.inkR) : '—')
      + ' > 카드 우변 ' + (r100 ? r1(r100.cardR) : '—') + ' = `overflow:hidden` 에 잘린다');
    const w1 = await whiteRight(rev.page);
    is(w1.white > w1.rim, '  R-c 사본 흰 채움 우변 ' + w1.white + ' > 검정 테 안쪽 ' + r1(w1.rim));
    is(rev.errs.length === 0, '  R-d 사본 콘솔 에러 ' + rev.errs.length + '건');
    await rev.page.close();
  }

  is(cur.errs.length === 0, '\n[G] 콘솔 에러 ' + cur.errs.length + '건'
    + (cur.errs.length ? ' — ' + cur.errs[0].slice(0, 140) : ''));

  await browser.close();
  console.log('\nVERIFY377 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
