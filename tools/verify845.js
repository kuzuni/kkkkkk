/* 작업 845 게이트 — «`verify58` [19] 를 문턱에서 뗀 수리가 무르지 않다» 를 못박는 자.
 *
 * 845 는 제품을 **0줄** 고쳤다. 고친 것은 `tools/verify58.js` 의 [19] 한 절이다.
 *   종전  봉우리·바닥 = **표본**의 max/min · 문턱 통과 시각 = «넘은 **첫 표본**» 의 t
 *         ⇒ 값의 오차가 통째로 «표본 간격» 이다. 공용 `tick` 은 표본마다 selector 를 수십 개 돌아
 *           러너에 부하가 실리면 실측 간격이 지시 8ms 에도 50~80ms 로 벌어지고(표본 21~49장),
 *           같은 빌드가 **73 · 84 · 85 · 103 · 104 · 137 · 141 · 143 · 149 · 165 · 172 · 173ms** 로 널뛰어
 *           7회 중 1회가 문턱 90 아래로 내려갔다(845 등재 · 본 세션이 동시 4실행으로 84·85 재현).
 *   지금  ⓐ 문턱 통과 시각을 **앞뒤 두 표본 사이 선형 보간**으로 잡는다
 *         ⓑ 봉우리·정지폭·기대 구간을 표본이 아니라 **선언**(`@keyframes fxPunch` — CSSOM)에서 읽는다
 *         ⓒ 폭 한 줄만 읽는 **rAF 기록기**(`pillRec`)를 따로 돌려 보간이 쓸 두 점을 좁힌다
 *         ⇒ 문턱은 `max(105, 기대 실효 구간의 70%)` = **107.5ms 로 종전(90)보다 엄하다**
 *           (절대 하한 105 = 37회차 처방 «복귀 구간 180ms» 의 실효 몫 137ms 의 3/4 —
 *            종전 90 은 **옛 눈금**의 값이라 그대로 두면 §R-a 가 문턱에 딱 붙는다).
 *
 * ⚠ 이런 수리는 «초록으로 만들었을 뿐» 일 수 있으므로(334 규약 · 550 이 경계한 «무른 자»),
 *   여기서 **결함을 하나씩 주입한 index.html 사본**을 만들어 «그때 그 항이 실제로 빨개지는가» 를 묻는다.
 *   틀은 `verify732`(같은 짝 `verify58`)를 그대로 쓴다 — 사본은 저장소 루트에 두고(상대 경로 자산
 *   404 방지 · 360·438·541 선례) 이름에 pid 를 섞는다(646·648 처방).
 *
 * 축
 *   §0    청정 트리에서 [19-a]·[19-b] 가 초록                        (주입 시험의 전제 — 732 §0 교훈)
 *   §R-a  39회차 **이전** 빌드 재현(고원 60% + 전 구간 ease-out)     ⇒ [19-a] 빨강
 *   §R-b  복귀를 한 프레임으로(90% 키프레임을 44% 로 당긴다)         ⇒ [19-a] 빨강
 *   §R-c  기록기 결손(`.cGold` → `.cGoldX`)                          ⇒ [19-a] 빨강 «잴 대상이 없다»
 *   §R-d  선언 결손(`@keyframes fxPunch` 개명)                       ⇒ [19-a] 빨강 «CSSOM 에서 못 읽었다»
 *   §S    **안정성** — 845 를 낳은 그 부하(동시 4실행)에서 산포·최솟값
 *
 * ⚑ **§R-a 가 이 수리의 절대 하한을 지킨다.** 주입본은 «선언» 도 같이 나빠지므로 상대 문턱
 *   (기대의 70%)만 있으면 문턱도 같이 내려가 **헛초록**이 된다(기대 96ms → 상대 문턱 67ms).
 *   절대 하한을 남긴 이유가 이것이고, §R-a 가 그 자리를 못박는다.
 *   ⚑ **§R-a 는 새 자가 옳다는 증거이기도 하다** — 39회차 주석이 그 빌드를 «복귀 구간 101ms
 *     (실효 **93ms**)» 라고 자기 손으로 적어 두었는데, 새 자가 그 사본을 **78~94ms** 로 읽는다.
 *     같은 빌드를 옛 자는 **34ms** 로 읽었다. 실측 산포가 있으니 문턱 105 와의 여유는 11ms 다 —
 *     이 축이 초록(= 안 빨개짐)으로 뒤집히면 문턱이 아니라 **자를 먼저 의심하라**.
 * ⚑ **§R-c·§R-d 는 «못 쟀다» 가 «괜찮다» 로 읽히지 않게 한다** — 종전 자는 표본이 없으면 span 0 을
 *   그냥 빨강으로 냈지만, 새 자는 기록기·선언 두 갈래가 늘었으므로 각각 빨개지는지 물어야 한다
 *   (333 «자리를 비우지 마라» · 694 §R-d 가 세운 «전제항» 과 같은 뜻).
 * ⚑ **§S 가 이 작업의 본체다** — 나머지는 «자가 여전히 결함을 잡는가» 이고, 845 가 등재된 이유는
 *   «같은 빌드가 실행마다 다른 답을 낸다» 였다. 옛 자의 산포도 같은 실행에서 나란히 찍는다
 *   (`verify58` 이 [19-참고] 로 한 줄 남긴다).
 *
 * ⚠ 이 자는 verify58 을 8번(§0 1 + §R 4 + §S 4 동시) 돌린다 — 5~10분 걸린다.
 * 실행: node tools/verify845.js        (한 축만: node tools/verify845.js --only R-a · 안정성만: --only S)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const GATE = path.join(__dirname, 'verify58.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* verify58 출력에서 [19] 계열만 접는다. «자가 즉사했다» 도 축이 안 잡히는 것으로 드러난다. */
