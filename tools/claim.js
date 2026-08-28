#!/usr/bin/env node
/* 작업 단위 선점 — ROUTINE.md [-1] 을 **손이 아니라 코드로** 지킨다 (작업 290)
 *
 *   node tools/claim.js <ID> <SID>              선점(또는 90분 죽은 lock 회수)
 *   node tools/claim.js --beat    <ID> <SID>    heartbeat — lock 시각만 현재 UTC 로(커밋은 호출자가)
 *   node tools/claim.js --release <ID> <SID>    해제 — lock 삭제 + 커밋 + push
 *   node tools/claim.js --check   <ID> <SID>    판정만(파일·커밋 없음). 종료 코드로 답한다
 *
 * 종료 코드: 0 = 내 것이 됐다 · 2 = 남이 잡았다(포기하고 다음 작업으로) · 1 = 오류
 *
 * ── 왜 도구가 필요한가 ────────────────────────────────────────────────────
 * ROUTINE [-1] 4 는 «rebase 가 `docs/claims/<ID>.lock` 에서 충돌하면 선점 경쟁에서 진 것이니
 * `git rebase --abort` 후 `git reset --hard origin/main` 으로 내 클레임을 버려라» 고 못박는다.
 * 그런데 충돌을 만난 세션에게 «내 쪽으로 풀기» 는 한 줄이면 되고 «버리기» 는 두 줄이라,
 * 2026-08-28 02:41 에 실제로 남의 92초 된 lock 이 덮였다 —
 *     -2026-08-28T02:39:36Z sess-0238-29441
 *     +2026-08-28T02:41:08Z sess-0239-24664
 * 두 세션이 같은 작업(289)을 통째로 두 번 했다. 워커가 4 → 8 로 늘어(2026-08-28 증편)
 * «둘이 동시에 같은 빈 자리를 본다» 는 창이 그만큼 자주 열린다.
 * 규칙이 있는데 안 지켜지는 게 아니라, **지키는 쪽이 더 번거로우면 규칙은 진다.**
 * 그래서 이 스크립트가 경쟁 패배를 **자동으로** 처리한다 — 덮어쓸 방법 자체를 없앴다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEAD_MIN = 90;                     /* 죽은 lock 판정(2026-08-26 주인 결정으로 50 → 90 복귀) */

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const gitQ = (...a) => { try { return git(...a); } catch (e) { return null; } };

const say = m => console.log(m);
const die = (code, m) => { console.log(m); process.exit(code); };

/* ── 인자 ── */
const argv = process.argv.slice(2);
const mode = argv[0] && argv[0].startsWith('--') ? argv.shift().slice(2) : 'claim';
const [ID, SID] = argv;
if (!ID || !SID || !['claim', 'beat', 'release', 'check'].includes(mode)) {
  console.error('사용법: node tools/claim.js [--beat|--release|--check] <ID> <SID>');
  process.exit(1);
}
const REL = 'docs/claims/' + ID + '.lock';
const LOCK = path.join(ROOT, REL);
const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const write = () => {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  fs.writeFileSync(LOCK, now() + ' ' + SID + '\n');
};

/* ── lock 읽기 ── */
function readLock() {
  if (!fs.existsSync(LOCK)) return null;
  const m = fs.readFileSync(LOCK, 'utf8').trim().match(/^(\S+)\s+(\S+)/);
  return m ? { at: m[1], sid: m[2] } : null;
}
const minsSince = iso => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (Date.now() - t) / 60000 : Infinity;
};

/* ── 죽음 판정 — lock 시각 **과** 마지막 wip(<ID>) 커밋이 **둘 다** 90분 넘어야 죽은 것이다.
      (lock 갱신을 빼먹었지만 커밋은 계속 올리는 세션은 살아 있다 — ROUTINE [-1] 2) */
function lastWipMin() {
  const at = gitQ('log', '-1', '--format=%aI', '--grep', 'wip(' + ID + ')', 'origin/main');
  return at ? minsSince(at) : Infinity;
}

/* ── 상태 판정 ── */
function judge() {
  const L = readLock();
  if (!L) return { verdict: 'free', why: 'lock 없음' };
  if (L.sid === SID) return { verdict: 'mine', why: '이미 내 것(' + L.at + ')' };
  const lockMin = minsSince(L.at), wipMin = lastWipMin();
  if (lockMin <= DEAD_MIN)
    return { verdict: 'taken', why: '남이 잡았다 — ' + L.sid + ' · lock ' + Math.round(lockMin) + '분 전(살아 있음)' };
  if (wipMin <= DEAD_MIN)
    return { verdict: 'taken', why: '남이 잡았다 — ' + L.sid + ' · lock 은 ' + Math.round(lockMin)
             + '분 됐지만 마지막 wip(' + ID + ') 이 ' + Math.round(wipMin) + '분 전(살아 있음)' };
  return { verdict: 'dead', why: '죽은 lock 회수 — ' + L.sid + ' · lock ' + Math.round(lockMin)
           + '분 · 마지막 wip ' + (wipMin === Infinity ? '없음' : Math.round(wipMin) + '분') };
}

