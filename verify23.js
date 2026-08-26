/* 23 훈련 팝업 — 8회차 자체 검증. DOM 실측 + «7회차에서 이미 맞았다» 항목 회귀 확인.
   사용: node verify23.js   (index.html 을 1080x2280 헤드리스로 띄워 openTrain() 상태로 잰다) */
const { chromium } = require('playwright');
const path = require('path');

/* ref 절대 y → 캡처 y 는 −65 (2026-08-25 11회차: 캡처 1080x2280 전환. 바닥 시트라 하단 앵커 →
   1920 시절의 −425 에서 360 만큼 줄었다). 기대값은 모두 «ref 절대 px» 로 적고 캡처 실측을 +65 해서 비교한다 */
const EXP = [
  /* [라벨, 셀렉터, {x,y,w,h} ref 기대값(생략 가능)] — y 는 ref 절대 */
  ['시트 .tr-sheet',      '.tr-sheet', { x: 0, y: 920, w: 1080, h: 1245 }],
  ['크림박스 .tr-box',    '.tr-box',   { x: 17, y: 1063, w: 1046, h: 1093 }],
  ['리본 .tr-rib',        '.tr-rib',   { x: 264, y: 1097, w: 551, h: 108 }],
  ['진행바 .tr-prog',     '.tr-prog',  { x: 194, y: 1228, w: 668, h: 55 }],
  ['↑버튼 .tr-up',        '.tr-up',    { x: 855, y: 1202, w: 108, h: 107 }],
  /* 24회차 개정 — h 81 → 75. 7회차가 넣은 81 은 «스트립 바닥 밝은 띠의 끝» 을 못 보고 잡은 값이다.
     ref x450·x880 두 열 실측: 밝은 띠(236,190,154)는 y1398..1402 **5px** 이고 y1403..1408 은 이미
     트레이 경계 띠(238,200,161)다 → 스트립 outer 는 1328..1402 = **75**. 우리 81 은 그 경계 띠를
     x160..919 구간에서 6px 덮고 있었다(비평가 θ P2 가 «전폭 띠가 중간에서 끊긴다» 로 독립 검출). */
  ['배수탭 바 .tr-qty',   '.tr-qty',   { x: 159, y: 1328, w: 761, h: 75 }],
  ['카드1 .tr-card:1',    '.tr-card:nth-child(1)', { x: 35, y: 1436, w: 326, h: 510 }],
  ['카드2 .tr-card:2',    '.tr-card:nth-child(2)', { x: 377, y: 1436, w: 326, h: 510 }],
  ['카드3 .tr-card:3',    '.tr-card:nth-child(3)', { x: 718, y: 1436, w: 326, h: 510 }],
  /* 서브탭 바(.tr-sub)는 작업 88(주인 지시 «스탯 훈련 폐기»)이 없앴다 — 기하 기대값은 폐기하고
     «존재하지 않는다» 를 대신 검사한다(LESSONS 134: 지키던 성질이 아직 유효한지로 가른다).
     16회차(2026-08-26, sess-0005-4811): 이 행이 남아 있어 게이트가 MISS 로 죽고 있었다. */
  /* 12회차 재실측(비평가 T L2): ref y1880 은 x44 부터 곧장 밴드다(x43 은 카드 검정 테두리 AA).
     8회차의 x47/w305 는 밴드가 검정에서 4px 떨어져 흰 카드 배경이 노출된 상태였다 → x44/w309 로 정정. */
  ['가격줄 .cb(카드1)',   '.tr-card:nth-child(1) .cb', { x: 43, y: 1832, w: 310, h: 106 }],
  ['선택칩 .q.on::before','.tr-qty>.q.on', {}],
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 5e12, dia: 300, stage: 1, best: 1, trainStage: 1, statStage: 1,
      lv: { atk: 98 }, buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 }
    }));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => openTrain());
  await page.waitForTimeout(600);

  const got = await page.evaluate(exp => {
    const out = [];
    for (const [label, sel, e] of exp) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ label, miss: true }); continue; }
      const b = el.getBoundingClientRect();
      out.push({ label, x: Math.round(b.x), y: Math.round(b.y) + 65, w: Math.round(b.width), h: Math.round(b.height), e });
    }
    /* 7회차가 «이미 맞았다» 고 못박은 항목들 — 회귀 감시 */
    const g = s => { const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y) + 65, Math.round(b.width), Math.round(b.height)]; };
    const reg = {
      '카드 pitch': g('.tr-card:nth-child(2)')[0] - g('.tr-card:nth-child(1)')[0],
      '카드 border-box': g('.tr-card:nth-child(1)').slice(2).join('x'),
      '서브탭 바(88 폐기)': document.querySelector('.tr-sub') ? 'FAIL — 되살아남' : '없음(정상)',
      '진행바 h': g('.tr-prog')[3],
      '배수탭 바 x/w': g('.tr-qty')[0] + '/' + g('.tr-qty')[2],
      '선택칩 x/w/h': (() => { const q = document.querySelector('.tr-qty>.q.on');
        const cs = getComputedStyle(q, '::before');
        return q.getBoundingClientRect().x + parseFloat(cs.left) + '/' + cs.width + '/' + cs.height; })(),
      /* 서브탭 구분선도 88 과 함께 폐기 — 배수탭(.tr-qty) 칸 구분선이 같은 성질을 잇는다 */
      '배수탭 칸 경계 x': [...document.querySelectorAll('.tr-qty>.q')]
        .map(q => Math.round(q.getBoundingClientRect().x)).join('/'),
      '슬롯 플레이트 s': getComputedStyle(document.querySelector('.tr-card .ci'), '::before').width,
      '리본 바 h': g('.tr-rib>.bar')[3],
      '꼬리 w/h': g('.tr-rib>b.l').slice(2).join('x'),
      /* 11·12회차 확정분 — 회귀 감시 */
      '아이콘 판 h(=119)': (() => { const cs = getComputedStyle(document.querySelector('.tr-card .ci'), '::before');
        return Math.round(parseFloat(cs.width) * Math.SQRT2 - 2 * 24 * (Math.SQRT2 - 1)) + 'x'
             + Math.round((parseFloat(cs.height) * Math.SQRT2 - 2 * 24 * (Math.SQRT2 - 1)) * 0.8); })(),
      /* 서브탭 알약·배지 회귀는 88 폐기와 함께 사라졌다 — 대신 «시트 바닥 여백» 을 감시한다
         (서브탭이 있던 자리라 되살아나거나 카드가 흘러내리면 여기서 잡힌다) */
      '카드 하단~크림박스 하단': (() => {
        const c = document.querySelector('.tr-cards').getBoundingClientRect();
        const b = document.querySelector('.tr-box').getBoundingClientRect();
        return Math.round(b.bottom - c.bottom); })(),
      '트레이 배지 ⌀': getComputedStyle(document.querySelector('.tr-qty .dot')).width,
    };
    /* 프레임 밖 / 겹침 */
    const app = document.getElementById('app').getBoundingClientRect();
    let over = 0;
    document.querySelectorAll('#trw *').forEach(el => {
      const b = el.getBoundingClientRect();
      if (b.width && b.height && (b.left < app.left - 1 || b.right > app.right + 1)) over++;
    });
    /* NaN/undefined 텍스트 */
    const bad = /NaN|undefined|Infinity/.test(document.getElementById('trw').innerText);
    return { out, reg, over, bad };
  }, EXP);

  let fail = 0;
  console.log('== DOM 실측 (ref 절대 px 기준) ==');
  for (const r of got.out) {
    if (r.miss) { console.log('MISS  ' + r.label); fail++; continue; }
    const e = r.e || {};
    const d = k => (e[k] === undefined ? '' : (r[k] - e[k] >= 0 ? '+' : '') + (r[k] - e[k]));
    const bad = ['x', 'y', 'w', 'h'].some(k => e[k] !== undefined && Math.abs(r[k] - e[k]) > 2);
    if (bad) fail++;
    console.log((bad ? 'FAIL  ' : 'ok    ') + r.label.padEnd(22)
      + ` x${r.x}(${d('x')}) y${r.y}(${d('y')}) w${r.w}(${d('w')}) h${r.h}(${d('h')})`);
  }
  console.log('\n== 7회차 확정 항목 회귀 ==');
  for (const k in got.reg) console.log('  ' + k.padEnd(18) + got.reg[k]);
  console.log('\n프레임 밖 요소: ' + got.over + ' · NaN/undefined: ' + got.bad
    + ' · 콘솔 에러: ' + errs.length);
  if (got.over || got.bad || errs.length) fail++;
  console.log(fail ? '\nVERIFY FAIL ' + fail : '\nVERIFY PASS');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
