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
 * ── 642 개정(2026-09-01) — [형제] 절의 축이 바뀌었다 ──────────────────────────
 * 69 `.ml-i` 가 «잉크 52 → 49.33» 으로 빨갰다. `probe642` 로 재현해 보니 **아이콘은 한 픽셀도
 * 안 줄었다** — `.cic` 상자는 두 경우 모두 51.83 이고, 바뀐 것은 **표본이 든 아트**다.
 *   · 게이트가 재는 것은 `.ml-i` **첫 노드** 하나이고, 우편 행의 썸네일은 «가장 값진 보상» 이다
 *     (`mailRowHtml` 의 `rw.sort((a,b) => b.v - a.v)[0]`).
 *   · 498(첫날 100만 수급 곡선)이 `MAILS` 의 다이아 합을 5,000 → 200,000 으로 올리면서
 *     m1 의 으뜸 보상이 **골드 → 다이아**로 뒤집혔다.
 *   · 두 아트의 viewBox 채움비가 다르다: `cur-gold.svg` **1.0000** · `cur-dia.svg` **0.9375**.
 *     같은 상자 51.83 에서 잉크는 각각 **52.00** · **49.33** ⇒ 옛 기준선 52 는 «골드 표본» 값이었다.
 * ⇒ 그래서 이 절은 **움직이지 않는 축**으로 갈아 끼웠다(334 규약 — «현재 값을 그대로 다시 적는»
 *   재기준은 아이콘이 더 줄어도 초록이라 반려다):
 *     [형제-상자] `.cic` 상자 = `--if-ic` × 1.08 — 화면이 주는 값이라 우편 내용과 무관하다.
 *     [형제-법]   잉크 ÷ 상자 = **그 아트의 viewBox 채움비**(SVG 파일에서 직접 잰다).
 *   상자가 줄면 [형제-상자]가, 아트에 여백이 생기면 [형제-법]이 빨개진다. 표본이 골드↔다이아로
 *   뒤집히는 것만으로는 둘 다 안 흔들린다 — §R 이 그 둘을 각각 못박는다.
 * ⚠ 상자는 **그려지는 노드(`img.cic`)의 상자**로 잰다. 70 `.at-if` 는 SVG 를 `<em>`(inset:0 = 128px)
 *   으로 한 겹 감싸고 `.at-if>em>.cic{width:82px}` 로 크기를 따로 준다 — 감싼 `<em>` 을 상자로 잡으면
 *   «잉크 77.33 ÷ 128 = .604» 가 나와 아트 채움비와 안 맞는다(이 칸을 이모지로 오독하게 되는 자리다).
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
   642 개정: 축이 «잉크 px» 에서 «그려지는 상자 + 잉크÷상자 = 아트 채움비» 로 바뀌었다.
   세 칸 다 지금은 SVG 다(125). 상자 기준값은 화면이 주는 값에서 나오므로 우편·가방 «내용» 이
   바뀌어도 안 움직인다 — `how` 에 그 값이 어디서 오는지를 적어 둔다.
   ⚠ 53 은 `--if-ic` 를 안 주고 폴백(`--if-w` × .554)을 쓰고, 70 은 `<em>` 안에서 82px 을 따로 준다. */
const SIB = [
  { id: '53', sel: '.bg53-c', box: 89.43, tol: 1, how: '`--if-w` 148 × .554 폴백 × 1.08' },
  { id: '69', sel: '.ml-i',   box: 51.83, tol: 1, how: '`--if-ic` 48 × 1.08' },
  { id: '70', sel: '.at-if',  box: 82.00, tol: 1, how: '`.at-if>em>.cic{width:82px}` 고정' },
];
/* 잉크는 외곽선 AA 때문에 아트 실루엣보다 한 겹 크게 잡힌다(69 다이아 .9518 vs 아트 .9375 —
   3배 DSF 에서 픽셀 1~2줄). 법의 허용은 그 한 겹만 덮는 ±0.02 로 조인다. */
const ART_TOL = 0.02;

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
      /* 642 — «그려지는» 상자. 70 처럼 SVG 를 `<em>` 으로 감싼 자리는 위 iconBox 가 그 껍데기다. */
      imgBox: img ? { w: +img.getBoundingClientRect().width.toFixed(2),
                      h: +img.getBoundingClientRect().height.toFixed(2) } : null,
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

