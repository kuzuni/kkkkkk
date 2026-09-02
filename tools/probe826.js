#!/usr/bin/env node
/* 재현기 — 작업 826 「34 축복 팝업의 닫기 ✕ 가 `.shortf` 경계에서 앵커를 갈아탄다 (754 규약 ② 위반)」
 *
 *   node tools/probe826.js
 *
 * 338·341·402·414·821 규칙: **처방을 따르기 전에 재현한다.** 이 자는 제품을 안 고친다 — 사본을 만들어 값만 찍는다.
 * 등재문(754 8회차, 비평가 CJ·CK 2인 일치)의 세 문장을 각각 픽셀로 되묻는다:
 *
 *   ① «1841 에서 ✕ 가 그릇 상변보다 63.5px 위로 떠 딤에 얹힌다»
 *      → 등재 시각(2026-09-02 14:43Z)에는 참이었다. 그 **뒤에** 821 이 `#app.shortf #blsw .bls{margin-top:0}`
 *        한 줄로 그릇을 126 에 못박아 **증상만** 껐다. [A] 가 수리 전(826) 트리에서 그것을 찍는다.
 *   ② «경계에서 Δx −426 · Δy +1479px 로 앵커를 갈아탄다» → 참이다. [B] 가 **인접한 1841 ↔ 1842** 에서 다시 잰다.
 *   ③ «요소별 개별 앵커 — 규약 ② 위반» → **이것이 본체다.** [C] 가 821 의 한 줄을 뗀 사본에서
 *        «그릇만 움직이고 ✕ 는 제자리» 를 직접 만든다(63.5px 이 그 자리에서 되살아난다).
 *        821 은 증상을 껐을 뿐 커플링(가드 126 ↔ 프레임 상수 134)은 그대로였다.
 *   그리고 [D] — «점프 자체를 없앤다» 는 길은 산수로 막혀 있다(351 의 148px 회수와 정면 충돌).
 *   [E] — 수리 뒤 트리에서 같은 [C] 를 다시 해 «✕ 가 그릇을 따라온다» 를 확인한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'index.html');

/* 821 이 넣은 한 줄 — 이것을 떼면 «그릇이 움직이는» 트리가 된다. */
const FIX821 = '  #app.shortf #blsw .bls{margin-top:0}\n';

/* ── 826 되돌리기(수리 전 트리 복원) — CSS 넷 + DOM 한 자리 ─────────────────────────── */
const N_X = '  .bls-x{position:absolute;left:422px;top:1440px;margin:0;';
const O_X = '  .bls-x{flex:none;position:relative;top:16px;margin:5px 0 auto;';
const N_XS = '  #app.shortf .bls-x{left:848px;top:0}';
const O_XS = '  #app.shortf .bls-x{position:absolute;top:134px;right:45px;margin:0}';
const N_PROMO = '  .bls-promo{position:relative;flex:none;margin-top:21px;margin-bottom:auto;';
const O_PROMO = '  .bls-promo{position:relative;flex:none;margin-top:21px;';
const N_PB = '  #app:not(.shortf) #blsw{padding-bottom:289px}\n';
const N_DOM = `      <div class="bls-x" id="blsX">✕</div>
    </div>
    <div class="bls-promo">
      <s class="ic">⚔️❤️⚡</s>
      <s class="tx">자동으로 모든 축복 받기</s>
      <button class="gb" id="blsAll">이동</button>
    </div>
`;
const O_DOM = `    </div>
    <div class="bls-promo">
      <s class="ic">⚔️❤️⚡</s>
      <s class="tx">자동으로 모든 축복 받기</s>
      <button class="gb" id="blsAll">이동</button>
    </div>
    <div class="bls-x" id="blsX">✕</div>
`;

function src() {
  const s = fs.readFileSync(SRC, 'utf8');
  for (const [n, k] of [['821 한 줄', FIX821], ['826 ✕ 기본', N_X], ['826 ✕ shortf', N_XS],
    ['826 스트립 auto', N_PROMO], ['826 아래 가드', N_PB], ['826 DOM 자리', N_DOM]]) {
    if (!s.includes(k)) {
      console.error(`probe826: «${n}» 자리를 못 찾았다 — 제품이 바뀌었다. 자를 고쳐라(neg279 처방).`);
      process.exit(3);
    }
  }
  return s;
}
/* 826 수리를 통째로 되돌린 사본 = «등재 당시의 트리» */
const pre826 = (s) => s.replace(N_X, O_X).replace(N_XS, O_XS).replace(N_PROMO, O_PROMO)
  .replace(N_PB, '').replace(N_DOM, O_DOM);

