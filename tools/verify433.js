#!/usr/bin/env node
/* 433 게이트 — 입장권 8장의 문양이 «몸통 안에 대칭으로» 앉아 있는가
 *
 *   node tools/verify433.js
 *
 * ⚑ 왜 자를 새로 세우나 — 412·430 이 얼려 둔 세 자(`verify402` B10·B11 · `verify430` C4·C5 ·
 *   `probe412` ④-b)는 전부 **`getBBox()` = 선언 bbox** 를 잰다. getBBox 는 **획을 안 센다.**
 *   문양은 `stroke-width 1.6` 이 사방으로 0.8 씩 번지므로 «그려진 잉크» 는 21 이 아니라 22.6 이고,
 *   보이는 속띠(23..47 · 24)의 슬랙은 1.31 밖에 없다. 그 좁은 슬랙 안에서 0.5 만 쏠려도
 *   아래 여유가 0.13 이 되어 어두운 장의 문양 외곽선이 검은 테에 **붙는다** — 430 까지의 세 자는
 *   그 상태를 전부 초록으로 통과시켰다(433 등재문의 «게이트가 못 봤다»).
 *   ⇒ 이 자는 «선언» 이 아니라 **문양을 뺀 사본과 원본을 같은 배율로 래스터해 차분한 픽셀**을 잰다.
 *      달라진 픽셀이 곧 그려진 잉크(획·라인조인·안티에일리어싱 포함)라, 잉크 색이 장마다 달라도
 *      (흰 잉크 5장 · 테색 잉크 3장) 색을 안 물어봐도 된다.
 *
 * 보는 것:
 *   [A] 몸통 — 보이는 밝은 속띠가 8장 같고 **23..47** 이다(검은 테 y45..49 의 안쪽 반을
 *              속띠 path 가 나중에 덮어 그린다 — 그래서 한가운데는 35 이지 34 도 35.5 도 아니다).
 *   [B] 자리 — 선언 중심 (32, 35) 이고 그 값이 [A] 의 한가운데와 같다 · 덩치 21×21 Δ0
 *              («자리» 로 푼 것이지 «덩치» 를 줄여 푼 게 아님을 못박는다).
 *   [C] 잉크 — 그려진 잉크의 **아래 여유 ≥ 0.5** · 흰 잉크 5장의 위·아래 대칭 |Δ| ≤ 0.5 ·
 *              검은 테 위에 그려진 잉크 **0px**.
 *   [R] 되돌림 시험 — **양쪽에서** 못박는다. 문양을 +0.5 되돌린 사본(= 430 까지의 자리, 중심 35.5)은
 *              아래 여유가 무너져 빨개지고, −0.5 더 올린 과교정 사본(중심 34.5)은 위 여유가 무너져
 *              빨개진다. 덩치는 두 사본 다 그대로 = 이 자가 보는 것이 «자리» 임의 증명.
 *
 * ⚠ 이 자가 **안 보는 것**: 그려진 잉크의 «덩치» 가 8장 고른가는 여기서 판정하지 않는다 —
 *    밝은 3장(gold·relic4·stone)은 획이 채움색이라 획이 잉크를 바깥에서 깎아 최대 24% 작다.
 *    그건 자리가 아니라 실루엣·획 색의 문제라 **별건 444** 로 등재했다(`probe433` ②-c 가 잰다).
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const KEYS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4', 'stone', 'rstone'];
const SC = 16;                     /* 64 → 1024 확대 래스터 */
const BAND = [23, 47];             /* 보이는 밝은 속띠 (430 껍데기 기하에서 나온다) */
const CY = 35;                     /* 문양 선언 중심 y = 속띠 한가운데 */
const MIN_GAP = 0.5;               /* 그려진 잉크가 검은 테에서 떨어져 있어야 하는 최소치 */
const MAX_ASYM = 0.5;              /* 흰 잉크 5장의 위·아래 여유 비대칭 상한 */

let pass = 0, fail = 0;
const ok = (c, msg, det) => { (c ? pass++ : fail++); console.log((c ? '  ok   ' : '  FAIL ') + msg + (det ? '  — ' + det : '')); };
const blk = (t) => console.log('\n' + t + '\n' + '-'.repeat(t.length));

