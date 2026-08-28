#!/usr/bin/env node
/* 작업 368 재현 프로브 — «`verify348` [3-b] 좌끝 적의 바가 사이드 아이콘 열을 안 피한다»
 *
 *   node tools/probe368.js
 *
 * 등재문이 가르라고 한 세 갈래 —
 *   ⓐ 제품이 «왼쪽 띠 판정» 을 잃었나(사이드 열 좌표가 그 뒤 작업으로 옮겨졌나 — 49·354·360)
 *   ⓑ 게이트가 «좌끝» 을 만드는 방식이 제품 좌표와 어긋났나(적을 놓은 y 가 애초에 띠 밖)
 *   ⓒ [3-b] 가 재는 자리가 348 이후 다른 작업으로 옮겨졌나
 *
 * 재는 법 — 338·344·350 규칙대로 **찍힌 픽셀 + 실측 기하**를 나란히 놓는다.
 *   ① `sideBox`(제품이 DOM 에서 잰 띠)와 `fxClampX` 가 실제로 무엇을 돌려주는가
 *   ② 게이트가 쓰는 그 자리(VH·0.5)에서 바의 y 가 띠 안인가 밖인가
 *   ③ 띠 «안» 자리로 옮기면 클램프가 살아 있는가 = 제품 결함인가 게이트 결함인가
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용. LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const PINK = [255, 107, 138];

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (c, m) => (c ? ok(m) : no(m));

/* verify348 과 **같은** 하네스를 쓴다 — 자를 바꿔 놓고 «게이트가 틀렸다» 고 말할 수는 없다 */
const HARNESS = () => {
  window.requestAnimationFrame = () => 0;
  localStorage.clear(); Object.assign(S, DEF());
  S.stage = 20; S.best = 20; S.guide.idx = 99;
  if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
  spawnStage(); step(1 / 60);
  window.__t368 = {
    mk(tk, hpR) {
      enemies.length = 0; spawnQ.length = 0;
      makeEnemy(tk || 'zombie');
      const e = enemies[enemies.length - 1];
      e.born = 1; e.hp = e.max * (hpR === undefined ? 0.6 : hpR);
      return e;
    },
    put(e, sx, sy) { draw(); e.x = sx - camOx; e.y = sy - camOy; draw(); },
    scan(rgb) {
      const g = cvs.getContext('2d');
      const d = g.getImageData(0, 0, cvs.width, cvs.height).data;
      let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] === rgb[0] && d[i + 1] === rgb[1] && d[i + 2] === rgb[2] && d[i + 3] === 255) {
          const p = (i / 4) | 0, x = p % cvs.width, y = (p / cvs.width) | 0;
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return n ? { n, x0: x0 / 2, x1: x1 / 2, y0: y0 / 2, y1: y1 / 2 } : { n: 0 };
    },
  };
  return { VW, VH };
};

