/* 작업 100 게이트 — 89 유물 페이지(#relw)가 하단 탭바(#tabbar)를 가리지 않는지.
   원인: `.rw-panel` 이 2280 기준 절대 높이 1527 로 고정돼 있어 세로가 짧은 프레임에서
   `#relw`(top:104 / bottom:180) 밖으로 넘치고, z-index 28 > 탭바 10 이라 탭바 위에 그려졌다.

   검사(지시서 100 ②·검증절):
     ① 프레임 1600 · 1920 · 2280 각각에서 `#relw.on` 상태의 모든 `.rw-*` 요소 bbox 가
        `#tabbar` bbox 와 **교차 넓이 0** 인가.
     ② 탭바 5칸이 각각 하나도 가려지지 않는가(칸별 교차 넓이 0).
     ③ **작업 120 으로 교체됨** — 100 은 «절대 높이 1527 패널» 을 균일 축소해 침범만 막았고,
        그 결과 남던 검은 띠를 120 이 «패널을 가용 영역에 앵커» 하는 방식으로 없앴다.
        그래서 여기의 «스케일 = min(1, avail/1527)» · «패널 1080×1527 @y370» 회귀 검사는
        더 이상 참이 아니다. 대신 **패널이 영역(재화 바 밑 ~ 탭바 위)을 정확히 덮는가** 를 본다.
        89 측정 규격 중 «내용» 쪽(슬롯 151·행 피치 176·수반 400×216)은 그대로이므로 여기서 계속 지킨다.
        영역 채움·검은 픽셀 0 은 `tools/verify120.js` 가 본다.
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
const HEIGHTS = [1600, 1920, 2280, 2600];   /* frameH clamp 하한 · 9:16 · 9:19 기준 · clamp 상한 */
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

        /* 120 — 89 측정 규격(슬롯 151² · 행 피치 176 · 3·4·3)이 프레임 높이와 무관하게 불변인가 */
        let slotBad = '';
        {
          const cs = [...relw.querySelectorAll('.rw-c')].map(F);
          if (cs.length !== 10) slotBad = `슬롯 ${cs.length}개(10 이어야)`;
          else {
            const off = cs.find(c => Math.abs(c.width - 151) > 0.6 || Math.abs(c.height - 151) > 0.6);
            if (off) slotBad = `크기 ${off.width.toFixed(1)}×${off.height.toFixed(1)}`;
            else {
              /* 89 원본 RW_POS 의 행 y 는 320/496/671 이라 피치가 176/175 로 1px 다르다
                 (측정표 «피치 176» 은 79×2.2222=175.55 의 반올림). 120 은 격자 기준으로
                 0/176/351 로 옮겼을 뿐이라 이 1px 비대칭이 그대로 유지돼야 한다. */
              const rows = [cs[0].top, cs[3].top, cs[7].top];
              if (Math.abs((rows[1] - rows[0]) - 176) > 0.6 || Math.abs((rows[2] - rows[1]) - 175) > 0.6)
                slotBad = `행 피치 ${(rows[1]-rows[0]).toFixed(1)}/${(rows[2]-rows[1]).toFixed(1)} (176/175 이어야)`;
            }
          }
        }

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
          rwc: parseFloat(getComputedStyle(relw).getPropertyValue('--rwc')) || 0,
          slotBad,
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

      /* ③ 120 — 패널은 «재화 바 밑(y108) ~ 탭바 상변» 을 정확히 덮는다(가로 0~1080) */
      ck(`[${H}] ③ 패널 = 영역 전체 (x0~1080 · y108~탭바상변 ${H - 180})`,
        Math.abs(r.panel.left) < 0.6 && Math.abs(r.panel.right - 1080) < 0.6 &&
        Math.abs(r.panel.top - 108) < 0.6 && Math.abs(r.panel.bottom - r.tabbar.top) < 0.6,
        `${r.panel.width.toFixed(1)}×${r.panel.height.toFixed(1)} @y${r.panel.top.toFixed(1)}..${r.panel.bottom.toFixed(1)}`);
      /* 89 측정 규격 중 «내용» 은 프레임 높이와 무관하게 불변이어야 한다(--rwc 는 1600~2600 에서 1) */
      ck(`[${H}] ③ 내용 균일 축소 없음 (--rwc = 1)`, Math.abs(r.rwc - 1) < 1e-4, `${r.rwc}`);
      ck(`[${H}] ③ 수반 400×216 · 가로 중심 540 (89 측정 규격 불변)`,
        Math.abs(r.basin.width - 400) < 0.6 && Math.abs(r.basin.height - 216) < 0.6 &&
        Math.abs((r.basin.left + r.basin.right) / 2 - 540) < 0.6,
        `${r.basin.width.toFixed(1)}×${r.basin.height.toFixed(1)} @cx${((r.basin.left+r.basin.right)/2).toFixed(1)}`);
      ck(`[${H}] ③ 슬롯 151×151 ×10 · 행 피치 176 (89 측정 규격 불변)`,
        r.slotBad === '', r.slotBad || `10칸 전부 151×151 · 피치 176`);

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
