#!/usr/bin/env node
/* 게이트 952 — «적어 둔 코드» 를 «재는 코드» 로 세지 않는다 (925 [2d] 오탐 마감)
 *
 *   node tools/verify952.js
 *
 * ── 무엇을 지키는가 ──────────────────────────────────────────────────────
 * 925 [2d] 는 «화소를 재는 자(922 census) 중 브라우저를 안 띄우는 자 0» 을 물었고 `verify936` 에서 빨개졌다.
 * 등재문의 갈래 둘 중 **ⓑ(판별 오탐)** 가 맞았다 — 다만 자리는 등재문이 짚은 «주석» 이 아니라 **문자열**이다:
 * census 는 주석을 이미 벗기고 보므로(`raster907.stripComments`) 주석만 가진 자는 애초에 인구에 안 든다.
 * `verify936` 의 `getImageData` 는 [6] 판별기 자기시험에 먹이는 **인공 표본 `BASE`**(문자열 배열) 안에 있고,
 * 그 자는 브라우저를 한 번도 안 띄운다 — 사슬을 지나라고 요구할 대상 자체가 없는 자리였다.
 *
 * ⇒ 처방은 **인구를 줄이는 것이 아니라 갈래를 하나 더 세우는 것**이다(`tools/quote952.js`):
 *   'code'  도는 코드로 잰다 → 사슬 의무 그대로 · 'quote' 적어 두기만 했다 → 붙을 자리가 없다 · 'no' 인구 밖.
 *   918/922 의 `RE_PX`(걷개를 켜는 자리)는 **한 글자도 안 건드렸다** — 넉넉한 쪽이 안전한 자리라서다.
 *
 * 절:
 *   [1] 갈래   — 문자열·템플릿·정규식·주석·도는 코드를 각각 옳게 가른다
 *   [2] 자리   — `verify936` 이 실제로 그 꼴이다(quote ∧ 브라우저 0) · 925 는 사본을 안 든다
 *   [3] 인구   — 인구는 안 줄었다(census 그대로) · 갈래로 초록이 된 자는 오늘 **하나**뿐이다
 *   [4] 지움   — `strip` 은 «지우기만» 한다(글자를 새로 만들지 않는다) · 전 자에서 안 죽는다
 *   [R] 되돌림 — 같은 표본을 **따옴표만 벗겨** 도는 코드로 만들면 곧바로 'code' → [2d] 가 다시 빨개진다
 *                (= 이 수리는 «무엇을 해도 초록» 이 아니다)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { strip, pixelKind } = require('./quote952');
const shell918 = require('./shell918');
const raster907 = require('./raster907');
const { census } = require('./probe922');
const { classifyFile, classify } = require('./verify925');

const TOOLS = __dirname;
const T = f => path.join(TOOLS, f);
const read = f => fs.readFileSync(T(f), 'utf8');

let pass = 0, fail = 0;
const ok = (msg, cond, detail) => {
  cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' ' + msg + (detail ? ' — ' + detail : ''));
};

console.log('VERIFY952 — «적어 둔 코드» 와 «도는 코드»\n');

/* ---------------- [1] 갈래 ---------------- */
console.log('[1] 갈래 — 규칙이지 목록이 아니다');
ok('[1a] 도는 코드는 code', pixelKind('await page.evaluate(() => ctx.getImageData(0, 0, 1, 1));') === 'code');
ok('[1b] 캡처 한 장도 code', pixelKind('const png = await page.screenshot({ clip: box });') === 'code');
ok('[1c] 문자열 표본은 quote', pixelKind("const S = ['ctx.getImageData(bx, by, w, h).data'].join('\\n');") === 'quote');
ok('[1d] 겹따옴표도 quote', pixelKind('const S = "await page.screenshot({});";') === 'quote');
ok('[1e] 템플릿의 «글» 은 quote', pixelKind('const S = `ctx.getImageData(0,0,1,1)`;') === 'quote');
ok('[1f] 템플릿의 `${ }` **안은 코드다** — 여기서 재면 code (구멍이 될 자리)',
  pixelKind('const S = `x${ ctx.getImageData(0, 0, 1, 1).data[0] }y`;') === 'code');
ok('[1g] 정규식 리터럴의 속은 quote — 패턴은 재는 코드가 아니다',
  pixelKind('const R = /getImageData|\\.screenshot\\(/;') === 'quote');
ok('[1h] 주석만 가진 자는 no — 세는 쪽이 주석을 이미 벗긴다(인구 밖)',
  pixelKind('/* getImageData 를 재는 자 */\nconst a = 1;') === 'no'
  && pixelKind('// await page.screenshot({})\nconst a = 1;') === 'no');
ok('[1i] 화소를 아예 안 말하면 no', pixelKind('const fs = require("fs");') === 'no');
ok('[1j] 이스케이프된 따옴표에 안 속는다 — 문자열은 거기서 안 끝난다',
  pixelKind("const S = 'it\\'s ctx.getImageData(0,0,1,1)';") === 'quote');
ok('[1k] 나눗셈을 정규식으로 오독하지 않는다 — 뒤의 도는 코드가 살아남는다',
  pixelKind('const r = a / b; await page.screenshot({});') === 'code');

