/* 작업 231 — 되돌림(음성) 시험
 *
 * `tools/verify36.js` [4] 의 «프리미엄 칸 잠금 안내» 이사분(모달 → `#fxl .fx-toast`)이
 * **정말로 무언가를 지키는지** 확인한다. 이사만 하고 끝내면 «규칙이 되돌아와도 초록» 인
 * 항등식이 남는다(LESSONS 214-④ · 215-② · 217-② · 219 · 230-③④).
 *
 * 방법 — `index.html` 사본을 한 곳만 갈아 끼워 `.v231-neg.html` 로 쓰고, **그 파일을 새로 열어**
 * `verify36` 을 통째로 돌린다(`V36_SRC`). 살아 있는 페이지에 주입하면 거짓 초록이 난다(LESSONS 191).
 * 각 시험은 «어떤 항목이 빨개져야 하는가»(want) 와 «그대로 초록이어야 하는가»(not) 를 이름 조각으로 적어 둔다.
 * not 이 있는 이유: 네 단언이 **항등식이 아니라 서로 다른 절을 때린다** 는 것을 보여야 한다(230-④).
 *
 * 실행: node tools/neg231.js  → 마지막 줄이 `NEG231 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, '.v231-neg.html');

/* 갈아 끼울 자리 — index.html 의 실제 한 줄이다(못 찾으면 시험 자체를 FAIL 시킨다) */
const GUARD = `  if(c > 0 && !passPrem()){ notify('🔒 <b>프리미엄 패스</b>를 활성화하면 받습니다'); return false; }`;

/* 이름 조각 — verify36 [4] 의 단언 이름 앞부분(✓·✗ 가 같은 자락으로 시작한다) */
const A1 = '프리미엄 잠금 전제 — 미구매 상태';
const A2 = '프리미엄 칸 수령 차단';
const A3 = '잠금 안내 토스트 노출';
const A4 = '잠금 안내는 팝업이 아니다';

const TESTS = [
  { id: 'N1', why: '안내를 통째로 지운다 — «막기는 하는데 왜 막혔는지 말을 안 하는» 회귀',
    from: GUARD, to: `  if(c > 0 && !passPrem()){ return false; }   /* N1 — 안내 제거 */`,
    want: [A3], not: [A1, A2, A4] },

  { id: 'N2', why: '문구에서 «프리미엄»·«활성화» 를 뺀다 — 무엇을 켜라는지 안 말하는 회귀(런타임 계산 단언이 잡아야 한다)',
    from: GUARD, to: `  if(c > 0 && !passPrem()){ notify('🔒 아직 받을 수 없습니다'); return false; }`,
    want: [A3], not: [A1, A2, A4] },

  { id: 'N3', why: '149(주인 지시) 되돌림 — 안내를 다시 모달 팝업으로 띄운다',
    from: GUARD,
    to: `  if(c > 0 && !passPrem()){ popup('🔒 프리미엄 패스', '<p><b>프리미엄 패스</b>를 활성화하면 받습니다</p>'); return false; }`,
    want: [A3, A4], not: [A1, A2] },

  { id: 'N4', why: '잠금 가드 자체를 무력화한다 — 프리미엄 칸이 그냥 수령된다(안내도 없다)',
    from: GUARD, to: `  /* N4 — 가드 무력화 */`,
    want: [A2, A3], not: [A1, A4] },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

/* verify36 을 사본에 대고 돌려 «빨간 항목 이름» 목록을 낸다 */
const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify36.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V36_SRC: TMP }), encoding: 'utf8' });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter(l => /^\s*✗ /.test(l)).map(l => l.trim().replace(/^✗ /, ''));
};

(async () => {
  console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
  fs.writeFileSync(TMP, SRC);
  const base = runGate();
  ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : 'VERIFY36 PASS');

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
  console.log('\nNEG231 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
