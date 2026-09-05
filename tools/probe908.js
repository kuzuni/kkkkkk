#!/usr/bin/env node
/* 재현기 908 — 「`verify583` [C-temper] 의 **위끝**이 플레이키하다」 (2026-09-05 등재)
 *
 *   node tools/probe908.js [--runs N] [--site temper|rune|train|all]
 *
 * 등재문 실측: 906 수리 후 30회 중 1회(3.3%) — 「실측 알 38.0px vs 위끝 36.0px」.
 *
 * ⚑ 무엇을 갈라야 하는가 — 갈래는 셋이고 **서로 배타적이다**:
 *   ⓐ 제품이 흔들린다 — 알이 실제로 «버튼이 허용하는 만큼» 을 넘는다(제품 결함).
 *   ⓑ 자의 **표본 운** — `verify583` [C] 가 위끝을 «40ms 격자가 본 가장 큰 버튼 상자» 에서
 *      유도하는데(`hi = bg.ic(34)`), 621 눌림 왕복이 홀드 내내 그 상자를 흔든다. 격자가
 *      봉우리를 놓친 실행에서는 위끝이 **낮게** 잡히고, 자가 못 본 더 큰 순간에 태어난 알이
 *      그 위끝을 넘는다 → 빨강. (같은 항의 **아래끝**에 대해서는 [C] 주석이 이미 이 구멍을
 *      적어 두고 «잴 수 없는 것을 문턱으로 세우지 않는다» 로 비켜 갔다. 위끝은 안 비켰다.)
 *   ⓒ 906 이 만진 축의 부작용 — 906 은 `[D-*-o]` 가 견주는 **집합**만 바꿨고 이 항이 읽는
 *      `onx`/`onm`·`bw`/`bh` 는 한 글자도 안 건드렸다(등재문 판정). 이 자가 대조로 확인한다.
 *
 * 재는 것 — 한 홀드 창(720ms) 안에서 발원 버튼 상자를 **두 자**로 동시에 재고 견준다:
 *   · G40 = `verify583` 과 **같은 40ms 격자**(자가 실제로 보는 것)
 *   · RAF = 매 프레임(≈16.7ms) — 격자가 무엇을 놓치는지가 여기서 나온다
 *   · ANA = **해석적 상한** = 쉬는 상자 × 호스트가 신고한 눌림 진폭 상한(`--hb-s`)
 *           — 표본을 안 쓰므로 실행마다 한 값이다(처방 ⓑ 의 후보)
 *   그리고 같은 창에서 태어난 알의 실제 폭(`offsetWidth`) 최댓값.
 *
 * 판정: 세 상자에서 각각 `verify583` [C] 의 사슬로 위끝을 유도해 «실측 알 ≤ 위끝» 을 매 실행 찍는다.
 *       ⓑ 가 참이면 **G40 만** 실행마다 흔들리고 RAF·ANA 는 안 흔들린다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const n1 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(1);

const SITES = [
  { k:'train',  n:'23 훈련 카드', sub:'train',  cur:'gold',
    host:'#trCards [data-tr="atk"]', btn:'#trCards [data-tr="atk"]' },
  { k:'rune',   n:'룬 [강화]',    sub:'rune',   cur:'rstone',
    host:'#trRunes .tr-rn',        btn:'#trRunes .tr-rn .rbt.b1' },
  { k:'temper', n:'단련 [투자]',  sub:'temper', cur:'tstone',
    host:'#trTemper .tr-tp',       btn:'#trTemper .tr-tp .tb' }
];

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const RUNS = Math.max(1, parseInt(arg('--runs', '6'), 10) || 6);
const WANT = arg('--site', 'all');

/* `verify583` [C] 의 사슬 — 사본이 아니라 **같은 산수**를 여기서도 유도한다(402 «사본을 지운다» 의
   반대처럼 보이지만, 이 자는 «자가 무엇을 보는가» 를 재는 재현기라 자와 같은 식이어야 뜻이 있다.
   수리가 끝나면 이 식은 `verify583` 과 **한 벌로** 바뀌어야 한다 — 그때 이 자가 먼저 빨개진다). */
function chainHi(K, a, w, h) {
  const hsc = Math.min(Math.max(Math.sqrt(w * h) / 410, 1), K.DMAX / K.SZMAX);
  const cap = Math.max(K.SZMIN, a.fits * Math.min(w, h));
  const fitIC = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * a.szs * K.CIC_SC));
  const ic = v => Math.max(K.SZMIN, Math.round(Math.round(Math.round(v * hsc * a.szs) * K.CIC_SC) * fitIC));
  return { hi: ic(34), hi31: ic(31), cap, hsc, fitIC };
}

