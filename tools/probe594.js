#!/usr/bin/env node
/* 재현기 594 — `verify491` [7-*-b3] 이 왜 회차마다 뒤집히는가
 *
 *   node tools/probe594.js
 *
 * 등재문(PROGRESS 594): [7-rune-b3]·[7-tempup-b3](+ 그 결과인 [R-c])가 플레이키다 —
 * 누른 프레임의 호스트 폭이 ×0.9906 ~ ×1.02 로 흔들려 «.985 배로 줄었다» 축이 잡히다 말다 한다.
 *
 * 등재문은 «자의 문제로 보이지만 확정 전엔 단정하지 마라»(372·344 규칙)고 적어 두었다.
 * 그래서 이 자는 **제품에게 직접 묻는다** — 한 순간이 아니라 홀드 전 구간을 rAF 로 전수 표본하고
 * (579-② «한 표본은 «어느 순간» 이지 «얼마나» 가 아니다»), 자가 실제로 읽는 «200ms 한 점» 도
 * 같은 트리에서 **여러 번** 눌러 본다(플레이키는 한 번 돌려서는 안 나온다 — 344·372 규칙).
 *
 * 재는 축 셋을 **같은 프레임**에서 나란히 찍는다:
 *   ⓐ 호스트 bbox 폭 비(자가 쓰는 축)             — 맥박(`jz-hb` 의 `transform`)과 **곱해진** 값
 *   ⓑ 호스트 computed `scale`(누름 부품 자기 속성) — 맥박과 다른 속성이라 맥박과 무관
 *   ⓒ 그 프레임의 computed `transform`(= 맥박의 자리)
 * ⓐ 가 흔들리는데 ⓑ 가 고요하면 «제품은 옳고 자의 표본 «시점» 이 틀렸다» 가 확정된다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const SRC = path.join(path.resolve(__dirname, '..'), 'index.html');

const p4 = n => Math.round(n * 10000) / 10000;
const p2 = n => Math.round(n * 100) / 100;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* 자(`verify491` §7)가 쓰는 것과 **같은** 표적·같은 밴드
   ⚑ 626(2026-09-01) — `tempchg`(단련 [충전] → 헤더 `.tp-hd`) 항을 걷어냈다. 613 이 [충전]을
   기능째 폐지해 그 선택자는 한 번도 안 맞고(`verify577` [1-a] 부재 게이트), 남아 있는 동안
   `FAIL [tempchg-0] 버튼·호스트를 찾았다` 를 낸 뒤 판정 절에서 `S2.tempchg[500]` 이 undefined 라
   **[C3] 이후가 통째로 안 돌았다**(626 재현). 이 자의 축은 «`verify491` §7 과 같은 표적» 이고
   그쪽 `HOSTS` 는 613·614 이관 때 이미 rune·tempup 둘로 줄었다 — 짝을 맞춘다. */
const HOSTS = [
  { id: 'rune',    tab: 'rune',   btn: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',     n: '룬 [강화] → 카드 `.tr-rn`' },
  { id: 'tempup',  tab: 'temper', btn: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0', n: '단련 [단련] → 행 `.tr-tp`' },
];
const HOST_S = 0.985, HOST_TOL = 0.004;      /* [7-*-b3] 의 밴드 */
const BTN_LO = 0.90, BTN_HI = 0.965;         /* [7-*-b2] 의 밴드 */
const REPS = 8;                              /* «200ms 한 점» 을 몇 번 눌러 볼 것인가 */
const HOLD_DELAY = 350;                      /* 제품 `TR_HOLD_DELAY` — 홀드 «반복» 이 시작되는 시각 */

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    if (S.temper) S.temper.pts = 500;
  });
  return { ctx, page, errs };
}

/* 탭을 열고 버튼 중심·rest 폭을 잡는다 */
async function arm(page, t) {
  await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain();
    setTrSub(k); if (typeof setRuneSub === 'function') setRuneSub('r1'); S.tstone = 1e6; renderTrain(); }, t.tab);
  await page.waitForTimeout(420);
  return page.evaluate(([b, hs]) => {
    const B = document.querySelector(b), H = document.querySelector(hs);
    if (!B || !H) return null;
    const rb = B.getBoundingClientRect();
    const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
    return { bx: rb.x + rb.width / 2, by: rb.y + rb.height / 2,
             rw: H.getBoundingClientRect().width, rb: rb.width };
  }, [t.btn, t.host]);
}

