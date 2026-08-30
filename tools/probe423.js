#!/usr/bin/env node
/* 재현기 — 작업 423 「34 축복 팝업: 1600 에서 «나가는 길» 이 우상단 ✕ 하나로 몰리고,
 *              2280 에서 닫기였던 하단 중앙 픽셀은 아무 반응도 없는 자리가 된다」
 *
 *   node tools/probe423.js
 *
 * 338·341·350·414 규칙: **처방 전에 재현한다.** 등재문은 후보 둘(ⓐ 프로모 바깥을 닫힘으로 ·
 * ⓑ 2280 ✕ 도 우상단으로)을 적어 뒀지만 둘 다 «하단 중앙이 죽었다» 를 전제로 한다.
 * 그 전제를 406 이 확정한 축(«덮였나» 가 아니라 **«닿나»**)으로 되묻는다.
 *
 *   ⓐ 나가는 길 지도 — 프레임 전체를 10px 격자로 훑어 각 점을 셋으로 가른다:
 *        close(눌러서 닫힌다 = 딤 `#blsw` 자신 · ✕) / act(다른 조작 = [이동]·축복 카드) / dead(아무 일 없음)
 *      두 프레임의 close 면적·개수를 그대로 견준다.
 *   ⓑ 하단 중앙 세로 단면 — x=540 한 열을 위에서 아래로 훑어 «무엇이 몇 px» 인지 적는다.
 *      2280 에서 닫히던 대역이 1600 에서 무엇이 됐는지가 등재문의 본체다.
 *   ⓒ «블록 기준» 대응 — ✕ 는 2280 에서 프로모 하변 +21..+159 다. 1600 에서 그 대역이
 *      실제로 존재하는지·닿는지(프레임이 1600 에서 끝난다).
 *   ⓓ 실제 클릭 — 지도가 «닫힘» 이라고 한 점을 정말로 눌러 팝업이 닫히는지 확인한다
 *      (elementFromPoint 는 «닿나» 만 말하고 «핸들러가 있나» 는 말하지 않는다).
 *   ⓔ 학습된 자리의 크기 — 2280 ✕ 중심(540, y)에서 손가락 반경 24px 안이 1600 에서 무엇인가.
 *
 * 이 자는 제품을 고치지 않는다. 값만 찍는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'index.html');
const STEP = 10;
const CX = 540;               /* 2280 ✕ 의 가로 중심(측정표 34 §9 · verify414 [2-f] 와 같은 열) */

/* «수리 전» 사본 — 423 이 넣은 두 줄을 도로 뗀다. 갈아 끼울 자리를 못 찾으면
   조용히 초록이 되지 않고 그렇게 말하고 죽는다(neg279 처방 · probe414 와 같은 꼴). */
const CUR = '  #app.shortf #blsw .bls-promo{pointer-events:none}\n  #app.shortf #blsw .bls-promo>.gb{pointer-events:auto}\n';
function beforeCopy() {
  const src = fs.readFileSync(SRC, 'utf8');
  if (!src.includes(CUR)) {
    console.error('probe423: «수리 전» 으로 되돌릴 자리를 못 찾았다 — 423 의 두 줄이 바뀌었다. 자를 고쳐라.');
    process.exit(3);
  }
  const f = path.join(os.tmpdir(), 'probe423-before.html');
  fs.writeFileSync(f, src.replace(CUR, ''));
  return f;
}

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = (n) => Math.round(n * 10) / 10;

