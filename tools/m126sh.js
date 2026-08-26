/* 126 ③ (11회차 = 3차 라운드 1회차) — «잉크 위 검정 vs 잉크 아래 검정» 을 분리해서 잰다.
 *
 *   node tools/m126sh.js            # 전 대상
 *   node tools/m126sh.js 10         # 화면 키에 '10' 이 들어간 것만
 *   node tools/m126sh.js --json out.json
 *
 * 왜 이 도구가 필요한가 — §19-7 1.
 *   ③ 은 r8 에서 «우리 6.00 vs ref 3.50 = 과다», r9 에서 «우리 3 vs ref 5 = 부족» 으로
 *   **부호가 뒤집혔다.** 비평가 4명이 두 방법(bbox 차분법 · 광선법)으로 두 번씩 쟀는데도 그랬다.
 *   두 방법 다 **4변을 평균**하기 때문이다. ref 가 «위는 얇고 아래로 떨어지는 검정 그림자» 를
 *   가지면 4변 평균은 그것을 «두께» 로 읽고, 우리가 두께를 올렸다 내렸다 하며 시소가 돈다.
 *
 *   그래서 여기서는 **위(top) 와 아래(bot) 를 절대 섞지 않는다.**
 *   - top  = 잉크 코어 «윗변» 에서 위로 나가며 센 근흑 길이의 중앙값
 *   - bot  = 잉크 코어 «아랫변» 에서 아래로 나가며 센 근흑 길이의 중앙값
 *   - `bot − top` 이 **드롭 섀도의 몫**이다. 스트로크만 있으면 이 값이 0 이어야 한다.
 *
 * 규약은 m126t9 와 같다 — ref 와 우리 캡처에 **같은 함수**를 두 번 돌린다(LESSONS 21).
 * 창(window)도 같다: 우리 흰 코어 bbox 사방 여유 + ref 는 세로 +84(상태바).
 *
 * 판정 열
 *   drop우리 / drop ref = (bot − top). ref 쪽이 +3 이상이면 «ref 는 드롭 섀도를 가진 계열» 이다.
 *   Δdrop 이 −2 이하 = 우리에게 그림자가 모자란다 → `--sh-drop` 토큰 대상.
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
const PAD  = argN('--pad', 16);
const TH   = argN('--th', 150);   /* 흰 채움 — min(rgb) > TH */
const BLK  = argN('--blk', 90);   /* 근흑 — max(rgb) < BLK */
const RAD  = argN('--rad', 5);    /* 흰 픽셀을 «글자» 로 인정하는 근흑 탐색 반경 */
const EXIT = argN('--exit', 110); /* 탈출 판정 — max(rgb) >= EXIT 면 검정 밖 */
const MAXD = argN('--maxd', 16);  /* 최대 진행(px). 여기까지 근흑이면 «배경이 검다» 로 버린다 */
const EDGE = argN('--edge', 4);   /* 코어 bbox 의 진짜 윗변·아랫변에서 이 px 안에 있는 열만 표본 */

