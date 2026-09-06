/* 작업 996 게이트 — «`cap710` 시트가 같은 트리에서 같은 그림을 찍는가»
 *
 *   node tools/verify996.js
 *
 * 이 자가 지키는 것은 **시트의 결정성**이다. 792 는 «회차마다 다시 찍어 2인이 채점» 하는 행이라,
 * 시트가 판마다 흔들리면 점수가 움직였을 때 «처방이 먹혔나» 와 «위상이 달랐나» 를 못 가른다.
 *
 * ⚠ **문턱을 넓혀 초록을 만들지 않는다**(334·796). 좌하단 한 블록은 이 수리의 몫이 아니라
 *   **999 로 등재된 잔여**라, 지우거나 상자를 좁혀 감추지 않고 «안/밖» 을 갈라 둘 다 찍는다 —
 *   **밖이 0 건**이어야 통과이고, 안의 값은 판정이 아니라 **관찰**로만 적는다(래칫 [2-d] 가 그 크기를 묶는다).
 *   블록을 판정에 넣으면 이 자가 다섯 판에 한 판꼴로 빨개져 «자가 만든 플레이키» 가 된다.
 *
 * ⚑ 되돌림 시험([R])이 이 자의 뼈대다 — 손잡이를 하나 빼면 그 칸들이 **실제로 되살아나야** 한다.
 *   그게 없으면 «이미 참인 것을 굳힌 게이트»(338 이 경고한 자리)와 구분이 안 된다.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const PNG = require('./png913').PNG();

const ROOT = path.resolve(__dirname, '..');
const CAP = path.join(__dirname, 'cap710.js');
const SRC = fs.readFileSync(CAP, 'utf8');

const ROWS = [
  ['slash', 'multi', 'whirl', 'gale'],
  ['shuri', 'stone', 'boomer'],
  ['ice', 'curve', 'arrow', 'lance'],
  ['boom', 'meteor', 'flask'],
  ['rico', 'bounce', 'spiral']
];
const SC = 2, X0 = 90, DX = 118, Y0 = 110, BOX = 108;
/* 999 잔여 블록 — 실측 bbox x 1..87 · y 1838..1927 에 여유를 붙인 자리 */
const RESID = { x1: 90, y0: 1830 };
/* [3] 위상 래칫 — `probe996 --sweep` 8자리 실측(2026-09-06)에서 온 바닥·천장이다.
   고른 자리(orbitAng = 0)가 «최악 위상» 이 아님을 이 밴드가 못박는다. 스윕을 다시 돌리려면
   `node tools/probe996.js --sweep`. */
const PHASE = { whirl: [16382, 16707], gale: [13813, 14279], spiral: [15667, 17195] };

let pass = 0, fail = 0;
const ok = (t, c, m) => { if (c) { pass++; console.log('  ok   ' + t + (m ? ' — ' + m : '')); }
                          else { fail++; console.log('  FAIL ' + t + (m ? ' — ' + m : '')); } };
const info = m => console.log('  info ' + m);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'verify996-'));
const clean = () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} };

