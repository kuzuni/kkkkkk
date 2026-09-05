/* 작업 864 재현 프로브 — «boom(화염구) ↔ bounce(도약 연쇄탄) 이 형태만으로는 같은 그림»
 *
 *   node tools/probe864.js
 *
 * 등재 근거(856 3회차 비평 DC 실측 · 2회차 CZ 동일): 두 발의 실루엣 IoU 0.951
 *   (⌀95.4 ↔ ⌀96.2 · 코어 22×22 ↔ 22×22 — 차이는 bounce 의 X 이음매뿐이고 그건 «속» 이다).
 *
 * 왜 자동 게이트 `probe710` 은 이걸 못 봤나(710 은 boom↔bounce 0.557 로 통과):
 *   710 은 두 발을 «제 크기 그대로 · 제자리에» 겹쳐 재는 자라, boom 의 방사 발광(r≈21)이
 *   bounce 의 본체+구운 링(r≈16)보다 커서 크기 차만으로 IoU 가 내려간다. 비평가는 화면에서
 *   **같은 ⌀95 원반 둘**로 봤다 — 그건 «형태(shape)» 축이지 «크기» 축이 아니다.
 *
 * 이 자가 재는 것 = **형태만**(792/856 이후 실전 경로: `AURA_ON=1` 이라 후광은 **본체 실루엣에서
 *   구운 링**이다 — bounce 본체가 원이면 그 링도 원이라 boom 의 둥근 발광과 같은 원반이 된다):
 *   ⓐ 색을 안 본다(둘 다 같은 색을 강제) — 412 교훈.
 *   ⓑ 각 발의 마스크를 **bbox 로 잘라 같은 64×64 격자에 채워** 비교한다(크기 차를 지운 «형태» IoU).
 *   ⓒ 참고로 «제자리 겹침» IoU(710 방식)도 같이 찍는다.
 *
 * 통과 방향(수리 후): bounce 를 **두 마디(본체 + 뒤꼬리 에코)** 로 갈라 원반이 아니게 하면
 *   형태 IoU 가 크게 내려간다. 자(`verify864`)가 문턱을 건다. 되돌리면 도로 올라간다(§R).
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
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

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
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

    /* 용사 옆 70게임px — edgeFade/겹침 감쇠를 피하는 자리(710 과 같은 규약) */
    /* ⚑ 936 — **재는 자리를 못박는다**(928 처방의 나머지 여집합 · 형제 자 8곳).
       상자는 `player.x` 에 매달려 있는데 플레이어는 ① `page.goto` 뒤 실시간 루프 ② `putFoe()` 가
       «적이 나올 때까지» 도는 `step()` 을 타고 **판마다 다른 자리**에 선다. 그러면 상자가 잡는
       그림의 몫이 달라진다 — 수리 전 실측(프로세스 3판): `verify710` 잉크 화소 shuri 5072 /
       5913 / 6287(±12%) · lance 4771 / 5427 / 6068. 못박으면 판을 넘어 같은 값이 나온다.
       ⚠ 자리는 제품의 «집»(`spawnStage()` 가 쓰는 `WORLD.w/2, WORLD.h/2`)에서 판다 — 자에
         좌표를 손으로 적으면 그것이 곧 사본이다(402).
       ⚠ **재는 것은 한 칸도 안 바뀐다** — 상자 크기·문턱·발 놓는 자리(`CX − ox`)는 그대로고,
         바뀌는 것은 «어느 자리에서 재는가» 뿐이다. */
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
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
      /* 색을 강제로 같게(형태만 본다) · 자리·각도 고정(정렬) */
      shots.push({ k: sh, sh: sh, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                   dmg: 0, life: 9, pierce: 99, hit: [], col: '#e0e0e0' });
      const after = grab();
      const { m, n } = maskOf(base, after);
      clearFx();
      /* bbox */
      let x0 = bw, y0 = bh, x1 = -1, y1 = -1;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        if (m[y * bw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { m: Array.from(m), n, bbox: [x0, y0, x1, y1], bw, bh };
    };

    const boom = shot('fire');    /* 화염구 = boom */
    const bounce = shot('ball');  /* 도약 연쇄탄 = bounce */

    /* ⓑ bbox 정규화 IoU — 각 마스크의 bbox 를 N×N 로 채워 «형태» 만 비교 */
    const N = 64;
    const norm = (r) => {
      const g = new Uint8Array(N * N);
      const [x0, y0, x1, y1] = r.bbox;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      if (w <= 0 || h <= 0) return g;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const sx = x0 + Math.min(w - 1, Math.floor(i * w / N));
        const sy = y0 + Math.min(h - 1, Math.floor(j * h / N));
        g[j * N + i] = r.m[sy * r.bw + sx];
      }
      return g;
    };
    const A = norm(boom), B = norm(bounce);
    let inter = 0, uni = 0;
    for (let p = 0; p < A.length; p++) { if (A[p] & B[p]) inter++; if (A[p] | B[p]) uni++; }
    const shapeIoU = uni ? inter / uni : 0;

    /* ⓒ 참고 — 제자리 겹침 IoU(710 방식) */
    let ri = 0, ru = 0;
    for (let p = 0; p < boom.m.length; p++) { if (boom.m[p] & bounce.m[p]) ri++; if (boom.m[p] | bounce.m[p]) ru++; }
    const placeIoU = ru ? ri / ru : 0;

    const bbW = (r) => r.bbox[2] - r.bbox[0] + 1, bbH = (r) => r.bbox[3] - r.bbox[1] + 1;
    return {
      shapeIoU: +shapeIoU.toFixed(4), placeIoU: +placeIoU.toFixed(4),
      boom: { ink: boom.n, w: bbW(boom), h: bbH(boom) },
      bounce: { ink: bounce.n, w: bbW(bounce), h: bbH(bounce) },
      SC: +SC.toFixed(2),
    };
  });

  await browser.close();
  return { out, errs };
}

