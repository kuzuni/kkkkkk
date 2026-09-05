#!/usr/bin/env node
/* 183 검증 — 23 훈련 «단계 진행도» 는 누적이 아니라 «이번 단계 몫» 이다.
 *
 *   node tools/verify183.js
 *
 * 버그(주인 재지시 2026-08-27): «경험치 누적으로 쌓인 것처럼 하지 말라 했는데 여전히 그러네 —
 *   단계 업 되면 0/300 식으로 시작돼야 하는데 1500/1800 식으로 시작됨».
 *   원인은 `trainProg()` 가 **전 훈련 레벨의 절대 합**, `trainMax()` 가 `3 × trainCap()`(=3×단계×100)
 *   이었던 것 — 단계가 올라도 이전 단계 몫이 분자·분모에 그대로 남았다.
 *   처방: 분자는 이전 단계 몫(`trainBase()`)을 스탯별로 뺀 값, 분모는 «이번 단계 몫» 하나.
 *
 * ⚠ **326 이관(2026-08-28)** — 요구치가 «증가식» 이 되면서(단계 n 몫 = 스탯당 100×n)
 *   `trainBase()` 는 (단계−1)×100 이 아니라 **누적합** `100·(n−1)n/2` 이고,
 *   분모는 300 고정이 아니라 **300×n** 이다. 183 이 지키는 규약(«단계 업 직후 정확히 0 에서 시작,
 *   꽉 차면 돌파») 은 한 글자도 안 바뀌었다 — 눈금의 길이만 단계마다 길어진다.
 *   그래서 이 게이트의 «0/300» 은 전부 «0/분모(단계)» 로 일반화했다. 고정 300 을 다시 박지 마라.
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로 둔다):
 *   [A] 재현 방지 — 단계 6 · 3종 모두 `trainBase()`(= 이전 단계 몫만 채운 상태)에서 «0/분모»
 *       (고치기 전 이 자리가 정확히 «1500/1800» 이었다)
 *   [B] 단계별 전수 — 단계 1~8 에서 분자는 «이번 단계 몫» 만, 분모는 300×단계(326)
 *   [C] 실제 [↑] 클릭으로 단계 업 → 그 직후 «0/분모» 이고 진행바가 빈 칸(16px)으로 리셋
 *   [D] 진행바 폭이 분자/분모에 비례(0% · 50% · 100%)
 *   [E] 과교정 잠금 — 저장값(`S.lv.*`)·상한(`trainCap`)·[↑] 열림 판정(`trainReady`)은 절대값 그대로
 *   [F] 64 회귀 — 단계 1 에서는 종전 표기(`Σ lv + '/300'`)와 완전히 같다
 *   [G] 콘솔·페이지 에러 0
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


/* 결정적 초기 상태 — 전투 루프를 세우고(킬 골드·자동구매로 레벨이 흔들린다) 훈련 상태를 심는다 */
async function setup(page, o){
  const wasOpen = await page.evaluate(cfg => {
    step = () => {};
    S.autoBuy = false;
    S.trainStage = cfg.stage;
    S.lv.atk = cfg.atk; S.lv.hp = cfg.hp; S.lv.regen = cfg.regen;
    S.gold = 1e12;
    save();
    const was = $('trw').classList.contains('on');
    if (!was) openTrain(); else renderTrain();
    return was;
  }, o);
  /* 시트 슬라이드업(약 300ms)이 끝나기 전에 재면 좌표·폭이 도착 전 값이다 (LESSONS 50-①) */
  await page.waitForTimeout(wasOpen ? 80 : 420);
}
/* 517(주인 지시 2026-08-31 · 326 번복) — 단계 몫은 구간표다: 1~4단계 300 · 5~7단계 600 · 8 이후 900.
   183 이 지키는 것은 «단계 업 직후 정확히 0/이번 단계 몫» 이고, 그 «몫» 의 값이 바뀐 것뿐이다.
   제품(`trainCapAt`)과 **독립으로** 다시 적는다 — 같은 함수를 불러 비교하면 게이트가 아무것도 안 잰다. */
