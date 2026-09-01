/* 작업 672 재현자 — `verify564` [E]«머묾 창 코인 중심 ↔ 라벨 최소 여유»가 왜 문턱(FX3_KOM − FX3_BSFX)
 * 바로 아래에서 흔들리는가를 **제품에게 직접 묻는다**(338 규칙 — 자를 고치기 전에 제품에게 묻는다).
 *
 * 등재문의 관측: 씨앗 20260829 에서 «최소 여유 50.1px ≥ 50.5» 1건이 실행마다 갈린다(8/9 ↔ 9/9).
 *
 * 이 자가 가르는 것 넷 — [E] 가 재는 값은 **좌표계가 둘 섞인 값**이라, 아래를 나눠 찍는다:
 *   ⓐ 배치(base)  — `fxFlies[].ax` 가 keep-out 구멍 밖에 있는가(프레임 좌표 · 제품 자신의 자).
 *                    `fx3Eject` 는 구멍 «가장자리» 를 그대로 돌려주므로 설계값은 **정확히 FX3_KOM**이다.
 *   ⓑ 순간(inst)  — 배치 + 머묾 부유(cos·FX3_BSFX) 의 순간 여유. 설계 하한은 **정확히 KOM − BSFX**.
 *   ⓒ 자(gate)    — [E] 가 재는 것: `.cic` 의 **뷰포트** 중심 ↔ **자기가 따로 잰 라벨 상자**.
 *   ⓓ 두 자의 차 — 라벨 상자(제품 keep-out 원본 vs [E] 의 Range 최대폭)와 프레임 배율 s.
 *
 * 실행: node tools/probe672.js [--runs N] [--seeds a,b,c] */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RUNS = +arg('--runs', 3);
const SEEDS = arg('--seeds', '20260828,20260829,20260830').split(',').map(Number);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

async function scene(seed, work) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    let s = sd >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
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
  await p.waitForTimeout(500);
  const out = await p.evaluate(work);
  await b.close();
  return out;
}

