#!/usr/bin/env node
/* 444 게이트 — 입장권 8장의 «그려진 잉크» 덩치가 한 세트인가
 *
 *   node tools/verify444.js
 *
 * ⚑ 이 자가 보는 축은 **덩치**다. «자리»(문양이 몸통 안에 대칭으로 앉는가)는 tools/verify433.js 가 본다.
 *   433 이 그 둘을 일부러 갈라 뒀다 — 덩치 축을 자리 게이트에 묶으면 실루엣 결정이 자리 결정에 인질이 된다.
 *
 * 무엇이 결손이었나(444 등재문 · sess-0716-12092 워커 A 가 probe433 ②-c 로 관측):
 *   밝은 3장(노랑 gold · 흰색 relic4 · 주황 stone)은 430 이 «대비가 큰 쪽» 규칙으로 잉크를 **테색**으로,
 *   획을 **채움색**으로 뒤집은 장들이다. 가운데 정렬된 획 1.6 은 사방으로 0.8 씩 번지는데
 *     · 어두운 5장 — 획이 테색이라 몸통 위에서 **보인다** ⇒ 그려진 잉크 = 21 + 1.6 = **22.6**
 *     · 밝은 3장 — 획이 몸통과 **같은 색**이라 바깥 0.8 은 안 보이고, 안쪽 0.8 은 제 잉크를 **깎는다**
 *                  ⇒ 그려진 잉크 = 21 − 1.6 = **19.4**(창세 왕관은 뾰족한 꼭짓점이 통째로 먹혀 18.25)
 *   같은 규격이 방향만 반대라 세로 덩치 최대÷최소가 **1.240** — 411 이 세운 «≤ 1.05» 눈금을 크게 넘었다.
 *
 * 처방(444): 획을 없애거나 얇게 하지 않는다(획 규격 1.6 은 402 B9 가 8장 공용으로 못박은 축이다).
 *   ① **`paint-order="stroke fill"`** — 획을 채움 **밑에** 깔아 «안쪽으로 깎던 것» 을 «바깥으로 두르는 것» 으로
 *      바꾼다. 획의 몫(어두운 잉크 ↔ 어두운 테 분리)은 그대로 두고 잉크만 되찾는다.
 *   ② 남는 3.8% 는 **선언 21 → 21.80 등방 확대**(중심 (32,35))로 두 자가 반씩 나눠 가진다 —
 *      선언 덩치비 21.80/21 = 1.038 · 그려진 잉크비 22.63/21.80 = 1.038, 둘 다 1.05 안.
 *   ⚠ **더 키울 수는 없다** — [R3] 이 그것을 못박는다.
 *
 * 자의 원리는 probe433 과 같다: **문양을 뺀 사본과 원본을 같은 배율로 래스터해 차분**한다.
 *   달라진 픽셀이 곧 «그려진 잉크»(획·라인조인·안티에일리어싱 포함)라, getBBox 가 못 보는 획을 센다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const KEYS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone'];
const SC = 16;                /* 64 → 1024 확대 래스터(0.0625 단위까지 읽는다) */
const SET_R = 1.05;           /* 411 눈금 — 덩치 최대÷최소 */
const BAND = [23, 47];        /* 보이는 밝은 속띠(430 껍데기 기하) */
const MIN_GAP = 0.5;          /* 그려진 잉크가 속띠 끝에서 떨어져 있어야 하는 최소치(433 과 같은 값) */

let pass = 0, fail = 0;
const ok = (c, msg, det) => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + msg + (det ? '  — ' + det : '')); };
const blk = (t) => console.log('\n' + t + '\n' + '-'.repeat(t.length));

