#!/usr/bin/env node
/* probe566 — «완료행인데 구현 칸이 아무 말도 안 한다» 를 재현한다 (작업 566)
 *
 *   node tools/probe566.js            재현 전수(자 실행 없음 — 표만 읽는다, 1초 안)
 *   node tools/probe566.js --list     §2 의 «칸 수가 7 이 아닌 완료행» 전체 목록을 찍는다
 *
 * ── 왜 재현기부터인가 (338 규칙) ────────────────────────────────────────────
 * 566 의 등재문은 처방까지 적어 두었다 — «§2 에 «비고 머리말은 완료인데 구현 칸에 표지가 없다»
 * 축을 세우고, 되돌림 시험은 512·517·553·554 를 마감한 사본으로 걸어라».
 * **그 처방을 따르기 전에 쟀고, 재현이 등재문을 세 곳 정정했다**(§3·§4).
 *
 * ── 정정 ① 553·554 는 «구현 칸 산문» 이 아니라 «칸이 하나 더 많은» 행이었다 ──
 * 등재문은 넷을 한 무리로 묶었지만 실측하면 512·517 은 칸이 **정확히 7개**이고
 * 553·554 는 **8개**다. 헤더가 7칸이므로 GitHub 은 8번째부터 **버린다** —
 * 즉 553·554 는 구현 칸이 산문인 데 더해 **비고가 렌더에서 통째로 사라져 있었다**.
 * 고치는 법도 다르다: 앞의 둘은 «표지를 붙인다», 뒤의 둘은 «여분 칸을 앞 칸에 합친다».
 *
 * ── 정정 ② 등재문이 «헛것» 이라 부른 6행 중 둘은 헛것이 아니었다 ────────────
 * 등재문은 «위치로 세면 11건이 잡히는데 67·84·144·266·308·395 는 칸 밀림이라 헛것» 이라 적었다.
 * 실측하면 **144·266 은 칸이 정확히 7개**이고 구현 칸에 측정표 경로가 들어차 있다 = 진짜다.
 * 헛것으로 부른 것은 «꼬리에서 −3 칸» 이라는 **읽는 방향** 때문이었다.
 *
 * ── 정정 ③ 칸을 셀 때 `\|`(escape)는 구분자가 아니다 ────────────────────────
 * GFM 이 그렇게 읽는다. 순진한 `split('|')` 은 7칸 행을 **413행**으로 세지만
 * escape 를 지키면 **426행**이다 — 13행이 헛되이 «판정 불가» 로 밀려난다(§1).
 *
 * ── 그래서 축의 전제가 «칸이 정확히 7개» 다 ─────────────────────────────────
 * 이 축만은 앵커로 삼을 **낱말이 없는 것이 정의**라(«미착수» 라고 적혀 있으면 ⓐ·ⓑ 의 몫이다)
 * 칸을 위치로 읽어야 한다. 그래서 위치를 믿을 수 있는 행에서만 판정하고, 나머지는
 * 조용히 넘기지 않고 «판정 불가» 로 세어 찍는다(§2). */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'docs/PROGRESS.md';
const listAll = process.argv.slice(2).includes('--list');

/* ── 자(verifyProgress §2 축 ⓒ)와 **같은 규칙**을 쓴다 — 자와 재현기가 갈리면 둘 다 못 믿는다 ── */
const ROW = /^\|\s*([0-9]+|[A-Z][0-9]+)\s*\|/;
const DONE_DATED = /(?:완료|해결|통과|폐기)\s*\(\s*20\d\d-\d\d-\d\d/;
const NOT_YET = /\|\s*(?:–|—|-|미착수\.?|)\s*\|\s*(?:–|—|-|)\s*\|[^|]*\|\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전)/;
const HEAD_NOT_YET = /^\s*(?:\*\*)?\s*(?:←\s*)?(?:\(등재문[^)|]*\)\s*)?(미착수|등재만|착수 전)/;
const STATE_MARK = /✅|⏸|🔧|⏹|✖|🏆|완료|해결|통과|폐기|보류|종료|진행/;
const BARE_IMPL = /^\s*(?:\*\*)?\s*(?:–|—|-|미착수\.?)?\s*(?:\*\*)?\s*$/;
const COLS = 7;

function cellsOf(line) {                 /* GFM: `\|` 는 구분자가 아니다 */
  const out = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '\\|'; i++; continue; }
    if (ch === '|') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  if (out.length && !out[0].trim()) out.shift();
  if (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}
