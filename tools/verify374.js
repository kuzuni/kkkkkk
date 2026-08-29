#!/usr/bin/env node
/* 374 검증 — «완료행 되돌림 탐지»(tools/verifyProgress.js) 가 진짜로 잡는가
 *
 *   node tools/verify374.js
 *
 * ── 왜 이 게이트인가 ──────────────────────────────────────────────────────
 * 374 의 결손은 제품이 아니라 **기록**이었다: `5fe9d37`(done(370))가 rebase 충돌을
 * «내 사본» 으로 풀어 이웃 두 행(368·369)을 등재 당시의 «미착수» 본문으로 되돌렸고,
 * 그 표가 곧 워커의 작업 배정 입력이라 **끝난 369 가 47분 뒤 다시 선점됐다.**
 * 그래서 이 게이트가 재는 것은 «표가 지금 깨끗한가» 가 아니라
 * **«깨졌을 때 자가 빨개지는가»** 다 — 깨끗한 표에서 초록인 것은 아무것도 증명하지 않는다.
 *
 *   [A] 소스   — 도구가 있고 문법이 성하며, 못 보는 것(shallow 경계)을 문서에 적어 뒀다.
 *   [B] 현재   — 지금 HEAD·작업 트리는 초록이고 셈이 맞는다(조용히 건너뛴 ID 0).
 *   [R] 되돌림 — **실제 사고 커밋 `5fe9d37`** 에 자를 대면 정확히 2건(368·369)이 «정확 되돌림» 으로 빨갛다.
 *                그 앞뒤(사고 직전 `16d96a4` · 복원 뒤 HEAD)는 초록이다.
 *   [C] 감도   — 합성 사본으로 세 갈래를 각각 확인한다(빨강 2 · 초록 1).
 *                ⚠ **C3(정상 편집은 초록)** 이 없으면 이 자는 «행을 건드리면 빨개지는 자» 가 되어
 *                뒤 세션이 정오표를 못 붙인다 — 헛빨강은 헛초록만큼 나쁘다.
 *   [D] 문서   — 규칙 8(PROGRESS)·지시서 [4] 가 이 도구를 부르라고 적어 뒀다.
 *                자가 있어도 아무도 안 돌리면 없는 것과 같다.
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(ROOT, 'tools', 'verifyProgress.js');
const REL = 'docs/PROGRESS.md';

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log('  ' + (b ? '✓' : '✗') + '   ' + name + (detail ? ' = ' + detail : ''));
  b ? pass++ : fail++;
};
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { return null; } };
const run = (...args) => {
  const r = spawnSync('node', [TOOL, ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
/* 빨간 항목의 ID 목록 — 요약줄이 아니라 «✗» 줄에서 읽는다(요약 문구가 바뀌어도 안 흔들린다) */
const redIds = out => (out.match(/^\s*✗\s+(\S+) —/gm) || []).map(s => /✗\s+(\S+) —/.exec(s)[1]);
/* 388 이 같은 자 파일에 **두 번째 절**(§2 자기모순)을 얹었다. 374 가 소유한 것은 §1(되돌림)이므로
   «자가 초록인가» 를 묻던 항은 «§1 이 조용한가» 로 옮긴다(334 처방 — 기대값을 누르는 대신 무엇을 묻는지를 옮긴다).
   그냥 종료 코드로 두면 §2 가 빨간 날 374 가 **자기 것이 아닌 이유로** 빨개져, 진짜 되돌림 사고가 그 소음에 묻힌다. */
const s1Ids = out => (out.match(/^\s*✗\s+(\S+) — (?!자기모순)/gm) || []).map(s => /✗\s+(\S+) —/.exec(s)[1]);
const s1Quiet = out => s1Ids(out).length === 0 && !/PROGRESS REVERTED/.test(out);

/* 사고 커밋들 — 이 저장소의 실제 이력이다(shallow 창 안). */
const CRASH = '5fe9d37';   /* done(370) — 368·369 를 되돌린 커밋 */
const BEFORE = '16d96a4';  /* done(369) — 사고 직전, 두 행이 다 완료 */

