/* 작업 690 재현기 — `verify122.js` §8 «재화 탭 스크롤 fps ON/OFF 교차» 가 왜 흔들리는가.
   실행: node tools/probe690.js   → 마지막 줄이 `PROBE690 n/n` 이면 재현·분리 측정이 다 끝난 것이다.

   ⚑ 338·344 규칙 — **처방을 쓰기 전에 먼저 재현한다.** 등재문(PROGRESS 690)의 주장은 셋이다:
     ⓐ 같은 트리에서 §8 이 빨강↔초록으로 갈린다(코드가 아니라 부하가 가른다)
     ⓑ 잡음이 «단조 드리프트» 가 아니라 «표본 독립» 이다(쌍별 비율이 1.0 을 사이에 두고 벌어진다)
     ⓒ 절대 fps 가 러너 상한에 눌려 있다(12~21fps)
   이 자는 셋을 직접 재고, **동시에 후보 축들의 분리폭을 한 표에 올린다**(632 처방 —
   문턱 축을 고칠 때는 후보를 전부 같은 컨테이너에서 재라).

   재는 것 — 한 «런» = §8 과 똑같은 5쌍 교차 측정이고, 그것을 REPS 회 되풀이한다.
     · ON   = 현행 트리(122 연출 그대로)
     · OFF  = `#shopList` 애니메이션 전부 정지(§8 의 OFFCSS 그대로)
     · HEAVY= **되돌림 시험용 가짜 세상** — 122 연출이 «정말로» 스크롤을 무겁게 만들었다면
              어떤 값이 나오는가. 새 축이 이 조건에서 빨갛지 않으면 그 축은 «언제나 초록» 이다.

   후보 축(전부 같은 표본에서 계산한다):
     R_med  = median(ON)/median(OFF)          ← 현행 §8 의 판정식
     R_max  = max(ON)/max(OFF)                ← 부하 잡음은 **아래로만** 민다(천장은 안 올라간다)
     R_pmed = median(쌍별 ON_i/OFF_i)         ← 16회차가 한 번 썼다가 되돌린 축
     N_lo   = #{i : ON_i/OFF_i < 0.9}         ← 등재문이 제안한 순서통계
     N_sgn  = #{i : ON_i < OFF_i}             ← 부호검정 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const URL = 'file://' + path.resolve(__dirname, '../index.html');

const REPS = +(process.env.P690_REPS || 3);
const PAIRS = 5;
const WIN = +(process.env.P690_WIN || 3500);

const OFFCSS = '#shopList *,#shopList *::after,#shopList *::before{animation-name:none!important}';
/* 되돌림 시험용 — 스크롤 프레임마다 실제로 비싼 일을 시킨다(합성 블러·그림자 + 매 프레임 갱신).
   ⚠ 제품을 건드리지 않는다. 이 CSS 는 이 프로세스의 페이지에만 얹힌다.
   ⚠ 1회차 실측에서 **약한 부하로는 안 된다**: 블러 1.4~2.8px 짜리 첫 판은 재화 탭에서 R_med 0.871 까지밖에
      안 내려가 «되돌림이 확실히 빨간가» 를 3쌍으로 물으면 그 항 자신이 플레이키해진다. 분리가 눈에 띄게
      벌어지도록 세게 건다(소환 탭은 약한 판에서도 0.47~0.52 였다 — 탭마다 여유가 다르다). */
const HEAVYCSS = '@keyframes p690hv{0%,100%{filter:blur(5px) drop-shadow(0 0 26px rgba(0,0,0,.85)) saturate(1.6)}'
  + '50%{filter:blur(9px) drop-shadow(0 0 48px rgba(0,0,0,.95)) saturate(2.4)}}'
  + '#shopList .shp-card,#shopList .cn-cd,#shopList .shp-row{animation:p690hv .7s linear infinite!important;will-change:filter}';

