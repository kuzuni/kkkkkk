/* 작업 395 — 재현 프로브: `verify69` [4] 의 «골드 증가분» 두 항이 4회 중 1회 빨간 이유를 자로 못박는다.
   실행: node tools/probe395.js

   등재문의 이름은 «방치 골드 한 틱» 이었다. 여기서 묻는 것은 넷이다:
     ⓐ 오염원이 정말 «방치(offline) 수익» 인가, 아니면 **전투 킬 보상**인가 — 이름이 다르면 처방도 다르다.
     ⓑ 그 수입은 연속인가 **이산(틱)** 인가 — verify69 의 드리프트 자(600ms 표본 ×3)는 «연속» 을 전제한다.
     ⓒ 처방 ⓐ(표본 구간 동안 전투 수입을 0 으로) 가 실제로 그 수입을 끊는가 — 그리고 **전투 자체는 계속 도는가**
        (안 돌면 [전제] 가 공허해져 «게이트가 초록인 이유가 사라진 것» 이 된다).
     ⓓ 끈 뒤 되돌리면 수입이 돌아오는가(되돌림 시험 — 자가 게임을 영구히 망가뜨리지 않는다).

   338·344 규칙: 처방을 따르기 전에 재현부터 한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, failed = 0;
const ok = (m) => { pass++; console.log('  ✓ ' + m); };
const fail = (m) => { failed++; console.log('  ✗ ' + m); };

const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* verify69 의 fresh() 와 같은 부팅 조건 — 자동구매·자동강화를 끄고 동적 우편을 치운다.
   조건이 다르면 여기서 잰 값을 그 게이트에 그대로 못 쓴다. */
async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(800);
  await page.evaluate(() => { if (typeof S === 'object') { S.autoBuy = false; S.spAuto = false; } });
  await page.evaluate(() => {
    if (typeof S !== 'object') return;
    S.mailx = []; S.mailSeq = 0; S.mail = {};
    const d = new Date();
    S.lastMonthly = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  });
  return { ctx, page };
}

/* ms 동안 골드·킬을 «프레임마다» 녹화한다(392 처방 — 벽시계가 아니라 페이지 안 rAF).
   이산 틱을 세려면 표본을 프레임 단위로 떠야 한다: 600ms 표본 두 장으로는 틱이 몇 번 왔는지 못 센다.
   ⚠ 창을 짧게 잡으면 «킬 0» 이 나와 아무것도 못 읽는다 — 부팅 직후 킬은 3초에 1회 남짓이다(1회차 관측).
      그래서 이 프로브의 창은 verify69 의 표본 창(≈1s)이 아니라 **틱을 여러 번 담는 길이**로 잡는다. */
const WIN = 15000;
async function record(page, ms) {
  return page.evaluate((dur) => new Promise((res) => {
    const t0 = performance.now(), g0 = S.gold, k0 = S.totalKills;
    const steps = [];
    let pg = S.gold, pk = S.totalKills;
    (function tick() {
      const now = performance.now();
      if (S.gold !== pg || S.totalKills !== pk) {
        steps.push({ t: +(now - t0).toFixed(1), dg: +(S.gold - pg).toFixed(4), dk: S.totalKills - pk });
        pg = S.gold; pk = S.totalKills;
      }
      if (now - t0 >= dur) return res({ ms: +(now - t0).toFixed(1), gold: +(S.gold - g0).toFixed(4), kills: S.totalKills - k0, steps });
      requestAnimationFrame(tick);
    })();
  }), ms);
}

