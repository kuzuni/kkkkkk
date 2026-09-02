#!/usr/bin/env node
/* 809 — «칸 수 결손의 절반이 무음이다» 의 게이트.
 *
 * 807 이 남긴 잔여 둘을 닫은 자리를 지킨다:
 *   ⓐ `fix572` 가 **too-few 를 못 폈다** — too-many(8)는 자리 점수로 무손실 자동 복구되는데
 *      too-few 는 `'too-few(n)'` 로 즉시 반환하고 손도 안 댔다 ⇒ 재발마다 T1 세션 하나.
 *   ⓑ `verifyProgress` 축 ⓓ 의 범위가 «완료 표지가 있는 행» 이라, 칸이 밀려 표지가 구현 칸
 *      **밖으로** 나간 행일수록 자가 더 조용했다(정확히 거꾸로). 657 이 실제로 ⏹ 종료행인데
 *      티어 스캔에 «미착수» 로 보였고, 그 순간 `verify572` 만 빨갛고 이 자는 초록이었다 —
 *      지시서 [4] 는 push 게이트로 `verifyProgress` 만 지목한다 ⇒ 아무도 안 짖었다.
 *
 * ⚠ **고정 SHA 를 안 판다**(ROUTINE «얕은 클론 주의») — 표본은 전부 **지금 트리의 행**에서
 *    되만든다. 807 의 `probe807` 과 같은 규칙이다.
 *
 * 절:
 *   [1] ⓐ 복구      — too-few 를 무손실로 7칸으로 편다
 *   [2] ⓐ 자리      — 편 자리가 **옳은 자리**다: 구현 칸 내용이 구현 칸에 남는다
 *   [3] ⓑ 범위      — 완료 표지가 **없는** 결손 행도 축 ⓓ 가 이름으로 부른다
 *   [4] 수렴        — 편 표는 자기 자신에게 초록이고, 다시 펴도 안 바뀐다
 *   [R] 되돌림 시험 — 자에 이가 있는가 · **정상 등재 push 는 안 막힌다**(809 등재문 ⚠)
 *
 * 쓰기: node tools/verify809.js
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

const src = fs.readFileSync(SRC, 'utf8').split('\n');
const rowAt = id => src.findIndex(l => new RegExp('^\\|\\s*' + id + '\\s*\\|').test(l));
const cellsOf = l => { const sp = fix572.split(l); return sp ? sp.cells : null; };

function writeTmp(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify809-'));
  const p = path.join(dir, 'PROGRESS.md');
  fs.writeFileSync(p, lines.join('\n'));
  return p;
}

/* 자를 돌리고 «종료 코드 + 찍힌 글». ⚠ `| tail` 로 물리면 tail 의 코드가 찍힌다(807 교훈). */
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

/* 뒤 `drop` 칸을 **아예 없앤다** — 799·800·657·681 이 실제로 그 모양이었다
   («뒤 칸을 안 쓴 채 등재한» 행. probe807 의 `unfix` 와 같은 뜻이다).
   ⚠ 이건 시험용 표본이라 이 단계는 무손실이 아니다 — 무손실을 묻는 것은 **수리** 쪽이다. */
function chop(line, drop) {
  const sp = fix572.split(line);
  if (!sp || sp.cells.length !== fix572.COLS) return null;
  const c = sp.cells.slice(0, fix572.COLS - drop);
  return sp.lead + '|' + c.join('|') + (sp.tail === null ? '' : '|' + sp.tail);
}

/* ── [1] ⓐ 복구 ───────────────────────────────────────────────────────────── */
console.log('\n[1] ⓐ 복구 — `fix572` 가 too-few 를 무손실로 7칸으로 편다 (807 은 «못 고침» 이라 말했다)');

/* 표본은 «구현 칸에 진짜 내용이 있는 행» 이어야 자리를 물을 수 있다.
   657(⏹ 종료문) · 681(미착수) 이 807 이 손으로 편 바로 그 두 행이다. */
const FEW = [
  { id: '657', drop: 3, want: 4 },
  { id: '681', drop: 3, want: 4 },
  { id: '657', drop: 2, want: 5 },
  { id: '681', drop: 1, want: 6 },
];

