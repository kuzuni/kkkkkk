#!/usr/bin/env node
/* 작업 619 게이트 — 「연속 강화 때 이펙트가 **매 강화마다** 터진다 (훈련·단련·룬)」
 * (주인 지시 2026-09-01 «이펙트같은거 연속 강화할때 계속 터져야함. 훈련이나 단련 룬 전부»)
 *
 *   node tools/verify619.js
 *
 * 절:
 *   [A] 선언  — 발화 부품이 **한 곳**(`upFx`)이고 세 자리가 그것을 부른다 · 풀 상한 상수가 있다
 *   [B] 실동작 — 홀드 동안 「강화 N 회 ↔ 발화 N 회」. 훈련·단련은 **틱과 1:1**, 룬은 확률이라
 *                «레벨이 실제로 오른 시도(성공)» 와 1:1 이다(실패에 성공 세트를 얹으면 거짓 신호).
 *   [C] 상한  — 발화가 **상한 때문에 조용히 빠지는 일이 0** 이고, `#fxl` 동시 노드가 FXMAX 밑에 있다
 *   [D] 324 불변 — 훈련 홀드의 전투력 토스트는 종전대로 **합계 1장**(주인 승인 설계를 안 건드렸다)
 *   [R] 되돌림 — `upFx` 를 무력화한 사본에서는 [B] 가 **빨개진다**(무르게 푼 수리가 아님을 못박는다)
 *
 * ⚠ 발화는 «함수를 불렀는가» 가 아니라 **`#fxl` 에 붙은 노드**로 센다 — `fxBurst`/`fxSpend` 는
 *   상한·스로틀에서 조용히 빠지므로 호출 횟수로 세면 헛초록이 된다(350 «찍힌 픽셀로 물어라» 의 DOM 판).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V619_HOLD || 2400);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
];

/* 페이지에 계측기를 심는다(제품은 한 줄도 안 고친다) */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__v619 = { buys: [], nodes: [], max: 0, blocked: 0, toasts: [] });
  const wrap = (name, kind, okOf) => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a); if (okOf(r)) P.buys.push({ kind, t: performance.now() }); return r; };
  };
  wrap('trainBuy',    'train',  r => !!r);
  wrap('temperUpBtn', 'temper', r => !!r);
  { const f = window.runeTry; if (typeof f === 'function') window.runeTry = function (...a) {
      const r = f.apply(this, a); if (r && r.up) P.buys.push({ kind: 'rune', t: performance.now() }); return r; }; }
  /* [C] — 상한 때문에 «아무것도 안 붙은» 발화를 센다(upFx 가 false 를 돌린 횟수) */
  { const f = window.upFx; if (typeof f === 'function') window.upFx = function (...a) {
      const r = f.apply(this, a); if (!r) P.blocked++; return r; }; }
  const L = document.getElementById('fxl');
  const kindOf = el => {
    const c = (el.className || '') + '';
    if (/fx-flash/.test(c)) return 'flash';
    if (/fx-spark/.test(c)) return 'spark';
    if (/fx-spd/.test(c))   return 'spend';
    if (/fx-toast/.test(c)) return 'toast';
    if (/fx-plus/.test(c))  return 'float';
    return 'etc';
  };
  new MutationObserver(ms => {
    const t = performance.now();
    for (const m of ms) for (const nd of m.addedNodes) {
      if (nd.nodeType !== 1) continue;
      const k = kindOf(nd);
      P.nodes.push({ k, t });
      if (k === 'toast') P.toasts.push({ t, txt: (nd.textContent || '').slice(0, 40) });
    }
    if (L.childElementCount > P.max) P.max = L.childElementCount;
  }).observe(L, { childList: true });
};

