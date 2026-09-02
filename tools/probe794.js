#!/usr/bin/env node
/* 794 재현 — `probe695` [1](«셋 다 밴드 밖») 이 왜 예비 동전이었는가 (T1 «버그(게이트 플레이키 · 잠복)»)
 *
 *   node tools/probe794.js [--reps N]     (기본 N = 1 · 한 회 ≈ 자유+고정 두 장면 = probe695 [1] 과 같은 비용)
 *
 * ⚑ **«몇 번에 한 번 빨간가» 를 세지 않는다**(784 규약 · 766-④ · 775-④ · 779-② · 791 규약).
 *   이 자리는 **아직 한 번도 안 뒤집혔다** — 등재문이 «여유 23%p» 로 적은 그대로다. 그래서
 *   확률을 확정으로 바꾸는 손잡이는 «빨간 실행을 잡아 오는 것» 이 아니라 **축 시험**이다(784-①):
 *   ① 옛 축이 **자기 문장이 말하는 것(이탈)을 안 본다** — 이탈을 고정한 채 «폭» 만 바꾸면 판정이 뒤집힌다.
 *   ② 옛 축은 **사실이 더 세게 참인 표본에서 초록이 된다**(헛초록 방향) — 이탈이 더 커도 폭이 크면 «밴드 안».
 *   ③ 그 뒤집힘은 프로브의 빨강 하나로 안 끝난다 — **같은 비교가 게이트 `[C2]` 의 «⏸접촉» 소속도 정하므로**
 *      «이 눈금으로 못 잰다» 는 사실이 표에서 조용히 사라진다.
 *
 *   [0] 소스 — `probe695` [1] 절에 옛 축이 안 남아 있고 판정은 `rul504` 것을 부른다(사본 0 · 779-③)
 *   [1] 축 시험 — 같은 이탈·다른 폭이 **반대 판정** · 더 멀어진 표본이 **초록** · 그 초록이 게이트로 번진다
 *   [2] 새 판정은 그 세 표본에서 **같은 판정**이다(부호·크기 둘 다)
 *   [3] 되돌림 — 새 판정이 «다 통과» 가 아니다(부호·장면 대조·고정 밴드 셋 다 음성 표본으로 친다)
 *   [4] 라이브 — 자유·고정 두 장면을 R회 재서 새 판정 셋의 **여유**를 값으로 찍는다(791-③)
 *
 * ⚠ 문턱은 한 칸도 안 건드렸다 — `TOL_FLOOR` 0.40 · `K` 6 · `SHAKE_UNIT` 1 전부 불변.
 *   새 판정의 널은 **그 실행이 스스로 잰 값**(구름의 폭 · 같은 실행의 다른 장면)이지 분포에서 뽑은 문턱이 아니다.
 * ⚠ [1] 의 표본은 «합성» 이지만 **양끝은 실측값**이다 — 0.04(2026-09-02 sess-0516-27155 · 504 트리 `aura` K회
 *   최저)와 3.8(같은 회차 자유 장면 `aura` K회 최고). 자유 장면이 실행마다 하는 일이 정확히 **같은 총량을 K 판에
 *   다시 나눠 담는 것**이고(카이팅 운), 그 재분배만으로 옛 축의 판정이 바뀐다는 것이 이 절의 전부다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const RUL = require('./rul504');

const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const IDS = ['orbit', 'aura', 'whirl'];
const ai = process.argv.indexOf('--reps');
const REPS = ai > 0 ? Math.max(1, +process.argv[ai + 1] || 1) : 1;

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 표본 한 줄 — `spread`·`tol`·`off` 는 적지 않고 **`measure()`·`rul504` 와 같은 식**으로 여기서 뽑는다(손 전사 0칸) */
const row = (id, cd, decl, each) => {
  const mean = each.reduce((a, b) => a + b, 0) / each.length;
  const s = mean ? (Math.max(...each) - Math.min(...each)) / mean : 0;
  return { id, cd, decl, each: each.map(v => +v.toFixed(2)), mean: +mean.toFixed(3), spread: +s.toFixed(3),
           tol: +RUL.tolOf(+s.toFixed(3), RUL.K).toFixed(3), off: +RUL.offOf(+mean.toFixed(3), decl).toFixed(3) };
};
/* 옛 축 — 사본이 아니라 **지워진 그 식 그대로**다(이 자 안에서만 산다) */
const oldAxis1 = (rows) => rows.every(x => x.off > x.tol);
/* 새 판정 셋 — 판정은 전부 `rul504` 것을 부른다 */
const newSign = (rows) => rows.every(x => RUL.shakeSep(x).outside && x.decl > Math.max(...x.each));
const newScene = (free, fix) => IDS.every(id =>
  free.find(x => x.id === id).off > fix.find(x => x.id === id).off);
