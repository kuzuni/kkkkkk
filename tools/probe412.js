#!/usr/bin/env node
/* 412 재현 — «던전 입장권 8종이 색으로 갈리는가» 를 **찍힌 픽셀**로 잰다
 *
 *   node tools/probe412.js
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 확인한다.
 * 등재문은 SVG 의 `fill="#..."` 문자열을 손으로 Lab 로 옮겨 «최소 ΔE 12.4» 를 냈다.
 * 이 자는 그 계산을 믿지 않고 **8장을 실제로 그려서 찍힌 픽셀**을 읽는다 —
 * 350·368 의 교훈(«선언이 아니라 찍힌 색을 세라»)이 그대로 적용되는 자리다.
 *
 * 재는 것:
 *   ① 채움(속띠)·테 두 자리의 **찍힌 색** → sRGB → CIE-Lab
 *   ② 28쌍 전부의 ΔE76 · 색상각 차 · L* 차 (최소 쌍과 하위 5쌍)
 *   ③ 문양 실루엣 — path 문자열 중복 건수(색이 죽어도 남는 축)
 *   ④ 문양 **잉크 bbox**(getBBox) — «한 세트로 읽히는가» 의 자
 *   ⑤ 회색조(색을 통째로 죽인 뒤) 최소 ΔE — 색각 이상·저해상도의 최악 경우
 *
 * 수리 전 트리에서 돌리면 ②가 12.4 · ③이 «6장 같은 별» 로 나온다(등재문 가설).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const KEYS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone'];
const SC = 4;                       /* 64 → 256 확대 캡처 */
const P_FILL = [14, 25.5];          /* 속띠 안 · 문양 bbox(x 21.5~42.5) 밖 · 좌측 노치(y 28.5~41.5) 위 */
const P_SHELL = [32, 21];           /* 껍데기 상단 띠 · 속띠(y≥23) 위 · 검은 테(4px) 안쪽 */

