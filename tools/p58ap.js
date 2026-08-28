/* 작업 58 36회차 — 35회차가 넘긴 1순위(34차 2인 공통1)를 «고치기 전에» 수치로 세우는 probe.

   공통1 = «씬 B 발원 밴드가 «모두 받기» 버튼 **글자**를 덮는다».
   BE 는 «덮은 면적 / 버튼 라벨 사각», BF 는 «남은 글자 잉크 / 원본 잉크» 로 재서 %가 갈렸다
   (20.3% vs 66.6%). 두 자가 다른 것을 재는 것이지 원자료는 같다 — 여기서는 **둘 다** 낸다.

   ⚠ 재는 상자를 밝힌다(A1 10회차 · 122 20회차 «자가 다르면 일치해도 틀린다»):
     ⓐ `labelBox`  = `#qAll` 안 텍스트 노드의 `Range.getBoundingClientRect()`(글자 advance 상자)
     ⓑ `btnBox`    = `#qAll` 자신의 `getBoundingClientRect()`
     ⓒ `coinBox`   = `.fx-fly` 의 `getBoundingClientRect()`(비행 코인 **상자** — 잉크가 아니다)
   출력 %는 ⓐ·ⓑ 어느 분모인지 열 이름에 적는다.

   같이 재는 것(고칠 때 깨질 수 있는 자리):
     · `.qs-r` 형제 행 상자 — verify93 [2b] «형제 행 관통 0» 의 대상
     · 밴드 파라미터(`fx3Escape` 반환) — ey/cb/h/free
     · 흡수 중 y 단조성(«y 역행») — 밴드를 위로 올리면 여기부터 깨진다

   실행: node tools/p58ap.js            (현행 빌드)
        node tools/p58ap.js 12          (씨앗 고정값 바꿔 재현성 확인) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SEED = Number(process.argv[2] || 7);
const STEP = 10;                                     /* ms */
const SPAN = 1600;

async function open(seed) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
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
  return { b, p, errs };
}

async function setup(p) {
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
    QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  });
  await p.evaluate(() => openQuest());
  await p.waitForTimeout(400);
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => {
      const g = document.getElementById('goldN'), d = document.getElementById('diaN');
      return (g ? g.textContent.trim() : '') + '|' + (d ? d.textContent.trim() : '')
        + '|' + document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length;
    });
    if (st === prev && st.endsWith('|0')) break;
    prev = st;
    await p.waitForTimeout(80);
  }
}

/* 프레임 상수 — 페이지 좌표를 프레임 좌표로 (fit() 스케일·오프셋 흡수) */
const GEOM = () => {
  const fr = document.getElementById('app');
  const r = fr.getBoundingClientRect();
  const sc = r.width / fr.offsetWidth;
  return { x: r.x, y: r.y, sc };
};

