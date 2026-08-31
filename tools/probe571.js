#!/usr/bin/env node
/* 571 재현 — `claim.js` 의 autostash 충돌이 «조용히» 기록을 망가뜨리는가 (지시서 338 규칙: 처방보다 재현이 먼저)
 *
 *   node tools/probe571.js
 *
 * 가짜 mock 이 아니라 **진짜 git** 으로 잰다 — bare 원격 1개 + 워커 클론 2개(verify290 [C] 하네스).
 * 재현하는 상황은 569 마감 때 실제로 일어난 그것이다:
 *   워커 A 가 `docs/PROGRESS.md` 끝에 자기 행을 **아직 커밋 안 한 채** `--release` 를 부르는데,
 *   그 사이 워커 B 가 **같은 파일 끝**에 자기 행을 올려 두었다.
 *
 *   [1] git 성질 — `-c rebase.autoStash=true pull --rebase` 는 stash pop 이 충돌해도 **종료 코드 0** 이고
 *       작업 트리에 병합 표시를 남긴다. claim.js 의 `gitQ(...) === null` 검사는 그래서 통과한다(= 조용함의 뿌리).
 *   [2] git 성질 — 그 뒤 `git commit` 은 «unmerged files» 로 **거부**한다(코드 128).
 *       claim.js 는 그 자리에서 `git()`(throw 판) 을 쓰므로 uncaught 예외 = 지시서가 말한 «Node 배너» 다.
 *   [3] 피해 경로 — 지시서 [1] 이 시키는 `git add -A` + 커밋은 병합 표시를 **그대로 커밋한다**.
 *   [4] 도구 판정 — 이 상황에서 `claim.js --release` 가 lock 을 지우기 전에 멈추는가.
 *       ⚠ **수리 전에는 이 항이 빨갛다** — 그것이 이 재현기의 본체다(수리 후 초록).
 *   [5] 음성 대조 — 충돌이 없으면 autostash 는 깨끗이 pop 되고 release 는 정상(코드 0)으로 끝난다.
 *       (헛빨강 방지 — «더러운 트리» 자체가 문제인 것이 아니다.)
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLAIM = path.join(ROOT, 'tools', 'claim.js');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const note = m => console.log('     · ' + m);

/* 병합 표시는 **런타임에 조립**한다 — 이 파일 자신이 §4 게이트에 걸리면 안 된다 */
const OPEN = '<'.repeat(7) + ' ';
const MID = '='.repeat(7);
const CLOSE = '>'.repeat(7) + ' ';
const hasMarkers = s => s.split('\n').some(l => l.startsWith(OPEN))
                     && s.split('\n').some(l => l === MID)
                     && s.split('\n').some(l => l.startsWith(CLOSE));

