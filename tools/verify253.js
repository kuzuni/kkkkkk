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
     §5 나머지 6개 스킬 소환·던전·룰렛·유물 소환·도감 보너스·보스 처치도 «이미 해 둔 상태 → 즉시 달성».
     §6 ★ 반증 1   소환 3종은 abs 가 아니다 — 무기를 뽑아 sumEquip 을 올려도 방패·목걸이 미션은 (0/1).
                   (abs 로 돌리면 체인 두 칸이 공짜로 사라진다 — 그래서 델타로 남겼다)
     §7 ★ 반증 2   «훈련 10회»·«훈련 30회»·«적 100마리» 는 여전히 델타 — 누적이 아무리 커도 (0/goal).
                   (LESSONS 61-① «누적 킬 99만 세이브가 뜨자마자 완료» 방지. 개편은 등재 256 몫)
     §8 세이브     GUIDE_V 는 5 그대로(올리면 델타 미션 기준선이 리셋돼 진행이 되돌아간다) ·
                   진행 중이던 델타 미션의 기준선이 save→load 라운드트립에서 유지된다.
     §9 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* 253 의 판정표 — «미션 이름 → abs 여야 하는가». 이 표가 이 작업의 사양 그 자체다. */
const WANT_ABS = {
  '스킬 1회 소환하기':   true,   /* cnt.sumSkill  — 전용 */
  '스킬 장착하기':       true,   /* 61 부터 abs */
  '무기 1회 소환하기':   false,  /* cnt.sumEquip  — 3종 공유라 abs 불가 */
  '장비 장착하기':       true,
  '훈련 10회 하기':      false,  /* goal>1 «n회 더» */
  '방패 1회 소환하기':   false,  /* cnt.sumEquip 공유 */
  '목걸이 1회 소환하기': false,  /* cnt.sumEquip 공유 */
  '적 100마리 처치하기': false,  /* goal>1 */
  '스테이지 5 도달하기': true,
  '던전 1회 입장하기':   true,   /* cnt.dungeon */
  '룰렛 1회 돌리기':     true,   /* cnt.spins */
  '유물 1회 소환하기':   true,   /* cnt.sumRelic */
  '아이템 1회 강화하기': true,   /* ★ cnt.levelUps — 주인 보고분 */
  '스테이지 15 도달하기':true,
  '유물 Lv 3 모으기':    true,
  '훈련 30회 하기':      false,  /* goal>1 */
  '스테이지 25 도달하기':true,
  '도감 보너스 1회 받기':true,   /* collSteps() — 상태값 */
  '보스 1회 처치하기':   true,   /* bossCleared() — 상태값 */
  '스테이지 40 도달하기':true
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
  /* 규칙 자체를 잠근다 — 새 미션이 들어와도 «goal 1 인데 델타» 는 sumEquip 3종뿐이어야 한다 */
  const shared = G.filter(m => m.goal === 1 && !m.abs).map(m => m.n).sort().join(',');
  eq('§1 goal:1 인데 델타인 미션 = sumEquip 공유 3종뿐', shared,
     ['무기 1회 소환하기', '방패 1회 소환하기', '목걸이 1회 소환하기'].sort().join(','));

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
  const CASES = [
    { i: 0,  n: '스킬 1회 소환하기',   set: () => { S.cnt.sumSkill = 2; } },
    { i: 9,  n: '던전 1회 입장하기',   set: () => { S.cnt.dungeon = 4; } },
    { i: 10, n: '룰렛 1회 돌리기',     set: () => { S.cnt.spins = 1; } },
    { i: 11, n: '유물 1회 소환하기',   set: () => { S.cnt.sumRelic = 7; } },
    { i: 18, n: '보스 1회 처치하기',   set: () => { S.best = 26; } }
  ];
  for (const c of CASES) {
    await reset(p);
    await p.evaluate(`(${c.set.toString()})()`);
    await goMission(p, c.i);
    s = await snap(p);
    eq(`§5 «${c.n}» 문구`, s.name, c.n);
    ok(s.ready && s.pg === '(1/1)', `§5 «${c.n}» 이미 해 뒀으면 즉시 달성`, s.pg + ' ' + s.label);
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

  /* ── §6 ★ 반증 1 — 소환 3종은 델타 그대로 ───────────────────── */
  console.log('§6 ★ 반증 — sumEquip 공유 3종은 abs 로 돌리면 안 된다');
  await reset(p);
  await p.evaluate(() => { S.cnt.sumEquip = 5; });   /* 무기를 이미 5번 뽑았다 */
  for (const [i, n] of [[2, '무기 1회 소환하기'], [5, '방패 1회 소환하기'], [6, '목걸이 1회 소환하기']]) {
    await goMission(p, i);
    s = await snap(p);
    eq(`§6 «${n}» 문구`, s.name, n);
    eq(`§6 «${n}» 은 공짜 달성이 아니다 — (0/1)`, s.pg, '(0/1)');
    ok(!s.ready && s.dis === true, `§6 «${n}» 미완료 유지`, s.label);
  }
  /* 그 상자를 실제로 뽑으면 정상적으로 오른다 */
  await goMission(p, 5);
  await p.evaluate(() => { S.cnt.sumEquip++; drawTuto(); });
  s = await snap(p);
  ok(s.ready, '§6 그 뒤 실제로 1번 더 뽑으면 달성된다', s.pg + ' ' + s.label);

  /* ── §7 ★ 반증 2 — «n회 더» 형은 델타 그대로 ────────────────── */
  console.log('§7 ★ 반증 — goal>1 «n회 더» 미션은 누적으로 판정하지 않는다');
  await reset(p);
  await p.evaluate(() => { S.upgrades = 4000; S.totalKills = 990000; });
  for (const [i, n, g] of [[4, '훈련 10회 하기', 10], [15, '훈련 30회 하기', 30], [7, '적 100마리 처치하기', 100]]) {
    await goMission(p, i);
    s = await snap(p);
    eq(`§7 «${n}» 문구`, s.name, n);
    eq(`§7 «${n}» 누적이 커도 (0/${g})`, s.pg, `(0/${g})`);
    ok(!s.ready, `§7 «${n}» 미완료 유지 (LESSONS 61-①)`, s.label);
  }
  await p.evaluate(() => { S.totalKills += 100; drawTuto(); });
  await goMission(p, 7);
  await p.evaluate(() => { S.totalKills += 100; drawTuto(); });
  s = await snap(p);
  eq('§7 «적 100마리» 는 100 «더» 잡으면 달성', s.pg, '(100/100)');

  /* ── §8 세이브 ───────────────────────────────────────────────── */
  console.log('§8 세이브 — GUIDE_V 불변 · 델타 기준선 라운드트립');
  eq('§8 GUIDE_V = 5 (253 은 버전을 올리지 않는다)', await p.evaluate(() => GUIDE_V), 5);
  const rt = await p.evaluate(() => {
    Object.assign(S, DEF());
    S.upgrades = 500; S.guide.idx = 4; S.guide.gv = GUIDE_V; S.guide.prog = -1;
    gmStart();                                   /* 기준선 = 500 */
    const before = S.guide.prog;
    S.upgrades += 7; save(); load();             /* 153 교훈 ①② — 같은 페이지에서 save→load */
    drawTuto();
    return { before, after: S.guide.prog, pg: document.getElementById('tutoPg').textContent.trim() };
  });
  eq('§8 델타 기준선이 저장·복원된다', rt.after, rt.before);
  eq('§8 복원 후 진행이 유지된다 (7/10)', rt.pg, '(7/10)');

  /* ── §9 콘솔 ─────────────────────────────────────────────────── */
  console.log('§9 콘솔');
  ok(errs.length === 0, `§9 콘솔 에러 0건 — ${errs.length ? errs.slice(0, 2).join(' | ') : '없음'}`);

  await browser.close();
  console.log(`\nVERIFY253 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
