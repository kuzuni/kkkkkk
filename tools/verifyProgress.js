#!/usr/bin/env node
/* PROGRESS 완료행 부패 탐지 — 끝난 작업이 표에서 «미착수» 로 읽히는 것을 잡는다 (작업 374 · 388)
 *
 * 자가 둘이다. **뿌리가 다르고, 하나가 다른 하나를 대신하지 못한다.**
 *   §1 되돌림  (374) — 완료행이 **병합으로** 등재문으로 되돌아간다. 이력(그 done 커밋)과 대조한다.
 *   §2 자기모순(388) — **되돌림이 아니다.** `done(<ID>)` 커밋 **자신**이 완료문을 비고 칸
 *                      «끝에만» 덧붙이고 구현 칸·루프 횟수·비고 머리말을 등재 상태로 남긴다.
 *                      이력과는 아무 차이가 없으므로 §1 은 **영원히 초록**이다 — 표 자체를 봐야 한다.
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
 * ⚠ **shallow 창은 실행마다 다르다**(388 실측: 같은 트리에서 첫 실행 `done() 기록 7건`,
 * `git fetch --deepen=200` 뒤 **36건** — **둘 다 «PROGRESS OK»** 였다). 그래서 §1 의 커버리지를
 * «충분하다» 고 부르지 않고, shallow 면 요약에 **⚠ 한 줄로 창 크기를 찍는다**(§2 는 표만 보므로 영향 없다).
 *
 * ── §2 는 왜 칸을 «위치» 로 세지 않는가 ───────────────────────────────────
 * 이 표는 칸을 `|` 로 나누지만 본문 안에도 `|` 가 있다(코드 스팬 · 산문의 «ⓐ | ⓑ» · `\|`).
 * 실측 389 행 중 7칸은 268 행뿐이라 **`cols[3]` 같은 위치 인덱스는 못 쓴다**(174·319·336~344 행은
 * 구현 칸이 통째로 밀린다). 그래서 위치가 아니라 **모양**으로 앵커한다 —
 * `| <구현 –> | <점수 –> | <횟수> | **<미착수|등재만|착수 전>`. 재현·음성항은 `tools/probe388.js`.
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

/* ── §2 자기모순 자 (작업 388) ──────────────────────────────────────────────
 * DONE_DATED — «했다» 표지 = «완료·해결·통과·폐기 + **날짜**». 날짜를 요구하는 것이 이 자의 절반이다:
 *              산문은 그 낱말을 인용만 하고 날짜를 안 붙인다(388 자신의 등재문이 처방을 인용해
 *              첫 판에서 자기 자신을 빨갛게 만들었다). ⏸(보류)·🔧(진행 중)은 **일부러 뺐다** —
 *              그 둘은 «아직 안 끝났다» 라 비고가 «미착수» 여도 모순이 아니다(199·351·72 가 그 자리다).
 * NOT_YET    — «안 했다» 를 **비고 칸의 머리말에서만** 읽는 모양 앵커(위 주석 참조).
 *
 * ⚠ **관행이 자를 앞질러 간 자리를 두 곳 넓혔다(작업 422, 2026-08-29).** 넓히기 전에는
 *   이 자가 «진짜 미착수» 로 읽는 행이 표에 **0건**이었다 — §2 가 볼 자리가 통째로 비어 있었다는 뜻이다.
 *     ⓐ 비고 머리말 앞의 **«←(등재문)» 표지** — 지금 등재문은 예외 없이 `**←(등재문) 미착수 · …`
 *        로 연다(409·415·416·419~424 아홉 행). 낱말 앞에 표지가 끼자 머리말 앵커가 통째로 빗나갔다.
 *     ⓑ 구현 칸에 «–» 대신 **«미착수.» 라고 적는 관행** — 주인 지시 등재분이 그 꼴이다(425~430 여섯 행).
 *        «–» 든 «미착수.» 든 그 칸이 하는 말은 «안 했다» 로 같다.
 *   ⚠ **넓힌 것은 «안 했다» 를 읽는 두 자리뿐이고 «했다»(DONE_DATED)·완료행 제외는 한 칸도 안 건드렸다** —
 *     넓힌 뒤에도 실물 표에서 빨간 행은 0건이고(회귀), 완료행이 «미착수» 를 산문으로 인용하는 자리
 *     21건은 그대로 조용하다. 되돌림 시험은 `tools/verify388.js` §R·§R2 가 두 관행 **각각**으로 건다. */
