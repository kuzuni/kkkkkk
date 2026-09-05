#!/usr/bin/env node
/* 작업 937 — «파이썬 의존을 부르는 자가 조용히 사라지지 않는다» (913 의 나머지 반쪽)
 *
 * 등재(937): 928 회귀 스윕에서 `node tools/verify895.js` 가 **점수 줄 없이 즉사**했다 —
 * `ModuleNotFoundError: No module named 'numpy'`(`tools/scan895.py` 33행).
 * `pip3 install pillow numpy` 한 줄 뒤 그 자리에서 **VERIFY895 18/18 PASS** ⇒ **환경 준비**이지
 * 코드 결함이 아니다. 913 이 pngjs 에서 찍은 얼굴과 글자 그대로 같고, 뿌리도 같다 —
 * **지시서 [6] «준비» 줄이 npm 만 적고 있었다**(pip 줄은 LESSONS 에만 있었다).
 *
 * 이 자가 지키는 약속 — **어느 것도 자의 «점수» 를 묻지 않는다**(895 의 판정은 937 의 몫이 아니다):
 *   [A] 공용 부트스트랩 `tools/pydep937.py` 가 있고, 없을 때 «할 일 한 줄 + 코드 2» 로 답한다.
 *   [B] numpy·PIL 을 폴백 없이 하드 import 하는 파이썬 자가 0 이다.
 *   [C] 지시서 [6] «준비» 절이 pip 줄을 적는다(913 이 심은 npm 줄은 그대로 살아 있다).
 *   [D] 그 파이썬 자를 부르는 **노드** 쪽도 코드 2 를 그대로 옮긴다 — 파이썬만 고치면
 *       노드 게이트가 여전히 스택 트레이스 + 코드 1 로 죽어 «없는 자» 가 그대로다(937 의 핵심).
 *   [R] 되돌림 시험 — 모듈을 감춘 세상에서 [A]·[D] 가 실제로 지켜지는가(헛초록이 아님을 못박는다).
 *
 * 돌리는 법: `node tools/verify937.js`
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const T = path.join(ROOT, 'tools');
let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) { pass++; console.log('  ✓ ' + m); } else console.log('  ✗ ' + m); };

console.log('=== verify937 — 파이썬 의존을 부르는 자가 «없는 자» 로 사라지지 않는다 ===');
console.log('정의: 하드 import = `import numpy as np` / `from PIL import Image` 를 폴백 없이 부르는 자');
console.log('      기대 응답 = «<모듈> 없음 — pip3 install pillow numpy» 한 줄 + 종료 코드 2\n');

/* ---------- [A] 공용 부트스트랩 ---------- */
const bootPy = path.join(T, 'pydep937.py');
const bootJs = path.join(T, 'pydep937.js');
ok(fs.existsSync(bootPy), '[A1] 공용 부트스트랩 tools/pydep937.py 가 있다');
ok(fs.existsSync(bootJs), '[A2] 노드 쪽 짝 tools/pydep937.js 가 있다');

const pyq = (code) => spawnSync('python3', ['-c', code], { cwd: T, encoding: 'utf8' });
const api = pyq('import pydep937 as P;print(int(callable(P.need)), int(callable(P.available)), P.HINT["np"], "|", P.HINT["Image"])');
ok(api.status === 0 && /^1 1 /.test(api.stdout),
   '[A3] pydep937 이 need()/available() 를 내놓는다 — 죽이지 않고 «묻기만» 하는 길이 있다');
ok(/numpy 없음 — pip3 install pillow numpy/.test(api.stdout),
   '[A4] 안내문이 110 `pw()`·913 `png913` 과 같은 말투다(«numpy 없음 — …») — ' +
   JSON.stringify((api.stdout || '').trim()));
ok(/pillow 없음 — pip3 install pillow numpy/.test(api.stdout),
   '[A5] pillow 쪽도 같은 한 줄이다(자가 어느 쪽을 부르든 워커가 읽을 문장은 하나)');

/* 지연 해석인가 — numpy 만 쓰는 자가 pillow 때문에 죽으면 안 된다(그 반대도 같다) */
const lazy = pyq('import pydep937;print("imported")');
ok(lazy.status === 0 && /imported/.test(lazy.stdout),
   '[A6] 부트스트랩 자체를 import 하는 것만으로는 아무 의존도 안 건드린다(PEP 562 지연 해석)');

/* ---------- [B] 하드 import 0 ---------- */
/* 주석·문자열 안의 인용은 세지 않는다 — 문서가 적어 둔 «옛 줄» 까지 위반으로 읽으면 자가 거짓말을 한다 */
const HARD = /^\s*(import\s+numpy|from\s+PIL\s+import)\b/;
const pyFiles = fs.readdirSync(T).filter((f) => f.endsWith('.py') && f !== 'pydep937.py')
  .map((f) => path.join(T, f));
