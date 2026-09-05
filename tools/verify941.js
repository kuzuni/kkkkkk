#!/usr/bin/env node
/* 작업 941 게이트 — «벽 켜 줄눈 위상이 상인방 몸통을 따라간다»(`--rw-cph`)
 *
 *   node tools/verify941.js
 *   node tools/verify941.js --quick     # [6] 프레임 스윕을 건너뛴다
 *
 * ── 이 자가 지키는 것 ────────────────────────────────────────────────────────
 * 등재문의 결함은 «1600 에서 벽 켜 줄눈이 상인방 몸통의 66~79% 를 비쳐 지나가 아래쪽에
 * 명암이 겹친다» 다(926 2회차 채점 2인 GL·GM 독립 1순위 · 합격선 «어두운선 하변 ↓ 하부 몰딩
 * ≥12px»). 뿌리는 926 이 짧은 프레임에서 상인방을 `--rw-lnk` 로 다시 재는데 **줄눈은 그릇
 * 상단에 못 박혀 있는 것**이다 — 몸통만 올라가니 줄눈의 «몸통 안 자리» 가 프레임마다 달라진다.
 *
 *   [1] 소스     — 위상이 **벌거벗은 상수가 아니라** `var(--rw-cph,0px)` 다.
 *   [2] 항등식   — δ = rwc·(66(k−1) − (m−1))/2 «몸통 중심이 옮겨 간 만큼». 손 상수가 아니다.
 *   [2b] 한 벌   — 그 식이 쓰는 66·11·12 는 `.rw-lintel` 그라디언트가 이미 쓰는 수다(갈리면 빨강).
 *   [3] 긴 프레임 — k = m = 1 ⇒ δ = 0 · 되돌림 사본과 **Δ0px**(926 [3] · 879 [3] 규약).
 *   [4] 합격선   — 1600 여유 ≥ 12px(GL) · 어두운선이 몸통 **아래 절반에 눌러앉지 않는다**(GM).
 *   [5] 화소     — 모형(주기 47 · 그릇 상단 기점 + δ)이 **그려진 화소**와 같다(±1px).
 *   [6] 스윕     — k 는 연속이므로 1600~2600 **전 구간**에서 합격선을 지킨다(한 장이 아니다).
 *   [7] 규약     — «밖 띠가 보이는데 k<1» 인 프레임이 0 이다. 하나라도 생기면 그릇 밖 벽
 *                  (`.rw-panel` 배경)의 위상에도 δ 를 더해야 «같은 벽»(3회차)이 안 깨진다.
 *   §R  되돌림   — δ 를 0 으로 되돌리면 [4] 가 빨개진다(무르게 푼 수리가 아님을 사본으로).
 *   §R2 손 상수  — 위상을 «−10px 고정» 으로 박은 사본은 **긴 프레임을 움직인다**(= [3] 파기).
 *                  항등식이어야 하는 이유가 이 항이다.
 *
 * ⚠ 이 화면은 정착 없이 재면 `jzSheetIn` 0% 프레임(scale .985)을 잡아 k 가 0.6852 가 아니라
 *   0.6749 로, 줄눈이 몸통의 75% 가 아니라 40% 로 읽힌다(= 결함이 사라져 보인다). 291 훅은
 *   `verify*.js` 진입에서 자동으로 켜지지만, 이 자는 그 전제를 **[0] 에서 직접 확인**한다.
 *
 * 127 — 브라우저 해석 tools/pwlaunch.js · 913 — pngjs tools/png913.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const PNG = require('./png913').PNG();
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const LONG = [1841, 1920, 2280, 2600];
const QUICK = process.argv.includes('--quick');

const COURSE = 47, DARK0 = 2, DARK1 = 5;   /* 켜 줄눈 — 주기 · 어두운 띠 구간(소스와 한 벌) */
const GATE_CLR = 12;                       /* GL 합격선 — 어두운선 하변 ↓ 하부 몰딩 상변 */
const LIN = 66, MOLD_TOP = 11, MOLD_BOT = 12;   /* `.rw-lintel` 그라디언트와 한 벌 */

let pass = 0, fail = 0;
const ok = (c, name, got) => { c ? pass++ : fail++;
  console.log((c ? 'PASS ' : 'FAIL ') + name + (got == null ? '' : ' — ' + got)); };

