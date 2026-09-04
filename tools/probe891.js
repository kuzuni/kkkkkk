#!/usr/bin/env node
/* 작업 891 — 89 유물 소환 **상단 띠에 «가로 랜드마크» 가 있는가**를 화소로 가르는 자(셋째 자).
 *
 *   node tools/probe891.js              # 레퍼런스 + 프레임 5종
 *   node tools/probe891.js --json
 *   node tools/probe891.js --sens       # §R 감도 시험만 (레퍼런스 사본에 선을 주입한다)
 *
 * ── 왜 자를 또 세우는가 ─────────────────────────────────────────────────────
 * 813 9회차 채점 2인이 **같은 구간에서 서로 반대되는 것을 봤다**(review §48):
 *
 *   · EF  «ref 아치 정점 y90» ⇒ 상단 띠 «벽 : 아치머리» = ref 61.4 : 38.6 ↔ 우리 39.6 : 60.4
 *         ⇒ «우리 정점이 69px 위로 밀렸다» 를 ① 의 1순위로 냈다.
 *   · EE  같은 구간(ref y4~142)에 «가로 규칙선이 하나도 없다»(행 평균 기울기 |Δ| ≤ 0.99)고 쟀고,
 *         구간의 **합**은 20.22% vs ref 20.47% 로 이미 맞다고 적었다.
 *
 * 갈린 것은 값이 아니라 **랜드마크의 존재 여부**다. 813 이 6·7·8회차에 세 번 배운 순서가
 * 그대로 여기 적용된다 — «갈리면 셋째 자». 그리고 이 자는 **한 함수를 두 그림에 그대로** 댄다
 * (887 이 스스로 적은 실패 모양 = «같은 규약처럼 보이는 자가 두 쪽에서 서로 다른 것을 잰다»).
 *
 * ── 어떻게 한 함수를 두 그림에 대는가 ───────────────────────────────────────
 * 레퍼런스는 PNG 파일이고 우리 쪽은 살아 있는 페이지다. 그래서 **둘 다 data: URL 로 만들어
 * 브라우저 안 캔버스에 그리고, 페이지 안에서 도는 `measure()` 하나**가 잰다
 * (data: URL 은 캔버스를 오염시키지 않아 `getImageData` 가 열린다).
 *   · 레퍼런스 = `docs/ref/89-유물-팝업.png`(486×687 = 패널 크롭)
 *   · 우리     = `.rw-bowl` 상자만 잘라 찍은 스크린샷(= 같은 «패널만» 크롭)
 * 상수는 전부 **폭의 비율**이다 — 486 과 1080 을 같은 규약으로 재려면 절대 px 를 쓰면 안 된다
 * (A1 2차 라운드 교훈).
 *
 * ── 재는 것 ─────────────────────────────────────────────────────────────────
 *   띠 = 패널 안쪽 상변(= 테두리를 지난 첫 «벽» 행) → 격자 상변(= 카드 면이 시작하는 행)
 *   D1 «절대» 문턱  : 중앙 띠 행평균의 1차 차분 |Δ| ≥ T  (T = 3 · 6 · 12 계조)
 *   D2 «잡음 대비» : |Δ| / median(|Δ|)  ≥ Z             (Z = 10 · 20 · 40)
 * 문턱은 둘 다 스윕한다 — 문턱으로 답이 바뀌면 그 자는 이 약속을 못 맡는다
 * (A3-ⓑ «임계 스윕 없는 크기 지적은 믿지 마라» 의 자기 적용).
 *
 * ── §R 감도 시험 (귀무 결과가 «자가 눈이 먼 것» 이 아님을 못박는다) ─────────
 * 레퍼런스 화소 사본의 **61.4% 자리**(EF 가 정점이라고 한 바로 그 행)에 진폭 A 의 가로선을
 * 그려 넣고 같은 자를 다시 댄다. A 를 2·4·8·16 으로 스윕해 **잡히기 시작하는 진폭**을 찍는다.
 * 그 한계가 레퍼런스의 실제 최댓값보다 크게 위면 «없다» 는 관측이지 눈이 먼 것이 아니다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const REF = path.join(ROOT, 'docs', 'ref', '89-유물-팝업.png');
const FRAMES = [1600, 1841, 1920, 2280, 2600];

const T_SWEEP = [3, 6, 12];        /* D1 — 절대 계조 */
const Z_SWEEP = [10, 20, 40];      /* D2 — 잡음(중앙값) 대비 배수 */
const A_SWEEP = [2, 4, 8, 16];     /* §R — 주입 진폭 */
const EF_AT = 0.614;               /* EF 가 «ref 아치 정점» 이라고 한 자리(띠의 61.4%) */

