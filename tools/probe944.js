#!/usr/bin/env node
/* 944 재현·되돌림 시험 — `tools/probe929.js` [2]·[6] 이 «판마다 갈리던» 이유를 찍고, 새 축이
 * 무르게 푼 것이 아님을 같은 표본 위에서 못박는다.
 *
 *   node tools/probe944.js
 *
 * 936-예외: 이 자의 «상자» 는 플레이어 자신이 그려진 텍셀(1×1)이라 플레이어를 따라 움직인다 —
 *   상자와 표본이 **같이** 움직이므로 928 의 «바탕이 바뀐다» 가 성립하지 않는다. 게다가 [5] 가 재는 것이
 *   **셰이크가 살아 있는 실시간 프레임**이라 자리를 못박으면(`player.x =` · `spawnStage()`) 셰이크가 0 이 되어
 *   재려던 «판별 표본» 이 통째로 사라진다. ⇒ 못박지 않는다(`probe943`·`probe523`·`verify79` 와 같은 예외).
 *
 * 등재문의 관측은 «닫힌 판 7·8·10·9 / 12 — 문턱 `ceil(12×0.6) = 8` 이라 한 판 차이로 색이 바뀐다» 였다.
 * 뿌리는 문턱의 높이가 아니라 **무엇을 세는가** 다:
 *   · 얹힘(스킬·적 그림이 플레이어 위에 얹히는 것)은 «판» 이 아니라 **«텍셀»** 단위 현상인데
 *   · 옛 축은 판별 `dmax`(= 160 표본의 **최댓값**)로 물어서 **159/160 이 맞은 판도 «못 닫은 판»** 으로 셌다.
 *   ⇒ 판을 세지 말고 텍셀을 모아 센다(pooled). 그러면 두 벌(제품 식 ↔ 현행 식)의 일치율 구간이 겹치지 않는다.
 * [6] 은 943 이 `verify79` [E-R4] 에서 이미 뿌리를 캔 것과 **같은 결함**이다 — «흔들린 판» 을 오프셋 크기
 * (`|dOx| >= 2` 장치px)로 고르면 «되계산 표본이 실제로 달라지는가» 를 안 묻는다.
 *
 * 검사 항목:
 *   [1] 뿌리 — «못 닫은 판» 중에 텍셀 일치율이 0.9 이상인 판이 있다(= 한 텍셀이 판을 뒤집었다)
 *   [2] 되돌림 시험 — 같은 표본에서 12판을 100번 다시 뽑아 **옛 축**으로 판정하면 초록·빨강이 **둘 다** 나오고,
 *       **새 축**은 100번 전부 초록이다(문턱을 가로지르는 것은 축이지 제품이 아니다)
 *   [3] 갈림 — 두 벌의 텍셀 일치율 구간이 겹치지 않는다(제품 최솟값 > 현행 최댓값)
 *   [4] 무르게 푼 것이 아님 — 현행 식(scale 없음) 표본은 새 축의 문턱(0.75)을 **한 판도** 못 넘는다
 *   [5] [6] 축 — 옛 판 고르기(`|dOx| >= 2`)가 고른 판 중 «되계산이 안 빨간 판» 은 예외 없이 판별 표본 0 이고,
 *       새 축(`nDisc > 0`)이 고른 판은 전부 되계산이 빨갛다
 *   [6] 콘솔/페이지 에러 0건
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
/* 씨 고정 난수 — 되돌림 시험이 실행마다 같은 창을 뽑게 한다 */
let seed = 944;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const shot = (page, shake) => page.evaluate((sh) => new Promise(res => {
  if (sh) cam.shake = sh;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const frN = curFrame(player); if (!frN) return res(null);
    const fr = ATLAS.knight.f[frN];
    const av = AV[S.avatar], img = tinted('knight', av && av.tint);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const td = g.getImageData(fr[0], fr[1], fr[2], fr[3]).data;
    const dif = (p, cc) => Math.max(Math.abs(p[0] - cc[0]), Math.abs(p[1] - cc[1]), Math.abs(p[2] - cc[2]));
    const px3 = (x, y) => {
      if (x < 0 || y < 0 || x >= fr[2] || y >= fr[3]) return null;
      const o = (y * fr[2] + x) * 4;
      return td[o + 3] < 255 ? null : [td[o], td[o + 1], td[o + 2]];
    };
    /* probe929 과 같은 표본 조건 — 3×3 이 색까지 평평 */
    const flat = [];
    for (let py = 1; py < fr[3] - 1; py++) for (let px = 1; px < fr[2] - 1; px++) {
      const col = px3(px, py); if (!col) continue;
      let good = true;
      for (let j = -1; j <= 1 && good; j++) for (let i = -1; i <= 1; i++) {
        const q = px3(px + i, py + j);
        if (!q || dif(q, col) !== 0) { good = false; break; }
      }
      if (good) flat.push([px, py, col]);
      if (flat.length >= 160) { py = fr[3]; break; }
    }
    if (!flat.length) return res(null);
    const z = cam.z || 1, SCALE = PLAYER_DRAW_SC;
    let oxR = -(cam.x - VW / (2 * z)), oyR = -(cam.y - VH / (2 * z));
    if (WORLD.w > VW / z) oxR = Math.max(VW / z - WORLD.w, Math.min(0, oxR));
    if (WORLD.h > VH / z) oyR = Math.max(VH / z - WORLD.h, Math.min(0, oyR));
    const xo = frameXo('knight', ATLAS.knight)[frN] || 0;
    const lx0 = -fr[6] / 2 + fr[4] + xo, ly0 = -fr[7] + fr[5];
    const read = (ox, oy, sc, u, v) => {
      const l = (lx0 + u + 0.5) * sc;
      const dxp = Math.round((player.x + (player.flip ? -l : l) + ox) * z * SC);
      const dyp = Math.round((player.y + (ly0 + v + 0.5) * sc + oy) * z * SC);
      if (dxp < 0 || dyp < 0 || dxp >= cvs.width || dyp >= cvs.height) return null;
      return ctx.getImageData(dxp, dyp, 1, 1).data;
    };
    const stat = (ox, oy, sc) => {
      let dmax = 0, n = 0, hit = 0;
      for (const [u, v, col] of flat) {
        const d0 = read(ox, oy, sc, u, v); if (!d0) continue;
        const d = dif(d0, col); if (d > dmax) dmax = d; n++; if (d <= 3) hit++;
      }
      return { dmax, n, hit };
    };
    /* 판별 표본(943) — 되계산이 읽게 될 자리의 3×3 이 전부 불투명이고 원색과 Δ>3 */
    const ru = Math.round((player.flip ? -1 : 1) * (oxR - camOx) / SCALE);
    const rv = Math.round((oyR - camOy) / SCALE);
    const disc = [];
    for (const [u, v, col] of flat) {
      let d0 = true;
      for (let j = -1; j <= 1 && d0; j++) for (let i = -1; i <= 1; i++) {
        const q = px3(u + ru + i, v + rv + j);
        if (!q || dif(q, col) <= 3) { d0 = false; break; }
      }
      if (d0) disc.push([u, v, col]);
      if (disc.length >= 40) break;
    }
    const discMax = (ox, oy) => {
      let m = 0;
      for (const [u, v, col] of disc) { const r = read(ox, oy, SCALE, u, v); if (r) m = Math.max(m, dif(r, col)); }
      return m;
    };
    const prod = stat(camOx, camOy, SCALE), cur = stat(oxR, oyR, 1), prodRe = stat(oxR, oyR, SCALE);
    res({
      dProd: prod.dmax, hProd: prod.hit, nProd: prod.n,
      dCur: cur.dmax, hCur: cur.hit, nCur: cur.n,
      dProdRe: prodRe.dmax,
      nDisc: disc.length, dReD: disc.length ? discMax(oxR, oyR) : null, dPubD: disc.length ? discMax(camOx, camOy) : null,
      dOx: +((camOx - oxR) * SC).toFixed(2), dOy: +((camOy - oyR) * SC).toFixed(2),
      hit: player.hitFx > 0
    });
  }));
}), shake);

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const bctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await bctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function' && ATLAS.knight && ATLAS.knight.image);
  await page.waitForTimeout(1200);

  /* ── 표본 ① 셰이크 없음 — [1]~[4] ── */
  const rows = [];
  for (let i = 0; i < 60 && rows.length < 30; i++) {
    const r = await shot(page, 0);
    if (r && !r.hit) rows.push(r);
    await page.waitForTimeout(60);
  }
  if (rows.length < 20) { console.log('FAIL 표본 프레임 부족 — ' + rows.length); await browser.close(); process.exit(3); }

  const pr = rows.map(r => r.hProd / r.nProd), cr = rows.map(r => r.hCur / r.nCur);
  console.log('판 ' + rows.length + ' · 텍셀 일치율 제품 ' + Math.min(...pr).toFixed(3) + '~' + Math.max(...pr).toFixed(3) +
    ' ↔ 현행 ' + Math.min(...cr).toFixed(3) + '~' + Math.max(...cr).toFixed(3));

  /* [1] 뿌리 — 한 텍셀이 판을 뒤집는다 */
  const flipped = rows.filter(r => r.dProd > 3 && r.hProd / r.nProd >= 0.9);
  ok(flipped.length > 0,
    '1 뿌리 — «못 닫은 판»(dmax>3) 중에 텍셀 일치율 0.9 이상인 판이 있다(한 텍셀이 판을 뒤집었다)',
    '해당 판 ' + flipped.length + '/' + rows.filter(r => r.dProd > 3).length + ' 개 · 예: ' +
    flipped.slice(0, 3).map(r => r.hProd + '/' + r.nProd + '(dmax ' + r.dProd + ')').join(' · '));

  /* [2] 되돌림 시험 — 같은 표본에 옛 축·새 축을 각각 100번 */
  const pick = () => { const a = []; for (let k = 0; k < 12; k++) a.push(rows[Math.floor(rnd() * rows.length)]); return a; };
  let oldG = 0, oldR = 0, newG = 0, newR = 0;
  for (let t = 0; t < 100; t++) {
    const w = pick();
    /* 옛 축: Δmin=0 · 닫힌 판 ≥ ceil(12×0.6)=8 · 현행 식으로 닫힌 판 0 */
    const closed = w.filter(r => r.dProd <= 3).length;
    const oldOk = Math.min(...w.map(r => r.dProd)) === 0 && closed >= Math.ceil(w.length * 0.6) && !w.some(r => r.dCur <= 3);
    oldOk ? oldG++ : oldR++;
    /* 새 축: Δmin=0 · Δ=0 인 판 ≥3 · pooled 제품 ≥0.75 · pooled 현행 ≤0.50 · 현행 식으로 닫힌 판 0 */
    const s = (f) => w.reduce((a, r) => a + f(r), 0);
    const newOk = Math.min(...w.map(r => r.dProd)) === 0 && w.filter(r => r.dProd === 0).length >= 3 &&
      s(r => r.hProd) / s(r => r.nProd) >= 0.75 && s(r => r.hCur) / s(r => r.nCur) <= 0.50 && !w.some(r => r.dCur <= 3);
    newOk ? newG++ : newR++;
  }
  ok(oldG > 0 && oldR > 0 && newR === 0,
    '2 되돌림 시험 — 같은 표본에서 12판을 100번 다시 뽑으면 옛 축은 초록·빨강이 둘 다 나오고 새 축은 100번 전부 초록이다',
    '옛 축 초록 ' + oldG + ' / 빨강 ' + oldR + ' · 새 축 초록 ' + newG + ' / 빨강 ' + newR);

  /* [3] 갈림 — 두 구간이 안 겹친다 */
  ok(Math.min(...pr) > Math.max(...cr),
    '3 갈림 — 텍셀 일치율은 두 벌이 겹치지 않는다(제품 최솟값 > 현행 최댓값)',
    '제품 min ' + Math.min(...pr).toFixed(3) + ' > 현행 max ' + Math.max(...cr).toFixed(3) +
    ' · 사이 여백 ' + (Math.min(...pr) - Math.max(...cr)).toFixed(3));

  /* [4] 무르게 푼 것이 아님 — 현행 식은 새 문턱을 한 판도 못 넘는다 */
  ok(cr.every(x => x < 0.75),
    '4 무르게 푼 것이 아님 — 현행 식(scale 없음) 표본은 새 축의 문턱 0.75 를 한 판도 못 넘는다',
    '현행 max ' + Math.max(...cr).toFixed(3) + ' · 문턱까지 ' + (0.75 - Math.max(...cr)).toFixed(3));

  /* ── 표본 ② 셰이크 주입 — [5] ── */
  const sh = [];
  for (let i = 0; i < 24 && sh.length < 16; i++) {
    const r = await shot(page, 12);
    if (r && !r.hit) sh.push(r);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => { cam.shake = 0; });
  const oldSel = sh.filter(r => Math.abs(r.dOx) >= 2);       /* 옛 판 고르기 */
  const newSel = sh.filter(r => r.nDisc > 0);                /* 새 판 고르기(943) */
  const oldBad = oldSel.filter(r => r.dProdRe <= 3);         /* 옛 축이 «되계산이 안 빨갛다» 로 읽는 판 */
  ok(newSel.length > 0 && newSel.every(r => r.dReD > 3) && oldBad.every(r => r.nDisc === 0),
    '5 [6] 축 — 새 축이 고른 판은 전부 되계산이 빨갛고, 옛 축이 고른 «안 빨간 판» 은 예외 없이 판별 표본 0 이다',
    '흔들린 판 ' + sh.length + ' · 옛 축 ' + oldSel.length + '판(그중 안 빨간 판 ' + oldBad.length +
    ' · 판별 표본 0 인 판 ' + oldBad.filter(r => r.nDisc === 0).length + ') · 새 축 ' + newSel.length +
    '판(판별 표본 ' + newSel.map(r => r.nDisc).slice(0, 6).join(',') + ')');

  ok(errs.length === 0, '6 콘솔/페이지 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE944 ' + (fail ? 'FAIL (' + fail + '건)' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
