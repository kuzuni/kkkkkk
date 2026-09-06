#!/usr/bin/env node
/* 779 재현 — `probe766` [2] 가 4회 중 1회 빨간 뿌리 (338 규칙: 처방 전에 제품에게 직접 묻는다)
 *
 *   node tools/probe779.js
 *
 * 등재문이 남긴 것은 **관측 다섯**이었다 — `en + q` 가 `25+25 · 28+22 · 30+19 · 31+19 · 28+22`
 * 로, 셋째가 **49** 라 `probe766` [2] 의 전칭 `en + q === 50` 이 깨졌다. 등재문의 가설은
 * «부팅 파도가 나오는 도중에 한 마리가 이미 죽거나 판을 벗어난다» 였고, 이 자가 그것을
 * **못박거나 기각한다**.
 *
 * ⚑ **재현해야 할 것은 «빨강이 났다» 가 아니다.** 한 판의 빨강 확률이 1/4 이라
 *   «이번 N회에 하나는 깨진다» 로 물으면 **그 물음 자신이 플레이키다**(766 이 [1] 을 다시 적으며
 *   남긴 교훈 · 759·775 도 같은 자리). 재현해야 하는 것은 뿌리 쪽의 **결정적인 사실**이다:
 *     ⓐ 옛 단언이 실제로 재던 것은 «부팅 파도가 반쯤 나왔는가» 가 아니라 **«첫 킬이 아직 안 났는가»** 다.
 *     ⓑ 그래서 시계를 조금만 늘리면 그 단언은 **전칭으로 거짓**이 된다(확률이 아니라 확정이다).
 *     ⓒ 킬을 셈에 넣은 항등식 `en + q + killed === ENEMY_COUNT` 는 **전 시점·전 표본**에서 참이다.
 *   ⇒ 500ms 는 첫 킬 분포의 **어깨 위**에 놓인 시점이고, 그래서 실행마다 동전이 된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚑⚑ 946 **7회차**(부하 수리) — **이 자가 자기 결론과 어긋나 있었다**(6회차 인계 3번 그대로).
 *   위 ⓐⓑ 가 «벽시계와 판의 위상은 서로 안 묶인다» 를 밝혀 놓고, 정작 [3]·[6] 은 그 벽시계의
 *   **절대 눈금**(«1500·3000ms 면 킬이 났다» · «500ms 면 큐가 남았다»)을 단언하고 있었다.
 *   `par 7` 21 실행 실측: **[3] 19회 · [6] 7회 빨강**(초록 실행 2/21). 한가하면 8/8 이다.
 *   부하가 세면 같은 1500ms 가 프레임을 몇 장 못 주어 킬이 안 나고([3] 빨강), 반대로 부팅이
 *   느린 판에서는 같은 500ms 가 파도를 다 뱉고 킬까지 지나가 버린다([6] 빨강) — **값이 아니라
 *   창의 위상이 옮겨 간 것**이고, 그것이 이 자의 결론 자체다.
 *   ⇒ 두 항을 벽시계에서 떼어 **페이지 안에서 «위상 그 자체»를 잡아** 다시 적었다(946 2회차 처방):
 *     · `phaseRun()` 이 rAF 마다 판을 보고 **부팅 위상**(`q>0 && en>0 && killed===0`)과
 *       **첫 킬 프레임**(`killed>=1`)을 각각 **첫 프레임 하나**로 집어 온다. 왕복도 대기도 없다.
 *     · [3] 은 «두 위상이 **한 파도 안에서** 다 일어나고 옛 전칭이 그 사이에 뒤집힌다» 로 —
 *       확률이 아니라 한 실행 안의 사실이다(부하와 무관).
 *     · [6] 은 «그 부팅 위상이 **실재하고 매 실행 잡힌다**» 로(뜻 보존 — 333, 자리를 안 비운다).
 *     · 벽시계 스냅숏 표는 **관측으로만** 남긴다(946 5회차 [6-c] 선례) — 항등식 [4]·[5] 는
 *       시계를 가로질러 전 표본에서 참이라 부하와 무관하고, 21/21 에서 한 번도 안 흔들렸다.
 *     · **[0-b] 무효 검사 + 코드 3**(939 규약 · 946 3~6회차와 같은 셈법) · **`--dead` 되돌림 시험**.
 *
 * 출력은 전부 수치다. 처방·수정은 하지 않는다.
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
  return !!b;                                   /* 946 7회차 — `--dead` 가 [3]·[6] 의 결과를 집어 간다 */
};
const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };

