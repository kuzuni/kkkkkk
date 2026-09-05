/* 하네스 931 — 갈래 하나를 N회 돌려 «판정» 을 표로 남긴다 (전후 대조용)
 *
 *   node tools/run931.js --branch A --runs 5 --par 5 --out docs/review/931-before-A.json
 *   node tools/run931.js --files verify59.js,verify66.js --runs 5
 *
 * 왜 이 자가 있나 —
 *   931 등재문이 못박은 것은 «전부 갈아 끼워라» 가 아니라 **«갈아 끼운 뒤 각 자의 판정이
 *   «장치 없는 세상» 에서 굳었는지 대조하라»** 이고, 929 가 «그 대조는 플레이키한 자에서
 *   1회씩으로는 안 된다» 를 실측으로 남겼다. ⇒ 갈래별 N회를 **같은 부하 조건**에서 돌려
 *   ① 종료 코드 ② 점수 줄(`NN/MM`) ③ 흔들림(회차별로 값이 갈리는가) 셋을 같이 적는다.
 *
 * ⚠ 전후 대조의 공정성은 «같은 `--par`» 가 지킨다 — 병렬도가 다르면 291 이 재현했던
 *   그 부하 의존 흔들림(repro291: 한가할 때 1/12 · 부하에서 24/36)이 한쪽에만 얹힌다.
 *
 * 점수 줄은 자마다 말투가 달라 **정규식 하나로 못 읽는다** — 그래서 «마지막에 나온 n/m 전부» 를
 * 순서대로 적어 둔다(자 이름을 여기 적으면 402 가 지운 그 사본이 된다).
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { census } = require('./probe931');

const TOOLS = __dirname;
const ROOT = path.resolve(__dirname, '..');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const RUNS = +arg('runs', 5);
const PAR = +arg('par', 5);
const OUT = arg('out', '');
const TIMEOUT = +arg('timeout', 300) * 1000;

let FILES;
if (arg('files', '')) FILES = arg('files', '').split(',').map(s => s.trim()).filter(Boolean);
else {
  const b = String(arg('branch', 'A')).toUpperCase().split(',');
  FILES = census().filter(r => b.includes(r.branch)).map(r => r.file);
}

/* 한 번 돌린다 — 종료 코드와 «n/m» 꼴 점수 전부를 적는다. */
function once(file) {
  return new Promise(res => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [path.join(TOOLS, file)], { cwd: ROOT });
    let out = '';
    let killed = false;
    const timer = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, TIMEOUT);
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => {
      clearTimeout(timer);
      const scores = [...out.matchAll(/\b(\d+)\s*\/\s*(\d+)\b/g)].map(m => m[1] + '/' + m[2]);
      res({
        file, code: killed ? 'TIMEOUT' : code,
        ms: Date.now() - t0,
        scores: scores.slice(-6),           /* 꼬리 여섯 — 마감 줄이 거기 있다 */
        pass: /\bPASS\b/.test(out), fail: /\bFAIL\b/.test(out),
        tail: out.trim().split('\n').slice(-3).join(' | ').slice(0, 300),
      });
    });
  });
}

/* PAR 개씩 묶어 돌린다 — 전후가 같은 부하를 보게 하는 것이 이 자의 전부다. */
async function pool(jobs, par) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(par, jobs.length) }, async () => {
    while (i < jobs.length) { const j = jobs[i++]; out.push(await j()); }
  });
  await Promise.all(workers);
  return out;
}

(async () => {
  const all = {};
  for (const f of FILES) all[f] = [];
  for (let r = 0; r < RUNS; r++) {
    const t0 = Date.now();
    const res = await pool(FILES.map(f => () => once(f)), PAR);
    for (const x of res) all[x.file].push(x);
    console.log('[run ' + (r + 1) + '/' + RUNS + '] ' + FILES.length + '자 · ' +
      Math.round((Date.now() - t0) / 1000) + 's');
  }

  console.log('\n  파일             코드        점수(회차별)                      흔들림');
  console.log('  ' + '-'.repeat(78));
  let shaky = 0, bad = 0;
  for (const f of FILES) {
    const rs = all[f];
    const codes = [...new Set(rs.map(x => String(x.code)))];
    const sigs = [...new Set(rs.map(x => x.scores.join(',')))];
    const shake = codes.length > 1 || sigs.length > 1;
    if (shake) shaky++;
    if (!codes.every(c => c === '0')) bad++;
    console.log('  ' + f.padEnd(16) + codes.join('/').padEnd(11) +
      (sigs[0] || '—').slice(0, 33).padEnd(34) + (shake ? '⚠ 흔들림' : ''));
  }
  console.log('\n  ' + FILES.length + '자 × ' + RUNS + '회 (par ' + PAR + ') — 코드 0 아님 ' +
    bad + '자 · 회차 간 흔들림 ' + shaky + '자');

  if (OUT) {
    fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
    fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify({ runs: RUNS, par: PAR, files: FILES, all }, null, 1));
    console.log('  → ' + OUT);
  }
})();
