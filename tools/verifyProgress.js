#!/usr/bin/env node
/* PROGRESS 완료행 부패 탐지 — 끝난 작업이 표에서 «미착수» 로 읽히는 것을 잡는다 (작업 374 · 388 · 557 · 571 · 733)
 *
 * 자가 다섯이다. **뿌리가 다르고, 하나가 다른 하나를 대신하지 못한다.**
 *   §1 되돌림  (374) — 완료행이 **병합으로** 등재문으로 되돌아간다. 이력(그 done 커밋)과 대조한다.
 *   §2 자기모순(388) — **되돌림이 아니다.** `done(<ID>)` 커밋 **자신**이 완료문을 비고 칸
 *                      «끝에만» 덧붙이고 구현 칸·루프 횟수·비고 머리말을 등재 상태로 남긴다.
 *                      이력과는 아무 차이가 없으므로 §1 은 **영원히 초록**이다 — 표 자체를 봐야 한다.
 *   §3 마감 누락(557) — **모순도 아니다.** 세션이 제품·자·review 를 전부 push 하고 표를 **아예 안 건드린다**.
 *                      행은 «일관되게 미착수» 라 §2 가 볼 모순이 없고, done() 커밋이 얕은 클론
 *                      경계 밖이면 §1 도 못 본다 — 표가 아니라 **표 ↔ 저장소 자산**을 대조해야 한다.
 *   §4 병합 표시 (571) — 표가 «무엇을 말하는가» 보다 앞선다. `claim.js` 의 autostash pop 이 충돌하면
 *                      작업 트리에 병합 표시가 남는데 pull 은 **종료 코드 0** 이라 조용하다.
 *                      그 뒤 `git add -A` 가 표시째 커밋한다 — §1~§3 이 읽을 표 자체가 깨진다.
 *                      모든 워커의 push 전 게이트가 이 자 하나뿐이라 여기에 세운다(지시서 [4]).
 *
 *   §5 추적 파일 급감(733) — 앞의 넷은 전부 **`PROGRESS.md` 만** 본다. 그래서 `git add -A` 가 자기 주제와
 *                      무관한 남의 파일(`docs/LESSONS.md` 25,424줄 → 0)을 통째로 삼켰을 때 **아무 자도
 *                      안 짖었고 15분간 아무도 몰랐다.** 표가 아니라 **추적 파일의 크기**를 본다.
 *
 *   node tools/verifyProgress.js                 작업 트리의 docs/PROGRESS.md 를 본다
 *   node tools/verifyProgress.js --rev <rev>     그 리비전의 PROGRESS 를 본다(§R 되돌림 시험용)
 *   node tools/verifyProgress.js --file <path>   파일 하나를 본다(합성 시험용)
 *   node tools/verifyProgress.js --quiet         빨간 항목만 찍는다
 *   node tools/verifyProgress.js --no-gate       §3 이 자를 실행하지 않는다(빠름 — 대신 «안 쟀다» 를 찍는다)
 *   node tools/verifyProgress.js --gate-timeout <초>   §3 의 자 실행 상한(기본 180)
 *   node tools/verifyProgress.js --allow-shrink <path> §5 — «줄어드는 것이 이 작업의 몫» 이라고 밝힌다(여러 번 가능)
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
let rev = null, file = null, quiet = false, noGate = false, gateTimeout = 180;
const allowShrink = [];      /* §5 — «줄어드는 것이 이 작업의 몫» 이라고 밝힌 경로 (작업 733) */
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--rev') rev = argv[++i];
  else if (argv[i] === '--file') file = argv[++i];
  else if (argv[i] === '--quiet') quiet = true;
  else if (argv[i] === '--no-gate') noGate = true;
  else if (argv[i] === '--gate-timeout') gateTimeout = Number(argv[++i]);
  else if (argv[i] === '--allow-shrink') allowShrink.push(String(argv[++i] || '').replace(/^\.\//, ''));
  else { console.error('사용법: node tools/verifyProgress.js [--rev <rev>] [--file <path>] [--quiet] [--no-gate] [--gate-timeout <초>] [--allow-shrink <path>]…'); process.exit(2); }
}
if (!(gateTimeout > 0)) { console.error('--gate-timeout 은 양수 초여야 한다'); process.exit(2); }

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

/* ── 세 번째 반쪽 (작업 566, 2026-08-31) ─────────────────────────────────────
 * ⓐ(388)·ⓑ(445)는 둘 다 **«미착수» 라는 낱말**을 찾는다 — ⓐ 는 구현 칸에서, ⓑ 는 비고 머리말에서.
 * 그래서 **셋 다 제대로 닫혔는데 구현 칸에 «낱말이 아닌 산문» 이 들어찬 행**은 두 자가 다 조용하다:
 *   512 `— (T2 기능·연출 · 지시서 [3]-(가) …)` · 517 `— (수치는 review §1·§4)` ·
 *   144·266·327 `docs/measure/…` 경로 · 333 «게이트만 수정 — …»
 * 그 칸이 하는 말은 «안 했다» 도 «했다» 도 아닌 **아무 말도 아니다** — 그리고 워커의 티어 스캔이
 * 실제로 그 칸을 읽는다(2026-08-31 sess-0146-21673 이 여섯 행을 «미완료 후보» 로 집어 올려
 * 하나씩 열어 보는 값을 치렀고, sess-0258-9414 의 첫 스캔도 같은 값을 치렀다).
 *
 * ── 왜 «칸이 정확히 7개» 를 전제로 다는가 ────────────────────────────────────
 * 이 축만은 칸을 **위치로** 읽어야 한다(모양으로 앵커할 «낱말» 이 없는 것이 정의다).
 * 그래서 위치를 믿을 수 있는 행에서만 판정한다 — 표 헤더가 7칸이므로 GitHub 은 8번째부터
 * **버리고**, 7칸인 행에서는 렌더·꼬리·머리 세 읽기가 **한 칸을 가리킨다**.
 * 칸이 7이 아닌 행은 조용히 넘기지 않고 «관찰» 로 세어 찍는다(실측 2026-08-31: 568행 중 142행).
 * ⚠ 칸을 셀 때 `\|`(escape)는 구분자가 아니다 — GFM 이 그렇게 읽는다. 순진하게 `split('|')`
 *   하면 7칸 행이 413행으로 세지지만 escape 를 지키면 **426행**이다(13행이 헛되이 «판정 불가» 가 된다).
 *
 * ── 무엇을 «벙어리» 로 부르지 않는가 (범위) ──────────────────────────────────
 * 구현 칸이 **정확히** «–/—/-/미착수./빈칸» 인 행은 이 축 밖이다. 그 모양은 ⓐ 의 것이고
 * (비고 머리말이 같이 «미착수» 일 때만 빨갛다), 실물 표에 **그 꼴로 닫힌 완료행이 50행 넘게** 있다.
 * 그것까지 빨갛게 하면 이 자는 모든 워커의 push 를 한꺼번에 막는다 — 헛빨강 하나의 값이
 * 놓친 자리 하나보다 비싸다(§3 머리말과 같은 저울). */
const COLS = 7;
const STATE_MARK = /✅|⏸|🔧|⏹|✖|🏆|완료|해결|통과|폐기|보류|종료|진행/;
const BARE_IMPL = /^\s*(?:\*\*)?\s*(?:–|—|-|미착수\.?)?\s*(?:\*\*)?\s*$/;
/* 축 ⓔ (604) — `BARE_IMPL` 중 «미착수» 낱말만 따로 뗀다. «–» 는 뗀 게 아니다. */
const STALE_IMPL = /^\s*(?:\*\*)?\s*미착수\.?\s*(?:\*\*)?\s*$/;
function cellsOf(line) {                   /* GFM 표 칸 나누기 — `\|` 는 구분자가 아니다 */
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '\\|'; i++; continue; }
    if (ch === '|') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  if (out.length && !out[0].trim()) out.shift();                    /* 행은 `|` 로 연다 */
  if (out.length && !out[out.length - 1].trim()) out.pop();         /* 행은 `|` 로 닫는다 */
  return out;
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
const muteWatch = [];                              /* 축 ⓒ 를 «칸 수» 때문에 못 잰 행 (566) */
/* 위쪽 «작업 단위» 표(헤더 4칸: ID·작업·주 편집 구간·상태)는 자리 규약이 다르다 — 축 ⓒ 는
   «화면별 상태» 표(7칸)의 자리를 읽는 축이므로 그 표만 본다 (572). */
const headOnly = new Set();
for (const line of curText.split('\n')) {
  if (/^\|\s*#\s*\|\s*화면\s*\|/.test(line)) break;
  const g = ROW.exec(line);
  if (g) headOnly.add(g[1]);
}
for (const [id, line] of cur) {
  /* 축 ⓓ 는 **완료 표지보다 먼저** 본다 (작업 809). 807 까지는 이 검사가 `if (!d) continue`
     아래에 있어서, 칸이 밀려 완료 표지가 구현 칸 **밖으로** 나간 행일수록 자가 더 조용했다 —
     정확히 거꾸로다. 657 이 실제로 ⏹ 종료행인데 티어 스캔에 «미착수» 로 보였고, 그 순간
     `verify572` 만 빨갛고 이 자는 초록이었다(지시서 [4] 는 이 자만 push 게이트로 지목한다).
     ⚠ 넓혀도 **정상 등재 push 는 안 막힌다** — 문턱은 «칸 수» 하나뿐이고 제대로 쓴 등재 행은
     7칸이다. 걸리는 행은 GitHub 이 이미 칸을 버리고 있는 행뿐이며, 이제 `fix572` 가
     양방향(too-many·too-few)을 자동으로 편다(809 ⓐ). 못박는 자는 `tools/verify809.js` §R. */
  if (!headOnly.has(id)) {
    const nc = cellsOf(line).length;
    if (nc !== COLS) { muteWatch.push({ id, n: nc, done: DONE_DATED.test(line) }); continue; }
  }
  const d = DONE_DATED.exec(line);
  if (!d) continue;                                /* 진짜 미착수 — 자가 건드리면 안 되는 자리 */
  const y = NOT_YET.exec(line);                    /* 축 ⓐ 구현 칸까지 등재 상태 (388) */
  if (y) { contra.push({ id, head: y[1], mark: d[0], kind: 'impl' }); continue; }
  const t = tailHead(line);                        /* 축 ⓑ 구현 칸은 채웠는데 머리말만 등재 상태 (445) */
  if (t) { contra.push({ id, head: t[1], mark: d[0], kind: 'tail' }); continue; }
  /* 축 ⓒ 세 칸이 다 «미착수» 라는 낱말을 안 쓰는데 구현 칸이 아무 말도 안 한다 (566).
     ⓐ·ⓑ 가 이미 댄 행은 위에서 `continue` 로 빠졌다 — 겹치면 구체적인 쪽을 댄다. */
  /* ⓐ·ⓑ 는 «낱말» 을 읽으므로 표가 달라도 그대로 도는데, ⓒ 는 **자리**를 읽는다 —
     헤더가 4칸인 위쪽 «작업 단위» 표는 자리 규약이 달라 ⓒ 의 범위 밖이다 (572). */
  if (headOnly.has(id)) continue;
  const impl = cellsOf(line)[3];                   /* 칸 수는 위 축 ⓓ 가 이미 걸렀다 (809) */
  /* 축 ⓔ 구현 칸이 **낱말 그대로 «미착수»** 인 완료행 (604).
     ⓐ 는 비고 머리말까지 등재 상태일 때만 울고, ⓒ 는 `BARE_IMPL` 로 이 낱말을 **면제**한다 —
     그 사이에 «구현 칸만 등재 당시 그대로인 완료행» 이 통째로 빠져 있었다(592 가 그 꼴이었다).
     ⚠ 범위는 «미착수» 한 낱말뿐이다 — «–» 로 닫은 완료행 40여 개는 566 이 일부러 남긴 자리다. */
  if (STALE_IMPL.test(impl)) { contra.push({ id, head: impl.trim(), mark: d[0], kind: 'stale' }); continue; }
  if (STATE_MARK.test(impl) || BARE_IMPL.test(impl)) continue;
  contra.push({ id, head: impl.trim().replace(/\s+/g, ' ').slice(0, 46), mark: d[0], kind: 'mute' });
}

/* ── §3 마감 누락 판정 — 표가 아니라 «표 ↔ 저장소 자산» 을 본다 (작업 557) ───────────
 * §1·§2 가 «초록» 을 내는 것이 옳은 자리가 하나 남아 있었다: 세션이 제품·자·review 를 전부
 * push 하고 **PROGRESS 를 아예 안 건드리는** 경우. 그 행은 완료 표지가 0건이라 §2 의 모순이
 * 성립하지 않고(모순의 정의가 «완료 표지 ↔ 미착수 머리말» 이다), done() 커밋이 `.git/shallow`
 * 경계 밖이면 §1 도 못 본다. 498(sess-1821-21145)이 그렇게 남아 티어 스캔에 «T2 미착수 첫 행» 으로
 * 읽혔고 워커 D 가 통째로 재선점했다(371·378·308·383 에 이어 다섯 번째). 재현은 `tools/probe557.js`.
 *
 * ── 정밀도를 왜 재현율보다 앞에 두는가 ────────────────────────────────────
 * 이 자는 **모든 워커의 push 전 게이트**다([4] 규칙). 빨개지면 그 행이 마감될 때까지 저장소
 * 전체의 push 가 막힌다 — 헛빨강 하나의 값이 놓친 자리 하나보다 비싸다. 그래서 «자산이 있다» 를
 * 곧장 완료로 읽지 않고 **증거 사다리**를 탄다. 못 본 자리는 조용히 넘기지 않고 요약에 세어 찍는다.
 *   E1 done(<ID>) 커밋이 이력에 있다        → 빨강 (결정적)
 *   E2 `tools/verify<ID>.js` 가 있고 **초록** → 빨강 (그 작업의 자가 통과한다 = 끝난 일이다)
 *      ⚠ 자가 **빨강**이면 조용하다 — 아직 안 끝난 일일 수 있다(요약에만 찍는다).
 *      ⚠ 자가 **못 돌면**(playwright 없음·시간 초과) «초록» 으로 부르지 않고 판정 불가로 찍는다.
 *   E3 `docs/review/<ID>-*.md` 가 스스로 «완료(날짜)» 라고 적었다 → 빨강
 *      ⚠ 재현율이 반쪽이다(probe557 [5] 실측: 마감된 554 의 review 에는 표지가 없다).
 *   그 밖(자산은 있는데 셋 다 아님) → 관찰로만 찍는다.
 *
 * ── lock 이 살아 있는 행은 왜 제외인가 ────────────────────────────────────
 * 지시서 [1] 이 «회차마다 review 를 커밋하라» 고 못박으므로 **진행 중인 작업도 자산을 갖는다**.
 * 진행 중과 마감 누락을 가르는 것은 자산이 아니라 `docs/claims/<ID>.lock` 이다(probe557 [4]).
 * 그래서 lock 이 있으면 제외하되 **조용히 빼지 않고** 요약에 몇 건을 왜 뺐는지 찍는다.
 *
 * ⚠ `--rev` 에서는 §3 을 돌리지 않는다 — 자산은 **작업 트리**의 것이라 옛 표와 짝이 안 맞는다.
 *   (`--file` 합성 표는 작업 트리 자산과 짝이 맞는 것이 시험의 전제라 그대로 돈다.) */
const CLAIMS = path.join(ROOT, 'docs', 'claims');
const reviewOf = id => {
  try { return fs.readdirSync(path.join(ROOT, 'docs', 'review')).filter(f => f.startsWith(id + '-') && f.endsWith('.md')); }
  catch (e) { return []; }
};
const gateOf = id => (fs.existsSync(path.join(ROOT, 'tools', 'verify' + id + '.js')) ? 'tools/verify' + id + '.js' : null);
const lockOf = id => {
  const p = path.join(CLAIMS, id + '.lock');
  if (!fs.existsSync(p)) return null;
  const m = /^(\S+)\s+(\S+)/.exec(fs.readFileSync(p, 'utf8').trim()) || [];
  const at = m[1] ? Date.parse(m[1]) : NaN;
  return { sid: m[2] || '?', min: isNaN(at) ? null : Math.round((Date.now() - at) / 60000) };
};
const reviewSaysDone = id => reviewOf(id).some(f => {
  try { return DONE_DATED.test(fs.readFileSync(path.join(ROOT, 'docs', 'review', f), 'utf8')); } catch (e) { return false; }
});
function runGate(rel) {
  try {
    execFileSync('node', [rel], { cwd: ROOT, encoding: 'utf8', timeout: gateTimeout * 1000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { state: 'pass' };
  } catch (e) {
    const out = String((e.stdout || '') + (e.stderr || ''));
    if (e.killed || e.signal) return { state: 'unrun', why: gateTimeout + '초 시간 초과' };
    if (e.status === 2 || /playwright|Cannot find module|Executable doesn't exist/i.test(out)) return { state: 'unrun', why: '실행 불가(종료 코드 ' + e.status + ')' };
    return { state: 'fail', why: '종료 코드 ' + e.status };
  }
}

const unclosed = [];   /* 빨강 — 끝났는데 표가 «미착수» 다 */
const held = [];       /* 제외 — lock 이 살아 있다(진행 중) */
const watch = [];      /* 관찰 — 자산은 있는데 «끝났다» 를 결정적으로 못 읽었다 */
const skipRev = !!rev;
if (!skipRev) {
  const namedBy1 = new Set(bad.map(b => b.id));
  for (const [id, line] of cur) {
    if (DONE_DATED.test(line)) continue;                 /* 행에 완료 표지가 있으면 §2 의 몫이다 */
    /* §1 이 이미 그 행을 댔으면 §3 은 입을 다문다 — **진단이 갈리면 고치는 법도 갈린다.**
       되돌린 행은 «그 done 커밋의 행을 되살려라» 이고 마감 누락은 «세 칸을 채워라» 다.
       둘을 같이 찍으면 어느 쪽을 하라는 건지 읽는 사람이 모른다(§1 이 더 구체적인 쪽이다). */
    if (namedBy1.has(id)) continue;
    if (!(NOT_YET.exec(line) || tailHead(line))) continue; /* 표가 «미착수» 로 안 읽힌다 */
    const rv = reviewOf(id), gate = gateOf(id);
    if (!rv.length && !gate) continue;                   /* 진짜 미착수 — 자가 건드리면 안 되는 자리 */
    const lk = lockOf(id);
    if (lk) { held.push({ id, lk, rv, gate }); continue; }
    if (newestDone.has(id)) {                            /* E1 */
      unclosed.push({ id, why: 'done(' + id + ') 커밋이 이력에 있다', detail: newestDone.get(id).sha.slice(0, 7) + ' «' + newestDone.get(id).subj.slice(0, 60) + '»' });
      continue;
    }
    if (gate) {                                          /* E2 — 자가 있으면 자의 답이 결정한다 */
      if (noGate) { watch.push({ id, why: '자 `' + gate + '` 를 안 돌렸다(--no-gate)' }); continue; }
      const r = runGate(gate);
      if (r.state === 'pass') { unclosed.push({ id, why: '그 작업의 자가 초록이다', detail: '`' + gate + '` 통과 — 끝난 일이다' }); continue; }
      if (r.state === 'fail') { watch.push({ id, why: '자 `' + gate + '` 가 빨갛다(' + r.why + ') — 아직 안 끝난 일일 수 있다' }); continue; }
      watch.push({ id, why: '자 `' + gate + '` 를 못 돌렸다(' + r.why + ') — 판정 불가' });
      continue;
    }
    if (reviewSaysDone(id)) {                            /* E3 */
      unclosed.push({ id, why: 'review 파일이 스스로 «완료(날짜)» 라고 적었다', detail: rv.join(' ') });
      continue;
    }
    watch.push({ id, why: 'review ' + rv.length + '건은 있는데 완료 표지가 없다 — 회차 기록일 수 있다(' + rv.join(' ') + ')' });
  }
}

/* ── §4 병합 표시 잔재 판정 (작업 571) ────────────────────────────────────────
 * §1~§3 은 «표가 무엇을 말하는가» 를 본다. 여기서 보는 것은 그보다 앞선 것이다 —
 * **표가 아예 깨진 채로 커밋되는** 자리다.
 *   `claim.js` 의 `pull --rebase`(rebase.autoStash)는 stash pop 이 충돌해도 **종료 코드 0** 이라
 *   작업 트리에 병합 표시를 남긴 채 조용히 끝난다(재현: `tools/probe571.js` [1]).
 *   그 뒤 지시서 [1] 이 시키는 `git add -A` + 커밋이 그 표시를 **그대로 담는다**([3]).
 *   2026-08-31 `618d000` 이 그랬고(569 행 두 벌 · LESSONS 에 표시 3줄), 363 이 `UI-REFERENCE.md` 에서
 *   같은 것을 걷어냈다 = **재발**이다. 자리를 옮겨 가며 재발하므로 «그 파일» 이 아니라
 *   «모든 워커가 push 전에 반드시 지나는 문» 하나에 세운다(지시서 [4] 규칙이 이 자를 그렇게 쓴다).
 *
 * ── 왜 표시 한 줄이 아니라 «세 짝» 을 보는가 ────────────────────────────────
 * 이 저장소의 기록(PROGRESS·LESSONS·ROUTINE)은 사고를 적을 때 표시 문자열을 **인용한다**
 * (571 등재문 자신이 그렇다). 줄 첫머리 한 종류만 세면 그 인용이 헛빨강이 된다. 그래서
 * ⓐ 열림 `<<<<<<< ` ⓑ 가름 `=======`(줄 전체) ⓒ 닫힘 `>>>>>>> ` 이 **그 순서로** 다 있어야 빨강이다.
 * 짝이 안 맞는 한 짝만 있는 파일은 조용히 넘기지 않고 «관찰» 로 찍는다.
 * 인덱스의 unmerged 항목은 해석의 여지가 없으므로 그 자체로 빨강이다.
 *
 * ⚠ 이 파일·자기 시험(`verify571`)·재현기(`probe571`)는 표시를 **런타임에 조립**한다 —
 *   소스에 줄 첫머리로 적으면 자가 자기를 빨갛게 만든다. */
const MK_OPEN = '<'.repeat(7) + ' ';
const MK_MID = '='.repeat(7);
const MK_CLOSE = '>'.repeat(7) + ' ';
const conflicted = [];   /* 빨강 — 병합 표시가 남은 파일 */
const halfMark = [];     /* 관찰 — 표시가 짝을 못 이룬다(인용일 수 있다) */
const unmergedIdx = ((gitQ('diff', '--name-only', '--diff-filter=U') || '').trim().split('\n').filter(Boolean));
if (!skipRev) {
  const listed = (gitQ('grep', '-lI', '--no-color', '-e', '^' + MK_OPEN) || '').trim();
  for (const f of listed.split('\n').filter(Boolean)) {
    let lines;
    try { lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n'); } catch (e) { continue; }
    const o = lines.findIndex(l => l.startsWith(MK_OPEN));
    const m = lines.findIndex((l, i) => i > o && l === MK_MID);
    const c = lines.findIndex((l, i) => i > m && m > o && l.startsWith(MK_CLOSE));
    if (o >= 0 && m > o && c > m) conflicted.push({ f, at: o + 1, to: c + 1 });
    else halfMark.push({ f, at: o + 1 });
  }
}
const seen = new Set(conflicted.map(x => x.f));
for (const f of unmergedIdx) if (!seen.has(f)) conflicted.push({ f, at: 0, to: 0, idx: true });

/* ── §5 추적 파일 급감 판정 (작업 733) ──────────────────────────────────────────
 * §4 가 «표가 깨진 채 커밋되는» 자리라면, 여기는 그보다 한 칸 더 앞이다 —
 * **자기 주제와 무관한 남의 파일이 커밋에 통째로 딸려 들어가는** 자리.
 *   2026-09-01 `2e8c90a done(684,685)`(전투력 알림 작업)이 `docs/LESSONS.md` 를 **25,424줄 삭제**해
 *   0바이트로 만들었다. 커밋 메시지에도 나머지 diff 에도 그 파일 이야기는 한 줄도 없다 ⇒ 의도가 아니라
 *   `git add -A` 사고다(571·363 의 «병합 표시 잔재» 와 같은 계열 — 셋 다 트리를 통째로 담아서 났다).
 *   ⚠ **이 사고가 비싼 이유**: 지시서 [0].1 이 «화면을 잡기 전에 LESSONS 를 한 번 읽는다» 를 못박는다.
 *   비어 있는 15분 동안 착수한 워커는 축적된 교훈을 **못 읽고** 같은 실수를 다시 밟는다.
 *   그리고 **아무 자도 안 짖었다** — §1~§4 는 전부 `PROGRESS.md` 만 본다.
 *
 * ── 무엇을 재는가 ──────────────────────────────────────────────────────────
 * «내 가지가 상류(origin/main)에서 갈라진 뒤 지금 작업 트리까지» 의 diff 한 벌 —
 * 커밋했지만 아직 push 안 한 것 + staged + unstaged 가 **한꺼번에** 들어온다(사고의 모양 그대로).
 * 기준은 `merge-base(origin/main, HEAD)` 다. `origin/main` 자체를 기준으로 삼으면 **남이 방금 올린 추가분**이
 * 내 쪽 «삭제» 로 읽혀 헛빨강이 난다(4개 워커가 상시 push 하는 저장소다).
 *
 * ── 문턱은 실측이다 (355 커밋 · 2026-09-01 13:41Z~17:44Z) ─────────────────────
 *   한 파일 **순삭**(삭제−추가) 최댓값: 사고 25,424줄 · **그다음이 50줄**(`tools/verify504.js` 재작성) ·
 *   그 아래 17 · 9 · 5 · 1. 커밋 하나의 전 파일 합계로도 사고를 빼면 최대 16줄.
 *   ⇒ **200줄**은 실측 정상치의 4배이자 사고의 1/127 이라 양쪽에서 넉넉하다(헛빨강 0건 · 사고 확실히 걸림).
 *   작은 공용 파일이 통째로 비는 것은 200줄에 안 걸리므로 **비율 축**을 따로 둔다(밑동 50줄 이상 · 90% 이상 소실).
 *   50~200줄 구간은 «관찰» 로만 찍는다 — 못 본 것을 초록으로 부르지 않되 push 를 막지도 않는다.
 *
 * ── 왜 «공용 파일 목록» 이 아니라 전 추적 파일인가 ───────────────────────────
 * 사고는 자리를 옮겨 가며 난다(571 = PROGRESS·LESSONS · 363 = UI-REFERENCE · 733 = LESSONS).
 * 목록으로 막으면 목록에 없는 다음 파일에서 그대로 재발한다. 대신 «줄어드는 것이 이 작업의 몫» 인
 * 정당한 작업(죽은 코드 선언째 철거 등)은 **밝히고 지나가게** 한다: `--allow-shrink <path>`.
 * ⚠ 사고의 본질은 «지웠다» 가 아니라 «아무도 모르게 지웠다» 이므로, 빠져나가는 문은 **말하는 문**이어야 한다.
 *   `docs/claims/*.lock` 은 해제가 곧 삭제(1줄)라 처음부터 제외한다. */
const SHRINK_ABS = 200;        /* 한 파일 순삭 줄수 — 빨강 */
const SHRINK_WATCH = 50;       /* 관찰 시작 — 실측 정상치의 최댓값 */
const SHRINK_RATIO = 0.9;      /* 또는 밑동의 90% 이상이 사라졌다 — 빨강 */
const SHRINK_MIN_BASE = 50;    /* 비율 축은 밑동이 이만큼은 돼야 본다 */
const LOCK_RE = /^docs\/claims\/[^/]+\.lock$/;
const shrunk = [];             /* 빨강 — 급감 */
const shrinkWatch = [];        /* 관찰 — 문턱 아래이거나 --allow-shrink 로 밝힌 것 */
let shrinkBase = null;
if (!skipRev) {
  const up = gitQ('rev-parse', '--verify', '--quiet', 'origin/main');
  shrinkBase = (up && (gitQ('merge-base', 'origin/main', 'HEAD') || '').trim()) || (gitQ('rev-parse', '--verify', '--quiet', 'HEAD') || '').trim() || null;
  const num = shrinkBase ? gitQ('diff', '--numstat', shrinkBase, '--') : null;
  for (const line of (num || '').split('\n')) {
    const g = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(line);
    if (!g || g[1] === '-' || g[2] === '-') continue;         /* 바이너리는 줄로 못 잰다 */
    let f = g[3];
    const ren = /^(?:.*)\{(?:.*) => (.*)\}(.*)$/.exec(f);      /* rename 표기 */
    if (ren) f = null; else if (/ => /.test(f)) f = null;
    if (f == null) continue;                                   /* 이름만 바뀐 것은 소실이 아니다 */
    if (LOCK_RE.test(f)) continue;
    const net = Number(g[2]) - Number(g[1]);
    if (net < SHRINK_WATCH) continue;
    const allowed = allowShrink.includes(f);
    let baseLines = null;
    const blob = gitQ('show', shrinkBase + ':' + f);
    if (blob != null) baseLines = blob.split('\n').length - (blob.endsWith('\n') ? 1 : 0);
    const gone = baseLines != null && baseLines >= SHRINK_MIN_BASE && net >= baseLines * SHRINK_RATIO;
    const red = net >= SHRINK_ABS || gone;
    const rec = { f, net, base: baseLines, gone, allowed };
    if (red && !allowed) shrunk.push(rec); else shrinkWatch.push(rec);
  }
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
  console.log('  §2 자기모순 검사 — 표 행 ' + cur.size + '건 · 빨강 ' + (contra.length + muteWatch.length) + '건' +
              ' (자기모순 ' + contra.length + ' · 축 ⓓ 판정 불가 ' + muteWatch.length + ')');
  /* 못 본 것을 초록으로 부르지 않는다 — 목록은 재현기가 낸다(내역: probe566 §2). */
  if (muteWatch.length) console.log('    ✗  칸 수가 헤더(7)와 달라 구현 칸의 자리를 못 믿는 행이다 ' +
                                    '(목록·내역: node tools/probe566.js §2)');
  if (skipRev) {
    console.log('  §3 마감 누락 검사 — 건너뜀(--rev): 자산은 작업 트리의 것이라 옛 표와 짝이 안 맞는다');
  } else {
    console.log('  §3 마감 누락 검사 — 빨강 ' + unclosed.length + '건 · 진행 중이라 제외 ' + held.length + '건 · 관찰 ' + watch.length + '건' +
                (noGate ? ' · ⚠ --no-gate: 자를 안 돌렸다(§3 의 E2 축이 꺼져 있다)' : ''));
    for (const h of held) console.log('    –  ' + h.id + ' — 제외 · lock ' + h.lk.sid + '(' + h.lk.min + '분 전) · review ' + h.rv.length + '건 · 자 ' + (h.gate || '없음'));
    for (const w of watch) console.log('    ⚠  ' + w.id + ' — 관찰 · ' + w.why);
  }
  if (skipRev) {
    console.log('  §4 병합 표시 잔재 — 건너뜀(--rev): 표시는 **작업 트리**의 것이라 옛 리비전과 짝이 안 맞는다');
  } else {
    console.log('  §4 병합 표시 잔재 — 빨강 ' + conflicted.length + '건 · 짝을 못 이룬 표시(인용일 수 있다) ' + halfMark.length + '건'
                + ' · 인덱스 unmerged ' + unmergedIdx.length + '건');
    for (const h of halfMark) console.log('    ⚠  ' + h.f + ':' + h.at + ' — 관찰 · 열림 표시는 있는데 «' + MK_MID + '»·닫힘이 그 뒤에 없다(인용으로 읽는다)');
  }
  if (skipRev) {
    console.log('  §5 추적 파일 급감 — 건너뜀(--rev): 급감은 **작업 트리**의 것이라 옛 리비전과 짝이 안 맞는다');
  } else {
    console.log('  §5 추적 파일 급감 — 빨강 ' + shrunk.length + '건 · 관찰 ' + shrinkWatch.length + '건 · 기준 ' +
                (shrinkBase ? shrinkBase.slice(0, 8) + '(merge-base origin/main HEAD)' : '없음 — ⚠ 기준을 못 잡아 이 절이 안 돌았다') +
                ' · 문턱 순삭 ' + SHRINK_ABS + '줄 또는 밑동의 ' + Math.round(SHRINK_RATIO * 100) + '%');
    for (const w of shrinkWatch) console.log('    ⚠  ' + w.f + ' — 관찰 · 순삭 ' + w.net + '줄' +
      (w.base != null ? '/밑동 ' + w.base : '') + (w.allowed ? ' · --allow-shrink 로 밝혔다' : ' · 문턱 아래'));
  }
}
for (const b of bad) console.log('  ✗ ' + b.id + ' — ' + b.why + ' · ' + b.detail);
for (const c of contra) console.log('  ✗ ' + c.id + ' — 자기모순 · ' +
  (c.kind === 'impl'
    ? '구현 칸이 «–» 이고 비고가 «' + c.head + '» 로 여는데 같은 행에 완료 표지 «' + c.mark + '» 가 있다'
    : c.kind === 'stale'
    ? '**구현 칸**이 등재 당시의 «' + c.head + '» 그대로인데 같은 행에 완료 표지 «' + c.mark +
      '» 가 있다 (마감이 완료문을 그 칸에 **덮어쓰지 않고 옆 칸으로 끼워 넣은** 꼴 — 티어 스캔은 «미완료» 로 읽는다)'
    : c.kind === 'tail'
    ? '구현 칸은 채웠는데 **비고 머리말**이 «' + c.head + '» 로 여는데 같은 행에 완료 표지 «' + c.mark +
      '» 가 있다 (세 칸 중 ③ 만 안 고친 꼴 — 티어 스캔이 읽는 칸이 그 칸이다)'
    : '비고는 완료 표지 «' + c.mark + '» 로 닫혔는데 **구현 칸**이 아무 말도 안 한다: «' + c.head +
      '…» (완료·보류·진행 표지도 «–» 도 아닌 산문 — 구현 칸을 읽는 티어 스캔은 이 행을 «미완료» 로 본다)'));

if (contra.length) {
  console.log('\nPROGRESS SELF-CONTRADICTION ' + contra.length + '건 — ' + contra.map(c => c.id).join(' '));
  console.log('  뜻: 그 작업은 끝났는데 표는 «미완료» 로 보여 준다 = 다음 워커의 티어 스캔이 재선점한다.');
  console.log('    (371 이 실제로 그랬다 — sess-0400-28780 이 선점했다가 회차 0 소모로 놓았다.)');
  console.log('  고치는 법: 완료문을 비고 «끝에만» 붙이지 말고 **세 칸을 같이** 갱신한다 —');
  console.log('    ① 구현 칸 «–» → «✅ 완료(날짜, 세션 · n회차) — 한 줄 요약»');
  console.log('    ② 루프 횟수 «0/5» → 실제 회차');
  console.log('    ③ 비고 머리말 «미착수/등재만» → 등재문임을 밝히는 말로(등재문 본문은 지우지 마라)');
  if (contra.some(c => c.kind === 'mute')) {
    console.log('  ⚑ «구현 칸이 아무 말도 안 하는» 행이 있다(566) — 고칠 곳은 ① 한 칸이다.');
    console.log('    그 칸의 산문을 지우지 말고 **앞에** 완료 표지를 붙여라 —');
    console.log('    «✅ **완료(날짜, 세션 · n회차)** — <한 줄 요약> · <원래 있던 산문>».');
    console.log('    요약은 `docs/review/<ID>-*.md` 에 이미 있다. ⚠ 남의 행을 «완료» 로 **판정**하지 마라 —');
    console.log('    비고 머리말이 이미 완료로 닫아 둔 행만 이 축에 걸린다(그 판정은 그 세션이 이미 했다).');
  }
  if (contra.some(c => c.kind === 'tail')) {
    console.log('  ⚑ «구현 칸은 채웠는데 머리말만» 인 행이 있다(445) — 고칠 곳은 ③ 한 칸이다.');
    console.log('    비고를 «✅ 완료(…) … **↓ 아래는 등재문(보존).** <옛 본문>» 으로 열어라.');
    console.log('    ⚠ 비고 안에 **escape 안 한 `|`** 가 있으면 그 뒤가 8번째 칸이 되어 GitHub 렌더에서');
    console.log('      통째로 사라지고, 티어 스캔은 그 칸을 비고로 읽는다(337·382 가 그 꼴이었다).');
  }
}

/* 축 ⓓ — «판정 불가» 자체를 빨강으로 센다 (604).
   566 이 축 ⓒ 를 세우고 572 가 132행을 7칸으로 되돌렸는데도, 자는 «판정 불가 n건» 을 경고로만
   찍고 **종료 코드 0** 이었다. 그래서 8칸 행이 다시 생겨도 push 게이트가 조용했고, 592 가
   구현 칸에 «미착수.» 를 단 채 완료행으로 하루를 났다.
   ⚑ **범위 개정(809)** — 옛 범위는 «완료 표지가 있는 행» 이었는데, 그 표지 자체가 칸이 밀리면
   구현 칸 밖으로 나가 §2 가 그 행을 «미착수» 로 보고 건너뛰었다: **밀린 행일수록 조용했다.**
   지금 범위는 «칸 수가 7이 아닌 행 전부»(위쪽 4칸 표는 제외)다. 정상 등재 행은 7칸이라 안 걸린다. */
for (const w of muteWatch) console.log('  ✗ ' + w.id + ' — 판정 불가 · 칸 수가 ' + w.n +
  '(헤더 7)이라 구현 칸의 자리를 못 믿는다 — ' +
  (w.done ? '완료 표지가 있는 행이다' : '완료 표지가 **구현 칸 밖으로 밀렸을 수도** 있다(809 — 표지 유무로 거르지 않는다)'));

if (muteWatch.length) {
  console.log('\nPROGRESS UNJUDGEABLE ' + muteWatch.length + '건 — ' + muteWatch.map(w => w.id).join(' '));
  console.log('  뜻: GitHub 은 헤더(7)를 넘는 칸을 **버리고**, 이 자의 축 ⓒ 는 자리를 못 믿어 판정을 포기한다');
  console.log('    = 그 행 안에 자기모순이 숨어도 표도 자도 조용하다(572 등재 사유 그대로).');
  console.log('  고치는 법: node tools/fix572.js          (미리보기 — 어디를 어떻게 합칠지만 찍는다)');
  console.log('             node tools/fix572.js --write  (무손실 — 글자는 한 자도 안 지운다)');
  console.log('    ⚑ 809 부터 `fix572` 는 **칸이 모자란 행(too-few)도** 자리 점수로 편다 — 손으로 풀 일이 아니다.');
  console.log('  ⚠ 자리를 되돌린 뒤 그 행이 §2 자기모순에 걸리면 지시서 [1] 대로 **세 칸을 같이** 고쳐라 —');
  console.log('    ① 구현 칸  ② 루프 횟수  ③ 비고 머리말. 등재문 본문은 지우지 마라.');
}

for (const u of unclosed) console.log('  ✗ ' + u.id + ' — 마감 누락 · ' + u.why + ' · ' + u.detail);

if (unclosed.length) {
  console.log('\nPROGRESS UNCLOSED ' + unclosed.length + '건 — ' + unclosed.map(u => u.id).join(' '));
  console.log('  뜻: 그 작업의 자산(제품·자·review)은 저장소에 있는데 **표만 «미착수»** 다 =');
  console.log('    다음 워커의 티어 스캔이 그 행을 «안 한 일» 로 읽고 통째로 재선점한다(498 이 실제로 그랬다).');
  console.log('  고치는 법: 그 행의 세 칸을 지시서 [1] 대로 채워 **마감**한다 —');
  console.log('    ① 구현 칸 «–» → «✅ 완료(날짜, 세션 · n회차) — 한 줄 요약»  ② 루프 횟수  ③ 비고 머리말');
  console.log('    요약은 `docs/review/<ID>-*.md` 에 이미 있다 — 등재문 본문은 지우지 마라.');
  console.log('  ⚠ 마감 전에 그 review 의 마지막 회차 기록을 읽고 **정말 끝났는지** 확인해라 —');
  console.log('    안 끝났으면 표를 «완료» 로 고치지 말고 `node tools/claim.js <ID> <SID>` 로 잡아 이어서 해라.');
}

for (const c of conflicted) console.log('  ✗ ' + c.f + ' — 병합 표시 잔재 · '
  + (c.idx ? '인덱스에 unmerged 로 남아 있다(`git status` 의 UU)' : c.at + '~' + c.to + '행에 열림·«' + MK_MID + '»·닫힘이 그대로 있다'));

if (conflicted.length) {
  console.log('\nMERGE MARKERS ' + conflicted.length + '건 — ' + conflicted.map(c => c.f).join(' '));
  console.log('  뜻: 병합이 안 풀린 채다. 지금 `git add -A` 로 커밋하면 표시가 **기록에 그대로 들어간다**');
  console.log('    (2026-08-31 618d000 이 그랬다 — PROGRESS 569 행이 두 벌 · LESSONS 에 표시 3줄. 뿌리는 작업 571).');
  console.log('  고치는 법: 지시서 [4] 대로 **양쪽을 모두 살려** 손으로 푼다 —');
  console.log('    표시 세 줄만 지우고 위·아래 내용은 **둘 다** 남긴다(남의 완료 행을 지우면 §1 이 빨개진다)');
  console.log('    → git add <그 파일들>  → `git stash list` 에 autostash 가 남아 있으면 확인 후 git stash drop');
  console.log('  ⚠ 뿌리는 `claim.js` 의 `pull --rebase`(autoStash)다 — pop 이 충돌해도 **종료 코드 0** 이라 조용하다.');
  console.log('    지금은 claim.js 가 그 자리에서 멈춘다(작업 571). 재현: node tools/probe571.js');
}

for (const s of shrunk) console.log('  ✗ ' + s.f + ' — 추적 파일 급감 · 순삭 ' + s.net + '줄'
  + (s.base != null ? ' / 밑동 ' + s.base + '줄' : '')
  + (s.gone ? ' = 사실상 통째로 사라졌다' : ''));

if (shrunk.length) {
  console.log('\nTRACKED FILE COLLAPSE ' + shrunk.length + '건 — ' + shrunk.map(s => s.f).join(' '));
  console.log('  뜻: 내 가지가 상류에서 갈라진 뒤 그 파일이 통째로 줄었다. 이 작업이 정말 그 파일을 지우는 일이 아니라면');
  console.log('    **`git add -A` 가 남의 파일을 삼킨 것**이다(2026-09-01 2e8c90a 이 docs/LESSONS.md 를 25,424줄 → 0 으로 만들었다. 작업 733).');
  console.log('  고치는 법: ① 마지막 정상판을 찾아 되살린다 —');
  console.log('    git log --oneline -- <파일>   → git checkout <그 앞 sha> -- <파일>   → git add -- <파일>');
  console.log('    ② 커밋은 `git add -A` 가 아니라 **내가 만진 파일만 이름으로** 담는다(지시서 [4]·[6]).');
  console.log('  ⚠ 줄어드는 것이 이 작업의 몫이라면(죽은 코드 선언째 철거 등) 밝히고 지나가라 —');
  console.log('    node tools/verifyProgress.js --allow-shrink <파일>   (그 경로는 «관찰» 로만 찍힌다)');
  console.log('    그리고 그 삭제를 커밋 메시지·review 에 한 줄로 남겨라. 사고의 본질은 «지웠다» 가 아니라 «아무도 모르게 지웠다» 다.');
}

if (bad.length) {
  console.log('\nPROGRESS REVERTED ' + bad.length + '건 — ' + bad.map(b => b.id).join(' '));
  console.log('  고치는 법: 그 `done(<ID>)` 커밋의 행을 그대로 되살린다.');
  console.log('    git show <done커밋>:' + REL + " | grep '^| <ID> |'");
  console.log('  ⚠ 되살리기 전에 «done 이후 그 행에 정당한 편집이 있었는가» 를 확인해라 —');
  console.log('    있었으면 그것까지 살린다(규칙 8 «양쪽 행을 모두 살린다» 그대로).');
  process.exit(1);
}
if (contra.length || muteWatch.length || unclosed.length || conflicted.length || shrunk.length) process.exit(1);
if (!quiet) console.log('\nPROGRESS OK — 되돌아간 완료행 없음 · 자기모순·판정 불가 행 없음 · 마감 누락 행 없음 · 병합 표시 잔재 없음 · 추적 파일 급감 없음' +
                        (skipRev ? ' (§3·§4·§5 는 --rev 라 안 돌았다)' : noGate ? ' (§3 의 자 실행은 --no-gate 로 껐다)' : ''));
process.exit(0);
