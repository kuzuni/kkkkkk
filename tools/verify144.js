#!/usr/bin/env node
/* 작업 144 게이트 — «22 보상 프레임 보석 아이콘 잉크 = ref 55×55».
 *
 *   node tools/verify144.js        → VERIFY144 n/n PASS
 *
 * 지시서 [3]-(가) 작업이라 비평가는 없다. 대신 이 게이트가 **원인·처방·회귀** 셋을 다 묶는다:
 *   ① 원인 고정 — 이 칸의 아이콘은 «이모지» 가 아니라 125 의 `<img class="cic">` SVG 다.
 *     등재(PROGRESS 144)의 «126 서체 교체가 이모지 폴백을 줄였다» 가설은 여기서 반증된다.
 *     누가 이 자리를 다시 이모지로 되돌리면 이 항목이 먼저 깨진다.
 *   ② 아트 여백 고정 — `cur-dia.svg` 의 젬은 viewBox 64 중 60(=.9375)만 차지한다.
 *     이 비율이 곧 `--if-ic` 역산의 분모라, 아트가 바뀌면 여기서 잡혀야 한다.
 *   ③ 처방 — 렌더된 잉크가 ref 55×55 의 ±2% 안, 중심은 프레임 중심과 ±1px.
 *   ④ 회귀 — 141 의 수량 배지(`--ifq-k` .317)와 형제 다섯 화면 아이콘이 **안 움직였는지**.
 *     `--if-ic` 는 화면별 입력이라 22 만 움직여야 한다.
 *
 * 잉크는 차분으로 잰다(아이콘 노드만 껐다 켠 두 장). 이유는 tools/probe144.js 머리말 참고.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';
const DSF = 3;

const SAVE = {
  totalKills: 1000, best: 12, summons: 500, upgrades: 3000,
  gold: 5e7, dia: 12000,
  quest: {
    summon: { s: 3, base: 500 - 6 }, upg: { s: 4, base: 3000 - 70 },
    kill: { s: 3, base: 1000 - 50 }, stage: { s: 2, base: 0 }, coll: { s: 1, base: 0 }
  }
};

/* 측정표 `docs/measure/22-퀘스트팝업.md` §7 «아트 필요» 표 — 재측정 금지 값이다 */
const REF_INK = 55;

/* 형제 화면 기준선 — 144 수정 «전» 에 probe144.js 로 뜬 값(이 작업이 건드리면 안 되는 것들).
   05·12 는 이모지라 서체·폴백에 따라 흔들릴 수 있어 ±3px, SVG 세 칸은 ±1px 로 조인다. */
const SIB = [
  { id: '53', sel: '.bg53-c', w: 83.33, h: 83.67, tol: 1 },
  { id: '69', sel: '.ml-i',   w: 52.00, h: 52.00, tol: 1 },
  { id: '70', sel: '.at-if',  w: 77.33, h: 77.33, tol: 1 },
];

const OPEN = {
  '.qs-i':    () => document.querySelector('.side .ibtn[data-pop="quest"]').click(),
  '.bg53-c':  () => { openBag(); },
  '.ml-i':    () => { document.querySelector('#menub').click();
                      document.querySelector('#mnw [data-mn="mail"]').click(); },
  '.at-if':   () => document.querySelector('.side .ibtn[data-pop="attend"]').click(),
};

const out = [];
let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; out.push('  ✓ ' + n + (m ? ' — ' + m : '')); };
const bad = (n, m) => { fail++; out.push('  ✗ ' + n + (m ? ' — ' + m : '')); };
const near = (n, got, want, tol, unit) =>
  (Math.abs(got - want) <= tol ? ok : bad)(n, `${got}${unit || ''} (기대 ${want}±${tol})`);

async function measure(page, sel) {
  const dom = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const ic = el.querySelector('.ifi, .cic, em, i:not(.ifq), b:not(.ifq)');
    const img = ic && (ic.tagName === 'IMG' ? ic : ic.querySelector('img'));
    const ir = ic && ic.getBoundingClientRect();
    const q = el.querySelector('.ifq');
    return {
      frame: { x: r.x, y: r.y, w: r.width, h: r.height },
      ifIc: cs.getPropertyValue('--if-ic').trim(), fontSize: parseFloat(cs.fontSize),
      iconTag: ic ? ic.tagName : null, iconCls: ic ? String(ic.className || '') : null,
      iconSrc: img ? img.getAttribute('src') : null,
      iconText: ic ? (ic.textContent || '').trim() : null,
      iconBox: ir ? { w: +ir.width.toFixed(2), h: +ir.height.toFixed(2) } : null,
      qFs: q ? +parseFloat(getComputedStyle(q).fontSize).toFixed(2) : null,
    };
  }, sel);
  if (!dom) return null;
  const clip = { x: dom.frame.x, y: dom.frame.y, width: dom.frame.w, height: dom.frame.h };
  const shot = async () => (await page.screenshot({ clip })).toString('base64');
  const A = await shot();
  await page.evaluate((s) => {
    const ic = document.querySelector(s).querySelector('.ifi, .cic, em, i:not(.ifq), b:not(.ifq)');
    if (ic) ic.style.visibility = 'hidden';
  }, sel);
  await page.waitForTimeout(140);
  const B = await shot();
  await page.evaluate((s) => {
    const ic = document.querySelector(s).querySelector('.ifi, .cic, em, i:not(.ifq), b:not(.ifq)');
    if (ic) ic.style.visibility = '';
  }, sel);
  const ink = await page.evaluate(async ({ a, b, dsf }) => {
    const load = async (x) => {
      const im = await new Promise((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode'));
        i.src = 'data:image/png;base64,' + x;
      });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height };
    };
    const A = await load(a), B = await load(b);
    let ax = 1e9, ay = 1e9, bx = -1, by = -1, n = 0;
    for (let yy = 0; yy < A.H; yy++) for (let xx = 0; xx < A.W; xx++) {
      const i = ((yy * A.W) + xx) * 4;
      const df = Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]),
                          Math.abs(A.d[i + 2] - B.d[i + 2]));
      if (df > 16) { n++; if (xx < ax) ax = xx; if (xx > bx) bx = xx; if (yy < ay) ay = yy; if (yy > by) by = yy; }
    }
    if (!n) return null;
    return { w: +((bx - ax + 1) / dsf).toFixed(2), h: +((by - ay + 1) / dsf).toFixed(2),
             cx: +(((ax + bx + 1) / 2 / dsf)).toFixed(2), cy: +(((ay + by + 1) / 2 / dsf)).toFixed(2) };
  }, { a: A, b: B, dsf: DSF });
  return { ...dom, ink };
}

