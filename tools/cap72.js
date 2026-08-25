/* 작업 72 — 03 던전 카드 우측 썸네일 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 진입: 하단 탭 «던전» → 03 던전 리스트 페이지.
   실행: node tools/cap72.js [출력경로] [--geo] [--unlock]
     --geo     카드/썸네일의 프레임 좌표 + 이모지 잉크 bbox 를 찍는다.
     --unlock  가이드미션 진행도를 올려 5장을 전부 해금 상태로 본다(기본은 레퍼런스와 같은 2해금·3잠금).
   LESSONS 04-① — 캡처 상태(해금 3잠금 2해금)가 레퍼런스와 같아야 그 회차 비평이 유효하다.
   LESSONS 30-② — 토스트가 캡처에 섞이지 않도록 msgT 를 0 으로 만든다. */
const { chromium } = require('playwright');
const path = require('path');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/72-r1.png';
const GEO = args.includes('--geo');
const UNLOCK = args.includes('--unlock');
const PROBE = args.includes('--probe');
const NOCLIP = args.includes('--noclip');   /* 잉크 원본 bbox 측정용 — 슬롯 클리핑 해제 */

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  if (UNLOCK) await p.evaluate(() => { S.guide.idx = 99; });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(450);
  await p.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await p.waitForTimeout(800);   /* 60 쥬시 pop-in 이 끝나야 카드 bbox 가 확정된다 */

  /* --probe: 카드 배경을 평탄한 흰색으로 깔고 텍스트를 숨겨 «이모지 잉크만» 스캔 가능하게 한다
     (LESSONS 04-③ — 반투명·무늬 뒤 레이어는 평탄화 프로브로 재라) */
  if (PROBE) {
    await p.addStyleTag({ content: `
      .dnc>.bg{background:#fff!important}
      .dnc>.bg::before,.dnc>.bg::after,.dnc>.sh{display:none!important}
      .dnc .nm,.dnc .pill,.dnc .lb,.dnc .sp,.dnc .dot,.dnc .lk{visibility:hidden!important}
      .dnc>.th>em{filter:none!important}` });
    /* 마스크·필터는 스타일시트 !important 로도 안 지워지는 경우가 있어 인라인으로 덮는다 */
    await p.evaluate((process_env_noclip) => {
      document.querySelectorAll('.dnc>.th').forEach((t) => {
        t.style.webkitMaskImage = 'none'; t.style.maskImage = 'none';
        if (process_env_noclip) t.style.overflow = 'visible';
      });
      document.querySelectorAll('.dnc>.th>em').forEach((e) => { e.style.filter = 'none'; });
    }, NOCLIP);
    await p.waitForTimeout(120);
  }

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = {};
    const R = (k, el) => {
      if (!el) { g[k] = null; return; }
      const r = el.getBoundingClientRect();
      g[k] = { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    R('app', document.getElementById('app'));
    R('list', document.getElementById('dunList'));
    document.querySelectorAll('.dnc').forEach((c, i) => {
      R('card' + (i + 1), c);
      R('th' + (i + 1), c.querySelector('.th'));
      R('em' + (i + 1), c.querySelector('.th>em'));
      R('nm' + (i + 1), c.querySelector('.nm'));
    });
    return g;
  });

  if (GEO) {
    console.log(JSON.stringify(geo, null, 1));
    console.log('-- ref 환산(y+84) --');
    for (const [k, v] of Object.entries(geo))
      if (v && v.w !== undefined) console.log(`  ${k}\tref x${v.x}~${(v.x + v.w).toFixed(1)} y${(v.y + 84).toFixed(1)}~${(v.y + v.h + 84).toFixed(1)}  ${v.w}x${v.h}`);
  }

  await p.screenshot({ path: path.resolve(__dirname, '..', out) });
  console.log('capture →', out, '| console errors:', errs.length);
  if (errs.length) errs.slice(0, 8).forEach((e) => console.log('  ERR', e));
  await b.close();
})();