const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
const shQ = (cwd, ...a) => {
  const r = spawnSync(a[0], a.slice(1), { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const runClaim = (cwd, args) => shQ(cwd, 'node', path.join(cwd, 'tools', 'claim.js'), ...args);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'p571-'));
try {
  /* ── 하네스: bare 원격 + 클론 2개. claim.js 는 origin/main 과 docs/ 만 쓰므로 index.html 없이 돈다 ── */
  const BARE = path.join(TMP, 'remote.git');
  sh(TMP, 'git', 'init', '-q', '--bare', '-b', 'main', BARE);
  const seed = path.join(TMP, 'seed');
  fs.mkdirSync(path.join(seed, 'docs', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(seed, 'tools'), { recursive: true });
  fs.copyFileSync(CLAIM, path.join(seed, 'tools', 'claim.js'));
  fs.writeFileSync(path.join(seed, 'docs', 'claims', 'README.md'), '선점 lock 자리\n');
  /* 모든 워커가 «끝에 덧붙이는» 파일 — 피해가 나는 자리가 정확히 이 꼴이다 */
  fs.writeFileSync(path.join(seed, 'docs', 'PROGRESS.md'), '# 표\n| 900 | 씨앗 |\n');
  sh(seed, 'git', 'init', '-q', '-b', 'main');
  sh(seed, 'git', 'config', 'user.email', 'p571@test');
  sh(seed, 'git', 'config', 'user.name', 'p571');
  sh(seed, 'git', 'add', '-A');
  sh(seed, 'git', 'commit', '-q', '-m', 'seed');
  sh(seed, 'git', 'remote', 'add', 'origin', BARE);
  sh(seed, 'git', 'push', '-q', '-u', 'origin', 'main');

  const clone = name => {
    const d = path.join(TMP, name);
    sh(TMP, 'git', 'clone', '-q', BARE, d);
    sh(d, 'git', 'config', 'user.email', name + '@test');
    sh(d, 'git', 'config', 'user.name', name);
    return d;
  };
  /* A2 는 [1]~[3](claim.js 없이 git 만 재는 절)의 워커다 — **B 가 올리기 전에** 떠 있어야
     «상류를 아직 모르는 워커» 가 된다(늦게 클론하면 pull 이 no-op 이라 충돌 자체가 안 난다). */
  const A = clone('workerA'), B = clone('workerB'), A2 = clone('workerA2');
  const Ptail = (dir, line) => {
    const p = path.join(dir, 'docs', 'PROGRESS.md');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + line + '\n');
  };
  const Pread = dir => fs.readFileSync(path.join(dir, 'docs', 'PROGRESS.md'), 'utf8');

  /* A 가 901 을 선점해 둔다(정상 경로) */
  const claimed = runClaim(A, ['901', 'sess-A']);
  ok(claimed.code === 0, '0 하네스 — A 가 901 을 선점했다', '코드 ' + claimed.code);
  sh(B, 'git', 'pull', '-q', '--rebase', 'origin', 'main');

  /* ── 사고 상황 만들기: A 의 트리는 더럽고, 그 사이 B 가 같은 파일 끝을 올렸다 ── */
  Ptail(A, '| 901 | A 가 쓰던 마감문(아직 커밋 전) |');
  Ptail(B, '| 902 | B 가 먼저 올린 완료 행 |');
  sh(B, 'git', 'add', '-A');
  sh(B, 'git', 'commit', '-q', '-m', 'done(902): 상류');
  sh(B, 'git', 'push', '-q', 'origin', 'main');

  /* [1] git 성질 — autostash pop 충돌은 «성공» 으로 끝난다 */
  Ptail(A2, '| 901 | A 가 쓰던 마감문(아직 커밋 전) |');
  const pull = shQ(A2, 'git', '-c', 'rebase.autoStash=true', 'pull', '--rebase', 'origin', 'main');
  const tree = Pread(A2);
  ok(pull.code === 0 && hasMarkers(tree),
     '[1] autostash 충돌인데 pull 은 종료 코드 0 이다(= claim.js 의 null 검사를 그대로 통과한다)',
     '코드 ' + pull.code + ' · 병합 표시 ' + (hasMarkers(tree) ? '있음' : '없음')
     + ' · ' + (pull.out.match(/Applying autostash resulted in conflicts/) ? 'git 도 «conflicts» 라고 적는다(stderr)' : '?'));
  const unmerged = shQ(A2, 'git', 'diff', '--name-only', '--diff-filter=U').out.trim();
  note('unmerged 경로: ' + (unmerged || '없음') + ' · stash: '
       + (shQ(A2, 'git', 'stash', 'list').out.trim().split('\n')[0] || '없음'));

  /* [2] git 성질 — 그 뒤 commit 은 거부된다(claim.js 의 uncaught 예외 = «Node 배너» 의 정체) */
  fs.writeFileSync(path.join(A2, 'docs', 'claims', '903.lock'), '2026-01-01T00:00:00Z sess-A\n');
  const addOne = shQ(A2, 'git', 'add', '--', 'docs/claims/903.lock');
  const cmt = shQ(A2, 'git', 'commit', '-q', '-m', 'unclaim(903)');
  ok(addOne.code === 0 && cmt.code !== 0 && /unmerged/i.test(cmt.out),
     '[2] 병합 표시가 남은 트리에서는 `git commit` 이 거부한다(코드 128)',
     'add=' + addOne.code + ' commit=' + cmt.code + ' · ' + (cmt.out.split('\n')[0] || ''));

  /* [3] 피해 경로 — 지시서 [1] 의 `git add -A` + 커밋은 표시를 그대로 담는다 */
  shQ(A2, 'git', 'add', '-A');
  const cmt2 = shQ(A2, 'git', 'commit', '-q', '-m', 'wip(901): 회차');
  const committed = shQ(A2, 'git', 'show', 'HEAD:docs/PROGRESS.md').out;
  ok(cmt2.code === 0 && hasMarkers(committed),
     '[3] `git add -A` + 커밋이 병합 표시를 **그대로 커밋한다**(569 가 겪은 그 피해)',
     '커밋 ' + cmt2.code + ' · 커밋된 본문에 표시 ' + (hasMarkers(committed) ? '있음' : '없음')
     + ' · 901 행 ' + (committed.match(/\| 901 \|/g) || []).length + '벌');

  /* [4] 도구 판정 — 같은 상황에서 claim.js --release 가 lock 을 지우기 전에 멈추는가
        (수리 전에는 빨갛다 — lock 을 지운 채 커밋에 실패해 «반쯤 해제» 로 끝난다) */
  const rel = runClaim(A, ['--release', '901', 'sess-A']);
  const lockLeft = fs.existsSync(path.join(A, 'docs', 'claims', '901.lock'));
  const relTree = Pread(A);
  ok(rel.code !== 0 && lockLeft,
     '[4] release 가 autostash 충돌을 만나면 **lock 을 지우기 전에** 코드≠0 으로 멈춘다',
     '코드 ' + rel.code + ' · lock ' + (lockLeft ? '남아 있음' : '지워졌다(반쯤 해제)')
     + ' · 트리 병합 표시 ' + (hasMarkers(relTree) ? '있음' : '없음'));
  note('release stderr 첫 줄: ' + (rel.out.trim().split('\n')[0] || '(없음)'));
  if (!lockLeft) note('⚠ 재현됨 — lock 은 사라졌는데 커밋이 안 됐다. 워커의 `git add -A` 가 그 삭제와 병합 표시를 함께 담는다.');

  /* [5] 음성 대조 — 충돌이 없으면 조용히 잘 돌아야 한다(«더러운 트리» 가 죄가 아니다) */
  const C = clone('workerC');
  const rc = runClaim(C, ['904', 'sess-C']);
  fs.writeFileSync(path.join(C, 'docs', 'other.md'), '겹치지 않는 파일\n');   /* 상류와 안 겹친다 */
  const rc2 = runClaim(C, ['--release', '904', 'sess-C']);
  const dirtyKept = fs.existsSync(path.join(C, 'docs', 'other.md'));
  ok(rc.code === 0 && rc2.code === 0 && dirtyKept && !hasMarkers(Pread(C)),
     '[5] 음성 대조 — 겹치지 않는 더러운 트리에서는 선점·해제가 그대로 통과한다',
     '선점 ' + rc.code + ' · 해제 ' + rc2.code + ' · 미커밋 파일 ' + (dirtyKept ? '보존' : '유실'));
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
}

console.log('\nprobe571: ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail + '건' : '  ALL PASS'));
process.exit(fail ? 1 : 0);
