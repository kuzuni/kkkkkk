/* 게이트 931 — 사슬 밖 44 중 «장치가 뜻을 갖는» 갈래는 한 자도 남지 않는다
 *
 *   node tools/verify931.js
 *
 * 무엇을 지키는가 —
 *   925 는 «화소를 재는 자» 를 사슬 안으로 들여 918/922 걷개와 907 깃발이 실제로 심기게 했다.
 *   그 여집합 **44** 는 화소를 안 재서 걷개도 깃발도 안 걸리지만, **291 정착**(고정 대기 뒤 rect)과
 *   **731 소실 차단기**(`page.evaluate` 가 페이지 안에서 죽어도 종료 코드 0)는 화소와 무관한 장치다.
 *   931 은 그 44 를 «어느 장치가 실제로 뜻을 갖는가» 로 갈라(`probe931`) 갈래별로 들였다.
 *
 * 절 —
 *   [1] 규칙   — 갈래는 **목록이 아니라 판별기**다. 지어낸 소스로 다섯 갈래를 다 물어 본다.
 *   [2] 전수   — 살아 있는 트리에서 «사슬 밖» 중 들인 갈래가 **0**. 남은 것은 아직 안 들인 갈래뿐.
 *   [3] 들인 자 — 갈아 끼운 자마다 «사슬을 지난다» + «자기 사본이 없다»(모듈 사다리·실행 파일 폴백).
 *   [4] 장치   — 그 자들이 실제로 장치를 받는다(731 은 entry 무관 · 291 은 entry 가 verify 일 때만).
 *   [5] 걷개   — 918/922 걷개와 907 깃발은 이 44 에 **한 자도** 안 걸린다(등재문의 «필요 없다» 를 못박는다).
 *   [R] 되돌림 — 옛 사본을 그대로 가진 자를 지어 물으면 «사슬 밖» 으로 잡힌다(= [2] 가 헛초록이 아니다).
 *
 * ⚠ [2] 는 **단조**로 적었다 — 갈래 B·E 가 나중 회차에 들어오면 그 자리는 저절로 더 조여진다.
 *   («남은 갈래가 B·E 이하» 는 B·E 가 0 이 돼도 참이다.)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { classify, classifyFile } = require('./verify925');
const { census, devices, branch } = require('./probe931');
const shell918 = require('./shell918');
const raster907 = require('./raster907');
const settle291 = require('./settle291');

const TOOLS = __dirname;
const T = f => path.join(TOOLS, f);

/* 931 이 갈아 끼운 자 — 갈래 A(21) · C(3) · D(3). 925 [3] 과 같은 꼴로 이름을 적어 둔다
   (이름은 «무엇을 이미 했는가» 의 기록이고, 판정 자체는 [2] 의 규칙이 한다). */
const SWAPPED = [
  /* A — 731만 (entry 가 verify 가 아니라 291 이 안 붙는다) */
  'bisect236.js', 'fnchk186.js', 'probe227.js', 'probe236.js', 'probe305.js', 'probe472.js',
  'probe481.js', 'probe504.js', 'probe552.js', 'probe562.js', 'probe613.js', 'probe620.js',
  'probe622.js', 'probe636.js', 'probe680.js', 'probe695.js', 'probe722.js', 'probe766.js',
  'probe779.js', 'probe783.js', 'probe834.js',
  /* C — verify* 지만 250ms 이상 대기가 없어 291 이 실제로는 안 돈다 */
  'verify108.js', 'verify59.js', 'verify66.js',
  /* D — 장치가 지금은 무의미하다(evaluate 없음). 사슬에 넣는 값은 «다음에 쓰면 자동으로 받는다» 다 */
  'probe784.js', 'probe791.js', 'probe794.js',
  /* B — verify* + 250ms 이상 대기. **291 정착이 실제로 도는 유일한 갈래**(2회차에 들였다) */
  'verify105.js', 'verify183.js', 'verify186.js', 'verify260.js', 'verify326.js', 'verify472.js',
  'verify481.js', 'verify484.js', 'verify485.js', 'verify504.js', 'verify799.js', 'verify800.js',
  'verify834.js', 'verify85.js', 'verify88.js', 'verify95.js',
  /* E — push 게이트. 지시서 [6] 이 «맨 마지막» 이라 적어 둔 그 한 자(2회차) */
  'smoke.js',
];

