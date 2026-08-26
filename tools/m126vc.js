/* 126 ① (12회차) — «상자 안에서 글자가 세로로 어디에 앉아 있나» 실측기.
 *
 *   node tools/m126vc.js            # 전 대상
 *   node tools/m126vc.js 22         # 화면 키 필터
 *   node tools/m126vc.js --json out.json
 *
 * 왜 필요한가 — §20-11 1.
 *   11회차 채점에서 U·V 가 ① 에서 **같은 축**을 들었다: «버튼·띠 안에서 글자가 위로 쏠린다»
 *   (U: 22 제목 5.5 · 19 띠 4.5 · 22 버튼 4 / V: 19 「장착 중」 7 · 22 본문 6 · 22 버튼 4.5).
 *   그런데 지금까지의 도구는 전부 **잉크 그 자체**(두께·폭·drop)만 재서, «상자 대비 잉크의 세로 위치»
 *   를 재는 지표가 하나도 없었다. 두 사람이 든 px 수치를 검증도 회수도 못 한다.
 *
 * 재는 법 — 상자는 **우리 DOM 의 rect** 하나만 쓴다(§20-11 1: «상자 좌표는 전부 Δ0~1px 로 맞다»).
 *   ① 우리 캡처에서 그 rect 창 안의 흰 코어 bbox → 중심 y(cy) 와 위·아래 여백.
 *   ② 레퍼런스에서 **같은 rect 창**(y+84 — ROUTINE 의 유일한 변환)의 흰 코어 bbox → 같은 값.
 *   ③ Δcy = 우리 cy − ref cy.  **음수면 우리 글자가 그만큼 위로 쏠려 있다**(내려야 한다).
 *   상자를 양쪽에 공통으로 쓰므로 «상자가 맞다» 는 전제가 깨지면 Δ 도 못 믿는다 —
 *   그래서 상자 위·아래 여백(padT/padB)을 같이 찍어 둔다. 두 여백의 합이 ref 와 크게 다르면
 *   그건 세로 쏠림이 아니라 **잉크 높이**(② 축) 문제다.
 *
 * 창 안에 이웃 잉크(윗줄·아랫줄·아이콘)가 들어오면 bbox 가 통째로 부푼다 →
 * m126sh 의 BAND(가장 빽빽한 행에서 이어지는 띠만 남김)를 **켜서** 쓴다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const FILT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const argN = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const JSON_AT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
const TH  = argN('--th', 150);   /* 흰 채움 — min(rgb) > TH */
const BLK = argN('--blk', 90);   /* 근흑 — max(rgb) < BLK */
const RAD = argN('--rad', 5);    /* 흰 픽셀을 «글자» 로 인정하는 근흑 탐색 반경 */
const PADX = argN('--padx', 2);  /* 가로는 상자를 거의 그대로 */
const PADY = argN('--pady', 6);  /* 세로는 외곽선·그림자가 상자를 살짝 넘으므로 여유 */
const RIMW = argN('--rimw', .82); /* 창 폭의 이 비율 이상을 가로지르면 rim 후보 */
const RIMH = argN('--rimh', 10);  /* 그러면서 이만큼 납작하면 글자가 아니라 rim */
const GATE = process.argv.includes('--gate');
/* 12회차가 회수한 자리 — 다음 회차가 `top` 을 도로 지우면 여기서 걸린다(§21).
   허용 ±2px: 표본마다 ±0.5 흔들리고, ref 는 JPEG 이라 그 이상은 못 따진다. */
const GATE_SELS = ['.q22 .mhead h2', '.qs-t', '.qs-b b', '.qs-all b', '#pfw .pf-msn>i', '#pfw .pf-tgl .lb>i'];
const GATE_TOL = argN('--tol', 2);

