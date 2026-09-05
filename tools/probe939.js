#!/usr/bin/env node
/* 작업 939 — 재현기: «종료 코드 2 가 두 가지를 가리킨다»
 *
 * 등재(939, 938 1회차 곁다리): `tools/scan885e.py` 가 **측정 실패**(★ 창 자동 탐색)에도
 * `sys.exit(2)` 를 쓴다. 937 이 코드 2 를 «환경에 없음» 으로 못 박았으므로 그 신호가 둘을 가리킨다.
 *
 * 338 규칙대로 **처방 전에 재현**한다. 이 자는 판정을 안 한다 — 두 트리에서 같은 자리를 굴려
 * «수리 전 = 2 · 수리 후 = 3» 을 **찍기만** 한다(판정은 `tools/verify939.js` 의 몫).
 *
 * 재현이 등재문보다 한 겹 더 나쁜 것을 찍었다(§2):
 *   · 자기 실패 메시지가 **stdout** 으로 나가고 `py()` 는 stdout 을 잡아 두므로,
 *     `{ encoding:'utf8' }` 로 부른 호출에서는 **한 줄도 안 남고** 부모가 코드 2 로 죽는다.
 *     = 스윕이 읽는 얼굴이 정확히 913 의 «없는 자» 다.
 *   · `stdio` 를 적은 호출에서는 대신 **«파이썬 의존 없음 — pip3 install pillow numpy»** 가 찍힌다 —
 *     938-③ 이 경계한 «적힌 대로 해도 안 낫는 처방» 이다(모듈은 멀쩡히 다 있다).
 *
 * 돌리는 법: `node tools/probe939.js`
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const G = require('./gitrev756');

const ROOT = path.join(__dirname, '..');
const T = path.join(ROOT, 'tools');
const PRE = '5d6dc2b';                    // claim(939) — 이 작업이 자를 만지기 **전** 트리
const REFPNG = 'docs/ref/151-이용권-카드.png';   // ★ 가 3개 미만인 그림 = 측정 실패를 부르는 입력

/* 자기 실패(측정 실패·사용법·입력 없음)를 부르는 자리 셋 — 등재가 지목한 것 + 같은 병의 여집합 */
const SITES = [
  { py: 'scan885e.py', args: ['--gate', '--cap', REFPNG], what: '★ 창 자동 탐색 실패(등재가 지목)' },
  { py: 'scan122.py', args: [], what: '인자 없음(사용법)' },
  { py: 'scan892.py', args: [], what: '캡처 없음(입력)' },
];

const line = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean).pop() || '(한 줄도 안 남았다)';

console.log('=== probe939 — 코드 2 가 «환경에 없음» 과 «자가 못 쟀다» 를 같이 가리킨다 ===\n');

/* ── §1 수리 전 트리 — 같은 자리가 코드 2 를 낸다 ────────────────────────────── */
console.log('§1 수리 전 트리(' + PRE + ') — 자기 실패의 종료 코드');
const got = G.ensure(PRE);
let sand = null;
if (!got.ok) {
  console.log('   ⏸ ' + (got.env ? '보류(환경) — ' : '빨강 — ') + (got.why || '표본을 못 가져왔다'));
} else {
  sand = fs.mkdtempSync(path.join(os.tmpdir(), 'p939-'));
  for (const f of ['pydep937.py'].concat(SITES.map((s) => s.py))) {
    const g = G.show(PRE, 'tools/' + f);
    if (!g.ok) { console.log('   ⏸ ' + f + ' 를 못 꺼냈다 — ' + (g.why || '')); continue; }
    fs.writeFileSync(path.join(sand, f), g.buf);
  }
  for (const s of SITES) {
    const r = spawnSync('python3', [path.join(sand, s.py)].concat(s.args), { cwd: ROOT, encoding: 'utf8' });
    console.log('   ' + s.py.padEnd(14) + s.what.padEnd(26) + '코드 ' + r.status + '   ' + line(r.stderr + r.stdout));
  }
}

