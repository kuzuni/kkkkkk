/* 작업 564 게이트 — 씬 B(일괄 버튼) 자유 밴드의 «라벨 keep-out» 이 버려지지 않는다.
 *
 * 왜 `verify58` [13] 로 부족한가 — [13] 은 **코인이 실제로 앉은 자리**를 머묾 창에서 잰다.
 * 그 자리는 난수라, 회피가 통째로 버려진 빌드에서도 «라벨 y 대역에 든 코인이 하필 없는» 실행이
 * 절반쯤 나온다(564 등재 관측: 26/27 ↔ 27/27 이 F·P·P·P·P·F). 그래서 [13] 은 **결함이 있는 쪽을
 * 못 잡는 것이 아니라 «반만» 잡는다.** 이 자는 같은 결함을 **결정적으로** 잡는다:
 * 코인이 어디 앉았는지가 아니라 **밴드를 정하는 산수 자신**에게 묻는다.
 *
 *   [A] 자유 밴드에서 회피가 실제로 선다 — `fx3BandX(…).holes` 가 비어 있지 않다.
 *       (36회차의 안전판이 물면 `holes = []` 가 되고, 그 순간 코인이 라벨 위에 앉을 수 있다.)
 *   [B] 그 밴드의 «구멍 뺀 폭 / 슬롯» 이 `FX3_MIND` 이상이다 — 회피를 지키느라 코인이 서로
 *       겹치는 반대편 함정(28~32회차)에 안 빠졌다는 뜻이다.
 *   [C] 개수 상한(`fx3SlotCap`)이 밴드와 어긋나지 않는다 — 상한 +1 슬롯은 반드시 실패해야 한다
 *       («상한» 이 실제로 최대치인가. 무르게 잡아 놓고 초록인 자를 막는다).
 *   [D] 그래도 개수는 사양의 하한 3 을 지킨다(`verify58` [2]·`verify93` 과 같은 뜻, 밴드 축에서).
 *   [E] 관측 — 머묾 창에서 «코인 중심 ↔ 라벨» 최소 여유 ≥ `FX3_KOM − FX3_BSFX`, 씨앗 3벌 연속.
 *   [R] 되돌림 시험 — `fx3SlotCap` 을 «0»(= 564 이전 거동)으로 돌려놓으면 [A] 가 빨개진다.
 *       이 항이 없으면 위 넷은 «이미 참인 것을 굳힌 자» 인지 구분되지 않는다(338 규칙).
 *   [R2] 되돌림 시험 2 — 왼쪽 되밀기를 36회차의 «한 방» 식으로 되돌리면 nsl 4 에서 폭이
 *       484 에 멈춰(슬롯당 121 < 123) 회피가 또 버려진다. 564 가 고친 두 번째 자리다.
 *   [R3] 되돌림 시험 3(672 신설) — keep-out 자체를 무력화(`fx3TextX` → [])하면 [E] 가 빨개진다.
 *       [R]·[R2] 는 «밴드 산수» 를 되돌리는 자라 [E] 의 **관측 경로**는 한 번도 안 쓴다.
 *
 * ⚑ 672(2026-09-01) — [E] 가 «실행마다 갈렸다»(씨앗 20260829 에서 50.1 ↔ 초록). **자의 창이 틀렸다.**
 *   [E] 는 표본 창을 `btn.click()` **전** 에 찍은 벽시계 `t0` 에서 `FX3_SPREAD..+FX3_HOLD_F` 로 잡았는데,
 *   코인 자신의 시계(`f.st`)는 클릭 처리 + 렌더 뒤에 시작한다 — `probe672` 실측 **스폰 지연 18.3~26.9ms**.
 *   그만큼 두 창이 어긋나서 [E] 창 표본 57개 중 **21개가 머묾이 아니라 «퍼짐»(a) 국면**이었다.
 *   퍼짐 중인 코인은 아직 버튼(=라벨 자리)에서 슬롯으로 가는 중이라 배치값에서 최대 **45.9px** 떨어져
 *   있는데(설계 부유 진폭은 11), 문턱 `FX3_KOM − FX3_BSFX` 는 **머묾 국면에서만** 성립하는 하한이다
 *   ⇒ 퍼짐 표본이 하나 걸리는 실행만 빨개졌다. 제품은 결함이 없다 — 같은 순간을 제품 자신의 국면
 *   (`f.sd ≤ f.t < f.ha`)으로 걸러 재면 진폭이 **10.98 ≤ 11** 로 설계 그대로다(`probe672` [7]).
 *   ⇒ 처방은 **문턱이 아니라 창**이다(문턱은 한 칸도 안 내렸다). 덤으로 셋을 같이 조였다:
 *     ⓐ y 대역 필터 폐지 — 제품의 keep-out 은 코인 y 를 안 보므로 필터는 자를 무르게만 했다
 *        («라벨 y 대역에 코인 없음» 으로 **n/a 초록**이 나던 자리다).
 *     ⓑ 좌표계 통일 — 코인·라벨을 **프레임 좌표**로 환산해 프레임 단위 문턱과 잰다(종전은 뷰포트
 *        px 를 프레임 문턱과 비교했다 — s = 1 이라 값은 같았지만 자가 축척에 묶여 있었다).
 *     ⓒ 표본 0 이면 빨강 — 머묾 국면을 한 번도 못 본 실행은 관측이 아니다.
 *
 * 실행: node tools/verify564.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 씬 B(22 퀘스트 «모두 받기»)를 열고, 요청한 계측을 돌려준다. */
