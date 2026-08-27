/* 작업 247 — 되돌림(음성) 시험
 *
 * `tools/verify123.js` [6]·[7] 의 «아레나 결과 통보» 이사분(`#modal.on .mhead` → `#fxl .fx-toast`)이
 * **정말로 무언가를 지키는지** 확인한다. 이사만 하고 끝내면 «206 이 되돌아가도 초록» 인 항등식이
 * 남는다(LESSONS 214-④ · 215-② · 217-② · 219 · 230-③④ · 231-①).
 *
 * 방법 — `index.html` 사본을 **한 곳만** 갈아 끼워 `.v247-neg.html` 로 쓰고, **그 파일을 새로 열어**
 * `verify123` 을 통째로 돌린다(`V123_SRC`). 살아 있는 페이지에 주입하면 거짓 초록이 난다(LESSONS 191).
 * 각 시험은 «빨개져야 할 항목»(want) 과 «그대로 초록이어야 할 항목»(not) 을 이름 조각으로 적는다.
 * not 이 있는 이유: 새 단언들이 **항등식이 아니라 서로 다른 절을 때린다** 는 증명이다(230-④).
 *
 * 실행: node tools/neg247.js  → 마지막 줄이 `NEG247 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, '.v247-neg.html');

/* 갈아 끼울 자리 — index.html `openArenaResult` 의 통보 두 줄이다(못 찾으면 시험 자체를 FAIL 시킨다) */
const NOTE = `  notify((win ? '🏅 아레나 승리' : '💀 아레나 패배')
    + ' — 상대 전투력 <b>' + fmtB(a.op.cp) + '</b> · ' + (got || '보상 없음'));`;
/* 중단 분기 — 여기서 결과 통보가 새면 «중단은 통보 없음» 이 잡아야 한다 */
const QUIT = `    showMsg('아레나 중단');                            /* 94 — 12자 이내 */`;

/* 이름 조각 — verify123 단언 이름의 앞자락 */
const W1 = '승리 결과 통보가 떴다';
const W2 = '승리 통보에 상대 전투력이 적혀 있다';
const W3 = '승리 통보는 팝업이 아니다';
const L1 = '패배 결과 통보가 떴다';
const L2 = '패배 통보는 팝업이 아니다';
const Q1 = '중단은 승/패 결과 통보를 내지 않는다';
const R1 = '아레나 카드의 «전적» 칸이 1-0 으로 갱신';
const R2 = '보상(골드·다이아)이 실제로 지급됐다';

const TESTS = [
  { id: 'N1', why: '통보를 통째로 지운다 — «끝나긴 했는데 아무 말도 안 하는» 회귀',
    from: NOTE, to: `  /* N1 — 통보 제거 */`,
    want: [W1, W2, L1], not: [W3, L2, Q1, R1, R2] },

  { id: 'N2', why: '206 되돌림 — 결과를 다시 A5 모달 팝업으로 띄운다(옛 코드 그대로)',
    from: NOTE,
    to: `  popup(win ? '🏅 아레나 승리!' : '💀 아레나 패배',
    '<p><b>' + S.nick + '</b> vs <b>' + a.op.n + '</b><br>'
    + '상대 전투력 <b>' + fmtB(a.op.cp) + '</b><br>'
    + '보상 <b>' + got + '</b><br>'
    + '전적 <b>' + rec.w + '승 ' + rec.l + '패</b></p>');`,
    want: [W1, W2, W3, L1, L2], not: [Q1, R1, R2] },

  { id: 'N3', why: '문구에서 상대 전투력만 뺀다 — 유일한 표시처가 조용히 사라지는 회귀',
    from: NOTE,
    to: `  notify((win ? '🏅 아레나 승리' : '💀 아레나 패배') + ' — ' + (got || '보상 없음'));`,
    want: [W2], not: [W1, W3, L1, L2, Q1, R1, R2] },

  /* ⚠ 「fmtB → fmt 로 표기 규약만 흔든다」 는 시험은 **이 화면에서 만들 수 없다**.
     `fmtB = n => fmtG(n)`(index.html 13372)이고 아레나 상대 전투력은 실측 400~600 대라
     `fmtG(461) === fmt(461) === '461'` 로 두 규약이 **같은 글자**를 낸다(verify116 E4-1 이
     «단언이 유효한 크기» 를 따로 물어 둔 것과 같은 사정 — 여기서는 그 크기가 안 나온다).
     대신 «적힌 수가 진짜 그 상대의 수인가» 를 흔든다 — 표기가 아니라 **결속**이 이 단언의 값어치다. */
  { id: 'N4', why: '통보에 적는 수만 두 배로 부풀린다 — 라벨·자리는 그대로인데 «남의 수» 를 적는 회귀',
    from: NOTE,
    to: `  notify((win ? '🏅 아레나 승리' : '💀 아레나 패배')
    + ' — 상대 전투력 <b>' + fmtB(a.op.cp * 2) + '</b> · ' + (got || '보상 없음'));`,
    want: [W2], not: [W1, W3, L1, L2, Q1, R1, R2] },

  { id: 'N5', why: '중단(◀ 나가기)에서도 승리 통보를 낸다 — «안 싸우고 나갔는데 이겼다고 알리는» 회귀',
    from: QUIT,
    to: `    showMsg('아레나 중단');
    notify('🏅 아레나 승리 — 상대 전투력 <b>0</b> · 보상 없음');   /* N5 */`,
    want: [Q1], not: [W1, W2, W3, L1, L2, R1, R2] },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

/* verify123 을 사본에 대고 돌려 «빨간 항목 이름» 목록을 낸다 */
const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify123.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V123_SRC: TMP }), encoding: 'utf8' });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter((l) => /^\s*✗ /.test(l)).map((l) => l.trim().replace(/^✗ /, ''));
};

(async () => {
  console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
  fs.writeFileSync(TMP, SRC);
  const base = runGate();
  ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : 'VERIFY123 PASS');

  for (const t of TESTS) {
    console.log('\n[' + t.id + '] ' + t.why);
    const hits = SRC.split(t.from).length - 1;
    if (hits !== 1) { ok(t.id + ' 갈아 끼울 자리를 찾았다', false, hits + '곳 — index.html 이 바뀌었다'); continue; }
    ok(t.id + ' 갈아 끼울 자리를 찾았다', true, '1곳');
    fs.writeFileSync(TMP, SRC.replace(t.from, t.to));
    const fails = runGate();
    t.want.forEach((w) => ok(t.id + ' → 「' + w + '」 이(가) 빨개진다',
      fails.some((f) => f.startsWith(w)), fails.length ? '빨간 항목 ' + fails.length + '개' : '전부 초록 — 단언이 안 잡는다'));
    (t.not || []).forEach((w) => ok(t.id + ' → 「' + w + '」 은(는) 그대로 초록',
      !fails.some((f) => f.startsWith(w)), '빨간 항목 ' + fails.length + '개: ' + fails.join(' / ').slice(0, 160)));
  }

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nNEG247 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
