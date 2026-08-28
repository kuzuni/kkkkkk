#!/usr/bin/env node
/* 326 검증 — 23 훈련 단계 요구치는 «고정 300» 이 아니라 «증가식» 이다.
 *
 *   node tools/verify326.js
 *
 * 주인 지시(2026-08-28): «훈련단계 계속 300 채워지면 올라가게 되있는데 600, 900 이런식으로
 *   점점 늘어나는식으로. 각각의 스탯들 업글을 200 300 이런식으로 업글해야 훈련단계 업글되는 그런식».
 *
 * 계약 한 줄 — **단계 n 을 돌파하는 «그 단계 몫» 은 스탯당 100×n (3종 합 300×n)** 이고,
 *   따라서 상한은 그 몫의 누적합 `trainCapAt(n) = 100·n(n+1)/2` 다.
 *     n:   1    2    3    4     5
 *     몫:  100  200  300  400   500     ← 주인이 말한 «200 300 이런식»
 *     cap: 100  300  600  1000  1500
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로 둔다):
 *   [A] 몫 항등식 — 어느 단계에서도 `cap(n) − cap(n−1) = 100n` (제품 함수를 **직접** 불러 전수)
 *   [B] 되돌림 감시 — 구식(단계×100)이 다시 깔리면 여기서 빨개진다. 단계 2·3 의 상한이
 *       200·300 이 **아니어야** 하고 300·600 이어야 한다.
 *   [C] 진행도 분모 = 300×단계 (183 규약 «단계 업 직후 0» 은 그대로 — 눈금만 길어진다)
 *   [D] **실제로 사고 눌러서** 단계를 올린다 — 1단계 300 → 2단계 600 → 3단계 900 이
 *       «클릭으로 도달 가능한 경로» 인지를 헤드리스로 밟는다(기능 완성 규칙 2026-08-25).
 *       각 단계에서 «상한 −1 이면 [↑] 안 열림 · 상한이면 열림» 도 같이 본다.
 *   [E] 구매 경로가 새 상한을 존중한다 — x30 이 상한을 넘겨 사지 않고, 상한에서는 «상한» 표시
 *   [F] **세이브 이관이 «없음» 이 맞다** — 구 세이브(구 상한까지 채운 값)를 넣어도 레벨이
 *       깎이거나 단계가 강등되지 않는다. n≥1 에서 구 상한 100n ≤ 신 상한 100·n(n+1)/2 이므로.
 *   [G] 안 건드린 축 — TRAIN_CAP_STEP 100 · TRAIN_BONUS 0.10 · 단계 보너스 적용식
 *   [H] 콘솔·페이지 에러 0
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

/* 기대값은 제품(`trainCapAt`)을 부르지 않고 **여기서 다시 적는다** — 같은 함수를 불러 비교하면
   게이트가 «자기 자신» 을 재게 되고, 식이 통째로 틀려도 초록이 된다(LESSONS 333-③ 와 같은 함정). */
const CAP  = n => 100 * n * (n + 1) / 2;      /* 단계 n 까지의 스탯당 누적 상한 */
const STEP = n => 100 * n;                    /* 단계 n «그 단계 몫»(스탯당) */
const DEN  = n => 300 * n;                    /* 진행도 분모(3종 합) */
const OLDCAP = n => 100 * n;                  /* 구식 — 되돌림 감시용 */

