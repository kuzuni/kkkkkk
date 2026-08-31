#!/usr/bin/env node
/* 572 — «표 행의 칸은 정확히 7개» 를 지키는 자.
 *
 * 무엇을 지키나: GFM 은 헤더 칸 수(7)를 넘는 칸을 **버린다**. 8칸 행은 비고가 화면에서
 * 통째로 사라지고(566 이 553·554 에서 실제로 확인), `verifyProgress` §2 축 ⓒ 는 그런 행을
 * «자리를 못 믿는다» 며 판정 불가로 넘긴다. 572 가 137행을 7칸으로 되돌렸고,
 * 이 자는 그것이 **다시 벌어지지 않게** 못을 박는다.
 *
 * 절: [1] 실물 표 · [2] 헤더·범위 · [3] verifyProgress 축 ⓒ · [4] 되돌림 시험 ·
 *     [5] 무손실·수렴 · [6] escape 경계(음성항)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const REL = 'docs/PROGRESS.md';
const p566 = require('./probe566.js');
const f572 = require('./fix572.js');
const { cellsOf, muteOf, COLS } = p566;

let pass = 0, fail = 0;
const chk = (cond, label, note) => {
  (cond ? pass++ : fail++);
  console.log('  ' + (cond ? 'ok  ' : '✗   ') + label + (note ? '  [' + note + ']' : ''));
};

const text = fs.readFileSync(path.join(ROOT, REL), 'utf8');
const lines = text.split('\n');
/* 표 행 = 121행(«화면별 상태» 표 머리) 아래의 `| <ID> |` 줄. 그 위는 4칸짜리 «작업 단위» 표다. */
const rowsAt = [];
lines.forEach((l, i) => { if (i + 1 >= f572.HEAD_LINE && f572.ROW.test(l)) rowsAt.push([i + 1, l]); });
const cells = l => cellsOf(l.replace(/\s+$/, ''));

console.log('VERIFY572 — 표 행 ' + rowsAt.length + '건');

/* ── [1] 실물 표 ── */
console.log('');
console.log('[1] 실물 표 — 칸이 정확히 7개');
{
  const bad = rowsAt.filter(([, l]) => cells(l).length !== COLS)
    .map(([ln, l]) => f572.ROW.exec(l)[1] + '(' + cells(l).length + '칸·L' + ln + ')');
  chk(bad.length === 0, '[1-a] 7칸이 아닌 행이 하나도 없다', bad.length ? bad.slice(0, 12).join(' ') : '0건');
  chk(rowsAt.length >= 500, '[1-b] 표본이 공허하지 않다(행이 실제로 많다)', rowsAt.length + '행');
  const dup = new Map();
  for (const [, l] of rowsAt) { const id = f572.ROW.exec(l)[1]; dup.set(id, (dup.get(id) || 0) + 1); }
  chk([...dup.values()].every(n => n === 1), '[1-c] ID 가 중복된 행이 없다(칸 세기가 첫 행만 보고 끝나지 않는다)',
      [...dup].filter(([, n]) => n > 1).map(([id]) => id).join(' ') || '중복 0');
}

