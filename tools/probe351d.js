#!/usr/bin/env node
/* 351d — «7회차 E3(잉크 충돌) 재판정 자» — probe351c 가 낸 7건이 **정말로 겹쳐 보이는가**를 묻는다.
 *
 * 왜 또 파일을 하나 더 세우나 (406 이 E1 에 한 것과 정확히 같은 일이다):
 *   probe351c 의 `coverAt()` 은 «위에 얹힌 것이 불투명한가» 를 **`backgroundColor` 의 alpha 하나로만**
 *   판정한다. 그런데 이 게임의 띠·패널은 태반이 `background:linear-gradient(...)` 라
 *   **`backgroundColor` 가 `rgba(0,0,0,0)` 으로 계산된다** — 눈에는 꽉 찬 불투명 초록인데 자에게는
 *   «배경 없음» 이다. 그래서 그 뒤의 탭바 글자를 «아직 읽히는 글자» 로 세고, 그 위의 띠 글자와
 *   «둘 다 못 읽는 잉크 충돌» 이라고 적는다. 실제로는 **뒤 글자가 통째로 가려져 있어** 충돌이 없다.
 *
 * ⇒ 이 자는 두 가지를 같이 한다:
 *   ① 기하 — 무엇이 어디에 있어서 겹치나 (수리에 필요한 값)
 *   ② 재판정 — 겹침 점마다 **찍힌 픽셀**(캡처 → data URL → 페이지 안 canvas 로 되읽기, 350 처방)로
 *      «뒤 글자가 실제로 보이나» 를 확인한다. 자가 아니라 픽셀이 답한다.
 *
 * 실행: node tools/probe351d.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { drive, fresh, settle, TALL, SHORT } = require('./probe351lib');

/* probe351c 가 E3 를 낸 화면 둘 + 그 자리에서 재야 할 셀렉터 */
const CASES = [
  { o: { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' },
    sels: ['#blsw', '#blsw>.bls', '.bls-promo', '.bls-promo .tx', '#blsAll', '#tabbar', '#tabbar .tab.fresh'],
    pairs: [['#tabbar .tab.fresh .ti', '.bls-promo'], ['#tabbar .tab.fresh .tl', '.bls-promo'], ['#tabbar .tab.fresh em.nw', '.bls-promo']] },
  { o: { label: 'prof:20-스펙', prof: '.pf-tgl>.lb' },
    sels: ['.spc', '.spc-tabs', '.spc-tab-on', '#spcProfTab', '.spc-list', '#tabbar', '#tabbar .tab.fresh'],
    pairs: [['#tabbar .tab.fresh .ti', '.spc-tabs'], ['#tabbar .tab.fresh em.nw', '#spcProfTab']] },
];

/* 겹침 점에서 «뒤 글자» 위에 얹힌 스택을 배경 종류까지 적어 돌려준다.
   `backgroundImage` 가 `none` 이 아니면 그것도 «칠해진 것» 이다 — c 가 못 보던 바로 그 축. */
const STACK = function (arg) {
  const back = document.querySelector(arg.back), front = document.querySelector(arg.front);
  if (!back || !front) return { miss: true, back: !!back, front: !!front };
  const rb = back.getBoundingClientRect(), rf = front.getBoundingClientRect();
  const ox1 = Math.max(rb.left, rf.left), ox2 = Math.min(rb.right, rf.right);
  const oy1 = Math.max(rb.top, rf.top), oy2 = Math.min(rb.bottom, rf.bottom);
  if (!(ox2 > ox1 && oy2 > oy1)) return { overlap: 0 };
  const x = (ox1 + ox2) / 2, y = (oy1 + oy2) / 2;
  const stack = [];
  for (const h of document.elementsFromPoint(x, y)) {
    const cs = getComputedStyle(h);
    const bc = cs.backgroundColor || '';
    const m = bc.match(/rgba?\(([^)]+)\)/);
    const p = m ? m[1].split(',').map((s) => parseFloat(s)) : [];
    stack.push({
      tag: (h.id ? '#' + h.id : h.tagName.toLowerCase() + (h.className && typeof h.className === 'string' ? '.' + h.className.trim().split(/\s+/)[0] : '')),
      bgColorA: p.length > 3 ? p[3] : (m ? 1 : 0),
      bgImage: cs.backgroundImage !== 'none',
      op: +cs.opacity,
    });
    if (h === back || h.contains(back)) break;
  }
  return {
    pt: [+x.toFixed(1), +y.toFixed(1)],
    overlapPx: +((oy2 - oy1) * (ox2 - ox1)).toFixed(0),
    oy: [+oy1.toFixed(1), +oy2.toFixed(1)],
    stack,
  };
};

const SCAN = function (sels) {
  const out = [];
  const app = document.getElementById('app');
  const A = app ? app.getBoundingClientRect() : { top: 0, left: 0, height: 0 };
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out.push({ s, miss: true }); continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      s,
      y1: +(r.top - A.top).toFixed(1), y2: +(r.bottom - A.top).toFixed(1),
      x1: +(r.left - A.left).toFixed(1), x2: +(r.right - A.left).toFixed(1),
      h: +r.height.toFixed(1),
      bg: cs.backgroundColor, bgi: cs.backgroundImage === 'none' ? '-' : 'gradient/url', pb: cs.paddingBottom,
    });
  }
  out.push({ s: '#app', h: +A.height.toFixed(1) });
  return out;
};

