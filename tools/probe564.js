/* 작업 564 재현기 — `verify58` [13] «씬 B 머묾 keep-out» 이 왜 뜨고 지는가.
 *
 * 등재문(PROGRESS 564)의 처방 ① 이 요구하는 것: «최소 여유» 를 여러 번 찍어
 *   ⓐ 한 표본만 흔들리는지(= 게이트 플레이키) 아니면
 *   ⓑ 봉투 자체가 경계에 서 있는지(= 제품이 규칙을 못 지킨다)
 * 를 가른다. 값이 «50.5 요구 대 −6.0 관측» 으로 **부호가 반대**인 것이 등재 시점의 의심이었다.
 *
 * ⚑ 이 자는 «관측» 만 한다 — 제품을 한 줄도 안 고치고, 게이트의 판정식을 베끼지 않는다.
 *   대신 제품이 스폰 순간 실제로 쓴 값을 **직접 계측**한다:
 *     · `fx3Span(bx0, bx1, holes)` 를 감싸 호출 인자를 기록한다(밴드 폭·구멍 개수).
 *       36회차 코드는 구멍을 넣고 한 번, 빼고 한 번 불러 «남는 폭 / 슬롯 < FX3_MIND» 면
 *       **회피를 통째로 버린다**(`holes = []`). 그 버림이 실제로 일어나는지가 이 자의 핵심 질문이다.
 *     · `fx3Escape(p0)` 의 반환(`keep`)도 같이 남긴다 — keep-out 이 «계산은 됐는데 버려진» 것인지
 *       «처음부터 안 잡힌» 것인지 갈린다.
 *   그리고 게이트와 같은 창(퍼짐 끝 ~ 흡수 시작)에서 «코인 중심 ↔ 라벨 상자» 최소 여유를 잰다.
 *
 * 실행: node tools/probe564.js [횟수]      (기본 8회 — 씨앗을 바꿔 돌린다) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* 대조 실행용 — `P564_FILE=index-564g1.html node tools/probe564.js 3` 처럼 다른 트리를 물릴 수 있다
   (543 «잉크 ×3» 이 원인인지 가르는 반사실 대조. 파일은 같은 디렉터리에 둬야 assets 가 풀린다). */
const URL = 'file://' + path.resolve(__dirname, '..', process.env.P564_FILE || 'index.html');
const N = Math.max(1, +(process.argv[2] || 8));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

