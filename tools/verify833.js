#!/usr/bin/env node
/* 게이트 — 작업 833 «10 이용권 카드 — 667 이 남긴 2인 일치 3건»
 *
 *   node tools/verify833.js
 *
 * 무엇을 지키는가
 *   §1 배지 종횡 — «2000% 가치» 배지 별의 **분홍 잉크**가 ref 종횡(0.94)을 따른다.
 *        ⚑ 667 10회차가 «크기 −3.6%» 로 넘긴 자리인데 뿌리는 크기가 아니라 **종횡**이었다:
 *          ref 잉크 158.84~160.90 × 169.15~171.21 (종횡 **0.9395**) ↔ 수리 전 우리 166 × 165 (1.006).
 *          잉크는 상자에서 검정 테(`.bdg>s{border:6px}`)를 뺀 값이라 **상자에게 물으면 나온다**.
 *   §2 두 줄  — 상자 높이가 178 → 184 로 커졌으므로 «2000%»·«가치» 두 줄이 **별 잉크 중심**에
 *              같이 따라 내려왔는가(5회차 규약의 부호만 반대다).
 *   §3 수량 세로 — 배너형 수량 잉크 상변이 리본 띠 하변 아래 **ref 범위(0.0~4.1)** 안이다.
 *              ⚠ **불릿형은 안 건드린다** — ref 자신이 8.3 ↔ 14.4 로 갈려 목표가 안 선다(A3-ⓑ).
 *              [3-c] 가 그 «안 건드림» 을 못박는다.
 *   §4 머리띠 — 833 이 **기각**한 자리다(제품 0줄). 헤더 밴드 세로는 이미 ref 다:
 *              위 검정 테 ref 10.15/9.00 ↔ 우리 10(=`.fr` 검정 테) · 채움 ref 96.12/102.28 ↔ 우리 96/102.
 *              «고쳐야 한다» 는 지적이 다시 오면 이 절이 먼저 대답한다.
 *   §5 프레임 — 9:19(2280)와 9:13.3(1600)에서 같은 값이다.
 *   §R 되돌림 시험 — 수리 전 값을 주입하면 **빨개진다**(§1·§3 이 공짜로 초록인 항이 아님을 못박는다).
 *
 * ref 실측은 `python3 tools/scan833.py` (분홍 잉크 bbox · 머리띠 50% 교차 모서리).
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const blk = t => console.log('\n' + t);
const p2 = n => Math.round(n * 100) / 100;

/* ── ref 실측 (scan833.py · 환산 px = ref × K, K = 2.0628) ────────────────── */
const REF = {
  bdgInkW: [160.90, 158.84],          // 배너형 / 불릿형 카드의 ref 배지 분홍 폭
  bdgInkH: [169.15, 171.21],          // 〃 높이
  hdbFill: { ban: 96.12, bul: 102.28 },   // 헤더 밴드 채움
  hdbTop: { ban: 10.15, bul: 9.00 },      // 밴드 위 검정 테
  qtyTopBan: [0.0, 4.1],              // 배너형 수량 잉크 상변 − 리본 띠 하변 (ref 두 줄)
};
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] === undefined
  ? NaN : (a.length % 2 ? a.slice().sort((x, y) => x - y)[(a.length - 1) / 2]
    : (a.slice().sort((x, y) => x - y)[a.length / 2 - 1] + a.slice().sort((x, y) => x - y)[a.length / 2]) / 2);

async function open(browser, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openShopTab === 'function');
  await page.waitForTimeout(500);
  await page.evaluate(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(450);
  return { page, errs };
}

/* 카드마다 «상자는 DOM 에서» — 잉크는 상자에서 검정 테를 뺀 산수다(667 10회차 규약). */
const DUMP = `(() => {
  const A = document.getElementById('app').getBoundingClientRect();
  const B = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
    return { x: +(r.left - A.left).toFixed(2), y: +(r.top - A.top).toFixed(2),
             w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const num = (v) => parseFloat(v) || 0;
  return [...document.querySelectorAll('.pvc')].map((c) => {
    const cr = B(c), ban = c.classList.contains('ban1');
    const bdg = c.querySelector('.bdg'), s = bdg && bdg.querySelector('s');
    const bw = s ? num(getComputedStyle(s).borderTopWidth) : 0;
    const bb = B(bdg);
    const lines = [...bdg.querySelectorAll('i,b')].map(B);
    const hdb = B(c.querySelector('.hdb'));
    const pil = B(c.querySelector('.pil'));
    const fr = c.querySelector('.fr');
    const rbs = ['rb1', 'rb2'].map((k) => {
      const rb = c.querySelector('.' + k); if (!rb) return null;
      const u = rb.querySelector('u');
      return { rb: B(rb), u: B(u), utop: num(getComputedStyle(u).top) };
    });
    return { id: c.dataset.pv, ban, card: cr, bdg: bb, bdgBorder: bw, lines, hdb, pil,
      frBorder: fr ? num(getComputedStyle(fr).borderTopWidth) : 0, rbs };
  });
})()`;

