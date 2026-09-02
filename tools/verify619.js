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
 *                ⚑ 635 — **[B1] 과 [B2] 는 축이 다르다.** [B1] 이 묻는 것은 «홀드가 연속으로
 *                들어가는가» = **시도 수**(결정적 · 홀드 틱 수)이고, [B2] 가 묻는 것은 «오른 만큼
 *                터지는가» = **성공 축**(비율이라 분모·분자가 같이 움직인다). 룬만 둘이 갈라지는데
 *                [B1] 이 성공 수에 절대 문턱을 대고 있어 자가 흔들렸다 — 축을 시도로 옮겼다(§635).
 *   [C] 상한  — 발화가 **상한 때문에 조용히 빠지는 일이 0** 이고, `#fxl` 동시 노드가 FXMAX 밑에 있다
 *   [D] 324 불변 — 훈련 홀드의 전투력 토스트는 종전대로 **합계 1장**(주인 승인 설계를 안 건드렸다)
 *   [R] 되돌림 — `upFx` 를 무력화한 사본에서는 [B] 가 **빨개진다**(무르게 푼 수리가 아님을 못박는다)
 *
 * ⚠ 발화는 «함수를 불렀는가» 가 아니라 **`#fxl` 에 붙은 노드**로 센다 — `fxBurst`/`fxSpend` 는
 *   상한·스로틀에서 조용히 빠지므로 호출 횟수로 세면 헛초록이 된다(350 «찍힌 픽셀로 물어라» 의 DOM 판).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { holdUntil } = require('./holdburst');     /* 785 — 홀드 표본 문턱 공용 부품 */
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
/* ⚑ 785 — [B1] 의 «시도 ≥ 8» 은 문턱이고, 2400ms 는 그 문턱을 **러너 틱 속도**에 묶는 값이었다
   (제품 설계 6~16회/초 ↔ 이 러너 실측 2회/초 — `probe785`). 이제 표본이 찰 때까지 누르고
   시간은 «바닥»(빠른 기계에서 종전과 같은 시간)과 «상한» 으로만 쓴다. */
const HOLD_MS = Number(process.env.V619_HOLD || 2400);
const NEED = Number(process.env.V619_NEED || 8), HOLD_MAX = 30000;

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
  /* 635 — `buys`(성공, [B2] 의 분모) 와 `tries`(시도, [B1] 의 축)를 **따로** 센다.
     훈련·단련은 확률 판정이 없어 둘이 같은 수이고, 룬만 갈라진다. */
  const P = (window.__v619 = { buys: [], tries: [], nodes: [], max: 0, blocked: 0, toasts: [], up: 0 });
  const wrap = (name, kind, okOf) => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a); const t = performance.now();
      P.tries.push({ kind, t }); if (okOf(r)) P.buys.push({ kind, t }); return r; };
  };
  /* ⚑ 701 이관(2026-09-02) — **관측점을 코어로 옮겼다.** 701 이 배수 토글을 놓으면서 «한 번 강화»
     를 `temperUpOne`/`runeTryOne` 이라는 코어로 갈랐고(×N 은 그 코어의 반복이다), 홀드 틱은
     이제 `temperUpBtn`/`runeBuy`/`runeTry` 를 안 지난다 — 옛 관측점 그대로 두면 이 자는
     «시도 0회» 로 빨개진다(제품이 멀쩡한데 자만 못 따라가는 게이트 부패다).
     ⚠ **묻는 것은 한 글자도 안 바뀌었다** — 이 자는 배수 ×1(기본값)에서 돌고, ×1 에서는
       «코어 호출 1회 = 틱 1회 = 강화 1회» 라 축이 전과 정확히 같다. 배수를 켠 상태의 반대편
       («틱 1회 = 버스트 1회» — 강화 N회여도 발화는 1회)은 주인 지시라 `verify701` [G] 가 맡는다. */
  wrap('trainBuy',    'train',  r => !!r);
  wrap('temperUpOne', 'temper', r => !!r);   /* 701 이관 — 코어(비용을 돌려준다 · 0 이 아니면 실제로 올랐다) */
  /* 룬 — `runeTry` 는 `{ ok, up }` 을 돌려준다. `ok` = 재화가 실제로 나간 **시도** · `up` = **성공**.
     막힌 호출(`{ ok:false }` — 재화 부족·만렙)은 시도로도 안 센다(헛초록 방지). */
  { const f = window.runeTryOne; if (typeof f === 'function') window.runeTryOne = function (...a) {
      const r = f.apply(this, a); const t = performance.now();
      /* 701 이관 — 코어는 «막힌 호출» 자체가 없다(부르는 쪽이 `runeTryOk` 로 걸러 준다) ⇒ 부른 것이 곧 시도다. */
      P.tries.push({ kind: 'rune', t }); if (r && r.up) P.buys.push({ kind: 'rune', t });
      return r; }; }
  /* [C] — 상한 때문에 «아무것도 안 붙은» 발화를 센다(upFx 가 false 를 돌린 횟수) */
  { const f = window.upFx; if (typeof f === 'function') window.upFx = function (...a) {
      const r = f.apply(this, a); if (!r) P.blocked++; return r; }; }
  /* ⚑ 770 — **손 뗌 시각**을 적는다. 아래 [B2]·[R] 의 «강화 경계 분할» 에서 마지막 강화의 구간이
     열려 있으면 홀드가 **끝난 뒤** 도는 정산 연출(`trHoldStop` 의 `fxUpOk` 한 세트)이 그 강화의
     발화로 세어진다 — 실제로 `R1`(무력화 사본)이 1/N 에서 2/N 으로 올라가 그만큼 무른 자가 됐다.
     ⚠ **캡처 단계**라 앱의 손 뗌 처리(그 정산 연출)보다 반드시 먼저 찍힌다. */
  addEventListener('pointerup', () => { P.up = performance.now(); }, true);
  addEventListener('mouseup', () => { if (!P.up) P.up = performance.now(); }, true);
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

