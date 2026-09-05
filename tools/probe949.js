#!/usr/bin/env node
/* 작업 949 재현기 — `tools/scan813e.py` 가 즉사한다(«없는 이름» + 스택 트레이스 + 코드 1)
 *
 * 등재(949 · 932 7회차 곁다리): `scan813e` 가 `S.find_base` 를 부르는데 905 가 그 이름을
 * `find_base_u1` 로 개명했다(기각한 자를 지우지 않고 남기는 333 처방). 이 임포터만 옛 이름을 든 채였다.
 *
 * ⚠ 이 자는 **수리 전 사본**(claim(949) 커밋 `2612b48`)을 꺼내 그 위에서 재현한다(756 `gitrev756`).
 *   현재 트리에 대고 재현하면 수리한 순간 이 재현기가 빨개져 «게이트 부패» 와 구분이 안 된다 —
 *   재현은 «그때 무엇이 있었는가» 의 기록이므로 사본 위에서 영구히 재현 가능해야 한다.
 *
 * 찍는 것(338·341·350 규칙 — 처방 전에 등재문 가설부터 재현한다):
 *   §1  즉사 자체 — 종료 코드 · 스택 트레이스 · **결과 줄이 한 줄도 안 남는가**
 *       (913·937 이 못 박은 얼굴: 스윕이 «빨강» 이 아니라 **«없는 자»** 로 지나간다)
 *   §2  내 작업 탓이 아니다 — `scan887` 자신은 멀쩡하고(U1·U3 둘 다 있다) 형제 둘
 *       (`scan813c`·`scan813d`)은 905 가 이미 **U3** 으로 옮겼다 = 남은 것은 이 한 자였다
 *   §3  인구조사 — 그 사본의 «없는 이름» 호출은 **한 자리뿐**(다른 자에는 같은 부패가 없다)
 *   §4  곁다리(등재문 명시) — `scan813d` 를 인자 없이 부르면 커밋 금지 자산(캡처)을 찾다
 *       `FileNotFoundError` + 코드 1 로 죽는다(«없는 것이 정상» 이라 923 처방 = 코드 3 + 한 줄이 맞다)
 *
 * 돌리는 법: `node tools/probe949.js`   (수리 뒤에도 초록이어야 한다 — 사본을 재는 자다)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const G = require('./gitrev756');

const ROOT = path.join(__dirname, '..');
const T = __dirname;
const PRE = '2612b48';                       // claim(949) — 수리 전 트리
const PYENV = Object.assign({}, process.env,
  { PYTHONPATH: T + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : '') });

let pass = 0, total = 0, held = 0;
const ok = (c, m) => { total++; if (c) { pass++; console.log('  ✓ ' + m); } else console.log('  ✗ ' + m); };
const hold = (m) => { held++; console.log('  ⏸ ' + m + ' (환경 — 세지 않는다)'); };
const lastLine = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean).pop() || '';

console.log('=== probe949 — scan813e 즉사 재현 (수리 전 사본 ' + PRE + ' 위에서) ===\n');

/* 수리 전 사본을 모래상자에 푼다 */
const got = G.ensure(PRE);
const sand = fs.mkdtempSync(path.join(os.tmpdir(), 'probe949-'));
let dug = got.ok;
if (dug) {
  for (const f of ['scan813e.py', 'scan813d.py']) {
    const g = G.show(PRE, 'tools/' + f);
    if (!g.ok) { dug = false; break; }
    fs.writeFileSync(path.join(sand, f), g.buf);
  }
}
const runPre = (f, args) => spawnSync('python3', [path.join(sand, f)].concat(args || []),
  { cwd: ROOT, encoding: 'utf8', env: PYENV });

/* ---------- §1 즉사 자체 ---------- */
console.log('§1 수리 전 `scan813e.py`');
if (!dug) {
  hold('[1] 수리 전 사본(' + PRE + ')을 못 꺼냈다 — ' + (got.why || ''));
} else {
  const e = runPre('scan813e.py');
  const eAll = (e.stdout || '') + (e.stderr || '');
  console.log('    종료 코드 ' + e.status + ' · stderr 마지막 줄 ' + JSON.stringify(lastLine(e.stderr).slice(0, 90)));
  ok(e.status !== 0, '[1a] 그 자는 **통과하지 못했다**(코드 ' + e.status + ')');
  ok(/AttributeError[\s\S]*find_base/.test(eAll),
     '[1b] 죽는 이유가 등재문 그대로다 — `scan887` 에 `find_base` 가 없다');
  ok(/Traceback/.test(eAll), '[1c] 말이 아니라 **스택 트레이스**로 죽었다(913·937 이 닫은 얼굴)');
  ok(!/U1 |U2 |U3 /.test(e.stdout || ''),
     '[1d] ★ 결과 줄이 **한 줄도 안 남는다** — 스윕은 이 자를 «빨강» 이 아니라 «없는 자» 로 지나간다');
  ok(e.status !== 2 && e.status !== 3,
     '[1e] 코드도 사전(939) 밖이다 — 1 = «오류» 라 «자가 못 쟀다(3)»·«환경(2)» 어느 쪽도 아니다');
}

