/* 작업 279 — 되돌림(음성) 시험 : `tools/verify47.js` 가 **진짜로 무는가**
 *
 * 279 는 «제품이 옳고 게이트가 낡았다» 계열이다(242·245~247·275·276·277). 이런 작업의 가장 쉬운
 * «고침» 은 빨간 단언을 **지우는** 것인데, 그 순간 47 이 세운 감시가 통째로 사라지고
 * «고쳤다» 는 기록만 남는다(LESSONS 185-②·④). 그래서 두 갈래를 각각 반증한다:
 *
 *   ⓐ §[0] «옛 대상 폐기» — 물음을 «그 **이름**이 있나» 에서 «**스탯 칸**이 있나» 로 옮겼다.
 *      옛 단언은 203(룬)·210(단련)이 `#trSubs`·`.tr-subs`·`data-trsub` 로 **같은 이름을 다시 쓰면서**
 *      원리적으로 영영 빨갰다. 옮긴 물음이 빈 껍데기가 아님을 N1~N5 가 증명한다.
 *   ⓑ [1]·[2]·[5] «칸 수» — `n: 2` 리터럴을 빼고 **바가 선언한 분할(.spN)** 에서 파생시켰다.
 *      209 가 03 던전에 «탑» 칸을 더해 `.sp2` → `.sp3` 이 되자 폭·경계·오른끝·재진입이 연쇄로
 *      빨갰던 자리다. 파생이 «무엇이 와도 초록인 항등식» 이 아님을 N6~N8 이 증명한다.
 *
 * 방법 — `index.html` **사본**을 한 곳만 갈아 끼워 `.v279-neg.html` 로 쓰고, 그 파일을 열어
 *   `verify47` 를 통째로 돌린다(`V47_SRC`). 살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다(LESSONS 191).
 *   원본 `index.html` 은 한 바이트도 안 건드린다(neg221 과 같은 방식).
 *
 * 실행: node tools/neg279.js  → 마지막 줄이 `NEG279 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, '.v279-neg.html');

/* ---- 갈아 끼울 자리 — 전부 index.html 의 실제 문자열이다(못 찾으면 시험 자체를 FAIL 시킨다) ---- */
const TR_BAR    = '        <div class="stabs sp3 tr-subs" id="trSubs">';
const TR_TEMPER = '          <div class="stab" data-trsub="temper"><i class="ol3">단련</i><s class="bdg"></s></div>';
const TR_CSS    = '  .tr-subs{left:126px;bottom:40px;width:794px}';
const DUN_BAR   = '    <div class="dns-sub stabs sp3" id="dunSub">';
const DUN_TOWER = '      <div class="stab dns-t off" data-dsub="tower"><i class="ol3">탑</i></div>';
const SP3_CSS   = '  .stabs.sp3>.stab{width:33.3333%}';

/* 03 던전에 «넷» 칸을 하나 더 — 칸 수만 늘린다(키는 아무 데도 안 걸리는 새 값) */
const DUN_4TH = DUN_TOWER + '\n      <div class="stab dns-t off" data-dsub="x4"><i class="ol3">넷</i></div>';
/* `.sp4` 규칙 — 96 부품의 `.sp2`/`.sp3` 과 같은 꼴 */
const SP4_CSS = SP3_CSS + '\n  .stabs.sp4>.stab{width:25%}'
  + '\n  .stabs.sp4>.stab:nth-of-type(1){left:0}\n  .stabs.sp4>.stab:nth-of-type(2){left:25%}'
  + '\n  .stabs.sp4>.stab:nth-of-type(3){left:50%}\n  .stabs.sp4>.stab:nth-of-type(4){left:75%}';

/* 단언 이름(앞머리로 대조한다) */
const A_ID    = '#trSub 노드 0';
const A_PRE   = '전제 — [data-trsub] 칸을 읽었고';
const A_STAT  = '«스탯 훈련» 칸·분배 UI 0개';
const A_CSS   = '.tr-sub CSS 규칙·class 토큰 0건';
const A_SELF  = '[0] 자가검사 — 같은 매처가';
const A_DECL  = '전제 — 바가 칸 수를 스스로 선언한다';
const A_N3    = '칸 3개 (바의 .sp3 선언에서 파생)';
const A_W4    = '칸 폭 = 콘텐츠 ÷4';