/* ── [2] 헤더·범위 ── */
console.log('');
console.log('[2] 헤더와 범위');
{
  const head = lines.find(l => /^\|\s*#\s*\|/.test(l)) || '';
  chk(cells(head).length === COLS, '[2-a] 헤더도 7칸이다(자가 남의 수를 베끼지 않는다)', '칸 ' + cells(head).length);
  /* 위쪽 «작업 단위» 표는 헤더가 4칸이다 — 거기서도 A1·A2·A3 가 7칸이라
     GitHub 이 구현·점수·루프·**비고**를 통째로 버리고 있었다(같은 결함의 다른 표). */
  const above = lines.slice(0, f572.HEAD_LINE - 1).filter(l => f572.ROW.test(l));
  const wide = above.filter(l => cells(l).length > 4).length;
  chk(above.length > 0 && wide === 0,
      '[2-b] 위쪽 «작업 단위» 표도 헤더(4칸)를 안 넘는다', above.length + '행 · 초과 ' + wide);
}

/* ── [3] verifyProgress 축 ⓒ ── */
console.log('');
console.log('[3] 축 ⓒ — 이제 표 «전체» 를 본다');
{
  const un = [], red = [];
  for (const [, l] of rowsAt) {
    const m = muteOf(l);
    if (!m) continue;
    if (m.state === 'unmeasurable') un.push(f572.ROW.exec(l)[1] + '(' + m.n + '칸)');
    if (m.state === 'red') red.push(f572.ROW.exec(l)[1]);
  }
  chk(un.length === 0, '[3-a] «칸 수가 7이 아니라 판정 불가» 가 0건이다(572 전에는 132건이었다)', un.slice(0, 12).join(' ') || '0건');
  chk(red.length === 0, '[3-b] 그러고도 축 ⓒ 빨강이 0건이다 — 자리를 맞추며 뜻을 안 깼다', red.join(' ') || '0건');
}

/* ── [4] 되돌림 시험 — 자가 그 자리를 실제로 보는가 ── */
console.log('');
console.log('[4] 되돌림 시험 — 합친 자리를 도로 가르면 빨개진다');
{
  const merged = rowsAt.filter(([, l]) => l.includes('<br>'));
  chk(merged.length >= 50, '[4-0] 전제 — `<br>` 로 합친 행이 실제로 많다', merged.length + '행');
  let split1 = 0, mute1 = 0;
  for (const [, l] of merged.slice(0, 40)) {
    const back = l.replace('<br>', '|');                 /* 한 자리만 도로 가른다 */
    if (cells(back).length !== COLS) split1++;
    const m = muteOf(back);
    if (m && m.state === 'unmeasurable') mute1++;
  }
  chk(split1 === 40, '[4-a] 40개 표본 전부 «7칸 아님» 으로 잡힌다', split1 + '/40');
  chk(mute1 > 0, '[4-b] 그중 완료행은 verifyProgress 에서 «판정 불가» 로 새 나간다(이 작업이 존재하는 이유)', mute1 + '건');
  const esc = rowsAt.filter(([, l]) => l.includes('\\|'));
  chk(esc.length >= 10, '[4-c] 전제 — `\\|` 로 escape 한 행도 실제로 있다', esc.length + '행');
  const unesc = esc[0][1].replace('\\|', '|');
  chk(cells(unesc).length !== COLS, '[4-d] escape 를 한 자리 풀면 그 행도 7칸이 깨진다', '칸 ' + cells(unesc).length);
}

/* ── [5] 무손실·수렴 ── */
console.log('');
console.log('[5] 무손실 — 글자를 한 자도 안 지웠다 · 자가 수렴한다');
{
  let stuck = 0, moved = 0;
  for (const [, l] of rowsAt) {
    const r = f572.fixRow(l);
    if (r.why && r.why !== 'LOSSY' && r.line === l && !/too-few|unparsed/.test(r.why)) stuck++;
    if (r.line !== l) moved++;
  }
  chk(moved === 0, '[5-a] 수리기를 다시 돌려도 바꿀 행이 0이다(수렴)', moved + '행');
  chk(stuck === 0, '[5-b] 못 고치는 행이 없다', stuck + '행');
  /* 되돌린 사본을 다시 고치면 «글자 열» 이 지금과 같다 — 합치기·escape 가 가역이라는 뜻 */
  let same = 0, tried = 0;
  for (const [, l] of rowsAt.filter(([, x]) => x.includes('<br>')).slice(0, 20)) {
    tried++;
    const back = l.replace('<br>', '|');
    if (f572.lossless(back, f572.fixRow(back).line)) same++;
  }
  chk(tried === same && tried > 0, '[5-c] 되돌린 사본을 다시 고쳐도 글자 열이 그대로다', same + '/' + tried);
}

/* ── [6] escape 경계 — 순진한 분할과 다르다 ── */
console.log('');
console.log('[6] escape 경계 — `\\|` 는 구분자가 아니다');
{
  let naive = 0;
  for (const [, l] of rowsAt) {
    const n = l.replace(/\s+$/, '').replace(/\|\s*$/, '').split('|').length - 1;
    if (n !== COLS) naive++;
  }
  chk(naive > 0, '[6-a] 순진하게 `|` 로 쪼개면 7칸이 아닌 행이 남는다 — escape 를 지켜야 세진다', naive + '행');
  chk(rowsAt.every(([, l]) => !/\\\\\|/.test(l)), '[6-b] `\\\\|`(escape 의 escape)가 생기지 않았다');
}

console.log('');
console.log('VERIFY572 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