/* 루트의 자 중 tools 의 자가 실제로 부르는 것도 같은 사슬이다(probe534 → pxdiff41.py) */
pyFiles.push(path.join(ROOT, 'pxdiff41.py'));

const hard = [];
const viaBoot = [];
for (const p of pyFiles) {
  const src = fs.readFileSync(p, 'utf8');
  const lines = src.split('\n').filter((l) => !/^\s*#/.test(l));
  if (lines.some((l) => HARD.test(l))) hard.push(path.relative(ROOT, p));
  if (/from\s+pydep937\s+import|import\s+pydep937/.test(src)) viaBoot.push(path.relative(ROOT, p));
}
ok(hard.length === 0, '[B1] ★ numpy·PIL 을 폴백 없이 하드 import 하는 자 0건 — ' +
   (hard.length ? hard.slice(0, 6).join(', ') + (hard.length > 6 ? ' 외 ' + (hard.length - 6) : '') : '0건'));
ok(viaBoot.length >= 95, '[B2] 부트스트랩을 거쳐 부르는 자가 95개 이상 — ' + viaBoot.length + '개');
ok(viaBoot.includes('tools/scan895.py'),
   '[B3] 등재가 지목한 scan895 가 그 안에 있다(즉사한 그 33행)');
ok(viaBoot.includes('pxdiff41.py'),
   '[B4] 루트에 있어도 «자에게 불리는» pxdiff41 은 사슬 안이다(probe534 가 부른다)');

/* 옛 «코드 1» 가드가 남아 있으면 그 자는 여전히 «오류» 로 읽힌다 — 코드 2 와 구분이 안 된다 */
const oldGuard = pyFiles.filter((p) => /Pillow 없음 —[^\n]*\n\s*sys\.exit\(1\)/.test(fs.readFileSync(p, 'utf8')));
ok(oldGuard.length === 0, '[B5] «Pillow 없음 → sys.exit(1)» 옛 가드 0건 — ' +
   (oldGuard.length ? oldGuard.map((p) => path.basename(p)).join(', ') : '0건') +
   ' (코드 1 은 «오류», 환경 없음은 코드 2 여야 «없는 자» 와 갈린다)');

/* ---------- [C] 지시서 [6] «준비» 절 ---------- */
const routine = fs.readFileSync(path.join(ROOT, 'docs', 'ROUTINE.md'), 'utf8');
ok(/pip3 install pillow numpy/.test(routine),
   '[C1] ★ 지시서가 파이썬 쪽 준비(`pip3 install pillow numpy`)를 적는다');
ok(/npm i --no-save playwright pngjs/.test(routine),
   '[C2] 913 이 심은 npm 줄이 그대로 살아 있다(이 작업이 그 절반을 지우지 않았다)');
ok(/numpy 없음|pillow 없음/.test(routine),
   '[C3] 워커가 실제로 보게 될 문장(«numpy 없음»)이 그 자리에 적혀 있다');
/* pip 쪽에 npm 의 «따로 부르면 지운다» 함정을 잘못 옮겨 적지 않았는가(등재 937 의 ⚠) */
ok(/pip[^\n]*«한 번에» 함정이 없다|나눠 깔아도/.test(routine),
   '[C4] pip 에는 «따로 부르면 앞을 지운다» 함정이 없다는 것을 밝힌다(913 의 경고를 그대로 옮기지 않았다)');

/* ---------- [D] 노드 쪽 짝 ---------- */
/* 이 자 자신은 면제다 — 약속을 **재려면** 날 spawn 으로 자식의 종료 코드를 직접 봐야 한다.
   py() 로 부르면 그 순간 이 자가 코드 2 로 같이 죽어 [R1]~[R5] 를 한 항도 못 찍는다. */
const EXEMPT = new Set(['verify937.js']);
const jsFiles = fs.readdirSync(T).filter((f) => f.endsWith('.js') && f !== 'pydep937.js' && !EXEMPT.has(f));
const rawSpawn = [];
const viaPy = [];
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(T, f), 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
  if (code.some((l) => /exec(File)?Sync\s*\(\s*[`'"]python3|spawnSync\s*\(\s*['"]python3/.test(l))) rawSpawn.push(f);
  if (/require\(\s*['"]\.\/pydep937['"]\s*\)/.test(src)) viaPy.push(f);
}
ok(rawSpawn.length === 0, '[D1] ★ python3 를 부트스트랩 없이 직접 부르는 노드 자 0건 — ' +
   (rawSpawn.length ? rawSpawn.join(', ') : '0건'));
ok(viaPy.length >= 9, '[D2] py() 를 거쳐 부르는 노드 자가 9개 이상 — ' + viaPy.length + '개');
ok(viaPy.includes('verify895.js'), '[D3] 등재가 지목한 verify895 가 그 안에 있다');

/* ---------- [R] 되돌림 시험 ---------- */
/* 모듈을 «감춘» 세상을 만든다 — 시스템 설치본을 건드리지 않고, import 되는 순간 ImportError 를
   내는 가짜 패키지를 PYTHONPATH 앞에 세운다. [A]·[D] 가 선언을 읽는 자라면 [R] 은 그 선언이
   실제로 지켜지는지를 재는 자다. */
const sand = fs.mkdtempSync(path.join(os.tmpdir(), 'v937-'));
for (const m of ['numpy', 'PIL']) {
  fs.mkdirSync(path.join(sand, m));
  fs.writeFileSync(path.join(sand, m, '__init__.py'), "raise ImportError('937 되돌림 시험 — 감춘 모듈')\n");
}
const hiddenEnv = { ...process.env, PYTHONPATH: sand + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : '') };

const real = pyq('import numpy;print("real")');
ok(real.status === 0, '[R0] 지금 트리에 numpy 가 실제로 설치돼 있다(없으면 «감춘다» 가 무의미하다) — ' +
   (real.status === 0 ? '있음' : '없음'));

/* R1·R2 — 파이썬 자 하나를 그 세상에서 직접 굴린다 */
const rPy = spawnSync('python3', [path.join(T, 'scan895.py'), '--json'],
  { cwd: ROOT, encoding: 'utf8', env: hiddenEnv });
ok(rPy.status === 2, '[R1] ★ 모듈이 없으면 파이썬 자가 종료 코드 **2**(«환경에 없음») — 옛 날 import 는 1(«오류») · 실측 ' + rPy.status);
ok(/numpy 없음/.test(rPy.stderr || '') && !/Traceback/.test((rPy.stderr || '') + (rPy.stdout || '')),
   '[R2] ★ 스택 트레이스가 아니라 «할 일 한 줄» 이 나온다 — ' +
   JSON.stringify(((rPy.stderr || '').trim().split('\n')[0] || '')));

/* R3·R4 — 그 자를 부르는 «노드» 쪽이 그 코드 2 를 삼키지 않고 그대로 옮기는가.
   브라우저를 안 띄우는 최소 표본으로 판정한다(게이트 하나를 통째로 굴리면 20초가 넘는다). */
const probe = 'require(' + JSON.stringify(bootJs) + ").py([" + JSON.stringify(path.join(T, 'scan895.py')) +
              ", '--json'], { cwd: " + JSON.stringify(ROOT) + ", encoding: 'utf8' })";
const rJs = spawnSync(process.execPath, ['-e', probe], { cwd: ROOT, encoding: 'utf8', env: hiddenEnv });
ok(rJs.status === 2, '[R3] ★ 그 자를 부른 노드도 코드 **2** 로 끝난다(스택 트레이스 + 코드 1 이 아니다) — 실측 ' + rJs.status);
const rJsOut = (rJs.stderr || '') + (rJs.stdout || '');
ok(/numpy 없음/.test(rJsOut) && !/MODULE_NOT_FOUND|Traceback[\s\S]*at Object/.test(rJsOut),
   '[R4] ★ 노드 쪽에도 한 줄만 나온다 — ' + JSON.stringify((rJsOut.trim().split('\n').pop() || '')));

/* R5 — 같은 줄이 두 번 찍히지 않는다(execFileSync 는 stdio 를 안 적으면 자식 stderr 를 흘린다) */
const dup = (rJsOut.match(/numpy 없음/g) || []).length;
ok(dup === 1, '[R5] 같은 안내문이 두 번 나오지 않는다 — ' + dup + '회');

/* R6 — 진짜 오류(코드 1)를 «환경 탓» 으로 삼키지 않는가. 삼키면 913 의 반대 사고가 난다. */
const bad = spawnSync(process.execPath, ['-e',
  'require(' + JSON.stringify(bootJs) + ").py(['-c', 'raise SystemExit(1)'], { encoding: 'utf8' })"],
  { cwd: ROOT, encoding: 'utf8' });
ok(bad.status === 1 && /Error|status/.test((bad.stderr || '')),
   '[R7] 코드 1(«오류»)은 그대로 던진다 — 환경 없음(2)만 옮긴다 · 실측 ' + bad.status);

try { fs.rmSync(sand, { recursive: true, force: true }); } catch (_) {}
ok(!fs.existsSync(sand), '[R6] 되돌림 시험이 뒤를 치웠다(감춘 세상 삭제)');

console.log('\nVERIFY937 ' + pass + '/' + total + (pass === total ? ' PASS' : ' FAIL'));
process.exit(pass === total ? 0 : 1);