const newBand = (fix) => fix.every(x => x.off < RUL.TOL_FLOOR);

/* ── 표본 ─────────────────────────────────────────────────────────────────
   ⓐ 실측 — 2026-09-02 sess-0516-27155 이 옛 꼴로 돌린 자유 장면(오늘 트리)
   ⓑ 같은 이탈·다른 폭 — ⓐ 의 `aura` 총량을 K 판에 **다시 나눠 담기만** 한 것(평균 Δ0 ⇒ 이탈 Δ0)
   ⓒ 그 두 벌은 실측 표본보다 총량이 적다 — 이탈이 **더 크다** */
const MEAS = [row('orbit', 0, 6.65, [0.96, 1.2, 1.92, 2.08, 1.2, 3.48]),
              row('aura', 0, 9.4, [3.68, 3.8, 2.96, 1.8, 2.52, 1.32]),
              row('whirl', 1.6, 17.88, [4.63, 5, 5.13, 3.5, 4.63, 5.56])];
/* ⓑ·ⓒ 의 양끝은 **실측값**이다 — 0.04(같은 회차 `aura` K회 최저)·3.8(같은 회차 `aura` K회 최고).
   ⓑ 는 그 총량을 K 판에 **고르게** 담은 것이고 ⓒ 는 **한 판에 몰아** 담은 것이다(평균 Δ0 ⇒ 이탈 Δ0). */
const A_FLAT = row('aura', 0, 9.4, [0.667, 0.667, 0.667, 0.667, 0.667, 0.667]);        /* 폭 0 · 이탈 93% */
const A_WIDE = row('aura', 0, 9.4, [0.04, 0.04, 0.04, 0.04, 0.04, 3.8]);               /* 같은 평균 0.667 · 폭 564% */
/* 고정 장면 실측(같은 회차) — [3] 되돌림의 «참» 쪽 */
const FIX = [row('orbit', 0, 6.65, [7.16, 7.48, 7.04, 7.4, 7.44, 7.4]),
             row('aura', 0, 9.4, [9.48, 9.08, 9.04, 8.52, 9, 9.24]),
             row('whirl', 1.6, 17.88, [18.79, 17, 19.21, 18.36, 17.93, 18.36])];

const open = async (browser, url) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof skillHits === 'function'
    && typeof step === 'function' && typeof makeEnemy === 'function');
  return page;
};
const launch = async () => {
  try { return await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    return chromium.launch({ executablePath: p });
  }
};