/* ────────────────────────────────────────────────────────────────────────────
   페이지 안에서 도는 자. 레퍼런스와 우리 캡처가 **똑같이** 이 함수를 지난다.
   ──────────────────────────────────────────────────────────────────────────── */
const MEASURE = /* js */ `
(async (dataUrl, inject) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, W, H).data;
  const lum = (x, y) => { const i = (y * W + x) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; };

  /* 상수는 전부 폭의 비율 — 486 과 1064 를 같은 규약으로 재기 위해서다 */
  const cx0 = Math.round(W * 0.42), cx1 = Math.round(W * 0.58);   /* 중앙 띠 — 아치 정점이 지나가는 폭 */
  const wx0 = Math.round(W * 0.12), wx1 = Math.round(W * 0.88);   /* 넓은 띠 — 테두리·격자 판정용 */

  const rowMean = (y, x0, x1) => { let s = 0; for (let x = x0; x < x1; x++) s += lum(x, y); return s / (x1 - x0); };
  const rowStd = (y, x0, x1) => {
    const m = rowMean(y, x0, x1); let s = 0;
    for (let x = x0; x < x1; x++) { const v = lum(x, y) - m; s += v * v; }
    return Math.sqrt(s / (x1 - x0));
  };
  const brightFrac = (y, th) => { let n = 0; for (let x = wx0; x < wx1; x++) if (lum(x, y) > th) n++; return n / (wx1 - wx0); };

  /* ① 띠 상변 — «테두리를 지난 첫 벽 행». 벽 행 = 어둡고(중앙 평균 < 60) 밝은 규칙선이 아니다.
     ⚠ «결이 있다(std > 1)» 를 조건에 넣으면 안 된다 — 레퍼런스의 벽 윗부분은 결이 거의 0 인
     매끈한 그라디언트라(행 내 std < 1) 그 조건이 **띠의 머리 15행을 통째로 잘라 먹는다**.
     이 자가 묻는 것이 바로 «그 매끈함» 이므로, 매끈한 행을 못 보는 자는 질문을 못 받는다. */
  const isWall = (y) => rowMean(y, cx0, cx1) < 60 && brightFrac(y, 90) < 0.30;
  let top = -1;
  for (let y = 0; y + 8 < H; y++) {
    let all = true;
    for (let k = 0; k < 8; k++) if (!isWall(y + k)) { all = false; break; }
    if (all) { top = y; break; }
  }
  if (top < 0) return { err: '띠 상변을 못 찾았다' };

  /* ② 띠 하변 — 격자 카드 «면» 이 시작하는 행.
     ⚠ «밝은 행» 만으로는 안 된다 — 우리 쪽 상인방(들보)은 폭 전체를 채우는 밝은 띠라
     그 자에는 격자와 구분이 안 된다. 가르는 것은 **두께**다: 격자는 카드가 서 있는 키 큰
     구역이고 규칙선은 몇 행짜리다. ⇒ 밝은 첫 행 뒤 40행의 평균 밝은 비율까지 묻는다. */
  const SPAN = 40;
  let bot = -1;
  for (let y = top + 8; y + SPAN < H; y++) {
    if (brightFrac(y, 60) < 0.30) continue;
    let s = 0;
    for (let k = 0; k < SPAN; k++) s += brightFrac(y + k, 60);
    if (s / SPAN >= 0.20) { bot = y; break; }
  }
  if (bot < 0) return { err: '격자 상변을 못 찾았다' };

  /* ③ 띠 안 중앙 행평균 · 1차 차분. 주입(§R)은 여기 «화소 위» 에서 한다. */
  const n = bot - top;
  const prof = [];
  for (let y = top; y < bot; y++) prof.push(rowMean(y, cx0, cx1));
  let injRow = -1;
  if (inject && inject.amp > 0) {
    injRow = Math.round(n * inject.at);
    if (injRow > 0 && injRow < n) prof[injRow] += inject.amp;   /* 한 행짜리 가로선 */
  }
  /* 띠의 **양 끝 3%** 는 랜드마크 셈에서 뺀다 — 띠의 경계(테두리 안쪽 선 · 격자 카드 상변)는
     «띠 안의 랜드마크» 가 아니라 띠를 정의한 그 경계다. 안 빼면 두 그림 모두 자기 경계를
     자기 랜드마크로 세어 «둘 다 있다» 는 거짓 일치가 난다. */
  const MARGIN = Math.max(2, Math.round(n * 0.03));
  const dif = [];
  for (let i = 1; i < prof.length; i++) dif.push(i - 1 < MARGIN || i > prof.length - 1 - MARGIN ? 0 : prof[i] - prof[i - 1]);
  const abs = dif.map(Math.abs);
  const sorted = abs.slice().sort((a, b) => a - b);
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  let maxAbs = 0, maxAt = -1;
  abs.forEach((v, i) => { if (v > maxAbs) { maxAbs = v; maxAt = i; } });

  const T = ${JSON.stringify(T_SWEEP)}, Z = ${JSON.stringify(Z_SWEEP)};
  const cntT = T.map((t) => abs.filter((v) => v >= t).length);
  const cntZ = Z.map((z) => abs.filter((v) => v >= z * (med || 1e-9)).length);
  /* 주입한 행이 잡혔는가 — §R 의 짝 항 */
  const hitT = injRow > 0 ? T.map((t) => abs[injRow - 1] >= t) : [];
  const hitZ = injRow > 0 ? Z.map((z) => abs[injRow - 1] >= z * (med || 1e-9)) : [];

  /* D1 의 가장 무른 문턱에서 잡힌 자리 목록 — «어디가 랜드마크인가» 를 눈으로 볼 수 있게 */
  const list = [];
  abs.forEach((v, i) => { if (v >= T[0]) list.push({ frac: +((i + 1) / n).toFixed(3), d: +v.toFixed(2) }); });

  return {
    W, H, top, bot, n, margin: MARGIN,
    ramp: Math.max(...prof) - Math.min(...prof),
    maxAbs, maxAtFrac: maxAt < 0 ? -1 : (maxAt + 1) / n,
    med, maxZ: med > 0 ? maxAbs / med : Infinity,
    cntT, cntZ, injRow, hitT, hitZ, list,
    efFrac: ${EF_AT}, efAbs: abs[Math.round(n * ${EF_AT}) - 1] ?? null,
  };
})
`;