/* sRGB → CIE-Lab (D65) */
const finv = (t) => (t > 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92);
function lab(rgb) {
  const r = finv(rgb[0] / 255), g = finv(rgb[1] / 255), b = finv(rgb[2] / 255);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b);
  const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const k = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = k(X), fy = k(Y), fz = k(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const hue = (l) => (Math.atan2(l[2], l[1]) * 180 / Math.PI + 360) % 360;
const chroma = (l) => Math.hypot(l[1], l[2]);
const dh = (a, b) => { let d = Math.abs(hue(a) - hue(b)); return d > 180 ? 360 - d : d; };

(async () => {
  const src = {};
  for (const k of KEYS) src[k] = fs.readFileSync(path.join(ROOT, 'assets/ui/cur-ticket-' + k + '.svg'), 'utf8');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  /* ① 찍힌 픽셀 — 8장을 캔버스에 그려 두 자리를 읽는다 */
  const px = await page.evaluate(async ({ src, SC, P_FILL, P_SHELL, KEYS }) => {
    const out = {};
    for (const k of KEYS) {
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src[k]);
      const img = new Image();
      img.width = 64 * SC; img.height = 64 * SC;
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('load ' + k)); img.src = url; });
      const cv = document.createElement('canvas');
      cv.width = 64 * SC; cv.height = 64 * SC;
      const g = cv.getContext('2d');
      g.drawImage(img, 0, 0, 64 * SC, 64 * SC);
      const at = (p) => [...g.getImageData(Math.round(p[0] * SC), Math.round(p[1] * SC), 1, 1).data].slice(0, 3);
      out[k] = { fill: at(P_FILL), shell: at(P_SHELL) };
    }
    return out;
  }, { src, SC, P_FILL, P_SHELL, KEYS });

  /* ④ 문양 잉크 bbox — 실루엣 path 를 실제 SVG 에 넣고 getBBox */
  const motif = {};
  for (const k of KEYS) {
    const ps = [...src[k].matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
    motif[k] = ps.slice(2);                       /* 0=껍데기 · 1=속띠 · 2~=문양 */
  }
  const box = await page.evaluate((motif) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64'); svg.setAttribute('width', '64'); svg.setAttribute('height', '64');
    document.body.appendChild(svg);
    const out = {};
    for (const k in motif) {
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      for (const d of motif[k]) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d); svg.appendChild(p);
        const b = p.getBBox();
        x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
        x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
        svg.removeChild(p);
      }
      out[k] = { w: +(x2 - x1).toFixed(2), h: +(y2 - y1).toFixed(2),
                 cx: +((x1 + x2) / 2).toFixed(2), cy: +((y1 + y2) / 2).toFixed(2) };
    }
    return out;
  }, motif);

  await browser.close();

  let pass = 0, fail = 0;
  const ok = (b, n, d) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); b ? pass++ : fail++; };
  const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

  blk('① 찍힌 픽셀 — 8장의 속띠·테');
  const L = {};
  for (const k of KEYS) {
    L[k] = { f: lab(px[k].fill), s: lab(px[k].shell) };
    console.log('  ' + k.padEnd(7) + ' 채움 rgb(' + px[k].fill.join(',') + ')'
      + ' L*' + L[k].f[0].toFixed(1).padStart(5) + ' C*' + chroma(L[k].f).toFixed(1).padStart(5) + ' h' + hue(L[k].f).toFixed(0).padStart(4) + '°'
      + '   테 rgb(' + px[k].shell.join(',') + ') L*' + L[k].s[0].toFixed(1).padStart(5));
  }
  ok(KEYS.every((k) => px[k].fill.some((c) => c > 8)), '①-a 8장이 실제로 그려졌다(찍힌 픽셀이 검정 아님)');

  blk('② 쌍별 거리 — 28쌍');
  const rows = [];
  for (let i = 0; i < KEYS.length; i++) for (let j = i + 1; j < KEYS.length; j++) {
    const a = KEYS[i], b = KEYS[j];
    rows.push({ p: a + '↔' + b, e: dE(L[a].f, L[b].f), h: dh(L[a].f, L[b].f), l: Math.abs(L[a].f[0] - L[b].f[0]),
                c: Math.abs(chroma(L[a].f) - chroma(L[b].f)) });
  }
  rows.sort((x, y) => x.e - y.e);
  console.log('  하위 6쌍: ' + rows.slice(0, 6).map((r) => r.p + ' ΔE' + r.e.toFixed(1) + '/Δh' + r.h.toFixed(0) + '°/ΔL' + r.l.toFixed(0)).join('\n             '));
  console.log('  최소 ΔE ' + rows[0].e.toFixed(1) + ' · 중앙값 ' + rows[(rows.length / 2) | 0].e.toFixed(1) + ' · 최대 ' + rows[rows.length - 1].e.toFixed(1));
  ok(rows[0].e >= 35, '②-a 쌍별 최소 ΔE ≥ 35 (등재문 실측 12.4)', rows[0].p + ' ' + rows[0].e.toFixed(1));
  /* 430 이관 — 축이 셋이 됐다(색상 · 명도 · **채도**). 430 팔레트의 무채색 2장(회색·흰색)은
     색상각이 없고 «채도가 0 이라는 것» 자체로 갈린다. */
  const weak = rows.filter((r) => r.h < 30 && r.l < 18 && r.c < 25);
  ok(weak.length === 0, '②-b «색상각 ≥30° 또는 L* 차 ≥18 또는 C* 차 ≥25» 를 못 넘는 쌍 0건',
     weak.length ? weak.map((r) => r.p).join(',') : '0건');
  const Ls = KEYS.map((k) => L[k].f[0]), Cs = KEYS.map((k) => chroma(L[k].f));
  console.log('  L* 밴드 ' + Math.min(...Ls).toFixed(1) + '~' + Math.max(...Ls).toFixed(1)
    + ' · C* 밴드 ' + Math.min(...Cs).toFixed(1) + '~' + Math.max(...Cs).toFixed(1));
  /* ⚠ 412 의 이 자리는 «명도가 한 밴드다(L* 폭 ≤ 4)» 였다 — **430 주인 재재지시로 폐기**됐다.
     그 규칙이 여덟을 L*64 로 묶어 색상환 이웃 넷을 «파랑 계열 넷» 으로 만든 것이 결함의 뿌리였고,
     주인이 «이름대로»(노랑·초록·갈색·회색·빨강·흰색·주황·파랑) 를 세 번째로 지시했다.
     자리는 비우지 않고 **정반대 축**(회색조 사다리)으로 갈아 끼운다 — 상세는 verify430 [B2]. */
  const sorted = [...Ls].sort((a, b) => a - b);
  let gap = 1e9; for (let i = 1; i < sorted.length; i++) gap = Math.min(gap, sorted[i] - sorted[i - 1]);
  ok(gap >= 8, '②-c 회색조 사다리 — L* 최소 인접차 ≥ 8 (412 의 «한 밴드» 규칙은 430 에서 폐기)',
     gap.toFixed(1) + ' · 사다리 ' + sorted.map((x) => x.toFixed(0)).join('/'));

  blk('③ 문양 — 색이 죽어도 남는 축');
  const sig = {}; KEYS.forEach((k) => sig[k] = motif[k].join('|'));
  const dup = [];
  for (let i = 0; i < KEYS.length; i++) for (let j = i + 1; j < KEYS.length; j++)
    if (sig[KEYS[i]] === sig[KEYS[j]]) dup.push(KEYS[i] + '↔' + KEYS[j]);
  ok(dup.length === 0, '③-a 속 문양 path 중복 0건(402 까지는 6장이 같은 별이었다)',
     dup.length ? dup.join(', ') : KEYS.length + '장 → ' + new Set(Object.values(sig)).size + '종');

  blk('④ 문양 잉크 bbox — 한 세트로 읽히는가');
  for (const k of KEYS) console.log('  ' + k.padEnd(7) + ' ' + box[k].w + '×' + box[k].h + ' 중심 (' + box[k].cx + ', ' + box[k].cy + ')');
  const ws = KEYS.map((k) => box[k].w), hs = KEYS.map((k) => box[k].h);
  ok(Math.max(...ws) / Math.min(...ws) <= 1.05 && Math.max(...hs) / Math.min(...hs) <= 1.05,
     '④-a 잉크 덩치 최대÷최소 ≤ 1.05 (411 이 세운 자와 같은 눈금)',
     'w ' + (Math.max(...ws) / Math.min(...ws)).toFixed(3) + ' · h ' + (Math.max(...hs) / Math.min(...hs)).toFixed(3));
  /* 433(2026-08-30): 중심 y 35.5 → **35**(속띠 23..47 의 한가운데). */
  ok(KEYS.every((k) => Math.abs(box[k].cx - 32) <= 1 && Math.abs(box[k].cy - 35) <= 1),
     '④-b 8장의 문양 중심이 같은 자리다 (32, 35) ±1',
     KEYS.map((k) => box[k].cx + ',' + box[k].cy).join(' · '));

  blk('⑤ 회색조 — 색이 먼저 죽는 최악 경우');
  let gmin = 1e9, gp = '';
  for (let i = 0; i < KEYS.length; i++) for (let j = i + 1; j < KEYS.length; j++) {
    const d = Math.abs(L[KEYS[i]].f[0] - L[KEYS[j]].f[0]);
    if (d < gmin) { gmin = d; gp = KEYS[i] + '↔' + KEYS[j]; }
  }
  console.log('  회색조(L* 만) 최소 차 ' + gmin.toFixed(1) + ' (' + gp + ') → 색이 죽으면 **문양이 유일한 축**이다');
  ok(dup.length === 0, '⑤-a 그래서 문양 8종이 서로 다른 것이 색각 이상의 안전망이다', '중복 ' + dup.length + '건');

  console.log('\nPROBE412 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
