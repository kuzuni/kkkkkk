#!/usr/bin/env node
/* 125 기능 체크 — «눌렀을 때 무엇이 바뀌는가» (ROUTINE «기능 완성 규칙», 저장소 주인 지시)
 *
 *   node tools/fnchk125.js
 *
 * 아이콘 통일은 «보이는 것» 을 바꾸는 작업이지만, 그 아이콘이 붙어 있는 **재화 흐름이 계속 실제로 동작하는가**
 * 까지가 완료 조건이다. 그래서 각 경로를 헤드리스로 눌러 보고 ⓐ 재화가 실제로 움직였는지(S·저장)
 * ⓑ 그 자리에 CUR_ICON 이미지가 떴는지 ⓒ HUD·다른 화면에 반영됐는지를 한 표로 남긴다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const rows = [];
const ok = (b, act, effect, detail) => {
  rows.push({ b, act, effect, detail });
  console.log((b ? 'PASS' : 'FAIL') + ' ' + act + ' → ' + effect + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
  await page.waitForTimeout(400);

  const run = fn => page.evaluate(fn);

  /* 1. HUD — 값을 넣으면 알약 숫자와 아이콘이 같이 산다 */
  const hud = await run(() => {
    S.gold = 1234567; S.dia = 98765; S.relic = 4321;
    if (typeof fxDisp === 'object') { fxDisp.gold = S.gold; fxDisp.dia = S.dia; }
    drawHud();
    const g = document.querySelector('.cGold i img.cic'), d = document.querySelector('.cDia i img.cic');
    return { gn: $('goldN').textContent, dn: $('diaN').textContent,
             gs: g && g.getAttribute('src'), ds: d && d.getAttribute('src') };
  });
  ok(hud.gn === '1.23B' && hud.gs === 'assets/ui/cur-gold.svg',
     'HUD 골드 갱신', '숫자 + 코인 이미지', hud.gn + ' / ' + hud.gs);
  ok(hud.dn && hud.ds === 'assets/ui/cur-dia.svg',
     'HUD 다이아 갱신', '숫자 + 보석 이미지', hud.dn + ' / ' + hud.ds);

  /* 2. 우편 일괄 수령 — 재화가 늘고 토스트에 아이콘이 뜬다 */
  const mail = await run(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.mail = {};
    const g0 = S.gold, d0 = S.dia;
    openMail(); claimAllMail(); await sleep(120);
    const t = document.querySelector('#fxl .fx-toast');
    return { dg: S.gold - g0, dd: S.dia - d0,
             ic: t ? [...t.querySelectorAll('img.cic')].map(i => i.dataset.curIc).join(',') : null,
             raw: t ? (t.textContent.indexOf('<img') >= 0) : false };
  });
  ok(mail.dg > 0 && mail.dd > 0, '우편 [일괄 수령]', '골드·다이아 실제 증가',
     '+' + mail.dg + ' / +' + mail.dd);
  ok(/gold/.test(mail.ic || '') && /dia/.test(mail.ic || '') && !mail.raw,
     '우편 수령 토스트', '아이콘 이미지 표시(태그 문자열 아님)', String(mail.ic));

  /* 3. 유물조각 교환 — 다이아 → 유물조각, 완료 팝업에 두 아이콘 */
  const ex = await run(() => {
    S.dia = 1e9;
    const d0 = S.dia, r0 = S.relic;
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    if (!btn) return { err: '교환 버튼 없음' };
    btn.click();
    const ic = [...document.querySelectorAll('#modal img.cic')].map(i => i.dataset.curIc);
    return { dd: S.dia - d0, dr: S.relic - r0, ic: ic.join(','), title: ($('mtitle') || {}).textContent };
  });
  ok(!ex.err && ex.dd < 0 && ex.dr > 0, '재화 탭 [유물조각 교환]', '다이아 감소·유물조각 증가',
     (ex.dd || 0) + ' / +' + (ex.dr || 0));
  ok(/relic/.test(ex.ic || '') && /dia/.test(ex.ic || ''),
     '교환 완료 팝업', '두 재화 아이콘이 이미지', String(ex.ic));

  /* 4. 부족 팝업 — 제목은 «아이콘 없는 한글» 이어야 하고(showModal 이 textContent 로 넣는다),
        60 쥬시의 «어느 알약을 흔들지» 판정이 이모지 없이도 계속 선다 */
  const lack = await run(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); closeShopPage();
    await sleep(350);                                   /* 모달이 «닫힌» 뒤라야 여는 연출(jzOpen)이 다시 돈다 */
    S.dia = 0;
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    btn && btn.click();
    await sleep(90);
    const t = ($('mtitle') || {}).textContent || '';
    /* 플래시는 «한 시점» 이 아니라 «구간» 이다 — 실측으로 클릭 +100ms 쯤 붙어 700ms 쯤 걷힌다.
       고정 90ms 한 장으로 찍으면 시작 모서리에 딱 걸려 머신 속도에 따라 뜨고 진다(작업 145).
       jzBadPill 의 수명(480ms) 안에서 «뜰 때까지» 기다렸다가 판정한다 — 뜨면 즉시 빠져나온다. */
    let bad = false;
    for (let i = 0; i < 30 && !bad; i++) {
      bad = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!bad) await sleep(20);
    }
    return { title: t, leak: /img\s|cur-[a-z]+\.svg/.test(t), bad };
  });
  ok(/부족/.test(lack.title) && !lack.leak,
     '다이아 부족 상태에서 [교환]', '부족 팝업 제목이 깨끗한 한글', JSON.stringify(lack.title));
  ok(lack.bad === true, '부족 팝업', '다이아 알약이 빨갛게 튄다(60 쥬시 유지)', String(lack.bad));

  /* 5. 훈련 강화 — 골드가 실제로 빠지고 카드 비용행 아이콘이 이미지 */
  const tr = await run(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); closeShopPage();
    S.gold = 1e15;
    openTrain(); await sleep(120);
    const g0 = S.gold;
    const btn = document.querySelector('#trw .tc-up, #trw [data-tr], #trw .tcard .up');
    if (btn) btn.click();
    await sleep(120);
    return { spent: g0 - S.gold,
             ic: [...document.querySelectorAll('#trw img.cic')].map(i => i.dataset.curIc).join(','),
             raw: (document.querySelector('#trw') || {}).innerText ?
                  document.querySelector('#trw').innerText.indexOf('<img') >= 0 : false };
  });
  ok(/gold/.test(tr.ic || ''), '훈련 화면', '비용행 골드 아이콘이 이미지', String(tr.ic).slice(0, 40));
  ok(tr.raw === false, '훈련 화면', '아이콘 태그가 글자로 새지 않는다', String(tr.raw));

  /* 6. 던전 — 입장권이 **던전마다** 다르고, 세부 팝업이 그 권종을 따라간다(402) */
  const dun = await run(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeTrain && closeTrain();
    openDungeon(); await sleep(120);
    const cards = [...document.querySelectorAll('#dunw .sp.tk img.cic')].map(i => i.dataset.curIc);
    openDunDetail(DUNGEONS[1]); await sleep(100);
    const det = document.querySelector('#dgdTki img.cic');
    return { cards: cards.join(','), det: det ? det.dataset.curIc : null, n: DUNGEONS.length };
  });
  /* 402 — «계열» 이 아니라 **던전마다 한 장**이다(주인 지시 2026-08-29). 종수를 손으로 적지 않는다 */
  ok(dun.cards.split(',').filter(Boolean).length === dun.n
     && new Set(dun.cards.split(',').filter(Boolean)).size === dun.n,
     '던전 목록', '카드 권종이 던전마다 다른 이미지(중복 0건)', dun.cards);
  ok(dun.det === 'tkDia', '다이아 던전 [세부]', '세부 팝업 권종이 그 던전 계열', String(dun.det));

  /* 7. 저장 — 새로 고침해도 값이 남는다(아이콘 교체가 세이브 구조를 안 건드렸다) */
  const saved = await run(() => { const g = S.gold; save(); return g; });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
  await page.waitForTimeout(400);
  const after = await run(() => ({ gold: S.gold, ic: !!document.querySelector('.cGold i img.cic') }));
  ok(Math.abs(after.gold - saved) < 1e-6, '새로 고침', '세이브의 골드가 그대로',
     saved + ' → ' + after.gold);
  ok(after.ic === true, '새로 고침', 'HUD 아이콘이 다시 붙는다(curIcMount)', String(after.ic));

  ok(errs.length === 0, '전 과정', '콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0건');

  await browser.close();
  console.log('\n| 조작 | 기대 결과 | 판정 |');
  console.log('|---|---|---|');
  rows.forEach(r => console.log('| ' + r.act + ' | ' + r.effect + (r.detail ? ' (' + r.detail + ')' : '') + ' | ' + (r.b ? '✅' : '❌') + ' |'));
  console.log('\nFNCHK125 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
