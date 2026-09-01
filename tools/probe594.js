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
 *
 * ⚑ 627(2026-09-01) — 판정 절 두 항의 **선언**을 갈아 끼웠다(제품 `index.html` 0줄).
 *   [C2] 는 «500ms 한 점 ×8» 로 재고 있었는데 그 표본은 `mousedown` 으로부터 같은 지연에 서므로
 *        맥박 열차와 **위상이 물려** 회차마다 0/8 ↔ 8/8 로 갈렸다(자기가 진단한 병을 자기가 앓았다)
 *        ⇒ 같은 뜻을 **반복 구간 rAF 전수**로 옮겼다. 옛 한 점은 관측으로 남는다.
 *   [C3] 은 «버튼 축은 안 흔들린다» 였는데 **621**(틱마다 원래 크기 ↔ 눌린 크기 왕복)이 이 자보다
 *        뒤에 들어와 뜻이 뒤집혔다 ⇒ «밴드 위 프레임 = 누름이 없는 프레임» 으로 갈아 끼우고,
 *        594 의 결론(«눌린 버튼은 맥박을 곱해도 밴드 안»)은 [C3b] 로 따로 세웠다.
 *   ⇒ 이 자의 결론은 그대로다: `verify491` §7 이 **구간 최솟값**을 쓰는 것이 옳다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
/* ⚑ 627 — `--src <파일>` 로 **사본**을 물릴 수 있다(기본은 제품). 되돌림 시험 전용 손잡이다:
   맥박(`jz-hb`)을 뺀 사본에서 [C2] 가, 621 왕복(`jzPressTick`)을 뺀 사본에서 [C3] 이 빨개지는지
   물어야 두 항이 «이미 참인 것을 굳힌 헛초록» 이 아님을 말할 수 있다.
   ⚠ 사본을 저장소 뿌리 **밖**에 두면 상대 경로 자산이 안 붙어 [Z](콘솔 에러 0)만 빨개진다 —
     그 한 항은 사본 자리 탓이지 되돌림의 결과가 아니다(627 실측: rA·rB 둘 다 [Z] 만 곁들여 빨감). */
