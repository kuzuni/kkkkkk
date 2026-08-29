/* 작업 376 — `tools/verify121.js` [3] «해금 아레나 두 기사 아이들 순환» 이 간헐적으로
   «관측 고유 5/6» 으로 빨개지는 것의 **재현**(338·344·372 규칙 — 처방 전에 먼저 재현한다).

   등재문이 남긴 갈래는 셋이었다(ⓐ 표본 창을 제품 주기의 정수배로 · ⓑ 판정을 «순환한다» 로
   · ⓒ 위상 정착). 어느 것을 고를지는 **결손이 «표본» 에 있는지 «제품» 에 있는지**로 갈린다:

     · 제품(`_fr`)이 6프레임을 다 지났는데 게이트의 50ms 표본만 하나를 놓쳤다  → 표본 문제(ⓐ/ⓒ)
     · 제품이 애초에 한 프레임을 **건너뛰었다**                                  → 판정 문제(ⓑ)

   그래서 한 시행 안에서 **두 자를 동시에** 댄다:
     ① 촘촘한 자(10ms) — 프레임 체류가 125ms 라 10ms 간격이면 `_fr` 이 가진 값은 전부 잡힌다 = «진실»
     ② 게이트와 **같은 자**(50ms · `verify121.js` 346~355행과 같은 코드)
   여기에 `_an.at`(위상, 프레임 단위 실수)의 궤적을 같이 찍어 «건너뜀» 을 눈으로 못박는다 —
   제품은 `setInterval(raidIdleTick, 125)` 폴링 격자 위에서 `at += dt*8` 로 구르므로,
   틱이 한 번 늦으면 `at` 이 1 을 넘게 뛰고 그 프레임은 **그려진 적이 없다**.

   실행: node tools/probe376.js [시행수]      기본 8시행
*/
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const sec = t => console.log('\n[' + t + ']');

