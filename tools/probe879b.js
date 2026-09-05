#!/usr/bin/env node
/* 작업 879 9회차 — «1600 의 아래 예약(계단·받침 40·접합선 13)이 아치 위 clearance 의 재원인가» 재현기
 *
 *   node tools/probe879b.js          # [1] 예산 · [2] 아래 예약 스윕 · [3] 94 의 벽
 *   node tools/probe879b.js --json   # 원자료
 *
 * ── 왜 이 자인가(338 규칙) ───────────────────────────────────────────────────
 * 8회차 §55 가 9회차의 선택지를 둘로 좁히며 이렇게 적었다:
 *   «926 을 879 안에서 사려면 살 길은 `--rw-gs`/받침 40(`--rw-gd`)/접합선 13 쪽의 재원이지
 *    av 가 아니다 — **먼저 그 셋을 자로 재라**.»
 * 이 자가 그 «먼저» 다. 셋은 전부 `--rw-gt` 의 셋째 인자 안 **아래 예약 139**
 * (= 받침 40 + 접합선 13 + 계단 84 + 2)와 `--rw-sh` 안의 그리기 오프셋이다.
 * 물어야 할 것은 «그 셋이 작아지면 아치 위가 커지는가» 하나이고, 답은 **제품에 넣어서** 잰다.
 *
 *   [1] 예산 — 다섯 프레임의 재료와 네 띠. **gt 의 세 인자 중 누가 이기는지**를 같이 찍는다.
 *   [2] 아래 예약 스윕 — 139 → 129/119/89 · 받침 40 → 0 을 실제로 넣고 네 띠를 다시 잰다.
 *       ⚑ 1600 에서 Δ0 이면 «셋은 재원이 아니다» 가 관측으로 닫힌다(§55 ⓐ 의 답).
 *   [3] 94 의 벽 — clearance 를 사는 유일한 손잡이(gt 첫째 인자 94)를 d 씩 올려
 *       `verify879` [2b] 의 폭이 어디서 0.05 를 넘는지 잰다. §52 는 «+18 이면 0.140» 만 적었고
 *       **한계 d 는 안 적혀 있다** — 그 값이 곧 «879 안에서 926 에 줄 수 있는 전부» 다.
 *
 * ⚠ 스윕의 CSS 사본은 **현행 식**(av 의 182 · gt 의 94/139 · lt 의 74)이다.
 *   probe879 의 `knobCSS` 는 7회차 이전 사본(av 174)이라 이 자에서 다시 쓰지 않는다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const JSONOUT = process.argv.includes('--json');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const REF = 2280;                     /* 잔존율의 분모 — verify879 와 같은 프레임 */

/* ── 페이지 안에서 도는 자 ───────────────────────────────────────────────────
   식을 옮겨 적지 않고 **그려진 상자**에서 되잰다(813 [2] 규약). 커스텀 속성은 토큰으로
   돌아오므로(probe879 1회차 함정) 패널 직속 «자 막대» 의 높이로 되푼다. */