/* 머묾 창을 [E] 와 같은 리듬(12ms)으로 훑되, 네 자를 **같은 순간에** 찍는다. */
const measure = async () => {
  const f0 = fxSc();
  const btn = document.getElementById('qAll');
  const p0 = fxPt(btn);
  const outX = fx3Out(p0);
  const escY = fx3Escape(p0);
  if (!p0 || !outX || !escY || !escY.free) return { err: '자유 밴드를 못 잡았다' };

  /* [E] 가 쓰는 라벨 상자(뷰포트 · 버튼 안 텍스트 노드 중 «가장 넓은 것» 하나) */
  let qlab = null;
  { const rg = document.createRange(); let best = null;
    const walk = (nd) => { if (nd.nodeType === 3 && nd.textContent.trim()) { rg.selectNodeContents(nd); const rr = rg.getBoundingClientRect(); if (rr.width && (!best || rr.width > best.width)) best = rr; } for (const c of nd.childNodes) walk(c); };
    walk(btn); if (best) qlab = { x: best.left, y: best.top, w: best.width, h: best.height }; }

  /* 제품 자신의 keep-out — 구멍은 «글자 상자 ± FX3_KOM» 이므로 되좁히면 원본 글자 상자다(프레임 좌표) */
  const raw = escY.keep.map(h => [h[0] + FX3_KOM, h[1] - FX3_KOM]);

  const need = FX3_KOM - FX3_BSFX;
  const H = { a: FX3_SPREAD * 1000, b: (FX3_SPREAD + FX3_HOLD_F) * 1000 };
  const t0 = performance.now();
  btn.click();

  let ns = 0, peak = 0;
  let gmin = 1e9, imin = 1e9, bmin = 1e9;      /* 자 / 순간(프레임) / 배치(프레임) */
  let gminNoY = 1e9;                            /* y 대역 필터를 안 걸었을 때의 자 값 */
  let devmax = 0, offmax = 0;                   /* |측정 중심 − ax| 실측 진폭 · `.cic` ↔ `.fx-fly` 중심 어긋남 */
  /* ⓕ **제품 자신의 머묾 창**(fl.sd ≤ fl.t < fl.ha)에서만 잰 값 — [E] 의 전역 창과 갈라서 찍는다 */
  let hmin = 1e9, hdev = 0, hns = 0, hcoin = 0, lat0 = 1e9, lat1 = -1e9;
  const ph = { a: 0, b: 0, c: 0 };
  const sam = [];
  await new Promise((res) => {
    const tick = () => {
      const t = performance.now() - t0;
      peak = Math.max(peak, document.querySelectorAll('.fx-fly').length);
      if (t >= H.a && t <= H.b) {
        ns++;
        const fs = fxSc();
        hns++;
        for (const fl of fxFlies) {
          if (!fl.bnd || !fl.el) continue;
          const ic = fl.el.querySelector('.cic'); const rr = (ic || fl.el).getBoundingClientRect();
          const cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
          const cxF = (cx - fs.x) / fs.s;                       /* 뷰포트 → 프레임 */
          /* ⓔ 자가 재는 «중심» 이 배치값에서 실제로 얼마나 흔들리는가 — 설계는 ±FX3_BSFX 뿐이다 */
          devmax = Math.max(devmax, Math.abs(cxF - fl.ax));
          { const er = fl.el.getBoundingClientRect();
            if (ic && er.width) offmax = Math.max(offmax, Math.abs(cx - (er.left + er.width / 2)) / fs.s); }
          /* ⓕ 이 코인이 «지금» 어느 국면인가 — 제품 자신의 시계로 */
          const inHold = fl.t >= fl.sd && fl.t < fl.ha;
          if (fl.t < fl.sd) ph.a++; else if (inHold) ph.b++; else ph.c++;
          lat0 = Math.min(lat0, fl.st - t0); lat1 = Math.max(lat1, fl.st - t0);
          if (inHold) {
            hcoin++; hdev = Math.max(hdev, Math.abs(cxF - fl.ax));
            for (const rb of raw) hmin = Math.min(hmin, Math.max(rb[0] - cxF, cxF - rb[1]));
          }
          /* ⓐ 배치 · ⓑ 순간 — 제품의 원본 글자 상자로 잰다 */
          for (const rb of raw) {
            bmin = Math.min(bmin, Math.max(rb[0] - fl.ax, fl.ax - rb[1]));
            imin = Math.min(imin, Math.max(rb[0] - cxF, cxF - rb[1]));
          }
          /* ⓒ 자 — [E] 와 완전히 같은 식 */
          if (qlab) {
            const d = Math.max(qlab.x - cx, cx - (qlab.x + qlab.w));
            gminNoY = Math.min(gminNoY, d);
            if (cy >= qlab.y && cy <= qlab.y + qlab.h) {
              gmin = Math.min(gmin, d);
              if (sam.length < 40) sam.push({ t: +t.toFixed(0), ax: +fl.ax.toFixed(2), cxF: +cxF.toFixed(2), cx: +cx.toFixed(2), d: +d.toFixed(2) });
            }
          }
        }
      }
      if (t >= 700) return res();
      setTimeout(tick, 12);
    };
    tick();
  });
  return {
    s: f0.s, fx: f0.x, KOM: FX3_KOM, BSFX: FX3_BSFX, MIND: FX3_MIND, need,
    keep: escY.keep, raw, qlab, ns, peak,
    gmin, gminNoY, imin, bmin, devmax, offmax, hmin, hdev, hns, hcoin, ph,
    lat: [lat0 === 1e9 ? null : +lat0.toFixed(1), lat1 === -1e9 ? null : +lat1.toFixed(1)], sam
  };
};

/* [8] 등재문의 숫자(«50.1 ≥ 50.5» = 문턱보다 0.4px 모자람)를 **그대로 재현**한다.
   등재 당시(644 전, 잉크 108.3 → KOM 61.5)는 밴드가 좁아 `fx3Eject` 가 코인을 구멍 «가장자리»
   에 그대로 뱉었다 — 배치 여유가 **정확히 KOM**. 지금 트리는 잉크가 커져 상한이 3슬롯이라
   배치가 가장자리에서 떨어져 있어(실측 90~165) 그 자리가 안 만들어진다. 그래서 배치를
   가장자리로 **직접 되돌려** 두 창(자의 전역 창 · 제품의 국면 창)을 같은 실행에서 나란히 잰다. */