/* ---------- §2 887 은 멀쩡하고 형제는 이미 옮겨졌다 ---------- */
console.log('\n§2 `scan887` 자신 · 형제 임포터');
const api = spawnSync('python3', ['-c',
  'import scan887 as S;print(int(hasattr(S,"find_base")), int(hasattr(S,"find_base_u1")), int(hasattr(S,"find_base_u3")))'],
  { cwd: T, encoding: 'utf8' });
const flags = (api.stdout || '').trim();
ok(api.status === 0 && flags === '0 1 1',
   '[2a] ★ `scan887` 에 `find_base` 는 **없고** `find_base_u1`·`find_base_u3` 은 **있다** — 실측 ' +
   JSON.stringify(flags) + ' (개명일 뿐 자리는 안 비었다 · 333 처방)');
for (const f of ['scan813c.py', 'scan813d.py']) {
  const src = fs.readFileSync(path.join(T, f), 'utf8').replace(/#[^\n]*/g, '');
  ok(/from scan887 import find_base_u3/.test(src) && !/\bfind_base\b(?!_)/.test(src),
     '[2b:' + f + '] 형제는 905 가 이미 **U3** 으로 옮겼다(옛 이름을 코드에서 안 부른다)');
}
if (dug) {
  const preE = fs.readFileSync(path.join(sand, 'scan813e.py'), 'utf8');
  ok(/S\.find_base\(/.test(preE),
     '[2c] ★ 남은 곳은 `scan813e` 한 자였다 — 그 사본이 옛 이름을 **코드에서** 부른다');
}

/* ---------- §3 인구조사 ---------- */
console.log('\n§3 인구조사 — 그 사본이 부르는 `scan887` 의 없는 이름');
const names = spawnSync('python3', ['-c', 'import scan887 as S;print("\\n".join(sorted(dir(S))))'],
  { cwd: T, encoding: 'utf8' }).stdout.split('\n').map((s) => s.trim()).filter(Boolean);
const have = new Set(names);
const scanDir = (dir, files) => {
  const bad = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').split('\n')
      .filter((l) => !/^\s*#/.test(l)).join('\n');
    if (!/scan887/.test(src)) continue;
    const alias = (src.match(/import\s+scan887\s+as\s+(\w+)/) || [])[1];
    const want = [];
    if (alias) for (const m of src.matchAll(new RegExp('\\b' + alias + '\\.(\\w+)', 'g'))) want.push(m[1]);
    for (const m of src.matchAll(/from\s+scan887\s+import\s+([\w, ]+)/g)) {
      for (const n of m[1].split(',')) if (n.trim()) want.push(n.trim());
    }
    for (const n of new Set(want)) if (!have.has(n)) bad.push(f + ' → scan887.' + n);
  }
  return bad;
};
if (dug) {
  const bad = scanDir(sand, ['scan813e.py', 'scan813d.py']);
  console.log('    수리 전 사본에서 없는 이름을 부르는 자리 ' + bad.length + '건' +
              (bad.length ? ': ' + bad.join(' · ') : ''));
  ok(bad.length === 1 && /scan813e\.py → scan887\.find_base$/.test(bad[0]),
     '[3a] ★ 이 병은 **그 한 자리뿐**이었다 — ' + JSON.stringify(bad));
}
const live = scanDir(T, fs.readdirSync(T).filter((x) => x.endsWith('.py')));
ok(live.length === 0,
   '[3b] 현재 트리에는 같은 자리가 0건이다(수리가 실제로 그 자리를 닫았다) — 실측 ' +
   (live.length ? live.join(' · ') : '0건'));

/* ---------- §4 곁다리 — scan813d 인자 없이 ---------- */
console.log('\n§4 곁다리 — 수리 전 `scan813d.py` (인자 없음)');
if (dug) {
  const d = runPre('scan813d.py');
  const dAll = (d.stdout || '') + (d.stderr || '');
  console.log('    종료 코드 ' + d.status + ' · stderr 마지막 줄 ' + JSON.stringify(lastLine(d.stderr).slice(0, 90)));
  ok(/FileNotFoundError/.test(dAll) && d.status === 1,
     '[4a] 커밋 금지 자산(기본 캡처)을 찾다 스택 트레이스 + 코드 1 로 죽었다 — 실측 ' + d.status);
}
ok(!fs.existsSync(path.join(ROOT, 'docs/shots/754-r7-89-2280.png')),
   '[4b] 그 기본 캡처는 **없는 것이 정상**이다(캡처 PNG 는 커밋 금지 자산 — ROUTINE 서두)');

try { fs.rmSync(sand, { recursive: true, force: true }); } catch (_) {}

console.log('\nPROBE949 ' + pass + '/' + total + (held ? ' (⏸ ' + held + ')' : '') +
            (pass === total ? ' PASS(재현됨)' : ' — 재현 실패'));
process.exit(pass === total ? 0 : 1);