(async () => {
  console.log('=== PROBE 864 — boom ↔ bounce 형태(실루엣) 중복 ===\n');
  const { out, errs } = await measure('file://' + SRC);
  if (!out || out.__err) { console.log('측정 실패: ' + (out && out.__err)); process.exit(1); }

  console.log('  SC(기기화소배율) = ' + out.SC);
  console.log('  boom   잉크 ' + out.boom.ink + 'px · bbox ' + out.boom.w + '×' + out.boom.h + ' (기기px)');
  console.log('  bounce 잉크 ' + out.bounce.ink + 'px · bbox ' + out.bounce.w + '×' + out.bounce.h + ' (기기px)');
  console.log('');
  console.log('  [형태 IoU] bbox 정규화(크기 지움) = ' + out.shapeIoU.toFixed(3) + '   ← 비평가 축(«형태만»)');
  console.log('  [겹침 IoU] 제자리(710 방식)        = ' + out.placeIoU.toFixed(3));
  console.log('');

  /* 이 프로브는 «재현자» 다 — 수리 전에는 형태 IoU 가 높아야(≈0.9+) 결손이 재현된 것이다.
     수리 후에는 낮아야(< 0.85) 갈린 것이다. 자(`verify864`)가 문턱을 건다. 여기서는 둘 다 찍고
     현재 상태를 그대로 보고한다(재현/수리 어느 쪽이든 «측정이 됐다» 가 통과다). */
  ok(out.boom.ink > 300, '[1] boom 이 그려졌다 (' + out.boom.ink + 'px)');
  ok(out.bounce.ink > 300, '[2] bounce 가 그려졌다 (' + out.bounce.ink + 'px)');
  ok(out.shapeIoU >= 0 && out.shapeIoU <= 1, '[3] 형태 IoU 측정됨 = ' + out.shapeIoU.toFixed(3));
  ok(errs.length === 0, '[4] 콘솔/페이지 오류 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0].slice(0, 120) : ''));

  console.log('\nPROBE864 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
