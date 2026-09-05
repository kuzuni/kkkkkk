#!/usr/bin/env node
/* 작업 913 — «pngjs 를 부르는 자가 조용히 사라지지 않는다»
 *
 * 등재(913): `tools/verify878.js` 가 1초 만에 즉사한다 — `Cannot find module 'pngjs'`.
 * 실측으로 갈린 것 셋:
 *   ① 자 자신은 멀쩡했다 — 의존을 심으니 그 자리에서 **VERIFY878 8/8 PASS**(제품·판정 0줄).
 *   ② 날 `require('pngjs')` 는 **스택 트레이스 + 종료 코드 1**로 죽어 점수 줄이 한 줄도 안 나온다
 *      ⇒ 스윕에 «빨강» 이 아니라 **«없는 자»** 로 지나간다. 이것이 등재된 해악이다.
 *   ③ pngjs 를 부르는 자는 하나가 아니라 **17개**다 ⇒ 등재문의 ⓑ(«의존을 없앤다»)를 한 자에 쓰면
 *      나머지 16이 그대로 즉사한다. ⓐ(«의존을 심는다») + «없으면 크게 말한다» 를 채택했다(위임 규약).
 *
 * 이 자가 지키는 약속 — **어느 것도 자의 «점수» 를 묻지 않는다**(878 의 판정은 913 의 몫이 아니다):
 *   [A] 공용 부트스트랩 `tools/png913.js` 가 있고, 없을 때 «할 일 한 줄 + 코드 2» 로 답한다.
 *   [B] pngjs 를 하드 require 하는 자가 0 이다 — 폴백을 가진 예외 둘만 남는다.
 *   [C] 지시서 [6] «준비» 절이 playwright 와 pngjs 를 **한 명령**으로 적는다(따로 부르면 서로 지운다).
 *   [R] 되돌림 시험 — 모듈을 감추면 [A] 의 약속이 실제로 지켜지는가(헛초록이 아님을 못박는다).
 *
 * 돌리는 법: `node tools/verify913.js`
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const T = path.join(ROOT, 'tools');
let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) { pass++; console.log('  ✓ ' + m); } else console.log('  ✗ ' + m); };

console.log('=== verify913 — pngjs 를 부르는 자가 «없는 자» 로 사라지지 않는다 ===');
console.log('정의: 하드 require = `require(\'pngjs\')` 를 폴백 없이 부르는 자 · 기대 응답 = «한 줄 + 코드 2»\n');

/* ---------- [A] 공용 부트스트랩 ---------- */
const bootP = path.join(T, 'png913.js');
ok(fs.existsSync(bootP), '[A1] 공용 부트스트랩 tools/png913.js 가 있다');

let boot = null;
try { boot = require('./png913'); } catch (_) {}
ok(boot && typeof boot.PNG === 'function' && typeof boot.available === 'function',
   '[A2] png913 이 PNG()/available() 를 내놓는다 — 죽이지 않고 «묻기만» 하는 길이 있다');
ok(boot && /npm i --no-save playwright pngjs/.test(String(boot.HINT || '')),
   '[A3] 안내문이 «한 번에 부르는» 명령을 적는다 — ' + JSON.stringify(boot && boot.HINT));

/* 110 pw() 와 같은 말투인가 — «<모듈> 없음 — npm i …» */
ok(boot && /^pngjs 없음 — /.test(String(boot.HINT || '')),
   '[A4] 110 `pw()` 와 같은 말투다(«pngjs 없음 — …») — 워커가 이미 아는 문장');

/* ---------- [B] 하드 require 0 ---------- */
/* 폴백을 가진 예외 둘은 «부르되 안 죽는다» — 여기서 빼는 것이 맞다.
   747: try/catch → python3 PIL · 54: 아예 안 쓴다(크로미움 canvas 로 디코드) */
