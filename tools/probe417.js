/* 작업 417 재현기 — `verify235` 가 왜 «8회 중 1회» 빨간가.
   실행: node tools/probe417.js  → 마지막 줄이 `PROBE417 n/n PASS`.

   338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 세우거나 기각한다.
   등재문(2026-08-29, 396 곁다리) 가설: «부팅 대기 `waitForTimeout` 이 그릇 계산보다 먼저 끝나면
   `.pcb-d>b`·`#cpN` 그릇이 0 이 되어 `fitRoom` 이 0 을 돌려주고 early-return 한다».

   ⇒ **그 가설은 기각된다.** 빨간 두 항은 그릇(①)이 아니라 ⑤ 두 항이고, 실패한 실행의 표시값은
   «5,000» = **내가 방금 넣은 값이 아니라 직전 값**이다. 그릇은 내내 186.5 로 옳았다.

   진짜 뿌리는 **자가 던지는 질문이 틀린 것**이다 — `verify235` 의 `settle()` 은
   «텍스트가 3번 연속 안 바뀌면 다 된 것» 으로 읽는데, 제품에는 **일부러 안 바뀌는 구간**이 있다:
     · `fxHold[k] = now + 2000` (index.html ~32777) — 재화가 쌓이면 표시값을 최대 **2000ms** 붙잡는다
       («코인이 꽂히는 순간부터 오르게» — 58·158 규약).
     · 붙잡힌 뒤에야 `fxRoll` 이 돌기 시작해 값이 목표까지 **굴러간다**(FXROLL).
   `settle()` 의 창은 4회 폴 × 150ms ≈ **450~650ms** 로 hold 보다 짧다. 그래서 hold 가 걸린 채
   호출되면 «안 변한다 = 다 됐다» 로 읽고 **직전 값**을 재고 만다. 이기고 지는 것은 hold 잔여와
   폴 창의 경주 = 플레이키. 부하가 걸리면 프레임이 굶어 stale 폴이 더 쉽게 3번 쌓인다.

   여기서 묻는 것:
     ⓐ 실패한 실행의 표시값이 «직전 값» 인가 (그릇 가설의 기각 · 뿌리의 확정)
     ⓑ hold 가 걸린 순간 옛 술어(안정만)가 stale 을 «settled» 로 돌려주는가 — **강제 hold 로 결정적 재현**
     ⓒ 같은 자리에서 새 술어(«제품에게 묻는다»: 표시 텍스트 == `fmt(S.dia)`)는 목표값을 주는가
     ⓓ 새 술어가 제품이 영영 안 따라올 때 **무한정 기다리거나 헛초록을 만들지 않는가**(시한 뒤 timeout)
     ⓔ 그릇(`fitRoom`)은 실패 순간에도 옳은가 (등재문 가설의 직접 반증) */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

const SEL = '#shopw .pcb-d>b';
const BIG = 987654321098765;

/* verify235 가 쓰던 옛 술어 — «3번 연속 같으면 다 된 것» (여기서는 재현용으로만 쓴다) */
const settleOld = async (p, sel) => {
  let last = null, same = 0;
  const t0 = Date.now();
  for (let i = 0; i < 60 && same < 3; i++) {
    const t = await p.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
    same = (t === last) ? same + 1 : 0; last = t;
    await p.waitForTimeout(150);
  }
  return { t: last, ms: Date.now() - t0 };
};

