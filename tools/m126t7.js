/* 126 ②-2 (7회차) — «우리 잉크 bbox» 와 «레퍼런스 잉크 bbox» 를 **같은 마스크로** 나란히 잰다.
 *
 *   node tools/m126t7.js            # 전 대상
 *   node tools/m126t7.js qs         # 키에 'qs' 가 들어간 대상만
 *
 * 왜 새로 만드나 — `m126ink.js` 는 «scaleX≠1 인 칸» 만 모은다. 7회차가 잡는 자리 중
 * `.tab .tl`(A1 하단 탭 라벨)은 scaleX 가 없어서 그 도구에 아예 안 잡힌다.
 * 그리고 §11 이 확립한 «높이로 fs 를 풀고, 폭은 sx» 를 돌리려면 우리 값만이 아니라
 * **레퍼런스 값도 같은 임계로** 있어야 하는데, 지금까지는 비평가가 각자 다른 임계로 재서
 * §10 처럼 «임계 230 이면 +9%, 150 이면 0%» 로 갈렸다. 여기서 한쪽으로 고정한다.
 *
 * 마스크 — 저장소 관례인 **흰 채움 min(rgb) > 150** (`box52.js`·`m126lbl.js` 와 같은 값).
 *   · 우리 캡처: `m126ink.js` 의 차분법(요소 숨기기 전/후 + 잡음 기준선)으로 «그 글자가 그린 픽셀» 만
 *     남긴 뒤 그 안에서 흰 채움을 센다. 배경이 무엇이든 오염되지 않는다.
 *   · 레퍼런스: 차분을 쓸 수 없으니(정지 이미지) **같은 창** 안에서 흰 채움만 센다.
 *     창은 우리 요소의 rect 를 그대로 쓰고 세로만 **+84**(상태바) 한다 — 이 화면들은 이미
 *     레이아웃이 ref 에 맞춰져 있으므로 같은 창이 같은 글자를 문다.
 *     ⚠ 창 안에 다른 흰 것(아이콘·옆 글자)이 들어가면 값이 커진다. `--pad` 로 좁혀 가며 확인할 것.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const FILT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const argN = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const PAD = argN('--pad', 14);
const TH = argN('--th', 150);
const argBLK = argN('--blk', 90);   /* 근흑 판정 — max(rgb) < BLK */
const argRAD = argN('--rad', 5);    /* 흰 코어에서 근흑을 찾는 반경(px) */

