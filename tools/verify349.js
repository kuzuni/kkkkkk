#!/usr/bin/env node
/* 작업 349 — 룬 [강화] «꾹 누르기» 연속 강화 게이트 (2026-08-29 주인 보고 · 297 재발/미완)
 *
 *   node tools/verify349.js
 *
 * 주인 원문: «룬 강화버튼 꾹 누르면 연속으로 강화 되게 해야되는데 안되있더라 수정하셈».
 *
 * 297 이 이미 «꾹 누르기» 를 만들어 뒀고 `verify203` [10] 이 초록이었는데도 실기기에서 안 됐다.
 * `tools/probe349.js` 로 재현해 보니 원인이 **둘**이었고, 둘 다 «게이트가 실기기와 다른 조건에서
 * 재고 있었다» 는 한 뿌리다:
 *
 *   ⓐ **다이아칸이 애초에 홀드 대상이 아니었다** — 297 이 `RUNE_HOLD_DIA=false` 로 빼 두고
 *      «주인 확인 대기» 로 남긴 스위치. 재료칸은 마우스·터치·떨림·게임루프ON 어느 조합에서도
 *      10~12회 돌고 있었다. 주인이 «안 된다» 고 본 버튼은 다이아칸이다.
 *   ⓑ **손가락 드리프트** — 버튼(420×112) «안» 에서 ±30px 만 굴러도 크로미움이 그 터치를
 *      스크롤 제스처로 채가 `pointercancel` 을 쏘고, 홀드가 그것을 «손 뗌» 으로 읽어 1회에서 멎었다.
 *      1080폭 프레임의 30px = 실기기 1.9mm. 1.5초를 누르는 손가락은 반드시 그만큼 구른다.
 *      `verify203` [10] 은 **마우스로만** 재서 이 축을 한 번도 안 봤다.
 *
 * 그래서 이 게이트는 **실기기 쪽 조건**으로만 잰다: CDP 터치 · 게임 루프 ON · 실제 확률 ·
 * 손가락 드리프트. 마우스 축은 `verify203` [10] 이 계속 본다(중복해 세지 않는다).
 *
 * 절: [A] 터치 홀드가 연속으로 돈다  [B] 드리프트 내성  [C] 정지 조건(뗌·이탈·팝업·소진)
 *     [D] 재화 정확 차감  [E] 재렌더를 넘어 홀드가 산다  [R] 되돌림 시험  [G] 회귀
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = process.env.V349_FILE || 'index.html';
const SRC = path.resolve(__dirname, '..', FILE);
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };

const MAT = '#trRunes .tr-rn[data-rune="r1"] .rbt[data-pay="mat"]';
const DIA = '#trRunes .tr-rn[data-rune="r1"] .rbt[data-pay="dia"]';

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
  const cdp = await ctx.newCDPSession(p);

  /* 계측 — 시도 횟수는 `runeBuy` 호출을 직접 센다. «차감 ÷ 비용» 은 실제 확률로 굴리면
     레벨이 올라 비용이 변해 못 쓴다(297 게이트가 `runeRate=()=>0` 을 쓴 이유이자, 그래서
     실기기와 멀어진 지점이다 — 여기서는 확률을 진짜로 굴리고 세는 법을 바꾼다). */
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__n = 0; window.__cx = 0;
    const o = window.runeBuy;
    window.runeBuy = function () { window.__n++; return o.apply(this, arguments); };
    addEventListener('pointercancel', () => window.__cx++, true);
    /* 죽어서 18 패배 화면이 버튼을 덮는 것만 막는다(74 규약) — 루프 자체는 **돌린다** */
    setInterval(() => { try { if (typeof maxHp === 'function' && S.hp != null) S.hp = maxHp(); } catch (_) {} }, 200);
  });

  const reset = async (o) => {
    o = o || {};
    await p.evaluate(op => {
      ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult']
        .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
      S.rune = { r1: 0, r2: 0, r3: 0 };
      S.rstone = op.stone == null ? 1e9 : op.stone;
      S.dia = op.dia == null ? 1e9 : op.dia;
      openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
      window.__n = 0; window.__cx = 0;
    }, o);
    await p.waitForTimeout(450);   /* 팝업 슬라이드 종료 대기 — 297 함정 ① */
  };
  const center = async sel => {
    await p.locator(sel).scrollIntoViewIfNeeded();
    const bb = await p.locator(sel).boundingBox();
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, w: bb.width, h: bb.height };
  };
  /* 양성항(LESSONS 263-①) — 누른 좌표의 최상단 노드가 정말 그 버튼인가.
     아니면 «0회» 라는 조용한 오답이 되고 원인을 못 찾는다. */
  let aimBad = 0;
  const aim = async sel => {
    const c = await center(sel);
    const hit = await p.evaluate(o => {
      const el = document.elementFromPoint(o.x, o.y);
      return !!(el && el.closest && el.closest(o.sel));
    }, { sel, x: c.x, y: c.y });
    if (!hit) aimBad++;
    return c;
  };
  const n = () => p.evaluate(() => window.__n);
  const cx = () => p.evaluate(() => window.__cx);
  /* 실기기 터치 — touchStart 의 ack 를 기다리지 않는다(142: 기다리면 렌더러 정체가 그대로
     «손가락이 닿아 있던 시간» 에 더해져 하네스가 제품을 오진한다) */
  const touchHold = async (c, ms, drift, off) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); let i = 0;
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 60)); i++;
      const r = drift || 0;
      const dx = off ? off.x : Math.sin(i / 2) * r, dy = off ? off.y : Math.cos(i / 2) * r;
      if (r || off) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + dx, y: c.y + dy }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(140);
  };

  console.log('[A] 터치 «꾹 누르기» — 두 결제 칸 모두 연속으로 돈다 (게임 루프 ON · 실제 확률)');
  await reset();
  await touchHold(await aim(MAT), 60);
  const tap1 = await n();
  ok(tap1 === 1, '단발 탭 = 정확히 1회(누를 때 1 + 뗄 때 1 이 아니다 — 64 ⓐ)', tap1 + '회');

  await reset();
  await touchHold(await aim(MAT), 1500);
  const hMat = await n();
  ok(hMat >= 5, '★ 재료칸 — 터치 1.5초 홀드에 5회 이상 시도', hMat + '회');

  await reset();
  await touchHold(await aim(DIA), 1500);
  const hDia = await n();
  ok(hDia >= 5, '★ 349 — **다이아칸도** 터치 1.5초 홀드에 5회 이상 시도(297 은 1회였다)', hDia + '회');
  ok(await p.evaluate(() => typeof RUNE_HOLD_DIA !== 'undefined' && RUNE_HOLD_DIA === true),
    'RUNE_HOLD_DIA === true (349 주인 확인 완료)');

  /* 가속(×0.86) — 뒤 구간이 앞 구간보다 많이 돈다. 64·297 과 «같은 리듬» 이라는 뜻이다. */
  await reset();
  {
    const c = await aim(MAT);
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await new Promise(r => setTimeout(r, 900));
    const a = await n();
    await new Promise(r => setTimeout(r, 900));
    const b = await n();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {}); await p.waitForTimeout(140);
    ok(b - a > a, '가속 — 뒤 900ms 가 앞 900ms 보다 많이 돈다(TR_HOLD_ACCEL 0.86)', a + ' → ' + (b - a) + '회');
  }

  console.log('[B] 드리프트 내성 — 손가락이 버튼 «안» 에서 구른다 (이 작업의 둘째 원인)');
  for (const r of [6, 14, 30, 45]) {
    await reset();
    await touchHold(await aim(MAT), 1500, r);
    const v = await n(), c2 = await cx();
    ok(v >= 5 && c2 === 0, '±' + String(r).padStart(2) + 'px 드리프트 — 연속 유지 · pointercancel 0',
      v + '회 · 취소 ' + c2);
  }
  ok(await p.evaluate(() => {
    const el = document.querySelector('#trRunes .tr-rn .rbt[data-pay="mat"]');
    return !!el && getComputedStyle(el).touchAction === 'none';
  }), '★ 처방 — 홀드 버튼이 `touch-action:none` 이라 브라우저가 제스처를 못 채간다');
  ok(await p.evaluate(() => ['#trCards [data-tr="atk"]', '#trRunes [data-runebuy]',
      '#trTemper [data-tempup]', '#trTemper [data-tpchg]']
      .every(s => { const e = document.querySelector(s); return !e || getComputedStyle(e).touchAction === 'none'; })),
    '#trw 홀드 3형제(64 훈련 · 297 룬 · 297 단련)가 전부 같은 규칙을 탄다');
  /* 이 규칙이 «스크롤을 죽이지 않는다» 는 근거를 게이트가 직접 잰다 — 이 앱은 아무 데도
     스크롤하지 않는다. 언젠가 스크롤 영역이 생기면 이 항이 빨개져 처방을 다시 보게 만든다. */
  /* ⚠ `scrollHeight > clientHeight` 만으로는 못 잰다 — `overflow:hidden` 이면 내용이 넘쳐도
     스크롤은 «못 한다». 넘침이 아니라 **스크롤 가능성**(overflow 가 auto/scroll 인가)을 묻는다. */
  ok(await p.evaluate(() => {
    const scrollable = [];
    let el = document.querySelector('#trRunes .tr-rn .rbt[data-pay="mat"]');
    while (el) {
      const cs = getComputedStyle(el);
      const can = k => /auto|scroll/.test(cs['overflow' + k]);
      if ((can('Y') && el.scrollHeight > el.clientHeight + 1) || (can('X') && el.scrollWidth > el.clientWidth + 1))
        scrollable.push(el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className || ''));
      el = el.parentElement;
    }
    window.__scr = scrollable.join(' , ');
    return scrollable.length === 0;
  }), '조상 사슬에 스크롤 영역이 하나도 없다 — `touch-action:none` 이 뺏는 것은 «갈 곳 없는 팬» 뿐',
    await p.evaluate(() => window.__scr));

  console.log('[C] 정지 조건 — 놓으면·나가면·닫으면·떨어지면 즉시 멎는다');
  await reset();
  {
    await touchHold(await aim(MAT), 1000);
    const a = await n();
    await p.waitForTimeout(600);
    ok((await n()) === a, '손을 떼면 즉시 멈춘다(뗀 뒤 600ms 동안 0회)', a + '회에서 정지');
  }
  await reset();
  {
    const c = await aim(MAT);
    await touchHold(c, 1200, 0, { x: 0, y: c.h });      /* 버튼 밖(높이만큼 아래)으로 이탈 */
    const v = await n();
    ok(v <= 2, '버튼 «밖» 으로 나가면 멈춘다(이탈은 여전히 정지 사유다)', v + '회');
  }
  await reset();
  {
    const c = await aim(MAT);
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await new Promise(r => setTimeout(r, 700));
    await p.evaluate(() => closeTrain());
    await new Promise(r => setTimeout(r, 300));
    const a = await n();
    await new Promise(r => setTimeout(r, 400));
    const b = await n();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {}); await p.waitForTimeout(140);
    ok(a === b, '팝업을 닫으면 홀드도 같이 멈춘다', a + '회에서 정지');
  }

  console.log('[D] 재화 정확 차감 — 소진되면 «정확히 그만큼» 에서 조용히 멎는다');
  {
    /* 확률을 0 으로 고정해 레벨(=비용)을 세워야 «정확히 3회» 를 셀 수 있다 */
    await p.evaluate(() => { if (!window.__rate0) window.__rate0 = runeRate; runeRate = () => 0; });
    const cost = await p.evaluate(() => { S.rune = { r1: 0, r2: 0, r3: 0 }; return runeCost(RN.r1, 0); });
    await reset({ stone: cost * 3 });
    await touchHold(await aim(MAT), 2000);
    const v = await n(), left = await p.evaluate(() => S.rstone);
    ok(v === 3 && left === 0, '재료가 3회분이면 정확히 3회에서 멎고 잔량이 0 이다', v + '회 · 남은 ' + left);

    const dcost = await p.evaluate(() => RUNE_DIA);
    await reset({ dia: dcost * 4 });
    await touchHold(await aim(DIA), 2000);
    const v2 = await n(), dleft = await p.evaluate(() => S.dia);
    ok(v2 === 4 && dleft === 0, '349 — 다이아도 4회분이면 정확히 4회에서 멎는다(과금 재화 정확 차감)',
      v2 + '회 · 남은 ' + dleft);
    await p.evaluate(() => { runeRate = window.__rate0; });
  }

  console.log('[E] 재렌더를 넘어 홀드가 산다 (64 교훈 1 · 262 ⓑ)');
  await reset();
  {
    const c = await aim(MAT);
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await new Promise(r => setTimeout(r, 400));
    const node0 = await p.evaluate(() => { window.__b0 = document.querySelector('#trRunes .rbt[data-pay="mat"]'); return true; });
    /* 홀드 중 통짜 렌더를 여러 번 부른다 — 노드가 갈리면 포인터 캡처가 끊겨 멎는다 */
    for (let i = 0; i < 5; i++) { await p.evaluate(() => { renderTrain(); renderTrainLive(); }); await new Promise(r => setTimeout(r, 90)); }
    const same = await p.evaluate(() => window.__b0 === document.querySelector('#trRunes .rbt[data-pay="mat"]'));
    const a = await n();
    await new Promise(r => setTimeout(r, 400));
    const b = await n();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {}); await p.waitForTimeout(140);
    ok(same, '홀드 중 renderTrain() 을 5회 불러도 누른 버튼 노드가 그대로다(innerHTML 교체 없음)', node0 ? '' : '');
    ok(b > a, '그 뒤에도 반복이 계속 돈다', a + ' → ' + b + '회');
  }

  console.log('[R] 되돌림 시험 — 처방을 도로 빼면 정말 빨개지는가 (LESSONS 43-①)');
  {
    await reset();
    /* R1 — `touch-action` 을 auto 로 되돌리면 ±30px 에서 죽는가 */
    await p.addStyleTag({ content: '#trw .tr-card,#trw [data-runebuy],#trw [data-tempup],#trw [data-tpchg]{touch-action:auto !important}' });
    await reset();
    await touchHold(await aim(MAT), 1500, 30);
    const v = await n(), c2 = await cx();
    ok(v <= 2 && c2 >= 1, 'R1 — touch-action 을 auto 로 되돌리면 ±30px 에서 1회에 멎고 취소가 뜬다',
      v + '회 · 취소 ' + c2);
    await p.evaluate(() => {           /* 주입한 스타일을 걷는다 */
      [...document.querySelectorAll('style')].forEach(s => { if (/touch-action:auto !important/.test(s.textContent)) s.remove(); });
    });
    await reset();
    await touchHold(await aim(MAT), 1500, 30);
    const v2 = await n();
    ok(v2 >= 5, 'R1b — 걷으면 도로 초록이다(주입이 원인이었다는 대조군)', v2 + '회');
  }
  ok(/dataset\.pay\s*===\s*'dia'\s*&&\s*!RUNE_HOLD_DIA/.test(fs.readFileSync(SRC, 'utf8')),
    'R2 — 되돌림 분기가 살아 있다(RUNE_HOLD_DIA=false 한 글자로 297 사양 복귀)');

  console.log('[G] 회귀');
  ok(aimBad === 0, '누른 좌표의 최상단 노드가 매번 그 버튼이었다(양성항 — 팝업이 덮지 않았다)', aimBad + '건 실패');
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY349 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
