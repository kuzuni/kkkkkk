#!/usr/bin/env node
/* 작업 935 — 89 유물 «가격 알약» 모서리 반지름의 **재현자**(338 규칙: 처방 전에 재현부터).
 *
 *   node tools/probe935.js            # ref ↔ 우리를 **같은 함수**로 재고 Δ 를 찍는다
 *   node tools/probe935.js --keep     # 캡처를 docs/review 에 남긴다
 *
 * ── 왜 자를 또 세우는가(등재문이 «한 자» 라고 적어 두었다) ──────────────────
 * 935 의 근거는 `probe904.js` [6] **한 줄**이다 — «최외곽 열(x184)이 24행 중 20행 어둡다».
 * 그 자는 **열 하나**만 보므로, 모서리가 둥근지 각진지는 갈라도 **얼마나** 둥근지는
 * 한 점에서 역산한다(반지름 ≈ (h − 곧은 변)/2). 여기서는 축을 바꿔 **모서리 곡선 전체**를
 * 본다 — 행마다 «속 색이 어디서 시작하는가»(들여쓰기 프로파일)를 재고 그 프로파일에
 * 원호를 맞춘다. 두 자가 같은 답을 내면 관측이 자 하나의 버릇이 아니다.
 *
 * ── 이 자의 규약(정의를 밝힌다 — 334 규약) ─────────────────────────────────
 *   눈금  : 알약 **속** 색 `#191614` — ref 와 우리가 **같은 값**이라 문턱이 갈릴 자리가 없다
 *           (904 가 고른 것과 같은 씨앗. 904 는 그 씨앗으로 **바깥 상자**를 쟀고,
 *            이 자는 같은 씨앗으로 **모서리 곡선**을 잰다.)
 *   표본  : 속 띠의 각 행에서 속 색의 **좌·우 최외곽**(가운데 아이콘·숫자 잉크는 안 센다).
 *   맞춤  : 들여쓰기 d(i) = r − √(r² − (r − dy)²) (dy = 그 행이 띠 끝에서 떨어진 거리)
 *           를 r 격자(0.05 걸음)로 최소제곱. **속** 반지름이라 CSS 바깥 반지름과는
 *           테 두께만큼 다르다(크로미움: 안쪽 반지름 = 바깥 − 테, 0 에서 바닥).
 *   [R]   : 우리 알약에 stadium(= 높이 절반)을 **다시 씌우면** 프로파일이 수리 전으로
 *           되돌아간다 — 이 항이 빨개지면 이 자가 반지름 축을 안 보고 있는 것이다.
 *
 * ⚠ 이 자는 «어느 쪽이 옳은가» 를 안 정한다 — ref 를 그대로 옮겨 적을 뿐이다.
 *   736 «양 끝은 원» 규약이 이 부품에 적용되는가는 935 의 review 가 답한다.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const PNG = require('./png913').PNG();
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const REF = path.join(ROOT, 'docs/ref/89-유물-팝업.png');
const K = 1080 / 486;              /* 813·859·866·904 가 쓰는 것과 같은 환산 */
const FILL = [0x19, 0x16, 0x14];   /* 알약 속(두 그림이 같은 색) */
const FILL_TOL = 6;
const REF_WIN = [176, 585, 310, 625];
const STADIUM = 26.65;             /* 수리 전 CSS radius(= 높이 절반) */

