/* 126 ③ (9회차) — «검정 외곽선 두께» 를 레퍼런스와 우리 캡처에서 **같은 코드로** 잰다.
 *
 *   node tools/m126t9.js            # 전 대상
 *   node tools/m126t9.js 02         # 화면 키에 '02' 가 들어간 것만
 *   node tools/m126t9.js --json out.json
 *
 * §17-4 가 확정한 규약 그대로다.
 *   1. 지표는 **bbox 차분법**(P) — «외곽선 포함 bbox» − «흰 코어 bbox», ÷4.
 *      광선법(O)은 교차 확인용으로만 같이 찍는다.
 *   2. **대상 자격**: «흰(또는 유채색) 채움 + 검정 외곽선» 인 자리만. 흰 코어 픽셀이 0 이면
 *      결함이 아니라 **형태가 다른 것**이므로 «형태 아님» 으로 빼고 채점하지 않는다
 *      (19 「장착 중」 = 검정 단색. 두 회차 연속 오진이 났던 자리다 — §17-3).
 *   3. 배경이 근흑이라 외곽선과 배경을 못 가르는 자리도 뺀다. `bgDark` 로 표시한다.
 *
 * 왜 «같은 코드» 인가 — LESSONS 21. §12·§14-1·§15-4 에서 ③ 이 세 번 갈린 이유는
 * 비평가마다 ref 와 우리에 **다른 방법**(차분 vs 이미지, 임계 60/128/150/230)을 썼기 때문이다.
 * 여기서는 두 이미지에 **글자 하나짜리 함수**(core/ink/march)를 그대로 두 번 돌린다.
 *
 * 창(window) — 요소 rect 가 아니라 **우리 흰 코어 bbox 에서 사방 여유**를 준 창을 쓴다.
 * rect + 여유로 잡으면 위아래 이웃(아이콘·진행바)의 흰 픽셀을 같이 문다(m126t7 §13-2 의 실패).
 * ref 창은 같은 창을 세로만 +84(상태바) 한 것이다.
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
const PAD = argN('--pad', 16);
const TH = argN('--th', 150);    /* 흰 채움 — min(rgb) > TH */
const BLK = argN('--blk', 90);   /* 근흑 — max(rgb) < BLK */
const RAD = argN('--rad', 5);    /* 흰 픽셀을 «글자» 로 인정하는 근흑 탐색 반경 */
const EXIT = argN('--exit', 110);/* 광선법 탈출 판정 — max(rgb) >= EXIT 면 외곽선 밖 */
const MAXD = argN('--maxd', 16); /* 광선 최대 진행(px). 여기까지 근흑이면 «배경이 검다» 로 버린다 */

const SCREENS = [
  {
    k: '02-메인', ref: 'docs/ref/02-기본-메인-화면.jpg', steps: [],
    /* 레일·탭 라벨 뒤에 이모지가 겹쳐 있다(§13-2) — 우리 쪽만 아이콘을 숨기면 ref 와 비대칭이 되므로
       **숨기지 않는다.** 대신 창을 «우리 코어 bbox» 로 좁혀 이모지 몸통이 들어오지 않게 한다. */
    sels: ['#sideL .ibtn .sl', '#sideR .ibtn .sl', '.tab .tl'],
  },
  { k: '10-상점', ref: 'docs/ref/10-상점-팝업-소환-탭.jpg', steps: ['.tab[data-t="shop"]'],
    sels: ['.shp-card .chd>i', '.shp-card .cbtn .lab'] },
  { k: '22-퀘스트', ref: 'docs/ref/22-퀘스트-팝업.jpg', steps: ['.side .ibtn[data-pop="quest"]'],
    sels: ['.mhead h2', '.qs-t'] },
  { k: '19-프로필', ref: 'docs/ref/19-프로필-팝업.jpg', steps: ['#profBtn'],
    sels: ['.pf-msn>i', '#pfw .pf-tgl .lb>i', '#pfw .pf-tgl .bn>i', '#pfw .pf-btn>i'] },
  { k: '23-훈련', ref: 'docs/ref/23-훈련-팝업.jpg', steps: ['.tab[data-t="grow"]'],
    sels: ['.mhead h2'] },
];

