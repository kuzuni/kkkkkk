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
  eq('프레임 한 장의 이동 거리 = 접지발 이동 × 배율', Math.round(K.STEP * 100), Math.round(K.FOOT * K.SC * 100));
  ok(/run\[Math\.floor\(\(Math\.abs\(LD_X0\) - Math\.abs\(x\)\) \/ LD_STEP\)/.test(SRC),
    '★ 달리기 프레임을 **이동 거리**로 뽑는다(시간 기준이면 감속 구간이 트레드밀이 된다)');
  ok(/var d = \(Math\.abs\(LD_X0\) - Math\.abs\(ldAt\(t\)\)\) \/ \(LD_STEP \* 4\)/.test(SRC),
    '아치도 같은 «거리» 자로 재서 딛는 프레임의 arc=0 이 유지된다');
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
  ok(K.AIR > 0 && K.AIR < 1, `접지 비율 상수가 있다 (${K.AIR})`);
  const arcPhase = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 40; i++) {          /* 한 주기(4프레임 = LD_STEP×4 px) 를 거리로 훑는다 */
      const u = i / 40;
      out.push({ u: +u.toFixed(3), grounded: u < LD.AIR,
        arc: u >= LD.AIR ? -Math.round(LD.ARC * Math.sin(Math.PI * (u - LD.AIR) / (1 - LD.AIR))) : 0 });
    }
    return out;
  });
  ok(arcPhase.filter(r => r.grounded).every(r => r.arc === 0),
    `접지 구간(주기의 ${Math.round(K.AIR * 100)}%)에서는 아치가 정확히 0 = 발이 붙어 있다`);
  ok(Math.min.apply(null, arcPhase.map(r => r.arc)) <= -(K.ARC - 1),
    `체공 구간에서 아치가 최대치(${K.ARC}px)까지 뜬다`);
  ok(/u >= LD_AIR/.test(SRC), '아치가 **체공 프레임에서만** 뜬다(접지 3프레임은 0)');
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
  ok(fade !== null && gone !== null && gone > fade, '페이드가 display:none 보다 먼저 시작한다');

  console.log('§12 그림자 정렬 (발 스팬 중심 ≠ 캔버스 중심)');
  /* `drawHeroTo` 의 c0 는 «칼·망토까지 포함한 잉크» 중심을 맞춘다 — 발 스팬 중심은 그보다 왼쪽이다.
     3회차 비평 E·F 가 독립적으로 «그림자가 55~56px 오른쪽으로 밀려 왼발이 그림자 밖» 을 짚었다.
     CSS 는 JS 상수를 못 읽으므로 margin-left 에 그 편심을 넣어 두고, 여기서 **다시 잰다.** */
  const sh = await page.evaluate(() => {
    /* ★ `getBoundingClientRect()` 로 재면 안 된다 — ldTick 이 그림자에 `translateX` 를 걸어
       캐릭터를 따라다니게 하므로, 등장이 아직 안 끝난 순간에 재면 그 이동분이 섞인다
       (실제로 484 / 452 로 실행마다 다르게 나왔다). **레이아웃 위치**(offsetLeft)로 잰다. */
    const el = document.getElementById('loading'), s = document.getElementById('ldSh');
    const had = el.className; el.classList.remove('off', 'out');
    const out = { cx: Math.round(s.offsetLeft + s.offsetWidth / 2), w: s.offsetWidth };
    el.className = had; return out;
  });
  ok(Math.abs(sh.cx - 540 + 56) <= 4, `그림자 중심이 발 스팬 중심(프레임 중앙 −56px = 484)에 있다 (실측 ${sh.cx})`);
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
  ok(/ldFinish\(\);/.test(SRC) && !/\$\('loading'\)\.classList\.add\('off'\)/.test(SRC),
    '부팅 콜백이 «즉시 off» 가 아니라 ldFinish() 를 부른다');
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
    if (!/knight\.png$/.test(r.request().url())) await new Promise(z => setTimeout(z, 2400));
    await r.continue();
  });
  await px.goto(URL, { waitUntil: 'load' }).catch(() => {});
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
              const m = /translate\((-?\d+)px/.exec(cv.style.transform || '');
              window.__x = { x: m ? +m[1] : null, run: Math.round(LD.run()) };
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
    warm.push(await w.evaluate(() => (window.__x && window.__x !== 'pending' ? window.__x : null) || (() => {
      const cv = document.getElementById('ldHero');
      const m = /translate\((-?\d+)px/.exec(cv.style.transform || '');
      return { x: m ? +m[1] : null, run: Math.round(LD.run()), late: true };
    })()));
    await w.close();
  }
  const bad = warm.filter(r => !r || r.x === null || Math.abs(r.x) > Math.abs(K.X0) * .15);
  ok(bad.length === 0,
    `페이드가 끝날 때 캐릭터가 중앙에 도착해 있다 (x = ${warm.map(r => (r ? r.x : '?')).join(', ')} · 허용 ±${Math.round(Math.abs(K.X0) * .15)}px)`);
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

  console.log('§9 콘솔');
  eq('콘솔 에러 0', errs.length, 0);
  if (errs.length) console.log('   ', errs.slice(0, 3));

  await browser.close();
  const tot = pass + fail;
  console.log(`\nVERIFY163 ${pass}/${tot} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail === 0 ? 0 : 1);
})();
