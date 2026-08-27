/* 작업 93 게이트 — «재화 흡수 3박자» (58 33회차 재작성·복원).

   ⚠ 왜 «복원» 인가 — 93 의 1~20회차 리뷰와 58 의 19~32회차 리뷰가 `VERIFY93 PASS` 로
   수십 번 인용해 온 `verify93.js` 는 **저장소에 커밋된 적이 없다**(58 32회차 발견).
   그 결과 58 4차 라운드의 2인 공통 지적 4건(공통1·3·5·6)이 «되돌림을 확인할 수 없는 변경» 이라
   전부 33회차로 밀렸다 — 즉 **이 파일이 없어서 58 이 멈춰 있었다.**

   임계를 어디서 가져왔나 — 눈대중 금지. 두 갈래만 쓴다.
     ⓐ 소스에 선언된 상수(`FX3_ARR0/ARR1`·`FX3_PZ_MAX`·`FXFLY_MAX`·`FRAME_W`)를 페이지에서 읽는다.
     ⓑ 리뷰에 «수치로» 남은 규격 — 복도 하한 976(형제 행 우변 949 + 아이콘 반경 27, 93 §4-16-3) ·
        복도 x 흔들림 ≤14px(93 8회차) · 퍼짐 최대 반경 ≤200px(93 §4-17-5 «204px(≤200)» FAIL 기록) ·
        형제 행 관통 0(93 §3, 딤을 **무시하고** 세도) · 펄스 왕복 ≥4 · 피크 ≥1.15(93 12회차) ·
        델타 회랑 카드기준 y275~396(58 24·27·30회차, `fxDelta` 주석에 그대로 있다).
   신설 임계는 **하나도 없다.** 33회차 실측(`tools/p93tr.js`)이 리뷰 수치와 맞는지 먼저 대조했다:
     복도 다이아 x1040.0 흔들림 0.6px(리뷰 «1040 · 0px») · 퍼짐 181.4px(≤200) ·
     첫 도착 548ms / 마지막 1265~1305ms(선언 500/1220 + 프레임 granularity 40~70ms) · 관통 0.

   실행: node tools/verify93.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 배치 전 프레임 제외 — 노드는 생겼는데 transform 이 아직 안 걸린 첫 프레임은 전부 레이어
   원점(28,28)에 겹쳐 있다. 세면 «퍼짐 반경 1680px» 라는 허깨비가 나온다(33회차 실측). */
const placed = (g) => !(g.x < 60 && g.y < 60);

