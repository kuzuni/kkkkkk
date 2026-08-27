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

const GATE_MS = 800;   /* 저장소 게이트들의 «goto 후 대기» 기준선 */

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

const WATCH_X = () => {                          /* 궤적 전용 — 시각은 안 따진다 */
  window.__tr = [];
  /* ★ 이 추적 rAF 는 ldTick 보다 **먼저** 등록돼 있어서, 한 프레임 안에서 ldTick 이 갱신하기
     «전» 값을 읽는다. 즉 지금 읽는 x 는 **직전 프레임**의 것이다. 그래서 시각도 직전 프레임의
     타임스탬프(prev)로 찍는다 — 이 한 줄이 없으면 등장 초반(16ms 에 90px)에서 예측과 109px 씩
     벌어져 «이징이 틀렸다» 로 오독된다(1차 실측). */
  let prev = 0;
  const trace = (ts) => {
    const cv = document.getElementById('ldHero');
    if (cv && cv.style.transform && prev) {
      const m = /(-?\d+)/.exec(cv.style.transform);
      window.__tr.push({ t: prev, x: m ? +m[1] : 0 });
    }
    prev = ts;
    if (ts < 4000) requestAnimationFrame(trace);
  };
  requestAnimationFrame(trace);
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
      pix: cs && cs.imageRendering,
      inside: !!(cv && q('loading').contains(cv)),
      txt: (q('ldTx') || {}).textContent
    };
  });
  eq('필수 요소 9개', dom.has.length, 9);
  ok(dom.inside, '캐릭터 캔버스가 #loading 안에 있다');
  eq('캔버스 backing width', dom.cw, 480);
  eq('캔버스 backing height', dom.ch, 320);
  eq('image-rendering', dom.pix, 'pixelated');
  ok(/스프라이트 불러오는 중/.test(dom.txt || ''), '문구 유지(«스프라이트 불러오는 중...»)', dom.txt);

  console.log('§2 상수 정합');
  const K = await page.evaluate(() => ({
    MIN: LD_MIN, RUN: LD_RUN, GRACE: LD_GRACE, FADE: LD_FADE, X0: LD_X0, SC: LD_SC,
    RUNMS: LD_RUNMS, IDMS: LD_IDMS,
    trans: Math.round(parseFloat(getComputedStyle(document.getElementById('loading')).transitionDuration) * 1000),
    atlas: Object.keys(ATLAS).length
  }));
  eq('JS 페이드(LD_FADE) = CSS transition-duration', K.trans, K.FADE);
  ok(K.MIN + K.FADE < GATE_MS, `최소 체류 + 페이드 < ${GATE_MS}ms (${K.MIN}+${K.FADE}=${K.MIN + K.FADE})`);
  ok(K.RUN >= 200 && K.RUN <= 600, `등장 길이 200~600ms (${K.RUN})`);
  ok(K.X0 <= -400, `등장 시작이 프레임 밖 (${K.X0}px)`);
  eq('정수 배율(픽셀아트)', K.SC, Math.round(K.SC));
  ok(K.IDMS === 125, `대기 프레임 간격 = 전투 idle 8fps (${K.IDMS}ms)`);
  ok(/const LD_MIN\b/.test(SRC) && /const LD_RUN\b/.test(SRC), '상수가 index.html 에 이름으로 있다');

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
  ok(fade !== null && fade + K.FADE < GATE_MS,
    `${GATE_MS}ms 전에 **안 보이게** 된다 (페이드 시작 ${fade} + ${K.FADE} = ${fade + K.FADE}ms)`);
  ok(gone !== null && gone < 1500, `display:none 도 결국 붙는다 (실측 ${gone}ms)`);
  /* «부팅 → 사라짐» 이 아니라 «페이드 시작 → 사라짐» 을 잰다. 그 사이가 페이드 길이다.
     부팅~페이드 사이는 LD_MIN·LD_GRACE 가 정하는 «의도된 체류» 라 여기서 볼 것이 아니다. */
  ok(fade !== null && gone !== null && gone - fade <= K.FADE + 140,
    `페이드 꼬리가 LD_FADE+여유 안 (${gone - fade}ms ≤ ${K.FADE + 140})`);
  ok(hero !== null, 'knight 도착 시 캐릭터가 켜진다(.on)');
  ok(fade !== null && gone !== null && gone > fade, '페이드가 display:none 보다 먼저 시작한다');

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
  eq('«n/총계» 가 아틀라스+타일셋 수로 끝난다', prog.num, `${K.atlas + 1}/${K.atlas + 1}`);
  eq('진행바 100%', prog.w, '100%');
  ok(!/ldNum">\s*\d/.test(SRC), '총계를 마크업에 하드코딩하지 않았다(ATLAS 에서 파생)');

  console.log('§8 부팅 분리 (오버레이가 떠 있어도 게임은 이미 돈다)');
  const booted = await page.evaluate(() => ({ stage: typeof S !== 'undefined' && S && S.stage, hp: player && player.hp > 0 }));
  ok(booted.stage >= 1, `세이브 로드·스테이지 시작됨 (stage ${booted.stage})`);
  ok(booted.hp, '플레이어가 살아 있다(spawnStage 까지 지났다)');
  ok(/ldFinish\(\);/.test(SRC) && !/\$\('loading'\)\.classList\.add\('off'\)/.test(SRC),
    '부팅 콜백이 «즉시 off» 가 아니라 ldFinish() 를 부른다');
  await page.close();

  /* ---------------- B. 궤적 — 시각을 안 따지는 별도 페이지에서 rAF 로 잰다 ---------------- */
  console.log('§4 궤적 (easeOutCubic — 감속해서 선다)');
  const px = await ctx.newPage();
  await px.addInitScript(WATCH_X);
  await px.goto(URL, { waitUntil: 'load' });
  await px.waitForTimeout(1600);
  const trj = await px.evaluate(() => ({
    tr: window.__tr.map(r => ({ t: r.t, x: r.x })),
    runAt: ldRunAt, RUN: LD_RUN, X0: LD_X0
  }));
  const xs = trj.tr.map(r => r.x);
  ok(xs.length >= 3, `이동 표본 3장 이상 (${xs.length})`, JSON.stringify(xs.slice(0, 8)));
  ok(xs.length > 0 && xs[xs.length - 1] === 0, `마지막이 중앙 정지 (${xs[xs.length - 1]}px)`);
  ok(xs.every((v, i) => i === 0 || v >= xs[i - 1]), '오른쪽으로만 간다(되돌아가지 않는다)');
  /* ★ «증분이 줄어드는가» 로 이징을 보면 표본이 성길 때 헛불린다(로딩 중 rAF 가 굶는다).
     대신 **각 표본의 시각에 대한 easeOutCubic 예측치**와 대조한다 — 표본 간격과 무관하게
     이징 구현 자체를 잰다. 등속으로 바꾸면 여기서 수십 px 씩 벌어져 빨개진다. */
  /* ★ 표본은 **한 프레임 늦다.** 추적 rAF 가 ldTick 보다 먼저 등록돼 있어, 같은 프레임에서
     ldTick 이 갱신하기 «전» 값을 읽는다. 등장 초반은 16ms 에 90px 가 움직이므로 그대로 대조하면
     최대 109px 오차가 나 «이징이 틀렸다» 로 오독된다(1차 실측). 그래서 **±1프레임 창(0~26ms)
     안에서 가장 잘 맞는 시각**과 대조한다 — 창을 준 만큼 등속·가속과의 구분력이 줄지 않도록
     바로 아래에서 같은 창으로 linear 도 맞춰 보고, 그쪽이 크게 벌어지는 것까지 확인한다.
     (161 교훈 ③·149 «애니메이션이 걸린 것을 재려면 무엇을 재는지부터 고정하라») */
  const fit = (f) => trj.tr.map(r => {
    let best = Infinity;                          /* ldTick 은 프레임 타임스탬프보다 몇 ms 뒤에 실행된다 */
    for (let dt = 0; dt <= 20; dt += 2) best = Math.min(best, Math.abs(r.x - f(r.t + dt)));
    return best;
  });
  const ease = (t) => { const p = Math.min(1, Math.max(0, (t - trj.runAt) / trj.RUN)); return Math.round(trj.X0 * Math.pow(1 - p, 3)); };
  const linf = (t) => { const p = Math.min(1, Math.max(0, (t - trj.runAt) / trj.RUN)); return Math.round(trj.X0 * (1 - p)); };
  const worst = Math.max.apply(null, fit(ease));
  const worstL = Math.max.apply(null, fit(linf));
  ok(worst <= 10, `모든 표본이 easeOutCubic 예측과 ±10px 안 (최대 오차 ${worst}px, 표본 ${trj.tr.length}장)`);
  ok(worstL > 40, `같은 창으로 linear 를 맞추면 크게 벌어진다 = 등속이 아니다 (최대 오차 ${worstL}px)`);
  await px.close();

  /* ---------------- C. knight 가 깨진 경우 — 무한 로딩이 되면 안 된다 ---------------- */
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
