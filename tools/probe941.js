#!/usr/bin/env node
/* 작업 941 — «1600 에서 벽 켜 줄눈이 상인방 몸통의 66~79% 를 비쳐 지나간다» 재현기
 *
 *   node tools/probe941.js            # [1]~[5] 전부
 *   node tools/probe941.js --quick    # [3] 프레임 스윕을 건너뛴다(빠른 되재기)
 *
 * ── 왜 이 자인가(338 규칙) ───────────────────────────────────────────────────
 * 등재문(926 1회차 채점 GL·GM)은 **두 수**를 근거로 세웠다 —
 *   GM: 줄눈이 상인방 몸통의 **37~47% → 66~79%**(+22pp)
 *   GL: 줄눈 어두운선 ↔ 하부 몰딩 여유 **23 → 6px**(−74%) · 합격선 **≥12px**
 * 처방을 쓰기 전에 그 두 수를 이 저장소의 자로 되재고, 진단(«줄눈은 벽 그리드에 못 박혀
 * 있고 상인방만 다시 재어졌다»)이 실제로 그 모양인지 확인한다.
 *
 * ⚠⚠ **이 화면은 정착 없이 재면 거짓말을 한다(291).** `openRelw()` 직후 250ms 에서 재면
 *   `jzSheetIn` 0% 프레임(scale .985)이 잡혀 그릇이 1080×1312 가 아니라 **1063.8×1292.3** 이고,
 *   그 프레임에서는 k 가 0.6852 가 아니라 **0.6749** 로, 줄눈이 몸통의 75% 가 아니라 **40%** 로
 *   읽힌다(= 결함이 통째로 사라져 보인다). 그래서 이 자는 `PW_SETTLE=1` 을 **스스로 켠다**
 *   (probe353 과 같은 한 줄). 되돌려 확인하려면 `PW_SETTLE=0 node tools/probe941.js`.
 *
 *   [1] 재현 — 프레임 5종에서 «켜 줄눈 어두운선» 과 «상인방 몸통»(위 몰딩 아래 ↓ 아래 몰딩 위)을
 *       같은 좌표계에 놓는다. 몸통 경계는 식을 옮겨 적지 않고 **상인방 안에 자 막대를 넣어**
 *       제품에게 묻고(926 `rwRuler` 와 같은 자 — 상인방은 `transform:scale(--rwc)` 라 바깥에서
 *       계산하면 어긋난다), 줄눈 자리는 **모형(주기 47 · 그릇 상단 기점)과 화소를 둘 다** 낸다
 *       (화소는 켜 줄눈 레이어만 빨강/초록으로 바꿔 찍는다 — 기하는 한 픽셀도 안 건드린다).
 *   [2] 등재문 대조 — 926 **1회차** 사본(GL·GM 이 실제로 본 그림)과 지금을 같은 자로 잰다.
 *       2회차의 `m = max(k, 4/5)` 가 몸통 하변을 옮겼으므로 두 수는 같을 수 없다.
 *   [3] 프레임 스윕 — 1600~2600 을 훑어 «여유» 의 최솟값과 그 프레임을 찾는다.
 *       등재문은 1600 한 장을 말하지만 k 는 연속이라 **결함도 연속**이어야 한다.
 *   [4] 앵커 — «이 구간의 켜 그리드에 고정 앵커가 있는가»(등재문이 착수 조건으로 건 물음).
 *       ⓐ 패널 안 랜드마크가 켜 경계에 붙어 있는지 · ⓑ 그릇 **밖** 벽(`.rw-panel` 배경)의
 *       줄눈과 위상이 이어지는지(3회차가 세운 «같은 벽» 규약).
 *   [5] 위상 항등식 — δ = (66(k−1) − (m−1))/2 «몸통 중심이 옮겨 간 만큼» 을 제품에 넣어
 *       전후를 잰다. k = m = 1 이면 δ = 0 이라 긴 프레임은 한 픽셀도 안 움직인다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * 913 — pngjs 없음 처리는 tools/png913.js 공용.
 * 756 — 얕은 클론에서 고정 SHA 를 꺼내는 사다리는 tools/gitrev756.js 공용.
 */
'use strict';
/* 291 — 이 화면은 정착 없이 재면 0% 프레임(scale .985)을 잡는다. probe 는 기본이 꺼짐이라 켠다. */
if (!process.env.PW_SETTLE) process.env.PW_SETTLE = '1';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 */
const G = require('./gitrev756');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const QUICK = process.argv.includes('--quick');

