#!/usr/bin/env node
/* 433 재현 — «입장권 8장의 문양이 몸통 안에서 아래로 치우쳐 밑변이 잘려 보인다» 를
 * **찍힌 픽셀**로 잰다.
 *
 *   node tools/probe433.js
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 확인한다.
 * 등재문은 캡처를 눈으로 확대해 «위 여백 8px / 아래 여백 5px» 를 냈다. 이 자는 그 숫자를
 * 믿지 않고 **8장을 실제로 그려서** 두 가지를 스스로 잰다.
 *
 * ⚑ 이 자의 본체는 «선언 bbox» 가 아니라 «그려진 잉크» 다(등재문이 신설을 요구한 축).
 *   `getBBox()` 는 **획을 안 센다** — 412·430 이 얼려 둔 21×21 · 중심 (32,35.5) 는 전부
 *   그 «선언» 값이라, `stroke-width 1.6` 이 사방으로 0.8 씩 번지는 것을 셋 다 못 본다.
 *   그래서 여기서는 **문양을 뺀 사본과 원본을 같은 배율로 래스터해 차분**한다 —
 *   달라진 픽셀이 곧 «그려진 잉크»(획·라인조인·안티에일리어싱 포함)이고, 잉크 색이
 *   장마다 달라도(흰 잉크 5장 · 테색 잉크 3장) 색을 안 물어봐도 된다.
 *
 * 재는 것:
 *   ① 몸통 띠 — 문양을 뺀 사본의 중앙 열에서 «검은 테 / 어두운 림 / 밝은 속띠» 경계를 읽는다.
 *      ⚠ 속띠는 위아래가 비대칭이다: 위는 림(어두운 띠)이 보이는데 아래는 속띠 밑단 2px 이
 *        검은 테 밑에 깔려 **안 보인다** — 그래서 «몸통 한가운데» 는 23..47 의 중심이 아니다.
 *   ② 문양 «그려진 잉크» bbox(차분) — 위·아래 여유와 그 비대칭
 *   ③ 검은 테 위에 그려진 잉크 픽셀 수 — «밑변이 테에 붙었다» 의 직접 증거
 *   ④ 실사용 크기(30·42·54px · DSF 2)에서 아래 여유가 실제 몇 «화면 픽셀» 인가
 *   ⑤ 선언 bbox(getBBox) — 412·430 이 얼려 둔 값과의 대조(수리 후 Δ0 이어야 한다)
 *
 * 수리 전 트리에서 돌리면 ②의 아래 여유가 **음수**, ③이 **8장 전부 >0** 으로 나온다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const KEYS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone'];
const SC = 16;                     /* 64 → 1024 확대 래스터(0.0625 단위까지 읽는다) */
const DISP = [30, 42, 54];         /* 실사용 크기(03 카드·04 세부·13 교환) · DSF 2 */

let pass = 0, fail = 0;
const ok = (c, msg, det) => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + msg + (det ? '  — ' + det : '')); };
const blk = (t) => console.log('\n' + t + '\n' + '-'.repeat(t.length));

/* 문양 path = 껍데기 2줄(테 있는 것 + 속띠) **다음**의 모든 path.
   껍데기 두 줄은 8장 픽셀 동일이라 문자열로 갈라도 안전하다(412·430 규약). */
function splitPaths(svg) {
  const all = svg.match(/<path\b[^>]*\/>/g) || [];
  return { shell: all.slice(0, 2), motif: all.slice(2) };
}
const stripMotif = (svg) => {
  const { motif } = splitPaths(svg);
  let out = svg;
  for (const m of motif) out = out.replace(m, '');
  return out;
};

