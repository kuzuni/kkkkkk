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
console.log('정의: 하드 import = `import numpy as np` / `from PIL import Image` / `from scipy import ndimage`');
console.log('      / `import soundfile as sf` 를 폴백 없이 부르는 자 (뒤 둘은 938 이 더한 여집합)');
console.log('      기대 응답 = «<모듈> 없음 — <그 모듈의 설치 명령>» 한 줄 + 종료 코드 2\n');

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

/* ⚑ 938 — 말투는 하나여도 «할 일» 은 모듈마다 다르다. 조건부(무거운) 의존에 상시 준비 줄을 답으로
   주면 워커는 «적힌 대로 해도 자가 계속 죽는» 자리에 선다(937-② 의 세 번째 축 = 할 일). */
const api2 = pyq('import pydep937 as P;print(P.HINT["ndimage"], "|", P.HINT["sf"])');
ok(/scipy 없음 — pip3 install scipy/.test(api2.stdout),
   '[A7] ★ scipy 안내문이 **자기 설치 명령**을 적는다(«pip3 install pillow numpy» 가 아니다) — ' +
   JSON.stringify((api2.stdout || '').trim()));
ok(/soundfile 없음 — pip3 install soundfile/.test(api2.stdout),
   '[A8] ★ soundfile 쪽도 자기 명령을 적는다');
ok(!/ndimage[^\n]*pip3 install pillow numpy|sf[^\n]*pip3 install pillow numpy/.test(api2.stdout),
   '[A9] 조건부 의존에 상시 준비 줄을 답으로 주지 않는다(적힌 대로 해도 안 낫는 처방 0건)');

/* 지연 해석인가 — numpy 만 쓰는 자가 pillow 때문에 죽으면 안 된다(그 반대도 같다) */
const lazy = pyq('import pydep937;print("imported")');
ok(lazy.status === 0 && /imported/.test(lazy.stdout),
   '[A6] 부트스트랩 자체를 import 하는 것만으로는 아무 의존도 안 건드린다(PEP 562 지연 해석)');

/* ---------- [B] 하드 import 0 ---------- */
/* 주석·문자열 안의 인용은 세지 않는다 — 문서가 적어 둔 «옛 줄» 까지 위반으로 읽으면 자가 거짓말을 한다 */
/* ⚑ 938 — scipy·soundfile 을 더했다. 등재 938 이 지목한 여집합이고, 얼굴은 numpy·PIL 과 글자 그대로 같다
   (`from scipy import ndimage` = 스택 트레이스 + 코드 1 + 점수 줄 0). */
const HARD = /^\s*(import\s+numpy|from\s+PIL\s+import|import\s+scipy|from\s+scipy\s+import|import\s+soundfile|from\s+soundfile\s+import)\b/;
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
ok(hard.length === 0, '[B1] ★ numpy·PIL·scipy·soundfile 을 폴백 없이 하드 import 하는 자 0건 — ' +
   (hard.length ? hard.slice(0, 6).join(', ') + (hard.length > 6 ? ' 외 ' + (hard.length - 6) : '') : '0건'));
ok(viaBoot.length >= 95, '[B2] 부트스트랩을 거쳐 부르는 자가 95개 이상 — ' + viaBoot.length + '개');
ok(viaBoot.includes('tools/scan895.py'),
   '[B3] 등재가 지목한 scan895 가 그 안에 있다(즉사한 그 33행)');
ok(viaBoot.includes('pxdiff41.py'),
   '[B4] 루트에 있어도 «자에게 불리는» pxdiff41 은 사슬 안이다(probe534 가 부른다)');
ok(viaBoot.includes('tools/scan885e.py'),
   '[B6] ★ 938 이 지목한 scan885e 가 사슬 안이다(옛 `from scipy import ndimage` 44행)');
ok(viaBoot.includes('tools/synth99.py'),
   '[B7] ★ 938 이 지목한 synth99 가 사슬 안이다(옛 `import soundfile as sf` 15행)');

