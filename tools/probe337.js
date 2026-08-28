/* 작업 337 — 41 팝업 내장 재화 바(.pcb)의 재화 아이콘 «잉크» 를 레퍼런스와 같은 자로 잰다.
 *
 *   node tools/probe337.js            ref · cap 양쪽 실측 + 차이표
 *   node tools/probe337.js --json     기계 판독용
 *
 * 왜 필요한가 — 72 의 비평가 6명(13·15·16·17회차)이 «헤더 재화 아이콘 −14~21%» 를 네 번 반복해
 * 지적했는데, `.pcb-p>i` 의 **레이아웃 박스**는 측정표(41 §3) 그대로 57×57 이다. 박스를 재는 자로는
 * 어긋남이 안 보이고, 사람 눈에 보이는 것은 박스가 아니라 **글리프/아트의 색 잉크**다.
 * A3 가 HUD 에서 이미 같은 것을 겪었다(6회차 «보석은 폭만 −12~15%» · 9회차 «코인 금색 원판 −2px»):
 * 원인은 `assets/ui/cur-*.svg` 가 viewBox 안에서 덜 차는 것이고, A3 는 HUD 에서만 보정을 걸었다.
 * 그 보정이 `.pcb` 에는 안 걸려 있다 — 93 이 `.fx-fly`·`.fx-lit` 에서 잡은 것과 **같은 계열**의
 * «보정을 한 자리에서만 걸어 둔» 결손이다. 이 프로브가 그 차이를 숫자로 만든다.
 *
 * 자 — 세 가지를 각각 잰다(전부 원본 1080 절대 px · ref y − 84 = 프레임 y):
 *   ① 외곽 실루엣 bbox(검정 아웃라인 포함)  ② 코인 «노란 원판»  ③ 젬 «시안 몸통»
 * ②③ 은 색 마스크다 — 41 측정표 §3 의 색 표본을 그대로 쓴다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const REF_IMG = path.resolve(__dirname, '../docs/ref/03-던전-팝업.jpg');
const IDX = path.resolve(__dirname, '../index.html');

/* 창(ref 절대좌표). 아이콘만 들어가고 알약 숫자는 안 들어가게 넉넉히 자른다. */
const WIN = {
  gold: { x: 488, y: 99, w: 82, h: 82 },     /* ref 아이콘 500~556 / 111~167 */
  dia:  { x: 789, y: 99, w: 82, h: 82 },     /* ref 아이콘 801~856 / 111~167 */
};
const REF_Y_OFF = 84;                        /* ref y − 84 = 프레임 y (ROUTINE [2]) */

/* 색 마스크 — 41 §3 «주요 색» 표본 기준 */
const MASKS = {
  gold: `(r,g,b) => r > 150 && g > 110 && b < 130 && r - b > 60`,          /* 링 255,238,34 · 면 197~227,124~151,0~16 */
  dia:  `(r,g,b) => b > 130 && b - r > 40 && g > 90`,                      /* 시안 0,172,238 · 밝은 면 98,250,255 */
};

