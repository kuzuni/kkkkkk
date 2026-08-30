#!/usr/bin/env node
/* 527 재현 — `verify70.js` §5-b 「10일차에 유물석·골드는 0」 이 **Δgold 4** 로 빨간 이유를 찍는다.
 *
 *   node tools/probe527.js
 *
 * 등재문의 갈래 둘을 갈라 놓는다(338 규칙 — 처방 전에 재현):
 *   ⓐ 게이트가 재는 «창» 이 오염됐다 — 수령 전후 420ms 사이에 다른 경로(전투 킬 골드 등)가 올린다
 *      ⇒ 클릭을 **안 해도** 같은 창에서 골드가 오른다 · 스택이 `claimAttend` 를 안 지난다
 *   ⓑ 정말로 출석 경로가 골드를 준다(399 «다이아 말고는 안 준다» 가 깨진 것)
 *      ⇒ 루프를 멈춘 채 `claimAttend()` 만 불러도 골드가 오른다 · 스택이 그 함수를 지난다
 *
 * 검사 항목:
 *   [1] 게이트와 «같은 창»(open → click → 420ms) 에서 S.gold 의 모든 변화를 스택과 같이 찍는다
 *   [2] 대조 — 같은 창 길이인데 **클릭을 안 한다**(창 오염이면 여기서도 오른다)
 *   [3] 격리 — `window.step` 을 멈춘 채 `claimAttend(null)` 만 부른다(제품이 주는 것이면 여기서 오른다)
 *   [4] 원천 — 오른 골드의 스택 최상단 함수 이름
 *   [5] 창 길이 의존성 — 0 / 200 / 420 / 1000ms 에서 각각 얼마나 오르나(비율이 일정하면 «시간당 유입»)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* S.gold 를 접근자로 갈아 끼워 «누가 올렸나» 를 스택째 기록한다.
   ⚠ enumerable:true — save() 가 JSON.stringify(S) 라 이 플래그를 빼면 골드 키가 통째로 사라진다. */
const WATCH = () => {
  let v = S.gold;
  window.__g527 = [];
  Object.defineProperty(S, 'gold', {
    configurable: true, enumerable: true,
    get() { return v; },
    set(nv) {
      const d = nv - v; v = nv;
      if (d) window.__g527.push({ d: +d.toFixed(4), st: (new Error().stack || '').split('\n').slice(1, 7).join(' ⇦ ') });
    },
  });
};
const SUM = () => window.__g527.reduce((s, x) => s + x.d, 0);