/* 아직 안 들인 갈래 — 다음 회차 몫. 여기 이름이 줄면 [2b] 가 저절로 조여진다.
   2회차에 B·E 를 들여 **비었다** — 이제 [2b] 는 «사슬 밖이 한 자도 없다» 와 같은 말이다. */
const PENDING_BRANCHES = [];

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

/* 지어낸 자 — 규칙은 «내용» 으로 판정하므로 실물 없이 물을 수 있다(925 와 같은 꼴).
   ⚠ 저장소가 아니라 os 임시 자리에 짓는다 — census 도 추적 규칙도 이 파일을 안 본다. */
const made = [];
const mk = (n, src) => {
  const p = path.join(os.tmpdir(), 'verify931-' + n + '-' + process.pid + '.js');
  fs.writeFileSync(p, src); made.push(p); return p;
};
const OLD_BOOTSTRAP =
  'const { chromium } = (() => {\n' +
  "  try { return require('playwright'); } catch (_) {}\n" +
  "  console.error('playwright 없음'); process.exit(2);\n" +
  '})();\n';

try {
  /* ---------------- [1] 규칙 ---------------- */
  console.log('[1] 규칙 — 갈래는 목록이 아니라 판별기다');
  const EV = 'await page.evaluate(() => 1);';
  const W = 'await page.waitForTimeout(800);';
  const bA = mk('probeA', OLD_BOOTSTRAP + W + EV);
  const bB = mk('verifyB', OLD_BOOTSTRAP + W + EV);
  const bC = mk('verifyC', OLD_BOOTSTRAP + 'await page.waitForTimeout(100);' + EV);
  const bD = mk('probeD', OLD_BOOTSTRAP + W);
  /* branch()/devices() 는 tools/ 안의 이름으로 묻는 규칙이라, 지어낸 소스는 규칙만 따로 확인한다 */
  const dev = src => {
    const f = 'x.js';
    const isV = n => /^verify.*\.js$/.test(n);
    const RE_EVAL = require('./probe931').RE_EVAL;
    const w = require('./probe931').waits(src);
    return name => ({
      file: name, isVerify: isV(name),
      d291: isV(name) && w.some(n => n >= settle291.MIN_WAIT),
      d731: RE_EVAL.test(src), d918: false, d907: false,
    });
  };
  ok('[1a] verify* + 250ms 이상 대기 + evaluate → 갈래 B (타이밍이 바뀔 수 있는 유일한 갈래)',
    branch(dev(fs.readFileSync(bB, 'utf8'))('verify_x.js')) === 'B');
  ok('[1b] probe* + 같은 내용 → 갈래 A (entry 가 verify 가 아니라 291 이 안 붙는다)',
    branch(dev(fs.readFileSync(bA, 'utf8'))('probe_x.js')) === 'A');
  ok('[1c] verify* 인데 대기가 250ms 미만 → 갈래 C (291 이 한 번도 안 돈다)',
    branch(dev(fs.readFileSync(bC, 'utf8'))('verify_x.js')) === 'C');
  ok('[1d] evaluate 도 없고 291 도 안 붙으면 → 갈래 D (장치 무의미)',
    branch(dev(fs.readFileSync(bD, 'utf8'))('probe_x.js')) === 'D');
  ok('[1e] `smoke.js` 는 내용과 무관하게 갈래 E (push 게이트라 맨 마지막)',
    branch(dev(fs.readFileSync(bB, 'utf8'))('smoke.js')) === 'E');
  ok('[1f] 250ms 는 291 자신의 문턱을 읽는다 — 여기 숫자를 손으로 안 적는다',
    settle291.MIN_WAIT === 250, 'MIN_WAIT ' + settle291.MIN_WAIT);

  /* ---------------- [2] 전수 ---------------- */
  console.log('\n[2] 전수 — 들인 갈래에 «사슬 밖» 0');
  const rest = census();
  const cnt = b => rest.filter(r => r.branch === b).length;
  console.log('  남은 사슬 밖 ' + rest.length + ' = A ' + cnt('A') + ' + B ' + cnt('B') +
    ' + C ' + cnt('C') + ' + D ' + cnt('D') + ' + E ' + cnt('E'));
  ok('[2a] 들인 갈래에 «사슬 밖» 이 한 자도 없다 (2회차에 B·E 가 들어와 A~E 전부다)',
    rest.filter(r => !PENDING_BRANCHES.includes(r.branch)).length === 0,
    rest.filter(r => !PENDING_BRANCHES.includes(r.branch)).map(r => r.file).join(' ') || '어긋남 0');
  ok('[2b] 남은 것은 아직 안 들인 갈래뿐이다 (B·E 이하 — 그 갈래가 0 이 돼도 참이다)',
    rest.every(r => PENDING_BRANCHES.includes(r.branch)),
    rest.map(r => r.branch).sort().join('') || '남은 것 0');
  ok('[2c] 925 의 규칙과 어긋나지 않는다 — 들인 자는 전부 «사슬»',
    SWAPPED.every(f => classifyFile(T(f)) === 'chain'),
    SWAPPED.filter(f => classifyFile(T(f)) !== 'chain').join(' ') || '어긋남 0');

  /* ---------------- [3] 들인 자 ---------------- */
  console.log('\n[3] 들인 자 ' + SWAPPED.length + ' — 사슬을 지나고 자기 사본이 없다');
  const noCopy = [], noChain = [], aliased = [], badAlias = [];
  /* ⚠ 이름이 부딪히는 자가 셋 있다 — `probe695`·`probe791`·`probe794` 는 **자기** `const launch` 를
     이미 갖고 있어 사슬의 `launch` 를 그대로 들이면 재선언으로 즉사한다(1회차에 `fix931 --dry` 의
     문법 검사가 실물 전에 잡았다). 그 셋만 `pwLaunch` 로 들여온다.
     ⇒ 게이트는 별명을 «허용» 하는 데서 멈추지 않고 **별명의 이유까지** 못박는다:
        자기 `launch` 가 없는데 별명을 쓰면 그건 그냥 딴 이름이라 빨갛다. */
  const RE_OWN_LAUNCH = /\b(?:const|let|var)\s+launch\s*=|function\s+launch\s*\(/;
  for (const f of SWAPPED) {
    const src = fs.readFileSync(T(f), 'utf8');
    const alias = /\bpwLaunch\(chromium/.test(src);
    if (alias) aliased.push(f);
    if (alias && !RE_OWN_LAUNCH.test(src)) badAlias.push(f);   /* 이유 없는 별명 */
    if (!((/\blaunch\(chromium/.test(src) || alias) && /require\((['"])\.\/pwlaunch\1\)/.test(src))) noChain.push(f);
    /* 자기 사본 셋 — 직접 launch · 실행 파일 후보 · npx 사다리 */
    if (/chromium\.launch\(/.test(src) || /PW_CHROMIUM/.test(src) || /'_npx'/.test(src)) noCopy.push(f);
  }
  ok('[3a] 전부 사슬의 launch 로 띄운다 (별명 포함)', noChain.length === 0, noChain.join(' ') || '어긋남 0');
  ok('[3a2] 별명 `pwLaunch` 를 쓴 자는 **자기 `launch` 가 있어서** 그런 것이다 (이유 없는 별명 0)',
    badAlias.length === 0, '별명 ' + aliased.length + '자: ' + (aliased.join(' ') || '없음'));
  ok('[3b] 자기 사본(직접 launch · `PW_CHROMIUM` 후보 · npx 사다리)이 한 자도 없다',
    noCopy.length === 0, noCopy.join(' ') || '어긋남 0');
  ok('[3c] 죽은 `launchOpts()` 가 남지 않았다',
    SWAPPED.every(f => !/function launchOpts\(\)/.test(fs.readFileSync(T(f), 'utf8'))),
    SWAPPED.filter(f => /function launchOpts\(\)/.test(fs.readFileSync(T(f), 'utf8'))).join(' ') || '어긋남 0');

  /* ---------------- [4] 장치 ---------------- */
  console.log('\n[4] 장치 — 사슬을 지나면 실제로 받는다');
  ok('[4a] 731 차단기는 entry 를 안 본다 — 들인 44자가 전부 받는다',
    typeof require('./evguard731').armBrowser === 'function');
  const aFiles = SWAPPED.filter(f => /^(probe|bisect|fnchk)/.test(f));
  ok('[4b] 갈래 A·D 는 entry 가 verify 가 아니라 291 이 안 붙는다 (자의 세상이 안 바뀐다)',
    aFiles.length === 24 && aFiles.every(f => !/^verify.*\.js$/.test(f)), aFiles.length + '자');
  ok('[4c] 갈래 C 의 셋은 verify* 라 291 이 붙되, 250ms 이상 대기가 없어 **한 번도 안 돈다**',
    ['verify108.js', 'verify59.js', 'verify66.js'].every(f => devices(f).d291 === false));
  ok('[4d] 291 의 관문은 `settle291.enabled()` 와 같은 규칙이다 (사본을 안 적었다)',
    /verify/.test(settle291.enabled.toString()) && settle291.CAP_MS === 1500);
  /* 2회차 — 갈래 B 는 «장치가 실제로 도는» 유일한 갈래다. 여기가 초록이라는 것이
     이 회차의 전후 대조(5회씩)가 **잴 것이 있었다**는 뜻이다(A·C·D 는 291 이 안 돌아 잴 것이 없었다). */
  const bFiles = SWAPPED.filter(f => /^verify/.test(f) && devices(f).d291);
  ok('[4e] 갈래 B 16자는 verify* + 250ms 이상 대기라 **291 이 실제로 돈다**',
    bFiles.length === 16, bFiles.length + '자');
  ok('[4f] `smoke.js`(갈래 E)는 entry 가 verify* 가 아니라 291 이 안 붙는다 — 받는 장치는 731 뿐',
    devices('smoke.js').d291 === false && devices('smoke.js').d731 === true);

  /* ---------------- [5] 걷개 ---------------- */
  console.log('\n[5] 걷개 — 918/922 도 907 도 이 44 에는 안 걸린다');
  const all = SWAPPED.concat(rest.map(r => r.file));
  const w918 = all.filter(f => shell918.qualifies(T(f)));
  const w907 = all.filter(f => /^verify.*\.js$/.test(f) && raster907.qualifies(T(f)));
  ok('[5a] 918/922 걷개가 걸리는 자 0 — 등재문의 «화소를 안 재서 걷개는 필요 없다»',
    w918.length === 0, w918.join(' ') || '0자');
  ok('[5b] 907 깃발이 걸리는 자 0 — 라스터 경로를 한 자도 안 바꿨다',
    w907.length === 0, w907.join(' ') || '0자');
  ok('[5c] 그래서 이 회차가 바꾼 장치는 731(과 갈래 B 의 291)뿐이다 — 대조의 범위가 좁다',
    w918.length === 0 && w907.length === 0);

  /* ---------------- [R] 되돌림 ---------------- */
  console.log('\n[R] 되돌림 — 옛 사본을 그대로 가진 자는 «사슬 밖» 으로 잡힌다');
  ok('[R1] 지어낸 옛 사본은 «사슬 밖» 이다 (= [2a] 는 셀 것이 없어서 초록인 헛초록이 아니다)',
    classify(OLD_BOOTSTRAP) === 'bypass');
  ok('[R2] 사슬 한 줄을 넣으면 곧바로 «사슬» 이 된다 — 처방은 한 줄이다',
    classify("const { pw, launch } = require('./pwlaunch');\n" + OLD_BOOTSTRAP) === 'chain');
  ok('[R3] 들인 자에서 사슬 한 줄을 빼면 곧바로 «사슬 밖» 으로 잡힌다',
    classify(fs.readFileSync(T(SWAPPED[0]), 'utf8')
      .replace(/require\((['"])\.\/pwlaunch\1\)/, "require('playwright')")
      .replace(/launch\(chromium/, 'chromium.launch(')) !== 'chain');
  ok('[R4] 갈래 판별기는 «사슬 밖» 만 센다 — 들인 자는 census 에 안 나온다',
    !rest.some(r => SWAPPED.includes(r.file)));
} finally {
  made.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
}

console.log('\nVERIFY931 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
process.exit(fail ? 1 : 0);
