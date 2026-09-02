#!/usr/bin/env node
/* 783 재현 — `probe680` [3-c] 가 왜 실행마다 갈렸는가 (T1 «버그(게이트 플레이키 · 759 재발, 다른 종)»)
 *
 *   node tools/probe783.js [--reps N]      (기본 N = 4 · 한 회 ≈ 15초)
 *
 * ⚑ **등재문의 실측은 «ice 가 한 번 밖으로 나왔고 곧바로 재실행하면 없다» 였다.** 그래서 이 프로브가
 *   먼저 하는 일은 «몇 번에 한 번 빨간가» 를 세는 것이 **아니다** — 그렇게 적으면 물음 자신이
 *   플레이키다(766-④ · 775-④ · 779-②). 대신 **확률을 확정으로 바꾸는 손잡이**를 찍는다:
 *   옛 [3-c] 의 모수는 «그 실행의 밴드 밖 명단» 인데, 그 명단에 들어갈 후보들이 **매 실행 예외 없이**
 *   밴드 가장자리에 자기 K회 폭 이내로 붙어 서 있다([1]). 그리고 그 후보에게 옛 판정을 물으면
 *   우회로가 **하나도 없다**([2]). 둘을 곱하면 «언젠가 반드시 빨갛다» 가 확률 없이 나온다.
 *
 *   [0] 소스 — `probe680.js` 의 [3-c] 가 손 축 둘을 안 쓰고 `rul504.nearSep` 를 부른다(779-③)
 *   [1] 재현 — 매 실행, 옛 우회로가 안 열리는 미등재 종의 **상위 둘**이 밴드에서 «자기 K회 폭» 이내
 *   [2] 옛 판정에는 우회로가 없다 — 그 둘이 한 번 흔들려 나오면 즉시 빨강(이름은 실행마다 갈린다)
 *   [3] 새 판정 — 같은 표에서 R회 전부 초록, 여유가 얼마인가
 *   [4] 되돌림 — 새 판정이 «다 통과» 가 아니다(유령 1마리·3마리·등재 이름)
 *
 * ⚠ **문턱은 한 칸도 안 건드린다** — `TOL_FLOOR` 0.40 은 `probe504` [D] 가 «잰» 값이고,
 *   흔들리는 값에서 문턱을 다시 뽑는 길은 759 가 이미 기각했다(«문턱도 같이 흔들린다»).
 *   ⚠ **`ice` 를 면제 목록에 손으로 더하는 길도 오답이다** — [1] 이 매 실행 **둘 이상**을 찍는다.
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
const REPS = ai > 0 ? Math.max(2, +process.argv[ai + 1] || 4) : 4;

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const pc = (x) => (x * 100).toFixed(1) + '%';

/* 옛 [3-c] 의 판정 — **수리 전 `probe680` 에 있던 그대로**다. 이 프로브의 유일한 사본이고,
   [0] 이 «제품 쪽(probe680)에는 이 꼴이 남아 있지 않다» 를 소스로 확인해 사본이 둘이 되는 것을 막는다. */
const oldSideOk = (x) => RUL.held695(x) || x.cd === 0 || x.spread > 0.40;
/* 옛 모수 — «그 실행의 밴드 밖 명단»(poison 제외). 이것이 실행마다 바뀌는 것이 783 이다. */
const oldOutBand = (rows) => rows.filter(x => x.off > x.tol && x.id !== 'poison');

