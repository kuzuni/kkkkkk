#!/usr/bin/env node
/* 312 음성 검사 — «고친 게이트에 회귀를 주입해 본다» (LESSONS «4. 고친 게이트에는 회귀를 주입하라»)
 *
 *   node tools/probe312.js
 *
 * 312 는 verify290 [B] 의 예외를 «커밋 해시» 에서 «사건 내용(지문)» 으로 바꿨다.
 * 넓힌 만큼 **무엇을 아직 잡는지**를 진짜 git 저장소를 세워 직접 먹여 본다.
 * 여기서 재는 것은 `tools/lockviol.js` — verify290 [B] 가 그대로 쓰는 바로 그 코드다.
 *
 *   N1 새 위반은 예외가 있어도 잡힌다            (B1 민감도 — 넓히지 않았다)
 *   N2 같은 lock 이라도 SID 짝이 다르면 안 봐준다 (B1 민감도)
 *   N3 등재된 사건은 봐준다                      (B1 예외가 산다)
 *   N4 ★ 이력이 재작성돼 해시가 바뀌어도 예외가 산다 (312 가 고친 것)
 *   N5 사건이 통째로 지워지면 «소멸» — 빨간불 아님  (312 가 고친 것)
 *   N6 등재 커밋이 아직 닿는데 못 찾으면 «부패» — 빨간불 (B2 존재 이유가 남아 있다)
 *   N7 90분 넘은 회수는 위반이 아니다
 *   N8 되돌리기(과거 시각)는 위반이 아니다
 *   N9 자기 heartbeat 는 위반이 아니다
 *   N10 파일 생성은 위반이 아니다 — 여러 파일이 한 커밋에 섞여도 진짜 위반만 센다
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fp, scan, classify } = require(path.join(__dirname, 'lockviol.js'));

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe312-'));
const sh = (cwd, ...a) => execFileSync(a[0], a.slice(1), { cwd, encoding: 'utf8', stdio: 'pipe' });
const T = m => new Date(Date.parse('2026-08-28T02:00:00Z') + m * 60000).toISOString().replace(/\.\d+Z$/, 'Z');

let n = 0;
/* steps: [{msg, files:{id: '<시각> <SID>' | null(삭제)}}] — 커밋마다 origin/main 을 따라 올린다 */
function mkrepo(steps) {
  const d = path.join(TMP, 'r' + (++n));
  fs.mkdirSync(path.join(d, 'docs', 'claims'), { recursive: true });
  sh(d, 'git', 'init', '-q', '-b', 'main');
  sh(d, 'git', 'config', 'user.email', 'probe312@test');
  sh(d, 'git', 'config', 'user.name', 'probe312');
  fs.writeFileSync(path.join(d, 'docs', 'claims', 'README.md'), '선점 lock 자리\n');
  sh(d, 'git', 'add', '-A'); sh(d, 'git', 'commit', '-q', '-m', 'seed');
  sh(d, 'git', 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  const hashes = [];
  for (const s of steps) {
    for (const [id, line] of Object.entries(s.files)) {
      const f = path.join(d, 'docs', 'claims', id + '.lock');
      if (line === null) fs.rmSync(f, { force: true });
      else fs.writeFileSync(f, line + '\n');
    }
    sh(d, 'git', 'add', '-A'); sh(d, 'git', 'commit', '-q', '-m', s.msg);
    hashes.push(sh(d, 'git', 'rev-parse', 'HEAD').trim());
    sh(d, 'git', 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  }
  return { dir: d, hashes, seed: sh(d, 'git', 'rev-list', '--max-parents=0', 'HEAD').trim() };
}
const look = d => scan(d, { ref: 'origin/main', limit: 400 });
/* verify290 [B1]/[B2] 가 하는 판정을 그대로 재현한다 */
const b1 = (r, known) => { const e = new Set(known.map(fp)); return r.violations.filter(v => !e.has(fp(v))); };
const b2 = (d, known, r) => classify(d, known, r.violations, { ref: 'origin/main' });

try {
  /* ── 위반 1건이 있는 저장소: 900.lock 을 sess-X → sess-Y 가 2분 만에 덮었다 ── */
  const V = { files: { 900: T(2) + ' sess-Y' }, msg: 'claim(900): sess-Y' };
  const base = [{ files: { 900: T(0) + ' sess-X' }, msg: 'claim(900): sess-X' }, V];
  const R = mkrepo(base);
  const rv = look(R.dir);
  const theViol = rv.violations.find(v => v.lock === 'docs/claims/900.lock');
  ok(!!theViol && rv.violations.length === 1, 'N0 덮어쓰기 1건을 찾는다(대조군)',
     rv.violations.map(v => v.lock + ' ' + v.from + '→' + v.to + ' ' + v.gap + '분').join(' | ') || '못 찾음');

  /* N1 — 다른 사건이 예외로 등재돼 있어도 새 위반은 그대로 빨갛다 */
  const other = [{ lock: 'docs/claims/111.lock', from: 'sess-P', to: 'sess-Q', commit: R.seed, why: '남의 사건' }];
  ok(b1(rv, other).length === 1, 'N1 새 위반은 예외가 있어도 잡힌다(B1 민감도)',
     b1(rv, other).length + '건');

  /* N2 — 같은 lock 파일이라도 SID 짝이 다르면 예외가 안 먹는다 */
  const nearMiss = [{ lock: 'docs/claims/900.lock', from: 'sess-X', to: 'sess-Z', commit: R.seed, why: '짝이 다르다' }];
  ok(b1(rv, nearMiss).length === 1, 'N2 같은 lock 이라도 SID 짝이 다르면 안 봐준다(B1 민감도)',
     b1(rv, nearMiss).length + '건');

  /* N3 — 등재된 사건은 봐준다 */
  const known = [{ lock: 'docs/claims/900.lock', from: 'sess-X', to: 'sess-Y',
                   commit: R.hashes[1], why: '등재 사건' }];
  ok(b1(rv, known).length === 0, 'N3 등재된 사건은 봐준다(B1 예외가 산다)', b1(rv, known).length + '건');
  ok(b2(R.dir, known, rv)[0].state === 'matched', 'N4a 등재 사건은 B2 에서 matched',
     b2(R.dir, known, rv)[0].state);

  /* ── N4 ★ 이력 재작성: 내용은 같고 해시만 바뀐 저장소 ── */
  const R2 = mkrepo([{ files: { 999: T(-30) + ' sess-PRE' }, msg: 'claim(999): 이력 재작성 표시' }].concat(base));
  const rv2 = look(R2.dir);
  const staleHash = known[0].commit;                      /* R2 에는 존재하지 않는 옛 해시 */
  let exists = true;
  try { sh(R2.dir, 'git', 'cat-file', '-t', staleHash); } catch (e) { exists = false; }
  const c4 = b2(R2.dir, known, rv2)[0];
  ok(!exists && c4.state === 'matched',
     'N4 ★ 이력이 재작성돼 해시가 죽어도 예외가 산다(312 가 고친 것)',
     '옛 해시 존재=' + exists + ' · 상태=' + c4.state);
  ok(b1(rv2, known).length === 0, 'N4b 재작성 뒤에도 B1 은 그 사건을 계속 봐준다', b1(rv2, known).length + '건');

  /* ── N5 사건이 통째로 지워졌다: 위반 없는 저장소 + 죽은 해시 예외 ── */
  const R3 = mkrepo([{ files: { 900: T(0) + ' sess-X' }, msg: 'claim(900): sess-X' }]);
  const rv3 = look(R3.dir);
  const c5 = b2(R3.dir, known, rv3)[0];
  ok(rv3.violations.length === 0 && c5.state === 'erased',
     'N5 사건이 통째로 지워지면 «소멸» — 빨간불이 아니다(312 가 고친 것)',
     '위반 ' + rv3.violations.length + '건 · 상태=' + c5.state);
  ok(b1(rv3, known).length === 0, 'N5b 죽은 예외는 아무것도 안 봐준다(가릴 것 자체가 없다)',
     '남은 위반 ' + b1(rv3, known).length + '건');

  /* ── N6 등재 커밋이 아직 닿는데 스캔이 못 찾았다 = 부패. B2 의 존재 이유는 살아 있어야 한다 ── */
  const rottenKnown = [{ lock: 'docs/claims/900.lock', from: 'sess-X', to: 'sess-Y',
                         commit: R3.seed, why: '살아 있는 커밋을 가리키는데 사건은 안 보인다' }];
  const c6 = b2(R3.dir, rottenKnown, rv3)[0];
  ok(c6.state === 'rotten', 'N6 등재 커밋이 아직 닿는데 못 찾으면 «부패» — 빨간불(B2 존재 이유)',
     '상태=' + c6.state);

  /* ── N7 90분 넘은 회수 · N8 되돌리기 · N9 heartbeat — 전부 위반이 아니다 ── */
  const R7 = mkrepo([
    { files: { 910: T(0) + ' sess-A' }, msg: 'claim(910): sess-A' },
    { files: { 910: T(200) + ' sess-B' }, msg: 'claim(910): 죽은 lock 회수' },      /* 200분 */
  ]);
  ok(look(R7.dir).violations.length === 0, 'N7 90분 넘은 회수는 위반이 아니다',
     look(R7.dir).violations.length + '건');

  const R8 = mkrepo([
    { files: { 911: T(0) + ' sess-A' }, msg: 'claim(911): sess-A' },
    { files: { 911: T(3) + ' sess-B' }, msg: 'claim(911): sess-B 가 덮었다' },
    { files: { 911: T(0) + ' sess-A' }, msg: 'revert(911): 스스로 되돌림' },
  ]);
  const r8 = look(R8.dir);
  ok(r8.violations.length === 1 && r8.violations[0].to === 'sess-B',
     'N8 되돌리기(과거 시각)는 위반이 아니다 — 덮은 커밋 1건만 센다',
     r8.violations.map(v => v.from + '→' + v.to).join(' | ') || '0건');

  const R9 = mkrepo([
    { files: { 912: T(0) + ' sess-A' }, msg: 'claim(912): sess-A' },
    { files: { 912: T(30) + ' sess-A' }, msg: 'wip(912): heartbeat' },
  ]);
  ok(look(R9.dir).violations.length === 0, 'N9 자기 heartbeat 는 위반이 아니다',
     look(R9.dir).violations.length + '건');

  /* ── N10 한 커밋에 «생성» 과 «진짜 덮어쓰기» 가 섞여 있어도 진짜 것만 센다 ──
     `--- /dev/null` · `--- a/…` 헤더를 «-줄» 로 읽으면 생성이 덮어쓰기 모양이 된다. */
  const R10 = mkrepo([
    { files: { 920: T(0) + ' sess-A' }, msg: 'claim(920): sess-A' },
    { files: { 913: T(1) + ' sess-N', 920: T(4) + ' sess-B', 914: T(1) + ' sess-M' },
      msg: '생성 2개 + 덮어쓰기 1개' },
  ]);
  const r10 = look(R10.dir);
  ok(r10.violations.length === 1 && r10.violations[0].lock === 'docs/claims/920.lock',
     'N10 생성은 위반이 아니다 — 섞여 있어도 진짜 덮어쓰기 1건만 센다',
     r10.violations.map(v => v.lock + ' ' + v.from + '→' + v.to).join(' | ') || '0건');
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

console.log('\nPROBE312 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
