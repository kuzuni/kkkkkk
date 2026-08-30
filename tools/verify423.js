#!/usr/bin/env node
/* 게이트 — 작업 423 「34 축복 팝업: 짧은 프레임에서 ✕ 가 비운 하단 중앙 자리를
 *          프로모 스트립이 «나가는 길» 로 물려받는다」
 *
 *   node tools/verify423.js
 *
 * 무엇을 못박는가
 *   §0 전제  — 이 자가 공허하지 않으려면 «두 프레임이 서로 다른 배치» 여야 한다.
 *              1600 은 `.shortf`(frameH < 1842)라 ✕ 가 팝업 우상단으로 가고, 2280·1920 은 안 간다.
 *   §1 본체  — 1600 에서 프로모 스트립의 «버튼 밖» 을 누르면 **닫힌다**.
 *              [이동] 버튼은 그대로 눌리고(닫힘 + 35 패스 열림), 축복 카드도 그대로 눌린다.
 *   §2 2280 무영향 — 선언이 `.shortf` 안에만 있으므로 2280·1920 은 **동작도 픽셀도 Δ0**.
 *              스트립 한복판은 2280 에서 원래도 «아무 일 없음» 이고 그대로 남는다(probe423 [D4]).
 *   §3 대가  — 레이아웃 Δ0px · 스크롤 0 · 나가는 길 셋 다 산다 · 콘솔 에러 0.
 *   §R 되돌림 — 두 줄을 뗀 사본에서 1600 스트립이 도로 죽는다(⇒ §1 은 공허하지 않다) ·
 *              버튼의 `pointer-events:auto` 를 뺀 사본에서 [이동] 이 죽는다(⇒ 그 한 줄도 공허하지 않다).
 *
 * ⚠ 406 규약 — 조작·나가는 길은 «덮였나» 가 아니라 **«닿나/눌리나»** 로만 잰다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'index.html');
const R_ALL = '  #app.shortf #blsw .bls-promo{pointer-events:none}\n  #app.shortf #blsw .bls-promo>.gb{pointer-events:auto}\n';
const R_GB = '  #app.shortf #blsw .bls-promo>.gb{pointer-events:auto}\n';

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = (n) => Math.round(n * 10) / 10;

function variant(name, cut) {
  const src = fs.readFileSync(SRC, 'utf8');
  if (!src.includes(cut)) {
    console.error('verify423: «' + name + '» 사본을 만들 자리를 못 찾았다 — 423 의 선언이 바뀌었다. 자를 고쳐라.');
    process.exit(3);
  }
  const f = path.join(os.tmpdir(), 'verify423-' + name + '.html');
  fs.writeFileSync(f, src.replace(cut, ''));
  return f;
}

async function run(browser, H, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + (file || SRC), { waitUntil: 'load' });
  await page.waitForTimeout(1100);

  const open = async () => {
    await page.evaluate(() => {
      ['shopw', 'blsw'].forEach((id) => { const e = document.getElementById(id); if (e) e.classList.remove('on'); });
    }).catch(() => {});
    await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
    await page.waitForTimeout(450);
    return page.evaluate(() => document.getElementById('blsw').classList.contains('on'));
  };
  await open();

  const geo = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const w = document.getElementById('blsw');
    const box = (s) => { const e = w.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
      return { t: r.top - app.top, b: r.bottom - app.top, l: r.left - app.left, r: r.right - app.left, w: r.width, h: r.height }; };
    const hit = (x, y) => { const e = document.elementFromPoint(app.left + x, app.top + y);
      return e ? (e.id || String(e.className || '').split(' ')[0] || e.tagName) : null; };
    const pr = box('.bls-promo'), gb = box('.gb');
    return {
      frameH: app.height, shortf: document.getElementById('app').classList.contains('shortf'),
      bls: box('.bls'), promo: pr, gb, x: box('.bls-x'),
      scrollH: w.scrollHeight, clientH: w.clientHeight,
      /* 스트립 «버튼 밖» 표본 세 점 — 왼쪽 일러스트 · 가운데 문구 · 버튼 바로 왼쪽 */
      hitIc: hit(pr.l + 120, pr.t + pr.h / 2),
      hitTx: hit(pr.l + pr.w * 0.55, pr.t + 60),
      hitLeftOfGb: hit(gb.l - 30, gb.t + gb.h / 2),
      hitGb: hit(gb.l + gb.w / 2, gb.t + gb.h / 2),
    };
  });

  /* 실제 클릭 — «닿나» 다음은 «눌리나» 다 */
  const clickAt = async (x, y) => {
    await page.evaluate(() => {
      const s = document.getElementById('shopw'); if (s) s.classList.remove('on');
      document.getElementById('blsw').classList.add('on');
    });
    await page.waitForTimeout(150);
    const a = await page.evaluate(() => document.getElementById('app').getBoundingClientRect());
    await page.mouse.click(a.left + x, a.top + y);
    await page.waitForTimeout(340);
    return page.evaluate(() => ({
      open: document.getElementById('blsw').classList.contains('on'),
      passOn: !!document.querySelector('#shopw.on'),
    }));
  };
  const P = geo.promo, G = geo.gb;
  const cIc = await clickAt(P.l + 120, P.t + P.h / 2);
  const cTx = await clickAt(P.l + P.w * 0.55, P.t + 60);
  const cGb = await clickAt(G.l + G.w / 2, G.t + G.h / 2);
  const cX = await clickAt(geo.x.l + geo.x.w / 2, geo.x.t + geo.x.h / 2);
  const cDim = await clickAt(P.l / 2, P.t + P.h / 2);
  /* 축복 카드 — 눌러도 «닫히지 않는다» 가 판정(카드는 축복을 켠다) */
  await page.evaluate(() => document.getElementById('blsw').classList.add('on'));
  await page.waitForTimeout(150);
  const card = await page.evaluate(() => {
    const c = document.querySelector('#blsCards .bls-c[data-bless]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { reach: !!(e && e.closest && e.closest('.bls-c[data-bless]')) };
  });

  const out = { geo, cIc, cTx, cGb, cX, cDim, card, errs: errs.length };
  await ctx.close();
  return out;
}

