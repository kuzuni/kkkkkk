#!/usr/bin/env node
/* 작업 354 — «꾹 누르기» 홀드 버튼 2자리(#modal `bindUpHold` · #relw `rwHold`)가 349 와 같은
 * 드리프트 결함을 갖는가 (재현 도구)
 *
 *   node tools/probe354.js
 *
 * 338·341 규칙: **등재문의 처방을 따르기 전에 먼저 재현한다.** 341 은 이 순서를 지켜
 * «누락» 이 유령이었음을 밝혔고, 338 은 등재문 처방이 «이미 참인 것» 이었음을 밝혔다.
 * 여기서 물을 것은 딱 하나 — **이 두 자리가 정말 349 와 같은 축에서 죽는가**,
 * 그리고 349 의 한 줄이 정말 그것을 살리는가(주입 대조군).
 *
 * 349 가 만든 축을 그대로 쓴다: CDP 터치 · 게임 루프 ON · 손가락 드리프트(버튼 «안» 에서만).
 * 세는 법은 349 와 같게 **제품 함수 호출을 직접 센다**(`levelUp` · `summonRelic`) —
 * 재화 차감 ÷ 비용 은 레벨이 오르면 비용이 변해 못 쓴다.
 *
 * 두 호스트:
 *   ⓐ `#modal #mLv` — 262 `bindUpHold`(08 스킬/아이템 세부 팝업 [강화] · 50 코스튬 [강화])
 *   ⓑ `#relw #rwBasin` — 89 `rwHold`(유물 소환 수반)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
/* 540 — «치우기» 닫개 한 벌. 여기 손으로 적혀 있던 목록에는 제품에 없는 이름
   `closeDefeat` 가 섞여 있었고(index.html 0건), `typeof` 가드가 그것을 조용히 삼켜
   18 패배 화면을 치우는 팔이 한 번도 돈 적이 없다. */
