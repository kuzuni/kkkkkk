#!/usr/bin/env node
/* 351 게이트 — 9:13.3(1080×1600) 가독성 루프 1회차가 고친 두 자리.
 *
 * 실행: node tools/verify351.js
 *
 * 잠그는 것 둘 (둘 다 «짧은 프레임에서만 갈리고 9:19 는 Δ0» 이 조건이다):
 *   §1 34 축복 — 블록(1842px)이 1600 에 242px 넘쳐 **닫기 ✕ 가 프레임 밖 112px** 이던 것.
 *   §2 08 영웅 — `.eqp` 가드가 **HUD 상자 104** 로 잡혀 있어 1600 에서 시트 상변이 104 에 붙고
 *      A3 꼬리판 `.pcp`(🔥 연속출석, 잉크 92..129)의 아래 25px 를 헤더가 덮던 것.
 *
 * §R 되돌림 시험 — 처방을 뺀 사본에서 **같은 항이 빨개지는지** 를 본다.
 *   이게 없으면 «이미 참인 것을 굳힌 게이트»(338 교훈)와 구별이 안 된다.
 *
 * ⚠ 9:16(1920)은 `.shortf` 임계(1842) 위라 규칙이 아예 안 붙는다 — §3 가 그것을 단언한다.
 *   여기가 빨개지면 임계를 누가 내린 것이고, 그러면 9:16 기기의 배치가 조용히 바뀐다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log(`  ok  ${m}${d ? ' — ' + d : ''}`); };
const no = (m, d) => { fail++; console.log(`  NG  ${m}${d ? ' — ' + d : ''}`); };
const eq = (m, got, want, tol = 0) => (Math.abs(got - want) <= tol ? ok(m, `${got}`) : no(m, `${got} (기대 ${want}±${tol})`));

/* 처방을 걷어낸 사본 — §R 에서만 주입한다 */
const REVERT = `
  #blsw{padding-bottom:146px !important}
  #app.shortf .bls-x{position:relative !important;top:16px !important;right:auto !important;margin:5px 0 auto !important}
  .eqp{max-height:calc(100% - 104px) !important}
`;

async function shot(browser, h, opener, revert) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  if (revert) await page.addStyleTag({ content: REVERT });
  if (opener === 'bless') await page.click('.side .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
  else if (opener === 'hero') await page.click('.tab[data-t="hero"]', { force: true }).catch(() => {});
  await page.waitForTimeout(700);
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
  const m = await page.evaluate(() => {
    const app = document.getElementById('app'), A = app.getBoundingClientRect();
    const box = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.top), h: Math.round(r.height) }; };
    const w = document.getElementById('blsw');
    /* HUD 꼬리판(🔥 연속출석) 중심에서 실제로 포인터가 닿는 것 */
    let pcp = null, hit = null;
    const p = document.querySelector('#top .pcp');
    if (p) { const r = p.getBoundingClientRect();
      pcp = { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.top) };
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      hit = el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.')) : null;
      /* ⚠ 여기서 `#eqw` 로 물으면 안 된다 — `#eqw>.dim` 은 `inset:0` 인 딤이라 **두 해상도 모두**
         꼬리판 위를 덮고, 그건 모달의 정의지 결함이 아니다(1회차에 이 자로 [2-d][2-e] 가 같이
         빨개져 자를 고쳤다). 묻는 것은 **패널 `.eqp` 가 덮었는가** 하나다. */
      var inEq = !!(el && el.closest && el.closest('.eqp'));
    }
    return {
      frameH: Math.round(A.height),
      shortf: app.classList.contains('shortf'),
      bls: box('#blsw .bls'), promo: box('.bls-promo'), blsX: box('#blsX'),
      blswFits: w ? (w.scrollHeight <= w.clientHeight + 1) : null,
      blswOver: w ? (w.scrollHeight - w.clientHeight) : null,
      eqp: box('#eqw .eqp'),
      pcp, hit, pcpCoveredByEq: !!inEq,
    };
  });
  await ctx.close();
  return m;
}