const MEASURE = `(() => {
  const q = (s) => document.querySelector(s);
  const panel = q('#relw .rw-bowl') || q('#relw .rw-panel');
  const pr = panel.getBoundingClientRect();
  const r1 = (v) => Math.round(v * 100) / 100;
  const rel = (r) => ({ t: r1(r.top - pr.top), b: r1(r.bottom - pr.top), h: r1(r.height) });
  const box = (s) => { const e = q(s); return e ? rel(e.getBoundingClientRect()) : null; };
  const ruler = document.createElement('div');
  ruler.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px';
  panel.appendChild(ruler);
  const num = (expr) => { ruler.style.height = expr;
    return ruler.getBoundingClientRect().height; };
  const v = (n) => num('var(' + n + ')');
  const rwc = num('calc(100px * var(--rwc,1))') / 100;
  const av = v('--rw-av'), gt = v('--rw-gt'), lt = v('--rw-lt'), tt = v('--rw-tt'),
        fl = v('--rw-fl'), bt = v('--rw-bt'), sh = v('--rw-sh'), gd = v('--rw-gd'),
        gs = v('--rw-gs'), ah = v('--rw-ah'), gof = v('--rw-gof');
  ruler.remove();
  const grid = box('#relw .rw-grid'), lint = box('#relw .rw-lintel'),
        mul = box('#rwMulBar'), mid = box('#relw .rw-mid'), floor = box('#relw .rw-floor');
  /* 아치는 의사요소(.rw-bg::after)라 상자를 못 잡는다 — 같은 식을 문 클론으로 되잰다. */
  const bg = q('#relw .rw-bg');
  const ap = document.createElement('div');
  ap.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);width:589px;'
    + 'top:calc(var(--rw-gt) - var(--rw-av));height:var(--rw-ah)';
  bg.appendChild(ap);
  const ar = ap.getBoundingClientRect();
  const apexT = r1(ar.top - pr.top);
  ap.remove();
  return {
    rwc: r1(rwc), av: r1(av), gt: r1(gt), lt: r1(lt), tt: r1(tt), fl: r1(fl), bt: r1(bt),
    sh: r1(sh), gd: r1(gd), gs: r1(gs), ah: r1(ah), gof: r1(gof),
    steps: r1(sh - gs),                                  /* 계단 구간(0 이면 계단 없음) */
    apexT, lintB: lint && lint.b, gridT: grid && grid.t, gridB: grid && grid.b,
    mulT: mul && mul.t, mulB: mul && mul.b, midT: mid && mid.t, floorT: floor && floor.t,
    /* ── 네 띠(verify879 [2b]·[2b2] 와 같은 끝점) ── */
    b1: apexT,                                           /* 띠1 패널 상단 ↓ 아치 정점 (= 94×rwc) */
    clr: lint ? r1(apexT - lint.b) : null,               /*   그 안: 상인방 하변 ↓ 아치 정점 */
    b2: grid ? r1(grid.t - apexT) : null,                /* 띠2 아치 정점 ↓ 격자 상변 */
    b3: (grid && mul) ? r1(mul.t - grid.b) : null,       /* 띠3 격자 하변 ↓ 바 상변 (상자) */
    b4: (mid && mul) ? r1(mid.t - mul.b) : null,         /* 띠4 바 하변 ↓ 수반 구획 상변 */
    /* gt 세 인자 — 누가 이기는가 */
    argFloor: r1(av + 94 * rwc), argMin: r1(110 * rwc),
    argA: r1(tt * 0.48), argB: r1(tt - av - 139 * rwc),
  };
})()`;

/* ── 스윕 CSS — 현행 식의 사본에 CL(94) · RES(139) · GD(40) 만 갈아 끼운다 ─────── */
function knobCSS({ CL, RES, GD }) {
  const cl = CL == null ? 94 : CL, res = RES == null ? 139 : RES;
  const out = [`#relw .rw-bowl,#relw .rw-panel{
    --rw-av:min(calc(186px * var(--rwc,1)),calc((var(--rw-tt) - 182px * var(--rwc,1)) / 2),
                calc(var(--rw-tt) - 285px * var(--rwc,1)));
    --rw-gt:max(calc(var(--rw-av) + ${cl}px * var(--rwc,1)),
                calc(110px * var(--rwc,1)),
                min(calc(var(--rw-tt) * .48),
                    calc(var(--rw-tt) - var(--rw-av) - ${res}px * var(--rwc,1))));
    --rw-lt:clamp(calc(20px * var(--rwc,1)),calc(var(--rw-gt) - 294px * var(--rwc,1)),
                  calc(var(--rw-gt) - var(--rw-av) - ${cl - 20}px * var(--rwc,1)));}`];
  if (GD != null)
    out.push(`#relw .rw-bowl,#relw .rw-panel{
      --rw-gd:min(calc(${GD}px * var(--rwc,1)),max(0px,calc(var(--rw-sh) - 14px)))}`);
  return out.join('\n');
}