/* ③ 찍힌 픽셀로 못박는다 (350·402 처방) — «뒤 글자가 실제로 그려지나» 는 자가 아니라 픽셀이 답한다.
   같은 화면을 두 번 찍는다: 있는 그대로 ↔ `#tabbar`만 `visibility:hidden`.
   겹침 띠 안에서 두 캡처가 **한 픽셀도 안 다르면** 탭바는 그 띠에 아무것도 안 그린 것이다 = 완전히 덮였다. */
async function pixelDiff(page, band) {
  const clip = { x: band.x1, y: band.y1, width: band.x2 - band.x1, height: band.y2 - band.y1 };
  const a = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(() => { document.getElementById('tabbar').style.visibility = 'hidden'; });
  await page.waitForTimeout(120);
  const b = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(() => { document.getElementById('tabbar').style.visibility = ''; });
  await page.waitForTimeout(120);
  /* 캡처를 data URL 로 페이지에 되돌려 **찍힌 픽셀**을 센다(350 처방 — PIL 없이도 정확하다).
     «다르다/같다» 로 끝내면 `border-radius` 코너 누출 한 점에도 «실재» 가 나온다 ⇒ **개수와 bbox** 를 받는다. */
  return page.evaluate(async (arg) => {
    const load = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const [ia, ib] = await Promise.all([load(arg.a), load(arg.b)]);
    const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(ia, 0, 0); const da = cx.getImageData(0, 0, cv.width, cv.height).data;
    cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(ib, 0, 0);
    const db = cx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
    for (let p = 0; p < da.length; p += 4) {
      if (da[p] === db[p] && da[p + 1] === db[p + 1] && da[p + 2] === db[p + 2]) continue;
      n++;
      const i = p / 4, x = i % cv.width, y = (i / cv.width) | 0;
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
    }
    return { n, tot: cv.width * cv.height, w: cv.width, h: cv.height, bbox: n ? [x1, y1, x2, y2] : null };
  }, { a, b });
}

(async () => {
  const browser = await launch(chromium);
  for (const c of CASES) {
    console.log('\n=== ' + c.o.label);
    for (const [tag, vp] of [['2280', TALL], ['1600', SHORT]]) {
      const { ctx, page } = await fresh(browser, ...vp);
      await drive(page, c.o);
      await settle(page);
      const rows = await page.evaluate(SCAN, c.sels);
      console.log('  --- ' + tag);
      for (const r of rows) {
        if (r.miss) { console.log('    ' + r.s.padEnd(22) + ' (없음)'); continue; }
        if (r.s === '#app') { console.log('    #app h=' + r.h); continue; }
        console.log('    ' + r.s.padEnd(22) + ` y ${r.y1}..${r.y2} (h ${r.h}) · x ${r.x1}..${r.x2} · bgColor ${r.bg} · bgImage ${r.bgi}`);
      }
      if (tag === '1600') {
        for (const [back, front] of c.pairs) {
          const s = await page.evaluate(STACK, { back, front });
          if (s.miss) { console.log(`    [스택] ${back} ↔ ${front}: 노드 없음`); continue; }
          if (!s.stack) { console.log(`    [스택] ${back} ↔ ${front}: 겹침 0`); continue; }
          console.log(`    [스택] ${back} ↔ ${front} · 겹침 y${s.oy[0]}..${s.oy[1]} · 점 ${s.pt}`);
          for (const e of s.stack) console.log(`        ${e.tag.padEnd(22)} bgColorA=${e.bgColorA} bgImage=${e.bgImage} opacity=${e.op}`);
        }
        /* 겹침 띠는 **그 쌍의 두 상자가 실제로 겹치는 사각형**으로 잡는다.
           ⚠ 앞 상자 전체로 잡으면 `border-radius` 코너(투명)가 섞여 «픽셀이 바뀐다» 가 항상 나온다 —
              그건 탭바 글자가 보이는 것이 아니라 **모서리 밖이 보이는 것**이다. */
        for (const [back, front] of c.pairs) {
          const band = await page.evaluate((a) => {
            const b = document.querySelector(a.back), f = document.querySelector(a.front);
            if (!b || !f) return null;
            const rb = b.getBoundingClientRect(), rf = f.getBoundingClientRect();
            const x1 = Math.max(rb.left, rf.left), x2 = Math.min(rb.right, rf.right);
            const y1 = Math.max(rb.top, rf.top), y2 = Math.min(rb.bottom, rf.bottom);
            return (x2 - x1 > 2 && y2 - y1 > 2)
              ? { x1: Math.ceil(x1) + 1, y1: Math.ceil(y1) + 1, x2: Math.floor(x2) - 1, y2: Math.floor(y2) - 1 } : null;
          }, { back, front });
          if (!band) { console.log(`    [픽셀] ${back} ↔ ${front}: 겹침 없음`); continue; }
          const d = await pixelDiff(page, band);
          const pct = (100 * d.n / d.tot).toFixed(2);
          console.log(`    [픽셀] ${back} ↔ ${front} · 띠 x${band.x1}..${band.x2} y${band.y1}..${band.y2} (${d.w}×${d.h})`);
          console.log(`        탭바를 숨기면 바뀌는 픽셀 ${d.n} / ${d.tot} (${pct}%)`
            + (d.n ? ` · bbox 띠-local ${JSON.stringify(d.bbox)}` : '')
            + (d.n === 0 ? '  ⇒ **E3 유령**(완전히 덮임)' : ''));
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
})();
