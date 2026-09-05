#!/usr/bin/env node
/* 작업 939 — «종료 코드 하나는 한 가지만 가리킨다»
 *
 * 등재(939 · 938 1회차 곁다리): `tools/scan885e.py` 가 **측정 실패**(★ 창 자동 탐색)에도
 * `sys.exit(2)` 를 쓴다. 937 이 코드 2 를 «환경에 없음» 으로 못 박았으니 그 신호가 둘을 가리킨다.
 * 재현(`node tools/probe939.js`)이 등재문보다 한 겹 더 나쁜 것을 찍었다 —
 * 그 자를 `py()` 로 부르면 **한 줄도 안 남고** 부모가 코드 2 로 죽거나(스윕이 «없는 자» 로 지나간다),
 * 대신 **«파이썬 의존 없음 — pip3 install pillow numpy»** 가 찍힌다(모듈은 다 있는데 — 938-③ 의
 * «적힌 대로 해도 안 낫는 처방»). 같은 병이 `scan122`·`scan892` 에도 있었다(자기 실패에 코드 2).
 *
 * 이 자가 지키는 약속 — **어느 것도 자의 «점수» 를 묻지 않는다**(885·122·892 의 판정은 939 의 몫이 아니다):
 *   [A] 사전이 한 곳에 있다 — `pydep937` 의 EX_ENV(2) · EX_SELF(3) 와 `fail()`.
 *   [B] 인구조사 — 파이썬 자 중 «자기 실패» 를 코드 2 로 내는 자 0건(부트스트랩만 2 를 낸다).
 *   [C] 자기 실패는 **말이 있다** — 코드 3 + «무엇이 안 됐는지 + 할 일» 한 줄(조용한 죽음 0건).
 *   [D] 노드 쪽 `py()` 가 코드 3 을 그대로 옮긴다 — 안 옮기면 그 게이트가 스택 트레이스 + 코드 1 로
 *       죽어 **다시 «없는 자»** 가 된다(937 이 코드 2 에서 막은 것과 같은 사고).
 *   [E] 갈랐는가 — 환경 신호는 **여전히 2**(939 가 937 을 무르게 풀지 않았다).
 *   [R] 되돌림 시험 — 수리 전 사본에서는 이 항들이 실제로 빨갛다(헛초록이 아님을 못박는다).
 *
 * 돌리는 법: `node tools/verify939.js`
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const G = require('./gitrev756');

const ROOT = path.join(__dirname, '..');
const T = path.join(ROOT, 'tools');
const PRE = '5d6dc2b';                          // claim(939) — 수리 전 트리
const REFPNG = 'docs/ref/151-이용권-카드.png';  // ★ 가 3개 미만 = 측정 실패를 부르는 입력
let pass = 0, total = 0, held = 0;
const ok = (c, m) => { total++; if (c) { pass++; console.log('  ✓ ' + m); } else console.log('  ✗ ' + m); };
const hold = (m) => { held++; console.log('  ⏸ ' + m + ' (환경 — 세지 않는다)'); };
const lastLine = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';

console.log('=== verify939 — 종료 코드 하나는 한 가지만 가리킨다 ===');
console.log('사전: 0 통과 · 1 오류/FAIL · 2 환경에 없음(부트스트랩만) · 3 자가 못 쟀다(측정 실패·사용법)\n');

/* ---------- [A] 사전이 한 곳에 있다 ---------- */
const pyBoot = fs.readFileSync(path.join(T, 'pydep937.py'), 'utf8');
const jsBoot = fs.readFileSync(path.join(T, 'pydep937.js'), 'utf8');
const api = spawnSync('python3', ['-c',
  'import pydep937 as P;print(P.EX_ENV, P.EX_SELF, int(callable(P.fail)))'],
  { cwd: T, encoding: 'utf8' });
ok(api.status === 0 && /^2 3 1/.test((api.stdout || '').trim()),
   '[A1] ★ 파이썬 사전이 값으로 있다 — EX_ENV=2 · EX_SELF=3 · fail() 호출 가능 · 실측 ' +
   JSON.stringify((api.stdout || '').trim()));
