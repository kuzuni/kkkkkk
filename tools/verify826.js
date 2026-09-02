#!/usr/bin/env node
/* 게이트 — 작업 826 「34 축복 팝업의 닫기 ✕ 는 프레임이 아니라 **그릇(`.bls`)** 에 붙는다」
 *
 *   node tools/verify826.js
 *
 * 754 규약 ②(«한 오버레이 = 한 그릇 · 요소별 개별 앵커 금지»)를 이 화면에서 지키는 자다.
 *
 *   §1 소속  — ✕ 는 `.bls` 의 자식이고, 두 자리(코너·스트립 아래) 다 **그릇 기준 좌표**로 적힌다.
 *   §2 자리  — 그려지는 자리는 프레임 5종에서 수리 전과 **Δ0px**(826 은 좌표계만 바꿨다).
 *   §3 따라옴 — 그릇을 움직이면 ✕ 가 **같은 만큼** 따라온다. 이것이 규약 ② 의 실질이다.
 *              (821 이 그릇을 126 에 못박기 전, 이 자리가 1841 에서 63.5px 벌어졌다 — `probe826` [C].)
 *   §4 짝    — 351·423·754·821 이 세운 넷을 안 깼다: 블록이 프레임에 들어오고(351 회수),
 *              스트립이 짧은 프레임에서만 닫고(423), 스트립이 마지막 흐름 자식이며(754),
 *              그릇 곡선에 계단이 없다(821).
 *   §R 되돌림 시험 — 826 을 되돌린 사본에서 §1·§3 이 빨개진다(무르게 푼 수리가 아님을 못박는다).
 *
 * ⚠ 이 자는 «경계에서 ✕ 가 자리를 옮기는 것 자체» 는 결함으로 안 본다 — 그것은 351 의 설계이고
 *   없앨 수 없다(1600 에서 스트립 아래 자리는 프레임 밖이다 · `probe826` [D1]). 826 이 고친 것은
 *   **두 자리를 무엇에 매다는가** 다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'index.html');

/* 826 의 다섯 자리 — 못 찾으면 조용히 초록이 되지 않고 그렇게 말하고 죽는다(neg279 처방). */
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
/* 821 의 한 줄 — §3 «따라옴» 은 이것을 떼어 그릇을 움직여서 잰다. */
const FIX821 = '  #app.shortf #blsw .bls{margin-top:0}\n';

function src() {
  const s = fs.readFileSync(SRC, 'utf8');
  for (const [n, k] of [['✕ 기본 좌표', N_X], ['✕ shortf 좌표', N_XS], ['스트립 auto', N_PROMO],
    ['긴 프레임 아래 가드', N_PB], ['✕ 의 DOM 자리', N_DOM], ['821 한 줄', FIX821]]) {
    if (!s.includes(k)) { console.error(`verify826: «${n}» 자리를 못 찾았다. 자를 고쳐라.`); process.exit(3); }
  }
  return s;
}
/* 826 을 통째로 되돌린 사본 = 수리 전 트리 */
const pre826 = (s) => s.replace(N_X, O_X).replace(N_XS, O_XS).replace(N_PROMO, O_PROMO)
  .replace(N_PB, '').replace(N_DOM, O_DOM);

function tmp(name, text) {
  const f = path.join(os.tmpdir(), 'verify826-' + name + '.html');
  fs.writeFileSync(f, text);
  return 'file://' + f;
}

let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log('  ok  ' + m + (d ? ' — ' + d : '')); };
const no = (m, d) => { fail++; console.log('FAIL  ' + m + (d ? ' — ' + d : '')); };
const t = (c, m, d) => (c ? ok(m, d) : no(m, d));
const r1 = (n) => Math.round(n * 10) / 10;
const eq = (m, got, want, tol) => t(Math.abs(got - want) <= (tol === undefined ? 0.6 : tol), m, `${r1(got)} (기대 ${want})`);

