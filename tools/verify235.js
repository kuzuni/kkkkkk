/* 작업 235 — `fitNum`(150) 폭 클램프의 «래칫» 회귀 게이트 (검증 (가): 비평가 없음).
   결함: 그릇 폭으로 `el.clientWidth`(= 직전 호출이 이미 줄여 놓은 제 폭)를 써서
   값이 바뀔 때마다 한 계단씩 내려앉아 FITMIN 0.55 바닥에 눌어붙었다.
   → verify81 의 «바 밴드 픽셀 diff» 가 2,839px, VERIFYA3 가 9/16 로 빨갰다.
   여기서 재는 것은 **«남는 자리가 있으면 CSS 원본 그대로, 넘칠 때만 줄인다»** 뿐이다.
   실행: node tools/verify235.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ck = (name, ok, info) => {
  console.log((ok ? '  ✅ ' : '  ❌ ') + name + (info ? ' — ' + info : ''));
  ok ? pass++ : fail++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* 58 의 «롤링»(fxVal) 때문에 값을 바꿔도 표시 숫자가 몇 초간 계속 자란다 —
   구르는 중에 재면 그 프레임의 자릿수를 재는 것이라 결정적이지 않다.

   ⚑ 417 — 여기서 **«멎을 때까지 기다린다» 는 틀린 질문**이었다(옛 `settle()`: 텍스트가 3번
   연속 같으면 다 된 것). 제품에는 **일부러 안 변하는 구간**이 있다 — `fxHold[k] = now + 2000`
   (index.html ~32777, 58·158 «코인이 꽂히는 순간부터 오르게»)이 표시값을 최대 2000ms 붙잡고,
   풀린 뒤에야 롤링이 시작된다. 옛 술어의 창은 4폴 × 150ms ≈ 450~650ms 라 hold 보다 짧아서,
   hold 가 걸린 채 부르면 **직전 값**을 «다 됐다» 로 읽었다 = 8회 중 1회 `12/14 FAIL`
   (⑤ 두 항이 «5,000» 을 재고 빨개진다). 이기고 지는 것은 hold 잔여와 폴 창의 경주였다.
   재현·계측은 `node tools/probe417.js`.

   ⇒ 344 처방대로 «기다림» 이 아니라 **제품에게 묻는다**: 표시 텍스트가 제품 자신의 표기
   (`fmt(S.dia)` · `fmtB(cp())`)와 같아졌는가. 두 프레임 유지되면 도착이다.
   ⚠ 시한을 넘기면 **조용히 통과시키지 않는다** — 마지막으로 읽은 값을 그대로 돌려주고
   `timeout` 을 세워, 그 값을 재는 항이 빨개지게 한다(기다림을 늘려 초록을 사는 자가 아니다).
   시한 뒤 `waitLate` 가 쌓이면 «⑦ 대기 timeout 0건» 이 빨개진다. */
