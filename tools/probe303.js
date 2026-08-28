#!/usr/bin/env node
/* probe303 — verify107 [I]ⓒ 의 «멎은 뒤에도 움직였다» 가 제품의 이동인지, 게이트가 자를
   한 프레임 일찍 댄 것인지를 가른다 (작업 303).

   [I] 는 손을 뗀 뒤 rAF 마다 [t, scrollTop, dsGlide] 를 적고, «dsGlide 가 1 로 적힌 마지막
   프레임» 의 scrollTop 을 기준으로 그 뒤 프레임이 움직였는지 본다. 그런데 한 프레임 안에서
   제품의 `step` 이 기록기 `rec` 보다 **먼저** 돈다 —

     step:  box.scrollTop = acc + sp*dt  →  sp *= 0.95^(dt/16.67)  →  |sp|<0.02 면 dsGlide = 0
     rec :  [t, scrollTop, dsGlide] 를 적는다

   그래서 «dsGlide=1 로 적힌 마지막 프레임» 은 **마지막 한 걸음을 아직 안 밟은** 값이고,
   그 한 걸음이 다음 프레임에 «멎은 뒤 움직였다» 로 잡힌다.
   걸음 크기 = sp*dt 이고 종료 조건이 «감쇠 후 |sp| < 0.02» 라 dt 에 정비례한다:
     dt 16.7ms → 0.02/0.95      * 16.7 = 0.35px   (문턱 0.5 아래 → 초록)
     dt 34ms   → 0.02/0.95^2.04 * 34   = 0.76px   (문턱 0.5 위   → 빨강)
   = 부하로 프레임이 길어질 때만 빨개지는 간헐 FAIL.

   이 프로브는 그 프레임 앞뒤를 통째로 찍어 두 기준점을 나란히 잰다.
     PROBE303_LOAD=n   페이지 안에 rAF 를 잡아먹는 부하 n 개를 심어 dt 를 34ms 로 밀어 올린다
     PROBE303_MS=ms    부하 1개가 한 프레임에서 잡아먹는 ms(기본 12)
     PROBE303_N=k      k 회 반복(기본 3)                                                     */
const path = require('path');
const fs = require('fs');
const { launch: pwLaunch } = require('./pwlaunch');   /* 291 — 정착 장치 공용 부트스트랩 */

const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const root = path.join(__dirname, '..');
  for (const d of ['.', 'node_modules/.pnpm']) {
    const p = path.join(root, d, 'node_modules', 'playwright');
    if (fs.existsSync(p)) return require(p);
  }
  console.error('playwright 없음 — npm i --no-save playwright@1.56.0'); process.exit(2);
})();

const URL = 'file://' + path.resolve(path.join(__dirname, '..', 'index.html')).replace(/\\/g, '/');
const LOAD = +(process.env.PROBE303_LOAD || 0);
const N = +(process.env.PROBE303_N || 3);
const MS = +(process.env.PROBE303_MS || 12);   /* 부하 1개가 한 프레임에서 잡아먹는 ms */
const I_WATCH = 4200;

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {}
  return {};
}

