#!/usr/bin/env node
/* 작업 681 — 공용 `.fx-spark` 봉투의 **연속 프레임 캡처**(지시서 [3]-(다): 정지 1장이 아니라 연속 프레임)
 *
 *   node tools/cap681.js [라운드]        기본 r1
 *   → docs/shots/681-<라운드>-<씬>-<n>.png   (캡처는 커밋 금지 — `docs/shots/` 는 .gitignore)
 *   → 정답표는 stdout (사람이 읽는 근거는 docs/review/681-*.md 로 옮겨 적는다)
 *
 * 씬 둘 — 이 곡선이 실제로 문제로 읽힌 자리와, 같은 곡선을 쓰는 다른 화면:
 *   A 훈련 카드 [강화] 버튼 (660 골드 아이콘 버스트 · 단발)
 *   B 89 유물 소환 버튼    (666 유물화폐 아이콘 버스트 — 등재문을 낸 그 화면)
 *
 * 방식은 `cap666.js` 그대로다(58 계열 «강제 합성 + 얼리기»):
 *   표본마다 페이지를 새로 열고 → 세팅 → **실제 사용자 경로**로 트리거 → 애니 `currentTime` 을
 *   목표 시각으로 **감고** → 페이지를 얼리고 → 찍는다.
 * ⚠ 시간은 «기다려서» 가 아니라 «감아서» 맞춘다 — 러너의 rAF 가 밀리면 정답표가 거짓이 된다(58 36회차).
 * ⚠ 난수는 **트리거 직전**에 다시 심는다 — 안 그러면 여덟 장이 서로 다른 버스트가 된다(666 5회차 · LESSONS 666-⑧).
 * ⚠ 표본 시각은 **봉투에 맞춘다**: 수명 380ms 안에서 탄생(0·20·45)·고원·꼬리(280·340)를 다 덮는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROUND = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/shots');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const STOPS = [0, 20, 45, 90, 150, 210, 280, 340];
const SEED = 20260902;

const SCENES = [
  { id: 'train', n: '23 훈련 카드 [강화] (660 골드 아이콘 버스트)',
    open: () => { openTrain(); },
    host: '#trCards [data-tr]', btn: '#trCards [data-tr] .cb' },
  { id: 'relic', n: '89 유물 소환 버튼 (666 유물화폐 아이콘 버스트)',
    open: () => { openRelw(); },
    host: '#rwBasin', btn: '#rwBasin' },
];

async function shot(sc, T, idx) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    const _st = window.setTimeout, _si = window.setInterval;
    const ids = { t: new Set(), i: new Set() };
    window.__capIds = ids;
    window.setTimeout = function (...a) { const id = _st.apply(window, a); ids.t.add(id); return id; };
    window.setInterval = function (...a) { const id = _si.apply(window, a); ids.i.add(id); return id; };
    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, SEED);
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await p.waitForTimeout(900);

  await p.evaluate((src) => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; S.relic = 250000;
    if (S.temper) S.temper.pts = 1e6;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
    /* 전투 캔버스는 매 프레임 달라 판단을 오염시킨다(cap491·cap619 와 같은 규칙) */
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    (new Function(src))();
  }, '(' + sc.open.toString() + ')()');
  await p.waitForTimeout(700);
  await p.waitForFunction(() => document.querySelectorAll('#fxl > *').length === 0, null, { timeout: 5000 }).catch(() => {});

  const info = await p.evaluate(async ({ T, sd, btnSel, hostSel }) => {
    let s = sd >>> 0;
    Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const el = document.querySelector(btnSel);
    const host = document.querySelector(hostSel) || el;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));    /* 단발 — 홀드 반복은 안 섞는다 */
    window.requestAnimationFrame = () => 0;
    try { const ids = window.__capIds; if (ids) { ids.t.forEach(clearTimeout); ids.i.forEach(clearInterval); } } catch (e) {}
    window.setTimeout = () => 0; window.setInterval = () => 0;
    let at = 0;
    try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = T; at = T; } catch (e) {} }); } catch (e) {}
    /* 정답표 — «보이는 노드» 만 센다(α>0.06 · 최소변 ≥6px — cap58b 41·42회차 규약) */
    const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
      return +cs.opacity > 0.06 && Math.min(bb.width, bb.height) >= 6; };
    const all = [...document.querySelectorAll('#fxl > *')];
    const L = all.filter(vis);
    const kind = n => { const c = (n.className || '') + '';
      return /fx-cic/.test(c) ? '아이콘' : /fx-rlic/.test(c) ? '유물알' : /fx-spark/.test(c) ? '구슬'
           : /fx-plus|fx-delta/.test(c) ? '글자' : /fx-flash/.test(c) ? '플래시' : /fx-toast/.test(c) ? '토스트' : '기타'; };
    const cnt = {}; L.forEach(n => { const k = kind(n); cnt[k] = (cnt[k] || 0) + 1; });
    const sp = L.filter(n => /fx-spark/.test((n.className || '') + '') && !/fx-rlic/.test((n.className || '') + ''));
    const bb = sp.map(n => n.getBoundingClientRect());
    const ops = sp.map(n => +getComputedStyle(n).opacity);
    const hb = host.getBoundingClientRect();
    const size = bb.length ? Math.round(bb.reduce((s2, x) => s2 + x.width, 0) / bb.length * 10) / 10 : 0;
    const spread = bb.length ? Math.round(Math.max(...bb.map(x => Math.hypot(
      x.x + x.width / 2 - (r.x + r.width / 2), x.y + x.height / 2 - (r.y + r.height / 2))))) : 0;
    const op = ops.length ? Math.round(ops.reduce((a, b2) => a + b2, 0) / ops.length * 100) / 100 : 0;
    const hidden = all.length - L.length;
    return { at: Math.round(at), cnt, spark: sp.length, hidden, size, spread, op,
             clip: { x: Math.round(hb.x), y: Math.round(hb.y), w: Math.round(hb.width), h: Math.round(hb.height) } };
  }, { T, sd: SEED, btnSel: sc.btn, hostSel: sc.host });

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '681-' + ROUND + '-' + sc.id + '-' + idx + '.png');
  const M = 160;                                    /* 여유 — 버스트는 호스트 «테두리 바깥» 에서도 산다 */
  const clip = info ? {
    x: Math.max(0, info.clip.x - M), y: Math.max(0, info.clip.y - M),
    width: Math.min(1080 - Math.max(0, info.clip.x - M), info.clip.w + 2 * M),
    height: Math.min(2280 - Math.max(0, info.clip.y - M), info.clip.h + 2 * M),
  } : null;
  await p.screenshot({ path: file, clip: clip || undefined });
  await b.close();
  return { T, file, info, errs: errs.length };
}