const DONE_DATED = /(?:완료|해결|통과|폐기)\s*\(\s*20\d\d-\d\d-\d\d/;
const NOT_YET = /\|\s*(?:–|—|-|미착수\.?|)\s*\|\s*(?:–|—|-|)\s*\|[^|]*\|\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전)/;

/* ── 남은 반쪽 (작업 445, 2026-08-30) ────────────────────────────────────────
 * `NOT_YET` 은 «안 했다» 를 **구현 칸에서 먼저** 읽는다(`| – | – | n/5 | **미착수`).
 * 그래서 **구현 칸은 `✅ 완료(…)` 로 제대로 채웠는데 비고 머리말만 등재 당시 그대로인 행**은
 * 한 건도 안 세진다 — 388 이 세운 «세 칸을 같이 고쳐라» 중 ③ 만 빠뜨린 꼴이고, 실물 표에
 * **5건**(310·337·353·382·383)이 그 상태로 있었다.
 * ⚠ **이건 이론이 아니라 관측된 피해다** — 2026-08-30 워커 H(sess-0751-1923)가 티어 스캔에서
 *   383 을 «←(등재문) 미착수 · T4» 로 읽고 **선점했고**, `verify383` 42/42 PASS 로 이미 끝난
 *   작업임을 확인한 뒤 회차를 놓았다(388 머리말이 적은 371 사고와 같은 꼴).
 *
 * ⇒ 머리말 축을 **단독 축**으로 세운다: «비고 칸의 머리말이 미착수인가» 만 묻고 구현 칸은 안 본다.
 *   비고 칸은 위치로 못 세므로(본문 안의 `|` — 이 파일 머리말 «§2 는 왜 칸을 «위치» 로 세지 않는가»)
 *   **마지막 비어 있지 않은 칸**으로 잡는다. 그 칸이 곧 워커의 티어 스캔이 읽는 칸이고
 *   (`awk -F'|' '{print $(NF-1)}'`), 표를 넘쳐 GitHub 이 **렌더에서 버리는** 칸도 여기서 걸린다
 *   (337·382 가 그 꼴이었다 — 등재문이 8번째 칸으로 밀려 화면에서 통째로 사라져 있었다).
 * ⚠ 두 축은 **겹친다**(옛 관행 행은 둘 다 맞는다) — 겹치면 구체적인 쪽(`impl`)을 댄다.
 *   순서가 바뀌면 tail 축이 impl 축을 가려 «구현 칸이 비었다» 는 진단을 영영 못 낸다(§1 의 두 자와 같은 이유). */
const HEAD_NOT_YET = /^\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전)/;
function tailHead(line) {
  const c = line.split('|');
  let i = c.length - 1;
  while (i > 0 && !c[i].trim()) i--;      /* 표 행은 `|` 로 끝나므로 마지막 칸은 비어 있다 */
  return i > 0 ? HEAD_NOT_YET.exec(c[i]) : null;
}

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