/* ── 관측 한 번 — `probe766` 의 `pre` 스냅숏과 **같은 산수**다 ─────────────────
   (같은 시점·같은 네 값. 자를 베껴 적지 않기 위해 [0] 이 그 파일의 판정문을 직접 읽는다.) */
async function snap(browser, waitMs) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function'
    && typeof makeEnemy === 'function');
  await page.waitForTimeout(waitMs);
  const r = await page.evaluate(() => {
    S.stage = 20; S.eqSkill = ['slash']; markDirty();
    return { en: enemies.length, q: spawnQ.length,
             killed: (typeof killed !== 'undefined' ? killed : -1),
             pop: (typeof ENEMY_COUNT !== 'undefined' ? ENEMY_COUNT : -1) };
  });
  await ctx.close();
  return r;
}

/* ── [R] 음성항 — «죽이지 않고» 한 마리를 지운다 (946 7회차: 여기도 벽시계를 걷었다) ─────
   `killEnemy` 를 안 지나므로 `killed` 가 안 오르고, 그래서 새 항등식이 곧바로 깨져야 한다.
   ⚑ 옛 [R] 은 이 «지움» 을 **`waitForTimeout(500)` 뒤**에 했다. 부하가 세면 그 시점에 아직
   아무도 안 나와 있어(`enemies` 가 빈 배열) `pop()` 이 **아무것도 안 지운다** — 그러면 합이
   50 그대로라 **음성항이 스스로 빨개진다**(7회차 재실측 21 실행 중 1회: `50,49,49`).
   음성항이 부하로 흔들리면 «무르게 푼 것이 아님» 을 못박던 자리가 도로 동전이 된다.
   ⇒ 지우는 시점도 벽시계가 아니라 **부팅 위상**([6] 과 같은 술어)이 고르고, «정말로 한 마리가
   빠졌는가» 를 **전제**로 같이 들고 나온다(946 5회차 «[전제] 잰 것이 있다» 와 같은 꼴). */
