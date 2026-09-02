#!/usr/bin/env node
/* 작업 524 — `tools/verify349.js` [R1b]·[G] 플레이키 재현 (2026-08-30 등재, 488 워커 A 곁다리 관측)
 *
 *   node tools/probe524.js [자연스윕 반복수]
 *
 * 등재문: «[R1b] «걷으면 도로 초록이다» 가 플레이키 — 22~24/24 사이를 오간다.
 *          같이 흔들리는 항: 양성항 «누른 좌표의 최상단 노드가 매번 그 버튼이었다»».
 * 등재문 처방: «표본을 여러 번 굴려 다수결로 판정하라».
 *
 * ⚑ 재현이 그 처방을 기각했다 — 흔들림은 확률이 아니라 **결정적**이다(LESSONS 353-②).
 *   뿌리는 하나: 18 패배 화면 `#defw.on`(z39 · inset:0)이 룬 버튼을 통째로 덮은 채 **굳는다.**
 *   verify349 의 reset 은 `closeDefeat` 를 부르는데 그 이름은 **제품에 없고**(index.html 0건)
 *   `typeof … === 'function'` 가드가 그 사실을 조용히 삼킨다 = 치우는 팔이 한 번도 돈 적이 없다.
 *   hp 되채움(200ms 폴링)은 «죽는 순간» 과의 경주라 언젠가 진다. 한 번 지면 그 뒤 표본은 전부 0회다.
 *   ⇒ 회수는 «다수결» 이 아니라 **원인 제거**다. 다수결로 덮었으면 진짜 회귀(홀드가 실제로 죽는 것)까지
 *      같이 덮였을 것이다.
 *
 * 절: [1] 되돌림 시험(수리 전 손 vs 수리 후 손 — 사망을 **직접 일으켜** 결정적으로 잰다)
 *     [2] 자연 사망 스윕(R1/R1b 쌍을 N 회 — 굳는 순간이 표에 그대로 찍힌다)
 *     [3] 유령 이름 — `closeDefeat` 가 제품에 없다는 사실 자체
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const N = Number(process.argv[2] || 10);
const FILE = process.env.V349_FILE || 'index.html';
const SRC = path.resolve(__dirname, '..', FILE);
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };

const MAT = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';
/* verify349 가 쓰는 «치우기» 훅 목록 — 수리 전에는 여기 `closeDefeat` 가 섞여 있었다 */
const CLOSERS_OLD = ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult'];
const CLOSERS_NEW = ['closeDunClear', 'closeModal', 'closeDungeon', 'closeSummonResult'];

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

  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__n = 0; window.__cx = 0; window.__def = 0;
    /* ⚑ 701·797 이관(2026-09-02) — «1회» 가 코어 `runeTryOne` + 막힌 안내 `runeBuy` 로 갈렸다.
       둘은 홀드에서 배타적이라 **같은 카운터에 더한다**(`verify349` 와 같은 처방 · 옛 이름
       하나만 세면 이 재현기가 «0회» 로 읽힌다 — 제품은 멀쩡하다). */
    const o = window.runeBuy;
    window.runeBuy = function () { window.__n++; return o.apply(this, arguments); };
    const o1 = window.runeTryOne;
    if (typeof o1 === 'function') window.runeTryOne = function () { window.__n++; return o1.apply(this, arguments); };
    addEventListener('pointercancel', () => window.__cx++, true);
    setInterval(() => { try { if (typeof maxHp === 'function' && S.hp != null) S.hp = maxHp(); } catch (_) {} }, 200);
    /* 수리 «후» 팔만 켤 수 있게 스위치로 심는다 — 되돌림 시험이 두 손을 같은 실행에서 비교한다 */
    window.__fix = false;
    const _od = window.openDefeat;
    window.openDefeat = function () {
      window.__def++;
      try { _od.apply(this, arguments); } catch (_) {}
      if (window.__fix) { const d = document.getElementById('defw'); if (d) d.classList.remove('on'); }
    };
  });

  /* fix=false 면 «수리 전 손»(유령 closeDefeat · 껍데기 안 걷음), true 면 «수리 후 손» */
  const reset = async (fix) => {
    await p.evaluate(op => {
      window.__fix = op.fix;
      op.closers.forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
      if (op.fix) { const d = document.getElementById('defw'); if (d) d.classList.remove('on'); }
      S.rune = { r1: 0, r2: 0, r3: 0 };
      S.rstone = 1e9; S.dia = 1e9;
      openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
      window.__n = 0; window.__cx = 0;
    }, { fix: !!fix, closers: fix ? CLOSERS_NEW : CLOSERS_OLD });
    await p.waitForTimeout(450);
  };
  const aim = async () => {
    await p.locator(MAT).scrollIntoViewIfNeeded();
    const bb = await p.locator(MAT).boundingBox();
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, w: bb.width, h: bb.height };
    c.top = await p.evaluate(o => {
      const el = document.elementFromPoint(o.x, o.y);
      if (el && el.closest && el.closest(o.sel)) return 'HIT';
      if (!el) return '(null)';
      const cn = el.className && el.className.baseVal != null ? el.className.baseVal : el.className;
      const cls = String(cn || '').trim();
      return el.tagName + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.split(/\s+/).join('.') : '');
    }, { sel: MAT, x: c.x, y: c.y });
    return c;
  };
  const n = () => p.evaluate(() => window.__n);
  const cx = () => p.evaluate(() => window.__cx);
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
  const defOn = () => p.evaluate(() => { const d = document.getElementById('defw'); return !!d && d.classList.contains('on'); });
  /* 사망을 «기다리지» 않고 직접 일으킨다 — 확률 실험 스무 번보다 결정적인 한 표가 강하다(353-②).
     `openDefeat` 는 제품 주석대로 표시 전용이라(24084 «자동 부활은 그대로 진행») 이것이 곧 사망 표시다. */
  const die = () => p.evaluate(() => { openDefeat(); });

  /* 한 팔 = 사망 → reset → aim → 1.5초 홀드(±30px). 수리 전/후에서 같은 손을 쓴다. */
  const arm = async (fix) => {
    await reset(fix);
    await die();
    const onRightAfterDeath = await defOn();
    await reset(fix);
    const c = await aim();
    await touchHold(c, 1500, 30);
    return { v: await n(), c: await cx(), top: c.top, stuck: await defOn(), opened: onRightAfterDeath };
  };

  console.log('[1] 되돌림 시험 — 사망을 직접 일으켜 «수리 전 손 ↔ 수리 후 손» 을 같은 실행에서 잰다');
  const before = await arm(false);
  console.log('  수리 전 손: 시도 ' + before.v + '회 · 취소 ' + before.c + ' · 최상단 ' + before.top + ' · 홀드 뒤 defw.on ' + before.stuck);
  const after = await arm(true);
  console.log('  수리 후 손: 시도 ' + after.v + '회 · 취소 ' + after.c + ' · 최상단 ' + after.top + ' · 홀드 뒤 defw.on ' + after.stuck);
  ok(before.opened === true, '전제 — `openDefeat()` 한 번이 `#defw.on` 을 실제로 켠다(사망 재현이 공허하지 않다)');
  ok(before.top !== 'HIT' && /defw/.test(before.top),
    '★ 수리 전 손 — reset 을 지나도 `#defw.on` 이 버튼을 덮은 채 **굳는다**(유령 `closeDefeat` 가 안 치운다)', before.top);
  ok(before.v === 0,
    '★ 수리 전 손 — 그래서 홀드가 «0회» 로 읽힌다 = [R1b](v≥5)·[G](양성항) 둘이 같이 빨개진다', before.v + '회');
  ok(after.top === 'HIT' && after.stuck === false,
    '★ 수리 후 손 — 같은 사망을 겪고도 버튼이 최상단이다(껍데기를 즉시 걷는다)', after.top);
  ok(after.v >= 5, '★ 수리 후 손 — 홀드가 그대로 돈다(무르게 푼 것이 아니라 원인을 없앤 것)', after.v + '회');

  console.log('\n[2] 자연 사망 스윕 — R1/R1b 쌍 ' + N + '회 (수리 전 손). 굳는 순간이 표에 찍힌다');
  console.log('  #   auto: v / cancel / top          none: v / cancel / top');
  const B = [];
  const inject = () => p.addStyleTag({ content: '#trw .tr-card,#trw [data-runebuy],#trw [data-tempup],#trw [data-tpchg]{touch-action:auto !important}' });
  const strip = () => p.evaluate(() => { [...document.querySelectorAll('style')].forEach(s => { if (/touch-action:auto !important/.test(s.textContent)) s.remove(); }); });
  await p.evaluate(() => { const d = document.getElementById('defw'); if (d) d.classList.remove('on'); });
  for (let i = 0; i < N; i++) {
    await inject(); await reset(false);
    const ca = await aim(); await touchHold(ca, 1500, 30);
    const va = await n(), xa = await cx();
    await strip(); await reset(false);
    const cb = await aim(); await touchHold(cb, 1500, 30);
    const vb = await n(), xb = await cx();
    B.push({ va, xa, ta: ca.top, vb, xb, tb: cb.top });
    console.log('  ' + String(i + 1).padStart(2) + '  ' + String(va).padStart(3) + ' / ' + String(xa).padStart(2) + ' / ' + ca.top.slice(0, 22).padEnd(26) +
      String(vb).padStart(3) + ' / ' + String(xb).padStart(2) + ' / ' + cb.top.slice(0, 22));
  }
  const r1b = B.filter(o => o.vb >= 5).length;
  const covered = B.filter(o => o.ta !== 'HIT' || o.tb !== 'HIT').length;
  const defCnt = await p.evaluate(() => window.__def);
  console.log('  현재 단언 [R1b](v≥5) 참 ' + r1b + '/' + N + ' · 양성항이 놓친 시행 ' + covered + '/' + N + ' · openDefeat 발화 누적 ' + defCnt + '회');
  console.log('  (관측 절이다 — 자연 사망은 실행마다 나기도 안 나기도 한다. 결정적 근거는 §1 이 준다.)');

  console.log('\n[3] 유령 이름 — 자가 부르던 `closeDefeat` 는 제품에 없다');
  const src = fs.readFileSync(SRC, 'utf8');
  ok(!/closeDefeat/.test(src), '★ `closeDefeat` 가 `' + FILE + '` 에 0건이다(자가 없는 이름을 불러 왔다)');
  const miss = await p.evaluate(fs2 => fs2.filter(f => typeof window[f] !== 'function'), CLOSERS_NEW);
  ok(miss.length === 0, '수리 후 목록은 전부 실재한다', miss.join(' , ') || CLOSERS_NEW.length + '개');
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nPROBE524 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
