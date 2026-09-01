#!/usr/bin/env node
/* 756 검증 — «얕은 클론에서 고정 SHA 를 꺼내는 자» 가 거짓 빨강을 안 내는가
 *
 *   node tools/verify756.js
 *
 *   [A] 자   — 공용 부품(`tools/gitrev756.js`)의 모양: 사다리 순서 · «환경 ↔ 진짜 없다» 갈림 · 예산 가드.
 *   [B] 실전 — **진짜 얕은 클론(depth 1)** 에서 `ensure`/`show` 가 표본을 파 오고 바이트를 준다.
 *   [C] 재현 — 같은 클론에서 **파지 않는 옛 방식**(`git show <SHA>:<파일>` 직행)이 실제로 죽는다
 *              = 756 등재문이 `probe708` 에서 본 그 빨강. 새 부품은 같은 자리에서 초록이다.
 *   [D] 자리 — 런타임에 고정 SHA 를 꺼내는 자가 **전부** 이 부품을 지난다(래칫 스윕).
 *   [E] 보류 — «환경이라 못 본다» 가 **조용하지 않다**(보류로 찍히고, 세지 않고, 합계 줄에 남는다)
 *              그리고 «환경이 아니면 빨강» 갈래가 자마다 실제로 있다.
 *   [R] 되돌림 — ⓐ 사다리를 뺀 사본은 같은 클론에서 도로 못 판다 ·
 *                ⓑ 갈림(`env`)을 없앤 사본은 «진짜 없는 객체» 까지 보류로 삼킨다(= 지금 축이 그걸 막는다).
 *
 * ⚠ 이 자는 네트워크를 쓴다([B]·[C]·[R] 은 origin 에서 판다). 오프라인이면 그 절이 빨개진다 —
 *   그것이 정답이다(표본을 못 가져오면 되돌림 축은 실제로 안 도는 것이다 · 631 과 같은 규약).
 * [3]-(가) 기계적 검증 — 비평가를 띄우지 않는다.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const GFILE = path.join(ROOT, 'tools', 'gitrev756.js');
const GSRC = fs.readFileSync(GFILE, 'utf8');
const G = require('./gitrev756');

/* probe708 이 꺼내는 그 고정 SHA — 756 등재문의 재현 자리 그대로 */
const BASE = '4757c0f';
const BASE_FILE = 'tools/verify486.js';

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
  return b;
};
const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
const shQ = (cwd, ...a) => {
  const r = spawnSync(a[0], a.slice(1), { cwd, encoding: 'utf8' });
  return { code: r.status, out: ((r.stdout || '') + '') + ((r.stderr || '') + '') };
};

/* ─────────────────────────────── [A] 자 ─────────────────────────────── */
ok(spawnSync('node', ['--check', GFILE]).status === 0, 'A1 gitrev756.js 문법 성함');
ok(['isShallow', 'have', 'depth', 'ladder', 'dig', 'ensure', 'show', 'skipNote']
   .every((k) => typeof G[k] === 'function'),
   'A2 부품이 여덟 손잡이를 한 벌로 내보낸다', Object.keys(G).join(','));

const lad = G.ladder('2026-01-01T00:00:00Z');
ok(lad[0].startsWith('--shallow-since=')
   && lad.slice(1, -1).every((a) => /^--deepen=\d+$/.test(a))
   && lad[lad.length - 1] === '--unshallow',
   'A3 사다리가 **날짜 → 배수 깊이 → 전체** 순이다(깊이 상수를 먼저 세우지 않는다 · 631 26회차)',
   lad.join(' → '));
ok(G.ladder()[0] === '--deepen=160',
   'A3-b 날짜가 없으면 깊이부터 — 날짜 칸을 `undefined` 로 흘리지 않는다', G.ladder().join(' → '));

ok(/if \(!isShallow\(cwd\)\) return null;/.test(GSRC) && /env: shallow/.test(GSRC),
   'A4 «환경(얕다)» 과 «진짜 없다» 를 코드가 가른다 — 건너뛰기가 게이트 부패를 못 덮는다');
ok(/arg === '--unshallow' && left < 30000/.test(GSRC),
   'A5 마지막 칸(`--unshallow`)에 예산 가드가 있다(반쯤 받다 끊기는 것을 막는다)');

