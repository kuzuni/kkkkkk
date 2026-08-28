#!/usr/bin/env node
/* 307 검증 — heartbeat 가 «작업 트리가 더러워도» 실제로 찍히는가
 *
 *   node tools/verify307.js
 *
 * ── 왜 이 게이트인가 ──────────────────────────────────────────────────────
 * 워커가 heartbeat 를 치고 싶은 순간은 **회차 기록(`docs/review/<ID>-*.md`)을 막 쓴 직후**,
 * 즉 작업 트리가 반드시 더러운 때다. 그런데 claim.js 는 모드를 가리지 않고 머리에서
 * `git pull --rebase` 를 돌았고, 더러운 트리에서는 그것이
 *     error: cannot pull with rebase: You have unstaged changes.
 * 로 죽어 **`write()` 에 도달하지 못했다** — 도구가 «의도된 사용법 그 자체» 에서 조용히 no-op.
 * 게다가 안내문이 «커밋은 회차 커밋에 같이 담는다» 라 워커들이 `--beat ... >/dev/null` 로 묶어
 * 쓰는데, 실패 메시지가 stdout 이라 **exit 1 조차 안 보였다**.
 * 실제 피해(2026-08-28, 122 24회차): 다섯 번의 `--beat` 가 전부 조용히 실패해 lock 이 89분까지
 * 갔다 — 90분 규칙까지 1분 남았다. 산 세션이 죽은 것으로 오인돼 뺏길 뻔했다.
 *
 *   [A] 소스 — beat 경로가 pull 을 돌지 않고, 실패는 stderr 로 나간다.
 *   [B] 실전 — 진짜 git 원격(bare) + 클론으로 **더러운 트리**를 만들어 놓고 재현한다.
 *   [C] 문서 — 안내문이 «더러운 트리에서도 된다 · 실패는 stderr» 를 적어 뒀다.
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

/* ─────────────────────────── [A] 소스 ─────────────────────────── */
const SRC = fs.existsSync(CLAIM) ? fs.readFileSync(CLAIM, 'utf8') : '';
ok(!!SRC, 'A1 tools/claim.js 존재', SRC ? SRC.split('\n').length + '줄' : '없음');
const syn = spawnSync('node', ['--check', CLAIM], { encoding: 'utf8' });
ok(syn.status === 0, 'A2 문법 성함', (syn.stderr || '').split('\n')[0] || 'ok');

/* pull --rebase 호출이 «claim/release 모드일 때만» 도는 가드 안에 있는가 */
const pullLines = SRC.split('\n')
  .map((l, i) => ({ l, i }))
  .filter(o => /'pull', '--rebase'/.test(o.l));
