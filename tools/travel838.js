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
    return { maxD, net, pth, r0, rE, over, pts, body: maxD > 0 ? net / maxD : 0, ious, iouMax: Math.max(...ious) };
  });
  const pairIoU = per[0].ious.map((_, k) => mean(per.map(p => p.ious[k])));
  return {
    n: per.length, per, dur: env.dur,
    body: mean(per.map(p => p.body)),
    bodyMin: Math.min(...per.map(p => p.body)),
    net: mean(per.map(p => p.net)),
    maxD: mean(per.map(p => p.maxD)),
    r0: mean(per.map(p => p.r0)),
    rE: mean(per.map(p => p.rE)),
    growth: mean(per.map(p => p.rE)) / Math.max(1e-9, mean(per.map(p => p.r0))),
    pairIoU, iouPeak: Math.max(...pairIoU),
    spill: Math.max(...per.map(p => p.over)),      /* 호스트 상자 밖으로 나간 잉크(px · 음수면 안쪽) */
  };
}

/* 한 씬을 **실제 사용자 경로**로 굴려 표본을 낸다. `src` 로 되돌림 사본(index.html)을 줄 수 있다. */
async function runScene(scene, src) {
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
    }, SEED);
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

    /* 발원 중심·호스트 상자는 **트리거 전**에 잡는다(621 눌림이 프레임마다 호스트를 키운다 — LESSONS 681-⑥) */
    const geo = await page.evaluate((sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      const r = el.getBoundingClientRect();
      const a = document.getElementById('app'), ar = a ? a.getBoundingClientRect() : null;
      const sc = ar ? (ar.width / (a.offsetWidth || ar.width)) || 1 : 1;
      return { x: (r.x + r.width / 2) / sc, y: (r.y + r.height / 2) / sc,
               bx: r.x / sc, by: r.y / sc, bw: r.width / sc, bh: r.height / sc };
    }, scene.btn);
    if (!geo) return { err: '호스트 없음: ' + scene.btn, errs };

    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    }, scene.btn);
    await page.waitForTimeout(60);
    const env = await page.evaluate(SAMPLE, STOPS);
    if (!env || !env.rows) return { err: '알이 안 태어났다', errs, geo };
    const sum = summarize(env, geo);
    sum.geo = geo; sum.errs = errs;
    return sum;
  } finally { await b.close(); }
}

module.exports = { runScene, SCENES, STOPS, summarize, iou, SEED };