const SCREENS = [
  { k: '22-퀘스트', ref: 'docs/ref/22-퀘스트-팝업.jpg', steps: ['.side .ibtn[data-pop="quest"]'],
    /* 잉크가 흰색이 아닌 자리는 임계를 그 색에 맞춰 내린다 — 안 내리면 마스크가 글자를 통째로 놓치고
       엉뚱한 rim 을 문다(12회차에 「일일」#8DDDFF min 141 · 「반복」#A9A8AD min 168 이 그랬다).
       ⛔ `.qs-tg b`(일일/반복 토글)는 **이 도구로 못 잰다** — 임계를 내려도 우리 h 15·21 / ref 18·37 로
          Δh 가 −3·−16 이라 두 마스크가 서로 다른 부분을 문다(선택 알약 rim·이너 라인이 글자와 붙어 있다).
          Δcy 가 +13.5 / −12.0 로 부호까지 갈리므로 **쓰지 마라.** 12회차는 이 자리를 손대지 않았다. */
    sels: ['.q22 .mhead h2', '.qs-t', '.qs-b b', '.qs-all b'] },
  { k: '19-프로필', ref: 'docs/ref/19-프로필-팝업.jpg', steps: ['#profBtn'],
    /* ⛔ `#pfw .pf-btn>i`(「장착 중」)도 제외한다 — **잉크가 순검정이고 외곽선이 없다**(측정표 §7-2).
       흰 코어 마스크를 대면 글자가 아니라 **버튼 면**이 코어로 잡혀 h 67(버튼 높이 119 의 면)이 나온다.
       8회차가 «외곽선 0px» 오진으로 걸렸던 것과 **같은 함정**이다. 검정 잉크는 별도 마스크가 필요하다. */
    sels: ['#pfw .pf-msn>i', { s: '#pfw .pf-tgl .lb>i', th: 120 }] },
  { k: '10-상점', ref: 'docs/ref/10-상점-팝업-소환-탭.jpg', steps: ['.tab[data-t="shop"]'],
    sels: ['.shp-card .chd>i', '.shp-card .cbtn .lab'] },
  /* `.mhead h2` 는 A5 **공용** 모달 헤더다(m126hd 의 경고). 22 한 곳만 보고 고치면
     04·08·11·16·21·69·70·87·103 이 같이 움직인다 — 쏠림이 «공용» 인지 «22 전용» 인지 먼저 가른다. */
  { k: '69-우편', ref: 'docs/ref/69-우편함-팝업.jpg', steps: ['#menub', '#mnw [data-mn="mail"]'], sels: ['.mhead h2'] },
  { k: '21-도감', ref: 'docs/ref/21-도감-보너스-팝업.jpg', steps: ['#menub', '#mnw [data-mn="coll"]'], sels: ['.mhead h2'] },
];

