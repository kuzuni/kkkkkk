/* 작업 353 재현 프로브 — «`verify96` [6] 03 바 좌/우가 간헐적으로 빨갛다»
 *
 *   node tools/probe353.js                 (기본 8회 · 부하 4)
 *   node tools/probe353.js --runs 16 --load 6
 *
 * 등재문의 주장(sess-1700-10797 워커 D):
 *   «빨간 두 항의 값이 늘 «좌 X · 우 (X−16)» 로 한 배율을 같이 먹은 모양이다(157/141 = scale .985).
 *    60·122 쥬시의 페이지 입장 연출(`jzPgIn`)이고 291 정착 장치가 있는데도 샌다.»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **왜 291 이 이 자리를 못 막는지 눈으로 보는** 자리다(338 선례).
 * 찍는 것:
 *   ① 291 정착 훅이 이 자리에서 **한 번이라도 도는가** — `page.settle291` 호출 계수기
 *   ② 위상 스윕 — openDungeon() 뒤 n ms 에 재면 무슨 값이 나오는가 (**부하 없이 결정적**)
 *   ③ 그 값에서 역산한 배율 s = (540 − 좌) / (540 − 151) 이 `jzPgIn` 0% 의 .985 인가
 *   ④ 현행 모양의 실측 분포(부하) — 등재문의 «8회 중 1회» 재현
 *   ⑤ 처방(재기 직전 `settle291()`) 을 같은 부하에서 — 그리고 «정착이 실제로 기다렸는가»(n≥1)
 *
 * ⚠ 되돌림 팔을 따로 두지 않는다 — `PW_SETTLE=0` 이면 `settle291()` 은 즉시 0 을 돌려주므로
 *   **되돌림 = 현행 모양 그대로**다(④ 가 그 팔이다). 게이트째 되돌리는 시험은
 *   `PW_SETTLE=0 node tools/verify96.js` 로 따로 돌린다(review 353 §4).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
/* 부하 자식 프로세스 — 부모보다 먼저 걸러야 playwright 를 헛로드하지 않는다 */
if (process.argv.includes('--burn')) { for (;;) { Math.sqrt(Math.random()); } }

const path = require('path');
/* 291 훅은 entry 가 `verify*.js` 일 때만 자동으로 걸린다(`settle291.enabled()`).
   여기는 프로브라 그대로면 «훅이 원래 안 걸리는 상태» 를 재게 된다 — 게이트와 같은 조건으로 맞춘다. */
if (!process.env.PW_SETTLE) process.env.PW_SETTLE = '1';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const RUNS = arg('--runs', 8);
const LOAD = arg('--load', 4);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 게이트가 재는 것과 **똑같은** 두 값. 좌 151 / 우 135 가 정답(Δ≤1). */
const MEASURE = `() => { const F = document.getElementById('app').getBoundingClientRect();
  const b  = document.getElementById('dunSub').getBoundingClientRect();
  const A = (document.getAnimations ? document.getAnimations() : [])
    .filter(a => /^jz(Pg|Sheet)/.test(a.animationName || ''))
    .map(a => (a.animationName || '') + ':' + a.playState + '@' + Math.round(a.currentTime || 0));
  return { l: Math.round(b.x - F.x), r: Math.round(F.right - b.right), w: +b.width.toFixed(2), anim: A }; }`;

/* 배율 역산 — 540 을 중심으로 한 균일 축소면 좌변이 540 − (540−151)·s 로 밀린다. */
const solveS = (l) => (540 - l) / (540 - 151);
const red = (m) => Math.abs(m.l - 151) > 1 || Math.abs(m.r - 135) > 1;

/* CPU 를 먹는 배경 부하 — 러너가 한가하면 병이 안 뜬다(291 머리말과 같은 방식) */
function spawnLoad(n) {
  const { fork } = require('child_process');
  const kids = [];
  for (let i = 0; i < n; i++) kids.push(fork(__filename, ['--burn'], { stdio: 'ignore' }));
  return () => kids.forEach((k) => { try { k.kill('SIGKILL'); } catch (_) {} });
}

