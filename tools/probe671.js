/* 작업 671 — 재현 자. «같은 `.pcb` 안에서 코인 65.3 ↔ 젬 59.06 = 비 1.106» 의 뿌리를 «찍힌 픽셀» 로 묻는다.
 *
 *   node tools/probe671.js
 *
 * 338 규칙 — 처방 전에 재현부터. 등재문(671)은 뿌리를 «젬의 검은 테가 ref 보다 얇다»(색잉크/실루엣
 * .968 vs ref .877) 한 줄로 적었다. 그 값이 맞는지, 그리고 **두 축이 같은 값인지**를 여기서 가른다 —
 * 상자는 정사각이라 한 축만 맞추면 다른 축이 벌어진다(394 규약 «눈금을 먼저 정한다»).
 *
 * 세 갈래로 묻는다:
 *   [A] 자리(in-situ)  — 03 던전 재화 바에서 `verify340` 과 **같은 자**(색 마스크 · 껐다 켠 차분)로 잰다.
 *   [B] 아트(intrinsic) — SVG 를 자리와 무관하게 512px 로 단독 렌더해 «색 잉크 ÷ 실루엣» 을 축별로 잰다.
 *                        (자리 값에는 상자·보정이 섞여 있어 아트의 규격을 못 본다)
 *   [C] 레퍼런스        — 같은 색 마스크로 ref JPEG 를 재서 목표 비율을 얻는다.
 *
 * 결론은 [B] 의 **축별 비대칭**에 있다 — 등재문의 .968 은 **세로** 값이고 가로는 그 절반 가까이 다르다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('  PASS ' + name + ' — ' + got); }
  else { fail++; console.log('  FAIL ' + name + ' — ' + got); }
};

const REF_IMG = 'file://' + path.resolve(__dirname, '../docs/ref/03-던전-팝업.jpg');
const IDX = 'file://' + path.resolve(__dirname, '../index.html');
const REF_Y_OFF = 84;

/* verify340 과 같은 창·마스크를 쓴다 — 자를 새로 만들면 값이 갈린다(402 «표 두 벌») */
const WIN = { gold: { x: 488, y: 99, w: 82, h: 82 }, dia: { x: 789, y: 99, w: 82, h: 82 } };
const MASKS = {
  gold: '(r,g,b) => r > 150 && g > 110 && b < 130 && r - b > 60',
  dia:  '(r,g,b) => b > 130 && b - r > 40 && g > 90',
};

const SCAN_SRC = `(A, B, W, H, mask) => {
  const acc = () => ({ lo: 1e9, hi: -1e9, top: 1e9, bot: -1e9, n: 0 });
  const add = (o, x, y) => { o.n++; if (x < o.lo) o.lo = x; if (x > o.hi) o.hi = x; if (y < o.top) o.top = y; if (y > o.bot) o.bot = y; };
  const put = (o) => ({ w: o.hi - o.lo + 1, h: o.bot - o.top + 1, cx: (o.lo + o.hi) / 2, cy: (o.top + o.bot) / 2, px: o.n });
  const sil = acc(), col = acc();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = A[o], g = A[o+1], b = A[o+2];
    const on = B ? (Math.abs(r - B[o]) + Math.abs(g - B[o+1]) + Math.abs(b - B[o+2])) >= 18
                 : !((Math.abs(r-66)<=14 && Math.abs(g-54)<=14 && Math.abs(b-42)<=14)
                  || (Math.abs(r-58)<=14 && Math.abs(g-46)<=14 && Math.abs(b-34)<=14)
                  || (Math.abs(r-35)<=14 && Math.abs(g-26)<=14 && Math.abs(b-19)<=14)
                  || (Math.abs(r-29)<=14 && Math.abs(g-22)<=14 && Math.abs(b-14)<=14));
    if (!on) continue;
    add(sil, x, y);
    if (mask(r, g, b)) add(col, x, y);
  }
  return { sil: sil.n > 20 ? put(sil) : null, col: col.n > 20 ? put(col) : null };
}`;

/* 아트 단독 렌더 — 알파를 실루엣으로 쓴다(자리 배경·차분이 안 섞인다) */
const ART_SRC = `async ({ href, N, mask }) => {
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = href; });
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const g = c.getContext('2d'); g.clearRect(0, 0, N, N); g.drawImage(im, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  const m = eval('(' + mask + ')');
  const acc = () => ({ lo: 1e9, hi: -1e9, top: 1e9, bot: -1e9, n: 0 });
  const add = (o, x, y) => { o.n++; if (x < o.lo) o.lo = x; if (x > o.hi) o.hi = x; if (y < o.top) o.top = y; if (y > o.bot) o.bot = y; };
  const put = (o) => ({ w: o.hi - o.lo + 1, h: o.bot - o.top + 1, cx: (o.lo + o.hi) / 2, cy: (o.top + o.bot) / 2, px: o.n });
  const sil = acc(), col = acc();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = (y * N + x) * 4, a = d[o+3];
    if (a < 128) continue;
    add(sil, x, y);
    if (m(d[o], d[o+1], d[o+2])) add(col, x, y);
  }
  return { sil: put(sil), col: put(col), N };
}`;

