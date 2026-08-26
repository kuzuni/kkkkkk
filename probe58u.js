/* 58 25회차 — 착수점 4·6 을 «고치기 전에» 잰다 (패널 «밖»(gain 씬) 전용).
 *
 *  착수점 4  퍼짐 상호 가림 — AQ «t=110 에 16개 중 7개가 폭 13~22px 로 가려져 개수를 셀 수 없다» ·
 *            AR «개당 보이는 면적 273/755px² = 64% 가림». 24회차의 «밴드 스프레이» 는 **패널 안**
 *            에만 걸었다(패널 밖은 행이 없어 fx3Escape 가 null). 밖도 같은 병인지 수치로 본다.
 *  착수점 6  AQ ③-2 «비행 코인이 STAGE 진행바(y249~331) 뒤로 들어가 그 구간에서만 15% 어둡다».
 *            «뒤» 인지(z-order) «위인데 바가 코인을 덮는 색인지» 를 elementFromPoint 로 가른다.
 *
 * 내는 값: (a) 프레임별 가시 면적률 = 합집합/합계  (b) 뭉치 bbox·최근접 이웃 간격
 *          (c) STAGE 바 위를 지나는 코인의 «가장 위 요소»  (d) 상수 스냅숏
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    /* cap58 gain 씬과 같은 상태 — 게임 로직만 멈춘다 */
    player.inv = 1e9;
    for (const e of enemies) { e.x = 1; e.y = 1; }
    parts.length = 0; nums.length = 0; shots.length = 0; zones.length = 0; booms.length = 0; bolts.length = 0;
    window.step = () => {};
    await sleep(400);

    const R = el => { const r = el.getBoundingClientRect();
      return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const stinfo = document.getElementById('stinfo');
    const geo = { stinfo: stinfo ? R(stinfo) : null };

    const p0 = fxWorld(player.x + 12, player.y - 20);
    geo.p0 = { x: Math.round(p0.x), y: Math.round(p0.y) };
    fxAt(p0);
    const t0 = performance.now();
    S.gold += 128000;

    /* 합집합 면적은 1px 그리드로 센다(사각형 근사 — 아이콘은 정사각 bbox) */
    const unionArea = rs => {
      if (!rs.length) return 0;
      const x0 = Math.floor(Math.min(...rs.map(r => r.left)));
      const x1 = Math.ceil(Math.max(...rs.map(r => r.right)));
      const y0 = Math.floor(Math.min(...rs.map(r => r.top)));
      const y1 = Math.ceil(Math.max(...rs.map(r => r.bottom)));
      const W = x1 - x0, H = y1 - y0;
      if (W <= 0 || H <= 0 || W * H > 6e6) return -1;
      const grid = new Uint8Array(W * H);
      for (const r of rs) {
        const a = Math.max(x0, Math.floor(r.left)), bb = Math.min(x1, Math.ceil(r.right));
        const c = Math.max(y0, Math.floor(r.top)), d = Math.min(y1, Math.ceil(r.bottom));
        for (let y = c; y < d; y++) { const off = (y - y0) * W - x0; for (let x = a; x < bb; x++) grid[off + x] = 1; }
      }
      let n = 0; for (let i = 0; i < grid.length; i++) n += grid[i];
      return n;
    };

    const rows = [], zhits = [];
    for (let i = 0; i < 60; i++) {
      const els = [...document.querySelectorAll('#fxl .fx-fly, #fxlc .fx-fly')]
        .filter(e => parseFloat(getComputedStyle(e).opacity) > 0.02);
      const rs = els.map(e => e.getBoundingClientRect()).filter(r => r.width > 2);
      if (rs.length) {
        const sum = rs.reduce((a, r) => a + r.width * r.height, 0);
        const uni = unionArea(rs);
        /* 최근접 이웃 중심거리 — 중앙값 */
        const cs = rs.map(r => [r.left + r.width / 2, r.top + r.height / 2]);
        const nn = cs.map((c, j) => Math.min(...cs.filter((_, k) => k !== j)
          .map(o => Math.hypot(o[0] - c[0], o[1] - c[1])))).sort((a, x) => a - x);
        const bx0 = Math.min(...rs.map(r => r.left)), bx1 = Math.max(...rs.map(r => r.right));
        const by0 = Math.min(...rs.map(r => r.top)), by1 = Math.max(...rs.map(r => r.bottom));
        rows.push({ t: Math.round(performance.now() - t0), n: rs.length,
          vis: +(100 * uni / sum).toFixed(1), d: +(rs[0].width).toFixed(1),
          nnMed: +nn[Math.floor(nn.length / 2)].toFixed(1), nnMin: +nn[0].toFixed(1),
          bb: [Math.round(bx0), Math.round(by0), Math.round(bx1 - bx0), Math.round(by1 - by0)] });
        /* STAGE 바 위를 지나는 코인의 최상위 요소 */
        if (geo.stinfo) {
          for (const r of rs) {
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            if (cx >= geo.stinfo.x && cx <= geo.stinfo.x + geo.stinfo.w &&
                cy >= geo.stinfo.y && cy <= geo.stinfo.y + geo.stinfo.h) {
              const top = document.elementFromPoint(cx, cy);
              zhits.push({ t: Math.round(performance.now() - t0),
                el: top ? (top.id || top.className || top.tagName) : null });
            }
          }
        }
      }
      await sleep(12);
    }
    return { geo, rows, zhits: zhits.slice(0, 24),
      K: { A0: FX3_A0 * 180 / Math.PI, A1: FX3_A1 * 180 / Math.PI, R0: FX3_R0, R1: FX3_R1,
           SPREAD: FX3_SPREAD, BSX0: FX3_BSX0, BSX1: FX3_BSX1, BSY: FX3_BSY } };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
