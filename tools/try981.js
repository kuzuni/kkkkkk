/* 작업 981 후보 탐색 — «손으로 고치기 전에 후보를 먼저 채점한다»
 *
 *   node tools/try981.js --dump                    # 17종 마스크를 한 번만 뜬다(브라우저 1회)
 *   node tools/try981.js --fam cres --vs moon      # 초승달 후보를 «moon 을 뺀 16종» 과 겨룬다
 *   node tools/try981.js --fam ring --vs moon --top 12
 *
 * ── 왜 이 자가 있나 ────────────────────────────────────────────────────
 * 981 2회차가 이 방식으로 세 종을 갈랐지만 **스크립트를 안 남겨서**(회차 기록 ⑧-3 이
 * «40줄이다» 라고만 적었다) 3·4회차가 같은 자를 다시 세워야 했다. 402 «사본을 지운다» 의
 * 반대편 — 사본이 아니라 **자체가 없어서** 다시 배우는 자리다. 그래서 파일로 남긴다.
 *
 * ── 재는 법 ────────────────────────────────────────────────────────────
 * `probe981` 의 `measure`·`normalize`·`alignedIoU` 를 **그대로 require** 한다(사본 0벌).
 * 후보는 브라우저를 안 타고 오프라인에서 격자로 찍어 같은 정규화(무게중심 0 · RMS 반지름
 * R_NORM)를 지난 뒤 나머지 16종과 회전·미러 정렬 IoU 를 잰다. 후보 하나에 1~2초.
 *
 * ⚠ 이 자는 **판정하지 않는다**(게이트가 아니다) — 표를 찍을 뿐이다. 값을 제품에 옮기는
 *    것은 사람이고, 옮긴 뒤에는 `probe981`(실물 마스크)이 다시 재는 것이 정답이다.
 *    ⚑ 2회차 ④ 교훈: 자가 재는 것은 «그린 형상» 이 아니라 «합성 결과» 라 후광·하이라이트가
 *    겹치면 오프라인 점수와 실물이 갈린다. 이 표는 **후보를 고르는 데**만 쓴다.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { measure, normalize, alignedIoU, URL } = require('./probe981');

const CACHE = process.env.TRY981_CACHE || path.join(os.tmpdir(), 'try981-masks.json');

/* ── 후보를 격자로 찍는다 ──────────────────────────────────────────────
   G 는 해상도이고 문턱이 아니다 — 정규화가 크기를 지우므로 «몇 칸이냐» 만 정한다.
   찍힌 점이 촘촘해야(정규화 후 간격 < 1) raster 에 구멍이 안 난다. */
const G = 220;
function stamp(inside, half) {
  const px = new Uint8Array(G * G);
  for (let j = 0; j < G; j++) {
    const y = ((j + 0.5) / G * 2 - 1) * half;
    for (let i = 0; i < G; i++) {
      const x = ((i + 0.5) / G * 2 - 1) * half;
      if (inside(x, y)) px[j * G + i] = 1;
    }
  }
  const nz = normalize(px, G);
  return nz && { nz, px, w: G };
}

/* ── 후보 가족 ────────────────────────────────────────────────────────── */

/* 초승달 — 바깥 원반(반지름 1, 원점) 에서 안쪽 원반(반지름 r, 중심 (d,0))을 뺀다.
   뿔 반각 θ: cos θ = (d² + 1 − r²) / (2d). θ > 90° 면 «180° 넘게 감았다». */
function cresCands() {
  const out = [];
  const DMAX = +(process.env.TRY981_DMAX || 1.6), RMAX = +(process.env.TRY981_RMAX || 1.8);
  for (let d = 0.30; d <= DMAX + 1e-5; d += 0.10) {
    for (let r = 0.35; r <= RMAX + 1e-5; r += 0.05) {
      if (d + r <= 1.02) continue;              /* 안쪽 원이 통째로 들어가면 «구멍» 이지 초승달이 아니다 */
      if (Math.abs(1 - r) >= d - 1e-9) continue; /* 두 원이 안 만나면 초승달이 아니다 */
      const c = (d * d + 1 - r * r) / (2 * d);
      if (c < -0.999 || c > 0.999) continue;
      const th = Math.acos(c);                   /* 뿔 반각(원점에서 본 각) */
      const back = 1 - (r - d);                  /* 등 쪽(θ=180°) 두께 */
      if (back < 0.12) continue;                 /* 실 없는 실루엣은 제품이 못 그린다 */
      out.push(Object.assign({ id: 'cres d' + d.toFixed(2) + ' r' + r.toFixed(2),
                 note: '뿔반각 ' + (th * 180 / Math.PI).toFixed(0) + '° · 등두께 ' + back.toFixed(2) },
                 stamp((x, y) => x * x + y * y <= 1 && (x - d) * (x - d) + y * y > r * r, 1.05)));
    }
  }
  return out;
}