/* ── 경쟁 패배 정리 — 내 클레임만 버린다. 남의 lock 은 손대지 않는다 ── */
function surrender(why) {
  gitQ('rebase', '--abort');
  gitQ('reset', '--hard', 'origin/main');
  die(2, '포기 ' + ID + ' — ' + why + '\n→ 다음 미선점 작업으로 간다(ROUTINE [-1] 4).');
}

/* ── 본체 ── */
gitQ('fetch', 'origin', 'main');
if (mode !== 'check' && gitQ('pull', '--rebase', 'origin', 'main') === null) {
  gitQ('rebase', '--abort');
  die(1, '오류 — git pull --rebase 실패. 손으로 정리한 뒤 다시 실행할 것.');
}

if (mode === 'check') {
  const j = judge();
  say(j.verdict.toUpperCase() + ' ' + ID + ' — ' + j.why);
  process.exit(j.verdict === 'taken' ? 2 : 0);
}

if (mode === 'beat') {
  const L = readLock();
  if (!L) die(1, '오류 — ' + REL + ' 이 없다. 선점부터 할 것.');
  if (L.sid !== SID) die(2, '포기 ' + ID + ' — lock 이 ' + L.sid + ' 의 것이다(내 SID 아님).');
  write();
  say('heartbeat ' + ID + ' → ' + now() + ' (커밋은 회차 커밋에 같이 담을 것)');
  process.exit(0);
}

if (mode === 'release') {
  const L = readLock();
  if (!L) { say('이미 해제됨 ' + ID); process.exit(0); }
  if (L.sid !== SID) die(2, '중단 ' + ID + ' — lock 이 ' + L.sid + ' 의 것이라 건드리지 않는다.');
  fs.unlinkSync(LOCK);
  git('add', '--', REL);
  git('commit', '-q', '-m', 'unclaim(' + ID + '): lock 해제 — ' + SID);
} else {
  const j = judge();
  if (j.verdict === 'taken') die(2, '포기 ' + ID + ' — ' + j.why + '\n→ 다음 미선점 작업으로 간다.');
  if (j.verdict === 'mine') { say('이미 내 것 ' + ID + ' — ' + j.why); process.exit(0); }
  say((j.verdict === 'dead' ? '회수 ' : '선점 ') + ID + ' — ' + j.why);
  write();
  git('add', '--', REL);
  git('commit', '-q', '-m', (j.verdict === 'dead' ? 'reclaim(' : 'claim(') + ID + '): ' + SID);
}

/* ── push. 거부되면 rebase → **lock 충돌은 곧 경쟁 패배**다(여기가 이 도구의 존재 이유) ── */
for (let try_ = 1; try_ <= 4; try_++) {
  if (gitQ('push', 'origin', 'main') !== null) {
    const L = readLock();
    /* rebase 가 깨끗이 끝났어도 내용이 내 SID 가 아니면 남이 잡은 것이다(ROUTINE [-1] 4) */
    if (mode !== 'release' && (!L || L.sid !== SID)) surrender('rebase 후 lock 이 내 SID 가 아니다');
    say((mode === 'release' ? '해제 완료 ' : '선점 완료 ') + ID + ' · ' + SID);
    process.exit(0);
  }
  gitQ('fetch', 'origin', 'main');
  if (gitQ('pull', '--rebase', 'origin', 'main') === null) {
    /* 충돌이 내 lock 파일에서 났는가 — 그렇다면 남이 먼저 push 한 것이다 */
    const conflicted = (gitQ('diff', '--name-only', '--diff-filter=U') || '');
    if (conflicted.split('\n').includes(REL)) surrender('rebase 가 ' + REL + ' 에서 충돌 = 남이 먼저 push 했다');
    gitQ('rebase', '--abort');
    die(1, '오류 — ' + REL + ' 이 아닌 곳에서 rebase 충돌([' + conflicted.replace(/\n/g, ', ') + ']). 손으로 병합할 것.');
  }
  const L2 = readLock();
  if (mode !== 'release' && (!L2 || L2.sid !== SID)) surrender('rebase 후 lock 이 ' + (L2 ? L2.sid : '없음') + ' 이다');
}
die(1, '오류 — push 4회 재시도 실패(네트워크).');