(async () => {
  console.log('=== PROBE 368 — verify348 [3-b] 좌끝 클램프 재현 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + SRC);
  await page.waitForTimeout(1200);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const dim = await ev(HARNESS);
  if (dim.__err) { console.log('  NO   [전제] 하네스 실패: ' + dim.__err); process.exit(1); }
  ok('[전제] 하네스 — VW ' + dim.VW + ' · VH ' + dim.VH.toFixed(1));

  /* ═══ ① 제품이 잰 띠와 클램프의 실제 반환값 ═══ */
  console.log('\n[1] 제품 — sideBox(띠) · fxClampX(클램프)');
  const g1 = await ev(() => {
    draw();
    const sb = sideBox;
    return {
      sb: sb ? { x2: sb.x2, y1: sb.y1, y2: sb.y2 } : null,
      camOy, camOx, VW, VH,
      /* 띠 «안» 과 «밖» 각각에서 클램프가 무엇을 돌려주는가 (hw=10.75 = 바 반폭) */
      inBand: sb ? fxClampX(0 - camOx, 10.75, (sb.y1 + sb.y2) / 2 - camOy) + camOx : null,
      outBand: sb ? fxClampX(0 - camOx, 10.75, sb.y2 + 200 - camOy) + camOx : null,
    };
  });
  if (g1.__err) no('[1] 평가 실패 — ' + g1.__err);
  else if (!g1.sb) no('[1] sideBox 가 null — 띠를 못 쟀다');
  else {
    console.log('       sideBox  x2 ' + g1.sb.x2.toFixed(1) + ' · y ' + g1.sb.y1.toFixed(1) + '..' + g1.sb.y2.toFixed(1) +
      '   (VH ' + g1.VH.toFixed(1) + ' · camOy ' + g1.camOy.toFixed(1) + ')');
    console.log('       fxClampX 띠 안 → 좌변 ' + (g1.inBand - 10.75).toFixed(1) +
      ' · 띠 밖 → 좌변 ' + (g1.outBand - 10.75).toFixed(1));
    is(g1.inBand - 10.75 >= g1.sb.x2, '[1-a] 띠 «안» 에서는 클램프가 사이드 열 밖으로 민다');
    is(Math.abs(g1.outBand - 10.75 - 24) < 0.51, '[1-b] 띠 «밖» 에서는 여백 24 로만 민다(설계대로)');
  }

  /* ═══ ② 게이트가 쓰는 자리(VH/2)의 바 y 가 띠 안인가 ═══ */
  console.log('\n[2] 게이트 자리 — verify348 [3-a] «좌끝» 이 놓는 (30, VH/2) 에서 바의 y');
  const g2 = await ev(([rgb]) => {
    const T = window.__t368, e = T.mk('zombie');
    T.put(e, 30, VH * 0.5);
    const p = T.scan(rgb);
    const sb = sideBox;
    return { p, sb: sb ? { x2: sb.x2, y1: sb.y1, y2: sb.y2 } : null, camOy, eyScr: e.y + camOy, er: e.r, VH };
  }, [PINK]);
  if (g2.__err) no('[2] 평가 실패 — ' + g2.__err);
  else if (!g2.p.n) no('[2] 바가 아예 안 그려졌다 — 표본이 무효');
  else {
    console.log('       바 픽셀 ' + g2.p.n + ' · x ' + g2.p.x0.toFixed(1) + '..' + g2.p.x1.toFixed(1) +
      ' · y ' + g2.p.y0.toFixed(1) + '..' + g2.p.y1.toFixed(1));
    console.log('       적 발밑 화면 y ' + g2.eyScr.toFixed(1) + ' · r ' + g2.er.toFixed(1) +
      ' · 띠 y ' + (g2.sb ? g2.sb.y1.toFixed(1) + '..' + g2.sb.y2.toFixed(1) : '—'));
    const inBand = g2.sb && g2.p.y0 > g2.sb.y1 - 8 && g2.p.y0 < g2.sb.y2 + 8;
    console.log('       ⇒ 바 y0 ' + g2.p.y0.toFixed(1) + ' 는 띠 ' + (inBand ? '«안»' : '«밖»') + ' 이다');
    is(g2.p.x0 >= (g2.sb ? g2.sb.x2 : 1e9) || !inBand,
      '[2-a] 클램프 규약과 실제가 «일관» 하다(띠 안이면 밀려 있고, 띠 밖이면 24 여도 정상)');
  }

  /* ═══ ③ 띠 «안» 자리로 옮기면 클램프가 살아 있는가 ═══
     ⚠ 표본 행은 «띠 안에서 캔버스 세로 중심에 가장 가까운 행» 이다 — 비네트(§4) 때문이다. */
  console.log('\n[3] 띠 «안» 자리 — 적을 사이드 열 안쪽(비네트가 가장 옅은 행)에 놓는다');
  const g3 = await ev(([rgb]) => {
    const T = window.__t368, sb = sideBox;
    if (!sb) return { err: 'sideBox null' };
    const e = T.mk('zombie');
    const top = Math.max(sb.y1 + 8, Math.min(sb.y2 - 8, VH / 2));
    T.put(e, 30, top + e.r * 3.1 + 6);
    const p = T.scan(rgb);
    return { top, p, sb: { x2: sb.x2, y1: sb.y1, y2: sb.y2 } };
  }, [PINK]);
  if (g3.__err || g3.err) no('[3] 평가 실패 — ' + (g3.err || g3.__err));
  else if (!g3.p.n) no('[3] 띠 «안» 표본의 바가 안 그려졌다 — 표본이 무효');
  else {
    console.log('       바 상변 ' + g3.top.toFixed(1) + ' · 바 x ' + g3.p.x0.toFixed(1) + '..' + g3.p.x1.toFixed(1) +
      ' · y ' + g3.p.y0.toFixed(1) + '..' + g3.p.y1.toFixed(1));
    is(g3.p.x0 >= g3.sb.x2, '[3-a] 바 좌변 ' + g3.p.x0.toFixed(1) + ' ≥ 사이드 열 우변 ' +
      g3.sb.x2.toFixed(1) + ' — 띠 안에서는 클램프가 살아 있다');
  }

  /* ═══ ④ 비네트 — «찍힌 픽셀» 자가 왼쪽 위에서 눈이 머는 자리 ═══
     draw() 맨 끝의 `createRadialGradient(VW/2, VH/2, VH*.34, …)` 가 화면 전체를 덮으므로,
     캔버스 중심에서 VH*0.34(≈339px) 밖의 바는 색이 어두워져 «정확한 색» 표본이 0 이 된다.
     368 §R2 가 «바가 아예 없다» 로 읽힌 뿌리이자, 앞으로도 같은 자를 쓰는 게이트가 걸릴 함정이다. */
  console.log('\n[4] 비네트 — 같은 바를 안/밖 두 행에 놓고 «정확한 색» 표본 수를 잰다');
  const g4 = await ev(([rgb]) => {
    const T = window.__t368, e = T.mk('zombie');
    const R = VH * 0.34, out = [];
    for (const top of [232, 420]) {
      T.put(e, 30, top + e.r * 3.1 + 6);
      const p = T.scan(rgb);
      /* 클램프 «전» 자리(x≈22)가 비네트 안쪽 타원 안인가 */
      const d = Math.hypot(22 - VW / 2, top - VH / 2);
      out.push({ top, n: p.n, d, inside: d < R });
    }
    return { R, out };
  }, [PINK]);
  if (g4.__err) no('[4] 평가 실패 — ' + g4.__err);
  else {
    for (const o of g4.out) {
      console.log('       바 상변 ' + o.top + ' — 중심거리 ' + o.d.toFixed(1) + (o.inside ? ' < ' : ' > ') +
        g4.R.toFixed(1) + ' ⇒ ' + (o.inside ? '비네트 안쪽(색 그대로)' : '비네트 바깥(색이 어두워진다)'));
    }
    is(g4.out.length === 2 && g4.out[0].inside === false && g4.out[1].inside === true,
      '[4-a] 띠 세로 한복판(232)은 비네트 «바깥» · 게이트가 고른 행(420)은 «안쪽»');
  }

  is(errs.length === 0, '[5] 콘솔/페이지 오류 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0].slice(0, 120) : ''));

  await browser.close();
  console.log('\nPROBE368 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' — PASS'));
  process.exit(fail ? 1 : 0);
})();
