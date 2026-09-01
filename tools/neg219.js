/* 작업 219 — 되돌림(음성) 시험
 *
 * `tools/verify96.js` 의 [1-b] «라벨 외곽선» 이사분이 **정말로 무언가를 지키는지** 확인한다.
 * 이사만 하고 끝내면 «규칙이 되돌아와도 초록» 인 항등식이 남는다(LESSONS 214-④ · 215-② · 217-②).
 *
 * 방법 — `index.html` 사본을 한 곳만 갈아 끼워 `.v219-neg.html` 로 쓰고, **그 파일을 새로 열어**
 * `verify96` 를 통째로 돌린다(`V96_SRC`). 살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다(LESSONS 191).
 * 각 시험은 «어떤 항목이 빨개져야 하는가» 를 이름 조각으로 적어 두고, 그것만 빨간지 본다.
 *
 * 실행: node tools/neg219.js  → 마지막 줄이 `NEG219 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, `.v219-neg-${process.pid}.html`);

/* 갈아 끼울 자리 — 전부 index.html 의 실제 문자열이다(못 찾으면 시험 자체를 FAIL 시킨다) */
const SHOP_OL3 = `  #shopCats .stab>i.ol3{text-shadow:3px 0 0 #000,-3px 0 0 #000,0 3px 0 #000,0 -3px 0 #000,
    2px 2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,-2px -2px 0 #000,
    0 calc(3px + var(--sh-drop) * 1em) 0 #000, calc(3px + var(--sh-dropx) * 1em) 0 0 #000}`;
const SHOP_OL4 = `  #shopCats .stab>i.ol4{text-shadow:2.8px 0 0 #000,-2.8px 0 0 #000,0 2.8px 0 #000,0 -2.8px 0 #000,
    2.1px 2.1px 0 #000,2.1px -2.1px 0 #000,-2.1px 2.1px 0 #000,-2.1px -2.1px 0 #000,
    0 calc(2.8px + var(--sh-drop) * 1em) 0 #000, calc(2.8px + var(--sh-dropx) * 1em) 0 0 #000}`;
const COMMON_OL3 = `:is(#bSk,#bPet,#bCos,.stabs) .ol3{text-shadow:3px 0 0 var(--o),-3px 0 0 var(--o),0 3px 0 var(--o),0 -3px 0 var(--o),
    2px 2px 0 var(--o),2px -2px 0 var(--o),-2px 2px 0 var(--o),-2px -2px 0 var(--o)}`;
const COMMON_OL4 = `:is(#bSk,#bPet,#bCos,.stabs) .ol4{text-shadow:4px 0 0 var(--o),-4px 0 0 var(--o),0 4px 0 var(--o),0 -4px 0 var(--o),
    3px 3px 0 var(--o),3px -3px 0 var(--o),-3px 3px 0 var(--o),-3px -3px 0 var(--o)}`;
const TOKEN_DROP = '--sh-drop:.053;';

