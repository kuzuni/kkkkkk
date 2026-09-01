#!/usr/bin/env node
/* 746 게이트 — «배수를 켜도 소환 가격 숫자가 젬 아이콘·가격 판을 안 파먹는다»
 *
 *   node tools/verify746.js
 *
 * 등재(2026-09-01, 713·735 회차의 비평 2인 잔여): ×100·×1000 에서 가격 잉크가 젬을 파먹고
 * ×1000 은 가격 판 밖으로도 넘쳤다. `probe746` 이 **찍힌 픽셀**로 재현했다(젬 침범 4건 · 판 초과 2건).
 *
 * ⚑ **이 자가 지키는 것은 «작게 만들었다» 가 아니라 «회랑 안에 있다» 다.** 글자 크기를 숫자로
 *   못 박으면 서체가 바뀌는 날 조용히 거짓이 된다 — 그래서 [C] 는 **잉크와 이웃의 관계**를 묻는다.
 *   크기 자체는 [A] 가 «한 벌인가» 만 묻는다(735 규약: 배수마다 달라지면 안 된다).
 *
 * 절:
 *   [A] 선언   — 가격 글자가 **네 상태 한 벌**이고(735 이관) 상자가 가용 회랑과 같다
 *   [B] 이웃   — `.sm-b1`(FREE 버튼)은 안 건드렸다 — 746 의 스코프는 값을 치르는 두 버튼뿐
 *   [C] 회랑   — 배수 4상태 × 버튼 2개에서 **젬 잉크 우변 ↔ 판 우변** 안에 여유 ≥ 3px 로 들어온다
 *   [D] 세로   — 글자를 줄여도 가격 잉크가 알약 안 세로 중심에서 3px 넘게 안 처진다
 *   [E] 짧은 프레임 — 1600 에서도 최악 상태(×1000)가 같은 회랑 안이다
 *   [R] 되돌림 — 수리 전 값(fs 33 · top 65 · left 61/w 146)을 주입하면 [C] 가 곧바로 빨개진다
 *
 * ⚠ 잉크는 **찍힌 픽셀**로 잰다(368 교훈) — `-webkit-text-stroke:6px` 이 글리프 바깥으로 3px 더
 *   나가므로 advance 상자로 재면 침범이 과소평가되고, 젬은 SVG 라 상자와 잉크가 또 다르다.
 * ⚠ 재기 전에 애니메이션을 얼린다 — 122 쥬시가 두 캡처 사이에 한 프레임 움직이면 그 픽셀이
 *   통째로 차분에 섞인다(probe746 1회차에 b3 잉크 높이만 9px 튀었다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const PAD = 14;
const MIN_GAP = 3;   /* 등재문이 «0~1px 겹침» 을 결함으로 세었다 — 그 두 배 이상을 요구한다 */
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const RECT = (sel) => {
  const e = document.querySelector(sel); if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
const VIS = ([sel, v]) => { const e = document.querySelector(sel); if (e) e.style.visibility = v; };
const DIFF = async ([a, b, tol]) => {
  const load = async (s) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
  };
  const A = await load(a), B = await load(b);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
    const i = (y * A.W + x) * 4;
    const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
    if (dd > tol) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, n } : null;
};

const BTN = [{ k: 'b2(10회)', host: '#sumB10', cost: '#sumB10c' },
             { k: 'b3(30회)', host: '#sumB30', cost: '#sumB30c' }];

