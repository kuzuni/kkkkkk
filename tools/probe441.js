/* 작업 441 재현 자 — «아틀라스 애니 목록 안에 좌우 거울쌍이 섞여 있는가» 를 시트 픽셀로 센다.
 *
 * 등재문(PROGRESS 441)의 주장:
 *   `ATLAS.dragon.a.fly` 12프레임이 «같은 6포즈의 좌우 거울쌍» 이라 6프레임마다 180° 돌아선다.
 *
 * 338 규칙 — 처방 전에 재현부터. 이 자가 재는 것 셋:
 *   [A] 프레임별 잉크 픽셀 수(알파 > TH) — 거울은 픽셀 수가 **정확히** 같다(값이 아니라 «완전 일치» 를 본다).
 *   [B] 잉크 무게중심 x 를 프레임 폭으로 나눈 값 — 거울쌍은 (cx + cx') 가 1 에 붙는다.
 *   [C] **픽셀 완전 대조** — B 의 (sw-1-x, y) 가 A 의 (x, y) 와 RGBA 4채널 전부 같은가.
 *       [A]·[B] 는 정황이고 [C] 가 증거다. 이것만이 «거울» 과 «우연히 닮은 포즈» 를 가른다.
 *   [D] 전 아틀라스 전수 — 등재문 ⚠ «다른 아틀라스도 같은 병일 수 있다».
 *
 * 실행: node tools/probe441.js            (요약)
 *       node tools/probe441.js --all      (프레임별 표까지)
 *       V441_ATLAS=assets/atlas-data.js   (다른 사본을 재려면)
 */
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png441');

const ROOT = path.resolve(__dirname, '..');
const TH = 8;                 /* 알파 문턱 — ink411 과 같은 값 */
const SHOW_ALL = process.argv.includes('--all');

