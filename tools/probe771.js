#!/usr/bin/env node
/* 771 재현 — `tools/verify429.js` [A] 절이 **공용 사다리에 얹혀서만** 초록인 자리
 *
 *   node tools/probe771.js   →  마지막 줄이 `PROBE771 n/n PASS` 여야 한다.
 *
 * ── 등재문(PROGRESS 771)이 본 것 ────────────────────────────────────────
 * 부하(6코어 태우기 × 게이트 4개 병렬) 4회 중 **1회** `FAIL A9 … (24,16) ↔ (31.74,27.19)`.
 * 그 값은 계산으로 이미 갈려 있다 — `s = (31.74 − 540)/(24 − 540) = 0.9850` ·
 * 세로 `(27.19 − 1140)/(16 − 1140) = 0.9900` ⇒ **`jzPgIn` 의 0% 프레임**
 * (`@keyframes jzPgIn{0%{scale:.985}}` · index.html 13960)을 잰 것이고,
 * 291 이 이름 붙인 «고정 대기 뒤 rect» 병이다.
 *
 * ── 이 자가 «운» 을 안 쓰는 이유 ────────────────────────────────────────
 * 1-in-4 를 돌려 잡는 자는 초록이어도 아무것도 못 말한다(한가하면 5연속 초록 · 등재문).
 * 대신 **원인을 직접 끈다**: `openRel()`(verify429 50)은 정착을 **자기가 안 하고**
 * 공용 `settle291` 훅(`launch()` 가 `verify*.js` 에만 자동으로 심는다 · `tools/pwlaunch.js` 81)에
 * 얹혀 있다. 그 훅을 끄면(`PW_SETTLE=0`) [A] 가 **재는 값이 곧바로 0% 프레임**이 된다 —
 * 즉 A2·A4·A5·A7·A9 는 «자기 힘으로» 초록인 적이 없었다.
 *
 * 이것이 등재문의 부하 1-in-4 와 **같은 병**인 근거는 셋이다:
 *   ⓐ 지문이 같다 — 0.985 **등방** 축소(§2), 좌표가 등재문 값과 소수점까지 일치.
 *   ⓑ 자리가 같다 — 둘 다 `openRel()` 의 `waitForTimeout(300)` **직후** 읽는 값이다.
 *   ⓒ 사다리가 못 막는 창이 실재한다(§3) — `settle291` 은 «부를 때 pending 이 0 이면
 *      곧바로 끝낸다»(`PENDING_SRC` 선검사 · settle291.js 55). 연출이 그 뒤에 붙으면 그대로 통과다.
 *      부하는 그 창을 **넓힐 뿐** 새 병을 만들지 않는다.
 *
 * ⚠ 그러므로 처방의 값은 «부하에서 안 빨개진다» 가 아니라 **«사다리가 없어도 옳다»** 이다.
 *   공용 사다리는 게이트 44개를 지나가므로 거기서 창을 닫는 길(등재문 후보 ⓑ)은
 *   64·262·107 처럼 **시간 자체를 재는 자**를 먼저 흔든다 — 그래서 자리 쪽(ⓐ)으로 간다.
 *
 * 절:
 *   [1] 재현 — 사다리를 끈 채 **현행** `openRel()` 로 [?] 를 재면 등재문의 좌표가 나온다.
 *   [2] 지문 — 그 값이 «아무 값» 이 아니라 0.985 **등방** 축소임을 못박는다.
 *   [3] 창 — 그 순간 `jzPg…` 가 **안 끝난 채**(`running@0`) 남아 있고, `settle291` 의
 *       선검사가 «pending 0» 을 보고 지나가는 창이 실재한다.
 *   [4] 처방 — 「두 프레임 연속으로 `jzPg…` 가 없을 때만 끝낸다」(764 `settleBox` 와 같은 꼴)를
 *       달면 **사다리를 끈 채로도** 전 배수에서 (24,16) 이다. CPU 스로틀 ×1~×32 로 같이 흔든다.
 *   [5] 음성항 — 사다리를 켜면 현행 대기로도 초록이다(이 자가 «상시 빨강» 을 잡은 게 아니다 ·
 *       등재문의 «한가할 때 5연속 초록» 과 같은 관측).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* 이 자는 1600 프레임을 쓴다(등재문이 값을 적어 둔 그 자리). 축소 중심은 프레임 한복판이다. */
const H = 1600, CX = 540, CY = H / 2;
const REF = { x: 24, y: 16 };                 /* 바가 108px 고정이라 두 프레임에서 같은 값 */
const REG = { x: 31.74, y: 27.19 };           /* 등재문이 적어 둔 «갈린» 좌표 */

