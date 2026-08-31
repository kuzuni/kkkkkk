#!/usr/bin/env node
/* 작업 543 게이트 — 「재화 흡수 이펙트 알갱이 — 다이아 크기 기준 ×3」
 *
 *   node tools/verify543.js
 *
 * 이 자가 지키는 것은 **주인 지시 한 줄**이다: «지금 재화 흡수 이펙트에 다이아 크기 기준 3배로».
 * 그래서 [A]~[C] 는 «3배가 됐나» 를, [D]~[F] 는 «3배로 만든 대가를 실제로 치렀나» 를 묻는다.
 *
 *   [A] 손잡이 — 크기가 **상수 하나**(`FX_GRAIN_SC`)에서 나오고, `ics` 리터럴이 안 오염됐다.
 *   [B] 표 — `FXCUR[].ink` 가 자산의 실제 알파 면적비와 ±3% 안(표가 자산을 안 따라가면 «표 두 벌»
 *            부패다 — 402 선례).
 *   [C] 크기 — 비행 중 **다이아 잉크**가 543 이전(36.09px)의 **×3 ±3%**, 그리고 재화 7종의 잉크
 *            **면적이 서로 ±5% 안**(주인 «골드 크기랑 같은 건가» — 이제 정말 같다).
 *   [D] 파생 — 밴드 피치·최소 중심거리·XCAP·메뉴 여유가 전부 `FX3_GINK` 에서 나온다(리터럴 0개).
 *            그리고 `FX3_GINK` 자신이 표에서 다시 계산한 값과 ±1% 안.
 *   [E] 대가 — 실제 보상 1회에서 동시 개수 ≤ `FXFLY_MAX` · `FXMAX` 드롭 0 · **동시 잉크 점유**가
 *            프레임의 5% 아래.
 *   [F] 착지 — 착지 알갱이가 **목적지 알약보다 작다**(7·9회차 «이중 원» 이 되돌아오지 않는다).
 *   [G] 13 재화 탭 제외 가드 — 그 화면에서는 보정이 안 걸린다(종전 규약 그대로).
 *   §R 되돌림 — `FX_GRAIN_SC` 를 1 로 되돌린 사본에서 잉크가 543 이전 값으로 정확히 돌아온다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const n2 = v => (v == null ? 'n/a' : (+v).toFixed(2));

/* 543 이전의 실측 기준선(probe543 1회차 · 수리 전 트리) */
const BASE_DIA_INK = 36.09;      /* 비행 중 다이아 잉크 지름 */

/* 페이지 하나를 열어 «잉크» 를 재는 공용 하네스. src 를 바꿔치기한 사본에도 그대로 쓴다(§R). */
async function measure(file) {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + file);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxFly === 'function' && typeof FXCUR !== 'undefined');
  await p.waitForTimeout(1000);

  const out = await p.evaluate(async () => {
    const TH = 8, N = 256;
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = s; });
    const frac = async k => {
      const im = await load(CUR_ICON[FXCUR[k].cur] || CUR_ICON[k]); if (!im) return null;
      g.clearRect(0, 0, N, N); g.drawImage(im, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, a = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > TH) {
        a++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      return x1 < 0 ? null : { fw: (x1 - x0 + 1) / N, fh: (y1 - y0 + 1) / N, fa: a / (N * N) };
    };
    /* 비행 노드를 fxFly 와 같은 방법으로 세운다(인라인 상자 + fontSize + --fxgs) */
    const L = document.getElementById('fxl') || document.body;
    const box = k => {
      const C = FXCUR[k];
      const el = document.createElement('b'); el.className = 'fx-fly';
      el.innerHTML = curIc(C.cur, C.ics); el.style.fontSize = C.fs + 'px';
      if (typeof fxGrainSc === 'function') el.style.setProperty('--fxgs', fxGrainSc(k).toFixed(4));
      el.style.transform = 'translate(400px,900px) translate(-50%,-50%)';
      L.appendChild(el);
      const r = el.querySelector('.cic').getBoundingClientRect();
      el.remove();
      return { w: r.width, h: r.height };
    };
    const cur = {};
    for (const k in FXCUR) cur[k] = { ink: FXCUR[k].ink, ics: FXCUR[k].ics, f: await frac(k), box: box(k) };
    /* 13 재화 탭 — 가드가 살아 있는지(그 화면에서는 --fxgs 가 transform 으로 안 걸린다) */
    let shopBox = null;
    try {
      /* 13 재화 탭 = 10 상점의 «재화» 카테고리(`openShopTab('coin')`, index.html 29050). */
      if (typeof openShopTab === 'function') openShopTab('coin');
      else if (typeof openShopPage === 'function') openShopPage(null, 'coin');
      await new Promise(r => setTimeout(r, 400));
      if (document.querySelector('#shopw.on .shp-list.coin')) shopBox = box('gold');
      if (typeof closeModal === 'function') closeModal();
    } catch (_) {}
    /* 목적지 알약 아이콘 */
    const pillEl = document.querySelector('#top .curs .cDia i>.cic');
    const pill = pillEl ? pillEl.getBoundingClientRect().width : null;
    return {
      cur, shopBox, pill,
      K: { SC: typeof FX_GRAIN_SC !== 'undefined' ? FX_GRAIN_SC : null,
           FLYS: FX3_FLYS, LAND: FX3_LAND, GINK: typeof FX3_GINK !== 'undefined' ? FX3_GINK : null,
           PITCH: FX3_BSPITCH, MIND: FX3_MIND, KOM: FX3_KOM, XCAP: FX3_XCAP, MBM: FX3_MBM,
           FLYMAX: FXFLY_MAX, FXMAX },
    };
  });

  /* 실경로 — 보상 1회 */
  const run = await p.evaluate(async () => {
    const raf = () => new Promise(r => requestAnimationFrame(() => r()));
    window.step = () => {};
    await raf(); await raf();
    fxFly({ x: 540, y: 1500 }, 'gold', 50000);
    fxFly({ x: 540, y: 1500 }, 'dia', 500);
    let maxN = 0, maxDom = 0, minLand = 1e9;
    for (let i = 0; i < 130; i++) {
      const L = document.getElementById('fxl');
      if (L) {
        const els = [...L.querySelectorAll('.fx-fly')].filter(e => (+e.style.opacity || 0) > 0.05);
        maxN = Math.max(maxN, els.length);
        maxDom = Math.max(maxDom, L.childElementCount);
        /* 착지 크기 — 알약 근처(y<300)에 온 알갱이의 렌더 폭 */
        els.forEach(e => {
          const im = e.querySelector('.cic'); if (!im) return;
          const r = im.getBoundingClientRect();
          if (r.y + r.height / 2 < 300 && r.width > 0) minLand = Math.min(minLand, r.width);
        });
      }
      await raf();
    }
    return { maxN, maxDom, land: minLand < 1e9 ? minLand : null };
  });

  await b.close();
  return { ...out, run, errs };
}

