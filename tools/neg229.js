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

/* 갈아 끼울 자리 — 전부 index.html 의 실제 문자열이다(못 찾으면 시험 자체를 FAIL 시킨다) */
const COLL_ROW = `      <div class="ibtn" data-pop="coll" style="--sf:.864;--sx:.919;--dx:2px;--dy:.5px"><span class="si">📚</span><span class="sl">도감</span><span class="bdg"></span></div>`;
const BLESS_ROW = `      <div class="ibtn" data-pop="bless" style="--sf:.916;--sx:1.414;--dx:2px;--dy:1.5px"><span class="si">🙏</span><span class="sl">축복</span><span class="bdg"></span></div>`;
/* A2 4회차 + 83 의 «행 슬롯» 보정 4줄 — 이것이 «균등 134 가 아니다» 를 만드는 유일한 자리다.
   ★ N3 을 처음엔 앞 3줄만 지워 놓고 «균등 134 로 되돌렸다» 고 불렀는데, 6행 보정(+4)이 남아
   라벨 pitch 가 134/134/134/**138** 이 되는 바람에 «균등 아님» 이 초록으로 남았다. 네 줄을 다 지워야
   진짜 균등이다 — 되돌림 시험도 «되돌린 줄 알았지 실제로는 안 되돌아간» 상태가 될 수 있다. */
const SLOTFIX = `  #sideL .ibtn:nth-child(3){margin-top:1px}
  #sideL .ibtn:nth-child(4){margin-top:-3px}
  #sideL .ibtn:nth-child(5){margin-top:-1px}`;
const SLOTFIX6 = `  #sideL .ibtn:nth-child(6){margin-top:4px}`;
const SIDE_CONST = `const SIDE = { ART:82, LABEL:32, GAP:20, TOP:72, N:5, PAD:8, LMIN:22, CLEAR:34,`;
const ROW7 = `      <div class="ibtn" data-pop="guild" style="--sf:.9;--sx:1;--dx:0;--dy:0"><span class="si">🏰</span><span class="sl">길드</span><span class="bdg"></span></div>\n`;

/* 각 시험은 subs = [[찾을 문자열, 갈아 끼울 문자열], …]. 전부 «정확히 1곳» 이어야 한다. */
const TESTS = [
  { id: 'N1', why: '작업 83 을 되돌린다 — «도감» 행을 빼면 축복이 ref 5행(736)으로 올라온다',
    subs: [[COLL_ROW, '      <!-- N1 — 도감 행 제거 -->']],
    want: ['#sideL 행 6개', '#sideL 순서 =', '라벨행 수 = SIDE.N', '행 bless y=874',
           'pitch 5→6 = 138', '라벨행 pitch 균등 아님'],
    not: ['SIDE.N = 5', '#sideL 에 mail 없음', '행 attend y=176', '행 roul y=337', '행 quest y=472',
          '행 promo y=602', 'pitch 1→2 = 161', 'pitch 2→3 = 135', 'pitch 3→4 = 131'] },

  { id: 'N2', why: '작업 71 자체를 되돌린다 — 좌측 «우편» 행을 다시 넣는다(이 게이트의 원래 물음)',
    subs: [[BLESS_ROW,
      `      <div class="ibtn" data-pop="mail" style="--sf:.9;--sx:1;--dx:0;--dy:0"><span class="si">📬</span><span class="sl">우편</span><span class="bdg"></span></div>\n` + BLESS_ROW]],
    want: ['src 좌측 data-pop="mail" 0건', '#sideL 에 mail 없음', '#sideL 행 6개', '#sideL 순서 =',
           '라벨행 수 = SIDE.N'],
    not: ['SIDE.N = 5', '행 attend y=176', '행 roul y=337', 'pitch 1→2 = 161'] },

  { id: 'N3', why: '«라벨행 pitch 균등 134» 가정으로 되돌린다(보정 4줄 전부) — 옛 EXP 표를 만든 바로 그 가정이다',
    subs: [[SLOTFIX, '  /* N3 — 슬롯 보정 제거 */'], [SLOTFIX6, '  /* N3 — 6행 보정 제거 (= 균등 134) */']],
    want: ['행 promo y=602', '행 coll y=736',
           'pitch 2→3 = 135', 'pitch 3→4 = 131', 'pitch 4→5 = 133', 'pitch 5→6 = 138',
           '라벨행 pitch 균등 아님'],
    /* ★ quest(471 vs 472)·bless(873 vs 874)는 **y 허용오차 1.5 에 걸려 초록으로 샌다** —
       옛 게이트가 quest 를 471 로 굳혀 놓고도 «초록» 이던 바로 그 현상이다(212-②).
       그래서 «균등 134 되돌림» 을 잡는 것은 y 단언이 아니라 **pitch·«균등 아님»** 쪽이다. */
    not: ['#sideL 행 6개', '#sideL 순서 =', '라벨행 수 = SIDE.N', 'SIDE.N = 5',
          '행 attend y=176', '행 roul y=337', '행 quest y=472', '행 bless y=874', 'pitch 1→2 = 161'] },

  { id: 'N4', why: '83 이 6행에 준 보정 4px 만 지운다 — 축복 한 행만 어긋난다(보정이 행별로 산다는 증명)',
    subs: [[SLOTFIX6, '  /* N4 — 6행 보정 제거 */']],
    want: ['pitch 5→6 = 138'],
    not: ['행 coll y=736', '행 promo y=602', 'pitch 4→5 = 133', 'pitch 3→4 = 131',
          '#sideL 순서 =', '#sideL 행 6개', '라벨행 수 = SIDE.N', 'SIDE.N = 5'] },

  { id: 'N5', why: 'SIDE.N 만 5 → 6 으로 올린다(칸은 그대로) — 행 목록은 멀쩡하니 ROSTER 는 초록이어야 한다',
    subs: [[SIDE_CONST, SIDE_CONST.replace('N:5', 'N:6')]],
    want: ['SIDE.N = 5', '라벨행 수 = SIDE.N'],
    not: ['#sideL 행 6개', '#sideL 순서 =', '#sideL 에 mail 없음'] },

  { id: 'N6', why: '칸을 하나 더 늘리며 SIDE.N 도 «같이» 올린다 — 이 경우 SIDE.N 단언은 초록으로 새고 ROSTER 만 잡는다',
    subs: [[SIDE_CONST, SIDE_CONST.replace('N:5', 'N:6')], [BLESS_ROW, ROW7 + BLESS_ROW]],
    want: ['#sideL 행 6개', '#sideL 순서 =', 'SIDE.N = 5'],
    not: ['라벨행 수 = SIDE.N', '#sideL 에 mail 없음'] },

  { id: 'N7', why: '`--itop` 만 72 → 80 으로 민다 — 행 전체가 평행이동한다(y 축과 pitch 축이 다르다는 증명)',
    subs: [['TOP:72,', 'TOP:80,']],
    want: ['행 attend y=176', '행 roul y=337', '행 quest y=472', '행 bless y=874',
           '행 그리드 변수 불변'],
    not: ['pitch 1→2 = 161', 'pitch 2→3 = 135', 'pitch 3→4 = 131', 'pitch 4→5 = 133',
          'pitch 5→6 = 138', '라벨행 pitch 균등 아님', '#sideL 순서 =', '#sideL 행 6개',
          '라벨행 수 = SIDE.N', 'SIDE.N = 5'] },
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