function fold(out) {
  const axes = {};
  let span = null, old = null;
  for (const ln of out.split('\n')) {
    const m = /^\s*([✓✗])\s+(.*)$/.exec(ln);
    if (m) {
      const tag = /\[(19-a|19-b)\]/.exec(m[2]);
      if (tag && axes[tag[1]] === undefined) axes[tag[1]] = { green: m[1] === '✓', txt: m[2] };
      const s = /복귀 실효 구간 (\d+(?:\.\d+)?)ms/.exec(m[2]);
      if (s && span === null) span = parseFloat(s[1]);
      continue;
    }
    const o = /\[19-참고\].*?(\d+(?:\.\d+)?)ms/.exec(ln);
    if (o && old === null) old = parseFloat(o[1]);
  }
  return { axes, span, old, out };
}

function runGate(srcRel) {
  const env = { ...process.env };
  if (srcRel) env.V58_SRC = srcRel; else delete env.V58_SRC;
  let out = '';
  try {
    out = execFileSync(process.execPath, [GATE],
      { env, cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24, timeout: 900000 });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  return fold(out);
}

/* §S — 같은 자를 **동시에** 돌린다. 845 를 낳은 부하가 바로 이것이다(순차 실행에서는 안 재현된다). */
function runGateAsync() {
  return new Promise((res) => {
    const env = { ...process.env }; delete env.V58_SRC;
    execFile(process.execPath, [GATE], { env, cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24, timeout: 900000 },
      (e, so, se) => res(fold((so || '') + (se || ''))));
  });
}

/* 주입 — 한 곳만 바꾼다. 앵커가 안 맞으면 «주입 실패» 로 빨갛게 만든다(조용한 통과 금지). */
const KF42 = "    42%{transform:scale(1.13);outline:4px solid rgba(255,255,255,.45);animation-timing-function:cubic-bezier(.3,.05,.7,.95)}";
const KF90 = "    90%{transform:scale(.985);outline:3px solid rgba(255,255,255,0);animation-timing-function:ease-out}";
const INJ = {
  /* 39회차가 고치기 **전** 의 빌드다 — 그 주석이 «같은 자로 34ms(두 번 연속 34·34)» 라고 적어 둔 값.
     고원을 60% 까지 밀고 복귀 구간의 «거의 선형» 타이밍 함수를 걷으면 ease-out 의 앞쏠림이 돌아온다. */
  'R-a': [[KF42, "    60%{transform:scale(1.13);outline:4px solid rgba(255,255,255,.45)}"],
          [KF90, "    90%{transform:scale(.985);outline:3px solid rgba(255,255,255,0)}"]],
  /* 37차 Z·AA 가 캡처에서 본 그 그림 — «고원 뒤 한 프레임 스냅». 복귀 구간을 420×2% = 8ms 로 접는다. */
  'R-b': [[KF90, "    44%{transform:scale(.985);outline:3px solid rgba(255,255,255,0);animation-timing-function:ease-out}"]],
  /* 기록기가 대상을 못 찾으면 «복귀가 길다» 가 아니라 «못 쟀다» 여야 한다(헛초록 금지). */
  'R-c': [['<div class="cbox cGold" data-cur="gold">', '<div class="cbox cGoldX" data-cur="gold">']],
  /* 선언이 개명되면 봉우리·기대 구간을 «자기 사본» 으로 채우지 말고 빨개져야 한다(211·289). */
  'R-d': [["  @keyframes fxPunch{0%{transform:scale(1);outline:3px solid rgba(255,255,255,0)}",
           "  @keyframes fxPunchZ{0%{transform:scale(1);outline:3px solid rgba(255,255,255,0)}"],
          ["  .fx-punch{animation:fxPunch .42s ease-out both}",
           "  .fx-punch{animation:fxPunchZ .42s ease-out both}"]],
};

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const TMP = `.v845-neg-${process.pid}.html`;

(async () => {
  console.log('VERIFY845 — verify58 [19] 문턱 이탈 수리의 되돌림 시험 + 안정성\n');
  const src = fs.readFileSync(SRC, 'utf8');

  if (!only || only === '0' || only.startsWith('R')) {
    console.log('[§0] 청정 트리 — 두 항이 초록이어야 주입 시험이 뜻을 가진다 (732 §0 교훈)');
    const base = runGate(null);
    for (const k of ['19-a', '19-b']) {
      ok(base.axes[k] && base.axes[k].green,
        `[§0] ${k} 초록 — ${base.axes[k] ? base.axes[k].txt.slice(0, 96) : '축을 못 찾았다'}`);
    }
  }

  for (const key of Object.keys(INJ)) {
    if (only && only !== key) continue;
    console.log(`\n[§${key}] 주입 — [19-a] 가 빨개져야 한다`);
    let bad = false, txt = src;
    for (const [from, to] of INJ[key]) {
      const n = txt.split(from).length - 1;
      if (n !== 1) { ok(false, `[§${key}] 앵커가 ${n}곳 — 한 곳이어야 한다(소스가 바뀌었다): ${from.slice(0, 56)}`); bad = true; break; }
      txt = txt.replace(from, to);
    }
    if (bad) continue;
    fs.writeFileSync(path.join(ROOT, TMP), txt);
    try {
      const r = runGate(TMP);
      const a = r.axes['19-a'];
      ok(a && !a.green, `[§${key}] 19-a 빨강 — ${a ? a.txt.slice(0, 96) : '축을 못 찾았다(자가 즉사했다면 그것도 결함)'}`);
    } finally { try { fs.unlinkSync(path.join(ROOT, TMP)); } catch (e) {} }
  }

  if (!only || only === 'S') {
    console.log('\n[§S] 안정성 — 845 를 낳은 부하(동시 4실행)에서 같은 빌드가 같은 답을 내는가');
    const rs = await Promise.all([runGateAsync(), runGateAsync(), runGateAsync(), runGateAsync()]);
    const ns = rs.map((r) => r.span).filter((v) => typeof v === 'number');
    const os = rs.map((r) => r.old).filter((v) => typeof v === 'number');
    const spread = (a) => (a.length ? Math.max(...a) - Math.min(...a) : null);
    ok(ns.length === 4, `[§S] 네 실행 모두 값을 냈다 — ${ns.length}/4 (${ns.join(' · ')}ms)`);
    /* 문턱을 다시 적지 않는다 — verify58 자신이 «≥lim» 을 판정하므로 그 초록을 그대로 읽는다.
       (여기서 90 이나 108 을 손으로 적으면 문턱이 두 곳에 살아 갈라진다 — 211·289 와 같은 병) */
    ok(rs.every((r) => r.axes['19-a'] && r.axes['19-a'].green),
      `[§S] 네 실행 모두 [19-a] 초록 — ${rs.map((r) => (r.axes['19-a'] && r.axes['19-a'].green) ? '✓' : '✗').join('')}`);
    /* 산포 상한 30ms — 눈대중이 아니라 **선언 기대 구간(153.6ms)의 20%** 다. 옛 자의 산포는
       같은 부하에서 89ms(84~173) 였다. 실측은 8~9ms 로 이 상한의 1/3 이다. */
    const sp = spread(ns);
    ok(sp !== null && sp <= 30, `[§S] 새 자 산포 ${sp === null ? 'n/a' : sp.toFixed(0)}ms (≤30 = 기대 154ms 의 20%) `
      + `· 값 ${ns.map((v) => v.toFixed(0)).join(' · ')}`);
    console.log(`  · [§S-참고] 같은 네 실행의 **옛 자**(tick 격자 · 첫 표본) 산포 `
      + `${spread(os) === null ? 'n/a' : spread(os).toFixed(0)}ms · 값 ${os.join(' · ')} — 문턱 아님`);
  }

  console.log(`\nVERIFY845 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
