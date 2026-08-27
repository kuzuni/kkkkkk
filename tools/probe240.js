/* 작업 240 실측 — 19 프로필 탭 라벨 「칭호」의 «속공간(카운터)» 과 잉크 bbox 를
 * 스트로크 폭·font-size 를 쓸어가며 같이 잰다.
 *
 *   node tools/probe240.js
 *
 * 왜 «같이» 재야 하는가: 240 의 처방 후보 ⓐ(스트로크를 내린다)·ⓑ(font-size 를 올린다)는
 * 둘 다 **잉크 폭·높이를 같이 움직인다.** 측정표 19 §4 의 ref 는
 *   활성 「칭호」 ink x 263..317 (**54px**) · y 941..973 (**33px**) · 검정 외곽선 **~3px**(바깥)
 * 이라 카운터만 보고 값을 고르면 19(①~④ 8점 통과 화면)의 기하를 깬다.
 *
 * 카운터 면적은 `tools/m126counter.js` 와 **같은 방식**으로 잰다(격리 렌더 + 갇힌 섬 최대 면적).
 * 제품 요소를 그대로 찍으면 이웃 글자·오버레이 때문에 판정이 뒤집힌다 — 그 이유는 저 파일 서두 참고.
 * 잉크 bbox 만은 반대로 **제품 요소 그대로**(scaleX·paint-order 포함) 재야 ref 와 비교가 된다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const SEL = '#pfw .pf-tab.t1>i';

/* 쓸어볼 값 — [font-size, stroke px]. 현행은 38 / 6.08(= --st-body .16 × 38). */
const SWEEP = [];
for (const sw of [0, 3.5, 4, 4.5, 4.75, 5, 5.32, 5.5, 6.08, 7]) SWEEP.push([38, sw]);
for (const fs of [40, 42, 44]) SWEEP.push([fs, +(fs * 0.16).toFixed(2)]);

/* --- 카운터(갇힌 섬 최대 면적) — m126counter.js 와 동일 알고리즘 --- */
const counters = (page, sel, sweep) => page.evaluate(async ({ sel, sweep }) => {
  const src = document.querySelector(sel);
  if (!src) return null;
  const cs = getComputedStyle(src);
  const txt = (src.textContent || '').trim();

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;background:#808080;'
    + 'padding:24px;display:flex;gap:24px';
  document.body.appendChild(host);

  const mk = (fs, sw) => {
    const s = document.createElement('span');
    s.textContent = txt;
    s.style.cssText = 'background:#808080;color:#fff;white-space:nowrap;'
      + 'font-family:' + cs.fontFamily + ';font-size:' + fs + 'px;font-weight:' + cs.fontWeight + ';'
      + 'letter-spacing:' + cs.letterSpacing + ';'
      + '-webkit-text-stroke:' + sw + 'px #000;paint-order:' + (cs.paintOrder || 'normal') + ';';
    host.appendChild(s);
    return s;
  };
  const els = sweep.map(([fs, sw]) => mk(fs, sw));
  await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const top1 = async (el) => {
    const r = el.getBoundingClientRect(), S = 6;
    const W = Math.ceil(r.width * S), H = Math.ceil(r.height * S);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">'
      + '<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"'
      + ' style="transform:scale(' + S + ');transform-origin:0 0">'
      + new XMLSerializer().serializeToString(el) + '</div></foreignObject></svg>';
    const img = new Image();
    await new Promise((ok, ng) => {
      img.onload = ok; img.onerror = ng;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#808080'; cx.fillRect(0, 0, W, H); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let k = 0, q = 0; k < d.length; k += 4, q++)
      if (Math.abs(d[k] - 128) < 26 && Math.abs(d[k + 1] - 128) < 26 && Math.abs(d[k + 2] - 128) < 26) gray[q] = 1;
    const seen = new Uint8Array(W * H), st = [];
    const push = q => { if (gray[q] && !seen[q]) { seen[q] = 1; st.push(q); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (st.length) {
      const q = st.pop(), x = q % W, y = (q / W) | 0;
      if (x > 0) push(q - 1); if (x < W - 1) push(q + 1);
      if (y > 0) push(q - W); if (y < H - 1) push(q + W);
    }
    const s2seen = new Uint8Array(W * H); let top = 0;
    for (let q = 0; q < W * H; q++) {
      if (!gray[q] || seen[q] || s2seen[q]) continue;
      let c = 0; const s2 = [q]; s2seen[q] = 1;
      while (s2.length) {
        const z = s2.pop(), x = z % W, y = (z / W) | 0; c++;
        const nb = [x > 0 ? z - 1 : -1, x < W - 1 ? z + 1 : -1, y > 0 ? z - W : -1, y < H - 1 ? z + W : -1];
        for (const t of nb) if (t >= 0 && gray[t] && !seen[t] && !s2seen[t]) { s2seen[t] = 1; s2.push(t); }
      }
      if (c > top) top = c;
    }
    return +(top / (S * S)).toFixed(1);
  };

  const out = [];
  for (let i = 0; i < els.length; i++) out.push(await top1(els[i]));
  host.remove();
  return { txt, fam: cs.fontFamily, areas: out };
}, { sel, sweep });

/* --- 잉크 bbox — 제품 요소를 실제 값으로 바꿔 가며 캔버스 픽셀로 잰다 --- */
const inkbox = (page, sel, sweep) => page.evaluate(async ({ sel, sweep }) => {
  const el = document.querySelector(sel);
  const tab = el.parentElement;
  const out = [];
  for (const [fs, sw] of sweep) {
    tab.style.fontSize = fs + 'px';
    tab.style.webkitTextStroke = sw + 'px #000';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = el.getBoundingClientRect();
    out.push({ fs, sw, w: +r.width.toFixed(2), h: +r.height.toFixed(2), cx: +(r.x + r.width / 2).toFixed(1) });
  }
  tab.style.fontSize = ''; tab.style.webkitTextStroke = '';
  return out;
}, { sel, sweep });

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await page.goto(URL);
  await page.waitForTimeout(800);
  await page.click('#profBtn');
  await page.waitForTimeout(700);

  const c = await counters(page, SEL, SWEEP);
  if (!c) { console.log('자리를 못 찾음: ' + SEL); await browser.close(); process.exit(1); }
  const boxes = await inkbox(page, SEL, SWEEP);

  /* ref 실측(측정표 19 §4): 활성 「칭호」 ink 54×33, 외곽선 바깥 ~3px */
  const REF_W = 54, REF_H = 33;
  await browser.close();

  console.log('\n작업 240 — 「' + c.txt + '」 (' + c.fam + ')');
  console.log('ref(측정표 19 §4): ink ' + REF_W + '×' + REF_H + ' · 검정 외곽선 바깥 ~3px · 카운터 하한 8.0 px²\n');
  console.log('| fs | stroke | 바깥 두께 | 카운터 px² | 라벨 rect w×h | ref 폭 대비 |');
  console.log('|---|---|---|---|---|---|');
  SWEEP.forEach(([fs, sw], i) => {
    const b = boxes[i];
    console.log('| ' + fs + ' | ' + sw + ' | ' + (sw / 2).toFixed(2) + ' | ' + c.areas[i]
      + (c.areas[i] >= 8 ? ' ✔' : ' **✗**')
      + ' | ' + b.w + '×' + b.h + ' | ' + (((b.w - REF_W) / REF_W) * 100).toFixed(1) + '% |');
  });
})();