const FRAMES = [1600, 1841, 1842, 1920, 2280, 2600];
/* 레퍼런스 절대값(측정표 34) — 그릇 기준 오프셋 둘. 이 둘이 826 의 전부다. */
const OFF_CORNER = { l: 856, t: 8 };    /* 짧은 프레임 — `.bls` 테두리 상자 기준(left 848 + 테두리 8 / top 0 + 8) */
const OFF_BELOW = { l: 430, t: 1448 };  /* 긴 프레임 — 스트립 아래 중앙 */

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
    await page.waitForTimeout(450);
    out[H] = await page.evaluate(() => {
      const el = document.getElementById('app');
      const app = el.getBoundingClientRect();
      const w = document.getElementById('blsw');
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
        return { t: r.top - app.top, b: r.bottom - app.top, l: r.left - app.left, r: r.right - app.left }; };
      const x = document.querySelector('.bls-x');
      const p = x && x.parentElement;
      /* 흐름 자식 = `#blsw` 의 직계 자식 중 out-of-flow 가 아닌 것 */
      const flow = [...w.children].filter((e) => getComputedStyle(e).position !== 'absolute')
        .map((e) => (e.className || e.id || '?').toString().split(' ')[0]);
      return {
        frameH: Math.round(app.height), shortf: el.classList.contains('shortf'), open: w.classList.contains('on'),
        bls: box('.bls'), x: box('.bls-x'), promo: box('.bls-promo'),
        xParent: p ? (p.id || String(p.className).split(' ')[0]) : null,
        xPos: x ? getComputedStyle(x).position : null,
        flow, over: w.scrollHeight - w.clientHeight,
        promoPE: getComputedStyle(document.querySelector('.bls-promo')).pointerEvents,
        xCloses: (() => { const b = document.querySelector('.bls-x'); if (!b) return false; b.click();
          const shut = !w.classList.contains('on'); w.classList.add('on'); return shut; })(),
        errs: [],
      };
    });
    out[H].errs = errs;
    await ctx.close();
  }
  return out;
}