/* 결정적 초기 상태 — 전투 루프를 세우고(킬 골드·자동구매로 레벨이 흔들린다) 훈련 상태를 심는다 */
async function setup(page, o){
  const wasOpen = await page.evaluate(cfg => {
    step = () => {};
    S.autoBuy = false;
    S.trainStage = cfg.stage;
    S.lv.atk = cfg.atk; S.lv.hp = cfg.hp; S.lv.regen = cfg.regen;
    S.gold = 1e30;
    S.buyQty = cfg.qty || 1;
    save();
    const was = $('trw').classList.contains('on');
    if (!was) openTrain(); else renderTrain();
    return was;
  }, o);
  await page.waitForTimeout(wasOpen ? 80 : 420);
}
const head = page => page.evaluate(() => ({
  prog: $('trProg').textContent,
  rib:  $('trRib').textContent,
  up:   $('trUp').classList.contains('on'),
  stage: S.trainStage | 0,
  lv: { atk: S.lv.atk | 0, hp: S.lv.hp | 0, regen: S.lv.regen | 0 },
  cap: trainCap(), base: trainBase(), max: trainMax(), ready: trainReady(),
}));

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

  /* ---- [A] 몫 항등식 ---- */
  console.log('[A] 단계 몫 항등식 — cap(n) − cap(n−1) = 100n (단계 1~20 전수)');
  const caps = await page.evaluate(() => {
    const out = [];
    for (let n = 0; n <= 20; n++) out.push(trainCapAt(n));
    return out;
  });
  eq('  cap(0) = 0 (0단계 = 아직 아무 몫도 없다)', caps[0], 0);
  let idOk = true, capOk = true;
  for (let n = 1; n <= 20; n++) {
    if (caps[n] - caps[n - 1] !== STEP(n)) idOk = false;
    if (caps[n] !== CAP(n)) capOk = false;
  }
  ok('  단계 1~20 전수 — 몫이 정확히 100n', idOk,
     '1..5 몫 ' + [1,2,3,4,5].map(n => caps[n] - caps[n-1]).join('·'));
  ok('  단계 1~20 전수 — 상한이 누적합 100·n(n+1)/2', capOk,
     '1..5 cap ' + [1,2,3,4,5].map(n => caps[n]).join('·'));
  eq('  주인이 말한 «200 300 이런식» — 2단계 몫', caps[2] - caps[1], 200);
  eq('  주인이 말한 «200 300 이런식» — 3단계 몫', caps[3] - caps[2], 300);

  /* ---- [B] 되돌림 감시 ---- */
  console.log('[B] 되돌림 감시 — 구식(단계×100)이 다시 깔리면 여기서 빨개진다');
  for (const n of [2, 3, 5]) {
    ok('  단계 ' + n + ' 상한이 구식 ' + OLDCAP(n) + ' 이 아니다', caps[n] !== OLDCAP(n), 'cap ' + caps[n]);
    eq('  단계 ' + n + ' 상한', caps[n], CAP(n));
  }
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  ok('  index.html 에 구식 `trainStage() * TRAIN_CAP_STEP` 상한식이 없다',
     !/trainCap\s*=\s*\(\)\s*=>\s*trainStage\(\)\s*\*\s*TRAIN_CAP_STEP/.test(src));
  ok('  index.html 에 고정 분모 `TRAIN_STATS.length * TRAIN_CAP_STEP;` 이 없다',
     !/trainMax\s*=\s*\(\)\s*=>\s*TRAIN_STATS\.length\s*\*\s*TRAIN_CAP_STEP\s*;/.test(src));

  /* ---- [C] 진행도 분모 = 300×단계 ---- */
  console.log('[C] 진행도 분모 = 300×단계 — 300 → 600 → 900 …');
  for (const st of [1, 2, 3, 4, 7]) {
    await setup(page, { stage: st, atk: CAP(st - 1), hp: CAP(st - 1), regen: CAP(st - 1) });
    const h = await head(page);
    eq('  단계 ' + st + ' — 단계 업 직후 진행도', h.prog, '0/' + DEN(st));
    eq('  단계 ' + st + ' — trainMax()', h.max, DEN(st));
    eq('  단계 ' + st + ' — trainBase()', h.base, CAP(st - 1));
    eq('  단계 ' + st + ' — 리본', h.rib, '훈련 ' + st + ' 단계');
  }

  /* ---- [D] 실제로 밟는다 — 1단계 300 → 2단계 600 → 3단계 900 ---- */
  console.log('[D] 클릭 경로 — 상한 −1 에서는 [↑] 안 열리고, 상한을 채우면 열려 단계가 오른다');
  await setup(page, { stage: 1, atk: 0, hp: 0, regen: 0 });
  for (const st of [1, 2, 3]) {
    /* 상한 직전 — 세 스탯 중 하나만 1 모자라게 */
    await setup(page, { stage: st, atk: CAP(st) - 1, hp: CAP(st), regen: CAP(st) });
    const near = await head(page);
    eq('  단계 ' + st + ' — 상한 −1 진행도', near.prog, (DEN(st) - 1) + '/' + DEN(st));
    ok('  단계 ' + st + ' — 1 모자라면 [↑] 안 열린다', !near.up && near.ready === false, 'up ' + near.up);
    /* 그 1 을 실제 구매로 채운다 (x1 — 골드는 넉넉히 심어 뒀다) */
    await page.evaluate(() => { S.buyQty = 1; renderTrain(); });
    await page.click('#trCards > [data-tr="atk"] .cb');
    await page.waitForTimeout(120);
    const full = await head(page);
    eq('  단계 ' + st + ' — [강화] 클릭 1회로 상한 도달', full.lv.atk, CAP(st));
    eq('  단계 ' + st + ' — 진행도가 꽉 찼다(이번 단계 몫 ' + DEN(st) + ')', full.prog, DEN(st) + '/' + DEN(st));
    ok('  단계 ' + st + ' — [↑] 열린다', full.up && full.ready === true, 'up ' + full.up);
    /* [↑] 를 진짜 눌러 단계를 올린다 */
    await page.click('#trUp');
    await page.waitForTimeout(400);
    await page.evaluate(() => { if (typeof closeStatUp === 'function') closeStatUp();
                                const w = $('statw'); if (w) w.classList.remove('on'); });
    await page.waitForTimeout(200);
    const nx = await head(page);
    eq('  단계 ' + st + ' → ' + (st + 1) + ' 상승', nx.stage, st + 1);
    eq('  다음 단계 요구치가 커졌다 — 분모', nx.prog.split('/')[1], String(DEN(st + 1)));
    eq('  다음 단계 상한', nx.cap, CAP(st + 1));
  }

  /* ---- [E] 구매 경로가 새 상한을 존중한다 ---- */
  console.log('[E] 구매 경로 — x30 이 상한을 넘겨 사지 않는다 · 상한에서는 «상한»');
  await setup(page, { stage: 3, atk: CAP(3) - 7, hp: 0, regen: 0, qty: 30 });
  const bi = await page.evaluate(() => trainBuyInfo('atk'));
  eq('  상한까지 7 남았을 때 x30 은 7 개만 산다', bi.n, 7);
  await setup(page, { stage: 3, atk: CAP(3), hp: 0, regen: 0, qty: 30 });
  const full3 = await page.evaluate(() => ({
    bi: trainBuyInfo('atk'),
    btn: document.querySelector('#trCards > [data-tr="atk"] .cb i').textContent,
    val: document.querySelector('#trCards > [data-tr="atk"] .cv i').textContent }));
  ok('  상한이면 살 수 없다', full3.bi.full === true && full3.bi.n === 0, JSON.stringify(full3.bi));
  eq('  상한 카드 버튼 표기', full3.btn, '상한');
  eq('  상한 카드 증가분 표기', full3.val, 'MAX');

  /* ---- [F] 세이브 이관 «없음» 이 맞다 ---- */
  console.log('[F] 구 세이브 이관 — 구 상한(단계×100)까지 채운 값이 그대로 살아 있다');
  for (const st of [2, 4, 8]) {
    await setup(page, { stage: st, atk: OLDCAP(st), hp: OLDCAP(st), regen: OLDCAP(st) });
    const h = await head(page);
    eq('  단계 ' + st + ' — 레벨이 안 깎였다', h.lv.atk, OLDCAP(st));
    eq('  단계 ' + st + ' — 단계가 안 강등됐다', h.stage, st);
    ok('  단계 ' + st + ' — 구 상한 ' + OLDCAP(st) + ' ≤ 신 상한 ' + CAP(st) + ' (넘침 없음)',
       OLDCAP(st) <= h.cap, 'cap ' + h.cap);
    ok('  단계 ' + st + ' — 진행도가 분모를 안 넘는다', (() => {
      const [a, b] = h.prog.split('/').map(Number); return a <= b && a >= 0;
    })(), h.prog);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).lv.atk | 0);
    eq('  단계 ' + st + ' — localStorage 세이브도 그대로', saved, OLDCAP(st));
  }

  /* ---- [G] 안 건드린 축 ---- */
  console.log('[G] 326 이 안 건드린 축 — 계수·보너스·적용식');
  const keep = await page.evaluate(() => {
    S.trainStage = 4;
    return { step: TRAIN_CAP_STEP, bonus: TRAIN_BONUS, stats: TRAIN_STATS.slice(),
             qtys: TRAIN_QTYS.slice(), tb: 1 + TRAIN_BONUS * (trainStage() - 1) };
  });
  eq('  TRAIN_CAP_STEP 불변', keep.step, 100);
  eq('  TRAIN_BONUS 불변', keep.bonus, 0.1);
  eq('  훈련 3종 불변', keep.stats.join(','), 'atk,hp,regen');
  eq('  구매 단위 불변', keep.qtys.join(','), '1,10,30');
  ok('  단계 보너스 적용식 불변 — 4단계 = 1.3', Math.abs(keep.tb - 1.3) < 1e-9, String(keep.tb));

  /* ---- [H] 콘솔 ---- */
  console.log('[H] 콘솔');
  ok('  콘솔 error / pageerror 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY326 PASS ' : 'VERIFY326 FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