function tmp(name, text) {
  const f = path.join(os.tmpdir(), 'probe826-' + name + '.html');
  fs.writeFileSync(f, text);
  return 'file://' + f;
}

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = (n) => Math.round(n * 10) / 10;

const FRAMES = [1600, 1841, 1842, 1920, 2280, 2600];

async function measure(browser, url, hs) {
  const out = {};
  for (const H of hs) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
    await page.waitForTimeout(400);
    out[H] = await page.evaluate(() => {
      const el = document.getElementById('app');
      const app = el.getBoundingClientRect();
      const w = document.getElementById('blsw');
      const box = (s) => {
        const e = document.querySelector(s); if (!e) return null;
        const r = e.getBoundingClientRect();
        return { t: r.top - app.top, b: r.bottom - app.top, l: r.left - app.left, r: r.right - app.left };
      };
      const x = document.querySelector('.bls-x');
      const p = x && x.parentElement;
      return {
        frameH: Math.round(app.height), shortf: el.classList.contains('shortf'),
        bls: box('.bls'), x: box('.bls-x'), promo: box('.bls-promo'),
        /* ✕ 의 **DOM 소속** — 규약 ②(한 오버레이 = 한 그릇)를 구조로 되묻는 축이다. */
        xParent: p ? (p.id || p.className) : null,
        over: w ? (w.scrollHeight - w.clientHeight) : null, errs: [],
      };
    });
    out[H].errs = errs;
    await ctx.close();
  }
  return out;
}