/* 켜 줄눈 — `.rw-bg::before` 1번 레이어(주기 47 · 밝음 0..2 · 어두움 2..5). 소스와 한 벌. */
const COURSE = 47, DARK0 = 2, DARK1 = 5;
/* GL 합격선 — 줄눈 어두운선 하변 ↓ 하부 몰딩 상변 */
const GATE_CLR = 12;
/* 926 1회차 커밋 — GL·GM 이 실제로 본 그림 */
const R1 = 'fd2af1d';

const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const bowl = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = bowl.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 100) / 100;
  const rel = (r) => ({ t: r1(r.top - pr.top), b: r1(r.bottom - pr.top), h: r1(r.height) });
  const box = (s) => { const e = q(s); return e ? rel(e.getBoundingClientRect()) : null; };

  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;pointer-events:none';
  bowl.appendChild(bar);
  const num = (expr) => { bar.style.height = expr; return bar.getBoundingClientRect().height; };
  const rwc = num('calc(1000px * var(--rwc,1))') / 1000;
  const lnk = num('calc(1000px * var(--rw-lnk,1))') / 1000;
  const lnm = num('calc(1000px * var(--rw-lnm,1))') / 1000;
  const cph = num('calc(1000px + var(--rw-cph,0px))') - 1000;   /* 941 — 음수도 재려고 1000 을 얹는다 */
  const oy  = num('var(--rw-oy)');
  const lt  = num('var(--rw-lt)');
  bar.remove();

  /* 몸통 경계 — 상인방 **안**에 자 막대를 세워 제품에게 묻는다(스케일이 같이 걸린다) */
  const lin = q('#relw .rw-lintel');
  const stop = (expr) => {
    const r = document.createElement('div');
    r.style.cssText = 'position:absolute;left:0;top:0;width:1px;pointer-events:none';
    r.style.height = expr;
    lin.appendChild(r);
    const b = r.getBoundingClientRect().bottom - pr.top;
    r.remove();
    return r1(b);
  };
  const bodyT = stop('calc(11px * var(--rw-lnm,1))');
  const bodyB = stop('calc(66px * var(--rw-lnk,1) - 12px * var(--rw-lnm,1))');

  const bg = q('#relw .rw-bg');
  const cs = getComputedStyle(bg, '::before');
  /* 아치 정점 — 의사요소라 상자를 못 잡는다. 같은 식을 문 클론으로 되잰다(probe926 과 같은 자). */
  const ap = document.createElement('div');
  ap.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);width:589px;'
    + 'top:calc(var(--rw-gt) - var(--rw-av));height:var(--rw-ah)';
  bg.appendChild(ap);
  const apexT = r1(ap.getBoundingClientRect().top - pr.top);
  ap.remove();

  const panel = q('#relw .rw-panel');
  const pnl = panel.getBoundingClientRect();
  const pcs = getComputedStyle(panel);

  return {
    rwc: r1(rwc), lnk: +lnk.toFixed(4), lnm: +lnm.toFixed(4), cph: r1(cph), oy: r1(oy), lt: r1(lt),
    bowl: { t: r1(pr.top), l: r1(pr.left), w: r1(pr.width), h: r1(pr.height) },
    settled: Math.abs(pr.width - 1080) < 0.05,        /* 291 — 0% 프레임이면 1063.8 이다 */
    bg: rel(bg.getBoundingClientRect()),
    bgPosY: parseFloat((cs.backgroundPosition.split(',')[0].trim().split(/\\s+/)[1]) || '0'),
    panelTop: r1(pnl.top - pr.top),
    panelPosY: pcs.backgroundPosition.split(',')[2] ? pcs.backgroundPosition.split(',')[2].trim() : '—',
    lint: box('#relw .rw-lintel'), bodyT, bodyB, apexT,
    grid: box('#relw .rw-grid'), mul: box('#rwMulBar'),
    mid: box('#relw .rw-mid'), basin: box('#relw .rw-basin'),
  };
})()`;

/* 켜 줄눈 위상만 δ 로 갈아 끼운다 — 나머지 6 레이어는 소스 값 그대로 다시 적는다(한 층만 못 바꾼다) */
const BGPOS = ['0 %Y%', '132px 0', '0 0', '131px 57px', '269px 213px', '47px 311px', '353px 149px'];
const phaseCSS = (d) => (!d ? '' :
  `#relw .rw-bg::before{background-position:${BGPOS.join(',').replace('%Y%', d + 'px')}}`);
