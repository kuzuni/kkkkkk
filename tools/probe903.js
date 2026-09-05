#!/usr/bin/env node
/* 작업 903 재현 자 — `tools/verify432.js` §R2 가 «몇 번에 한 번» 빨간지, 그리고 **무엇이 흔들리는지** 를 센다.
 *   실행: node tools/probe903.js [--n 8] [--frames 1600,2280] [--keep]
 *
 * 등재문(903): «[R2-1600] 이 플레이키 — 같은 트리에서 잉크 높이 348 ↔ 419 로 흔들린다».
 *   판정식은 `looseInk.h < glowInk.h - 20` 이고, `background-size` 를 풀면 `closest-side` 의 ry 가
 *   275 → 245 로 줄어 **작아지는 것이 정답**(396 → 353)인데 실행에 따라 되레 큰 값이 잡힌다.
 *
 * ⚑ 이 자는 **판정하지 않는다**(338·341·368 규칙 — 처방 전에 재현부터). 세는 것만 한다:
 *   [1] 회수 — N 회 중 몇 번이 `verify432` 의 판정식으로 빨간가 (873 처방: «5회 돌려 보니 같더라» 는 반증이 아니다)
 *   [2] 값 — 매 회의 `glowInk` · `looseInk` bbox (h·w·n·y1·y2)
 *   [3] **자리** — 차분 픽셀의 **y 띠**(연속 행 묶음)를 전부 찍는다. 잉크 한 덩어리 말고 다른 띠가
 *       섞이면 bbox 높이는 «잉크» 가 아니라 «잉크 + 곁다리» 다 — 문턱이 `d > 0`(1단위)이라
 *       한 픽셀이 bbox 를 70px 늘릴 수 있다.
 *   [4] 순서 의존 — 같은 페이지에서 A · A/A · N · L 을 연달아 찍으므로, L 을 **두 번**(L, L2) 찍어
 *       «두 L 이 서로 같은가» 도 같이 본다. 다르면 흔들리는 것은 판정식이 아니라 **찍는 순간**이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive } = require('./probe351lib');
const { roi } = require('./probe789');

const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const N = +argOf('--n', 8);
const FRAMES = argOf('--frames', '1600').split(',').map(Number);
/* [5] 처방 후보 — «재기 전에 라스터 세대를 소진한다»(버리는 판 2장). 켜고 끄고 세어 비교한다 */
const WARM = argv.includes('--warm');
/* [6] 처방 후보 — 부분 리라스터(타일 재사용) 끄기. 뒤집힘이 «부분 vs 전체 리라스터» 라면 여기서 죽는다 */
const NOPR = argv.includes('--nopr');
const OPENER = { label: 'tab:box', sel: '.tab[data-t="box"]' };

/* verify432 의 것을 그대로 옮겨 온다(자와 같은 것을 재야 재현이다) */
const MEASURE = function () {
  const pn = document.querySelector('#relw>.rw-panel>.rw-bowl') || document.querySelector('#relw>.rw-panel');
  const mid = document.querySelector('#relw .rw-mid');
  if (!pn || !mid) return { err: 'no panel/mid' };
  const pr = pn.getBoundingClientRect(), mr = mid.getBoundingClientRect();
  const bs = getComputedStyle(mid, '::before');
  return {
    panelTop: +pr.top.toFixed(1), panelBot: +pr.bottom.toFixed(1),
    glowTopAbs: +(mr.top + parseFloat(bs.top)).toFixed(1),
    size: bs.backgroundSize, height: bs.height, width: bs.width,
    /* [5] 처방 후보 — 글로우 **자기 상자**(::before 의 테두리 상자, 페이지 절대 좌표).
       배경은 이 상자 밖으로는 한 픽셀도 못 나가므로 «글로우가 그린 잉크» 의 정의역이다. */
    box: {
      x: +(mr.left + parseFloat(bs.left)).toFixed(2), y: +(mr.top + parseFloat(bs.top)).toFixed(2),
      w: parseFloat(bs.width), h: parseFloat(bs.height),
    },
  };
};

const FREEZE = function () {
  window.requestAnimationFrame = function () { return 0; };
  const top = setTimeout(function () {}, 0);
  for (let i = 1; i <= top; i++) { clearTimeout(i); clearInterval(i); }
  clearTimeout(top);
};