const { install, missingClosers, defeatStuck, blockedLabel } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.P354_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const HOLD = Number(process.env.P354_HOLD || 1500);

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  await install(p, { arm: true });   /* 540 — 게임 루프를 돌리는 자다: 껍데기 걷개까지 건다 */
  const cdp = await ctx.newCDPSession(p);

  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__n = 0; window.__cx = 0;
    /* ⚑⚑ 793 이관 — `summonRelic` 은 700(배수 토글) 뒤로 아무도 안 부르는 껍데기다.
       재현 자가 «0회» 를 세면 재현 자체가 거짓이 되므로 감는 자리를 배치로 옮긴다
       (같은 이관: `verify354` · `verify682` · `probe666`). */
    const lu = window.levelUp, sr = window.summonRelicBatch, cu = window.cosUpgrade;
    window.levelUp = function () { window.__n++; return lu.apply(this, arguments); };
    window.summonRelicBatch = function () { window.__n++; return sr.apply(this, arguments); };
    if (typeof cu === 'function') window.cosUpgrade = function () { window.__n++; return cu.apply(this, arguments); };
    addEventListener('pointercancel', () => window.__cx++, true);
    /* 죽어서 18 패배 화면이 버튼을 덮는 것만 막는다(74 규약) — 루프 자체는 **돌린다** */
    setInterval(() => { try { if (typeof maxHp === 'function' && S.hp != null) S.hp = maxHp(); } catch (_) {} }, 200);
  });

  const clearAll = () => p.evaluate(() => {
    window.__clear540();                 /* 540 — 닫개 + 이름 없는 껍데기(#defw) */
  });
  /* ⓐ 08 스킬 세부 팝업의 [강화] — 조각을 넉넉히 주고 Lv1 로 세운다 */
  const openSkill = async () => {
    await clearAll();
    await p.evaluate(() => { S.own['slash'] = { n: 1e7, l: 1 }; showSkillDetail('slash'); });
    await p.waitForTimeout(450);
  };
  /* ⓑ 89 유물 소환 수반 */
  const openBasin = async () => {
    await clearAll();
    await p.evaluate(() => { S.relic = 1e9; openRelw(); });
    await p.waitForTimeout(450);
  };
  const reset = () => p.evaluate(() => { window.__n = 0; window.__cx = 0; });

  let aimBad = 0;
  const aim = async sel => {
    await p.locator(sel).scrollIntoViewIfNeeded();
    const bb = await p.locator(sel).boundingBox();
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, w: Math.round(bb.width), h: Math.round(bb.height) };
    const hit = await p.evaluate(o => {
      const el = document.elementFromPoint(o.x, o.y);
      return !!(el && el.closest && el.closest(o.sel));
    }, { sel, x: c.x, y: c.y });
    if (!hit) aimBad++;
    return c;
  };
  /* 실기기 터치 — touchStart 의 ack 를 기다리지 않는다(142) */
  const touchHold = async (c, ms, drift) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); let i = 0;
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 60)); i++;
      const r = drift || 0;
      if (r) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + Math.sin(i / 2) * r, y: c.y + Math.cos(i / 2) * r }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(140);
  };
  const n = () => p.evaluate(() => window.__n);
  const cx = () => p.evaluate(() => window.__cx);

  const run = async (label, open, sel, drift) => {
    await open(); await reset();
    const c = await aim(sel);
    await touchHold(c, HOLD, drift);
    const v = await n(), c2 = await cx();
    const ta = await p.evaluate(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).touchAction : '—'; }, sel);
    console.log('  · ' + label.padEnd(30) + ' 시도 ' + String(v).padStart(3) + '회 · 취소 ' + c2
      + ' · 버튼 ' + c.w + '×' + c.h + ' · touch-action ' + ta);
    return { n: v, cx: c2, ta };
  };

  console.log('[A] #modal #mLv — 262 bindUpHold (08 스킬 세부 팝업 [강화] · 홀드 ' + HOLD + 'ms)');
  const A = {};
  for (const r of [0, 6, 14, 30, 45]) A[r] = await run('±' + r + 'px 드리프트', openSkill, '#modal #mLv', r);

  console.log('[B] #relw #rwBasin — 89 rwHold (유물 소환)');
  const B = {};
  for (const r of [0, 6, 14, 30, 45]) B[r] = await run('±' + r + 'px 드리프트', openBasin, '#relw #rwBasin', r);

  /* 349 의 한 줄을 **주입**해 같은 자리가 살아나는지 본다 — 처방의 대조군.
     (제품에 이미 들어간 뒤에 돌리면 이 절은 «이미 초록» 을 다시 확인하는 것이 된다.) */
  console.log('[C] 349 의 한 줄을 주입한 대조군 — `touch-action:none` 이 정말 이 두 자리를 살리는가');
  await p.addStyleTag({ content: '#modal #mLv,#relw #rwBasin{touch-action:none !important}' });
  const A30 = await run('#mLv ±30px (주입 후)', openSkill, '#modal #mLv', 30);
  const B30 = await run('#rwBasin ±30px (주입 후)', openBasin, '#relw #rwBasin', 30);

  /* 349 [B] 마지막 항과 같은 질문 — 이 규칙이 «갈 곳 없는 팬» 말고 무엇을 뺏는가.
     ⚠ 넘침(scrollHeight>clientHeight)이 아니라 **스크롤 가능성**(overflow auto|scroll)을 묻는다. */
  const scrollable = await p.evaluate(() => {
    const out = [];
    ['#modal #mLv', '#relw #rwBasin'].forEach(sel => {
      let el = document.querySelector(sel);
      while (el) {
        const cs = getComputedStyle(el);
        const can = k => /auto|scroll/.test(cs['overflow' + k]);
        if ((can('Y') && el.scrollHeight > el.clientHeight + 1) || (can('X') && el.scrollWidth > el.clientWidth + 1))
          out.push(sel + ' → ' + el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className || ''));
        el = el.parentElement;
      }
    });
    return out;
  });
  console.log('  · 조상 사슬의 스크롤 영역: ' + (scrollable.length ? scrollable.join(' , ') : '없음'));

  console.log('\n[판정]');
  ok(A[0].n >= 3, 'ⓐ #mLv — 가만히 누르면 연속이 돈다(홀드 자체는 멀쩡하다)', A[0].n + '회');
  ok(B[0].n >= 3, 'ⓑ #rwBasin — 가만히 누르면 연속이 돈다', B[0].n + '회');
  ok(A[6].n >= 3 && A[14].n >= 3, 'ⓒ #mLv — ±6·±14px 는 견딘다', A[6].n + ' · ' + A[14].n + '회');
  ok(B[6].n >= 3 && B[14].n >= 3, 'ⓓ #rwBasin — ±6·±14px 는 견딘다', B[6].n + ' · ' + B[14].n + '회');
  ok(A30.n >= 3 && A30.cx === 0, 'ⓔ ★ #mLv — 349 의 한 줄을 주입하면 ±30px 에서 살아난다 · 취소 0', A30.n + '회 · 취소 ' + A30.cx);
  ok(B30.n >= 3 && B30.cx === 0, 'ⓕ ★ #rwBasin — 같은 한 줄로 살아난다 · 취소 0', B30.n + '회 · 취소 ' + B30.cx);
  ok(scrollable.length === 0, 'ⓖ 두 호스트의 조상 사슬에 스크롤 영역이 없다(처방이 뺏는 것은 «갈 곳 없는 팬» 뿐)',
    scrollable.join(' , '));
  ok(aimBad === 0, 'ⓗ 누른 좌표의 최상단 노드가 매번 그 버튼이었다(양성항 — 조준 실패 0)', aimBad + '건');

  /* ⚑ 540 — 유령 재유입 차단(524 가 349 에서 겪은 «가끔 22~24/24» 의 씨앗) */
  const cl540 = await missingClosers(p);
  ok(cl540.length === 0,
    '★ 540 — 닫개 이름이 전부 제품에 실재한다(typeof 가드가 유령을 삼키지 않는다)',
    cl540.length ? '없는 이름 ' + cl540.join(' , ') : '전부 실재');
  ok(!(await defeatStuck(p)),
    '★ 540 — 측정이 끝난 시점에 18 패배 화면이 켜져 있지 않다(켜지면 뒤 표본이 전부 «0회» 다)',
    await blockedLabel(p));
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\n[표] 수리 «전» 드리프트 내성 (등재문 가설의 진위)');
  console.log('  drift |  #mLv 시도/취소  |  #rwBasin 시도/취소');
  [0, 6, 14, 30, 45].forEach(r => console.log('  ±' + String(r).padStart(2) + 'px |    '
    + String(A[r].n).padStart(3) + ' / ' + A[r].cx + '        |    ' + String(B[r].n).padStart(3) + ' / ' + B[r].cx));

  console.log('\nPROBE354 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