/* 옛 «코드 1» 가드가 남아 있으면 그 자는 여전히 «오류» 로 읽힌다 — 코드 2 와 구분이 안 된다 */
const oldGuard = pyFiles.filter((p) => /Pillow 없음 —[^\n]*\n\s*sys\.exit\(1\)/.test(fs.readFileSync(p, 'utf8')));
ok(oldGuard.length === 0, '[B5] «Pillow 없음 → sys.exit(1)» 옛 가드 0건 — ' +
   (oldGuard.length ? oldGuard.map((p) => path.basename(p)).join(', ') : '0건') +
   ' (코드 1 은 «오류», 환경 없음은 코드 2 여야 «없는 자» 와 갈린다)');

/* ⚑ 939 이관 — 937 이 코드 2 에 준 뜻은 «환경에 없음» **하나**다. 자기 실패(측정 실패·사용법)에
   같은 코드를 쓰는 자가 있으면 [R1] 이 초록이어도 그 신호는 둘을 가리킨다 — 그 자를 py() 로 부르는
   순간 «측정이 안 됐다» 가 «환경에 없음» 으로 읽힌다(913 이 경계한 반대 사고). 자세한 판정·되돌림
   시험은 `tools/verify939.js` 가 갖고, 여기서는 **937 의 약속이 아직 참인가**만 한 항으로 묻는다. */
const SELF2 = /(^|[^\w.])(sys\.exit|exit)\(\s*2\s*\)|raise\s+SystemExit\(\s*2\s*\)/;
const selfTwo = pyFiles.filter((p) =>
  fs.readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).some((l) => SELF2.test(l)))
  .map((p) => path.relative(ROOT, p));
ok(selfTwo.length === 0, '[B8] ★ 939 이관 — 코드 2 를 «자기 실패» 로 쓰는 파이썬 자 0건 — ' +
   (selfTwo.length ? selfTwo.join(', ') : '0건') + ' (자기 실패는 코드 3 = pydep937.fail())');

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
/* ⚑ 938 — 상시 줄에 안 올린 의존은 «없는 셈» 이 아니라 «부딪히면 알려 준다» 로 적혀 있어야 한다.
   937-④ 의 뜻: 반복되는 준비는 LESSONS 가 아니라 지시서의 그 줄에 적어야 멈춘다. */
ok(/pip3 install scipy/.test(routine) && /pip3 install soundfile/.test(routine),
   '[C5] ★ 지시서가 조건부 의존 둘의 설치 명령을 적는다(`pip3 install scipy` · `pip3 install soundfile`)');
ok(/scan885e/.test(routine) && /synth99/.test(routine),
   '[C6] 그 둘을 **어느 자가** 쓰는지까지 적는다(상시 줄에서 뺀 근거가 그 자리에 있다)');

/* ---------- [D] 노드 쪽 짝 ---------- */
/* 이 자 자신은 면제다 — 약속을 **재려면** 날 spawn 으로 자식의 종료 코드를 직접 봐야 한다.
   py() 로 부르면 그 순간 이 자가 코드 2 로 같이 죽어 [R1]~[R5] 를 한 항도 못 찍는다. */
/* ⚑ 939 이관 — 같은 이유로 두 자가 더 면제다. `verify939`·`probe939` 는 **자식의 종료 코드 자체**가
   측정 대상이라(2 인가 3 인가) py() 로 부르면 그 순간 같이 죽어 한 항도 못 찍는다.
   ⚠ 면제는 «python3 를 직접 불러도 되는 자» 가 아니라 «그 약속을 재는 자» 뿐이다 — 늘리지 마라. */
const EXEMPT = new Set(['verify937.js', 'verify939.js', 'probe939.js']);
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

