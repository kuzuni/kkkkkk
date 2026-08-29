/* 작업 229 — 되돌림(음성) 시험
 *
 * `tools/verify71.js` [1] 절이 **정말로 무언가를 지키는지** 확인한다.
 * 229 는 기대값의 출처를 «71 당시의 실측 스냅샷» → «A2 측정표의 ref 좌표» 로 **이사**시킨 것이라,
 * 이사만 하고 끝내면 «옛 가정이 되돌아와도 초록» 인 항등식이 남는다(LESSONS 214-④ · 215-② · 217-②).
 *
 * 방법 — `index.html` 사본을 한 곳만 갈아 끼워 `.v229-neg.html` 로 쓰고, **그 파일을 새로 열어**
 * `verify71` 을 통째로 돌린다(`V71_SRC`). 살아 있는 페이지에 주입하면 거짓 초록이 난다(LESSONS 191 · 219 선례).
 * 각 시험은 «어떤 항목이 빨개져야 하는가»(want)와 «그대로 초록이어야 하는가»(not)를 같이 적는다 —
 * 후자가 없으면 «아무거나 흔들면 다 빨개지는» 항등식과 구별이 안 된다.
 *
 * 실행: node tools/neg229.js  → 마지막 줄이 `NEG229 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, '.v229-neg.html');

/* 갈아 끼울 자리 — 전부 index.html 의 실제 문자열이다(못 찾으면 시험 자체를 FAIL 시킨다)

   ⚑ 360 이관(2026-08-29, sess-2100-32546 워커 D). 360 이 «출석» 단독 규격과 `nth-child` 슬롯
   보정을 통째로 걷어내 **되돌릴 자리 자체가 바뀌었다** — 옛 N3·N4(보정 4줄 제거)는 지울 줄이
   없어져 «갈아 끼울 자리가 1곳» 에서 죽는다. 그 둘을 **반대 방향**으로 다시 세운다:
   이제 되돌림은 «보정을 지우는 것» 이 아니라 **«ref 의 비균등 규격을 되살리는 것»** 이다. */
/* ⚑ 381 이관(2026-08-29). 이 셋은 원래 «71/83/360 당시의 행 문자열» 을 통째로 박아 둔 상수였다.
   그래서 행의 **인라인 스타일이 한 글자라도 바뀌면** 갈아 끼울 자리가 0곳이 되고, 그 자리를 쓰는
   N1·N2·N3·N6 네 블록이 통째로 죽는다(`continue` 라 want/not 이 아예 안 세진다 = 조용한 구멍).
   실제로 356(주인 지시 «아이콘은 원본 비율 — 비균등 scaleX 금지»)이 `--sx` 를 걷어내고
   371 이 축복 글리프를 🙏 → 😇 로 바꾸자 **셋 다 0곳**이 되어 `NEG229 42/46` 으로 죽었다.
   ⇒ 368 처방 그대로 «자리를 상수에서 빼고 제품에게 묻는다» — `data-pop` 으로 행을 뽑는다.
   이제 다음 `--sf`/글리프 변경에 이 게이트는 안 죽는다. 뽑기가 실패하면 조용히 지나가지 않고
   **그 자리에서 죽는다**(아래 세 겹 가드) — 조용한 0곳이 바로 381 이 고치는 결함이기 때문이다. */
const row = pop => {
  const re = new RegExp(`^[ \\t]*<div class="ibtn"[^\\n]*?data-pop="${pop}"[^\\n]*?</div>$`, 'gm');
  const hit = SRC.match(re) || [];
  if (hit.length !== 1) {
    console.error(`neg229: 행 data-pop="${pop}" 을 index.html 에서 ${hit.length}곳 찾았다 — 정확히 1곳이어야 한다`);
    process.exit(1);
  }
  /* 뽑은 것이 «진짜 그 행» 인지 세 겹으로 못박는다 — 정규식이 엉뚱한 줄을 물면
     N1~N6 이 «갈아 끼우기는 했는데 아무것도 안 바뀌는» 거짓 초록이 된다. */
  const r = hit[0];
  for (const [why, cond] of [
    ['class="ibtn" 를 품는다(N3 의 .solo 치환 좌변)', r.includes('class="ibtn"')],
    ['--sf 를 품는다(사이드 행 규격)', r.includes('--sf:')],
    ['라벨 <span class="sl"> 을 품는다', r.includes('<span class="sl">')],
  ]) if (!cond) { console.error(`neg229: 뽑은 행 data-pop="${pop}" 이 «${why}» 를 어긴다 — ${r.slice(0, 120)}`); process.exit(1); }
  return r;
};
const COLL_ROW = row('coll');
const BLESS_ROW = row('bless');
const ATTEND_ROW = row('attend');
const SIDE_CONST = `const SIDE = { ART:82, LABEL:32, GAP:20, TOP:72, N:6, PAD:8, LMIN:22, CLEAR:34 };`;
const ROW7 = `      <div class="ibtn" data-pop="guild" style="--sf:.9;--sx:1;--dx:0;--dy:0"><span class="si">🏰</span><span class="sl">길드</span><span class="bdg"></span></div>\n`;
/* CSS 삽입 지점 — `.ibtn` 규칙 바로 다음. 여기에 옛 규격을 도로 붙여 «360 되돌림» 을 만든다. */
const CSS_ANCHOR = `  .ibtn{width:100px;height:calc(var(--ih,82px) + var(--ilh,32px));position:relative;cursor:pointer;
    background:none;border:0;display:flex;flex-direction:column;align-items:center}`;
