#!/usr/bin/env node
/* 430 검증 — 던전 입장권 8장이 «이름대로의 색» 인가
 *
 *   node tools/verify430.js
 *
 * 주인 재재지시(2026-08-30): «던전 입장권 색깔 여전히 비슷함.
 *   노랑(황금) 초록(수정) 갈색(고대) 회색(잊힌) 빨강(용) 흰색(창세) 주황(각성) 파랑(룬) 으로 해야할거 같다».
 * 402(매핑 8종 분리) → 412(색상환 배분 · L*64 한 밴드) → 430(이름이 색을 정한다) 세 번째 지시다.
 *
 * ⚠ 이 자는 412 의 규칙 하나를 **폐기한 자리에 선다** — «명도·채도를 한 밴드로 묶고 색상만 돌린다».
 *    그 규칙이 여덟을 전부 L*64 중채도로 묶어 색상환 이웃 넷(연두↔청록↔하늘↔청록2)을
 *    «파랑 계열 넷» 으로 만들었다(probe430 이 «412 팔레트는 이름 일치 0/8» 로 재현).
 *    폐기의 근거는 주인 지시이고, 자리를 비우지 않고 **이름 창 + 명도 사다리**로 갈아 끼운다(333 처방).
 *
 * 이 자가 보는 것:
 *   [A] 이름   — 8장의 **찍힌 픽셀**이 그 던전 이름의 색 구간 안에 있다(색상각 창 + L* · C* 조건).
 *   [B] 갈림   — 쌍별 최소 ΔE ≥ 39.6(412 값 이상) · **회색조(L* 만) 최소 차 ≥ 8**(412 는 0.0).
 *   [C] 세트   — «한 세트로 읽히는» 축은 색이 아니라 기하다: 껍데기·속띠 path 8장 픽셀 동일 ·
 *                문양 8종 · 잉크 bbox 21×21 · 중심 (32,35.5).
 *   [D] 테·문양 — 테는 «같은 색상의 더 어두운 짝»(무채색 2장은 중성 회색) · 테 L* ≤ 45 ·
 *                문양 잉크는 «흰색 ↔ 테색» 중 **대비가 큰 쪽**이고 채움 위 대비 ≥ 2.4.
 *   [E] 화면   — 03 카드 · 04 세부 · 13 교환 카드 세 자리에서 8장이 실제로 그려지고,
 *                흰색·회색 장이 호스트 배경에 **녹지 않는다**(대비 ≥ 3:1).
 *   [F] 제품 0줄 — 색은 자산에만 산다(index.html 에 이 팔레트 리터럴 0건) · dunTk() id 파생 유지.
 *   §R 되돌림 시험 — 412 팔레트를 도로 넣으면 [A]·[B] 가 실제로 빨개진다 ·
 *                한 장만 되돌려도 그 장이 빨개진다 · 이름 창이 «아무 색이나 통과» 시키지 않는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const KEYS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone'];
const SC = 4;
const P_FILL = [14, 25.5];          /* 속띠 안 · 문양 밖 (probe412·probe430 과 같은 자리) */
const P_SHELL = [32, 21];           /* 껍데기 상단 띠 · 검은 테 안쪽 */

const DE_MIN = 39.6;                /* 412 가 낸 값 — 이름대로 갈면서 그보다 나빠지면 안 된다 */
const GRAY_MIN = 8;                 /* 회색조 최소 인접 L* 차 (412: 0.0) */
const INK_MIN = 2.4;                /* 문양 잉크 ↔ 채움 대비 */
const RIM_LMAX = 45;                /* 테는 밝은 장에서도 어둡다 */
const RIM_DL = 15;                  /* 테는 채움보다 이만큼은 어둡다 */