for (const f of FEW) {
  const i = rowAt(f.id);
  const cut = i < 0 ? null : chop(src[i], f.drop);
  const n0 = cut ? cellsOf(cut).length : -1;
  const tag = '[1-' + f.id + '@' + f.want + ']';
  if (!cut || n0 !== f.want) { ok(tag, false, f.id + ' 를 칸 ' + f.want + ' 로 못 되만들었다(실측 ' + n0 + ')'); continue; }
  const r = fix572.fixRow(cut);
  const n1 = r.line === cut ? -1 : cellsOf(r.line).length;
  ok(tag, n1 === fix572.COLS, '칸 ' + f.want + ' → 7 로 편다 (' + r.why + ')');
  ok(tag.slice(0, -1) + 'L]', r.line !== cut && fix572.lossless(cut, r.line),
    '무손실 — 표본의 글자를 한 자도 안 지웠다');
  f.cut = cut; f.fixed = r.line;
}

/* ── [2] ⓐ 자리 ───────────────────────────────────────────────────────────── */
console.log('\n[2] ⓐ 자리 — 편 자리가 **옳은 자리**인가 (뒤에 빈 칸을 붙이면 구현 칸이 밀린다)');

for (const f of FEW) {
  const tag = '[2-' + f.id + '@' + f.want + ']';
  if (!f.fixed) { ok(tag, false, '수리된 행이 없어 못 잰다'); continue; }
  const want = cellsOf(src[rowAt(f.id)])[3].trim();        /* 지금 표의 진짜 구현 칸 */
  const got = cellsOf(f.fixed)[3].trim();
  ok(tag, got === want, '구현 칸이 그대로 구현 칸에 남았다 — «' + got.slice(0, 34) + '…»');
}

/* ⓐ 의 핵심 보정 — `score()` 는 **빈 칸**을 «–» 처럼 후하게 본다(BARE_IMPL 3 · LOOP 2 · 빈 측정표 1).
   too-few 에서 그 빈 칸은 우리가 방금 끼운 것이라 증거가 아니다. 보정이 없으면 «전부 비고에
   몰고 앞칸을 다 비우는» 퇴화 자리가 이긴다 — 681 옛 5칸에서 실제로 8점 대 6점으로 그랬다. */
const degen = ['', '', '', '', ' 아무 말이나 길게 '.repeat(30)];
const sane = [' `docs/measure/x.md` ', ' – ', '', '', ''];
ok('[2-blank]', fix572.score(...sane) - 3 > fix572.score(...degen) - 6,
  '빈 칸이 받은 점수를 되빼면 «전부 비고에 몰기» 가 진다 (퇴화 ' + (fix572.score(...degen) - 6) +
  ' < 정상 ' + (fix572.score(...sane) - 3) + ')');

/* ── [3] ⓑ 범위 ───────────────────────────────────────────────────────────── */
console.log('\n[3] ⓑ 범위 — 완료 표지가 **없는** 결손 행도 축 ⓓ 가 부르는가 (809 본체)');

