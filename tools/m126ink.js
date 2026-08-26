/* 126 ②-2 — `scaleX` 자리의 **잉크 폭** 실측기 (5회차 신설).
 *
 *   node tools/m126ink.js              # 요약(자연 잉크폭 큰 순)
 *   node tools/m126ink.js --json a.json
 *
 * 왜 필요한가 — §7 의 경고 그대로다. `m126sx.js` 가 재는 `need` 는 «상자를 넘치는가» 이지
 * «측정표에 적힌 잉크 폭과 같은가» 가 아니다. ②-2 가 풀어야 하는 것은 후자다
 * (3회차 비평가 G 의 2순위: 타이틀류가 레퍼런스보다 10~19% «좁다»).
 * 게다가 4회차가 스트로크를 얇게 했으므로 **G 의 −10~19% 는 이미 옛 수치**다 —
 * 잉크 폭에는 외곽선이 포함되기 때문이다. 그래서 다시 잰다.
 *
 * 재는 법 — 격리 렌더가 아니라 **제품 화면에서 차분(差分)으로 잰다.**
 * 이 자리들은 `::after` 흰 덧획(52 `.mn-l`)·`paint-order`·부모 그라디언트가 겹쳐 있어
 * 타이포그래피만 뽑아 다시 그리면 실제와 달라진다(6-10 의 교훈: 층이 둘 이상이면 층째로 봐야 한다).
 *   ① 화면을 그대로 캡처(A)
 *   ② 대상 요소 전부에 `visibility:hidden` (리플로 없음) → 다시 캡처(B)
 *   ③ A−B 가 0 이 아닌 픽셀 = 그 글자가 그린 잉크. 요소별 창 안에서 좌우 끝을 찾는다.
 * 배경이 무엇이든(그라디언트·아트·딤) 차분은 글자만 남기므로 마스크 색을 고를 필요가 없다.
 *
 * 자연 잉크폭 — `transform:scaleX(s)` 는 외곽선까지 통째로 s 배 하고, 줄바꿈·자간은
 * 변환 «전» 에 정해지므로 잉크폭은 s 에 **선형**이다. 따라서
 *     자연 잉크폭 = 잰 잉크폭 / s        ·        맞추려는 sx = 목표 잉크폭 / 자연 잉크폭
 * 로 한 번의 캡처에서 바로 풀린다(sx 를 1 로 바꿔 다시 캡처하면 클리핑·리플로가 끼어든다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const JSON_AT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

const SCREENS = [
  { k: '02-메인', steps: [] },
  { k: '06-영웅', steps: ['.tab[data-t="hero"]'] },
  { k: '23-훈련', steps: ['.tab[data-t="grow"]'] },
  { k: '03-던전', steps: ['.tab[data-t="adv"]'] },
  { k: '14-보물상자', steps: ['.tab[data-t="box"]'] },
  { k: '10-상점', steps: ['.tab[data-t="shop"]'] },
  { k: '22-퀘스트', steps: ['.side .ibtn[data-pop="quest"]'] },
  { k: '52-메뉴', steps: ['#menub'] },
  { k: '19-프로필', steps: ['#profBtn'] },
];

/* 대상 수집 — m126sx.js 와 같은 규칙(계산된 transform 에 scaleX≠1 + 텍스트).
   여기서는 «잉크 창» 도 같이 낸다: 외곽선·덧획이 상자 밖으로 번지므로 사방 여유를 준다. */
const collect = (page) => page.evaluate(() => {
  const out = [];
  const app = document.getElementById('app');
  if (!app) return out;
  const keyOf = (el) => {
    const s = []; let n = el;
    while (n && n.id !== 'app' && n.nodeType === 1) {
      if (n.id) { s.unshift('#' + n.id); break; }
      const c = (typeof n.className === 'string' && n.className.trim()) ? '.' + n.className.trim().split(/\s+/)[0] : '';
      s.unshift(n.tagName.toLowerCase() + c);
      n = n.parentNode;
    }
    return s.join('>');
  };
  const sxOf = (cs) => {
    const m = cs.transform;
    if (!m || m === 'none') return 1;
    const nums = m.match(/matrix\(([^)]+)\)/);
    if (nums) return parseFloat(nums[1].split(',')[0]);
    const m3 = m.match(/matrix3d\(([^)]+)\)/);
    if (m3) return parseFloat(m3[1].split(',')[0]);
    return 1;
  };
  let i = 0;
  app.querySelectorAll('*').forEach((el) => {
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length > 24) return;
    /* 텍스트를 «직접» 가진 칸만 (자식이 다시 텍스트를 그리면 중복) */
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const cs = getComputedStyle(el);
    const sx = sxOf(cs);
    if (Math.abs(sx - 1) < 0.002) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return;
    const fs = parseFloat(cs.fontSize) || 0;
    const pad = Math.max(12, fs * 0.6);          /* 외곽선·덧획 번짐 여유 */
    el.setAttribute('data-m126ink', String(i));
    out.push({
      i, key: keyOf(el), text: txt, sx: +sx.toFixed(4), fs,
      stroke: cs.webkitTextStrokeWidth, ls: cs.letterSpacing,
      win: [
        Math.max(0, Math.floor(r.left - pad)), Math.min(innerWidth, Math.ceil(r.right + pad)),
        Math.max(0, Math.floor(r.top - pad)), Math.min(innerHeight, Math.ceil(r.bottom + pad)),
      ],
      box: +r.width.toFixed(1),
    });
    i++;
  });
  return out;
});

