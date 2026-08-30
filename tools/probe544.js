#!/usr/bin/env node
/* 작업 544 재현 — «`verify181` [B] 모서리 AA 잔변화 263화소» 의 화소가 «어디서» 나오는가.
 *
 *   node tools/probe544.js
 *
 * 338 규칙 — 처방(허용치 조정) 전에 먼저 제품에게 직접 묻는다.
 * 등재문의 갈래 둘을 가르는 것이 이 자의 유일한 목적이다:
 *   ⓐ 자 문제  — 허용치 16 이 낡았다(267 이 «버튼 네 모서리» 를 마스크에 더한 뒤로 세는 면적이 늘었다)
 *   ⓑ 진짜 움직임 — 회전 3.9초 동안 박스 «위»(#fxl 등)를 무언가가 실제로 가로지른다
 *
 * 재는 것:
 *   [1] 마스크 면적   — 박스 모서리 4개 · 버튼 모서리 4개가 각각 몇 화소인가(=«16» 이 어느 면적의 값이었나)
 *   [2] 구역별 잔변화 — 프레임 쌍마다 박스/버튼 · 모서리별로 나눠 센다
 *   [3] 진동인가 이동인가 — 바뀐 화소가 다음 프레임에 «원래 값으로» 돌아오는가(AA 뒤집힘의 정의)
 *   [4] 누적 성질     — verify181 의 corner.n 은 프레임 쌍마다 **누적**된다. 쌍 수가 실행마다 달라지면
 *                       같은 트리에서도 값이 흔들린다(플레이키의 구조적 씨앗인지 확인)
 *   [5] #fxl 실사     — 회전 중 #fxl 의 자식 수·rect 를 프레임마다 찍는다(ⓑ 의 직접 증거)
 */
const path = require('path');
const zlib = require('zlib');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const N = Number(process.env.P544_N || 8);

function pngRead(buf) {
  let p = 8, w = 0, h = 0, ct = 6, depth = 8, il = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IHDR') { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12);
                           depth = buf[p + 16]; ct = buf[p + 17]; il = buf[p + 20]; }
    else if (type === 'IDAT') idat.push(buf.slice(p + 8, p + 8 + len));
    else if (type === 'IEND') break;
    p += len + 12;
  }
  if (depth !== 8 || il !== 0 || (ct !== 2 && ct !== 6))
    throw new Error(`PNG 형식 미지원 (depth ${depth} · colorType ${ct} · interlace ${il})`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, out = Buffer.alloc(h * stride);
  let o = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[o++];
    const line = raw.slice(o, o + stride); o += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}