/* ── 창 안 «흰 코어 bbox» (BAND 로 이웃 줄 제거) ──────────────────────────────── */
const MEASURE = `
function core(d, W, H, x0, x1, y0, y1, P) {
  const at = (x, y) => (y * W + x) * 4;
  const isWhite = (x, y) => { const o = at(x, y); return Math.min(d[o], d[o+1], d[o+2]) > P.TH; };
  const isBlk   = (x, y) => { const o = at(x, y); return Math.max(d[o], d[o+1], d[o+2]) < P.BLK; };
  const inW = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const isCore = (x, y) => {
    if (!isWhite(x, y)) return false;
    for (let dy = -P.RAD; dy <= P.RAD; dy++) for (let dx = -P.RAD; dx <= P.RAD; dx++) {
      const xx = x + dx, yy = y + dy;
      if (inW(xx, yy) && isBlk(xx, yy)) return true;
    }
    return false;
  };
  const X0 = Math.max(0, Math.floor(x0)), X1 = Math.min(W, Math.ceil(x1));
  const Y0 = Math.max(0, Math.floor(y0)), Y1 = Math.min(H, Math.ceil(y1));
  const px = [];
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (isCore(x, y)) px.push([x, y]);
  if (px.length < 8) return null;
  /* 가장 빽빽한 행에서 위아래로 «끊기지 않는 띠» 만 남긴다 — 윗줄·아랫줄·아이콘 제거.
     ⚠ 12회차에 걸린 함정: 버튼·알약의 **밝은 rim** 은 검정 테두리에 붙어 있어 isCore 를 통과하고,
     창 폭을 가로지르는 «한 줄짜리 띠» 라 행 밀도가 글자보다 높다 → 피크가 rim 으로 잡힌다
     (22 「모두 받기」·「반복」 이 실제로 그랬다: 띠 폭 = 창 폭 166·204, 높이 3~8).
     그래서 «창 폭의 RIMW 이상을 가로지르는 띠» 는 글자가 아니라고 보고 버리고 다시 찾는다. */
  const winW = X1 - X0;
  let pool = px;
  for (let round = 0; round < 4; round++) {
    if (pool.length < 8) break;
    const rc = new Map();
    for (const [, y] of pool) rc.set(y, (rc.get(y) || 0) + 1);
    let peakY = null, peak = -1;
    for (const [y, k] of rc) if (k > peak) { peak = k; peakY = y; }
    const floor = Math.max(1, peak * 0.10);
    let lo = peakY, hi = peakY;
    while (rc.has(lo - 1) && rc.get(lo - 1) >= floor) lo--;
    while (rc.has(hi + 1) && rc.get(hi + 1) >= floor) hi++;
    let band = pool.filter(([, y]) => y >= lo && y <= hi);
    if (band.length < 8) break;
    let a = 1e9, b = -1, c = 1e9, e = -1;
    for (const [x, y] of band) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > e) e = y; }
    const w = b - a + 1, h = e - c + 1;
    /* rim 판정 — 창 폭을 거의 다 채우면서 납작한 띠 */
    if (w >= winW * P.RIMW && h <= P.RIMH) { pool = pool.filter(([, y]) => y < lo || y > hi); continue; }
    return { x0: a, y0: c, w, h, n: band.length };
  }
  return null;
}`;

