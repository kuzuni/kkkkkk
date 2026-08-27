/* 작업 207 — 151 이용권 카드 리본(«매일 보석 지급» / «구매 즉시 보석 지급») 다이아 아이콘 정렬 진단.
 *
 * 주인 보고: «매일 보석 지급에 다이아 아이콘도 밀려 있음».
 * 리본 구조는 `.pvc>.rb` 안에 `<i>라벨</i><b>금색 판 + .cic</b><u>수량</u>` 이고,
 * 금색 판 `b` 와 수량 `u` 는 둘 다 `right:var(--gx)` 로 **같은 세로축**에 걸려 있어야 한다.
 *
 * 이 프로브는 카드 3장 × 리본 2줄에 대해
 *   ① 리본 몸통 `.rb` / 라벨 `i` / 금색 판 `b` / 아이콘 `.cic` / 수량 `u` 의 앱 좌표 rect
 *   ② «판 중심 − 아이콘 중심» Δ (판 안에서 아이콘이 가운데인가)
 *   ③ «판 중심 − 수량 중심» Δ (판과 수량이 같은 축인가)
 *   ④ 판이 리본 오른끝에서 얼마나 떨어져 있나(--gx 가 먹은 실제 값)
 *   ⑤ `.cic` 의 계산된 스타일(width/height/vertical-align/display) — 리본 줄높이와의 관계
 * 를 찍는다. 191 처럼 «가운데 정렬이 애초에 안 걸린» 경우를 잡기 위해 `b` 의 안쪽 여백도 같이 낸다.
 *
 * 실행: node tools/probe207.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  await p.evaluate(() => {
    S.dia = 3e5; S.gold = 1e9;
    S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; });
    openShopTab('pass');
  });
  await p.waitForTimeout(1000);
  /* 유휴 루프·등장 연출 정지 — 움직이는 중에 재면 다른 것을 잰다(LESSONS 51-③) */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *').forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  });
  await p.waitForTimeout(200);

  const dump = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +(r.left - A.left).toFixed(2), y: +(r.top - A.top).toFixed(2),
               w: +r.width.toFixed(2), h: +r.height.toFixed(2),
               cx: +(r.left - A.left + r.width / 2).toFixed(2),
               cy: +(r.top - A.top + r.height / 2).toFixed(2) };
    };
    const out = [];
    document.querySelectorAll('#shopw .pvc').forEach((card) => {
      const id = card.dataset.pv;
      card.querySelectorAll(':scope > .rb').forEach((rb) => {
        const lab = rb.querySelector(':scope > i');
        const pl = rb.querySelector(':scope > b');
        const ic = rb.querySelector(':scope > b > .cic');
        const qt = rb.querySelector(':scope > u');
        const cs = ic ? getComputedStyle(ic) : null;
        const cp = pl ? getComputedStyle(pl) : null;
        const R = { id, cls: rb.className, ban: card.classList.contains('ban1'),
          gx: rb.style.getPropertyValue('--gx'),
          rb: box(rb), lab: box(lab), plate: box(pl), icon: box(ic), qty: box(qt) };
        if (R.plate && R.icon) {
          R.d_plate_icon = { dx: +(R.icon.cx - R.plate.cx).toFixed(2), dy: +(R.icon.cy - R.plate.cy).toFixed(2) };
          /* 판 안쪽(테두리 제외) 기준 여백 — 191 식 «음수 여백» 검출용 */
          const bw = parseFloat(cp.borderLeftWidth) || 0;
          R.plate_inner = { w: +(R.plate.w - bw * 2).toFixed(2), h: +(R.plate.h - bw * 2).toFixed(2), border: bw };
          R.slack = { x: +(R.plate.w - bw * 2 - R.icon.w).toFixed(2), y: +(R.plate.h - bw * 2 - R.icon.h).toFixed(2) };
        }
        if (R.plate && R.qty) R.d_plate_qty = { dx: +(R.qty.cx - R.plate.cx).toFixed(2) };
        if (R.rb && R.plate) R.plate_right_gap = +(R.rb.x + R.rb.w - (R.plate.x + R.plate.w)).toFixed(2);
        if (cs) R.icon_css = { w: cs.width, h: cs.height, va: cs.verticalAlign, disp: cs.display,
                               of: cs.objectFit, tr: cs.transform, natural: null };
        if (ic) { R.icon_css.natural = ic.naturalWidth + 'x' + ic.naturalHeight; R.icon_css.src = ic.getAttribute('src'); }
        if (cp) R.plate_css = { disp: cp.display, ai: cp.alignItems, jc: cp.justifyContent,
                                bs: cp.boxSizing, fs: cp.fontSize, lh: cp.lineHeight };
        out.push(R);
      });
    });
    return out;
  });

  console.log(JSON.stringify(dump, null, 1));
  console.log('\n--- 요약: 판 중심 대비 아이콘 중심 Δ ---');
  dump.forEach((r) => {
    console.log([r.id, r.cls.replace('rb ', ''), 'gx=' + r.gx,
      'Δicon=' + (r.d_plate_icon ? r.d_plate_icon.dx + ',' + r.d_plate_icon.dy : '-'),
      'slack=' + (r.slack ? r.slack.x + ',' + r.slack.y : '-'),
      'Δqty=' + (r.d_plate_qty ? r.d_plate_qty.dx : '-'),
      'rightgap=' + r.plate_right_gap].join('  '));
  });
  console.log('\nerrors: ' + (errs.length ? errs.join(' | ') : '0'));
  await b.close();
})();
