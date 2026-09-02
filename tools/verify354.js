#!/usr/bin/env node
/* 작업 354 — «꾹 누르기» 홀드 버튼 2자리의 드리프트 내성 게이트
 *   ⓐ `#modal #mLv`   — 262 `bindUpHold`(08 스킬 · 08 아이템 · 50 코스튬 세부 팝업 [강화])
 *   ⓑ `#relw #rwBasin` — 89 `rwHold`(유물 소환 수반)
 *
 *   node tools/verify354.js
 *
 * 349 가 `#trw` 홀드 3형제에서 밝힌 결함(손가락이 버튼 «안» 에서 ±30px 만 굴러도 크로미움이
 * 그 터치를 스크롤 제스처로 채가 `pointercancel` → 홀드가 규약대로 «손 뗌» 으로 읽고 1회에서
 * 멎는다)이 이 두 자리에도 그대로 있었다. `tools/probe354.js` 로 **먼저 재현**했고(338 규칙),
 * 등재문 가설이 확인됐다:
 *
 *   drift |  #mLv 시도/취소  |  #rwBasin 시도/취소
 *   ± 0px |     11 / 0        |      4 / 0
 *   ±14px |     13 / 0        |      8 / 0
 *   ±30px |      1 / 1        |      1 / 1     ← 둘 다 여기서 죽는다
 *
 * 이 게이트는 349 [B] 를 이 두 호스트로 **이관**한 것이다 — 실기기 쪽 조건으로만 잰다:
 * CDP 터치 · 게임 루프 ON · 손가락 드리프트. (마우스 축은 `verify262`·`verify210` 이 계속 본다.)
 *
 * 절: [A] 터치 홀드가 연속으로 돈다  [B] 드리프트 내성 + 처방 + 스크롤 무해 증명
 *     [C] 정지 조건(뗌·이탈·팝업 닫힘)  [D] 재화 정확 차감  [R] 되돌림 시험  [G] 회귀
 *
 * ⚠ #rwBasin 의 «시도 횟수» 는 #mLv 보다 낮게 나온다(1.5초에 3~8회) — `summonRelicBatch`(793 이관 · 옛 `summonRelic`) 가
 *   매회 `renderRelw()`(캔버스 10칸 재도색) + `fxUpOk` 를 돌기 때문이다. 그래서 이 게이트는
 *   **절대 횟수를 조이지 않고** «연속이 도는가(≥3) · pointercancel 0» 만 묻는다(355 교훈 —
 *   타이밍에 민감한 임계를 세우면 플레이키 게이트가 된다).
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
/* 540 — «치우기» 닫개 한 벌. 여기 손으로 적혀 있던 목록에는 제품에 없는 이름
   `closeDefeat` 가 섞여 있었고(index.html 0건), `typeof` 가드가 그것을 조용히 삼켜
   18 패배 화면을 치우는 팔이 한 번도 돈 적이 없다. */
const { install, missingClosers, defeatStuck, blockedLabel } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.V354_FILE || 'index.html';
const SRC = path.resolve(__dirname, '..', FILE);
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };

