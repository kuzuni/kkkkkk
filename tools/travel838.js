/* 작업 838 공용 부품 — 「요소 대상 버스트가 **제 몸길이만큼도 안 움직인다**」를 재는 자
 *
 *   const { runScene, SCENES, STOPS } = require('./travel838');
 *
 * `probe838`(재현)과 `verify838`(게이트)이 **같은 자**를 쓴다(402 «두 벌 금지» · 681 의 `envelope681` 선례).
 * 자를 두 벌로 적으면 재현이 찍은 수치와 게이트가 지키는 수치가 조용히 갈린다.
 *
 * ⚑ 무엇을 재는가 — 681 9회차 비평 2인(CV·CW)이 **각각 1순위**로 낸 세 얼굴을 그대로:
 *   ⓐ **사거리** = 한 알의 총 이동 ÷ 그 알의 최대 지름(«몸길이»). CV 24.0px / 41px = **0.59**.
 *   ⓑ **출생 반경** = 끝 반경 ÷ t=0 반경(발원 중심 기준). 1 에 가까우면 «이미 흩어진 자리에서 태어난다».
 *   ⓒ **이웃 장 IoU** = 캡처 격자의 이웃 두 장에서 같은 알의 상자 겹침. 높으면 «같은 그림 두 장».
 * ⚠ 씬 B(유물 소환)는 **점(좌표) 대상**이라 이 클램프를 안 탄다 — 대조군이다(CV 9.5 몸길이).
 * ⚠ 위상은 `envelope681.SAMPLE` 이 눕힌다(알별 음지연 제거) — 이 자가 재는 것은 «봉투» 가 아니라
 *   «알이 어디서 태어나 어디로 가는가» 라, 위상이 갈리면 알끼리 못 섞는다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SAMPLE } = require('./envelope681');

const SEED = 20260902;
/* 캡처 격자 — `cap681.js` 의 STOPS 와 **같은 시각**이다(비평가가 보는 여덟 장 바로 그 자리) */
const STOPS = [0, 20, 45, 70, 110, 175, 250, 320];

const SCENES = [
  { id: 'train', n: '23 훈련 카드 [강화] (660 골드 아이콘 버스트 · **요소** 대상)',
    open: 'openTrain()', btn: '#trCards [data-tr] .cb', elem: true },
  { id: 'relic', n: '89 유물 소환 버튼 (666 유물화폐 버스트 · **점** 대상 — 대조군)',
    open: 'openRelw()', btn: '#rwBasin', elem: false },
];

/* 두 정사각형(중심 c · 한 변 w)의 IoU — 비평가가 PNG 에서 재는 «상자 겹침» 과 같은 산수.
   ⚠ 알은 정사각 상자다(`width = height = sz`) — 높이를 따로 받지 않는다(받으면 undefined 가
     조용히 NaN 으로 번져 **전부 0** 이 된다: 1회차에 실제로 그랬다). */
function iou(a, b) {
  const ix = Math.max(0, Math.min(a.cx + a.w / 2, b.cx + b.w / 2) - Math.max(a.cx - a.w / 2, b.cx - b.w / 2));
  const iy = Math.max(0, Math.min(a.cy + a.w / 2, b.cy + b.w / 2) - Math.max(a.cy - a.w / 2, b.cy - b.w / 2));
  const inter = ix * iy, uni = a.w * a.w + b.w * b.w - inter;
  return uni > 0 ? inter / uni : 0;
}