/* ---------- [R8]~[R11] 938 — 조건부 의존 둘도 같은 세상에서 재 본다 ----------
   ⚠ 이 둘은 **numpy·PIL 뒤에** 온다(자의 import 순서). 그래서 위 `sand` 를 그대로 쓰면
   언제나 «numpy 없음» 이 먼저 나와 scipy·soundfile 쪽을 한 번도 안 재게 된다 —
   그 둘만 감춘 세상을 따로 세운다(자가 실제로 «자기 모듈» 을 짚는지가 이 항의 전부다). */
const sand2 = fs.mkdtempSync(path.join(os.tmpdir(), 'v938-'));
for (const m of ['scipy', 'soundfile']) {
  fs.mkdirSync(path.join(sand2, m));
  fs.writeFileSync(path.join(sand2, m, '__init__.py'), "raise ImportError('938 되돌림 시험 — 감춘 모듈')\n");
}
const hidden2 = { ...process.env, PYTHONPATH: sand2 + (process.env.PYTHONPATH ? ':' + process.env.PYTHONPATH : '') };
const base = pyq('import numpy, PIL;print("base")');
ok(base.status === 0,
   '[R8] numpy·PIL 은 실제로 있다(그래야 scipy·soundfile 이 «먼저 죽는 것» 에 가려지지 않는다) — ' +
   (base.status === 0 ? '있음' : '없음 · pip3 install pillow numpy'));

const rSci = spawnSync('python3', [path.join(T, 'scan885e.py'), '--cap', path.join(ROOT, 'docs/ref/151-이용권-카드.png')],
  { cwd: ROOT, encoding: 'utf8', env: hidden2 });
ok(rSci.status === 2 && /scipy 없음 — pip3 install scipy/.test(rSci.stderr || '') &&
   !/Traceback/.test((rSci.stderr || '') + (rSci.stdout || '')),
   '[R9] ★ scipy 를 감추면 scan885e 가 «scipy 없음 — pip3 install scipy» 한 줄 + 코드 2 · 실측 ' + rSci.status +
   ' ' + JSON.stringify(((rSci.stderr || '').trim().split('\n')[0] || '')));

const rSnd = spawnSync('python3', [path.join(T, 'synth99.py'), '--out', path.join(os.tmpdir(), 'v938-out')],
  { cwd: ROOT, encoding: 'utf8', env: hidden2 });
ok(rSnd.status === 2 && /soundfile 없음 — pip3 install soundfile/.test(rSnd.stderr || '') &&
   !/Traceback/.test((rSnd.stderr || '') + (rSnd.stdout || '')),
   '[R10] ★ soundfile 을 감추면 synth99 가 «soundfile 없음 — pip3 install soundfile» 한 줄 + 코드 2 · 실측 ' + rSnd.status +
   ' ' + JSON.stringify(((rSnd.stderr || '').trim().split('\n')[0] || '')));

/* 감춘 것이 «다른 자» 까지 죽이면 지연 해석이 깨진 것이다 — scipy 가 없다고 PIL 만 쓰는 자가 죽으면 안 된다 */
const other = spawnSync('python3', ['-c', 'from pydep937 import np, Image;print("ok")'],
  { cwd: T, encoding: 'utf8', env: hidden2 });
ok(other.status === 0 && /ok/.test(other.stdout || ''),
   '[R11] 조건부 의존을 감춰도 numpy·PIL 만 쓰는 자는 멀쩡하다(PEP 562 지연 해석 · 조건부가 «상시» 가 되지 않았다)');

try { fs.rmSync(sand, { recursive: true, force: true }); } catch (_) {}
try { fs.rmSync(sand2, { recursive: true, force: true }); } catch (_) {}
try { fs.rmSync(path.join(os.tmpdir(), 'v938-out'), { recursive: true, force: true }); } catch (_) {}
ok(!fs.existsSync(sand) && !fs.existsSync(sand2), '[R6] 되돌림 시험이 뒤를 치웠다(감춘 세상 삭제)');

console.log('\nVERIFY937 ' + pass + '/' + total + (pass === total ? ' PASS' : ' FAIL'));
process.exit(pass === total ? 0 : 1);