(async () => {
  const { b, p, errs } = await open(SEED);
  await setup(p);

  /* ── 1. 정지 상태 기하 ── */
  const geo = await p.evaluate(() => {
    const fr = document.getElementById('app'), fb = fr.getBoundingClientRect();
    const sc = fb.width / fr.offsetWidth;
    const F = (r) => ({ x: (r.x - fb.x) / sc, y: (r.y - fb.y) / sc, w: r.width / sc, h: r.height / sc });
    const btn = document.getElementById('qAll');
    const bb = btn ? F(btn.getBoundingClientRect()) : null;
    /* 라벨 «글자 advance 상자» — 텍스트 노드에 Range 를 걸어 잰다 */
    let lb = null;
    if (btn) {
      const rg = document.createRange();
      let best = null;
      const walk = (n) => {
        if (n.nodeType === 3 && n.textContent.trim()) {
          rg.selectNodeContents(n);
          const r = rg.getBoundingClientRect();
          if (r.width && (!best || r.width > best.width)) best = r;
        }
        for (const c of n.childNodes) walk(c);
      };
      walk(btn);
      if (best) lb = F(best);
    }
    const rows = [...document.querySelectorAll('.qs-r, .ml-r')]
      .map(el => F(el.getBoundingClientRect()))
      .filter(r => r.h >= 40);
    /* 발원점 + 밴드 파라미터 — 게임이 실제로 쓰는 함수를 그대로 부른다 */
    let spawn = null, band = null;
    try {
      const r = btn.getBoundingClientRect();
      const w = (typeof fxWorld === 'function') ? null : null;
      spawn = F({ x: r.x + r.width / 2, y: r.y + r.height / 2, width: 0, height: 0 });
      const pt = (typeof fxPt === 'function') ? null : null;
      band = (typeof fx3Escape === 'function') ? fx3Escape({ x: spawn.x, y: spawn.y }) : null;
    } catch (e) { band = { err: String(e) }; }
    return { btn: bb, label: lb, rows, spawn, band };
  });

  console.log('=== 58 p58ap — 씬 B(퀘스트 «모두 받기») 정지 기하 [프레임 좌표 1080×2280] ===');
  const R = (r) => r ? `x${r.x.toFixed(1)}~${(r.x + r.w).toFixed(1)} y${r.y.toFixed(1)}~${(r.y + r.h).toFixed(1)} (${r.w.toFixed(1)}×${r.h.toFixed(1)})` : 'null';
  console.log('  btnBox   (#qAll getBoundingClientRect)     ', R(geo.btn));
  console.log('  labelBox (텍스트 노드 Range — advance 상자)', R(geo.label));
  console.log('  형제 행(.qs-r) ' + geo.rows.length + '개 — 마지막 행 하단 y=' +
    (geo.rows.length ? Math.max(...geo.rows.map(r => r.y + r.h)).toFixed(1) : '—'));
  geo.rows.forEach((r, i) => console.log('    행' + (i + 1) + ' ' + R(r)));
  console.log('  발원(버튼 중심) ', geo.spawn ? `(${geo.spawn.x.toFixed(1)}, ${geo.spawn.y.toFixed(1)})` : 'null');
  console.log('  fx3Escape 밴드  ', JSON.stringify(geo.band));

  /* ── 2. 트리거 후 프레임마다 코인 상자 ↔ 라벨 사각 ── */
  const frames = await p.evaluate(async ({ step, span }) => {
    const fr = document.getElementById('app'), fb = fr.getBoundingClientRect();
    const sc = fb.width / fr.offsetWidth;
    const F = (r) => ({ x: (r.x - fb.x) / sc, y: (r.y - fb.y) / sc, w: r.width / sc, h: r.height / sc });
    const btn = document.getElementById('qAll');
    let lb = null;
    { const rg = document.createRange();
      let best = null;
      const walk = (n) => { if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width && (!best || r.width > best.width)) best = r; } for (const c of n.childNodes) walk(c); };
      walk(btn); if (best) lb = F(best); }
    const rows = [...document.querySelectorAll('.qs-r, .ml-r')].map(el => F(el.getBoundingClientRect())).filter(r => r.h >= 40);
    const out = [];
    const t0 = performance.now();
    btn.click();
    const inter = (a, bx) => {
      const w = Math.min(a.x + a.w, bx.x + bx.w) - Math.max(a.x, bx.x);
      const h = Math.min(a.y + a.h, bx.y + bx.h) - Math.max(a.y, bx.y);
      return (w > 0 && h > 0) ? w * h : 0;
    };
    while (performance.now() - t0 < span) {
      await new Promise(r => requestAnimationFrame(r));
      const t = performance.now() - t0;
      if (out.length && t - out[out.length - 1].t < step) continue;
      /* ⚑ 재는 상자를 둘로 나눈다 — `.fx-fly` 는 글리프 advance 상자(44×44)고, 실제로 «그림» 이
         찍히는 것은 그 안의 `.cic`(125 화폐 아이콘)다. 가림은 그림이 하는 것이므로 판정은 `.cic`,
         `.fx-fly` 는 참고로 같이 낸다(93 17회차 «화소가 아니라 레이아웃 박스로 잰다»). */
      const flys = [...document.querySelectorAll('.fx-fly')];
      const coins = flys.map(el => F((el.querySelector('.cic') || el).getBoundingClientRect()));
      const boxes = flys.map(el => F(el.getBoundingClientRect()));
      let cov = 0, n = 0, rowHit = 0, bcov = 0;
      if (lb) for (const c of coins) { const a = inter(c, lb); if (a > 0) { cov += a; n++; } }
      if (lb) for (const c of boxes) bcov += inter(c, lb);
      for (const c of coins) for (const r of rows) if (inter(c, r) > 0) rowHit++;
      out.push({
        t: Math.round(t), coins: coins.length, onLabel: n,
        cov: Math.round(cov), bcov: Math.round(bcov), rowHit,
        ymin: coins.length ? Math.min(...coins.map(c => c.y)) : null,
        ymax: coins.length ? Math.max(...coins.map(c => c.y + c.h)) : null,
      });
    }
    return { frames: out, label: lb, rows };
  }, { step: STEP, span: SPAN });

  const lb = frames.label;
  const larea = lb ? lb.w * lb.h : 0;
  const f = frames.frames.filter(x => x.coins > 0);
  console.log('\n=== 코인 상자 ↔ labelBox 겹침 (분모 = labelBox 면적 ' + larea.toFixed(0) + 'px²) ===');
  console.log('   t(ms)  코인  라벨위  .cic겹침  %labelBox  fly상자겹침  행관통  y범위');
  let worstCov = 0, worstT = 0, span0 = null, span1 = null;
  for (const x of f) {
    if (x.cov > worstCov) { worstCov = x.cov; worstT = x.t; }
    if (x.onLabel > 0) { if (span0 === null) span0 = x.t; span1 = x.t; }
    if (x.onLabel > 0 || x.t % 100 < STEP)
      console.log(`  ${String(x.t).padStart(5)}  ${String(x.coins).padStart(4)}  ${String(x.onLabel).padStart(5)}  ${String(x.cov).padStart(8)}  ${(100 * x.cov / (larea || 1)).toFixed(1).padStart(8)}%  ${String(x.bcov).padStart(10)}  ${String(x.rowHit).padStart(5)}  ${x.ymin === null ? '' : x.ymin.toFixed(0) + '~' + x.ymax.toFixed(0)}`);
  }
  console.log('\n  ▸ 최대 겹침 ' + worstCov + 'px² (' + (100 * worstCov / (larea || 1)).toFixed(1) + '% of labelBox) @ t=' + worstT + 'ms');
  console.log('  ▸ 라벨 위에 코인이 있는 구간 ' + (span0 === null ? '없음' : span0 + '~' + span1 + 'ms (' + (span1 - span0) + 'ms)'));
  console.log('  ▸ 형제 행(.qs-r) 관통 표본 합 ' + f.reduce((s, x) => s + x.rowHit, 0) + '개 (verify93 [2b] 대상)');
  console.log('  ▸ 콘솔/페이지 에러 ' + errs.length + '건');
  await b.close();
})();