/* 문양 path = 껍데기 2줄(테 있는 것 + 속띠) 다음의 모든 path — 껍데기 두 줄은 8장 픽셀 동일(412·430 규약) */
function splitPaths(svg) {
  const all = svg.match(/<path\b[^>]*\/>/g) || [];
  return { shell: all.slice(0, 2), motif: all.slice(2) };
}
/* dy 만큼 문양을 통째로 옮긴 사본 — 되돌림 시험은 이 손잡이 하나로 돈다(문자열 수술 없음) */
function variant(svg, dy) {
  const { motif } = splitPaths(svg);
  let out = svg;
  for (const m of motif) out = out.replace(m, '');
  if (dy === null) return out;                       /* 문양 없는 사본 */
  const g = '<g transform="translate(0,' + dy + ')">' + motif.join('') + '</g>';
  return out.replace('</svg>', g + '</svg>');
}

(async () => {
  const src = {};
  /* ⚑ 644(2026-09-01) — 이 자는 **아트의 «속» 기하**(문양 ↔ 속띠 ↔ 검은 테)를 잰다. 그 좌표는
     아트 자신의 단위(BAND 23..47 · CY 35 · MIN_W 21)이고, 아래 래스터가 `N = 64 * SC` 로 그리는 것은
     «viewBox 가 0 0 64 64 라서 1단위 = SC px» 이라는 전제 위에 서 있다.
     644 는 파일의 **캔버스만** 잉크 bbox 로 잘랐다(`viewBox="2 15 60 34"`) — path 는 한 자도 안 건드렸다.
     ⇒ 잴 때 좌표계를 원래대로 되돌리면 **옛 래스터가 비트 그대로 재현**되고 이 절의 상수는 전부 그대로다.
     이것이 «자를 무르게 푸는 것» 이 아닌 이유: 자르기 값 자체는 `tools/verify644.js` 가 따로 지킨다. */
  const VB644 = (s) => s.replace(/viewBox="[^"]*"/, 'viewBox="0 0 64 64"');
  for (const k of KEYS) src[k] = VB644(fs.readFileSync(path.join(ROOT, 'assets/ui/cur-ticket-' + k + '.svg'), 'utf8'));

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('about:blank');

  /* 한 배(dy)의 8장을 재서 돌려준다 — [C] 와 [R] 이 같은 자를 쓴다 */
  async function measure(dy) {
    const full = {}, bare = {};
    for (const k of KEYS) { full[k] = variant(src[k], dy); bare[k] = variant(src[k], null); }
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
        const col = Math.round(32 * SC);
        const fillC = at(B, col, Math.round(35 * SC));
        const near = (p, q) => Math.abs(p[0] - q[0]) < 12 && Math.abs(p[1] - q[1]) < 12 && Math.abs(p[2] - q[2]) < 12;
        let bt = -1, lightTop = -1, lightBot = -1;
        for (let y = 0; y < N; y++) { if (isBlack(at(B, col, y))) { bt = y; break; } }
        for (let y = bt; y < N; y++) { if (near(at(B, col, y), fillC)) { lightTop = y; break; } }
        for (let y = N - 1; y >= 0; y--) { if (near(at(B, col, y), fillC)) { lightBot = y; break; } }
        let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9, onBlack = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const i = (y * N + x) * 4;
          const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1])
                  + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]);
          if (d <= 24) continue;
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
          if (isBlack(at(B, x, y))) onBlack++;
        }
        const u = (v) => v / SC;
        out[k] = { lightTop: u(lightTop), lightBot: u(lightBot + 1),
                   inkY1: u(y1), inkY2: u(y2 + 1), inkX1: u(x1), inkX2: u(x2 + 1), onBlack };
      }
      return out;
    }, { full, bare, KEYS, SC });
  }

  const M0 = await measure(0);

  /* 선언 bbox — 덩치가 그대로임을 못박는 축 */
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

  /* [R] 되돌림 시험용 두 사본 */
  const Rold = await measure(0.5);    /* 430 까지의 자리(중심 35.5) */
  const Rover = await measure(-0.5);  /* 과교정(중심 34.5) */
  await browser.close();

  const gapT = (M, k) => M[k].inkY1 - M[k].lightTop;
  const gapB = (M, k) => M[k].lightBot - M[k].inkY2;

  /* ══════════ [A] 몸통 ══════════ */
  blk('[A] 몸통 — 보이는 밝은 속띠');
  const lt = KEYS.map((k) => M0[k].lightTop), lb = KEYS.map((k) => M0[k].lightBot);
  ok(Math.max(...lt) - Math.min(...lt) < 0.2 && Math.max(...lb) - Math.min(...lb) < 0.2,
     'A1 속띠가 8장 같다(껍데기 2줄 픽셀 동일 — 412·430 규약)',
     'top ' + Math.min(...lt).toFixed(2) + '~' + Math.max(...lt).toFixed(2) + ' · bot ' + Math.min(...lb).toFixed(2) + '~' + Math.max(...lb).toFixed(2));
  const LT = lt.reduce((a, b) => a + b, 0) / 8, LB = lb.reduce((a, b) => a + b, 0) / 8;
  ok(Math.abs(LT - BAND[0]) <= 0.15 && Math.abs(LB - BAND[1]) <= 0.15,
     'A2 속띠가 ' + BAND[0] + '..' + BAND[1] + ' 다(검은 테 안쪽 반을 속띠가 덮어 그린다)',
     LT.toFixed(2) + ' .. ' + LB.toFixed(2) + ' · 높이 ' + (LB - LT).toFixed(2));

  /* ══════════ [B] 자리 ══════════ */
  blk('[B] 자리 — 선언 중심과 덩치');
  const cyBad = KEYS.filter((k) => Math.abs(BOX[k].cy - CY) > 0.15 || Math.abs(BOX[k].cx - 32) > 0.15);
  ok(cyBad.length === 0, 'B1 문양 선언 중심이 8장 (32, ' + CY + ') 다',
     cyBad.length ? cyBad.map((k) => k + ' (' + BOX[k].cx + ',' + BOX[k].cy + ')').join(', ') : '8/8');
  ok(Math.abs((LT + LB) / 2 - CY) <= 0.15,
     'B2 그 값이 속띠 한가운데다 — 상수가 아니라 몸통에서 나온 값이다',
     '한가운데 ' + ((LT + LB) / 2).toFixed(2) + ' ↔ 선언 ' + CY);
  const ws = KEYS.map((k) => BOX[k].w), hs = KEYS.map((k) => BOX[k].h);
  /* 444(2026-08-30) 이관 — 이 항이 묻던 것은 «433 이 자리로 풀었지 크기를 **줄여** 풀지 않았다» 다.
     그 뜻은 그대로 두고 «21 딱 하나» 라는 **상수**만 뺐다. 444 가 밝은 3장(잉크=테색·획=채움색)의
     선언 덩치를 21 → 21.80 으로 **올렸기** 때문이다 — 그 장들은 가운데 정렬된 획이 제 잉크를 안쪽에서
     0.8 씩 깎아, 선언 21 로는 «그려진 잉크» 가 19.4 로 어두운 5장(22.6)보다 16% 작았다(411 눈금 1.240).
     ⇒ 판정은 **① 어느 장도 21 아래로 안 내려간다**(줄여 푼 수리는 여기서 즉시 빨개진다) ·
        **② 8장이 여전히 한 세트다**(최대÷최소 ≤ 1.05 — 402 B10·430 C4 와 같은 눈금).
     ⚠ «그려진 잉크» 의 덩치 판정 자체는 이 자가 아니라 **tools/verify444.js** 가 한다.
        이 자는 «자리» 자다 — 덩치 축을 자리 게이트에 묶으면 실루엣 결정이 자리 결정에 인질이 된다. */
  const MIN_W = 21, SET_R = 1.05;
  const shrunk = KEYS.filter((k) => BOX[k].w < MIN_W - 0.05 || BOX[k].h < MIN_W - 0.05);
  const rw433 = Math.max(...ws) / Math.min(...ws), rh433 = Math.max(...hs) / Math.min(...hs);
  ok(shrunk.length === 0 && rw433 <= SET_R && rh433 <= SET_R,
     'B3 덩치를 **줄여** 풀지 않았다(어느 장도 ' + MIN_W + ' 미만이 아니고 8장이 한 세트 ≤ ' + SET_R + ')',
     (shrunk.length ? '줄어든 장 ' + shrunk.join(',') + ' · ' : '')
     + Math.min(...ws).toFixed(2) + '~' + Math.max(...ws).toFixed(2) + ' × '
     + Math.min(...hs).toFixed(2) + '~' + Math.max(...hs).toFixed(2)
     + ' · 세트비 w ' + rw433.toFixed(3) + ' · h ' + rh433.toFixed(3));

  /* ══════════ [C] 그려진 잉크 ══════════ */
  blk('[C] 그려진 잉크(획 포함) — getBBox 가 못 보는 축');
  console.log('    ' + '장'.padEnd(8) + '잉크 y1..y2      위여유   아래여유   비대칭');
  for (const k of KEYS) {
    console.log('    ' + k.padEnd(8) + M0[k].inkY1.toFixed(2) + ' .. ' + M0[k].inkY2.toFixed(2)
                + '    ' + gapT(M0, k).toFixed(2) + '     ' + gapB(M0, k).toFixed(2)
                + '     ' + (gapT(M0, k) - gapB(M0, k)).toFixed(2));
  }
  const cBad = KEYS.filter((k) => gapB(M0, k) < MIN_GAP);
  ok(cBad.length === 0, 'C1 아래 여유 ≥ ' + MIN_GAP + ' — 문양 밑변이 검은 테에 안 붙는다',
     cBad.length ? cBad.map((k) => k + ' ' + gapB(M0, k).toFixed(2)).join(', ') : '8/8');
  const topBad = KEYS.filter((k) => gapT(M0, k) < MIN_GAP);
  ok(topBad.length === 0, 'C2 위 여유 ≥ ' + MIN_GAP + ' — 과교정으로 윗변을 밀지 않았다',
     topBad.length ? topBad.map((k) => k + ' ' + gapT(M0, k).toFixed(2)).join(', ') : '8/8');
  const WHITE = KEYS.filter((k) => /fill="#FFFFFF" opacity="\.92"/.test(src[k]));
  const asym = WHITE.map((k) => Math.abs(gapT(M0, k) - gapB(M0, k)));
  ok(WHITE.length === 5 && Math.max(...asym) <= MAX_ASYM,
     'C3 흰 잉크 5장의 위·아래 여유가 대칭이다(|Δ| ≤ ' + MAX_ASYM + ')',
     WHITE.length + '장 · 최대 ' + Math.max(...asym).toFixed(2));
  const onB = KEYS.filter((k) => M0[k].onBlack > 0);
  ok(onB.length === 0, 'C4 검은 테 위에 그려진 문양 픽셀 0',
     onB.length ? onB.map((k) => k + ' ' + M0[k].onBlack).join(', ') : '8/8');

  /* ══════════ [R] 되돌림 시험 ══════════ */
  blk('[R] 되돌림 시험 — 양쪽에서 못박는다(무르게 푼 수리가 아님)');
  const oldBad = KEYS.filter((k) => gapB(Rold, k) < MIN_GAP);
  ok(oldBad.length >= 5,
     'R1 옛 자리(중심 ' + (CY + 0.5) + ' · 430 까지)로 되돌리면 아래 여유가 무너진다 — 이 자가 빨개진다',
     oldBad.length + '장 · 최소 ' + Math.min(...KEYS.map((k) => gapB(Rold, k))).toFixed(2));
  const overBad = KEYS.filter((k) => gapT(Rover, k) < MIN_GAP);
  ok(overBad.length >= 5,
     'R2 과교정(중심 ' + (CY - 0.5) + ')하면 이번엔 위 여유가 무너진다 — 한쪽으로 더 밀 수도 없다',
     overBad.length + '장 · 최소 ' + Math.min(...KEYS.map((k) => gapT(Rover, k))).toFixed(2));
  /* 444(2026-08-30) 이관 — R1·R2 의 빨강이 «덩치» 가 아니라 «자리» 에서 온다는 confound 가드다.
     444 전에는 8장 전부에서 덩치가 그대로였다. 지금은 **밝은 3장에서만** 사본의 덩치가 0.7 남짓 는다.
     그건 문양이 커진 것이 아니라, 그 세 장의 획이 몸통색이라 몸통 «안» 에서는 안 보이던 것이
     ±0.5 밀리면서 **끝자락이 검은 테 위로 올라와 보이게 된 것**이다(444 가 선언 21 → 21.80 으로 키우면서
     획까지 포함해 찍히는 폭이 23.40 이 됐고 보이는 속띠는 23.94 뿐이다).
     ⇒ 두 축으로 갈랐다 — **R3** 은 confound 가드를 **R1·R2 의 빨강을 실제로 내는 표본**(흰 잉크 5장)에
     그대로 걸고, **R3b** 는 밝은 3장이 는 이유가 «몸통 밖으로 나간 것» 임을 검은 테 위 픽셀로 못박는다.
     한 항을 무르게 푼 것이 아니라 **한 항이 둘이 된 것**이다(R3b 가 없으면 «밝은 3장은 안 본다» 가 된다). */
  const sameSize = WHITE.every((k) =>
    Math.abs((Rold[k].inkY2 - Rold[k].inkY1) - (M0[k].inkY2 - M0[k].inkY1)) <= 0.1 &&
    Math.abs((Rover[k].inkY2 - Rover[k].inkY1) - (M0[k].inkY2 - M0[k].inkY1)) <= 0.1);
  ok(sameSize && WHITE.length === 5,
     'R3 두 사본의 잉크 «덩치» 는 그대로다 — 이 자가 보는 것은 덩치가 아니라 자리다(R1·R2 표본 = 흰 잉크 5장)',
     WHITE.length + '/5장');
  /* ⚠ «몸통 밖» 의 자는 **속띠 경계**다(검은 테가 아니다) — 위쪽은 속띠와 검은 테 사이에 테색 림이 4px
     끼어 있어(중앙 열 15 검은테 → 19 림 → 23 속띠) 위로 민 사본은 검은 테가 아니라 **림** 위로 올라간다.
     아래쪽만 속띠가 검은 테에 바로 닿아 있다(속띠 path 가 검은 테의 안쪽 반을 덮어 그린다). */
  const LIGHT = KEYS.filter((k) => !WHITE.includes(k));
  const outward = LIGHT.every((k) => gapB(M0, k) > 0 && gapT(M0, k) > 0
                                  && gapB(Rold, k) < 0 && gapT(Rover, k) < 0);
  ok(LIGHT.length === 3 && outward,
     'R3b 밝은 3장이 사본에서 는 것은 «문양이 커져서» 가 아니라 «몸통(속띠) 밖으로 나가서» 다',
     LIGHT.map((k) => k + ' 지금 ' + gapT(M0, k).toFixed(2) + '/' + gapB(M0, k).toFixed(2)
       + ' → 옛 아래 ' + gapB(Rold, k).toFixed(2) + ' · 과교정 위 ' + gapT(Rover, k).toFixed(2)).join(' · '));
  ok(Math.min(...KEYS.map((k) => gapB(M0, k))) > Math.min(...KEYS.map((k) => gapB(Rold, k))) + 0.3,
     'R4 수리가 실제로 아래 여유를 벌렸다',
     '옛 ' + Math.min(...KEYS.map((k) => gapB(Rold, k))).toFixed(2) + ' → 지금 ' + Math.min(...KEYS.map((k) => gapB(M0, k))).toFixed(2));

  console.log('\n' + (fail ? 'VERIFY433 ' + pass + '/' + (pass + fail) + ' — FAIL ' + fail
                           : 'VERIFY433 ' + pass + '/' + pass + ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
