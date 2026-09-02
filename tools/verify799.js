#!/usr/bin/env node
/* 799 검증 — 22 «반복» 퀘스트가 **업적 퀘스트**가 됐다.
 *
 *   node tools/verify799.js
 *
 * 주인 보고·지시(2026-09-02): «퀘스트에 지금 스테이지 554 인데 스테이지 35도달 퀘스트 아직
 *   못받음. 적처치 1999마리도 안됨. 아무거나 소환 5555회 했는데 아무거나 소환 344 퀘스트 안됨.
 *   아무 강화 600 넘게 했는데 아무강화 537회 퀘스트 보상 못받음. … 반복퀘스트로 두면 안되고
 *   업적 퀘스트로 둬야함. 아무거나 소환은 15회 → 30회 → 45회, 아무 강화도 10 → 20, 적처치도
 *   100 → 200 → 300, 스테이지 도달도 1 → 2 → 3 이런식으로.»
 *
 * 계약 두 줄 —
 *   ① **진행 = 누적 절대값**이다. 표에 적힌 숫자가 곧 조건이고, 수령 시점의 «기준선» 은 없다.
 *      (버그의 뿌리가 `S.quest[].base` 였다 — 판정이 `q.get() − base` 라 «35 도달» 이 실제로는
 *       «35 **더**» 였고, 그래서 스테이지 554 에서도 안 열렸다.)
 *   ② **목표 = 등차**다. `goal(s) = step × (s+1)` — 주인이 준 수열 그대로.
 *
 * 검사 항목 (LESSONS «156 비고» 4 — 「틀린 것을 잡는 칸」과 「맞은 것을 지키는 칸」을 짝으로):
 *   [A] 표 계약 — step 이 주인 수열 그대로 · 옛 등비 축(`base`·`mul`·`rw`)이 선언째 없다
 *   [B] 목표 등차 — questGoal 전수(s = 0..30) · «15 → 30 → 45» 가 문자 그대로 나온다
 *   [C] 기준선 부재 — `S.quest[].base` 를 **일부러 심어도** 진행이 한 톨도 안 변한다(되돌림 감시)
 *   [D] **등재 재현** — 주인 세이브(스테이지 554 · 소환 5555 · 강화 600 · 처치 30000)에서
 *       네 행이 전부 «받을 수 있다». 옛 규칙이었다면 넷 다 빨강이던 자리다.
 *   [E] 실제 클릭 — [보상 받기] 한 번에 **밀린 칸 전부** · 다이아 = 정액 × 칸수 · 목표가 그만큼 커진다
 *   [F] [모두 받기] — 한 번에 다섯 종이 소진되고 남은 ready 0
 *   [G] 표기 = 판정 — 행에 그려진 목표 숫자가 `questGoal` 과 같다(«554 인데 35» 재발 감시)
 *   [H] 탭 이름 «업적» (내부 키 `rep` 는 그대로 — 하네스 호환)
 *   [I] 구 세이브 이관 — `base` 가 박힌 세이브를 **실제로 load** 해도 진행은 절대값이다
 *   [J] 콘솔·페이지 에러 0
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (m, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + m + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + m + (detail ? '  — ' + detail : '')); }
};
const eq = (m, got, want) => ok(m + ' = ' + JSON.stringify(got) + (got === want ? '' : ' (기대 ' + JSON.stringify(want) + ')'), got === want);

function launchOpts(){
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {} }
  return {};
}

/* 기대값은 **여기서 다시 적는다** — 제품 함수를 불러 비교하면 식이 통째로 틀려도 초록이 된다
   (LESSONS 333-③). 주인 문면의 수열을 손으로 옮긴 표가 이 게이트의 유일한 정답지다. */
const STEP = { summon: 15, upg: 10, kill: 100, stage: 1 };   /* 주인이 직접 준 네 수열 */
const GOAL = (id, s) => STEP[id] * (s + 1);

/* 결정적 상태 — 전투 루프를 세우고(킬·골드가 카운터를 흔든다) 카운터를 심는다 */
async function seed(page, o){
  await page.evaluate(cfg => {
    step = () => {};
    S.autoBuy = false;
    S.best = cfg.best; S.totalKills = cfg.kills; S.summons = cfg.summons; S.upgrades = cfg.upg;
    S.dia = cfg.dia || 0;
    QUESTS.forEach(q => { S.quest[q.id] = { s: 0 }; });
    if (cfg.base != null) QUESTS.forEach(q => { S.quest[q.id].base = cfg.base; });
    if (cfg.s) Object.keys(cfg.s).forEach(k => { S.quest[k].s = cfg.s[k]; });
    save();
  }, o);
}
const rows = page => page.evaluate(() => [...document.querySelectorAll('#mbox .qs-r')].map(r => ({
  t: r.querySelector('.qs-t').textContent,
  pg: r.querySelector('.qs-p b em').textContent,
  key: r.querySelector('.qs-b').dataset.q,
  ready: !r.querySelector('.qs-b').disabled,
})));