/* ⚑⚑ 838 12회차 — **11회차 채점 2인이 실제로 잰 두 축을 자에 세운다.**
 * 11회차의 ㉡ 은 «정지하는 알 3개» 인데 [A4](총 이동 ÷ 지름 = 1.49)가 그것을 **못 본다** —
 * 두 사람이 잰 것은 «수명 후반의 속도»(DM t=70→250 에서 0.014~0.025 vs 0.217 px/ms = **11.9배**)와
 * «발원 테두리부터의 여유»(DL «선두 1.83 몸길이 ↔ 뭉치 0.51 몸길이 = 3.6배»)다.
 * 총 이동은 **태어난 자리까지 세므로**(발원 원반 밖에서 태어난 알은 안 움직여도 값이 크다)
 * «나온 뒤로 얼마나 더 가는가» 를 못 잰다 — 그래서 [A4] 가 1.49 로 초록인 채 세 알이 서 있다.
 * ㉠(빈 부채)도 같은 자리에 세운다: 빈 각 자체가 아니라 **«「53」 이 정당화하지 않는 초과분»**
 * (DM 107.0° − 44.3° 쐐기 = 62.7° · DL 67.4° — 두 사람이 다른 사분면에서 재고 4.7° 차로 맞았다).
 */
function angSpan(h, ox, oy) {   /* 구멍 사각형이 발원에서 차지하는 각 구간 [lo,hi](도 · hi 는 lo 를 넘을 수 있다) */
  if (ox >= h.x && ox <= h.x + h.w && oy >= h.y && oy <= h.y + h.h) return [0, 360];
  const cs = [[h.x, h.y], [h.x + h.w, h.y], [h.x, h.y + h.h], [h.x + h.w, h.y + h.h]]
    .map(c => ((Math.atan2(c[1] - oy, c[0] - ox) * 180 / Math.PI) + 360) % 360).sort((a, b) => a - b);
  /* 네 각을 담는 **가장 짧은 호** — 원을 넘어가는 자리(0° 근처)도 이 방법이 그대로 잡는다 */
  let bLo = cs[0], bW = 360;
  for (let i = 0; i < cs.length; i++) {
    const lo = cs[i], w = (cs[(i + 3) % 4] - lo + 720) % 360;
    if (w < bW) { bW = w; bLo = lo; }
  }
  return [bLo, bLo + bW];
}
/* 각 구간들이 [lo,hi] 창 안에서 덮는 각도(도) — 원을 넘는 구간은 두 토막으로 잘라 센다 */
function blockedIn(spans, lo, hi) {
  const segs = [];
  for (const s of spans) {
    const a = ((s[0] % 360) + 360) % 360, b = a + (s[1] - s[0]);
    for (const off of [-360, 0, 360]) {
      const x = Math.max(a + off, lo), y = Math.min(b + off, hi);
      if (y > x) segs.push([x, y]);
    }
  }
  segs.sort((p, q) => p[0] - q[0]);
  let cov = 0, end = -Infinity;
  for (const [a, b] of segs) {
    if (a > end) { cov += b - a; end = b; } else if (b > end) { cov += b - end; end = b; }
  }
  return cov;
}