/* ── §2 자기모순 판정 — 이력이 아니라 «지금 표» 만 본다 ── */
const contra = [];
for (const [id, line] of cur) {
  const d = DONE_DATED.exec(line);
  if (!d) continue;                                /* 진짜 미착수 — 자가 건드리면 안 되는 자리 */
  const y = NOT_YET.exec(line);                    /* 축 ⓐ 구현 칸까지 등재 상태 (388) */
  if (y) { contra.push({ id, head: y[1], mark: d[0], kind: 'impl' }); continue; }
  const t = tailHead(line);                        /* 축 ⓑ 구현 칸은 채웠는데 머리말만 등재 상태 (445) */
  if (t) contra.push({ id, head: t[1], mark: d[0], kind: 'tail' });
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
  /* 못 보는 것을 초록으로 부르지 않는다 — shallow 면 §1 의 창 크기를 밝힌다(작업 388). */
  if (fs.existsSync(path.join(ROOT, '.git', 'shallow'))) {
    console.log('  ⚠ 얕은 클론(.git/shallow) — §1 이 볼 수 있는 이력은 done() ' + newestDone.size +
                '건뿐이다. 경계 밖의 되돌림은 안 세진다.');
    console.log('    창을 넓히려면: git fetch --deepen=200 origin main  (§2 자기모순은 표만 보므로 영향 없다)');
  }
  console.log('  §2 자기모순 검사 — 표 행 ' + cur.size + '건 · 빨강 ' + contra.length + '건');
}
for (const b of bad) console.log('  ✗ ' + b.id + ' — ' + b.why + ' · ' + b.detail);
for (const c of contra) console.log('  ✗ ' + c.id + ' — 자기모순 · ' +
  (c.kind === 'impl'
    ? '구현 칸이 «–» 이고 비고가 «' + c.head + '» 로 여는데 같은 행에 완료 표지 «' + c.mark + '» 가 있다'
    : '구현 칸은 채웠는데 **비고 머리말**이 «' + c.head + '» 로 여는데 같은 행에 완료 표지 «' + c.mark +
      '» 가 있다 (세 칸 중 ③ 만 안 고친 꼴 — 티어 스캔이 읽는 칸이 그 칸이다)'));

if (contra.length) {
  console.log('\nPROGRESS SELF-CONTRADICTION ' + contra.length + '건 — ' + contra.map(c => c.id).join(' '));
  console.log('  뜻: 그 작업은 끝났는데 표는 «미완료» 로 보여 준다 = 다음 워커의 티어 스캔이 재선점한다.');
  console.log('    (371 이 실제로 그랬다 — sess-0400-28780 이 선점했다가 회차 0 소모로 놓았다.)');
  console.log('  고치는 법: 완료문을 비고 «끝에만» 붙이지 말고 **세 칸을 같이** 갱신한다 —');
  console.log('    ① 구현 칸 «–» → «✅ 완료(날짜, 세션 · n회차) — 한 줄 요약»');
  console.log('    ② 루프 횟수 «0/5» → 실제 회차');
  console.log('    ③ 비고 머리말 «미착수/등재만» → 등재문임을 밝히는 말로(등재문 본문은 지우지 마라)');
  if (contra.some(c => c.kind === 'tail')) {
    console.log('  ⚑ «구현 칸은 채웠는데 머리말만» 인 행이 있다(445) — 고칠 곳은 ③ 한 칸이다.');
    console.log('    비고를 «✅ 완료(…) … **↓ 아래는 등재문(보존).** <옛 본문>» 으로 열어라.');
    console.log('    ⚠ 비고 안에 **escape 안 한 `|`** 가 있으면 그 뒤가 8번째 칸이 되어 GitHub 렌더에서');
    console.log('      통째로 사라지고, 티어 스캔은 그 칸을 비고로 읽는다(337·382 가 그 꼴이었다).');
  }
}

if (bad.length) {
  console.log('\nPROGRESS REVERTED ' + bad.length + '건 — ' + bad.map(b => b.id).join(' '));
  console.log('  고치는 법: 그 `done(<ID>)` 커밋의 행을 그대로 되살린다.');
  console.log('    git show <done커밋>:' + REL + " | grep '^| <ID> |'");
  console.log('  ⚠ 되살리기 전에 «done 이후 그 행에 정당한 편집이 있었는가» 를 확인해라 —');
  console.log('    있었으면 그것까지 살린다(규칙 8 «양쪽 행을 모두 살린다» 그대로).');
  process.exit(1);
}
if (contra.length) process.exit(1);
if (!quiet) console.log('\nPROGRESS OK — 되돌아간 완료행 없음 · 자기모순 행 없음');
process.exit(0);