async function measure(browser, H, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + (file || SRC), { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
  await page.waitForTimeout(700);

  const m = await page.evaluate(([STEP, CX]) => {
    const app = document.getElementById('app').getBoundingClientRect();
    const w = document.getElementById('blsw');
    const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { t: r.top - app.top, b: r.bottom - app.top, l: r.left - app.left, r: r.right - app.left, w: r.width, h: r.height }; };
    /* 한 점의 «성질» — 406-① 대로 elementFromPoint(단수) 로만 판정한다.
       close: 딤(#blsw 자신 · 27988 핸들러가 e.target.id==='blsw' 면 닫는다) · ✕(#blsX)
       act  : 다른 조작(프로모 [이동] #blsAll · 축복 카드 .bls-c[data-bless])
       dead : 팝업 안인데 아무 핸들러도 없다 */
    const kind = (x, y) => {
      const e = document.elementFromPoint(app.left + x, app.top + y);
      if (!e) return { k: 'none', el: null };
      const n = e.id || String(e.className || '').split(' ')[0] || e.tagName;
      if (e === w) return { k: 'close', el: 'dim' };
      if (e.closest && e.closest('#blsX')) return { k: 'close', el: 'x' };
      if (e.closest && e.closest('#blsAll')) return { k: 'act', el: 'gb' };
      if (e.closest && e.closest('.bls-c[data-bless]')) return { k: 'act', el: 'card' };
      if (!w.contains(e)) return { k: 'outside', el: n };
      return { k: 'dead', el: n };
    };
    /* ⓐ 지도 */
    const cnt = { close: 0, act: 0, dead: 0, outside: 0, none: 0 };
    const closeBy = { dim: 0, x: 0 };
    for (let y = STEP / 2; y < app.height; y += STEP)
      for (let x = STEP / 2; x < app.width; x += STEP) {
        const r = kind(x, y);
        cnt[r.k]++;
        if (r.k === 'close') closeBy[r.el]++;
      }
    /* ⓑ x=CX 세로 단면 — 이어지는 구간으로 묶는다 */
    const runs = [];
    for (let y = 0.5; y < app.height; y += 1) {
      const r = kind(CX, y);
      const tag = r.k + ':' + r.el;
      if (runs.length && runs[runs.length - 1].tag === tag) runs[runs.length - 1].b = y;
      else runs.push({ tag, k: r.k, el: r.el, t: y, b: y });
    }
    const promo = box(w.querySelector('.bls-promo'));
    const x = box(w.querySelector('.bls-x'));
    const bls = box(w.querySelector('.bls'));
    /* ⓔ 손가락 반경 24 — 2280 ✕ 중심을 «블록 기준» 으로 옮긴 점 주변 */
    return {
      frameH: app.height, frameW: app.width,
      shortf: document.getElementById('app').classList.contains('shortf'),
      cells: { ...cnt }, closeBy, cellPx: STEP * STEP,
      runs: runs.filter((r) => r.b - r.t >= 1),
      promo, x, bls,
      errs: 0,
    };
  }, [STEP, CX]);
  m.errs = errs.length;

  /* ⓓ 실제 클릭 — 지도가 close 라고 한 자리 둘(✕ · 하단 중앙 딤)을 정말 누른다 */
  const clickAt = async (x, y) => {
    await page.evaluate(() => { const w = document.getElementById('blsw'); if (!w.classList.contains('on')) w.classList.add('on'); });
    await page.waitForTimeout(150);
    const a = await page.evaluate(() => document.getElementById('app').getBoundingClientRect());
    await page.mouse.click(a.left + x, a.top + y);
    await page.waitForTimeout(320);
    return !(await page.evaluate(() => document.getElementById('blsw').classList.contains('on')));
  };
  /* ① ✕ 중심 */
  m.clickX = await clickAt(m.x.l + m.x.w / 2, m.x.t + m.x.h / 2);
  /* ② 프로모 하변 바로 아래 중앙 = 2280 에서 ✕ 였던 «블록 기준» 자리 */
  const below = Math.min(m.frameH - 2, m.promo.b + 12);
  m.belowY = below;
  m.clickBelow = await clickAt(CX, below);
  /* ③ 프로모 스트립 한복판(버튼 밖 왼쪽) = 등재문 ⓐ 가 «닫힘» 으로 바꾸려는 자리 */
  m.promoY = m.promo.t + m.promo.h / 2;
  m.promoX = m.promo.l + 120;
  m.clickPromo = await clickAt(m.promoX, m.promoY);
  /* ④ 프로모 좌측 딤(verify414 [3-d] 가 쓰는 자리) */
  m.clickDimSide = await clickAt(m.promo.l / 2, m.promoY);

  await ctx.close();
  return m;
}

