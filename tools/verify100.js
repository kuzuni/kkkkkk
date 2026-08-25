/* 작업 100 게이트 — 89 유물 페이지(#relw)가 하단 탭바(#tabbar)를 가리지 않는지.
   원인: `.rw-panel` 이 2280 기준 절대 높이 1527 로 고정돼 있어 세로가 짧은 프레임에서
   `#relw`(top:104 / bottom:180) 밖으로 넘치고, z-index 28 > 탭바 10 이라 탭바 위에 그려졌다.

   검사(지시서 100 ②·검증절):
     ① 프레임 1600 · 1920 · 2280 각각에서 `#relw.on` 상태의 모든 `.rw-*` 요소 bbox 가
        `#tabbar` bbox 와 **교차 넓이 0** 인가.
     ② 탭바 5칸이 각각 하나도 가려지지 않는가(칸별 교차 넓이 0).
     ③ 2280(기준 해상도)에서는 스케일이 정확히 1 이고 89 측정표 규격(패널 top266 · 1080×1527,
        수반 340,1173 400×216 등)이 **한 픽셀도** 안 변했는가 — 회귀 방지.
     ④ 짧은 프레임에서 패널 하변이 `#relw` 하변(=탭바 상변) 안에 들어오는가.
     ⑤ `.pcb` 재화 바는 `#relw` 밖(top:-104)에 있으므로 여전히 보이는가
        — `#relw{overflow:hidden}` 으로 고치면 이게 죽는다(그래서 스케일로 고쳤다).
     ⑥ **히트테스트** — 탭바 5칸 × 5점(중심+모서리)에서 `elementFromPoint` 가 탭바 자신을 돌려주는가.
        bbox 교차보다 강한 «실제로 눌리는가» 검사다. 수정 전에는 1600 에서 25/25, 1920 에서 15/25 가
        `#relw` 자식(rwGrid 등)에 막혀 **탭바가 아예 안 눌렸다.**
        ⚠ bbox 만으로는 03 `#dunw`·10 `#shopw` 가 «겹침 180px» 로 나오는데, 그건 스크롤 리스트의
        자식 bbox 가 클리핑 컨테이너 밖으로 뻗은 것일 뿐 실제로는 안 그려진다(히트테스트 0/25).
        같은 착각을 하지 않도록 두 검사를 **둘 다** 돌린다.

   실행: node tools/verify100.js        → 마지막 줄 VERIFY100 n/n PASS
*/
'use strict';
const path = require('path');
const fs = require('fs');

const { chromium } = (() => {
  try { return require('playwright'); } catch (e) {}
  try { return require('playwright-core'); } catch (e) {}
  console.error('playwright 를 찾을 수 없다 — `npm i --no-save playwright` 후 재실행');
  process.exit(2);
})();

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1600, 1920, 2280];   /* frameH clamp 하한 · 9:16 · 9:19 기준 */
/* frameH 를 그대로 만들려면 뷰포트 비율이 1080:frameH 여야 한다(폭 1080 고정, clamp 1600~2600). */

