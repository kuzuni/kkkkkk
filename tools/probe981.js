/* 작업 981 재현 — «초승달·4각별 프리미티브를 4종이 나눠 쓴다»
 *
 *   node tools/probe981.js
 *
 * ── 이 자가 답하는 질문 ────────────────────────────────────────────────
 * 981 등재문이 남긴 첫 숙제는 «어느 쪽이 옳은 질문인가» 다.
 *   ⓐ `verify792` [D1] — **그리는 자리 그대로** 두 종의 마스크를 겹쳐 IoU 를 잰다(0.79~0.83).
 *   ⓑ 비평가(CV·CW) — **회전·미러 정렬 후** 겹쳐 잰다(0.66 · 0.63 · 0.58 · 0.51).
 * 둘은 다른 질문이고, **분간(①)의 질문은 ⓑ 다.** 근거는 제품 안에 있다 —
 * `shotBody` 의 모든 가지가 `ctx.rotate(b.a)`(또는 `b.spin`)로 **진행 방향에 실루엣을 매단다**.
 * 즉 같은 종도 화면에서 온갖 각도로 나타나므로, «각도만 다른 두 종» 은 플레이어에게
 * 같은 그림이다. 절대 각도에 기대는 ⓐ 로는 그 사실이 안 보인다(그래서 [D1] 은 다섯 회차 동안
 * 초록인 채로 비평가 ①이 3~6점을 줬다).
 * ⇒ **[D1] 은 그대로 둔다**(710 이 얹은 «후광이 실루엣을 붙이지 않았나» 회귀 축 — 다른 질문이다).
 *    981 은 그 옆에 **회전·미러 불변 축**을 새로 세운다.
 *
 * ── 재는 법 ────────────────────────────────────────────────────────────
 * 본체 마스크(α ≥ 0.55)만 쓴다 — 후광·하이라이트는 792 가 «전 종 공통» 으로 못박은 층이라
 * 그것까지 겹치면 «17종이 다 같다» 는 자명한 답만 나온다(792 [B]·[B8] 이 그 축을 이미 지킨다).
 * 마스크 → ① 무게중심 이동 ② 면적 정규화(√면적으로 나눈다 — 크기 축은 792 [E1] 몫이다)
 * ③ 회전 1.5° × 240 스텝 × 미러 2 중 최댓값. 크기·각도·거울을 다 지운 뒤에도 남는 겹침이
 * «같은 프리미티브를 나눠 쓴다» 의 정량이다.
 *
 * ⚠ 마스크·상자·알파 풀이는 `verify792` 와 **같은 자**를 쓴다(사본이면 그것이 곧 어긋남 — 402).
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

/* 정규화 격자 — RMS 반지름을 R_NORM 으로 맞춘 뒤 N×N 에 찍는다.
   ⚠ 문턱이 아니라 **해상도**다(값이 커지면 느려질 뿐 답은 안 바뀐다 — [P] 가 그것을 확인한다). */
const N = 96, R_NORM = 19;
const STEPS = 240;                    /* 회전 탐색 — 1.5° 간격 */

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* ── 정규화: 마스크 화소 → 무게중심 0 · RMS 반지름 R_NORM 인 점 집합 ── */
function normalize(px, bw) {
  const pts = [];
  let sx = 0, sy = 0;
  for (let p = 0; p < px.length; p++) {
    if (!px[p]) continue;
    const x = p % bw, y = (p - x) / bw;
    pts.push(x, y); sx += x; sy += y;
  }
  const n = pts.length / 2;
  if (!n) return null;
  const cx = sx / n, cy = sy / n;
  let r2 = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const dx = pts[i] - cx, dy = pts[i + 1] - cy;
    r2 += dx * dx + dy * dy;
  }
  const rms = Math.sqrt(r2 / n) || 1;
  const k = R_NORM / rms;
  const out = new Float32Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    out[i] = (pts[i] - cx) * k;
    out[i + 1] = (pts[i + 1] - cy) * k;
  }
  return { pts: out, n };
}

function raster(pts, cos, sin, mir) {
  const g = new Uint8Array(N * N);
  const h = N >> 1;
  for (let i = 0; i < pts.length; i += 2) {
    const x0 = mir ? -pts[i] : pts[i], y0 = pts[i + 1];
    const x = x0 * cos - y0 * sin + h, y = x0 * sin + y0 * cos + h;
    const xi = x | 0, yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= N || yi >= N) continue;
    g[yi * N + xi] = 1;
  }
  return g;
}
const iouOf = (A, B) => {
  let inter = 0, uni = 0;
  for (let p = 0; p < A.length; p++) { const a = A[p], b = B[p]; if (a & b) inter++; if (a | b) uni++; }
  return uni ? inter / uni : 0;
};

