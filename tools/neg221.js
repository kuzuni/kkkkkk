/* 작업 221 — 되돌림(음성) 시험
 *
 * `tools/verify47.js` [5] «닫기 → 재진입» 을 «절대 x 비교» 에서 «바 기준 차분 + settle» 로
 * 바꿨다. 바꾸기만 하고 끝내면 **무엇이 되돌아와도 초록인 항등식**이 남는다
 * (LESSONS 214-④ · 215-② · 217-② · 219 ★). 그래서 세 가지를 각각 증명한다:
 *   ⓐ 칸이 «바 안에서» 실제로 밀리면(=재진입 잔존 상태 버그) 여전히 빨개진다  → N1·N2
 *   ⓑ 바째로 옮겨가는 회귀도 놓치지 않는다(새로 추가한 «바 vs 호스트» 단언)   → N3
 *   ⓒ «잰 순간이 입장 연출 도중이 아니다» 를 지키는 파수꾼이 살아 있다        → N4
 *   ⓓ 그런데 입장 연출이 아무리 길어져도(221 의 병) 판정은 흔들리지 않는다    → N5(양성 대조)
 *
 * 방법 — `index.html` 사본을 한 곳만 갈아 끼워 `.v221-neg.html` 로 쓰고, **그 파일을 새로 열어**
 * `verify47` 를 통째로 돌린다(`V47_SRC`). 살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다(LESSONS 191).
 *
 * ⚠ N1~N3 은 «닫았다 다시 열면 달라진다» 를 만들어야 한다 — 상시 어긋남은 [5] 의 기준선(g0)도
 *    같이 밀어서 Δ0 으로 초록이 되고(그건 [2] 격자 단언이 잡는다), [5] 가 지키는 성질이 아니다.
 *    그래서 **여는 함수에 카운터 후크**를 걸어 «3번째로 열 때부터» 결함 클래스가 붙게 한다.
 *    (열림 횟수: [1] 기준선 = 1번째 · [5] 첫 열기 = 2번째 · [5] **재진입 = 3번째**.
 *     닫기 함수에 걸면 안 된다 — `goTab('adv')` 가 상점을 닫는 식으로 서로를 불러서
 *     기준선을 재기 «전에» 이미 결함이 켜진다.)
 *
 * 실행: node tools/neg221.js  → 마지막 줄이 `NEG221 PASS` 여야 한다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, '.v221-neg.html');

/* 갈아 끼울 자리 — 전부 index.html 의 실제 문자열이다(못 찾으면 시험 자체를 FAIL 시킨다) */
/* PGCLS — 입장 연출 길이. N5 가 10배로 늘려 «연출 길이에 판정이 안 흔들린다» 를 본다 */
const PGCLS = '  .jz-o.jz-pg{animation:jzPgIn .12s ease-out both}';

/* 열기 후크 + 결함 CSS 를 </body> 앞에 끼워 넣는다 */
const TAIL = '</body>';
const hook = (fn, css) => '<style>' + css + '</style>\n<script>(function(){\n'
  + '  var n = 0, o = window.' + fn + ';\n'
  + '  window.' + fn + ' = function(){ if(++n >= 3) document.documentElement.classList.add("neg221");\n'
  + '    return o.apply(this, arguments); };\n'
  + '})();</script>\n</body>';

