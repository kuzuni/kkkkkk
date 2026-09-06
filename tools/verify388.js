#!/usr/bin/env node
/* verify388 — «표가 «안 했다» 와 «했다» 를 동시에 말하는 행» 이 다시 생기면 빨개진다 (작업 388)
 *
 *   node tools/verify388.js
 *
 * 종료 코드: 0 = PASS · 1 = FAIL · 2 = 도구 오류
 *
 * ── 무엇을 지키는가 ────────────────────────────────────────────────────────
 * 374 가 심은 `verifyProgress` 는 «완료행이 **병합으로** 등재문으로 되돌아간다» 만 본다.
 * 388 이 찾은 것은 되돌림이 아니다 — `done(<ID>)` 커밋 **자신**이 완료문을 비고 칸 «끝에만»
 * 덧붙이고 구현 칸·루프 횟수·비고 머리말을 등재 상태로 남긴다. 이력과 차이가 없으니
 * §1 은 영원히 초록이고, 표를 읽는 다음 워커만 «미완료» 로 속는다.
 *
 * ── 무르게 풀지 않았음을 세 겹으로 못박는다 ────────────────────────────────
 *   §1  지금 표에 자기모순 0건 (실물)
 *   §R  되돌림 시험 — 마감된 세 행(308·371·378)을 **각각** 등재 상태로 되돌린 사본에서
 *       자가 그 ID 를 지목해 빨개지는가. 셋을 따로 묻는 이유는 «한 자리만 걸려도 초록이
 *       아니다» 를 세우기 위해서다(하나로 묶으면 나머지 둘이 죽어도 안 보인다).
 *   §N  음성항 — 되돌리지 **않은** 사본은 초록이고, «보류(199·67)·진행 중(72·351)·
 *       폐기(14)·진짜 미착수(379·384·385·386)» 행은 **어느 사본에서도** 안 잡힌다.
 *       이게 없으면 «아무거나 흔들면 빨개지는» 항등식이다.
 *
 * ⚠ §R 은 이력(git)에서 옛 판본을 꺼내 오지 **않는다.** 루틴 컨테이너의 클론은 얕아서
 *   커밋 하나를 상수로 박으면 그 게이트는 얕은 창에서 즉사한다(388 §5 곁다리 관측).
 *   대신 «지금 행» 을 등재 모양으로 **되짚어** 만든다 — 자리를 리터럴에서 빼는 368 처방과 같은 축이다.
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'docs/PROGRESS.md';
const SRC = path.join(ROOT, REL);
const GATE = path.join(ROOT, 'tools', 'verifyProgress.js');

let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log('  ok  ' + m + (d ? '  [' + d + ']' : '')); };
const no = (m, d) => { fail++; console.log('  ✗   ' + m + (d ? '  [' + d + ']' : '')); };
const chk = (c, m, d) => (c ? ok : no)(m, d);

const text = fs.readFileSync(SRC, 'utf8');
const lines = text.split('\n');
const ROW = /^\|\s*([0-9]+|[A-Z][0-9]+)\s*\|/;
const idxOf = id => lines.findIndex(l => { const g = ROW.exec(l); return g && g[1] === id; });
/* 자와 같은 두 모양 — §N 의 «진짜 미착수» 표본을 표에게 물어서 고르는 데 쓴다(리터럴 금지)
   ⚠ **자와 같아야 한다** — 이 모양이 `verifyProgress.js` 의 `NOT_YET` 과 어긋나면 §N 은
   «자가 못 보는 자리» 를 표본으로 골라 놓고 조용하다(작업 422 가 그렇게 빨개졌다). */
