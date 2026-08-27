/* 작업 253 회귀 게이트 — 가이드 미션 «이미 해 둔 것은 달성으로» (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify253.js   → 마지막 줄이 `VERIFY253 n/n PASS` 여야 한다.

   T2 «기능 완성 규칙»: «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·세이브에
   반영됨» 이 완료 조건이다. 그래서 §3 은 실제 [강화] 버튼을 «누르고» §4 는 실제 배너를 «누른다».

   본다:
     §1 불변식     goal:1 + 전용 카운터 미션 7개는 abs · 소환 3종(sumEquip 공유)과 goal>1 3개는 델타.
                   미션 «이름» 으로 단언한다(154 교훈 ② — 번호가 아니라 가리키는 대상을 본다).
     §2 ★ 주인 보고 재현
                   미션이 열리기 «전» 에 이미 강화해 둔 세이브(S.cnt.levelUps ≥ 1)를 idx 12 로 올리면
                   **즉시 달성**((1/1) · [보상받기] · 버튼 enabled). 되돌리면(abs 제거) (0/1) 로 빨개진다.
     §3 실동작     실제 장비를 조각째로 쥐여 주고 08 세부 팝업 [강화] 버튼을 «클릭» →
                   S.cnt.levelUps +1 · 세이브 반영. 그 상태로 미션이 열리면 즉시 달성.
     §4 수령       배너 클릭 → 다이아 +900 · idx 12→13 · localStorage 반영.
     §5 나머지 abs 미션 9종도 «이미 해 둔 상태 → 즉시 달성» + ★ 신규 세이브에서는 하나도 공짜 아님.
     §6 ★ 반증 1   무기를 여러 개 가져도 방패·목걸이 미션은 (0/1) — 부위끼리 새지 않는다.
     §7 ★ 반증 2   폐기된 행위 카운터(totalKills·upgrades·cnt.sum*)로는 아무 미션도 안 움직인다 +
                   상태를 올리면 목표 경계(goal−1 미달 / goal 달성)에서 정확히 갈린다.
     §8 세이브     GUIDE_V = 6 · 진행이 save→load 로 유지 · ★ gv 5 세이브를 이관해도 진행이 0 으로
                   안 되돌아간다(256 이 버전을 올릴 수 있었던 근거 그 자체를 잠근다).
     §9 콘솔 에러 0.

   ⚠ 2026-08-27 등재 256(주인 지시)이 목표축을 «행위 반복» → «상태 도달» 로 갈면서 §1·§5·§6·§7·§8 을
     새 사양으로 옮겨 적었다. 253 의 주제(«이미 해 둔 것은 달성으로»)는 그대로다 — 지운 단언은
     없고 전부 «같은 물음, 새 축» 으로 이사했다(LESSONS 185-④). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 253 의 판정표 — «미션 이름 → abs 여야 하는가». 이 표가 이 작업의 사양 그 자체다. */
/* 256(2026-08-27, 주인 지시)이 이 표를 **전부 true 로** 만들었다 — «행위 반복» 목표축 자체를
   폐기하면서 델타형이 한 개도 안 남았다. 253 의 물음(«이미 해 둔 것이 달성으로 쳐지는가»)은
   그대로이고, 이름과 «델타로 남긴 6개» 만 256 의 사양으로 갱신한다.
   ⚠ 253 이 «abs 로 못 간다» 고 적었던 소환 3종의 사정(cnt.sumEquip 공유)은 카운터를 안 보게
     되면서 사라졌다 — 그 위험이 사라졌다는 사실 자체를 §6 이 음성항으로 잠근다. */