const SCREENS = [
  {
    k: '02-메인', ref: 'docs/ref/02-기본-메인-화면.jpg', steps: [],
    /* #chapN 은 §19-4 에서 ref 와 Δ0 으로 맞춘 자리다 — 이 도구의 **자가검증 표본**으로 같이 찍는다. */
    sels: ['#chapN', '.tab .tl', '#sideL .ibtn .sl'],
  },
  { k: '10-상점', ref: 'docs/ref/10-상점-팝업-소환-탭.jpg', steps: ['.tab[data-t="shop"]'],
    sels: ['.shp-card .chd>i', '.shp-card .cbtn .lab', '#shopw .stab>i'] },
  { k: '22-퀘스트', ref: 'docs/ref/22-퀘스트-팝업.jpg', steps: ['.side .ibtn[data-pop="quest"]'],
    sels: ['.mhead h2', '.qs-t', '.qs-all b'] },
  { k: '19-프로필', ref: 'docs/ref/19-프로필-팝업.jpg', steps: ['#profBtn'],
    sels: ['#pfw .pf-btn>i', '#pfw .pf-tgl .lb>i'] },
  { k: '23-훈련', ref: 'docs/ref/23-훈련-팝업.jpg', steps: ['.tab[data-t="grow"]'],
    sels: ['.mhead h2'] },
  /* 11회차 추가 — «손으로 박은 드롭 섀도» 9곳이 스트로크에 묻혀 0px 인 것을 찾았다(§20-2).
     묻힌 것을 풀기 전에 **그 자리의 ref 가 실제로 그림자를 가졌는지** 먼저 잰다(§19-7 의 단서). */
  { k: '69-우편', ref: 'docs/ref/69-우편함-팝업.jpg', steps: ['#menub', '#mnw [data-mn="mail"]'],
    sels: ['.ml-all b', '.ml-b b'] },
  { k: '35-패스', ref: 'docs/ref/35-패스-스테이지패스.jpg', steps: ['#sideL .ibtn[data-pop="pass"]'],
    sels: ['.ps-ttl>i', '.ps-ttl'] },
  { k: '13-재화', ref: 'docs/ref/13-상점-팝업-재화-탭.jpg', steps: ['.tab[data-t="shop"]', '#shopw .stab[data-ss="cur"]'],
    sels: ['.shp-card .chd>i', '.cn-ti>i'] },
  { k: '05-무기', ref: 'docs/ref/05-무기-팝업.jpg', steps: ['.tab[data-t="hero"]'],
    sels: ['.mhead h2', '.stab>i'] },
];