/* 캔버스에 그려 놓은 이미지에서 bbox 를 뽑는 브라우저측 함수 본문 */
const SCAN = `(data, W, H, kind) => {
  const isBg = (r,g,b) => {
    /* 배경 = 바 본체(#42362A 66,54,42 / #3A2E22 58,46,34) 또는 알약(#231A13 35,26,19 / #1D160E 29,22,14) */
    const near = (a,b2,c,t) => Math.abs(r-a) <= t && Math.abs(g-b2) <= t && Math.abs(b-c) <= t;
    return near(66,54,42,14) || near(58,46,34,14) || near(35,26,19,14) || near(29,22,14,14);
  };
  const put = (o) => ({ x: o.lo, y: o.top, w: o.hi - o.lo + 1, h: o.bot - o.top + 1,
                        cx: +((o.lo + o.hi) / 2).toFixed(1), cy: +((o.top + o.bot) / 2).toFixed(1), px: o.n });
  const acc = () => ({ lo: 1e9, hi: -1e9, top: 1e9, bot: -1e9, n: 0 });
  const add = (o, x, y) => { o.n++; if (x < o.lo) o.lo = x; if (x > o.hi) o.hi = x; if (y < o.top) o.top = y; if (y > o.bot) o.bot = y; };
  const sil = acc(), col = acc();
  const mask = kind;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = data[o], g = data[o+1], b = data[o+2];
    if (!isBg(r,g,b)) add(sil, x, y);
    if (mask(r,g,b)) add(col, x, y);
  }
  return { sil: sil.n > 20 ? put(sil) : null, col: col.n > 20 ? put(col) : null };
}`;

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + IDX);
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1700);                       /* 60 쥬시 pop-in 이 끝나야 기하가 확정된다 */
  await p.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await p.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
  await p.waitForTimeout(250);

  /* ── ref: JPEG 를 캔버스에 올려 같은 창을 스캔 ── */
  const ref = await p.evaluate(async ({ src, WIN, MASKS, SCAN }) => {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    c.getContext('2d').drawImage(im, 0, 0);
    const g = c.getContext('2d');
    const scan = eval('(' + SCAN + ')');
    const out = { imgW: im.width, imgH: im.height };
    for (const k of ['gold', 'dia']) {
      const w = WIN[k];
      const d = g.getImageData(w.x, w.y, w.w, w.h).data;
      const r = scan(d, w.w, w.h, eval('(' + MASKS[k] + ')'));
      const off = (o) => o && { x: o.x + w.x, y: o.y + w.y, w: o.w, h: o.h, cx: +(o.cx + w.x).toFixed(1), cy: +(o.cy + w.y).toFixed(1), px: o.px };
      out[k] = { sil: off(r.sil), col: off(r.col) };
    }
    return out;
  }, { src: 'file://' + REF_IMG, WIN, MASKS, SCAN });

  /* ── cap: 실제 화면을 같은 창(프레임 좌표 = ref y − 84)으로 캡처해 스캔 ── */
  const cap = {};
  for (const k of ['gold', 'dia']) {
    const w = WIN[k];
    const sel = k === 'gold' ? '#dunw .pcb-g>i' : '#dunw .pcb-d>i';
    const clip = { x: w.x, y: w.y - REF_Y_OFF, width: w.w, height: w.h };
    const b64 = (await p.screenshot({ clip })).toString('base64');
    /* 실루엣은 «아이콘을 껐다 켠 차분» 으로 잰다 — cap 의 바·알약 배경은 그라데이션이라
       ref 처럼 «배경색 목록» 으로는 못 가른다(작업 141 ink 프로브와 같은 처방). */
    await p.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
    await p.waitForTimeout(120);
    const b64off = (await p.screenshot({ clip })).toString('base64');
    await p.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
    const r = await p.evaluate(async ({ b64, b64off, MASK, SCAN }) => {
      const load = async (s) => { const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + s; });
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        c.getContext('2d').drawImage(im, 0, 0);
        return { d: c.getContext('2d').getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height }; };
      const A = await load(b64), B = await load(b64off);
      const mask = eval('(' + MASK + ')');
      const acc = () => ({ lo: 1e9, hi: -1e9, top: 1e9, bot: -1e9, n: 0 });
      const add = (o, x, y) => { o.n++; if (x < o.lo) o.lo = x; if (x > o.hi) o.hi = x; if (y < o.top) o.top = y; if (y > o.bot) o.bot = y; };
      const put = (o) => ({ x: o.lo, y: o.top, w: o.hi - o.lo + 1, h: o.bot - o.top + 1, cx: +((o.lo + o.hi) / 2).toFixed(1), cy: +((o.top + o.bot) / 2).toFixed(1), px: o.n });
      const sil = acc(), col = acc();
      for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
        const o = (y * A.W + x) * 4;
        const df = Math.abs(A.d[o] - B.d[o]) + Math.abs(A.d[o+1] - B.d[o+1]) + Math.abs(A.d[o+2] - B.d[o+2]);
        if (df >= 18) add(sil, x, y);
        /* 색 마스크는 «아이콘이 그린 화소» 안에서만 본다 — 배경의 비슷한 색을 안 줍는다 */
        if (df >= 18 && mask(A.d[o], A.d[o+1], A.d[o+2])) add(col, x, y);
      }
      return { sil: sil.n > 20 ? put(sil) : null, col: col.n > 20 ? put(col) : null };
    }, { b64, b64off, MASK: MASKS[k], SCAN });
    /* clip.y = w.y − 84 이므로 스캔 y 에 w.y 를 더하면 이미 **ref 좌표계**다(84 를 또 더하면 안 된다) */
    const off = (o) => o && { x: o.x + w.x, y: o.y + w.y, w: o.w, h: o.h, cx: +(o.cx + w.x).toFixed(1), cy: +(o.cy + w.y).toFixed(1), px: o.px };
    cap[k] = { sil: off(r.sil), col: off(r.col) };     /* y 는 ref 좌표계로 환산해 나란히 놓는다 */
  }

  /* ── 레이아웃 박스도 같이 (박스는 맞는데 잉크가 어긋난다는 것을 한 표에서 보이려고) ── */
  const box = await p.evaluate(() => {
    const o = {};
    for (const [k, sel] of [['gold', '#dunw .pcb-g>i'], ['dia', '#dunw .pcb-d>i']]) {
      const e = document.querySelector(sel); if (!e) continue;
      const r = e.getBoundingClientRect(), im = e.querySelector('img'), ir = im && im.getBoundingClientRect();
      o[k] = { i: [+r.x.toFixed(1), +(r.y + 84).toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)],
               img: ir ? [+ir.x.toFixed(1), +(ir.y + 84).toFixed(1), +ir.width.toFixed(1), +ir.height.toFixed(1)] : null };
    }
    return o;
  });
  await b.close();

  if (process.argv.includes('--json')) { console.log(JSON.stringify({ ref, cap, box }, null, 1)); return; }

  const pct = (c, r) => (r ? ((c - r) / r * 100).toFixed(1).padStart(6) + '%' : '   —  ');
  const row = (nm, c, r) => {
    if (!c || !r) { console.log(nm.padEnd(22), '측정 실패'); return; }
    console.log(nm.padEnd(22),
      `ref ${String(r.w).padStart(3)}x${String(r.h).padStart(3)} @(${r.cx},${r.cy})`,
      ` cap ${String(c.w).padStart(3)}x${String(c.h).padStart(3)} @(${c.cx},${c.cy})`,
      ` Δw ${String(c.w - r.w).padStart(4)} (${pct(c.w, r.w)})  Δh ${String(c.h - r.h).padStart(4)} (${pct(c.h, r.h)})`,
      ` Δcx ${(c.cx - r.cx).toFixed(1).padStart(5)} Δcy ${(c.cy - r.cy).toFixed(1).padStart(5)}`);
  };
  console.log('# 337 — .pcb 재화 아이콘 잉크 (ref 절대좌표 · cap 은 프레임 y + 84 로 환산)');
  console.log('레이아웃 박스:', JSON.stringify(box));
  row('코인 실루엣', cap.gold.sil, ref.gold.sil);
  row('코인 노란 원판', cap.gold.col, ref.gold.col);
  row('젬 실루엣', cap.dia.sil, ref.dia.sil);
  row('젬 시안 몸통', cap.dia.col, ref.dia.col);
})();