const ARGV = process.argv.slice(2);
const srcArg = ARGV.indexOf('--src');
const SRC = srcArg >= 0 && ARGV[srcArg + 1]
  ? path.resolve(ARGV[srcArg + 1])
  : path.join(path.resolve(__dirname, '..'), 'index.html');

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
const ROUNDS = 2;                            /* ⚑ 627 — 표본을 모을 홀드 판 수(위상 결 상쇄, 아래 ①) */
const SWEEP = 2200;                          /* ⚑ 627 — rAF 전수 표본의 홀드 길이. 1300 에서 늘렸다:
                                                반복 구간이 950 → 1850ms 가 되어 late 프레임이 19~25 → 40 안팎이 된다.
                                                「한 점 ×8」과 달리 여기서는 **시간을 늘리면 위상이 늘어난다** —
                                                판정이 표본 수에 쫓기지 않게 하는 유일한 손잡이다. */

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
      /* ⚑ 627 — 버튼 **자신의** computed `scale` 도 같은 프레임에서 찍는다. 621(«틱마다 원래 크기 ↔
         눌린 크기 왕복»)이 들어온 뒤로 버튼 폭 비는 «맥박 × 호스트 × **621 사이클**» 세 겹이라,
         밴드 밖 프레임이 «맥박 탓» 인지 «그 프레임에 누름이 없어서» 인지 이 값 없이는 못 가른다. */
      out.push({ t: Math.round(now - t0), w: H.getBoundingClientRect().width,
                 bw: B ? B.getBoundingClientRect().width : 0,
                 sc: cs.scale, tf: cs.transform,
                 bsc: B ? getComputedStyle(B).scale : null });
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
    /* ── ① 홀드 전 구간 rAF 전수 표본 — ⚑ 627: **홀드 두 판을 모아서** 본다.
       rAF(≈60Hz, 헤드리스에서는 15~25Hz)와 맥박 열차(틱 60~160ms)는 **주기가 서로 물릴 수 있어서**
       한 판만 보면 «맥박은 도는데 표본이 그 창을 계속 비껴가는» 결이 생긴다(실측: 같은 트리에서
       rune 이 7% ~ 62% 사이를 오갔다). 판을 새로 시작하면 두 주기의 위상차가 새로 뽑히므로
       두 판을 모으면 그 결이 상쇄된다 — 「한 점 ×8」이 **못 하는 일**이 이것이다(그쪽은 여덟 번이
       같은 `mousedown` 지연에 서서 위상이 하나뿐이다). ── */
    const rounds = [];
    for (let i = 0; i < ROUNDS; i++) {
      const one = await sweep(page, t, SWEEP);
      if (!one) break;
      rounds.push(one);
    }
    if (!rounds.length) { ok(false, '[' + t.id + '-0] 버튼·호스트를 찾았다'); continue; }
    const r = rounds[0];
    ok(true, '[' + t.id + '-0] ' + t.n + ' — 호스트 rest ' + p2(r.g.rw) + ' · 버튼 rest ' + p2(r.g.rb)
      + ' · 홀드 ' + rounds.length + '판 × ' + SWEEP + 'ms');
    const rows = [].concat(...rounds.map(rd =>
      rd.frames.map(f => ({ ...f, r: f.w / rd.g.rw, br: rd.g.rb ? f.bw / rd.g.rb : 0 }))));
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
    /* ⚑ 627 — 「한 점」 대신 **구간**에서 밴드 밖을 센다(등재문 갈래 ⓑ). 한 점 축은 표본이
       `mousedown` 으로부터 같은 지연에 서므로 맥박 열차와 **위상이 물린다** — 회차마다 0/8 아니면
       8/8 로 갈리는 쌍봉이고, 그것이 [C2] 가 «회차마다 뒤집히던» 기전이다. rAF 전수 표본은
       모든 위상을 지나므로 같은 뜻을 흔들리지 않게 말한다. */
    const hOut = f => Math.abs(f.r - HOST_S) > HOST_TOL;      /* 호스트가 .985 밴드 밖인가 */
    const bOutHi = f => f.br >= BTN_HI;                        /* 버튼이 밴드 **위**로 나갔는가 */
    const bIn = f => f.br > BTN_LO && f.br < BTN_HI;
    const pressed = f => f.bsc !== null && f.bsc !== 'none' && parseFloat(f.bsc) <= 0.945;
    S1[t.id] = { n: rows.length, min: Math.min(...rat), max: Math.max(...rat),
                 bmin: Math.min(...brat), bmax: Math.max(...brat), inBand, scs,
                 pulse: tfOn / rows.length,
                 pulseEarly: tfOf(early), pulseLate: tfOf(late),
                 nEarly: early.length, nLate: late.length,
                 lateOutH: late.filter(hOut).length,
                 lateMaxH: late.length ? Math.max(...late.map(f => f.r)) : 0,
                 lateOutBHi: late.filter(bOutHi).length,
                 /* 밴드 위로 나간 프레임 중 «그 프레임에 누름이 없던» 것의 수(621 왕복의 꼭대기) */
                 lateOutBHiUp: late.filter(f => bOutHi(f) && !pressed(f)).length,
                 latePressed: late.filter(pressed).length,
                 latePressedIn: late.filter(f => pressed(f) && bIn(f)).length,
                 latePressedMax: late.filter(pressed).length
                   ? Math.max(...late.filter(pressed).map(f => f.br)) : 0,
                 bscs: [...new Set(late.map(f => f.bsc))].slice(0, 6) };
    console.log('      프레임 ' + rows.length + '개/' + rounds.length + '판×' + SWEEP + 'ms · 호스트 폭 비 ' + p4(Math.min(...rat)) + '~' + p4(Math.max(...rat))
      + ' · 밴드(.985±.004) 안 ' + inBand + '개(' + p2(inBand / rows.length * 100) + '%)');
    console.log('      버튼 폭 비 ' + p4(Math.min(...brat)) + '~' + p4(Math.max(...brat))
      + ' · 밴드(' + BTN_LO + '~' + BTN_HI + ') 밖 프레임 '
      + brat.filter(x => x <= BTN_LO || x >= BTN_HI).length + '개');
    console.log('      정착(t≥120) computed `scale`: ' + scs.map(s => '«' + s + '»').join(' , ')
      + ' · 맥박(transform≠none) ' + tfOn + '개(' + p2(tfOn / rows.length * 100) + '%)');
    /* ⚑ 627 — 판정이 서는 구간(t ≥ TR_HOLD_DELAY = 홀드 반복이 도는 동안)의 밑값을 같이 찍는다. */
    const s1 = S1[t.id];
    console.log('      반복 구간(t≥' + HOLD_DELAY + 'ms · ' + s1.nLate + '프레임) — 호스트 밴드 밖 '
      + s1.lateOutH + '개(' + p2(s1.lateOutH / s1.nLate * 100) + '%, 최대 ×' + p4(s1.lateMaxH) + ')'
      + ' · 버튼 밴드 위 ' + s1.lateOutBHi + '개(그중 «그 프레임에 누름 없음» ' + s1.lateOutBHiUp + '개)'
      + ' · 눌린 프레임 ' + s1.latePressed + '개(밴드 안 ' + s1.latePressedIn + '개, 최대 ×'
      + p4(s1.latePressedMax) + ')');

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
  /* ⚠ 자리를 뭉뚱그리지 않는다 — 등재문이 이름을 댄 것은 **rune·tempup 둘뿐**이고, 그게 맞다.
     ⚑ 627(2026-09-01) — **뜻은 그대로 두고 자를 «한 점 ×8» 에서 «반복 구간 전수» 로 옮겼다**(등재문 갈래 ⓑ).
       옛 항은 `S2[k][500].outH` 합 ≥ 8 을 요구했는데 그 표본은 `mousedown` 으로부터 **늘 같은 지연**에
       서므로 맥박 열차와 위상이 물린다 — 여덟 번을 눌러도 여덟 번이 같은 위상이라 회차마다
       **0/8 아니면 8/8** 로 갈리는 쌍봉이었다(실측: rune 1~3/8 · tempup 0/8 ↔ 8/8).
       ⚠ 그 흔들림이 곧 594 가 진단한 병이므로 **임계를 낮춰 통과시키는 것은 답이 아니다** — 자기가
       진단한 병을 자기가 앓는 자리라, 축을 옮기는 것이 옳다. rAF 전수 표본은 모든 위상을 지난다.
       ⚠ 무르게 풀지 않았음: 「밴드 밖 프레임이 있다」로 끝내지 않고 **최댓값이 밴드 상한을 배(2×TOL)로
       넘는가**를 같이 묻는다 — 누름이 통째로 빠져 폭이 1.0 로 붙어 버린 트리와, 맥박이 죽어
       .985 로 굳은 트리를 **둘 다** 걸러 낸다(전자는 아래 [D] 가, 후자는 이 항이 빨개진다). */
  ok(ids.every(k => S1[k].lateOutH >= 2 && S1[k].lateMaxH >= HOST_S + HOST_TOL * 2),
     '[C2] ★ 반복 구간(t≥' + HOLD_DELAY + 'ms)에서는 호스트 폭이 밴드 밖으로 쏟아진다 — 자를 지키는 것은 '
     + '«.985 가 맞다» 가 아니라 «읽는 점이 ' + HOLD_DELAY + 'ms 앞에 있다» 라는 우연이다',
     ids.map(k => k + ' ' + S1[k].lateOutH + '/' + S1[k].nLate
       + '(' + p2(S1[k].lateOutH / S1[k].nLate * 100) + '%) 최대 ×' + p4(S1[k].lateMaxH)).join(' · '));
  /* ⚑ 627 — 옛 «한 점» 표본은 **관측으로 남긴다.** 판정에서 뺐다고 안 재는 것이 아니다:
     쌍봉(0/8 ↔ 8/8)이 눈에 보여야 다음 세션이 같은 함정에 다시 자를 세우지 않는다. */
  console.log('  ·  [관측] 500ms 「한 점 ×' + REPS + '」 — '
    + ['rune', 'tempup'].map(k => k + ' 밴드 밖 ' + S2[k][500].outH + '/' + REPS
      + ' ×' + p4(Math.max(...S2[k][500].hr))).join(' · ')
    + '  (위상이 물려 회차마다 0/8 ↔ 8/8 로 갈린다 — 판정은 위 [C2] 의 구간 축이 한다)');
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
     큰 카드가 아닌 호스트(기본 1.06)가 목록에 들어오면 .9259 × 1.06 = **.9815 로 즉시 밴드 밖**이다.

     ⚑⚑ 627(2026-09-01) — **이 자리는 뜻이 뒤집혔고, 뒤집은 것은 제품이다**(등재문 갈래 ⓐ).
       옛 [C3] 은 «버튼 축은 같은 자리에서 안 흔들린다»(`outB === 0`)를 단언했는데 실측은 **3~6/8 이
       밴드 밖**이다. 뿌리는 이 자가 쓰인 **뒤에 들어온 621**(주인 지시 «연속 강화 중 버튼은 원래 크기 ↔
       눌린 크기를 왕복해야 한다»)이다 — `jzPressTick()` 이 틱마다 버튼 자신의 `scale` 을
       **.94 → 1 → .94** 로 한 바퀴 돌리므로, 사이클 꼭대기에 걸린 프레임은 누름이 **없는** 값
       (호스트 .985 × 맥박)으로 읽힌다. 즉 «흔들린다» 는 결함이 아니라 **주인이 지시한 동작**이다.
       ⇒ 333 처방대로 **자리를 비우지 않고 뜻을 갈아 끼운다.** 갈아 끼운 뒤에도 옛 결론이 서는지를
       [C3b] 가 따로 못박으므로 «무르게 푼 것» 이 아니다 — 축이 둘로 갈렸을 뿐이다:
         [C3]  왜 밴드 밖인가 — 밴드 위 프레임은 **예외 없이** «그 프레임에 누름이 없다»(621 왕복)
         [C3b] 594 의 결론 — **눌린** 프레임은 여전히 전부 밴드 안이고 최대가 예측값 .9444 다
       ⚠ 판정을 «한 점» 이 아니라 **반복 구간 전수**에서 한다([C2] 와 같은 이유 — 621 사이클도
         `mousedown` 기준이라 한 점은 위상이 물린다). */
  ok(ids.every(k => S1[k].lateOutBHi >= 1 && S1[k].lateOutBHiUp === S1[k].lateOutBHi),
     '[C3] 정정(621) — 버튼이 밴드 **위**로 나가는 프레임은 예외 없이 «그 프레임에 누름이 없는» 프레임이다 '
     + '(맥박이 누름을 약하게 만든 것이 아니라 621 왕복이 원래 크기를 지난다)',
     ids.map(k => k + ' 밴드 위 ' + S1[k].lateOutBHi + '개 중 누름 없음 ' + S1[k].lateOutBHiUp
       + '개 · 반복 구간 자기 `scale` ' + S1[k].bscs.map(x => '«' + x + '»').join(',')).join(' · '));
  ok(ids.every(k => S1[k].latePressed >= 3 && S1[k].latePressedIn === S1[k].latePressed
                    && S1[k].latePressedMax < BTN_HI),
     '[C3b] 기각은 그대로 선다 — **눌린** 프레임(자기 `scale` ≤ .945)은 전부 밴드 안이다 '
     + '(밑값 .9259 에 맥박 1.02 를 곱해도 .9444 로 상한 ' + BTN_HI + ' 안)',
     ids.map(k => k + ' ' + S1[k].latePressedIn + '/' + S1[k].latePressed
       + ' 최대 ×' + p4(S1[k].latePressedMax)).join(' · '));
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
