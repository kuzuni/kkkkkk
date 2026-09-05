#!/usr/bin/env node
/* 작업 904 — 89 유물 «가격 알약» 세로의 **재현자**(338 규칙: 처방 전에 재현부터).
 *
 *   node tools/probe904.js            # ref ↔ 우리를 **같은 함수**로 재고 Δ 를 찍는다
 *   node tools/probe904.js --keep     # 캡처를 docs/review 에 남긴다
 *
 * ── 왜 자를 또 세우는가 ──────────────────────────────────────────────────────
 * 813 10회차 채점 2인(EG·EH)이 «가격 알약이 세로로 +8.8~13.5% 크다» 를 **각자** 적었는데
 * `verify866` [C1] 은 «바깥 260.0×**57.8**» 을 묻고 **16/16 초록**이었다. 등재문(904)은
 * 그것을 «그 자가 세로를 안 묻고 있다» 로 읽었지만 **자는 묻고 있었다** — 틀린 것은
 * 질문이 아니라 **과녁**(ref 실측값)이다.
 *
 * 뿌리는 `probe866.py` 의 `edge()` 한 줄이다:
 *
 *     if lum < 25: last = 여기            # 검정 테두리 = 바깥 모서리 후보
 *     else:        bright += 1; if bright > 2: break     # ← **밝은 화소 2개까지 건너뛴다**
 *
 * 알약 하변(ref y618) **바로 아래 y619 는 밝고(L 26.2) y620 이 다시 어둡다**(L 4.9 — 수반
 * 받침의 그늘). 두 칸까지 건너뛰는 걸음이 그 한 칸을 넘어가 **y620 을 알약의 하변으로**
 * 삼았고, 그래서 ref 세로가 24 가 아니라 **26** 으로 읽혔다(+8.3%). 866 은 그 26 을 그대로
 * 과녁으로 삼아 제품을 57.8 로 키웠고, 게이트는 자기가 만든 과녁을 다시 물어 초록이었다.
 *
 * ⚑ **측정표는 처음부터 24 를 적고 있었다** — `docs/measure/89-유물팝업.md` §코스트 필 행:
 *   «검정 테두리 바깥 117×**24** ⇒ 260.0×**53.3**~57.8». 866 이 그 폭(53.3~57.8)을 남겨 둔 것이
 *   자기 자와 측정표가 갈렸다는 표시였는데, 큰 쪽이 선택됐다.
 *
 * ── 이 자의 규약(정의를 밝힌다 — 334 규약) ───────────────────────────────────
 *   씨앗 : 알약 «속» 색 `#191614`(두 그림이 **같은 값**)의 최장 가로 연속.
 *   걸음 : **국면 셋**으로 걷는다 — 건너뛸 수 있는 것은 «베벨 한 겹» 뿐이고,
 *          검정 테두리가 끝나면 **거기서 끝난다**(다시 어두워져도 안 돌아간다).
 *            ⓐ 속(어두움) → ⓑ 안쪽 베벨(밝음, ≤3칸) → ⓒ 검정 테두리(어두움, **끊기면 끝**)
 *          ⇒ 바깥 모서리 = ⓒ 구간의 마지막 칸. 866 의 걸음은 국면이 없어 ⓒ 뒤의 밝은 한 칸을
 *            다시 베벨처럼 건너뛰었다.
 *   [R]  : 같은 화소에 866 의 «국면 없는 2칸 건너뛰기» 를 얹으면 세로가 **26 으로 되돌아간다** —
 *          이 항이 빨개지면 뿌리 진단이 틀린 것이다.
 *
 * 우리 렌더는 **같은 함수**로 잰다(866 의 «두 그림을 한 자로» 규약 유지).
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
const K = 1080 / 486;              /* 813·859·866 이 쓰는 것과 같은 환산 */
const DARK = 25;                   /* «검정 테두리» 문턱 — 866 과 같은 값 */
const FILL = [0x19, 0x16, 0x14];   /* 알약 속(두 그림이 같은 색) */
const FILL_TOL = 6;