/* 문양 path = 껍데기 2줄(테 있는 것 + 속띠) 다음의 모든 path — 껍데기 두 줄은 8장 픽셀 동일(412·430 규약) */
function splitPaths(svg) {
  const all = svg.match(/<path\b[^>]*\/>/g) || [];
  return { shell: all.slice(0, 2), motif: all.slice(2) };
}
/* 사본 손잡이 — 문자열 수술은 여기 한 곳뿐이다.
     mode 'bare'  : 문양 없는 사본(차분의 바닥)
     mode 'plain' : paint-order 를 뗀 사본  = 444 ① 을 되돌린 것
     mode 'scale' : 문양을 중심 (32,35) 기준 s 배 한 사본 = 444 ② 를 되돌리거나(21/21.8) 더 민 것
   ⚠ 'scale' 은 <g transform> 이라 **획 두께도 같이 배율을 먹는다**. 판정은 그래도 성립한다 —
     paint-order 가 걸린 밝은 3장의 그려진 잉크는 «채움 그대로» 라 획 두께와 무관하고([R2]),
     [R3] 은 획이 두꺼워질수록 더 빨개지는 쪽이라 무르게 푸는 방향이 아니다. */
function variant(svg, mode, s) {
  const { motif } = splitPaths(svg);
  let out = svg;
  for (const m of motif) out = out.replace(m, '');
  if (mode === 'bare') return out;
  let body = motif.join('');
  if (mode === 'plain') body = body.replace(/ paint-order="stroke fill"/g, '');
  if (mode === 'scale') body = '<g transform="translate(32,35) scale(' + s + ') translate(-32,-35)">' + body + '</g>';
  return out.replace('</svg>', body + '</svg>');
}