async function dropAtPhase(browser, capMs) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  /* 위상 포착과 같은 이유로 **항해 전에** 심는다 — 지우는 시점이 부하의 함수면 음성항이 도로 동전이다 */
  await page.addInitScript(({ capMs }) => {
    const st = { did: false, bail: false, done: false, en: -1, q: -1, killed: -1, pop: -1 };
    window.__p779d = st;
    const t0 = performance.now();
    const tick = () => {
      if (st.done) return;
      let en = -1, q = -1, k = -1, pop = -1, ready = false;
      try { en = enemies.length; q = spawnQ.length; k = killed; pop = ENEMY_COUNT; ready = true; }
      catch (e) { ready = false; }                       /* 아직 선언 전(TDZ) — 이 프레임은 건너뛴다 */
      if (ready && en > 0 && q > 0 && k === 0) {
        S.stage = 20; S.eqSkill = ['slash']; markDirty();
        const before = enemies.length;
        enemies.pop();                                   /* «죽이지 않고» 한 마리 */
        st.did = enemies.length === before - 1;
        st.en = enemies.length; st.q = spawnQ.length; st.killed = killed; st.pop = pop;
        st.done = true; return;
      }
      if (performance.now() - t0 > capMs) {
        st.en = en; st.q = q; st.killed = k; st.pop = pop; st.bail = true; st.done = true; return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { capMs });
  await page.goto(URL);
  const r = await page.evaluate(({ capMs }) => new Promise(res => {
    const st = window.__p779d;
    const t0 = performance.now();
    const poll = () => {
      if (st.done) return res(st);
      if (performance.now() - t0 > capMs + 2000) { st.bail = true; return res(st); }
      setTimeout(poll, 25);
    };
    poll();
  }), { capMs });
  await ctx.close();
  return r;
}

/* ── 위상 관측 한 번 — **페이지 안에서** 두 위상을 프레임 단위로 집어 온다 (946 7회차) ────
   옛 `firstKill()` 은 20ms 폴링으로 «첫 킬 시각» 하나만 들고 나왔고, [3]·[6] 은 그 시각과
   무관한 **다른 벽시계**(500·1500·3000ms)에 절대 눈금을 박고 있었다. 이 자는 왕복을 안 쓰고
   rAF 마다 판을 보며 **위상 그 자체**를 첫 프레임으로 집는다 — 부하가 프레임을 굶겨도
   «몇 번째 프레임에서 잡혔나» 가 늦어질 뿐 **무엇을 잡았나는 안 변한다**(946 2회차 처방).

     boot  = 부팅 위상  — `q > 0 && en > 0 && killed === 0` («반쯤 나온 상태» 그 자체)
     kill1 = 첫 킬 프레임 — `killed >= 1`

   ⚠ 손 문턱은 **하나도 안 쓴다**. `capMs` 는 판정 문턱이 아니라 **빠져나오는 문**이고,
   빠져나왔을 때 «못 잰 것인가 · 제품의 사실인가» 는 벽시계가 아니라 **제품의 진행도**로 가른다
   (아래 [0-b] — 파도가 아직 다 안 나왔으면 `q > 0` 이므로 그 실행은 굶은 것이다).
   `dead` 는 되돌림 시험 전용 — 위상 «기다림» 을 걷어 첫 프레임을 두 위상으로 삼는다(맨 아래 [D]). */
async function phaseRun(browser, capMs, dead) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  /* ⚑⚑ 946 7회차 — **재는 자를 항해 «전» 에 심는다.** `goto` → `waitForFunction` → `evaluate`
     사이의 벽시계는 부하에 늘어나서, 자가 붙었을 때 이미 창이 지나 있는 판이 나온다
     (첫 판 21 실행에서 **4실행**이 그 이유로 코드 3 이었다 — 빨강은 아니지만 «못 재는 자» 다).
     `addInitScript` 는 페이지의 **첫 스크립트보다 먼저** 돌므로 rAF 사슬이 부팅 첫 프레임부터
     붙는다 ⇒ 붙는 시점이 부하의 함수가 아니게 된다.
     ⚠ 제품의 `enemies`·`spawnQ`·`killed` 는 최상위 `let`/`const` 라 `window` 에 안 달린다 —
     선언 전에는 `typeof` 조차 TDZ 로 던지므로 매 프레임 try/catch 로 건너뛴다. */
  await page.addInitScript(({ capMs, dead }) => {
    const st = { boot: null, kill1: null, first: null, last: null, frames: 0, fkMs: -1, bail: false, done: false };
    window.__p779 = st;
    const t0 = performance.now();
    const shot = () => ({ en: enemies.length, q: spawnQ.length, killed: killed, pop: ENEMY_COUNT });
    const tick = () => {
      if (st.done) return;
      let s = null;
      try { s = shot(); } catch (e) { s = null; }      /* 아직 선언 전(TDZ) — 이 프레임은 건너뛴다 */
      if (s) {
        st.frames++;
        st.last = s;
        if (st.frames === 1) st.first = s;   /* 자가 «창이 지난 뒤» 붙었는지 가르는 값([0-b]) */
        const now = Math.round(performance.now() - t0);
        if (s.killed >= 1 && st.fkMs < 0) st.fkMs = now;
        /* 위상 포착 — 벽시계가 아니라 판의 상태가 고른다.
           ⚠ `dead` 는 두 위상을 **맞바꾼다**(부팅 위상 ← 첫 킬 프레임 · 첫 킬 위상 ← 첫 프레임).
           그러면 [3] 의 뒤집힘(참 → 거짓)이 양쪽에서 다 깨지고 [6] 의 «killed 0» 도 거짓이 되어
           **둘 다 결정적으로 빨갛다** — 한 프레임의 값이라 동전이 아니다(맨 아래 [D]).
           ⚠ 되돌림을 «둘 다 첫 프레임» 으로 적으면 안 된다 — 빠른 기계에서는 첫 프레임이 이미
           부팅 위상이라 [6] 이 **초록으로 통과해 버린다**(7회차에 실제로 그렇게 적었다가
           자기 되돌림 실행에 잡혔다 — 되돌림도 «되는지» 를 봐야 한다). */
        if (!st.boot && (dead ? s.killed >= 1 : (s.q > 0 && s.en > 0 && s.killed === 0)))
          st.boot = Object.assign({ t: now, fr: st.frames }, s);
        if (!st.kill1 && (dead ? st.frames === 1 : s.killed >= 1))
          st.kill1 = Object.assign({ t: now, fr: st.frames }, s);
        /* ⚠ `--dead` 에서도 [1]·[2] 가 재던 «첫 킬 시각» 은 진짜로 기다린다
           (되돌림 사본이 다른 항까지 못 재게 만들면 그 사본은 널이 아니라 쓰레기가 된다 — 775 §2) */
        if (st.boot && st.kill1 && st.fkMs >= 0) { st.done = true; return; }
      }
      if (performance.now() - t0 > capMs) { st.bail = true; st.done = true; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { capMs, dead: !!dead });
  await page.goto(URL);
  const r = await page.evaluate(({ capMs }) => new Promise(res => {
    const st = window.__p779;
    const t0 = performance.now();
    const poll = () => {
      if (st.done) return res(st);
      /* rAF 가 통째로 굶어도 자가 매달리지 않게 — 문 하나 더(판정과 무관, 빠져나오기만 한다) */
      if (performance.now() - t0 > capMs + 2000) { st.bail = true; return res(st); }
      setTimeout(poll, 25);
    };
    poll();
  }), { capMs });
  await ctx.close();
  return { boot: r.boot, kill1: r.kill1, frames: r.frames, fkMs: r.fkMs, bail: r.bail, last: r.last || { q: -1 }, first: r.first };
}

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const K = +(process.env.PROBE779_K || 6);
  const DEAD = process.argv.includes('--dead');   /* 946 7회차 — 되돌림 시험(맨 아래 [D] 절) */
  if (DEAD) console.log('  [--dead] 되돌림 사본 — 위상 «기다림» 을 걷어 첫 프레임을 두 위상으로 삼는다');

  /* ── [0] 자가 둘이 되지 않게 — `probe766` [2] 의 판정문을 **파일에서 그대로 읽는다** ─────
     680 규약(«자가 둘이 되면 한쪽만 늙는다»). 이 항은 수리 전에는 빨갛고 수리 뒤에 초록이며,
     `probe766` 을 되돌리면 다시 빨개진다 = 이 작업의 **되돌림 시험**이다. */
  const SRC = fs.readFileSync(path.join(__dirname, 'probe766.js'), 'utf8');
  const stmt = (() => {
    const i = SRC.indexOf("'2 옛 장면의 시작점");
    if (i < 0) return null;
    const s = SRC.lastIndexOf('ok(', i);
    return s < 0 ? null : SRC.slice(s, SRC.indexOf(';', i) + 1);
  })();
  ok(!!stmt && /pre\.killed/.test(stmt) && !/===\s*50\b/.test(stmt),
     '0 `probe766` [2] 는 손 상수 50 이 아니라 **`killed` 를 낀 항등식**으로 적혀 있다(사본 0개 · 되돌림 시험)',
     stmt ? (stmt.split('\n')[0].trim().slice(0, 96) + ' …') : '판정문을 못 찾았다');

  /* ── 위상 관측 × K — [1]·[2]·[3]·[6] 이 **한 실행 묶음**에서 나온다 ───────────── */
  console.log('\n  [1] 부팅 뒤 첫 킬 시각 · 두 위상 포착 × ' + K + ' (probe766 이 붙는 시점은 500ms)');
  const ph = [];
  for (let i = 0; i < K; i++) {
    const r = await phaseRun(browser, 8000, DEAD);
    ph.push(r);
    console.log('      run' + (i + 1) + '  첫 킬 t=' + r.fkMs + 'ms · 프레임 ' + r.frames
      + ' · boot ' + (r.boot ? r.boot.en + '+' + r.boot.q + ' k' + r.boot.killed + ' @f' + r.boot.fr + '/' + r.boot.t + 'ms' : '못 잡음')
      + ' · kill1 ' + (r.kill1 ? r.kill1.en + '+' + r.kill1.q + ' k' + r.kill1.killed + ' @f' + r.kill1.fr + '/' + r.kill1.t + 'ms' : '못 잡음')
      + (r.bail ? ' · [문 열림 — q ' + r.last.q + ']' : ''));
  }

  /* ── [0-b] 무효 검사 — «위상을 못 잡았다» 를 판정으로 흘리지 않는다 ───────────
     (939 규약: 0 통과 · 1 실패 · 2 환경에 없음 · **3 자가 못 쟀다** · 946 3~6회차와 같은 셈법)
     ⚑ **벽시계로 가르지 않는다.** 문이 열린 실행이 «굶은 것» 인지 «제품의 사실» 인지는
     제품의 진행도가 가른다 — 부팅 파도가 **아직 다 안 나왔으면**(`q > 0`) 그 판은 시뮬레이션
     시간을 그만큼도 못 받은 것이다(파도는 자기 일정상 ~1.3 게임초면 전부 나온다). 파도를 다
     뱉고도(`q === 0`) 킬이 없다면 그건 못 잰 것이 아니라 **[1] 이 물어야 할 빨강**이다.
     ⚑ 갈래가 하나 더 있다 — 자가 **창이 지난 뒤에 붙는** 경우다. `waitForFunction` 과 rAF 설치
     사이의 벽시계는 부하에 늘어나므로, 첫 프레임에 이미 `killed > 0` 이면 부팅 위상은
     **이 자가 못 본 것**이지 없는 것이 아니다. 그것을 [6] 의 빨강으로 흘리면 이번 수리가
     같은 병을 다른 항에 옮겨 심는 꼴이 된다(775-④). ⇒ 둘 다 코드 3 으로 갈라 낸다. */
  const starved = ph.filter(r => r.bail && (!r.boot || !r.kill1) && r.last.q > 0);
  const missed = DEAD ? [] : ph.filter(r => !r.boot && r.first && r.first.killed > 0);
  if (starved.length || missed.length) {
    console.error('PROBE779 무효 — '
      + (starved.length ? starved.length + '/' + K + ' 실행이 부팅 파도조차 다 못 뱉었다(남은 큐 '
          + starved.map(r => r.last.q).join(',') + ' · 프레임 ' + starved.map(r => r.frames).join(',') + '). ' : '')
      + (missed.length ? missed.length + '/' + K + ' 실행은 자가 **창이 지난 뒤** 붙었다(첫 프레임에 이미 killed '
          + missed.map(r => r.first.killed).join(',') + '). ' : '')
      + '부하를 낮춰(동시 실행 수를 줄여) 다시 돌려라 — 제품 결함이 아니라 측정 실패다.');
    await browser.close();
    process.exit(3);
  }

  const fkOk = ph.map(r => r.fkMs).filter(x => x > 0);
  const fk = ph.map(r => r.fkMs);
  ok(fkOk.length === K,
     '1 부팅 파도는 **예외 없이** 첫 킬이 난다 — 즉 «아직 아무도 안 죽었다» 는 영구 상태가 아니라 **창**이다',
     '첫 킬 ' + fkOk.slice().sort((a, b) => a - b).join('/') + 'ms · 중앙값 ' + med(fkOk));
  /* ⚑⚑ 946 7회차 — **옛 [2] 를 판정에서 내렸다.** 옛 문장은 «최소 첫 킬 − 500 < 실행 간 흔들림»
     이었고, 그 주어가 제품이 아니라 **기계**다: 한가하고 고른 기계에서는 여유(229ms)가
     흔들림(187ms)보다 커져 그대로 빨개진다(7회차 실측 — rAF 로 재니 옛 20ms 폴러가 얹던
     잡음이 빠져 흔들림이 542 → 187ms 로 줄었다). 자기 바로 위에 «절대 문턱을 새로 적지 마라»
     라고 적어 두고 **500 이라는 남의 벽시계 상수**를 판정에 끼우고 있었던 자리다(6회차 인계 3번).
     ⇒ 수치는 **관측으로 그대로 인쇄**하고(잃는 것 0), 같은 뜻은 아래 [2] 가 **제품의 흩뿌림**
     으로 결정적으로 진다. «동전이 되는 이유» 는 결국 이것이다 — 벽시계 한 점이 판의 위상을
     안 정한다. 그 사실은 [3]·[6] 이 위상을 직접 집어 못박는다. */
  console.log('      (관측 — 옛 [2] 축) 최소 첫 킬 ' + (fkOk.length ? Math.min(...fkOk) : '–')
    + 'ms − 창 500ms = 여유 ' + (fkOk.length ? Math.min(...fkOk) - 500 : '–')
    + 'ms · 실행 간 흔들림 ' + (fkOk.length ? Math.max(...fkOk) - Math.min(...fkOk) : '–') + 'ms');

  /* ── [2] 시점별 스냅숏 — 표는 **관측**, 판정은 «흩뿌림» 이 진다 (946 5회차 [6-c] 선례) ────
     옛 축(벽시계 500·1500·3000ms)의 수치는 지우지 않는다. 다만 여기에 단언을 걸면
     그 단언의 주어가 제품이 아니라 기계가 되므로, 판정은 위 [3]·아래 [6] 이 지고
     이 표는 **항등식 [4]·[5] 의 표본**과 눈으로 보는 기록으로만 쓴다. */
  console.log('\n  [2] 시점별 스냅숏(`en` · `q` · `killed`) × ' + K + ' — 관측(판정 아님)');
  const WAITS = [500, 1500, 3000];
  const rows = {};
  for (const ms of WAITS) {
    rows[ms] = [];
    for (let i = 0; i < K; i++) rows[ms].push(await snap(browser, ms));
    console.log('      ' + String(ms + 'ms').padEnd(7) + rows[ms]
      .map(r => r.en + '+' + r.q + '=' + (r.en + r.q) + ' k' + r.killed).join('  '));
  }
  const late = rows[1500].concat(rows[3000]);
  console.log('      (관측 — 옛 [3] 축) 1500·3000ms 에서 옛 전칭이 맞은 표본 '
    + late.filter(r => r.en + r.q === r.pop).length + '/' + late.length
    + ' · killed ' + late.map(r => r.killed).join(','));

  /* ── [2] 붙는 시점 500ms 는 **제품의 눈금이 아니다** (946 7회차 — 옛 [2] 의 뜻을 잇는다) ──
     옛 [2] 가 하려던 말은 «그래서 동전이 된다» 였다. 그 말의 뿌리는 기계 속도가 아니라
     **제품이 파도를 흩뿌린다**는 것이다 — `queueMobs()` 가 `delay: i*0.02 + rnd(0, 0.3)` 로
     매 판 다른 일정을 뽑으므로, **같은 벽시계 한 점에서 판의 위상이 실행마다 다르다.**
     ⇒ 같은 500ms 스냅숏 K 장의 위상이 한 값으로 굳지 않으면(흩어지면) 그 시점에 박은
     단언은 그 자체로 동전이다. 손 문턱 0개(«흩어졌는가» 는 폭 > 0 이면 참) · 기계 무관
     (부하가 세면 폭이 커질 뿐 방향이 안 바뀐다 — `par 7` 21 실행에서 폭 5~44).
     ⚠ 이 항이 재는 것은 **제품의 성질**(흩뿌림)이지 «오늘 이 기계가 느린가» 가 아니다. */
  const q500 = rows[500].map(r => r.q), k500 = rows[500].map(r => r.killed);
  const sprQ = Math.max(...q500) - Math.min(...q500), sprK = Math.max(...k500) - Math.min(...k500);
  ok(q500.length > 1 && sprQ > 0,
     '2 붙는 시점 500ms 는 **제품의 눈금이 아니다** — 같은 벽시계 한 점에서 판의 위상이 실행마다 흩어진다(`queueMobs` 의 `rnd(0, 0.3)`) ⇒ 그 시점에 박은 단언은 동전이다',
     'q 폭 ' + sprQ + '(' + q500.join(',') + ') · killed 폭 ' + sprK + '(' + k500.join(',') + ')');

  /* ── [3] 옛 전칭은 **한 파도 안에서 뒤집힌다** — 그래서 그것은 시계였다 (946 7회차) ──
     ⚑ 옛 [3] 은 «1500·3000ms 에서는 한 번도 안 맞는다» 였다. 그 문장의 주어는 제품이 아니라
       **벽시계**다 — 부하가 프레임을 굶기면 같은 1500ms 에 킬이 아직 안 나서(21 실행 중 19회)
       옛 전칭이 그 자리에서 참이 되고 자가 빨개진다. 같은 뜻을 시계 없이 적는 길은
       **두 위상을 직접 집어 그 사이의 뒤집힘을 보는 것**이다:
         · 부팅 위상(첫 킬 전)  — 옛 전칭 `en + q === ENEMY_COUNT` 이 **참**
         · 첫 킬 프레임         — 같은 전칭이 **거짓**
       두 프레임이 **같은 실행·같은 파도**(둘 다 `killed < ENEMY_COUNT` — 리필 전)에서 나오므로
       이것은 확률이 아니라 한 실행 안의 사실이고, 프레임이 몇 장 오든 안 변한다.
     ⚠ 자리를 안 비웠다(333) — 옛 [3] 이 지던 뜻(«이 단언이 재던 것은 첫 킬 여부다»)을
       그대로 이 항이 진다. 옛 축의 벽시계 수치는 바로 위 표에 **관측으로** 남는다. */
  const flipT = ph.filter(r => r.boot && r.boot.en + r.boot.q === r.boot.pop);
  const flipF = ph.filter(r => r.kill1 && r.kill1.en + r.kill1.q !== r.kill1.pop && r.kill1.killed < r.kill1.pop);
  const ok3 = ok(ph.length > 0 && flipT.length === ph.length && flipF.length === ph.length,
     '3 옛 전칭 `en + q === ENEMY_COUNT` 은 **한 파도 안에서 뒤집힌다**(부팅 위상 참 → 첫 킬 프레임 거짓) — 이 단언이 재던 것은 «부팅 파도» 가 아니라 «첫 킬이 아직 안 났는가» 다',
     '참인 위상 ' + flipT.length + '/' + ph.length + ' · 거짓인 위상 ' + flipF.length + '/' + ph.length
     + ' · boot ' + ph.map(r => r.boot ? (r.boot.en + '+' + r.boot.q) : '–').join(',')
     + ' → kill1 ' + ph.map(r => r.kill1 ? (r.kill1.en + '+' + r.kill1.q + '+' + r.kill1.killed) : '–').join(','));

  /* ── [4]·[5] 킬을 셈에 넣으면 항등식이 된다 — 시계를 가로질러 전 표본에서 참 ───────
     946 7회차 — 표본에 **위상 프레임까지** 넣는다(옛 벽시계 18 + 두 위상 2K). 항등식이라
     부하와 무관하고, `par 7` 21 실행에서 한 번도 안 흔들렸다. */
  const all = WAITS.reduce((a, ms) => a.concat(rows[ms]), [])
    .concat(ph.filter(r => r.boot).map(r => r.boot))
    .concat(ph.filter(r => r.kill1).map(r => r.kill1));
  ok(all.every(r => r.killed >= 0 && r.pop > 0 && r.en + r.q + r.killed === r.pop),
     '4 **`en + q + killed === ENEMY_COUNT`** 는 전 시점·전 표본에서 참이다(부팅 파도는 «나왔거나 · 대기 중이거나 · 죽었거나» 셋뿐)',
     all.length + '/' + all.length + '회 · ' + WAITS.map(ms => ms + 'ms:' + rows[ms].map(r => r.en + '+' + r.q + '+' + r.killed).join(',')).join(' · '));
  ok(all.every(r => r.killed < r.pop),
     '5 이 창에서는 부팅 파도가 **다 죽기 전**이다 — 항등식이 리필(`queueMobs` 재예약)과 섞이지 않는다',
     'killed 최댓값 ' + Math.max(...all.map(r => r.killed)) + ' < ENEMY_COUNT ' + all[0].pop);

  /* ── [6] 뜻 보존 — «부팅 파도 한복판» 은 **실재하고 매 실행 잡힌다** (946 7회차) ─────
     766 의 결론(«시작 위상이 정의 안 돼 있었다»)이 이 항의 존재 이유다. 자리를 비우면 안 된다(333).
     ⚑ 옛 [6] 은 그 위상을 **벽시계 500ms** 로 가리켰다 — 부팅이 느린 판에서는 같은 500ms 가
       파도를 다 뱉고 킬까지 지나가 버려(21 실행 중 7회) 자가 빨개졌다. 위상은 시계의 눈금이
       아니라 **판의 상태**이므로, 그 상태를 직접 집어 «실재한다» 를 단언한다.
     ⚠ 이것은 «언제나 잡힌다» 를 무르게 적은 것이 아니다 — 못 잡은 실행은 위 [0-b] 가
       **판정이 아니라 코드 3**(못 쟀다)으로 갈라 내므로, 여기 남는 빨강은 «파도를 다 뱉고도
       그 위상이 없었다» 는 제품 쪽 사실뿐이다. `--dead` 가 이 항을 결정적으로 빨갛게 만든다. */
  const bootOk = ph.filter(r => r.boot && r.boot.q > 0 && r.boot.en > 0 && r.boot.killed === 0);
  const ok6 = ok(ph.length > 0 && bootOk.length === ph.length,
     '6 뜻 보존 — **부팅 파도가 반쯤 나온 상태**(대기 큐 q > 0 · 나온 놈 en > 0 · killed 0)는 실재하고 매 실행 잡힌다',
     bootOk.length + '/' + ph.length + ' · q ' + ph.map(r => r.boot ? r.boot.q : '–').join(',')
     + ' · en ' + ph.map(r => r.boot ? r.boot.en : '–').join(',')
     + ' · 잡힌 프레임 f' + ph.map(r => r.boot ? r.boot.fr : '–').join(',')
     + ' (관측 — 옛 [6] 축: 500ms 스냅숏의 q ' + rows[500].map(r => r.q).join(',') + ')');

  /* ── [R] 음성항 — 새 항등식이 무르게 풀린 것이 아니다 ──────────────────────
     «죽이지 않고» 한 마리를 지우면(= 판이 정말로 새면) 항등식은 곧바로 깨져야 한다. */
  console.log('\n  [R] 음성항 — 부팅 파도에서 한 마리를 «죽이지 않고» 지운다');
  const dropped = [];
  for (let i = 0; i < Math.min(3, K); i++) dropped.push(await dropAtPhase(browser, 8000));
  console.log('      ' + dropped.map(r => r.en + '+' + r.q + '+' + r.killed + '=' + (r.en + r.q + r.killed)
    + (r.did ? '' : ' [못 지움]')).join('  '));
  /* [전제] 정말로 한 마리가 빠졌는가 — 안 빠졌으면 이 항은 **아무것도 안 재고 있다**(946 5회차).
     그것을 빨강으로 흘리면 음성항이 부하의 함수가 되므로 코드 3 으로 갈라 낸다(939 규약). */
  const noDrop = dropped.filter(r => !r.did);
  if (noDrop.length) {
    console.error('PROBE779 무효 — 음성항이 ' + noDrop.length + '/' + dropped.length
      + ' 회 한 마리도 못 지웠다(부팅 위상에 못 닿았다 · en ' + noDrop.map(r => r.en).join(',')
      + ' · q ' + noDrop.map(r => r.q).join(',') + ').'
      + ' 부하를 낮춰(동시 실행 수를 줄여) 다시 돌려라 — 제품 결함이 아니라 측정 실패다.');
    await browser.close();
    process.exit(3);
  }
  ok(dropped.every(r => r.en + r.q + r.killed !== r.pop),
     'R 한 마리를 **죽이지 않고** 지우면 새 항등식이 곧바로 깨진다(값을 밴드에 맞춘 것이 아니다)',
     dropped.map(r => (r.en + r.q + r.killed)).join(',') + ' ≠ ' + dropped[0].pop
     + ' · 지움 확인 ' + dropped.filter(r => r.did).length + '/' + dropped.length);

  await browser.close();

  /* ── [D] `--dead` 되돌림 시험 (946 7회차) ────────────────────────────────
     «무르게 푼 수리가 아님» 을 매 실행 못박는 자리다. 되돌림 사본은 **위상 «기다림» 만**
     걷어 낸다(`phaseRun(dead)` — 첫 프레임을 두 위상으로 삼는다). 그러면
       · [6] — 첫 프레임에는 아직 아무도 안 나와 있다(`en === 0`) ⇒ **거짓**
       · [3] — 두 위상이 같은 프레임이라 «뒤집힘» 이 없다(`kill1.en + kill1.q === pop`) ⇒ **거짓**
     둘 다 통계가 아니라 **한 프레임의 값**이라 동전이 아니다(같은 배치를 몇 번 돌려도 같은 답).
     ⚠ 되돌리는 것은 기다림 한 줄뿐이고 «첫 킬 시각» 은 그대로 진짜로 기다리므로
     [1]·[2]·[4]·[5]·[R] 은 이 사본에서도 널이 아니다 — 그 항들의 빨강/초록은
     **통과 조건으로 쓰지 않는다**(775 §2 · 946 5·6회차와 같은 규약). */
  if (DEAD) {
    const revived = !ok3 && !ok6;
    console.log('\n  [D] 되돌림 — 위상 기다림을 걷으면 [3]·[6] 이 빨개지는가: '
      + '[3] ' + (ok3 ? '초록(= 실패)' : '빨강(= 통과)')
      + ' · [6] ' + (ok6 ? '초록(= 실패)' : '빨강(= 통과)')
      + ' · 나머지 항의 빨강 ' + Math.max(0, fail - (revived ? 2 : 0)) + '건은 관측이다');
    console.log('\n' + (revived ? 'PASS' : 'FAIL') + ' --dead 되돌림 시험');
    process.exit(revived ? 0 : 1);
  }

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