(async () => {
  const src = {};
  for (const k of KEYS) src[k] = fs.readFileSync(path.join(ROOT, 'assets/ui/cur-ticket-' + k + '.svg'), 'utf8');
  const bare = {};
  for (const k of KEYS) bare[k] = stripMotif(src[k]);

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  const R = await page.evaluate(async ({ src, bare, KEYS, SC }) => {
    const draw = async (svg, px) => {
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const img = new Image(); img.width = px; img.height = px;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const c = document.createElement('canvas'); c.width = px; c.height = px;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.clearRect(0, 0, px, px); g.drawImage(img, 0, 0, px, px);
      return g.getImageData(0, 0, px, px).data;
    };
    const N = 64 * SC;
    const out = {};
    for (const k of KEYS) {
      const full = await draw(src[k], N);
      const nude = await draw(bare[k], N);

      /* ── ① 몸통 띠 — 문양 없는 사본의 중앙 열(x = 32) 을 위에서 아래로 읽는다 ── */
      const col = Math.round(32 * SC);
      const at = (buf, x, y) => { const i = (y * N + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
      const isBlack = (p) => p[3] > 200 && p[0] < 40 && p[1] < 40 && p[2] < 40;
      const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
      /* 속띠 색 = 몸통 정중앙 픽셀(문양이 없는 사본이라 항상 속띠다) */
      const fillC = at(nude, col, Math.round(35 * SC));
      const near = (p, q) => Math.abs(p[0] - q[0]) < 12 && Math.abs(p[1] - q[1]) < 12 && Math.abs(p[2] - q[2]) < 12;

      let blackTop = -1, blackBot = -1, lightTop = -1, lightBot = -1;
      for (let y = 0; y < N; y++) { if (isBlack(at(nude, col, y))) { blackTop = y; break; } }
      for (let y = N - 1; y >= 0; y--) { if (isBlack(at(nude, col, y))) { blackBot = y; break; } }
      for (let y = blackTop; y < N; y++) { if (near(at(nude, col, y), fillC)) { lightTop = y; break; } }
      for (let y = blackBot; y >= 0; y--) { if (near(at(nude, col, y), fillC)) { lightBot = y; break; } }
      /* 검은 테 «아래 띠» 의 윗 가장자리 = 밝은 속띠가 끝나는 곳 바로 아래 */
      let blackBotTop = -1;
      for (let y = lightBot; y < N; y++) { if (isBlack(at(nude, col, y))) { blackBotTop = y; break; } }

      /* ── ② 문양 «그려진 잉크» = 원본 ↔ 문양 없는 사본의 차분 ── */
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9, cnt = 0, onBlack = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          const d = Math.abs(full[i] - nude[i]) + Math.abs(full[i + 1] - nude[i + 1])
                  + Math.abs(full[i + 2] - nude[i + 2]) + Math.abs(full[i + 3] - nude[i + 3]);
          if (d <= 24) continue;         /* 안티에일리어싱 잔물결은 뺀다 */
          cnt++;
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
          if (isBlack(at(nude, x, y))) onBlack++;   /* 검은 테 위에 그려진 잉크 */
        }
      }
      const u = (v) => v / SC;         /* 래스터 px → viewBox 단위 */
      out[k] = {
        blackTop: u(blackTop), blackBotTop: u(blackBotTop), blackBot: u(blackBot),
        lightTop: u(lightTop), lightBot: u(lightBot),
        inkX1: u(x1), inkX2: u(x2 + 1), inkY1: u(y1), inkY2: u(y2 + 1),
        inkPx: cnt, onBlack, fillLum: lum(fillC),
      };
    }
    return out;
  }, { src, bare, KEYS, SC });

  /* ── ⑤ 선언 bbox(getBBox) — 412·430 이 얼려 둔 값 ── */
  const motifD = {};
  for (const k of KEYS) motifD[k] = splitPaths(src[k]).motif.map((p) => (p.match(/ d="([^"]+)"/) || [])[1]).filter(Boolean);
  const BOX = await page.evaluate((mo) => {
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
  }, motifD);

  await browser.close();

  const f2 = (v) => (v >= 0 ? ' ' : '') + v.toFixed(2);

  blk('① 몸통 띠 — 문양을 뺀 사본의 중앙 열(x=32) · viewBox 단위');
  console.log('    ' + '장'.padEnd(8) + '검은테 위  밝은속띠      검은테 아래(윗가장자리)');
  for (const k of KEYS) {
    const r = R[k];
    console.log('    ' + k.padEnd(8) + f2(r.blackTop) + '      ' + f2(r.lightTop) + ' .. ' + f2(r.lightBot) + '        ' + f2(r.blackBotTop));
  }
  const lt = KEYS.map((k) => R[k].lightTop), lb = KEYS.map((k) => R[k].lightBot);
  ok(Math.max(...lt) - Math.min(...lt) < 0.2 && Math.max(...lb) - Math.min(...lb) < 0.2,
     '①-a 몸통 띠가 8장 같다(껍데기 2줄 픽셀 동일 — 412·430 규약)',
     'top ' + Math.min(...lt).toFixed(2) + '~' + Math.max(...lt).toFixed(2) + ' · bot ' + Math.min(...lb).toFixed(2) + '~' + Math.max(...lb).toFixed(2));
  const LT = lt.reduce((a, b) => a + b, 0) / 8, LB = lb.reduce((a, b) => a + b, 0) / 8;
  console.log('    ⇒ 보이는 밝은 속띠 = ' + LT.toFixed(2) + ' .. ' + LB.toFixed(2)
              + ' (높이 ' + (LB - LT).toFixed(2) + ' · 한가운데 y = ' + ((LT + LB) / 2).toFixed(2) + ')');
  /* ⚑ 속띠는 23..47 이다 — 검은 테(y 45..49)의 «안쪽 반» 을 속띠 path 가 나중에 덮어 그린다.
     그래서 몸통 한가운데는 «껍데기 17..47 의 한가운데» 도 «검은 테 안쪽 19..45 의 한가운데» 도 아니다. */
  const MID = (LT + LB) / 2;
  const cyNow = BOX[KEYS[0]].cy;
  ok(Math.abs(MID - cyNow) <= 0.15,
     '①-b 문양 «선언 중심» 이 속띠 한가운데다(±0.15)',
     '속띠 한가운데 ' + MID.toFixed(2) + ' ↔ 선언 ' + cyNow.toFixed(2) + ' · Δ ' + (MID - cyNow).toFixed(2));

  blk('② 문양 «그려진 잉크»(차분 · 획·라인조인 포함) 와 속띠 여유');
  console.log('    ' + '장'.padEnd(8) + '잉크 y1..y2     위여유    아래여유   비대칭   높이');
  const gapT = {}, gapB = {};
  for (const k of KEYS) {
    const r = R[k];
    gapT[k] = r.inkY1 - LT; gapB[k] = LB - r.inkY2;
    console.log('    ' + k.padEnd(8) + f2(r.inkY1) + ' .. ' + f2(r.inkY2) + '   ' + f2(gapT[k]) + '    ' + f2(gapB[k])
                + '    ' + f2(gapT[k] - gapB[k]) + '   ' + (r.inkY2 - r.inkY1).toFixed(2));
  }
  const badBot = KEYS.filter((k) => gapB[k] < 0.5);
  ok(badBot.length === 0, '②-a 8장 전부 그려진 잉크의 «아래 여유» 가 0.5 이상이다(밑변이 검은 테에 안 붙는다)',
     badBot.length ? badBot.map((k) => k + ' ' + gapB[k].toFixed(2)).join(', ') : '8/8');
  /* 대칭은 **흰 잉크 5장**만 묻는다 — 밝은 3장(gold·relic4·stone)은 잉크가 테색이고 획이 채움색이라
     획이 잉크를 «바깥에서 깎는다»(그려진 잉크가 선언 박스보다 작다). 그건 자리가 아니라 실루엣·획 색의
     결과라 이 작업의 축이 아니다 — 아래 ②-c 로 재기만 하고 별건(444)으로 등재했다. */
  const WHITE = KEYS.filter((k) => /fill="#FFFFFF" opacity="\.92"/.test(src[k]));
  const asym = WHITE.map((k) => Math.abs(gapT[k] - gapB[k]));
  ok(WHITE.length === 5 && Math.max(...asym) <= 0.5,
     '②-b 흰 잉크 5장의 위·아래 여유가 대칭이다(|Δ| ≤ 0.5)',
     WHITE.length + '장 · 최대 ' + Math.max(...asym).toFixed(2) + ' (' + WHITE[asym.indexOf(Math.max(...asym))] + ')');
  const hs = KEYS.map((k) => R[k].inkY2 - R[k].inkY1), ws = KEYS.map((k) => R[k].inkX2 - R[k].inkX1);
  console.log('    ②-c 관측(판정 안 함 · 444 등재) — 그려진 잉크 덩치 최대÷최소  h '
              + (Math.max(...hs) / Math.min(...hs)).toFixed(3) + ' · w ' + (Math.max(...ws) / Math.min(...ws)).toFixed(3)
              + '   [흰 잉크 5장끼리는 h '
              + (Math.max(...WHITE.map((k) => R[k].inkY2 - R[k].inkY1)) / Math.min(...WHITE.map((k) => R[k].inkY2 - R[k].inkY1))).toFixed(3) + ']');

  blk('③ 검은 테 위에 그려진 잉크 픽셀 — «밑변이 테에 붙었다» 의 직접 증거');
  for (const k of KEYS) console.log('    ' + k.padEnd(8) + String(R[k].onBlack).padStart(7) + ' px / 잉크 ' + R[k].inkPx + ' px');
  const onB = KEYS.filter((k) => R[k].onBlack > 0);
  ok(onB.length === 0, '③ 어느 장도 검은 테 위에 문양을 그리지 않는다',
     onB.length ? onB.map((k) => k + ' ' + R[k].onBlack).join(', ') : '8/8');

  blk('④ 실사용 크기에서 «아래 여유» 가 몇 화면 픽셀인가 (DSF 2 → 물리 픽셀)');
  for (const px of DISP) {
    const s = px / 64;
    const g = KEYS.map((k) => gapB[k] * s * 2);
    console.log('    ' + String(px).padStart(3) + 'px 상자 · DSF2 → 아래 여유 '
                + Math.min(...g).toFixed(2) + ' ~ ' + Math.max(...g).toFixed(2) + ' 물리픽셀');
  }
  const worst = Math.min(...DISP.map((px) => Math.min(...KEYS.map((k) => gapB[k] * (px / 64) * 2))));
  console.log('    ④ 관측(판정 안 함) — 최악 ' + worst.toFixed(2) + ' 물리픽셀. ⚠ 속띠 슬랙이 구조적으로 1.31 뿐이라'
            + '\n       (선언 21 + 획 1.6 = 22.6 이 24 짜리 띠에 들어간다) 대칭으로 놓아도 한쪽 여유는 0.65 를 못 넘는다.');

  blk('⑤ 선언 bbox(getBBox) — 412·430 이 얼려 둔 축 (수리 후 Δ0 이어야 한다)');
  for (const k of KEYS) {
    const b = BOX[k];
    console.log('    ' + k.padEnd(8) + b.w.toFixed(2) + ' × ' + b.h.toFixed(2) + '  중심 (' + b.cx.toFixed(2) + ', ' + b.cy.toFixed(2) + ')');
  }
  const bw = KEYS.map((k) => BOX[k].w), bh = KEYS.map((k) => BOX[k].h);
  ok(Math.max(...bw) / Math.min(...bw) <= 1.05 && Math.max(...bh) / Math.min(...bh) <= 1.05,
     '⑤-a 선언 bbox 덩치 Δ0 (21×21 한 세트 — 412 B10)',
     'w ' + Math.max(...bw).toFixed(2) + '/' + Math.min(...bw).toFixed(2) + ' · h ' + Math.max(...bh).toFixed(2) + '/' + Math.min(...bh).toFixed(2));
  const cys = KEYS.map((k) => BOX[k].cy);
  ok(Math.max(...cys) - Math.min(...cys) <= 0.2, '⑤-b 선언 중심 y 가 8장 같다',
     Math.min(...cys).toFixed(2) + ' ~ ' + Math.max(...cys).toFixed(2));

  console.log('\n' + (fail ? 'PROBE433 ' + pass + '/' + (pass + fail) + ' — FAIL ' + fail
                           : 'PROBE433 ' + pass + '/' + pass + ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
