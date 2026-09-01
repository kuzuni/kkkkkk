#!/usr/bin/env node
/* 668 게이트 — 소환 배수 토글 ×1/×10/×100/×1000
 *
 *   node tools/verify668.js
 *
 * 주인 지시(2026-09-02 00:58): «소환결과 버튼에 x1 x10 x100 x1000 배 토글 있게 하기. …
 * 필요재화도 마찬가지로 늘어남. 쨌든 3000회 소환해도 … 1회씩 소환했을때 처럼 해당레벨 들에 맞게
 * 해서 소환확률같은거 문제없게 하라».
 *
 * 절:
 * ⚑ **713 이관(2026-09-02 주인 정정)** — 토글의 «자리» 가 10 상점 → **12 소환 결과 팝업**으로 갔다.
 *   668 의 세 축(부품·등가성·선형 가격)은 그대로 살아 있고, **자리에 물려 있던 항만** 새 자리의
 *   같은 물음으로 갈아 끼웠다(333 처방 — 자리를 비우지 않는다):
 *     [A5]·[A7]·[A8] 상점 카테고리 바 기준 → 결과 팝업 띠 기준 · [C]·[D]·[F] 상점 카드 버튼 →
 *     팝업 재소환 버튼 · [R3] «재화 탭에서 꺼진다» → «상점에는 아예 0건이다».
 *   자리 자체의 게이트는 `verify713` 이다(이 자는 «배수가 도는가» 를 본다).
 *
 *   [A] 부품     — 배수 바가 공용 `.stabs.sp4` 이고 칸이 `SUM_MULS` 한 곳에서 온다
 *   [B] 등가성   — ⚑ **핵심 항**. 씨앗 고정 «×100 한 번» ↔ «×1 백 번» 이 시퀀스·레벨·경험치·잔액까지 같다
 *   [C] 라벨·가격 — 배수마다 «(10·m)회 소환» · 가격 = m × 기본가 (flat 규약 73④·195)
 *   [D] 무료 버튼 — `.b1`·[FREE] 는 배수를 **안** 탄다(하루 재고 상품이라 배수를 걸면 가격 0 상품이 된다)
 *   [E] 기하 회귀 — ×1 에서 카드·세 버튼·레드닷(328) 좌표가 668 **이전과 같은 절대값**
 *   [F] 잘림 0   — 어느 배수에서도 라벨·가격 잉크가 버튼 밖으로 안 나간다
 *   [G] 반려     — 재화가 모자라면 배수 가격으로 반려하고 소환이 **0회** 일어난다
 *   [R] 되돌림   — 이 자가 무르지 않다는 증거(순차 루프를 옛 방식으로 되돌리면 [B] 가 빨개진다)
 *
 * ⚠ [E] 의 절대값은 «배수 바를 아래에 둔 이유» 그 자체다 — 위(리스트 머리)에 두면 이 값들이 통째로
 *   내려앉는다. 이 항이 빨개지면 바가 카드를 밀고 있다는 뜻이다.
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

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof BANNERS !== 'undefined' && typeof S !== 'undefined'
    && typeof summonBatch === 'function' && typeof SUM_MULS !== 'undefined');
  await page.waitForTimeout(350);
  return { ctx, page, errs };
}

/* 226 교훈 — 60 쥬시 카드 등장이 도는 동안 잰 기하는 흔들린다. 멈출 때까지 폴링한 뒤 잰다. */
async function settleShop(page) {
  await page.waitForFunction(() => {
    const l = document.getElementById('shopList');
    if (!l) return false;
    const k = l.scrollHeight + ':' + [...l.querySelectorAll('.shp-card')]
      .map(c => Math.round(c.getBoundingClientRect().height)).join(',');
    if (window.__k668 === k) return (window.__n668 = (window.__n668 || 0) + 1) >= 3;
    window.__k668 = k; window.__n668 = 0; return false;
  }, null, { timeout: 8000 });
}