(async () => {
  const src = {};
  for (const k of KEYS) src[k] = fs.readFileSync(path.join(ROOT, 'assets/ui/cur-ticket-' + k + '.svg'), 'utf8');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  /* 한 판본의 8장을 재서 돌려준다 — 본체와 [R] 이 같은 자를 쓴다 */
  async function measure(mode, s, only) {
    const full = {}, bare = {};
    /* only 가 있으면 그 장에만 손을 댄다 — «밝은 3장만 21 로 되돌린 사본» 처럼 한쪽만 미는 사본이 필요하다
       (8장을 같은 배율로 줄이면 비율이 그대로라 아무것도 안 묻는 사본이 된다). */
    for (const k of KEYS) {
      full[k] = (!only || only.includes(k)) ? variant(src[k], mode, s) : variant(src[k], 'now');
      bare[k] = variant(src[k], 'bare');
    }
    return page.evaluate(async ({ full, bare, KEYS, SC }) => {
      const draw = async (svg, px) => {
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        const img = new Image(); img.width = px; img.height = px;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const c = document.createElement('canvas'); c.width = px; c.height = px;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.clearRect(0, 0, px, px); g.drawImage(img, 0, 0, px, px);
        return g.getImageData(0, 0, px, px).data;
      };
      const N = 64 * SC, out = {};
      for (const k of KEYS) {
        const A = await draw(full[k], N), B = await draw(bare[k], N);
        const at = (buf, x, y) => { const i = (y * N + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
        const isBlack = (p) => p[3] > 200 && p[0] < 40 && p[1] < 40 && p[2] < 40;
        let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9, onBlack = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1])
                  + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]);
          if (d <= 24) continue;                 /* 안티에일리어싱 잔물결은 뺀다 */
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
          if (isBlack(at(B, x, y))) onBlack++;   /* 검은 테 위에 그려진 잉크 */
        }
        const u = (v) => v / SC;
        out[k] = { x1: u(x1), x2: u(x2 + 1), y1: u(y1), y2: u(y2 + 1), onBlack };
      }
      return out;
    }, { full, bare, KEYS, SC });
  }

  /* 선언 bbox(getBBox) — 획을 안 세는 축. «확대» 가 실제로 선언에 들어갔는지 보는 데만 쓴다. */
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
      out[k] = { w: x2 - x1, h: y2 - y1, y1, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
    }
    svg.remove();
    return out;
  }, motifD);

  /* 잉크가 «테색» 인 장 = 획이 채움색인 장 = 444 가 손댄 장 */
  const LIGHT = KEYS.filter((k) => !/fill="#FFFFFF" opacity="\.92"/.test(src[k]));
  const WHITE = KEYS.filter((k) => /fill="#FFFFFF" opacity="\.92"/.test(src[k]));

  const M0 = await measure('now');
  const Rplain = await measure('plain');                        /* ① 되돌림 — paint-order 를 뗀다 */
  const Rsmall = await measure('scale', 21 / 21.8, LIGHT);      /* ② 되돌림 — **밝은 3장만** 선언 21 로 되돌린다 */
  const Rbig = await measure('scale', 22.6 / 21.8, LIGHT);      /* 더 키운 사본 — «22.6 까지 키우면?» 을 기각한다 */
  await browser.close();

  const H = (M, k) => M[k].y2 - M[k].y1;
  const W = (M, k) => M[k].x2 - M[k].x1;
  const ratio = (M, f) => Math.max(...KEYS.map((k) => f(M, k))) / Math.min(...KEYS.map((k) => f(M, k)));

  /* ══════════ [A] 규격 — 획을 어디에 까는가 ══════════ */
  blk('[A] 규격 — 밝은 3장만 획을 채움 밑에 깐다(paint-order)');
  ok(LIGHT.length === 3 && WHITE.length === 5,
     'A1 잉크 색으로 갈리는 두 무리가 3 ↔ 5 다(430 «대비가 큰 쪽» 이 만든 축)',
     '테색 잉크 ' + LIGHT.join(',') + ' ↔ 흰 잉크 ' + WHITE.length + '장');
  const poBad = LIGHT.filter((k) => !/ paint-order="stroke fill"/.test(src[k]));
  ok(poBad.length === 0,
     'A2 테색 잉크 3장의 문양에 paint-order="stroke fill" 이 있다 — 획이 제 잉크를 안쪽에서 깎지 않는다',
     poBad.length ? poBad.join(',') : '3/3');
  /* 어두운 5장은 획이 테색이라 몸통 위에서 보이는 잉크다 — 채움 밑에 깔면 그 획이 절반 사라진다.
     즉 paint-order 는 «8장 공용 규격» 이 아니라 **잉크 색이 뒤집힌 장에만 붙는 짝** 이다. */
  const poWhite = WHITE.filter((k) => / paint-order=/.test(src[k]));
  ok(poWhite.length === 0,
     'A3 흰 잉크 5장에는 안 붙였다 — 그 장들의 획은 «보이는 외곽선» 이라 채움 밑에 깔면 반이 사라진다',
     poWhite.length ? poWhite.join(',') : '5/5');
  const swBad = KEYS.filter((k) => !/stroke-width="1\.6"/.test(src[k]));
  ok(swBad.length === 0,
     'A4 획 두께는 8장 공용 1.6 그대로다 — 덩치를 «획을 깎아» 풀지 않았다(402 B9 축)',
     swBad.length ? swBad.join(',') : '8/8');

  /* ══════════ [B] 그려진 잉크 덩치 — 411 눈금 ══════════ */
  blk('[B] 그려진 잉크 덩치(획·라인조인 포함) — 411 «최대÷최소 ≤ ' + SET_R + '»');
  console.log('    ' + '장'.padEnd(8) + '잉크 y1..y2      세로     가로     선언');
  for (const k of KEYS) {
    console.log('    ' + k.padEnd(8) + M0[k].y1.toFixed(2) + ' .. ' + M0[k].y2.toFixed(2)
                + '   ' + H(M0, k).toFixed(2) + '   ' + W(M0, k).toFixed(2)
                + '   ' + BOX[k].h.toFixed(2));
  }
  const rh = ratio(M0, H), rw = ratio(M0, W);
  ok(rh <= SET_R && rw <= SET_R,
     'B1 8장의 그려진 잉크가 한 세트다(최대÷최소 ≤ ' + SET_R + ')',
     'h ' + rh.toFixed(3) + ' · w ' + rw.toFixed(3) + ' (등재 당시 h 1.240 · w 1.175)');
  const grpR = (g, f) => Math.max(...g.map((k) => f(M0, k))) / Math.min(...g.map((k) => f(M0, k)));
  ok(grpR(WHITE, H) <= 1.01 && grpR(LIGHT, H) <= 1.01,
     'B2 무리 안에서는 사실상 똑같다(각 무리 ≤ 1.01) — 남은 차이는 «획이 보이나 안 보이나» 하나뿐이다',
     '흰 ' + grpR(WHITE, H).toFixed(3) + ' · 테색 ' + grpR(LIGHT, H).toFixed(3));
  /* 선언도 같이 확인한다 — 402 B10·430 C4·433 B3 이 쓰는 축이라 여기서 넘으면 저기도 빨개진다 */
  const dh = Math.max(...KEYS.map((k) => BOX[k].h)) / Math.min(...KEYS.map((k) => BOX[k].h));
  ok(dh <= SET_R,
     'B3 선언 bbox 도 여전히 한 세트다(≤ ' + SET_R + ') — 확대분이 저쪽 자들을 깨지 않았다',
     dh.toFixed(3) + ' (21.80 / 21.00)');

  /* ══════════ [C] 몸통 — 키운 값이 속띠를 안 밟는다 ══════════ */
  blk('[C] 몸통 — 확대가 «자리» 를 밟지 않았다(433 축의 자기 확인)');
  const gapT = (M, k) => M[k].y1 - BAND[0], gapB = (M, k) => 46.94 - M[k].y2;
  const gBad = KEYS.filter((k) => gapT(M0, k) < MIN_GAP || gapB(M0, k) < MIN_GAP);
  ok(gBad.length === 0, 'C1 8장 전부 위·아래 여유 ≥ ' + MIN_GAP,
     gBad.length ? gBad.map((k) => k + ' ' + gapT(M0, k).toFixed(2) + '/' + gapB(M0, k).toFixed(2)).join(', ')
                 : '최소 ' + Math.min(...KEYS.map((k) => Math.min(gapT(M0, k), gapB(M0, k)))).toFixed(2));
  const obBad = KEYS.filter((k) => M0[k].onBlack > 0);
  ok(obBad.length === 0, 'C2 검은 테 위에 그려진 문양 픽셀 0 — 획까지 포함해 속띠 안이다',
     obBad.length ? obBad.map((k) => k + ' ' + M0[k].onBlack).join(', ') : '8/8');
  /* ⚑ 실루엣 회수 — paint-order 전에는 뾰족한 꼭짓점이 획에 통째로 먹혔다(창세 왕관 윗변 선언 24.5 ↔ 잉크 26.5).
     지금은 채움이 위에 있으니 «그려진 잉크 윗변» 이 «선언 윗변» 과 붙어야 한다. */
  const tipBad = LIGHT.filter((k) => Math.abs(M0[k].y1 - BOX[k].y1) > 0.15);
  ok(tipBad.length === 0,
     'C3 테색 잉크 3장은 «그려진 잉크 윗변» 이 «선언 윗변» 과 같다 — 꼭짓점이 획에 안 먹힌다(왕관·칠각 «뭉툭함»)',
     LIGHT.map((k) => k + ' ' + M0[k].y1.toFixed(2) + '↔' + BOX[k].y1.toFixed(2)).join(' · '));

  /* ══════════ [R] 되돌림 시험 — 무르게 푼 수리가 아님을 세 방향에서 못박는다 ══════════ */
  blk('[R] 되돌림 시험 — 세 방향(①을 되돌림 · ②를 되돌림 · 더 키움)');
  const rhPlain = ratio(Rplain, H);
  ok(rhPlain > SET_R,
     'R1 paint-order 를 떼면(444 ① 되돌림) 획이 도로 잉크를 깎아 이 자가 빨개진다',
     'h ' + rhPlain.toFixed(3) + ' > ' + SET_R + ' · 테색 3장 '
     + LIGHT.map((k) => H(Rplain, k).toFixed(2)).join('/') + ' ↔ 흰 ' + H(Rplain, WHITE[0]).toFixed(2));
  const rhSmall = ratio(Rsmall, H);
  ok(rhSmall > SET_R,
     'R2 확대를 되돌리면(선언 21.80 → 21 · 444 ② 되돌림) 3.8% 가 살아나 이 자가 빨개진다',
     'h ' + rhSmall.toFixed(3) + ' > ' + SET_R);
  const bigOn = KEYS.filter((k) => Rbig[k].onBlack > 0);
  ok(bigOn.length > 0,
     'R3 «22.6 까지 키우면 되지 않나» 는 기각된다 — 획이 검은 테를 밟는다(그래서 21.80 이 상한이다)',
     bigOn.length ? bigOn.map((k) => k + ' ' + Rbig[k].onBlack + 'px').join(', ') : '0장');

  console.log('\n' + (fail ? 'VERIFY444 ' + pass + '/' + (pass + fail) + ' — FAIL ' + fail
                           : 'VERIFY444 ' + pass + '/' + pass + ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
