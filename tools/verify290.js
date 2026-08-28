#!/usr/bin/env node
/* 290 검증 — 선점이 «남의 클레임을 덮을 수 없는가»
 *
 *   node tools/verify290.js
 *
 *   [A] 도구 — `tools/claim.js` 가 있고 문법이 성하며, 경쟁 패배를 **자동으로** 처리한다
 *       (lock 충돌 → surrender · rebase 후 SID 불일치 → surrender · 종료 코드 2).
 *   [B] 이력 — origin/main 의 lock 커밋 중 «살아 있는 남의 lock 줄을 덮은» 건이 없다.
 *       **아는 위반 1건(8fcacb6)은 사유와 함께 예외로 등재**한다 — 새 위반만 빨개진다.
 *   [C] 실전 경쟁 — 진짜 git 원격(bare)과 클론 2개로 **동시 선점**을 재현해,
 *       claim.js 가 정확히 «한쪽만 이기고 다른 쪽은 스스로 물러나는지» 를 잰다.
 *       ⓐ 정상 경쟁(둘 다 빈 자리를 본다) ⓑ 살아 있는 lock 뺏기 시도 ⓒ 90분 지난 죽은 lock 회수.
 *   [D] 문서 — PROGRESS «병렬 세션 규칙» 이 claim.js 를 선점 절차로 지시한다.
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

/* ─────────────────────────── [A] 도구 ─────────────────────────── */
const SRC = fs.existsSync(CLAIM) ? fs.readFileSync(CLAIM, 'utf8') : '';
ok(!!SRC, 'A1 tools/claim.js 존재', SRC ? SRC.split('\n').length + '줄' : '없음');
const syn = spawnSync('node', ['--check', CLAIM], { encoding: 'utf8' });
ok(syn.status === 0, 'A2 문법 성함', (syn.stderr || '').split('\n')[0] || 'ok');
ok(/function surrender\(/.test(SRC) && /rebase --abort|'rebase', '--abort'/.test(SRC)
   && /reset', '--hard', 'origin\/main'/.test(SRC),
   'A3 경쟁 패배 처리(surrender: rebase --abort + reset --hard origin/main)');
ok(/includes\(REL\)/.test(SRC) && /surrender\(/.test(SRC),
   'A4 lock 파일에서 난 rebase 충돌을 «경쟁 패배» 로 판정');
ok(/L\.sid !== SID/.test(SRC) && /DEAD_MIN = 90/.test(SRC),
   'A5 90분 규칙 · 남의 SID 판정이 코드에 있다');
ok(/--grep', 'wip\('/.test(SRC),
   'A6 죽음 판정이 lock 시각뿐 아니라 마지막 wip(<ID>) 커밋도 본다');

/* ─────────────────────────── [B] 이력 ───────────────────────────
   «덮어쓰기» 의 지문: 한 커밋이 같은 lock 파일에서 -<시각A> <SID_A> / +<시각B> <SID_B> 를
   동시에 내고 (SID_A != SID_B) 두 시각 차가 90분 이내인 것. 90분 넘으면 정당한 회수다. */
const KNOWN = {
  /* 290 이 등재된 사건 그 자체 — 고칠 수 없는 과거다. 사유를 남겨 두고 새 위반만 잡는다. */
  '8fcacb68824d932b6132a21652f34940d890f209':
    '2026-08-28 02:41 · 289 선점 경쟁에서 92초 된 남의 lock 을 덮었다(= 290 등재 사유). '
    + '덮은 쪽도 덮인 쪽도 289 를 통째로 완주했다 — 한 세션이 통으로 낭비됐다.',
  '6e8a94993687724dfbdd61ad7abee4b827a5208a':
    '2026-08-28 02:03 · 122 선점에서 3분 된 남의 lock 을 덮었다. 덮은 쪽이 14초 뒤 스스로 '
    + 'revert(d6c6da4) 해 복구했다 — 같은 결함이 40분 안에 두 번 났다는 증거라 예외로 남긴다.',
};
function historyViolations() {
  const log = execFileSync('git',
    ['log', '--format=%H', '-n', '400', 'origin/main', '--', 'docs/claims/'],
    { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const bad = [];
  for (const h of log) {
    let d = '';
    try { d = execFileSync('git', ['show', '--format=', '--unified=0', h, '--', 'docs/claims/'],
                           { cwd: ROOT, encoding: 'utf8' }); } catch (e) { continue; }
    /* 파일별로 -줄/+줄 을 짝지어 본다 */
    let cur = null;
    const files = {};
    for (const ln of d.split('\n')) {
      const f = ln.match(/^\+\+\+ b\/(docs\/claims\/\S+)/);
      if (f) { cur = f[1]; files[cur] = files[cur] || { minus: [], plus: [] }; continue; }
      if (!cur) continue;
      const m = ln.match(/^-(\S+)\s+(\S+)/); if (m) files[cur].minus.push(m);
      const p = ln.match(/^\+(\S+)\s+(\S+)/); if (p) files[cur].plus.push(p);
    }
    for (const [f, v] of Object.entries(files)) {
      if (!v.minus.length || !v.plus.length) continue;          /* 생성·삭제는 덮어쓰기가 아니다 */
      const [, aAt, aSid] = v.minus[0], [, bAt, bSid] = v.plus[0];
      if (aSid === bSid) continue;                              /* 자기 heartbeat */
      const gap = (Date.parse(bAt) - Date.parse(aAt)) / 60000;
      if (!Number.isFinite(gap) || gap > 90) continue;          /* 90분 넘으면 정당한 회수 */
      /* 새 시각이 «더 이르면» 선점이 아니라 되돌리기다 — 아무도 과거 시각으로 lock 을 잡지 않는다.
         (남의 lock 을 덮은 워커가 스스로 revert 해 복구한 커밋이 여기 걸린다. d6c6da4) */
      if (gap < 0) continue;
      bad.push({ h, f, why: aSid + '(' + Math.round(gap) + '분) → ' + bSid });
    }
  }
  return bad;
}
const viol = historyViolations();
const fresh = viol.filter(v => !KNOWN[v.h]);
ok(fresh.length === 0, 'B1 살아 있는 남의 lock 을 덮은 커밋 0건(등재 예외 제외)',
   fresh.length ? fresh.map(v => v.h.slice(0, 7) + ' ' + v.f + ' ' + v.why).join(' | ')
                : '새 위반 0 · 등재 예외 ' + Object.keys(KNOWN).length + '건');
const seen = viol.filter(v => KNOWN[v.h]).map(v => v.h);
ok(Object.keys(KNOWN).every(h => seen.includes(h)),
   'B2 등재 예외가 실제 이력에 있다(죽은 예외 0건)',
   Object.keys(KNOWN).map(h => h.slice(0, 7) + (seen.includes(h) ? '✓' : '✗ 이력에 없음')).join(' · '));

/* ─────────────────────── [C] 실전 경쟁 재현 ───────────────────────
   가짜가 아니라 **진짜 git** 으로 잰다 — bare 원격 1개 + 워커 클론 2개.
   claim.js 는 `origin/main` 과 `docs/claims/` 만 쓰므로 index.html 없이도 그대로 돈다. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v290-'));
const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
const runClaim = (cwd, args) => {
  const r = spawnSync('node', [path.join(cwd, 'tools', 'claim.js')].concat(args),
                      { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
try {
  const BARE = path.join(TMP, 'remote.git');
  sh(TMP, 'git', 'init', '-q', '--bare', '-b', 'main', BARE);
  const seed = path.join(TMP, 'seed');
  fs.mkdirSync(path.join(seed, 'docs', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(seed, 'tools'), { recursive: true });
  fs.copyFileSync(CLAIM, path.join(seed, 'tools', 'claim.js'));
  fs.writeFileSync(path.join(seed, 'docs', 'claims', 'README.md'), '선점 lock 자리\n');
  sh(seed, 'git', 'init', '-q', '-b', 'main');
  sh(seed, 'git', 'config', 'user.email', 'v290@test');
  sh(seed, 'git', 'config', 'user.name', 'v290');
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
  const A = clone('workerA'), B = clone('workerB');

  /* ⓐ 정상 경쟁 — 둘 다 «빈 자리» 를 보고 동시에 잡으러 간다 */
  const rA = runClaim(A, ['901', 'sess-A']);
  const rB = runClaim(B, ['901', 'sess-B']);                 /* B 는 A 의 push 를 아직 모른다 */
  const winners = [rA, rB].filter(r => r.code === 0).length;
  const losers = [rA, rB].filter(r => r.code === 2).length;
  ok(winners === 1 && losers === 1, 'C1 동시 선점 — 정확히 한쪽만 이기고 한쪽은 스스로 물러난다',
     'A=' + rA.code + ' B=' + rB.code + ' · ' + (rB.code === 2 ? rB.out : rA.out).split('\n')[0]);

  sh(A, 'git', 'pull', '-q', '--rebase', 'origin', 'main');
  sh(B, 'git', 'pull', '-q', '--rebase', 'origin', 'main');
  const lockPath = path.join(A, 'docs', 'claims', '901.lock');
  const owner = fs.readFileSync(lockPath, 'utf8').trim().split(/\s+/)[1];
  ok(owner === 'sess-A' || owner === 'sess-B', 'C2 원격 lock 이 이긴 쪽 한 명의 것', owner);

  /* 진 쪽이 뒤늦게 다시 시도해도 못 덮는다 */
  const loserDir = owner === 'sess-A' ? B : A, loserSid = owner === 'sess-A' ? 'sess-B' : 'sess-A';
  const again = runClaim(loserDir, ['901', loserSid]);
  const after = fs.readFileSync(path.join(loserDir, 'docs', 'claims', '901.lock'), 'utf8').trim().split(/\s+/)[1];
  ok(again.code === 2 && after === owner, 'C3 살아 있는 lock 은 재시도해도 못 덮는다',
     '코드 ' + again.code + ' · lock 여전히 ' + after);

  /* ⓑ 90분 지난 죽은 lock 은 회수된다(90분 규칙이 «못 뺏는다» 로 굳어 버리면 안 된다) */
  const old = new Date(Date.now() - 200 * 60000).toISOString().replace(/\.\d+Z$/, 'Z');
  fs.writeFileSync(path.join(A, 'docs', 'claims', '902.lock'), old + ' sess-DEAD\n');
  sh(A, 'git', 'add', '-A'); sh(A, 'git', 'commit', '-q', '-m', 'claim(902): sess-DEAD');
  sh(A, 'git', 'push', '-q', 'origin', 'main');
  sh(B, 'git', 'pull', '-q', '--rebase', 'origin', 'main');
  const rec = runClaim(B, ['902', 'sess-B']);
  const recOwner = fs.readFileSync(path.join(B, 'docs', 'claims', '902.lock'), 'utf8').trim().split(/\s+/)[1];
  ok(rec.code === 0 && recOwner === 'sess-B', 'C4 90분 넘은 죽은 lock 은 회수된다',
     '코드 ' + rec.code + ' · ' + rec.out.split('\n')[0]);

  /* ⓒ 해제는 자기 것만 — 남의 lock 은 --release 로도 못 지운다 */
  const relOther = runClaim(A, ['--release', '902', 'sess-A']);
  ok(relOther.code === 2 && fs.existsSync(path.join(A, 'docs', 'claims', '902.lock')),
     'C5 남의 lock 은 --release 로도 안 지워진다', relOther.out.split('\n')[0]);
  const relMine = runClaim(B, ['--release', '902', 'sess-B']);
  ok(relMine.code === 0 && !fs.existsSync(path.join(B, 'docs', 'claims', '902.lock')),
     'C6 내 lock 해제는 삭제 + push 까지 간다', relMine.out.split('\n')[0]);
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

/* ─────────────────────────── [D] 문서 ─────────────────────────── */
const PRG = fs.readFileSync(path.join(ROOT, 'docs', 'PROGRESS.md'), 'utf8');
const rulesAt = PRG.indexOf('## 병렬 세션 규칙');
const rules = rulesAt >= 0 ? PRG.slice(rulesAt, PRG.indexOf('### 작업 단위', rulesAt)) : '';
ok(/tools\/claim\.js/.test(rules), 'D1 «병렬 세션 규칙» 이 claim.js 를 선점 절차로 지시한다',
   rulesAt >= 0 ? (/tools\/claim\.js/.test(rules) ? '있음' : '없음') : '절을 못 찾음');

console.log('\nVERIFY290 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
