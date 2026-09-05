#!/usr/bin/env node
/* 929 재현 — `verify79` [E] 와 `probe523` [4] 가 «맞거나 완전히 다른 텍셀» 로 갈리는 이유를 찍는다.
 *
 *   node tools/probe929.js
 *
 * 등재문의 1순위 가설은 «한 틱 지연»(rAF 두 겹 안에서 읽은 player.x 가 그려진 판보다 한 틱 앞선다)이었다.
 * 이 자는 그 가설을 포함해 넷을 **한 프레임 안에서** 갈라 놓는다 — 프레임마다 여러 벌을 같이 재기 때문에
 * «어느 벌이 Δ=0 인가» 가 곧 답이다:
 *   ⓐ 그리기 배율(`PLAYER_DRAW_SC` = 1.5) 누락 — 제품 `drawFrame` 은 **로컬 좌표에 scale 을 곱해서** 그리는데
 *      (index.html 21015 — `(-fr[6]/2 + fr[4] + xo)*scale`, `fr[2]*scale`) 자의 역산은 scale 이 **1** 이다.
 *      ⇒ 어긋남이 상수가 아니라 **텍셀마다 다르다**(밑동에서 0, 멀어질수록 커진다).
 *   ⓑ 한 틱 지연 — 그려진 판이 «한 틱 전» 좌표라면 이전 프레임의 player.x/cam 으로 읽어야 Δ=0 이다.
 *   ⓒ 셰이크 — `draw()` 의 `ox` 에는 `sx = rnd(±shake)·0.45` 가 들었는데 자는 `cam.x` 로 되계산한다.
 *      제품은 그 프레임에 실제로 쓴 값을 `camOx`/`camOy` 전역으로 발표한다(index.html 28112).
 *   ⓓ 그 밖(자리 산식 자체).
 *
 * 검사 항목:
 *   [1] 재현 — 현행 식으로 전역 표본을 읽으면 Δ 가 크게 빨갛다(무변경 트리에서 상시)
 *   [2] ⓐ 확인 — 제품 식(`scale` 포함)으로 역산하면 같은 표본이 Δ ≤ 3
 *   [3] ⓐ 산식 — 어긋난 장치px 이 표본마다 다르고 `(lx0+u+0.5)·(scale−1)·SC` 예측과 ±1px 안에서 맞는다
 *   [4] ⓐ 기계 — 「어긋남 0」 인 텍셀은 열 하나뿐이다(= verify79 [E] 가 어떤 판에서 초록이 되는 이유)
 *   [5] ⓑ 기각 — 빨간 표본을 «한 틱 전» 좌표로 읽어도 안 닫힌다(지연 가설 기각)
 *   [6] ⓒ 주입 — 셰이크를 실제로 켜면 되계산 `ox` 는 빨개지고 제품이 발표한 `camOx` 는 초록이다
 *   [7] 콘솔/페이지 에러 0건
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

/* 한 프레임 = 여러 벌(현행 식 · 제품 식 · 한 틱 전 · camOx)을 같은 표본으로 잰다.
   ⚠ 셰이크를 «끄지» 않는다 — [6] 은 오히려 켜서 갈라낸다. */
