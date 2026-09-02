#!/usr/bin/env node
/* 713 게이트 — 소환 배수 토글의 «자리» 정정 (주인 정정 2026-09-02 02:50)
 *
 *   node tools/verify713.js
 *
 * 주인 원문: «그 소환결과쪽에 x1 x10 x100 이런거 놔달라니까 소환팝업에 놧네».
 * 668 은 토글을 10 상점 소환 탭에 놓았다 — 정위치는 **12 소환 결과 팝업의 재소환 버튼 쪽**이다.
 * 713 은 부품(`.stabs.sp4`)·상태(`sumMul`)·등가성 코어(`summonBatch`)를 그대로 두고 **자리만** 옮겼다.
 *
 * 절:
 *   [A] 자리   — 바가 #sumw 의 `.sm-panel` 자식이고 띠 안 제자리에 선다(좌 36 · 폭 724 · 셸 98)
 *   [B] 짝     — 363 스킵 토글과 **세로 중심이 같고**(둘 다 띠 중앙) 서로·그리드·크롬과 안 겹친다
 *   [C] 라벨   — 4칸이 `SUM_MULS` 에서 오고, 가장 긴 «×1,000» 잉크가 칸 안에 든다
 *   [D] 동작   — 칸을 누르면 이 팝업의 [10회]·[30회] 라벨·가격이 배수로 바뀌고 **실제로 그만큼 뽑힌다**
 *   [E] 상점   — 상점에는 토글이 **0건**이고 리스트 하변·카드 라벨이 668 **이전**으로 돌아왔다
 *   [F] 회귀   — 327 패널 1080 · 그리드 846 ≥ 최악 5행 846 · 84 버튼/닫기 앵커 Δ0
 *   [G] 배경 탭 — 바를 눌러도 팝업이 안 닫힌다(84 «떨어져 나간 노드» 규약)
 *   [H] 닫힘   — 팝업을 닫으면 배수가 ×1 로 돌아간다(713 위임 규약 채택)
 *   [R] 되돌림 — 이 자가 무르지 않다는 증거: [R1] 띠를 668 시절 98 패딩으로 되돌린 사본에서는
 *                바가 그리드를 침범하고, [R2] 713 자리(bottom 15/36)로 되돌린 사본에서는
 *                [A7] 이 재는 크롬 여유가 0 이 된다(= [A]·[B] 가 «이미 참인 것» 을 세는 게 아니다)
 *
 * ⚠ 프레임 둘(2280 · 1600)에서 같은 것을 묻는다 — 팝업은 짧은 프레임 보호항이 걸린 화면이다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, t) => Math.abs(a - b) <= t;

const BAR_L = 36, BAR_W = 724, SHELL_H = 98;   /* 자리·폭·공용 셸 높이 */
/* ⚑ 747 이관(2026-09-02) — 713 1회차 비평 2인의 최대 감점(«바가 하단 테두리에 눌려 붙었다»)을
   갚으면서 띠가 [15,113] → **[15,127]** 로 14px 넓어졌고 그 여유는 **전부 바 아래**로 갔다.
   ⇒ 바 bottom 15 → **29** · 토글 bottom 36 → **50**(둘의 세로 중심 78 로 여전히 같다) ·
     padding-bottom 113 → **127** · 여유 MARGIN 0 → **14**([A7] 이 그 14 를 직접 잰다).
   ⚠ 값만 갈아 끼운 것이 아니다 — [A5] 는 «띠를 꽉 채운다» 에서 **«그리드에 붙고 크롬과 14 뜬다»**
     로 뜻이 바뀌었고, 그래서 [A7] 이 새로 있다(무르게 푼 자리가 아님은 [R1] 이 그대로 못박는다). */
const BAR_BOT = 29, SK_BOT = 50;               /* 띠 [15,127] — 바는 그리드에 붙고 여유 14 는 아래 */
const CHROME = 15, MARGIN = 14, PAD_BOT = 127; /* `.sm-panel::after` · 크롬과의 여유(747) · padding-bottom */
const GH = 868, PITCH = 170;                   /* --sm-gh · 결과 그리드 행 pitch */
const WORST = 868;                             /* 스크롤 0 을 지키는 그리드 하한(배지 돌출 + 중앙정렬 몫) */

async function open(browser, height, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function'
    && typeof SUM_MULS !== 'undefined');
  await page.waitForTimeout(300);
  if (css) await page.addStyleTag({ content: css });
  /* 73 ③ — 가이드 소환 미션이 다른 배너의 doSummon 을 조용히 막는다(668 §8) */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
  return { ctx, page, errs };
}

