#!/usr/bin/env node
/* 작업 907 — «한 페이지에서 스타일 태그를 갈아 끼우며 여러 판을 찍는» 자들의 부분 리라스터 노출을 센다.
 *
 * 903(`verify432`)이 찍은 뿌리를 다른 자에게 그대로 물어보는 재현기다. **판정하지 않는다** —
 * 어느 자도 이 파일 때문에 빨개지거나 초록이 되지 않는다(797·909 규약: 재현기는 누구의 통과 조건도 아니다).
 *
 * 두 가지를 한다:
 *   1. `--scan`   — tools/*.js 를 정적으로 훑어 **조건 셋**을 갖춘 자를 고른다.
 *                   ① 한 페이지에서 스타일 태그를 붙였다 뗀다(add+remove)
 *                   ② 판끼리 화소 차분을 센다(두 버퍼를 같은 첨자로 비교)
 *                   ③ 그 차분의 문턱이 «몇 단위» 다(≤ 64)
 *   2. `--count`  — 고른 자를 N 회씩 돌려 **빨강 횟수**를 센다. `--nopr` 를 주면 `PW_NOPR=1` 로
 *                   깃발(`--disable-partial-raster`)을 켜고 같은 횟수를 다시 센다.
 *                   깃발이 축을 죽이면 «무보정 k/N → 깃발 0/N» 이 나온다(903 은 9/20 → 0/6).
 *
 * 쓰는 법:
 *   node tools/probe907.js --scan
 *   node tools/probe907.js --count --gates verify463,verify561 --runs 6
 *   node tools/probe907.js --count --gates verify463 --runs 6 --nopr
 *   (--jobs N 으로 동시 실행 수를 정한다. 기본 3.)
 *
 * ⚠ «자 플레이키» 를 한 뿌리로 보지 마라 — 902(`verify583` [C-big])는 자의 정수 양자화였다.
 *    여기서 세는 것은 **부분 리라스터 축 하나**이고, 깃발로 안 죽는 빨강은 다른 뿌리다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const TOOLS = path.join(__dirname);
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

/* ─────────────────────────── 1. 정적 스캔 ─────────────────────────── */

/* 주석은 «묻는 말» 이 아니라 «적어 둔 말» 이라 조건 판정에서 뺀다 —
   머리말에 `addStyleTag` 를 설명으로 적어 둔 자가 여럿이다. */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

