#!/usr/bin/env node
/* 807 — «verifyProgress 가 모두에게 빨갛다»(칸 수가 헤더 7 과 다른 행) 재현기.
 *
 * 등재문(2026-09-02, sess-0742-27872 워커 C)이 말한 상태는 이랬다:
 *   UNJUDGEABLE 3건 — 720(칸 8) · 799(칸 5) · 800(칸 5)  ⇒ 종료 코드 1
 * 지시서 [4] 가 «push 전 종료 코드 0» 을 못박으므로 그 동안은 **어느 워커도 규칙을 못 지킨다.**
 *
 * ⚠ 이 자는 **고정 SHA 를 안 판다**(ROUTINE «얕은 클론 주의» — 9d4d25b 는 곧 창 밖이다).
 * 대신 지금 트리의 행에서 두 결손을 **되만들어** 재현한다. 둘 다 무손실 변환이라
 * 글자는 한 자도 안 지운다:
 *   · too-many(8) — 칸 하나를 `<br>` 자리에서 갈라 8칸으로   (720 이 그랬다)
 *   · too-few(5)  — 뒤 세 칸을 `<br>` 로 합쳐 5칸으로        (799·800 이 그랬다)
 *
 * 절:
 *   [1] 재현   — 되만든 표에 자를 대면 빨강이고, 이름을 셋 다 부른다
 *   [2] 현재   — 지금 작업 트리는 초록(UNJUDGEABLE 0) = 등재된 결손은 해소됐다
 *   [3] 갈래   — `fix572` 는 too-many 만 편다(too-few 는 «못 고침» 이라고 말한다)
 *   [R] 되돌림 — 멀쩡한 7칸 행은 빨강으로 안 센다(자에 이가 있는지)
 *
 * 쓰기: node tools/probe807.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'PROGRESS.md');
const fix572 = require('./fix572.js');

let pass = 0, fail = 0;
const ok = (tag, cond, msg) => {
  if (cond) { pass++; console.log('  ✓ ' + tag + ' — ' + msg); }
  else { fail++; console.log('  ✗ ' + tag + ' — ' + msg); }
};

/* ── 되만들기 ─────────────────────────────────────────────────────────────── */

/* 뒤 n 칸을 `<br>` 로 합쳐 칸 수를 줄인다 (799·800 의 «too-few» 모양) */
function squeezeTail(line, drop) {
  const sp = fix572.split(line);
  if (!sp || sp.cells.length !== fix572.COLS) return null;
  const c = sp.cells.slice();
  const merged = c.splice(fix572.COLS - 1 - drop, drop + 1).join('<br>');
  c.push(merged);
  return sp.lead + '|' + c.join('|') + (sp.tail === null ? '' : '|' + sp.tail);
}

/* 칸 하나를 `<br>` 자리에서 갈라 칸 수를 늘린다 (720 의 «too-many» 모양) */
function splitOnce(line) {
  const sp = fix572.split(line);
  if (!sp || sp.cells.length !== fix572.COLS) return null;
  const c = sp.cells.slice();
  for (let i = c.length - 1; i >= 2; i--) {
    const at = c[i].indexOf('<br>');
    if (at < 0) continue;
    const head = c[i].slice(0, at), tail = c[i].slice(at + 4);
    c.splice(i, 1, head, tail);
    return sp.lead + '|' + c.join('|') + (sp.tail === null ? '' : '|' + sp.tail);
  }
  return null;
}

const src = fs.readFileSync(SRC, 'utf8').split('\n');
const rowAt = id => src.findIndex(l => new RegExp('^\\|\\s*' + id + '\\s*\\|').test(l));

/* 자를 돌리고 «종료 코드 + 찍힌 글» 을 돌려준다.
   ⚠ `| tail` 로 물리면 tail 의 코드가 찍힌다 — 807 등재문이 남긴 교훈이라 여기선 절대 안 판다. */
