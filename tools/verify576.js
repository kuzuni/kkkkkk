/* 작업 576 — 팝업·시트 스크림(딤) α 규격 게이트.
 *
 * 576 등재문은 «α 가 0.28~0.80 으로 흩어진 것 = 규격 불일치» 를 가설로 세웠고,
 * `tools/probe576.js` 전수 재현이 그것을 **기각**했다 — 22자리 전부 «그 화면 자기 측정표» 의
 * 값이고 찍힌 픽셀도 같은 값이다. 그러므로 이 자가 지키는 것은 «한 상수» 가 아니라 **껍데기 규약**이다:
 *
 *   [A] α 표      — 자리마다 자기 측정표 값을 그대로 쓰는가 (전수 22자리, 정적 + computed)
 *   [B] 껍데기 띠 — (가) 다이얼로그 / (나) 바닥 시트 / (연출) 결과 화면이 서로 겹치지 않는가
 *   [C] 음성항    — «시트가 다이얼로그만큼 짙다» · «다이얼로그가 결과 화면만큼 짙다» 가 아닌가
 *   [D] 문서 동기 — 측정표가 제품과 같은 값을 적는가 (**576 이 고친 결함이 바로 이것**:
 *                   A5 측정표만 «65%» 에 머물러 «제품이 틀렸다» 는 오검출의 씨앗이 돼 있었다)
 *   [E] (다) 전체화면 페이지에는 딤이 없는가
 *   §R  되돌림 시험 — 등재문의 처방 ⓐ(«한 값으로 모은다»)를 실제로 먹인 사본이 빨개지는가
 *
 * 실행: node tools/verify576.js
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* ── 자리 → (α, 껍데기, 근거) ──
   ⚠ 손으로 고른 목록이 아니다. 근거 칸이 그 값을 잰 측정표다. 값을 바꾸려면 **측정표를 먼저** 고쳐라. */
const SPEC = [
  { sel: '#modal',        a: 0.54,  kind: '가',   doc: 'docs/review/A5-모달.md — 측정 .65 vs 비평 2인 .54 → 2:1 로 .54' },
  { sel: '#modal.sk8',    a: 0.55,  kind: '가',   doc: 'docs/measure/08-스킬세부팝업.md — 딤 아래가 07 바닥 시트' },
  { sel: '#modal.q22',    a: 0.56,  kind: '가',   doc: 'docs/measure/22-퀘스트팝업.md — 투과배율 0.437/0.442' },
  { sel: '#modal.ml69',   a: 0.56,  kind: '가',   doc: '69 우편 — 22 와 같은 껍데기' },
  { sel: '#modal.at70',   a: 0.65,  kind: '가',   doc: 'docs/measure/70-출석보상팝업.md' },
  { sel: '#dgdw',         a: 0.50,  kind: '가',   doc: 'docs/measure/04-던전세부팝업.md §딤' },
  { sel: '#wpnw',         a: 0.55,  kind: '가',   doc: 'docs/measure/05-무기팝업.md — 투과배율 0.448' },
  { sel: '#prbw',         a: 0.55,  kind: '가',   doc: 'docs/measure/11-소환부분정보팝업.md' },
  { sel: '#collw',        a: 0.53,  kind: '가',   doc: 'docs/measure/21-도감보너스팝업.md — 투과 0.467' },
  { sel: '#ciw',          a: 0.54,  kind: '가',   doc: 'docs/measure/33-재화정보팝업.md — 투과 0.46' },
  { sel: '#specw',        a: 0.55,  kind: '가',   doc: 'docs/measure/20-프로필팝업스펙정보.md — 투과 0.444/0.456' },
  { sel: '#blsw',         a: 0.54,  kind: '가',   doc: 'docs/measure/34-축복버프팝업.md — 투과 0.463' },
  { sel: '#bagw',         a: 0.545, kind: '가',   doc: 'docs/measure/53-가방팝업.md — 투과 0.448~0.463' },
  { sel: '#cfw',          a: 0.55,  kind: '가',   doc: 'docs/measure/55-설정팝업.md' },
  { sel: '#eqw>.dim',     a: 0.28,  kind: '나',   doc: 'docs/measure/06-장비팝업.md §13 — 0.278/0.284' },
  { sel: '#panel::before',a: 0.28,  kind: '나',   doc: 'docs/measure/07-스킬팝업.md — 투과배율 0.721' },
  { sel: '.tr-dim',       a: 0.34,  kind: '나',   doc: '23 훈련 시트 — 06·07 과 같은 (나) 계열' },
  { sel: '#offw',         a: 0.80,  kind: '연출', doc: 'docs/measure/01-오프라인보상팝업.md' },
  { sel: '#upw',          a: 0.80,  kind: '연출', doc: 'docs/measure/09-일괄강화결과팝업.md — «결과 연출이라 훨씬 깊다»' },
  { sel: '#sumw',         a: 0.80,  kind: '연출', doc: 'docs/measure/12-소환결과팝업.md — 투과 0.198~0.2135' },
  { sel: '#dclw',         a: 0.78,  kind: '연출', doc: 'docs/measure/31-던전클리어화면.md' },
  { sel: '#defw',         a: 0.62,  kind: '연출', doc: 'docs/measure/18-패배화면.md — 투과 0.38' },
];

