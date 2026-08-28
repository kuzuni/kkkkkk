/* 작업 58 프로브 (38회차) — 씬 B «체크 도장» 한 개의 상자·불투명도 시계열을 그대로 찍는다.

   왜 만들었나: 38회차가 [18](정지 ≤250ms + 퇴장 관측)을 세우고 되돌림 시험을 하니 **되돌린
   빌드가 213ms 로 통과**했다. 설계상 정지는 34%~80% of .6s = **276ms** 인데 그보다 짧게 읽힌다.
   게이트가 «왜 그 수가 나오는지» 를 모르는 채로 임계만 맞추면 그건 게이트가 아니라 눈대중이다
   (36회차 «재현되지 않는 게이트는 게이트가 아니다» 의 같은 뿌리).
   → 표본 사이에 무엇이 끼어 «연속 정지» 를 끊는지 시계열로 본다.

   실행: node tools/p58at.js            (15ms 간격 · 트리거 후 1200ms) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
    QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  });
  await p.evaluate(() => openQuest());
  await p.waitForTimeout(600);

  const rows = await p.evaluate(async () => {
    const out = [];
    const t0 = performance.now();
    const bt = document.getElementById('qAll'); if (bt) bt.click();
    let vk = 0;
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        for (const c of document.querySelectorAll('.fx-check')) if (!c.dataset.vk) c.dataset.vk = String(vk++);
        const c = document.querySelector('.fx-check[data-vk="0"]');
        if (c) {
          const r = c.getBoundingClientRect(), st = getComputedStyle(c);
          out.push({ t: Math.round(t), x: +r.x.toFixed(1), y: +r.y.toFixed(1),
            w: +r.width.toFixed(1), h: +r.height.toFixed(1),
            op: +parseFloat(st.opacity).toFixed(3), n: document.querySelectorAll('.fx-check').length });
        }
        if (t >= 1200) return res();
        setTimeout(tick, 15);
      };
      tick();
    });
    return out;
  });
  await b.close();

  console.log('  t     x       y      w     h     op    체크수   Δ(앞 표본 대비)');
  rows.forEach((r, i) => {
    const a = i ? rows[i - 1] : null;
    const d = a ? ['x', 'y', 'w', 'h'].map(k => Math.abs(r[k] - a[k]))
      .map((v, j) => (v >= 0.5 ? ['x', 'y', 'w', 'h'][j] + '+' + v.toFixed(1) : '')).filter(Boolean).join(' ')
      + (Math.abs(r.op - a.op) >= 0.01 ? ' op' + (r.op - a.op).toFixed(3) : '') : '';
    console.log(String(r.t).padStart(5), String(r.x).padStart(7), String(r.y).padStart(7),
      String(r.w).padStart(6), String(r.h).padStart(6), String(r.op).padStart(6),
      String(r.n).padStart(6), '  ', d || '— (완전 정지)');
  });
})();