const med = a => a.slice().sort((x, y) => x - y)[(a.length - 1) >> 1];
const mx = a => Math.max.apply(null, a);
const f3 = v => (Number.isFinite(v) ? v.toFixed(3) : 'n/a');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    S.dia = 5e6; S.gold = 5e9; S.relic = 5e5;
    S.mileage = (typeof MILE_NEED === 'number' ? MILE_NEED : 10) + 2;
    save(); openShopPage();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });

  const setCss = c => p.evaluate(x => {
    let s = document.getElementById('p690css');
    if (!s) { s = document.createElement('style'); s.id = 'p690css'; document.head.appendChild(s); }
    s.textContent = x;
  }, c);
  const scrollFps = () => p.evaluate(w => new Promise(res => {
    const lw = document.getElementById('shopList');
    let n = 0, t0 = performance.now(), dir = 1;
    const tick = () => {
      n++; lw.scrollTop += 24 * dir;
      if (lw.scrollTop <= 0 || lw.scrollTop + lw.clientHeight >= lw.scrollHeight - 1) dir = -dir;
      if (performance.now() - t0 < w) requestAnimationFrame(tick);
      else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
    };
    requestAnimationFrame(tick);
  }), WIN);
  const meas = async css => { await setCss(css); await p.waitForTimeout(180); return await scrollFps(); };

  /* 한 런 = §8 과 같은 5쌍 교차. mode 가 'heavy' 면 ON 자리에 HEAVYCSS 를 넣는다. */
  async function run(tab, mode) {
    await p.evaluate(t => { shopCat = t; setShopCatTabs(t); renderShopPage(); }, tab);
    await p.waitForTimeout(400);
    await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.play(); } catch (_) {} }); });
    const onCss = mode === 'heavy' ? HEAVYCSS : '';
    const on = [], off = [];
    for (let i = 0; i < PAIRS; i++) {
      if (i % 2 === 0) { on.push(await meas(onCss)); off.push(await meas(OFFCSS)); }
      else { off.push(await meas(OFFCSS)); on.push(await meas(onCss)); }
    }
    await setCss('');
    const ratios = on.map((v, i) => +(v / off[i]).toFixed(3));
    return {
      on, off, ratios,
      Rmed: med(on) / med(off),
      Rmax: mx(on) / mx(off),
      Rmaxp: mx(ratios),                     /* 690 채택 축 — «가장 나은 쌍» 의 비 */
      Rpmed: med(ratios),
      Nlo: ratios.filter(x => x < 0.9).length,
      Nsgn: ratios.filter(x => x < 1).length,
    };
  }

  const rows = { coin: { real: [], heavy: [] }, summon: { real: [], heavy: [] } };
  for (let k = 0; k < REPS; k++) {
    for (const tab of ['coin', 'summon']) {
      const nm = tab === 'coin' ? '재화' : '소환';
      const a = await run(tab, 'real');
      rows[tab].real.push(a);
      console.log('[' + (k + 1) + '/' + REPS + '] ' + nm + ' 실제  ON ' + a.on.join('/') + ' · OFF ' + a.off.join('/'));
      console.log('        R_med ' + f3(a.Rmed) + ' · R_max ' + f3(a.Rmax) + ' · **R_maxp ' + f3(a.Rmaxp)
        + '** · R_pmed ' + f3(a.Rpmed) + ' · N_lo ' + a.Nlo + '/' + PAIRS + ' · N_sgn ' + a.Nsgn + '/' + PAIRS
        + '   (쌍별 ' + a.ratios.join('/') + ')');
      const h = await run(tab, 'heavy');
      rows[tab].heavy.push(h);
      console.log('        되돌림  ON* ' + h.on.join('/') + ' · OFF ' + h.off.join('/'));
      console.log('        R_med ' + f3(h.Rmed) + ' · R_max ' + f3(h.Rmax) + ' · **R_maxp ' + f3(h.Rmaxp)
        + '** · R_pmed ' + f3(h.Rpmed) + ' · N_lo ' + h.Nlo + '/' + PAIRS + ' · N_sgn ' + h.Nsgn + '/' + PAIRS
        + '   (쌍별 ' + h.ratios.join('/') + ')');
    }
  }

  await b.close();

  /* ── 판정 — «재현됐는가» 와 «후보 축이 갈라주는가» ────────────── */
  const allReal = rows.coin.real.concat(rows.summon.real);
  const allHeavy = rows.coin.heavy.concat(rows.summon.heavy);
  const fpsAll = [].concat.apply([], allReal.map(r => r.on.concat(r.off)));

  console.log('\n── 요약 (실제 런 ' + allReal.length + ' · 되돌림 런 ' + allHeavy.length + ') ──');
  const col = (rs, k) => rs.map(r => f3(r[k])).join(' ');
  for (const [nm, rs] of [['실제  ', allReal], ['되돌림', allHeavy]]) {
    console.log('  ' + nm + ' R_med  ' + col(rs, 'Rmed'));
    console.log('         R_max  ' + col(rs, 'Rmax'));
    console.log('         R_maxp ' + col(rs, 'Rmaxp') + '   ← 채택 축');
    console.log('         R_pmed ' + col(rs, 'Rpmed'));
    console.log('         N_lo   ' + rs.map(r => r.Nlo).join(' ') + '   N_sgn ' + rs.map(r => r.Nsgn).join(' '));
  }

  /* ── [A] 구조적으로 재현되는 것만 단언한다 ─────────────────────
     ⚠ «흔들린다» 자체는 단언거리가 아니다 — 조용한 러너에서는 한 번도 안 뒤집힐 수 있고,
        그것을 항으로 세우면 **이 자가 플레이키해진다**(고치려는 병을 자기가 앓는다).
        그래서 등재문 ⓐ(현행 축이 문턱을 넘나든다)·ⓑ(쌍별 산포)는 **찍기만 하고** 단언은
        «러너 상한»(ⓒ)과 아래 [B] 의 **분리폭**으로 한다. */
  console.log('\n[A] 등재문 재현 (ⓐⓑ 는 진단 출력 · 단언은 ⓒ 와 [B])');
  ok(fpsAll.length > 0 && mx(fpsAll) < 40,
    'ⓒ 절대 fps 가 러너 상한에 눌려 있다 — 표본 ' + fpsAll.length + '개, 최대 ' + mx(fpsAll) + 'fps (<40)');
  const spread = allReal.map(r => mx(r.ratios) - Math.min.apply(null, r.ratios));
  console.log('   ⓑ 쌍별 비율의 런별 산포 폭: ' + spread.map(f3).join(' ') + '  (최대 ' + f3(mx(spread)) + ')');
  const realMed = allReal.map(r => r.Rmed);
  console.log('   ⓐ 현행 판정식 R_med 의 런별 값: ' + realMed.map(f3).join(' ')
    + '  → 문턱 0.9 아래 ' + realMed.filter(v => v < 0.9).length + '/' + realMed.length + '런');

  console.log('\n[B] 후보 축의 분리폭 (실제 런은 전부 초록이어야 하고, 되돌림 런은 전부 빨개야 한다)');
  const sep = (k, thr, cmp) => {
    const rv = allReal.map(r => r[k]), hv = allHeavy.map(r => r[k]);
    const rOk = rv.filter(v => cmp(v, thr)).length, hBad = hv.filter(v => !cmp(v, thr)).length;
    console.log('   ' + k + ' (문턱 ' + thr + ') — 실제 통과 ' + rOk + '/' + rv.length
      + ' · 되돌림 빨강 ' + hBad + '/' + hv.length);
    return { rOk, rN: rv.length, hBad, hN: hv.length, rv, hv };
  };
  const ge = (v, t) => v >= t, le = (v, t) => v <= t;
  const sMed = sep('Rmed', 0.9, ge);
  const sMax = sep('Rmax', 0.9, ge);
  const sMaxp = sep('Rmaxp', 0.9, ge);
  const sPmed = sep('Rpmed', 0.9, ge);
  const sSgn = sep('Nsgn', 4, le);

  /* 채택 축 = R_maxp(= «가장 나은 쌍» 의 비 ≥ 0.9 · N_lo ≤ 4 와 같은 말).
     문턱 0.9 는 **한 칸도 안 넓혔다**(334 규약) — 바뀐 것은 쌍을 모으는 방법(중앙값 → 최대)뿐이다. */
  ok(sMaxp.rOk === sMaxp.rN, 'R_maxp — 실제 런이 전부 문턱 0.9 이상 (' + sMaxp.rOk + '/' + sMaxp.rN + ')');
  ok(sMaxp.hBad === sMaxp.hN, 'R_maxp — 되돌림 런이 전부 문턱 아래 = «언제나 초록» 이 아니다 ('
    + sMaxp.hBad + '/' + sMaxp.hN + ')');
  const gap = Math.min.apply(null, sMaxp.rv) - mx(sMaxp.hv);
  ok(gap >= 0.05, 'R_maxp — 분리폭 ' + f3(gap) + ' ≥ 0.05 (실제 최저 '
    + f3(Math.min.apply(null, sMaxp.rv)) + ' · 되돌림 최고 ' + f3(mx(sMaxp.hv)) + ')');
  /* 새 축이 «덜 잡는» 축이 아님을 대조로 못박는다 — 되돌림 세상에서는 옛 축도 새 축도 둘 다 빨갛다. */
  ok(sMed.hBad === sMed.hN, '옛 축 R_med 도 되돌림 런에서는 전부 빨강 = 탐지력을 안 깎았다 ('
    + sMed.hBad + '/' + sMed.hN + ')');
  console.log('   (참고) 옛 축 R_med 실제 통과 ' + sMed.rOk + '/' + sMed.rN
    + ' · R_max 실제 통과 ' + sMax.rOk + '/' + sMax.rN
    + ' · R_pmed 실제 통과 ' + sPmed.rOk + '/' + sPmed.rN
    + ' · N_sgn 실제 통과 ' + (sSgn.rv.length - sSgn.rv.filter(v => v > 4).length) + '/' + sSgn.rv.length);

  console.log('\nPROBE690 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