async function openAndMeasure(browser, sel) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
  });
  await page.evaluate(OPEN[sel]);
  /* 60 쥬시 스태거·오버슛이 끝나야 한다 — 고정 400ms 는 짧다(136 교훈) */
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }));
  await page.waitForTimeout(120);
  const m = await measure(page, sel);
  await ctx.close();
  return m;
}

(async () => {
  /* ── ② 아트 여백은 파일에서 바로 잰다(브라우저 없이) ── */
  out.push('[art] cur-dia.svg — 젬이 viewBox 를 얼마나 채우는가');
  const svg = fs.readFileSync(path.join(ROOT, 'assets', 'ui', 'cur-dia.svg'), 'utf8');
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  vb ? ok('viewBox 64×64', vb[1] + '×' + vb[2]) : bad('viewBox 64×64', '못 찾음');
  /* 바깥 젬 경로 M20 4h24l16 18-28 38L4 22z → x 4..60 · y 4..60, stroke-width 4 라 ±2 */
  const hasOuter = /M20 4h24l16 18-28 38L4 22z/.test(svg) && /stroke-width="4"/.test(svg);
  hasOuter ? ok('바깥 젬 경로·외곽선 4 그대로', '실루엣 2..62 = 60/64 = .9375')
           : bad('바깥 젬 경로·외곽선 4 그대로', '아트가 바뀌었다 — --if-ic 를 다시 역산해야 한다');
  if (vb && hasOuter) {
    const fillRatio = 60 / +vb[1];
    near('viewBox 채움비 .9375', +fillRatio.toFixed(4), 0.9375, 0.0001, '');
  }

  const browser = await launch(chromium);
  try {
    /* ── ①③④ 22 본체 ── */
    const q = await openAndMeasure(browser, '.qs-i');
    out.push('[22] .qs-i — 보상 보석 아이콘');
    if (!q) { bad('.qs-i 존재', '요소를 못 찾았다'); }
    else {
      ok('.qs-i 존재', `프레임 ${q.frame.w}×${q.frame.h}`);
      /* ① 원인 고정 — 이모지가 아니라 125 의 SVG 다 */
      (q.iconTag === 'IMG' && /\bcic\b/.test(q.iconCls) ? ok : bad)
        ('아이콘은 `<img class="cic">` (이모지 아님)', `${q.iconTag}.${q.iconCls}`);
      (q.iconSrc === 'assets/ui/cur-dia.svg' ? ok : bad)
        ('src = assets/ui/cur-dia.svg', String(q.iconSrc));
      (!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(q.iconText || '') ? ok : bad)
        ('아이콘 자리에 이모지 문자 0건', JSON.stringify(q.iconText));
      /* ③ 처방 */
      (q.ifIc === '54.3px' ? ok : bad)('--if-ic = 54.3px', q.ifIc);
      near('.cic 박스 = --if-ic × 1.08', q.iconBox.w, 58.64, 0.6, 'px');
      if (q.ink) {
        near('잉크 폭 = ref 55', q.ink.w, REF_INK, REF_INK * 0.02, 'px');
        near('잉크 높이 = ref 55', q.ink.h, REF_INK, REF_INK * 0.02, 'px');
        near('잉크 중심 x = 프레임 중심', q.ink.cx, q.frame.w / 2, 1, 'px');
        near('잉크 중심 y = 프레임 중심', q.ink.cy, q.frame.h / 2, 1, 'px');
        /* 두 축이 «같이» 맞는가 — 이모지 시절엔 못 하던 것(이 작업의 요점) */
        near('종횡비 1.00 (정사각)', +(q.ink.w / q.ink.h).toFixed(3), 1, 0.03, '');
      } else bad('잉크 측정', '차분이 비었다');
      /* ④ 141 회귀 — 배지는 프레임 폭 기준이라 --if-ic 에 안 딸려가야 한다 */
      near('141 수량 배지 font-size (106 × .317)', q.qFs, 33.6, 0.6, 'px');
    }

    /* ── ④ 형제 화면은 «안 움직였는지» ── */
    out.push('[형제] .ifr 를 같이 쓰는 화면 — 144 는 22 만 건드린다');
    for (const s of SIB) {
      const m = await openAndMeasure(browser, s.sel);
      if (!m || !m.ink) { bad(`${s.id} ${s.sel} 측정`, '요소·잉크 없음'); continue; }
      near(`${s.id} ${s.sel} 잉크 폭 불변`, m.ink.w, s.w, s.tol, 'px');
      near(`${s.id} ${s.sel} 잉크 높이 불변`, m.ink.h, s.h, s.tol, 'px');
    }
  } finally { await browser.close(); }

  console.log(out.join('\n'));
  const tot = pass + fail;
  console.log(`\nVERIFY144 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
