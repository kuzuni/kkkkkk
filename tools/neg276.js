/* 276 음성 검사 — verify193 [1-a]/[1-b] 가 «진짜로 무는가».
   276 은 «제품이 옳고 게이트가 낡았다» 계열이라, 표를 제품에 맞춰 고치면 **아무것도 안 보는 표**로
   굳을 위험이 그대로 있다(211~215·275 가 같은 함정에 빠졌던 자리다). 그래서 기대값을 갱신한 뒤
   **index.html 을 일부러 되돌려 놓고 게이트가 빨개지는지**를 확인한다.

   실행: node tools/neg276.js      (index.html 을 잠깐 고쳤다 원상 복구한다 — 끝에 git diff 로 검산)

   [1-a] 기존 19종 id·등급·cd 불변  … 세이브가 실제로 의존하는 축
   [1-b] `m` 이동은 등재분 4건뿐    … 260 이 옮긴 것만, 그 값 그대로 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HTML = path.resolve(__dirname, '../index.html');
const GATE = path.resolve(__dirname, 'verify193.js');
const A = '기존 19종 id·등급·cd 불변';
const B = '기존 19종 `m` 이동은 등재분 4건뿐';

/* [원문, 바꿀 문장, 기대(a,b) — 1 = ✓ 통과, 0 = ✗ 빨개짐] */
const CASES = [
  ['① 무변경 (현재 제품)', null, null, [1, 1]],
  ['② 260 되돌림 — drain m 2.40 → 2.00 (등재값과 제품 불일치)',
   "id:'drain',  n:'흡혈의 검', g:3, ic:'🩸', cd:2.60, m:2.40",
   "id:'drain',  n:'흡혈의 검', g:3, ic:'🩸', cd:2.60, m:2.00", [1, 0]],
  ['③ 260 되돌림 — frost m 1.25 → 1.45 (반대 방향)',
   "id:'frost',  n:'서리 연쇄', g:3, ic:'🧊', cd:2.10, m:1.25",
   "id:'frost',  n:'서리 연쇄', g:3, ic:'🧊', cd:2.10, m:1.45", [1, 0]],
  ['④ 미등재 이동 — boom m 2.40 → 2.00 (아무도 등재 안 한 조임)',
   "id:'boom',   n:'화염구',    g:3, ic:'🔴', cd:2.00, m:2.40",
   "id:'boom',   n:'화염구',    g:3, ic:'🔴', cd:2.00, m:2.00", [1, 0]],
  ['⑤ 세이브 축 회귀 — holy cd 3.00 → 2.50',
   "id:'holy',   n:'심판의 빛', g:5, ic:'🌟', cd:3.00, m:4.00",
   "id:'holy',   n:'심판의 빛', g:5, ic:'🌟', cd:2.50, m:4.00", [0, 1]],
  ['⑥ 세이브 축 회귀 — holy 등급 5 → 4',
   "id:'holy',   n:'심판의 빛', g:5, ic:'🌟', cd:3.00, m:4.00",
   "id:'holy',   n:'심판의 빛', g:4, ic:'🌟', cd:3.00, m:4.00", [0, 1]]
];

const orig = fs.readFileSync(HTML, 'utf8');
let bad = 0;

const verdict = out => {
  const line = t => (out.split('\n').find(l => l.includes(t)) || '');
  const la = line(A), lb = line(B);
  if (!la || !lb) return null;                       /* 단언 자체가 사라졌다 = 검사 불능 */
  return [la.includes('✓') ? 1 : 0, lb.includes('✓') ? 1 : 0];
};

try {
  for (const [n, from, to, want] of CASES) {
    if (from) {
      if (orig.indexOf(from) < 0) { console.log('FAIL  ' + n + '  →  원문 미발견(케이스가 낡음)'); bad++; continue; }
      fs.writeFileSync(HTML, orig.replace(from, to));
    } else fs.writeFileSync(HTML, orig);
    let out;
    try { out = execFileSync('node', [GATE], { encoding: 'utf8' }); }
    catch (e) { out = (e.stdout || '') + (e.stderr || ''); }   /* FAIL 이면 exit 1 — 출력은 그대로 쓴다 */
    const got = verdict(out);
    const okc = got && got.join() === want.join();
    if (!okc) bad++;
    console.log((okc ? ' ok ' : 'FAIL') + '  ' + n
                + '  →  ' + (got ? '[1-a]' + got[0] + ' [1-b]' + got[1] : '단언 소실')
                + '  (want [1-a]' + want[0] + ' [1-b]' + want[1] + ')');
  }
} finally {
  fs.writeFileSync(HTML, orig);                       /* 무슨 일이 있어도 원상 복구 */
}

/* 복구 검산 — 게이트가 아니라 git 에게 묻는다 */
let dirty = '';
try { dirty = execFileSync('git', ['diff', '--stat', '--', HTML], { encoding: 'utf8', cwd: path.dirname(GATE) }).trim(); }
catch (e) { dirty = '(git 조회 실패)'; }
const restored = dirty === '';
if (!restored) bad++;
console.log((restored ? ' ok ' : 'FAIL') + '  ⑦ index.html 원상 복구 — git diff 비어 있음'
            + (restored ? '' : ' — 남은 변경: ' + dirty));

const total = CASES.length + 1;
console.log('\nNEG276 ' + (total - bad) + '/' + total + (bad ? '  ✗ FAIL' : '  ✓ PASS'));
process.exit(bad ? 1 : 0);