/* 회전·미러 정렬 후 최대 IoU */
function alignedIoU(A, B) {
  const gb = raster(B.pts, 1, 0, 0);
  let best = 0, bestDeg = 0, bestMir = 0;
  for (let mir = 0; mir < 2; mir++) {
    for (let s = 0; s < STEPS; s++) {
      const th = (s * 2 * Math.PI) / STEPS;
      const v = iouOf(raster(A.pts, Math.cos(th), Math.sin(th), mir), gb);
      if (v > best) { best = v; bestDeg = Math.round((th * 180) / Math.PI); bestMir = mir; }
    }
  }
  return { iou: +best.toFixed(4), deg: bestDeg, mir: bestMir };
}

async function measure(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForTimeout(1100);
  const ev = async (fn) => {
    try { return await page.evaluate(fn); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const out = await ev(() => {
    /* 855 — 주사위·벽시계 고정. `verify792` 와 같은 자리·같은 처방(그 파일 주석이 본문). */
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

    const FXMAP = { shots, ghosts, bolts, zones, booms, drones, parts, rings };
    const clearFx = () => { for (const n in FXMAP) FXMAP[n].length = 0; };

    let foe = null;
    const putFoe = () => {
      if (!foe) { let g = 0; while (enemies.length === 0 && g++ < 600) step(1 / 60); foe = enemies[0]; }
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = 300 - ox; foe.y = 300 - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
      return foe;
    };

    const specs = {};
    /* ⚑⚑ 985 — 궤도각을 선언값에 세운다. `verify792.js` 같은 자리의 주석이 본문이다 —
       요약: `orbitAng` 은 `step()` 이 `+= dt*2.4` 로 누적하는 각이라 부팅 1.1초와 `putFoe()` 의
       «적이 나올 때까지» 루프가 판마다 다른 자리에 놓고, `spiral` 은 발사각을 `orbitAng*0.7`
       로 잡아(26291) 같은 발이 판마다 다른 각으로 찍힌다. ⚠ `putFoe()` **뒤**여야 한다.
       (855 «주사위» · 936 «상자» 와 같은 꼴의 세 번째 축 — 갈래를 가른 표는 `tools/probe985.js`) */
    putFoe(); orbitAng = 0;

    for (const s of SKILLS) {
      putFoe(); clearFx();
      let done = false;
      try { done = castSkill(s); } catch (e) { done = false; }
      if (done && shots.length) {
        const b = shots[0];
        specs[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                        tx: b.tx, ty: b.ty, fl0: b.fl0 };
      }
      clearFx();
    }

    putFoe(); clearFx();
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22), R = 60;
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const grab = () => { draw(); return ctx.getImageData(bx, by, bw, bh).data; };
    const _now = performance.now.bind(performance);
    performance.now = () => 1e6;
    const base = grab();

    const A_BODY = 0.55;
    const rows = {};
    for (const id in specs) {
      const sp = specs[id];
      const mk = () => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy, vx: 0, vy: 0, a: 0,
                          dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                          spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                          tx: sp.tx === undefined ? undefined : CX - ox,
                          ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });
      clearFx(); shots.push(mk());              const a0 = grab();
      clearFx(); shots.push(mk(), mk());        const a2 = grab();
      const hd = [], full = [];
      let ink = 0, hard = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) { hd.push(0); full.push(0); continue; }
        ink++;
        const d1 = a0[i + c] - base[i + c];
        const d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        full.push(1);
        if (al >= A_BODY) { hd.push(1); hard++; } else hd.push(0);
      }
      rows[id] = { sh: sp.sh, ink, hard, body: hd, all: full };
      clearFx();
    }
    performance.now = _now;
    return { rows, bw, bh };
  });
  await ctx.close();
  return out;
}

/* ⚑ 자(`verify981`)가 **같은 자**를 쓰도록 내보낸다 — 재는 법을 두 벌 적으면 그것이 곧
   어긋남이다(402 «사본을 지운다» · 792 가 `probe792` ↔ `verify792` 에서 겪은 자리). */
module.exports = { measure, normalize, alignedIoU, raster, iouOf, N, R_NORM, STEPS, URL };