/* ─────────────────────────── [A] 소스 ─────────────────────────── */
console.log('[A] 소스 — 도구가 있고, 못 보는 것을 적어 뒀다');
const SRC = fs.existsSync(TOOL) ? fs.readFileSync(TOOL, 'utf8') : '';
ok(!!SRC, 'A1 tools/verifyProgress.js 존재', SRC ? SRC.split('\n').length + '줄' : '없음');
const syn = spawnSync('node', ['--check', TOOL], { encoding: 'utf8' });
ok(syn.status === 0, 'A2 문법 성함', (syn.stderr || '').split('\n')[0] || 'ok');
ok(/shallow/.test(SRC) && /부분검사/.test(SRC), 'A3 shallow 경계를 «부분검사» 로 적어 뒀다(못 본 것을 초록이라 안 한다)', 'ok');
ok(/두 자는 이 순서로 댄다|구체적인 것부터/.test(SRC), 'A4 두 자의 순서 이유가 적혀 있다(표지 자가 되돌림 자를 가리면 안 된다)', 'ok');

/* ─────────────────────────── [B] 현재 ─────────────────────────── */
console.log('[B] 현재 — 작업 트리·HEAD 는 초록이고 셈이 맞는다');
const now = run();
ok(now.code === 0, 'B1 작업 트리 종료 코드 0', String(now.code));
ok(/PROGRESS OK/.test(now.out), 'B2 «되돌아간 완료행 없음»', 'ok');
const tally = /셈 (\d+)\/(\d+) (맞음|⚠)/.exec(now.out);
ok(!!tally && tally[1] === tally[2] && tally[3] === '맞음', 'B3 셈이 맞는다(조용히 건너뛴 ID 0)', tally ? tally[1] + '/' + tally[2] : '요약줄 없음');
ok(Number(tally && tally[2]) > 0, 'B4 볼 done() 기록이 실제로 있다(빈 검사로 초록이 아니다)', tally ? tally[2] + '건' : '0');

/* ─────────────────────────── [R] 되돌림 시험 ─────────────────────────── */
console.log('[R] 되돌림 시험 — 실제 사고 커밋에 자를 대면 빨개진다');
const crash = run('--rev', CRASH);
const cIds = s1Ids(crash.out);   /* §1 이 이 절의 주어다 — §2 는 그 시점 표의 다른 결함을 말한다(388 이관) */
ok(crash.code === 1, 'R1 ' + CRASH + ' 종료 코드 1', String(crash.code));
ok(cIds.length === 2 && cIds.includes('368') && cIds.includes('369'),
   'R2 §1 빨간 행이 정확히 368·369 두 건', cIds.join(' ') || '없음');
ok(/368 — 정확 되돌림/.test(crash.out) && /369 — 정확 되돌림/.test(crash.out),
   'R3 진단이 «정확 되돌림»(= 병합을 내 사본으로 푼 모양)', 'ok');
const before = run('--rev', BEFORE);
ok(s1Quiet(before.out), 'R4 사고 직전 ' + BEFORE + ' 는 §1 초록(사고 전후를 가른다)', s1Ids(before.out).join(' ') || '§1 조용');
ok(s1Ids(before.out).length === 0, 'R5 그 시점 §1 빨강 0건', String(s1Ids(before.out).length));

/* ─────────────────────────── [C] 감도 — 합성 사본 ─────────────────────────── */
console.log('[C] 감도 — 세 갈래를 각각 확인한다(빨강 2 · 초록 1)');
const HEADTXT = git('show', 'HEAD:' + REL);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v374-'));
const mk = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const rowRe = id => new RegExp('^\\|\\s*' + id + '\\s*\\|.*$', 'm');

/* 표본 ID 는 «HEAD 에서 done 이고 행이 살아 있는» 것 중 하나를 이력에서 고른다(하드코딩하지 않는다) */
const doneIds = [...new Set((git('log', 'HEAD', '--format=%s', '--', REL) || '')
  .split('\n').map(s => /^done\(([0-9A-Z, ]+)\)/.exec(s)).filter(Boolean)
  .flatMap(m => m[1].split(',').map(s => s.trim())))];
const SAMPLE = doneIds.find(id => rowRe(id).test(HEADTXT || ''));
ok(!!SAMPLE, 'C0 합성 표본 ID 를 이력에서 골랐다', SAMPLE || '없음');