const DONE_DATED = /(?:완료|해결|통과|폐기)\s*\(\s*20\d\d-\d\d-\d\d/;

/* 표지가 없는 행 하나(미착수 등재행)와 있는 행 하나를 골라 같은 결손을 심는다 */
const noMark = ['802', '803', '809', '787'].find(id => rowAt(id) >= 0 && !DONE_DATED.test(src[rowAt(id)]));
ok('[3-a]', !!noMark, '완료 표지가 없는 등재행을 표본으로 잡았다' + (noMark ? ' — ' + noMark : ''));

if (noMark) {
  const t = src.slice();
  t[rowAt(noMark)] = chop(src[rowAt(noMark)], 3);
  const g = gauge(writeTmp(t));
  ok('[3-b]', g.code === 1, '표지 없는 4칸 행에 **종료 코드 1** 이다 (실측 ' + g.code + ')');
  ok('[3-c]', new RegExp('✗ ' + noMark + ' — 판정 불가').test(g.out), noMark + ' 를 이름으로 부른다');
  ok('[3-d]', /구현 칸 밖으로/.test(g.out),
    '«표지가 구현 칸 밖으로 밀렸을 수도 있다» 고 이유까지 말한다 — 옛 범위였으면 조용했을 자리다');
  ok('[3-e]', /fix572/.test(g.out) && /too-few/.test(g.out),
    '고치는 법으로 `fix572`(too-few 포함)를 찍는다 — 자가 자기 처방을 말한다');
}

/* 표지가 있는 행도 그대로 걸린다(옛 범위의 몫을 잃지 않았다) */
const hasMark = ['726', '736', '725'].find(id => rowAt(id) >= 0 && DONE_DATED.test(src[rowAt(id)]));
if (hasMark) {
  const t = src.slice();
  t[rowAt(hasMark)] = chop(src[rowAt(hasMark)], 3);
  const g = gauge(writeTmp(t));
  ok('[3-f]', g.code === 1 && new RegExp('✗ ' + hasMark + ' — 판정 불가').test(g.out),
    '완료 표지가 **있는** 결손 행도 그대로 부른다 (' + hasMark + ') — 넓힌 범위가 옛 몫을 안 잃었다');
} else ok('[3-f]', false, '완료 표지가 있는 표본을 못 잡았다');

/* ── [4] 수렴 ─────────────────────────────────────────────────────────────── */
console.log('\n[4] 수렴 — 편 표는 자에게 초록이고, 다시 펴도 안 바뀐다');

if (noMark) {
  const t = src.slice();
  t[rowAt(noMark)] = fix572.fixRow(chop(src[rowAt(noMark)], 3)).line;
  const g = gauge(writeTmp(t));
  ok('[4-a]', g.code === 0 && !/PROGRESS UNJUDGEABLE/.test(g.out),
    '`fix572` 가 편 행을 넣으면 자가 **초록**이다 (종료 코드 ' + g.code + ') — 수리가 판정 가능으로 되돌린다');
  const again = fix572.fixRow(t[rowAt(noMark)]);
  ok('[4-b]', again.line === t[rowAt(noMark)] && !again.why, '한 번 편 행은 다시 펴도 안 바뀐다(수렴)');
}

ok('[4-c]', gauge(SRC).code === 0, '지금 작업 트리는 넓힌 범위에서도 **초록**이다 — 헛빨강이 없다');

/* ── [R] 되돌림 시험 ──────────────────────────────────────────────────────── */
console.log('\n[R] 되돌림 — 자에 이가 있는가 · **정상 등재 push 는 안 막힌다**(809 등재문 ⚠)');

/* R1 이 이 작업의 핵심 방어다. 축 ⓓ 를 «칸 수» 하나로만 넓혔으므로 «미착수 행도 걸린다» 는
   걱정이 성립하는지 실제로 민다 — 제대로 쓴 7칸 등재행은 걸리면 안 된다. */
const FRESH = '| 999 | **새 등재 — 되돌림 시험용 (실재 작업 아님)** | 새 등재의 주 편집 구간 | – | – | **0/5** | ' +
              '**미착수 · 등재만(되돌림 시험).** 이 행은 정상 등재의 모양이다. |';
ok('[R-0]', cellsOf(FRESH).length === fix572.COLS, '되돌림 표본 자체가 7칸이다(시험이 시험을 못 세우면 무의미)');

const fresh = src.slice();
fresh.splice(rowAt('809') + 1, 0, FRESH);
const gf = gauge(writeTmp(fresh));
ok('[R-1]', gf.code === 0 && !/PROGRESS UNJUDGEABLE/.test(gf.out),
  '**정상 등재 행을 한 줄 넣어도 자는 초록이다**(종료 코드 ' + gf.code + ') — 등재 중인 워커의 push 를 안 막는다');
ok('[R-1b]', !/✗ 999/.test(gf.out), '새 등재행을 이름으로 부르지 않는다 — 문턱은 «칸 수» 하나뿐이다');

/* R2 — 같은 행을 결손으로 만들면 그때는 빨갛다(자가 «아무거나» 빨갛다고 하는 게 아니다) */
const freshBad = fresh.slice();
freshBad[rowAt('809') + 1] = chop(FRESH, 3);
const gb = gauge(writeTmp(freshBad));
ok('[R-2]', gb.code === 1 && /✗ 999 — 판정 불가/.test(gb.out),
  '같은 행의 뒤 세 칸을 없애면 그때는 999 를 부른다 — 자가 «칸 수» 를 실제로 잰다');

/* R3 — 되돌리면 다시 조용하다 */
ok('[R-3]', gauge(writeTmp(fresh)).code === 0, '되돌려 놓으면 다시 초록이다');

/* R4 — ⓐ 를 무력화한 사본: too-few 를 «못 고침» 으로 되돌리면 [1] 이 빨개진다 */
const stub = FEW.find(f => f.cut);
ok('[R-4]', !!stub && fix572.fixRow(stub.cut).line !== stub.cut,
  'ⓐ 를 빼면 [1] 이 빨개지는 자리다 — 지금은 편다(무력화 사본의 반대편)');

console.log('\nVERIFY809 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL' : ' — PASS'));
process.exit(fail ? 1 : 0);
