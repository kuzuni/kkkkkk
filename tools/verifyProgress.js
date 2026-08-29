#!/usr/bin/env node
/* PROGRESS 완료행 되돌림 탐지 — 끝난 작업이 «미착수» 로 되살아나는 것을 잡는다 (작업 374)
 *
 *   node tools/verifyProgress.js                 작업 트리의 docs/PROGRESS.md 를 본다
 *   node tools/verifyProgress.js --rev <rev>     그 리비전의 PROGRESS 를 본다(§R 되돌림 시험용)
 *   node tools/verifyProgress.js --file <path>   파일 하나를 본다(합성 시험용)
 *   node tools/verifyProgress.js --quiet         빨간 항목만 찍는다
 *
 * 종료 코드: 0 = 되돌아간 행 없음 · 1 = 되돌아간 행 있음(내용은 stdout) · 2 = 도구 오류
 *
 * ── 왜 이 도구인가 ────────────────────────────────────────────────────────
 * 2026-08-29 23:47, 루틴 워커가 지시서 [-1] 대로 티어 순서로 «미완료 T1» 을 골랐더니
 * **369 가 잡혔는데 369 는 47분 전에 이미 끝나 있었다**(`16d96a4 done(369)`).
 * 제품·게이트·review·LESSONS 는 전부 멀쩡했고 잃은 것은 **PROGRESS 표의 두 줄뿐**이었다 —
 * `5fe9d37`(done(370))가 rebase 충돌을 «내 사본» 으로 풀면서 이웃 행 368·369 를
 * 등재 당시의 «미착수» 본문으로 되돌렸다. 그 표가 곧 다음 워커의 **작업 배정 입력**이라
 * 끝난 작업이 통째로 재선점됐다.
 *
 * 규칙 8(«PROGRESS 가 충돌하면 양쪽 행을 모두 살린다»)은 그때도 있었다.
 * claim.js(작업 290) 와 **같은 모양**이다 — 지키는 쪽이 더 번거로우면 규칙은 진다.
 * 그래서 규칙을 한 번 더 적는 대신 **되돌아간 순간 빨개지는 자**를 놓는다.
 *
 * ── 무엇을 재는가 (무르게 풀지 않기 위한 두 자) ──────────────────────────
 *   [정확 되돌림]    지금 행이 **그 done() 커밋 직전 판본과 바이트까지 같다** → 빨강.
 *                    병합을 «내 사본» 으로 푸는 사고는 정확히 이 모양을 남긴다(옛 판본의 사본).
 *   [완료 표지 회귀] `done(<ID>)` 커밋이 쓴 행에 완료 표지(✅ / «완료(»)가 있었는데
 *                    지금 행에는 없다  → 빨강. 행이 통째로 사라진 것도 여기서 잡는다.
 *   두 자는 이 순서로 댄다 — 앞뒤가 바뀌면 표지 자가 되돌림 자를 가려 **되돌림 자가 한 번도
 *   안 돈다**(실제로 첫 판이 그랬다: 368·369 를 «표지 없음» 으로만 부르고 병합 사고라는 이름을 못 붙였다).
 *
 * «✅ 가 있는가» 만 보는 자는 **완료 행이 더 낡은 완료 행으로 덮인 경우**를 놓친다(334 가 기각한
 * 처방 ②와 같은 모양) — 그래서 두 번째 자가 «그 done() 커밋이 쓴 본문» 을 기준으로 삼는다.
 * 반대로 **행이 자란 것은 정상**이다(뒤 세션이 정오표·이관을 덧붙인다) — 그래서 «같아야 한다» 가
 * 아니라 «옛 판본과 같으면 안 된다» 로 물었다. 완전 일치를 요구했으면 정상 편집마다 빨개진다.
 *
 * ── 못 보는 것을 «초록» 으로 부르지 않는다 ────────────────────────────────
 * 루틴 컨테이너의 클론은 **shallow** 다(2026-08-29 실측: 56 커밋 ≈ 3시간).
 * done() 커밋의 부모가 이력 경계 밖이면 [정확 되돌림] 을 **잴 수 없다** —
 * 그런 ID 는 조용히 넘기지 않고 «부분검사» 로 세어 요약에 찍는다.
 * 되돌림 사고는 몇 시간 안에 일어나므로 shallow 창으로도 실전 커버리지는 충분하다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'docs/PROGRESS.md';

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const gitQ = (...a) => { try { return git(...a); } catch (e) { return null; } };

/* ── 인자 ── */
const argv = process.argv.slice(2);
let rev = null, file = null, quiet = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--rev') rev = argv[++i];
  else if (argv[i] === '--file') file = argv[++i];
  else if (argv[i] === '--quiet') quiet = true;
  else { console.error('사용법: node tools/verifyProgress.js [--rev <rev>] [--file <path>] [--quiet]'); process.exit(2); }
}

