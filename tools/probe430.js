#!/usr/bin/env node
/* 430 재현 — «입장권 8장이 이름대로의 색인가» 를 **찍힌 픽셀**로 잰다
 *
 *   node tools/probe430.js
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 확인한다.
 * 등재문의 가설은 «412 가 갈라 놨다는 8색이 사람 눈에는 여전히 비슷하다» 였고,
 * 주인은 그 이유를 «이름과 색이 안 맞는다» 로 짚었다(«노랑(황금) 초록(수정) … 파랑(룬)»).
 * 이 자는 그 가설을 두 가지로 나눠 잰다 —
 *   ① 8장을 실제로 그려 **찍힌 픽셀**을 읽고(350·368 교훈: 선언이 아니라 그려진 색),
 *   ② 그 색이 **그 던전 이름의 색 구간**에 드는지 센다(색이름 = 색상각 창 + L* · C* 조건).
 *
 * 재는 것:
 *   ① 412 팔레트(수리 전)와 지금 파일(수리 후)을 **같은 캔버스에서** 그려 두 자리(채움·테)를 읽는다
 *   ② «이름 일치» 건수 — 412 는 몇 장이 이름대로였나 / 지금은 몇 장인가
 *   ③ 회색조(L* 만) 최소 차 — 412 의 «L*64 한 밴드» 가 남긴 0.0 결손이 실제로 풀렸는가
 *   ④ 쌍별 최소 ΔE — 412 값(39.6) 이상인가
 *
 * ⚠ 412 팔레트는 이 파일 안의 상수다(수리 전 트리를 되짚지 않아도 전후 대조가 된다).
 *    값의 출처는 PROGRESS 430 행의 «현행 실측» 과 412 커밋의 SVG 다.
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
const P_FILL = [14, 25.5];          /* 속띠 안 · 문양 bbox 밖 (probe412 와 같은 자리) */
const P_SHELL = [32, 21];           /* 껍데기 상단 띠 · 검은 테(4px) 안쪽 */

/* 던전 이름 ↔ 주인이 지정한 색 이름 (PROGRESS 430 행) */
const NAMED = {
  gold:   { dun: '황금 동굴',   ko: '노랑' },
  dia:    { dun: '수정 광산',   ko: '초록' },
  relic1: { dun: '고대 유적',   ko: '갈색' },
  relic2: { dun: '잊힌 신전',   ko: '회색' },
  relic3: { dun: '용의 무덤',   ko: '빨강' },
  relic4: { dun: '창세의 제단', ko: '흰색' },
  stone:  { dun: '각성의 동굴', ko: '주황' },
  rstone: { dun: '룬의 제단',   ko: '파랑' },
};
/* 색이름 창 — 색상각은 **HSL**(«노랑/주황» 같은 이름은 Lab 색상각이 아니라 이쪽에 붙는다),
   밝기·채도는 CIE-Lab. 갈색과 주황은 색상각이 같은 구간이라 **L\* 로 갈린다**(갈색 = 어두운 주황). */
const WINDOW = {
  '노랑': { h: [45, 65],   c: [40, 999], l: [70, 95] },
  '초록': { h: [100, 150], c: [40, 999], l: [40, 85] },
  '갈색': { h: [18, 42],   c: [20, 999], l: [15, 50] },
  '회색': { h: null,       c: [0, 8],    l: [25, 80] },
  '빨강': { h: [350, 10],  c: [40, 999], l: [30, 62] },
  '흰색': { h: null,       c: [0, 6],    l: [92, 101] },
  '주황': { h: [18, 42],   c: [40, 999], l: [62, 88] },
  '파랑': { h: [210, 240], c: [40, 999], l: [25, 60] },
};
/* 412 팔레트(수리 전) — 채움/테. 출처: PROGRESS 430 행 «현행 실측» */
const OLD412 = {
  gold:   ['#C39335', '#755400'], dia:    ['#00B089', '#00664F'],
  relic1: ['#7DA845', '#3B6400'], relic2: ['#1AA1FD', '#005D97'],
  relic3: ['#B886E4', '#71449C'], relic4: ['#F070A5', '#A32663'],
  stone:  ['#EF7961', '#A03525'], rstone: ['#00AAC6', '#006374'],
};

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
const chroma = (l) => Math.hypot(l[1], l[2]);
function hsl(rgb) {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  return (h + 360) % 360;
}
const inH = (h, w) => (w[0] < w[1] ? (h >= w[0] && h <= w[1]) : (h >= w[0] || h <= w[1]));
function named(ko, rgb) {
  const w = WINDOW[ko], l = lab(rgb), c = chroma(l), h = hsl(rgb);
  const okC = c >= w.c[0] && c <= w.c[1];
  const okL = l[0] >= w.l[0] && l[0] <= w.l[1];
  const okH = !w.h || inH(h, w.h);
  return { ok: okC && okL && okH, L: l[0], C: c, h, okC, okL, okH };
}