/* 홀드 한 판을 rAF 전수 표본 */
async function sweep(page, t, ms) {
  const g = await arm(page, t);
  if (!g) return null;
  await page.mouse.move(g.bx, g.by);
  await page.mouse.down();
  const frames = await page.evaluate(([hs, bs, dur]) => new Promise(res => {
    const H = document.querySelector(hs), B = document.querySelector(bs);
    const out = []; const t0 = performance.now();
    (function step(now) {
      const cs = getComputedStyle(H);
      out.push({ t: Math.round(now - t0), w: H.getBoundingClientRect().width,
                 bw: B ? B.getBoundingClientRect().width : 0,
                 sc: cs.scale, tf: cs.transform });
      if (now - t0 < dur) requestAnimationFrame(step); else res(out);
    })(performance.now());
  }), [t.host, t.btn, ms]);
  await page.mouse.up();
  await page.waitForTimeout(320);
  return { g, frames };
}

/* 자가 실제로 하는 것 — 눌러서 `ms` 뒤 «한 점» 을 읽는다.
   ⚠ 읽는 순간의 **실경과**도 같이 돌려준다 — 자의 안전은 그 값이 `TR_HOLD_DELAY`(350) 아래에
   머무는가에 통째로 걸려 있는데, 그건 스케줄러가 정하지 자가 정하지 않는다. */
async function onePoint(page, t, g, ms) {
  await page.mouse.move(g.bx, g.by);
  await page.evaluate(() => { window.__t0 = performance.now(); });
  await page.mouse.down();
  await page.waitForTimeout(ms);
  const v = await page.evaluate(([hs, bs]) => {
    const H = document.querySelector(hs), B = document.querySelector(bs);
    return { hw: H.getBoundingClientRect().width, bw: B ? B.getBoundingClientRect().width : 0,
             sc: getComputedStyle(H).scale, el: Math.round(performance.now() - window.__t0) };
  }, [t.host, t.btn]);
  await page.mouse.up();
  await page.waitForTimeout(320);
  return v;
}

