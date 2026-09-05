#!/usr/bin/env node
/* 작업 866 — 89 유물 소환 «부품 치수» 게이트.
 *
 *   node tools/verify866.js
 *
 * 866 이 옮긴 것은 셋이고, 셋 다 **레퍼런스 환산값**이 과녁이다(`tools/probe866.py` 가 재고
 * `tools/probe866.js` 가 우리 렌더를 차분으로 물린다 — 그 자의 정의가 여기 상수의 출처다).
 *   [A] 수반  — 캔버스 400×**226** · 그린 잉크 세로 224.5 ↔ ref 222.2 (림 폭은 안 건드렸다)
 *   [B] 발    — 밑판 외폭 **282** ↔ ref 282.2 (수리 전 356 = +26.2%)
 *   [C] 알약  — 바깥 **260×53.3** · 속 251.1×44.4 ↔ ref 260.0×53.3 / 251.1×44.4 · 중심 200 유지
 *               (904 이관 — 아래 REF 주석)
 *   [D] 결속  — «수반 구획 높이» 를 적는 **세 자리**(`.rw-mid` · `--rw-bt` · `.rw-cap` top)가 같은 값
 *   [E] 바    — `#rwMulBar` 가 격자 3열 행 모듈(216..862)에 스냅
 *   [F] 라벨  — 칸이 좁아졌어도 «×1,000» 잉크가 칸 안에 든다
 *   [R] 되돌림 — 옛 값(216 · 356 · 278×53 · 724@178)으로 되돌리면 각각 빨개진다
 *
 * ⚠ 이 자는 **레이아웃 상자**(getBoundingClientRect)와 **SVG 선언**으로 묻는다 — 화소는
 *   `probe866` 의 몫이다(verify867 [1b] 와 같은 규약: CSS 값은 상자로 물어야 한다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const FRAMES = [1600, 1920, 2280, 2600];

/* ── 과녁(전부 `probe866.py` 의 레퍼런스 실측 환산값) ───────────────────────── */
const REF = {
  bowlH: 222.2,      // 잉크 상변 y530 ~ 밑판 아랫변 y629 = 100 ref px
  rimW: 340.0,       // 림 최대 폭 153 ref px
  footW: 282.2,      // 밑판 아랫변 127 ref px (scan813c 정의 그대로)
  /* ⚑⚑ 904 이관 — 이 네 수는 **866 의 자가 만든 값이었다**(폭 260.0 만 처음부터 옳다).
     `probe866.py` 의 `edge()` 가 국면 없이 «밝은 화소 2칸까지» 건너뛰어 알약 하변 아래의
     한 행짜리 밝은 틈(y619 · 받침 그늘)을 다리 삼아 세로를 24 → **26** 으로 읽었고,
     속 «폭» 을 bbox 가 아니라 **최장 연속**으로 재서 113 → **111** 로 읽었다.
     두 오차가 «테 3 ref px(6.6)» 를 만들어 제품이 테 4.5 + 베벨 2.2 로 두꺼워졌고,
     그래서 **바깥 세로가 +8.4%** 였다(813 10회차 채점 2인 EG·EH 가 화소로 잡은 그 값).
     지금은 두 자(`probe866.py` · `probe904.js`)가 **같은 값**을 낸다. */
  pillW: 260.0, pillH: 53.3,     // 검정 테두리 바깥 117×24 ref px
  pillIW: 251.1, pillIH: 44.4,   // 속(평평한 #191614 칠) 113×20 ref px
  ring: 4.44,                    // 속→바깥 = 2 ref px · **가로·세로가 같다(등방)**
};
const MID_H = 226;                 // 수반 구획 높이(= 캔버스)
const BAR = { l: 216, w: 646 };    // 격자 3열 행 span (RW_POS 216 · 711+151)

