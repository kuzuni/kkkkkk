#!/usr/bin/env node
/* 작업 870 재현기 — 「`verify818` [C1](«알 중심이 버튼 밖» 0개)이 플레이키하다」의 **갈래를 가른다**
 *
 *   node tools/probe870.js            (기본 6판 · 단련·룬 둘 다)
 *   V870_ROUNDS=12 node tools/probe870.js
 *
 * 338 규칙 — 처방 전에 재현부터. 등재문(PROGRESS 870)이 연 갈래는 둘이다:
 *   ⓐ 표본이 얕아 «있는 결함» 을 가끔만 잡는다      ⇒ 제품 수리
 *   ⓑ 표본기가 «스폰 시각의 호스트 상자» 가 아니라 «표본 시각의 호스트 상자» 로 재서
 *      **없는 결함**을 만든다                        ⇒ 자 수리
 * 그래서 이 자는 같은 알 무리를 **자 둘로 동시에** 잰다:
 *   · `outNow`   = `verify818` [C1] 이 쓰는 그 자 — 표본(=finish) 시각의 호스트 상자
 *   · `outBirth` = 그 알이 **태어난 순간**의 호스트 상자(= 제품의 `fxRect(t)` 가 가둠에 쓴 그 상자)
 * 둘이 갈리면 ⓑ 이고(제품은 자기가 가둔 상자를 지켰다), 둘 다 >0 이면 ⓐ 다.
 *
 * ⚠ 제품 코드는 한 글자도 안 건드린다 — 관측 창만 연다(846 `COV_RUN` 과 같은 규약).
 * ⚠ 트리거는 실제 사용자 경로(버튼 pointerdown 홀드)다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const ROUNDS = Number(process.env.V870_ROUNDS || 6);
const GENS   = Number(process.env.V870_GENS || 12);      /* = verify818 GENS */
const TICK   = Number(process.env.V870_TICK || 160);     /* = index.html TR_HOLD_IV0 */
const CSTEP  = Number(process.env.V870_CSTEP || 16);
const CTMO   = Number(process.env.V870_CTMO || 20000);

const T = {
  temper: { name: '단련', sub: 'temper', host: '#trw .tr-tp.k0 .tb', num: '.tbn',
            far: "S.tstone = 1e12; const o = temperObj(); o.alloc = o.alloc || {}; o.alloc.atk = 100000; renderTemper();" },
  rune:   { name: '룬',   sub: 'rune',   host: '#trw .tr-rn .rbt.b1', num: '.rbn',
            far: "S.rstone = 1e12; S.rune = S.rune || {}; S.rune.r1 = 400; renderRunes();" }
};

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;
const p2 = n => Math.round(n * 100) / 100;

