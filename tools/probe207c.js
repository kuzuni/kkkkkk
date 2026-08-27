/* 작업 207 보조 프로브 2 — 이용권 탭(151) 안의 **모든** `.cic`(125 화폐 아이콘)이 부모 자리에서
   가운데인지 훑는다. 주인 보고가 «다이아 아이콘«도» 밀려 있음» 이라 리본 말고 다른 아이콘도 본다.
   각 아이콘에 대해 부모 안쪽 상자(테두리 제외) 대비 중심 Δ 와 남는 여백을 낸다.
   실행: node tools/probe207c.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *').forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  });
  await p.waitForTimeout(200);

  const rows = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#shopw .cic').forEach((ic) => {
      const pa = ic.parentElement;
      const pr = pa.getBoundingClientRect(), ir = ic.getBoundingClientRect();
      const cs = getComputedStyle(pa);
      const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
      const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      const pl = parseFloat(cs.paddingLeft) || 0, prr = parseFloat(cs.paddingRight) || 0;
      const pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0;
      const inx = pr.left + bl + pl, iny = pr.top + bt + pt;
      const inw = pr.width - bl - br - pl - prr, inh = pr.height - bt - bb - pt - pb;
      /* 부모 안쪽 상자가 아이콘보다 작으면(여백 음수) 191 식 «가운데 정렬 실패» 후보다 */
      out.push({
        where: (ic.closest('.pvc') ? ic.closest('.pvc').dataset.pv + ' ' : '') +
               (pa.tagName.toLowerCase() + '.' + (pa.className || '-')) +
               ' in ' + (pa.parentElement ? pa.parentElement.className || pa.parentElement.tagName : '?'),
        dx: +((ir.left + ir.width / 2) - (inx + inw / 2)).toFixed(2),
        dy: +((ir.top + ir.height / 2) - (iny + inh / 2)).toFixed(2),
        slackx: +(inw - ir.width).toFixed(2), slacky: +(inh - ir.height).toFixed(2),
        icon: +ir.width.toFixed(1) + 'x' + +ir.height.toFixed(1),
        pdisp: cs.display
      });
    });
    return out;
  });
  rows.forEach((r) => {
    const bad = Math.abs(r.dx) > 1.5 || Math.abs(r.dy) > 1.5;
    console.log((bad ? '⚠ ' : '  ') + [r.where, 'icon=' + r.icon, 'Δ=' + r.dx + ',' + r.dy,
      'slack=' + r.slackx + ',' + r.slacky, 'parentDisplay=' + r.pdisp].join('  '));
  });
  console.log('\ntotal ' + rows.length + ' · errors: ' + (errs.length ? errs.join(' | ') : '0'));
  await b.close();
})();
