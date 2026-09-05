#!/usr/bin/env node
/* 작업 926 게이트 — «상인방이 띠1 의 압축을 clearance 와 같은 비로 나눠 진다»
 *
 *   node tools/verify926.js
 *
 * ── 이 자가 지키는 것 ────────────────────────────────────────────────────────
 * 등재문의 결함은 «1600 에서 상인방 칠 하변 ↓ 아치 정점이 잔존 0.320 — 이 화면에서 가장
 * 심하게 눌린 띠» 다(채점 2인 EW·EX 독립 실측). 뿌리는 879 9회차 §57 이 찍었다:
 * 띠1(패널 상단 ↓ 아치 정점)은 `--rw-gt` 첫째 인자가 정하는 **94 상수**인데 그 안의
 * 20(금테)과 66(상인방)이 **프레임 불변**이라 띠1 의 압축을 **clearance 혼자** 뒤집어쓴다.
 *
 *   [1] 항등식   — k = pool / 108 (pool = gt − av − lt · 108 = 294 − 186). 손 상수가 아니다.
 *   [2] 배분     — 상인방과 clearance 의 잔존율이 **같다**(수리 전 1.000 ↔ 0.190).
 *   [3] 긴 프레임 — lnk 정확히 1 · 상인방 66 · clearance 41.37 = **Δ0px**(879 [3] 규약).
 *   [4] 잘림 0   — «줄인다» 가 아니라 «같이 준다»: 몰딩 6층·까치발이 같은 k 를 문다(소스)
 *                  + 그려진 칠 하변의 **상인방 안 상대 위치**가 프레임 불변(화소).
 *   [5] 띠1 불변 — 94 는 한 글자도 안 건드렸다(`verify879` [2b2] 와 같은 자리를 이 번호도 잰다).
 *   §R  되돌림   — lnk 를 1 로 되돌리면 [2] 가 빨개진다(무르게 푼 수리가 아님을 사본으로).
 *   §R2 사본 함정 — 늙은 JS 사본(`rwMulFit` 의 av 174)으로 k 를 구하면 **틀린 수**가 나온다.
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
const REF = 2280;
const POOL_FULL = 108;          /* 294(상인방 앵커) − 186(av 상한) — 소스와 한 벌 */
const MOLD_MIN = 4, MOLD_THIN = 5;   /* 2회차 — 몰딩 선 하한 · 가장 얇은 몰딩 선(제품 상수와 한 벌) */
const LIN = 66;

let pass = 0, fail = 0;
const ok = (c, name, got) => { c ? pass++ : fail++;
  console.log((c ? 'PASS ' : 'FAIL ') + name + (got == null ? '' : ' — ' + got)); };