(async () => {
  const browser = await launch(chromium);
  const mk = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(900);
    return { ctx, page };
  };

  /* 현행 [6] 과 **똑같은** 모양 — 대기가 evaluate 안에 있다 */
  const shapeNow = (page) => page.evaluate((s) => new Promise((res) => {
    goTab('hero'); openDungeon(); setTimeout(() => res(eval(s)()), 700);
  }), MEASURE).catch((e) => ({ __err: String(e).split('\n')[0].slice(0, 140) }));

  /* 처방 후의 모양 — 재기 직전에 291 본체를 페이지 안에서 부른다.
     `n` = 정착이 실제로 기다린 연출 개수. n 이 늘 0 이면 팔이 **공허**하다(기다릴 게 없었다는 뜻)
     — 그래서 아래에서 «적어도 한 번은 n≥1» 을 단언한다. */
  const shapeFix = (page) => page.evaluate((s) => new Promise((res) => {
    goTab('hero'); openDungeon();
    setTimeout(() => Promise.resolve(window.settle291 ? window.settle291() : 0)
      .then((n) => res(Object.assign({ n }, eval(s)()))), 700);
  }), MEASURE).catch((e) => ({ __err: String(e).split('\n')[0].slice(0, 140) }));

  /* ── ① 291 훅이 이 자리에서 도는가 ─────────────────────────────── */
  blk('① 291 정착 훅이 [6] 자리에서 도는가');
  {
    const { ctx, page } = await mk();
    let beats = 0;
    const orig = page.settle291;
    page.settle291 = async () => { beats++; return orig ? orig() : 0; };
    await shapeNow(page);
    ok(beats === 0, '현행 모양(evaluate 안 setTimeout)에서 훅 호출 ' + beats + '회'
      + (beats === 0 ? ' — 291 이 이 자리를 **한 번도 안 지난다**' : ''));
    await page.waitForTimeout(700);
    ok(beats >= 1, '대기를 페이지 밖(`page.waitForTimeout`)으로 두면 훅 호출 ' + beats + '회');
    ok(await page.evaluate(() => typeof window.settle291 === 'function'),
      '353 — 페이지 안에 `settle291()` 본체가 심어져 있다');
    console.log('  · 뿌리: `settle291.arm()` 은 `page.waitForTimeout` 만 감싼다.'
      + ' 게이트가 페이지 **안에서** 기다리면 훅이 그 대기를 볼 수 없다.');
    await ctx.close();
  }

  /* ── ② 위상 스윕 — 부하 없이 결정적으로 ────────────────────────── */
  blk('② 위상 스윕 — openDungeon() 뒤 n ms 에 재면 (부하 없음)');
  let zero = null;
  {
    const { ctx, page } = await mk();
    for (const d of [0, 40, 60, 90, 120, 400]) {
      const m = await page.evaluate(([s, d]) => new Promise((res) => {
        goTab('hero'); openDungeon();
        const go = () => res(eval(s)());
        d === 0 ? go() : setTimeout(go, d);
      }), [MEASURE, d]).catch((e) => ({ __err: String(e).split('\n')[0].slice(0, 140) }));
      console.log('  · ' + String(d).padStart(3) + 'ms  좌 ' + m.l + ' 우 ' + m.r + ' 폭 ' + m.w
        + '  ' + JSON.stringify(m.anim || []));
      if (d === 60) zero = m;
      await page.evaluate(() => goTab('battle'));
      await page.waitForTimeout(400);
    }
    await ctx.close();
  }
  if (!zero || zero.__err) { console.log('  ❌ 스윕 실패'); fail++; }
  else {
    ok(red(zero), '`jzPgIn` 0% 프레임에서 재면 게이트가 빨개진다 — 좌 ' + zero.l + ' 우 ' + zero.r);
    ok(Math.abs(zero.l - zero.r - 16) <= 1,
      '등재문 서명 «좌 X · 우 (X−16)» — 실측 Δ ' + (zero.l - zero.r));

    /* ── ③ 역산 배율 ─────────────────────────────────────────────── */
    blk('③ 역산 — 한 배율을 같이 먹은 모양인가');
    const s = solveS(zero.l);
    ok(Math.abs(s - 0.985) <= 0.003, '역산 배율 s = ' + s.toFixed(4) + ' = `jzPgIn` 0% 의 .985');
    ok(Math.abs(zero.w - 794 * 0.985) <= 1.0,
      '폭도 같은 배율 — ' + zero.w + ' ≈ 794 × .985 = ' + (794 * 0.985).toFixed(2));
  }

  /* ── ④⑤ 부하에서의 분포 ────────────────────────────────────────── */
  const tally = async (shape) => {
    const out = [];
    for (let i = 0; i < RUNS; i++) {
      const { ctx, page } = await mk();
      out.push(await shape(page));
      await ctx.close();
    }
    const bad = out.filter((m) => !m.__err && red(m));
    const errs = out.filter((m) => m.__err);
    console.log('  · 값 ' + out.map((m) => m.__err ? 'ERR' : m.l + '/' + m.r).join(' '));
    console.log('  · 빨강 ' + bad.length + '/' + RUNS + (errs.length ? ' (예외 ' + errs.length + ')' : '')
      + (bad.length ? ' · 역산 배율 ' + bad.map((m) => solveS(m.l).toFixed(3)).join(' ') : ''));
    if (out.some((m) => m.n !== undefined)) {
      console.log('  · 정착이 기다린 연출 수 n = ' + out.map((m) => m.n === undefined ? '-' : m.n).join(' '));
    }
    return { bad: bad.length, waited: out.filter((m) => (m.n | 0) > 0).length };
  };
  const stop = spawnLoad(LOAD);
  blk('④ 현행 모양 = 되돌림 팔 — 부하 ' + LOAD + ' 아래 ' + RUNS + '회');
  const now = await tally(shapeNow);
  blk('⑤ 처방(재기 직전 settle291()) — 같은 부하 ' + RUNS + '회');
  const fix = await tally(shapeFix);
  stop();

  blk('요약');
  console.log('  현행 빨강 ' + now.bad + '/' + RUNS + ' · 처방 빨강 ' + fix.bad + '/' + RUNS);
  ok(fix.bad === 0, '처방 쪽은 같은 부하에서 빨강 0');
  ok(fix.waited > 0, '정착이 **실제로 기다린** 실행이 ' + fix.waited + '/' + RUNS
    + ' — 0 이면 팔이 공허하다(기다릴 연출이 없었다는 뜻)');
  /* ⚠ 부하 재현은 확률이라 «현행이 반드시 빨갛다» 를 단언하지 않는다 —
     현행이 빨갛다는 결정적 증거는 위 ② 위상 스윕(부하 없이 항상 157/141)이다. */
  console.log('  · 현행이 0 이어도 실패가 아니다(부하 재현은 확률). 결정적 증거는 ② 스윕이다.');

  await browser.close();
  console.log('\nPROBE353 ' + (fail ? 'FAIL — ' : 'PASS — ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
