#!/usr/bin/env node
/* 작업 476 회귀 게이트 — «자 문제(유령)»: D7 이 **아무도 못 보는 내비**와의 기하 겹침을
 * «1600 에서만 나빠진 것» 으로 내던 자리.
 *   실행: node tools/verify476.js   → 마지막 줄이 `VERIFY476 n/n PASS` 여야 한다.
 *
 * 무엇을 고쳤나(제품 `index.html` 0줄 — 고친 것은 자 셋뿐이다):
 *   ① `tools/cover351lib.js` 신설 — «불투명 상자가 이 요소를 얼마나 덮었나» 를 **한 벌**로 잰다.
 *      `probe351`(D7)과 `verify419`(MEAS)가 그 한 벌을 페이지에 넣는다(385 «자매 자 드리프트»).
 *   ② `probe351` D7 에 이름표 셋째 칸 **«이미 가려짐»** — 두 해상도 **다** 보임 ≤ 0.05% 인
 *      내비와의 겹침. **거르지 않는다**(424-② — 필터로 넣으면 407·420 이 갚은 자리가 사라진다).
 *   ③ `--covtest` 되돌림 시험 — 이름표가 «켜지고» 또 «아무 데나 안 붙는다» 를 양쪽으로 못박는다.
 *
 * 본다:
 *   §0 전제   — 모듈이 있고, 두 자가 **그것을** 읽고, 사본이 남아 있지 않고, 문턱은 그대로다
 *   §1 재현   — `eqslot:*` 3화면의 D7 3건이 **그대로 3건**이고(거른 것 0) 셋 다 `이미 가려짐 0%→0%`
 *   §2 되돌림 — `--covtest` ⓐ 양성(이미 가려진 탭바) · ⓑ 음성(멀쩡히 보이는 HUD)
 *   §3 두 자 일치 — 같은 자리를 `cover351lib` 로 재면 배너 보임 0%(2280·1600) = 유령의 근거
 *   §4 음성항 — 실재하는 자리(34 축복 띠 ↔ 탭바, 100% → 19.7%)는 이름표가 **안 붙는다**
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');
const { COVER_SRC, GONE } = require('./cover351lib');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const P351 = fs.readFileSync(path.join(__dirname, 'probe351.js'), 'utf8');
const V419 = fs.readFileSync(path.join(__dirname, 'verify419.js'), 'utf8');
const LIB = fs.readFileSync(path.join(__dirname, 'cover351lib.js'), 'utf8');

const MEASVIS = function (opt) {
  const cover = new Function('return (' + opt.coverSrc + ')')();
  const el = opt.sel === '#tuto' ? document.getElementById('tuto') : document.querySelector(opt.sel);
  if (!el) return { visPct: null, found: false };
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return { visPct: null, found: false };
  const c = cover(el, el.getBoundingClientRect());
  return { visPct: c.visPct, n: c.n, found: true };
};

(async () => {
  /* ── §0 전제 — «한 벌» 이 말이 아니라 코드인가 ───────────────────────────── */
  console.log('§0 전제 — 덮임 계산이 한 벌이고, 두 자가 그것을 읽는다');
  ok(/module\.exports\s*=\s*\{[^}]*COVER_SRC/.test(LIB), '`cover351lib` 가 `COVER_SRC` 를 내보낸다');
  ok(/require\('\.\/cover351lib'\)/.test(P351), '`probe351` 이 그 모듈을 읽는다');
  ok(/require\('\.\/cover351lib'\)/.test(V419), '`verify419` 가 그 모듈을 읽는다');
  /* 사본이 남아 있으면 «한 벌» 은 말뿐이다 — 스윕의 지문(`covered += (x2 - x1) * cy`)을 센다 */
  const sweep = /covered \+= \(x2 - x1\) \* cy/g;
  eq('덮임 면적 스윕은 모듈에만 있다 (probe351 사본 0)', (P351.match(sweep) || []).length, 0);
  eq('덮임 면적 스윕은 모듈에만 있다 (verify419 사본 0)', (V419.match(sweep) || []).length, 0);
  eq('덮임 면적 스윕은 모듈에 정확히 한 벌', (LIB.match(sweep) || []).length, 1);
  /* 문턱은 한 칸도 안 넓혔다 — 넓히면 «건수가 준 것» 이 이름표 덕인지 문턱 덕인지 못 가린다 */
  ok(/if \(ov > 2 && ox > 40\) push\('D7'/.test(P351), 'D7 판정 문턱 `ov > 2 && ox > 40` 이 그대로다');
  ok(/if \(r\.width < 300 \|\| r\.height < 200\) continue;/.test(P351), 'D7 «다이얼로그·시트 급» 문턱 300×200 이 그대로다');
  ok(/w < 300 \|\| h < 200 \|\| w \* h < 120000/.test(LIB), '모듈도 같은 문턱(300×200 · 면적 120000)을 쓴다');
  /* 424-② — 이름표는 **분류**다. `axis` 로 거르는 코드가 있으면 안 된다 */
  ok(!/continue[^\n]*axis|axis[^\n]*continue/.test(P351), '`axis` 로 결함을 거르는 코드가 없다 (분류이지 필터가 아니다)');
  ok(/'이미 가려짐'/.test(P351), '셋째 이름표 «이미 가려짐» 이 선언돼 있다');

  /* ── §1 재현 — eqslot 3화면 ─────────────────────────────────────────────── */
  console.log('§1 재현 — `eqslot:*` 3화면: D7 3건 그대로 · 셋 다 «이미 가려짐 0%→0%»');
  const jf = path.join(os.tmpdir(), 'v476-eqslot.json');
  execFileSync(process.execPath, [path.join(__dirname, 'probe351.js'), '--only', 'eqslot', '--json', jf],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000 });
  const rows = JSON.parse(fs.readFileSync(jf, 'utf8'));
  try { fs.unlinkSync(jf); } catch (e) {}
  eq('화면 3개를 돌았다', rows.length, 3);
  const d7 = [].concat(...rows.map((r) => r.regress.filter((d) => d.kind === 'D7')));
  const all = [].concat(...rows.map((r) => r.regress));
  eq('1600 전용 결함은 여전히 3건이다 (거른 것 0건 — 424-②)', all.length, 3);
  eq('그 3건이 전부 D7 이다', d7.length, 3);
  ok(d7.every((d) => d.path === '#wpnGrid' && d.k === 'covers:tuto'),
    '자리는 등재문 그대로 `#wpnGrid` → `covers:tuto`', d7.map((d) => d.path + ' ' + d.k).join(' / '));
  ok(d7.every((d) => d.by === 37 && d.wide === 342), '겹침도 등재문 그대로 세로 37 · 가로 342',
    d7.map((d) => `by${d.by}/wide${d.wide}`).join(' / '));
  ok(d7.every((d) => d.axis === '이미 가려짐'), '셋 다 이름표가 «이미 가려짐»',
    d7.map((d) => d.axis).join(' / '));
  ok(d7.every((d) => d.navVis === '0%→0%'), '셋 다 보임 «0%→0%» (두 해상도 다 아무도 못 본다)',
    d7.map((d) => d.navVis).join(' / '));
  ok(d7.every((d) => d.navHit === '0%→0%'), '424 의 `navHit` 도 그대로 0%→0% (값 한 칸도 안 갈렸다)');

  /* ── §2 되돌림 시험 ─────────────────────────────────────────────────────── */
  console.log('§2 되돌림 시험 — `--covtest` ⓐ 양성 · ⓑ 음성 (435·424-③ · 종료 코드로 답한다)');
  let cov = '', covOk = true;
  try {
    cov = execFileSync(process.execPath, [path.join(__dirname, 'probe351.js'), '--only', 'tab:hero', '--covtest'],
      { cwd: ROOT, encoding: 'utf8', timeout: 900000 });
  } catch (e) { cov = String((e.stdout || '') + (e.stderr || '')); covOk = false; }
  ok(covOk, '`probe351 --only tab:hero --covtest` 종료 코드 0');
  ok(/\[covtest\] ⓐ .*OK/.test(cov), 'ⓐ 이미 가려진 탭바 위 상자 → «이미 가려짐» 이 켜진다 (죽은 이름표가 아니다)',
    (cov.match(/\[covtest\][^\n]*/g) || []).join(' | '));
  ok(/\[covtest\] ⓑ .*OK/.test(cov), 'ⓑ 멀쩡히 보이던 HUD 위 상자에는 **안 붙는다** (전부를 삼키지 않는다)');
  ok(/\[covtest\] PASS/.test(cov), '[covtest] PASS');

  /* ── §3·§4 두 자 일치 + 음성항 ─────────────────────────────────────────── */
  const browser = await launch(chromium);
  try {
    console.log('§3 두 자 일치 — 같은 자리를 공용 자로 재면 배너는 두 해상도 다 보임 0% (유령의 근거)');
    for (const H of [2280, 1600]) {
      const { ctx, page } = await fresh(browser, 1080, H);
      await drive(page, { label: 'eqslot:weapon', hero: '#eqCards [data-eqslot="weapon"]' });
      await settle(page);
      const m = await page.evaluate(MEASVIS, { sel: '#tuto', coverSrc: COVER_SRC });
      await ctx.close();
      ok(m.found, `[3][${H}] eqslot:weapon 에서 배너 노드가 살아 있다 (display 로 숨은 것이 아니다)`);
      eq(`[3][${H}] 배너 보임 %`, m.visPct, 0);
      ok(m.n >= 4, `[3][${H}] 그 배너를 덮은 불투명 상자가 여럿이다 (${m.n}개 — 06 시트가 그중 하나)`);
    }
    console.log('§4 음성항 — 실재하는 자리(34 축복 띠 ↔ 탭바)는 «이미 가려짐» 이 **안 붙는다**');
    const vals = {};
    for (const H of [2280, 1600]) {
      const { ctx, page } = await fresh(browser, 1080, H);
      await drive(page, { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' });
      await settle(page);
      const m = await page.evaluate(MEASVIS, { sel: '#tabbar', coverSrc: COVER_SRC });
      await ctx.close();
      vals[H] = m.visPct;
      ok(m.found, `[4][${H}] 탭바가 살아 있다`);
    }
    eq('[4][2280] 탭바는 온전히 보인다', vals[2280], 100);
    ok(vals[1600] > GONE && vals[1600] < 50,
      `[4][1600] 탭바가 실제로 가려졌다 = 실재하는 결함 (보임 ${vals[1600]}% · 문턱 ${GONE})`);
    ok(!(vals[2280] <= GONE && vals[1600] <= GONE),
      '[4] 이 자리는 «두 해상도 다 0%» 가 아니다 ⇒ 이름표가 붙을 수 없다 (424-② 의 대가를 안 치른다)');
  } finally { await browser.close(); }

  console.log(`\nVERIFY476 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY476 CRASH', e); process.exit(2); });