let pass = 0, fail = 0;
const bad = [];
function ck(name, ok, detail){
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name + (detail ? '  — ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* 교차 넓이 — 두 bbox 가 «맞닿는» 것(경계 공유)은 0 이다. */
function inter(a, b){
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return (w > 0 && h > 0) ? w * h : 0;
}

(async () => {
  const browser = await chromium.launch(launchOpts());
  try {
    for (const H of HEIGHTS) {
      console.log(`\n[frameH ${H}]`);
      const ctx = await browser.newContext({ viewport: { width: 540, height: Math.round(540 * H / 1080) }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(URL);
      await page.waitForTimeout(700);

      const r = await page.evaluate(() => {
        /* 유물조각을 넉넉히 줘서 소환 버튼이 «부족» 상태가 아니게 — 기하와 무관하지만 렌더 경로를 탄다 */
        try { S.relicFrag = 999999; } catch (e) {}
        openRelw();
        /* 레이아웃 확정 */
        void document.body.offsetHeight;

        const bb = el => { const q = el.getBoundingClientRect();
          return { left:q.left, top:q.top, right:q.right, bottom:q.bottom, width:q.width, height:q.height }; };

        const app = document.getElementById('app');
        const ar = app.getBoundingClientRect();
        const sc = ar.width / 1080;                 /* #app 자체의 fit() 스케일 */
        /* 프레임 좌표(1080 기준)로 되돌린다 */
        const F = el => { const q = el.getBoundingClientRect();
          return { left:(q.left-ar.left)/sc, top:(q.top-ar.top)/sc,
                   right:(q.right-ar.left)/sc, bottom:(q.bottom-ar.top)/sc,
                   width:q.width/sc, height:q.height/sc }; };

        const relw = document.getElementById('relw');
        const tabbar = document.getElementById('tabbar');
        const panel = relw.querySelector('.rw-panel');
        const pcb = relw.querySelector('.pcb');

        /* .rw-* 로 시작하는 클래스를 가진 모든 요소 + 패널 자신 */
        const rws = [panel, ...relw.querySelectorAll('[class*="rw-"]')];
        const items = rws.filter(Boolean).map(el => ({
          cls: el.className.toString().slice(0, 40),
          bb: F(el),
          vis: getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none'
        }));

        /* 탭바 5칸 */
        const cells = [...tabbar.children].map(el => ({ id: el.id || el.className.toString().slice(0,20), bb: F(el) }));

        /* ⑥ 히트테스트 — 칸마다 중심 + 모서리 안쪽 5px, 총 5점 */
        let hitBad = 0; const hitWho = [];
        for (const c of tabbar.children) {
          const q = c.getBoundingClientRect();
          const pts = [[q.left + q.width/2, q.top + q.height/2],
                       [q.left + 5, q.top + 5], [q.right - 5, q.top + 5],
                       [q.left + 5, q.bottom - 5], [q.right - 5, q.bottom - 5]];
          for (const [x, y] of pts) {
            const hit = document.elementFromPoint(x, y);
            if (hit && !tabbar.contains(hit)) {
              hitBad++;
              hitWho.push((c.id || c.className) + '→' + (hit.id || hit.className || hit.tagName).toString().slice(0, 20));
            }
          }
        }

        return {
          frameH: app.getBoundingClientRect().height / sc,
          relw: F(relw), tabbar: F(tabbar), panel: F(panel), pcb: F(pcb),
          pcbVisible: getComputedStyle(pcb).visibility !== 'hidden' && pcb.getBoundingClientRect().height > 0,
          scale: getComputedStyle(panel).transform,
          items, cells,
          hitBad, hitWho: hitWho.slice(0, 3), hitTotal: tabbar.children.length * 5,
          basin: F(relw.querySelector('.rw-basin')),
          errs: []
        };
      });

      ck(`[${H}] frameH 실측`, Math.abs(r.frameH - H) <= 1, `${r.frameH.toFixed(1)}`);

      /* ① .rw-* 전체 × 탭바 교차 0 */
      let worst = 0, worstCls = '';
      for (const it of r.items) {
        if (!it.vis) continue;
        const a = inter(it.bb, r.tabbar);
        if (a > worst) { worst = a; worstCls = it.cls; }
      }
      ck(`[${H}] ① .rw-* × #tabbar 교차 넓이 0`, worst < 1,
        worst < 1 ? `요소 ${r.items.length}개 전부 0` : `최대 ${worst.toFixed(0)}px² (${worstCls})`);

      /* ② 탭바 5칸 개별 */
      let cellWorst = 0, cellName = '';
      for (const c of r.cells) {
        for (const it of r.items) {
          if (!it.vis) continue;
          const a = inter(it.bb, c.bb);
          if (a > cellWorst) { cellWorst = a; cellName = c.id + ' ← ' + it.cls; }
        }
      }
      ck(`[${H}] ② 탭바 ${r.cells.length}칸 개별 가림 0`, cellWorst < 1,
        cellWorst < 1 ? `5칸 전부 0` : `최대 ${cellWorst.toFixed(0)}px² (${cellName})`);

      /* ⑥ 히트테스트 — «실제로 눌리는가» */
      ck(`[${H}] ⑥ 탭바 히트테스트 ${r.hitTotal}점 전부 탭바 자신`, r.hitBad === 0,
        r.hitBad === 0 ? `0/${r.hitTotal} 가림` : `${r.hitBad}/${r.hitTotal} 가림 (${r.hitWho.join(' ')})`);

      /* ④ 패널 하변이 #relw 하변 안 */
      ck(`[${H}] ④ 패널 하변 ≤ #relw 하변`, r.panel.bottom <= r.relw.bottom + 0.6,
        `panel.bottom ${r.panel.bottom.toFixed(1)} vs relw.bottom ${r.relw.bottom.toFixed(1)} (여유 ${(r.relw.bottom - r.panel.bottom).toFixed(1)}px)`);

      /* ⑤ 재화 바(.pcb)는 #relw 밖(top:-104)이라 overflow:hidden 이면 죽는다 */
      ck(`[${H}] ⑤ .pcb 재화 바 살아 있음(높이>0 · #relw 위쪽 밖)`,
        r.pcbVisible && r.pcb.height > 100 && r.pcb.top < r.relw.top + 1,
        `pcb ${r.pcb.width.toFixed(0)}×${r.pcb.height.toFixed(0)} @top ${r.pcb.top.toFixed(0)} (relw.top ${r.relw.top.toFixed(0)})`);

      /* ③ 2280 회귀 — 측정표 규격 그대로 */
      if (H === 2280) {
        ck('[2280] ③ 패널 스케일 = 1 (변환 없음)',
          r.scale === 'none' || r.scale === 'matrix(1, 0, 0, 1, 0, 0)', r.scale);
        ck('[2280] ③ 패널 bbox 1080×1527 @ 프레임 y370',
          Math.abs(r.panel.width - 1080) < 0.6 && Math.abs(r.panel.height - 1527) < 0.6 &&
          Math.abs(r.panel.top - 370) < 0.6,
          `${r.panel.width.toFixed(1)}×${r.panel.height.toFixed(1)} @y${r.panel.top.toFixed(1)}`);
        ck('[2280] ③ 수반 400×216 @ 패널상대 340,1173',
          Math.abs(r.basin.width - 400) < 0.6 && Math.abs(r.basin.height - 216) < 0.6 &&
          Math.abs((r.basin.left - r.panel.left) - 340) < 0.6 &&
          Math.abs((r.basin.top - r.panel.top) - 1173) < 0.6,
          `${r.basin.width.toFixed(1)}×${r.basin.height.toFixed(1)} @${(r.basin.left-r.panel.left).toFixed(1)},${(r.basin.top-r.panel.top).toFixed(1)}`);
      } else {
        /* 짧은 프레임에서는 «줄었을» 뿐 가로 중심이 유지돼야 한다(origin top center) */
        const cx = (r.panel.left + r.panel.right) / 2;
        ck(`[${H}] 패널 가로 중심 540 유지(origin top center)`, Math.abs(cx - 540) < 0.6, `${cx.toFixed(1)}`);
        ck(`[${H}] 패널 상변 y370 고정(위로 안 밀림)`, Math.abs(r.panel.top - 370) < 0.6, `${r.panel.top.toFixed(1)}`);
        const want = Math.min(1, (H - 550) / 1527);
        const got = r.panel.height / 1527;
        ck(`[${H}] 스케일 = min(1, (frameH−550)/1527)`, Math.abs(got - want) < 0.004,
          `실측 ${got.toFixed(4)} vs 기대 ${want.toFixed(4)}`);
      }

      ck(`[${H}] 콘솔·런타임 에러 0`, errs.length === 0, errs.slice(0, 2).join(' | ') || '0건');

      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log('');
  if (fail) { bad.forEach(b => console.log('  · ' + b)); console.log(`VERIFY100 ${pass}/${pass + fail} FAIL`); process.exit(1); }
  console.log(`VERIFY100 ${pass}/${pass + fail} PASS`);
})();
