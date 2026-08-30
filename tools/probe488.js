#!/usr/bin/env node
/* 작업 488 — «룬 연속 강화 중에 아무 반응이 없다» 재현 도구 (338 규칙: 처방 전에 먼저 묻는다)
 *
 *   node tools/probe488.js
 *
 * 등재문의 주장은 «누르고 있는 3~10초 동안 화면은 숫자 외에 아무 반응이 없다» 이다.
 * 그것을 «믿고» 고치면 338·341 처럼 이미 참인 것을 게이트로 굳히거나(341) 없는 결함을 고칠 수 있다.
 * 그래서 여기서는 **보이는 사건을 직접 센다** — 셋 다 DOM 사실이다:
 *   ⓐ `#fxl` 에 실제로 붙은 노드 수(플로터·플래시·파티클·토스트)  — MutationObserver
 *   ⓑ 홀드 호스트(룬 카드 · 버튼 · 재화 알약)에 붙은 애니메이션 클래스 토글 수 — MutationObserver(attributes)
 *   ⓒ `runeBuy` 실제 호출(시도) 수 — 함수 래핑
 * 판정 눈금은 지시 ④ 그대로: **시도 1회당 «보이는 사건» ≥ 1**.
 *
 * 네 자리를 같은 자로 잰다(지시 ③ — 룬·단련·장비·유물이 같은 부품을 써야 한다):
 *   [A] 룬 강화 홀드(rtRuneHold)  [B] 단련 투자 홀드(rtTemperHold)
 *   [C] 장비/스킬 세부 [강화] 홀드(bindUpHold)  [D] 유물 소환 홀드(rwHold)
 * 대조군으로 [E] 23 훈련 카드 홀드(64 trHold — 여기도 «반복분은 정지할 때 한 번» 규약이다).
 *
 * ⚠ 홀드 중에는 통짜 재렌더가 멈추므로(297) 노드가 살아 있다 — 클래스 토글을 노드 교체로
 *   착각하지 않게 attributes 만 본다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = process.env.P488_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const HOLD = Number(process.env.P488_HOLD || 3000);

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
  const cdp = await ctx.newCDPSession(p);

  /* ── 계측기 ─────────────────────────────────────────────────────────── */
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__M = { fx: [], cls: [], try: [], sfx: [] };
    /* ⓐ #fxl 에 붙는 노드 = «화면에 새로 뜬 것» */
    const L = document.getElementById('fxl');
    new MutationObserver(recs => {
      for (const r of recs) for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        window.__M.fx.push({ t: performance.now(), cls: n.className || '', tag: n.tagName });
      }
    }).observe(L, { childList: true, subtree: true });
    /* ⓑ **홀드 호스트 안에서만** class 변화를 센다.
       ⚠ 1회차 함정 — 처음엔 `document.body` 전수로 셌더니 룬 홀드 3초에 «애니클래스 34» 가 나와
         «시도당 1.36» 으로 읽혔다. 그런데 그 34 는 전부 **02 메인 화면 스킬 슬롯**의 쿨타임
         글로우(`jz-cdok`/`jz-cast`, 35610)다 — 게임 루프가 도는 동안 팝업 뒤에서 계속 도는 것이라
         룬 강화와 아무 상관이 없다. 사람이 보는 «이 카드가 반응했는가» 를 재려면 스코프가
         호스트여야 한다(A3-ⓔ «마스크가 다르면 다른 것을 잰다»). */
    const ANIM = /^(jz-|fx-)/;
    window.__scope = ['#trw', '#modal', '#relw', '.curs', '.pcb'];
    const inScope = el => window.__scope.some(s => el.closest && el.closest(s));
    new MutationObserver(recs => {
      for (const r of recs) {
        const el = r.target, now = (el.className || '') + '';
        const was = r.oldValue || '';
        const add = now.split(/\s+/).filter(c => ANIM.test(c) && !(' ' + was + ' ').includes(' ' + c + ' '));
        if (!add.length || !inScope(el)) continue;
        window.__M.cls.push({ t: performance.now(), add: add.join(','), el, host: (el.className || '').split(/\s+/)[0] || el.id || el.tagName });
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
    /* ⓒ 시도 수 — 각 홀드가 실제로 부르는 «1회» 함수를 감싼다 */
    const wrap = (name) => {
      const o = window[name];
      if (typeof o !== 'function') return;
      window[name] = function () { const r = o.apply(this, arguments); window.__M.try.push({ t: performance.now(), fn: name, ok: r !== false }); return r; };
    };
    ['runeBuy', 'temperUpBtn', 'levelUp', 'summonRelic', 'trainBuy'].forEach(wrap);
    const sf = window.sfx;
    if (typeof sf === 'function') window.sfx = function (k) { window.__M.sfx.push({ t: performance.now(), k }); return sf.apply(this, arguments); };
  });

  const reset = () => p.evaluate(() => { window.__M = { fx: [], cls: [], try: [], sfx: [] }; });

  /* ⚠ 2회차 함정 — «#fxl 노드» 와 «HUD 알약 클래스» 는 **전투 골드**로도 움직인다(게임 루프 ON).
     그래서 축을 둘로 가른다: `host` = 홀드 호스트(카드·버튼) 안에서 일어난 사건만 ·
     `hud` = 그 밖(HUD 알약·#fxl). 지시 ①이 요구하는 것은 **호스트 쪽**이다(«토스트 대신 룬 카드 자체에»). */
  const stats = (fnNames, hostSel) => p.evaluate(o => {
    const M = window.__M;
    const tries = M.try.filter(x => o.names.includes(x.fn));
    /* ⚠ 3회차 함정 — 호스트 셀렉터에 **조상 결합자를 쓰면 안 된다**. 홀드가 끝나면 `end` 의
       `renderTrain()` 이 카드를 innerHTML 로 갈아 끼우므로, 기록해 둔 노드는 그때 **떨어져 나간다**.
       떨어진 노드에서 `closest('#trRunes .tr-rn[...]')` 는 `#trRunes` 조상이 없어 항상 null 이다
       (`jz-hb@tr-rn` 이 분명히 찍혀 있는데 «호스트 사건 0» 이 나온 것이 이것이었다).
       ⇒ 호스트는 **자기 자신만으로 판정되는 셀렉터**로 준다. */
    const inHost = e => !!(o.host && e.el && e.el.closest && e.el.closest(o.host));
    const hostEv = M.cls.filter(inHost);
    return {
      tries: tries.length,
      fx: M.fx.length,
      fxKinds: [...new Set(M.fx.map(x => (x.cls + '').trim().split(/\s+/).join('.')))].slice(0, 8),
      cls: M.cls.length,
      host: hostEv.length,
      hostKinds: [...new Set(hostEv.map(x => x.add + '@' + x.host))].slice(0, 8),
      clsKinds: [...new Set(M.cls.map(x => x.add + '@' + x.host))].slice(0, 8),
      sfx: M.sfx.length
    };
  }, { names: fnNames, host: hostSel || null });

  const box = async sel => {
    try { await p.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 4000 }); } catch (_) {}
    const bb = await p.locator(sel).first().boundingBox({ timeout: 4000 }).catch(() => null);
    if (!bb || !bb.width) return null;
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  };
  /* 실기기 터치 + 미세 떨림(사람이 «꾹» 누르면 반드시 생긴다 — 349 가 쓴 것과 같은 손) */
  const holdTouch = async (c, ms) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await new Promise(r => setTimeout(r, 80));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + (Math.random() * 4 - 2), y: c.y + (Math.random() * 4 - 2) }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(150);
  };

  const row = (name, s) => {
    const per = s.tries ? s.host / s.tries : 0;
    console.log('  · ' + name.padEnd(22)
      + ' 시도 ' + String(s.tries).padStart(3)
      + ' · 호스트 사건 ' + String(s.host).padStart(3)
      + ' (시도당 ' + per.toFixed(2) + ')'
      + ' · #fxl ' + String(s.fx).padStart(3)
      + ' · 전체 클래스 ' + String(s.cls).padStart(3)
      + (s.hostKinds.length ? '  {host: ' + s.hostKinds.join(' ') + '}' : '  {host: —}')
      + (process.env.P488_V ? '\n      {all: ' + s.clsKinds.join(' ') + '}' : ''));
    return per;
  };

  /* ── [A] 룬 강화 홀드 ─────────────────────────────────────────────── */
  await p.evaluate(() => {
    if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
    ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult']
      .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e9; S.dia = 1e9; S.gold = 1e15;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
  });
  await p.waitForTimeout(450);
  console.log('[A] 룬 [강화] 재료칸 홀드 ' + HOLD + 'ms (rtRuneHold)');
  await reset();
  const cA = await box('#trRunes .tr-rn[data-rune="r1"] .rbt.b1');
  if (cA) await holdTouch(cA, HOLD);
  const A = await stats(['runeBuy'], '.tr-rn[data-rune="r1"]');
  const perA = row('룬 강화', A);

  /* ── [B] 단련 투자 홀드 ────────────────────────────────────────────── */
  await p.evaluate(() => {
    S.tstone = 1e9; openTrain(); setTrSub('temper'); renderTrain();
    if (typeof temperCharge === 'function') { try { temperCharge(1e6); } catch (_) {} }
    renderTrain();
  });
  await p.waitForTimeout(450);
  console.log('[B] 단련 [투자] 홀드 (rtTemperHold)');
  await reset();
  const tsel = '#trTemper .tr-tp[data-temper] .tb';
  const B = await p.locator(tsel).first().count().then(async n => {
    if (!n) { console.log('  · 단련 버튼 없음 — 건너뜀'); return null; }
    const c = await box(tsel);
    if (!c) { console.log('  · 단련 버튼 안 보임 — 건너뜀'); return null; }
    await holdTouch(c, HOLD);
    return stats(['temperUpBtn'], '.tr-tp[data-temper]');
  });
  const perB = B ? row('단련 투자', B) : 0;

  /* ── [C] 08 세부 팝업 [강화] 홀드 (bindUpHold) ──────────────────────── */
  await p.evaluate(() => {
    try { closeModal(); } catch (_) {}
    /* 스킬 하나를 보유·강화 가능한 상태로 만든다(`has`·`oLv`·`frag` 는 전부 `S.own[id]` 한 칸을 읽는다) */
    const id = SKILLS[0].id;
    S.own[id] = { l: 1, n: 1e9 };
    S.gold = 1e15; S.dia = 1e9;
    showSkillDetail(id);
    window.__skid = id;
  });
  await p.waitForTimeout(400);
  console.log('[C] 08 스킬 세부 [강화] 홀드 (bindUpHold)');
  await reset();
  const C = await p.locator('#mLv').count().then(async n => {
    if (!n) { console.log('  · #mLv 없음 — 건너뜀'); return null; }
    const dis = await p.locator('#mLv').isDisabled().catch(() => true);
    if (dis) { console.log('  · #mLv disabled — 건너뜀'); return null; }
    const c = await box('#mLv');
    if (!c) { console.log('  · #mLv 안 보임 — 건너뜀'); return null; }
    await holdTouch(c, HOLD);
    return stats(['levelUp'], '.sk-lv, .sk-act, .sk-u');
  });
  const perC = C ? row('스킬 세부 강화', C) : 0;

  /* ── [D] 89 유물 소환 홀드 (rwHold) ────────────────────────────────── */
  await p.evaluate(() => {
    try { closeModal(); closeTrain(); } catch (_) {}
    S.relic = 1e9; S.dia = 1e9;      /* ⚠ 유물 소환 재료는 `S.relic` 이다(relicCost 가 읽는 칸) */
    if (typeof openRelw === 'function') openRelw();
  });
  await p.waitForTimeout(500);
  console.log('[D] 89 유물 소환 홀드 (rwHold)');
  await reset();
  const D = await p.locator('#rwBasin').count().then(async n => {
    if (!n) { console.log('  · #rwBasin 없음 — 건너뜀'); return null; }
    const c = await box('#rwBasin');
    if (!c) { console.log('  · #rwBasin 안 보임 — 건너뜀'); return null; }
    await holdTouch(c, HOLD);
    return stats(['summonRelic'], '#rwBasin');
  });
  const perD = D ? row('유물 소환', D) : 0;

  /* ── [E] (대조) 23 훈련 카드 홀드 ─────────────────────────────────── */
  await p.evaluate(() => {
    try { if (typeof closeRelw === 'function') closeRelw(); } catch (_) {}
    S.gold = 1e15; openTrain(); setTrSub('train'); renderTrain();
  });
  await p.waitForTimeout(450);
  console.log('[E] (대조) 23 훈련 카드 홀드 (64 trHold)');
  await reset();
  const cE = await box('#trCards [data-tr="atk"]');
  if (cE) await holdTouch(cE, HOLD);
  const E = await stats(['trainBuy'], '.tr-card[data-tr="atk"]');
  const perE = row('훈련 카드', E);

  console.log('\n[판정] — 지시 ④ «시도마다 보이는 사건 ≥ 1»');
  ok(A.tries >= 5, 'ⓐ 룬 홀드가 실제로 여러 번 시도한다(재현 전제)', A.tries + '회');
  ok(perA >= 1, 'ⓑ ★ 룬 — 시도당 보이는 사건 ≥ 1', perA.toFixed(2) + '/시도 (fx ' + A.fx + ' · cls ' + A.cls + ')');
  ok(!B || perB >= 1, 'ⓒ 단련 — 시도당 보이는 사건 ≥ 1', B ? perB.toFixed(2) : '건너뜀');
  ok(!C || perC >= 1, 'ⓓ 장비/스킬 세부 — 시도당 보이는 사건 ≥ 1', C ? perC.toFixed(2) : '건너뜀');
  ok(!D || perD >= 1, 'ⓔ 유물 — 시도당 보이는 사건 ≥ 1', D ? perD.toFixed(2) : '건너뜀');
  ok(perE >= 1, 'ⓕ (대조) 훈련 카드 — 시도당 보이는 사건 ≥ 1', perE.toFixed(2));
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nPROBE488 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(0);   /* 재현 도구 — 수리 «전» 에는 빨간 것이 정상이라 종료 코드로 막지 않는다 */
})();