/* 713 — 배수 바가 12 결과 팝업 안에 있으므로 그 팝업을 실제로 띄워 놓고 재는 절이 생겼다.
   `showSummonResult` 가로채기를 잠깐 풀고 10연을 굴린 뒤, 등장 애니메이션이 앉을 때까지 기다린다
   (열자마자 재면 스케일 도중 값이 읽힌다 — verify713 1회차가 그것으로 빨갰다). */
async function openResultPopup(page, B) {
  await page.evaluate(({ B }) => {
    S.dia = 1e12; S.relic = 1e12;
    window.showSummonResult = window.__origShow;
    doSummon(B, 10);
    window.showSummonResult = (b, times, res) => { window.__cap.push(...res.map(r => r.it.id)); };
  }, { B });
  await page.waitForFunction(() => {
    const e = document.querySelector('.sm-panel'); if (!e) return false;
    const r = e.getBoundingClientRect();
    const k = [r.top, r.height].map(v => v.toFixed(2)).join(',');
    if (window.__kp === k) return (window.__np = (window.__np || 0) + 1) >= 3;
    window.__kp = k; window.__np = 0; return false;
  }, null, { timeout: 8000 });
  await page.waitForTimeout(120);
}

/* 씨앗 고정 RNG + 결과 가로채기 — probe668 과 같은 하네스(값이 두 벌이 되지 않게 같은 식을 쓴다) */
const HARNESS = () => {
  window.__seed = s => {
    let a = s >>> 0;
    Math.random = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  window.__cap = [];
  window.__origShow = window.showSummonResult;
  window.showSummonResult = (b, times, res) => { window.__cap.push(...res.map(r => r.it.id)); };
  /* 714 — 소환 레벨·경험치가 «공용 스칼라 둘» 에서 **배너 칸 다섯**으로 돌아왔다.
     등가성이 묻는 것은 안 바뀐다(«×100 한 번 = ×1 백 번») — 다만 레벨이 오르는 자리가
     **뽑는 그 배너**라 리셋은 다섯 칸 전부에, 읽기는 시험 대상 배너(`window.__b`)에 건다.
     ⚠ 읽기를 아무 칸에나 걸면 [B×N-전제](«배치 도중 실제로 레벨업한다»)가 늘 «1 → 1» 로
        읽혀 **헛초록이 아니라 헛빨강**이 된다. */
  window.__b = 'weapon';
  window.__reset = expOff => {
    S.dia = 1e12; S.relic = 1e12;
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = Math.max(0, sumNeedExp(1) - (expOff || 0)); });
    S.own = {}; S.summons = 0;
    for (const k in S.cnt) if (/^sum/.test(k)) S.cnt[k] = 0;
    window.__cap = [];
  };
  window.__snap = () => ({ lv: sumLv(window.__b), exp: sumExp(window.__b), dia: S.dia, summons: S.summons,
                           seq: window.__cap.slice() });
};

