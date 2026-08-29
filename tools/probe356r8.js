#!/usr/bin/env node
/* 작업 356 8회차 재현기 — 7회차 비평가 BD 의 «33 재화 정보 보석이 92.00×91.00» 을 재현하고
 * 후보 처방을 대조한다.
 *
 *   node tools/probe356r8.js
 *
 * ⚠ **DSF 1 로만 재면 이 결함은 안 보인다** — 1px 이 반올림에 묻혀 92×92 로 읽힌다.
 *   그래서 deviceScaleFactor 1·2·3 을 다 돌린다(7회차가 놓친 이유가 정확히 이것이다).
 * ⚠ 차분 두 장 사이에 다른 것이 바뀌면 bbox 가 부푼다 — 애니를 끝내고 타이머를 훑어 끈다.
 *   (첫 판에서 `visibility` 토글 + 대기 없음으로 «차분 0» 과 종횡 17.6 이 섞여 나왔다.
 *    `opacity` 토글 + 토글마다 200ms 대기로 바꾸고서야 값이 앉았다.)
 *
 * 실측 결과(7회차 트리): 현행 DSF1 92×92 · **DSF2·3 92×91(종횡 1.011)**
 *                      ⓐ 정수 상자 98 + transform 없음 → DSF1·2·3 전부 **92×92 · 0.00%**
 *                      ⓐ+ top −0.84 → 중심 895.0 (현행 894.5~895.0 과 Δ≤0.5)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const VIS = ([sel, v]) => { for (const el of document.querySelectorAll(sel)) el.style.opacity = v; };
const RECT = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
const DIFF = async ([a, b, tol]) => {
  const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height }; };
  const A = await load(a), B = await load(b);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) { const i = (y * A.W + x) * 4;
    const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
    if (dd > tol) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0 } : null;
};

const A = '.ci-ic>i{transform:none !important}.ci-ic>i>.cic{width:98px !important;height:98px !important}';
const CASES = [
  { lab: '현행(수리 후)', css: '' },
  /* 338 규칙 — 재현기는 «수리 전» 을 직접 만들어 굴린다. 7회차의 규칙을 그대로 도로 심는다:
     소수 상자(1.08em × fs96 = 103.68) + 소수 등방 배율(.93878) + top 1. */
  { lab: '수리 전 (소수 상자 + scale .93878)', css: '.ci-ic>i{top:1px !important;transform:scale(.93878) !important}.ci-ic>i>.cic{width:1.08em !important;height:1.08em !important}' },
  { lab: 'ⓐ box98 · top 1 (그대로)', css: A },
  { lab: 'ⓐ+ top -0.84px', css: A + '.ci-ic>i{top:-0.84px !important}' },
  { lab: 'ⓐ+ top -1.2px', css: A + '.ci-ic>i{top:-1.2px !important}' },
  { lab: 'ⓐ+ top -1.6px', css: A + '.ci-ic>i{top:-1.6px !important}' },
];

(async () => {
  const b = await launch(chromium);
  const calc = await b.newPage(); await calc.setContent('<body></body>');
  for (const dsf of [1, 2, 3]) {
    console.log(`\n══ deviceScaleFactor ${dsf} ══`);
    for (const c of CASES) {
      const p = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: dsf });
      await p.goto(URL); await p.waitForTimeout(1300);
      await p.evaluate(() => { const e = document.querySelector('[data-cur="dia"]'); if (e) e.click(); });
      await p.waitForTimeout(800);
      await p.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} }
        for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
        window.requestAnimationFrame = () => 0; });
      if (c.css) await p.addStyleTag({ content: c.css });
      await p.waitForTimeout(250);
      const sel = '#ciIcon>img.cic';
      const sign = await p.evaluate(() => document.querySelectorAll('#ciIcon>img.cic').length);
      const box = await p.evaluate(RECT, sel);
      const PAD = 60;
      const clip = { x: Math.max(0, Math.floor(box.x - PAD)), y: Math.max(0, Math.floor(box.y - PAD)),
        width: Math.ceil(box.w + PAD * 2), height: Math.ceil(box.h + PAD * 2) };
      await p.waitForTimeout(200);
      const on = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate(VIS, [sel, '0']);
      await p.waitForTimeout(200);
      const off = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate(VIS, [sel, '']);
      await p.waitForTimeout(120);
      const d = await calc.evaluate(DIFF, [on, off, 12]);
      if(!d){console.log(`  ${c.lab} — 차분 0 (서명 ${sign} · 상자 ${JSON.stringify(box)})`); await p.close(); continue;}
      const w = d.w / dsf, h = d.h / dsf;
      const cx = clip.x + (d.x0 + d.w / 2) / dsf, cy = clip.y + (d.y0 + d.h / 2) / dsf;
      console.log(`  ${c.lab.padEnd(28)} 잉크 ${w.toFixed(2)}×${h.toFixed(2)} · 편차 ${(((w / h) - 1) * 100).toFixed(2)}% · 중심 (${cx.toFixed(2)}, ${cy.toFixed(2)})`);
      await p.close();
    }
  }
  await b.close();
})();
