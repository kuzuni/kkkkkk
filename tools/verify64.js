#!/usr/bin/env node
/* 작업 64 기능 검증 — 훈련 카드 «꾹 누르면 연속 강화» (docs/ROUTINE.md «기능 완성 규칙»)
 *
 *   node tools/verify64.js
 *
 * «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영됨» 을 본다.
 * 마우스 pointer 이벤트를 **진짜로** 눌렀다 떼면서(합성 dispatch 아님) 아래를 확인한다:
 *   §1 진입 · §2 단발 탭 · §3 350ms 임계 · §4 반복·가속 · §5 정지 4종(up/leave/cancel/팝업닫힘)
 *   §6 부족·상한 자동 정지 + shake · §7 배수 탭 x10/x30 · §8 3종 카드 공통 · §9 저장·HUD 반영
 *
 * 132(2026-08-25): §8 은 원래 «스탯 훈련 서브탭» 을 검사했으나 작업 88 이 스탯 포인트 훈련
 *   (statTrain*·S.sp*·trSub·서브탭)을 통째로 폐기해 **항상 FAIL(35/37)** 이었다. 그래서 88 이후
 *   64 의 «꾹 누르기» 회귀는 한 번도 게이트로 쓰이지 못했다. 폐기된 화면 대신 **같은 취지**
 *   («반복 강화가 atk 전용이 아니다»)를 지금 존재하는 대상 = 체력·체력 회복 카드로 검사한다.
 *   §10 58 연출 간소화(#fxl 폭주 없음) · §11 콘솔 에러 0
 *
 * ⚠ 결정성: 게임 루프의 `step()` 을 비워 전투·골드 수입·자동구매를 멈춘 뒤 잰다.
 *   (S.autoBuy 만 꺼도 킬 골드가 들어와 «부족» 케이스가 재현되지 않는다)
 */
const path = require('path');
const fs = require('fs');
const { launch: pwLaunch } = require('./pwlaunch');   /* 291 — 정착 장치 공용 부트스트랩 */
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
const CARD = '#trw [data-tr="atk"]';
const CARD_HP = '#trw [data-tr="hp"]';                  /* 132 — 3종 카드 공통 검사(§8) */
const CARD_RG = '#trw [data-tr="regen"]';
let pass = 0, fail = 0;
const errs = [];
function ok(name, cond, detail){
  if (cond) { pass++; console.log('  ✓ ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  — ' + detail : '')); }
}

function launchOpts(){
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {} }
  return {};
}

