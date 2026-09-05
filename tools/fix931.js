/* 수리기 931 — 사슬 밖 자의 «손으로 적은 부트스트랩» 을 공용 사슬(`pwlaunch`)로 갈아 끼운다
 *
 *   node tools/fix931.js --branch A,C,D            — 미리보기(무엇을 어떻게 바꾸는지만)
 *   node tools/fix931.js --branch A,C,D --dry <dir> — 바꾼 사본을 그 자리에 쓴다(문법 검사용)
 *   node tools/fix931.js --branch A,C,D --write    — 실제로 쓴다
 *   node tools/fix931.js --files probe227.js --write
 *
 * ⚠ `--dry` 가 있는 이유 — 전후 대조의 «전» 을 재는 동안 원본을 건드리면 그 대조가 통째로 썩는다.
 *   재는 중에도 «바뀐 꼴이 문법에 맞는가» 만 따로 물을 수 있어야 한다.
 *
 * 왜 수리기인가 —
 *   25자를 손으로 고치면 «같은 말을 25번 적는» 그 사고가 그대로 반복된다(925 가 넷에서 겪었다).
 *   변환은 셋뿐이고 전부 «같은 말의 사본을 지우는» 것이다(402):
 *     ⓐ 모듈 해석  — `require('playwright')` 직결 또는 npx 캐시 사다리 IIFE  →  `pw()`
 *     ⓑ 실행 파일 폴백 — `launchOpts()`/`{ executablePath: p }` try-catch  →  `launch(chromium, opts)`
 *     ⓒ 죽은 부품  — ⓑ 가 유일한 호출자였던 `launchOpts()`·후보 목록은 선언째 지운다
 *
 * ⚠ **모르는 꼴은 손대지 않는다.** 안 잡힌 자는 이름으로 찍고 파일을 그대로 둔다 —
 *   조용히 반쯤 고친 자를 남기는 것이 이 저장소가 겪은 사고의 얼굴이다(733).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { census } = require('./probe931');

const TOOLS = __dirname;
const WRITE = process.argv.includes('--write');
const DRY = (() => { const i = process.argv.indexOf('--dry'); return i >= 0 ? process.argv[i + 1] : ''; })();

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

let FILES;
if (arg('files', '')) FILES = arg('files', '').split(',').map(s => s.trim()).filter(Boolean);
else {
  const b = String(arg('branch', 'A')).toUpperCase().split(',');
  FILES = census().filter(r => b.includes(r.branch)).map(r => r.file);
}

const head = name =>
  '/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).\n' +
  '   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,\n' +
  '   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */\n' +
  "const { pw, launch" + (name === 'launch' ? '' : ': ' + name) + " } = require('./pwlaunch');\n" +
  'const { chromium } = pw();';

/* ⚠ 이름이 부딪히는 자가 있다 — `probe695`·`probe791`·`probe794` 는 자기 `const launch = async () => …`
   를 이미 갖고 있어 그대로 들이면 **재선언으로 즉사**한다(문법 오류라 `--dry` 문법 검사가 잡았다).
   그런 자에서만 들여오는 이름을 바꾼다. 자기 `launch` 는 그대로 두고 그 **안**이 사슬을 부르게 된다. */