/* 화면 · 대상 — sel 은 화면 안에서 여러 개면 전부 잰다(text 로 라벨을 붙인다). */
const SCREENS = [
  {
    k: '02-메인', ref: 'docs/ref/02-기본-메인-화면.jpg', steps: [],
    sels: ['.tab .tl', '#sideL .ibtn .sl', '#sideR .ibtn .sl', '#botleft .ubtn[data-util=town] .ul'],
    /* 라벨 뒤에 이모지 아이콘이 **겹쳐** 있다(`.tab .tl{margin-top:-22px}` · 레일도 같다).
       라벨만 숨겼다 찍으면 «드러난 아이콘 픽셀» 이 차분에 그대로 들어와 잉크로 읽힌다 —
       실제로 「상점」 흰 코어가 61×34(외곽선 포함 61×41 보다 큼 = 물리적으로 불가능)로 나왔고
       탭마다 높이가 28~34 로 흩어졌다. 이모지가 저마다 다른 흰 부위를 갖기 때문이다.
       그래서 **네 장 전부에서 아이콘·배지를 먼저 숨긴 채** 잰다. 뒤가 무엇이든 차분은 글자만 남는다. */
    hide: ['.tab .ti', '.tab .bdg', '.tab .nw', '.ibtn .si', '.ibtn .bdg', '#botleft .ui'],
  },
  {
    k: '22-퀘스트', ref: 'docs/ref/22-퀘스트-팝업.jpg', steps: ['.side .ibtn[data-pop="quest"]'],
    sels: ['.qs-t', '.mhead h2'],
  },
  /* 8회차 — `.mhead h2` 는 **A5 공용 모달 헤더**라 22 만 보고 고치면 나머지가 같이 움직인다.
     ref 가 있는 나머지 헤더 화면도 같이 재서 «22 를 맞추면 남이 어긋나는지» 를 먼저 본다. */
  { k: '69-우편함', ref: 'docs/ref/69-우편함-팝업.jpg', steps: ['#menub', '#mnw [data-mn="mail"]'], sels: ['.mhead h2'] },
  /* 8회차 — r7 비평가 O·P 가 ② 2·4·5순위로 독립 일치한 19 자리들 */
  { k: '19-프로필', ref: 'docs/ref/19-프로필-팝업.jpg', steps: ['#profBtn'],
    sels: ['.pf-msn>i', '#pfw .pf-tgl .lb>i', '#pfw .pf-tgl .bn>i'] },
  /* 14회차 — r13 비평가 Z 의 ② 1순위(«10 「소환」 탭 라벨은 폭은 맞는데 높이만 +20.7%»)를
     같은 마스크로 다시 재려고 넣었다. `.stab` 은 96 이 만든 **공용 서브탭**이라 여기 하나를
     고치면 03·06·13·23·47 이 같이 움직인다 — 반드시 이 표로 부호를 확인하고 손댄다. */
  { k: '10-상점', ref: 'docs/ref/10-상점-팝업-소환-탭.jpg', steps: ['.tab[data-t="shop"]'],
    sels: ['.shp-cats .stab>i'] },
  /* 같은 공용 부품을 쓰는 다른 두 화면 — «10 한 화면만 어긋난 것인가, 부품이 어긋난 것인가» 를 가른다. */
  { k: '03-던전', ref: 'docs/ref/03-던전-팝업.jpg', steps: ['.tab[data-t="adv"]'], sels: ['.stabs .stab>i'] },
  { k: '23-훈련', ref: 'docs/ref/23-훈련-팝업.jpg', steps: ['.tab[data-t="grow"]'], sels: ['.stabs .stab>i'] },
];

const NOISE_TH = 18;

