/* 작업 732 게이트 — «`verify58` [7]·[8] 의 659·660 이관이 무르지 않다» 를 못박는 되돌림 시험.
 *
 * 732 는 제품을 **0줄** 고쳤다(`probe732` 12/12 가 갈래를 ⓐ 게이트 부패로 닫았다).
 * 고친 것은 `tools/verify58.js` 두 절이다:
 *   [7] 종전  «씬 C(훈련)에 델타 «+n» 플로터가 **난다**»  ← 659·660 이 없앤 것을 아직 찾았다
 *       지금  [7-a] 씬 C 는 났다(골드 지출) · [7-b] 훈련 «+n» **0장** · [7-c] 그 자리를
 *             재화 아이콘 버스트가 대신한다(≥3알 · gold)
 *   [8] 종전  씬 A·B·**C** 의 «+n» 글자 크기가 공용 토큰 하나
 *       지금  씬 A·B·**D** — 표본을 살아 있는 자리로 옮겼다
 *       ⚑ **844 재이관(2026-09-02)**: 732 가 고른 씬 D(50 코스튬 델타)는 그 뒤 520·814 가 마지막
 *         호출부를 걷어 **표본이 영영 안 잡히는 자리**가 됐다(`probe844` [1]·[2-c]). 씬 D 는 이제
 *         **08 세부 팝업 [강화] 의 회당 플로터**(`.fx-plus.hb` 결과 줄기)이고, [8-c](«인라인 0장») ·
 *         [8-d](«델타 계열 은퇴 파수꾼»)가 늘었다. 아래 §R-c·§R-e·§R-f 도 그 자리로 옮겼고
 *         §R-g·§R-h 를 새로 세웠다.
 *       ⚠ **이 자가 왜 이 수리에 걸렸나** — 844 착수 시점에 §R-c·§R-e 는 «초록» 이었지만 그것은
 *         [8-b] 가 주입 **전에도** 빨갛기 때문이었다(청정 §0 이 빨간 채 주입 축만 보면 헛초록이 난다).
 *         §0 이 그 사실을 정확히 찍고 있었다 — 되돌림 시험은 **청정 트리가 초록일 때만** 뜻이 있다.
 *
 * 이런 수리는 «초록으로 만들었을 뿐» 일 수 있으므로(334 규약 · 550 이 경계한 «무른 자»),
 * 여기서 **결함을 하나씩 주입한 index.html 사본**을 만들어 «그때 그 항이 실제로 빨개지는가» 를 묻는다.
 * 694 가 `verify694` 에서 같은 짝(`verify93` [7])에 세운 틀을 그대로 쓴다 — 사본은 저장소 루트에 둔다
 * (상대 경로 자산 404 방지 · 360·438·541 선례 · 이름에 pid 를 섞는다 = 646·648 처방).
 *
 * 축(각 주입 = 이관이 세운 항 하나를 겨눈다)
 *   §R-a  660 되돌림 — 훈련 첫 발이 다시 «+n» 을 띄운다        ⇒ [7-b] 빨강
 *   §R-b  버스트 폐지 — 아이콘 알갱이가 `.fx-cic` 를 안 단다   ⇒ [7-c] 빨강
 *   §R-c  연출 사망 — 회당 결과 줄기가 아예 안 뜬다           ⇒ [8-b] 빨강
 *   §R-d  씬 C 판정 무력화 — 훈련이 골드를 안 쓴다             ⇒ [7-a] 빨강
 *   §R-e  토큰 풀림 — 회당 플로터«만» 크기를 손으로 적는다     ⇒ [8-b] 빨강
 *   §R-f  씬 D 판정 무력화 — 08 강화가 안 일어난다             ⇒ [8-a] 빨강
 *   §R-g  같은 값을 손으로 적는다(34px 인라인)                 ⇒ [8-c] 빨강 ([8-b] 는 초록인 채로!)
 *   §R-h  델타 계열 부활 — 코스튬이 다시 텍스트를 넘긴다       ⇒ [8-d] 빨강
 *
 * ⚑ **§R-d·§R-f 가 이 이관의 핵심을 지킨다.** 그 둘이 없으면 «씬이 안 났다» 를 «폐지됐다» 로 읽는
 *   헛초록이 정확히 종전 실패문의 모양으로 되살아난다(694 §R-d 와 같은 자리).
 * ⚑ **§R-e·§R-g 는 [8] 이 왜 씬을 셋 유지해야 하는지**를 못박는다 — 491 2회차가 되돌린 488 의 사고
 *   («회당 플로터 자리에만 크기를 손으로 적었다»)를 그대로 재현한다. 씬 D 를 빼고 두 씬으로 줄였으면
 *   이 주입이 **안 잡힌다**(회당 계열이 자에서 통째로 빠지므로).
 *   ⚑ §R-g 는 한 겹 더 간다 — **값은 맞는데 손으로 적은** 경우다(488 이 실제로 그랬다). [8-b] 는
 *     초록인 채로 [8-c] 만 빨개져야 한다 = «같으면 됐다» 가 아니라 «토큰이 준 값이어야 한다».
 *
 * §0 은 청정 트리에서 일곱 항이 전부 초록임을 먼저 확인한다(주입 시험이 헛되지 않게).
 *
 * ⚠ 이 자는 verify58 을 자식 프로세스로 9번 돌린다 — 이십분 안팎 걸린다.
 * 실행: node tools/verify732.js   (한 축만: node tools/verify732.js --only R-a)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const TMP = `.v732-neg-${process.pid}.html`;   /* 648 — 이름에 pid(646 처방) */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* verify58 을 한 번 돌리고 «항 이름 → 통과 여부» 로 접는다 */