let pass = 0, fail = 0;
const ok = (c, t, got) => { if (c) { pass++; console.log('PASS ' + t + (got ? ' — ' + got : '')); }
  else { fail++; console.log('FAIL ' + t + (got ? ' — ' + got : '')); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ── SVG 선언에서 그림의 기하를 읽는다(문자열이 아니라 **수**로 묻는다) ───────── */
function stoneGeom(css) {
  const m = css.match(/\.rw-stone\{[^}]*background:url\("data:image\/svg\+xml,([^"]+)"\)/);
  if (!m) return null;
  const svg = decodeURIComponent(m[1]);
  const canvas = svg.match(/viewBox=%?"?0 0 (\d+) (\d+)/) || svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const cw = +canvas[1], ch = +canvas[2];
  /* 림 = 가장 큰 타원(rx 최대) · 스트로크 포함 외폭 */
  let rimW = 0, inkTop = ch;
  svg.replace(/<ellipse cx="(\d+)" cy="(\d+)" rx="(\d+)" ry="(\d+)"[^>]*?(?:stroke-width="(\d+)")?\/>/g,
    (all, cx, cy, rx, ry, sw) => {
      const s = +(sw || 0) / 2;
      if (+rx * 2 + s * 2 > rimW) { rimW = +rx * 2 + s * 2; inkTop = Math.min(inkTop, +cy - +ry - s); }
      return all;
    });
  /* 발 = 가장 아래 path 의 최대 가로 폭 + 스트로크 */
  let footW = 0;
  svg.replace(/<path d="([^"]+)"[^>]*?stroke-width="(\d+)"/g, (all, d, sw) => {
    const pts = [...d.matchAll(/([ML])\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g)].map(v => [+v[2], +v[3]]);
    const maxY = Math.max(...pts.map(p => p[1]));
    if (maxY >= ch - 1) {
      const bottom = pts.filter(p => p[1] >= ch - 1);
      footW = Math.max(...bottom.map(p => p[0])) - Math.min(...bottom.map(p => p[0])) + +sw;
    }
    return all;
  });
  return { cw, ch, rimW, inkTop, footW, inkH: ch - inkTop };
}

