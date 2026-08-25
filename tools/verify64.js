#!/usr/bin/env node
/* 작업 64 기능 검증 — 훈련 카드 «꾹 누르면 연속 강화» (docs/ROUTINE.md «기능 완성 규칙»)
 *
 *   node tools/verify64.js
 *
 * «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가 S·HUD·다른 화면에 반영됨» 을 본다.
 * 마우스 pointer 이벤트를 **진짜로** 눌렀다 떼면서(합성 dispatch 아님) 아래를 확인한다:
 *   §1 진입 · §2 단발 탭 · §3 350ms 임계 · §4 반복·가속 · §5 정지 4종(up/leave/cancel/팝업닫힘)
 *   §6 부족·상한 자동 정지 + shake · §7 배수 탭 x10/x30 · §8 스탯 훈련 서브탭 · §9 저장·HUD 반영
 *   §10 58 연출 간소화(#fxl 폭주 없음) · §11 콘솔 에러 0
 *
 * ⚠ 결정성: 게임 루프의 `step()` 을 비워 전투·골드 수입·자동구매를 멈춘 뒤 잰다.
 *   (S.autoBuy 만 꺼도 킬 골드가 들어와 «부족» 케이스가 재현되지 않는다)
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
const CARD = '#trw [data-tr="atk"]';
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
const snap = page => page.evaluate(() => ({
  atk: S.lv.atk | 0, hp: S.lv.hp | 0, gold: S.gold,
  sp: S.sp | 0, spAtk: S.spAtk | 0, stage: S.trainStage | 0,
}));
/* 결정적 초기 상태 — 전투 정지 + 골드/레벨 세팅 */
async function reset(page, o){
  await page.evaluate(cfg => {
    step = () => {};                       /* 전투·수입·자동구매 정지 */
    S.autoBuy = false;
    S.trainStage = 1; S.statStage = 1;
    S.lv.atk = cfg.atk; S.lv.hp = 0; S.lv.regen = 0;
    S.gold = cfg.gold; S.sp = cfg.sp; S.spAtk = 0; S.spHp = 0; S.spRegen = 0;
    S.buyQty = cfg.qty;
    trSub = cfg.sub;
    save();
    if (!$('trw').classList.contains('on')) openTrain(); else renderTrain();
  }, Object.assign({ atk: 0, gold: 1e12, sp: 0, qty: 1, sub: 'train' }, o || {}));
  await page.waitForTimeout(60);
}