const RE_ADD = /addStyleTag|createElement\((['"`])style\1/;
const RE_RM = /\.remove\(\)|removeChild|textContent\s*=\s*['"`]{2}/;
/* 두 버퍼를 같은 첨자로 비교하는 자리 — 이름은 자마다 다르므로 «모양» 으로 잡는다. */
const RE_CMP = [
  /Math\.abs\(\s*([A-Za-z_$][\w$]*)\s*\[[^\]]{1,40}\]\s*-\s*([A-Za-z_$][\w$]*)\s*\[/,
  /([A-Za-z_$][\w$]*)\.data\[[^\]]{1,40}\][^;\n]{0,60}?([A-Za-z_$][\w$]*)\.data\[/,
  /\bdiffBox\b|\bdiffPx\b|\bdiffMask\b|\bdiffRows\b|\bpxDiff\b/,
];
/* 문턱 — 차분을 «재는 자리 근처» 의 비교 우변이다. 변수 이름은 자마다 다르므로(`d`·`dd`·`dl`·
   `dif`·이름 없는 식) 이름으로 찾지 않고 **차분 줄에서 ±4줄 창** 안의 `> X` / `>= X` 를 모은다.
   X 가 식별자면 같은 파일의 `const X = 숫자` 로 한 번 푼다(`const D = 40;` 꼴이 흔하다).
   ⚠ 이름으로 찾던 첫 판은 `verify675`(`D = 40`)·`verify463`(`tol`)을 통째로 놓쳤다. */
const RE_THR = /(?:>|>=)\s*([A-Za-z_$][\w$]*|\d+(?:\.\d+)?)/g;

function thresholdsNear(s) {
  const lines = s.split('\n');
  const consts = {};
  let cm;
  const RE_CONST = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+(?:\.\d+)?)\s*[;,]/g;
  while ((cm = RE_CONST.exec(s))) consts[cm[1]] = +cm[2];
  const out = [];
  lines.forEach((ln, i) => {
    if (!RE_CMP.some(r => r.test(ln))) return;
    const win = lines.slice(Math.max(0, i - 4), i + 5).join('\n');
    let m;
    RE_THR.lastIndex = 0;
    while ((m = RE_THR.exec(win))) {
      const v = /^\d/.test(m[1]) ? +m[1] : consts[m[1]];
      if (v !== undefined && Number.isFinite(v)) out.push(v);
    }
  });
  return out;
}

function classify(file) {
  const raw = fs.readFileSync(path.join(TOOLS, file), 'utf8');
  const s = stripComments(raw);
  const add = RE_ADD.test(s);
  const rm = RE_RM.test(s);
  const cmp = RE_CMP.some(r => r.test(s));
  const thr = thresholdsNear(s);
  const small = thr.length ? Math.min(...thr) <= 64 : false;
  const shots = (s.match(/\.screenshot\(/g) || []).length;
  const flagged = /disable-partial-raster/.test(s) || /\bdet\(/.test(s);
  /* ⚠ **③ 은 배제 조건으로 쓰지 않는다.** 문턱은 자마다 이름·자리가 달라(기본 인자 `tol = 8` ·
     멀리 선언된 `const D = 40` · 이름 없는 식) 정적으로는 절반쯤만 풀린다 — 못 푼 것을 «큰 문턱» 으로
     읽으면 **노출된 자를 조용히 뺀다**. 대상은 ①∧② 로 잡고 ③ 은 **풀린 값을 적기만** 한다
     (실측 결과 ①∧② 를 갖춘 자의 문턱은 예외 없이 몇 단위였다 — `docs/review/907-*.md` §1 표). */
  return { file, add, rm, cmp, thr, small, shots, flagged, hit: add && rm && cmp };
}

function scan() {
  const files = fs.readdirSync(TOOLS).filter(f => /^verify.*\.js$/.test(f)).sort();
  const rows = files.map(classify);
  const hits = rows.filter(r => r.hit);
  console.log('[1] 조건 셋(태그 교체 · 화소 차분 · 몇 단위 문턱) 을 갖춘 게이트');
  for (const r of hits) {
    console.log('  ' + r.file.replace(/\.js$/, '').padEnd(14)
      + ' 판 ' + String(r.shots).padStart(2)
      + ' · 문턱 ' + (r.thr.length ? Array.from(new Set(r.thr)).sort((a, b) => a - b).join('/') : '—').padEnd(14)
      + (r.flagged ? ' · 깃발 있음' : ' · 깃발 없음'));
  }
  console.log('  → ' + hits.length + '개 (깃발 없는 것 '
    + hits.filter(r => !r.flagged).length + '개)');
  /* 셋 중 둘만 갖춘 자도 적어 둔다 — 다음 세션이 «왜 이 자는 뺐나» 를 다시 세지 않게. */
  const near = rows.filter(r => !r.hit && r.add && (r.cmp || r.rm) && r.shots > 0);
  console.log('\n[2] 조건 일부만 갖춘 자(참고 · 대상 아님)');
  for (const r of near) {
    console.log('  ' + r.file.replace(/\.js$/, '').padEnd(14)
      + ' 태그교체 ' + (r.add && r.rm ? 'O' : 'X')
      + ' · 화소차분 ' + (r.cmp ? 'O' : 'X')
      + ' · 몇단위문턱 ' + (r.small ? 'O' : 'X'));
  }
  return hits.map(r => r.file.replace(/\.js$/, ''));
}

/* ─────────────────────────── 2. 횟수 세기 ─────────────────────────── */

function runOnce(gate, nopr) {
  return new Promise(res => {
    const env = Object.assign({}, process.env);
    if (nopr === true) env.PW_NOPR = '1';
    if (nopr === false) env.PW_NOPR = '0';
    const t0 = Date.now();
    execFile(process.execPath, [path.join(TOOLS, gate + '.js')],
      { env, maxBuffer: 1 << 26, timeout: 15 * 60e3 }, (err, so, se) => {
        const out = String(so || '') + String(se || '');
        const m = out.match(/([A-Z0-9]+)\s+(\d+)\/(\d+)/);
        res({
          code: err ? (err.code === undefined ? 1 : err.code) : 0,
          score: m ? m[2] + '/' + m[3] : '—',
          sec: ((Date.now() - t0) / 1000).toFixed(0),
          fails: (out.match(/^\s*FAIL/gm) || []).map(x => x).length,
          firstFail: (out.match(/^\s*FAIL.*$/m) || [''])[0].trim().slice(0, 90),
        });
      });
  });
}

async function pool(tasks, jobs) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, async () => {
    for (;;) {
      const k = i++;
      if (k >= tasks.length) return;
      out[k] = await tasks[k]();
    }
  }));
  return out;
}

async function count(gates, runs, nopr, jobs) {
  const tasks = [];
  for (const g of gates) for (let n = 0; n < runs; n++) tasks.push(() => runOnce(g, nopr));
  const res = await pool(tasks, jobs);
  console.log('[' + (nopr === true ? '깃발 켬' : nopr === false ? '깃발 끔(되돌림)' : '자가 적은 대로') + '] ' + runs + '회씩');
  const summary = [];
  gates.forEach((g, gi) => {
    const mine = res.slice(gi * runs, (gi + 1) * runs);
    const red = mine.filter(r => r.code !== 0).length;
    const scores = Array.from(new Set(mine.map(r => r.score)));
    console.log('  ' + g.padEnd(14) + ' 빨강 ' + red + '/' + runs
      + ' · 점수 ' + scores.join(' ↔ ')
      + ' · ' + mine.map(r => r.sec + 's').join(' '));
    const ff = mine.map(r => r.firstFail).filter(Boolean)[0];
    if (ff) console.log('      첫 FAIL: ' + ff);
    summary.push({ gate: g, red, runs, scores });
  });
  return summary;
}

(async () => {
  const gatesArg = val('--gates', '');
  let gates = gatesArg ? gatesArg.split(',').map(s => s.trim()).filter(Boolean) : null;
  if (has('--scan') || !gates) {
    const hits = scan();
    if (!gates) gates = hits;
    if (!has('--count')) return;
    console.log('');
  }
  const runs = +val('--runs', 6);
  const jobs = +val('--jobs', 3);
  const nopr = has('--nopr') ? true : has('--noprOff') ? false : undefined;
  await count(gates, runs, nopr, jobs);
})();