/* 846 `COV_RUN` 의 관측 뼈대 그대로 + **알마다 태생 상자를 같이 적는다.** */
const COV_PROBE = (arg) => new Promise(res => {
  const host = document.querySelector(arg.host);
  const L = document.getElementById('fxl');
  if (!host || !L) { res(null); return; }
  const box = el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };

  const gens = [], gbox = [];
  let done = false;
  const origRemove = Element.prototype.remove;
  let guarded = true;
  Element.prototype.remove = function () {
    if (guarded && this.nodeType === 1 && /fx-spark/.test(this.className + '')) return;
    return origRemove.call(this);
  };
  const mo = new MutationObserver(recs => {
    if (done) return;
    const born = [];
    for (const r of recs) for (const nd of r.addedNodes)
      if (nd.nodeType === 1 && /fx-spark/.test(nd.className + '')) born.push(nd);
    if (!born.length) return;
    gens.push(born);
    gbox.push(box(host));                 /* ⚑ 이 자의 본체 — «태어난 순간» 의 호스트 상자 */
    if (gens.length < arg.gens) return;
    done = true; mo.disconnect(); finish();
  });
  mo.observe(L, { childList: true });
  setTimeout(() => { if (!done) { done = true; mo.disconnect(); finish(); } }, arg.timeout || 20000);

  function finish() {
    if (!gens.length) { guarded = false; Element.prototype.remove = origRemove; res(null); return; }
    let life = 0;
    const anims = gens.map(g => {
      const A = [];
      for (const nd of g) for (const a of nd.getAnimations()) {
        a.pause(); A.push(a);
        try { const tm = a.effect.getTiming();
          const d = (Number(tm.delay) || 0) + (Number(tm.duration) || 0);
          if (d > life) life = d; } catch (_) {}
      }
      return A;
    });
    if (!(life > 0)) life = 380;
    const hbNow = box(host);              /* = verify818 [C1] 이 쓰는 그 상자(표본 시각) */
    const tick = arg.tick, step = arg.step;
    const end = (gens.length - 1) * tick + life;
    let outNow = 0, outBirth = 0;
    const worst = [];                     /* 밖으로 읽힌 알의 이력 */
    for (let tt = 0; tt <= end + 1e-6; tt += step) {
      let oN = 0, oB = 0;
      for (let g = 0; g < gens.length; g++) {
        const lt = tt - g * tick;
        if (lt < 0 || lt > life) continue;
        for (const a of anims[g]) { try { a.currentTime = lt; } catch (_) {} }
      }
      for (let g = 0; g < gens.length; g++) {
        const lt = tt - g * tick;
        if (lt < 0 || lt > life) continue;
        for (let ei = 0; ei < gens[g].length; ei++) {
          const nd = gens[g][ei];
          const b = nd.getBoundingClientRect();
          if (!b.width || !b.height) continue;
          const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2;
          const hbB = gbox[g];
          const dN = Math.max(hbNow.left - cx, cx - hbNow.right, hbNow.top - cy, cy - hbNow.bottom);
          const dB = Math.max(hbB.left - cx, cx - hbB.right, hbB.top - cy, cy - hbB.bottom);
          if (dN > 0) {
            oN++;
            worst.push({ t: tt, g, ei, cx: +cx.toFixed(1), cy: +cy.toFixed(1), dN: +dN.toFixed(2), dB: +dB.toFixed(2),
                         edge: (cx < hbNow.left ? 'L' : cx > hbNow.right ? 'R' : cy < hbNow.top ? 'T' : 'B'),
                         sz: +b.width.toFixed(1),
                         sl: parseFloat(nd.style.left), st: parseFloat(nd.style.top),
                         dx: nd.style.getPropertyValue('--dx'), dy: nd.style.getPropertyValue('--dy'),
                         hb: [+hbB.left.toFixed(1), +hbB.top.toFixed(1), +hbB.right.toFixed(1), +hbB.bottom.toFixed(1)] });
          }
          if (dB > 0) oB++;
        }
      }
      if (oN > outNow) outNow = oN;
      if (oB > outBirth) outBirth = oB;
    }
    guarded = false; Element.prototype.remove = origRemove;
    for (const nd of [...L.children]) if (/fx-spark/.test(nd.className + '')) { try { nd.remove(); } catch (_) {} }
    /* 태생 상자들이 서로 얼마나 갈리는가 — «눌림» 이 실제로 상자를 흔들었는지 */
    const lefts = gbox.map(b => b.left), tops = gbox.map(b => b.top),
          ws = gbox.map(b => b.w), hs = gbox.map(b => b.h);
    res({ outNow, outBirth, gens: gens.length, life, hbNow: [+hbNow.left.toFixed(1), +hbNow.top.toFixed(1), +hbNow.w.toFixed(1), +hbNow.h.toFixed(1)],
          gboxSpan: { left: [Math.min(...lefts), Math.max(...lefts)], top: [Math.min(...tops), Math.max(...tops)],
                      w: [Math.min(...ws), Math.max(...ws)], h: [Math.min(...hs), Math.max(...hs)] },
          worst: worst.slice(0, 8), nOut: worst.length });
  }
});

