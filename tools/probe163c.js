/* 작업 163 11회차 — 그림자 배선 진단기.
 *
 * 왜 별도 도구인가: 11회차가 고친 네 자리(ⓐ 정지 보정 · ⓑ 접지 칸 월드 고정 · ⓒ 스쿼시 양자화 일치 ·
 * ⓓ air 부호)는 전부 **`#ldSh` 의 transform 이 시간축에서 어떻게 움직이나** 로만 보이는데,
 * 캡처 8장은 정지 상태(t ≥ ldRun)를 구조적으로 못 담는다 — 10회차 비평 Q·R 이 둘 다 그렇게 지적했다.
 * (Q: «표본 8장 중 t ≥ 560 인 것이 하나도 없다 — 브리핑 표본 집합이 이 결함을 구조적으로 못 보게 되어 있다»)
 *
 * ★ 반드시 «부팅하지 않는» 페이지에서 재야 한다. file:// 로 그냥 열면 아틀라스가 ~450ms 에 다 와서
 *   `ldRun` 이 LD_RUN 의 1/5(≈104ms)로 **압축**되고, 그 시계로 위상을 찍으면 엉뚱한 칸을 잰다.
 *   cap163.js 의 held 페이지와 **같은 방식**(png 라우팅 지연)으로 등장을 온전히 살려 둔다.
 *
 * 쓰기: node tools/probe163c.js [--gate]
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const HOLD_SLOW = 12000, FAST = 140;
const STAGGER = { 'bird.png': .10, 'stormlord-dragon96x64.png': .18, 'buch-dungeon-tileset.png': .28 };
const GATE = process.argv.includes('--gate');
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? pass++ : fail++; };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route('**/*.png', async (route) => {
    const n = route.request().url().split('/').pop();
    const d = /knight\.png$/.test(n) ? FAST / HOLD_SLOW : (STAGGER[n] !== undefined ? STAGGER[n] : 1);
    await new Promise(r => setTimeout(r, Math.round(HOLD_SLOW * d)));
    await route.continue();
  });
  page.goto(URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForFunction(() => {
    const cv = document.getElementById('ldHero');
    return !!(cv && cv.classList.contains('on'));
  }, null, { timeout: 30000 });

  const d = await page.evaluate(() => {
    LD.hold();
    const sh = document.getElementById('ldSh'), cv = document.getElementById('ldHero');
    const rd = (t) => {
      LD.paint(t);
      const m = /translateX\(([-\d.]+)px\) scale\(([-\d.]+), ?([-\d.]+)\)/.exec(sh.style.transform) || [];
      const h = /translate\(([-\d.]+)px, ?([-\d.]+)px\) scale\(([-\d.]+), ?([-\d.]+)\)/.exec(cv.style.transform) || [];
      return { t: t, sx: +m[1], ssx: +m[2], sop: +sh.style.opacity, hx: +h[1], arc: +h[2], hsx: +h[3] };
    };
    const rows = [];
    for (let t = 0; t <= 760; t += 0.5) rows.push(rd(t));
    return { rows: rows, run: LD.runMs(), land: LD.landAt() };
  });
  const R = d.rows, at = (t) => R.find(r => Math.abs(r.t - t) < 0.26);
  /* ★ 등장 길이는 **제품에게 묻는다**(LD.runMs). `x === 0` 으로 역산하면 반올림 때문에 ldRun 보다
     8ms 일찍 0 이 되어 «정지 자세» 판정이 한 칸 어긋난다 — 이 도구가 처음에 그렇게 틀렸다. */
  const RUN = d.run;
  console.log(`[i] 등장 길이(데이터에서 역산) ldRun = ${RUN}ms · 콘솔 에러 ${errs.length}`);

  /* ⓐ 정지 자세(t ≥ ldRun): 그림자 보정 = 0 이어야 한다 */
  console.log('\n[A] 정지 자세 그림자 보정 (10회차 결함 = +160px 항구 어긋남)');
  const still = R.filter(r => r.t >= RUN + 1);
  const worstA = still.reduce((a, r) => Math.max(a, Math.abs(r.sx - r.hx)), 0);
  still.filter(r => [RUN + 1, RUN + 40, RUN + 100, 700, 760].some(v => Math.abs(r.t - v) < 0.26))
    .forEach(r => console.log(`     t=${r.t}  히어로x=${r.hx}  그림자x=${r.sx}  보정=${(r.sx - r.hx).toFixed(1)}px`));
  ok(worstA <= 0.6, `★ 정지 자세에서 그림자 보정이 0 이다 (최대 ${worstA.toFixed(1)}px ≤ 0.6 · 되돌리면 +160px)`);

  /* ⓑ 접지 칸: 그림자 월드 좌표가 칸 안에서 고정 + 뒤로 튀지 않는다 */
  console.log('\n[B] 접지 칸 월드 고정 (10회차 결함 = 칸 경계마다 최대 −122.5px 역행)');
  /* ★ 창은 «등장 중»(t < ldRun) 이다. **도착 프레임(t = ldRun)은 일부러 뺀다** — 거기서는
     스프라이트가 run f4 → idle 로 바뀌면서 **그려진 접지발 자체가 −160px 움직이므로**(10회차 비평
     Q §D «한 프레임에 발 702 → 540 = −162px» · R §B) 그림자가 같이 −160px 가는 것이 **옳다**.
     10회차의 결함은 그 반대였다 — 발은 갔는데 그림자만 그 자리에 좌초했다. 아래 [B3] 이 그것을 가른다. */
  /* ★ 12회차 — 창을 «달리는 구간»(t < 착지)으로 좁혔다. 정착 구간(착지 ~ 도착)은 11회차까지
     보정이 `p < 1` 계단이라 **도착에서 −160px 한 방**이었는데, 12회차가 그것을 68.3ms 짜리
     **경사로**로 바꿨다(11회차 비평 S·T 의 공통 처방). 경사로는 «역행» 이 아니라 설계이므로
     여기서 세면 안 되고, 아래 [B4] 가 «계단이 아니라 경사로인가» 를 따로 잰다. */
  const LAND = d.land;
  let back = 0, worstB = 0, worstT = 0;
  for (let i = 1; i < R.length; i++) {
    if (R[i].t >= LAND) break;
    const dd = R[i].sx - R[i - 1].sx;
    if (dd < -1) { back++; if (dd < worstB) { worstB = dd; worstT = R[i].t; } }
  }
  console.log(`     역행(1px 초과) ${back}회 · 최대 ${worstB.toFixed(1)}px @t=${worstT}`);
  ok(back === 0, `★ 등장 중(t < ldRun) 그림자가 뒤로 «튀지» 않는다 (계단 ${back}회 · 되돌리면 7회 / −122.5px)`);
  /* 접지 구간의 월드 드리프트 — 발이 닿아 있는 동안 그림자는 월드에 못 박혀 있어야 한다 */
  let drift = 0;
  for (let i = 1; i < R.length; i++) {
    if (R[i].t >= LAND) break;
    if (R[i].arc === 0 && R[i - 1].arc === 0) drift = Math.max(drift, Math.abs(R[i].sx - R[i - 1].sx));
  }
  /* transform 은 `toFixed(1)`, 몸 x 는 정수로 반올림돼 있어 합이 1px 안에서 떨린다 — 그것이 하한이다 */
  ok(drift <= 1.05, `접지(arc=0) 구간에서 그림자 월드 이동이 0 이다 (프레임당 최대 ${drift.toFixed(2)}px ≤ 1.05 = 반올림 하한)`);

  /* [B3] 도착 프레임 — 그림자는 **포즈를 따라** 움직여야 한다(좌초하면 안 된다).
     보정값 `sx − hx` 가 도착 직전 (FEET[4] − FOOTC)·SC 였다가 도착에서 0 이 되는 것이 그 증거다. */
  /* [B4] ★ 12회차 — 정착 구간은 **계단이 아니라 경사로**여야 한다.
     착지에서 보정이 (FEET[f4] − FOOTC)·SC = 160px 이었다가 도착에서 0 이 되는데,
     11회차까지는 그 160px 이 **도착 한 프레임에** 사라졌다(S «겉보기 9.6px/ms = 등속의 5.0배인데
     몸은 이미 멈춰 있다» · T «−160.0px = 그림자 폭의 21.1%»). 이제 68.3ms 에 걸쳐 흐른다. */
  const atLand = R.find(r => r.t >= LAND), beforeArr = R.filter(r => r.t < RUN).pop(), afterArr = R.find(r => r.t >= RUN);
  const corrLand = atLand.sx - atLand.hx, corrBefore = beforeArr.sx - beforeArr.hx, corrAfter = afterArr.sx - afterArr.hx;
  /* 경사로의 최대 기울기(px/ms) — 두 사람이 처방한 값은 160px / 68.3ms ≈ 2.34px/ms(등속 1.90 과 같은 급) */
  let slope = 0;
  for (let i = 1; i < R.length; i++) {
    if (R[i].t < LAND || R[i].t > RUN) continue;
    slope = Math.max(slope, Math.abs(R[i].sx - R[i - 1].sx) / (R[i].t - R[i - 1].t));
  }
  console.log(`     착지 보정 ${corrLand.toFixed(1)}px → 도착 직전 ${corrBefore.toFixed(1)}px → 도착 ${corrAfter.toFixed(1)}px · 최대 기울기 ${slope.toFixed(2)}px/ms`);
  ok(Math.abs(corrLand) > 100 && Math.abs(corrBefore) <= 3 && Math.abs(corrAfter) <= 0.6,
    `★ 정착 구간이 경사로다 (${corrLand.toFixed(1)} → ${corrBefore.toFixed(1)} → ${corrAfter.toFixed(1)}px · 11회차는 160 → 160 → 0 계단이었다)`);
  ok(slope <= 3.0,
    `★ 그 경사로가 «몸 등속(1.90px/ms)과 같은 급» 이다 (최대 ${slope.toFixed(2)}px/ms ≤ 3.0 · 계단이면 9.6 이상)`);

  /* ⓒ 스쿼시 양자화: air=0 인 구간에서 그림자 가로배율 = 스프라이트 가로배율 */
  console.log('\n[C] 스쿼시 양자화 일치 (10회차 결함 = 회복 중 4.0~4.2pp 차)');
  let worstC = 0, cT = 0;
  R.forEach(r => { if (r.arc === 0 && r.t <= RUN + 200) { const dd = Math.abs(r.ssx - r.hsx); if (dd > worstC) { worstC = dd; cT = r.t; } } });
  [RUN - 60, RUN - 20, RUN + 2, RUN + 6].forEach(t => { const r = at(Math.round(t * 2) / 2); if (r) console.log(`     t=${r.t}  히어로sx=${r.hsx}  그림자sx=${r.ssx}  차=${((r.ssx - r.hsx) * 100).toFixed(2)}pp`); });
  ok(worstC <= 0.001, `★ 그림자 팽창 = 스프라이트 스쿼시 (최대 차 ${(worstC * 100).toFixed(2)}pp @t=${cT} · 되돌리면 4.02pp)`);

  /* ⓓ air 부호: 발이 바닥에 있는(arc ≥ 0) 프레임에서 그림자가 안 줄고 안 옅어진다 */
  console.log('\n[D] air 부호 (10회차 결함 = 이·착지 순간 −3.9% / −9.6%)');
  const ground = R.filter(r => r.t <= RUN && r.arc >= 0);
  const minS = Math.min.apply(null, ground.map(r => r.ssx));
  const minO = Math.min.apply(null, ground.map(r => r.sop));
  ok(minS >= 0.999, `접지 프레임에서 그림자가 안 줄어든다 (최소 배율 ${minS.toFixed(3)} · 되돌리면 0.968)`);
  ok(minO >= 0.999, `접지 프레임에서 그림자가 안 옅어진다 (최소 불투명도 ${minO.toFixed(3)} · 되돌리면 0.920)`);
  /* 체공 정점에서는 여전히 줄고 옅어져야 한다(«고쳤더니 신호가 통째로 죽었다» 방지) */
  const airMin = Math.min.apply(null, R.filter(r => r.t <= RUN).map(r => r.ssx));
  ok(airMin <= 0.93, `체공 정점에서는 여전히 줄어든다 (최소 배율 ${airMin.toFixed(3)} ≤ 0.93)`);

  ok(errs.length === 0, `콘솔 에러 0 (실제 ${errs.length})`);
  await browser.close();
  console.log(`\nPROBE163C ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  if (GATE && fail) process.exit(1);
})();