/* 이 트리에서 «이미 있는 표본» 은 how 가 빈 문자열이어야 한다(판은 척하지 않는다) */
{
  const head = sh(ROOT, 'git', 'rev-parse', 'HEAD').trim();
  const e = G.ensure(head);
  ok(e.ok && e.how === '' && e.env === false,
     'A6 이미 있는 리비전은 판지 않고 바로 ok(꼬리표가 빈 문자열)', JSON.stringify(e));
}

/* ───────────────────── [B]·[C]·[R] 진짜 얕은 클론 ───────────────────── */
const url = sh(ROOT, 'git', 'remote', 'get-url', 'origin').trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v756-'));
const clone = path.join(tmp, 'shallow');
let cloned = false;
try {
  sh(tmp, 'git', 'clone', '--quiet', '--depth=1', '--no-tags', 'file://' + ROOT, clone);
  sh(clone, 'git', 'remote', 'set-url', 'origin', url);
  /* 클론은 이 트리의 HEAD 라 아직 커밋 안 한 부품이 없다 — 넣어 준다(자의 편의일 뿐 축이 아니다) */
  fs.copyFileSync(GFILE, path.join(clone, 'tools', 'gitrev756.js'));
  cloned = true;
} catch (e) {
  ok(false, 'B0 얕은 클론을 못 세웠다', String(e.message || e).split('\n')[0]);
}

const nodeIn = (cwd, code) => shQ(cwd, 'node', '-e', code).out.trim().split('\n').pop().trim();