async function scene(seed, work, arg) {
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
  const out = await p.evaluate(work, arg);
  await b.close();
  return out;
}

/* «모두 받기» 버튼에서 출발하는 자유 밴드를 제품에게 직접 물어본다(코인을 안 쏜다). */
const askBand = () => {
  const btn = document.getElementById('qAll');
  const p0 = fxPt(btn);
  const outX = fx3Out(p0);
  const escY = outX ? fx3Escape(p0) : null;
  if (!p0 || !outX || !escY || !escY.free) return { err: '자유 밴드를 못 잡았다' };
  /* ⚠ 회피가 버려지면 `holes` 가 비어 남는 폭이 «밴드 전체» 로 커진다 — 그 값을 슬롯 수로 나눠
     보고하면 «넓어서 통과» 처럼 읽힌다. 그래서 **회피를 적용한 폭**(keepSpan)을 따로 낸다. */
  const at = (n) => { const b = fx3BandX(p0, outX, escY, n);
    return { n, nh: b.holes.length, span: fx3Span(b.bx0, b.bx1, b.holes),
             keepSpan: fx3Span(b.bx0, b.bx1, escY.keep),
             bx0: Math.round(b.bx0), bx1: Math.round(b.bx1) }; };
  return { keep: escY.keep, MIND: FX3_MIND, KOM: FX3_KOM, BSFX: FX3_BSFX, PITCH: FX3_BSPITCH,
           cap: fx3SlotCap(p0, outX, escY, 6),
           rows: [2, 3, 4, 5, 6].map(at) };
};

/* 672 — 머묾 관측. **창을 벽시계가 아니라 코인 자신의 국면으로 잡는다**(`f.sd ≤ f.t < f.ha`).
   `kill` 이 참이면 keep-out 을 통째로 무력화한다([R3] 되돌림 시험) — 라벨 상자는 무력화 «전» 에
   제품에게서 받아 둔다(무력화 뒤에는 `escY.keep` 이 비어 자기 자신을 못 잰다). */
