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
/* ⚑ 4회차 — 표본 시각을 **봉투에 다시 맞췄다.** 3회차 비평 CK 가 «68ms 램프가 화면에 없다» 고 적었는데
   그것은 제품이 아니라 이 표의 문제였다(0·20·45 → 90 사이에 봉우리 68ms 이 안 찍혔다 — 비평가는
   «봉우리가 90ms» 로 읽을 수밖에 없다). 봉우리와 그 직후를 넣고, 마지막 40ms 도 한 장 넣는다. */
const STOPS = [0, 20, 45, 70, 110, 175, 250, 320];
const SEED = 20260902;

const SCENES = [
  { id: 'train', n: '23 훈련 카드 [강화] (660 골드 아이콘 버스트)',
    open: () => { openTrain(); },
    host: '#trCards [data-tr]', btn: '#trCards [data-tr] .cb' },
  { id: 'relic', n: '89 유물 소환 버튼 (666 유물화폐 아이콘 버스트)',
    open: () => { openRelw(); },
    host: '#rwBasin', btn: '#rwBasin' },
];

/* ⚑⚑ 817 — 클립 규칙 **한 곳**. `verify817` 이 이 함수를 그대로 require 해서 잰다 —
   자와 하네스가 규칙의 **사본을 따로 적지 않게** 하기 위해서다(402 «사본을 지운다»).
     clip = (호스트 상자 ∪ 이번 버스트의 궤적 합집합) + 알 한 개 폭, 프레임 안으로 클램프.
   `reach` 가 없으면(버스트가 안 났으면) 호스트 상자만 남는다. */
function clipFor(base, reach) {
  if (!base) return null;
  const pad = reach ? reach.pad : 0;               /* 여유 = 알 한 개 폭(제품이 낸 값) */
  const x0 = Math.min(base.x, reach ? reach.x : base.x) - pad;
  const y0 = Math.min(base.y, reach ? reach.y : base.y) - pad;
  const x1 = Math.max(base.x + base.w, reach ? reach.x + reach.w : -Infinity) + pad;
  const y1 = Math.max(base.y + base.h, reach ? reach.y + reach.h : -Infinity) + pad;
  const cx = Math.max(0, Math.round(x0)), cy = Math.max(0, Math.round(y0));
  return { x: cx, y: cy,
           width: Math.min(1080 - cx, Math.round(x1) - cx),
           height: Math.min(2280 - cy, Math.round(y1) - cy) };
}

