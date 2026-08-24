/* 47 검증 — 23 훈련 팝업 서브탭 4칸 → 2칸 (훈련 · 스탯 훈련)
   [3]-(가) 기계적 작업 검증: 레퍼런스 칸 수(4)와 우리 설계(2)가 달라 대조가 불가능하므로
   비평가를 띄우지 않고 «미변환분 0 · 콘솔 에러 0 · 겹침/잘림 0 · 탭 전환 실동작» 을 DOM 실측으로 판정한다.
   실행: node tools/verify47.js   (1080x2280 기준 · 헤드리스) */
const { chromium } = require('playwright');
const path = require('path');

const W = 1080, H = 2280;
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.5 : t);

(async () => {
  /* 번들 브라우저가 없으면 컨테이너의 chromium-1194 로 떨어진다(LESSONS 57 환경 메모) */
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(900);

  /* 훈련 탭 → 23 팝업 직행 */
  await page.evaluate(() => document.querySelector('.tab[data-t="grow"]').click());
  await page.waitForTimeout(400);
  ok('#trw 열림', await page.evaluate(() => document.getElementById('trw').classList.contains('on')));

  /* ---- 1. 마크업: 칸 2개 · 제거 대상 0 ---- */
  console.log('\n[1] 서브탭 구성');
  const mk = await page.evaluate(() => ({
    n: document.querySelectorAll('#trSub > .sg').length,
    subs: [...document.querySelectorAll('#trSub > .sg')].map(e => e.dataset.trsub || ''),
    labels: [...document.querySelectorAll('#trSub > .sg > i')].map(e => e.textContent),
    lock: document.querySelectorAll('#trSub .lock').length,
    on: document.querySelectorAll('#trSub > .sg.on').length,
    magic: document.body.innerHTML.includes('마법상판'),
    css: [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.selectorText || ''); }
      catch (e) { return []; } }).filter(s => s.includes('.tr-sub') && s.includes('lock')).length,
  }));
  ok('서브탭 2칸', mk.n === 2, mk.n + '칸');
  ok('data-trsub = train,stat', mk.subs.join(',') === 'train,stat', mk.subs.join(','));
  ok('라벨 = 훈련,스탯 훈련', mk.labels.join(',') === '훈련,스탯 훈련', mk.labels.join(','));
  ok('🔒 칸 0개', mk.lock === 0, mk.lock + '개');
  ok('«마법상판» 문자열 0건', !mk.magic);
  ok('.tr-sub .lock CSS 규칙 0건 (LESSONS 57-1)', mk.css === 0, mk.css + '건');
  ok('활성 칸 1개', mk.on === 1, mk.on + '개');

  /* ---- 2. 기하: 바 껍데기 규격 유지 + 2등분 균등 ---- */
  console.log('\n[2] 기하 실측 (1080x2280)');
  const g = await page.evaluate(() => {
    const bar = document.getElementById('trSub');
    const sg = [...bar.querySelectorAll('.sg')];
    const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const cs = getComputedStyle(bar);
    const on = bar.querySelector('.sg.on');
    const pill = getComputedStyle(on, '::before');
    const div = getComputedStyle(sg[0], '::after');
    /* 라벨 잉크 실폭 — <i> 박스가 아니라 Range 로 재야 scaleX 가 반영된 실제 잉크가 나온다 */
    const ink = sg.map(s => { const rg = document.createRange(); rg.selectNodeContents(s.querySelector('i'));
      const b = rg.getBoundingClientRect(); return { x: b.x, w: b.width }; });
    const dot = on.querySelector('.dot');
    return {
      bar: r(bar), radius: cs.borderRadius, bg: cs.backgroundColor,
      cells: sg.map(r),
      sgcs: sg.map(s => { const c = getComputedStyle(s); return { mt: c.marginTop, mb: c.marginBottom, bg: c.backgroundImage }; }),
      pill: { left: pill.left, width: pill.width, height: pill.height, radius: pill.borderRadius },
      div: { right: div.right, width: div.width, height: div.height },
      ink, dot: dot ? r(dot) : null,
      trw: r(document.getElementById('trw')),
    };
  });
  ok('바 960x97', near(g.bar.w, 960) && near(g.bar.h, 97), g.bar.w.toFixed(1) + 'x' + g.bar.h.toFixed(1));
  ok('바 radius 40', g.radius === '40px', g.radius);
  ok('바 배경 #141414 (상검정 8 / 하검정 6 의 바탕)', g.bg === 'rgb(20, 20, 20)', g.bg);
  ok('상검정 8 / 하검정 6', g.sgcs[0].mt === '8px' && g.sgcs[0].mb === '6px', g.sgcs[0].mt + '/' + g.sgcs[0].mb);
  /* 립 = 위 0..6 · 아래 77..(83) 이 밝은 (112,95,75), 본체 6..77 이 (98,81,61).
     computed 는 색을 rgb() 로 펼치므로 «6px 77px» 같은 축약형이 아니라 색+정지점으로 판정한다(LESSONS 43-1) */
  ok('상하 밝은 립 6 유지 (112,95,75) / 본체 (98,81,61)',
    /rgb\(112, 95, 75\) 0px, rgb\(112, 95, 75\) 6px/.test(g.sgcs[0].bg)
    && /rgb\(98, 81, 61\) 6px, rgb\(98, 81, 61\) 77px/.test(g.sgcs[0].bg)
    && /rgb\(112, 95, 75\) 77px/.test(g.sgcs[0].bg.slice(g.sgcs[0].bg.indexOf('77px'))),
    g.sgcs[0].bg);
  ok('칸 폭 474 · 474 (균등)', near(g.cells[0].w, 474) && near(g.cells[1].w, 474),
    g.cells.map(c => c.w.toFixed(1)).join(' / '));
  ok('칸 경계 맞닿음 (빈틈·겹침 0)', near(g.cells[0].x + g.cells[0].w, g.cells[1].x, 0.5),
    'Δ' + (g.cells[1].x - g.cells[0].x - g.cells[0].w).toFixed(2));
  ok('경계 = 바 정중앙', near(g.cells[1].x, g.bar.x + g.bar.w / 2, 0.5),
    (g.cells[1].x - g.bar.x).toFixed(1) + ' vs ' + (g.bar.w / 2));
  ok('구분선 55px · 경계 중심', g.div.height === '55px' && g.div.width === '4px' && g.div.right === '-2px',
    g.div.width + 'x' + g.div.height + ' right ' + g.div.right);
  ok('알약 규격 253x62 · radius31 유지', g.pill.width === '253px' && g.pill.height === '62px' && g.pill.radius === '31px',
    g.pill.width + 'x' + g.pill.height + ' r' + g.pill.radius);
  ok('알약 칸 중앙 (474−253)/2 = 110.5', g.pill.left === '110.5px', g.pill.left);
  const pl = parseFloat(g.pill.left), pw = parseFloat(g.pill.width);
  ok('알약 칸 밖 돌출 0', pl >= 0 && pl + pw <= g.cells[0].w + 0.5, pl + '..' + (pl + pw) + ' / 칸 ' + g.cells[0].w);
  for (let i = 0; i < 2; i++) {
    const c = g.cells[i], k = g.ink[i];
    ok('칸' + (i + 1) + ' 라벨 중심 = 칸 중심', near(k.x + k.w / 2, c.x + c.w / 2, 2),
      'Δ' + (k.x + k.w / 2 - (c.x + c.w / 2)).toFixed(2));
    ok('칸' + (i + 1) + ' 라벨 잉크 칸 안 (잘림 0)', k.x >= c.x && k.x + k.w <= c.x + c.w,
      k.x.toFixed(1) + '..' + (k.x + k.w).toFixed(1) + ' / 칸 ' + c.x.toFixed(1) + '..' + (c.x + c.w).toFixed(1));
  }
  if (g.dot) {
    const c = g.cells[0];
    ok('레드닷 42x42', near(g.dot.w, 42) && near(g.dot.h, 42), g.dot.w + 'x' + g.dot.h);
    ok('레드닷 알약 안 (알약 local 210 → 320.5)', g.dot.x - c.x >= pl && g.dot.x - c.x + g.dot.w <= pl + pw + 0.5,
      (g.dot.x - c.x).toFixed(1) + '..' + (g.dot.x - c.x + g.dot.w).toFixed(1) + ' / 알약 ' + pl + '..' + (pl + pw));
  }
  ok('바가 #trw 안 (잘림 0)', g.bar.x >= g.trw.x && g.bar.x + g.bar.w <= g.trw.x + g.trw.w
    && g.bar.y + g.bar.h <= g.trw.y + g.trw.h,
    'bar ' + g.bar.y.toFixed(0) + '+' + g.bar.h + ' / trw ' + g.trw.y.toFixed(0) + '+' + g.trw.h.toFixed(0));

  /* ---- 3. 실동작: 두 칸 전환 ---- */
  console.log('\n[3] 탭 전환 실동작');
  const before = await page.evaluate(() => ({ rib: document.getElementById('trRib').textContent,
    coin: [...document.querySelectorAll('#trCards .cb > s')].map(e => e.textContent).join(''),
    on: document.querySelector('#trSub .sg.on').dataset.trsub }));
  ok('진입 시 훈련 활성 · 골드 카드', before.on === 'train' && before.coin === '💰💰💰' && /^훈련 /.test(before.rib),
    before.on + ' / ' + before.coin + ' / ' + before.rib);
  await page.evaluate(() => document.querySelector('[data-trsub="stat"]').click());
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => ({ rib: document.getElementById('trRib').textContent,
    coin: [...document.querySelectorAll('#trCards .cb > s')].map(e => e.textContent).join(''),
    on: document.querySelector('#trSub .sg.on').dataset.trsub,
    pillIn: document.querySelector('#trSub .sg.on').dataset.trsub === 'stat',
    gain: [...document.querySelectorAll('#trCards .cv > i')].map(e => e.textContent).join(','),
    onN: document.querySelectorAll('#trSub .sg.on').length }));
  ok('«스탯 훈련» 클릭 → 활성 이동', st.on === 'stat' && st.onN === 1, st.on + ' (.on ' + st.onN + '개)');
  ok('리본 = 스탯 훈련 n 단계', /^스탯 훈련 /.test(st.rib), st.rib);
  ok('카드 재화 🧬 (포인트)', st.coin === '🧬🧬🧬', st.coin);
  ok('카드 증가치 % 표기', /%|MAX/.test(st.gain), st.gain);
  const stg = await page.evaluate(() => { const on = document.querySelector('#trSub .sg.on');
    const b = on.getBoundingClientRect(), p = getComputedStyle(on, '::before');
    const rg = document.createRange(); rg.selectNodeContents(on.querySelector('i'));
    const k = rg.getBoundingClientRect();
    return { cx: b.x, cw: b.width, pl: p.left, pw: p.width, ix: k.x, iw: k.width }; });
  ok('스탯 칸 알약도 칸 중앙', stg.pl === '110.5px' && stg.pw === '253px', stg.pl + ' / ' + stg.pw);
  ok('스탯 라벨 중심 = 칸 중심', near(stg.ix + stg.iw / 2, stg.cx + stg.cw / 2, 2),
    'Δ' + (stg.ix + stg.iw / 2 - (stg.cx + stg.cw / 2)).toFixed(2));
  ok('스탯 라벨 알약 안 (잘림 0)', stg.ix - stg.cx >= parseFloat(stg.pl) - 0.5
    && stg.ix - stg.cx + stg.iw <= parseFloat(stg.pl) + parseFloat(stg.pw) + 0.5,
    (stg.ix - stg.cx).toFixed(1) + '..' + (stg.ix - stg.cx + stg.iw).toFixed(1));
  await page.evaluate(() => document.querySelector('[data-trsub="train"]').click());
  await page.waitForTimeout(200);
  const bk = await page.evaluate(() => ({ rib: document.getElementById('trRib').textContent,
    coin: [...document.querySelectorAll('#trCards .cb > s')].map(e => e.textContent).join(''),
    on: document.querySelector('#trSub .sg.on').dataset.trsub }));
  ok('«훈련» 클릭 → 복귀', bk.on === 'train' && bk.coin === '💰💰💰' && /^훈련 /.test(bk.rib),
    bk.on + ' / ' + bk.coin + ' / ' + bk.rib);

  /* 닫고 다시 열어도 바가 정상인지(45 §3 같은 잔존 상태 버그 확인) */
  await page.evaluate(() => { document.querySelector('.tab[data-t="grow"]').click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { document.querySelector('[data-trsub=stat]') && 0; document.querySelector('.tab[data-t="grow"]').click(); });
  await page.waitForTimeout(350);
  const re = await page.evaluate(() => ({ open: document.getElementById('trw').classList.contains('on'),
    n: document.querySelectorAll('#trSub > .sg').length,
    onN: document.querySelectorAll('#trSub > .sg.on').length }));
  ok('닫기 → 재진입 시 2칸 · 활성 1개', re.open && re.n === 2 && re.onN === 1,
    JSON.stringify(re));

  /* ---- 4. 콘솔 ---- */
  console.log('\n[4] 콘솔');
  ok('에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await page.screenshot({ path: path.resolve(__dirname, '..', 'docs/review/47-subtab.png'),
    clip: { x: 0, y: g.bar.y - 40, width: 1080, height: 180 } });

  console.log('\nVERIFY47 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