function summarize(env, org) {
  const rows = env.rows, last = rows.length - 1;
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const per = rows[0].per.map((_, i) => {
    const pts = rows.map(r => r.per[i]);
    const maxD = Math.max(...pts.map(p => p.w));
    const net = Math.hypot(pts[last].cx - pts[0].cx, pts[last].cy - pts[0].cy);
    let pth = 0;
    for (let k = 1; k < pts.length; k++) pth += Math.hypot(pts[k].cx - pts[k - 1].cx, pts[k].cy - pts[k - 1].cy);
    const r0 = Math.hypot(pts[0].cx - org.x, pts[0].cy - org.y);
    const rE = Math.hypot(pts[last].cx - org.x, pts[last].cy - org.y);
    const ious = [];
    for (let k = 1; k < pts.length; k++)
      ious.push(iou({ cx: pts[k - 1].cx, cy: pts[k - 1].cy, w: pts[k - 1].w },
                    { cx: pts[k].cx, cy: pts[k].cy, w: pts[k].w }));
    /* 스필 — 그린 상자(중심 ± w/2)가 호스트 상자를 얼마나 넘는가(음수면 안쪽). 619 13·14회차의 그 값 */
    const over = org.bx === undefined ? 0 : Math.max(...pts.map(p2 => Math.max(
      org.bx - (p2.cx - p2.w / 2), (p2.cx + p2.w / 2) - (org.bx + org.bw),
      org.by - (p2.cy - p2.w / 2), (p2.cy + p2.w / 2) - (org.by + org.bh))));
    /* ⚑ 12회차 — **수명 후반(t=70→250)의 이동 속도**(DM 이 잰 그 축 · px/ms).
       격자 시각에서 자리를 찾으므로 STOPS 를 바꿔도 따라온다(없으면 앞뒤 끝을 쓴다). */
    const iA = Math.max(0, STOPS.indexOf(70)), iB = STOPS.indexOf(250) < 0 ? last : STOPS.indexOf(250);
    let lp = 0;
    for (let k = iA + 1; k <= iB; k++) lp += Math.hypot(pts[k].cx - pts[k - 1].cx, pts[k].cy - pts[k - 1].cy);
    const lateV = (STOPS[iB] - STOPS[iA]) > 0 ? lp / (STOPS[iB] - STOPS[iA]) : 0;
    /* ⚑ 12회차 — **발원 테두리부터의 여유**(DL 이 잰 그 축 · 몸길이 환산).
       [A4](총 이동 ÷ 지름)와 다른 것을 묻는다 — 총 이동은 «태어난 자리» 부터 세지만
       사람이 보는 것은 «코인 밖으로 얼마나 나왔나» 다. 발원 원반은 A5 와 같은 값(`fr × 0.72`). */
    const clr = maxD > 0 && org.fr ? (rE - org.fr * 0.72) / maxD : 0;
    return { maxD, net, pth, r0, rE, over, pts, body: maxD > 0 ? net / maxD : 0, ious, iouMax: Math.max(...ious),
             lateV, clr };
  });
  const pairIoU = per[0].ious.map((_, k) => mean(per.map(p => p.ious[k])));
  /* ⚑ 838 3회차 — 비평 2인이 2회차에서 **각도**로 결함을 적었다(CZ «40.8° 부채» · DA «좌향 65° 쐐기 ·
     f8 에 4알이 x=68±0.5 한 줄»). 그 둘을 자에 세운다:
       fanGap = 끝점 방위각을 정렬해 **가장 큰 빈 각**(360 이면 알이 하나뿐) · 작을수록 온 원을 쓴다
       pile   = 끝점 x 가 2px 띠 안에 몇 알이나 몰렸는가(클램프 서명) */
  const angs = per.map(p => Math.atan2(p.pts[last].cy - org.y, p.pts[last].cx - org.x) * 180 / Math.PI)
                  .map(v => (v + 360) % 360).sort((a, b) => a - b);
  const gaps = angs.map((v, i) => (i ? v - angs[i - 1] : v + 360 - angs[angs.length - 1]));
  const fanGap = angs.length < 2 ? 360 : Math.max(...gaps);
  /* ⚑ 12회차 — **빈 각 중 «구멍이 정당화하지 않는» 몫**(DM 62.7° · DL 67.4°).
     빈 각 자체(C3)와 다른 것을 묻는다 — «비어 있다» 가 아니라 «비어 있을 이유가 있나» 다.
     ⚠ **가장 큰 빈 각 하나만 봐서는 못 잡는다(재현으로 확인)** — 기본 시드에서 최대 빈 각
     (313°→58° · 105.5°)은 가격 숫자 상자가 82.3° 를 덮어 초과가 23° 뿐인데, 두 사람이 각각
     적은 부채는 **두 번째·세 번째 빈 각**(58°→120° 62.0° · 227°→298° 71.0° · 구멍 0°)이다.
     DL 이 «이건 「53」 섹터가 **아니다**» 라고 못박은 것이 바로 그 자리다. ⇒ **모든 빈 각을 훑어**
     각자에서 구멍이 덮는 몫을 뺀 뒤 그 최댓값을 쓴다. */
  const spans = (org.holes || []).map(h => angSpan(h, org.x, org.y));
  const wedge = spans.length ? blockedIn(spans, 0, 360) : 0;
  let gapExcess = angs.length < 2 ? 360 : 0, gapLo = 0, gapHi = 360, gapBlocked = 0;
  for (let i = 0; i < gaps.length; i++) {
    const lo = i ? angs[i - 1] : angs[angs.length - 1] - 360, hi = lo + gaps[i];
    const blk = spans.length ? blockedIn(spans, lo, hi) : 0;
    if (gaps[i] - blk > gapExcess) { gapExcess = gaps[i] - blk; gapLo = lo; gapHi = hi; gapBlocked = blk; }
  }
  const xs = per.map(p => p.pts[last].cx);
  const pile = Math.max(...xs.map(x => xs.filter(y => Math.abs(y - x) <= 1).length));
  const med = a => { const b = [...a].sort((x, y) => x - y); const h = b.length >> 1;
    return b.length % 2 ? b[h] : (b[h - 1] + b[h]) / 2; };
  return {
    n: per.length, per, dur: env.dur,
    body: mean(per.map(p => p.body)),
    bodyMin: Math.min(...per.map(p => p.body)),
    bodyMed: med(per.map(p => p.body)),            /* 비평 2인이 적은 눈금 — 평균이 아니라 중앙값이다 */
    net: mean(per.map(p => p.net)),
    maxD: mean(per.map(p => p.maxD)),
    r0: mean(per.map(p => p.r0)),
    rE: mean(per.map(p => p.rE)),
    growth: mean(per.map(p => p.rE)) / Math.max(1e-9, mean(per.map(p => p.r0))),
    pairIoU, iouPeak: Math.max(...pairIoU), fanGap, pile,
    /* ⚑ 12회차 신설 — 위 두 머리말의 축(㉠·㉡). 덧붙이는 값이라 기존 수는 한 자리도 안 움직인다. */
    wedge, gapBlocked, gapExcess, gapLo, gapHi,
    lateVMin: Math.min(...per.map(p => p.lateV)), lateVMax: Math.max(...per.map(p => p.lateV)),
    lateVMed: med(per.map(p => p.lateV)),
    lateVRatio: Math.max(...per.map(p => p.lateV)) / Math.max(1e-9, Math.min(...per.map(p => p.lateV))),
    slow: per.filter(p => p.lateV < 0.05).length,     /* DM 이 «정지» 로 센 알(0.014~0.025 ↔ 0.217 px/ms) */
    clrMin: org.fr ? Math.min(...per.map(p => p.clr)) : 0,
    clrMed: org.fr ? med(per.map(p => p.clr)) : 0,
    /* ⚑ 838 5회차 — 비평 2인이 4회차에서 **직접 센 수**: 끝나도 발원 원반 안에 있는 알(DD 3알 · DE 2~6알) */
    stuck: org.fr ? per.filter(p => p.rE < org.fr * 0.72).length : 0,   /* 그린 원반 ≈ 상자의 0.72(제품 `FXB_FOK` 와 같은 값 · DD 실측 52/71) */
    spill: Math.max(...per.map(p => p.over)),      /* 호스트 상자 밖으로 나간 잉크(px · 음수면 안쪽) */
  };
}

