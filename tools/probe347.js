/* 작업 347 — «상점 탭 레드닷 없음(코스튬으로는 안 켜진다)» 이 왜 빨간가를 «재현으로» 가른다.
 *
 *  등재문이 갈라 달라고 한 두 갈래:
 *    ⓐ 게이트가 낡았다 — 상점 탭이 켜지는 것이 **코스튬과 무관한 다른 축** 때문이고, 그 축은 지금 옳다.
 *    ⓑ 제품이 샜다 — 코스튬 보유/미보유가 상점 탭 레드닷을 실제로 움직인다(321 규약 위반).
 *
 *  338 규칙: 처방을 따르기 전에 재현한다. 이 파일이 그 재현이다.
 *  실행: node tools/probe347.js  → 마지막 줄 `PROBE347 PASS`.
 *
 *  ⚠ 여기서 «단언» 하는 것은 원인 판정에 필요한 사실뿐이다 — 게이트 본체는 tools/func50.js 다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const pass = [], fail = [];
const ok = (m) => { pass.push(m); console.log('  ✓ ' + m); };
const no = (m) => { fail.push(m); console.log('  ✗ ' + m); };
const eq = (m, got, want) => (JSON.stringify(got) === JSON.stringify(want)
  ? ok(`${m} = ${JSON.stringify(got)}`) : no(`${m}: ${JSON.stringify(got)} (기대 ${JSON.stringify(want)})`));

const S = (page, expr) => page.evaluate(`(() => (${expr}))()`);
const dot = (page) => page.$eval('.tab[data-t="shop"]', (e) => e.classList.contains('alert'));

async function open(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  if (save) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);
  return { ctx, page };
}
/* func50 §7 이 그 단언 직전에 만들어 두는 상태를 그대로 재현한다:
   상점 탭을 눌러 렌더를 태우고 → 상자별 하루 무료 10연을 0 으로 소진(166 축 끔). */
async function toFunc50State(page) {
  await page.evaluate(() => { document.querySelector('.tab[data-t="shop"]').click(); });
  await page.waitForTimeout(600);
  await page.evaluate((bs) => {
    S.daily.freeSum = S.daily.freeSum || {};
    bs.forEach((b) => { S.daily.freeSum[b] = 0; });
    uiDirty = true; renderUI();
  }, await S(page, 'SHOP_BOXES.map(x => x.b)'));
  await page.waitForTimeout(300);
}
/* 광고 축(329)을 끈다 — 오늘 남은 횟수를 상품마다 0 으로. */
const killAdAxis = async (page) => {
  await page.evaluate((ids) => {
    S.daily.adBuy = S.daily.adBuy || {};
    ids.forEach((id) => { S.daily.adBuy[id] = 0; });
    uiDirty = true; renderUI();
  }, await S(page, 'COIN_ADS.map(a => a.id)'));
  await page.waitForTimeout(300);
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  try {
    /* ---------- 1. 재현 — func50 §7 의 그 시점에서 무엇이 참인가 ---------- */
    console.log('[1] 재현 — 빨간 단언의 시점을 그대로 만든다');
    {
      const { ctx, page } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 999999 });
      await toFunc50State(page);
      eq('func50 §7 과 같은 전제 — 미보유 코스튬 있음 + 다이아 넉넉',
        await S(page, 'AVATARS.filter(a => !S.avatars[a.id]).length > 0 && S.dia > 1e5'), true);
      eq('166 축(무료 10연) 꺼짐 — sumAnyReady()', await S(page, 'sumAnyReady()'), false);
      eq('상점 탭 레드닷 = 켜짐(게이트가 본 그 값)', await dot(page), true);
      /* 갈라야 할 항: 켜는 것이 무엇인가. */
      eq('329 축(광고 보고 받기) 켜짐 — coinAdAnyReady()', await S(page, 'coinAdAnyReady()'), true);
      await ctx.close();
    }

    /* ---------- 2. ⓑ 기각 — 코스튬은 이 닷을 한 칸도 못 움직인다 ---------- */
    console.log('[2] ⓑ(제품이 샜다) 기각 — 코스튬 축을 양 끝으로 흔든다');
    {
      /* 전부 미보유(= func50 전제) vs 전부 보유. 코스튬이 판정에 걸려 있다면 두 값이 갈려야 한다. */
      const { ctx, page } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 999999 });
      await toFunc50State(page);
      const none = await dot(page);
      await page.evaluate(() => {
        AVATARS.forEach((a) => { S.avatars[a.id] = 1; });
        uiDirty = true; renderUI();
      });
      await page.waitForTimeout(300);
      const all = await dot(page);
      eq('미보유 49종 → 닷', none, true);
      eq('전부 보유 → 닷(같은 값이어야 «코스튬 무관»)', all, none);
      eq('다이아 0 으로 떨어뜨려도 같다', await (async () => {
        await page.evaluate(() => { S.avatars = { av0: 1 }; S.dia = 0; uiDirty = true; renderUI(); });
        await page.waitForTimeout(300); return dot(page);
      })(), none);
      await ctx.close();
    }

    /* ---------- 3. ⓐ 확정 — 329 축 하나만 끄면 닷이 꺼진다 ---------- */
    console.log('[3] ⓐ(게이트가 낡았다) 확정 — 두 축을 끄면 꺼진다');
    {
      const { ctx, page } = await open(browser, { avatar: 'av0', avatars: { av0: 1 }, dia: 999999 });
      await toFunc50State(page);
      eq('두 축 중 166 만 끈 상태 = 켜짐', await dot(page), true);
      await killAdAxis(page);
      eq('329 축까지 끄면 — coinAdAnyReady()', await S(page, 'coinAdAnyReady()'), false);
      eq('상점 탭 레드닷 꺼짐 = 코스튬은 켜는 축이 아니다', await dot(page), false);
      /* 되돌림: 광고 한 칸만 되살리면 다시 켜진다 = 그 축이 실제로 이 닷의 주인이다. */
      await page.evaluate(() => { S.daily.adBuy.a1 = 1; uiDirty = true; renderUI(); });
      await page.waitForTimeout(300);
      eq('광고 한 칸(a1) 되살리면 다시 켜짐', await dot(page), true);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log('');
  console.log(fail.length ? `PROBE347 FAIL — ${pass.length}/${pass.length + fail.length}`
    : `PROBE347 PASS — ${pass.length}/${pass.length}`);
  process.exit(fail.length ? 1 : 0);
})();
