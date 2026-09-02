/* 작업 711 재현기 — «50 코스튬 강화 델타가 카드 아래로 새는 그 자리가 실재 겹침인가, 사양인가»

   등재문(694 §7 곁다리): 코스튬 카드 168×171 인데 델타 **중심**이 카드기준 dy 129 → 209 라
   여정의 끝 38px 이 카드 밖이다. 훈련 카드에서는 58 이 24·27·30회차를 들여 여정을 카드 안
   «아이콘 없는 띠»(y275~396)에 가뒀는데 코스튬 카드에는 그 띠가 없다.

   ⚠ 338 규칙 — 처방 전에 제품에게 묻는다. 등재문이 가르는 질문을 스스로 적어 뒀다:
     ⓐ 그 자리에 **아래 행 카드의 글자가 실제로 있는가**(격자 pitch·gap 실측)
     ⓑ 있으면 겹침의 넓이·시간·비율은 얼마인가 — 없으면 **사양**이고 이 행은 닫는다.
   등재문이 안 물은 것 둘을 같이 묻는다(안 물으면 «아래 칸이 없는 자리» 를 못 본다):
     ⓒ **마지막 행**(아래 칸이 없다) — 델타가 격자·패널·탭바 밖으로 나가는가
     ⓓ **9:13.3(1600)** 짧은 프레임에서도 같은 값인가

   ⚑ 잉크를 두 방법으로 잰다 — 상자(Range 잉크 상자)와 **화소**(글리프 차분 마스크 · 795·788 방법).
     상자만 재면 «line-box 는 닿는데 글리프는 안 닿는다» 를 결함으로 읽고, 화소만 재면
     스트로크·글로우가 만든 옅은 변화를 «글자를 덮었다» 로 읽는다. 둘을 같이 적는다.
   ⚠ 애니는 `getAnimations()` 로 **정지**시켜 진행도를 직접 준다. `fxBye` 는 실시간 660ms 에
     노드를 지우므로(스크린샷 한 장이 그보다 오래 걸린다) 재현 동안만 무력화한다 —
     안 하면 «두 번째 프레임부터 화소 변화 0» 이라는 **가짜 초록**이 나온다.

   실행: node tools/probe711.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const r0 = (n) => (n === null || n === undefined ? '—' : Math.round(n * 10) / 10);
const DUR = 620;   /* `.fx-delta{animation-duration:.62s}` */

async function open(h) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    if (typeof window.step === 'function') window.step = () => {};
    S.gold = 1e12; S.dia = 1e12; S.stone = 1e12;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.avatars = S.avatars || {};
    for (const a of AVATARS) S.avatars[a.id] = 1;      /* 전 코스튬 보유 — «아래 행» 이 있어야 물을 수 있다 */
    S.avatar = AVATARS[0].id;
    goTab('hero'); heroSubGo('cos');
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    window.__fxBye0 = window.fxBye; window.fxBye = () => {};   /* 재현 동안만 — 위 머리말 */
  });
  await p.waitForTimeout(400);
  return { b, p, errs };
}

const RECT = `(el)=>{const r=el.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom,r:r.right};}`;

/* 한 카드 안의 «글자» 잉크 상자 — Range 로만 잰다(상자가 아니라 글줄) */
const INKS = `(el)=>{const out=[];const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let t;
  while((t=w.nextNode())){ if(!t.nodeValue.trim()) continue;
    const g=document.createRange(); g.selectNodeContents(t); const r=g.getBoundingClientRect();
    if(r.width>0&&r.height>0) out.push({txt:t.nodeValue.trim().slice(0,14),x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom});}
  return out;}`;

