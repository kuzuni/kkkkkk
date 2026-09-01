/* 작업 694 게이트 — «`verify93` [7] 의 660 이관이 무르지 않다» 를 못박는 되돌림 시험.
 *
 * 694 는 제품을 **0줄** 고쳤다. 고친 것은 `verify93.js` [7] 한 절이다:
 *   종전  «씬 C(훈련) 델타가 훈련 카드기준 y275~396 회랑 안에 선다»
 *   지금  [7-a] 씬 C 는 났다(지출) · [7-b] 훈련 델타 **0장** · [7-c] 그 자리는 아이콘 버스트가
 *         대신한다 · [7-d~f] 부품 `fxDelta` 는 살아 있다(50 코스튬에서 뜨고 봉투 안에 선다)
 * 이런 수리는 «초록으로 만들었을 뿐» 일 수 있으므로(550 이 경계한 «무른 자» · 334 «되돌림 시험»),
 * 여기서 **결함을 하나씩 주입한 index.html 사본**을 만들어 «그때 그 항이 실제로 빨개지는가» 를 묻는다.
 * 570 이 같은 자(`verify93`)에 대해 세운 틀을 그대로 쓴다 — 사본은 저장소 루트에 둔다
 * (상대 경로 자산 404 방지 · 360·438·541 선례 · 이름에 pid 를 섞는다 = 646·648 처방).
 *
 * 축(각 주입 = 이관이 세운 항 하나를 겨눈다)
 *   §R-a  660 되돌림 — 훈련 첫 발이 다시 «+n» 을 띄운다      ⇒ [7-b] 빨강
 *   §R-b  버스트 폐지 — 아이콘 알갱이가 `.fx-cic` 를 안 단다 ⇒ [7-c] 빨강
 *   §R-c  부품 사망 — `fxDelta` 가 아무것도 안 만든다        ⇒ [7-d] 빨강
 *   §R-d  판정 무력화 — 훈련이 골드를 안 쓴다               ⇒ [7-a] 빨강(«씬이 안 났다» 를 초록으로 안 읽는다)
 *   §R-e  자리 이탈 — 버스트를 누른 카드가 아니라 HUD 에서 터뜨린다 ⇒ [7-c2] 빨강(702 가 지킨 «위치 축»)
 * §0 은 청정 트리에서 [7] 여섯 줄이 전부 초록임을 먼저 확인한다(주입 시험이 헛되지 않게).
 *
 * ⚠ 이 자는 verify93 을 자식 프로세스로 6번 돌린다 — 몇 분 걸린다.
 * 실행: node tools/verify694.js   (한 축만: node tools/verify694.js --only R-a)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const TMP = `.v694-neg-${process.pid}.html`;   /* 648 — 이름에 pid(646 처방) */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* verify93 을 한 번 돌리고 «[7] 의 항 이름 → 통과 여부» 로 접는다 */
function runGate(srcRel) {
  const env = { ...process.env };
  if (srcRel) env.V93_SRC = srcRel; else delete env.V93_SRC;
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(__dirname, 'verify93.js')],
      { env, cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24, timeout: 300000 });
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  const axes = {};
  for (const ln of out.split('\n')) {
    const m = /^\s*([✓✗])\s+(.*)$/.exec(ln);
    if (!m) continue;
    const green = m[1] === '✓', txt = m[2];
    const tag = /\[(7-a|7-b|7-c2|7-c|7-d 전제|7-d|7-e|7-f)\]/.exec(txt);
    if (tag && axes[tag[1]] === undefined) axes[tag[1]] = { green, txt };
  }
  return { axes, out };
}

/* 주입 — 한 곳만 바꾼다. 앵커가 안 맞으면 «주입 실패» 로 빨갛게 만든다(조용한 통과 금지). */
const INJ = {
  /* 660 이 걷은 그 인자 하나를 되돌린다. 이 한 글자로 훈련 델타가 되살아난다 —
     즉 [7-b] 는 «660 이 되돌아가면» 정확히 그 순간 빨개진다. */
  'R-a': ['[7-b]', "if(ok) fxUpOk(card, card, null, bi0.cur, true);",
                   "if(ok) fxUpOk(card, card, '+1', bi0.cur, true);"],
  /* 660 이 그 자리에 세운 부품(아이콘 버스트)이 사라지면 [7-c] 가 빨개져야 한다.
     ⚠ 이것이 없으면 [7-b] 는 «연출이 통째로 사라져도 초록» 인 음성항이 된다(488·583 교훈). */
  'R-b': ['[7-c]', "if(IC){ el.className = 'fx-spark fx-cic';",
                   "if(IC){ el.className = 'fx-spark';"],
  /* 부품 `fxDelta` 자체가 죽으면 살아 있는 계열(50 코스튬)의 양성항이 빨개져야 한다. */
  'R-c': ['[7-d]', "function fxDelta(el, txt){\n  const L = fxL(), r = fxRect(el); if(!L || !r || !txt) return;",
                   "function fxDelta(el, txt){\n  if(1) return;\n  const L = fxL(), r = fxRect(el); if(!L || !r || !txt) return;"],
  /* 전제가 무르지 않다는 증명 — 훈련이 아무것도 안 사면 [7-b] 의 «0장» 은 뜻이 없다.
     그 세계에서 [7-a] 가 빨개져야 «씬이 안 났다» 를 «폐지됐다» 로 오독하지 않는다. */
  'R-d': ['[7-a]', "  const ok = trBuyOnce(key);", "  const ok = false && trBuyOnce(key);"],
  /* 자리 축 — 660 의 «스폰 위치는 강화 버튼뿐» 이 깨지면 [7-c2] 가 빨개져야 한다.
     개수(§R-b)만 지키면 «아무 데서나 터져도 초록» 이라 702 가 요구한 위치 축이 안 산다.
     ⚠ 1회차에는 `fxBurst` 안에서 **호스트 상자만** 300px 옆으로 밀었는데 [7-c2] 가 **안 빨개졌다** —
        중심은 `p = fxPt(t)` 로 따로 오고 상자는 «가둠»(bx0..bx1)일 뿐이라, 밀린 상자와 원래 카드가
        아직 겹쳐 입자가 그 겹침 구간에 눌러앉았다. 자리를 묻는 주입은 **발원 자체**를 옮겨야 한다. */
  'R-e': ['[7-c2]', "  if(typeof fxBurst === 'function') fxBurst(fxBurstAt(el), FXPAL.up, cnt, true, null, cur || null);",
                    "  if(typeof fxBurst === 'function') fxBurst(document.getElementById('top') || fxBurstAt(el), FXPAL.up, cnt, true, null, cur || null);"],
};
const WANT = { 'R-a': '7-b', 'R-b': '7-c', 'R-c': '7-d', 'R-d': '7-a', 'R-e': '7-c2' };

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

(async () => {
  console.log('VERIFY694 — verify93 [7] 660 이관의 되돌림 시험 (주입 사본으로 «빨개지는가» 를 묻는다)\n');
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[§0] 청정 트리 — [7] 여섯 줄이 전부 초록이어야 주입 시험이 뜻을 가진다');
  const base = runGate(null);
  for (const k of ['7-a', '7-b', '7-c', '7-c2', '7-d 전제', '7-d', '7-e', '7-f']) {
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

  console.log(`\nVERIFY694 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
