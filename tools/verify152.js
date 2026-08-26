/* 작업 152 게이트 — 10 상점 «이용권» 탭 타이틀(«이용권 상점») 이 제자리에 한 줄로 앉는가.
 *
 * 버그(주인 보고 2026-08-27): «이용권 상점 타이틀이 오른쪽으로 치우쳐 이상하게 박혀 있음».
 *
 * 실측(`tools/probe152.js`·`tools/scan152.py`, 2026-08-26) — 증상은 **두 개**였다:
 *   ⓐ 치우침 — 잉크 중심 820.5 로 프레임 중앙(540) 에서 **+280.5px**. 좌 여백 678 ↔ 우 117.5.
 *   ⓑ 두 줄 접힘 — 잉크 높이 **172px(= line-height 86 × 2)**, 화소로도 y149..213 / 235..253 두 덩어리.
 *      `.cn-ti` 박스는 78px 인데 잉크가 **94px 아래로 넘쳐** 갈색 밴드(`.cn-hd`) 쪽으로 흘렀다.
 *
 * 원인은 하나다. 124(이용권 탭)가 13(재화 탭)의 `.cn-ti` 를 통째로 빌려 썼는데, 그 값
 * `left:670px;width:301px` 는 13 의 **배너 아트(`.cn-bn`)를 피해 오른쪽에 앉힌** 레퍼런스 실측이다.
 *   · 이용권 탭에는 배너가 없다 → 피할 대상이 없는데 혼자 오른쪽에 남았다(ⓐ)
 *   · «이용권 상점» 잉크는 **319px** 로 «재화 상점»(268px) 보다 길다 → 301px 박스에 못 들어가 접혔다(ⓑ)
 * 그래서 폭을 전폭(1080)으로 열고 좌표를 0 으로 되돌린다 — 이 페이지의 나머지 부품이 전부
 * 쓰는 «프레임 중앙 540» 규칙과 같아진다.
 *
 * 검사:
 *   ① 타이틀 잉크 중심 = 540 ±3 (치우침 회수 — ⓐ)
 *   ② 타이틀이 **한 줄** 이다: 잉크 높이 ≤ line-height 86 + 여유 12 (접힘 회수 — ⓑ)
 *   ③ 잉크가 `.cn-ti` 박스 좌우 안에 들어온다(넘쳐 흐르지 않는다)
 *   ④ 타이틀 잉크가 아래 갈색 밴드(`.cn-hd`)를 침범하지 않는다
 *   ⑤ 이 페이지의 다른 부품과 같은 중심(540 ±3)에 선다 — 밴드 글자·리본·안내문·기간 바
 *   ⑥ **회귀**: 13 재화 탭의 `.cn-ti` 는 그대로 치우쳐 있다(중심 820.5 ±3) — 남의 구간 안 건드림
 *   ⑦ 프레임 4종(1600·1920·2280·2600)에서 ①~⑥ 동일 + 콘솔 에러 0
 *
 * 실행: node tools/verify152.js            → 마지막 줄 VERIFY152 n/n PASS
 *       node tools/verify152.js --broken   → 옛 CSS(left:670/width:301)를 주입해 게이트가 실제로 잡는지(음성 테스트)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];
const BROKEN = process.argv.includes('--broken');

let pass = 0, fail = 0;
const bad = [];
function ck(name, ok, detail){
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name + (detail ? '  — ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

(async () => {
  const browser = await launch(chromium);
  for (const H of HEIGHTS) {
    console.log('\n[frame 1080x' + H + ']');
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderShopPage === 'function');
    await page.waitForTimeout(500);

    if (BROKEN) {
      await page.addStyleTag({ content: '.cn-wrap.pv>.cn-ti{left:670px !important;width:301px !important}' });
    }

    /* ---- 이용권 탭 ---- */
    await page.evaluate(() => {
      try { closeShopPage && closeShopPage(); } catch (e) {}
      openShopPage(); shopCat = 'pass'; setShopCatTabs('pass'); renderShopPage();
      const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
    });
    await page.waitForTimeout(400);

    const m = await page.evaluate(() => {
      const w = document.querySelector('#shopList .cn-wrap.pv');
      if (!w) return null;
      const wr = w.getBoundingClientRect(), sc = wr.width / 1080;
      const L = r => (r.left - wr.left) / sc, R = r => (r.right - wr.left) / sc;
      const T = r => (r.top - wr.top) / sc, B = r => (r.bottom - wr.top) / sc;
      const q = s => w.querySelector(s);
      const box = r => r ? { l: L(r), r: R(r), t: T(r), b: B(r), c: (L(r) + R(r)) / 2 } : null;
      const rect = s => { const e = q(s); return e ? box(e.getBoundingClientRect()) : null; };
      const ti = q('.cn-ti'), tii = ti && ti.querySelector('i');
      return {
        tiBox: ti ? box(ti.getBoundingClientRect()) : null,
        tiInk: tii ? box(tii.getBoundingClientRect()) : null,
        lh: tii ? parseFloat(getComputedStyle(tii).lineHeight) / sc : 0,
        hd: rect('.cn-hd'), hdI: rect('.cn-hd>i'), rb: rect('.cn-rb'),
        nt: rect('.pv-nt'), bt: rect('.pv-bt'),
      };
    });
    if (!m || !m.tiInk) { ck('이용권 타이틀 존재', false, '.cn-ti 를 못 찾음'); await ctx.close(); continue; }

    const inkC = m.tiInk.c, inkH = m.tiInk.b - m.tiInk.t;
    ck('① 타이틀 잉크 중심 540±3', Math.abs(inkC - 540) <= 3,
       '중심 ' + inkC.toFixed(1) + ' (Δ' + (inkC - 540 >= 0 ? '+' : '') + (inkC - 540).toFixed(1) + ')');
    ck('② 타이틀 한 줄 (잉크 높이 ≤ lh+12)', inkH <= m.lh + 12,
       '잉크 높이 ' + inkH.toFixed(1) + ' · line-height ' + m.lh.toFixed(1)
       + (inkH > m.lh + 12 ? ' → ' + Math.round(inkH / m.lh) + '줄로 접힘' : ' → 1줄'));
    ck('③ 잉크가 박스 좌우 안', m.tiInk.l >= m.tiBox.l - 1 && m.tiInk.r <= m.tiBox.r + 1,
       '잉크 x' + m.tiInk.l.toFixed(1) + '..' + m.tiInk.r.toFixed(1)
       + ' ⊂ 박스 x' + m.tiBox.l.toFixed(1) + '..' + m.tiBox.r.toFixed(1));
    ck('④ 타이틀이 갈색 밴드를 안 침범', m.hd ? m.tiInk.b <= m.hd.t + 1 : false,
       m.hd ? '잉크 하단 ' + m.tiInk.b.toFixed(1) + ' ≤ 밴드 상단 ' + m.hd.t.toFixed(1)
              + (m.tiInk.b > m.hd.t + 1 ? '  (' + (m.tiInk.b - m.hd.t).toFixed(1) + 'px 침범)' : '')
            : '.cn-hd 없음');

    /* ⑤ 같은 페이지의 다른 부품과 같은 중심 */
    [['밴드 글자 .cn-hd>i', m.hdI], ['리본 .cn-rb', m.rb], ['안내문 .pv-nt', m.nt], ['하단 문구 .pv-bt', m.bt]]
      .forEach(([n, r]) => {
        if (!r) { ck('⑤ ' + n + ' 중심 540±3', false, '요소 없음'); return; }
        ck('⑤ ' + n + ' 중심 540±3', Math.abs(r.c - 540) <= 3, '중심 ' + r.c.toFixed(1));
      });

    /* ---- ⑥ 회귀: 13 재화 탭은 원래대로 치우쳐 있어야 한다 ---- */
    await page.evaluate(() => {
      shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage();
      const l = document.getElementById('shopList'); if (l) l.scrollTop = 0;
    });
    await page.waitForTimeout(400);
    const c = await page.evaluate(() => {
      const w = document.querySelector('#shopList .cn-wrap');
      const i = w && w.querySelector('.cn-ti>i');
      if (!i) return null;
      const wr = w.getBoundingClientRect(), sc = wr.width / 1080, r = i.getBoundingClientRect();
      return { c: ((r.left - wr.left) / sc + (r.right - wr.left) / sc) / 2,
               h: r.height / sc, txt: i.textContent };
    });
    ck('⑥ 13 재화 탭 타이틀 중심 820.5±3 (남의 구간 불변)',
       !!c && Math.abs(c.c - 820.5) <= 3, c ? '"' + c.txt + '" 중심 ' + c.c.toFixed(1) : '.cn-ti 없음');
    ck('⑥ 13 재화 탭 타이틀도 한 줄', !!c && c.h <= 98, c ? '잉크 높이 ' + c.h.toFixed(1) : '—');

    ck('⑦ 콘솔·페이지 에러 0', errs.length === 0, errs.length ? errs.slice(0, 2).join(' / ') : '0건');
    await ctx.close();
  }
  await browser.close();

  console.log('');
  if (bad.length) { console.log('실패 항목:'); bad.forEach(b => console.log('  · ' + b)); }
  const total = pass + fail;
  console.log('VERIFY152 ' + pass + '/' + total + ' ' + (fail === 0 ? 'PASS' : 'FAIL'));
  process.exit(fail === 0 ? 0 : 1);
})();