(async () => {
  const browser = await launch(chromium);
  const { page, errs } = await open(browser, 2280);
  const cards = await page.evaluate(DUMP);

  blk('§0 [전제] 카드가 세 장 뜬다');
  ok(cards.length === 3, '이용권 카드 3장', cards.map(c => c.id).join(' · '));
  ok(cards.filter(c => c.ban).length === 1, '배너형 1 · 불릿형 2',
    cards.map(c => c.id + (c.ban ? '(배너)' : '(불릿)')).join(' · '));

  blk('§1 배지 분홍 잉크 — ref 종횡을 따른다');
  const refW = med(REF.bdgInkW), refH = med(REF.bdgInkH), refAsp = refW / refH;
  for (const c of cards) {
    /* 잉크 = 상자 − 검정 테. 세로는 별 꼭짓점이 상자 변에 닿아 AA 1px 이 더 먹는다
       (수리 전 실측이 그 상수를 확정했다: 상자 178 → 잉크 가로 166 = 178−12 · 세로 165 = 178−13). */
    const inkW = c.bdg.w - 2 * c.bdgBorder;
    const inkH = c.bdg.h - (2 * c.bdgBorder + 1);
    ok(Math.abs(inkW - refW) <= 3, `[1-a] ${c.id} 배지 잉크 폭 ≈ ref ${p2(refW)}`, `${p2(inkW)}`);
    ok(Math.abs(inkH - refH) <= 3, `[1-b] ${c.id} 배지 잉크 높이 ≈ ref ${p2(refH)}`, `${p2(inkH)}`);
    ok(Math.abs(inkW / inkH - refAsp) <= 0.02,
      `[1-c] ${c.id} 배지 종횡 ≈ ref ${p2(refAsp)}`, `${p2(inkW / inkH)}`);
    /* 잉크 윗변은 **안 건드린 축**이다(수리 전에도 ref 였다) — 그대로인지 못박는다. */
    const inkTop = c.bdg.y + c.bdgBorder + 0.5 - c.card.y;
    ok(inkTop >= -34 && inkTop <= -29,
      `[1-d] ${c.id} 배지 잉크 윗변이 카드 상변 위 29~34 (ref −29.8/−32.5)`, `${p2(inkTop)}`);
  }

  blk('§2 «2000%»·«가치» 두 줄이 별 잉크 중심을 따라간다');
  for (const c of cards) {
    const top = Math.min(...c.lines.map(l => l.y));
    const bot = Math.max(...c.lines.map(l => l.y + l.h));
    const cLine = (top + bot) / 2 - c.bdg.y;                 // 상자-로컬 두 줄 중심
    const cStar = (c.bdg.h - 1) / 2 + c.bdgBorder * 0 + 0.5; // 상자-로컬 별 잉크 중심 ≈ 상자 중심
    ok(Math.abs(cLine - cStar) <= 8,
      `[2-a] ${c.id} 두 줄 중심이 별 중심에서 ±8`, `줄 ${p2(cLine)} ↔ 별 ${p2(cStar)}`);
    ok(top > c.bdg.y && bot < c.bdg.y + c.bdg.h + 6,
      `[2-b] ${c.id} 두 줄이 배지 상자 안(아래로 6 여유)`, `${p2(top)}..${p2(bot)} ⊂ ${p2(c.bdg.y)}..${p2(c.bdg.y + c.bdg.h)}`);
  }

  blk('§3 수량 세로 — 배너형만 옮겼다');
  for (const c of cards) {
    for (const r of c.rbs) {
      if (!r) continue;
      const d = r.u.y - (r.rb.y + r.rb.h);          // 상자 기준 — 잉크는 아래 [3-b] 가 본다
      ok(c.ban ? r.utop === 49 : r.utop === 58,
        `[3-a] ${c.id} 수량 top = ${c.ban ? 49 : 58}`, `${r.utop}`);
      ok(d > -40 && d < 40, `[3-b] ${c.id} 수량 상자가 리본 바로 아래`, `${p2(d)}`);
    }
  }
  const bul = cards.filter(c => !c.ban);
  ok(bul.every(c => c.rbs.every(r => r.utop === 58)),
    '[3-c] 불릿형 수량은 **안 건드렸다**(ref 가 8.3 ↔ 14.4 로 갈리는 축 · A3-ⓑ)');

  blk('§4 머리띠 — 833 이 기각한 자리(제품 0줄)');
  for (const c of cards) {
    const want = c.ban ? REF.hdbFill.ban : REF.hdbFill.bul;
    ok(Math.abs(c.hdb.h - want) <= 2.5,
      `[4-a] ${c.id} 밴드 채움 ≈ ref ${want}`, `${p2(c.hdb.h)}`);
    const top = c.hdb.y - c.card.y;
    ok(Math.abs(top - c.frBorder) < 0.6,
      `[4-b] ${c.id} 밴드 위 검정 = 카드 프레임 테 ${c.frBorder}`, `${p2(top)}`);
    const refTop = c.ban ? REF.hdbTop.ban : REF.hdbTop.bul;
    ok(Math.abs(c.frBorder - refTop) <= 1.5,
      `[4-c] ${c.id} 그 검정 테가 ref ${refTop} 안`, `${p2(c.frBorder)}`);
  }

  blk('§6 마일리지 알약 — 위로만 줄였다(아래끝 붙박이)');
  for (const c of cards) {
    ok(Math.abs(c.pil.h - 65.5) < 0.6, `[6-a] ${c.id} 알약 높이 ≈ ref 65.0~66.0`, `${p2(c.pil.h)}`);
    const bot = c.pil.y + c.pil.h - c.card.y;
    ok(Math.abs(bot - 14) < 0.6, `[6-b] ${c.id} 알약 하변 = 카드 상변 +14 (수리 전과 같다)`, `${p2(bot)}`);
    const up = c.card.y - c.pil.y;
    ok(up >= 50.5 && up <= 52.5, `[6-c] ${c.id} 카드 위로 솟는 양 51.4~52.2(ref)`, `${p2(up)}`);
  }

  blk('§5 9:13.3(1600) — 카드 안 기하가 같다');
  const { page: p16, errs: e16 } = await open(browser, 1600);
  const c16 = await p16.evaluate(DUMP);
  const sig = (cs) => cs.map(c => [c.id, c.bdg.w, c.bdg.h, c.hdb.h, c.pil.h, c.pil.y - c.card.y,
    ...c.rbs.map(r => r && r.utop)].join(',')).join('|');
  ok(sig(c16) === sig(cards), '[5-a] 두 프레임 서명 동일',
    sig(cards) === sig(c16) ? '동일' : `${sig(cards)} ↔ ${sig(c16)}`);
  ok(e16.length === 0, '[5-b] 1600 콘솔 에러 0건', String(e16.length));
  await p16.context().close();

  blk('§R 되돌림 시험 — 수리 전 값을 넣으면 빨개진다');
  await page.addStyleTag({ content:
    '.pvc>.bdg{width:178px!important;height:178px!important}'
    + '.pvc.ban1>.rb>u{top:52px!important}'
    + '.pvc>.pil{top:-54px!important;height:68px!important}' });
  await page.waitForTimeout(120);
  const back = await page.evaluate(DUMP);
  const b0 = back[0];
  const inkW0 = b0.bdg.w - 2 * b0.bdgBorder, inkH0 = b0.bdg.h - (2 * b0.bdgBorder + 1);
  ok(Math.abs(inkW0 - refW) > 3 || Math.abs(inkH0 - refH) > 3,
    '[R1] 상자를 178×178 로 되돌리면 §1 이 빨개진다', `${p2(inkW0)}×${p2(inkH0)}`);
  ok(Math.abs(inkW0 / inkH0 - refAsp) > 0.02,
    '[R2] 그 상태의 종횡은 ref 밖', `${p2(inkW0 / inkH0)}`);
  ok(back.find(c => c.ban).rbs[0].utop === 52,
    '[R3] 배너형 수량을 52 로 되돌리면 [3-a] 가 빨개진다', '52');
  const pb = back[0];
  ok(Math.abs(pb.pil.h - 65.5) >= 0.6 && Math.abs(pb.card.y - pb.pil.y - 51.5) >= 0.6,
    '[R4] 알약을 68/−54 로 되돌리면 §6 이 빨개진다',
    `h ${p2(pb.pil.h)} · 솟음 ${p2(pb.card.y - pb.pil.y)}`);
  ok(Math.abs(pb.pil.y + pb.pil.h - pb.card.y - 14) < 0.6,
    '[R4b] 그때도 **하변은 14 로 같다** — 이번 수리가 «아래를 안 건드렸다» 는 증거',
    `${p2(pb.pil.y + pb.pil.h - pb.card.y)}`);

  blk('§Z 콘솔');
  ok(errs.length === 0, '[Z] 콘솔·페이지 에러 0건', String(errs.length));

  await browser.close();
  console.log(`\nVERIFY833 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
