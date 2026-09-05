#!/usr/bin/env node
/* 79 검증 — 06 장비 시트의 영웅 그림 = 전투 씬 플레이어 스프라이트 (이모지 🦸 폐기)
 *
 *   node tools/verify79.js
 *
 * 검사 항목:
 *   [A] 기하 — .eqil-cv 가 #eqCards (45,495) 640×831 를 그대로 차지 + image-rendering:pixelated
 *   [B] 폐기 — .eqil / 🦸 이모지가 DOM 에 없다 (text-indent 보정 CSS 도 제거됨)
 *   [C] 잉크 — 캔버스에 실제로 그려졌고(불투명 픽셀 수) 발밑이 박스 바닥, 정수 배율(13)
 *   [D] 틴트 — av0·av3 각각 시트 캔버스 = tinted('knight', AV[av].tint) 재도시와 픽셀 일치(ΔRGB ≤ 3)
 *       (전투 drawFrame 이 쓰는 소스와 같은 tintCache 캔버스이므로 이것이 «전투와 같은 색» 의 근거)
 *   [E] 전투 대조 — 전투 캔버스에서 플레이어의 현재 프레임 텍셀 **다수**(전역 표본 ≤60)를 화면좌표로
 *       역산해 실제 픽셀을 읽고, 같은 텍셀의 tinted 아틀라스 색과 ΔRGB ≤ 3 (10프레임 재시도)
 *       역산은 제품 `drawFrame` 과 같은 식이어야 한다 — 243 가로 보정 `frameXo`(523) + **541 그리기
 *       배율 `PLAYER_DRAW_SC`**(929) 포함, 카메라 오프셋은 제품이 발표한 `camOx/camOy` 를 그대로 쓴다(929).
 *       표본은 «3×3 이 색까지 평평 + 틴트가 실제로 물들이는» 텍셀로 고른다.
 *       §R1 다른 코스튬 색과 대면 빨갛다 · §R2 243 보정을 빼면 도로 빨갛다 (523 되돌림 시험)
 *       §R3 541 그리기 배율을 빼면 도로 빨갛다 · §R4 셰이크를 주입하면 «되계산 ox» 는 빨갛다 (929)
 *   [F] 재생 — 시트가 열려 있는 동안 캔버스 내용이 바뀌고(idle 8fps), 닫으면 rAF 가 멈춘다(eqHeroRaf 0)
 *   [G] 코스튬 연동 — S.avatar 를 av0→av3 로 바꾸면 다시 열지 않아도 시트 색이 바뀐다
 *
 * getImageData 를 쓰므로 --allow-file-access-from-files 로 띄운다(file:// 아틀라스 오염 방지).
 */
