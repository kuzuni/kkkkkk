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
      return { rb: B(rb), u: B(u), utop: num(getComputedStyle(u).top), b: B(rb.querySelector('b')) };
    });
    const ti = c.querySelector('.pvt>i'), tcs = ti && getComputedStyle(ti);
    const stt = c.querySelector('.stt'), sti = stt && stt.querySelector('i');
    /* 833 6회차 — 배너형 카드에만 있는 라벨(.ban>i).
       ⚠ 상자 폭은 **offsetWidth**(레이아웃 값)로 잡는다 — getBoundingClientRect 는 scaleX 가 걸린
       변환 후 bbox 라 «상자가 좁아졌다» 로 읽힌다. advance 는 Range 로 재고(667 [G3] 자와 같은 방법),
       그 값은 변환 뒤 값이므로 배율로 나눠 **변환 전 advance** 를 되살린다. */
    const bi = c.querySelector('.ban>i');
    let banI = null;
    if (bi) {
      const bcs = getComputedStyle(bi);
      const rg = document.createRange(); rg.selectNodeContents(bi);
      banI = { fs: num(bcs.fontSize), lh: num(bcs.lineHeight), tr: bcs.transform,
        org: bcs.transformOrigin, left: num(bcs.left), right: num(bcs.right),
        stroke: num(bcs.webkitTextStrokeWidth), align: bcs.textAlign,
        boxW: +bi.offsetWidth.toFixed(2), advScaled: +rg.getBoundingClientRect().width.toFixed(2) };
    }
    return { id: c.dataset.pv, ban, card: cr, bdg: bb, bdgBorder: bw, lines, hdb, pil,
      frBorder: fr ? num(getComputedStyle(fr).borderTopWidth) : 0, rbs,
      ti: B(ti), tiFs: tcs ? num(tcs.fontSize) : null, tiLh: tcs ? num(tcs.lineHeight) : null,
      tiTr: tcs ? tcs.transform : null, tiOrg: tcs ? tcs.transformOrigin : null,
      stt: B(stt), sttI: B(sti),
      sttITop: sti ? num(getComputedStyle(sti).top) : null,
      sttITr: sti ? getComputedStyle(sti).transform : null,
      sttIFs: sti ? num(getComputedStyle(sti).fontSize) : null,
      sttILh: sti ? num(getComputedStyle(sti).lineHeight) : null, banI };
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

  blk('§7 리본2 우단 — ref 두 카드가 같은 자리(529.2)다');
  /* 자 `tools/scan833b.py` (환산 px · 리본 왼끝에서 걸어 나가 처음 «카드 몸통색» 이 되는 자리):
       ref 배너 리본2 **529.2** · ref 불릿 리본2 **529.2**(소수점까지 같다) ↔ 수리 전 520.0 / 525.0.
       리본1 은 ref 자신이 430.2 ↔ 446.7 로 갈리므로 **안 건드린다**(A3-ⓑ).
     제비꼬리가 마지막 열을 덮으므로 «보이는 우단 = 상자 우단 − 1» ⇒ 상자 530 이 곧 529. */
  for (const c of cards) {
    const r2 = c.rbs[1];
    ok(Math.abs((r2.rb.x + r2.rb.w - c.card.x) - 530) < 0.6,
      `[7-a] ${c.id} 리본2 우단 = 530 (보이는 529 ≈ ref 529.2)`,
      `${p2(r2.rb.x + r2.rb.w - c.card.x)}`);
    const r1 = c.rbs[0];
    ok(Math.abs((r1.rb.x + r1.rb.w - c.card.x) - (c.ban ? 424 : 350)) < 0.6,
      `[7-b] ${c.id} 리본1 우단은 **안 건드렸다** (${c.ban ? 424 : 350})`,
      `${p2(r1.rb.x + r1.rb.w - c.card.x)}`);
    /* ⚑ `--gx` 는 리본 오른끝 기준이라 w2 만 늘리면 판·수량이 같이 밀린다 —
       g2 를 같은 Δ 만큼 키워 붙박은 것을 여기서 못박는다(667 [F3]·[F4] 와 같은 값). */
    const bCx = r2.b.x + r2.b.w / 2 - c.card.x;
    ok(Math.abs(bCx - (c.ban ? 441.5 : 451.5)) < 1.5,
      `[7-c] ${c.id} 리본2 금색 판 중심 Δ0 (667 [F3]/[F4] 자리 ${c.ban ? 441.5 : 451.5})`, `${p2(bCx)}`);
    ok(Math.abs((r2.u.x + r2.u.w / 2) - (r2.b.x + r2.b.w / 2)) < 0.6,
      `[7-d] ${c.id} 수량 중심 = 판 중심 (667 [G4] 규약 유지)`,
      `${p2(r2.u.x + r2.u.w / 2 - r2.b.x - r2.b.w / 2)}`);
  }

  blk('§8 상태 탭 — 판은 그대로, 라벨만 내렸다');
  /* 자 `tools/scan833b.py` (카드 상변 기준 환산 px · 잉크 bbox):
       | | ref 배너 | ref 불릿 | 수리 전 | 수리 후 |
       | 잉크 상변 | −29.8 | −32.5 | −39.0 | **−32.0** |
       | 잉크 하변 |  −0.9 |  −3.6 |  −8.0 |  **−1.0** |
       | 잉크 중심 | −15.4 | −18.1 | −23.5 | **−16.5** |
       | 판이 솟은 양 | 54.5 | 55.2 | 56.0 | 56.0(무변경) |
     ⇒ 1회차 2인 일치 3번의 두 갈래 중 **CY(«잉크가 7.7px 위»)가 맞고 CX(«판이 3.8~5.7 높다»)는
     기각**이다(판 Δ +1.2 = +2.2%). 손잡이는 `.stt>i{top}` 하나. */
  for (const c of cards) {
    ok(c.sttITop === 16, `[8-a] ${c.id} 탭 라벨 top = 16 (수리 전 9)`, `${c.sttITop}`);
    ok(c.sttIFs === 36 && c.sttILh === 40,
      `[8-b] ${c.id} 라벨 서체 상수 불변 (36/40 — 잉크 오프셋이 이 둘에 매여 있다)`,
      `${c.sttIFs}/${c.sttILh}`);
    ok(c.sttI.y + c.sttI.h <= c.stt.y + c.stt.h + 0.6,
      `[8-c] ${c.id} 라벨 줄상자가 탭 판 안 (넘치면 잘린다)`,
      `${p2(c.sttI.y + c.sttI.h - c.stt.y)} ≤ ${p2(c.stt.h)}`);
    ok(Math.abs((c.card.y - c.stt.y) - 56) < 0.6 && Math.abs(c.stt.h - 68) < 0.6,
      `[8-d] ${c.id} 탭 판은 **안 건드렸다** (솟음 56 · 높이 68)`,
      `${p2(c.card.y - c.stt.y)} / ${p2(c.stt.h)}`);
  }
  ok(new Set(cards.map(c => c.sttITop)).size === 1,
    '[8-e] 세 카드가 한 부품 — 라벨 자리가 한 값', cards.map(c => c.sttITop).join(' / '));
  /* ⚑ 5회차 — 라벨이 **가로로만** 6.5% 눌려 있었다(비평가 **넷**이 독립으로 같은 값 ·
     전원 «높이는 맞다»). 범인은 `scaleX(.94)` 하나이고 되돌릴 배율은 산수로 1.0 이다
     (잉크 108 ÷ .94 = 114.9 ↔ ref 115.5). 실측 후 `ink151.py`: **115 × 31 ↔ ref 115.5 × 30.9**
     (−0.4% / +0.3%). ⚠ 세로(top:16)는 3회차 자리 그대로 — 그 축은 넷 다 «맞음» 이었다. */
  for (const c of cards) {
    ok(c.sttITr === 'none',
      `[8-f] ${c.id} 탭 라벨에 가로 배율이 없다 (scaleX(.94) 제거 — ref 폭 115.5 ↔ 우리 115)`,
      `${c.sttITr}`);
  }

  blk('§9 제목 글자 — em 은 세로로, scaleX 는 가로로 (원점은 **좌변**)');
  /* 자 `tools/ink151.py`(흰 채움만 = 검정 획이 안 섞인다) · `tools/scan833b.py`(잉크 bbox):
       | 흰 잉크 (환산 px) | ref | 수리 전 | 수리 후 |
       | 제목 1장 | 185.7 × 43.3 | 200 × 46 (+7.7% / +6.2%) | **184 × 44** (−0.9% / +1.6%) |
       | 제목 2장 | 278.5 × 47.5 | 307 × 49 (+10.2% / +3.2%) | **283 × 47** (+1.6% / −1.1%) |
     ⚠⚠ [9-c] 가 이 수리의 **본체**다 — `#shopw i{transform-origin:50% 50%}`(ID 1,0,1)가
     클래스 선택자(0,3,1)를 조용히 이겨서, 스코프 짝이 없으면 scaleX 가 **중앙 기준**으로 걸리고
     잉크 좌단이 74 → 78 로 밀린다(두 비평가가 «맞음» 으로 올린 자리를 이번 수리가 깨는 것이다). */
  for (const c of cards) {
    ok(c.tiFs === 54.5, `[9-a] ${c.id} 제목 font-size = 54.5 (수리 전 57)`, `${c.tiFs}`);
    ok(/matrix\(0\.96,/.test(c.tiTr), `[9-b] ${c.id} 제목 scaleX(.96)`, `${c.tiTr}`);
    ok(/^0px /.test(c.tiOrg),
      `[9-c] ${c.id} 제목 transform-origin 의 **x 가 0** — #shopw 특이성 함정을 이겼다`, `${c.tiOrg}`);
    ok(c.tiLh === 60, `[9-d] ${c.id} line-height 60 불변 (세로 중심이 여기 매여 있다)`, `${c.tiLh}`);
    ok(Math.abs((c.ti.x - c.card.x) - 78) < 0.6,
      `[9-e] ${c.id} 제목 상자 좌단 78 불변 (원점이 좌변이라 상자가 안 움직인다)`,
      `${p2(c.ti.x - c.card.x)}`);
  }

  blk('§10 배너 라벨 — 가로만 되돌렸다 (세로는 [G3] 이 막는 자리)');
  /* 자 `tools/ink151.py`(흰 채움 min>246 · 검정 획이 안 섞인다):
       | 배너 글자 (환산 px) | ref | 수리 전 | 수리 후 |
       | 잉크 w × h | 235.2 × 28.9 | 261 × 28 (**+11.0%** / −3.1%) | **235 × 28** (−0.1% / −3.1%) |
       | 잉크 중심 x (카드-로컬) | 317.7 + 50 = 367.7 | 369.0 | **369.0** (무변경) |
     ⚑ 비평가 DB [A] 도 «낱자 가로 +19% · 총 폭 +11.0% · 높이 Δ+0.1» 로 같은 축을 찍었다.
     ⚠ **세로를 안 올린 것이 이 절의 본체다** — fs 36 → 37 이면 advance 가 상자 폭(269)을 넘고,
     넘치는 순간 `text-align:center` 가 죽어 잉크가 오른쪽으로만 밀린다(667 [G3] 이 같은 사고를
     수량에서 이미 겪었다). [10-d] 가 그 여유를 매 실행 찍는다 — 높이 −3.1% 는 0.9px 이다.
     ⚠ 원점은 여기서 **중앙이 옳다**(4회차 제목과 반대다) — 라벨이 `left/right + text-align:center`
     라 잉크가 상자 중심 언저리에 앉고, 중앙 원점으로 줄여야 중심이 안 움직인다. [10-c] 가 그 뜻이고,
     제목처럼 `transform-origin:0 50%` 짝을 만들면 이 자리는 **왼쪽으로 밀린다**. */
  const banC = cards.find(c => c.ban);
  ok(!!(banC && banC.banI), '[10-0] 배너형 카드에 라벨이 있다', banC && banC.banI ? 'ok' : '없음');
  if (banC && banC.banI) {
    const B10 = banC.banI;
    const sx = (B10.tr.match(/matrix\(([-\d.]+)/) || [])[1];
    ok(/^matrix\(0\.9,/.test(B10.tr), '[10-a] 배너 라벨 scaleX(.9) (수리 전 없음)', B10.tr);
    ok(B10.fs === 36 && B10.lh === 40,
      '[10-b] 세로 축(fs 36 · line-height 40)은 **안 건드렸다**', `${B10.fs}/${B10.lh}`);
    ok(Math.abs(parseFloat(B10.org) - B10.boxW / 2) < 1.5,
      '[10-c] 원점 x = 상자 중심 (#shopw 규칙이 이기는 것이 **여기서는 옳다**)',
      `${B10.org} ↔ 상자 중심 ${p2(B10.boxW / 2)}`);
    const adv0 = B10.advScaled / parseFloat(sx || 1);
    /* ⚠⚠ 6회차가 자를 대고서야 안 것 — 이 라벨은 **이미 상자를 9.6px 넘고 있다**(advance 264.6 ↔
       상자 255 · `.ban{border:7}` 과 `box-sizing:border-box` 때문에 상자는 269 가 아니라 255 다).
       즉 `text-align:center` 는 여기서 이미 죽어 있고(넘치면 왼끝에서 시작한다 — 667 [G3] 이 수량에서
       겪은 것과 같다), 667 은 그 사실을 알고 **넘침의 절반(4.8px)을 `left` 로 미리 갚아 놨다**
       (CSS 주석 «그 4 를 빼고 적는다 ⇒ left = 2×(317.7−4.0) − 450»).
       ⇒ 여기서 물을 것은 «안 넘치는가» 가 아니라 **«넘침이 그대로인가»** 다 — fs 를 올리면 넘침이
       커지고 그만큼 잉크 중심이 오른쪽으로 밀려 667 의 보정이 어긋난다. 6회차가 세로를 안 건드린
       진짜 이유가 이것이고, [10-h] 가 그 결과(잉크 중심)를 직접 잰다. */
    ok(adv0 - B10.boxW >= 8 && adv0 - B10.boxW <= 11,
      `[10-d] 넘침 = advance − 상자폭 이 9.6px 그대로 (667 이 그 절반을 left 로 갚아 놓은 값)`,
      `${p2(adv0)} − ${p2(B10.boxW)} = ${p2(adv0 - B10.boxW)}`);
    ok(Math.abs(B10.advScaled - 235.2) <= 8,
      '[10-e] 변환 뒤 advance ≈ ref 환산 잉크 235.2 (±8 = side bearing 몫)', `${p2(B10.advScaled)}`);
    /* 넘치는 줄은 상자 왼끝에서 시작하므로 레이아웃 잉크 중심 = 상자 좌단 + advance/2 이고,
       배율은 **상자 중심** 기준이라 변환 뒤 중심 = 상자중심 + (레이아웃중심 − 상자중심)×0.9 다.
       ref 목표는 배너-로컬 317.7 = 카드-로컬 367.7(배너 좌단 50). 캡처 실측(흰 채움)도 369.0 이다. */
    const boxL = 50 + 7 + B10.left, boxC = boxL + B10.boxW / 2;
    const inkC = boxC + (boxL + adv0 / 2 - boxC) * parseFloat(sx || 1);
    ok(Math.abs(inkC - 367.7) <= 3,
      '[10-h] 변환 뒤 잉크 중심이 ref 367.7(카드-로컬) ±3 — 배율이 중심을 안 옮겼다', `${p2(inkC)}`);
    ok(B10.left === 181 && B10.right === 12 && B10.align === 'center',
      '[10-f] 상자(181/12)와 가운데 정렬은 **안 건드렸다**',
      `${B10.left}/${B10.right}/${B10.align}`);
    ok(B10.stroke === 8, '[10-g] 검정 획 8px 불변 (배율은 획도 같이 누른다 — ⑤ 기록)', `${B10.stroke}`);
  }

  blk('§5 9:13.3(1600) — 카드 안 기하가 같다');
  const { page: p16, errs: e16 } = await open(browser, 1600);
  const c16 = await p16.evaluate(DUMP);
  const sig = (cs) => cs.map(c => [c.id, c.bdg.w, c.bdg.h, c.hdb.h, c.pil.h, c.pil.y - c.card.y,
    ...c.rbs.map(r => r && r.utop),
    /* 833 3회차 편입 — 리본2 우단·탭 라벨도 두 프레임에서 같아야 한다 */
    ...c.rbs.map(r => r && p2(r.rb.x + r.rb.w - c.card.x)), c.sttITop].join(',')).join('|');
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
  /* 3회차 두 수리의 되돌림 짝 — 둘 다 CSS 로는 못 되돌린다(리본 폭은 인라인 style 이고
     `--gx` 는 그 폭에 매여 있다) ⇒ 인라인 값을 직접 되돌려 넣는다. */
  const back3 = await page.evaluate(() => {
    document.querySelectorAll('.pvc').forEach((c) => {
      const ban = c.classList.contains('ban1');
      const r2 = c.querySelector('.rb2');
      r2.style.width = (ban ? 521 : 526) + 'px';          // 833 3회차 전
      r2.style.setProperty('--gx', (ban ? 34 : 23) + 'px');
      c.querySelector('.stt>i').style.top = '9px';
    });
    const A = document.getElementById('app').getBoundingClientRect();
    const B = e => { const r = e.getBoundingClientRect();
      return { x: r.left - A.left, y: r.top - A.top, w: r.width, h: r.height }; };
    return [...document.querySelectorAll('.pvc')].map((c) => {
      const cr = B(c), r2 = c.querySelector('.rb2');
      return { ban: c.classList.contains('ban1'),
        rbR: +(B(r2).x + B(r2).w - cr.x).toFixed(2),
        bCx: +(B(r2.querySelector('b')).x + B(r2.querySelector('b')).w / 2 - cr.x).toFixed(2),
        iTop: +getComputedStyle(c.querySelector('.stt>i')).top.replace('px', '') };
    });
  });
  ok(back3.every(c => Math.abs(c.rbR - 530) > 1),
    '[R5] 리본2 폭을 521/526 으로 되돌리면 §7 [7-a] 가 빨개진다',
    back3.map(c => c.rbR).join(' / '));
  ok(back3.every(c => Math.abs(c.bCx - (c.ban ? 441.5 : 451.5)) < 1.5),
    '[R5b] 그때도 **판 중심은 같다** — 3회차가 판을 «`--gx` 로 붙박았다» 는 증거(움직인 것은 우단뿐)',
    back3.map(c => c.bCx).join(' / '));
  ok(back3.every(c => c.iTop === 9),
    '[R6] 탭 라벨을 top:9 로 되돌리면 §8 [8-a] 가 빨개진다', back3.map(c => c.iTop).join(' / '));
  const back5 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '.pvc>.stt>i{transform:scaleX(.94)}';      /* 833 5회차 전 */
    document.head.appendChild(st);
    return [...document.querySelectorAll('.pvc')]
      .map(c => getComputedStyle(c.querySelector('.stt>i')).transform);
  });
  ok(back5.every(t => t !== 'none'),
    '[R8] 탭 라벨에 scaleX(.94) 를 되돌리면 §8 [8-f] 가 빨개진다', back5.join(' / '));
  /* 6회차 짝 — 배너 라벨의 배율을 지우면 §10 [10-a]·[10-e] 가 빨개진다.
     ⚑ «상수를 지웠다» 로 끝내지 않고 **advance 가 실제로 ref 밖으로 나가는 것**까지 본다. */
  const back6 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '.pvc>.ban>i{transform:none!important}';       /* 833 6회차 전 */
    document.head.appendChild(st);
    const bi = document.querySelector('.pvc.ban1>.ban>i');
    const rg = document.createRange(); rg.selectNodeContents(bi);
    return { tr: getComputedStyle(bi).transform,
      adv: +rg.getBoundingClientRect().width.toFixed(2), boxW: +bi.offsetWidth.toFixed(2) };
  });
  ok(back6.tr === 'none' && Math.abs(back6.adv - 235.2) > 8,
    '[R9] 배너 라벨 배율을 지우면 §10 이 빨개진다 (advance 가 ref 235.2 밖으로 나간다)',
    `${back6.tr} · advance ${p2(back6.adv)}`);
  ok(back6.adv / 235.2 - 1 > 0.1 && Math.abs((back6.adv - back6.boxW) - 9.64) < 1,
    '[R9b] 되돌린 폭은 ref 보다 +12.5% 이고 **넘침은 같다** — 6회차가 고친 것이 «넘침» 이 아니라 «넓음» 이라는 증거',
    `+${p2((back6.adv / 235.2 - 1) * 100)}% · 넘침 ${p2(back6.adv - back6.boxW)}`);
  /* ⚑ [R7] 은 «값을 되돌리면 빨개진다» 가 아니라 **«스코프 짝을 빼면 조용히 진다»** 를 못박는다 —
     이번 수리에서 실제로 사람을 속인 것이 그것이다(선언은 남아 있는데 computed 만 바뀐다). */
  const back4 = await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '#shopw .pvc>.pvt>i{transform-origin:50% 50%}';   /* 스코프 짝을 무력화 */
    document.head.appendChild(st);
    const A = document.getElementById('app').getBoundingClientRect();
    return [...document.querySelectorAll('.pvc')].map((c) => {
      const i = c.querySelector('.pvt>i');
      return { org: getComputedStyle(i).transformOrigin,
        l: +(i.getBoundingClientRect().left - c.getBoundingClientRect().left).toFixed(2) };
    });
  });
  ok(back4.every(c => !/^0px /.test(c.org)),
    '[R7] 스코프 짝을 되돌리면 §9 [9-c] 가 빨개진다 (원점이 중앙으로 돌아간다)',
    back4.map(c => c.org).join(' / '));
  ok(back4.every(c => c.l > 78.5),
    '[R7b] 그때 제목 상자가 실제로 **오른쪽으로 밀린다** — [9-c] 가 지키는 것이 이 4px 이다',
    back4.map(c => c.l).join(' / '));

  blk('§Z 콘솔');
  ok(errs.length === 0, '[Z] 콘솔·페이지 에러 0건', String(errs.length));

  await browser.close();
  console.log(`\nVERIFY833 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
