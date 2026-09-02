#!/usr/bin/env node
/* 작업 349 — 룬 [강화] «꾹 누르기» 가 왜 실기기에서 안 되는가 (재현 도구)
 *
 *   node tools/probe349.js
 *
 * 338 규칙: **처방을 따르기 전에 먼저 재현한다.** 등재문의 세 가설(ⓐ 어느 버튼 · ⓑ 터치/마우스 ·
 * ⓒ 재렌더 포인터 캡처)을 각각 독립 축으로 굴려, 어느 조합에서 «연속» 이 죽는지 표로 찍는다.
 *
 * 297 게이트(verify203 [10])와 다른 점 — 그 게이트는 **네 가지를 전부 실기기와 다르게** 세워 둔다:
 *   ① 마우스로만 누른다(실기기는 터치)           ② `step = () => {}` 로 게임 루프를 세운다
 *   ③ `runeRate = () => 0` 으로 전부 실패시킨다   ④ 다이아 칸은 «1회만» 을 단언한다(ⓓ)
 * 이 도구는 그 넷을 전부 «실기기 쪽» 으로 돌려놓고 잰다.
 *
 * 세는 법: `runeBuy` 를 감싸 호출 횟수를 직접 센다(재화 차감 ÷ 비용 은 레벨이 오르면 비용이
 * 변해 못 쓴다 — 실제 확률로 굴리는 것이 이 도구의 요점이라 레벨은 반드시 움직인다).
 * 홀드가 «언제» 죽었는지도 20ms 간격으로 표본을 떠 남긴다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
/* 540 — «치우기» 닫개 한 벌. 여기 손으로 적혀 있던 목록에는 제품에 없는 이름
   `closeDefeat` 가 섞여 있었고(index.html 0건), `typeof` 가드가 그것을 조용히 삼켜
   18 패배 화면을 치우는 팔이 한 번도 돈 적이 없다. */
