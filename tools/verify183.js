#!/usr/bin/env node
/* 183 검증 — 23 훈련 «단계 진행도» 는 누적이 아니라 «이번 단계 몫» 이다.
 *
 *   node tools/verify183.js
 *
 * 버그(주인 재지시 2026-08-27): «경험치 누적으로 쌓인 것처럼 하지 말라 했는데 여전히 그러네 —
 *   단계 업 되면 0/300 식으로 시작돼야 하는데 1500/1800 식으로 시작됨».
 *   원인은 `trainProg()` 가 **전 훈련 레벨의 절대 합**, `trainMax()` 가 `3 × trainCap()`(=3×단계×100)
 *   이었던 것 — 단계가 올라도 이전 단계 몫이 분자·분모에 그대로 남았다.
 *   처방: 분자는 이전 단계 몫(`trainBase() = (단계−1)×100`)을 스탯별로 뺀 값, 분모는 300 고정.
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로 둔다):
 *   [A] 재현 방지 — 단계 6 · 3종 모두 500(= 이전 단계 몫만 채운 상태)에서 «0/300»
 *       (고치기 전 이 자리가 정확히 «1500/1800» 이었다)
 *   [B] 단계별 전수 — 단계 1~8 에서 분모는 언제나 300, 분자는 이번 단계 몫만
 *   [C] 실제 [↑] 클릭으로 단계 업 → 그 직후 «0/300» 이고 진행바가 빈 칸(16px)으로 리셋
 *   [D] 진행바 폭이 분자/분모에 비례(0% · 50% · 100%)
 *   [E] 과교정 잠금 — 저장값(`S.lv.*`)·상한(`trainCap`)·[↑] 열림 판정(`trainReady`)은 절대값 그대로
 *   [F] 64 회귀 — 단계 1 에서는 종전 표기(`Σ lv + '/300'`)와 완전히 같다
 *   [G] 콘솔·페이지 에러 0
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
const head = page => page.evaluate(() => ({
  prog: $('trProg').textContent,
  fill: parseFloat($('trFill').style.width) || 0,
  up: $('trUp').classList.contains('on'),
  stage: S.trainStage | 0,
  lv: { atk: S.lv.atk | 0, hp: S.lv.hp | 0, regen: S.lv.regen | 0 },
  cap: trainCap(), ready: trainReady(),
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

  /* ---- [A] 주인이 본 그 자리 ---- */
  console.log('[A] 단계 6 · 3종 모두 Lv 500 (이전 단계 몫만) → «0/300»');
  await setup(page, { stage: 6, atk: 500, hp: 500, regen: 500 });
  const a = await head(page);
  eq('  진행도 표기', a.prog, '0/300');
  ok('  «1500/1800» 식 누적 표기가 아니다', a.prog !== '1500/1800', a.prog);
  eq('  진행바가 빈 칸(둥근 캡 보정 16px)', a.fill, 16);

  /* ---- [B] 단계 1~8 전수 ---- */
  console.log('[B] 단계 1~8 — 분모는 300 고정, 분자는 이번 단계 몫만');
  for (const st of [1, 2, 3, 5, 8]) {
    const base = (st - 1) * 100;
    /* 이번 단계에서 atk 만 40, hp 는 7, regen 은 0 만큼 올린 상태 */
    await setup(page, { stage: st, atk: base + 40, hp: base + 7, regen: base });
    const h = await head(page);
    eq('  단계 ' + st + ' 진행도', h.prog, '47/300');
  }

  /* ---- [C] 실제 [↑] 클릭 → 단계 업 직후 0/300 ---- */
  console.log('[C] 3종 상한 → [↑] 진짜 클릭 → 단계 업 직후 «0/300»');
  await setup(page, { stage: 3, atk: 300, hp: 300, regen: 300 });
  const before = await head(page);
  eq('  업 직전 진행도(이번 단계 꽉 참)', before.prog, '300/300');
  ok('  [↑] 열림', before.up, 'trUp.on ' + before.up);
  eq('  업 직전 진행바 꽉 참(16+632)', before.fill, 648);
  await page.click('#trUp');
  await page.waitForTimeout(400);
  const after = await head(page);
  eq('  단계 +1', after.stage, 4);
  eq('  업 직후 진행도', after.prog, '0/300');
  eq('  업 직후 진행바 리셋', after.fill, 16);
  ok('  [↑] 다시 닫힘', !after.up, 'trUp.on ' + after.up);
  /* 17 스탯업 연출이 열렸으면 닫고 간다 */
  await page.evaluate(() => { if (typeof closeStatUp === 'function') closeStatUp();
                              const w = $('statw'); if (w) w.classList.remove('on'); });
  await page.waitForTimeout(200);

  /* ---- [D] 진행바 폭이 비율대로 ---- */
  console.log('[D] 진행바 폭 = 16 + 632 × (분자/300)');
  for (const [n, want] of [[0, 16], [150, 332], [300, 648]]) {
    const base = 400;                                     /* 단계 5 */
    const each = n / 3;
    await setup(page, { stage: 5, atk: base + each, hp: base + each, regen: base + each });
    const h = await head(page);
    eq('  ' + n + '/300 → 폭', h.fill, want);
  }

  /* ---- [E] 과교정 잠금 — 저장·상한·판정은 절대값 그대로 ---- */
  console.log('[E] 표시만 상대화 — 저장값·상한·[↑] 판정은 절대값');
  await setup(page, { stage: 4, atk: 350, hp: 400, regen: 400 });
  const e = await head(page);
  eq('  S.lv.atk 저장값은 절대 레벨 그대로', e.lv.atk, 350);
  eq('  trainCap() = 단계×100', e.cap, 400);
  ok('  atk 만 상한 미달 → trainReady false', e.ready === false, 'ready ' + e.ready);
  eq('  진행도(50+100+100)', e.prog, '250/300');
  const savedLv = await page.evaluate(() => JSON.parse(localStorage.getItem(KEY)).lv.atk | 0);
  eq('  localStorage 세이브도 절대 레벨', savedLv, 350);

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