(async () => {
  const br = await launch(chromium);
  try {
    /* ---------------- §1 34 축복 ---------------- */
    console.log('[§1] 34 축복 — 블록이 1600 에 들어오고 ✕ 가 첫 화면 안에');
    const b19 = await shot(br, 2280, 'bless', false);
    const b13 = await shot(br, 1600, 'bless', false);

    /* 9:19 는 Δ0 — 이 세 값은 34 폴리시가 못 박아 둔 자리다(측정표 §13-2: 스트립 하단+21 = ✕ 1792) */
    eq('[1-a] 2280 팝업 .bls 상변', b19.bls.top, 345);
    eq('[1-b] 2280 스트립 상변', b19.promo.top, 1523);
    eq('[1-c] 2280 ✕ 상변', b19.blsX.top, 1793);
    b19.shortf ? no('[1-d] 2280 은 .shortf 가 안 붙는다', '붙었다') : ok('[1-d] 2280 .shortf 없음');

    /* 1600 — 넘침 0, ✕ 가 프레임 안 */
    b13.blswFits ? ok('[1-e] 1600 블록이 프레임에 들어온다', `넘침 ${b13.blswOver}px`)
                 : no('[1-e] 1600 블록이 프레임에 들어온다', `넘침 ${b13.blswOver}px`);
    b13.shortf ? ok('[1-f] 1600 .shortf 적용') : no('[1-f] 1600 .shortf 적용', '안 붙었다');
    (b13.blsX.top >= 0 && b13.blsX.bot <= b13.frameH)
      ? ok('[1-g] 1600 ✕ 가 프레임 안', `${b13.blsX.top}..${b13.blsX.bot} ⊂ 0..${b13.frameH}`)
      : no('[1-g] 1600 ✕ 가 프레임 안', `${b13.blsX.top}..${b13.blsX.bot} / 프레임 ${b13.frameH}`);
    /* ✕ 는 위 가드(126)를 넘어 HUD 로 올라가면 안 된다 */
    (b13.blsX.top >= 126) ? ok('[1-h] 1600 ✕ 가 HUD 가드(126) 아래', `top ${b13.blsX.top}`)
                          : no('[1-h] 1600 ✕ 가 HUD 가드(126) 아래', `top ${b13.blsX.top}`);
    /* 팝업 본체·스트립도 프레임 안 */
    (b13.promo.bot <= b13.frameH) ? ok('[1-i] 1600 스트립 하변이 프레임 안', `${b13.promo.bot}`)
                                  : no('[1-i] 1600 스트립 하변이 프레임 안', `${b13.promo.bot}`);

    /* ---------------- §2 08 영웅 ---------------- */
    console.log('[§2] 08 영웅 — 시트가 HUD 꼬리판 잉크를 안 덮는다');
    const h19 = await shot(br, 2280, 'hero', false);
    const h13 = await shot(br, 1600, 'hero', false);
    eq('[2-a] 2280 .eqp 상변(불변)', h19.eqp.top, 516);
    eq('[2-b] HUD 꼬리판 .pcp 잉크 하변', h13.pcp.bot, 129);
    eq('[2-c] 1600 .eqp 상변 = 잉크 끝', h13.eqp.top, 129);
    h13.pcpCoveredByEq ? no('[2-d] 1600 꼬리판을 시트가 안 덮는다', `덮었다(${h13.hit})`)
                       : ok('[2-d] 1600 꼬리판을 시트가 안 덮는다', `포인터 ${h13.hit}`);
    h19.pcpCoveredByEq ? no('[2-e] 2280 도 안 덮는다', `덮었다(${h19.hit})`)
                       : ok('[2-e] 2280 도 안 덮는다', `포인터 ${h19.hit}`);

    /* ---------------- §3 9:16(1920) 은 규칙 밖 ---------------- */
    console.log('[§3] 9:16(1920) 은 임계(1842) 위 — 규칙이 안 붙는다');
    const b16 = await shot(br, 1920, 'bless', false);
    b16.shortf ? no('[3-a] 1920 .shortf 없음', '붙었다 — 임계가 내려갔다')
               : ok('[3-a] 1920 .shortf 없음');
    eq('[3-b] 1920 ✕ 가 흐름 그대로(스트립 하변 +21)', b16.blsX.top - b16.promo.bot, 21);

    /* ---------------- §R 되돌림 시험 ---------------- */
    console.log('[§R] 처방을 뺀 사본에서 같은 항이 빨개지는가');
    const r13 = await shot(br, 1600, 'bless', true);
    (!r13.blswFits && r13.blsX.bot > r13.frameH)
      ? ok('[R-a] 되돌리면 1600 에서 ✕ 가 프레임 밖', `${r13.blsX.bot} > ${r13.frameH} (넘침 ${r13.blswOver}px)`)
      : no('[R-a] 되돌리면 1600 에서 ✕ 가 프레임 밖', `blsX.bot ${r13.blsX.bot} · 넘침 ${r13.blswOver}`);
    const rh13 = await shot(br, 1600, 'hero', true);
    (rh13.eqp.top === 104 && rh13.pcpCoveredByEq)
      ? ok('[R-b] 되돌리면 1600 에서 시트가 꼬리판을 덮는다', `.eqp top ${rh13.eqp.top} · 포인터 ${rh13.hit}`)
      : no('[R-b] 되돌리면 1600 에서 시트가 꼬리판을 덮는다', `.eqp top ${rh13.eqp.top} · 포인터 ${rh13.hit}`);
    /* 되돌린 사본에서도 2280 은 같아야 한다 = 처방이 9:19 를 안 건드렸다는 두 번째 증거 */
    const r19 = await shot(br, 2280, 'bless', true);
    eq('[R-c] 되돌려도 2280 ✕ 상변은 같다(9:19 무관)', r19.blsX.top, 1793);
  } finally { await br.close(); }

  console.log(`\nVERIFY351 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY351 CRASH', e); process.exit(2); });
