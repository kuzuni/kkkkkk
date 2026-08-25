/* 작업 83 — 메인 좌측 사이드 «도감» 아이콘 기능 게이트.  실행: node tools/verify83.js
   기하(행 그리드·잉크 bbox)는 tools/verifyA2.js + tools/scanA2.py 담당. 여기서는
   ① 클릭 → #collw.on ② 다른 팝업이 열려 있어도 걷고 연다 ③ 레드닷 = collReady 연동
   ④ 수령 후 레드닷 소멸 ⑤ 닫기 → 메인 복귀 를 실제 게임 데이터로 확인한다. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

(async () => {
  let b;
  try { b = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await chromium.launch(o); }
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);

  /* [1] 아이콘 존재 + 클릭 → 21 팝업 */
  console.log('[1] 진입');
  ok(await p.$('#sideL .ibtn[data-pop="coll"]'), '#sideL 에 도감 칸이 있다');
  await p.evaluate(() => document.querySelector('#sideL .ibtn[data-pop="coll"]').click());
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => $('collw').classList.contains('on')), '클릭 → #collw.on');

  /* [2] 닫기 → 메인 복귀 (팝업이 실제로 걷힌다) */
  await p.evaluate(() => closeColl21());
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => !$('collw').classList.contains('on')), '닫기 → #collw off');

  /* [3] 다른 팝업(축복)이 열린 채 클릭해도 걷고 연다 — gmPage 경로 */
  await p.evaluate(() => { openBless(); });
  await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('#sideL .ibtn[data-pop="coll"]').click());
  await p.waitForTimeout(250);
  const st3 = await p.evaluate(() => ({ coll: $('collw').classList.contains('on'),
                                        panel: panelOpen }));
  ok(st3.coll, '축복 팝업이 열린 상태에서 클릭 → #collw.on');
  ok(!st3.panel, '패널은 닫힌 상태(gmCloseAll 경로)');
  await p.evaluate(() => closeColl21());

  /* [4] 레드닷 — 실제 데이터: 스킬 3종 보유(1티어 need 3) → on, 수령(claimColl) → off */
  console.log('[4] 레드닷');
  const dot = () => p.evaluate(() => document.querySelector('#sideL .ibtn[data-pop="coll"]').classList.contains('on'));
  await p.evaluate(() => {
    Object.assign(S, DEF());
    SKILLS.slice(0, 3).forEach(k => { if (!S.own[k.id]) S.own[k.id] = { n: 0, l: 1 }; });
    uiDirty = true; renderUI();
  });
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => collReady('skill')), '스킬 3종 보유 → collReady(skill)');
  ok(await dot(), '레드닷 on');
  await p.evaluate(() => { claimColl('skill'); closeModal(); uiDirty = true; renderUI(); });
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => !['skill','equip','pet','relic'].some(collReady)), '수령 후 남은 보너스 없음');
  ok(!(await dot()), '수령 후 레드닷 off');

  console.log('[5] 콘솔');
  ok(errs.length === 0, '콘솔 에러 0 ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : ''));

  await b.close();
  console.log(`\nVERIFY83 ${pass}/${pass + fail}` + (fail ? ' — FAIL' : ''));
  process.exit(fail ? 1 : 0);
})();
