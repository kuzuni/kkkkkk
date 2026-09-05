#!/usr/bin/env node
/* 작업 915 — `verify886` [3] 플레이키 재현자
 *
 *   node tools/probe915.js              # 기본: 1600 을 N판(기본 6) 돌려 «2화소» 를 잡는다
 *   node tools/probe915.js --n 10       # 판 수
 *   node tools/probe915.js --frames 1600,2280
 *   node tools/probe915.js --only R     # 되돌림 시험(옛 자 ↔ 새 자 를 같은 화소 위에서 가른다)
 *
 * ── 무엇을 재는가 ──────────────────────────────────────────────────────────────
 * `verify886` [3] 은 «지면선(`--rw-fl`) 아래 40px 창에 바의 잉크가 0 화소» 를 약속한다.
 * 등재문(915) 실측: 무변경 트리 5회에 **2회** 1600 에서 «2화소»(잡음 0)로 빨강.
 * 이 자는 그 [3] 의 화소 셈을 **그대로** 복제하되 셈만 하지 않고 다음을 같이 찍는다:
 *
 *   ① 창의 시작 행 `round(py + fl)` 과 그 원재료(py · fl) — 갈래 ⓑ(격자 축)
 *   ② 걸린 화소의 (x, y) · 창 안 상대 행 · 차분값 — 갈래 ⓐ(문턱 축)
 *   ③ 바 하변(mul.b) 과 창 시작 행의 거리 — 갈래 ⓒ(구조 축)
 *   ④ base↔base2 잡음(같은 렌더 두 판) — 렌더 자체가 흔들리는지
 *
 * ⚠ 창은 [3] 과 «같은 식» 으로 적는다 — 다르면 다른 것을 재게 된다(912 교훈).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { decodePNG } = require('./png441.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const N = +arg('--n', 6);
const FRAMES = String(arg('--frames', '1600')).split(',').map(Number);
const ONLY = arg('--only', '');

/* verify886 의 MEASURE 에서 이 자가 쓰는 값만 뽑았다(같은 식) */
const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const r2 = (v) => +(v).toFixed(2);
  const rel = (e) => { const b = e.getBoundingClientRect();
    return { t: r2(b.top - pr.top), b: r2(b.bottom - pr.top), h: r2(b.height),
             l: r2(b.left - pr.left), r: r2(b.right - pr.left) }; };
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const num = (n) => { ruler.style.height = 'var(' + n + ')'; return ruler.getBoundingClientRect().height; };
  const fl = num('--rw-fl');
  ruler.remove();
  const floorEl = q('#relw .rw-floor');
  const pedRule = (() => {
    for (const ss of document.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch (e) { continue; }
      for (const rr of rules || []) if (rr.selectorText
        && rr.selectorText.replace(/\\s+/g, '') === '.rw-floor::before')
        return { top: rr.style.top, height: rr.style.height, width: rr.style.width };
    }
    return null;
  })();
  const pe = document.createElement('div');
  pe.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%)';
  pe.style.top = (pedRule && pedRule.top) || '-16px';
  pe.style.height = (pedRule && pedRule.height) || '56px';
  pe.style.width = (pedRule && pedRule.width) || '617px';
  floorEl.appendChild(pe);
  const ped = rel(pe); pe.remove();
  const mul = (() => { const e = q('#rwMulBar'); return e ? rel(e) : null; })();
  return {
    panelX: r2(pr.left), panelY: r2(pr.top),
    panelXraw: pr.left, panelYraw: pr.top, flRaw: fl,
    fl: r2(fl), ped, mul,
  };
})()`;

const SETTLE = argv.includes('--settle');

/* 마침 술어 — «유한 애니가 전부 끝났는가». 무한 펄스(jzDotPulse·nwPulse)는 영영 안 끝나므로 제외한다. */
const SETTLED = () => {
  const as = document.getAnimations();
  return as.every(a => {
    let it = Infinity;
    try { it = a.effect.getTiming().iterations; } catch (e) {}
    return !isFinite(it) || a.playState === 'finished' || a.playState === 'idle';
  });
};

async function openAt(browser, H, css, settle) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(560);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(220);
  /* 수리 후의 게이트와 **글자 그대로 같은 한 줄**로 정착한다(291 공용). 갈래를 굴리려고 스위치로 뺐다.
     ⚠ 여기에 «유한 애니 전부» 를 기다리는 더 센 술어(`SETTLED`)를 얹지 **않는다** — 재현자가 게이트보다
     더 정착한 판을 재면 §R 이 «게이트가 고쳐졌나» 가 아니라 다른 것을 묻게 된다(896 «자 갈림»).
     `SETTLED` 는 진단용으로만 남긴다(`--strict`). */
  if (settle) {
    if (page.settle291) await page.settle291();
    if (argv.includes('--strict')) { try { await page.waitForFunction(SETTLED, null, { timeout: 8000 }); } catch (e) {} }
  }
  return { ctx, page };
}

/* verify886 [3] 의 셈을 그대로 — 다만 걸린 화소를 목록으로 들고 나온다 */
async function shootWith(browser, H, settle, extra) {
  const shots = {};
  for (const [k, css0] of [['base', ''], ['base2', ''], ['noBar', '#rwMulBar{display:none!important}']]) {
    const css = (extra ? extra + '\n' : '') + css0;
    const { ctx, page } = await openAt(browser, H, css, settle);
    const geo = await page.evaluate(MEASURE);
    const f = path.join(ROOT, `.p915-${process.pid}-${H}-${k}.png`);
    fs.writeFileSync(f, await page.screenshot());
    const d = decodePNG(f); shots[k] = { geo, w: d.w, h: d.h, px: d.px };
    fs.unlinkSync(f);
    await ctx.close();
  }
  return shots;
}

function count(shots, TH, y0shift) {
  const { geo } = shots.base, W = shots.base.w;
  const d2 = (p, q, x, y) => { const i = (y * W + x) * 4;
    return Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]); };
  const px = geo.panelX, py = geo.panelY;
  const xa = Math.max(0, Math.round(px + geo.ped.l)), xb = Math.min(W, Math.round(px + geo.ped.r));
  const y0 = Math.round(py + geo.fl) + (y0shift || 0);
  const hits = [], noises = [];
  for (let y = y0; y < Math.min(shots.base.h, y0 + 40); y++)
    for (let x = xa; x < xb; x++) {
      const nz = d2(shots.base.px, shots.base2.px, x, y);
      if (nz > TH) { noises.push({ x, y, d: nz }); continue; }
      const d = d2(shots.base.px, shots.noBar.px, x, y);
      if (d > TH) hits.push({ x, y, row: y - y0, d, nz });
    }
  return { y0, xa, xb, below: hits.length, noise: noises.length, hits, noises };
}

(async () => {
  const browser = await launch(chromium);

  if (ONLY !== 'R') {
    console.log('[1] 재현 — `verify886` [3] 과 **같은 식**의 창·문턱(TH 40)으로 N판');
    console.log('     판  프레임  창 시작행 y0   py(raw)      fl(raw)     바 하변→y0    ★아래화소  잡음   걸린 (x,y,행,차분)');
    const tally = {};
    for (const H of FRAMES) tally[H] = { fail: 0, n: 0, rows: {}, y0s: {} };
    for (let i = 1; i <= N; i++) {
      for (const H of FRAMES) {
        const shots = await shootWith(browser, H, SETTLE);
        const c = count(shots, 40, 0);
        const g = shots.base.geo;
        const barToY0 = +(c.y0 - (g.panelYraw + g.mul.b)).toFixed(2);
        const t = tally[H]; t.n++; if (c.below) t.fail++;
        t.y0s[c.y0] = (t.y0s[c.y0] || 0) + 1;
        for (const h of c.hits) t.rows[h.row] = (t.rows[h.row] || 0) + 1;
        console.log('     ' + String(i).padStart(2) + '  ' + String(H).padStart(5) + '   '
          + String(c.y0).padStart(9) + '  ' + g.panelYraw.toFixed(4).padStart(11) + '  '
          + g.flRaw.toFixed(4).padStart(10) + '  ' + String(barToY0).padStart(10) + '   '
          + String(c.below).padStart(8) + '  ' + String(c.noise).padStart(4) + '   '
          + (c.hits.length ? c.hits.slice(0, 6).map(h => `(${h.x},${h.y},r${h.row},d${h.d})`).join(' ') : '—'));
      }
    }
    console.log('');
    for (const H of FRAMES) {
      const t = tally[H];
      console.log('     ⇒ ' + H + ': 빨강 ' + t.fail + '/' + t.n
        + ' · 창 시작행 분포 ' + JSON.stringify(t.y0s)
        + ' · 걸린 창내 행 분포 ' + JSON.stringify(t.rows));
    }

    /* [2] 문턱 사다리 — 걸린 화소가 «문턱을 넘나드는 경계» 인지, «진짜 잉크» 인지 */
    console.log('\n[2] 문턱 사다리 — 같은 판을 TH 20~160 으로 다시 센다(경계면 문턱에 따라 미끄러진다)');
    for (const H of FRAMES) {
      const shots = await shootWith(browser, H, SETTLE);
      const line = [];
      for (const TH of [20, 30, 40, 60, 90, 120, 160]) {
        const c = count(shots, TH, 0);
        line.push('TH' + TH + ':' + c.below + '(잡음' + c.noise + ')');
      }
      console.log('     ' + H + '  ' + line.join(' · '));
      /* [3] 창 시작행 사다리 — 한 행 위/아래로 밀면 셈이 어떻게 변하나 */
      const shift = [];
      for (const s of [-2, -1, 0, 1, 2]) {
        const c = count(shots, 40, s);
        shift.push('y0' + (s >= 0 ? '+' : '') + s + ':' + c.below);
      }
      console.log('     ' + H + '  창 시작행 사다리 — ' + shift.join(' · '));
    }
  }

  /* ── §R 되돌림 시험 ────────────────────────────────────────────────────────
     재현이 «2/6판» 이라 «고쳤다» 를 반복만으로는 못 보인다(912 교훈). 두 갈래를 주입으로 가른다:
       R1 정착을 **끈** 사본(= 수리 전 경로) → 옛 병이 되살아나는가
       R2 바를 **실제로** 지면선 아래로 내린 사본 → 정착을 켜도 [3] 이 빨간가(무르게 푼 수리가 아니다)
     R2 는 제품을 안 고친다 — `addStyleTag` 로 그 판에서만 바를 내린다. */
  if (ONLY === 'R' || ONLY === '') {
    console.log('\n§R 되돌림 시험 — R1 정착 끔(옛 경로) · R2 바를 실제로 내림(무른 수리 가름)');
    const H = FRAMES[0];

    /* R1 — 같은 판을 **두 경로로 나란히** 굴린다(옛 = 정착 없음 · 새 = 정착 있음).
       갈래는 `shootWith` 의 인자 하나뿐이라 «무엇이 결과를 갈랐는지» 가 흐려지지 않는다. */
    const R1 = [], R1s = [];
    for (let i = 0; i < 4; i++) {
      R1.push(count(await shootWith(browser, H, false), 40, 0).below);
      R1s.push(count(await shootWith(browser, H, true), 40, 0).below);
    }
    console.log('     R1  정착 끔 → 아래화소 ' + R1.join('/') + '   ·   정착 켬 → ' + R1s.join('/'));
    console.log('         ⇒ ' + (R1.some(v => v > 0) && R1s.every(v => v === 0)
      ? '갈렸다 — 옛 경로에서만 빨개진다(뿌리는 정착이다)'
      : '안 갈렸다 — 이 판에서는 옛 경로가 우연히 같은 위상을 뽑았다(판을 늘려라)'));

    /* R2 — 바를 지면선 아래로 20px 내린다. 정착을 켜도 [3] 은 **빨개야** 한다. */
    const DOWN = '#rwMulBar{margin-top:60px!important}';
    const shots2 = await shootWith(browser, H, true, DOWN);
    const c2 = count(shots2, 40, 0);
    console.log('     R2  바를 60px 내린 사본(정착 켬) → 아래화소 ' + c2.below + '(잡음 ' + c2.noise + ')');
    console.log('         ⇒ ' + (c2.below > 0
      ? '빨갛다 — 정착은 «진짜로 덮은 것» 을 안 가린다(무르게 푼 수리가 아니다)'
      : '★ 초록이다 — 자가 물러졌다. 이 처방을 쓰지 마라'));
  }

  await browser.close();
})();
