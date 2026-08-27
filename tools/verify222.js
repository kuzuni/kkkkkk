/* verify222.js — 작업 222 회귀 게이트.  실행: node tools/verify222.js
 *
 * 저장소 주인 보고(2026-08-27) 3건을 그대로 단언으로 옮긴다.
 *   ① «스킬 장착부분이 Lock 표시가 되있는게 문제»
 *      → 자물쇠는 **미해금 칸에만**. 해금됐는데 비어 있는 칸은 [+] 자리(`.sk-slot.free` / `.slot2.free`).
 *   ② «"-" 표시 누른 게 아닌데 장착해제 되는 것도 문제»
 *      → 슬롯 본체를 눌러도 장착이 풀리지 않는다. 해제는 [─] 뱃지(`.sk-eq.m`) 하나뿐.
 *   ③ «스테이지 몇 되면 해금 된다는 그런 거»
 *      → `SK_SLOT_ST` 로 칸별 해금 스테이지. 최고 스테이지(`S.best`)가 오르면 칸이 열린다.
 *   ④ «버프류 스킬은 없었으면 함»
 *      → `t:'buff'`·`sup:1` 스킬 0종.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let ok = 0, tot = 0;
const fails = [];
const is = (m, got, want) => { tot++; if (got === want) ok++; else fails.push(m + ' — 기대 ' + want + ' / 실측 ' + got); };
const yes = (m, c, note) => { tot++; if (c) ok++; else fails.push(m + (note ? ' — ' + note : '')); };

(async () => {
  const b = await launch(chromium);
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* ---------------- [1] 데이터 — 버프 스킬 폐지 ---------------- */
  const d1 = await p.evaluate(() => ({
    len: SKILLS.length,
    buff: SKILLS.filter(s => s.t === 'buff').map(s => s.id),
    sup: SKILLS.filter(s => s.sup).map(s => s.id),
    heal: SKILLS.filter(s => s.heal).map(s => s.id),
    slots: SK_SLOT_ST.slice(),
    dist: [0, 1, 2, 3, 4, 5].map(g => SKILLS.filter(s => s.g === g).length)
  }));
  is('SKILLS 24종 유지', d1.len, 24);
  is("t:'buff' 스킬", d1.buff.length, 0);
  is('보조(sup) 스킬', d1.sup.length, 0);
  is('즉시 회복(heal) 스킬', d1.heal.length, 0);
  is('등급 분포 [4,4,4,4,4,4]', JSON.stringify(d1.dist), '[4,4,4,4,4,4]');
  is('슬롯 해금 표 8칸', d1.slots.length, 8);
  yes('1칸은 처음부터 열려 있다', d1.slots[0] <= 1, 'SK_SLOT_ST[0]=' + d1.slots[0]);
  yes('해금 스테이지는 오름차순', d1.slots.every((v, i) => i === 0 || v >= d1.slots[i - 1]), JSON.stringify(d1.slots));

  /* ---------------- [2] 해금 규칙 ---------------- */
  const d2 = await p.evaluate(() => {
    const r = [];
    [1, 5, 10, 18, 30, 50, 80, 999].forEach(st => { S.best = st; r.push([st, skSlotMax()]); });
    S.best = 1;
    return r;
  });
  yes('스테이지 1 = 2칸', d2[0][1] === 2, '실측 ' + d2[0][1]);
  yes('최고 스테이지가 오를수록 칸이 는다', d2.every((x, i) => i === 0 || x[1] >= d2[i - 1][1]), JSON.stringify(d2));
  is('충분히 높은 스테이지 = 8칸', d2[7][1], 8);

  /* ---------------- [3] 07 스킬 시트 — 자물쇠는 미해금 칸에만 ---------------- */
  const d3 = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.own = { slash: { n: 0, l: 1 } }; S.eqSkill = ['slash']; S.best = 1;
    uiDirty = true; renderUI(); gmHero('sk');
    const q = s => [...document.querySelectorAll('#bSk ' + s)];
    return {
      open: skSlotMax(),
      eqd: q('.sk-slot[data-skslot]').length,
      free: q('.sk-slot.free').length,
      lock: q('.sk-slot.lock').length,
      lockTxt: q('.sk-slot.lock .sk-slk').map(e => e.textContent),
      freeLock: q('.sk-slot.free .sk-lock').length,
      eqLock: q('.sk-slot[data-skslot] .sk-lock').length,
      note: (document.querySelector('#bSk .sk-slnote') || {}).textContent || '',
      minus: q('.sk-slot[data-skslot] .sk-eq.m[data-skun]').length,
      slotUn: q('.sk-slot[data-skun]').length          /* 슬롯 본체에 해제가 걸려 있으면 > 0 */
    };
  });
  is('해금 칸 2 · 장착 1칸', d3.eqd, 1);
  is('해금된 빈 칸 = [+] 1칸', d3.free, 1);
  is('미해금 = 자물쇠 6칸', d3.lock, 6);
  is('[+] 칸에 자물쇠 없음', d3.freeLock, 0);
  is('장착 칸에 자물쇠 없음', d3.eqLock, 0);
  is('자물쇠 칸마다 해금 스테이지 표기', d3.lockTxt.length, 6);
  yes('표기는 St.n 꼴', d3.lockTxt.every(t => /^St\.\d+$/.test(t)), JSON.stringify(d3.lockTxt));
  yes('슬롯 줄 아래 해금 안내', /스테이지/.test(d3.note), d3.note);
  is('해제 뱃지는 장착 칸마다 1개', d3.minus, 1);
  is('슬롯 «본체» 에는 해제가 안 걸린다', d3.slotUn, 0);

  /* ---------------- [4] «- 를 안 눌렀는데 해제» 재현 ---------------- */
  const d4 = await p.evaluate(async () => {
    Object.assign(S, DEF());
    S.own = { slash: { n: 0, l: 1 } }; S.eqSkill = ['slash']; S.best = 1;
    uiDirty = true; renderUI(); gmHero('sk');
    const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const slot = document.querySelector('#bSk .sk-slot[data-skslot]');
    click(slot.querySelector('.sk-si'));                 /* 아이콘 */
    const afterIcon = S.eqSkill.slice();
    click(slot.querySelector('.sk-slv'));                /* Lv 라벨 */
    const afterLv = S.eqSkill.slice();
    click(slot);                                          /* 슬롯 배경 */
    const afterBody = S.eqSkill.slice();
    /* 이제 진짜 [─] */
    const m = document.querySelector('#bSk .sk-slot .sk-eq.m');
    click(m);
    return { afterIcon, afterLv, afterBody, afterMinus: S.eqSkill.slice() };
  });
  is('아이콘 탭 — 장착 유지', d4.afterIcon.join(), 'slash');
  is('Lv 라벨 탭 — 장착 유지', d4.afterLv.join(), 'slash');
  is('슬롯 배경 탭 — 장착 유지', d4.afterBody.join(), 'slash');
  is('[─] 탭 — 그때만 해제', d4.afterMinus.length, 0);

  /* ---------------- [5] 해금 칸 수가 장착 상한이다 ---------------- */
  const d5 = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.best = 1; S.own = {}; S.eqSkill = [];
    SKILLS.slice(0, 5).forEach(s => S.own[s.id] = { n: 0, l: 1 });
    SKILLS.slice(0, 5).forEach(s => toggleEquip(s, 'skill'));
    const cap2 = S.eqSkill.length;
    S.best = 10;                                          /* 4칸 */
    SKILLS.slice(0, 5).forEach(s => { if (!skillEquipped(s.id)) toggleEquip(s, 'skill'); });
    const cap4 = S.eqSkill.length;
    /* 자동 채움(새로 얻은 것)도 상한을 지킨다 */
    S.best = 1; S.eqSkill = []; S.own = {};
    SKILLS.slice(0, 6).forEach(s => S.own[s.id] = { n: 0, l: 1 });
    equipFillNew(SKILLS.slice(0, 6).map(s => s.id));
    return { cap2, cap4, fill: S.eqSkill.length };
  });
  is('스테이지 1 에서는 2칸까지만 장착', d5.cap2, 2);
  is('스테이지 10 이면 4칸까지', d5.cap4, 4);
  is('신규 획득 자동 채움도 해금 칸까지', d5.fill, 2);

  /* ---------------- [6] HUD 원형 슬롯 ---------------- */
  const d6 = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.own = { slash: { n: 0, l: 1 } }; S.eqSkill = ['slash']; S.best = 1;
    buildSlots();
    const low = {
      lock: document.querySelectorAll('#slots .slot2 .lk').length,
      free: document.querySelectorAll('#slots .slot2.free').length,
      plus: document.querySelectorAll('#slots .slot2.free .pl3').length,
      freeLk: document.querySelectorAll('#slots .slot2.free .lk').length
    };
    S.best = 999; drawSlots();                            /* 스테이지가 오르면 다시 그려야 한다 */
    const high = {
      lock: document.querySelectorAll('#slots .slot2 .lk').length,
      free: document.querySelectorAll('#slots .slot2.free').length
    };
    S.best = 1;
    return { low, high };
  });
  is('HUD — 미해금 6칸만 자물쇠', d6.low.lock, 6);
  is('HUD — 해금된 빈 칸 1개', d6.low.free, 1);
  is('HUD — 빈 칸에는 [+]', d6.low.plus, 1);
  is('HUD — [+] 칸에 자물쇠 없음', d6.low.freeLk, 0);
  is('스테이지가 오르면 자물쇠 0', d6.high.lock, 0);
  is('스테이지가 오르면 빈 칸 7개', d6.high.free, 7);

  /* ---------------- [7] 26 동료 슬롯도 같은 규칙(자물쇠 폐지 · 해제는 [─]) ---------------- */
  const d7 = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.own = {}; S.eqPet = []; uiDirty = true; renderUI(); gmHero('pet');
    const q = s => [...document.querySelectorAll('#bPet ' + s)];
    return { free: q('.sk-slot.free').length, lock: q('.sk-slot.lock').length, slotUn: q('.sk-slot[data-ptun]').length };
  });
  is('동료 빈 칸 3개는 [+]', d7.free, 3);
  is('동료 슬롯 자물쇠 0', d7.lock, 0);
  is('동료 슬롯 본체에 해제 없음', d7.slotUn, 0);

  is('콘솔/페이지 에러 0건', errs.length, 0);
  if (errs.length) console.log(errs.slice(0, 3).join('\n'));

  await b.close();
  if (fails.length) { console.log('실패 항목:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log('VERIFY222 ' + ok + '/' + tot + ' ' + (fails.length ? '✗ FAIL' : '✓ PASS'));
  process.exit(fails.length ? 1 : 0);
})();