const path = require('path');
const fs = require('fs');
/* 작업 925 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(같은 말을 손으로 적고 있었다).
   사슬을 안 지나면 뒤에 걸린 장치를 하나도 못 받는다 — 291 정착 · 731 소실 차단기 ·
   907 판 결정성 깃발 · 918/922 껍데기 걷개. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const args = ['--allow-file-access-from-files'];      /* file:// 아틀라스 getImageData 허용 */
  const browser = await launch(chromium, { args });   /* 925 — 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function' && ATLAS.knight && ATLAS.knight.image);
  await page.waitForTimeout(1200);

  /* 장비 시트 열기 */
  await page.evaluate(() => { heroTab = 'eq'; S.heroTab = 'eq'; goTab('hero', true); });
  await page.waitForTimeout(400);

  /* [A] 기하 */
  const geo = await page.evaluate(() => {
    const cv = document.querySelector('#eqCards .eqil-cv');
    if (!cv) return null;
    const r = cv.getBoundingClientRect(), p = $('eqCards').getBoundingClientRect();
    const fr = $('app').getBoundingClientRect();
    const k = 1080 / fr.width;                       /* fit() 스케일 보정 → 프레임 px */
    return { x: (r.left - p.left) * k, y: (r.top - p.top) * k, w: r.width * k, h: r.height * k,
             aw: cv.width, ah: cv.height, ir: getComputedStyle(cv).imageRendering };
  });
  ok(!!geo, 'A1 .eqil-cv 존재');
  if (geo) {
    const near = (a, b, t) => Math.abs(a - b) <= (t || 1.5);
    ok(near(geo.x, 45) && near(geo.y, 495) && near(geo.w, 640) && near(geo.h, 831),
       'A2 박스 45,495 640×831', JSON.stringify(geo));
    ok(geo.aw === 640 && geo.ah === 831, 'A3 캔버스 해상도 640×831(1:1)');
    ok(geo.ir === 'pixelated', 'A4 image-rendering:pixelated', geo.ir);
  }

  /* [B] 이모지 폐기 */
  const emo = await page.evaluate(() => ({
    eqil: !!document.querySelector('#eqCards .eqil'),
    hero: $('eqCards').innerHTML.includes('🦸')
  }));
  ok(!emo.eqil && !emo.hero, 'B1 .eqil/🦸 이모지 없음', JSON.stringify(emo));

  /* 페이지 쪽 공용: 시트 캔버스 잉크 스캔 */
  const scan = () => page.evaluate(() => {
    const cv = document.querySelector('#eqCards .eqil-cv');
    const d = cv.getContext('2d').getImageData(0, 0, 640, 831).data;
    let n = 0, x0 = 640, x1 = -1, y0 = 831, y1 = -1, sr = 0, sg = 0, sb = 0;
    for (let y = 0; y < 831; y++) for (let x = 0; x < 640; x++) {
      const a = d[(y * 640 + x) * 4 + 3];
      if (a > 200) { n++; sr += d[(y * 640 + x) * 4]; sg += d[(y * 640 + x) * 4 + 1]; sb += d[(y * 640 + x) * 4 + 2];
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { n, x0, x1, y0, y1, mr: sr / n, mg: sg / n, mb: sb / n };
  });

  /* [C] 잉크·앵커·배율 */
  const c1 = await scan();
  ok(c1.n > 30000, 'C1 잉크 픽셀 ' + c1.n + ' (> 30k)');
  ok(c1.y1 >= 830 - 13, 'C2 발밑 = 박스 바닥', 'inkBottom=' + c1.y1);
  ok(c1.x0 >= 0 && c1.x1 <= 639, 'C3 가로 박스 안', c1.x0 + '..' + c1.x1);
  const sc = await page.evaluate(() => {
    const fr = ATLAS.knight.f[curFrame(eqHero)];
    return { sc: Math.floor(831 / fr[7]) };
  });
  ok(sc.sc === 13, 'C4 정수 배율 13', String(sc.sc));
  /* 잉크 높이의 «정확한 배율» 은 D(13× 재도시와 전 픽셀 일치)가 증명한다 — 여기선 범위만 본다
     (외곽 반투명 행이 alpha 문턱에 잘려 src×13 보다 1~3행 짧게 읽힐 수 있다) */
  const inkH = c1.y1 - c1.y0 + 1;
  ok(inkH >= 44 * 13 && inkH <= 47 * 13, 'C5 잉크 높이 = src(44~47)×13 범위', String(inkH));

  /* [D] 틴트 일치 — 시트 캔버스를 tinted 아틀라스로 재도시해 전 픽셀 diff */
  for (const av of ['av0', 'av3']) {
    await page.evaluate(a => { S.avatar = a; }, av);
    await page.waitForTimeout(120);                     /* rAF 2틱 이상 */
    const dmax = await page.evaluate(() => {
      const cv = document.querySelector('#eqCards .eqil-cv');
      const frN = curFrame(eqHero), fr = ATLAS.knight.f[frN];
      const A = ATLAS.knight, f0 = A.f[A.a.idle[0]];
      /* ⚠ 523 — 이 `c0` 는 **`drawHeroTo` 의 재중심**이지 [E] 가 쓰는 243 `frameXo` 가 아니다.
         시트를 그리는 경로(`drawHeroTo`)가 idle 0프레임 잉크 중심을 제 손으로 계산하므로 여기도 그대로
         따라 적는다(기사에서는 두 값이 같지만, 같아야 할 이유가 다르다 — 바꿔 적으면 이 항이
         «시트 경로» 를 안 보게 된다). 전투 쪽 역산은 아래 [E] 가 `frameXo` 로 따로 묻는다. */
      const c0 = f0[6] / 2 - f0[4] - f0[2] / 2, sc = 13;
      const img = tinted('knight', AV[cosCur()].tint);
      const t = document.createElement('canvas'); t.width = 640; t.height = 831;
      const g = t.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.save(); g.translate(320, 831);
      g.drawImage(img, fr[0], fr[1], fr[2], fr[3],
        (-fr[6] / 2 + fr[4] + c0) * sc, (-fr[7] + fr[5]) * sc, fr[2] * sc, fr[3] * sc);
      g.restore();
      const a = cv.getContext('2d').getImageData(0, 0, 640, 831).data;
      const b = g.getImageData(0, 0, 640, 831).data;
      let dmax = 0, frameMoved = curFrame(eqHero) !== frN;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] < 200 && b[i + 3] < 200) continue;
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
        if (d > dmax) dmax = d;
      }
      return { dmax, frameMoved };
    });
    ok(!dmax.frameMoved && dmax.dmax <= 3, 'D ' + av + ' 시트 = tinted 재도시 (ΔRGB ≤ 3)', 'Δmax=' + dmax.dmax);
  }

  /* [E] 전투 대조 — 플레이어 텍셀을 화면좌표로 역산해 실제 픽셀을 읽는다 (10프레임 재시도)
     ⚠ 523 — 역산은 «제품에게 묻는다». `drawFrame`(index.html 21015)은 **로컬 좌표에 `scale` 을 곱해서**
     그린다(`(-fr[6]/2 + fr[4] + xo)*scale` · `-fr[7]*scale + fr[5]*scale` · `fr[2]*scale`), 그리고
     플레이어는 `PLAYER_DRAW_SC`(=1.5)로 그려진다(index.html 28228·28236).
     ⚑ **929 — 이 자는 그 `scale` 이 없던 시절의 사본을 갖고 있었다.** 그래서 어긋남이 상수가 아니라
     **텍셀마다** 다르고(`(lx0+u+0.5)·(scale−1)·SC` 장치px), 어긋남이 0 인 자리는 `lx0+u+0.5 = 0` 인
     **열 하나뿐**이다. 표본을 «src 사각형 한가운데서 바깥으로» 한 점만 고르던 옛 설계가 하필 그 열
     근처를 짚어, 짚은 자리에 따라 Δ=0 ↔ Δ=14~19 로 **갈리는 자**였다(929 등재문의 실측 5회 중 2회 빨강).
     ⇒ ① 한 점이 아니라 **스프라이트 전역의 색 평평 표본 다수**를 재고 ② 자리는 제품 식(scale·xo)으로
     역산하며 ③ 카메라 오프셋은 되계산하지 않고 **제품이 그 프레임에 실제로 쓴 값**(`camOx`/`camOy` —
     셰이크 `sx` 가 이미 들어 있다 · index.html 28112)을 읽는다.
     ⚠ 표본은 «3×3 이 색까지 같은» 텍셀로 고른다 — 전투 ctx 는 `imageSmoothingEnabled` 기본값(참)이고
     `player.x` 가 실수라 **색 경계 텍셀은 이웃과 섞여 찍힌다**. 허용 오차(≤3)는 한 칸도 안 넓혔다.
     ⚠ 프레임 재시도는 남는다 — 스킬·적 그림이 플레이어 위에 얹히는 프레임이 섞이기 때문이다(929 실측 12프레임 중 2). */
  let best = { d: 999 };
  for (let t = 0; t < 10 && best.d > 3; t++) {
    const r = await page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
      const frN = curFrame(player); if (!frN) return res(null);
      const fr = ATLAS.knight.f[frN];
      const av = AV[S.avatar], img = tinted('knight', av && av.tint);
      /* §R1 재료 — 다른 코스튬의 tinted 색(같은 텍셀). «어떤 색을 대도 초록» 이 아님을 못박는다 */
      const other = S.avatar === 'av0' ? 'av3' : 'av0';
      const img2 = tinted('knight', AV[other] && AV[other].tint);
      const grab = im => {
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        return g.getImageData(fr[0], fr[1], fr[2], fr[3]).data;
      };
      const td = grab(img), td2 = grab(img2);
      const at = (d, px, py) => [d[(py * fr[2] + px) * 4], d[(py * fr[2] + px) * 4 + 1], d[(py * fr[2] + px) * 4 + 2]];
      /* 표본 고르기 — 스프라이트 전역을 훑는다(한 점이 아니다 · 929).
         조건 ① 3×3 전부 불투명 ② 3×3 이 색까지 평평(스무딩 재표집 회피) ③ 틴트가 실제로 물들이는 자리 */
      const smp = [];
      for (let py = 1; py < fr[3] - 1; py++) for (let px = 1; px < fr[2] - 1; px++) {
        const o = (py * fr[2] + px) * 4;
        let good = true;
        for (let j = -1; j <= 1 && good; j++) for (let i = -1; i <= 1; i++) {
          const q = ((py + j) * fr[2] + px + i) * 4;
          if (td[q + 3] < 255 || td[q] !== td[o] || td[q + 1] !== td[o + 1] || td[q + 2] !== td[o + 2]) { good = false; break; }
        }
        if (!good) continue;
        const a = at(td, px, py), b = at(td2, px, py);
        if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) <= 8) continue;
        smp.push([px, py, a, b]);
        if (smp.length >= 60) { py = fr[3]; break; }
      }
      if (!smp.length) return res(null);

      /* drawFrame 수학 그대로 화면좌표 역산 (flip · 243 가로 보정 · 541 그리기 배율) */
      const z = cam.z || 1;
      const sc = (typeof PLAYER_DRAW_SC !== 'undefined') ? PLAYER_DRAW_SC : 1;   /* 옛 트리 대비 — 없으면 1 */
      const xo = frameXo('knight', ATLAS.knight)[frN] || 0;      /* 243 — 제품이 그릴 때 쓰는 그 값 */
      const lx0 = -fr[6] / 2 + fr[4] + xo, ly0 = -fr[7] + fr[5];
      const dif = (p, c) => Math.max(Math.abs(p[0] - c[0]), Math.abs(p[1] - c[1]), Math.abs(p[2] - c[2]));
      /* xoT·scT 는 되돌림 시험용 손잡이다 — 제품값을 넣으면 제품 식, 0/1 을 넣으면 그 항이 빠진 옛 식 */
      const readAt = (u, v, xoT, scT) => {
        const l = (-fr[6] / 2 + fr[4] + xoT + u + 0.5) * scT;
        const dxp = Math.round((player.x + (player.flip ? -l : l) + camOx) * z * SC);
        const dyp = Math.round((player.y + (ly0 + v + 0.5) * scT + camOy) * z * SC);
        if (dxp < 0 || dyp < 0 || dxp >= cvs.width || dyp >= cvs.height) return null;
        return ctx.getImageData(dxp, dyp, 1, 1).data;
      };
      /* ⚠ 되돌림 시험의 통계는 **판정과 같은 것**이어야 한다 — 판정이 Δmax 이므로 «항을 빼면 빨갛다» 도
         Δmax 로 묻는다(min 으로 물으면 «60개 중 하나는 우연히 맞는다» 가 곧 초록이 돼 항이 죽는다).
         §R1 만 min 이다 — «표본 **전부**가 다른 코스튬 색과 멀다» 는 더 센 주장이고 그게 참이다. */
      let d = 0, dOther = 999, dOld = 0, dNoSc = 0, n = 0;
      for (const [u, v, col, col2] of smp) {
        const pd = readAt(u, v, xo, sc); if (!pd) continue;
        n++;
        d = Math.max(d, dif(pd, col));                       /* 제품 식 — 이 값이 판정이다 */
        dOther = Math.min(dOther, dif(pd, col2));            /* §R1 — 다른 코스튬 색과의 거리(가장 가까운 표본) */
        const pdOld = readAt(u, v, 0, sc);                   /* §R2 — 243 보정을 뺀 옛 자리 */
        if (pdOld) dOld = Math.max(dOld, dif(pdOld, col));
        const pdNo = readAt(u, v, xo, 1);                    /* §R3 — 그리기 배율을 뺀 옛 자리 */
        if (pdNo) dNoSc = Math.max(dNoSc, dif(pdNo, col));
      }
      if (!n) return res(null);
      res({ d, dOther, dOld, dNoSc, n, xo, sc, uZero: -lx0 - 0.5,
            shift: Math.round(xo * sc * z * SC), hit: player.hitFx > 0 });
    }))));
    if (r && !r.hit && r.d < best.d) best = r;
    await page.waitForTimeout(80);
  }
  ok(best.d <= 3, 'E 전투 캔버스 텍셀 = tinted 색 (ΔRGB ≤ 3)',
     'Δmax=' + best.d + ' · 표본 ' + best.n + '개(전역 · 한 점이 아니다)');
  /* §R — 무르게 푼 수리가 아님을 세 겹으로 못박는다(523 둘 + 929 하나) */
  ok(best.dOther > 3, 'E-R1 같은 자리를 «다른 코스튬 색» 과 대면 빨갛다(문턱이 헐겁지 않다)', 'Δmin=' + best.dOther);
  ok(best.xo !== 0 && best.dOld > 3, 'E-R2 243 가로 보정을 빼면 도로 빨갛다(그 항이 이 판정을 지탱한다)',
     'xo=' + best.xo + ' · 장치px ' + best.shift + ' · Δmax=' + best.dOld);
  ok(best.sc !== 1 && best.dNoSc > 3, 'E-R3 541 그리기 배율(`PLAYER_DRAW_SC`)을 빼면 도로 빨갛다(929 — 이 자를 갈랐던 항)',
     'scale=' + best.sc + ' · 어긋남 0 인 열 u*=' + (best.uZero === undefined ? '?' : best.uZero.toFixed(1)) + ' · Δmax=' + best.dNoSc);

  /* §R4 (929) — 셰이크 주입. `draw()` 의 `ox` 에는 `sx = rnd(±shake)·0.45` 가 들어 있고 제품은 그 값을
     `camOx` 로 발표한다. 자가 `cam.x` 로 **되계산**하면 흔들리는 프레임마다 통째로 어긋난다 —
     이 항은 «발표된 값으로 읽는다» 를 지킨다(반복이 아니라 주입으로 가른다). */
  let inj = null, injN = 0, injRed = 0;
  for (let t = 0; t < 12; t++) {
    const r = await page.evaluate(() => new Promise(res => {
      cam.shake = 12;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const frN = curFrame(player); if (!frN) return res(null);
        const fr = ATLAS.knight.f[frN];
        const av = AV[S.avatar], img = tinted('knight', av && av.tint);
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const td = g.getImageData(fr[0], fr[1], fr[2], fr[3]).data;
        const smp = [];
        for (let py = 1; py < fr[3] - 1; py++) for (let px = 1; px < fr[2] - 1; px++) {
          const o = (py * fr[2] + px) * 4;
          let good = true;
          for (let j = -1; j <= 1 && good; j++) for (let i = -1; i <= 1; i++) {
            const q = ((py + j) * fr[2] + px + i) * 4;
            if (td[q + 3] < 255 || td[q] !== td[o] || td[q + 1] !== td[o + 1] || td[q + 2] !== td[o + 2]) { good = false; break; }
          }
          if (good) smp.push([px, py, [td[o], td[o + 1], td[o + 2]]]);
          if (smp.length >= 40) { py = fr[3]; break; }
        }
        if (!smp.length) return res(null);
        const z = cam.z || 1, sc = (typeof PLAYER_DRAW_SC !== 'undefined') ? PLAYER_DRAW_SC : 1;
        const xo = frameXo('knight', ATLAS.knight)[frN] || 0;
        const ly0 = -fr[7] + fr[5];
        /* 되계산 오프셋 — 셰이크가 빠진다(옛 식) */
        let oxR = -(cam.x - VW / (2 * z)), oyR = -(cam.y - VH / (2 * z));
        if (WORLD.w > VW / z) oxR = Math.max(VW / z - WORLD.w, Math.min(0, oxR));
        if (WORLD.h > VH / z) oyR = Math.max(VH / z - WORLD.h, Math.min(0, oyR));
        const dif = (p, cc) => Math.max(Math.abs(p[0] - cc[0]), Math.abs(p[1] - cc[1]), Math.abs(p[2] - cc[2]));
        const rd = (u, v, ox, oy) => {
          const l = (-fr[6] / 2 + fr[4] + xo + u + 0.5) * sc;
          const dxp = Math.round((player.x + (player.flip ? -l : l) + ox) * z * SC);
          const dyp = Math.round((player.y + (ly0 + v + 0.5) * sc + oy) * z * SC);
          if (dxp < 0 || dyp < 0 || dxp >= cvs.width || dyp >= cvs.height) return null;
          return ctx.getImageData(dxp, dyp, 1, 1).data;
        };
        let dPub = 0, dRe = 0;
        for (const [u, v, col] of smp) {
          const a = rd(u, v, camOx, camOy), b = rd(u, v, oxR, oyR);
          if (a) dPub = Math.max(dPub, dif(a, col));
          if (b) dRe = Math.max(dRe, dif(b, col));
        }
        res({ dPub, dRe, shake: cam.shake, dOx: Math.abs((camOx - oxR) * SC), hit: player.hitFx > 0 });
      }));
    }));
    if (r && !r.hit && r.dOx >= 2) {              /* 실제로 흔들린 프레임만 */
      injN++; if (r.dRe > 3) injRed++;
      if (!inj || r.dPub < inj.dPub) inj = r;    /* 얹힘 판(스킬·적 그림)을 피해 «가장 잘 닫히는 판» 을 고른다 */
      if (inj.dPub === 0 && injN >= 3) break;
    }
    await page.waitForTimeout(40);
  }
  ok(!!inj && inj.dPub <= 3 && injN > 0 && injRed === injN,
     'E-R4 셰이크를 켜면 «되계산 ox» 는 빨갛고 제품이 발표한 `camOx` 는 초록이다(929 · 주입 시험)',
     inj ? ('흔들린 판 ' + injN + '개 · 그중 되계산이 빨간 판 ' + injRed + ' · 셰이크 오프셋 ' +
            inj.dOx.toFixed(1) + '장치px · Δ발표=' + inj.dPub + ' · Δ되계산=' + inj.dRe)
         : '흔들린 프레임을 못 잡았다');
  await page.evaluate(() => { cam.shake = 0; });   /* 뒤 절([F][G])에 흔들림을 남기지 않는다 */
  /* [F] 재생·정지 */
  const f1 = await page.evaluate(() => document.querySelector('#eqCards .eqil-cv').toDataURL());
  await page.waitForTimeout(400);                       /* 8fps → 3프레임쯤 진행 */
  const f2 = await page.evaluate(() => document.querySelector('#eqCards .eqil-cv').toDataURL());
  ok(f1 !== f2, 'F1 idle 재생 중 (400ms 간격 캔버스 변화)');
  await page.evaluate(() => { panelOpen = false; syncPanel(); });
  await page.waitForTimeout(200);
  const raf = await page.evaluate(() => ({ raf: eqHeroRaf, on: $('eqw').classList.contains('on') }));
  ok(!raf.on && raf.raf === 0, 'F2 시트 닫힘 → rAF 정지', JSON.stringify(raf));

  /* [G] 코스튬 연동 — av0 ↔ av3 평균색 차이 (열린 상태에서 실시간) */
  await page.evaluate(() => { heroTab = 'eq'; S.heroTab = 'eq'; goTab('hero', true); S.avatar = 'av0'; });
  await page.waitForTimeout(150);
  const g0 = await scan();
  await page.evaluate(() => { S.avatar = 'av3'; });
  await page.waitForTimeout(150);
  const g3 = await scan();
  const dm = Math.max(Math.abs(g0.mr - g3.mr), Math.abs(g0.mg - g3.mg), Math.abs(g0.mb - g3.mb));
  ok(dm > 8, 'G 코스튬 전환 시 실시간 색 변화', 'Δmean=' + dm.toFixed(1));
  await page.evaluate(() => { S.avatar = 'av0'; });

  ok(errs.length === 0, 'Z 콘솔/페이지 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(fail === 0 ? `VERIFY79 ${pass}/${pass + fail} PASS` : `VERIFY79 FAIL (${fail}건)`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