const shot = (page, prev, inject) => page.evaluate(([prevSt, inj]) => new Promise(res => {
  if (inj && inj.shake) cam.shake = inj.shake;      /* ⓒ 주입 — 이 프레임의 draw 가 실제로 흔들리게 한다 */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const frN = curFrame(player); if (!frN) return res(null);
    const fr = ATLAS.knight.f[frN];
    const av = AV[S.avatar], img = tinted('knight', av && av.tint);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const td = g.getImageData(fr[0], fr[1], fr[2], fr[3]).data;

    /* 색까지 평평한 3×3 텍셀만 본다(verify79 [E]·probe523 [4] 와 같은 조건 — 경계는 스무딩이 섞는다) */
    const flat = [];
    for (let py = 1; py < fr[3] - 1; py++) for (let px = 1; px < fr[2] - 1; px++) {
      const o = (py * fr[2] + px) * 4;
      let good = true;
      for (let j = -1; j <= 1 && good; j++) for (let i = -1; i <= 1; i++) {
        const q = ((py + j) * fr[2] + px + i) * 4;
        if (td[q + 3] < 255 || td[q] !== td[o] || td[q + 1] !== td[o + 1] || td[q + 2] !== td[o + 2]) { good = false; break; }
      }
      if (good) flat.push([px, py, [td[o], td[o + 1], td[o + 2]]]);
      if (flat.length >= 160) { py = fr[3]; break; }
    }
    if (!flat.length) return res(null);

    const z = cam.z || 1, SCALE = PLAYER_DRAW_SC;
    /* 현행 자의 식 — cam.x 로 «되계산» 한다(그 프레임의 sx 가 빠진다) */
    const recomp = (cx, cy) => {
      let ox = -(cx - VW / (2 * z)), oy = -(cy - VH / (2 * z));
      if (WORLD.w > VW / z) ox = Math.max(VW / z - WORLD.w, Math.min(0, ox));
      if (WORLD.h > VH / z) oy = Math.max(VH / z - WORLD.h, Math.min(0, oy));
      return [ox, oy];
    };
    const xo = frameXo('knight', ATLAS.knight)[frN] || 0;
    const lx0 = -fr[6] / 2 + fr[4] + xo, ly0 = -fr[7] + fr[5];
    const dif = (p, col) => Math.max(Math.abs(p[0] - col[0]), Math.abs(p[1] - col[1]), Math.abs(p[2] - col[2]));
    /* sc = 1 이면 자의 현행 식, sc = PLAYER_DRAW_SC 면 제품 `drawFrame` 과 같은 식 */
    const read = (pxw, pyw, flipv, ox, oy, sc, u, v) => {
      const lx = flipv ? -((lx0 + u + 0.5) * sc) : ((lx0 + u + 0.5) * sc);
      const dxp = Math.round((pxw + lx + ox) * z * SC);
      const dyp = Math.round((pyw + (ly0 + v + 0.5) * sc + oy) * z * SC);
      if (dxp < 0 || dyp < 0 || dxp >= cvs.width || dyp >= cvs.height) return null;
      return { d: ctx.getImageData(dxp, dyp, 1, 1).data, x: dxp, y: dyp };
    };
    const measure = (pxw, pyw, flipv, ox, oy, sc) => {
      let dmax = 0, n = 0;
      for (const [u, v, col] of flat) {
        const r = read(pxw, pyw, flipv, ox, oy, sc, u, v);
        if (!r) continue;
        const d = dif(r.d, col); if (d > dmax) dmax = d; n++;
      }
      return { dmax, n };
    };

    const [oxR, oyR] = recomp(cam.x, cam.y);
    const cur = measure(player.x, player.y, player.flip, oxR, oyR, 1);                 /* 현행 식(scale 없음) */
    const prod = measure(player.x, player.y, player.flip, camOx, camOy, SCALE);        /* 제품 식 + 발표된 오프셋 */
    const prodRe = measure(player.x, player.y, player.flip, oxR, oyR, SCALE);          /* 제품 식 + 되계산 오프셋 */
    const lag = prevSt ? measure(prevSt.px, prevSt.py, prevSt.flip, ...recomp(prevSt.cx, prevSt.cy), 1) : null;

    /* 표본별 어긋남 — 예측(산식)과 실측(현행 식 자리에서 제품 식 자리까지의 장치px 거리) */
    const per = [];
    for (const [u, v, col] of flat.slice(0, 40)) {
      const a = read(player.x, player.y, player.flip, oxR, oyR, 1, u, v);
      const b = read(player.x, player.y, player.flip, camOx, camOy, SCALE, u, v);
      if (!a || !b) continue;
      per.push({ u, v, dxObs: b.x - a.x, dyObs: b.y - a.y,
        dxPred: Math.round((player.flip ? -1 : 1) * (lx0 + u + 0.5) * (SCALE - 1) * z * SC),
        dCur: dif(a.d, col), dProd: dif(b.d, col) });
    }
    /* 「어긋남 0」 열 — lx0 + u + 0.5 = 0 인 자리 */
    const uZero = -lx0 - 0.5;
    res({
      dCur: cur.dmax, dProd: prod.dmax, dProdRe: prodRe.dmax, dLag: lag ? lag.dmax : null, n: cur.n,
      shake: +cam.shake.toFixed(3), dOx: +((camOx - oxR) * SC).toFixed(2), dOy: +((camOy - oyR) * SC).toFixed(2),
      hit: player.hitFx > 0, SC, SCALE, uZero: +uZero.toFixed(2), fw: fr[2], fh: fr[3], per,
      st: { px: player.x, py: player.y, flip: !!player.flip, cx: cam.x, cy: cam.y }
    });
  }));
}), [prev, inject]);

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

  const rows = [];
  let prev = null;
  for (let i = 0; i < 24 && rows.length < 12; i++) {
    const r = await shot(page, prev, null);
    if (r && !r.hit) { rows.push(r); prev = r.st; }
    await page.waitForTimeout(60);
  }
  if (rows.length < 6) { console.log('FAIL 표본 프레임 부족 — ' + rows.length); await browser.close(); process.exit(1); }

  console.log(`프레임 ${rows.length}개 · 표본/프레임 ${rows[0].n} · 그리기 배율 PLAYER_DRAW_SC=${rows[0].SCALE} · SC=${rows[0].SC}`);
  rows.slice(0, 8).forEach(r => console.log(
    `  Δ현행(scale 없음)=${String(r.dCur).padStart(3)} · Δ제품식+camOx=${String(r.dProd).padStart(3)} · Δ제품식+되계산=${String(r.dProdRe).padStart(3)} · Δ한틱전=${r.dLag === null ? ' -' : r.dLag} · shake=${r.shake} · camOx−되계산=${r.dOx}px`));

  /* [1] 재현 */
  const curMax = Math.max(...rows.map(r => r.dCur));
  ok(rows.every(r => r.dCur > 3), '1 재현 — 현행 식(scale 없음)으로 전역 표본을 읽으면 전 프레임이 빨갛다',
    'Δmax=' + curMax + ' · 프레임 ' + rows.length + '개 전부');

  /* [2] ⓐ 확인 — «닫히는 판이 있는가» 로 묻는다. 스킬·적 그림이 플레이어 위에 얹히는 프레임이 섞이므로
     (아래 실측에서도 12판 중 1~2판) 판정은 판별로 세우고 **다수판 + 최솟값 0** 을 요구한다.
     현행 식은 그 반대다 — 한 판도 못 닫는다([1]). */
  const prodMin = Math.min(...rows.map(r => r.dProd));
  const prodClosed = rows.filter(r => r.dProd <= 3).length;
  ok(prodMin === 0 && prodClosed >= Math.ceil(rows.length * 0.6) && !rows.some(r => r.dCur <= 3),
    '2 ⓐ 확인 — 제품 식(`scale` 포함)은 판 다수를 Δ=0 으로 닫고 현행 식은 한 판도 못 닫는다',
    '닫힌 판 ' + prodClosed + '/' + rows.length + ' · Δmin=' + prodMin + ' · 현행 식으로 닫힌 판 ' + rows.filter(r => r.dCur <= 3).length);

  /* [3] ⓐ 산식 — 어긋남이 표본마다 다르고 예측과 맞는다 */
  const per = rows[0].per;
  const spread = Math.max(...per.map(p => p.dxObs)) - Math.min(...per.map(p => p.dxObs));
  const predOk = per.every(p => Math.abs(p.dxObs - p.dxPred) <= 1);
  ok(spread > 3 && predOk, '3 ⓐ 산식 — 어긋남이 표본마다 다르고 `(lx0+u+0.5)·(scale−1)·SC` 예측과 ±1px 안에서 맞는다',
    '가로 어긋남 폭 ' + spread + 'px · 예측 일치 ' + per.filter(p => Math.abs(p.dxObs - p.dxPred) <= 1).length + '/' + per.length);

  /* [4] ⓐ 기계 — 「어긋남 0」 은 열 하나뿐 */
  const zeroCols = new Set(per.filter(p => p.dxObs === 0).map(p => p.u));
  ok(zeroCols.size <= 1, '4 ⓐ 기계 — 어긋남 0 인 텍셀 열은 하나뿐이다(verify79 [E] 가 초록이 되는 유일한 자리)',
    'u* = ' + rows[0].uZero + ' · 어긋남 0 인 열 ' + [...zeroCols].join(',') + ' · 프레임 폭 ' + rows[0].fw);

  /* [5] ⓑ 기각 */
  const lagRows = rows.filter(r => r.dLag !== null);
  const lagFixed = lagRows.filter(r => r.dLag <= 3).length;
  ok(lagRows.length > 0 && lagFixed === 0, '5 ⓑ 기각 — «한 틱 전» 좌표로 읽어도 안 닫힌다(지연 가설 기각)',
    '닫힌 프레임 ' + lagFixed + '/' + lagRows.length + ' · Δ ' + lagRows.map(r => r.dLag).slice(0, 6).join(','));

  /* [6] ⓒ 주입 — 셰이크를 켜면 되계산 오프셋이 빨개지고 발표된 camOx 는 초록이다 */
  let inj = null, injN = 0, injRed = 0;
  for (let i = 0; i < 12; i++) {
    const r = await shot(page, null, { shake: 12 });
    if (r && !r.hit && Math.abs(r.dOx) >= 2) {             /* 실제로 흔들린 프레임만 */
      injN++; if (r.dProdRe > 3) injRed++;
      if (!inj || r.dProd < inj.dProd) inj = r;            /* 얹힘 판을 피해 «가장 잘 닫히는 판» 을 고른다([2] 와 같은 이유) */
      if (inj.dProd === 0 && injN >= 3) break;
    }
    await page.waitForTimeout(40);
  }
  ok(!!inj && inj.dProd <= 3 && injN > 0 && injRed === injN,
    '6 ⓒ 주입 — 셰이크가 도는 프레임에서 되계산 `ox` 는 빨갛고 제품이 발표한 `camOx` 는 초록이다',
    inj ? ('흔들린 판 ' + injN + '개 · 그중 되계산이 빨간 판 ' + injRed + ' · 최선 판 shake=' + inj.shake +
           ' · camOx−되계산=' + inj.dOx + 'px · Δ발표=' + inj.dProd + ' · Δ되계산=' + inj.dProdRe)
        : '흔들린 프레임을 못 잡았다');

  ok(errs.length === 0, '7 콘솔/페이지 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE929 ' + (fail ? 'FAIL (' + fail + '건)' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
