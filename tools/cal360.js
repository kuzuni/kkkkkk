/* 작업 360 보정 계산기 — 좌측 사이드 6행 아이콘 «잉크» 를 공통 규격으로 역산한다.
 *
 *   node tools/cal360.js [목표폭] [목표높이]      (기본 108 × 97)
 *
 * 왜 계산이 아니라 «재고 고친다» 인가:
 *   잉크 = 글리프 잉크 × font-size × scaleX 에 **외곽선(drop-shadow 4겹 체이닝)** 이 더해지는데,
 *   그 외곽선은 `--o = --ih × .028` 이라 font-size 에 비례하지 **않고**, transform 뒤에 걸리므로
 *   가로만 scaleX 를 한 번 더 먹는다. 닫힌 식을 세우면 상수를 하나 더 심는 꼴이라(LESSONS 336-②)
 *   **실측 → 선형 보정 → 재측정** 을 3바퀴 돌려 수렴시킨다. 잉크는 fs·sx 에 거의 선형이라 2~3회면 붙는다.
 *
 * 측정법은 probe360 과 같은 **차분법**이다(capA2 3회차 교훈: 임계값 마스크는 드롭섀도를 물어 수 px 틀린다).
 *
 * 출력은 그대로 index.html `#sideL` 의 style 에 옮겨 적는 `--sf`/`--sx` 값이다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const TW = +(process.argv[2] || 108);
const TH = +(process.argv[3] || 97);
const SRC = 'file://' + path.resolve(__dirname, '../index.html');
const CLIP = { x: 0, y: 0, width: 260, height: 1200 };

/* 한 바퀴: 현재 style 로 6행 잉크를 재서 돌려준다 */
async function measure(p, rows) {
  const base = (await p.screenshot({ clip: CLIP })).toString('base64');
  const shots = [];
  for (const k of rows) {
    const st = await p.addStyleTag({ content:
      `#sideL .ibtn[data-pop="${k}"] .si{visibility:hidden!important}` });
    await p.waitForTimeout(70);
    shots.push((await p.screenshot({ clip: CLIP })).toString('base64'));
    await p.evaluate(el => el.remove(), st);
    await p.waitForTimeout(50);
  }
  return p.evaluate(async ({ base, shots, CLIP }) => {
    const load = b64 => new Promise(res => {
      const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + b64; });
    const px = async b64 => {
      const im = await load(b64);
      const c = document.createElement('canvas');
      c.width = CLIP.width; c.height = CLIP.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, CLIP.width, CLIP.height).data;
    };
    const A = await px(base), out = [];
    for (const s of shots) {
      const B = await px(s);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < CLIP.height; y++) for (let x = 0; x < CLIP.width; x++) {
        const i = (y * CLIP.width + x) * 4;
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      out.push(x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return out;
  }, { base, shots, CLIP });
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(SRC);
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: '#fxl{display:none!important}' });
  await p.evaluate(() => {
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.stage = 37; S.best = 37; S.gold = 1234567; S.dia = 8900;
    S.guide.gv = GUIDE_V; S.guide.idx = 6; S.guide.prog = 0; S.totalKills = 500;
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0;
    for (let i = 1; i < 5000; i++) clearInterval(i); });
  await p.addStyleTag({ content:
    '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await p.waitForTimeout(250);

  const rows = await p.evaluate(() => [...document.querySelectorAll('#sideL .ibtn')].map(e => e.dataset.pop));
  const cur = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll('#sideL .ibtn').forEach(e => { o[e.dataset.pop] = {
      sf: parseFloat(e.style.getPropertyValue('--sf')) || 0.96,
      sx: parseFloat(e.style.getPropertyValue('--sx')) || 1.15 }; });
    return o;
  });

  console.log(`목표 잉크 = ${TW} × ${TH}\n`);
  for (let it = 1; it <= 4; it++) {
    const ink = await measure(p, rows);
    console.log(`--- ${it}회 측정`);
    let worst = 0;
    rows.forEach((k, i) => {
      const m = ink[i]; if (!m) { console.log(`    ${k}: 측정 실패`); return; }
      const dw = (m.w / TW - 1) * 100, dh = (m.h / TH - 1) * 100;
      worst = Math.max(worst, Math.abs(dw), Math.abs(dh));
      console.log(`    ${k.padEnd(7)} ${String(m.w).padStart(4)}×${String(m.h).padStart(4)}` +
                  `  Δ폭 ${dw.toFixed(1).padStart(6)}%  Δ높이 ${dh.toFixed(1).padStart(6)}%` +
                  `  (--sf ${cur[k].sf.toFixed(4)} · --sx ${cur[k].sx.toFixed(4)})`);
    });
    console.log(`    ⇒ 최대 오차 ${worst.toFixed(2)}%`);
    if (worst < 1.0 || it === 4) break;
    /* 선형 보정 — 높이는 fs(=ih×sf) 로, 폭은 sx 로 민다. 높이를 고치면 폭도 같이 움직이므로
       폭 보정은 «높이를 고친 뒤의 예상 폭» 기준으로 잡는다(그래서 한 바퀴가 아니라 여러 바퀴다). */
    rows.forEach((k, i) => {
      const m = ink[i]; if (!m) return;
      const kh = TH / m.h;
      cur[k].sf *= kh;
      cur[k].sx *= TW / (m.w * kh);
    });
    await p.evaluate(v => {
      document.querySelectorAll('#sideL .ibtn').forEach(e => {
        const c = v[e.dataset.pop]; if (!c) return;
        e.style.setProperty('--sf', c.sf.toFixed(4));
        e.style.setProperty('--sx', c.sx.toFixed(4));
      });
    }, cur);
    await p.waitForTimeout(120);
  }

  console.log('\n=== index.html 에 옮겨 적을 값 ===');
  rows.forEach(k => console.log(
    `    ${k.padEnd(7)} --sf:${cur[k].sf.toFixed(3)};--sx:${cur[k].sx.toFixed(3)}`));
  await b.close();
})().catch(e => { console.error('cal360 즉사:', e); process.exit(2); });
