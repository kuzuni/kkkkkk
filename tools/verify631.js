#!/usr/bin/env node
/* 631 검증 — «얕은 클론에서 되돌림 표본을 파 오는 축» 이 안 썩는가
 *
 *   node tools/verify631.js
 *
 *   [A] 자    — 상수(`--deepen=40`)가 [G-c] 경로에서 빠지고 **날짜 축**(`PRE_DATE`)이 섰다.
 *               «못 팠으면 그래도 빨갛다»(26회차 교훈 ④)가 코드에 남아 있는지도 같이 본다.
 *   [B] 실전  — **진짜 얕은 클론(depth 1)** 을 세워 `digPre()` 가 표본을 실제로 파 오고
 *               `git show <표본>:index.html` 이 나오는지 잰다. 시간 예산(240s)도 같이 찍는다.
 *   [C] 재현  — 그 클론에서 **옛 축(`--deepen=40` 한 번)은 못 닿는다** = 631 등재문의 재현.
 *   [R] 되돌림 — ⓐ 날짜 시도를 뺀 사본(= 옛 축)은 같은 자리에서 도로 null ·
 *                ⓑ 아예 없는 객체는 null 이다(«못 팠는데 초록» 이 아니다).
 *
 * ⚠ 이 자는 네트워크를 쓴다(origin 에서 `--shallow-since` 로 판다). 오프라인이면 [B]·[C] 가 빨개진다 —
 *   그것이 정답이다(표본을 못 가져오면 되돌림 축은 실제로 안 도는 것이다).
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P356 = path.join(ROOT, 'tools', 'probe356r23.js');
const V356 = path.join(ROOT, 'tools', 'verify356.js');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
  return b;
};
const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
/* ⚠ 일회용 클론에는 `node_modules` 가 없다 — `probe356r23` 는 모듈 머리에서 playwright 를 문다.
   `digPre` 자신은 git 만 쓰므로 **이 저장소의 node_modules 를 빌려** 준다(자의 편의일 뿐 축이 아니다). */