const hold = async (kill) => {
  const btn = document.getElementById('qAll');
  const p0 = fxPt(btn);
  const escY = fx3Escape(p0);
  if (!p0 || !escY || !escY.free) return { err: '자유 밴드를 못 잡았다' };
  /* 자는 라벨 상자를 **스스로** 잰다(제품의 `fx3TextX` 를 그대로 믿지 않는다) — 버튼 안 텍스트
     노드의 Range 중 가장 넓은 것. 프레임 좌표로 환산해 프레임 단위 문턱과 같은 자에 올린다. */
  const f0 = fxSc();
  let lab = null;
  { const rg = document.createRange(); let best = null;
    const walk = (nd) => { if (nd.nodeType === 3 && nd.textContent.trim()) { rg.selectNodeContents(nd); const rr = rg.getBoundingClientRect(); if (rr.width && (!best || rr.width > best.width)) best = rr; } for (const c of nd.childNodes) walk(c); };
    walk(btn); if (best) lab = { x0: (best.left - f0.x) / f0.s, x1: (best.right - f0.x) / f0.s }; }
  if (!lab) return { err: '라벨 텍스트 노드를 못 찾았다' };
  /* 자가 잰 상자가 제품의 keep-out 원본과 어긋나면 그 자체가 결함이다(672 실측 폭 차 0.00px) */
  const raw = escY.keep.map(h => [h[0] + FX3_KOM, h[1] - FX3_KOM]);
  const dLab = raw.length ? Math.max(Math.abs(raw[0][0] - lab.x0), Math.abs(raw[raw.length - 1][1] - lab.x1)) : 1e9;

  if (kill) window.fx3TextX = () => [];
  const need = FX3_KOM - FX3_BSFX;
  /* ⚑ 672 — 허용오차는 **고른 값이 아니라 잰 값**이다. 제품은 자리를 `translate(x.toFixed(1)px …)`
     로 **0.1px 격자에 양자화**해서 그린다(index.html 의 비행 그리기) — 그러니 «그려진» 자리는 계산값
     에서 최대 ±0.05px 벗어난다. 배치가 `fx3Eject` 로 구멍 «가장자리» 에 앉는 기하(644 이전이 그랬다)
     에서는 설계값이 문턱과 **정확히 같으므로**, 이 격자 몫을 안 빼면 자가 0.05px 짜리 칼날 위에 선다.
     `probe672` [8] 실측 최대 부족분 **0.001px** — 격자 상한 안이다. 문턱(need) 자신은 한 칸도 안 내렸다. */
  const QUANT = 0.05;
  const t0 = performance.now();
  btn.click();
  let bad = 0, mind = 1e9, ns = 0, off = 0, nb = 0, peak = 0;
  await new Promise((res) => {
    const tick = () => {
      const t = performance.now() - t0;
      peak = Math.max(peak, document.querySelectorAll('.fx-fly').length);
      const fs = fxSc();
      for (const fl of fxFlies) {
        if (!fl.el) continue;
        /* keep-out 은 «밴드 배치» 의 규칙이다 — 밴드 밖 코인이 있으면 필터가 무엇을 감추게 되므로
           세어서 **빨갛게** 만든다(범위를 조용히 좁히지 않는다). */
        if (!fl.bnd) { nb++; continue; }
        if (!(fl.t >= fl.sd && fl.t < fl.ha)) { off++; continue; }   /* 제품 자신의 머묾 국면만 */
        ns++;
        const ic = fl.el.querySelector('.cic'); const rr = (ic || fl.el).getBoundingClientRect();
        const cxF = (rr.left + rr.width / 2 - fs.x) / fs.s;
        const d = Math.max(lab.x0 - cxF, cxF - lab.x1);
        mind = Math.min(mind, d); if (d < need - QUANT) bad++;
      }
      if (t >= 700) return res();
      setTimeout(tick, 12);
    };
    tick();
  });
  return { bad, mind, ns, off, nb, need, peak, dLab, quant: QUANT };
};