/* 던전 이름 ↔ 주인이 지정한 색 이름 · 이름 창(색상각은 HSL · 밝기/채도는 CIE-Lab) */
const NAMED = {
  gold:   ['황금 동굴', '노랑'], dia:    ['수정 광산', '초록'],
  relic1: ['고대 유적', '갈색'], relic2: ['잊힌 신전', '회색'],
  relic3: ['용의 무덤', '빨강'], relic4: ['창세의 제단', '흰색'],
  stone:  ['각성의 동굴', '주황'], rstone: ['룬의 제단', '파랑'],
};
const WINDOW = {
  '노랑': { h: [45, 65],   c: [40, 999], l: [70, 95] },
  '초록': { h: [100, 150], c: [40, 999], l: [40, 85] },
  '갈색': { h: [18, 42],   c: [20, 999], l: [15, 50] },   /* 갈색 = 어두운 주황 — L* 로 갈린다 */
  '회색': { h: null,       c: [0, 8],    l: [25, 80] },
  '빨강': { h: [350, 10],  c: [40, 999], l: [30, 62] },
  '흰색': { h: null,       c: [0, 6],    l: [92, 101] },
  '주황': { h: [18, 42],   c: [40, 999], l: [62, 88] },
  '파랑': { h: [210, 240], c: [40, 999], l: [25, 60] },
};
/* 412 팔레트 — §R 되돌림 시험의 재료(수리 전 값) */
const OLD412 = {
  gold: '#C39335', dia: '#00B089', relic1: '#7DA845', relic2: '#1AA1FD',
  relic3: '#B886E4', relic4: '#F070A5', stone: '#EF7961', rstone: '#00AAC6',
};

const finv = (t) => (t > 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92);
const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
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
const hueL = (l) => (Math.atan2(l[2], l[1]) * 180 / Math.PI + 360) % 360;
const dHue = (a, b) => { const d = Math.abs(hueL(a) - hueL(b)); return d > 180 ? 360 - d : d; };
function hslH(rgb) {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  return (h + 360) % 360;
}
const relY = (rgb) => 0.2126 * finv(rgb[0] / 255) + 0.7152 * finv(rgb[1] / 255) + 0.0722 * finv(rgb[2] / 255);
const cont = (a, b) => { const x = relY(a) + 0.05, y = relY(b) + 0.05; return x > y ? x / y : y / x; };
const inH = (h, w) => (w[0] < w[1] ? (h >= w[0] && h <= w[1]) : (h >= w[0] || h <= w[1]));
function named(ko, rgb) {
  const w = WINDOW[ko], l = lab(rgb), c = chroma(l), h = hslH(rgb);
  return { ok: (c >= w.c[0] && c <= w.c[1]) && (l[0] >= w.l[0] && l[0] <= w.l[1]) && (!w.h || inH(h, w.h)),
           L: l[0], C: c, h };
}

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const bare = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
                     .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));