if (cloned) {
  ok(true, 'B0 얕은 클론(depth 1) 을 세웠다',
     '이력 ' + G.depth(clone) + '커밋 · origin=' + url);
  ok(G.isShallow(clone) && !G.have(BASE, clone),
     'B1 전제 — 그 클론은 얕고 표본 ' + BASE + ' 가 **없다**(이 전제가 깨지면 아래는 헛초록이다)');

  /* ── [C] 재현 — 파지 않는 옛 방식은 여기서 죽는다(= 756 등재문의 probe708 3/4) ── */
  const raw = shQ(clone, 'git', 'show', BASE + ':' + BASE_FILE);
  ok(raw.code !== 0 && /invalid object name|unknown revision|bad object/i.test(raw.out),
     'C1 재현 — `git show ' + BASE + ':' + BASE_FILE + '` 직행은 죽는다(등재문의 거짓 빨강)',
     (raw.out.split('\n')[0] || '').slice(0, 90) + ' · 코드 ' + raw.code);

  /* ── [B]·[C2] 부품은 같은 자리에서 판아 온다 ── */
  const t0 = Date.now();
  const out = nodeIn(clone,
    "const G=require('./tools/gitrev756');"
    + "const r=G.show(" + JSON.stringify(BASE) + "," + JSON.stringify(BASE_FILE) + ");"
    + "console.log(JSON.stringify({ok:r.ok,env:r.env,how:r.how,why:r.why,bytes:r.buf?r.buf.length:0}));");
  let got = {};
  try { got = JSON.parse(out); } catch (e) { got = { parse: out.slice(0, 160) }; }
  const ms = Date.now() - t0;
  ok(got.ok === true && got.bytes > 1000,
     'C2 같은 자리에서 부품은 **초록**이다 — 판아서 바이트까지 준다',
     (got.bytes || 0) + 'B · ' + (ms / 1000).toFixed(1) + 's · ' + (got.how || got.parse || ''));
  ok(typeof got.how === 'string' && /얕은 클론이라/.test(got.how || ''),
     'B2 «어떻게 팠는지» 가 꼬리표로 남는다(조용히 성공하지 않는다)', got.how || '(빈 문자열)');
  ok(G.have(BASE, clone), 'B3 판 뒤 표본이 실제로 그 클론에 있다', '이력 ' + G.depth(clone) + '커밋');
  ok(ms < 240000, 'B4 시간 예산 — 240s 안에 판다', (ms / 1000).toFixed(1) + 's');

  /* ── [R-a] 되돌림 — 사다리를 뺀 사본은 같은 자리에서 도로 못 판다 ── */
  const RB = '.v756-nolad-' + process.pid + '.js';
  const SRC_R = GSRC.replace(/return \[since \? '--shallow-since=' \+ since : null[\s\S]*?\.filter\(Boolean\);/,
    "return [];");
  fs.writeFileSync(path.join(clone, 'tools', RB), SRC_R);
  ok(SRC_R !== GSRC, 'R0 되돌림 사본이 실제로 사다리를 비웠다', (GSRC.length - SRC_R.length) + '자 차이');
  /* 이 클론은 [C2] 에서 이미 깊어졌다 — 되돌림은 **새 얕은 클론**에서 봐야 헛초록이 아니다 */
  const clone2 = path.join(tmp, 'shallow2');
  let cloned2 = false;
  try {
    sh(tmp, 'git', 'clone', '--quiet', '--depth=1', '--no-tags', 'file://' + ROOT, clone2);
    sh(clone2, 'git', 'remote', 'set-url', 'origin', url);
    fs.copyFileSync(path.join(clone, 'tools', RB), path.join(clone2, 'tools', RB));
    fs.copyFileSync(GFILE, path.join(clone2, 'tools', 'gitrev756.js'));
    cloned2 = true;
  } catch (e) { ok(false, 'R1 두 번째 얕은 클론을 못 세웠다', String(e.message || e).split('\n')[0]); }

  if (cloned2) {
    const rOut = nodeIn(clone2,
      "const G=require('./tools/" + RB + "');"
      + "const r=G.ensure(" + JSON.stringify(BASE) + ");"
      + "console.log(JSON.stringify({ok:r.ok,env:r.env}));");
    let rr = {}; try { rr = JSON.parse(rOut); } catch (e) { rr = { parse: rOut.slice(0, 160) }; }
    ok(rr.ok === false && rr.env === true,
       'R1 사다리를 뺀 사본은 같은 표본을 **못 가져온다**(= 부품이 없으면 그 자리가 도로 막힌다)',
       JSON.stringify(rr));

    /* ── [R-b] 갈림(`env`)을 없앤 사본은 «진짜 없는 객체» 까지 보류로 삼킨다 ── */
    const RB2 = '.v756-noenv-' + process.pid + '.js';
    const SRC_R2 = GSRC.replace('env: shallow,', 'env: true,');
    fs.writeFileSync(path.join(clone2, 'tools', RB2), SRC_R2);
    ok(SRC_R2 !== GSRC, 'R2-0 되돌림 사본이 실제로 갈림을 없앴다(env 를 늘 true 로)');
    const bogus = 'deadbeef'.repeat(5);
    const noenv = nodeIn(clone2,
      "const G=require('./tools/" + RB2 + "');"
      + "console.log(JSON.stringify(G.ensure(" + JSON.stringify(bogus) + ", { budgetMs: 3000 }).env));");
    ok(noenv === 'true',
       'R2 갈림을 없앤 사본은 **없는 객체까지 «환경»** 으로 삼킨다(= 그 갈림이 안전핀이다)', 'env → ' + noenv);
  }
}

/* [R3] 실물 부품은 «없는 객체» 를 환경으로 안 삼킨다 — R2 의 짝 항.
   ⚠ **얕지 않은 저장소**에서 물어야 축이 선다 — 얕은 데서는 «예산을 다 쓰고도 못 팠다» 가
      정직한 답이라 `env:true` 가 맞다(R1 이 그 쪽을 잡는다). 그래서 여기서는 원격도 이력도 없는
      **깨끗한 임시 저장소**를 세워 «얕지 않은데 없다 = 빨강» 만 묻는다(작업 클론을 두껍게 안 만든다). */
{
  const solo = path.join(tmp, 'solid');
  fs.mkdirSync(solo, { recursive: true });
  let built = false;
  try {
    sh(solo, 'git', 'init', '-q', '-b', 'main');
    fs.writeFileSync(path.join(solo, 'a.txt'), 'x\n');
    sh(solo, 'git', 'add', 'a.txt');
    sh(solo, 'git', '-c', 'user.email=v756@local', '-c', 'user.name=v756', 'commit', '-q', '-m', 'seed');
    fs.mkdirSync(path.join(solo, 'tools'), { recursive: true });
    fs.copyFileSync(GFILE, path.join(solo, 'tools', 'gitrev756.js'));
    built = true;
  } catch (e) { ok(false, 'R3-0 임시 저장소를 못 세웠다', String(e.message || e).split('\n')[0]); }
  if (built) {
    ok(!G.isShallow(solo), 'R3-0 임시 저장소는 **얕지 않다**(이 전제가 깨지면 R3 은 헛초록이다)');
    const bogus = 'deadbeef'.repeat(5);
    const out = nodeIn(solo,
      "const G=require('./tools/gitrev756');"
      + "const r=G.ensure(" + JSON.stringify(bogus) + ", { budgetMs: 20000 });"
      + "console.log(JSON.stringify({ok:r.ok,env:r.env,why:r.why}));");
    let ee = {}; try { ee = JSON.parse(out); } catch (x) { ee = { parse: out.slice(0, 160) }; }
    ok(ee.ok === false && ee.env === false,
       'R3 얕지 않은데 없는 객체는 **보류가 아니라 빨강**이다(631 26회차 교훈 ④)',
       ee.why || JSON.stringify(ee));
  }
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

/* ─────────────── [D] 자리 — 고정 SHA 를 꺼내는 자가 전부 이 부품을 지난다 ─────────────── */
const TOOLS = path.join(ROOT, 'tools');
const files = fs.readdirSync(TOOLS).filter((f) => f.endsWith('.js'));

/* 주석·문서 줄을 걷어낸 «코드만» 을 본다 — 다른 자의 주석이 이 명령을 «인용» 한다 */
const codeOf = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');

/* 런타임에 `git show` 를 부르는 자리 — `execSync('git show …')` 와 `execFileSync('git', ['show', …])` 둘 다 */
const CALLS_SHOW = /(exec(?:File)?Sync|spawnSync)\s*\(\s*(['"`]git show|['"]git['"]\s*,\s*\[\s*['"]show['"])/;

/* 지날 필요가 없는 자리 — 이유를 적어 둔다(래칫: 새 이름이 늘면 이 표가 먼저 빨개진다) */
const ALLOW = {
  'gitrev756.js': '부품 자신이다(사다리를 지나고 나서 꺼낸다)',
  'verify631.js': '일회용 클론 **안에서** 판 뒤에 꺼낸다(부품의 행동을 재는 자)',
  'verify756.js': '이 자 — [C1] 이 «파지 않는 옛 방식» 을 일부러 부른다(재현)',
  'verifyProgress.js': '이력 전수를 요구하지 않는다 — 창 크기를 ⚠ 로 찍는 축(작업 388)',
  'verify307.js': '진짜 원격(bare)+클론을 자기가 세워 그 안에서 부른다(얕은 클론과 무관)',
  'verify356.js': '[G-c] 가 `probe356r23.digPre()`(= 이 부품)로 **판 뒤에** 꺼낸다 — verify631 A7 이 그 위임을 지킨다'
};

const offenders = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(TOOLS, f), 'utf8');
  const code = codeOf(src);
  if (!CALLS_SHOW.test(code)) continue;
  if (ALLOW[f]) continue;
  if (/require\(['"]\.\/gitrev756['"]\)/.test(code)) continue;   /* 부품을 지나면 통과 */
  offenders.push(f);
}
ok(offenders.length === 0,
   'D1 래칫 — 런타임에 `git show` 를 직접 부르는 자가 부품 밖에 **0개**',
   offenders.length ? offenders.join(' · ') : '허용표 ' + Object.keys(ALLOW).length + '개 외 0건');

/* 756 이 옮긴 네 자리가 실제로 부품을 문다 */
for (const f of ['probe708.js', 'probe539.js', 'probe716.js', 'probe356r23.js']) {
  const src = fs.readFileSync(path.join(TOOLS, f), 'utf8');
  ok(/require\(['"]\.\/gitrev756['"]\)/.test(codeOf(src)),
     'D2 ' + f + ' 가 고정 SHA 를 부품으로 꺼낸다');
}

/* ─────────────── [E] 보류가 조용하지 않다 ─────────────── */
const holders = [
  { f: 'probe708.js', sum: /PROBE708/ },
  { f: 'probe539.js', sum: /PROBE539/ },
  { f: 'probe716.js', sum: /PROBE716/ }
];
for (const h of holders) {
  const src = fs.readFileSync(path.join(TOOLS, h.f), 'utf8');
  const code = codeOf(src);
  ok(/skip\s*\+\+|skip\+\+/.test(code), 'E1 ' + h.f + ' 가 보류를 **센다**(세지 않으면 초록에 섞인다)');
  ok(/보류/.test(code) && /skip \?|skip\s*\?/.test(code),
     'E2 ' + h.f + ' 의 **합계 줄**에 보류 수가 남는다(조용한 보류 금지)');
  ok(/\.env\b/.test(code) && /ok\(false/.test(code),
     'E3 ' + h.f + ' 에 «환경이 아니면 빨강» 갈래가 있다(보류가 게이트 부패를 못 덮는다)');
}

console.log('\nverify756: ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail + '건' : '  ALL PASS'));
process.exit(fail ? 1 : 0);
