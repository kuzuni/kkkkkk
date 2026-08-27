/* 작업 246 — verify121 §7 «스크롤 성능 예산» 을 **재기 위한** 프로브(판정 없음).
   실행: node tools/probe246.js [축|주입]      (인자 없으면 전부)

   접수 상태: 이 클라우드 러너에서 §7 두 줄이 상시 FAIL 한다.
     ✗ 중앙 프레임 50ms ≤ 기준 33.4ms × 1.15
     ✗ 떨군 프레임(>40ms) ON 92.4% ≤ 기준 26.1% + 30%p
   239 가 고른 두 축(중앙 프레임 시간 비 · 떨군 프레임 비율)은 **시간 축**이다. 이 러너의
   크로미움은 소프트웨어 합성(SwiftShader)이라 프레임 시간이 16.7ms 배수로 **양자화**된다 —
   ON 이 한 칸(33.4 → 50.1) 밀리는 순간 비가 곧바로 1.50 이 되고, 그 1.50 은 239 가
   «회귀 주입 값» 으로 적어 둔 바로 그 수다. 즉 무회귀대와 회귀대가 **같은 칸에서 겹친다**.
   237(verify114 [8]) 이 같은 자리에서 간 길 — «시간을 버리고 작업량·구조를 재라» — 이 옳은지
   확인하기 위한 자료를 뽑는다.

   재는 것(같은 스크롤 왕복 120프레임에서 한꺼번에):
     [T] 시간   — 평균/중앙/>40ms 비율 (239 가 쓰던 축. 기록용)
     [W] 작업량 — CDP Performance 의 RecalcStyleCount·LayoutCount 델타(프레임당)
     [G] 기하   — 애니메이션 레이어(.bgm::before/::after) 총 면적 / 리스트 면적
     [S] 구조   — .bgm 계열의 비싼 상태(filter·backdrop-filter·box-shadow)와
                  애니메이션이 건드리는 속성 집합(transform·opacity 밖으로 나가는가)

   주입(LESSONS 132 — 고친 게이트에는 회귀를 넣어 봐라):
     none / brightness(1.02) / blur(3px)  ← 239 가 쓰던 두 회귀
     layout(레이아웃 유발 애니메이션 — width 를 매 프레임 흔든다)
     big(레이어 폭 200% → 800%)
   각 축이 «무회귀에서 안 흔들리고 주입에서 빨개지는가» 를 같은 표로 본다.

   ⚠ LESSONS 121-14: 문턱을 낮춰 초록을 만들지 않는다. 이 프로브는 문턱이 아니라 **축**을 고른다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ARG = (process.argv[2] || '').toLowerCase();
const TRIALS = +(process.env.P246_TRIALS || 3);

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics
    .map(m => [m.name, m.value]));

  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await p.waitForTimeout(700);
  await p.evaluate(() => setDunSub('dun'));
  await p.waitForTimeout(700);

  /* 239 와 **똑같은** 스크롤 왕복(120프레임) — 축만 더 재고 부하는 그대로 둔다. */
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

  /* 한 번의 스크롤에서 [T]+[W] 를 같이 받는다 */
  const run = async () => {
    const m0 = await metrics();
    const d = await runRaw();
    const m1 = await metrics();
    const n = d.length;
    return {
      avg: avg(d), med: q(d, .5), long: d.filter(v => v > 40).length / n * 100,
      recalc: (m1.RecalcStyleCount - m0.RecalcStyleCount) / n,
      layout: (m1.LayoutCount - m0.LayoutCount) / n,
      lobj: m1.LayoutObjects, n
    };
  };

  const setBgm = v => p.evaluate(v => document.querySelectorAll('#dunList .dnc>.bgm')
    .forEach(e => e.style.display = v), v);

  /* ---- [G] 기하 · [S] 구조 — 스크롤과 무관하게 한 번 읽으면 되는 축 ---- */
  const shape = () => p.evaluate(() => {
    const list = document.getElementById('dunList');
    const lr = list.getBoundingClientRect();
    const bgs = [...document.querySelectorAll('#dunList .dnc>.bgm')];
    let area = 0, bad = [], props = new Set();
    const EXP = ['filter', 'backdropFilter', 'boxShadow'];
    for (const el of bgs) {
      const r = el.getBoundingClientRect();
      for (const pe of ['::before', '::after']) {
        const cs = getComputedStyle(el, pe);
        const w = parseFloat(cs.width) || 0, h = parseFloat(cs.height) || 0;
        area += w * h;
        for (const k of EXP) {
          const v = cs[k];
          if (v && v !== 'none' && !bad.includes(k + '=' + v)) bad.push(k + '=' + v);
        }
      }
      const cs = getComputedStyle(el);
      for (const k of EXP) {
        const v = cs[k];
        if (v && v !== 'none' && !bad.includes(k + '=' + v)) bad.push(k + '=' + v);
      }
      /* 이 요소·의사요소에서 도는 애니메이션이 건드리는 속성 집합 */
      const as = el.getAnimations ? el.getAnimations({ subtree: true }) : [];
      for (const a of as) {
        let kf = []; try { kf = a.effect.getKeyframes(); } catch (_) {}
        for (const f of kf) for (const k of Object.keys(f))
          if (!['offset', 'computedOffset', 'easing', 'composite'].includes(k)) props.add(k);
      }
      void r;
    }
    return { area, listArea: lr.width * lr.height, cards: bgs.length,
             bad, props: [...props].sort() };
  });

  /* ---- 주입 ---- */
  const INJ = {
    none: () => p.evaluate(() => {
      document.querySelectorAll('#dunList .dnc>.bgm').forEach(e => { e.style.filter = ''; e.style.width = ''; });
      const s = document.getElementById('p246inj'); if (s) s.remove();
    }),
    brightness: () => p.evaluate(() => document.querySelectorAll('#dunList .dnc>.bgm')
      .forEach(e => e.style.filter = 'brightness(1.02)')),
    blur: () => p.evaluate(() => document.querySelectorAll('#dunList .dnc>.bgm')
      .forEach(e => e.style.filter = 'blur(3px)')),
    /* 레이아웃 유발 애니메이션 — 합성이 아니라 매 프레임 메인 스레드 레이아웃을 부른다 */
    layout: () => p.evaluate(() => {
      const s = document.createElement('style'); s.id = 'p246inj';
      s.textContent = '@keyframes p246lay{from{width:200%}to{width:201%}}' +
        '#dunList .dnc>.bgm::before{animation:bgmA var(--bgt1,60s) linear infinite var(--bgd1,0s),' +
        'p246lay .5s linear infinite!important}';
      document.head.appendChild(s);
    }),
    /* 래스터 면적 4배 */
    big: () => p.evaluate(() => {
      const s = document.createElement('style'); s.id = 'p246inj';
      s.textContent = '#dunList .dnc>.bgm::before,#dunList .dnc>.bgm::after{width:800%!important}';
      document.head.appendChild(s);
    }),
  };

  const cases = ARG && INJ[ARG] ? [ARG] : ['none', 'brightness', 'blur', 'layout', 'big'];
  console.log('=== 246 — 축 후보 × 회귀 주입 (스크롤 왕복 120프레임 · ON/OFF 교대 ' + TRIALS + '쌍) ===');
  console.log('  [T] 시간 · [W] 작업량(프레임당 recalc/layout) · [G] 레이어 면적 · [S] 비싼 상태·속성\n');

  await setBgm(''); await run();                       /* 워밍업 */
  for (const c of cases) {
    await INJ.none(); await INJ[c](); await p.waitForTimeout(400);
    const sh = await shape();
    const ons = [], offs = [];
    for (let k = 0; k < TRIALS; k++) {
      await setBgm(''); await p.waitForTimeout(250); ons.push(await run());
      await setBgm('none'); await p.waitForTimeout(250); offs.push(await run());
    }
    await setBgm('');
    const mid3 = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const medR = ons.map((o, i) => o.med / offs[i].med);
    console.log(`[${c}]`);
    console.log(`  [T] 중앙프레임 비 ${medR.map(f2).join(' · ')} → 중앙 ${f2(mid3(medR))}` +
      `  (ON med ${ons.map(o => f1(o.med)).join('/')} · OFF med ${offs.map(o => f1(o.med)).join('/')})`);
    console.log(`  [T] >40ms 비율 ON ${ons.map(o => f1(o.long)).join(' · ')} % / OFF ${offs.map(o => f1(o.long)).join(' · ')} %`);
    console.log(`  [W] 프레임당 recalc ON ${ons.map(o => f2(o.recalc)).join(' · ')} / OFF ${offs.map(o => f2(o.recalc)).join(' · ')}` +
      ` · layout ON ${ons.map(o => f2(o.layout)).join(' · ')} / OFF ${offs.map(o => f2(o.layout)).join(' · ')}`);
    console.log(`  [G] 레이어 면적 ${(sh.area / 1e6).toFixed(2)}Mpx / 리스트 ${(sh.listArea / 1e6).toFixed(2)}Mpx` +
      ` = ${f2(sh.area / sh.listArea)}배 (카드 ${sh.cards}장)`);
    console.log(`  [S] 비싼 상태 ${sh.bad.length ? sh.bad.join(', ') : '없음'} · 애니 속성 [${sh.props.join(', ')}]`);
  }
  await INJ.none();
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
