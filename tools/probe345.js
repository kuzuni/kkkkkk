/* 작업 345 재현 프로브 — «우편 팝업이 찌그러지며 닫힘»
 *
 *   node tools/probe345.js
 *
 * 주인 보고: «우편팝업닫힐때 이상하게 닫히더라. 뭔가 팝업이 찌그러지면서 닫힘».
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **무엇이 어떻게 어긋나는가를 눈으로 보는** 자리다.
 *
 * 재는 것 — 닫힘 연출(0.12s) 동안 매 ~16ms:
 *   ① `#modal` 의 클래스 목록(껍데기 클래스가 언제 떨어지는가)
 *   ② `.mbox` 의 **레이아웃 박스**(offsetWidth/offsetHeight — scale 애니의 영향을 안 받는다)
 *   ③ `#modal` 의 padding(껍데기가 딤 패딩까지 바꾼다)
 * 닫힘 연출은 «균등 축소»(scale .94)여야 하므로 **레이아웃 박스는 첫 프레임부터 끝까지 열림과 같아야** 한다.
 * 레이아웃 박스가 닫는 순간 튀면 그것이 곧 «찌그러짐» 이다.
 *
 * 껍데기 5종 전수(ml69 우편 · q22 퀘스트 · at70 출석 · sk8 스킬세부 · rl16 룰렛) — 같은 remove 목록이다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 껍데기 5종 — [클래스, 여는 코드]
   ⚠ `rl16` 은 대조군이다 — 464(2026-08-30)가 제품에서 지운 죽은 이름이고, 룰렛은 껍데기 없이 연다. */
const SHELLS = [
  ['ml69', "openMail()"],
  ['q22',  "openQuest()"],
  ['at70', "openAttend()"],
  ['sk8',  "showSkillDetail(Object.keys(SK)[0])"],
  ['rl16', "openRoulette()"],
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  const snap = () => ev(() => {
    const m = document.getElementById('modal');
    const b = m && m.querySelector('.mbox');
    if (!m || !b) return null;
    const cs = getComputedStyle(m), br = b.getBoundingClientRect();
    return {
      cls: [...m.classList].join(' '),
      w: b.offsetWidth, h: b.offsetHeight,          /* 레이아웃 박스 — scale 무관 */
      mh: getComputedStyle(b).maxHeight,
      pad: cs.paddingTop + '/' + cs.paddingLeft,
      rw: Math.round(br.width * 10) / 10,           /* 그려진 박스 — scale 포함 */
      rh: Math.round(br.height * 10) / 10,
      disp: cs.display,
    };
  });

  for (const [cls, open] of SHELLS) {
    console.log('\n══ ' + cls + ' — ' + open);
    const o = await ev((src) => {
      try { (0, eval)(src); } catch (e) { return { __err: String(e.message || e) }; }
      return 1;
    }, open);
    if (o && o.__err) { console.log('  열기 실패: ' + o.__err); continue; }
    await page.waitForTimeout(500);
    const open0 = await snap();
    if (!open0 || open0.__err) { console.log('  측정 실패: ' + JSON.stringify(open0)); continue; }
    console.log('  열림     cls=[' + open0.cls + '] 레이아웃 ' + open0.w + '×' + open0.h +
                ' max-h=' + open0.mh + ' pad=' + open0.pad + ' 그려진 ' + open0.rw + '×' + open0.rh);

    await ev(() => closeModal());
    const frames = [];
    for (let i = 0; i < 10; i++) { frames.push(await snap()); await page.waitForTimeout(16); }
    let bad = 0;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      if (!f || f.__err) { console.log('   f' + i + ' 측정 실패'); continue; }
      if (f.disp === 'none') { console.log('   f' + i + '  (display:none — 닫힘 완료)'); break; }
      const dw = f.w - open0.w, dh = f.h - open0.h;
      const flag = (dw || dh) ? '  ⛔ 레이아웃 튐 Δ' + dw + '×' + dh : '  ok';
      if (dw || dh) bad++;
      console.log('   f' + i + '  cls=[' + f.cls + '] 레이아웃 ' + f.w + '×' + f.h +
                  ' max-h=' + f.mh + ' pad=' + f.pad + ' 그려진 ' + f.rw + '×' + f.rh + flag);
    }
    console.log('  ⇒ ' + (bad ? '찌그러짐 재현 — 닫힘 프레임 ' + bad + '장에서 레이아웃 박스가 달라진다' : '균등 축소(레이아웃 박스 불변)'));
    await page.waitForTimeout(400);
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