let pass = 0, fail = 0;
const ok = (c, t, got) => { if (c) { pass++; console.log('PASS ' + t + (got ? ' — ' + got : '')); }
  else { fail++; console.log('FAIL ' + t + (got ? ' — ' + got : '')); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ── 화소 접근 ── */
function readPng(file) {
  const d = PNG.sync.read(fs.readFileSync(file));
  const at = (x, y) => { const i = (d.width * y + x) << 2;
    return [d.data[i], d.data[i + 1], d.data[i + 2]]; };
  return { w: d.width, h: d.height,
    lum: (x, y) => { const p = at(x, y); return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]; },
    fill: (x, y) => { if (x < 0 || y < 0 || x >= d.width || y >= d.height) return false;
      const p = at(x, y); return p.every((v, i) => Math.abs(v - FILL[i]) <= FILL_TOL); } };
}

/* ── 속 띠 찾기 — 씨앗(최장 가로 연속) → 위·아래로 «덮임 50%» 인 행 ── */
function innerBand(img, win) {
  const [x0, y0, x1, y1] = win;
  let best = { w: 0 };
  for (let y = y0; y <= y1; y++) {
    let cur = null;
    for (let x = x0; x <= x1 + 1; x++) {
      if (x <= x1 && img.fill(x, y)) { if (cur === null) cur = x; }
      else { if (cur !== null && x - cur > best.w) best = { w: x - cur, x: cur, y }; cur = null; }
    }
  }
  if (best.w < 20) return null;
  /* ⚠ «창 안에서 같은 색을 전부 줍기» 는 1회차에 밟은 함정이다 — 알약 밖 수반 돌결에도
     `#191614` 근방이 흩어져 있어 ref 속 폭이 113 이 아니라 **123** 으로 읽혔고, 그 한 줄이
     좌·우 끝을 밀어 모서리 프로파일을 통째로 거짓으로 만들었다(들여쓰기 «12» 가 그 흔적).
     ⇒ 씨앗 런에서 4-이웃 채우기로 **이어진 것만** 남긴다. 가운데 아이콘·숫자 잉크는 속을
     고리처럼 둘러싸이므로 덩어리가 끊기지 않는다. */
  const W = x1 - x0 + 1, HH = y1 - y0 + 1;
  const seen = new Uint8Array(W * HH);
  const idx = (x, y) => (y - y0) * W + (x - x0);
  const stack = [];
  for (let x = best.x; x < best.x + best.w; x++) { seen[idx(x, best.y)] = 1; stack.push([x, best.y]); }
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
      if (seen[idx(nx, ny)] || !img.fill(nx, ny)) continue;
      seen[idx(nx, ny)] = 1; stack.push([nx, ny]);
    }
  }
  const rows = [];
  for (let y = y0; y <= y1; y++) {
    let l = null, r = null;
    for (let x = x0; x <= x1; x++) if (seen[idx(x, y)]) { if (l === null) l = x; r = x; }
    if (l !== null) rows.push({ y, l, r });
  }
  if (!rows.length) return null;
  const lo = rows[0].y, hi = rows[rows.length - 1].y;
  const L = Math.min(...rows.map((r) => r.l)), R = Math.max(...rows.map((r) => r.r));
  return { lo, hi, L, R, h: hi - lo + 1, w: R - L + 1, rows };
}

/* ── 원호 맞춤 — 들여쓰기 프로파일에 r 을 맞춘다(격자 최소제곱) ── */
function fitRadius(band) {
  const n = band.h;
  const obs = [];                        /* [띠 끝에서 떨어진 거리, 들여쓰기] — 네 모서리 평균 */
  for (const row of band.rows) {
    const dTop = row.y - band.lo, dBot = band.hi - row.y;
    /* ⚠ **맨 끝 행은 뺀다** — 띠의 첫·마지막 행은 부분 덮임(안티에일리어스)이라 «속 색» 이
       가운데 일부에만 남아 들여쓰기가 통째로 부풀어 오른다(ref 첫 행 8 ↔ 다음 행 1).
       한 행이 맞춤을 끌고 가면 각진 모서리가 «반지름 5.9» 로 읽힌다 — 1회차에 그랬다. */
    if (Math.min(dTop, dBot) < 1) continue;
    const dy = Math.min(dTop, dBot) + 0.5;      /* 화소 중심 */
    obs.push([dy, row.l - band.L]);             /* 좌 */
    obs.push([dy, band.R - row.r]);             /* 우 */
  }
  let best = { r: 0, err: Infinity };
  for (let r = 0; r <= n / 2 + 0.001; r += 0.05) {
    let e = 0;
    for (const [dy, d] of obs) {
      const model = dy >= r ? 0 : r - Math.sqrt(Math.max(0, r * r - (r - dy) * (r - dy)));
      e += (model - d) * (model - d);
    }
    if (e < best.err) best = { r, err: e };
  }
  best.rms = Math.sqrt(best.err / obs.length);
  best.maxInset = Math.max(...obs.map((o) => o[1]));
  return best;
}

