/* 작업 202 — 버튼 상태색 확정 스펙 + «일괄 강화 가능» 레드닷 게이트
 *   (지시서 [3]-(가): 레퍼런스 대조가 아니라 «상태 → 화면» 동작 검사. 비평가 없음)
 *
 *   node tools/verify202.js
 *
 * 주인 지시(2026-08-27): «강화 가능한 거 있을 때 일괄 강화 초록, 장착 중은 회색, 장착 버튼은 초록.
 *                        일괄 강화 가능할 때 빨간점 알림».
 *
 * 이 게이트가 못 박는 것
 *   §1 [일괄 강화] — 세 시트(05 장비 · 07 스킬 · 26 펫)가 «가능=초록 / 0개=회색» 로 한 벌인지
 *   §2 [장착]/[착용] — 가능하면 **초록**(202 로 청록 폐기) · 라벨 «장착 중» 이면 **회색**
 *   §3 레드닷 — 일괄 강화 가능 → 탭바 «영웅» 칸 + 그 시트의 서브탭 칸에 «실제로 보이는» 배지
 *   §4 즉시 소등 — 일괄 강화를 «누르면» 0.35s 틱을 기다리지 않고 그 자리에서 꺼진다
 *   §5 훈련 제외 유지(166 판단) · 코스튬 칸에는 배지 없음 · 저장 구조 불변 · 콘솔 에러 0
 *   §6 음성항(되돌림 감지) — 조건을 무력화하면 위 단언이 «서로 다른 절에서» 빨개진다
 *
 * 판정은 클래스 이름이 아니라 **렌더된 면 색 + `getBoundingClientRect()` 로 «보이는가»** 로 한다
 * (166 교훈: `.alert` 가 붙어도 CSS 특이성에 져서 안 보이는 배지가 있었다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 렌더 면 색 — 그라디언트 첫 정지값으로 본다 */