/* verify181 과 **같은 식**이어야 한다 — 여기서 다르게 재면 재현이 아니다 */
function inCorner(x, y, w, h, r) { const R = r + 6; return (x < R || x >= w - R) && (y < R || y >= h - R); }
function inBtnCorner(x, y, geo) {
  if (!geo.btn) return false;
  const bx = geo.btn.x - geo.box.x, by = geo.btn.y - geo.box.y;
  const lx = x - bx, ly = y - by;
  if (lx < 0 || ly < 0 || lx >= geo.btn.w || ly >= geo.btn.h) return false;
  return inCorner(lx, ly, geo.btn.w, geo.btn.h, geo.br || 0);
}
const px = (im, x, y) => { const i = (y * im.w + x) * im.bpp; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
const dif = (a, b) => Math.abs(a[0] - b[0]) > 8 || Math.abs(a[1] - b[1]) > 8 || Math.abs(a[2] - b[2]) > 8;
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

async function main() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  /* verify181 과 같은 전처리 — 배경을 내려 «팝업 뒤» 를 센서에서 뺀다 */
  await page.evaluate(() => {
    ['view', 'stagearea', 'tabbar', 'top'].forEach((id) => { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; });
  });
  await page.evaluate(() => { S.daily.spins = 30; S.dia = 0; openRoulette(); });
  await page.waitForTimeout(500);

  const geo = await page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const b = document.querySelector('#modal .mbox');
    const rb = document.getElementById('rouBtn');
    return { box: g('#modal .mbox'), rlt: g('#modal .rlt'), btn: g('#rouBtn'),
             br: rb ? Math.ceil(parseFloat(getComputedStyle(rb).borderTopLeftRadius) || 0) : 0,
             rr: b ? Math.ceil(parseFloat(getComputedStyle(b).borderTopLeftRadius) || 0) : 0 };
  });
  console.log('[geo] box ' + JSON.stringify(geo.box) + ' rr=' + geo.rr);
  console.log('[geo] btn ' + JSON.stringify(geo.btn) + ' br=' + geo.br);
  console.log('[geo] rlt ' + JSON.stringify(geo.rlt));

  /* ── [1] 마스크 면적 — «16» 이 어느 면적의 값이었나 ── */
  let areaBox = 0, areaBtn = 0;
  for (let y = 0; y < geo.box.h; y++) for (let x = 0; x < geo.box.w; x++) {
    const inR = (y >= geo.rlt.y - geo.box.y && y <= geo.rlt.y - geo.box.y + geo.rlt.h &&
                 x >= geo.rlt.x - geo.box.x && x <= geo.rlt.x - geo.box.x + geo.rlt.w);
    if (inR) continue;
    if (inCorner(x, y, geo.box.w, geo.box.h, geo.rr)) areaBox++;
    else if (inBtnCorner(x, y, geo)) areaBtn++;
  }
  console.log(`[1] 마스크 면적 — 박스 모서리 ${areaBox}화소 · 버튼 모서리 ${areaBtn}화소 · 합 ${areaBox + areaBtn}`);
  console.log(`    (267 이전 = 박스만 ${areaBox} · 지금 = ${areaBox + areaBtn} · ${((areaBox + areaBtn) / areaBox).toFixed(2)}배)`);

  await page.click('#rouBtn');

  const shots = [];
  for (let i = 0; i < N; i++) {
    const spin0 = await page.evaluate(() => rouSpinning);
    const buf = await page.screenshot({ clip: { x: geo.box.x, y: geo.box.y, width: geo.box.w, height: geo.box.h } });
    const spin = spin0 && await page.evaluate(() => rouSpinning);
    /* [5] #fxl 실사 — 팝업 «위» 레이어에 그 순간 무엇이 있는가 */
    const fxl = await page.evaluate(() => {
      const l = document.getElementById('fxl');
      if (!l) return { n: -1, kids: [] };
      return { n: l.children.length, kids: [...l.children].slice(0, 6).map((e) => {
        const r = e.getBoundingClientRect();
        return e.className + '@' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
      }) };
    });
    shots.push({ spin, buf, fxl });
    await page.waitForTimeout(60);
  }
  const spinN = shots.filter((s) => s.spin).length;
  console.log(`[5] #fxl 자식 수(프레임별) — ${shots.map((s) => s.fxl.n).join(' ')}`);
  shots.forEach((s, i) => { if (s.fxl.kids.length) console.log(`    f${i} kids: ${s.fxl.kids.join(' | ')}`); });

  /* ── [2] 구역별 잔변화 ── */
  const ims = shots.map((s) => pngRead(s.buf));
  const W = ims[0].w, H = ims[0].h;
  const quad = (x, y, w, h) => (x < w / 2 ? 'L' : 'R') + (y < h / 2 ? 'T' : 'B');
  let cum = 0, perMax = 0;
  const hits = [];                       /* [3] 용 — 바뀐 화소 좌표 모음 */
  for (let i = 1; i < shots.length; i++) {
    if (!shots[i].spin || !shots[i - 1].spin) continue;
    const A = ims[i - 1], B = ims[i];
    const tally = { box: {}, btn: {} };
    let nb = 0, nt = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const inR = (y >= geo.rlt.y - geo.box.y && y <= geo.rlt.y - geo.box.y + geo.rlt.h &&
                   x >= geo.rlt.x - geo.box.x && x <= geo.rlt.x - geo.box.x + geo.rlt.w);
      if (inR) continue;
      const cb = inCorner(x, y, W, H, geo.rr), ct = !cb && inBtnCorner(x, y, geo);
      if (!cb && !ct) continue;
      if (!dif(px(A, x, y), px(B, x, y))) continue;
      if (cb) { const q = quad(x, y, W, H); tally.box[q] = (tally.box[q] || 0) + 1; nb++; }
      else { const q = quad(x - (geo.btn.x - geo.box.x), y - (geo.btn.y - geo.box.y), geo.btn.w, geo.btn.h);
             tally.btn[q] = (tally.btn[q] || 0) + 1; nt++; }
      hits.push({ i, x, y, where: cb ? 'box' : 'btn' });
    }
    cum += nb + nt; perMax = Math.max(perMax, nb + nt);
    console.log(`[2] 쌍 ${i - 1}→${i} : 박스 ${nb} ${JSON.stringify(tally.box)} · 버튼 ${nt} ${JSON.stringify(tally.btn)} (누적 ${cum})`);
  }
  console.log(`[2] 회전 프레임 ${spinN}장 · 쌍 ${Math.max(0, spinN - 1)}개 · **누적 ${cum}화소** (verify181 의 corner.n 과 같은 값) · **쌍당 최대 ${perMax}**`);
  console.log(`[4] 쌍당 평균 ${((cum / Math.max(1, spinN - 1))).toFixed(1)}화소 — 쌍 수가 실행마다 달라지면 누적값도 같이 흔들린다`);

  /* ── [3] 진동인가 이동인가 — 바뀐 화소가 «두 값 사이» 를 오가는가 ── */
  const uniq = [];
  const seen = new Set();
  for (const h of hits) { const k = h.x + ',' + h.y; if (!seen.has(k)) { seen.add(k); uniq.push(h); } }
  const hist = {};
  const sample = uniq.slice(0, 400);
  for (const h of sample) {
    const vals = ims.map((im, i) => (shots[i].spin ? px(im, h.x, h.y) : null)).filter(Boolean);
    const set = [];
    for (const v of vals) if (!set.some((s) => same(s, v))) set.push(v);
    const k = Math.min(set.length, 4);
    hist[k] = (hist[k] || 0) + 1;
  }
  console.log(`[3] 바뀐 서로 다른 화소 ${uniq.length}곳 · 표본 ${sample.length} — «화소당 서로 다른 값의 수» 분포 ${JSON.stringify(hist)}`);
  console.log('    (2 = 두 값 사이 계단·왕복 = AA 뒤집힘 · 4 이상 = 여러 색이 지나갔다 = 이동 의심)');
  const byWhere = uniq.reduce((a, h) => { a[h.where] = (a[h.where] || 0) + 1; return a; }, {});
  console.log(`[3] 자리 분포 — ${JSON.stringify(byWhere)}`);
  const bb = uniq.reduce((a, h) => ({ x0: Math.min(a.x0, h.x), y0: Math.min(a.y0, h.y), x1: Math.max(a.x1, h.x), y1: Math.max(a.y1, h.y) }),
    { x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
  console.log(`[3] 바뀐 화소 bbox(박스 좌표) — ${JSON.stringify(bb)}`);

  /* ── [6] Δ 크기 — AA 뒤집힘인가 «위를 덮은 것» 인가 ──
     AA 는 «호 위 반투명 화소가 두 값 사이» 라 Δ 가 작다. 팝업 위를 노드가 지나가면
     그 자리는 배경색 ↔ 노드색이라 Δ 가 크다(연출색은 흰·금·시안 계열). */
  let dmax = 0, dsum = 0, dn = 0;
  for (const h of uniq) {
    let m = 0;
    for (let i = 1; i < ims.length; i++) {
      if (!shots[i].spin || !shots[i - 1].spin) continue;
      const a = px(ims[i - 1], h.x, h.y), b = px(ims[i], h.x, h.y);
      m = Math.max(m, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    }
    dmax = Math.max(dmax, m); dsum += m; dn++;
  }
  console.log(`[6] 바뀐 화소의 Δ — 최대 ${dmax} · 평균 ${(dsum / Math.max(1, dn)).toFixed(1)} (박스 모서리 실측 근거는 «Δ≤34»)`);
  /* 표본 12곳의 프레임별 색 — «두 값» 인지 눈으로 확인할 수 있게 그대로 찍는다 */
  for (const h of uniq.filter((u) => u.where === 'btn').slice(0, 6).concat(uniq.filter((u) => u.where === 'box').slice(0, 3))) {
    const seq = ims.map((im, i) => (shots[i].spin ? px(im, h.x, h.y).join(',') : null)).filter(Boolean);
    console.log(`    ${h.where} 박스(${h.x},${h.y}) = 페이지(${geo.box.x + h.x},${geo.box.y + h.y}) : ${seq.join(' → ')}`);
  }

  /* ── [7] 대조군 — 회전이 «없을» 때 같은 마스크가 조용한가 ── */
  await page.waitForTimeout(4500);
  await page.evaluate(() => { S.daily.spins = 30; });
  const idle = [];
  for (let i = 0; i < 6; i++) {
    idle.push(pngRead(await page.screenshot({ clip: { x: geo.box.x, y: geo.box.y, width: geo.box.w, height: geo.box.h } })));
    await page.waitForTimeout(60);
  }
  let idleBox = 0, idleBtn = 0;
  for (let i = 1; i < idle.length; i++) {
    const A = idle[i - 1], B = idle[i];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const inR = (y >= geo.rlt.y - geo.box.y && y <= geo.rlt.y - geo.box.y + geo.rlt.h &&
                   x >= geo.rlt.x - geo.box.x && x <= geo.rlt.x - geo.box.x + geo.rlt.w);
      if (inR) continue;
      const cb = inCorner(x, y, W, H, geo.rr), ct2 = !cb && inBtnCorner(x, y, geo);
      if (!cb && !ct2) continue;
      if (!dif(px(A, x, y), px(B, x, y))) continue;
      if (cb) idleBox++; else idleBtn++;
    }
  }
  console.log(`[7] 대조군(정지 중 6프레임) — 박스 모서리 ${idleBox} · 버튼 모서리 ${idleBtn} 화소`);

  await browser.close();
  console.log('PROBE544 DONE');
}
main().catch((e) => { console.error(e); process.exit(2); });