async function fresh(browser) {
  const bctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await bctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);
  /* 게이트와 같은 전제(LESSONS 51-③·34-⑤) */
  await page.evaluate(() => { S.autoBuy = false; if (typeof spAuto !== 'undefined') S.spAuto = false; });
  await page.evaluate(() => { S.att.n = 9; S.att.date = ''; });
  return { page, bctx };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  /* ---------- [1] 게이트와 같은 창 ---------- */
  {
    const { page, bctx } = await fresh(browser);
    await page.evaluate(() => { document.querySelector('.side .ibtn[data-pop="attend"]').click(); });
    await page.waitForTimeout(320);
    await page.evaluate(WATCH);
    await page.evaluate(() => { document.querySelector('#mbox [data-att]').click(); });
    await page.waitForTimeout(420);
    const r = await page.evaluate(() => ({ n: window.__g527.length, sum: window.__g527.reduce((s, x) => s + x.d, 0),
      att: window.__g527.filter(x => /claimAttend|giveReward/.test(x.st)).reduce((s, x) => s + x.d, 0),
      kill: window.__g527.filter(x => /killEnemy/.test(x.st)).reduce((s, x) => s + x.d, 0),
      rows: window.__g527.slice(0, 8) }));
    /* ⚠ 「Δ가 정확히 4」로 단언하면 이 자가 플레이키가 된다 — 킬이 두 번 떨어지는 판이 있다(4.08 배수).
       재현이 말하는 것은 «그 4 가 출석 몫이 아니라 전투 몫» 이라는 것이고, 그것은 흔들리지 않는다. */
    ok(r.sum > 0 && Math.abs(r.att) < 1e-9 && Math.abs(r.kill - r.sum) < 1e-9,
      '[1] 게이트 창(open → click → 420ms) 의 Δgold 는 전부 **전투 몫**이다(출석 몫 0)',
      'Δ' + r.sum.toFixed(3) + '(게이트 표기 ' + Math.round(r.sum) + ') · 출석 ' + r.att + ' · killEnemy ' + r.kill.toFixed(2) + ' · 변화 ' + r.n + '건');
    r.rows.forEach((x, i) => console.log('      · #' + (i + 1) + ' +' + x.d + '  ' + x.st.replace(/\s+/g, ' ').slice(0, 220)));
    await bctx.close();
  }

  /* ---------- [2] 대조 — 클릭을 안 한다 ---------- */
  {
    const { page, bctx } = await fresh(browser);
    await page.evaluate(() => { document.querySelector('.side .ibtn[data-pop="attend"]').click(); });
    await page.waitForTimeout(320);
    await page.evaluate(WATCH);
    await page.waitForTimeout(420);
    const r0 = await page.evaluate(() => window.__g527.reduce((s, x) => s + x.d, 0));
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({ n: window.__g527.length, sum: window.__g527.reduce((s, x) => s + x.d, 0),
      rows: window.__g527.slice(0, 4) }));
    /* ⚠ 킬이 언제 떨어지는지는 수백 ms 흔들린다 — 게이트 길이(420ms)에서 0 이 나오는 판도 있다.
       그래서 대조는 «클릭 없이도 오른다» 를 조금 긴 창에서 못박는다(두 값을 둘 다 찍는다). */
    ok(r.sum > 0, '[2] 대조 — 수령을 **안 해도** 창에서 골드가 오른다(ⓐ 창 오염 · 클릭과 무관)',
      '420ms Δ' + r0.toFixed(3) + ' → 1420ms Δ' + r.sum.toFixed(3) + ' · 변화 ' + r.n + '건');
    r.rows.forEach((x, i) => console.log('      · #' + (i + 1) + ' +' + x.d + '  ' + x.st.replace(/\s+/g, ' ').slice(0, 220)));
    await bctx.close();
  }

  /* ---------- [3] 격리 — 루프를 멈추고 claimAttend 만 ---------- */
  {
    const { page, bctx } = await fresh(browser);
    const r = await page.evaluate(() => {
      /* 루프를 세운다 — 이 게임의 심장은 rAF 한 줄이라 그 콜백을 무력화하면 전투가 멈춘다 */
      const raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0;
      const g0 = S.gold, d0 = S.dia;
      claimAttend(null);
      const out = { dg: S.gold - g0, dd: S.dia - d0 };
      window.requestAnimationFrame = raf;
      return out;
    });
    ok(Math.round(r.dg) === 0, '[3] 격리 — 루프를 멈춘 채 `claimAttend()` 만 부르면 골드는 **0**(ⓑ 기각)',
      'Δgold ' + r.dg + ' · Δdia ' + r.dd);
    await bctx.close();
  }

  /* ---------- [4] 원천 ---------- */
  {
    const { page, bctx } = await fresh(browser);
    await page.evaluate(WATCH);
    /* 킬 시각이 수백 ms 흔들리므로 «한 건이라도 잡힐 때까지» 기다린다(창 길이는 [5] 가 따로 잰다) */
    await page.waitForFunction(() => window.__g527.length > 0, null, { timeout: 8000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const top = {};
      window.__g527.forEach(x => {
        /* 첫 프레임은 감시자 자신(`set`)이라 건너뛴다 — 알고 싶은 것은 그것을 부른 쪽이다 */
        const m = /at ([A-Za-z0-9_$.]+)/.exec((x.st.split(' ⇦ ')[1] || '')) || [];
        const k = m[1] || '(anonymous)';
        top[k] = (top[k] || 0) + x.d;
      });
      return { top, n: window.__g527.length };
    });
    const keys = Object.keys(r.top);
    ok(keys.length > 0, '[4] 원천 — 골드를 올린 함수', keys.map(k => k + ' +' + r.top[k].toFixed(2)).join(' · ') || '(없음)');
    await bctx.close();
  }

  /* ---------- [5] 창 길이 의존성 ---------- */
  {
    const { page, bctx } = await fresh(browser);
    await page.evaluate(WATCH);
    const marks = [];
    for (const ms of [0, 200, 220, 580]) {
      if (ms) await page.waitForTimeout(ms);
      marks.push(await page.evaluate(SUM));
    }
    /* 누적값이므로 창 0/200/420/1000ms 에 대응한다 */
    ok(marks[3] > marks[0], '[5] 창 길이 의존 — 0/200/420/1000ms 누적 Δgold',
      marks.map((v, i) => [0, 200, 420, 1000][i] + 'ms:' + v.toFixed(2)).join(' · '));
    await bctx.close();
  }

  await browser.close();
  console.log('\nPROBE527 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