function runGate(srcRel) {
  const env = { ...process.env };
  if (srcRel) env.V58_SRC = srcRel; else delete env.V58_SRC;
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(__dirname, 'verify58.js')],
      { env, cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24, timeout: 600000 });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const axes = {};
  for (const ln of out.split('\n')) {
    const m = /^\s*([✓✗])\s+(.*)$/.exec(ln);
    if (!m) continue;
    const green = m[1] === '✓', txt = m[2];
    const tag = /\[(7-a|7-b|7-c|8-a|8-b|8-c|8-d)\]/.exec(txt);
    if (tag && axes[tag[1]] === undefined) axes[tag[1]] = { green, txt };
  }
  return { axes, out };
}

/* 주입 — 한 곳만 바꾼다. 앵커가 안 맞으면 «주입 실패» 로 빨갛게 만든다(조용한 통과 금지). */
const INJ = {
  /* 660 이 걷은 그 인자 하나를 되돌린다. 이 한 글자로 훈련 «+n» 이 되살아난다 —
     즉 [7-b] 는 «660 이 되돌아가면» 정확히 그 순간 빨개진다. */
  'R-a': ['[7-b]', "if(ok) fxUpOk(card, card, null, bi0.cur, true);",
                   "if(ok) fxUpOk(card, card, '+1', bi0.cur, true);"],
  /* 660 이 그 자리에 세운 부품(아이콘 버스트)이 사라지면 [7-c] 가 빨개져야 한다.
     ⚠ 이것이 없으면 [7-b] 는 «연출이 통째로 사라져도 초록» 인 음성항이 된다(488·583 교훈). */
  'R-b': ['[7-c]', "if(IC){ el.className = 'fx-spark fx-cic';",
                   "if(IC){ el.className = 'fx-spark';"],
  /* ⚑ 844 재이관 — 회당 결과 줄기(`+1`)가 아예 안 뜨면 씬 D 의 표본이 사라져 [8-b] 가 빨개져야 한다.
     («연출 없음» 도 이 자리에서 잡힌다 — [3]-(다) «연출 없음은 무조건 0점» 의 자 판이다.) */
  'R-c': ['[8-b]', "  if(txt)  hbFloat(host, txt, ok ? 'ok' : 'no', lone);",
                   "  if(false) hbFloat(host, txt, ok ? 'ok' : 'no', lone);"],
  /* 전제가 무르지 않다는 증명 — 훈련이 아무것도 안 사면 [7-b] 의 «0장» 은 뜻이 없다.
     그 세계에서 [7-a] 가 빨개져야 «씬이 안 났다» 를 «폐지됐다» 로 오독하지 않는다. */
  'R-d': ['[7-a]', "  const ok = trBuyOnce(key);", "  const ok = false && trBuyOnce(key);"],
  /* 토큰 축 — 491 2회차가 되돌린 488 의 사고를 그대로 재현한다(«이 자리에만 크기를 손으로»).
     [8] 이 지키는 것이 «크기를 자기 자리에 적지 않는다» 이므로 여기서 빨개져야 한다. */
  'R-e': ['[8-b]', "  d.className = 'fx-plus hb' + (kind === 'pay' ? ' dn' : '') + (lone ? ' lng' : '');",
                   "  d.className = 'fx-plus hb' + (kind === 'pay' ? ' dn' : '') + (lone ? ' lng' : ''); d.style.fontSize = '30px';"],
  /* 씬 D 의 전제 — 강화가 안 나면 «플로터 0장» 이 «연출이 죽었다» 와 구별되지 않는다.
     그 세계에서 [8-a] 가 빨개져야 [8-b] 의 표본 결손을 오독하지 않는다(§R-d 의 씬 D 판). */
  /* ⚠ 844 1회차 — 첫 시안은 `bindUpHold` 의 `if(!o.once())` 를 눌렀는데 **`o.once()` 자신은 그대로
     불려** 강화가 1회 나 [8-a] 가 초록이었다(주입이 «전제» 가 아니라 «반복» 만 껐다).
     판정 자체를 막는 자리는 `levelUp` 이다 — 여기서는 «한 번도 안 오른다» 가 돼야 뜻이 산다. */
  'R-f': ['[8-a]', "  if(!canLevel(it)) return false;",
                   "  if(!canLevel(it) || 1) return false;"],
  /* ⚑ 844 신설 — **값은 맞는데 손으로 적은** 경우. 488 이 실제로 그랬으므로(그 자리에 크기를 적었고
     한때 토큰과 값이 같았다) «같으면 됐다» 로는 그 사고가 안 잡힌다. [8-b] 는 초록인 채 [8-c] 만 빨강. */
  'R-g': ['[8-c]', "  d.className = 'fx-plus hb' + (kind === 'pay' ? ' dn' : '') + (lone ? ' lng' : '');",
                   "  d.className = 'fx-plus hb' + (kind === 'pay' ? ' dn' : '') + (lone ? ' lng' : ''); d.style.fontSize = '34px';"],
  /* ⚑ 844 신설 — 델타 계열이 되살아나면 [8] 은 표본을 한 자리 더 가져야 한다. 그 신호가 [8-d] 다
     (520·814 를 되돌리는 한 줄 = 코스튬 격자가 다시 텍스트를 넘긴다). */
  'R-h': ['[8-d]', "      fxUpOk(card, card);",
                   "      fxUpOk(card, card, 'Lv. 1');"],
};
const WANT = { 'R-a': '7-b', 'R-b': '7-c', 'R-c': '8-b', 'R-d': '7-a', 'R-e': '8-b', 'R-f': '8-a',
               'R-g': '8-c', 'R-h': '8-d' };

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

