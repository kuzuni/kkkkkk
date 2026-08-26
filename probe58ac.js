/* 58 27회차 — 26차 2인 공통 4번(«퍼짐이 아직 8×2 표»: AU «열 간격 56.8px sd 1.90(CV 3.3%) ·
   두 열은 0.1px 까지 일치 · 행 y sd 만 커졌다» · AV «열 잔차 rms 2.6~9.1px · 두 행 39.3px 완전 분리»)
   의 **전후 비교용**. 씬 A 퍼짐 끝점(f.ax/f.ay)을 코드에서 직접 읽어 비평가가 재는 통계를 낸다:
   열 중심 간격의 sd·CV · 같은 열 위·아래 행의 x 차 · 최근접 이웃 중심거리(겹침 판정). */
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
    const runs = [];
    for (let k = 0; k < 6; k++) {
      S.gold = 0; fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
      fxFlies.length = 0;
      const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
      fxAt({ x: 540, y: 1400 });
      S.gold = 128;
      await sleep(120);
      const f = fxFlies.filter(x => x.ui && x.cur === 'gold').map(x => ({ ax: +x.ax.toFixed(1), ay: +x.ay.toFixed(1) }));
      if (f.length) runs.push(f);
      await sleep(1700);
    }
    if (!runs.length) return { err: '스폰 0' };
    const sd = a => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length); };
    const out = { runs: runs.length, n: runs[0].length, per: [] };
    for (const f of runs) {
      const xs = f.map(o => o.ax).sort((a, b2) => a - b2);
      const gaps = xs.slice(1).map((v, i) => v - xs[i]);
      /* 위·아래 행 = ay 중앙값 기준 분리 */
      const ys = f.map(o => o.ay).sort((a, b2) => a - b2);
      const mid = (ys[0] + ys[ys.length - 1]) / 2;
      const top = f.filter(o => o.ay < mid).map(o => o.ax).sort((a, b2) => a - b2);
      const bot = f.filter(o => o.ay >= mid).map(o => o.ax).sort((a, b2) => a - b2);
      const pairDx = top.map((v, i) => bot[i] != null ? Math.abs(v - bot[i]) : null).filter(v => v != null);
      let near = 1e9;
      for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++)
        near = Math.min(near, Math.hypot(f[i].ax - f[j].ax, f[i].ay - f[j].ay));
      const rowGapMin = top.length && bot.length
        ? Math.min(...f.filter(o => o.ay >= mid).map(o => o.ay)) - Math.max(...f.filter(o => o.ay < mid).map(o => o.ay)) : null;
      out.per.push({
        colPitchMed: +gaps.sort((a, b2) => a - b2)[gaps.length >> 1].toFixed(1),
        colPitchSd: +sd(gaps).toFixed(2),
        sameColDxAvg: pairDx.length ? +(pairDx.reduce((s, v) => s + v, 0) / pairDx.length).toFixed(1) : null,
        sameColDxMin: pairDx.length ? +Math.min(...pairDx).toFixed(1) : null,
        rowYsd: +sd(f.map(o => o.ay)).toFixed(1),
        rowGapMin: rowGapMin == null ? null : +rowGapMin.toFixed(1),
        nearestPair: +near.toFixed(1)
      });
    }
    const key = k => out.per.map(p => p[k]).filter(v => v != null);
    const avg = k => { const a = key(k); return a.length ? +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) : null; };
    out.avg = { colPitchMed: avg('colPitchMed'), colPitchSd: avg('colPitchSd'),
                sameColDxAvg: avg('sameColDxAvg'), rowYsd: avg('rowYsd'),
                rowGapMin: avg('rowGapMin'), nearestPair: avg('nearestPair') };
    out.worstNearest = Math.min(...key('nearestPair'));
    out.avg.colPitchCVpct = out.avg.colPitchMed ? +(100 * out.avg.colPitchSd / out.avg.colPitchMed).toFixed(1) : null;
    return out;
  }), null, 1));
  await b.close();
})();