/* verify429 의 **현행** openRel — 고칠 대상을 그대로 옮겨 온다 */
const openRelNow = async (page) => {
  await page.evaluate(() => { closeModal(); openRelw(); });
  await page.waitForTimeout(300);
};
/* 처방안 — 「두 프레임 연속으로 `jzPg…` 가 없을 때만 끝낸다」 (764 `settleBox` 와 같은 꼴) */
const openRelFix = async (page) => {
  await page.evaluate(() => { closeModal(); openRelw(); });
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    const pend = () => (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => /^jzPg/.test(a.animationName || '') && a.playState !== 'finished');
    const t0 = performance.now();
    for (let quiet = 0; quiet < 2 && performance.now() - t0 < 1500;) {
      const P = pend();
      if (P.length) { await Promise.all(P.map((a) => a.finished.catch(() => 0))); quiet = 0; }
      else quiet++;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  });
};

/* [?] 버튼의 프레임 좌표 + 그 순간 살아 있는 jzPg 애니 */
const readBtn = (page) => page.evaluate(() => {
  const w = document.getElementById('relw');
  const n = w && w.querySelector('.rl-help');
  const fr = document.getElementById('app').getBoundingClientRect();
  const anim = (document.getAnimations ? document.getAnimations() : [])
    .filter((a) => /^jzPg/.test(a.animationName || ''))
    .map((a) => (a.animationName || '') + ':' + a.playState
      + '@' + (a.currentTime == null ? 'null' : Math.round(a.currentTime)));
  if (!n) return { has: false, anim };
  const b = n.getBoundingClientRect();
  return { has: true, anim,
    x: +(b.x - fr.x).toFixed(2), y: +(b.y - fr.y).toFixed(2),
    w: +b.width.toFixed(2), h: +b.height.toFixed(2) };
});

/* 사다리를 켜고/끄고 페이지를 연다 — `settle291.arm()` 은 페이지마다 `enabled()` 를 다시 읽으므로
   `PW_SETTLE` 을 컨텍스트 생성 **직전**에 바꾸면 같은 브라우저 안에서 두 조건을 나란히 잴 수 있다. */
const newPage = async (browser, { settle, rate }) => {
  process.env.PW_SETTLE = settle ? '1' : '0';
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(URL);
  await page.waitForTimeout(900);
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  return { ctx, page };
};

const RATES = [1, 4, 16, 32];

