#!/usr/bin/env node
/* 작업 635 재현기 — 「`verify619` [B1] 룬 항이 플레이키하다」
 *
 *   node tools/probe635.js            (기본 5 회 반복)
 *   PROBE635_RUNS=8 node tools/probe635.js
 *
 * 338 규칙 — 처방을 고르기 전에 **제품에게 직접 묻는다.**
 * 등재문의 가설은 «[B1] 이 확률 축에 절대 문턱을 댔다» 다. 그것이 참이라면
 *   ⑴ 같은 홀드에서 **시도 수**(`runeTry` 가 실제로 굴린 횟수 = 홀드 틱 수)는 **거의 안 흔들리고**
 *   ⑵ **성공 수**(`up`)만 실행마다 크게 갈리며
 *   ⑶ 훈련·단련은 확률이 없어 시도 = 성공이라 애초에 안 흔들린다
 * 는 세 가지가 한꺼번에 보여야 한다. 이 재현기는 그 셋을 같은 브라우저에서 잰다.
 *
 * ⚠ 제품(index.html)은 한 줄도 안 고친다 — 계측기만 심는다(verify619 의 ARM 과 같은 방식).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V619_HOLD || 2400);
const RUNS = Number(process.env.PROBE635_RUNS || 5);
const B1_MIN = 8;                       /* verify619 [B1] 의 현행 문턱 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련]' },
];

/* 계측기 — 세 자리 모두 «시도» 와 «성공» 을 따로 센다.
   룬은 `runeTry` 가 `{ ok, up }` 을 돌려주므로 ok = 시도(재화가 실제로 나갔다) · up = 성공.
   훈련·단련은 확률이 없어 호출 = 시도이고 반환값이 곧 성공이다. */
const ARM = () => {
  const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  const P = (window.__p635 = { train: { try: 0, up: 0 }, rune: { try: 0, up: 0 }, temper: { try: 0, up: 0 } });
  const wrap = (name, kind) => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a); P[kind].try++; if (r) P[kind].up++; return r; };
  };
  wrap('trainBuy', 'train');
  wrap('temperUpBtn', 'temper');
  /* ⚑ 701·797 이관(2026-09-02) — 홀드 틱이 지나는 «1회» 는 코어 `temperUpOne`·`runeTryOne` 이다.
     옛 이름(`temperUpBtn`·`runeTry`)은 죽지 않았지만 **막힌 첫 누름의 안내**로만 남아 홀드를 안 지난다
     ⇒ 옛 이름만 세면 이 재현기가 «시도 0» 을 찍는다(제품은 멀쩡하다). 홀드에서 둘은 배타적이라
     같은 장부에 더한다 — `verify349`·`verify488` 이 같은 처방으로 돌아왔다. */
  wrap('temperUpOne', 'temper');
  { const f = window.runeTryOne; if (typeof f === 'function') window.runeTryOne = function (...a) {
      const r = f.apply(this, a); P.rune.try++; if (r && r.up) P.rune.up++; return r; }; }

};

async function hold(page, sp) {
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
  await page.waitForTimeout(420);
  await page.evaluate(() => { const P = window.__p635; for (const k in P) { P[k].try = 0; P[k].up = 0; } });
  const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sp.sel);
  if (!r || !r.w) return null;
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  await page.waitForTimeout(420);
  return await page.evaluate(k => ({ ...window.__p635[k] }), sp.id);
}

const spread = a => Math.max(...a) - Math.min(...a);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
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

  const T = { train: { try: [], up: [] }, rune: { try: [], up: [] }, temper: { try: [], up: [] } };
  console.log('[1] 반복 홀드 ' + RUNS + '회 (홀드 ' + HOLD_MS + 'ms) — 시도 수 vs 성공 수');
  for (let i = 0; i < RUNS; i++) {
    const line = [];
    for (const sp of SPOTS) {
      const d = await hold(page, sp);
      if (!d) { line.push(sp.id + ' n/a'); continue; }
      T[sp.id].try.push(d.try); T[sp.id].up.push(d.up);
      line.push(sp.id + ' 시도 ' + d.try + ' · 성공 ' + d.up);
    }
    console.log('  r' + (i + 1) + ' — ' + line.join(' | '));
  }

  console.log('\n[2] 축 대조 — 어느 축이 흔들리는가');
  for (const sp of SPOTS) {
    const t = T[sp.id].try, u = T[sp.id].up;
    console.log('  ' + sp.id.padEnd(7) + ' 시도 [' + t.join(' ') + '] 폭 ' + spread(t)
              + '  ·  성공 [' + u.join(' ') + '] 폭 ' + spread(u));
  }

  const R = T.rune;
  /* ⑴ 시도 축은 결정적이다 — 홀드 틱 수라 실행마다 거의 같다 */
  ok(spread(R.try) <= 3, '1 룬 «시도» 축은 흔들리지 않는다(폭 ≤ 3)', '시도 폭 ' + spread(R.try) + ' [' + R.try.join(' ') + ']');
  /* ⑵ 성공 축은 확률이라 크게 갈린다 — [B1] 이 대고 있는 축이 이것이다 */
  ok(spread(R.up) >= 3, '2 룬 «성공» 축은 실행마다 갈린다(폭 ≥ 3)', '성공 폭 ' + spread(R.up) + ' [' + R.up.join(' ') + ']');
  /* ⑶ 그래서 현행 [B1] 문턱(성공 ≥ 8)은 «홀드가 들어갔는데도» 미달이 나온다 */
  const under = R.up.filter(n => n < B1_MIN).length;
  ok(under > 0 || Math.min(...R.up) - B1_MIN < 3,
     '3 현행 문턱(성공 ≥ ' + B1_MIN + ')은 여유가 없다 — 미달 또는 문턱에 붙는다',
     '미달 ' + under + '/' + RUNS + ' · 최저 성공 ' + Math.min(...R.up));
  /* ⑷ 같은 홀드에서 시도는 항상 문턱을 크게 넘는다 = 뜻(«연속으로 들어간다»)은 언제나 참이었다 */
  ok(Math.min(...R.try) >= B1_MIN + 5,
     '4 같은 홀드의 «시도» 는 문턱을 넉넉히 넘는다 — 결손은 제품이 아니라 자의 축이다',
     '최저 시도 ' + Math.min(...R.try) + ' vs 문턱 ' + B1_MIN);
  /* ⑸ 훈련·단련은 확률이 없어 두 축이 같다 — 그래서 안 흔들린다(룬만 갈라진 이유) */
  ok(T.train.try.every((v, i) => v === T.train.up[i]) && T.temper.try.every((v, i) => v === T.temper.up[i]),
     '5 훈련·단련은 시도 = 성공(확률 판정이 없다) — 룬만 축이 어긋난다',
     'train ' + T.train.try.join('/') + ' · temper ' + T.temper.try.join('/'));
  /* ⑹ 룬은 그 둘이 다르다 — 확률이 끼어 있다는 직접 증거 */
  ok(R.try.some((v, i) => v > R.up[i]),
     '6 룬은 시도 > 성공인 실행이 있다 — 확률 판정이 [B1] 의 분자를 깎는다',
     R.try.map((v, i) => v + '>' + R.up[i]).join(' '));

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