/* 카드 중심으로 이동 → down → ms 유지 → up. 실제 pointerdown/move/up 이 나간다 */
async function center(page, sel){
  return page.evaluate(s => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, sel);
}
async function hold(page, sel, ms){
  const p = await center(page, sel);
  if (!p) throw new Error('요소 없음: ' + sel);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
/* 355(2026-08-28) — «눌러 둔 시간» 을 벽시계(waitForTimeout)로 믿지 않는다.
   hold(sel, 300) 의 실제 접촉은 한가한 컨테이너에서도 311~340ms 이고 부하가 걸리면 442ms 까지 밀린다
   (`node tools/probe355.js [--load]` 실측). 임계 TR_HOLD_DELAY(350ms)를 넘긴 실행에서 반복이 한 번 더
   도는 것은 **제품이 규약대로 동작한 것**인데, 요청값을 그대로 믿는 단언은 그때 빨개졌다(5회 중 1회).
   ⇒ 페이지가 스스로 찍은 pointerdown/pointerup 시각과 trainBuy 성공 시각을 돌려받아
      «실제 접촉 구간 안에서 몇 번, 언제 돌았는가» 로 판정한다(§4 가 이미 쓰던 방식의 공용화).
   반환 { hold: 실측 접촉 ms, t: [접촉 시작 기준 구매 시각…] } */
async function holdM(page, sel, ms, after){
  const p = await center(page, sel);
  if (!p) throw new Error('요소 없음: ' + sel);
  await page.evaluate(() => {
    window.__mD = 0; window.__mU = 0; window.__mB = [];
    window.__mOrig = trainBuy;
    trainBuy = function(id){ const r = window.__mOrig(id); if (r) window.__mB.push(performance.now()); return r; };
    window.__mFd = () => { window.__mD = performance.now(); };
    window.__mFu = () => { window.__mU = performance.now(); };
    addEventListener('pointerdown', window.__mFd, true);
    addEventListener('pointerup', window.__mFu, true);
  });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(after == null ? 400 : after);
  return page.evaluate(() => {
    removeEventListener('pointerdown', window.__mFd, true);
    removeEventListener('pointerup', window.__mFu, true);
    trainBuy = window.__mOrig;
    return { hold: window.__mU - window.__mD, t: window.__mB.map(v => v - window.__mD) };
  });
}
/* 접촉이 원하는 구간에 들지 못한 실행은 «측정 무효» 로 다시 던진다(305·303·344 계열).
   valid 가 끝내 거짓이면 마지막 측정을 그대로 돌려준다 — 그 경우는 단언이 판단한다. */
async function holdValid(page, sel, ms, valid, resetFn, tries){
  let m = null;
  for (let i = 0; i < (tries || 4); i++) {
    if (resetFn) await resetFn();
    m = await holdM(page, sel, ms);
    if (valid(m)) return m;
  }
  return m;
}
const beforeThr = (m, thr) => m.t.filter(v => v < thr - 5).length;   /* 임계 «전» 에 성립한 구매 수 */
const fmtM = m => '접촉 ' + Math.round(m.hold) + 'ms · t=[' + m.t.map(v => Math.round(v)).join(',') + ']';

/* 132 — 88 이 폐기한 sp/spAtk 대신 훈련 3종(TRAIN_STATS) 레벨을 다 본다 */
const snap = page => page.evaluate(() => ({
  atk: S.lv.atk | 0, hp: S.lv.hp | 0, regen: S.lv.regen | 0,
  gold: S.gold, stage: S.trainStage | 0,
}));
/* 결정적 초기 상태 — 전투 정지 + 골드/레벨 세팅 */
async function reset(page, o){
  const wasOpen = await page.evaluate(cfg => {
    step = () => {};                       /* 전투·수입·자동구매 정지 */
    S.autoBuy = false;
    S.trainStage = 1;
    S.lv.atk = cfg.atk; S.lv.hp = cfg.hp; S.lv.regen = cfg.regen;
    S.gold = cfg.gold;
    S.buyQty = cfg.qty;
    save();
    const wasOpen = $('trw').classList.contains('on');
    if (!wasOpen) openTrain(); else renderTrain();
    return wasOpen;
  }, Object.assign({ atk: 0, hp: 0, regen: 0, gold: 1e12, qty: 1 }, o || {}));
  /* ⚠ 팝업을 «새로» 열었으면 60 의 바닥 시트 슬라이드업(약 300ms)이 도는 중이다.
     그 사이 getBoundingClientRect() 로 잡은 좌표는 도착 전 위치라 클릭이 카드를 빗나가고
     «Δ0 = 한 번도 안 사졌다» 로 보인다(실제로 4회 중 1회 이렇게 실패했다).
     LESSONS 50-① 과 같은 부류 — 구현이 아니라 «측정이 애니메이션에 진» 것이다. */
  await page.waitForTimeout(wasOpen ? 60 : 420);
}

(async () => {
  /* 291 — 공용 부트스트랩을 지나가게 한다. `launch()` 가 입장 연출 «정착 장치»(settle291)를
     브라우저에 심어 주므로, 고정 대기 뒤 rect 를 재도 연출 한복판을 잡지 않는다. */
  const browser = await pwLaunch(chromium, launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* ── §1 진입 ── */
  console.log('[1] 진입 — 하단 «훈련» 탭 → 23 훈련 팝업');
  await page.evaluate(() => { const t = document.querySelector('.tab[data-t="grow"]'); t && t.click(); });
  await page.waitForTimeout(300);
  ok('훈련 탭 클릭 → #trw 열림', await page.evaluate(() => $('trw').classList.contains('on')));
  ok('카드 3장 렌더', await page.evaluate(() => $('trCards').children.length) === 3);

  const THR = await page.evaluate(() => TR_HOLD_DELAY);
  const rst = o => () => reset(page, o);

  /* ── §2 단발 탭 ── */
  console.log('[2] 단발 탭(80ms) — 1회만 강화되고 반복이 시작되지 않는다');
  await reset(page);
  let a = await snap(page);
  /* 355 — «80ms 눌렀다» 가 아니라 «실제 접촉이 임계 밑이었다» 를 보고 판정한다 */
  let m = await holdValid(page, CARD, 80, x => x.hold < THR - 60, rst());
  let b = await snap(page);
  ok('탭 1회 = Lv +1', m.hold < THR && b.atk - a.atk === 1, 'Δ' + (b.atk - a.atk) + ' · ' + fmtM(m));
  ok('탭은 골드를 소모한다', b.gold < a.gold, 'Δgold ' + (b.gold - a.gold));
  ok('뗀 뒤 추가 강화 0 (접촉 구간 밖 구매 없음)', m.t.every(v => v <= m.hold + 40), 'Lv ' + b.atk);

  /* ── §3 350ms 임계 ── */
  console.log('[3] 반복 시작 임계 — 임계 전에는 반복이 없고, 넘기면 임계 직후 첫 반복');
  /* 355(2026-08-28): 옛 판정 두 줄은 «waitForTimeout(300/420) = 눌러 둔 시간» 이라는 전제 위에
     Δ==1 / Δ==2 를 단언했다. 그 전제가 틀렸다(위 holdM 주석 · probe355 실측: 300 요청 → 접촉 311~442ms).
     임계를 넘긴 실행의 Δ2 는 제품이 옳게 동작한 것이라 «간헐 FAIL» 은 자가 타이밍 경합이었다.
     지금은 실측 접촉 구간에서 «임계 전에 반복이 돌았는가 / 넘겼으면 임계 직후에 돌았는가» 를 본다 —
     이것이 §3 이 원래 재려던 뜻이고, 임계가 무너지면(제품 회귀) 즉시 빨개진다.
     헛초록이 아님은 `node tools/probe355.js` 의 되돌림 시험(임계 100ms 주입 → 빨강)이 못 박는다. */
  ok('임계 상수 TR_HOLD_DELAY = 350ms', THR === 350, THR + 'ms');
  await reset(page);
  m = await holdM(page, CARD, 300);
  ok('임계(350ms) 전에는 반복이 없다 — 접촉 시작~임계 구매 1회뿐', beforeThr(m, THR) === 1, fmtM(m));
  ok('뗀 뒤 구매 0 (pointerup 즉시 정지)', m.t.every(v => v <= m.hold + 40), fmtM(m));
  /* 임계를 확실히 넘긴 접촉이어야 «첫 반복» 을 물을 수 있다 — 아니면 측정 무효로 다시 던진다 */
  m = await holdValid(page, CARD, 420, x => x.hold >= THR + 60, rst());
  ok('임계를 넘긴 접촉 → 반복이 시작된다', m.hold >= THR + 60 && m.t.length >= 2, fmtM(m));
  ok('첫 반복은 임계 직후다(≥350ms · 임계+200ms 이내)',
     m.t.length >= 2 && m.t[1] >= THR - 5 && m.t[1] <= THR + 200, fmtM(m));

  /* ── §4 반복·가속 ── */
  console.log('[4] 연속 강화 · 가속 (160ms → ×0.86 → 최소 60ms)');
  /* 132 — 옛 «앞 600ms 구매수 vs 뒤 600ms 구매수» 비교는 이 컨테이너에서 앞·뒤가 매번 **같은 수**로
     나와(앞6/뒤6 · 앞5/뒤5) ±1 지터마다 뒤집혔다 — 3회 중 1회 FAIL. 원인은 구현이 아니라 측정이다:
     틱마다 save()+renderTrainLive() 비용 w 가 붙어 실측 간격이 iv+w 가 되므로, 창 두 개의 «개수» 로는
     가속분이 w 에 묻힌다. 그래서 **구매 시각을 직접 재서 간격 자체**를 본다 — 한 번의 실행 안에서
     비교되므로 기계 속도에 무관하다. (LESSONS «측정이 애니메이션/부하에 진» 부류) */
  await reset(page);
  await page.evaluate(() => {
    window.__trT = []; window.__trOrig = trainBuy;
    trainBuy = function(id){ const r = window.__trOrig(id); if(r) window.__trT.push(performance.now()); return r; };
  });
  const p4 = await center(page, CARD);
  await page.mouse.move(p4.x, p4.y); await page.mouse.down();
  await page.waitForTimeout(350 + 1200);
  await page.mouse.up();
  const end = await snap(page);                         /* 스냅은 «뗀 뒤» — 왕복 지연 동안의 틱을 세지 않는다 */
  const ts = await page.evaluate(() => {
    const t = window.__trT; trainBuy = window.__trOrig;  /* 래퍼 원복 — 뒤 절에 영향 없게 */
    return t.map(v => v - t[0]);
  });
  const gaps = ts.slice(1).map((v, i) => v - ts[i]);    /* gaps[0] = 반복 시작 지연(350ms), 뒤가 반복 간격 */
  const rep = gaps.slice(1);
  const med3 = a3 => a3.slice().sort((x, y) => x - y)[Math.floor(a3.length / 2)];
  const first = rep[0], last = med3(rep.slice(-3));     /* 마지막 3개의 중앙값 — 단발 지터에 안 흔들린다 */
  console.log('     간격(ms): ' + gaps.map(v => Math.round(v)).join(' '));
  ok('1.0초 꾹 → 5회 이상 강화', ts.filter(v => v <= 1000).length >= 5,
     ts.filter(v => v <= 1000).length + '회');
  ok('반복 시작 지연 ≈ 350ms', gaps[0] >= 300 && gaps[0] <= 560, Math.round(gaps[0]) + 'ms');
  ok('가속: 마지막 반복 간격이 첫 반복 간격의 85% 이하', rep.length >= 5 && last <= first * 0.85,
     '첫 ' + Math.round(first) + 'ms → 끝 ' + Math.round(last) + 'ms (' + rep.length + '회)');
  ok('가속 상한: 반복 간격이 55ms 밑으로 내려가지 않음(최소 60ms)', Math.min.apply(null, rep) >= 55,
     '최소 ' + Math.round(Math.min.apply(null, rep)) + 'ms');
  await page.waitForTimeout(400);
  const after4 = await snap(page);
  ok('pointerup 즉시 정지 (뗀 뒤 400ms Δ0)', after4.atk === end.atk, 'Δ' + (after4.atk - end.atk));

  /* ── §5 정지 경로 ── */
  console.log('[5] 정지 — leave · cancel · 팝업 닫힘');
  await reset(page);
  const p5 = await center(page, CARD);
  await page.mouse.move(p5.x, p5.y); await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.move(p5.x, 60);                      /* 카드 밖(HUD 쪽)으로 이동 */
  const beforeLeave = await snap(page);                 /* 기준은 «벗어난 직후» */
  await page.waitForTimeout(500);
  const afterLeave = await snap(page);
  await page.mouse.up();
  ok('카드 밖으로 벗어나면 정지', afterLeave.atk === beforeLeave.atk, 'Δ' + (afterLeave.atk - beforeLeave.atk));

  await reset(page);
  const p5b = await center(page, CARD);
  await page.mouse.move(p5b.x, p5b.y); await page.mouse.down();
  await page.waitForTimeout(600);
  await page.evaluate(() => dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
  const beforeCancel = await snap(page);
  await page.waitForTimeout(500);
  const afterCancel = await snap(page);
  await page.mouse.up();
  ok('pointercancel → 정지', afterCancel.atk === beforeCancel.atk, 'Δ' + (afterCancel.atk - beforeCancel.atk));

  await reset(page);
  const p5c = await center(page, CARD);
  await page.mouse.move(p5c.x, p5c.y); await page.mouse.down();
  await page.waitForTimeout(600);
  await page.evaluate(() => closeTrain());
  const beforeClose = await snap(page);
  await page.waitForTimeout(500);
  const afterClose = await snap(page);
  await page.mouse.up();
  ok('팝업이 닫히면 정지', afterClose.atk === beforeClose.atk, 'Δ' + (afterClose.atk - beforeClose.atk));

  /* ── §6 부족 · 상한 ── */
  console.log('[6] 자동 정지 — 골드 부족 / 단계 상한 + 60 shake 1회');
  /* 6-1 골드 부족: 3회분만 살 수 있는 골드 */
  await reset(page, { gold: 0 });
  await page.evaluate(() => { S.gold = costOf(U.atk, 0, 1) + costOf(U.atk, 1, 1) + costOf(U.atk, 2, 1) + 1; renderTrain(); });
  a = await snap(page);
  await hold(page, CARD, 1500);
  await page.waitForTimeout(400);
  b = await snap(page);
  ok('골드가 3회분 → 정확히 3회에서 멈춤', b.atk - a.atk === 3, 'Δ' + (b.atk - a.atk));
  ok('부족 상태에서 골드가 음수로 가지 않음', b.gold >= 0, 'gold ' + b.gold);
  /* shake 는 380ms 뒤 사라지므로 «누르고 있는 동안» 잡는다 */
  await reset(page, { gold: 0 });
  const p6 = await center(page, CARD);
  await page.mouse.move(p6.x, p6.y); await page.mouse.down();
  await page.waitForTimeout(120);
  const shook = await page.evaluate(s => document.querySelector(s).classList.contains('jz-sh'), CARD);
  await page.mouse.up();
  ok('골드 0 에서 누르면 60 shake(.jz-sh) 1회', shook);
  ok('골드 0 에서 강화되지 않음', (await snap(page)).atk === 0);
  /* 6-2 단계 상한: cap−2 에서 시작 */
  await reset(page, { atk: 98 });
  a = await snap(page);
  await hold(page, CARD, 1500);
  await page.waitForTimeout(400);
  b = await snap(page);
  ok('단계 상한(100)에서 자동 정지', b.atk === 100, 'Lv ' + b.atk);
  /* 689 이관(2026-09-01) — 비용 줄이 «상한» → «MAX»(주인 지시). 64 의 주장은 «단계 상한에서
     자동 정지하고 카드가 상한 표기로 바뀐다» 이고 그 말은 그대로다 — 문자열만 갈아 끼운다. */
  ok('상한 카드는 알약·버튼 둘 다 MAX 표기(689)', await page.evaluate(s => {
    const e = document.querySelector(s);
    return e.classList.contains('full') && e.querySelector('.cv i').textContent === 'MAX'
        && e.querySelector('.cb i').textContent === 'MAX';
  }, CARD));

  /* ── §7 배수 탭 ── */
  console.log('[7] 배수 탭 — 반복 1회당 그 배수가 적용된다');
  /* 355 — «420ms 눌렀으니 정확히 2회» 가 아니라 «실측 구매 수 × 배수» 로 본다.
     배수 규약(«반복 1회당 그 배수»)은 그대로 지켜지고, 접촉이 밀려 3회가 돌아도 빨개지지 않는다. */
  for (const q of [10, 30]) {
    await reset(page, { qty: q });
    a = await snap(page);
    m = await holdValid(page, CARD, 80, x => x.hold < THR - 60, rst({ qty: q }));
    b = await snap(page);
    ok('x' + q + ' 탭 1회 = Lv +' + q, m.t.length === 1 && b.atk - a.atk === q, 'Δ' + (b.atk - a.atk) + ' · ' + fmtM(m));
    await reset(page, { qty: q });
    a = await snap(page);
    m = await holdValid(page, CARD, 420, x => x.hold >= THR + 60 && x.t.length >= 2, rst({ qty: q }));
    b = await snap(page);
    ok('x' + q + ' 반복 포함 = 구매 n회 × ' + q, m.t.length >= 2 && b.atk - a.atk === q * m.t.length,
       'Δ' + (b.atk - a.atk) + ' · ' + fmtM(m));
  }
  /* 배수 탭 자체가 눌리는지 (반복 핸들러가 탭 클릭을 삼키지 않는다) */
  await reset(page);
  await page.evaluate(() => document.querySelector('#trQty [data-trq="30"]').click());
  await page.waitForTimeout(120);
  ok('x30 탭 클릭 → S.buyQty=30', await page.evaluate(() => S.buyQty) === 30);

  /* ── §8 3종 카드 공통 (132 — 옛 «스탯 훈련 서브탭» 대체) ── */
  console.log('[8] 3종 카드 공통 — 체력 · 체력 회복 카드도 같은 꾹 누르기 (반복이 atk 전용이 아니다)');
  await reset(page);
  a = await snap(page);
  /* 355 — «420ms → 정확히 2» 가 아니라 «임계 전 1회 + 임계 넘긴 뒤 반복» 으로 본다 */
  m = await holdValid(page, CARD_HP, 420, x => x.hold >= THR + 60 && x.t.length >= 2, rst());
  b = await snap(page);
  ok('체력 카드도 단발 1 + 반복 (임계 전 1회 · 실측 구매 수와 일치)',
     beforeThr(m, THR) === 1 && m.t.length >= 2 && b.hp - a.hp === m.t.length,
     'Δhp ' + (b.hp - a.hp) + ' · ' + fmtM(m));
  ok('체력 카드를 눌러도 공격력·체력 회복은 안 오른다', b.atk === a.atk && b.regen === a.regen,
     'Δatk ' + (b.atk - a.atk) + ' / Δregen ' + (b.regen - a.regen));

  await reset(page);
  a = await snap(page); await hold(page, CARD_RG, 1000); await page.waitForTimeout(400);
  b = await snap(page);
  ok('체력 회복 카드 1.0초 꾹 → 5회 이상 연속', b.regen - a.regen >= 5, 'Δregen ' + (b.regen - a.regen));
  ok('체력 회복 카드를 눌러도 공격력·체력은 안 오른다', b.atk === a.atk && b.hp === a.hp,
     'Δatk ' + (b.atk - a.atk) + ' / Δhp ' + (b.hp - a.hp));

  /* 골드 0 자동 정지 + 60 shake 가 atk 카드 전용 경로가 아니다 */
  await reset(page, { gold: 0 });
  const p8 = await center(page, CARD_HP);
  await page.mouse.move(p8.x, p8.y); await page.mouse.down();
  await page.waitForTimeout(120);
  const shook8 = await page.evaluate(s => document.querySelector(s).classList.contains('jz-sh'), CARD_HP);
  await page.mouse.up();
  await page.waitForTimeout(120);
  ok('체력 카드도 골드 0 → shake + 강화 없음', shook8 && (await snap(page)).hp === 0, 'shake ' + shook8);
  await reset(page);

  /* ── §9 저장 · HUD · 다른 화면 반영 ── */
  console.log('[9] 결과가 S · HUD · 다른 화면에 반영');
  await reset(page, { atk: 0, gold: 1e12 });
  await hold(page, CARD, 900);
  await page.waitForTimeout(300);
  const st9 = await snap(page);
  ok('반복 강화 후 Lv > 1', st9.atk > 1, 'Lv ' + st9.atk);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).lv.atk | 0);
  ok('localStorage 세이브에 반영', saved === st9.atk, 'saved ' + saved + ' / S ' + st9.atk);
  const hud = await page.evaluate(() => ({
    prog: $('trProg').textContent,
    card: document.querySelector('#trw [data-tr="atk"] .ch i').textContent,
    fill: $('trFill').style.width,
  }));
  ok('카드 Lv 표기 갱신', hud.card === 'Lv. ' + st9.atk, hud.card);
  ok('진행바 텍스트 갱신', hud.prog === st9.atk + '/300', hud.prog);
  ok('진행바 폭 갱신(16px 초과)', parseFloat(hud.fill) > 16, hud.fill);
  /* 전투력(HUD)·02 메인 반영 — stat.atk 는 lv.atk 를 읽는다 */
  const cp = await page.evaluate(() => stat.dmg);
  ok('전투 스탯(stat.dmg)에 반영', cp > 0, 'dmg ' + cp.toFixed(1));

  /* ── §10 58 연출 간소화 ── */
  console.log('[10] 58 연출 — 반복 중 파티클 폭주 없음');
  await reset(page, { atk: 0, gold: 1e12 });
  await page.evaluate(() => { const l = $('fxl'); if (l) l.innerHTML = ''; });
  const p10 = await center(page, CARD);
  await page.mouse.move(p10.x, p10.y); await page.mouse.down();
  await page.waitForTimeout(1400);
  const peak = await page.evaluate(() => $('fxl') ? $('fxl').childElementCount : 0);
  const nBuys = (await snap(page)).atk;
  await page.mouse.up();
  await page.waitForTimeout(200);
  /* ⚑ 619 이관 — 이 항이 «구매수보다 훨씬 적다» 로 잰 이유는 64 가 «반복분 연출은 정지할 때 한 번» 이라
     결정했기 때문이다(60ms 마다 10개씩 쏘면 `#fxl` 이 FXMAX 로 막힌다). **주인 지시 619 가 그 결정을
     뒤집었다** — 반복분도 회당 터진다. 그러니 여기서 지킬 뜻은 «발화를 참아라» 가 아니라 원래 근거인
     **«폭주하지 않는다»** 다: 발화는 619 의 풀·동시 상한(`UPFX_CAP` 36)이 묶으므로 **동시 노드**가
     FXMAX 밑 · 상한 언저리에 머무는지를 묻는다(333 처방 — 자리만 옮기고 뜻은 그대로).
     ⚠ 헐거워지지 않는다: 상한을 걷어내면 1.4초 홀드에서 파티클이 100개를 넘겨 이 항이 그대로 빨개진다. */
  ok('반복 중 #fxl 동시 노드가 상한 안에 머문다(619 풀·동시 상한 — 폭주 없음)',
     peak < 120 && peak <= 70, 'fxl 동시 최대 ' + peak + ' / 구매 ' + nBuys + ' (FXMAX 120)');
  const tail = await page.evaluate(() => $('fxl') ? $('fxl').childElementCount : 0);
  ok('정지 시 마무리 연출 재생(0 아님)', tail > 0, 'fxl ' + tail);

  /* ── §12 영속성 ── */
  console.log('[12] reload 후에도 유지 (LESSONS 50-② — addInitScript 를 쓰지 않는다)');
  const beforeReload = await page.evaluate(() => S.lv.atk | 0);
  await page.reload(); await page.waitForTimeout(1500);
  const afterReload = await page.evaluate(() => S.lv.atk | 0);
  ok('reload 후에도 강화 결과 유지', afterReload === beforeReload, afterReload + ' / ' + beforeReload);

  /* ── §11 콘솔 ── */
  console.log('[11] 콘솔');
  ok('콘솔 error / pageerror 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + (fail === 0 ? 'VERIFY64 PASS ' : 'VERIFY64 FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