/* [from, to] 를 여러 개 적을 수 있다. green:true 면 «FAIL 0건» 이 기대다. */
const TESTS = [
  { id: 'N1', why: '«스탯» 칸 부활 — 47 의 옛 대상 그 자체(data-trsub="stat")',
    edit: [[TR_TEMPER, TR_TEMPER + '\n          <div class="stab" data-trsub="stat"><i class="ol3">스탯</i></div>']],
    want: [A_STAT], not: [A_ID, A_PRE, A_CSS, A_SELF] },

  { id: 'N2', why: '88 의 바가 «속성 표기» 로 부활 — id="trSub" · class="tr-sub" (선택자 표기만 보면 놓치는 자리, 277 함정)',
    edit: [[TR_BAR, '        <div class="tr-sub" id="trSub"></div>\n' + TR_BAR]],
    want: [A_ID, A_CSS], not: [A_PRE, A_SELF] },

  { id: 'N3', why: '`.tr-sub` CSS 규칙만 부활 — 마크업은 그대로(규칙 축과 마크업 축이 안 샌다)',
    edit: [[TR_CSS, '  .tr-sub{left:126px;bottom:40px;width:794px}\n' + TR_CSS]],
    want: [A_CSS], not: [A_ID, A_PRE, A_STAT, A_SELF] },

  { id: 'N4', why: '훈련 팝업에 스탯 분배 UI 부활 — [data-sp]',
    edit: [[TR_BAR, '        <div data-sp="atk"></div>\n' + TR_BAR]],
    want: [A_STAT], not: [A_ID, A_PRE, A_CSS, A_SELF] },

  { id: 'N5', why: '`[data-trsub]` 칸이 203/210 의 바 **밖**에 생긴다 — 전제(«그 바의 것이 맞나»)가 빨개져야 한다',
    edit: [[DUN_BAR, '    <div class="stab" data-trsub="train"></div>\n' + DUN_BAR]],
    want: [A_PRE], not: [A_ID, A_STAT, A_CSS, A_SELF] },

  { id: 'N6', why: '자가검사 — 스타일시트를 못 읽거나 토큰 매처가 죽으면(`.tr-subs` 규칙 제거) «0건» 이 헛초록이 된다',
    edit: [[TR_CSS, '  .tr-subsX{left:126px;bottom:40px;width:794px}']],
    want: [A_SELF], not: [A_ID, A_PRE, A_STAT, A_CSS] },

  /* ---- ⓑ 칸 수 파생 ---- */
  { id: 'N7', why: '03 던전에 4번째 칸을 넣고 `.sp3` 선언은 그대로 — «선언 = 실제 칸 수» 가 깨진다',
    edit: [[DUN_TOWER, DUN_4TH]],
    want: [A_N3], not: [A_DECL] },

  { id: 'N8', why: '`.sp4` 로 선언하고 칸도 4개인데 **`.sp4` CSS 규칙이 없다** — 선언은 맞고 실측이 안 따라온다',
    edit: [[DUN_BAR, DUN_BAR.replace('sp3', 'sp4')], [DUN_TOWER, DUN_4TH]],
    want: [A_W4], not: [A_DECL] },

  /* ---- 양성 대조 ---- */
  { id: 'N9', why: '★ 279 회귀 시험 — 03 던전이 4칸(.sp4 + 규칙)이 돼도 게이트는 따라온다. 옛 `n: 2` 였다면 여기서도 빨갰다',
    edit: [[DUN_BAR, DUN_BAR.replace('sp3', 'sp4')], [DUN_TOWER, DUN_4TH], [SP3_CSS, SP4_CSS]],
    green: true },

  { id: 'N10', why: '양성 대조 — 203/210 계열 칸이 하나 더 늘어도 §[0] 은 초록이다(옛 «[data-trsub] 0개» 였다면 빨갰다)',
    edit: [[TR_TEMPER, TR_TEMPER + '\n          <div class="stab" data-trsub="rune2"><i class="ol3">룬2</i></div>']],
    green: true },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify47.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V47_SRC: TMP }), encoding: 'utf8', maxBuffer: 8 << 20 });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }   /* FAIL 이면 exit≠0 — 출력은 그대로 쓴다 */
  return out.split('\n').filter(l => /^\s*FAIL /.test(l)).map(l => l.trim().replace(/^FAIL /, ''));
};

(async () => {
  try {
    console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
    fs.writeFileSync(TMP, SRC);
    const base = runGate();
    ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : 'ALL PASS');

    for (const t of TESTS) {
      console.log('\n[' + t.id + '] ' + t.why);
      let next = SRC, found = true;
      for (const [from, to] of t.edit) {
        if (next.indexOf(from) < 0) { found = false; break; }
        next = next.replace(from, to);
      }
      ok(t.id + ' 갈아 끼울 자리를 찾았다', found, found ? t.edit.length + '곳' : '문자열 없음 — index.html 이 바뀌었다');
      if (!found) continue;
      fs.writeFileSync(TMP, next);
      const fails = runGate();
      if (t.green) {
        ok(t.id + ' → FAIL 0건', fails.length === 0,
          fails.length ? '빨간 항목 ' + fails.length + '개: ' + fails.slice(0, 3).join(' / ') : 'ALL PASS');
      }
      (t.want || []).forEach(w => ok(t.id + ' → 「' + w + '」 이(가) 빨개진다',
        fails.some(f => f.startsWith(w)),
        fails.length ? '빨간 항목 ' + fails.length + '개' : '전부 초록 — 단언이 안 잡는다'));
      (t.not || []).forEach(w => ok(t.id + ' → 「' + w + '」 은(는) 그대로 초록',
        !fails.some(f => f.startsWith(w)), '빨간 항목 ' + fails.length + '개'));
    }
  } finally {
    try { fs.unlinkSync(TMP); } catch (_) {}
  }

  /* 원본 검산 — 사본만 건드렸다는 것을 게이트가 아니라 git 에게 묻는다(277 ⑦) */
  let dirty = '';
  try { dirty = execFileSync('git', ['diff', '--stat', '--', 'index.html'], { encoding: 'utf8', cwd: ROOT }).trim(); }
  catch (_) { dirty = '(git 조회 실패)'; }
  ok('index.html 무변경 — git diff 비어 있음', dirty === '', dirty || '변경 0줄');

  console.log('\nNEG279 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