async function hold(page, sp) {
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
  await page.waitForTimeout(420);
  await page.evaluate(() => { const P = window.__v619; P.buys.length = 0; P.nodes.length = 0; P.toasts.length = 0; P.max = 0; P.blocked = 0; });
  const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sp.sel);
  if (!r || !r.w) return null;
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  await page.waitForTimeout(420);
  const d = await page.evaluate(() => { const P = window.__v619; return { buys: P.buys.slice(), nodes: P.nodes.slice(), max: P.max, blocked: P.blocked, toasts: P.toasts.slice() }; });
  const WIN = 55;                       /* 최소 틱 간격 60ms 보다 짧게 — 다음 강화의 발화를 훔쳐 세지 않는다 */
  const fires = d.nodes.filter(n => n.k === 'flash' || n.k === 'spark' || n.k === 'spend');
  const buys = d.buys.filter(b => b.kind === sp.id);
  let hit = 0;
  buys.forEach(b => { if (fires.some(f => f.t >= b.t - 12 && f.t <= b.t + WIN)) hit++; });
  return { buys: buys.length, hit, ratio: buys.length ? p2(hit / buys.length) : 0,
           fires: fires.length, max: d.max, blocked: d.blocked, toasts: d.toasts };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('[A] 선언 — 발화 부품 한 곳 · 세 자리가 그것을 부른다');
  ok(/function upFx\(key, host, cur, n\)\{/.test(code), 'A1 공용 부품 `upFx()` 가 선언돼 있다');
  ok(/const UPFX_N\s*=\s*\d+/.test(code) && /const UPFX_CAP\s*=\s*\d+/.test(code),
     'A2 풀·동시 상한 상수(UPFX_N · UPFX_CAP)가 있다', (code.match(/const UPFX_N\s*=\s*\d+, UPFX_CAP\s*=\s*\d+/) || code.match(/const UPFX_N[^\n]*/) || [''])[0].trim());
  ok(/upFx\('train:'/.test(code),  'A3 훈련 홀드 틱이 upFx 를 부른다');
  ok(/upFx\('rune:'/.test(code),   'A4 룬 홀드 시도가 upFx 를 부른다');
  ok(/upFx\('temper:'/.test(code), 'A5 단련 홀드 시도가 upFx 를 부른다');
  /* 두 벌 금지(402 규약) — 첫 발도 같은 부품을 지난다 */
  ok(/function rtFirstFx\(sel, cur, key\)\{[\s\S]{0,200}?upFx\(/.test(code),
     'A6 첫 발(`rtFirstFx`)도 같은 부품을 지난다 — 부품이 두 벌이 아니다');
  /* ③ 324 토스트 묶음은 손대지 않는다 */
  ok(/cpFxArm\(/.test(code) && /전투력/.test(code), 'A7 324 전투력 토스트 경로가 살아 있다');

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
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  /* ── [B]·[C]·[D] 실동작 ───────────────────────────────────────────── */
  console.log('\n[B] 실동작 — 강화 N 회 ↔ 발화 N 회 (홀드 ' + HOLD_MS + 'ms)');
  const res = {};
  for (const sp of SPOTS) {
    const d = await hold(page, sp);
    if (!d) { ok(false, 'B0 ' + sp.id + ' 대상이 없다', sp.sel); continue; }
    res[sp.id] = d;
    ok(d.buys >= 8, 'B1 ' + sp.id + ' 홀드가 연속으로 들어간다', '강화 ' + d.buys + '회');
    ok(d.ratio >= 0.95, 'B2 ' + sp.id + ' 강화마다 이펙트가 터진다(≥0.95)',
       d.hit + '/' + d.buys + ' = ' + d.ratio + (sp.id === 'rune' ? ' · 룬은 «성공» 축' : ''));
  }
  console.log('\n[C] 상한 — 발화가 조용히 빠지지 않는다 · 레이어가 안 막힌다');
  for (const sp of SPOTS) {
    const d = res[sp.id]; if (!d) continue;
    ok(d.blocked === 0, 'C1 ' + sp.id + ' 상한 때문에 빈 발화 0', '빈 발화 ' + d.blocked + '회');
    ok(d.max < 120, 'C2 ' + sp.id + ' `#fxl` 동시 노드 < FXMAX 120', '최대 ' + d.max);
  }
  console.log('\n[D] 324 불변 — 훈련 홀드의 전투력 토스트는 합계 1장');
  {
    const d = res.train;
    const cp = d ? d.toasts.filter(t => /전투력/.test(t.txt)) : [];
    ok(!!d && cp.length <= 1, 'D1 홀드 한 번에 전투력 토스트 ≤ 1장(324 묶음 설계 불변)',
       '토스트 ' + (d ? d.toasts.length : 0) + '장 중 전투력 ' + cp.length + '장');
  }
  ok(errs.length === 0, 'D2 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  /* ── [R] 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — `upFx` 를 무력화하면 [B2] 가 빨개진다');
  await page.evaluate(() => { window.__upFx0 = window.upFx; window.upFx = () => false; });
  const rv = {};
  for (const sp of SPOTS) rv[sp.id] = await hold(page, sp);
  await page.evaluate(() => { if (window.__upFx0) window.upFx = window.__upFx0; });
  for (const sp of SPOTS) {
    const d = rv[sp.id]; if (!d) continue;
    ok(d.ratio <= 0.2, 'R1 ' + sp.id + ' 무력화 사본은 발화가 사라진다(≤0.2)', d.hit + '/' + d.buys + ' = ' + d.ratio);
  }
  /* 되돌림이 «자를 무르게 잡아서» 통과한 게 아님을 못박는다 — 같은 자로 원본이 다시 초록이어야 한다 */
  {
    const d = await hold(page, SPOTS[0]);
    ok(!!d && d.ratio >= 0.95, 'R2 원복하면 같은 자로 다시 초록', d ? d.hit + '/' + d.buys + ' = ' + d.ratio : 'n/a');
  }

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