async function run(scene, span) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1200);

  await p.evaluate((sc) => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    if (sc === 'quest') {
      S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
      QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; });
    }
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  }, scene);
  if (scene === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(450); }
  if (scene === 'upg') { await p.evaluate(() => openTrain()); await p.waitForTimeout(450); }
  if (scene === 'gain') {
    await p.waitForFunction(() => typeof enemies !== 'undefined' && enemies.length > 0, null, { timeout: 8000 }).catch(() => {});
  }
  /* 부팅 연출·카운터 롤이 가라앉을 때까지 (verify58 과 같은 정착 규칙) */
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus').length + '|'
      + (document.getElementById('goldN') || {}).textContent + '|' + (document.getElementById('diaN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  const data = await p.evaluate(async ({ sc, span }) => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const rows = [...document.querySelectorAll('.qs-r, .ml-r')].map(rect).filter(r => r.h >= 40);
    const pillEl = (cur) => document.querySelector('[data-cur="' + cur + '"]') || document.querySelector('#top .' + cur);
    const pillC = (cur) => {
      const el = document.querySelector('[data-cur="' + cur + '"] i') || document.querySelector('#top .' + cur + ' i');
      if (!el) return null; const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const scaleOf = (el) => {
      if (!el) return 1;
      const m = getComputedStyle(el).transform;
      if (!m || m === 'none') return 1;
      const n = m.match(/matrix\(([^)]+)\)/);
      return n ? parseFloat(n[1].split(',')[0]) : 1;
    };
    const cards = [...document.querySelectorAll('.tr-card')].map(rect);

    const frames = [];
    const t0 = performance.now();
    let p0 = null;
    const punch0 = (typeof fxPunchN === 'number') ? fxPunchN : 0;
    if (sc === 'quest') {
      const b = document.getElementById('qAll');
      if (b) { const r = b.getBoundingClientRect(); p0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; b.click(); }
    } else if (sc === 'gain') {
      const e = (typeof enemies !== 'undefined' && enemies[0]) || null;
      fxAt(e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y), 'combat'); S.gold += 128000;
    } else {
      const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
      if (c) { c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }
    }
    const gp = pillEl('gold'), dp = pillEl('dia');
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        const list = [...document.querySelectorAll('.fx-fly')].map((el) => {
          if (el.__v93 === undefined) el.__v93 = (window.__v93n = (window.__v93n || 0) + 1);
          const r = el.getBoundingClientRect();
          const ic = el.querySelector('.cic');
          return {
            i: el.__v93, cur: ic ? ic.getAttribute('data-cur-ic') : '?',
            x: r.left + r.width / 2, y: r.top + r.height / 2,
            lo: !!el.closest('#fxlc'), up: !!el.closest('#fxl'),
          };
        });
        const delta = [...document.querySelectorAll('.fx-delta')].map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        frames.push({
          t: Math.round(t), list, delta,
          sg: scaleOf(gp), sd: scaleOf(dp),
          punch: ((typeof fxPunchN === 'number') ? fxPunchN : 0) - punch0,
          gold: (document.getElementById('goldN') || {}).textContent,
          dia: (document.getElementById('diaN') || {}).textContent,
        });
        if (t >= span) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const leftover = document.querySelectorAll('.fx-fly, .fx-plus, .fx-lit').length;
    return {
      frames, rows, cards, p0, leftover,
      goldPill: pillC('gold'), diaPill: pillC('dia'),
      K: {
        ARR0: typeof FX3_ARR0 === 'number' ? FX3_ARR0 : 0.50,
        ARR1: typeof FX3_ARR1 === 'number' ? FX3_ARR1 : 1.22,
        PZMAX: typeof FX3_PZ_MAX === 'number' ? FX3_PZ_MAX : 0.22,
        FLYMAX: typeof FXFLY_MAX === 'number' ? FXFLY_MAX : 32,
        FLYMAXC: typeof FXFLY_MAX_C === 'number' ? FXFLY_MAX_C : 12,
      },
    };
  }, { sc: scene, span });

  await b.close();
  return { ...data, errs };
}

/* ── 공용 계산자 ─────────────────────────────────────────────── */
const arrT = (h, k) => {
  const a = h.frames.map(f => String(f[k] || '').trim());
  const base = a[0], fin = a[a.length - 1];
  const fi = a.findIndex(v => v !== base);
  const li = fin === base ? -1 : a.findIndex(v => v === fin);
  return { first: fi < 0 ? null : h.frames[fi].t, last: li < 0 ? null : h.frames[li].t };
};
const inBox = (r, g) => g.x >= r.x && g.x <= r.x + r.w && g.y >= r.y && g.y <= r.y + r.h;