(async () => {
  /* ── [0] 소스 쪽 되돌림(779-③) ─────────────────────────────
     «값이 다시 깨지는가» 만 물으면 다음 세션이 손 축을 도로 적어 넣어도 조용하다.
     주석은 걷어 내고 **코드만** 본다 — 이 저장소의 기록은 옛 꼴을 인용해 두기 때문이다. */
  const src = fs.readFileSync(path.join(__dirname, 'probe680.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const handAxis = /\.cd\s*===\s*0/.test(code) || /\.spread\s*>\s*0?\.40?\b/.test(code);
  ok(!handAxis, '0-a `probe680` [3-c] 가 손 축 둘(`cd === 0` · K회 폭 문턱)로 다시 판정하지 않는다(759-①)',
     handAxis ? '코드에 남아 있다' : '코드 0건(주석 인용은 제외하고 셌다)');
  ok(/RUL\.nearSep\(/.test(code) && typeof RUL.nearSep === 'function' && typeof RUL.nearOff === 'function',
     '0-b 판정이 `rul504` 한 곳에 있고 프로브가 그것을 부른다(판정 사본 0개 — 402·508·553·620)',
     '`RUL.nearSep(` 호출 있음 · 모듈이 `nearOff`/`nearSep` 를 준다');
  ok(RUL.TOL_FLOOR === 0.40 && RUL.K === 6,
     '0-c 문턱·반복 수는 한 칸도 안 건드렸다(값을 밴드에 맞추는 짓 금지 — 680 등재문)',
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
    const ids = await page.evaluate(() => SKILLS.filter(s => !s.sup).map(s => s.id));
    const C = await RUL.measure(page, ids, { K, SEC, POP });
    runs.push(C.map(x => Object.assign({}, x, { tol: RUL.tolOf(x.spread, K), off: RUL.offOf(x.mean, x.decl) })));
    await ctx.close();
  }
  await browser.close();

  /* ── [1] 재현 — 옛 모수가 «동전» 인 이유를 한 실행 안에서 본다 ────────
     후보 = 미등재(⏸접촉 아님) · poison 아님 · **폭 ≤ 40%**(= 옛 우회로가 안 열리는 종).
     그중 이탈 상위 둘의 «밴드까지 남은 여유» 를 **그 종 자신의 K회 폭**으로 잰다(778-② —
     손 상수 대신 그 실행이 스스로 잰 널). 1 을 넘으면 «가장자리가 아니다» 는 뜻이다. */
  const edge = runs.map(rows => rows
    .filter(x => x.id !== 'poison' && !RUL.held695(x) && x.spread <= 0.40)
    .sort((a, b) => b.off - a.off).slice(0, 2)
    .map(x => Object.assign({}, x, { gap: x.tol - x.off, ratio: (x.tol - x.off) / x.spread })));
  edge.forEach((e, i) => console.log('     [' + (i + 1) + '회] 가장자리 상위 둘: '
    + e.map(x => x.id + ' 이탈 ' + pc(x.off) + ' 여유 ' + (x.gap * 100).toFixed(1) + 'p ÷ 폭 '
      + pc(x.spread) + ' = ' + x.ratio.toFixed(2)).join(' · ')));
  const worst = Math.max(...edge.map(e => Math.max(...e.map(x => x.ratio))));
  ok(edge.every(e => e.length === 2 && e.every(x => x.ratio <= 1)),
     '1 재현 — 매 실행 미등재 종 **둘**이 밴드에서 «자기 K회 폭» 이내에 붙어 있다 ⇒ 옛 [3-c] 의 모수(밴드 밖 명단)는 그 둘이 흔들릴 때마다 바뀐다',
     '최악 여유/폭 ' + worst.toFixed(2) + ' ≤ 1 (실측 10회 −0.01~0.59) · 둘이므로 **한 이름을 목록에 더해도 다음 종이 남는다**');
  const names = [...new Set([].concat(...edge.map(e => e.map(x => x.id))))];
  ok(names.length >= 2,
     '2-a 그 자리에 서는 이름이 하나가 아니다 ⇒ 처방 ⓒ(`ice` 를 면제 목록에 손으로 더한다)는 다음 종에서 그대로 재발한다',
     names.join(' · ') + ' (실측 10회 ice · arrow · curve)');
  /* [2-b] 옛 판정에는 그 후보를 받아 줄 우회로가 하나도 없다 — 나오는 «즉시» 빨강이다.
     ⚠ 이 항이 [1] 과 짝이다: [1] 이 «언젠가 나온다», [2-b] 가 «나오면 빨갛다». */
  const escapes = [].concat(...edge).filter(oldSideOk);
  ok(escapes.length === 0,
     '2-b 옛 판정(⏸접촉 · cd 0 · 폭 > 40%)에는 그 둘을 받아 줄 우회로가 0개 ⇒ 밴드 밖으로 한 번 나오면 그 실행은 즉시 빨강',
     escapes.length ? escapes.map(x => x.id).join(',') + ' 가 우회했다' : '우회 0/' + [].concat(...edge).length + '종');
  /* 옛 판정이 이 R회에서 실제로 몇 번 빨갰는지는 **관측으로만** 찍는다(778-④) —
     «N회에 한 번 빨갛다» 를 단언으로 세우면 그 단언 자신이 플레이키다(766-④). 뜻은 [1]·[2-b] 가 진다. */
  const oldRed = runs.filter(rows => !oldOutBand(rows).every(oldSideOk));
  console.log('     [관측] 이 ' + REPS + '회에서 옛 [3-c] 는 ' + oldRed.length + '회 빨강'
    + (oldRed.length ? ' — ' + oldRed.map(rows => oldOutBand(rows).filter(x => !oldSideOk(x))
        .map(x => x.id + '(cd' + x.cd + ' 폭 ' + pc(x.spread) + ')').join(',')).join(' / ')
      : ' (10회 실측에서는 1회 — `ice` cd1.6 폭 34%)'));

  /* ── [3] 새 판정 — 같은 표에서 R회 전부 초록인가, 여유가 얼마인가 ────── */
  const seps = runs.map(rows => RUL.nearSep(rows, 'poison'));
  seps.forEach((s, i) => console.log('     [' + (i + 1) + '회] 근접이탈 poison ' + pc(s.near)
    + ' ↔ 다음 셋 ' + s.top.map(x => x.id + ' ' + pc(x.near)).join(' · ')
    + ' 평균 ' + pc(s.topMean) + ' ⇒ ×' + s.ratio.toFixed(2)));
  const minGap = Math.min(...seps.map(s => s.near - s.rest[0].near));
  ok(seps.every(s => s.isMax),
     '3-a 새 판정(부호) — 재현되는 이탈이 가장 큰 종은 R회 전부 `poison` 이다(⏸접촉 등재분 제외 · 밴드 멤버십 안 씀)',
     '최소 여유 ' + (minGap * 100).toFixed(1) + 'p (실측 10회 10.5~19.6p)');
  const minRatio = Math.min(...seps.map(s => s.ratio));
  ok(seps.every(s => s.ratio >= 1.30),
     '3-b 새 판정(크기) — poison 근접이탈 ≥ 1.3 × 다음 셋의 평균(묶음 통계라 준우승 «이름» 이 갈려도 안 흔들린다)',
     '최소 ×' + minRatio.toFixed(2) + ' ≥ 1.30 · 여유 ' + (minRatio - 1.30).toFixed(2)
     + ' (실측 10회 ×1.59~2.04)');
  /* 옛 항이 빨갰던 그 실행에서도 새 항이 초록인지 — 있으면 못박고, 없으면 그렇게 적는다. */
  ok(oldRed.every(rows => { const s = RUL.nearSep(rows, 'poison'); return s.isMax && s.ratio >= 1.30; }),
     '3-c 옛 항이 빨갰던 실행에서도 새 항은 초록이다(있었을 때만 뜻이 있는 항 — 없으면 공집합)',
     oldRed.length ? oldRed.length + '회 전부 초록' : '이번 ' + REPS + '회에는 옛 빨강이 안 났다(10회 실측의 그 1회에서는 ×1.46 초록)');

  /* ── [4] 되돌림 — 새 판정이 «다 통과» 로 굳지 않았다 ────────────────
     ⚠ `probe680` [3-d] 와 **같은 함수**를 부른다. 사본을 만들면 시험의 뜻이 사라진다. */
  const last = runs[runs.length - 1];
  const pz = last.find(x => x.id === 'poison');
  const ghostOf = (id, decl) => Object.assign({}, pz, decl === undefined ? { id } : { id, decl });
  const one = RUL.nearSep(last.concat([ghostOf('ghost')]), 'poison');
  const three = RUL.nearSep(last.concat([ghostOf('g1'), ghostOf('g2'), ghostOf('g3')]), 'poison');
  const held = RUL.nearSep(last.concat([ghostOf('whirl', 17.88)]), 'poison');
  ok(!one.isMax, '4-a 되돌림 — poison 과 같은 모양의 **미등재** 유령 1마리를 심으면 부호 항이 빨개진다',
     '유령 근접이탈 ' + pc(one.rest[0].near) + ' = poison ' + pc(one.near) + ' ⇒ 최대 ' + one.isMax);
  ok(three.ratio < 1.30, '4-b 되돌림 — 그 유령이 셋이면 크기 항도 빨개진다(크기 항은 묶음 평균에 물려 있으므로 되돌림 표본도 묶음이어야 한다)',
     '×' + three.ratio.toFixed(2) + ' < 1.30');
  ok(held.isMax && held.ratio >= 1.30 && !RUL.held695(pz),
     '4-c 면제는 여전히 «등재된 이름 + 낡은 선언» 에서만 열린다 — 같은 값이라도 `whirl` 이름이면 모수에서 빠지고, poison 자신은 못 탄다(759-③)',
     '등재 이름으로 심으면 최대 ' + held.isMax + ' ×' + held.ratio.toFixed(2)
     + ' · poison 면제 ' + RUL.held695(pz));

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
