#!/usr/bin/env node
/* 943 재현 — `tools/verify79.js` [E-R4] 가 8판 중 3판 빨간 뿌리를 찍는다.
 *
 *   node tools/probe943.js [--frames N]
 *
 * 936-예외: 이 자의 «상자» 는 플레이어 자신이 그려진 텍셀(1×1)이라 플레이어를 따라 움직인다 —
 *   상자와 표본이 **같이** 움직이므로 928 의 «바탕이 바뀐다» 가 성립하지 않고, 게다가 이 자가 재는 것이
 *   **셰이크가 살아 있는 실시간 프레임**이라 자리를 못박으면(`player.x =` · `spawnStage()`) 셰이크가
 *   0 이 되어 재려던 «판별 표본» 이 통째로 사라진다. ⇒ 못박지 않는다(`verify79`·`probe523` 과 같은 예외).
 *
 * [E-R4] 는 셰이크를 주입한 뒤 «흔들린 판» 을 세고(`dOx >= 2` 장치px) 그 판 전부에서
 * «되계산 ox» 가 빨갛기를(`injRed === injN`) 요구한다. 그런데 «흔들렸다» 와
 * «되계산 표본이 실제로 달라진다» 는 같은 말이 아니다 — 표본이 **평평한 색 안**에 있으면
 * 몇 장치px 밀려도 같은 색을 읽어 `dRe = 0` 이 되고, 그 판 하나가 `injRed < injN` 을 만든다.
 *
 * 이 자는 한 판마다 넷을 같이 잰다 — «판 세기» 와 «표본 갈림» 을 갈라 놓는 것이 목적이다:
 *   ⓐ `dOx`(장치px) · ⓑ 텍셀 어긋남 `du/dv`(= Δox/scale · 부호는 `player.flip`)
 *   ⓒ 판별 표본 수 `nDisc` — 밀린 자리의 아틀라스 3×3 이 **전부 불투명 + 원색과 Δ>3** 인 표본
 *   ⓓ `dPub`(발표값으로 읽은 Δ) · `dRe`(되계산으로 읽은 Δ · 전 표본) · `dReD`(판별 표본만)
 *
 * 검사 항목:
 *   [1] 재현 — 옛 축(`dOx >= 2`)이 세는 판 중 «판별 표본 0» 인 판이 있다(근거 없이 세는 판 · 초록·빨강은 운)
 *   [2] 뿌리(산수) — 옛 문턱 2장치px = 0.67텍셀인데 표본이 «3×3 평평» 이라 |ru|≤1·|rv|≤1 이면 판별 표본이 구조적으로 0
 *   [3] 새 축 — `nDisc > 0` 인 판은 예외 없이 `dReD > 3` 이다(반례 0건)
 *   [4] 굶기지 않는다 — 판별 판이 충분히 자주 나온다(주입 N판 중 ≥ 20%)
 *   [5] 문턱 올리기는 답이 아니다 — `dOx` 가 큰 판(≥ 5장치px) 중에도 `nDisc === 0` 인 판이 있다
 *   [6] 되돌림 — 제품이 셰이크를 발표값에 안 실으면(du=dv=0) 판별 표본이 **구조적으로** 0 이다
 *       ⇒ [E-R4] 는 «흔들린 프레임을 못 잡았다» 로 빨개진다(무르게 푼 수리가 아니다)
 *   [7] 콘솔/페이지 에러 0건
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const FRAMES = (() => {
  const i = process.argv.indexOf('--frames');
  return i > 0 ? Math.max(8, +process.argv[i + 1] || 60) : 60;
})();

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 한 판 = 셰이크를 켠 뒤 rAF 두 겹 안에서 «발표값 / 되계산값» 두 벌을 같은 표본으로 읽는다.
   verify79 [E-R4] 와 같은 표본 규칙(3×3 이 색까지 평평)을 쓰되 상한을 두지 않는다 —
   «판별 표본이 몇 개나 되는가» 가 이 자의 답이라 표본을 미리 잘라 내면 안 된다. */