async function shotCss(page, css) {
  const tag = css ? await page.addStyleTag({ content: css }) : null;
  await page.waitForTimeout(120);
  const b = await page.screenshot({ type: 'png' });
  if (tag) await tag.evaluate((n) => n.remove());
  return b;
}

/* 차분 + **y 띠 분해**. 좌표는 페이지 절대값. */
async function diffBands(dpage, a, b, r) {
  return dpage.evaluate(async ([x, y, rr]) => {
    const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const A = px(ia), B = px(ib), W = ia.width, H = ia.height;
    const cx1 = rr ? Math.max(0, rr.x) : 0, cy1 = rr ? Math.max(0, rr.y) : 0;
    const cx2 = rr ? Math.min(W, rr.x + rr.width) : W, cy2 = rr ? Math.min(H, rr.y + rr.height) : H;
    let n = 0, x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, worst = 0;
    const perRow = [];
    for (let yy = cy1; yy < cy2; yy++) {
      let rn = 0, rx1 = 1e9, rx2 = -1, rw = 0;
      for (let xx = cx1; xx < cx2; xx++) {
        const i = (yy * W + xx) * 4;
        const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
        if (d > 0) {
          n++; rn++;
          if (xx < x1) x1 = xx; if (xx > x2) x2 = xx;
          if (yy < y1) y1 = yy; if (yy > y2) y2 = yy;
          if (xx < rx1) rx1 = xx; if (xx > rx2) rx2 = xx;
          if (d > worst) worst = d;
          if (d > rw) rw = d;
        }
      }
      if (rn) perRow.push({ y: yy, n: rn, x1: rx1, x2: rx2, worst: rw });
    }
    /* 연속 행 묶음 = 띠 */
    const bands = [];
    for (const r2 of perRow) {
      const last = bands[bands.length - 1];
      if (last && r2.y === last.y2 + 1) {
        last.y2 = r2.y; last.n += r2.n; last.x1 = Math.min(last.x1, r2.x1); last.x2 = Math.max(last.x2, r2.x2);
        if (r2.worst > last.worst) last.worst = r2.worst;
      } else bands.push({ y1: r2.y, y2: r2.y, n: r2.n, x1: r2.x1, x2: r2.x2, worst: r2.worst });
    }
    return { n, x1, y1, x2, y2, w: x2 - x1 + 1, h: y2 - y1 + 1, worst, bands };
  }, [a.toString('base64'), b.toString('base64'), r || null]);
}

const fmtBands = (bx) => bx.bands.map((b) => `y${b.y1}~${b.y2}(h${b.y2 - b.y1 + 1}·${b.n}px·x${b.x1}~${b.x2}·Δ${b.worst})`).join(' ');

