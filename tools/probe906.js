#!/usr/bin/env node
/* 재현 906 — 「`tools/verify583.js` [D-train-o]·[D-rune-o]·[D-temper-o] 가 플레이키하다」
 *            (2026-09-05 등재, sess-2358-17704 루틴 워커 D — 902 재현이 갈라 낸 다른 갈래)
 *
 *   node tools/probe906.js
 *
 * 등재문: 두 끝값이 «첫 표본 **전원** 평균 → 창 끝 **생존자** 평균» 이라 **이동과 표본 구성이 섞인다.**
 *   실측 — 수리 전 트리 24회 중 1회 · 902 수리 후 37회 중 2회 빨강(5.4%).
 *   ⚠ 문턱(−2px)을 넓혀 푸는 것은 반려(334·796).
 *
 * ⚠ 338 규칙 — **처방을 따르기 전에 재현한다.** 이 자는 고치는 자가 아니라 «무엇이 흔들리는가» 만 묻는다.
 *   갈래는 셋이다:
 *     ⓐ 제품이 흔들린다(버스트가 실제로 버튼으로 모이는 창이 있다)  → 제품 수리(658·660 회귀)
 *     ⓑ 자가 **집합이 다른 두 값**을 견준다(생존 편향)              → 자 수리
 *     ⓒ 902 [C-big] 과 같은 뿌리다                                  → 한 수리로 둘이 닫힌다(902 가 이미 기각)
 *
 * 재는 법:
 *   [D1] 구성 축이 **실재하는가** — 첫 무리의 알이 창 안에서 죽는가(소실 > 0).
 *   [D2] 편향의 **방향** — 죽는 알이 «멀리 간 알» 쪽인가(소실 알의 마지막 반경 vs 생존자 반경).
 *        이것이 참이면 «아무도 안 모였는데 평균이 내려간다» 가 성립한다.
 *   [D3] **소실만** 사본(결정적) — 알을 **한 픽셀도 안 움직이고** 멀리 간 알만 지운다.
 *        옛 자는 빨개지고 새 자는 초록이어야 한다 = 옛 자가 «이동» 이 아닌 것에 반응했다는 직접 증거.
 *   [D4] **수렴** 사본(결정적) — 모든 알을 발원 쪽으로 되돌린다. 새 자도 **반드시 빨개야** 한다
 *        = 이 수리가 «문턱을 넓혀 지나간 것» 이 아님(334·796 반려 조항의 짝).
 *   [D5] 실측 창 — 새 자가 깨지는 창이 있는가(있으면 갈래 ⓐ 의심 · 0 이면 ⓑ 확정).
 *
 * 판정 한 벌은 `tools/dspread906.js` 하나다 — 자와 재현이 **같은 자**를 쓴다(402 사본 금지).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const { spread, TOL } = require('./dspread906');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const n1 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(1);

/* verify583 [D] 와 **같은 자리·같은 손짓**이다(재현이므로 모양을 그대로 옮긴다) */
const SITES = [
  { k:'train',  n:'23 훈련 카드', sub:'train',
    host:'#trCards [data-tr="atk"]', btn:'#trCards [data-tr="atk"]' },
  { k:'rune',   n:'룬 [강화]',    sub:'rune',
    host:'#trRunes .tr-rn',        btn:'#trRunes .tr-rn .rbt.b1' },
  { k:'temper', n:'단련 [투자]',  sub:'temper',
    host:'#trTemper .tr-tp',       btn:'#trTemper .tr-tp .tb' }
];
const REP = 4;                                   /* 자리마다 홀드 창을 몇 번 여는가 */