/* PNG 두 장을 캔버스로 디코드해 차분 잉크 bbox 를 낸다(의존성 0 — ink05.js 와 같은 방식). */
/* 세 장을 한 번에 넘기면 evaluate 인자가 너무 커져 그대로 죽는다 — 한 장씩 심어 둔다. */
async function stash(page, slot, b64) {
  await page.evaluate(async ({ slot, b64 }) => {
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = () => rej(new Error('decode ' + slot));
      i.src = 'data:image/png;base64,' + b64;
    });
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    window.__m126 = window.__m126 || {};
    window.__m126[slot] = g.getImageData(0, 0, im.width, im.height).data;
    window.__m126.W = im.width;
  }, { slot, b64 });
}

/* 자리 하나만 정밀 측정 — 창만 잘라 A·N1·N2(전부 «보이는» 상태) · B(그 요소만 숨김) 네 장을 찍는다.
   화면 통째 차분은 그 자리 «주변» 이 움직이면 통째로 오염된다(22 보상 프레임의 122 쥬시 펄스에서
   실제로 그랬다 — 3자리 숫자 잉크가 140px 로 읽혔다). N 을 두 장 두는 이유는 한 장짜리 기준선이
   «그 순간 마침 같은 값» 인 펄스 위상을 못 걸러내기 때문이다. */
async function inkOne(page, it) {
  const clip = { x: it.win[0], y: it.win[2], width: it.win[1] - it.win[0], height: it.win[3] - it.win[2] };
  if (clip.width < 2 || clip.height < 2) return Object.assign({}, it, { ink: null, fill: null, px: 0 });
  const sel = `[data-m126ink="${it.i}"]`;
  const shot = async () => (await page.screenshot({ clip })).toString('base64');
  const a = await shot();
  await page.waitForTimeout(110); const n1 = await shot();
  await page.waitForTimeout(110); const n2 = await shot();
  await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.style.visibility = 'hidden'; }, sel);
  await page.waitForTimeout(110);
  const b = await shot();
  await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.style.visibility = ''; }, sel);
  for (const [k, v] of [['a', a], ['n', n1], ['n2', n2], ['b', b]]) await stash(page, k, v);
  const local = Object.assign({}, it, { win: [0, clip.width, 0, clip.height] });
  const [r] = await inkOf(page, [local]);
  return Object.assign({}, it, r, { win: it.win });
}

