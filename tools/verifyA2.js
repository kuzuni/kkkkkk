/* 작업 A2 좌측 사이드 아이콘 — 회귀 게이트.  실행: node tools/verifyA2.js
   기하(행 그리드·좌측 여백·겹침)와 짧은 기기 대응만 본다. 잉크 bbox 는 tools/scanA2.py 담당.
   기준 프레임 1080x2280 에서 레퍼런스 02(1080x2340) 행 y − 84 를 목표로 한다. */
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* 측정표 §1-2 의 ref 행 top: 260 / 421 / 556 / 687 / 820 / 958 → −84
   (83: 5행 «도감» 신설로 축복이 ref 6행 자리로 내려갔다) */
const ROW_TOP = [176, 337, 472, 603, 736, 874];
const TOL = 3;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };

(async () => {
  const b = await launch(chromium);
  const errs = [];

  /* [1] 기준 프레임 — 행 그리드 */
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);
  await p.evaluate(() => { if (panelOpen) { panelOpen = false; syncPanel(); } });
  await p.waitForTimeout(300);

  const g = await p.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const rel = e => { const b = e.getBoundingClientRect();
      return { x: b.x - app.x, y: b.y - app.y, w: b.width, h: b.height, r: b.right - app.x, b: b.bottom - app.y }; };
    return {
      rows: [...document.querySelectorAll('#sideL .ibtn')].map(e => ({ pop: e.dataset.pop, ...rel(e) })),
      menub: rel(document.getElementById('menub')),
      foot: rel(document.getElementById('battlefoot')),
      app: { h: app.height }
    };
  });

  console.log('[1] 행 그리드 (1080x2280)');
  ok(g.rows.length === 6, `좌측 6칸 (실제 ${g.rows.length})`);  /* 83: +도감 */
  g.rows.forEach((r, i) => {
    ok(Math.abs(r.y - ROW_TOP[i]) <= TOL,
      `${i + 1}행 ${r.pop} top ${r.y.toFixed(1)} — 목표 ${ROW_TOP[i]} (Δ${(r.y - ROW_TOP[i]).toFixed(1)})`);
    ok(Math.abs(r.x - 45) < .6, `${i + 1}행 좌측 여백 ${r.x.toFixed(1)} — 목표 45`);
  });
  ok(g.rows.every(r => r.r <= g.menub.x), '좌측 스택과 ▦ 메뉴 버튼 가로 겹침 0');
  ok(g.rows[g.rows.length - 1].b < g.foot.y, '스택 하단이 battlefoot 을 안 침범');
  ok(Math.abs(g.menub.y - 176) <= TOL, `▦ 메뉴 top ${g.menub.y.toFixed(1)} — 목표 176`);

  /* [2] 화면비 3종 — 스택이 프레임 안에 들어가고 1행 top 은 안 흔들린다 */
  console.log('[2] 화면비 회귀');
  for (const [w, h] of [[1080, 1920], [1080, 2520], [1024, 768]]) {
    const c2 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p2 = await c2.newPage();
    p2.on('pageerror', e => errs.push(String(e)));
    p2.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p2.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p2.waitForTimeout(900);
    await p2.evaluate(() => { if (panelOpen) { panelOpen = false; syncPanel(); } });
    await p2.waitForTimeout(250);
    const r = await p2.evaluate(() => {
      const app = document.getElementById('app').getBoundingClientRect();
      const rs = [...document.querySelectorAll('#sideL .ibtn')].map(e => e.getBoundingClientRect());
      const foot = document.getElementById('battlefoot').getBoundingClientRect();
      return { top: rs[0].y - app.y, last: rs[rs.length - 1].bottom - app.y,
               foot: foot.y - app.y, appH: app.height };
    });
    ok(r.last < r.foot, `${w}x${h} — 스택 하단 ${r.last.toFixed(0)} < battlefoot ${r.foot.toFixed(0)}`);
    ok(r.top > 0 && r.last < r.appH, `${w}x${h} — 프레임 밖 잘림 0`);
    await c2.close();
  }

  console.log('[3] 콘솔');
  ok(errs.length === 0, '콘솔 에러 0 ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : ''));

  await b.close();
  console.log(`\nVERIFYA2 ${pass}/${pass + fail}` + (fail ? ' — FAIL' : ''));
  process.exit(fail ? 1 : 0);
})();
