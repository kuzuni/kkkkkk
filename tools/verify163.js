/* 작업 163 회귀 게이트 — 첫 접속 로딩 화면 «플레이어 등장» 연출 (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify163.js   → 마지막 줄이 `VERIFY163 n/n PASS` 여야 한다.

   본다:
     §1 구조     #loading 안에 무대(#ldStage)·바닥선·그림자·캐릭터 캔버스·문구·진행바·진행표기가 있다.
                 캔버스는 480×320 이고 image-rendering:pixelated(정수 배율 픽셀아트 — 79 규격).
     §2 상수     LD_* 상수와 **CSS 가 실제로 쓰는 값**이 어긋나지 않는다. 특히 페이드 길이는
                 JS(LD_FADE)와 CSS(#loading transition-duration)에 **두 번** 적혀 있다 —
                 한쪽만 고치면 «투명해지기 전에 display:none» 또는 «다 사라진 뒤에도 남는» 상태가 된다.
                 (161 교훈 ② «상수 하나로 적은 임계값은 CSS 가 움직이면 조용히 어긋난다» 의 실천판)
     §3 시간축   ★ 이 게이트의 본체. 로딩 오버레이는 **800ms 안에 display:none** 이어야 한다.
                 이 저장소의 캡처·게이트 40여 개가 `waitForTimeout(800)` 뒤에 화면을 찍는다 —
                 오버레이가 그때까지 살아 있으면 그 전부가 «검은 막이 덮인» 캡처가 된다.
                 163 의 1차 설계(«다 달려와 선 뒤에 나간다»)가 실제로 970ms 를 찍어서 폐기됐다.
     §4 궤적     캐릭터는 프레임 밖(x ≤ −400)에서 시작해 중앙(x=0)으로 오고, **증분이 단조 감소**한다
                 (easeOutCubic = 감속해서 선다. 등속이거나 가속이면 «달려와 선다» 로 안 읽힌다).
     §5 통과성   부팅(.thru) 뒤에는 오버레이가 탭을 **안 막는다** — 남은 체류 동안 그 아래 UI 가 눌린다.
     §6 진행표기 진행바·«n/총계» 가 아틀라스 개수와 같은 분모로 끝까지 찬다(총계는 ATLAS 에서 파생).
     §7 무한로딩 knight 아틀라스가 **깨져도** 로딩은 끝난다(캐릭터 없이 그냥 나간다).
                 «등장이 끝나야 나간다» 로 되돌리면 여기서 빨개진다.
     §8 부팅분리 오버레이가 아직 떠 있는 동안에도 **게임은 이미 돌고 있다**(부팅 시각 불변).
     §9 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* ★ 기준선은 **절대 시각이 아니라 «부팅 + 300ms»** 다(3회차에 바로잡았다).
   이 저장소의 게이트·하네스는 `goto(waitUntil:'load')` 뒤에 대기하는데, load 이벤트는
   «아틀라스까지 다 받은 시점» = 부팅과 거의 같다. 그리고 goto 뒤 **최단 대기가 300ms**
   (verify78·verify113 — 둘 다 DOM 검사라 `.thru` 로 통과한다), 실제로 **화면을 찍는** 하네스는
   400ms 이상이다(cap113·scan116·verify125 …).
   절대값(850ms)으로 박아 두면 이 컨테이너의 부팅 시각이 430~650ms 로 흔들릴 때
   **실행마다 뜨고 지는 FAIL**(136 계열)이 된다 — 실제로 그렇게 헛불렸다. */
/* 부팅 뒤 오버레이가 «보여도 되는» 시간. 300 은 **DOM 검사** 게이트(verify78·verify113)의 대기이고
   그것들은 `.thru`(pointer-events:none) 로 통과한다. 실제로 **화면을 찍는** 하네스는 400 이상
   (cap113·scan116·verify125 …)이므로 기준을 그 사이인 340 으로 둔다 — 타이머 굶주림이
   실행마다 90~180ms 흔들려서 300 으로 조이면 «뜨고 지는 FAIL»(136 계열)이 된다. */
const TAIL_MS = 340;
const ABS_MS = 1200;   /* 그래도 이보다 늦으면 무언가 잘못된 것이다 */

/* ★ 계측이 대상을 흔든다 — 두 벌로 나눈 이유.
   1차 게이트는 «전이 시각 관찰 + rAF 궤적 추적» 을 한 페이지에서 같이 했다. 그 rAF 루프가
   로딩·부팅으로 이미 포화된 메인 스레드를 더 밀어서 hero 413→645ms · gone 758→1204ms 로
   **계측 없는 실제보다 450ms 씩 늦게** 나왔고, 그대로 «800ms 초과» FAIL 을 냈다.
   그래서 §3 시간축은 MutationObserver 만 붙인 **가벼운 페이지**에서 재고,
   §4 궤적은 시각을 안 따지는 **별도 페이지**에서 rAF 로 잰다.
   (149·161 «틀린 계측은 FAIL 로 위장하고 온다» 의 세 번째 표본) */
