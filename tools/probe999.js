/* 작업 999 재현자 — `cap710` 시트 좌하단 블록(화소 x ≤ 88 · y ≥ 1838)이 판마다 갈리는 자리를 «누가 그리는가» 로 좁힌다.
 *
 *   node tools/probe999.js            — 한 판 안에서 draw() 를 여러 번 불러 블록 해시가 흔들리는지 (살아있는 시계 축)
 *   node tools/probe999.js --runs N   — N 판을 띄워 블록 해시를 견준다 (부팅 상태 축)
 *   node tools/probe999.js --paint    — 블록에 무엇이 그려지는지 층별로 지워 가며 찾는다
 *
 * ⚠ 996 이 세운 세 손잡이(씨앗·`orbitAng` 핀·`performance.now` 얼림)를 그대로 세우고 잰다 —
 *   그 셋으로 이미 닫힌 흔들림을 다시 세지 않기 위해서다(999 는 «그 셋과 무관한» 잔여다).
 *
 * ⚑⚑ **이 자가 답을 낸 순서(2026-09-06 · 기록으로 남긴다 — 다음에 같은 얼굴이 오면 이 사다리를 다시 탄다)**
 *   ① **판 «안» 인가 «간» 인가** — 한 판에서 draw() 를 여섯 번 불러도 해시가 **한 종**이고(살아있는 시계 아님),
 *      판을 가로질러서만 **두 종**으로 갈린다(16판 중 4판 = 25%). ⇒ 부팅이 남긴 상태다.
 *   ② **자원인가 그린 것인가** — `floorCv` 전 화소 해시가 **16판 전부 동일**하고, 바닥만 따로 블릿해도
 *      **동일**하다. ⇒ 바닥 그림도, 래스터·리샘플링도 아니다.
 *   ③ **어느 명령이 그 블록을 칠하는가** — 캔버스 2D 를 통째로 감싸 «칠하는 명령마다 블록 해시 전후»
 *      를 견줬더니 **여섯 개**만 블록을 건드렸고, 그중 범인은
 *      `strokeText/fillText('44.2A', 988.28, 958)` — **떠오르는 피해 숫자**(`nums`)였다.
 *   ④ **왜 갈리는가** — `nums` 는 `clearFx` 의 여덟 배열에 **안 들어 있어** 시전 부스러기가 그대로 남고,
 *      그 값이 판마다 «44.2A» ↔ «34.7A»(`raw` 44,234 ↔ 34,691 · `mg` 16 ↔ 15)로 갈린다.
 *      갈리는 이유는 하네스의 마지막 안 잡힌 자유도 — **용사 자리**가 부팅 1.2초의 rAF 프레임 수만큼
 *      흔들리기 때문이다(실측 boot x 857 / 1032 / 1077 / 961). 같은 뿌리의 다른 얼굴이 등재 `1000` 이다.
 *   ⇒ 수리는 `cap710` 의 `clearFx` 목록에 `nums`(와 같은 부류인 `corpses`)를 넣는 것.
 *      **문턱은 한 칸도 안 넓혔다**(334·796). 자는 `tools/verify999.js`(되돌림 시험 [R] 포함).
 *
 * ⚠ 수리된 트리에서 이 자를 돌리면 «서로 다른 그림 1종» 이 정상이다 — 갈래를 다시 보고 싶으면
 *   `verify999` [R] 처럼 `clearFx` 에서 `nums` 를 뺀 사본으로 돌려라.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const ARG = process.argv.slice(2);
const RUNS = (() => { const i = ARG.indexOf('--runs'); return i < 0 ? 0 : Number(ARG[i + 1] || 5); })();
const PAINT = ARG.includes('--paint');

/* 999 블록 — `probe996` 과 같은 자리(여유 붙인 bbox) */
const BLK = { x0: 0, x1: 90, y0: 1830, y1: 1996 };

/* cap710 의 준비 절차를 그대로 옮긴 것 — 시트를 찍지는 않고 «같은 상태» 까지만 만든다 */
async function setup(page) {
  await page.goto('file://' + SRC);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  return page.evaluate(() => {
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    performance.now = () => 1e6;
    orbitAng = 0;
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;
    let guard = 0;
    while (enemies.length === 0 && guard++ < 600) step(1 / 60);
    enemies.length = 0; spawnQ.length = 0;
    for (const a of [shots, ghosts, bolts, zones, booms, drones, parts, rings]) a.length = 0;
    player.x = -4000; player.y = -4000; player.dead = 0;
    cam.x = 540 - ox; cam.y = 0;
    step(1 / 60); draw();
    return { w: cvs.width, h: cvs.height, ox: camOx, oy: camOy, camx: cam.x, camy: cam.y };
  });
}

/* 블록 화소를 그대로 뽑는다(스크린샷을 안 거친다 — 996 이 «합성기가 아니다» 를 그렇게 확인했다) */
const GRAB = (BLK) => {
  const g = document.createElement('canvas');
  g.width = BLK.x1 - BLK.x0; g.height = Math.min(cvs.height, BLK.y1) - BLK.y0;
  g.getContext('2d').drawImage(cvs, BLK.x0, BLK.y0, g.width, g.height, 0, 0, g.width, g.height);
  const d = g.getContext('2d').getImageData(0, 0, g.width, g.height).data;
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return { hash: h.toString(16), w: g.width, h: g.height, px: Array.from(d) };
};