async function measure(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(200);
  const o = await page.evaluate(M => eval(M), MEASURE);
  await ctx.close();
  return o;
}

const pad = (s, n) => String(s).padEnd(n);
const f2 = (v) => (v == null ? '—' : v.toFixed(2));
const f3 = (v) => (v == null ? '—' : v.toFixed(3));

(async () => {
  const browser = await launch(chromium);
  const out = { base: {}, res: [], cl: [] };

  /* ── [1] 예산 ─────────────────────────────────────────────────────────────── */
  for (const H of FRAMES) out.base[H] = await measure(browser, H, '');
  if (!JSONOUT) {
    console.log('PROBE879B — 879 9회차: 아래 예약이 아치 위 clearance 의 재원인가\n');
    console.log('[1] 예산 — 재료와 네 띠 (패널 좌표 · px)');
    console.log('     ' + pad('프레임', 8) + pad('tt', 9) + pad('av', 8) + pad('gt', 9)
      + pad('sh', 8) + pad('gd', 7) + pad('계단', 7)
      + pad('띠1', 8) + pad('clr', 7) + pad('띠2', 8) + pad('띠3', 8) + pad('띠4', 8) + 'gt 승자');
    for (const H of FRAMES) {
      const b = out.base[H];
      const win = b.gt.toFixed(1) === b.argFloor.toFixed(1) ? '① av+94'
        : (b.gt.toFixed(1) === b.argB.toFixed(1) ? '③ tt−av−139'
          : (b.gt.toFixed(1) === b.argA.toFixed(1) ? '③ tt×.48' : '?'));
      console.log('     ' + pad(H, 8) + pad(f2(b.tt), 9) + pad(f2(b.av), 8) + pad(f2(b.gt), 9)
        + pad(f2(b.sh), 8) + pad(f2(b.gd), 7) + pad(f2(b.steps), 7)
        + pad(f2(b.b1), 8) + pad(f2(b.clr), 7) + pad(f2(b.b2), 8) + pad(f2(b.b3), 8)
        + pad(f2(b.b4), 8) + win);
    }
    const r = out.base;
    console.log('     잔존율(' + REF + ' 대비) — 띠2 ' + f3(r[1600].b2 / r[REF].b2)
      + ' · 띠3(상자) ' + f3(r[1600].b3 / r[REF].b3)
      + ' · 띠4 ' + f3(r[1600].b4 / r[REF].b4)
      + ' · 띠1 ' + f3(r[1600].b1 / r[REF].b1) + ' · clr ' + f3(r[1600].clr / r[REF].clr));
    console.log('     ⚑ 1600 은 gt 가 **첫째 인자(av+94)** 를 고른다 — 셋째 인자(아래 예약)는 '
      + f2(r[1600].argFloor - r[1600].argB) + 'px **밑에 있어 안 문다**.\n');
  }

  /* ── [2] 아래 예약 스윕 ───────────────────────────────────────────────────── */
  const RESCASES = [
    { k: '현행(139 · 받침 40)', o: {} },
    { k: '예약 129', o: { RES: 129 } },
    { k: '예약 119', o: { RES: 119 } },
    { k: '예약 89(계단 한 단 통째로 반납)', o: { RES: 89 } },
    { k: '받침 40 → 0', o: { GD: 0 } },
    { k: '예약 89 + 받침 0', o: { RES: 89, GD: 0 } },
  ];
  for (const c of RESCASES) {
    const css = knobCSS(c.o);
    const a = await measure(browser, 1600, css), b = await measure(browser, REF, css);
    out.res.push({ k: c.k, 1600: a, [REF]: b });
  }
  if (!JSONOUT) {
    console.log('[2] 아래 예약 스윕 — §55 ⓐ 가 지목한 셋(계단·받침 40·접합선 13)을 제품에 넣어 다시 잰다');
    console.log('     ' + pad('갈래', 34) + pad('gt', 9) + pad('sh', 8) + pad('계단', 7)
      + pad('clr', 8) + pad('띠2', 8) + pad('띠3', 8) + pad('띠4', 8) + 'Δclr(1600)');
    const b0 = out.res[0][1600];
    for (const row of out.res) {
      const a = row[1600];
      console.log('     ' + pad(row.k, 34) + pad(f2(a.gt), 9) + pad(f2(a.sh), 8) + pad(f2(a.steps), 7)
        + pad(f2(a.clr), 8) + pad(f2(a.b2), 8) + pad(f2(a.b3), 8) + pad(f2(a.b4), 8)
        + (a.clr - b0.clr).toFixed(2));
    }
    console.log('     ⚠ 1600 의 Δclr 이 전부 0 이면 **셋은 재원이 아니다** — 아래 예약은 셋째 인자에만'
      + ' 들어 있고 1600 은 그 인자를 안 고른다.\n');
  }

  /* ── [3] 94 의 벽 ─────────────────────────────────────────────────────────── */
  const DS = [0, 1, 1.7, 2, 4, 8, 12, 18, 34];
  for (const d of DS) {
    const css = knobCSS({ CL: 94 + d });
    const a = await measure(browser, 1600, css), b = await measure(browser, REF, css);
    out.cl.push({ d, 1600: a, [REF]: b });
  }
  if (!JSONOUT) {
    const r0 = out.base;
    /* verify879 [2b] 의 세 띠 = 띠4(바↓수반) · 띠3(격자↓바, **그려진** 자) · 띠2(아치↓격자).
       띠3 의 «그려진» 값은 상자 값 + 격자 꼬리이고 그 꼬리는 다섯 프레임에서 같다([2e]) —
       스윕이 꼬리를 안 건드리므로 잔존율은 상자 차를 그대로 따라간다. */
    const TAIL = 18.25;
    const ret = (a, b) => ({
      b4: a.b4 / b.b4, b3: (a.b3 + TAIL) / (b.b3 + TAIL), b2: a.b2 / b.b2,
    });
    console.log('[3] 94 의 벽 — clearance 를 사는 유일한 손잡이를 d 씩 올린다 (1600 / ' + REF + ')');
    console.log('     ' + pad('d', 6) + pad('CL', 6) + pad('clr', 8) + pad('띠4', 8)
      + pad('Δ띠2', 8) + pad('Δ띠3', 8) + pad('잔존 띠4', 10) + pad('잔존 띠3', 10)
      + pad('잔존 띠2', 10) + pad('폭', 8) + '[2b]');
    for (const row of out.cl) {
      const a = row[1600], b = row[REF], q = ret(a, b);
      const sp = Math.max(q.b4, q.b3, q.b2) - Math.min(q.b4, q.b3, q.b2);
      console.log('     ' + pad(row.d, 6) + pad(94 + row.d, 6) + pad(f2(a.clr), 8) + pad(f2(a.b4), 8)
        + pad((a.b2 - r0[1600].b2).toFixed(2), 8) + pad((a.b3 - r0[1600].b3).toFixed(2), 8)
        + pad(f3(q.b4), 10) + pad(f3(q.b3), 10) + pad(f3(q.b2), 10)
        + pad(f3(sp), 8) + (sp <= 0.05 ? '초록' : '빨강'));
    }
    const g = out.cl.filter(x => {
      const q = ret(x[1600], x[REF]);
      return Math.max(q.b4, q.b3, q.b2) - Math.min(q.b4, q.b3, q.b2) <= 0.05;
    });
    const dMax = g.length ? g[g.length - 1].d : 0;
    console.log('     ⇒ [2b] 를 지키는 최대 d = **' + dMax + 'px** (clearance '
      + f2(out.cl[0][1600].clr) + ' → ' + f2(g[g.length - 1][1600].clr) + ')');
    console.log('     926 이 요구하는 것은 clr 을 긴 프레임(' + f2(r0[REF].clr) + ')에 맞추는 것 = +'
      + f2(r0[REF].clr - r0[1600].clr) + 'px.\n');
  }

  await browser.close();
  if (JSONOUT) console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