(async () => {
  console.log('VERIFY564 — 씬 B 자유 밴드 라벨 keep-out (564)\n');

  const B = await scene(20260828, askBand);
  if (B.err) { console.log('  ✗ ' + B.err); process.exit(1); }
  console.log(`  [계측] keep-out ${JSON.stringify(B.keep)} · FX3_MIND ${B.MIND} · FX3_BSPITCH ${B.PITCH} · 상한 ${B.cap}슬롯`);
  for (const r of B.rows) console.log(`         nsl ${r.n}: 밴드 ${r.bx0}..${r.bx1} · 구멍 ${r.nh}개`
    + (r.nh ? ` · 남는폭 ${r.span.toFixed(1)} (슬롯당 ${(r.span / r.n).toFixed(1)})`
            : ` · **회피 버림** — 회피를 살렸다면 ${r.keepSpan.toFixed(1)} (슬롯당 ${(r.keepSpan / r.n).toFixed(1)} < ${B.MIND})`));

  console.log('\n[A] 자유 밴드에서 회피가 실제로 선다 (상한 슬롯 수에서)');
  const atCap = B.rows.find(r => r.n === B.cap);
  ok(!!atCap && atCap.nh > 0, `상한 ${B.cap}슬롯에서 구멍 ${atCap ? atCap.nh : 0}개 — 0 이면 회피가 버려진 것이다`);

  console.log('[B] 회피를 지키면서도 코인끼리 안 겹친다');
  ok(!!atCap && atCap.span / atCap.n >= B.MIND,
    `슬롯당 ${atCap ? (atCap.span / atCap.n).toFixed(1) : 'n/a'}px ≥ FX3_MIND ${B.MIND}`);

  console.log('[C] 상한이 «최대치» 다 — 한 슬롯 더 주면 반드시 실패한다');
  const over = B.rows.find(r => r.n === B.cap + 1);
  ok(!over || over.nh === 0 || over.span / over.n < B.MIND,
    `${B.cap + 1}슬롯에서는 회피가 못 선다(구멍 ${over ? over.nh : 'n/a'}개 · 회피를 살렸다면 슬롯당 ${over ? (over.keepSpan / over.n).toFixed(1) : 'n/a'} < ${B.MIND})`);

  console.log('[D] 사양 하한 — 개수가 3 밑으로 안 내려간다');
  ok(B.cap >= 3, `상한 ${B.cap}슬롯 ≥ 3 (93 «UI 발 3~6개» · verify58 [2] · verify93)`);

  console.log('[E] 관측 — 머묾 창 «코인 중심 ↔ 라벨» 최소 여유 (씨앗 3벌)');
  for (const sd of [20260828, 20260829, 20260830]) {
    const r = await scene(sd, hold, false);
    ok(!r.err && r.nb === 0 && r.ns > 0 && r.bad === 0 && r.dLab < 0.5,
      `씨앗 ${sd}: ${r.err || `머묾 표본 ${r.ns}개(코인×프레임) · 위반 ${r.bad}개 · 최소 여유 ${r.mind === 1e9 ? 'n/a' : r.mind.toFixed(1) + 'px'} (≥ ${r.need})`
      + ` · 밴드 밖 코인 ${r.nb}개 · 동시 최대 ${r.peak}개 · 국면 밖(퍼짐·흡수) ${r.off}개는 안 셌다`
      + ` · 자↔제품 라벨 상자 차 ${r.dLab.toFixed(2)}px · 허용 격자 ${r.quant}px(제품 toFixed(1))`}`);
  }

  console.log('\n[R] 되돌림 시험 — `fx3SlotCap` 을 564 이전(0 = 개수 안 깎음)으로 되돌린다');
  const R = await scene(20260828, () => {
    const btn = document.getElementById('qAll'); const p0 = fxPt(btn);
    const outX = fx3Out(p0); const escY = fx3Escape(p0);
    /* 564 이전 거동 = 개수를 안 깎으므로 nsl 이 원래 값(단독 6)으로 밴드에 들어간다 */
    const b = fx3BandX(p0, outX, escY, 6);
    return { nh: b.holes.length, keepSpan: fx3Span(b.bx0, b.bx1, escY.keep), MIND: FX3_MIND };
  });
  ok(R.nh === 0, `되돌리면 구멍 ${R.nh}개 — 0 이어야 «회피가 버려진다» 가 재현된 것이다 (회피를 살렸다면 ${R.keepSpan.toFixed(1)} / 6 = ${(R.keepSpan / 6).toFixed(1)} < ${R.MIND})`);

  console.log('[R2] 되돌림 시험 2 — 왼쪽 되밀기를 36회차 «한 방» 식으로 되돌린다');
  const R2 = await scene(20260828, () => {
    const btn = document.getElementById('qAll'); const p0 = fxPt(btn);
    const outX = fx3Out(p0); const escY = fx3Escape(p0);
    const nsl = 4;                                     /* 564 의 상한 값에서 재현한다 */
    let holes = escY.keep.slice();
    let bx1 = outX - FX3_BSOM;
    let bx0 = Math.min(p0.x + FX3_BSX0, bx1 - 60);
    bx0 = Math.max(fx3PanL + FX3_BSOM, Math.min(bx0, bx1 - nsl * FX3_BSPITCH));
    const need = nsl * FX3_BSPITCH + (fx3Span(bx0, bx1, []) - fx3Span(bx0, bx1, holes));
    if (bx1 - bx0 < need) bx0 = Math.max(fx3PanL + FX3_BSOM, bx1 - need);   /* ← 36회차의 한 방 */
    const span = fx3Span(bx0, bx1, holes);
    return { span, nsl, MIND: FX3_MIND, per: span / nsl };
  });
  ok(R2.per < R2.MIND, `한 방 되밀기로는 슬롯당 ${R2.per.toFixed(1)}px < FX3_MIND ${R2.MIND} — 회피가 또 버려진다(564 의 반복 되밀기가 이걸 넘긴다)`);

  console.log('[R3] 되돌림 시험 3(672) — keep-out 을 무력화하면 [E] 가 빨개진다');
  const R3 = await scene(20260829, hold, true);
  ok(!R3.err && R3.ns > 0 && R3.bad > 0 && R3.mind < R3.need,
    `무력화하면 머묾 표본 ${R3.ns}개 중 위반 ${R3.bad}개 · 최소 여유 ${R3.mind === 1e9 ? 'n/a' : R3.mind.toFixed(1) + 'px'} < ${R3.need}`
    + ` — 위반 0 이면 [E] 가 «이미 참인 것을 굳힌 자» 다(338 규칙)`);

  console.log(`\nVERIFY564 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