/* ── 바깥 축 — `probe904` [6] 과 **같은 통계**(최외곽 열의 «곧은 변»)를 두 그림에 **같은
      함수**로 적용한다. 행수는 해상도가 다르니 «곧은 변 ÷ 바깥 세로» 비로 답한다.
   ⚠ CSS 상자의 좌변을 열로 쓰면 안 된다 — 모서리에서 반쯤 덮인 검정 화소가 문턱을 넘어
      곧은 변이 부풀고(1회차 48/53.3), 그러면 두 자가 만나는지 알 수 없다. */
const DARK = 25;
function outerStraight(img, band) {
  const colDark = (x, y0, y1) => { let n = 0;
    for (let y = y0; y <= y1; y++) if (img.lum(x, y) < DARK) n++;
    return n; };
  const rowDark = (y, x0, x1) => { let n = 0;
    for (let x = x0; x <= x1; x++) if (img.lum(x, y) < DARK) n++;
    return n / (x1 - x0 + 1); };
  /* ⚠ 걸음은 **국면**이 있어야 한다(904 규약) — 두 가지를 다 밟았다:
       · 한 칸씩만 걸으면 속과 검정 테두리 사이의 **밝은 베벨** 한 겹에서 멈춘다(바깥 열이
         속 좌변 그대로 잡힌다).
       · 그렇다고 «6px 창에서 가장 바깥의 어두운 칸» 을 고르면 알약 **밖 돌결**이 문턱을 넘어
         배경 열을 바깥으로 삼는다(ref 곧은 변이 20 이 아니라 12 로 읽혔다).
     ⇒ ⓐ 밝은 칸 ≤3(베벨)을 건너뛰고 ⓑ 어두운 칸이 이어지는 동안만 바깥으로 가며,
        **끊기면 거기서 끝난다**. */
  const walk = (from, dir, test) => {
    let outer = from, phase = 'b', bright = 0;
    for (let i = 1; i <= 12; i++) {
      const p = from + dir * i;
      const dark = test(p);
      if (dark === null) break;
      if (phase === 'b') { if (dark) { phase = 'c'; outer = p; }
        else { bright++; if (bright > 3) break; } }
      else { if (dark) outer = p; else break; }
    }
    return outer;
  };
  const l = walk(band.L, -1, (x) => x < 0 ? null : colDark(x, band.lo, band.hi) >= band.h * 0.5);
  const t = walk(band.lo, -1, (y) => y < 0 ? null : rowDark(y, band.L, band.R) >= 0.5);
  const b = walk(band.hi, 1, (y) => y >= img.h ? null : rowDark(y, band.L, band.R) >= 0.5);
  const straight = colDark(l, t, b);
  return { l, t, b, h: b - t + 1, straight, ratio: straight / (b - t + 1) };
}

const profile = (band) => band.rows.slice(0, 4).map((r) => (r.l - band.L)).join(',') +
  ' … ' + band.rows.slice(-4).map((r) => (r.l - band.L)).join(',');