const jsApi = require(path.join(T, 'pydep937.js'));
ok(jsApi.EX_ENV === 2 && jsApi.EX_SELF === 3,
   '[A2] ★ 노드 쪽 짝도 같은 두 값을 내놓는다(사전을 두 벌로 안 적었다) — ' +
   jsApi.EX_ENV + ' · ' + jsApi.EX_SELF);
ok(/EX_ENV\s*=\s*2/.test(pyBoot) && /EX_SELF\s*=\s*3/.test(pyBoot) && /코드 3/.test(pyBoot),
   '[A3] 파이썬 부트스트랩이 사전을 **글로도** 적는다(다음 워커가 코드를 안 읽고도 안다)');
ok(!/SystemExit\(0 if pydep937\.available\([^)]*\) else 3\)/.test(jsBoot),
   '[A4] `available()` 의 사설 프로브가 3 을 안 쓴다 — 3 은 이제 «자가 못 쟀다» 다(사전이 다시 둘을 가리키면 안 된다)');

/* ---------- [B] 인구조사 — 자기 실패에 코드 2 를 쓰는 자 0건 ---------- */
/* 주석·문자열 안의 인용은 세지 않는다(문서가 적어 둔 «옛 줄» 까지 위반으로 읽으면 자가 거짓말을 한다) */
const SELF2 = /(^|[^\w.])(sys\.exit|exit)\(\s*2\s*\)|raise\s+SystemExit\(\s*2\s*\)/;
const pyFiles = fs.readdirSync(T).filter((f) => f.endsWith('.py') && f !== 'pydep937.py')
  .map((f) => path.join(T, f));
pyFiles.push(path.join(ROOT, 'pxdiff41.py'));      // 자에게 불리는 루트의 자(probe534 → pxdiff41)
const offenders = [];
for (const p of pyFiles) {
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l));
  if (lines.some((l) => SELF2.test(l))) offenders.push(path.relative(ROOT, p));
}
ok(offenders.length === 0, '[B1] ★ 자기 실패를 코드 2 로 내는 파이썬 자 0건 — ' +
   (offenders.length ? offenders.join(', ') : '0건') +
   ' (코드 2 는 «환경에 없음» 전용 · 자는 fail() 로 3 을 낸다)');
ok(pyFiles.length >= 90, '[B2] 인구조사가 실제로 전수다 — 파이썬 자 ' + pyFiles.length + '개를 읽었다');
const viaFail = pyFiles.filter((p) => /from\s+pydep937\s+import[^\n]*\bfail\b|pydep937\.fail/.test(fs.readFileSync(p, 'utf8')));
ok(viaFail.length >= 3, '[B3] 등재가 지목한 셋이 공용 fail() 을 쓴다 — ' +
   viaFail.map((p) => path.basename(p)).join(', '));
ok(/EX_ENV|raise SystemExit\(2\)|SystemExit\(code\)/.test(pyBoot) && /def need/.test(pyBoot),
   '[B4] 코드 2 를 내는 자리는 부트스트랩 need() 하나다');

/* ---------- [C] 자기 실패는 «말» 이 있다 ---------- */
const SITES = [
  { py: 'scan885e.py', args: ['--gate', '--cap', REFPNG], tag: 'C1', what: '★ 창 자동 탐색 실패(등재가 지목)' },
  { py: 'scan122.py', args: [], tag: 'C2', what: '인자 없음(사용법)' },
  { py: 'scan892.py', args: [], tag: 'C3', what: '캡처 없음(입력)' },
];
for (const s of SITES) {
  const r = spawnSync('python3', [path.join(T, s.py)].concat(s.args), { cwd: ROOT, encoding: 'utf8' });
  const said = lastLine(r.stderr);
  ok(r.status === 3 && said.length > 0 && !/Traceback/.test((r.stderr || '') + (r.stdout || '')),
     '[' + s.tag + '] ★ ' + s.py + ' — ' + s.what + ' → 코드 3 + stderr 한 줄 · 실측 ' + r.status +
     ' ' + JSON.stringify(said.slice(0, 70)));
  ok(/—/.test(said), '[' + s.tag + 'b] 그 줄이 «무엇이 안 됐는지 — 할 일» 꼴이다(할 일 없는 통보 0건)');
  ok(!/pip3 install pillow numpy/.test(said),
     '[' + s.tag + 'c] 상시 준비 줄을 답으로 주지 않는다(모듈은 멀쩡한데 «pip3 install» 을 시키면 안 낫는다 — 938-③)');
}