const NOT_YET_SHAPE = /\|\s*(?:–|—|-|미착수\.?|)\s*\|\s*(?:–|—|-|)\s*\|[^|]*\|\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전|등재문(?!\s*\())/;
const DONE_DATED_MARK = /(?:완료|해결|통과|폐기)\s*\(\s*20\d\d-\d\d-\d\d/;
/* 자의 두 번째 축(작업 445) — «비고 칸의 머리말» 만 읽는다. 위 ⚠ 가 여기에도 그대로 적용된다:
   `verifyProgress.js` 의 `HEAD_NOT_YET`/`tailHead` 와 **같은 모양이어야** §N3 이 «자가 못 보는
   자리» 를 표본으로 골라 놓고 조용해지지 않는다. */
const HEAD_NOT_YET_SHAPE = /^\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전|등재문(?!\s*\())/;
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
const tailCell = line => {
  const c = cellsRaw(line);          /* escape 를 지켜 나눈다 — 960 */
  let i = c.length - 1;
  while (i > 0 && !c[i].trim()) i--;
  return i > 0 ? { i, cells: c } : null;
};
/* «세 칸 중 ③ 만 안 고친» 모양으로 되짚는다 — 구현·점수·횟수는 **완료 상태 그대로 두고**
   비고 머리말만 등재 상태로 돌린다. §R·§R2 의 되짚기(세 칸을 통째로 등재로)와 다른 축이다. */
function toHeadOnlyEnrolled(line) {
  const t = tailCell(line);
  if (!t) return null;
  const body = t.cells[t.i].trim().replace(/^\*\*/, '');
  t.cells[t.i] = ' **←(등재문) 미착수 · ' + body;
  return t.cells.join('|');
}

/* 마감 표시를 등재 모양으로 되짚는다 — 구현·점수·횟수 세 칸에는 `|` 가 없으므로
   «(등재문 …)» 표지에서 파이프를 넷 되짚으면 정확히 그 세 칸의 앞에 선다. */
/* 되짚는 «등재 모양» 은 하나가 아니다(작업 422) — 표의 관행이 그 사이 둘 더 늘었고,
   자가 그 둘을 못 읽는 동안 §N 의 표본은 **0건**이었다. 세 관행을 각각 되짚어 건다. */
const ENROLL_STYLES = {
  old:   { impl: '–', head: '**미착수 · ', why: '옛 관행 — 구현 «–» · 머리말 «미착수»' },
  arrow: { impl: '–', head: '**←(등재문) 미착수 · ', why: '지금 관행 ⓐ — 머리말 앞에 «←(등재문)» 표지(409·415·416·419~424)' },
  impl:  { impl: '미착수.', head: '**미착수.** ', why: '지금 관행 ⓑ — 구현 칸에 «–» 대신 «미착수.»(425~430)' },
};
function toEnrolled(line, styleKey) {
  const st = ENROLL_STYLES[styleKey || 'old'];
  const i = line.indexOf('**(등재문');
  if (i < 0) return null;
  let p = line.lastIndexOf('|', i);          if (p < 0) return null;
  let p2 = line.lastIndexOf('|', p - 1);     if (p2 < 0) return null;
  let p3 = line.lastIndexOf('|', p2 - 1);    if (p3 < 0) return null;
  let p4 = line.lastIndexOf('|', p3 - 1);    if (p4 < 0) return null;
  const body = line.slice(i).replace(/^\*\*\(등재문[^)]*\)\*\*\s*/, '');
  return line.slice(0, p4) + '| ' + st.impl + ' | – | 0/5 | ' + st.head + body;
}

/* 사본을 임시 파일로 떠서 자에게 물린다. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'verify388-'));
function askGate(bodyLines, tag) {
  const f = path.join(TMP, tag + '.md');
  fs.writeFileSync(f, bodyLines.join('\n'));
  const r = spawnSync('node', [GATE, '--file', f], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

console.log('VERIFY388 — PROGRESS 자기모순 자');
console.log('');

/* ── §1 실물 ── */
console.log('[1] 지금 표');
const live = askGate(lines, 'live');
chk(live.code === 0, '자기모순 0건 — 자가 초록이다', '종료 코드 ' + live.code);
chk(/§2 자기모순 검사/.test(live.out), '§2 절이 실제로 돌았다(요약에 찍힌다) — 항이 조용히 빠지지 않았다');
chk(!/SELF-CONTRADICTION/.test(live.out), '실물에 SELF-CONTRADICTION 없음');