/* 고리 토막 — 반지름 1 의 띠(두께 t)에서 각 gap 만큼 잘라 낸다(토막 수 seg). */
function ringCands() {
  const out = [];
  for (let t = 0.20; t <= 0.60001; t += 0.10) {
    for (const seg of [1, 2, 3]) {
      for (let gap = 0.0; gap <= 1.60001; gap += 0.20) {
        if (seg === 1 && gap < 0.2) continue;
        out.push(Object.assign({ id: 'ring t' + t.toFixed(2) + ' seg' + seg + ' gap' + gap.toFixed(2),
                   note: '띠 두께 ' + t.toFixed(2) },
                   stamp((x, y) => {
                     const rr = Math.hypot(x, y);
                     if (rr > 1 || rr < 1 - t) return false;
                     if (gap <= 0) return true;
                     let a = Math.atan2(y, x); if (a < 0) a += 2 * Math.PI;
                     const per = 2 * Math.PI / seg;
                     return (a % per) > gap;
                   }, 1.05)));
      }
    }
  }
  return out;
}

/* 굽은 띠(지금의 초승달·부메랑이 둘 다 여기 있다) — 대조군이다. */
function bandCands() {
  const out = [];
  for (let sweep = 0.6; sweep <= 3.60001; sweep += 0.30) {
    for (let t = 0.15; t <= 0.45001; t += 0.10) {
      out.push(Object.assign({ id: 'band sw' + (sweep * 180 / Math.PI).toFixed(0) + '° t' + t.toFixed(2),
                 note: '대조군(굽은 띠)' },
                 stamp((x, y) => {
                   const rr = Math.hypot(x, y);
                   if (rr > 1 || rr < 1 - t) return false;
                   return Math.abs(Math.atan2(y, x)) <= sweep / 2;
                 }, 1.05)));
    }
  }
  return out;
}

/* 알 사슬(5회차 신설) — «큰 알 + 뒤로 작아지는 에코» 무리. 지금의 `ball`(두 마디)과
   `bottle`(몸통 + 목)이 둘 다 이 무리 안이라 대조군이자 후보다.
     n    마디 수(2~4)
     k    한 마디마다 반지름이 곱해지는 비(작을수록 급히 줄어든다)
     d    중심 간격 ÷ (두 반지름의 합) — 1 이면 «맞닿는다», 1 미만은 겹친 땅콩, 1 초과는 **떨어진다**
     amp  진행축과 **직교**로 마디마다 번갈아 어긋나는 폭 ÷ 그 마디 반지름 (튀는 자국)
   ⚠ 정렬 IoU 는 회전·미러·크기를 지우므로 «두 알이 맞닿았다» 는 병(몸통+목)과 같은 그림이다.
     이 무리에서 갈리는 축은 **마디 수 · 떨어짐(d>1) · 지그재그(amp)** 셋뿐이다. */
function beadCands() {
  const out = [];
  for (const n of [2, 3, 4]) {
    for (let k = 0.50; k <= 0.85001; k += 0.05) {
      for (let d = 0.80; d <= 1.60001; d += 0.10) {
        for (const amp of [0, 0.6, 1.2]) {
          if (n === 2 && amp === 1.2) continue;         /* 두 마디에서는 지그재그가 곧 회전이다 */
          const cs = [];
          let r = 1, x = 0;
          for (let i = 0; i < n; i++) {
            const rr = r * Math.pow(k, i);
            if (i > 0) x -= d * (r * Math.pow(k, i - 1) + rr);
            cs.push({ x, y: (i % 2 ? 1 : -1) * amp * rr, r: rr });
          }
          out.push(Object.assign({ id: 'bead n' + n + ' k' + k.toFixed(2) + ' d' + d.toFixed(2) + ' a' + amp.toFixed(1),
                     note: (d > 1.001 ? '떨어짐' : d < 0.999 ? '겹침' : '맞닿음') + ' · 마디 ' + n },
                     stamp((px, py) => cs.some(c => (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y) <= c.r * c.r),
                           n === 2 ? 3.2 : n === 3 ? 4.2 : 5.0)));
        }
      }
    }
  }
  return out;
}

const FAMS = { cres: cresCands, ring: ringCands, band: bandCands, bead: beadCands,
               all: () => [].concat(cresCands(), ringCands(), bandCands(), beadCands()) };

