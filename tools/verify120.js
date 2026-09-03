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
const GAP_W = [0.5075, 0.8675];   /* 상(격자 top) · 누적(수반 top) — gap1 = GAP_W[1]×spare − gap0 */
const GAP2_PX = 38;               /* 수반↔안내문 — 비례가 아니라 고정 */
/* 11회차 ② — 상인방 위 스트립 300px 클램프(PROGRESS 120 «남은 문제» ②).
   상인방은 격자 위 300px 이므로 «스트립 = 격자 top − 300» 이고, 격자 top 을 600 으로 묶으면
   스트립이 300 을 못 넘는다. 2280 은 594.8 이라 불변이고 2600 만 757.2 → 600 으로 내려온다.
   회수분 157.2px 은 gap1(받침↔수반 구간)으로 흘러 ①의 바닥면·③의 계단이 채운다. */
/* 18회차 [L] — GT_MAX(460 고정 클램프)를 폐기하고 **레퍼런스 비 1:3.797** 로 갈았다.
   아래 `wantGt()` 가 새 규칙이다. 옛 상수는 «어디서 왔는지» 를 남겨 두려고 주석으로만 보존한다. */
const AB_RATIO = 3.797;   /* 아치 위:아래 = ref 133:505 (패널 환산 1080×1527) */
/* 18회차 [L] — 스트립 상한 160 → **190**. 14회차가 160 으로 내린 근거는 «2280 288px · 2600 293px 가
   평균 휘도 29.6 · 66.6%가 32 미만 = 육안으로 검은 띠» 였는데, 12회차 이후 벽 결이 들어와
   **그 전제가 더는 참이 아니다**. r18 실측(2600 프레임 y112~232): 행별 고유색 330~378 ·
   행 std 15.9~16.3 · 평균 휘도 32.7~36.6. [L] 이 만드는 최대치는 2600 의 182.8px 이라
   «띠» 라 불린 288~293 의 63% 다. 상한은 남겨 둔다 — 규칙이 다시 풀리면 잡아야 하므로. */
const LINTEL_STRIP_MAX = 190;
const GT_FLOOR = 232;             /* 813 2회차 [E2] — 격자 상변의 «벽 하한» (아래 주석) */
/* 12회차 — 하단 여백을 «패널 바닥에서» 역산하고 clamp 로 묶었다(비평 AB ⑥·AC ⑥: 26 → 159px, 6.1배).
   1920·2280 은 clamp 안쪽이라 불변이고, 1600 만 하한 34 · 2600 만 상한 120 에 걸린다. */
const G3_MIN = 44, G3_MAX = 104;   /* 14회차 — 안내문 위 41px 고정과의 역전 해소
   ⚠ 813 1회차가 754 의 [❌] 를 닫으려 50 으로 올렸다가 **되돌렸다** — 그 쌍은 가로 겹침 0px 의
     유령이고(index.html `--rw-g3` 주석 ⓐ), 올리는 방향이 레퍼런스와 반대다(비평 CF·CG ⓑ). */