const LV = '#modal #mLv';
const BASIN = '#relw #rwBasin';

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

  /* 계측 — 349 와 같은 규약: **제품 함수 호출을 직접 센다**(차감 ÷ 비용 은 비용이 변하면 못 쓴다) */
  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__n = 0; window.__ok = 0; window.__cx = 0;
    /* `__n` = **시도**(호출) · `__ok` = **성공**. 소진 시 홀드는 «한 번 더 시도해서 실패하면 정지» 라
       [D] 의 «정확히 n회» 는 반드시 성공 쪽으로 세야 한다(시도는 항상 n+1 이다). */
    /* ⚑⚑ 793 이관 — 유물 쪽에서 감는 자리가 `summonRelic` → **`summonRelicBatch`** 다.
       700(배수 토글)이 `rwHold` 의 두 호출부를 `summonRelicBatch(relMul, …)` 로 갈면서
       `summonRelic` 은 아무도 안 부르는 껍데기가 됐고, 그 결과 이 자의 #rwBasin 항 7개가
       «0회» 로 빨갰다(수리 전 실측 24/31 — [A]·[B]×4·[C]·[D]).
       ⚠ 시도/성공 셈법은 한 글자도 안 바꿨다 — 배치도 «모자라면 한 장도 안 뽑고 null» 이라
         `__n`(시도) · `__ok`(성공)의 뜻이 그대로다. 배수가 ×1 인 이 자의 표본에서는
         «실행 수 = 뽑은 장수» 이므로 [D] 의 «정확히 4회» 도 뜻이 안 바뀐다. */
    const lu = window.levelUp, sr = window.summonRelicBatch;
    window.levelUp = function () { window.__n++; const r = lu.apply(this, arguments); if (r) window.__ok++; return r; };
    window.summonRelicBatch = function () { window.__n++; const r = sr.apply(this, arguments); if (r) window.__ok++; return r; };
    addEventListener('pointercancel', () => window.__cx++, true);
    /* 죽어서 18 패배 화면이 버튼을 덮는 것만 막는다(74 규약) — 루프 자체는 **돌린다** */
    setInterval(() => { try { if (typeof maxHp === 'function' && S.hp != null) S.hp = maxHp(); } catch (_) {} }, 200);
  });

  const clearAll = () => p.evaluate(() => {
    window.__clear540();                 /* 540 — 닫개 + 이름 없는 껍데기(#defw) */
  });
  /* ⓐ 08 스킬 세부 팝업 — 조각 수량을 인자로 받는다([D] 가 «정확히 n회» 를 잰다) */
  const openSkill = async (frags) => {
    await clearAll();
    await p.evaluate(f => { S.own['slash'] = { n: f == null ? 1e7 : f, l: 1 }; showSkillDetail('slash'); }, frags);
    await p.waitForTimeout(450);
    await p.evaluate(() => { window.__n = 0; window.__ok = 0; window.__cx = 0; });
  };
  /* ⓑ 89 유물 소환 수반 */
  const openBasin = async (relic) => {
    await clearAll();
    await p.evaluate(r => { S.relic = r == null ? 1e9 : r; openRelw(); }, relic);
    await p.waitForTimeout(450);
    await p.evaluate(() => { window.__n = 0; window.__ok = 0; window.__cx = 0; });
  };

  let aimBad = 0;
  const aim = async sel => {
    await p.locator(sel).scrollIntoViewIfNeeded();
    const bb = await p.locator(sel).boundingBox();
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, w: bb.width, h: bb.height };
    /* 양성항(LESSONS 263-①) — 누른 좌표의 최상단 노드가 정말 그 버튼인가.
       아니면 «0회» 라는 조용한 오답이 되고 원인을 못 찾는다. */
    const hit = await p.evaluate(o => {
      const el = document.elementFromPoint(o.x, o.y);
      return !!(el && el.closest && el.closest(o.sel));
    }, { sel, x: c.x, y: c.y });
    if (!hit) aimBad++;
    return c;
  };
  /* 실기기 터치 — touchStart 의 ack 를 기다리지 않는다(142) */
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
  const n = () => p.evaluate(() => window.__n);
  const nok = () => p.evaluate(() => window.__ok);
  const cx = () => p.evaluate(() => window.__cx);

  console.log('[A] 터치 «꾹 누르기» — 두 호스트 모두 연속으로 돈다 (게임 루프 ON)');
  {
    await openSkill();
    await touchHold(await aim(LV), 1500);
    const v = await n(); ok(v >= 5, '#modal #mLv — 1.5초 홀드로 5회 이상 강화된다', v + '회');
    const lv = await p.evaluate(() => oLv('slash'));
    ok(lv >= 5, '   그 횟수가 실제 레벨로 반영된다(Lv 1 → n)', 'Lv ' + lv);
  }
  {
    await openBasin();
    await touchHold(await aim(BASIN), 1500);
    const v = await n(); ok(v >= 3, '#relw #rwBasin — 1.5초 홀드로 3회 이상 소환된다', v + '회');
    const s = await p.evaluate(() => S.cnt.sumRelic);
    ok(s >= 3, '   그 횟수가 실제 소환 카운터에 반영된다', s + '회');
  }
  {
    /* 단발 탭은 정확히 1회다 — 64 교훈 2(«누를 때 1 + 뗄 때 1» 이 아니다) */
    await openSkill();
    await touchHold(await aim(LV), 90);
    const v = await n(); ok(v === 1, '단발 탭(터치) — 정확히 1회 (64 교훈 2)', v + '회');
  }

  console.log('[B] 드리프트 내성 — 손가락이 버튼 «안» 에서 구른다 (이 작업의 본체)');
  /* 결함의 서명은 **`pointercancel`** 이지 «횟수» 가 아니다(수리 전: 1회 **· 취소 1**).
     머신이 1.5초 안에 통째로 정체하면 취소 없이도 횟수가 내려가므로, «취소 0 인데 횟수만 낮은»
     표본에 한해 **한 번만** 다시 잰다(355 교훈 — 타이밍에 민감한 임계는 게이트를 부패시킨다).
     결함이 살아 있으면 재시도해도 매번 취소가 뜨므로 이 완충이 결함을 가리지 않는다 —
     그 사실은 [R] 이 매 실행 «되돌리면 1회 · 취소 ≥1» 로 못 박는다. */
  const drift = async (label, open, sel, r) => {
    let v = 0, c2 = 0;
    for (let try_ = 0; try_ < 2; try_++) {
      await open();
      await touchHold(await aim(sel), 1500, r);
      v = await n(); c2 = await cx();
      if (c2 !== 0 || v >= 3) break;                  /* 결함 서명이 떴거나 초록이면 그대로 판정 */
    }
    ok(v >= 3 && c2 === 0, label + ' ±' + String(r).padStart(2) + 'px — 연속 유지 · pointercancel 0', v + '회 · 취소 ' + c2);
  };
  for (const r of [6, 14, 30, 45]) await drift('#mLv    ', openSkill, LV, r);
  for (const r of [6, 14, 30, 45]) await drift('#rwBasin', openBasin, BASIN, r);
  ok(await p.evaluate(sels => sels.every(s => {
    const e = document.querySelector(s); return !!e && getComputedStyle(e).touchAction === 'none';
  }), [LV, BASIN]), '★ 처방 — 두 홀드 호스트가 `touch-action:none` 이라 브라우저가 제스처를 못 채간다');
  /* 349 [B] 마지막 항의 이관 — 이 규칙이 «스크롤을 죽이지 않는다» 는 근거를 게이트가 직접 잰다.
     ⚠ `scrollHeight > clientHeight` 만으로는 못 잰다 — `overflow:hidden` 이면 내용이 넘쳐도
     스크롤은 «못 한다». 넘침이 아니라 **스크롤 가능성**(overflow 가 auto/scroll 인가)을 묻는다.
     언젠가 이 두 팝업에 스크롤 영역이 생기면 이 항이 빨개져 처방을 다시 보게 만든다. */
  {
    const scr = await p.evaluate(sels => {
      const out = [];
      sels.forEach(sel => {
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
    }, [LV, BASIN]);
    ok(scr.length === 0, '두 호스트의 조상 사슬에 스크롤 영역이 없다 — 처방이 뺏는 것은 «갈 곳 없는 팬» 뿐', scr.join(' , '));
  }

  console.log('[C] 정지 조건 — 놓으면·나가면·닫으면 즉시 멎는다(처방이 이걸 무르게 하지 않았다)');
  {
    await openSkill();
    await touchHold(await aim(LV), 900, 30);
    const before = await n();
    await p.waitForTimeout(600);
    const after = await n();
    ok(after === before, '#mLv — 손 뗀 뒤 600ms 동안 0회 (드리프트로 끝낸 홀드도 확실히 멎는다)', before + ' → ' + after);
  }
  {
    /* 버튼 «밖» 이탈은 여전히 정지 사유다 — 349 처방이 이 축을 무르게 하지 않았음을 못 박는다 */
    await openSkill();
    const c = await aim(LV);
    await touchHold(c, 1200, 0, { x: c.w / 2 + 260, y: 0 });
    const v = await n();
    ok(v <= 2, '#mLv — 버튼 밖으로 이탈하면 멎는다(이탈은 여전히 정지 사유)', v + '회');
  }
  {
    /* 팝업이 닫히면 같이 멎는다 — upHoldTick / rwHoldTick 의 첫 줄 */
    await openSkill();
    const c = await aim(LV);
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await p.waitForTimeout(600);
    /* ⚠ 349 교훈 — «닫기 직전 값» 과 «닫기» 는 **같은 순간**에 잡아야 한다. 둘로 나누면 그 사이에
       홀드 틱(100~160ms)이 한 번 더 돌아 제품이 아니라 하네스가 «+1» 을 만든다(3회 중 2회 빨감). */
    const mid = await p.evaluate(() => { const v = window.__n; closeModal(); return v; });
    await p.waitForTimeout(600);
    const end = await n();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    ok(mid >= 2 && end === mid, '#mLv — 팝업이 닫히면 즉시 멎는다', mid + ' → ' + end);
  }
  {
    await openBasin();
    const c = await aim(BASIN);
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    await p.waitForTimeout(700);
    const mid = await p.evaluate(() => { const v = window.__n; closeRelw(); return v; });   /* 같은 순간에 (위와 같은 이유) */
    await p.waitForTimeout(700);
    const end = await n();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    ok(mid >= 1 && end === mid, '#rwBasin — 팝업이 닫히면 즉시 멎는다', mid + ' → ' + end);
  }

  console.log('[D] 재화 정확 차감 — 소진되면 «정확히 그만큼» 에서 조용히 멎는다');
  {
    /* Lv1 → 4 = fragNeed(1)+fragNeed(2)+fragNeed(3) = 2+6+7 = 15 조각 */
    const need = await p.evaluate(() => fragNeed(1) + fragNeed(2) + fragNeed(3));
    await openSkill(need);
    await touchHold(await aim(LV), 2000, 30);
    const v = await nok(), tries = await n(), left = await p.evaluate(() => frag('slash')), lv = await p.evaluate(() => oLv('slash'));
    ok(v === 3 && left === 0 && lv === 4, '#mLv — 조각 ' + need + '개(3회분) + 2초 홀드 → 정확히 3회 · 잔량 0 · Lv 4',
      v + '회 성공(시도 ' + tries + ') · 잔량 ' + left + ' · Lv ' + lv);
  }
  {
    await openBasin(400);                     /* RELIC_COST 100 × 4회분 */
    await touchHold(await aim(BASIN), 2500, 30);
    const v = await nok(), tries = await n(), left = await p.evaluate(() => S.relic);
    ok(v === 4 && left === 0, '#rwBasin — 유물조각 400(4회분) + 2.5초 홀드 → 정확히 4회 · 잔량 0',
      v + '회 성공(시도 ' + tries + ') · 잔량 ' + left);
  }

  console.log('[R] 되돌림 시험 — 처방을 도로 빼면 정말 빨개지는가 (LESSONS 43-①)');
  {
    await p.addStyleTag({ content: '#modal #mLv,#relw #rwBasin{touch-action:auto !important}' });
    await openSkill();
    await touchHold(await aim(LV), 1500, 30);
    const v = await n(), c2 = await cx();
    ok(v <= 2 && c2 >= 1, 'R1  — #mLv: touch-action 을 auto 로 되돌리면 ±30px 에서 멎고 취소가 뜬다', v + '회 · 취소 ' + c2);
    await openBasin();
    await touchHold(await aim(BASIN), 1500, 30);
    const v2 = await n(), c3 = await cx();
    ok(v2 <= 2 && c3 >= 1, 'R2  — #rwBasin: 같은 되돌림에서 같은 값이 나온다', v2 + '회 · 취소 ' + c3);
    await p.evaluate(() => {           /* 주입한 스타일을 걷는다 */
      [...document.querySelectorAll('style')].forEach(s => { if (/touch-action:auto !important/.test(s.textContent)) s.remove(); });
    });
    await openSkill();
    await touchHold(await aim(LV), 1500, 30);
    const v3 = await n();
    ok(v3 >= 3, 'R1b — 걷으면 도로 초록이다(주입이 원인이었다는 대조군)', v3 + '회');
  }
  /* 처방이 «클래스» 가 아니라 JS 훅에 걸려 있는가 — 349 규약(마크업이 바뀌면 조용히 새어 나간다) */
  {
    const src = fs.readFileSync(SRC, 'utf8');
    ok(/#modal\s+#mLv\s*,\s*#relw\s+#rwBasin\s*\{[^}]*touch-action:\s*none/.test(src),
      'R3  — 처방이 JS 가 무는 훅(`$(\'mLv\')`·`$(\'rwBasin\')`)에 그대로 걸려 있다');
    ok(/bindUpHold\(\s*(l|b)\s*,/.test(src) && /\$\('rwBasin'\)\.addEventListener\('pointerdown'/.test(src),
      'R4  — 그 훅을 무는 쪽(bindUpHold · rwBasin pointerdown)이 그대로다');
  }

  console.log('[G] 회귀');
  ok(aimBad === 0, '누른 좌표의 최상단 노드가 매번 그 버튼이었다(양성항 — 팝업이 덮지 않았다)', aimBad + '건 실패');
  ok(await p.evaluate(() => ['#trCards [data-tr="atk"]', '#trRunes [data-runebuy]']
      .every(s => { const e = document.querySelector(s); return !e || getComputedStyle(e).touchAction === 'none'; })),
    '349 의 #trw 규칙이 그대로 살아 있다(이 작업이 그 자리를 안 건드렸다)');

  /* ⚑ 540 — 유령 재유입 차단(524 가 349 에서 겪은 «가끔 22~24/24» 의 씨앗) */
  const cl540 = await missingClosers(p);
  ok(cl540.length === 0,
    '★ 540 — 닫개 이름이 전부 제품에 실재한다(typeof 가드가 유령을 삼키지 않는다)',
    cl540.length ? '없는 이름 ' + cl540.join(' , ') : '전부 실재');
  ok(!(await defeatStuck(p)),
    '★ 540 — 측정이 끝난 시점에 18 패배 화면이 켜져 있지 않다(켜지면 뒤 표본이 전부 «0회» 다)',
    await blockedLabel(p));
  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));

  console.log('\nVERIFY354 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
