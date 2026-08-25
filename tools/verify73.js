/* 작업 73 회귀 게이트 — 가이드 미션 배너 개편(① 이동 ② 보상 체인 ③ 소환 차단 ④ 가격 통일).
   실행: node tools/verify73.js   → 마지막 줄이 `VERIFY73 n/n PASS` 여야 한다.

   본다:
     §1 ④ 가격 통일 — summonCost 4종이 10회 1,000 / 30회 3,000 이고 30회 = 10회×3.
                       펫·유물은 «현행 유지»(2,250 / 3,600) 그대로.
     §2 ④ 표시 = 실제 차감 — 10 상점 카드 3장의 `.cost` 표기와 실제 다이아 감소액이 같다.
     §3 ② 보상 체인 — 초기 다이아 ≥ 1,000 · 소환 미션 직전 미션 보상 ≥ 그 소환의 10연 값.
     §4 ③ 소환 차단 — 스킬 소환 미션 중 방어구 상자(유료·무료)를 눌러도 재화·카운터·무료횟수 불변 + 안내 팝업.
                       지정 상자는 정상 소환. 유물은 차단 안 함. 미션 완료 후 차단 해제.
     §5 ① 이동 — 미션 20개 전수. 배너를 누르면 각 미션의 목표 화면이 실제로 열린다.
     §6 배너 상태 — 미완이어도 커서 pointer · `[미션-n]` 라벨이 클릭을 배너로 흘린다 · 기하 불변.
     §7 세이브 — 수령 시 다이아가 실제로 늘고 localStorage 에 반영된다.
     §8 콘솔 에러 0 */
const { chromium } = require('playwright');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 미션 i 를 «현재 · 미완» 으로 만든다.
   ⚠ `localStorage.clear()` + reload 로는 초기화되지 않는다 — 아직 살아 있는 옛 페이지의 자동 save()
      가 지운 직후 다시 써 버려서, 앞 절에서 소환·장착한 결과가 그대로 로드된다(실제로 그렇게 났다).
      **메모리 상태 S 를 DEF() 로 직접 되돌린다** — 리로드 없이 확실하고 빠르다. */