/* §R 되돌림 — 941 의 위상을 0 으로(= 941 이전 그림). 이 자는 수리 전·후 어느 트리에서도 돈다. */
const REVERT = '#relw{--rw-cph:0px !important}';
/* 화소 자 — 켜 줄눈 «색만» 빨강(밝은 띠)·초록(어두운 띠)으로. 기하는 한 픽셀도 안 건드린다. */
const MARK = `#relw .rw-bg::before{background-image:
  repeating-linear-gradient(180deg,rgb(255,0,0) 0 2px,rgb(0,255,0) 2px 5px,rgba(0,0,0,0) 5px 47px),
  none,none,none,none,none,none}`;

async function open(browser, file, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + file.replace(/\\/g, '/'));
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(400);              /* 291 훅이 여기서 jzSheetIn 을 기다린다 */
  return { ctx, page };
}
async function measure(browser, H, css, file) {
  const { ctx, page } = await open(browser, file || path.join(ROOT, 'index.html'), H, css);
  const o = await page.evaluate(M => eval(M), MEASURE);
  await ctx.close();
  return o;
}

/* 모형 — 어두운선의 «그릇 좌표» 목록(그릇 상단 기점 + 주기 47 · 구간 [2,5)) */
function darkRows(o, from, to) {
  const b = o.bg.t + o.bgPosY;
  const out = [];
  for (let j = Math.floor((from - b) / COURSE) - 1; b + j * COURSE < to + COURSE; j++) {
    const t = b + j * COURSE + DARK0, bo = b + j * COURSE + DARK1;
    if (bo > from && t < to) out.push({ t: +t.toFixed(2), b: +bo.toFixed(2) });
  }
  return out;
}
/* 몸통 안 겹침 — 몇 % 를 지나는가 · 하부 몰딩까지 여유는 몇 px 인가 */
function overlap(o, rows) {
  const h = o.bodyB - o.bodyT;
  const src = rows || darkRows(o, o.bodyT - COURSE, o.bodyB + COURSE);
  const inside = src.filter(r => r.b > o.bodyT && r.t < o.bodyB);
  const hit = inside.length ? inside[inside.length - 1] : null;
  return {
    h: +h.toFixed(2), n: inside.length,
    pct: hit ? [+((hit.t - o.bodyT) / h * 100).toFixed(1), +((hit.b - o.bodyT) / h * 100).toFixed(1)] : null,
    clr: hit ? +(o.bodyB - hit.b).toFixed(2) : null,
    row: hit,
  };
}

/* 화소 자 — 켜 줄눈을 빨강/초록으로 찍고 «초록 런»(어두운 띠)의 그릇 좌표를 돌려준다 */
async function pixelRows(browser, H, css, file) {
  const { ctx, page } = await open(browser, file || path.join(ROOT, 'index.html'), H,
    (css ? css + '\n' : '') + MARK);
  const o = await page.evaluate(M => eval(M), MEASURE);
  const buf = await page.screenshot({
    clip: { x: Math.round(o.bowl.l + 300), y: Math.round(o.bowl.t), width: 12, height: 140 },
  });
  await ctx.close();
  const png = PNG.sync.read(buf);
  const hit = [];
  for (let y = 0; y < png.height; y++) {
    const i = (y * png.width + 6) << 2;
    if (png.data[i + 1] > 120 && png.data[i] < 120) hit.push(y);
  }
  const rows = []; let s = null;
  for (let i = 0; i < hit.length; i++) {
    if (s === null) s = hit[i];
    if (i === hit.length - 1 || hit[i + 1] !== hit[i] + 1) { rows.push({ t: s, b: hit[i] + 1 }); s = null; }
  }
  return { o, rows };
}

const pad = (s, n) => String(s).padEnd(n);
const f2 = (v) => (v == null ? '—' : (+v).toFixed(2));
const say = (v) => (v.pct ? v.pct[0] + '~' + v.pct[1] + '%' : '—');