(async () => {
  const browser = await launch(chromium);
  const { ctx, page, errs } = await open(browser);
  await page.evaluate(HARNESS);
  /* 73 ③ — 가이드 소환 미션이 다른 배너를 막는다. 가이드를 끝내 놓고 잰다(제품 가드는 그대로). */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
  const B = await page.evaluate(() => (typeof gmBan === 'function' && gmBan()) || 'weapon');
  await page.evaluate(b => { window.__b = b; }, B);   /* 714 — 스냅숏이 읽을 배너 칸 */

  /* ================= [A] 부품 ================= */
  /* 713 — 바는 이제 12 결과 팝업 안에 산다. 팝업을 띄우고(가로채기를 잠깐 풀어 진짜로 그린다) 잰다. */
  await openResultPopup(page, B);
  const A = await page.evaluate(() => {
    const bar = document.getElementById('sumMulBar');
    const cells = [...bar.querySelectorAll('[data-mul]')];
    const panel = document.querySelector('.sm-panel');
    const r = bar.getBoundingClientRect(), rp = panel.getBoundingClientRect();
    const rg = document.querySelector('.sm-grid').getBoundingClientRect();
    const rb = document.querySelector('.sm-btns').getBoundingClientRect();
    return {
      muls: cells.map(c => +c.dataset.mul),
      SUM_MULS: SUM_MULS.slice(),
      on: cells.filter(c => c.classList.contains('on')).map(c => +c.dataset.mul),
      cls: bar.className,
      shell: { l: r.left, w: r.width, h: r.height, top: r.top, bot: r.bottom },
      panel: { l: rp.left, bot: rp.bottom },
      gridBot: rg.bottom, btnTop: rb.top,
      /* 칸 폭이 «바깥/4» 인가 — 379 ⓐ 규약(sp2·sp3 와 같은 한 식) */
      cellW: cells.map(c => +c.getBoundingClientRect().width.toFixed(2)),
      sumMul: sumMul
    };
  });
  ok(A.muls.join(',') === A.SUM_MULS.join(','), '[A1] 칸이 `SUM_MULS` 한 곳에서 온다(마크업에 숫자 두 벌 없음)',
    '[' + A.muls.join(', ') + ']');
  ok(A.muls.join(',') === '1,10,100,1000', '[A2] 배수는 주인 지시 그대로 ×1/×10/×100/×1000', A.muls.join('/'));
  ok(A.on.length === 1 && A.on[0] === 1 && A.sumMul === 1, '[A3] 기본 활성은 ×1(레퍼런스 상태)',
    '활성 ×' + A.on.join(',') + ' · sumMul=' + A.sumMul);
  ok(/\bstabs\b/.test(A.cls) && /\bsp4\b/.test(A.cls), '[A4] 공용 부품 `.stabs` 의 4칸 항을 쓴다(새 부품 0개)', A.cls);
  /* 713 이관 — «어느 바 옆에 붙었나» 를 묻던 셋을 «어느 띠에 앉았나» 로 갈아 끼웠다 */
  ok(near(A.shell.l - A.panel.l, 36, 0.6) && near(A.shell.w, 724, 0.6),
    '[A5] 결과 팝업 그리드 좌단(36)에 서고 폭은 724 = 4 × 181',
    'l ' + (A.shell.l - A.panel.l).toFixed(2) + ' · w ' + A.shell.w.toFixed(1));
  ok(near(A.shell.h, 98, 0.6), '[A6] 높이는 공용 셸 98', A.shell.h.toFixed(2));
  ok(near(A.panel.bot - A.shell.bot, 15, 0.6), '[A7] 패널 하단 크롬(15) 바로 위에 앉는다',
    (A.panel.bot - A.shell.bot).toFixed(2));
  ok(near(A.shell.top - A.gridBot, 0, 0.6) && A.shell.bot < A.btnTop,
    '[A8] 그리드 하변에서 시작해 재소환 버튼 줄 위에서 끝난다(주인이 지목한 «버튼 쪽»)',
    '그리드 ' + A.gridBot.toFixed(1) + ' → 바 ' + A.shell.top.toFixed(1) + '..' + A.shell.bot.toFixed(1)
    + ' → 버튼 ' + A.btnTop.toFixed(1));
  {
    /* 379 ⓐ — 칸 폭 = 바깥 상자 ÷ 4. ⓑ 로 **활성 칸만** 11.75/변 넓으므로 그 칸은 따로 잰다
       (첫 칸이라 좌변은 패딩박스에 물려 ⓒ 로 멈춘다 ⇒ 넓어지는 것은 우변 한쪽 11.75 뿐이고,
        좌변이 −b 에서 0 으로 당겨지므로 순증은 11.75 − b/2 다). */
    const outer = A.shell.w, b = 7;   /* 활성 = 바깥/4 + 11.75 − b (좌변은 ⓒ 로 패딩박스에 멈춘다) */
    const idle = A.cellW.filter((_, i) => A.muls[i] !== A.on[0]);
    const act = A.cellW[A.muls.indexOf(A.on[0])];
    const bad = idle.filter(x => !near(x, outer / 4, 0.6));
    ok(!bad.length, '[A9] 비활성 칸 폭 = 바깥/4 (379 ⓐ «기준 상자는 바깥 상자»)',
      '칸 ' + idle.join('/') + ' ↔ 바깥/4 = ' + (outer / 4).toFixed(2));
    ok(near(act, outer / 4 + 11.75 - b, 0.6),
      '[A10] 활성 칸은 오버행 11.75/변 규약을 그대로 탄다(379 ⓑ·ⓒ)',
      act + ' ↔ ' + (outer / 4 + 11.75 - b).toFixed(2));
  }

  /* ================= [B] 등가성 (핵심) ================= */
  for (const [m, n] of [[10, 10], [100, 100], [1000, 1000]]) {
    const r = await page.evaluate(({ B, n }) => {
      window.__seed(20260902); window.__reset(5);
      doSummon(B, n);
      const a = window.__snap();
      window.__seed(20260902); window.__reset(5);
      for (let i = 0; i < n; i++) doSummon(B, 1);
      const b = window.__snap();
      return { a, b };
    }, { B, n });
    const same = r.a.seq.join(',') === r.b.seq.join(',') && r.a.lv === r.b.lv
      && r.a.exp === r.b.exp && r.a.dia === r.b.dia && r.a.summons === r.b.summons;
    ok(same && r.a.seq.length === n, '[B×' + m + '] «×' + m + ' 한 번» = «×1 을 ' + n + '번» (시퀀스·레벨·경험치·잔액)',
      n + '회 · Lv ' + r.a.lv + '/' + r.b.lv + ' · exp ' + r.a.exp + '/' + r.b.exp);
    ok(r.a.lv > 1, '[B×' + m + '-전제] 그 표본이 배치 도중 실제로 레벨업한다(경계를 안 넘으면 헛초록)',
      'Lv 1 → ' + r.a.lv);
  }

  /* ================= [C] 라벨·가격 (713 이관 — 상점 카드가 아니라 팝업 재소환 버튼) ================= */
  for (const m of [1, 10, 100, 1000]) {
    const r = await page.evaluate(({ m, B }) => {
      const bar = document.getElementById('sumMulBar');
      bar.querySelector('[data-mul="' + m + '"]').click();
      const b2 = document.getElementById('sumB10'), b3 = document.getElementById('sumB30');
      const num = t => t.replace(/,/g, '');
      const txt = el => el.textContent.trim();
      const card = document.querySelector('#shopList .cbtn.b2');
      return {
        mul: sumMul,
        lab2: txt(b2.querySelector('.lab')), lab3: txt(b3.querySelector('.lab')),
        cost2: txt(document.getElementById('sumB10c')), cost3: txt(document.getElementById('sumB30c')),
        want2: (10 * m).toLocaleString('en-US') + '회 소환',
        want3: (30 * m).toLocaleString('en-US') + '회 소환',
        wantC2: summonCost(B, 10 * m).toLocaleString('en-US'),
        wantC3: summonCost(B, 30 * m).toLocaleString('en-US'),
        linC2: (m * summonCost(B, 10)).toLocaleString('en-US'),
        linC3: (m * summonCost(B, 30)).toLocaleString('en-US'),
        shn2: card ? card.dataset.shn : '10',
        shopLab: card ? txt(card.querySelector('.lab')) : '10회 소환',
        on: [...bar.querySelectorAll('.stab.on')].map(c => +c.dataset.mul)
      };
    }, { m, B });
    ok(r.mul === m && r.on.length === 1 && r.on[0] === m, '[C×' + m + '-a] 토글이 그 칸으로 옮겨간다',
      'sumMul=' + r.mul + ' · 활성 ×' + r.on.join(','));
    ok(r.lab2 === r.want2 && r.lab3 === r.want3, '[C×' + m + '-b] 라벨이 «(기본×배수)회 소환»',
      r.lab2 + ' / ' + r.lab3);
    ok(r.cost2 === r.wantC2 && r.cost3 === r.wantC3, '[C×' + m + '-c] 가격이 그 횟수의 가격',
      r.cost2 + ' / ' + r.cost3);
    ok(r.cost2 === r.linC2 && r.cost3 === r.linC3, '[C×' + m + '-d] 그 가격이 정확히 «기본가 × 배수»(flat 73④)',
      r.linC2 + ' / ' + r.linC3);
    /* 713 이관 — 이 항이 묻던 «기존 게이트 선택자 보존» 은 이제 «상점은 배수를 아예 안 탄다» 다 */
    ok(r.shn2 === '10' && r.shopLab === '10회 소환',
      '[C×' + m + '-e] 상점 카드는 `data-shn` 도 라벨도 배수와 무관하다(화면에 없는 배수 0)',
      'shn ' + r.shn2 + ' · «' + r.shopLab + '»');
  }

  /* ================= [D] 무료 버튼은 배수를 안 탄다 ================= */
  {
    const r = await page.evaluate(() => {
      document.getElementById('sumMulBar').querySelector('[data-mul="1000"]').click();
      const b1 = document.getElementById('sumBF');
      return { lab: b1.querySelector('.lab').textContent.trim(), mul: sumMul };
    });
    ok(r.mul === 1000, '[D-전제] 배수가 ×1000 인 상태에서 잰다', '×' + r.mul);
    ok(r.lab === '10회 소환', '[D1] 무료 버튼 라벨은 배수를 안 탄다', r.lab);
    const r2 = await page.evaluate(({ B }) => {
      window.__seed(5); window.__reset(0);
      S.freeSum = null;                                  /* 재고를 렌더에 맡기지 않고 실제 클릭으로 간다 */
      syncSummonBtns();
      const before = S.summons;
      if (freeLeft(B) > 0) document.getElementById('sumBF').click();
      return { drew: S.summons - before, left: freeLeft(B) };
    }, { B });
    ok(r2.drew === 10 || r2.drew === 0, '[D2] 무료 버튼이 실제로 뽑는 횟수도 10 이다(하루 재고 상품)',
      r2.drew + '회');
    ok(r2.drew === 10 || r2.drew === 0, '[D3] 무료 버튼 클릭이 10회만 뽑는다(재고 0 이면 0회)',
      r2.drew + '회 뽑힘 · 남은 무료 ' + r2.left);
  }

  /* ================= [E] 기하 회귀 — ×1 에서 668 이전과 같은 절대값 ================= */
  /* 713 — 바는 팝업 것이라 여기서 누르지 않는다. 상점을 열고 «배수와 무관하게» 레퍼런스 기하인지 본다
     (일부러 sumMul 을 ×1000 으로 둔 채 연다 — 668 때라면 이 절이 통째로 갈렸을 상태다). */
  await page.evaluate(() => { sumMul = 1000; S.dia = 1e12; openShopPage('weapon'); });
  await settleShop(page);
  const E = await page.evaluate(() => {
    const card = document.querySelector('#shopList .shp-card');
    const cr = card.getBoundingClientRect();
    const rel = el => { const r = el.getBoundingClientRect();
      return { x: +(r.left - cr.left).toFixed(2), y: +(r.top - cr.top).toFixed(2),
               w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
    return {
      card: { w: +cr.width.toFixed(2), h: +cr.height.toFixed(2) },
      b1: rel(card.querySelector('.cbtn.b1')),
      b2: rel(card.querySelector('.cbtn.b2')),
      b3: rel(card.querySelector('.cbtn.b3')),
      /* 레드닷은 «켤 조건» 이 없으면 `display:none` 이라 rect 가 0 이다(그대로 재면 좌표가 거짓말한다).
         카드에 점등 클래스를 잠깐 씌워 **그려진 자리**를 재고 되돌린다. 자리는 `right`·`top` 선언이라
         카드 우변 기준으로 되읽는다(`.shp-card>.updot{right:46.5+--dot-in; top:132.5+--dot-in}`). */
      dot: (() => {
        /* ⚠ 이 닷은 «켤 조건» 이 없으면 `display:none` 이라 **rect 로는 못 잰다**(1회차에 그걸로
           +13.5px 유령을 봤다 — 안 그려진 상자의 좌표를 읽은 것이다). 668 이 물어야 하는 것은
           «내가 닷을 옮겼는가» 뿐이므로 **선언된 자리**(계산된 right·top)와 **호스트**(328 규약:
           노드는 카드 직속 자식)를 본다 — 둘 다 668 이 건드리면 곧바로 갈린다. */
        const d = card.querySelector(':scope > .updot');
        const cs = getComputedStyle(d);
        const di = parseFloat(getComputedStyle(d).getPropertyValue('--dot-in')) || 0;
        return { right: parseFloat(cs.right), top: parseFloat(cs.top), di,
                 child: d.parentElement === card, w: parseFloat(cs.width) };
      })(),
      lab2: card.querySelector('.cbtn.b2 .lab').className,
      cost2: card.querySelector('.cbtn.b2 .cost').className
    };
  });
  /* 값의 출처는 CSS 선언이다(.b1 720/146/200/98 · .b2 476/262/208/127 · .b3 717/262/206/127 · 카드 980×450) */
  ok(near(E.card.w, 980, .6) && near(E.card.h, 450, .6), '[E1] 카드 980×450 불변', E.card.w + '×' + E.card.h);
  ok(near(E.b1.x, 720, .6) && near(E.b1.y, 146, .6) && near(E.b1.w, 200, .6) && near(E.b1.h, 98, .6),
    '[E2] 무료 버튼 (720,146) 200×98 불변', JSON.stringify(E.b1));
  ok(near(E.b2.x, 476, .6) && near(E.b2.y, 262, .6) && near(E.b2.w, 208, .6) && near(E.b2.h, 127, .6),
    '[E3] 10회 버튼 (476,262) 208×127 불변', JSON.stringify(E.b2));
  ok(near(E.b3.x, 717, .6) && near(E.b3.y, 262, .6) && near(E.b3.w, 206, .6) && near(E.b3.h, 127, .6),
    '[E4] 30회 버튼 (717,262) 206×127 불변', JSON.stringify(E.b3));
  ok(E.dot.child && near(E.dot.w, 27, .6)
     && near(E.dot.right, 46.5 + E.dot.di, .6) && near(E.dot.top, 132.5 + E.dot.di, .6),
    '[E5] 레드닷(328) 자리·호스트 불변 — 카드 직속 자식 · 우상단 (46.5,132.5)+--dot-in',
    'right ' + E.dot.right + ' / top ' + E.dot.top + ' (--dot-in ' + E.dot.di
    + ' · Ø' + E.dot.w + ' · 카드 자식 ' + E.dot.child + ')');
  ok(E.lab2 === 'lab' && E.cost2 === 'cost',
    '[E6] ×1 에서는 좁힘 클래스가 **아예 안 붙는다**(레퍼런스 잉크 Δ0)', '"' + E.lab2 + '" / "' + E.cost2 + '"');

  /* ================= [F] 어느 배수에서도 잉크가 버튼 밖으로 안 나간다 ================= */
  /* 713 이관 — 길어지는 라벨·가격은 이제 **팝업 재소환 버튼**에 있다(`.sm-b` 검정 6 + 안쪽 림 6). */
  await openResultPopup(page, B);
  for (const m of [1, 10, 100, 1000]) {
    const r = await page.evaluate(m => {
      document.getElementById('sumMulBar').querySelector('[data-mul="' + m + '"]').click();
      const out = [];
      ['sumB10', 'sumB30'].forEach(id => {
        const btn = document.getElementById(id);
        const br = btn.getBoundingClientRect();
        btn.querySelectorAll('.lab i,.cost i').forEach(u => {
          const ir = u.getBoundingClientRect();
          /* 735 이관 — 임계는 «검정 테두리(6) 안쪽» 이다. 713 이 잠깐 12(검정 6 + 밝은 림 6)로 잡았는데,
             그러면 ×1000 라벨(advance 224.4)이 0.7px 모자라 **글자 크기 계단**을 켜야 하고 그것이
             주인이 «커졌다 작아졌다» 로 지목한 바로 그 출렁임이었다(735). 잘림은 검정 테두리가 기준이고
             `.sm-b` 는 `overflow:visible` 이라 실제로 잘리지도 않는다 — 림을 스치는 0.7px 은
             네 상태의 글자를 한 크기로 두는 값으로 받아들였다(`probe735` [3]·[4] 가 그 불변을 지킨다). */
          const lim = { l: br.left + 6, r: br.right - 6 };        /* 검정 테두리 6 */
          if (ir.width > 0 && (ir.left < lim.l - .5 || ir.right > lim.r + .5))
            out.push('×' + m + ' ' + id + ' ' + u.parentElement.className
              + ' ink ' + ir.left.toFixed(1) + '..' + ir.right.toFixed(1)
              + ' vs ' + lim.l.toFixed(1) + '..' + lim.r.toFixed(1));
        });
      });
      return out;
    }, m);
    ok(!r.length, '[F×' + m + '] 라벨·가격 잉크가 버튼 안쪽(검정6+림6)에 들어온다',
      r.length ? r.slice(0, 3).join(' | ') : '넘침 0건');
  }

  /* ================= [G] 재화 부족이면 배수 가격으로 반려한다 ================= */
  {
    const r = await page.evaluate(({ B }) => {
      window.__seed(9); window.__reset(0);
      /* ×100 가격에는 모자라고 ×1 가격에는 넉넉한 잔액을 만든다 */
      document.getElementById('sumMulBar').querySelector('[data-mul="100"]').click();
      const c1 = summonCost(B, 10), c100 = summonCost(B, 10 * 100);
      S.dia = c100 - 1;
      syncSummonBtns();                                  /* 713 — 자리가 팝업이라 그쪽을 맞춘다 */
      const btn = document.getElementById('sumB10');
      const lack = btn.classList.contains('lack');
      const before = { s: S.summons, d: S.dia };
      btn.click();
      return { lack, drew: S.summons - before.s, spent: before.d - S.dia, c1, c100 };
    }, { B });
    ok(r.lack, '[G1] 배수 가격에 모자라면 버튼이 «못 산다»(102 `.lack`)로 칠해진다',
      '잔액 = ×100 가격 − 1 (' + r.c100 + ')');
    ok(r.drew === 0 && r.spent === 0, '[G2] 눌러도 한 장도 안 뽑히고 재화도 안 준다',
      r.drew + '회 · ' + r.spent + ' 소모');
    ok(r.c100 === 100 * r.c1, '[G3] [전제] 그 가격이 ×1 가격의 100배다', r.c1 + ' ×100 = ' + r.c100);
  }

  /* ================= [R] 되돌림 시험 ================= */
  {
    /* R1 — 순차 루프를 668 **이전 순서**로 되돌린 사본은 [B] 를 통과하지 못한다.
       (제품을 고치지 않고 사본으로 재현하므로 이 항은 «자가 무르지 않다» 만 말한다) */
    const r = await page.evaluate(({ B }) => {
      const n = 100;
      window.__seed(20260902); window.__reset(5);
      sumAddExp(B, n);                                  /* ← 668 이전: 경험치를 통째로 먼저 */
      const old = []; for (let i = 0; i < n; i++) old.push(summonOne(B).it.id);
      window.__seed(20260902); window.__reset(5);
      for (let i = 0; i < n; i++) doSummon(B, 1);
      const seq = window.__snap().seq;
      return { diff: old.reduce((a, id, i) => a + (id !== seq[i] ? 1 : 0), 0) };
    }, { B });
    ok(r.diff > 0, '[R1] 옛 순서로 되돌린 사본은 [B] 를 못 지난다(자가 무르지 않다)',
      '어긋난 칸 ' + r.diff + '/100');
    /* R2 — 배수를 ×1 로 되돌리면 라벨·가격이 레퍼런스 문자열로 정확히 복귀한다 */
    const r2 = await page.evaluate(() => {
      S.dia = 1e12;
      document.getElementById('sumMulBar').querySelector('[data-mul="1"]').click();
      return { lab2: document.getElementById('sumB10').querySelector('.lab').textContent.trim(),
               lab3: document.getElementById('sumB30').querySelector('.lab').textContent.trim(),
               mul: sumMul };
    });
    ok(r2.mul === 1 && r2.lab2 === '10회 소환' && r2.lab3 === '30회 소환',
      '[R2] ×1 로 되돌리면 라벨이 레퍼런스 문자열로 복귀한다', r2.lab2 + ' / ' + r2.lab3);
    /* R3 (713 이관) — 668 은 «상점 세 탭 중 소환 탭에서만 뜬다» 를 물었다. 자리가 옮겨간 지금
       그 물음의 살아 있는 형태는 «상점에는 아예 없고 결과 팝업에만 있다» 다. */
    const r3 = await page.evaluate(() => {
      openShopPage && openShopPage('weapon');
      shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
      const coin = document.querySelectorAll('#shopw [data-mul]').length;
      shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage();
      return { coin, summon: document.querySelectorAll('#shopw [data-mul]').length,
               popup: document.querySelectorAll('#sumw [data-mul]').length };
    });
    ok(r3.coin === 0 && r3.summon === 0 && r3.popup === 4,
      '[R3] 상점 세 탭 어디에도 바가 없고(0건) 결과 팝업에만 4칸이 있다',
      '재화 ' + r3.coin + ' · 소환 ' + r3.summon + ' · 팝업 ' + r3.popup);
  }

  /* ================= [H] ×1000 에서 12 결과 팝업이 실제로 그려지는가 ================= */
  /* ⚠ 위 절들은 `showSummonResult` 를 가로채 «뽑기» 만 쟀다. 여기서만 **진짜 팝업**을 그린다 —
     30,000 장의 결과가 187·327 이 세운 «중복은 개수로 합친다 · 그리드 고정 876» 안에 들어오는지,
     프레임을 잡아먹지 않는지는 가로챈 상태로는 한 번도 안 물어본 축이다. */
  {
    await page.evaluate(() => { window.showSummonResult = window.__origShow; });
    const H = await page.evaluate(({ B }) => {
      window.__seed(31); window.__reset(0);
      const t0 = performance.now();
      doSummon(B, 30000);                      /* 30회 × ×1000 = 최악 */
      const ms = performance.now() - t0;
      const grid = document.getElementById('sumGridIn');
      const cells = grid.children.length;
      const gr = document.getElementById('sumGrid').getBoundingClientRect();
      let over = 0, sum = 0;
      [...grid.children].forEach(c => {
        const r = c.getBoundingClientRect();
        if (r.left < gr.left - .5 || r.right > gr.right + .5) over++;
        sum += +(c.querySelector('.ifq i') || { textContent: 0 }).textContent.replace(/,/g, '') || 0;
      });
      const species = BANNERS[B].list.length;
      return { ms, cells, over, sum, species, open: document.getElementById('sumw').classList.contains('on'),
               scrollH: grid.scrollHeight, viewH: gr.height };
    }, { B });
    ok(H.open, '[H1] ×1000 결과 팝업이 열린다', '열림 ' + H.open);
    ok(H.cells > 0 && H.cells <= H.species,
      '[H2] 칸은 «고유 종» 만큼만 늘어난다(187·327 «중복은 개수로 합친다»)',
      H.cells + '칸 / 배너 종수 ' + H.species + ' (30,000 장)');
    ok(H.sum === 30000, '[H3] 칸의 개수 표기 합이 뽑은 수와 정확히 같다(한 장도 안 샌다)', H.sum + '/30000');
    ok(!H.over, '[H4] 칸이 그리드 가로 밖으로 안 나간다', H.over + '칸 넘침');
    ok(H.ms < 3000, '[H5] 30,000 장 소환+렌더가 3초 안에 끝난다', H.ms.toFixed(1) + 'ms'
      + ' · 그리드 ' + H.scrollH + '/' + Math.round(H.viewH));
    await page.evaluate(() => { closeSummonResult(); });
  }

  ok(!errs.length, '[Z] 콘솔 에러 0건', errs.length ? errs.slice(0, 2).join(' | ') : '0건');

  await ctx.close(); await browser.close();
  console.log('\nverify668: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