const WANT_ABS = {
  '스킬 2종 보유하기':      true,   /* 256 — ownedSkill()  (시작 스킬 slash 때문에 goal 2) */
  '스킬 장착하기':          true,   /* 61 부터 abs */
  '무기 1종 보유하기':      true,   /* 256 — ownedEq('weapon')  부위별 전용 상태 */
  '장비 장착하기':          true,
  '훈련 공격력 10레벨 도달': true,   /* 256 — lv('atk')  «훈련 10회» 대체 */
  '방패 1종 보유하기':      true,   /* 256 — ownedEq('shield') */
  '목걸이 1종 보유하기':    true,   /* 256 — ownedEq('amulet') */
  '전투력 5000 도달하기':   true,   /* 256 — cp()  «적 100마리 처치» 대체 */
  '스테이지 5 도달하기':    true,
  '던전 1회 입장하기':      true,   /* cnt.dungeon */
  '룰렛 1회 돌리기':        true,   /* cnt.spins */
  '유물 1종 보유하기':      true,   /* 256 — ownedRelic() */
  '아이템 1회 강화하기':    true,   /* ★ cnt.levelUps — 253 주인 보고분 */
  '스테이지 15 도달하기':   true,
  '유물 Lv 3 모으기':       true,
  '훈련 공격력 80레벨 도달': true,   /* 256 — lv('atk')  «훈련 30회» 대체 */
  '스테이지 25 도달하기':   true,
  '도감 보너스 1회 받기':   true,   /* collSteps() — 상태값 */
  '보스 1회 처치하기':      true,   /* bossCleared() — 상태값 */
  '스테이지 40 도달하기':   true
};

/* 배너 스냅샷 — 상태 변경과 drawTuto() 를 같은 evaluate 안에서 부른다(61 ⚠ rAF 플레이크) */
const snap = p => p.evaluate(() => {
  drawTuto();
  const b = document.getElementById('tuto');
  return {
    idx: S.guide.idx, prog: S.guide.prog, dia: S.dia,
    name: document.getElementById('tutoName').textContent.trim(),
    pg:   document.getElementById('tutoPg').textContent.trim(),
    label:document.getElementById('tutoBtn').textContent.trim(),
    dis:  document.getElementById('tutoBtn').disabled,
    ready:b.classList.contains('ready'), todo: b.classList.contains('todo')
  };
});

/* 미션 i 를 «현재» 로 올린다. 실제 진입과 같게 gmStart() 로 기준선을 찍는다.
   ⚠ localStorage.clear()+reload 는 옛 페이지의 자동 save() 가 되써서 안 통한다(LESSONS 73-①). */
const goMission = (p, i) => p.evaluate((i) => {
  gmCloseAll(); closeModal();
  S.guide.idx = i; S.guide.gv = GUIDE_V; S.guide.prog = -1;
  gmStart();                      /* 미션이 «지금» 열린 것과 같은 상태 */
  uiDirty = true; drawTuto();
}, i);

