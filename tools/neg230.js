/* 작업 230 — 되돌림(음성) 시험
 *
 * `tools/verify73.js` §4 의 «차단 안내» 이사분(모달 → `#fxl .fx-toast`)이 **정말로 무언가를 지키는지**
 * 확인한다. 이사만 하고 끝내면 «규칙이 되돌아와도 초록» 인 항등식이 남는다(LESSONS 214-④ · 215-② · 217-② · 219).
 *
 * 방법 — `index.html` 사본을 한 곳만 갈아 끼워 `.v230-neg.html` 로 쓰고, **그 파일을 새로 열어**
 * `verify73` 를 통째로 돌린다(`V73_SRC`). 살아 있는 페이지에 주입하면 거짓 초록이 난다(LESSONS 191).
 * 각 시험은 «어떤 항목이 빨개져야 하는가»(want) 와 «그대로 초록이어야 하는가»(not) 를 이름 조각으로 적어 둔다.
 * not 이 있는 이유: 네 단언이 **항등식이 아니라 서로 다른 절을 때린다** 는 것을 보여야 한다.
 *
 * 실행: node tools/neg230.js  → 마지막 줄이 `NEG230 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, `.v230-neg-${process.pid}.html`);

/* 갈아 끼울 자리 — 전부 index.html 의 실제 문자열이다(못 찾으면 시험 자체를 FAIL 시킨다) */
const NOTIFY = `  notify('📌 <b>' + BANNERS[need].n + ' 소환</b>을 먼저 해주세요');`;
const GUARD  = `  const need = gmBan();`;
const FREE   = `  if(btn.dataset.shfree){\n    if(gmBlocked(b)) return;`;

/* 이름 조각 — verify73 의 단언 이름 앞부분 */
const A2 = '차단 시 안내 토스트 노출';
const A3 = '차단 안내는 팝업이 아니다';
const A4 = '무료 10연 차단도 같은 안내를 낸다';
const A1 = '유료 방어구 10연 차단 — 다이아·카운터 불변';

const TESTS = [
  { id: 'N1', why: '안내를 통째로 지운다 — «막기는 하는데 왜 막혔는지 말을 안 하는» 회귀',
    from: NOTIFY, to: '  /* N1 — 안내 제거 */',
    want: [A2, A4], not: [A1, A3] },

  { id: 'N2', why: '문구에서 상자 이름을 뺀다 — 「어느 상자를 먼저」 가 사라진 회귀(런타임 계산 단언이 잡아야 한다)',
    from: NOTIFY, to: `  notify('📌 <b>소환</b>을 먼저 해주세요');`,
    want: [A2, A4], not: [A1, A3] },

  { id: 'N3', why: '149(주인 지시) 되돌림 — 안내를 다시 모달 팝업으로 띄운다',
    from: NOTIFY,
    to: `  popup('가이드 진행 중', '<p>📌 <b>' + BANNERS[need].n + ' 소환</b>을 먼저 해주세요</p>');`,
    want: [A2, A3, A4], not: [A1] },

  { id: 'N4', why: '차단 가드 자체를 무력화한다 — 방어구가 그냥 뽑힌다(안내도 없다)',
    from: GUARD, to: '  const need = null; /* N4 — 가드 무력화 */',
    want: [A1, A2, A4], not: [A3] },

  { id: 'N5', why: '무료 경로만 «조용히» 막는다 — 유료 쪽 세 단언은 초록으로 남아야 한다',
    from: FREE, to: `  if(btn.dataset.shfree){\n    if(gmBan() && gmBan() !== b) return; /* N5 — 조용한 차단 */`,
    want: [A4], not: [A1, A2, A3] },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

/* verify73 을 사본에 대고 돌려 «빨간 항목 이름» 목록을 낸다 */
const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify73.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V73_SRC: TMP }), encoding: 'utf8' });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter(l => /^\s*✗ /.test(l)).map(l => l.trim().replace(/^✗ /, ''));
};

(async () => {
  console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
  fs.writeFileSync(TMP, SRC);
  const base = runGate();
  ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : '67/67');

  for (const t of TESTS) {
    console.log('\n[' + t.id + '] ' + t.why);
    const hits = SRC.split(t.from).length - 1;
    if (hits !== 1) { ok(t.id + ' 갈아 끼울 자리를 찾았다', false, hits + '곳 — index.html 이 바뀌었다'); continue; }
    ok(t.id + ' 갈아 끼울 자리를 찾았다', true, '1곳');
    fs.writeFileSync(TMP, SRC.replace(t.from, t.to));
    const fails = runGate();
    t.want.forEach(w => ok(t.id + ' → 「' + w + '」 이(가) 빨개진다',
      fails.some(f => f.startsWith(w)), fails.length ? '빨간 항목 ' + fails.length + '개' : '전부 초록 — 단언이 안 잡는다'));
    (t.not || []).forEach(w => ok(t.id + ' → 「' + w + '」 은(는) 그대로 초록',
      !fails.some(f => f.startsWith(w)), '빨간 항목 ' + fails.length + '개: ' + fails.join(' / ').slice(0, 160)));
  }

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nNEG230 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