/* ── 본문 ─────────────────────────────────────────────────────────────── */
(async () => {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };

  if (argv.includes('--dump')) {
    const { pw, launch } = require('./pwlaunch');
    const browser = await launch(pw().chromium, { args: ['--allow-file-access-from-files'] });
    const out = await measure(browser, URL);
    await browser.close();
    if (out && out.__err) { console.log('TRY981 오류 — ' + out.__err); process.exit(1); }
    const rows = {};
    for (const id in out.rows) rows[id] = { sh: out.rows[id].sh, body: Array.from(out.rows[id].body) };
    fs.writeFileSync(CACHE, JSON.stringify({ bw: out.bw, rows }));
    console.log('TRY981 — 마스크 ' + Object.keys(rows).length + '종을 ' + CACHE + ' 에 적었다');
    return;
  }

  if (!fs.existsSync(CACHE)) {
    console.log('TRY981 — 마스크 없음. 먼저 `node tools/try981.js --dump` 를 돌려라 (' + CACHE + ')');
    process.exit(3);
  }
  const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const others = [];
  for (const id in cache.rows) {
    const r = cache.rows[id];
    const px = Uint8Array.from(r.body);
    const nz = normalize(px, cache.bw);
    if (nz) others.push({ sh: r.sh, nz, px, w: cache.bw });
  }

  const skip = (arg('--vs', '') || '').split(',').filter(Boolean);
  const pool = others.filter(o => !skip.includes(o.sh));
  console.log('TRY981 — 겨루는 종 ' + pool.length + '개' + (skip.length ? ' (뺀 종: ' + skip.join(',') + ')' : ''));

  const fam = arg('--fam', 'cres');
  if (!FAMS[fam]) { console.log('TRY981 — 모르는 가족: ' + fam + ' (cres|ring|band)'); process.exit(3); }
  const cands = FAMS[fam]();
  console.log('  후보 ' + cands.length + '개 · 가족 ' + fam + '\n');

  /* ⚑⚑ 분간만 보고 고르면 두 자를 빨갛게 만든다 — 같이 찍는다(4회차 교훈).
     ⓐ `verify982` [B1] 채움 밀도 하한(중앙값 × 0.75) · ⓑ `verify792` [E1] 대각 밴드(중앙값 ±25%).
     밀도·«대각 ÷ √면적» 은 둘 다 **크기에 안 변하는 수**라 오프라인에서 그대로 견줄 수 있다
     (대각의 절대 px 은 제품에서 반지름을 정할 때 따라온다). */
  /* 격자 간격은 둘 다에서 약분된다 — 칸 수로만 세면 후보(G 격자)와 실물(1px 격자)을 그대로 견준다. */
  const shapeStats = (px, w) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
    for (let p = 0; p < px.length; p++) {
      if (!px[p]) continue;
      const x = p % w, y = (p - x) / w;
      n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const bw2 = x1 - x0 + 1, bh2 = y1 - y0 + 1;
    return { dens: n / (bw2 * bh2 || 1), slim: Math.hypot(bw2, bh2) / Math.sqrt(n || 1) };
  };
  const realDens = pool.map(o => shapeStats(o.px, o.w).dens).sort((a, b) => a - b);
  const dMed = realDens[realDens.length >> 1];
  const dLo = dMed * 0.75;
  console.log('  (겨루는 16종 밀도 중앙값 ' + dMed.toFixed(3) + ' · 982 [B1] 하한 ' + dLo.toFixed(3) + ')\n');

  const scored = [];
  for (const c of cands) {
    if (!c.nz) continue;
    let worst = 0, who = '';
    for (const o of pool) {
      const v = alignedIoU(c.nz, o.nz).iou;
      if (v > worst) { worst = v; who = o.sh; }
    }
    const st = shapeStats(c.px, c.w);
    scored.push({ id: c.id, note: c.note, worst, who, dens: st.dens, slim: st.slim });
  }
  scored.sort((a, b) => a.worst - b.worst);

  const top = +arg('--top', '15');
  const row = (s) => '    ' + s.id.padEnd(26) + ' 최악 ' + s.worst.toFixed(3) + ' ↔ ' + s.who.padEnd(9) +
    ' 밀도 ' + s.dens.toFixed(3) + (s.dens < dLo ? ' ✗982' : '     ') +
    ' 대각/√면적 ' + s.slim.toFixed(2) + '  ' + s.note;
  console.log('  ① 분간만 본 순위 — 최악이 낮은 순 ' + Math.min(top, scored.length) + '개');
  scored.slice(0, top).forEach(s => console.log(row(s)));

  const okDens = scored.filter(s => s.dens >= dLo);
  console.log('\n  ② **982 하한을 지키는** 후보만 — ' + okDens.length + '개 중 낮은 순 ' + Math.min(top, okDens.length) + '개');
  okDens.slice(0, top).forEach(s => console.log(row(s)));

  console.log('\n  (참고) 최악이 높은 순 3개');
  scored.slice(-3).reverse().forEach(s => console.log(row(s)));

  /* 표 전체를 파일로 — 한 번 돌리는 데 몇 분이 드니 다음 물음은 이 표에 물어라(다시 안 돌린다). */
  const csv = arg('--csv', '');
  if (csv) {
    fs.writeFileSync(csv, 'id,worst,who,dens,slim,note\n' +
      scored.map(s => [s.id, s.worst.toFixed(4), s.who, s.dens.toFixed(4), s.slim.toFixed(3), s.note].join(',')).join('\n') + '\n');
    console.log('\n  표 전체를 ' + csv + ' 에 적었다 (' + scored.length + '행)');
  }
})().catch((e) => { console.log('TRY981 오류 — ' + e.message); process.exit(1); });