async function hold(page, sp, opt) {
  const tapOnly = !!(opt && opt.tap);      /* 635 [R3] — 홀드 대신 «한 번 클릭» (되돌림 시험) */
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
  await page.waitForTimeout(420);
  await page.evaluate(() => { const P = window.__v619; P.buys.length = 0; P.tries.length = 0; P.nodes.length = 0; P.toasts.length = 0; P.max = 0; P.blocked = 0; P.up = 0; });
  const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sp.sel);
  if (!r || !r.w) return null;
  /* 785 — «한 번 클릭»([R3] 되돌림)은 그대로 20ms 다. 홀드만 «표본이 찰 때까지» 로 바뀐다 —
     세는 것은 그 자리의 **시도 수**([B1] 의 축 · 635 규약)이고, 문턱은 한 칸도 안 내렸다. */
  if (tapOnly) {
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(20);
    await page.mouse.up();
    await page.waitForTimeout(420);
  } else {
    await holdUntil(page, { at: { x: r.x + r.w / 2, y: r.y + r.h / 2 },
                            need: (opt && opt.need) || NEED, minMs: HOLD_MS, maxMs: HOLD_MAX, settleMs: 420,
                            count: k => window.__v619.tries.filter(t => t.kind === k).length,
                            countArg: sp.id, mode: 'mouse' });
  }
  const d = await page.evaluate(() => { const P = window.__v619; return { buys: P.buys.slice(), tries: P.tries.slice(), nodes: P.nodes.slice(), max: P.max, blocked: P.blocked, toasts: P.toasts.slice(), up: P.up }; });
  const fires = d.nodes.filter(n => n.k === 'flash' || n.k === 'spark' || n.k === 'spend');
  const buys = d.buys.filter(b => b.kind === sp.id);
  const tries = d.tries.filter(b => b.kind === sp.id);
  /* ⚑ 770 — 「강화 N 회 ↔ 발화 N 회」를 **시계가 아니라 순서**로 잰다.
     종전 축은 «강화 시각 +55ms 안에 노드가 붙었는가» 였고, 그 55 는 «최소 틱 간격 60ms 보다 짧게 —
     다음 강화의 발화를 훔쳐 세지 않는다» 는 이유로 고른 값이다. 뜻(«그 강화의 발화인가»)은 순서인데
     자는 **벽시계**에 묶여 있었고, 그래서 멈춤 프레임 한 번에 [R2] 가 4회 중 1~2회 빨갰다.
     `probe770` 재현이 그 빠진 강화를 이름으로 찍었다 — `upFx` 는 **true 를 돌렸고**(노드도 붙었다)
     그 호출 자체가 **60.6ms** 걸렸다(앞뒤 틱 간격 268.7·336.9ms = 그 프레임이 통째로 멈췄다).
     발화는 **같은 틱 안**에 있었고 창 밖으로 밀린 것뿐이다 — 제품은 한 번도 안 빠뜨렸다.
     ⇒ 노드를 **강화 경계로 분할**한다: 강화 i 는 `[b_i − BACK, b_{i+1} − BACK)` 구간의 노드를 갖는다.
     ⚠ **무르게 푼 것이 아니라 좁혔다** — 55ms 창은 다음 강화 시각을 넘어설 수 있어(틱 간격이
       60ms 밑으로 내려가면) 한 발화가 두 강화에 세어질 여지가 있었지만, 분할은 한 노드의 임자가
       **정확히 하나**다. 「훔쳐 세지 않는다」가 상수가 아니라 **구조**로 지켜진다.
     ⚠ 문턱(0.95·0.2)은 **한 칸도 안 건드렸다**(334 규약). 이 축이 헛초록이 아님은 아래 [R2b]
       (틱 하나 걸러 발화를 죽이면 0.5 로 무너진다)가 못박는다. 재현기는 `tools/probe770.js`. */
  const BACK = 12;   /* 관측 콜백이 강화 기록보다 살짝 앞설 수 있는 여유 — 경계 자체를 이만큼 당긴다 */
  let hit = 0;
  buys.forEach((b, i) => {
    /* 마지막 강화의 구간은 **손 뗌**에서 닫는다 — 정산 연출(`trHoldStop` 의 `fxUpOk`)은 틱이 아니다 */
    const lo = b.t - BACK, hi = (i + 1 < buys.length) ? buys[i + 1].t - BACK : (d.up || Infinity);
    if (fires.some(f => f.t >= lo && f.t < hi)) hit++;
  });
  return { buys: buys.length, tries: tries.length, hit, ratio: buys.length ? p2(hit / buys.length) : 0,
           fires: fires.length, max: d.max, blocked: d.blocked, toasts: d.toasts };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('[A] 선언 — 발화 부품 한 곳 · 세 자리가 그것을 부른다');
  /* ⚑ 14회차 — 여섯째 인자 `iv`(틱 간격)를 **서명에 박는다**. 느슨하게 푼 것이 아니라 **좁힌** 것이다:
     13회차 채점의 두 「8점을 막는 단 하나」(«회당 연출이 틱을 넘겨 산다»)를 닫은 축이 이 인자이고,
     이것이 사라지면 플래시·스파크가 다시 단발 상수(.34s/.38s)로 돌아 홀드 내내 켜진다. */
  ok(/function upFx\(key, host, cur, n, noFlash, iv\)\{/.test(code), 'A1 공용 부품 `upFx()` 가 선언돼 있다(틱 간격 `iv` 를 받는다)');
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
    /* ⚑ 635 — [B1] 의 축은 **시도 수**다(성공 수가 아니다).
       뜻이 «홀드가 연속으로 들어간다» 이므로 세야 하는 것은 홀드 틱이 실제로 굴린 횟수이고,
       그 값은 결정적이다(`probe635` 실측: 룬 시도 18·21·20·21·19 = 폭 3).
       성공 수로 세던 종전 축은 `runeRate` 가 레벨과 함께 **0.90 → 0.05 로 감쇠**하는 값이라
       같은 홀드에서 9·5·2·1·1 로 무너졌다(폭 8) — 문턱 8 에 여유가 없어 자가 흔들렸다.
       ⚠ 문턱은 **한 칸도 안 내렸다**(334 규약) — 8 그대로이고 축만 옮겼다. 무르게 푼 것이
       아님은 [R3] 이 못박는다(클릭 한 번이면 시도 = 1 이라 이 항이 빨개진다). */
    ok(d.tries >= 8, 'B1 ' + sp.id + ' 홀드가 연속으로 들어간다', '시도 ' + d.tries + '회'
       + (sp.id === 'rune' ? ' (성공 ' + d.buys + '회 — 룬은 확률 판정이라 시도 축으로 센다)' : ''));
    ok(d.ratio >= 0.95, 'B2 ' + sp.id + ' 강화마다 이펙트가 터진다(≥0.95)',
       d.hit + '/' + d.buys + ' = ' + d.ratio + (sp.id === 'rune' ? ' · 룬은 «성공» 축' : ''));
  }
  /* 635 — [B2] 의 분모가 «한 자리 표본» 이 아님을 못박는다([E1] 과 같은 꼴의 표본 항).
     룬만 확률이라 분모가 줄어들 수 있고, 분모가 1 이면 비율이 0/1 두 값밖에 못 갖는다.
     문턱 3 의 근거: 이 홀드는 **Lv0 에서 시작**해 초반 곡선(0.90 → …)을 타므로 기대 성공은 ≈8 이다
     (`probe635` 첫 홀드 실측 9) — 2.7 배 여유다. 종전 [B1] 의 문턱 8 은 그 기대값과 같은 자리라
     여유가 1.0 배였고, 그래서 절반이 빨갰다. */
  {
    const d = res.rune;
    ok(!!d && d.buys >= 3, 'B3 룬 — [B2] 의 «성공» 표본이 비율을 잴 만큼 있다(≥3)',
       d ? '성공 ' + d.buys + '/' + d.tries + '회' : 'n/a');
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

  /* ── [E] 가독성 — 회당 파티클이 «호스트 자기 글자» 위에 앉지 않는다 ───────── */
  /* 비평가 DN·DO 가 2인 공통 ③ 으로 낸 축이다(「Lv. 라벨의 L 을 덮는다」 · 실측 스파크의 36%).
     한 번 터지는 자리에서는 42회차의 «각도만 굴린다» 로 충분했지만 619 는 초당 6회라 같은 확률이
     «수치가 계속 가려진다» 로 읽힌다. 그래서 자를 **찍힌 자리**로 댄다 — 겹친 스파크의 비율. */
  console.log('\n[E] 가독성 — 회당 스파크가 호스트 글자 위에 앉는 비율');
  const overlapRun = async () => {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, 'train');
    await page.waitForTimeout(420);
    const r = await page.evaluate(() => { const e = document.querySelector('#trCards [data-tr]');
      const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    await page.mouse.move(r.x, r.y);
    await page.mouse.down();
    const out = await page.evaluate(async () => {
      const card = document.querySelector('#trCards [data-tr]'), L = document.getElementById('fxl');
      /* ⚑⚑ 660 이관 — **«카드 글자» 에서 «강화 버튼 자기 라벨» 을 뺀다.**
         이 축의 뜻은 «파티클이 카드의 **정보**를 가리지 마라» 이고(4·8회차), 그 전제는 파티클이
         카드 **넓은 면**에 흩어진다는 것이었다. 660 이 주인 지시로 스폰을 **강화 버튼 안**으로
         못 박으면서(«스폰 위치는 강화 버튼뿐 · 아이콘쪽에 이펙트 안뜨게») 그 전제가 바뀌었다 —
         버튼 라벨 위에 앉는 것은 이제 **결함이 아니라 지시**다.
         ⇒ 자리를 비우지 않고 **대상을 좁힌다**(333) — 여전히 가리면 안 되는 것들
         (레벨 헤더 `.ch` · 수치 행 `.cv` · 이름 `.cn` · 진행바)은 그대로 세고, 버스트 호스트
         (`--burst-to` 가 가리키는 그 버튼) 안의 글자만 뺀다. 문턱 5% 는 **한 칸도 안 넓혔다**.
         ⚠ 되돌림도 같이 옮겼다(아래 E3) — «`strict` 무시» 는 660 이 아이콘 버스트에서 글자
           구멍을 안 파게 하면서 축을 잃었다. 지금 겹침을 되살리는 한 값은 **`--burst-to`** 다. */
      const bsel = (getComputedStyle(card).getPropertyValue('--burst-to') || '').trim();
      const bhost = bsel ? card.querySelector(bsel) : null;
      const rects = () => { const o = [], rg = document.createRange();
        for (const el of [card, ...card.querySelectorAll('*')]) {
          if (bhost && (el === bhost || bhost.contains(el))) continue;   /* 660 — 버스트 호스트 자기 라벨은 뺀다 */
          let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { has = true; break; }
          if (!has) continue; rg.selectNodeContents(el); const b = rg.getBoundingClientRect();
          if (b.width && b.height) o.push(b); }
        return o; };
      const seen = new Set(); let n = 0, ov = 0;
      for (let i = 0; i < 12; i++) {
        await new Promise(z => setTimeout(z, 120));
        const T = rects();
        for (const nd of L.children) {
          if (seen.has(nd) || !/fx-spark/.test((nd.className || '') + '')) continue;
          seen.add(nd); n++;
          const b = nd.getBoundingClientRect();
          if (T.some(t => Math.min(b.right, t.right) - Math.max(b.left, t.left) > 0
                       && Math.min(b.bottom, t.bottom) - Math.max(b.top, t.top) > 0)) ov++;
        }
      }
      return { n, ov };
    });
    await page.mouse.up();
    await page.waitForTimeout(350);
    return out;
  };
  const E = await overlapRun();
  ok(E.n >= 20, 'E1 표본이 있다 — 홀드 동안 스파크가 실제로 뜬다(연출이 «없어서» 안 겹치는 게 아니다)', '스파크 ' + E.n + '개');
  ok(E.n > 0 && E.ov / E.n <= 0.05,
     'E2 ★ 그 파티클이 카드 **정보** 글자 위에 앉는 비율 ≤ 5%(660 이관 — 강화 버튼 자기 라벨 제외)',
     E.ov + '/' + E.n + ' = ' + p2(E.n ? E.ov / E.n : 0));
  /* 되돌림 — `--burst-to` 를 지우면 버스트가 카드 전체로 흩어져 겹침이 되살아난다
     (위 항이 «이미 참인 것» 이 아님을 못박는다 · 660 이관 전에는 «`strict` 무시» 가 이 자리였다) */
  /* ⚑ 20회차 이관 — **`--burst-keep` 도 같이 끈다.** 이 되돌림이 묻는 것은 «스폰이 카드 전체로
     흩어지면 겹침이 되살아나는가» 하나인데, 816 이 `.tr-card` 에 건 `--burst-keep:i` 가 켜진
     채로는 그 사본에서 셀렉터가 **카드의 모든 `i`** 에 걸려(호스트가 카드이므로) 파티클이 글자를
     피해 **0.09** 로 내려간다 — 항이 «스폰 자리» 가 아니라 «816 의 구멍» 을 재게 된다(축이 둘 섞인다).
     ⇒ 항을 지우지 않고 **사본을 이 항의 주장 그대로** 만든다(333 처방). 816 구멍 자신의 되돌림은
        `tools/verify816.js` 가 이미 따로 묻는다 — 축 하나에 자 하나. */
  await page.addStyleTag({ content: '.tr-card{--burst-to:initial;--burst-keep:initial}' });
  const E0 = await overlapRun();
  ok(E0.n > 0 && E0.ov / E0.n >= 0.15,
     'E3 ★ 되돌림 — `--burst-to` 를 지우면(= 스폰이 카드 전체로) 겹침이 되살아난다(≥0.15)',
     E0.ov + '/' + E0.n + ' = ' + p2(E0.n ? E0.ov / E0.n : 0));

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
  /* ⚑ 770 — **살 것을 먼저 되돌려 놓는다.** 이 자리까지 훈련 카드가 다섯 번 홀드돼(그 [B]·[E]·[R])
     단계 상한 100 에 바짝 붙는다 — [K] 머리말이 적어 둔 «[R2] 가 살 것이 없어 0/0 으로 빨개졌다
     (3회 중 2회)» 가 그 자리다. 순서를 바꿔 한 번 피했지만 **여유가 몇 레벨뿐이라** 언제든 재발한다.
     레벨을 0 으로 되돌리면 [R2] 는 «원복하면 초록인가» 만 묻게 된다(자·문턱은 그대로).
     ⚠ 이것은 «자를 무르게» 가 아니라 **다른 자(상한)를 자리에서 치우는 것**이다 — 상한이 실제로
       빨개져야 할 자리는 [C1](빈 발화)이고 그 축은 안 건드렸다. 표본 유무는 [R2s] 가 따로 묻는다. */
  const trResetLv = () => page.evaluate(() => {
    const el = document.querySelector('#trCards [data-tr]'); const k = el && el.dataset.tr;
    if (k && S.lv) S.lv[k] = 0;
    S.gold = 1e18; if (typeof renderTrain === 'function') renderTrain();
  });
  await trResetLv();
  {
    const d = await hold(page, SPOTS[0]);
    ok(!!d && d.buys >= 8, 'R2s 표본이 있다 — [R2] 홀드가 실제로 강화를 굴렸다(≥8 · 0/0 을 초록·빨강 어느 쪽으로도 안 읽는다)',
       d ? '강화 ' + d.buys + '회 / 시도 ' + d.tries + '회' : 'n/a');
    ok(!!d && d.ratio >= 0.95, 'R2 원복하면 같은 자로 다시 초록', d ? d.hit + '/' + d.buys + ' = ' + d.ratio : 'n/a');
  }
  /* ⚑⚑ 770 [R2b] — **새 축(강화 경계 분할)이 «무르게 잡은 자» 가 아님을 못박는다.**
     틱 하나 걸러 `upFx` 를 죽이면(노드가 안 붙는다) 절반의 강화가 임자 노드를 못 갖는다.
     ⚠ 첫 발은 `trHoldStart` 의 `fxUpOk` 가 따로 터뜨리므로 항상 맞는다 — 그래서 기대값은 ≈0.5 이고
       문턱을 0.7 에 둔다(0.95 축이 이 사본을 통과하면 그 축은 아무것도 안 묻는 것이다). */
  console.log('\n[R2b] 되돌림 — 틱 하나 걸러 발화를 죽이면 새 축(강화 경계 분할)이 빨개진다');
  await trResetLv();
  await page.evaluate(() => { const f = window.upFx; window.__upFxAlt = f; let k = 0;
    window.upFx = function (...a) { return (k++ % 2) ? f.apply(this, a) : false; }; });
  {
    const d = await hold(page, SPOTS[0]);
    ok(!!d && d.buys >= 8, 'R2b-s 표본이 있다 — 반쪽 사본도 강화는 굴렸다(≥8)', d ? '강화 ' + d.buys + '회' : 'n/a');
    ok(!!d && d.ratio <= 0.7, 'R2b ★ 틱 하나 걸러 죽인 사본은 [R2] 축이 무너진다(≤0.7)',
       d ? d.hit + '/' + d.buys + ' = ' + d.ratio : 'n/a');
  }
  await page.evaluate(() => { if (window.__upFxAlt) window.upFx = window.__upFxAlt; });
  await trResetLv();
  {
    const d = await hold(page, SPOTS[0]);
    ok(!!d && d.ratio >= 0.95, 'R2c 원복하면 같은 자로 다시 초록(R2b 가 자를 안 남겼음을 못박는다)',
       d ? d.hit + '/' + d.buys + ' = ' + d.ratio : 'n/a');
  }
  /* ⚑ 635 [R3] — 새 [B1] 축이 «무르게 잡은 자» 가 아님을 못박는다.
     시도 축으로 옮겼으니 «홀드가 아예 안 반복되면» 빨개져야 한다 — 홀드 대신 **한 번 클릭**하면
     시도는 1(첫 발)이라 문턱 8 을 못 넘는다. 세 자리 전부에서 확인한다(룬만 고친 게 아니라
     축 자체가 «반복 횟수» 라는 뜻을 세 자리가 같이 지킨다). */
  console.log('\n[R3] 되돌림 — 홀드가 아니라 «한 번 클릭» 이면 새 [B1] 축이 빨개진다');
  for (const sp of SPOTS) {
    const d = await hold(page, sp, { tap: true });
    ok(!!d && d.tries < 8, 'R3 ' + sp.id + ' 클릭 한 번은 시도 < 8 — [B1] 이 «반복» 을 실제로 세고 있다',
       d ? '시도 ' + d.tries + '회' : 'n/a');
  }

  /* ── [K] 16회차 — 배지 keep-out ──────────────────────────────────────
     15회차 채점에서 두 비평가(EJ·EK)가 **독립으로 같은 진단**을 냈다: 회당 플래시가 훈련 카드
     알림 배지를 덮어 지운다(붉은 픽셀 보존 −45.7%). 그리고 둘 다 «상자를 안으로 들여서는 못 닫는
     자리» 라고 못박았다 — 배지가 카드 footprint **안쪽**에 앉아 있어 상자를 들이면 흰 밴드가
     오히려 배지 쪽으로 다가오기 때문이다.
     ⇒ 16회차 처방은 «배지를 플래시 «위에» 다시 그린다»(`fxFlashKeep`). 이 절이 그것을 못박는다.
     ⚠ K3 가 이 절의 본체다 — 되돌림이 없으면 «배지가 원래 안 지워졌을 뿐» 인 헛초록과 못 가른다. */
  console.log('\n[K] 16회차 — 회당 플래시가 알림 배지를 덮지 않는다(keep-out)');
  /* ⚠ **이 절은 맨 뒤에 두고 페이지를 새로 연다.** K 는 훈련 카드를 세 번 더 홀드하는데, 그러면
     훈련 단계 상한에 먼저 닿아 **뒤에 오는 [R2] 가 «살 것이 없어» 0/0 으로 빨개졌다**(3회 중 2회).
     자가 자를 방해한 것이라 순서를 바꾸고 상태를 다시 깐다 — [B]~[R] 은 내 변경 전과 **같은 상태**에서
     돌고, K 는 K 대로 깨끗한 세이브에서 돈다. */

  {
    /* 홀드 중 «배지를 덮는 keep-out 패치가 실제로 섰는가» 를 센다. 배지는 `.tr-card>.dot` 이고,
       패치는 `#fxl` 안 `.fx-keep` 이다 — 패치가 배지 bbox 를 **품어야** 덮은 것이다. */
    let killKeep = false;
    /* ⚠⚠ **세이브를 «리로드 전에» 지우면 안 된다(363 교훈).** 게임은 `beforeunload → save()` 라
       `localStorage.clear()` 뒤에 리로드하면 **떠나는 길에 그 키가 되살아난다** — 앞 회차에서 상한까지
       올려 둔 훈련 단계가 그대로 돌아와 홀드가 한 번도 안 먹고, 되돌림 절(K4)이 요구하는 «패치 0» 과
       «홀드가 안 먹어서 0» 이 구분되지 않는다(K5 가 실제로 0/0 으로 빨갰다).
       ⇒ **새 문서가 뜨기 전**에 지운다 — `addInitScript` 는 페이지 스크립트보다 먼저 도므로
         게임은 매번 «세이브 없는» 상태에서 부팅한다. */
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    /* ⚠ **매 회 페이지를 새로 연다.** 한 페이지에서 훈련 카드를 세 번 홀드하면 **단계 상한**에 닿아
       뒤 회차가 «살 것이 없어» 0/0 으로 빨개진다(K5 가 실제로 그랬다 — 자가 자를 방해한 것이다).
       되돌림 시험(K4)이 «패치가 0» 을 요구하는 절이라, «홀드가 안 먹어서 0» 과 반드시 갈라야 한다. */
    const keepRun = async (tab, sel) => {
      await page.reload();
      await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
        S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
        if (S.temper) S.temper.pts = 1e6;
        openTrain();
      });
      await page.waitForTimeout(400);
      if (killKeep) await page.evaluate(() => { window.fxFlashKeep = () => []; });
      await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, tab);
      await page.waitForTimeout(420);
      const r = await page.evaluate(s => { const e = document.querySelector(s);
        const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
      /* 배지 창 = 배지 bbox + 사방 24px. 대조(누르기 전) 붉은 픽셀을 먼저 센다. */
      /* ⚠ 창은 **배지 주변**이 아니라 **카드 전체 + 40px** 다. 배지 창(bbox+24)으로 좁게 잡았더니
         홀드 중 카드가 621 왕복으로 흔들려 배지가 **창 밖으로 나가는** 프레임이 생겼고, 그것이
         «붉은 픽셀 3.7%» 라는 헛빨강으로 읽혔다(실행마다 뒤집혔다). 카드 안 붉은 원반은 배지
         하나뿐이라 창을 넓혀도 세는 대상은 안 바뀐다(probe619e ⓘ 와 같은 처리). */
      const win = await page.evaluate(() => { const c = document.querySelector('#trCards [data-tr]');
        if (!c) return null; const b = c.getBoundingClientRect();
        const x = Math.max(0, Math.round(b.x) - 40), y = Math.max(0, Math.round(b.y) - 40);
        return { x, y, width: Math.min(1080 - x, Math.round(b.width) + 80),
                 height: Math.min(2280 - y, Math.round(b.height) + 80) }; });
      const reds = async () => { if (!win) return 0;
        const png = 'data:image/png;base64,' + (await page.screenshot({ clip: win })).toString('base64');
        return page.evaluate(async src => {
          const im = await new Promise(z => { const i = new Image(); i.onload = () => z(i); i.src = src; });
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
          const D = x.getImageData(0, 0, im.width, im.height).data;
          let n = 0;
          /* probe619e ⓘ 와 **같은 판정** — «붉다» 를 r−g 차로만 물으면 앰버 글로우(255,186,54)가
             통째로 걸려 «보존 121%» 라는 헛수가 나온다. 배지 원반은 G·B 가 둘 다 낮다. */
          for (let i = 0; i < D.length; i += 4) if (D[i] > 150 && D[i + 1] < 90 && D[i + 2] < 90) n++;
          return n; }, png); };
      const red0 = await reds();
      await page.mouse.move(r.x, r.y);
      await page.mouse.down();
      /* ⚠ **«최저 한 프레임» 이 아니라 «성한 프레임의 비율» 로 묻는다.** keep-out 이 책임지는 것은
         **회당 플래시**가 배지를 덮지 않는 것인데, 최저값으로 물으면 지나가는 **화폐 알갱이**
         (`fx-spd` — 잉크 지름 115.5px)가 배지를 스치는 한 프레임에 통째로 뒤집힌다(실행마다
         7~9% ↔ 97% 로 갈렸다). 알갱이 가림은 축이 다르고(회차 기록 §17 로 넘겼다) 상시가 아니다.
         ⇒ 6번 찍어 «보존 ≥90% 인 표본의 비율» 을 쓴다. 수리 전에는 플래시가 **모든** 틱에서 덮으므로
           그 비율이 0 이고(probe619e 최저 4.44%), 수리 후에는 알갱이가 스친 한둘만 빠진다. */
      let redMin = Infinity, redOkN = 0, redN = 0;
      const sampler = (async () => { for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(160); const q = await reds();
        if (red0 > 0) { redN++; const f = q / red0;
          redMin = Math.min(redMin, f); if (f >= 0.9) redOkN++; } } })();
      const out = await page.evaluate(async () => {
        const L = document.getElementById('fxl');
        /* ⚠ **배지는 매 프레임 다시 찾는다.** `renderTrain()` 이 홀드 중에도 카드를 다시 그리므로
           («강화 가능» 조건이 바뀌면 `.dot` 자체가 붙었다 떨어진다) 참조를 잡아 두면 **떼어진 노드**의
           rect(0,0,0,0)를 재게 되어 «중심 어긋남 20px» 같은 헛수가 나온다. 배지가 없는 프레임은
           지킬 것이 없는 프레임이므로 **표본에서 뺀다**(0 을 통과로도 실패로도 세지 않는다). */
        const DOT = () => document.querySelector('#trCards [data-tr] .dot');
        let frames = 0, withKeep = 0, cover = 0, flashOnly = 0, maxD = 0, dotFrames = 0;
        for (let i = 0; i < 14; i++) {
          await new Promise(z => setTimeout(z, 90));
          frames++;
          const keeps = [...L.querySelectorAll('.fx-keep')];
          if (L.querySelector('.fx-flash')) flashOnly++;
          const dot = DOT();
          if (!dot || !dot.isConnected) continue;
          const d = dot.getBoundingClientRect();
          if (!d.width) continue;
          dotFrames++;
          if (!keeps.length) continue;
          withKeep++;
          const dc = { x: d.x + d.width / 2, y: d.y + d.height / 2 };
          let best = Infinity, bk = null;
          for (const k of keeps) { const b = k.getBoundingClientRect();
            const kc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
            const q = Math.hypot(kc.x - dc.x, kc.y - dc.y);
            if (q < best) { best = q; bk = b; } }
          if (best > maxD) maxD = best;
          /* 코어 = `.tr-card>.dot` 의 radial-gradient 반지름 15×16 (상자 42×42) — CSS 가 적어 둔 비다 */
          const cw = d.width * (30 / 42) / 2, ch = d.height * (32 / 42) / 2;
          if (bk && bk.left <= dc.x - cw && bk.right >= dc.x + cw
                 && bk.top <= dc.y - ch && bk.bottom >= dc.y + ch) cover++;
        }
        return { frames, withKeep, cover, flashOnly, dotFrames, maxD: Math.round(maxD * 100) / 100 };
      });
      await sampler;
      await page.mouse.up();
      await page.waitForTimeout(350);
      out.red0 = red0;
      out.redMin = (redMin < Infinity) ? Math.round(redMin * 1000) / 10 : 0;
      out.redKeep = redN ? redOkN / redN : 0;      /* «성한 프레임» 비율 */
      return out;
    };
    const K = await keepRun('train', '#trCards [data-tr]');
    ok(K.flashOnly > 0, 'K1 표본이 있다 — 홀드 동안 회당 플래시가 실제로 뜬다',
       '플래시 프레임 ' + K.flashOnly + '/' + K.frames);
    ok(K.withKeep > 0, 'K2 그 플래시와 같이 keep-out 패치가 선다', 'keep 프레임 ' + K.withKeep + '/' + K.frames);
    ok(K.dotFrames >= 4, 'K2b 표본이 있다 — 배지가 실제로 떠 있는 프레임이 있다',
       '배지 프레임 ' + K.dotFrames + '/' + K.frames);
    /* ⚑⚑ **여기서부터는 rect 가 아니라 «찍힌 픽셀» 로 묻는다(350 규칙).**
       rect 로 «패치가 배지를 품는가» 를 물었더니 66 표본 중 30 이 17~19px 어긋난 것으로 나왔는데,
       **그것은 렌더 결과가 아니라 자의 읽는 순서 탓**이었다: `getBoundingClientRect` 는 애니메이션
       중인 배지를 **지금 시각**으로 계산해 돌려주는 반면, 패치의 인라인 좌표는 **직전 rAF** 에 쓴 값이다.
       브라우저는 rAF 를 전부 돌린 «뒤» 합성하므로 **실제로 찍히는 프레임에서는 둘이 같은 시각**이다
       (probe619e 가 스크린샷으로 배지 보존 95.82% 를 찍어 그것을 못박는다).
       ⇒ 두 비평가가 실제로 센 축(«배지 붉은 픽셀»)을 그대로 쓴다 — 자가 눈보다 엄격한 척하다가
         **렌더에 없는 결함**을 잡는 일이 없어진다. */
    ok(K.redKeep >= 0.66, 'K3 ★ 홀드 프레임의 2/3 이상에서 배지 **붉은 픽셀**이 보존된다(≥90%)',
       '성한 표본 ' + Math.round(K.redKeep * 100) + '% · 최저 ' + K.redMin + '% · 대조 ' + K.red0 + 'px');
    /* ★ 되돌림 — keep-out 을 무력화하면 패치가 사라지고 **배지가 다시 지워진다**.
       이 항이 이 절의 본체다: 없으면 «배지가 원래 안 지워졌을 뿐» 인 헛초록과 못 가른다. */
    killKeep = true;
    const K0 = await keepRun('train', '#trCards [data-tr]');
    killKeep = false;
    ok(K0.flashOnly > 0 && K0.dotFrames >= 4 && K0.withKeep === 0 && K0.redKeep <= 0.33,
       'K4 ★ 되돌림 — keep-out 을 무력화하면 패치가 사라지고 **붉은 픽셀이 무너진다**',
       'keep ' + K0.withKeep + ' · 성한 표본 ' + Math.round(K0.redKeep * 100) + '% · 최저 ' + K0.redMin + '%');
    /* 원복이 «자를 무르게 잡아서» 통과한 게 아님을 못박는다 — 같은 자로 다시 초록이어야 한다 */
    const K2 = await keepRun('train', '#trCards [data-tr]');
    ok(K2.dotFrames >= 4 && K2.withKeep > 0 && K2.redKeep >= 0.66,
       'K5 원복하면 같은 자로 다시 초록',
       'keep ' + K2.withKeep + ' · 성한 표본 ' + Math.round(K2.redKeep * 100) + '% · 최저 ' + K2.redMin + '%');
    /* keep-out 은 `inset` 을 준 호출(= 619 회당 발화)에서만 돈다 — 단발 플래시는 한 값도 안 바뀐다.
       ⚠ 이 항이 없으면 09·12·17·코스튬·장비의 단발 연출에 패치가 새로 끼는 회귀를 못 잡는다. */
    const one = await page.evaluate(async () => {
      const L = document.getElementById('fxl');
      const card = document.querySelector('#trCards [data-tr]');
      for (const nd of [...L.querySelectorAll('.fx-keep,.fx-flash')]) nd.remove();
      fxFlash(card);                                  /* inset 없이 = 단발 호출 */
      await new Promise(z => setTimeout(z, 60));
      return { flash: L.querySelectorAll('.fx-flash').length, keep: L.querySelectorAll('.fx-keep').length };
    });
    ok(one.flash > 0 && one.keep === 0,
       'K6 ★ `inset` 없는 단발 플래시에는 패치가 안 붙는다(09·12·17 불변)',
       '플래시 ' + one.flash + ' · keep ' + one.keep);
  }

  /* ═══ [L] 17회차 — 회당 플래시가 **호스트를 따라간다** · 룬 알갱이 상변 클램프 ═══
     16회차 채점(EL 3 / EM 2)에서 두 비평가의 「단 하나」가 같은 뿌리를 가리켰다 —
     EL «플래시 하드 에지가 호스트 «안» 콘텐츠 위에 떨어진다» · EM «링·워시가 행 콘텐츠보다 위 레이어».
     뿌리는 **상자가 스폰 시각의 rect 로 굳는 것**이었다(621 이 호스트를 틱마다 흔든다).
     `probe619g` 수리 전 실측: 중심 어긋남 훈련 **8.02px** · 룬 **11.59px** · 단련 **6.01px**.

     ⚠⚠ **이 절이 밟은 함정 둘 — 둘 다 이 파일이 이미 적어 둔 것이다.**
     ⓐ **rAF 등록 순서**(위 K3 머리말과 같은 함정). 추적(`follow`)과 자(`tick`)는 같은 프레임의
        rAF 큐에 있고 순서는 등록 순이라, 자가 먼저 돌면 상자는 아직 **직전 프레임** 자리다.
        브라우저는 rAF 를 다 돌린 «뒤» 합성하므로 **찍히는 프레임에서는 둘이 같다** — 1차 시도가
        이것을 안 갈라 같은 트리에서 단련 0.02px · 훈련 8.02px 로 화면마다 딴 답을 냈다.
        ⇒ «이번 **또는** 직전 프레임» 과 맞는지를 묻는다(한 프레임 안이면 합성 시점엔 일치).
     ⓑ **스폰 프레임은 추적의 품질이 아니다** — 그 프레임에는 `follow` 가 아직 한 번도 안 돌았다.
        섞으면 한 프레임짜리 값(1.9~4.2px)이 최악값을 통째로 지배한다. 갈라서 센다.
     ⚠ **L2 전제가 이 절의 본체다** — 호스트가 안 움직이면 «따라간다» 는 아무것도 안 묻는 헛초록이다. */
  {
    console.log('\n[L] 17회차 — 회당 플래시가 호스트를 따라간다 · 660 이관(비용 알갱이 폐지 확인)');
    let killFollow = false;
    const trackRun = async (tab, hostSel, btnSel) => {
      await page.reload();
      await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
        S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
        if (S.temper) S.temper.pts = 1e6;
        openTrain();
      });
      await page.waitForTimeout(400);
      /* ★ 되돌림 — **제품을 안 건드리고** 추적만 죽인다: `fxFlash` 가 도는 동안 rAF 를 no-op 으로
         바꿔 `follow` 가 아예 예약되지 않게 한다(K4 가 `fxFlashKeep` 을 갈아 끼우는 것과 같은 처리).
         ⚠ 이러면 keep 패치의 추적도 같이 죽지만 이 절은 **플래시 중심**만 재므로 축이 안 섞인다. */
      if (killFollow) await page.evaluate(() => {
        const orig = window.fxFlash;
        window.fxFlash = function (el, iv, inset) {
          const raf = window.requestAnimationFrame;
          window.requestAnimationFrame = () => 0;
          try { return orig.call(this, el, iv, inset); }
          finally { window.requestAnimationFrame = raf; }
        };
      });
      await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, tab);
      await page.waitForTimeout(420);
      const tb = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, btnSel);
      if (!tb) return null;
      const top0 = await page.evaluate(s => { const e = document.querySelector(s);
        return e ? e.getBoundingClientRect().top : null; }, hostSel);
      await page.mouse.move(tb.x + tb.w / 2, tb.y + tb.h / 2);
      await page.mouse.down();
      const o = await page.evaluate(([hostSel, TOP0]) => new Promise(res => {
        const host = document.querySelector(hostSel), L = document.getElementById('fxl');
        const out = { n: 0, n2: 0, max2: 0, fxFrames: 0, frames: 0, hostMove: 0, spdInk: 0, spdOld: 0, spdN: 0 };
        if (!host || !L) return res(out);
        const rect = e => e.getBoundingClientRect();
        const prev = new Map(), seen = new WeakSet();
        const c0 = rect(host); const cx0 = (c0.left + c0.right) / 2, cy0 = (c0.top + c0.bottom) / 2;
        const t0 = performance.now();
        const tick = () => {
          const hb = rect(host); out.frames++;
          /* L2 전제 — 홀드 중 호스트가 실제로 움직인 폭(621 왕복) */
          const mv = Math.hypot((hb.left + hb.right) / 2 - cx0, (hb.top + hb.bottom) / 2 - cy0);
          if (mv > out.hostMove) out.hostMove = mv;
          let hit = 0;
          for (const nd of L.querySelectorAll('.fx-flash')) {
            const b = rect(nd); if (!b.width) continue;
            const he = nd.__fxHost; if (!he || !he.isConnected) continue;
            if (he !== host && !host.contains(he) && !he.contains(host)) continue;
            const g = rect(he); if (!g.width) continue;
            const p = prev.get(he) || g;
            const gap = q => Math.hypot((b.left + b.right) / 2 - (q.left + q.right) / 2,
                                        (b.top + b.bottom) / 2 - (q.top + q.bottom) / 2);
            const d = Math.min(gap(g), gap(p));
            out.n++; hit = 1;
            if (seen.has(nd)) { out.n2++; if (d > out.max2) out.max2 = d; } else seen.add(nd);
          }
          out.fxFrames += hit;
          for (const nd of L.querySelectorAll('.fx-flash')) {
            const he = nd.__fxHost; if (he && he.isConnected) prev.set(he, rect(he));
          }
          /* ⚑⚑ 660 이관 — **자가 보는 대상이 바뀌었다.** 종전 이 두 줄은 `.fx-spd`(583 «비용 알갱이»
             = 알약·보유 아이콘에서 버튼으로 **날아가는** 화폐)를 셌는데, 주인 지시 658·660 이
             그 연출을 **폐지**했다(«골드가 훈련 버튼쪽으로 가는 연출 없애기. 존나 후지다» ·
             «스폰 위치는 강화 버튼뿐»). 표본이 0 이 되면 [L5] 는 «묻지 않는 자» 가 된다.
             ⇒ 333 처방대로 **자리를 비우지 않고 살아 있는 표본으로 갈아 끼운다** — 같은 질문
             («룬 입자의 잉크가 행 상변을 넘어 위 패널을 침범하는가»)을 660 의 버스트 아이콘
             (`.fx-cic`)에 그대로 던진다. 산수·잉크비·문턱은 **한 값도 안 바꿨다**.
             ⚠ 폐지 자체는 아래 [L4] 가 **방향을 뒤집어** 지킨다(«나야 한다» → «한 알도 안 난다») —
               그 항이 없으면 «연출이 되살아나도 초록» 인 게이트가 된다. */
          for (const nd of L.querySelectorAll('.fx-spd')) { out.spdOld++; }
          for (const nd of L.querySelectorAll('.fx-cic')) {
            const b = rect(nd); if (!b.width) continue;
            out.spdN++;
            const pad = b.height * (1 - 0.938) / 2;
            const riseStatic = (TOP0 != null ? TOP0 : hb.top) - b.top;
            const riseLive = hb.top - b.top;
            const rise = Math.min(riseStatic, riseLive);
            if (rise - pad > out.spdInk) out.spdInk = rise - pad;
          }
          if (performance.now() - t0 < 2600) requestAnimationFrame(tick); else res(out);
        };
        requestAnimationFrame(tick);
      }), [hostSel, top0]);
      await page.mouse.up();
      await page.waitForTimeout(350);
      return o;
    };
    const r2v = v => Math.round(v * 100) / 100;
    const SP = [
      { id: 'train',  tab: 'train',  host: '#trCards [data-tr]',  btn: '#trCards [data-tr]' },
      { id: 'rune',   tab: 'rune',   host: '#trRunes .tr-rn',     btn: '#trRunes .rbt.b1' },
      { id: 'temper', tab: 'temper', host: '#trTemper .tr-tp.k0', btn: '#trTemper .tr-tp.k0 .tb' },
    ];
    const T = {};
    for (const sp of SP) T[sp.id] = await trackRun(sp.tab, sp.host, sp.btn);
    for (const sp of SP) {
      const o = T[sp.id];
      ok(!!o && o.fxFrames >= 4, 'L1 ' + sp.id + ' 표본이 있다 — 홀드 중 회당 플래시가 뜬다',
         o ? '플래시 프레임 ' + o.fxFrames + '/' + o.frames : '대상 없음');
      ok(!!o && o.hostMove >= 3,
         'L2 ★ 전제 — 홀드 중 호스트가 실제로 움직인다(621 왕복 ≥3px · 안 움직이면 L3 은 헛초록)',
         o ? '이동폭 ' + r2v(o.hostMove) + 'px' : '—');
      ok(!!o && o.n2 > 0 && o.max2 <= 2,
         'L3 ★ ' + sp.id + ' 플래시가 호스트를 따라간다(스폰 프레임 제외 최악 ≤2px)',
         o ? '최악 ' + r2v(o.max2) + 'px · 표본 ' + o.n2 : '—');
    }
    const rn = T.rune;
    /* ⚑ 660 이관 — 방향을 뒤집었다(333). 종전: «비용 알갱이가 나야 한다» / 지금: «한 알도 안 난다».
       그냥 지웠으면 «658·660 이 통째로 되돌아가도 초록인 게이트» 가 됐을 자리다. */
    ok(!!rn && rn.spdOld === 0,
       'L4 ★ 룬 홀드에서 «버튼으로 날아가는 비용 알갱이»(`.fx-spd`)가 **한 알도 안 난다**(658·660 폐지)',
       rn ? '표본 ' + rn.spdOld + '알' : '—');
    ok(!!rn && rn.spdN > 0, 'L4b 표본이 있다 — 그 자리를 660 의 버스트 아이콘이 대신한다',
       rn ? '아이콘 ' + rn.spdN + '알' : '—');
    ok(!!rn && rn.spdN > 0 && Math.max(0, rn.spdInk) <= 1,
       'L5 ★ 룬 **버스트 아이콘** 잉크가 행 상변을 안 넘는다(≤1px · 16회차 ② 클램프를 ③ 폴백에도 · 660 이관)',
       rn ? r2v(Math.max(0, rn.spdInk)) + 'px (EL 49px / EM 57px)' : '—');
    /* ★ 되돌림 — 추적을 죽이면 L3 이 무너진다. 없으면 «원래 안 어긋났을 뿐» 인 헛초록과 못 가른다. */
    killFollow = true;
    const T0 = await trackRun('train', '#trCards [data-tr]', '#trCards [data-tr]');
    killFollow = false;
    ok(!!T0 && T0.fxFrames >= 4 && T0.hostMove >= 3 && T0.max2 > 2,
       'L6 ★ 되돌림 — 추적을 죽인 사본은 상자가 호스트에서 어긋난다',
       T0 ? '최악 ' + r2v(T0.max2) + 'px · 이동폭 ' + r2v(T0.hostMove) + 'px · 표본 ' + T0.n2 : '—');
    const T1 = await trackRun('train', '#trCards [data-tr]', '#trCards [data-tr]');
    ok(!!T1 && T1.n2 > 0 && T1.max2 <= 2, 'L7 원복하면 같은 자로 다시 초록',
       T1 ? '최악 ' + r2v(T1.max2) + 'px · 표본 ' + T1.n2 : '—');
  }

  /* ── [M] 20회차 — 19회차 채점의 «2인 공통» 셋 ───────────────────────────
     ⑴ 훈련: 파티클이 **비용 숫자**를 덮는다(ET 42.2/37.4/33.8/33.9% · EU «글자 채움 = 배경 Δ0»)
     ⑵ 룬: 회당 플래시의 흰 테가 자기가 강조하는 **글자를 먹는다**(ET·EU 둘 다 f6·f9)
     ⑷ 분출 코인이 **호스트 비용 배지**와 같은 자리에 앉아 «진짜 배지» 를 못 고른다(⑴ 과 한 뿌리)
     ⚠ ⑶(«단련 f1 이 f0 과 픽셀 동일»)은 **제품이 아니라 자**였다 — 아래 M3 이 제품 쪽을 못박고
       (홀드 내내 «보이는 fx 0 · 홀드 링 0» 인 프레임이 0장), 자 쪽 수리는 `tools/cap619.js` 다. */
  {
    console.log('\n[M] 20회차 — 룬 글자 절단(⑵) · 훈련 비용 잉크 keep-out(⑴⑷) · «빈 프레임» 없음(⑶)');
    const r2v = v => Math.round(v * 100) / 100;
    await page.reload();
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
      S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
      if (S.temper) S.temper.pts = 1e6;
      openTrain();
    });
    await page.waitForTimeout(400);

    /* M1 — 룬 효과 행: 글줄 잉크가 플래시의 «안쪽 띠»(흰 테 9 + 하드 림 4) 밖에 있는가.
       ⚠ 상수 13 을 손으로 적지 않는다 — `.fx-flash` 의 `border-width` 와 `box-shadow` 에서 읽는다. */
    const rdRun = async () => {
      await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, 'rune');
      await page.waitForTimeout(420);
      return page.evaluate(() => {
        const rd = document.querySelector('#trRunes .tr-rn > .rd');
        if (!rd) return null;
        const R = rd.getBoundingClientRect();
        /* 플래시가 안쪽에 까는 띠 — 실제 CSS 에서 읽는다(자가 값을 두 벌로 안 적는다) */
        const probe = document.createElement('s'); probe.className = 'fx-flash';
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:40px;height:40px;animation:none';
        (document.getElementById('fxl') || document.body).appendChild(probe);
        const cs = getComputedStyle(probe);
        const bw = parseFloat(cs.borderLeftWidth) || 0;
        /* 하드 림 = 첫 `inset` 그림자의 **네 번째 길이(spread)**. 손 상수를 안 적는다 —
           `.fx-flash` 가 그 값을 바꾸면 이 문턱이 같이 따라와야 한다(자가 값을 두 벌로 안 든다). */
        const sh0 = String(cs.boxShadow).split(/,(?![^(]*\))/)[0] || '';
        const lens = (sh0.match(/-?\d+(?:\.\d+)?px/g) || []).map(parseFloat);
        const rim = lens.length >= 4 ? Math.abs(lens[3]) : 4;
        probe.remove();
        let l = Infinity, r2x = -Infinity;
        for (const nd of rd.querySelectorAll('.rw > i, .rw > s')) {
          if (!nd.firstChild) continue;
          const rg = document.createRange(); rg.selectNodeContents(nd);
          for (const b of rg.getClientRects()) { if (!b.width) continue; l = Math.min(l, b.left); r2x = Math.max(r2x, b.right); }
        }
        if (!Number.isFinite(l)) return null;
        return { boxL: R.left, boxR: R.right, inkL: l, inkR: r2x, band: bw + rim,
                 clearL: l - (R.left + bw + rim), clearR: (R.right - bw - rim) - r2x };
      });
    };
    const M = await rdRun();
    ok(!!M, 'M0 표본이 있다 — 룬 효과 행과 그 글줄이 실제로 있다');
    if (M) {
      ok(M.clearL >= 0 && M.clearR >= 0,
         'M1 ★ 룬 글줄 잉크가 플래시 안쪽 띠(흰 테+하드 림 ' + r2v(M.band) + 'px) **밖**에 있다 — 절단 0',
         '좌 ' + r2v(M.clearL) + 'px · 우 ' + r2v(M.clearR) + 'px (19회차: 좌 −6 · 우 −7)');
      ok(Math.abs(M.inkL - 85) <= 1 && Math.abs(M.inkR - 995) <= 1,
         'M1b ★ 그릇만 넓혔다 — 글줄 잉크 자리는 **Δ0px**(19회차 판과 같은 85 / 995)',
         '잉크 ' + r2v(M.inkL) + '..' + r2v(M.inkR));
      /* ★ 되돌림 — `--rd-fx:0` 이면 19회차 판이 되살아나 M1 이 빨개진다(헛초록 방지) */
      await page.addStyleTag({ content: '.tr-rn>.rd{--rd-fx:0px}' });
      const M0 = await rdRun();
      ok(!!M0 && (M0.clearL < 0 || M0.clearR < 0),
         'M1c ★ 되돌림 — `--rd-fx:0` 사본에서는 흰 테가 글자를 먹는다',
         M0 ? '좌 ' + r2v(M0.clearL) + 'px · 우 ' + r2v(M0.clearR) + 'px' : '—');
      await page.reload();
      await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
      await page.waitForTimeout(700);
      await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
        S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9; if (S.temper) S.temper.pts = 1e6; openTrain(); });
      await page.waitForTimeout(400);
      const M1 = await rdRun();
      ok(!!M1 && M1.clearL >= 0 && M1.clearR >= 0, 'M1d 원복하면 같은 자로 다시 초록',
         M1 ? '좌 ' + r2v(M1.clearL) + 'px · 우 ' + r2v(M1.clearR) + 'px' : '—');
    }

    /* ⚑⚑ **M2(훈련 비용 잉크 keep-out)는 이 자에 없다** — 같은 회차에 다른 워커가 **816** 으로
       먼저 올렸고(`--burst-keep` · `fxbKeepHoles`), 그 축의 자는 `tools/verify816.js` 다.
       한 축을 두 자가 재면 문턱이 갈리는 날 어느 쪽이 옳은지 아무도 못 고른다(286·308 과 같은 꼴).
       20회차는 그 자리를 **재현으로 확인만** 하고(review §20 A/B 표) 자는 816 것을 쓴다. */
    /* M3 — ⑶ 의 제품 쪽 답: 홀드 내내 «보이는 fx 0 · 홀드 링 0» 인 프레임이 **0장**이다. */
    const gapRun = async (tab, sel) => {
      await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, tab);
      await page.waitForTimeout(420);
      return page.evaluate(s => new Promise(res => {
        const btn = document.querySelector(s); const L = document.getElementById('fxl');
        if (!btn || !L) return res(null);
        btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, buttons: 1 }));
        const t0 = performance.now(); let n = 0, blank = 0;
        const tick = () => { const t = performance.now() - t0;
          const vis = Array.from(L.children).filter(k => +(getComputedStyle(k).opacity || 0) > 0.02).length;
          const hold = document.querySelectorAll('.fx-holding').length;
          n++; if (!vis && !hold) blank++;
          if (t < 1100) requestAnimationFrame(tick);
          else { btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); res({ n, blank }); } };
        requestAnimationFrame(tick);
      }), sel);
    };
    for (const [tab, sel, nm] of [['train', '#trCards [data-tr]', '훈련'],
                                  ['rune', '#trRunes .rbt.b1', '룬'],
                                  ['temper', '#trTemper .tr-tp.k0 .tb', '단련']]) {
      const G = await gapRun(tab, sel);
      ok(!!G && G.n > 20 && G.blank === 0,
         'M3 ★ ' + nm + ' — 홀드 내내 «보이는 fx 0 · 홀드 링 0» 인 프레임 **0장**(⑶ 은 자 결함이었다)',
         G ? '빈 프레임 ' + G.blank + '/' + G.n : '—');
      await page.waitForTimeout(400);
    }
  }

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
