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

/* 조건 셋의 «정의» 는 `tools/raster907.js` 한곳에 있다 — `pwlaunch.launch()`(깃발을 켜는 쪽)와
   이 자(세는 쪽)와 `verify907`(약속을 지키는 쪽)이 **같은 판별기**를 읽어야 «자는 대상이라는데
   깃발은 안 켜지는» 갈림이 안 생긴다. */
const { classify: classifyFile } = require('./raster907');
const classify = f => classifyFile(f, TOOLS);

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
        /* 진행을 stderr 로 흘린다 — 90회짜리 스윕이 «끝날 때까지 아무것도 안 보이는» 것이
           그 자체로 다음 세션의 함정이다(이 자를 처음 돌린 907 1회차가 그랬다). */
        process.stderr.write('    · ' + gate + ' ' + (err ? 'RED ' : 'ok  ')
          + (m ? m[2] + '/' + m[3] : '—') + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + 's\n');
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

module.exports = { classify, scan, count, runOnce };

/* 다른 자가 `require` 로 스캐너만 빌려 쓴다(`verify907` [3]) — 그때는 본체를 돌리지 않는다. */
if (require.main !== module) return;

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
