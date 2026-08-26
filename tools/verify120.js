/* 작업 120 게이트 — 89 유물 페이지(#relw)가 «재화 바 밑 ~ 탭바 위» 영역을 **꽉 채우는가**.
   (100 의 게이트는 «탭바를 안 가리는가» 만 봤다 — 그건 verify100.js 가 계속 본다.)

   지시(PROGRESS 120 검증절)를 그대로 항목화한 것:
     ① 패널이 영역 전체다 — x 0~1080 · y 108(41 재화 바 밑) ~ 탭바 상변. 좌우 여백 0.
     ② 배경(.rw-bg)·금색 프레임(.rw-frame)·하단 코너(.rw-fc)가 그 영역 가장자리에 앵커돼 있다.
     ③ **«검은 띠» 픽셀 0** — 픽셀로 확정한다. `#0A0F14` 를 그대로 세면 석벽 최상단(#090C10)이
        ±4 안에 들어와 «멀쩡한 배경» 을 검정으로 오인한다. 그래서 `#relw` 자체 배경만
        센티넬 색(#FF00FF)으로 바꿔 놓고 **영역 안에 그 색이 한 픽셀이라도 보이면 FAIL** 로 한다.
        «패널이 덮지 못한 자리» 를 색으로 직접 잡는 것이라 오탐·미탐이 둘 다 없다.
     ④ 내용 3구획(슬롯 격자 · 수반+코스트 · 안내문 2줄)이 서로 겹치지 않는다.
        (코스트 알약은 «수반 받침 위에 겹치는» 것이 89 설계라 수반과의 겹침만 허용 — 대신
         알약이 수반 구획 bbox 안에 들어오는지를 본다.)
     ⑤ 잘림 0 — 모든 내용 요소가 패널 안에 들어온다(패널은 overflow:hidden 이라 넘치면 잘린다).
     ⑥ 여백은 «구획 사이» 에만 있고 전부 양수다 — 가용이 짧아질수록 네 여백이 **같은 비율로**
        줄어드는가(레퍼런스 320:337:23:27). 짧은 프레임에서 여백이 음수(=겹침)로 뒤집히지 않는지.
     ⑦ 89 측정 규격 불변 — 슬롯 151² · 수반 400×216 · 코스트 278×53 · 가로 중심 540.
     ⑧ 탭바 5칸 히트테스트 25/25 회귀(100 이 잡은 «탭이 안 눌림» 이 되살아나지 않는지).

   실행: node tools/verify120.js       → 마지막 줄 VERIFY120 n/n PASS
*/
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const HEIGHTS = [1600, 1920, 2280, 2600];
/* 여백 배분 비율(4회차). 레퍼런스 그대로(320:337:23:27)면 격자↔수반이 2280 에서 559px 로
   슬롯 블록(516)보다 커져 수반+안내문이 하단에 붙은 채 떠 보인다 — 비평 G·J·K 3인 공통 지적.
   큰 간극을 눌러 하단으로 돌렸다. 단 «수반↔안내문»(gap2)은 레퍼런스 비율 그대로 둔다 —
   3회차에 그걸 키웠더니 비평 L 이 «안내문만 떨어져 나온다»(+147%)로 지적했다.
   K(하단 여백을 키워라)와 L(안내문을 수반에 붙여라)이 갈리는 지점이라 «큰 간극 → 하단» 만 옮긴다.
   2280 실측 595/422/38/117 — 격자↔수반:하단 = 570:50(12:1) → 422:117(3.6:1). */
const GAP_W = [0.5075, 0.3600, 0.0325, 0.1000];