(async () => {
  const browser = await launch(chromium);
  const b = await boot(browser);
  const page = b.page;
  console.log('== 594 재현 — `verify491` [7-*-b3]·[7-*-b2] 플레이키 ==\n');

  const S1 = {}, S2 = {};
  for (const t of HOSTS) {
    /* ── ① 홀드 전 구간 rAF 전수 표본 ── */
    const r = await sweep(page, t, 1300);
    if (!r) { ok(false, '[' + t.id + '-0] 버튼·호스트를 찾았다'); continue; }
    ok(true, '[' + t.id + '-0] ' + t.n + ' — 호스트 rest ' + p2(r.g.rw) + ' · 버튼 rest ' + p2(r.g.rb));
    const rows = r.frames.map(f => ({ ...f, r: f.w / r.g.rw, br: r.g.rb ? f.bw / r.g.rb : 0 }));
    const rat = rows.map(f => f.r), brat = rows.map(f => f.br);
    /* 들어가는 트랜지션(.07s)이 앉은 뒤의 프레임만 «정착» 으로 본다 */
    const settled = rows.filter(f => f.t >= 120);
    const scs = [...new Set(settled.map(f => f.sc))];
    const inBand = rows.filter(f => Math.abs(f.r - HOST_S) <= HOST_TOL).length;
    const tfOn = rows.filter(f => f.tf && f.tf !== 'none').length;
    /* ⚑ 626 — 맥박을 «홀드 반복 전/후» 로 갈라 센다. [C2b] 가 죽은 [충전]을 대조군으로 쓰던
       자리를, 같은 뜻 그대로 **산 호스트 자신의 두 구간**으로 옮겨 묻기 위한 축이다
       (열차는 `TR_HOLD_DELAY` 앞에서는 서지 않는다 — 그것이 «200ms 는 대개 초록» 의 기전이다). */
    const early = rows.filter(f => f.t < HOLD_DELAY), late = rows.filter(f => f.t >= HOLD_DELAY);
    const tfOf = a => a.length ? a.filter(f => f.tf && f.tf !== 'none').length / a.length : -1;
    S1[t.id] = { n: rows.length, min: Math.min(...rat), max: Math.max(...rat),
                 bmin: Math.min(...brat), bmax: Math.max(...brat), inBand, scs,
                 pulse: tfOn / rows.length,
                 pulseEarly: tfOf(early), pulseLate: tfOf(late),
                 nEarly: early.length, nLate: late.length };
    console.log('      프레임 ' + rows.length + '개/1300ms · 호스트 폭 비 ' + p4(Math.min(...rat)) + '~' + p4(Math.max(...rat))
      + ' · 밴드(.985±.004) 안 ' + inBand + '개(' + p2(inBand / rows.length * 100) + '%)');
    console.log('      버튼 폭 비 ' + p4(Math.min(...brat)) + '~' + p4(Math.max(...brat))
      + ' · 밴드(' + BTN_LO + '~' + BTN_HI + ') 밖 프레임 '
      + brat.filter(x => x <= BTN_LO || x >= BTN_HI).length + '개');
    console.log('      정착(t≥120) computed `scale`: ' + scs.map(s => '«' + s + '»').join(' , ')
      + ' · 맥박(transform≠none) ' + tfOn + '개(' + p2(tfOn / rows.length * 100) + '%)');

    /* ── ② 자가 읽는 «한 점» 을 REPS 번. 두 시각에서 — 200ms(자의 값)와 500ms.
       둘의 차이는 **오직 벽시계 위치**다: 350ms 를 넘기면 홀드 반복이 맥박을 쏘기 시작한다. ── */
    const g = await arm(page, t);
    S2[t.id] = {};
    for (const ms of [200, 500]) {
      const pts = [];
      for (let i = 0; i < REPS; i++) pts.push(await onePoint(page, t, g, ms));
      const hr = pts.map(v => v.hw / g.rw), br2 = pts.map(v => v.bw / g.rb);
      S2[t.id][ms] = { hr, br: br2,
        outH: hr.filter(x => Math.abs(x - HOST_S) > HOST_TOL).length,
        outB: br2.filter(x => !(x > BTN_LO && x < BTN_HI)).length,
        el: pts.map(v => v.el), scs: [...new Set(pts.map(v => v.sc))] };
      const s = S2[t.id][ms];
      console.log('      ' + ms + 'ms 한 점 ×' + REPS + ' — 호스트 ×' + hr.map(p4).join(' / '));
      console.log('        └ 밴드 밖 ' + s.outH + '/' + REPS + ' · 버튼 밴드 밖 ' + s.outB + '/' + REPS
        + ' · computed `scale` ' + s.scs.map(x => '«' + x + '»').join(',')
        + ' · 실경과 ' + Math.min(...s.el) + '~' + Math.max(...s.el) + 'ms'
        + ' (반복 시작 ' + HOLD_DELAY + 'ms 까지 여유 ' + (HOLD_DELAY - Math.max(...s.el)) + 'ms)');
    }
    console.log('');
  }

  console.log('-- 판정 --');
  const ids = Object.keys(S1);
  ok(ids.every(k => S1[k].max - S1[k].min > HOST_TOL * 2),
     '[A] 자가 쓰는 축(호스트 bbox 폭 비)은 홀드 한 판 안에서 밴드 폭(±.004)보다 넓게 흔들린다',
     ids.map(k => k + ' ' + p4(S1[k].min) + '~' + p4(S1[k].max)).join(' · '));
  ok(ids.every(k => S1[k].scs.length === 1 && Math.abs(parseFloat(S1[k].scs[0]) - HOST_S) <= 0.0005),
     '[B] ★ 같은 프레임의 computed `scale` 은 정착 뒤 «.985» 한 값뿐이다 — **제품 결함이 아니다**',
     ids.map(k => k + ' ' + S1[k].scs.join('/')).join(' · '));
  /* ⚑ 플레이키의 **기전**을 못박는 두 항. 200ms 는 «맞아서» 초록인 게 아니라
     `TR_HOLD_DELAY`(350) 앞에 서 있어서 초록이다 — 그 앞자리는 스케줄러가 정한다. */
  ok(ids.every(k => S2[k][200].outH === 0),
     '[C] 200ms 한 점은 **한가한 트리에서는** 세 자리 전부 밴드 안이다(그래서 대개는 초록이다)',
     ids.map(k => k + ' ' + S2[k][200].outH + '/' + REPS
       + ' 실경과≤' + Math.max(...S2[k][200].el) + 'ms').join(' · '));
  /* ⚠ 자리를 뭉뚱그리지 않는다 — 등재문이 이름을 댄 것은 **rune·tempup 둘뿐**이고, 그게 맞다. */
  ok(S2.rune[500].outH + S2.tempup[500].outH >= REPS,
     '[C2] ★ 등재문이 이름을 댄 두 자리는 시각만 500ms 로 옮기면 밴드 밖으로 쏟아진다 — 자를 지키는 것은 '
     + '«.985 가 맞다» 가 아니라 «읽는 점이 350ms 앞에 있다» 라는 우연이다',
     ['rune', 'tempup'].map(k => k + ' ' + S2[k][500].outH + '/' + REPS
       + ' ×' + p4(Math.max(...S2[k][500].hr))).join(' · '));
  /* ⚑ 626 — 옛 [C2b](«등재문이 tempchg 를 안 부른 이유 — [충전]은 홀드 **반복**이 안 돌아 맥박
     열차가 없다»)를 **판정에서 걷어냈다.** 그 항의 재료는 «홀드 반복이 안 도는 버튼» 하나뿐인데
     613 이 [충전]을 폐지해 이 자의 표적에서 그런 버튼이 사라졌다.
     ⚠ **산 자리로 옮기는 안을 먼저 시험했고, 재현이 기각했다**(338 규칙 — 재현이 아니라면 아니다):
     대조군을 «같은 호스트의 반복 전 구간(t < TR_HOLD_DELAY)» 으로 옮겨 «350ms 앞은 고요하다» 를
     물었더니 반복 전 맥박이 **41.7% / 41.2%** 로 나왔다 — 첫 발이 누른 그 순간 서기 때문이다
     (619 «틱당 1회» 의 첫 틱). 즉 «열차가 없다» 는 [충전] 고유의 성질이지 «반복 전» 의 성질이
     아니었다. 임계를 그 두 수에 맞춰 넓히는 것은 표본에 자를 맞추는 짓이라 안 했다
     (624 판단과 같다: 333 «자리를 비우지 마라» 는 «살아 있는 대체 계약» 이 있을 때의 말이다).
     재는 것 자체는 남긴다 — 판정이 아니라 **관측 한 줄**로. 다음 세션이 «반복 전/후» 를 다시
     세울 때 밑값이 된다. [충전] 시절의 수치는 `docs/review/594-*.md` 에 그대로 있다. */
  console.log('  ·  [관측] 맥박 밀도 — ' + ids.map(k => k + ' 반복전(t<' + HOLD_DELAY + 'ms) '
    + p2(S1[k].pulseEarly * 100) + '% (' + S1[k].nEarly + '프레임) → 반복후 '
    + p2(S1[k].pulseLate * 100) + '% (' + S1[k].nLate + '프레임)').join(' · '));
  /* ⚑ **기각된 가설**(338 규칙 — 재현이 아니라고 하면 아니다). 착수 때 세운 «맥박이 호스트를 통째로
     곱하니 안의 버튼 축([7-*-b2])도 같이 흔들릴 것» 은 **틀렸다**: 버튼은 호스트 **안**이라 밑값이
     .94 × .985 = .9259 로 이미 낮고, 이 세 호스트의 맥박은 `--hb-s` 1.02 라 최대가 .9444 —
     밴드 상한 .965 에 **0.021 남는다**. ⇒ b2 는 «지금은» 성하다. 그래도 §7 에서 b3 와 같은
     구간 최솟값으로 옮긴 이유는 여기 있다: 그 여유를 지키는 것이 `--hb-s` 값 하나뿐이라,
     큰 카드가 아닌 호스트(기본 1.06)가 목록에 들어오면 .9259 × 1.06 = **.9815 로 즉시 밴드 밖**이다. */
  ok(ids.every(k => S2[k][500].outB === 0),
     '[C3] 기각 — 버튼 축([7-*-b2])은 같은 자리에서 **안 흔들린다**(밑값이 낮아 맥박을 곱해도 밴드 안)',
     ids.map(k => k + ' ' + S2[k][500].outB + '/' + REPS
       + ' 최대 ×' + p4(Math.max(...S2[k][500].br)) + ' (상한 ' + BTN_HI + ')').join(' · '));
  ok(ids.every(k => Math.abs(S1[k].min - HOST_S) <= HOST_TOL),
     '[D] ★ 대안 축 — 홀드 구간 **최솟값**은 세 자리 전부 .985 밴드 안이다(맥박은 scale ≥ 1 로만 곱한다)',
     ids.map(k => k + ' min ' + p4(S1[k].min)).join(' · '));
  ok(ids.every(k => S1[k].bmin > BTN_LO && S1[k].bmin < BTN_HI),
     '[D2] 같은 대안 축이 버튼에도 선다 — 버튼 최솟값이 .94 밴드 안이다',
     ids.map(k => k + ' min ' + p4(S1[k].bmin)).join(' · '));
  ok(ids.every(k => S1[k].inBand >= 3),
     '[E] 전제 — 밴드 안 프레임이 홀드마다 충분히 있다(최솟값 축이 «표본 0» 으로 헛초록이 되지 않는다)',
     ids.map(k => k + ' ' + S1[k].inBand + '개').join(' · '));

  ok(b.errs.length === 0, '[Z] 콘솔 에러 0', b.errs.slice(0, 2).join(' | '));
  await b.ctx.close();
  console.log('\nPROBE594 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