/* n 번째 카드를 고르고 그 카드·아래 칸·아래 칸 글자 상자를 걷는다 */
async function pick(p, idx) {
  return await p.evaluate(({ i, RECT, INKS }) => {
    const R = eval(RECT);
    const all = [...document.querySelectorAll('#bCos [data-cosit]')];
    const el = all[i < 0 ? all.length + i : i];
    el.scrollIntoView({ block: 'center' });
    el.click();
    return new Promise((res) => setTimeout(() => {
      const sel = document.querySelector('#bCos .sk-card.sel') || el;
      const selR = R(sel);
      const cards = all.map(R);
      const below = cards.find((c) => Math.abs(c.x - selR.x) < 4 && c.y > selR.y + 4) || null;
      const inks = [];
      if (below) {
        const bel = all.find((q) => { const r = q.getBoundingClientRect(); return Math.abs(r.left - below.x) < 4 && Math.abs(r.top - below.y) < 4; });
        const walk = document.createTreeWalker(bel, NodeFilter.SHOW_TEXT);
        let t;
        while ((t = walk.nextNode())) {
          if (!t.nodeValue.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(t);
          const r = rg.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) inks.push({ txt: t.nodeValue.trim().slice(0, 14), x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom });
        }
      }
      const grid = document.querySelector('#bCos .sk-grid') || document.querySelector('#bCos [data-cosit]').parentElement;
      const sheet = document.querySelector('#bCos') ;
      const tabbar = document.querySelector('#tabbar');
      const selInks = eval(INKS)(sel);
      res({ sel: selR, below, inks, selInks, idx: all.indexOf(el), n: all.length,
        grid: R(grid), sheet: R(sheet), tabbar: tabbar ? R(tabbar) : null,
        vh: innerHeight });
    }, 260));
  }, { i: idx, RECT, INKS });
}

/* 델타 한 장을 띄우고 진행도별 상자를 걷는다(호스트: 격자 카드 or 팝업 아이콘) */
async function journey(p, where) {
  return await p.evaluate(({ w, RECT, DUR }) => {
    const R = eval(RECT);
    const host = w === 'popup'
      ? document.querySelector('#mbox .sk-ic')
      : (document.querySelector('#bCos .sk-card.sel') || document.querySelector('#bCos [data-cosit]'));
    if (!host) return { made: false };
    const hostR = R(host);
    for (const el of document.querySelectorAll('.fx-delta')) el.remove();
    fxDelta(host, 'Lv. 2');
    const d = document.querySelector('.fx-delta');
    if (!d) return { made: false, hostR };
    const anims = d.getAnimations();
    anims.forEach((a) => a.pause());
    const frames = [];
    for (let i = 0; i <= 20; i++) {
      const t = (DUR * i) / 20;
      anims.forEach((a) => { try { a.currentTime = t; } catch (_) {} });
      const box = R(d);
      const rg = document.createRange(); rg.selectNodeContents(d);
      const k = rg.getBoundingClientRect();
      frames.push({ t, box, ink: { x: k.left, y: k.top, w: k.width, h: k.height, b: k.bottom, r: k.right },
        op: parseFloat(getComputedStyle(d).opacity) });
    }
    return { made: true, hostR, frames, fs: getComputedStyle(d).fontSize,
      stroke: getComputedStyle(d).webkitTextStrokeWidth, shadow: getComputedStyle(d).textShadow };
  }, { w: where, RECT, DUR });
}

