#!/usr/bin/env node
/* 326 검증 — 23 훈련 단계 요구치는 «고정 300» 이 아니다.
 *   ⚑ **517(주인 지시 2026-08-31)이 «어떻게 다른가» 를 갈아 끼웠다** — 326 의 «무한 증가»(몫 300n)를
 *     주인이 구간표(1~4단계 300 · 5~7단계 600 · 8 이후 900)로 번복했다. 326 의 계약 문장
 *     «고정 300 이 아니다» 는 그대로 살아 있고, 그것을 **증언하는 자리**가 옮겨 갔다:
 *     1~4단계는 이제 정말 300 이므로 증거는 **5단계(600)·8단계(900)** 에 있다(333 처방 — 자리를 비우지 않는다).
 *
 *   node tools/verify326.js
 *
 * 주인 지시(2026-08-28): «훈련단계 계속 300 채워지면 올라가게 되있는데 600, 900 이런식으로
 *   점점 늘어나는식으로. 각각의 스탯들 업글을 200 300 이런식으로 업글해야 훈련단계 업글되는 그런식».
 * 주인 지시(2026-08-31 · 517): «훈련에 필요 경험치 / 1~4단계 300 / 5~7단계 600 / 8이후로는 900».
 *
 * 계약 한 줄 — **단계 n 의 «그 단계 몫»(3종 합)은 구간표 값**이고, 상한은 그 몫의 누적합이다.
 *     n:   1    2    3    4    5    6    7    8   9…
 *     몫: 300  300  300  300  600  600  600  900  900   (스탯당 100 / 200 / 300)
 *     cap:100  200  300  400  600  800 1000 1300 1600   (스탯당 누적합)
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로 둔다):
 *   [A] 몫 항등식 — 어느 단계에서도 `cap(n) − cap(n−1) = 몫(n)/3` (제품 함수를 **직접** 불러 전수)
 *   [B] 되돌림 감시 — «어느 단계에서나 300» 이 다시 깔리면 여기서 빨개진다(증거는 5·8단계).
 *   [C] 진행도 분모 = 그 단계 몫 (183 규약 «단계 업 직후 0» 은 그대로 — 눈금 길이만 구간마다 다르다)
 *   [D] **실제로 사고 눌러서** 단계를 올린다 — «클릭으로 도달 가능한 경로» 인지를 헤드리스로 밟는다
 *       (기능 완성 규칙 2026-08-25). 각 단계에서 «상한 −1 이면 [↑] 안 열림 · 상한이면 열림» 도 본다.
 *   [E] 구매 경로가 새 상한을 존중한다 — x30 이 상한을 넘겨 사지 않고, 상한에서는 «상한» 표시
 *   [F] **세이브 이관 — 「없음」 판정은 반만 맞았다**(작업 483 이 정정 · 517 이 양방향으로 넓혔다).
 *       구 세이브를 **실제로 load** 해서 묻는다: ① 레벨은 안 깎인다 ② 단계는 «레벨이 산 만큼»
 *       (자연 단계)으로 정정된다 ③ 신 규칙을 지킨 세이브는 무영향.
 *   [G] 안 건드린 축 — 1단계 몫(스탯당 100) · TRAIN_BONUS 0.10 · 단계 보너스 적용식
 *   [H] 콘솔·페이지 에러 0
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (m, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + m + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + m + (detail ? '  — ' + detail : '')); }
};
const eq = (m, got, want) => ok(m + ' = ' + JSON.stringify(got) + (got === want ? '' : ' (기대 ' + JSON.stringify(want) + ')'), got === want);


/* 기대값은 제품(`trainCapAt`)을 부르지 않고 **여기서 다시 적는다** — 같은 함수를 불러 비교하면
   게이트가 «자기 자신» 을 재게 되고, 식이 통째로 틀려도 초록이 된다(LESSONS 333-③ 와 같은 함정). */