/* 360 이 지운 «출석 단독 규격» — 아트 101 · 아래 gap 60. 되살리려면 CSS 와 마크업이 한 벌이다. */
const SOLO_CSS = `
  .ibtn.solo{height:var(--isolo,101px);
    margin-bottom:calc(var(--isgap,60px) - var(--igap,20px))}
  .ibtn.solo .si{width:calc(var(--isolo,101px)*1.6);height:var(--isolo,101px);
    line-height:var(--isolo,101px);font-size:calc(var(--isolo,101px)*var(--sf,.96))}`;
/* 360 이 지운 «ref 비균등 pitch» 슬롯 보정 — 이것이 pitch 를 135/131/133/138 로 만들던 자리다 */
const SLOTFIX_CSS = `
  #sideL .ibtn:nth-child(3){margin-top:1px}
  #sideL .ibtn:nth-child(4){margin-top:-3px}
  #sideL .ibtn:nth-child(5){margin-top:-1px}
  #sideL .ibtn:nth-child(6){margin-top:4px}`;

/* 각 시험은 subs = [[찾을 문자열, 갈아 끼울 문자열], …]. 전부 «정확히 1곳» 이어야 한다. */
const TESTS = [
  { id: 'N1', why: '작업 83 을 되돌린다 — «도감» 행을 빼면 축복이 한 칸 올라오고 행 수가 5가 된다',
    subs: [[COLL_ROW, '      <!-- N1 — 도감 행 제거 -->']],
    /* ★ y 단언은 «행 i 의 top = 176 + 134·i» 라 행이 빠지면 **남은 행의 기대값도 같이 당겨진다** —
       축복은 6행에서 5행이 되며 기대가 846 → 712 로 바뀌고 실측도 712 라 **초록으로 남는다**.
       행이 빠진 것을 잡는 것은 y 가 아니라 «행 6개»·«순서»·«행 수 = SIDE.N», 그리고 pitch 항목 수를
       세는 «6행 pitch 등간격» 이다(그래서 그것이 want 에 있다). */
    want: ['#sideL 행 6개', '#sideL 순서 =', '행 수 = SIDE.N', '6행 pitch 등간격'],
    not: ['SIDE.N = 6', '#sideL 에 mail 없음', '행 attend y=176', '행 roul y=310', '행 quest y=444',
          '행 promo y=578', 'pitch 1→2 = 134', 'pitch 2→3 = 134', 'pitch 3→4 = 134',
          '6행 셀 높이가 전부 114'] },

  { id: 'N2', why: '작업 71 자체를 되돌린다 — 좌측 «우편» 행을 다시 넣는다(이 게이트의 원래 물음)',
    subs: [[BLESS_ROW,
      `      <div class="ibtn" data-pop="mail" style="--sf:.9;--sx:1;--dx:0;--dy:0"><span class="si">📬</span><span class="sl">우편</span><span class="bdg"></span></div>\n` + BLESS_ROW]],
    want: ['src 좌측 data-pop="mail" 0건', '#sideL 에 mail 없음', '#sideL 행 6개', '#sideL 순서 =',
           '행 수 = SIDE.N'],
    not: ['SIDE.N = 6', '행 attend y=176', '행 roul y=310', 'pitch 1→2 = 134', '6행 셀 높이가 전부 114'] },

  /* ★ 360 의 본 되돌림 — 주인이 «다르다» 고 본 그 규격을 통째로 되살린다.
     ⓐ pitch 1→2 가 134 → 161 로 튀고 ⓑ 아래 5행 y 가 전부 27px 밀리고 ⓒ 셀 높이가 한 행만 101 이 되고
     ⓓ 단독행이 1개가 된다. 넷이 **다 같이** 빨개져야 «한 벌» 임이 증명된다 — 하나만 잡히면
     나머지 셋은 그 자리를 안 지키고 있었다는 뜻이다. */
  { id: 'N3', why: '★ 360 되돌림 — «출석» 단독 규격(.solo · 아트 101 · 아래 gap 60)을 되살린다',
    subs: [[CSS_ANCHOR, CSS_ANCHOR + SOLO_CSS],
           [ATTEND_ROW, ATTEND_ROW.replace('class="ibtn"', 'class="ibtn solo"')]],
    want: ['행 수 = SIDE.N', 'pitch 1→2 = 134', '6행 pitch 등간격', '6행 셀 높이가 전부 114',
           '행 roul y=310', '행 quest y=444', '행 promo y=578', '행 coll y=712', '행 bless y=846'],
    not: ['#sideL 행 6개', '#sideL 순서 =', 'SIDE.N = 6', '행 attend y=176', '#sideL 에 mail 없음',
          'pitch 2→3 = 134', 'pitch 3→4 = 134', 'pitch 4→5 = 134', 'pitch 5→6 = 134'] },

  { id: 'N4', why: '★ 360 되돌림 — ref 의 비균등 pitch(슬롯 보정 −3~+4px)를 되살린다',
    subs: [[CSS_ANCHOR, CSS_ANCHOR + SLOTFIX_CSS]],
    want: ['pitch 2→3 = 134', 'pitch 3→4 = 134', 'pitch 4→5 = 134', 'pitch 5→6 = 134',
           '6행 pitch 등간격', '행 promo y=578', '행 coll y=712'],
    /* ⓐ 1행 pitch 는 3행부터 붙는 보정이라 안 움직인다 ⓑ 셀 높이는 margin 이 아니라 height 몫이라
       그대로다 — 이 둘이 초록으로 남아야 «pitch 축» 과 «규격 축» 이 다른 축임이 증명된다.
       ⓒ ★ quest(+1)·bless(+1−3−1+4 = +1)는 **누적 오프셋이 허용오차 1.5 안이라 초록으로 샌다** —
          229 가 적어 둔 212-② 가 그대로 재현되는 자리다(보정 4줄은 «합이 0에 가깝게» 설계돼 있어
          절대좌표로는 중간 두 행에서만 드러난다). ⇒ 이 되돌림을 실제로 잡는 것은 y 가 아니라
          **pitch 4칸과 «등간격»** 이고, 그래서 그 다섯이 want 에 있다. */
    not: ['pitch 1→2 = 134', '6행 셀 높이가 전부 114', '#sideL 행 6개', '#sideL 순서 =',
          'SIDE.N = 6', '행 attend y=176', '행 roul y=310',
          '행 quest y=444', '행 bless y=846'] },

  { id: 'N5', why: 'SIDE.N 만 6 → 5 로 내린다(칸은 그대로) — 행 목록은 멀쩡하니 ROSTER 는 초록이어야 한다',
    subs: [[SIDE_CONST, SIDE_CONST.replace('N:6', 'N:5')]],
    want: ['SIDE.N = 6', '행 수 = SIDE.N'],
    not: ['#sideL 행 6개', '#sideL 순서 =', '#sideL 에 mail 없음', '6행 셀 높이가 전부 114'] },

  { id: 'N6', why: '칸을 하나 더 늘리며 SIDE.N 도 «같이» 올린다 — 이 경우 SIDE.N 단언은 초록으로 새고 ROSTER 만 잡는다',
    subs: [[SIDE_CONST, SIDE_CONST.replace('N:6', 'N:7')], [BLESS_ROW, ROW7 + BLESS_ROW]],
    want: ['#sideL 행 6개', '#sideL 순서 =', 'SIDE.N = 6'],
    not: ['행 수 = SIDE.N', '#sideL 에 mail 없음'] },

  { id: 'N7', why: '`--itop` 만 72 → 80 으로 민다 — 행 전체가 평행이동한다(y 축과 pitch 축이 다르다는 증명)',
    subs: [['TOP:72,', 'TOP:80,']],
    want: ['행 attend y=176', '행 roul y=310', '행 quest y=444', '행 bless y=846',
           '행 그리드 변수 불변'],
    not: ['pitch 1→2 = 134', 'pitch 2→3 = 134', 'pitch 3→4 = 134', 'pitch 4→5 = 134',
          'pitch 5→6 = 134', '6행 pitch 등간격', '#sideL 순서 =', '#sideL 행 6개',
          '행 수 = SIDE.N', 'SIDE.N = 6', '6행 셀 높이가 전부 114'] },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify71.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V71_SRC: TMP }), encoding: 'utf8' });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter(l => /^\s*FAIL /.test(l)).map(l => l.trim().replace(/^FAIL /, ''));
};