(async () => {
  console.log('\n=== probe908 — [C-temper] 위끝 플레이키의 뿌리 ===\n');
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
  await p.waitForTimeout(1200);
  await p.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; openTrain(); });
  await p.waitForTimeout(400);

  const K = await p.evaluate(() => ({ CIC_SC: FX_CIC_SC, FITS: FXB_FITS,
    SZMIN: FXB_SZMIN, SZMAX: FXB_SZMAX, DMAX: FXB_DMAX }));

  const sites = SITES.filter(s => WANT === 'all' || s.k === WANT);
  const LOG = {};
  for (const s of sites) LOG[s.k] = [];

  for (let run = 1; run <= RUNS; run++) {
    for (const s of sites) {
      await p.evaluate(s => { setTrSub(s.sub); renderTrain();
        const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; }, s);
      await p.waitForTimeout(220);
      /* 축(호스트 신고) + **쉬는 상자**(누르기 전) + 눌림 진폭 상한(`--hb-s`) */
      const A = await p.evaluate(s => {
        const h = document.querySelector(s.host); if (!h) return null;
        const sel = (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim();
        const t = (sel && h.querySelector(sel)) || h;
        const st = getComputedStyle(t);
        const sz = parseFloat(st.getPropertyValue('--burst-sz'));
        const ft = parseFloat(st.getPropertyValue('--burst-fit'));
        /* `--hb-s` = 488 맥박 진폭(호스트가 정한다 · `@keyframes jzHb` 0% 의 scale). 신고가
           없으면 CSS 기본값 1.06 이 쓰인다 — 여기서도 같은 폴백을 쓴다. */
        const hb = parseFloat(getComputedStyle(h).getPropertyValue('--hb-s'));
        const rest = fxRect(t);
        return { sel, szs: (sz > 0 && sz <= 1) ? sz : 1,
                 fits: (ft > 0 && ft <= FXB_FITS) ? ft : FXB_FITS,
                 hb: (hb > 0 ? hb : 1.06), rest };
      }, s);
      if (!A || !A.rest) { console.log('  (건너뜀 — 호스트 없음: ' + s.k + ')'); continue; }

      const bb = await (await p.$(s.btn)).boundingBox();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.mouse.down();
      const M = await p.evaluate(s => new Promise(res => {
        const t0 = performance.now();
        const g40 = [], raf = [], eggs = [];
        const box = () => {
          const h = document.querySelector(s.host);
          const bs = h ? (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim() : '';
          const bh = (h && bs && h.querySelector(bs)) || h;
          return bh ? fxRect(bh) : null;
        };
        /* ① `verify583` 과 **같은 40ms 격자** — 상자와 알 폭을 한 틱에 같이 집는다 */
        const iv = setInterval(() => {
          const r = box(); if (r) g40.push({ t: Math.round(performance.now() - t0), w: r.w, h: r.h });
          const live = [...document.querySelectorAll('#fxl .fx-cic')];
          for (const n of live) { const w = n.offsetWidth; if (w > 0) eggs.push(w); }
          if (performance.now() - t0 > 720) { clearInterval(iv); res({ g40, raf, eggs }); }
        }, 40);
        /* ② 매 프레임 — 격자가 무엇을 놓치는지 */
        const tick = () => {
          if (performance.now() - t0 > 720) return;
          const r = box(); if (r) raf.push({ t: Math.round(performance.now() - t0), w: r.w, h: r.h });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }), s);
      await p.waitForTimeout(60);
      await p.mouse.up();
      await p.waitForTimeout(360);

      const pick = arr => arr.reduce((m, x) => (Math.min(x.w, x.h) > Math.min(m.w, m.h) ? x : m), arr[0]);
      const pickMin = arr => arr.reduce((m, x) => (Math.min(x.w, x.h) < Math.min(m.w, m.h) ? x : m), arr[0]);
      if (!M.g40.length || !M.raf.length || !M.eggs.length) { console.log('  (표본 0 — ' + s.k + ')'); continue; }
      const G = pick(M.g40), Rf = pick(M.raf);
      const Gs = pickMin(M.g40), Rs = pickMin(M.raf);
      const AN = { w: A.rest.w * A.hb, h: A.rest.h * A.hb };
      const got = Math.max(...M.eggs);
      const cG = chainHi(K, A, G.w, G.h), cR = chainHi(K, A, Rf.w, Rf.h), cA = chainHi(K, A, AN.w, AN.h);
      /* «격자 운이 최악이었다면» — 같은 실행의 **실측 궤적**에서 가장 작은 상자만 격자에 걸린
         경우를 산수로 되돌린다(`verify583` [R5]·[R6] 과 같은 손짓). 3.3% 사건을 기다리지 않고
         그 사건이 **이 궤적 안에서 도달 가능한지**를 매 실행 찍는다. */
      const cW = chainHi(K, A, Rs.w, Rs.h);
      const tol = v => Math.max(1, v * 0.02);
      const rec = { run, got,
                    g40: cG.hi, raf: cR.hi, ana: cA.hi, worst: cW.hi,
                    smG: chainHi(K, A, Gs.w, Gs.h), boxGs: Gs,
                    boxG: G, boxR: Rf, boxA: AN, rest: A.rest, hb: A.hb,
                    okG: got <= cG.hi + tol(cG.hi), okR: got <= cR.hi + tol(cR.hi), okA: got <= cA.hi + tol(cA.hi),
                    okW: got <= cW.hi + tol(cW.hi) };
      LOG[s.k].push(rec);
      console.log('  · ' + s.k + ' r' + run
        + ' — 알 최대 ' + n1(got)
        + ' | 위끝 G40 ' + n1(cG.hi) + (rec.okG ? '' : ' ✗')
        + ' · RAF ' + n1(cR.hi) + (rec.okR ? '' : ' ✗')
        + ' · ANA ' + n1(cA.hi) + (rec.okA ? '' : ' ✗')
        + ' | 상자 쉼 ' + n1(A.rest.w) + '×' + n1(A.rest.h)
        + ' · G40 ' + n1(G.w) + '×' + n1(G.h)
        + ' · RAF ' + n1(Rf.w) + '×' + n1(Rf.h)
        + ' · ANA(×' + A.hb + ') ' + n1(AN.w) + '×' + n1(AN.h)
        + ' | 표본 ' + M.g40.length + '/' + M.raf.length);
    }
  }

  console.log('\n[1] 갈래 ⓑ — «자의 표본 운» : 40ms 격자가 본 상자가 **실행마다 다르다**');
  for (const s of sites) {
    const L = LOG[s.k]; if (!L.length) continue;
    const ws = L.map(x => x.boxG.w), hiG = L.map(x => x.g40);
    const spanW = Math.max(...ws) - Math.min(...ws), spanHi = Math.max(...hiG) - Math.min(...hiG);
    ok(true, '[1-' + s.k + '] (관측) 40ms 격자 상자 폭 ' + n1(Math.min(...ws)) + '~' + n1(Math.max(...ws))
       + ' (폭 ' + n1(spanW) + 'px) ⇒ 위끝 ' + Math.min(...hiG) + '~' + Math.max(...hiG) + ' (폭 ' + n1(spanHi) + 'px)');
  }

  console.log('\n[2] RAF·ANA 는 안 흔들린다 — 흔들리는 것은 **격자**뿐이다');
  for (const s of sites) {
    const L = LOG[s.k]; if (!L.length) continue;
    const spanR = Math.max(...L.map(x => x.raf)) - Math.min(...L.map(x => x.raf));
    const spanA = Math.max(...L.map(x => x.ana)) - Math.min(...L.map(x => x.ana));
    const spanG = Math.max(...L.map(x => x.g40)) - Math.min(...L.map(x => x.g40));
    ok(spanA === 0,
       '[2-' + s.k + '] ★ 해석적 상한(ANA)은 실행마다 **한 값**이다 — 표본 운이 통째로 없다',
       'ANA 폭 ' + n1(spanA) + ' · RAF 폭 ' + n1(spanR) + ' · G40 폭 ' + n1(spanG));
  }

  console.log('\n[3] 갈래 ⓐ 기각 — 알은 **해석적 상한**을 한 번도 안 넘는다(제품 무죄)');
  for (const s of sites) {
    const L = LOG[s.k]; if (!L.length) continue;
    const bad = L.filter(x => !x.okA);
    ok(bad.length === 0,
       '[3-' + s.k + '] ★ 알 최대가 «쉬는 상자 × --hb-s» 사슬의 위끝을 안 넘는다 = 흔들린 것은 제품이 아니다',
       L.length + '회 중 초과 ' + bad.length + '회 · 알 최대 ' + n1(Math.max(...L.map(x => x.got)))
       + ' vs ANA 위끝 ' + L[0].ana);
  }

  console.log('\n[4] 갈래 ⓑ 확인 — 같은 실행에서 G40 위끝만 알에 진다');
  let anyG = 0, anyR = 0;
  for (const s of sites) {
    const L = LOG[s.k]; if (!L.length) continue;
    const badG = L.filter(x => !x.okG), badR = L.filter(x => !x.okR);
    anyG += badG.length; anyR += badR.length;
    console.log('  · ' + s.k + ' — G40 초과 ' + badG.length + '/' + L.length
      + ' · RAF 초과 ' + badR.length + '/' + L.length + ' · ANA 초과 0/' + L.length);
  }
  ok(true, '[4] (관측) 40ms 격자 위끝 초과 합계 ' + anyG + '회 · 매 프레임 위끝 초과 합계 ' + anyR + '회');

  console.log('\n[5] 격자가 놓치는 몫 — 봉우리까지의 거리');
  for (const s of sites) {
    const L = LOG[s.k]; if (!L.length) continue;
    const d = L.map(x => (x.boxA.w - x.boxG.w));
    ok(true, '[5-' + s.k + '] (관측) 해석 봉우리 − 격자 최대 = ' + n1(Math.min(...d)) + '~' + n1(Math.max(...d)) + 'px'
       + ' · 쉬는 상자 대비 ' + n1(100 * Math.max(...d) / L[0].rest.w) + '%');
  }

  console.log('\n[6] ★ 사건 재구성 — 같은 궤적에서 «격자 운이 최악» 이면 위끝이 실제로 진다');
  /* 3.3% 를 기다리는 대신, 그 실행의 **실측 궤적**에서 가장 작게 눌린 순간만 격자에 걸린 경우를
     산수로 되돌린다. 이것이 빨갛다 = 등재문의 사건(38.0 vs 36.0)이 «운이 나쁘면 나는 것» 이고
     제품 쪽 사건이 아니다. 이 항은 **빨간 것이 정상**이다(재현기의 양성 대조). */
  for (const s of sites) {
    const L = LOG[s.k]; if (!L.length) continue;
    const bad = L.filter(x => !x.okW);
    console.log('  · ' + s.k + ' — 최악 격자 위끝 ' + Math.min(...L.map(x => x.worst)) + '~' + Math.max(...L.map(x => x.worst))
      + ' vs 알 최대 ' + n1(Math.min(...L.map(x => x.got))) + '~' + n1(Math.max(...L.map(x => x.got)))
      + ' ⇒ **초과 ' + bad.length + '/' + L.length + '회**');
  }
  /* ⚠ «세 자리 전부» 를 요구하면 안 된다 — train·rune 은 가둠(`fitK`)이 물어 알이 위끝보다
     한참 작게 태어나므로 최악 격자에서도 안 넘는다(실측 여유 train 0~1 · rune 1px).
     등재된 사건은 **[C-temper]** 이고, 이 항은 «그 자리에서 도달 가능한가» 를 묻는다. */
  const T = LOG['temper'] || [];
  ok(T.length > 0 && T.every(x => !x.okW),
     '[6] ★ 등재된 자리(temper)는 «최악 격자» 재구성에서 **매 실행** 알이 위끝을 넘는다 = 사건은 제품이 아니라 **자의 표본 운**이고, 3.3% 를 기다릴 것도 없이 도달 가능하다',
     sites.map(s => s.k + ' ' + LOG[s.k].filter(x => !x.okW).length + '/' + LOG[s.k].length).join(' · '));

  console.log('\n[7] 아래끝 쌍 — `[C-*-hi]` 가 쓰는 «가장 작게 눌린 상자» 도 실행마다 갈린다(관측)');
  for (const s of sites) {
    const L = LOG[s.k]; if (!L.length) continue;
    const h31 = L.map(x => x.smG.hi31);
    ok(true, '[7-' + s.k + '] (관측) 눈금31 문턱 ' + Math.min(...h31) + '~' + Math.max(...h31)
       + ' (폭 ' + (Math.max(...h31) - Math.min(...h31)) + 'px) vs 알 최대 '
       + n1(Math.min(...L.map(x => x.got))) + ' · 여유 최소 ' + n1(Math.min(...L.map(x => x.got - x.smG.hi31))) + 'px');
  }

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.length + '건');
  await b.close();
  console.log('\nPROBE908 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS') + '\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