async function arm(page, t) {
  await page.evaluate(s => { setTrSub(s); }, t.sub);
  await page.waitForTimeout(220);
  await page.evaluate(h => {
    for (const el of document.querySelectorAll(h)) el.style.removeProperty('--burst-keep');
  }, t.host);
  await page.waitForFunction(() => {
    const L = document.getElementById('fxl');
    return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
  }, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(120);
  return await page.evaluate(s => {
    const h = document.querySelector(s); if (!h) return null;
    const b = h.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2,
             rest: [+b.x.toFixed(1), +b.y.toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1)] };
  }, t.host);
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => { S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; openTrain(); });
  for (const k of Object.keys(T)) await page.evaluate(src => { new Function(src)(); }, T[k].far);
  await page.waitForTimeout(300);

  console.log('[1] 같은 알 무리를 자 둘로 — 표본 시각 상자(verify818 [C1]) ↔ 태생 시각 상자(제품이 가둔 상자)');
  const tally = {};
  for (const k of Object.keys(T)) tally[k] = { now: [], birth: [], det: [] };
  for (let r = 1; r <= ROUNDS; r++) {
    for (const k of Object.keys(T)) {
      const t = T[k];
      const g = await arm(page, t);
      const pr = page.evaluate(COV_PROBE, { host: t.host, gens: GENS, tick: TICK, step: CSTEP, timeout: CTMO });
      await page.mouse.move(g.x, g.y);
      await page.mouse.down();
      const out = await pr;
      await page.mouse.up();
      await page.waitForTimeout(140);
      if (!out) { console.log('  · ' + r + '판 ' + t.name + ' — 표본 없음'); continue; }
      tally[k].now.push(out.outNow); tally[k].birth.push(out.outBirth);
      if (out.worst.length) tally[k].det.push({ r, w: out.worst });
      const gs = out.gboxSpan;
      console.log('  · ' + r + '판 ' + t.name
        + '  outNow=' + out.outNow + ' · outBirth=' + out.outBirth
        + '  | 쉬는 상자 ' + g.rest.join('/')
        + ' · 표본 시각 상자 ' + out.hbNow.join('/')
        + ' · 태생 상자 폭 ' + p1(gs.w[0]) + '~' + p1(gs.w[1])
        + ' · left ' + p1(gs.left[0]) + '~' + p1(gs.left[1])
        + ' · top ' + p1(gs.top[0]) + '~' + p1(gs.top[1]));
      for (const w of out.worst.slice(0, 3))
        console.log('        ↳ 밖 알: t=' + w.t + 'ms 세대' + w.g + '#' + w.ei + ' 중심(' + w.cx + ',' + w.cy + ') '
          + w.edge + '변 밖 ' + w.dN + 'px  (태생 상자로는 ' + (w.dB > 0 ? '밖 ' + w.dB : '안 ' + p2(-w.dB)) + 'px)'
          + ' · 알 ' + w.sz + 'px · 스폰(' + w.sl + ',' + w.st + ') d(' + w.dx + ',' + w.dy + ')');
    }
  }

  console.log('\n[2] 판정 — 갈래 ⓐ(제품) ↔ ⓑ(자)');
  for (const k of Object.keys(T)) {
    const n = T[k].name, a = tally[k];
    const bad = a.now.filter(v => v > 0).length, badB = a.birth.filter(v => v > 0).length;
    console.log('  · ' + n + ' — 표본 시각 자: ' + bad + '/' + a.now.length + '판 빨강 (값 ' + a.now.join(',') + ')');
    console.log('    ' + '  '.repeat(n.length) + ' 태생 시각 자: ' + badB + '/' + a.birth.length + '판 빨강 (값 ' + a.birth.join(',') + ')');
  }
  ok(true, '기록 전용 — 이 자는 판정을 안 한다(재현이 갈래를 가르는 것이 몫이다)');

  await browser.close();
  console.log('\nPROBE870 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