const WAIT_MS = 20000;
const waitLate = [];
const settleTo = async (p, sel, kind) => {
  const r = await p.evaluate(async ([s, k, lim]) => {
    const e = document.querySelector(s);
    if (!e) return { t: null, ms: -1, timeout: true };
    const want = (k === 'cp') ? (() => fmtB(cp())) : (() => fmt(S.dia));
    const t0 = performance.now();
    let hit = 0;
    while (performance.now() - t0 < lim) {
      hit = (e.textContent === want()) ? hit + 1 : 0;
      if (hit >= 2) return { t: e.textContent, ms: performance.now() - t0, timeout: false };
      await new Promise((r2) => requestAnimationFrame(r2));
    }
    return { t: e.textContent, ms: performance.now() - t0, timeout: true, want: want() };
  }, [sel, kind || 'dia', WAIT_MS]);
  if (r.timeout) waitLate.push(sel + ' → "' + r.t + '" (기대 "' + r.want + '", ' + WAIT_MS + 'ms 초과)');
  return r.t;
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* ── ① fitRoom 이 «부모가 내주는 폭» 을 돌려준다 ── */
  const room = await p.evaluate(() => {
    openShopPage();
    const q = (sel) => { const e = document.querySelector(sel); return e ? fitRoom(e) : -1; };
    return { pcb: q('#shopw .pcb-d>b'), dia: q('#diaN'), cp: cpRoom() };
  });
  await p.waitForTimeout(600);
  ck('① .pcb-d>b 그릇 = 알약 콘텐츠 폭 186.5 (254 − padding 53/14.5)', near(room.pcb, 186.5, 1), room.pcb + '');
  ck('① #diaN 그릇 = .cbox 콘텐츠 폭 201 (211 − padding-left 10)', near(room.dia, 201, 1), room.dia + '');
  /* .curs 좌단 583(= 1080 − right 26 − (211×2 + gap 49)) − cpN 좌단 − 여백 12 */
  ck('① #cpN 그릇 = .curs 좌단까지 (부모 .pcp 는 내용에 맞춰 늘어나 그릇이 아니다)',
    room.cp > 250 && room.cp < 420, room.cp.toFixed(1));

  /* ── ② 값이 여러 번 바뀌어도 안 줄어든다(래칫 없음) ── */
  const base = await p.evaluate(() => {
    const e = document.querySelector('#shopw .pcb-d>b');
    e.style.fontSize = ''; return parseFloat(getComputedStyle(e).fontSize);
  });
  const seq = [];
  for (const v of [178279, 38763, 5000, 12, 987654, 5000]) {
    await p.evaluate((v) => { S.dia = v; }, v);
    /* 417 — 여기도 옛날엔 900ms 고정 대기였다. hold 가 걸리면 **직전 값의 fs** 를 재고
       «안 줄었다» 로 초록이 됐다 = 래칫이 되살아나도 못 보는 헛초록. 값이 도착한 뒤에 잰다. */
    await settleTo(p, '#shopw .pcb-d>b');
    seq.push(await p.evaluate(() => {
      const e = document.querySelector('#shopw .pcb-d>b');
      return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize) };
    }));
  }
  const shrunk = seq.filter((s) => s.fs < base - 0.5);
  ck('② 값을 6번 갈아도 fs 가 CSS 원본(' + base + 'px) 그대로 — 래칫 없음',
    shrunk.length === 0, seq.map((s) => s.t + '→' + s.fs).join(' · '));

  /* ── ③ 같은 값이면 상점 바와 던전 바가 같은 크기 (verify81 밴드 diff 의 직접 원인) ── */
  await p.evaluate(() => { S.dia = 5000; if (typeof closeShopPage === 'function') closeShopPage(); openDungeon(); });
  /* 417 — «900ms 기다린다» 가 아니라 «값이 도착했는가» 로 묻는다.
     ⚠ 항이 무엇을 재는지는 안 무르게 둔다 — 도착을 기다리는 것은 **던전 알약이 제 값을 보이는가**
     뿐이고, 항이 단언하는 «같은 텍스트 · 같은 fs» 는 두 알약에서 그대로 따로 읽는다.
     (`renderPcb` 은 `.pcb-d>b` 를 **전부** 돌므로 닫힌 상점 알약도 같은 순간의 값을 들고 있다.) */
  await settleTo(p, '#dunw .pcb-d>b');
  const two = await p.evaluate(() => {
    const g = (sel) => { const e = document.querySelector(sel); return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize) }; };
    return { shop: g('#shopw .pcb-d>b'), dun: g('#dunw .pcb-d>b') };
  });
  ck('③ 같은 «' + two.shop.t + '» 이 상점·던전에서 같은 fs',
    two.shop.t === two.dun.t && near(two.shop.fs, two.dun.fs, 0.05),
    'shop ' + two.shop.fs + ' vs dun ' + two.dun.fs);

  /* ── ④ 상단 HUD 가 FITMIN 바닥에 눌어붙지 않는다 ── */
  /* 417 — 1500ms 고정 대기였다. HUD 도 같은 롤링·hold 를 타므로, 아직 안 따라온 **직전 값**을
     재면 «안 줄었다» 가 공짜로 초록이 된다(헛초록). 두 알약이 제 값을 보일 때까지 묻는다. */
  await settleTo(p, '#diaN');
  await settleTo(p, '#cpN', 'cp');
  const hud = await p.evaluate(() => {
    const g = (id) => { const e = document.getElementById(id);
      const csFs = parseFloat(getComputedStyle(e).fontSize);
      e.style.fontSize = ''; const b = parseFloat(getComputedStyle(e).fontSize);
      e.style.fontSize = ''; return { id, fs: csFs, base: b, t: e.textContent }; };
    return [g('cpN'), g('diaN')];
  });
  for (const h of hud)
    ck('④ #' + h.id + ' 가 CSS 원본 크기 (FITMIN 0.55 바닥 아님)',
      h.fs >= h.base - 0.5, 'fs=' + h.fs + ' base=' + h.base + ' t="' + h.t + '"');

  /* ── ⑤ 진짜 넘칠 때는 여전히 줄인다(150 의 «한 글자도 안 버린다») ── */
  await p.evaluate(() => { if (typeof closeDungeon === 'function') closeDungeon(); openShopPage(); S.dia = 987654321098765; });
  await settleTo(p, '#shopw .pcb-d>b');
  const big = await p.evaluate(async () => {
    const e = document.querySelector('#shopw .pcb-d>b');
    const rg = document.createRange(); rg.selectNodeContents(e);
    return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize),
      ink: rg.getBoundingClientRect().width, room: fitRoom(e) };
  });
  ck('⑤ 긴 값은 줄인다 (fs < CSS 원본)', big.fs < 34.5 - 0.5, 'fs=' + big.fs.toFixed(2) + ' t="' + big.t + '"');
  /* 15자리(쉼표 포함 19자)는 FITMIN 0.55 바닥(34.5×0.55 = 18.975)에 닿는 극단값이다 —
     바닥에 닿았으면 «더 줄일 수 없음» 이 규약이므로 잉크가 그릇을 넘는 것이 정상이다. */
  ck('⑤ 줄인 뒤 잉크가 그릇 안 (또는 FITMIN 바닥에 닿음)',
    big.ink <= big.room + 1.5 || big.fs <= 34.5 * 0.55 + 0.05,
    'ink=' + big.ink.toFixed(1) + ' room=' + big.room.toFixed(1) + ' fs=' + big.fs.toFixed(2) + ' (FITMIN 바닥 18.98)');
  ck('⑤ 자릿수를 하나도 안 버렸다', big.t.replace(/[^0-9]/g, '').length === 15, big.t);

  /* ── ⑤-b 바닥에 안 닿는 «적당히 긴» 값은 그릇 안에 정확히 들어간다 ── */
  await p.evaluate(() => { S.dia = 1234567890; });
  await settleTo(p, '#shopw .pcb-d>b');
  const mid = await p.evaluate(async () => {
    const e = document.querySelector('#shopw .pcb-d>b');
    const rg = document.createRange(); rg.selectNodeContents(e);
    return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize),
      ink: rg.getBoundingClientRect().width, room: fitRoom(e) };
  });
  ck('⑤-b 1,234,567,890 은 그릇 안에 들어간다',
    mid.ink <= mid.room + 1.5, 'ink=' + mid.ink.toFixed(1) + ' room=' + mid.room.toFixed(1) + ' fs=' + mid.fs.toFixed(2));

  /* ── ⑥ 긴 값 뒤에 짧은 값이 오면 원래 크기로 돌아온다(래칫 청소) ── */
  await p.evaluate(() => { S.dia = 5000; });
  await settleTo(p, '#shopw .pcb-d>b');
  const back = await p.evaluate(async () => {
    const e = document.querySelector('#shopw .pcb-d>b');
    return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize), inline: e.style.fontSize };
  });
  ck('⑥ 긴 값 → 짧은 값이면 CSS 원본으로 복귀', near(back.fs, 34.5, 0.5), 'fs=' + back.fs + ' t="' + back.t + '"');
  ck('⑥ 짧은 값에는 인라인 style 을 남기지 않는다(150 주석의 자기 규약)', back.inline === '', '"' + back.inline + '"');

  /* ── ⑦ 417 — 위 항들이 «값이 도착한 뒤» 를 잰 것이 맞는가 ──
     대기가 시한을 넘겼다면 그 항이 잰 것은 직전 값이다. 조용히 넘어가지 않게 여기서 센다. */
  ck('⑦ 표시 도착 대기가 시한(' + WAIT_MS + 'ms) 안에 전부 닿았다 — 직전 값을 잰 항 0건',
    waitLate.length === 0, waitLate.join(' | ').slice(0, 300) || '0건');

  /* ── §R 되돌림 시험 (417) ──
     이 절이 없으면 위 수리는 «기다림을 늘려 산 초록» 과 구별되지 않는다.
     [R-a] 옛 술어(«3번 연속 같으면 다 됐다»)는 hold 구간에서 **직전 값**을 돌려준다
           = 417 이 되살아나는 그 순간을 게이트가 직접 본다.
     [R-b] 같은 자리에서 새 술어는 목표값을 준다.
     [R-c] 제품이 표시를 안 갱신하면 새 술어는 timeout 을 준다(무한 대기·헛초록 아님).
     [R-d] 클램프를 떼면 ⑤ 판정식이 실제로 빨개진다(항이 공허하지 않다는 증명). */
  const R = await p.evaluate(async () => {
    const e = document.querySelector('#shopw .pcb-d>b');
    const BIG = 987654321098765;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    /* 제품이 스스로 거는 것과 같은 손잡이를 같은 값으로 걸어 «안 변하는 구간» 을 결정적으로 만든다 */
    const arm = () => { S.dia = 5000; fxHold.dia = 0; };
    /* R-a: 옛 술어 재현 (150ms × 3연속 동일)
       ⚠ 두 가지를 안 지키면 **이 항 자신이 플레이키**가 된다(1회차에 실제로 그랬다):
         ① 텍스트와 fs 를 **같은 순간에** 스냅해야 한다 — 루프를 빠져나온 «뒤» 에 fs 를 읽으면
            그 사이에 hold 가 풀려 이미 줄어든 글자를 재고 «옛 술어가 stale 을 안 줬다» 로 읽힌다.
         ② hold 길이를 **폴 비용에서 역산**해야 한다 — 부하가 걸리면 폴 한 번이 150ms 보다
            훨씬 길어져, 고정 1500ms 는 옛 술어의 창(4폴)보다 먼저 풀려 재현 창 자체가 사라진다. */
    S.dia = 5000; fxHold.dia = 0; await sleep(1200);
    const tp = performance.now();
    for (let i = 0; i < 3; i++) { void e.textContent; await sleep(150); }
    const poll = (performance.now() - tp) / 3;                 /* 이 실행에서 폴 한 번의 실제 비용 */
    const holdMs = Math.min(12000, Math.max(2500, poll * 10)); /* 옛 술어는 4폴에 빠져나온다 */
    fxHold.dia = performance.now() + holdMs; S.dia = BIG;
    let last = null, same = 0, snap = null;
    for (let i = 0; i < 60 && same < 3; i++) {
      const t = e.textContent, fs = parseFloat(getComputedStyle(e).fontSize);   /* ① 같은 순간 */
      same = (t === last) ? same + 1 : 0; last = t;
      snap = { t, fs, held: fxHold.dia > performance.now() };
      await sleep(150);
    }
    const oldRead = snap.t, oldFs = snap.fs, oldHeld = snap.held, pollMs = poll;
    fxHold.dia = 0;
    /* R-b: 새 술어 */
    const t0 = performance.now(); let hit = 0, newRead = null, newTimeout = true;
    while (performance.now() - t0 < 20000) {
      hit = (e.textContent === fmt(S.dia)) ? hit + 1 : 0;
      if (hit >= 2) { newRead = e.textContent; newTimeout = false; break; }
      await frame();
    }
    const newFs = parseFloat(getComputedStyle(e).fontSize);
    /* R-c: 표시 갱신을 멈춘 채 새 술어를 짧은 시한으로 */
    const keepTick = fxTick; fxTick = () => {};
    S.dia = 42; await sleep(200);
    let hit2 = 0, timedOut = true; const t1 = performance.now();
    while (performance.now() - t1 < 1500) {
      hit2 = (e.textContent === fmt(S.dia)) ? hit2 + 1 : 0;
      if (hit2 >= 2) { timedOut = false; break; }
      await frame();
    }
    fxTick = keepTick;
    /* R-d: 클램프를 떼면 긴 값에서 fs 가 안 줄어든다 */
    const keepFit = fitNum; fitNum = () => {};
    arm(); e.style.fontSize = ''; await sleep(600);
    S.dia = BIG; fxHold.dia = 0;
    const t2 = performance.now(); let hit3 = 0;
    while (performance.now() - t2 < 20000) {
      hit3 = (e.textContent === fmt(S.dia)) ? hit3 + 1 : 0;
      if (hit3 >= 2) break;
      await frame();
    }
    const mutFs = parseFloat(getComputedStyle(e).fontSize);
    const mutText = e.textContent;
    fitNum = keepFit;
    S.dia = 5000; e.style.fontSize = '';
    return { oldRead, oldFs, oldHeld, pollMs, newRead, newTimeout, newFs, timedOut, mutFs, mutText };
  });
  ck('[R-a] 옛 술어(«3번 연속 같으면 끝»)는 hold 구간에서 직전 값 «5,000» 을 돌려준다 — 417 재발 감지',
    R.oldRead === '5,000' && R.oldFs > 34 && R.oldHeld === true,
    '읽은 값 "' + R.oldRead + '" fs=' + R.oldFs + ' · 빠져나온 순간 hold 살아 있음=' + R.oldHeld
    + ' · 이 실행의 폴 비용 ' + R.pollMs.toFixed(0) + 'ms');
  ck('[R-b] 같은 자리에서 새 술어는 목표값(15자리)을 준다',
    !R.newTimeout && String(R.newRead).replace(/[^0-9]/g, '').length === 15 && R.newFs < 34,
    '"' + R.newRead + '" fs=' + R.newFs);
  ck('[R-c] 표시 갱신이 멈추면 새 술어는 시한 안에 «닿음» 을 못 준다(무한 대기·헛초록 아님)',
    R.timedOut === true, 'timeout=' + R.timedOut);
  ck('[R-d] 클램프(fitNum)를 떼면 긴 값에서 fs 가 CSS 원본 그대로 = ⑤ 가 빨개진다',
    R.mutFs > 34 && String(R.mutText).replace(/[^0-9]/g, '').length === 15,
    'fs=' + R.mutFs + ' t="' + R.mutText + '"');

  ck('콘솔 에러 0', errs.length === 0, errs.join(' | ').slice(0, 300));
  console.log('VERIFY235 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