(async () => {
  /* ── ⓐ 레퍼런스 ── */
  const rimg = readPng(REF);
  const RB = innerBand(rimg, REF_WIN);
  ok(!!RB, '[1] ref 알약 속 띠를 찾았다 (씨앗 = #191614 최장 가로 연속)');
  const RF = fitRadius(RB);
  const RO = outerStraight(rimg, RB);
  console.log('  [ref] 속 x' + RB.L + '..' + RB.R + ' · y' + RB.lo + '..' + RB.hi +
    ' = ' + RB.w + '×' + RB.h + ' ref px · 바깥 열 x' + RO.l + ' · 곧은 변 ' +
    RO.straight + '/' + RO.h);
  console.log('    좌 들여쓰기(위 4행 … 아래 4행): ' + profile(RB));
  console.log('    ⇒ 맞춘 **속** 반지름 ' + RF.r.toFixed(2) + ' ref px (= ' + (RF.r * K).toFixed(2) +
    ' 프레임 px) · rms ' + RF.rms.toFixed(3) + ' · 최대 들여쓰기 ' + RF.maxInset);

  /* ⚠ **작은 반지름에서는 «맞춘 r» 이 약한 값이다** — 들여쓰기가 0/1 로 양자화돼 r 2~6 이
     거의 같은 잔차를 낸다(ref rms 0.183 은 r=4.5 에서나 r=2 에서나 비슷하다). 그래서 축은
     **«모서리가 파고드는 깊이»**(최대 들여쓰기)로 세우고 맞춘 r 은 곁수로만 적는다. */
  ok(RF.maxInset <= 2,
    '[2] ★ ref 속 모서리는 **거의 각졌다** — 파고드는 깊이 ≤ 2 ref px. stadium 이면 ' +
    (RB.h / 2).toFixed(0) + ' 까지 파고든다', RF.maxInset + ' ref px (맞춘 r ' + RF.r.toFixed(2) + ')');
  ok(RB.h / 2 - RF.maxInset >= 6,
    '[3] ★ 그 깊이가 stadium(' + (RB.h / 2).toFixed(0) + ') 과 **6 ref px 넘게** 갈린다 — ' +
    '«둥근 끝이냐 각진 끝이냐» 는 자 하나로 갈린다',
    (RB.h / 2 - RF.maxInset).toFixed(1) + ' ref px 차');

  /* ── ⓑ 우리 렌더 — 같은 함수 ── */
  const KEEP = process.argv.includes('--keep');
  const OUT = path.join(KEEP ? path.join(ROOT, 'docs/review') : os.tmpdir(), 'probe935-cap.png');
  const b = await launch(chromium);
  const errs = [];
  const shoot = async (H, radius) => {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto('file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      document.querySelector('#tabbar [data-t="box"]').click();
    });
    await p.waitForTimeout(1000);
    await p.evaluate((rad) => {
      document.querySelector('#rwCost b').textContent = '822';
      if (rad !== null) document.getElementById('rwCost').style.borderRadius = rad + 'px';
    }, radius === undefined ? null : radius);
    await p.waitForTimeout(140);
    const box = await p.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const r = document.getElementById('rwCost').getBoundingClientRect();
      const cs = getComputedStyle(document.getElementById('rwCost'));
      return { x: r.left - A.left, y: r.top - A.top, w: r.width, h: r.height,
        bw: parseFloat(cs.borderTopWidth), rad: parseFloat(cs.borderTopLeftRadius) };
    });
    const f = OUT.replace('.png', '-' + H + (radius === undefined ? '' : '-r' + radius) + '.png');
    await p.screenshot({ path: f });
    await ctx.close();
    const img = readPng(f);
    const win = [Math.round(box.x) - 14, Math.round(box.y) - 14,
      Math.round(box.x + box.w) + 14, Math.round(box.y + box.h) + 14];
    const band = innerBand(img, win);
    const out = band ? outerStraight(img, band) : null;
    if (!KEEP) { try { fs.unlinkSync(f); } catch (e) {} }
    return { box, band, out, fit: band ? fitRadius(band) : null };
  };

  const got = {};
  for (const H of [1600, 2280]) got[H] = await shoot(H);
  const rev = await shoot(1600, STADIUM);       /* [R] — stadium 을 다시 씌운다 */
  await b.close();
  if (errs.length) { console.log('PAGE ERRORS:'); errs.forEach((e) => console.log('  ' + e)); }

  console.log('\n  [우리] 같은 함수로 잰 **찍힌 화소** (프레임 1080×H)');
  for (const H of Object.keys(got)) {
    const g = got[H];
    console.log('    ' + H + ' — 속 ' + g.band.w + '×' + g.band.h +
      ' · 맞춘 속 반지름 **' + g.fit.r.toFixed(2) + '** (rms ' + g.fit.rms.toFixed(3) +
      ' · 최대 들여쓰기 ' + g.fit.maxInset + ') · CSS 바깥 radius ' + g.box.rad +
      ' · 테 ' + g.box.bw);
    console.log('      좌 들여쓰기: ' + profile(g.band));
  }
  const H0 = Object.keys(got)[0], G = got[H0];
  ok(Object.keys(got).every((H) => near(got[H].fit.r, G.fit.r, 1)),
    '[4] 알약은 프레임 무관 고정 부품이다 (두 프레임에서 같은 반지름)',
    Object.keys(got).map((H) => H + ':' + got[H].fit.r.toFixed(2)).join(' · '));

  /* ⚠ 깊이는 **ref 해상도로 내려** 견준다 — 우리 1px 은 ref 0.45px 이라 프레임 px 로 재면
     «둘 다 0~1» 인 자리에서 환산 오차가 문턱을 먹는다(1회차에 Δ0.22 로 빨갰다). */
  const oursDepthRef = G.fit.maxInset / K;
  ok(near(oursDepthRef, RF.maxInset, 1.2),
    '[5] ★ 우리 속 모서리가 파고드는 깊이가 **ref 해상도로 내려** ref(' + RF.maxInset +
    ' ref px) 와 1.2 ref px 안 — **수리 전에는 여기가 빨갛다**(stadium ⇒ 5.9 ref px)',
    oursDepthRef.toFixed(2) + ' ref px (우리 ' + G.fit.maxInset + 'px · Δ' +
    (oursDepthRef - RF.maxInset).toFixed(2) + ' · 맞춘 r ' + G.fit.r.toFixed(2) + ')');
  ok(G.box.rad <= 8,
    '[6] ★ CSS 바깥 radius 가 stadium(' + (G.box.h / 2).toFixed(2) + ') 이 아니다',
    G.box.rad + 'px');

  /* [7] 두 자가 **같은 통계**에서 만나는가 — `probe904` [6] 의 «최외곽 열의 곧은 변». */
  /* ⚠ 문턱이 0.06 이 아니라 **0.09** 인 이유(자의 성질이지 제품의 성질이 아니다) — 우리는
     ref 를 2.22배로 그린 그림이라 모서리 호에 **1px 남짓의 안티에일리어스**가 붙고, 그 반쯤
     덮인 검정이 문턱(lum<25)을 넘어 «곧은 변» 으로 세어진다(산수값 44.4 ↔ 실측 48 = +1.6 ref px).
     그렇다고 이 항이 무르지 않다 — stadium 이면 곧은 변이 **0** 이라 비가 .833 → **0** 으로 간다. */
  ok(near(G.out.ratio, RO.ratio, 0.09),
    '[7] ★ `probe904` [6] 과 **같은 통계**(최외곽 열의 «곧은 변» ÷ 바깥 세로)에서도 만난다 — ' +
    'ref ' + RO.straight + '/' + RO.h + ' = ' + RO.ratio.toFixed(3) +
    ' (904 가 같은 그림에서 20/24 = .833 을 찍었다)',
    '우리 ' + G.out.straight + '/' + G.out.h + ' = ' + G.out.ratio.toFixed(3) +
    ' (Δ' + (G.out.ratio - RO.ratio).toFixed(3) + ')');

  ok(rev.fit.maxInset >= G.fit.maxInset + 6,
    '[R] ★ 되돌림 — 같은 알약에 stadium(' + STADIUM + 'px)을 다시 씌우면 파고드는 깊이가 ' +
    G.fit.maxInset + ' → **' + rev.fit.maxInset + '** 로 돌아온다 (이 자가 반지름 축을 본다 · ' +
    '**수리 전에는 둘이 같아 이 항이 빨갛다**)',
    rev.fit.maxInset + 'px (맞춘 r ' + rev.fit.r.toFixed(2) + ')');

  console.log('\nPROBE935 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