/* atlas-data.js 는 `window.ATLAS = {...}` 한 줄짜리 파일이라 그대로 평가한다. */
function loadAtlas() {
  const f = process.env.V441_ATLAS
    ? path.resolve(ROOT, process.env.V441_ATLAS)
    : path.join(ROOT, 'assets', 'atlas-data.js');
  const src = fs.readFileSync(f, 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win.ATLAS;
}

const sheets = new Map();
function sheet(img) {
  if (!sheets.has(img)) sheets.set(img, decodePNG(path.join(ROOT, img)));
  return sheets.get(img);
}

/* 프레임 rect = [sx, sy, sw, sh, dx, dy, fw, fh] — 시트에서 잘라 오는 것은 앞 넷이다. */
function stat(sh, r) {
  const [sx, sy, sw, shh] = r;
  let n = 0, sumx = 0, x0 = 1e9, x1 = -1;
  for (let y = 0; y < shh; y++) {
    const row = (sy + y) * sh.w * 4;
    for (let x = 0; x < sw; x++) {
      if (sh.px[row + (sx + x) * 4 + 3] > TH) {
        n++; sumx += x;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
    }
  }
  return { n, cx: n ? sumx / n / sw : 0, x0: x1 < 0 ? null : x0, x1: x1 < 0 ? null : x1 };
}

/* [C] B 를 좌우로 뒤집으면 A 와 픽셀이 같은가 — 4채널 완전 일치 픽셀 비율 */
function mirrorMatch(sh, ra, rb) {
  if (ra[2] !== rb[2] || ra[3] !== rb[3]) return null;
  const [ax, ay, w, h] = ra, [bx, by] = rb;
  let same = 0, tot = w * h;
  for (let y = 0; y < h; y++) {
    const arow = (ay + y) * sh.w * 4, brow = (by + y) * sh.w * 4;
    for (let x = 0; x < w; x++) {
      const ai = arow + (ax + x) * 4, bi = brow + (bx + (w - 1 - x)) * 4;
      /* 둘 다 투명하면 색은 안 본다(트림된 여백의 RGB 는 의미가 없다) */
      const aa = sh.px[ai + 3], ba = sh.px[bi + 3];
      if (aa <= TH && ba <= TH) { same++; continue; }
      if (aa === ba && sh.px[ai] === sh.px[bi] && sh.px[ai + 1] === sh.px[bi + 1]
          && sh.px[ai + 2] === sh.px[bi + 2]) same++;
    }
  }
  return same / tot;
}

/* 같은 방향인가(뒤집지 않고 그대로 같은가) — 중복 프레임 검출 */
function sameMatch(sh, ra, rb) {
  if (ra[2] !== rb[2] || ra[3] !== rb[3]) return null;
  const [ax, ay, w, h] = ra, [bx, by] = rb;
  let same = 0;
  for (let y = 0; y < h; y++) {
    const arow = (ay + y) * sh.w * 4, brow = (by + y) * sh.w * 4;
    for (let x = 0; x < w; x++) {
      const ai = arow + (ax + x) * 4, bi = brow + (bx + x) * 4;
      const aa = sh.px[ai + 3], ba = sh.px[bi + 3];
      if (aa <= TH && ba <= TH) { same++; continue; }
      if (aa === ba && sh.px[ai] === sh.px[bi] && sh.px[ai + 1] === sh.px[bi + 1]
          && sh.px[ai + 2] === sh.px[bi + 2]) same++;
    }
  }
  return same / (w * h);
}

const MIRROR_HIT = 0.999;      /* 거울로 판정하는 일치율 */

function run() {
  const ATLAS = loadAtlas();
  const rows = [];
  for (const key of Object.keys(ATLAS)) {
    const A = ATLAS[key];
    const sh = sheet(A.img);
    for (const anim of Object.keys(A.a || {})) {
      const names = A.a[anim];
      const st = names.map(n => ({ n, r: A.f[n], s: stat(sh, A.f[n]) }));
      /* 쌍 검사 — 목록 안 모든 조합 */
      const mir = [], dup = [];
      for (let i = 0; i < st.length; i++) {
        for (let j = i + 1; j < st.length; j++) {
          const m = mirrorMatch(sh, st[i].r, st[j].r);
          if (m != null && m >= MIRROR_HIT) {
            const d = sameMatch(sh, st[i].r, st[j].r);
            /* 좌우대칭 그림은 «거울 = 자기 자신» 이라 원본 일치도 높다 — 그 경우는 거울이 아니다 */
            if (d == null || d < MIRROR_HIT) mir.push([st[i].n, st[j].n, m]);
          }
          const d2 = sameMatch(sh, st[i].r, st[j].r);
          if (d2 != null && d2 >= MIRROR_HIT) dup.push([st[i].n, st[j].n, d2]);
        }
      }
      rows.push({ key, anim, st, mir, dup });
    }
  }
  return rows;
}

const rows = run();
console.log('== 441 재현 — 아틀라스 애니 목록의 좌우 거울쌍 ==');
console.log('   자: 픽셀 완전 대조(4채널) · 일치율 ≥ ' + MIRROR_HIT + ' 이면 거울\n');
let bad = 0;
for (const r of rows) {
  const tag = r.mir.length ? '⚑ 거울 ' + r.mir.length + '쌍' : '·';
  console.log(`[${r.key}.${r.anim}] ${r.st.length}프레임  ${tag}${r.dup.length ? '  (동일 ' + r.dup.length + '쌍)' : ''}`);
  if (r.mir.length) {
    bad++;
    for (const [a, b, m] of r.mir) console.log(`    거울: ${a} ↔ ${b}  일치 ${(m * 100).toFixed(2)}%`);
  }
  if (SHOW_ALL || r.mir.length) {
    for (const f of r.st) {
      console.log(`    ${f.n.padEnd(20)} 잉크 ${String(f.s.n).padStart(6)}px  cx ${f.s.cx.toFixed(3)}  x ${f.s.x0}..${f.s.x1}`);
    }
  }
}
console.log('\n거울쌍이 있는 애니: ' + bad + '개');
process.exit(0);