(async () => {
  const now = {}, old = {};
  for (const k of KEYS) {
    const t = fs.readFileSync(path.join(ROOT, 'assets/ui/cur-ticket-' + k + '.svg'), 'utf8');
    now[k] = t;
    /* 수리 전 사본 — 채움·테 두 색만 412 값으로 되돌린다(기하·문양은 같은 것을 쓴다) */
    const f = (t.match(/<path d="M10 23h44[^"]*" fill="(#[0-9A-Fa-f]{6})"/) || [])[1];
    const s = (t.match(/<path d="M4 17h56[^"]*" fill="(#[0-9A-Fa-f]{6})"/) || [])[1];
    old[k] = t.split(f).join(OLD412[k][0]).split(s).join(OLD412[k][1]);
  }

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  const shoot = async (src) => page.evaluate(async ({ src, SC, P_FILL, P_SHELL, KEYS }) => {
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

  const pxNow = await shoot(now), pxOld = await shoot(old);
  await browser.close();

  let pass = 0, fail = 0;
  const ok = (b, n, d) => { console.log((b ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); b ? pass++ : fail++; };
  const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

  const score = (px) => {
    const rows = KEYS.map((k) => {
      const r = named(NAMED[k].ko, px[k].fill);
      return { k, ko: NAMED[k].ko, dun: NAMED[k].dun, rgb: px[k].fill, ...r };
    });
    return rows;
  };
  const oldRows = score(pxOld), nowRows = score(pxNow);

  blk('① 찍힌 픽셀 — 수리 전(412 팔레트) vs 지금');
  for (let i = 0; i < KEYS.length; i++) {
    const o = oldRows[i], n = nowRows[i];
    console.log('  ' + KEYS[i].padEnd(7) + NAMED[KEYS[i]].dun.padEnd(8) + '«' + n.ko + '»'
      + '  전 rgb(' + o.rgb.join(',') + ') L*' + o.L.toFixed(0).padStart(3) + ' C*' + o.C.toFixed(0).padStart(3) + ' h' + o.h.toFixed(0).padStart(4) + '° ' + (o.ok ? '일치' : '어긋남')
      + '   → 후 rgb(' + n.rgb.join(',') + ') L*' + n.L.toFixed(0).padStart(3) + ' C*' + n.C.toFixed(0).padStart(3) + ' h' + n.h.toFixed(0).padStart(4) + '° ' + (n.ok ? '일치' : '어긋남'));
  }
  ok(KEYS.every((k) => pxNow[k].fill.some((c) => c > 8)), '①-a 8장이 실제로 그려졌다(찍힌 픽셀이 검정 아님)');

  blk('② 이름 일치 — «이름을 들으면 그 색이어야 한다»');
  const oN = oldRows.filter((r) => r.ok).length, nN = nowRows.filter((r) => r.ok).length;
  console.log('  수리 전 어긋난 장: ' + (oldRows.filter((r) => !r.ok).map((r) => r.k + '(' + r.ko + '≠h' + r.h.toFixed(0) + '°/L*' + r.L.toFixed(0) + ')').join(', ') || '없음'));
  ok(oN < 8, '②-a 등재문 가설 확인 — 412 팔레트는 이름대로가 **아니었다**', oN + '/8 만 이름 구간 안');
  ok(nN === 8, '②-b 지금은 8장 전부 이름 구간 안이다', nN + '/8'
     + ' · ' + nowRows.map((r) => r.ko).join('·'));

  blk('③ 회색조 — 412 의 «L*64 한 밴드» 가 남긴 결손');
  const gap = (rows) => {
    const L = rows.map((r) => r.L).sort((a, b) => a - b);
    let m = 1e9, p = '';
    for (let i = 1; i < L.length; i++) if (L[i] - L[i - 1] < m) { m = L[i] - L[i - 1]; p = L[i - 1].toFixed(1) + '→' + L[i].toFixed(1); }
    return { m, p, L };
  };
  const gO = gap(oldRows), gN = gap(nowRows);
  console.log('  전 L* ' + gO.L.map((x) => x.toFixed(0)).join(' ') + ' → 최소 인접차 ' + gO.m.toFixed(1));
  console.log('  후 L* ' + gN.L.map((x) => x.toFixed(0)).join(' ') + ' → 최소 인접차 ' + gN.m.toFixed(1));
  ok(gO.m < 8, '③-a 수리 전 회색조는 서로 안 갈렸다(문양이 유일한 축이었다)', gO.m.toFixed(1));
  ok(gN.m >= 8, '③-b 지금은 회색조만으로도 8장이 갈린다(최소 인접차 ≥ 8)', gN.m.toFixed(1) + ' (' + gN.p + ')');

  blk('④ 쌍별 최소 ΔE — 412 값(39.6) 이상인가');
  const worst = (rows) => {
    let mn = 1e9, mp = '';
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const e = dE(lab(rows[i].rgb), lab(rows[j].rgb));
      if (e < mn) { mn = e; mp = rows[i].k + '↔' + rows[j].k; }
    }
    return { mn, mp };
  };
  const wO = worst(oldRows), wN = worst(nowRows);
  console.log('  전 최소 ΔE ' + wO.mn.toFixed(1) + ' (' + wO.mp + ') · 후 최소 ΔE ' + wN.mn.toFixed(1) + ' (' + wN.mp + ')');
  ok(wN.mn >= wO.mn, '④-a 이름대로 갈면서 쌍별 최소 ΔE 가 412 보다 안 나빠졌다',
     wO.mn.toFixed(1) + ' → ' + wN.mn.toFixed(1));

  console.log('\nPROBE430 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