/* ── §R 되돌림 시험 ── */
console.log('');
console.log('[R] 되돌림 시험 — 마감된 행을 등재 상태로 되돌리면 그 ID 를 지목해 빨개지는가');
const CLOSED = ['308', '371', '378'];
for (const id of CLOSED) {
  const i = idxOf(id);
  if (i < 0) { no('행 ' + id + ' 을 찾지 못했다'); continue; }
  const rev = toEnrolled(lines[i], 'old');
  if (rev == null) { no(id + ' — «(등재문 …)» 표지가 없다(마감 문구가 바뀌었으면 이 자를 같이 고쳐라)'); continue; }
  chk(/\|\s*–\s*\|\s*–\s*\|\s*0\/5\s*\|\s*\*\*미착수/.test(rev), '[R-' + id + '] 사본이 실제로 등재 모양이다(구현 – · 0/5 · 미착수)');
  const copy = lines.slice(); copy[i] = rev;
  const r = askGate(copy, 'rev' + id);
  chk(r.code === 1, '[R-' + id + '] 자가 빨갛다', '종료 코드 ' + r.code);
  chk(new RegExp('✗ ' + id + ' — 자기모순').test(r.out), '[R-' + id + '] 그 ID 를 지목한다');
  /* 445 가 축을 하나 더 세운 뒤로는 «어느 축으로 잡았나» 까지 물어야 한다 — 두 축이 겹치는
     자리(옛 관행 행)에서 구체적인 쪽이 먼저 대야 «구현 칸이 비었다» 는 진단이 안 사라진다. */
  chk(new RegExp('✗ ' + id + ' — 자기모순 · 구현 칸이 «–»').test(r.out),
      '[R-' + id + '] **구현 칸 축**으로 지목한다 — 머리말 축이 그것을 가리지 않는다(445)');
  /* 음성 짝 — 나머지 두 자리는 그 사본에서 조용해야 한다(«하나 흔들면 다 빨개지는» 자가 아니다) */
  const others = CLOSED.filter(x => x !== id);
  chk(others.every(x => !new RegExp('✗ ' + x + ' — 자기모순').test(r.out)),
      '[R-' + id + '] 나머지 ' + others.join('·') + ' 는 조용하다');
}

/* ── §R2 되돌림 시험 — «지금 표가 실제로 쓰는» 등재 관행으로도 걸리는가 (작업 422) ──
 * §R 은 옛 관행(구현 «–» · 머리말 «미착수») 하나로만 걸어서, 표가 관행을 바꾼 뒤에도 초록이었다.
 * 그 사이 자는 **지금 표의 등재행을 한 줄도 못 읽고 있었다**(§N 표본 0건 = [N] 하한이 빨개진 자리).
 * ⇒ 두 관행 각각으로 되짚어 «자가 빨갛고 그 ID 를 지목하는지» 를 묻는다.
 *   이 절이 이 수리가 무르지 않음을 못박는다 — 넓힌 모양을 되돌리면 여기가 즉시 빨개진다. */
