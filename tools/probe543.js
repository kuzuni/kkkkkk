#!/usr/bin/env node
/* 작업 543 — 「재화 흡수 이펙트 알갱이 — 다이아 크기 기준 ×3」 **재현**
 * (338 규칙 — 처방 전에 먼저 제품에게 묻는다. 등재문의 ⓐ/ⓑ 갈림길은 실측으로만 고른다.)
 *
 *   node tools/probe543.js
 *
 * 등재문의 주장은 «HUD 는 다이아에 `scaleX(1.16)` 을 거는데 비행(.fx-fly)은 그 밖이라
 * 보정을 잃어 혼자 좁고 작다» 이다. 이 프로브는 그것을 **믿지 않고** 다음을 따로 잰다:
 *
 *   [A] 정적 — `FXCUR` 의 `ics`·`fs`, 비행 스케일 상수(FX3_FLYS/FX3_LAND), 개수·상한
 *              (FXFLY_MAX·FXMAX), 밀어내기 규격(FX3_BSPITCH·FX3_MIND), 그리고 CSS 보정 규칙이
 *              **지금 몇 자리 살아 있는가**(356 이 scaleX(1.16) 3자리를 폐기했다면 등재문은 낡았다).
 *   [B] 잉크 — 재화 7종의 **원본 알파 bbox·면적비**(자산이 viewBox 를 얼마나 채우는가)와,
 *              실제 `.fx-fly` 노드를 만들어 얻은 **렌더 상자**(transform 포함 = getBoundingClientRect).
 *              둘을 곱한 것이 «찍힌 잉크» 다. 비행 중 크기는 여기에 FX3_FLYS(0.70)가 더 곱해진다.
 *   [C] HUD  — 목적지 알약(.cGold/.cDia)의 같은 잣대. 비행/HUD 비가 재화마다 갈리는지.
 *   [D] 실경로 — 보상 수령 1회(골드+다이아)를 실제로 쏴서 프레임마다
 *              ① 동시 알갱이 수 ② 최근접 중심거리 ③ **모달 본문(#mbox)을 가리는 잉크 면적**
 *              ④ FXMAX·FXFLY_MAX 드롭 유무 를 잰다. 수리 후 대조의 기준선이다.
 *
 * 수리 전/후 **같은 명령**으로 돌려 대조한다(338·344 규칙).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };
const n2 = v => (v == null ? 'n/a' : (+v).toFixed(2));

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  console.log('\n=== [A] 정적 — 상수와 CSS 보정 자리 ===');
  const grab = re => { const m = src.match(re); return m ? m[1] : '?'; };
  const A = {
    FX3_FLYS: grab(/const FX3_FLYS = ([\d.]+)/),
    FX3_LAND: grab(/FX3_LAND = ([\d.]+)/),
    FXMAX: grab(/const FXMAX = (\d+)/),
    FXFLY_MAX: grab(/const FXFLY_MAX\s+= (\d+)/),
    FXFLY_MAX_C: grab(/const FXFLY_MAX_C = (\d+)/),
    FX3_BSPITCH: grab(/const FX3_BSPITCH = (\d+)/),
    FX3_MIND: grab(/const FX3_MIND = (\d+)/),
  };
  Object.keys(A).forEach(k => console.log('  ' + k.padEnd(12) + ' = ' + A[k]));
  const flyGoldRule = /\.fx-fly>\.cic\[data-cur-ic="gold"\]\{transform:scale\(([\d.]+)\)\}/.exec(src);
  const scaleX116 = src.split('\n').map((l, i) => ({ n: i + 1, l }))
    .filter(o => /scaleX\(1\.16\)/.test(o.l) && !/^\s*[*/·]/.test(o.l.trim()) && !/^\s*\*/.test(o.l));
  console.log('  .fx-fly 골드 보정 : ' + (flyGoldRule ? 'scale(' + flyGoldRule[1] + ')' : '없음'));
  console.log('  살아 있는 scaleX(1.16) 선언 자리: '
    + (scaleX116.length ? scaleX116.map(o => o.n + ': ' + o.l.trim().slice(0, 70)).join(' | ') : '**0자리**'));
  ok(true, '[A] 상수·규칙 수집');

  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxFly === 'function' && typeof FXCUR !== 'undefined');
  await p.waitForTimeout(1200);

  /* ── [B]·[C] 잉크 ─────────────────────────────────────────────── */
  const ink = await p.evaluate(async () => {
    const TH = 8;
    const bboxOf = (g, w, h) => {
      const d = g.getImageData(0, 0, w, h).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, area = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > TH) {
          area++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area };
    };
    const load = src => new Promise(res => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
    });
    const N = 256;
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const g = cv.getContext('2d', { willReadFrequently: true });

    const out = { src: {}, fly: {}, hud: {} };
    for (const k in FXCUR) {
      const im = await load(CUR_ICON[FXCUR[k].cur] || CUR_ICON[k]);
      if (!im) { out.src[k] = null; continue; }
      g.clearRect(0, 0, N, N);
      g.drawImage(im, 0, 0, N, N);
      const bb = bboxOf(g, N, N);
      out.src[k] = bb ? { fw: bb.w / N, fh: bb.h / N, fa: bb.area / (N * N) } : null;
    }
    /* 실제 비행 노드를 fxFly 와 **같은 방법**으로 만든다(인라인 width/height + fontSize) */
    const L = document.getElementById('fxl') || document.body;
    for (const k in FXCUR) {
      const C = FXCUR[k];
      const el = document.createElement('b');
      el.className = 'fx-fly';
      el.innerHTML = curIc(C.cur, C.ics);
      el.style.fontSize = C.fs + 'px';
      el.style.transform = 'translate(400px,900px) translate(-50%,-50%)';
      L.appendChild(el);
      const img = el.querySelector('.cic');
      const r = img.getBoundingClientRect();
      out.fly[k] = { w: r.width, h: r.height, tf: getComputedStyle(img).transform };
      el.remove();
    }
    /* HUD 알약 */
    [['gold', '.cGold'], ['dia', '.cDia']].forEach(([k, sel]) => {
      const im = document.querySelector('#top .curs ' + sel + ' i>.cic');
      if (!im) { out.hud[k] = null; return; }
      const r = im.getBoundingClientRect();
      out.hud[k] = { w: r.width, h: r.height };
    });
    return out;
  });

  const FLYS = parseFloat(A.FX3_FLYS) || 0.7;
  console.log('\n=== [B] 잉크 — 자산 채움비 × 렌더 상자 (비행 중 = × FX3_FLYS ' + FLYS + ') ===');
  console.log('  재화     자산채움 w/h/면적   렌더상자      찍힌잉크 w×h    비행중 w×h   비행중 잉크면적');
  const visual = {};
  for (const k of Object.keys(ink.fly)) {
    const s = ink.src[k], f = ink.fly[k];
    if (!s || !f) { console.log('  ' + k.padEnd(8) + ' (자산 없음)'); continue; }
    const iw = s.fw * f.w, ih = s.fh * f.h;
    const ar = s.fa * f.w * f.h;
    visual[k] = { iw, ih, ar, boxW: f.w, boxH: f.h };
    console.log('  ' + k.padEnd(8)
      + ' ' + s.fw.toFixed(3) + '/' + s.fh.toFixed(3) + '/' + s.fa.toFixed(3)
      + '   ' + n2(f.w) + '×' + n2(f.h)
      + '   ' + n2(iw) + '×' + n2(ih)
      + '   ' + n2(iw * FLYS) + '×' + n2(ih * FLYS)
      + '   ' + Math.round(ar * FLYS * FLYS) + 'px²');
  }
  const G = visual.gold, D = visual.dia;
  if (G && D) {
    console.log('  ⇒ 골드↔다이아 «찍힌 잉크» 비 — 폭 ' + (D.iw / G.iw).toFixed(3)
      + ' · 높이 ' + (D.ih / G.ih).toFixed(3) + ' · **면적 ' + (D.ar / G.ar).toFixed(3) + '**');
    ok(true, '[B] 다이아/골드 잉크 면적비 = ' + (D.ar / G.ar).toFixed(3));
  }
  console.log('\n=== [C] HUD 알약 대비 ===');
  ['gold', 'dia'].forEach(k => {
    const h = ink.hud[k], s = ink.src[k], f = ink.fly[k];
    if (!h || !s || !f) return;
    console.log('  ' + k.padEnd(6) + ' HUD 상자 ' + n2(h.w) + '×' + n2(h.h)
      + ' · HUD 잉크 ' + n2(s.fw * h.w) + '×' + n2(s.fh * h.h)
      + ' · 비행상자/HUD상자 ' + (f.w / h.w).toFixed(3));
  });
  if (ink.hud.gold && ink.hud.dia) {
    const rh = (ink.src.dia.fa * ink.hud.dia.w * ink.hud.dia.h) / (ink.src.gold.fa * ink.hud.gold.w * ink.hud.gold.h);
    console.log('  ⇒ HUD 에서의 다이아/골드 잉크 면적비 = ' + rh.toFixed(3)
      + '  (비행에서는 ' + (D.ar / G.ar).toFixed(3) + ')');
    ok(Math.abs(rh - D.ar / G.ar) < 0.02,
      '[C] «비행만 비가 갈린다» 가설 — 두 비가 같으면 등재문 기각',
      'HUD ' + rh.toFixed(3) + ' vs 비행 ' + (D.ar / G.ar).toFixed(3));
  }

  /* ── [D] 실경로 ───────────────────────────────────────────────── */
  const scene = async (label, openQuest) => await p.evaluate(async ({ openQuest }) => {
    const raf = () => new Promise(res => requestAnimationFrame(() => res()));
    window.step = () => {};                       /* 배경 전투 골드가 섞이지 않게(probe512 교훈) */
    /* 씬 B — 22 퀘스트 팝업을 열고 «모두 받기» 자리에서 쏜다(밴드 경로가 켜지는 유일한 자리) */
    let panel = null;
    if (openQuest) {
      const ib = document.querySelector('.side .ibtn[data-pop="quest"]');
      if (ib) ib.click();
      for (let i = 0; i < 40; i++) await raf();
      panel = document.querySelector('#q22') || document.querySelector('.mbody');
    } else {
      if (typeof closeModal === 'function') try { closeModal(); } catch (_) {}
      for (let i = 0; i < 20; i++) await raf();
    }
    const btn = document.querySelector('.qs-all');
    const br = btn ? btn.getBoundingClientRect() : null;
    await raf(); await raf();
    const from = br ? { x: br.x + br.width / 2, y: br.y + br.height / 2 } : { x: 540, y: 1500 };
    const before = { fxl: (document.getElementById('fxl') || {}).childElementCount || 0 };
    const dropped = [];
    const of = window.fxFly;
    let calls = 0;
    window.fxFly = function (f, cur, n) { calls++; return of.apply(this, arguments); };
    fxFly(from, 'gold', 50000);
    fxFly(from, 'dia', 500);
    const frames = [];
    const mb = panel || document.getElementById('mbox');
    const mr = mb ? mb.getBoundingClientRect() : null;
    for (let i = 0; i < 130; i++) {
      const L = document.getElementById('fxl');
      /* ⚠ 스폰 직후의 노드는 `opacity:0` 으로 **출발점에 포개져** 있다(41회차 `f.pend`).
         그것까지 세면 최근접 거리가 0 으로 나와 «겹친다» 는 거짓 신호가 된다 — 보이는 것만 센다. */
      const els = L ? [...L.querySelectorAll('.fx-fly')].filter(e => (+e.style.opacity || 0) > 0.05) : [];
      if (els.length) {
        const cs = els.map(e => {
          const im = e.querySelector('.cic'); const r = (im || e).getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height,
                   cur: im ? im.dataset.curIc : '?' };
        });
        /* ⚠ 최근접은 **주행 중인 것끼리만** 잰다 — 도착한 알갱이는 전부 같은 알약 좌표로 모이므로
           끼워 넣으면 최근접이 늘 0 이 된다(«겹친다» 가 아니라 «꽂혔다» 다). y>300 = 알약 밖. */
        const en = cs.filter(c => c.y > 300);
        let mind = 1e9;
        for (let a = 0; a < en.length; a++) for (let bq = a + 1; bq < en.length; bq++)
          mind = Math.min(mind, Math.hypot(en[a].x - en[bq].x, en[a].y - en[bq].y));
        if (en.length < 2) mind = null;
        let cover = 0;
        if (mr) for (const c of cs) {
          const ox = Math.max(0, Math.min(c.x + c.w / 2, mr.right) - Math.max(c.x - c.w / 2, mr.left));
          const oy = Math.max(0, Math.min(c.y + c.h / 2, mr.bottom) - Math.max(c.y - c.h / 2, mr.top));
          cover += ox * oy;
        }
        frames.push({ i, n: els.length, dom: L.childElementCount, mind,
                      cover, w: cs[0].w, h: cs[0].h });
      }
      await raf();
    }
    window.fxFly = of;
    return { calls, frames, from, panel: mr ? { w: mr.width, h: mr.height, on: mr.width > 10 } : null };
  }, { openQuest });

  for (const [label, openQuest] of [['D1 부채꼴(팝업 없음)', false], ['D2 밴드(22 퀘스트 팝업)', true]]) {
    const run = await scene(label, openQuest);
    console.log('\n=== [' + label + '] 보상 1회(골드 50000 + 다이아 500) ===');
    const fr = run.frames;
    if (!fr.length) { ok(false, '[' + label + '] 알갱이가 한 프레임도 안 잡혔다'); continue; }
    const maxN = Math.max(...fr.map(f => f.n));
    const maxDom = Math.max(...fr.map(f => f.dom));
    /* ⚠ 최근접은 «퍼짐이 끝난 뒤» 만 본다 — 스폰 직후는 전부 출발점에 포개져 있는 것이 정상이다. */
    const minds = fr.filter(f => f.i >= 30).map(f => f.mind).filter(v => v != null);
    const minMind = minds.length ? Math.min(...minds) : null;
    const maxCover = Math.max(...fr.map(f => f.cover));
    const mid = fr[Math.floor(fr.length * 0.6)] || fr[fr.length - 1];
    console.log('  발원 (' + n2(run.from.x) + ',' + n2(run.from.y) + ') · fxFly ' + run.calls + '회'
      + ' · 동시 알갱이 최대 **' + maxN + '개** · #fxl DOM 최대 ' + maxDom + '/' + A.FXMAX);
    console.log('  알갱이 렌더 상자(주행 중) ' + n2(mid.w) + '×' + n2(mid.h));
    console.log('  퍼짐 뒤 최근접 중심거리 = ' + (minMind == null ? 'n/a' : n2(minMind))
      + '  (규격 FX3_MIND ' + A.FX3_MIND + ' · 밴드 피치 ' + A.FX3_BSPITCH + ')');
    console.log('  패널 본문(' + (run.panel && run.panel.on ? n2(run.panel.w) + '×' + n2(run.panel.h) : '닫힘')
      + ') 가림 상자 면적 최대 = ' + Math.round(maxCover) + 'px²');
    ok(maxN > 0, '[' + label + '] 알갱이 스폰', maxN + '개');
    ok(maxDom <= +A.FXMAX, '[' + label + '] FXMAX 드롭 없음', maxDom + ' ≤ ' + A.FXMAX);
    ok(maxN <= +A.FXFLY_MAX, '[' + label + '] FXFLY_MAX 준수', maxN + ' ≤ ' + A.FXFLY_MAX);
  }
  ok(errs.length === 0, '[E] 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await b.close();
  console.log('\n' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