(async () => {
  const browser = await launch(chromium, NOPR ? { args: ['--disable-partial-raster'] } : {});
  const out = [];
  try {
    const dctx = await browser.newContext({ viewport: { width: 300, height: 300 } });
    const dpage = await dctx.newPage();
    for (const h of FRAMES) {
      for (let it = 1; it <= N; it++) {
        const { ctx, page } = await fresh(browser, 1080, h);
        await drive(page, OPENER);
        await settle(page);
        await page.evaluate(FREEZE);
        await page.waitForTimeout(150);
        const m = await page.evaluate(MEASURE);
        const R = roi(m, h);
        /* ⚑ 워밍은 **칠을 실제로 바꾸는** 태그여야 한다 — `outline:0` 처럼 그림이 그대로인 태그는
           리라스터를 일으키지 않아 한 판도 소진하지 못한다(실측: 그 경우 뒤집힘이 그대로 뒤에서 난다). */
        if (WARM) { await shotCss(page, '#relw .rw-mid::before{display:none !important}'); await shotCss(page, null); }
        const A = await shotCss(page, null);
        const A2 = await shotCss(page, null);
        const Nb = await shotCss(page, '#relw .rw-mid::before{display:none !important}');
        const L = await shotCss(page, '#relw .rw-mid::before{background-size:auto !important}');
        const L2 = await shotCss(page, '#relw .rw-mid::before{background-size:auto !important}');
        const A3 = await shotCss(page, null);            /* 끝 canary — 처음 판과 같은가 */
        const zz = await diffBands(dpage, A, A3, R);
        const aa = await diffBands(dpage, A, A2, R);
        const glow = await diffBands(dpage, A, Nb, R);
        const loose = await diffBands(dpage, L, Nb, R);
        const loose2 = await diffBands(dpage, L2, Nb, R);
        const ll = await diffBands(dpage, L, L2, R);
        /* [5] 처방 후보 — 같은 두 차분을 **글로우 상자 창**으로 다시 잰다 */
        const G = {
          x: Math.max(R.x, Math.floor(m.box.x)), y: Math.max(R.y, Math.floor(m.box.y)),
          width: 0, height: 0,
        };
        G.width = Math.min(R.x + R.width, Math.ceil(m.box.x + m.box.w)) - G.x;
        G.height = Math.min(R.y + R.height, Math.ceil(m.box.y + m.box.h)) - G.y;
        const glowG = await diffBands(dpage, A, Nb, G);
        const looseG = await diffBands(dpage, L, Nb, G);
        const looseG2 = await diffBands(dpage, L2, Nb, G);
        const redG = !(looseG.h > 0 && looseG.h < glowG.h - 20);
        const red = !(loose.h > 0 && loose.h < glow.h - 20);
        out.push({ h, it, red, redG, aa, glow, loose, loose2, ll, zz, glowG, looseG, looseG2, m, G });
        console.log(`\n── ${h} · ${it}/${N} ${red ? '❌ 빨강' : '✅ 초록'} (판정식 loose.h ${loose.h} < glow.h ${glow.h} − 20 = ${glow.h - 20})`);
        console.log(`   A/A      n=${aa.n} ${aa.n ? `bbox ${aa.w}×${aa.h}@y${aa.y1} | ${fmtBands(aa)}` : ''}`);
        console.log(`   glow     n=${glow.n} bbox ${glow.w}×${glow.h}@y${glow.y1}~${glow.y2} | ${fmtBands(glow)}`);
        console.log(`   loose    n=${loose.n} bbox ${loose.w}×${loose.h}@y${loose.y1}~${loose.y2} | ${fmtBands(loose)}`);
        console.log(`   loose2   n=${loose2.n} bbox ${loose2.w}×${loose2.h}@y${loose2.y1}~${loose2.y2}`);
        console.log(`   L↔L2     n=${ll.n} ${ll.n ? `bbox ${ll.w}×${ll.h}@y${ll.y1} | ${fmtBands(ll)}` : '(같다)'}`);
        console.log(`   [처방] 창 = 글로우 상자 x${G.x}~${G.x + G.width} y${G.y}~${G.y + G.height} → ${redG ? '❌ 빨강' : '✅ 초록'} · glowG.h ${glowG.h} · looseG.h ${looseG.h} (L2 로 재면 ${looseG2.h})`);
        console.log(`   A↔A3(끝) n=${zz.n} ${zz.n ? `bbox ${zz.w}×${zz.h}@y${zz.y1} | ${fmtBands(zz)}` : '(같다)'}`);
        await ctx.close();
      }
    }
    await dctx.close();
  } finally { await browser.close(); }

  console.log('\n════ 집계 ════');
  for (const h of FRAMES) {
    const rs = out.filter((r) => r.h === h);
    const reds = rs.filter((r) => r.red).length;
    console.log(`[${h}] 빨강 ${reds}/${rs.length}회` +
      ` · glow.h ${[...new Set(rs.map((r) => r.glow.h))].join('/')}` +
      ` · loose.h ${[...new Set(rs.map((r) => r.loose.h))].join('/')}` +
      ` · A/A 비영 ${rs.filter((r) => r.aa.n).length}회` +
      ` · A↔A3 비영 ${rs.filter((r) => r.zz.n).length}회` +
      `\n      [처방·글로우 상자 창] 빨강 ${rs.filter((r) => r.redG).length}/${rs.length}회` +
      ` · glowG.h ${[...new Set(rs.map((r) => r.glowG.h))].join('/')}` +
      ` · looseG.h ${[...new Set(rs.map((r) => r.looseG.h))].join('/')}` +
      ` / L2 ${[...new Set(rs.map((r) => r.looseG2.h))].join('/')}` +
      ` · L↔L2 비영 ${rs.filter((r) => r.ll.n).length}회`);
  }
  console.log(`\nPROBE903 ${out.length}회 관측 · 빨강 ${out.filter((r) => r.red).length}회`);
})();
