/* 작업 283 (구 276ⓑ — 281 이 번호를 옮겼다) — «일괄 강화 가능» 레드닷을 «세 자리» 전부에 (T1 버그, 저장소 주인 보고 2026-08-27)
 *   (지시서 [3]-(가): 레퍼런스 대조가 아니라 «상태 → 화면» 동작 검사. 비평가 없음)
 *
 *   node tools/verify283.js
 *
 * 주인 보고: «일괄 강화 레드닷이 «장비 탭» 한 곳에만 뜬다 — 탭 · 해당 장비(카드/버튼) ·
 *             그 일괄 강화 버튼 **셋 다** 떠야 함».
 *
 * 202 는 ① 탭(탭바 «영웅» + 서브탭) 까지만 켰다 — ②③ 은 배지 «노드» 자체가 없었다.
 * 이 게이트가 못 박는 것
 *   §1 부품  — 세 자리(06 부위 슬롯 · 05/07/26 카드 · 세 시트의 [일괄 강화] 버튼)에 `.updot` 이 실제로 그려진다
 *   §2 동시  — «세 자리 동시 점등»: 한 상태에서 탭바 영웅 · 서브탭 · 카드 · 버튼이 **같이** 켜진다
 *   §3 일치  — 카드 레드닷 = `canLevel` 전수 일치(스킬·펫·무기 격자 · 06 부위 슬롯)
 *   §4 소등  — 재료 0 이면 «보이는» `.updot` 0개 / [일괄 강화]를 누른 직후 같은 흐름에서 즉시 꺼짐
 *   §5 틱    — 06 부위 슬롯 배지가 renderUI 0.35s 틱마다 재생성되지 않는다(jzDotIn 무한 재시작 방지)
 *   §6 음성항 — 처방을 «파일에서» 되돌린 사본을 새로 열면 서로 다른 절이 빨개진다(LESSONS 191)
 *
 * 판정은 클래스 이름이 아니라 **`getBoundingClientRect()` 로 «보이는가»** 로 한다
 * (166 교훈: `.alert` 가 붙어도 CSS 특이성에 져서 안 보이는 배지가 있었다).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
/* 313 — CRLF 체크아웃(Windows autocrlf)에서 `\n` 리터럴 치환이 전부 빗나가 N1~N3 이 헛돌았다.
   앵커·가드 리터럴이 전부 LF 기준이므로 읽을 때 정규화한다(사본 실행에는 영향 없음). */
const SRC  = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const TMP  = path.join(ROOT, '.v283-neg.html');
const URL  = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (got === undefined ? '' : '  [' + got + ']')); };

