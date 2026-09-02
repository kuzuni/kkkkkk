#!/usr/bin/env node
/* 784 재현 — `probe680` [2] 의 `K회 폭 < 0.25` 가 왜 실행마다 갈렸는가 (T1 «버그(게이트 플레이키)»)
 *
 *   node tools/probe784.js [--reps N]      (기본 N = 8 · 한 회 ≈ 2초 — poison 한 종만 잰다)
 *
 * ⚑ **«몇 번에 한 번 빨간가» 를 세지 않는다** — 그렇게 적으면 물음 자신이 플레이키다
 *   (766-④ · 775-④ · 779-②). 대신 **확률을 확정으로 바꾸는 손잡이** 둘을 찍는다:
 *   [1] 옛 첫 축(`spread` = K회 폭)은 **선언을 아예 안 본다** — 같은 표본에서 선언만 구름
 *       한복판으로 옮겨도 값이 Δ0 이다. 축이 안 보는 것을 그 항의 이름이 지고 있었다.
 *   [2] 그러면서 **잡음이 커지면 빨개진다** — 783 이 값째 남긴 그 실행의 여섯 표본을 그대로
 *       넣으면 옛 항은 빨강, 새 항은 초록이다(합성 강짜가 아니라 **실측된 같은 제품의 표본**).
 *   둘을 합치면 «판이 시끄러운 실행마다 반드시 빨갛다» 가 확률 없이 나온다.
 *
 *   [0] 소스 — `probe680.js` [2] 에 손 문턱 둘이 안 남아 있고 `rul504.shakeSep` 를 부른다(779-③)
 *   [1] 재현 ⓐ — 옛 축은 선언을 안 본다(선언을 구름 한복판으로 옮겨도 Δ0 · 새 축은 뒤집힌다)
 *   [2] 재현 ⓑ — 783 이 남긴 그 실행: 옛 항 빨강 · 새 항 초록
 *   [3] 처방 ⓐ(«`nearOff` > 밴드») 기각 — 소스 단언(돌아오면 빨강) + 값 관측(그 기각의 근거 · 778-③)
 *   [4] 새 판정 — 같은 제품을 R회 재서 전부 초록, 여유가 몇 배인가
 *   [5] 되돌림 — 새 판정이 «다 통과» 가 아니다(구름 안 · 폭 이내 · 폭 0 · 실제 poison)
 *
 * ⚠ **문턱은 한 칸도 안 건드린다** — `TOL_FLOOR` 0.40 · `K` 6 · `HOLD199`/`HOLD695` 표 전부 불변.
 *   새 판정의 단위 `SHAKE_UNIT` 은 «폭 한 벌» 이라는 물음의 뜻 자체이지 분포에서 뽑은 문턱이 아니다.
 */
const path = require('path');
const fs = require('fs');
const RUL = require('./rul504');

const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const { K, SEC, POP } = RUL;
const ai = process.argv.indexOf('--reps');
/* ⚠ 하한 6 — [4] 는 R회 **전부**에 물리고 [3-b] 의 값은 갈림이 보일 만큼 돌아야 뜻이 있다.
   3~4회로 줄이면 관측이 그 실행의 운을 그대로 베낀다. 8회 ≈ 16초라 줄일 이유도 없다. */
const REPS = ai > 0 ? Math.max(6, +process.argv[ai + 1] || 8) : 8;

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const pc = (x) => (x * 100).toFixed(1) + '%';
const xf = (r) => r === Infinity ? '∞' : r.toFixed(2);

/* 옛 [2] 의 판정 — **수리 전 `probe680` 에 있던 그대로**다. 이 프로브의 유일한 사본이고,
   [0] 이 «제품 쪽(probe680)에는 이 꼴이 남아 있지 않다» 를 소스로 확인해 사본이 둘이 되는 것을 막는다. */
const oldNarrow = (x) => x.spread < 0.25;                                   /* 첫 항 — 선언을 안 보는 축 */
const oldNotShake = (x) => oldNarrow(x)
  && (RUL.offOf(x.mean, x.decl) - RUL.tolOf(x.spread, K)) > 0.02;           /* 옛 항 전체 */