if (require.main !== module) return;

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const out = await measure(browser, URL);
  await browser.close();
  if (!out || out.__err) { console.log('PROBE981 측정 실패 — ' + ((out && out.__err) || '결과 없음')); process.exit(3); }

  const ids = Object.keys(out.rows);
  console.log('PROBE981 — 회전·미러 정렬 후 실루엣 겹침 (본체만 · 종 ' + ids.length + ')');

  const norm = {}, normAll = {};
  for (const id of ids) {
    norm[id] = normalize(out.rows[id].body, out.bw);
    normAll[id] = normalize(out.rows[id].all, out.bw);
  }
  const shOf = id => out.rows[id].sh;

  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const A = norm[ids[i]], B = norm[ids[j]];
    if (!A || !B) continue;
    const r = alignedIoU(A, B);
    const raw = iouOf(raster(A.pts, 1, 0, 0), raster(B.pts, 1, 0, 0));
    pairs.push({ a: ids[i], b: ids[j], sa: shOf(ids[i]), sb: shOf(ids[j]),
                 iou: r.iou, deg: r.deg, mir: r.mir, raw: +raw.toFixed(4) });
  }
  pairs.sort((x, y) => y.iou - x.iou);

  console.log('\n  [1] 정렬 후 겹침 상위 10쌍 (정렬 IoU · 정렬 안 한 IoU · 맞춘 각/거울)');
  for (const p of pairs.slice(0, 10)) {
    console.log('      ' + (p.sa + '↔' + p.sb).padEnd(22) + ' 정렬 ' + p.iou.toFixed(3) +
                '  (그대로 ' + p.raw.toFixed(3) + ')  ' + String(p.deg).padStart(3) + '°' +
                (p.mir ? ' +거울' : '     ') + '   ' + p.a + '↔' + p.b);
  }

  const worst = pairs[0] || { iou: 0 };
  const rawMax = pairs.reduce((m, p) => Math.max(m, p.raw), 0);

  console.log('\n  [2] 두 질문이 실제로 갈리는가');
  /* ⚠ 1회차에 이 항을 «정렬 후 **최댓값**이 정렬 전 최댓값보다 크다» 로 적었다가 빨개졌고,
     그 빨강이 **자의 결함**이었다: 최댓값을 쥔 쌍(`stone↔boom`)은 둘 다 볼록 덩어리라
     회전을 시켜도 안 변한다(0.867 → 0.872). 두 질문이 갈리는 것은 «최댓값» 이 아니라
     **쌍별 상승분**에서 보인다 — `bounce↔flask` 는 0.453 → 0.848(+0.395)로, 정렬 전 자에게는
     «남남» 이고 정렬 후 자에게는 «같은 그림» 이다. 물음을 그쪽으로 고쳤다(979-② 와 같은 얼굴 —
     문턱을 넓혀 초록으로 되돌리는 대신 «무엇을 묻는가» 를 고친다). */
  const gain = pairs.reduce((m, p) => Math.max(m, p.iou - p.raw), 0);
  const gTop = pairs.slice().sort((x, y) => (y.iou - y.raw) - (x.iou - x.raw))[0];
  ok(gain >= 0.15,
     '[2-a] 정렬이 값을 실제로 바꾼다 — 쌍별 상승분 최댓값 ' + gain.toFixed(3) + ' ≥ 0.15 (' +
     (gTop ? gTop.sa + '↔' + gTop.sb + ' ' + gTop.raw.toFixed(3) + ' → ' + gTop.iou.toFixed(3) : '-') +
     ') · 정렬 후 최댓값 ' + worst.iou.toFixed(3) + ' (' + worst.sa + '↔' + worst.sb + ')');
  ok(rawMax <= 0.90,
     '[2-b] 정렬 전 최댓값 ' + rawMax.toFixed(3) + ' ≤ 0.90 — `verify792` [D1] 은 이 상태에서 초록이다' +
     ' (그래서 이 결손이 [D1] 에게는 안 보인다)');

  console.log('\n  [3] 등재문이 지목한 네 쌍');
  const want = [['arc', 'moon'], ['cross', 'star'], ['spear', 'arrow'], ['rock', 'rockfall']];
  const find = (x, y) => pairs.find(p => (p.sa === x && p.sb === y) || (p.sa === y && p.sb === x));
  for (const [x, y] of want) {
    const p = find(x, y);
    console.log('      ' + (x + '↔' + y).padEnd(22) + (p ? '정렬 ' + p.iou.toFixed(3) + '  (그대로 ' +
      p.raw.toFixed(3) + ')  ' + p.deg + '°' + (p.mir ? ' +거울' : '') : '— 쌍 없음(종이 안 나왔다)'));
  }
  const listed = want.map(([x, y]) => find(x, y)).filter(Boolean);
  ok(listed.length === want.length, '[3-a] 등재문의 네 쌍이 전부 측정됐다 — ' + listed.length + '/4');

  console.log('\n  [4] 결손의 크기');
  console.log('      전 쌍 정렬 IoU — 최대 ' + worst.iou.toFixed(3) + ' · 중앙값 ' +
    (pairs.length ? pairs[Math.floor(pairs.length / 2)].iou.toFixed(3) : '-') +
    ' · 최소 ' + (pairs.length ? pairs[pairs.length - 1].iou.toFixed(3) : '-'));
  console.log('      (기록) 종별 본체 화소 — ' +
    ids.map(i => out.rows[i].sh + ':' + out.rows[i].hard).join(' · '));

  console.log('\nPROBE981 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('PROBE981 오류 — ' + e.message); process.exit(1); });
