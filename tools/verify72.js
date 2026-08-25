/* 작업 72 회귀 게이트 — 03 던전 카드 우측 썸네일 슬롯.
   실행: node tools/verify72.js   → 마지막 줄이 `VERIFY72 n/n PASS` 여야 한다.
   본다: ① 카드 5장 전부 슬롯이 있고 기하가 레퍼런스 실측(카드 안쪽 우측 315×334)과 일치
        ② 슬롯이 클릭을 먹지 않는다(pointer-events:none) — 카드 진입이 살아 있어야 한다
        ③ z 순서: 썸네일이 프레임(.fr)·텍스트·잠금 딤(.lk) «아래»
        ④ 잠금 카드는 썸네일도 딤 아래로 들어간다
        ⑤ 콘솔 에러 0 */
const { chromium } = require('playwright');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const d = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#dunList .dnc')];
    return cards.map((c) => {
      const cr = c.getBoundingClientRect();
      const th = c.querySelector('.th');
      if (!th) return { th: null };
      const tr = th.getBoundingClientRect();
      const kids = [...c.children].map((e) => e.className);
      return {
        th: { dx: +(tr.left - cr.left).toFixed(1), dy: +(tr.top - cr.top).toFixed(1), w: +tr.width.toFixed(1), h: +tr.height.toFixed(1) },
        pe: getComputedStyle(th).pointerEvents,
        emoji: (th.textContent || '').trim(),
        sx: getComputedStyle(th.querySelector('em')).transform,
        iTh: kids.indexOf('th'), iSh: kids.indexOf('sh'), iFr: kids.indexOf('fr'), iLk: kids.indexOf('lk'),
        locked: !!c.querySelector('.lk'),
        card: { w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) }
      };
    });
  });

  console.log('[1] 슬롯 기하 — 카드 안쪽 우측 315×334, 카드 좌상단 기준 (658, 8)');
  ok(d.length === 5, `카드 5장 (실제 ${d.length})`);
  d.forEach((c, i) => {
    ok(!!c.th, `카드${i + 1} 썸네일 슬롯 존재`);
    if (!c.th) return;
    ok(Math.abs(c.th.w - 315) <= 1 && Math.abs(c.th.h - 334) <= 1, `카드${i + 1} 슬롯 ${c.th.w}×${c.th.h} = 315×334`);
    ok(Math.abs(c.th.dx - 658) <= 1, `카드${i + 1} 슬롯 x offset ${c.th.dx} = 658 (우측 안쪽 정렬)`);
    ok(Math.abs(c.th.dy - 8) <= 1, `카드${i + 1} 슬롯 y offset ${c.th.dy} = 8 (안쪽 상단)`);
    ok(!!c.emoji, `카드${i + 1} 대체 아트 있음 (${c.emoji})`);
    ok(/matrix\(/.test(c.sx), `카드${i + 1} 잉크 폭 정규화 scaleX 적용 (${c.sx})`);
  });

  console.log('[2] 클릭 통과 · z 순서');
  d.forEach((c, i) => {
    if (!c.th) return;
    ok(c.pe === 'none', `카드${i + 1} 슬롯 pointer-events:none`);
    ok(c.iTh > -1 && c.iTh < c.iSh && c.iTh < c.iFr, `카드${i + 1} 썸네일이 .sh/.fr 아래(${c.iTh} < ${c.iSh},${c.iFr})`);
    if (c.locked) ok(c.iLk > c.iTh, `카드${i + 1}(잠금) 딤·자물쇠가 썸네일 위(${c.iLk} > ${c.iTh})`);
  });

  console.log('[3] 카드 진입이 살아 있다 (썸네일 위를 눌러도 세부 팝업이 뜬다)');
  const opened = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc');
    const r = c.getBoundingClientRect();
    document.elementFromPoint(r.left + 800, r.top + 175).closest('.dnc').click();
    return true;
  });
  await p.waitForTimeout(400);
  const hit = await p.evaluate(() => document.elementFromPoint(
    document.querySelector('#dunList .dnc').getBoundingClientRect().left + 800,
    document.querySelector('#dunList .dnc').getBoundingClientRect().top + 175) !== null);
  ok(opened && hit, '썸네일 영역의 히트 타깃이 카드로 잡힌다');

  console.log('[4] 콘솔 에러');
  ok(errs.length === 0, `콘솔 에러 ${errs.length}건`);
  errs.slice(0, 5).forEach((e) => console.log('    ERR', e));

  console.log(`\nVERIFY72 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