const WATCH_T = () => {                          /* 시간축 전용 — 가볍게 */
  window.__ev = [];
  const mark = (k) => { if (!window.__ev.some(e => e.k === k)) window.__ev.push({ k, t: performance.now() }); };
  const boot = () => {
    const el = document.getElementById('loading');
    if (!el) { requestAnimationFrame(boot); return; }
    const look = () => {
      const cv = document.getElementById('ldHero');
      if (cv && cv.classList.contains('on')) mark('hero');
      if (el.classList.contains('thru')) mark('boot');
      if (el.classList.contains('out')) mark('fade');
      if (el.classList.contains('off')) mark('gone');
    };
    new MutationObserver(look).observe(el, { attributes: true, attributeFilter: ['class'], subtree: true });
    look();
  };
  boot();
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  /* ---------------- A. 평소 실행(지연 없음) ---------------- */
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(WATCH_T);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  console.log('§1 구조');
  const dom = await page.evaluate(() => {
    const q = (id) => document.getElementById(id);
    const cv = q('ldHero');
    const cs = cv ? getComputedStyle(cv) : null;
    return {
      has: ['loading', 'ldStage', 'ldGr', 'ldSh', 'ldHero', 'ldTx', 'ldBar', 'ldBarF', 'ldNum'].filter(id => !!q(id)),
      cw: cv && cv.width, ch: cv && cv.height,
      css: cv && [parseFloat(cs.width), parseFloat(cs.height)],
      pix: cs && cs.imageRendering,
      inside: !!(cv && q('loading').contains(cv)),
      txt: (q('ldTx') || {}).textContent
    };
  });
  eq('필수 요소 9개', dom.has.length, 9);
  ok(dom.inside, '캐릭터 캔버스가 #loading 안에 있다');
  eq('image-rendering', dom.pix, 'pixelated');
  ok(/스프라이트 불러오는 중/.test(dom.txt || ''), '문구 유지(«스프라이트 불러오는 중...»)', dom.txt);
  /* ★ 2회차의 진짜 결함이 여기였다 — backing 480×320 인데 CSS 는 720×512 라 1.5×/1.6× **비균등 CSS 확대**가
     걸렸고(정수 배율 규칙이 최종 출력에서 깨졌다), 백버퍼가 40 소스픽셀뿐이라 run 프레임의 위 20%
     (칼끝·투구 깃)가 평평하게 잘려 있었다. 비평가 두 명이 각각 «세로 12.8px 들쭉날쭉»·«머리 위 잘림» 으로
     같은 자리를 짚었다. 그래서 이 게이트는 이제 **backing = CSS 박스** 와 **잘림 0** 을 아틀라스에서 유도해 잰다. */
  eq('캔버스 backing 가로 = CSS 가로(비정수 확대 금지)', dom.cw, dom.css[0]);
  eq('캔버스 backing 세로 = CSS 세로', dom.ch, dom.css[1]);

  console.log('§2 상수 정합');
  const K = await page.evaluate(() => ({
    MIN: LD.MIN, RUN: LD.RUN, GRACE: LD.GRACE, FADE: LD.FADE, X0: LD.X0, SC: LD.SC,
    RUNMS: LD.RUNMS, IDMS: LD.IDMS, RTAIL: LD.RTAIL, ARC: LD.ARC,
    CRZ: LD.CRZ, CRZD: LD.CRZD, FOOT: LD.FOOT, AIR: LD.AIR, STEP: LD.STEP,
    runFrames: ATLAS.knight.a.run.length,
    trans: Math.round(parseFloat(getComputedStyle(document.getElementById('loading')).transitionDuration) * 1000),
    atlas: Object.keys(ATLAS).length, total: LD.total()
  }));
  eq('JS 페이드(LD_FADE) = CSS transition-duration', K.trans, K.FADE);
  ok(K.FADE < TAIL_MS * .6, `페이드가 꼬리 예산의 60% 안 (${K.FADE} < ${Math.round(TAIL_MS * .6)}ms)`);
  ok(K.RUN >= 380, `등장 길이 ≥380ms — 1회차 300ms 는 «인지 하한 미달» 지적을 받았다 (${K.RUN})`);
  /* ★ 한 스트라이드가 정확히 한 번 완결되는가. 상수를 손으로 «52» 라고 적어 두고 run 프레임 수가
     바뀌면 조용히 어긋나므로, 게이트가 **아틀라스에서 프레임 수를 다시 세서** 대조한다. */
  /* ★ 프레임 간격은 «스트라이드를 몇 번 돌리나» 가 아니라 **발이 미끄러지지 않나** 로 판정한다.
     3회차 비평 E·F 가 독립적으로 같은 결함을 짚었다 — 접지발은 프레임당 7.67 src px 뒤로 가도록
     그려져 있는데 40ms 간격에서는 몸이 그 66% 만 나가, 프레임당 31px 씩 밀리고 등속 480ms 동안
     누적 282px(등장의 33%)가 미끄러졌다. 그래서 «요구 속도 = 실제 속도» 를 직접 잰다.
     («스트라이드 2회» 는 이 이동 거리에서 발 속도와 양립 불가 — 2바퀴엔 1,472px 가 필요하다.) */
  /* ★ 케이던스의 단위는 «시간» 이 아니라 «거리» 다(4회차 비평 G). 시간 기준이면 등속 구간만 맞고
     **감속 구간에서 미끄럼이 23.6% → 62.0% → 90.6%** 로 벌어진다(몸은 느려지는데 다리는 61ms 고정).
     거리 기준이면 멈출 때 다리도 멈춘다 — 재방문의 압축 경로(등속의 5배 속도)도 저절로 맞는다. */
  eq('프레임 한 장의 평균 이동 거리 = 접지발 평균 × 배율', Math.round(K.STEP * 100), Math.round(K.FOOT * K.SC * 100));
  ok(/run\[fr\.i % run\.length\]/.test(SRC) && /var fr = ldFrameAt\(d\);/.test(SRC)
      && /var d = Math\.abs\(LD_X0\) - Math\.abs\(x\);/.test(SRC),
    '★ 달리기 프레임을 **이동 거리**로 뽑는다(시간 기준이면 감속 구간이 트레드밀이 된다)');
  /* ★ 8회차 — 단, **체공만은 시간**이다(고정 LD_AIRMS). 감속 구간에서 도약이 늘어지지 않게 하는 예외이고,
     τ 가 1 을 넘으면 다음 접지 프레임으로 넘긴다. 아치에는 아트의 들림(LD_LIFT)을 상쇄해 발 높이를 잇는다. */
  ok(/tau = \(t - ldTimeAt\(seg\)\) \/ LD_AIRMS;/.test(SRC) && /if \(tau >= 1\)/.test(SRC),
    '체공은 고정 시간이고, 그 시간이 끝나면 접지 프레임으로 넘어간다');
  ok(/arc = LD_LIFT\[fr\.i\] \* LD_SC;/.test(SRC),
    '아치가 아트의 «이미 들린 양»(LD_LIFT)을 상쇄한다 = 도약 진입·이탈에서 발 높이 연속');
  ok(/if \(LD_AIRF\[fr\.i\] && p < 1\)/.test(SRC),
    '아치가 케이던스와 **같은 자**(ldFrameAt)를 써서 딛는 프레임의 arc=0 이 유지된다');
  /* ★ 6회차 — 케이던스 자가 «한 값» 이 아니라 «표» 다. 5회차 인계 ① 이 요구한 것이고,
     비평 H 가 «f0→f1 126 vs f1→f2 90 = 1.40:1 인데 자는 92 한 값» 으로 짚은 자리다.
     표의 진위(아틀라스와 같은가)는 `python3 tools/probe163b.py --gate` 가 픽셀에서 다시 재고,
     여기서는 **그 표가 실제로 프레임 선택을 굴리는가**(구조·불변식)를 본다. */
  const tab = await page.evaluate(() => ({
    feet: LD.FEET, gaps: LD.GAPS, steps: LD.STEPS, cum: LD.CUM, cyc: LD.CYC, airf: LD.AIRF,
    run: ATLAS.knight.a.run.length,
    /* 한 주기를 200 등분해 «어느 프레임이 몇 번 나오나 · 아치가 언제 뜨나» 를 훑는다 */
    sweep: Array.from({ length: 200 }, (_, i) => LD.frameAt(LD.CYC * i / 200))
  }));
  eq('접지발 표의 길이 = run 프레임 수', tab.feet.length, tab.run);
  eq('칸 수 = 프레임 수', tab.steps.length, tab.run);
  ok(tab.steps.every(s => s > 0), '모든 칸이 양수 거리다');
  const mx = Math.max.apply(null, tab.gaps), mn = Math.min.apply(null, tab.gaps);
  ok(mx / mn >= 1.3, `★ 칸이 **균일하지 않다** — 균일 자로 되돌리면 여기서 빨개진다 (최대/최소 ${(mx / mn).toFixed(2)}:1)`);
  /* 접지 칸은 아틀라스가 요구하는 값과 정확히 같아야 한다(체공 칸만 자유) */
  const req = tab.feet.map((v, i) => v - tab.feet[(i + 1) % tab.feet.length]);
  const off = req.map((d, i) => (d > 0 && Math.abs(d - tab.gaps[i]) > 1e-6) ? i : -1).filter(i => i >= 0);
  ok(off.length === 0, `접지 칸의 거리 = 접지발이 프레임 안에서 뒤로 간 거리 (어긋난 칸 ${off.join(',') || '없음'})`);
  eq('체공 칸 수(발이 바뀌는 칸)', tab.airf.filter(Boolean).length, 2);
  ok(tab.airf.every((a, i) => a === (req[i] <= 0)), '체공 판정이 표에서 나온다(손으로 적은 비율이 아니다)');
  ok(Math.abs(tab.cyc - tab.steps.reduce((a, b) => a + b, 0)) < 1e-6, '한 주기 길이 = 칸 합');
  /* 프레임 선택이 표를 따르는가 — 각 프레임이 «자기 칸 길이에 비례해» 나온다 */
  const cnt = tab.steps.map((_, i) => tab.sweep.filter(f => f.i === i).length);
  const share = cnt.map((c, i) => Math.abs(c / 200 - tab.steps[i] / tab.cyc));
  ok(Math.max.apply(null, share) < .02,
    `프레임별 노출 비율이 칸 길이에 비례한다 (최대 오차 ${(Math.max.apply(null, share) * 100).toFixed(1)}%p)`);
  ok(tab.sweep.every(f => f.u >= 0 && f.u < 1), '칸 안의 진행률이 0..1 이다');
  /* ★ 7회차 — **착지에 원인이 있는가.** 6회차 비평 I·J 가 둘 다 «마지막 체공이 t=472ms 에 끝나고
     167.6ms(등장의 26%) 를 평평하게 미끄러진 뒤 아무 낙하 없이 스쿼시만 터진다» 로 짚었다.
     이동 거리를 **체공 칸이 끝나는 누적 지점**에 맞추면 «마지막 발이 닿는 순간 = 도착» 이 된다.
     되돌려서 거리를 아무 값으로 바꾸면 여기서 빨개진다. */
  const ends = tab.airf.map((a, i) => (a ? tab.cum[i] + tab.steps[i] : -1)).filter(v => v >= 0);
  const trav = Math.abs(K.X0) % tab.cyc;
  const near = ends.concat([0, tab.cyc]).map(v => Math.abs(trav - v));
  ok(Math.min.apply(null, near) <= 3,
    `등장 이동(${Math.abs(K.X0)}px)이 **체공 칸이 끝나는 지점**에서 멈춘다 = 착지가 마지막 발디딤이다 (주기 나머지 ${trav.toFixed(1)} · 체공 끝 ${ends.map(v => v.toFixed(1)).join('/')})`);
  ok(Math.abs(K.X0) / tab.cyc >= 1.4, `등장이 최소 1.4주기를 돈다 = 다리가 세 걸음 이상 (${(Math.abs(K.X0) / tab.cyc).toFixed(2)}주기)`);
  /* 등속 구간에서의 케이던스(파생값)가 스프라이트 요구와 맞는지도 같이 본다 */
  const cruise = Math.abs(K.X0) * K.CRZD / (K.RUN * K.CRZ);
  const need = K.STEP / cruise;
  ok(Math.abs(K.RUNMS - need) / need <= .05,
    `등속 구간 케이던스가 스프라이트 발 속도와 맞는다 (요구 ${need.toFixed(1)}ms · 파생 ${K.RUNMS}ms)`);
  ok(K.SC === Math.round(K.SC) && K.SC >= 10, `정수 배율이고 ≥10 (${K.SC}) — 1회차 5는 «캐릭터가 진행바보다 작다»`);
  /* 잘림 0 — 가장 큰 run/idle 프레임이 캔버스 안에 통째로 들어가는가(아틀라스에서 유도) */
  const fit = await page.evaluate(() => {
    const A = ATLAS.knight, cv = document.getElementById('ldHero');
    const all = A.a.run.concat(A.a.idle).map(n => A.f[n]);
    const w = Math.max.apply(null, all.map(f => f[2])), h = Math.max.apply(null, all.map(f => f[3]));
    /* drawHeroTo 앵커: 발밑 = 캔버스 바닥, dy = (−f[7] + f[5]) * SC → 위로 필요한 높이 */
    const need = Math.max.apply(null, all.map(f => (f[7] - f[5]) * LD.SC));
    return { w: w * LD.SC, h: h * LD.SC, need, cw: cv.width, ch: cv.height };
  });
  ok(fit.w <= fit.cw, `가장 넓은 프레임이 캔버스 안 (${fit.w} ≤ ${fit.cw})`);
  ok(fit.need <= fit.ch, `발밑 앵커 기준 필요한 높이가 캔버스 안 = **머리 위 잘림 0** (${fit.need} ≤ ${fit.ch})`);
  ok(K.IDMS === 125, `대기 프레임 간격 = 전투 idle 8fps (${K.IDMS}ms)`);
  ok(K.ARC > 0, `달리는 동안 상하 아치가 있다 (${K.ARC}px) — 1회차는 세로 변위 0px 였다`);
  /* ★ 아치는 «주기» 뿐 아니라 **위상**도 맞아야 한다. 4프레임 중 3프레임이 접지(f0 발끝 · f1 발바닥 ·
     f2 밀어내기)이고 f3 만 체공인데, 3회차의 |sin| 은 정점을 **f2(아직 닿아 있는 프레임)** 에 얹어
     «발이 바닥 2px 이내인 시간이 주기의 3.2%» 였다(비평 E). 접지 구간은 arc 가 정확히 0 이어야 한다. */
  ok(K.AIR > 0 && K.AIR < 1, `접지 비율이 표에서 파생된다 (${K.AIR})`);
  /* ★ 아치는 «주기의 뒤 몇 %» 가 아니라 **체공 프레임**에서만 떠야 한다. 칸 길이가 프레임마다
     다른 6회차부터는 비율로 얹으면 체공 칸과 안 겹친다 — 그래서 실제 식(ldTick)과 같은 식으로
     한 주기를 거리로 훑어서, 접지 프레임에서 arc 가 **정확히 0** 인지 본다. */
  const arcPhase = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 240; i++) {                   /* 한 주기(LD_CYC px)를 거리로 훑는다 */
      const f = LD.frameAt(LD.CYC * i / 240);
      out.push({ i: f.i, grounded: !LD.AIRF[f.i],
        arc: LD.AIRF[f.i] ? -Math.round(LD.ARC * Math.sin(Math.PI * f.u)) : 0 });
    }
    return out;
  });
  ok(arcPhase.filter(r => r.grounded).every(r => r.arc === 0),
    `접지 프레임(주기의 ${Math.round(K.AIR * 100)}%)에서는 아치가 정확히 0 = 발이 붙어 있다`);
  ok(Math.min.apply(null, arcPhase.map(r => r.arc)) <= -(K.ARC - 1),
    `체공 프레임에서 아치가 최대치(${K.ARC}px)까지 뜬다`);
  ok(arcPhase.some(r => !r.grounded), '체공 프레임이 실제로 주기 안에 나온다');
  ok(/var LD_MIN\b/.test(SRC) && /var LD_RUN\b/.test(SRC), '상수가 index.html 에 이름으로 있다');
  ok(SRC.indexOf('window.ldReady') < SRC.indexOf('function loadAtlases'),
    '로딩 모듈이 본 스크립트보다 **앞에** 있다(파싱 400ms 를 안 기다린다)');

  console.log('§3 시간축 (★ 게이트 40여 개의 800ms 기준선 보호)');
  const ev = await page.evaluate(() => window.__ev.map(e => ({ k: e.k, t: Math.round(e.t) })));
  const at = (n) => { const e = ev.find(x => x.k === n); return e ? e.t : null; };
  const gone = at('gone'), boot = at('boot'), hero = at('hero'), fade = at('fade');
  console.log(`     hero=${hero} boot=${boot} fade=${fade} gone=${gone} (ms, 내비게이션 시작 기준)`);
  ok(gone !== null, '로딩 오버레이가 사라진다(display:none)');
  /* ★ 캡처를 오염시키는 것은 «display:none 이 언제 붙나» 가 아니라 «언제 안 보이게 되나» 다.
     불투명도 전이는 **컴포지터**가 돌리므로 페이드 시작 + LD_FADE 면 확실히 안 보인다
     (display:none 을 붙이는 setTimeout/transitionend 는 부팅 직후 메인 스레드에 밀려 100~350ms 늦는다 —
     그걸 기준선으로 삼으면 게이트가 실행마다 뜨고 지는 FAIL 이 된다. 136 «뜨고 지는 FAIL» 의 예방판). */
  ok(fade !== null && boot !== null && fade + K.FADE <= boot + TAIL_MS,
    `부팅 + ${TAIL_MS}ms 전에 **안 보이게** 된다 (페이드 끝 ${fade + K.FADE} ≤ 부팅 ${boot} + ${TAIL_MS} = ${boot + TAIL_MS}ms)`);
  ok(fade !== null && fade + K.FADE < ABS_MS, `절대값으로도 ${ABS_MS}ms 전 (${fade + K.FADE}ms)`);
  ok(gone !== null && gone < 1600, `display:none 도 결국 붙는다 (실측 ${gone}ms)`);
  /* «부팅 → 사라짐» 이 아니라 «페이드 시작 → 사라짐» 을 잰다. 그 사이가 페이드 길이다.
     부팅~페이드 사이는 LD_MIN·LD_GRACE 가 정하는 «의도된 체류» 라 여기서 볼 것이 아니다. */
  ok(fade !== null && gone !== null && gone - fade <= K.FADE + 140,
    `페이드 꼬리가 LD_FADE+여유 안 (${gone - fade}ms ≤ ${K.FADE + 140})`);
  ok(hero !== null, 'knight 도착 시 캐릭터가 켜진다(.on)');
  /* ★ 시각이 **같을 수 있다.** 관찰기 콜백 한 번에 `out`·`off` 가 둘 다 보이면(부팅 직후 굶주림으로
     두 전이가 한 배치에 몰리면) 두 마크가 같은 performance.now() 를 받는다 — 그때 `>` 로 재면
     «뜨고 지는 FAIL» 이 된다. 순서는 마크가 쌓인 **차례**로 보고, 시각은 «늦지 않다» 로 본다. */
  const oi = ev.findIndex(e => e.k === 'fade'), gi = ev.findIndex(e => e.k === 'gone');
  ok(oi >= 0 && gi > oi && gone >= fade,
    `페이드가 display:none 보다 먼저 시작한다 (순서 ${oi} < ${gi} · 시각 ${fade} ≤ ${gone})`);

  console.log('§12 축 정렬 (6회차 — 발이 프레임 중앙에 선다)');
  /* `drawHeroTo` 의 c0 는 «칼·망토까지 포함한 잉크» 중심을 맞춘다 — 발 스팬 중심은 그보다 −54px 이다.
     3~5회차는 그 편심을 **그림자에** 넣어 발을 따라가게 했는데(그림자 중심 484), 그러면 화면에
     축이 둘 생긴다: 발·그림자 484 vs 바닥선·진행바·문구 540. 5회차 비평 E·H 가 짚은 자리다.
     6회차는 편심을 **캐릭터 캔버스에** 넣어(margin-left −306 = −360 + LD_FDX) 발을 540 에 세우고,
     그림자는 다시 중앙 정렬로 돌렸다 — 축이 하나다. CSS 는 JS 상수를 못 읽으므로 여기서 대조한다. */
  const axis = await page.evaluate(() => {
    const el = document.getElementById('loading'), cv = document.getElementById('ldHero');
    const had = el.className; el.classList.remove('off', 'out');
    const cs = getComputedStyle(cv);
    const out = {
      ml: parseFloat(cs.marginLeft), w: cv.offsetWidth,
      org: parseFloat(cs.transformOrigin.split(' ')[0]),
      foot: Math.round(cv.offsetLeft + cv.offsetWidth / 2 - LD.FDX),   /* 발 축(레이아웃 좌표) */
      FDX: LD.FDX
    };
    el.className = had; return out;
  });
  eq('캐릭터 캔버스 margin-left = −(폭/2) + LD_FDX', axis.ml, -(axis.w / 2) + axis.FDX);
  ok(Math.abs(axis.org - (axis.w / 2 - axis.FDX)) <= 1,
    `착지 스쿼시 기준점(transform-origin x)이 **발밑**이다 (${axis.org}px · 기대 ${axis.w / 2 - axis.FDX})`);
  eq('발 축이 프레임 중앙(540)', axis.foot, 540);
  const sh = await page.evaluate(() => {
    /* ★ `getBoundingClientRect()` 로 재면 안 된다 — ldTick 이 그림자에 `translateX` 를 걸어
       캐릭터를 따라다니게 하므로, 등장이 아직 안 끝난 순간에 재면 그 이동분이 섞인다
       (실제로 484 / 452 로 실행마다 다르게 나왔다). **레이아웃 위치**(offsetLeft)로 잰다. */
    const el = document.getElementById('loading'), s = document.getElementById('ldSh');
    const had = el.className; el.classList.remove('off', 'out');
    const out = { cx: Math.round(s.offsetLeft + s.offsetWidth / 2), w: s.offsetWidth };
    el.className = had; return out;
  });
  ok(Math.abs(sh.cx - 540) <= 4, `그림자 중심이 **발 축 = 프레임 중앙(540)** 에 있다 (실측 ${sh.cx})`);
  ok(Math.abs(sh.cx - axis.foot) <= 4, `그림자 중심 = 캐릭터 발 축 (${sh.cx} vs ${axis.foot}) — 축은 하나다`);
  ok(sh.w >= 480, `그림자 폭이 발 스팬(≈400px)보다 넓다 (${sh.w}px)`);
  /* ★ 폭만으로는 부족하다 — 4회차 비평 H 가 «어두운 코어가 180px = 발 스팬의 45% 라 발이 딛는
     자리 100%가 밝은 테 위» 라고 실측했다. 그래디언트의 **어두운 구간 반경**을 직접 재서
     발 스팬(≈396px)을 덮는지 본다. */
  const core = await page.evaluate(() => {
    const s = getComputedStyle(document.getElementById('ldSh')).backgroundImage;
    const m = /rgba\(2, ?3, ?8, ?0?\.55\) (\d+)%/.exec(s);
    const w = parseFloat(getComputedStyle(document.getElementById('ldSh')).width);
    return { pct: m ? +m[1] : null, w };
  });
  ok(core.pct !== null && core.w * core.pct / 100 >= 396,
    `어두운 코어가 발 스팬(396px)을 덮는다 (${core.pct}% × ${Math.round(core.w)} = ${Math.round(core.w * (core.pct || 0) / 100)}px)`);

  console.log('§5 통과성 (부팅 뒤 오버레이가 탭을 안 막는다)');
  const thru = await page.evaluate(() => {
    const el = document.getElementById('loading');
    el.classList.remove('off', 'out');           /* 부팅 직후 «아직 페이드 중» 상태를 되살려 본다 */
    el.classList.add('thru');
    const hit = document.elementFromPoint(540, 2200);
    const r = { pe: getComputedStyle(el).pointerEvents, hit: hit ? (hit.id || hit.className) : null };
    el.classList.add('off');
    return r;
  });
  eq('.thru 의 pointer-events', thru.pe, 'none');
  ok(thru.hit !== 'loading', `탭이 오버레이를 통과한다 (맞은 요소: ${thru.hit})`);

  console.log('§6 진행 표기');
  const prog = await page.evaluate(() => ({
    num: document.getElementById('ldNum').textContent,
    w: document.getElementById('ldBarF').style.width
  }));
  eq('«n/총계» 가 아틀라스+타일셋 수로 끝난다', prog.num, `${K.total}/${K.total}`);
  eq('총계 = ATLAS 종수 + 타일셋 1', K.total, K.atlas + 1);
  eq('진행바 100%', prog.w, '100%');
  ok(!/ldNum">\s*\d/.test(SRC), '총계를 마크업에 하드코딩하지 않았다(ATLAS 에서 파생)');

  console.log('§8 부팅 분리 (오버레이가 떠 있어도 게임은 이미 돈다)');
  const booted = await page.evaluate(() => ({ stage: typeof S !== 'undefined' && S && S.stage, hp: player && player.hp > 0 }));
  ok(booted.stage >= 1, `세이브 로드·스테이지 시작됨 (stage ${booted.stage})`);
  ok(booted.hp, '플레이어가 살아 있다(spawnStage 까지 지났다)');
  ok(/ldFinish\(\(\) => \{/.test(SRC) && !/\$\('loading'\)\.classList\.add\('off'\)/.test(SRC),
    '부팅 콜백이 «즉시 off» 가 아니라 ldFinish(목표좌표) 를 부른다');
  ok(!/new Image\(\);[\s\S]{0,200}A\.img/.test(SRC.slice(SRC.indexOf('function loadAtlases'), SRC.indexOf('function loadAtlases') + 400)),
    '본 스크립트가 아틀라스를 **다시** 받지 않는다(ldReady 로 넘겨받는다)');
  console.log('§10 앵커 산식 (로딩 ldDraw ≡ 게임 drawHeroTo)');
  /* 로딩 화면의 그리기는 본 스크립트를 못 기다려서 ldDraw 로 따로 있다. 두 앵커 산식이 갈라지면
     로딩 화면과 게임 안 캐릭터가 다른 자리에 선다 — 같은 프레임·같은 배율로 둘 다 그려 **픽셀로** 댄다. */
  /* file:// 에서는 캔버스가 tainted 라 getImageData 를 못 쓴다. 대신 **drawImage 인자와
     그때의 변환행렬**을 가로채 비교한다 — 앵커 산식이 갈라지는 것은 결국 이 숫자들이므로
     픽셀 비교보다 오히려 직접적이다. */
  const same = await page.evaluate(() => {
    const mk = () => { const c = document.createElement('canvas'); c.width = 720; c.height = 512; return c; };
    const proto = CanvasRenderingContext2D.prototype;
    const orig = proto.drawImage;
    const log = [];
    proto.drawImage = function () {
      const m = this.getTransform();
      log.push([].slice.call(arguments, 1).map(v => Math.round(v * 1000) / 1000)
        .concat([m.a, m.b, m.c, m.d, m.e, m.f]).join(','));
    };
    try {
      const fr = ATLAS.knight.a.run[2];
      LD.draw(mk(), fr);
      drawHeroTo(mk(), { frame: fr, scale: LD.SC });
    } finally { proto.drawImage = orig; }
    return { n: log.length, a: log[0], b: log[1] };
  });
  eq('두 경로가 각각 한 번씩 그린다', same.n, 2);
  ok(same.a === same.b, '앵커·배율·변환행렬이 완전히 같다', `\n      로딩 ldDraw : ${same.a}\n      게임 drawHeroTo: ${same.b}`);

  await page.close();

  /* ---------------- B. 궤적 ---------------- */
  /* ★ 궤적은 **첫 접속을 흉내 낸 페이지**에서 본다. 전부 캐시된 재방문(로컬 file:// 포함)에서는
     아틀라스가 ~430ms 에 다 와서 등장이 **페이드 안으로 압축된다** — 의도된 동작이라(index.html ldFinish)
     «끝까지 갔나» 를 그 경로에서 물으면 안 된다. knight 만 빨리 주고 나머지를 늦춰 첫 접속을 만든다. */
  const px = await ctx.newPage();
  await px.route('**/*.png', async (r) => {
    if (!/knight\.png$/.test(r.request().url())) await new Promise(z => setTimeout(z, 6000));
    await r.continue();
  });
  /* ★ 7회차 — `waitUntil:'load'` 를 버렸다. load 는 «아틀라스까지 다 온 시점» 이라 그때는 이미 부팅이고,
     부팅은 핸드오프 트윈(§13)을 건다 — 그러면 여기서 재는 것이 등장 궤적이 아니라 **트윈 중간값**이 된다
     (실제로 «CSS 확대 0.94» 로 헛불렸다. 149·161 «틀린 계측은 FAIL 로 위장하고 온다» 의 다섯 번째 표본). */
  await px.goto(URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await px.waitForFunction(() => LD.runAt() > 0 && performance.now() - LD.runAt() > LD.RUN + 200,
    null, { timeout: 20000 });
  console.log('§4 궤적 (easeOutCubic — 감속해서 선다)');
  /* ★ 표본으로 이징을 재려던 2회차 시도는 실패했다 — 로딩 구간에는 rAF 콜백이 프레임 시각보다
     최대 140ms 늦게 실행돼서, 찍은 x 가 «언제의 값인지» 를 표본 쪽에서 못 정한다(오차 322px).
     그래서 **곡선은 순수 함수 `LD.at(t)` 로 직접 재고**, «그 함수가 실제로 화면을 움직이는가» 는
     아래에서 한 번 확인한다. 149·161 «틀린 계측은 FAIL 로 위장하고 온다» 의 네 번째 표본. */
  const curve = await px.evaluate(() => {
    const N = 24, out = [];
    for (let i = 0; i <= N; i++) out.push(LD.at(LD.RUN * i / N));
    return { out, X0: LD.X0, RUN: LD.RUN, CRZ: LD.CRZ };
  });
  eq('t=0 은 시작 오프셋', curve.out[0], curve.X0);
  eq('t=RUN 은 중앙(0)', curve.out[curve.out.length - 1], 0);
  ok(curve.out.every((v, i) => i === 0 || v >= curve.out[i - 1]), '오른쪽으로만 간다(되돌아가지 않는다)');
  const dd = curve.out.slice(1).map((v, i) => v - curve.out[i]);
  /* 등속 구간은 반올림으로 ±1px 흔들리므로 «단조 감소» 가 아니라 «빨라지지 않는다» 로 본다 */
  ok(dd.every((v, i) => i === 0 || v <= dd[i - 1] + 2), `구간을 지나며 빨라지지 않는다 (${dd[0]} → ${dd[dd.length - 1]})`);
  /* ★ «등속으로 오다가 마지막에 선다» 인지 — 2회차의 easeOutCubic 은 앞 21% 시간에 거리의 50% 를 써서
     남은 구간이 «다리는 도는데 몸이 안 나가는 트레드밀» 이 됐다(비평가 C·D 가 각각 «마지막 37% 시간에
     이동의 5.5%», «속도가 250ms 안에 28.6배 붕괴» 로 같은 자리를 짚었다).
     그래서 **등속 구간의 프레임별 이동이 고르고**, 뒤쪽이 죽지 않는 것을 직접 단언한다. */
  const step = curve.out.slice(1).map((v, i) => v - curve.out[i]);
  const cz = Math.floor(24 * curve.CRZ);
  const cs = step.slice(0, cz);
  const spread = Math.max.apply(null, cs) / Math.min.apply(null, cs);
  ok(spread <= 1.08, `등속 구간의 프레임별 이동이 고르다 (최대/최소 ${spread.toFixed(3)} ≤ 1.08)`);
  const tail = curve.out[curve.out.length - 1] - curve.out[Math.floor(24 * curve.CRZ)];
  ok(Math.abs(tail) >= Math.abs(curve.X0) * .12,
    `감속 구간(뒤 ${Math.round((1 - curve.CRZ) * 100)}% 시간)에 이동의 12% 이상이 남아 있다 = 트레드밀 아님 (${Math.abs(tail)}px / ${Math.abs(curve.X0)}px)`);
  /* ★ 이음매에서 속도가 튀지 않는가 — 등속 구간의 거리 비율(LD_CRZD)을 손으로 적으면 여기서 빨개진다 */
  ok(Math.abs(step[cz] / step[cz - 1] - 1) <= .12,
    `등속 → 감속 이음매에서 속도가 이어진다 (${step[cz - 1]} → ${step[cz]}px)`);
  /* «잉크가 완전히 프레임 밖에서 시작하는가» — 1회차 −560 은 잉크 우변이 +100 이라 몸의 39%가
     화면 안에서 켜졌다(비평 A ③). 캔버스 좌변 + 잉크 오프셋으로 실제 우변을 계산해 확인한다. */
  /* ★ 오버레이를 **보이는 상태로 되돌려 놓고** 잰다. 2회차에는 `display:none` 인 채로 `offsetLeft` 를
     읽어 0(실제 180)이 나왔고, 그 틀린 값으로 «잉크 우변 −18» 이 «통과» 했다 —
     실제로는 몸의 89%가 화면 안에서 시작하고 있었다(비평가 C 가 픽셀로 잡았다).
     이제 `getBoundingClientRect()` 로 **화면 좌표**를 직접 쓰므로 CSS 확대가 남아 있어도 잡힌다. */
  const edge = await px.evaluate(() => {
    const el = document.getElementById('loading'), cv = document.getElementById('ldHero'), A = ATLAS.knight;
    const had = el.className;
    el.classList.remove('off', 'out');
    const fr = A.f[A.a.run[0]], f0 = A.f[A.a.idle[0]];
    const c0 = f0[6] / 2 - f0[4] - f0[2] / 2;
    const r = cv.getBoundingClientRect();
    const k = r.width / cv.width;                     /* CSS 확대 배율(1 이어야 정상) */
    const inkL = r.left + (cv.width / 2 + (-fr[6] / 2 + fr[4] + c0) * LD.SC) * k;
    const out = { k, inkL: Math.round(inkL), inkR: Math.round(inkL + fr[2] * LD.SC * k + LD.X0),
                  rest: Math.round(inkL + fr[2] * LD.SC * k) };
    el.className = had;
    return out;
  });
  eq('캔버스에 CSS 확대가 안 걸려 있다(배율 1)', edge.k, 1);
  ok(edge.inkR <= 0, `등장 t=0 에 잉크가 완전히 프레임 밖 (잉크 우변 x=${edge.inkR} ≤ 0 · 정지 자세 우변 ${edge.rest})`);

  /* 배선 — 실제 DOM transform 이 LD.at() 을 따라간다(정지 시점에서 한 번, 값이 안 흔들릴 때) */
  const wired = await px.evaluate(() => {
    const cv = document.getElementById('ldHero');
    const m = /translate\((-?\d+)px/.exec(cv.style.transform || '');
    return { x: m ? +m[1] : null, at1: LD.at(LD.RUN + 999) };
  });
  ok(wired.x === wired.at1, `등장이 끝까지 가면 DOM transform = LD.at(끝) (${wired.x} = ${wired.at1})`);
  await px.close();

  /* ---------------- C. knight 가 깨진 경우 — 무한 로딩이 되면 안 된다 ---------------- */
  console.log('§11 재방문 경로 — 등장이 «잘리지 않고 압축되어» 끝난다');
  /* 전부 캐시된 재방문에서는 부팅 뒤 남는 예산이 300ms 도 안 된다(페이드 150 포함).
     3회차까지는 640ms 등장을 그대로 두어 **몸의 43% 만 들어온 채 화면이 녹았다.**
     이제 ldFinish 가 «위치는 이어서, 길이만» 줄이므로 캐릭터가 중앙에 **도착한 뒤** 사라진다.
     이 절이 빨개지면 그 압축이 사라진 것이다. */
  const warm = [];
  for (let i = 0; i < 3; i++) {
    const w = await ctx.newPage();
    await w.addInitScript(() => {
      window.__x = null;
      const boot = () => {
        const el = document.getElementById('loading');
        if (!el) { requestAnimationFrame(boot); return; }
        new MutationObserver(() => {
          /* 착지는 페이드 «끝» 에 본다 — 3회차부터 등장은 페이드 안에서 마무리된다 */
          if (el.classList.contains('out') && window.__x === null) {
            window.__x = 'pending';
            setTimeout(() => {
              const cv = document.getElementById('ldHero');
              const m = /translate\((-?[\d.]+)px/.exec(cv.style.transform || '');
              /* ★ 6회차 — 표본에 «예정» 을 같이 담는다. 아래 판정문 참고: 굶주림으로 rAF 가 한 번도
                 안 돌면 DOM 은 옛 프레임에 멈춰 있고, 그건 설계가 아니라 러너 상태다. */
              window.__x = { x: m ? +m[1] : null, run: Math.round(LD.run()),
                             el: Math.round(performance.now() - LD.runAt()) };
            }, LD.FADE + 30);
          }
        }).observe(el, { attributes: true, attributeFilter: ['class'] });
      };
      boot();
    });
    await w.goto(URL, { waitUntil: 'load' });
    await w.waitForTimeout(1400);
    /* 관찰기가 `.out` 순간을 놓쳤으면(관찰기 부착보다 전이가 빨랐거나 프레임이 굶었으면)
       그때의 최종 상태로 대신 읽는다 — 등장이 끝났으면 transform 은 어차피 0 이다. */
    warm.push(await w.evaluate(() => {
      const cv = document.getElementById('ldHero');
      const fin = /translate\((-?[\d.]+)px/.exec(cv.style.transform || '');  /* 1.4초 뒤 = 최종 위치 */
      const s = (window.__x && window.__x !== 'pending') ? window.__x : null;
      return Object.assign({ fin: fin ? +fin[1] : null, run: Math.round(LD.run()),
                             handed: LD.handed(),
                             el: Math.round(performance.now() - LD.runAt()) }, s || { late: true });
    }));
    await w.close();
  }
  /* ★ 6회차 — 이 절이 «뜨고 지는 FAIL» 이었다(고치기 전 트리에서도 2회 중 1회 x=−139 로 빨갰다).
     원인은 제품이 아니라 **자**였다: 페이드 시작 직후는 부팅으로 메인 스레드가 굶어 rAF 가 한 번도
     안 도는 실행이 있고, 그러면 DOM transform 은 옛 프레임에 멈춰 있다(그리기 지연). 설계가 지키는 것은
     «압축된 등장이 페이드 «안»에 끝나도록 **예정**되어 있다» 이므로, 판정을 그 예정(=경과 ≥ 압축된 길이)과
     «결국 도착한다»(최종 transform) 둘로 나눈다. 압축이 사라지면 둘 다 빨개진다 —
     예정은 어긋나고(경과 < run), 최종도 0 이 아니다(잘린 채 사라졌으므로). */
  ok(warm.every(r => r && r.el >= r.run),
    `페이드 끝 시점에 압축된 등장이 **예정상 끝나 있다** (경과 ${warm.map(r => r.el).join(', ')}ms ≥ 길이 ${warm.map(r => r.run).join(', ')}ms)`);
  /* ★ 7회차 — «도착했다» 의 증거가 둘이다: 중앙에 서 있거나(fin≈0), **핸드오프 트윈이 걸렸거나**.
     트윈은 «등장이 이미 끝났을 때만» 걸리므로(ldExit), 걸렸다는 사실 자체가 도착의 증거다.
     그 뒤의 transform 은 게임 히어로 자리로 가는 값이라 0 이 아니다. */
  ok(warm.every(r => r && (Math.abs(r.fin) <= 1 || r.handed)),
    `캐릭터가 결국 도착한다 (최종 x = ${warm.map(r => (r ? r.fin : '?')).join(', ')} · 핸드오프 ${warm.map(r => (r && r.handed ? 'Y' : 'n')).join('')})`);
  console.log(`     (참고 — 페이드 끝의 DOM x: ${warm.map(r => (r.x === undefined ? '?' : r.x)).join(', ')} · 그리기 지연은 러너 상태다)`);
  ok(warm.every(r => r && r.run <= K.RUN), `재방문에서는 등장 길이가 줄어든다 (${warm.map(r => (r ? r.run : '?')).join(', ')}ms ≤ ${K.RUN})`);

  console.log('§7 무한 로딩 방지 (knight 아틀라스 깨짐)');
  const p2 = await ctx.newPage();
  await p2.addInitScript(WATCH_T);
  await p2.route('**/knight.png', route => route.abort());
  await p2.goto(URL, { waitUntil: 'load' }).catch(() => {});
  await p2.waitForTimeout(2000);
  const ev2 = await p2.evaluate(() => window.__ev.map(e => ({ k: e.k, t: Math.round(e.t) })));
  const gone2 = (ev2.find(e => e.k === 'gone') || {}).t;
  ok(gone2 !== undefined, 'knight 가 깨져도 로딩이 끝난다', JSON.stringify(ev2));
  ok(gone2 !== undefined && gone2 < 2000, `그 경우에도 2초 안에 (${gone2}ms)`);
  ok(!ev2.some(e => e.k === 'hero'), '캐릭터는 안 켜진다(그릴 게 없다)');
  await p2.close();

  console.log('§13 핸드오프 트윈 (7회차 — 로딩 히어로 → 게임 히어로)');
  /* 6회차 비평 I·J 의 공통 1순위: «640ms 를 들여 세운 히어로가 페이드 130ms 만에 6.00배 작아지고
     발 기준선이 259~263px 위로 순간이동한다». 그래서 페이드 동안 로딩 캐릭터를 게임 캐릭터의
     **크기·발자리로 이어 보낸다.** 여기서는 그 트윈이 (ⓐ 걸렸는가 ⓑ 끝점이 게임 히어로와 맞는가) 를 잰다.
     되돌리면(트윈 제거) ⓐ 가, 끝점을 대충 적으면 ⓑ 가 빨개진다. */
  const hp = await ctx.newPage();
  await hp.goto(URL, { waitUntil: 'load' });
  await hp.waitForFunction(() => document.getElementById('loading').classList.contains('off'), null, { timeout: 20000 }).catch(() => {});
  await hp.waitForTimeout(400);
  const hand = await hp.evaluate(() => {
    const cv = document.getElementById('ldHero'), el = document.getElementById('loading');
    const had = el.className; el.classList.remove('off', 'out');
    const m = /scale\(([\d.]+)\)/.exec(cv.style.transform || '');
    const r = cv.getBoundingClientRect(), k = r.width / cv.width / (m ? +m[1] : 1);
    const vr = document.getElementById('view').getBoundingClientRect();
    const kk = vr.width / document.getElementById('view').width;
    const out = {
      handed: LD.handed(),
      s: m ? +m[1] : null, want: LD.SC ? 2 / LD.SC : null,
      /* 트윈 끝의 «발 축» 화면 좌표 vs 게임 플레이어의 발 화면 좌표 */
      footX: r.left + (cv.width / 2 - LD.FDX) * k * (m ? +m[1] : 1),
      footY: r.bottom,
      /* ⚠ player.x/y 는 **월드** 좌표다 — 화면 좌표 = 월드 + camOx/camOy. 이걸 빼면 Δ가 1,300px 로 벌어진다 */
      gameX: vr.left + (player.x + camOx) * 2 * kk, gameY: vr.top + (player.y + camOy) * 2 * kk,
      to: LD.handTo(),                                  /* 트윈을 걸 때 실제로 쓴 목표(스냅숏) */
      tr: cv.style.transition
    };
    el.className = had; return out;
  });
  await hp.close();
  ok(hand.handed, '부팅 시 핸드오프 트윈이 걸린다(등장이 끝난 경로)');
  ok(hand.s !== null && Math.abs(hand.s - hand.want) < .01,
    `트윈 끝 배율 = 게임 배율 / 로딩 배율 (${hand.s} · 기대 ${hand.want && hand.want.toFixed(4)})`);
  /* ★ 판정을 둘로 나눈다 — 게임 히어로는 **트윈이 걸린 뒤에도 계속 움직인다**(자동 전투). 그래서
     ⓐ «트윈이 자기가 받은 목표에 정확히 갔나» 는 스냅숏(LD.handTo)과 ±2px 로 딱 재고,
     ⓑ «그 목표가 게임 히어로였나» 는 지금 위치와 느슨하게 본다(가로는 아레나 폭만큼 움직일 수 있고,
        세로는 바닥 밴드라 좁다). 좌표계를 틀리면(월드↔화면) ⓑ 가 Δ1,300/2,000px 로 바로 빨개진다 — 실제로 그렇게 잡았다. */
  ok(hand.to && Math.abs(hand.footX - hand.to.x) <= 2 && Math.abs(hand.footY - hand.to.y) <= 2,
    `ⓐ 트윈 끝 발자리 = 받은 목표 (Δx ${hand.to ? Math.round(hand.footX - hand.to.x) : '?'} · Δy ${hand.to ? Math.round(hand.footY - hand.to.y) : '?'} · 허용 ±2px)`);
  ok(hand.to && Math.abs(hand.to.x - hand.gameX) <= 340 && Math.abs(hand.to.y - hand.gameY) <= 80,
    `ⓑ 그 목표가 게임 히어로였다 (Δx ${hand.to ? Math.round(hand.to.x - hand.gameX) : '?'} · Δy ${hand.to ? Math.round(hand.to.y - hand.gameY) : '?'} · 허용 ±340/±80px — 히어로는 그 사이에도 움직인다)`);
  ok(/transform \d+ms/.test(hand.tr || ''), `트윈이 페이드 길이 안에서 돈다 (${hand.tr})`);

  console.log('§9 콘솔');
  eq('콘솔 에러 0', errs.length, 0);
  if (errs.length) console.log('   ', errs.slice(0, 3));

  await browser.close();
  const tot = pass + fail;
  console.log(`\nVERIFY163 ${pass}/${tot} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