(async () => {
  const css = fs.readFileSync(SRC, 'utf8');
  const g = stoneGeom(css);
  ok(!!g, '[A0] 수반 SVG 를 읽었다');

  /* ── [A][B] 그림의 기하 ── */
  ok(g && g.cw === 400 && g.ch === MID_H,
    '[A1] 수반 캔버스 400×' + MID_H, g && g.cw + '×' + g.ch);
  ok(g && near(g.inkH, REF.bowlH, REF.bowlH * 0.02),
    '[A2] 그린 잉크 세로가 ref 222.2 의 ±2% 안 (수리 전 214.5 = −3.5%)',
    g && g.inkH.toFixed(1) + ' vs ref ' + REF.bowlH + ' (Δ ' +
      ((g.inkH / REF.bowlH - 1) * 100).toFixed(1) + '%)');
  ok(g && near(g.rimW, REF.rimW, REF.rimW * 0.02),
    '[A3] 림 외폭은 그대로 ref 340.0 의 ±2% — 866 은 **가로를 한 점도 안 옮겼다**',
    g && g.rimW.toFixed(1) + ' vs ref ' + REF.rimW);
  ok(g && near(g.footW, REF.footW, REF.footW * 0.03),
    '[B] 밑판(발) 외폭이 ref 282.2 의 ±3% (수리 전 356 = +26.2% · 813 6회차 CS 와 같은 값)',
    g && g.footW.toFixed(1) + ' vs ref ' + REF.footW + ' (Δ ' +
      ((g.footW / REF.footW - 1) * 100).toFixed(1) + '%)');

  /* ── [D] 세 자리 결속 — 같은 상자를 세 곳에 적는다 ── */
  const midH = (css.match(/\.rw-mid\{[^}]*height:(\d+)px/) || [])[1];
  const btH = (css.match(/--rw-bt:calc\(100% - 88px[^;]*- (\d+)px \* var\(--rwc,1\)\)/) || [])[1];
  const capH = (css.match(/top:calc\(var\(--rw-bt\) \+ (\d+)px \* var\(--rwc,1\)/) || [])[1];
  const spH = (css.match(/--rw-sp:calc\(100% - (\d+)px \* var\(--rwc,1\)\)/) || [])[1];
  ok(+midH === MID_H && +btH === MID_H && +capH === MID_H,
    '[D1] «수반 구획 높이» 를 적는 세 자리가 전부 ' + MID_H + ' (.rw-mid · --rw-bt · .rw-cap top)',
    '.rw-mid ' + midH + ' · --rw-bt ' + btH + ' · .rw-cap ' + capH);
  ok(+spH === 516 + MID_H + 88,
    '[D2] 내용 총합 --rw-sp = 516 + ' + MID_H + ' + 88 = ' + (516 + MID_H + 88),
    spH + ' (' + (+spH === 516 + MID_H + 88 ? '일치' : '기대 ' + (516 + MID_H + 88)) + ')');

  /* ── 렌더 ── */
  const b = await launch(chromium);
  const rows = {};
  for (const H of FRAMES) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL);
    await p.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
    await p.evaluate(() => {
      RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: 10 }; });
      S.relic = 99999;
      document.querySelector('#tabbar [data-t="box"]').click();
    });
    await p.waitForTimeout(700);
    rows[H] = await p.evaluate(() => {
      /* ⚠ **레이아웃 상자(offset*)로 잰다** — verify867 [1b] 와 같은 규약이고, 여기서는 이유가
         두 겹이다: ⓐ 팝업 열림 연출(60 쥬시)이 도는 동안 rect 는 스케일 한복판을 찍고
         ⓑ 헤드리스에서 세로 스크롤바가 뜨면 `fit()` 이 #app 을 **1064/1080 = 0.985** 로 줄여
         646 이 636.3 으로 읽힌다(둘 다 실측 — 유령이 다섯 항을 한꺼번에 빨갛게 만든다).
         offset* 는 그 둘 어느 것에도 안 흔들린다. 슬롯(`.rw-grid`)과 바(`.rw-bowl`)는
         **둘 다 패널 폭을 그대로 쓰는 부모**라 offsetLeft 가 같은 좌표계다. */
      const O = (s) => { const e = document.querySelector(s); if (!e) return null;
        return { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; };
      const cost = document.querySelector('#rwCost');
      const cs = getComputedStyle(cost);
      const ring = parseFloat(cs.borderTopWidth)
        + parseFloat((cs.boxShadow.match(/inset[^,)]*?([\d.]+)px\s*$/) || [0, 2])[1] || 2);
      const xs = [...document.querySelectorAll('#relw .rw-c')]
        .map((e) => ({ l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth }));
      const lastTop = Math.max(...xs.map((q) => q.t));
      const last = xs.filter((q) => q.t === lastTop);
      const tabs = [...document.querySelectorAll('#rwMulBar .stab')].map((e) => {
        /* ⚠ 라벨은 **자식 노드 안**에 있다 — 텍스트 노드만 찾으면 잉크가 0 으로 나오고
           «칸 안에 든다» 가 언제나 참인 헛초록이 된다(실측으로 밟았다). 요소의 내용 전체를
           Range 로 잡고, rect 가 스케일을 타므로 offset 비로 나눠 되돌린다. */
        const g2 = document.createRange(); g2.selectNodeContents(e);
        const k = e.getBoundingClientRect().width / e.offsetWidth || 1;
        const ink = g2.getBoundingClientRect().width / k;
        return { t: e.textContent.trim(), w: e.offsetWidth, ink: +ink.toFixed(2) };
      });
      return { basin: O('.rw-basin'), mid: O('.rw-mid'), cost: O('#rwCost'), bar: O('#rwMulBar'),
               ring: +ring.toFixed(2), tabs,
               row3: { l: Math.min(...last.map((q) => q.l)),
                       r: Math.max(...last.map((q) => q.l + q.w)) } };
    });
    await ctx.close();
  }

  const all = (f) => FRAMES.every(H => f(rows[H]));
  const at = (f) => FRAMES.map(H => H + ':' + f(rows[H])).join(' · ');

  ok(all(r => near(r.basin.h, MID_H, .6) && near(r.mid.h, MID_H, .6) && near(r.basin.w, 400, .6)),
    '[A4] 다섯 프레임 전부 수반·구획 상자가 400×' + MID_H,
    at(r => r.basin.w + '×' + r.basin.h));

  /* ── [C] 알약 ── */
  ok(all(r => near(r.cost.w, REF.pillW, 1) && near(r.cost.h, REF.pillH, 1)),
    '[C1] 알약 바깥 상자가 ref 260.0×53.3 (866 전 278×53 — 폭 +6.9% · 866 후 260×57.8 — 세로 +8.4%)',
    at(r => r.cost.w + '×' + r.cost.h));
  ok(all(r => near(r.cost.w - 2 * r.ring, REF.pillIW, 2) && near(r.cost.h - 2 * r.ring, REF.pillIH, 2)),
    '[C2] 알약 **속**이 ref 251.1×44.4 — 테를 ref 두께(4.44)로 되돌리면 바깥·속이 같이 닫힌다',
    at(r => (r.cost.w - 2 * r.ring).toFixed(1) + '×' + (r.cost.h - 2 * r.ring).toFixed(1)
      + ' (테 ' + r.ring + ')'));
  /* ⚑ 904 신설 — **이 항이 있었으면 866 의 «테 6.6» 이 그 자리에서 빨갰다.**
     ref 의 테는 검정 1 + 베벨 1 = 2 ref px 이고 **가로·세로가 같다**. 866 의 자는 세로를
     +2 ref px, 속 폭을 −2 ref px 로 읽어 «테 3» 을 만들었는데, 그 두 오차는 **가로 테와
     세로 테를 서로 다르게** 만든다(가로 (117−111)/2 = 3 ↔ 세로 (26−20)/2 = 3 으로 우연히
     같아 보였을 뿐, 옳은 값 (117−113)/2 = 2 ↔ (24−20)/2 = 2 와는 둘 다 어긋난다).
     ⇒ 제품에게 «네 테가 등방인가 · 그 두께가 ref 의 2 ref px 인가» 를 직접 묻는다. */
  ok(all(r => near(r.ring, REF.ring, 0.8)),
    '[C4] ★ 테(속→바깥)가 ref 의 2 ref px = 4.44 — 866 의 6.6 이 아니다 (등방 · 가로·세로 한 값)',
    at(r => r.ring + ''));
  ok(all(r => near((REF.pillW - REF.pillIW) / 2, (REF.pillH - REF.pillIH) / 2, 0.1)),
    '[C5] ★ 과녁 자신의 정합 — ref 의 «가로 테» 와 «세로 테» 가 같은 수다 (자가 갈리면 여기가 빨개진다)',
    ((REF.pillW - REF.pillIW) / 2).toFixed(2) + ' / ' + ((REF.pillH - REF.pillIH) / 2).toFixed(2));
  ok(all(r => near((r.cost.l + r.cost.w / 2) - (r.basin.l + r.basin.w / 2), 0, .6)),
    '[C3] 알약 중심 = 수반 중심 (폭을 줄이며 좌를 61 → 70 으로 같이 옮겼다)',
    at(r => ((r.cost.l + r.cost.w / 2) - (r.basin.l + r.basin.w / 2)).toFixed(2)));

  /* ── [E][F] 배수 바 ── */
  ok(all(r => near(r.bar.l, BAR.l, .6) && near(r.bar.w, BAR.w, .6)),
    '[E1] 바가 216 @ 646 — 격자 3열 행 모듈(RW_POS 216 · 711+151 = 862)',
    at(r => r.bar.w + '@' + r.bar.l));
  ok(all(r => near(r.bar.l, r.row3.l, 1.5) && near(r.bar.l + r.bar.w, r.row3.r, 1.5)),
    '[E2] 바 좌·우변이 마지막(3열) 격자 행의 좌·우 끝과 ±1.5px — «어느 모듈에도 안 맞는다» 가 닫혔다',
    at(r => (r.bar.l - r.row3.l).toFixed(1) + '/' + (r.bar.l + r.bar.w - r.row3.r).toFixed(1)));
  ok(all(r => r.tabs.length === 4 && r.tabs.every(t => t.ink < t.w - 8)),
    '[F] 칸이 좁아져도(646/4 = 161.5) 네 칸 라벨 잉크가 칸 안에 든다 — «×1,000» 이 가장 빡빡하다',
    at(r => r.tabs.map(t => t.t + ' ' + (t.w - t.ink).toFixed(0)).join('/')));

  await b.close();

  /* ── [R] 되돌림 시험 — 옛 값으로 되돌리면 각각 빨개진다 ─────────────────── */
  const REV = [
    ['R1', '수반 캔버스를 216 으로 되돌리면 [A2] 가 빨개진다 (잉크 세로 −3.5%)',
      (t) => t.replace(/height=%22226%22 viewBox=%220 0 400 226%22/, 'height=%22216%22 viewBox=%220 0 400 216%22'),
      (gg) => ({ bad: !near(gg.inkH, REF.bowlH, REF.bowlH * 0.02), got: '잉크 세로 ' + gg.inkH })],
    ['R2', '발을 옛 폭(24..376)으로 되돌리면 [B] 가 빨개진다 (+26%)',
      (t) => t.replace('L339 226 L61 226 L65 221', 'L376 226 L24 226 L32 221'),
      (gg) => ({ bad: !near(gg.footW, REF.footW, REF.footW * 0.03), got: '발 폭 ' + gg.footW })],
  ];
  const bak = css;
  for (const [id, title, patch, judge] of REV) {
    const t = patch(bak);
    if (t === bak) { ok(false, '[' + id + '] ' + title, '되돌릴 문자열을 못 찾았다(자가 늙었다)'); continue; }
    fs.writeFileSync(SRC, t);
    let r;
    try { r = judge(stoneGeom(t)); } finally { fs.writeFileSync(SRC, bak); }
    ok(r.bad, '[' + id + '] ' + title + ' (사본에서 빨개져야 한다)', r.got);
  }

  console.log('\nVERIFY866 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
