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

/* ---- 갈아 끼울 자리 — 리터럴이 아니라 «제품에게 묻는다» (2026-08-29, 작업 387 · 368 처방) ----
 *
 * 처음에는 줄을 통째로 리터럴로 박아 뒀다. 그 자리들은 전부 **남의 작업 구간**이라
 * 곁다리 변경 하나에 다섯 항(N3·N6·N7·N8·N9)이 **조용히 죽었다** — 값 하나
 * (`.tr-subs{bottom:40→42px}`)와 형제 노드 하나(«탑» 칸의 `<s class="bdg">`, 298)뿐인데
 * 그 다섯은 «갈아 끼울 자리를 못 찾았다» 로 넘어가 **아무것도 검사하지 않게** 됐다.
 * 리터럴을 새 값으로 갱신하는 것은 같은 죽음을 다음 폴리시까지 미루는 것뿐이다.
 *
 * ⇒ 자리를 **정체(id · data 키 · 선택자)** 로만 지목하고, 줄 내용·들여쓰기·형제는
 *   그때그때 `index.html` 에서 **읽는다**. 새 상수는 0개다.
 *   못 찾거나(0줄) 둘 이상 찾으면(≥2줄) §[A] 가 **빨개진다** — 조용히 죽는 길이 없다.
 *   치환이 no-op 이 되는 길(앵커 줄에 갈아 낄 토큰이 없다)도 편집 루프가 «자리 없음» 으로 읽는다.
 *   이 해석기가 «무엇이 와도 초록» 이 아님은 §R 이 증명한다.
 */
const LINES = SRC.split('\n');
const ANCHORS = [];
const ind = s => (s.match(/^[ \t]*/) || [''])[0];

/* 정체로 한 줄을 지목한다 — 정확히 한 줄일 때만 값을 돌려준다(아니면 null + §[A] 빨강) */
const at = (name, re, why) => {
  const hit = [];
  LINES.forEach((l, i) => { if (re.test(l)) hit.push(i); });
  ANCHORS.push({ name, why, n: hit.length, at: hit.length === 1 ? hit[0] + 1 : 0 });
  return hit.length === 1 ? LINES[hit[0]] : null;
};
/* 부분이 하나라도 없으면 통째로 null — 그 시험은 «자리 없음» 으로 빨개진다 */
const cat = (...parts) => parts.some(p => p == null) ? null : parts.join('');