const reset = p => p.evaluate(() => {
  gmCloseAll(); closeModal();
  Object.assign(S, DEF());
  uiDirty = true; renderUI(); drawTuto();
});

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof GUIDE !== 'undefined' && typeof gmBase === 'function');
  await p.waitForTimeout(600);

  /* ── §1 불변식 ────────────────────────────────────────────────── */
  console.log('§1 판정 기준 — goal:1 + 전용 카운터 → abs · 공유 카운터/«n회 더» → 델타');
  const G = await p.evaluate(() => GUIDE.map(m => ({ n: m.n, goal: m.goal, abs: !!m.abs })));
  eq('§1 미션 개수 20 (154 이후 불변)', G.length, 20);
  Object.keys(WANT_ABS).forEach(name => {
    const m = G.find(x => x.n === name);
    if (!m) return ok(false, `§1 미션 «${name}» 이 표에 있다`, '없음');
    ok(m.abs === WANT_ABS[name], `§1 «${name}» = ${WANT_ABS[name] ? 'abs' : '델타'}`,
       `abs=${m.abs}`);
  });
  /* 256 — 규칙 자체를 잠근다. 253 때는 «goal 1 인데 델타 = sumEquip 3종뿐» 이 규칙이었다.
     256 이 목표축을 상태로 갈면서 그 3종의 사정이 사라졌으므로 규칙이 **한 줄 더 강해진다**:
     델타형은 한 개도 없다. 새 미션이 델타로 들어오면 여기서 즉시 빨개진다. */
  eq('§1 델타형 미션 0개 (256 — 전부 abs)', G.filter(m => !m.abs).map(m => m.n).join(','), '');

  /* ── §2 ★ 주인 보고 재현 ─────────────────────────────────────── */
  console.log('§2 ★ 이미 강화해 둔 세이브 → 미션이 열리자마자 달성');
  await reset(p);
  await p.evaluate(() => { S.cnt.levelUps = 3; });      /* 미션 «전» 에 3번 강화해 뒀다 */
  await goMission(p, 12);
  let s = await snap(p);
  eq('§2 배너 문구 = «아이템 1회 강화하기»', s.name, '아이템 1회 강화하기');
  eq('§2 진행 (1/1)', s.pg, '(1/1)');
  eq('§2 라벨 [보상받기]', s.label, '[보상받기]');
  ok(s.ready && !s.todo, '§2 ready 상태', JSON.stringify({ ready: s.ready, todo: s.todo }));
  ok(s.dis === false, '§2 버튼 enabled', 'disabled=' + s.dis);
  /* 되돌려 보기 — abs 를 떼면 이 게이트가 실제로 빨개지는가(270 «되돌려 n/n» 관례) */
  const back = await p.evaluate(() => {
    const m = GUIDE[12], keep = m.abs;
    delete m.abs; S.guide.prog = -1; gmStart(); drawTuto();
    const pg = document.getElementById('tutoPg').textContent.trim();
    m.abs = keep; S.guide.prog = -1; gmStart(); drawTuto();   /* 원복 */
    return pg;
  });
  eq('§2 되돌리면(abs 제거) 옛 버그가 재현된다 — (0/1)', back, '(0/1)');
  s = await snap(p);
  eq('§2 원복 후 다시 (1/1)', s.pg, '(1/1)');

  /* ── §3 실동작 — 진짜 [강화] 버튼을 누른다 ───────────────────── */
  console.log('§3 실동작 — 08 세부 팝업 [강화] 클릭 → levelUps +1 → 미션 달성');
  await reset(p);
  /* 조각을 넉넉히 쥔 장비 1개를 만든다(강화가 실제로 가능한 최소 상태) */
  const prep = await p.evaluate(() => {
    const it = EQUIPS.find(e => e.slot === 'weapon') || EQUIPS[0];
    S.own[it.id] = { l: 1, n: 99 };
    return { id: it.id, can: canLevel(it), lv: oLv(it.id), frag: frag(it.id) };
  });
  ok(prep.can, '§3 강화 가능한 장비를 준비했다', JSON.stringify(prep));
  await p.evaluate((id) => { gmCloseAll(); closeModal(); showItem(id); }, prep.id);
  await p.waitForTimeout(150);
  const btn = await p.evaluate(() => {
    const b = document.getElementById('mLv');
    return { exists: !!b, dis: b ? b.disabled : null, txt: b ? b.textContent.trim() : '' };
  });
  ok(btn.exists && !btn.dis, '§3 [강화] 버튼이 눌리는 상태다', JSON.stringify(btn));
  const up0 = await p.evaluate(() => S.cnt.levelUps);
  await p.click('#mLv');
  await p.waitForTimeout(200);
  const up = await p.evaluate((id) => ({
    n: S.cnt.levelUps, lv: oLv(id),
    saved: (JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').cnt || {}).levelUps
  }), prep.id);
  eq('§3 [강화] 클릭 → S.cnt.levelUps +1', up.n, up0 + 1);
  eq('§3 아이템 레벨이 실제로 올랐다', up.lv, 2);
  eq('§3 세이브(localStorage)에도 반영됐다', up.saved, up.n);
  await p.evaluate(() => { closeModal(); });
  await goMission(p, 12);
  s = await snap(p);
  eq('§3 그 상태로 미션이 열리면 즉시 (1/1)', s.pg, '(1/1)');
  ok(s.ready, '§3 즉시 [보상받기]', s.label);

  /* ── §4 수령 ─────────────────────────────────────────────────── */
  console.log('§4 수령 — 배너 클릭 → 다이아 +900 · idx 13');
  const dia0 = (await snap(p)).dia;
  await p.click('#tuto');
  await p.waitForTimeout(250);
  s = await snap(p);
  eq('§4 다이아 +900', s.dia, dia0 + 900);
  eq('§4 idx 12 → 13', s.idx, 13);
  eq('§4 배너가 다음 미션으로', s.name, '스테이지 15 도달하기');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('idle_hunter_save_v4')).guide.idx);
  eq('§4 localStorage 에 idx 13 저장', stored, 13);

  /* ── §5 나머지 6개 abs 미션 ──────────────────────────────────── */
  console.log('§5 나머지 abs 미션 — 이미 해 둔 상태면 즉시 달성');
  /* 256 — «이미 해 둔 상태» 를 만드는 방법이 카운터 대입에서 **실제 보유·레벨** 로 바뀌었다.
     제품이 보는 그 상태를 그대로 만든다(카운터에 숫자를 꽂아 봐야 이제 아무도 안 읽는다). */
  const CASES = [
    { i: 0,  n: '스킬 2종 보유하기',       set: () => { SKILLS.slice(0, 3).forEach(x => S.own[x.id] = { n:0, l:1 }); } },
    { i: 2,  n: '무기 1종 보유하기',       set: () => { S.own[EQUIPS.find(e => e.slot === 'weapon').id] = { n:0, l:1 }; } },
    { i: 4,  n: '훈련 공격력 10레벨 도달', set: () => { S.lv.atk = 999; } },
    { i: 7,  n: '전투력 5000 도달하기',    set: () => { S.lv.atk = 999; S.lv.hp = 999; bonusDirty = true; } },
    { i: 9,  n: '던전 1회 입장하기',       set: () => { S.cnt.dungeon = 4; } },
    { i: 10, n: '룰렛 1회 돌리기',         set: () => { S.cnt.spins = 1; } },
    { i: 11, n: '유물 1종 보유하기',       set: () => { S.own[RELICS[0].id] = { n:0, l:1 }; } },
    { i: 15, n: '훈련 공격력 80레벨 도달', set: () => { S.lv.atk = 999; } },
    { i: 18, n: '보스 1회 처치하기',       set: () => { S.best = 26; } }
  ];
  for (const c of CASES) {
    await reset(p);
    await p.evaluate(`(${c.set.toString()})()`);
    await goMission(p, c.i);
    s = await snap(p);
    eq(`§5 «${c.n}» 문구`, s.name, c.n);
    ok(s.ready && s.label === '[보상받기]', `§5 «${c.n}» 이미 해 뒀으면 즉시 달성`, s.pg + ' ' + s.label);
  }
  /* 도감은 카운터가 아니라 «강화 단계 합» 이라 실제 도감 상태로 만든다 */
  await reset(p);
  const collOk = await p.evaluate(() => {
    /* 아무 세트나 1단계 올려 둔다 — collSteps() 가 1 이상이면 «이미 받은» 상태다 */
    const k = COLL_SETS[0].key;
    S.coll = S.coll || {}; S.coll[k] = (S.coll[k] | 0) + 1;
    return collSteps();
  });
  ok(collOk >= 1, '§5 도감 강화 단계를 1 올려 뒀다', 'collSteps=' + collOk);
  await goMission(p, 17);
  s = await snap(p);
  eq('§5 «도감 보너스 1회 받기» 문구', s.name, '도감 보너스 1회 받기');
  ok(s.ready && s.pg === '(1/1)', '§5 «도감 보너스 1회 받기» 즉시 달성', s.pg + ' ' + s.label);
  /* ★ 그 반대 — 아무것도 안 해 둔 신규 세이브에서는 이 미션들이 **하나도** 미리 달성되지 않는다.
     «이미 해 뒀으면 달성» 이 «누구에게나 공짜» 로 미끄러지는 것을 막는 음성항이다. */
  await reset(p);
  const freebies = [];
  for (const c of CASES) {
    await goMission(p, c.i);
    s = await snap(p);
    if (s.ready) freebies.push(`${c.i}:${c.n} ${s.pg}`);
  }
  ok(freebies.length === 0, '§5 ★ 신규 세이브에서는 위 미션이 하나도 공짜 달성되지 않는다',
     freebies.join(' | '));

  /* ── §6 ★ 반증 1 — 소환 3종이 서로를 공짜로 달성시키지 않는다 ─────────
     253 은 이것을 «델타로 남겨서» 막았다(셋이 `S.cnt.sumEquip` 하나를 나눠 봤으므로 abs 로
     돌리면 무기 한 번에 방패·목걸이가 동시에 달성됐다). 256 은 **보는 값 자체를 부위별
     보유 종수로 갈아** 같은 위험을 없앴다. 물음은 한 글자도 안 바뀌었다 —
     «무기를 아무리 뽑아도 방패·목걸이 미션이 저절로 달성되면 안 된다». */
  console.log('§6 ★ 반증 — 무기를 여러 개 가져도 방패·목걸이 미션은 공짜로 달성되지 않는다');
  await reset(p);
  await p.evaluate(() => {
    S.cnt.sumEquip = 5;                                        /* 옛 공유 카운터도 크게 */
    EQUIPS.filter(e => e.slot === 'weapon').slice(0, 4)
          .forEach(e => S.own[e.id] = { n:0, l:1 });           /* 무기만 4종 보유 */
  });
  await goMission(p, 2);
  s = await snap(p);
  eq('§6 «무기 1종 보유하기» 는 실제로 달성된다', s.ready, true);
  for (const [i, n] of [[5, '방패 1종 보유하기'], [6, '목걸이 1종 보유하기']]) {
    await goMission(p, i);
    s = await snap(p);
    eq(`§6 «${n}» 문구`, s.name, n);
    eq(`§6 «${n}» 은 공짜 달성이 아니다 — (0/1)`, s.pg, '(0/1)');
    ok(!s.ready && s.dis === true, `§6 «${n}» 미완료 유지`, s.label);
  }
  /* 그 부위를 실제로 하나 얻으면 정상적으로 달성된다 */
  await goMission(p, 5);
  await p.evaluate(() => { S.own[EQUIPS.find(e => e.slot === 'shield').id] = { n:0, l:1 }; drawTuto(); });
  s = await snap(p);
  ok(s.ready, '§6 그 뒤 방패를 실제로 하나 얻으면 달성된다', s.pg + ' ' + s.label);
  /* 그리고 목걸이는 **여전히** 미완료다 — 부위끼리 새지 않는다 */
  await goMission(p, 6);
  s = await snap(p);
  ok(!s.ready, '§6 방패를 얻어도 목걸이 미션은 그대로 미완료', s.pg + ' ' + s.label);

  /* ── §7 ★ 반증 2 — 폐기된 «행위 카운터» 가 아직도 미션을 움직이면 안 된다 ─────
     253 은 여기서 «누적 킬 99만 세이브가 뜨자마자 완료» (LESSONS 61-①)를 델타로 막았다.
     256 은 그 미션들을 아예 **상태 축**(훈련 레벨 · 전투력)으로 갈아 위험의 뿌리를 뽑았다.
     그래서 물음이 뒤집힌다: «S.totalKills·S.upgrades 가 아무리 커도 미션이 안 움직이는가».
     이게 초록이면 옛 카운터는 미션에서 완전히 끊긴 것이다(누가 다시 이으면 빨개진다). */
  console.log('§7 ★ 반증 — 폐기된 행위 카운터(totalKills·upgrades)는 미션을 못 움직인다');
  await reset(p);
  await p.evaluate(() => { S.upgrades = 4000; S.totalKills = 990000; S.cnt.sumSkill = 99;
                           S.cnt.sumEquip = 99; S.cnt.sumRelic = 99; });
  for (const [i, n] of [[4, '훈련 공격력 10레벨 도달'], [15, '훈련 공격력 80레벨 도달'],
                        [7, '전투력 5000 도달하기'], [0, '스킬 2종 보유하기'],
                        [11, '유물 1종 보유하기']]) {
    await goMission(p, i);
    s = await snap(p);
    eq(`§7 «${n}» 문구`, s.name, n);
    ok(/^\(0\//.test(s.pg) || !s.ready, `§7 «${n}» 옛 카운터로는 안 움직인다`, s.pg + ' ' + s.label);
  }
  /* 대신 «상태» 를 실제로 올리면 정확히 그 자리에서 달성된다 — 경계 한 칸 아래/위 */
  const G2 = await p.evaluate(() => ({ a1: GUIDE[4].goal, a2: GUIDE[15].goal }));
  for (const [i, goal] of [[4, G2.a1], [15, G2.a2]]) {
    await reset(p);
    await p.evaluate(v => { S.lv.atk = v; }, goal - 1);
    await goMission(p, i);
    s = await snap(p);
    ok(!s.ready, `§7 훈련 공격력 Lv ${goal - 1} 에서는 미달성 (목표 ${goal})`, s.pg);
    await p.evaluate(v => { S.lv.atk = v; drawTuto(); }, goal);
    s = await snap(p);
    ok(s.ready, `§7 훈련 공격력 Lv ${goal} 에서 정확히 달성`, s.pg + ' ' + s.label);
  }

  /* ── §8 세이브 ───────────────────────────────────────────────── */
  console.log('§8 세이브 — GUIDE_V=6 · 진행 라운드트립 · 이관이 진행을 안 되돌린다');
  /* 253 은 버전을 안 올렸다(델타 기준선이 리셋되므로). 256 은 8개의 get() 을 갈았으므로
     규약대로 올린다 — 델타가 없어져 이관(prog=-1)이 무해해졌기 때문에 올릴 수 있다. */
  eq('§8 GUIDE_V = 6 (256 이 목표축을 갈면서 올렸다)', await p.evaluate(() => GUIDE_V), 6);
  const rt = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.lv.atk = GUIDE[4].goal - 3; S.guide.idx = 4; S.guide.gv = GUIDE_V; S.guide.prog = -1;
    gmStart();
    save(); load();                              /* 153 교훈 ①② — 같은 페이지에서 save→load */
    drawTuto();
    return { lv: S.lv.atk | 0, goal: GUIDE[4].goal,
             pg: document.getElementById('tutoPg').textContent.trim(), idx: S.guide.idx };
  });
  eq('§8 복원 후에도 같은 미션', rt.idx, 4);
  eq('§8 복원 후 진행이 상태 그대로다', rt.pg, `(${rt.lv}/${rt.goal})`);
  /* ★ 253-③ 의 반대편 — 옛 gv 세이브가 «이관» 을 타도 진행이 0 으로 되돌아가면 안 된다.
     (256 은 그 안전성을 근거로 버전을 올렸다. 근거가 무너지면 여기가 빨개진다) */
  const mig6 = await p.evaluate(() => {
    const KEY = Object.keys(localStorage).find(k => /idle_hunter_save/.test(k)) || 'idle_hunter_save_v4';
    const goal = GUIDE[4].goal, cur = goal - 3;
    localStorage.setItem(KEY, JSON.stringify({ guide: { idx: 4, prog: 0, gv: 5 }, lv: { atk: cur }, dia: 100 }));
    load(); drawTuto();
    return { gv: S.guide.gv, idx: S.guide.idx, prog: S.guide.prog, goal, cur,
             pg: document.getElementById('tutoPg').textContent.trim() };
  });
  eq('§8 gv 5 세이브가 6 으로 이관된다', mig6.gv, 6);
  eq('§8 이관해도 같은 미션(idx 불변)', mig6.idx, 4);
  eq('§8 ★ 이관해도 진행이 0 으로 안 되돌아간다', mig6.pg, `(${mig6.cur}/${mig6.goal})`);

  /* ── §9 콘솔 ─────────────────────────────────────────────────── */
  console.log('§9 콘솔');
  ok(errs.length === 0, `§9 콘솔 에러 0건 — ${errs.length ? errs.slice(0, 2).join(' | ') : '없음'}`);

  await browser.close();
  console.log(`\nVERIFY253 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
