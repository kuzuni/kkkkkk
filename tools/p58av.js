/* p58av — «구간 속도 계단» 프로브 (58 42회차 신설)
   ────────────────────────────────────────────────────────────────────────────
   41차 2인 공통ㄴ(«quest 부채꼴이 스폰 후 178ms 사실상 정지했다가 급가속», BG 88:1 · BH 46:1)은
   두 비평가가 **캡처 격자 위에서 눈으로 잰 것**이라, 고치고 나서 «얼마나 좋아졌는지» 를
   같은 자로 되잴 방법이 없었다. 이 프로브가 그 자를 코드로 만든다.

   재는 것 — 비평가가 본 것과 **같은 격자**(cap58b 의 씬별 간격) 위에서
     ① 프레임마다 살아 있는 `.fx-fly` 의 중심 좌표
     ② 인접 프레임 사이의 **아이콘별 이동 거리 / 경과 ms** = 구간 속도(px/ms)
        (같은 아이콘을 잇는다 — `data-i`/순서가 아니라 «가장 가까운 이전 중심» 매칭.
         스폰·소멸로 개수가 변해도 남는 아이콘만으로 센다)
     ③ 군집 **외곽상자**(BH 가 쓴 자)의 좌단·상단 이동 속도
     ④ 인접 구간 속도비 = max(v[k], v[k+1]) / max(min(v[k], v[k+1]), eps)

   ⚠ p58au 와 달리 **얼리지 않는다** — 재는 것이 «시간에 따른 위치» 라 시간을 세우면 잴 것이 없다.
   ⚠ 이 프로브는 게이트가 아니라 «자» 다. 통과·실패를 찍지 않고 표만 낸다.

   실행: node tools/p58av.js [gain,quest,upg] [--json]                                       */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const WANT = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'gain,quest,upg')
  .split(',').map(s => s.trim()).filter(Boolean);
const JSONOUT = process.argv.includes('--json');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const VIS = 0.06;
/* 비평가가 본 격자 그대로(cap58b): gain 40ms · quest 95ms · upg 100ms */
const GRID = { gain: 40, quest: 95, upg: 100 };
const RUN = { gain: 900, quest: 1700, upg: 900 };

const TRIGGERS = {
  gain: () => {
    const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
    const p = e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y);
    fxAt(p, 'combat');
    S.gold += 128000;
  },
  quest: () => { const b = document.getElementById('qAll'); if (b) b.click(); },
  upg: () => {
    const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
    if (!c) return;
    c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  },
};

async function setupScene(p, scene) {
  await p.evaluate((sc) => {
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true;
    if (typeof renderUI === 'function') renderUI();
  }, scene);

  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(400); }
  else if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(400); }
  else {
    await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 })
      .catch(() => {});
  }
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() =>
      document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length + '');
    if (st === prev && st === '0') break;
    prev = st;
    await p.waitForTimeout(80);
  }
}

async function run(scene) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
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
  }, 20260828);
  await p.goto(URL);
  await p.waitForTimeout(1100);
  await setupScene(p, scene);

  const out = await p.evaluate(async ({ trg, ms, step, VIS }) => {
    const t0 = performance.now();
    (new Function(trg))();
    const frames = [];
    const sleep = (d) => new Promise(r => setTimeout(r, d));
    while (performance.now() - t0 < ms) {
      const t = performance.now() - t0;
      const list = [];
      for (const el of document.querySelectorAll('.fx-fly')) {
        const cs = getComputedStyle(el);
        if (+cs.opacity < VIS) continue;                 /* 41회차 규약 — «보이는 것» 만 센다 */
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        /* ⚠ «가장 가까운 이전 중심» 매칭은 군집에서 무너진다(700px 날아간 아이콘이 제자리에 있는
           이웃과 이어져 속도가 0 으로 찍힌다). **요소 자신에 id 를 박아** 동일성으로 잇는다. */
        if (!el.__pid) el.__pid = 'f' + (++window.__pidN || (window.__pidN = 1));
        list.push({ id: el.__pid, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width });
      }
      frames.push({ t: Math.round(t), list });
      const wait = step - ((performance.now() - t0) % step);
      await sleep(Math.max(4, wait));
    }
    return { frames };
  }, { trg: '(' + TRIGGERS[scene].toString() + ')()', ms: RUN[scene], step: GRID[scene], VIS });

  await b.close();
  return { ...out, errs };
}

