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
 * ⚑ 806(2026-09-02) — §1 의 «세로 37» 이 **상수라서** 빨개졌다(33/34 · `by30`).
 *   제품은 옳다: **558**(`--wm-sk` — 눌린 프레임의 여유 14 를 위/아래 7/7 로 나눔)이 1600 에서
 *   `#wpnw` 위 패딩을 126 → 119 로 줄여 **05 상자를 통째로 7px 올렸다**(실측 대조 — 476 당시 트리
 *   `9171c3a1` 에서 `.wm` top 156 · `#wpnGrid` 708..1129 → **1136**, 현재 top 149 · 1129.
 *   `#tuto` 는 두 트리 다 1099..1249 로 **한 픽셀도 안 움직였다** ⇒ 겹침 37 → 30).
 *   558 은 `verify467` [R2] 는 이관했지만 여기 굳어 있던 37 은 못 봤다.
 *   ⇒ **허용 오차를 넓히지 않고**(368 §R2) 상수를 뺐다 — 겹침은 이제 **제품에게 묻는다**
 *   (368 선례 «자리를 상수에서 뺀다» · 212-① «기대값은 근거 데이터에서»).
 *   기대값은 `#wpnGrid`·`#tuto` 의 실측 상자에서 나오고, 그 값이 probe351 의 `drawn` 과 같은
 *   값임을 **«접는 조상 0»** 항이 못박는다(clipped 사본을 두지 않는 이유 — 385 자매 자 드리프트).
 *
 * 본다:
 *   §0 전제   — 모듈이 있고, 두 자가 **그것을** 읽고, 사본이 남아 있지 않고, 문턱은 그대로다
 *   §1 재현   — `eqslot:*` 3화면의 D7 3건이 **그대로 3건**이고(거른 것 0) 셋 다 `이미 가려짐 0%→0%`
 *              겹침 px 은 상수가 아니라 **그 자리를 실측한 값**과 맞춘다(806)
 *   §2 되돌림 — `--covtest` ⓐ 양성(이미 가려진 탭바) · ⓑ 음성(멀쩡히 보이는 HUD)
 *   §3 두 자 일치 — 같은 자리를 `cover351lib` 로 재면 배너 보임 0%(2280·1600) = 유령의 근거
 *   §4 음성항 — 실재하는 자리(34 축복 띠 ↔ 탭바, 100% → 19.7%)는 이름표가 **안 붙는다**
 *   §R 되돌림 — `--wm-sk`(제품이 선언한 손잡이)를 0 으로 되돌리면 겹침이 **그 손잡이만큼** 늘어난다(806)
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

/* ⚑ 806 — §1 의 기대 겹침을 **제품에게 묻는** 자.
   probe351 D7 은 `#wpnGrid` 의 «지금 실제로 그려지는» 상자(drawn — 조상 클리핑을 접은 것)와
   `#tuto` 의 겹침을 잰다. 여기서 `clipped` 를 베끼면 자가 둘이 되어 385(자매 자 드리프트)를
   그대로 다시 만든다 ⇒ **베끼지 않고**, «이 자리에는 자르는 조상이 0 개» 임을 먼저 단언한다.
   그게 참인 동안 drawn = raw 이므로 raw 파생 기대값이 곧 probe 가 내야 할 값이다.
   («0 개» 가 깨지면 그 항이 빨개져 **어느 정의가 움직였는지**를 이름으로 말한다 — 조용히 안 어긋난다.) */
const MEASOV = function () {
  const g = document.querySelector('#wpnGrid');
  const t = document.getElementById('tuto');
  if (!g || !t) return { found: false, hasGrid: !!g, hasTuto: !!t };
  const gr = g.getBoundingClientRect(), tr = t.getBoundingClientRect();
  let cut = 0;
  for (let p = g.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
    const pr = p.getBoundingClientRect();
    if (cs.overflowY !== 'visible' && (pr.top > gr.top + 0.01 || pr.bottom < gr.bottom - 0.01)) cut++;
    if (cs.overflowX !== 'visible' && (pr.left > gr.left + 0.01 || pr.right < gr.right - 0.01)) cut++;
  }
  /* 558 의 손잡이도 **제품에게 묻는다** — §R 이 «되돌리면 이만큼 움직인다» 를 손 상수로 적으면
     그 상수가 곧 다음 부패다(이 작업이 고친 것과 같은 얼굴).
     ⚠ `getComputedStyle(...).getPropertyValue('--wm-sk')` 는 **못 쓴다** — 등록되지 않은 사용자 속성의
     계산값은 `clamp(…)` **문자열 그대로**라 `parseFloat` 가 0 을 준다(1회차에 이 함정을 밟아 §R 이
     «기대 0 · 실제 7» 로 빨갰다). ⇒ 그 값을 길이로 쓰는 **탐침 노드**를 심어 실제로 잰다. */
  const w = document.getElementById('wpnw');
  const pin = document.createElement('div');
  pin.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:var(--wm-sk,0px)';
  w.appendChild(pin);
  const sk = pin.getBoundingClientRect().height;
  pin.remove();
  return {
    found: true, cut, sk,
    by: Math.round(Math.min(gr.bottom, tr.bottom) - Math.max(gr.top, tr.top)),
    wide: Math.round(Math.min(gr.right, tr.right) - Math.max(gr.left, tr.left)),
  };
};