(async () => {
  const browser = await launch(chromium);
  const S = src();
  const PRE = tmp('pre826', pre826(S));

  /* ---- [A] 수리 전 트리 — 등재문 ① 을 되묻는다 ---- */
  const pre = await measure(browser, PRE, FRAMES);
  console.log('[A] 수리 전(826 되돌림) 트리 — `.bls` 상변 / ✕ 상변 / Δ / ✕ 의 부모');
  for (const h of FRAMES) {
    const n = pre[h];
    console.log(`    ${h}${n.shortf ? ' (shortf)' : '        '} : bls ${r1(n.bls.t)} · ✕ ${r1(n.x.t)} · Δ ${r1(n.x.t - n.bls.t)} · 부모 #${n.xParent}`);
  }
  ok(pre[1841].x.t > pre[1841].bls.t,
    '[A1] ⚑ 등재문 ①(«1841 에서 ✕ 가 그릇 상변보다 63.5px 위») 은 **등재 이후 닫혔다** — 821 이 그릇을 못박았다',
    `bls 상변 ${r1(pre[1841].bls.t)} · ✕ 상변 ${r1(pre[1841].x.t)} (등재 시각에는 197.5 ↔ 134)`);
  ok(pre[1841].xParent === 'blsw',
    '[A2] 그러나 ✕ 는 여전히 **그릇 밖**(`#blsw` 의 형제 자식)이다 — 규약 ② 가 보는 자리',
    `부모 #${pre[1841].xParent}`);

  /* ---- [B] 등재문 ② — 경계 점프 ---- */
  const dx = pre[1842].x.l - pre[1841].x.l, dy = pre[1842].x.t - pre[1841].x.t;
  ok(Math.abs(dx) > 400 && Math.abs(dy) > 1400,
    '[B1] 등재문 ②(경계에서 ✕ 가 자리를 갈아탄다) 는 참이다 — 인접 1841 ↔ 1842',
    `Δx ${r1(dx)} · Δy ${r1(dy)} (등재문은 1841↔1920 을 견줘 Δy 1479 로 적었다)`);

  /* ---- [C] 등재문 ③ — 규약 ② 위반의 기계적 증거 ----
     821 의 한 줄을 떼어 «그릇이 움직이는» 트리를 만든다. 프레임 앵커라면 ✕ 는 안 따라온다. */
  const preNo821 = await measure(browser, tmp('pre826-no821', pre826(S).replace(FIX821, '')), [1600, 1841]);
  console.log('\n[C] 수리 전 트리 + 821 제거 — 그릇만 움직이고 ✕ 는 제자리인가');
  for (const h of [1600, 1841]) {
    const n = preNo821[h];
    console.log(`    ${h} : bls ${r1(n.bls.t)} · ✕ ${r1(n.x.t)} · Δ ${r1(n.x.t - n.bls.t)}`);
  }
  ok(Math.abs(preNo821[1841].x.t - pre[1841].x.t) < 0.6,
    '[C1] ⚑ 그릇을 움직여도 ✕ 는 **한 픽셀도 안 따라온다** — 프레임 상수(top:134)에 붙어 있다',
    `✕ 상변 ${r1(preNo821[1841].x.t)} (그릇을 못박은 트리 ${r1(pre[1841].x.t)})`);
  ok(preNo821[1841].x.t < preNo821[1841].bls.t,
    '[C2] 그래서 등재문 ① 의 «63.5px 위로 떠 딤에 얹힌다» 가 그 자리에서 되살아난다',
    `bls 상변 ${r1(preNo821[1841].bls.t)} − ✕ 상변 ${r1(preNo821[1841].x.t)} = ${r1(preNo821[1841].bls.t - preNo821[1841].x.t)}px`);
  ok(Math.abs(preNo821[1841].bls.t - preNo821[1600].bls.t) > 50 && Math.abs(preNo821[1841].x.t - preNo821[1600].x.t) < 0.6,
    '[C3] 커플링의 모양 — 그릇 상변은 프레임을 타는데 ✕ 상변은 두 프레임에서 같은 값이다',
    `bls ${r1(preNo821[1600].bls.t)} → ${r1(preNo821[1841].bls.t)} · ✕ ${r1(preNo821[1600].x.t)} → ${r1(preNo821[1841].x.t)}`);

  /* ---- [D] «점프를 없앤다» 는 길은 막혀 있다 ----
     1600 에서 ✕ 를 긴 프레임 자리(스트립 아래)로 되돌리면 블록이 프레임을 넘는다. */
  const inflow = await measure(browser, tmp('inflow', S.replace(N_XS, '  #app.shortf .bls-x{}')), [1600]);
  const i16 = inflow[1600];
  ok(i16.x.b > i16.frameH,
    '[D1] ⚑ 1600 에서 ✕ 를 스트립 아래 자리로 되돌리면 프레임 밖으로 나간다 — **점프 제거는 351 의 148px 회수와 정면 충돌**',
    `✕ 하변 ${r1(i16.x.b)} > 프레임 ${i16.frameH} (넘침 ${r1(i16.x.b - i16.frameH)}px)`);
  console.log('    산수 — 가드 126 + 팝업 1157 + 21 + 스트립 249 + ✕ 138 + 아래 가드 16 = 1707 > 1600 (간격 0 으로도 못 들어간다)');

  /* ---- [E] 수리 뒤 — 같은 [C] 를 다시 한다 ---- */
  const now = await measure(browser, 'file://' + SRC, FRAMES);
  const nowNo821 = await measure(browser, tmp('now-no821', S.replace(FIX821, '')), [1600, 1841]);
  console.log('\n[E] 수리 뒤 트리 + 821 제거 — ✕ 가 그릇을 따라오는가');
  for (const h of [1600, 1841]) {
    const n = nowNo821[h];
    console.log(`    ${h} : bls ${r1(n.bls.t)} · ✕ ${r1(n.x.t)} · Δ ${r1(n.x.t - n.bls.t)}`);
  }
  ok(Math.abs((nowNo821[1841].x.t - nowNo821[1841].bls.t) - 8) < 0.6
    && Math.abs((nowNo821[1600].x.t - nowNo821[1600].bls.t) - 8) < 0.6,
    '[E1] ⚑ 그릇이 어디로 가든 ✕ 가 8px 아래에 붙어 따라온다 — 상수가 «✕ ↔ `.bls`» 한 쌍뿐이다',
    `1600 Δ ${r1(nowNo821[1600].x.t - nowNo821[1600].bls.t)} · 1841 Δ ${r1(nowNo821[1841].x.t - nowNo821[1841].bls.t)}`);
  ok(FRAMES.every((h) => Math.abs(now[h].x.t - pre[h].x.t) < 0.6 && Math.abs(now[h].x.l - pre[h].x.l) < 0.6
    && Math.abs(now[h].bls.t - pre[h].bls.t) < 0.6),
    '[E2] 그러면서 그려지는 자리는 5종 전부 **Δ0px** 다',
    FRAMES.map((h) => `${h}:${r1(now[h].x.t - pre[h].x.t)}/${r1(now[h].x.l - pre[h].x.l)}`).join(' '));
  ok(now[1600].xParent === 'bls' && now[2280].xParent === 'bls',
    '[E3] 그리고 ✕ 는 이제 그릇의 자식이다(규약 ② «한 오버레이 = 한 그릇»)',
    `1600 부모 .${now[1600].xParent} · 2280 부모 .${now[2280].xParent}`);

  /* ---- 콘솔 에러 ---- */
  const allErrs = FRAMES.map((h) => now[h].errs).flat();
  ok(allErrs.length === 0, '[F] 콘솔 런타임 에러 0건', allErrs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nPROBE826 ${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