const setMission = (p, i, mut) => p.evaluate(([i, mut]) => {
  gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  if (mut) eval(mut);
  S.guide.idx = i; S.guide.gv = GUIDE_V; S.guide.prog = -1;
  gmBase(GUIDE[i]);                       /* 지연 확정 — 델타형이면 지금 값이 기준선 */
  uiDirty = true; renderUI(); drawTuto();
}, [i, mut || '']);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(900);

  /* ── §1 가격 통일 ─────────────────────────────────────────────── */
  console.log('§1 ④ 가격 통일');
  const cost = await p.evaluate(() => {
    const o = {};
    ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'].forEach(k =>
      o[k] = { c1: summonCost(k, 1), c10: summonCost(k, 10), c30: summonCost(k, 30) });
    return o;
  });
  ['skill', 'weapon', 'shield', 'amulet'].forEach(k => {
    ok(cost[k].c10 === 1000, `${k} 10회 = 1,000 (실제 ${cost[k].c10})`);
    ok(cost[k].c30 === 3000, `${k} 30회 = 3,000 (실제 ${cost[k].c30})`);
    ok(cost[k].c30 === cost[k].c10 * 3, `${k} 30회 = 10회×3 (할인 없음)`);
  });
  ok(cost.pet.c10 === 2250 && cost.pet.c30 === 6750, `펫 가격 현행 유지 (${cost.pet.c10}/${cost.pet.c30})`);
  ok(cost.relic.c10 === 3600 && cost.relic.c30 === 10800, `유물 가격 현행 유지 (${cost.relic.c10}/${cost.relic.c30})`);

  /* ── §2 표시 = 실제 차감 ──────────────────────────────────────── */
  console.log('§2 ④ 상점 카드 표기 = 실제 차감액');
  const shown = await p.evaluate(() => {
    openShopPage();
    return [...document.querySelectorAll('#shopList .shp-card')].map((c, i) => ({
      box: SHOP_BOXES[i].b,
      c10: c.querySelector('.cbtn.b2 .cost').textContent.trim(),
      c30: c.querySelector('.cbtn.b3 .cost').textContent.trim()
    }));
  });
  shown.forEach(s => ok(s.c10 === '1,000' && s.c30 === '3,000', `${s.box} 카드 표기 ${s.c10} / ${s.c30}`));
  for (const box of ['weapon', 'shield', 'skill']) {
    const r = await p.evaluate((box) => {
      S.dia = 99999; S.guide.idx = GUIDE.length;              /* 차단 해제 상태에서 순수 가격만 본다 */
      const before = S.dia, n0 = S.cnt.sumEquip + S.cnt.sumSkill;
      doSummon(box, 10);
      const paid10 = before - S.dia;
      const b2 = S.dia; doSummon(box, 30);
      return { paid10, paid30: b2 - S.dia, got: (S.cnt.sumEquip + S.cnt.sumSkill) - n0 };
    }, box);
    ok(r.paid10 === 1000 && r.paid30 === 3000 && r.got === 40,
      `${box} 실제 차감 ${r.paid10}/${r.paid30} · 획득 ${r.got}개`);
  }

  /* ── §3 보상 체인 ─────────────────────────────────────────────── */
  console.log('§3 ② 보상 체인');
  const chain = await p.evaluate(() => {
    const dia0 = DEF().dia;
    const rows = GUIDE.map((m, i) => ({ i, n: m.n, dia: gmDia(m), ban: m.ban || null }));
    return { dia0, rows };
  });
  ok(chain.dia0 >= 1000, `초기 다이아 ${chain.dia0} ≥ 1,000 (첫 미션 = 스킬 10연)`);
  chain.rows.forEach((r, i) => {
    const nx = chain.rows[i + 1];
    if (!nx || !nx.ban) return;
    ok(r.dia >= 1000, `«${r.n}» 보상 ${r.dia} ≥ «${nx.n}» 10연 1,000`);
  });
  ok(chain.rows.filter(r => r.ban).map(r => r.ban).join(',') === 'skill,weapon,shield',
    '소환 미션 3개에 ban(skill/weapon/shield) 부착');

  /* ── §4 소환 차단 ─────────────────────────────────────────────── */
  console.log('§4 ③ 소환 미션 중 다른 상자 차단');
  await p.reload(); await p.waitForTimeout(700);
  await setMission(p, 0);                                     /* 스킬 1회 소환 미션 */
  await p.evaluate(() => openShopPage());
  const blk = await p.evaluate(() => {
    S.dia = 99999; closeModal && closeModal();
    const snap = () => ({ dia: S.dia, eq: S.cnt.sumEquip, sk: S.cnt.sumSkill,
                          free: JSON.parse(JSON.stringify(S.daily.freeSum)), sum: S.summons });
    const a = snap();
    doSummon('shield', 10);                                   /* 유료 — 막혀야 한다 */
    const afterPaid = snap();
    const modalOn = $('modal').classList.contains('on');
    const modalTxt = $('mtitle').textContent + ' ' + $('mbox').textContent;
    closeModal && closeModal();
    /* 무료 10연 경로 — 차감 «전» 에 막히는지 (freeSum 이 그대로여야 한다) */
    const btn = document.querySelector('#shopList .shp-card:nth-child(2) [data-shfree]');
    if (btn) btn.click();
    const afterFree = snap();
    closeModal && closeModal();
    doSummon('skill', 10);                                    /* 지정 상자 — 통과해야 한다 */
    const afterOk = snap();
    return { a, afterPaid, afterFree, afterOk, modalOn, modalTxt };
  });
  ok(blk.afterPaid.dia === blk.a.dia && blk.afterPaid.eq === blk.a.eq && blk.afterPaid.sum === blk.a.sum,
    '유료 방어구 10연 차단 — 다이아·카운터 불변');
  ok(blk.modalOn && /가이드 진행/.test(blk.modalTxt) && /무기|방패|스킬/.test(blk.modalTxt),
    '차단 시 안내 팝업 노출');
  ok(JSON.stringify(blk.afterFree.free) === JSON.stringify(blk.a.free) && blk.afterFree.eq === blk.a.eq,
    '무료 10연 차단 — 무료 횟수 «차감 전» 에 막힘');
  ok(blk.afterOk.sk === blk.a.sk + 10 && blk.afterOk.dia === blk.a.dia - 1000,
    '지정 상자(스킬)는 정상 소환 · 1,000 차감');
  const relicFree = await p.evaluate(() => {
    S.relic = 99999; const r0 = S.cnt.sumRelic;
    doSummon('relic', 1);
    return S.cnt.sumRelic - r0;
  });
  ok(relicFree === 1, '유물은 가이드 대상 아님 — 차단하지 않는다');
  const released = await p.evaluate(() => {
    const eq0 = S.cnt.sumEquip;                               /* 미션이 이미 달성된 상태(위에서 스킬 10연) */
    doSummon('shield', 10);
    return { ready: gmReady(), ban: gmBan(), got: S.cnt.sumEquip - eq0 };
  });
  ok(released.ready && released.ban === null && released.got === 10, '미션 달성 후 차단 해제');
  const reward = await p.evaluate(() => {
    S.guide.idx = 0; S.guide.prog = -1; gmBase(GUIDE[0]);
    const p0 = S.cnt.sumPet;
    doSummonFree('pet', 10, 1);                               /* 룰렛 보상 경로 — 막히면 보상이 증발한다 */
    return S.cnt.sumPet - p0;
  });
  ok(reward === 10, '보상으로 주는 무료 소환(룰렛 펫)은 차단하지 않는다');

  /* ── §5 ① 미완 미션 클릭 → 이동 ───────────────────────────────── */
  console.log('§5 ① 미완 배너 클릭 → 목표 화면 이동');
  const EXPECT = [
    { i: 0,  d: '10 상점 · 스킬 상자',  ck: s => s.shopw && s.shopFocus && s.shopFocus.skill.at && s.shopFocus.skill.inView },
    { i: 1,  d: '영웅 · 스킬 시트',     ck: s => s.panel && s.heroTab === 'sk' && s.tab === 'hero' },
    { i: 2,  d: '10 상점 · 무기 상자',  ck: s => s.shopw && s.shopFocus && s.shopFocus.weapon.at && s.shopFocus.weapon.inView },
    { i: 3,  d: '06 장비 시트',         ck: s => s.eqw && s.heroTab === 'eq' },
    { i: 4,  d: '23 훈련 · 훈련 탭',    ck: s => s.trw && s.trSub === 'train' },
    { i: 5,  d: '10 상점 · 방어구 상자', ck: s => s.shopw && s.shopFocus && s.shopFocus.shield.at && s.shopFocus.shield.inView },
    { i: 6,  d: '전투(메인)',           ck: s => s.clean },
    { i: 7,  d: '전투(메인)',           ck: s => s.clean },
    { i: 8,  d: '03 던전',              ck: s => s.dunw },
    { i: 9,  d: '룰렛',                 ck: s => s.modal },
    { i: 10, d: '출석',                 ck: s => s.modal },
    { i: 11, d: '14 보물상자',          ck: s => s.relicw },
    { i: 12, d: '06 장비 시트',         ck: s => s.eqw && s.heroTab === 'eq' },
    { i: 13, d: '전투(메인)',           ck: s => s.clean },
    { i: 14, d: '15 유물 탭',           ck: s => s.rlw },
    { i: 15, d: '23 훈련 · 스탯 탭',    ck: s => s.trw && s.trSub === 'stat' },
    { i: 16, d: '전투(메인)',           ck: s => s.clean },
    { i: 17, d: '21 도감 보너스',       ck: s => s.collw },
    { i: 18, d: '전투(메인)',           ck: s => s.clean },
    { i: 19, d: '전투(메인)',           ck: s => s.clean }
  ];
  for (const e of EXPECT) {
    await setMission(p, e.i);
    await p.waitForTimeout(60);
    const st = await p.evaluate(() => {
      const idle = { shopw: $('shopw').classList.contains('on'), dunw: $('dunw').classList.contains('on') };
      const notReady = !gmReady(), name = GUIDE[S.guide.idx].n;
      $('tuto').click();
      const on = id => $(id) && $(id).classList.contains('on');
      const li = $('shopList');
      let focus = null;
      if (on('shopw') && li && li.children.length) {
        focus = {};
        SHOP_BOXES.forEach((x, i) => {
          const c = li.children[i];
          const top = c.offsetTop - li.children[0].offsetTop;
          const want = Math.max(0, Math.min(top, li.scrollHeight - li.clientHeight));
          const cr = c.getBoundingClientRect(), lr = li.getBoundingClientRect();
          focus[x.b] = { at: li.scrollTop === want, inView: cr.top >= lr.top - 1 && cr.bottom <= lr.bottom + 1 };
        });
      }
      const overlays = ['shopw', 'dunw', 'relicw', 'rlw', 'collw', 'trw', 'eqw', 'modal'];
      return { name, notReady, idle,
        shopw: on('shopw'), dunw: on('dunw'), relicw: on('relicw'), rlw: on('rlw'),
        collw: on('collw'), trw: on('trw'), eqw: on('eqw'), modal: on('modal'),
        panel: $('panel').style.display !== 'none',
        heroTab, trSub, tab: curTab, shopFocus: focus,
        clean: !overlays.some(on) && $('panel').style.display === 'none' };
    });
    ok(st.notReady && e.ck(st), `미션 ${e.i} «${st.name}» → ${e.d}`
       + (st.notReady && e.ck(st) ? '' : ' — ' + JSON.stringify(st)));   /* 실패하면 상태를 그대로 찍는다 */
  }

  /* ── §6 배너 상태 · 기하 ─────────────────────────────────────── */
  console.log('§6 배너 — 미완에서도 살아 있음 · 기하 불변');
  await setMission(p, 0);
  const bn = await p.evaluate(() => {
    const t = $('tuto'), b = $('tutoBtn'), r = t.getBoundingClientRect();
    const rw = t.querySelector('.trew').getBoundingClientRect();
    return { cursor: getComputedStyle(t).cursor, todo: t.classList.contains('todo'),
      pe: getComputedStyle(b).pointerEvents, dis: b.disabled, label: b.textContent,
      box: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      rew: { w: +rw.width.toFixed(1), h: +rw.height.toFixed(1),
             dx: +(rw.left - r.left).toFixed(1), dy: +(rw.top - r.top).toFixed(1) },
      sub: $('tutoSub').textContent };
  });
  ok(bn.todo && bn.cursor === 'pointer', '미완 배너 cursor:pointer');
  ok(bn.pe === 'none' && bn.dis, '[미션-n] 라벨은 클릭을 배너로 흘린다(pointer-events:none)');
  ok(bn.label.indexOf('미션') >= 0, '미완 라벨 유지 — ' + JSON.stringify(bn.label));
  ok(bn.box.w === 460 && bn.box.h === 150, `배너 460×150 불변 (${bn.box.w}×${bn.box.h})`);
  /* 03 교훈 — 절대배치 자식의 기준은 border box 가 아니라 **padding box** 다. `#tuto` 의 검정 5px
     테두리 때문에 CSS `left:323/top:11` 은 배너 rect 기준 328/16 으로 읽힌다(61·32 와 동일). */
  ok(bn.rew.w === 118 && bn.rew.h === 118 && bn.rew.dx === 328 && bn.rew.dy === 16,
    `보상칸 118×118 @328,16 불변 (${bn.rew.w}×${bn.rew.h} @${bn.rew.dx},${bn.rew.dy})`);
  await setMission(p, 1);
  const sub1 = await p.evaluate(() => ({ sub: $('tutoSub').textContent, dia: gmDia(GUIDE[1]) }));
  ok(sub1.dia === 1000 && sub1.sub.length > 0, `함수형 보상이 배너에 표기됨 (${sub1.sub})`);

  /* ── §7 수령 · 저장 ──────────────────────────────────────────── */
  console.log('§7 수령 → 다이아 증가 · 저장 반영');
  await setMission(p, 1);
  const cl = await p.evaluate(() => {
    S.eqSkill = [SKILLS[0].id];                               /* 미션 1 «스킬 장착» 달성 */
    drawTuto();
    const d0 = S.dia, i0 = S.guide.idx, want = gmDia(GUIDE[1]);
    $('tuto').click();
    const raw = JSON.parse(localStorage.getItem(KEY));
    return { gain: S.dia - d0, want, idx: S.guide.idx - i0, saved: raw.dia, live: S.dia };
  });
  ok(cl.gain === cl.want && cl.idx === 1, `보상 💎${cl.gain} 지급 + 다음 미션으로 (기대 ${cl.want})`);
  ok(cl.saved === cl.live, '세이브(localStorage)에 즉시 반영');

  /* ── §8 콘솔 ─────────────────────────────────────────────────── */
  console.log('§8 콘솔');
  ok(errs.length === 0, '콘솔 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();
  const tot = pass + fail;
  console.log(`\nVERIFY73 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
