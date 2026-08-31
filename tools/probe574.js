#!/usr/bin/env node
/* 작업 574 재현 — `verify488` [J4] 「표본의 절반 이상이 α=1」 이 왜 문턱에 붙어 흔들리는가
 *
 *   node tools/probe574.js            (기본 12 라운드)
 *   node tools/probe574.js --rounds 8 --throttle 4
 *
 * 338 규칙: 처방 전에 제품에게 직접 묻는다. 등재문(574)은 두 갈래를 적어 뒀다 —
 *   ⓐ 판정을 «표본별 α» 가 아니라 «한 노드의 수명 중 불투명 구간 비율» 로 바꾼다
 *   ⓑ 표본 시각을 애니메이션 위상에 맞춰 고정한다
 * 어느 쪽이든 **먼저 «흔들림의 뿌리가 위상 격자인가»** 를 재야 고를 수 있다. 그래서 이 자는 넷을 잰다:
 *   [1] 같은 세션에서 [J4] 표본을 n 라운드 반복 — 비율이 실제로 흔들리는가(문턱 0.5 대비 어디에 서는가)
 *   [2] 그 표본들의 «애니 진행(ct)» 을 늘어놓아 **위상 격자**를 드러낸다(생성 주기 ↔ 표본 간격)
 *   [3] 설계값 — 살아 있는 노드 하나의 애니메이션을 **멈춰 세우고 위상을 훑어** 불투명 구간 비율을 직접 잰다
 *   [4] CPU 스로틀을 걸어 프레임 격자를 늘렸을 때 [1] 이 어디로 가는가(등재문이 본 빨강의 조건)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.V488_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const ROUNDS = arg('--rounds', 12), THROTTLE = arg('--throttle', 0);

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  await install(p, { arm: true });
  const cdp = await ctx.newCDPSession(p);
  if (THROTTLE) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__alive = setInterval(() => { try { if (S.hp != null && typeof maxHp === 'function') S.hp = maxHp(); } catch (_) {} }, 200);
    runeRate = () => 1;
    try { closeModal(); closeRelw(); } catch (_) {}
    S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e12;
    openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
    /* 생성 시각을 노드에 적어 «주기» 를 잴 수 있게 한다(verify488 [J] 와 같은 방법) */
    const of = window.hbFloat;
    window.hbFloat = function () { const r = of.apply(this, arguments);
      const L = document.getElementById('fxl'), n = L && L.lastElementChild;
      if (n && /fx-plus/.test(n.className || '')) n.dataset.born = Math.round(performance.now());
      return r; };
  });
  await p.waitForTimeout(450);

  const c = await p.evaluate(() => { const r = document.querySelector('#trRunes .tr-rn[data-rune="r1"] .rbt.b1').getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });

  /* ── 한 라운드 = verify488 [J] 와 같은 홀드·같은 표본 시각 ─────────────── */
  const snap = () => p.evaluate(() => {
    const now = performance.now();
    return [...document.querySelectorAll('#fxl .fx-plus.hb')].map(n => {
      const a = n.getAnimations()[0];
      return { born: +n.dataset.born || 0, age: now - (+n.dataset.born || now), lng: n.classList.contains('lng'),
               ct: a ? (a.currentTime || 0) : -1, op: parseFloat(getComputedStyle(n).opacity) };
    });
  });
  const round = async () => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); const rows = []; const sizes = [];
    for (const t of [900, 1500, 2100, 2700]) {
      while (Date.now() - t0 < t) await new Promise(r => setTimeout(r, 5));
      const s = await snap(); sizes.push(s.length); rows.push(...s);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(400);
    rows.sizes = sizes;
    return rows;
  };

  console.log('[1] 같은 세션 · 같은 자 — [J4] 를 ' + ROUNDS + ' 라운드 반복' + (THROTTLE ? ' (CPU ×' + THROTTLE + ' 스로틀)' : ''));
  const ratios = [], allCt = [], gaps = [], snapN = []; let lngN = 0, allN = 0;
  for (let i = 0; i < ROUNDS; i++) {
    const J = await round();
    const opaque = J.filter(r => r.op >= 0.99).length;
    ratios.push(J.length ? opaque / J.length : 0);
    allCt.push(...J.filter(r => !r.lng).map(r => r.ct));
    lngN += J.filter(r => r.lng).length; allN += J.length; snapN.push(...J.sizes);
    const born = [...new Set(J.map(r => r.born))].sort((a, b) => a - b);
    for (let k = 1; k < born.length; k++) { const g = born[k] - born[k - 1]; if (g > 0 && g < 400) gaps.push(g); }
    console.log('  · 라운드 ' + String(i + 1).padStart(2) + ' — 표본 ' + String(J.length).padStart(2) +
      ' · α=1 ' + String(opaque).padStart(2) + ' · 비율 ' + (ratios[i] * 100).toFixed(1) + '%' +
      (ratios[i] >= 0.5 ? '' : '   ← 이 라운드는 [J4] 빨강'));
  }
  const lo = Math.min(...ratios), hi = Math.max(...ratios), red = ratios.filter(r => r < 0.5).length;
  console.log('  · 폭 ' + (lo * 100).toFixed(1) + '% ~ ' + (hi * 100).toFixed(1) + '% · 중앙 ' +
    (med(ratios) * 100).toFixed(1) + '% · 빨강 ' + red + '/' + ROUNDS);
  ok(hi - lo >= 0.08, '[1-a] 같은 트리·같은 자인데 비율이 8%p 넘게 흔들린다 — 자 자신의 흔들림이다',
     '폭 ' + ((hi - lo) * 100).toFixed(1) + '%p');
  ok(lo < 0.62 && hi > 0.5, '[1-b] 그 흔들림이 문턱 0.5 와 설계값 62.5% 사이를 오간다 — 문턱에 붙어 있다',
     (lo * 100).toFixed(1) + '~' + (hi * 100).toFixed(1) + '%');

  /* ── [2] 위상 격자 ──────────────────────────────────────────────────── */
  console.log('[2] 표본의 «애니 진행(ct)» 분포 — 위상이 고르게 깔리는가, 격자에 뭉치는가');
  const cadence = gaps.length ? med(gaps) : 0;
  const OP_LO = 0.0975 * 300, OP_HI = 0.7228 * 300;   /* 아래 [3] 이 실측으로 확인한다 */
  const inWin = allCt.filter(t => t >= OP_LO && t <= OP_HI).length;
  const hist = new Array(10).fill(0);
  allCt.forEach(t => { const b = Math.min(9, Math.max(0, Math.floor(t / 30))); hist[b]++; });
  console.log('  · 생성 주기(중앙) ' + cadence.toFixed(0) + 'ms · 한 beat 에 두 줄기 ⇒ 동시 생존 ≈ ' + (2 * 310 / (cadence || 1)).toFixed(1) + '장');
  console.log('  · ⚠ 표본에 «한 발»(.lng · 애니 1.3s)이 ' + lngN + '/' + allN + '개 섞여 있다 — 아래 히스토그램은 반복분(.3s)만');
  console.log('  · ct 30ms 칸 히스토그램 [0..300] ' + hist.join('·') + '  (총 ' + allCt.length + '개)');
  console.log('  · 설계 불투명 창 ' + OP_LO.toFixed(0) + '~' + OP_HI.toFixed(0) + 'ms 안 표본 ' + inWin + '/' + allCt.length +
    ' = ' + (inWin / allCt.length * 100).toFixed(1) + '%');
  const perSnap = med(snapN), step = 1 / perSnap;
  console.log('  · 스냅숏 한 장의 표본 ' + Math.min(...snapN) + '~' + Math.max(...snapN) + '장(중앙 ' + perSnap + ') ⇒ 한 장이 창을 드나들면 비율 ' + (step * 100).toFixed(1) + '%p');
  ok(cadence > 0 && cadence < 120, '[2-a] 플로터는 «주기» 로 태어난다 — 위상이 난수가 아니라 격자다',
     cadence.toFixed(0) + 'ms 주기');
  ok(step >= 0.10,
     '[2-b] ★ 그 격자 위에 사는 표본은 스냅숏당 8~9장뿐 — 한 장이 창 밖으로 나가면 비율이 10%p 넘게 움직인다(문턱 50% ↔ 설계 62%: 노드 한 장 차이)',
     '1/' + perSnap + ' = ' + (step * 100).toFixed(1) + '%p · 여유는 12.5%p');

  /* ── [3] 설계값 — 노드 하나의 위상을 직접 훑는다 ───────────────────────── */
  console.log('[3] 설계값 — 살아 있는 노드의 애니메이션을 세우고 위상 0~100% 를 훑는다');
  const st2 = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  await p.waitForTimeout(500);
  const sweep = await p.evaluate(() => {
    const L = document.getElementById('fxl');
    const one = sel => {
      const n = document.querySelector(sel); if (!n) return null;
      const a = n.getAnimations()[0]; if (!a) return null;
      a.pause();
      const dur = a.effect.getComputedTiming().duration;
      const N = 300, ops = [];
      for (let i = 0; i <= N; i++) {
        if (!n.isConnected) L.appendChild(n);       /* fxBye 가 걷어가도 훑기를 끝낸다 */
        a.currentTime = dur * i / N;
        ops.push(parseFloat(getComputedStyle(n).opacity));
      }
      try { n.remove(); } catch (_) {}
      const first = ops.findIndex(o => o >= 0.99);
      let last = -1; for (let i = ops.length - 1; i >= 0; i--) if (ops[i] >= 0.99) { last = i; break; }
      return { dur, lo: first / N, hi: last / N, frac: (last - first) / N, op0: ops[0], opEnd: ops[N] };
    };
    return { rep: one('#fxl .fx-plus.hb:not(.lng)'), lone: one('#fxl .fx-plus.hb.lng') };
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await st2.catch(() => {});
  const S3 = sweep && sweep.rep;
  if (!S3) { ok(false, '[3-a] 훑을 노드를 못 잡았다'); }
  else {
    for (const [k, s] of [['반복분(.hb)', sweep.rep], ['한 발(.lng)', sweep.lone]]) {
      if (!s) { console.log('  · ' + k + ' — 노드 없음'); continue; }
      console.log('  · ' + k + ' 애니 ' + s.dur + 'ms · α=1 구간 ' + (s.lo * 100).toFixed(1) + '% ~ ' +
        (s.hi * 100).toFixed(1) + '% = 수명의 ' + (s.frac * 100).toFixed(1) + '%' +
        ' · α(0%) ' + s.op0.toFixed(2) + ' · α(100%) ' + s.opEnd.toFixed(2));
    }
    ok(Math.abs(S3.dur - 300) <= 1, '[3-a] 홀드 반복분의 애니 길이는 .3s 다(제품 선언)', S3.dur + 'ms');
    ok(S3.frac >= 0.60 && S3.frac <= 0.65,
       '[3-b] ★ 설계값 — 불투명 구간은 수명의 62.5%(키프레임 10%~72%)다. 문턱 0.5 와 12.5%p 떨어져 있다',
       (S3.frac * 100).toFixed(1) + '%');
    ok(Math.abs(S3.lo - 0.0975) < 0.02 && Math.abs(S3.hi - 0.7228) < 0.02,
       '[3-c] 그 구간의 양끝이 키프레임(10% · 72%)에서 나온다 — 자가 제품 선언을 읽고 있다',
       (S3.lo * 100).toFixed(1) + '% / ' + (S3.hi * 100).toFixed(1) + '%');
    ok((hi - lo) >= 0.08,
       '[3-d] ★ 그런데 [1] 의 표본 비율은 그 설계값 둘레를 25%p 폭으로 튄다 — 자가 재는 것이 «설계» 가 아니라 «위상» 이다',
       '표본 ' + (lo * 100).toFixed(1) + '~' + (hi * 100).toFixed(1) + '% vs 설계 ' + (S3.frac * 100).toFixed(1) + '%');
  }

  console.log((fail ? 'PROBE574 ' + pass + '/' + (pass + fail) + ' FAIL' : 'PROBE574 ' + pass + '/' + pass + ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