const TESTS = [
  /* 279 — 결함 CSS 를 **칸 수에 안 매이게** 다시 짰다. 원래 N1 은 `.stabs.sp3>...{left:calc(33.3333%+9px)}`,
     N2 는 `.stabs.sp2>.stab{width:calc(50% - 9px)}` 였는데, 209 가 03 던전에 «탑» 칸을 더해
     `.sp2` → `.sp3` 이 되자 **N2 의 선택자가 아무 데도 안 걸려** 조용히 초록이 됐다(19/20 FAIL 로 드러났다).
     되돌림 시험이 죽으면 게이트가 죽은 것보다 더 나쁘다 — «반증했다» 는 기록만 남는다.
     그래서 ⓐ 바를 **id** 로 집고 ⓑ 결함을 분할 비율과 무관한 값으로 준다:
       · 위치 — `margin-left`(절대 배치 자식은 left 위에 그대로 더해진다. % 리터럴이 안 필요하다)
       · 폭   — `transform:scaleX()`(rect 폭이 비율만큼 줄어든다. 바 자신은 안 건드리므로 스케일 s 는 1) */
  { id: 'N1', why: '재진입한 10 상점의 2번째 칸이 «바 안에서» +9px 밀린다 — 재진입 잔존 상태 버그 그 자체',
    from: TAIL, to: hook('openShopPage', '.neg221 #shopCats>.stab:nth-of-type(2){margin-left:9px}'),
    want: ['10 상점 재진입 — 칸 폭·바 안 위치 그대로'],
    not: ['03 던전 재진입 — 칸 폭·바 안 위치 그대로', '10 상점 재진입 — 바 폭·호스트 안 위치 그대로'] },

  { id: 'N2', why: '재진입한 03 던전 칸 «폭» 이 ≈9px 줄어든다 — 221 이 원래 «폭» 이라고 읽었던 증상',
    from: TAIL, to: hook('openDungeon', '.neg221 #dunSub>.stab{transform:scaleX(.965)}'),
    want: ['03 던전 재진입 — 칸 폭·바 안 위치 그대로'],
    not: ['10 상점 재진입 — 칸 폭·바 안 위치 그대로', '03 던전 재진입 — 바 폭·호스트 안 위치 그대로'] },

  /* 바를 «옮기되 폭은 그대로» — left 만 밀면 폭까지 9px 줄어 칸 단언도 같이 빨개진다(구분이 안 된다) */
  { id: 'N3', why: '재진입한 10 상점 «바 자체» 가 호스트 안에서 +9px 옮겨간다(폭은 그대로) — 바 기준 차분만 보면 놓치는 회귀',
    from: TAIL, to: hook('openShopPage', '.neg221 .shp-cats{left:54px;right:36px}'),
    want: ['10 상점 재진입 — 바 폭·호스트 안 위치 그대로'],
    not: ['10 상점 재진입 — 칸 폭·바 안 위치 그대로'] },

  /* 입장 연출의 끝 키프레임(scale:1)을 .985 로 바꾸는 것으로는 안 된다 — `jz-o jz-pg` 클래스가
     연출이 끝나면 제거돼서(index.html ~25716·25739) `both` 의 끝 상태가 남지 않는다.
     «연출이 끝났는데도 화면이 축소된 채» 를 만들려면 호스트에 스케일을 상시로 남겨야 한다. */
  { id: 'N4', why: '연출이 끝난 뒤에도 호스트가 scale .985 로 남는다 — «잰 프레임에 축소가 안 걸려 있다» 는 파수꾼이 빨개져야 한다',
    from: TAIL, to: '<style>#dunw,#shopw{scale:.985}</style>\n</body>',
    want: ['03 던전 재진입 — 입장 연출 종료 후 측정 (s = 1)', '10 상점 재진입 — 입장 연출 종료 후 측정 (s = 1)'],
    not: ['03 던전 재진입 — 칸 폭·바 안 위치 그대로', '10 상점 재진입 — 칸 폭·바 안 위치 그대로',
      '03 던전 재진입 — 바 폭·호스트 안 위치 그대로', '10 상점 재진입 — 바 폭·호스트 안 위치 그대로'] },

  /* 양성 대조 — 221 의 병(입장 연출 도중 측정)을 **10배로 키워도** 판정이 안 흔들려야 한다.
     고치기 전 게이트라면 여기서 [5] 위치 단언이 Δ8.2 로 빨개진다. */
  { id: 'N5', why: '입장 연출을 .12s → 1.2s 로 10배 늘린다 — settle 이 살아 있으면 전부 초록이어야 한다',
    from: PGCLS, to: PGCLS.replace('.12s', '1.2s'), want: [], green: true },
];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

const runGate = () => {
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'verify47.js')],
      { cwd: ROOT, env: Object.assign({}, process.env, { V47_SRC: TMP }), encoding: 'utf8' });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return out.split('\n').filter(l => /^\s*FAIL /.test(l)).map(l => l.trim().replace(/^FAIL /, ''));
};

(async () => {
  console.log('[0] 기준선 — 갈아 끼우지 않은 사본은 초록이어야 한다');
  fs.writeFileSync(TMP, SRC);
  const base = runGate();
  ok('사본 그대로 = FAIL 0건', base.length === 0, base.length ? base.slice(0, 3).join(' / ') : 'FAIL 0건');

  for (const t of TESTS) {
    console.log('\n[' + t.id + '] ' + t.why);
    if (SRC.indexOf(t.from) < 0) { ok(t.id + ' 갈아 끼울 자리를 찾았다', false, '문자열 없음 — index.html 이 바뀌었다'); continue; }
    ok(t.id + ' 갈아 끼울 자리를 찾았다', true, '1곳');
    fs.writeFileSync(TMP, SRC.replace(t.from, t.to));
    const fails = runGate();
    if (t.green) {
      ok(t.id + ' → FAIL 0건 (연출 길이에 판정이 안 흔들린다)', fails.length === 0,
        fails.length ? '빨간 항목 ' + fails.length + '개: ' + fails.slice(0, 3).join(' / ') : 'FAIL 0건');
    }
    t.want.forEach(w => ok(t.id + ' → 「' + w + '」 이(가) 빨개진다',
      fails.some(f => f.startsWith(w)), fails.length ? '빨간 항목 ' + fails.length + '개' : '전부 초록 — 단언이 안 잡는다'));
    (t.not || []).forEach(w => ok(t.id + ' → 「' + w + '」 은(는) 그대로 초록',
      !fails.some(f => f.startsWith(w)), '빨간 항목 ' + fails.length + '개'));
  }

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nNEG221 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
