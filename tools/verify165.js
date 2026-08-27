/* verify165.js — 작업 165 회귀 게이트 (정적 검사, 브라우저 안 띄운다)
 *
 * 지키는 것: **`tools/*.js` 어느 파일도 «폴백 없는 `chromium.launch()`» 를 쓰지 않는다.**
 *
 * 왜 게이트가 필요한가 — 이 러너는 드라이버가 기대하는 크로미움 빌드(1234)와
 * 미리 깔린 것(/opt/pw-browsers, 1194)이 다르다. `require('playwright')` +
 * `chromium.launch()` 를 직결로 쓰면 `Executable doesn't exist at …` 로 **한 줄도 못 돈다.**
 * 작업 127 이 회귀 게이트 12종을, 작업 165 가 캡처 하네스 69개를 `pwlaunch` 로 옮겼는데,
 * 새 하네스를 옛 파일에서 복붙해 만들면 그대로 되살아난다(실제로 127 뒤에 68개가 남았다).
 *
 * 통과 조건 (파일마다 둘 중 하나):
 *   ① `pwlaunch` 를 써서 `launch(chromium, …)` 으로 띄운다            ← 권장
 *   ② 자체 폴백(`executablePath` / `PW_CHROMIUM`)을 갖고 있다          ← 127 이 «급하지 않음» 으로 남긴 것
 *
 * 사용: node tools/verify165.js
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SELF = 'verify165.js';
const HELPER = 'pwlaunch.js';

/* 주석·문서 안의 `chromium.launch()` 언급은 세지 않는다 — 실제 호출부만 본다.
   실행 형태는 전부 `await` / 대입 / `return` 중 하나로 나타난다. */
const CALL = /(?:await|=|return)\s+chromium\.launch\s*\(/;

const files = fs.readdirSync(DIR).filter(n => n.endsWith('.js') && n !== SELF && n !== HELPER).sort();

let pass = 0;
const bad = [];
const ownFb = [];

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const direct = CALL.test(src);
  if (!direct) { pass++; continue; }                       /* pwlaunch 경유거나 아예 안 띄움 */
  if (/executablePath|PW_CHROMIUM/.test(src)) { ownFb.push(f); pass++; continue; }
  bad.push(f);
}

console.log('VERIFY165 — tools/*.js ' + files.length + '개 정적 검사');
console.log('  pwlaunch 경유 또는 브라우저 미사용 : ' + (pass - ownFb.length) + '개');
console.log('  자체 폴백 보유(허용, 중복 코드)     : ' + ownFb.length + '개');
if (ownFb.length) console.log('    ' + ownFb.join(' '));

if (bad.length) {
  console.log('\n  ✗ 폴백 없는 chromium.launch() : ' + bad.length + '개');
  bad.forEach(f => console.log('      ' + f + '  → const { pw, launch } = require(\'./pwlaunch\'); / await launch(chromium, …)'));
  console.log('\nVERIFY165 FAIL ' + bad.length + '건 (' + pass + '/' + files.length + ')');
  process.exit(1);
}

console.log('\nVERIFY165 PASS ' + pass + '/' + files.length);