const STEP_PITCH = 84;                 /* 단 면 높이 — 네 프레임 전부 동일 */
/* 13회차 — 폭을 짝수로 바꿔 중심이 정확히 540 에 떨어지게 했다(비평 AD ⑨·AE ⑦: 세로 축 산포 2.5px) */
const STEP_W = [842, 810, 778, 746, 714, 682, 650, 618];   /* 14회차 — 5단 → 8단 · Δ32 */
const PLINTH_OFF = 40;                 /* 받침 밑동 = 바닥선 + 40 (구간이 그보다 얕으면 구간 전체) */

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
          grid: q('.rw-grid'), mid: q('.rw-mid'), floor: q('.rw-floor'), basin: q('.rw-basin'), cost: q('.rw-cost'), cap: q('.rw-cap'),
          lintel: q('.rw-lintel'), ground: q('.rw-ground'), steps: q('.rw-steps'),
          floorEl: q('.rw-floor'),
          sts: [...relw.querySelectorAll('.rw-steps>.rw-st')].map(F),
          st1: q('.rw-st1'),
          slots: [...relw.querySelectorAll('.rw-c')].map(F),
          labels: [...relw.querySelectorAll('.rw-c>u')].map(F),
          /* 16회차 — 아치 개구는 `.rw-bg::after` 라 rect 가 없다. 계산된 width/height 를 직접 읽는다.
             비평가 4명(AH ⑦ · AI ④ · AJ ① · AK ①)이 두 회차에 걸쳐 «1600 만 아치가 눌렸다» 를
             각자 화소로 쟀는데, 게이트에는 아치 «크기» 를 보는 항목이 하나도 없었다. */
          /* 19회차 [O] — 중심축. 아치·받침은 `left:50%` + `translateX(-50%)` 이므로
             **시각 중심 = computed left**(translateX 가 폭의 절반을 되돌린다). 패널 중심과 맞아야 한다. */
          archCx: parseFloat(getComputedStyle(document.querySelector('.rw-bg'), '::after').left),
          plinthCx: parseFloat(getComputedStyle(document.querySelector('.rw-floor'), '::before').left),
          archW: parseFloat(getComputedStyle(document.querySelector('.rw-bg'), '::after').width) / sc,
          archH: parseFloat(getComputedStyle(document.querySelector('.rw-bg'), '::after').height) / sc,
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
      /* 6회차 — 아치 «발»(= 바닥선 .rw-floor 상단)이 수반 구획을 파고들면 안 된다.
         1600 에서 격자↔수반 간극(177)이 아치가 격자 아래로 내려오는 깊이(186)보다 작아
         바닥선이 수반 림을 9px 가로질렀다(비평 R). 아치 높이를 min() 으로 클램프해 고쳤고,
         여기서 회귀를 막는다. */
      ck(`[${H}] ④ 바닥선(아치 발)이 수반 구획 위에 (클리어런스 ≥ 20px)`,
        r.mid.t - r.floor.t >= 20,
        `바닥선 ${r.floor.t.toFixed(1)} → 수반 ${r.mid.t.toFixed(1)} = ${(r.mid.t - r.floor.t).toFixed(1)}px`);
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
      /* gap2(수반↔안내문)는 **고정 38px** 이다 — 비례로 키우면 프레임이 길어질수록
         안내문이 수반에서 떨어져 «한 덩어리» 로 안 읽힌다(비평 L +147% · N +43%).
         나머지 3곳만 남는 높이를 비례 배분하고, 하단은 그 나머지를 받는다. */
      /* 13회차 — 세로 예산을 «아치를 가운데 두고» 푼다(위 av 주석과 같은 식).
           T  = 수반 top − 격자 하단     av = min(186, (T − 219) / 2)
           gt = clamp(av + 82,  min(spare × .5075, 600),  T − av − 137) */
      const g3 = Math.min(Math.max(spare * 0.1325 - 38, G3_MIN), G3_MAX);
      const bt = P.h - 88 - g3 - 38 - 216;          /* 수반 구획 상변(패널 기준) */
      const T = bt - 516;
      /* 16회차 — «아래 최소» 137 → 80 (받침 40 + 접합선 띠 13 + 바닥 27). 계단 최소 1단 84 를 뺐다.
         따라서 av 상한식의 231(=94+137) → 174(=94+80). 1600 만 이 상한에 걸리므로 1600 만 움직인다.
         ⚠ 아래 gt 의 셋째 인자는 **137 그대로다** — 그쪽은 «아래에 이만큼 예약하라» 는 하한이라
            낮추면 gt 가 위로 올라갈 여지를 얻어 바닥을 되레 빼앗는다(1920 이 1단 → 0단이 됐다). */
      const av = Math.min(186, (T - 174) / 2);
      /* ── 18회차 [L] — gt 를 «클램프 두 개» 가 아니라 **레퍼런스 비 하나**로 푼다. ──
         A(아치 위) : B(아치 아래) = ref 133 : 505 = 1 : 3.797 을 프레임 무관 상수로 놓는다.
           A + B = P − 516 − 2·av = spare + 304 − 2·av      ⟹  gt = (A+B)/(1+3.797) + av
         하한 `av+94`(상인방 온전 + 금테 회피)와 상한 `T−av−137`(아래 예약)은 그대로 지킨다 —
         1600 은 그 하한이 규칙보다 크게 나오므로 **1600 만 규칙이 안 먹는다**(13·16회차가 확정한
         «1600 은 예산이 없다» 자리). 나머지 세 프레임은 A:B 가 정확히 1:3.80 으로 붙는다. */
      const gtRule = (spare + 304 - 2 * av) / (1 + AB_RATIO) + av;
      /* 813 2회차 [E2] 이관 — **`GT_FLOOR` 신설.** 754 6회차의 [❌] `.rw-lintel ↓ #rwMulBar`
         (1600 13.8 vs 기준 114.3 = 12.1%)의 기계는 «벽이 아치를 따라간다» 였다 —
         하한이 `av + 94` 뿐이라 벽 = gt − 20 − 66 = av + 8 이 되고, 바 98 을 넣고 남는 여유를
         반씩 나눠 13.8/13.8 이 된다. ⇒ 바가 요구하는 만큼을 직접 예약한다:
           232 = 20(금테) + 66(상인방) + 24(들보↔바) + 98(바) + 24(바↔격자) */
      const gt = Math.max(av + 94, GT_FLOOR, Math.min(gtRule, T - av - 137));
      /* 813 2회차 [E4] 이관 — **아래 블록(38 + g3)의 총량은 그대로 두고 ref 비로 나눈다.**
         12회차가 «gap2 = 38 고정» 을 세운 근거는 «비례로 키우면 안내문이 수반에서 떨어져
         한 덩어리로 안 읽힌다»(비평 L·N) 였는데, 813 1회차 비평 2인(CF·CG)이 **독립으로
         레퍼런스를 재** «위 31~38 : 아래 18~23» = 아래/위 **0.58~0.62** 라고 냈다 —
         레퍼런스의 안내문은 수반의 캡션이 아니라 **패널 하변에 붙은 푸터**다. 우리 값은
         1.16 → 2.74 로 방향이 반대이고 아래만 2.4배 진동했다. 더 직접적인 증거가 이기므로
         38 고정을 **총량 고정**으로 바꾼다(총량을 줄이면 그 세로가 곧장 E 로 흘러 1순위
         결함을 키운다 — 813 1회차 §3 이 스윕으로 확인한 자리라 총량은 한 픽셀도 안 건드린다). */
      const iGap = Math.max(32, (GAP2_PX + g3) * 0.375);
      const wantG = [gt, T - gt, GAP2_PX + g3 - iGap, iGap];
      const gErr = Math.max(...gaps.map((g, i) => Math.abs(g - wantG[i])));
      ck(`[${H}] ⑥ 여백이 «아치 위:아래 = ref 1:3.797 + 벽 하한 232 + 안내문 ref 비» 배분 규칙대로`, gErr < 1.0,
        `실측 ${gaps.map(g => g.toFixed(1)).join('/')} vs 기대 ${wantG.map(g => g.toFixed(1)).join('/')} (최대 Δ${gErr.toFixed(2)})`);
      /* [L1] 규칙이 «실제로 상수인가» 를 결과에서 되잰다 — 위 항목은 식을 다시 쓴 것이라
         식과 코드가 함께 틀리면 둘 다 통과한다. 이건 렌더 결과의 A:B 를 직접 나눈다.
         1600 은 하한이 이겨 규칙 밖이므로 «규칙이 먹은 프레임» 에서만 잰다. */
      const A = gaps[0] - av, B = P.h - gaps[0] - 516 - av;
      const ruleBinds = Math.abs(gt - gtRule) < 0.6;
      ck(`[${H}] ⑥ A:B ${ruleBinds ? '= 1:3.797 (규칙 적용)' : '— 하한이 이김(1600 예산 없음)'}`,
        ruleBinds ? Math.abs(B / A - AB_RATIO) < 0.02 : gt <= gtRule + 0.6,
        `A ${A.toFixed(1)} : B ${B.toFixed(1)} = 1:${(B / A).toFixed(3)}`);
      /* ── 16회차 신설 — ② 아치 종횡비. ──
         «개구 588×888 고정» 은 사양인데, 짧은 프레임에서는 예산이 없어 다리를 누른다(6회차부터).
         누르는 것 자체는 허용하되 **어디까지** 눌러도 되는지에 자가 없어서, 1600 이 1:1.15 까지
         납작해진 것을 세 회차 동안 아무도 못 잡았다(비평가 4명이 두 회차에 걸쳐 각자 쟀다).
         폭은 4장 공통 589 고정이므로 높이만 보면 된다. */
      /* ── 19회차 [O] — **중심축 하나.** 비평가 6명이 회차를 넘어 짚은 자리다.
         DOM 은 전부 540.0 인데 `left` 를 px 로 박은 아치(244+589/2)·받침(230+617/2)만 **538.5** 였다.
         음성 대조: `left:244px`(transform 없음)로 되돌리면 네 프레임 전부 FAIL 한다(153 → 149).
         ⚠ 그때 출력에 찍히는 «아치 244.0» 은 **시각 중심이 아니라 raw left** 다 — 실제 시각 중심은
            244 + 589/2 = 538.5 이고, «시각 중심 = computed left» 는 translateX 가 있을 때만 성립한다.
            항목이 잡아내는 것은 «중심이 540 인가» 가 아니라 «중심을 540 에 앉히는 관용구를 쓰는가» 로,
            둘 다 이 자리에서는 같은 것을 막는다(폭이 홀수라 정수 left 로는 540 에 못 앉으므로). */
      const panelCx = (P.l + P.r) / 2;
      ck(`[${H}] ④ 중심축 1개 — 아치·받침이 패널 중심과 일치 (Δ ≤ 0.6px)`,
        Math.abs(r.archCx - panelCx) < 0.6 && Math.abs(r.plinthCx - panelCx) < 0.6,
        `아치 ${r.archCx.toFixed(1)} · 받침 ${r.plinthCx.toFixed(1)} vs 패널 ${panelCx.toFixed(1)} (옛 값 538.5)`);
      ck(`[${H}] ② 아치 개구 폭 589 고정`, Math.abs(r.archW - 589) < 1.5, `${r.archW.toFixed(1)}px`);
      const archR = r.archH / r.archW;
      ck(`[${H}] ② 아치 종횡비 ≥ 1:1.25 (사양 1:1.51 · 짧은 프레임의 눌림 하한)`,
        archR >= 1.25 - 0.005, `${r.archH.toFixed(1)}×${r.archW.toFixed(1)} = 1:${archR.toFixed(3)}`);
      /* 11회차 ② — «늘어난 높이가 상인방 위 죽은 벽으로 간다» 의 회귀 방지 */
      ck(`[${H}] ② 상인방 위 스트립 ≤ ${LINTEL_STRIP_MAX}px`,
        r.lintel.t - P.t <= LINTEL_STRIP_MAX + 0.6,
        `${(r.lintel.t - P.t).toFixed(1)}px (상인방 상변 ${r.lintel.t.toFixed(1)})`);

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

      /* ── 11·12회차(2차 폴리시 라운드) 신설 게이트 ── */
      /* ① 접합선은 «받침 밑동»(바닥선 + 40, 구간이 얕으면 구간 전체)에 고정 — 프레임 무관 관계.
         11회차엔 «계단 밑변» 에 걸었는데 계단이 아래 앵커로 바뀌며 그 자리가 프레임마다 움직인다. */
      /* 13회차 — 구간이 얕으면 접합선 띠(13px)가 수반 위로 넘어가므로 sh−14 로 한 번 더 묶는다 */
      const wantGd = Math.min(PLINTH_OFF, Math.max(0, (r.mid.t - r.floorEl.t) - 14));
      ck(`[${H}] ① 지면 접합선 = 받침 밑동 (바닥선 +${PLINTH_OFF}, Δ ≤ 1px)`,
        Math.abs(r.ground.t - (r.floorEl.t + wantGd)) < 1.0,
        `접합선 ${r.ground.t.toFixed(1)} vs 바닥선 ${r.floorEl.t.toFixed(1)} + ${wantGd.toFixed(1)}`);
      ck(`[${H}] ① 접합선이 수반 구획 위 · 바닥이 패널 하변까지`,
        r.ground.t <= r.mid.t + 0.6 && Math.abs(r.ground.b - P.b) < 0.6,
        `${r.ground.t.toFixed(1)}..${r.ground.b.toFixed(1)} (수반 ${r.mid.t.toFixed(1)} · 패널 하변 ${P.b.toFixed(1)})`);
      /* ③ 12회차 — 단 «크기» 고정 + 개수로 구간을 채운다. 늘어난 높이가 단을 늘리지 못하게 막는다. */
      /* `overflow:hidden` 은 rect 를 안 줄인다 — 래퍼와 실제로 겹치는 높이로 «보이는» 것을 센다.
         (1600 은 래퍼가 0px 이라 단이 4개 있어도 화면엔 하나도 안 나온다.) */
      const visH = e => Math.min(e.b, r.steps.b) - Math.max(e.t, r.steps.t);
      const vis = r.sts.filter(e => visH(e) > 0.5);
      /* 18회차 — 보이는 단 중 **가장 위**(= 가장 먼) 것. `vis` 는 위→아래 순이다
         (아래 «맨 아래 단 = 842» 가 `ws[ws.length-1]` 를 쓰는 것과 같은 전제). 깊이 감광 검사에 쓴다. */
      const stTop = vis.length >= 2 ? vis[0] : null;
      /* 계단은 접합선 띠(문지방 4 + 그림자 9)를 덮지 않도록 14px 아래에서 시작한다 */
      const wantSt = Math.min(r.ground.t + 14, r.mid.t);
      /* 16회차 — 계단이 «억제» 된 프레임(구간 < 60px)에서는 래퍼 높이가 0 이라 상변이 수반과 같다.
         그 경우는 «접합선 +14 에서 시작» 을 요구하지 않는다 — 애초에 계단이 없다. */
      const stSup = r.steps.h < 0.6;
      /* ── 18회차 [M] — 구간을 «피치 84 의 정수배» 로 자른다. ──
         옛 항목은 «구간 상변 = 접합선 +14» 를 **정확히** 요구했는데, 그러면 구간 높이가
         84 의 배수가 아닌 임의값이 되고 `--rw-n = round(nearest, R/84)` 이 R ∈ [42,126) 을
         전부 1단으로 뭉개 **피치가 42~126 을 오간다**(이번에 1920 123.3 으로 터진 자리).
         새 요구는 두 가지다: ⓐ 구간 상변이 접합선 +14 **아래**(= 접합선을 안 덮는다) ·
         ⓑ 접합선 +14 부터 구간 상변까지의 잔여(민 바닥)가 **한 단 미만**(= 들어갈 단을 안 버렸다). */
      const rem = stSup ? 0 : r.steps.t - wantSt;
      ck(`[${H}] ③ 계단 구간 = 84 정수배 · 접합선 +14 아래 · 잔여 < 84`,
        stSup ? Math.abs(r.steps.b - r.mid.t) < 1.0
              : (rem > -1.0 && rem < STEP_PITCH - 0.001 && Math.abs(r.steps.b - r.mid.t) < 1.0),
        stSup ? `계단 억제(구간 0) · 하변 ${r.steps.b.toFixed(1)} = 수반 ${r.mid.t.toFixed(1)}`
              : `구간 ${r.steps.t.toFixed(1)}..${r.steps.b.toFixed(1)} (h ${r.steps.h.toFixed(1)} = 84×${(r.steps.h / 84).toFixed(2)}) · 접합선+14 ${wantSt.toFixed(1)} · 잔여 ${rem.toFixed(1)}`);
      if (vis.length) {
        /* ── 15회차 — **이 항목이 «머리 잘린 단» 을 놓쳤다.** ──
           14회차가 단 수를 8 로 늘렸을 때 2600 의 계단 구간은 650px, 피치는 84 고정이라
           맨 위 단이 84 를 못 채우고 `overflow:hidden` 에 **위쪽 22px** 이 잘렸다. 하필 잘리는
           쪽에 나이징(코 하이라이트 4 + 그 밑 그림자 5)이 있어 «디딤면 없는 62px 민짜 띠» 가
           됐는데, 이 자리는 **120/120 PASS** 였다 — 위 `e.h` 가 **DOM rect 의 height** 라
           8칸 전부 84.0 으로 답했기 때문이다. 잘린 뒤 «보이는» 높이가 아니다.
           비평 AH ⑤(«나이징 7개») · AI ⑧(«디딤면 밴드 7개뿐 · 최상단 76px») 2인 공통으로 잡혔다.
           LESSONS 122 «자를 안 댄 곳은 자동으로 무결점» 과 같은 계열이라, 자를 **결과**에 댄다.
           15회차 처방은 «피치를 구간의 정수 등분» 이므로 세 가지를 한꺼번에 못 박는다:
             ⓐ 보이는 높이(`visH`, 잘린 뒤)가 전부 같다 — 머리 잘린 단이 있으면 여기서 깨진다
             ⓑ 그 높이 × 단수 = 구간 (정확히 채운다 — 빈 바닥도, 넘침도 없다)
             ⓒ 피치가 84±3 안 (13회차가 «84 고정» 으로 없앤 ③ 표류의 재발 상한.
                11회차엔 8~71px 로 8.9배 흔들렸다. 실측 83 / 83 / 82.5 / 81.25 = 표류 2.2%)
           ★ ⓑ 가 핵심이다 — ⓐ 만 있으면 «전부 똑같이 잘린» 상태를 통과시킨다. */
        const vh = vis.map(e => visH(e));
        const pitch = vh[0];
        ck(`[${H}] ③ 보이는 단 ${vis.length}개의 «잘린 뒤» 높이가 전부 같다 (DOM rect 아님 — 머리 잘린 단 0)`,
          vh.every(h => Math.abs(h - pitch) < 0.6),
          vh.map(h => h.toFixed(2)).join(' / '));
        ck(`[${H}] ③ 피치 × 단수 = 계단 구간 (Δ ≤ 1px — 빈 바닥도 넘침도 없다)`,
          Math.abs(pitch * vis.length - r.steps.h) < 1.0,
          `${pitch.toFixed(2)} × ${vis.length} = ${(pitch * vis.length).toFixed(2)} vs 구간 ${r.steps.h.toFixed(2)}`);
        ck(`[${H}] ③ 피치가 ${STEP_PITCH}±3px 안 (13회차가 없앤 ③ 표류 재발 방지)`,
          Math.abs(pitch - STEP_PITCH) <= 3.0,
          `${pitch.toFixed(2)}px (기준 ${STEP_PITCH})`);
        /* ── 17회차 — 폭 단언을 «고정 목록» 에서 «관계» 로 바꾼다. ──
           옛 항목은 842·810·…·618 목록 중 하나이기만 하면 통과라, **보이는 단이 적을 때 맨 위가
           대석(617)보다 넓은 것**을 못 봤다(1920 은 단 하나가 842 = 편측 +112px). 비평가 3명이
           각자 짚었다(AJ ⑤ · AL ⑤ · AM ②). 지켜야 할 것은 목록이 아니라 세 가지 관계다:
             ⓐ 맨 위 단 = 아치 대석 617 (실루엣이 문간 안에서 시작한다)
             ⓑ 맨 아래 단 = 842 (단이 2개 이상일 때)
             ⓒ 아래로 갈수록 넓어지고 증분이 균등하다 */
        const ws = vis.map(e => e.w).sort((a, b) => a - b);   /* 좁은 것 = 위 */
        ck(`[${H}] ③ 맨 위 단 = 아치 대석 617 (단 ${vis.length}개)`,
          Math.abs(ws[0] - 617) < 1.5, `${ws[0].toFixed(1)}px`);
        ck(`[${H}] ③ 맨 아래 단 = 842 (단 2개 이상일 때)`,
          vis.length < 2 || Math.abs(ws[ws.length - 1] - 842) < 1.5,
          vis.length < 2 ? `단 1개 — 면제(폭 ${ws[0].toFixed(1)})` : `${ws[ws.length - 1].toFixed(1)}px`);
        const dw = ws.slice(1).map((w, i) => w - ws[i]);
        ck(`[${H}] ③ 증분이 균등 (Δ ≤ 1.5px — 아래로 갈수록 넓어짐)`,
          dw.length === 0 || Math.max(...dw) - Math.min(...dw) < 1.5,
          dw.length ? dw.map(d => d.toFixed(1)).join(' / ') : '단 1개 — 면제');
        /* ★ 11회차 최대 감점원의 회귀 방지 — «맨 아래 단의 밑변 = 수반 상단». 2600 에서 341px 벌어졌다. */
        ck(`[${H}] ③ 맨 아래 단이 수반에 닿는다 (공백 ≤ 1px — 11회차 341px 회귀 방지)`,
          Math.abs(r.st1.b - r.mid.t) < 1.0,
          `단 밑변 ${r.st1.b.toFixed(1)} vs 수반 상단 ${r.mid.t.toFixed(1)} = ${(r.mid.t - r.st1.b).toFixed(1)}px`);
      } else {
        ck(`[${H}] ③ 계단 구간이 ${r.steps.h.toFixed(1)}px — 단 0개(찌그러진 단을 만드느니 안 그린다)`,
          r.steps.h < 2, `${r.steps.h.toFixed(1)}px`);
      }
      /* ② 12회차 — 상인방이 어느 프레임에서도 «있다». 1600 에서 −50.3px 로 통째로 사라졌다. */
      /* 13회차 — 아치 정점은 «격자 top − 186» 이 아니라 «격자 top − av» 다(짧은 프레임에서 아치가 눌린다).
         상인방은 네 프레임 전부 **66px 온전히** 보여야 한다(1600 에서 13px 잘렸다 — AD ⑦·AE ②). */
      const apex = r.grid.t - av;
      ck(`[${H}] ② 상인방 66px 온전 · 패널 안 20px 이상(금테 내측 회피) · 아치 정점 위`,
        r.lintel.t >= P.t + 20 - 0.6 && Math.abs(r.lintel.h - 66) < 0.6 && r.lintel.b <= apex + 0.6,
        `상인방 ${r.lintel.t.toFixed(1)}..${r.lintel.b.toFixed(1)} (h ${r.lintel.h.toFixed(1)}) · 아치 정점 ${apex.toFixed(1)} · 패널 상단 여백 ${(r.lintel.t - P.t).toFixed(1)}`);
      /* 13회차 신설 — «바닥이 실제로 존재한다». 1600 에서 0px 이던 것이 이 게이트다.
         16회차 — 문턱을 «계단 한 단(84)» 이 아니라 **«바닥 27px»** 로 바꾼다. 1600 은 아치 다리에
         84px 을 내주고 계단을 억제했으므로(비평가 4명이 두 회차에 걸쳐 요구한 방향) 계단 한 단을
         요구할 근거가 없어졌다. 지키려는 것은 «수반이 벽지 위에 떠 있지 않다» 이고, 그것은
         접합선 아래에 **면이 실제로 있는가**로 재면 된다. 1600 실측 40px. */
      /* ── 813 2회차 이관 — **문턱 27 → 20.** ──
         27 은 16회차가 «아래 최소 80 = 받침 40 + 접합선 띠 13 + 바닥 27» 을 세우며 **나머지로**
         얻은 수이지 잰 값이 아니다(같은 회차 주석이 «실제 안전 조건은 받침 40 + 띠 13 = 53»
         이라고 스스로 적어 뒀다). 813 2회차가 격자 상변에 «벽 하한 232» 를 놓으면서 1600 의
         이 면이 27 → 20 이 되는데, 그 7px 은 **배수 바(700 이 이 벽에 얹은 부품)의 위·아래
         여백**으로 간다 — 813 1회차 비평 2인이 각자 «바 하변 ↔ 격자 상변 19px 은 격자 행 간
         25~26px 보다 좁아 바가 격자의 0번째 행처럼 읽힌다» 고 낸 자리다.
         ⚠ **문턱만 내리고 끝내면 «바닥이 사라져도 초록» 이 된다** — 그래서 «면이 있는가» 는
           20 으로 재되, 그 위에서 **접합선 띠 13 이 통째로 수반 위에 들어오는가**(= 16회차가
           «실제 안전 조건» 이라고 적은 53)를 짝 항으로 새로 단다. 둘이 같이 있어야
           «바닥이 있다» 가 말이 된다. */
      const floorH = r.mid.t - r.ground.t;
      ck(`[${H}] ③ 바닥(접합선 → 수반)이 실제로 존재한다 (≥ 20px)`,
        floorH >= 20 - 0.6, `${floorH.toFixed(1)}px`);
      ck(`[${H}] ③ 아치 발 ↔ 수반에 «받침 40 + 접합선 띠 13 = 53» 이 들어간다`,
        r.mid.t - r.floor.t >= 53 - 0.6,
        `${(r.mid.t - r.floor.t).toFixed(1)}px (구조적 최소 53)`);

      /* ①③ 픽셀 — «넣긴 넣었는데 안 보이는» 것을 지표만 보고 «넣었다» 고 판단한 것이
         이 작업에서 여섯 번 반복된 실수다(LESSONS 120). 넣은 구조물은 **대비를 직접 잰다**. */
      {
        /* 클립이 뷰포트 y=108 에서 시작하고 fit 스케일이 1 이라 «샷 y = 프레임 y − 108» 이다
           (③ 센티넬 검사와 같은 좌표계). */
        const shot2 = await page.screenshot({ clip: { x: 0, y: regTop, width: 1080, height: regBot - regTop } });
        const m = await page.evaluate(async ({ dataUrl, gy, s1t, s1b, snt }) => {
          const img = new Image();
          await new Promise(res => { img.onload = res; img.src = dataUrl; });
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          const lum = (x, y) => { const i = ((y * c.width + x) << 2); return .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; };
          /* 행 평균 휘도 — 좌우는 비네트가 먹으므로 중앙 폭만, **수반(x340~740)은 빼고** 본다. */
          const row = y => {
            let s = 0, n = 0;
            for (let x = 200; x < 890; x += 3) { if (x >= 336 && x < 744) continue; s += lum(x, y); n++; }
            return s / n;
          };
          const band = (y0, y1) => { let s = 0, n = 0; for (let y = Math.max(1, y0); y < Math.min(c.height - 1, y1); y++) { s += row(y); n++; } return n ? s / n : 0; };
          /* ① 접합선 대비 — 문지방(gy..gy+5) vs **받침보다 위의 벽**(gy−76..gy−60).
             받침은 바닥선 −16~+40 = gy−56..gy 라 그 안을 «위 벽» 으로 재면 밝은 받침을 재게 된다
             (12회차에 실제로 Δ0.0 이 나왔다 — 게이트가 자기 구조물을 벽으로 착각한 것). */
          let peak = 0;
          for (let y = gy - 2; y <= gy + 5; y++) peak = Math.max(peak, row(y));
          const wallAbove = band(gy - 76, gy - 60);
          /* ①-2 접합선 자기 그림자 — 바로 아래 12px 이 그 아래 60px 중 가장 어둡다(부호 정상).
             11회차의 «그림자대 vs 먼 바닥» 은 계단이 바닥을 채우면서 «먼 바닥» 자리가 없어졌다. */
          const shadow = band(gy + 4, gy + 16), below = band(gy + 24, gy + 76);
          /* ③ 디딤면 vs 챌면 — 항상 온전히 보이는 **맨 아래 단** 안에서 */
          const tread = band(s1t + 10, s1t + 21), riser = band(s1t + 27, s1b - 4);
          /* 18회차 — 맨 «위» 단의 같은 자리. 깊이 감광이 실제로 걸려 있으면 여기가 더 어둡다.
             snt < 0 이면 단이 하나뿐인 프레임이라 비교 대상이 없다. */
          const treadTop = snt >= 0 ? band(snt + 10, snt + 21) : -1;
          /* 18회차 [N] — 접합선 «검은 띠» 감시. 문지방 바로 밑 9px 의 행평균 휘도 자체를 잰다.
             위 ①-2 는 «아래보다 어두운가»(부호)만 봐서 L 8.8 짜리 순검정 띠를 통과시켰다. */
          const seamDark = band(gy + 4, gy + 12);
          /* ── 20회차 [Q] — **위 `band()` 는 x336~744 를 빼고 잰다.** 수반을 피하려고 둔 창인데,
             접합선 행에는 수반이 없고 **바로 그 중앙이 가장 어두웠다**(캐스트 그림자가 겹친다).
             18회차에 세운 [N] 항목이 «행평균 31.8» 로 초록불인 동안 x=540 은 **7.1** 이었다 —
             비평 AQ #1 이 그 좌표를 직접 재서야 드러났다. 중앙 띠를 따로 잰다. */
          const centreBand = (y0, y1) => {
            let s = 0, n = 0;
            for (let y = Math.max(1, y0); y < Math.min(c.height - 1, y1); y++)
              for (let x = 440; x < 640; x += 2) { s += lum(x, y); n++; }
            return n ? s / n : 0;
          };
          const seamCentre = centreBand(gy + 4, gy + 14);
          return { peak, wallAbove, shadow, below, tread, riser, treadTop, seamDark, seamCentre };
        }, {
          dataUrl: 'data:image/png;base64,' + shot2.toString('base64'),
          gy: Math.round(r.ground.t - regTop),
          s1t: Math.round(r.st1.t - regTop), s1b: Math.round(r.st1.b - regTop),
          snt: stTop ? Math.round(stTop.t - regTop) : -1,
        });
        /* ── 18회차 [N] — 접합선이 «검은 띠» 가 되지 않았는가. ──
           r18 채점에서 비평 AN 이 ⑤ 3점의 유일한 근거로 짚은 자리다: 문지방 밑 9px 이
           **폭 1075 · 행평균 휘도 8.7~8.9 · 고유색 32~39개** 로 화면을 가로로 절단했다.
           주인 지시가 «검은 영역이 없게» 이므로 이건 부호가 아니라 **절대 휘도**로 잰다.
           목표 L ≥ 20(주변 바닥 32~40 대비 Δ ≤ 20). 음성 대조: 알파를 옛 .88 로 되돌리면 8.2. */
        ck(`[${H}] ⑤ 접합선 그림자가 «검은 띠» 가 아니다 — 휘도 ≥ 20`,
          m.seamDark >= 20, `문지방 밑 9px 행평균 ${m.seamDark.toFixed(1)} (옛 .88 알파 = 8.2)`);
        /* 20회차 [Q] — 위 항목의 사각지대. 같은 자리를 **중앙 200px 만** 다시 잰다.
           문턱을 15 로 둔 이유: 여기는 구조물이 실제로 그림자를 던지는 자리라 옆보다 어두운 것이
           «정상» 이다(12회차 설계 · ①-2 부호 항목이 그것을 요구한다). 막으려는 것은 «어둡다» 가
           아니라 «검다» 이고, 옛 값 7.1 과 새 값 21.6 사이에서 여유를 남겨 잡는다.
           음성 대조: 캐스트 알파를 옛 .86 으로 되돌리면 x540 이 8.4 로 떨어져 FAIL 한다. */
        ck(`[${H}] ⑤ 접합선 «중앙 200px» 도 검지 않다 — 휘도 ≥ 15`,
          m.seamCentre >= 15, `x440~640 평균 ${m.seamCentre.toFixed(1)} (옛 캐스트 .86 = 8.4)`);
        ck(`[${H}] ① 접합선이 «보이는가» — 문지방 대비 ≥ 15`,
          m.peak - m.wallAbove >= 15,
          `문지방 ${m.peak.toFixed(1)} vs 받침 위 벽 ${m.wallAbove.toFixed(1)} = Δ${(m.peak - m.wallAbove).toFixed(1)}`);
        ck(`[${H}] ①-2 접합선 밑 그림자 부호 — 아래 60px 보다 어둡다`,
          m.below - m.shadow >= 4,
          `그림자 ${m.shadow.toFixed(1)} vs 아래 ${m.below.toFixed(1)} = Δ${(m.below - m.shadow).toFixed(1)}`);
        if (r.st1.h >= 40) {
          ck(`[${H}] ③ 디딤면 / 챌면 대비 ≥ 12 (맨 아래 단)`,
            m.tread - m.riser >= 12,
            `디딤면 ${m.tread.toFixed(1)} vs 챌면 ${m.riser.toFixed(1)} = Δ${(m.tread - m.riser).toFixed(1)}`);
          /* ── 18회차 — **깊이 감광이 «실제로 걸려 있는가».** ──
             이번 회차에 `.rw-steps::after` 의 알파를 `calc(… var(--rw-n) …)` 로 썼다가
             **네 프레임 전부 알파 0** 이 됐는데(미해결 토큰이 alpha 자리에서 0 으로 접힌다)
             게이트가 한 항목도 안 깨졌다 — r17 [K] 가 통째로 사라진 채 초록불이었다.
             LESSONS 120-(2) «넣긴 넣었는데 안 보이는 것을 넣었다고 판단했다» 그대로라 자를 댄다.
             단이 2개 이상인 프레임에서 «맨 위 단 디딤면 < 맨 아래 단 디딤면» 이어야 한다. */
          if (m.treadTop >= 0) {
            ck(`[${H}] ③ 깊이 감광이 걸려 있다 — 맨 위 단 디딤면이 맨 아래보다 어둡다`,
              m.tread - m.treadTop >= 3,
              `맨 위 ${m.treadTop.toFixed(1)} vs 맨 아래 ${m.tread.toFixed(1)} = Δ${(m.tread - m.treadTop).toFixed(1)}`);
          } else {
            ck(`[${H}] ③ 단 1개 — 깊이 감광 비교 대상 없음(오버레이 높이 0 이 정상)`, true, '');
          }
        } else {
          ck(`[${H}] ③ 맨 아래 단이 ${r.st1.h.toFixed(1)}px — 디딤/챌면 대비 검사 생략`, true, '');
        }
      }

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