/* ── 이미지 한 장에서 «코어 bbox · 잉크 bbox · 광선 두께» 를 낸다 (ref/우리 공용) ───────── */
const MEASURE = `
function measure(d, W, H, x0, x1, y0, y1, P) {
  const at = (x, y) => (y * W + x) * 4;
  const isWhite = (x, y) => { const o = at(x, y); return Math.min(d[o], d[o+1], d[o+2]) > P.TH; };
  const isBlk   = (x, y) => { const o = at(x, y); return Math.max(d[o], d[o+1], d[o+2]) < P.BLK; };
  const inW = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  /* 흰 코어 = 반경 RAD 안에 근흑이 있는 흰 픽셀. 배경(검정 테두리를 안 단 밝은 면)은 걸러진다. */
  const isCore = (x, y) => {
    if (!isWhite(x, y)) return false;
    for (let dy = -P.RAD; dy <= P.RAD; dy++) for (let dx = -P.RAD; dx <= P.RAD; dx++) {
      const xx = x + dx, yy = y + dy;
      if (inW(xx, yy) && isBlk(xx, yy)) return true;
    }
    return false;
  };
  const X0 = Math.max(0, x0), X1 = Math.min(W, x1), Y0 = Math.max(0, y0), Y1 = Math.min(H, y1);
  const core = [];
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (isCore(x, y)) core.push([x, y]);
  if (core.length < 6) return { core: null, ink: null, march: null, n: core.length };
  const bb = (pts) => {
    let a = 1e9, b = -1, c = 1e9, e = -1;
    for (const [x, y] of pts) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > e) e = y; }
    return { x0: a, y0: c, w: b - a + 1, h: e - c + 1 };
  };
  const cb = bb(core);
  /* 잉크 = 코어 ∪ «코어에서 반경 INKR 안의 근흑». 배경이 검으면 INKR 만큼 부풀므로
     아래 march 로 «배경이 검다» 를 따로 잡아 그런 자리는 버린다. */
  const INKR = P.MAXD;
  const seen = new Set(), ink = core.slice();
  for (const [x, y] of core) {
    for (let dy = -INKR; dy <= INKR; dy++) for (let dx = -INKR; dx <= INKR; dx++) {
      const xx = x + dx, yy = y + dy;
      if (!inW(xx, yy) || xx < X0 || xx >= X1 || yy < Y0 || yy >= Y1) continue;
      const k = yy * W + xx; if (seen.has(k)) continue;
      if (isBlk(xx, yy)) { seen.add(k); ink.push([xx, yy]); }
    }
  }
  const ib = bb(ink);
  /* 광선법(교차 확인) — 코어 가장자리에서 4방향으로 나가 근흑 구간 길이를 잰다.
     MAXD 까지 근흑이면 «배경이 검다» 로 버린다(bgDark 카운트). */
  const runs = []; let bgDark = 0;
  const rowMin = new Map(), rowMax = new Map(), colMin = new Map(), colMax = new Map();
  for (const [x, y] of core) {
    if (!rowMin.has(y) || x < rowMin.get(y)) rowMin.set(y, x);
    if (!rowMax.has(y) || x > rowMax.get(y)) rowMax.set(y, x);
    if (!colMin.has(x) || y < colMin.get(x)) colMin.set(x, y);
    if (!colMax.has(x) || y > colMax.get(x)) colMax.set(x, y);
  }
  const march = (sx, sy, dx, dy) => {
    let n = 0;
    for (let i = 1; i <= P.MAXD; i++) {
      const xx = sx + dx * i, yy = sy + dy * i;
      if (!inW(xx, yy)) return null;
      const o = at(xx, yy);
      if (Math.max(d[o], d[o+1], d[o+2]) >= P.EXIT) return n;
      n++;
    }
    bgDark++; return null;
  };
  const push = (v) => { if (v != null && v > 0) runs.push(v); };
  for (const [y, x] of rowMin) push(march(x, y, -1, 0));
  for (const [y, x] of rowMax) push(march(x, y, 1, 0));
  for (const [x, y] of colMin) push(march(x, y, 0, -1));
  for (const [x, y] of colMax) push(march(x, y, 0, 1));
  runs.sort((a, b) => a - b);
  const med = runs.length ? runs[runs.length >> 1] : null;
  return {
    core: cb, ink: ib, n: core.length, bgDark,
    /* bbox 차분법 — 좌우·상하 각 한쪽 두께 */
    tBbox: +(((ib.w - cb.w) + (ib.h - cb.h)) / 4).toFixed(2),
    march: med == null ? null : +med.toFixed(2), nRuns: runs.length,
  };
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

    const items = await page.evaluate(({ sels, PAD }) => {
      const out = []; let i = 0;
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) return;
          if (r.bottom < 4 || r.top > innerHeight - 4) return;
          out.push({
            i, sel, text: (el.textContent || '').trim().slice(0, 10),
            fs: +parseFloat(cs.fontSize).toFixed(1),
            sw: +parseFloat(cs.webkitTextStrokeWidth || 0).toFixed(2),
            win: [Math.max(0, Math.floor(r.left - PAD)), Math.ceil(r.right + PAD),
                  Math.max(0, Math.floor(r.top - PAD)), Math.ceil(r.bottom + PAD)],
          });
          i++;
        });
      }
      return out;
    }, { sels: s.sels, PAD });
    if (!items.length) { await ctx.close(); continue; }

    /* 우리 화면 · 레퍼런스를 둘 다 페이지 안 캔버스로 올린다 → 같은 함수를 두 번 돌린다. */
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
        const ours = measure(A.d, A.W, A.H, wx0, wx1, wy0, wy1, P);
        let ref = { core: null, ink: null, march: null, n: 0 };
        if (ours.core) {
          /* ref 창 = 우리 코어 bbox 사방 여유(최소 10px) + 세로 84 */
          const gx = Math.max(10, Math.round(ours.core.w * .18)), gy = Math.max(10, Math.round(ours.core.h * .30));
          ref = measure(R.d, R.W, R.H,
            ours.core.x0 - gx, ours.core.x0 + ours.core.w + gx,
            ours.core.y0 - gy + 84, ours.core.y0 + ours.core.h + gy + 84, P);
        }
        out.push({ i: it.i, ours, ref });
      }
      return out;
    }, { shot, refB64, refMime, items, P: { TH, BLK, RAD, EXIT, MAXD }, SRC: MEASURE });

    for (const r of res) rows.push(Object.assign({ screen: s.k }, items.find((x) => x.i === r.i), r));
    await ctx.close();
  }
  await browser.close();

  const pc = (a, b) => (a == null || b == null || !b) ? '   —  '
    : (((a - b) / b * 100 >= 0 ? '+' : '') + ((a - b) / b * 100).toFixed(1) + '%').padStart(7);
  console.log(`\n126 ③ 외곽선 두께 — bbox 차분법(주) + 광선법(교차). 흰 임계 ${TH} · 근흑 ${BLK} · 탈출 ${EXIT}\n`);
  console.log('화면        자리                       fs    sw   우리bbox  ref bbox      Δ   우리광선 ref광선       Δ  판정');
  for (const r of rows) {
    const o = r.ours, f = r.ref;
    let verdict = '';
    if (!o.core) verdict = '형태아님(흰코어0)';
    else if (!f.core) verdict = 'ref표본없음';
    else if (o.bgDark > o.n * .4 || f.bgDark > f.n * .4) verdict = '배경근흑 — 대상아님';
    console.log(
      `${r.screen.padEnd(10)}  ${(r.text + ' [' + r.sel.split(' ').pop() + ']').padEnd(26).slice(0, 26)} ` +
      `${String(r.fs).padStart(5)} ${String(r.sw).padStart(5)}  ` +
      `${String(o.tBbox == null ? '—' : o.tBbox).padStart(8)} ${String(f.tBbox == null ? '—' : f.tBbox).padStart(9)} ${pc(o.tBbox, f.tBbox)}  ` +
      `${String(o.march == null ? '—' : o.march).padStart(7)} ${String(f.march == null ? '—' : f.march).padStart(7)} ${pc(o.march, f.march)}  ${verdict}`);
  }
  console.log('');
  if (JSON_AT) { fs.writeFileSync(JSON_AT, JSON.stringify(rows, null, 1)); console.log('json →', JSON_AT); }
}

main().catch((e) => { console.error(e); process.exit(1); });
