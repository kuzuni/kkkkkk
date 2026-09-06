/* 작업 996 재현기 — «`cap710` 시트가 판마다 흔들린다» 를 눈으로가 아니라 화소로 가른다
 *
 *   node tools/probe996.js            → 같은 트리 N판(기본 4)을 찍어 칸별 흔들림을 센다
 *   node tools/probe996.js --runs 8
 *   node tools/probe996.js --sweep    → `CAP710_ORBIT` 위상 스윕(고른 자리가 최악인지 본다)
 *   node tools/probe996.js --off seed|orbit|clock   → 그 손잡이만 뺀 사본으로 같은 것을 센다
 *
 * ⚑ **338 규칙대로 처방 앞에 재현했고, 등재문의 뿌리 지목이 절반만 맞았다.**
 *   등재문은 «형제 자들은 `performance.now` 를 얼리는데 이 자만 안 얼린다» 를 뿌리로 적었는데,
 *   시계만 얼리면 **여섯 칸이 여섯 칸 그대로다**(실측 3판: `gale` 8,521 · `spiral` 9,316 …).
 *   실제로는 손잡이가 셋이고 각각 다른 것을 잡는다 — `--off` 로 하나씩 빼서 확인할 수 있다:
 *     seed  : `Math.random` 씨앗 — 배경 소품 자리. 빼면 `arrow`·`curve`·`rico` 가 되살아난다.
 *     orbit : `orbitAng` 핀 — **세 큰 칸의 뿌리**. 빼면 `whirl`·`gale`·`spiral` 이 되살아난다.
 *     clock : `performance.now` 얼림. 빼면 `rico` 한 칸이 86px 남는다.
 *
 * ⚠ **캡처는 커밋하지 않는다**(2026-08-30 이력 정리) — 전부 임시 폴더에 찍고 지운다.
 * ⚠ 좌하단 한 블록(`x ≤ 90 · y ≥ 1830`)은 **999 로 따로 등재된 잔여**다. 이 자는 그 블록을
 *   지우지 않고 «안/밖» 을 갈라서 둘 다 찍는다 — 밖이 0 이어야 하고, 안은 관찰값이다.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const PNG = require('./png913').PNG();

const CAP = path.resolve(__dirname, 'cap710.js');
const SRC = fs.readFileSync(CAP, 'utf8');

/* 시트의 격자 — `cap710` 과 **같은 산수**를 쓴다(사본이 아니라 같은 식을 적는다: 402).
   칸 중심 게임좌표 x = 90 + 118·열 · y = 110 + DY·행 · 화면 화소는 ×2. */
const ROWS = [
  ['slash', 'multi', 'whirl', 'gale'],
  ['shuri', 'stone', 'boomer'],
  ['ice', 'curve', 'arrow', 'lance'],
  ['boom', 'meteor', 'flask'],
  ['rico', 'bounce', 'spiral']
];
const SC = 2, X0 = 90, DX = 118, Y0 = 110, BOX = 108;
/* 999 잔여 블록 — 실측 bbox 는 x 1..87 · y 1838..1927 이고 여기에 여유를 붙인 자리다. */
const RESID = { x1: 90, y0: 1830 };

const args = process.argv.slice(2);
const argv = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const RUNS = Number(argv('--runs') || 4);
const OFF = argv('--off');
const SWEEP = args.includes('--sweep');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe996-'));
const clean = () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} };