async function main() {
  const browser = await launch(chromium);
  const rows = [];
  for (const s of SCREENS) {
    if (FILT && !s.k.includes(FILT) && !s.sels.some((x) => x.includes(FILT))) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1400);
    for (const sel of s.steps) { await page.click(sel, { timeout: 4000, force: true }).catch(() => {}); await page.waitForTimeout(700); }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
    if (s.hide && s.hide.length) {
      await page.evaluate((sels) => sels.forEach((q) => document.querySelectorAll(q).forEach((e) => { e.style.visibility = 'hidden'; })), s.hide);
    }
    await page.waitForTimeout(400);

    /* 레퍼런스 이미지를 페이지 안 캔버스에 올려 둔다(의존성 0 — box52.js 와 같은 방식). */
    const refB64 = fs.readFileSync(path.join(ROOT, s.ref)).toString('base64');
    const mime = /\.png$/i.test(s.ref) ? 'image/png' : 'image/jpeg';
    await page.evaluate(async ({ b64, mime }) => {
      const im = new Image(); im.src = `data:${mime};base64,` + b64; await im.decode();
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      c.getContext('2d', { willReadFrequently: true }).drawImage(im, 0, 0);
      window.__ref = { d: c.getContext('2d').getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height };
    }, { b64: refB64, mime });

    const items = await page.evaluate(({ sels, PAD }) => {
      const out = []; let i = 0;
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          if (r.bottom < 0 || r.top > innerHeight) return;
          const m = cs.transform.match(/matrix\(([^)]+)\)/);
          el.setAttribute('data-t7', String(i));
          out.push({
            i, sel, text: (el.textContent || '').trim().slice(0, 12),
            fs: parseFloat(cs.fontSize), sx: m ? +parseFloat(m[1].split(',')[0]).toFixed(4) : 1,
            stroke: cs.webkitTextStrokeWidth,
            win: [Math.max(0, Math.floor(r.left - PAD)), Math.ceil(r.right + PAD),
                  Math.max(0, Math.floor(r.top - PAD)), Math.ceil(r.bottom + PAD)],
          });
          i++;
        });
      }
      return out;
    }, { sels: s.sels, PAD });

    for (const it of items) {
      const clip = { x: it.win[0], y: it.win[2], width: it.win[1] - it.win[0], height: it.win[3] - it.win[2] };
      const shot = async () => (await page.screenshot({ clip })).toString('base64');
      const a = await shot();
      await page.waitForTimeout(100); const n1 = await shot();
      await page.waitForTimeout(100); const n2 = await shot();
      await page.evaluate((i) => { const e = document.querySelector(`[data-t7="${i}"]`); if (e) e.style.visibility = 'hidden'; }, it.i);
      await page.waitForTimeout(100);
      const b = await shot();
      await page.evaluate((i) => { const e = document.querySelector(`[data-t7="${i}"]`); if (e) e.style.visibility = ''; }, it.i);

      const r = await page.evaluate(async ({ a, n1, n2, b, it, TH, NOISE_TH, BLK, RAD }) => {
        const dec = async (b64) => {
          const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
          const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
          return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height };
        };
        const A = await dec(a), N1 = await dec(n1), N2 = await dec(n2), B = await dec(b);
        const df = (p, q, o) => Math.abs(p[o] - q[o]) + Math.abs(p[o + 1] - q[o + 1]) + Math.abs(p[o + 2] - q[o + 2]);
        const bb = () => ({ x0: 1e9, x1: -1, y0: 1e9, y1: -1, n: 0 });
        const put = (o, x, y) => { o.n++; if (x < o.x0) o.x0 = x; if (x > o.x1) o.x1 = x; if (y < o.y0) o.y0 = y; if (y > o.y1) o.y1 = y; };
        const done = (o) => o.n < 6 ? null : { w: o.x1 - o.x0 + 1, h: o.y1 - o.y0 + 1, n: o.n, x0: o.x0, y0: o.y0 };
        /* «흰 코어» 마스크 — 밝기만으로는 못 가른다. 22 퀘스트 카드처럼 **배경 자체가 밝은** 자리에서는
           min(rgb)>150 이 배경을 통째로 잉크로 읽는다(첫 실행: ref 행 프로파일이 창 폭 294 로 꽉 찼다).
           이 게임의 글자는 예외 없이 «흰 채움 + 검정 외곽선» 이므로, 반경 RAD 안에 근흑(max(rgb)<BLK)이
           있는 흰 픽셀만 글자로 센다. 배경은 검정 테두리를 달고 있지 않으니 걸러진다.
           우리 캡처와 레퍼런스에 **같은 함수**를 쓴다(LESSONS 21 — ref/cap 은 같은 코드로 잰다). */
        const core = (d, W, H, x, y) => {
          const o = (y * W + x) * 4;
          if (Math.min(d[o], d[o + 1], d[o + 2]) <= TH) return false;
          for (let dy = -RAD; dy <= RAD; dy++) {
            const yy = y + dy; if (yy < 0 || yy >= H) continue;
            for (let dx = -RAD; dx <= RAD; dx++) {
              const xx = x + dx; if (xx < 0 || xx >= W) continue;
              const q = (yy * W + xx) * 4;
              if (Math.max(d[q], d[q + 1], d[q + 2]) < BLK) return true;
            }
          }
          return false;
        };
        /* 우리 쪽 — 차분 잉크(외곽선 포함) + 그 안의 흰 채움 */
        const ink = bb(), fill = bb();
        for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
          const o = (y * A.W + x) * 4;
          if (df(A.d, B.d, o) < NOISE_TH) continue;
          if (df(A.d, N1.d, o) >= NOISE_TH || df(A.d, N2.d, o) >= NOISE_TH || df(N1.d, N2.d, o) >= NOISE_TH) continue;
          put(ink, x, y);
          if (core(A.d, A.W, A.H, x, y)) put(fill, x, y);
        }
        /* 레퍼런스 — 창을 «요소 rect» 가 아니라 **우리 잉크 bbox** 에서 뽑는다.
           rect + 여유로 잡으면 위아래 이웃(아이콘·진행바)의 흰 픽셀을 같이 물어
           높이가 통째로 틀린다(첫 실행에서 .qs-t 가 31 vs «65» 로 나왔다 — 창 높이 그대로다).
           우리 글자가 ref 보다 작으므로 ref 잉크는 이 창을 조금 넘을 수 있다 → 사방 25%(최소 6px) 키운다. */
        const F = done(fill) || done(ink);
        const R = window.__ref, rf = bb();
        let ry0, ry1, rx0, rx1;
        if (F) {
          const gx = Math.max(6, Math.round(F.w * 0.25)), gy = Math.max(6, Math.round(F.h * 0.25));
          rx0 = it.win[0] + F.x0 - gx; rx1 = it.win[0] + F.x0 + F.w + gx;
          ry0 = it.win[2] + F.y0 - gy + 84; ry1 = it.win[2] + F.y0 + F.h + gy + 84;
        } else { rx0 = it.win[0]; rx1 = it.win[1]; ry0 = it.win[2] + 84; ry1 = it.win[3] + 84; }
        const prof = [];
        for (let y = Math.max(0, ry0); y < Math.min(ry1, R.H); y++) {
          let c = 0;
          for (let x = Math.max(0, rx0); x < Math.min(rx1, R.W); x++) {
            if (core(R.d, R.W, R.H, x, y)) { c++; put(rf, x, y); }
          }
          prof.push(c);
        }
        const r = done(rf);
        /* 창 가장자리에 잉크가 붙어 있으면 이웃을 물었을 가능성이 크다 — 표시만 하고 값은 낸다. */
        const edge = r ? (r.y0 <= ry0 + 1 || r.y0 + r.h >= ry1 - 1 || r.x0 <= rx0 + 1 || r.x0 + r.w >= rx1 - 1) : false;
        return { ink: done(ink), fill: done(fill), ref: r, refEdge: edge, prof, win: [rx0, rx1, ry0, ry1] };
      }, { a, n1, n2, b, it, TH, NOISE_TH, BLK: argBLK, RAD: argRAD });

      rows.push(Object.assign({ screen: s.k }, it, r));
    }
    await ctx.close();
  }
  await browser.close();

  const pc = (a, b) => (a == null || b == null) ? '   —  ' : (((a - b) / b * 100 >= 0 ? '+' : '') + ((a - b) / b * 100).toFixed(1) + '%').padStart(7);
  console.log(`\n126 7회차 대상 실측 — 흰 채움 임계 ${TH} · 창 여유 ${PAD}px · ref y=+84\n`);
  console.log('화면        자리                 fs    sx   우리(외곽선) 우리(채움)   ref        Δw      Δh    권장');
  for (const r of rows) {
    const f = r.fill, rf = r.ref;
    const ourW = f && f.w, ourH = f && f.h;
    /* §11 의 처방: 높이로 fs 를 풀고, 그 크기에서 남은 폭 차이를 sx 로 */
    let rec = '';
    if (f && rf) {
      const kFs = rf.h / f.h;
      const fsNew = +(r.fs * kFs).toFixed(1);
      const sxNew = +(r.sx * (rf.w / (f.w * kFs))).toFixed(3);
      rec = `fs ${r.fs}→${fsNew} · sx ${r.sx}→${sxNew}`;
    }
    console.log(
      `${r.screen.padEnd(10)}  ${(r.text + ' [' + r.sel + ']').padEnd(20).slice(0, 20)} ` +
      `${String(r.fs).padStart(5)} ${String(r.sx).padStart(6)}  ` +
      `${(r.ink ? `${r.ink.w}×${r.ink.h}` : 'null').padStart(9)} ${(f ? `${ourW}×${ourH}` : 'null').padStart(9)}  ${(rf ? `${rf.w}×${rf.h}` : 'null').padStart(9)} ` +
      `${pc(ourW, rf && rf.w)} ${pc(ourH, rf && rf.h)}  ${rec}${r.refEdge ? '  ⚠창끝' : ''}`);
    if (process.argv.includes('--prof')) console.log(`      ref 행 프로파일: [${r.prof.join(',')}]`);
  }
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
