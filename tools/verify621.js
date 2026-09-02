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
 *   [B] 실동작 — 홀드 반복 구간에서 원래 크기 부근 듀티·완전 복귀 프레임이 실재하고(B1),
 *               왕복 에피소드가 반복해서 그려진다(B2) — 632: 틱을 분모로 삼는 축은 fps 를 타서 폐기.
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
/* «원래 크기» 문턱 둘 — ⚠ 632 개정: «틱마다 REST_TH 프레임이 잡혔는가»(cycRatio) 로 B1/R2 를 가르던
   축은 폐기했다. 그 축은 **컨테이너 fps 가 곧 값**이다 — 등재 컨테이너(60fps 근처)에서도 틱당 표본
   3~5장이라 0.667~0.941 로 흔들렸고(문턱 0.85/0.95 바로 아래), 루틴 워커 컨테이너(rAF 실측 ~20~24fps)
   에서는 0.588~0.933 까지 내려가 42항 중 1~6건이 실행마다 갈렸다(probe632 실측표 · review 632 §2).
   ⚠ «틱별 최대의 중앙값(tm50)» 도 시도했다 폐기했다 — 부하 스파이크 한 번에 틱별 꼭대기 포착률이
   0.41 로 내려가 중앙값째 0.974 로 떨어진다(8회 중 1회 실측). **틱을 분모로 삼는 축은 어떤 변형이든
   fps 를 탄다.** 같은 나쁜 실행에서도 안 흔들린 것은 프레임 전체 비율(듀티)뿐이다.
   갈아 끼운 축 둘은 fps 에 무디다(probe632 원본 ↔ 무력화 분리폭):
   ⓐ 듀티 축 restPct — own ≥ REST_TH 프레임의 **전체 비율**(원본 0.245~0.34 · 무력화 ≤0.036).
      페인트가 타임라인을 고르게 표본하는 한 fps 가 줄어도 기대값이 안 변한다. 구 FULL_TH 듀티
      (문턱 0.20)는 꼭대기 한 점의 듀티라 저fps 에서 0.085 까지 내려갔다 — 듀티는 REST_TH 로 재고,
      «완전히 원래 크기(FULL_TH)» 는 듀티가 아니라 **실재**(omax)로 묻는다.
   ⓑ 왕복 에피소드 축 ep — 시간 순 프레임에서 «내려갔다(≤EP_LO 0.965) 올라옴(≥REST_TH)» 상승 교차의
      횟수. «작아진 채 진동»(수리 전)은 위쪽에 한 번도 못 가 0 이고, 왕복은 틱마다 하나씩 쌓인다
      (원본 7~12 · 무력화 0~1 — 무력화의 1 은 재렌더 노드 교체 순간의 표류 프레임).
   ⚠ 무르게 푼 것이 아님은 [R1] 이 같은 두 축으로 못박는다(무력화 사본 restPct ≤0.05 · ep ≤2). */
const REST_TH = 0.985;
const FULL_TH = 0.995;
/* 632 — 위 두 축의 문턱. probe632 분리폭(원본 최저 ↔ 무력화 최고)의 가운데가 아니라 **양쪽에서
   먼 자리**로: restPct 0.12(원본 0.245~0.34 / 무력화 ≤0.036) · ep 4(원본 최악 7 / 무력화 ≤1).
   ⚠ ep 문턱은 HOLD_MS 2400(틱 13~18개)에 물려 있다 — 홀드를 늘리면 무력화 쪽 표류 프레임도
   같이 늘어나므로 DEAD_EP 를 같이 다시 재라. */