/* 손잡이 하나를 뺀 사본 — 되돌림 시험의 재료다(제품도 자도 안 건드리고 임시 사본만 만든다) */
const CUTS = {
  seed:  /\s*let _rs = 0x2f6e2b1 >>> 0;\n\s*Math\.random = [^\n]*\n/,
  clock: /\s*performance\.now = \(\) => 1e6;\n/,
  orbit: /\s*orbitAng = ORB;\n/
};
function toolFor(off) {
  if (!off) return CAP;
  const re = CUTS[off];
  if (!re) { console.error('probe996 — 모르는 손잡이: ' + off + ' (seed|orbit|clock)'); clean(); process.exit(3); }
  if (!re.test(SRC)) { console.error('probe996 — 손잡이 «' + off + '» 를 cap710 에서 못 찾았다 (자가 낡았다)'); clean(); process.exit(3); }
  const p = path.join(tmp, 'cap710-off-' + off + '.js');
  /* 사본은 임시 폴더에 산다 — `./pwlaunch` 와 `__dirname` 이 거기서는 다른 곳을 가리키므로
     둘 다 이 자의 폴더로 못박고 옮긴다(저장소 트리에 사본을 남기지 않기 위해서다). */
  const body = SRC.replace(re, '\n')
                  .replace(/require\('\.\//g, "require('" + __dirname.replace(/\\/g, '\\\\') + "/")
                  .replace(/__dirname/g, JSON.stringify(__dirname));
  fs.writeFileSync(p, body);
  return p;
}

function shoot(tool, out, env) {
  execFileSync(process.execPath, [tool, out], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: Object.assign({}, process.env, env || {}),
    cwd: path.resolve(__dirname, '..')
  });
  return PNG.sync.read(fs.readFileSync(out));
}

/* 두 판을 견준다 — 칸별 흔들림 · 999 블록 «밖» 전체 흔들림 */
function compare(imgs) {
  const W = imgs[0].width, H = imgs[0].height;
  const DY = Math.floor((H / SC - Y0 - 92) / (ROWS.length - 1));
  const dif = (a, b, i) => Math.abs(a.data[i] - b.data[i]) > 8 ||
                           Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 ||
                           Math.abs(a.data[i + 2] - b.data[i + 2]) > 8;
  const cells = [];
  ROWS.forEach((row, ri) => row.forEach((id, ci) => {
    const cx = (X0 + ci * DX) * SC, cy = (Y0 + ri * DY) * SC;
    let mx = 0, mxOut = 0;
    for (let k = 1; k < imgs.length; k++) {
      let n = 0, nOut = 0;
      for (let y = Math.max(0, cy - BOX); y < Math.min(H, cy + BOX); y++)
        for (let x = Math.max(0, cx - BOX); x < Math.min(W, cx + BOX); x++)
          if (dif(imgs[0], imgs[k], (y * W + x) * 4)) { n++; if (!(x <= RESID.x1 && y >= RESID.y0)) nOut++; }
      if (n > mx) mx = n;
      if (nOut > mxOut) mxOut = nOut;
    }
    cells.push({ id, n: mx, out: mxOut });
  }));
  let full = 0, fullOut = 0;
  for (let k = 1; k < imgs.length; k++) {
    let n = 0, nOut = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (dif(imgs[0], imgs[k], (y * W + x) * 4)) { n++; if (!(x <= RESID.x1 && y >= RESID.y0)) nOut++; }
    if (n > full) full = n;
    if (nOut > fullOut) fullOut = nOut;
  }
  return { cells, full, fullOut, DY, W, H };
}

/* 잉크 — 위상 스윕이 «최악 위상에 굳었나» 를 묻는 자(칸 중심 ±70 화소, 휘도 90 위) */
function ink(img, ids) {
  const W = img.width, H = img.height, R = 70;
  const DY = Math.floor((H / SC - Y0 - 92) / (ROWS.length - 1));
  const o = {};
  ROWS.forEach((row, ri) => row.forEach((id, ci) => {
    if (ids && !ids.includes(id)) return;
    const cx = (X0 + ci * DX) * SC, cy = (Y0 + ri * DY) * SC;
    let n = 0;
    for (let y = cy - R; y < cy + R; y++) for (let x = cx - R; x < cx + R; x++) {
      const i = (y * W + x) * 4;
      if (img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114 > 90) n++;
    }
    o[id] = n;
  }));
  return o;
}

(async () => {
  try {
    if (SWEEP) {
      /* ⚑ 등재문의 경고 — «잘못 고르면 회전 종이 최악 위상에서 굳는다». 그래서 고른 자리(0)를
         여덟 위상과 나란히 잰다. 실측(2026-09-06)은 셋 다 **거의 평평**했다:
         whirl 16,382~16,707(고른 자리가 바닥 · 천장 대비 −1.9%) · gale 13,813~14,279(고른 자리 중간)
         · spiral 15,667~17,195(고른 자리 중간). 잉크 면적으로 보면 이 셋은 회전에 거의 대칭이라
         «최악 위상» 이라는 것이 애초에 얕다 — 그래도 수치를 남긴다. */
      console.log('[스윕] CAP710_ORBIT 8자리 × whirl·gale·spiral 잉크(화소)');
      const tab = [];
      for (let k = 0; k < 8; k++) {
        const orb = (k * Math.PI / 4).toFixed(4);
        const img = shoot(CAP, path.join(tmp, 'sw' + k + '.png'), { CAP710_ORBIT: orb });
        const v = ink(img, ['whirl', 'gale', 'spiral']);
        tab.push({ orb, v });
        console.log('  orbitAng=' + orb.padStart(6) + '  whirl ' + v.whirl + ' · gale ' + v.gale + ' · spiral ' + v.spiral);
      }
      for (const id of ['whirl', 'gale', 'spiral']) {
        const vs = tab.map(t => t.v[id]), lo = Math.min(...vs), hi = Math.max(...vs), at0 = tab[0].v[id];
        console.log('  ' + id.padEnd(7) + ' 바닥 ' + lo + ' · 천장 ' + hi + ' · 고른 자리(0) ' + at0 +
                    ' → 천장 대비 ' + ((at0 / hi - 1) * 100).toFixed(1) + '%');
      }
      clean();
      return;
    }

    const tool = toolFor(OFF);
    const imgs = [];
    for (let i = 0; i < RUNS; i++) imgs.push(shoot(tool, path.join(tmp, 'r' + i + '.png')));
    const r = compare(imgs);
    console.log('[재현] ' + (OFF ? '손잡이 «' + OFF + '» 를 뺀 사본' : '현재 tools/cap710.js') +
                ' · 같은 트리 ' + RUNS + '판 · ' + r.W + '×' + r.H + ' (DY ' + r.DY + ')');
    const shaky = r.cells.filter(c => c.n > 0);
    for (const c of r.cells) if (c.n > 0) console.log('  흔들림 ' + c.id.padEnd(8) + ' ' + String(c.n).padStart(6) +
                                                      ' (999 블록 밖 ' + c.out + ')');
    console.log('  흔들린 칸 ' + shaky.length + '/17 · 칸 합계 ' + r.cells.reduce((s, c) => s + c.n, 0) +
                ' · 화면 전체 ' + r.full + ' (999 블록 밖 ' + r.fullOut + ')');
    clean();
  } catch (e) { clean(); console.error('probe996 — ' + (e && e.message ? e.message : e)); process.exit(1); }
})();
