/* 작업 72 — 03 던전 카드 우측 썸네일 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 진입: 하단 탭 «던전» → 03 던전 리스트 페이지.
   실행: node tools/cap72.js [출력경로] [--geo] [--unlock]
     --geo     카드/썸네일의 프레임 좌표 + 이모지 잉크 bbox 를 찍는다.
     --unlock  가이드미션 진행도를 올려 5장을 전부 해금 상태로 본다(기본은 레퍼런스와 같은 2해금·3잠금).
   LESSONS 04-① — 캡처 상태(해금 3잠금 2해금)가 레퍼런스와 같아야 그 회차 비평이 유효하다.
   LESSONS 30-② — 토스트가 캡처에 섞이지 않도록 msgT 를 0 으로 만든다. */
/* 110 — 번들 브라우저 폴백은 tools/pwlaunch.js 공용(클라우드 러너에서 직접 launch 는 즉사한다) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/72-r1.png';
const GEO = args.includes('--geo');
const UNLOCK = args.includes('--unlock');
const PROBE = args.includes('--probe');
const NOCLIP = args.includes('--noclip');   /* 잉크 원본 bbox 측정용 — 슬롯 클리핑 해제 */

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* ⚠ 72 8회차: `S.guide.idx` 만 올리면 **유물조각 2~4단은 안 열린다** — 90 이 그 셋을 «이전 단 N층
     클리어»(`DUN_UI[].pre`) 로 바꿔 놓았기 때문이다. 그래서 `--unlock` 이 6장 중 3장을 잠근 채로
     찍고 있었고, 그 캡처를 «전부 해금» 으로 읽으면 잠금 딤이 걸린 그림을 아트 문제로 오독하게 된다. */
  if (UNLOCK) await p.evaluate(() => {
    S.guide.idx = 99;
    Object.keys(DUN_UI).forEach(id => { if (DUN_UI[id].pre) S.dun[id] = 1; });
    Object.values(DUN_UI).forEach(u => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
  });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(450);
  await p.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  /* 58 연출 모듈의 재화 파티클이 카드 위를 지나가 썸네일 스캔을 오염시킨다(비평가 X 지적).
     LESSONS 30-② 와 같은 «시간 의존 상태» 라 캡처 스크립트에서 제거한다. */
  await p.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
  await p.waitForTimeout(800);   /* 60 쥬시 pop-in 이 끝나야 카드 bbox 가 확정된다 */

  /* --probe: 카드 배경을 평탄한 흰색으로 깔고 텍스트를 숨겨 «이모지 잉크만» 스캔 가능하게 한다
     (LESSONS 04-③ — 반투명·무늬 뒤 레이어는 평탄화 프로브로 재라) */
  if (PROBE) {
    await p.addStyleTag({ content: `
      .dnc>.bg{background:#fff!important}
      .dnc>.bg::before,.dnc>.bg::after,.dnc>.sh{display:none!important}
      .dnc .nm,.dnc .pill,.dnc .lb,.dnc .sp,.dnc .dot,.dnc .lk,.dnc>.scn{visibility:hidden!important}
      .dnc>.th{background:none!important}` });
    /* 슬롯의 마스크·잉크 필터는 «그대로 둔다» — 지우면 실제 렌더와 기하가 달라져 오측된다.
       --noclip 은 잉크 원본 bbox 를 볼 때만 쓴다. */
    if (NOCLIP) await p.evaluate(() => {
      document.querySelectorAll('.dnc>.th').forEach((t) => { t.style.overflow = 'visible'; });
    });
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