const edge = async () => {
  const btn = document.getElementById('qAll');
  const p0 = fxPt(btn); const escY = fx3Escape(p0);
  if (!escY || !escY.free || !escY.keep.length) return { err: '자유 밴드/구멍을 못 잡았다' };
  const raw = escY.keep.map(h => [h[0] + FX3_KOM, h[1] - FX3_KOM]);
  const need = FX3_KOM - FX3_BSFX;
  const H = { a: FX3_SPREAD * 1000, b: (FX3_SPREAD + FX3_HOLD_F) * 1000 };
  const t0 = performance.now();
  btn.click();
  /* 배치를 구멍 오른쪽 가장자리로 — 644 이전의 «뱉은 자리» 를 그대로 만든다.
     ⚠ 스폰은 클릭보다 18~29ms 늦다(위 [6]) — 클릭 직후에 훑으면 `fxFlies` 가 비어 있어 아무것도
     안 바뀐다. 첫 틱에서 «생겨 있으면» 잡는다. */
  const edgeX = escY.keep[escY.keep.length - 1][1];
  let tgt = null;
  let oldMin = 1e9, newMin = 1e9, oldN = 0, newN = 0, oldOff = 0;
  await new Promise((res) => {
    const tick = () => {
      const t = performance.now() - t0; const fs = fxSc();
      if (!tgt) for (const fl of fxFlies) if (fl.bnd && fl.el) { fl.ax = edgeX; fl.ph = edgeX * FX3_BSWK; tgt = fl; break; }
      for (const fl of (tgt ? [tgt] : [])) {
        if (!fl.el) continue;
        const ic = fl.el.querySelector('.cic'); const rr = (ic || fl.el).getBoundingClientRect();
        const cxF = (rr.left + rr.width / 2 - fs.x) / fs.s;
        let d = 1e9; for (const rb of raw) d = Math.min(d, Math.max(rb[0] - cxF, cxF - rb[1]));
        if (t >= H.a && t <= H.b) { oldN++; oldMin = Math.min(oldMin, d); if (!(fl.t >= fl.sd && fl.t < fl.ha)) oldOff++; }
        if (fl.t >= fl.sd && fl.t < fl.ha) { newN++; newMin = Math.min(newMin, d); }
      }
      if (t >= 700) return res();
      setTimeout(tick, 12);
    };
    tick();
  });
  return { oldMin, newMin, oldN, newN, oldOff, need, KOM: FX3_KOM, BSFX: FX3_BSFX };
};

