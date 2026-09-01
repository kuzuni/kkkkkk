#!/usr/bin/env node
/* 작업 621 게이트 — 「연속 강화 중 버튼이 **틱마다** «원래 크기 ↔ 눌린 크기» 를 왕복한다」
 * (주인 지시 2026-09-01 «버튼 크기 원래 크기로 돌아오고 누른크기 되고를 반복해야함.
 *  지금은 작아진상태에서 진동함»)
 *
 *   node tools/verify621.js
 *
 * 절:
 *   [A] 선언  — 왕복 부품이 **한 곳**(`jzPressTick`)이고 홀드 세 자리가 그것을 부른다 ·
 *               뗌에서 반드시 취소된다(`jzTickStop` 이 `jzRelease` 안에 있다) ·
 *               진폭은 `jz-dn` 과 **같은 값**(.94 / 8px)을 쓴다(새 상수 0개)
 *   [B] 실동작 — 홀드 반복 구간에서 **틱마다** 「원래 크기(≥.995) 프레임」이 있다.
 *               ⚠ 자는 «찍힌 상자»(getBoundingClientRect) 이고, 룬·단련은 491 이 **호스트에도**
 *                 눌림(`jz-hdn` .985 · 누르고 있는 동안 유지 = 주인 승인 설계)을 걸어 두 층이
 *                 곱해지므로 **호스트 배율을 나눈 «버튼 자기 층»** 으로 잰다(훈련은 «누른 것 =
 *                 호스트» 라 두 값이 같다). 절대비도 같이 찍어 아무것도 숨기지 않는다.
 *   [C] 왕복이지 «풀린 것» 이 아니다 — 같은 틱 구간에 **눌린 크기(≤.96) 프레임도** 있어야 한다
 *               (그냥 눌림을 안 걸어도 [B] 는 초록이 되므로 이 항이 짝이다) ·
 *               눌림 층(scale)이 1 ↔ .94 를 오간다 · `jz-dn` 어휘는 그대로 붙어 있다(60·491·579 가 읽는 표시)
 *   [D] 뗌    — 끝값 1.0 복귀 · 콘솔 에러 0
 *   [R] 되돌림 — `jzPressTick` 을 무력화한 사본에서는 [B] 가 **빨개지고**(무르게 푼 수리가 아님)
 *               뗌 스프링은 원본·무력화가 **같다**(579 회귀 — 절대값이 아니라 대조로 본다)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V621_HOLD || 2400);
const REST_TH = 0.995;      /* «원래 크기» 문턱 — 326폭에서 1.6px */
/* «눌린 크기» 문턱 — 취향이 아니라 산수다. 그려진 상자는 층의 **곱**이고 눌림(.94) 위에 488 맥박이
   얹힌다(`--hb-s` 큰 카드 1.02) ⇒ 바닥에 닿은 프레임의 상한이 .94 × 1.02 = **0.9588**.
   0.96 은 그 바로 위 = «눌림 층이 확실히 바닥까지 갔다» 이고, 복귀 문턱 .995 와도 3.5% 떨어져 있다. */
