/* 작업 864 게이트 — «boom(화염구) ↔ bounce(도약 연쇄탄) 이 형태만으로는 같은 그림» 을 갈랐는가.
 *
 *   node tools/verify864.js
 *
 * 등재 근거: 856 3회차 비평 DC(2회차 CZ 동일) — 두 발의 실루엣 IoU 0.951(⌀95.4 ↔ ⌀96.2 ·
 *   코어 22×22 ↔ 22×22 · 차이는 bounce 의 X 이음매뿐인데 그건 «속»). `probe864` 가 그 자리를
 *   **형태(bbox 정규화) IoU 0.981** 로 재현했다(수리 전).
 *
 * 뿌리(왜 자동 게이트 `verify710` 은 통과였나 · 0.90 문턱 아래 0.557): 792/856 이후 실전 경로는
 *   `AURA_ON=1` 이라 후광이 **본체 실루엣에서 구운 링**(auraSprite)이다 — bounce 본체가 채운 원이면
 *   그 링도 원이라 화염구의 둥근 방사 발광과 같은 ⌀95 원반이 된다. 792 가 준 «납작 타원 후광» 은
 *   폴백(AURA_ON=0)에서만 살아 실전에서 죽어 있었다. 710 은 두 발을 «제 크기·제자리» 로 겹쳐
 *   재는 자라 크기 차(boom 발광 r≈21 ↔ bounce 본체+링 r≈16)에 IoU 가 내려가 결손을 못 봤다.
 *
 * 처방: bounce 본체를 **두 마디**(앞 공 + 아래·뒤 에코)로 갈라 원이 아니게 한다. 후광·코어가
 *   그 실루엣을 그대로 따라오고, 앞 공(주 마디 r12)은 한 획도 안 바꿔 `verify856` [B10c] 덩어리
 *   폭 밴드를 지킨다.
 *
 * 자의 축:
 *   [C1] 제품 선언 — `ball` 가지에 «864» 태그 + 뒤꼬리 에코(`EX`/`ER` 두 번째 원)가 있다.
 *   [A1] boom ↔ bounce **형태 IoU < 0.85** (수리 전 0.981 · 실측 ≈0.71).
 *   [A2] boom ↔ bounce **겹침 IoU < 0.90** (710 문턱과 정합 — 새 쌍둥이 아님).
 *   [A3] bounce ↔ meteor **겹침 IoU < 0.82** (에코를 뒤로만 빼면 운석 꼬리와 겹친다 — 아래로 뺐다).
 *   [A4] bounce **채움비 < 0.72** (원반은 ≈0.78 — 구조적으로 두 마디, 원이 아님).
 *   [A5] 둘 다 그려졌다 · 콘솔/페이지 오류 0.
 *   [R1] 되돌림(양성 대조) — 같은 자리에 **민 원반**을 그리면 형태 IoU ≥ 0.90 이다
 *        (자는 «둥근 것끼리» 를 실제로 높게 잰다 ⇒ [A1] 이 낮은 것은 bounce 가 정말 안 둥글기 때문).
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const SRC = path.resolve(__dirname, '../index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

async function measure(url) {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);
  const ev = async (fn) => {
    try { return await page.evaluate(fn); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const out = await ev(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;
    const clearFx = () => { shots.length = 0; enemies.length = 0; spawnQ.length = 0; };
    const CX = Math.round(player.x + ox + 70), CY = Math.round(player.y + oy - 22), R = 64;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const maskOf = (before, after) => {
      const m = new Uint8Array(bw * bh); let n = 0;
      for (let i = 0, p = 0; i < after.length; i += 4, p++) {
        if (Math.abs(after[i] - before[i]) > 8 || Math.abs(after[i + 1] - before[i + 1]) > 8 ||
            Math.abs(after[i + 2] - before[i + 2]) > 8) { m[p] = 1; n++; }
      }
      return { m, n };
    };

    clearFx();
    const base = grab();

    const shot = (sh) => {
      clearFx();
      shots.push({ k: sh, sh: sh, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                   dmg: 0, life: 9, pierce: 99, hit: [], col: '#e0e0e0' });
      const after = grab();
      const r = maskOf(base, after);
      clearFx();
      let x0 = bw, y0 = bh, x1 = -1, y1 = -1;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        if (r.m[y * bw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { m: r.m, n: r.n, bbox: [x0, y0, x1, y1] };
    };

    /* 민 원반 대조 — shotBody 를 안 지나고 «둥근 것» 을 직접 그린다(양성 대조 §R1) */
    const disk = (() => {
      clearFx();
      const px = CX * SC, py = CY * SC, rad = 46;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);   /* 기기 화소 공간에 직접(카메라/DPR 변환 무시) */
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.283); ctx.fill();
      const after = ctx.getImageData(bx, by, bw, bh).data;
      ctx.restore();
      const r = maskOf(base, after);
      draw();   /* 원반을 지운다(다음 grab 이 깨끗하게) */
      let x0 = bw, y0 = bh, x1 = -1, y1 = -1;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        if (r.m[y * bw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { m: r.m, n: r.n, bbox: [x0, y0, x1, y1] };
    })();

    const boom = shot('fire');
    const bounce = shot('ball');
    const meteor = shot('meteor');

    const N = 64;
    const norm = (r) => {
      const g = new Uint8Array(N * N);
      const [x0, y0, x1, y1] = r.bbox;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      if (w <= 0 || h <= 0) return g;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const sx = x0 + Math.min(w - 1, Math.floor(i * w / N));
        const sy = y0 + Math.min(h - 1, Math.floor(j * h / N));
        g[j * N + i] = r.m[sy * bw + sx];
      }
      return g;
    };
    const iouN = (a, b) => {
      const A = norm(a), B = norm(b); let inter = 0, uni = 0;
      for (let p = 0; p < A.length; p++) { if (A[p] & B[p]) inter++; if (A[p] | B[p]) uni++; }
      return uni ? inter / uni : 0;
    };
    const iouP = (a, b) => {
      let inter = 0, uni = 0;
      for (let p = 0; p < a.m.length; p++) { if (a.m[p] & b.m[p]) inter++; if (a.m[p] | b.m[p]) uni++; }
      return uni ? inter / uni : 0;
    };
    const fillRatio = (r) => {
      const [x0, y0, x1, y1] = r.bbox; const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      return area > 0 ? r.n / area : 1;
    };

    return {
      shapeIoU: +iouN(boom, bounce).toFixed(4),
      placeIoU: +iouP(boom, bounce).toFixed(4),
      meteorIoU: +iouP(bounce, meteor).toFixed(4),
      bounceFill: +fillRatio(bounce).toFixed(4),
      boomFill: +fillRatio(boom).toFixed(4),
      diskShapeIoU: +iouN(boom, disk).toFixed(4),
      boomInk: boom.n, bounceInk: bounce.n, diskInk: disk.n,
    };
  });

  await browser.close();
  return { out, errs };
}

