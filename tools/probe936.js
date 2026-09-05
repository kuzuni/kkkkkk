#!/usr/bin/env node
/* 작업 936 재현 프로브 — «측정 상자가 플레이어를 타고 흔들린다» 를 **자의 출력으로** 찍는다
 *
 *   node tools/probe936.js [--n 3] [--json]
 *
 * 928 은 `verify856` 한 자에서 그 얼굴을 찍었다(무보정 `player.x` = 952.6 / 974.3 / 965.7 / 957.0).
 * 이 자는 **여집합이 실재하는지**를 다른 자에서 다시 찍는다 — 형제 `verify710` 은 17종 투사체의
 * «잉크 화소» 를 한 줄로 발표하므로, 그 줄이 곧 판 지문이다.
 *
 *   ⓐ 지금 자(못박음)      : 같은 명령을 N판 돌려 종별 산포를 잰다
 *   ⓑ 못박기를 뺀 사본     : 같은 것을 N판 — 사본은 `tmp936nopin.js` 로 만들고 끝나면 지운다
 *
 * ⚠ 사본을 «손으로 다른 값을 넣어» 만들지 않는다 — 936 이 넣은 줄만 정확히 빼고 나머지는 한 글자도
 *   같다. 그래야 두 갈래의 차이가 «못박기» 하나로 좁혀진다.
 * ⚠ 사본은 인구조사(`pin936.SELF`)에서 빠진다 — 되돌림 재료가 인구에 섞이면 자기 자신을 센다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'verify710.js');
const COPY = path.join(__dirname, 'tmp936nopin.js');

const argv = process.argv.slice(2);
const N = (() => { const i = argv.indexOf('--n'); return i >= 0 ? Math.max(2, +argv[i + 1] || 2) : 3; })();
const JSON_OUT = argv.includes('--json');

/* 936 이 넣은 것 = 주석 한 덩이 + 못박는 한 줄. 그 둘만 뺀다. */
function unpin(src) {
  const out = src.replace(/[ \t]*\/\* ⚑ 936 —[\s\S]*?\*\/\n[ \t]*player\.x = WORLD\.w \/ 2;[^\n]*\n/, '');
  if (out === src) throw new Error('못박은 줄을 못 찾았다 — verify710 이 936 이전으로 돌아갔나');
  return out;
}

function inkTable(stdout) {
  const m = /잉크 화소:\s*([^\n]+)/.exec(stdout);
  if (!m) return null;
  const o = {};
  for (const part of m[1].split('·')) {
    const kv = /([A-Za-z]+)\s*:\s*(\d+)/.exec(part);
    if (kv) o[kv[1]] = +kv[2];
  }
  return o;
}

function run(file) {
  const txt = execFileSync(process.execPath, [file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  return { ink: inkTable(txt), pass: /VERIFY710 \d+\/\d+ PASS/.test(txt) };
}

/* 종별 산포 = (최대 − 최소) ÷ 평균. 자의 «흔들림» 은 이 값의 최댓값으로 읽는다. */
function spread(runs) {
  const keys = Object.keys(runs[0].ink || {});
  let worst = { k: null, pct: 0, lo: 0, hi: 0 };
  const per = {};
  for (const k of keys) {
    const v = runs.map(r => r.ink[k]).filter(Number.isFinite);
    if (v.length < 2) continue;
    const lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const pct = mean ? (hi - lo) / mean * 100 : 0;
    per[k] = +pct.toFixed(3);
    if (pct > worst.pct) worst = { k, pct: +pct.toFixed(3), lo, hi };
  }
  return { worst, per };
}

(function main() {
  const src = fs.readFileSync(SRC, 'utf8');
  let copyMade = false;
  try {
    fs.writeFileSync(COPY, unpin(src));
    copyMade = true;

    const pinned = [], loose = [];
    for (let i = 0; i < N; i++) pinned.push(run(SRC));
    for (let i = 0; i < N; i++) loose.push(run(COPY));

    const A = spread(pinned), B = spread(loose);
    const out = {
      n: N,
      pinned: { worst: A.worst, per: A.per, pass: pinned.every(r => r.pass) },
      loose: { worst: B.worst, per: B.per, pass: loose.every(r => r.pass) },
    };
    if (JSON_OUT) { console.log(JSON.stringify(out)); return; }

    console.log('PROBE936 — `verify710` 잉크 화소 지문의 판간 산포 (' + N + '판씩)\n');
    console.log('  ⓐ 지금 자(못박음)   — 최악 종 ' + A.worst.k + ' ' + A.worst.lo + '~' + A.worst.hi +
                ' = ' + A.worst.pct + '%');
    console.log('  ⓑ 못박기 뺀 사본     — 최악 종 ' + B.worst.k + ' ' + B.worst.lo + '~' + B.worst.hi +
                ' = ' + B.worst.pct + '%');
    console.log('\n  [종별 %] 못박음 : ' + Object.keys(A.per).map(k => k + ':' + A.per[k]).join(' · '));
    console.log('  [종별 %] 안 못박음 : ' + Object.keys(B.per).map(k => k + ':' + B.per[k]).join(' · '));
    console.log('\n  ⇒ 못박기가 산포를 ' + (B.worst.pct / (A.worst.pct || 0.001)).toFixed(1) + '배 줄인다');
  } finally {
    if (copyMade) { try { fs.unlinkSync(COPY); } catch (_) {} }
  }
})();