async function main() {
  const browser = await launch(chromium);
  const rows = [];
  for (const s of SCREENS) {
    if (FILT && !s.k.includes(FILT)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1400);
    for (const sel of s.steps) { await page.click(sel, { timeout: 4000, force: true }).catch(() => {}); await page.waitForTimeout(700); }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
    await page.waitForTimeout(400);

    const items = await page.evaluate(({ sels, PADX, PADY }) => {
      const out = []; let i = 0;
      for (const ent of sels) {
        const sel = typeof ent === 'string' ? ent : ent.s;
        const th = typeof ent === 'string' ? null : ent.th;
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 6 || r.height < 6) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) return;
          if (r.bottom < 4 || r.top > innerHeight - 4) return;
          out.push({
            i, sel, th, text: (el.textContent || '').trim().slice(0, 12),
            fs: +parseFloat(cs.fontSize).toFixed(1),
            lh: cs.lineHeight === 'normal' ? 'normal' : +parseFloat(cs.lineHeight).toFixed(1),
            box: [+r.left.toFixed(1), +r.top.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)],
            win: [r.left - PADX, r.right + PADX, r.top - PADY, r.bottom + PADY],
          });
          i++;
        });
      }
      return out;
    }, { sels: s.sels, PADX, PADY });
    if (!items.length) { await ctx.close(); continue; }

    const shot = (await page.screenshot()).toString('base64');
    const refB64 = fs.readFileSync(path.join(ROOT, s.ref)).toString('base64');
    const refMime = /\.png$/i.test(s.ref) ? 'image/png' : 'image/jpeg';

    const res = await page.evaluate(async ({ shot, refB64, refMime, items, P, SRC }) => {
      eval(SRC);
      const dec = async (b64, mime) => {
        const im = new Image(); im.src = `data:${mime};base64,` + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
        return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
      };
      const A = await dec(shot, 'image/png'), R = await dec(refB64, refMime);
      const out = [];
      for (const it of items) {
        const [wx0, wx1, wy0, wy1] = it.win;
        const Q = it.th == null ? P : Object.assign({}, P, { TH: it.th });
        const ours = core(A.d, A.W, A.H, wx0, wx1, wy0, wy1, Q);
        const ref  = core(R.d, R.W, R.H, wx0, wx1, wy0 + 84, wy1 + 84, Q);
        out.push({ i: it.i, ours, ref });
      }
      return out;
    }, { shot, refB64, refMime, items, P: { TH, BLK, RAD, RIMW, RIMH }, SRC: MEASURE });

    for (const r of res) rows.push(Object.assign({ screen: s.k }, items.find((x) => x.i === r.i), r));
    await ctx.close();
  }
  await browser.close();

  const f = (v, w, p = 1) => String(v == null ? '—' : (typeof v === 'number' ? v.toFixed(p) : v)).padStart(w);
  console.log(`\n126 ① 세로 쏠림 — 상자 대비 잉크 중심 (흰 임계 ${TH} · 근흑 ${BLK})`);
  console.log('Δcy < 0 = 우리 글자가 그만큼 «위» 로 쏠림(내려야 함). padT/padB = 상자 위·아래 여백.\n');
  console.log('화면       자리                 글자        fs   lh   | 우리 cy padT padB  h | ref cy padT padB  h |  Δcy   Δh');
  const out = [];
  for (const r of rows) {
    const [bx, by, bw, bh] = r.box;
    const cyO = r.ours ? r.ours.y0 + r.ours.h / 2 - by : null;
    const cyR = r.ref  ? r.ref.y0  + r.ref.h  / 2 - by - 84 : null;
    const ptO = r.ours ? r.ours.y0 - by : null, pbO = r.ours ? by + bh - (r.ours.y0 + r.ours.h) : null;
    const ptR = r.ref  ? r.ref.y0 - by - 84 : null, pbR = r.ref ? by + bh - (r.ref.y0 + r.ref.h - 84) : null;
    const dcy = (cyO != null && cyR != null) ? +(cyO - cyR).toFixed(2) : null;
    const dh  = (r.ours && r.ref) ? +(r.ours.h - r.ref.h).toFixed(2) : null;
    console.log(
      r.screen.padEnd(10) + ' ' + r.sel.padEnd(20) + ' ' + (r.text || '').padEnd(11) +
      f(r.fs, 5) + f(r.lh, 6, 1) + ' |' + f(cyO, 8) + f(ptO, 5) + f(pbO, 5) + f(r.ours && r.ours.h, 4, 0) +
      ' |' + f(cyR, 7) + f(ptR, 5) + f(pbR, 5) + f(r.ref && r.ref.h, 4, 0) +
      ' |' + f(dcy, 6) + f(dh, 6) + (dcy != null && dcy <= -2.5 ? '  ★ 위로 쏠림' : ''));
    out.push({ screen: r.screen, sel: r.sel, text: r.text, fs: r.fs, lh: r.lh, box: r.box, cyO, cyR, dcy, dh, ours: r.ours, ref: r.ref });
  }
  if (JSON_AT) fs.writeFileSync(path.join(ROOT, JSON_AT), JSON.stringify(out, null, 1));
  console.log('');
  if (GATE) {
    let ok = 0, bad = 0;
    for (const r of out) {
      if (!GATE_SELS.includes(r.sel)) continue;
      if (r.dcy == null) { bad++; console.log(`  ✗ ${r.sel} «${r.text}» — 표본 없음(ref 또는 우리 마스크 실패)`); continue; }
      if (Math.abs(r.dcy) <= GATE_TOL) { ok++; }
      else { bad++; console.log(`  ✗ ${r.sel} «${r.text}» Δcy ${r.dcy} (허용 ±${GATE_TOL})`); }
    }
    console.log(`\nM126VC ${ok}/${ok + bad} ${bad ? 'FAIL' : 'PASS'}`);
    process.exit(bad ? 1 : 0);
  }
}
main();