(async () => {
  console.log('PROBE672 — verify564 [E] 문턱 경계 재현 (머묾 창 코인 ↔ 라벨 여유)\n');
  const rows = [];
  for (const sd of SEEDS) {
    for (let k = 0; k < RUNS; k++) {
      const r = await scene(sd, measure);
      if (r.err) { console.log(`  ✗ 씨앗 ${sd} #${k + 1}: ${r.err}`); fail++; continue; }
      rows.push({ sd, k, ...r });
      const g = r.gmin === 1e9 ? 'n/a' : r.gmin.toFixed(2);
      console.log(`  씨앗 ${sd} #${k + 1}: 표본 ${r.ns} · s=${r.s} · [자]최소 ${g} (문턱 ${r.need})`
        + ` · [순간]${r.imin === 1e9 ? 'n/a' : r.imin.toFixed(2)} · [배치]${r.bmin === 1e9 ? 'n/a' : r.bmin.toFixed(2)} (설계 ≥ ${r.KOM})`
        + ` · 실측진폭 ${r.devmax.toFixed(2)} (설계 ≤ ${r.BSFX})`
        + `\n              국면 a(퍼짐)/b(머묾)/c(흡수) = ${r.ph.a}/${r.ph.b}/${r.ph.c} · 스폰 지연 ${r.lat[0]}~${r.lat[1]}ms`
        + ` · [제품 머묾창]최소 ${r.hmin === 1e9 ? 'n/a' : r.hmin.toFixed(2)} · 그 창의 진폭 ${r.hdev.toFixed(2)}`);
    }
  }
  if (!rows.length) { console.log('\n표본 0 — 재현 실패'); process.exit(1); }

  const R0 = rows[0];
  console.log(`\n  [계측] FX3_KOM ${R0.KOM} · FX3_BSFX ${R0.BSFX} · FX3_MIND ${R0.MIND} · 문턱(need) ${R0.need}`);
  console.log(`         제품 keep-out(프레임) ${JSON.stringify(R0.keep.map(h => h.map(v => +v.toFixed(2))))}`);
  console.log(`         되좁힌 원본 글자 상자(프레임) ${JSON.stringify(R0.raw.map(h => h.map(v => +v.toFixed(2))))}`);
  console.log(`         [E] 의 라벨 상자(뷰포트) x ${R0.qlab ? R0.qlab.x.toFixed(2) : 'n/a'} .. ${R0.qlab ? (R0.qlab.x + R0.qlab.w).toFixed(2) : 'n/a'}`
    + ` (폭 ${R0.qlab ? R0.qlab.w.toFixed(2) : 'n/a'})`);
  if (R0.qlab) {
    const wF = R0.qlab.w / R0.s, xF = (R0.qlab.x - R0.fx) / R0.s;
    const rawW = R0.raw.length ? (R0.raw[R0.raw.length - 1][1] - R0.raw[0][0]) : NaN;
    console.log(`         → 프레임 환산 ${xF.toFixed(2)} .. ${(xF + wF).toFixed(2)} (폭 ${wF.toFixed(2)}) · 제품 원본 폭 ${rawW.toFixed(2)}`
      + ` · **폭 차 ${(wF - rawW).toFixed(2)}px**`);
  }

  const seen = rows.filter(r => r.gmin < 1e9);
  console.log('\n[1] 자([E])가 문턱 아래로 내려간 실행이 있는가');
  const below = seen.filter(r => r.gmin < r.need);
  ok(true, `y 대역에 코인이 든 실행 ${seen.length}/${rows.length} · 그 중 문턱 미만 ${below.length}건`
    + (seen.length ? ` · 자 최소값 폭 ${Math.min(...seen.map(r => r.gmin)).toFixed(2)}~${Math.max(...seen.map(r => r.gmin)).toFixed(2)}` : ''));

  console.log('[2] 배치(ax)는 설계(≥ FX3_KOM)를 지키는가 — 지키면 제품 결함이 아니다');
  const bs = rows.filter(r => r.bmin < 1e9);
  const bworst = bs.length ? Math.min(...bs.map(r => r.bmin)) : NaN;
  ok(bs.length > 0 && bworst >= R0.KOM - 1e-6, `배치 최소 여유 ${bworst.toFixed(3)} (설계 ≥ ${R0.KOM})`);

  console.log('[3] 순간(배치 + 부유)은 설계 하한(KOM − BSFX)을 지키는가 — 프레임 좌표로');
  const is = rows.filter(r => r.imin < 1e9);
  const iworst = is.length ? Math.min(...is.map(r => r.imin)) : NaN;
  ok(is.length > 0 && iworst >= R0.need - 1e-6, `순간 최소 여유 ${iworst.toFixed(3)} (설계 ≥ ${R0.need})`);

  console.log('[4] 설계 하한에 «정확히» 앉는가 — 여유가 0 이면 자는 구조적으로 경계에 걸린다');
  ok(is.length > 0, `순간 최소 − 문턱 = ${(iworst - R0.need).toFixed(3)}px (0 이면 «딱 붙어 있다»)`);

  console.log('[5] ⚑ 자가 재는 «중심» 의 실측 진폭이 설계 진폭(FX3_BSFX)을 넘는가 — 넘으면 문턱 자신이 틀렸다');
  const dv = Math.max(...rows.map(r => r.devmax));
  const offw = Math.max(...rows.map(r => r.offmax));
  ok(true, `실측 진폭 최대 ${dv.toFixed(3)}px vs FX3_BSFX ${R0.BSFX} — 초과분 **${(dv - R0.BSFX).toFixed(3)}px**`
    + ` · \`.cic\` 중심이 \`.fx-fly\` 중심에서 최대 ${offw.toFixed(3)}px 어긋난다`);

  console.log('[6] ⚑⚑ 갈래 확정 — [E] 의 «전역 창» 표본이 제품의 머묾 국면 밖(퍼짐·흡수)을 세는가');
  const outb = rows.reduce((a, r) => a + r.ph.a + r.ph.c, 0), inb = rows.reduce((a, r) => a + r.ph.b, 0);
  ok(true, `[E] 창 안 표본 ${inb + outb}개 중 **국면 밖 ${outb}개**(퍼짐 ${rows.reduce((a, r) => a + r.ph.a, 0)} · 흡수 ${rows.reduce((a, r) => a + r.ph.c, 0)})`
    + ` — 스폰 지연 ${Math.min(...rows.map(r => r.lat[0]))}~${Math.max(...rows.map(r => r.lat[1]))}ms 만큼 두 창이 어긋난다`);

  console.log('[7] 제품 자신의 머묾 창에서만 재면 진폭이 설계(FX3_BSFX)를 지키는가');
  const hd = Math.max(...rows.map(r => r.hdev));
  const hs = rows.filter(r => r.hmin < 1e9);
  ok(hs.length > 0 && hd <= R0.BSFX + 0.6,
    `머묾 창 진폭 최대 ${hd.toFixed(3)}px ≤ FX3_BSFX ${R0.BSFX}(+반올림 0.05) · 그 창의 최소 여유 ${hs.length ? Math.min(...hs.map(r => r.hmin)).toFixed(2) : 'n/a'} (문턱 ${R0.need})`);

  if (below.length) {
    console.log('\n  [표본] 문턱 아래로 내려간 첫 실행의 표본(앞 8개):');
    for (const s of below[0].sam.slice(0, 8)) console.log(`         t=${s.t}ms ax=${s.ax} cxF=${s.cxF} cx=${s.cx} d=${s.d}`);
  }

  console.log('\n[8] ⚑⚑ 등재문 재현 — 배치를 구멍 가장자리(644 이전 거동)로 되돌리고 두 창을 나란히 잰다');
  const eg = [];
  for (const sd of SEEDS) for (let k = 0; k < RUNS; k++) {
    const e = await scene(sd, edge);
    if (e.err) { console.log(`      씨앗 ${sd} #${k + 1}: ${e.err}`); continue; }
    eg.push(e);
    console.log(`      씨앗 ${sd} #${k + 1}: [자의 전역 창] 표본 ${e.oldN} · 최소 ${e.oldMin === 1e9 ? 'n/a' : e.oldMin.toFixed(1)}`
      + ` (국면 밖 ${e.oldOff}개 섞임) ↔ [제품 국면 창] 표본 ${e.newN} · 최소 ${e.newMin === 1e9 ? 'n/a' : e.newMin.toFixed(1)}`
      + ` · 문턱 ${e.need} · 국면 창 부족분 ${(e.need - e.newMin).toFixed(3)}px`);
  }
  const under = eg.filter(e => e.oldMin < e.need).length;
  ok(eg.length > 0 && under > 0,
    `전역 창이 문턱 아래로 내려간 실행 **${under}/${eg.length}** (등재문의 «50.1 ≥ 50.5» 와 같은 꼴)`);
  /* ⚑ 국면 창으로 걸러도 «가장자리 배치» 는 설계상 문턱에 **정확히** 앉는다 — 남는 오차는 제품이
     `transform: translate(x.toFixed(1)px …)` 로 **0.1px 격자에 양자화**하는 몫(±0.05)뿐이다.
     그 몫을 재서 적어 두는 것이 자의 허용오차 근거다(«문턱을 그냥 내리는 것» 이 아니다). */
  const worst = eg.length ? Math.max(...eg.map(e => e.need - e.newMin)) : NaN;
  const nOk = eg.filter(e => e.need - e.newMin <= 0.05 + 1e-9).length;
  ok(eg.length > 0 && nOk === eg.length,
    `같은 실행에서 국면 창은 ${nOk}/${eg.length} 이 «문턱 − 0.05(제품 toFixed(1) 격자)» 이상 — 최대 부족분 **${worst.toFixed(3)}px**`
    + ` · 최소값 폭 ${eg.length ? Math.min(...eg.map(e => e.newMin)).toFixed(3) : 'n/a'}~${eg.length ? Math.max(...eg.map(e => e.newMin)).toFixed(3) : 'n/a'}`);

  console.log(`\nPROBE672 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
