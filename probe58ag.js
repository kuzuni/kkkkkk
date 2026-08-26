/* 58 30회차 — «씬 B 밴드 재작업» 착수 실측.
   29차 2인 공통 4건이 전부 이 밴드 하나에서 나온다:
     ③-1 골드·다이아가 좌우 완전 분리(«깍지» 사양 직접 위반, 겹침 0px)
     ③-2 퍼짐이 16:1 2단 지그재그 리본(y 두 값뿐 · x 간격 σ3.4) — 씬 A 는 4.9:1 구름
     ③-3 밴드 중심이 «누른 버튼» 에서 Δx −341(두 사람 동일값)
     ①-4 퍼짐 완료 ≈350ms (사양 220 · 씬 A 190)
   고치기 전에 **밴드가 실제로 얼마나 넓은지**부터 잰다 — 27·28회차가 «폭은 못 늘린다» 로
   두 번 미룬 전제가 맞는지 확인하는 것이 이 회차의 첫걸음이다.
   재는 것: 퀘스트 행의 fx3Escape 밴드(lo/hi/높이) · outX · p0(보상 배지) · 누른 버튼 rect ·
            현재 bx0/bx1 과 그 상한(outX−FX3_BSOM) 사이의 미사용 여유 · 실제 끝점 통계. */
