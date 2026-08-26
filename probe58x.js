/* 58 26회차 — 25차 비평 2인 공통 ⑤(«비행 다이아가 골드 대비 과소» AS ②-3 29×37 vs 45×45 ·
   AT ②-1 «골드 44~46 : 다이아 23~26 = 1.80:1») 와 ⑥(«코인 크기 곡선이 비단조» AS ②-1
   «30.8 → 46.6 → 36.2px» · AT ②-3 «25 → 31 → 45 → 25, 최대치가 경로 중간») 를
   **고치기 전에** 코드에서 직접 잰다. 비평가가 재는 것과 같은 양(화면상 폭)을 위상별로 모은다.

   출력: 위상 버킷(spread/hold/fly-early/fly-mid/fly-late/land)별 재화 rect 폭 중앙값 +
        같은 프레임에서 잰 골드:다이아 비 + 전 비행에 걸친 «폭 최대치가 어느 위상에 오는가». */
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
    S.dia = 30; fxSeen.dia = S.dia; fxDisp.dia = S.dia; fxAcc.dia = 0; fxHold.dia = 0;
    const q = QUESTS.find(x => x.id === 'kill');
    S.quest.kill.base = q.get() - questGoal(q);
    openQuest('rep');
    await sleep(500);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if (!btn) return { err: '보상 받기 버튼 없음' };
    const p0 = (r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 }))(btn.getBoundingClientRect());
    const pe = t => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: p0.x, clientY: p0.y });
    btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();

    /* 위상 = 아이콘 자신의 진행률로 매긴다(f.sd 퍼짐 · f.ha 흡수 시작 · f.dur 도착) */
    const ph = f => {
      if (f.t < f.sd) return 'a-spread';
      if (f.t < f.ha) return 'b-hold';
      const q2 = (f.t - f.ha) / f.ad;
      return q2 < 0.33 ? 'c-fly-early' : q2 < 0.72 ? 'd-fly-mid' : q2 < 0.94 ? 'e-fly-late' : 'f-land';
    };
    const rec = {};                                  /* 재화 → 위상 → [폭] */
    const pair = [];                                 /* 같은 프레임 골드/다이아 폭 중앙값 쌍 */
    const peak = {};                                 /* 재화 → {w, ph} 최대 폭이 온 위상 */
    for (let i = 0; i < 130; i++) {
      const fr = {};
      for (const f of (typeof fxFlies !== 'undefined' ? fxFlies : [])) {
        if (!f.ui || !f.el || !f.el.isConnected) continue;
        const w = +f.el.getBoundingClientRect().width.toFixed(1);
        if (!w) continue;
        const k = f.cur, p = ph(f);
        (rec[k] = rec[k] || {}); (rec[k][p] = rec[k][p] || []).push(w);
        (fr[k] = fr[k] || []).push(w);
        if (!peak[k] || w > peak[k].w) peak[k] = { w, ph: p };
      }
      const med = a => { if (!a || !a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
      if (fr.gold && fr.dia) pair.push({ g: med(fr.gold), d: med(fr.dia) });
      await sleep(14);
    }
    const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const out = { phase: {}, peak, pairs: pair.length };
    for (const k in rec) {
      out.phase[k] = {};
      for (const p of Object.keys(rec[k]).sort()) out.phase[k][p] = { n: rec[k][p].length, wMed: med(rec[k][p]) };
    }
    if (pair.length) {
      const rs = pair.map(o => +(o.g / o.d).toFixed(3));
      out.goldDiaRatio = { min: Math.min(...rs), med: med(rs), max: Math.max(...rs) };
    }
    /* HUD 알약 아이콘 실측(목적지 대비 비율의 분모) */
    const hud = k => { const e = document.querySelector(FXCUR[k].pill + ' i > .cic'); const r = e && e.getBoundingClientRect(); return r ? { w: +r.width.toFixed(1), h: +r.height.toFixed(1) } : null; };
    out.hud = { gold: hud('gold'), dia: hud('dia') };
    return out;
  }), null, 1));
  await b.close();
})();