(async () => {
  console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
  fs.writeFileSync(TMP, SRC);
  const base = runGate();
  ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : '66/66');

  for (const t of TESTS) {
    console.log('\n[' + t.id + '] ' + t.why);
    const bad = t.subs.map(([from]) => SRC.split(from).length - 1).filter(h => h !== 1).length;
    if (bad) { ok(t.id + ' 갈아 끼울 자리가 전부 정확히 1곳', false, bad + '개가 1곳이 아니다 — index.html 이 바뀌었다'); continue; }
    ok(t.id + ' 갈아 끼울 자리가 전부 정확히 1곳', true, t.subs.length + '곳');
    fs.writeFileSync(TMP, t.subs.reduce((s, [from, to]) => s.replace(from, to), SRC));
    const fails = runGate();
    t.want.forEach(w => ok(t.id + ' → 「' + w + '」 이(가) 빨개진다',
      fails.some(f => f.startsWith(w)), fails.length ? '빨간 항목 ' + fails.length + '개' : '전부 초록 — 단언이 안 잡는다'));
    (t.not || []).forEach(w => ok(t.id + ' → 「' + w + '」 은(는) 그대로 초록',
      !fails.some(f => f.startsWith(w)), '빨간 항목 ' + fails.length + '개'));
  }

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nNEG229 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