/* ---------- [D] 노드 쪽이 코드 3 을 그대로 옮긴다 ---------- */
const callPy = (optsSrc) => spawnSync(process.execPath, ['-e',
  'require(' + JSON.stringify(path.join(T, 'pydep937.js')) + ').py([' +
  JSON.stringify(path.join(T, 'scan885e.py')) + ",'--gate','--cap'," + JSON.stringify(REFPNG) +
  '], ' + optsSrc + ')'], { cwd: ROOT, encoding: 'utf8' });
const d1 = callPy("{ encoding:'utf8' }");
const d1out = (d1.stderr || '') + (d1.stdout || '');
ok(d1.status === 3, '[D1] ★ `{encoding}` 만 준 호출 — 부모도 코드 **3** · 실측 ' + d1.status +
   ' (옛 판은 2 = «환경에 없음»)');
ok(/★ 를 \d+ 개밖에 못 찾았다/.test(d1out) && !/pip3 install pillow numpy/.test(d1out),
   '[D2] ★ 그 자리에서 자식의 말이 남는다(옛 판은 **한 줄도 안 남았다**) — ' +
   JSON.stringify(lastLine(d1out).slice(0, 60)));
const d2 = callPy("{ encoding:'utf8', stdio:['ignore','pipe','pipe'] }");
const d2out = (d2.stderr || '') + (d2.stdout || '');
ok(d2.status === 3 && /★ 를 \d+ 개밖에 못 찾았다/.test(d2out),
   '[D3] ★ stdio 를 적은 호출도 같다 — 코드 ' + d2.status + ' · 자식의 말이 그대로');
ok(!/파이썬 의존 없음/.test(d2out),
   '[D4] ★ «파이썬 의존 없음 — pip3 install …» 이 안 찍힌다(재현 §2 가 찍은 그 거짓 처방)');
ok((d2out.match(/★ 를 \d+ 개밖에 못 찾았다/g) || []).length === 1,
   '[D5] 같은 줄이 두 번 나오지 않는다 — ' + (d2out.match(/★ 를 \d+ 개밖에 못 찾았다/g) || []).length + '회');
const jsSrc = jsBoot.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
ok(/EX_SELF/.test(jsSrc) && /st === EX_ENV \|\| st === EX_SELF|st === EX_SELF/.test(jsSrc),
   '[D6] py() 가 코드 3 을 이름으로 다룬다(숫자를 손으로 적어 두지 않았다)');

/* ---------- [E] 갈랐는가 — 환경 신호는 여전히 2 ---------- */
const sandE = fs.mkdtempSync(path.join(os.tmpdir(), 'v939h-'));
fs.mkdirSync(path.join(sandE, 'scipy'));
fs.writeFileSync(path.join(sandE, 'scipy', '__init__.py'), "raise ImportError('939 되돌림 시험 — 감춘 모듈')\n");
const hid = { ...process.env, PYTHONPATH: sandE + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : '') };
const e1 = spawnSync('python3', [path.join(T, 'scan885e.py'), '--gate', '--cap', REFPNG],
  { cwd: ROOT, encoding: 'utf8', env: hid });
ok(e1.status === 2 && /scipy 없음 — pip3 install scipy/.test(e1.stderr || ''),
   '[E1] ★ 같은 자가 **환경**에는 여전히 코드 2 를 낸다(937 을 무르게 풀지 않았다) · 실측 ' + e1.status +
   ' ' + JSON.stringify(lastLine(e1.stderr).slice(0, 50)));
const e2 = spawnSync(process.execPath, ['-e',
  'require(' + JSON.stringify(path.join(T, 'pydep937.js')) + ').py([' +
  JSON.stringify(path.join(T, 'scan885e.py')) + ",'--gate','--cap'," + JSON.stringify(REFPNG) +
  "], { encoding:'utf8' })"], { cwd: ROOT, encoding: 'utf8', env: hid });
ok(e2.status === 2, '[E2] ★ 그 환경 실패를 부른 노드도 여전히 코드 2 다 · 실측 ' + e2.status);
ok(/scipy 없음/.test((e2.stderr || '') + (e2.stdout || '')),
   '[E3] 환경 쪽 말투(«scipy 없음 — pip3 install scipy»)는 그대로다');
