/* A4 — 스킬 슬롯 아이콘 «글리프 잉크 bbox» 실측기.
   실행: node tools/inkA4.js            → 전 스킬(SK) 아이콘의 현재 잉크 w×h 를 찍는다
        node tools/inkA4.js --gate      → 게이트 모드(VERIFYA4 형식으로 PASS/FAIL)

   왜 필요한가 — «아트 자리 규칙»: 이모지로 대체한 요소는 **레퍼런스 bbox 를 정확히 차지**해야
   나중에 이미지로 교체만 하면 된다. 레퍼런스 실측(측정표 §3)은 **68 × 85**.
   이모지는 글리프마다 잉크비가 달라서(A2 가 같은 함정을 밟았다) font-size 하나로는 못 맞춘다 —
   여기서 글리프별 실측치를 뽑아 `--si-sx`(가로 정규화 배율)를 역산한다.

   측정 방법: 실제 `.si3` 규격 그대로 오프스크린에 글자를 그리고, 캔버스 알파로 잉크 bbox 를 잡는다.
   (DOM 의 getBoundingClientRect 는 글리프 advance 박스라 «잉크» 가 아니다 — A1 이 밟은 함정) */
const { chromium } = require('playwright');
const path = require('path');
const GATE = process.argv.includes('--gate');
const REF_W = 68, REF_H = 85;   // 측정표 §3 (재측정 금지)

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);

  const rows = await p.evaluate(() => {
    /* `.si3` 의 실효 스타일을 그대로 읽어 캔버스에 재현한다 */
    const probe = document.createElement('span');
    probe.className = 'si3';
    const host = document.createElement('div');
    host.className = 'slot2';
    host.style.position = 'absolute'; host.style.left = '-9999px';
    const well = document.createElement('div'); well.className = 'cdw';
    well.appendChild(probe); host.appendChild(well); document.body.appendChild(host);
    const cs = getComputedStyle(probe);
    const fs = parseFloat(cs.fontSize);
    const fam = cs.fontFamily;
    const tr = cs.transform;                       // scaleX 가 걸려 있으면 여기 잡힌다
    let sx = 1;
    if (tr && tr !== 'none') { const m = tr.match(/matrix\(([^,]+)/); if (m) sx = parseFloat(m[1]); }
    document.body.removeChild(host);

    const S = 300;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    const out = [];
    const ids = Object.keys(SK);
    for (const id of ids) {
      const ch = SK[id].ic;
      g.clearRect(0, 0, S, S);
      g.font = fs + 'px ' + fam;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, S / 2, S / 2);
      const d = g.getImageData(0, 0, S, S).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (d[(y * S + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) { out.push({ id, ch, w: 0, h: 0 }); continue; }
      out.push({ id, ch, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return { fs, sx, fam, out };
  });
  await b.close();

  const { fs, sx, out } = rows;
  console.log('.si3 font-size = ' + fs + 'px · 적용 중인 scaleX = ' + sx.toFixed(3));
  console.log('레퍼런스 목표 잉크 = ' + REF_W + ' × ' + REF_H + ' (측정표 §3)\n');
  console.log('| 스킬 | 글리프 | 잉크 w×h (scaleX 적용) | 목표 대비 w | 목표 대비 h |');
  console.log('|---|---|---|---|---|');
  let bad = 0, tot = 0;
  const ws = [], hs = [];
  for (const r of out) {
    const w = r.w * sx, h = r.h;
    ws.push(w); hs.push(h);
    const dw = (w / REF_W - 1) * 100, dh = (h / REF_H - 1) * 100;
    tot++; if (Math.abs(dw) > 12 || Math.abs(dh) > 12) bad++;
    console.log('| ' + r.id + ' | ' + r.ch + ' | ' + w.toFixed(1) + ' × ' + r.h +
      ' | ' + (dw >= 0 ? '+' : '') + dw.toFixed(1) + '% | ' + (dh >= 0 ? '+' : '') + dh.toFixed(1) + '% |');
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const mw = avg(ws), mh = avg(hs);
  console.log('\n평균 잉크 ' + mw.toFixed(1) + ' × ' + mh.toFixed(1) +
    '  (목표 대비 w ' + ((mw / REF_W - 1) * 100).toFixed(1) + '% · h ' + ((mh / REF_H - 1) * 100).toFixed(1) + '%)');
  console.log('권장 scaleX = ' + (REF_W / (mw / sx)).toFixed(3) + '  · 권장 font-size = ' +
    (fs * REF_H / mh).toFixed(1) + 'px');
  if (GATE) {
    console.log('\nVERIFYA4-INK ' + (tot - bad) + '/' + tot + ' ' + (bad ? 'FAIL' : 'PASS'));
    process.exit(bad ? 1 : 0);
  }
})();
