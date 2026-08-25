#!/usr/bin/env node
/* 60 — UI 쥬시니스 연속 프레임 캡처 (ROUTINE [3]-(다))
 *
 *   node docs/review/60-cap60.js [회차]      기본 1
 *
 * 60 의 애니메이션은 60~250ms 라 «스크린샷 8번» 으로는 간격이 못 따라간다(헤드리스 1장 ≈ 40~90ms).
 * 그래서 트리거 직후 **Web Animations 를 전부 pause 하고 `currentTime` 을 직접 세워** 프레임을 뜬다 —
 * 간격이 정확하고 재현성이 100% 다(28 교훈 3 «측정 절차가 결과를 오염시킨다» 회피).
 *
 * 산출: docs/review/60-r<회차>-<장면>-<n>.png (장면당 8장) + 프레임별 t(ms) 를 콘솔에 찍는다.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const R = process.argv[2] || '1';
const OUT = __dirname;
const URL = 'file://' + path.resolve(__dirname, '..', '..', 'index.html').replace(/\\/g, '/');
const launchOpts = () => {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
};

/* 트리거 «직전» 시각을 찍어 둔다 — 그 뒤에 시작한 것만 이번 장면의 연출이다 */
const MARK = () => { window.__jzT0 = document.timeline.currentTime || 0; };
/* 이번 장면의 연출만 붙잡고, 나머지는 «쉬는 상태» 로 확정한다.
   ⚠ 7회차 비평이 잡아낸 것: 레드닷·NEW 리본의 무한 펄스(`jzDotPulse`)까지 같이 seek 되면
   «영웅 1칸을 누르는 동안 옆 4칸에 216×85px NEW 배너가 자라는» 프레임이 납품된다.
   대상 외 애니메이션은 finish/cancel 해서 프레임마다 안 움직이게 못 박는다. */
const GRAB = () => {
  const t0 = window.__jzT0 || 0, keep = [];
  document.getAnimations().forEach(a => {
    const mine = a.effect && a.effect.getTiming().iterations !== Infinity
      && /^jz/.test(a.animationName || '')
      && (a.startTime == null || a.startTime >= t0 - 30);
    if (mine) { keep.push(a); try { a.pause(); } catch (_) {} }
    else { try { a.cancel(); } catch (_) {} }          /* finish 는 스택에 남는다 — cancel 이라야 «쉬는 상태» 가 된다 */
  });
  window.__jzA = keep;
  return keep.length;
};
const SEEK = (t) => { (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} }); };
/* ⚠ 9회차 비평(R-3·S-3)이 «tab t=155 프레임에서 패널이 73px 역주행» 이라고 지적한 것의 정체(10회차에 규명).
   `jzOn()` 은 애니메이션 `finished` 훅이 걸리면 안전망 타이머를 `max(ms, 2500)` 으로 건다.
   그런데 GRAB 이 애니메이션을 **pause** 하면 `finished` 는 영원히 안 온다 — 반면 안전망 타이머는
   **벽시계로 계속 흐른다.** 스크린샷 8장이 2.5초를 넘기는 순간 안전망이 클래스를 떼어 버려서
   뒷프레임이 «연출 없는 정지 상태» 로 찍힌다(패널은 슬라이드 도중 → 제자리로 튄다).
   → GRAB 직후 **걸려 있는 안전망 타이머를 전부 해제한다.** 타이머 id 는 `el['__jz_'+cls]` 에 있다. */
const FREEZE = () => {
  let n = 0;
  document.querySelectorAll('*').forEach(el => {
    for (const k of Object.keys(el)) {
      /* 타이머 id 는 두 군데다 — `jzOn()` 은 `__jz_<클래스>`, `jzOpen()/jzClose()` 는 `__jzT`.
         `__jzGen`·`__jzBusy` 도 숫자라 «__jz 로 시작» 만으로 지우면 세대 가드가 깨진다. 정확히 이 둘만. */
      if ((k === '__jzT' || k.indexOf('__jz_') === 0) && el[k]) { clearTimeout(el[k]); el[k] = 0; n++; }
    }
  });
  return n;
};
/* ⚠ 1회차 사고 — pause 한 애니메이션은 **영원히 멈춰 있다.** 장면을 넘어가도 살아 있어서
   다음 장면의 GRAB 에 같이 잡히고, SEEK 하면 **앞 장면의 연출이 같이 재생된다**(탭 장면에서
   누름 스프링이 되살아나 «탭 아이콘 팝이 1.12 가 아니라 1.04» 로 읽혔다). 장면 사이에 반드시 청소한다. */