/* ── §2 그 코드 2 를 노드가 어떻게 읽는가 ───────────────────────────────────── */
console.log('\n§2 수리 전 자를 `py()` 로 부른 노드가 읽는 얼굴 (호출 방식 두 가지)');
if (sand) {
  const boot = path.join(sand, 'pydep937.js');
  fs.writeFileSync(boot, G.show(PRE, 'tools/pydep937.js').buf);
  const call = (optsSrc) => spawnSync(process.execPath, ['-e',
    'require(' + JSON.stringify(boot) + ').py([' + JSON.stringify(path.join(sand, 'scan885e.py')) +
    ",'--gate','--cap'," + JSON.stringify(REFPNG) + '], ' + optsSrc + ')'],
    { cwd: ROOT, encoding: 'utf8' });
  const a = call("{ encoding:'utf8' }");
  console.log("   { encoding:'utf8' }        → 부모 코드 " + a.status + '   ' + line(a.stderr + a.stdout));
  const b = call("{ encoding:'utf8', stdio:['ignore','pipe','pipe'] }");
  console.log('   stdio 를 적은 호출          → 부모 코드 ' + b.status + '   ' + line(b.stderr + b.stdout));
  console.log('   ⇒ 둘 다 코드 **2** = «환경에 없음» 이다. 모듈은 멀쩡히 다 깔려 있는데도.');
} else {
  console.log('   ⏸ §1 이 표본을 못 가져와 건너뛴다');
}

/* ── §3 지금 트리 — 같은 자리가 코드 3 + 한 줄 ─────────────────────────────── */
console.log('\n§3 지금 트리 — 자기 실패는 코드 3(«자가 못 쟀다») + «무엇이 안 됐는지 + 할 일» 한 줄');
for (const s of SITES) {
  const r = spawnSync('python3', [path.join(T, s.py)].concat(s.args), { cwd: ROOT, encoding: 'utf8' });
  console.log('   ' + s.py.padEnd(14) + s.what.padEnd(26) + '코드 ' + r.status + '   ' + line(r.stderr));
}
const boot2 = path.join(T, 'pydep937.js');
for (const [name, optsSrc] of [["{ encoding:'utf8' }", "{ encoding:'utf8' }"],
  ['stdio 를 적은 호출', "{ encoding:'utf8', stdio:['ignore','pipe','pipe'] }"]]) {
  const r = spawnSync(process.execPath, ['-e',
    'require(' + JSON.stringify(boot2) + ').py([' + JSON.stringify(path.join(T, 'scan885e.py')) +
    ",'--gate','--cap'," + JSON.stringify(REFPNG) + '], ' + optsSrc + ')'],
    { cwd: ROOT, encoding: 'utf8' });
  console.log('   py() ' + name.padEnd(24) + '→ 부모 코드 ' + r.status + '   ' + line(r.stderr + r.stdout));
}

/* ── §4 환경 쪽 신호는 그대로 2 인가(갈랐는지가 이 작업의 전부다) ───────────── */
console.log('\n§4 환경 신호는 그대로 코드 2 여야 한다 — scipy 를 감춘 세상');
const sand2 = fs.mkdtempSync(path.join(os.tmpdir(), 'p939h-'));
fs.mkdirSync(path.join(sand2, 'scipy'));
fs.writeFileSync(path.join(sand2, 'scipy', '__init__.py'), "raise ImportError('939 재현 — 감춘 모듈')\n");
const hid = { ...process.env, PYTHONPATH: sand2 + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : '') };
const rEnv = spawnSync('python3', [path.join(T, 'scan885e.py'), '--gate', '--cap', REFPNG],
  { cwd: ROOT, encoding: 'utf8', env: hid });
console.log('   scan885e (scipy 없음)      코드 ' + rEnv.status + '   ' + line(rEnv.stderr));

try { fs.rmSync(sand2, { recursive: true, force: true }); } catch (_) {}
if (sand) { try { fs.rmSync(sand, { recursive: true, force: true }); } catch (_) {} }
console.log('\nPROBE939 — 판정은 `node tools/verify939.js` 가 한다(이 자는 찍기만 한다)');