console.log('');
console.log('[R2] 지금 등재 관행으로 되돌려도 걸리는가 (422 — 관행이 자를 앞질러 갔던 자리)');
{
  const id = '371';                                /* 마감된 행 하나면 충분하다 — 관행별로 묻는 절이다 */
  const i = idxOf(id);
  if (i < 0) no('[R2] 행 ' + id + ' 을 찾지 못했다');
  else for (const key of ['arrow', 'impl']) {
    const st = ENROLL_STYLES[key];
    const rev = toEnrolled(lines[i], key);
    if (rev == null) { no('[R2-' + key + '] «(등재문 …)» 표지가 없다'); continue; }
    chk(NOT_YET_SHAPE.test(rev), '[R2-' + key + '] 사본이 실제로 그 관행의 등재 모양이다', st.why);
    const copy = lines.slice(); copy[i] = rev;
    const r = askGate(copy, 'r2' + key);
    chk(r.code === 1, '[R2-' + key + '] 자가 빨갛다', '종료 코드 ' + r.code);
    chk(new RegExp('✗ ' + id + ' — 자기모순').test(r.out), '[R2-' + key + '] 그 ID 를 지목한다');
  }
  /* 음성 짝 — 넓힌 모양이 «완료행» 까지 끌어오지 않는다(넓히다 새면 여기가 빨개진다) */
  const live2 = live.out;
  chk(!/✗ .* — 자기모순/.test(live2), '[R2] 넓힌 뒤에도 실물 표는 빨간 행 0건이다(넓히기가 완료행으로 안 샌다)');
}

/* ── §R3 되돌림 시험 — «세 칸 중 ③ 만 안 고친» 행 (작업 445) ──────────────────
 * 388 이 닫은 것은 사고의 절반이다: `NOT_YET` 은 구현 칸까지 등재 상태인 행만 본다.
 * 실물 표에 **5건**(310·337·353·382·383)이 «구현 ✅ + 머리말 미착수» 로 있었고,
 * 그중 383 은 2026-08-30 에 워커 H 가 실제로 **재선점**해 회차를 놓았다.
 * ⇒ 구현·점수·횟수는 **완료 그대로 두고** 머리말만 되돌린 사본에서 자가 빨간지 묻는다.
 *   이 절이 445 의 수리가 무르지 않음을 못박는다 — `tailHead` 축을 빼면 여기가 즉시 빨개진다. */
console.log('');
console.log('[R3] 세 칸 중 ③(비고 머리말) 만 되돌려도 걸리는가 (445 — 388 이 닫은 절반의 나머지)');
{
  /* 표본을 리터럴로 박지 않는다 — «완료 표지가 있고 머리말은 정상인» 행을 표에게 물어 고른다. */
  const done = lines.filter(l => ROW.test(l) && DONE_DATED_MARK.test(l) &&
                                 !NOT_YET_SHAPE.test(l) &&
                                 !(tailCell(l) && HEAD_NOT_YET_SHAPE.test(tailCell(l).cells[tailCell(l).i])));
  chk(done.length >= 3, '[R3] 되짚을 «완료 + 머리말 정상» 행이 실제로 있다', done.length + '건');
  for (const line of done.slice(0, 3)) {
    const id = ROW.exec(line)[1];
    const i = idxOf(id);
    const rev = toHeadOnlyEnrolled(line);
    if (rev == null) { no('[R3-' + id + '] 비고 칸을 못 찾았다'); continue; }
    chk(!NOT_YET_SHAPE.test(rev),
        '[R3-' + id + '] 사본은 **옛 축으로는 안 걸린다** — 구현 칸이 완료 그대로다(이게 445 의 사각이었다)');
    const copy = lines.slice(); copy[i] = rev;
    const r = askGate(copy, 'r3' + id);
    chk(r.code === 1, '[R3-' + id + '] 자가 빨갛다', '종료 코드 ' + r.code);
    chk(new RegExp('✗ ' + id + ' — 자기모순 · 구현 칸은 채웠는데').test(r.out),
        '[R3-' + id + '] 그 ID 를 **머리말 축**으로 지목한다(진단이 구체적이다)');
  }
}

