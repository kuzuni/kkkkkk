#!/usr/bin/env node
/* 진단 프로브 — 작업 336 「`tools/verify324.js` [6]·[7] 3건 실패(26/29)」
 *
 *   node tools/probe336.js
 *
 * 무엇을 재는가: verify324 가 [5] 를 끝냈을 때의 **상태**를 그대로 만들어 놓고,
 * [6](강화 탭 진짜 클릭)·[7](자동 구매)이 «살 수 있는 상태인가» 를 제품에게 직접 물어본다.
 *   ⓐ `S.trainStage` · `trainCap()` · `lv('atk'/'hp'/'regen')`  — [5] 마지막 prep 이 심어 둔 레벨
 *   ⓑ `U.atk.cost(lv)` · `buyInfo(U.atk).cost/.ok` · `S.gold`   — 한 칸 값이 지갑을 넘는가
 *   ⓒ `autoBuyTick` 의 후보(상한 아래 + 지갑 안)가 하나라도 있는가
 *   ⓓ 326 이전 상한(`단계 × 100`)이었다면 같은 자리에서 살 수 있었는가 — «상류가 언제 부패했는가»
 *
 * 결론 문장까지 이 도구가 찍는다. 제품(index.html)은 한 줄도 안 건드린다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined ? ' — ' + d : '')); };
const E = n => (n === Infinity ? '∞' : Number(n).toExponential(3));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e12, dia: 1e6, best: 60, totalKills: 5000, rstone: 1e6, relic: 1e6 })]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof cp === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(800);

  /* verify324 [5] «훈련 단계 trainUp» 의 prep + 액션을 **글자 그대로** 재현한다 */
  const st = await page.evaluate(() => {
    S.buyQty = 10; S.gold = 1e30;
    S.trainStage = 9; markDirty();
    TRAIN_STATS.forEach(id => S.lv[id] = trainCap()); markDirty();
    trainUp();
    const bi = buyInfo(U.atk);
    const cand = TRAIN_STATS.map(id => ({
      id, lv: lv(id), cap: trainCap(), room: lv(id) < trainCap(), c: U[id].cost(lv(id)), afford: U[id].cost(lv(id)) <= S.gold
    }));
    return {
      stage: S.trainStage, cap: trainCap(), capOld: S.trainStage * 100,
      lvA: lv('atk'), lvH: lv('hp'), lvR: lv('regen'),
      gold: S.gold, cp: cp(),
      cost1: U.atk.cost(lv('atk')), cost10: bi.cost, ok: bi.ok, n: bi.n,
      costOld: U.atk.cost(9 * 100),                 /* 326 이전 상한에서의 같은 자리 */
      cand
    };
  });

  console.log('── [5] 직후 상태 ──────────────────────────────────────────────');
  console.log('  S.trainStage = ' + st.stage + '   trainCap() = ' + st.cap + '   (326 이전 식이면 ' + st.capOld + ')');
  console.log('  lv atk/hp/regen = ' + st.lvA + ' / ' + st.lvH + ' / ' + st.lvR + '        cp() = ' + E(st.cp));
  console.log('  S.gold = ' + E(st.gold));
  console.log('  U.atk.cost(' + st.lvA + ') = ' + E(st.cost1) + '   x' + st.n + ' 합계 = ' + E(st.cost10));
  console.log('  U.atk.cost(900)  = ' + E(st.costOld) + '   ← 326 이전 상한(단계 9 = 900)에서의 같은 칸');
  console.log('  autoBuyTick 후보:');
  st.cand.forEach(c => console.log('    ' + c.id + ' lv' + c.lv + '/cap' + c.cap
    + '  상한 아래=' + (c.room ? 'Y' : 'N') + '  한 칸 ' + E(c.c) + '  지갑 안=' + (c.afford ? 'Y' : 'N')));

  console.log('\n── 판정 ───────────────────────────────────────────────────────');
  ok(st.lvA === 4500, 'ⓐ [5] prep 이 훈련 3종을 «단계 9 의 상한» 으로 심는다', 'lv(atk)=' + st.lvA + ' (326 누적합 4500 · 이전 식 900)');
  ok(st.cost10 > st.gold, 'ⓑ 그 자리의 강화 탭 한 칸 x10 이 하네스 지갑(1e30)을 **넘는다** → `buyInfo().ok=false`',
    E(st.cost10) + ' > ' + E(st.gold) + ' · ok=' + st.ok);
  ok(st.cand.every(c => !c.afford), 'ⓒ 자동 구매 후보도 전부 지갑 밖이다 → `autoBuyTick` 이 아무것도 안 산다',
    st.cand.map(c => c.id + (c.afford ? '=살 수 있음' : '=지갑 밖')).join(' · '));
  ok(st.costOld <= st.gold, 'ⓓ 326 이전 상한(900)에서는 같은 칸이 지갑 안이었다 — 부패 시점이 326 이다',
    E(st.costOld) + ' ≤ ' + E(st.gold));

  await browser.close();
  console.log('\nPROBE336 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ 실패 ' + fail + '건' : '  ✓'));
  console.log('⇒ [6]·[7] 의 Δ=0 은 «제품이 안 오른다» 가 아니라 **하네스가 살 수 없는 자리에서 클릭한다** 는 뜻이다.');
  process.exit(fail ? 1 : 0);
})();