/* 인접 프레임의 아이콘을 «가장 가까운 이전 중심» 으로 잇고 구간 속도를 낸다. */
function segs(frames) {
  const out = [];
  for (let k = 1; k < frames.length; k++) {
    const a = frames[k - 1], c = frames[k], dt = c.t - a.t;
    if (dt <= 0 || !a.list.length || !c.list.length) continue;
    const prevBy = new Map(a.list.map(o => [o.id, o]));
    const ds = [];
    for (const q of c.list) {
      const o = prevBy.get(q.id);
      if (o) ds.push(Math.hypot(q.x - o.x, q.y - o.y));
    }
    if (!ds.length) continue;
    ds.sort((x, y) => x - y);
    const med = ds[ds.length >> 1];
    /* 외곽상자(BH 가 쓴 자) */
    const bx = (L, f) => Math.min(...L.map(f)), bX = (L, f) => Math.max(...L.map(f));
    const box = { x0: bx(a.list, v => v.x), y0: bx(a.list, v => v.y) };
    const box2 = { x0: bx(c.list, v => v.x), y0: bx(c.list, v => v.y) };
    out.push({
      t0: a.t, t1: c.t, dt, n: c.list.length,
      v: med / dt,                                        /* 아이콘 중앙값 속도 px/ms */
      vbox: Math.hypot(box2.x0 - box.x0, box2.y0 - box.y0) / dt,
    });
  }
  return out;
}

(async () => {
  const all = {};
  for (const sc of WANT) {
    const r = await run(sc);
    const sg = segs(r.frames);
    all[sc] = { segs: sg, errs: r.errs };
    console.log('\n== 씬 ' + sc + ' (격자 ' + GRID[sc] + 'ms · 콘솔 에러 ' + r.errs.length + ') ==');
    console.log('  구간(ms)      개수   아이콘 v(px/ms)   외곽상자 v   직전 대비 비');
    let prev = null;
    let worst = 0, worstAt = '';
    for (const s of sg) {
      const ratio = prev == null ? null : (Math.max(prev, s.v) / Math.max(0.001, Math.min(prev, s.v)));
      /* 도착해 «꽂힘» 에 들어간 노드만 남은 꼬리 구간은 비행이 아니다 — 비를 그 구간에서 세면
         «알약 위에 멈춘 코인» 이 계단으로 찍힌다. 표에는 남기고 요약에서만 뺀다(n ≥ 4). */
      if (ratio != null && s.n >= 4 && ratio > worst) { worst = ratio; worstAt = s.t0 + '→' + s.t1; }
      console.log('  ' + String(s.t0).padStart(4) + '→' + String(s.t1).padEnd(5)
        + String(s.n).padStart(5) + '   ' + s.v.toFixed(3).padStart(10)
        + '   ' + s.vbox.toFixed(3).padStart(10)
        + '   ' + (ratio == null ? '   —' : ('×' + ratio.toFixed(1)).padStart(8)));
      prev = s.v;
    }
    const vs = sg.filter(s => s.n >= 4).map(s => s.v);
    console.log('  ─ 요약: 최소 ' + Math.min(...vs).toFixed(3) + ' · 최대 ' + Math.max(...vs).toFixed(3)
      + ' px/ms · **인접 구간 최대 속도비 ×' + worst.toFixed(1) + '** (' + worstAt + 'ms) — 표본 n≥4 구간만');
  }
  if (JSONOUT) console.log('\n' + JSON.stringify(all));
})();