async function trial(seed) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  /* verify58 과 같은 씨앗 고정. ⚠ 씨앗은 같아도 **소비 오프셋**은 부팅 타이밍에 따라 달라진다 —
     그것이 «같은 자를 여러 번 돌리면 값이 갈리는» 이유이므로, 여기서는 씨앗 자체도 굴려 본다. */
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
  await p.waitForTimeout(400);

  let prev = null;
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => document.querySelectorAll('.fx-fly,.fx-plus,.fx-spark,.fx-flash,.fx-check,.fx-toast').length
      + '|' + (document.getElementById('goldN') || {}).textContent);
    if (st === prev && st.startsWith('0|')) break;
    prev = st; await p.waitForTimeout(80);
  }

  return await p.evaluate(async () => {
    /* ── 계측 부착(제품 코드는 안 고친다 — 전역 바인딩만 감싼다) ── */
    const log = [];
    const _span = window.fx3Span, _esc = window.fx3Escape;
    window.fx3Span = function (bx0, bx1, holes) {
      const r = _span(bx0, bx1, holes);
      log.push({ k: 'span', bx0: Math.round(bx0 * 10) / 10, bx1: Math.round(bx1 * 10) / 10,
                 nh: (holes || []).length, w: Math.round(r * 10) / 10 });
      return r;
    };
    window.fx3Escape = function (p0) {
      const r = _esc(p0);
      log.push({ k: 'esc', free: !!(r && r.free), keep: r && r.keep ? r.keep.map(h => [Math.round(h[0]), Math.round(h[1])]) : null,
                 h: r ? Math.round(r.h) : null });
      return r;
    };

    /* 라벨 advance 상자 — verify58 [13] 과 같은 자(텍스트 노드 Range) */
    let qlab = null;
    { const btn = document.getElementById('qAll');
      if (btn) { const rg = document.createRange(); let best = null;
        const walk = (n) => { if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width && (!best || r.width > best.width)) best = r; } for (const c of n.childNodes) walk(c); };
        walk(btn); if (best) qlab = { x: best.left, y: best.top, w: best.width, h: best.height }; } }

    const K = { KOM: FX3_KOM, BSFX: FX3_BSFX, MIND: FX3_MIND, PITCH: FX3_BSPITCH, GINK: FX3_GINK };
    const H = { a: FX3_SPREAD * 1000, b: (FX3_SPREAD + FX3_HOLD_F) * 1000 };

    const samples = [];
    const t0 = performance.now();
    const btn = document.getElementById('qAll'); if (btn) btn.click();
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        const flies = [...document.querySelectorAll('.fx-fly')].map((el) => {
          const ic = el.querySelector('.cic'); const r = (ic || el).getBoundingClientRect();
          return { cx: r.left, cy: r.top, cw: r.width, ch: r.height };
        });
        samples.push({ t: Math.round(t), flies });
        if (t >= 900) return res();
        setTimeout(tick, 15);
      };
      tick();
    });

    /* 게이트와 같은 창·같은 규칙으로 «최소 여유» 를 잰다 */
    let n = 0, bad = 0, mind = 1e9, worst = null;
    if (qlab) for (const s of samples) {
      if (s.t < H.a || s.t > H.b) continue;
      n++;
      for (const f of s.flies) {
        const cx = f.cx + f.cw / 2, cy = f.cy + f.ch / 2;
        if (cy < qlab.y || cy > qlab.y + qlab.h) continue;
        const d = Math.max(qlab.x - cx, cx - (qlab.x + qlab.w));
        if (d < mind) { mind = d; worst = { t: s.t, cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10 }; }
        if (d < K.KOM - K.BSFX) bad++;
      }
    }
    /* 창 밖까지 넓혀 본 전 구간 최소 — «창이 짧아 못 본 것» 과 «실제로 안 겹친 것» 을 가른다 */
    let mindAll = 1e9;
    if (qlab) for (const s of samples) for (const f of s.flies) {
      const cx = f.cx + f.cw / 2, cy = f.cy + f.ch / 2;
      if (cy < qlab.y || cy > qlab.y + qlab.h) continue;
      mindAll = Math.min(mindAll, Math.max(qlab.x - cx, cx - (qlab.x + qlab.w)));
    }
    window.fx3Span = _span; window.fx3Escape = _esc;
    return { qlab, K, H, n, bad, mind, mindAll, worst, log,
             need: K.KOM - K.BSFX, holdSamples: samples.filter(s => s.t >= H.a && s.t <= H.b).length };
  }).finally(() => b.close());
}

