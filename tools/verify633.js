#!/usr/bin/env node
/* 633 게이트 — push 게이트(`tools/smoke.js`)가 «자기 실패를 말하는가».
 *
 *   node tools/verify633.js
 *
 * 무엇을 지키는가:
 *   409 §28-6 이 «smoke 가 5회 중 2회 흔들리는데 **어느 항인지 특정 불가**» 로 인계했다.
 *   `fail()` 은 원래도 `  ✗ …` 를 찍고 있었으므로 병은 «안 찍는다» 가 아니라 **«찍는 자리»** 다 —
 *   실패는 절 한복판에 찍히고 그 뒤로 [2] 오프너 수십 줄 + [3] 화면비 6종이 붙어,
 *   `tail` 로 잘라 보관한 출력에는 마지막 줄(`SMOKE FAIL — n건`)만 남는다(LESSONS 305 ①).
 *   ⇒ 이 자의 축은 «`✗` 가 어딘가 있는가» 가 아니라 **«잘라도 남는가»** 다.
 *   전자만 물으면 수리 전에도 초록이라 헛초록이고, 그래서 [1-c] 가 그것을 «전제» 로 못박는다.
 *
 * 표본은 `node tools/smoke.js --selftest` — 브라우저 없이 보고 형식만 찍는 경로다.
 * (실제 스모크 한 판이 3분 30초라, «실패했을 때 무엇을 찍는가» 를 물을 길이 그 전엔 없었다.)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SMOKE = path.join(ROOT, 'tools', 'smoke.js');
const NEG = path.join(ROOT, '.v633-neg.js');   /* 되돌림 사본 — .gitignore 에 있다 */
const TAIL = 8;

let sec = '?';
let total = 0;
const fails = [];
const section = (s) => { sec = s; console.log('\n' + s); };
const t = (cond, m, info) => {
  total++;
  const line = m + (info ? '  [' + info + ']' : '');
  if (cond) console.log('  ok  ' + line);
  else { fails.push({ sec, m: line }); console.log('  ✗   ' + line); }
};