const EXEMPT = new Set(['verify747.js']);
const files = fs.readdirSync(T).filter(f => f.endsWith('.js'));
const hard = [];
const viaBoot = [];
for (const f of files) {
  if (f === 'png913.js') continue;
  const src = fs.readFileSync(path.join(T, f), 'utf8');
  /* 주석 줄은 세지 않는다 — 문서가 인용한 문자열까지 «위반» 으로 읽으면 자가 거짓말을 한다 */
  const codeLines = src.split('\n').filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l));
  const calls = codeLines.some(l => /require\(\s*['"]pngjs['"]\s*\)/.test(l));
  if (calls && !EXEMPT.has(f)) hard.push(f);
  if (/require\(\s*['"]\.\/png913['"]\s*\)/.test(src)) viaBoot.push(f);
}
ok(hard.length === 0, '[B1] ★ pngjs 를 폴백 없이 하드 require 하는 자 0건 — ' +
   (hard.length ? hard.join(', ') : '0건'));
ok(viaBoot.length >= 15, '[B2] 부트스트랩을 거쳐 부르는 자가 15개 이상 — ' + viaBoot.length + '개');
ok(viaBoot.includes('verify878.js'), '[B3] 등재가 지목한 verify878 이 그 안에 있다');

/* 예외 둘이 «정말로» 폴백을 갖는가 — 면제가 헛말이 아님을 묻는다 */
const s747 = fs.readFileSync(path.join(T, 'verify747.js'), 'utf8');
ok(/catch/.test(s747) && /python3|PIL|pillow/i.test(s747),
   '[B4] 면제한 verify747 은 실제로 폴백을 갖는다(try/catch → python3 PIL)');
const s54 = fs.readFileSync(path.join(T, 'verify54.js'), 'utf8');
ok(!/require\(\s*['"]pngjs['"]\s*\)/.test(s54),
   '[B5] verify54 는 애초에 pngjs 를 안 부른다(크로미움 canvas 디코드) — 면제 목록에 넣을 필요조차 없다');

/* ---------- [C] 지시서 [6] «준비» 절 ---------- */
const routine = fs.readFileSync(path.join(ROOT, 'docs', 'ROUTINE.md'), 'utf8');
ok(/npm i --no-save playwright pngjs/.test(routine),
   '[C1] ★ 지시서가 playwright 와 pngjs 를 «한 명령» 으로 적는다');
/* 따로 두 번 부르면 지워진다는 사실이 그 자리에 적혀 있는가 —
   LESSONS 에 세 번 적히고도 이 줄이 안 고쳐져 교훈이 계속 다시 배워졌다(913 의 뿌리). */
ok(/지운다|날린다|removed 2 packages/.test(routine) && /따로 두 번|한 번에/.test(routine),
   '[C2] «따로 두 번 부르면 앞의 것이 지워진다» 가 그 자리에 적혀 있다');
/* 옛 줄(playwright 만 심는 준비)이 남아 있으면 다음 워커가 그것을 따라 pngjs 를 지운다 */
ok(!/`npm i --no-save playwright && npx playwright install chromium`/.test(routine),
   '[C3] pngjs 를 지우는 옛 준비 명령이 지시서에 남아 있지 않다');

/* ---------- [R] 되돌림 시험 ---------- */
/* 모듈을 감춘 세상에서 자가 «한 줄 + 코드 2» 로 답하는지 직접 굴린다.
   [A] 가 선언을 읽는 자라면 [R] 은 그 선언이 실제로 지켜지는지를 재는 자다. */
const nm = path.join(ROOT, 'node_modules', 'pngjs');
const hiddenTo = path.join(ROOT, 'node_modules', '.pngjs-913-hidden');
const had = fs.existsSync(nm);
ok(had || boot === null, '[R0] 지금 트리에 pngjs 가 실제로 설치돼 있다(없으면 되돌림 시험을 못 한다) — ' +
   (had ? '있음' : '없음'));

if (had) {
  let out = '', code = 0;
  try { fs.renameSync(nm, hiddenTo); } catch (_) {}
  try {
    /* 부트스트랩을 부르는 최소 표본 — 브라우저를 안 띄우므로 몇 ms 다 */
    const probe = 'require(' + JSON.stringify(path.join(T, 'png913.js')) + ').PNG()';
    execFileSync(process.execPath, ['-e', probe], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status;
    out = String((e.stderr || '') + (e.stdout || ''));
  } finally {
    try { fs.renameSync(hiddenTo, nm); } catch (_) {}
  }
  ok(code === 2, '[R1] ★ 모듈이 없으면 종료 코드 **2**(«환경에 없음») — 옛 날 require 는 1(«오류») · 실측 ' + code);
  ok(/pngjs 없음/.test(out) && !/MODULE_NOT_FOUND/.test(out),
     '[R2] ★ 스택 트레이스가 아니라 «할 일 한 줄» 이 나온다 — ' + JSON.stringify(out.trim().split('\n')[0] || ''));
  ok(fs.existsSync(nm), '[R3] 되돌림 시험이 트리를 원래대로 되돌렸다(감춘 모듈을 제자리에)');
}

console.log('\nVERIFY913 ' + pass + '/' + total + (pass === total ? ' PASS' : ' FAIL'));
process.exit(pass === total ? 0 : 1);