/* ---------------- [2] 자리 ---------------- */
console.log('\n[2] 자리 — `verify936` 이 실제로 그 꼴이다');
const V936 = read('verify936.js');
ok('[2a] `verify936` 은 quote 다 (도는 코드로 화소를 재지 않는다)', pixelKind(V936) === 'quote');
ok('[2b] 그 자는 브라우저를 여는 말을 한 마디도 안 한다 (사슬 관계 = 무관)',
  classifyFile(T('verify936.js')) === 'none'
  && !/require\((['"])playwright\1\)/.test(V936) && !/pwlaunch/.test(V936));
ok('[2c] 그런데도 세는 쪽은 그 자를 «화소를 재는 자» 로 센다 — 인구는 그대로다(오탐의 자리)',
  shell918.RE_PX.test(raster907.stripComments(V936)));
ok('[2d] 그 화소 토큰은 판별기에 먹이는 **문자열 표본**이다 (`pin.classifySource` 로 간다)',
  /const BASE = \[/.test(V936) && /classifySource\(BASE/.test(V936));
const V925 = read('verify925.js');
ok('[2e] 925 는 갈래 규칙의 **사본을 안 든다** — `quote952` 를 부른다',
  /require\((['"])\.\/quote952\1\)/.test(V925) && !/stripLiterals|pixelKind\s*=\s*\(/.test(V925.replace(/require[^\n]*quote952[^\n]*/, '')));
ok('[2f] `quote952` 도 «화소를 재는가» 를 다시 안 적는다 — `shell918.RE_PX` 를 읽는다',
  /shell918\.RE_PX/.test(read('quote952.js')) && !/\/\\\.screenshot\\\(\|getImageData\//.test(read('quote952.js')));

/* ---------------- [3] 인구 ---------------- */
console.log('\n[3] 인구 — 줄이지 않았다. 갈래만 갈랐다');
const c = census();
const px = [...c.hit, ...c.px, ...c.pxManual, ...c.pxSelf];
const none = px.filter(f => classifyFile(T(f)) === 'none');
const quoted = px.filter(f => pixelKind(read(f)) === 'quote');
ok('[3a] 화소를 재는 자 인구가 그대로다 (922 규모)', px.length >= 300, px.length + '개');
ok('[3b] 그중 «무관» 은 전부 quote — 도는 코드로 재는데 안 띄우는 자 0',
  none.every(f => pixelKind(read(f)) === 'code' === false) && none.every(f => pixelKind(read(f)) === 'quote'),
  none.join(' ') || '0개');
ok('[3c] 이 갈래로 **초록이 된 자는 오늘 하나뿐**이다 — 나머지 quote 는 원래 사슬 안이었다',
  none.length === 1 && none[0] === 'verify936.js',
  '초록이 된 자 [' + none.join(' ') + '] · quote 전체 ' + quoted.length + '자');
ok('[3d] quote 인 나머지는 전부 사슬(또는 자식에 심는 자)이다 — 갈래가 남의 의무를 안 지웠다',
  quoted.filter(f => f !== 'verify936.js').every(f => ['chain', 'inject'].includes(classifyFile(T(f)))),
  quoted.filter(f => f !== 'verify936.js').map(f => f + ':' + classifyFile(T(f))).join(' '));

/* ---------------- [4] 지움 ---------------- */
console.log('\n[4] 지움 — «지우기만» 한다');
const files = fs.readdirSync(TOOLS).filter(f => /\.js$/.test(f)).sort();
let bad = [], died = [];
for (const f of files) {
  const src = read(f);
  let s;
  try { s = strip(src); } catch (e) { died.push(f); continue; }
  if (s.length !== src.length) { bad.push(f + '(길이)'); continue; }
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== src[i] && s[i] !== ' ') { bad.push(f + '@' + i); break; }
  }
}
ok('[4a] 전 자(' + files.length + '개)에서 안 죽는다', died.length === 0, died.join(' ') || '0개');
ok('[4b] 결과는 원본의 «부분» 이다 — 글자를 새로 만들지 않는다(길이·개행 보존)', bad.length === 0, bad.join(' ') || '어긋남 0');
ok('[4c] 개행은 안 지운다 — 줄 번호가 안 밀린다',
  strip("const S = 'a\\nb';\nconst t = 1;\n").split('\n').length === "const S = 'a\\nb';\nconst t = 1;\n".split('\n').length);

/* ---------------- [R] 되돌림 ---------------- */
console.log('\n[R] 되돌림 — 표본의 따옴표만 벗기면 곧바로 빨개진다');
/* `verify936` 의 BASE 표본에서 따옴표를 걷어 «도는 코드» 로 만든 사본 — 인구에 들어가면 [2d] 가 잡아야 한다. */
const unquoted = V936.replace(/'([^'\n]*getImageData[^'\n]*)',/, '$1');
ok('[R1] 되돌림 재료를 만들었다 — 표본 한 줄의 따옴표만 걷었다', unquoted !== V936);
ok('[R2] 그 사본은 code 로 잡힌다 — 925 [2d] 가 다시 빨개진다(= 헛초록이 아니다)',
  pixelKind(unquoted) === 'code' && classify(unquoted) === 'none');
ok('[R3] 원본은 그대로 quote 다 (되돌림만 빨갛다)', pixelKind(V936) === 'quote');
ok('[R4] 사슬 한 줄을 넣으면 의무 쪽에서도 초록이 된다 — 처방은 언제나 한 줄이다',
  classify("const { pw, launch } = require('./pwlaunch');\n" + unquoted) === 'chain');
/* 통째로 지우는 사본을 대면 도는 코드까지 quote 로 읽힌다 — 그래서 [1f]·[R2] 가 필요하다. */
const blanketQuote = src => (shell918.RE_PX.test(src.replace(/[\s\S]*/, '')) ? 'code' : 'quote');
ok('[R5] «통째로 지우는» 사본은 도는 코드도 quote 로 읽는다 — 이 가름이 그 꼴이 아님을 [1f] 가 못박는다',
  blanketQuote('await page.screenshot({});') === 'quote'
  && pixelKind('await page.screenshot({});') === 'code');

console.log('\nVERIFY952 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  ALL PASS'));
process.exit(fail ? 1 : 0);