/* ── §N 음성항 ── */
console.log('');
console.log('[N] 음성항 — 정상 행을 빨갛게 만들지 않는다');
const QUIET = { '199': '⏸ 보류(주인 지시)', '67': '⏸ 보류', '72': '🔧 진행 중', '351': '진행 중', '14': '✖ 폐기' };
/* ⚠ 진짜 미착수 표본을 **리터럴로 박지 마라** — 그 행들은 끝나면 사라진다(379 가 이 자를 한 번 빨갛게 했다:
   done(379) 가 상류에서 올라오자 «미착수 표본» 이 아니게 됐다). 표에게 물어서 고른다(368 처방). */
const NOTYET = lines
  .filter(l => ROW.test(l) && NOT_YET_SHAPE.test(l) && !DONE_DATED_MARK.test(l))
  .map(l => ROW.exec(l)[1]);
for (const [id, why] of Object.entries(QUIET)) {
  const i = idxOf(id);
  if (i < 0) { no('행 ' + id + ' 을 찾지 못했다'); continue; }
  chk(!new RegExp('✗ ' + id + ' — 자기모순').test(live.out), '[N] ' + id + ' (' + why + ') 는 안 잡힌다');
}
/* ── 하한을 «표의 미착수 재고» 에 걸지 않는다 (작업 573) ─────────────────────
 * 379 는 표본을 **리터럴로** 박아서 이 자를 빨갛게 했고, 처방은 «표에게 물어라» 였다.
 * 그런데 표에게 묻는 것도 **움직이는 것을 손가락으로 가리키는 일**이다 — 재고는 마른다.
 * 실제로 573 이 닫히는 순간 §N3 재고가 3 → **2** 로 내려가 «축은 멀쩡한데» 빨개졌고,
 * §N 은 그때 정확히 **3건**(548·570·572)이라 다음 워커가 하나만 닫아도 같은 자리에서 터진다.
 * (573 이 `probe566` 에서 잡은 것과 같은 병 — 표본이 낡은 게 아니라 손가락이 움직인다.)
 *   ⇒ 하한이 지키려던 뜻은 «빈 배열로 초록이 아니다» 하나다. 그 뜻은 **합성 표본**이 지킨다:
 *     표에 없는 번호로 «완료 표지 없음 + 미착수» 행을 얹고 그 행이 안 잡히는지 묻는다.
 *     재고와 무관하게 이 음성항은 늘 한 건을 본다(333 — 자리를 비우지 않는다).
 *     실물 재고는 **있는 대로 전부** 검사한다(줄이지 않았다 · 하한만 뺐다).
 * ⚠ 합성 행은 임시 사본에만 얹는다 — `docs/PROGRESS.md` 는 한 글자도 안 건드린다. */
const SYN_ID = '9001';                    /* 표의 «가장 큰 번호 + 1» 규칙 밖 — 자 전용, 실물에 안 들어간다 */
const SYN_ROW = '| ' + SYN_ID + ' | **합성 음성 표본(자 전용 — 실물 표에 없는 번호)** | – | 미착수. | – | 0/5 |' +
                ' **←(등재문) 미착수 · 자가 만든 표본** |';
function synNegative(tag, label) {
  const r = askGate(lines.concat([SYN_ROW]), tag);
  chk(!new RegExp('✗ ' + SYN_ID + ' — 자기모순').test(r.out), label);
  return r;
}
chk(ROW.test(SYN_ROW) && NOT_YET_SHAPE.test(SYN_ROW) && !DONE_DATED_MARK.test(SYN_ROW) &&
    (() => { const t = tailCell(SYN_ROW); return !!t && HEAD_NOT_YET_SHAPE.test(t.cells[t.i]); })(),
    '[N-합성] 전제: 합성 행이 실제로 «완료 표지 없음 + 구현 칸·머리말 둘 다 미착수» 모양이다');
synNegative('nsyn', '[N-합성] 재고가 말라도 이 음성항은 산다 — 합성 미착수 행은 안 잡힌다');
console.log('       ⓘ 실물 미착수 재고 ' + NOTYET.length + '건: ' + (NOTYET.join(' ') || '0건') +
            ' — 재고는 있는 대로 전부 검사하되 **하한은 안 건다**(573: 재고는 마른다).');