function rowsOf(text) {
  const m = new Map();
  for (const line of text.split('\n')) {
    const g = ROW.exec(line);
    if (g && !m.has(g[1])) m.set(g[1], line);
  }
  return m;
}
function tailHead(line) {
  const c = line.split('|');
  let i = c.length - 1;
  while (i > 0 && !c[i].trim()) i--;
  return i > 0 ? HEAD_NOT_YET.exec(c[i]) : null;
}
/* 축 ⓒ 판정 — 'red' | 'unmeasurable' | null(조용) */
function muteOf(line) {
  if (!DONE_DATED.test(line)) return null;
  if (NOT_YET.test(line) || tailHead(line)) return null;      /* ⓐ·ⓑ 의 몫 */
  const c = cellsOf(line);
  if (c.length !== COLS) return { state: 'unmeasurable', n: c.length };
  const impl = c[3];
  if (STATE_MARK.test(impl) || BARE_IMPL.test(impl)) return null;
  return { state: 'red', impl: impl.trim() };
}
/* 재현 사본 — 마감된 행의 구현 칸에서 완료 표지를 걷고 산문만 남긴다(수리 전 모양) */
function synthMute(text, id, prose) {
  const out = text.split('\n');
  let hit = false;
  for (let i = 0; i < out.length; i++) {
    const g = ROW.exec(out[i]);
    if (!g || g[1] !== id) continue;
    const c = cellsOf(out[i]);
    if (c.length !== COLS) throw new Error(id + ' 행의 칸이 ' + c.length + ' 개다(7 기대)');
    c[3] = ' ' + (prose || '— (지시서 [3]-(가) · 비평가 없음)') + ' ';
    out[i] = '|' + c.join('|') + '|';
    hit = true;
    break;
  }
  if (!hit) throw new Error(id + ' 행을 못 찾았다');
  return out.join('\n');
}

