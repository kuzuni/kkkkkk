#!/usr/bin/env node
/* probe388 — «표가 «안 했다» 와 «했다» 를 동시에 말하는 행» 을 재현한다 (작업 388)
 *
 *   node tools/probe388.js              작업 트리의 docs/PROGRESS.md
 *   node tools/probe388.js --rev <rev>  그 리비전의 PROGRESS (대조 실행용)
 *
 * ── 왜 재현기부터인가 (338 규칙) ────────────────────────────────────────────
 * 388 의 등재문은 «done(<ID>) 이 구현 칸을 안 고쳐서 표가 미완료로 읽힌다» 고 적었다.
 * 그 가설을 **따르기 전에** 잰다 — 실례가 몇 건인지, 그리고 «자» 를 세울 때
 * **보류·진행 행을 빨갛게 만들지 않는지**(음성항)가 이 작업의 절반이다.
 *
 * ── 왜 칸을 «위치» 로 세지 않는가 (이 재현기의 본체) ────────────────────────
 * `docs/PROGRESS.md` 의 표는 칸을 `|` 로 나누지만 **본문 안에도 `|` 가 있다** —
 * 코드 스팬(`a | b`), 산문의 «ⓐ | ⓑ», 이스케이프 `\|`. 실측: 389 행 중 **7칸은 268 행뿐**이고
 * 나머지 121 행은 4~14 칸으로 흩어진다. 코드 스팬을 가려도 296/389 다.
 * ⇒ **`cols[3]` 같은 위치 인덱스는 이 파일에서 못 쓴다**(174·192·280·319·336~344 행은
 *    앞 칸에 `|` 가 있어 구현 칸이 통째로 밀린다 — 그 자리를 «구현» 으로 읽으면 자가 헛것을 잰다).
 *
 * 그래서 위치가 아니라 **모양**으로 앵커한다(368 처방 «자리를 리터럴에서 빼라» 와 같은 축):
 *   `| <구현> | <점수> | <횟수> | **<비고 머리말>`
 * 구현·점수 칸이 «–»(또는 빔)이고 비고가 «미착수/등재만/착수 전» 으로 열리는 자리 —
 * 이건 표 어디에 있든 같은 모양이고, 산문 속의 «미착수» 는 이 자리에 못 온다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'docs/PROGRESS.md';
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { return null; } };

const argv = process.argv.slice(2);
let rev = null;
for (let i = 0; i < argv.length; i++) if (argv[i] === '--rev') rev = argv[++i];

const label = rev || '작업 트리';
const text = rev ? git('show', rev + ':' + REL) : fs.readFileSync(path.join(ROOT, REL), 'utf8');
if (text == null) { console.error('PROGRESS 를 읽지 못했다: ' + label); process.exit(2); }

/* ── 자 두 개 ──────────────────────────────────────────────────────────────
 * DONE  — «했다» 표지 = «완료·해결·통과·폐기 + 날짜». **날짜를 요구하는 것이 이 자의 절반이다** —
 *         산문은 «✅ 완료» 를 인용만 하고 날짜를 안 붙인다(388 자신의 등재문이 그 처방을 인용해
 *         첫 판에서 자기 자신을 빨갛게 만들었다). ⏸(보류)·🔧(진행 중)은 **일부러 뺐다**: 그 둘은 «아직 안 끝났다» 이므로
 *         비고가 «미착수» 여도 모순이 아니다(199·351·72 가 그 자리다).
 * NOTYET — «안 했다» 표지. **비고 칸의 머리말에서만** 읽는다(산문 인용 방지 — 374·388 행 자신이
 *         본문에 «미착수» 를 인용한다).
 */
