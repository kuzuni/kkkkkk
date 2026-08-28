/* 작업 293 진단 — «우편에 받을 것이 있는데 레드닷이 안 뜬다» 재현 프로브
 *
 *   실행: node tools/probe293.js   (1080x2280 · 헤드리스)
 *
 * 등재문의 점검 순서 ⓐ~ⓓ 를 그대로 시간축으로 찍는다.
 *   ⓐ renderUI() 주기에서 sideAlert('mail', …) 이 실제로 도는가
 *   ⓑ `#menub.mnon .bdg{display:none}` — 메뉴를 열었다 닫은 뒤 mnon 이 남는가
 *   ⓒ `S.mail[m.id]` 3상태 규약과 mailLeft() 가 «받을 것» 을 맞게 세는가
 *   ⓓ 특이성 함정 — 상위 규칙이 배지 숨김/표시를 이기는가
 *
 * 판정이 아니라 «관찰» 이다. 게이트는 verify293.js.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1200);

  const ev = fn => page.evaluate(fn);
  const wait = ms => page.waitForTimeout(ms == null ? 400 : ms);

  const snap = () => ev(() => {
    const mb = document.getElementById('menub');
    const bd = mb && mb.querySelector('.bdg');
    const cs = bd ? getComputedStyle(bd) : null;
    const r = bd ? bd.getBoundingClientRect() : null;
    const mbcs = mb ? getComputedStyle(mb) : null;
    return {
      mailLeft: typeof mailLeft === 'function' ? mailLeft() : 'no fn',
      mailTotal: typeof allMails === 'function' ? allMails().length : 'no fn',
      mailState: typeof allMails === 'function'
        ? allMails().map(m => m.id + '=' + (S.mail[m.id] || 0)).join(',') : '',
      menubCls: mb ? mb.className : 'no #menub',
      menubDisp: mbcs ? mbcs.display : '',
      menubVis: mbcs ? mbcs.visibility : '',
      menubOpacity: mbcs ? mbcs.opacity : '',
      bdgDisp: cs ? cs.display : 'no .bdg',
      bdgVis: cs ? cs.visibility : '',
      bdgOpacity: cs ? cs.opacity : '',
      bdgRect: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null,
      /* 실제로 화면에 찍히는가 — 배지 중심점의 최상위 요소 */
      topAt: r && r.width ? (el => el ? (el.className || el.tagName) : null)(
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) : null,
    };
  });

  const rows = [];
  const step = async (label, fn) => {
    if (fn) await ev(fn);
    await wait(500);
    rows.push([label, await snap()]);
  };

  await step('① 새 세이브 직후(우편 5통 미수령)');
  await step('② renderUI() 강제 1회', () => { uiDirty = true; renderUI(); });
  await step('③ 메뉴 열기(openMenu)', () => { openMenu(); });
  await step('④ 메뉴 닫기(closeMenu) → mnon 잔존?', () => { closeMenu(); });
  await step('⑤ renderUI() 한 번 더', () => { uiDirty = true; renderUI(); });
  await step('⑥ 우편 전부 수령(claimAllMail)', () => { if (typeof claimAllMail === 'function') claimAllMail(); uiDirty = true; renderUI(); });
  await step('⑦ 새 우편 1통 도착(sendMail)', () => {
    if (typeof sendMail === 'function') sendMail({ t: '테스트', b: '', g: 100 });
    uiDirty = true; renderUI();
  });

  console.log('== 293 프로브 ==');
  rows.forEach(([n, s]) => {
    console.log('\n' + n);
    console.log('   mailLeft=' + s.mailLeft + ' / total=' + s.mailTotal);
    console.log('   S.mail: ' + s.mailState);
    console.log('   #menub class="' + s.menubCls + '" display=' + s.menubDisp
      + ' vis=' + s.menubVis + ' opacity=' + s.menubOpacity);
    console.log('   .bdg display=' + s.bdgDisp + ' vis=' + s.bdgVis + ' opacity=' + s.bdgOpacity
      + ' rect=' + JSON.stringify(s.bdgRect) + ' topAt=' + s.topAt);
  });
  console.log('\n콘솔 에러 ' + errs.length + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  await browser.close();
})();
