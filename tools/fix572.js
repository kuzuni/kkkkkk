#!/usr/bin/env node
/* 572 — docs/PROGRESS.md 의 표 행을 «칸 7개» 로 되돌린다 (글자는 하나도 안 지운다).
 *
 * 왜 필요한가: GFM 은 헤더 칸 수(7)를 넘는 칸을 **버린다**. 8칸 행은 비고가 화면에서
 * 통째로 사라지고, `verifyProgress` §2 축 ⓒ 도 «자리를 못 믿어» 판정을 포기한다(566).
 *
 * 쓰는 변환은 셋뿐이고 전부 «지우지 않는» 변환이다:
 *   ⓐ 여분 칸 합치기   — 구분자 `|` → `<br>`  (566 이 553·554 에 쓴 방법)
 *   ⓑ 코드 스팬이 갈린 자리 — 구분자 `|` → `\|`  (GFM 은 표에서 escape 를 먼저 푼다 —
 *                            `u.it.ic \|\| '❔'` 처럼 원래 글자가 그대로 살아난다)
 *   ⓒ 측정표 칸이 아예 없는 행 — 빈 칸 하나 삽입(`|` 한 글자만 는다)
 *   ⓓ **칸이 모자란 행(n < 7)** — 빈 칸을 «어디에» 끼울지도 자리 점수로 고른다 (작업 809).
 *      807 까지는 `too-few(n)` 이라고 말하고 손도 안 댔다 — 재발마다 T1 세션 하나가 들었다.
 *

 * 어디서 합칠지는 취향이 아니라 **자리**로 정한다. 7칸 표의 자리는
 *   [0]# [1]화면 [2]측정표 [3]구현 [4]최고 점수 [5]루프 횟수 [6]비고
 * 이므로 후보는 «앞에서 어디까지를 측정표로 합치는가(p)» 와 «가운데 어디까지를 최고 점수로
 * 합치는가(q)» 둘뿐이고, 그 자리에 놓았을 때 구현 칸·루프 칸이 실제로 그 칸처럼 읽히는지로
 * 점수를 매겨 고른다. 구현 칸 판정자는 `verifyProgress` §2 의 것과 같은 자를 쓴다 —
 * 고른 자리가 그 자를 통과해야 표가 «판정 가능» 해지기 때문이다.
 *
 * 쓰기:  node tools/fix572.js            (미리보기 — 무엇을 어떻게 고칠지만 찍는다)
 *        node tools/fix572.js --write    (실제로 고친다)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const REL = path.join('docs', 'PROGRESS.md');
const COLS = 7;
const HEAD_LINE = 121;                    /* 이 위는 4칸짜리 «작업 단위» 표다 */

const ROW = /^\|\s*([0-9A-Z]+)\s*\|/;
const STATE_MARK = /✅|⏸|🔧|⏹|✖|🏆|완료|해결|통과|폐기|보류|종료|진행/;
const BARE_IMPL = /^\s*(?:\*\*)?\s*(?:–|—|-|미착수\.?)?\s*(?:\*\*)?\s*$/;
const LEAD_MARK = /^\s*(?:\*\*)?\s*(?:✅|⏸|🔧|⏹|✖|🏆|완료|통과|폐기|보류|종료)/;
const LOOP = /^\**\s*(?:\d+\s*\/\s*[\d∞]+|\d+\s*회차|[–—-]|✅|)\s*(?:\*\*)?\s*(?:\(|$)/;
const TIGHT_LOOP = /^\**\s*(?:\d+\s*\/\s*[\d∞]+|\d+\s*회차)\s*(?:\*\*)?\s*$/;

/* 구분자 `|` 의 자리와 «코드 스팬 안인가». `\|` 는 구분자가 아니다(566 cellsOf 와 같은 규칙). */
function scan(line) {
  const out = [];
  let i = 0, incode = false, tick = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { i += 2; continue; }
    if (ch === '`') {
      let j = i;
      while (j < line.length && line[j] === '`') j++;
      const n = j - i;
      if (!incode) { incode = true; tick = n; }
      else if (n === tick) { incode = false; tick = 0; }
      i = j; continue;
    }
    if (ch === '|') out.push({ at: i, incode });
    i++;
  }
  return out;
}