ok(pullLines.length > 0, 'A3 pull --rebase 호출부를 찾았다', pullLines.length + '곳');
const guarded = pullLines.every(o => {
  /* 바로 앞 6줄 안에 모드 가드가 있어야 한다(머리에서 무조건 도는 형태 금지) */
  const before = SRC.split('\n').slice(Math.max(0, o.i - 6), o.i).join('\n');
  return /mode === 'claim'|mode === 'release'|mode !== 'beat'/.test(before)
      || /try_/.test(before) || /for \(let/.test(before);   /* push 재시도 루프 안은 예외 */
});
ok(guarded, 'A4 pull --rebase 가 claim/release 에서만 돈다(beat 는 안 돈다)');
ok(!/mode !== 'check' && gitQ\('pull'/.test(SRC),
   'A5 옛 형태(«check 가 아니면 무조건 pull»)가 남아 있지 않다');
ok(/const die = \(code, m\) => \{ console\.error\(m\)/.test(SRC),
   'A6 실패 메시지가 stdout 이 아니라 stderr 로 나간다(`>/dev/null` 로 못 감춘다)');
ok(/function remoteLock\(/.test(SRC) && /'show', 'origin\/main:' \+ REL/.test(SRC),
   'A7 원격 lock 판정을 pull 없이 `git show origin/main:<lock>` 으로 한다');
ok(/rebase\.autoStash=true/.test(SRC),
   'A8 claim/release 의 pull 은 autoStash 로 돌아 더러운 트리에서도 죽지 않는다');

/* ─────────────────────── [B] 실전 재현 ───────────────────────
   가짜가 아니라 **진짜 git** 으로 잰다 — bare 원격 1개 + 워커 클론 2개.
   claim.js 는 `origin/main` 과 `docs/claims/` 만 쓰므로 index.html 없이도 그대로 돈다. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v307-'));
const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
const runClaim = (cwd, args) => {
  const r = spawnSync('node', [path.join(cwd, 'tools', 'claim.js')].concat(args),
                      { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
};
const lockOf = (d, id) => {
  const p = path.join(d, 'docs', 'claims', id + '.lock');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : null;
};
/* heartbeat 는 초 해상도라 «방금 쓴 시각» 과 같은 초에 걸리면 변화를 못 잰다.
   그래서 일부러 과거 시각을 심어 두고 «앞으로 갔는가» 를 본다. */
const backdate = (d, id, sid, minutesAgo) => {
  const at = new Date(Date.now() - minutesAgo * 60000).toISOString().replace(/\.\d+Z$/, 'Z');
  fs.writeFileSync(path.join(d, 'docs', 'claims', id + '.lock'), at + ' ' + sid + '\n');
  return at;
};
/* 트리를 더럽힌다 — 워커가 회차 기록을 막 쓴 상태의 재현 */
const dirty = (d, text) => {
  const p = path.join(d, 'docs', 'review', '307-heartbeat.md');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, text + '\n');
};

try {
  const BARE = path.join(TMP, 'remote.git');
  sh(TMP, 'git', 'init', '-q', '--bare', '-b', 'main', BARE);
  const seed = path.join(TMP, 'seed');
  fs.mkdirSync(path.join(seed, 'docs', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(seed, 'docs', 'review'), { recursive: true });
  fs.mkdirSync(path.join(seed, 'tools'), { recursive: true });
  fs.copyFileSync(CLAIM, path.join(seed, 'tools', 'claim.js'));
  fs.writeFileSync(path.join(seed, 'docs', 'claims', 'README.md'), '선점 lock 자리\n');
  fs.writeFileSync(path.join(seed, 'docs', 'review', '307-heartbeat.md'), '# 307 회차 기록\n');
  sh(seed, 'git', 'init', '-q', '-b', 'main');
  sh(seed, 'git', 'config', 'user.email', 'v307@test');
  sh(seed, 'git', 'config', 'user.name', 'v307');
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
  const A = clone('workerA'), B = clone('workerB'), C = clone('workerC');
  /* C 는 «남이 그 사이 push 했다» 를 만들어 주는 역할만 한다 — pull 이 실제로 rebase 를 시도하게. */
  let cn = 0;
  const advanceRemote = () => {
    sh(C, 'git', 'pull', '-q', '--rebase', 'origin', 'main');
    fs.appendFileSync(path.join(C, 'docs', 'claims', 'README.md'), 'C' + (++cn) + '\n');
    sh(C, 'git', 'add', '-A');
    sh(C, 'git', 'commit', '-q', '-m', 'wip(999): C' + cn);
    sh(C, 'git', 'push', '-q', 'origin', 'main');
  };

  /* 선점은 깨끗한 트리에서 (여기까지는 예전에도 됐다) */
  const claimed = runClaim(A, ['307', 'sess-A']);
  ok(claimed.code === 0 && lockOf(A, '307'), 'B0 선점 성공(전제)', claimed.out.split('\n')[0]);

  /* ── B1 이 게이트의 본체 — «회차 기록을 막 쓴» 더러운 트리에서 heartbeat ── */
  const old1 = backdate(A, '307', 'sess-A', 40);
  dirty(A, '1회차 — 방금 쓴 기록(트리가 더럽다)');
  advanceRemote();     /* 원격이 앞서 있어야 pull 이 실제로 rebase 를 시도한다 — 진짜 상황의 재현 */

  const beat = runClaim(A, ['--beat', '307', 'sess-A']);
  const afterBeat = lockOf(A, '307');
  ok(beat.code === 0 && afterBeat && afterBeat.split(/\s+/)[0] !== old1,
     'B1 더러운 트리에서 --beat 가 lock 시각을 실제로 갱신한다',
     '코드 ' + beat.code + ' · ' + old1 + ' → ' + (afterBeat ? afterBeat.split(/\s+/)[0] : '없음'));
  ok(fs.readFileSync(path.join(A, 'docs', 'review', '307-heartbeat.md'), 'utf8')
       .includes('방금 쓴 기록'),
     'B2 --beat 가 더럽힌 작업 내용을 건드리지 않는다');

  /* ── B3 실패는 `>/dev/null` 로 감춰지지 않는다(stderr) ── */
  const wrong = runClaim(A, ['--beat', '307', 'sess-남']);
  ok(wrong.code === 2 && /포기/.test(wrong.err) && !/포기/.test(wrong.out),
     'B3 남의 SID 로 친 --beat 는 코드 2 + **stderr** 로 알린다',
     '코드 ' + wrong.code + ' · stderr[' + wrong.err.trim().split('\n')[0] + ']');

  /* ── B4 원격에서 이미 뺏겼으면 heartbeat 가 아니라 «포기» 다(pull 없이도 안다) ── */
  sh(B, 'git', 'pull', '-q', '--rebase', 'origin', 'main');
  fs.writeFileSync(path.join(B, 'docs', 'claims', '307.lock'),
                   new Date().toISOString().replace(/\.\d+Z$/, 'Z') + ' sess-B\n');
  sh(B, 'git', 'add', '-A'); sh(B, 'git', 'commit', '-q', '-m', 'reclaim(307): sess-B');
  sh(B, 'git', 'push', '-q', 'origin', 'main');
  const stolen = runClaim(A, ['--beat', '307', 'sess-A']);
  ok(stolen.code === 2 && /origin\/main/.test(stolen.err),
     'B4 원격에서 뺏긴 lock 은 --beat 가 코드 2 로 알린다(로컬만 갱신하고 넘어가지 않는다)',
     '코드 ' + stolen.code + ' · ' + stolen.err.trim().split('\n')[0]);

  /* ── B5 --release 도 더러운 트리에서 죽지 않는다(죽으면 그 작업이 90분 막힌다) ── */
  const rel = runClaim(B, ['308', 'sess-B']);
  ok(rel.code === 0, 'B5 선점 성공(전제 · 308)', rel.out.split('\n')[0]);
  dirty(B, '마감 기록 — 트리가 더럽다');
  advanceRemote();                                    /* 원격을 앞세워 진짜 rebase 를 만든다 */
  const released = runClaim(B, ['--release', '308', 'sess-B']);
  const remoteHas = (() => {
    try { sh(B, 'git', 'show', 'origin/main:docs/claims/308.lock'); return true; }
    catch (e) { return false; }
  })();
  ok(released.code === 0 && !lockOf(B, '308') && !remoteHas,
     'B6 더러운 트리에서 --release 가 lock 을 지우고 push 까지 간다',
     '코드 ' + released.code + ' · 로컬 ' + (lockOf(B, '308') ? '남음' : '없음')
     + ' · 원격 ' + (remoteHas ? '남음' : '없음'));
  ok(fs.readFileSync(path.join(B, 'docs', 'review', '307-heartbeat.md'), 'utf8')
       .includes('마감 기록'),
     'B7 --release 의 autoStash 가 더럽힌 작업 내용을 잃지 않는다');
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

/* ─────────────────────────── [C] 문서 ─────────────────────────── */
const PRG = fs.readFileSync(path.join(ROOT, 'docs', 'PROGRESS.md'), 'utf8');
const rulesAt = PRG.indexOf('## 병렬 세션 규칙');
const rules = rulesAt >= 0 ? PRG.slice(rulesAt, PRG.indexOf('### 작업 단위', rulesAt)) : '';
ok(/--beat/.test(rules) && /더러워도|더러운/.test(rules),
   'C1 «병렬 세션 규칙» 이 «트리가 더러워도 heartbeat 가 된다» 를 적어 뒀다');
const RTN = fs.readFileSync(path.join(ROOT, 'docs', 'ROUTINE.md'), 'utf8');
ok(/--beat/.test(RTN) && /stderr/.test(RTN),
   'C2 ROUTINE 이 heartbeat 도구와 «실패는 stderr» 를 적어 뒀다');

console.log('\nVERIFY307 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