function gauge(file) {
  try {
    const out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'verifyProgress.js'), '--file', file, '--no-gate'],
      { encoding: 'utf8', cwd: ROOT, maxBuffer: 1 << 26 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

function writeTmp(lines, name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'probe807-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, lines.join('\n'));
  return p;
}

/* ── [1] 재현 ─────────────────────────────────────────────────────────────── */
console.log('\n[1] 재현 — 등재된 세 모양(720 칸 8 · 799·800 칸 5)을 되만들어 자를 댄다');

const BROKEN = [
  { id: '720', how: splitOnce, want: 8 },
  { id: '799', how: l => squeezeTail(l, 2), want: 5 },
  { id: '800', how: l => squeezeTail(l, 2), want: 5 },
];

const broke = src.slice();
let built = 0;
for (const b of BROKEN) {
  const i = rowAt(b.id);
  const nl = i < 0 ? null : b.how(src[i]);
  const n = nl ? fix572.split(nl).cells.length : -1;
  ok('[1-' + b.id + ']', nl !== null && n === b.want,
    b.id + ' 행을 칸 ' + n + ' 로 되만들었다(목표 ' + b.want + ')');
  if (nl && n === b.want) { broke[i] = nl; built++; b.line = nl; }
}
ok('[1-a]', built === 3, '세 행을 다 되만들었다 (' + built + '/3)');

const bad = gauge(writeTmp(broke, 'PROGRESS.md'));
ok('[1-b]', bad.code === 1, '되만든 표에 자를 대면 **종료 코드 1** 이다 (실측 ' + bad.code + ')');
ok('[1-c]', /PROGRESS UNJUDGEABLE 3건/.test(bad.out),
  '«UNJUDGEABLE 3건» 이라고 말한다' + (/PROGRESS UNJUDGEABLE (\d+)건/.exec(bad.out) ? '' : ' — 안 나왔다'));
for (const b of BROKEN) {
  ok('[1-d' + b.id + ']', new RegExp('✗ ' + b.id + ' — 판정 불가').test(bad.out),
    b.id + ' 를 이름으로 부른다');
}
ok('[1-e]', /fix572/.test(bad.out), '고치는 법(`fix572`)까지 찍는다 — 자가 자기 처방을 말한다');

/* ── [2] 현재 트리 ────────────────────────────────────────────────────────── */
console.log('\n[2] 현재 — 지금 작업 트리에서 등재된 결손이 남아 있는가');

const now = gauge(SRC);
ok('[2-a]', now.code === 0, '작업 트리 자는 **종료 코드 0** 이다 (실측 ' + now.code + ')');
ok('[2-b]', !/PROGRESS UNJUDGEABLE/.test(now.out), 'UNJUDGEABLE 0건 — 판정 불가 행이 없다');
ok('[2-c]', /축 ⓓ 판정 불가 0/.test(now.out), '§2 가 «축 ⓓ 판정 불가 0» 을 찍는다');
for (const b of BROKEN) {
  const i = rowAt(b.id);
  const n = i < 0 ? -1 : fix572.split(src[i]).cells.length;
  ok('[2-d' + b.id + ']', n === fix572.COLS, b.id + ' 행은 지금 칸 ' + n + ' (헤더 ' + fix572.COLS + ')');
}

/* ── [3] 갈래 ─────────────────────────────────────────────────────────────── */
console.log('\n[3] 갈래 — `fix572` 가 어느 쪽을 펴는가 (등재문 ⓐ·ⓑ)');
console.log('  ⚑ **방향 이관(809)** — 807 때 이 절은 «too-few 는 못 고친다» 를 못박는 절이었다.');
console.log('    809 가 그 비대칭을 없앴으므로 같은 관측점에서 **편다** 를 묻는다(333 처방).');

for (const b of BROKEN) {
  if (!b.line) { ok('[3-' + b.id + ']', false, '되만든 행이 없어 못 잰다'); continue; }
  const r = fix572.fixRow(b.line);
  const n = r.line === b.line ? -1 : fix572.split(r.line).cells.length;
  const kind = b.want > fix572.COLS ? 'too-many' : 'too-few';
  ok('[3-' + b.id + ']', n === fix572.COLS,
    kind + '(' + b.want + ') 는 자동으로 7칸이 된다 (실측 ' + n + ' · ' + r.why + ')');
  ok('[3-' + b.id + 'L]', r.line !== b.line && fix572.lossless(b.line, r.line),
    '무손실 — 글자는 한 자도 안 지웠다');
}
console.log('  ⚑ 807 이 남긴 잔여(too-few 비대칭)는 809 가 닫았다 — 이제 양방향 모두 자동이다.');

/* ── [4] 자 둘이 갈라진다 ─────────────────────────────────────────────────── */
console.log('\n[4] 두 자 — 같은 축(«칸 7»)을 `verify572` 와 `verifyProgress` 가 따로 잰다');

/* 7칸 행에서 «종료 표지가 구현 칸 밖으로 밀린 5칸» 을 되만든다 (657 이 그 모양이었다) */
function unfix(line) {
  const sp = fix572.split(line);
  if (!sp || sp.cells.length !== fix572.COLS) return null;
  const c = sp.cells;
  const at = c[2].indexOf('<br>**주 편집 구간**: ');
  if (at < 0) return null;
  const out = [c[0], c[1], c[2].slice(0, at), c[2].slice(at + 21), c[3]];   /* 뒤 세 칸을 버린다 */
  return sp.lead + '|' + out.join('|') + (sp.tail === null ? '' : '|' + sp.tail);
}

const cur = fs.readFileSync(SRC, 'utf8').split('\n');
const at657 = cur.findIndex(l => /^\|\s*657\s*\|/.test(l));
const old657 = at657 < 0 ? null : unfix(cur[at657]);
ok('[4-a]', old657 !== null && fix572.split(old657).cells.length === 5,
  '657 을 옛 5칸 모양으로 되만들었다');

if (old657) {
  const t = cur.slice(); t[at657] = old657;
  const g = gauge(writeTmp(t, 'PROGRESS.md'));
  /* ⚑ 여기가 이 절의 본체 — 807 때는 종료 표지가 구현 칸 밖으로 밀리면 §2 가 그 행을 «미착수» 로
     보고 첫 `continue` 로 건너뛰어 **보기 전에 놓쳤다**(축 ⓓ 범위 = «완료 표지가 있는 행»).
     809 가 범위를 «칸 수가 7이 아닌 행 전부» 로 넓혔으므로 같은 관측점에서 **짖는다** 를 묻는다. */
  ok('[4-b]', g.code === 1 && /PROGRESS UNJUDGEABLE/.test(g.out) && /✗ 657 — 판정 불가/.test(g.out),
    '⏹ 종료 표지가 밀려난 5칸 행에 `verifyProgress` 가 **657 을 이름으로 부른다**(종료 코드 ' + g.code + ') — 809 축 ⓓ 개정');
  const v = (() => {
    try { execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify572.js')],
      { encoding: 'utf8', cwd: ROOT, maxBuffer: 1 << 26 }); return 0; }
    catch (e) { return e.status === undefined ? -1 : e.status; }
  })();
  ok('[4-c]', v === 0, '같은 순간 `verify572` 는 작업 트리(7칸)에 **초록**이다 — 자를 둘 다 봐야 한다');
  console.log('  ⚑ 지시서 [4] 는 push 게이트로 `verifyProgress` 만 지목한다 — 807 때는 그래서 이 모양이');
  console.log('    **아무에게도 안 짖었다**(657·681 이 실제로 그 상태로 섰고 `verify572` 만 16/17 로 빨갰다).');
  console.log('    809 가 축 ⓓ 범위를 넓혀 그 자리를 지목받는 자 쪽으로 옮겼다 — 게이트는 그대로 하나다.');
}