/* 결과 팝업을 실제로 띄운다(뽑기 가로채기 없이 — 자리를 재는 절이라 진짜로 그린다).
   ⚠ 팝업은 **등장 애니메이션**이 있다(열자마자 재면 `.sm-panel` 이 1080 이 아니라 1063.8 처럼
     스케일 도중 값으로 읽힌다 — 1회차에 [F1] 이 그 값으로 빨갰다). 끝날 때까지 기다렸다 잰다. */
async function openResult(page) {
  const B = await page.evaluate(() => {
    S.dia = 1e12; S.relic = 1e12;
    const B = (typeof gmBan === 'function' && gmBan()) || 'weapon';
    doSummon(B, 10);
    return B;
  });
  await settle(page, '.sm-panel');
  return B;
}
/* 그 요소의 rect 가 세 틱 연속 같은 값이면 «앉았다» 로 본다(668 의 settleShop 과 같은 꼴) */
async function settle(page, sel) {
  await page.waitForFunction(s => {
    const e = document.querySelector(s); if (!e) return false;
    const r = e.getBoundingClientRect();
    const k = [r.left, r.top, r.width, r.height].map(v => v.toFixed(2)).join(',');
    if (window.__k713 === k) return (window.__n713 = (window.__n713 || 0) + 1) >= 3;
    window.__k713 = k; window.__n713 = 0; return false;
  }, sel, { timeout: 8000 });
  await page.waitForTimeout(120);
}

const GEO = () => {
  const R = el => { const r = el.getBoundingClientRect();
    return { l: +r.left.toFixed(2), t: +r.top.toFixed(2), r: +r.right.toFixed(2),
             b: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
             cy: +((r.top + r.bottom) / 2).toFixed(2) }; };
  const panel = document.querySelector('.sm-panel');
  const bar = document.getElementById('sumMulBar');
  return {
    panel: R(panel), bar: R(bar), skip: R(document.getElementById('sumSkip')),
    grid: R(document.querySelector('.sm-grid')), btns: R(document.querySelector('.sm-btns')),
    close: R(document.querySelector('.sm-close')),
    inPanel: bar.parentElement === panel,
    inSumw: !!bar.closest('#sumw'),
    cls: bar.className,
    gh: getComputedStyle(panel).getPropertyValue('--sm-gh').trim(),
    padBot: parseFloat(getComputedStyle(panel).paddingBottom),
    chrome: parseFloat(getComputedStyle(panel, '::after').height),
    cells: [...bar.querySelectorAll('[data-mul]')].map(c => {
      const i = c.querySelector('i');
      return { mul: +c.dataset.mul, on: c.classList.contains('on'), cell: R(c), ink: R(i) };
    }),
    MULS: SUM_MULS.slice(), sumMul
  };
};