if (SAMPLE && HEADTXT) {
  /* C1 — 행을 통째로 지우면 빨강 */
  const gone = mk('gone.md', HEADTXT.replace(rowRe(SAMPLE), ''));
  const r1 = run('--file', gone);
  ok(r1.code === 1 && redIds(r1.out).includes(SAMPLE), 'C1 행 삭제 → 빨강', redIds(r1.out).join(' ') || '초록');

  /* C2 — 완료 표지만 잃은 «손으로 고쳐 쓴» 모양(직전 판본과 바이트가 다르다) → 빨강.
         정확 되돌림 자로는 못 잡는 갈래라, 이 항이 표지 자가 살아 있음을 못박는다. */
  const stale = '| ' + SAMPLE + ' | (손으로 고쳐 쓴 낡은 본문 — 완료 표지 없음) | – | – | – | 0/5 | 미착수. |';
  const mang = mk('mangled.md', HEADTXT.replace(rowRe(SAMPLE), stale));
  const r2 = run('--file', mang);
  ok(r2.code === 1 && redIds(r2.out).includes(SAMPLE), 'C2 완료 표지 상실(직전 판본과 다름) → 빨강', redIds(r2.out).join(' ') || '초록');
  ok(/완료 표지가 사라졌다/.test(r2.out), 'C2b 진단이 «완료 표지가 사라졌다»(두 번째 자가 실제로 돈다)', 'ok');

  /* C3 — 정상 편집(뒤 세션이 정오표를 덧붙임)은 초록이어야 한다. 헛빨강 방지. */
  const grown = HEADTXT.replace(rowRe(SAMPLE), m => m.replace(/\|\s*$/, '') + '<br>⚑ (뒤 세션이 덧붙인 정오표 — 정상 편집) |');
  const r3 = run('--file', mk('grown.md', grown));
  ok(s1Quiet(r3.out), 'C3 행이 자란 것은 §1 초록(헛빨강 없음)', s1Ids(r3.out).join(' ') || '§1 조용');

  /* C4 — 손 안 댄 사본은 §1 초록(자가 --file 경로에서도 같은 답을 낸다) */
  const r4 = run('--file', mk('same.md', HEADTXT));
  ok(s1Quiet(r4.out), 'C4 손 안 댄 사본은 §1 초록', s1Ids(r4.out).join(' ') || '§1 조용');

  /* C5 — 두 자가 서로를 가리지 않는다(388 이관). C1 의 «행 삭제» 사본에서 §1 은 그 ID 를 지목하고,
          §2 의 진단(«자기모순»)은 §1 의 진단과 **다른 낱말**로 갈린다. 낱말이 섞이면 s1Ids 가 무너져
          이 이관 자체가 조용히 헛것이 된다 — 그래서 자가 자기 전제를 여기서 한 번 확인한다. */
  ok(!s1Ids(r1.out).includes('자기모순') && s1Ids(r1.out).includes(SAMPLE),
     'C5 §1·§2 의 진단 낱말이 갈린다(두 자가 서로를 안 가린다)', s1Ids(r1.out).join(' '));
}
fs.rmSync(tmp, { recursive: true, force: true });

/* ─────────────────────────── [D] 문서 ─────────────────────────── */
console.log('[D] 문서 — 워커가 이 자를 부르게 돼 있는가(안 돌리면 없는 것과 같다)');
const prog = fs.readFileSync(path.join(ROOT, REL), 'utf8');
const routine = fs.readFileSync(path.join(ROOT, 'docs', 'ROUTINE.md'), 'utf8');
/* ⚠ «파일 어딘가에 이름이 있는가» 로 물으면 374 **행 자신**이 그 이름을 적고 있어 그냥 초록이 된다
   (첫 판이 실제로 그렇게 헛초록이었다) — 규칙이 적힌 **절 안에서** 찾는다. */
const sect = (txt, from, to) => { const i = txt.indexOf(from); if (i < 0) return ''; const j = txt.indexOf(to, i + from.length); return txt.slice(i, j < 0 ? txt.length : j); };
const rule8 = sect(prog, '## 병렬 세션 규칙', '### 작업 단위');
const step4 = sect(routine, '[4] 병렬 충돌 처리', '[5] 컨텍스트 관리');
ok(/verifyProgress\.js/.test(rule8), 'D1 PROGRESS «병렬 세션 규칙» 절이 도구를 적어 뒀다', rule8 ? 'ok' : '절을 못 찾음');
ok(/verifyProgress\.js/.test(step4), 'D2 지시서 [4] 병렬 충돌 처리 절이 도구를 적어 뒀다', step4 ? 'ok' : '절을 못 찾음');

console.log('\nVERIFY374 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
