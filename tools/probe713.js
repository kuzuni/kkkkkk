#!/usr/bin/env node
/* 713 재현 — «배수 토글이 어느 팝업에 붙어 있는가» 를 **찍힌 노드·좌표로** 묻는다
 *
 *   node tools/probe713.js
 *
 * 주인 정정(2026-09-02 02:50): «그 소환결과쪽에 x1 x10 x100 이런거 놔달라니까 소환팝업에 놧네».
 * 668 은 토글을 **10 상점 소환 탭**(#shopw)에 놓았고, 주인이 지목한 자리는
 * **12 소환 결과 팝업**(#sumw)의 재소환 버튼 쪽이다.
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 확인한다. 이 자가 묻는 것은 넷이다.
 *
 *   [1] 자리      — 토글 노드의 조상이 #shopw 인가 #sumw 인가 (등재문의 «자리를 잘못 잡았다»)
 *   [2] 빈 띠     — 결과 팝업 안에 98px 짜리 공용 셸(`.stabs`)이 들어갈 띠가 있는가
 *                   ⚑ **수리 설계의 근거다** — 없으면 «그냥 옮기기» 가 성립하지 않는다.
 *   [3] 상점 대가 — 668 이 바 자리를 만드느라 내린 리스트 하변(154 → 266)이 그대로인가
 *   [4] 보이지 않는 배수 — 상점 **카드** 버튼이 배수를 타는가.
 *                   토글만 떼고 이 축을 두면 «화면에 없는 ×1000 이 카드 가격에 걸린» 상태가 된다.
 *
 * [2] 의 산수(수리 전 값): 패널은 `padding:106 0 98` 이고 하단 크롬(`.sm-panel::after`)이 15px 이라
 * 쓸 수 있는 띠는 [15, 98] = **83px** — 공용 셸 98px 이 **15px 모자란다**. 그래서 713 은
 * «옮기기» 만으로 안 끝나고 패널 안에서 띠를 넓히는 일까지가 한 단위다.
 *
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

const SHELL_H = 98;      /* 공용 서브탭 셸 `.stabs` 높이(96·437 규약) */

async function openPage(browser, height) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function'
    && typeof SUM_MULS !== 'undefined');
  await page.waitForTimeout(300);
  /* 73 ③ — 가이드 소환 미션이 다른 배너의 doSummon 을 조용히 막는다(668 §8) */
  await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
  return { ctx, page };
}

(async () => {
  const browser = await launch(chromium);

  /* ── [1]·[2] 결과 팝업을 실제로 띄워 놓고 잰다 ───────────────────────────── */
  {
    const { ctx, page } = await openPage(browser, 2280);
    const r = await page.evaluate(() => {
      S.dia = 1e12;
      const B = (typeof gmBan === 'function' && gmBan()) || 'weapon';
      doSummon(B, 10);
      const bar = document.getElementById('sumMulBar');
      const host = !bar ? null
        : (bar.closest('#sumw') ? 'sumw' : (bar.closest('#shopw') ? 'shopw' : 'other'));
      const panel = document.querySelector('.sm-panel').getBoundingClientRect();
      const grid = document.querySelector('.sm-grid').getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('.sm-panel'));
      /* 하단 크롬은 `.sm-panel::after` 의 높이다 — 의사요소라 rect 가 없어 계산값을 읽는다 */
      const chrome = parseFloat(getComputedStyle(document.querySelector('.sm-panel'), '::after').height);
      return {
        host, exists: !!bar,
        inSumw: document.querySelectorAll('#sumw [data-mul]').length,
        inShopw: document.querySelectorAll('#shopw [data-mul]').length,
        padBot: parseFloat(cs.paddingBottom), chrome,
        band: (panel.bottom - grid.bottom) - chrome,
        gh: cs.getPropertyValue('--sm-gh').trim(),
        panelH: +panel.height.toFixed(1),
        skipBot: +(panel.bottom - document.getElementById('sumSkip').getBoundingClientRect().bottom).toFixed(1)
      };
    });
    ok(r.host === 'sumw', '[1] 배수 토글이 **12 소환 결과 팝업**(#sumw) 안에 있다',
      '호스트 ' + r.host + ' · #sumw ' + r.inSumw + '칸 / #shopw ' + r.inShopw + '칸');
    ok(r.band >= SHELL_H, '[2] 결과 팝업 하단 띠가 공용 셸 98px 을 받는다',
      '띠 ' + r.band.toFixed(1) + 'px (패널 padding-bottom ' + r.padBot + ' − 크롬 ' + r.chrome
      + ') · 셸 ' + SHELL_H + ' ⇒ ' + (r.band - SHELL_H).toFixed(1) + 'px');
    ok(r.panelH === 1080, '[2-b] [전제] 그 띠를 넓혀도 패널은 1080(= ref 539 × 2, 327 주인 지시) 이다',
      '패널 ' + r.panelH + ' · --sm-gh ' + r.gh);
    await ctx.close();
  }

  /* ── [3]·[4] 상점 쪽이 치르고 있는 대가 ─────────────────────────────────── */
  {
    const { ctx, page } = await openPage(browser, 2280);
    const r = await page.evaluate(() => {
      S.dia = 1e12; openShopPage('weapon');
      const list = document.getElementById('shopList');
      const lb = parseFloat(getComputedStyle(list).bottom);
      /* 배수를 켜 놓고 카드 버튼의 라벨이 따라가는지 본다 — 토글이 화면에서 사라진 뒤에도
         이 축이 살아 있으면 «보이지 않는 ×1000» 이 된다. */
      sumMul = 1000; if (typeof renderShopPage === 'function') renderShopPage();
      const lab = [...document.querySelectorAll('#shopList .cbtn.b2 .lab')].map(u => u.textContent)[0] || '';
      sumMul = 1; if (typeof renderShopPage === 'function') renderShopPage();
      const lab1 = [...document.querySelectorAll('#shopList .cbtn.b2 .lab')].map(u => u.textContent)[0] || '';
      return { lb, lab, lab1, bars: document.querySelectorAll('#shopw [data-mul]').length };
    });
    ok(r.lb === 154, '[3] 상점 리스트 하변이 668 이전(154)으로 돌아왔다',
      'bottom ' + r.lb + 'px (668 이 바 자리를 만드느라 266 으로 내렸다)');
    ok(r.lab === r.lab1 && r.lab1 === '10회 소환',
      '[4] 상점 **카드** 버튼은 배수를 안 탄다(화면에 없는 배수가 가격에 안 걸린다)',
      '×1000 «' + r.lab + '» / ×1 «' + r.lab1 + '» · 상점 토글 칸 ' + r.bars + '개');
    await ctx.close();
  }

  await browser.close();
  console.log('\nprobe713: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