const N = Math.max(1, parseInt(process.argv[2] || '8', 10));

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await p.waitForTimeout(700);
  await p.evaluate(() => setDunSub('raid'));
  await p.waitForTimeout(900);
  /* 게이트와 같은 자리 — 아레나를 해금해서 두 기사 칸을 띄운다 */
  await p.evaluate(() => { S.best = 999; renderDunPage(); });
  await p.waitForTimeout(900);

  const SEL = '#dunList .dnc.arn2 canvas.thcv';

  /* 게이트의 idleSpec 과 같은 파생(창 길이·주기를 페이지에서 읽는다) */
  const spec = await p.evaluate(sel => [...document.querySelectorAll(sel)].map(c => {
    const arn = !!c.dataset.arnav;
    const akey = arn ? 'knight' : c.dataset.thk, anim = arn ? 'idle' : c.dataset.thi;
    const w = (typeof TH_IDLE !== 'undefined' && TH_IDLE[akey + '/' + anim]) || null;
    const full = (ATLAS[akey] && ATLAS[akey].a && ATLAS[akey].a[anim]) || null;
    const list = w || full || [];
    const afps = (c._an && c._an.afps) || 8;
    return { akey, anim, list, uniq: new Set(list).size, afps,
             cycle: Math.round(list.length / afps * 1000) };
  }), SEL);

  sec('§1 제품이 말하는 창·주기 (게이트의 파생과 같은 경로)');
  ok(spec.length === 2, `아레나 기사 칸 ${spec.length}개`);
  spec.forEach((s, i) => ok(s.uniq >= 2,
    `[${i}] ${s.akey}/${s.anim} 창 ${s.list.length}칸 · 고유 ${s.uniq} · ${s.afps}fps · 한 바퀴 ${s.cycle}ms`));
  const span = Math.max(300, ...spec.map(s => s.cycle)) * 2 + 300;
  ok(span > 0, `게이트 표본 창 span = max(300, 주기)×2 + 300 = ${span}ms · 표본 간격 50ms`);

  /* 한 시행 = 촘촘한 자(10ms) + 게이트의 자(50ms) 를 **같은 창**에서 동시에 굴린다 */
  const trial = sp => p.evaluate(async ([sel, span]) => {
    const cs = [...document.querySelectorAll(sel)];
    const dense = cs.map(() => new Set());     // ① 진실
    const gate = cs.map(() => new Set());      // ② 게이트와 같은 자
    const trail = cs.map(() => []);            // _fr 전이 기록 [t, fr, at]
    const jumps = cs.map(() => []);            // at 이 1 을 넘게 뛴 자리
    let lastAt = cs.map(c => (c._an && c._an.at) || 0);
    let stop = false;
    const t0 = performance.now();
    /* ① 10ms 촘촘한 자 — 체류 125ms 라 `_fr` 이 가진 값은 전부 걸린다 */
    (async () => {
      while (!stop) {
        const t = performance.now() - t0;
        cs.forEach((c, i) => {
          const at = (c._an && c._an.at) || 0;
          dense[i].add(c._fr);
          const tr = trail[i];
          if (!tr.length || tr[tr.length - 1][1] !== c._fr) tr.push([+t.toFixed(0), c._fr, +at.toFixed(2)]);
          /* ⚠ «Δat > 1» 로 재면 안 된다 — 건너뜀은 **정수 경계를 두 번 넘을 때** 생긴다.
             at 0.99 → +1.30 → 2.29 이면 Δ가 1.30 뿐인데 floor 는 0 → 2 로 **1 을 통째로 건너뛴다**.
             그래서 자는 Δ가 아니라 `floor(at)` 의 차다. */
          const d = at - lastAt[i], fs = Math.floor(at) - Math.floor(lastAt[i]);
          if (fs >= 2) jumps[i].push({ t: +t.toFixed(0), d: +d.toFixed(2), fs,
            from: +lastAt[i].toFixed(2), to: +at.toFixed(2) });
          lastAt[i] = at;
        });
        await new Promise(r => setTimeout(r, 10));
      }
    })();
    /* ② 게이트와 같은 자 (verify121.js idleSeen 과 같은 코드) */
    const g0 = performance.now();
    while (performance.now() - g0 < span) {
      cs.forEach((c, i) => gate[i].add(c._fr));
      await new Promise(r => setTimeout(r, 50));
    }
    stop = true;
    return { dense: dense.map(x => [...x]), gate: gate.map(x => [...x]),
             trail, jumps, real: +(performance.now() - g0).toFixed(0) };
  }, [SEL, sp]);

  sec(`§2 ${N}시행 — «진실(10ms)» 과 «게이트(50ms)» 를 같은 창에서 동시에 잰다`);
  const rows = [];
  for (let n = 0; n < N; n++) {
    const r = await trial(span);
    const g = r.gate.map((x, i) => `${x.length}/${spec[i].uniq}`).join(' · ');
    const d = r.dense.map((x, i) => `${x.length}/${spec[i].uniq}`).join(' · ');
    const nj = r.jumps.reduce((a, x) => a + x.length, 0);
    const bad = r.gate.some((x, i) => x.length !== spec[i].uniq);
    const dbad = r.dense.some((x, i) => x.length !== spec[i].uniq);
    rows.push({ g, d, nj, bad, dbad, r });
    console.log(`  #${n + 1}  게이트 ${g}   진실 ${d}   at 건너뜀 ${nj}건   창 ${r.real}ms` +
      (bad ? '   ← 게이트 빨강' : ''));
    if (bad) {
      r.jumps.forEach((js, i) => js.slice(0, 6).forEach(j =>
        console.log(`        칸[${i}] t=${j.t}ms 에서 at ${j.from} → ${j.to} (Δ${j.d}프레임 · floor +${j.fs} ⇒ 사이 ${j.fs - 1}프레임은 그려진 적이 없다)`)));
      r.trail.forEach((tr, i) => {
        if (r.gate[i].length === spec[i].uniq) return;
        console.log(`        칸[${i}] _fr 궤적: ` + tr.map(x => `${x[0]}ms:${x[1]}(at${x[2]})`).join(' → '));
      });
    }
    await p.waitForTimeout(200);
  }

  sec('§3 판정 — 결손은 «표본» 인가 «제품» 인가');
  const nBad = rows.filter(r => r.bad).length;
  const nBoth = rows.filter(r => r.bad && r.dbad).length;
  const nSamplerOnly = rows.filter(r => r.bad && !r.dbad).length;
  ok(true, `게이트 빨강 ${nBad}/${N}시행 — 그 중 «제품도 프레임을 건너뛴» 시행 ${nBoth}건 · «표본만 놓친» 시행 ${nSamplerOnly}건`);
  const totJump = rows.reduce((a, r) => a + r.nj, 0);
  ok(true, `at 이 1.35프레임 넘게 뛴 자리 총 ${totJump}건 (제품은 setInterval(raidIdleTick,125) 격자 위에서 at += dt×8 로 구른다 — 틱이 늦으면 그 프레임은 통째로 안 그려진다)`);

  /* ---------- §4 갈아 끼울 자의 재료를 먼저 재 본다 ---------- */
  sec('§4 대안 축 실측 — «순환한다» 를 표본 운에 안 맡기고 재는 값들');
  /* ⓐ 위상 축: 창 동안 `_an.at` 이 얼마나 굴렀나 (기대 = span/1000 × afps)
     ⓑ 전이 축: `_fr` 이 몇 번 바뀌었나 · 같은 프레임이 연속으로 잡힌 최대 구간(50ms 표본 단위)
     ⓒ 창 축(결정론): 제품의 `thCurFrame` 에 위상을 직접 먹여 창을 한 바퀴 돌려 본다 — 표본 운과 무관 */
  const watch = sp => p.evaluate(async ([sel, span]) => {
    const cs = [...document.querySelectorAll(sel)];
    const seen = cs.map(() => new Set());
    const chg = cs.map(() => 0), stall = cs.map(() => 0), run = cs.map(() => 0);
    const at0 = cs.map(c => (c._an && c._an.at) || 0);
    const last = cs.map(c => c._fr);
    const t0 = performance.now();
    while (performance.now() - t0 < span) {
      cs.forEach((c, i) => {
        seen[i].add(c._fr);
        if (c._fr === last[i]) { run[i]++; if (run[i] > stall[i]) stall[i] = run[i]; }
        else { chg[i]++; run[i] = 0; last[i] = c._fr; }
      });
      await new Promise(r => setTimeout(r, 50));
    }
    const el = performance.now() - t0;
    return cs.map((c, i) => ({ uniq: seen[i].size, chg: chg[i], stall: stall[i],
      dat: +(((c._an && c._an.at) || 0) - at0[i]).toFixed(2), el: +el.toFixed(0) }));
  }, [SEL, sp]);

  /* ⚠ 창은 `TH_IDLE` 에만 있는 게 아니다 — `knight/idle` 은 창이 없어 `ATLAS[k].a[anim]` 로 떨어진다
     (`thCurFrame` 자신이 그렇게 갈라진다). idleSpec 과 **같은 파생**을 써야 자가 어긋나지 않는다. */
  const cover = await p.evaluate(sel => [...document.querySelectorAll(sel)].map(c => {
    const e = c._an; if (!e) return null;
    const w = (typeof TH_IDLE !== 'undefined' && TH_IDLE[e.akey + '/' + e.anim])
      || (ATLAS[e.akey] && ATLAS[e.akey].a && ATLAS[e.akey].a[e.anim]) || [];
    const out = new Set();
    /* 살아 있는 엔티티는 안 건드린다 — 위상만 베낀 사본에 물어본다(제품 함수 그대로) */
    /* ⚠ `aloop` 을 안 베끼면 `curFrame` 이 «한 번 재생» 분기로 떨어져 **마지막 프레임에 고정**된다
       (창 없는 키 `knight/idle` 은 thCurFrame 이 curFrame 으로 내려간다) — 고유 1 이 나오면 그 함정이다. */
    for (let k = 0; k < w.length * 4; k++)
      out.add(thCurFrame({ akey: e.akey, anim: e.anim, aloop: e.aloop, at: e.at + k * 0.25 }));
    return { win: w.length, uniq: new Set(w).size, swept: out.size };
  }), SEL);
  cover.forEach((c, i) => ok(!!c && c.win > 0 && c.swept === c.uniq,
    `ⓒ 창 축(결정론) 칸[${i}] — 제품 thCurFrame 에 위상을 한 바퀴 먹이면 고유 ${c && c.swept}/${c && c.uniq} (창 ${c && c.win}칸 · 표본 운과 무관)`));

  const mm = [];
  for (let n = 0; n < N; n++) {
    const w = await watch(span);
    mm.push(w);
    console.log('  #' + (n + 1) + '  ' + w.map((x, i) =>
      `칸[${i}] 고유 ${x.uniq} · 전이 ${x.chg} · 위상 Δat ${x.dat} · 최대 정체 ${x.stall}표본`).join('   '));
    await p.waitForTimeout(150);
  }
  const flat = mm.flat();
  const mn = k => Math.min(...flat.map(x => x[k])), mx = k => Math.max(...flat.map(x => x[k]));
  const expAt = span / 1000 * spec[0].afps;
  ok(true, `요약 — 고유 ${mn('uniq')}~${mx('uniq')} (기대 ${spec[0].uniq}) · 전이 ${mn('chg')}~${mx('chg')} · Δat ${mn('dat')}~${mx('dat')} (기대 ${expAt.toFixed(1)}) · 최대 정체 ${mn('stall')}~${mx('stall')}표본`);
  ok(true, `⇒ Δat 하한비 ${(mn('dat') / expAt).toFixed(3)} · 전이 하한비 ${(mn('chg') / expAt).toFixed(3)} — «정지» 는 둘 다 0 이 된다`);

  console.log(`\nPROBE376 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