/* 표본 여섯에서 한 행을 만든다 — `RUL.measure` 가 돌려주는 것과 **같은 모양**이라야 판정 함수가
   실측 행과 합성 행을 구별하지 못한다(구별하면 되돌림 시험의 뜻이 사라진다). */
const rowOf = (id, decl, each) => {
  const mean = each.reduce((a, b) => a + b, 0) / each.length;
  return { id, cd: 1.6, decl, mean: +mean.toFixed(3), each: each.slice(),
           spread: mean ? +(((Math.max(...each) - Math.min(...each)) / mean).toFixed(3)) : 0 };
};
/* 783 이 §7 에 값째 남긴 **그 빨간 실행**(수리 후 10회 중 1회) — 낮은 표본 하나가 폭을 28% 로 넓혔다.
   합성 강짜가 아니라 같은 제품·같은 눈금의 실측 표본이라는 것이 이 항의 힘이다. */
const RED783 = rowOf('poison', 29.36, [12.38, 16.63, 14.38, 16.38, 16.38, 16.63]);

(async () => {
  /* ── [0] 소스 쪽 되돌림(779-③) ─────────────────────────────
     «값이 다시 깨지는가» 만 물으면 다음 세션이 손 문턱을 도로 적어 넣어도 조용하다.
     주석은 걷어 내고 **코드만** 본다 — 이 저장소의 기록은 옛 꼴을 인용해 두기 때문이다. */
  const src = fs.readFileSync(path.join(__dirname, 'probe680.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const handNarrow = /\.spread\s*<\s*0?\.25\b/.test(code);
  const handCushion = /off\s*-\s*\w*\.?tol\s*\)?\s*>\s*0?\.02\b/.test(code);
  ok(!handNarrow && !handCushion,
     '0-a `probe680` [2] 가 손 문턱 둘(K회 폭 < 0.25 · 이탈−허용 > 0.02)로 다시 판정하지 않는다',
     (handNarrow ? '폭 문턱이 코드에 남아 있다 ' : '') + (handCushion ? '0.02 방석이 남아 있다' : '')
     || '코드 0건(주석 인용은 제외하고 셌다)');
  ok(/RUL\.shakeSep\(/.test(code) && typeof RUL.shakeSep === 'function' && RUL.SHAKE_UNIT === 1,
     '0-b 판정이 `rul504` 한 곳에 있고 프로브가 그것을 부른다(판정 사본 0개 — 402·508·553·620)',
     '`RUL.shakeSep(` 호출 있음 · 단위 ' + RUL.SHAKE_UNIT);
  ok(RUL.TOL_FLOOR === 0.40 && RUL.K === 6 && typeof RUL.nearOff === 'function',
     '0-c 문턱·반복 수는 한 칸도 안 건드렸다(값을 밴드에 맞추는 짓 금지 — 680 등재문) · 783 의 `nearOff` 도 그대로 산다',
     'TOL_FLOOR=' + RUL.TOL_FLOOR + ' · K=' + RUL.K);

  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const errs = [];
  const runs = [];
  for (let r = 0; r < REPS; r++) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(URL);
    await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof skillHits === 'function'
      && typeof step === 'function');
    await page.waitForTimeout(500);
    const C = await RUL.measure(page, ['poison'], { K, SEC, POP });
    runs.push(C[0]);
    await ctx.close();
  }
  await browser.close();

  runs.forEach((x, i) => {
    const s = RUL.shakeSep(x);
    console.log('     [' + (i + 1) + '회] 값 ' + x.each.join('/') + ' · K회 폭 ' + pc(x.spread)
      + ' · 근접이탈 ' + pc(RUL.nearOff(x)) + ' · 거리/폭 ×' + xf(s.ratio));
  });

  /* ── [1] 재현 ⓐ — 옛 첫 축은 «선언» 을 안 본다 ─────────────────────
     같은 표본 여섯을 그대로 두고 **선언만** 세 자리로 옮긴다(구름 아래 · 구름 한복판 · 구름 위 멀리).
     한복판 자리는 «흔들림이면 이렇게 보인다» 의 정의 그 자체인데, 옛 첫 축은 셋 다 **같은 한 값**이라
     그 물음을 아예 안 재고 있다 ⇒ 그 축이 재던 것은 «재실행으로 닫히는가» 가 아니라
     **«이 실행의 판이 조용했는가»** 다. 반대로 새 축은 셋에서 **셋 다 다른 값**을 준다(짝 항 [1-c]).
     ⚠ **밑동도 `rowOf` 로 다시 잰다** — `RUL.measure` 의 `spread` 는 **반올림 전** 표본으로 재고
     `each` 는 소수 둘째 자리로 반올림돼 나온다. 그래서 «브라우저가 준 폭» 과 «`each` 로 다시 잰 폭» 이
     3자리째에서 ±0.001 갈린다(12회 중 1회 실측 Δ0.1p — **1회차의 이 항이 그래서 빨갰다**).
     이 항이 묻는 것은 «축이 선언을 보는가» 이지 «두 반올림이 같은가» 가 아니므로 같은 셈끼리 잰다. */
  const base = runs[0];
  const bs = RUL.shakeSep(base);
  const at = (tag, d) => rowOf(tag, +d.toFixed(3), base.each);
  const sweep = [at('lowD', bs.lo - bs.range), at('midD', (bs.lo + bs.hi) / 2), at('farD', bs.hi + bs.range * 5)];
  const mid = sweep[1];
  const oldVals = new Set(sweep.map(r => r.spread));
  const oldJudge = new Set(sweep.map(oldNarrow));
  ok(oldVals.size === 1 && oldJudge.size === 1,
     '1-a 재현 — 옛 첫 축(K회 폭)은 **선언을 안 본다**: 선언을 세 자리(구름 아래·한복판·위 멀리)로 옮겨도 값이 한 개고 판정도 한 개다',
     '선언 ' + sweep.map(r => r.decl).join(' / ') + ' ⇒ 폭 ' + [...oldVals].map(pc).join(' / ')
     + ' · 옛 첫 항 ' + [...oldJudge].join(' / ')
     + ' (⚠ 브라우저가 준 폭 ' + pc(base.spread) + ' 와 ±0.001 갈릴 수 있다 — 반올림 전/후)');
  const sRatios = sweep.map(r => RUL.shakeSep(r).ratio);
  ok(new Set(sRatios.map(String)).size === 3,
     '1-c 짝 항 — **선언을 보는 축이라면 셋이 갈려야 한다**: 새 축은 같은 세 자리에서 값이 셋 다 다르다(옛 축이 «결백» 이 아니라 «눈이 멀었다» 는 증거)',
     '×' + sRatios.map(xf).join(' / '));
  const ms = RUL.shakeSep(mid);
  ok(!ms.outside && ms.ratio < RUL.SHAKE_UNIT,
     '1-b 같은 표본에서 **새 판정은 뒤집힌다** — 선언이 구름 안이면 부호·크기 둘 다 빨강(이것이 «흔들림» 의 정의다)',
     '선언 ' + mid.decl + ' ∈ [' + ms.lo + ', ' + ms.hi + '] ⇒ 구름 밖 ' + ms.outside + ' · ×' + xf(ms.ratio));

  /* ── [2] 재현 ⓑ — 옛 항은 «잡음이 커지면» 빨개진다 ────────────────
     783 §7 이 남긴 실측 표본 여섯을 그대로 넣는다. 판정 사실(선언이 표본 전부의 밖)은 똑같은데
     낮은 표본 하나가 폭을 28% 로 넓혀 손 문턱 0.25 를 넘겼다 = 그 실행이 빨갰던 이유 전부다. */
  const rs = RUL.shakeSep(RED783);
  ok(!oldNotShake(RED783) && !oldNarrow(RED783),
     '2-a 재현 — 783 이 값째 남긴 그 실행(낮은 표본 하나)에서 **옛 항은 빨강**이다',
     '값 ' + RED783.each.join('/') + ' · K회 폭 ' + pc(RED783.spread) + ' > 손 문턱 25.0%');
  ok(rs.outside && rs.ratio >= RUL.SHAKE_UNIT,
     '2-b 같은 표본에서 **새 판정은 초록**이다 — 폭이 넓어지면 거리도 같이 재므로 잡음이 판정을 안 뒤집는다',
     '거리 ' + rs.gap.toFixed(2) + ' ÷ 폭 ' + rs.range.toFixed(2) + ' = ×' + xf(rs.ratio)
     + ' · 근접이탈 ' + pc(RUL.nearOff(RED783)));

  /* ── [3] 처방 ⓐ 기각 — «`nearOff` > 밴드» 로 적었으면 또 하나의 동전이다 ──
     783 §7 이 처방 후보로 적으면서 «밴드 대비 여유가 0.8p 로 얇다 — 무엇에 대어 잴 것인가를 먼저
     정하라» 고 경고한 그 자리다.
     ⚠⚠ **이 항을 처음에 «밴드까지의 여유 ≤ R회 갈림» 이라는 단언으로 적었다가 자가 기각했다** —
     12회 중 1회 «여유 2.5p ↔ 갈림 1.3p» 로 빨갰다(높은 쪽만 뽑힌 배치). ⓐ 가 동전이라는 것은
     **실행 «사이»의 꼬리 사실**(96회 중 4회쯤 밴드 아래)이라 R=8 안에서는 어떤 통계로 적어도 다시
     동전이다 — 778-③ 이 «그 사실이 한 실행 안에서 보이는가를 먼저 물어라» 로 적어 둔 바로 그 자리고,
     고치러 와서 새 동전을 심을 뻔한 두 번째 자리다(775-④).
     ⇒ **뜻을 소스 쪽으로 옮긴다**(778-④ «걷어도 잃는 단언이 없다» 를 세고 걷는다):
       · 단언 [3] = «기각한 ⓐ 가 코드로 돌아오지 않았다»(779-③ · 100% 결정적)
       · 관측 [3-b] = 이 R회의 값·«ⓐ 였다면 몇 회 빨강» 을 매 실행 크게 찍는다(자리는 안 비운다 · 333) */
  const nears = runs.map(RUL.nearOff);
  const nMin = Math.min(...nears), nMax = Math.max(...nears);
  const head = nMin - RUL.TOL_FLOOR, jitter = nMax - nMin;
  const wouldRed = nears.filter(v => v <= RUL.TOL_FLOOR).length;
  const aBack = /nearOff[\s\S]{0,120}?(TOL_FLOOR|\.tol\b)/.test(code)
             || /(TOL_FLOOR|\.tol\b)[\s\S]{0,120}?nearOff/.test(code);
  ok(!aBack,
     '3 처방 ⓐ(«근접이탈 > 밴드») 기각이 유지된다 — `probe680` 코드가 근접이탈을 **밴드에 대어 재지 않는다**(돌아오면 자동 빨강 · 779-③)',
     aBack ? '`nearOff` 가 `TOL_FLOOR`/`tol` 과 같은 자리에 다시 적혔다' : '코드 0건 · 기각 근거는 [3-b] 의 값');
  ok(true,
     '3-b 관측 — 그 기각의 값(단언으로 세우면 그 단언 자신이 동전이라 관측으로 찍는다 · 778-③·778-④)',
     '근접이탈 ' + pc(nMin) + '~' + pc(nMax) + ' · 밴드 ' + pc(RUL.TOL_FLOOR)
     + ' ⇒ 여유 ' + (head * 100).toFixed(1) + 'p · 갈림 ' + (jitter * 100).toFixed(1) + 'p'
     + ' · 이 ' + REPS + '회에 ⓐ 였다면 ' + wouldRed + '회 빨강'
     + ' (전수 실측 96회 중 4회가 밴드 40.0% 이하 — 최소 39.1% · 최대 45.1%)');

  /* ── [4] 새 판정 — 같은 제품을 R회 재서 전부 초록인가, 여유가 몇 배인가 ── */
  const seps = runs.map(RUL.shakeSep);
  const rMin = Math.min(...seps.map(s => s.ratio));
  ok(seps.every(s => s.outside),
     '4-a 새 판정(부호) — R회 전부, K회 표본이 한 개도 선언 쪽으로 안 넘어온다',
     '표본 최대 ' + Math.max(...seps.map(s => s.hi)) + ' ↔ 선언 ' + runs[0].decl
     + ' · 최소 거리 ' + Math.min(...seps.map(s => s.gap)).toFixed(2));
  ok(seps.every(s => s.ratio >= RUL.SHAKE_UNIT),
     '4-b 새 판정(크기) — R회 전부, 선언까지의 거리가 그 실행의 K회 폭보다 멀다(손 상수 아님 · 그 실행이 스스로 잰 널)',
     '최소 ×' + xf(rMin) + ' ≥ ' + RUL.SHAKE_UNIT + ' (실측 41회 ×3.0~14.2)');
  /* 옛 항이 이 R회에서 실제로 몇 번 빨갰는지는 **관측으로만** 찍는다(778-④) —
     «N회에 한 번 빨갛다» 를 단언으로 세우면 그 단언 자신이 플레이키다(766-④). 뜻은 [1]·[2] 가 진다. */
  const oldRed = runs.filter(x => !oldNotShake(x));
  console.log('     [관측] 이 ' + REPS + '회에서 옛 [2] 는 ' + oldRed.length + '회 빨강 · K회 폭 '
    + pc(Math.min(...runs.map(x => x.spread))) + '~' + pc(Math.max(...runs.map(x => x.spread)))
    + ' ↔ 손 문턱 25.0% (783 실측 5~28% · 그 한 실행이 [2-a])');

  /* ── [5] 되돌림 — 새 판정이 «다 통과» 로 굳지 않았다(759-②) ────────
     ⚠ `probe680` [2]·[2b] 와 **같은 함수**를 부른다. 사본을 만들면 시험의 뜻이 사라진다. */
  const half = rowOf('half', +(bs.hi + bs.range * 0.5).toFixed(3), base.each);
  const far = rowOf('far', +(bs.hi + bs.range * 1.5).toFixed(3), base.each);
  const flat = rowOf('flat', 29.36, [16, 16, 16, 16, 16, 16]);
  const hs = RUL.shakeSep(half), fs2 = RUL.shakeSep(far), ls = RUL.shakeSep(flat);
  ok(hs.outside && hs.ratio < RUL.SHAKE_UNIT,
     '5-a 되돌림 — 선언이 구름 밖이되 **폭 이내**면 부호는 초록인데 크기가 빨갛다(부호 항만으로는 안 닫힌다)',
     '선언 ' + half.decl + ' = 구름 상단 + 폭 × 0.5 ⇒ 구름 밖 ' + hs.outside + ' · ×' + xf(hs.ratio));
  ok(fs2.outside && fs2.ratio >= RUL.SHAKE_UNIT,
     '5-b 되돌림 — 폭 한 벌보다 멀면 초록이다(단위가 «폭 한 벌» 이라는 뜻 자체를 못박는다)',
     '선언 ' + far.decl + ' = 구름 상단 + 폭 × 1.5 ⇒ ×' + xf(fs2.ratio));
  ok(ls.ratio === Infinity && ls.outside,
     '5-c 되돌림 — 표본이 **완전히 재현**되면(폭 0) 거리는 무한이다(0 나눗셈을 NaN 으로 흘리면 조용히 빨개진다)',
     '값 ' + flat.each.join('/') + ' ⇒ 폭 ' + ls.range + ' · ×' + xf(ls.ratio));
  ok(!RUL.shakeSep({ id: 'x', decl: 1, each: [] }).outside
     && RUL.shakeSep({ id: 'x', decl: 1, each: [] }).ratio === 0,
     '5-d 되돌림 — 표본이 0개면 «멀다» 고 말하지 않는다(빈 표본이 조용히 통과하지 않는다)',
     '빈 표본 ⇒ 구름 밖 false · ×0');
  ok(seps.every((s, i) => s.outside && runs[i].id === 'poison') && !RUL.held695(runs[0]),
     '5-e 이 항이 겨누는 것은 실제 `poison` 행이고, 그 종은 ⏸접촉 면제를 못 탄다(759-③ 자물쇠 그대로)',
     'poison ⏸접촉 ' + RUL.held695(runs[0]) + ' · ⏸199 ' + RUL.held199(runs[0]));

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