/* 페이지 안에 심는 공용 헬퍼 */
const HELPERS = () => {
  /* 배지가 «보이는가» — display 뿐 아니라 실제 상자까지(166 관례).
     ⚠ 켜질 때 60 쥬시 `jzDotIn`(.3s, scale 0→1.3→1)을 타므로 **연출이 끝난 뒤** 재야 한다. */
  window.__seen = sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return getComputedStyle(el).display !== 'none' && r.width > 0 && r.height > 0;
  };
  window.__seenN = sel => [...document.querySelectorAll(sel)]
    .filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).length;
  window.__fill = (name, n) => {
    ({ EQUIPS, SKILLS, PETS })[name].forEach(it => { S.own[it.id] = { l: 1, n: n }; });
    markDirty(); uiDirty = true; save(); renderUI();
  };
  /* 도감 3종 조건을 꺼서 탭바 «영웅» 칸이 이 작업 단독으로 움직이게 한다(202 관례) */
  window.__collOff = () => { COLL_SETS.forEach(st => { S.coll[st.key] = COLL_MAX_STEP; }); };
  window.__allUp = () => { S.gold = 1e18; window.__fill('EQUIPS', 1e12); window.__fill('SKILLS', 1e12); window.__fill('PETS', 1e12); window.__collOff(); uiDirty = true; renderUI(); };
  window.__none  = () => { window.__fill('EQUIPS', 0); window.__fill('SKILLS', 0); window.__fill('PETS', 0); window.__collOff(); uiDirty = true; renderUI(); };
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(HELPERS);

  const keysBefore = await page.evaluate(() => Object.keys(S).sort().join(','));
  const seen = s => page.evaluate(x => window.__seen(x), s);
  const nseen = s => page.evaluate(x => window.__seenN(x), s);

  /* ================= §1 부품 — 세 자리에 배지 노드가 «그려지는가» ================= */
  console.log('\n§1 부품 — ② 카드·진입 버튼 · ③ [일괄 강화] 버튼 자체에 `.updot` 이 그려진다');

  await page.evaluate(() => { window.__allUp(); goTab('hero'); heroSubGo('eq'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  ok(await seen('#eqCards .eqsl.alert>.updot'),
    '[06 부위 슬롯] 05 로 가는 유일한 진입 버튼에 레드닷 — 보인다');
  ok(await nseen('#eqCards .eqsl.alert>.updot') === 3,
    '[06 부위 슬롯] 세 부위(무기·방패·목걸이) 전부', await nseen('#eqCards .eqsl.alert>.updot'));

  await page.evaluate(() => openWeapon(null, 'weapon'));
  await page.waitForTimeout(600);
  ok(await seen('#wpnGrid .wgc.alert>.updot'), '[05 무기 격자] 강화 가능한 카드에 레드닷 — 보인다');
  ok(await seen('#wpnBtnUp>.updot'),           '[05 [일괄 강화] 버튼] 버튼 «자체» 에 레드닷 — 보인다');

  await page.evaluate(() => { closeWeapon(); heroSubGo('sk'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  ok(await seen('#bSk .sk-card.alert>.updot'), '[07 스킬 카드] 강화 가능한 카드에 레드닷 — 보인다');
  ok(await seen('#bSk [data-skup]>.updot'),    '[07 [일괄 강화] 버튼] 버튼 자체에 레드닷 — 보인다');

  await page.evaluate(() => { heroSubGo('pet'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  ok(await seen('#bPet .sk-card.alert>.updot'), '[26 펫 카드] 강화 가능한 카드에 레드닷 — 보인다');
  ok(await seen('#bPet [data-ptup]>.updot'),    '[26 [일괄 강화] 버튼] 버튼 자체에 레드닷 — 보인다');

  /* ── §1b 잘림·겹침 — 배지가 «잘리는 상자» 안에 온전히 들어가고, 이미 있는 것과 안 겹친다 ──
     실측으로 셋 다 부딪혔다: `.sk-card` 우상단은 272 해제 뱃지(`.sk-eq`) 자리 · `.wgc` 우상단은
     `Lv.n` 자리(611 이 Lv 를 좌상단 거울로 옮겨 코너를 닷에게 줬다 — 이 겹침 자는 그 되돌림도
     잡는다) · `.eqsl` 좌상단 바깥은 부위 뱃지(`.eqbd`) 자리. */
  console.log('\n§1b 잘림·겹침 — 잘리는 상자 안에 온전히 · 기존 요소와 0 겹침');
  await page.evaluate(() => {
    window.__clip = sel => {
      const e = document.querySelector(sel);
      if (!e) return 'NONODE';
      const r = e.getBoundingClientRect();
      let n = e.parentElement;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if (s.overflow !== 'visible' && s.overflowX !== 'visible') {
          const c = n.getBoundingClientRect();
          /* 잘리는 첫 조상 안에 배지 상자가 온전히 들어가는가(반올림 1px 여유) */
          return (r.left >= c.left - 1 && r.right <= c.right + 1
               && r.top >= c.top - 1 && r.bottom <= c.bottom + 1)
            ? 'ok' : 'CLIPPED by ' + (n.id ? '#' + n.id : '.' + String(n.className).split(' ')[0]);
        }
        n = n.parentElement;
      }
      return 'ok';
    };
    window.__hit = (a, b) => {
      const x = document.querySelector(a), y = document.querySelector(b);
      if (!x || !y) return 'NONODE';
      const p = x.getBoundingClientRect(), q = y.getBoundingClientRect();
      return (p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top) ? 'ok' : 'OVERLAP';
    };
  });
  for (const [n, sel] of [
    ['06 부위 슬롯', '#eqCards .eqsl.alert>.updot'],
    ['07 스킬 카드', '#bSk .sk-card.alert>.updot'],
    ['07 [일괄 강화]', '#bSk [data-skup]>.updot'],
    ['26 펫 카드', '#bPet .sk-card.alert>.updot'],
  ]) ok((await page.evaluate(s => window.__clip(s), sel)) === 'ok',
        '[' + n + '] 잘리는 조상 안에 온전히 들어간다', await page.evaluate(s => window.__clip(s), sel));

  await page.evaluate(() => { heroSubGo('eq'); openWeapon(null, 'weapon'); });
  await page.waitForTimeout(600);
  for (const [n, sel] of [
    ['05 무기 카드', '#wpnGrid .wgc.alert>.updot'],
    ['05 [일괄 강화]', '#wpnBtnUp>.updot'],
  ]) ok((await page.evaluate(s => window.__clip(s), sel)) === 'ok',
        '[' + n + '] 잘리는 조상 안에 온전히 들어간다', await page.evaluate(s => window.__clip(s), sel));
  ok((await page.evaluate(() => window.__hit('#wpnGrid .wgc.alert>.updot', '#wpnGrid .wgc.alert>.lv'))) === 'ok',
    '[05 무기 카드] 배지가 `Lv.n`(611 이후 좌상단) 과 안 겹친다');
  ok((await page.evaluate(() => window.__hit('#eqCards .eqsl.alert>.updot', '#eqCards .eqbd'))) === 'ok',
    '[06 부위 슬롯] 배지가 부위 뱃지 `.eqbd`(좌상단) 와 안 겹친다');

  await page.evaluate(() => { closeWeapon(); heroSubGo('sk'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  ok((await page.evaluate(() => window.__hit('#bSk .sk-card.alert>.updot', '#bSk .sk-card.alert>.sk-eq'))) === 'ok',
    '[07 스킬 카드] 배지가 272 해제 뱃지 `.sk-eq`(우상단) 와 안 겹친다');
  ok((await page.evaluate(() => window.__hit('#bSk .sk-card.alert>.updot', '#bSk .sk-card.alert>.sk-clv'))) === 'ok',
    '[07 스킬 카드] 배지가 `Lv.n`(`.sk-clv`) 과 안 겹친다');

  /* ================= §2 «세 자리 동시 점등» ================= */
  console.log('\n§2 «세 자리 동시 점등» — ① 탭 · ② 카드/진입 버튼 · ③ [일괄 강화] 버튼이 한 상태에서 같이');

  /* (a) 스킬 계열만 켜고 본다 — 세 자리가 같은 조건 하나(`SKILLS.some(canLevel)`)를 공유하는지 */
  await page.evaluate(() => { window.__none(); window.__fill('SKILLS', 1e12); heroSubGo('sk'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  const trio = await page.evaluate(() => ({
    tab:  document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
    stab: window.__seenN(':is(#bSk,#bPet,#bCos) .stab[data-upk="sk"] .bdg') > 0,
    card: window.__seenN('#bSk .sk-card.alert>.updot') > 0,
    btn:  window.__seen('#bSk [data-skup]>.updot'),
    /* 같은 상태에서 «펫» 쪽은 전부 꺼져 있어야 한다 — 계열이 안 섞인다 */
    petStab: window.__seenN(':is(#bSk,#bPet,#bCos) .stab[data-upk="pet"] .bdg'),
  }));
  ok(trio.tab && trio.stab && trio.card && trio.btn,
    '[스킬] ① 탭바 영웅 + 서브탭 · ② 카드 · ③ 버튼 — 네 자리 동시 점등',
    'tab=' + trio.tab + ' stab=' + trio.stab + ' card=' + trio.card + ' btn=' + trio.btn);
  ok(trio.petStab === 0, '[계열 분리] 스킬만 가능한 상태에서 «펫» 서브탭은 꺼짐', trio.petStab);

  /* (b) 장비 계열 — 06 진입 슬롯과 05 팝업까지 한 사슬로 이어지는지 */
  await page.evaluate(() => { window.__none(); window.__fill('EQUIPS', 1e12); heroSubGo('eq'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  const chain = await page.evaluate(() => {
    const r = {
      tab:  document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
      stab: window.__seenN('#eqTabs .stab[data-upk="eq"] .bdg') > 0,
      slot: window.__seenN('#eqCards .eqsl.alert>.updot'),
    };
    openWeapon(null, 'weapon');
    return r;
  });
  await page.waitForTimeout(600);
  const chain2 = await page.evaluate(() => ({
    card: window.__seenN('#wpnGrid .wgc.alert>.updot') > 0,
    btn:  window.__seen('#wpnBtnUp>.updot'),
  }));
  ok(chain.tab && chain.stab && chain.slot > 0 && chain2.card && chain2.btn,
    '[장비] 탭바 영웅 → 서브탭 «장비» → 06 부위 슬롯 → 05 카드 → 05 [일괄 강화] — 사슬 전 구간 점등',
    'tab=' + chain.tab + ' stab=' + chain.stab + ' slot=' + chain.slot + ' card=' + chain2.card + ' btn=' + chain2.btn);

  /* ================= §3 조건 일치 — `canLevel` 전수 ================= */
  console.log('\n§3 조건 일치 — 카드 레드닷은 «그 항목이 지금 강화되나»(`canLevel`) 와 한 자도 안 어긋난다');

  /* 절반만 강화 가능하게 만든다 — «전부 켜짐/전부 꺼짐» 이면 일치가 공짜로 성립한다 */
  await page.evaluate(() => {
    window.__none();
    SKILLS.forEach((it, i) => { S.own[it.id] = { l: 1, n: i % 2 ? 1e12 : 0 }; });
    PETS.forEach((it, i)   => { S.own[it.id] = { l: 1, n: i % 3 ? 1e12 : 0 }; });
    EQUIPS.forEach((it, i) => { S.own[it.id] = { l: 1, n: i % 2 ? 1e12 : 0 }; });
    markDirty(); uiDirty = true; save(); heroSubGo('sk'); renderUI();
  });
  await page.waitForTimeout(700);
  const skMatch = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#bSk .sk-card[data-skit]')];
    const bad = cards.filter(c => canLevel(SK[c.dataset.skit]) !== !!c.querySelector('.updot'));
    return { n: cards.length, bad: bad.length, on: cards.filter(c => c.querySelector('.updot')).length };
  });
  ok(skMatch.n > 0 && skMatch.bad === 0 && skMatch.on > 0 && skMatch.on < skMatch.n,
    '[07 스킬 카드] 전수 일치 (섞인 상태 — 켜짐도 꺼짐도 있다)',
    skMatch.n + '장 중 켜짐 ' + skMatch.on + ' · 불일치 ' + skMatch.bad);

  await page.evaluate(() => { heroSubGo('pet'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  const ptMatch = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#bPet .sk-card[data-ptit]')];
    const bad = cards.filter(c => canLevel(PT[c.dataset.ptit]) !== !!c.querySelector('.updot'));
    return { n: cards.length, bad: bad.length, on: cards.filter(c => c.querySelector('.updot')).length };
  });
  ok(ptMatch.n > 0 && ptMatch.bad === 0 && ptMatch.on > 0 && ptMatch.on < ptMatch.n,
    '[26 펫 카드] 전수 일치 (섞인 상태)', ptMatch.n + '장 중 켜짐 ' + ptMatch.on + ' · 불일치 ' + ptMatch.bad);

  await page.evaluate(() => { heroSubGo('eq'); openWeapon(null, 'weapon'); });
  await page.waitForTimeout(600);
  const wpMatch = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#wpnGrid .wgc[data-wpn]')];
    const bad = cards.filter(c => canLevel(EQ[c.dataset.wpn]) !== !!c.querySelector('.updot'));
    return { n: cards.length, bad: bad.length, on: cards.filter(c => c.querySelector('.updot')).length };
  });
  ok(wpMatch.n > 0 && wpMatch.bad === 0 && wpMatch.on > 0 && wpMatch.on < wpMatch.n,
    '[05 무기 격자] 전수 일치 (섞인 상태)', wpMatch.n + '칸 중 켜짐 ' + wpMatch.on + ' · 불일치 ' + wpMatch.bad);

  /* 06 진입 슬롯 — «그 부위에 강화 가능한 장비가 있나» 와 일치 */
  await page.evaluate(() => {
    closeWeapon();
    /* 무기 부위만 켠다 — 부위별 판정이 실제로 갈리는지 본다 */
    EQUIPS.forEach(it => { S.own[it.id] = { l: 1, n: it.slot === 'weapon' ? 1e12 : 0 }; });
    markDirty(); uiDirty = true; save(); heroSubGo('eq'); renderUI();
  });
  await page.waitForTimeout(700);
  const slMatch = await page.evaluate(() => {
    const sl = [...document.querySelectorAll('#eqCards .eqsl[data-eqslot]')];
    const bad = sl.filter(c => EQUIPS.some(e => e.slot === c.dataset.eqslot && canLevel(e)) !== !!c.querySelector('.updot'));
    return { n: sl.length, bad: bad.length, on: sl.filter(c => c.querySelector('.updot')).length };
  });
  ok(slMatch.n === 3 && slMatch.bad === 0 && slMatch.on === 1,
    '[06 부위 슬롯] 부위별로 갈린다 — 무기만 켜짐',
    slMatch.n + '칸 중 켜짐 ' + slMatch.on + ' · 불일치 ' + slMatch.bad);

  /* ================= §4 소등 ================= */
  console.log('\n§4 소등 — 재료 0 / [일괄 강화]를 «누른 직후»');

  await page.evaluate(() => { window.__none(); heroSubGo('eq'); openWeapon(null, 'weapon'); });
  await page.waitForTimeout(600);
  ok(await nseen('.updot') === 0, '[재료 0] «보이는» 레드닷 0개 (05 팝업 · 06 시트 동시)', await nseen('.updot'));
  await page.evaluate(() => { closeWeapon(); heroSubGo('sk'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  ok(await nseen('.updot') === 0, '[재료 0] 07 스킬 시트에서도 0개', await nseen('.updot'));

  /* 누른 «직후» — 0.35s 틱을 기다리지 않고 같은 동기 흐름에서 꺼진다(202 §4 와 같은 요구) */
  await page.evaluate(() => { window.__none(); window.__fill('SKILLS', 1e12); heroSubGo('sk'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => ({
    card: window.__seenN('#bSk .sk-card.alert>.updot'), btn: window.__seen('#bSk [data-skup]>.updot'),
  }));
  ok(before.card > 0 && before.btn, '[전] 07 카드 ' + before.card + '장 + 버튼 레드닷 켜짐');
  const after = await page.evaluate(() => {
    document.querySelector('#bSk [data-skup]').click();
    return {
      up: SKILLS.filter(canLevel).length,
      card: document.querySelectorAll('#bSk .sk-card.alert>.updot').length,
      btn:  !!document.querySelector('#bSk [data-skup]>.updot'),
      tab:  document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
    };
  });
  ok(after.up === 0, '[후] 강화 가능 0개 (일괄 강화가 재료를 다 썼다)');
  ok(after.card === 0, '[후] 카드 레드닷 — 같은 흐름 안에서 즉시 꺼짐', after.card);
  ok(after.btn === false, '[후] [일괄 강화] 버튼 레드닷 — 같은 흐름 안에서 즉시 꺼짐');
  ok(after.tab === false, '[후] 탭바 «영웅» 레드닷도 같이 꺼짐 (202 회귀)');

  /* ================= §5 06 슬롯 배지가 매 틱 재생성되지 않는다 ================= */
  console.log('\n§5 06 부위 슬롯 — renderUI 0.35s 틱마다 노드를 갈아끼우지 않는다(jzDotIn 무한 재시작 방지)');
  await page.evaluate(() => { closeModal(); window.__allUp(); heroSubGo('eq'); uiDirty = true; renderUI(); });
  await page.waitForTimeout(900);
  const kept = await page.evaluate(async () => {
    const el = document.querySelector('#eqCards .eqsl.alert>.updot');
    if (!el) return { live: false, w: [] };
    const w = [];
    for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, 300)); w.push(Math.round(el.getBoundingClientRect().width)); }
    return { live: document.contains(el), w };
  });
  ok(kept.live, '[노드 유지] 1.5초(틱 4회) 뒤에도 같은 배지 노드가 DOM 에 살아 있다');
  /* 살아 있으면 등장 연출(1.3배)이 다시 안 돈다 — 남는 흔들림은 공용 맥박(jzDotPulse 1.14)뿐 */
  ok(kept.w.length === 5 && kept.w.every(v => v >= 26 && v <= 32),
    '[크기 안정] 폭이 27±(맥박 1.14) 안에 머문다 — 등장 연출 재시작 없음', kept.w.join(','));

  ok((await page.evaluate(() => Object.keys(S).sort().join(','))) === keysBefore,
    '[저장 구조] S 최상위 키 불변 (마이그레이션 불필요)');
  ok(errs.length === 0, '콘솔·런타임 에러 0건', errs.slice(0, 3).join(' | '));
  await browser.close();

  /* ================= §6 음성항 — 파일에서 되돌린 «사본을 새로 열어» 잰다 ================= */
  console.log('\n§6 음성항 — 처방을 하나씩 되돌리면 서로 다른 절이 빨개진다 (LESSONS 191)');

  const PAIR_SHEET = '  :is(#bSk,#bPet,#bCos) .updot{display:none}\n' +
                     '  :is(#bSk,#bPet,#bCos) .alert>.updot{display:block}\n';
  const PAIR_WPN   = '  #wpnw .updot{display:none}\n' +
                     '  #wpnw .alert>.updot{display:block}\n';
  const GUARD_NOW  = '  const ec = $(\'eqCards\');\n  if(ec.__bh !== h){ ec.innerHTML = h; ec.__bh = h; }\n';
  const GUARD_OFF  = '  const ec = $(\'eqCards\');\n  ec.innerHTML = h;\n';

  const withSrc = async (src, fn) => {
    fs.writeFileSync(TMP, src);
    const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
    const c = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await p.goto('file://' + TMP.replace(/\\/g, '/'));
    await p.waitForTimeout(900);
    await p.evaluate(HELPERS);
    try { return await fn(p); } finally { await b.close(); }
  };

  /* ⓐ 07 시트 카드 — `.alert` 를 «떼고» 본다(규약: 떼면 사라져야 한다) */
  const measSheet = p => p.evaluate(async () => {
    window.__allUp(); goTab('hero'); heroSubGo('sk'); renderUI();
    await new Promise(r => setTimeout(r, 600));
    const c = document.querySelector('#bSk .sk-card.alert>.updot');
    if (!c) return 'NONODE';
    c.parentElement.classList.remove('alert');
    return getComputedStyle(c).display !== 'none';
  });
  /* ⓑ 05 무기 팝업 카드 — 같은 방식 */
  const measWpn = p => p.evaluate(async () => {
    window.__allUp(); goTab('hero'); heroSubGo('eq'); openWeapon(null, 'weapon');
    await new Promise(r => setTimeout(r, 600));
    const c = document.querySelector('#wpnGrid .wgc.alert>.updot');
    if (!c) return 'NONODE';
    c.parentElement.classList.remove('alert');
    return getComputedStyle(c).display !== 'none';
  });
  /* ⓒ 06 슬롯 배지 노드가 틱마다 새로 생기는가 */
  const measTick = p => p.evaluate(async () => {
    window.__allUp(); goTab('hero'); heroSubGo('eq'); renderUI();
    await new Promise(r => setTimeout(r, 800));
    const el = document.querySelector('#eqCards .eqsl.alert>.updot');
    if (!el) return 'NONODE';
    await new Promise(r => setTimeout(r, 1200));
    return document.contains(el);
  });

  const base = await withSrc(SRC, async p => ({ a: await measSheet(p), b: await measWpn(p), c: await measTick(p) }));
  ok(base.a === false && base.b === false && base.c === true,
    '[기준선] 갈아 끼우지 않은 사본 — ⓐ ⓑ 새지 않음 · ⓒ 노드 유지',
    'a=' + base.a + ' b=' + base.b + ' c=' + base.c);

  /* ⚑ 531 이관 — 화면별 짝만 지운 사본은 «상시 점등» 이 안 된다. 531 이 깐 예방 짝(1,1,1)이
     `:is(#bSk,#bPet,#bCos) .updot`(1,1,0)·`#wpnw .updot` 의 뒤를 받치기 때문이다. 두 음성항의
     뜻(«이 두 줄이 실제로 일한다»)을 살리려면 사본에서 531 의 짝도 같이 빼야 한다.
     ⚠ 자를 자꾸 무르게 푸는 것처럼 보이지 않게 [N0] 이 «실제로 뺐다» 를 먼저 못박는다. */
  const { SRC_RE: RE531 } = require('./dot531');
  const noPair531 = src => src.replace(RE531, '');
  ok(noPair531(SRC) !== SRC && (SRC.match(RE531) || []).length === 2,
    '[N0 전제] 사본에서 531 예방 짝 2줄을 실제로 뺐다(이관)',
    (SRC.match(RE531) || []).length + '줄');

  const n1 = await withSrc(noPair531(SRC.replace(PAIR_SHEET, '')), async p => ({ a: await measSheet(p), b: await measWpn(p), c: await measTick(p) }));
  ok(n1.a === true && n1.b === false && n1.c === true,
    '[N1] `:is(#bSk,#bPet,#bCos) .updot` 스코프 짝 제거 → **07 시트만** 상시 점등(166 ⓔ 특이성 함정 부활)',
    'a=' + n1.a + ' b=' + n1.b + ' c=' + n1.c);

  const n2 = await withSrc(noPair531(SRC.replace(PAIR_WPN, '')), async p => ({ a: await measSheet(p), b: await measWpn(p), c: await measTick(p) }));
  ok(n2.a === false && n2.b === true && n2.c === true,
    '[N2] `#wpnw .updot` 스코프 짝 제거 → **05 팝업만** 상시 점등',
    'a=' + n2.a + ' b=' + n2.b + ' c=' + n2.c);

  const n3src = SRC.replace(GUARD_NOW, GUARD_OFF);
  ok(n3src !== SRC, '[N3 전제] renderEqPage 의 `__bh` 가드를 사본에서 실제로 되돌렸다');
  const n3 = await withSrc(n3src, async p => ({ a: await measSheet(p), b: await measWpn(p), c: await measTick(p) }));
  ok(n3.a === false && n3.b === false && n3.c === false,
    '[N3] `__bh` 가드 제거 → **06 슬롯 배지만** 틱마다 새 노드로 갈린다(등장 연출 무한 재시작)',
    'a=' + n3.a + ' b=' + n3.b + ' c=' + n3.c);

  try { fs.unlinkSync(TMP); } catch (_) {}
  console.log('\nVERIFY283 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