(async () => {
  const br = await pwLaunch(chromium, launchOpts());
  let oldBad = 0, newBad = 0;
  for (let run = 1; run <= N; run++) {
    const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    await pg.goto(URL);
    await pg.waitForTimeout(2600);
    await pg.evaluate(() => { gmHero('sk'); });
    await pg.waitForTimeout(800);
    /* rAF 를 실제로 잡아먹는 부하 — dt(=프레임 간격)를 34ms 상한까지 밀어 올린다 */
    if (LOAD) await pg.evaluate(({ n, ms }) => {
      window.__load = [];
      for (let i = 0; i < n; i++) {
        const spin = () => {
          const t = performance.now();
          while (performance.now() - t < ms) { /* busy */ }
          window.__load.push(requestAnimationFrame(spin));
        };
        window.__load.push(requestAnimationFrame(spin));
      }
    }, { n: LOAD, ms: MS });

    await pg.evaluate(() => { document.querySelector('#bSk .sk-gp').scrollTop = 0; });
    const box = await pg.evaluate(() => {
      const r = document.querySelector('#bSk .sk-gp').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
    });
    await pg.evaluate(() => {
      window.__tr = [];
      window.__rec = () => {
        const gp = document.querySelector('#bSk .sk-gp');
        window.__tr.push([Math.round(performance.now() - window.__t0),
                          gp ? +gp.scrollTop.toFixed(2) : -1,
                          (typeof dsGlide !== 'undefined' && dsGlide) ? 1 : 0]);
        window.__raf = requestAnimationFrame(window.__rec);
      };
    });
    await pg.mouse.move(box.x, box.y + box.h * 0.35);
    await pg.mouse.down();
    for (let i = 1; i <= 8; i++) { await pg.mouse.move(box.x, box.y + box.h * 0.35 - i * 40); await pg.waitForTimeout(16); }
    await pg.mouse.up();
    await pg.evaluate(() => { window.__t0 = performance.now(); window.__rec(); });
    await pg.waitForTimeout(I_WATCH);
    const tr = await pg.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__tr; });

    const gi = tr.map(r => r[2]).lastIndexOf(1);
    const dts = [];
    for (let i = 1; i < tr.length; i++) dts.push(tr[i][0] - tr[i - 1][0]);
    dts.sort((a, b) => a - b);
    const med = dts[dts.length >> 1];

    console.log('=== run ' + run + ' (부하 ' + LOAD + ') — 프레임 ' + tr.length +
                '개 · 프레임간격 중앙값 ' + med + 'ms · 관성 종료 idx ' + gi + ' (t=' + (gi < 0 ? 0 : tr[gi][0]) + 'ms)');
    console.log('  관성 종료 전후 프레임 [t, scrollTop, dsGlide]:');
    for (let i = Math.max(0, gi - 3); i <= Math.min(tr.length - 1, gi + 3); i++)
      console.log('    ' + (i === gi ? '→ ' : '  ') + 'idx ' + i + '  ' + JSON.stringify(tr[i]) +
                  (i === gi + 1 ? '   ← 관성이 멎은 것을 «본» 첫 프레임' : ''));

    /* 옛 기준점 = dsGlide 1 로 적힌 마지막 프레임 / 새 기준점 = 그 다음 프레임 */
    const span = (fromIdx) => {
      const rest = tr.slice(fromIdx);
      if (!rest.length) return null;
      const base = rest[0][1];
      let worst = 0;
      for (const r of rest) if (Math.abs(r[1] - base) > Math.abs(worst)) worst = r[1] - base;
      return { base, worst, moved: rest.filter(r => Math.abs(r[1] - base) > 0.5).length, n: rest.length };
    };
    const o = span(Math.max(0, gi)), n2 = span(gi + 1);
    console.log('  옛 기준(관성 마지막 프레임)   base ' + o.base + ' · 최대편차 ' + o.worst.toFixed(2) +
                'px · 0.5px 초과 프레임 ' + o.moved + '/' + o.n + (o.moved ? '   ✗ [I]ⓒ FAIL' : '   ✓'));
    console.log('  새 기준(멎은 뒤 첫 프레임)    base ' + n2.base + ' · 최대편차 ' + n2.worst.toFixed(2) +
                'px · 0.5px 초과 프레임 ' + n2.moved + '/' + n2.n + (n2.moved ? '   ✗' : '   ✓'));
    if (o.moved) oldBad++;
    if (n2.moved) newBad++;
    await ctx.close();
  }
  await br.close();
  console.log('\nPROBE303 — 옛 기준 FAIL ' + oldBad + '/' + N + ' · 새 기준 FAIL ' + newBad + '/' + N);
})();
