#!/usr/bin/env node
/* 게이트 — 작업 301 「35 패스 레드닷 체인」 + 302 「[일괄 받기]」 (저장소 주인 지시 2026-08-27)
 *
 *   node tools/verify301.js
 *
 * 301: 받을 패스 보상이 있으면 레드닷이 «▦ 메뉴 버튼 → 메뉴 안 «패스» 칸 → 해당 패스 탭 → 그 보상 칸»
 *      네 곳 전부에 뜬다. 166 규약 — 프리미엄 미보유 칸은 «불가능» 이라 점등 대상이 아니다(무료 칸만).
 * 302: [일괄 받기] 버튼 — 받을 칸이 있을 때만 보이고(266 도감 [일괄 강화] 관례 · 라벨에 개수),
 *      누르면 현재 탭의 받을 수 있는 칸을 전부 수령하며 지급 합계가 세이브에 반영된다(156 삼자 일치).
 * 음성 시험: 전부 수령하면 네 자리 모두 꺼진다 · 프리미엄 칸은 점등도 수령도 안 된다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  /* best=17 → 스테이지 패스 3단계(5·10·15) 해금. 출석 0 · 우편 0 (▦ 배지가 패스만으로 켜지는지 본다) */
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1000, dia: 100, best: 17, totalKills: 100, mail: [], att: { n: 0, date: '' } })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openPass === 'function'
    && typeof passReadyTab === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* ── [1] 판정 함수 ── */
  const j = await page.evaluate(() => {
    /* 우편·다른 알림이 ▦ 배지를 겹쳐 켜지 않게 정리 — 180 «월별 다이아» 가 30초마다 다시 오므로
       이번 달은 보냈다고 표시해 재발송을 막는다(우편은 S.mailx 다) */
    S.lastMonthly = monthKey(); S.mailx = [];
    allMails().forEach(m => S.mail[m.id] = 2);      /* 고정 우편 m1~m5 까지 전부 처리됨으로 */
    uiDirty = true; renderUI();
    return { stage: passReadyTab('stage'), att: passReadyTab('att'),
             box: passReadyTab('box'), any: passReadyAny() };
  });
  ok(j.stage === true, '[1] 스테이지 패스 — 해금·미수령 칸이 있어 ready', String(j.stage));
  ok(j.att === false, '[1] 출석 패스 — 접속일 0 이라 ready 아님', String(j.att));
  ok(j.box === false, '[1] 준비 중 탭(box)은 항상 ready 아님', String(j.box));
  ok(j.any === true, '[1] passReadyAny = true');

  /* ── [2] 301 체인 ①② — ▦ 메뉴 버튼 · 메뉴 안 «패스» 칸 ── */
  const chain = await page.evaluate(() => {
    const mb = document.getElementById('menub');
    const cell = document.querySelector('#mnw .mn-b[data-mn="pass"]');
    const bdg = cell ? cell.querySelector('.bdg') : null;
    openMenu();
    const r = {
      mbAlert: mb.classList.contains('alert'),
      cellAlert: cell ? cell.classList.contains('alert') : null,
      cellBdgShown: bdg ? getComputedStyle(bdg).display : 'none-node',
    };
    closeMenu();
    return r;
  });
  ok(chain.mbAlert === true, '[2] ① ▦ 메뉴 버튼에 .alert (패스만으로 켜짐 — 우편 0)', String(chain.mbAlert));
  ok(chain.cellAlert === true, '[2] ② 메뉴 안 «패스» 칸에 .alert', String(chain.cellAlert));
  ok(chain.cellBdgShown === 'block', '[2] ② 그 칸 배지가 실제로 보인다', chain.cellBdgShown);

  /* ── [3] 301 체인 ③④ — 패스 탭 · 보상 칸 ── */
  await page.evaluate(() => openPass('stage'));
  await page.waitForTimeout(300);
  const inpass = await page.evaluate(() => {
    const tab = k => {
      const el = document.querySelector('#psBar .pt[data-ptab="' + k + '"]');
      const b = el && el.querySelector('.bdg');
      return { alert: el ? el.classList.contains('alert') : null,
               shown: b ? getComputedStyle(b).display : 'no-node' };
    };
    const cells = [...document.querySelectorAll('#psTk .ps-bx')];
    const dot = c => { const d = c.querySelector('s.updot'); return d ? getComputedStyle(d).display : null; };
    const lit = cells.filter(c => c.classList.contains('alert'));
    return {
      stage: tab('stage'), att: tab('att'), box: tab('box'), tower: tab('tower'),
      litN: lit.length,
      litAllFree: lit.every(c => c.classList.contains('c0')),
      litDotsShown: lit.every(c => dot(c) === 'block'),
      /* 프리미엄(잠긴) 칸·미해금 행 칸에는 updot 노드 자체가 없다 */
      othersNoDot: cells.filter(c => !c.classList.contains('alert')).every(c => !c.querySelector('s.updot')),
      upall: document.getElementById('psw').classList.contains('upall'),
      btnShown: getComputedStyle(document.getElementById('psAll')).display !== 'none',
      btnLabel: document.querySelector('#psAll>b').textContent,
      btnCls: document.getElementById('psAll').className,
      ink: (() => { const lb = document.querySelector('#psAll>b'); const cs = getComputedStyle(lb);
                    return cs.color + '/' + cs.webkitTextStrokeColor; })(),
    };
  });
  ok(inpass.stage.alert === true && inpass.stage.shown === 'block',
     '[3] ③ «스테이지» 탭 레드닷 점등', inpass.stage.alert + '/' + inpass.stage.shown);
  ok(inpass.att.alert === false && inpass.att.shown === 'none',
     '[3] ③ «출석» 탭은 꺼짐', inpass.att.alert + '/' + inpass.att.shown);
  ok(inpass.box.alert === false && inpass.tower.alert === false,
     '[3] ③ 준비 중 탭 2개는 꺼짐');
  ok(inpass.litN === 3, '[3] ④ 받을 수 있는 보상 칸 = 3(단계 3 × 무료)', String(inpass.litN));
  ok(inpass.litAllFree === true, '[3] ④ 점등 칸은 전부 무료 컬럼(166 — 프리미엄 미보유 칸 제외)');
  ok(inpass.litDotsShown === true, '[3] ④ 점등 칸 레드닷이 실제로 보인다(우상단 — 299 규약)');
  ok(inpass.othersNoDot === true, '[3] ④ 그 외 칸에는 updot 노드 자체가 없다');

  /* ── [4] 302 — [일괄 받기] 표시·라벨·규격 ── */
  ok(inpass.upall === true && inpass.btnShown === true, '[4] 받을 칸이 있으면 [일괄 받기] 가 보인다');
  ok(/일괄 받기 3/.test(inpass.btnLabel), '[4] 라벨에 개수(266 관례)', inpass.btnLabel);
  ok(/\bifbtn\b/.test(inpass.btnCls), '[4] 공용 .ifbtn 부품이다', inpass.btnCls);
  ok(inpass.ink === 'rgb(255, 255, 255)/rgb(0, 0, 0)', '[4] 라벨 흰 잉크 + 검정 아웃라인(296)', inpass.ink);

  /* ── [5] 302 — 실동작: 클릭 → 전부 수령 · 지급 합계 = 표기(156) ── */
  const before = await page.evaluate(() => {
    const T = PASS_TABS.stage;
    const want = { gold: 0, dia: 0, relic: 0 }; let n = 0;
    for (let i = 0; i < T.n; i++) {
      if (T.prog() < (i + 1) * T.step) break;
      if (!S.pass.got['stage:' + i + ':0']) { const r = passRw(i, 0); want[r.k] += r.n; n++; }
    }
    return { gold: S.gold, dia: S.dia, relic: S.relic, want, n };
  });
  await page.click('#psAll');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || 'null'); } catch (e) {}
    return {
      gold: S.gold, dia: S.dia, relic: S.relic,
      savedGot: saved ? Object.keys(saved.pass.got).filter(k => k.indexOf('stage:') === 0).length : -1,
      ready: passReadyTab('stage'), any: passReadyAny(),
      upall: document.getElementById('psw').classList.contains('upall'),
      tabAlert: document.querySelector('#psBar .pt[data-ptab="stage"]').classList.contains('alert'),
      litN: document.querySelectorAll('#psTk .ps-bx.alert').length,
      mbAlert: document.getElementById('menub').classList.contains('alert'),
      toast: (document.getElementById('fxl') || { textContent: '' }).textContent,
    };
  });
  ok(after.gold - before.gold === before.want.gold
     && after.dia - before.dia === before.want.dia
     && after.relic - before.relic === before.want.relic,
     '[5] ★ 지급 = 받을 칸 합계 (골드 +' + before.want.gold + ' · 다이아 +' + before.want.dia
     + ' · 유물조각 +' + before.want.relic + ')',
     'Δ ' + (after.gold - before.gold) + '/' + (after.dia - before.dia) + '/' + (after.relic - before.relic));
  ok(after.savedGot === before.n, '[5] 세이브에 수령 기록 ' + before.n + '칸', String(after.savedGot));
  ok(/일괄 받기/.test(after.toast), '[5] 토스트가 같은 사실을 말한다(156)', after.toast.slice(0, 60));

  /* ── [6] 음성 — 전부 받으면 네 자리 모두 꺼진다 ── */
  ok(after.ready === false && after.any === false, '[6] passReady 전부 false');
  ok(after.upall === false, '[6] [일괄 받기] 가 사라진다');
  ok(after.tabAlert === false, '[6] «스테이지» 탭 레드닷 꺼짐');
  ok(after.litN === 0, '[6] 보상 칸 레드닷 0');
  const dbg6 = await page.evaluate(() => ({ keys: JSON.stringify(MENUB_KEYS), ml: mailLeft(), mailx: S.mailx.length }));
  ok(after.mbAlert === false, '[6] ▦ 메뉴 버튼 레드닷 꺼짐(우편 0 이므로)',
     'keys=' + dbg6.keys + ' mailLeft=' + dbg6.ml + ' mailx=' + dbg6.mailx);

  /* ── [7] 프리미엄을 켜면 프리미엄 칸이 새로 ready 가 된다(passReadyTab 이 prem 을 본다) ── */
  const prem = await page.evaluate(() => {
    grantPassPrem('stage');
    return { ready: passReadyTab('stage'),
             litPrem: [...document.querySelectorAll('#psTk .ps-bx.alert')]
               .every(c => !c.classList.contains('c0')),
             litN: document.querySelectorAll('#psTk .ps-bx.alert').length };
  });
  ok(prem.ready === true && prem.litN > 0 && prem.litPrem === true,
     '[7] 프리미엄 활성화 → 프리미엄 칸만 새로 점등', 'lit ' + prem.litN);

  /* ── [8] 우편과 ▦ 배지 OR — 패스가 꺼져도 우편이 있으면 켜진 채다 ── */
  const or8 = await page.evaluate(() => {
    /* 프리미엄 칸까지 전부 수령해 패스를 끄고, 우편 1통을 넣는다.
       sideAlert('pass', …) 는 매 프레임 drawHud() 가 부른다 — 동기 검사라 한 번 직접 돌린다. */
    passClaimAll();
    drawHud();
    sideAlert('mail', true);
    const a = document.getElementById('menub').classList.contains('alert');
    sideAlert('mail', false);
    const b = document.getElementById('menub').classList.contains('alert');
    return { a, b, passAny: passReadyAny(), keys: JSON.stringify(MENUB_KEYS),
             att: passReadyTab('att'), attN: S.att.n };
  });
  ok(or8.passAny === false && or8.a === true && or8.b === false,
     '[8] ▦ 배지 = 우편 OR 패스 (패스 꺼진 채 우편만으로 켜지고, 우편도 끄면 꺼진다)',
     or8.a + '/' + or8.b + ' keys=' + or8.keys + ' att=' + or8.att + '(' + or8.attN + ')');

  ok(errs.length === 0, '[9] 콘솔·런타임 에러 0', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY301 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