/* 아트가 viewBox 를 얼마나 채우는가 — SVG 파일을 그대로 그려서 실루엣 bbox 를 잰다.
   경로 문자열을 손으로 읽는 것(위 [art] 절)보다 아트 교체에 강하다: 어떤 아트로 바뀌어도
   «잉크 ÷ 상자 = 그 아트의 채움비» 라는 법 자체는 계속 성립해야 한다. */
const artCache = new Map();
async function artFill(browser, src) {
  const file = path.basename(String(src || ''));
  if (artCache.has(file)) return artCache.get(file);
  const p = path.join(ROOT, 'assets', 'ui', file);
  if (!file || !fs.existsSync(p)) { artCache.set(file, null); return null; }
  const svg = fs.readFileSync(p, 'utf8');
  const ctx = await browser.newContext({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const r = await page.evaluate(async ({ svg, S }) => {
    const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    const im = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode'));
      i.width = S; i.height = S; i.src = url;
    });
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'); g.clearRect(0, 0, S, S); g.drawImage(im, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data;
    let ax = 1e9, ay = 1e9, bx = -1, by = -1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (d[((y * S) + x) * 4 + 3] > 8) { if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; }
    }
    if (bx < 0) return null;
    return { w: (bx - ax + 1) / S, h: (by - ay + 1) / S };
  }, { svg, S: 512 });
  await ctx.close();
  artCache.set(file, r);
  return r;
}

/* opts.css — 화면을 연 뒤 끼워 넣는 스타일(§R 되돌림 시험용)
   opts.mut — 화면을 연 뒤 도는 페이지 안 함수(표본 바꿔치기용) */
