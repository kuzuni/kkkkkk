/* 작업 239 — verify121 의 «뜨고 지는» 두 항목을 **재기 위한** 프로브(판정 없음).
   실행: node tools/probe239.js [A|B]   (인자 없으면 둘 다)

   [A] §6 «해금 칸 아이들 프레임 순환» — 현재 게이트는 900ms 간격 **두 점**을 찍어
       `f0 !== f1` 을 묻는다. 아이들 창(TH_IDLE)이 4프레임이고 그 안에 **같은 이름이 두 번**
       들어 있는 카드가 있어(elves: 0,1,2,1) 두 점이 같은 이름에 떨어지는 위상이 존재한다.
       → 카드별 창·중복·주기를 뽑고, 현재 판정과 «여러 점 표본» 판정을 각각 N회 돌려 실패율을 센다.

   [B] §7 «배경 ON 유지율 ≥ 90%» — 러너가 소프트웨어 합성(SwiftShader)이라 프레임이
       33/50/83ms 로 양자화된다. 평균 fps 비는 드문 느린 프레임 몇 개에 통째로 끌려간다.
       → ON/OFF 를 번갈아 여러 쌍 재되 **원시 프레임 시간 배열**을 그대로 받아
       평균 / 중앙 / p75 / 긴프레임 비율 각각의 «쌍별 비» 분포를 같이 낸다.
       어느 통계가 실행 사이에 안 흔들리는지 고르기 위한 자료다(판정은 게이트가 한다).

   ⚠ LESSONS 121-14: «임계값을 낮춰 초록으로 만들지 않는다». 그래서 이 프로브는 문턱을 고르는 게
      아니라 **어떤 양을 재야 실행마다 같은 답이 나오는가** 를 고르기 위한 것이다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ARG = (process.argv[2] || '').toUpperCase();
const TRIALS = +(process.env.P239_TRIALS || 6);
const PAIRS = +(process.env.P239_PAIRS || 6);

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await p.waitForTimeout(700);

  /* ---------------- [A] 아이들 프레임 표본 ---------------- */
  if (!ARG || ARG === 'A') {
    console.log('\n=== [A] 아이들 프레임 순환 표본 ===');
    await p.evaluate(() => setDunSub('raid'));
    await p.waitForTimeout(900);
    const meta = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')].map((c, i) => {
      const arn = !!c.dataset.arnav;
      const akey = arn ? 'knight' : c.dataset.thk, anim = arn ? 'idle' : c.dataset.thi;
      const w = (typeof TH_IDLE !== 'undefined' && TH_IDLE[akey + '/' + anim]) || null;
      const full = (ATLAS[akey] && ATLAS[akey].a && ATLAS[akey].a[anim]) || null;
      return {
        i, akey, anim, lkd: !!c.closest('.dnc.lkd'),
        win: w, winN: w ? w.length : (full ? full.length : 0),
        uniq: w ? new Set(w).size : (full ? new Set(full).size : 0),
        afps: (c._an && c._an.afps) || 8
      };
    }));
    meta.forEach(m => console.log(`  칸${m.i}${m.lkd ? '(잠금)' : '      '} ${m.akey}/${m.anim}` +
      ` 창 ${m.winN}프레임(고유 ${m.uniq}) ${m.afps}fps → 한 바퀴 ${Math.round(m.winN / m.afps * 1000)}ms` +
      (m.win ? '  [' + m.win.join(',') + ']' : '  (TH_IDLE 창 없음 — 전 사이클)')));

    const live = meta.filter(m => !m.lkd).map(m => m.i);
    /* ① 현재 게이트와 같은 판정 — 900ms 두 점 */
    const two = [];
    for (let t = 0; t < TRIALS; t++) {
      const f0 = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')].map(c => c._fr));
      await p.waitForTimeout(900);
      const f1s = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')].map(c => c._fr));
      const bad = live.filter(i => f0[i] === f1s[i]);
      two.push(bad);
      console.log(`  [두 점 900ms] 시행${t + 1}: ` + live.map(i => `칸${i} ${f0[i]}→${f1s[i]}` +
        (f0[i] === f1s[i] ? ' ✗' : '')).join(' · '));
    }
    console.log(`  → 두 점 판정 실패 시행 ${two.filter(b => b.length).length}/${TRIALS}` +
      ` (실패한 칸: ${[...new Set(two.flat())].join(',') || '없음'})`);

    /* ② 제안 — 한 바퀴 이상을 촘촘히 훑어 «관측된 고유 프레임 수» 를 센다 */
    const SPAN = 1300, EVERY = 50;
    for (let t = 0; t < TRIALS; t++) {
      const seen = await p.evaluate(async ([span, every]) => {
        const cs = [...document.querySelectorAll('#dunList canvas.thcv')];
        const acc = cs.map(() => new Set());
        const t0 = performance.now();
        while (performance.now() - t0 < span) {
          cs.forEach((c, i) => acc[i].add(c._fr));
          await new Promise(r => setTimeout(r, every));
        }
        return acc.map(s => [...s]);
      }, [SPAN, EVERY]);
      console.log(`  [다점 ${SPAN}ms/${EVERY}ms] 시행${t + 1}: ` + meta.map(m =>
        `칸${m.i}${m.lkd ? '(잠)' : ''} ${seen[m.i].length}/${m.uniq}`).join(' · '));
    }
  }

  /* ---------------- [B] 스크롤 fps ---------------- */
  if (!ARG || ARG === 'B') {
    console.log('\n=== [B] 스크롤 프레임 시간 (ON/OFF 교대) ===');
    await p.evaluate(() => setDunSub('dun'));
    await p.waitForTimeout(700);
    const runRaw = () => p.evaluate(() => new Promise(res => {
      const el = document.getElementById('dunList');
      const ts = []; let n = 0, dir = 1;
      const step = t => {
        ts.push(t); n++;
        el.scrollTop += dir * 34;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1;
        if (el.scrollTop <= 2) dir = 1;
        if (n < 120) requestAnimationFrame(step);
        else { const d = []; for (let i = 1; i < ts.length; i++) d.push(+(ts[i] - ts[i - 1]).toFixed(2)); res(d); }
      };
      requestAnimationFrame(step);
    }));
    const setBgm = v => p.evaluate(v => document.querySelectorAll('#dunList .dnc>.bgm')
      .forEach(e => e.style.display = v), v);
    await setBgm(''); await runRaw();                 /* 워밍업 */
    const rows = [];
    for (let k = 0; k < PAIRS; k++) {
      await setBgm(''); await p.waitForTimeout(250);
      const on = await runRaw();
      await setBgm('none'); await p.waitForTimeout(250);
      const off = await runRaw();
      const stat = d => ({ avg: avg(d), med: q(d, .5), p75: q(d, .75), p90: q(d, .9),
                           long: d.filter(v => v > 40).length / d.length * 100 });
      const A = stat(on), B = stat(off);
      rows.push({ A, B });
      console.log(`  쌍${k + 1}  ON avg ${f1(A.avg)}ms med ${f1(A.med)} p75 ${f1(A.p75)} p90 ${f1(A.p90)} 긴프레임 ${f1(A.long)}%` +
        `  |  OFF avg ${f1(B.avg)}ms med ${f1(B.med)} p75 ${f1(B.p75)} p90 ${f1(B.p90)} 긴프레임 ${f1(B.long)}%` +
        `  → fps유지율 ${f1(B.avg / A.avg * 100)}%  med비 ${f1(A.med / B.med)}`);
    }
    await setBgm('');
    const ratios = rows.map(r => r.B.avg / r.A.avg * 100);
    const medR = rows.map(r => r.A.med / r.B.med);
    const p75R = rows.map(r => r.A.p75 / r.B.p75);
    const show = (nm, a) => console.log(`  ${nm}: ${a.map(f1).join(' · ')}  → 중앙 ${f1(q(a, .5))} · 최소 ${f1(Math.min(...a))} · 최대 ${f1(Math.max(...a))} · 폭 ${f1(Math.max(...a) - Math.min(...a))}`);
    show('평균 fps 유지율(%)  ', ratios);
    show('중앙 프레임 시간 비 ', medR);
    show('p75 프레임 시간 비  ', p75R);
    console.log('  ON 긴프레임(>40ms) %: ' + rows.map(r => f1(r.A.long)).join(' · '));
    console.log('  OFF 긴프레임(>40ms) %: ' + rows.map(r => f1(r.B.long)).join(' · '));
  }

  /* ---------------- [C] 회귀 주입 감도 ----------------
     [B] 가 «평균 fps 비는 흔들리고 중앙 프레임 시간은 안 흔들린다» 를 보여도, 그것만으로
     중앙값을 판정에 쓸 수는 없다 — **진짜 성능 회귀가 들어왔을 때 빨개지는가** 를 같이 봐야 한다
     (LESSONS 132 «고친 게이트에는 회귀를 주입해 봐라»). 알려진 비싼 것 두 가지를 .bgm 에 얹고
     같은 통계를 다시 낸다. LESSONS 121-3: filter 는 매 프레임 그 요소를 다시 래스터한다. */
  if (!ARG || ARG === 'C') {
    console.log('\n=== [C] 회귀 주입 감도 (.bgm 에 비싼 속성 얹기) ===');
    await p.evaluate(() => setDunSub('dun'));
    await p.waitForTimeout(700);
    const runRaw = () => p.evaluate(() => new Promise(res => {
      const el = document.getElementById('dunList');
      const ts = []; let n = 0, dir = 1;
      const step = t => {
        ts.push(t); n++;
        el.scrollTop += dir * 34;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1;
        if (el.scrollTop <= 2) dir = 1;
        if (n < 120) requestAnimationFrame(step);
        else { const d = []; for (let i = 1; i < ts.length; i++) d.push(+(ts[i] - ts[i - 1]).toFixed(2)); res(d); }
      };
      requestAnimationFrame(step);
    }));
    const setBgm = v => p.evaluate(v => document.querySelectorAll('#dunList .dnc>.bgm')
      .forEach(e => e.style.display = v), v);
    const setFx = v => p.evaluate(v => document.querySelectorAll('#dunList .dnc>.bgm')
      .forEach(e => e.style.filter = v), v);
    const stat = d => ({ avg: avg(d), med: q(d, .5), p75: q(d, .75), p90: q(d, .9),
                         long: d.filter(v => v > 40).length / d.length * 100 });
    const cases = [['회귀 없음', ''], ['brightness(1.02)', 'brightness(1.02)'], ['blur(3px)', 'blur(3px)']];
    await setBgm(''); await runRaw();                 /* 워밍업 */
    for (const [nm, fx] of cases) {
      const R = [];
      for (let k = 0; k < 3; k++) {
        await setBgm(''); await setFx(fx); await p.waitForTimeout(250);
        const on = await runRaw();
        await setBgm('none'); await p.waitForTimeout(250);
        const off = await runRaw();
        R.push({ A: stat(on), B: stat(off) });
      }
      await setFx('');
      const med3 = a => [...a].sort((x, y) => x - y)[1];
      console.log(`  ${nm.padEnd(18)} 평균fps유지율 ${med3(R.map(r => r.B.avg / r.A.avg * 100)).toFixed(1)}%` +
        ` · 중앙프레임 ON ${f1(med3(R.map(r => r.A.med)))}ms / OFF ${f1(med3(R.map(r => r.B.med)))}ms` +
        ` (비 ${med3(R.map(r => r.A.med / r.B.med)).toFixed(2)})` +
        ` · p75 비 ${med3(R.map(r => r.A.p75 / r.B.p75)).toFixed(2)}` +
        ` · 긴프레임 ON ${f1(med3(R.map(r => r.A.long)))}% / OFF ${f1(med3(R.map(r => r.B.long)))}%`);
    }
    await setBgm(''); await setFx('');
  }

  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