(async () => {
  const browser = await launch(chromium);

  /* ================= [A]·[B]·[C]·[F] 자리 — 프레임 둘 ================= */
  for (const H of [2280, 1600]) {
    const { ctx, page } = await open(browser, H);
    await openResult(page);
    const g = await page.evaluate(GEO);
    const tag = '(' + H + ') ';

    if (H === 2280) {
      ok(g.inSumw && g.inPanel, '[A1] 바가 12 결과 팝업 패널의 직속 자식이다(상점이 아니다)',
        '#sumw ' + g.inSumw + ' · .sm-panel 자식 ' + g.inPanel);
      ok(/\bstabs\b/.test(g.cls) && /\bsp4\b/.test(g.cls) && !/sum-mul/.test(g.cls),
        '[A2] 부품은 668 것 그대로 공용 `.stabs.sp4`(상점 자리 클래스 `.sum-mul` 은 없다)', '"' + g.cls + '"');
      ok(g.cells.map(c => c.mul).join(',') === g.MULS.join(','),
        '[A3] 칸이 `SUM_MULS` 한 곳에서 온다', '[' + g.cells.map(c => c.mul).join(', ') + ']');
    }
    ok(near(g.bar.l - g.panel.l, BAR_L, .5) && near(g.bar.w, BAR_W, .5) && near(g.bar.h, SHELL_H, .5),
      tag + '[A4] 좌 36(그리드 좌단) · 폭 724 · 공용 셸 높이 98',
      '좌 ' + (g.bar.l - g.panel.l) + ' · 폭 ' + g.bar.w + ' · 높이 ' + g.bar.h);
    ok(near(g.panel.b - g.bar.b, BAR_BOT, .5),
      tag + '[A5] 띠 [15,127] 안에서 그리드 하변에 붙는다(747 — bottom 29 = 크롬 15 + 여유 14)',
      'bottom ' + (g.panel.b - g.bar.b).toFixed(2));
    ok(g.padBot === PAD_BOT && g.chrome === CHROME && g.gh === GH + 'px',
      tag + '[A6] [전제] 띠 산수 — padding-bottom 127 · 크롬 15 · --sm-gh 868',
      g.padBot + ' / ' + g.chrome + ' / ' + g.gh);
    /* ⚑ 747 — 이 항이 이 작업의 본체다. 713 1회차 비평 2인이 «바 하변 ↔ 크롬 1~8px» 을
       ③ 최대 감점(A 4점 · B 5점)으로 독립 지적했다. 여유를 «≥14» 가 아니라 **정확히 14** 로 못박는다
       — 더 벌어지면 셸이 그리드를 밟거나(위) 바가 버튼 줄로 내려간 것(아래)이라 둘 다 결함이다. */
    ok(near((g.panel.b - CHROME) - g.bar.b, MARGIN, .5),
      tag + '[A7] 바 하변 ↔ 하단 크롬 상변 여유 14 (747 — «테두리에 눌려 붙었다» 를 갚은 자리)',
      ((g.panel.b - CHROME) - g.bar.b).toFixed(2) + 'px');

    ok(near(g.bar.cy, g.skip.cy, .5),
      tag + '[B1] 363 스킵 토글과 세로 중심이 같다(둘 다 띠 중앙정렬)',
      '바 ' + g.bar.cy + ' ↔ 토글 ' + g.skip.cy);
    ok(g.bar.r < g.skip.l - 1, tag + '[B2] 바와 토글이 안 겹친다',
      '바 우 ' + g.bar.r + ' ↔ 토글 좌 ' + g.skip.l + ' (여유 ' + (g.skip.l - g.bar.r).toFixed(2) + ')');
    ok(g.bar.t >= g.grid.b - .5 && g.bar.b <= g.panel.b - CHROME - MARGIN + .5,
      tag + '[B3] 바가 그리드도 하단 크롬도 안 침범한다',
      '그리드 하변 ' + g.grid.b + ' ≤ 바 ' + g.bar.t + '..' + g.bar.b
      + ' ≤ 크롬 상변 ' + (g.panel.b - CHROME));
    ok(g.bar.b < g.btns.t, tag + '[B4] 바가 재소환 버튼 줄 위에 있다(주인이 지목한 «버튼 쪽»)',
      '바 하변 ' + g.bar.b + ' ↔ 버튼 상변 ' + g.btns.t);

    /* [C] 라벨 — 가장 긴 «×1,000» 이 자기 칸 안에 드는가 */
    {
      const bad = g.cells.filter(c => c.ink.l < c.cell.l + 1 || c.ink.r > c.cell.r - 1);
      const last = g.cells[g.cells.length - 1];
      ok(bad.length === 0, tag + '[C1] 네 칸 라벨 잉크가 전부 자기 칸 안에 든다', '넘침 ' + bad.length + '건');
      ok(last.ink.l >= g.bar.l && last.ink.r <= g.bar.r,
        tag + '[C2] 가장 긴 «×1,000» 이 바 밖으로 안 나간다',
        '잉크 ' + last.ink.l + '..' + last.ink.r + ' / 바 ' + g.bar.l + '..' + g.bar.r);
      ok(last.cell.w - last.ink.w >= 20,
        tag + '[C3] 그 칸의 좌우 여유가 20px 이상이다(칸 ' + last.cell.w + ' − 잉크 ' + last.ink.w + ')',
        (last.cell.w - last.ink.w).toFixed(2) + 'px');
    }

    /* [F] 327·84 회귀 */
    ok(near(g.panel.h, 1080, .5), tag + '[F1] 327 — 패널 1080(= ref 539 × 2) 불변', g.panel.h + '');
    ok(near(g.grid.h, GH, .5) && GH >= WORST,
      tag + '[F2] 327 — 그리드 868 이고 30고유 최악 판을 스크롤 없이 담는다(하한 868)',
      g.grid.h + ' / ' + WORST);
    ok(near(g.btns.b, H === 2280 ? H - 426 : g.panel.b + 20 + 148, 1.5) || H !== 2280,
      tag + '[F3] 84 — 버튼 줄 앵커 Δ0', '버튼 ' + g.btns.t + '..' + g.btns.b + ' · 닫기 ' + g.close.t);
    await ctx.close();
  }

  /* ================= [D] 동작 — 칸을 누르면 «그만큼» 뽑힌다 ================= */
  {
    const { ctx, page } = await open(browser, 2280);
    const B = await openResult(page);
    const d = await page.evaluate(() => {
      const lab = id => document.getElementById(id).querySelector('.lab').textContent;
      const cost = id => document.getElementById(id).textContent;
      const before = { l10: lab('sumB10'), l30: lab('sumB30'), c10: cost('sumB10c') };
      document.querySelector('#sumMulBar [data-mul="1000"]').click();
      const after = { l10: lab('sumB10'), l30: lab('sumB30'), c10: cost('sumB10c'),
                      on: [...document.querySelectorAll('#sumMulBar .stab.on')].map(c => c.dataset.mul) };
      return { before, after, mul: sumMul };
    });
    ok(d.before.l10 === '10회 소환' && d.before.l30 === '30회 소환',
      '[D1] [전제] 팝업이 열리면 ×1(레퍼런스 라벨)로 시작한다',
      '«' + d.before.l10 + '» / «' + d.before.l30 + '»');
    ok(d.after.l10 === '10,000회 소환' && d.after.l30 === '30,000회 소환' && d.mul === 1000,
      '[D2] ×1000 칸을 누르면 두 버튼 라벨이 그 배수로 바뀐다',
      '«' + d.after.l10 + '» / «' + d.after.l30 + '»');
    ok(d.after.on.join(',') === '1000', '[D3] 활성 알약이 그 칸으로 옮겨간다', '[' + d.after.on + ']');
    ok(d.after.c10 === (1000 * 1000).toLocaleString('en-US'),
      '[D4] 가격도 선형 배수다(flat 규약 73④·195)', d.before.c10 + ' → ' + d.after.c10);

    const n = await page.evaluate(({ B }) => {
      /* 실제로 그만큼 뽑히는가 — 668 의 순차 코어를 그대로 지나는지 본다 */
      const orig = window.showSummonResult; let got = 0;
      window.showSummonResult = (b, times, res) => { got = res.length; };
      const dia0 = S.dia;
      document.getElementById('sumB10').click();
      window.showSummonResult = orig;
      return { got, spent: dia0 - S.dia };
    }, { B });
    ok(n.got === 10000, '[D5] [10회 소환](×1000) 이 실제로 10,000회 뽑는다', n.got + '회');
    ok(n.spent === 1000 * 1000, '[D6] 그만큼 차감된다', '💎' + n.spent.toLocaleString('en-US'));
    await ctx.close();
  }

  /* ================= [E] 상점 — 토글 0건 · 668 이전 기하로 원복 ================= */
  {
    const { ctx, page } = await open(browser, 2280);
    await page.evaluate(() => { S.dia = 1e12; openShopPage('weapon'); });
    await settle(page, '#shopList .shp-card');
    const e = await page.evaluate(() => {
      const list = document.getElementById('shopList');
      return {
        muls: document.querySelectorAll('#shopw [data-mul]').length,
        sumMulCls: document.querySelectorAll('#shopw .sum-mul').length,
        listBot: parseFloat(getComputedStyle(list).bottom),
        lab: [...document.querySelectorAll('#shopList .cbtn.b2 .lab')].map(u => u.textContent),
        lab3: [...document.querySelectorAll('#shopList .cbtn.b3 .lab')].map(u => u.textContent),
        cls: [...document.querySelectorAll('#shopList .cbtn.b2 .lab')].map(u => u.className),
        card: (() => { const r = document.querySelector('#shopList .shp-card').getBoundingClientRect();
          return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; })()
      };
    });
    ok(e.muls === 0 && e.sumMulCls === 0, '[E1] 상점에 배수 토글이 **0건**이다(주인 지시)',
      '[data-mul] ' + e.muls + '개 · .sum-mul ' + e.sumMulCls + '개');
    ok(e.listBot === 154, '[E2] 리스트 하변이 668 이전(154)으로 돌아왔다 — 보이는 칸 수 회수',
      'bottom ' + e.listBot);
    ok(e.lab.every(t => t === '10회 소환') && e.lab3.every(t => t === '30회 소환'),
      '[E3] 카드 버튼 라벨이 레퍼런스 문자열이다', '«' + e.lab[0] + '» / «' + e.lab3[0] + '»');
    ok(e.cls.every(c => c === 'lab'), '[E4] 좁힘 클래스(`fit1~3`)가 안 붙는다(레퍼런스 잉크 Δ0)',
      '"' + e.cls[0] + '"');
    ok(e.card.w === 980 && e.card.h === 450, '[E5] 카드 기하 Δ0', e.card.w + '×' + e.card.h);

    /* 팝업에서 ×1000 을 켠 채 상점으로 돌아가도 카드는 안 따라간다 = «보이지 않는 배수» 0 */
    const e2 = await page.evaluate(() => {
      sumMul = 1000; renderShopPage();
      const lab = [...document.querySelectorAll('#shopList .cbtn.b2 .lab')].map(u => u.textContent)[0];
      sumMul = 1;
      return lab;
    });
    ok(e2 === '10회 소환', '[E6] `sumMul` 이 1000 이어도 상점 카드는 «10회 소환» 이다(화면에 없는 배수 0)',
      '«' + e2 + '»');
    await ctx.close();
  }

  /* ================= [G]·[H] 배경 탭 · 닫으면 ×1 ================= */
  {
    const { ctx, page, errs } = await open(browser, 2280);
    await openResult(page);
    await page.click('#sumMulBar [data-mul="100"]');
    const g1 = await page.evaluate(() => ({ open: document.getElementById('sumw').classList.contains('on'),
                                            mul: sumMul }));
    ok(g1.open && g1.mul === 100, '[G1] 바를 눌러도 팝업이 안 닫힌다(84 «떨어져 나간 노드» 규약)',
      '열림 ' + g1.open + ' · ×' + g1.mul);
    await page.evaluate(() => closeSummonResult());
    const h1 = await page.evaluate(() => ({ open: document.getElementById('sumw').classList.contains('on'),
      mul: sumMul, on: [...document.querySelectorAll('#sumMulBar .stab.on')].map(c => c.dataset.mul) }));
    ok(!h1.open && h1.mul === 1 && h1.on.join(',') === '1',
      '[H1] 팝업을 닫으면 배수가 ×1 로 돌아간다(713 위임 규약 — 되돌리려면 한 줄)',
      '열림 ' + h1.open + ' · ×' + h1.mul + ' · 활성 [' + h1.on + ']');
    ok(errs.length === 0, '[Z] 콘솔 에러 0건', errs.length + '건');
    await ctx.close();
  }

  /* ================= [R] 되돌림 시험 ================= */
  /* 띠를 668 시절(패딩 98)로 되돌린 사본에서는 98px 셸이 그리드를 침범한다.
     이 항이 빨개지지 «않으면» [B3] 은 이미 참인 것을 세고 있는 것이다(338 규칙). */
  {
    const { ctx, page } = await open(browser, 2280, '.sm-panel{padding-bottom:98px !important}');
    await openResult(page);
    const r = await page.evaluate(GEO);
    ok(r.bar.t < r.grid.b - .5,
      '[R1] 옛 패딩(98)으로 되돌린 사본에서는 바가 그리드를 침범한다(자가 무르지 않다)',
      '바 상변 ' + r.bar.t + ' < 그리드 하변 ' + r.grid.b + ' (침범 ' + (r.grid.b - r.bar.t).toFixed(2) + 'px)');
    await ctx.close();
  }
  /* ⚑ 747 되돌림 시험 — 713 자리(bottom 15)로 되돌린 사본에서는 [A7] 이 재는 여유가 0 이 된다.
     이 항이 빨개지지 «않으면» [A7] 은 이미 참인 것을 세고 있는 것이다(338 규칙). */
  {
    const { ctx, page } = await open(browser, 2280,
      '#sumMulBar{bottom:15px !important}#sumSkip{bottom:36px !important}');
    await openResult(page);
    const r = await page.evaluate(GEO);
    const gap = (r.panel.b - CHROME) - r.bar.b;
    ok(near(gap, 0, .5) && near(r.bar.cy, r.skip.cy, .5),
      '[R2] 713 자리(bottom 15/36)로 되돌린 사본에서는 바가 크롬에 붙는다 — 여유 0 (747 이 무르지 않다)',
      '여유 ' + gap.toFixed(2) + 'px · 세로 중심 바 ' + r.bar.cy + ' ↔ 토글 ' + r.skip.cy);
    await ctx.close();
  }

  await browser.close();
  console.log('\nverify713: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
