/* 작업 148 — «미션 쪽 글씨가 깨져 보인다» 원인 특정용 캡처 (1080×2280).
   실행: node tools/cap148.js  → docs/review/148-r1-*.png
     148-r1-s1-배너미완.png   : 메인 + 우하단 가이드 미션 배너(미완 = `.todo` 3줄)
     148-r1-s1c-배너미완.png  : 위 배너만 크롭(620..1080 / 1839..1989 → 프레임 좌표)
     148-r1-s2-배너보상.png   : 메인 + 배너 보상받기 상태(`.ready` 2줄)
     148-r1-s2c-배너보상.png  : 크롭
     148-r1-s3-퀘스트.png     : 22 퀘스트(미션) 팝업
     148-r1-s4-프로필.png     : 19 프로필 «해금 미션» 바
   지시서 [5] — 이미지는 메인 세션이 직접 Read 하지 않는다. 서브에이전트 채점용. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const out = f => path.resolve(__dirname, '../docs/review/' + f);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);

  const banner = async (name) => {
    const r = await p.evaluate(() => {
      const el = document.getElementById('tuto');
      const { x, y, width, height } = el.getBoundingClientRect();
      return { x: Math.max(0, Math.round(x) - 8), y: Math.round(y) - 8, width: Math.round(width) + 16, height: Math.round(height) + 16 };
    });
    await p.screenshot({ path: out(name), clip: r });
  };

  /* ── s1: 미완(todo) 배너 ── */
  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    uiDirty = true; renderUI(); drawTuto();
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: out('148-r1-s1-배너미완.png') });
  await banner('148-r1-s1c-배너미완.png');

  /* ── s2: 보상받기(ready) 배너 ── */
  await p.evaluate(() => {
    S.guide.prog = 0;
    const m = GUIDE[S.guide.idx];
    /* 델타형 기준선을 0 으로 두고 카운터를 목표까지 밀어 ready 로 만든다 */
    S.cnt.sumSkill = (m.goal || 1) + 10;
    uiDirty = true; renderUI(); drawTuto();
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: out('148-r1-s2-배너보상.png') });
  await banner('148-r1-s2c-배너보상.png');

  /* ── s3: 22 퀘스트(미션) 팝업 ── */
  await p.evaluate(() => { gmCloseAll(); closeModal(); openQuest(); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: out('148-r1-s3-퀘스트.png') });

  /* ── s4: 19 프로필 «해금 미션» 바 ── */
  await p.evaluate(() => { closeModal(); gmCloseAll(); openProfile && openProfile(); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: out('148-r1-s4-프로필.png') });

  await b.close();
  console.log('CAP148 ok — console errors: ' + errs.length);
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
})();
