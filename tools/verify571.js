#!/usr/bin/env node
/* 571 검증 — «조용한 autostash 충돌» 이 기록을 망가뜨리지 못하는가
 *
 *   node tools/verify571.js
 *
 *   [A] 도구 — `claim.js` 에 autostash 충돌 감시가 있고, `verifyProgress.js` 에 §4 가 있다.
 *   [B] 실전 — 진짜 bare 원격 + 클론으로 사고를 재현해, `--release` 가 **lock 을 지우기 전에**
 *       코드≠0 으로 멈추는지 잰다(재현기 `tools/probe571.js` [4] 와 같은 상황).
 *   [C] 게이트 — 병합 표시가 남은 합성 저장소에서 `verifyProgress` 가 그 파일을 대고 코드 1 로 끝난다.
 *   [D] 헛빨강 방지 — 표시를 «인용» 한 기록(줄 가운데) · 짝을 못 이룬 표시는 빨강이 아니다.
 *       이 저장소의 실제 작업 트리에서도 §4 는 초록이어야 한다(PROGRESS·ROUTINE 이 표시를 인용한다).
 *   [R] 되돌림 시험 — 감시를 **뺀 사본**은 같은 자리에서 도로 빨개진다(= 무르게 푼 수리가 아니다).
 *
 * ⚠ 병합 표시는 이 파일에서도 **런타임에 조립**한다 — 소스에 줄 첫머리로 적으면 §4 가 자기를 잡는다.
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLAIM = path.join(ROOT, 'tools', 'claim.js');
const VP = path.join(ROOT, 'tools', 'verifyProgress.js');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const OPEN = '<'.repeat(7) + ' ';
const MID = '='.repeat(7);
const CLOSE = '>'.repeat(7) + ' ';

const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
const shQ = (cwd, ...a) => {
  const r = spawnSync(a[0], a.slice(1), { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

/* ─────────────────────────── [A] 도구 ─────────────────────────── */
const CSRC = fs.existsSync(CLAIM) ? fs.readFileSync(CLAIM, 'utf8') : '';
const VSRC = fs.existsSync(VP) ? fs.readFileSync(VP, 'utf8') : '';
ok(spawnSync('node', ['--check', CLAIM], { encoding: 'utf8' }).status === 0, 'A1 claim.js 문법 성함');
ok(spawnSync('node', ['--check', VP], { encoding: 'utf8' }).status === 0, 'A2 verifyProgress.js 문법 성함');
ok(/--diff-filter=U/.test(CSRC) && /function stopOnConflict\(/.test(CSRC),
   'A3 claim.js 가 unmerged 경로를 직접 센다(autostash pop 충돌 감시)');
ok(/stopOnConflict\('autostash pop/.test(CSRC),
   'A4 감시가 **pull 직후**에도 걸려 있다 — pull 자신은 코드 0 이라 그 자리가 아니면 못 잡는다');
ok(CSRC.indexOf('stopOnConflict(') < CSRC.indexOf("fs.unlinkSync(LOCK)"),
   'A5 감시가 lock 을 지우는 자리보다 **앞**에 있다(반쯤 해제가 구조적으로 불가)');
ok(/§4 병합 표시 잔재 판정/.test(VSRC) && /conflicted\.length/.test(VSRC),
   'A6 verifyProgress 에 §4 가 있고 종료 코드에 반영된다');
ok(!/^<{7} /m.test(CSRC) && !/^<{7} /m.test(VSRC) && !/^<{7} /m.test(fs.readFileSync(__filename, 'utf8')),
   'A7 자·도구 소스가 줄 첫머리에 표시를 적지 않는다(자가 자기를 잡으면 안 된다)');

/* ─────────────────────── [B] 실전 — 진짜 git 으로 ─────────────────────── */
function raceHarness(claimSrc) {
  /* bare 원격 1개 + 클론 2개. A 가 901 을 잡고 트리가 더러운 채로 --release 를 부르는데
     그 사이 B 가 **같은 파일 끝**을 올려 두었다(569 가 겪은 상황). */
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v571-'));
  const BARE = path.join(TMP, 'remote.git');
  sh(TMP, 'git', 'init', '-q', '--bare', '-b', 'main', BARE);
  const seed = path.join(TMP, 'seed');
  fs.mkdirSync(path.join(seed, 'docs', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(seed, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(seed, 'tools', 'claim.js'), claimSrc);
  fs.writeFileSync(path.join(seed, 'docs', 'claims', 'README.md'), '선점 lock 자리\n');
  fs.writeFileSync(path.join(seed, 'docs', 'PROGRESS.md'), '# 표\n| 900 | 씨앗 |\n');
  sh(seed, 'git', 'init', '-q', '-b', 'main');
  sh(seed, 'git', 'config', 'user.email', 'v571@test');
  sh(seed, 'git', 'config', 'user.name', 'v571');
  sh(seed, 'git', 'add', '-A'); sh(seed, 'git', 'commit', '-q', '-m', 'seed');
  sh(seed, 'git', 'remote', 'add', 'origin', BARE);
  sh(seed, 'git', 'push', '-q', '-u', 'origin', 'main');
  const clone = n => {
    const d = path.join(TMP, n);
    sh(TMP, 'git', 'clone', '-q', BARE, d);
    sh(d, 'git', 'config', 'user.email', n + '@test'); sh(d, 'git', 'config', 'user.name', n);
    return d;
  };
  const A = clone('a'), B = clone('b');
  const tail = (d, s) => {
    const p = path.join(d, 'docs', 'PROGRESS.md');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + s + '\n');
  };
  shQ(A, 'node', path.join(A, 'tools', 'claim.js'), '901', 'sess-A');
  sh(B, 'git', 'pull', '-q', '--rebase', 'origin', 'main');
  tail(A, '| 901 | A 가 쓰던 마감문(커밋 전) |');
  tail(B, '| 902 | B 가 먼저 올린 완료 행 |');
  sh(B, 'git', 'add', '-A'); sh(B, 'git', 'commit', '-q', '-m', 'done(902)'); sh(B, 'git', 'push', '-q', 'origin', 'main');
  const rel = shQ(A, 'node', path.join(A, 'tools', 'claim.js'), '--release', '901', 'sess-A');
  const lockLeft = fs.existsSync(path.join(A, 'docs', 'claims', '901.lock'));
  const out = { code: rel.code, out: rel.out, lockLeft };
  fs.rmSync(TMP, { recursive: true, force: true });
  return out;
}
const B1 = raceHarness(CSRC);
ok(B1.code !== 0 && B1.lockLeft,
   'B1 autostash 충돌에서 release 가 lock 을 지우기 전에 멈춘다',
   '코드 ' + B1.code + ' · lock ' + (B1.lockLeft ? '보존' : '지워졌다(반쯤 해제)'));
ok(/병합 표시/.test(B1.out) && /git add /.test(B1.out),
   'B2 멈춤이 **읽을 수 있다** — 무엇이 났고 어떻게 푸는지 stderr 에 적는다',
   (B1.out.split('\n').find(l => /오류/.test(l)) || '(없음)').slice(0, 76));

/* ────────────── [C][D] §4 게이트 — 합성 저장소로 잰다 ────────────── */
function vpHarness(files, vpSrc) {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v571g-'));
  fs.mkdirSync(path.join(TMP, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(TMP, 'docs', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(TMP, 'docs', 'review'), { recursive: true });
  fs.writeFileSync(path.join(TMP, 'tools', 'verifyProgress.js'), vpSrc);
  fs.writeFileSync(path.join(TMP, 'docs', 'PROGRESS.md'),
    '| # | 화면 | 측정표 | 구현 | 최고 점수 | 루프 횟수 | 비고 |\n|---|---|---|---|---|---|---|\n| 900 | 씨앗 | – | – | – | 0/5 | 미착수. |\n');
  sh(TMP, 'git', 'init', '-q', '-b', 'main');
  sh(TMP, 'git', 'config', 'user.email', 'v571@test'); sh(TMP, 'git', 'config', 'user.name', 'v571');
  sh(TMP, 'git', 'add', '-A'); sh(TMP, 'git', 'commit', '-q', '-m', 'seed');
  for (const [rel, body] of Object.entries(files)) fs.writeFileSync(path.join(TMP, rel), body);
  sh(TMP, 'git', 'add', '-A'); sh(TMP, 'git', 'commit', '-q', '-m', 'poison');
  const r = shQ(TMP, 'node', path.join(TMP, 'tools', 'verifyProgress.js'), '--no-gate');
  fs.rmSync(TMP, { recursive: true, force: true });
  return r;
}
const POISON = '# 교훈\n- 앞 줄\n' + OPEN + 'Updated upstream\n남의 완료 행\n' + MID + '\n내 행\n' + CLOSE + 'Stashed changes\n- 뒷 줄\n';
const QUOTE = '# 기록\n- 사고 보고: 트리에 `' + OPEN + 'Updated upstream` 3줄이 남았다(571).\n- 표시 문자열을 인용만 한다.\n';
const HALF = '# 기록\n' + OPEN + 'Updated upstream\n짝(가름·닫힘)이 뒤에 없다 — 인용일 수 있다\n';

const C1 = vpHarness({ 'docs/LESSONS.md': POISON }, VSRC);
ok(C1.code === 1 && /병합 표시 잔재 · 3~7행/.test(C1.out) && /MERGE MARKERS 1건/.test(C1.out),
   'C1 병합 표시가 남은 파일을 대고 코드 1 로 끝난다',
   '코드 ' + C1.code + ' · ' + (C1.out.split('\n').find(l => /✗ .*병합 표시/.test(l)) || '').trim().slice(0, 70));
ok(/양쪽을 모두 살려/.test(C1.out) && /probe571/.test(C1.out),
   'C2 «어떻게 푸는가» 와 «뿌리가 어디인가» 를 같이 적는다');

const D1 = vpHarness({ 'docs/LESSONS.md': QUOTE }, VSRC);
ok(D1.code === 0 && /§4 병합 표시 잔재 — 빨강 0건/.test(D1.out),
   'D1 헛빨강 없음 — 줄 **가운데** 인용은 표시가 아니다',
   '코드 ' + D1.code);
const D2 = vpHarness({ 'docs/LESSONS.md': HALF }, VSRC);
ok(D2.code === 0 && /짝을 못 이룬 표시\(인용일 수 있다\) 1건/.test(D2.out),
   'D2 짝이 없는 표시 한 줄은 빨강이 아니라 «관찰» 이다(조용히 넘기지도 않는다)',
   '코드 ' + D2.code);
const D3 = shQ(ROOT, 'node', VP, '--no-gate');
ok(/§4 병합 표시 잔재 — 빨강 0건/.test(D3.out),
   'D3 이 저장소의 실제 작업 트리에서 §4 가 초록이다(PROGRESS·ROUTINE 이 표시를 인용한다)',
   (D3.out.split('\n').find(l => /§4/.test(l)) || '').trim());

/* ─────────────────────── [R] 되돌림 시험 ─────────────────────── */
const CSRC_R = CSRC.replace(/^\s*stopOnConflict\([^;]*\);\s*$/gm, '');
ok(CSRC_R !== CSRC && !/stopOnConflict\(/.test(CSRC_R.split('function stopOnConflict')[1] || ''),
   'R0 되돌림 사본이 실제로 감시를 뺐다', (CSRC.length - CSRC_R.length) + '자 제거');
const R1 = raceHarness(CSRC_R);
ok(!R1.lockLeft,
   'R1 감시를 빼면 같은 자리에서 도로 «반쯤 해제» 가 난다(lock 이 지워진 채 커밋 실패)',
   '코드 ' + R1.code + ' · lock ' + (R1.lockLeft ? '보존' : '지워졌다'));
const VSRC_R = VSRC.replace(" || conflicted.length", "").replace("'^' + MK_OPEN", "'^\\u0001'");
const R2 = vpHarness({ 'docs/LESSONS.md': POISON }, VSRC_R);
ok(VSRC_R !== VSRC && R2.code === 0,
   'R2 §4 를 빼면 같은 오염 저장소가 도로 초록이 된다',
   '코드 ' + R2.code);

console.log('\nverify571: ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail + '건' : '  ALL PASS'));
process.exit(fail ? 1 : 0);