const DEN = n => (n <= 4 ? 300 : n <= 7 ? 600 : 900);        /* 진행도 분모(3종 합) */
const CAP = n => { let s = 0; for (let k = 1; k <= n; k++) s += DEN(k) / 3; return s; };
const OFF = 50;                                              /* [E] 표본 — 상한에서 뺄 레벨 */
const head = page => page.evaluate(() => ({
  prog: $('trProg').textContent,
  fill: parseFloat($('trFill').style.width) || 0,
  up: $('trUp').classList.contains('on'),
  stage: S.trainStage | 0,
  lv: { atk: S.lv.atk | 0, hp: S.lv.hp | 0, regen: S.lv.regen | 0 },
  cap: trainCap(), ready: trainReady(),
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

  /* ---- [A] 주인이 본 그 자리 ---- */
  console.log('[A] 단계 6 · 3종 모두 Lv ' + CAP(5) + ' (이전 단계 몫만) → «0/' + DEN(6) + '»');
  await setup(page, { stage: 6, atk: CAP(5), hp: CAP(5), regen: CAP(5) });
  const a = await head(page);
  eq('  진행도 표기', a.prog, '0/' + DEN(6));
  ok('  «1500/1800» 식 누적 표기가 아니다', a.prog !== '1500/1800', a.prog);
  eq('  진행바가 빈 칸(둥근 캡 보정 16px)', a.fill, 16);

  /* ---- [B] 단계 1~8 전수 ---- */
  console.log('[B] 단계 1~8 — 분자는 이번 단계 몫만, 분모는 300×단계(326)');
  for (const st of [1, 2, 3, 5, 8]) {
    const base = CAP(st - 1);
    /* 이번 단계에서 atk 만 40, hp 는 7, regen 은 0 만큼 올린 상태 */
    await setup(page, { stage: st, atk: base + 40, hp: base + 7, regen: base });
    const h = await head(page);
    eq('  단계 ' + st + ' 진행도', h.prog, '47/' + DEN(st));
  }

  /* ---- [C] 실제 [↑] 클릭 → 단계 업 직후 0/300 ---- */
  console.log('[C] 3종 상한 → [↑] 진짜 클릭 → 단계 업 직후 «0/분모»');
  await setup(page, { stage: 3, atk: CAP(3), hp: CAP(3), regen: CAP(3) });
  const before = await head(page);
  eq('  업 직전 진행도(이번 단계 꽉 참)', before.prog, DEN(3) + '/' + DEN(3));
  ok('  [↑] 열림', before.up, 'trUp.on ' + before.up);
  eq('  업 직전 진행바 꽉 참(16+632)', before.fill, 648);
  await page.click('#trUp');
  await page.waitForTimeout(400);
  const after = await head(page);
  eq('  단계 +1', after.stage, 4);
  eq('  업 직후 진행도', after.prog, '0/' + DEN(4));
  eq('  업 직후 진행바 리셋', after.fill, 16);
  ok('  [↑] 다시 닫힘', !after.up, 'trUp.on ' + after.up);
  /* 17 스탯업 연출이 열렸으면 닫고 간다 */
  await page.evaluate(() => { if (typeof closeStatUp === 'function') closeStatUp();
                              const w = $('statw'); if (w) w.classList.remove('on'); });
  await page.waitForTimeout(200);

  /* ---- [D] 진행바 폭이 비율대로 ---- */
  console.log('[D] 진행바 폭 = 16 + 632 × (분자/분모)');
  for (const [n, want] of [[0, 16], [DEN(5) / 2, 332], [DEN(5), 648]]) {
    const base = CAP(4);                                  /* 단계 5 */
    const each = n / 3;
    await setup(page, { stage: 5, atk: base + each, hp: base + each, regen: base + each });
    const h = await head(page);
    eq('  ' + n + '/' + DEN(5) + ' → 폭', h.fill, want);
  }

  /* ---- [E] 과교정 잠금 — 저장·상한·판정은 절대값 그대로 ---- */
  console.log('[E] 표시만 상대화 — 저장값·상한·[↑] 판정은 절대값');
  await setup(page, { stage: 4, atk: CAP(4) - OFF, hp: CAP(4), regen: CAP(4) });
  const e = await head(page);
  eq('  S.lv.atk 저장값은 절대 레벨 그대로', e.lv.atk, CAP(4) - OFF);
  eq('  trainCap() = 구간표 누적합 (517)', e.cap, CAP(4));
  ok('  atk 만 상한 미달 → trainReady false', e.ready === false, 'ready ' + e.ready);
  eq('  진행도(' + CAP(4) + '−' + OFF + ' + ' + CAP(4) + ' + ' + CAP(4) + ' − 기저×3)',
     e.prog, (DEN(4) - OFF) + '/' + DEN(4));
  const savedLv = await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).lv.atk | 0);
  eq('  localStorage 세이브도 절대 레벨', savedLv, CAP(4) - OFF);

  /* ---- [F] 64 회귀 — 단계 1 은 종전 표기와 동일 ---- */
  console.log('[F] 64 회귀 — 단계 1 에서는 종전과 완전히 같은 표기');
  await setup(page, { stage: 1, atk: 12, hp: 0, regen: 0 });
  eq('  단계 1 진행도', (await head(page)).prog, '12/300');
  await setup(page, { stage: 1, atk: 100, hp: 100, regen: 100 });
  const f = await head(page);
  eq('  단계 1 상한 진행도', f.prog, '300/300');
  ok('  단계 1 상한이면 [↑] 열림', f.up, 'trUp.on ' + f.up);

  /* ---- [G] 콘솔 ---- */
  console.log('[G] 콘솔');
  ok('  콘솔 error / pageerror 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY183 PASS ' : 'VERIFY183 FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