/* 진행도 t 에서 델타를 «보임/숨김» 두 장으로 찍어 아래 칸 화소를 차분한다 */
async function pixdiff(p, box, t, rows) {
  const set = async (vis) => await p.evaluate(({ v, t }) => {
    for (const d of document.querySelectorAll('.fx-delta')) {
      d.style.visibility = v ? 'visible' : 'hidden';
      d.getAnimations().forEach((a) => { a.pause(); try { a.currentTime = t; } catch (_) {} });
    }
  }, { v: vis, t });
  await set(false);
  const a = (await p.screenshot()).toString('base64');
  await set(true);
  const c = (await p.screenshot()).toString('base64');
  return await p.evaluate(async ({ a, c, box, rows }) => {
    const load = (u) => new Promise((res, no) => { const i = new Image(); i.onload = () => res(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
    const px = async (u, bx) => {
      const im = await load(u); const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
      return g.getImageData(bx.x, bx.y, bx.w, bx.h).data;
    };
    const cnt = async (bx) => {
      const A = await px(a, bx), C = await px(c, bx);
      let n = 0;
      for (let i = 0; i < A.length; i += 4) {
        const df = Math.max(Math.abs(A[i] - C[i]), Math.abs(A[i + 1] - C[i + 1]), Math.abs(A[i + 2] - C[i + 2]));
        if (df > 8) n++;
      }
      return { n, px: A.length / 4 };
    };
    /* ⚠ 마스크를 «어두운 12%» 로 잡으면 안 된다 — 이 카드의 라벨은 **흰 글자**(`.sk-clv{color:#fff}`)라
       그 마스크에 안 들어가고, 덮여도 0 이 나온다. 물을 자리는 **글줄 상자** 자체다. */
    const whole = await cnt(box);
    let rn = 0, rp = 0;
    for (const r of rows) { const q = await cnt(r); rn += q.n; rp += q.px; }
    return { total: whole.px, changed: whole.n, glyph: rp, glyphChanged: rn };
  }, { a, c, box, rows });
}

function overlap(f, inks) {
  let frames = 0, maxArea = 0, maxV = 0, first = null, last = null;
  for (const q of f) {
    if (q.op <= 0.02) continue;
    let area = 0, v = 0;
    for (const k of inks) {
      const ox = Math.max(0, Math.min(q.ink.r, k.x + k.w) - Math.max(q.ink.x, k.x));
      const oy = Math.max(0, Math.min(q.ink.b, k.b) - Math.max(q.ink.y, k.y));
      area += ox * oy;
      if (ox > 0 && oy > 0) v = Math.max(v, oy / k.h);
    }
    if (area > 0) { frames++; if (first === null) first = q.t; last = q.t; }
    maxArea = Math.max(maxArea, area); maxV = Math.max(maxV, v);
  }
  return { frames, maxArea, maxV, first, last };
}

(async () => {
  console.log('PROBE711 — «코스튬 델타가 카드 아래로 새는 자리에 무엇이 있는가»\n');
  const { b, p, errs } = await open(2280);

  /* ── [1] 격자 기하 ─────────────────────────────────────────── */
  const A = await pick(p, 0);
  const G = await p.evaluate(({ RECT }) => {
    const R = eval(RECT);
    const cards = [...document.querySelectorAll('#bCos [data-cosit]')].map(R);
    const rows = [];
    for (const c of cards) { let q = rows.find((z) => Math.abs(z.y - c.y) < 4); if (!q) { q = { y: c.y, h: c.h, n: 0 }; rows.push(q); } q.n++; }
    rows.sort((x, y) => x.y - y.y);
    return { n: cards.length, rows: rows.length, cols: rows[0].n,
      pitch: rows.length > 1 ? rows[1].y - rows[0].y : null,
      gap: rows.length > 1 ? rows[1].y - (rows[0].y + rows[0].h) : null };
  }, { RECT });
  console.log('[1] 50 코스튬 격자 기하 (1080×2280)');
  console.log(`  · 카드 ${G.n}개 · ${G.rows}행 × ${G.cols}열 · 카드 ${r0(A.sel.w)}×${r0(A.sel.h)}`
    + ` · 행 pitch ${r0(G.pitch)} · **행 사이 빈 띠 ${r0(G.gap)}**`);
  console.log(`  · 선택 카드 y ${r0(A.sel.y)}..${r0(A.sel.b)} · 아래 칸 ${A.below ? 'y ' + r0(A.below.y) + '..' + r0(A.below.b) : '없다'}`);
  for (const k of A.inks) console.log(`    - 아래 칸 글자 «${k.txt}» y ${r0(k.y)}..${r0(k.b)} (카드기준 dy ${r0(k.y - A.below.y)}..${r0(k.b - A.below.y)})`);
  ok(G.n > 0 && G.rows >= 2, `[1-a] 격자가 ${G.rows}행 × ${G.cols}열 — «아래 행» 을 물을 수 있다`);
  ok(A.inks.length >= 1, `[1-b] 아래 칸에 글자가 ${A.inks.length}줄 있다`);

  /* ── [2] 여정 ──────────────────────────────────────────────── */
  const D = await journey(p, 'grid');
  const f = D.frames;
  const box0 = Math.min(...f.map((q) => q.box.y)), box1 = Math.max(...f.map((q) => q.box.b));
  const ink0 = Math.min(...f.map((q) => q.ink.y)), ink1 = Math.max(...f.map((q) => q.ink.b));
  console.log('\n[2] 델타 여정 — 호스트 = 격자 카드');
  console.log(`  · font ${D.fs} · 스트로크 ${D.stroke} · 그림자 ${(D.shadow || '').slice(0, 46)}`);
  console.log(`  · 상자 카드기준 dy ${r0(box0 - D.hostR.y)}..${r0(box1 - D.hostR.y)}`
    + ` · 잉크 상자 dy ${r0(ink0 - D.hostR.y)}..${r0(ink1 - D.hostR.y)} (카드 높이 ${r0(D.hostR.h)})`);
  console.log(`  · **카드 아래로 나가는 양** — 상자 ${r0(box1 - D.hostR.b)}px · 잉크 ${r0(ink1 - D.hostR.b)}px`
    + ` (행 사이 빈 띠 ${r0(G.gap)}px)`);
  ok(D.made, '[2-a] 델타가 떴다');
  ok(box1 - D.hostR.b > 0, `[2-b] ★ 등재문 확인 — 여정이 카드 아래로 상자 ${r0(box1 - D.hostR.b)}px 나간다`);
  const intoCard = A.below ? box1 - A.below.y : null;
  const inkIntoCard = A.below ? ink1 - A.below.y : null;
  console.log(`  · 아래 «칸 상자» 안으로 들어가는 양 — 상자 ${r0(intoCard)}px · 잉크 ${r0(inkIntoCard)}px`);

  /* ── [3] 상자 겹침 ─────────────────────────────────────────── */
  const O = overlap(f, A.inks);
  const topInk = A.inks.length ? Math.min(...A.inks.map((k) => k.y)) : null;
  console.log('\n[3] 상자 겹침 — 델타 잉크 상자 ↔ 아래 칸 «글자» 상자');
  console.log(`  · 겹치는 진행도 ${O.frames}/${f.length} · 최대 교집합 ${r0(O.maxArea)}px²`
    + ` · 세로 겹침률 최대 ${(O.maxV * 100).toFixed(0)}% · 구간 ${O.first === null ? '—' : r0(O.first) + '~' + r0(O.last) + 'ms'}`);
  console.log(`  · **여유** — 델타 잉크 하단 ${r0(ink1)} ↔ 아래 칸 첫 글자 상단 ${r0(topInk)} = ${r0(topInk - ink1)}px`);
  ok(true, `[3-a] 상자 겹침 = ${O.frames ? '있다' : '없다'} (교집합 ${r0(O.maxArea)}px²)`);

  /* ── [4] 화소 차분 ─────────────────────────────────────────── */
  console.log('\n[4] 화소 차분 — 아래 칸 안에서 «델타 있음 ↔ 없음»');
  let worst = { changed: 0, glyphChanged: 0, t: null, glyph: 0, total: 0 };
  if (A.below) {
    const clip = { x: Math.round(A.below.x), y: Math.round(A.below.y), w: Math.round(A.below.w), h: Math.round(A.below.h) };
    for (const t of [310, 372, 434, 496, 558, 619]) {
      const rows = A.inks.map((k) => ({ x: Math.round(k.x), y: Math.round(k.y), w: Math.round(k.w), h: Math.round(k.h) }));
      const q = await pixdiff(p, clip, t, rows);
      console.log(`  · t=${t}ms — 칸 전체 바뀐 화소 ${q.changed}/${q.total} · 그중 **글줄 상자 안 ${q.glyphChanged}/${q.glyph}**`);
      if (q.changed > worst.changed) worst = { ...q, t };
      if (q.glyphChanged > worst.glyphChanged) worst.glyphChanged = q.glyphChanged;
    }
  }
  ok(true, `[4-a] ★ 아래 칸 — 칸 전체 화소 변화 최대 ${worst.changed} (t=${worst.t}ms) · **글줄 상자 안 ${worst.glyphChanged}**`);

  /* ── [4b] 호스트 카드 자신 — 등재문이 안 물은 쪽 ──────────── */
  console.log('\n[4b] ★ 등재문이 안 물은 쪽 — **호스트 카드 자신의 글자**와 겹치는가');
  for (const k of A.selInks) console.log(`  · 호스트 글자 «${k.txt}» 카드기준 dy ${r0(k.y - A.sel.y)}..${r0(k.b - A.sel.y)}`
    + ` (x ${r0(k.x)}..${r0(k.x + k.w)})`);
  const H = overlap(f, A.selInks);
  console.log(`  · 델타 잉크 x ${r0(Math.min(...f.map((q) => q.ink.x)))}..${r0(Math.max(...f.map((q) => q.ink.r)))}`
    + ` · 겹치는 진행도 ${H.frames}/${f.length} · 최대 교집합 ${r0(H.maxArea)}px²`
    + ` · 세로 겹침률 최대 ${(H.maxV * 100).toFixed(0)}% · 구간 ${H.first === null ? '—' : r0(H.first) + '~' + r0(H.last) + 'ms'}`);
  ok(true, `[4b-a] 호스트 카드 글자 겹침 = ${H.frames ? '있다' : '없다'} (교집합 ${r0(H.maxArea)}px² · 세로 ${(H.maxV * 100).toFixed(0)}%)`);

  /* ── [4c] 실제 클릭 경로 — 플래시·버스트까지 켠 채 화소로 ──── */
  console.log('\n[4c] 실제 [강화] 클릭 경로 (fxFlash·버스트 포함) — 어두운 12% 마스크 차분(맥락용 · 판정 축은 [3]·[4])');
  let real = { host: 0, below: 0 };
  {
    await p.evaluate(() => { for (const d of document.querySelectorAll('#fxl > *')) d.remove(); });
    const clipH = { x: Math.round(A.sel.x), y: Math.round(A.sel.y), w: Math.round(A.sel.w), h: Math.round(A.sel.h) };
    const clipB = A.below ? { x: Math.round(A.below.x), y: Math.round(A.below.y), w: Math.round(A.below.w), h: Math.round(A.below.h) } : null;
    const base = (await p.screenshot()).toString('base64');
    await p.evaluate(() => {
      const b = document.querySelector('#bCos [data-cosup]');
      if (b) b.click();
    });
    for (const t of [200, 400, 560]) {
      await p.evaluate((T) => {
        document.getAnimations().forEach((a) => {
          const tg = a.effect && a.effect.target;
          if (tg && tg.closest && tg.closest('#fxl')) { a.pause(); try { a.currentTime = T; } catch (_) {} }
        });
      }, t);
      const cur = (await p.screenshot()).toString('base64');
      const q = await p.evaluate(async ({ a, c, boxes }) => {
        const load = (u) => new Promise((res, no) => { const i = new Image(); i.onload = () => res(i); i.onerror = no; i.src = 'data:image/png;base64,' + u; });
        const grab = async (u, box) => {
          const im = await load(u); const cv = document.createElement('canvas');
          cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
          return g.getImageData(box.x, box.y, box.w, box.h).data;
        };
        const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        const one = async (box) => {
          if (!box) return null;
          const A = await grab(a, box), C = await grab(c, box);
          const vals = []; for (let i = 0; i < A.length; i += 4) vals.push(lum(A, i));
          const srt = [...vals].sort((x, y) => x - y); const loT = srt[Math.floor(srt.length * 0.12)];
          let glyph = 0, gch = 0;
          for (let i = 0, k = 0; i < A.length; i += 4, k++) {
            if (vals[k] > loT) continue; glyph++;
            const df = Math.max(Math.abs(A[i] - C[i]), Math.abs(A[i + 1] - C[i + 1]), Math.abs(A[i + 2] - C[i + 2]));
            if (df > 8) gch++;
          }
          return { glyph, gch };
        };
        return { host: await one(boxes.h), below: await one(boxes.b) };
      }, { a: base, c: cur, boxes: { h: clipH, b: clipB } });
      console.log(`  · t=${t}ms — 호스트 어두운화소 변화 ${q.host.gch}/${q.host.glyph}`
        + (q.below ? ` · 아래 칸 어두운화소 변화 ${q.below.gch}/${q.below.glyph}` : ''));
      real.host = Math.max(real.host, q.host.gch);
      if (q.below) real.below = Math.max(real.below, q.below.gch);
    }
  }
  ok(true, `[4c-a] 실제 경로(맥락) — 호스트 어두운화소 변화 최대 ${real.host} · 아래 칸 ${real.below}`);

  /* ── [5] 마지막 행 — 아래 칸이 없는 자리 ───────────────────── */
  const L = await pick(p, -1);
  const D2 = await journey(p, 'grid');
  const l1 = Math.max(...D2.frames.map((q) => q.box.b));
  console.log('\n[5] 마지막 행 (아래 칸 없음) — 델타가 격자·시트·탭바 밖으로 나가는가');
  console.log(`  · 카드 #${L.idx + 1}/${L.n} y ${r0(L.sel.y)}..${r0(L.sel.b)} · 델타 상자 하단 ${r0(l1)}`);
  console.log(`  · 격자 하단 ${r0(L.grid.b)} · 시트(#bCos) 하단 ${r0(L.sheet.b)}`
    + ` · 탭바 상단 ${L.tabbar ? r0(L.tabbar.y) : '—'} · 뷰포트 ${L.vh}`);
  ok(l1 <= (L.tabbar ? L.tabbar.y : L.vh) + 0.5,
    `[5-a] 마지막 행 델타가 탭바 위로 안 올라간다 (하단 ${r0(l1)} ≤ ${L.tabbar ? r0(L.tabbar.y) : L.vh})`);
  ok(l1 <= L.vh + 0.5, `[5-b] 뷰포트 밖으로 안 나간다 (하단 ${r0(l1)} ≤ ${L.vh})`);

  /* ── [6] 팝업 자리 — `.sk-ic`(36260 호출부) ────────────────── */
  const P = await p.evaluate(({ RECT }) => {
    const R = eval(RECT);
    const c = document.querySelector('#bCos [data-cosit]');
    c.click(); c.click();                                  /* 두 번째 누름 = 08 세부 팝업 */
    return new Promise((res) => setTimeout(() => {
      const ic = document.querySelector('#mbox .sk-ic');
      const mb = document.querySelector('#mbox');
      res({ has: !!ic, ic: ic ? R(ic) : null, mbox: mb ? R(mb) : null });
    }, 400));
  }, { RECT });
  console.log('\n[6] 팝업 자리 — 08 세부 [강화] (`fxUpOk(.sk-ic, …)`)');
  if (P.has) {
    const D3 = await journey(p, 'popup');
    const p1 = Math.max(...D3.frames.map((q) => q.box.b));
    console.log(`  · 아이콘 ${r0(P.ic.w)}×${r0(P.ic.h)} y ${r0(P.ic.y)}..${r0(P.ic.b)}`
      + ` · 델타 상자 하단 ${r0(p1)} · 팝업 하단 ${r0(P.mbox.b)}`);
    ok(p1 <= P.mbox.b + 0.5, `[6-a] 팝업 델타가 팝업 밖으로 안 나간다 (${r0(p1)} ≤ ${r0(P.mbox.b)})`);
  } else {
    console.log('  · 팝업에 `.sk-ic` 가 없다 — 이 자리는 이번 판정 밖');
    ok(true, '[6-a] 팝업 자리 없음(스킵)');
  }
  await b.close();

  /* ── [7] 9:13.3(1600) ──────────────────────────────────────── */
  const S = await open(1600);
  const A2 = await pick(S.p, 0);
  const D4 = await journey(S.p, 'grid');
  const b1 = Math.max(...D4.frames.map((q) => q.box.b));
  const k1 = Math.max(...D4.frames.map((q) => q.ink.b));
  const top2 = A2.inks.length ? Math.min(...A2.inks.map((k) => k.y)) : null;
  const O2 = overlap(D4.frames, A2.inks);
  console.log('\n[7] 9:13.3 (1080×1600) — 같은 값인가');
  console.log(`  · 카드 ${r0(A2.sel.w)}×${r0(A2.sel.h)} · 아래 칸 ${A2.below ? 'y ' + r0(A2.below.y) : '없다'}`
    + ` · 델타 상자 하단 ${r0(b1)} · 잉크 하단 ${r0(k1)}`);
  console.log(`  · 여유(잉크 하단 ↔ 아래 칸 첫 글자) ${r0(top2 === null ? null : top2 - k1)}px`
    + ` · 글자 상자 겹침 ${O2.frames}프레임 / 교집합 ${r0(O2.maxArea)}px²`);
  ok(O2.maxArea === 0 || O2.maxArea > 0, `[7-a] 1600 프레임 실측 기록 (교집합 ${r0(O2.maxArea)}px²)`);
  const e2 = S.errs.length;
  await S.b.close();

  ok(errs.length + e2 === 0, `[8] 콘솔 에러 ${errs.length + e2}건`);
  console.log(`\nPROBE711 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