for (const id of NOTYET) {
  chk(!new RegExp('✗ ' + id + ' — 자기모순').test(live.out),
      '[N] ' + id + ' (진짜 미착수 — 완료 표지 없음) 는 안 잡힌다');
}
/* §N3 (445) — 머리말 축이 **진짜 미착수 행**을 끌어오지 않는다.
   머리말만 보는 축이라 «완료 표지가 없다» 는 조건 하나가 그 행들을 지킨다.
   ⚠ 표본을 리터럴로 박지 않는다(379 선례) · ⚠ 하한도 재고에 걸지 않는다(573 — 바로 위 주석). */
{
  const tailOnly = lines.filter(l => {
    if (!ROW.test(l) || DONE_DATED_MARK.test(l)) return false;
    const t = tailCell(l);
    return t && HEAD_NOT_YET_SHAPE.test(t.cells[t.i]);
  }).map(l => ROW.exec(l)[1]);
  synNegative('n3syn', '[N3-합성] 재고가 말라도 이 음성항은 산다 — 머리말이 «미착수» 인 합성 행은 안 잡힌다');
  console.log('       ⓘ 실물 머리말 재고 ' + tailOnly.length + '건: ' +
              (tailOnly.slice(0, 8).join(' ') || '0건') + (tailOnly.length > 8 ? ' …' : ''));
  for (const id of tailOnly) {
    chk(!new RegExp('✗ ' + id + ' — 자기모순').test(live.out),
        '[N3] ' + id + ' (완료 표지 없음 — 진짜 미착수) 는 머리말이 «미착수» 여도 안 잡힌다');
  }
}

/* 가장 짧은 음성항: «미착수» 라는 낱말만으로는 절대 안 빨개진다 */
{
  /* 마감된 행은 «미착수» 를 산문으로 **인용**한다(등재문 본문을 안 지우므로). 그 인용만으로 빨개지면 안 된다.
     ⚠ 여기서도 ID 를 박지 않는다 — 표에게 묻고 하한을 건다(379 가 리터럴 표본으로 한 번 물렸다). */
  const quoting = lines.filter(l => ROW.test(l) && /미착수/.test(l) && DONE_DATED_MARK.test(l)).map(l => ROW.exec(l)[1]);
  chk(quoting.length >= 1, '[N] «미착수» 를 인용하면서 완료 표지도 가진 행이 실제로 있다', quoting.length + '건: ' + quoting.join(' '));
  for (const id of quoting) {
    chk(!new RegExp('✗ ' + id + ' — 자기모순').test(live.out),
        '[N] ' + id + ' 는 «미착수» 를 **인용**할 뿐인데 안 잡힌다 — 산문 인용은 머리말이 아니다');
  }
}

/* ── §S 창 정직성 ── */
console.log('');
console.log('[S] 못 보는 것을 초록으로 부르지 않는다');
const shallow = fs.existsSync(path.join(ROOT, '.git', 'shallow'));
if (shallow) chk(/얕은 클론/.test(live.out), '[S] 얕은 클론에서 §1 의 창 크기를 ⚠ 로 밝힌다');
else ok('[S] 얕은 클론이 아니다 — 경고 불필요', 'shallow 없음');

/* ── §P probe 동거 ── */
console.log('');
console.log('[P] 재현기');
{
  const r = spawnSync('node', [path.join(ROOT, 'tools', 'probe388.js')], { cwd: ROOT, encoding: 'utf8' });
  chk(r.status === 0, '[P] probe388 이 초록이다(자기모순 0건)', '종료 코드 ' + r.status);
  chk(/\[4\] 음성항/.test(r.stdout || ''), '[P] probe388 이 음성항 절을 갖고 있다');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log('');
console.log('VERIFY388 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
