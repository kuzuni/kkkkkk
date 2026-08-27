/* 작업 256 회귀 게이트 — 가이드 미션 «종류» 개편 (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify256.js   → 마지막 줄이 `VERIFY256 n/n PASS` 여야 한다.

   주인 지시 원문: «미션 종류를 좀 뭔가 이미 햇엇으면 완료로 해줘야함 / 소환 더 시도하라는
   퀘스트같은거나 몬스터처치 종류 말고 / 훈련에서 뭐 몇회강화하라 이런식 말고 훈련 공격력
   300레벨 도달해라 이런식이어야함».

   T2 «기능 완성 규칙»: «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·세이브에
   반영됨» 이 완료 조건이다. 그래서 §4 는 실제 소환·강화 경로를 태우고 §5 는 실제 배너를 누른다.

   본다:
     §1 신규 시작값   신규 세이브의 «시작 상태» 를 실측한다(목표 수치를 정한 근거 그 자체).
                      스킬 1종(부팅이 주는 slash) · 무기/방패/목걸이/유물 0종 · 훈련 atk Lv 0 ·
                      전투력 cp() > 0. 여기가 흔들리면 goal 이 통째로 다시 잡혀야 한다.
     §2 목표축 규칙   ⓐ 폐기 형태 3종(«n회 소환»·«n마리 처치»·«훈련 n회») 문구 0개
                      ⓑ 델타형 0개(전부 abs) ⓒ 목표 수치가 «신규 시작값 초과 · 체인 안에서 도달 가능»
                      — 리터럴이 아니라 **부등식**으로 잰다(주인이 300 을 원하면 상수만 바꾸면 된다).
     §3 즉시 달성     바꾼 8개 미션 전부 — «이미 그 상태면» 열리자마자 [보상받기].
     §4 ★ 실동작      진짜 상점에서 [소환] 을 누르고 진짜 훈련 카드를 눌러서 상태를 만든다.
                      («카운터에 숫자를 꽂는» 것이 아니라 게임을 실제로 돌린다)
     §5 수령          배너를 눌러 다이아·idx·localStorage 가 실제로 움직인다.
     §6 ★ 음성항      ⓐ 신규 세이브에서 8개 중 어느 것도 공짜 달성이 아니다
                      ⓑ 폐기 카운터(totalKills·upgrades·cnt.sum*)를 부풀려도 아무것도 안 움직인다
                      ⓒ 부위끼리 새지 않는다(무기 4종 보유 → 방패·목걸이 미션 여전히 (0/1))
     §7 되돌림        goal 을 신규 시작값 아래로 내리면 §6ⓐ 가 실제로 빨개진다(자가 검사).
     §8 배너 기하     8개 미션의 새 문구가 배너 밖으로 새지 않는다(가장 긴 문구 포함).
     §9 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 256 이 바꾼 8개 자리 — idx 는 «순서 불변» 규약의 일부라 여기서 못 박는다 */
const CHANGED = [
  { i: 0,  n: '스킬 2종 보유하기' },
  { i: 2,  n: '무기 1종 보유하기' },
  { i: 4,  n: '훈련 공격력 10레벨 도달' },
  { i: 5,  n: '방패 1종 보유하기' },
  { i: 6,  n: '목걸이 1종 보유하기' },
  { i: 7,  n: '전투력 5000 도달하기' },
  { i: 11, n: '유물 1종 보유하기' },
  { i: 15, n: '훈련 공격력 80레벨 도달' }
];

const snap = p => p.evaluate(() => {
  drawTuto();
  const b = document.getElementById('tuto');
  return {
    idx: S.guide.idx, dia: S.dia,
    name: document.getElementById('tutoName').textContent.trim(),
    pg:   document.getElementById('tutoPg').textContent.trim(),
    label:document.getElementById('tutoBtn').textContent.trim(),
    dis:  document.getElementById('tutoBtn').disabled,
    ready:b.classList.contains('ready'), todo: b.classList.contains('todo')
  };
});

const goMission = (p, i) => p.evaluate(i => {
  gmCloseAll(); closeModal();
  S.guide.idx = i; S.guide.gv = GUIDE_V; S.guide.prog = -1;
  gmStart(); uiDirty = true; drawTuto();
}, i);