const DEN  = n => (n <= 4 ? 300 : n <= 7 ? 600 : 900);   /* 517 구간표 — 그 단계 몫(3종 합) */
const STEP = n => DEN(n) / 3;                            /* 스탯당 몫 */
const CAP  = n => { let s = 0; for (let k = 1; k <= n; k++) s += STEP(k); return s; };
const FIXED = 300;                            /* 326 이 뒤집은 것 — «어느 단계에서나 300» */
const OLD326 = n => 100 * n * (n + 1) / 2;    /* 326 의 누적합 — 517 이 뒤집은 것(이관 표본용) */

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
  const browser = await launch(chromium, { args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { if (typeof closeOfflineReward === 'function') closeOfflineReward(); });

  /* ---- [A] 몫 항등식 ---- */
  console.log('[A] 단계 몫 항등식 — cap(n) − cap(n−1) = 몫(n)/3 (단계 1~20 전수)');
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
  ok('  단계 1~20 전수 — 몫이 구간표 그대로(스탯당 100·200·300)', idOk,
     '1..9 몫 ' + [1,2,3,4,5,6,7,8,9].map(n => caps[n] - caps[n-1]).join('·'));
  ok('  단계 1~20 전수 — 상한이 그 몫의 누적합', capOk,
     '1..9 cap ' + [1,2,3,4,5,6,7,8,9].map(n => caps[n]).join('·'));
  eq('  주인이 말한 «5~7단계 600» — 5단계 몫(3종 합)', (caps[5] - caps[4]) * 3, 600);
  eq('  주인이 말한 «8이후로는 900» — 8단계 몫(3종 합)', (caps[8] - caps[7]) * 3, 900);
  eq('  «이후» 는 고정이다 — 12단계 몫도 900', (caps[12] - caps[11]) * 3, 900);

  /* ---- [B] 되돌림 감시 ---- */
  console.log('[B] 되돌림 감시 — «어느 단계에서나 300» 이 다시 깔리면 여기서 빨개진다');
  /* ⚠ 증거의 자리가 517 로 옮겼다 — 1~4단계는 이제 정말 300 이라 거기서는 두 규칙이 겹친다.
     갈리는 곳은 5단계(600)와 8단계(900) 다. 그 둘이 이 절의 본체다. */
  for (const n of [5, 8, 12]) {
    ok('  단계 ' + n + ' 몫이 고정 ' + FIXED + ' 이 아니다', DEN(n) !== FIXED && (caps[n] - caps[n-1]) * 3 !== FIXED,
       '몫 ' + (caps[n] - caps[n-1]) * 3);
    eq('  단계 ' + n + ' 상한', caps[n], CAP(n));
  }
  ok('  단계 1~4 는 주인 지시대로 300 이다(겹치는 구간 — 여기서는 두 규칙이 안 갈린다)',
     [1,2,3,4].every(n => (caps[n] - caps[n-1]) * 3 === 300),
     [1,2,3,4].map(n => (caps[n] - caps[n-1]) * 3).join('·'));
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  ok('  index.html 의 분모가 «상수 하나» 가 아니다(구간표 접근자를 지난다)',
     /trainMax\s*=\s*\(\)\s*=>\s*trainNeedAt\(trainStage\(\)\)/.test(src));
  ok('  index.html 에 요구치 식이 두 벌이 아니다 — 표는 한 곳뿐',
     (src.match(/const TRAIN_NEED\s*=/g) || []).length === 1);

  /* ---- [C] 진행도 분모 = 300×단계 ---- */
  console.log('[C] 진행도 분모 = 그 단계 몫 — 300 · 300 · 300 · 300 · 600 …');
  for (const st of [1, 2, 4, 5, 8]) {
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
  /* 517 — 4 → 5 를 넣었다: 몫이 300 에서 600 으로 «바뀌는 경계» 가 이 표의 유일한 계단이다 */
  for (const st of [1, 2, 4]) {
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
  /* 689 이관(2026-09-01) — 주인 지시로 비용 줄 표기가 «상한» → «MAX» 로 뒤집혔다.
     항을 지우지 않고 **방향만** 뒤집는다(333 처방). 알약과 버튼이 이제 같은 말을 하므로
     «둘이 같다» 는 항을 한 줄 더 세워 둔다 — 한쪽만 되돌아가면 여기가 빨개진다. */
  eq('  상한 카드 버튼 표기', full3.btn, 'MAX');
  eq('  상한 카드 증가분 표기', full3.val, 'MAX');
  eq('  상한 카드는 알약·버튼이 같은 표기(689 통일)', full3.btn, full3.val);

  /* ---- [F] 세이브 이관 — 483 이 «없음» 판정을 반만 확인해 줬고 517 이 양방향으로 넓혔다 ----
     원래 이 절은 «이관 없음이 맞다» 를 단언했다. 두 가지가 틀렸다(작업 483):
       ① **레벨 축은 여전히 맞다** — 구 상한 100n ≤ 신 상한이라 레벨이 깎이는 일은 없다.
       ② **단계 축이 틀렸다** — 진행도의 기저 `trainBase()`(= cap(단계−1))도 같이 커져서
          구 규칙으로 자란 세이브(단계 9 · lv 900대)는 `trainLvRel` 이 **0 에 굳는다**.
          483 이 load() 에서 «단계를 레벨이 산 만큼으로 내리는» 이관을 넣었다.
     그리고 이 절은 `setup()` 이 S 를 **직접** 세팅해 로드 경로를 한 번도 안 지났다 —
     그래서 이관이 없든 있든 초록이었다(헛초록). 이제 **실제로 reload 해서** 묻는다. */
  console.log('[F] 구 세이브 실로드 — 레벨은 그대로 · 단계는 «레벨이 산 만큼» 으로 정정된다(483·517)');
  /* 표본을 **326 규칙으로 자란 세이브**(lv = 326 누적합)로 옮겼다 — 326 이 실제로 돌던 동안 생긴
     세이브가 그것이고, 517 이 상한을 줄이면서 넘치는 것도 그것이다. 483 이 보던 «326 이전»
     표본(lv = 100n)은 `verify483` [A]·`verify517` [D] 가 그대로 들고 있다. */
  for (const st of [2, 4, 8]) {
    const L = OLD326(st);
    /* ⚠ LESSONS 363 — `page.reload()` 로는 못 잰다: `beforeunload → save()` 가 방금 심은
       세이브를 현재 S 로 덮어쓴다. **load() 를 직접 부른다**(그것이 이관이 사는 자리다). */
    await page.evaluate(([s, l]) => {
      step = () => {}; S.autoBuy = false;
      localStorage.setItem(KEY, JSON.stringify({
        gold: 1e30, best: 60, a105: 1, autoBuy: false, trainStage: s, lv: { atk: l, hp: l, regen: l },
      }));
      load(); renderTrain();
    }, [st, L]);
    await page.waitForTimeout(120);
    const h = await head(page);
    /* 계약(483 + 517): 단계 = «자연 단계» — `cap(k) > 전 스탯 lv` 를 처음 만족하는 k.
       483 은 내리는 쪽만 봤고(Math.min), 517 은 상한이 작아지면서 올리는 쪽도 생겼다. */
    let want = 1; while (CAP(want) <= L) want++;
    eq('  구 단계 ' + st + '(lv ' + L + ') — 레벨이 안 깎였다', h.lv.atk, L);
    ok('  ⚑ 517 이 뒤집은 축 — 326 규칙으로 자란 레벨(' + OLD326(st) + ')은 신 상한 ' + CAP(st) + ' 을 넘는다',
       st === 1 ? OLD326(st) === CAP(st) : OLD326(st) > CAP(st), 'old326 ' + OLD326(st) + ' vs cap ' + CAP(st));
    eq('  구 단계 ' + st + ' — 단계는 ' + want + ' 로 정정된다(483·517)', h.stage, want);
    ok('  구 단계 ' + st + ' — 기저 ' + h.base + ' ≤ lv ' + h.lv.atk + ' (진행이 0 에 안 굳는다)',
       h.base <= h.lv.atk, h.base + ' vs ' + h.lv.atk);
    ok('  구 단계 ' + st + ' — 진행도가 분모를 안 넘는다', (() => {
      const [a, b] = h.prog.split('/').map(Number); return a <= b && a >= 0;
    })(), h.prog);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).lv.atk | 0);
    eq('  구 단계 ' + st + ' — localStorage 레벨도 그대로', saved, L);
  }
  /* 음성항 — 지금 규칙(517 구간표)을 지켜 자란 세이브는 **한 글자도 안 닿는다** */
  {
    const L = CAP(5) + 11;
    await page.evaluate(l => {
      step = () => {}; S.autoBuy = false;
      localStorage.setItem(KEY, JSON.stringify({
        gold: 1e30, best: 60, a105: 1, autoBuy: false, trainStage: 6, lv: { atk: l, hp: l, regen: l },
      }));
      load(); renderTrain();
    }, L);
    await page.waitForTimeout(120);
    const h = await head(page);
    eq('  정상 세이브(단계 6 · lv ' + L + ') — 단계 그대로', h.stage, 6);
    eq('  정상 세이브 — 레벨 그대로', h.lv.atk, L);
    eq('  정상 세이브 — 진행 = (lv − cap(5))×3', h.prog, (L - CAP(5)) * 3 + '/' + DEN(6));
  }

  /* ---- [G] 안 건드린 축 ---- */
  console.log('[G] 326 이 안 건드린 축 — 계수·보너스·적용식');
  const keep = await page.evaluate(() => {
    S.trainStage = 4;
    return { step: trainStepAt(1), bonus: TRAIN_BONUS, stats: TRAIN_STATS.slice(),
             qtys: TRAIN_QTYS.slice(), tb: 1 + TRAIN_BONUS * (trainStage() - 1) };
  });
  eq('  1단계 몫(스탯당) 불변', keep.step, 100);
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
