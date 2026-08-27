/* func272.js — 작업 272 «기능 체크 표» 하네스.  실행: node tools/func272.js
 *
 * verify272 는 합성 이벤트(`dispatchEvent`)로 로직을 본다. 여기서는 **실제 마우스 클릭**
 * (`page.mouse.click` → 60 쥬시의 pointerdown 캡처 리스너를 그대로 통과)으로
 * «눌렀을 때 무엇이 바뀌는지» 를 버튼별로 찍는다 — ROUTINE «기능 완성 규칙» 의 체크 표다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const rows = [];
let bad = 0;
const row = (btn, expect, got, ok) => { rows.push({ btn, expect, got, ok }); if (!ok) bad++; };

(async () => {
  const b = await launch(chromium);
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  const setup = (best, eqCount) => p.evaluate(([bs, n]) => {
    Object.assign(S, DEF());
    S.best = bs; S.stage = bs; S.own = {}; S.eqSkill = [];
    SKILLS.slice(0, 8).forEach(s => S.own[s.id] = { n: 3, l: 4 });
    SKILLS.slice(0, 8).forEach(s => { if (S.eqSkill.length < n) toggleEquip(s, 'skill'); });
    buildSlots(); uiDirty = true; renderUI(); gmHero('sk');
  }, [best, eqCount]);

  const clickSel = async sel => {
    const bx = await p.evaluate(s => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    if (!bx) return false;
    await p.mouse.click(bx.x, bx.y);
    await p.waitForTimeout(260);
    return true;
  };
  const eq = () => p.evaluate(() => S.eqSkill.slice());

  /* ① 슬롯 «본체» 실클릭 — 장착이 풀리면 안 된다(주인 보고 ②) */
  await setup(1, 1); await p.waitForTimeout(500);
  const before1 = await eq();
  await clickSel('#bSk .sk-slot[data-skslot] .sk-si');
  const afterIcon = await eq();
  row('07 슬롯 아이콘(실클릭)', '장착 유지 + 상세 팝업', JSON.stringify(afterIcon),
      afterIcon.join() === before1.join());
  const detail = await p.evaluate(() => {
    const m = document.querySelector('.modal.on, #itw.on, .mbox');
    return !!(m && m.offsetParent !== null);
  });
  row('07 슬롯 아이콘 → 상세', '세부 팝업이 뜬다', detail ? '떴다' : '안 뜸', !!detail);
  await p.evaluate(() => { try { gmCloseAll(); } catch (_) {} });
  await p.waitForTimeout(300);

  /* ② [─] 뱃지 실클릭 — 그때만 해제된다 */
  await setup(1, 1); await p.waitForTimeout(500);
  await clickSel('#bSk .sk-slot[data-skslot] .sk-eq.m');
  const afterMinus = await eq();
  row('07 [─] 뱃지(실클릭)', '그 스킬만 해제 → 0개', afterMinus.length + '개', afterMinus.length === 0);

  /* ③ 해금 상한 — 스테이지 1(2칸)에서 3번째 장착 시도 */
  await setup(1, 2); await p.waitForTimeout(400);
  const cap = await p.evaluate(() => {
    const third = SKILLS.slice(0, 8).find(s => !skillEquipped(s.id));
    toggleEquip(third, 'skill');
    return { len: S.eqSkill.length, note: (document.querySelector('#toast, .toast') || {}).textContent || '' };
  });
  row('상한 초과 장착', '2칸에서 막힘 + 안내', cap.len + '개', cap.len === 2);

  /* ④ 스테이지 돌파로 칸이 열린다 — 시트 · HUD 둘 다 */
  const grow = await p.evaluate(() => {
    S.best = 10; uiDirty = true; renderUI(); gmHero('sk'); drawSlots();
    return {
      open: skSlotMax(),
      sheetLock: document.querySelectorAll('#bSk .sk-slot.lock').length,
      sheetFree: document.querySelectorAll('#bSk .sk-slot.free').length,
      hudLock: document.querySelectorAll('#slots .slot2 .lk').length,
      note: (document.querySelector('#bSk .sk-slnote') || {}).textContent || ''
    };
  });
  row('스테이지 10 도달', '해금 4칸 · 자물쇠 4칸', grow.open + '칸 / 자물쇠 ' + grow.sheetLock,
      grow.open === 4 && grow.sheetLock === 4);
  row('HUD 슬롯 줄 동기화', 'HUD 자물쇠도 4', String(grow.hudLock), grow.hudLock === 4);
  row('슬롯 줄 아래 안내', '다음 칸 조건 표기', grow.note.trim(), /스테이지/.test(grow.note));

  /* ⑤ 26 펫 슬롯 — 빈 칸이 [+] 이고 본체 클릭으로 안 풀린다 */
  await p.evaluate(() => {
    Object.assign(S, DEF()); S.own = {}; S.eqPet = [];
    PETS.slice(0, 1).forEach(x => S.own[x.id] = { n: 0, l: 1 });
    toggleEquip(PETS[0], 'pet'); uiDirty = true; renderUI(); gmHero('pet');
  });
  await p.waitForTimeout(600);
  const petBefore = await p.evaluate(() => S.eqPet.slice());
  await clickSel('#bPet .sk-slot[data-ptslot] .sk-si');
  const petAfter = await p.evaluate(() => S.eqPet.slice());
  row('26 펫 슬롯 본체(실클릭)', '장착 유지', JSON.stringify(petAfter), petAfter.join() === petBefore.join());
  await p.evaluate(() => { try { gmCloseAll(); } catch (_) {} });
  await p.waitForTimeout(300);
  const petFree = await p.evaluate(() => {
    S.eqPet = []; uiDirty = true; renderUI(); gmHero('pet');
    return { free: document.querySelectorAll('#bPet .sk-slot.free').length,
             lock: document.querySelectorAll('#bPet .sk-slot.lock').length };
  });
  row('26 펫 빈 칸', '[+] 3칸 · 자물쇠 0', petFree.free + '/' + petFree.lock,
      petFree.free === 3 && petFree.lock === 0);

  row('콘솔·페이지 에러', '0건', String(errs.length), errs.length === 0);
  if (errs.length) console.log(errs.slice(0, 3).join('\n'));

  await b.close();
  console.log('\n| 버튼·조작 | 기대 | 실측 | 판정 |');
  console.log('|---|---|---|---|');
  rows.forEach(r => console.log('| ' + r.btn + ' | ' + r.expect + ' | ' + r.got + ' | ' + (r.ok ? '✅' : '❌') + ' |'));
  console.log('\nFUNC272 ' + (rows.length - bad) + '/' + rows.length + ' ' + (bad ? '✗ FAIL' : '✓ PASS'));
  process.exit(bad ? 1 : 0);
})();
