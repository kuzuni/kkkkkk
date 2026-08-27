/* verify272.js — 작업 272 회귀 게이트.  실행: node tools/verify272.js
 *
 * 저장소 주인 보고(2026-08-27) 3건을 그대로 단언으로 옮긴다.
 *   ① «스킬 장착부분이 Lock 표시가 되있는게 문제»
 *      → 자물쇠는 **미해금 칸에만**. 해금됐는데 비어 있는 칸은 [+] 자리(`.sk-slot.free` / `.slot2.free`).
 *   ② «"-" 표시 누른 게 아닌데 장착해제 되는 것도 문제»
 *      → 슬롯 본체를 눌러도 장착이 풀리지 않는다. 해제는 [─] 뱃지(`.sk-eq.m`) 하나뿐.
 *   ③ «스테이지 몇 되면 해금 된다는 그런 거»
 *      → `SK_SLOT_ST` 로 칸별 해금 스테이지. 최고 스테이지(`S.best`)가 오르면 칸이 열린다.
 *
 * ⚠ 원본(브랜치 `claude/skill-equip-lock-issue-xghw5z` 의 `verify222.js`)에는 ④ «버프류 스킬 폐지»
 *   절이 있었다. 그 지시는 **작업 193 이 이미 처리**했으므로 여기로 가져오지 않았다 —
 *   SKILLS 종수·등급 분포·`t:'buff'` 단언은 193 계열 게이트의 몫이다(272 는 슬롯만 본다).
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

  /* ---------------- [1] 해금 표 자체 ---------------- */
  const d1 = await p.evaluate(() => ({ slots: SK_SLOT_ST.slice() }));
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
    /* 263 — 「신규 획득 자동 채움」 자체가 폐지됐다(105 의 마지막 예외). 그래서 여기서 재는 것은
       «자동 채움도 상한을 지키나» 가 아니라 «자동 채움이 아예 없나» 다 — 6종을 새로 얻어도 0칸. */
    S.best = 1; S.eqSkill = []; S.own = {};                /* 해금 칸 2개가 **비어 있는** 상태 */
    S.dia = 1e12; S.guide.idx = 99;                        /* 가이드 배너 잠금(gmBlocked)을 풀어 둔다 */
    const ownB = Object.keys(S.own).length, cntB = S.cnt.sumSkill | 0;
    doSummon('skill', 10);                                 /* 실제 획득 경로로 돌린다 */
    /* ★ 음성항 방지 — 「0칸」 은 소환이 실패해도 참이다. 그래서 «소환이 실제로 돌았나»(횟수 +10)와
       «새 종이 실제로 들어왔나»(보유 증가)를 같이 들고 나간다. 미리 6종을 쥐여 주면 낮은 등급 풀이
       전부 중복이 되어 «신규 0종» 이 나온다 — 그래서 빈 보유에서 뽑는다. */
    return { cap2, cap4, fill: S.eqSkill.length,
             gained: Object.keys(S.own).length - ownB, drew: (S.cnt.sumSkill | 0) - cntB };
  });
  is('스테이지 1 에서는 2칸까지만 장착', d5.cap2, 2);
  is('스테이지 10 이면 4칸까지', d5.cap4, 4);
  is('263 — 신규 획득으로는 한 칸도 자동 장착되지 않는다', d5.fill, 0);
  yes('   ↑ 그 사이 소환이 실제로 돌았다(음성항 방지)', d5.drew === 10, '소환 횟수 +' + d5.drew);
  yes('   ↑ 그 사이 새 스킬이 실제로 들어왔다(음성항 방지)', d5.gained > 0, d5.gained + '종');

  /* ---------------- [5-2] 구 세이브 유예 — 이미 장착한 것은 빼앗지 않는다 ---------------- */
  const d52 = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.best = 1; S.own = {}; S.eqSkill = [];
    SKILLS.slice(0, 6).forEach(s => S.own[s.id] = { n: 0, l: 1 });
    S.eqSkill = SKILLS.slice(0, 6).map(s => s.id);        /* 구 세이브: 해금 칸(2)보다 많이 장착 */
    uiDirty = true; renderUI(); gmHero('sk');
    const kept = S.eqSkill.length;
    const eqd = document.querySelectorAll('#bSk .sk-slot[data-skslot]').length;
    const lock = document.querySelectorAll('#bSk .sk-slot.lock').length;
    const cap = skSlotCap();
    return { kept, eqd, lock, cap };
  });
  is('구 세이브 6개 장착 — 강제 해제 없음', d52.kept, 6);
  is('그 6칸은 장착 칸으로 그린다', d52.eqd, 6);
  is('나머지 2칸만 자물쇠', d52.lock, 2);
  is('표시용 상한도 6', d52.cap, 6);

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

  /* ---------------- [7] 26 펫 슬롯도 같은 규칙(자물쇠 폐지 · 해제는 [─]) ---------------- */
  const d7 = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.own = {}; S.eqPet = []; uiDirty = true; renderUI(); gmHero('pet');
    const q = s => [...document.querySelectorAll('#bPet ' + s)];
    return { free: q('.sk-slot.free').length, lock: q('.sk-slot.lock').length, slotUn: q('.sk-slot[data-ptun]').length };
  });
  is('펫 빈 칸 3개는 [+]', d7.free, 3);
  is('펫 슬롯 자물쇠 0', d7.lock, 0);
  is('펫 슬롯 본체에 해제 없음', d7.slotUn, 0);

  is('콘솔/페이지 에러 0건', errs.length, 0);
  if (errs.length) console.log(errs.slice(0, 3).join('\n'));

  await b.close();
  if (fails.length) { console.log('실패 항목:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  console.log('VERIFY272 ' + ok + '/' + tot + ' ' + (fails.length ? '✗ FAIL' : '✓ PASS'));
  process.exit(fails.length ? 1 : 0);
})();
