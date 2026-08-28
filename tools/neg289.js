/* 289 음성 검사 — 고친 verify125 가 «진짜 회귀» 를 여전히 무는가.
   289 는 «제품이 옳고 게이트가 낡았다» 계열이다(242·275·276·277 과 같은 갈래). 이런 작업의 가장 쉬운
   «고침» 은 빨간 단언을 **무르게 만드는** 것인데 — 여기선 A1 의 «비재화 제외» 를 넓히고 C2 의 종 수를
   선언에서 뽑게 했으므로, 그 둘이 **아무거나 통과시키는 껍데기가 아님**을 반증해 둔다.

   실행: node tools/neg289.js      (index.html 을 잠깐 고쳤다 원상 복구한다 — 끝에 git diff 로 검산)

   [N1] 아트 자리가 «아닌» 곳에 흘린 화폐 이모지        → A1 이 문다
   [N2] 긴 문자열을 `ic:` 로 위장해 숨김(값 8자 초과)     → A1 이 문다 (아트 자리 면제는 «한 글리프» 뿐)
   [N3] 허용 목록 항목이 소스와 어긋남(= 289 부패 재현)  → A3 이 문다 (예전엔 아무도 몰랐다)
   [N4] CUR_ICON 이 없는 파일을 가리킴                   → C1 이 문다 (추출이 오타를 빠뜨리지 않는다)
   [N5] 재화 둘이 같은 아이콘을 씀(집합 불일치)          → C2 가 문다
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const GATE = path.join(__dirname, 'verify125.js');
const ORIG = fs.readFileSync(HTML, 'utf8');

/* [이름, 물어야 할 항목 키, 결함 주입] */
const CASES = [
  ['[N1] 아트 자리가 아닌 코드에 화폐 이모지를 흘림', 'A1',
   s => s.replace('const CUR_ICON = {', "const LEAK_MSG = '\u{1F4B0} 골드 보상';\nconst CUR_ICON = {")],

  ['[N2] 긴 문자열을 ic: 로 위장해 숨김(값 8자 초과)', 'A1',
   s => s.replace('const CUR_ICON = {', "const FAKE_ART = { ic:'\u{1FA99} 골드 보상입니다' };\nconst CUR_ICON = {")],

  ['[N3] 허용 목록 항목이 소스와 어긋남(289 부패 재현)', 'A3',
   s => s.replace("' 이용권 — '", "' 이용권 적용 '")],

  ['[N4] CUR_ICON 이 없는 파일을 가리킴(오타)', 'C1',
   s => s.replace("'assets/ui/cur-tstone.svg'", "'assets/ui/cur-NOPE.svg'")],

  ['[N5] 재화 둘이 같은 아이콘을 씀(소스↔런타임 집합 불일치)', 'C2',
   s => s.replace("tstone:  'assets/ui/cur-tstone.svg'", "tstone:  'assets/ui/cur-gold.svg'")],
];

const run = () => {
  try { return execFileSync('node', [GATE], { cwd: ROOT, encoding: 'utf8', timeout: 900000 }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
};

let good = 0;
try {
  /* ① 무변경 — 지금 제품에서 게이트가 전부 초록인지 먼저 확인(양성 대조) */
  const base = run();
  const basePass = /VERIFY125 PASS/.test(base);
  console.log((basePass ? '초록  ' : '빨강  ') + '[N0] 무변경 — ' + (base.trim().split('\n').pop() || ''));
  if (basePass) good++;

  for (const [name, key, mut] of CASES) {
    const next = mut(ORIG);
    if (next === ORIG) { console.log('SKIP  ' + name + ' — 주입 자리를 못 찾음(소스가 바뀌었다)'); continue; }
    fs.writeFileSync(HTML, next);
    const out = run();
    fs.writeFileSync(HTML, ORIG);
    const line = out.split('\n').find(l => l.startsWith('FAIL ' + key + ' ') || l.startsWith('PASS ' + key + ' ')) || '(항목 없음)';
    const caught = line.startsWith('FAIL');
    if (caught) good++;
    console.log((caught ? '잡음  ' : '놓침  ') + name + ' → ' + line.slice(0, 110));
  }
} finally {
  fs.writeFileSync(HTML, ORIG);
}

/* 원상 복구 검산 — 주입이 남으면 다음 게이트가 통째로 거짓말을 한다 */
let dirty = '';
try { dirty = execFileSync('git', ['diff', '--stat', '--', 'index.html'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) {}
console.log('\nindex.html 원상 복구: ' + (dirty ? '❌ 남았다 — ' + dirty : '✅ 변경 0'));

const total = CASES.length + 1;
console.log('NEG289 ' + (good === total && !dirty ? 'PASS' : 'FAIL') + ' ' + good + '/' + total);
process.exit(good === total && !dirty ? 0 : 1);