const DOWN_TH = 0.96;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p3 = n => Math.round(n * 1000) / 1000;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
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
  wrap('runeBuy',     'rune',   () => true);     /* 룬은 확률 시도 — 이 행의 축은 «누름» 이라 시도로 센다 */
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
  await page.waitForTimeout(260);                     /* 뗌 스프링(jz-up .18s)을 프레임으로 잡는다 */
  await page.evaluate(() => { window.__v621.on = false; });
  await page.waitForTimeout(400);

  const after = await page.evaluate(s => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().width : 0; }, sp.sel);
  const d = await page.evaluate(() => {
    const P = window.__v621;
    return { buys: P.buys.slice(), frames: P.frames.slice(), w0: P.w0, hw0: P.hw0, dn: P.dn, fr0: P.fr0 };
  });

  const W0 = d.w0, HW0 = d.hw0;
  const own = f => (HW0 && f.hw) ? (f.w / W0) / (f.hw / HW0) : f.w / W0;
  const buys = d.buys.filter(b => b.kind === sp.id).map(b => b.t);
  const rep = buys.slice(1);                          /* 첫 발과 350ms 대기 구간은 «누르고 있다» 가 맞다 */
  if (!rep.length) return null;
  const upT = rep[rep.length - 1] + 120;              /* 뗌 창의 시작(마지막 틱 뒤) — 스프링을 여기서 본다 */
  const fr = d.frames.filter(f => f.t >= rep[0] - 8 && f.t <= rep[rep.length - 1] + 90);
  const owns = fr.map(own);
  let cyc = 0, dnCyc = 0, live = 0, gone = 0;
  for (let i = 0; i < rep.length; i++) {
    const a = rep[i] - 8, b = (i + 1 < rep.length) ? rep[i + 1] - 8 : rep[i] + 90;
    const seg = d.frames.filter(f => f.t >= a && f.t < b);
    if (seg.some(f => own(f) >= REST_TH)) cyc++;
    /* ⚠ «눌림 층이 통째로 없는» 틱은 세지 않는다 — 그 틱은 재렌더가 버튼 노드를 갈아 `jz-dn` 도
       같이 사라진 자리다(491 1회차가 적어 둔 구조 · 이 행이 만든 것이 아니다). 몇 틱인지는 찍는다. */
    if (seg.length && seg.some(f => f.gone)) { gone++; continue; }
    live++;
    if (seg.some(f => own(f) <= DOWN_TH)) dnCyc++;
  }
  /* 뗌 스프링 — 마지막 틱 이후 프레임에서 «원래 크기를 넘는» 오버슈트가 잡히는가(jzUp 55% = 1.04) */
  const rel = d.frames.filter(f => f.t > upT);
  const relMax = rel.length ? Math.max(...rel.map(f => f.w / W0)) : 0;

  return {
    id: sp.id, ticks: rep.length, frames: fr.length, w0: p3(W0),
    cyc, cycRatio: p3(cyc / rep.length), dnCyc, live, gone,
    dnRatio: live ? p3(dnCyc / live) : 0,
    dnFrames: owns.filter(x => x <= DOWN_TH).length,
    dnPct: owns.length ? p3(owns.filter(x => x <= DOWN_TH).length / owns.length) : 0,
    omin: p3(Math.min(...owns)), omax: p3(Math.max(...owns)),
    smin: p3(Math.min(...fr.map(f => f.sc))), smax: p3(Math.max(...fr.map(f => f.sc))),
    amin: p3(Math.min(...fr.map(f => f.w / W0))), amax: p3(Math.max(...fr.map(f => f.w / W0))),
    dn: d.dn, fr0: d.fr0, relMax: p3(relMax), after: p3(after / W0),
  };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('\n[A] 선언 — 왕복 부품이 한 곳이고 세 자리가 그것을 부른다');
  ok(/function\s+jzPressTick\s*\(/.test(src), 'A1 `jzPressTick` 부품 1개 선언');
  ok(/function\s+jzTickStop\s*\(/.test(src), 'A2 `jzTickStop`(취소) 선언');
  {
    const rel = src.slice(src.indexOf('function jzRelease('), src.indexOf('function jzRelease(') + 900);
    ok(/jzTickStop\(\)/.test(rel), 'A3 뗌(`jzRelease`)에서 반드시 취소한다 — `jz-up` 스프링에 자리를 넘긴다(579)');
  }
  {
    const calls = (src.match(/jzPressTick\(/g) || []).length - 1;   /* 선언 제외 */
    ok(calls >= 2, 'A4 홀드 틱에서 부른다(훈련 `trHoldTick` + 공용 `rtHoldTick`)', '호출 ' + calls + '곳');
    ok(/jzPressTick\(cardNow, h\.iv\)/.test(src), 'A5 훈련 홀드 틱이 «지금 노드 + 지금 간격» 으로 부른다');
    ok(/jzPressTick\(document\.querySelector\(h\.sel\), h\.iv\)/.test(src), 'A6 룬·단련 공용 홀드 틱이 «누른 버튼» 으로 부른다');
  }
  {
    const fn = src.slice(src.indexOf('function jzPressTick('), src.indexOf('function jzPressTick(') + 1400);
    ok(/scale:\s*'\.94'/.test(fn) && /translate:\s*'0 8px'/.test(fn),
       'A7 진폭은 `jz-dn` 과 같은 값(.94 / 8px) — 새 상수 0개(진폭 회귀 0)');
    ok(/el\.animate\(/.test(fn), 'A8 CSS `animation` 단축이 아니라 WAAPI — 맥박(`jz-hb`)과 층이 갈린다(491 7회차 함정)');
    ok(/fill:\s*'forwards'/.test(fn),
       'A9 `fill:forwards` — 끝값이 `jz-dn` 과 같은 .94 라 이음매가 0 이고, 노드가 갈려도 «눌린 채» 가 유지된다');
  }
  ok(/\.jz-dn\{scale:\.94;translate:0 8px/.test(src), 'A10 `jz-dn`(상태) 자체는 그대로다 — 어휘를 안 지웠다');

  /* ── [B]·[C]·[D] 실동작 ───────────────────────────────────────────── */
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(ARM);
  await page.waitForTimeout(400);

  const R = {};
  for (const sp of SPOTS) R[sp.id] = await hold(page, sp);

  console.log('\n  자리           틱N  왕복틱  눌림틱  자기최소 자기최대 절대최소 절대최대  jz-dn프레임  뗌최대  뗌뒤');
  for (const sp of SPOTS) {
    const o = R[sp.id]; if (!o) { console.log('  ' + sp.id + ' — 표본 없음'); continue; }
    console.log('  ' + sp.id.padEnd(13) + String(o.ticks).padStart(4) + String(o.cyc).padStart(7)
      + String(o.dnCyc).padStart(8) + String(o.omin).padStart(9) + String(o.omax).padStart(9)
      + String(o.amin).padStart(9) + String(o.amax).padStart(9)
      + (o.dn + '/' + o.fr0).padStart(13) + String(o.relMax).padStart(8) + String(o.after).padStart(7));
  }

  console.log('\n[B] 실동작 — 틱마다 «원래 크기» 로 돌아온다');
  for (const sp of SPOTS) {
    const o = R[sp.id];
    ok(!!o && o.ticks >= 5, 'B0 ' + sp.id + ' 홀드가 실제로 연속으로 돌았다', o ? '틱 ' + o.ticks + '회' : 'n/a');
    ok(!!o && o.cycRatio >= 0.95, 'B1 ' + sp.id + ' 왕복한 틱 ≥ 95%',
       o ? o.cyc + '/' + o.ticks + ' = ' + o.cycRatio : 'n/a');
  }

  console.log('\n[C] 왕복이지 «풀린 것» 이 아니다 — 눌린 크기도 매 틱 지난다');
  for (const sp of SPOTS) {
    const o = R[sp.id];
    /* ⚠ 문턱이 둘인 이유 — 틱 하나에 들어오는 rAF 표본이 **3~5장**뿐이라 «틱마다 눌린 장이 있다» 를
       0.95 로 잡으면 표본 운에 진다(눌림이 틱의 60% 를 차지해도 4장이 전부 나머지 40% 에 떨어질 확률이
       매 틱 2.6% · 19틱이면 한 번쯤은 난다 — 실측으로 18/19 = 0.947 이 났다). 흔들리지 않는 축은
       **프레임 듀티**이고(실측 0.49~0.60 · 수리 전 0.011~0.046), 틱 축은 «거의 매 틱» 으로 남긴다. */
    ok(!!o && o.dnPct >= 0.40, 'C1 ' + sp.id + ' 눌린 크기(≤' + DOWN_TH + ') 프레임 듀티 ≥ 40% — 수리 전 1.1~4.6%',
       o ? o.dnFrames + '/' + o.frames + ' = ' + o.dnPct : 'n/a');
    ok(!!o && o.dnRatio >= 0.85, 'C1b ' + sp.id + ' 눌린 크기를 지난 틱 ≥ 85%(표본 3~5장/틱)',
       o ? o.dnCyc + '/' + o.live + ' = ' + o.dnRatio + (o.gone ? ' · 노드가 갈린 틱 ' + o.gone + '개 제외' : '') : 'n/a');
    ok(!!o && o.smin <= 0.941 && o.smin >= 0.939 && o.smax >= 0.999,
       'C2 ' + sp.id + ' 눌림 층(scale)이 1 ↔ .94 를 오간다 — 진폭은 `jz-dn` 그대로(새 값 0개)',
       o ? 'scale ' + o.smin + '~' + o.smax : 'n/a');
    ok(!!o && o.dn >= o.fr0 * 0.8, 'C3 ' + sp.id + ' `jz-dn` 어휘가 홀드 내내 붙어 있다(60·491·579 가 읽는 표시)',
       o ? o.dn + '/' + o.fr0 : 'n/a');
  }

  console.log('\n[D] 뗌 — 1.0 복귀 (스프링 회귀는 [R3] 이 «무력화 사본과의 대조» 로 본다)');
  for (const sp of SPOTS) {
    const o = R[sp.id];
    ok(!!o && Math.abs(o.after - 1) <= 0.005, 'D1 ' + sp.id + ' 뗌 뒤 1.0 복귀', o ? String(o.after) : 'n/a');
  }
  ok(errs.length === 0, 'D2 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  /* ── [R] 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — `jzPressTick` 을 무력화하면 [B1] 이 빨개진다');
  await page.evaluate(() => { window.__jzPT0 = window.jzPressTick; window.jzPressTick = () => {}; });
  const rv = {};
  for (const sp of SPOTS) rv[sp.id] = await hold(page, sp);
  await page.evaluate(() => { if (window.__jzPT0) window.jzPressTick = window.__jzPT0; });
  for (const sp of SPOTS) {
    const o = rv[sp.id];
    ok(!!o && o.cycRatio <= 0.2, 'R1 ' + sp.id + ' 무력화 사본은 왕복이 사라진다(≤0.2)',
       o ? o.cyc + '/' + o.ticks + ' = ' + o.cycRatio : 'n/a');
  }
  {
    const o = await hold(page, SPOTS[0]);
    ok(!!o && o.cycRatio >= 0.95, 'R2 원복하면 같은 자로 다시 초록', o ? o.cyc + '/' + o.ticks + ' = ' + o.cycRatio : 'n/a');
  }
  /* ⚑ R3 — 579 회귀를 «절대값» 이 아니라 **대조**로 본다. 뗌 스프링(`jz-up` 1.04 오버슈트)이 실제로
     찍히는 자리는 훈련뿐이다 — 룬·단련은 뗌에서 `rtHoldStop → end()` 가 통짜 렌더로 버튼 노드를 갈아
     끼워 스프링이 붙을 노드가 사라진다(491 1회차가 적어 둔 구조 · 이 행이 만든 것이 아니다).
     그러니 «오버슈트가 있어야 한다» 고 우기지 않고, **무력화 사본과 같은가**를 묻는다. */
  for (const sp of SPOTS) {
    const a = R[sp.id], b = rv[sp.id];
    /* ⚠ 크기를 «같거나 크다» 로 비교하면 스프링 표본의 흔들림(1.04~1.055)에 진다 —
       묻는 것은 «스프링이 도는가» 이므로 **오버슈트가 잡히는 자리인가**로 가른다. */
    ok(!!a && !!b && (b.relMax < 1.01 || a.relMax >= 1.01),
       'R3 ' + sp.id + ' 뗌 스프링을 안 먹었다(무력화 사본에서 오버슈트가 보이는 자리면 원본도 보인다)',
       a && b ? '원본 ' + a.relMax + ' ↔ 무력화 ' + b.relMax : 'n/a');
  }

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
