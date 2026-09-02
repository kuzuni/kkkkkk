#!/usr/bin/env node
/* 작업 619 — 「연속 강화 때 이펙트가 매번 터져야 한다 — 훈련·단련·룬 전부」 **재현**
 * (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다.)
 *
 *   node tools/probe619.js
 *
 * 등재문의 읽기는 «연타·꾹누르기(64 홀드)로 강화가 연속으로 들어갈 때 이펙트가 매 강화마다
 * 터져야 하는데 처음 한 번만/간헐로 터지거나 스로틀에 먹힌다» 이다.
 * 그러면 결손이 실재하는지는 **한 수치**로 갈린다 — 「강화 N 회 ↔ 이펙트 발화 M 회」의 M/N.
 *
 * 재는 방법(자를 제품 함수 이름이 아니라 **찍힌 노드**에 댄다):
 *   ⓐ 강화 횟수 N — 결제 함수(`trainBuy`·`runeBuy`·`temperUpBtn`)를 감싸 «성공한 호출» 을 센다.
 *      (홀드 틱과 1:1 인지도 여기서 갈린다 — 틱은 세지 않고 «실제로 오른 횟수» 를 센다)
 *   ⓑ 발화 횟수 M — `#fxl` 에 MutationObserver 를 걸어 **새로 붙은 노드**를 클래스로 가른다:
 *        fx-flash(흰 플래시) · fx-spark(파티클) · fx-fly.fx-spd(화폐 알갱이) · fx-plus(플로터/맥박 사다리)
 *      함수를 감싸지 않는 이유: `fxBurst`/`fxSpend` 는 상한(FXMAX)·스로틀에서 **조용히 빠진다** —
 *      호출 횟수를 세면 «불렀다» 가 «터졌다» 로 읽혀 헛초록이 된다(350 «찍힌 픽셀로 물어라» 의 DOM 판).
 *   ⓒ 그 발화가 «몇 번째 강화» 에 붙었는가 — 강화 시각과 노드 시각을 맞춰 **강화당 발화 여부**를 센다.
 *      M/N 이 아니라 «발화가 붙은 강화의 비율» 이 주인이 보는 것이다(한 강화에 열 개가 몰려도 눈은 한 번이다).
 *   ⓓ 상한 압력 — 홀드 동안 `#fxl` 자식 수의 최대값(FXMAX 120 대비)과 «상한 때문에 빠진» 발화 수.
 *
 * 세 자리를 같은 자로 재고(훈련 카드 · 룬 [강화] · 단련 [단련]) 대조군으로 **첫 발** 도 따로 적는다 —
 * 「처음 한 번만 터진다」가 사실이면 첫 발은 1.0 이고 반복분만 0 근처여야 한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P619_HOLD || 2600);   /* 64 홀드: 350ms 뒤부터 160→60ms 가속 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p2 = n => Math.round(n * 100) / 100;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',        n: '23 훈련 카드(64 홀드)' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',          n: '룬 [강화](297 홀드)' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb',   n: '단련 [단련](297 홀드)' },
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  /* ── 계측기: 결제 함수 감싸기 + #fxl 감시 ── */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';   /* 전투 캔버스가 프레임을 먹지 않게 */
    window.__p619 = { buys: [], nodes: [], max: 0 };
    const P = window.__p619;
    const wrap = (name, kind, okOf) => {
      const f = window[name]; if (typeof f !== 'function') return;
      window[name] = function (...a) {
        const r = f.apply(this, a);
        if (okOf(r)) P.buys.push({ kind, t: performance.now() });
        return r;
      };
    };
    wrap('trainBuy',    'train',  r => !!r);
    wrap('runeBuy',     'rune',   () => true);       /* 룬은 확률이라 «시도» 와 «성공» 을 따로 센다 */
    wrap('temperUpBtn', 'temper', r => !!r);
    /* ⚑ 701·797 이관(2026-09-02) — «1회» 함수가 코어와 «막힌 첫 누름의 안내» 로 갈렸다
       (룬 `runeTryOne` + `runeBuy` · 단련 `temperUpOne` + `temperUpBtn`). 홀드 틱은 이제 코어만
       지나므로 옛 이름만 세면 이 재현기가 «강화 0회» 를 찍는다(제품은 멀쩡하다).
       ⚠ 둘은 홀드에서 배타적이라(막히면 코어에 못 간다) **같은 장부에 더한다** —
         `verify349`·`verify488` 이 같은 처방으로 돌아왔다. */
    wrap('runeTryOne',   'rune',   () => true);
    wrap('temperUpOne',  'temper', () => true);
    /* 룬 «성공»(레벨이 실제로 오른 시도) — 코어 `runeTryOne` 이 {up, lv, rate, cost} 를 돌려준다.
       ⚠ `runeTry`(=배치 1회 래퍼)도 계속 살아 있지만 홀드는 그것을 안 지난다 — 성공 축도 코어로 옮긴다. */
    {
      const f = window.runeTryOne;
      if (typeof f === 'function') window.runeTryOne = function (...a) {
        const r = f.apply(this, a);
        if (r && r.up) P.buys.push({ kind: 'rune-up', t: performance.now() });
        return r;
      };
    }
    const L = document.getElementById('fxl');
    const kindOf = el => {
      const c = (el.className || '') + '';
      if (/fx-flash/.test(c)) return 'flash';
      if (/fx-spark/.test(c)) return 'spark';
      if (/fx-spd/.test(c))   return 'spend';
      if (/fx-plus/.test(c))  return 'float';
      if (/fx-toast/.test(c)) return 'toast';
      return 'etc';
    };
    new MutationObserver(ms => {
      const t = performance.now();
      for (const m of ms) for (const nd of m.addedNodes) {
        if (nd.nodeType !== 1) continue;
        P.nodes.push({ k: kindOf(nd), t });
      }
      if (L.childElementCount > P.max) P.max = L.childElementCount;
    }).observe(L, { childList: true });
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  const out = [];
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(450);
    await page.evaluate(() => { window.__p619.buys.length = 0; window.__p619.nodes.length = 0; window.__p619.max = 0; });

    const r = await page.evaluate(sel => {
      const el = document.querySelector(sel); if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!r || !r.w) { ok(false, sp.id + ' 대상 없음', sp.sel); continue; }

    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    await page.waitForTimeout(500);

    const d = await page.evaluate(() => {
      const P = window.__p619;
      return { buys: P.buys.slice(), nodes: P.nodes.slice(), max: P.max };
    });

    /* «강화당 발화» — 강화 시각 뒤 창(WIN) 안에 flash/spark/spend 가 하나라도 붙었는가 */
    const WIN = 55;                     /* 최소 틱 간격 60ms 보다 짧게 — 다음 강화의 발화를 훔쳐 세지 않는다 */
    const fires = d.nodes.filter(n => n.k === 'flash' || n.k === 'spark' || n.k === 'spend');
    const floats = d.nodes.filter(n => n.k === 'float');
    const buys = d.buys.filter(b => b.kind === sp.id);
    let hit = 0, firstHit = 0;
    buys.forEach((b, i) => {
      const has = fires.some(f => f.t >= b.t - 12 && f.t <= b.t + WIN);
      if (has) { hit++; if (i === 0) firstHit = 1; }
    });
    const rep = buys.length - 1;                              /* 반복분(첫 발 제외) */
    const repHit = hit - firstHit;
    /* ⚑ 룬만 «강화» 의 뜻이 다르다 — 확률 판정이라 시도 ≠ 강화다. 레벨이 실제로 오른 시도(성공)를
       따로 세고 그 축으로도 본다: 성공 세트(플래시+파티클)를 실패에 얹으면 «레벨이 올랐다» 는
       거짓 신호가 되므로 제품은 성공에만 건다(실패의 회당 피드백은 흔들림·«실패» 플로터다). */
    const ups = d.buys.filter(b => b.kind === 'rune-up');
    let upHit = 0;
    ups.forEach(b => { if (fires.some(f => f.t >= b.t - 12 && f.t <= b.t + WIN)) upHit++; });
    out.push({ id: sp.id, n: sp.n, buys: buys.length, hit, firstHit, rep, repHit,
               ratio: buys.length ? p2(hit / buys.length) : 0,
               repRatio: rep > 0 ? p2(repHit / rep) : 0,
               ups: ups.length, upHit, upRatio: ups.length ? p2(upHit / ups.length) : 0,
               fires: fires.length, floats: floats.length, max: d.max });
  }

  console.log('\n── [A] 강화 ↔ 이펙트 발화 (홀드 ' + HOLD_MS + 'ms) ─────────────────────');
  console.log('  자리            강화N  발화붙은강화  비율   첫발  반복N  반복발화  반복비율  fx노드  플로터  #fxl최대');
  for (const o of out) {
    console.log('  ' + o.id.padEnd(14) + String(o.buys).padStart(5) + String(o.hit).padStart(13)
      + String(o.ratio).padStart(8) + String(o.firstHit).padStart(6) + String(o.rep).padStart(7)
      + String(o.repHit).padStart(10) + String(o.repRatio).padStart(10)
      + String(o.fires).padStart(8) + String(o.floats).padStart(8) + String(o.max).padStart(10));
  }
  console.log('');

  for (const o of out) {
    ok(o.buys >= 5, o.id + ' 홀드가 실제로 연속 강화됐다', '강화 ' + o.buys + '회');
  }
  /* 이 셋은 «수리 전에는 빨간 것이 정상» 이다 — 재현이 등재문을 확인하는 자리 */
  for (const o of out) {
    if (o.id === 'rune') {
      console.log('  [i] 룬 성공(레벨 상승) ' + o.ups + '회 중 발화 ' + o.upHit + ' (' + o.upRatio + ') — 이 축이 룬의 «강화 ↔ 발화» 다');
      ok(o.upRatio >= 0.95, o.id + ' 성공한 강화마다 이펙트가 터진다(목표 ≥0.95)',
         '성공 ' + o.ups + '회 중 ' + o.upHit + ' (' + o.upRatio + ')');
      continue;
    }
    ok(o.repRatio >= 0.95, o.id + ' 반복분도 강화마다 이펙트가 터진다(목표 ≥0.95)',
       '반복 ' + o.rep + '회 중 ' + o.repHit + ' (' + o.repRatio + ')');
  }
  ok(errs.length === 0, '콘솔 에러 0', errs.slice(0, 3).join(' | '));

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
