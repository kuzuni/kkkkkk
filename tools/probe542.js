#!/usr/bin/env node
/* 542 재현기 — `verify158` [A~C]·[F] 의 «발원 좌표 = 킬 자리» 가 왜 흔들리는가.
 *
 *   node tools/probe542.js
 *
 * 등재문 가설: 자의 씬이 «합성 킬 → (창) → 발사» 를 재는데, 그 창 동안 **배경 자동 전투의 진짜 킬**이
 *   하나 끼면 제품이 규약대로 `fxAccSrc` 를 **마지막 킬 자리**로 갱신한다(index.html 35545
 *   «매 증가마다 갱신하므로 연속 킬에서는 마지막 킬 자리가 남고»). 즉 흔들리는 것은 제품이 아니라
 *   **씬의 격리**다. 자가 «탭이 가로챘다» 고 말하지만 실제로는 combat 태그가 살아 있다.
 *
 * 이 재현기가 찍는 것:
 *   [1] 씬을 **격리 없이**(현행 자 그대로) 8회 — 창 동안 끼어든 진짜 킬 수 · 발사 발원 · 킬 자리와의 거리 ·
 *       그 발원이 여전히 combat 인가.
 *   [2] 씬을 **격리하고**(enemies·spawnQ 를 창 내내 비운다) 8회 — 끼어듦 0 · 거리 0 이어야 한다.
 *   [3] 되돌림 시험 — 격리한 채로 «진짜 킬» 을 창 한복판에 **일부러 하나** 넣으면 다시 어긋나야 한다
 *       (안 어긋나면 [2] 의 초록이 «격리 덕» 이 아니라 «자가 물러진 것» 이다).
 */
const path = require('path');
const fs = require('fs');
const { launch: pwLaunch } = require('./pwlaunch');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

const SCENE = `
window.__p542 = async (opt) => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const raf  = () => new Promise(r => requestAnimationFrame(() => r()));
  const L = document.getElementById('fxl'), LC = document.getElementById('fxlc');
  L.innerHTML = ''; LC.innerHTML = ''; fxFlies.length = 0;
  for (const k in fxAcc) { fxAcc[k] = 0; fxAccSrc[k] = null; }

  /* fxFly 의 인자가 «묶음이 실제로 쓴 발원» 의 유일한 진실이다(자와 같은 규약) */
  if (!window.__p542w) {
    window.__p542w = true; window.__p542fly = [];
    const orig = window.fxFly;
    window.fxFly = function (from, cur, n) {
      window.__p542fly.push({ cur, n, combat: !!(from && from.combat), x: from ? from.x : null, y: from ? from.y : null });
      return orig.apply(this, arguments);
    };
    /* 끼어드는 «진짜 킬» 을 센다 — killEnemy 가 부르는 fxAt(…, 'combat') 이 유일한 자국이다 */
    window.__p542at = [];
    const oat = window.fxAt;
    window.fxAt = function (t, tag) {
      window.__p542at.push({ tag: tag || null, t: performance.now(), synth: !!window.__p542synth });
      return oat.apply(this, arguments);
    };
  }
  window.__p542fly.length = 0; window.__p542at.length = 0;
  /* 자와 같은 규약으로 «앞선 묶음» 이 남아 있는지 본다 — 자는 fxFly 로그의 **첫** gold 를 고른다 */

  let stop = null;
  if (opt.isolate) {
    /* 창 내내 비워 둔다 — 한 번만 비우면 창(320~700ms) 안에 새로 스폰된 적이 다시 죽을 수 있다 */
    const clear = () => { enemies.length = 0; spawnQ.length = 0; };
    clear();
    const iv = setInterval(clear, 16);
    stop = () => clearInterval(iv);
  }

  const KX = 300, KY = 1500;
  const btn = document.querySelector('#tabbar .tab');
  const br = btn.getBoundingClientRect();
  btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: br.left + br.width / 2, clientY: br.top + br.height / 2 }));
  await wait(140);
  const mark = window.__p542at.length;
  window.__p542synth = true;
  fxAt({ x: KX, y: KY }, 'combat');
  window.__p542synth = false;
  S.gold += 500;
  const t0 = performance.now();
  while (performance.now() - t0 < 700) { /* [F] 와 같은 정지 */ }
  if (opt.intrude) {                        /* [3] 되돌림 — 창 한복판에 «진짜 킬» 을 하나 */
    fxAt({ x: 900, y: 400 }, 'combat'); S.gold += 7;
  }
  await wait(320);
  if (stop) stop();

  /* 합성 킬 이후에 들어온 combat 자국 = 끼어든 진짜 킬(+ 되돌림에서 일부러 넣은 것) */
  const after = window.__p542at.slice(mark + 1).filter(e => e.tag === 'combat').length;
  const before = window.__p542at.slice(0, mark).filter(e => e.tag === 'combat').length;
  const golds = window.__p542fly.filter(e => e.cur === 'gold');
  const shot = golds[0] || null;                 /* 자와 같은 «첫 gold» — 여기가 두 번째 구멍이다 */
  const last = golds[golds.length - 1] || null;  /* 합성 킬이 실제로 탄 묶음 */
  const app = document.getElementById('app').getBoundingClientRect();
  const sc = app.width / 1080;
  const bp = { x: (br.left + br.width / 2 - app.left) / sc, y: (br.top + br.height / 2 - app.top) / sc };
  const d = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y) : -1;
  const fp = shot && shot.x != null ? { x: shot.x, y: shot.y } : null;
  const lp = last && last.x != null ? { x: last.x, y: last.y } : null;
  return { intruded: after, pre: before, golds: golds.length, combat: shot ? shot.combat : null,
           dKill: Math.round(d(fp, { x: KX, y: KY })), dTap: Math.round(d(fp, bp)),
           dKillLast: Math.round(d(lp, { x: KX, y: KY })) };
};`;