const RE_OWN_LAUNCH = /\b(?:const|let|var)\s+launch\s*=|function\s+launch\s*\(/;
const bindName = src => (RE_OWN_LAUNCH.test(src) ? 'pwLaunch' : 'launch');

/* ---- ⓐ 모듈 해석 ---- */
function swapBootstrap(src) {
  const H = head(bindName(src));
  /* 사다리 IIFE — `const { chromium } = (() => { … })();` 를 통째로 */
  const iife = /const \{ chromium \} = \(\(\) => \{[\s\S]*?\n\}\)\(\);/;
  if (iife.test(src)) return { src: src.replace(iife, H), how: 'IIFE 사다리' };
  /* 직결 한 줄 */
  const direct = /const \{ chromium \} = require\((['"])playwright\1\);/;
  if (direct.test(src)) return { src: src.replace(direct, H), how: 'require 직결' };
  return null;
}

/* ---- ⓑ 실행 파일 폴백 ---- */
const LAUNCH_RULES = [
  /* 1) try { X = await chromium.launch(); } catch (e) { const o = launchOpts(); … X = await chromium.launch(o); } */
  { re: /try \{ (\w+) = await chromium\.launch\(\); \}\s*\n\s*catch \(e\) \{ const o = launchOpts\(\); if \(!o\.executablePath\) throw e; \1 = await chromium\.launch\(o\); \}/g,
    to: (m, v) => v + ' = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */' },
  /* 1b) 같은 꼴을 let 선언과 한 줄에 쓴 자(probe613) */
  { re: /let (\w+); try \{ \1 = await chromium\.launch\(\); \} catch \(e\) \{ const o = launchOpts\(\); if \(!o\.executablePath\) throw e; \1 = await chromium\.launch\(o\); \}/g,
    to: (m, v) => 'const ' + v + ' = await launch(chromium);   /* 931 — 폴백까지 사슬이 맡는다 */' },
  /* 2) 여러 줄 try/catch — catch 안에서 후보를 훑어 { executablePath: p } 로 다시 띄운다 */
  { re: /try \{ (\w+) = await chromium\.launch\(\); \}\s*\n\s*catch \(e?\) \{[\s\S]{0,400}?\1 = await chromium\.launch\(\{ executablePath: \w+ \}\);\s*\n\s*\}/g,
    to: (m, v) => v + ' = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */' },
  /* 2b) catch 가 `launchOpts()` 로 만든 o 를 그대로 넘기는 꼴 */
  { re: /try \{ (\w+) = await chromium\.launch\(\); \}\s*\n\s*catch \(e?\) \{[\s\S]{0,400}?\1 = await chromium\.launch\(o\);\s*\n\s*\}/g,
    to: (m, v) => v + ' = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */' },
  /* 3) return 꼴 — try { return await chromium.launch(); } catch { … return chromium.launch({ executablePath: p }); } */
  { re: /try \{ return await chromium\.launch\(\); \}\s*\n\s*catch \(e?\) \{[\s\S]{0,400}?return chromium\.launch\(\{ executablePath: \w+ \}\);\s*\n\s*\}/g,
    to: () => 'return await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */' },
  /* 4) 옵션을 launchOpts() 로만 만들던 한 줄 */
  { re: /await chromium\.launch\(launchOpts\(\)\)/g,
    to: () => 'await launch(chromium)' },
  /* 5) 자기 args 와 launchOpts() 를 합치던 한 줄 — args 는 살리고 폴백만 사슬로 */
  { re: /await chromium\.launch\(Object\.assign\((\{[^{}]*\}), launchOpts\(\)\)\)/g,
    to: (m, a) => 'await launch(chromium, ' + a + ')' },
];

/* ---- ⓒ 죽은 부품 — ⓑ 뒤에 아무도 안 부르는 `launchOpts()` 는 선언째 지운다 ---- */
const RE_LAUNCHOPTS = /(?:\/\*[^*]*\*\/\s*)?function launchOpts\(\)\s*\{[\s\S]*?\n\}\n/;
function dropLaunchOpts(src) {
  /* 아직 부르는 데가 있으면 안 지운다 — 선언을 뺀 사본에 호출이 남는지로 본다 */
  if (/launchOpts\(\)/.test(src.replace(RE_LAUNCHOPTS, ''))) return src;
  return src.replace(RE_LAUNCHOPTS, '');
}

let done = 0, skipped = [];
for (const f of FILES) {
  const p = path.join(TOOLS, f);
  const orig = fs.readFileSync(p, 'utf8');
  const b = swapBootstrap(orig);
  if (!b) { skipped.push(f + ' (부트스트랩 꼴 모름)'); continue; }
  let src = b.src;
  const hits = [];
  for (let i = 0; i < LAUNCH_RULES.length; i++) {
    const { re, to } = LAUNCH_RULES[i];
    const before = src;
    src = src.replace(re, to);
    if (src !== before) hits.push(i + 1);
  }
  if (!hits.length) { skipped.push(f + ' (launch 꼴 모름)'); continue; }
  if (/chromium\.launch\(/.test(src)) { skipped.push(f + ' (남은 chromium.launch 있음)'); continue; }
  /* 이름이 부딪히는 자에서는 부르는 쪽도 바꾼 이름으로 */
  const nm = bindName(orig);
  if (nm !== 'launch') src = src.replace(/\blaunch\(chromium/g, nm + '(chromium');
  src = dropLaunchOpts(src);
  console.log('  ' + f.padEnd(16) + b.how.padEnd(14) + 'launch 규칙 ' + hits.join(',') +
    (/function launchOpts/.test(src) ? '' : ' · launchOpts 삭제'));
  if (WRITE) fs.writeFileSync(p, src);
  else if (DRY) { fs.mkdirSync(DRY, { recursive: true }); fs.writeFileSync(path.join(DRY, f), src); }
  done++;
}

console.log('\n  ' + done + '자 ' + (WRITE ? '수리' : '수리 가능') + ' · 안 잡힌 자 ' + skipped.length);
for (const s of skipped) console.log('    ⚠ ' + s);
if (!WRITE) console.log('\n  (--write 를 붙여야 실제로 쓴다)');