const REST_DUTY = 0.12;                                /* [B1]·[R2] 듀티 문턱 */
const EP_LO = 0.965, EP_MIN = 4;                       /* [B2] 왕복 에피소드(내림 ≤EP_LO → 오름 ≥REST_TH) */
const DEAD_DUTY = 0.05, DEAD_EP = 2;                   /* [R1] 무력화 사본 상한 */
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
  /* ⚑ 701 이관(2026-09-02) — **관측점을 코어로 옮겼다.** 701 이 배수 토글을 놓으면서 «한 번 강화»
     를 `temperUpOne`/`runeTryOne` 이라는 코어로 갈랐고(×N 은 그 코어의 반복이다), 홀드 틱은
     이제 `temperUpBtn`/`runeBuy`/`runeTry` 를 안 지난다 — 옛 관측점 그대로 두면 이 자는
     «시도 0회» 로 빨개진다(제품이 멀쩡한데 자만 못 따라가는 게이트 부패다).
     ⚠ **묻는 것은 한 글자도 안 바뀌었다** — 이 자는 배수 ×1(기본값)에서 돌고, ×1 에서는
       «코어 호출 1회 = 틱 1회 = 강화 1회» 라 축이 전과 정확히 같다. 배수를 켠 상태의 반대편
       («틱 1회 = 버스트 1회» — 강화 N회여도 발화는 1회)은 주인 지시라 `verify701` [G] 가 맡는다. */
  wrap('trainBuy',    'train',  r => !!r);
  wrap('temperUpOne', 'temper', r => !!r);   /* 701 이관 — 코어 */
  wrap('runeTryOne',  'rune',   () => true);     /* 701 이관 — 코어. 룬은 확률 시도라 이 행의 축은 «누름» 이고 시도로 센다 */
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
  const tickMax = [];                                 /* 632 — 틱별 최대 자기 배율 */
  for (let i = 0; i < rep.length; i++) {
    const a = rep[i] - 8, b = (i + 1 < rep.length) ? rep[i + 1] - 8 : rep[i] + 90;
    const seg = d.frames.filter(f => f.t >= a && f.t < b);
    if (seg.length) tickMax.push(Math.max(...seg.map(own)));
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

  tickMax.sort((x, y) => x - y);
  const tm50 = tickMax.length ? tickMax[Math.floor(tickMax.length / 2)] : 0;
  /* 632 — 왕복 에피소드: 시간 순으로 «눌림 쪽(≤EP_LO)에 갔다가 원래 크기 부근(≥REST_TH)으로 올라옴» */
  let ep = 0, epLow = false;
  for (const x of owns) { if (x <= EP_LO) epLow = true; else if (epLow && x >= REST_TH) { ep++; epLow = false; } }

  return {
    ep,
    id: sp.id, ticks: rep.length, frames: fr.length, w0: p3(W0),
    cyc, cycRatio: p3(cyc / rep.length), dnCyc, live, gone,
    tm50: p3(tm50), tmN: tickMax.length,
    restPct: owns.length ? p3(owns.filter(x => x >= REST_TH).length / owns.length) : 0,
    dnRatio: live ? p3(dnCyc / live) : 0,
    dnFrames: owns.filter(x => x <= DOWN_TH).length,
    dnPct: owns.length ? p3(owns.filter(x => x <= DOWN_TH).length / owns.length) : 0,
    fullFrames: owns.filter(x => x >= FULL_TH).length,
    fullPct: owns.length ? p3(owns.filter(x => x >= FULL_TH).length / owns.length) : 0,
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
    const fn = src.slice(src.indexOf('function jzPressTick('), src.indexOf('function jzPressTick(') + 2600);
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
    /* 632 — 구 축(위로 돌아온 틱 비율 ≥ 0.85)은 fps 를 타서 폐기(파일 머리말 참조).
       듀티는 REST_TH 로 잰다(구 FULL_TH 듀티 0.20 은 저fps 에서 0.085 까지 흔들렸다).
       «완전히 원래 크기» 는 듀티가 아니라 실재(omax ≥ FULL_TH)로 묻는다 — 수리 전(무력화와 같은 꼴)은
       둘 다 죽는다(restPct ≤0.036 · omax ≤0.959). 구 틱 비율은 진단으로 계속 찍는다. */
    ok(!!o && o.restPct >= REST_DUTY && o.omax >= FULL_TH,
       'B1 ' + sp.id + ' 원래 크기 부근(≥' + REST_TH + ') 듀티 ≥ ' + REST_DUTY + ' · 완전 복귀(≥' + FULL_TH + ') 프레임 실재',
       o ? 'restPct ' + o.restPct + ' · omax ' + o.omax + ' (완전 복귀 ' + o.fullFrames + '장 · 틱별 꼭대기 표본 ' + o.cyc + '/' + o.ticks + ')' : 'n/a');
    /* 632 — «틱마다 왕복» 의 페인트 쪽 증거. 틱을 분모로 삼지 않고 왕복 에피소드의 **횟수**만 묻는다
       (원본 최악 7 · 무력화 ≤1). 틱마다 부품이 불리는 것 자체는 [A5]·[A6] 정적 축이 이미 진다. */
    ok(!!o && o.ep >= EP_MIN,
       'B2 ' + sp.id + ' 왕복 에피소드(≤' + EP_LO + ' → ≥' + REST_TH + ' 상승 교차) ≥ ' + EP_MIN + '회',
       o ? 'ep ' + o.ep + ' (틱 ' + o.ticks + '개 · tm50 ' + o.tm50 + ')' : 'n/a');
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
    /* 632 — [B1]·[B2] 가 갈아탄 두 축 **그대로** 사본을 밀어야 «무르게 풀지 않았다» 가 선다.
       무력화 실측: restPct ≤ 0.036 · ep ≤ 1(재렌더 노드 교체 순간의 표류 프레임 한 장까지). */
    ok(!!o && o.restPct <= DEAD_DUTY && o.ep <= DEAD_EP,
       'R1 ' + sp.id + ' 무력화 사본은 왕복이 사라진다(restPct ≤ ' + DEAD_DUTY + ' · ep ≤ ' + DEAD_EP + ')',
       o ? 'restPct ' + o.restPct + ' · ep ' + o.ep : 'n/a');
  }
  {
    const o = await hold(page, SPOTS[0]);
    ok(!!o && o.restPct >= REST_DUTY && o.ep >= EP_MIN, 'R2 원복하면 같은 자([B1]·[B2] 축)로 다시 초록',
       o ? 'restPct ' + o.restPct + ' · ep ' + o.ep : 'n/a');
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
