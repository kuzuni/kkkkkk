#!/usr/bin/env node
/* 작업 632 재현·자 설계 — 「verify621 이 플레이키하다」의 축별 분리폭 실측
 *
 *   node tools/probe632.js [반복수=3]
 *
 * verify621 과 같은 표본기(rAF · 찍힌 상자 · 호스트 층 나눔)로 홀드를 굴리되,
 * 판정하지 않고 **후보 축들을 원본 ↔ 무력화 사본에서 나란히 찍는다**:
 *   cycRatio  — 틱당 «REST_TH 프레임이 잡혔는가» (현행 B1/R2 축 — 플레이키 원인)
 *   restPct   — own ≥ REST_TH(0.985) 프레임 듀티
 *   fullPct   — own ≥ FULL_TH(0.995) 프레임 듀티 (현행 B2 축)
 *   dnPct     — own ≤ DOWN_TH(0.96) 프레임 듀티 (현행 C1 축)
 *   hysCyc    — 히스테리시스 왕복 수(≤0.955 → ≥0.98 상승 교차) / 틱수
 *   tickMax50/75 — 틱별 최대 own 의 중앙값 / 75퍼센타일
 *   omin/omax — 진폭 껍데기
 *
 * 목적: 컨테이너 fps(이 러너 실측 ~20~24fps)에 좌우되지 않는 축과,
 * 원본·무력화 사이 분리폭이 넓은 문턱을 고르는 근거.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V621_HOLD || 2400);
const REST_TH = 0.985, FULL_TH = 0.995, DOWN_TH = 0.96, HYS_LO = 0.955, HYS_HI = 0.98;
const REPS = Number(process.argv[2] || 3);
const p3 = n => Math.round(n * 1000) / 1000;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', },
];

const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__v621 = { buys: [], frames: [], sel: '', w0: 0, hw0: 0, on: false, dn: 0, fr0: 0 });
  const wrap = (name, kind, okOf) => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a); if (okOf(r)) P.buys.push({ kind, t: performance.now() }); return r; };
  };
  wrap('trainBuy',    'train',  r => !!r);
  wrap('temperUpBtn', 'temper', r => !!r);
  wrap('runeBuy',     'rune',   () => true);
  /* ⚑ 701·797 이관(2026-09-02) — 홀드 틱이 지나는 «1회» 는 코어다(옛 두 이름은 막힌 안내 전용).
     홀드에서 둘은 배타적이라 같은 장부에 더한다 — `verify349` 와 같은 처방. */
  wrap('temperUpOne', 'temper', () => true);
  wrap('runeTryOne',  'rune',   () => true);
  const HOSTSEL = '.tr-rn,.tr-tp,.tr-card';
  const step = () => {
    if (P.on) {
      const el = document.querySelector(P.sel);
      if (el) {
        const h = el.closest(HOSTSEL);
        let sc = 'none'; try { sc = getComputedStyle(el).scale; } catch (_) {}
        P.frames.push({ t: performance.now(), w: el.getBoundingClientRect().width,
                        hw: (h && h !== el) ? h.getBoundingClientRect().width : 0,
                        sc: parseFloat(sc) || 1, gone: sc === 'none' });
        if (el.classList.contains('jz-dn')) P.dn++;
        P.fr0++;
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
  if (S.temper) S.temper.pts = 1e6;
  openTrain();
};

async function hold(page, sp) {
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
  await page.waitForTimeout(450);
  const r = await page.evaluate(sel => {
    const el = document.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect();
    const hs = el.closest('.tr-rn,.tr-tp,.tr-card');
    const P = window.__v621;
    P.sel = sel; P.w0 = b.width; P.hw0 = (hs && hs !== el) ? hs.getBoundingClientRect().width : 0;
    P.buys.length = 0; P.frames.length = 0; P.dn = 0; P.fr0 = 0;
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, sp.sel);
  if (!r || !r.w) return null;
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
  await page.evaluate(() => { window.__v621.on = true; });
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  await page.waitForTimeout(260);
  await page.evaluate(() => { window.__v621.on = false; });
  await page.waitForTimeout(400);
  const d = await page.evaluate(() => {
    const P = window.__v621;
    return { buys: P.buys.slice(), frames: P.frames.slice(), w0: P.w0, hw0: P.hw0 };
  });
  const W0 = d.w0, HW0 = d.hw0;
  const own = f => (HW0 && f.hw) ? (f.w / W0) / (f.hw / HW0) : f.w / W0;
  const buys = d.buys.filter(b => b.kind === sp.id).map(b => b.t);
  const rep = buys.slice(1);
  if (rep.length < 3) return null;
  const fr = d.frames.filter(f => f.t >= rep[0] - 8 && f.t <= rep[rep.length - 1] + 90);
  const owns = fr.map(own);
  let cyc = 0; const tickMax = [];
  for (let i = 0; i < rep.length; i++) {
    const a = rep[i] - 8, b = (i + 1 < rep.length) ? rep[i + 1] - 8 : rep[i] + 90;
    const seg = fr.filter(f => f.t >= a && f.t < b).map(own);
    if (seg.some(x => x >= REST_TH)) cyc++;
    if (seg.length) tickMax.push(Math.max(...seg));
  }
  /* 히스테리시스 왕복 수 — «내려갔다(≤HYS_LO) 올라옴(≥HYS_HI)» 상승 교차 */
  let hys = 0, low = false;
  for (const x of owns) { if (x <= HYS_LO) low = true; else if (low && x >= HYS_HI) { hys++; low = false; } }
  tickMax.sort((a, b) => a - b);
  const q = p => tickMax.length ? tickMax[Math.min(tickMax.length - 1, Math.floor(tickMax.length * p))] : 0;
  const duty = th => owns.length ? owns.filter(x => x >= th).length / owns.length : 0;
  return {
    ticks: rep.length, frames: owns.length,
    cycRatio: p3(cyc / rep.length),
    restPct: p3(duty(REST_TH)), fullPct: p3(duty(FULL_TH)),
    dnPct: p3(owns.filter(x => x <= DOWN_TH).length / owns.length),
    hysR: p3(hys / rep.length), hys,
    tm50: p3(q(0.5)), tm25: p3(q(0.25)),
    omin: p3(Math.min(...owns)), omax: p3(Math.max(...owns)),
  };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(ARM);
  await page.waitForTimeout(400);

  const hdr = '  세계  자리    틱  프레임  cycR  restPct fullPct  dnPct  hysR(수)  tm50   tm25   omin   omax';
  console.log('[probe632] HOLD_MS=' + HOLD_MS + ' · 반복 ' + REPS + '회 · 문턱 REST ' + REST_TH + ' FULL ' + FULL_TH + ' HYS ' + HYS_LO + '/' + HYS_HI);
  for (const world of ['orig', 'dead']) {
    if (world === 'dead') await page.evaluate(() => { window.__jzPT0 = window.jzPressTick; window.jzPressTick = () => {}; });
    console.log('\n' + hdr);
    for (let rep = 0; rep < REPS; rep++) {
      for (const sp of SPOTS) {
        const o = await hold(page, sp);
        if (!o) { console.log('  ' + world + '  ' + sp.id + ' — 표본 없음'); continue; }
        console.log('  ' + world + '  ' + sp.id.padEnd(7) + String(o.ticks).padStart(3) + String(o.frames).padStart(7)
          + String(o.cycRatio).padStart(7) + String(o.restPct).padStart(8) + String(o.fullPct).padStart(8)
          + String(o.dnPct).padStart(7) + (o.hysR + '(' + o.hys + ')').padStart(10)
          + String(o.tm50).padStart(7) + String(o.tm25).padStart(7)
          + String(o.omin).padStart(7) + String(o.omax).padStart(7));
      }
    }
    if (world === 'dead') await page.evaluate(() => { if (window.__jzPT0) window.jzPressTick = window.__jzPT0; });
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