/* 신규 세이브 그대로의 상태 — 단, 부팅이 주는 시작 스킬 `slash` 는 남긴다(제품의 시작값이다) */
const reset = p => p.evaluate(() => {
  gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  if (!has('slash')) { S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash']; }
  bonusDirty = true; uiDirty = true; renderUI(); drawTuto();
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof GUIDE !== 'undefined' && typeof ownedEq === 'function');
  await p.waitForTimeout(600);

  /* ── §1 신규 시작값 ──────────────────────────────────────────── */
  console.log('§1 신규 세이브의 시작 상태 — 목표 수치를 정한 근거');
  await reset(p);
  const START = await p.evaluate(() => ({
    skill: ownedSkill(), weapon: ownedEq('weapon'), shield: ownedEq('shield'),
    amulet: ownedEq('amulet'), relic: ownedRelic(), atk: lv('atk'), cp: cp(),
    eqSkill: S.eqSkill.length
  }));
  console.log('     ' + JSON.stringify(START));
  eq('§1 시작 스킬 1종(부팅이 주는 slash)', START.skill, 1);
  ok(START.eqSkill >= 1, '§1 시작 스킬은 장착까지 돼 있다', 'eqSkill=' + START.eqSkill);
  eq('§1 시작 무기 0종',   START.weapon, 0);
  eq('§1 시작 방패 0종',   START.shield, 0);
  eq('§1 시작 목걸이 0종', START.amulet, 0);
  eq('§1 시작 유물 0종',   START.relic, 0);
  eq('§1 시작 훈련 공격력 Lv 0', START.atk, 0);
  ok(START.cp > 0 && Number.isFinite(START.cp), '§1 시작 전투력이 유한한 양수', 'cp=' + START.cp);

  /* ── §2 목표축 규칙 ──────────────────────────────────────────── */
  console.log('§2 목표축 — 폐기 형태 0개 · 전부 abs · 목표가 시작값 초과');
  const G = await p.evaluate(() => GUIDE.map(m => ({ n: m.n, goal: m.goal, abs: !!m.abs, ban: m.ban || null })));
  eq('§2 미션 개수 20 (순서·개수 불변)', G.length, 20);
  for (const c of CHANGED) eq(`§2 idx ${c.i} 의 미션`, G[c.i].n, c.n);
  for (const [tag, re] of [['ⓐ «n회 소환»', /소환/], ['ⓑ «n마리 처치»', /마리/], ['ⓒ «훈련 n회»', /훈련\s*\d+\s*회/]])
    ok(!G.some(m => re.test(m.n)), '§2 폐기 형태 ' + tag + ' 문구 0개',
       G.map(m => m.n).filter(n => re.test(n)).join(' / '));
  eq('§2 델타형 0개 (전부 abs)', G.filter(m => !m.abs).map(m => m.n).join(','), '');
  /* 목표 수치는 리터럴로 박지 않는다 — «시작값보다 크다»(공짜 아님)와 «체인 안에서 닿는다» 를
     부등식으로 잰다. 주인이 «300레벨» 을 문자 그대로 원하면 GM_ATK2 만 바꾸면 되고,
     그때 아래 ② 가 «체인 안에서 도달 불가» 로 정확히 빨개진다. */
  const K = await p.evaluate(() => ({
    atk1: GM_ATK1, atk2: GM_ATK2, cp1: GM_CP1,
    lastStage: GUIDE[GUIDE.length - 1].goal, cap: trainCap()
  }));
  ok(K.atk1 > START.atk && K.atk2 > K.atk1, '§2 훈련 목표가 시작값 초과 · 단조 증가',
     `start=${START.atk} atk1=${K.atk1} atk2=${K.atk2}`);
  ok(K.cp1 > START.cp, '§2 전투력 목표가 시작 전투력 초과', `start=${START.cp} goal=${K.cp1}`);
  /* ② 체인 안에서 도달 가능한가 — sim112 의 «스테이지 → 훈련 레벨» 을 쓰지 않고,
     제품의 훈련 상한만으로 보수적으로 잰다: 훈련 1단계 상한(=trainCap) 안에 들어와야
     «단계를 올리지 않고» 닿는다. 마지막 미션이 스테이지 40 인 체인에서 4단계(Lv 300+)를
     요구하면 여기서 즉시 빨개진다. */
  ok(K.atk2 <= K.cap, '§2 훈련 목표가 1단계 상한 안 — 체인 안에서 도달 가능',
     `atk2=${K.atk2} cap=${K.cap} (체인 마지막 = 스테이지 ${K.lastStage})`);
  ok(G[0].goal === 2, '§2 첫 미션만 goal 2 — 시작 스킬 때문에 1 이면 공짜다', 'goal=' + G[0].goal);
  ok(G.filter(m => m.ban).length === 4, '§2 소환 차단(ban)은 4종 그대로 (스킬·무기·방패·목걸이)',
     G.filter(m => m.ban).map(m => m.n + ':' + m.ban).join(' / '));

  /* ── §3 즉시 달성 ────────────────────────────────────────────── */
  console.log('§3 «이미 그 상태면» 열리자마자 달성');
  const SET = {
    0:  () => { SKILLS.slice(0, 3).forEach(x => S.own[x.id] = { n:0, l:1 }); },
    2:  () => { EQUIPS.filter(e => e.slot === 'weapon').slice(0, 2).forEach(e => S.own[e.id] = { n:0, l:1 }); },
    4:  () => { S.lv.atk = GM_ATK1; },
    5:  () => { S.own[EQUIPS.find(e => e.slot === 'shield').id] = { n:0, l:1 }; },
    6:  () => { S.own[EQUIPS.find(e => e.slot === 'amulet').id] = { n:0, l:1 }; },
    7:  () => { S.lv.atk = 400; S.lv.hp = 400; bonusDirty = true; },
    11: () => { S.own[RELICS[0].id] = { n:0, l:1 }; },
    15: () => { S.lv.atk = GM_ATK2; }
  };
  for (const c of CHANGED) {
    await reset(p);
    await p.evaluate(`(${SET[c.i].toString()})()`);
    await goMission(p, c.i);
    const s = await snap(p);
    eq(`§3 idx ${c.i} 문구`, s.name, c.n);
    ok(s.ready && s.label === '[보상받기]' && s.dis === false,
       `§3 «${c.n}» 이미 그 상태면 즉시 달성`, s.pg + ' ' + s.label);
  }

  /* ── §4 ★ 실동작 ─────────────────────────────────────────────── */
  console.log('§4 ★ 실동작 — 실제 소환·실제 훈련으로 상태를 만든다');
  await reset(p);
  /* ⓐ 무기 미션 — 상점에서 진짜로 뽑는다 */
  await goMission(p, 2);
  let s = await snap(p);
  ok(!s.ready, '§4ⓐ 무기 미션 시작 시 미완료', s.pg);
  const sum = await p.evaluate(() => {
    S.dia = 1e9;                                  /* 소환 비용만 채워 준다 — 판정은 안 건드린다 */
    const before = ownedEq('weapon');
    doSummon('weapon', 1);
    return { before, after: ownedEq('weapon'), cnt: S.cnt.sumEquip };
  });
  ok(sum.after > sum.before, '§4ⓐ 실제 [소환] 으로 무기 보유가 늘었다', JSON.stringify(sum));
  s = await snap(p);
  ok(s.ready, '§4ⓐ 그 즉시 미션 달성', s.pg + ' ' + s.label);
  /* ⓑ 훈련 미션 — 진짜 훈련 카드를 눌러 레벨을 올린다 */
  await reset(p);
  await goMission(p, 4);
  s = await snap(p);
  ok(!s.ready, '§4ⓑ 훈련 미션 시작 시 미완료', s.pg);
  /* ⚠ 훈련 카드의 구매는 `click` 이 아니라 **`#trw` 위임 `pointerdown`** 이다(64 홀드 반복).
     `card.click()` 은 아무 일도 안 일으킨다 — 손가락이 가는 그 경로를 그대로 태운다. */
  const tr = await p.evaluate(() => {
    S.gold = 1e12; openTrain();
    const before = lv('atk');
    let clicked = 0;
    for (let i = 0; i < 40 && lv('atk') < GM_ATK1; i++) {
      const card = document.querySelector('#trCards [data-tr="atk"]');   /* 매 회 다시 찾는다(재렌더) */
      if (!card) break;
      card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      clicked++;
    }
    const after = lv('atk');
    closeTrain();
    return { before, after, goal: GM_ATK1, clicked };
  });
  ok(tr.clicked > 0, '§4ⓑ 23 훈련 «공격력» 카드를 실제로 눌렀다', 'n=' + tr.clicked);
  ok(tr.after >= tr.goal, '§4ⓑ 실제 클릭으로 훈련 공격력이 목표까지 올랐다', JSON.stringify(tr));
  s = await snap(p);
  ok(s.ready, '§4ⓑ 그 즉시 미션 달성', s.pg + ' ' + s.label);

  /* ── §5 수령 ─────────────────────────────────────────────────── */
  console.log('§5 수령 — 다이아·idx·localStorage 가 실제로 움직인다');
  const dia0 = (await snap(p)).dia;
  await p.evaluate(() => { document.getElementById('tuto').click(); save(); });
  await p.waitForTimeout(150);
  s = await snap(p);
  eq('§5 idx 4 → 5', s.idx, 5);
  ok(s.dia > dia0, `§5 다이아가 늘었다 (${dia0} → ${s.dia})`);
  eq('§5 배너가 다음 미션으로', s.name, G[5].n);
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('idle_hunter_save_v4')).guide.idx);
  eq('§5 localStorage 반영', stored, 5);

  /* ── §6 ★ 음성항 ─────────────────────────────────────────────── */
  console.log('§6 ★ 음성항 — 공짜 달성·옛 카운터·부위 누출 0');
  await reset(p);
  const free = [];
  for (const c of CHANGED) {
    await goMission(p, c.i);
    s = await snap(p);
    if (s.ready) free.push(`${c.i}:${c.n} ${s.pg}`);
  }
  ok(free.length === 0, '§6ⓐ 신규 세이브에서 8개 중 공짜 달성 0개', free.join(' | '));

  await reset(p);
  await p.evaluate(() => {
    S.totalKills = 990000; S.upgrades = 4000; S.summons = 500;
    S.cnt.sumSkill = 99; S.cnt.sumEquip = 99; S.cnt.sumRelic = 99;
  });
  const moved = [];
  for (const c of CHANGED) {
    await goMission(p, c.i);
    s = await snap(p);
    if (s.ready) moved.push(`${c.i}:${c.n} ${s.pg}`);
  }
  ok(moved.length === 0, '§6ⓑ 폐기 카운터를 부풀려도 움직이는 미션 0개', moved.join(' | '));

  await reset(p);
  await p.evaluate(() => EQUIPS.filter(e => e.slot === 'weapon').slice(0, 4)
    .forEach(e => S.own[e.id] = { n:0, l:1 }));
  for (const [i, n] of [[5, '방패 1종 보유하기'], [6, '목걸이 1종 보유하기']]) {
    await goMission(p, i);
    s = await snap(p);
    eq(`§6ⓒ «${n}» 은 무기 4종을 가져도 (0/1)`, s.pg, '(0/1)');
  }
  await goMission(p, 2);
  s = await snap(p);
  ok(s.ready, '§6ⓒ 같은 상태에서 «무기 1종 보유하기» 는 달성된다(대조군)', s.pg);

  /* ── §7 되돌림 (자가 검사) ───────────────────────────────────── */
  console.log('§7 되돌림 — 목표를 시작값 아래로 내리면 §6ⓐ 가 실제로 빨개진다');
  const back = await p.evaluate(() => {
    const m = GUIDE[0], keep = m.goal;
    m.goal = 1;                                   /* 시작 스킬 1종 = 즉시 달성 */
    S.guide.idx = 0; S.guide.prog = -1; gmStart(); drawTuto();
    const r = document.getElementById('tuto').classList.contains('ready');
    m.goal = keep; gmStart(); drawTuto();          /* 원복 */
    return { broken: r, restored: document.getElementById('tuto').classList.contains('ready') };
  });
  ok(back.broken === true, '§7 goal 1 로 내리면 첫 미션이 공짜로 달성된다(게이트가 살아 있다)');
  ok(back.restored === false, '§7 원복하면 다시 미완료');

  /* ── §8 배너 기하 ────────────────────────────────────────────── */
  console.log('§8 배너 기하 — 새 문구가 배너 밖으로 새지 않는다');
  const bleed = await p.evaluate(() => {
    const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
    const F = el => { const b = el.getBoundingClientRect();
      return { x:(b.left-ar.left)/sc, y:(b.top-ar.top)/sc, w:b.width/sc, h:b.height/sc }; };
    const bad = [];
    for (let i = 0; i < GUIDE.length; i++){
      S.guide.idx = i; S.guide.prog = -1; gmStart(); drawTuto();
      const tb = F(document.getElementById('tuto'));
      ['#tutoName', '#tutoPg', '#tutoBtn'].forEach(sel => {
        const g = F(document.querySelector(sel));
        if (g.w <= 0) return;
        if (g.x < tb.x - 0.5 || g.x + g.w > tb.x + tb.w + 0.5)
          bad.push(`#${i} ${GUIDE[i].n} ${sel} w=${g.w.toFixed(1)}`);
      });
    }
    S.guide.idx = 0; drawTuto();
    return bad;
  });
  ok(bleed.length === 0, '§8 20개 미션 전부 — 문구가 배너 가로폭 안에 들어온다', bleed.slice(0, 4).join(' || '));

  /* ── §9 콘솔 ─────────────────────────────────────────────────── */
  console.log('§9 콘솔');
  ok(errs.length === 0, `§9 콘솔 에러 0건 — ${errs.length ? errs.slice(0, 2).join(' | ') : '없음'}`);

  await browser.close();
  console.log(`\nVERIFY256 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
