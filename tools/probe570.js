/* 작업 570 재현기 — `tools/verify93.js` 의 타이밍 축이 «CPU 부하» 에서 뜨고 지는 이유를 가른다.
 *
 * 등재문(PROGRESS 570 행)의 관측: 단독 6회 연속 21/21 인데 같은 자 3개를 동시에 돌리면
 * 20/21(역행) · 18/21(역행 · 피크 배율 ×1.072 · 듀티 42.9%) 로 갈린다.
 *
 * 갈래는 둘이고, 이 재현기는 그 둘을 **따로** 잰다.
 *   ⓐ «샘플러 위상» — 자의 rAF 표본이 성기어지면서 값이 **표본 간격에 물린다**(제품은 멀쩡).
 *   ⓑ «제품 프레임» — 제품의 `fxPzTick(dt)` 자신이 늦게 돌아 **그려지는 값이 실제로 낮아진다**
 *      (고원 `FX3_PZ_HOLD` 50ms 를 dt 한 번이 통째로 삼키면 봉우리가 한 프레임도 안 남는다).
 *
 * 두 갈래를 가르는 손잡이는 «자의 샘플러가 얼마나 무거운가» 다.
 *   [rect]  현행 verify93 샘플러 — 프레임마다 querySelectorAll + getBoundingClientRect(전 노드)
 *           + getComputedStyle(알약 2개) = **레이아웃을 강제**한다.
 *   [cheap] 인라인 `style.transform` 만 읽는 샘플러 — 레이아웃 0회.
 * 그리고 제품이 실제로 그린 값은 `fxPzTick` 을 감싼 **제품 시각 로그**로 따로 남긴다(표본 아님).
 *
 * 부하는 페이지 안에서 결정적으로 만든다(`--load <ms>` = 16ms 마다 그만큼 메인 스레드를 태운다).
 *
 * 실행:
 *   node tools/probe570.js                 # 부하 0/8/20ms × [rect]/[cheap]
 *   node tools/probe570.js --load 20 --reps 3
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const LOADS = process.argv.includes('--load') ? [Number(arg('--load', 0))] : [0, 8, 20];
const REPS = Number(arg('--reps', 1));
const SPAN = Number(arg('--span', 2400));

const med = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const pct = (a, p) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * p))]; };

async function run(sampler, load) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1200);

  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
    QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  });
  await p.evaluate(() => openQuest());
  await p.waitForTimeout(450);
  /* 정착 (verify93 과 같은 규칙) */
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus').length + '|'
      + (document.getElementById('goldN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  const data = await p.evaluate(async ({ sampler, load, span }) => {
    const scaleOfComputed = (el) => {
      if (!el) return 1;
      const m = getComputedStyle(el).transform;
      if (!m || m === 'none') return 1;
      const n = m.match(/matrix\(([^)]+)\)/);
      return n ? parseFloat(n[1].split(',')[0]) : 1;
    };
    const scaleOfInline = (el) => {
      if (!el || !el.style) return 1;
      const m = /scale\(([-\d.]+)\)/.exec(el.style.transform || '');
      return m ? parseFloat(m[1]) : 1;
    };
    const xyOfInline = (el) => {
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || '');
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
    };
    const pillEl = (cur) => document.querySelector('[data-cur="' + cur + '"]') || document.querySelector('#top .' + cur);
    const gp = pillEl('gold'), dp = pillEl('dia');

    /* ── 제품 시각 로그: 제품 자신의 틱에서 «그려진 값» 을 남긴다(표본이 아니다) ── */
    const plog = [];
    const mism = [];                     /* 그림 ≠ 선언 (fxPz 진폭 ↔ 인라인 scale) */
    const orig = window.fxPzTick;
    window.fxPzTick = function (dt) {
      const r = orig.apply(this, arguments);
      for (const el of [gp, dp]) {
        const st = (typeof fxPz !== 'undefined') ? fxPz.get(el) : null;
        if (!st) continue;
        const want = +(1 + st.a).toFixed(4), got = scaleOfInline(el);
        if (Math.abs(want - got) > 1e-4) mism.push([Math.round(performance.now()), want, got]);
      }
      plog.push([performance.now(), scaleOfInline(gp), scaleOfInline(dp), dt]);
      return r;
    };
    /* ── 선언 로그: 비트 직후의 «올라간 진폭» (프레임과 무관) ── */
    const dlog = [];
    const oHit = window.fxPzHit;
    window.fxPzHit = function (el, beat) {
      const before = (typeof fxPz !== 'undefined' && fxPz.get(el)) ? fxPz.get(el).a : 0;
      const r = oHit.apply(this, arguments);
      const st = (typeof fxPz !== 'undefined') ? fxPz.get(el) : null;
      if (st) dlog.push([Math.round(performance.now()), before, st.a, st.h, el === dp ? 'd' : 'g']);
      return r;
    };

    /* ── 결정적 부하 ── */
    let loadTimer = 0;
    if (load > 0) loadTimer = setInterval(() => { const e = performance.now() + load; while (performance.now() < e); }, 16);

    const rows = [...document.querySelectorAll('.qs-r, .ml-r')]
      .map(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })
      .filter(r => r.h >= 40);

    const frames = [];
    const t0 = performance.now();
    const beat0 = (typeof fxBeatLog !== 'undefined' && fxBeatLog.length) ? fxBeatLog.length : 0;
    const punch0 = (typeof fxPunchN === 'number') ? fxPunchN : 0;
    const bEl = document.getElementById('qAll');
    const p0r = bEl.getBoundingClientRect();
    const p0 = { x: p0r.left + p0r.width / 2, y: p0r.top + p0r.height / 2 };
    bEl.click();

    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        let list;
        if (sampler === 'rect') {
          /* 현행 verify93 과 같은 자 — 레이아웃 강제 */
          list = [...document.querySelectorAll('.fx-fly')].map((el) => {
            if (el.__v === undefined) el.__v = (window.__vn = (window.__vn || 0) + 1);
            const r = el.getBoundingClientRect();
            const ic = el.querySelector('.cic');
            return { i: el.__v, cur: ic ? ic.getAttribute('data-cur-ic') : '?', x: r.left + r.width / 2, y: r.top + r.height / 2, ph: null };
          });
        } else {
          /* 인라인 transform 만 — 레이아웃 0회. 제품이 «쓴» 좌표 그대로다. */
          const phMap = new Map();
          if (typeof fxFlies !== 'undefined') for (const f of fxFlies) if (f.ui) phMap.set(f.el, f);
          list = [];
          for (const el of document.querySelectorAll('.fx-fly')) {
            if (el.__v === undefined) el.__v = (window.__vn = (window.__vn || 0) + 1);
            const g = xyOfInline(el); if (!g) continue;
            const ic = el.querySelector('.cic');
            const f = phMap.get(el);
            /* 인라인 좌표 ↔ rect 중심이 같은 것을 재는지 한 번 대조한다(첫 12표본만) */
            let dr = null;
            if (window.__cmp === undefined) window.__cmp = 0;
            if (window.__cmp < 12) { window.__cmp++; const r = el.getBoundingClientRect();
              dr = [Math.abs(r.left + r.width / 2 - g.x), Math.abs(r.top + r.height / 2 - g.y)]; }
            list.push({ i: el.__v, cur: ic ? ic.getAttribute('data-cur-ic') : '?', x: g.x, y: g.y, dr,
              ph: f ? { t: f.t, ha: f.ha, arr: f.arr } : null });
          }
        }
        frames.push({ t: Math.round(t), list,
          sg: sampler === 'rect' ? scaleOfComputed(gp) : scaleOfInline(gp),
          sd: sampler === 'rect' ? scaleOfComputed(dp) : scaleOfInline(dp),
          punch: ((typeof fxPunchN === 'number') ? fxPunchN : 0) - punch0 });
        if (t >= span) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (loadTimer) clearInterval(loadTimer);
    window.fxPzTick = orig;
    const beats = (typeof fxBeatLog !== 'undefined') ? fxBeatLog.slice(beat0).map(b => b[0] - Math.round(t0)) : [];
    window.fxPzHit = oHit;
    return { frames, rows, p0, plog, dlog, mism, t0: Math.round(t0), beats,
      K: { PZMAX: typeof FX3_PZ_MAX === 'number' ? FX3_PZ_MAX : 0.22,
           PZHOLD: typeof FX3_PZ_HOLD === 'number' ? FX3_PZ_HOLD : 0.05,
           PZTAU: typeof FX3_PZ_TAU === 'number' ? FX3_PZ_TAU : 0.045 } };
  }, { sampler, load, span: SPAN });

  await b.close();
  return data;
}