const GREEN_SK = 'rgb(120, 243, 75)';    /* .sk-btn.ok        (#78F34B) */
const GRAY_SK  = 'rgb(168, 168, 168)';   /* .sk-btn.no        (#A8A8A8) */
const GREEN_W  = 'rgb(143, 220, 51)';    /* .wm-b*:not(.off)  (#8FDC33) */
const GRAY_W   = 'rgb(168, 168, 168)';   /* .wm-btn 기본      (#A8A8A8) */
const CYAN_OLD = 'rgb(68, 218, 239)';    /* 202 이전 «장착=청록»(#44DAEF) — 이제 어디에도 없어야 한다 */
const GREEN_U  = 'rgb(143, 220, 51)';    /* .sk-act .sk-e/.sk-u 활성(#8FDC33) */
const GRAY_U   = 'rgb(169, 169, 169)';   /* .sk-act .sk-e/.sk-u 회색(#A9A9A9) */

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 공용 헬퍼 — 면 색 · «눈에 보이는 배지» 판정 */
  await page.evaluate(() => {
    window.__face = sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el).backgroundImage : null; };
    /* 166 관례 — display 뿐 아니라 실제 상자 크기까지 본다(특이성에 진 배지를 잡기 위해) */
    window.__dotOn = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return getComputedStyle(el).display !== 'none' && r.width > 0 && r.height > 0;
    };
    /* 재료를 원하는 만큼만 채운다. list = 'EQUIPS' | 'SKILLS' | 'PETS' */
    window.__fill = (name, n) => {
      const L = { EQUIPS, SKILLS, PETS }[name];
      L.forEach(it => { S.own[it.id] = { l: 1, n: n }; });
      markDirty(); uiDirty = true; save(); renderUI();
    };
    window.__clearAll = () => {
      [EQUIPS, SKILLS, PETS].forEach(L => L.forEach(it => { delete S.own[it.id]; }));
      markDirty(); uiDirty = true; save(); renderUI();
    };
    window.__upN = name => ({ EQUIPS, SKILLS, PETS })[name].filter(canLevel).length;
    /* 영웅 서브탭 바는 **두 종류**다 — 06 장비 시트의 정적 `#eqTabs` 와 07·26·50 시트가
       `subTabs()` 로 매번 새로 그리는 바. 열려 있는 시트의 바만 화면에 있으므로 «칸이 켜졌나» 는
       호스트를 가리지 않고 **보이는 칸 전수**로 본다(166 관례 — display 가 아니라 실제 상자). */
    /* ⚠ 배지는 켜질 때 60 쥬시의 `jzDotIn`(.3s, scale 0 → 1) 을 탄다. `getBoundingClientRect()` 는
       transform 을 반영하므로 **첫 프레임에서 폭이 0** 이다 — 그것만 보면 «안 켜졌다» 로 오독한다.
       그래서 두 자를 따로 낸다: `disp`(규약 판정 = display 가 살아 있나) ·
       `painted`(연출이 끝난 뒤 실제로 27px 로 그려지나 — 166 의 «보이는 배지» 요구). */
    window.__dot = k => {
      const cells = [...document.querySelectorAll('.stab[data-upk="' + k + '"]')];
      const vis = cells.filter(c => c.getBoundingClientRect().width > 0);
      const on  = vis.filter(c => { const b = c.querySelector('.bdg');
        return b && getComputedStyle(b).display !== 'none'; });
      const painted = on.filter(c => c.querySelector('.bdg').getBoundingClientRect().width > 0);
      return { cells: cells.length, vis: vis.length, on: on.length, painted: painted.length };
    };
    /* 도감 조건(166)을 꺼 둔다 — 세트 «받은 단계» 를 상한까지 채우면 collReady 가 전부 거짓이다.
       S.coll = 0 으로 두면 아이템을 하나라도 보유하는 순간 도감이 켜져 «영웅 칸» 이
       202 와 무관한 이유로 빨개진다(§4·N2 가 실제로 여기 걸렸다). */
    window.__collOff = () => { COLL_SETS.forEach(st => { S.coll[st.key] = COLL_MAX_STEP; }); };
  });
  const face  = s => page.evaluate(x => window.__face(x), s);
  const dotOn = s => page.evaluate(x => window.__dotOn(x), s);

  /* 세이브 구조 스냅샷 — 이 작업은 저장 구조를 한 글자도 안 바꾼다 */
  const keysBefore = await page.evaluate(() => Object.keys(S).sort().join(','));

  /* ================= §1 [일괄 강화] — 세 시트가 한 벌 ================= */
  console.log('\n§1 [일괄 강화] «가능=초록 / 0개=회색» (05 장비 · 07 스킬 · 26 펫)');

  /* 재료를 잔뜩 넣는다 → 세 시트 전부 «가능» */
  await page.evaluate(() => { S.gold = 1e18; window.__fill('EQUIPS', 1e12); window.__fill('SKILLS', 1e12); window.__fill('PETS', 1e12); });
  await page.click('.tab[data-t="hero"]', { force: true });
  await page.waitForTimeout(350);

  /* 07 스킬 */
  await page.evaluate(() => document.querySelector('#eqTabs [data-eqtab="sk"]').click());
  await page.waitForTimeout(350);
  let bg = await face('#bSk [data-skup]');
  ok(!!bg && bg.includes(GREEN_SK), '[07 스킬 일괄 강화] 강화 가능 ' + (await page.evaluate(() => window.__upN('SKILLS'))) + '개 → 초록');

  /* 26 펫 */
  await page.evaluate(() => document.querySelector('#bSk [data-sktab="pet"]').click());
  await page.waitForTimeout(350);
  bg = await face('#bPet [data-ptup]');
  ok(!!bg && bg.includes(GREEN_SK), '[26 펫 일괄 강화] 강화 가능 ' + (await page.evaluate(() => window.__upN('PETS'))) + '개 → 초록');

  /* 05 장비(무기 팝업) */
  await page.evaluate(() => { openWeapon(null, 'weapon'); });
  await page.waitForTimeout(300);
  bg = await face('#wpnBtnUp');
  const upOff = await page.evaluate(() => document.getElementById('wpnBtnUp').classList.contains('off'));
  ok(!upOff && !!bg && bg.includes(GREEN_W), '[05 장비 일괄 강화] 강화 가능 → 초록');

  /* 재료를 0 으로 → 세 시트 전부 «불가» */
  await page.evaluate(() => { window.__fill('EQUIPS', 0); window.__fill('SKILLS', 0); window.__fill('PETS', 0); renderWpn(); });
  await page.waitForTimeout(300);
  bg = await face('#wpnBtnUp');
  ok(!!bg && bg.includes(GRAY_W), '[05 장비 일괄 강화] 0개 → 회색');
  await page.evaluate(() => { closeWeapon(); document.querySelector('#bPet [data-pttab="sk"]').click(); });
  await page.waitForTimeout(350);
  bg = await face('#bSk [data-skup]');
  ok(!!bg && bg.includes(GRAY_SK), '[07 스킬 일괄 강화] 0개 → 회색');
  await page.evaluate(() => document.querySelector('#bSk [data-sktab="pet"]').click());
  await page.waitForTimeout(350);
  bg = await face('#bPet [data-ptup]');
  ok(!!bg && bg.includes(GRAY_SK), '[26 펫 일괄 강화] 0개 → 회색');

  /* ================= §2 [장착]/[착용] — 초록 · «장착 중» 회색 ================= */
  console.log('\n§2 [장착]/[착용] — 가능=초록(202: 청록 폐기) · 라벨 «장착 중»=회색');
  const w = await page.evaluate(() => {
    /* 무기를 보유하되 «아직 안 낀» 것을 고른다 */
    EQUIPS.forEach(it => { S.own[it.id] = { l: 1, n: 0 }; });
    const list = EQUIPS.filter(e => e.slot === 'weapon');
    S.eqSlot.weapon = list[1] ? list[1].id : null;
    markDirty(); save(); openWeapon(list[0].id, 'weapon');
    const b = document.getElementById('wpnBtnEq');
    return { txt: b.textContent.trim(), off: b.classList.contains('off'), bg: getComputedStyle(b).backgroundImage };
  });
  await page.waitForTimeout(200);
  ok(w.txt === '장착' && !w.off && w.bg.includes(GREEN_W),
    '[05 장착] 보유 + 미장착 → 라벨 «' + w.txt + '» · 초록');
  ok(!w.bg.includes(CYAN_OLD), '[05 장착] 202 이전 청록(#44DAEF) 0건 — 되돌림 감지');

  const w2 = await page.evaluate(() => {
    const list = EQUIPS.filter(e => e.slot === 'weapon');
    S.eqSlot.weapon = list[0].id; markDirty(); save(); openWeapon(list[0].id, 'weapon');
    const b = document.getElementById('wpnBtnEq');
    return { txt: b.textContent.trim(), off: b.classList.contains('off'),
             bg: getComputedStyle(b).backgroundImage, col: getComputedStyle(b).color };
  });
  await page.waitForTimeout(200);
  ok(w2.txt === '장착 중' && w2.off && w2.bg.includes(GRAY_W),
    '[05 장착 중] 이미 장착 → 라벨 «' + w2.txt + '» · 회색 면');
  /* 202 ⓒ — 면만 회색이고 글자가 청록이면 «아직 되는 버튼» 으로 읽힌다(이번에 고친 자리) */
  ok(w2.col === 'rgb(223, 223, 223)',
    '[05 장착 중] 라벨색도 회색 #DFDFDF (측정 ' + w2.col + ') — 202 이전 #AAEFFF 폐기');

  /* 08 세부 팝업 [장착]/[해제] — `.sk-e` */
  const dtl = await page.evaluate(() => {
    SKILLS.forEach(it => { S.own[it.id] = { l: 1, n: 0 }; });
    S.eqSkill = []; markDirty(); save();
    showSkillDetail(SKILLS[0].id);
    const e = document.getElementById('mEq');
    return { txt: e.textContent.trim(), dis: e.disabled, bg: getComputedStyle(e).backgroundImage };
  });
  await page.waitForTimeout(200);
  ok(!dtl.dis && dtl.bg.includes(GREEN_U), '[08 세부 장착] 보유 + 미장착 → 초록 («' + dtl.txt + '»)');
  ok(!dtl.bg.includes(CYAN_OLD), '[08 세부 장착] 202 이전 청록 0건 — 되돌림 감지');

  const d2 = await page.evaluate(() => {
    closeModal && closeModal();
    S.own = {}; markDirty(); save();
    showSkillDetail(SKILLS[0].id);
    const e = document.getElementById('mEq');
    return { dis: e.disabled, bg: getComputedStyle(e).backgroundImage };
  });
  await page.waitForTimeout(200);
  ok(d2.dis && d2.bg.includes(GRAY_U), '[08 세부 장착] 미보유(=불가) → 회색 · 비활성');

  /* ================= §3 레드닷 — 탭바 영웅 + 서브탭 ================= */
  console.log('\n§3 «일괄 강화 가능» 레드닷 — 탭바 «영웅» 칸 + 장비/스킬/펫 서브탭');

  /* (0) 06 장비 시트를 연다(정적 `#eqTabs` 가 보이는 상태) + 아무것도 없게 만든다.
         도감 조건은 `__collOff()` 로 꺼서 영웅 칸이 «이 작업 단독» 으로 움직이게 한다. */
  await page.evaluate(() => {
    closeWeapon(); document.querySelector('#bSk [data-sktab="eq"]') ?
      document.querySelector('#bSk [data-sktab="eq"]').click() : heroSubGo('eq');
    window.__clearAll(); window.__collOff();
    markDirty(); uiDirty = true; save(); renderUI();
  });
  await page.waitForTimeout(350);
  const bar0 = await page.evaluate(() => window.__dot('eq'));
  ok(bar0.vis >= 1, '[전제] 06 장비 시트가 열려 서브탭 바가 실제로 보인다 (보이는 칸 ' + bar0.vis + '개)');
  ok(!(await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').classList.contains('alert'))),
    '[탭바 영웅] 강화 가능 0 · 도감 준비 0 → 꺼짐');
  for (const [k, n] of [['eq','장비'], ['sk','스킬'], ['pet','펫']]) {
    const dz = await page.evaluate(x => window.__dot(x), k);
    ok(dz.on === 0, '[서브탭 ' + n + '] 강화 가능 0 → 배지 안 보임 (보이는 칸 ' + dz.vis + ' · 켜짐 ' + dz.on + ')');
  }

  /* (1) 스킬만 가능하게 만든다 → 영웅 칸 + «스킬» 칸만 켜진다 */
  await page.evaluate(() => { window.__fill('SKILLS', 1e12); window.__collOff(); uiDirty = true; renderUI(); });
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('.tab[data-t="hero"]').classList.contains('alert')),
    '[탭바 영웅] 스킬 강화 가능 → 켜짐');
  let d = await page.evaluate(() => window.__dot('sk'));
  ok(d.on >= 1, '[서브탭 스킬] 켜짐 — «보이는» 배지 (' + d.on + '/' + d.vis + ')');
  ok((await page.evaluate(() => window.__dot('eq'))).on === 0, '[서브탭 장비] 스킬만 가능하므로 꺼짐 (칸 구분 확인)');
  ok((await page.evaluate(() => window.__dot('pet'))).on === 0, '[서브탭 펫] 스킬만 가능하므로 꺼짐 (칸 구분 확인)');

  /* (2) 장비·펫도 채운다 → 세 칸 전부. 여기서는 60 쥬시 등장(.3s)이 끝난 뒤 **실제로 27px 로
         그려지는지**(painted)까지 본다 — 166 의 «보이는 배지» 요구를 이 절이 대표한다. */
  await page.evaluate(() => { window.__fill('EQUIPS', 1e12); window.__fill('PETS', 1e12); window.__collOff(); uiDirty = true; renderUI(); });
  await page.waitForTimeout(500);
  for (const [k, n] of [['eq','장비'], ['sk','스킬'], ['pet','펫']]) {
    d = await page.evaluate(x => window.__dot(x), k);
    ok(d.on >= 1 && d.painted >= 1,
      '[서브탭 ' + n + '] 강화 가능 → 켜짐 · 실제로 그려짐 (' + d.painted + '/' + d.vis + ')');
  }

  /* (3) `subTabs()` 가 만드는 바(07 스킬 시트 안)도 같은 규약인가 — 정적 바와 두 종류다 */
  await page.evaluate(() => { document.querySelector('#eqTabs [data-eqtab="sk"]').click(); });
  await page.waitForTimeout(400);
  await page.waitForTimeout(500);
  const dPet = await page.evaluate(() => window.__dot('pet'));
  ok(dPet.vis >= 1 && dPet.painted >= 1,
    '[07 시트 서브탭 펫] subTabs() 생성 바에도 배지가 붙는다 (보이는 칸 ' + dPet.vis + ' · 그려짐 ' + dPet.painted + ')');
  ok(!(await page.$('#bSk .stab[data-upk="cos"]')),
    '[서브탭 코스튬] 배지 대상이 아니다 — 일괄 강화가 없는 칸엔 `data-upk` 자체가 없다');

  /* ================= §4 즉시 소등 ================= */
  console.log('\n§4 즉시 소등 — 일괄 강화를 누르면 0.35s 틱을 기다리지 않는다');
  /* 스킬만 가능하게 만들고, 누른 «직후»(rAF 한 틱) 를 잰다 */
  await page.evaluate(() => {
    window.__clearAll(); window.__fill('SKILLS', 1e12); window.__collOff();
    markDirty(); uiDirty = true; save(); renderUI();
  });
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => ({
    n: window.__upN('SKILLS'),
    tab: document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
    dot: window.__dot('sk').on,
    btn: getComputedStyle(document.querySelector('#bSk [data-skup]')).backgroundImage,
  }));
  ok(before.n > 0 && before.tab && before.dot >= 1 && before.btn.includes(GREEN_SK),
    '[전] 강화 가능 ' + before.n + '개 · 탭 켜짐 · 서브탭 배지 ' + before.dot + '개 · 버튼 초록');
  const after = await page.evaluate(() => {
    /* 일괄 강화는 세트 레벨을 올려 «도감 준비» 를 참으로 만든다(collReady = 받은 단계 < 세트 최저 Lv).
       그건 166 의 조건이고 이 절의 대상이 아니므로, 누르기 직전에 상한까지 채워 꺼 둔다.
       ⚠ `__collOff()` 는 클릭 «전» 에 부른다 — 클릭 뒤에 부르면 «같은 동기 흐름» 이 깨진다. */
    window.__collOff();
    document.querySelector('#bSk [data-skup]').click();     /* 09 결과 팝업이 뜬다 */
    /* 클릭 핸들러가 동기로 renderUI() 까지 마쳤는지 «같은 흐름 안에서» 읽는다 —
       0.35s 를 기다리는 것보다 엄격하다(230 선례). */
    return { n: window.__upN('SKILLS'), coll: collCatReady('skill'),
             tab: document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
             dot: window.__dot('sk').on,
             btn: getComputedStyle(document.querySelector('#bSk [data-skup]')).backgroundImage };
  });
  ok(after.n === 0, '[후] 강화 가능 0개 (일괄 강화가 재료를 다 썼다)');
  ok(!after.coll, '[전제] 도감 준비도 거짓 — 영웅 칸이 이 작업 단독으로 판정된다');
  ok(!after.tab, '[후] 탭바 «영웅» 레드닷 — 같은 흐름 안에서 즉시 꺼짐 (0.35s 대기 없음)');
  ok(after.dot === 0, '[후] 서브탭 «스킬» 배지 — 같은 흐름 안에서 즉시 꺼짐');
  ok(after.btn.includes(GRAY_SK), '[후] [일괄 강화] 버튼 — 같은 흐름 안에서 즉시 회색');
  await page.evaluate(() => { const u = document.getElementById('upw'); if (u) u.classList.remove('on'); });

  /* ================= §5 범위·불변 ================= */
  console.log('\n§5 범위(훈련 제외 유지) · 저장 구조 불변 · 에러 0');
  /* 166 판단 유지 — 훈련(골드)은 탭바 «성장» 칸에 올리지 않는다 */
  await page.evaluate(() => { S.gold = 1e18; markDirty(); uiDirty = true; save(); renderUI(); });
  await page.waitForTimeout(250);
  ok(!(await page.evaluate(() => document.querySelector('.tab[data-t="grow"]').classList.contains('alert'))),
    '[탭바 성장] 골드가 넘쳐도 꺼짐 — 166 의 «훈련은 상시 참이라 제외» 판단 유지');
  ok(await page.evaluate(() => document.querySelectorAll('.stab[data-upk]').length >= 3),
    '[호스트] `data-upk` 칸이 3개 이상 존재 (정적 #eqTabs + subTabs 생성분)');
  const keysAfter = await page.evaluate(() => Object.keys(S).sort().join(','));
  ok(keysBefore === keysAfter, '[저장 구조] S 최상위 키 불변 (마이그레이션 불필요)');

  /* ================= §6 음성항 — 되돌림 감지 ================= */
  console.log('\n§6 음성항 — 조건을 무력화하면 서로 다른 절이 빨개진다');
  /* N1 — `.alert` 를 손으로 떼면 배지가 사라진다(= 배지가 클래스에 실제로 매여 있다) */
  const n1 = await page.evaluate(() => {
    window.__fill('SKILLS', 1e12); window.__collOff(); uiDirty = true; renderUI();
    const c = [...document.querySelectorAll('.stab[data-upk="sk"]')]
      .find(x => x.getBoundingClientRect().width > 0);
    c.classList.remove('alert');
    const b = c.querySelector('.bdg');
    const off = getComputedStyle(b).display === 'none' || b.getBoundingClientRect().width === 0;
    renderUI();                                        /* 다시 켜지는지도 본다 */
    return { off, back: window.__dot('sk').on >= 1 };   /* 등장 연출 첫 프레임이라 painted 는 0 이 맞다 */
  });
  ok(n1.off, '[N1] `.alert` 제거 → 배지 사라짐 (CSS 가 클래스에 매여 있다 · 166 특이성 함정 회귀)');
  ok(n1.back, '[N1] renderUI() 한 번에 되돌아옴 (토글이 매 틱 다시 선다)');

  /* N2 — 재료만 1 모자라게 하면 «가능» 이 통째로 거짓이 된다 */
  const n2 = await page.evaluate(() => {
    window.__clearAll();
    SKILLS.forEach(it => { S.own[it.id] = { l: 1, n: fragNeed(1) - 1 }; });
    window.__collOff();
    markDirty(); uiDirty = true; save(); renderUI();
    return { n: window.__upN('SKILLS'),
             tab: document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
             dot: window.__dot('sk').on };
  });
  ok(n2.n === 0 && !n2.tab && n2.dot === 0,
    '[N2] 재료 «한 조각 부족» → 강화 가능 0 · 탭·서브탭 둘 다 꺼짐 (경계값)');

  /* N3 — 도감 조건만 켜면 탭바는 켜지되 서브탭 배지는 꺼진 채여야 한다(두 조건이 섞이지 않음) */
  const n3 = await page.evaluate(() => {
    COLL_SETS.forEach(st => { if (st.cat === 'skill') S.coll[st.key] = 0; });   /* 도감만 «받을 게 있음» 으로 */
    markDirty(); uiDirty = true; save(); renderUI();
    return { coll: collCatReady('skill'), up: window.__upN('SKILLS'),
             tab: document.querySelector('.tab[data-t="hero"]').classList.contains('alert'),
             dot: window.__dot('sk').on };
  });
  ok(n3.coll && n3.up === 0 && n3.tab && n3.dot === 0,
    '[N3] 도감만 준비됨 → 탭바 영웅은 켜지고 서브탭 배지는 꺼짐 (166 조건과 202 조건이 안 섞인다)');

  ok(errs.length === 0, '콘솔·런타임 에러 0건  ' + JSON.stringify(errs.slice(0, 3)));

  console.log('\nVERIFY202 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
