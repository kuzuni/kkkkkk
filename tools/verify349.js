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

/* 490 — 결제 갈래가 «룬강화석» 하나가 되면서 `data-pay` 도 다이아 칸도 사라졌다.
   349 가 지킨 성질(«꾹 = 연속»)은 그대로 살아 있어야 하므로 자를 **유일한 버튼**으로 옮겼다. */
const MAT = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';

/* 524 — reset 이 부르는 «치우기» 훅 이름. 여기 있던 `closeDefeat` 는 제품에 없는 이름이었고
   `typeof` 가드가 그것을 조용히 삼켰다. [G] 가 이 목록의 실재를 매 실행 묻는다.
   ⚑ 540 — 같은 유령이 자 여덟 개에 더 있었다. 목록이 아홉 벌이면 그 아홉이 어긋나는 순간
   아무도 모르므로 **한 곳**(`tools/closers540.js`)에서 읽는다. 여기 있던 넷은 그 합집합의
   부분집합이고, 이 자도 «치운 뒤에 자기 화면을 연다»(openTrain) 순서라 합집합이 안전하다. */
const { RESET_CLOSERS } = require('./closers540');

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
    /* ⚑ 701 이관(2026-09-02) — «1회» 함수가 **둘로 갈렸다.** 701 이 배수 토글을 놓으면서 홀드 틱은
       코어 `runeTryOne` 을 부르고, `runeBuy` 는 **막힌 첫 누름의 안내**에만 남았다(아래 [490] 항의
       «안내 1회» 가 바로 그것이다). 둘은 서로 겹치지 않으므로 **같은 카운터에 더하면** `__n` 의 뜻이
       («이 자리가 실제로 부른 1회 횟수 — 막힌 안내 포함») 전과 한 글자도 안 달라진다.
       옛 이름 하나만 세면 이 자는 «0회» 로 빨개진다(제품은 멀쩡하다). */
    const o = window.runeBuy;
    window.runeBuy = function () { window.__n++; return o.apply(this, arguments); };
    const o1 = window.runeTryOne;
    if (typeof o1 === 'function') window.runeTryOne = function () { window.__n++; return o1.apply(this, arguments); };
    addEventListener('pointercancel', () => window.__cx++, true);
    /* 죽어서 18 패배 화면이 버튼을 덮는 것만 막는다(74 규약) — 루프 자체는 **돌린다** */
    setInterval(() => { try { if (typeof maxHp === 'function' && S.hp != null) S.hp = maxHp(); } catch (_) {} }, 200);
    /* ⚑ 524 — 위 hp 되채움만으로는 못 막는다. 200ms 폴링과 «죽는 순간» 은 경주고, 한 번 지면
       `#defw.on`(z39 · inset:0)이 버튼을 통째로 덮은 채 **굳는다** — 뒤 표본이 전부 «0회» 로
       읽혀 [R1b] 와 [G] 양성항이 같이 빨개진 것이 등재문의 «22~24/24» 다(`probe524` §3).
       `openDefeat` 는 제품 주석대로 **표시 전용**(«자동 부활은 그대로 진행», 24084)이므로
       제품 경로는 그대로 부르고 껍데기만 즉시 걷는다. 몇 번 걷었는지 세어 둔다 —
       늘 0 인 팔은 아무것도 증명하지 않는다(LESSONS 353-④). */
    window.__def = 0;
    const _od = window.openDefeat;
    window.openDefeat = function () {
      window.__def++;
      try { _od.apply(this, arguments); } catch (_) {}
      const d = document.getElementById('defw');
      if (d) d.classList.remove('on');
    };
  });

  const reset = async (o) => {
    o = Object.assign({}, o || {}, { closers: RESET_CLOSERS });
    await p.evaluate(op => {
      /* ⚑ 524 — 이 목록에 있던 `closeDefeat` 는 **제품에 없는 이름**이었다(index.html 0건).
         `typeof … === 'function'` 가드가 그 사실을 조용히 삼켜, 18 패배 화면을 치우는 팔이
         한 번도 돈 적이 없다. 이름이 실재하는지는 [G] 가 매 실행 묻는다(유령 재유입 차단). */
      op.closers
        .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
      /* 위 훅이 놓친 패배 껍데기는 여기서 직접 건다 — 함수 이름이 없는 화면이다 */
      { const d = document.getElementById('defw'); if (d) d.classList.remove('on'); }
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
  let aimBad = 0; const aimTop = [];
  const aim = async sel => {
    const c = await center(sel);
    /* 524 — «맞았나» 만 세면 빨개졌을 때 **무엇이 덮었는지** 를 모른다. 등재문이 «양성항이 같이
       흔들린다» 까지 적어 두고도 원인을 못 짚은 이유가 그것이다 — 유령의 이름을 같이 남긴다. */
    const top = await p.evaluate(o => {
      const el = document.elementFromPoint(o.x, o.y);
      if (el && el.closest && el.closest(o.sel)) return 'HIT';
      if (!el) return '(null)';
      const cn = el.className && el.className.baseVal != null ? el.className.baseVal : el.className;
      const cls = String(cn || '').trim();
      return el.tagName + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.split(/\s+/).join('.') : '');
    }, { sel, x: c.x, y: c.y });
    if (top !== 'HIT') { aimBad++; aimTop.push(top); }
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

  /* 490 이관 — 구 «다이아칸도 홀드를 탄다» 두 항의 자리. 갈래가 하나가 됐으므로
     «다이아를 안 쓴다» + «칸이 하나다» 로 뒤집어 묻는다(자리를 비우지 않는다 — 333). */
  await reset({ dia: 1e6 });
  const d0 = await p.evaluate(() => S.dia);
  await touchHold(await aim(MAT), 1500);
  const hRun = await n(), d1 = await p.evaluate(() => S.dia);
  ok(hRun >= 5 && d0 - d1 === 0,
    '★ 490 — 1.5초 홀드가 5회 이상 돌면서 다이아는 **한 푼도** 안 나간다', hRun + '회 · 다이아 Δ' + (d0 - d1));
  ok(await p.evaluate(() => document.querySelectorAll('#trRunes .tr-rn .rbt').length) === 1,
    '490 — 룬 카드의 시도 버튼이 하나다(구 다이아 칸이 사라졌다)');

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
    const el = document.querySelector('#trRunes .tr-rn .rbt.b1');   /* 490 — 버튼 하나 */
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
  /* 551 (2026-08-30) — 여기 남아 있던 `.rbt[data-pay="mat"]` 은 490 이 걷어낸 이름이라
     `querySelector` 가 **null** 을 돌려주고 while 이 한 바퀴도 안 돌아 **상시 초록**이었다
     (조상 사슬을 한 번도 안 걸었다). 셀렉터를 살아 있는 것으로 옮기고, 다시 유령이 되면
     즉시 빨개지도록 «호스트가 실재한다» 를 판정 안에 **전제로** 넣는다(341 «전제» 절 방식). */
  ok(await p.evaluate(() => {
    const scrollable = [];
    let el = document.querySelector('#trRunes .tr-rn .rbt.b1');
    window.__scrHost = !!el;
    if (!el) { window.__scr = '⚠ 호스트 없음 — 셀렉터가 유령이다'; return false; }
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

    /* 490 — 구 «다이아 4회분» 항의 자리. 다이아를 잔뜩 쥐여 주고 룬강화석만 0 으로 두면
       **한 번도 안 돈다** 는 것을 묻는다(갈래가 되살아나면 이 항이 빨개진다). */
    await reset({ stone: 0, dia: 1e6 });
    const dOnly0 = await p.evaluate(() => S.dia);
    await touchHold(await aim(MAT), 2000);
    const v2 = await n(), dOnly1 = await p.evaluate(() => S.dia);
    /* ⚠ `__n` 은 `runeBuy` 호출 수다 — 막힌 첫 누름도 «부족» 안내를 위해 한 번 부른다(1 이 정상).
       반복이 안 도는 것(= 1 에서 멎는 것)과 다이아가 안 나가는 것을 같이 본다. */
    ok(v2 === 1 && dOnly0 - dOnly1 === 0,
      '★ 490 — 룬강화석 0 · 다이아 100만이면 **반복이 한 번도 안 돈다**(다이아 결제 폐지)',
      v2 + '회(안내 1) · 다이아 Δ' + (dOnly0 - dOnly1));
    await p.evaluate(() => { runeRate = window.__rate0; });
  }

  console.log('[E] 재렌더를 넘어 홀드가 산다 (64 교훈 1 · 262 ⓑ)');
  await reset();
  {
    const c = await aim(MAT);
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await new Promise(r => setTimeout(r, 400));
    /* 551 (2026-08-30) — 여기도 490 이 걷어낸 `[data-pay="mat"]` 이 남아 있었다.
       `__b0` 도 비교 대상도 **null** 이라 `null === null` 이 되어 이 절의 본체 단언이
       **상시 초록**이었다(재렌더가 노드를 갈아 끼워도 못 잡는다). 살아 있는 이름으로 옮기고
       «호스트가 실재한다» 를 곱해 유령이면 초록이 아니라 **빨강**이 되게 한다. */
    const node0 = await p.evaluate(() => { window.__b0 = document.querySelector('#trRunes .rbt.b1'); return !!window.__b0; });
    /* 홀드 중 통짜 렌더를 여러 번 부른다 — 노드가 갈리면 포인터 캡처가 끊겨 멎는다 */
    for (let i = 0; i < 5; i++) { await p.evaluate(() => { renderTrain(); renderTrainLive(); }); await new Promise(r => setTimeout(r, 90)); }
    const same = node0 && await p.evaluate(() => {
      const now = document.querySelector('#trRunes .rbt.b1');
      return !!now && window.__b0 === now;
    });
    const a = await n();
    await new Promise(r => setTimeout(r, 400));
    const b = await n();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {}); await p.waitForTimeout(140);
    ok(same, '홀드 중 renderTrain() 을 5회 불러도 누른 버튼 노드가 그대로다(innerHTML 교체 없음)',
      node0 ? '호스트 실재' : '⚠ 호스트 없음 — 셀렉터가 유령이다');
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
  ok(!/data-pay|RUNE_HOLD_DIA|RUNE_DIA/.test(fs.readFileSync(SRC, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')),
    'R2 — 490 이후 제품 줄에 `data-pay`·`RUNE_*_DIA` 가 0건이다(결제 갈래가 하나로 굳었다)');

  /* ── R3 (551, 2026-08-30) — «유령 셀렉터가 초록을 만들지 못한다» 되돌림 시험 ──────────
     R2 는 **제품**에 `data-pay` 가 없음을 단언했지만, 그것이 없어진 자리를 **자**가 계속
     가리키고 있어도 R2 는 초록이었다. 그 자리가 [B] 스크롤 사슬 · [E] 노드 동일성 두 항이고,
     둘 다 `querySelector` 의 null 을 그대로 삼켜 **한 바퀴도 안 돌고** 초록이었다.
     여기서 그 셋을 못박는다: ⓐ 옛 이름은 지금 정말 null 이다 ⓑ 새 판정 꼴에 그 유령을
     넣으면 초록이 아니라 **빨강**이 나온다 ⓒ 349 계열 자 두 파일의 단언 줄에 그 이름이 없다. */
  {
    /* ⚠ 아래 두 줄은 **일부러** 유령 이름을 쓴다(표본이다). R3c 가 자기 자신을 빨갛게 만들지
       않도록 `GHOST-SAMPLE` 꼬리표를 달고, R3c 는 그 꼬리표가 달린 줄만 건너뛴다 —
       꼬리표 없는 자리에 이름이 다시 새면 그때는 빨개진다. */
    const ghost = await p.evaluate(() => {
      const g = document.querySelector('#trRunes .tr-rn .rbt[data-pay="mat"]');   // GHOST-SAMPLE
      const live = document.querySelector('#trRunes .tr-rn .rbt.b1');
      /* 옛 [B] 꼴: null 이면 while 이 안 돌아 «스크롤 0개» 로 초록이 됐다 */
      const oldShape = (() => { let el = g, n2 = 0; while (el) { n2++; el = el.parentElement; } return n2 === 0; })();
      /* 새 [B] 꼴: 호스트가 없으면 곧바로 false */
      const newShape = (() => { if (!g) return false; let el = g; while (el) el = el.parentElement; return true; })();
      /* 옛 [E] 꼴: null === null 이라 항상 true */
      return { gone: !g, live: !!live, oldB: oldShape, newB: newShape, oldE: (g === document.querySelector('#trRunes .rbt[data-pay="mat"]')) };   // GHOST-SAMPLE
    });
    ok(ghost.gone && ghost.live,
      'R3a — 옛 이름 `.rbt[data-pay="mat"]` 은 지금 null 이고 살아 있는 `.rbt.b1` 만 있다',
      '유령 ' + (ghost.gone ? '없음' : '있음') + ' · 살아 있는 버튼 ' + (ghost.live ? '있음' : '없음'));
    ok(ghost.oldB === true && ghost.oldE === true && ghost.newB === false,
      'R3b — 그 유령을 넣으면 **옛 판정 꼴은 초록**([B] while 0바퀴 · [E] null===null)이고 **새 꼴은 빨강**이다',
      '옛[B] ' + ghost.oldB + ' · 옛[E] ' + ghost.oldE + ' · 새[B] ' + ghost.newB);
    /* 무엇을 금지하는가를 **좁게** 적는다 — 금지 대상은 «이름이 글자로 나오는 것» 이 아니라
       **셀렉터로 쓰이는 것**이다(항 이름·이 검사기 자신의 정규식은 이름을 담을 수밖에 없다).
       ⇒ `querySelector(...)`·`locator(...)` 안에서 그 이름을 찾고, 주석과 일부러 쓴 표본
       (GHOST-SAMPLE 꼬리표)은 뺀다. 꼬리표 없는 자리에 다시 새면 그때 빨개진다. */
    const SELUSE = /(querySelector(?:All)?|locator)\s*\([^)]*data-pay/;
    const strip = f => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter(l => !/GHOST-SAMPLE/.test(l));
    const dirty = ['verify349.js', 'probe349.js'].filter(f => strip(f).some(l => SELUSE.test(l)));
    ok(dirty.length === 0,
      'R3c — 349 계열 자 두 파일에 `data-pay` 를 **셀렉터로 쓰는 줄**이 0건이다(유령 재유입 차단)',
      dirty.length ? '남은 파일 ' + dirty.join(' , ') : 'verify349.js · probe349.js 둘 다 0건');
  }

  console.log('[G] 회귀');
  ok(aimBad === 0, '누른 좌표의 최상단 노드가 매번 그 버튼이었다(양성항 — 팝업이 덮지 않았다)',
    aimBad + '건 실패' + (aimTop.length ? ' · 덮은 노드 ' + [...new Set(aimTop)].join(' , ') : ''));
  /* ⚑ 524 — 유령 이름 재유입 차단. 이 항이 없으면 «치우기» 팔은 오타 하나로 다시 통째로 죽고,
     그 죽음은 [R1b]·양성항의 «가끔 빨강» 으로만 새어 나온다(등재문이 본 22~24/24). */
  const closerMiss = await p.evaluate(fs2 => fs2.filter(f => typeof window[f] !== 'function'), RESET_CLOSERS);
  ok(closerMiss.length === 0,
    '★ 524 — reset 이 부르는 «치우기» 훅 이름이 전부 제품에 실재한다(typeof 가드가 유령을 삼키지 않는다)',
    closerMiss.length ? '없는 이름 ' + closerMiss.join(' , ') : RESET_CLOSERS.length + '개 전부 실재');
  ok(!(await p.evaluate(() => { const d = document.getElementById('defw'); return !!d && d.classList.contains('on'); })),
    '★ 524 — 측정이 끝난 시점에 18 패배 화면이 켜져 있지 않다(켜지면 뒤 표본이 전부 «0회» 가 된다)',
    '막은 횟수 ' + (await p.evaluate(() => window.__def)) + '회');
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY349 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