/* 한 씬을 **실제 사용자 경로**로 굴려 표본을 낸다. `src` 로 되돌림 사본(index.html)을 줄 수 있다.
 *
 * ⚑ 873 — `opts` 둘은 **자 자신의 결함을 재는 손잡이**다(제품과 무관하다):
 *   `reseed`(기본 true)  트리거 **직전**에 시드를 다시 심는다 — `cap681.js` 가 이미 지키는 규약
 *                        («난수는 트리거 직전에 다시 심는다» · LESSONS 666-⑧). 이 파일만 안 지켰다.
 *   `burn`(기본 0)       트리거 직전에 난수를 k 번 미리 뽑아 **러너가 느린 상황을 흉내 낸다**.
 *                        재시드가 있으면 burn 이 몇이든 값이 **한 자리도 안 바뀌고**, 없으면 갈린다
 *                        — 그 갈림이 873 의 뿌리다(`probe873`·`verify873` 이 그 짝을 단언한다).
 */
/* ⚑ 883 — `opts.init`(선택) = 트리거 **전에** 페이지 안에서 한 번 실행할 JS 문자열.
 *   882 의 `seed` 와 같은 «자 손잡이» 다(기본값 없음 = 종전과 한 자리도 안 다르다).
 *   883 은 이것으로 «구멍 자를 옛 것(글꼴 상자)으로 되돌린 판» 을 **사본 파일 없이** 만든다 —
 *   같은 트리·같은 시드에서 자 한 줄만 갈아 끼우므로 «사본이 다른 무엇을 같이 바꿨나» 가 안 생긴다. */