const dataUrl = (buf) => 'data:image/png;base64,' + buf.toString('base64');

/* 자를 게이트가 그대로 가져다 쓴다 — **자를 베끼지 않는다**(833 선례 · scan813e 가 scan887 을
   모듈로 재사용한 것과 같은 이유). `verify891` 은 이 `MEASURE` 한 벌만 쓴다. */
module.exports = { MEASURE, REF, EF_AT, T_SWEEP, Z_SWEEP, A_SWEEP, FRAMES, dataUrl };

if (require.main === module) (async () => {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const sensOnly = args.includes('--sens');
  const browser = await launch(chromium);
  const out = { ref: null, frames: {}, sens: [] };

  /* 자를 태울 빈 페이지 하나 — 그림은 전부 data: URL 로 들어간다 */
  const lab = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
  await lab.goto('about:blank');
  const run = (buf, inject) => lab.evaluate(
    ([src, url, inj]) => eval(src)(url, inj),
    [MEASURE, dataUrl(buf), inject || null],
  );

  /* ── ① 레퍼런스 ── */
  const refBuf = fs.readFileSync(REF);
  out.ref = await run(refBuf, null);

  /* ── ② 우리 — 프레임 5종. `.rw-bowl` 상자만 잘라 찍어 «패널만» 크롭을 맞춘다 ── */
  if (!sensOnly) {
    for (const H of FRAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      await p.goto(URL);
      await p.waitForTimeout(900);
      await p.evaluate(() => {
        RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
        S.relic = 99999;
        document.querySelector('#tabbar [data-t="box"]').click();
      });
      await p.waitForTimeout(900);
      const rect = await p.evaluate(() => {
        const el = document.querySelector('#relw .rw-bowl') || document.querySelector('#relw .rw-panel');
        const g = document.querySelector('#rwGrid');
        const r = el.getBoundingClientRect(), q = g.getBoundingClientRect();
        /* 아치는 `.rw-bg::after` 라 의사 요소여서 rect 가 없다 — 계산된 `top` 이 정점이다
           (`border-radius: 295px 295px 0 0` 라 상변이 곧 아치머리의 꼭대기다). */
        const bg = document.querySelector('#relw .rw-bg');
        const apex = parseFloat(getComputedStyle(bg, '::after').top);
        return { x: r.x, y: r.y, w: r.width, h: r.height, gridTop: q.y - r.y, apex };
      });
      const shot = await p.screenshot({
        clip: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.w), height: Math.round(rect.h) },
      });
      const m = await run(shot, null);
      m.domBand = Math.round(rect.gridTop * 10) / 10;
      m.domPanelH = Math.round(rect.h * 10) / 10;
      m.domShare = m.domBand / m.domPanelH;
      m.domApex = Math.round(rect.apex * 10) / 10;
      m.domApexFrac = rect.apex / rect.gridTop;
      out.frames[H] = m;
      await ctx.close();
    }
  }

  /* ── ③ §R 감도 — 레퍼런스 사본의 61.4% 자리에 진폭 A 의 가로선을 주입한다 ── */
  for (const amp of A_SWEEP) {
    const m = await run(refBuf, { at: EF_AT, amp });
    out.sens.push({ amp, hitT: m.hitT, hitZ: m.hitZ, injRow: m.injRow, maxAbs: m.maxAbs });
  }

  await browser.close();

  if (asJson) { console.log(JSON.stringify(out, null, 1)); return; }

  const f3 = (v) => (v === null || v === undefined ? '  —  ' : Number(v).toFixed(3));
  console.log('PROBE891 — 89 유물 소환 상단 띠의 «가로 랜드마크» 유무 (한 함수를 두 그림에 그대로 댄다)\n');
  console.log('[A] 띠와 그 안의 랜드마크  (D1 = |Δ| ≥ 3·6·12 계조 · D2 = |Δ| ≥ 10·20·40 × median|Δ|)');
  const hdr = '     그림               띠(px)   ramp   median|Δ|   max|Δ|  (자리)     maxZ    D1 3/6/12    D2 10/20/40';
  console.log(hdr);
  const line = (name, m) => {
    if (!m || m.err) { console.log(`     ${name.padEnd(18)} ${m ? m.err : '없음'}`); return; }
    console.log(`     ${name.padEnd(18)} ${String(m.n).padStart(5)}  ${m.ramp.toFixed(1).padStart(6)}` +
      `   ${m.med.toFixed(3).padStart(7)}  ${m.maxAbs.toFixed(2).padStart(7)}  (${f3(m.maxAtFrac)})` +
      `  ${(Number.isFinite(m.maxZ) ? m.maxZ.toFixed(1) : '∞').padStart(7)}` +
      `   ${m.cntT.join(' / ').padStart(11)}  ${m.cntZ.join(' / ').padStart(13)}`);
  };
  line('레퍼런스', out.ref);
  for (const H of FRAMES) if (out.frames[H]) line(`우리 ${H}`, out.frames[H]);

  console.log('\n[A2] D1@3 에서 잡힌 자리 (띠 안 위치 · 계조)');
  const dump = (name, m) => console.log(`     ${name.padEnd(18)} ${m.list.length ? m.list.map((o) => `${o.frac}:${o.d}`).join('  ') : '없음'}`);
  dump('레퍼런스', out.ref);
  for (const H of FRAMES) if (out.frames[H]) dump(`우리 ${H}`, { list: out.frames[H].list.slice(0, 8) });

  console.log('\n[B] EF 가 «ref 아치 정점» 이라고 한 자리(띠의 61.4%)의 실제 |Δ| · 그리고 우리 아치 정점의 실제 자리');
  console.log(`     레퍼런스  61.4% 자리 |Δ| = ${f3(out.ref.efAbs)} 계조 (z ${(out.ref.efAbs / out.ref.med).toFixed(1)})` +
    `  ← 그 띠의 max|Δ| 는 ${out.ref.maxAbs.toFixed(2)} · median 은 ${out.ref.med.toFixed(3)}`);
  for (const H of FRAMES) {
    const m = out.frames[H];
    if (m) console.log(`     우리 ${H}  61.4% 자리 |Δ| = ${f3(m.efAbs)} 계조` +
      ` · **우리 아치 정점(DOM) = 띠의 ${(m.domApexFrac * 100).toFixed(1)}%** (패널 상변에서 ${m.domApex}px)`);
  }

  console.log('\n[C] 띠 지분 — DOM (띠 ÷ 패널 높이) · 레퍼런스는 화소로 잰 값');
  const refShare = out.ref.n / out.ref.H;
  console.log(`     레퍼런스  ${(refShare * 100).toFixed(2)}%  (띠 ${out.ref.n} ÷ 크롭 ${out.ref.H})`);
  for (const H of FRAMES) {
    const m = out.frames[H];
    if (m) console.log(`     우리 ${H}  ${(m.domShare * 100).toFixed(2)}%  (띠 ${m.domBand} ÷ 패널 ${m.domPanelH}) · Δ ${((m.domShare / refShare - 1) * 100).toFixed(1)}%`);
  }

  console.log('\n[R] 감도 — 레퍼런스 사본의 61.4% 자리에 가로선을 주입하면 잡히는가');
  console.log('     진폭   D1 3/6/12       D2 10/20/40');
  for (const s of out.sens) {
    const y = (b) => (b ? '○' : '×');
    console.log(`     ${String(s.amp).padStart(4)}   ${s.hitT.map(y).join(' / ')}         ${s.hitZ.map(y).join(' / ')}`);
  }
  console.log('\n  ○ = 잡힌다 · × = 못 잡는다. 이 표가 «없다» 는 관측을 «눈이 멀었다» 와 가른다.');
})();
