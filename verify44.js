/* 44 검증 — 다이아 판매 상품 5종 + 마일리지 교환
   지시서 [3]-(가) 기계적/기능 작업: 비평가 없이 기하 단정 + T2 «기능 완성 규칙» 기능 체크 표.
   실행: node verify44.js   (playwright@1.56.0 · chromium 1194) */
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'index.html');

const rows = [], fails = [];
const ok = (t, d) => { rows.push(['✓', t, d || '']); };
const bad = (t, d) => { rows.push(['✗', t, d || '']); fails.push(t + ' — ' + d); };
const near = (t, got, want, tol = 1) =>
  Math.abs(got - want) <= tol ? ok(t, got + ' (기대 ' + want + ')')
                              : bad(t, '실측 ' + got + ' / 기대 ' + want);
const eq = (t, got, want) =>
  String(got) === String(want) ? ok(t, String(got)) : bad(t, '실측 ' + got + ' / 기대 ' + want);

async function openCoin(page) {
  await page.click('.tab[data-t="shop"]', { force: true });
  await page.waitForTimeout(300);
  await page.$eval('#shopCats .shp-ct[data-cat="coin"]', el => el.click());
  await page.waitForTimeout(300);
}
/* 콘텐츠 좌표는 스크롤과 무관하게 .cn-wrap 기준 local px 로 잰다 */
const box = (page, sel, i) => page.evaluate(([s, n]) => {
  const w = document.querySelector('.cn-wrap');
  const el = document.querySelectorAll(s)[n || 0];
  if (!w || !el) return null;
  const W = w.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: Math.round(r.left - W.left), y: Math.round(r.top - W.top),
           w: Math.round(r.width), h: Math.round(r.height) };
}, [sel, i]);

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await openCoin(page);

  /* ---------- A. 기하 ---------- */
  const wrap = await box(page, '.cn-wrap');
  near('A1 .cn-wrap 높이', wrap.h, 3066);
  near('A2 .cn-wrap 폭', wrap.w, 1080);

  const ribs = await page.$$eval('.cn-rb', els => {
    const W = document.querySelector('.cn-wrap').getBoundingClientRect();
    return els.map(e => { const r = e.getBoundingClientRect();
      return { y: Math.round(r.top - W.top), x: Math.round(r.left - W.left),
               w: Math.round(r.width), h: Math.round(r.height),
               t: (e.querySelector('i') || {}).textContent }; });
  });
  eq('A3 리본 3개(광고·다이아·마일리지)', ribs.length, 3);
  eq('A4 다이아 리본 문구', ribs[1] && ribs[1].t, '다이아 상품');
  near('A5 다이아 리본 y', ribs[1].y, 1698);
  eq('A6 마일리지 리본 문구', ribs[2] && ribs[2].t, '마일리지 상품');
  near('A7 마일리지 리본 y', ribs[2].y, 2587);
  ribs.forEach((r, i) => { near('A8-' + i + ' 리본 규격 x/w/h', r.x * 1000 + r.w, 227 * 1000 + 627, 0); });

  const cds = await page.$$eval('.cn-cd.dia', els => {
    const W = document.querySelector('.cn-wrap').getBoundingClientRect();
    return els.map(e => { const r = e.getBoundingClientRect();
      return { x: Math.round(r.left - W.left), y: Math.round(r.top - W.top),
               w: Math.round(r.width), h: Math.round(r.height),
               hd: e.querySelector('.hd>i').textContent,
               qt: e.querySelector('.qt').textContent,
               pr: e.querySelector('.bt.buy>.pr').textContent,
               cp: (e.querySelector('.cp>i') || {}).textContent || '',
               id: e.querySelector('[data-diabuy]').dataset.diabuy }; });
  });
  eq('A9 다이아 카드 5칸', cds.length, 5);
  const wantX = [111, 401, 691, 111, 401], wantY = [1884, 1884, 1884, 2203, 2203];
  const wantPr = ['1,000원', '5,000원', '11,000원', '55,000원', '110,000원'];
  const wantQt = ['×1만', '×7만', '×15만', '×90만', '×200만'];
  const wantCp = ['', '', '', '쿠폰 +1', '쿠폰 +2'];
  cds.forEach((c, i) => {
    near('A10-' + i + ' 카드 x', c.x, wantX[i]);
    near('A11-' + i + ' 카드 y', c.y, wantY[i]);
    near('A12-' + i + ' 카드 w×h', c.w * 1000 + c.h, 278 * 1000 + 309, 0);
    eq('A13-' + i + ' 가격', c.pr, wantPr[i]);
    eq('A14-' + i + ' 수량', c.qt, wantQt[i]);
    eq('A15-' + i + ' 쿠폰 뱃지', c.cp, wantCp[i]);
  });
  /* §5 광고 카드와 같은 규격인지 (설계: «카드 규격은 위 상품 그리드와 동일») */
  const ad0 = await box(page, '.cn-cd:not(.dia)');
  eq('A16 광고 카드와 같은 규격', ad0.w + '×' + ad0.h, cds[0].w + '×' + cds[0].h);

  const ml = await box(page, '.cn-ml');
  near('A17 마일리지 패널 x', ml.x, 66);
  near('A18 마일리지 패널 y', ml.y, 2773);
  near('A19 마일리지 패널 w×h', ml.w * 1000 + ml.h, 948 * 1000 + 236, 0);
  const a2 = await box(page, '.cn-a2');
  eq('A20 §6 배너와 같은 x·폭', a2.x + '/' + a2.w, ml.x + '/' + ml.w);

  /* 겹침·프레임 밖 이탈 0건 */
  const over = await page.evaluate(() => {
    const W = document.querySelector('.cn-wrap').getBoundingClientRect();
    const sel = '.cn-cd.dia, .cn-ml, .cn-rb, .cn-a2, .cn-hd';
    const els = [...document.querySelectorAll(sel)].map(e => {
      const r = e.getBoundingClientRect();
      return { n: e.className, l: r.left - W.left, t: r.top - W.top, r: r.right - W.left, b: r.bottom - W.top };
    });
    const out = [];
    for (const e of els) {
      if (e.l < -0.5 || e.r > W.width + 0.5) out.push('가로 이탈 ' + e.n);
      if (e.t < -0.5 || e.b > W.height + 0.5) out.push('세로 이탈 ' + e.n + ' b=' + Math.round(e.b));
    }
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j];
      const ow = Math.min(a.r, b.r) - Math.max(a.l, b.l), oh = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ow > 1 && oh > 1) out.push('겹침 ' + a.n + ' × ' + b.n + ' (' + Math.round(ow) + '×' + Math.round(oh) + ')');
    }
    return out;
  });
  over.length ? bad('A21 겹침·이탈', over.join(' / ')) : ok('A21 겹침·이탈 0건');
  /* 잉크(글자)가 카드 밖으로 나가지 않는지 — 수량·가격·헤더 */
  const ink = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.cn-cd.dia').forEach(c => {
      const R = c.getBoundingClientRect();
      c.querySelectorAll('.qt, .bt.buy>.pr, .cp').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.left < R.left - 0.5 || r.right > R.right + 0.5)
          out.push(e.className + ' ' + Math.round(r.left - R.left) + '..' + Math.round(r.right - R.left));
      });
    });
    return out;
  });
  ink.length ? bad('A22 잉크 카드 밖 이탈', ink.join(' / ')) : ok('A22 잉크 이탈 0건');
  /* 스크롤로 마지막 요소까지 닿는지 */
  const reach = await page.evaluate(() => {
    const l = document.getElementById('shopList');
    l.scrollTop = l.scrollHeight;
    const r = document.querySelector('.cn-ml').getBoundingClientRect(), L = l.getBoundingClientRect();
    return { visible: r.bottom <= L.bottom + 1 && r.top >= L.top - 1, dy: Math.round(L.bottom - r.bottom) };
  });
  reach.visible ? ok('A23 스크롤 끝에서 마일리지 패널 전체 노출', 'bottom 여백 ' + reach.dy + 'px')
                : bad('A23 스크롤 끝에서 마일리지 패널 전체 노출', 'dy ' + reach.dy);

  /* ---------- B. 기능 (T2 기능 완성 규칙 — 버튼별 «눌렀을 때 무엇이 바뀌는지») ---------- */
  const st = () => page.evaluate(() => ({
    dia: S.dia, mil: S.mileage, paid: S.cnt.paid,
    saveDia: (JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}')).dia,
    saveMil: (JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}')).mileage,
    hud: document.getElementById('diaN').textContent,
    ct: (document.querySelector('.cn-ml>.ct') || {}).textContent,
    barW: Math.round((document.querySelector('.cn-ml>.bar>s') || {}).getBoundingClientRect().width),
    off: document.querySelector('.cn-ml').classList.contains('off'),
    exch: !!document.getElementById('cnExch')
  }));

  const b0 = await st();
  eq('B1 기본 마일리지 = 0', b0.mil, 0);
  eq('B2 쿠폰 0 → 패널 비활성', b0.off + '/' + b0.exch, 'true/false');
  eq('B3 쿠폰 0 → 진행바 0px', b0.barW, 0);
  eq('B4 표시 «0 / 10»', b0.ct, '0 / 10');

  /* B5 구매 버튼 = 결제 준비 중 (재화 변동 0) */
  await page.$eval('[data-diabuy="d1"]', el => el.click());
  await page.waitForTimeout(250);
  const mo = await page.evaluate(() => {
    const m = document.getElementById('modal');
    return { on: getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 0,
             txt: document.getElementById('mbox').textContent,
             ti: (document.getElementById('mtitle') || {}).textContent };
  });
  const b5 = await st();
  (mo.on && /준비 중/.test(mo.txt) && /1,000원/.test(mo.txt) && b5.dia === b0.dia)
    ? ok('B5 [1,000원] 클릭 → «준비 중» 팝업 · 다이아 변동 0', mo.ti + ' / ' + mo.txt.replace(/확인$/, ''))
    : bad('B5 [1,000원] 클릭', JSON.stringify(mo) + ' dia ' + b0.dia + '→' + b5.dia);
  await page.$eval('#okBtn', el => el.click());
  await page.waitForTimeout(150);

  /* B6 쿠폰 상품은 팝업에 쿠폰 안내가 붙는다 */
  await page.$eval('[data-diabuy="d5"]', el => el.click());
  await page.waitForTimeout(250);
  const mo5 = await page.evaluate(() => document.getElementById('mbox').textContent);
  /쿠폰 \+2/.test(mo5) && /110,000원/.test(mo5)
    ? ok('B6 [110,000원] 팝업에 쿠폰 +2 안내', mo5.replace(/확인$/, ''))
    : bad('B6 [110,000원] 팝업', mo5);
  await page.$eval('#okBtn', el => el.click());
  await page.waitForTimeout(150);

  /* B7 디버그 지급(결제 대체) — 쿠폰 없는 상품 */
  await page.evaluate(() => window.devBuyDia('d1'));
  await page.waitForTimeout(700);
  const b7 = await st();
  eq('B7 devBuyDia(d1) 다이아 +1만', b7.dia - b0.dia, 10000);
  eq('B7b 쿠폰 없는 상품 → 마일리지 그대로', b7.mil, 0);
  eq('B7c HUD 갱신', b7.hud, await page.evaluate(() => fmt(S.dia)));
  eq('B7d 저장 반영', b7.saveDia, b7.dia);

  /* B8 쿠폰 지급 — 90만(+1) · 200만(+2) */
  await page.evaluate(() => { window.devBuyDia('d4'); });
  await page.waitForTimeout(400);
  const b8 = await st();
  eq('B8 devBuyDia(d4) 다이아 +90만', b8.dia - b7.dia, 900000);
  eq('B8b 마일리지 +1', b8.mil, 1);
  eq('B8c 진행바 1/10 (410px×.1)', b8.barW, 41);
  eq('B8d 표시 «1 / 10»', b8.ct, '1 / 10');
  eq('B8e 10개 미만 → [교환] 비활성', b8.off + '/' + b8.exch, 'true/false');

  await page.evaluate(() => { window.devBuyDia('d5'); });
  await page.waitForTimeout(400);
  const b9 = await st();
  eq('B9 devBuyDia(d5) 다이아 +200만', b9.dia - b8.dia, 2000000);
  eq('B9b 마일리지 +2 (누적 3)', b9.mil, 3);
  eq('B9c 저장 반영', b9.saveMil, 3);

  /* B10 비활성 [교환] 클릭 → 아무 일도 없다 */
  await page.$eval('.cn-ml>.ex', el => el.click());
  await page.waitForTimeout(300);
  const b10 = await st();
  (b10.dia === b9.dia && b10.mil === b9.mil)
    ? ok('B10 비활성 [교환] 클릭 → 변동 0', 'dia ' + b10.dia + ' / 쿠폰 ' + b10.mil)
    : bad('B10 비활성 [교환] 클릭', 'dia ' + b9.dia + '→' + b10.dia + ' 쿠폰 ' + b9.mil + '→' + b10.mil);

  /* B11 쿠폰 10개 → 활성 */
  await page.evaluate(() => { for (let i = 0; i < 4; i++) window.devBuyDia('d5'); });  /* +8 → 11 */
  await page.waitForTimeout(500);
  const b11 = await st();
  eq('B11 쿠폰 11개', b11.mil, 11);
  eq('B11b 10 이상 → [교환] 활성', b11.off + '/' + b11.exch, 'false/true');
  eq('B11c 진행바 상한(10/10)', b11.barW, 410);

  /* B12 교환 실행 */
  await page.$eval('#cnExch', el => el.click());
  await page.waitForTimeout(400);
  const b12 = await st();
  eq('B12 [교환] → 쿠폰 −10', b11.mil - b12.mil, 10);
  eq('B12b 다이아 +500만', b12.dia - b11.dia, 5000000);
  eq('B12c 저장 반영', b12.saveMil, b12.mil);
  eq('B12d 남은 쿠폰 1 → 다시 비활성', b12.off + '/' + b12.exch, 'true/false');
  const mo12 = await page.evaluate(() => document.getElementById('mbox').textContent);
  /5\.00M/.test(mo12) ? ok('B12e 교환 결과 팝업', mo12.replace(/확인$/, '')) : bad('B12e 교환 결과 팝업', mo12);
  await page.$eval('#okBtn', el => el.click());
  await page.waitForTimeout(150);

  /* B13 HUD·다른 화면 반영 — 재화 탭을 닫고 10 소환 탭 HUD 에서 확인 */
  await page.$eval('#shopCats .shp-ct[data-cat="summon"]', el => el.click());
  await page.waitForTimeout(700);
  const b13 = await page.evaluate(() => ({ hud: document.getElementById('diaN').textContent, dia: fmt(S.dia) }));
  eq('B13 소환 탭 HUD 에도 반영', b13.hud, b13.dia);

  /* B14 새로고침 후에도 유지(저장 구조) */
  await page.reload();
  await page.waitForTimeout(1200);
  const b14 = await page.evaluate(() => ({ mil: S.mileage, dia: S.dia }));
  eq('B14 새로고침 후 마일리지 유지', b14.mil, b12.mil);
  eq('B14b 새로고침 후 다이아 유지', b14.dia >= b12.dia, true);

  /* C. 콘솔 에러 · NaN */
  const badtxt = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/NaN|undefined|Infinity/);
    return m ? m[0] : null;
  });
  badtxt ? bad('C1 화면 텍스트 NaN/undefined', badtxt) : ok('C1 NaN/undefined 없음');
  errs.length ? errs.forEach(e => bad('C2 콘솔 에러', e)) : ok('C2 콘솔 에러 0');
  await ctx.close();

  /* ---------- D. 구버전 세이브 마이그레이션 ----------
     주의: 게임 루프가 5초마다 자동 저장한다(`if(saveT > 5) save()`). 살아 있는 페이지에서
     localStorage 를 고친 뒤 reload 하면 그 사이 자동 저장이 옛 값을 되돌려 놓는다(1회차에 이걸로 오진).
     그래서 **addInitScript 로 페이지 스크립트보다 먼저** 세이브를 심어 결정적으로 만든다. */
  for (const [label, raw] of [
    ['D1 mileage 필드 없음', JSON.stringify({ gold: 500, dia: 777, relic: 0, stage: 3, time: Date.now() })],
    ['D2 mileage:null',      JSON.stringify({ dia: 777, mileage: null, time: Date.now() })],
    ['D3 mileage:"3"(문자열)', JSON.stringify({ dia: 777, mileage: '3', time: Date.now() })]
  ]) {
    const c = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
    await c.addInitScript(v => { try { localStorage.setItem('idle_hunter_save_v4', v); } catch (e) {} }, raw);
    const p = await c.newPage();
    const er = []; p.on('pageerror', e => er.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1200);
    await openCoin(p);
    const r = await p.evaluate(() => ({ mil: S.mileage, dia: S.dia,
      ct: document.querySelector('.cn-ml>.ct').textContent,
      off: document.querySelector('.cn-ml').classList.contains('off') }));
    (r.mil === 0 && r.ct === '0 / 10' && r.off && r.dia === 777 && !er.length)
      ? ok(label + ' → 쿠폰 0 · 옛 진행도 보존', 'dia ' + r.dia + ' / ' + r.ct)
      : bad(label, JSON.stringify(r) + (er.length ? ' err:' + er[0] : ''));
    await c.close();
  }

  await browser.close();

  const w = [2, Math.max(...rows.map(r => r[1].length)), 0];
  rows.forEach(r => console.log(r[0] + ' ' + r[1].padEnd(w[1]) + '  ' + r[2]));
  console.log(fails.length ? '\nVERIFY44 FAIL — ' + fails.length + '건\n' + fails.join('\n')
                           : '\nVERIFY44 PASS — ' + rows.length + '항목');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