(async () => {
  /* ── [0] 소스 ─────────────────────────────────────────── */
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'probe695.js'), 'utf8');
  const body = src.slice(src.indexOf('── [1] 재현'), src.indexOf('── [2]'));
  ok(!/now\.every\(x => x\.off > x\.tol\)/.test(body)
     && /RUL\.shakeSep\(/.test(body) && /RUL\.TOL_FLOOR/.test(body) && /RUL\.c2Split\(/.test(body),
     '0 소스 — [1] 절에 옛 축(자유 장면의 밴드 멤버십)이 안 남아 있고 판정은 전부 `rul504` 것을 부른다(사본 0 · 779-③)',
     '옛 축 ' + (/now\.every\(x => x\.off > x\.tol\)/.test(body) ? '남음' : '0건')
     + ' · shakeSep ' + (body.match(/RUL\.shakeSep\(/g) || []).length + '곳'
     + ' · TOL_FLOOR ' + (body.match(/RUL\.TOL_FLOOR/g) || []).length + '곳'
     + ' · c2Split ' + (body.match(/RUL\.c2Split\(/g) || []).length + '곳');
  ok(/freeze: true/.test(body),
     '0-b [1] 절이 **같은 실행에서 고정 장면도 잰다** — «크기» 를 손 상수가 아니라 그 실행의 다른 장면으로 받는다(791-④)',
     '`freeze` 호출 ' + (body.match(/freeze: true/g) || []).length + '곳');

  /* ── [1] 축 시험 ──────────────────────────────────────── */
  const show = x => x.id + ' 평균 ' + x.mean + ' 이탈 ' + (x.off * 100).toFixed(0)
    + '% · 폭 ' + (x.spread * 100).toFixed(0) + '% ⇒ 허용 ' + (x.tol * 100).toFixed(0) + '%';
  ok(A_FLAT.off === A_WIDE.off && oldAxis1([A_FLAT]) && !oldAxis1([A_WIDE]),
     '1 축 시험(784-①) — **이탈이 같은데** 폭만 다른 두 표본이 옛 축에서 **반대 판정**이다 ⇒ 옛 축이 재는 것은 «선언과의 거리» 가 아니라 «표본의 흩어짐» 이다',
     '좁은 ' + show(A_FLAT) + ' → 밴드 밖 / 넓은 ' + show(A_WIDE) + ' → 밴드 **안**'
     + ' (같은 총량을 K 판에 다시 나눠 담기만 했다 — 자유 장면이 실행마다 하는 일)');
  ok(A_WIDE.off > MEAS[1].off && !oldAxis1([A_WIDE]) && oldAxis1([MEAS[1]]),
     '1-b 헛초록 방향 — 사실이 **더 세게 참인**(선언에서 더 멀어진) 표본에서 옛 축이 초록으로 돌아선다',
     '실측 ' + show(MEAS[1]) + ' → 밴드 밖 / 더 먼 ' + show(A_WIDE) + ' → 밴드 **안**'
     + ' · 이탈 ' + (MEAS[1].off * 100).toFixed(0) + '% → ' + (A_WIDE.off * 100).toFixed(0) + '%');
  ok(RUL.c2Split([MEAS[1]]).contact.length === 1 && RUL.c2Split([A_WIDE]).contact.length === 0
     && RUL.c2Split([A_WIDE]).bad.length === 0,
     '1-c ⚑ 그 초록은 프로브 안에서 안 끝난다 — 같은 비교가 게이트 `[C2]` 의 «⏸접촉» 소속을 정하므로 **«이 눈금으로 못 잰다» 가 표에서 사라진다**(하드 빨강도 아니라 아무 말도 안 남는다)',
     '실측 표본 ⏸접촉 ' + RUL.c2Split([MEAS[1]]).contact.length
     + ' → 몰아 담은 표본 ⏸접촉 ' + RUL.c2Split([A_WIDE]).contact.length
     + ' · 하드 ' + RUL.c2Split([A_WIDE]).bad.length);
  console.log('     [1] (참고) 뒤집히는 폭 = 이탈 × 2√K — '
    + MEAS.map(x => x.id + ' 실측 폭 ' + (x.spread * 100).toFixed(0) + '% ↔ '
      + (x.off * 2 * Math.sqrt(RUL.K) * 100).toFixed(0) + '%').join(' / ')
    + ' · 등재 시점 실측 최대 폭 283%(791 §3)');

  /* ── [2] 새 판정은 세 표본에서 같다 ───────────────────── */
  ok(newSign([MEAS[1]]) && newSign([A_FLAT]) && newSign([A_WIDE]),
     '2 새 축 ① 부호 — 세 표본 전부에서 «K회 표본이 하나도 선언에 못 닿는다» 로 **같은 판정**이다(폭에 안 흔들린다)',
     [['실측', MEAS[1]], ['고른', A_FLAT], ['몰아 담은', A_WIDE]]
       .map(([t, x]) => t + ' 최고 ' + Math.max(...x.each) + ' < ' + x.decl
         + '(×' + RUL.shakeSep(x).ratio.toFixed(2) + ')').join(' / '));
  ok(newScene(MEAS, FIX) && newBand(FIX),
     '2-b 새 축 ② 크기 — 실측 두 장면에서 «자유 이탈 > 고정 이탈» 이고 고정 장면은 밴드 안이다(문턱 0 · 밴드는 폭이 좁은 장면에서만 쓴다)',
     IDS.map(id => id + ' 자유 ' + (MEAS.find(x => x.id === id).off * 100).toFixed(0)
       + '% ↔ 고정 ' + (FIX.find(x => x.id === id).off * 100).toFixed(0) + '%').join(' / ')
     + ' · 고정 폭 ' + FIX.map(x => (x.spread * 100).toFixed(0) + '%').join('/'));

  /* ── [3] 되돌림 — «다 통과» 가 아니다(759-②) ──────────── */
  const upOne = row('aura', 0, 9.4, [1.8, 9.6, 1.08, 1.2, 1.48, 1.24]);   /* 한 판이 선언 위로 */
  ok(!newSign([upOne]) && newSign([MEAS[1]]),
     '3 되돌림 ① 부호 — 표본 **하나**가 선언 위로 올라오면 빨갛다(선언이 구름 안이면 «구름 밖» 이 거짓이다)',
     '최고 ' + Math.max(...upOne.each) + ' ≥ 선언 ' + upOne.decl + ' → 부호 ' + newSign([upOne]));
  ok(!newScene(FIX, FIX) && !newScene(MEAS, MEAS),
     '3-b 되돌림 ② 장면 대조 — 두 장면이 같은 표면 빨갛다(장면 축이 «항상 켜진 초록» 이 아니다)',
     '고정↔고정 ' + newScene(FIX, FIX) + ' · 자유↔자유 ' + newScene(MEAS, MEAS));
  ok(!newBand(MEAS) && newBand(FIX),
     '3-c 되돌림 ③ 고정 밴드 — 자유 장면의 표를 «잴 수 있는 장면» 자리에 넣으면 빨갛다(밴드를 아무 장면에나 쓰면 안 된다는 말 자체다)',
     '자유 표 ' + newBand(MEAS) + ' ↔ 고정 표 ' + newBand(FIX));
  ok(RUL.TOL_FLOOR === 0.40 && RUL.K === 6 && RUL.SHAKE_UNIT === 1,
     '3-d 문턱 불변 — 이 회차는 `TOL_FLOOR`·`K`·`SHAKE_UNIT` 을 한 칸도 안 건드렸다(759-① «흔들리는 값에서 뽑은 문턱은 같이 흔들린다»)',
     'TOL_FLOOR ' + RUL.TOL_FLOOR + ' · K ' + RUL.K + ' · SHAKE_UNIT ' + RUL.SHAKE_UNIT);

  /* ── [4] 라이브 — 새 판정 셋의 여유를 값으로(791-③) ───── */
  const browser = await launch();
  const errs = [];
  const dress = rows => rows.map(x => Object.assign({}, x, {
    tol: +RUL.tolOf(x.spread, RUL.K).toFixed(3), off: +RUL.offOf(x.mean, x.decl).toFixed(3) }));
  let signMin = Infinity, sceneMin = Infinity, bandMax = 0, oldMin = Infinity, live = 0;
  for (let r = 0; r < REPS; r++) {
    const p1 = await open(browser, URL);
    p1.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const free = dress(await RUL.measure(p1, IDS, {}));
    await p1.context().close();
    const p2 = await open(browser, URL);
    const fix = dress(await RUL.measure(p2, IDS, { freeze: true }));
    await p2.context().close();
    if (newSign(free) && newScene(free, fix) && newBand(fix)) live++;
    free.forEach(x => {
      /* 부호 항의 여유는 **선언 ÷ 최고 표본**이다(1.00 이 되는 실행이 뒤집힘 — 그 항이 묻는 것 자체) */
      signMin = Math.min(signMin, x.decl / Math.max(1e-9, Math.max(...x.each)));
      oldMin = Math.min(oldMin, (x.off * 2 * Math.sqrt(RUL.K)) / Math.max(1e-9, x.spread));
      sceneMin = Math.min(sceneMin, x.off / Math.max(1e-9, fix.find(y => y.id === x.id).off || 0.005));
    });
    fix.forEach(x => { bandMax = Math.max(bandMax, x.off); });
    console.log('     [4] rep' + (r + 1) + ' 자유 '
      + free.map(x => x.id + ' 이탈' + (x.off * 100).toFixed(0) + '/폭' + (x.spread * 100).toFixed(0)).join(' ')
      + ' ↔ 고정 ' + fix.map(x => x.id + ' 이탈' + (x.off * 100).toFixed(0) + '/폭' + (x.spread * 100).toFixed(0)).join(' '));
  }
  ok(live === REPS,
     '4 라이브 — R회 전부에서 새 판정 셋(부호·장면 대조·고정 밴드)이 같이 초록이다',
     live + '/' + REPS + '회 · 부호 여유(선언÷최고 표본) 최소 ×' + signMin.toFixed(2) + '(1.00 이 뒤집힘)'
     + ' · 장면비 최소 ×' + sceneMin.toFixed(1) + ' · 고정 이탈 최대 ' + (bandMax * 100).toFixed(0)
     + '%(밴드 ' + (RUL.TOL_FLOOR * 100).toFixed(0) + '%)');
  ok(oldMin > 1,
     '4-b 옛 축은 그 실행들에서 **아직** 안 뒤집혔다(등재문 «아직 안 넘었다» 확인) — 그러나 여유는 폭 하나에 물려 있다',
     '뒤집히는 폭 ÷ 실측 폭 최소 ×' + oldMin.toFixed(2) + ' (1.00 이 되는 실행이 뒤집힘)');
  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