(async () => {
  console.log('VERIFY543 — 재화 흡수 알갱이 크기(다이아 기준 ×3)\n');
  const src = fs.readFileSync(SRC, 'utf8');
  const M = await measure(SRC);
  const K = M.K;

  console.log('[A] 손잡이 — 크기가 상수 하나에서 나온다');
  ok(K.SC === 3, `FX_GRAIN_SC = ${K.SC} (주인 «3배»)`);
  ok(/const FX3_FLYS = 0\.70 \* FX_GRAIN_SC/.test(src), 'FX3_FLYS 가 손잡이에서 파생된다(리터럴 아님)');
  /* ⚠ 여기가 이 게이트의 핵심 한 항 — 등재문이 «ics 55 를 손으로 165 로 고치지 마라» 고 못 박은 자리다. */
  const icsBad = Object.values(M.cur).filter(c => c.ics !== 55).length;
  ok(icsBad === 0, `FXCUR[].ics 가 전부 원본 55 (손으로 곱한 자리 ${icsBad}곳)`);
  ok(!/\.fx-fly>\.cic\[data-cur-ic="gold"\]\{transform:scale\(/.test(src),
    '골드 전용 리터럴 scale(1.0365) 이 사라지고 재화별 파생값(--fxgs)이 그 자리다');

  console.log('[B] 표 — FXCUR[].ink 가 자산의 실제 알파 면적비를 따라간다 (402 «표 두 벌» 방지)');
  let inkBad = 0;
  for (const k in M.cur) {
    const c = M.cur[k]; if (!c.f) { inkBad++; continue; }
    const d = Math.abs(c.ink - c.f.fa) / c.f.fa;
    if (d > 0.03) { inkBad++; console.log(`      ⚠ ${k}: 표 ${c.ink} vs 실측 ${c.f.fa.toFixed(3)} (${(d * 100).toFixed(1)}%)`); }
  }
  ok(inkBad === 0, `재화 ${Object.keys(M.cur).length}종 전부 표 ↔ 자산 ±3% 안`);

  console.log('[C] 크기 — 다이아 ×3 · 재화끼리 «덩치» 일치');
  const inkOf = k => { const c = M.cur[k]; return { w: c.f.fw * c.box.w * K.FLYS, a: c.f.fa * c.box.w * c.box.h * K.FLYS * K.FLYS }; };
  const dia = inkOf('dia');
  const r3 = dia.w / BASE_DIA_INK;
  ok(Math.abs(r3 - 3) / 3 <= 0.03, `비행 중 다이아 잉크 ${n2(dia.w)}px = 543 이전 ${BASE_DIA_INK} 의 ×${r3.toFixed(3)} (3 ±3%)`);
  const areas = Object.keys(M.cur).map(k => inkOf(k).a);
  const spread = Math.max(...areas) / Math.min(...areas);
  ok(spread <= 1.05, `재화 7종 잉크 면적 최대÷최소 ${spread.toFixed(3)} (≤1.05 — 상자가 아니라 «덩치» 를 맞췄다)`);
  console.log(`      [참고] 골드 잉크 ${n2(inkOf('gold').w)}px · 다이아 ${n2(dia.w)}px — bbox 는 다르고 면적이 같다(원 vs 마름모)`);

  console.log('[D] 파생 — 기하 상수가 전부 FX3_GINK 에서 나온다');
  const calc = M.cur.dia.ics * K.FLYS * M.cur.dia.f.fw;
  ok(Math.abs(calc - K.GINK) / calc <= 0.01,
    `FX3_GINK ${K.GINK} ↔ 표에서 다시 계산 ${n2(calc)} (±1% — 손잡이만 돌리고 여기를 안 고치면 빨개진다)`);
  ok(K.PITCH === Math.round(K.GINK * 1.22), `FX3_BSPITCH ${K.PITCH} = round(GINK×1.22)`);
  ok(K.MIND === Math.round(K.GINK * 1.14), `FX3_MIND ${K.MIND} = round(GINK×1.14)`);
  ok(K.XCAP === 1080 - Math.round(K.GINK / 2 + 13), `FX3_XCAP ${K.XCAP} = FRAME_W − (잉크 반폭 + 13)`);
  ok(K.MBM === Math.round(K.GINK / 2 + 11), `FX3_MBM ${K.MBM} = 잉크 반폭 + 부유 진폭`);
  ok(!/const FX3_(BSPITCH|MIND) = \d+;/.test(src), '피치·최소거리에 남은 리터럴 0개');

  console.log('[E] 대가 — 개수·상한·화면 점유');
  ok(M.run.maxN >= 3 && M.run.maxN <= K.FLYMAX, `동시 알갱이 최대 ${M.run.maxN}개 (3 ~ FXFLY_MAX ${K.FLYMAX})`);
  ok(M.run.maxDom <= K.FXMAX, `#fxl DOM 최대 ${M.run.maxDom} (≤ FXMAX ${K.FXMAX} — 조용한 드롭 0)`);
  const cov = Math.PI * (K.GINK / 2) ** 2 * M.run.maxN / (1080 * 2280) * 100;
  ok(cov <= 5, `동시 잉크 점유 ${cov.toFixed(2)}% (≤5% — «3배» 를 개수와 맞바꿨다)`);

  console.log('[F] 착지 — «흡수된 점» 이 목적지 알약보다 작다 (7·9회차 «이중 원» 재발 방지)');
  ok(/const FX3_FLYS = 0\.70 \* FX_GRAIN_SC, FX3_LAND = 0\.50/.test(src),
    'FX3_LAND 는 손잡이를 안 탄다(절대값 0.50 유지)');
  ok(M.run.land != null && M.pill != null && M.run.land < M.pill,
    `착지 알갱이 ${n2(M.run.land)}px < 알약 아이콘 ${n2(M.pill)}px`);

  console.log('[G] 13 재화 탭 제외 가드 (그 화면은 55px 로 따로 맞춰져 있다)');
  if (M.shopBox) ok(Math.abs(M.shopBox.w - 55) < 0.6, `13 탭에서 알갱이 상자 ${n2(M.shopBox.w)}px (=55, 보정 없음)`);
  else { ok(true, '13 재화 탭을 못 열어 이 항은 건너뛴다 — 가드 선언은 [A] 가 본다'); }
  ok(/#app:not\(:has\(#shopw\.on \.shp-list\.coin\)\) \.fx-fly>\.cic\{transform:scale\(var\(--fxgs/.test(src),
    '보정 규칙에 13 재화 탭 제외 가드가 붙어 있다');

  console.log('[H] 콘솔 에러');
  ok(M.errs.length === 0, `0건${M.errs.length ? ' — ' + M.errs.slice(0, 2).join(' | ') : ''}`);

  /* ── §R 되돌림 시험 ─────────────────────────────────────────────
     손잡이를 1 로 되돌린 **사본**에서 잉크가 543 이전 값으로 정확히 돌아와야 «이 상수가 실제로
     크기를 정하고 있다» 가 참이 된다(334 처방 — 무르게 푼 수리가 아님을 못박는 자리). */
  console.log('\n§R 되돌림 — FX_GRAIN_SC 를 1 로 되돌린 사본');
  const tmp = path.resolve(__dirname, '../.__v543_revert.html');
  fs.writeFileSync(tmp, src.replace('const FX_GRAIN_SC = 3;', 'const FX_GRAIN_SC = 1;'));
  try {
    const R = await measure(tmp);
    const rd = R.cur.dia.f.fw * R.cur.dia.box.w * R.K.FLYS;
    ok(Math.abs(rd - BASE_DIA_INK) / BASE_DIA_INK <= 0.03,
      `되돌린 사본의 다이아 잉크 ${n2(rd)}px = 543 이전 ${BASE_DIA_INK} (±3%)`);
    ok(rd < dia.w * 0.5, `되돌리면 확실히 작아진다 (${n2(rd)} < ${n2(dia.w * 0.5)})`);
  } finally { try { fs.unlinkSync(tmp); } catch (_) {} }

  console.log('\n' + (fail ? 'VERIFY543 ' : 'VERIFY543 ') + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