/* 진짜 오류(코드 1)를 삼키지 않는가 — 937 [R7] 과 같은 안전핀 */
const e4 = spawnSync(process.execPath, ['-e',
  'require(' + JSON.stringify(path.join(T, 'pydep937.js')) + ").py(['-c','raise SystemExit(1)'], { encoding:'utf8' })"],
  { cwd: ROOT, encoding: 'utf8' });
ok(e4.status === 1, '[E4] 코드 1(«오류»)은 그대로 던진다 — 2·3 만 옮긴다 · 실측 ' + e4.status);

/* ---------- [R] 되돌림 시험 — 수리 전 사본에서는 빨갛다 ---------- */
const got = G.ensure(PRE);
if (!got.ok) {
  hold('[R] 수리 전 사본(' + PRE + ')을 못 가져왔다 — ' + (got.why || ''));
} else {
  const sand = fs.mkdtempSync(path.join(os.tmpdir(), 'v939-'));
  let dug = true;
  for (const f of ['pydep937.py', 'pydep937.js', 'scan885e.py', 'scan122.py', 'scan892.py']) {
    const g = G.show(PRE, 'tools/' + f);
    if (!g.ok) { dug = false; break; }
    fs.writeFileSync(path.join(sand, f), g.buf);
  }
  if (!dug) hold('[R] 수리 전 사본의 파일을 못 꺼냈다');
  else {
    const r1 = spawnSync('python3', [path.join(sand, 'scan885e.py'), '--gate', '--cap', REFPNG],
      { cwd: ROOT, encoding: 'utf8' });
    ok(r1.status === 2,
       '[R1] ★ 수리 전 사본은 **측정 실패에도 코드 2** 였다(= 이 게이트가 실재를 잡는다) · 실측 ' + r1.status);
    const preSrc = fs.readFileSync(path.join(sand, 'scan885e.py'), 'utf8');
    ok(SELF2.test(preSrc.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n')),
       '[R2] [B1] 의 인구조사 자가 그 사본을 실제로 «위반» 으로 집는다(자가 헛초록이 아니다)');
    const r3 = spawnSync(process.execPath, ['-e',
      'require(' + JSON.stringify(path.join(sand, 'pydep937.js')) + ').py([' +
      JSON.stringify(path.join(sand, 'scan885e.py')) + ",'--gate','--cap'," + JSON.stringify(REFPNG) +
      "], { encoding:'utf8' })"], { cwd: ROOT, encoding: 'utf8' });
    const r3out = (r3.stderr || '') + (r3.stdout || '');
    ok(r3.status === 2 && !/★ 를/.test(r3out),
       '[R3] ★ 수리 전에는 그 자를 부른 노드가 **코드 2 + 한 줄도 안 남기고** 죽었다(재현 §2) · 실측 ' +
       r3.status + ' ' + JSON.stringify(lastLine(r3out).slice(0, 40)));
    const r4 = spawnSync(process.execPath, ['-e',
      'require(' + JSON.stringify(path.join(sand, 'pydep937.js')) + ').py([' +
      JSON.stringify(path.join(sand, 'scan885e.py')) + ",'--gate','--cap'," + JSON.stringify(REFPNG) +
      "], { encoding:'utf8', stdio:['ignore','pipe','pipe'] })"], { cwd: ROOT, encoding: 'utf8' });
    ok(/파이썬 의존 없음 — pip3 install pillow numpy/.test((r4.stderr || '') + (r4.stdout || '')),
       '[R4] ★ 수리 전 다른 호출 방식에서는 **거짓 처방**이 찍혔다(모듈은 다 있는데 «pip3 install») — [D4] 가 그 자리를 지킨다');
    try { fs.rmSync(sand, { recursive: true, force: true }); } catch (_) {}
  }
}
try { fs.rmSync(sandE, { recursive: true, force: true }); } catch (_) {}
ok(!fs.existsSync(sandE), '[R5] 되돌림 시험이 뒤를 치웠다(감춘 세상 삭제)');

console.log('\nVERIFY939 ' + pass + '/' + total + (held ? ' (⏸ ' + held + ')' : '') +
            (pass === total ? ' PASS' : ' FAIL'));
process.exit(pass === total ? 0 : 1);
