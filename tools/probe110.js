#!/usr/bin/env node
/* 작업 110 — verify74 의 «몇 발 빗나감»(196~199/200) 이 진짜 탭 유실인지 하네스 페이스인지 가른다.
 *
 *   node tools/probe110.js            # 탭바(기본)
 *   PROBE=side node tools/probe110.js # 사이드 아이콘
 *   PROBE=shop node tools/probe110.js # 상점 카드 🔍
 *
 * 빗나간 탭마다 기록: 탭 직전 그 좌표의 최상위 요소 · click 이 실제로 발화한 요소 ·
 * 그 순간 돌고 있던 애니메이션 이름. «오버레이가 가로챘다» 면 페이스 문제고,
 * «대상은 맨 위에 있었는데 click 이 조상에서 났다» 면 74 계열의 진짜 유실이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const N = Number(process.env.TAP_N || 200);
const HOLD = Number(process.env.TAP_HOLD || 90);
const PROBE = process.env.PROBE || 'tab';

const CASES = {
  tab:  { sels: ['.tab[data-t="adv"]', '.tab[data-t="box"]'], countSel: '.tab', between: null, gap: 0 },
  side: { sels: ['#sideL .ibtn[data-pop="quest"]'], countSel: '#sideL .ibtn[data-pop]', between: 'closeModal', gap: 400 },
  shop: { sels: ['#shopList .shp-card [data-shinfo]'], countSel: '#shopList [data-shinfo]', between: 'closeProbInfo', gap: 400 },
};

(async () => {
  const c = CASES[PROBE];
  if (!c) { console.error('PROBE=tab|side|shop'); process.exit(2); }
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    S.gold = 1e13; S.dia = 1e9; uiDirty = true;
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__hits = 0; window.__sel = ''; window.__land = '';
    const desc = el => {
      if (!el) return '(null)';
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
      return s;
    };
    window.__desc = desc;
    document.addEventListener('click', e => {
      window.__land = desc(e.target) + '  ← path: ' + (e.composedPath() || []).slice(0, 5).map(desc).join(' < ');
      if (window.__sel && e.target && e.target.closest && e.target.closest(window.__sel)) window.__hits++;
    }, true);
  });
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await new Promise(r => setTimeout(r, HOLD));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

  await page.evaluate(() => { window.__closeAllProbe = () => { try { closeModal(); } catch (_) {} }; });
  let ok = 0; const misses = [];
  for (let i = 0; i < N; i++) {
    const sel = c.sels[i % c.sels.length];
    const pre = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      window.__sel = null; window.__hits = 0; window.__land = '';
      return {
        x, y,
        top: window.__desc(top),
        /* 대상이 실제로 그 좌표의 최상위인가 = 오버레이에 가렸는가 */
        covered: !(top && top.closest && top.closest(s)),
        anims: document.getAnimations().filter(a => a.playState === 'running')
          .map(a => (a.animationName || (a.effect && a.effect.target && a.effect.target.id) || '?')).slice(0, 4),
      };
    }, sel);
    if (!pre) { misses.push({ i, why: '대상 미발견' }); continue; }
    await page.evaluate(s => { window.__sel = s; window.__hits = 0; }, c.countSel);
    await tap(pre.x, pre.y);
    await page.waitForTimeout(50);
    const got = await page.evaluate(() => ({ h: window.__hits, land: window.__land }));
    if (got.h > 0) ok++;
    else misses.push({ i, covered: pre.covered, top: pre.top, anims: pre.anims, land: got.land });
    if (c.between) await page.evaluate(fn => { if (typeof window[fn] === 'function') window[fn](); }, c.between);
    if (c.gap) await page.waitForTimeout(c.gap);
  }
  await browser.close();

  console.log(`\nPROBE=${PROBE}  ${ok}/${N} (${(ok / N * 100).toFixed(1)}%)  빗나감 ${misses.length}건`);
  const covered = misses.filter(m => m.covered).length;
  misses.slice(0, 12).forEach(m => {
    console.log(`  #${m.i}  ${m.why || (m.covered ? '**가려짐**' : '대상이 최상위')}`);
    if (!m.why) {
      console.log(`      최상위: ${m.top}`);
      console.log(`      애니메이션: ${(m.anims || []).join(', ') || '없음'}`);
      console.log(`      click 착지: ${m.land || '(click 자체가 없었다)'}`);
    }
  });
  console.log('');
  console.log(`판정 재료 — 빗나감 ${misses.length}건 중 «탭 순간 대상이 오버레이에 가려져 있었다» ${covered}건`);
  console.log(covered === misses.length && misses.length
    ? '→ 전부 가려짐 = 하네스 페이스(오버레이 애니메이션). 74 계열의 탭 «유실» 이 아니다.'
    : '→ 가려지지 않았는데 빗나간 것이 있다 = 진짜 유실 가능성. click 착지 경로를 봐라.');
})();