const { pw, launch } = require('./tools/pwlaunch');
const path = require('path');
(async () => {
  const { chromium } = pw();
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    const runs = [];
    let geo = null;
    for (let k = 0; k < 5; k++) {
      /* cap58 씬 2 와 같은 상태 */
      S.gold = 820;
      fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0; fxHold.gold = 0;
      const q = QUESTS.find(x => x.id === 'kill');
      S.quest.kill.base = q.get() - questGoal(q);
      openQuest('rep');
      await sleep(420);
      const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
      if (!btn) { closeModal(); await sleep(200); continue; }
      const rc = btn.getBoundingClientRect();
      if (!geo) {
        /* 보상 배지 = fxAt 대상. 행 안에서 찾는다 */
        const row = btn.closest('.qs-r');
        const rr = row ? fxRect(row) : null;
        const bd = row ? row.querySelector('.qs-rw, .qs-rew, b, .rw') : null;
        geo = {
          btn: { x: +(rc.left + rc.width / 2).toFixed(1), y: +(rc.top + rc.height / 2).toFixed(1),
                 w: +rc.width.toFixed(1), h: +rc.height.toFixed(1) },
          row: rr ? { x: +rr.x.toFixed(1), y: +rr.y.toFixed(1), w: +rr.w.toFixed(1), h: +rr.h.toFixed(1) } : null,
          badge: bd ? (r => r && { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1) })(fxRect(bd)) : null,
          p0: null, esc: null, outX: null,
          FX3_BSX0, FX3_BSX1, FX3_BSOM, FX3_BSY, FX3_EYPAD, FX3_EYUP, FX3_EYMIN, FX3_MIND
        };
        /* 출발점 p0 = 보상 배지 중심(없으면 행 좌측). fx3Out/fx3Escape 를 그 점으로 직접 호출한다 */
        const bp = geo.badge ? { x: geo.badge.x + geo.badge.w / 2, y: geo.badge.y + geo.badge.h / 2 }
                             : { x: rr.x + 120, y: rr.y + rr.h / 2 };
        geo.p0 = { x: +bp.x.toFixed(1), y: +bp.y.toFixed(1) };
        geo.outX = fx3Out(bp);
        const e = fx3Escape(bp);
        geo.esc = e ? { ey: +e.ey.toFixed(1), cb: +e.cb.toFixed(1) } : null;
        /* 밴드 실폭 — fx3Escape 내부 lo/hi 를 같은 식으로 재현 */
        if (rr) {
          const row = btn.closest('.qs-r');
          let top = rr.y + rr.h;
          for (const el2 of row.querySelectorAll('*')) {
            const r2 = fxRect(el2); if (!r2 || r2.w < 4 || r2.h < 4) continue;
            const cs = getComputedStyle(el2);
            if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
            top = Math.min(top, Math.max(r2.y, rr.y));
          }
          let up = FX3_EYUP;
          const prev = row.previousElementSibling, pr = prev ? fxRect(prev) : null;
          if (pr) up = Math.min(up, Math.max(0, rr.y - (pr.y + pr.h)));
          geo.band = { lo: +(rr.y - up + FX3_EYPAD).toFixed(1), hi: +(top - FX3_EYPAD).toFixed(1),
                       h: +((top - FX3_EYPAD) - (rr.y - up + FX3_EYPAD)).toFixed(1),
                       up, contentTop: +top.toFixed(1),
                       prevBottom: pr ? +(pr.y + pr.h).toFixed(1) : null };
        }
      }
      const pe = t => new PointerEvent(t, { bubbles: true, cancelable: true,
        clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 });
      btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
      await sleep(140);
      const f = fxFlies.filter(x => x.ui).map(x => ({ cur: x.cur, ax: +x.ax.toFixed(1), ay: +x.ay.toFixed(1),
        sx: +x.sx.toFixed(1), sy: +x.sy.toFixed(1), bnd: !!x.bnd }));
      if (f.length) runs.push(f);
      await sleep(2200);
      closeModal(); await sleep(250);
      document.querySelectorAll('#fxl s, #fxl i, #fxl b').forEach(e => e.remove());
    }
    return { geo, runs };
  });
  await b.close();
  if (!out.runs || !out.runs.length) { console.log(JSON.stringify(out, null, 1)); process.exit(1); }
  const g = out.geo;
  console.log('=== 기하 ===');
  console.log('버튼 중심   ', g.btn);
  console.log('행 rect     ', g.row);
  console.log('보상 배지   ', g.badge);
  console.log('p0(배지중심)', g.p0);
  console.log('밴드 lo/hi  ', g.band);
  console.log('escY        ', g.esc);
  console.log('outX        ', g.outX, ' 밴드 x 상한(outX−BSOM) =', g.outX != null ? g.outX - g.FX3_BSOM : null);
  if (g.p0) console.log('현행 bx0/bx1', +(g.p0.x + g.FX3_BSX0).toFixed(0), +Math.min(g.p0.x + g.FX3_BSX1, g.outX - g.FX3_BSOM).toFixed(0),
    ' → 우측 미사용 여유', +((g.outX - g.FX3_BSOM) - Math.min(g.p0.x + g.FX3_BSX1, g.outX - g.FX3_BSOM)).toFixed(0) + 'px');
  console.log('상수        ', { BSX0: g.FX3_BSX0, BSX1: g.FX3_BSX1, BSOM: g.FX3_BSOM, BSY: g.FX3_BSY,
                                EYPAD: g.FX3_EYPAD, EYUP: g.FX3_EYUP, EYMIN: g.FX3_EYMIN, MIND: g.FX3_MIND });
  const sd = a => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
  console.log('\n=== 퍼짐 끝점 (' + out.runs.length + '회) ===');
  for (const f of out.runs) {
    const gold = f.filter(o => o.cur === 'gold'), dia = f.filter(o => o.cur !== 'gold');
    const xr = a => a.length ? [Math.min(...a.map(o => o.ax)).toFixed(0), Math.max(...a.map(o => o.ax)).toFixed(0)].join('~') : '-';
    const xs = f.map(o => o.ax).sort((a, b2) => a - b2);
    const gaps = xs.slice(1).map((v, i) => v - xs[i]);
    const ys = f.map(o => o.ay);
    let near = 1e9, alt = 0;
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++)
      near = Math.min(near, Math.hypot(f[i].ax - f[j].ax, f[i].ay - f[j].ay));
    /* 통화 «교대» 횟수 — x 오름차순으로 늘어놓고 이웃끼리 통화가 바뀌는 횟수 */
    const bycur = f.slice().sort((a, b2) => a.ax - b2.ax).map(o => o.cur);
    for (let i = 1; i < bycur.length; i++) if (bycur[i] !== bycur[i - 1]) alt++;
    const W = Math.max(...f.map(o => o.ax)) - Math.min(...f.map(o => o.ax));
    const H = Math.max(...ys) - Math.min(...ys);
    console.log(` n=${f.length} 골드x ${xr(gold)} · 다이아x ${xr(dia)} | 교대 ${alt}회 | bbox ${W.toFixed(0)}×${H.toFixed(0)} = ${(W / Math.max(H, 1)).toFixed(1)}:1`
      + ` | x간격 med ${gaps.sort((a, b2) => a - b2)[gaps.length >> 1].toFixed(1)} σ${sd(gaps).toFixed(1)}`
      + ` | yσ ${sd(ys).toFixed(1)} · y고유값 ${new Set(ys.map(v => Math.round(v / 4))).size}`
      + ` | 최근접 ${near.toFixed(1)}`);
  }
  const all = out.runs[0];
  const cx = (Math.min(...all.map(o => o.ax)) + Math.max(...all.map(o => o.ax))) / 2;
  console.log('\n밴드 중심 x ' + cx.toFixed(0) + ' vs 버튼 중심 x ' + g.btn.x + ' → Δ ' + (cx - g.btn.x).toFixed(0));
})();
