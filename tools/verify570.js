/* 작업 570 게이트 — «`verify93` 의 새 타이밍 축이 무르지 않다» 를 못박는 되돌림 시험.
 *
 * 570 은 `verify93.js` [3]·[4] 를 «벽시계 표본» 에서 **제품 자신의 신호**로 갈아 끼웠다.
 * 그런 수리는 «초록으로 만들었을 뿐» 일 수 있으므로(550 이 경계한 «무른 자»), 여기서
 * **결함을 하나씩 주입한 index.html 사본**을 만들어 «그때 그 축이 실제로 빨개지는가» 를 묻는다.
 * 556 의 `--inject` 와 같은 길이고, 사본은 저장소 루트에 둔다(상대 경로 자산 404 방지 — 360 선례).
 *
 * 축(각 주입 = 새 축 하나를 겨눈다)
 *   §R-a  FX3_PZ_HIT 0.24 → 0.02   ⇒ [4-a] 선언(진폭이 FX3_PZ_MAX 에 못 미친다) 빨강
 *   §R-b  fxPzTick 이 scale(1) 만 쓴다 ⇒ [4-b] 그림 = 선언 빨강
 *   §R-c  FX3_PZ_HOLD 0.05 → 0.01  ⇒ [4-c] 고원 < 60fps 한 프레임 빨강
 *   §R-d  비트 병합 창 110 → 900ms ⇒ [4-d] 듀티(선언) 빨강
 *   §R-e  흡수 국면에 하강 성분 주입 ⇒ [3] 역행 빨강
 *   §R-f  흡수 개시 ha = 99s        ⇒ [3-전제] (흡수 국면 아이콘 0종) 빨강
 * 그리고 §0 은 **청정 트리에서 그 여섯 줄이 전부 초록**임을 먼저 확인한다(주입 시험이 헛되지 않게).
 *
 * ⚠ 이 자는 verify93 을 자식 프로세스로 7번 돌린다 — 몇 분 걸린다.
 * 실행: node tools/verify570.js   (한 축만: node tools/verify570.js --only R-b)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const TMP = `.v570-neg-${process.pid}.html`;   /* 648 — 이름에 pid(646 처방) */
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* verify93 을 한 번 돌리고 «축 이름 → 통과 여부» 로 접는다 */
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
    const tag = /\[(3-전제|4-a|4-b|4-c|4-d 전제|4-d|4-e)\]/.exec(txt);
    const key = tag ? tag[1] : (/^역행 /.test(txt) ? '3' : null);
    if (key && axes[key] === undefined) axes[key] = { green, txt };
  }
  return { axes, out };
}

/* 주입 — 한 곳만 바꾼다. 앵커가 안 맞으면 «주입 실패» 로 빨갛게 만든다(조용한 통과 금지). */
const INJ = {
  'R-a': ['[4-a]', 'const FX3_PZ_HIT = 0.24,', 'const FX3_PZ_HIT = 0.02,'],
  'R-b': ['[4-b]', "    el.style.transform = 'scale(' + (1 + a).toFixed(4) + ')';",
                   "    el.style.transform = 'scale(1.0000)';"],
  'R-c': ['[4-c]', 'FX3_PZ_TAU = 0.045, FX3_PZ_HOLD = 0.05;', 'FX3_PZ_TAU = 0.045, FX3_PZ_HOLD = 0.01;'],
  'R-d': ['[4-d]', 'now - el.__fxBeatT < 110', 'now - el.__fxBeatT < 900'],
  'R-e': ['[3]', "      f.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'\n        + ' translate(-50%,-50%) rotate(' + rot.toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')';",
                 "      if(f.t > f.ha) y += (f.t - f.ha)*260;\n      f.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'\n        + ' translate(-50%,-50%) rotate(' + rot.toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')';"],
  'R-f': ['[3-전제]', '      const ha = sd + FX3_HOLD_F;', '      const ha = 99;'],
};
/* 어떤 축이 빨개져야 하는가 */
const WANT = { 'R-a': '4-a', 'R-b': '4-b', 'R-c': '4-c', 'R-d': '4-d', 'R-e': '3', 'R-f': '3-전제' };

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

(async () => {
  console.log('VERIFY570 — verify93 새 축의 되돌림 시험 (주입 사본으로 «빨개지는가» 를 묻는다)\n');
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('[§0] 청정 트리 — 새 축이 전부 초록이어야 주입 시험이 뜻을 가진다');
  const base = runGate(null);
  for (const k of ['3-전제', '3', '4-a', '4-b', '4-c', '4-d 전제', '4-d']) {
    ok(base.axes[k] && base.axes[k].green, `[§0] ${k} 초록 — ${base.axes[k] ? base.axes[k].txt.slice(0, 78) : '축을 못 찾았다'}`);
  }
  /* [4-e] 는 «이 기기의 프레임이 고원보다 촘촘했나» 에 달렸다 — 초록/등급불가 둘 다 정상이고
     빨강만 결함이다. 그래서 §0 은 «빨갛지 않다» 만 묻는다. */
  ok(base.axes['4-e'] && base.axes['4-e'].green, `[§0] 4-e 빨갛지 않다 — ${base.axes['4-e'] ? base.axes['4-e'].txt.slice(0, 78) : '축을 못 찾았다'}`);

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
      ok(a && !a.green, `[§${key}] ${want} 빨강 — ${a ? a.txt.slice(0, 78) : '축을 못 찾았다(자가 즉사했다면 그것도 결함)'}`);
    } finally { try { fs.unlinkSync(path.join(ROOT, TMP)); } catch (e) {} }
  }

  console.log(`\nVERIFY570 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