const fillHex = (t) => (t.match(/<path d="M10 23h44[^"]*" fill="(#[0-9A-Fa-f]{6})"/) || [])[1] || null;
const rimHex  = (t) => (t.match(/<path d="M4 17h56[^"]*" fill="(#[0-9A-Fa-f]{6})"/) || [])[1] || null;
const shellD  = (t) => (t.match(/<path d="(M4 17h56[^"]*)"/) || [])[1] || null;
const bandD   = (t) => (t.match(/<path d="(M10 23h44[^"]*)"/) || [])[1] || null;
const motifs  = (t) => [...t.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]).slice(2);
const motifInk = (t) => {
  const m = t.match(/<path d="[^"]+" fill="(#[0-9A-Fa-f]{6})" opacity="\.92" stroke="(#[0-9A-Fa-f]{6})" stroke-width="1\.6"/);
  return m ? { fill: m[1].toUpperCase(), stroke: m[2].toUpperCase() } : null;
};

(async () => {
  const src = {};
  for (const k of KEYS) {
    const p = path.join(ROOT, 'assets/ui/cur-ticket-' + k + '.svg');
    src[k] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }
  const missing = KEYS.filter((k) => !src[k]);

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1000);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const guard = (r, tag) => { if (r && r.__err) { ok(false, tag + ' evaluate 실패', r.__err); return true; } return false; };

  /* 8장을 **실제로 그려서** 두 자리를 읽는다(선언이 아니라 찍힌 픽셀 — 350·368 교훈) */
  const shoot = async (set) => ev(async ({ set, SC, P_FILL, P_SHELL }) => {
    const out = {};
    for (const k of Object.keys(set)) {
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(set[k]);
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
  }, { set, SC, P_FILL, P_SHELL });

  /* ══════════ [A] 이름 ══════════════════════════════════════════════ */
  blk('[A] 이름 — 찍힌 픽셀이 그 던전 이름의 색인가');
  ok(missing.length === 0, 'A0 입장권 SVG 8장이 실재한다',
     missing.length ? '없음: ' + missing.join(',') : '8장');
  const PX = missing.length ? { __err: 'SVG 누락' } : await shoot(src);
  const L = {};
  if (!guard(PX, 'A')) {
    for (const k of KEYS) L[k] = { f: lab(PX[k].fill), s: lab(PX[k].shell) };
    let hit = 0;
    for (const k of KEYS) {
      const [dun, ko] = NAMED[k];
      const r = named(ko, PX[k].fill);
      if (r.ok) hit++;
      ok(r.ok, 'A1-' + k + ' ' + dun + ' 입장권이 «' + ko + '» 이다',
         'rgb(' + PX[k].fill.join(',') + ') L*' + r.L.toFixed(1) + ' C*' + r.C.toFixed(1) + ' h' + r.h.toFixed(0) + '°');
    }
    ok(hit === 8, 'A2 8장 전부 이름 구간 안이다(412 팔레트는 0/8 이었다 — probe430)', hit + '/8');
  }

  /* ══════════ [B] 갈림 ══════════════════════════════════════════════ */
  blk('[B] 갈림 — 색으로도, 색이 죽어도');
  if (Object.keys(L).length === 8) {
    const pairs = [];
    for (let i = 0; i < KEYS.length; i++) for (let j = i + 1; j < KEYS.length; j++) {
      const a = KEYS[i], b = KEYS[j];
      pairs.push({ p: a + '↔' + b, e: dE(L[a].f, L[b].f), h: dHue(L[a].f, L[b].f),
                   l: Math.abs(L[a].f[0] - L[b].f[0]), c: Math.abs(chroma(L[a].f) - chroma(L[b].f)) });
    }
    pairs.sort((x, y) => x.e - y.e);
    ok(pairs[0].e >= DE_MIN, 'B1 쌍별 최소 ΔE ≥ ' + DE_MIN + ' (412 값 이상 · 402 전은 12.4)',
       '최소 ' + pairs[0].e.toFixed(1) + ' (' + pairs[0].p + ') · 중앙값 ' + pairs[14].e.toFixed(1));
    const Ls = KEYS.map((k) => L[k].f[0]).sort((a, b) => a - b);
    let g = 1e9, gp = '';
    for (let i = 1; i < Ls.length; i++) if (Ls[i] - Ls[i - 1] < g) { g = Ls[i] - Ls[i - 1]; gp = Ls[i - 1].toFixed(1) + '→' + Ls[i].toFixed(1); }
    ok(g >= GRAY_MIN, 'B2 회색조(L* 만) 최소 차 ≥ ' + GRAY_MIN + ' — 412 의 «한 밴드»(0.0)가 남긴 결손이 풀렸다',
       g.toFixed(1) + ' (' + gp + ') · 사다리 ' + Ls.map((x) => x.toFixed(0)).join('/'));
    /* «명도만으로 갈린 쌍 금지» — 430 은 축이 셋이다(색상 · 명도 · 채도).
       무채색 2장은 «채도가 0 이라는 것» 자체가 축이라 색상각을 묻지 않는다. */
    const weak = pairs.filter((r) => r.h < 30 && r.l < 18 && r.c < 25);
    ok(weak.length === 0, 'B3 «색상각 ≥30° 또는 L* 차 ≥18 또는 C* 차 ≥25» 를 못 넘는 쌍 0건',
       weak.length ? weak.map((r) => r.p).join(',') : '0건 (최소 조합 ' + pairs[0].p + ')');
  }

  /* ══════════ [C] 세트 ══════════════════════════════════════════════ */
  blk('[C] 세트 — 색을 갈라도 한 벌로 읽히는 축(기하)은 그대로다');
  if (!missing.length) {
    const sh = KEYS.map((k) => shellD(src[k])), bd = KEYS.map((k) => bandD(src[k]));
    ok(sh.every((d) => d && d === sh[0]), 'C1 껍데기 기하 8장 픽셀 동일(412·402 와 같은 두 줄)',
       sh.every((d) => d === sh[0]) ? '8/8' : KEYS.filter((k, i) => sh[i] !== sh[0]).join(','));
    ok(bd.every((d) => d && d === bd[0]), 'C2 속띠 기하 8장 픽셀 동일',
       bd.every((d) => d === bd[0]) ? '8/8' : KEYS.filter((k, i) => bd[i] !== bd[0]).join(','));
    const mo = {}; KEYS.forEach((k) => mo[k] = motifs(src[k]));
    const sig = {}; KEYS.forEach((k) => sig[k] = mo[k].join('|'));
    const dup = [];
    for (let i = 0; i < KEYS.length; i++) for (let j = i + 1; j < KEYS.length; j++)
      if (sig[KEYS[i]] === sig[KEYS[j]]) dup.push(KEYS[i] + '↔' + KEYS[j]);
    ok(dup.length === 0, 'C3 문양 실루엣 8종 유지(412 가 갈라 놓은 축 — 430 은 path 를 안 건드린다)',
       dup.length ? dup.join(',') : '8장 → ' + new Set(Object.values(sig)).size + '종');
    const BOX = await ev((mo) => {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 64 64'); svg.style.position = 'absolute'; svg.style.left = '-999px';
      document.body.appendChild(svg);
      const out = {};
      for (const k in mo) {
        let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
        for (const d of mo[k]) {
          const p = document.createElementNS(NS, 'path');
          p.setAttribute('d', d); svg.appendChild(p);
          const b = p.getBBox();
          x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
          x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
          svg.removeChild(p);
        }
        out[k] = { w: x2 - x1, h: y2 - y1, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
      }
      svg.remove();
      return out;
    }, mo);
    if (!guard(BOX, 'C4')) {
      const ws = KEYS.map((k) => BOX[k].w), hs = KEYS.map((k) => BOX[k].h);
      const rw = Math.max(...ws) / Math.min(...ws), rh = Math.max(...hs) / Math.min(...hs);
      ok(rw <= 1.05 && rh <= 1.05, 'C4 문양 잉크 덩치가 한 세트다(최대÷최소 ≤ 1.05 · bbox Δ0)',
         'w ' + rw.toFixed(3) + ' · h ' + rh.toFixed(3) + ' · ' + ws[0].toFixed(1) + '×' + hs[0].toFixed(1));
      const off = KEYS.filter((k) => Math.abs(BOX[k].cx - 32) > 1 || Math.abs(BOX[k].cy - 35.5) > 1);
      ok(off.length === 0, 'C5 문양 중심이 8장 같은 자리다 (32, 35.5) ±1', off.length ? off.join(',') : '8/8');
    }
  }

  /* ══════════ [D] 테·문양 ═══════════════════════════════════════════ */
  blk('[D] 테·문양 — 밝은 장에서도 읽히는가');
  if (!missing.length && Object.keys(L).length === 8) {
    const rimBad = [], inkBad = [], pickBad = [];
    const rows = [];
    for (const k of KEYS) {
      const f = fillHex(src[k]), r = rimHex(src[k]);
      const lf = lab(rgbOf(f)), lr = lab(rgbOf(r));
      const achroma = chroma(lf) <= 8;
      const dh = dHue(lf, lr), dl = lf[0] - lr[0];
      if (lr[0] > RIM_LMAX || dl < RIM_DL || (achroma ? chroma(lr) > 8 : dh > 6)) rimBad.push(k + '(L*' + lr[0].toFixed(0) + '/ΔL' + dl.toFixed(0) + '/Δh' + dh.toFixed(0) + ')');
      const ink = motifInk(src[k]);
      if (!ink) { inkBad.push(k + '(규격 밖)'); continue; }
      const cInk = cont(rgbOf(ink.fill), rgbOf(f));
      const cWhite = cont([255, 255, 255], rgbOf(f)), cRim = cont(rgbOf(r), rgbOf(f));
      if (cInk < INK_MIN) inkBad.push(k + '(' + cInk.toFixed(2) + ')');
      /* «흰색 ↔ 테색» 중 대비가 큰 쪽을 골랐는가 — 밝은 장 셋이 테색으로 넘어간 이유가 이것이다 */
      const want = cWhite >= cRim ? '#FFFFFF' : r.toUpperCase();
      if (ink.fill !== want) pickBad.push(k + '(' + ink.fill + ' ≠ ' + want + ')');
      /* 획은 «잉크의 반대쪽» — 흰 잉크면 테색, 테색 잉크면 채움색(밝은 후광).
         밝은 장 셋은 잉크가 테와 같은 색이라 획까지 테색이면 문양 밑변이 테에 붙어 잘려 보인다. */
      const wantStroke = (ink.fill === '#FFFFFF' ? r : f).toUpperCase();
      if (ink.stroke !== wantStroke) inkBad.push(k + '(획 ' + ink.stroke + ' ≠ ' + wantStroke + ')');
      rows.push(k + ':' + cInk.toFixed(2));
    }
    ok(rimBad.length === 0,
       'D1 테는 «더 어두운 짝» 이다(ΔL ≥ ' + RIM_DL + ' · 테 L* ≤ ' + RIM_LMAX + ' · 유채색은 Δh ≤ 6° · 무채색은 C* ≤ 8)',
       rimBad.length ? rimBad.join(', ') : '8/8');
    ok(inkBad.length === 0, 'D2 문양 잉크가 채움 위에서 대비 ≥ ' + INK_MIN + ' 이고 획은 «잉크의 반대쪽» 색이다',
       inkBad.length ? inkBad.join(', ') : rows.join(' · '));
    ok(pickBad.length === 0, 'D3 문양 잉크는 «흰색 ↔ 테색» 중 대비가 큰 쪽이다(노랑·흰색·주황이 테색으로 넘어간다)',
       pickBad.length ? pickBad.join(', ') : '8/8');
  }

  /* ══════════ [E] 화면 ══════════════════════════════════════════════ */
  blk('[E] 화면 — 세 자리에서 그려지고, 배경에 안 녹는가');
  const E = await ev(() => {
    const nm = (el) => (el ? el.getAttribute('src').split('/').pop() : null);
    const bgOf = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const m = c && c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || +m[4] > 0.5)) return [+m[1], +m[2], +m[3]];
      }
      return [255, 255, 255];
    };
    S.guide.idx = 99;
    Object.values(DUN_UI).forEach((u) => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
    openDungeon();
    const card = {}, det = {}, ex = {}, bg = {};
    DUNGEONS.forEach((d) => {
      const im = document.querySelector('#dunList [data-dcard="' + d.id + '"] .sp.tk img.cic');
      card[d.id] = nm(im);
      if (im) bg[d.id] = bgOf(im.parentElement);
    });
    for (const d of DUNGEONS) { openDunDetail(d); det[d.id] = nm(document.querySelector('#dgdTki img.cic')); closeDunDetail(); }
    openShopTab('coin');
    document.querySelectorAll('#shopList .cn-cd.dtk').forEach((c) => {
      const bt = c.querySelector('[data-dunex]');
      if (bt) ex[bt.dataset.dunex] = nm(c.querySelector('.pn img.cic'));
    });
    return { card, det, ex, bg, want: DUNGEONS.reduce((o, d) => (o[d.id] = CUR_ICON[dunTk(d.id)].split('/').pop(), o), {}) };
  });
  if (!guard(E, 'E')) {
    for (const [tag, key, where] of [['E1', 'card', '03 던전 카드 `.sp.tk`'],
                                     ['E2', 'det', '04 세부 팝업 `#dgdTki`'],
                                     ['E3', 'ex', '13 재화 교환 카드 `.cn-cd.dtk`']]) {
      const got = E[key], ids = Object.keys(E.want);
      const bad = ids.filter((id) => got[id] !== E.want[id]);
      ok(bad.length === 0 && new Set(ids.map((id) => got[id])).size === ids.length,
         tag + ' ' + where + ' — 8던전이 서로 다른 그림 · 선언과 일치',
         bad.length ? bad.map((id) => id + ' ' + got[id]).join(' | ') : ids.length + '장 → 8종');
    }
    /* «배경에 녹지 않는가» — 03 카드의 `.sp.tk` 알약은 `rgba(0,0,0,.75)` 라 **거의 검정**이다.
       그래서 «검은 테가 받아 준다» 는 여기서 거짓이고, 어두운 장(갈색 L*29.5 · 파랑 L*38.1)은
       채움만으로는 2.1~2.5:1 에 그친다. 실제로 그 장들을 보이게 하는 것은 **흰 문양**이다 —
       잉크 고르기(D3)가 어두운 장에 흰색을, 밝은 장에 테색을 주므로 **어느 장이든 배경에서 먼 잉크가 하나 있다**.
       ⇒ 판정은 «세 잉크(테·채움·문양) 중 적어도 하나가 배경과 ≥ 3:1» 이다.
       ⚠ 이 항이 무른 게 아님은 §R6 이 못박는다(문양까지 어두운 사본은 여기서 빨개진다). */
    if (!missing.length) {
      const soft = [], rows = [];
      for (const k of KEYS) {
        const b = E.bg[k]; if (!b) { soft.push(k + '(배경 못 읽음)'); continue; }
        const f = rgbOf(fillHex(src[k])), r = rgbOf(rimHex(src[k]));
        const ink = motifInk(src[k]);
        const best = Math.max(cont(r, b), cont(f, b), ink ? cont(rgbOf(ink.fill), b) : 0);
        rows.push(k + ':' + best.toFixed(1) + '(채움만 ' + cont(f, b).toFixed(1) + ')');
        if (best < 3) soft.push(k + '(' + best.toFixed(2) + ':1)');
      }
      ok(soft.length === 0, 'E4 8장이 03 카드 배경(거의 검정) 위에서 안 녹는다 — 세 잉크 중 하나가 ≥ 3:1',
         soft.length ? soft.join(', ') : rows.join(' · '));
      /* §R6 — 문양까지 배경 쪽으로 끌어내린 사본은 이 항이 잡는다(양성항만 보는 자가 아니다) */
      const b0 = E.bg.relic1;
      if (b0) {
        const f0 = rgbOf(fillHex(src.relic1)), r0 = rgbOf(rimHex(src.relic1));
        /* 사본 = 갈색 장의 문양 잉크를 흰색 → 테색으로 바꾼 것(잉크 셋이 전부 어두워진다) */
        const dark = Math.max(cont(r0, b0), cont(f0, b0), cont(r0, b0));
        ok(dark < 3, '§R6 어두운 장의 문양을 테색으로 바꾼 사본은 E4 가 빨개진다(흰 문양이 그 장을 살린다)',
           '문양을 테색으로 두면 최선 ' + dark.toFixed(2) + ':1 < 3');
      }
    }
  }

  /* ── [E5] **화면에 찍힌 픽셀** — 선언(src)이 맞아도 호스트가 색을 되접을 수 있다.
     실제로 그랬다: `.dgd-tki` 에 `filter:hue-rotate(108deg) saturate(.7) brightness(1.7)` 가 남아 있어
     04 세부 팝업이 8색을 **초록 한 색으로** 되접고 있었다(갈색 → #23864E · 주황 → #2D9350).
     ⇒ 두 자리(03 카드 · 04 세부)에서 캡처를 되읽어 **그 이름 창 안인가**를 다시 묻는다(350 처방). */
  const shotSample = async (pts) => {
    /* 캡처를 data URL 로 페이지에 되돌려 «찍힌 픽셀» 을 읽는다(호스트가 filter 를 쓰면 rect 만으로는 못 잡는다) */
    const png = (await page.screenshot({ type: 'png' })).toString('base64');
    return ev(async ({ png, pts }) => {
      const img = new Image();
      await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + png; });
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d');
      g.drawImage(img, 0, 0);
      const out = {};
      for (const k in pts) out[k] = [...g.getImageData(Math.round(pts[k].x), Math.round(pts[k].y), 1, 1).data].slice(0, 3);
      return out;
    }, { png, pts });
  };
  /* 아이콘 안의 (u,v)[64 뷰박스 좌표] 가 **화면 어디에 찍히는지** 를 제품에게 묻는다.
     ⚠ 04 팝업의 `.dgd-tki` 는 `rotate(-18deg)` 라 `getBoundingClientRect` 는 **회전 전 상자보다 큰
        축정렬 상자**다 — 그 상자에 비율로 찍으면 표본이 테(검정)로 빗나간다. 조상 transform 의
        회전·배율만 곱해 중심 기준으로 되민다(이동분 e·f 는 rect 가 이미 갖고 있다). */
  const POINT_FN = `(sel, u, v) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = Math.min(el.offsetWidth, el.offsetHeight) / 64;
    let m = new DOMMatrix();
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== 'none') m = new DOMMatrix(t).multiply(m);
    }
    const rot = new DOMMatrix([m.a, m.b, m.c, m.d, 0, 0]);
    const p = rot.transformPoint(new DOMPoint((u - 32) * s, (v - 32) * s));
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2 + p.x, y: r.y + r.height / 2 + p.y };
  }`;
  /* prep 로 «그 자리를 화면에 세우고», 연출이 앉은 **뒤에** 표본 자리를 잰다 —
     열자마자 잰 자리는 60 쥬시가 아직 움직이는 자리라 표본이 배경으로 빗나간다(350 교훈). */
  const onScreen = async (tag, where, prep, sel) => {
    const bad = [];
    for (const k of KEYS) {
      const p0 = await ev(prep, k);
      if (guard(p0, tag + '-' + k)) return;
      await page.waitForTimeout(420);
      const pt = await ev(({ fn, sel }) => (new Function('return ' + fn))()(sel, 14, 25.5),
                          { fn: POINT_FN, sel: typeof sel === 'function' ? sel(k) : sel });
      if (guard(pt, tag + '-' + k)) return;
      if (!pt) { bad.push(k + '(자리 없음)'); continue; }
      const px = await shotSample({ [k]: pt });
      if (guard(px, tag + '-' + k)) return;
      const r = named(NAMED[k][1], px[k]);
      if (!r.ok) bad.push(k + ' «' + NAMED[k][1] + '» 인데 rgb(' + px[k].join(',') + ') h' + r.h.toFixed(0) + '°/L*' + r.L.toFixed(0));
    }
    ok(bad.length === 0, tag + ' ' + where + ' — **찍힌 픽셀**이 8장 다 이름 창 안이다(호스트가 색을 안 되접는다)',
       bad.length ? bad.join(' | ') : '8/8');
  };
  await onScreen('E5', '03 던전 카드',
    (id) => {
      closeDunDetail(); openDungeon();
      const el = document.querySelector('#dunList [data-dcard="' + id + '"] .sp.tk img.cic');
      if (el) el.scrollIntoView({ block: 'center' });
      return 1;
    },
    (k) => '#dunList [data-dcard="' + k + '"] .sp.tk img.cic');
  await onScreen('E6', '04 세부 팝업',
    (id) => { closeDunDetail(); openDunDetail(DUNGEONS.find((d) => d.id === id)); return 1; },
    '#dgdTki img.cic');
  /* §R7 — 되돌림: 그 filter 를 도로 켜면 E6 가 실제로 빨개지는가(양성항만 보는 자가 아니다) */
  {
    const ready = await ev(() => {
      const host = document.getElementById('dgdTki');
      if (!host) return null;
      host.style.filter = 'hue-rotate(108deg) saturate(.7) brightness(1.7)';
      closeDunDetail();
      openDunDetail(DUNGEONS.find((d) => d.id === 'relic1'));
      return 1;
    });
    if (ready && !ready.__err) {
      await page.waitForTimeout(420);
      const pt = await ev(({ fn, sel }) => (new Function('return ' + fn))()(sel, 14, 25.5),
                          { fn: POINT_FN, sel: '#dgdTki img.cic' });
      const px = pt && !pt.__err ? await shotSample({ relic1: pt }) : { __err: '자리 없음' };
      await ev(() => { const h = document.getElementById('dgdTki'); if (h) h.style.filter = ''; closeDunDetail(); });
      if (!guard(px, '§R7')) {
        const r = named('갈색', px.relic1);
        ok(!r.ok, '§R7 04 팝업의 옛 `hue-rotate` 를 도로 켜면 E6 가 빨개진다(그 필터가 8색을 초록으로 되접었다)',
           'rgb(' + px.relic1.join(',') + ') h' + r.h.toFixed(0) + '° → «갈색» 창 밖');
      }
    }
  }
  await ev(() => closeDunDetail());
  /* §R7 — 되돌림: 그 filter 를 도로 켜면 E6 가 실제로 빨개지는가(양성항만 보는 자가 아니다) */
  {
    const back = await ev(async () => {
      const host = document.getElementById('dgdTki');
      if (!host) return null;
      host.style.filter = 'hue-rotate(108deg) saturate(.7) brightness(1.7)';
      openDunDetail(DUNGEONS.find((d) => d.id === 'relic1'));
      const el = host.querySelector('img.cic');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (back && !back.__err) {
      await page.waitForTimeout(200);
      const px = await shotSample({ relic1: back });
      await ev(() => { const h = document.getElementById('dgdTki'); if (h) h.style.filter = ''; closeDunDetail(); });
      if (!guard(px, '§R7')) {
        const r = named('갈색', px.relic1);
        ok(!r.ok, '§R7 04 팝업의 옛 `hue-rotate` 를 도로 켜면 E6 가 빨개진다(그 필터가 8색을 초록으로 되접었다)',
           'rgb(' + px.relic1.join(',') + ') h' + r.h.toFixed(0) + '° → «갈색» 창 밖');
      }
    }
  }

  /* ══════════ [F] 제품 0줄 ══════════════════════════════════════════ */
  blk('[F] 제품 — 색은 자산에만 산다');
  const cl = bare(SRC);
  /* ⚠ 흰색·검정은 게임 전체가 쓰는 색이라 «자산 색이 제품으로 샜다» 의 증거가 못 된다(창세 = #FFFFFF).
     그래서 스코프는 **팔레트 고유색**(순백·순검 제외 채움 7 + 테 8)이다. */
  const GENERIC = ['#FFFFFF', '#000000'];
  const leaked = [];
  for (const k of KEYS) {
    for (const [what, hex] of [['채움', fillHex(src[k] || '')], ['테', rimHex(src[k] || '')]]) {
      if (!hex || GENERIC.includes(hex.toUpperCase())) continue;
      if (cl.toUpperCase().includes(hex.toUpperCase())) leaked.push(k + ' ' + what + ' ' + hex);
    }
  }
  ok(leaked.length === 0, 'F1 index.html 에 팔레트 고유색 리터럴 0건(제품 0줄 — 색을 고치려면 SVG 만 고치면 된다)',
     leaked.length ? leaked.join(', ') : '0건 (채움 7 + 테 8 · 순백/순검 제외)');
  ok(/'tk'\s*\+\s*\w+\.charAt\(0\)|`tk\$\{/.test(cl) || /dunTk/.test(cl),
     'F2 매핑은 402 가 세운 «id 파생» 그대로다(표·폴백 문자열을 안 되살렸다)',
     (cl.match(/function dunTk[\s\S]{0,120}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 110));

  /* ══════════ §R 되돌림 시험 ════════════════════════════════════════ */
  blk('§R 되돌림 시험 — 자가 무르지 않은가');
  if (!missing.length) {
    /* ⓐ 412 팔레트를 통째로 되돌린 사본을 **실제로 그려서** 같은 자에 통과시켜 본다 */
    const rev = {};
    for (const k of KEYS) rev[k] = src[k].split(fillHex(src[k])).join(OLD412[k]);
    const RPX = await shoot(rev);
    if (!guard(RPX, '§R')) {
      let hit = 0;
      for (const k of KEYS) if (named(NAMED[k][1], RPX[k].fill).ok) hit++;
      ok(hit === 0, '§R1 412 팔레트를 도로 넣으면 [A] 이름 창이 **8장 다** 빨개진다', hit + '/8 통과');
      const rl = KEYS.map((k) => lab(RPX[k].fill)[0]).sort((a, b) => a - b);
      let g = 1e9; for (let i = 1; i < rl.length; i++) g = Math.min(g, rl[i] - rl[i - 1]);
      ok(g < GRAY_MIN, '§R2 그 되돌림은 [B2] 회색조 사다리도 같이 빨갛게 한다(412 는 한 밴드였다)',
         '되돌림 최소 인접차 ' + g.toFixed(1) + ' vs 지금 ≥' + GRAY_MIN);
    }
    /* ⓑ 한 장만 되돌려도 그 장이 잡히는가 — «8장 다 바꿔야만 빨개지는 자» 가 아니다 */
    const one = Object.assign({}, src, { relic3: src.relic3.split(fillHex(src.relic3)).join(OLD412.relic3) });
    const OPX = await shoot(one);
    if (!guard(OPX, '§R3')) {
      const r = named('빨강', OPX.relic3.fill);
      ok(!r.ok, '§R3 용의 무덤 한 장만 412 보라로 되돌려도 그 장이 빨개진다',
         'rgb(' + OPX.relic3.fill.join(',') + ') h' + r.h.toFixed(0) + '° → «빨강» 창 밖');
    }
    /* ⓒ 이름 창이 무르지 않다 — 이웃 이름의 색을 넣으면 통과하지 못한다 */
    const swap = named('노랑', rgbOf(fillHex(src.stone)));   /* 주황을 «노랑» 창에 */
    const swap2 = named('갈색', rgbOf(fillHex(src.stone)));  /* 주황을 «갈색» 창에(같은 색상각, 명도만 다르다) */
    ok(!swap.ok && !swap2.ok, '§R4 이름 창이 이웃 이름을 통과시키지 않는다(주황 → «노랑»·«갈색» 둘 다 탈락)',
       '노랑창 ' + (swap.ok ? '통과(무르다)' : '탈락') + ' · 갈색창 ' + (swap2.ok ? '통과(무르다)' : '탈락'));
    /* ⓓ 판정식이 «항상 초록» 이 아니다 — 지금 팔레트는 통과한다 */
    ok(KEYS.every((k) => named(NAMED[k][1], rgbOf(fillHex(src[k]))).ok),
       '§R5 그 창으로 지금 8장은 통과한다(창이 아무도 못 통과하는 자가 아니다)', '8/8');
  }

  blk('콘솔');
  ok(errs.length === 0, 'Z1 콘솔 에러 0건', errs.length ? errs.slice(0, 2).join(' | ') : '0건');

  await browser.close();
  console.log('\nVERIFY430 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