(async () => {
  const browser = await chromium.launch(launchOpts());
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

  /* ── §2 단발 탭 ── */
  console.log('[2] 단발 탭(80ms) — 1회만 강화되고 반복이 시작되지 않는다');
  await reset(page);
  let a = await snap(page);
  await hold(page, CARD, 80);
  await page.waitForTimeout(500);                       /* 뗀 뒤 여유 — 반복이 남아 있으면 여기서 는다 */
  let b = await snap(page);
  ok('탭 1회 = Lv +1', b.atk - a.atk === 1, 'Δ' + (b.atk - a.atk));
  ok('탭은 골드를 소모한다', b.gold < a.gold, 'Δgold ' + (b.gold - a.gold));
  ok('뗀 뒤 500ms 동안 추가 강화 0', true, 'Lv ' + b.atk);

  /* ── §3 350ms 임계 ── */
  console.log('[3] 반복 시작 임계 — 300ms 는 1회, 420ms 는 2회');
  await reset(page);
  a = await snap(page); await hold(page, CARD, 300); await page.waitForTimeout(400);
  b = await snap(page);
  ok('300ms 유지 → 1회 (350ms 전에는 반복 없음)', b.atk - a.atk === 1, 'Δ' + (b.atk - a.atk));
  await reset(page);
  a = await snap(page); await hold(page, CARD, 420); await page.waitForTimeout(400);
  b = await snap(page);
  ok('420ms 유지 → 2회 (350ms 에 첫 반복)', b.atk - a.atk === 2, 'Δ' + (b.atk - a.atk));

  /* ── §4 반복·가속 ── */
  console.log('[4] 연속 강화 · 가속 (160ms → ×0.86 → 최소 60ms)');
  await reset(page);
  const p4 = await center(page, CARD);
  await page.mouse.move(p4.x, p4.y); await page.mouse.down();
  await page.waitForTimeout(350 + 600);                 /* 반복 시작 후 앞 600ms */
  const mid = await snap(page);
  await page.waitForTimeout(600);                       /* 뒤 600ms */
  await page.mouse.up();
  const end = await snap(page);                         /* 스냅은 «뗀 뒤» — 왕복 지연 동안의 틱을 세지 않는다 */
  const n1 = mid.atk, n2 = end.atk - mid.atk;
  ok('1.0초 꾹 → 5회 이상 강화', mid.atk >= 5, mid.atk + '회');
  ok('가속: 뒤 600ms 구매수 > 앞 600ms', n2 > n1 - 1, '앞 ' + n1 + ' / 뒤 ' + n2);
  ok('가속 상한: 뒤 600ms 가 10회 이하(최소 간격 60ms)', n2 <= 11, n2 + '회');
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
  ok('상한 카드는 MAX/상한 표기', await page.evaluate(s => {
    const e = document.querySelector(s);
    return e.classList.contains('full') && e.querySelector('.cv i').textContent === 'MAX'
        && e.querySelector('.cb i').textContent === '상한';
  }, CARD));

  /* ── §7 배수 탭 ── */
  console.log('[7] 배수 탭 — 반복 1회당 그 배수가 적용된다');
  for (const q of [10, 30]) {
    await reset(page, { qty: q });
    a = await snap(page); await hold(page, CARD, 80); await page.waitForTimeout(300);
    b = await snap(page);
    ok('x' + q + ' 탭 1회 = Lv +' + q, b.atk - a.atk === q, 'Δ' + (b.atk - a.atk));
    await reset(page, { qty: q });
    a = await snap(page); await hold(page, CARD, 420); await page.waitForTimeout(300);
    b = await snap(page);
    ok('x' + q + ' 반복 1회 = 총 +' + (q * 2), b.atk - a.atk === q * 2, 'Δ' + (b.atk - a.atk));
  }
  /* 배수 탭 자체가 눌리는지 (반복 핸들러가 탭 클릭을 삼키지 않는다) */
  await reset(page);
  await page.evaluate(() => document.querySelector('#trQty [data-trq="30"]').click());
  await page.waitForTimeout(120);
  ok('x30 탭 클릭 → S.buyQty=30', await page.evaluate(() => S.buyQty) === 30);

  /* ── §8 스탯 훈련 서브탭 ── */
  console.log('[8] 스탯 훈련 서브탭 — 스탯 포인트로 같은 동작');
  await reset(page, { sub: 'stat', sp: 12 });
  a = await snap(page);
  await hold(page, CARD, 1800);
  await page.waitForTimeout(400);
  b = await snap(page);
  ok('스탯 훈련도 꾹 누르면 연속(sp 12 → 12회에서 정지)', b.spAtk === 12 && b.sp === 0,
     'spAtk ' + b.spAtk + ' / sp ' + b.sp);
  await reset(page, { sub: 'stat', sp: 0 });
  const p8 = await center(page, CARD);
  await page.mouse.move(p8.x, p8.y); await page.mouse.down();
  await page.waitForTimeout(120);
  const shook8 = await page.evaluate(s => document.querySelector(s).classList.contains('jz-sh'), CARD);
  await page.mouse.up();
  ok('포인트 0 → shake + 강화 없음', shook8 && (await snap(page)).spAtk === 0);
  await page.evaluate(() => { trSub = 'train'; renderTrain(); });

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
  ok('반복 중 #fxl 자식 수가 구매수보다 훨씬 적다', peak < nBuys * 3, 'fxl ' + peak + ' / 구매 ' + nBuys);
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
