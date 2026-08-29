/* 작업 360 보정 계산기 — 좌측 사이드 6행 아이콘 «잉크» 를 공통 규격으로 역산한다.
 *
 *   node tools/cal360.js [목표폭] [목표높이]      (기본 108 × 97)
 *
 * 왜 계산이 아니라 «재고 고친다» 인가:
 *   잉크 = 글리프 잉크 × font-size 에 **외곽선(drop-shadow 4겹 체이닝)** 이 더해지는데, 그 외곽선은
 *   `--o = --ih × .028` 이라 font-size 에 비례하지 **않는다**. 닫힌 식을 세우면 상수를 하나 더 심는
 *   꼴이라(LESSONS 336-②) **실측 → 선형 보정 → 재측정** 을 돌려 수렴시킨다.
 *
 * 측정법은 probe360·verify360 과 같은 **차분법**이고, 판(마젠타)은 `tools/plate360.js` 공용이다
 *   (385 — 그 전에는 이 자만 캔버스 위에서 재서 게이트와 2px 다른 숫자를 돌려줬다).
 *
 * ⚠ **손잡이는 `--sf`(등방) 하나뿐이다 — 356(주인 지시: «아이콘은 원본 비율, 비균등 scaleX 금지»).**
 *   385 실측: 이 자는 356 뒤에도 `--sx` 를 밀고 있었는데 제품(`#sideL .ibtn .si`, index.html 947)이
 *   그 변수를 **더는 안 읽어서** 폭 보정이 통째로 no-op 이었다 — 회차마다 `--sx` 만 1.15 → 1.71 로
 *   부풀고 잉크는 한 픽셀도 안 움직였다. 그런데도 마지막 줄은 그 값을 «옮겨 적을 값» 으로 찍었다.
 *   심으면 죽은 선언이 하나 늘고 `verify360` «--sx 선언 0건» 이 곧바로 빨개진다.
 *   ⇒ **높이를 눈금으로 삼아 `--sf` 만 민다**(probe371 과 같은 규약). 폭은 목표가 아니라 **결과**다
 *      — 등방 손잡이 하나로 두 축을 동시에 붙일 수는 없다(LESSONS 382-⑤).
 *
 * 출력은 그대로 index.html `#sideL` 의 style 에 옮겨 적는 `--sf` 값이다(`--sx` 는 적지 마라).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { plate } = require('./plate360');   /* 385 — 차분법의 공용 판(마젠타). 규약·근거는 그 파일 머리말 */
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
  /* ★ 385(2026-08-29) — **판을 깔고 잰다.** 382 가 `verify360` 에만 넣은 정착 두 줄이 이 자에는
     안 와서, 같은 차분법이 게이트와 다른 숫자를 돌려주고 있었다(게이트 attend 98×100 ↔ 여기
     96×99 · 로드마다 ±1~2px). 판 색 규약과 근거는 `tools/plate360.js` 머리말. */
  await plate(p);

  const rows = await p.evaluate(() => [...document.querySelectorAll('#sideL .ibtn')].map(e => e.dataset.pop));
  const cur = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll('#sideL .ibtn').forEach(e => { o[e.dataset.pop] = {
      sf: parseFloat(e.style.getPropertyValue('--sf')) || 0.96 }; });
    return o;
  });

  console.log(`목표 잉크 = ${TW} × ${TH}\n`);
  for (let it = 1; it <= 4; it++) {
    const ink = await measure(p, rows);
    console.log(`--- ${it}회 측정`);
    let worstH = 0, worstW = 0;
    rows.forEach((k, i) => {
      const m = ink[i]; if (!m) { console.log(`    ${k}: 측정 실패`); return; }
      const dw = (m.w / TW - 1) * 100, dh = (m.h / TH - 1) * 100;
      worstH = Math.max(worstH, Math.abs(dh)); worstW = Math.max(worstW, Math.abs(dw));
      console.log(`    ${k.padEnd(7)} ${String(m.w).padStart(4)}×${String(m.h).padStart(4)}` +
                  `  Δ폭 ${dw.toFixed(1).padStart(6)}%  Δ높이 ${dh.toFixed(1).padStart(6)}%` +
                  `  (--sf ${cur[k].sf.toFixed(4)})`);
    });
    /* 수렴 판정은 **높이**로만 한다 — 등방 손잡이가 미는 축이 그것이다(356).
       폭은 결과라 여기 같이 세면 «영원히 안 붙는» 루프가 된다(385 실측: --sx no-op 시절의 12.04%). */
    console.log(`    ⇒ 최대 오차 높이 ${worstH.toFixed(2)}% (폭은 결과 — 최대 ${worstW.toFixed(2)}%)`);
    if (worstH < 1.0 || it === 4) break;
    /* 선형 보정 — 높이를 fs(=ih×sf)로 민다. 폭은 같은 배율로 따라 움직인다(등방). */
    rows.forEach((k, i) => {
      const m = ink[i]; if (!m) return;
      cur[k].sf *= TH / m.h;
    });
    await p.evaluate(v => {
      document.querySelectorAll('#sideL .ibtn').forEach(e => {
        const c = v[e.dataset.pop]; if (!c) return;
        e.style.setProperty('--sf', c.sf.toFixed(4));
      });
    }, cur);
    await p.waitForTimeout(120);
  }

  console.log('\n=== index.html 에 옮겨 적을 값 (--sx 는 적지 마라 — 356) ===');
  rows.forEach(k => console.log(`    ${k.padEnd(7)} --sf:${cur[k].sf.toFixed(3)}`));
  await b.close();
})().catch(e => { console.error('cal360 즉사:', e); process.exit(2); });