function run(cmd) {
  try { return { code: 0, out: execSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: '/bin/bash', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status === undefined ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
}
const tailOf = (s, n) => s.replace(/\s+$/, '').split('\n').slice(-n).join('\n');
const withNeg = (src, fn) => { fs.writeFileSync(NEG, src); try { return fn(); } finally { try { fs.unlinkSync(NEG); } catch (_) {} } };

const SRC = fs.readFileSync(SMOKE, 'utf8');

/* ──────────────────────────────────────────────── */
section('[1] 전제 — 표본이 실제로 «실패한 스모크» 다');
const self = run('node tools/smoke.js --selftest');
t(self.code === 1, '[1-a] `--selftest` 가 종료 코드 1 로 끝난다(실패한 판이다)', 'code ' + self.code);
t(/SMOKE FAIL — 2건/.test(self.out), '[1-b] 실패를 **둘** 만든다 — 하나면 «목록» 이 목록인지 알 수 없다');
t((self.out.match(/^ {2}✗ /gm) || []).length === 2,
  '[1-c] 절 한복판의 `  ✗ …` 는 **수리 전에도** 찍혔다 — 그것만 묻는 자는 헛초록이다',
  (self.out.match(/^ {2}✗ /gm) || []).length + '줄');

/* ──────────────────────────────────────────────── */
section('[2] 본체 — 잘라도 남는다 (LESSONS 305 ①)');
const tl = tailOf(self.out, TAIL);
t(/SMOKE FAIL — 2건/.test(tl), `[2-a] tail -${TAIL} 에 판정 줄이 남는다`);
t(/표본 실패 A/.test(tl) && /표본 실패 B/.test(tl), `[2-b] tail -${TAIL} 에 실패 **내용** 이 둘 다 남는다`);
t(/\[1\] 로드 \+ 자동 플레이/.test(tl), `[2-c] tail -${TAIL} 에 실패한 **절 이름**([1])이 남는다`);
t(/\[3\] 화면비/.test(tl), `[2-d] tail -${TAIL} 에 두 번째 절 이름([3])도 남는다`);
t(/실패 항목/.test(tl), '[2-e] 재출력 블록에 머리말이 있다 — 절 한복판의 `✗` 와 구분된다');
t(tl.indexOf('표본 실패 A') >= 0 && tl.indexOf('표본 실패 A') < tl.indexOf('SMOKE FAIL'),
  '[2-f] 목록이 판정 줄 **앞** 이다 — `tail -n` 하나로 둘 다 걸린다(`verify95` 와 같은 배치)');

/* ──────────────────────────────────────────────── */
section('[3] 파이프 — `| tail` 에서도 안 잘린다');
const piped = run('set -o pipefail; node tools/smoke.js --selftest | tail -' + TAIL);
t(/SMOKE FAIL — 2건/.test(piped.out), '[3-a] 파이프로 받아도 판정 줄이 도착한다');
t(/표본 실패 A/.test(piped.out) && /표본 실패 B/.test(piped.out), '[3-b] 파이프로 받아도 실패 목록이 도착한다');
t(piped.code === 1, '[3-c] 파이프여도 종료 코드 1 이 산다(pipefail)', 'code ' + piped.code);
t(!/process\.exit\(fails\.length/.test(SRC), '[3-d] `process.exit(fails.length …)` 잔재 0 — 파이프에서 마지막 줄을 버리던 자리다');
t(/process\.exitCode\s*=/.test(SRC), '[3-e] 판정은 `process.exitCode` 로 넘긴다(정상 종료로 버퍼를 흘려보낸다)');
t(/setTimeout\([^\n]*process\.exit\([^\n]*\)\.unref\(\)/.test(SRC),
  '[3-f] 핸들이 남을 때만 도는 상한이 걸려 있다 — push 게이트가 매달리면 안 된다');

/* ──────────────────────────────────────────────── */
section('[4] 절 이름이 실제로 갈린다 — 한 이름으로 뭉개지 않는다');
const names = [...self.out.matchAll(/^ {2}\d+\. (.+)$/gm)].map((m) => m[1].trim());
t(names.length === 2, '[4-a] 재출력 줄 수가 실패 수와 같다', names.length + '줄');
t(new Set(names).size === 2, '[4-b] 두 실패의 절 이름이 서로 다르다 — `sec` 이 절마다 갱신된다', names.join(' · '));
const rawHeaders = [...SRC.matchAll(/^\s*console\.log\((['"`])\[\d/gm)];
t(rawHeaders.length === 0,
  '[4-c] 절 머리말을 `console.log` 로 직접 찍는 자리 0 — 남으면 그 절의 실패가 **앞 절 이름**으로 붙는다',
  rawHeaders.length + '자리');
t((SRC.match(/\bsection\(/g) || []).length >= 8,
  '[4-d] 절 머리말이 전부 `section()` 을 지난다', (SRC.match(/\bsection\(/g) || []).length + '회');

/* ──────────────────────────────────────────────── */
section('[5] 초록일 때는 조용하다 — 목록 절이 헛으로 안 붙는다');
{
  /* 실패를 0 으로 만든 사본으로 «PASS 경로» 만 본다(실제 스모크 한 판은 3분 30초라 못 쓴다). */
  const passSrc = SRC.replace(/^ *fail\('표본 실패 A[^\n]*\n/m, '').replace(/^ *fail\('1080×2280: 표본 실패 B[^\n]*\n/m, '');
  t(passSrc !== SRC, '[5-0] 전제 — 표본 실패를 실제로 걷어냈다');
  const r = withNeg(passSrc, () => run('node .v633-neg.js --selftest'));
  t(r.code === 0, '[5-a] 실패가 0 이면 종료 코드 0', 'code ' + r.code);
  t(/SMOKE PASS/.test(r.out), '[5-b] 초록 판정 줄이 그대로다');
  t(!/실패 항목/.test(r.out), '[5-c] 초록일 때 «실패 항목» 블록이 안 붙는다');
}

/* ──────────────────────────────────────────────── */
section('[R] 되돌림 시험 — 수리를 빼면 이 자가 빨개진다');
{
  /* R1 — 재출력 블록만 걷어낸 사본 = 409 가 본 그 출력. */
  const r1Src = SRC.replace(/ {2}if \(fails\.length\) \{\n {4}console\.log\('\\n실패 항목[\s\S]*?\n {2}\}\n/, '');
  t(r1Src !== SRC, '[R1-0] 전제 — 재출력 블록을 실제로 걷어냈다');
  const r1 = withNeg(r1Src, () => run('node .v633-neg.js --selftest'));
  const r1tail = tailOf(r1.out, TAIL);
  t(/SMOKE FAIL — 2건/.test(r1tail), '[R1-a] 되돌린 사본도 판정 줄은 남는다 — 그래서 «건수만 보인다» 였다');
  t(!/표본 실패 A/.test(r1tail) && !/표본 실패 B/.test(r1tail),
    `[R1-b] 되돌린 사본은 tail -${TAIL} 에 실패 내용이 **하나도** 안 남는다 = [2-b] 가 빨개진다`);

  /* R2 — 절 이름을 안 담는 옛 `fail()` 로 되돌린 사본. */
  const OLD_FAIL = "const fail = (m) => { fails.push({ sec, m }); console.log('  ✗ ' + m); };";
  const r2Src = SRC.replace(OLD_FAIL, "const fail = (m) => { fails.push({ sec: '?', m }); console.log('  ✗ ' + m); };");
  t(r2Src !== SRC, '[R2-0] 전제 — `fail()` 을 실제로 되돌렸다');
  const r2 = withNeg(r2Src, () => run('node .v633-neg.js --selftest'));
  const r2names = [...r2.out.matchAll(/^ {2}\d+\. (.+)$/gm)].map((m) => m[1].trim());
  t(r2names.length === 2 && new Set(r2names).size === 1,
    '[R2-a] 절을 안 담으면 두 실패가 **한 이름**으로 뭉개진다 = [4-b] 가 빨개진다', r2names.join(' · ') || '없음');
}

/* ──────────────────────────────────────────────── */
section('[6] 범위 — 검사를 약하게 만들지 않았다');
t(!fs.existsSync(NEG), '[6-a] 되돌림 사본을 남기지 않았다');
/* 자기 시험 블록의 표본 실패는 «검사» 가 아니므로 세기 전에 뺀다 —
   안 빼면 자기 시험을 지운 사본이 이 래칫을 통과해 버린다. */
const REAL = SRC.replace(/if \(process\.argv\.includes\('--selftest'\)\) \{[\s\S]*?\n\}\n/, '');
t((REAL.match(/\bfail\(/g) || []).length >= 25,
  '[6-b] 실검사 `fail()` 호출부가 그대로 많다 — 보고만 고쳤고 **검사를 덜어내지 않았다**',
  (REAL.match(/\bfail\(/g) || []).length + '자리');
for (const need of ['[0] 정적 문법', '[1] 로드 + 자동 플레이', '[2] 팝업 오픈', '[2-1] 던전 입장', '[2-2] 아레나 입장', '[3] 화면비'])
  t(SRC.includes(need), '[6-c] 절이 그대로 살아 있다 — ' + need);

/* ──────────────────────────────────────────────── */
if (fails.length) {
  console.log('\n실패 항목 (절 · 내용)');
  fails.forEach((f, i) => console.log(`  ${i + 1}. ${f.sec}\n     ✗ ${f.m}`));
}
console.log(fails.length
  ? `\nVERIFY633 ${total - fails.length}/${total} FAIL — ${fails.length}건`
  : `\nVERIFY633 ${total}/${total} PASS`);
process.exitCode = fails.length ? 1 : 0;