async function runScene(scene, src, opts) {
  const o = opts || {};
  const reseed = o.reseed !== false;
  const burn = o.burn | 0;
  /* ⚑ 882 — `opts.seed`(기본 `SEED`)는 **표본을 여러 장 뽑기 위한** 손잡이다. 기본값이 종전과
     같아 838·873 의 기준값은 한 자리도 안 움직인다. 882 가 «버튼 세로 ↔ 산포» 를 잴 때
     한 시드의 제비뽑기를 구조로 읽지 않으려고 세 시드로 같은 스윕을 돌린다(872 교훈). */
  const seed = (o.seed === undefined ? SEED : o.seed) >>> 0;
  const URL = 'file://' + path.resolve(src || path.join(__dirname, '../index.html')).replace(/\\/g, '/');
  const b = await launch(chromium);
  const errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    /* 시드 고정 — 안 하면 실행마다 다른 버스트가 돼 «사거리» 가 흔들린다(666 5회차 · LESSONS 666-⑧) */
    await page.addInitScript((sd) => {
      try { localStorage.clear(); } catch (e) {}
      let s = sd >>> 0;
      Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, seed);
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(900);
    await page.evaluate((open) => {
      S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; S.relic = 250000;
      if (S.temper) S.temper.pts = 1e6;
      try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
      const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
      uiDirty = true; if (typeof renderUI === 'function') renderUI();
      (new Function(open))();
    }, scene.open);
    await page.waitForTimeout(700);
    await page.waitForFunction(() => document.querySelectorAll('#fxl > *').length === 0, null, { timeout: 5000 }).catch(() => {});
    if (o.init) await page.evaluate(src2 => { (new Function(src2))(); }, o.init);   /* 883 — 자 손잡이 */

    /* 발원 중심·호스트 상자는 **트리거 전**에 잡는다(621 눌림이 프레임마다 호스트를 키운다 — LESSONS 681-⑥) */
    const geo = await page.evaluate((sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      const r = el.getBoundingClientRect();
      const a = document.getElementById('app'), ar = a ? a.getBoundingClientRect() : null;
      const sc = ar ? (ar.width / (a.offsetWidth || ar.width)) || 1 : 1;
      /* ⚑ 발원은 호스트 중심이 아니라 **제품이 쓰는 그 점**이다 — 호스트가 `--burst-from`(838)으로
         발원을 신고했으면 그 자식의 중심에서 잰다(안 그러면 «출생 반경» 이 아이콘↔중심 거리를
         같이 세어 자가 유령을 만든다 · 2회차에 실제로 그랬다: 22px 링을 49px 로 읽었다). */
      let ox = r.x + r.width / 2, oy = r.y + r.height / 2, fr = 0, fi = 0;
      try {
        const s2 = getComputedStyle(el).getPropertyValue('--burst-from').trim().replace(/^['"]|['"]$/g, '');
        const nd = s2 ? el.querySelector(s2) : null;
        if (nd) { const rb = nd.getBoundingClientRect(); ox = rb.x + rb.width / 2; oy = rb.y + rb.height / 2;
                  fr = Math.max(rb.width, rb.height) / 2;
                  /* ⚑ 881 — `fr` 은 «남은 방» 을 재려고 **긴 변**을 집는다(838 이 쓰는 그 값 · 안 건드린다).
                     881 이 쓰는 분모는 그것이 아니라 **그려진 아이콘의 정사각**이다 — 훈련의 발원 `<s>` 는
                     줄상자라 긴 변이 71.31 인데 그 안의 `img.cic` 는 52.97 정사각(= DJ 의 «코인 Ø50»)이다.
                     `.cic` 자식이 있으면 그것을, 없으면 짧은 변을 쓴다. **덧붙이는 값이라 기존 수는 불변.** */
                  const ic = nd.querySelector('.cic') || (nd.classList && nd.classList.contains('cic') ? nd : null);
                  const ri = ic ? ic.getBoundingClientRect() : rb;
                  fi = Math.min(ri.width, ri.height); }
      } catch (e) {}
      /* ⚑ 838 12회차 — **호스트가 «덮지 마라» 고 신고한 잉크**(816 `--burst-keep`)를 그대로 읽어 온다.
         11회차 두 사람이 «「53」 이 정당화하는 쐐기» 로 잰 그 상자다 — 자가 손으로 좌표를 적으면
         라벨이 바뀔 때 조용히 갈리므로 **제품이 읽는 그 선택자**에서 뽑는다(402 «사본 금지»). */
      const holes = [];
      try {
        const ks = getComputedStyle(el).getPropertyValue('--burst-keep').trim();
        if (ks) for (const nd of el.querySelectorAll(ks)) {
          const rk = nd.getBoundingClientRect();
          if (rk.width > 0 && rk.height > 0)
            holes.push({ x: rk.x / sc, y: rk.y / sc, w: rk.width / sc, h: rk.height / sc });
        }
      } catch (e) {}
      return { x: ox / sc, y: oy / sc, fr: fr / sc, fi: fi / sc, holes,
               bx: r.x / sc, by: r.y / sc, bw: r.width / sc, bh: r.height / sc };
    }, scene.btn);
    if (!geo) return { err: '호스트 없음: ' + scene.btn, errs };

    /* ⚑ 873 — 시드를 **여기서 다시 심는다.** 페이지 머리에서 한 번만 심으면 «같은 순번의 draw» 는
       같아도 버스트가 수열의 **어느 자리**에서 시작하는지가 러너 속도에 달린다(위 대기 900·700ms 는
       «시간» 이지 «프레임 수» 가 아니다 — 게임 루프·파티클·적 스폰이 그 사이에 draw 를 쓴다).
       재현: 무변경 트리를 **동시 4실행**으로 굴리면 C1 ×3.27~3.72 · A4 1.21~1.37 로 갈린다(조용히
       한 줄로 돌리면 다섯 번이 한 자리까지 같다 — 그래서 «가끔» 빨갛다). */
    await page.evaluate(({ sel, sd, rs, bn }) => {
      /* burn 은 **재시드보다 먼저** 쓴다 — 흉내 내는 것이 «트리거 전에 게임 루프가 난수를 k 번 더 썼다»
         이기 때문이다. 재시드가 있으면 그 소비가 수열 자리를 못 옮기고(값 동일), 없으면 옮긴다(값 갈림). */
      for (let i = 0; i < bn; i++) Math.random();
      if (rs) {
        let s = sd >>> 0;
        Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
          let t = Math.imul(s ^ (s >>> 15), 1 | s);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      }
      const el = document.querySelector(sel);
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    }, { sel: scene.btn, sd: seed, rs: reseed, bn: burn });
    await page.waitForTimeout(60);
    const env = await page.evaluate(SAMPLE, STOPS);
    if (!env || !env.rows) return { err: '알이 안 태어났다', errs, geo };
    const sum = summarize(env, geo);
    sum.geo = geo; sum.errs = errs;
    return sum;
  } finally { await b.close(); }
}

module.exports = { runScene, SCENES, STOPS, summarize, iou, SEED };
