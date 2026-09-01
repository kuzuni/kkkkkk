#!/usr/bin/env node
/* 746 재현 — «×100·×1000 에서 소환 가격 숫자가 젬 아이콘·가격 판을 파먹는다»
 *
 *   node tools/probe746.js            현행 트리 + 되돌림 사본(수리 전 값 주입)
 *   node tools/probe746.js --sweep    글자 크기 후보를 훑어 «최악 상태 여유» 표만 찍는다
 *
 * 등재문(PROGRESS 746 · `docs/review/735-배수토글기하고정.md` §5)은 **비평가 2인의 눈**과
 * 그때 잰 수치를 근거로 삼았다. 338 규칙대로 처방을 따르기 전에 **찍힌 픽셀**로 다시 물었다.
 *
 *   [1] 되돌림 — 수리 전 값(fs 33 · top 65 · left 61/w 146)을 주입하면 침범·초과가 **돌아오는가**
 *   [2] 현행   — 배수 4상태 × 버튼 2개에서 젬 침범 0 · 판 초과 0 이고 여유가 문턱 이상인가
 *   [3] 세로   — 글자를 줄여도 가격 잉크가 알약 안 세로 중심에서 안 처지는가
 *
 * ⚑ 잉크는 «상자» 가 아니라 **찍힌 픽셀**로 잰다(368 교훈) — `-webkit-text-stroke:6px` 이
 *   글리프 바깥으로 3px 더 나가므로 advance 상자로는 침범이 과소평가된다.
 *   방법은 cal356r16 과 같다: 보이는 캡처 ↔ `visibility:hidden` 캡처의 차분 bbox.
 * ⚠ **재기 전에 애니메이션을 얼린다** — 122 쥬시(상시 연출)가 두 캡처 사이에 한 프레임 움직이면
 *   그 픽셀이 통째로 차분에 섞여 잉크 상자가 9px 씩 커진다(1회차에 실제로 b3 만 h34 로 튀었다).
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
const SWEEP = process.argv.includes('--sweep');
/* 문턱 — 등재문이 «0~1px 겹침» 을 결함으로 세었으므로 그 두 배 이상을 요구한다. */
const MIN_GAP = 3;
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
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
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
  /* 쥬시·등장 연출을 얼린다(위 ⚠). 팝업이 이미 앉은 뒤라 자리는 안 움직인다. */
  await page.addStyleTag({ content:
    '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.waitForTimeout(120);

  async function ink(sel) {
    const r = await page.evaluate(RECT, sel);
    if (!r) return null;
    const clip = { x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
      width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2) };
    const on = (await page.screenshot({ clip })).toString('base64');
    await page.evaluate(VIS, [sel, 'hidden']);
    const off = (await page.screenshot({ clip })).toString('base64');
    await page.evaluate(VIS, [sel, '']);
    const d = await calc.evaluate(DIFF, [on, off, 12]);
    return d ? { l: clip.x + d.x0, r: clip.x + d.x0 + d.w - 1, w: d.w,
                 h: d.h, cy: clip.y + d.y0 + (d.h - 1) / 2 } : null;
  }

  /* 배수 4상태 × 버튼 2개를 훑어 «버튼 좌변 기준» 상대좌표로 돌려준다 */
  async function scan() {
    const rows = [];
    for (const m of [1, 10, 100, 1000]) {
      await page.evaluate((mm) => {
        document.querySelector('#sumMulBar [data-mul="' + mm + '"]').click();
      }, m);
      await page.waitForTimeout(120);
      for (const b of BTN) {
        const host = await page.evaluate(RECT, b.host);
        const pan = await page.evaluate(RECT, b.host + ' .pan');
        const gem = await ink(b.host + ' .gem');
        const cost = await ink(b.cost);
        const txt = await page.evaluate((s) => (document.querySelector(s).textContent || '').trim(), b.cost);
        if (!gem || !cost || !pan) continue;
        const O = host.x;
        rows.push({ m, k: b.k, txt,
          gemR: +(gem.r - O).toFixed(1), costL: +(cost.l - O).toFixed(1), costR: +(cost.r - O).toFixed(1),
          costW: cost.w, costH: cost.h, panR: +(pan.x + pan.w - 1 - O).toFixed(1),
          panL: +(pan.x - O).toFixed(1),
          gapGem: +(cost.l - gem.r).toFixed(1), gapPan: +(pan.x + pan.w - 1 - cost.r).toFixed(1),
          dy: +(cost.cy - pan.y - pan.h / 2 + 0.5).toFixed(1) });
      }
    }
    return rows;
  }
  const table = (rows) => {
    console.log('배수 | 버튼 | 가격 | 젬 우변 | 가격 잉크 | 판 | 젬 여유 | 판 여유 | 잉크h | 알약중심Δy');
    for (const r of rows)
      console.log(`×${String(r.m).padEnd(4)} | ${r.k} | ${r.txt.padStart(10)} | ${String(r.gemR).padStart(6)}`
        + ` | ${String(r.costL).padStart(6)}..${String(r.costR).padEnd(6)}(w${r.costW})`
        + ` | ${r.panL}..${r.panR} | ${String(r.gapGem).padStart(7)} | ${String(r.gapPan).padStart(7)}`
        + ` | ${String(r.costH).padStart(5)} | ${String(r.dy).padStart(9)}`);
  };

  /* ── 훑기 모드: 글자 크기 후보별 «최악 상태 여유» 만 본다 ─────────────── */
  if (SWEEP) {
    for (const fs of [21, 22, 23, 24, 25]) {
      await page.addStyleTag({ content: `.sm-b2 .cost,.sm-b3 .cost{font-size:${fs}px!important}` });
      await page.waitForTimeout(80);
      const rows = await scan();
      const wg = Math.min(...rows.map(r => r.gapGem)), wp = Math.min(...rows.map(r => r.gapPan));
      const w = Math.max(...rows.map(r => r.costW));
      console.log(`fs ${fs} — 최악 젬 여유 ${wg} · 최악 판 여유 ${wp} · 최장 잉크 폭 ${w}`);
    }
    await ctx.close(); await browser.close(); process.exit(0);
  }

  /* ── [1] 되돌림 사본 — 수리 전 값을 주입하면 결함이 돌아와야 한다 ────── */
  const RB = await page.addStyleTag({ content:
    '.sm-b .cost{top:65px!important;font-size:33px!important}'
    + '.sm-b2 .cost,.sm-b3 .cost{left:61px!important;width:146px!important}' });
  await page.waitForTimeout(120);
  const before = await scan();
  console.log('\n── 되돌림 사본(수리 전 값 · fs 33 · top 65 · left 61/w 146)');
  table(before);
  {
    const g = before.filter(r => r.gapGem < 0), p = before.filter(r => r.gapPan < 0);
    ok(g.length > 0 && p.length > 0,
      '[1] 되돌림 — 수리 전 값에서 젬 침범·판 초과가 **돌아온다**',
      `젬 침범 ${g.length}건(${g.map(r => '×' + r.m + ' ' + r.gapGem).join(' ')})`
      + ` · 판 초과 ${p.length}건(${p.map(r => '×' + r.m + ' ' + r.gapPan).join(' ')})`);
  }
  await page.evaluate((id) => { const e = document.querySelector('style[data-746]'); if (e) e.remove(); }, null)
    .catch(() => {});
  await RB.evaluate((node) => node.remove());
  await page.waitForTimeout(120);

  /* ── [2][3] 현행 트리 ──────────────────────────────────────────────── */
  const now = await scan();
  console.log('\n── 현행 트리');
  table(now);
  {
    const bad = now.filter(r => r.gapGem < MIN_GAP);
    ok(!bad.length, `[2-a] 현행 — 가격 잉크가 젬 잉크를 안 파먹는다(여유 ≥ ${MIN_GAP}px)`,
      bad.length ? bad.map(r => `×${r.m} ${r.k} ${r.gapGem}`).join(' · ')
                 : '8상태 최악 여유 ' + Math.min(...now.map(r => r.gapGem)) + 'px');
  }
  {
    const bad = now.filter(r => r.gapPan < MIN_GAP);
    ok(!bad.length, `[2-b] 현행 — 가격 잉크가 가격 판 밖으로 안 넘친다(여유 ≥ ${MIN_GAP}px)`,
      bad.length ? bad.map(r => `×${r.m} ${r.k} ${r.gapPan}`).join(' · ')
                 : '8상태 최악 여유 ' + Math.min(...now.map(r => r.gapPan)) + 'px');
  }
  {
    const bad = now.filter(r => Math.abs(r.dy) > 3);
    ok(!bad.length, '[3] 세로 — 가격 잉크가 알약 안 세로 중심에서 3px 넘게 안 처진다',
      bad.length ? bad.map(r => `×${r.m} ${r.k} Δy ${r.dy}`).join(' · ')
                 : '8상태 |Δy| 최대 ' + Math.max(...now.map(r => Math.abs(r.dy))));
  }

  await ctx.close(); await browser.close();
  console.log('\nprobe746: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