const shot = page => page.evaluate(() => new Promise(res => {
  cam.shake = 12;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const frN = curFrame(player); if (!frN) return res(null);
    const fr = ATLAS.knight.f[frN];
    const av = AV[S.avatar], img = tinted('knight', av && av.tint);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const td = g.getImageData(fr[0], fr[1], fr[2], fr[3]).data;

    const px3 = (x, y) => {                       /* 프레임 안 텍셀 색(불투명일 때만) */
      if (x < 0 || y < 0 || x >= fr[2] || y >= fr[3]) return null;
      const o = (y * fr[2] + x) * 4;
      return td[o + 3] < 255 ? null : [td[o], td[o + 1], td[o + 2]];
    };
    const dif = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));

    const smp = [];
    for (let py = 1; py < fr[3] - 1; py++) for (let px = 1; px < fr[2] - 1; px++) {
      const col = px3(px, py); if (!col) continue;
      let flat = true;
      for (let j = -1; j <= 1 && flat; j++) for (let i = -1; i <= 1; i++) {
        const q = px3(px + i, py + j);
        if (!q || dif(q, col) !== 0) { flat = false; break; }
      }
      if (flat) smp.push([px, py, col]);
    }
    if (!smp.length) return res(null);

    const z = cam.z || 1, sc = (typeof PLAYER_DRAW_SC !== 'undefined') ? PLAYER_DRAW_SC : 1;
    const xo = frameXo('knight', ATLAS.knight)[frN] || 0;
    const ly0 = -fr[7] + fr[5];
    let oxR = -(cam.x - VW / (2 * z)), oyR = -(cam.y - VH / (2 * z));
    if (WORLD.w > VW / z) oxR = Math.max(VW / z - WORLD.w, Math.min(0, oxR));
    if (WORLD.h > VH / z) oyR = Math.max(VH / z - WORLD.h, Math.min(0, oyR));

    /* 되계산으로 읽으면 «어느 텍셀» 을 읽게 되는가 — 화면 자리를 같게 만드는 u'/v' 를 푼 값 */
    const du = (player.flip ? -1 : 1) * (oxR - camOx) / sc;
    const dv = (oyR - camOy) / sc;

    const rd = (u, v, ox, oy) => {
      const l = (-fr[6] / 2 + fr[4] + xo + u + 0.5) * sc;
      const dxp = Math.round((player.x + (player.flip ? -l : l) + ox) * z * SC);
      const dyp = Math.round((player.y + (ly0 + v + 0.5) * sc + oy) * z * SC);
      if (dxp < 0 || dyp < 0 || dxp >= cvs.width || dyp >= cvs.height) return null;
      return ctx.getImageData(dxp, dyp, 1, 1).data;
    };

    /* 판별 표본 — 밀린 자리의 3×3 이 전부 불투명이고 원색과 Δ>3 이면 «읽는 색이 반드시 달라진다».
       3×3 을 보는 이유는 장치px 반올림(±0.5px)이 이웃 텍셀로 새기 때문이다. */
    const isDisc = (u, v, col, ru, rv) => {
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const q = px3(u + ru + i, v + rv + j);
        if (!q || dif(q, col) <= 3) return false;
      }
      return true;
    };
    let dPub = 0, dRe = 0, dReD = 0, nDisc = 0, nDisc0 = 0, nRead = 0;
    const ru = Math.round(du), rv = Math.round(dv);
    for (const [u, v, col] of smp) {
      const a = rd(u, v, camOx, camOy), b = rd(u, v, oxR, oyR);
      if (a) { dPub = Math.max(dPub, dif(a, col)); nRead++; }
      if (b) dRe = Math.max(dRe, dif(b, col));
      if (isDisc(u, v, col, ru, rv)) { nDisc++; if (b) dReD = Math.max(dReD, dif(b, col)); }
      /* 되돌림 — «제품이 셰이크를 발표값에 안 실었다면» du = dv = 0 이다. 그 자리의 판별 표본 수. */
      if (isDisc(u, v, col, 0, 0)) nDisc0++;
    }
    res({ dPub, dRe, dReD, nDisc, nDisc0, nSmp: smp.length, nRead,
          du, dv, ru, rv, dOx: Math.abs((camOx - oxR) * SC), dOy: Math.abs((camOy - oyR) * SC),
          flip: !!player.flip, sc, SC, hit: player.hitFx > 0 });
  }));
}));

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function' && ATLAS.knight && ATLAS.knight.image);
  await page.waitForTimeout(1200);

  const rows = [];
  for (let t = 0; t < FRAMES; t++) {
    const r = await shot(page);
    if (r && !r.hit) rows.push(r);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => { cam.shake = 0; });

  const old = rows.filter(r => r.dOx >= 2);                 /* 옛 축이 세는 판 */
  const oldQuiet = old.filter(r => r.dRe <= 3);             /* 그중 «되계산이 안 빨간» 판 = 이번 판의 빨강 */
  const oldBlind = old.filter(r => r.nDisc === 0);          /* 그중 «근거가 아예 없는» 판(초록·빨강은 운) */
  const band = old.filter(r => Math.abs(r.ru) <= 1 && Math.abs(r.rv) <= 1);   /* 세지만 구조적으로 조용한 구간 */
  const disc = rows.filter(r => r.nDisc > 0);               /* 새 축이 세는 판 */
  const discQuiet = disc.filter(r => r.dReD <= 3);          /* 새 축의 반례 */
  const big = old.filter(r => r.dOx >= 5);
  const bigQuiet = big.filter(r => r.nDisc === 0);

  console.log('· 주입 ' + FRAMES + '판 중 유효 ' + rows.length + '판 · 옛 축(dOx≥2) ' + old.length +
              '판 · 새 축(nDisc>0) ' + disc.length + '판');
  for (const r of old.slice(0, 40)) {
    console.log('   dOx=' + r.dOx.toFixed(1) + ' dOy=' + r.dOy.toFixed(1) +
                ' du=' + r.du.toFixed(2) + ' dv=' + r.dv.toFixed(2) +
                ' 표본=' + r.nSmp + ' 판별=' + r.nDisc +
                ' Δ발표=' + r.dPub + ' Δ되계산=' + r.dRe + ' Δ판별=' + r.dReD);
  }

  ok(oldBlind.length > 0 && oldQuiet.every(r => r.nDisc === 0),
     '1 재현 — 옛 축이 세는 판 중 «판별 표본 0» 인 판이 있다(되계산이 다른 색을 읽는다는 근거가 아예 없는 판)',
     old.length + '판 중 ' + oldBlind.length + '판이 근거 0 · 이번 판에서 실제로 조용했던(dRe≤3) 판 ' +
     oldQuiet.length + '개 — 나머지는 얹힘 그림(적·스킬)이 우연히 빨갛게 만든 것이라 **운**이다');
  ok(band.length > 0 && rows.every(r => !(Math.abs(r.ru) <= 1 && Math.abs(r.rv) <= 1) || r.nDisc === 0),
     '2 뿌리(산수) — 옛 문턱 2장치px = ' + (rows.length ? (2 / (rows[0].sc * rows[0].SC)).toFixed(2) : '?') +
     '텍셀인데 표본이 «3×3 평평» 이라 |ru|≤1·|rv|≤1 이면 판별 표본이 구조적으로 0 이다',
     '그 구간에 떨어진 옛 축 판 ' + band.length + '개 · |ru|≤1·|rv|≤1 인데 판별>0 인 반례 ' +
     rows.filter(r => Math.abs(r.ru) <= 1 && Math.abs(r.rv) <= 1 && r.nDisc > 0).length + '건');
  ok(disc.length > 0 && discQuiet.length === 0,
     '3 새 축 — 판별 표본이 있는 판은 예외 없이 «되계산» 이 빨갛다(반례 0건)',
     disc.length + '판 · 반례 ' + discQuiet.length + '건 · Δ판별 최소 ' +
     (disc.length ? Math.min(...disc.map(r => r.dReD)) : '—'));
  ok(disc.length >= Math.ceil(rows.length * 0.2),
     '4 굶기지 않는다 — 판별 판이 유효 판의 20% 이상',
     disc.length + '/' + rows.length + '판(' + (rows.length ? (100 * disc.length / rows.length).toFixed(0) : 0) + '%)');
  ok(bigQuiet.length > 0,
     '5 문턱을 올려서 닫을 수 없다 — dOx ≥ 5장치px 인 판 중에도 판별 표본 0 인 판이 있다',
     big.length + '판 중 ' + bigQuiet.length + '판(dOx ' +
     (bigQuiet.map(r => r.dOx.toFixed(1)).join('·') || '—') + ')');
  ok(rows.length > 0 && rows.every(r => r.nDisc0 === 0),
     '6 되돌림 — 제품이 셰이크를 발표값에 안 실으면(du=dv=0) 판별 표본이 구조적으로 0 이다(판 0 ⇒ [E-R4] 빨강)',
     rows.length + '판 전부 nDisc0=0 · 최댓값 ' + Math.max(0, ...rows.map(r => r.nDisc0)));
  ok(errs.length === 0, '7 콘솔/페이지 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('PROBE943 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL (' + fail + '건)' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