const { install, missingClosers, defeatStuck, blockedLabel } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.P349_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const HOLD = Number(process.env.P349_HOLD || 1500);

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

  /* --- 계측기: runeBuy 호출 수 · 홀드 생사 표본 · 포인터 이벤트 로그 --- */
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__buy = [];
    const orig = window.runeBuy;
    /* 551 — 490 이후 서명은 `runeBuy(id, quiet)` 다(제품 32189). 옛 세 인자 사본은 `quiet` 를
       `pay` 자리에 받아 «결제 갈래» 를 조용히 지어내고 있었다 — 쓰는 항이 없어 안 빨개졌을 뿐이다. */
    window.runeBuy = function (id, quiet) {
      const r = orig.apply(this, arguments);
      window.__buy.push({ t: performance.now(), id, quiet: !!quiet, ok: !!r });
      return r;
    };
    /* ⚑ 701·797 이관(2026-09-02) — «1회» 함수가 **둘로 갈렸다**: 코어 `runeTryOne` + 막힌 첫 누름의
       안내 `runeBuy`. 홀드 틱은 이제 `runeTryBatch` → `runeTryOne` 만 지나므로 옛 이름 하나만 세면
       이 재현기는 «0회» 를 찍는다(제품은 멀쩡하다 — `verify349` 가 같은 처방으로 29/29 로 돌아왔다).
       ⚠ 둘을 **같은 장부에 더한다** — 홀드에서 둘은 서로 배타적이라(막히면 코어에 못 간다) 겹치지
         않고, 그래야 `__buy` 의 뜻(«이 자리가 실제로 부른 1회 — 막힌 안내 포함»)이 안 바뀐다. */
    const core = window.runeTryOne;
    if (typeof core === 'function') window.runeTryOne = function (id) {
      const r = core.apply(this, arguments);
      window.__buy.push({ t: performance.now(), id, quiet: true, ok: true, core: true });
      return r;
    };
    window.__ev = [];
    ['pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'touchstart', 'touchend', 'touchcancel']
      .forEach(k => addEventListener(k, e => {
        if (window.__ev.length < 400) window.__ev.push({ t: performance.now(), k, x: Math.round(e.clientX || 0), y: Math.round(e.clientY || 0) });
      }, true));
    window.__samp = [];
    window.__sampler = setInterval(() => {
      if (window.__samp.length < 400) window.__samp.push({ t: performance.now(), on: !!(typeof rtHold !== 'undefined' && rtHold), n: (typeof rtHold !== 'undefined' && rtHold) ? rtHold.n : 0 });
    }, 20);
  });

  /* 세팅 — 실기기와 같게: 게임 루프는 **돌린다**, 확률도 **진짜**로 굴린다 */
  const setup = async (o) => {
    await p.evaluate(op => {
      /* 죽어서 패배 화면이 버튼을 덮는 것만 막는다(74 규약) — 루프 자체는 돌린다 */
      if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
      window.__clear540();   /* 540 — 닫개 + 이름 없는 껍데기(#defw) */
      if (op.rate0) { if (!window.__rate0) window.__rate0 = runeRate; runeRate = () => 0; }
      else if (window.__rate0) runeRate = window.__rate0;
      if (op.stopLoop) { if (typeof step === 'function') { window.__step0 = step; step = () => {}; } }
      else if (window.__step0) step = window.__step0;
      S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e9; S.dia = 1e9;
      openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
      window.__buy = []; window.__ev = []; window.__samp = [];
    }, o);
    await p.waitForTimeout(450);   /* 팝업 슬라이드 종료 대기(297 함정 ①) */
  };

  const box = async sel => {
    await p.locator(sel).scrollIntoViewIfNeeded();
    const bb = await p.locator(sel).boundingBox();
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  };
  const hitOk = (sel, c) => p.evaluate(o => {
    const el = document.elementFromPoint(o.x, o.y);
    return !!(el && el.closest && el.closest(o.sel));
  }, { sel, x: c.x, y: c.y });

  const holdMouse = async (c, ms) => {
    await p.mouse.move(c.x, c.y); await p.mouse.down();
    await p.waitForTimeout(ms); await p.mouse.up(); await p.waitForTimeout(120);
  };
  /* 실기기 터치: touchStart 후 ack 를 기다리지 않는다(142). 손가락은 «가만히» 둔다. */
  const holdTouch = async (c, ms) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await new Promise(r => setTimeout(r, ms));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(120);
  };
  /* 실기기 터치 + 손가락 미세 떨림(±2px) — 사람이 «꾹» 누르면 반드시 생긴다 */
  const holdTouchJitter = async (c, ms) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 60));
      const dx = (Math.random() * 4 - 2), dy = (Math.random() * 4 - 2);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + dx, y: c.y + dy }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(120);
  };

  /* 551 (2026-08-30) — 490 이 결제 갈래를 «룬강화석 하나» 로 굳히며 `data-pay` 를 통째로 걷어냈다
     (`grep -c data-pay index.html` = 0). 옛 셀렉터는 30초 `scrollIntoViewIfNeeded` 타임아웃으로
     이 도구를 **첫 표본에서 즉사**시켜 단언이 한 항도 안 돌았다. `verify349` 가 이미 옮겨 둔
     자리(«유일한 버튼»)를 그대로 쓴다 — 제품은 옳고 자만 낡았던 자리라 제품 0줄이다. */
  const MAT = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';

  const run = async (name, sel, how, o) => {
    await setup(o || {});
    const c = await box(sel);
    const aimed = await hitOk(sel, c);
    await how(c, HOLD);
    const r = await p.evaluate(() => {
      const b = window.__buy, s = window.__samp, e = window.__ev;
      const first = b.length ? b[0].t : 0;
      const last = b.length ? b[b.length - 1].t : 0;
      const died = (() => { const on = s.filter(x => x.on); return on.length ? on[on.length - 1].t : 0; })();
      const born = (() => { const on = s.find(x => x.on); return on ? on.t : 0; })();
      return {
        n: b.length, succ: b.filter(x => x.ok).length, span: Math.round(last - first),
        aliveMs: born ? Math.round(died - born) : 0,
        cancel: e.filter(x => x.k === 'pointercancel' || x.k === 'touchcancel').length,
        moves: e.filter(x => x.k === 'pointermove').length,
        lv: runeLvOf('r1'),
        /* 551 — setup 이 둘 다 1e9 로 세우므로 «지금 값» 이 곧 «빠져나간 양» 이다.
           490 이관: 옛 [B]«다이아칸» 두 항의 자리를 이 축이 받는다(자리를 비우지 않는다). */
        dia: S.dia, rstone: S.rstone,
        btns: document.querySelectorAll('#trRunes .tr-rn[data-rune="r1"] .rbt').length
      };
    });
    console.log('  · ' + name.padEnd(34) + ' 시도 ' + String(r.n).padStart(3)
      + '회 · 성공 ' + String(r.succ).padStart(2) + ' · Lv ' + String(r.lv).padStart(3)
      + ' · 홀드생존 ' + String(r.aliveMs).padStart(4) + 'ms · 취소 ' + r.cancel
      + ' · move ' + r.moves + (aimed ? '' : ' · ⚠조준실패'));
    return r;
  };

  console.log('[A] 룬 [강화] 재료칸 — 입력 종류별 (홀드 ' + HOLD + 'ms · 게임 루프 ON · 실제 확률)');
  const a1 = await run('마우스(297 게이트와 같은 조건)', MAT, holdMouse, { rate0: true, stopLoop: true });
  const a2 = await run('마우스 · 루프 ON · 실제 확률', MAT, holdMouse, {});
  const a3 = await run('터치(가만히)', MAT, holdTouch, {});
  const a4 = await run('터치(±2px 떨림 = 실제 손가락)', MAT, holdTouchJitter, {});

  /* [B] 490 이관 — 구 «다이아칸도 홀드를 타는가» 두 항의 자리다. 다이아 결제가 폐지돼
     그 칸 자체가 없어졌으므로, **자리를 비우지 않고**(333 처방) 같은 손·같은 홀드로
     «결제가 정말 한 갈래인가» 를 묻는 살아 있는 축으로 갈아 끼운다.
     [A] 와 겹치지 않는 것은 이 절이 **빠져나간 재화의 양**을 직접 세기 때문이다. */
  console.log('[B] 결제 갈래가 하나 — 홀드가 도는 동안 룬강화석만 빠진다 (490 이관)');
  const b1 = await run('마우스 · 재화 계측', MAT, holdMouse, {});
  const b2 = await run('터치(떨림) · 재화 계측', MAT, holdTouchJitter, {});

  /* ─ 드리프트: 이 작업의 **둘째 원인**. 손가락이 버튼 «안» 에서만 굴러도 브라우저가
       터치를 스크롤 제스처로 채가 pointercancel 을 쏘면 홀드가 1회에서 멎는다. ─ */
  const holdDrift = async (c, ms, r) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); let i = 0;
    while (Date.now() - t0 < ms) {
      await new Promise(z => setTimeout(z, 60)); i++;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + Math.sin(i / 2) * r, y: c.y + Math.cos(i / 2) * r }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {}); await p.waitForTimeout(120);
  };
  console.log('[C] 손가락 드리프트 — 버튼(420×112) «안» 에서만 구른다');
  const d = {};
  for (const r of [6, 14, 30, 45]) d[r] = await run('±' + r + 'px 드리프트', MAT, (c, ms) => holdDrift(c, ms, r), {});

  console.log('[D] (대조) 23 훈련 카드 — 64 경로도 같은 규칙을 타는가');
  await setup({});
  await p.evaluate(() => { S.gold = 1e15; openTrain(); setTrSub('train'); renderTrain(); });
  await p.waitForTimeout(450);
  let cTr = 0;
  {
    const c = await box('#trCards [data-tr="atk"]');
    const before = await p.evaluate(() => lv('atk'));
    await holdDrift(c, HOLD, 30);
    cTr = (await p.evaluate(() => lv('atk'))) - before;
    console.log('  · 훈련 atk 터치 ±30px 드리프트 1.5초 → +' + cTr + '레벨');
  }

  console.log('\n[판정]');
  ok(a1.n >= 3, 'ⓐ 297 게이트 조건(마우스·루프정지·확률0)에서는 연속이 돈다', a1.n + '회');
  ok(a2.n >= 3, 'ⓑ 마우스 + 게임 루프 ON + 실제 확률에서도 연속이 도는가', a2.n + '회');
  ok(a3.n >= 3, 'ⓒ 터치(가만히)에서도 연속이 도는가', a3.n + '회');
  ok(a4.n >= 3, 'ⓓ 터치(±2px 떨림 = 실제 손가락)에서도 연속이 도는가', a4.n + '회');
  /* ⓔⓕ — 490 이관. 옛 «다이아칸» 두 항이 있던 자리이고, 묻는 것은 그 뒤집힌 쪽이다:
     칸이 하나뿐이며 그 하나가 **룬강화석만** 먹는가(다이아는 한 푼도 안 나간다). */
  ok(b1.btns === 1 && b1.n >= 3 && b1.dia === 1e9 && b1.rstone < 1e9,
    'ⓔ 490 — 시도 버튼은 하나뿐이고, 마우스 홀드가 도는 동안 룬강화석만 빠진다',
    '버튼 ' + b1.btns + ' · ' + b1.n + '회 · 다이아 Δ' + (1e9 - b1.dia) + ' · 룬강화석 Δ' + (1e9 - b1.rstone));
  ok(b2.btns === 1 && b2.n >= 3 && b2.dia === 1e9 && b2.rstone < 1e9,
    'ⓕ 같은 것이 «실제 손가락»(터치 ±2px 떨림)에서도 성립한다',
    '버튼 ' + b2.btns + ' · ' + b2.n + '회 · 다이아 Δ' + (1e9 - b2.dia) + ' · 룬강화석 Δ' + (1e9 - b2.rstone));
  ok(d[6].n >= 3 && d[14].n >= 3, 'ⓖ ±6·±14px 드리프트에서 연속이 유지된다', d[6].n + ' · ' + d[14].n + '회');
  ok(d[30].n >= 3, 'ⓗ ★ ±30px(실기기 1.9mm) 드리프트에서도 유지된다 — 수리 전엔 1회였다', d[30].n + '회');
  ok(d[30].cancel === 0, 'ⓘ 그 구간에서 pointercancel 이 0건이다(제스처를 안 뺏긴다)', d[30].cancel + '건');
  ok(d[45].n >= 3, 'ⓙ ±45px 에서도 유지(버튼 112 높이 안이면 «이탈» 이 아니다)', d[45].n + '회');
  ok(cTr >= 3, 'ⓚ (대조) 64 훈련 카드도 같은 규칙을 타 ±30px 에서 연속이 돈다', '+' + cTr + '레벨');

  /* ⚑ 540 — 유령 재유입 차단(524 가 349 에서 겪은 «가끔 22~24/24» 의 씨앗) */
  const cl540 = await missingClosers(p);
  ok(cl540.length === 0,
    '★ 540 — 닫개 이름이 전부 제품에 실재한다(typeof 가드가 유령을 삼키지 않는다)',
    cl540.length ? '없는 이름 ' + cl540.join(' , ') : '전부 실재');
  ok(!(await defeatStuck(p)),
    '★ 540 — 측정이 끝난 시점에 18 패배 화면이 켜져 있지 않다(켜지면 뒤 표본이 전부 «0회» 다)',
    await blockedLabel(p));
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nPROBE349 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
