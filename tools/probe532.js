#!/usr/bin/env node
/* 532 재현기 — `verify25.js` 108행 즉사(`#eqw .eqil` = null)의 뿌리를 «찍힌 DOM» 으로 가른다.
 *
 * 등재문의 갈래 둘을 직접 갈라 본다:
 *   ⓐ 이름·조상이 옮겨져 `#eqw .eqil` 스코프에 없다
 *   ⓑ 「선택된 장비가 있을 때만」 그려서 부팅 세이브에서는 자리가 빈다
 * 그리고 자가 기대하는 상자 [45,495,640,831] 이 지금 무엇이 차지하고 있는지를 잰다.
 *
 * 실행: node tools/probe532.js   (통과 = PROBE PASS)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const fails = [];
const fail = (m) => { fails.push(m); console.log('  X ' + m); };
const ok = (m) => console.log('  o ' + m);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.click('.tab[data-t="hero"]');
  await page.waitForTimeout(500);

  /* 캔버스는 file:// 스프라이트로 tainted 라 getImageData 가 막힌다(350 교훈).
   * 그래서 «찍힌 픽셀» 은 요소 스크린샷을 data URL 로 페이지에 되돌려 읽는다. */
  const inkOf = async (sel) => {
    const el = await page.$(sel);
    if (!el) return null;
    const buf = await el.screenshot({ type: 'png' });
    return page.evaluate(async (b64) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 8) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { n, box: n ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null, w: c.width, h: c.height };
    }, buf.toString('base64'));
  };

  const snap = () => page.evaluate(() => {
    const scale = document.getElementById('app').getBoundingClientRect().width / 1080;
    const base = document.querySelector('#eqw .eqp').getBoundingClientRect();
    const R = (sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return [Math.round((r.left - base.left) / scale), Math.round((r.top - base.top) / scale),
              Math.round(r.width / scale), Math.round(r.height / scale)];
    };
    const cv = document.querySelector('#eqw .eqil-cv');
    return {
      eqil: R('#eqw .eqil'),
      eqilCv: R('#eqw .eqil-cv'),
      eqilAnywhere: !!document.querySelector('.eqil'),
      cvParent: cv ? cv.parentElement.className : null,
      cvInEqw: !!document.querySelector('#eqw .eqil-cv'),
      nCv: document.querySelectorAll('.eqil-cv').length,
      eqc: R('#eqw .eqc'), rb: R('#eqw .eqrb'), sta: R('#eqw .eqst.a'),
      cvWH: cv ? [cv.width, cv.height] : null,
      // 자가 기대하는 상자 [45,495,640,831] 의 중심에 실제로 무엇이 있나
      atCenter: (() => {
        const r = document.querySelector('#eqw .eqp').getBoundingClientRect();
        const s = document.getElementById('app').getBoundingClientRect().width / 1080;
        const el = document.elementFromPoint(r.left + (45 + 320) * s, r.top + (495 + 415) * s);
        return el ? el.className || el.tagName : null;
      })(),
    };
  });

  console.log('[1] 부팅 세이브(장비 미보유) — 갈래 ⓐ/ⓑ 가르기');
  const a = await snap();
  a.drawn = await inkOf('#eqw .eqil-cv');
  console.log('  · #eqw .eqil        = ' + JSON.stringify(a.eqil));
  console.log('  · #eqw .eqil-cv     = ' + JSON.stringify(a.eqilCv));
  console.log('  · .eqil (조상 무관)  = ' + a.eqilAnywhere);
  console.log('  · .eqil-cv 개수      = ' + a.nCv + ' · 부모 class = ' + a.cvParent);
  console.log('  · 캔버스 잉크        = ' + JSON.stringify(a.drawn));
  console.log('  · 기대 상자 중심의 요소 = ' + a.atCenter);

  if (a.eqil === null) ok('재현: `#eqw .eqil` 은 null — 자가 죽는 조건 그대로다');
  else fail('재현 실패: `#eqw .eqil` 이 ' + JSON.stringify(a.eqil));

  // ⓐ vs ⓑ — 이름이 옮겨진 것인가, 상태에 따라 안 그려지는 것인가
  if (a.eqilAnywhere === false && a.nCv === 1) ok('갈래 ⓐ 확정: `.eqil` 은 문서 어디에도 없고 `.eqil-cv` 가 1개 있다(이름이 옮겨졌다)');
  else fail('갈래 ⓐ 불확정: .eqil=' + a.eqilAnywhere + ' / .eqil-cv ' + a.nCv + '개');
  if (a.cvInEqw) ok('조상은 그대로 `#eqw` 안이다(스코프 이탈 아님)');
  else fail('`.eqil-cv` 가 `#eqw` 밖에 있다');
  if (a.drawn && a.drawn.n > 0) ok('갈래 ⓑ 기각: 부팅 세이브에서도 캔버스에 잉크가 ' + a.drawn.n + 'px 그려져 있다');
  else fail('갈래 ⓑ 가능: 부팅 세이브에서 캔버스가 비어 있다 ' + JSON.stringify(a.drawn));

  console.log('[2] 자가 기대하는 상자와 실측 상자');
  console.log('  · 기대(2회차) [45,495,640,831] / 실측 .eqil-cv ' + JSON.stringify(a.eqilCv));
  if (a.eqilCv && a.eqilCv[0] === 45 && a.eqilCv[2] === 640 && a.eqilCv[3] === 831) ok('좌·폭·높이는 기대와 같다');
  else fail('좌·폭·높이가 기대와 다르다 ' + JSON.stringify(a.eqilCv));

  console.log('[3] 파생값(§2 D5·D8) — 실측 상자로 다시 계산');
  if (a.eqilCv) {
    const gapRibIl = a.eqilCv[1] - (a.rb[1] + a.rb[3]);
    const pct = Math.round(gapRibIl / a.eqc[3] * 100);
    const gapPill = a.sta[1] - (a.eqilCv[1] + a.eqilCv[3]);
    console.log('  · D5 리본 하단 → 일러스트 상단 = ' + gapRibIl + 'px (' + pct + '%)');
    console.log('  · D8 일러스트 하단 → 스탯 알약 상단 = ' + gapPill + 'px');
  }

  console.log('[4] 장비를 실제로 장착해도 같은 상자인가(ⓑ 의 나머지 반쪽)');
  await page.evaluate(() => {
    // 무기 1개를 지급·장착해 «선택된 장비가 있는» 상태를 만든다
    if (typeof S !== 'undefined' && S.eq) { S.eq.weapon = S.eq.weapon || {}; }
    if (typeof syncEquipPage === 'function') { eqPageOn = true; syncEquipPage(); }
  });
  await page.waitForTimeout(300);
  const b = await snap();
  b.drawn = await inkOf('#eqw .eqil-cv');
  console.log('  · .eqil-cv = ' + JSON.stringify(b.eqilCv) + ' · 잉크 ' + (b.drawn ? b.drawn.n : null) + 'px');
  if (b.eqilCv && JSON.stringify(b.eqilCv) === JSON.stringify(a.eqilCv)) ok('장착 상태와 무관하게 같은 상자다(ⓑ 완전 기각)');
  else fail('상태에 따라 상자가 달라진다 ' + JSON.stringify(b.eqilCv));

  console.log('[5] 콘솔 에러');
  if (errs.length === 0) ok('pageerror 0건'); else fail('pageerror ' + errs.length + '건: ' + errs.join(' | '));

  await browser.close();
  const total = 8;
  console.log('\n' + (fails.length ? 'PROBE FAIL — ' + fails.length + '건' : 'PROBE PASS') + ' (' + (total - fails.length) + '/' + total + ')');
  process.exit(fails.length ? 1 : 0);
})();