/* 칸 목록 + 경계가 코드 스팬 안이었는지 + 줄 처음·끝 조각 */
function split(line) {
  const pipes = scan(line);
  if (!pipes.length) return null;
  const seg = [];
  let prev = 0;
  for (const p of pipes) { seg.push(line.slice(prev, p.at)); prev = p.at + 1; }
  seg.push(line.slice(prev));
  if (seg[0].trim()) return null;                       /* 줄이 `|` 로 안 시작한다 */
  const tailSep = !seg[seg.length - 1].trim();          /* 끝에 `|` 가 있는 행인가 */
  const cells = tailSep ? seg.slice(1, -1) : seg.slice(1);
  const inco = [];
  for (let k = 1; k < cells.length; k++) inco.push(pipes[k].incode);
  return { cells, inco, lead: seg[0], tail: tailSep ? seg[seg.length - 1] : null };
}

function merge(cells, inco, a, b) {
  let out = cells[a];
  for (let k = a + 1; k <= b; k++) out += (inco[k - 1] ? '\\|' : '<br>') + cells[k];
  return out;
}

function score(meas, impl, best, loop, note) {
  let s = 0;
  /* 구현 칸은 «머리에 상태 표지» 가 정답이다 — 본문 어딘가에 «진행» 같은 낱말이 섞인 산문과 가른다 */
  s += LEAD_MARK.test(impl) ? 6 : BARE_IMPL.test(impl) ? 3 : STATE_MARK.test(impl.slice(0, 60)) ? 2 : 0;
  if (impl.trim().length > 200) s -= 2;
  s += TIGHT_LOOP.test(loop.trim()) ? 4 : LOOP.test(loop.trim()) ? 2 : 0;
  if (!meas.trim() || meas.includes('docs/measure') || meas.trim().startsWith('`')) s += 1;
  if (note.trim().length >= 300) s += 2;
  if (note.trim().startsWith('**') || note.trim().startsWith('✅')) s += 1;
  return s;
}

/* 위쪽 «작업 단위» 표(4칸: ID·작업·주 편집 구간·상태)는 자리가 하나뿐이라 뒤를 상태 칸에 합친다.
 * 이 표에서도 A1·A2·A3 가 7칸이라 GitHub 이 **구현·점수·루프·비고 네 칸을 통째로 버리고 있었다.** */
function fixHeadRow(line, cols) {
  const sp = split(line);
  if (!sp) return { line, why: 'unparsed' };
  const { cells, inco } = sp;
  const n = cells.length;
  if (n <= cols) return { line, why: null };
  const out = cells.slice(0, cols - 1).concat([merge(cells, inco, cols - 1, n - 1)]);
  const nl = sp.lead + '|' + out.join('|') + (sp.tail === null ? '' : '|' + sp.tail);
  if (!lossless(line, nl)) return { line, why: 'LOSSY' };
  return { line: nl, why: 'head n=' + n + '→' + cols };
}

/* 칸이 모자란 행(n < COLS) — too-many 와 **같은 자리 점수 탐색**으로 편다 (작업 809).
 *
 * 둘은 같은 물음의 앞뒤다. too-many 는 «어디를 합치나», too-few 는 «어디에 빈 칸을 끼우나» 인데
 * 7칸의 자리 [2]~[6] 에 남은 칸 `c[2..n-1]` 을 **차례를 지켜** 나눠 담되 «빈 자리» 를 허용하면
 * 합치기와 끼우기가 한 탐색에 들어온다. 점수는 too-many 와 같은 `score()` 다 —
 * 고른 자리에서 구현 칸·루프 칸이 실제로 그 칸처럼 읽혀야 한다.
 *
 * ⚠ **«뒤에 빈 칸을 붙인다» 는 오답이다**(809 등재문). 799 의 5칸은
 *   `[ID][작업][주인원문][주 편집 구간][구현]` 이라 뒤로 두 칸을 붙이면 구현 칸이 «최고 점수»
 *   자리로 밀려 `verifyProgress` §2 가 엉뚱한 칸을 읽는다. 자리는 **점수로** 골라야 한다.
 *   실측(657 옛 5칸): 종료문을 구현 칸에 세우는 자리가 6점 · 뒤에 붙이는 자리가 3점이다.
 *
 * 동점 규칙은 too-many 와 같은 방향이다 — «앞칸으로 더 밀어 넣는» 쪽(경계 `cut` 이 큰 쪽).
 * too-many 의 «p·q 가 큰 쪽» 과 같은 뜻이다(앞 칸에 더 많이 합친다).
 */