const NODE_PATH = path.join(ROOT, 'node_modules');
const shQ = (cwd, ...a) => {
  const r = spawnSync(a[0], a.slice(1),
    { cwd, encoding: 'utf8', env: Object.assign({}, process.env, { NODE_PATH }) });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

/* ─────────────────────────────── [A] 자 ─────────────────────────────── */
const PSRC = fs.readFileSync(P356, 'utf8');
const VSRC = fs.readFileSync(V356, 'utf8');
ok(spawnSync('node', ['--check', P356]).status === 0, 'A1 probe356r23.js 문법 성함');
ok(spawnSync('node', ['--check', V356]).status === 0, 'A2 verify356.js 문법 성함');

const R23 = require('./probe356r23.js');
ok(typeof R23.digPre === 'function' && typeof R23.PRE_DATE === 'string',
   'A3 probe356r23 가 `digPre`·`PRE_DATE` 를 한 벌로 내보낸다', 'PRE_DATE=' + R23.PRE_DATE);
const preMs = Date.parse(R23.PRE_DATE);
ok(Number.isFinite(preMs), 'A4 PRE_DATE 가 ISO8601 로 파싱된다', new Date(preMs).toISOString());

/* [G-c] 블록만 잘라서 본다 — 파일 다른 곳의 주석·문서는 상수를 «인용» 할 수 있다. */
const gc = (VSRC.split('/* ⓒ 되돌림')[1] || '').split('/* ⓓ 음성항')[0] || '';
ok(gc.length > 200, 'A5 [G-c] 블록을 잘라냈다', gc.length + '자');
const gcCode = gc.split('\n').filter((l) => !/^\s*(\*|\/\*|\s*⚠|\s*⇒)/.test(l)).join('\n');
ok(!/--deepen=\d+/.test(gcCode),
   'A6 [G-c] **코드**에 `--deepen=<수>` 상수가 없다(26회차의 40 이 빠졌다)',
   (gcCode.match(/--deepen=\d+/g) || ['0건']).join(' · '));
ok(/R23\.digPre\(\)/.test(gcCode), 'A7 [G-c] 가 파는 일을 `probe356r23.digPre()` 한 벌에 맡긴다');
ok(/dug === null/.test(gcCode) && /throw new Error/.test(gcCode),
   'A8 «못 팠으면 그래도 빨갛다» 가 코드에 남아 있다(26회차 교훈 ④ — 건너뛰기 금지)');
/* 756 이관 — 사다리가 `tools/gitrev756.js` 한 벌로 옮겨 갔다(자를 두 벌로 안 적는다 · 13회차 [R12]).
   «날짜를 먼저 세운다» 는 뜻은 그대로 묻되 **새 자리에** 묻고, «정말 그 한 벌에 맡겼는가» 를 한 항 더 넣는다
   (333 처방 — 자리를 비우지 않는다. 이 항이 없으면 delegate 를 끊어도 A9-b 만 보고 초록이 된다). */
const GSRC = fs.readFileSync(path.join(ROOT, 'tools', 'gitrev756.js'), 'utf8');
ok(/require\('\.\/gitrev756'\)\.dig\(/.test(PSRC),
   'A9 digPre 가 파는 일을 공용 부품 한 벌(`gitrev756.dig`)에 맡긴다');
const lad = (GSRC.split('function ladder(')[1] || '').split('\n}')[0];
ok(/--shallow-since=/.test(lad)
   && lad.indexOf('--shallow-since=') < lad.indexOf('--deepen=')
   && lad.indexOf('--deepen=') < lad.indexOf('--unshallow'),
   'A9-b 그 부품의 사다리가 **날짜 → 배수 깊이 → 전체** 순이다(깊이 상수를 먼저 세우지 않는다)',
   lad.replace(/\s+/g, ' ').trim().slice(0, 120));
ok(/if \(!isShallow\(cwd\)\) return null;/.test(GSRC) && /env: shallow/.test(GSRC),
   'A9-c 그 부품이 «환경(얕다)» 과 «진짜 없다» 를 가른다 — 건너뛰기가 게이트 부패를 못 덮는다');

/* ───────────────────── [B]·[C]·[R] 진짜 얕은 클론 ───────────────────── */
const url = sh(ROOT, 'git', 'remote', 'get-url', 'origin').trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v631-'));
const clone = path.join(tmp, 'shallow');
let cloned = false;
try {
  /* 클론은 **로컬 ROOT 에서** 뜬다(빠르다). 판는 곳은 진짜 origin 이라 축은 그대로다. */
  sh(tmp, 'git', 'clone', '--quiet', '--depth=1', '--no-tags', 'file://' + ROOT, clone);
  sh(clone, 'git', 'remote', 'set-url', 'origin', url);
  /* 756 — 일회용 클론은 **이 트리의 HEAD** 라 아직 커밋 안 한 부품이 없다.
     `digPre` 가 물고 있는 공용 사다리를 같이 넣어 준다(자의 편의일 뿐 축이 아니다). */
  fs.copyFileSync(path.join(ROOT, 'tools', 'gitrev756.js'), path.join(clone, 'tools', 'gitrev756.js'));
  cloned = true;
} catch (e) {
  ok(false, 'B0 얕은 클론을 못 세웠다', String(e.message || e).split('\n')[0]);
}

const have = (cwd, rev) => shQ(cwd, 'git', 'cat-file', '-e', rev).code === 0;
const cnt = (cwd) => shQ(cwd, 'git', 'rev-list', '--count', 'HEAD').out.trim();

if (cloned) {
  ok(true, 'B0 얕은 클론(depth 1) 을 세웠다', '이력 ' + cnt(clone) + '커밋 · origin=' + url);
  ok(!have(clone, R23.PRE_REV),
     'B1 전제 — 그 클론에 표본 ' + R23.PRE_REV + ' 가 **없다**(이 전제가 깨지면 아래는 헛초록이다)');

  /* [C] 재현 — 옛 축(`--deepen=40` 한 번)으로는 못 닿는다. */
  const c0 = Date.now();
  const cFetch = shQ(clone, 'git', 'fetch', '--deepen=40', 'origin', 'main');
  const cHave = have(clone, R23.PRE_REV);
  ok(!cHave,
     'C1 재현 — `--deepen=40` 한 번으로는 표본에 **못 닿는다**(631 등재문 그대로)',
     '이력 ' + cnt(clone) + '커밋 · ' + ((Date.now() - c0) / 1000).toFixed(1) + 's'
     + (cFetch.code === 0 ? '' : ' · fetch 코드 ' + cFetch.code));

  /* [R-a] 되돌림 — 날짜 시도를 뺀 사본(= 옛 축)은 같은 자리에서 도로 null.
     756 이관: 사다리가 `gitrev756.js` 로 갔으므로 **수술도 그 파일에 한다**(PSRC 를 계속 째면
     replace 가 no-op 이 되어 이 절이 통째로 헛초록이 된다).
     ⚠ 겸사겸사 파일명 어긋남을 고쳤다 — 쓰는 이름은 `.v631-revert-<pid>.js` 인데 requiure 는
     `./tools/.v631-revert.js` 라 **756 착수 전 R1 은 내내 빨간 자리**였다(756 baseline 19/20). */
  const RBASE = `.v631-revert756-${process.pid}.js`;
  const SRC_R = GSRC.replace(/return \[since \? '--shallow-since=' \+ since : null[\s\S]*?\.filter\(Boolean\);/,
    "return ['--deepen=40'];");
  const rFile = path.join(clone, 'tools', RBASE);
  let rOut = 'x';
  if (SRC_R !== GSRC) {
    fs.writeFileSync(rFile, SRC_R);
    const r = shQ(clone, 'node', '-e',
      `const G=require('./tools/${RBASE}');`
      + `console.log(JSON.stringify(G.dig(${JSON.stringify(R23.PRE_REV)},`
      + ` { since: ${JSON.stringify(R23.PRE_DATE)}, budgetMs: 60000 })));`);
    rOut = r.out.trim().split('\n').pop();
  }
  ok(SRC_R !== GSRC, 'R0 되돌림 사본이 실제로 날짜 시도를 뺐다(사다리를 `--deepen=40` 하나로)',
     (GSRC.length - SRC_R.length) + '자 차이');
  ok(rOut === 'null', 'R1 옛 축(`--deepen=40`)만 남긴 사본은 같은 클론에서 도로 못 판다', 'dig → ' + rOut);
  try { fs.unlinkSync(rFile); } catch (e) {}

  /* [B] 실전 — 새 자로 판다. */
  fs.copyFileSync(P356, path.join(clone, 'tools', 'probe356r23.js'));
  const b0 = Date.now();
  const b = shQ(clone, 'node', '-e',
    "const R=require('./tools/probe356r23.js');const d=R.digPre();"
    + "console.log(JSON.stringify(d===null?null:d));");
  const bMs = Date.now() - b0;
  const dug = (b.out.trim().split('\n').pop() || '').trim();
  ok(dug !== 'null' && dug !== '' && b.code === 0,
     'B2 `digPre()` 가 얕은 클론에서 표본을 **파 온다**', dug.replace(/^"|"$/g, ''));
  ok(have(clone, R23.PRE_REV), 'B3 판 뒤 표본이 실제로 이 클론에 있다', '이력 ' + cnt(clone) + '커밋');
  /* ⚠ `git show` 를 파이프로 받으면 spawnSync 기본 maxBuffer(1MiB)에 잘린다 — 크기는 `cat-file -s` 로
     묻고(3.4MiB), 실행 자체는 출력을 버리고 종료 코드만 본다. */
  const size = Number(shQ(clone, 'git', 'cat-file', '-s', R23.PRE_REV + ':index.html').out.trim());
  const shown = spawnSync('git', ['show', R23.PRE_REV + ':index.html'],
    { cwd: clone, stdio: 'ignore' });
  ok(shown.status === 0 && size > 1e6,
     'B4 `git show <표본>:index.html` 이 나온다(되돌림 표본이 실제로 쓸 수 있다)',
     (size / 1048576).toFixed(1) + ' MiB · 코드 ' + shown.status);
  ok(bMs < 240000, 'B5 시간 예산 — 240s 안에 판다',
     (bMs / 1000).toFixed(1) + 's (' + (bMs / 2400).toFixed(1) + '%)');

  /* [B6] 날짜가 표본과 «한 벌» 인가 — PRE_DATE 는 표본과 그 부모보다 앞서야 한다. */
  const dOf = (rev) => {
    const r = shQ(clone, 'git', 'log', '-1', '--format=%aI', rev);
    return r.code === 0 ? r.out.trim() : '';
  };
  const dPre = dOf(R23.PRE_REV);
  const dSam = dOf(R23.PRE_REV.replace(/\^+$/, ''));
  ok(dPre && dSam && Date.parse(dPre) > preMs && Date.parse(dSam) > preMs,
     'B6 PRE_DATE 가 표본·그 부모 **둘 다보다 앞선다**(리베이스로 부모가 더 나중일 수 있다)',
     '표본 ' + dSam + ' · 부모 ' + dPre + ' · PRE_DATE ' + R23.PRE_DATE);
}

/* [R-b] 아예 없는 객체는 null 이다 — «못 팠는데 초록» 이 아님을 못박는다.
   ⚠ **일회용 클론 안에서** 돌린다 — 이 시도는 배수 깊이(160·640)를 실제로 파므로
      이 저장소에서 돌리면 자를 돌릴 때마다 작업 클론이 두꺼워진다. */
if (cloned) {
  const t0 = Date.now();
  const r = shQ(clone, 'node', '-e',
    "const R=require('./tools/probe356r23.js');"
    + "console.log(JSON.stringify(R.digPre('deadbeef'.repeat(5), R.PRE_DATE, 60000)));");
  const d = (r.out.trim().split('\n').pop() || '').trim();
  ok(d === 'null', 'R2 없는 객체는 null 을 돌려준다(건너뛰기가 아니라 «빨강» 이 된다)',
     'digPre → ' + d + ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

console.log('\nverify631: ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail + '건' : '  ALL PASS'));
process.exit(fail ? 1 : 0);
