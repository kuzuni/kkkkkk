/* 작업 58 36회차 — 공통1 처방 후보를 «고르기 전에» 재는 두 번째 probe.

   p58ap 이 «라벨을 324ms 동안 덮는다» 를 확정했다. 여기서는 **어느 축으로 피할 수 있는지**를
   숫자로 가른다. 세 후보의 성립 조건이 각각 다르다:
     ⓐ 세로(위)  — 마지막 형제 행 하단 ~ 라벨 윗변 사이에 «코인 상자» 가 들어가는가
     ⓑ 세로(아래) — 라벨 아랫변 ~ 패널 안 다음 콘텐츠 사이에 들어가는가 (+ [2b] backs 위험)
     ⓒ 가로(회피) — 밴드 x 에서 «라벨 ± 코인 반폭» 을 뺀 나머지로 **피치 ≥ FX3_MIND** 가 되는가

   그래서 재는 것: 밴드 x 파라미터(bx0/bx1/nsl/pitch — 게임 코드와 같은 식) · 코인 상자 실측
   w×h · 버튼 아래 패널 안 콘텐츠 상자 · 패널 좌우 경계(fx3PanL/outX).

   실행: node tools/p58aq.js */
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
    openQuest();
  });
  await p.waitForTimeout(600);

  const out = await p.evaluate(() => {
    const fr = document.getElementById('app'), fb = fr.getBoundingClientRect();
    const sc = fb.width / fr.offsetWidth;
    const F = (r) => ({ x: (r.x - fb.x) / sc, y: (r.y - fb.y) / sc, w: r.width / sc, h: r.height / sc });
    const btn = document.getElementById('qAll');
    const bb = F(btn.getBoundingClientRect());
    let lb = null;
    { const rg = document.createRange(); let best = null;
      const walk = (n) => { if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width && (!best || r.width > best.width)) best = r; } for (const c of n.childNodes) walk(c); };
      walk(btn); if (best) lb = F(best); }
    const p0 = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
    const outX = fx3Out(p0);
    const panL = fx3PanL;
    const esc = fx3Escape(p0);
    /* 게임 코드와 같은 식 (두 재화 → lane 분기, nsl = 2*cnt) */
    const cnt = 8, nsl = 2 * cnt;
    let bx1 = Math.min(p0.x + FX3_BSX0 + Math.max(FX3_BSX1 - FX3_BSX0, nsl * FX3_BSPITCH), outX - FX3_BSOM);
    let bx0 = Math.min(p0.x + FX3_BSX0, bx1 - 60);
    if (esc && esc.free) bx0 = Math.max(panL + FX3_BSOM, Math.min(bx0, bx1 - nsl * FX3_BSPITCH));
    /* 버튼 아래 패널 안 콘텐츠 — «세로(아래)» 후보의 방 */
    const pan = [...document.querySelectorAll(FX3_PANEL)].map(el => F(el.getBoundingClientRect()))
      .filter(r => r.w >= 240 && p0.x >= r.x && p0.x <= r.x + r.w && p0.y >= r.y && p0.y <= r.y + r.h)[0] || null;
    const below = [];
    if (pan) {
      for (const el of document.querySelectorAll('#mbox *, #panel *')) {
        const r0 = el.getBoundingClientRect(); if (!r0.width || !r0.height) continue;
        const r = F(r0);
        if (r.y >= bb.y + bb.h - 2 && r.y < pan.y + pan.h + 4 && r.w >= 20 && r.h >= 10)
          below.push({ id: el.id || el.className.toString().slice(0, 28), y: r.y, h: r.h, x: r.x, w: r.w });
      }
    }
    below.sort((a, c) => a.y - c.y);
    return { bb, lb, p0, outX, panL, esc, bx0, bx1, nsl, pan, below: below.slice(0, 8),
             MIND: FX3_MIND, PITCH: FX3_BSPITCH, BSFY: FX3_BSFY, OUTM: FX3_OUTM, BSOM: FX3_BSOM };
  });

  /* 코인 상자 실측 — 트리거 후 머묾 구간의 `.fx-fly` 상자 중앙값 */
  const coin = await p.evaluate(async () => {
    const fr = document.getElementById('app'), fb = fr.getBoundingClientRect();
    const sc = fb.width / fr.offsetWidth;
    document.getElementById('qAll').click();
    const ws = [], hs = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 420) {
      await new Promise(r => requestAnimationFrame(r));
      if (performance.now() - t0 < 180) continue;
      for (const el of document.querySelectorAll('.fx-fly')) {
        const r = el.getBoundingClientRect();
        if (r.width) { ws.push(r.width / sc); hs.push(r.height / sc); }
      }
    }
    const med = (a) => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null;
    return { w: med(ws), h: med(hs), n: ws.length, wmax: ws.length ? Math.max(...ws) : null };
  });

  const R = (r) => r ? `x${r.x.toFixed(1)}~${(r.x + r.w).toFixed(1)} y${r.y.toFixed(1)}~${(r.y + r.h).toFixed(1)} (${r.w.toFixed(1)}×${r.h.toFixed(1)})` : 'null';
  console.log('=== 58 p58aq — 씬 B 밴드 파라미터 · 방(room) 실측 ===');
  console.log('  버튼      ', R(out.bb));
  console.log('  라벨      ', R(out.lb));
  console.log('  패널      ', R(out.pan), ' panL=' + out.panL.toFixed(1) + ' outX=' + out.outX.toFixed(1));
  console.log('  밴드 esc  ', JSON.stringify(out.esc));
  console.log('  밴드 x    ', `bx0 ${out.bx0.toFixed(1)} ~ bx1 ${out.bx1.toFixed(1)} (폭 ${(out.bx1 - out.bx0).toFixed(1)}) · 슬롯 ${out.nsl} · 피치 ${((out.bx1 - out.bx0) / out.nsl).toFixed(2)} (FX3_MIND ${out.MIND})`);
  console.log('  코인 상자 ', coin.w ? `${coin.w.toFixed(1)}×${coin.h.toFixed(1)} (표본 ${coin.n} · 최대폭 ${coin.wmax.toFixed(1)})` : '표본 없음');
  console.log('\n  ⓒ 가로 회피 성립 조건 — 라벨 ± 코인 반폭을 뺀 나머지 폭 / 슬롯 ≥ FX3_MIND');
  if (coin.w && out.lb) {
    const hw = coin.w / 2;
    const k0 = out.lb.x - hw, k1 = out.lb.x + out.lb.w + hw;
    const keep = Math.min(k1, out.bx1) - Math.max(k0, out.bx0);
    const rest = (out.bx1 - out.bx0) - Math.max(0, keep);
    console.log(`     keep-out x${k0.toFixed(1)}~${k1.toFixed(1)} (밴드 안 ${Math.max(0, keep).toFixed(1)}px) → 남는 폭 ${rest.toFixed(1)} / ${out.nsl} = 피치 ${(rest / out.nsl).toFixed(2)}`);
    const need = out.nsl * out.MIND + Math.max(0, keep);
    console.log(`     피치 ≥ ${out.MIND} 을 만족하려면 밴드 폭 ${need.toFixed(1)} 필요 (현재 ${(out.bx1 - out.bx0).toFixed(1)}) · 왼쪽 하한 panL+BSOM = ${(out.panL + out.BSOM).toFixed(1)}`);
    console.log(`     왼쪽 끝까지 열면 폭 ${(out.bx1 - (out.panL + out.BSOM)).toFixed(1)} → 회피 후 피치 ${(((out.bx1 - (out.panL + out.BSOM)) - Math.max(0, keep)) / out.nsl).toFixed(2)}`);
  }
  console.log('\n  ⓐ/ⓑ 세로 방 — 버튼 아래 패널 안 콘텐츠(상위 8개)');
  out.below.forEach(r => console.log('     ' + r.id + '  y' + r.y.toFixed(1) + '~' + (r.y + r.h).toFixed(1) + ' x' + r.x.toFixed(0) + '~' + (r.x + r.w).toFixed(0)));
  await b.close();
})();
