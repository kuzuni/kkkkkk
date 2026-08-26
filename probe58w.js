/* 58 25회차 — 25차 비평 AS ③-3 · AT ③-3 (2인 공통·동일 수치) «씬 B 골드 복도가 팝업 테두리를
   절반 물고 간다. 다이아 레인(x≈1019)은 테두리 바깥으로 완전히 비껴간다 — 골드를 거기에 맞춰라».
   고치기 전에 복도 x 와 팝업 테두리를 코드/DOM 에서 직접 잰다. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    S.gold = 820; fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
    await sleep(500);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if (!btn) return { err: '보상 받기 버튼 없음' };
    const box = document.getElementById('mbox');
    const cs = getComputedStyle(box);
    const br = box.getBoundingClientRect();
    const rc = btn.getBoundingClientRect();
    const p0 = { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
    const out = {
      mbox: { x: +br.left.toFixed(1), right: +br.right.toFixed(1),
              bw: cs.borderRightWidth, radius: cs.borderRadius },
      btnCenter: { x: +p0.x.toFixed(1), y: +p0.y.toFixed(1) },
      outX: fx3Out(p0), XCAP: FX3_XCAP, OUTM: FX3_OUTM, LANEX: FX3_LANEX, FRAME_W,
    };
    /* 실제 복도 x — 트리거해서 비행 요소의 x 를 재화별로 모은다 */
    const pe = t => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: p0.x, clientY: p0.y });
    btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
    const lane = { gold: [], dia: [] };
    for (let i = 0; i < 110; i++) {
      for (const f of (typeof fxFlies !== 'undefined' ? fxFlies : [])) {
        if (!f.ui || !f.el || !f.el.isConnected) continue;
        const r = f.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        if (cx > 900 && lane[f.cur]) lane[f.cur].push({ cx: +cx.toFixed(1), w: +r.width.toFixed(1) });
      }
      await sleep(14);
    }
    const stat = a => {
      if (!a.length) return null;
      const xs = a.map(o => o.cx).sort((x, y) => x - y);
      const ws = a.map(o => o.w).sort((x, y) => x - y);
      const med = v => v[Math.floor(v.length / 2)];
      return { n: a.length, cxMin: xs[0], cxMed: med(xs), cxMax: xs[xs.length - 1], wMed: med(ws) };
    };
    out.laneGold = stat(lane.gold); out.laneDia = stat(lane.dia);
    return out;
  }), null, 1));
  await b.close();
})();