const TR_BAR    = at('TR_BAR',    /^\s*<div\b[^>]*\bid="trSubs"[^>]*>\s*$/,          '23 훈련 서브탭 바(203·210 이 쓰는 그 바)');
const TR_TEMPER = at('TR_TEMPER', /^\s*<div\b[^>]*\bdata-trsub="temper"[^>]*>/,      '그 바의 «단련» 칸 — 형제를 끼워 넣는 자리');
const TR_CSS    = at('TR_CSS',    /^\s*\.tr-subs\s*\{/,                              '`.tr-subs` 규칙 한 줄(88 의 `.tr-sub` 와 한 글자 차이)');
const DUN_BAR   = at('DUN_BAR',   /^\s*<div\b[^>]*\bid="dunSub"[^>]*>\s*$/,          '03 던전 서브탭 바(209 가 «탑» 을 더한 그 바)');
const DUN_TOWER = at('DUN_TOWER', /^\s*<div\b[^>]*\bdata-dsub="tower"[^>]*>/,        '그 바의 «탑» 칸 — 4번째 칸을 끼워 넣는 자리');
const SP3_CSS   = at('SP3_CSS',   /^\s*\.stabs\.sp3\s*>\s*\.stab\s*\{/,              '96 부품의 `.sp3` 칸 폭 규칙');

/* 03 던전에 «넷» 칸을 하나 더 — 칸 수만 늘린다(키는 아무 데도 안 걸리는 새 값) */
const DUN_4TH = cat(DUN_TOWER, '\n', DUN_TOWER && ind(DUN_TOWER),
  '<div class="stab dns-t off" data-dsub="x4"><i class="ol3">넷</i></div>');
/* `.sp4` 규칙 — 96 부품의 `.sp2`/`.sp3` 과 같은 꼴(들여쓰기는 제품 줄에서 물려받는다).
   ⚑ 379 이관 (2026-08-29) — **그 «같은 꼴» 이 바뀌었다.** 칸은 패딩박스가 아니라 **바 바깥 상자**를
   나누고(칸폭 = 바깥/4 · 칸 k 왼끝 = k×칸폭 − b), 활성 알약은 자유로운 면마다
   **11.75** 를 더 먹으며 셸 안쪽 변에 닿는 면은 패딩 변에 붙는다(378 이 그 면의 검정을 셸에 넘겼다).
   N9 는 «게이트가 새 칸 수를 따라오는가» 를 묻는 **양성 대조**라 여기 규칙이 379 규약을 따라야
   초록이 된다 — 379 를 안 지킨 CSS 를 주입하면 N9 는 «279 가 깨졌다» 가 아니라
   그 CSS 를 잡아 **헷갈리는 빨강**이 된다.

   ⚑ **461 (2026-08-30) — 그 «헷갈리는 빨강» 이 실제로 났고, 뿌리는 여기 아홉 줄이 손으로 적은
   «b = 6px 시절» 사본이었다는 것이다.** 437 이 테두리를 `--sb` 한 손잡이로 빼고 6 → **7** 로 올리자
   N9 가 「칸1 왼끝 = 바깥 0/4 지점 **1.0 vs 0.0**」·「첫 칸 왼끝 = 바 바깥 왼끝 **1.0**」·
   「마지막 칸 오른끝 **793.0 vs 794.0**」 세 항을 **정확히 1px = 7 − 6** 씩 빨갛게 냈다 —
   **제품은 내내 옳았고 낡은 것은 주입문**이다(279 계열의 전형 · 368 과 같은 꼴).
   ⚠ 그래서 값을 `3px → 3.5px`·`-6px → -7px` 로 **갱신하지 않았다.** 그것은 위 §[A] 주석이
   이미 «리터럴을 새 값으로 갱신하는 것은 같은 죽음을 다음 폴리시까지 미루는 것뿐이다» 라고
   적어 둔 바로 그 길이다 — 다음에 `--sb` 가 움직이면 이 자리는 똑같이 다시 죽는다.
   ⇒ **자리를 제품에게 묻는다.** 437 이 세운 제품의 4분할 선언(`.stab-c1`~`.stab-c4`,
   index.html ~11313 — 07 스킬 시트의 4칸 바가 쓰는 살아 있는 규칙)에서 **선언부를 통째로
   물려받고 선택자만** `.stabs.sp4>.stab…` 으로 갈아 낀다. 이 파일에 적히는 숫자는 **0개**이고,
   저 아홉 줄이 사라지거나 모호해지면 §[A] 가 빨개진다 — **조용히 죽는 길이 없다**(387 처방).
   ⚠ 379 규약을 여기서 다시 적지 않는 것이 핵심이다. 제품의 그 아홉 줄이 이미 그 규약이다. */
const C4_W  = at('C4_W', /^\s*\.stab-c1,\.stab-c2,\.stab-c3,\.stab-c4\s*\{/,
  '제품 4분할 — 네 칸 공용 칸 폭(437 이 `--sb` 로 뺀 그 줄)');
const C4_L  = [1, 2, 3, 4].map(k => at('C4_L' + k, new RegExp('^\\s*\\.stab-c' + k + '\\s*\\{'),
  '제품 4분할 — 칸 ' + k + ' 좌변'));
const C4_ON = [1, 2, 3, 4].map(k => at('C4_ON' + k, new RegExp('^\\s*\\.stab-c' + k + '\\.on\\s*\\{'),
  '제품 4분할 — 칸 ' + k + ' 활성 알약'));

/* 첫 `{` 부터 끝까지(= 선언부)만 물려받는다 — 선택자만 우리 것으로 바꾼다 */
const decl = l => (l == null ? null : l.slice(l.indexOf('{')));
const rule = (sel, l) => (l == null ? null : sel + decl(l));
/* 제품 줄에서 파생한 `.sp4` 아홉 규칙. 한 줄이라도 못 읽으면 통째로 null → §[A] 빨강 */
const sp4Rules = lines => {
  const one = re => { const h = lines.filter(l => re.test(l)); return h.length === 1 ? h[0] : null; };
  const w  = one(/^\s*\.stab-c1,\.stab-c2,\.stab-c3,\.stab-c4\s*\{/);
  const ls = [1, 2, 3, 4].map(k => one(new RegExp('^\\s*\\.stab-c' + k + '\\s*\\{')));
  const os = [1, 2, 3, 4].map(k => one(new RegExp('^\\s*\\.stab-c' + k + '\\.on\\s*\\{')));
  const out = [rule('.stabs.sp4>.stab', w)]
    .concat(ls.map((l, i) => rule('.stabs.sp4>.stab:nth-of-type(' + (i + 1) + ')', l)))
    .concat(os.map((l, i) => rule('.stabs.sp4>.stab.on:nth-of-type(' + (i + 1) + ')', l)));
  return out.some(r => r == null) ? null : out;
};
const SP4_RULES = sp4Rules(LINES);
const SP4_CSS = (SP3_CSS == null || SP4_RULES == null) ? null
  : SP3_CSS + SP4_RULES.map(r => '\n' + ind(SP3_CSS) + r).join('');
/* 바의 분할 선언만 `.sp4` 로 — 토큰이 없으면 no-op 이 되고, 그것은 편집 루프가 «자리 없음» 으로 읽는다 */
const DUN_BAR_SP4 = DUN_BAR == null ? null : DUN_BAR.replace(/\bsp3\b/, 'sp4');

/* 단언 이름(앞머리로 대조한다) */
const A_ID    = '#trSub 노드 0';
const A_PRE   = '전제 — [data-trsub] 칸을 읽었고';
const A_STAT  = '«스탯 훈련» 칸·분배 UI 0개';
const A_CSS   = '.tr-sub CSS 규칙·class 토큰 0건';
const A_SELF  = '[0] 자가검사 — 같은 매처가';
const A_DECL  = '전제 — 바가 칸 수를 스스로 선언한다';
const A_N3    = '칸 3개 (바의 .sp3 선언에서 파생)';
/* 379 이관 — verify47 [2] 의 이 항이 «콘텐츠 ÷N» 에서 «바깥 ÷N» 으로 바뀌었다 */
const A_W4    = '칸 폭 = **바깥** ÷4';

/* [from, to] 를 여러 개 적을 수 있다. green:true 면 «FAIL 0건» 이 기대다. */
const TESTS = [
  { id: 'N1', why: '«스탯» 칸 부활 — 47 의 옛 대상 그 자체(data-trsub="stat")',
    edit: [[TR_TEMPER, cat(TR_TEMPER, '\n', TR_TEMPER && ind(TR_TEMPER),
      '<div class="stab" data-trsub="stat"><i class="ol3">스탯</i></div>')]],
    want: [A_STAT], not: [A_ID, A_PRE, A_CSS, A_SELF] },

  { id: 'N2', why: '88 의 바가 «속성 표기» 로 부활 — id="trSub" · class="tr-sub" (선택자 표기만 보면 놓치는 자리, 277 함정)',
    edit: [[TR_BAR, cat(TR_BAR && ind(TR_BAR), '<div class="tr-sub" id="trSub"></div>\n', TR_BAR)]],
    want: [A_ID, A_CSS], not: [A_PRE, A_SELF] },

  { id: 'N3', why: '`.tr-sub` CSS 규칙만 부활 — 마크업은 그대로(규칙 축과 마크업 축이 안 샌다)',
    /* 규칙 본문은 제품에서 물려받는다 — 한 글자(`.tr-subs` → `.tr-sub`)만 다른 줄이 되는 것이 이 시험의 전부다 */
    edit: [[TR_CSS, cat(TR_CSS && TR_CSS.replace('.tr-subs', '.tr-sub'), '\n', TR_CSS)]],
    want: [A_CSS], not: [A_ID, A_PRE, A_STAT, A_SELF] },

  { id: 'N4', why: '훈련 팝업에 스탯 분배 UI 부활 — [data-sp]',
    edit: [[TR_BAR, cat(TR_BAR && ind(TR_BAR), '<div data-sp="atk"></div>\n', TR_BAR)]],
    want: [A_STAT], not: [A_ID, A_PRE, A_CSS, A_SELF] },

  { id: 'N5', why: '`[data-trsub]` 칸이 203/210 의 바 **밖**에 생긴다 — 전제(«그 바의 것이 맞나»)가 빨개져야 한다',
    edit: [[DUN_BAR, cat(DUN_BAR && ind(DUN_BAR), '<div class="stab" data-trsub="train"></div>\n', DUN_BAR)]],
    want: [A_PRE], not: [A_ID, A_STAT, A_CSS, A_SELF] },

  { id: 'N6', why: '자가검사 — 스타일시트를 못 읽거나 토큰 매처가 죽으면(`.tr-subs` 규칙 제거) «0건» 이 헛초록이 된다',
    edit: [[TR_CSS, TR_CSS && TR_CSS.replace('.tr-subs', '.tr-subsX')]],
    want: [A_SELF], not: [A_ID, A_PRE, A_STAT, A_CSS] },

  /* ---- ⓑ 칸 수 파생 ---- */
  { id: 'N7', why: '03 던전에 4번째 칸을 넣고 `.sp3` 선언은 그대로 — «선언 = 실제 칸 수» 가 깨진다',
    edit: [[DUN_TOWER, DUN_4TH]],
    want: [A_N3], not: [A_DECL] },

  { id: 'N8', why: '`.sp4` 로 선언하고 칸도 4개인데 **`.sp4` CSS 규칙이 없다** — 선언은 맞고 실측이 안 따라온다',
    edit: [[DUN_BAR, DUN_BAR_SP4], [DUN_TOWER, DUN_4TH]],
    want: [A_W4], not: [A_DECL] },

  /* ---- 양성 대조 ---- */
  { id: 'N9', why: '★ 279 회귀 시험 — 03 던전이 4칸(.sp4 + 규칙)이 돼도 게이트는 따라온다. 옛 `n: 2` 였다면 여기서도 빨갰다',
    edit: [[DUN_BAR, DUN_BAR_SP4], [DUN_TOWER, DUN_4TH], [SP3_CSS, SP4_CSS]],
    green: true },

  { id: 'N10', why: '양성 대조 — 203/210 계열 칸이 하나 더 늘어도 §[0] 은 초록이다(옛 «[data-trsub] 0개» 였다면 빨갰다)',
    edit: [[TR_TEMPER, cat(TR_TEMPER, '\n', TR_TEMPER && ind(TR_TEMPER),
      '<div class="stab" data-trsub="rune2"><i class="ol3">룬2</i></div>')]],
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
    /* [A] 자리 해석 — «초록 항의 수» 보다 먼저 볼 절이다(387).
     * 다섯 항이 조용히 죽어 있던 동안에도 [0]·N10 은 계속 초록이었다. */
    console.log('[A] 갈아 끼울 자리 — 제품에서 정확히 한 줄씩 해석된다');
    ANCHORS.forEach(a => ok('앵커 ' + a.name + ' — ' + a.why,
      a.n === 1, a.n === 1 ? 'index.html:' + a.at : (a.n === 0 ? '0줄 — 그 자리가 사라졌다' : a.n + '줄 — 지목이 모호하다')));

    console.log('\n[R] 되돌림 시험 — 이 해석기가 «무엇이 와도 초록» 이 아님');
    const probe = re => { let n = 0; LINES.forEach(l => { if (re.test(l)) n++; }); return n; };
    ok('R1 없는 자리는 0줄로 읽힌다(해석 실패)', probe(/^\s*\.__없는규칙__\s*\{/) === 0, '0줄');
    ok('R2 모호한 지목은 2줄 이상으로 읽힌다(해석 실패)', probe(/^\s*<div class="stab\b/) > 1, probe(/^\s*<div class="stab\b/) + '줄');
    ok('R3 no-op 치환은 «자리 없음» 으로 읽힌다', DUN_BAR != null && DUN_BAR.replace(/\bsp9\b/, 'sp4') === DUN_BAR,
      '갈아 낄 토큰이 없으면 from === to');

    /* R4 — 387 을 만든 그 드리프트를 **다시 먹여 본다**. 값 하나(폴리시)와 형제 노드 하나(298 계열)가
     * 바뀌어도 앵커는 여전히 한 줄로 해석돼야 한다. 옛 «줄 통째 리터럴» 은 바로 여기서 죽었다. */
    const probeIn = (lines, re) => lines.filter(l => re.test(l)).length;
    const drifted = LINES.map(l =>
      l === TR_CSS    ? TR_CSS.replace(/(\d+)px/, (_, d) => (Number(d) + 7) + 'px') :
      l === DUN_TOWER ? DUN_TOWER.replace('</div>', '<s class="bdg2"></s></div>') : l);
    const moved = drifted.filter((l, i) => l !== LINES[i]).length;
    ok('R4 드리프트를 실제로 먹였다(값 1 + 형제 노드 1)', moved === 2, moved + '줄 바뀜');
    ok('R4 값이 바뀌어도 TR_CSS 는 한 줄', probeIn(drifted, /^\s*\.tr-subs\s*\{/) === 1,
      probeIn(drifted, /^\s*\.tr-subs\s*\{/) + '줄');
    ok('R4 형제가 늘어도 DUN_TOWER 는 한 줄', probeIn(drifted, /^\s*<div\b[^>]*\bdata-dsub="tower"[^>]*>/) === 1,
      probeIn(drifted, /^\s*<div\b[^>]*\bdata-dsub="tower"[^>]*>/) + '줄');
    ok('R4 옛 «줄 통째 리터럴» 은 그 자리에서 죽는다(387 재현)',
      TR_CSS != null && DUN_TOWER != null && drifted.indexOf(TR_CSS) < 0 && drifted.indexOf(DUN_TOWER) < 0,
      '리터럴 대조는 0곳 — 이것이 27/32 였다');

    /* R5~R7 — 461. N9 가 주입하는 `.sp4` 규칙이 «제품에서 파생» 인지, 그저 이 파일에 적힌
     * 상수인지를 가른다. 461 이전에는 상수였고, 437 이 `--sb` 를 6 → 7 로 올린 순간
     * 그 사실이 «1px 세 항» 으로만 드러났다(무엇이 낡았는지는 말해 주지 않았다). */
    ok('R5 `.sp4` 아홉 규칙이 제품에서 파생됐다(§[A] 앵커 9줄과 같은 자리)',
      SP4_RULES != null && [C4_W].concat(C4_L, C4_ON).every(l => l != null) && SP4_RULES.length === 9,
      SP4_RULES ? SP4_RULES.length + '규칙 — 선언부는 index.html 것' : '파생 실패 — §[A] 를 보라');

    /* 제품 줄을 흔들면 파생물이 **따라와야** 한다 — 안 따라오면 그것은 상수다 */
    const c3re = /^\s*\.stab-c3\s*\{/;
    const c3drift = LINES.map(l => (c3re.test(l) ? l.replace('50%', '50.125%') : l));
    const derivedNow = SP4_RULES && SP4_RULES.join('|');
    const derivedDrift = sp4Rules(c3drift);
    ok('R6 제품 4분할 줄을 흔들면 파생물이 따라온다(상수였다면 안 따라온다)',
      derivedDrift != null && derivedNow != null
        && !derivedNow.includes('50.125%') && derivedDrift.join('|').includes('50.125%'),
      derivedDrift ? '칸3 좌변 50% → 50.125% 가 주입문에 그대로 실렸다' : '파생 실패');

    /* 461 의 그 세 항이 돌아오는 유일한 길 = 누군가 다시 손으로 적는 것 */
    ok('R7 파생물에 «b = 6px 시절» 리터럴이 없다(461 재발 방지)',
      derivedNow != null && derivedNow.includes('var(--sb)')
        && !/-6px|25%\s*\+\s*3px|8\.75px|26\.5px/.test(derivedNow),
      derivedNow == null ? '파생 실패' : '테두리는 `var(--sb)` 한 손잡이로만 들어온다');

    console.log('\n[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
    fs.writeFileSync(TMP, SRC);
    const base = runGate();
    ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : 'ALL PASS');

    for (const t of TESTS) {
      console.log('\n[' + t.id + '] ' + t.why);
      let next = SRC, found = true, why = '';
      for (const [from, to] of t.edit) {
        if (from == null || to == null) { found = false; why = '앵커 해석 실패 — §[A] 를 보라'; break; }
        if (from === to) { found = false; why = '치환이 no-op — 앵커 줄에 갈아 낄 토큰이 없다'; break; }
        if (next.indexOf(from) < 0) { found = false; why = '문자열 없음 — index.html 이 바뀌었다'; break; }
        next = next.replace(from, to);
      }
      ok(t.id + ' 갈아 끼울 자리를 찾았다', found, found ? t.edit.length + '곳' : why);
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