/* ── 한 장에서 «흰 코어 bbox + 위/아래 근흑 프로파일» ─────────────────────────────── */
const MEASURE = `
function measure(d, W, H, x0, x1, y0, y1, P) {
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
  const X0 = Math.max(0, x0), X1 = Math.min(W, x1), Y0 = Math.max(0, y0), Y1 = Math.min(H, y1);
  const core = [];
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (isCore(x, y)) core.push([x, y]);
  if (core.length < 6) return { core: null, n: core.length };
  let a = 1e9, b = -1, c = 1e9, e = -1;
  for (const [x, y] of core) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > e) e = y; }
  const cb = { x0: a, y0: c, w: b - a + 1, h: e - c + 1 };

  /* 열마다 코어의 최상단·최하단을 잡고, 거기서 위/아래로만 근흑을 센다. */
  const colMin = new Map(), colMax = new Map();
  for (const [x, y] of core) {
    if (!colMin.has(x) || y < colMin.get(x)) colMin.set(x, y);
    if (!colMax.has(x) || y > colMax.get(x)) colMax.set(x, y);
  }
  let bgDark = 0;
  const march = (sx, sy, dy) => {
    let n = 0;
    for (let i = 1; i <= P.MAXD; i++) {
      const yy = sy + dy * i;
      if (!inW(sx, yy)) return null;
      const o = at(sx, yy);
      if (Math.max(d[o], d[o+1], d[o+2]) >= P.EXIT) return n;
      n++;
    }
    bgDark++; return null;
  };
  /* **진짜 바깥 변에서만 잰다.** 글자 안쪽 홈(ㅇ 의 속, ㅅ 의 갈래 사이)에서 위로 나가면
     글자 자신의 획을 «검정» 으로 세어 값이 부풀고, 그것이 10회차까지의 노이즈였다.
     코어 bbox 의 윗변(아랫변)에서 EDGE px 안에 있는 열만 표본으로 쓴다. */
  const yTop = cb.y0, yBot = cb.y0 + cb.h - 1;
  const tops = [], bots = [];
  for (const [x, y] of colMin) { if (y - yTop > P.EDGE) continue; const v = march(x, y, -1); if (v != null && v > 0) tops.push(v); }
  for (const [x, y] of colMax) { if (yBot - y > P.EDGE) continue; const v = march(x, y, 1);  if (v != null && v > 0) bots.push(v); }
  const med = (arr) => { if (!arr.length) return null; arr.sort((p, q) => p - q); return +arr[arr.length >> 1].toFixed(2); };
  const t = med(tops), bt = med(bots);
  return {
    core: cb, n: core.length, bgDark,
    top: t, bot: bt, nT: tops.length, nB: bots.length,
    drop: (t == null || bt == null) ? null : +(bt - t).toFixed(2),
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
            sh: (cs.textShadow || 'none').slice(0, 34),
            win: [Math.max(0, Math.floor(r.left - PAD)), Math.ceil(r.right + PAD),
                  Math.max(0, Math.floor(r.top - PAD)), Math.ceil(r.bottom + PAD)],
          });
          i++;
        });
      }
      return out;
    }, { sels: s.sels, PAD });
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
        const ours = measure(A.d, A.W, A.H, wx0, wx1, wy0, wy1, P);
        let ref = { core: null, n: 0 };
        if (ours.core) {
          const gx = Math.max(10, Math.round(ours.core.w * .18)), gy = Math.max(10, Math.round(ours.core.h * .30));
          ref = measure(R.d, R.W, R.H,
            ours.core.x0 - gx, ours.core.x0 + ours.core.w + gx,
            ours.core.y0 - gy + 84, ours.core.y0 + ours.core.h + gy + 84, P);
        }
        out.push({ i: it.i, ours, ref });
      }
      return out;
    }, { shot, refB64, refMime, items, P: { TH, BLK, RAD, EXIT, MAXD, EDGE }, SRC: MEASURE });

    for (const r of res) rows.push(Object.assign({ screen: s.k }, items.find((x) => x.i === r.i), r));
    await ctx.close();
  }
  await browser.close();

  const n = (v, w) => String(v == null ? '—' : v).padStart(w);
  console.log(`\n126 ③ 잉크 «위 vs 아래» 검정 프로파일 — 흰 임계 ${TH} · 근흑 ${BLK} · 탈출 ${EXIT} · 최대 ${MAXD} · 변 ${EDGE}`);
  console.log('drop = (아래 − 위). ref drop ≥ 3 이면 «ref 는 드롭 섀도 계열», Δdrop ≤ −2 면 우리에게 그림자가 모자란다.\n');
  console.log('화면        자리                       fs    sw   우리위 우리아래 우리drop  n   ref위 ref아래 refdrop  n   Δdrop  판정');
  for (const r of rows) {
    const o = r.ours, f = r.ref;
    let verdict = '';
    if (!o.core) verdict = '형태아님(흰코어0)';
    else if (!f.core) verdict = 'ref표본없음';
    else if (o.bgDark > o.n * .4 || f.bgDark > f.n * .4) verdict = '배경근흑 — 대상아님';
    else if (f.drop != null && o.drop != null) {
      const d = +(o.drop - f.drop).toFixed(2);
      if (f.drop >= 3 && d <= -2) verdict = '★ 그림자 부족 — sh-drop 대상';
      else if (f.drop >= 3) verdict = 'ref 그림자 계열(일치)';
      else if (o.drop >= 3 && d >= 2) verdict = '우리만 그림자 — 과다';
      else verdict = '평평(그림자 계열 아님)';
    }
    const dd = (o.drop == null || f.drop == null) ? null : +(o.drop - f.drop).toFixed(2);
    console.log(
      `${r.screen.padEnd(10)}  ${(r.text + ' [' + r.sel.split(' ').pop() + ']').padEnd(26).slice(0, 26)} ` +
      `${n(r.fs, 5)} ${n(r.sw, 5)}  ${n(o.top, 6)} ${n(o.bot, 7)} ${n(o.drop, 8)} ${n((o.nT||0)+'/'+(o.nB||0), 5)}  ` +
      `${n(f.top, 6)} ${n(f.bot, 7)} ${n(f.drop, 7)} ${n((f.nT||0)+'/'+(f.nB||0), 5)} ${n(dd, 7)}  ${verdict}`);
  }
  if (JSON_AT) { fs.writeFileSync(JSON_AT, JSON.stringify(rows, null, 1)); console.log('\n→ ' + JSON_AT); }
  console.log('');
}
main().catch((e) => { console.error(e); process.exit(1); });