(async () => {
  console.log('PROBE564 — verify58 [13] «머묾 keep-out» 재현\n');
  const rows = [];
  for (let i = 0; i < N; i++) {
    const seed = 20260828 + i;
    const r = await trial(seed);
    rows.push({ seed, ...r });
    const dropped = (() => {
      const sp = r.log.filter(x => x.k === 'span');
      const withH = sp.find(x => x.nh > 0);
      const mapCalls = sp.slice(sp.indexOf(withH) + 1);
      return { withH, drop: !!withH && mapCalls.length > 0 && mapCalls.every(x => x.nh === 0) };
    })();
    const esc = r.log.find(x => x.k === 'esc');
    console.log(`  seed ${seed}: 머묾표본 ${r.holdSamples} · 위반 ${r.bad} · 최소여유 ${r.mind === 1e9 ? 'n/a' : r.mind.toFixed(1)}px`
      + ` (요구 ≥ ${r.need}) · 전구간최소 ${r.mindAll === 1e9 ? 'n/a' : r.mindAll.toFixed(1)}px`
      + ` · keep ${esc && esc.keep ? JSON.stringify(esc.keep) : 'null'} · 밴드폭 ${dropped.withH ? (dropped.withH.bx1 - dropped.withH.bx0).toFixed(0) : '?'}`
      + ` · 구멍뺀폭 ${dropped.withH ? dropped.withH.w : '?'} · 회피버림 ${dropped.drop ? 'YES' : 'no'}`);
  }

  const K = rows[0].K;
  console.log('\n  [계측] 첫 실행의 fx3Span 호출 순서 (밴드가 어디까지 열렸는가):');
  for (const c of rows[0].log) {
    if (c.k === 'esc') console.log(`      esc free=${c.free} h=${c.h} keep=${JSON.stringify(c.keep)}`);
    else console.log(`      span bx ${c.bx0}..${c.bx1} (폭 ${(c.bx1 - c.bx0).toFixed(1)}) · 구멍 ${c.nh}개 · 남는폭 ${c.w}`);
  }
  console.log(`\n  [상수] FX3_GINK ${K.GINK} · FX3_MIND ${K.MIND} · FX3_KOM ${K.KOM} · FX3_BSFX ${K.BSFX} · FX3_BSPITCH ${K.PITCH}`);
  console.log(`  [라벨] «모두 받기» advance 상자 x ${rows[0].qlab ? rows[0].qlab.x.toFixed(1) + '..' + (rows[0].qlab.x + rows[0].qlab.w).toFixed(1) : 'n/a'}`
    + ` · y ${rows[0].qlab ? rows[0].qlab.y.toFixed(1) + '..' + (rows[0].qlab.y + rows[0].qlab.h).toFixed(1) : 'n/a'}`);

  console.log('\n[1] 재현 — 같은 자가 실행마다 갈리는가');
  const reds = rows.filter(r => r.bad > 0).length;
  ok(reds > 0 && reds < rows.length, `${rows.length}회 중 빨강 ${reds}회 — 뜨고 지는 것이 재현된다(0 도 전부도 아니다)`);

  console.log('[2] 흔들리는 것이 «값» 인가 «표본» 인가');
  const mins = rows.map(r => r.mind).filter(v => v < 1e9);
  ok(mins.length > 0, `머묾 창에서 라벨 y 대역에 든 코인이 있는 실행 ${mins.length}/${rows.length}`);
  console.log(`      최소여유 분포: ${mins.map(v => v.toFixed(1)).join(' · ')}`);

  console.log('[3] 회피(keep-out)가 실제로 버려지는가 — 제품 쪽 축');
  const drops = rows.filter(r => {
    const sp = r.log.filter(x => x.k === 'span'); const wi = sp.findIndex(x => x.nh > 0);
    return wi >= 0 && sp.slice(wi + 1).length > 0 && sp.slice(wi + 1).every(x => x.nh === 0);
  }).length;
  ok(true, `회피를 버린 실행 ${drops}/${rows.length} — «남는 폭 / 슬롯 < FX3_MIND ${K.MIND}» 가드가 무는가`);

  console.log('[4] 봉투가 경계에 서 있는가 — 구조적 산수');
  const sp0 = rows[0].log.filter(x => x.k === 'span');
  const w0 = sp0.find(x => x.nh === 0), wh = sp0.find(x => x.nh > 0);
  if (w0 && wh) {
    console.log(`      구멍 없는 폭 ${w0.w} · 구멍 뺀 폭 ${wh.w} · 슬롯 6 기준 ${(wh.w / 6).toFixed(1)}px/슬롯 (요구 ≥ ${K.MIND})`);
    ok(true, `구멍 뺀 폭/슬롯 ${(wh.w / 6).toFixed(1)} vs FX3_MIND ${K.MIND} — ${wh.w / 6 < K.MIND ? '가드가 문다(회피 버림)' : '가드가 안 문다'}`);
  } else ok(false, 'fx3Span 호출을 못 잡았다 — 계측이 안 붙었다');

  console.log(`\nPROBE564 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(0);
})();