const CLEAR = () => {
  /* `window.__jzA`(마지막 GRAB 목록)만 풀면 그 앞 장면에서 pause 한 애니메이션이 남아
     다음 장면의 GRAB 에 다시 잡힌다 — 문서 전체를 훑어 전부 풀어 준다. */
  /* ⚠ `finish()` 가 아니라 `cancel()` 이어야 한다. `finish()` 한 애니메이션은 `fill:both` 로
     **끝값을 붙든 채 이펙트 스택에 남고**, 클래스를 지워도 `getAnimations()` 에 계속 잡힌다.
     그러면 다음 장면의 GRAB 이 그걸 다시 집어 가서 **앞 장면 값이 새 연출을 덮는다**
     (누름 잔재 `jzDn@60` 이 뗌 스프링을 가려 «뗌 t0 이 .94 가 아니다» 로 읽혔다).
     클래스를 먼저 지우고 → 전부 cancel 해야 스택이 실제로 빈다. */
  window.__jzA = [];
  document.querySelectorAll('.jz-dn,.jz-up,.jz-sh,.jz-ti,.jz-st,.jz-bad,.jz-o,.jz-c')
    .forEach(e => e.classList.remove('jz-dn', 'jz-up', 'jz-sh', 'jz-ti', 'jz-st', 'jz-bad', 'jz-o', 'jz-c'));
  document.getAnimations().forEach(a => { try { a.cancel(); } catch (_) {} });
};
/* 모든 오버레이·패널을 닫아 «메인 화면» 으로 되돌린다 — 캡처 상태가 다르면 그 회차 비평은 통째로 무효다(LESSONS 04-①).
   1회차엔 누름 장면의 클릭이 영웅 패널을 열어 둔 채로 다음 장면들이 찍혀, 던전 그리드가 장비 시트 아래로 열렸다. */
const RESET = () => {
  ['closeModal', 'closeProfile', 'closeTrain', 'closeDungeon', 'closeShopPage', 'closeRelicPage',
   'closeRelicTab', 'closeSpec', 'closeCurInfo', 'closeWeapon', 'closeProbInfo', 'closeColl21',
   'closeDunDetail', 'closeOfflineReward', 'closeSummonResult', 'closeUpAll']
    .forEach(f => { try { if (typeof window[f] === 'function') window[f](); } catch (_) {} });
  try { if (typeof panelOpen !== 'undefined' && panelOpen) { panelOpen = false; syncPanel(); } } catch (_) {}
};

async function clean(page) { await page.evaluate(CLEAR); await page.evaluate(RESET); await page.waitForTimeout(420); }

async function scene(page, name, times, trigger) {
  await clean(page);
  await page.evaluate(MARK);
  await trigger();
  const n = await page.evaluate(GRAB);
  let f = await page.evaluate(FREEZE);
  for (let i = 0; i < times.length; i++) {
    f += await page.evaluate(FREEZE);       /* 프레임 사이에 새로 걸리는 안전망도 있다 — 매 프레임 다시 해제 */
    await page.evaluate(SEEK, times[i]);
    await page.screenshot({ path: path.join(OUT, `60-r${R}-${name}-${i + 1}.png`) });
  }
  console.log(`  ${name}: 애니 ${n}개 · 안전망 타이머 ${f}개 해제 · t = ${times.join(' / ')} ms`);
}

/* 위임 핸들러를 타야 하는 클릭은 query 와 click 을 같은 태스크 안에 (LESSONS 50-①) */
const CLICK = (s) => { const e = document.querySelector(s); if (e) e.click(); };