function fixFewRow(sp) {
  const { cells, inco } = sp;
  const n = cells.length;
  const rest = n - 2;                     /* 자리 [0]#·[1]화면 은 고정 — 나머지를 다섯 자리에 담는다 */
  const SLOTS = COLS - 2;
  let best = null;
  const cut = new Array(SLOTS + 1).fill(0);   /* 자리 [2+k] 는 c[2+cut[k]] .. c[1+cut[k+1]] */
  const emit = () => {
    const out = [];
    for (let s = 0; s < SLOTS; s++) {
      out.push(cut[s] === cut[s + 1] ? '' : merge(cells, inco, 2 + cut[s], 1 + cut[s + 1]));
    }
    /* 동점 규칙 둘 — ① **덜 합치는** 쪽 ② 그래도 같으면 앞칸으로 더 미는 쪽(too-many 와 같은 방향).
       ①이 먼저인 이유: 빈 칸을 끼우는 것은 자리를 **비우는** 일이라 글이 제 칸에 남지만,
       합치는 것은 두 칸의 뜻을 **한 칸으로 뭉개는** 일이다. 실측(681 옛 6칸): 둘 다 8점인데
       «구간+미착수 를 측정표로 합치고 구현 칸에 «–» 를 남기는» 자리가 앞칸 규칙만으로는 이겼다. */
    let merges = 0;
    for (let s = 0; s < SLOTS; s++) if (cut[s + 1] > cut[s]) merges += cut[s + 1] - cut[s] - 1;
    const key = [score(out[0], out[1], out[2], out[3], out[4]) - blankCredit(out), -merges]
      .concat(cut.slice(1, SLOTS));
    if (!best || betterKey(key, best.key)) best = { key, cut: cut.slice(), out: [cells[0], cells[1]].concat(out) };
  };
  const walk = k => {
    if (k === SLOTS) { cut[SLOTS] = rest; emit(); return; }
    for (let v = cut[k]; v <= rest; v++) { cut[k + 1] = v; walk(k + 1); }
  };
  walk(0);
  return best;
}

/* `score()` 가 **빈 칸에** 준 점수를 되뺀다 — too-few 에서만 필요한 보정이다 (809).
 *
 * `score()` 는 «있는 표» 를 읽으라고 만든 자라 빈 칸을 후하게 본다: `BARE_IMPL` 이 빈
 * 구현 칸을 «–» 와 같이 3점 주고, `LOOP` 도 빈 루프 칸을 2점 주고, 빈 측정표가 1점이다.
 * too-many 에서는 그 빈 칸이 **표에 원래 있던 것**이라 증거지만, too-few 에서 빈 칸은
 * 우리가 방금 끼운 것이라 증거가 아니다 — 그대로 두면 «전부 비고에 몰고 앞칸을 다 비우는»
 * 자리가 이깁니다. 실측(681 옛 5칸): 그 퇴화 자리가 8점으로 정답(6점)을 눌렀다.
 * 그래서 «비어서 받은 점수» 만 정확히 되뺀다 — 채워진 칸의 점수는 손대지 않는다.
 */
function blankCredit(out) {
  let c = 0;
  if (!out[0].trim()) c += 1;                                   /* 빈 측정표 */
  if (!out[1].trim()) c += BARE_IMPL.test(out[1]) ? 3 : 0;      /* 빈 구현 칸 */
  if (!out[3].trim()) c += LOOP.test(out[3].trim()) ? 2 : 0;    /* 빈 루프 칸 */
  return c;
}

/* 점수 우선 · 동점이면 경계가 앞자리부터 큰 쪽(= 앞칸으로 더 밀어 넣는 쪽) */
function betterKey(a, b) {
  for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}

