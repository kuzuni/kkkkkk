#!/usr/bin/env node
/* 작업 621 — 「연속 강화 중 버튼 눌림 애니가 «작아진 채 진동» — 틱마다 원래 크기 ↔ 눌린 크기 왕복」 **재현**
 * (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다.)
 *
 *   node tools/probe621.js
 *
 * 등재문의 읽기는 «홀드 동안 버튼이 눌린(축소) 상태에 머문 채 미세 진동만 한다» 이다.
 * 그러면 결손이 실재하는지는 **한 수치**로 갈린다 — 「홀드 프레임 중 «원래 크기» 로 돌아온 프레임」.
 *
 * 재는 방법(자를 클래스 이름이 아니라 **그려진 상자**에 댄다 — 350 «찍힌 픽셀로 물어라» 의 기하 판):
 *   ⓐ 기준 W0 — 누르기 «전» 의 `getBoundingClientRect().width`(= 원래 크기).
 *   ⓑ 홀드 동안 매 rAF 로 같은 노드의 폭을 재 **비 w/W0** 를 적는다.
 *      클래스(`jz-dn`)를 세지 않는 이유: 눌림은 `scale`(정적) · 맥박은 `transform`(애니) 로 **층이 다르고**
 *      둘이 곱해져 그려진다 — 사람이 보는 것은 그 곱이지 어느 한 층이 아니다.
 *   ⓒ 강화(틱) 시각 — 결제 함수를 감싸 «성공한 호출» 을 센다(619 와 같은 자).
 *      틱 사이 구간마다 «원래 크기로 돌아온 프레임이 하나라도 있는가» 를 세면 그것이 주인이 보는 왕복이다.
 *   ⓓ 뗌 — 손을 뗀 뒤 1.0 으로 돌아오는지(정지 상태 회귀).
 *
 * 세 자리를 같은 자로 잰다(619 와 같은 스코프) — 훈련 카드 · 룬 [강화] · 단련 [단련].
 * 수리 «전» 에는 [B] 의 왕복 비율이 0 에 가깝고 최대비가 1.0 에 한참 못 미치는 것이 정상이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P621_HOLD || 2600);   /* 64 홀드: 350ms 뒤부터 160→60ms 가속 */
/* «원래 크기» 문턱 — 3회차 재설계(왕복이 «갔다 온다» 가 되어 꼭대기 창이 사이클의 28%)에 맞춰
   `verify621` 과 **같은 자**를 쓴다: 틱 축은 0.985(표본이 틱당 3~5장뿐이라 꼭대기를 놓치는 틱이 운으로 생긴다),
   완전 복귀는 듀티(0.995 이상 프레임 비율)로 따로 찍는다. 수리 전 값(0/19 · 1/20 · 0/18)은 두 문턱 어느 쪽으로도 같다. */
