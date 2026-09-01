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
    /* 428 — «준비 중» 탭 두 칸이 **실제 패스 탭**(tower·tower2)이 됐다. 옛 표본(`box`)은
       PASS_TABS 에 없는 이름이라 «항상 false» 였고, 그건 이 절이 지키려던 «받을 게 있을 때만 켜진다» 를
       한 번도 안 물었다(333 처방 — 자리를 비우지 말고 살아 있는 표본으로 갈아 끼운다).
       탑 진행은 부팅 세이브에서 «한 레벨도 안 깬» 상태(S.tower = 1 ⇒ 깬 레벨 0)라 여기서는 꺼져 있어야 한다. */
    const before = { tower: passReadyTab('tower'), tower2: passReadyTab('tower2'), lv: passTowerLv('tower') };
    S.tower = 4;                                   /* 레벨 3 까지 깼다 ⇒ 탑 패스 3단계 해금 */
    const after = { tower: passReadyTab('tower'), lv: passTowerLv('tower') };
    S.tower = 1;                                   /* 뒤 절이 «꺼진 탑 탭» 을 전제하므로 되돌린다 */
    return { stage: passReadyTab('stage'), att: passReadyTab('att'),
             before, after, noBox: !PASS_TABS.box, any: passReadyAny() };
  });
  ok(j.stage === true, '[1] 스테이지 패스 — 해금·미수령 칸이 있어 ready', String(j.stage));
  ok(j.att === false, '[1] 출석 패스 — 접속일 0 이라 ready 아님', String(j.att));
  ok(j.noBox === true, '[1] 428 — 죽은 탭 이름 «box» 는 PASS_TABS 에 없다(89 가 보물상자를 폐기했다)');
  ok(j.before.tower === false && j.before.tower2 === false,
     '[1] 428 — 두 탑 패스: 한 레벨도 안 깬 세이브에서는 ready 아님 (깬 레벨 ' + j.before.lv + ')');
  ok(j.after.tower === true,
     '[1] 428 — ★ 레벨을 깨면 그 탑 패스가 ready 로 켜진다 (깬 레벨 ' + j.after.lv + ')');
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
    /* 526 이관 — 창 가상화 뒤로 «한 번 열고 `#psTk .ps-bx` 를 전부 센다» 는 **창 안 24행만** 센다.
       ④ 의 뜻(«받을 수 있는 칸만 점등 · 그 외에는 노드조차 없다»)은 전수여야 살아 있으므로
       **리스트를 끝까지 훑어서** 모은다. 훑은 단계 수(`seen`)를 같이 돌려받아 표본이 전 단계임을 못박는다. */
    const dot = c => { const d = c.querySelector('s.updot'); return d ? getComputedStyle(d).display : null; };
    /* ⚠ 노드를 모아 뒀다 나중에 `getComputedStyle` 로 물으면 안 된다 — 창을 갈아 끼우는 순간
       그 노드는 **문서에서 떨어져** 계산 스타일이 빈 문자열이 된다(1회차에 여기서 한 번 빨개졌다).
       그래서 «보이는가» 도 훑는 그 자리에서 바로 읽어 **숫자로** 모은다. */
    const L = document.getElementById('psList'), seen = new Set();
    let othersNoDot = true, litN = 0, litFree = 0, litDots = 0;
    const scan = () => document.querySelectorAll('#psTk .ps-r:not(.ps-hr)').forEach(row => {
      if (seen.has(+row.dataset.pr)) return;
      seen.add(+row.dataset.pr);
      row.querySelectorAll('.ps-bx').forEach(c => {
        if (c.classList.contains('alert')) {
          litN++;
          if (c.classList.contains('c0')) litFree++;
          if (dot(c) === 'block') litDots++;
        } else if (c.querySelector('s.updot')) othersNoDot = false;
      });
    });
    const maxSc = L.scrollHeight - L.clientHeight;
    for (let s = 0; s <= maxSc + 1; s += PASS_RH * 4) { L.scrollTop = Math.min(s, maxSc); passFillRows(); scan(); }
    L.scrollTop = 0; passFillRows();
    return {
      seen: seen.size, nSteps: passT().n, readyCnt: passReadyCnt(),
      stage: tab('stage'), att: tab('att'), box: tab('box'), tower: tab('tower'), tower2: tab('tower2'),
      litN, litAllFree: litN === litFree, litDotsShown: litN === litDots,
      /* 프리미엄(잠긴) 칸·미해금 행 칸에는 updot 노드 자체가 없다 */
      othersNoDot,
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
  /* 428 — 옛 항은 «준비 중 탭 2개(box·tower)는 꺼짐» 이었다. 그 둘은 PASS_TABS 에 없어서 꺼져 있던 것이라
     탭이 실제 패스가 된 지금 그 문장은 **표본을 잃었다.** 지키려던 뜻(«받을 게 없는 탭은 꺼진다»)은
     그대로 두 탑 탭에 물리고, 죽은 이름 box 는 «칸 자체가 없다» 로 못 박는다. */
  ok(inpass.box.shown === 'no-node', '[3] ③ 428 — 죽은 탭 «box» 칸이 탭바에서 사라졌다', inpass.box.shown);
  ok(inpass.tower.alert === false && inpass.tower2.alert === false,
     '[3] ③ 두 탑 패스는 꺼짐 — 이 세이브는 한 레벨도 안 깼다',
     inpass.tower.alert + '/' + inpass.tower2.alert);
  /* 526 이관 — 훑기가 전 단계를 봤는지부터 잰다(안 그러면 아래 셋이 «창 안에서만» 참일 수 있다) */
  ok(inpass.seen === inpass.nSteps, '[3] ④ 전제 — 훑기가 전 단계를 봤다(창 가상화)',
     inpass.seen + '/' + inpass.nSteps + '단계');
  ok(inpass.litN === 3 && inpass.litN === inpass.readyCnt,
     '[3] ④ 받을 수 있는 보상 칸 = 3(단계 3 × 무료) — 모델(passReadyCnt)과 같은 수',
     inpass.litN + ' / 모델 ' + inpass.readyCnt);
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
    /* 647 — 기대 지급액 문자열을 제품의 표기 함수(`won`)에서 파생한다.
       토스트는 `won(sum)`(29936 `toLocaleString('en-US')` = 쉼표 구분)으로 찍는데
       옛 자는 `\+3797\b` 를 찾아 493 이 want.dia 를 4자리 위로 밀자 쉼표에서 갈렸다.
       정규식을 넓혀 «지나가게» 만들면(334·643 규약 반려) 표기 규칙이 또 바뀔 때 재부패한다. */
    return { gold: S.gold, dia: S.dia, relic: S.relic, want, n, diaTxt: won(want.dia) };
  });
  await page.click('#psAll');
  /* 493 이관(2026-08-31) — 토스트는 **클릭이 돌아온 직후**에 읽는다.
     아래 [5] 마지막 항(«토스트가 같은 사실을 말한다»)은 종전에 `waitForTimeout(400)` **뒤**의
     `#fxl` 을 봤다. 토스트 수명은 창조 시점부터 약 1.2초인데(실측 `tools/probe493g.js`),
     493 이 패스 리스트를 40행 → 600행으로 늘리자 이 경로의 시계가 통째로 뒤로 밀렸다:
     playwright 의 click 이 137,910px·노드 16,204개짜리 트랙에서 안정성 검사에 **1,258ms**,
     핸들러(=`renderPass`)가 **835ms** 를 쓴다 ⇒ +400ms 지점이 토스트 수명을 **수십 ms 차이로**
     지나쳐 «토스트 없음» 이 된다. **제품은 안 바뀌었다** — 토스트는 여전히 뜨고 1.2초 산다.
     ⇒ 사실(«토스트가 지급액을 말한다»)은 그대로 재되 «리스트 렌더가 얼마나 걸리는가» 에
        기대지 않는 자리에서 읽는다. 400ms 대기는 세이브·재화 항을 위해 그대로 둔다. */
  const toastLive = await page.evaluate(() =>
    (document.getElementById('fxl') || { textContent: '' }).textContent);
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
  /* 398(2026-08-29) — 보상 재화가 dia 하나로 줄어 위 항의 골드·유물조각 기대값이 **둘 다 0** 이 됐다.
     0 == 0 은 «안 줬다» 도 «못 줬다» 도 통과시키므로 표본이 헐거워진다 — 두 항을 더 박는다:
     ① 받을 칸이 실제로 있었다(다이아 기대 > 0) ② 골드·유물조각은 한 톨도 안 는다(다른 재화 부활 감지). */
  ok(before.want.dia > 0 && before.n > 0,
     '[5] ★ 표본이 비어 있지 않다 — 받을 칸 ' + before.n + '개 · 다이아 기대 +' + before.want.dia);
  ok(after.gold === before.gold && after.relic === before.relic,
     '[5] ★ 398 — 일괄 받기가 골드·유물조각은 한 톨도 안 준다',
     'Δgold ' + (after.gold - before.gold) + ' · Δrelic ' + (after.relic - before.relic));
  ok(after.savedGot === before.n, '[5] 세이브에 수령 기록 ' + before.n + '칸', String(after.savedGot));
  /* 647 — 쉼표 구분자는 받되(diaTxt = 제품 `won` 출력), 뒤에 숫자가 더 붙으면(다른 액수) 빨개진다
     = 옛 `\b` 의 경계 뜻을 유지한다. diaTxt 의 쉼표·숫자는 정규식 특수문자가 아니지만 방어적으로 escape. */
  const diaRe = new RegExp('\\+' + before.diaTxt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\d)');
  ok(/일괄 받기/.test(toastLive) && diaRe.test(toastLive),
     '[5] 토스트가 같은 사실을 말한다(156) — 문구 + 지급액 +' + before.diaTxt,
     toastLive.slice(0, 60));

  /* ── [6] 음성 — 전부 받으면 네 자리 모두 꺼진다 ── */
  ok(after.ready === false && after.any === false, '[6] passReady 전부 false');
  ok(after.upall === false, '[6] [일괄 받기] 가 사라진다');
  ok(after.tabAlert === false, '[6] «스테이지» 탭 레드닷 꺼짐');
  /* 526 — `litN` 은 창 안 값이다. 전수의 뜻은 바로 위 두 항(`passReadyTab`·`passReadyAny` = 모델)이 진다. */
  ok(after.litN === 0, '[6] 보상 칸 레드닷 0(창) · 전수는 passReadyAny 가 진다');
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
  /* 526 — `litN`·`litPrem` 은 창 안 표본이다(존재 + «점등된 것은 전부 프리미엄»). 전수는 `ready` 가 진다. */
  ok(prem.ready === true && prem.litN > 0 && prem.litPrem === true,
     '[7] 프리미엄 활성화 → 프리미엄 칸만 새로 점등(창 표본)', 'lit ' + prem.litN);

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