(async () => {
  const S = src();
  const browser = await launch(chromium);
  console.log('== VERIFY826 — 34 축복 닫기 ✕ 의 앵커(754 규약 ②) ==\n');
  const M = await measure(browser, 'file://' + SRC, FRAMES);

  t(FRAMES.every((h) => M[h].open && M[h].x), '[0] 여섯 프레임 모두 축복 팝업이 열리고 ✕ 가 있다',
    FRAMES.map((h) => h + (M[h].open ? '✓' : '✗')).join(' '));

  /* ---- §1 소속 ---- */
  console.log('\n§1 소속 — ✕ 는 그릇의 자식인가');
  t(FRAMES.every((h) => M[h].xParent === 'bls'), '[1-a] 여섯 프레임 모두 ✕ 의 부모가 `.bls` 다(규약 ② «한 그릇»)',
    FRAMES.map((h) => `${h}:.${M[h].xParent}`).join(' '));
  t(FRAMES.every((h) => M[h].xPos === 'absolute'), '[1-b] 두 자리 다 `position:absolute` — 흐름에는 어느 프레임에서도 없다',
    FRAMES.map((h) => `${h}:${M[h].xPos}`).join(' '));
  t(FRAMES.every((h) => M[h].flow.length === 2 && M[h].flow[0] === 'bls' && M[h].flow[1] === 'bls-promo'),
    '[1-c] 그래서 `#blsw` 의 흐름 자식은 어느 프레임에서든 «팝업 + 스트립» 둘뿐이다(754 의 마지막 자식 전제)',
    `1600 [${M[1600].flow}] · 2280 [${M[2280].flow}]`);
  /* 좌표가 «그릇 기준» 임을 값으로 — 프레임이 달라도 그릇 대비 오프셋이 한 쌍뿐이다. */
  for (const h of [1600, 1841]) {
    eq(`[1-d:${h}] 짧은 프레임 오프셋 좌`, M[h].x.l - M[h].bls.l, OFF_CORNER.l);
    eq(`[1-d:${h}] 짧은 프레임 오프셋 상`, M[h].x.t - M[h].bls.t, OFF_CORNER.t);
  }
  for (const h of [1842, 1920, 2280, 2600]) {
    eq(`[1-e:${h}] 긴 프레임 오프셋 좌`, M[h].x.l - M[h].bls.l, OFF_BELOW.l);
    eq(`[1-e:${h}] 긴 프레임 오프셋 상`, M[h].x.t - M[h].bls.t, OFF_BELOW.t);
  }

  /* ---- §2 자리 — 수리 전과 Δ0px ---- */
  console.log('\n§2 자리 — 수리 전(826 되돌림) 트리와 대조');
  const P = await measure(browser, tmp('pre826', pre826(S)), FRAMES);
  for (const h of FRAMES) {
    console.log(`    ${h} : ✕ ${r1(M[h].x.t)}..${r1(M[h].x.b)} / x ${r1(M[h].x.l)}  (수리 전 ${r1(P[h].x.t)}..${r1(P[h].x.b)} / ${r1(P[h].x.l)})`);
  }
  t(FRAMES.every((h) => Math.abs(M[h].x.t - P[h].x.t) < 0.6 && Math.abs(M[h].x.l - P[h].x.l) < 0.6),
    '[2-a] ✕ 가 그려지는 자리는 5종+경계 전부 Δ0px', FRAMES.map((h) => `${h}:${r1(M[h].x.t - P[h].x.t)}`).join(' '));
  t(FRAMES.every((h) => Math.abs(M[h].bls.t - P[h].bls.t) < 0.6 && Math.abs(M[h].promo.t - P[h].promo.t) < 0.6),
    '[2-b] 그릇·스트립도 Δ0px — 흐름에서 빠진 143px 을 아래 가드가 정확히 대신 냈다',
    FRAMES.map((h) => `${h}:${r1(M[h].bls.t - P[h].bls.t)}/${r1(M[h].promo.t - P[h].promo.t)}`).join(' '));
  eq('[2-c] 1920 그릇 상변(9:16)', M[1920].bls.t, 165);
  eq('[2-d] 2280 그릇 상변(기준 9:19)', M[2280].bls.t, 345);
  eq('[2-e] 2600 그릇 상변', M[2600].bls.t, 505);

  /* ---- §3 따라옴 — 규약 ② 의 실질 ---- */
  console.log('\n§3 따라옴 — 그릇을 움직이면 ✕ 가 따라오는가(821 의 한 줄을 뗀 사본)');
  const MOV = await measure(browser, tmp('moved-grail', S.replace(FIX821, '')), [1600, 1841]);
  const PMOV = await measure(browser, tmp('pre826-moved', pre826(S).replace(FIX821, '')), [1600, 1841]);
  for (const h of [1600, 1841]) {
    console.log(`    ${h} : 그릇 ${r1(MOV[h].bls.t)} · ✕ ${r1(MOV[h].x.t)} · Δ ${r1(MOV[h].x.t - MOV[h].bls.t)}`
      + `   (수리 전 그릇 ${r1(PMOV[h].bls.t)} · ✕ ${r1(PMOV[h].x.t)} · Δ ${r1(PMOV[h].x.t - PMOV[h].bls.t)})`);
  }
  for (const h of [1600, 1841]) {
    eq(`[3-a:${h}] 그릇이 어디로 가든 ✕ 는 그릇 상변 +8`, MOV[h].x.t - MOV[h].bls.t, OFF_CORNER.t);
    t(MOV[h].x.t > MOV[h].bls.t, `[3-b:${h}] ✕ 가 그릇 상변 위로 떠 딤에 얹히지 않는다`,
      `✕ ${r1(MOV[h].x.t)} > 그릇 ${r1(MOV[h].bls.t)}`);
  }
  t(PMOV[1841].x.t < PMOV[1841].bls.t && Math.abs(PMOV[1841].bls.t - PMOV[1841].x.t - 63.5) < 1,
    '[3-c] ⚑ **수리 전 트리는 같은 자리에서 63.5px 벌어진다** — 이 항이 826 이 고친 것의 전부다',
    `수리 전 그릇 ${r1(PMOV[1841].bls.t)} − ✕ ${r1(PMOV[1841].x.t)} = ${r1(PMOV[1841].bls.t - PMOV[1841].x.t)}px`);

  /* ---- §4 짝(351·423·754·821) ---- */
  console.log('\n§4 짝 — 앞 넷을 안 깼다');
  t(FRAMES.every((h) => M[h].over <= 1), '[4-a] 351 — 전 프레임에서 블록이 프레임에 들어온다(스크롤 0)',
    FRAMES.map((h) => `${h}:${M[h].over}`).join(' '));
  t(FRAMES.every((h) => M[h].x.t >= 0 && M[h].x.b <= M[h].frameH + 0.6 && M[h].x.t >= 126 - 0.6),
    '[4-b] 351 — ✕ 가 프레임 안이고 HUD 가드(126) 아래',
    FRAMES.map((h) => `${h}:${r1(M[h].x.t)}..${r1(M[h].x.b)}`).join(' '));
  t(FRAMES.every((h) => (M[h].promoPE === 'none') === M[h].shortf),
    '[4-c] 423 — «스트립이 닫는다» 가 ✕ 가 코너로 간 프레임에서만 켜진다',
    FRAMES.map((h) => `${h}:${M[h].shortf ? 'shortf' : '-'}/${M[h].promoPE}`).join(' '));
  t(FRAMES.every((h) => M[h].xCloses), '[4-d] ✕ 를 누르면 여섯 프레임 전부 닫힌다(DOM 이동이 핸들러를 안 끊었다)',
    FRAMES.map((h) => `${h}:${M[h].xCloses ? '✓' : '✗'}`).join(' '));
  eq('[4-e] 821 — 경계(1841↔1842)에 그릇 계단이 없다', M[1842].bls.t - M[1841].bls.t, 0);

  /* ---- §R 되돌림 시험 ---- */
  console.log('\n§R 되돌림 시험 — 826 을 되돌리면 §1·§3 이 빨개진다');
  t(P[1600].xParent === 'blsw' && P[2280].xParent === 'blsw',
    '[R-a] 되돌린 사본에서 ✕ 는 그릇 밖(`#blsw` 형제)이다 ⇒ [1-a] 는 공허하지 않다',
    `1600 #${P[1600].xParent} · 2280 #${P[2280].xParent}`);
  t(P[2280].xPos === 'relative' && P[2280].flow.length === 3,
    '[R-b] 되돌린 사본에서 긴 프레임의 ✕ 는 흐름 자식이다 ⇒ [1-b][1-c] 도 공허하지 않다',
    `2280 position ${P[2280].xPos} · 흐름 [${P[2280].flow}]`);
  t(Math.abs(PMOV[1841].x.t - P[1841].x.t) < 0.6,
    '[R-c] 되돌린 사본에서는 그릇을 움직여도 ✕ 가 **한 픽셀도 안 따라온다** ⇒ [3-a] 도 공허하지 않다',
    `그릇 ${r1(P[1841].bls.t)}→${r1(PMOV[1841].bls.t)} 인데 ✕ ${r1(P[1841].x.t)}→${r1(PMOV[1841].x.t)}`);
  /* 아래 가드 보상을 뺀 사본 — 넣지 않았으면 긴 프레임이 71.5px 올라갔다는 것을 값으로 */
  const NOPB = await measure(browser, tmp('nopb', S.replace(N_PB, '')), [2280]);
  t(Math.abs(NOPB[2280].bls.t - M[2280].bls.t - 71.5) < 1,
    '[R-d] 아래 가드 289 를 빼면 긴 프레임이 정확히 71.5px 내려간다(= 흐름에서 빠진 143 ÷ 2) ⇒ [2-b] 도 공허하지 않다',
    `2280 그릇 ${r1(NOPB[2280].bls.t)} (지금 ${r1(M[2280].bls.t)})`);

  const errs = FRAMES.map((h) => M[h].errs).flat();
  t(errs.length === 0, '[5] 콘솔 런타임 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY826 ${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
