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

/* 트리거 직후의 애니메이션·트랜지션을 붙잡아 둔다 */
const GRAB = () => {
  window.__jzA = document.getAnimations();
  window.__jzA.forEach(a => { try { a.pause(); } catch (_) {} });
  return window.__jzA.length;
};
const SEEK = (t) => { (window.__jzA || []).forEach(a => { try { a.currentTime = t; } catch (_) {} }); };

async function scene(page, name, times, trigger) {
  await trigger();
  const n = await page.evaluate(GRAB);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(SEEK, times[i]);
    await page.screenshot({ path: path.join(OUT, `60-r${R}-${name}-${i + 1}.png`) });
  }
  console.log(`  ${name}: 애니 ${n}개 · t = ${times.join(' / ')} ms`);
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

  /* ── 1. 버튼 누름 → 뗌 (누름 .94/60ms · 스프링 1.04→1/180ms) ── */
  {
    const p = await box('.tab[data-t="hero"]');
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    const n = await page.evaluate(GRAB);
    for (let i = 0; i < 4; i++) {
      await page.evaluate(SEEK, [0, 20, 40, 60][i]);
      await page.screenshot({ path: path.join(OUT, `60-r${R}-press-${i + 1}.png`) });
    }
    /* 프레임 구석에서 떼서 click 이 탭 핸들러를 타지 않게 한다 (LESSONS 42-③) */
    await page.mouse.move(6, 6);
    await page.mouse.up();
    await page.mouse.move(p.x, p.y);
    await page.mouse.down(); await page.mouse.up();     /* 뗌 스프링을 다시 만든다 */
    const n2 = await page.evaluate(GRAB);
    for (let i = 0; i < 4; i++) {
      await page.evaluate(SEEK, [0, 60, 120, 180][i]);
      await page.screenshot({ path: path.join(OUT, `60-r${R}-press-${i + 5}.png`) });
    }
    console.log(`  press: 애니 ${n}/${n2}개 · 1~4 = 누름 0/20/40/60ms · 5~8 = 뗌 0/60/120/180ms`);
    await page.evaluate(() => { document.querySelectorAll('.jz-dn').forEach(e => e.classList.remove('jz-dn')); });
    await page.waitForTimeout(400);
  }

  /* ── 2. 가운데 다이얼로그 열기 (딤 150ms + 박스 .92→1.02→1 / 220ms) ── */
  await scene(page, 'dlg', [0, 30, 60, 90, 130, 170, 210, 250],
    () => page.evaluate(() => openProfile()));
  await page.evaluate(() => closeProfile());
  await page.waitForTimeout(400);

  /* ── 3. 바닥 시트 슬라이드업 + 오버슈트 8px (240ms) ── */
  await scene(page, 'sheet', [0, 30, 60, 100, 140, 170, 210, 250],
    () => page.evaluate(() => openTrain()));
  await page.evaluate(() => closeTrain());
  await page.waitForTimeout(400);

  /* ── 4. 하단 탭 전환 — 아이콘 1.12 팝 + 패널 슬라이드인 ── */
  await scene(page, 'tab', [0, 25, 50, 80, 110, 145, 180, 220],
    async () => { await page.evaluate(CLICK, '.tab[data-t="hero"]'); });
  await page.evaluate(CLICK, '.tab[data-t="hero"]');
  await page.waitForTimeout(400);

  /* ── 5. 카드 그리드 stagger 25ms (03 던전 전체화면 페이지) ── */
  await scene(page, 'stagger', [0, 40, 80, 120, 170, 220, 280, 340],
    () => page.evaluate(() => openDungeon()));
  await page.evaluate(() => closeDungeon());
  await page.waitForTimeout(400);

  /* ── 6. 재화 부족 — 박스 흔들림 + 알약 빨간 틴트 ── */
  await page.evaluate(() => { S.dia = 0; });
  await scene(page, 'bad', [0, 40, 80, 130, 180, 240, 320, 420],
    () => page.evaluate(() => popup('💎 다이아 부족', '<p>다이아가 부족합니다.</p>')));
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(300);

  console.log(errs.length ? '\n[!] 콘솔/페이지 에러 ' + errs.length + '건:\n  ' + errs.slice(0, 5).join('\n  ')
                          : '\nCAP60 OK — 에러 0건');
  await browser.close();
})();
