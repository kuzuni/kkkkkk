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
async function inkOf(page, aB64, bB64, items) {
  return page.evaluate(async ({ aB64, bB64, items }) => {
    const load = (b64) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im); im.onerror = rej;
      im.src = 'data:image/png;base64,' + b64;
    });
    const [A, B] = await Promise.all([load(aB64), load(bB64)]);
    const cv = (im) => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      return c.getContext('2d').getImageData(0, 0, im.width, im.height).data;
    };
    const da = cv(A), db = cv(B), W = A.width;
    const TH = 18;   /* 차분 문턱 — JPEG 가 아니라 PNG 라 잡음은 0 이지만 안티에일리어싱 꼬리는 자른다 */
    /* 측정표는 두 규격을 섞어 쓴다 — «잉크(흰 채움)» 과 «잉크 bbox(외곽선 포함)».
       차분은 후자를 준다. 전자는 차분 안에서 «밝은 채움» 만 남겨 따로 낸다
       (52 box52.js 와 같은 마스크: min(rgb) > 150). 둘을 섞으면 외곽선 두께만큼
       통째로 어긋나므로 반드시 규격을 맞춰 비교해야 한다. */
    const FILL = 150;
    return items.map((it) => {
      const [x0, x1, y0, y1] = it.win;
      let lo = 1e9, hi = -1e9, top = 1e9, bot = -1e9, n = 0;
      let wlo = 1e9, whi = -1e9, wtop = 1e9, wbot = -1e9, wn = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const o = (y * W + x) * 4;
          const d = Math.abs(da[o] - db[o]) + Math.abs(da[o + 1] - db[o + 1]) + Math.abs(da[o + 2] - db[o + 2]);
          if (d < TH) continue;
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
      if (n < 6) return Object.assign({}, it, { ink: null, inkH: null, fill: null, fillH: null, px: n });
      return Object.assign({}, it, {
        ink: hi - lo + 1, inkH: bot - top + 1, px: n, x0: lo, x1: hi,
        fill: wn < 6 ? null : whi - wlo + 1, fillH: wn < 6 ? null : wbot - wtop + 1, fillPx: wn,
      });
    });
  }, { aB64, bB64, items });
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
    await page.evaluate(() => document.querySelectorAll('[data-m126ink]').forEach((e) => { e.style.visibility = 'hidden'; }));
    await page.waitForTimeout(120);
    const b = (await page.screenshot()).toString('base64');
    await page.evaluate(() => document.querySelectorAll('[data-m126ink]').forEach((e) => { e.style.visibility = ''; }));

    const measured = await inkOf(page, a, b, items);
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
    console.log(`  ${r.sx}\t${r.ink}\t${r.nat}\t${r.inkH}\t${r.fill == null ? '-' : r.fill}\t${r.natF == null ? '-' : r.natF}\t${r.fillH == null ? '-' : r.fillH}\t${r.fs}\t${r.screen} ${r.key} «${r.text}»`);
  }
  if (JSON_AT) { fs.writeFileSync(JSON_AT, JSON.stringify(rows, null, 1)); console.log('\nsaved ' + JSON_AT); }
})();