const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 100) / 100;
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const px = (e) => { ruler.style.height = e; return ruler.getBoundingClientRect().height; };
  const sc = px('calc(1000px * var(--rwc,1))') / 1000;   /* 앱 프레임 배율 × --rwc */
  const av = px('var(--rw-av)'), gt = px('var(--rw-gt)'), lt = px('var(--rw-lt)');
  const lnk = px('calc(1000px * var(--rw-lnk,1))') / 1000 / sc;
  const lnm = px('calc(1000px * var(--rw-lnm,1))') / 1000 / sc;
  ruler.remove();
  const L = q('#relw .rw-lintel').getBoundingClientRect();
  const bg = q('#relw .rw-bg');
  const ap = document.createElement('div');
  ap.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);width:589px;'
    + 'top:calc(var(--rw-gt) - var(--rw-av));height:var(--rw-ah)';
  bg.appendChild(ap);
  const apexT = r1(ap.getBoundingClientRect().top - pr.top);
  ap.remove();
  const bef = getComputedStyle(q('#relw .rw-lintel'), '::before');
  return {
    sc: r1(sc), lnk: Math.round(lnk * 1e4) / 1e4, lnm: Math.round(lnm * 1e4) / 1e4,
    pool: r1((gt - av - lt) / sc),                 /* 설계 px */
    linT: r1(L.top - pr.top), linB: r1(L.bottom - pr.top), linH: r1(L.height / sc),
    apexT, clr: r1((apexT - (L.bottom - pr.top)) / sc),
    befH: parseFloat(bef.height), befW: parseFloat(bef.width),
    panel: { t: r1(pr.top), l: r1(pr.left), w: r1(pr.width), h: r1(pr.height) },
  };
})()`;

async function open(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(250);
  return { ctx, page };
}
async function measure(browser, H, css) {
  const { ctx, page } = await open(browser, H, css);
  const o = await page.evaluate(M => eval(M), MEASURE);
  await ctx.close();
  return o;
}
/* 패널 중앙 열띠의 행별 평균 휘도(까치발 좌우 196 · 벽기둥 86 을 피한다) */
async function rows(page, o, h) {
  const P = o.panel;
  const buf = await page.screenshot({ clip: { x: Math.round(P.l + P.w / 2 - 40), y: Math.round(P.t),
    width: 80, height: Math.min(h, Math.round(P.h)) } });
  const png = PNG.sync.read(buf);
  const out = [];
  for (let y = 0; y < png.height; y++) {
    let s = 0;
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      s += 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
    }
    out.push(s / png.width);
  }
  return out;
}
/* 칠 잉크 하변 — 상인방을 끈 사본과 «눈에 보이게» 다른 마지막 행(probe926 [2] 와 같은 자) */
async function paintBottom(browser, H, o) {
  const on = await open(browser, H, ''); const a = await rows(on.page, o, 400); await on.ctx.close();
  const off = await open(browser, H, '#relw .rw-lintel{display:none}');
  const b = await rows(off.page, o, 400); await off.ctx.close();
  let last = null;
  for (let y = Math.floor(o.linT); y < Math.ceil(o.apexT) + 4 && y < a.length; y++)
    if (Math.abs(a[y] - b[y]) >= 1.0) last = y + 1;
  return last;
}

(async () => {
  const browser = await launch(chromium);
  const r = {};
  for (const H of FRAMES) r[H] = await measure(browser, H, '');

  /* ── [1] 항등식 ─────────────────────────────────────────────────────────── */
  ok(FRAMES.every(H => Math.abs(r[H].lnk - Math.min(1, r[H].pool / POOL_FULL)) < 5e-4),
    '[1] ★ `--rw-lnk` = **min(1, pool / 108)** · pool = gt − av − lt — 손 상수가 아니라 «남는 자리를 상인방과 clearance 가 같은 비로 나눈다» 는 항등식(108 = 294 상인방 앵커 − 186 av 상한 = 긴 프레임 pool)',
    FRAMES.map(H => H + ':lnk ' + r[H].lnk.toFixed(4) + '(pool ' + r[H].pool.toFixed(2)
      + '/108 = ' + Math.min(1, r[H].pool / POOL_FULL).toFixed(4) + ')').join(' · '));
  ok(Math.abs(r[1600].linH - LIN * r[1600].lnk) < 0.6,
    '[1b] 그려진 상인방 세로 = 66 × lnk — JS 가 얹은 수가 실제로 그려진 것과 같다(늙은 사본이 아니라 **그려진 상자**에서 잰 수다)',
    '1600 h ' + r[1600].linH.toFixed(2) + ' ↔ 설계 ' + (LIN * r[1600].lnk).toFixed(2));

  /* ── [2] 배분 — 이 회차가 고친 것 ────────────────────────────────────────── */
  const retL = r[1600].linH / r[REF].linH, retC = r[1600].clr / r[REF].clr;
  ok(Math.abs(retL - retC) <= 0.02,
    '[2] ★ 1600 에서 **상인방과 clearance 의 잔존율이 같다** — 띠1 의 압축을 clearance 혼자 지던 것(1.000 ↔ **0.190**)이 이 회차가 고친 결함이다(EW·EX 2인 독립 실측)',
    '상인방 ' + retL.toFixed(3) + ' ↔ clearance ' + retC.toFixed(3) + ' (차 ' + Math.abs(retL - retC).toFixed(3) + ')');
  ok(retC >= 0.55,
    '[2b] ★ clearance 잔존율이 다른 띠 대역(0.520~0.639) 아래로 굶지 않는다 — 수리 전 0.190 이 «이 화면에서 가장 심하게 눌린 띠» 였다',
    'clearance ' + r[1600].clr.toFixed(2) + ' / ' + r[REF].clr.toFixed(2) + ' = ' + retC.toFixed(3));

  /* ── [3] 긴 네 프레임 Δ0 ────────────────────────────────────────────────── */
  ok(LONG.every(H => Math.abs(r[H].lnk - 1) < 1e-3 && Math.abs(r[H].linH - LIN) < 0.6
                  && Math.abs(r[H].clr - r[REF].clr) < 0.5),
    '[3] ★ 긴 네 프레임은 lnk **정확히 1** · 상인방 66 · clearance 동일 — 926 은 1600 한 장만 건드린다(879 [3] 과 같은 규약 · pool 이 108 이라 식이 스스로 비껴간다)',
    LONG.map(H => H + ':lnk ' + r[H].lnk.toFixed(4) + '/h ' + r[H].linH.toFixed(1)
      + '/clr ' + r[H].clr.toFixed(2)).join(' · '));

  /* ── [4] «줄인다» 가 아니라 «같이 준다» ──────────────────────────────────── */
  const lin = SRC.slice(SRC.indexOf('.rw-lintel{'), SRC.indexOf('.rw-lintel::before{left:196px}'));
  /* 2회차 이관 — 옛 [4] 는 «여섯 층이 **전부 lnk** 를 문다» 를 셌다. 2회차가 몰딩 선을 lnm 으로
     갈랐으므로 그 셈은 더는 이 규약이 아니다. 지키려던 것(«잘라 내지 않는다 = 벌거벗은 상수가
     하나도 안 남는다»)만 남기고 자를 그쪽으로 옮긴다 — 소스에 k·m 을 안 문 세로 상수가 남으면
     그 층만 안 줄어 **잘린 것과 같은 그림**이 된다. 배분 규칙 자체는 [4d]·[4e] 가 잰다. */
  /* ⚠ 주석을 먼저 걷어낸다 — 이 절의 주석은 «3px 로 내려앉았다» 처럼 **문제의 수를 인용**하므로
     안 걷으면 자기 설명문이 자기를 빨갛게 만든다(2회차에 실제로 그랬다). */
  const molded = (lin.match(/var\(--rw-ln[km],1\)/g) || []).length;
  const naked = (lin.replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/66px \* var\(--rwc,1\) \* var\(--rw-lnk,1\)/, '')
                    .match(/(?<![\w.])(?:5|6|11|12|54|59|64|66|78|30|3)px(?! \* var\(--rw-ln)/g) || []);
  ok(molded >= 14 && naked.length === 0,
    '[4] ★ 상인방 블록에 **k·m 을 안 문 세로 상수가 하나도 없다**(소스) — 12회차가 «남는 자리에 맞춰 높이만» 줄이다 13px 잘려 13회차가 되돌린 자리다. 한 층이라도 상수로 남으면 그 층만 안 줄어 잘린 것과 같은 그림이 된다',
    'k·m 을 문 세로 길이 ' + molded + '개 · 벌거벗은 상수 ' + naked.length + '개'
      + (naked.length ? ' (' + naked.join(',') + ')' : ''));
  ok(Math.abs(r[1600].befH / (78 * r[1600].lnk) - 1) < 0.03
     && Math.abs(r[1600].befW / (30 * r[1600].lnk) - 1) < 0.03,
    '[4b] 까치발도 **등방**(폭·높이 같은 k) — 세로만 줄이면 356 이 금지한 «비균등» 이다',
    '1600 까치발 ' + r[1600].befW.toFixed(1) + '×' + r[1600].befH.toFixed(1)
      + ' (기대 ' + (30 * r[1600].lnk).toFixed(1) + '×' + (78 * r[1600].lnk).toFixed(1) + ')');
  /* 2회차 — 몰딩 선 하한(GL·GM 2인 독립 지적: 얇은 층 3px 이 줄눈 어두운선 3px 과 동률이 됐다) */
  ok(FRAMES.every(H => Math.abs(r[H].lnm - Math.max(r[H].lnk, MOLD_MIN / MOLD_THIN)) < 5e-4),
    '[4d] ★ `--rw-lnm` = **max(lnk, 4/5)** — 몰딩 선(5·6·5·5)과 꼬리(2)는 **하한 4px**(= 벽 켜 줄눈 어두운선 3 + 1)에 닿을 때까지만 같이 줄고 나머지는 몸통(43)이 흡수한다. 이 띠가 있는 이유가 «켜 줄눈보다 확실히 두꺼운 단 하나» 라 그 약속이 배율보다 먼저다(2회차 채점 2인 GL·GM 독립 일치)',
    FRAMES.map(H => H + ':lnm ' + r[H].lnm.toFixed(4) + '(lnk ' + r[H].lnk.toFixed(4) + ')').join(' · '));
  ok(Math.abs(5 * r[1600].lnm - 4) < 0.05 && 5 * r[1600].lnm >= MOLD_MIN - 0.05
     && Math.abs((6 * r[1600].lnm) / (5 * r[1600].lnm) - 6 / 5) < 1e-6,
    '[4e] ★ 1600 의 몰딩 선 = **4 / 4.8 / 4 / 4** — 얇은 층이 하한 4px 에 정확히 앉고 **층별 비 5:6:5:5 가 보존**된다(1회차의 균일 축소는 3 / 5 / 3 / 4 로 흩어져 하이라이트:그림자 비가 −28% 움직였다 · GM 실측)',
    '가장 얇은 몰딩 ' + (5 * r[1600].lnm).toFixed(2) + 'px (줄눈 어두운선 3px 의 '
      + ((5 * r[1600].lnm) / 3).toFixed(2) + '배) · 몸통 '
      + (66 * r[1600].lnk - 23 * r[1600].lnm).toFixed(2) + 'px',
  );
  const pb = {};
  for (const H of [1600, REF]) pb[H] = await paintBottom(browser, H, r[H]);
  const rel = (H) => (pb[H] - r[H].linT) / (r[H].linB - r[H].linT);
  ok(pb[1600] != null && pb[REF] != null && Math.abs(rel(1600) - rel(REF)) <= 0.06,
    '[4c] ★ 그려진 **칠 하변의 상인방 안 상대 위치**가 두 프레임에서 같다(화소) — 상자만 줄고 칠이 잘렸다면 여기서 갈린다',
    '1600 ' + rel(1600).toFixed(3) + ' ↔ ' + REF + ' ' + rel(REF).toFixed(3));

  /* ── [5] 띠1(94)은 한 글자도 안 건드렸다 ─────────────────────────────────── */
  ok(Math.abs(r[1600].apexT / r[1600].sc - 94) <= 0.5,
    '[5] ★ 1600 의 띠1 = **정확히 94**(= 20 금테 + 66 상인방 + 8 clearance 의 그 94) — 이 회차는 `--rw-gt` 첫째 인자를 안 건드리고 **그 안의 배분만** 바꿨다(879 9회차: 94 를 올리는 길은 벽 1.7px = 요구의 5.1%, 그것도 가장 눌린 띠4 에서 뺏는 거래다)',
    '띠1 ' + (r[1600].apexT / r[1600].sc).toFixed(2) + ' · 상인방 ' + r[1600].linH.toFixed(2)
      + ' + clearance ' + r[1600].clr.toFixed(2) + ' + 금테 ' + (r[1600].linT / r[1600].sc).toFixed(2));
  ok(/--rw-gt:max\(calc\(var\(--rw-av\) \+ 94px \* var\(--rwc,1\)\)/.test(SRC),
    '[5b] 소스의 `--rw-gt` 첫째 인자가 여전히 `av + 94` 다 — 926 이 이 상수를 건드려 [2b]·[2b2](879)를 흔들지 않았다',
    'av + 94 그대로');

  /* ── §R 되돌림 시험 ─────────────────────────────────────────────────────── */
  const back = await measure(browser, 1600, '#relw{--rw-lnk:1 !important}');
  const retC0 = back.clr / r[REF].clr;
  ok(Math.abs(back.linH - LIN) < 0.6 && retC0 <= 0.25,
    '§R ★ lnk 를 1 로 되돌린 사본에서 clearance 가 **0.190 자리로 되돌아간다** — 이 회차가 실제로 그 결함을 고쳤고, [2] 의 문턱이 무르지 않다는 증거',
    '되돌린 1600 상인방 ' + back.linH.toFixed(2) + ' · clearance ' + back.clr.toFixed(2)
      + ' (잔존 ' + retC0.toFixed(3) + ')');
  ok(Math.abs(back.apexT - r[1600].apexT) < 0.5,
    '§R2 되돌린 사본에서도 **띠1 은 94 로 같다** — 이 회차가 띠1 총량이 아니라 그 안의 배분만 움직였음을 사본이 못박는다',
    '되돌린 띠1 ' + back.apexT.toFixed(2) + ' ↔ 제품 ' + r[1600].apexT.toFixed(2));
  /* §R3 — «늙은 사본으로 k 를 구하면 틀린다»(rwMulFit 의 av 174 ↔ 제품 182 · 940 등재) */
  const { ctx, page } = await open(browser, 1600, '');
  const copy = await page.evaluate(() => {
    const s = +getComputedStyle(document.getElementById('relw')).getPropertyValue('--rwc') || 1;
    const panelH = frameH - RW_TOP - RW_BOT - RW_PCB, bowlH = Math.min(panelH, 1527 * s);
    const sp = bowlH - 830 * s, g3 = Math.min(24 * s, Math.max(17 * s, sp * 0.033 + 1.9 * s));
    const tt = bowlH - (88 + 12 + 226) * s - g3 - 516 * s;
    return { tt, av: Math.min(186 * s, (tt - 174 * s) / 2, tt - 285 * s) };
  });
  await ctx.close();
  ok(Math.abs(copy.av - r[1600].pool) > 5 && Math.abs(r[1600].lnk - Math.min(1, r[1600].pool / POOL_FULL)) < 5e-4,
    '§R3 ★ `rwMulFit()` 의 **늙은 JS 사본**(av 의 182 를 174 로 들고 있다 · tt ' + copy.tt.toFixed(1)
      + ' ↔ 제품 실측)으로는 이 k 를 못 구한다 — 그래서 `rwLintelFit()` 은 사본이 아니라 **자 막대로 제품에게 묻는다**(갈림 자체는 940 으로 등재)',
    '사본 av ' + copy.av.toFixed(2) + ' · 제품 pool ' + r[1600].pool.toFixed(2)
      + ' · 얹힌 lnk ' + r[1600].lnk.toFixed(4));

  await browser.close();
  console.log('\nVERIFY926 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