/* 한 행을 7칸으로 — 못 고치면 {line, why} 그대로 */
function fixRow(line) {
  const sp = split(line);
  if (!sp) return { line, why: 'unparsed' };
  const { cells, inco } = sp;
  const n = cells.length;
  if (n === COLS) return { line, why: null };
  if (n < 2) return { line, why: 'too-few(' + n + ')' };   /* ID·작업 칸조차 없으면 자리가 없다 */
  if (n < COLS) {
    const few = fixFewRow(sp);
    if (!few) return { line, why: 'no-candidate(' + n + ')' };
    const fl = sp.lead + '|' + few.out.join('|') + (sp.tail === null ? '' : '|' + sp.tail);
    if (!lossless(line, fl)) return { line, why: 'LOSSY' };
    return { line: fl, why: 'few n=' + n + '→' + COLS + ' cut=' + few.cut.join(',') + ' score=' + few.key[0] };
  }
  let best = null;
  for (let p = 1; p < n - 4; p++) {                     /* p===1 이면 측정표 칸을 «빈 칸» 으로 세운다 */
    const meas = p === 1 ? '' : merge(cells, inco, 2, p);
    const impl = cells[p + 1];
    for (let q = p + 2; q < n - 2; q++) {
      const bcol = merge(cells, inco, p + 2, q);
      const loop = cells[q + 1];
      const note = merge(cells, inco, q + 2, n - 1);
      const sc = score(meas, impl, bcol, loop, note);
      /* 동점이면 «뒤쪽 자리» — 앞칸(산문·구간)을 측정표로 더 밀어 넣는 쪽이 구현 칸에
         진짜 상태 표지를 남긴다(314·458·192 가 그 자리다) */
      const key = [sc, p, q];
      if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && (key[1] > best.key[1] ||
          (key[1] === best.key[1] && key[2] > best.key[2])))) {
        best = { key, p, q, out: [cells[0], cells[1], meas, impl, bcol, loop, note] };
      }
    }
  }
  if (!best) return { line, why: 'no-candidate(' + n + ')' };
  const nl = sp.lead + '|' + best.out.join('|') + (sp.tail === null ? '' : '|' + sp.tail);
  if (!lossless(line, nl)) return { line, why: 'LOSSY' };
  return { line: nl, why: 'p=' + best.p + ' q=' + best.q + ' n=' + n + ' score=' + best.key[0] + (best.p === 1 ? ' INSERT' : '') };
}

/* 우리가 넣은 것(구분자·`<br>`·`\|`)을 걷으면 옛 줄과 «글자 열» 이 같아야 한다 */
function lossless(oldLine, newLine) {
  const bare = s => s.split('\\|').join('\u0000').split('<br>').join('\u0000')
    .split('|').join('').split('\u0000').join('');
  return bare(oldLine) === bare(newLine);
}

function run(write) {
  const file = path.join(ROOT, REL);
  const src = fs.readFileSync(file, 'utf8').split('\n');
  const out = [];
  let changed = 0, stuck = 0;
  src.forEach((line, idx) => {
    const ln = idx + 1;
    if (!ROW.test(line)) { out.push(line); return; }
    const r = ln < HEAD_LINE ? fixHeadRow(line, 4) : fixRow(line);
    if (r.line !== line) {
      changed++;
      console.log('  L' + ln + ' ' + ROW.exec(line)[1] + ' — ' + r.why);
    } else if (r.why) {
      stuck++;
      console.log('  ✗ L' + ln + ' ' + ROW.exec(line)[1] + ' — 못 고침: ' + r.why);
    }
    out.push(r.line);
  });
  console.log('FIX572 — 바꿀 행 ' + changed + ' · 못 고친 행 ' + stuck + (write ? '' : ' (미리보기 — 쓰려면 --write)'));
  if (write && changed) fs.writeFileSync(file, out.join('\n'));
  return stuck ? 1 : 0;
}

if (require.main === module) process.exit(run(process.argv.includes('--write')));
module.exports = { scan, split, merge, score, fixRow, fixFewRow, fixHeadRow, lossless, COLS, HEAD_LINE, ROW };