(async () => {
  const browser = await launch(chromium);
  const calc = await browser.newPage(); await calc.setContent('<body></body>');

  async function open(H) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function'
      && typeof SUM_MULS !== 'undefined');
    await page.waitForTimeout(300);
    await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
    await page.evaluate(() => {
      S.dia = 1e12; S.relic = 1e12;
      doSummon((typeof gmBan === 'function' && gmBan()) || 'weapon', 10);
    });
    await page.waitForFunction(() => {
      const r = document.querySelector('.sm-panel').getBoundingClientRect();
      const k = r.top.toFixed(2) + ',' + r.height.toFixed(2);
      if (window.__k746 === k) return (window.__n746 = (window.__n746 || 0) + 1) >= 3;
      window.__k746 = k; window.__n746 = 0; return false;
    }, null, { timeout: 8000 });
    await page.evaluate(() => { if (typeof sumFxClear === 'function') sumFxClear(); });
    await page.waitForTimeout(600);
    await page.addStyleTag({ content:
      '*,*::before,*::after{animation:none!important;transition:none!important}' });
    await page.waitForTimeout(120);
    return { ctx, page };
  }

  async function ink(page, sel) {
    const r = await page.evaluate(RECT, sel);
    if (!r) return null;
    const clip = { x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
      width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2) };
    const on = (await page.screenshot({ clip })).toString('base64');
    await page.evaluate(VIS, [sel, 'hidden']);
    const off = (await page.screenshot({ clip })).toString('base64');
    await page.evaluate(VIS, [sel, '']);
    const d = await calc.evaluate(DIFF, [on, off, 12]);
    return d ? { l: clip.x + d.x0, r: clip.x + d.x0 + d.w - 1, w: d.w, h: d.h,
                 cy: clip.y + d.y0 + (d.h - 1) / 2 } : null;
  }

  async function scan(page, muls) {
    const rows = [];
    for (const m of muls) {
      await page.evaluate((mm) => {
        document.querySelector('#sumMulBar [data-mul="' + mm + '"]').click();
      }, m);
      await page.waitForTimeout(120);
      for (const b of BTN) {
        const host = await page.evaluate(RECT, b.host);
        const pan = await page.evaluate(RECT, b.host + ' .pan');
        const gem = await ink(page, b.host + ' .gem');
        const cost = await ink(page, b.cost);
        if (!gem || !cost || !pan) continue;
        rows.push({ m, k: b.k,
          txt: await page.evaluate((s) => (document.querySelector(s).textContent || '').trim(), b.cost),
          gapGem: +(cost.l - gem.r).toFixed(1),
          gapPan: +(pan.x + pan.w - 1 - cost.r).toFixed(1),
          dy: +(cost.cy - pan.y - pan.h / 2 + 0.5).toFixed(1) });
      }
    }
    return rows;
  }

  /* ── 2280 ──────────────────────────────────────────────────────────── */
  const { ctx, page } = await open(2280);

  /* [A] 선언 */
  {
    const st = await page.evaluate(() => {
      const g = s => getComputedStyle(document.querySelector(s));
      const b2 = g('#sumB10c'), b3 = g('#sumB30c'), host = document.getElementById('sumB10');
      const hr = host.getBoundingClientRect(), cr = document.getElementById('sumB10c').getBoundingClientRect();
      return { fs2: b2.fontSize, fs3: b3.fontSize, top: b2.top, w: b2.width,
        left: +(cr.left - hr.left).toFixed(1), right: +(cr.right - hr.left).toFixed(1) };
    });
    ok(st.fs2 === st.fs3, '[A1] 두 버튼의 가격 글자 크기가 한 벌이다', st.fs2 + ' / ' + st.fs3);
    /* 회랑 = 젬 잉크 우변(면 75) ↔ 판 우변(면 217). 상자가 그 회랑과 같아야 오른쪽 여유를 안 논다. */
    ok(Math.abs(st.left - 75) <= 1 && Math.abs(st.right - 217) <= 1.5,
      '[A2] 가격 상자가 **가용 회랑**(면 75..217)과 같다',
      st.left + '..' + st.right + ' (w ' + st.w + ' · top ' + st.top + ')');
  }
  /* [B] 스코프 — FREE 버튼은 746 이 안 건드린다 */
  {
    const f = await page.evaluate(() => {
      const g = getComputedStyle(document.getElementById('sumBFn'));
      const h = document.getElementById('sumBF').getBoundingClientRect();
      const r = document.getElementById('sumBFn').getBoundingClientRect();
      return { fs: g.fontSize, left: +(r.left - h.left).toFixed(1), w: g.width };
    });
    ok(f.fs === '35px' && Math.abs(f.left - 88) <= 1 && f.w === '132px',
      '[B] FREE 버튼(`.sm-b1`) 가격 칸은 746 스코프 밖 — 값이 그대로다',
      'fs ' + f.fs + ' · left ' + f.left + ' · w ' + f.w);
  }

  /* [C][D] 회랑·세로 — 배수 4상태 × 버튼 2개 */
  const rows = await scan(page, [1, 10, 100, 1000]);
  for (const r of rows)
    console.log(`     ×${String(r.m).padEnd(4)} ${r.k} ${r.txt.padStart(10)}`
      + ` — 젬 여유 ${String(r.gapGem).padStart(5)} · 판 여유 ${String(r.gapPan).padStart(5)} · Δy ${r.dy}`);
  {
    const bad = rows.filter(r => r.gapGem < MIN_GAP);
    ok(rows.length === 8 && !bad.length,
      `[C1] 가격 잉크가 **젬 잉크를 안 파먹는다**(8상태 · 여유 ≥ ${MIN_GAP}px)`,
      bad.length ? bad.map(r => `×${r.m} ${r.k} ${r.gapGem}`).join(' · ')
                 : '표본 ' + rows.length + ' · 최악 ' + Math.min(...rows.map(r => r.gapGem)) + 'px');
  }
  {
    const bad = rows.filter(r => r.gapPan < MIN_GAP);
    ok(rows.length === 8 && !bad.length,
      `[C2] 가격 잉크가 **가격 판 밖으로 안 넘친다**(8상태 · 여유 ≥ ${MIN_GAP}px)`,
      bad.length ? bad.map(r => `×${r.m} ${r.k} ${r.gapPan}`).join(' · ')
                 : '표본 ' + rows.length + ' · 최악 ' + Math.min(...rows.map(r => r.gapPan)) + 'px');
  }
  {
    /* 전제 — 이 자가 «이미 참인 것» 을 굳히고 있지 않다는 표시. ×1 은 넉넉하고 ×1000 이 최악이다.
       (338 교훈: 게이트가 처음부터 초록이면 아무것도 안 지킨다) */
    const w1 = rows.filter(r => r.m === 1).map(r => r.gapGem);
    const wK = rows.filter(r => r.m === 1000).map(r => r.gapGem);
    ok(Math.min(...w1) > Math.max(...wK) + 10,
      '[전제] ×1000 이 최악 상태다 — 이 자가 재는 축이 실제로 배수를 탄다',
      '×1 여유 ' + w1.join('/') + ' vs ×1000 ' + wK.join('/'));
  }
  {
    const bad = rows.filter(r => Math.abs(r.dy) > 3);
    ok(!bad.length, '[D] 가격 잉크가 알약 안 세로 중심에서 3px 넘게 안 처진다',
      bad.length ? bad.map(r => `×${r.m} ${r.k} ${r.dy}`).join(' · ')
                 : '|Δy| 최대 ' + Math.max(...rows.map(r => Math.abs(r.dy))));
  }

  /* [R] 되돌림 — 수리 전 값을 주입하면 [C] 가 빨개져야 한다 */
  {
    const tag = await page.addStyleTag({ content:
      '.sm-b .cost{top:65px!important;font-size:33px!important}'
      + '.sm-b2 .cost,.sm-b3 .cost{left:61px!important;width:146px!important}' });
    await page.waitForTimeout(120);
    const rb = await scan(page, [100, 1000]);
    await tag.evaluate((n) => n.remove());
    await page.waitForTimeout(120);
    const g = rb.filter(r => r.gapGem < 0), p = rb.filter(r => r.gapPan < 0);
    ok(g.length >= 4 && p.length >= 2,
      '[R] 되돌림 — 수리 전 값(fs 33 · top 65 · left 61/w 146)에서 침범·초과가 **돌아온다**',
      `젬 침범 ${g.length}건 · 판 초과 ${p.length}건`);
  }
  await ctx.close();

  /* ── [E] 1600(9:13.3) — 최악 상태만 ────────────────────────────────── */
  {
    const s = await open(1600);
    const r16 = await scan(s.page, [1000]);
    const bad = r16.filter(r => r.gapGem < MIN_GAP || r.gapPan < MIN_GAP);
    ok(r16.length === 2 && !bad.length,
      '[E] 1600(9:13.3) 프레임에서도 ×1000 이 같은 회랑 안이다',
      bad.length ? bad.map(r => `${r.k} 젬 ${r.gapGem} 판 ${r.gapPan}`).join(' · ')
                 : r16.map(r => `${r.k} 젬 ${r.gapGem}/판 ${r.gapPan}`).join(' · '));
    await s.ctx.close();
  }

  await browser.close();
  console.log('\nVERIFY746 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