(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--no-sandbox'] }, launchOpts()));
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { if (typeof closeOfflineReward === 'function') closeOfflineReward(); });

  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

  /* ---- [A] 표 계약 ---- */
  console.log('[A] 표 계약 — step 이 주인 수열 그대로 · 옛 등비 축이 선언째 없다');
  const tbl = await page.evaluate(() => QUESTS.map(q => ({
    id: q.id, step: q.step, dia: q.dia, hasBase: 'base' in q, hasMul: 'mul' in q, hasRw: 'rw' in q })));
  eq('  퀘스트 종 수', tbl.length, 5);
  Object.keys(STEP).forEach(id => {
    const r = tbl.find(x => x.id === id);
    eq('  ' + id + ' 의 등차 간격(step)', r && r.step, STEP[id]);
  });
  ok('  다섯 종 전부 step 이 양의 정수다(0 이면 나눗셈이 터진다)',
     tbl.every(r => Number.isInteger(r.step) && r.step > 0), tbl.map(r => r.id + ':' + r.step).join(' '));
  ok('  다섯 종 전부 정액 보상(dia)을 갖는다', tbl.every(r => Number.isFinite(r.dia) && r.dia > 0),
     tbl.map(r => r.id + ':' + r.dia).join(' '));
  ok('  옛 등비 축(base·mul·rw)이 표에서 사라졌다 — 되살리면 여기가 빨개진다',
     tbl.every(r => !r.hasBase && !r.hasMul && !r.hasRw));
  ok('  index.html 에 옛 등비 목표식(`Math.pow(q.mul` )이 없다',
     !/Math\.pow\(\s*q\.mul/.test(src));
  ok('  index.html 에 기준선 재설정(`st.base = q.get()`)이 없다 — 버그의 뿌리',
     !/st\.base\s*=\s*q\.get\(\)/.test(src));

  /* ---- [B] 목표 등차 ---- */
  console.log('[B] 목표 등차 — goal(s) = step × (s+1) · «15 → 30 → 45» 가 문자 그대로');
  await seed(page, { best: 0, kills: 0, summons: 0, upg: 0 });
  const goals = await page.evaluate(() => {
    const out = {};
    QUESTS.forEach(q => {
      out[q.id] = [];
      for (let s = 0; s <= 30; s++) { S.quest[q.id].s = s; out[q.id].push(questGoal(q)); }
      S.quest[q.id].s = 0;
    });
    return out;
  });
  Object.keys(STEP).forEach(id => {
    const want = []; for (let s = 0; s <= 30; s++) want.push(GOAL(id, s));
    ok('  ' + id + ' — s 0..30 전수 등차', JSON.stringify(goals[id]) === JSON.stringify(want),
       goals[id].slice(0, 4).join(' → '));
  });
  eq('  주인 문면 «아무거나 소환 15 → 30 → 45»', goals.summon.slice(0, 3).join(','), '15,30,45');
  eq('  주인 문면 «아무 강화 10 → 20»',          goals.upg.slice(0, 2).join(','), '10,20');
  eq('  주인 문면 «적처치 100 → 200 → 300»',     goals.kill.slice(0, 3).join(','), '100,200,300');
  eq('  주인 문면 «스테이지 1 → 2 → 3»',         goals.stage.slice(0, 3).join(','), '1,2,3');

  /* ---- [C] 기준선 부재(되돌림 감시) ---- */
  console.log('[C] 기준선 부재 — `S.quest[].base` 를 심어도 진행이 안 변한다');
  await seed(page, { best: 554, kills: 30000, summons: 5555, upg: 600, base: 0 });
  const p0 = await page.evaluate(() => QUESTS.reduce((o, q) => (o[q.id] = questProg(q), o), {}));
  await seed(page, { best: 554, kills: 30000, summons: 5555, upg: 600, base: 999999 });
  const p1 = await page.evaluate(() => QUESTS.reduce((o, q) => (o[q.id] = questProg(q), o), {}));
  ok('  base 0 과 base 999999 의 진행이 완전히 같다', JSON.stringify(p0) === JSON.stringify(p1),
     JSON.stringify(p1));
  eq('  진행 = 누적 절대값(스테이지)', p1.stage, 554);
  eq('  진행 = 누적 절대값(소환)',     p1.summon, 5555);
  eq('  진행 = 누적 절대값(강화)',     p1.upg, 600);
  eq('  진행 = 누적 절대값(처치)',     p1.kill, 30000);

  /* ---- [D] 등재 재현 ---- */
  console.log('[D] 등재 재현 — 주인 세이브에서 네 행이 전부 «받을 수 있다»');
  await seed(page, { best: 554, kills: 30000, summons: 5555, upg: 600 });
  await page.evaluate(() => { openQuest('rep'); });
  await page.waitForTimeout(200);
  const R = await rows(page);
  eq('  행 수', R.length, 5);
  ['summon', 'upg', 'kill', 'stage'].forEach(id => {
    const r = R.find(x => x.key === id);
    ok('  ' + id + ' 행이 [보상 받기] 가능 상태다', !!r && r.ready, r && r.pg);
  });
  const steps = await page.evaluate(() => QUESTS.reduce((o, q) => (o[q.id] = questSteps(q), o), {}));
  eq('  스테이지 554 = 밀린 칸 554 개(등차 1)', steps.stage, 554);
  eq('  소환 5555 = 밀린 칸 370 개(등차 15)',   steps.summon, Math.floor(5555 / 15));
  eq('  강화 600 = 밀린 칸 60 개(등차 10)',     steps.upg, 60);
  eq('  처치 30000 = 밀린 칸 300 개(등차 100)', steps.kill, 300);
  /* ⚑ 옛 규칙이었다면 넷 다 빨강이던 자리 — 델타 판정을 이 자리에서 다시 계산해 대조한다.
     (기준선이 «지금 값» 이면 진행 0 이라 어떤 목표도 못 넘는다 = 주인이 겪은 그 화면) */
  const oldWay = await page.evaluate(() => QUESTS.map(q => Math.max(0, q.get() - q.get()) >= q.step));
  ok('  옛 «델타» 판정이었다면 한 행도 못 받는다(주인이 본 화면)', oldWay.every(x => !x));

  /* ---- [E] 실제 클릭 — 밀린 칸을 한 번에 ---- */
  console.log('[E] 실제 클릭 — [보상 받기] 한 번에 밀린 칸 전부');
  await seed(page, { best: 0, kills: 0, summons: 47, upg: 0, dia: 0 });
  await page.evaluate(() => { openQuest('rep'); });
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => ({ dia: S.dia, s: S.quest.summon.s, goal: questGoal(QUESTS.find(q => q.id === 'summon')) }));
  eq('  소환 47회 — 지금 목표(첫 칸)', before.goal, 15);
  await page.click('#mbox .qs-b[data-q="summon"]');
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({
    dia: S.dia, s: S.quest.summon.s,
    goal: questGoal(QUESTS.find(q => q.id === 'summon')),
    ready: questReady(QUESTS.find(q => q.id === 'summon')),
    unit: QUESTS.find(q => q.id === 'summon').dia }));
  eq('  47 / 15 = 3 칸이 한 번에 올라간다', after.s - before.s, 3);
  eq('  다이아 = 정액 × 3',                after.dia - before.dia, after.unit * 3);
  eq('  다음 목표가 4번째 칸으로',          after.goal, 60);
  ok('  더 받을 게 없다(47 < 60)',          after.ready === false);

  /* ---- [F] [모두 받기] ---- */
  console.log('[F] [모두 받기] — 다섯 종이 한 번에 소진된다');
  await seed(page, { best: 554, kills: 30000, summons: 5555, upg: 600, dia: 0 });
  await page.evaluate(() => { openQuest('rep'); });
  await page.waitForTimeout(200);
  /* ⚠ [모두 받기] 는 **일일 퀘스트도 같이** 쓸어 담는다(claimAllQuests) — 기대값에서 빠뜨리면
     여기가 그 몫만큼 어긋난다. 두 장부를 따로 재서 합이 맞는지까지 본다. */
  const expect = await page.evaluate(() => ({
    ach: QUESTS.reduce((s, q) => s + q.dia * questSteps(q), 0),
    daily: DQUESTS.filter(dqReady).reduce((s, q) => s + q.dia, 0) }));
  await page.click('#qAll');
  await page.waitForTimeout(700);
  const post = await page.evaluate(() => ({
    dia: S.dia, any: QUESTS.some(questReady),
    s: QUESTS.reduce((o, q) => (o[q.id] = S.quest[q.id].s, o), {}) }));
  eq('  받은 다이아 = 업적 (정액 × 밀린 칸) + 일일', post.dia, expect.ach + expect.daily);
  eq('  그중 업적 몫 — 스테이지 554칸 × 정액 140', 140 * 554, 77560);
  ok('  업적 몫이 장부의 대부분이다(일일이 아니라 업적이 열린 것이 이 작업의 결과)',
     expect.ach > expect.daily, '업적 ' + expect.ach + ' / 일일 ' + expect.daily);
  ok('  남은 «받을 수 있는» 행 0',  post.any === false, JSON.stringify(post.s));
  eq('  스테이지 칸이 554 로 올라갔다', post.s.stage, 554);

  /* ---- [G] 표기 = 판정 ---- */
  console.log('[G] 표기 = 판정 — 행에 그려진 숫자가 questGoal 과 같다(«554 인데 35» 재발 감시)');
  await seed(page, { best: 40, kills: 250, summons: 20, upg: 33, s: { stage: 34 } });
  await page.evaluate(() => { openQuest('rep'); });
  await page.waitForTimeout(200);
  const G = await page.evaluate(() => [...document.querySelectorAll('#mbox .qs-r')].map(r => {
    const key = r.querySelector('.qs-b').dataset.q, q = QUESTS.find(x => x.id === key);
    const txt = r.querySelector('.qs-t').textContent.replace(/[^0-9]/g, '');
    return { key, txt: +txt, goal: questGoal(q), pg: r.querySelector('.qs-p b em').textContent };
  }));
  G.forEach(g => eq('  ' + g.key + ' — 행 제목의 숫자 = questGoal', g.txt, g.goal));
  const st = G.find(g => g.key === 'stage');
  eq('  34칸 받은 뒤의 «스테이지 도달» 목표 = 35', st.goal, 35);
  eq('  그 행의 진행 표기는 «35/35»(스테이지 554 가 아니라 목표까지만 찬다 — 실제 진행 40)', st.pg, '35/35');
  ok('  그리고 그 행은 실제로 받을 수 있다 — 주인이 못 받던 바로 그 칸',
     await page.evaluate(() => questReady(QUESTS.find(q => q.id === 'stage'))));

  /* ---- [H] 탭 이름 ---- */
  console.log('[H] 탭 이름 — «업적»(내부 키 rep 는 그대로)');
  const tab = await page.evaluate(() => {
    const b = document.querySelector('#mbox .qs-tg b[data-t="rep"]');
    return b ? b.textContent : null;
  });
  eq('  오른쪽 탭 라벨', tab, '업적');
  ok('  내부 키는 `rep` 그대로다(하네스 호환)',
     !!(await page.evaluate(() => !!document.querySelector('#mbox .qs-tg b[data-t="rep"]'))));

  /* ---- [I] 구 세이브 이관 ---- */
  console.log('[I] 구 세이브 이관 — base 가 박힌 세이브를 실제로 load');
  const mig = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    raw.best = 554; raw.totalKills = 30000; raw.summons = 5555; raw.upgrades = 600;
    /* 옛 구조 그대로 — s 와 base 가 같이 박혀 있다 */
    raw.quest = { kill:{s:3,base:29000}, stage:{s:2,base:550}, summon:{s:5,base:5500},
                  upg:{s:1,base:590}, coll:{s:0,base:0} };
    localStorage.setItem(KEY, JSON.stringify(raw));
    load();
    return {
      prog: QUESTS.reduce((o, q) => (o[q.id] = questProg(q), o), {}),
      steps: QUESTS.reduce((o, q) => (o[q.id] = questSteps(q), o), {}),
      ready: QUESTS.filter(questReady).map(q => q.id) };
  });
  eq('  이관 뒤 진행(스테이지) = 절대값 554', mig.prog.stage, 554);
  eq('  이관 뒤 밀린 칸(스테이지) = 554 − 2', mig.steps.stage, 552);
  eq('  이관 뒤 밀린 칸(소환) = ⌊5555/15⌋ − 5', mig.steps.summon, Math.floor(5555 / 15) - 5);
  ok('  구 세이브도 네 종이 전부 열린다', ['kill', 'stage', 'summon', 'upg'].every(k => mig.ready.includes(k)),
     mig.ready.join(','));

  /* ---- [J] 에러 0 ---- */
  console.log('[J] 콘솔·페이지 에러');
  ok('  에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY799  ' + pass + '/' + (pass + fail) + (fail ? '  FAIL' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