(async () => {
  console.log('VERIFY732 — verify58 [7]·[8] 의 659·660 이관 되돌림 시험 (주입 사본으로 «빨개지는가» 를 묻는다)\n');
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[§0] 청정 트리 — 다섯 항이 전부 초록이어야 주입 시험이 뜻을 가진다');
  const base = runGate(null);
  for (const k of ['7-a', '7-b', '7-c', '8-a', '8-b', '8-c', '8-d']) {
    ok(base.axes[k] && base.axes[k].green,
      `[§0] ${k} 초록 — ${base.axes[k] ? base.axes[k].txt.slice(0, 74) : '축을 못 찾았다'}`);
  }

  for (const key of Object.keys(INJ)) {
    if (only && only !== key) continue;
    const [label, from, to] = INJ[key];
    console.log(`\n[§${key}] 주입 — ${label} 이 빨개져야 한다`);
    if (src.indexOf(from) < 0) { ok(false, `[§${key}] 앵커를 못 찾았다 — 주입 실패(소스가 바뀌었다): ${from.slice(0, 60)}`); continue; }
    if (src.split(from).length - 1 !== 1) { ok(false, `[§${key}] 앵커가 ${src.split(from).length - 1}곳 — 한 곳이어야 한다`); continue; }
    fs.writeFileSync(path.join(ROOT, TMP), src.replace(from, to));
    try {
      const r = runGate(TMP);
      const want = WANT[key];
      const a = r.axes[want];
      ok(a && !a.green, `[§${key}] ${want} 빨강 — ${a ? a.txt.slice(0, 74) : '축을 못 찾았다(자가 즉사했다면 그것도 결함)'}`);
    } finally { try { fs.unlinkSync(path.join(ROOT, TMP)); } catch (e) {} }
  }

  console.log(`\nVERIFY732 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