(async () => {
  console.log('\n=== probe906 — [D-*-o] 플레이키의 뿌리: «이동» 인가 «표본 구성» 인가 ===\n');
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

  const W = [];                                   /* 창 = { site, samples, gone } */
  for (const s of SITES) {
    await p.evaluate(s => { setTrSub(s.sub); renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; }, s);
    await p.waitForTimeout(220);
    for (let rep = 0; rep < REP; rep++) {
      await p.evaluate(() => { const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; });
      await p.waitForTimeout(160);
      const bb = await (await p.$(s.btn)).boundingBox();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.mouse.down();
      const got = await p.evaluate(s => new Promise(res => {
        const seq = []; const t0 = performance.now();
        let wave = null, ids = null; const lastSeen = new Map();
        const iv = setInterval(() => {
          const h = document.querySelector(s.host);
          const bs = h ? (getComputedStyle(h).getPropertyValue('--burst-to') || '').trim() : '';
          const bh = (h && bs && h.querySelector(bs)) || h;
          const hr = bh ? bh.getBoundingClientRect() : null;
          let live = [...document.querySelectorAll('#fxl .fx-cic')];
          /* 첫 무리를 굳힌다 — verify583 [D] 와 **같은 규약**(619 17회차) */
          if (!wave && live.length) { wave = new Set(live); ids = new Map(); live.forEach((n, i) => ids.set(n, i)); }
          if (wave) live = live.filter(n => wave.has(n));
          if (hr && live.length) {
            const ox = hr.x + hr.width / 2, oy = hr.y + hr.height / 2;
            const r = live.map(n => { const q = n.getBoundingClientRect();
              const d = Math.hypot(q.x + q.width / 2 - ox, q.y + q.height / 2 - oy);
              lastSeen.set(ids.get(n), d);
              return { i: ids.get(n), d }; });
            seq.push({ t: Math.round(performance.now() - t0), r });
          }
          if (performance.now() - t0 > 720) {
            clearInterval(iv);
            /* 창 끝에 없는 알들의 **마지막 관측 반경** — [D2] 가 편향의 방향을 여기서 읽는다 */
            const alive = new Set((seq[seq.length - 1] || { r: [] }).r.map(x => x.i));
            const gone = [...lastSeen.entries()].filter(([i]) => !alive.has(i)).map(([, d]) => d);
            res({ seq, gone });
          }
        }, 40);
      }), s);
      await p.mouse.up();
      await p.waitForTimeout(320);
      if (got.seq.length >= 2) W.push({ site: s.n, samples: got.seq, gone: got.gone });
    }
    await p.waitForTimeout(250);
  }
  await b.close();

  /* ── 창별 표 ─────────────────────────────────────────────────────────── */
  console.log('[D] 창별 — 왼쪽이 옛 자(전원 → 생존자) · 오른쪽이 같은 집합끼리(생존자 처음 → 끝)\n');
  let lost = 0, inward = 0, oldRed = 0, newRed = 0, mixed = 0, goneN = 0, goneSum = 0, survSum = 0, survN = 0;
  for (const w of W) {
    const r = spread(w.samples);
    lost += r.lost; inward += r.inward;
    if (!r.okOld) oldRed++;
    if (!r.ok) newRed++;
    if (!r.okOld && r.ok) mixed++;
    goneN += w.gone.length; goneSum += w.gone.reduce((a, v) => a + v, 0);
    survSum += r.d1s * r.surv; survN += r.surv;
    console.log('  · ' + w.site + ' — 옛 ' + n1(r.d0) + ' → ' + n1(r.d1) + 'px'
      + (r.okOld ? '' : '  ← 옛 자 빨강')
      + '  |  새 ' + n1(r.d0s) + ' → ' + n1(r.d1s) + 'px' + (r.ok ? '' : '  ← 새 자 빨강')
      + '  |  첫 무리 ' + r.tot + '알 → 생존 ' + r.surv + '(소실 ' + r.lost + ') · 안으로 온 알 ' + r.inward);
  }
  console.log('');

  /* [D1] 구성 축이 실재하는가 */
  ok(W.length >= 6 && lost > 0,
     '[D1] ★ 첫 무리의 알이 **창 안에서 죽는다** — 두 끝값의 집합이 다르다(구성 축이 실재한다)',
     '창 ' + W.length + '개 · 소실 ' + lost + '알 · 되돌아온 알 ' + inward);

  /* [D2] 편향의 방향 — 멀리 간 알이 먼저 죽는다 */
  const goneAvg = goneN ? goneSum / goneN : null, survAvg = survN ? survSum / survN : null;
  ok(goneN > 0 && goneAvg > survAvg,
     '[D2] ★ 죽는 알은 **멀리 간 알** 쪽이다 — 아무도 안 모였는데 평균이 내려가는 기계가 여기 있다',
     '소실 알 마지막 반경 평균 ' + n1(goneAvg) + 'px > 창 끝 생존자 평균 ' + n1(survAvg) + 'px'
     + ' (소실 ' + goneN + '알)');

  /* ── 결정적 사본 둘 — 창 운이 아예 없다 ──────────────────────────────── */
  /* 실측 창 하나를 골라 **산수로** 두 사본을 만든다. 브라우저를 다시 안 띄우는 것이 요점이다 —
     재는 대상이 «자의 판정» 이므로 판정에 먹일 표본을 손으로 짜는 것이 정확히 같은 시험이다(902 [R4] 선례). */
  const base = W.map(w => ({ w, r: spread(w.samples) }))
                .filter(x => x.r.surv >= 3 && x.r.tot >= 4)
                .sort((a, b2) => b2.r.tot - a.r.tot)[0];
  if (!base) { ok(false, '[D3] 사본을 만들 표본 창이 있다'); }
  else {
    const A = base.w.samples[0].r, Z = base.w.samples[base.w.samples.length - 1].r;
    /* ⓐ «소실만» — 알을 **한 픽셀도 안 움직이고**(끝 반경 = 처음 반경) 멀리 간 알 상위 절반만 지운다. */
    const byFar = [...A].sort((x, y) => y.d - x.d);
    const keep = byFar.slice(Math.ceil(byFar.length / 2));
    const cens = spread([{ t: 0, r: A }, { t: 720, r: keep.map(x => ({ i: x.i, d: x.d })) }]);
    ok(!cens.okOld && cens.ok,
       '[D3] ★ **소실만** 시킨 사본 — 알이 한 픽셀도 안 움직였는데 **옛 자는 빨갛고 새 자는 초록**이다'
       + ' ⇒ 옛 자가 반응한 것은 «이동» 이 아니라 **구성**이다',
       '옛 ' + n1(cens.d0) + ' → ' + n1(cens.d1) + 'px(' + (cens.okOld ? '초록' : '빨강') + ')'
       + ' · 새 ' + n1(cens.d0s) + ' → ' + n1(cens.d1s) + 'px(' + (cens.ok ? '초록' : '빨강') + ')'
       + ' · ' + A.length + '알 → ' + keep.length + '알');
    /* ⓑ «수렴» — 소실 없이 모든 알을 발원 쪽으로 절반 되돌린다. 새 자도 **반드시** 빨개야 한다. */
    const conv = spread([{ t: 0, r: A }, { t: 720, r: A.map(x => ({ i: x.i, d: x.d * 0.5 })) }]);
    ok(!conv.ok,
       '[D4] ★ **수렴** 사본(모든 알이 발원 쪽으로) 은 새 자로도 **빨갛다** — 이 수리는 문턱을 넓힌 것이 아니다(334·796)',
       '새 ' + n1(conv.d0s) + ' → ' + n1(conv.d1s) + 'px · 문턱 ' + TOL + 'px · ' + (conv.ok ? '초록(=반려)' : '빨강'));
  }

  /* [D5] 실측 창에서 새 자가 깨지는가 */
  ok(newRed === 0,
     '[D5] ★ 실측 창에서 **새 자는 한 창도 안 깨진다** — 흔들림의 뿌리는 제품이 아니라 자다(갈래 ⓑ 확정)',
     '옛 자 빨강 ' + oldRed + '/' + W.length + ' · 새 자 빨강 ' + newRed + '/' + W.length
     + ' · 옛만 빨간 창 ' + mixed);

  console.log('\n  ⇒ [D-*-o] 의 뿌리는 **견주는 두 값의 집합이 다른 것**이다 — 902 [C-big](상자 하나의 정수 양자화)과'
    + ' 재는 대상 자체가 다르다(같이 흔들렸을 뿐 다른 병).');
  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
  ok(errs.length === 0, '[Z] 콘솔 에러 0');
  console.log('\nPROBE906 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