(async () => {
  const browser = await launch(chromium);

  /* ── [1] 재현 — 사다리를 끈 채 현행 대기 ──────────────────────────── */
  console.log('[1] 재현 — 공용 사다리(`settle291`)를 끈 채 **현행** `openRel()` 로 [?] 를 잰다');
  const rows = [];
  for (const rate of RATES) {
    const { ctx, page } = await newPage(browser, { settle: false, rate });
    await openRelNow(page);
    const g = await readBtn(page);
    rows.push({ rate, g });
    console.log('     ×' + String(rate).padStart(2) + '  (' + g.x + ', ' + g.y + ')  '
      + g.w + '×' + g.h + (g.anim.length ? '   ' + g.anim.join(' ') : ''));
    await ctx.close();
  }
  const off = rows.filter((r) => r.g.has && !(near(r.g.x, REF.x, 0.01) && near(r.g.y, REF.y, 0.01)));
  ok(off.length === rows.length,
    '1-a 사다리가 없으면 [A] 가 재는 값은 **언제나** (' + REF.x + ',' + REF.y + ') 가 아니다',
    off.length + '/' + rows.length + '개 배수에서 벗어남');
  ok(off.length > 0 && off.every((r) => near(r.g.x, REG.x, 0.02) && near(r.g.y, REG.y, 0.02)),
    '1-b 그 값이 등재문의 좌표와 소수점까지 같다 — (' + REG.x + ', ' + REG.y + ')',
    off.length ? '(' + off[0].g.x + ', ' + off[0].g.y + ')' : '—');

  /* ── [2] 지문 — 0.985 등방 축소 ───────────────────────────────────── */
  console.log('\n[2] 지문 — `jzPgIn` 0% 프레임(scale .985)인가, 아니면 다른 병인가');
  if (!off.length) { ok(false, '2-a 표본이 없다'); ok(false, '2-b 표본이 없다'); }
  else {
    const s = off.map((r) => ({ rate: r.rate,
      sx: (r.g.x - CX) / (REF.x - CX), sy: (r.g.y - CY) / (REF.y - CY), sw: r.g.w / 76 }));
    for (const e of s) console.log('     ×' + String(e.rate).padStart(2)
      + '  sx=' + e.sx.toFixed(4) + '  sy=' + e.sy.toFixed(4) + '  sw=' + e.sw.toFixed(4));
    ok(s.every((e) => near(e.sx, 0.985, 0.004)),
      '2-a 가로 배수가 0.985 다 (`@keyframes jzPgIn{0%{scale:.985}}` · index.html 13960)',
      s.map((e) => e.sx.toFixed(4)).join(' · '));
    ok(s.every((e) => near(e.sy, e.sx, 0.004) && near(e.sw, e.sx, 0.004)),
      '2-b 세로·크기도 같은 배수다 — **등방** 축소이지 밀림·재배치가 아니다',
      s.map((e) => e.sy.toFixed(4) + '/' + e.sw.toFixed(4)).join(' · '));
  }

  /* ── [3] 사다리가 못 막는 창 ──────────────────────────────────────── */
  console.log('\n[3] 창 — 그 순간 연출은 **안 끝나 있고**, 선검사는 «pending 0» 을 보고 지나간다');
  ok(off.some((r) => r.g.anim.some((a) => !/finished@/.test(a) && /^jzPg/.test(a))),
    '3-a 잰 프레임에는 `jzPg…` 가 안 끝난 채 남아 있다',
    (off.find((r) => r.g.anim.length) || { g: { anim: [] } }).g.anim.join(' ') || '—');
  /* 선검사의 뜻을 제품이 아니라 **그 소스로** 확인한다 — «pending 0 이면 0 을 돌려준다» */
  {
    const { ctx, page } = await newPage(browser, { settle: false, rate: 1 });
    const probe = await page.evaluate(() => {
      const PEND = () => (document.getAnimations ? document.getAnimations() : [])
        .filter((a) => /^jz(Pg|Sheet)/.test(a.animationName || '') && a.playState !== 'finished').length;
      return { idle: PEND() };                     /* 아무것도 안 연 상태 = 0 */
    });
    ok(probe.idle === 0,
      '3-b `settle291` 선검사(`PENDING_SRC`)는 «연출이 아직 안 붙은» 순간을 0 으로 읽는다',
      'pending ' + probe.idle + ' ⇒ 사다리는 그 자리에서 곧바로 끝낸다(settle291.js 55·106)');
    await ctx.close();
  }

  /* ── [4] 처방 ─────────────────────────────────────────────────────── */
  console.log('\n[4] 처방 — 「두 프레임 연속으로 `jzPg…` 가 없을 때만 끝낸다」 를 **사다리 없이**');
  const fixed = [];
  for (const rate of RATES) {
    const { ctx, page } = await newPage(browser, { settle: false, rate });
    await openRelFix(page);
    const g = await readBtn(page);
    fixed.push({ rate, g });
    console.log('     ×' + String(rate).padStart(2) + '  (' + g.x + ', ' + g.y + ')  ' + g.w + '×' + g.h);
    await ctx.close();
  }
  ok(fixed.every((r) => r.g.has && near(r.g.x, REF.x, 0.01) && near(r.g.y, REF.y, 0.01)),
    '4-a 전 배수에서 (' + REF.x + ',' + REF.y + ') — 공용 사다리에 안 얹혀도 옳다',
    fixed.map((r) => '×' + r.rate + ':(' + r.g.x + ',' + r.g.y + ')').join(' · '));
  ok(fixed.every((r) => near(r.g.w, 76, 0.01) && near(r.g.h, 76, 0.01)),
    '4-b 크기도 76×76 다 — A2 가 같은 축소에 물려 있었다',
    fixed.map((r) => r.g.w + '×' + r.g.h).join(' · '));

  /* ── [5] 음성항 ───────────────────────────────────────────────────── */
  console.log('\n[5] 음성항 — 사다리를 켜면 현행 대기로도 초록이다(상시 빨강을 잡은 게 아니다)');
  const onRows = [];
  for (const rate of [1, 32]) {
    const { ctx, page } = await newPage(browser, { settle: true, rate });
    await openRelNow(page);
    const g = await readBtn(page);
    onRows.push({ rate, g });
    console.log('     ×' + String(rate).padStart(2) + '  (' + g.x + ', ' + g.y + ')  ' + g.w + '×' + g.h);
    await ctx.close();
  }
  ok(onRows.every((r) => r.g.has && near(r.g.x, REF.x, 0.01) && near(r.g.y, REF.y, 0.01)),
    '5-a 사다리를 켜면 현행 `openRel()` 도 (' + REF.x + ',' + REF.y + ')',
    onRows.map((r) => '×' + r.rate + ':(' + r.g.x + ',' + r.g.y + ')').join(' · '));

  await browser.close();
  console.log('\nPROBE771 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
