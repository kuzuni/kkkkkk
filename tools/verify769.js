#!/usr/bin/env node
/* 게이트 — 작업 769 «단련 축 카드의 효과 글줄 열(`.td`) 예약 폭 재산정 + 남는 폭을 버튼으로»
 *   (2026-09-01 등재 · 686 비평 4인이 두 회차에 걸쳐 전부 지적한 자리)
 *
 *   node tools/verify769.js
 *
 * 등재문의 처방 후보는 셋이었다 — ⓐ 최악 문구를 실제로 만들어 재고 예약 폭을 다시 정한다 ·
 * ⓑ 남는 만큼 버튼을 왼쪽으로 넓힌다 · ⓒ 그대로 둔다. **ⓐ 를 재고 ⓑ 를 골랐다**(ⓒ 기각의
 * 근거는 [C]·[D] 두 실측이다: 예약은 최악의 1.7배였고, 버튼은 제 라벨을 이미 못 담고 있었다).
 *
 * 절
 *   [A] 선언 — `.td` 폭 236 · `.tb` 폭 496 · 둘 사이 16px(584 [7-b] 가 세운 간격).
 *       ⚠ 좌표를 손으로 적지 않는다: «`.td` 우변 + 16 = `.tb` 좌변» 이라는 **산수**로 묻는다.
 *   [B] 예약이 최악을 담는다(ⓐ) — 레벨 스윕 + `mulNum` 접기 봉우리(«×999,999배»)까지
 *       **전역 최악**을 만들어 재고, 그 잉크가 예약 폭 안에 든다 · 세 줄로 안 접힌다.
 *   [C] 예약이 과하지 않다 — 최악 잉크 대비 남는 폭이 40px 이하다(예약 = 최악 + 여유 한 자락).
 *       이 항이 «392 로 되돌리면» 곧바로 빨개진다(과예약 163.6px).
 *   [D] 버튼 자릿수 예산(ⓑ) — 자연 폭으로 잰 예산이 **11자리 이상**이고, 701 배수가 실제로
 *       만드는 라벨(Lv 99,999 ×1000 = 9자리 · Lv 999,999 ×1 = 8자리)이 상자 안에서
 *       **한 줄로** 산다(인라인 줄바꿈 0 — 접히면 line-height 173 짜리 두 줄이 된다).
 *   [E] 본체 — 잉크 우변 ↔ 버튼 좌변 빈 띠가 100px 이하다(등재문 실측 190~227px 의 자리).
 *   [F] 안 건드린 것 — 버튼 세로(top 22 · h 173 · right 26) · `.td` left/top/height ·
 *       아이콘 액자(26 · 22 · 178) · 행 998×222. 686·612 가 푼 값은 한 픽셀도 안 움직인다.
 *   [G] 두 프레임(9:19 · 9:13.3) — 가로 기하는 프레임 무관 · 행 안 형제 교차 0.
 *   [R] 되돌림 시험 — 폭 둘을 옛 값(392 · 340)으로 되돌리면 [E]·[D] 가 실제로 빨개진다
 *       (무르게 푼 수리가 아님을 못박는 자리 — 334·368 규약).
 *
 * 회귀는 따로 돈다: `verify612`·`verify584`·`verify670`·`verify686`(이관) ·
 * `verify210`·`verify613`·`verify660`·`verify621`·`verify701`·`verify488`·`verify818`.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const blk = t => console.log('\n=== ' + t + ' ===');
const p1 = n => Math.round(n * 10) / 10;

/* 행 기준 좌표 + 줄 단위 잉크(<br> 로 갈린 두 줄을 각각 본다) */
const LIB = `
window.__rel = (sel, host) => {
  const e = document.querySelector(sel), h = document.querySelector(host);
  if (!e || !h) return null;
  const a = e.getBoundingClientRect(), b = h.getBoundingClientRect();
  const r = n => Math.round(n * 10) / 10;
  return { x: r(a.x - b.x), y: r(a.y - b.y), w: r(a.width), h: r(a.height),
           x2: r(a.right - b.x), y2: r(a.bottom - b.y) };
};
window.__lines = (sel, host) => {
  const e = document.querySelector(sel), h = document.querySelector(host);
  if (!e || !h) return [];
  const hb = h.getBoundingClientRect();
  const rg = document.createRange(); rg.selectNodeContents(e);
  const r = n => Math.round(n * 10) / 10;
  return [...rg.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5)
    .map(q => ({ x: r(q.x - hb.x), x2: r(q.right - hb.x), w: r(q.width) }));
};
/* 자연 폭 — 상자에 눌리지 않은 «진짜» 잉크. 상자 안에서 재면 인라인 줄바꿈에 눌려
   상자 폭과 같은 수가 나와 예산을 못 센다(probe769 [4] 가 그 함정을 찍었다). */
window.__nat = (hostSel, html, css) => {
  const host = document.querySelector(hostSel); if (!host) return -1;
  const hold = document.createElement('span');
  hold.style.cssText = 'position:absolute;left:0;top:-9999px;white-space:nowrap;visibility:hidden';
  const pr = document.createElement('i');
  pr.style.cssText = 'white-space:nowrap;' + (css || '');
  pr.innerHTML = html; hold.appendChild(pr); host.appendChild(hold);
  const w = pr.getBoundingClientRect().width;
  host.removeChild(hold);
  return Math.round(w * 10) / 10;
};`;