const TESTS = [
  { id: 'N1', why: '126 ③ 17회차 덧칠(비활성)을 지운다 — 10 상점이 공용 ol3 로 되돌아감',
    from: SHOP_OL3, to: '  /* N1 — 덧칠 제거 */',
    want: ['비활성 외곽선 — 10 상점 = 링 8항 + 덧칠 2항',
      '비활성 외곽선 — 10 상점 보이는 드롭 세로', '비활성 외곽선 — 10 상점 보이는 드롭 가로'] },

  { id: 'N2', why: '126 ③ 18회차 활성 규칙을 통째로 지운다 — 링이 공용 4/3 으로, 덧칠도 사라짐',
    from: SHOP_OL4, to: '  /* N2 — 활성 규칙 제거 */',
    want: ['활성 외곽선 — 10 상점 = 링 8항 + 덧칠 2항', '활성 외곽선 — 10 상점 링 = 126 ref 실측 2.8/2.1',
      '활성 외곽선 — 10 상점 보이는 드롭 세로', '활성 외곽선 — 10 상점 보이는 드롭 가로'] },

  { id: 'N3', why: 'ref 실측 없이 덧칠을 공용 유틸로 확산시킨다 — 세 자리가 «같이» 움직이므로 Δ0 은 초록이다',
    from: COMMON_OL3, to: COMMON_OL3.replace(/\}$/, ',\n    0 5.279px 0 var(--o), 4.72px 0 0 var(--o)}'),
    want: ['비활성 외곽선 — 공용 3자리는 등방 링 3/2 8항뿐(덧칠 0)'],
    not: ['비활성 외곽선 — 영웅 vs 06 장비 Δ0', '비활성 외곽선 — 영웅 vs 03 던전 Δ0'] },

  { id: 'N4', why: '공용 활성 링을 4/3 → 5/4 로 부풀린다 — 역시 세 자리가 같이 움직인다',
    from: COMMON_OL4, to: COMMON_OL4.replace(/4px/g, '5px').replace(/3px/g, '4px'),
    want: ['활성 외곽선 — 공용 3자리는 등방 링 4/3 8항뿐(덧칠 0)'],
    not: ['활성 외곽선 — 영웅 vs 06 장비 Δ0', '활성 외곽선 — 영웅 vs 03 던전 Δ0'] },

  { id: 'N5', why: '06 장비 한 자리만 외곽선을 갈라 놓는다 — 이사 전 원래 단언이 지키던 «부품 공용성»',
    from: '  .stab>i{display:inline-block;position:relative;top:3px;transform:scaleX(.97)}',
    to: '  .stab>i{display:inline-block;position:relative;top:3px;transform:scaleX(.97)}\n' +
        '  #eqTabs .stab>i.ol3{text-shadow:3px 0 0 #000,-3px 0 0 #000,0 3px 0 #000,0 -3px 0 #000,' +
        '1px 1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,-1px -1px 0 #000}',
    want: ['비활성 외곽선 — 영웅 vs 06 장비 Δ0', '비활성 외곽선 — 공용 3자리는 등방 링 3/2 8항뿐(덧칠 0)'],
    not: ['비활성 외곽선 — 영웅 vs 03 던전 Δ0'] },

  { id: 'N6', why: '토큰 `--sh-drop` 만 .053 → .080 으로 흔든다 — 게이트가 페이지 식을 다시 부르면 초록으로 샌다(212-①)',
    from: TOKEN_DROP, to: '--sh-drop:.080;',
    want: ['비활성 외곽선 — 10 상점 보이는 드롭 세로', '활성 외곽선 — 10 상점 보이는 드롭 세로'],
    not: ['비활성 외곽선 — 10 상점 보이는 드롭 가로', '비활성 외곽선 — 10 상점 링 = 126 ref 실측 3/2'] },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify96.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V96_SRC: TMP }), encoding: 'utf8' });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter(l => /^\s*FAIL /.test(l)).map(l => l.trim().replace(/^FAIL /, ''));
};

(async () => {
  console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
  fs.writeFileSync(TMP, SRC);
  const base = runGate();
  ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : '61/61');

  for (const t of TESTS) {
    console.log('\n[' + t.id + '] ' + t.why);
    if (SRC.indexOf(t.from) < 0) { ok(t.id + ' 갈아 끼울 자리를 찾았다', false, '문자열 없음 — index.html 이 바뀌었다'); continue; }
    ok(t.id + ' 갈아 끼울 자리를 찾았다', true, '1곳');
    fs.writeFileSync(TMP, SRC.replace(t.from, t.to));
    const fails = runGate();
    t.want.forEach(w => ok(t.id + ' → 「' + w + '」 이(가) 빨개진다',
      fails.some(f => f.startsWith(w)), fails.length ? '빨간 항목 ' + fails.length + '개' : '전부 초록 — 단언이 안 잡는다'));
    (t.not || []).forEach(w => ok(t.id + ' → 「' + w + '」 은(는) 그대로 초록',
      !fails.some(f => f.startsWith(w)), '빨간 항목 ' + fails.length + '개'));
  }

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nNEG219 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