(async () => {
  const table = [];
  for (const sc of SCENES) {
    const rows = [];
    for (let i = 0; i < STOPS.length; i++) rows.push(await shot(sc, STOPS[i], i + 1));
    table.push({ sc, rows });
  }
  for (const { sc, rows } of table) {
    console.log('\n# 681 ' + ROUND + ' — 씬 ' + sc.id + ' · ' + sc.n + ' (트리거 = 0ms · 시드 ' + SEED + ')\n');
    console.log('| # | t(ms) | 파일 | 보이는 알 | 평균 크기(px) | 평균 α | 최대 반경 | 안 보이는 알 | 층 |');
    console.log('|---|---|---|---|---|---|---|---|---|');
    rows.forEach((r, i) => {
      const n = r.info || {};
      console.log('| ' + (i + 1) + ' | ' + r.T + ' | `' + path.basename(r.file) + '` | ' + (n.spark != null ? n.spark : '—')
        + ' | ' + (n.size || 0) + ' | ' + (n.op || 0) + ' | ' + (n.spread || 0) + ' | ' + (n.hidden != null ? n.hidden : '—')
        + ' | ' + Object.entries(n.cnt || {}).map(([k, v]) => k + ' ' + v).join(' · ') + ' |');
    });
  }
  console.log('\n(캡처는 커밋하지 않는다 — `docs/shots/` 는 .gitignore)');
})();
