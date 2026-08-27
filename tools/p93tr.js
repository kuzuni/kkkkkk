/* 작업 93/58 — «재화 흡수» 궤적 실측 probe (58 33회차 신설).

   왜 필요한가 — 33회차의 선행 조건은 `tools/verify93.js` 복원이고, 그 게이트의 임계
   (복도 하한 976 · 흔들림 ≤14px · 퍼짐 상한 200px · 형제 행 관통 0)는 리뷰에 **글로만**
   남아 있다. 임계를 눈대중으로 다시 적으면 게이트가 «지금 빌드를 통과시키는 자» 가 될 뿐이라,
   먼저 궤적을 실측해 리뷰의 수치와 대조한 뒤 게이트를 쓴다.

   실행: node tools/p93tr.js [scene]   scene = quest(기본) | gain | main */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SCENE = process.argv[2] || 'quest';

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
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
  }, SCENE);
  if (SCENE === 'quest') { await p.evaluate(() => openQuest()); await p.waitForTimeout(450); }

  /* 부팅 연출·카운터 롤이 완전히 가라앉을 때까지 (verify58 과 같은 정착 규칙) */
  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus').length + '|'
      + (document.getElementById('goldN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  const out = await p.evaluate(async (sc) => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    /* 출발점(리스트 행) · 형제 행 상자들 — 관통 판정의 기준 */
    const rows = [...document.querySelectorAll('.qs-r, .ml-r')].map(rect).filter(r => r.h >= 40);
    const pill = (cur) => {
      const el = document.querySelector('[data-cur="' + cur + '"] i') || document.querySelector('#top .' + cur + ' i');
      if (!el) return null; const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const goldPill = pill('gold'), diaPill = pill('dia');

    const frames = [];
    const t0 = performance.now();
    let p0 = null;
    if (sc === 'quest') { const b = document.getElementById('qAll'); if (b) { const r = b.getBoundingClientRect(); p0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; b.click(); } }
    else if (sc === 'gain') { const e = (typeof enemies !== 'undefined' && enemies[0]) || null; fxAt(e ? fxWorld(e.x, e.y - e.r) : fxWorld(cam.x, cam.y), 'combat'); S.gold += 128000; }
    else { fxAt(null); S.gold += 50000; }

    /* rAF 마다(≈16~33ms) 아이콘별 좌표를 찍는다 — 아이콘은 DOM 순서가 안정적이라 index 로 잇는다. */
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        const list = [...document.querySelectorAll('.fx-fly')].map((el) => {
          /* ⚑ DOM 순서(index)로 아이콘을 이으면 안 된다 — 도착해 제거될 때마다 뒤 아이콘의
             index 가 당겨져 «한 프레임에 1700px 점프» 하는 허깨비가 나온다(33회차 첫 실측).
             노드마다 한 번만 붙이는 고유 id 로 잇는다. */
          if (el.__p93 === undefined) el.__p93 = (window.__p93n = (window.__p93n || 0) + 1);
          const r = el.getBoundingClientRect();
          const ic = el.querySelector('.cic');
          return {
            i: el.__p93, cur: ic ? ic.getAttribute('data-cur-ic') : '?',
            x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
            lo: !!el.closest('#fxlc'),
          };
        });
        frames.push({
          t: Math.round(t), list,
          gold: (document.getElementById('goldN') || {}).textContent,
          dia: (document.getElementById('diaN') || {}).textContent,
        });
        if (t >= 2000) return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { frames, rows, goldPill, diaPill, p0 };
  }, SCENE);

  await b.close();

  const { frames, rows, goldPill, diaPill, p0 } = out;
  console.log(`P93TR — 씬 ${SCENE} · 프레임 ${frames.length} · 행 ${rows.length}개 · 출발 ${p0 ? Math.round(p0.x) + ',' + Math.round(p0.y) : 'n/a'}`);
  console.log(`  알약 gold ${goldPill ? Math.round(goldPill.x) + ',' + Math.round(goldPill.y) : 'n/a'} · dia ${diaPill ? Math.round(diaPill.x) + ',' + Math.round(diaPill.y) : 'n/a'}`);
  rows.forEach((r, i) => console.log(`  행${i} x${Math.round(r.x)}..${Math.round(r.x + r.w)} y${Math.round(r.y)}..${Math.round(r.y + r.h)}`));

  const peak = Math.max(...frames.map(f => f.list.length));
  console.log(`\n동시 최대 ${peak}개`);

  /* 퍼짐 최대 반경 — «퍼짐 구간»(FX3_SPREAD .22s + 머묾, 도착 전)만 본다.
     전 구간을 보면 알약까지의 비행거리(1700px)가 잡혀 무의미하다. */
  const org = p0 || (() => { const f = frames.find(f => f.list.length); if (!f) return null; return { x: f.list.reduce((a, b) => a + b.x, 0) / f.list.length, y: f.list.reduce((a, b) => a + b.y, 0) / f.list.length }; })();
  /* ⚑ 첫 프레임은 «아직 배치 전» 이다 — 노드는 생겼는데 transform 이 안 걸려 전부 (28,28)
     = 레이어 원점에 겹쳐 있다. 그 프레임을 세면 «퍼짐 반경 1680px» 라는 허깨비가 나온다. */
  const placedS = (g) => !(g.x < 60 && g.y < 60);
  let rmax = 0, rmaxT = 0;
  for (const f of frames) { if (f.t > 330) break; for (const g of f.list) { if (!placedS(g)) continue; const d = Math.hypot(g.x - org.x, g.y - org.y); if (d > rmax) { rmax = d; rmaxT = f.t; } } }
  console.log(`퍼짐 최대 반경(≤330ms = 퍼짐+머묾, 배치 전 프레임 제외) ${rmax.toFixed(1)}px @${rmaxT}ms`);

  /* 32차 2인 공통5 의 자 — 머묾 구간의 bbox · 최근접 중심거리 · 충전율.
     BC «123×162px 충전율 82%» · BD «111×163px · 평균 중심간격 34px < FX3_MIND 37 · 상호 가림 16.5%» */
  console.log('\n머묾 구간(180~330ms) 퍼짐 품질');
  for (const f of frames) {
    if (f.t < 180 || f.t > 330) continue;
    const l = f.list.filter(placedS);
    if (l.length < 4) continue;
    const xs = l.map(g => g.x), ys = l.map(g => g.y);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    let mind = 1e9, sum = 0, np = 0;
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const d = Math.hypot(l[i].x - l[j].x, l[i].y - l[j].y);
      mind = Math.min(mind, d); sum += d; np++;
    }
    /* 충전율 = 아이콘 잉크 면적 합 ÷ bbox 면적 (잉크 지름 32.5 = 리뷰가 쓰는 값) */
    const fill = l.length * Math.PI * 16.25 * 16.25 / Math.max(1, w * h);
    console.log(`  t=${f.t}ms n=${l.length} bbox ${w.toFixed(0)}×${h.toFixed(0)} · 최근접 ${mind.toFixed(1)} · 평균 ${(sum / np).toFixed(1)} · 충전율 ${(fill * 100).toFixed(0)}%`);
  }

  /* 형제 행 관통 — 아이콘 «중심» 이 출발 행이 아닌 행 상자 안에 든 표본 수 (딤 무시) */
  const inRow = (r, g) => g.x >= r.x && g.x <= r.x + r.w && g.y >= r.y && g.y <= r.y + r.h;
  const homeIdx = rows.findIndex(r => p0 && inRow(r, p0));
  let cross = 0, crossT = [];
  for (const f of frames) for (const g of f.list) {
    for (let k = 0; k < rows.length; k++) { if (k === homeIdx) continue; if (inRow(rows[k], g)) { cross++; crossT.push(`${f.t}ms 행${k} ${Math.round(g.x)},${Math.round(g.y)}`); } }
  }
  console.log(`형제 행 관통(딤 무시) ${cross}표본  홈행=${homeIdx}`);
  crossT.slice(0, 12).forEach(s => console.log('   ' + s));

  /* 복도 — 아이콘별 궤적에서 «패널 위쪽으로 올라가는 동안» 의 x. 행 최상단보다 위, 알약보다 아래. */
  /* 복도 = 아이콘이 «행 대역(y)» 을 지나는 동안의 x. 형제 행 우변 949 밖(≥976)이어야 한다는
     것이 `verify93 [2c]` 의 뜻이므로, 재는 창도 행 대역이어야 한다(첫 실측은 행 «위» 를 재서
     919 라는 무관한 값이 나왔다). */
  const rowTop = rows.length ? Math.min(...rows.map(r => r.y)) : 0;
  const rowBot = rows.length ? Math.max(...rows.map(r => r.y + r.h)) : 0;
  const lane = { gold: [], dia: [] };
  for (const f of frames) for (const g of f.list) {
    if (rowBot && g.y >= rowTop && g.y <= rowBot) (lane[g.cur] || (lane[g.cur] = [])).push(g.x);
  }
  for (const k of ['gold', 'dia']) {
    const a = lane[k] || [];
    if (!a.length) { console.log(`복도 ${k}: 표본 0`); continue; }
    console.log(`복도 ${k}: 표본 ${a.length} · min ${Math.min(...a).toFixed(1)} · max ${Math.max(...a).toFixed(1)} · 흔들림 ${(Math.max(...a) - Math.min(...a)).toFixed(1)}px`);
  }

  /* 흡수 중 «아래로 되돌아가는» 프레임 — 아이콘별 y 단조 감소 위반.
     ⚠ 머묾 구간의 «부유»(FX3_BSFY 8px)는 사양이므로 세면 안 된다. 각 아이콘이 출발 y 에서
     100px 넘게 올라간 «흡수 개시» 뒤부터 잰다. */
  let backs = 0, moved = 0;
  const st = new Map();
  for (const f of frames) {
    for (const g of f.list) {
      if (!placedS(g)) continue;
      const key = g.cur + ':' + g.i;
      const s = st.get(key) || { y0: g.y, on: false, prev: g.y };
      if (!s.on && g.y < s.y0 - 100) s.on = true;
      if (s.on) { moved++; if (g.y > s.prev + 2) backs++; }
      s.prev = g.y; st.set(key, s);
    }
  }
  console.log(`흡수 개시 후 y 역행 ${backs}/${moved}표본`);

  /* 최대 주행(프레임간 이동량) — 착지 회귀 항목 */
  let step = 0; const prevP = new Map();
  for (const f of frames) for (const g of f.list) {
    if (!placedS(g)) continue;
    const key = g.cur + ':' + g.i;
    if (prevP.has(key)) { const q = prevP.get(key); step = Math.max(step, Math.hypot(g.x - q.x, g.y - q.y)); }
    prevP.set(key, { x: g.x, y: g.y });
  }
  console.log(`프레임간 최대 주행 ${step.toFixed(1)}px`);

  /* 도착 봉투 — HUD 숫자가 처음/마지막 바뀐 시각 */
  for (const k of ['gold', 'dia']) {
    const a = frames.map(f => String(f[k] || '').trim());
    const base = a[0], fin = a[a.length - 1];
    const fi = a.findIndex(v => v !== base), li = fin === base ? -1 : a.findIndex(v => v === fin);
    console.log(`도착 ${k}: 첫 ${fi < 0 ? 'n/a' : frames[fi].t}ms · 마지막 ${li < 0 ? 'n/a' : frames[li].t}ms`);
  }
  console.log(`잔여 DOM(마지막 프레임) ${frames[frames.length - 1].list.length}개 · 콘솔 예외 ${errs.length}건`);
})();
