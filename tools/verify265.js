/* 게이트 — 작업 265 「행운 룰렛 팝업 글씨를 22 퀘스트 팝업 급으로」
 *
 * 주인 지시: «룰렛 팝업 글씨가 너무 작다 — 22 퀘스트 팝업 글씨 크기에 맞출 것».
 * 이 게이트가 지키는 것은 네 가지다.
 *   [A] 룰렛 네 자리(세그먼트 텍스트·값 · 안내줄 · 결과줄)의 실제 px
 *   [B] 그 값이 **22 의 대응 자리 이상**인지 — 22 를 live 로 읽어서 비교한다(22 가 바뀌면 같이 따라간다)
 *   [C] A5 공용 `.mbody p`(24px) 가 안 커졌는지 — 265 는 룰렛 안에만 갇혀야 한다(등재문 주의 ⓐ)
 *   [D] 세그먼트 라벨이 45° 조각 밖으로 안 나가는지 — 8칸 × 2줄 전부(등재문 주의 ⓑ)
 *   [E] 라벨 블록이 원판 안 · 허브 밖   [F] 콘솔/런타임 에러 0 · 결과줄이 한 줄로 유지
 *
 * 되돌림 시험: `.rlt-tx` 23px · `.rlt-vl` 26px · `#rouGuide/#rouRes` 24px 로 되돌리면 [A][B] 8건이 빨개진다.
 *
 *   node tools/verify265.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m); };
const near = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 0.01 : t);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, totalKills: 1000, best: 12, summons: 500, upgrades: 3000 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* ── 룰렛 ── */
  await page.evaluate(() => openRoulette());
  await page.waitForTimeout(450);
  const R = await page.evaluate(() => {
    const fs = s => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : -1; };
    /* 캔버스 계측 — 회전된 세그먼트라 rect 는 기울어져 못 쓴다. 글리프 advance 를 직접 잰다. */
    const cv = document.createElement('canvas'), c2 = cv.getContext('2d');
    const ink = el => {
      const s = getComputedStyle(el);
      c2.font = s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize + '/' + s.lineHeight + ' ' + s.fontFamily;
      const ls = parseFloat(s.letterSpacing) || 0, t = el.textContent || '';
      const sx = (s.transform && s.transform !== 'none') ? Math.abs(parseFloat(s.transform.split('(')[1])) : 1;
      return (c2.measureText(t).width + ls * t.length) * sx;
    };
    const rlt = document.querySelector('#modal .rlt').getBoundingClientRect();
    const Rr = rlt.width / 2, TAN = Math.tan(22.5 * Math.PI / 180);
    const discR = document.querySelector('#rouDisc').getBoundingClientRect().width / 2;
    const hubR = document.querySelector('#modal .rlt-hub').getBoundingClientRect().width / 2;
    const sg0 = document.querySelector('#rouDisc .rlt-seg'), lb0 = sg0.querySelector('.rlt-lb');
    const band = sel => { const e = sg0.querySelector(sel);
      const top = lb0.offsetTop + e.offsetTop; return { top, bot: top + e.offsetHeight }; };
    const bTx = band('.rlt-tx'), bVl = band('.rlt-vl'), bIc = band('.rlt-ic');
    const avail = y => 2 * (Rr - y) * TAN;
    const segs = [];
    document.querySelectorAll('#rouDisc .rlt-seg').forEach((sg, i) => segs.push({
      i, tx: ink(sg.querySelector('.rlt-tx')), vl: ink(sg.querySelector('.rlt-vl')),
      txT: sg.querySelector('.rlt-tx').textContent, vlT: sg.querySelector('.rlt-vl').textContent }));
    return {
      fsTx: fs('#rouDisc .rlt-tx'), fsVl: fs('#rouDisc .rlt-vl'),
      fsGuide: fs('#rouGuide'), fsRes: fs('#rouRes'),
      minH: parseFloat(getComputedStyle(document.querySelector('#rouRes')).minHeight),
      Rr, discR, hubR, bIc, bTx, bVl, availTx: avail(bTx.bot), availVl: avail(bVl.bot), segs,
      lbBot: bVl.bot, lbTop: bIc.top
    };
  });

  /* ── 22 퀘스트(기준) ── */
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="quest"]').click());
  await page.waitForTimeout(550);
  const Q = await page.evaluate(() => {
    const fs = s => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : -1; };
    return { qst: fs('.qs-t'), qsb: fs('.qs-b b'), qsall: fs('.qs-all b') };
  });

  /* ── A5 공용 팝업(오염 검사) ── */
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(200);
  const M = await page.evaluate(() => {
    popup('265 오염 검사', '<p id="probe265">본문</p>');
    const p = document.querySelector('#modal .mbody p');
    return { fs: parseFloat(getComputedStyle(p).fontSize), guideGone: !document.querySelector('#rouGuide') };
  });
  await page.evaluate(() => closeModal());

  /* ── 결과줄(가장 긴 «1,000» 당첨) ── */
  await page.waitForTimeout(150);
  await page.evaluate(() => openRoulette());
  await page.waitForTimeout(350);
  const F = await page.evaluate(() => {
    roulFinish(ROULETTE.length - 1);
    const r = document.getElementById('rouRes'), b = r.getBoundingClientRect();
    const mb = document.querySelector('#modal .mbody').getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(r).lineHeight);
    return { txt: r.textContent.trim(), h: b.height, lh, w: b.width, inMbody: b.left >= mb.left - .5 && b.right <= mb.right + .5 };
  });

  console.log('\n[A] 룰렛 네 자리 실제 px');
  ok(near(R.fsTx, 35),   'A1 .rlt-tx = 35px (23 → 35)                 실측 ' + R.fsTx);
  ok(near(R.fsVl, 37.5), 'A2 .rlt-vl = 37.5px (26 → 37.5)             실측 ' + R.fsVl);
  ok(near(R.fsGuide, 35), 'A3 #rouGuide(안내줄) = 35px (24 → 35)       실측 ' + R.fsGuide);
  ok(near(R.fsRes, 35),  'A4 #rouRes(결과줄) = 35px (24 → 35)         실측 ' + R.fsRes);
  ok(near(R.minH, 60),   'A5 #rouRes min-height = 60px (35×1.7 한 줄)  실측 ' + R.minH);

  console.log('\n[B] 22 퀘스트 기준 이상 (22 를 live 로 읽어 비교)');
  ok(R.fsTx >= Q.qst - .01,    'B1 .rlt-tx  ≥ .qs-t   ' + R.fsTx + ' ≥ ' + Q.qst);
  ok(R.fsVl >= Q.qsb - .01,    'B2 .rlt-vl  ≥ .qs-b b ' + R.fsVl + ' ≥ ' + Q.qsb);
  ok(R.fsGuide >= Q.qst - .01, 'B3 안내줄   ≥ .qs-t   ' + R.fsGuide + ' ≥ ' + Q.qst);
  ok(R.fsRes >= Q.qst - .01,   'B4 결과줄   ≥ .qs-t   ' + R.fsRes + ' ≥ ' + Q.qst);

  console.log('\n[C] A5 공용 오염 없음 (룰렛 밖은 그대로 24px)');
  ok(near(M.fs, 24), 'C1 일반 팝업 .mbody p = 24px 유지            실측 ' + M.fs);
  ok(M.guideGone,    'C2 #rouGuide 는 룰렛 팝업에서만 존재');

  console.log('\n[D] 45° 조각 안 — 8칸 × 2줄');
  R.segs.forEach(s => {
    ok(s.tx <= R.availTx, 'D' + (s.i * 2 + 1) + ' seg' + s.i + ' 텍스트 «' + s.txT + '» 잉크 '
      + s.tx.toFixed(1) + ' ≤ 가용 ' + R.availTx.toFixed(1));
    ok(s.vl <= R.availVl, 'D' + (s.i * 2 + 2) + ' seg' + s.i + ' 값 «' + s.vlT + '» 잉크 '
      + s.vl.toFixed(1) + ' ≤ 가용 ' + R.availVl.toFixed(1));
  });

  console.log('\n[E] 라벨 블록 기하');
  ok(R.lbTop >= R.Rr - R.discR, 'E1 라벨 위끝이 원판 안 (' + R.lbTop + ' ≥ ' + (R.Rr - R.discR) + ')');
  ok(R.lbBot <= R.Rr - R.hubR,  'E2 라벨 아래끝이 허브 밖 (' + R.lbBot + ' ≤ ' + (R.Rr - R.hubR) + ')');

  console.log('\n[F] 결과줄 · 에러');
  ok(F.txt.indexOf('획득') === 0, 'F1 당첨 결과줄이 그려진다 «' + F.txt + '»');
  ok(F.h <= F.lh + 1,             'F2 결과줄이 한 줄로 유지 (h ' + F.h.toFixed(1) + ' ≤ lh ' + F.lh + ')');
  ok(F.inMbody,                   'F3 결과줄이 본문 폭 안');
  ok(errs.length === 0,           'F4 콘솔/런타임 에러 0건 ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : ''));

  console.log('\nVERIFY265 ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
