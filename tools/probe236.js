#!/usr/bin/env node
/* 작업 236 실측 자 — 읽기 전용(제품·게이트를 고치지 않는다).
 *
 *   node tools/probe236.js
 *
 * verify107 [I] 가 «드래그 n → 3초 뒤 n±k 로 되돌아갔다» 로 빨간 이유를 «언제·얼마나»
 * 로 가른다. 게이트는 「손 뗀 뒤 900ms」 한 점과 「+3000ms」 한 점, 두 점만 본다.
 * 여기서는 손을 뗀 순간부터 4초를 50ms 간격으로 훑어 궤적을 통째로 찍는다.
 *   · 궤적이 «단조 증가 후 정착» 이면 = 95 관성(dsFling)이 900ms 에 아직 안 멎은 것
 *     (제품 정상 · 게이트의 대기 시간이 짧다)
 *   · 궤적이 «갔다가 되돌아온다/0 으로 튄다» 면 = 107 이 고친 복원이 되돌아간 것(제품 회귀)
 * 재렌더(본문 childList 변이) 시각도 같이 찍어 «튀는 순간 = 재렌더 순간» 인지 본다.
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const br = await launch(chromium);
  const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await pg.goto(URL);
  await pg.waitForTimeout(2600);
  await pg.evaluate(`gmHero('sk')`);
  await pg.waitForTimeout(800);

  const info = await pg.evaluate(() => {
    const gp = document.querySelector('#bSk .sk-gp');
    const r = gp.getBoundingClientRect();
    return { max: gp.scrollHeight - gp.clientHeight, x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height,
             damp: typeof DS_DAMP !== 'undefined' ? DS_DAMP : null,
             vmax: typeof DS_VMAX !== 'undefined' ? DS_VMAX : null,
             vmin: typeof DS_VMIN !== 'undefined' ? DS_VMIN : null };
  });
  console.log('격자 max ' + info.max + ' · DS_DAMP ' + info.damp + ' · DS_VMAX ' + info.vmax + ' · DS_VMIN ' + info.vmin);

  /* 궤적 기록기 — 손을 뗀 직후부터 rAF 마다 scrollTop(소수점 포함)·dsGlide 살아있음·재렌더 변이수 */
  await pg.evaluate(() => {
    window.__trace = [];
    const gp0 = document.querySelector('#bSk');
    window.__mn = 0;
    window.__ob = new MutationObserver(ms => { for (const m of ms) if (m.type === 'childList') window.__mn++; });
    window.__ob.observe(gp0, { childList: true, subtree: true });
    window.__t0 = performance.now();
    window.__rec = () => {
      const gp = document.querySelector('#bSk .sk-gp');
      window.__trace.push([Math.round(performance.now() - window.__t0),
                           gp ? +gp.scrollTop.toFixed(2) : -1,
                           (typeof dsGlide !== 'undefined' && dsGlide) ? 1 : 0,
                           window.__mn]);
      window.__raf = requestAnimationFrame(window.__rec);
    };
  });

  /* verify107 [I] 와 동일한 드래그 */
  await pg.evaluate(() => { document.querySelector('#bSk .sk-gp').scrollTop = 0; });
  await pg.mouse.move(info.x, info.y + info.h * 0.35);
  await pg.mouse.down();
  for (let i = 1; i <= 8; i++) { await pg.mouse.move(info.x, info.y + info.h * 0.35 - i * 40); await pg.waitForTimeout(16); }
  await pg.mouse.up();
  await pg.evaluate(() => { window.__t0 = performance.now(); window.__mn = 0; window.__rec(); });
  await pg.waitForTimeout(4200);
  const tr = await pg.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__trace; });

  /* 값이 «바뀐 지점» 만 추린다 */
  let prev = null;
  const rows = [];
  for (const [t, v, g, n] of tr) { if (prev === null || v !== prev) { rows.push([t, v, g, n]); prev = v; } }
  console.log('\n손 뗀 뒤 궤적 (값이 바뀐 프레임만) — t(ms) scrollTop glide 변이누적');
  for (const [t, v, g, n] of rows) console.log('  ' + String(t).padStart(5) + '  ' + String(v).padStart(9) + '  ' + (g ? 'glide' : '  -  ') + '  ' + n);
  const last = tr[tr.length - 1];
  const at900 = tr.find(r => r[0] >= 900) || last;
  console.log('\n요약');
  console.log('  프레임 수 ' + tr.length + ' · 마지막 t ' + last[0] + 'ms');
  console.log('  t≈900ms  scrollTop ' + at900[1] + ' (round ' + Math.round(at900[1]) + ') glide=' + at900[2]);
  console.log('  t≈3900ms scrollTop ' + last[1] + ' (round ' + Math.round(last[1]) + ') glide=' + last[2]);
  console.log('  Δ(900→끝) ' + (+(last[1] - at900[1]).toFixed(2)) + 'px · 이 구간 재렌더 변이 ' + (last[3] - at900[3]) + '건');
  const glideEnd = [...tr].reverse().find(r => r[2] === 1);
  console.log('  관성(glide)이 살아 있던 마지막 프레임 t=' + (glideEnd ? glideEnd[0] : '(없음)') + 'ms');
  const mono = rows.every((r, i) => i === 0 || r[1] >= rows[i - 1][1]);
  console.log('  궤적 단조 증가(되돌아감 없음): ' + (mono ? 'YES' : 'NO'));
  console.log('  콘솔 에러 ' + errs.length + '건');
  await br.close();
})();
