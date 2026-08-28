/* 작업 A2 좌측 사이드 아이콘 — 회귀 게이트.  실행: node tools/verifyA2.js
   기하(행 그리드·좌측 여백·겹침)와 짧은 기기 대응만 본다. 잉크 bbox 는 tools/scanA2.py 담당.
   기준 프레임 1080x2280 에서 레퍼런스 02(1080x2340) 행 y − 84 를 목표로 한다. */
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

/* ⚑ 360 이관(2026-08-29, 저장소 주인 지시 — sess-2100-32546 워커 D).
   옛 값은 측정표 §1-2 의 ref 행 top(260 / 421 / 556 / 687 / 820 / 958 → −84)이었고
   제품은 그것을 Δ0 으로 따르고 있었다. 360 이 그 정본을 **주인 지시로 덮는다** —
   원문 «왼쪽에 출석보상만 왼쪽 버튼들이랑 간격이랑 크기가 달라보이더라. 다른거랑 같게 해줘».
   ref 의 1행이 «라벨 없는 단독 버튼(아트 101 · 아래 gap 60)» 이라 pitch 가 161 로 혼자 튀는데,
   그것이 정확히 주인이 «다르다» 고 본 자리다 ⇒ 여기서는 **레퍼런스가 아니라 지시가 정본**이다
   (의도적 이탈 — 측정표 `docs/measure/A2-사이드아이콘.md` §0 정오표 360).
   새 규격은 상수 둘로 전부 나온다: 1행 top 176(안 건드림) + 전 행 등간격 pitch 134
   (= 셀 114[아트 82 + 라벨 32] + gap 20). 표를 손으로 적지 않고 **식으로 깐다** —
   손으로 적으면 «어느 행이 왜 그 값인지» 가 다시 스냅샷이 된다(229 가 겪은 부패). */
const TOP0 = 176, PITCH = 134;
const ROW_TOP = Array.from({ length: 6 }, (_, i) => TOP0 + PITCH * i);
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
  /* 360 — «다른거랑 같게» 의 구조 축. 셀 높이가 한 행만 다르면(=`.solo` 부활) 좌표보다 먼저 깨진다.
     잉크 bbox 쪽은 `verify360` 이 차분법으로 따로 잰다. */
  ok(g.rows.every(r => Math.abs(r.h - 114) <= .6),
     `6행 셀 높이 전부 114 (실제 ${g.rows.map(r => r.h.toFixed(0)).join('/')})`);
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