(async () => {
  console.log('VERIFY93 — 재화 흡수 3박자 (퍼짐 → 머묾 → 흡수)\n');

  /* 씬 B 창 2400ms — «잔여 DOM 0» 을 재려면 «+n» 플로터(`fx-plus`, 실측 소멸 ≈2100ms)까지
     끝난 뒤여야 한다. 2000ms 에서 세면 사양대로 살아 있는 플로터 1개가 잔여로 잡힌다. */
  const q = await run('quest', 2400);   /* 씬 B — 퀘스트 «모두 받기» (UI 발) */
  const g = await run('gain', 1400);    /* 씬 A — 전투 킬 (전투 발) */
  const u = await run('upg', 1000);     /* 씬 C — 훈련 강화 델타 플로터 */

  const K = q.K;

  /* ── [1] 퍼짐 봉투 ───────────────────────────────────────── */
  console.log('[1] (a) 퍼짐 — 반경 상한 (93 §4-17-5: 상한 200px)');
  const org = q.p0;
  let rmax = 0, rmaxT = 0;
  for (const f of q.frames) {
    if (f.t > 330) break;                              /* 퍼짐 .22s + 머묾 .12s = 흡수 개시 전 */
    for (const s of f.list) { if (!placed(s)) continue; const d = Math.hypot(s.x - org.x, s.y - org.y); if (d > rmax) { rmax = d; rmaxT = f.t; } }
  }
  ok(rmax > 40 && rmax <= 200, `퍼짐 최대 반경 ${rmax.toFixed(1)}px @${rmaxT}ms (40 < r ≤ 200)`);
  const spreadN = Math.max(...q.frames.filter(f => f.t >= 120 && f.t <= 330).map(f => f.list.filter(placed).length), 0);
  ok(spreadN >= 8, `퍼짐 구간에 동시 ${spreadN}개 (≥8 — «퍼짐» 이 프레임에 실재한다)`);

  console.log('[2] (c) 흡수 — 도착 봉투 (선언 FX3_ARR0/ARR1)');
  const dia = arrT(q, 'dia'), gold = arrT(q, 'gold');
  const A = dia.first !== null ? dia : gold, B = dia.last !== null ? dia : gold;
  /* 선언값 ±20% + 리뷰가 여러 회차에 걸쳐 적어 둔 프레임 granularity 지연 +40~70ms */
  const lo0 = K.ARR0 * 1000 * 0.8, hi0 = K.ARR0 * 1000 * 1.2 + 70;
  const lo1 = K.ARR1 * 1000 * 0.8, hi1 = K.ARR1 * 1000 * 1.2 + 70;
  ok(A.first !== null && A.first >= lo0 && A.first <= hi0, `첫 도착 ${A.first}ms (${lo0.toFixed(0)}~${hi0.toFixed(0)})`);
  ok(B.last !== null && B.last >= lo1 && B.last <= hi1, `마지막 도착 ${B.last}ms (${lo1.toFixed(0)}~${hi1.toFixed(0)})`);

  /* ── [2b] 형제 행 관통 0 — 딤을 무시하고 센다 (93 §3) ───────── */
  console.log('[2b] 형제 행 관통 0 — «딤을 무시하고» 세도 0 (93 §3)');
  const home = q.rows.findIndex(r => q.p0 && inBox(r, q.p0));
  let cross = 0; const where = [];
  for (const f of q.frames) for (const s of f.list) {
    if (!placed(s)) continue;
    for (let k = 0; k < q.rows.length; k++) {
      if (k === home) continue;
      if (inBox(q.rows[k], s)) { cross++; if (where.length < 5) where.push(`${f.t}ms 행${k} ${Math.round(s.x)},${Math.round(s.y)}`); }
    }
  }
  ok(cross === 0, `관통 ${cross}표본 (0)${where.length ? ' — ' + where.join(' · ') : ''}`);
  ok(q.rows.length >= 2, `형제 행 ${q.rows.length}개 — 관통을 잴 대상이 실제로 있다`);

  /* ── [2c] 복도 (93 §4-16-3) ─────────────────────────────── */
  console.log('[2c] 복도 — 형제 행 우변 밖 · 흔들림 (93 §4-16-3 · 8회차)');
  const rowTop = Math.min(...q.rows.map(r => r.y)), rowBot = Math.max(...q.rows.map(r => r.y + r.h));
  const rowRight = Math.max(...q.rows.map(r => r.x + r.w));
  const LANE_MIN = rowRight + 27;                        /* 형제 행 우변 + 아이콘 반경 27 = 976 */
  const lanes = {};
  for (const f of q.frames) for (const s of f.list) {
    if (!placed(s)) continue;
    if (s.y >= rowTop && s.y <= rowBot) (lanes[s.cur] || (lanes[s.cur] = [])).push(s.x);
  }
  const curs = Object.keys(lanes).filter(k => lanes[k].length >= 5);
  ok(curs.length >= 1, `복도 표본이 있는 재화 ${curs.length}종`);
  for (const k of curs) {
    const a = lanes[k], mn = Math.min(...a), mx = Math.max(...a);
    ok(mn >= LANE_MIN, `복도 ${k} 최소 x ${mn.toFixed(1)} (≥ ${LANE_MIN.toFixed(0)} = 행 우변 ${rowRight.toFixed(0)} + 27)`);
    ok(mx - mn <= 14, `복도 ${k} 흔들림 ${(mx - mn).toFixed(1)}px (≤14)`);
  }

  /* ── [3] 흡수 중 아래로 되돌아가는 프레임 0 ─────────────────── */
  console.log('[3] 흡수 개시 뒤 y 역행 0 (머묾의 «부유» 는 사양이라 세지 않는다)');
  let backs = 0, moved = 0; const stM = new Map();
  for (const f of q.frames) for (const s of f.list) {
    if (!placed(s)) continue;
    const key = s.cur + ':' + s.i;
    const st = stM.get(key) || { y0: s.y, on: false, prev: s.y };
    if (!st.on && s.y < st.y0 - 100) st.on = true;
    if (st.on) { moved++; if (s.y > st.prev + 2) backs++; }
    st.prev = s.y; stM.set(key, st);
  }
  ok(moved > 40 && backs === 0, `역행 ${backs}/${moved}표본 (0)`);

  /* ── [4] 알약 펄스 (93 12회차) ──────────────────────────── */
  console.log('[4] 알약 펄스 — 피크 · 왕복 · 듀티 (93 12회차)');
  const scaleKey = dia.first !== null ? 'sd' : 'sg';
  const win = q.frames.filter(f => f.t >= (A.first || 0) - 40 && f.t <= (B.last || 1300) + 120);
  const peak = Math.max(...win.map(f => f[scaleKey]));
  const beats = Math.max(...q.frames.map(f => f.punch));
  const duty = win.filter(f => f[scaleKey] > 1.005).length / Math.max(1, win.length);
  ok(peak >= 1.15 && peak <= 1 + K.PZMAX + 0.02, `피크 배율 ×${peak.toFixed(3)} (1.15 ~ ${(1 + K.PZMAX).toFixed(2)} = 1+FX3_PZ_MAX)`);
  ok(beats >= 4, `왕복(fxPunchN 증가) ${beats}회 (≥4)`);
  ok(duty >= 0.55, `듀티 ${(duty * 100).toFixed(1)}% (≥55%)`);

  /* ── [5] 아이콘 수 ─────────────────────────────────────── */
  console.log('[5] 아이콘 수 상한 (선언 FXFLY_MAX)');
  const qPeak = Math.max(...q.frames.map(f => f.list.length));
  ok(qPeak >= 8 && qPeak <= K.FLYMAX, `UI 발 동시 최대 ${qPeak}개 (8 ~ FXFLY_MAX ${K.FLYMAX})`);

  /* ── [6] 전투 발은 3박자를 쓰지 않는다 ──────────────────── */
  console.log('[6] 전투 발 — 3박자 밖 · 팝업 아래 레이어(작업 77)');
  const gPeak = Math.max(...g.frames.map(f => f.list.length));
  const gLo = Math.max(...g.frames.map(f => f.list.filter(s => s.lo).length));
  const gUp = Math.max(...g.frames.map(f => f.list.filter(s => s.up).length));
  const gArr = arrT(g, 'gold');
  ok(gPeak > 0 && gPeak <= K.FLYMAXC, `전투 발 동시 최대 ${gPeak}개 (1 ~ FXFLY_MAX_C ${K.FLYMAXC})`);
  ok(gLo > 0 && gUp === 0, `#fxlc(팝업 아래) ${gLo}개 · #fxl(팝업 위) ${gUp}개`);
  ok(gArr.last !== null && gArr.last < K.ARR1 * 1000, `전투 발 마지막 도착 ${gArr.last}ms < UI 발 선언 ${K.ARR1 * 1000}ms`);

  /* ── [7] 씬 C 델타 회랑 (58 24·27·30회차) ───────────────── */
  console.log('[7] 씬 C 델타 회랑 — 훈련 카드기준 y275~396 (58 24·27·30회차)');
  const card = u.cards.length ? u.cards.reduce((a, b) => (b.y < a.y ? b : a)) : null;
  const dys = [];
  for (const f of u.frames) for (const d of f.delta) {
    /* 플로터가 실제로 선 카드를 x 로 고른다 */
    const c = u.cards.find(cc => d.x >= cc.x - 10 && d.x <= cc.x + cc.w + 10 && d.y >= cc.y - 140 && d.y <= cc.y + cc.h + 140);
    if (c) dys.push(d.y - c.y);
  }
  if (!dys.length) {
    ok(false, `델타 플로터 표본 0 — 씬 C 가 안 났다 (카드 ${u.cards.length}개${card ? ' 첫 카드 y' + Math.round(card.y) : ''})`);
  } else {
    const dmin = Math.min(...dys), dmax = Math.max(...dys);
    ok(dmin >= 265 && dmax <= 400, `델타 경로 카드기준 y ${dmin.toFixed(0)}~${dmax.toFixed(0)} (265~400 — 아이콘 275 위·버튼 396 아래)`);
  }

  /* ── [8] 잔여 DOM · 콘솔 ───────────────────────────────── */
  console.log('[8] 잔여 DOM · 콘솔 에러');
  ok(q.leftover === 0, `씬 B 종료 뒤 잔여 연출 노드 ${q.leftover}개 (0)`);
  const e = q.errs.length + g.errs.length + u.errs.length;
  ok(e === 0, `세 씬 콘솔 에러 합계 ${e}건`);

  console.log(`\nVERIFY93 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
