/* 작업 259(2026-08-27 저장소 주인 보고) — «황금 동굴·수정 광산의 몬스터 액자가 다른 행보다
   작고 위치도 어긋나 통일감이 없다».
   이 프로브는 지시서 [3]-(가)(기계적 작업 = 비평가 없이 수치로 확인)의 «겹침·잘림 0건» 을 잰다.
   액자를 330 으로 넓히면 슬롯 좌단이 카드1 662 → 643 · 카드2 677 → 643 으로 **왼쪽으로** 오므로,
   그 자리에 있던 던전명·보상 알약·하단 라벨·좌우 캡슐과 새로 겹칠 수 있다 — 그것을 실측한다.
   실행: node tools/probe259.js  (종료 코드 0 = 겹침·잘림 0건) */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForTimeout(900);
  /* 03 던전 팝업 열기 — 하단 탭 «모험»(verify72 와 같은 경로) */
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const rows = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#dunList .dnc:not(.rd)')];
    return cards.map((c) => {
      const cr = c.getBoundingClientRect(), sc = cr.width / 980;   /* 화면 px → 프레임 px */
      const rel = (el) => {
        const r = el.getBoundingClientRect();
        return { x0: +((r.left - cr.left) / sc).toFixed(1), x1: +((r.right - cr.left) / sc).toFixed(1),
                 y0: +((r.top - cr.top) / sc).toFixed(1), y1: +((r.bottom - cr.top) / sc).toFixed(1) };
      };
      const th = c.querySelector('.th');
      const others = [...c.querySelectorAll('.nm,.pill,.lb,.sp,.dot')].map((e) => ({
        cls: e.className, ...rel(e)
      }));
      const cv = th && th.querySelector('canvas');
      return {
        id: c.dataset.dcard,
        th: th ? rel(th) : null,
        /* 액자 안쪽 = 슬롯 − (검정 테두리 5 + 안쪽 림 6) 양변. 캔버스가 그 크기여야 1:1 이다. */
        /* ⚠ 캔버스 CSS 크기는 `getBoundingClientRect` 로 재면 안 된다 — 121 들썩의 스쿼시가
           `scale()` 로 최대 4% 눌러 놔서 «회차마다 다른 값» 이 나온다(그래서 이 줄이 처음에
           4장만 FAIL 했다). `getComputedStyle` 의 width/height 는 변환 «전» 의 사용값이라
           애니메이션 위상과 무관하다 — 재는 것이 «상자» 이므로 이쪽이 맞다. */
        cv: cv ? (() => { const cs = getComputedStyle(cv);
          return { pxw: cv.width, pxh: cv.height,
                   csw: +parseFloat(cs.width).toFixed(1), csh: +parseFloat(cs.height).toFixed(1) }; })() : null,
        card: { w: +(cr.width / sc).toFixed(1), h: +(cr.height / sc).toFixed(1) },
        others
      };
    });
  });

  let bad = 0;
  const say = (good, msg) => { if (!good) bad++; console.log(`  ${good ? '✓' : '✗'} ${msg}`); };

  console.log('[1] 던전 8장 액자 기하 (프레임 px · 카드 좌상단 기준)');
  rows.forEach((r) => console.log(
    `  ${r.id.padEnd(7)} 액자 x${r.th.x0}~${r.th.x1} y${r.th.y0}~${r.th.y1}` +
    `  ${(r.th.x1 - r.th.x0).toFixed(1)}×${(r.th.y1 - r.th.y0).toFixed(1)}` +
    `  캔버스 ${r.cv.pxw}×${r.cv.pxh}px`));

  console.log('[2] 통일 — 8장이 폭·높이·좌단·상단 전부 같은가 (주인 지적의 본체)');
  ['x0', 'x1', 'y0', 'y1'].forEach((f) => {
    const v = rows.map((r) => r.th[f]), d = +(Math.max(...v) - Math.min(...v)).toFixed(1);
    say(d <= 1, `액자 ${f} 최대차 ${d}px ≤ 1  (${[...new Set(v)].join(' / ')})`);
  });

  console.log('[3] 겹침 — 액자 좌단 왼쪽의 텍스트·알약·캡슐이 액자를 침범하지 않는가');
  rows.forEach((r) => {
    r.others.forEach((o) => {
      /* 세로로 겹치는 것만 본다 — 세로가 안 겹치면 가로가 물려도 화면에서는 안 겹친다 */
      const vOverlap = o.y1 > r.th.y0 && o.y0 < r.th.y1;
      if (!vOverlap) return;
      say(o.x1 <= r.th.x0 + 0.5,
        `${r.id.padEnd(7)} ${o.cls.padEnd(9)} 우단 ${o.x1} ≤ 액자 좌단 ${r.th.x0}` +
        (o.x1 > r.th.x0 + 0.5 ? `  ← ${(o.x1 - r.th.x0).toFixed(1)}px 침범` : ''));
    });
  });

  console.log('[4] 잘림 — 액자가 카드 밖으로 나가지 않는가 (카드 980×350)');
  rows.forEach((r) => say(
    r.th.x0 >= 0 && r.th.y0 >= 0 && r.th.x1 <= r.card.w + 0.5 && r.th.y1 <= r.card.h + 0.5,
    `${r.id.padEnd(7)} 액자가 카드(${r.card.w}×${r.card.h}) 안에 있다`));

  console.log('[5] 캔버스 1:1 — 픽셀 크기 = CSS 크기(확대 보간 없음)');
  rows.forEach((r) => say(
    Math.abs(r.cv.csw - r.cv.pxw) <= 1 && Math.abs(r.cv.csh - r.cv.pxh) <= 1,
    `${r.id.padEnd(7)} 캔버스 CSS ${r.cv.csw}×${r.cv.csh} = 픽셀 ${r.cv.pxw}×${r.cv.pxh}`));

  await p.waitForTimeout(600);
  console.log('[6] 콘솔');
  say(errs.length === 0, `콘솔 에러 ${errs.length}건 ${errs.slice(0, 3).join(' | ')}`);

  await b.close();
  console.log(bad === 0 ? '\nPROBE259 OK — 겹침·잘림 0건' : `\nPROBE259 FAIL ${bad}건`);
  process.exit(bad === 0 ? 0 : 1);
})();
