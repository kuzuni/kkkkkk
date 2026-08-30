#!/usr/bin/env node
/* 작업 488 캡처 — «꾹 누르는 동안» 연속 프레임 (지시서 [3]-(다) 연출 채점용)
 *
 *   node tools/cap488.js [회차] [씬목록]
 *   node tools/cap488.js 2      rune-ok,rune-no,train        (기본값)
 *
 * ★ **표본마다 페이지를 새로 열고 → 목표 시각까지 진행시키고 → 얼린 뒤 → 찍는다.**
 *   1회차는 `page.screenshot()` 을 홀드 «중» 에 연달아 불렀는데, 이 컨테이너에서 스크린샷 한 장이
 *   **570~700ms** 라 목표 100ms 격자가 통째로 깨졌다(비평가에게 «타이밍은 측정 불가» 라고 미리
 *   알려 줘야 했다). UI-REFERENCE 58 절이 이미 «스크린샷 1장 337~629ms — 0.3~0.8초 연출을 담을 수
 *   없다. 1회차가 이걸로 통째로 날아갔다» 라고 적어 둔 자리다. `cap58b.js` 의 «얼리고 찍기» 를 그대로 쓴다.
 *
 * ★ 얼리기는 **세 겹**이다:
 *   ① `requestAnimationFrame = () => 0`
 *   ② `document.getAnimations().forEach(a => a.pause())` — `fxHb`·`jzHb` 는 컴포지터가 돌리는
 *      CSS 애니메이션이라 rAF 를 죽여도 계속 흐른다(cap58b 31회차 교훈 1)
 *   ③ **홀드 타이머 사슬을 끊는다** — `rtHold`/`trHold`/`upHold`/`rwHold` 는 `setTimeout` 이라
 *      느린 스크린샷 동안 비트가 몇 번 더 돌아 «없던 플로터» 가 찍힌다. `rtHoldStop()` 을 부르면
 *      `end` 가 통짜 렌더 + 정산 토스트를 띄워 그림이 달라지므로 **타이머만** 끊는다.
 *
 * ⚠ 캡처 PNG 는 .gitignore 로 막혀 있다 — 커밋하지 않는다. 증거는 review .md 의 수치다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const R = process.argv[2] || '2';
const WANT = (process.argv[3] || 'rune-ok,rune-no,train').split(',').map(s => s.trim()).filter(Boolean);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '..', 'docs', 'shots');

/* 표본 시각(ms, touchStart = 0). 홀드 규격: 즉시 1회 → `TR_HOLD_DELAY` 350ms 뒤 반복 시작 →
   160ms 에서 ×0.86 가속(→ 대략 350·510·648·767·869·957·1033·1099). 주인이 «계속 떠야» 라고 한 것은
   바로 그 **반복 구간**이라, 첫 발(0)과 공백(200)을 각 한 장씩 잡고 나머지 6장을 반복 구간에 둔다. */
const TS = [60, 200, 380, 480, 580, 700, 820, 960];

const SCENES = {
  'rune-ok': { name: '룬 강화 — 전부 성공', rate: 1 },
  'rune-no': { name: '룬 강화 — 전부 실패', rate: 0 },
  'train':   { name: '(대조) 23 훈련 카드 — 같은 부품' }
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch(chromium);

  const shot = async (tag, t, endShot) => {
    const sc = SCENES[tag];
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
    await p.waitForTimeout(1100);
    const cdp = await ctx.newCDPSession(p);
    await p.evaluate(o => {
      if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
      if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
      /* 죽어서 패배 화면이 덮는 것만 막는다(74 규약) — 루프 자체는 돌린다 */
      if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
      ['closeDunClear', 'closeDefeat', 'closeModal', 'closeDungeon', 'closeSummonResult', 'closeRelw']
        .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
      S.gold = 1e18; S.rstone = 1e12; S.dia = 1e12;
      if (o.rate != null) {
        runeRate = () => o.rate;
        S.rune = { r1: 0, r2: 0, r3: 0 };
        openTrain(); setTrSub('rune'); setRuneSub('r1');
      } else {
        openTrain(); setTrSub('train');
      }
      renderTrain();
    }, { rate: sc.rate });
    await p.waitForTimeout(500);

    const sel = sc.rate != null
      ? '#trRunes .tr-rn[data-rune="r1"] .rbt.b1'
      : '#trCards [data-tr="atk"]';
    const bb = await p.locator(sel).first().boundingBox();
    const cb = await p.locator('#trw .tr-box').first().boundingBox();
    const clip = { x: Math.max(0, cb.x), y: Math.max(0, cb.y), width: cb.width, height: cb.height };
    const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };

    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    if (endShot) {
      /* «손 뗀 뒤» 한 장 — 정산 토스트가 한 장인지 눈으로도 보이게(전체 프레임) */
      await new Promise(r => setTimeout(r, 1200));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await st.catch(() => {});
      await new Promise(r => setTimeout(r, 260));
      await p.evaluate(freeze);
      await p.screenshot({ path: path.join(OUT, '488-r' + R + '-' + tag + '-end.png') });
      await ctx.close();
      return;
    }
    await new Promise(r => setTimeout(r, t));
    await p.evaluate(freeze);
    const f = path.join(OUT, '488-r' + R + '-' + tag + '-t' + String(t).padStart(4, '0') + '.png');
    await p.screenshot({ path: f, clip });
    console.log('  · ' + path.basename(f));
    await ctx.close();
  };

  /* 페이지 안에서 도는 «얼리기» — 위 주석의 세 겹 */
  function freeze() {
    try { window.requestAnimationFrame = () => 0; } catch (_) {}
    try { document.getAnimations().forEach(a => { try { a.pause(); } catch (_) {} }); } catch (_) {}
    for (const k of ['rtHold', 'trHold', 'upHold', 'rwHold']) {
      try { const h = window[k]; if (h && h.timer) clearTimeout(h.timer); } catch (_) {}
    }
    try { if (window.__alive) clearInterval(window.__alive); } catch (_) {}
  }

  for (const tag of WANT) {
    if (!SCENES[tag]) { console.log('[?] 모르는 씬 ' + tag); continue; }
    console.log('[' + tag + '] ' + SCENES[tag].name);
    for (const t of TS) await shot(tag, t, false);
    await shot(tag, 0, true);
  }

  console.log('\n캡처 완료 → ' + OUT + '  (표본 시각 ' + TS.join('·') + 'ms + end)');
  await browser.close();
})();