async function capInk(page, kind, sel) {
  const w = WIN[kind];
  await page.evaluate(() => {
    if (document.getElementById('p671-freeze')) return;
    const s = document.createElement('style'); s.id = 'p671-freeze';
    s.textContent = '.pcb-p>b{visibility:hidden!important}.pcb-p,.pcb-p>i,.pcb-p>i>.cic{animation:none!important;transition:none!important}';
    document.head.appendChild(s);
  });
  await page.waitForTimeout(120);
  const clip = { x: w.x, y: w.y - REF_Y_OFF, width: w.w, height: w.h };
  const on = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
  await page.waitForTimeout(120);
  const off = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
  await page.waitForTimeout(60);
  const r = await page.evaluate(async ({ on, off, MASK, SCAN_SRC }) => {
    const load = async (s) => { const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + s; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height }; };
    const A = await load(on), B = await load(off);
    return eval('(' + SCAN_SRC + ')')(A.d, B.d, A.W, A.H, eval('(' + MASK + ')'));
  }, { on, off, MASK: MASKS[kind], SCAN_SRC });
  return r;
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  try {
    await page.goto(IDX);
    await page.waitForTimeout(900);
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(1700);
    await page.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
    await page.waitForTimeout(250);

    /* ── [A] 자리 — 상자 두 값이 정말 1.05 를 넘는가 ── */
    console.log('\n[A] 03 던전 재화 바 — 등재문의 «비 1.106» 재현');
    const box = await page.evaluate(() => {
      const g = document.querySelector('#dunw .pcb-g img.cic'), d = document.querySelector('#dunw .pcb-d img.cic');
      const r = (e) => { const b = e.getBoundingClientRect(); return +(b.width).toFixed(2); };
      return { g: r(g), d: r(d) };
    });
    const rat = box.g / box.d;
    /* 등재문(수리 전) 값은 65.3 ÷ 59.06 = **1.106** 이었다. 수리 뒤에는 두 상자가 한 값이라 1.000 이다 —
       이 항은 «지금 어느 쪽인지» 를 기록하고, 눈금을 지키는 것은 `verify671` [B]·[C] 다. */
    ok('[A1] 코인 상자 ÷ 젬 상자 ≤ 1.05 (411·356 눈금 — 수리 전 등재문 값 1.106)',
      rat <= 1.05, box.g + ' ÷ ' + box.d + ' = ' + rat.toFixed(3) + ' (수리 전 65.3 ÷ 59.06 = 1.106)');

    const cap = { gold: await capInk(page, 'gold', '#dunw .pcb-g>i'), dia: await capInk(page, 'dia', '#dunw .pcb-d>i') };
    for (const k of ['gold', 'dia']) {
      const c = cap[k];
      console.log('  · ' + k + ' 자리 실루엣 ' + c.sil.w + '×' + c.sil.h + ' · 색 잉크 ' + c.col.w + '×' + c.col.h
        + ' · 색÷실루엣 w ' + (c.col.w / c.sil.w).toFixed(3) + ' · h ' + (c.col.h / c.sil.h).toFixed(3));
    }
    ok('[A2] 두 자리의 색 잉크는 이미 거의 같다 — 갈리는 것은 «상자» 다(같은 잉크를 다른 상자로 낸다)',
      Math.abs(cap.gold.col.h - cap.dia.col.h) <= 3,
      'gold 색 h ' + cap.gold.col.h + ' · dia 색 h ' + cap.dia.col.h);

    /* ── [B] 아트 — 자리와 무관한 «색 잉크 ÷ 실루엣» ── */
    console.log('\n[B] 아트 단독(512px) — 상자·보정을 걷어낸 아트 자신의 규격');
    const art = {};
    for (const k of ['gold', 'dia']) {
      const file = path.resolve(__dirname, '../assets/ui/cur-' + k + '.svg');
      const href = 'data:image/svg+xml;base64,' + fs.readFileSync(file).toString('base64');
      art[k] = await page.evaluate(eval('(' + ART_SRC + ')'), { href, N: 512, mask: MASKS[k] });
      const a = art[k];
      a.rw = a.col.w / a.sil.w; a.rh = a.col.h / a.sil.h;
      console.log('  · cur-' + k + '.svg  실루엣 ' + a.sil.w + '×' + a.sil.h + ' · 색 잉크 ' + a.col.w + '×' + a.col.h
        + '  ⇒ 색÷실루엣 w ' + a.rw.toFixed(3) + ' · h ' + a.rh.toFixed(3)
        + ' · 축 비대칭 ' + (Math.max(a.rw, a.rh) / Math.min(a.rw, a.rh)).toFixed(3));
    }
    /* ⚑ 재현은 «수리 전 아트» 를 사본으로 그려서 한다 — 파일이 고쳐진 뒤에도 이 자가 계속
       같은 것을 말하게 하기 위해서다(수리 전 커밋을 다시 체크아웃해야만 도는 자는 다음 세션이 못 쓴다). */
    const OLD_DIA = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 60 60" width="64" height="64" shape-rendering="geometricPrecision">'
      + '<path d="M20 4h24l16 18-28 38L4 22z" fill="#2FA7D8" stroke="#000" stroke-width="4" stroke-linejoin="round"/>'
      + '<path d="M20 4l-6 18 18 38 18-38-6-18z" fill="#67D8F7" stroke="#0E6E96" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M14 22h36" stroke="#0E6E96" stroke-width="2.5"/>'
      + '<path d="M20 4l12 18L44 4" fill="none" stroke="#0E6E96" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M22 24l6 24-14-26z" fill="#CFF6FF" opacity=".9"/></svg>';
    const old = await page.evaluate(eval('(' + ART_SRC + ')'),
      { href: 'data:image/svg+xml;base64,' + Buffer.from(OLD_DIA, 'utf8').toString('base64'), N: 512, mask: MASKS.dia });
    old.rw = old.col.w / old.sil.w; old.rh = old.col.h / old.sil.h;
    console.log('  · 수리 전 cur-dia.svg(사본) 색÷실루엣 w ' + old.rw.toFixed(3) + ' · h ' + old.rh.toFixed(3));
    ok('[B1] 수리 전 젬의 «색÷실루엣» 세로가 등재문의 .968 근처다 (등재문 값의 정체 = 세로 축 하나)',
      Math.abs(old.rh - 0.968) <= 0.03, old.rh.toFixed(3));
    ok('[B2] ⚑ 수리 전 젬은 두 축이 서로 달랐다 — 등재문이 못 본 것 (가로가 세로보다 10% 이상 작다)',
      old.rh / old.rw >= 1.10,
      'w ' + old.rw.toFixed(3) + ' vs h ' + old.rh.toFixed(3) + ' = ' + (old.rh / old.rw).toFixed(3) + '배');
    ok('[B2b] ⇒ 뿌리는 «테가 얇다» 가 아니라 «테가 축마다 다르다» — 현행 아트는 등방이다(671 수리 후)',
      Math.max(art.dia.rw, art.dia.rh) / Math.min(art.dia.rw, art.dia.rh) <= 1.03,
      'w ' + art.dia.rw.toFixed(3) + ' · h ' + art.dia.rh.toFixed(3));
    ok('[B3] 코인은 두 축이 같다 (등방 — 그래서 상자 하나로 ref 에 붙는다)',
      Math.max(art.gold.rw, art.gold.rh) / Math.min(art.gold.rw, art.gold.rh) <= 1.05,
      'w ' + art.gold.rw.toFixed(3) + ' · h ' + art.gold.rh.toFixed(3));

    /* ── [C] 레퍼런스 — 목표 비율 ── */
    console.log('\n[C] 레퍼런스 실측 — 목표 «색÷실루엣»');
    const ref = await page.evaluate(async ({ src, WIN, MASKS, SCAN_SRC }) => {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const scan = eval('(' + SCAN_SRC + ')');
      const out = {};
      for (const k of ['gold', 'dia']) {
        const w = WIN[k];
        const d = g.getImageData(w.x, w.y, w.w, w.h).data;
        out[k] = scan(d, null, w.w, w.h, eval('(' + MASKS[k] + ')'));
      }
      return out;
    }, { src: REF_IMG, WIN, MASKS, SCAN_SRC });
    for (const k of ['gold', 'dia']) {
      const r = ref[k];
      console.log('  · ref ' + k + ' 실루엣 ' + r.sil.w + '×' + r.sil.h + ' · 색 잉크 ' + r.col.w + '×' + r.col.h
        + '  ⇒ 색÷실루엣 w ' + (r.col.w / r.sil.w).toFixed(3) + ' · h ' + (r.col.h / r.sil.h).toFixed(3));
    }
    const refRw = ref.dia.col.w / ref.dia.sil.w, refRh = ref.dia.col.h / ref.dia.sil.h;
    ok('[C1] ref 젬은 두 축이 같다 — 우리 젬만 비대칭이다',
      Math.max(refRw, refRh) / Math.min(refRw, refRh) <= 1.05,
      'w ' + refRw.toFixed(3) + ' · h ' + refRh.toFixed(3));
    ok('[C2] ⇒ 처방의 과녁: 젬 아트의 «색÷실루엣» 을 두 축 모두 ref 값(≈' + refRw.toFixed(3) + ')으로',
      true, '현행 w ' + art.dia.rw.toFixed(3) + ' → ' + refRw.toFixed(3)
        + ' · h ' + art.dia.rh.toFixed(3) + ' → ' + refRh.toFixed(3));

    ok('[D] 콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 120) : ''));
  } catch (e) {
    fail++; console.log('  FAIL 실행 — ' + e.message);
  } finally {
    await browser.close();
  }
  console.log('\nPROBE671 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