function diff(a, b) {
  let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  const cols = new Map();
  for (let i = 0; i < a.px.length; i += 4) {
    if (a.px[i] !== b.px[i] || a.px[i + 1] !== b.px[i + 1] || a.px[i + 2] !== b.px[i + 2] || a.px[i + 3] !== b.px[i + 3]) {
      n++;
      const p = i / 4, x = p % a.w, y = (p / a.w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const k = a.px.slice(i, i + 4).join(',') + ' -> ' + b.px.slice(i, i + 4).join(',');
      cols.set(k, (cols.get(k) || 0) + 1);
    }
  }
  return { n, box: n ? [BLK.x0 + x0, BLK.x0 + x1, BLK.y0 + y0, BLK.y0 + y1] : null,
           cols: [...cols.entries()].sort((p, q) => q[1] - p[1]).slice(0, 8) };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const mk = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    return ctx.newPage();
  };

  if (RUNS) {
    /* ── 축 ②: 판을 가로지르는 흔들림 ─────────────────────────────── */
    console.log('[999] 판 간 — ' + RUNS + '판 · 블록 x ' + BLK.x0 + '..' + BLK.x1 + ' · y ' + BLK.y0 + '..' + BLK.y1);
    const grabs = [];
    for (let i = 0; i < RUNS; i++) {
      const page = await mk();
      const info = await setup(page);
      const g = await page.evaluate(GRAB, BLK);
      grabs.push(g);
      console.log('  판 ' + (i + 1) + '  해시 ' + g.hash + '  ox ' + info.ox + ' oy ' + info.oy);
      await page.context().close();
    }
    const uniq = [...new Set(grabs.map(g => g.hash))];
    console.log('  서로 다른 그림 ' + uniq.length + '종 / ' + RUNS + '판');
    if (uniq.length > 1) {
      const a = grabs.find(g => g.hash === uniq[0]), b = grabs.find(g => g.hash === uniq[1]);
      const d = diff(a, b);
      console.log('  갈린 화소 ' + d.n + ' · bbox x ' + d.box[0] + '..' + d.box[1] + ' y ' + d.box[2] + '..' + d.box[3]);
      for (const [k, v] of d.cols) console.log('    ' + v + '  ' + k);
    }
    await browser.close();
    return;
  }

  /* ── 축 ①: 한 판 «안» 에서 흔들리는가 (살아있는 시계) ─────────────── */
  const page = await mk();
  const info = await setup(page);
  console.log('[999] 판 안 — 캔버스 ' + info.w + '×' + info.h + ' · ox ' + info.ox + ' oy ' + info.oy);
  const seq = [];
  for (let i = 0; i < 6; i++) {
    const g = await page.evaluate((BLK) => { draw(); return null; }, BLK).then(() => page.evaluate(GRAB, BLK));
    seq.push(g);
    await page.waitForTimeout(120);
  }
  const uniq = [...new Set(seq.map(g => g.hash))];
  console.log('  draw() 6회(각 120ms 간격) — 서로 다른 그림 ' + uniq.length + '종  [' + seq.map(g => g.hash).join(' ') + ']');
  if (uniq.length > 1) {
    const a = seq[0], b = seq.find(g => g.hash !== a.hash);
    const d = diff(a, b);
    console.log('  갈린 화소 ' + d.n + ' · bbox x ' + d.box[0] + '..' + d.box[1] + ' y ' + d.box[2] + '..' + d.box[3]);
    for (const [k, v] of d.cols) console.log('    ' + v + '  ' + k);
  }

  if (PAINT) {
    /* ── 축 ③: 그 블록에 무엇이 그려지는가 — 층을 하나씩 지워 본다 ──── */
    const rep = await page.evaluate((BLK) => {
      const grab = () => {
        const g = document.createElement('canvas');
        g.width = BLK.x1 - BLK.x0; g.height = Math.min(cvs.height, BLK.y1) - BLK.y0;
        g.getContext('2d').drawImage(cvs, BLK.x0, BLK.y0, g.width, g.height, 0, 0, g.width, g.height);
        const d = g.getContext('2d').getImageData(0, 0, g.width, g.height).data;
        let h = 0x811c9dc5 >>> 0;
        for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193) >>> 0; }
        return h.toString(16);
      };
      const out = [];
      draw(); const base = grab();
      const names = ['drawFloorDecor', 'drawWeather', 'drawFog', 'drawVignette', 'drawDebris',
                     'drawBoomSprites', 'drawShadow', 'drawRings', 'drawGhosts', 'drawDrones'];
      for (const n of names) {
        if (typeof window[n] !== 'function') { out.push(n + ' : 없음'); continue; }
        const old = window[n]; window[n] = () => {};
        draw(); const h = grab(); window[n] = old;
        out.push(n + ' : ' + (h === base ? '블록 그대로' : '블록 바뀜 ← 이 층이 그린다'));
      }
      /* floorCv 를 통째로 빼 본다 */
      const f = floorCv; floorCv = null; draw(); const hf = grab(); floorCv = f;
      out.push('floorCv : ' + (hf === base ? '블록 그대로' : '블록 바뀜 ← 이 층이 그린다'));
      return out;
    }, BLK);
    console.log('[999] 층 판별');
    for (const l of rep) console.log('  ' + l);
  }
  await browser.close();
})();