function analyze(d) {
  const gaps = [];
  for (let i = 1; i < d.frames.length; i++) gaps.push(d.frames[i].t - d.frames[i - 1].t);
  const pgaps = [];
  for (let i = 1; i < d.plog.length; i++) pgaps.push(d.plog[i][0] - d.plog[i - 1][0]);

  /* 현행 [3] 정의 — «첫 표본에서 100px 위로 갔으면 흡수 중» + 표본당 +2px 허용 */
  let backs = 0, moved = 0; const stM = new Map();
  for (const f of d.frames) for (const s of f.list) {
    if (s.x < 60 && s.y < 60) continue;
    const key = s.cur + ':' + s.i;
    const st = stM.get(key) || { y0: s.y, on: false, prev: s.y };
    if (!st.on && s.y < st.y0 - 100) st.on = true;
    if (st.on) { moved++; if (s.y > st.prev + 2) backs++; }
    st.prev = s.y; stM.set(key, st);
  }
  /* 새 정의 — 제품 자신의 국면(f.t ≥ f.ha = 흡수 시작)만 세고, 허용은 0px */
  let pbacks = 0, pmoved = 0; const st2 = new Map();
  let phaseSeen = false;
  for (const f of d.frames) for (const s of f.list) {
    if (!s.ph) continue;
    phaseSeen = true;
    if (s.ph.t < s.ph.ha) continue;
    const key = s.cur + ':' + s.i;
    const st = st2.get(key) || { prev: s.y, n: 0 };
    pmoved++; st.n++; if (s.y > st.prev + 0.01) pbacks++;
    st.prev = s.y; st2.set(key, st);
  }
  /* 표본 수가 아니라 «아이콘 수» 를 전제로 쓸 수 있는가 */
  const flyAbs = [...st2.values()].filter(v => v.n >= 2).length;
  /* 인라인 ↔ rect 대조 */
  let drMax = 0;
  for (const f of d.frames) for (const s of f.list) if (s.dr) drMax = Math.max(drMax, s.dr[0], s.dr[1]);
  /* 선언(비트 직후 진폭) · 그림≠선언 */
  const decl = (d.dlog || []).filter(r => r[2] >= r[1]);
  const declMin = decl.length ? Math.min(...decl.map(r => r[2])) : 0;
  const declHitN = (d.dlog || []).filter(r => r[2] >= d.K.PZMAX - 1e-9).length;
  /* 듀티(선언) — 비트 시각 + 감쇠 법칙만으로 계산한다(프레임 무관) */
  const HOLDms = d.K.PZHOLD * 1000, TAUms = d.K.PZTAU * 1000;
  const onDur = HOLDms + TAUms * Math.log(d.K.PZMAX / 0.005);
  const bt = d.beats.slice().sort((a, b) => a - b);
  let dutyDecl = 0;
  if (bt.length) {
    const w0 = bt[0], w1 = bt[bt.length - 1] + onDur;
    let onT = 0;
    for (let i = 0; i < bt.length; i++) {
      const next = i + 1 < bt.length ? bt[i + 1] : Infinity;
      onT += Math.min(onDur, next - bt[i]);
    }
    dutyDecl = onT / Math.max(1, w1 - w0);
  }

  /* 피크·듀티 — 표본 기준(현행) */
  const useD = d.frames.some(f => f.sd > 1.005);
  const key = useD ? 'sd' : 'sg';
  const win = d.frames.filter(f => f.t >= 300 && f.t <= 1500);
  const peakS = Math.max(...win.map(f => f[key]), 1);
  const dutyS = win.filter(f => f[key] > 1.005).length / Math.max(1, win.length);

  /* 피크·듀티 — 제품 로그 기준(그려진 값 · 시간 가중) */
  const pi = useD ? 2 : 1;
  const plw = d.plog.filter(r => r[0] - d.t0 >= 300 && r[0] - d.t0 <= 1500);
  const peakP = Math.max(...plw.map(r => r[pi]), 1);
  let on = 0, tot = 0;
  for (let i = 1; i < plw.length; i++) { const dt = plw[i][0] - plw[i - 1][0]; tot += dt; if (plw[i - 1][pi] > 1.005) on += dt; }
  const dutyP = tot ? on / tot : 0;

  const beats = Math.max(...d.frames.map(f => f.punch), 0);
  /* 비트마다 «고원 안에 제품 프레임이 하나라도 있었나» */
  const HOLD = d.K.PZHOLD * 1000;
  let gradeable = 0, peakOnBeat = 0;
  for (const bt of d.beats) {
    const inHold = d.plog.filter(r => (r[0] - d.t0) > (bt - 0) && (r[0] - d.t0) <= bt + HOLD);
    if (inHold.length) { gradeable++; peakOnBeat = Math.max(peakOnBeat, ...inHold.map(r => r[pi])); }
  }
  return { nF: d.frames.length, gapMed: med(gaps), gapP90: pct(gaps, 0.9),
    nP: d.plog.length, pgapMed: med(pgaps), pgapP90: pct(pgaps, 0.9),
    backs, moved, pbacks, pmoved, phaseSeen, peakS, dutyS, peakP, dutyP, beats,
    flyAbs, drMax, declMin, declHitN, declN: (d.dlog || []).length, mism: (d.mism || []).length, dutyDecl,
    nBeat: d.beats.length, gradeable, peakOnBeat, cur: useD ? 'dia' : 'gold' };
}