async function openAt(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    S.gold = 1e15; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e12; S.stage = 400;
    markDirty(); openTrain(); setTrSub('temper'); renderTrain();
  });
  await page.evaluate(LIB);
  await page.waitForTimeout(150);
  return { ctx, page };
}

(async () => {
  const browser = await launch(chromium);
  const code = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const { ctx, page } = await openAt(browser, 2280);
  const ev = fn => page.evaluate(fn).catch(e => ({ __err: String(e) }));

  /* ══ [A] 선언 ═══════════════════════════════════════════════════════ */
  blk('[A] 선언 — 폭 둘과 그 사이 간격');
  const tdCss = (code.match(/\.tr-tp>\.td\{[^}]*\}/) || [''])[0];
  const tbCss = (code.match(/\.tr-tp>\.tb\{[^}]*\}/) || [''])[0];
  ok(/width:236px/.test(tdCss), '[A1] `.tr-tp>.td` 예약 폭 236(769 재고)', tdCss.slice(0, 90));
  ok(/width:496px/.test(tbCss), '[A2] `.tr-tp>.tb` 폭 496(남는 폭을 받았다)', tbCss.slice(0, 90));
  ok(/left:224px/.test(tdCss) && /right:26px/.test(tbCss),
     '[A3] 좌우 끝(글줄 좌변 224 · 버튼 우변 26)은 612·584 값 그대로');
  const geo = await ev(() => {
    const td = window.__rel('.tr-tp.k0 .td', '.tr-tp.k0'), tb = window.__rel('.tr-tp.k0 .tb', '.tr-tp.k0');
    const ti = window.__rel('.tr-tp.k0 .ti', '.tr-tp.k0');
    const row = document.querySelector('.tr-tp.k0').getBoundingClientRect();
    const r = n => Math.round(n * 10) / 10;
    return { td, tb, ti, rowW: r(row.width), rowH: r(row.height) };
  });
  if (geo.__err) ok(false, 'evaluate 실패: ' + geo.__err);
  else ok(Math.abs(geo.tb.x - (geo.td.x2 + 16)) < 0.5,
     '[A4] ★ 좌표가 아니라 산수 — «`.td` 우변 + 16 = `.tb` 좌변»(584 [7-b] 의 간격)',
     geo.td.x2 + ' + 16 = ' + geo.tb.x);

  /* ══ [B] 예약이 «전역» 최악을 담는가 ═══════════════════════════════ */
  blk('[B] 예약이 최악 문구를 담는가 (ⓐ — 등재문이 «먼저 재라» 고 한 것)');
  const B = await ev(() => {
    const o = temperObj(); const keep = { ...(o.alloc || {}) };
    const r1 = n => Math.round(n * 10) / 10;
    const box = document.querySelector('.tr-tp.k2 .td').getBoundingClientRect().width;
    const sweep = [];
    /* 레벨 스윕 — 접기(MUL_FOLD 1e6) 전후를 다 지난다. 축 이름 최장은 k2(«체력회복») */
    [0, 99, 999, 9999, 99999, 999999, 9999999, 49999950, 99999999].forEach(lv => {
      TEMPERS.forEach(t => { o.alloc[t.k] = lv; });
      renderTemper();
      for (let i = 0; i < 3; i++) {
        const ln = window.__lines('.tr-tp.k' + i + ' .td i', '.tr-tp.k' + i);
        const bx = document.querySelector('.tr-tp.k' + i + ' .td').getBoundingClientRect();
        const rb = document.querySelector('.tr-tp.k' + i).getBoundingClientRect();
        const x0 = bx.x - rb.x;
        sweep.push({ lv, k: i, lines: ln.length, w: r1(Math.max(...ln.map(l => l.x2 - x0))) });
      }
    });
    o.alloc = keep; renderTemper();
    /* 접기 직전 봉우리 — 레벨 격자에 안 걸릴 수 있어 문자열을 직접 만들어 잰다.
       `mulNum` 이 접기 직전에 내는 최장 정수는 «999,999» 이고 이름 최장은 «체력회복» 이다. */
    const peak = window.__nat('.tr-tp.k2 .td', '체력회복 ×999,999배');
    const line2 = window.__nat('.tr-tp.k2 .td', '다음 1레벨 +0.02배');
    return { box: r1(box), sweep, peak, line2, worst: r1(Math.max(...sweep.map(s => s.w))) };
  });
  if (B.__err) ok(false, 'evaluate 실패: ' + B.__err);
  else {
    console.log('       스윕 최악 ' + B.worst + ' · 접기 봉우리 «체력회복 ×999,999배» ' + B.peak
      + ' · 둘째 줄 ' + B.line2 + ' · 예약 ' + B.box);
    ok(B.sweep.every(s => s.lines === 2), '[B1] 스윕 전 구간에서 두 줄이다(세 줄로 안 접힌다)',
       [...new Set(B.sweep.map(s => s.lines))].join(','));
    ok(B.worst <= B.box, '[B2] 레벨 스윕 최악이 예약 폭 안', B.worst + ' ≤ ' + B.box);
    ok(B.peak <= B.box, '[B3] ★ 전역 최악(접기 직전 봉우리)도 예약 폭 안', B.peak + ' ≤ ' + B.box);
    ok(B.line2 <= B.box, '[B4] 둘째 줄(상수 문구)도 예약 폭 안', B.line2 + ' ≤ ' + B.box);
  }

  /* ══ [C] 예약이 과하지 않은가 ═════════════════════════════════════ */
  blk('[C] 예약 과다 0 — «최악 + 여유 한 자락» 인가');
  if (!B.__err) {
    const slack = p1(B.box - Math.max(B.peak, B.worst, B.line2));
    ok(slack >= 0 && slack <= 40,
       '[C1] ★ 예약 − 최악 = 0~40px (392 로 되돌리면 163.6 이 되어 빨개지는 자리)', slack + 'px');
  }

  /* ══ [D] 버튼 자릿수 예산 ═════════════════════════════════════════ */
  blk('[D] 버튼 자릿수 예산 (ⓑ — 584 축을 실측으로 다시 센다)');
  const D = await ev(() => {
    const r1 = n => Math.round(n * 10) / 10;
    const bw = document.querySelector('.tr-tp.k0 .tb').getBoundingClientRect().width;
    const inner = bw - 16;                    /* 검정 링 8px × 2 */
    const nat = [];
    for (let d = 1; d <= 13; d++) {
      const html = curIc('tstone', TP_CUR_PX) + '<b class="tbn">' + fmt(Number('9'.repeat(d))) + '</b>';
      nat.push({ d, w: window.__nat('.tr-tp.k0 .tb', html) });
    }
    /* 701 배수가 실제로 만드는 라벨 — 상자 «안» 에서 한 줄로 사는가(인라인 줄바꿈 0) */
    const o = temperObj(); const keep = { ...(o.alloc || {}) }, kmul = trMul;
    const real = [];
    [[999999, 1], [99999, 1000], [999999, 10]].forEach(([lv, mul]) => {
      TEMPERS.forEach(t => { o.alloc[t.k] = lv; });
      trMul = mul; renderTemper();
      const row = document.querySelector('.tr-tp.k0');
      const ln = window.__lines('.tr-tp.k0 .tb i', '.tr-tp.k0');
      const tb = row.querySelector('.tb').getBoundingClientRect(), rb = row.getBoundingClientRect();
      const inkX2 = Math.max(...ln.map(l => l.x2));
      /* ⚠ «줄 수» 를 `getClientRects().length` 로 세면 안 된다 — 이 라벨은 한 줄이라도
         `<img>`·`<b>` 가 **상자마다 하나씩** 준다(3개). 접혔는지는 `<i>` 의 **높이**가 말한다:
         한 줄이면 line-height 173 짜리 한 칸, 접히면 그 두 배가 된다. */
      const ib = row.querySelector('.tb i').getBoundingClientRect();
      real.push({ lv, mul, txt: row.querySelector('.tb').textContent,
                  boxes: ln.length, ih: r1(ib.height), over: r1(inkX2 - (tb.right - rb.x)) });
    });
    o.alloc = keep; trMul = kmul; renderTemper();
    return { bw: r1(bw), inner: r1(inner), nat, real,
             budget: nat.filter(x => x.w <= inner).length };
  });
  if (D.__err) ok(false, 'evaluate 실패: ' + D.__err);
  else {
    console.log('       상자 ' + D.bw + '(안쪽 ' + D.inner + ') · 예산 ' + D.budget + '자리');
    D.real.forEach(r => console.log('       Lv' + r.lv + ' ×' + r.mul + '  <i> 높이 ' + r.ih
      + ' · 상자 넘침 ' + r.over + '  «' + r.txt + '»'));
    ok(D.budget >= 11, '[D1] ★ 자릿수 예산 11자리 이상(340 짜리 그릇은 7자리였다)', D.budget + '자리');
    ok(D.real.every(r => r.ih <= 200), '[D2] ★ 701 배수 라벨이 상자 안에서 **한 줄**로 산다(<i> 높이 ≤ 200 = 한 칸)',
       D.real.map(r => r.ih).join(' · '));
    ok(D.real.every(r => r.over <= 0), '[D3] 그 라벨들이 상자를 안 넘는다',
       D.real.map(r => r.over).join(' · '));
  }

  /* ══ [E] 본체 — 빈 띠 ═════════════════════════════════════════════ */
  blk('[E] 본체 — 잉크 우변 ↔ 버튼 좌변 빈 띠 (등재문 실측 190~227px)');
  const E = await ev(() => {
    const o = temperObj(); const keep = { ...(o.alloc || {}) };
    const r1 = n => Math.round(n * 10) / 10;
    /* 등재문이 잰 상태 — 초반 레벨(짧은 문구)에서의 모습이다 */
    TEMPERS.forEach((t, i) => { o.alloc[t.k] = [0, 12, 7][i]; });
    renderTemper();
    const out = [];
    for (let i = 0; i < 3; i++) {
      const ln = window.__lines('.tr-tp.k' + i + ' .td i', '.tr-tp.k' + i);
      const tb = window.__rel('.tr-tp.k' + i + ' .tb', '.tr-tp.k' + i);
      out.push({ k: i, band: r1(tb.x - Math.max(...ln.map(l => l.x2))) });
    }
    o.alloc = keep; renderTemper();
    return out;
  });
  if (E.__err) ok(false, 'evaluate 실패: ' + E.__err);
  else ok(E.every(r => r.band <= 100), '[E1] ★ 빈 띠 100px 이하(수리 전 209px)',
     E.map(r => 'k' + r.k + ' ' + r.band).join(' · '));

  /* ══ [F] 안 건드린 것 ═════════════════════════════════════════════ */
  blk('[F] 686·612 가 푼 값 Δ0');
  if (!geo.__err) {
    ok(geo.tb.y === 22 && Math.abs(geo.tb.h - 173) < 0.5,
       '[F1] 버튼 세로 686 값 Δ0(top 22 · 코어 173)', geo.tb.y + ' · ' + geo.tb.h);
    ok(Math.abs(geo.rowW - geo.tb.x2 - 26) < 0.5,
       '[F2] 버튼 우변 여백 26 Δ0(584)', p1(geo.rowW - geo.tb.x2));
    ok(geo.td.x === 224 && geo.td.y === 128 && Math.abs(geo.td.h - 68) < 0.5,
       '[F3] `.td` 좌변·상변·높이 Δ0(612 · 686 2회차)', [geo.td.x, geo.td.y, geo.td.h].join(' · '));
    ok(geo.ti.x === 26 && geo.ti.y === 22 && Math.abs(geo.ti.w - 178) < 0.5,
       '[F4] 아이콘 액자 612 값 Δ0(26 · 22 · 178)', [geo.ti.x, geo.ti.y, geo.ti.w].join(' · '));
    ok(Math.abs(geo.rowW - 998) < 0.5 && Math.abs(geo.rowH - 222) < 0.5,
       '[F5] 행 998×222 Δ0', geo.rowW + '×' + geo.rowH);
  }

  /* ══ [G] 두 프레임 · 형제 교차 0 ══════════════════════════════════ */
  blk('[G] 9:13.3(1080×1600) — 가로 무관 · 행 안 겹침 0');
  await ctx.close();
  const { ctx: c2, page: p2 } = await openAt(browser, 1600);
  const G = await p2.evaluate(() => {
    const r1 = n => Math.round(n * 10) / 10;
    const row = document.querySelector('.tr-tp.k0'); if (!row) return null;
    const rb = row.getBoundingClientRect();
    const kids = [...row.children].map(e => {
      const a = e.getBoundingClientRect();
      return { c: e.className, x: r1(a.x - rb.x), x2: r1(a.right - rb.x),
               y: r1(a.y - rb.y), y2: r1(a.bottom - rb.y) };
    });
    let hit = [];
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i], b = kids[j];
      if (a.x < b.x2 && b.x < a.x2 && a.y < b.y2 && b.y < a.y2) hit.push(a.c + '↔' + b.c);
    }
    const td = kids.find(k => k.c === 'td'), tb = kids.find(k => k.c.split(' ')[0] === 'tb');
    return { kids, hit, tdW: td && r1(td.x2 - td.x), tdX: td && td.x, tbX: tb && tb.x,
             bevel: Math.max(...kids.map(k => k.y2)) };
  }).catch(e => ({ __err: String(e) }));
  if (!G || G.__err) ok(false, '1600 측정 실패: ' + (G && G.__err));
  else {
    ok(G.tdX === 224 && Math.abs(G.tdW - 236) < 0.5 && Math.abs(G.tbX - 476) < 0.5,
       '[G1] 1600 에서도 같은 가로 기하(224 / 236 / 476)', [G.tdX, G.tdW, G.tbX].join(' · '));
    ok(G.hit.length === 0, '[G2] 행 안 형제 상자 교차 0', G.hit.join(' · ') || '0건');
    ok(G.bevel <= 222 - 8, '[G3] 행 베벨(8) 안', G.bevel + ' ≤ 214');
  }

  /* ══ [R] 되돌림 시험 ═══════════════════════════════════════════════ */
  blk('[R] 되돌림 — 옛 값(392 · 340)으로 되돌리면 실제로 빨개지는가');
  const R = await p2.evaluate(() => {
    const r1 = n => Math.round(n * 10) / 10;
    const o = temperObj(); const keep = { ...(o.alloc || {}) };
    const st = document.createElement('style');
    st.textContent = '.tr-tp>.td{width:392px}.tr-tp>.tb{width:340px}';
    document.head.appendChild(st);
    TEMPERS.forEach((t, i) => { o.alloc[t.k] = [0, 12, 7][i]; });
    renderTemper();
    const ln = window.__lines('.tr-tp.k0 .td i', '.tr-tp.k0');
    const tb = window.__rel('.tr-tp.k0 .tb', '.tr-tp.k0');
    const band = r1(tb.x - Math.max(...ln.map(l => l.x2)));
    const inner = tb.w - 16;
    /* 옛 폭에서 701 배수 라벨이 실제로 접혔는지 — 주석이 «접힌다» 고 적은 그 자리 */
    const kmul = trMul;
    TEMPERS.forEach(t => { o.alloc[t.k] = 999999; });
    trMul = 1; renderTemper();
    const ihOld = r1(document.querySelector('.tr-tp.k0 .tb i').getBoundingClientRect().height);
    trMul = kmul;
    let budget = 0;
    for (let d = 1; d <= 13; d++) {
      const html = curIc('tstone', TP_CUR_PX) + '<b class="tbn">' + fmt(Number('9'.repeat(d))) + '</b>';
      if (window.__nat('.tr-tp.k0 .tb', html) <= inner) budget++;
    }
    document.head.removeChild(st);
    o.alloc = keep; renderTemper();
    return { band, budget, tbw: tb.w, ihOld };
  }).catch(e => ({ __err: String(e) }));
  if (R.__err) ok(false, '되돌림 측정 실패: ' + R.__err);
  else {
    ok(R.band > 100, '[R1] 옛 폭에서 [E1] 이 빨개진다(빈 띠 > 100px)', R.band + 'px');
    ok(R.budget < 11, '[R2] 옛 폭에서 [D1] 이 빨개진다(예산 < 11자리)', R.budget + '자리 (상자 ' + R.tbw + ')');
    ok(R.ihOld > 200, '[R3] 옛 폭에서 [D2] 도 빨개진다 — 8자리 라벨(«50,005,000»)이 두 줄로 접힌다',
       '<i> 높이 ' + R.ihOld + ' (지금 173)');
  }
  await c2.close();

  await browser.close();
  console.log('\nVERIFY769 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