const REST_TH = 0.985;
const FULL_TH = 0.995;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p3 = n => Math.round(n * 1000) / 1000;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      n: '23 훈련 카드(64 홀드)' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        n: '룬 [강화](297 홀드)' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', n: '단련 [단련](297 홀드)' },
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

  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.__p621 = { buys: [], frames: [], sel: '', w0: 0, on: false };
    const P = window.__p621;
    const wrap = (name, kind, okOf) => {
      const f = window[name]; if (typeof f !== 'function') return;
      window[name] = function (...a) {
        const r = f.apply(this, a);
        if (okOf(r)) P.buys.push({ kind, t: performance.now() });
        return r;
      };
    };
    wrap('trainBuy',    'train',  r => !!r);
    wrap('temperUpBtn', 'temper', r => !!r);
    /* ⚑ 701·797 이관(2026-09-02) — 홀드 틱이 지나는 «1회» 는 코어 `temperUpOne`·`runeTryOne` 이다
       (옛 두 이름은 «막힌 첫 누름의 안내» 로만 남았다 · 홀드에서 배타적이라 같은 장부에 더한다). */
    wrap('temperUpOne', 'temper', () => true);
    wrap('runeTryOne',  'rune',   () => true);
    /* 룬은 확률 시도라 «시도» 를 센다 — 버튼은 성공·실패와 무관하게 매 틱 눌린다(이 행의 축은 «누름» 이다) */
    wrap('runeBuy',     'rune',   () => true);
    /* 프레임 자 — 눌린 노드의 그려진 폭을 매 rAF 로 적는다.
       ⚠ 호스트 폭도 같이 잰다 — 491 7·8회차가 **호스트에도** 눌림(`jz-hdn` scale .985)을 «누르고 있는
       동안 유지» 로 걸어 놓았고(주인 승인 설계), 룬·단련은 버튼이 그 안에 들어 있어 **두 층이 곱해진다**
       (실측 .94 × .985 = 0.926 = 재현 [A] 의 최소비 그대로). 이 행이 고치는 것은 «버튼 눌림» 한 층이므로
       절대비(사람이 보는 크기)와 **버튼 자기 층** 둘 다 적는다. 훈련은 «누른 것 = 호스트» 라 둘이 같다. */
    const HOSTSEL = '.tr-rn,.tr-tp,.tr-card';
    const step = () => {
      if (P.on) {
        const el = document.querySelector(P.sel);
        if (el) {
          const h = el.closest(HOSTSEL);
          P.frames.push({ t: performance.now(), w: el.getBoundingClientRect().width,
                          hw: (h && h !== el) ? h.getBoundingClientRect().width : 0 });
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  const out = [];
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(450);

    const r = await page.evaluate(sel => {
      const el = document.querySelector(sel); if (!el) return null;
      const b = el.getBoundingClientRect();
      const hs = el.closest('.tr-rn,.tr-tp,.tr-card');
      const P = window.__p621;
      P.sel = sel; P.w0 = b.width; P.buys.length = 0; P.frames.length = 0;
      P.hw0 = (hs && hs !== el) ? hs.getBoundingClientRect().width : 0;
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!r || !r.w) { ok(false, sp.id + ' 대상 없음', sp.sel); continue; }

    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    await page.mouse.move(cx, cy);
    await page.evaluate(() => { window.__p621.on = true; });
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    await page.waitForTimeout(60);
    await page.evaluate(() => { window.__p621.on = false; });
    await page.waitForTimeout(500);

    /* 뗌 뒤 정지 상태 — 스프링(jz-up .18s)이 끝난 자리 */
    const after = await page.evaluate(sel => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect().width : 0;
    }, sp.sel);

    const d = await page.evaluate(() => {
      const P = window.__p621;
      return { buys: P.buys.slice(), frames: P.frames.slice(), w0: P.w0, hw0: P.hw0 };
    });

    const W0 = d.w0, HW0 = d.hw0;
    /* 버튼 «자기 층» — 호스트(491 `jz-hdn`)의 그 순간 배율을 나눠 낸다. 호스트가 없으면(훈련) 그대로다. */
    const own = f => (HW0 && f.hw) ? (f.w / W0) / (f.hw / HW0) : f.w / W0;
    const buys = d.buys.filter(b => b.kind === sp.id).map(b => b.t);
    /* 반복 구간만 본다 — 첫 발(pointerdown 즉시 1회)과 350ms 대기 구간은 «누르고 있다» 가 맞다 */
    const rep = buys.slice(1);
    const fr = d.frames.filter(f => rep.length && f.t >= rep[0] - 8);
    const ratios = fr.map(f => f.w / W0);
    const owns = fr.map(own);
    const restFrames = owns.filter(x => x >= FULL_TH).length;
    let cyc = 0;
    for (let i = 0; i < rep.length; i++) {
      const a = rep[i] - 8, b = (i + 1 < rep.length) ? rep[i + 1] - 8 : rep[i] + 90;
      if (d.frames.some(f => f.t >= a && f.t < b && own(f) >= REST_TH)) cyc++;
    }
    out.push({
      id: sp.id, n: sp.n, w0: Math.round(W0 * 10) / 10,
      ticks: rep.length, frames: fr.length, restFrames,
      restRatio: fr.length ? p3(restFrames / fr.length) : 0,
      cyc, cycRatio: rep.length ? p3(cyc / rep.length) : 0,
      min: ratios.length ? p3(Math.min(...ratios)) : 0,
      max: ratios.length ? p3(Math.max(...ratios)) : 0,
      omin: owns.length ? p3(Math.min(...owns)) : 0,
      omax: owns.length ? p3(Math.max(...owns)) : 0,
      after: p3(after / W0),
    });
  }

  console.log('\n── [A] 홀드 중 «그려진 폭 ÷ 원래 폭» (절대 = 사람이 보는 크기 · 자기층 = 호스트 배율을 나눈 값) ──');
  console.log('  자리           원폭    틱N   프레임  자기층≥.995  비율    절대최소 절대최대 자기최소 자기최대 뗌뒤비');
  for (const o of out) {
    console.log('  ' + o.id.padEnd(13) + String(o.w0).padStart(7) + String(o.ticks).padStart(6)
      + String(o.frames).padStart(8) + String(o.restFrames).padStart(11) + String(o.restRatio).padStart(9)
      + String(o.min).padStart(9) + String(o.max).padStart(9)
      + String(o.omin).padStart(9) + String(o.omax).padStart(9) + String(o.after).padStart(8));
  }
  console.log('\n── [B] «틱마다 원래 크기로 돌아왔는가» (주인이 보는 왕복) ──────────');
  for (const o of out) console.log('  ' + o.id.padEnd(13) + '왕복한 틱 ' + o.cyc + ' / ' + o.ticks + '  (' + o.cycRatio + ')');
  console.log('');

  for (const o of out) ok(o.ticks >= 5, o.id + ' 홀드가 실제로 연속으로 돌았다', '틱 ' + o.ticks + '회');
  /* 이 셋은 «수리 전에는 빨간 것이 정상» 이다 — 재현이 등재문을 확인하는 자리 */
  for (const o of out) {
    ok(o.cycRatio >= 0.85, o.id + ' 틱마다 원래 크기로 돌아온다(목표 ≥0.85 · 표본 3~5장/틱)',
       '왕복 ' + o.cyc + '/' + o.ticks + ' (' + o.cycRatio + ') · 최대비 ' + o.max);
  }
  for (const o of out) ok(Math.abs(o.after - 1) <= 0.005, o.id + ' 손을 떼면 1.0 복귀', String(o.after));
  ok(errs.length === 0, '콘솔 에러 0', errs.slice(0, 3).join(' | '));

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