/* 지금 표에는 그 모양이 하나도 없어야 한다 */
const off = [];
cur.forEach((l, i) => {
  if (i + 1 <= fix572.HEAD_LINE || !fix572.ROW.test(l)) return;
  const sp = fix572.split(l);
  if (sp && sp.cells.length !== fix572.COLS) off.push(fix572.ROW.exec(l)[1] + '(' + sp.cells.length + '칸·L' + (i + 1) + ')');
});
ok('[4-d]', off.length === 0, '지금 표에 7칸이 아닌 행이 하나도 없다' + (off.length ? ' — ' + off.join(' ') : ''));

/* ── [R] 되돌림 시험 ──────────────────────────────────────────────────────── */
console.log('\n[R] 되돌림 — 자에 이가 있는가 (멀쩡한 표를 빨갛다고 하면 [1] 은 헛초록이다)');

/* 되만든 표에서 한 행만 되돌려 놓으면 «3건» 이 «2건» 으로 줄어야 한다 */
const half = broke.slice();
half[rowAt('799')] = src[rowAt('799')];
const h = gauge(writeTmp(half, 'PROGRESS.md'));
ok('[R-a]', /PROGRESS UNJUDGEABLE 2건/.test(h.out),
  '799 만 되돌리면 «UNJUDGEABLE 2건» 으로 준다 — 자가 행을 하나씩 센다');
ok('[R-b]', !/✗ 799 — 판정 불가/.test(h.out), '되돌린 799 는 더는 안 불린다');
ok('[R-c]', h.code === 1, '남은 두 행 때문에 여전히 종료 코드 1 이다');

console.log('\nPROBE807 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL' : ' — PASS'));
process.exit(fail ? 1 : 0);