(async () => {
  const browser = await launch(chromium);
  const base = {};
  for (const H of FRAMES) base[H] = await measure(browser, H, '');

  console.log('PROBE941 — 「1600 에서 켜 줄눈이 상인방 몸통을 66~79% 로 지난다」'
    + (process.env.PW_SETTLE === '0' ? '   ⚠ PW_SETTLE=0 (정착 끔)' : '') + '\n');

  /* ── [1] 재현 ───────────────────────────────────────────────────────────── */
  console.log('[1] 재현 — 켜 줄눈 어두운선 ↔ 상인방 몸통 (그릇 좌표 · px)');
  console.log('     ' + pad('프레임', 7) + pad('정착', 6) + pad('k', 8) + pad('m', 8) + pad('δ', 9)
    + pad('상인방상자', 16) + pad('몸통', 16) + pad('몸통h', 8) + pad('어두운선', 14)
    + pad('몸통 %', 14) + '여유');
  const ov = {};
  for (const H of FRAMES) {
    const o = base[H]; ov[H] = overlap(o);
    const v = ov[H];
    console.log('     ' + pad(H, 7) + pad(o.settled ? '✔' : '✗0%', 6)
      + pad(o.lnk.toFixed(4), 8) + pad(o.lnm.toFixed(4), 8) + pad(f2(o.cph), 9)
      + pad(f2(o.lint.t) + '..' + f2(o.lint.b), 16) + pad(f2(o.bodyT) + '..' + f2(o.bodyB), 16)
      + pad(f2(v.h), 8) + pad(v.row ? f2(v.row.t) + '..' + f2(v.row.b) : '—', 14)
      + pad(say(v), 14) + (v.clr == null ? '—' : f2(v.clr) + 'px ' + (v.clr >= GATE_CLR ? '✔' : '✗')));
  }
  console.log('     ⇒ 등재문 GM «37~47% → 66~79%» · GL «여유 23 → 6px · 합격선 ≥' + GATE_CLR + '»');

  console.log('\n[1b] 화소 대조 — 모형(주기 47 · 그릇 상단 기점)이 그려진 화소와 같은가');
  for (const H of [1600, 2280]) {
    const { o, rows } = await pixelRows(browser, H, '');
    const model = darkRows(o, 0, 140);
    const mv = overlap(o), pv = overlap(o, rows);
    console.log('     ' + pad(H, 7) + '모형 [' + model.map(r => r.t + '..' + r.b).join(' ') + ']');
    console.log('            화소 [' + rows.map(r => r.t + '..' + r.b).join(' ') + ']'
      + '   몸통% 모형 ' + say(mv) + ' ↔ 화소 ' + say(pv)
      + '   여유 ' + f2(mv.clr) + ' ↔ ' + f2(pv.clr));
  }

  /* ── [2] 등재문 대조 ────────────────────────────────────────────────────── */
  console.log('\n[2] 등재문 대조 — GL·GM 이 본 그림(926 1회차 ' + R1 + ') ↔ 지금');
  const got = G.ensure(R1);
  if (!got.ok) {
    console.log('     ⏸ ' + (got.env ? '보류(환경) — ' : '없음 — ') + (got.why || ''));
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p941-'));
    fs.writeFileSync(path.join(dir, 'index.html'), G.show(R1, 'index.html').buf);
    try { fs.symlinkSync(path.join(ROOT, 'assets'), path.join(dir, 'assets')); } catch (e) { /* 자산 없어도 벽은 CSS 다 */ }
    for (const H of [1600, 2280]) {
      const a = await measure(browser, H, '', path.join(dir, 'index.html'));
      const va = overlap(a), vb = ov[H];
      console.log('     ' + pad(H, 7) + '1회차 k=' + a.lnk.toFixed(4) + ' m=' + a.lnm.toFixed(4)
        + ' 몸통 ' + pad(f2(a.bodyT) + '..' + f2(a.bodyB), 16) + say(va) + ' 여유 ' + f2(va.clr)
        + '   →  지금 m=' + base[H].lnm.toFixed(4) + ' ' + say(vb) + ' 여유 ' + f2(vb.clr));
    }
    console.log('     ⇒ 2회차의 `m = max(k, 4/5)` 가 하부 몰딩을 아래로 옮겨 여유가 바뀐다 —'
      + ' 등재문의 두 수는 **1회차 그림**의 것이다.');
  }

  /* ── [3] 프레임 스윕 ────────────────────────────────────────────────────── */
  if (!QUICK) {
    console.log('\n[3] 프레임 스윕 — k 가 연속이면 결함도 연속이다 (1600~2600 · 20px 걸음)');
    console.log('     ⚠ «전» 은 위상을 0 으로 되돌린 사본(= 941 이전) · «후» 는 제품 그대로다.');
    const runs = { 전: REVERT, 후: '' };
    for (const [name, css] of Object.entries(runs)) {
      let worst = null; const bad = []; let oyk = null;
      for (let H = 1600; H <= 2600; H += 20) {
        const o = await measure(browser, H, css);
        const v = overlap(o);
        if (v.clr != null && (worst == null || v.clr < worst.clr)) worst = { H, clr: v.clr, pct: v.pct, k: o.lnk };
        if (v.clr != null && v.clr < GATE_CLR) bad.push(H);
        /* ⓑ 검산 — «밖 띠가 보이는데(k<1) 위상이 갈리는» 프레임이 하나라도 있으면 여기 걸린다 */
        if (o.lnk < 1 && -o.panelTop > 0.5) oyk = H;
      }
      console.log('     ' + name + '  최악 ' + worst.H + ' — 여유 ' + f2(worst.clr) + 'px · 몸통 '
        + worst.pct[0] + '~' + worst.pct[1] + '% · k ' + worst.k.toFixed(4)
        + ' · 미달(' + GATE_CLR + 'px) ' + bad.length + '개'
        + (bad.length ? ' [' + bad[0] + '..' + bad[bad.length - 1] + ']' : '')
        + ' · «k<1 인데 밖 띠가 보이는» 프레임 ' + (oyk == null ? '0개' : oyk));
    }
  }

  /* ── [4] 앵커 ───────────────────────────────────────────────────────────── */
  console.log('\n[4] 앵커 — 켜 그리드에 «맞춰 놓은» 자리가 있는가');
  console.log('     ⓐ 랜드마크 변 ↔ 가장 가까운 켜 경계 (0 에 붙어 있으면 앵커다)');
  for (const H of [1600, 2280]) {
    const o = base[H];
    const b0 = o.bg.t + o.bgPosY;
    const near = (y) => { const r = ((y - b0) % COURSE + COURSE) % COURSE; return +(Math.min(r, COURSE - r)).toFixed(2); };
    const marks = [['금테↓', o.lt], ['상인방↑', o.lint.t], ['상인방↓', o.lint.b], ['아치정점', o.apexT],
      ['격자↑', o.grid && o.grid.t], ['배수바↑', o.mul && o.mul.t], ['수반↑', o.basin && o.basin.t]];
    console.log('     ' + pad(H, 7) + marks.filter(m => m[1] != null).map(m => m[0] + ' ' + f2(near(m[1]))).join(' · '));
  }
  console.log('     ⓑ 그릇 밖 벽(`.rw-panel` 배경) 띠 ↔ k — 3회차 «같은 벽» 규약이 걸리는가');
  console.log('     (⚠ `--rw-oy` 는 `100%` 를 품어 그릇 안 자로 재면 언제나 0 이다 —'
    + ' 실제 띠 높이는 «패널 상단 ↔ 그릇 상단» 거리다)');
  for (const H of FRAMES) {
    const o = base[H];
    const band = +(-o.panelTop).toFixed(2);
    console.log('     ' + pad(H, 7) + '밖 띠 ' + pad(f2(band), 9) + 'k ' + pad(o.lnk.toFixed(4), 8)
      + 'δ ' + pad(f2(o.cph), 9)
      + (band > 0.5 ? (o.lnk < 1 ? '← ⚠ 띠가 보이는데 k<1 (위상이 갈린다)' : '← 띠는 보이지만 δ = 0 (안 갈린다)')
        : '(띠 없음 — 그릇이 패널을 꽉 채운다)'));
  }

  /* ── [5] 위상 항등식 ────────────────────────────────────────────────────── */
  console.log('\n[5] 위상 항등식 — δ = rwc · (66(k−1) − (m−1))/2  «몸통 중심이 옮겨 간 만큼»');
  console.log('     ' + pad('프레임', 7) + pad('δ(식)', 10) + pad('δ(제품)', 10)
    + pad('전(몸통% / 여유)', 26) + '후(몸통% / 여유)');
  for (const H of FRAMES) {
    const o = base[H];                                   /* 제품 그대로 */
    const d = +(o.rwc * ((66 * (o.lnk - 1)) - (o.lnm - 1)) / 2).toFixed(3);
    const o0 = await measure(browser, H, REVERT);        /* 941 이전 */
    const v0 = overlap(o0), v1 = overlap(o);
    console.log('     ' + pad(H, 7) + pad(d.toFixed(3), 10) + pad(f2(o.cph), 10)
      + pad(say(v0) + ' / ' + f2(v0.clr), 26)
      + say(v1) + ' / ' + f2(v1.clr) + (v1.clr >= GATE_CLR ? ' ✔' : ' ✗')
      + (d === 0 ? '   (Δ0 — 한 픽셀도 안 움직인다)' : ''));
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