async function openAndMeasure(browser, sel, opts) {
  opts = opts || {};
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
  if (opts.css) await page.addStyleTag({ content: opts.css });
  if (opts.mut) await page.evaluate(opts.mut);
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
  /* ⚑ 644(2026-09-01) — 옛 술어는 «viewBox 가 0 0 64 64 이고 젬이 그 안을 .9375 채운다» 였다.
     644 가 재화 아트 15장의 viewBox 를 **각자의 잉크 bbox** 로 잘라 채움비를 1.0000 으로 통일했다
     (같은 프레임에서 다이아 49.33 vs 골드 52.00 = 1.054 가 411·356 의 «≤1.05» 눈금을 넘던 자리).
     ⇒ 이 절이 지키려던 것 — «아트가 안 바뀌었다 · 그래서 --if-ic 역산이 아직 유효하다» — 은 그대로 두고
       기대값만 새 좌표계로 옮긴다. **path 는 한 자도 안 바뀌었으므로 아래 경로 술어가 그것을 못박는다.** */
  /* ⚑ 671(2026-09-01) — 다시 옮긴다. 671 이 «검정 테를 어떻게 두르는가» 를 다시 그렸다:
     옛 규격은 몸통 path 에 stroke 4 를 straddle 로 걸어 실루엣이 2..62(캔버스 `2 2 60 60`)였고,
     그 탓에 색 잉크가 축마다 다르게 깎였다(가로 .848 · 세로 .973 — `probe671` [B]).
     새 규격은 실루엣을 **몸통의 1.0714배 자리에 4폭 라운드 조인**으로 따로 깔아 0..64 를 채운다
     ⇒ 캔버스가 `0 0 64 64` 로 돌아왔고 «viewBox == 잉크 bbox»(644 불변식)는 그대로다.
     ⚠ **몸통 path 는 여전히 한 자도 안 바뀌었다** — 아래 경로 술어가 그것을 못박고,
       그래서 `--if-ic` 역산(이 절이 지키려는 것)도 그대로 유효하다. */
  const vb = /viewBox="0 0 64 64"/.test(svg);
  vb ? ok('viewBox = 잉크 bbox `0 0 64 64` (671 — 실루엣이 캔버스를 정확히 채운다)', '0 0 64 64')
     : bad('viewBox = 잉크 bbox `0 0 64 64` (671)', (/viewBox="([^"]*)"/.exec(svg) || [])[1] || '못 찾음');
  /* 몸통 경로 M20 4h24l16 18-28 38L4 22z → x 4..60 · y 4..60 = 색 잉크 bbox(671 은 이제 이 위에
     테를 «두르지 않고 뒤에 깐다»). 검정 실루엣 경로는 그 1.0714배 + stroke 4 라 0..64 다. */
  const hasOuter = /M20 4h24l16 18-28 38L4 22z/.test(svg) && /stroke-width="4"/.test(svg);
  hasOuter ? ok('몸통 젬 경로·검정 테 4 그대로', '색 잉크 4..60 · 실루엣 0..64 — 671 은 테만 다시 둘렀다(몸통 path Δ0)')
           : bad('몸통 젬 경로·검정 테 4 그대로', '아트가 바뀌었다 — --if-ic 를 다시 역산해야 한다');
  /* 671 — 몸통을 클립해 면 분할선이 테를 밟지 못하게 한 것이 «세로 .973» 을 닫은 한 수다 */
  (/clip-path="url\(#diaBody\)"/.test(svg) ? ok : bad)
    ('면 분할선이 몸통으로 클립된다 (671 — 테 위로 삐져나오면 세로 색 잉크가 다시 부푼다)',
      /clip-path="url\(#diaBody\)"/.test(svg) ? 'clip-path=#diaBody' : '클립이 없다');
  if (vb && hasOuter) {
    /* 캔버스가 실루엣과 정확히 같으므로 채움비는 1.0000 이다(그것이 644 의 불변식이다). */
    near('viewBox 채움비 1.0000 (644 · `verify644` [A] 가 15장 전수로 지킨다)', 64 / 64, 1.0, 0.0001, '');
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
      /* ⚑ 644 — 이 상자는 418 이 «소수 상자 정수화» 로 박아 둔 **명시 override**(`.qs-i>.cic`)이지
         `--if-ic × 1.08` 의 자연값이 아니다(옛 기대 58.64 는 자연값이고, 실제 값 59 가 ±0.6 안에
         우연히 들어와 있었다). 644 로 채움비가 1.0 이 되어 «상자 = 그려지는 잉크» 이므로 그 override 는
         ref 잉크 55 와 **같은 수**가 됐다 — 59 를 그대로 뒀다면 잉크가 59 로 ref 에서 +7% 멀어진다. */
      near('.cic 박스 = 418 정수 override = ref 잉크 55 (644 — 상자 = 잉크)', q.iconBox.w, REF_INK, 0.6, 'px');
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

    /* ── ④ 형제 화면은 «안 움직였는지» (642 개정 — 축은 상자 + 아트 채움비) ── */
    out.push('[형제] .ifr 를 같이 쓰는 화면 — 144 는 22 만 건드린다');
    let mail = null;                                   /* §R 이 다시 쓰는 69 실측 */
    for (const s of SIB) {
      const m = await openAndMeasure(browser, s.sel);
      if (!m || !m.ink) { bad(`${s.id} ${s.sel} 측정`, '요소·잉크 없음'); continue; }
      if (s.id === '69') mail = m;
      /* ⓪ 원인 고정 — 125 가 이 세 칸을 SVG 로 갈아 끼웠다. 이모지로 되돌아가면 여기가 먼저 빨갛다
         (그때는 아트 파일이 없으니 아래 «채움비 법» 도 쓸 수 없다 — 축을 다시 세워야 한다). */
      if (!m.imgBox) {
        bad(`${s.id} ${s.sel} 아이콘은 SVG(<img class="cic">)`,
          `${m.iconTag} ${JSON.stringify(m.iconText)} — 이모지로 되돌아갔다`);
        continue;
      }
      ok(`${s.id} ${s.sel} 아이콘은 SVG`, path.basename(String(m.iconSrc)));
      /* ⓐ 화면이 주는 값 — 우편·가방 «내용» 과 무관하다. 아이콘이 정말 줄면 여기가 빨개진다. */
      near(`${s.id} ${s.sel} 그려지는 상자 불변(${s.how})`, m.imgBox.w, s.box, s.tol, 'px');
      /* ⓑ 법 — 잉크는 상자 × 그 아트의 채움비다. 표본이 다른 아트로 바뀌어도 성립한다. */
      const art = await artFill(browser, m.iconSrc);
      if (!art) { bad(`${s.id} 아트 채움비`, `아트 파일을 못 찾았다 — ${m.iconSrc}`); continue; }
      const f = path.basename(String(m.iconSrc));
      near(`${s.id} ${s.sel} 잉크÷상자 = ${f} 채움비(가로)`,
        +(m.ink.w / m.imgBox.w).toFixed(4), +art.w.toFixed(4), ART_TOL, '');
      near(`${s.id} ${s.sel} 잉크÷상자 = ${f} 채움비(세로)`,
        +(m.ink.h / m.imgBox.h).toFixed(4), +art.h.toFixed(4), ART_TOL, '');
    }

    /* ── §R 되돌림 시험(642) — 새 축이 «무르게 푼 재기준» 이 아님을 못박는다 ──
       R-a 아이콘을 정말 줄이면 빨갛다 · R-b 아트에 여백이 생기면 빨갛다 ·
       R-c 표본이 골드↔다이아로 뒤집히는 것만으로는 안 흔들린다(옛 축이 빨갰던 바로 그 자리). */
    out.push('[§R] 642 되돌림 시험 — 69 `.ml-i`');
    if (!mail || !mail.ink) bad('§R 전제', '69 본 측정이 없다');
    else {
      const s69 = SIB.find(s => s.id === '69');
      /* R-a — `--if-ic` 48 → 44 (아이콘을 실제로 줄인다) */
      const ra = await openAndMeasure(browser, '.ml-i', { css: '.ml-i{--if-ic:44px !important}' });
      if (!ra || !ra.ink || !ra.imgBox) bad('R-a 측정', '잉크·상자 없음');
      else {
        (Math.abs(ra.imgBox.w - s69.box) > s69.tol ? ok : bad)
          ('R-a --if-ic 44 면 [상자] 항이 빨갛다', `상자 ${ra.imgBox.w}px (기준 ${s69.box}±${s69.tol})`);
        /* 같은 사본에서 «법» 은 여전히 초록이다 — 그래서 축이 둘이어야 한다는 근거 */
        const art = await artFill(browser, ra.iconSrc);
        (art && Math.abs(ra.ink.w / ra.imgBox.w - art.w) <= ART_TOL ? ok : bad)
          ('R-a 그때도 [법] 은 초록(= 축 하나로는 못 잡는다)',
            `잉크÷상자 ${(ra.ink.w / ra.imgBox.w).toFixed(4)}`);
      }
      /* R-b — 아트에 여백이 생긴 꼴(상자는 그대로, 그려지는 실루엣만 줄어든다) */
      const rb = await openAndMeasure(browser, '.ml-i', { css: '.ml-i .cic{padding:6px}' });
      if (!rb || !rb.ink || !rb.imgBox) bad('R-b 측정', '잉크·상자 없음');
      else {
        const art = await artFill(browser, rb.iconSrc);
        (art && Math.abs(rb.ink.w / rb.imgBox.w - art.w) > ART_TOL ? ok : bad)
          ('R-b 아트 여백 +6px 면 [법] 이 빨갛다',
            `잉크÷상자 ${(rb.ink.w / rb.imgBox.w).toFixed(4)} (아트 ${art ? art.w.toFixed(4) : '—'}±${ART_TOL})`);
      }
      /* R-c — 표본을 골드로 바꿔치기한다(498 이전의 으뜸 보상). 옛 축(잉크 52 고정)은
         다이아 표본에서 빨갰지만, 새 축은 두 아트 어느 쪽에서도 초록이어야 한다. */
      const rc = await openAndMeasure(browser, '.ml-i',
        { mut: () => { const im = document.querySelector('.ml-i img.cic');
                       if (im) im.src = 'assets/ui/cur-gold.svg'; } });
      if (!rc || !rc.ink || !rc.imgBox) bad('R-c 측정', '잉크·상자 없음');
      else {
        const art = await artFill(browser, rc.iconSrc);
        (/cur-gold\.svg$/.test(String(rc.iconSrc)) ? ok : bad)('R-c 표본이 골드로 바뀌었다', String(rc.iconSrc));
        near('R-c 골드 표본에서도 [상자] 불변', rc.imgBox.w, s69.box, s69.tol, 'px');
        (art && Math.abs(rc.ink.w / rc.imgBox.w - art.w) <= ART_TOL ? ok : bad)
          ('R-c 골드 표본에서도 [법] 초록',
            `잉크÷상자 ${(rc.ink.w / rc.imgBox.w).toFixed(4)} (아트 ${art ? art.w.toFixed(4) : '—'})`);
        /* 그리고 그 골드 표본의 잉크가 옛 기준선 52 다 — «표본이 바뀐 것» 의 산술 증거 */
        near('R-c 골드 잉크 = 옛 기준선 52 (표본 이동의 증거)', rc.ink.w, 52, 1, 'px');
      }
    }
  } finally { await browser.close(); }

  console.log(out.join('\n'));
  const tot = pass + fail;
  console.log(`\nVERIFY144 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
