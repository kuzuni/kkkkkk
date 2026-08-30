#!/usr/bin/env node
/* 작업 488 캡처 — «꾹 누르는 동안» 연속 프레임 (지시서 [3]-(다) 연출 채점용)
 *
 *   node tools/cap488.js [회차]
 *
 * (다) 규약: 정지 1장이 아니라 **연속 프레임 8장**(트리거 직후 100ms 간격)을 비평가에게 준다.
 * 씬 3종을 각각 8장씩 찍는다 — 세 씬을 나란히 봐야 «일관성»(④) 이 보인다:
 *   A 룬 강화 전부 성공 · B 룬 강화 전부 실패 · C 23 훈련 카드(대조 · 같은 부품)
 * 화면비는 기준 1080×2280(9:19).
 * ⚠ 캡처 PNG 는 .gitignore 로 막혀 있다 — 커밋하지 않는다. 증거는 review .md 의 수치다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const R = process.argv[2] || '1';
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'shots');
const GAP = Number(process.env.C488_GAP || 100);
const N = Number(process.env.C488_N || 8);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(p);
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
  });

  const box = async sel => {
    await p.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 5000 });
    const bb = await p.locator(sel).first().boundingBox();
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  };

  /* 홀드하는 «동안» 찍는다 — 손을 뗀 뒤에 찍으면 정산 토스트만 남는다.
     ⚠ 전체 프레임(1080×2280)을 찍으면 한 장에 600~700ms 가 걸려 (다) 가 요구하는 100ms 격자가
       깨진다(1회차 실측). 그릇(#trw)만 잘라 찍으면 90~140ms 로 내려가고, 비평가가 볼 것도
       카드 안이라 잃는 정보가 없다. */
  const shootDuring = async (tag, sel, clipSel) => {
    const c = await box(sel);
    const cb = clipSel ? await p.locator(clipSel).first().boundingBox() : null;
    const clip = cb ? { x: Math.max(0, cb.x), y: Math.max(0, cb.y), width: Math.min(1080, cb.width), height: Math.min(2280, cb.height) } : undefined;
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      await new Promise(r => setTimeout(r, GAP));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 2 - 1), y: c.y + (Math.random() * 2 - 1) }] }).catch(() => {});
      const f = path.join(OUT, '488-r' + R + '-' + tag + '-' + String(i + 1).padStart(2, '0') + '.png');
      await p.screenshot({ path: f, clip });
      process.stdout.write('  · ' + path.basename(f) + '  t+' + (Date.now() - t0) + 'ms\n');
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(300);
    /* 손 뗀 «뒤» 한 장 — 정산 토스트가 한 장인지 눈으로도 보이게 */
    await p.screenshot({ path: path.join(OUT, '488-r' + R + '-' + tag + '-end.png') });   /* 정산 한 장은 전체 프레임으로 */
  };

  const runeSetup = rate => p.evaluate(r => {
    ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult', 'closeRelw']
      .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
    if (!window.__rate0) window.__rate0 = runeRate;
    runeRate = () => r;
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12; S.dia = 1e12; S.gold = 1e18;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  }, rate);

  console.log('[A] 룬 강화 — 전부 성공');
  await runeSetup(1); await p.waitForTimeout(500);
  await shootDuring('rune-ok', '#trRunes .tr-rn[data-rune="r1"] .rbt[data-pay="mat"]', '#trw .tr-box');

  console.log('[B] 룬 강화 — 전부 실패');
  await runeSetup(0); await p.waitForTimeout(500);
  await shootDuring('rune-no', '#trRunes .tr-rn[data-rune="r1"] .rbt[data-pay="mat"]', '#trw .tr-box');

  console.log('[C] (대조) 23 훈련 카드 — 같은 부품');
  await p.evaluate(() => {
    if (window.__rate0) runeRate = window.__rate0;
    S.gold = 1e18; openTrain(); setTrSub('train'); renderTrain();
  });
  await p.waitForTimeout(500);
  await shootDuring('train', '#trCards [data-tr="atk"]', '#trw .tr-box');

  console.log('\n캡처 완료 → ' + OUT);
  await browser.close();
})();
