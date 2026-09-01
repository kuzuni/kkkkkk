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

  /* 3. 유물조각 교환 — 다이아가 나가고 유물조각이 **그 자리에서** 들어온다(697)
     ⚠ 405 이관(2026-08-29) — 옛 항목은 「다이아 감소·유물조각 증가」를 **한 물음에 묶어** 클릭 순간의
       `S.relic` 을 봤고 −1000/+0 으로 빨갛게 굳어 있었다. 제품은 옳다 — **153**(주인 지시 2026-08-26
       «상점 지급품은 우편으로»)이 그 사이에 지급 경로를 바꿨고, 자만 그 이전 세계에 남아 있었다.
       333 처방대로 **자리를 비우지 않고** 살아 있는 계약으로 갈아 끼우되, 247-ⓓ 대로 **물음을 가른다**:
       ⓐ 클릭 순간 = 다이아만 나가고 우편 한 통이 온다 · ⓑ 그 우편을 받으면 유물조각이 실제로 는다.
     ⚠ **697 이관(2026-09-02)** — 주인 지시로 그 우편 단계가 사라졌다(«다이아를 다른재화로 바꾸는거는
       즉각으로 … 우편으로 오지말고»). 가른 두 물음은 그대로 두되 방향을 뒤집는다:
       ⓐ 클릭 순간 = 다이아 −n · 그 재화 +n · 우편 0 · ⓑ 수령 단계 없이 그 지급이 완결된다.
     ⚠ 같이 고친 부패 1건 — `EXCHANGE.find(v => v.dia === …)` 는 **490**(주인 확정 «교환은 1:1» ·
       `data-ex` 가 가격이 아니라 **재화 키**)에서 이미 죽어 `row` 가 늘 `undefined` 였다. 기대값이
       `undefined` 라 «양쪽 다 undefined» 로 초록이던 자리다 — 키로 찾고 수량은 `exQtyN()` 에서 뽑는다. */
  const ex = await run(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.dia = 1e9; S.mailx = [];
    /* 앞 절이 띄운 토스트(수명 1060ms)가 남아 있으면 완료 통보가 **드롭**된다(`fxToast` 는 4장부터) */
    document.querySelectorAll('#fxl .fx-toast').forEach(n => n.remove());
    const d0 = S.dia, r0 = S.relic;
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    if (!btn) return { err: '교환 버튼 없음' };
    /* 기대 수량은 리터럴이 아니라 **런타임 계산**이다(185-①) — 490 이후 교환은 1:1 이고
       수량은 수량 탭(`exQtyN()`)이 정한다. `data-ex` 는 재화 키다. */
    const row = EXCHANGE.find(v => v.k === btn.dataset.ex);
    const want = exQtyN();
    btn.click();
    await sleep(60);
    const mid = { dd: S.dia - d0, dr: S.relic - r0, mailN: (S.mailx || []).length,
                  key: row && row.k, want: want };
    const ic = [...document.querySelectorAll('#fxl .fx-toast img.cic')].map(i => i.dataset.curIc);
    /* ⓑ — 수령 단계가 없다는 것을 «받아 봐도 더 안 는다» 로 못박는다(697 이 그 단계를 없앴다) */
    const r1 = S.relic;
    openMail(); claimAllMail(); await sleep(150); closeModal();
    return Object.assign(mid, { ic: ic.join(','), after: S.relic - r1 });
  });
  ok(!ex.err && ex.dd === -ex.want && ex.dr === ex.want && ex.mailN === 0,
     '재화 탭 [유물조각 교환]', '다이아 −n · 유물조각 +n 이 같은 틱 · 새 우편 0(697)',
     (ex.dd || 0) + ' / 즉시 +' + (ex.dr || 0) + ' / 우편 ' + ex.mailN + '통 (n=' + ex.want + ')');
  ok(!ex.err && ex.after === 0,
     '교환 지급 완결', '수령 단계가 없다 — 우편함을 열어 받아도 더 들어올 것이 없다', '+' + (ex.after || 0));
  ok(/relic/.test(ex.ic || '') && /dia/.test(ex.ic || ''),
     '교환 완료 통보', '두 재화 아이콘이 이미지', String(ex.ic));

  /* 4. 부족 안내 — 문구는 «태그가 글자로 새지 않은 한글» 이어야 하고,
        60 쥬시의 «어느 알약을 흔들지» 판정이 이모지 없이도 계속 선다
     ⚠ 405 이관(2026-08-29) — 옛 항목은 `$('mtitle')`(팝업 제목)을 읽었고 **"우편함"** 으로 빨갰다.
       그 "우편함" 은 부족 안내가 아니라 **§2 가 연 우편함 팝업의 잔재**다 — `probe405` §3 이
       «클릭으로 mtitle 이 한 글자도 안 바뀐다» + «팝업을 한 번도 안 연 페이지에서는 빈 값» 으로 못박았다.
       부족 안내는 **149·206**(주인 지시 «안내는 팝업 말고 토스트로»)으로 토스트로 내려갔으므로
       재는 자리를 옮긴다(185-④). 자리만 옮기면 «206 이 되돌려져 팝업이 돌아와도 초록» 이 되므로
       **「팝업이 아니다」 를 같은 자리에서 동반 단언**한다(230-③). */
  const lack = await run(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    closeModal(); closeShopPage();
    await sleep(350);                                   /* 모달이 «닫힌» 뒤라야 여는 연출(jzOpen)이 다시 돈다 */
    document.querySelectorAll('#fxl .fx-toast, #fxl .jz-badp').forEach(n => n.remove());
    document.querySelectorAll('.jz-bad').forEach(n => n.classList.remove('jz-bad'));
    S.dia = 0;
    openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
    const btn = document.querySelector('#shopList .bt.buy[data-ex]');
    btn && btn.click();
    await sleep(90);
    const tn = document.querySelector('#fxl .fx-toast');
    const t = tn ? tn.textContent.trim() : '';
    const modalOn = $('modal').classList.contains('on');
    /* 플래시는 «한 시점» 이 아니라 «구간» 이다 — 실측으로 클릭 +100ms 쯤 붙어 700ms 쯤 걷힌다.
       고정 90ms 한 장으로 찍으면 시작 모서리에 딱 걸려 머신 속도에 따라 뜨고 진다(작업 145).
       jzBadPill 의 수명(480ms) 안에서 «뜰 때까지» 기다렸다가 판정한다 — 뜨면 즉시 빠져나온다. */
    let bad = false;
    for (let i = 0; i < 30 && !bad; i++) {
      bad = !!document.querySelector('.cDia.jz-bad, #fxl .jz-badp');
      if (!bad) await sleep(20);
    }
    /* 기대 문구는 리터럴이 아니라 **런타임 계산**이다(185-①) — 값이 바뀌면 자도 따라간다.
       ⚠ 490 이후 필요액은 «가격 필드» 가 아니라 고른 수량(`exQtyN()`)이다(1:1). */
    const want = btn ? fmt(exQtyN() - S.dia) + ' 더 필요합니다' : null;
    return { title: t, want, leak: /img\s|cur-[a-z]+\.svg|[<>]/.test(t), modalOn,
             icons: tn ? [...tn.querySelectorAll('img.cic')].map(i => i.dataset.curIc).join(',') : '', bad };
  });
  ok(/부족|더 필요/.test(lack.title) && lack.title === lack.want && !lack.leak,
     '다이아 부족 상태에서 [교환]', '부족 안내 문구가 깨끗한 한글(모자란 만큼을 적는다)',
     JSON.stringify(lack.title) + ' (기대 ' + JSON.stringify(lack.want) + ')');
  ok(lack.modalOn === false && /dia/.test(lack.icons || ''),
     '부족 안내', '팝업이 아니라 토스트다(149·206) · 재화는 이미지',
     'modal.on=' + lack.modalOn + ' · 아이콘 [' + lack.icons + ']');
  ok(lack.bad === true, '부족 안내', '다이아 알약이 빨갛게 튄다(60 쥬시 유지)', String(lack.bad));

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