/* 새 술어 — «제품이 내가 넣은 값을 보여주고 있는가» 를 묻고, 두 프레임 유지되면 끝낸다 */
const settleTo = (p, sel, ms = 20000) => p.evaluate(async ([s, lim]) => {
  const e = document.querySelector(s);
  const t0 = performance.now();
  let hit = 0;
  while (performance.now() - t0 < lim) {
    hit = (e.textContent === fmt(S.dia)) ? hit + 1 : 0;
    if (hit >= 2) return { t: e.textContent, ms: performance.now() - t0, timeout: false };
    await new Promise((r) => requestAnimationFrame(r));
  }
  return { t: e.textContent, ms: performance.now() - t0, timeout: true };
}, [sel, ms]);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { openShopPage(); S.dia = 5000; });
  await p.waitForTimeout(1600);

  /* ── ⓐ 제품의 «일부러 안 변하는 구간» 을 프레임 단위로 찍는다 ── */
  const trace = await p.evaluate(async ([sel, big]) => {
    const e = document.querySelector(sel);
    const before = e.textContent;
    const room0 = fitRoom(e);
    /* 재현을 결정적으로 만든다 — 제품이 스스로 거는 것과 같은 손잡이(fxHold)를 같은 값으로 건다.
       (부팅 직후 자동 플레이가 재화를 쌓으면 이 hold 는 저절로도 걸려 있다 — 그때가 «8회 중 1회» 다) */
    fxHold.dia = performance.now() + 1500;
    const t0 = performance.now();
    S.dia = big;
    let first = -1, land = -1;
    while (performance.now() - t0 < 12000) {
      const t = e.textContent;
      if (first < 0 && t !== before) first = performance.now() - t0;
      if (t === fmt(S.dia)) { land = performance.now() - t0; break; }
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { before, first, land, room0, room: fitRoom(e), fs: parseFloat(getComputedStyle(e).fontSize) };
  }, [SEL, BIG]);
  console.log(`  [측정] hold 1500ms 강제 · 직전 표시 "${trace.before}" → 첫 변화 +${trace.first.toFixed(0)}ms`
            + ` · 목표 도달 +${trace.land.toFixed(0)}ms (옛 술어의 창 = 4폴×150 ≈ 450~650ms)`);
  ok(trace.first > 650,
     `제품은 값을 넣어도 ${trace.first.toFixed(0)}ms 동안 «일부러» 안 바꾼다(fxHold ≤ 2000ms)`
     + ` — 옛 술어의 창(≈650ms)보다 길다 ⇒ «안 변한다 = 다 됐다» 는 거짓이다`);
  ok(trace.land > trace.first,
     `hold 가 풀린 뒤에야 롤링이 목표까지 굴러간다 (+${trace.land.toFixed(0)}ms)`);

  /* ── ⓔ 등재문 가설(그릇 0)의 직접 반증 ── */
  ok(Math.abs(trace.room0 - 186.5) <= 1 && trace.room > 150,
     `그릇은 값을 넣기 전 ${trace.room0.toFixed(1)}(186.5 기대) · 목표 도달 뒤 ${trace.room.toFixed(1)} 로 **한 번도 0 이 아니다**`
     + ` ⇒ 등재문의 «그릇이 0 이 되어 early-return» 가설은 **기각**`);
  /* 둘이 9.3px 다른 것은 결함이 아니다 — 알약 아이콘이 `.cic{width:1.08em}` 이라 글자가 줄면
     아이콘도 같이 줄어 그릇이 그만큼 넓어진다. 그릇을 «상수 186.5» 로 단언할 수 있는 것은
     글자가 CSS 원본 크기일 때뿐이다(verify235 ① 이 재는 시점이 그때다). */
  ok(trace.room > trace.room0,
     `줄어든 글자에서는 그릇이 오히려 넓다(${trace.room0.toFixed(1)} → ${trace.room.toFixed(1)})`
     + ` — 아이콘이 1.08em 이라 글자에 딸려 움직인다`);

  /* ── ⓑ 옛 술어는 hold 구간에서 «직전 값» 을 settled 로 돌려준다(결정적 재현) ── */
  await p.evaluate(() => { S.dia = 5000; });
  await settleTo(p, SEL);
  const oldRead = await (async () => {
    await p.evaluate((big) => { fxHold.dia = performance.now() + 1500; S.dia = big; }, BIG);
    const r = await settleOld(p, SEL);
    const after = await p.evaluate((s) => {
      const e = document.querySelector(s);
      return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize), want: fmt(S.dia) };
    }, SEL);
    return { r, after };
  })();
  console.log(`  [옛 술어] ${oldRead.r.ms}ms 만에 "${oldRead.r.t}" 를 «다 됐다» 로 돌려줬다`
            + ` · 그때 실제 목표는 "${oldRead.after.want}" · fs=${oldRead.after.fs}`);
  ok(oldRead.r.t === '5,000',
     `옛 술어가 **직전 값 «5,000»** 을 돌려준다 = 실패한 실행의 출력과 같은 그림(12/14 의 ⑤ 두 항)`);
  ok(oldRead.after.fs > 34, `그 순간 fs 는 CSS 원본 34.5 그대로라 «⑤ 긴 값은 줄인다» 가 빨개진다 (fs=${oldRead.after.fs})`);

  /* ── ⓒ 새 술어는 같은 자리에서 목표값을 준다 ── */
  const neu = await settleTo(p, SEL);
  const big = await p.evaluate((s) => {
    const e = document.querySelector(s);
    const rg = document.createRange(); rg.selectNodeContents(e);
    return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize), ink: rg.getBoundingClientRect().width, room: fitRoom(e) };
  }, SEL);
  console.log(`  [새 술어] ${neu.ms.toFixed(0)}ms · "${neu.t}" · fs=${big.fs} · ink=${big.ink.toFixed(1)} room=${big.room.toFixed(1)}`);
  ok(!neu.timeout && big.t.replace(/[^0-9]/g, '').length === 15 && big.fs < 34,
     `새 술어는 같은 자리에서 15자리 목표값을 주고 fs 도 줄어 있다 ⇒ ⑤ 두 항이 초록`);

  /* ── ⓓ 제품이 영영 안 따라오면 새 술어는 «헛초록» 대신 timeout 을 준다 ── */
  const froze = await p.evaluate(async () => {
    const keep = fxTick;                  /* 표시값 갱신을 멈춰 «제품이 안 따라오는» 상태를 만든다 */
    fxTick = () => {};
    S.dia = 42;
    await new Promise((r) => setTimeout(r, 200));
    const e = document.querySelector('#shopw .pcb-d>b');
    const t0 = performance.now();
    let hit = 0, timeout = true;
    while (performance.now() - t0 < 1500) {   /* 시한만 짧게 둔 같은 술어 */
      hit = (e.textContent === fmt(S.dia)) ? hit + 1 : 0;
      if (hit >= 2) { timeout = false; break; }
      await new Promise((r) => requestAnimationFrame(r));
    }
    fxTick = keep;
    return { timeout, t: e.textContent, want: fmt(S.dia) };
  });
  ok(froze.timeout === true,
     `표시 갱신을 멈추면 새 술어는 시한 안에 «닿음» 을 못 주고 timeout 을 돌려준다`
     + ` (표시 "${froze.t}" ≠ 목표 "${froze.want}") ⇒ 기다림을 늘려 초록을 사는 자가 아니다`);

  console.log(`\nPROBE417 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