const N = 8;

(async () => {
  const browser = await pwLaunch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(SCENE);

  const run = async (opt) => {
    const rs = [];
    for (let i = 0; i < N; i++) { rs.push(await page.evaluate((o) => window.__p542(o), opt)); await page.waitForTimeout(300); }
    return rs;
  };

  console.log(`[1] 격리 없음(현행 자와 같은 씬) — ${N}회`);
  const bare = await run({ isolate: false, intrude: false });
  bare.forEach((r, i) => console.log(`  · #${i + 1} 창 앞 킬 ${r.pre}건 · 창 안 킬 ${r.intruded}건 · gold 묶음 ${r.golds}개 · combat=${r.combat} · 킬까지 ${r.dKill}px(마지막 묶음 ${r.dKillLast}px) · 탭까지 ${r.dTap}px`));
  const bad = bare.filter((r) => r.dKill >= 4);
  if (bad.length) ok(`어긋난 시행 ${bad.length}/${N} — 자의 플레이키가 재현됐다`);
  else fail(`${N}회 전부 초록이라 이 트리에서는 재현이 안 됐다(창을 늘리거나 회수를 올려라)`);
  /* 구멍이 둘이다 —
     ⓐ 창 **안** 의 진짜 킬이 스냅샷을 덮는다(제품 규약: «연속 킬에서는 마지막 킬 자리»)
     ⓑ 창 **앞** 의 진짜 킬이 자기 묶음을 먼저 쏘는데, 자가 fxFly 로그의 **첫** gold 를 고른다 */
  const A = bad.filter((r) => r.intruded > 0), B = bad.filter((r) => r.intruded === 0);
  if (bad.length && bad.every((r) => r.intruded > 0 || r.golds > 1))
    ok(`어긋난 시행은 예외 없이 ⓐ 창 안 킬(${A.length}건) 또는 ⓑ 앞선 묶음(${B.length}건, gold 묶음 2개 이상)이다 — 가설 확인 · **구멍은 둘**`);
  else fail(`설명 안 되는 시행이 있다 — 다른 뿌리다 (${JSON.stringify(bad.filter(r => !r.intruded && r.golds <= 1))})`);
  if (B.length && B.every((r) => r.dKillLast < 4))
    ok(`ⓑ 시행은 **마지막** 묶음으로 재면 오차 0 — 제품은 옳고 자가 남의 묶음을 봤다`);
  if (bad.length && bad.every((r) => r.combat === true))
    ok('어긋난 시행도 발원 태그는 **combat 이다** — 자의 «탭이 가로챘다» 는 문구가 거짓이다');
  else if (bad.length) fail('어긋난 시행의 발원에 combat 이 아닌 것이 섞였다 — 탭 가로채기가 실재한다');
  if (bad.every((r) => r.dTap > r.dKill))
    ok('어긋난 시행에서도 «탭까지» 가 «킬까지» 보다 멀다 — 발원은 탭이 아니라 다른 킬 자리다');

  console.log(`\n[2] 격리(enemies·spawnQ 를 창 내내 비운다) — ${N}회`);
  const iso = await run({ isolate: true, intrude: false });
  iso.forEach((r, i) => console.log(`  · #${i + 1} 끼어든 진짜 킬 ${r.intruded}건 · combat=${r.combat} · 킬까지 ${r.dKill}px`));
  if (iso.every((r) => r.intruded === 0)) ok(`${N}회 전부 끼어듦 0`);
  else fail(`격리했는데도 끼어든 시행이 있다 (${iso.filter(r => r.intruded).length}건)`);
  if (iso.every((r) => r.dKill >= 0 && r.dKill < 4)) ok(`${N}회 전부 발원 = 킬 자리(오차 <4px)`);
  else fail(`격리했는데도 어긋난 시행이 있다 (${JSON.stringify(iso.filter(r => r.dKill >= 4))})`);

  console.log('\n[3] 되돌림 — 격리한 채 창 한복판에 «진짜 킬» 을 일부러 하나');
  const rev = await page.evaluate((o) => window.__p542(o), { isolate: true, intrude: true });
  console.log(`  · 끼어든 진짜 킬 ${rev.intruded}건 · combat=${rev.combat} · 킬까지 ${rev.dKill}px`);
  if (rev.dKill >= 4) ok('일부러 넣으니 다시 어긋난다 — [2] 의 초록은 «격리 덕» 이다');
  else fail('일부러 넣었는데도 초록이다 — 이 자는 아무것도 안 재고 있다');

  await browser.close();
  console.log('');
  if (fails.length) { console.log(`PROBE542 FAIL (${fails.length})`); process.exit(1); }
  console.log('PROBE542 PASS');
})().catch((e) => { console.error(e); process.exit(2); });