/* ── 표 행 읽기 — «| <ID> |» 로 시작하는 줄 하나가 작업 단위 하나다 ── */
const ROW = /^\|\s*([0-9]+|[A-Z][0-9]+)\s*\|/;
function rowsOf(text) {
  const m = new Map();
  if (text == null) return m;
  for (const line of text.split('\n')) {
    const g = ROW.exec(line);
    if (g && !m.has(g[1])) m.set(g[1], line);   /* 중복 ID 는 첫 행을 쓴다(중복 자체는 규칙 1 의 몫) */
  }
  return m;
}
const DONE_MARK = /✅|완료\(/;

/* ── 검사 대상 상태 ── */
let curText, curLabel;
if (file) { curText = fs.readFileSync(path.resolve(file), 'utf8'); curLabel = file; }
else if (rev) { curText = gitQ('show', rev + ':' + REL); curLabel = rev; }
else { curText = fs.readFileSync(path.join(ROOT, REL), 'utf8'); curLabel = '작업 트리'; }
if (curText == null) { console.error('PROGRESS 를 읽지 못했다: ' + curLabel); process.exit(2); }
const cur = rowsOf(curText);

/* ── 이력에서 done(<ID>) 커밋을 찾는다 — ID 마다 «가장 최근» 것이 그 작업의 기록이다 ──
   --file 로 임의 파일을 볼 때도 이력 기준은 HEAD 다(합성 시험은 HEAD 내용을 손댄 사본이다). */
const histRev = rev || 'HEAD';
const log = gitQ('log', histRev, '--format=%H%x09%s', '--', REL);
if (log == null) { console.error('git log 실패 — 저장소 안에서 실행해라'); process.exit(2); }

const newestDone = new Map();                    /* ID → {sha, subj} (가장 최근 done 커밋) */
for (const line of log.split('\n')) {            /* git log 는 최신순이라 첫 등장이 가장 최근이다 */
  if (!line.trim()) continue;
  const [sha, ...rest] = line.split('\t');
  const subj = rest.join('\t');
  const g = /^done\(([0-9A-Z, ]+)\)/.exec(subj);
  if (!g) continue;
  for (const raw of g[1].split(',')) {           /* done(364,365,366) 처럼 묶음 커밋이 있다 */
    const id = raw.trim();
    if (id && !newestDone.has(id)) newestDone.set(id, { sha, subj });
  }
}

/* ── 판정 ── */
const cache = new Map();
const rowAt = (sha, id) => {
  if (!cache.has(sha)) cache.set(sha, rowsOf(gitQ('show', sha + ':' + REL)));
  return cache.get(sha).get(id) || null;
};

const bad = [];        /* 되돌아간 행 */
const partial = [];    /* 이력 경계로 [정확 되돌림] 을 못 잰 ID */
const noRow = [];      /* done() 커밋이 그 행을 안 건드렸다 — 셈이 맞아야 «조용한 누락» 이 안 생긴다 */
const okIds = [];

for (const [id, { sha, subj }] of [...newestDone.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))) {
  const done = rowAt(sha, id);
  if (done == null) { noRow.push(id); continue; }   /* done 커밋이 그 행을 안 건드렸다(문서만 고친 커밋) */
  const now = cur.get(id) || null;

  if (now == null) {
    bad.push({ id, sha, why: '행이 통째로 사라졌다', detail: 'done ' + sha.slice(0, 7) });
    continue;
  }
  /* 두 자는 «구체적인 것부터» 댄다 — 정확 되돌림이면 병합 사고라고 이름까지 붙일 수 있고,
     아니면서 완료 표지만 없으면 손으로 고쳐 쓰다 잃은 것이다. 순서가 바뀌면 앞의 자가
     뒤의 자를 가려 **뒤의 자가 한 번도 안 돌게 된다**(게이트가 자기 항을 못 지키는 모양). */
  const prev = rowAt(sha + '^', id);             /* shallow 경계면 null */
  if (prev != null && now === prev && now !== done) {
    bad.push({ id, sha, why: '정확 되돌림', detail: '지금 행이 done ' + sha.slice(0, 7) + ' **직전** 판본과 바이트까지 같다(' + done.length + ' → ' + now.length + '자) = 병합을 «내 사본» 으로 푼 모양' });
    continue;
  }
  if (DONE_MARK.test(done) && !DONE_MARK.test(now)) {
    bad.push({ id, sha, why: '완료 표지가 사라졌다', detail: 'done ' + sha.slice(0, 7) + ' 은 완료로 적었는데 지금 행에는 ✅·«완료(» 가 없다' });
    continue;
  }
  if (prev == null) { partial.push(id); continue; }
  okIds.push(id);
}

/* ── 출력 ── */
if (!quiet) {
  console.log('PROGRESS 되돌림 검사 — ' + curLabel + ' · done() 기록 ' + newestDone.size + '건');
  console.log('  검사 완료 ' + okIds.length + '건 · 부분검사 ' + partial.length + '건(이력 경계로 직전 판본 없음' +
              (partial.length ? ': ' + partial.join(' ') : '') + ')' +
              ' · 행 무변경 ' + noRow.length + '건 · 빨강 ' + bad.length + '건');
  /* 넷의 합 = done() 기록 수. 셈이 안 맞으면 어딘가를 조용히 건너뛴 것이다. */
  console.log('  셈 ' + (okIds.length + partial.length + noRow.length + bad.length) + '/' + newestDone.size +
              (okIds.length + partial.length + noRow.length + bad.length === newestDone.size ? ' 맞음' : ' ⚠ 안 맞음 — 조용히 건너뛴 ID 가 있다'));
}
for (const b of bad) console.log('  ✗ ' + b.id + ' — ' + b.why + ' · ' + b.detail);

if (bad.length) {
  console.log('\nPROGRESS REVERTED ' + bad.length + '건 — ' + bad.map(b => b.id).join(' '));
  console.log('  고치는 법: 그 `done(<ID>)` 커밋의 행을 그대로 되살린다.');
  console.log('    git show <done커밋>:' + REL + " | grep '^| <ID> |'");
  console.log('  ⚠ 되살리기 전에 «done 이후 그 행에 정당한 편집이 있었는가» 를 확인해라 —');
  console.log('    있었으면 그것까지 살린다(규칙 8 «양쪽 행을 모두 살린다» 그대로).');
  process.exit(1);
}
if (!quiet) console.log('\nPROGRESS OK — 되돌아간 완료행 없음');
process.exit(0);
