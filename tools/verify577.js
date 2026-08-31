#!/usr/bin/env node
/* 게이트 577 — 「23 훈련 › 단련 헤더 [충전] 라벨은 **두 줄이고, 버튼 밖으로 새지 않는다**」
 * (2026-08-31 · 491 8회차 비평가 CH·CI·CJ 3인 독립 관측에서 등재)
 *
 *   node tools/verify577.js
 *
 * 수리 전: 라벨이 «🪨n → 포인트 m» 한 줄이라 버튼 폭 392 를 **7자리(≥1,000,000)부터** 넘겨
 * 스스로 접혔고, 접힌 2행은 `.cg`(height 64) 도 헤더(88) 도 안 자르므로 헤더 밑변 밖 **34px** 로
 * 새어 나가 1행 카드와의 **14px 거터**에 잉크 **9px**(높이의 31%)이 남았다.
 * 재현·자릿수 표는 `tools/probe577.js`.
 *
 * ⚑ 이 자가 «폭» 이 아니라 «줄 수» 를 묻는 이유 — 자릿수에는 상한이 없다.
 *   낱말을 빼도(«포인트»→«pt», 아예 삭제) 폰트를 24 로 줄여도 10자리에서 다시 넘고
 *   (`probe577` [6]), 버튼 좌단을 왼쪽으로 옮기는 길은 `verify491` [8-d] 의 사다리가
 *   최악 자릿수에서 **2px** 앞까지 차 있어 막혀 있다(`probe577` [5]).
 *   ⇒ 처방은 «줄 수를 값에 맡기지 않는 것» 이고, 그래서 §2 는 **자릿수 1~12 전부에서 정확히 2행**을,
 *   §3 은 **같은 표 전부에서 샌 잉크 0px** 을 묻는다. 한 자리만 물으면 자릿수 축이 다시 열린다.
 *
 * 절은 여섯 + 되돌림이다:
 *   §1 전제  — 상자·자리가 규약값이다(392×64 @ right 20 · top 12 · 헤더 88 · 카드 k0 top 102).
 *              이 값이 움직이면 §3·§4 의 좌표가 뜻을 잃으므로 먼저 못박는다.
 *   §2 줄 수 — 자릿수 1~12 에서 라벨이 **항상 2행**이다(값이 줄 수를 못 정한다).
 *   §3 샘     — 같은 표에서 «헤더 밑변 밖» 0px · «아래 카드와 겹침» 0px.
 *   §4 픽셀   — 찍힌 흰 잉크가 검정 링 **안쪽 띠**(local x 5..387 · y 5..59) 안이고,
 *              헤더 아래 거터 띠에는 흰 픽셀이 **0개**다(사람이 본 그것을 직접 센다).
 *   §5 두 벌  — 통짜 렌더와 `liveTemper()` 가 같은 문자열을 그린다(262 교훈 2ⓑ).
 *   §6 특이성 — `#trw i{display:inline-block}`(ID 급)을 이기는 스코프가 실제로 먹었다(519·531 함정).
 *   §R 되돌림 — CSS 를 걷으면 · 라벨을 한 줄로 되돌리면 **둘 다 빨개진다**. 그리고 6자리에서는
 *              옛 라벨도 안 샌다(= 이 자가 «이미 참인 것» 을 굳힌 게 아니라는 음성항).
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
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; openTrain();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { setTrSub('temper'); renderTrain(); });
  await page.waitForTimeout(300);
  const snap = n => page.evaluate(SNAP + '(' + n + ')');

  /* ══ §1 전제 — 상자·자리가 규약값이다 ══════════════════════════════════════ */
  console.log('\n=== §1 전제 — 이 자의 좌표가 딛고 선 값 ===');
  const s0 = await snap(1e6);
  ok(!!s0, '[1-a] 23 훈련 › 단련 헤더 [충전] 버튼을 찾았다');
  ok(s0.box.w === 392 && s0.box.h === 64,
    '[1-b] 버튼 상자가 **392×64** 다(577 은 상자를 안 건드린다)', s0.box.w + '×' + s0.box.h);
  ok(s0.box.top === 12 && s0.box.right === 20,
    '[1-c] 자리가 헤더 안 top 12 · right 20 이다 — `verify491` [8-d] 사다리 기하의 전제',
    'top=' + s0.box.top + ' right=' + s0.box.right);
  ok(s0.box.hdH === 88 && s0.box.k0Top === 102,
    '[1-d] 헤더 88 · 1행 카드 top 102(세로 예산 898 불변)',
    'hd=' + s0.box.hdH + ' k0=' + s0.box.k0Top);
  ok(p1(s0.gutter) === 14,
    '[1-e] 헤더 밑변 ↔ 1행 카드 사이 거터가 **14px** 이다 — 샌 잉크가 보이던 바로 그 띠',
    p1(s0.gutter) + 'px');

  /* ══ §2 줄 수를 값에 안 맡긴다 ═════════════════════════════════════════════ */
  console.log('\n=== §2 자릿수 1~12 — 라벨은 항상 2행 ===');
  const T = [];
  for (const d of DIGITS) T.push({ d, s: await snap(worst(d)) });
  const bad2 = T.filter(t => t.s.lines !== 2);
  T.forEach(t => console.log('      ' + String(t.d).padStart(2) + '자리 → ' + t.s.lines + '행 · 최대 폭 '
    + String(p1(t.s.wmax)).padStart(6) + ' · 버튼 밖 하 ' + p1(t.s.outB)
    + ' · 헤더 밖 ' + p1(t.s.outHd) + ' · 카드 밟음 ' + p1(t.s.hitCard)));
  ok(bad2.length === 0,
    '[2-a] ★ 1~12자리 **전부 정확히 2행** — 줄 수가 값을 안 탄다',
    bad2.length ? bad2.map(t => t.d + '자리=' + t.s.lines + '행').join(' · ') : '12/12');
  ok(T.every(t => t.s.wmax <= 392),
    '[2-b] 가장 긴 행도 버튼 폭 392 안이다 (12자리 최대 ' + p1(T[T.length - 1].s.wmax) + 'px)');
  ok(/<br>/.test(CODE.slice(CODE.indexOf('function temperHeadTxt'), CODE.indexOf('function temperHeadTxt') + 400)),
    '[2-c] 줄 나눔이 **선언**이다 — `temperHeadTxt` 가 `<br>` 로 못박는다(폭에 맡기지 않는다)');

  /* ══ §3 샌 잉크 0 ═════════════════════════════════════════════════════════ */
  console.log('\n=== §3 샌 잉크 — 버튼·헤더·카드 어디도 안 밟는다 ===');
  const leak = T.filter(t => t.s.outHd > 0 || t.s.hitCard > 0);
  ok(leak.length === 0,
    '[3-a] ★ 1~12자리 전부 **헤더 밑변 밖 0px · 1행 카드 밟음 0px**',
    leak.length ? leak.map(t => t.d + '자리 밖' + p1(t.s.outHd)).join(' · ') : '12/12 · 0px');
  ok(T.every(t => t.s.outB === 0 && t.s.outT === 0),
    '[3-b] 라벨이 버튼 상자 위·아래로도 안 나간다');
  ok(T.every(t => t.s.outL === 0 && t.s.outR === 0),
    '[3-c] 좌·우로도 안 나간다 — 폭이 모자라 옆으로 새는 자리도 없다');

  /* ══ §4 찍힌 픽셀 ═════════════════════════════════════════════════════════ */
  console.log('\n=== §4 찍힌 픽셀 — 흰 잉크가 검정 링 안쪽 띠 안이다 ===');
  {
    const g = await snap(worst(10));
    const clip = { x: Math.round(g.abs.bx), y: Math.round(g.abs.by), width: 392, height: 64 };
    const b = await page.screenshot({ clip });
    const px = await page.evaluate(SCAN, ['data:image/png;base64,' + b.toString('base64'),
      0, 0, 392, 64, null]);
    console.log('      버튼 안 흰 픽셀 ' + px.n + '개 · bbox x ' + px.minX + '..' + px.maxX
      + ' · y ' + px.minY + '..' + px.maxY);
    ok(px.n > 500, '[4-a] 버튼 안에 흰 글자가 실제로 칠해져 있다(이 절의 전제)', px.n + 'px');
    ok(px.minY >= 5 && px.maxY <= 58,
      '[4-b] ★ 흰 잉크가 **검정 링 안쪽 띠**(y 5..59) 안이다 — 링을 밟지 않는다',
      'y ' + px.minY + '..' + px.maxY);
    ok(px.minX >= 5 && px.maxX <= 386,
      '[4-c] 가로도 링 안쪽(x 5..387) 이다', 'x ' + px.minX + '..' + px.maxX);
    /* 사람이 본 그 자리 — 헤더 밑변 아래 거터 띠에 흰 픽셀이 있는가 */
    const gclip = { x: Math.round(g.abs.bx), y: Math.round(g.abs.hb), width: 392,
                    height: Math.max(1, Math.round(g.abs.kt - g.abs.hb)) };
    const gb = await page.screenshot({ clip: gclip });
    const gp = await page.evaluate(SCAN, ['data:image/png;base64,' + gb.toString('base64'),
      0, 0, gclip.width, gclip.height, null]);
    ok(gp.n === 0,
      '[4-d] ★ 헤더 아래 **14px 거터**에 흰 픽셀 0개 — 등재문이 「위 4px 만 보인다」고 적은 그 잉크가 없다',
      gp.n + 'px');
  }

  /* ══ §5 두 벌 금지 ════════════════════════════════════════════════════════ */
  console.log('\n=== §5 표기층 두 벌 금지 — 통짜 렌더 == liveTemper ===');
  {
    const r = await page.evaluate(() => {
      const w = $('trTemper');
      const read = () => w.querySelector('.tp-hd .cg i').innerHTML;
      S.tstone = 12345678; w.dataset.sig = ''; renderTrain();
      const full = read();
      rtHold = { tag: 'temper' };                 /* 홀드 중인 척 — liveTemper 경로로 그린다 */
      S.tstone = 87654321; renderTemper();
      const live = read();
      rtHold = null; S.tstone = 12345678; w.dataset.sig = ''; renderTrain();
      const full2 = read();
      return { full, live, full2 };
    });
    ok(/<br>/.test(r.live) && /<br>/.test(r.full),
      '[5-a] 두 경로 **다** 두 줄을 그린다(한쪽만 고치면 홀드 중에 한 줄로 돌아간다)');
    ok(r.live.replace(/87,654,321/g, 'N') === r.full.replace(/12,345,678/g, 'N'),
      '[5-b] 숫자만 빼면 두 경로의 마크업이 **글자 하나까지 같다**');
    ok(/87,654,321/.test(r.live) && /12,345,678/.test(r.full2),
      '[5-c] 두 경로가 각자 실제 값을 그린다(굳은 문자열이 아니다)');
  }

  /* ══ §6 특이성 ════════════════════════════════════════════════════════════ */
  console.log('\n=== §6 ID 급 특이성 함정(519·531 계열) ===');
  ok(s0.labDisp === 'block',
    '[6-a] ★ 라벨 `<i>` 의 computed display 가 **block** 이다 — `#trw i{display:inline-block}`(1,0,1)을 이겼다',
    'display=' + s0.labDisp);
  ok(/#trw \.tr-temp>\.tp-hd>\.cg>i\{/.test(CODE.replace(/\s+/g, ' ').replace(/ \{/g, '{')) ||
     /#trw \.tr-temp>\.tp-hd>\.cg>i/.test(CODE),
    '[6-b] 그 스코프가 소스에 **ID 급으로** 적혀 있다(클래스 급으로 낮추면 조용히 무시된다)');

  /* ══ §R 되돌림 ════════════════════════════════════════════════════════════ */
  console.log('\n=== §R 되돌림 시험 — 무르게 풀지 않았음을 층마다 못박는다 ===');
  {
    /* R-1 — 577 이 깐 CSS 두 줄을 걷어낸 사본 */
    const killed = await page.evaluate(() => {
      const k = [];
      for (const sh of document.styleSheets) {
        let rs; try { rs = sh.cssRules; } catch (e) { continue; }
        for (let i = rs.length - 1; i >= 0; i--) {
          const st = (rs[i].selectorText || '').replace(/\s+/g, '');
          if (rs[i].type === 1 && (st === '#trw.tr-temp>.tp-hd>.cg>i' || st === '.tr-temp>.tp-hd>.cg.cic')) {
            k.push({ i, text: rs[i].cssText, sh }); sh.deleteRule(i);
          }
        }
      }
      window.__k577 = k;
      return k.length;
    });
    ok(killed === 2, '[R-a] 걷어낸 규칙이 정확히 2줄이다(라벨 블록 + 아이콘 정렬)', killed + '줄');
    const rv = await snap(worst(10));
    ok(rv.labDisp !== 'block' && (rv.outB > 0 || rv.outHd > 0),
      '[R-b] ★ CSS 를 걷으면 라벨이 다시 인라인이 되고 **버튼 밖으로 샌다**(수리 전)',
      'display=' + rv.labDisp + ' · 버튼 밖 하 ' + p1(rv.outB) + ' · 헤더 밖 ' + p1(rv.outHd));
    await page.evaluate(() => { window.__k577.reverse().forEach(x => x.sh.insertRule(x.text, x.i)); });
    const rr = await snap(worst(10));
    ok(rr.labDisp === 'block' && rr.outHd === 0,
      '[R-c] 되돌리면 다시 안 샌다 — 사본이 트리를 오염시키지 않았다');
  }
  {
    /* R-2 — 라벨을 수리 전 «한 줄» 로 되돌린 사본. 폭이 뿌리였음을 자릿수 축에서 못박는다. */
    const oldLine = async n => page.evaluate(v => {
      const w = $('trTemper');
      S.tstone = v; w.dataset.sig = ''; renderTrain();
      /* ⚠ `renderTrain()` 이 헤더를 통째로 갈아 끼우므로 `<i>` 는 **그 뒤에** 잡는다 */
      const lab = w.querySelector('.tp-hd .cg i');
      const have = Math.floor(S.tstone) || 0;
      lab.innerHTML = curIc('tstone', 34) + fmt(have) + ' → 포인트 '
                    + fmt(Math.floor(have / TEMPER_PT_COST));      /* 577 이전의 그 문자열 */
      lab.style.cssText = 'display:inline-block;line-height:64px;font-size:29px;height:auto;margin-top:0';
      const cg = w.querySelector('.tp-hd .cg'), hd = w.querySelector('.tp-hd'), k0 = w.querySelector('.tr-tp.k0');
      const rg = document.createRange(); rg.selectNodeContents(lab);
      const rows = [];
      [...rg.getClientRects()].forEach(r => {
        if (r.width < 0.5 || r.height < 0.5) return;
        const c = (r.top + r.bottom) / 2;
        const g = rows.find(g => Math.abs((g.top + g.bottom) / 2 - c) < 20);
        if (g) { g.top = Math.min(g.top, r.top); g.bottom = Math.max(g.bottom, r.bottom); }
        else rows.push({ top: r.top, bottom: r.bottom });
      });
      rows.sort((a, b) => a.top - b.top);
      const H = hd.getBoundingClientRect(), K = k0.getBoundingClientRect();
      const last = rows[rows.length - 1];
      const out = { lines: rows.length, outHd: Math.max(0, last.bottom - H.bottom),
                    seen: Math.max(0, Math.min(last.bottom, K.top) - Math.max(last.top, H.bottom)) };
      lab.style.cssText = ''; w.dataset.sig = ''; renderTrain();
      return out;
    }, n);
    const o6 = await oldLine(worst(6)), o7 = await oldLine(worst(7)), o10 = await oldLine(worst(10));
    ok(o7.lines === 2 && o7.outHd > 0,
      '[R-d] ★ 옛 한 줄 라벨은 **7자리에서 접혀 헤더 밖으로 샌다**',
      '행=' + o7.lines + ' · 헤더 밖 ' + p1(o7.outHd) + 'px · 거터에 보임 ' + p1(o7.seen) + 'px');
    ok(o10.outHd > 0, '[R-e] 10자리도 같다', '헤더 밖 ' + p1(o10.outHd) + 'px');
    ok(o6.lines === 1 && o6.outHd === 0,
      '[R-f] ★ 음성항 — 옛 라벨도 **6자리까지는 안 샌다**. 이 자는 «이미 참인 것» 을 굳힌 게 아니라 '
      + '자릿수 축을 닫았다', '행=' + o6.lines + ' · 헤더 밖 ' + p1(o6.outHd) + 'px');
    const back = await snap(worst(10));
    ok(back.lines === 2 && back.outHd === 0, '[R-g] 사본을 걷은 뒤 제품이 그대로다');
  }

  ok(errs.length === 0, '[Z] 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');
  await browser.close();
  console.log('\nVERIFY577 ' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