async function inkOf(page, items) {
  return page.evaluate(({ items }) => {
    const da = window.__m126.a, db = window.__m126.b, dn = window.__m126.n, dn2 = window.__m126.n2, W = window.__m126.W;
    const TH = 18;   /* 차분 문턱 — JPEG 가 아니라 PNG 라 잡음은 0 이지만 안티에일리어싱 꼬리는 자른다 */
    /* 잡음 기준선 — «아무것도 안 바꾸고» 찍은 두 장(A,N)의 차분이다. 애니메이션을 멈춰도
       캔버스 전투·스프라이트·`#fxl` 연출은 계속 다시 그려지므로, 그 픽셀은 글자를 숨기든 말든
       움직인다. 이걸 빼지 않으면 창을 통째로 «잉크» 로 읽는다(52 메뉴에서 실제로 그랬다:
       fs24 두 글자 라벨의 잉크가 202px = 창 전체로 나왔다). */
    const diff = (p, q, o) => Math.abs(p[o] - q[o]) + Math.abs(p[o + 1] - q[o + 1]) + Math.abs(p[o + 2] - q[o + 2]);
    const noisy = (o) => diff(da, dn, o) >= TH || (dn2 && diff(da, dn2, o) >= TH) || (dn2 && diff(dn, dn2, o) >= TH);
    /* 측정표는 두 규격을 섞어 쓴다 — «잉크(흰 채움)» 과 «잉크 bbox(외곽선 포함)».
       차분은 후자를 준다. 전자는 차분 안에서 «밝은 채움» 만 남겨 따로 낸다
       (52 box52.js 와 같은 마스크: min(rgb) > 150). 둘을 섞으면 외곽선 두께만큼
       통째로 어긋나므로 반드시 규격을 맞춰 비교해야 한다. */
    const FILL = 150;
    return items.map((it) => {
      const [x0, x1, y0, y1] = it.win;
      let lo = 1e9, hi = -1e9, top = 1e9, bot = -1e9, n = 0, noise = 0;
      let wlo = 1e9, whi = -1e9, wtop = 1e9, wbot = -1e9, wn = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * W + x) * 4;
          if (diff(da, db, o) < TH) continue;
          if (noisy(o)) { noise++; continue; }
          n++;
          if (x < lo) lo = x; if (x > hi) hi = x;
          if (y < top) top = y; if (y > bot) bot = y;
          if (Math.min(da[o], da[o + 1], da[o + 2]) > FILL) {
            wn++;
            if (x < wlo) wlo = x; if (x > whi) whi = x;
            if (y < wtop) wtop = y; if (y > wbot) wbot = y;
          }
        }
      }
      if (n < 6) return Object.assign({}, it, { ink: null, inkH: null, fill: null, fillH: null, px: n, noise });
      const w = hi - lo + 1, h = bot - top + 1;
      /* 창을 거의 꽉 채우면 글자가 아니라 배경을 읽은 것이다 — 값을 내지 말고 오염으로 표시한다. */
      const dirty = w >= (x1 - x0) - 6 || h >= (y1 - y0) - 6;
      return Object.assign({}, it, {
        ink: w, inkH: h, px: n, x0: lo, x1: hi, noise, dirty,
        fill: wn < 6 ? null : whi - wlo + 1, fillH: wn < 6 ? null : wbot - wtop + 1, fillPx: wn,
      });
    });
  }, { items });
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const s of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForTimeout(1400);
    for (const sel of s.steps) { await page.click(sel, { timeout: 4000, force: true }).catch(() => {}); await page.waitForTimeout(600); }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    /* 애니메이션이 두 캡처 사이에 움직이면 차분에 배경이 섞인다 — 전부 멈춘다. */
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
    await page.waitForTimeout(400);

    const items = await collect(page);
    if (!items.length) { await ctx.close(); continue; }
    const a = (await page.screenshot()).toString('base64');
    await page.waitForTimeout(120);
    const nz = (await page.screenshot()).toString('base64');   /* 아무것도 안 바꾼 두 번째 장 = 잡음 기준선 */
    await page.evaluate(() => document.querySelectorAll('[data-m126ink]').forEach((e) => { e.style.visibility = 'hidden'; }));
    await page.waitForTimeout(120);
    const b = (await page.screenshot()).toString('base64');
    await page.evaluate(() => document.querySelectorAll('[data-m126ink]').forEach((e) => { e.style.visibility = ''; }));

    await stash(page, 'a', a); await stash(page, 'n', nz); await stash(page, 'n2', nz); await stash(page, 'b', b);
    let measured = await inkOf(page, items);
    /* 오염·잡음이 낀 자리만 «한 자리씩 클립 캡처» 로 다시 잰다 — 느리지만 정확하다. */
    for (let k = 0; k < measured.length; k++) {
      const m = measured[k];
      if (!m.dirty && !(m.noise > 0)) continue;
      measured[k] = await inkOne(page, items[k]);
      measured[k].redone = true;
    }
    measured.forEach((m) => rows.push(Object.assign({ screen: s.k }, m)));
    await ctx.close();
  }
  await browser.close();

  rows.forEach((r) => {
    r.nat = r.ink == null ? null : +(r.ink / r.sx).toFixed(1);
    r.natF = r.fill == null ? null : +(r.fill / r.sx).toFixed(1);
  });
  rows.sort((x, y) => (y.nat || 0) - (x.nat || 0));

  const only = process.argv.find((a) => a.startsWith('--only='));
  const re = only ? new RegExp(only.slice(7)) : null;
  const shown = re ? rows.filter((r) => re.test(r.screen + ' ' + r.key + ' ' + r.text)) : rows;

  console.log(`잉크 폭 실측 ${rows.length}건 (scaleX≠1 자리 · 차분 마스크)` + (re ? ` — 표시 ${shown.length}건` : ''));
  console.log('  ink/inkH = 외곽선 포함 bbox · fill/fillH = 흰 채움만(min(rgb)>150)');
  console.log('  nat = ink/sx · natF = fill/sx (scaleX 1 환산) · 맞출 sx = 목표폭 / (같은 규격의 nat)');
  console.log('');
  console.log('  ' + ['sx', 'ink', 'nat', 'inkH', 'fill', 'natF', 'fillH', 'fs', '자리 «글자»'].join('\t'));
  for (const r of shown) {
    if (r.ink == null) { console.log(`  ${r.sx}\t-\t-\t-\t-\t-\t-\t${r.fs}\t${r.screen} ${r.key} «${r.text}»  [잉크 미검출 ${r.px}px]`); continue; }
    const flag = r.dirty ? '  ⚠오염(창을 꽉 채움 — 값 쓰지 말 것)' : (r.noise > r.px ? `  ⚠잡음 ${r.noise}px` : '');
    console.log(`  ${r.sx}\t${r.ink}\t${r.nat}\t${r.inkH}\t${r.fill == null ? '-' : r.fill}\t${r.natF == null ? '-' : r.natF}\t${r.fillH == null ? '-' : r.fillH}\t${r.fs}\t${r.screen} ${r.key} «${r.text}»${flag}`);
  }
  if (JSON_AT) { fs.writeFileSync(JSON_AT, JSON.stringify(rows, null, 1)); console.log('\nsaved ' + JSON_AT); }
})();