async function shot(sc, T, idx, fixed) {
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

  /* 트리거 **전** 호스트 상자 — 클립 고정의 기준(위 머리말) */
  const pre = await p.evaluate((hostSel) => { const h = document.querySelector(hostSel);
    if (!h) return null; const r = h.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }, sc.host);

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
    /* ⚑ 681 8회차 — 여기는 **벽시계**가 맞고, 그래서 한 줄도 안 고쳤다. 알마다 음(−) 지연이
       걸리지만 `currentTime` 은 지연을 **포함한** 시간이라 «스폰 후 T ms» 가 곧 `currentTime = T` 다
       (봉투 위상은 `currentTime − delay` 로 알마다 갈리고, 그것이 화면에 보여야 할 그림이다).
       ⚠ 8회차에 이 자리를 «T − delay» 로 «고쳤다가» B1·B4·B11·B12 를 한꺼번에 빨갛게 만들었다 —
         지연을 두 번 센 것이다. 위상을 맞춰 재는 자(`envelope681` 의 `SAMPLE`)가 그 반대편이다. */
    try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = T; at = T; } catch (e) {} }); } catch (e) {}
    /* 정답표 — «보이는 노드» 만 센다(α>0.06 · 최소변 ≥6px — cap58b 41·42회차 규약) */
    const fopV = n => { const m = /opacity\(([\d.]+)\)/.exec(getComputedStyle(n).filter || '');
      return m ? parseFloat(m[1]) : 1; };
    const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
      return +cs.opacity * fopV(n) > 0.06 && Math.min(bb.width, bb.height) >= 6; };
    const all = [...document.querySelectorAll('#fxl > *')];
    const L = all.filter(vis);
    const kind = n => { const c = (n.className || '') + '';
      return /fx-cic/.test(c) ? '아이콘' : /fx-rlic/.test(c) ? '유물알' : /fx-spark/.test(c) ? '구슬'
           : /fx-plus|fx-delta/.test(c) ? '글자' : /fx-flash/.test(c) ? '플래시' : /fx-toast/.test(c) ? '토스트' : '기타'; };
    const cnt = {}; L.forEach(n => { const k = kind(n); cnt[k] = (cnt[k] || 0) + 1; });
    const sp = L.filter(n => /fx-spark/.test((n.className || '') + '') && !/fx-rlic/.test((n.className || '') + ''));
    const bb = sp.map(n => n.getBoundingClientRect());
    /* ⚑ 9회차 — **α 는 `opacity` 하나가 아니다.** 알마다 다른 «생명 시계» 는 곱해지는 둘째 채널
       (`filter:opacity()`)로 들어오므로, 정답표가 `opacity` 만 적으면 비평가가 보는 화면과
       표가 갈린다(«자가 만든 유령» — 표는 «전부 0.74» 인데 눈에는 밝은 알과 흐린 알이 섞여 있다). */
    const fop = n => { const m = /opacity\(([\d.]+)\)/.exec(getComputedStyle(n).filter || '');
      return m ? parseFloat(m[1]) : 1; };
    const ops = sp.map(n => +getComputedStyle(n).opacity * fop(n));
    const hb = host.getBoundingClientRect();
    const size = bb.length ? Math.round(bb.reduce((s2, x) => s2 + x.width, 0) / bb.length * 10) / 10 : 0;
    const spread = bb.length ? Math.round(Math.max(...bb.map(x => Math.hypot(
      x.x + x.width / 2 - (r.x + r.width / 2), x.y + x.height / 2 - (r.y + r.height / 2))))) : 0;
    const op = ops.length ? Math.round(ops.reduce((a, b2) => a + b2, 0) / ops.length * 100) / 100 : 0;
    const hidden = all.length - L.length;
    /* ⚑⚑ 817 — **클립 여유를 손 상수에서 빼고 제품에게 묻는다**(368 «자리를 상수에서 빼고
       제품에게 묻는다» 의 클립판). 여기서 돌려주는 `reach` 는 이번 버스트의 **궤적 합집합**이다 —
       알마다 시작 상자(`left/top` ± sz/2)와 끝 상자(`+--dx/--dy` ± sz/2)를 합친다.
       ⚠ 이 값은 **`currentTime` 과 무관**하다(궤적은 스폰 때 인라인으로 박히고 봉투는 그 사이를
         보간할 뿐이다 — `@keyframes fxSpark` 의 어느 지점도 `--dx/--dy` 를 넘지 않는다).
         그래서 여덟 장이 **같은 상자**를 낸다 = 5회차의 «클립 고정» 규약이 그대로 지켜진다.
       ⚠ 획득 알(`fx-rlic` · 683/753)도 같이 담는다 — 비평가가 보는 것은 «한 화면» 이다. */
    const reach = (() => {
      const num = v => { const n2 = parseFloat(v); return Number.isFinite(n2) ? n2 : null; };
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, mx = 0;
      for (const n of all) {
        const bb2 = n.getBoundingClientRect();
        const sx = num(n.style.left), sy = num(n.style.top);
        const dx = num(n.style.getPropertyValue('--dx')) || 0;
        const dy = num(n.style.getPropertyValue('--dy')) || 0;
        /* 인라인 궤적이 없는 층(플래시·토스트)은 지금 상자 그대로 담는다 */
        if (sx === null || sy === null) {
          if (bb2.width && bb2.height) { x0 = Math.min(x0, bb2.left); y0 = Math.min(y0, bb2.top);
            x1 = Math.max(x1, bb2.right); y1 = Math.max(y1, bb2.bottom); }
          continue;
        }
        /* 인라인 좌표는 프레임 px 라 화면 px 로 되돌린다(`fxRect` 의 역변환 — 자를 새로 안 만든다) */
        const f2 = (typeof fxSc === 'function') ? fxSc() : null;
        const s2 = f2 ? f2.s : 1, ox = f2 ? f2.x : 0, oy = f2 ? f2.y : 0;
        const half = (bb2.width || 26) / 2;
        mx = Math.max(mx, bb2.width || 26);
        for (const q of [[sx, sy], [sx + dx, sy + dy]]) {
          const cx2 = ox + q[0] * s2, cy2 = oy + q[1] * s2;
          x0 = Math.min(x0, cx2 - half); y0 = Math.min(y0, cy2 - half);
          x1 = Math.max(x1, cx2 + half); y1 = Math.max(y1, cy2 + half);
        }
      }
      if (!Number.isFinite(x0)) return null;
      return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0),
               pad: Math.round(mx) };
    })();
    return { at: Math.round(at), cnt, spark: sp.length, hidden, size, spread, op, reach,
             clip: { x: Math.round(hb.x), y: Math.round(hb.y), w: Math.round(hb.width), h: Math.round(hb.height) } };
  }, { T, sd: SEED, btnSel: sc.btn, hostSel: sc.host });

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '681-' + ROUND + '-' + sc.id + '-' + idx + '.png');
  /* ⚑⚑ 5회차 비평 CN 이 **자를 잡았다** — 「캡처 캔버스 폭이 프레임마다 ±5.2% 흔들린다」
     (relic 690/710/726/733/735/720/720/720 · train 626/641/653/658/658/646/646/646).
     뿌리는 클립을 **트리거 뒤** 호스트 bbox 에서 뽑은 것이다: 621 의 눌림 애니가 호스트를
     프레임마다 다른 크기로 만들고, 그 위에 이 클립이 얹힌다. 그러면 비평가는 **배율이 다른 여덟 장**을
     비교하게 되고 «−5.6% 크기 변화» 같은 것은 그 격자에서 **애초에 판독 불가**가 된다(CN ④-c).
     ⇒ 클립은 **트리거 전에 한 번** 잰 상자로 고정한다(58 36회차 «하네스가 시각을 흐리면 정답표가
     거짓» 의 공간판). ⚠ 정답표의 수치는 원래 스크린 좌표에서 재므로 이 변경에 안 흔들린다. */
  /* ⚑⚑ 817 — **클립이 버스트를 잘랐다. 잘린 것은 화면이 아니라 캡처였다.**
     8회차 비평 셋(CF «5번(150ms)부터 8번까지 상단 y=0 에 잘린다 · 10개 중 약 2개» ·
     CK «검출 f4 12 → f6 10 → f7 8 → f8 0» · CN «11 → 9 → 8»)이 **씬 B 상단 이탈**로 읽고
     817 로 등재됐던 그림의 출처가 여기다 — 그 «y=0» 은 프레임의 위끝이 아니라 **이 크롭의 위끝**이다.
     재현(`probe817`)이 갈랐다: 지원 프레임 5종(1600·1780·1920·2280·2600) × 알 120개에서
     **프레임 밖 0건**이고, 같은 표본이 종전 크롭(M=160)에서는 **3알이 상변 밖**이다.
     뿌리는 손 상수다 — 유물 버스트의 실제 상향 도달은 **약 342px**(반경 22×지터 1.18 + 산포 150 ×
     `RW_FX_FLY` 2.0 + 알 반지름)인데 M 은 그 절반도 안 되는 160 이었다. 씬 A(훈련)가 0건이던 것은
     프레임 덕이 아니라 **619 28회차의 bbox 가둠**이 알을 카드 안에 묶어 160 이 넉넉했기 때문이다.
     ⇒ **여유를 손으로 적지 않고 제품에게 묻는다**(368 «자리를 상수에서 빼고 제품에게 묻는다»):
       클립 = 호스트 상자 ∪ **이번 버스트의 궤적 합집합**(`info.reach`) + 알 한 개 폭.
       `RW_FX_FLY`·산포·크기가 바뀌면 클립이 저절로 따라오고, **새 손 상수는 0개**다.
     ⚠ **5회차의 «클립 고정» 규약은 그대로다** — `reach` 는 인라인 궤적에서 나와 `currentTime` 과
       무관하고, 시드가 같아 여덟 장이 같은 상자를 낸다. 그 위에 첫 장의 클립을 **뒤 장에 물려**
       구조적으로도 못 흔들리게 한다(`fixed`). 621 눌림 애니가 호스트를 흔들던 그 사고의 재발 방지. */
  const base = pre || (info && info.clip);
  const clip = fixed || (base ? clipFor(base, info && info.reach) : null);
  await p.screenshot({ path: file, clip: clip || undefined });
  await b.close();
  return { T, file, info, clip, errs: errs.length };
}

module.exports = { clipFor, SCENES, STOPS, SEED };

if (require.main !== module) return;

(async () => {
  const table = [];
  for (const sc of SCENES) {
    const rows = [];
    /* 817 — 첫 장이 낸 클립을 나머지 일곱 장에 **물린다**(위 클립 머리말 · 5회차 «클립 고정») */
    let fixed = null;
    for (let i = 0; i < STOPS.length; i++) {
      const r = await shot(sc, STOPS[i], i + 1, fixed);
      if (!fixed && r.clip) fixed = r.clip;
      rows.push(r);
    }
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