const DONE = /(?:완료|해결|통과|폐기)\s*\(\s*20\d\d-\d\d-\d\d/;
/* ⚠ 두 관행을 같이 읽는다(작업 422) — 머리말 앞의 «←(등재문)» 표지(409·415·416·419~424)와
   구현 칸의 «미착수.»(425~430). 넓히기 전에는 [2] 가 **0건**이라 이 재현기가 아무것도 안 세고 있었다.
   ⚠ 세 번째 관행 «머리말 등재문»(작업 960) — **괄호 한정이 안 붙은 것만** 이다. `등재문(보존)` 은
   «했다» 쪽이라 어휘 밖이다(실측 896·909·915 ↔ 948·955·960·961·962). 본체와 같은 모양이어야 한다. */
const HEAD_NOTYET = /^\s*\**\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전|등재문(?!\s*\())/;
/* 구현·점수 칸이 «안 했다»(–/—/-/빈칸/미착수.)이고 비고가 «안 했다» 로 열리는 모양. 위치가 아니라 모양이다. */
const SHAPE = /\|\s*(?:–|—|-|미착수\.?|)\s*\|\s*(?:–|—|-|)\s*\|[^|]*\|\s*(\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전|등재문(?!\s*\())/;
const ROW = /^\|\s*([0-9]+|[A-Z][0-9]+)\s*\|/;

const rows = [];
for (const line of text.split('\n')) {
  const g = ROW.exec(line);
  if (g) rows.push({ id: g[1], line: line.replace(/\s+$/, '') });
}

/* ⚠ 축이 둘이다(작업 445) — `SHAPE` 는 «구현 칸까지 등재 상태» 만 본다. 구현 칸은 `✅ 완료(…)` 로
   제대로 채웠는데 **비고 머리말만** 등재 상태로 남은 행은 한 건도 안 세진다(실측 5건: 310·337·353·382·383).
   비고 칸은 위치로 못 세므로(위 머리말) **마지막 비어 있지 않은 칸**으로 잡는다 — 그 칸이 곧
   워커의 티어 스캔이 읽는 칸이고(`awk -F'|' '{print $(NF-1)}'`), 표를 넘쳐 GitHub 이 렌더에서
   **버리는** 칸도 여기서 걸린다(337·382 가 그 꼴이었다). */
/* GFM 표 칸 나누기 — `\|` 는 구분자가 아니다(566 규약 · 960 이 tail 축까지 넓혔다).
   ⚠ 앞뒤 빈 칸을 **안 뗀다** — 아래 되짚기가 `cells.join('|')` 로 행을 되짓는다. */
function cellsRaw(line) {
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '\\|'; i++; continue; }
    if (ch === '|') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
function tailHead(line) {
  const c = cellsRaw(line);          /* escape 를 지켜 나눈다 — 960 */
  let i = c.length - 1;
  while (i > 0 && !c[i].trim()) i--;
  return i > 0 ? HEAD_NOTYET.exec(c[i]) : null;
}

const contra = [], contraHead = [], notyet = [], done = [];
for (const r of rows) {
  const hasDone = DONE.test(r.line);
  const hasShape = SHAPE.test(r.line);
  const th = hasShape ? null : tailHead(r.line);
  if (hasShape && hasDone) contra.push(r);
  else if (th && hasDone) contraHead.push({ ...r, head: th[1] });
  else if (hasShape || th) notyet.push(r);
  else if (hasDone) done.push(r);
}

console.log('probe388 — ' + label + ' · 표 행 ' + rows.length + '건');
console.log('');
console.log('[1] 자기모순 — «구현 칸은 비었고 비고는 «안 했다» 로 여는데 행에 완료 표지가 있다»');
if (!contra.length) console.log('    (없음)');
for (const r of contra) {
  const m = SHAPE.exec(r.line), d = DONE.exec(r.line);
  console.log('    ✗ ' + r.id + ' — 비고 머리말 «' + m[2] + '» ↔ 완료 표지 «' + d[0] + '»');
}
console.log('');
console.log('[1-b] 자기모순 — «구현 칸은 채웠는데 **비고 머리말**만 «안 했다» 로 연다» (작업 445 · 388 의 남은 반쪽)');
console.log('      ⚑ 관측된 피해: 2026-08-30 워커 H(sess-0751-1923)가 383 을 이 모양으로 읽고 재선점했다.');
if (!contraHead.length) console.log('    (없음)');
for (const r of contraHead) {
  const d = DONE.exec(r.line);
  console.log('    ✗ ' + r.id + ' — 비고 머리말 «' + r.head + '» ↔ 완료 표지 «' + d[0] + '»' +
              (r.line.split('|').length - 1 > 8 ? '  ⚠ 칸이 ' + (r.line.split('|').length - 2) + '개 — escape 안 한 `|` 로 비고가 쪼개져 GitHub 렌더에서 뒤 칸이 사라진다' : ''));
}
console.log('');
console.log('[2] 정상 미착수 (완료 표지 없음 — 자가 건드리면 안 되는 자리) · ' + notyet.length + '건');
console.log('    ' + notyet.map(r => r.id).join(' '));
console.log('');
console.log('[3] 완료·진행 표지가 붙은 행 · ' + done.length + '건 (자가 조용해야 한다)');
console.log('');
console.log('[4] 음성항 — «보류·진행» 행이 [1] 에 안 들어갔는가');
for (const id of ['199', '351', '72', '14', '67', '386']) {
  const r = rows.find(x => x.id === id);
  if (!r) { console.log('    ? ' + id + ' — 행 없음'); continue; }
  const inContra = contra.some(x => x.id === id) || contraHead.some(x => x.id === id);
  const why = /⏸/.test(r.line) ? '⏸ 보류' : /🔧|진행 중/.test(r.line) ? '진행 중' : /✖/.test(r.line) ? '✖ 폐기' : DONE.test(r.line) ? '완료' : '미착수';
  console.log('    ' + (inContra ? '✗' : 'ok') + '  ' + id + ' — ' + why + (inContra ? ' 인데 자기모순으로 잡혔다(자가 무르다)' : ' · 안 잡힘'));
}
console.log('');
console.log('[5] 얕은 클론 — 자가 볼 수 있는 창');
const shallow = fs.existsSync(path.join(ROOT, '.git', 'shallow'));
const log = git('log', 'HEAD', '--format=%s', '--', REL) || '';
const doneCommits = log.split('\n').filter(l => /^done\(/.test(l)).length;
console.log('    .git/shallow ' + (shallow ? '있음 — 이력이 잘려 있다' : '없음') +
            ' · 이 실행이 볼 수 있는 done() 커밋 ' + doneCommits + '건');
console.log('    ⚠ 이 수가 실행마다 다르면 verifyProgress 의 커버리지도 실행마다 다르다.');

process.exit(contra.length + contraHead.length ? 1 : 0);