let pass = 0, fail = 0;
const ok = (c, t, got) => { if (c) { pass++; console.log('PASS ' + t + (got ? ' — ' + got : '')); }
  else { fail++; console.log('FAIL ' + t + (got ? ' — ' + got : '')); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const pct = (a, b) => ((a / b - 1) * 100).toFixed(1) + '%';

/* ── 화소 접근 ── */
function readPng(file) {
  const d = PNG.sync.read(fs.readFileSync(file));
  const at = (x, y) => { const i = (d.width * y + x) << 2;
    return [d.data[i], d.data[i + 1], d.data[i + 2]]; };
  return { w: d.width, h: d.height, at,
    lum: (x, y) => { const p = at(x, y); return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]; },
    fill: (x, y) => { const p = at(x, y);
      return p.every((v, i) => Math.abs(v - FILL[i]) <= FILL_TOL); } };
}

/* ── 자 하나 — 씨앗(속) → 네 방향 걸음 ─────────────────────────────────────── */
function seed(img, win) {
  const [x0, y0, x1, y1] = win;
  let best = { w: 0 };
  for (let y = y0; y < y1; y++) {
    let cur = null;
    for (let x = x0; x <= x1; x++) {
      if (x < x1 && img.fill(x, y)) { if (cur === null) cur = x; }
      else { if (cur !== null && x - cur > best.w) best = { w: x - cur, x: cur, y }; cur = null; }
    }
  }
  return best.w >= 20 ? best : null;
}

/* 국면 걸음 — mode 'phase' = 이 자의 규약 · 'skip2' = 866 의 옛 걸음(그 자리에서 재현).
   반환: [속 끝(ⓐ 의 마지막 칸), 바깥 모서리(ⓒ 의 마지막 칸)] */
const BEVEL_MAX = 3;              /* 베벨 한 겹의 최대 두께(ref 1 · 우리 2.2 → 3 이면 넉넉) */
function walk(img, dx, dy, x, y, mode) {
  const inB = (a, b) => a >= 0 && b >= 0 && a < img.w && b < img.h;
  if (mode === 'skip2') {                        /* 866 의 걸음: 밝은 화소 2칸까지 무조건 건너뛴다 */
    let last = [x, y], bright = 0;
    for (let i = 0; i < 200; i++) {
      x += dx; y += dy;
      if (!inB(x, y)) break;
      if (img.lum(x, y) < DARK) { last = [x, y]; bright = 0; }
      else { bright++; if (bright > 2) break; }
    }
    return [null, last];
  }
  let inner = [x, y], outer = [x, y], phase = 'a', bright = 0;
  for (let i = 0; i < 200; i++) {
    x += dx; y += dy;
    if (!inB(x, y)) break;
    const dark = img.lum(x, y) < DARK;
    if (phase === 'a') {
      if (dark) { inner = [x, y]; }
      else { phase = 'b'; bright = 1; }
    } else if (phase === 'b') {
      if (dark) { phase = 'c'; outer = [x, y]; }
      else { bright++; if (bright > BEVEL_MAX) { outer = inner; break; } }
    } else {                                     /* ⓒ — 끊기면 그것으로 끝이다 */
      if (dark) outer = [x, y]; else break;
    }
  }
  if (phase === 'a') outer = inner;              /* 테를 못 만났다 = 속 끝이 곧 바깥 */
  return [inner, outer];
}

/* ── 세로는 «띠»(band) 로 — 한 **행**이 알약에 속한다 = 씨앗 런의 x 구간에서 어두운 화소가
      50% 이상. **최장 연속이 아니라 «덮임»** 인 것이 핵심이다: 알약 속 아이콘·숫자 잉크가
      밝아서 연속을 끊으므로, 연속으로 재면 잉크가 있는 행이 통째로 탈락한다.
   ⚑ 이 규약이 866 의 걸음과 다른 점: 알약 밖의 «점 몇 개»(x180 의 12칸 세로줄 · y620 의
      받침 그늘)는 50% 문턱을 못 넘어 **애초에 후보가 아니다** — 건너뛰기 규칙 자체가 없다. */
function cover(img, y, x0, x1, test) {
  let n = 0;
  for (let x = x0; x <= x1; x++) if (test(x, y)) n++;
  return n / (x1 - x0 + 1);
}
function rowBand(img, win, sx0, sx1, seedY, test, th) {
  let lo = seedY, hi = seedY;
  while (lo - 1 >= win[1] && cover(img, lo - 1, sx0, sx1, test) >= th) lo--;
  while (hi + 1 <= win[3] && cover(img, hi + 1, sx0, sx1, test) >= th) hi++;
  return [lo, hi];
}
/* 속 띠의 끝에서 한 국면 더 — ⓑ 베벨(밝은 행 ≤3) → ⓒ 검정 테두리(어두운 행, **끊기면 끝**) */
function rowEdge(img, win, sx0, sx1, from, dir, test, th) {
  let y = from, phase = 'b', bright = 0, outer = from;
  for (let i = 0; i < 40; i++) {
    y += dir;
    if (y < win[1] || y > win[3]) break;
    const dark = cover(img, y, sx0, sx1, test) >= th;
    if (phase === 'b') {
      if (dark) { phase = 'c'; outer = y; }
      else { bright++; if (bright > BEVEL_MAX) return from; }
    } else { if (dark) outer = y; else break; }
  }
  return outer;
}
/* 한 행의 «속 색» 최외곽 — 잉크가 가운데를 끊으므로 좌·우 끝 런만 본다 */
function fillSpan(img, y, x0, x1) {
  let lo = null, hi = null;
  for (let x = x0; x <= x1; x++) if (img.fill(x, y)) { if (lo === null) lo = x; hi = x; }
  return lo === null ? null : [lo, hi];
}

function pillBox(img, win, mode) {
  const s = seed(img, win);
  if (!s) return null;
  const dark = (x, y) => img.lum(x, y) < DARK;
  const fillT = (x, y) => img.fill(x, y);
  const sx0 = s.x, sx1 = s.x + s.w - 1;
  if (mode === 'skip2') {                        /* 866 의 걸음을 그 자리에서 재현한다 */
    const vx = s.x + 10;
    const t = walk(img, 0, -1, vx, s.y, mode)[1][1];
    const b = walk(img, 0, 1, vx, s.y, mode)[1][1];
    const l = walk(img, -1, 0, s.x + (s.w >> 1), s.y, mode)[1][0];
    const r = walk(img, 1, 0, s.x + (s.w >> 1), s.y, mode)[1][0];
    return { l, r, t, b, w: r - l + 1, h: b - t + 1, iw: 0, ih: 0, il: 0, ir: 0, it: 0, ib: 0 };
  }
  const [bt, bb] = rowBand(img, win, sx0, sx1, s.y, dark, 0.5);
  const t = rowEdge(img, win, sx0, sx1, bt, -1, dark, 0.5);
  const b = rowEdge(img, win, sx0, sx1, bb, 1, dark, 0.5);
  const [it, ib] = rowBand(img, win, sx0, sx1, s.y, fillT, 0.5);
  const iy = (it + ib) >> 1;
  const span = fillSpan(img, iy, win[0], win[2]);
  const l = walk(img, -1, 0, span[0], iy, mode)[1][0];
  const r = walk(img, 1, 0, span[1], iy, mode)[1][0];
  return { l, r, t, b, w: r - l + 1, h: b - t + 1,
    il: span[0], ir: span[1], it, ib, iw: span[1] - span[0] + 1, ih: ib - it + 1 };
}

const REF_WIN = [176, 585, 310, 625];

(async () => {
  /* ── ⓐ 레퍼런스 ── */
  const rimg = readPng(REF);
  const R0 = pillBox(rimg, REF_WIN, 'phase');
  ok(!!R0, '[1] ref 알약을 찾았다 (씨앗 = #191614 최장 가로 연속)');
  console.log('  [ref] ' + path.basename(REF) + ' ' + rimg.w + '×' + rimg.h + ' · k = ' + K.toFixed(4));
  console.log('    바깥 x' + R0.l + '..' + R0.r + ' · y' + R0.t + '..' + R0.b +
    ' = ' + R0.w + '×' + R0.h + ' ref px ⇒ **' + (R0.w * K).toFixed(1) + '×' + (R0.h * K).toFixed(1) + '**');
  console.log('    속   x' + R0.il + '..' + R0.ir + ' · y' + R0.it + '..' + R0.ib +
    ' = ' + R0.iw + '×' + R0.ih + ' ref px ⇒ ' + (R0.iw * K).toFixed(1) + '×' + (R0.ih * K).toFixed(1));
  const ringX = (R0.w - R0.iw) / 2, ringY = (R0.h - R0.ih) / 2;
  console.log('    테(속→바깥) 가로 ' + ringX + ' · 세로 ' + ringY + ' ref px ⇒ ' +
    (ringX * K).toFixed(2) + ' / ' + (ringY * K).toFixed(2) + ' 프레임 px');

  ok(R0.w === 117, '[2a] ref 바깥 폭 117 ref px (= 260.0 — 866 과 같은 값, 폭은 처음부터 옳았다)', R0.w + '');
  ok(R0.h === 24, '[2b] ★ ref 바깥 **세로 24** ref px (= 53.3) — 866 의 26(=57.8)은 걸음이 만든 것', R0.h + '');
  ok(ringX === ringY && ringX === 2,
    '[2c] 테는 등방 2 ref px(검정 1 + 베벨 1) — 866 의 3(=6.6)이 아니다', ringX + ' / ' + ringY);

  /* [R] 866 의 걸음(밝은 화소 2칸까지 건너뛰기)을 **같은 화소에** 얹는다 */
  const R2 = pillBox(rimg, REF_WIN, 'skip2');
  ok(R2.b > R0.b && R2.h >= 26,
    '[R] ★ 되돌림 — 866 의 «국면 없는 2칸 건너뛰기» 를 얹으면 하변이 y' + R0.b + ' → y' + R2.b +
    ' 로 **내려가** 세로가 24 → ' + R2.h + ' 이 된다 (probe866 은 26 을 찍었다 — 걸음이 만든 값)',
    R2.h + ' (하변 y' + R2.b + ')');
  /* 그 한 칸의 정체 — 알약 하변 **바로 아래 한 행만 밝고 그 다음이 다시 어두운** 열이 몇인가 */
  let gap = 0;
  for (let x = R0.il; x <= R0.ir; x++)
    if (rimg.lum(x, R0.b + 1) >= DARK && rimg.lum(x, R0.b + 2) < DARK) gap++;
  ok(gap > 0,
    '[R2] 그 한 칸의 정체 — 알약 하변(y' + R0.b + ') 아래 y' + (R0.b + 1) + ' 는 밝고 y' +
    (R0.b + 2) + ' 가 다시 어두운 열이 있다(수반 받침 그늘) ⇒ 2칸 걸음이 넘어갈 다리',
    gap + '열 / ' + (R0.ir - R0.il + 1) + '열');

  /* ── ⓑ 우리 렌더 — 같은 함수 ── */
  const KEEP = process.argv.includes('--keep');
  const OUT = path.join(KEEP ? path.join(ROOT, 'docs/review') : os.tmpdir(), 'probe904-cap.png');
  const b = await launch(chromium);
  const shots = {};
  const errs = [];
  for (const H of [1600, 2280]) {
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
    await p.evaluate(() => { document.querySelector('#rwCost b').textContent = '822'; });
    await p.waitForTimeout(140);
    const box = await p.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const r = document.getElementById('rwCost').getBoundingClientRect();
      const cs = getComputedStyle(document.getElementById('rwCost'));
      return { x: r.left - A.left, y: r.top - A.top, w: r.width, h: r.height,
        bw: parseFloat(cs.borderTopWidth), sh: cs.boxShadow, rad: cs.borderTopLeftRadius };
    });
    const f = OUT.replace('.png', '-' + H + '.png');
    await p.screenshot({ path: f });
    shots[H] = { f, box };
    await ctx.close();
  }
  await b.close();
  if (errs.length) { console.log('PAGE ERRORS:'); errs.forEach((e) => console.log('  ' + e)); }

  console.log('\n  [우리] 같은 함수로 잰 **찍힌 화소** (프레임 1080×H)');
  const got = {};
  for (const H of Object.keys(shots)) {
    const s = shots[H];
    const img = readPng(s.f);
    const win = [Math.round(s.box.x) - 14, Math.round(s.box.y) - 14,
      Math.round(s.box.x + s.box.w) + 14, Math.round(s.box.y + s.box.h) + 14];
    const q = pillBox(img, win, 'phase');
    got[H] = q;
    console.log('    ' + H + ' — 바깥 ' + q.w + '×' + q.h + ' · 속 ' + q.iw + '×' + q.ih +
      ' · 상자 ' + s.box.w.toFixed(1) + '×' + s.box.h.toFixed(1) +
      ' (테 ' + s.box.bw + ' · radius ' + s.box.rad + ')');
    if (!KEEP) { try { fs.unlinkSync(s.f); } catch (e) {} }
  }
  const H0 = Object.keys(got)[0];
  ok(Object.keys(got).every((H) => got[H].h === got[H0].h && got[H].w === got[H0].w),
    '[3] 알약은 프레임 무관 고정 부품이다 (두 프레임에서 같은 화소)',
    Object.keys(got).map((H) => H + ':' + got[H].w + '×' + got[H].h).join(' · '));
  const dh = got[H0].h / (R0.h * K) - 1;
  console.log('\n  ⇒ 세로 화소 ' + got[H0].h + ' vs ref 환산 ' + (R0.h * K).toFixed(1) +
    ' = **' + (dh * 100).toFixed(1) + '%** (EG +8.8% · EH +13.5% 와 같은 부호)');
  console.log('  ⇒ 가로 화소 ' + got[H0].w + ' vs ref 환산 ' + (R0.w * K).toFixed(1) +
    ' = ' + pct(got[H0].w, R0.w * K));
  ok(Math.abs(dh) <= 0.03,
    '[4] ★ 우리 알약 세로가 ref 환산(' + (R0.h * K).toFixed(1) + ') 의 ±3% 안 — ' +
    '**수리 전에는 여기가 빨갛다**(+8.4%)', got[H0].h + ' (' + (dh * 100).toFixed(1) + '%)');
  /* ── [6] 곁다리 관측 — 모서리 반지름(«곧은 변» 의 길이로 역산). 904 의 축이 아니라 **등재용**이다.
        stadium(반지름 = 높이 절반)이면 최외곽 열은 1~2행만 어둡고, 반지름이 작으면 거의 전 높이다. */
  const straight = (img, box) => {
    let n = 0;
    for (let y = box.t; y <= box.b; y++) if (img.lum(box.l, y) < DARK) n++;
    return n;
  };
  const rs = straight(rimg, R0);
  console.log('\n  [6] 곁다리 — 모서리: 최외곽 열의 «곧은 변» ref ' + rs + '/' + R0.h +
    '행 ⇒ 반지름 ≈ ' + ((R0.h - rs) / 2).toFixed(1) + ' ref px (= ' +
    (((R0.h - rs) / 2) * K).toFixed(1) + ') · 우리 CSS radius ' + shots[H0].box.rad +
    ' (= 높이 절반 = stadium) ⇒ **다른 축이라 904 는 안 건드린다 · 등재**');

  ok(near(got[H0].w, R0.w * K, R0.w * K * 0.03),
    '[5] 가로는 866 이 이미 닫아 뒀다 — ref 환산(' + (R0.w * K).toFixed(1) + ') 의 ±3%',
    got[H0].w + ' (' + pct(got[H0].w, R0.w * K) + ')');

  console.log('\nPROBE904 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