(async () => {
  const browser = await launch(chromium);
  const M = {};
  for (const H of [2280, 1920, 1600]) M[H] = await run(browser, H, SRC);
  const RA = await run(browser, 1600, variant('noall', R_ALL));   /* 두 줄 다 뗀 사본 */
  const RB = await run(browser, 1600, variant('nogb', R_GB));     /* 버튼 되살림만 뗀 사본 */
  await browser.close();

  console.log('\n§0 전제 — 두 프레임의 배치가 실제로 다르다 ───────────────────');
  ok(M[1600].geo.shortf && !M[2280].geo.shortf && !M[1920].geo.shortf,
    `[0-a] shortf 는 1600 만 (2280 ${M[2280].geo.shortf} · 1920 ${M[1920].geo.shortf} · 1600 ${M[1600].geo.shortf})`);
  ok(M[2280].geo.x.t > M[2280].geo.promo.b && M[1600].geo.x.t < M[1600].geo.bls.t + 60,
    `[0-b] ✕ 가 1600 에서만 하단 중앙을 비우고 팝업 우상단으로 간다 — 2280 ${r1(M[2280].geo.x.t)}(프로모 하변 ${r1(M[2280].geo.promo.b)} 아래) · 1600 ${r1(M[1600].geo.x.t)}(.bls 상변 ${r1(M[1600].geo.bls.t)} 근처)`);

  console.log('\n§1 본체 — 1600 스트립이 «나가는 길» 이다 ──────────────────────');
  ok(M[1600].geo.hitIc === 'blsw' && M[1600].geo.hitTx === 'blsw' && M[1600].geo.hitLeftOfGb === 'blsw',
    `[1-a] 스트립 «버튼 밖» 세 점이 전부 딤(#blsw)에 닿는다 — 일러스트 ${M[1600].geo.hitIc} · 문구 ${M[1600].geo.hitTx} · 버튼 왼쪽 ${M[1600].geo.hitLeftOfGb}`);
  ok(!M[1600].cIc.open && !M[1600].cTx.open,
    `[1-b] 그 자리를 실제로 누르면 팝업이 닫힌다 — 일러스트 ${!M[1600].cIc.open} · 문구 ${!M[1600].cTx.open}`);
  ok(M[1600].geo.hitGb === 'blsAll',
    `[1-c] [이동] 버튼은 계속 자기 자신에 닿는다 — ${M[1600].geo.hitGb}`);
  ok(!M[1600].cGb.open && M[1600].cGb.passOn,
    `[1-d] [이동] 이 «닫힘 + 35 패스 열림» 을 그대로 한다 (닫힘 ${!M[1600].cGb.open} · 패스 ${M[1600].cGb.passOn}) `
    + `⇒ 「닫히기만 한다」와 갈린다`);
  ok(M[1600].card && M[1600].card.reach,
    `[1-e] 축복 카드는 계속 포인터가 닿는다 (스트립만 비운다)`);

  console.log('\n§2 2280·1920 무영향 ──────────────────────────────────────────');
  for (const H of [2280, 1920]) {
    ok(M[H].geo.hitIc !== 'blsw' && M[H].geo.hitTx !== 'blsw',
      `[2-a ${H}] 스트립이 여전히 자기 것이다 — 일러스트 ${M[H].geo.hitIc} · 문구 ${M[H].geo.hitTx} (선언이 «.shortf» 밖이라 안 붙는다)`);
    ok(M[H].cIc.open && M[H].cTx.open,
      `[2-b ${H}] 스트립 한복판을 눌러도 «아무 일도 안 난다» — 열린 채 ${M[H].cIc.open}/${M[H].cTx.open} (probe423 [D4] 와 같은 값)`);
    ok(!M[H].cGb.open && M[H].cGb.passOn,
      `[2-c ${H}] [이동] 은 그대로 (닫힘 ${!M[H].cGb.open} · 패스 ${M[H].cGb.passOn})`);
  }

  console.log('\n§3 대가 ──────────────────────────────────────────────────────');
  for (const H of [2280, 1920, 1600]) {
    ok(!M[H].cX.open, `[3-a ${H}] ✕ 로 닫힌다`);
    ok(!M[H].cDim.open, `[3-b ${H}] 딤(스트립 왼쪽)으로 닫힌다`);
    ok(M[H].geo.scrollH <= M[H].geo.clientH,
      `[3-c ${H}] 스크롤 0 (scrollH ${M[H].geo.scrollH} ≤ ${M[H].geo.clientH})`);
    ok(M[H].errs === 0, `[3-d ${H}] 콘솔 에러 0`);
  }
  /* 레이아웃 Δ0px — 되돌린 사본과 좌표가 한 픽셀도 안 다르다 */
  const g = M[1600].geo, r = RA.geo;
  const same = ['bls', 'promo', 'gb', 'x'].every((k) => ['t', 'b', 'l', 'r'].every((s) => Math.abs(g[k][s] - r[k][s]) < 0.5));
  ok(same,
    `[3-e] 레이아웃 Δ0px — .bls ${r1(g.bls.t)}..${r1(g.bls.b)} · 프로모 ${r1(g.promo.t)}..${r1(g.promo.b)} · ✕ ${r1(g.x.t)}..${r1(g.x.b)} `
    + `(두 줄을 뗀 사본과 같다)`);

  console.log('\n§R 되돌림 시험 ───────────────────────────────────────────────');
  ok(RA.cIc.open && RA.cTx.open && RA.geo.hitIc !== 'blsw',
    `[R-a] 두 줄을 떼면 1600 스트립이 도로 죽는다 — 눌러도 열린 채 ${RA.cIc.open}/${RA.cTx.open} · 닿는 것 ${RA.geo.hitIc} ⇒ [1-a][1-b] 는 공허하지 않다`);
  ok(RB.geo.hitGb === 'blsw' && !RB.cGb.passOn,
    `[R-b] 버튼의 pointer-events:auto 한 줄을 떼면 [이동] 이 죽는다 — 닿는 것 ${RB.geo.hitGb} · 패스 열림 ${RB.cGb.passOn} ⇒ [1-c][1-d] 도 공허하지 않다`);
  ok(!RB.cGb.open,
    `[R-c] 그때도 «닫히기는 한다» — 그래서 [1-d] 는 «닫힘» 이 아니라 «패스가 열림» 을 물어야 한다 (닫힘 ${!RB.cGb.open} · 패스 ${RB.cGb.passOn})`);

  console.log(`\n${fail === 0 ? 'VERIFY423 PASS' : 'VERIFY423 FAIL'} — ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
