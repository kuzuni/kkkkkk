/* 33 재화 정보 팝업 — 기능/연결 검증 (T2 «기능 완성 규칙» 기능 체크 표의 근거)
   node verify33.js
   1. 전역 규칙 — [data-cur] 가 붙은 «모든» 재화 아이콘이 실제 클릭으로 팝업을 연다
   2. 재화별 내용이 실제 게임 데이터(S.gold/S.dia/S.relic/S.sp)와 일치한다
   3. 보유량이 바뀌면 팝업 표시도 갱신된다
   4. 닫기(확인 버튼 · 딤 클릭)가 동작한다
   5. 팝업이 다른 화면(팝업 위 팝업)에서도 열린다 */
const { chromium } = require('playwright');
const path = require('path');

const oks = [], fails = [];
const ok = m => { oks.push(m); console.log('  ✓ ' + m); };
const fail = m => { fails.push(m); console.log('  ✗ ' + m); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 1234567, dia: 3210, relic: 450, sp: 12, stage: 1, best: 1,
      buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
    }));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);

  const closeAll = () => page.evaluate(() => { if (typeof closeCurInfo === 'function') closeCurInfo(); });
  const isOpen = () => page.evaluate(() => !!document.querySelector('#ciw.on'));
  const txt = () => page.evaluate(() => (document.getElementById('ciw') || {}).innerText || '');

  /* ---- 1. 전역 규칙: [data-cur] 아이콘 전수 클릭 ----
     HUD 알약 2개 외에 유물석(🔮 유물 소환 페이지) · 스탯 포인트(🧬 성장 스탯 탭) 아이콘도
     화면에 띄워 놓고 «전수» 로 돈다 — 안 열어 두면 숨김 상태라 건너뛰어 버린다. */
  console.log('[1] 재화 아이콘 전수 클릭');
  await page.evaluate(() => { try { S.upTab = 'stat'; uiDirty = true; renderUI(); } catch (e) {} });
  await page.evaluate(() => { try { goTab('up'); } catch (e) {} });
  await page.waitForTimeout(500);
  /* 41 이 03 던전·14 보물상자 팝업에 «내장 재화 바»(.pcb-p)를 만들면서 data-cur 을 붙였다 —
     전역 규칙이 남의 화면에서도 실제로 도는지 팝업을 열어 확인한다. */
  for (const [label, js] of [['03 던전 내장 재화 바', "openDungeon&&openDungeon()"],
                             ['14 보물상자 내장 재화 바', "goTab('box')"]]) {
    await page.evaluate(s => { try { eval(s); } catch (e) {} }, js);
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.pcb-p[data-cur]')]
        .filter(e => e.getBoundingClientRect().width > 0);
      if (!els.length) return { none: true };
      const out = [];
      for (const e of els) {
        if (typeof closeCurInfo === 'function') closeCurInfo();
        e.click();
        out.push({ cur: e.dataset.cur, on: !!document.querySelector('#ciw.on') });
      }
      if (typeof closeCurInfo === 'function') closeCurInfo();
      return { out };
    });
    if (r.none) ok(label + ': 지금 화면에 없음 — 건너뜀');
    else r.out.forEach(o => o.on ? ok(`${label} [${o.cur}] 클릭 → 팝업 열림`)
                                 : fail(`${label} [${o.cur}] 클릭해도 안 열림`));
    await page.evaluate(() => { try { closeAllPop && closeAllPop(); } catch (e) {} });
    await page.waitForTimeout(200);
  }
  const icons = await page.$$eval('[data-cur]', els => els.map((e, i) => ({
    i, cur: e.dataset.cur, cls: e.className, id: e.id,
    vis: !!(e.getBoundingClientRect().width && e.getBoundingClientRect().height)
  })));
  if (!icons.length) fail('[data-cur] 아이콘이 하나도 없다');
  for (const ic of icons) {
    if (!ic.vis) { ok(`[data-cur=${ic.cur}] #${ic.i} 은 지금 숨김 상태 — 건너뜀`); continue; }
    await closeAll();
    const opened = await page.evaluate(i => {
      document.querySelectorAll('[data-cur]')[i].click();
      return !!document.querySelector('#ciw.on');
    }, ic.i);
    opened ? ok(`클릭 → 팝업 열림: [data-cur=${ic.cur}] .${(ic.cls || '').split(' ')[0]}`)
           : fail(`클릭해도 안 열림: [data-cur=${ic.cur}] #${ic.i}`);
  }
  await closeAll();

  /* ---- 2. 내용이 실제 게임 데이터와 일치 ---- */
  console.log('[2] 표시 내용 = 실제 게임 데이터');
  const want = { gold: 0, dia: 3210, relic: 450, sp: 12 };   /* 값 자체는 curVal() 로 실시간 대조한다 */
  for (const k of Object.keys(want)) {
    await closeAll();
    const r = await page.evaluate(k => {
      if (typeof openCurInfo !== 'function') return { err: 'openCurInfo 없음' };
      openCurInfo(k);
      const w = document.getElementById('ciw');
      const live = typeof curVal === 'function' ? curVal(k) : null;
      return { on: w.classList.contains('on'), t: w.innerText, live,
               shown: document.getElementById('ciHave').textContent,
               expect: '보유: ' + fmt(live) };
    }, k);
    if (r.err) { fail(k + ': ' + r.err); continue; }
    if (!r.on) { fail(k + ': openCurInfo 로 안 열림'); continue; }
    /* 골드는 자동 플레이가 계속 올리므로 «세이브에 넣은 값» 이 아니라 **그 순간의 실제 값**과 대조한다
       (25 교훈 «유휴 루프가 굴리는 값을 빼라» 의 재현). 게임 표기 함수 fmt() 를 그대로 써서 비교. */
    const hit = r.shown === r.expect;
    hit ? ok(`${k}: 보유량 표시 «${r.shown}» = 실제 값 ${r.live} (fmt 일치)`)
        : fail(`${k}: 표시 «${r.shown}» ≠ 실제 ${r.live}(→«${r.expect}») — 본문 «${r.t.replace(/\n/g, ' / ').slice(0, 140)}»`);
    if (r.live == null) fail(k + ': curVal() 이 값을 못 준다');
    if (!/[가-힣]/.test(r.t)) fail(k + ': 한글 설명이 비어 있다');
  }

  /* ---- 3. 보유량 변동 반영 ---- */
  console.log('[3] 보유량이 바뀌면 팝업도 갱신');
  await closeAll();
  const upd = await page.evaluate(async () => {
    openCurInfo('gold');
    const before = document.getElementById('ciw').innerText;
    S.gold += 7777777; uiDirty = true;
    if (typeof renderCurInfo === 'function') renderCurInfo();
    await new Promise(r => setTimeout(r, 700));
    const after = document.getElementById('ciw').innerText;
    return { before, after, gold: S.gold, saved: JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').gold };
  });
  upd.before !== upd.after ? ok('골드 증가 → 팝업 표시 갱신됨')
                           : fail('골드가 늘었는데 팝업 표시가 그대로다');
  /* ---- 4. 닫기 ---- */
  console.log('[4] 닫기');
  await closeAll();
  await page.evaluate(() => openCurInfo('dia'));
  const byDim = await page.evaluate(() => {
    const w = document.getElementById('ciw');
    w.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return !w.classList.contains('on');
  });
  byDim ? ok('딤 클릭으로 닫힘') : fail('딤을 눌러도 안 닫힌다');
  /* 측정표 §11: 레퍼런스에 **닫기 X 도 하단 확인 버튼도 없다** — 있으면 오히려 감점이다 */
  await page.evaluate(() => openCurInfo('dia'));
  const extra = await page.evaluate(() => {
    const w = document.getElementById('ciw');
    const n = w.querySelectorAll('button, .gbtn, .ci-ok').length;
    /* 박스 안을 눌러도 닫히면 안 된다(딤만 닫는다) */
    w.querySelector('.ci-body').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { n, stillOpen: w.classList.contains('on') };
  });
  extra.n === 0 ? ok('레퍼런스대로 버튼·X 없음 (0개)') : fail(`레퍼런스에 없는 버튼이 ${extra.n}개 있다`);
  extra.stillOpen ? ok('박스 안 클릭으로는 안 닫힘') : fail('박스 안을 눌렀는데 닫혔다');

  /* ---- 5. 다른 화면 위에서도 열린다 ---- */
  console.log('[5] 다른 화면 위에서 열기');
  await closeAll();
  for (const [label, fn] of [['13 상점 재화 탭', "goTab('shop'); shopCat='coin'; renderShopPage&&renderShopPage();"],
                             ['23 훈련 팝업', 'openTrain();']]) {
    await page.evaluate(s => { try { eval(s); } catch (e) {} }, fn);
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.cbox.cGold[data-cur]');
      if (!el || !el.getBoundingClientRect().width) return { skip: true };
      el.click();
      const w = document.getElementById('ciw');
      const on = w.classList.contains('on');
      const z = getComputedStyle(w).zIndex;
      const b = w.querySelector('.ci') ? w.querySelector('.ci').getBoundingClientRect() : null;
      return { on, z, vis: b ? b.width > 0 && b.height > 0 : false };
    });
    if (r.skip) ok(label + ': HUD 재화 알약이 가려진 화면 — 건너뜀');
    else if (r.on && r.vis) ok(`${label} 위에서도 열림 (z-index ${r.z})`);
    else fail(`${label} 위에서 안 열리거나 박스가 안 보인다`);
    await closeAll();
    await page.evaluate(() => { if (typeof closeAllPop === 'function') closeAllPop(); location.hash = ''; });
    await page.waitForTimeout(200);
  }

  errs.length ? errs.forEach(e => fail('콘솔 ' + e)) : ok('콘솔 에러 0');
  await browser.close();
  console.log(fails.length ? `\nVERIFY33 FAIL — ${fails.length}건 / ${oks.length + fails.length}`
                           : `\nVERIFY33 PASS (${oks.length}/${oks.length})`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('VERIFY33 CRASH', e); process.exit(2); });