const CUTS = {
  seed:  /\s*let _rs = 0x2f6e2b1 >>> 0;\n\s*Math\.random = [^\n]*\n/,
  clock: /\s*performance\.now = \(\) => 1e6;\n/,
  orbit: /\s*orbitAng = ORB;\n/
};
function copyWithout(off) {
  const p = path.join(tmp, 'cap710-off-' + off + '.js');
  fs.writeFileSync(p, SRC.replace(CUTS[off], '\n')
                        .replace(/require\('\.\//g, "require('" + __dirname.replace(/\\/g, '\\\\') + "/")
                        .replace(/__dirname/g, JSON.stringify(__dirname)));
  return p;
}

function shoot(tool, out, env) {
  execFileSync(process.execPath, [tool, out],
    { stdio: ['ignore', 'ignore', 'inherit'], cwd: ROOT,
      env: Object.assign({}, process.env, env || {}) });
  return PNG.sync.read(fs.readFileSync(out));
}

const dif = (a, b, i) => Math.abs(a.data[i] - b.data[i]) > 8 ||
                         Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 ||
                         Math.abs(a.data[i + 2] - b.data[i + 2]) > 8;

/* 칸별 흔들림 — «999 블록 밖» 과 «전체» 를 따로 센다 */
function cellShake(imgs) {
  const W = imgs[0].width, H = imgs[0].height;
  const DY = Math.floor((H / SC - Y0 - 92) / (ROWS.length - 1));
  const out = [];
  ROWS.forEach((row, ri) => row.forEach((id, ci) => {
    const cx = (X0 + ci * DX) * SC, cy = (Y0 + ri * DY) * SC;
    let mx = 0, mxOut = 0;
    for (let k = 1; k < imgs.length; k++) {
      let n = 0, nOut = 0;
      for (let y = Math.max(0, cy - BOX); y < Math.min(H, cy + BOX); y++)
        for (let x = Math.max(0, cx - BOX); x < Math.min(W, cx + BOX); x++)
          if (dif(imgs[0], imgs[k], (y * W + x) * 4)) { n++; if (!(x <= RESID.x1 && y >= RESID.y0)) nOut++; }
      if (n > mx) mx = n; if (nOut > mxOut) mxOut = nOut;
    }
    out.push({ id, n: mx, out: mxOut });
  }));
  return out;
}
function frameShake(imgs) {
  const W = imgs[0].width, H = imgs[0].height;
  let all = 0, out = 0, bx = null;
  for (let k = 1; k < imgs.length; k++) {
    let n = 0, nOut = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (dif(imgs[0], imgs[k], (y * W + x) * 4)) {
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (!(x <= RESID.x1 && y >= RESID.y0)) nOut++;
      }
    if (n > all) { all = n; bx = (x1 < 0 ? null : { x0, y0, x1, y1 }); }
    if (nOut > out) out = nOut;
  }
  return { all, out, bx };
}
function ink(img, ids) {
  const W = img.width, H = img.height, R = 70;
  const DY = Math.floor((H / SC - Y0 - 92) / (ROWS.length - 1));
  const o = {};
  ROWS.forEach((row, ri) => row.forEach((id, ci) => {
    if (!ids.includes(id)) return;
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
    /* ── [1] 선언 — 손잡이가 자리에 있는가(자가 낡으면 [R] 이 먼저 죽으므로 이름으로도 못박는다) ── */
    console.log('[1] 선언 — cap710 의 손잡이');
    ok('[1-a] `Math.random` 씨앗', CUTS.seed.test(SRC));
    ok('[1-b] `performance.now` 를 1e6 에 세운다(형제 자와 같은 위상)', CUTS.clock.test(SRC));
    ok('[1-c] `orbitAng` 를 못박는다', CUTS.orbit.test(SRC));
    ok('[1-d] 위상 손잡이 기본값이 0(눈금 불변)',
       /CAP710_ORBIT === undefined \? 0 :/.test(SRC), '`CAP710_ORBIT` 는 probe996 --sweep 만 움직인다');
    ok('[1-e] 세 손잡이가 전부 `spawnStage()` 앞에 선다',
       (() => { const i = SRC.indexOf('orbitAng = ORB'), j = SRC.indexOf('spawnStage()');
                return i > 0 && j > i; })(), '뒤에 서면 판마다 다른 값 위에서 굴린다');

    /* ── [2] 실측 — 같은 트리 3판 ── */
    console.log('[2] 실측 — 같은 트리 3판');
    const imgs = [];
    for (let i = 0; i < 3; i++) imgs.push(shoot(CAP, path.join(tmp, 'r' + i + '.png')));
    ok('[2-a] 세 판의 크기가 같다', imgs.every(m => m.width === imgs[0].width && m.height === imgs[0].height),
       imgs[0].width + '×' + imgs[0].height);
    const cells = cellShake(imgs);
    const bad = cells.filter(c => c.out > 0);
    ok('[2-b] 17칸 전부 «999 블록 밖» 흔들림 0',
       bad.length === 0, bad.length ? bad.map(c => c.id + ' ' + c.out).join(' · ') : '17/17');
    const fr = frameShake(imgs);
    ok('[2-c] 화면 전체도 «999 블록 밖» 0건', fr.out === 0, '밖 ' + fr.out + '건');
    /* [2-d] 999 래칫 — 잔여가 **그 블록 안에만** 있고 **커지지 않는지**를 묶는다.
       0 이어도 통과다(잔여는 다섯 판에 한 판꼴이라 안 나는 판이 흔하다). */
    ok('[2-d] 999 잔여 래칫 — 블록 안 ≤ 2,000화소',
       fr.all - fr.out <= 2000, '안 ' + (fr.all - fr.out) + '건 · 전체 ' + fr.all +
       (fr.bx ? ' · bbox x ' + fr.bx.x0 + '..' + fr.bx.x1 + ' y ' + fr.bx.y0 + '..' + fr.bx.y1 : ''));
    if (fr.all > fr.out) info('999 잔여가 이 판에서 났다 — 등재 999 참조(판정 아님)');

    /* ── [3] 위상 — 고른 자리가 «최악» 이 아니다 ── */
    console.log('[3] 위상 — 고른 자리(orbitAng = 0)가 최악이 아닌가');
    const iv = ink(imgs[0], ['whirl', 'gale', 'spiral']);
    for (const id of ['whirl', 'gale', 'spiral']) {
      const [lo, hi] = PHASE[id];
      ok('[3-' + id + '] 잉크가 스윕 밴드 안', iv[id] >= lo * 0.97 && iv[id] <= hi * 1.03,
         iv[id] + ' (스윕 ' + lo + '~' + hi + ' · 천장 대비 ' + ((iv[id] / hi - 1) * 100).toFixed(1) + '%)');
    }
    ok('[3-폭] 여덟 위상의 폭이 좁다 — «최악 위상» 이 얕다',
       Object.keys(PHASE).every(k => PHASE[k][1] / PHASE[k][0] < 1.12),
       Object.keys(PHASE).map(k => k + ' ×' + (PHASE[k][1] / PHASE[k][0]).toFixed(3)).join(' · '));

    /* ── [R] 되돌림 — 손잡이를 빼면 되살아나는가 ── */
    console.log('[R] 되돌림 — 손잡이를 하나씩 뺀 사본');
    const revert = async (off, want, note) => {
      const t = copyWithout(off);
      const a = [];
      for (let i = 0; i < 2; i++) a.push(shoot(t, path.join(tmp, off + i + '.png')));
      const cs = cellShake(a).filter(c => c.out > 0).map(c => c.id);
      const hit = want.filter(id => cs.includes(id));
      ok('[R-' + off + '] ' + note, hit.length === want.length,
         '되살아난 칸 [' + cs.join(' ') + '] · 기다린 것 [' + want.join(' ') + ']');
    };
    await revert('orbit', ['whirl', 'gale', 'spiral'],
                 '`orbitAng` 핀을 빼면 시전각을 읽는 세 칸이 흔들린다');
    await revert('seed', ['arrow', 'curve'],
                 '`Math.random` 씨앗을 빼면 배경 소품이 선 칸이 흔들린다');

    console.log('VERIFY996 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
    clean();
    process.exit(fail ? 1 : 0);
  } catch (e) {
    clean();
    console.error('verify996 — ' + (e && e.message ? e.message : e));
    process.exit(1);
  }
})();