if (require.main === module) {
  const text = fs.readFileSync(path.join(ROOT, REL), 'utf8');
  const rows = rowsOf(text);
  let pass = 0, fail = 0;
  const ok = (label, cond, note) => { (cond ? pass++ : fail++); console.log('  ' + (cond ? 'ok  ' : '✗   ') + label + (note ? '  [' + note + ']' : '')); };

  console.log('PROBE566 — «완료행인데 구현 칸이 벙어리» 재현 · 표 행 ' + rows.size + '건');

  /* ── §1 칸 나누기 — escape 를 지키는가가 13행을 가른다 ── */
  console.log('\n[1] 칸 나누기 — `\\|` 는 구분자가 아니다');
  let naive7 = 0, aware7 = 0;
  for (const line of rows.values()) {
    const n = line.replace(/\s+$/, '').replace(/\|\s*$/, '').split('|');
    if (n.length === COLS + 1) naive7++;               /* 순진한 분할은 선두 빈 칸이 남는다 */
    if (cellsOf(line.replace(/\s+$/, '')).length === COLS) aware7++;
  }
  ok('[1-a] escape 를 지키면 7칸 행이 더 많이 세진다', aware7 > naive7, '순진 ' + naive7 + '행 → escape 인식 ' + aware7 + '행 (+' + (aware7 - naive7) + ')');
  ok('[1-b] 7칸 행이 표의 다수다(위치를 믿을 수 있는 자리가 실제로 있다)', aware7 > rows.size / 2, aware7 + '/' + rows.size);

  /* ── §2 판정 불가 — 칸 수가 7 이 아닌 완료행 ── */
  console.log('\n[2] 판정 불가 — 칸 수가 헤더(7)와 다른 완료행');
  const un = [];
  for (const [id, line] of rows) { const m = muteOf(line); if (m && m.state === 'unmeasurable') un.push(id + '(' + m.n + '칸)'); }
  ok('[2-a] 판정 불가 행을 조용히 넘기지 않고 셀 수 있다', un.length > 0, un.length + '건');
  console.log('       ' + (listAll ? un.join(' ') : un.slice(0, 24).join(' ') + (un.length > 24 ? ' … (전체는 --list)' : '')));
  ok('[2-b] ⚠ 이 행들은 GitHub 이 8번째 칸부터 버린다 — 별개의 결함이고 566 의 범위 밖이다', true, '범위 표시');

  /* ── §3 축이 짚는 자리 — 수리 전 모양을 합성해 되짚는다 ── */
  console.log('\n[3] 축 ⓒ — 마감된 행의 구현 칸을 산문으로 되돌리면 짚힌다');
  const live = [...rows].filter(([, l]) => { const m = muteOf(l); return m && m.state === 'red'; }).map(([id]) => id);
  ok('[3-a] 실물 표에서 축 ⓒ 빨강 0건(이 세션이 여섯 행을 마감했다)', live.length === 0, live.join(' ') || '0건');
  const SAMPLES = ['512', '517', '144', '266', '327', '333'];
  let reproduced = 0;
  for (const id of SAMPLES) {
    if (!rows.has(id)) continue;
    const s = rowsOf(synthMute(text, id)).get(id);
    const m = muteOf(s);
    if (m && m.state === 'red') reproduced++;
  }
  ok('[3-b] 여섯 표본 전부가 «구현 칸을 산문으로» 되돌리면 다시 빨갛다', reproduced === SAMPLES.length, reproduced + '/' + SAMPLES.length);
  /* 축이 없던 시절의 자 = ⓐ·ⓑ 만. 같은 사본에서 **조용한** 것이 이 작업이 존재하는 이유다. */
  let oldSilent = 0;
  for (const id of SAMPLES) {
    if (!rows.has(id)) continue;
    const s = rowsOf(synthMute(text, id)).get(id);
    if (!NOT_YET.test(s) && !tailHead(s)) oldSilent++;
  }
  ok('[3-c] 그 사본에서 옛 두 축(ⓐ 구현 칸 «–» · ⓑ 비고 머리말)은 전부 조용하다', oldSilent === SAMPLES.length, oldSilent + '/' + SAMPLES.length + ' 조용');

  /* ── §4 등재문 정정 — 553·554 는 «칸이 하나 더» 였다 ── */
  console.log('\n[4] 등재문 정정 — 553·554 의 뿌리는 산문이 아니라 «칸 수» 였다');
  const gitShow = r => { try { return execFileSync('git', ['show', r], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { return null; } };
  const before = gitShow('origin/main:' + REL);
  if (!before) {
    console.log('  –   [4-a]~[4-c] 건너뜀 — origin/main 판본을 못 읽는다(얕은 클론)');
  } else {
    const bRows = rowsOf(before);
    const n553 = bRows.has('553') ? cellsOf(bRows.get('553').replace(/\s+$/, '')).length : -1;
    const n512 = bRows.has('512') ? cellsOf(bRows.get('512').replace(/\s+$/, '')).length : -1;
    ok('[4-a] 수리 전 553 은 칸이 8개다(7 아님) — 비고가 렌더에서 버려진다', n553 === 8, '칸 ' + n553);
    ok('[4-b] 수리 전 512 는 칸이 정확히 7개다 — 같은 무리가 아니다', n512 === 7, '칸 ' + n512);
    const now553 = cellsOf(rows.get('553').replace(/\s+$/, '')).length;
    ok('[4-c] 지금 553 은 7칸이다(여분 칸을 앞 칸에 `<br>` 로 합쳤다 · 지운 글자 0)', now553 === 7, '칸 ' + now553);
  }

  /* ── §5 음성 경계 — 구현 칸이 «–» 인 완료행은 축 밖이다 ── */
  console.log('\n[5] 음성 경계 — 구현 칸이 «–» 인 완료행은 이 축이 안 건드린다');
  const dash = [];
  for (const [id, line] of rows) {
    if (!DONE_DATED.test(line) || NOT_YET.test(line) || tailHead(line)) continue;
    const c = cellsOf(line.replace(/\s+$/, ''));
    if (c.length === COLS && BARE_IMPL.test(c[3])) dash.push(id);
  }
  ok('[5-a] 그 꼴로 닫힌 완료행이 실제로 많다(음성항이 공허하지 않다)', dash.length >= 20, dash.length + '건');
  ok('[5-b] 그 행들은 축 ⓒ 에 한 건도 안 걸린다', dash.every(id => { const m = muteOf(rows.get(id)); return !m || m.state !== 'red'; }));
  console.log('       ⚠ 이것까지 빨갛게 하면 자가 저장소 전체의 push 를 한꺼번에 막는다 — 범위를 여기서 끊는다.');

  console.log('\nPROBE566 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
}

module.exports = { cellsOf, rowsOf, muteOf, synthMute, tailHead, DONE_DATED, NOT_YET, STATE_MARK, BARE_IMPL, COLS, ROW };