/* (다) 전체화면 페이지 — 딤이 «없어야» 하는 자리 */
const NO_DIM = ['#dunw', '#relw', '#shopw', '#rkw', '#psw', '#chw', '#svw'];

/* ── 정적 판독기 — 소스 문자열에서 자리별 α 를 읽는다(§R 이 사본에도 그대로 쓴다) ── */
function readAlpha(src, sel) {
  /* 자리마다 선언 앵커가 다르다 — 규칙 머리를 정확히 집어야 옆 규칙 값을 잘못 읽지 않는다 */
  const anchor = {
    '#panel::before': /#panel:has\(:is\(#bSk,#bPet,#bCos\)\.on\)::before\{[\s\S]{0,400}?\}/,
    '#eqw>.dim':      /#eqw>\.dim\{[^}]*\}/,
    '.tr-dim':        /\n\s*\.tr-dim\{[^}]*\}/,
  }[sel] || new RegExp('\\n\\s*' + sel.replace(/[.#]/g, m => '\\' + m) + '\\{[\\s\\S]{0,600}?\\}');
  const m = anchor.exec(src);
  if (!m) return null;
  const q = /background:\s*rgba\(0,\s*0,\s*0,\s*(0?\.\d+|\d)\)/.exec(m[0]);
  return q ? parseFloat(q[1]) : null;
}

const src = fs.readFileSync(SRC, 'utf8');

console.log('\n=== verify576 [A] α 표 — 자리마다 «그 화면 자기 측정표» 의 값을 쓰는가 ===');
SPEC.forEach(s => {
  const got = readAlpha(src, s.sel);
  ok(got !== null && Math.abs(got - s.a) < 1e-6,
    '[A] ' + s.sel + ' α = ' + s.a + ' (읽은 값 ' + got + ')  ← ' + s.doc);
});

console.log('\n=== verify576 [B] 껍데기 띠 — 세 계열이 겹치지 않는가 ===');
const band = k => SPEC.filter(s => s.kind === k).map(s => readAlpha(src, s.sel)).filter(v => v !== null);
const 가 = band('가'), 나 = band('나'), 연출 = band('연출');
ok(나.length === 3 && Math.max(...나) < Math.min(...가),
  '[B1] (나) 바닥 시트 최대 ' + Math.max(...나) + ' < (가) 다이얼로그 최소 ' + Math.min(...가));
ok(연출.length === 5 && Math.min(...연출) > Math.max(...가.filter(v => v < 0.65)),
  '[B2] (연출) 결과 화면 최소 ' + Math.min(...연출) + ' > (가) 본류 최대 ' +
  Math.max(...가.filter(v => v < 0.65)) + ' (at70 .65 는 70 측정표가 잰 (가) 의 예외)');
ok(Math.max(...가) - Math.min(...가) <= 0.16,
  '[B3] (가) 안의 폭 ' + (Math.max(...가) - Math.min(...가)).toFixed(3) + ' ≤ 0.16 — 계열이 한 덩어리다');
ok(나.every(v => v >= 0.26 && v <= 0.36), '[B4] (나) 는 0.26~0.36 안 — 06·07 «투과 0.72» 계열');
ok(연출.every(v => v >= 0.60 && v <= 0.85), '[B5] (연출) 은 0.60~0.85 안 — 09 «훨씬 깊다» 계열');

console.log('\n=== verify576 [C] 음성항 — 계열을 넘나들면 빨개진다 ===');
const sheetMax = Math.max(...나), dlgMin = Math.min(...가);
ok(sheetMax < 0.45, '[C1] 시트 딤이 다이얼로그 깊이(≥.45)로 올라오지 않았다 — 최대 ' + sheetMax);
ok(dlgMin > 0.40, '[C2] 다이얼로그 딤이 시트 깊이(≤.40)로 내려가지 않았다 — 최소 ' + dlgMin);
ok(Math.min(...연출) > sheetMax + 0.2, '[C3] 결과 화면과 시트 사이가 0.2 넘게 벌어져 있다');
/* ⚑ «한 값으로 모으면» 이 셋이 동시에 참일 수 없다 — [C] 가 곧 처방 ⓐ 의 반증이다 */
const uniq = new Set(SPEC.map(s => readAlpha(src, s.sel)));
ok(uniq.size >= 8, '[C4] α 가 한 상수로 뭉개지지 않았다 — 서로 다른 값 ' + uniq.size + '종 (≥8)');

console.log('\n=== verify576 [D] 문서 동기 — 측정표가 제품과 같은 값을 적는가 (576 이 고친 결함) ===');
const a5 = fs.readFileSync(path.join(ROOT, 'docs/measure/A5-모달.md'), 'utf8');
const modalA = readAlpha(src, '#modal');
ok(/rgba\(0,0,0,\.54\)/.test(a5), '[D1] A5 측정표 «구현 매핑» 이 제품과 같은 `rgba(0,0,0,.54)` 를 적는다');
ok(!/불투명도 \| \*\*65%\*\*/.test(a5), '[D2] A5 측정표 «불투명도» 칸이 더는 65% 가 아니다');
ok(modalA === 0.54, '[D3] 제품 `#modal` 이 그 값(.54) 그대로다');
ok(/정오표 — 딤 α/.test(a5), '[D4] A5 측정표에 딤 α 정오표 절이 있다 (다음 세션의 오검출을 막는 자리)');
ok(/껍데기가 셋/.test(a5) || /껍데기 종류별로 자기 레퍼런스/.test(a5),
  '[D5] «한 상수가 아니라 껍데기 종류별» 이라는 규약이 측정표에 적혀 있다');
const sk8c = /딤 (\d+)%→55%/.exec(src);
ok(sk8c && sk8c[1] === '54', '[D6] `#modal.sk8` 주석이 A5 기본값을 54% 로 적는다 (65% 유령의 마지막 자국)');
const m08 = fs.readFileSync(path.join(ROOT, 'docs/measure/08-스킬세부팝업.md'), 'utf8');
ok(!/A5 는 65%\)/.test(m08) && !/A5 기본 \.65 를/.test(m08),
  '[D7] 08 측정표가 더는 «A5 는 65%» 로 적지 않는다');

console.log('\n=== verify576 [E] (다) 전체화면 페이지에는 딤이 없다 ===');
NO_DIM.forEach(sel => {
  const got = readAlpha(src, sel);
  ok(got === null, '[E] ' + sel + ' 에 검정 스크림 선언 없음 (읽은 값 ' + got + ')');
});

/* ══════════ §R 되돌림 시험 ══════════
   무르게 푼 자가 아님을 못박는다 — 등재문의 처방 ⓐ 를 **실제로 먹인 사본**을 만들어
   같은 판정을 돌린다. 사본이 초록이면 이 자는 아무것도 안 지키는 것이다. */
console.log('\n=== verify576 §R 되돌림 시험 — 처방 ⓐ(«한 값으로 모은다»)를 먹인 사본이 빨개지는가 ===');
function redOn(mutated, label, checks) {
  const bad = checks.filter(fn => !fn(mutated));
  ok(bad.length > 0, '§R ' + label + ' → 판정이 빨개진다 (' + bad.length + '항 실패)');
}
const CHECKS = [
  s => SPEC.every(x => Math.abs((readAlpha(s, x.sel) ?? -9) - x.a) < 1e-6),          /* [A] */
  s => { const n = SPEC.filter(x => x.kind === '나').map(x => readAlpha(s, x.sel));
         const g = SPEC.filter(x => x.kind === '가').map(x => readAlpha(s, x.sel));
         return Math.max(...n) < Math.min(...g); },                                   /* [B1] */
  s => new Set(SPEC.map(x => readAlpha(s, x.sel))).size >= 8,                         /* [C4] */
];
/* ⓐ-1 «전부 A5 값 .54 로 통일» */
let mut = src;
SPEC.forEach(x => {
  const cur = readAlpha(src, x.sel);
  if (cur === null || cur === 0.54) return;
  const anchorRe = new RegExp('(background:rgba\\(0,0,0,)' + String(cur).replace('0.', '\\.?0?\\.') + '(\\))', 'g');
  mut = mut.replace(anchorRe, '$1.54$2');
});
redOn(mut, 'ⓐ-1 전 자리를 .54 로 통일', CHECKS);
/* ⓐ-2 «측정표의 옛 유령값 .65 로 되돌린다» — 576 이 고친 그 방향 */
redOn(src.replace('#modal{position:absolute;inset:0;background:rgba(0,0,0,.54)',
                  '#modal{position:absolute;inset:0;background:rgba(0,0,0,.65)'),
      'ⓐ-2 `#modal` 을 유령값 .65 로 되돌림', CHECKS);
/* ⓐ-3 «시트도 다이얼로그와 같게» — 등재문이 오검출한 그 자리 */
redOn(src.replace('background:rgba(0,0,0,.28);pointer-events:auto',
                  'background:rgba(0,0,0,.54);pointer-events:auto'),
      'ⓐ-3 07·26·50 시트 딤을 .54 로', CHECKS);
/* §R-음성: 손대지 않은 원본은 초록이어야 한다 (되돌림 시험 자신의 검산) */
ok(CHECKS.every(fn => fn(src)), '§R-n 원본은 세 판정 모두 초록 — 되돌림 시험이 항상 빨간 자가 아니다');

console.log('\n=== verify576: ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
process.exit(fail ? 1 : 0);