(async () => {
  const browser = await chromium.launch(launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  /* 재화를 넉넉히 — «부족» 팝업이 아니라 «성공» 경로를 봐야 하는 장면이 있다 */
  await page.evaluate(() => { S.gold = 9e12; S.dia = 9e6; });
  await page.waitForTimeout(300);

  const box = async (sel) => {
    const b = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
    return b;
  };

  /* ── 1. 버튼 누름 → 뗌 (누름 .94/60ms · 스프링 1.04→1/180ms) ──
     ⚠ 실제 마우스(`mouse.down` → `move` → `up`)로 만들면 두 가지가 섞인다:
        · 제자리에서 떼면 **클릭**이 되어 패널이 열리고 이후 장면이 오염된다(LESSONS 42-③)
        · 눌린 채 옮기면 브라우저가 드래그로 보고 `pointercancel` 을 먼저 쏴서
          «뗌» 타임라인이 `up` 보다 앞서 시작한다 → t=0 프레임이 .94 가 아니라 1.0 으로 찍힌다
          (5·6회차 비평이 «뗌 t0 이 1.000» 이라고 읽은 것의 정체).
     → 포인터 이벤트를 **페이지 안에서 직접 쏜다.** click 이 합성되지 않아 화면 상태도 안 변한다. */
  {
    await clean(page);
    const SEL = '.tab[data-t="hero"]';
    await page.evaluate(MARK);
    await page.evaluate(sel => {
      const el = document.querySelector(sel), r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    }, SEL);
    const n = await page.evaluate(GRAB);
    let f1 = await page.evaluate(FREEZE);
    const PT = [0, 8, 20, 40, 60];                      /* t=8 은 «작게 시작» 증거용(비평 지적 4) */
    for (let i = 0; i < PT.length; i++) {
      f1 += await page.evaluate(FREEZE);
      await page.evaluate(SEEK, PT[i]);
      await page.screenshot({ path: path.join(OUT, `60-r${R}-press-${i + 1}.png`) });
    }
    await page.evaluate(CLEAR);
    await page.evaluate(MARK);
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    const n2 = await page.evaluate(GRAB);
    let f2 = await page.evaluate(FREEZE);
    const RT = [0, 45, 99, 145, 180];                   /* 99ms = 스프링 피크(55%), 45·145 는 키프레임 사이 */
    for (let i = 0; i < RT.length; i++) {
      f2 += await page.evaluate(FREEZE);
      await page.evaluate(SEEK, RT[i]);
      await page.screenshot({ path: path.join(OUT, `60-r${R}-press-${i + 6}.png`) });
    }
    console.log(`  press: 애니 ${n}/${n2}개 · 안전망 ${f1}/${f2}개 해제 · 1~5 = 누름 ${PT.join('/')}ms · 6~10 = 뗌 ${RT.join('/')}ms`);
  }

  /* ── 2. 가운데 다이얼로그 열기 (딤 150ms + 박스 .92→1.02→1 / 220ms) ── */
  await scene(page, 'dlg', [0, 10, 35, 70, 100, 136, 175, 220],
    () => page.evaluate(() => openProfile()));
  await page.evaluate(() => closeProfile());
  await page.waitForTimeout(400);

  /* ── 3. 바닥 시트 슬라이드업 + 오버슈트 8px (240ms) ── */
  /* 12회차 — 오버슈트 홀드 구간(168~206ms)의 표본이 끝점 1장뿐이라 «38ms 홀드» 가 캡처로 증명이 안 됐다
     (11회차 비평 D-11, 캡처 설계 결함). 홀드 안쪽 t=175 를 넣고 t=225 를 뺀다. */
  await scene(page, 'sheet', [0, 25, 60, 105, 150, 175, 206, 240],
    () => page.evaluate(() => openTrain()));
  await page.evaluate(() => closeTrain());
  await page.waitForTimeout(400);

  /* ── 4. 하단 탭 전환 — 아이콘 1.12 팝 + 패널 슬라이드인 ── */
  await scene(page, 'tab', [0, 15, 45, 90, 120, 155, 190, 230],
    async () => { await page.evaluate(CLICK, '.tab[data-t="hero"]'); });
  await page.evaluate(CLICK, '.tab[data-t="hero"]');
  await page.waitForTimeout(400);

  /* ── 5. 카드 그리드 stagger 25ms (03 던전 전체화면 페이지) ──
     11회차 — 카드 시작이 `JZ_STAG_BASE`(120ms) 뒤로 밀렸다(페이지 페이드와의 곱셈 구간을 피하려고).
     옛 표본(0/12/55/95…)은 앞 4장이 전부 «페이드 중 빈 그리드» 라 stagger 가 2~3장에만 걸렸다.
     페이드 구간 1장 + 카드 등장 구간 6장으로 다시 잡는다. */
  await scene(page, 'stagger', [0, 60, 120, 150, 180, 230, 300, 400],
    () => page.evaluate(() => openDungeon()));
  await page.evaluate(() => closeDungeon());
  await page.waitForTimeout(400);

  /* ── 6. 재화 부족 — 박스 흔들림 + 알약 빨간 틴트 ── */
  await page.evaluate(() => { S.dia = 0; });
  await scene(page, 'bad', [0, 42, 85, 128, 170, 212, 255, 340],
    () => page.evaluate(() => popup('💎 다이아 부족', '<p>다이아가 부족합니다.</p>')));
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(300);

  /* ── 7·8. 닫기 — 지시 «뚝 사라지는 팝업은 0점». 1·2차 캡처엔 닫기 프레임이 0장이었다 ── */
  await scene(page, 'dlgclose', [0, 15, 35, 60, 85, 105, 120, 140],
    async () => { await page.evaluate(() => openProfile()); await page.waitForTimeout(500);
                  await page.evaluate(CLEAR); await page.evaluate(() => closeProfile()); });
  await page.waitForTimeout(400);

  await scene(page, 'sheetclose', [0, 15, 40, 65, 90, 110, 130, 150],
    async () => { await page.evaluate(() => openTrain()); await page.waitForTimeout(500);
                  await page.evaluate(CLEAR); await page.evaluate(() => closeTrain()); });
  await page.waitForTimeout(400);

  console.log(errs.length ? '\n[!] 콘솔/페이지 에러 ' + errs.length + '건:\n  ' + errs.slice(0, 5).join('\n  ')
                          : '\nCAP60 OK — 에러 0건');
  await browser.close();
})();
