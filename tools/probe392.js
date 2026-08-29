/* 작업 392 재현 — `verify345` §1 [전제] «두 프레임 다 배율 1.0» 이 간헐 FAIL 하는 이유
 *
 *   node tools/probe392.js   → 마지막 줄이 `PROBE392 n/n` (관측만 — 판정은 verify345 가 한다)
 *
 * 등재문 서명: 빨간 항은 예외 없이 §1 [전제] 하나이고, 걸리는 화면이 실행마다 바뀐다.
 * 물어야 할 것은 «제품이 안 도는가» 가 아니라 **«게이트의 두 표본이 언제 착지하는가»** 다.
 *
 * [A] 제품 쪽 — 페이지 «안» 의 rAF 로 닫힘 연출을 프레임 단위로 녹화한다(CDP 왕복이 안 낀다).
 *     연출이 실제로 도는지 · 축소가 보이는 창이 몇 ms 인지를 잰다.
 * [B] 게이트 쪽 — `verify345` 와 **똑같은 순서**(waitForTimeout(40) → evaluate)로 두 표본을 뜨고
 *     그 표본이 closeModal() 로부터 몇 ms 에 착지했는지를 페이지 시계로 되받는다.
 * [C] 두 자를 겹쳐 «표본이 창 밖에 선 실행» 을 센다 — 그것이 곧 [전제] 가 빨개진 실행이다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — page.evaluate 예외는 즉사시키지 말고 그 절만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };

const SHELLS = [
  ['ml69', 'openMail()', '69 우편함'],
  ['q22', 'openQuest()', '22 퀘스트'],
  ['at70', 'openAttend()', '70 출석'],
  ['sk8', 'showSkillDetail(Object.keys(SK)[0])', '08 스킬 세부'],
  ['rl16', 'openRoulette()', '16 룰렛(대조군)'],
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const run = (src) => ev((s) => { try { (0, eval)(s); } catch (e) { return { __err: String(e.message || e) }; } return 1; }, src);

  const rows = [];

  for (const [cls, open, name] of SHELLS) {
    const o = await run(open);
    if (o && o.__err) { no(name + ' 열기 실패: ' + o.__err); continue; }
    await page.waitForTimeout(420);

    /* [A] 페이지 «안» 녹화 — closeModal() 을 같은 evaluate 안에서 부르므로 t0 이 정확하다 */
    const A = await ev(() => new Promise((res) => {
      const m = document.getElementById('modal');
      const b = m && m.querySelector('.mbox');
      if (!m || !b) return res({ __err: '#modal/.mbox 없음' });
      const O = b.getBoundingClientRect();
      const rec = [];
      const t0 = performance.now();
      closeModal();
      const tick = () => {
        const r = b.getBoundingClientRect();
        const d = getComputedStyle(m).display;
        rec.push({ t: +(performance.now() - t0).toFixed(1), sx: O.width ? r.width / O.width : 0, disp: d });
        if (performance.now() - t0 < 500) requestAnimationFrame(tick);
        else res({ ow: O.width, oh: O.height, rec });
      };
      requestAnimationFrame(tick);
    }));
    if (A && A.__err) { no(name + ' [A] 녹화 실패: ' + A.__err); continue; }
    await page.waitForTimeout(400);

    /* 축소가 «보이는» 창 — 게이트의 판정식 그대로 (disp!=none 이고 sx<0.999) */
    const vis = A.rec.filter((f) => f.disp !== 'none' && f.sx < 0.999);
    const live = A.rec.filter((f) => f.disp !== 'none');
    const winA = vis.length ? vis[0].t : -1;
    const winB = vis.length ? vis[vis.length - 1].t : -1;
    const endT = live.length ? live[live.length - 1].t : -1;
    const gapMax = A.rec.slice(1).reduce((g, f, i) => Math.max(g, f.t - A.rec[i].t), 0);

    /* [B] 게이트와 똑같은 순서로 두 표본 — 착지 시각을 페이지 시계로 되받는다 */
    const o2 = await run(open);
    if (o2 && o2.__err) { no(name + ' 재열기 실패: ' + o2.__err); continue; }
    await page.waitForTimeout(420);
    await ev(() => { window.__p392 = performance.now(); closeModal(); });
    const S = [];
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(40);
      S.push(await ev(() => {
        const m = document.getElementById('modal'), b = m && m.querySelector('.mbox');
        const r = b ? b.getBoundingClientRect() : { width: 0 };
        return { t: +(performance.now() - window.__p392).toFixed(1), w: r.width, disp: getComputedStyle(m).display };
      }));
    }
    await page.waitForTimeout(400);

    const land = S.map((s) => (s && !s.__err ? s.t : -1));
    const inWin = land.filter((t) => t >= 0 && winA >= 0 && t >= winA && t <= winB).length;

    rows.push({ name, winA, winB, endT, gapMax, frames: live.length, land, inWin });
    console.log('\n[' + name + '] 연출 프레임 ' + live.length + '장 · 축소가 보이는 창 '
      + winA.toFixed(1) + '..' + winB.toFixed(1) + 'ms · display 살아 있는 마지막 ' + endT.toFixed(1)
      + 'ms · 최대 프레임 간격 ' + gapMax.toFixed(1) + 'ms');
    console.log('       게이트 두 표본 착지 = ' + land.map((t) => t.toFixed(1) + 'ms').join(' · ')
      + '  → 창 «안» ' + inWin + '/2');

    (live.length >= 2)
      ? ok(name + ' — 제품 연출은 돈다(살아 있는 프레임 ' + live.length + '장, 최소 축소 배율 '
        + Math.min(...live.map((f) => f.sx)).toFixed(4) + ')')
      : no(name + ' — 제품 연출이 실제로 안 돈다(살아 있는 프레임 ' + live.length + '장)');
  }

  /* [C] 겹치기 — «게이트가 창 밖에 선» 자리 */
  console.log('\n══ [C] 두 자를 겹친다 — 창의 길이 vs 게이트 표본의 착지');
  const bad = rows.filter((r) => r.inWin === 0);
  console.log('  창 «안» 표본이 0개인 화면 ' + bad.length + '/' + rows.length
    + (bad.length ? ' → ' + bad.map((r) => r.name).join(', ') : ''));
  const shortest = rows.length ? Math.min(...rows.map((r) => r.winB - r.winA)) : -1;
  console.log('  가장 짧은 «축소가 보이는 창» = ' + shortest.toFixed(1) + 'ms'
    + ' · 가장 긴 프레임 간격 = ' + Math.max(...rows.map((r) => r.gapMax)).toFixed(1) + 'ms');
  const late = rows.filter((r) => r.land.every((t) => t > r.endT));
  (late.length === 0)
    ? ok('[C] 이 실행에서는 두 표본이 다 연출 뒤로 밀린 화면 0건')
    : no('[C] 두 표본이 **다** 연출 뒤로 밀린 화면 ' + late.length + '건 — ' + late.map((r) => r.name).join(', ')
      + ' (= 이 실행이라면 [전제] 가 빨갛다)');

  await browser.close();
  console.log('\nPROBE392 ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
