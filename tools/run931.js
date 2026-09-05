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
 * ⚠ **«판정» 은 «출력에 나온 숫자» 가 아니다(1회차에 이 자가 먼저 틀렸다).** 처음엔 «마지막에 나온
 *   n/m 전부» 를 지문으로 삼았는데, 자들이 산문에 수치를 찍는다(`probe620` 의 «이탈 45/46/47%» ·
 *   `probe722` 의 소요 ms). 그러면 **판정이 세 번 다 `8/8 PASS` 인 자가 «흔들림» 으로 잡힌다** —
 *   9자가 그렇게 빨갛게 보였고 그중 실재는 둘이었다. ⇒ 지문은 **① 종료 코드 ② 마지막 «판정 줄»**
 *   (`PASS`/`FAIL` 이 들어간 마지막 줄) 둘뿐이다. 자 이름을 여기 적으면 402 가 지운 그 사본이 된다.
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
const TIMEOUT = +arg('timeout', 600) * 1000;

let FILES;
if (arg('files', '')) FILES = arg('files', '').split(',').map(s => s.trim()).filter(Boolean);
else {
  const b = String(arg('branch', 'A')).toUpperCase().split(',');
  FILES = census().filter(r => b.includes(r.branch)).map(r => r.file);
}

/* 판정 줄 — `PASS`/`FAIL` 이 들어간 **마지막** 줄. 자마다 말투가 달라도(«PROBE620 8/8 PASS» ·
   «PASS 23/23» · «FNCHK186 FAIL — 11/12») 마감은 거기 한 줄에 있다. 산문에 찍힌 수치는 안 본다. */
function verdictLine(out) {
  const lines = out.trim().split('\n').map(s => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/\b(PASS|FAIL)\b/.test(lines[i])) return lines[i].replace(/\s+/g, ' ').slice(0, 90);
  }
  return '(판정 줄 없음)';
}

/* 한 번 돌린다 — 종료 코드와 «판정 줄» 을 적는다. */
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
      res({
        file, code: killed ? 'TIMEOUT' : code,
        ms: Date.now() - t0,
        verdict: verdictLine(out),
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

  console.log('\n  파일             코드        판정 줄(회차 공통)                            흔들림');
  console.log('  ' + '-'.repeat(96));
  let shaky = 0, bad = 0;
  for (const f of FILES) {
    const rs = all[f];
    const codes = [...new Set(rs.map(x => String(x.code)))];
    const sigs = [...new Set(rs.map(x => x.verdict))];
    const shake = codes.length > 1 || sigs.length > 1;
    if (shake) shaky++;
    if (!codes.every(c => c === '0')) bad++;
    console.log('  ' + f.padEnd(16) + codes.join('/').padEnd(11) +
      (sigs[0] || '—').slice(0, 45).padEnd(46) + (shake ? '⚠ 흔들림 ' + sigs.length + '갈래' : ''));
  }
  console.log('\n  ' + FILES.length + '자 × ' + RUNS + '회 (par ' + PAR + ') — 코드 0 아님 ' +
    bad + '자 · 회차 간 흔들림 ' + shaky + '자');

  if (OUT) {
    fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
    fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify({ runs: RUNS, par: PAR, files: FILES, all }, null, 1));
    console.log('  → ' + OUT);
  }
})();