(async () => {
  console.log('=== VERIFY 864 — boom ↔ bounce 형태 분간 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');

  /* [C] 제품 선언 — 처방이 게이트가 아니라 제품에 있다 */
  const ballIdx = src.indexOf("sh === 'ball'");
  const ballSeg = ballIdx >= 0 ? src.slice(ballIdx, ballIdx + 1600) : '';
  ok(ballIdx >= 0 && /864/.test(ballSeg) && /const EX\s*=/.test(ballSeg) &&
     /arc\(EX\s*,\s*EY\s*,\s*ER/.test(ballSeg),
     '[C1] `ball` 가지가 864 두 마디(앞 공 + 뒤꼬리 에코 `arc(EX,EY,ER…)`)를 그린다');

  const { out, errs } = await measure('file://' + SRC);
  if (!out || out.__err) { ok(false, '[A0] 측정 예외 — ' + (out && out.__err)); }
  else {
    console.log('  boom 잉크 ' + out.boomInk + 'px · bounce 잉크 ' + out.bounceInk + 'px · 대조원반 ' + out.diskInk + 'px');
    console.log('  형태 IoU(boom↔bounce) = ' + out.shapeIoU.toFixed(3) +
                '  · 겹침 IoU = ' + out.placeIoU.toFixed(3));
    console.log('  bounce↔meteor 겹침 IoU = ' + out.meteorIoU.toFixed(3) +
                '  · bounce 채움비 = ' + out.bounceFill.toFixed(3) + ' (boom ' + out.boomFill.toFixed(3) + ')');
    console.log('  §R 대조원반 형태 IoU(boom↔원반) = ' + out.diskShapeIoU.toFixed(3) + '\n');

    ok(out.boomInk > 300 && out.bounceInk > 300, '[A5] 둘 다 그려졌다 (boom ' + out.boomInk + ' · bounce ' + out.bounceInk + ')');
    ok(out.shapeIoU < 0.85, '[A1] boom↔bounce 형태 IoU ' + out.shapeIoU.toFixed(3) + ' < 0.85 (수리 전 0.981)');
    ok(out.placeIoU < 0.90, '[A2] boom↔bounce 겹침 IoU ' + out.placeIoU.toFixed(3) + ' < 0.90 (710 정합)');
    ok(out.meteorIoU < 0.82, '[A3] bounce↔meteor 겹침 IoU ' + out.meteorIoU.toFixed(3) + ' < 0.82 (운석 꼬리와 새 쌍둥이 아님)');
    ok(out.bounceFill < 0.72, '[A4] bounce 채움비 ' + out.bounceFill.toFixed(3) + ' < 0.72 (원반 ≈0.78 — 두 마디)');
    ok(out.diskShapeIoU >= 0.90,
       '[R1] 양성 대조 — 민 원반은 형태 IoU ' + out.diskShapeIoU.toFixed(3) + ' ≥ 0.90 (자가 «둥근 것» 을 높게 잰다)');
  }
  ok(errs.length === 0, '[A6] 콘솔/페이지 오류 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0].slice(0, 120) : ''));

  console.log('\nVERIFY864 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