let pass = 0, fail = 0;
const bad = [];
function ck(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { fail++; bad.push(name + (detail ? '  — ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}
const inter = (a, b) => {
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return (w > 0 && h > 0) ? w * h : 0;
};

(async () => {
  const browser = await launch(chromium);
  try {
    for (const H of HEIGHTS) {
      console.log(`\n[frameH ${H}]`);
      /* 뷰포트를 1080×H 로 잡으면 fit() 스케일이 1 이라 프레임 좌표 = 픽셀 좌표다
         (③ 픽셀 검사에서 리샘플 오차가 안 생긴다). */
      const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(URL);
      await page.waitForTimeout(700);

      const r = await page.evaluate(async () => {
        RELICS.forEach((x, i) => { S.own[x.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
        S.relic = 99999;
        openRelw();
        void document.body.offsetHeight;
        /* 60 쥬시 오픈 팝인이 도는 경로(탭 클릭)로 들어오면 수축 프레임을 재게 된다 —
           이 게이트는 openRelw() 직접 호출이라 애니메이션이 안 붙지만, 다음 세션이 경로를
           바꿔도 조용히 틀린 값을 재지 않도록 기하가 멈출 때까지 기다린다(cap120 과 같은 처방). */
        {
          const sig = () => [...document.querySelectorAll('#relw .rw-c')]
            .map(e => { const q = e.getBoundingClientRect();
              return `${q.left.toFixed(2)},${q.top.toFixed(2)},${q.width.toFixed(2)}`; }).join('|');
          const wait = ms => new Promise(r => setTimeout(r, ms));
          let prev = '', same = 0, waited = 0;
          while (waited < 4000) {
            await wait(60); waited += 60;
            const s = sig();
            same = (s === prev && s !== '') ? same + 1 : 0;
            prev = s;
            if (same >= 3) break;
          }
        }
        const app = document.getElementById('app'), ar = app.getBoundingClientRect(), sc = ar.width / 1080;
        const F = el => { const q = el.getBoundingClientRect();
          return { l: (q.left - ar.left) / sc, t: (q.top - ar.top) / sc,
                   r: (q.right - ar.left) / sc, b: (q.bottom - ar.top) / sc,
                   w: q.width / sc, h: q.height / sc }; };
        const relw = document.getElementById('relw');
        const tabbar = document.getElementById('tabbar');
        const q = s => F(relw.querySelector(s));

        let hitBad = 0; const hitWho = [];
        for (const c of tabbar.children) {
          const g = c.getBoundingClientRect();
          for (const [x, y] of [[g.left + g.width / 2, g.top + g.height / 2],
                                [g.left + 5, g.top + 5], [g.right - 5, g.top + 5],
                                [g.left + 5, g.bottom - 5], [g.right - 5, g.bottom - 5]]) {
            const hit = document.elementFromPoint(x, y);
            if (hit && !tabbar.contains(hit)) { hitBad++; hitWho.push((hit.id || hit.className || hit.tagName).toString().slice(0, 18)); }
          }
        }
        return {
          scale: sc, frameH: ar.height / sc,
          tabTop: F(tabbar).t,
          panel: q('.rw-panel'), bg: q('.rw-bg'), frame: q('.rw-frame'),
          fcbl: q('.rw-fc.bl'), fcbr: q('.rw-fc.br'),
          grid: q('.rw-grid'), mid: q('.rw-mid'), basin: q('.rw-basin'), cost: q('.rw-cost'), cap: q('.rw-cap'),
          slots: [...relw.querySelectorAll('.rw-c')].map(F),
          labels: [...relw.querySelectorAll('.rw-c>u')].map(F),
          rwc: parseFloat(getComputedStyle(relw).getPropertyValue('--rwc')) || 0,
          hitBad, hitWho: hitWho.slice(0, 3),
        };
      });

      const P = r.panel, regTop = 108, regBot = H - 180;
      ck(`[${H}] ① 패널 = 영역 전체 (0,${regTop})~(1080,${regBot})`,
        Math.abs(P.l) < 0.6 && Math.abs(P.r - 1080) < 0.6 &&
        Math.abs(P.t - regTop) < 0.6 && Math.abs(P.b - regBot) < 0.6,
        `${P.w.toFixed(1)}×${P.h.toFixed(1)} @y${P.t.toFixed(1)}..${P.b.toFixed(1)} (탭바 상변 ${r.tabTop.toFixed(1)})`);

      ck(`[${H}] ② 배경 .rw-bg = 패널 전체 (inset 0)`,
        Math.abs(r.bg.l - P.l) < 0.6 && Math.abs(r.bg.r - P.r) < 0.6 &&
        Math.abs(r.bg.t - P.t) < 0.6 && Math.abs(r.bg.b - P.b) < 0.6,
        `${r.bg.w.toFixed(1)}×${r.bg.h.toFixed(1)}`);
      ck(`[${H}] ② 금색 프레임 .rw-frame = 패널 가장자리 (inset 2)`,
        Math.abs(r.frame.l - P.l - 2) < 0.6 && Math.abs(P.r - r.frame.r - 2) < 0.6 &&
        Math.abs(r.frame.t - P.t - 2) < 0.6 && Math.abs(P.b - r.frame.b - 2) < 0.6,
        `${r.frame.w.toFixed(1)}×${r.frame.h.toFixed(1)}`);
      ck(`[${H}] ② 하단 코너 브래킷 2개가 패널 하변에 붙음`,
        Math.abs(P.b - r.fcbl.b - 3) < 0.6 && Math.abs(P.b - r.fcbr.b - 3) < 0.6,
        `bl ${(P.b - r.fcbl.b).toFixed(1)}px · br ${(P.b - r.fcbr.b).toFixed(1)}px`);

      /* ③ 픽셀 — #relw 배경만 센티넬로 바꾸고 «영역 안에 그 색이 보이는가» */
      await page.evaluate(() => { document.getElementById('relw').style.background = '#FF00FF'; });
      await page.waitForTimeout(80);
      const shot = await page.screenshot({ clip: { x: 0, y: regTop, width: 1080, height: regBot - regTop } });
      const px = await page.evaluate(async (dataUrl) => {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = dataUrl; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0, first = null;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 200) {
            n++;
            if (!first) { const p = i / 4; first = [p % c.width, Math.floor(p / c.width)]; }
          }
        }
        return { n, total: c.width * c.height, first, w: c.width, h: c.height };
      }, 'data:image/png;base64,' + shot.toString('base64'));
      ck(`[${H}] ③ 영역에 «패널이 못 덮은» 픽셀 0 (센티넬 #FF00FF)`,
        px.n === 0,
        px.n === 0 ? `${px.w}×${px.h} = ${px.total.toLocaleString()}px 전부 덮임`
                   : `${px.n}px 노출 (첫 위치 ${px.first && px.first.join(',')})`);
      await page.evaluate(() => { document.getElementById('relw').style.background = ''; });

      /* ④ 3구획 상호 겹침 0 */
      ck(`[${H}] ④ 격자 × 수반구획 겹침 0`, inter(r.grid, r.mid) === 0,
        `격자 하변 ${r.grid.b.toFixed(1)} → 수반 상변 ${r.mid.t.toFixed(1)}`);
      ck(`[${H}] ④ 수반구획 × 안내문 겹침 0`, inter(r.mid, r.cap) === 0,
        `수반 하변 ${r.mid.b.toFixed(1)} → 안내문 상변 ${r.cap.t.toFixed(1)}`);
      ck(`[${H}] ④ 격자 × 안내문 겹침 0`, inter(r.grid, r.cap) === 0, '');
      ck(`[${H}] ④ 코스트 알약이 수반 구획 안 (89 설계 = 받침 위 겹침)`,
        r.cost.l >= r.mid.l - 0.6 && r.cost.r <= r.mid.r + 0.6 &&
        r.cost.t >= r.mid.t - 0.6 && r.cost.b <= r.mid.b + 0.6,
        `cost ${r.cost.l.toFixed(1)}..${r.cost.r.toFixed(1)} / ${r.cost.t.toFixed(1)}..${r.cost.b.toFixed(1)}`);

      /* ⑤ 잘림 0 — 라벨(슬롯 밖으로 나가는 Lv.NN)까지 포함 */
      const all = [...r.slots, ...r.labels, r.basin, r.cost, r.cap, r.grid, r.mid];
      const out = all.find(e => e.t < P.t - 0.6 || e.b > P.b + 0.6 || e.l < P.l - 0.6 || e.r > P.r + 0.6);
      ck(`[${H}] ⑤ 내용 ${all.length}개 전부 패널 안 (잘림 0)`, !out,
        out ? `이탈 ${out.l.toFixed(1)},${out.t.toFixed(1)}~${out.r.toFixed(1)},${out.b.toFixed(1)}` : '이탈 0');

      /* ⑥ 네 여백 전부 양수 + 레퍼런스 비율 */
      const gaps = [r.grid.t - P.t, r.mid.t - r.grid.b, r.cap.t - r.mid.b, P.b - r.cap.b];
      const spare = P.h - 820;
      ck(`[${H}] ⑥ 여백 4곳 전부 양수 (구획 겹침 0)`, gaps.every(g => g > 0.5),
        gaps.map(g => g.toFixed(1)).join(' / '));
      const wantG = GAP_W.map(w => spare * w);
      const gErr = Math.max(...gaps.map((g, i) => Math.abs(g - wantG[i])));
      ck(`[${H}] ⑥ 여백이 레퍼런스 비율(320:337:23:27)대로 배분`, gErr < 1.0,
        `실측 ${gaps.map(g => g.toFixed(1)).join('/')} vs 기대 ${wantG.map(g => g.toFixed(1)).join('/')} (최대 Δ${gErr.toFixed(2)})`);

      /* ⑦ 89 측정 규격 불변 */
      ck(`[${H}] ⑦ --rwc = 1 (내용 균일 축소 미발동)`, Math.abs(r.rwc - 1) < 1e-4, `${r.rwc}`);
      const sizeBad = r.slots.find(s => Math.abs(s.w - 151) > 0.6 || Math.abs(s.h - 151) > 0.6);
      ck(`[${H}] ⑦ 슬롯 10칸 전부 151×151`, r.slots.length === 10 && !sizeBad,
        sizeBad ? `${sizeBad.w.toFixed(1)}×${sizeBad.h.toFixed(1)}` : `10칸 OK`);
      ck(`[${H}] ⑦ 수반 400×216 · 코스트 278×53 · 가로 중심 540`,
        Math.abs(r.basin.w - 400) < 0.6 && Math.abs(r.basin.h - 216) < 0.6 &&
        Math.abs(r.cost.w - 278) < 0.6 && Math.abs(r.cost.h - 53) < 0.6 &&
        Math.abs((r.basin.l + r.basin.r) / 2 - 540) < 0.6,
        `수반 ${r.basin.w.toFixed(1)}×${r.basin.h.toFixed(1)} · 코스트 ${r.cost.w.toFixed(1)}×${r.cost.h.toFixed(1)}`);

      /* ⑧ 탭바 히트테스트 회귀 */
      ck(`[${H}] ⑧ 탭바 25점 히트테스트 전부 탭바 자신`, r.hitBad === 0,
        r.hitBad === 0 ? '0/25 가림' : `${r.hitBad}/25 가림 (${r.hitWho.join(' ')})`);

      ck(`[${H}] 콘솔·런타임 에러 0`, errs.length === 0, errs.slice(0, 2).join(' | ') || '0건');
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log('');
  if (fail) { bad.forEach(b => console.log('  · ' + b)); console.log(`VERIFY120 ${pass}/${pass + fail} FAIL`); process.exit(1); }
  console.log(`VERIFY120 ${pass}/${pass + fail} PASS`);
})();