(async () => {
  const browser = await launch(chromium);
  try {
    /* ---------- ⓐ·ⓑ 오염원의 이름과 모양 ---------- */
    console.log('[A] 오염원 — 이름(방치 vs 전투)과 모양(연속 vs 이산)');
    const { ctx, page } = await boot(browser);
    const base = await record(page, WIN);
    console.log(`      ${WIN}ms 녹화 — 골드 +${base.gold} · 킬 ${base.kills} · 변화 프레임 ${base.steps.length}`);
    console.log('      변화 프레임: ' + JSON.stringify(base.steps.slice(0, 12)));

    base.gold > 0
      ? ok(`골드가 실제로 굴러간다 — ${WIN}ms 에 +${base.gold} (킬 ${base.kills}회)`)
      : fail(`${WIN}ms 동안 골드가 한 푼도 안 늘었다 — 이 프로브의 전제가 깨졌다`);

    /* 이름: 골드가 오른 프레임마다 킬이 같이 올랐으면 «전투 킬 보상» 이고, 킬 없이 올랐으면 «방치» 다. */
    const withKill = base.steps.filter((s) => s.dg > 0 && s.dk > 0).length;
    const noKill = base.steps.filter((s) => s.dg > 0 && s.dk === 0).length;
    console.log(`      골드가 오른 프레임 — 킬 동반 ${withKill} · 킬 없음 ${noKill}`);
    withKill > 0 && noKill === 0
      ? ok('오염원은 «방치 수익» 이 아니라 **전투 킬 보상**이다(골드가 오른 프레임에 예외 없이 킬이 있다)')
      : fail(`오염원이 킬과 안 붙는다 — 킬 동반 ${withKill} · 킬 없음 ${noKill} (등재문의 이름을 다시 봐야 한다)`);

    /* 모양: 한 프레임에 통째로 들어오면 이산(틱)이다. */
    const amounts = [...new Set(base.steps.filter((s) => s.dg > 0).map((s) => s.dg))];
    console.log('      한 번에 들어오는 액수: ' + JSON.stringify(amounts));
    base.steps.length > 0 && base.steps.length < Math.round(base.ms / 60)
      ? ok(`이산(틱)이다 — ${Math.round(base.ms)}ms 중 골드가 움직인 프레임은 ${base.steps.length}개뿐(연속이면 매 프레임 움직인다)`)
      : fail(`연속처럼 보인다 — 변화 프레임 ${base.steps.length}개 (드리프트 자의 «×3 환산» 전제가 맞을 수 있다)`);

    /* ⓑ-2 — verify69 의 드리프트 자가 왜 «0» 을 돌려주는가: 600ms 창에 틱이 안 들어오는 일이 잦다. */
    const gaps = [];
    for (let i = 1; i < base.steps.length; i++) gaps.push(+(base.steps[i].t - base.steps[i - 1].t).toFixed(0));
    console.log('      틱 간격(ms): ' + JSON.stringify(gaps));
    const maxGap = gaps.length ? Math.max(...gaps) : base.ms;
    maxGap > 600
      ? ok(`틱 간격 최대 ${maxGap}ms > 600ms — **600ms 표본은 틱을 통째로 놓칠 수 있다**(그때 드리프트가 0 → 허용치가 바닥 ±4 로 떨어진다)`)
      : ok(`틱 간격 최대 ${maxGap}ms — 600ms 창에는 대개 한 틱이 들어온다(그래도 «한 틱 액수 > ±4» 면 빨갛다)`);

    /* ---------- ⓒ 처방 — 표본 구간 동안 전투 수입만 0 으로 ---------- */
    console.log('[B] 처방 ⓐ — `stat.goldMul` 을 표본 구간 동안 0 으로(전투는 계속 돌게 둔다)');
    const froze = await page.evaluate(() => {
      const d = Object.getOwnPropertyDescriptor(stat, 'goldMul');
      if (!d || typeof d.get !== 'function') return { okDesc: false };
      window.__g395 = d;
      Object.defineProperty(stat, 'goldMul', { get: () => 0, configurable: true });
      return { okDesc: true, now: stat.goldMul };
    });
    froze.okDesc && froze.now === 0
      ? ok('`stat.goldMul` 은 getter 이고 configurable — 표본 구간만 0 으로 덮을 수 있다')
      : fail('`stat.goldMul` 을 덮지 못했다 — 처방 ⓐ 를 못 쓴다');

    const frozen = await record(page, WIN);
    console.log(`      동결 ${WIN}ms — 골드 +${frozen.gold} · 킬 ${frozen.kills}`);
    frozen.gold === 0
      ? ok('동결 구간의 전투 골드 = **0** (오염이 사라진다)')
      : fail(`동결했는데 골드가 +${frozen.gold} 늘었다 — goldMul 을 안 타는 골드 경로가 더 있다`);
    frozen.kills > 0
      ? ok(`전투는 계속 돈다 — 동결 구간에도 킬 ${frozen.kills}회 ([전제] 가 공허하지 않다)`)
      : fail('동결 구간에 킬이 0 이다 — 전투가 멈춘 것이라 «오염 0» 이 공허하다');

    /* ---------- ⓓ 되돌림 — 자가 게임을 영구히 망가뜨리지 않는다 ---------- */
    console.log('[C] 되돌림 — 원래 getter 를 되돌리면 수입이 돌아온다');
    await page.evaluate(() => { Object.defineProperty(stat, 'goldMul', window.__g395); });
    const back = await record(page, WIN);
    console.log(`      복구 ${WIN}ms — 골드 +${back.gold} · 킬 ${back.kills}`);
    back.gold > 0
      ? ok(`복구 뒤 전투 골드가 돌아온다 — +${back.gold} (동결은 구간에만 걸린다)`)
      : fail('복구했는데 골드가 안 돌아온다 — 자가 게임 상태를 망가뜨린다');

    /* ---------- ⓔ 자를 위한 «운에 안 걸리는» 전제 ----------
       [B]·[C] 는 «15초 창에 킬이 몇 번 오나» 에 기대는데, verify69 의 표본 창은 1초 남짓이라
       그 창에서 «킬 ≥ 1» 을 단언하면 **내가 고치려던 것과 똑같은 플레이키를 새로 만든다**(틱 간격 최대 7.6초).
       ⇒ 자는 킬을 «기다리지» 말고 **직접 한 마리 잡아** 전투 수입 경로를 부른다: 결정적이고 즉시다. */
    console.log('[D] 강제 킬 — 자가 전투 수입 경로를 «기다리지 않고» 부를 수 있는가');
    const forced = await page.evaluate(() => {
      const shot = () => {
        if (!Array.isArray(enemies) || !enemies.length) return null;
        const g0 = S.gold; killEnemy(enemies[0]); return +(S.gold - g0).toFixed(4);
      };
      const live = shot();                                            /* 동결 전 */
      const d = Object.getOwnPropertyDescriptor(stat, 'goldMul');
      Object.defineProperty(stat, 'goldMul', { get: () => 0, configurable: true });
      const off = shot();                                             /* 동결 중 */
      Object.defineProperty(stat, 'goldMul', d);
      const on = shot();                                              /* 복구 뒤 */
      return { live, off, on, n: enemies.length };
    });
    console.log(`      강제 킬 골드 — 동결 전 ${forced.live} · 동결 중 ${forced.off} · 복구 뒤 ${forced.on} (남은 적 ${forced.n})`);
    forced.live !== null && forced.off !== null && forced.on !== null
      ? ok('`killEnemy(enemies[0])` 로 전투 수입 경로를 즉시 부를 수 있다(적이 늘 화면에 있다)')
      : fail('강제 킬이 안 된다 — 적 배열이 비어 있는 순간이 있다(자는 이 전제를 못 쓴다)');
    forced.live > 0
      ? ok(`동결 전 강제 킬 = +${forced.live} — 오염원을 재현할 수 있다(전제가 공허하지 않다)`)
      : fail(`동결 전인데 강제 킬 골드가 ${forced.live} — 오염원을 못 부른다`);
    forced.off === 0
      ? ok('동결 중 강제 킬 = **+0** — 동결이 그 경로를 정확히 끊는다')
      : fail(`동결 중인데 강제 킬 골드가 +${forced.off} — 동결이 새는 경로가 있다`);
    forced.on > 0
      ? ok(`복구 뒤 강제 킬 = +${forced.on} — 동결은 구간에만 걸린다(자가 게임을 안 망가뜨린다)`)
      : fail(`복구했는데 강제 킬 골드가 ${forced.on}`);
    forced.live === 4.08 && forced.on === 4.08
      ? ok('한 틱 액수 = **4.08** — verify69 의 허용치 바닥 ±4 를 0.08 로 넘는다(이 자가 빨간 이유 그 자체)')
      : ok(`한 틱 액수 = ${forced.live}/${forced.on} (표본 시점의 스테이지·배수에 따라 달라진다 — 허용치 ±4 와의 거리가 본체다)`);

    await ctx.close();
  } finally {
    await browser.close();
  }
  console.log(`\nPROBE395 ${failed ? 'FAIL' : 'PASS'} ${pass}/${pass + failed}`);
  process.exit(failed ? 1 : 0);
})();
