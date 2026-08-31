#!/usr/bin/env node
/* 604 — 표 행 두 개(586·592)가 다시 8칸이 된 자리 · 그리고 그것이 조용했던 이유.
 *
 * 무엇이 결손이었나 (셋을 가른다 — 하나로 뭉치면 무엇을 고쳤는지 못 읽는다):
 *   ⓐ 586 — 비고 안 코드 스팬의 **날 `|`** 가 칸을 갈랐다(572 가 정의한 escape 누락 유형).
 *   ⓑ 592 — 마감할 때 완료문을 구현 칸에 **덮어쓰지 않고 새 칸으로 끼워 넣어** 옛 «미착수.» 가
 *            그대로 남았다. 지시서 [1] 의 «세 칸을 같이» 중 ①구현·②루프(0/5)가 안 고쳐진 자리다.
 *   ⓒ **자가 조용했다** — `verifyProgress` §2 는 칸 수가 7 이 아니면 «판정 불가» 로 넘기고
 *            **종료 코드 0** 이었다. 그래서 ⓐ·ⓑ 가 push 게이트를 그대로 지나갔다.
 *
 * 이 자는 셋을 각각 못박는다. 특히 §R 이 없으면 «지금 우연히 초록» 과 구별이 안 된다.
 *
 * 쓰기: node tools/verify604.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REL = path.join('docs', 'PROGRESS.md');
const FILE = path.join(ROOT, REL);
const COLS = 7;

let pass = 0, fail = 0;
const ok = (id, why, detail) => { pass++; console.log('  ok  [' + id + '] ' + why + (detail ? '  [' + detail + ']' : '')); };
const no = (id, why, detail) => { fail++; console.log('  ✗   [' + id + '] ' + why + (detail ? '  [' + detail + ']' : '')); };
const t = (id, why, cond, detail) => (cond ? ok : no)(id, why, detail);

/* `\|` 는 구분자가 아니다 — 566 cellsOf · fix572 scan 과 같은 규칙 */
function cellsOf(line) {
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') { cur += '\\|'; i++; continue; }
    if (line[i] === '|') { out.push(cur); cur = ''; continue; }
    cur += line[i];
  }
  out.push(cur);
  if (out.length && !out[0].trim()) out.shift();
  if (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

const ROW = /^\|\s*([0-9]+|[A-Z][0-9]+)\s*\|/;
const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');
const headEnd = lines.findIndex(l => /^\|\s*#\s*\|\s*화면\s*\|/.test(l));
const rows = new Map();
lines.forEach((l, i) => { const g = ROW.exec(l); if (g && i > headEnd && !rows.has(g[1])) rows.set(g[1], { line: l, at: i + 1 }); });

const run = (args, opt) => {
  try { return { code: 0, out: execFileSync(process.execPath, args, Object.assign({ cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }, opt || {})) }; }
  catch (e) { return { code: e.status == null ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') }; }
};

console.log('VERIFY604 — 표 행 칸 수 회귀(586·592) + 그것이 조용했던 자리\n');

/* ── §1 실물 표 — 자리를 믿을 수 있는가 ───────────────────────────────── */
console.log('[1] 실물 표 — 칸이 정확히 7개');
const bad = [...rows].filter(([, r]) => cellsOf(r.line).length !== COLS).map(([id, r]) => id + '(' + cellsOf(r.line).length + '칸·L' + r.at + ')');
t('1-a', '«화면별 상태» 표에 7칸이 아닌 행이 하나도 없다', bad.length === 0, bad.length ? bad.join(' ') : '0건 / ' + rows.size + '행');
t('1-b', '표본이 공허하지 않다(행이 실제로 많다)', rows.size > 400, rows.size + '행');
for (const id of ['586', '592']) {
  const r = rows.get(id);
  t('1-c-' + id, id + ' 행이 7칸이다', !!r && cellsOf(r.line).length === COLS, r ? cellsOf(r.line).length + '칸 · L' + r.at : '행 없음');
}

/* ── §2 ⓑ 592 — 지시서 [1] 의 «세 칸» ─────────────────────────────────── */
console.log('\n[2] ⓑ 592 — 마감의 세 칸(① 구현 · ② 루프 · ③ 비고 머리말)');
const c592 = rows.has('592') ? cellsOf(rows.get('592').line) : [];
const impl592 = (c592[3] || '').trim();
const loop592 = (c592[5] || '').trim();
const note592 = (c592[6] || '').trim();
t('2-a', '① 구현 칸이 완료 표지로 «연다»(산문도 «미착수.» 도 아니다)', /^\**\s*(?:✅|완료)/.test(impl592), impl592.slice(0, 42) || '(빔)');
t('2-b', '② 루프 칸이 «0/5» 가 아니라 실제 회차다', /^\**\s*\d+\s*\/\s*[\d∞]+\s*\**$/.test(loop592) && !/^\**\s*0\s*\//.test(loop592), loop592 || '(빔)');
t('2-c', '③ 비고 머리말이 완료로 닫혀 있다', /^\**\s*(?:✅|완료)/.test(note592), note592.slice(0, 42) || '(빔)');
t('2-d', '스테일 «미착수.» 가 그 행 어디에도 안 남아 있다', !/미착수/.test(rows.get('592') ? rows.get('592').line : '미착수'), '0건');
t('2-e', '등재문 본문은 살아 있다(지우고 자리를 맞춘 게 아니다)',
  /주인 원문/.test(c592[2] || '') && (c592[2] || '').length > 1000, (c592[2] || '').length + '자');

/* ── §3 ⓐ 586 — escape 로 되살린 코드 스팬 ────────────────────────────── */
console.log('\n[3] ⓐ 586 — 코드 스팬 안의 날 `|` 를 escape 로 되살렸다');
const l586 = rows.has('586') ? rows.get('586').line : '';
t('3-a', '그 행에 escape 한 구분자 `\\|` 가 실제로 있다', /\\\|/.test(l586), (l586.match(/\\\|/g) || []).length + '자리');
t('3-b', 'escape 의 escape(`\\\\|`)가 생기지 않았다', !/\\\\\|/.test(l586));
t('3-c', '갈렸던 문자열이 한 칸 안에서 다시 이어졌다', /Sheet\)\/`/.test(cellsOf(l586)[6] || ''), '비고 칸');
t('3-d', '586 의 세 칸도 성한 채다', /^\**\s*(?:✅|완료)/.test((cellsOf(l586)[3] || '').trim()) &&
  /\d+\s*\/\s*\d+/.test((cellsOf(l586)[5] || '').trim()), (cellsOf(l586)[5] || '').trim());

/* ── §4 ⓒ 자 — 판정 불가가 이제 빨강이다 ─────────────────────────────── */
console.log('\n[4] ⓒ `verifyProgress` — «판정 불가» 를 경고가 아니라 빨강으로 센다');
const vp = run([path.join('tools', 'verifyProgress.js'), '--no-gate']);
t('4-a', '지금 트리에서 종료 코드 0 이다(음성 경계)', vp.code === 0, 'code ' + vp.code);
const vp2 = (vp.out.match(/§2 자기모순 검사[^\n]*/) || [''])[0];
t('4-b', '§2 줄이 «축 ⓓ 판정 불가 0» 을 말한다', /축 ⓓ 판정 불가 0/.test(vp2), vp2.slice(0, 80));
t('4-c', '판정 불가가 0 인데 «UNJUDGEABLE» 블록을 안 찍는다', !/PROGRESS UNJUDGEABLE/.test(vp.out));
/* 축 ⓔ 의 범위 — «–» 로 닫은 완료행은 566 이 일부러 남긴 자리다. 그것까지 빨개지면
   저장소 전체의 push 가 한꺼번에 막힌다(probe566 [5-b] «범위를 여기서 끊는다»). */
const dashDone = [...rows].filter(([, r]) => {
  const c = cellsOf(r.line);
  return c.length === COLS && /✅|완료\(/.test(r.line) && /^\s*(?:\*\*)?\s*[–—-]\s*(?:\*\*)?\s*$/.test(c[3] || '');
}).length;
t('4-d', '전제 — 구현 칸이 «–» 인 완료행이 실제로 많다(음성항이 공허하지 않다)', dashDone >= 5, dashDone + '행');
t('4-e', '그 행들은 축 ⓔ 에 한 건도 안 걸린다(범위를 «미착수» 낱말에서 끊었다)', vp.code === 0 && !/자기모순/.test(vp2.replace('자기모순 검사', '').replace('자기모순 0', '')), '자기모순 0');

/* ── §R 되돌림 — 셋을 각각 되돌리면 각각 빨개진다 ─────────────────────── */
console.log('\n[R] 되돌림 시험 — 고친 자리를 되돌리면 그 자리가 빨개진다');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v604-'));
const write = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };

/* R1 — 586 의 escape 를 한 자리 풀면 그 행이 8칸이 되고, 자가 그것을 빨강으로 센다 */
{
  const at = rows.get('586').at - 1;
  const cp = lines.slice();
  cp[at] = cp[at].replace('\\|', '|');
  const p = write('r1.md', cp.join('\n'));
  const n = cellsOf(cp[at]).length;
  t('R1-a', '전제 — escape 를 풀면 그 행이 7칸이 아니다', n !== COLS, n + '칸');
  const r = run([path.join('tools', 'verifyProgress.js'), '--no-gate', '--file', p]);
  t('R1-b', '자가 그 사본을 종료 코드 1 로 반려한다', r.code === 1, 'code ' + r.code);
  t('R1-c', '반려 사유가 «판정 불가» 로 586 을 지목한다', /PROGRESS UNJUDGEABLE/.test(r.out) && /586 — 판정 불가/.test(r.out));
  t('R1-d', '처방으로 `fix572 --write` 를 말한다(고치는 법이 자 안에 있다)', /fix572\.js --write/.test(r.out));
  const f = run([path.join('tools', 'verify572.js')], { env: Object.assign({}, process.env) });
  t('R1-e', '전제 — 실물 표에서는 `verify572` 가 초록이다', f.code === 0 && /VERIFY572 \d+\/\d+ PASS/.test(f.out),
    (f.out.match(/VERIFY572[^\n]*/) || [''])[0]);
}

/* R2 — 592 의 구현 칸을 옛 «미착수.» 로 되돌리면 §2 자기모순(축 ⓐ)이 잡는다.
       ⚠ 이것이 «칸 수를 되돌린» R1 과 다른 축이다 — 자리를 되찾았기 때문에 비로소 읽히는 자리다. */
{
  const at = rows.get('592').at - 1;
  const c = cellsOf(lines[at]);
  c[3] = ' 미착수. ';
  const cp = lines.slice();
  cp[at] = '|' + c.join('|') + '|';
  const p = write('r2.md', cp.join('\n'));
  t('R2-a', '전제 — 되돌린 사본도 7칸이다(칸 수가 아니라 «뜻» 을 되돌렸다)', cellsOf(cp[at]).length === COLS, cellsOf(cp[at]).length + '칸');
  const r = run([path.join('tools', 'verifyProgress.js'), '--no-gate', '--file', p]);
  t('R2-b', '자가 그 사본을 종료 코드 1 로 반려한다', r.code === 1, 'code ' + r.code);
  t('R2-c', '반려 사유가 «자기모순» 으로 592 를 지목한다', /SELF-CONTRADICTION/.test(r.out) && /592 — 자기모순/.test(r.out));
  t('R2-d', '그 사유가 축 ⓔ 다 — «구현 칸이 등재 당시 그대로»', /구현 칸\*\*이 등재 당시의/.test(r.out));
}

/* R3 — 수리 전 그대로(8칸 + 구현 칸 «미착수.»)를 되살리면 «판정 불가» 가 그것을 삼킨다 =
       이 작업이 존재하는 이유. 옛 자는 이 사본에도 초록을 줬다. */
{
  const at = rows.get('592').at - 1;
  const c = cellsOf(lines[at]);
  /* 수리 전 모양: … | 등재문 | 미착수. | 완료문 | 0/5 | 1회차(…) | 비고 |  = 8칸 */
  const c2 = [c[0], c[1], c[2], ' 미착수. ', c[3], ' 0/5 ', c[4], c[6]];
  const cp = lines.slice();
  cp[at] = '|' + c2.join('|') + '|';
  const p = write('r3.md', cp.join('\n'));
  t('R3-a', '전제 — 수리 전 모양은 8칸이고 구현 칸이 «미착수.» 다',
    cellsOf(cp[at]).length === 8 && cellsOf(cp[at])[3].trim() === '미착수.', cellsOf(cp[at]).length + '칸');
  const r = run([path.join('tools', 'verifyProgress.js'), '--no-gate', '--file', p]);
  t('R3-b', '지금 자는 그 사본을 반려한다', r.code === 1, 'code ' + r.code);
  t('R3-c', '자기모순 축(ⓐ)은 그 행을 못 본다 — 자리를 못 믿어 판정을 포기하기 때문이다',
    !/592 — 자기모순/.test(r.out) && /592 — 판정 불가/.test(r.out));
  t('R3-d', '⚠ 그런데도 «축 ⓓ» 가 없으면 초록이었다는 것을 셈이 말한다',
    /축 ⓓ 판정 불가 1/.test(r.out) && /자기모순 0/.test(r.out), (r.out.match(/§2 자기모순 검사[^\n]*/) || [''])[0].slice(0, 80));
}

/* R4 — 무손실: fix572 를 다시 돌려도 바꿀 행이 0 이다(수렴) */
{
  const r = run([path.join('tools', 'fix572.js')]);
  t('R4-a', '`fix572` 미리보기가 «바꿀 행 0» 이다(수렴 — 자리를 다 되돌렸다)',
    /바꿀 행 0 · 못 고친 행 0/.test(r.out), (r.out.match(/FIX572[^\n]*/) || [''])[0]);
}

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* 임시 디렉터리 — 못 지워도 판정과 무관 */ }

console.log('\nVERIFY604 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
