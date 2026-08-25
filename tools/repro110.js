#!/usr/bin/env node
/* 작업 110 ② — «스테이지 점프 시 전투 루프 e.born 크래시» 재현/회귀 하네스
 *
 *   node tools/repro110.js                 # 3가지 시나리오 전부
 *   SECS=60 node tools/repro110.js         # 시나리오 C(장시간 자동 전투) 길이
 *
 * ── 원인(2026-08-25 작업 110 에서 규명) ────────────────────────────────────
 * 전투 루프의 «적» 구간은 `for(let i=enemies.length-1;i>=0;i--)` 로 도는데,
 * 그 안에서 적의 접촉 공격에 플레이어가 죽으면 `failBoss('패배')` 가 불린다(index.html ~9566).
 * `failBoss()` 는 **`enemies.length = 0`** 으로 배열을 통째로 비운다 → 다음 반복의
 * `enemies[i]` 가 undefined → `e.born += dt` 에서
 *   `TypeError: Cannot read properties of undefined (reading 'born')`
 * 로 터지고 rAF 체인이 끊겨 **게임이 그 자리에서 얼어붙는다.**
 *
 * 재현 조건이 «스테이지 점프» 인 이유: `failBoss()` 는 `inBossFight()`
 * (= `S.stage % 10 === 0 && !S.bossFarm`) 일 때만 배열을 비운다. 정상 진행에서 보스
 * 스테이지는 **보스 1마리 단독 스폰**이라 i=0 뿐이어서 다음 반복이 없다.
 * 반면 일반 몹이 깔린 채 `S.stage` 를 보스 스테이지(×10)로 점프시키면
 * «몹 50마리 + 보스전 판정» 이라는 정상 진행에 없는 조합이 만들어져 터진다.
 * 헤드리스 하네스·치트·세이브 손상 어느 쪽으로도 들어올 수 있는 상태다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SECS = Number(process.env.SECS || 60);

const scenes = [];
function scene(name, fn) { scenes.push({ name, fn }); }

/* A. 보고된 재현 경로 — 몹이 깔린 채 보스 스테이지로 점프 + 플레이어 즉사 */
scene('A 몹 깔린 채 보스 스테이지 점프 → 플레이어 사망', async page => {
  await page.evaluate(() => {
    S.stage = 500; S.best = 500; S.bossFarm = false;   /* spawnStage() 를 부르지 않는다 = 몹 유지 */
  });
  /* 죽을 때까지 hp 를 계속 1 로 눌러 둔다(자동 부활 뒤에도 다시 죽게) */
  await page.evaluate(() => {
    window.__pin = setInterval(() => { if (player.dead <= 0) player.hp = 1; }, 60);
  });
  await page.waitForTimeout(12000);
  await page.evaluate(() => clearInterval(window.__pin));
  return page.evaluate(() => ({ en: enemies.length, dead: player.dead > 0, farm: !!S.bossFarm }));
});

/* B. 같은 점프를 여러 스테이지에서 반복 — ×10 경계만이 아니라 어디서 점프해도 살아야 한다 */
scene('B 스테이지 반복 점프(10·20·…·100)', async page => {
  await page.evaluate(() => { player.hp = stat.maxHp; });
  for (let s = 10; s <= 100; s += 10) {
    await page.evaluate(st => { S.stage = st; S.best = Math.max(S.best, st); S.bossFarm = false; }, s);
    await page.evaluate(() => { window.__pin = setInterval(() => { if (player.dead <= 0) player.hp = 1; }, 60); });
    await page.waitForTimeout(1600);
    await page.evaluate(() => clearInterval(window.__pin));
  }
  return page.evaluate(() => ({ stage: S.stage, en: enemies.length }));
});

/* C. 대조군 — 정상 자동 전투(점프 없음). 회귀 방지: 고친 뒤에도 평소 진행이 그대로여야 한다 */
scene('C 정상 자동 전투 ' + SECS + 's', async page => {
  await page.evaluate(() => { S.stage = 1; S.best = 1; S.bossFarm = false; S.gold = 1e12; spawnStage(); });
  const t0 = await page.evaluate(() => S.stage);
  await page.waitForTimeout(SECS * 1000);
  const t1 = await page.evaluate(() => S.stage);
  return { stage0: t0, stage1: t1, grew: t1 > t0 };
});

(async () => {
  const browser = await launch(chromium);
  let fail = 0;
  for (const sc of scenes) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String((e && e.stack) || e)));
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof spawnStage === 'function');
    await page.waitForTimeout(1500);
    /* rAF 가 살아 있는지 = 게임 루프가 안 죽었는지. loop() 가 예외로 죽어도 이 체인은 남는다 */
    await page.evaluate(() => {
      window.__f = 0; window.__gf = 0;
      const tick = () => { window.__f++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      const _step = window.step;                     /* step() 이 실제로 도는지 별도로 센다 */
      window.step = function (dt) { window.__gf++; return _step.apply(this, arguments); };
    });

    let info = {};
    try { info = await sc.fn(page) || {}; } catch (e) { errs.push('하네스: ' + e.message); }
    const beat0 = await page.evaluate(() => ({ f: window.__f | 0, g: window.__gf | 0 }));
    await page.waitForTimeout(1200);
    const beat1 = await page.evaluate(() => ({ f: window.__f | 0, g: window.__gf | 0 }));
    const alive = beat1.g > beat0.g;                 /* step() 이 계속 돌고 있는가 */
    await ctx.close();

    const ok = errs.length === 0 && alive;
    if (!ok) fail++;
    console.log(`  ${ok ? '✓' : '✗'} ${sc.name}`);
    console.log(`      step 프레임 ${beat0.g}→${beat1.g} (${alive ? '살아있음' : '**멈춤**'}) · rAF ${beat0.f}→${beat1.f} · ${JSON.stringify(info)}`);
    if (errs.length) {
      console.log(`      에러 ${errs.length}건:`);
      errs.slice(0, 2).forEach(e => console.log('       · ' + String(e).split('\n').slice(0, 3).join('\n         ')));
    }
  }
  await browser.close();
  console.log('');
  if (fail) { console.log(`REPRO110 FAIL — ${fail}/${scenes.length} 시나리오`); process.exit(1); }
  console.log(`REPRO110 PASS — ${scenes.length}/${scenes.length} 시나리오 · 에러 0 · 루프 생존`);
  process.exit(0);
})();