(async () => {
  console.log('PROBE570 — verify93 타이밍 축의 «부하 의존» 갈래 나누기\n');
  console.log('  [rect]  = 현행 verify93 샘플러(레이아웃 강제) · [cheap] = 인라인 transform 만(레이아웃 0)');
  console.log(`  부하 = 16ms 마다 메인 스레드를 n ms 태운다 · span ${SPAN}ms · reps ${REPS}\n`);
  const rowsOut = [];
  for (const load of LOADS) {
    for (const sampler of ['rect', 'cheap']) {
      for (let r = 0; r < REPS; r++) {
        const a = analyze(await run(sampler, load));
        rowsOut.push({ load, sampler, ...a });
        console.log(`부하 ${String(load).padStart(2)}ms · [${sampler}]`
          + `  표본 ${a.nF} (간격 med ${a.gapMed} / p90 ${a.gapP90}ms)`
          + `  제품틱 ${a.nP} (med ${a.pgapMed} / p90 ${a.pgapP90}ms)`);
        console.log(`    역행(현행) ${a.backs}/${a.moved}`
          + `   역행(국면기준) ${a.phaseSeen ? a.pbacks + '/' + a.pmoved : '—'}`
          + `   비트 ${a.beats}회(로그 ${a.nBeat})`);
        console.log(`    피크 표본 ×${a.peakS.toFixed(3)}  제품로그 ×${a.peakP.toFixed(3)}  고원안 ×${a.peakOnBeat.toFixed(3)} (등급가능 비트 ${a.gradeable}/${a.nBeat})`);
        console.log(`    듀티 표본 ${(a.dutyS * 100).toFixed(1)}%  제품로그(시간가중) ${(a.dutyP * 100).toFixed(1)}%  선언(비트+감쇠법칙) ${(a.dutyDecl * 100).toFixed(1)}%   [${a.cur}]`);
        console.log(`    선언 진폭 최소 ${a.declMin.toFixed(4)} (히트 ${a.declHitN}/${a.declN} 이 FX3_PZ_MAX 도달) · 그림≠선언 ${a.mism}건`
          + `  흡수국면 아이콘 ${a.flyAbs}종  인라인↔rect 최대 Δ ${a.drMax.toFixed(2)}px\n`);
      }
    }
  }
  console.log('— 요약 —');
  console.log('load sampler | 표본간격 | 제품틱간격 | 역행(현행) | 역행(국면) | 피크표본 | 피크제품 | 듀티표본 | 듀티제품');
  for (const r of rowsOut) {
    console.log(`${String(r.load).padStart(4)} ${r.sampler.padEnd(7)}| ${String(r.gapMed).padStart(8)} | ${String(r.pgapMed).padStart(10)} |`
      + ` ${String(r.backs + '/' + r.moved).padStart(10)} | ${String(r.phaseSeen ? r.pbacks + '/' + r.pmoved : '—').padStart(10)} |`
      + ` ${r.peakS.toFixed(3).padStart(8)} | ${r.peakP.toFixed(3).padStart(8)} |`
      + ` ${(r.dutyS * 100).toFixed(1).padStart(8)} | ${(r.dutyP * 100).toFixed(1).padStart(8)}`);
  }
})();