(async () => {
  const browser = await launch(chromium);
  try {
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
  /* 기대 겹침은 **1600 에서** 잰다 — D7 은 «1600 에서만 나빠진 것» 을 내는 차분이라
     겹치는 프레임이 짧은 쪽뿐이다(2280 은 겹침 자체가 음수 — 위 §3 이 같은 자리를 다시 연다). */
  const exp = await (async () => {
    const { ctx, page } = await fresh(browser, 1080, 1600);
    await drive(page, { label: 'eqslot:weapon', hero: '#eqCards [data-eqslot="weapon"]' });
    await settle(page);
    const m = await page.evaluate(MEASOV);
    await ctx.close();
    return m;
  })();
  ok(exp.found, '[1] 기대값을 물을 두 노드(`#wpnGrid`·`#tuto`)가 1600 에 살아 있다',
    JSON.stringify(exp));
  eq('[1] `#wpnGrid` 를 자르는 조상이 0 개 ⇒ drawn = raw (probe351 과 같은 상자를 잰다)', exp.cut, 0);
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
  /* ⚑ 806 — 여기 «37» 이 상수로 박혀 있었고, 558(`--wm-sk`)이 05 상자를 7px 올리자 빨개졌다.
     허용 오차를 넓히는 대신(368 §R2 금지) **기대값을 제품에게 묻는다.** */
  ok(exp.by > 2 && exp.wide > 40,
    `그 겹침은 여전히 D7 문턱(세로 > 2 · 가로 > 40)을 넘는다 — 안 넘으면 §1 은 «0건» 으로 공허해진다`,
    `세로 ${exp.by} / 가로 ${exp.wide}`);
  ok(d7.every((d) => d.by === exp.by && d.wide === exp.wide),
    `겹침은 실측 그대로 세로 ${exp.by} · 가로 ${exp.wide} (상수 아님 — 806)`,
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
  {
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

    /* ── §R 되돌림 시험(806) — «상수를 뺐다» 가 말뿐이 아님을 못박는다 ──────────
       §1 의 기대값이 정말 **제품에서 읽힌 것**이라면, 제품을 되돌렸을 때 그 값도 되돌아가야 한다.
       558 이 만든 손잡이 `--wm-sk` 를 0 으로 되돌리면 05 상자가 그만큼 내려가고 겹침이 그만큼 는다
       (실측: 손잡이 7px · 겹침 30 → 37 = 등재문의 그 값). 값이 안 움직이면 어딘가에 아직 상수가 있다.
       ⚠ **여기에도 «7»·«37» 을 적지 않는다** — 적는 순간 이 작업이 고친 것과 같은 부패를 다시 심는다. */
    console.log('§R 되돌림 시험 — `--wm-sk` 를 0 으로 되돌리면 겹침이 그 손잡이만큼 늘어난다 (806)');
    const { ctx, page } = await fresh(browser, 1080, 1600);
    await drive(page, { label: 'eqslot:weapon', hero: '#eqCards [data-eqslot="weapon"]' });
    await settle(page);
    const now = await page.evaluate(MEASOV);
    const back = await page.evaluate(function () {
      document.getElementById('wpnw').style.setProperty('--wm-sk', '0px');
      return null;
    }).then(() => page.evaluate(MEASOV));
    await ctx.close();
    eq('[R] 되돌리기 전 겹침 = §1 이 쓴 실측값', now.by, exp.by);
    ok(now.sk > 0, `[R] 1600 에서 손잡이가 실제로 켜져 있다 (\`--wm-sk\` = ${now.sk}px · 0 이면 이 시험은 공허하다)`);
    eq('[R] 되돌린 판에서는 손잡이가 0 이다', back.sk, 0);
    /* ⚠ 여기 «7» 도 «37» 도 적지 않는다 — 늘어나는 양은 **제품이 선언한 손잡이 값** 그 자체다.
       (등재 당시 값 37 = 30 + 7 은 review 806 §5 에 기록만 남긴다. 다시 상수로 심으면 같은 부패다.) */
    eq('[R] 되돌리면 겹침이 손잡이만큼 늘어난다 (558 이 옮긴 그 값 — 상수 아님)',
      back.by - now.by, Math.round(now.sk));
    eq('[R] 가로는 `--wm-sk` 와 무관하다 (세로 손잡이다)', back.wide, now.wide);
  }
  } finally { await browser.close(); }

  console.log(`\nVERIFY476 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY476 CRASH', e); process.exit(2); });