const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const bowl = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = bowl.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 100) / 100;
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;pointer-events:none';
  bowl.appendChild(bar);
  const px = (e) => { bar.style.height = e; return bar.getBoundingClientRect().height; };
  const rwc = px('calc(1000px * var(--rwc,1))') / 1000;
  const lnk = px('calc(1000px * var(--rw-lnk,1))') / 1000;
  const lnm = px('calc(1000px * var(--rw-lnm,1))') / 1000;
  const cph = px('calc(1000px + var(--rw-cph,0px))') - 1000;
  bar.remove();
  /* ⚠ 자 막대는 레이아웃 격자(1/64px)로 양자화된다 — 항등식은 **선언된 수**로 재고,
     자 막대 값은 «브라우저가 정말 그 수를 푼다» 는 확인으로만 쓴다(±1/32px). */
  const decl = (n) => { const v = q('#relw').style.getPropertyValue(n); return v === '' ? null : parseFloat(v); };
  const lin = q('#relw .rw-lintel');
  const stop = (e) => {
    const r = document.createElement('div');
    r.style.cssText = 'position:absolute;left:0;top:0;width:1px;pointer-events:none';
    r.style.height = e; lin.appendChild(r);
    const b = r.getBoundingClientRect().bottom - pr.top; r.remove(); return r1(b);
  };
  const L = lin.getBoundingClientRect();
  const bg = q('#relw .rw-bg');
  const cs = getComputedStyle(bg, '::before');
  const pnl = q('#relw .rw-panel').getBoundingClientRect();
  return {
    rwc: r1(rwc), lnk: Math.round(lnk * 1e4) / 1e4, lnm: Math.round(lnm * 1e4) / 1e4, cph: Math.round(cph * 1e3) / 1e3,
    dRwc: decl('--rwc'), dLnk: decl('--rw-lnk'), dLnm: decl('--rw-lnm'), dCph: decl('--rw-cph'),
    settled: Math.abs(pr.width - 1080) < 0.05,
    bowl: { t: r1(pr.top), l: r1(pr.left), w: r1(pr.width), h: r1(pr.height) },
    bgT: r1(bg.getBoundingClientRect().top - pr.top),
    bgPosY: parseFloat((cs.backgroundPosition.split(',')[0].trim().split(/\\s+/)[1]) || '0'),
    linT: r1(L.top - pr.top), linB: r1(L.bottom - pr.top),
    bodyT: stop('calc(11px * var(--rw-lnm,1))'),
    bodyB: stop('calc(66px * var(--rw-lnk,1) - 12px * var(--rw-lnm,1))'),
    band: r1(pr.top - pnl.top),                    /* 그릇 밖 벽 띠 높이(= --rw-oy 의 실측) */
  };
})()`;

const REVERT = '#relw{--rw-cph:0px !important}';
const HARD = '#relw{--rw-cph:-10.288px !important}';   /* §R2 — 손 상수로 박은 사본 */
const MARK = `#relw .rw-bg::before{background-image:
  repeating-linear-gradient(180deg,rgb(255,0,0) 0 2px,rgb(0,255,0) 2px 5px,rgba(0,0,0,0) 5px 47px),
  none,none,none,none,none,none}`;

async function open(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(400);                 /* 291 훅이 여기서 jzSheetIn 을 기다린다 */
  return { ctx, page };
}
async function measure(browser, H, css) {
  const { ctx, page } = await open(browser, H, css);
  const o = await page.evaluate(M => eval(M), MEASURE);
  await ctx.close();
  return o;
}
/* 모형 — 어두운선의 그릇 좌표(그릇 상단 + δ 기점 · 주기 47 · 구간 [2,5)) */
function darkRows(o, from, to) {
  const b = o.bgT + o.bgPosY, out = [];
  for (let j = Math.floor((from - b) / COURSE) - 1; b + j * COURSE < to + COURSE; j++) {
    const t = b + j * COURSE + DARK0, bo = b + j * COURSE + DARK1;
    if (bo > from && t < to) out.push({ t: +t.toFixed(2), b: +bo.toFixed(2) });
  }
  return out;
}
function overlap(o, rows) {
  const h = o.bodyB - o.bodyT;
  const src = rows || darkRows(o, o.bodyT - COURSE, o.bodyB + COURSE);
  const inside = src.filter(r => r.b > o.bodyT && r.t < o.bodyB);
  const hit = inside.length ? inside[inside.length - 1] : null;
  return { h: +h.toFixed(2),
    pct: hit ? [+((hit.t - o.bodyT) / h * 100).toFixed(1), +((hit.b - o.bodyT) / h * 100).toFixed(1)] : null,
    clr: hit ? +(o.bodyB - hit.b).toFixed(2) : null, row: hit };
}
/* 화소 자 — 켜 줄눈 «색만» 갈아 찍는다(기하 Δ0) */
async function pixelRows(browser, H, css) {
  const { ctx, page } = await open(browser, H, (css ? css + '\n' : '') + MARK);
  const o = await page.evaluate(M => eval(M), MEASURE);
  const buf = await page.screenshot({
    clip: { x: Math.round(o.bowl.l + 300), y: Math.round(o.bowl.t), width: 12, height: 140 } });
  await ctx.close();
  const png = PNG.sync.read(buf), hit = [];
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
/* 항등식 — **선언된 k·m·rwc**(toFixed 4~5 자리)로 낸다. 자 막대 값은 1/64px 로 양자화돼
   같은 식에 넣으면 δ 가 최대 0.01px 어긋난다(그건 결함이 아니라 격자다 — [2c] 가 따로 잰다). */
const delta = (o) => (o.dRwc == null ? o.rwc : o.dRwc) * (LIN * ((o.dLnk == null ? o.lnk : o.dLnk) - 1)
  - ((o.dLnm == null ? o.lnm : o.dLnm) - 1)) / 2;
const f2 = (v) => (v == null ? '—' : (+v).toFixed(2));
const say = (v) => (v.pct ? v.pct[0] + '~' + v.pct[1] + '%' : '없음');

(async () => {
  const browser = await launch(chromium);
  const r = {}, rv = {};
  for (const H of FRAMES) { r[H] = await measure(browser, H, ''); rv[H] = await measure(browser, H, REVERT); }
  const ov = {}, ov0 = {};
  for (const H of FRAMES) { ov[H] = overlap(r[H]); ov0[H] = overlap(rv[H]); }

  /* ── [0] 전제 — 정착 ────────────────────────────────────────────────────── */
  ok(FRAMES.every(H => r[H].settled),
    '[0] ★ 전제 — 재는 프레임이 **입장 연출이 끝난 뒤**다(291). 0% 프레임(scale .985)에서 재면 k 가 0.6852 → 0.6749 로, 줄눈이 몸통의 75% 가 아니라 **40%** 로 읽혀 결함이 통째로 사라져 보인다',
    FRAMES.map(H => H + ':' + (r[H].settled ? '✔' : '✗ 그릇폭 ' + r[H].bowl.w)).join(' · '));

  /* ── [1] 소스 ───────────────────────────────────────────────────────────── */
  const posLine = (SRC.match(/background-position:0 [^;\n]*,132px 0,0 0,131px 57px/) || [''])[0];
  ok(/^background-position:0 var\(--rw-cph,\s*0px\)/.test(posLine),
    '[1] ★ 켜 줄눈 위상이 **벌거벗은 상수가 아니다** — `.rw-bg::before` 1번 레이어가 `var(--rw-cph,0px)` 를 문다(고정 숫자를 박으면 프레임마다 다른 몸통을 한 수로 맞추게 된다)',
    posLine || '(찾지 못함)');
  ok(/--rw-cph['"\],\s]*\s*,\s*\(rwc \* \(66 \* \(k - 1\) - \(mm - 1\)\) \/ 2\)/.test(SRC.replace(/\s+/g, ' '))
     || /setProperty\('--rw-cph', \(rwc \* \(66 \* \(k - 1\) - \(mm - 1\)\) \/ 2\)/.test(SRC),
    '[1b] 그 수를 얹는 곳이 **한 군데**다 — `rwLintelFit()` 이 k·m 을 정하는 바로 그 자리(사본을 두면 402 가 지운 병이 돌아온다)',
    (SRC.match(/setProperty\('--rw-cph'[^\n]*/) || ['(찾지 못함)'])[0].slice(0, 96));

  /* ── [2] 항등식 ─────────────────────────────────────────────────────────── */
  ok(FRAMES.every(H => r[H].dCph != null && Math.abs(r[H].dCph - delta(r[H])) < 5e-3),
    '[2] ★ δ = rwc·(66(k−1) − (m−1))/2 — «몸통 중심(66k − m)/2 이 926 전(k=m=1)에서 옮겨 간 만큼» 이라는 항등식이지 고른 수가 아니다',
    FRAMES.map(H => H + ':' + (r[H].dCph == null ? '없음' : r[H].dCph.toFixed(3)) + '↔' + delta(r[H]).toFixed(3)).join(' · '));
  ok(FRAMES.every(H => r[H].dCph != null && Math.abs(r[H].cph - r[H].dCph) <= 1 / 32),
    '[2c] 브라우저가 그 수를 **정말 푼다** — 자 막대로 되잰 위상이 선언값과 같다(레이아웃 격자 1/64px 안). 선언만 보면 «변수를 아무도 안 읽는» 경우를 못 잡는다',
    FRAMES.map(H => H + ':자 ' + r[H].cph.toFixed(3) + ' ↔ 선언 ' + r[H].dCph.toFixed(3)).join(' · '));
  const gTop = new RegExp('rgba\\(84,70,50,\\.40\\) calc\\(' + MOLD_TOP + 'px \\* var\\(--rw-lnm,1\\)\\)').test(SRC);
  const gBot = new RegExp('calc\\(' + LIN + 'px \\* var\\(--rw-lnk,1\\) - ' + MOLD_BOT + 'px \\* var\\(--rw-lnm,1\\)\\)').test(SRC);
  ok(gTop && gBot,
    '[2b] 그 식이 쓰는 66·11·12 는 **새로 적은 수가 아니라** `.rw-lintel` 그라디언트가 이미 쓰는 수다 — 몰딩 규격이 바뀌면 이 항이 먼저 빨개져 식을 같이 고치게 한다',
    '위 몰딩 11m ' + (gTop ? '✔' : '✗') + ' · 아래 몰딩 66k − 12m ' + (gBot ? '✔' : '✗'));

  /* ── [3] 긴 프레임 Δ0 ───────────────────────────────────────────────────── */
  ok(LONG.every(H => r[H].lnk === 1 && r[H].lnm === 1 && Math.abs(r[H].cph) < 1e-3),
    '[3] ★ 긴 네 프레임은 k = m = 1 이라 **δ = 0** — 위상이 한 픽셀도 안 움직인다(926 [3] · 879 [3] 규약)',
    LONG.map(H => H + ':k' + r[H].lnk + ' m' + r[H].lnm + ' δ' + r[H].cph).join(' · '));
  ok(LONG.every(H => ov[H].row && ov0[H].row
      && Math.abs(ov[H].row.t - ov0[H].row.t) < 1e-6 && Math.abs(ov[H].clr - ov0[H].clr) < 1e-6),
    '[3b] 되돌림 사본(δ = 0)과 **줄눈 자리·여유가 완전히 같다** — 긴 프레임의 그림은 이 작업이 한 획도 안 바꿨다',
    LONG.map(H => H + ':' + f2(ov[H].clr) + '↔' + f2(ov0[H].clr)).join(' · '));

  /* ── [4] 합격선 ─────────────────────────────────────────────────────────── */
  ok(ov[1600].clr != null && ov[1600].clr >= GATE_CLR,
    '[4] ★ 1600 — 줄눈 어두운선 하변 ↓ 하부 몰딩 상변이 **≥' + GATE_CLR + 'px**(GL 이 세운 합격선). 수리 전 3.61px 이라 아래 짧은 구간에 명암이 겹쳐 «가짜 가로 분할» 로 읽혔다',
    '여유 ' + f2(ov[1600].clr) + 'px (되돌림 사본 ' + f2(ov0[1600].clr) + 'px)');
  ok(ov[1600].pct && ov[1600].pct[1] <= 55,
    '[4b] ★ 어두운선이 **몸통 아래 절반에 눌러앉지 않는다** — 수리 전 75.3~86.5% 였다(GM «37~47% → 66~79%»). 긴 프레임의 34.3~41.2% 와 같은 대역으로 돌아온다',
    '1600 ' + say(ov[1600]) + ' (되돌림 ' + say(ov0[1600]) + ') ↔ 2280 ' + say(ov[2280]));
  ok(ov[1600].pct && ov[1600].pct[0] >= 10,
    '[4c] 반대쪽으로도 안 넘어간다 — 위 몰딩에 붙어 버리면 이번엔 위쪽에 명암이 겹친다(같은 결함의 거울)',
    '1600 몸통 상변 ↓ 어두운선 ' + (ov[1600].row ? f2(ov[1600].row.t - r[1600].bodyT) + 'px' : '—'));

  /* ── [5] 화소 ───────────────────────────────────────────────────────────── */
  for (const H of [1600, 2280]) {
    const { o, rows } = await pixelRows(browser, H, '');
    const mv = overlap(o), pv = overlap(o, rows);
    ok(mv.row && pv.row && Math.abs(mv.row.t - pv.row.t) <= 1 && Math.abs(mv.clr - pv.clr) <= 1,
      '[5' + (H === 1600 ? 'a' : 'b') + '] ' + H + ' — 모형(주기 47 · 그릇 상단 + δ 기점)이 **그려진 화소**와 같다(±1px). 이 항이 없으면 위 항들은 «식이 식과 같다» 만 재는 것이다',
      '모형 ' + (mv.row ? f2(mv.row.t) : '—') + '/여유 ' + f2(mv.clr)
      + ' ↔ 화소 ' + (pv.row ? f2(pv.row.t) : '—') + '/여유 ' + f2(pv.clr));
    ok(rows.length > 0 && rows.every(x => x.b - x.t === 3),
      '[5' + (H === 1600 ? 'c' : 'd') + '] ' + H + ' — 그려진 어두운 띠는 **3px** 이다(합격선 12 가 이 두께를 전제로 세워졌다)',
      rows.map(x => x.t + '..' + x.b).join(' ') || '(없음)');
  }

  /* ── [6] 스윕 ───────────────────────────────────────────────────────────── */
  if (QUICK) {
    console.log('SKIP [6] 프레임 스윕 — --quick');
  } else {
    let worst = null; const bad = [], band = [];
    for (let H = 1600; H <= 2600; H += 50) {
      const o = await measure(browser, H, '');
      const v = overlap(o);
      if (v.clr != null && (worst == null || v.clr < worst.clr)) worst = { H, clr: v.clr, pct: v.pct };
      if (v.clr != null && v.clr < GATE_CLR) bad.push(H);
      if (o.lnk < 1 && o.band > 0.5) band.push(H);
    }
    ok(bad.length === 0,
      '[6] ★ k 는 연속이므로 결함도 연속이다 — 1600~2600 **전 구간**(50px 걸음)에서 여유 ≥ ' + GATE_CLR + 'px. 등재문이 든 1600 한 장만 맞추면 그 사이 어느 높이에서 같은 그림이 다시 나온다',
      '최악 ' + worst.H + ' 여유 ' + f2(worst.clr) + 'px (' + worst.pct[0] + '~' + worst.pct[1] + '%) · 미달 ' + bad.length + '개');
    ok(band.length === 0,
      '[7] ★ 규약 — «그릇 밖 벽 띠가 보이는데 k<1» 인 프레임이 **0개**다. 하나라도 생기면 안팎 줄눈이 δ 만큼 갈려 3회차가 세운 «같은 벽» 이 깨지므로, 그때는 `.rw-panel` 배경 위상에도 같은 δ 를 더해야 한다',
      band.length ? band.join(' · ') : '0개 (밖 띠는 패널 > 1527 일 때만 보이고 그 구간은 전부 k = 1)');
  }

  /* ── §R 되돌림 ──────────────────────────────────────────────────────────── */
  ok(ov0[1600].clr != null && ov0[1600].clr < GATE_CLR,
    '[R1] ★ 되돌림 — δ 를 0 으로 되돌린 사본은 1600 에서 **빨갛다**(여유 ' + f2(ov0[1600].clr)
      + ' < ' + GATE_CLR + '). 무르게 푼 수리가 아니라는 것을 사본이 못박는다',
    '되돌림 ' + say(ov0[1600]) + ' 여유 ' + f2(ov0[1600].clr) + ' ↔ 제품 ' + say(ov[1600]) + ' 여유 ' + f2(ov[1600].clr));
  const hard = {};
  for (const H of [1600, 2280]) hard[H] = overlap(await measure(browser, H, HARD));
  ok(Math.abs(hard[1600].clr - ov[1600].clr) < 1.0 && Math.abs(hard[2280].clr - ov0[2280].clr) > 5,
    '[R2] ★ 손 상수 사본 — 위상을 «−10.288px 고정» 으로 박으면 1600 은 같은 그림이지만 **긴 프레임이 같이 밀린다**(= [3] Δ0 파기). 항등식이어야 하는 이유가 이 한 항이다',
    '1600 여유 ' + f2(hard[1600].clr) + '(제품 ' + f2(ov[1600].clr) + ') · 2280 여유 '
      + f2(hard[2280].clr) + '(제품 ' + f2(ov[2280].clr) + ')');

  await browser.close();
  console.log('\nVERIFY941 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
