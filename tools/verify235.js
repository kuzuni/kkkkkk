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
   구르는 중에 재면 그 프레임의 자릿수를 재는 것이라 결정적이지 않다. 멎을 때까지 기다린다. */
const settle = async (p, sel) => {
  let last = null, same = 0;
  for (let i = 0; i < 60 && same < 3; i++) {
    const t = await p.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
    same = (t === last) ? same + 1 : 0; last = t;
    await p.waitForTimeout(150);
  }
  return last;
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
    await p.waitForTimeout(900);
    seq.push(await p.evaluate(() => {
      const e = document.querySelector('#shopw .pcb-d>b');
      return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize) };
    }));
  }
  const shrunk = seq.filter((s) => s.fs < base - 0.5);
  ck('② 값을 6번 갈아도 fs 가 CSS 원본(' + base + 'px) 그대로 — 래칫 없음',
    shrunk.length === 0, seq.map((s) => s.t + '→' + s.fs).join(' · '));

  /* ── ③ 같은 값이면 상점 바와 던전 바가 같은 크기 (verify81 밴드 diff 의 직접 원인) ── */
  const two = await p.evaluate(async () => {
    S.dia = 5000;
    const g = (sel) => { const e = document.querySelector(sel); return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize) }; };
    const shop = g('#shopw .pcb-d>b');
    if (typeof closeShopPage === 'function') closeShopPage();
    openDungeon();
    await new Promise((r) => setTimeout(r, 900));
    return { shop, dun: g('#dunw .pcb-d>b') };
  });
  await p.waitForTimeout(400);
  ck('③ 같은 «' + two.shop.t + '» 이 상점·던전에서 같은 fs',
    two.shop.t === two.dun.t && near(two.shop.fs, two.dun.fs, 0.05),
    'shop ' + two.shop.fs + ' vs dun ' + two.dun.fs);

  /* ── ④ 상단 HUD 가 FITMIN 바닥에 눌어붙지 않는다 ── */
  await p.waitForTimeout(1500);
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
  await settle(p, '#shopw .pcb-d>b');
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
  await settle(p, '#shopw .pcb-d>b');
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
  await settle(p, '#shopw .pcb-d>b');
  const back = await p.evaluate(async () => {
    const e = document.querySelector('#shopw .pcb-d>b');
    return { t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize), inline: e.style.fontSize };
  });
  ck('⑥ 긴 값 → 짧은 값이면 CSS 원본으로 복귀', near(back.fs, 34.5, 0.5), 'fs=' + back.fs + ' t="' + back.t + '"');
  ck('⑥ 짧은 값에는 인라인 style 을 남기지 않는다(150 주석의 자기 규약)', back.inline === '', '"' + back.inline + '"');

  ck('콘솔 에러 0', errs.length === 0, errs.join(' | ').slice(0, 300));
  console.log('VERIFY235 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