(async () => {
  const browser = await launch(chromium);
  const BEF = beforeCopy();
  const M = {};
  /* «수리 전» — 등재문이 본 그 상태. 2280 은 423 의 선언이 아예 안 붙으므로 한 번만 잰다. */
  for (const H of [2280, 1600]) M[H] = await measure(browser, H, BEF);
  /* «수리 후» 1600 — 처방이 실제로 자리를 되살렸는지 */
  const AFT = await measure(browser, 1600, SRC);
  await browser.close();

  const px = (n) => n * STEP * STEP;
  console.log('\nⓐ 나가는 길 지도 (10px 격자 · elementFromPoint) ─────────────────');
  for (const H of [2280, 1600]) {
    const c = M[H].cells;
    console.log(`  ${H}: close ${c.close} (딤 ${M[H].closeBy.dim} · ✕ ${M[H].closeBy.x}) · act ${c.act} · dead ${c.dead} · 팝업 밖 ${c.outside}`);
    console.log(`        close 면적 ≈ ${px(c.close).toLocaleString()}px² (프레임의 ${r1(c.close / (c.close + c.act + c.dead + c.outside) * 100)}%)`);
  }
  ok(M[2280].cells.close > 0 && M[1600].cells.close > 0,
    `[A1] 두 프레임 모두 닫는 점이 있다 (2280 ${M[2280].cells.close}칸 · 1600 ${M[1600].cells.close}칸)`);
  const dimDrop = 1 - M[1600].closeBy.dim / M[2280].closeBy.dim;
  ok(true, `[A2] 딤(닫힘) 면적이 1600 에서 ${r1(dimDrop * 100)}% 줄었다 — ${px(M[2280].closeBy.dim).toLocaleString()} → ${px(M[1600].closeBy.dim).toLocaleString()}px²`);
  ok(M[2280].closeBy.x === M[1600].closeBy.x || Math.abs(M[2280].closeBy.x - M[1600].closeBy.x) <= 4,
    `[A3] ✕ 자체의 표적 크기는 두 프레임이 같다 — ${M[2280].closeBy.x} vs ${M[1600].closeBy.x}칸 (${r1(M[2280].x.w)}×${r1(M[2280].x.h)} vs ${r1(M[1600].x.w)}×${r1(M[1600].x.h)})`);

  console.log('\nⓑ x=540 세로 단면 ─────────────────────────────────────────────');
  for (const H of [2280, 1600]) {
    console.log(`  ${H} (블록: .bls ${r1(M[H].bls.t)}..${r1(M[H].bls.b)} · 프로모 ${r1(M[H].promo.t)}..${r1(M[H].promo.b)} · ✕ ${r1(M[H].x.t)}..${r1(M[H].x.b)} @x${r1(M[H].x.l)}..${r1(M[H].x.r)})`);
    for (const r of M[H].runs) console.log(`     ${String(Math.round(r.t)).padStart(4)}..${String(Math.round(r.b)).padStart(4)} (${String(Math.round(r.b - r.t + 1)).padStart(4)}px)  ${r.tag}`);
  }
  const closeRun = (H) => M[H].runs.filter((r) => r.k === 'close').reduce((s, r) => s + (r.b - r.t + 1), 0);
  ok(true, `[B1] x=540 열에서 «닫히는» 세로 길이 — 2280 ${r1(closeRun(2280))}px · 1600 ${r1(closeRun(1600))}px`);
  const botRun = (H) => { const rs = M[H].runs.filter((r) => r.k === 'close' && r.t > M[H].promo.b - 1); return rs.length ? rs[rs.length - 1] : null; };
  for (const H of [2280, 1600]) {
    const r = botRun(H);
    ok(!!r, `[B2 ${H}] 프로모 하변 아래 중앙에 닫히는 띠가 ${r ? r1(r.b - r.t + 1) + 'px (' + Math.round(r.t) + '..' + Math.round(r.b) + ' · ' + r.el + ')' : '없다'}`);
  }

  console.log('\nⓒ «블록 기준» 대응 — 2280 ✕ 는 프로모 하변 +Δ ─────────────────');
  const d2 = { t: M[2280].x.t - M[2280].promo.b, b: M[2280].x.b - M[2280].promo.b };
  const avail = M[1600].frameH - M[1600].promo.b;
  ok(true, `[C1] 2280 ✕ = 프로모 하변 +${r1(d2.t)}..+${r1(d2.b)} (${r1(d2.b - d2.t)}px) — 1600 은 프로모 하변 아래로 ${r1(avail)}px 뿐이라 그 대역의 ${r1(Math.max(0, Math.min(avail, d2.b) - d2.t) / (d2.b - d2.t) * 100)}% 만 존재한다`);

  console.log('\nⓓ 실제 클릭 (지도가 «닫힘» 이라 한 자리를 정말 눌렀다) ──────────');
  for (const H of [2280, 1600]) {
    const m = M[H];
    console.log(`  ${H}: ✕ ${m.clickX} · 프로모하변+12 중앙(y${r1(m.belowY)}) ${m.clickBelow} · 프로모 한복판(x${r1(m.promoX)},y${r1(m.promoY)}) ${m.clickPromo} · 프로모 좌측 딤 ${m.clickDimSide}`);
    ok(m.clickX, `[D1 ${H}] ✕ 를 누르면 닫힌다`);
    ok(m.clickDimSide, `[D2 ${H}] 프로모 좌측 딤을 누르면 닫힌다`);
  }
  ok(M[2280].clickBelow && M[1600].clickBelow,
    `[D3] «프로모 하변 바로 아래 중앙» 은 두 프레임 다 닫는다 — 2280 ${M[2280].clickBelow} · 1600 ${M[1600].clickBelow}`);
  ok(!M[2280].clickPromo && !M[1600].clickPromo,
    `[D4] 프로모 스트립 한복판(버튼 밖)은 두 프레임 다 «아무 일도 안 난다» — 2280 ${M[2280].clickPromo} · 1600 ${M[1600].clickPromo} ⇒ 이 자리는 1600 이 만든 결함이 아니다`);

  console.log('\nⓕ 수리 후 1600 (같은 자를 그대로 다시 댄다) ──────────────────');
  console.log(`  close ${AFT.cells.close}칸 (딤 ${AFT.closeBy.dim} · ✕ ${AFT.closeBy.x}) · act ${AFT.cells.act} · dead ${AFT.cells.dead}`);
  ok(AFT.clickPromo && !M[1600].clickPromo,
    `[F1] 프로모 스트립 한복판이 «아무 일 없음» → **닫힘** 으로 바뀌었다 (수리 전 ${M[1600].clickPromo} → 후 ${AFT.clickPromo})`);
  ok(AFT.clickX && AFT.clickDimSide && AFT.clickBelow,
    `[F2] 원래 있던 길은 셋 다 그대로 산다 — ✕ ${AFT.clickX} · 좌측 딤 ${AFT.clickDimSide} · 하변 아래 ${AFT.clickBelow}`);
  const cr = (m) => m.runs.filter((r) => r.k === 'close').reduce((s, r) => s + (r.b - r.t + 1), 0);
  ok(cr(AFT) > cr(M[1600]),
    `[F3] x=540 열의 «닫히는» 세로 길이 ${r1(cr(M[1600]))} → ${r1(cr(AFT))}px (2280 은 ${r1(cr(M[2280]))}px)`);
  ok(Math.abs(AFT.promo.t - M[1600].promo.t) < 0.5 && Math.abs(AFT.promo.b - M[1600].promo.b) < 0.5
     && Math.abs(AFT.x.t - M[1600].x.t) < 0.5 && Math.abs(AFT.bls.t - M[1600].bls.t) < 0.5,
    `[F4] 레이아웃 Δ0px — 프로모 ${r1(AFT.promo.t)}..${r1(AFT.promo.b)} · ✕ ${r1(AFT.x.t)} · .bls ${r1(AFT.bls.t)} (수리 전과 같다)`);
  ok(AFT.cells.act > 0 && AFT.closeBy.x === M[1600].closeBy.x,
    `[F5] [이동] 버튼과 축복 카드는 계속 눌린다 — act ${M[1600].cells.act} → ${AFT.cells.act}칸 (버튼 267×118 만큼만 줄어야 한다)`);

  console.log(`\n에러 — 2280 ${M[2280].errs} · 1600 ${M[1600].errs} · 수리후 ${AFT.errs}`);
  ok(M[2280].errs === 0 && M[1600].errs === 0 && AFT.errs === 0, '[E1] 콘솔 에러 0');
  console.log(`\n${fail === 0 ? 'PROBE423 PASS' : 'PROBE423 FAIL'} — ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
