#!/usr/bin/env node
/* 작업 372 재현 — `verify348` [R-b] 가 «간헐적으로 빨간» 뿌리를 찍힌 값으로 가른다.
 *
 *   node tools/probe372.js
 *
 * [R-b] 는 «사본(수리 전)과 현재, 화면 안 중앙의 바는 픽셀까지 같다» 를 **개수**로 묻는다.
 * 등재문(PROGRESS 372)이 같은 자리에서 227 · 277 · 301 · 308 네 값을 봤다.
 *
 * 이 프로브가 가르는 것 ────────────────────────────────────────────────────────
 *   ① 한 페이지 안에서도 흔들리는가 (흔들리면 «두 페이지 차이» 가설이 통째로 죽는다)
 *   ② 흔들림이 어느 축인가 — 바의 bbox(x0·x1·y0) 를 같이 찍어 «자리» 인지 «크기» 인지 본다
 *   ③ `draw()` 가 채우는 `camOx/camOy` 가 호출마다 달라지는가 (cam.shake 난수)
 *   ④ 적을 **한 번만** 만들어 재사용하면 안정되는가 (368 곁다리 관측)
 *   ⑤ 자리를 정수 디바이스px 로 굳히면 개수가 결정적이 되는가 (처방 후보)
 *
 * ⚠ `file://` + getImageData → `--allow-file-access-from-files` (verify348 과 같은 자).
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

/* verify348 의 하네스를 **그대로** 쓴다(자를 바꾸면 재현이 아니다) + 진단용 값 몇 개를 더 돌려준다 */
const HARNESS = () => {
  window.requestAnimationFrame = () => 0;
  localStorage.clear(); Object.assign(S, DEF());
  S.stage = 20; S.best = 20; S.guide.idx = 99;
  if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
  spawnStage(); step(1 / 60);
  window.__t372 = {
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
  return { VW, VH, dpr: cvs.width / VW };
};

async function open(ctx, url) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url);
  await page.waitForTimeout(1200);
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const dim = await ev(HARNESS);
  return { page, ev, errs, dim };
}

/* verify348 의 shotAt 과 같은 자 — 매번 새 적(mk) → 중앙에 put → 개수 */
const shot = (ev, n) => ev((cnt) => {
  const T = window.__t372, out = [];
  for (let i = 0; i < cnt; i++) {
    const e = T.mk('zombie');
    T.put(e, VW / 2, VH / 2);
    const p = T.scan([255, 107, 138]);
    out.push({
      n: p.n, x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1,
      ex: e.x, ey: e.y, er: e.r, ox: camOx, oy: camOy,
      by: e.y - e.r * 3.1 - 6, sh: cam.shake,
    });
  }
  return out;
}, n);

const uniq = (a) => Array.from(new Set(a)).sort((x, y) => x - y);

(async () => {
  console.log('=== PROBE 372 — verify348 [R-b] 플레이키 재현 ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const cur = await open(ctx, 'file://' + SRC);
  if (cur.dim && cur.dim.__err) { console.log('  NO   [전제] 하네스 실패: ' + cur.dim.__err); process.exit(1); }
  ok('[전제] 하네스 — VW ' + cur.dim.VW + ' · VH ' + cur.dim.VH.toFixed(1) + ' · 캔버스 배율 ' + cur.dim.dpr);

  /* ① 한 페이지 안에서 흔들리는가 */
  console.log('\n[1] 같은 페이지에서 20회 — verify348 과 같은 자(매번 새 적)');
  const r1 = await shot(cur.ev, 20);
  if (r1.__err) { no('[1] 평가 실패 — ' + r1.__err); }
  else {
    const ns = uniq(r1.map((v) => v.n));
    console.log('       개수 분포 ' + JSON.stringify(ns) + ' (n=' + r1.length + ')');
    console.log('       bbox 표본 3 ' + r1.slice(0, 3).map((v) =>
      'n' + v.n + ' x' + v.x0.toFixed(1) + '..' + v.x1.toFixed(1) + ' y' + v.y0.toFixed(1) + '..' + v.y1.toFixed(1)).join(' | '));
    console.log('       by(바 상변) ' + JSON.stringify(uniq(r1.map((v) => +v.by.toFixed(3)))));
    console.log('       camOx ' + JSON.stringify(uniq(r1.map((v) => +v.ox.toFixed(3)))) +
                ' · camOy ' + JSON.stringify(uniq(r1.map((v) => +v.oy.toFixed(3)))) +
                ' · cam.shake ' + JSON.stringify(uniq(r1.map((v) => +v.sh.toFixed(3)))));
    console.log('       e.r ' + JSON.stringify(uniq(r1.map((v) => v.er))));
    is(ns.length > 1, '[1-a] 한 페이지 안에서도 개수가 흔들린다 — 값 ' + ns.length + '가지 ' + JSON.stringify(ns) +
      ' (흔들리면 «두 페이지 차이» 가설은 죽는다)');
  }

  /* ② 흔들림의 축 — bbox 어디가 움직이나 */
  console.log('\n[2] 흔들림의 축 — 같은 표본의 bbox 가 어디서 갈리나');
  if (!r1.__err) {
    const ux0 = uniq(r1.map((v) => +v.x0.toFixed(1))), uy0 = uniq(r1.map((v) => +v.y0.toFixed(1)));
    const ux1 = uniq(r1.map((v) => +v.x1.toFixed(1))), uy1 = uniq(r1.map((v) => +v.y1.toFixed(1)));
    console.log('       x0 ' + JSON.stringify(ux0) + ' · x1 ' + JSON.stringify(ux1));
    console.log('       y0 ' + JSON.stringify(uy0) + ' · y1 ' + JSON.stringify(uy1));
    is(true, '[2-a] 자리 축 — x0 ' + ux0.length + '가지 · y0 ' + uy0.length + '가지 · x1 ' + ux1.length + '가지 · y1 ' + uy1.length + '가지');
  }

  /* ③ 적을 한 번만 만들어 재사용 (368 곁다리 관측) */
  console.log('\n[3] 같은 적을 재사용하면 안정되는가 (368 곁다리 관측)');
  const r3 = await cur.ev((cnt) => {
    const T = window.__t372, e = T.mk('zombie'), out = [];
    for (let i = 0; i < cnt; i++) { T.put(e, VW / 2, VH / 2); out.push(T.scan([255, 107, 138]).n); }
    return out;
  }, 12);
  if (r3.__err) no('[3] 평가 실패 — ' + r3.__err);
  else {
    const u = uniq(r3);
    console.log('       개수 ' + JSON.stringify(r3));
    is(u.length === 1, '[3-a] 적 재사용 — 값 ' + u.length + '가지 ' + JSON.stringify(u));
  }

  /* ④ 새 적의 «무엇이» 다른가 — 필드 대조 */
  console.log('\n[4] 새 적끼리 무엇이 다른가 — mk 가 남기는 난수 필드');
  const r4 = await cur.ev((cnt) => {
    const T = window.__t372, out = [];
    for (let i = 0; i < cnt; i++) {
      const e = T.mk('zombie');
      out.push({ r: e.r, ph: e.ph, at: e.at, cd: e.cd, sp: e.sp, born: e.born, hp: e.hp, max: e.max, flip: e.flip });
    }
    return out;
  }, 6);
  if (r4.__err) no('[4] 평가 실패 — ' + r4.__err);
  else {
    for (const k of ['r', 'hp', 'max', 'born']) {
      const u = uniq(r4.map((v) => v[k]));
      console.log('       ' + k + ' — ' + u.length + '가지 ' + JSON.stringify(u.slice(0, 4)));
    }
    for (const k of ['ph', 'at', 'cd', 'sp']) {
      const u = uniq(r4.map((v) => +(+v[k]).toFixed(3)));
      console.log('       ' + k + ' — ' + u.length + '가지 ' + JSON.stringify(u.slice(0, 4)));
    }
    is(uniq(r4.map((v) => v.r)).length === 1 && uniq(r4.map((v) => v.hp)).length === 1,
      '[4-a] 바의 «크기» 재료(e.r · hp/max)는 새 적이어도 같다 — 흔들림은 크기가 아니라 자리다');
  }

  /* ⑤ 처방 후보 — 자리를 정수 디바이스px 로 굳히면 결정적이 되는가 */
  console.log('\n[5] 처방 후보 — 바의 자리를 정수 디바이스px 로 굳힌다');
  const r5 = await cur.ev((cnt) => {
    const T = window.__t372, out = [];
    for (let i = 0; i < cnt; i++) {
      const e = T.mk('zombie');
      /* 1차 draw 로 camOx/camOy 를 굳히고, 그 위에서 «바 상변 by» 와 «바 좌변» 이
         정수 디바이스px(=0.5 게임px 격자)에 오도록 e.x/e.y 를 되짚어 맞춘다 */
      draw();
      const q = 0.5;                                     /* 캔버스가 게임px ×2 라 격자는 0.5 */
      const wq = Math.max(22, e.r * 2.2);
      const sy = Math.round((VH / 2 - camOy) / q) * q;   /* 발밑(e.y) 를 격자에 */
      e.y = Math.round((sy - camOy + e.r * 3.1 + 6) / q) * q - e.r * 3.1 - 6 + 0;
      e.y = Math.round((VH / 2) / q) * q - camOy;
      e.y = e.y + (Math.round((e.y - e.r * 3.1 - 6) / q) * q - (e.y - e.r * 3.1 - 6));
      e.x = Math.round((VW / 2 - camOx - wq / 2) / q) * q + wq / 2;
      draw();
      const p = T.scan([255, 107, 138]);
      out.push(p.n);
    }
    return out;
  }, 12);
  if (r5.__err) no('[5] 평가 실패 — ' + r5.__err);
  else {
    const u = uniq(r5);
    console.log('       개수 ' + JSON.stringify(r5));
    is(u.length === 1, '[5-a] 격자 정렬 — 값 ' + u.length + '가지 ' + JSON.stringify(u));
  }

  /* ⑥ 페이지를 여러 번 새로 열면 갈리는가 — [R-b] 는 «다른 페이지» 두 개를 비교한다 */
  console.log('\n[6] 페이지를 6번 새로 열어 같은 표본을 잰다 (VH·camO·개수)');
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const p = await open(ctx, 'file://' + SRC);
    if (p.dim && p.dim.__err) { no('[6] ' + i + '회 하네스 실패 — ' + p.dim.__err); await p.page.close(); continue; }
    const s = await shot(p.ev, 1);
    const v = s.__err ? null : s[0];
    rows.push({ VH: p.dim.VH, v });
    console.log('       #' + i + ' VH ' + p.dim.VH.toFixed(3) + ' · n ' + (v ? v.n : '평가실패') +
      (v ? ' · x ' + v.x0.toFixed(1) + '..' + v.x1.toFixed(1) + ' · y ' + v.y0.toFixed(1) + '..' + v.y1.toFixed(1) +
           ' · by ' + v.by.toFixed(3) + ' · camOy ' + v.oy.toFixed(3) + ' · e.y ' + v.ey.toFixed(3) : ''));
    await p.page.close();
  }
  {
    const un = uniq(rows.filter((r) => r.v).map((r) => r.v.n));
    const uh = uniq(rows.map((r) => +r.VH.toFixed(3)));
    is(un.length > 1 || uh.length > 1,
      '[6-a] 페이지마다 갈린다 — 개수 ' + JSON.stringify(un) + ' · VH ' + JSON.stringify(uh));
  }

  /* ⑦ 같은 bbox 안에서 «무엇이» 분홍을 먹는가 — 안 맞는 픽셀의 색을 그대로 센다 */
  console.log('\n[7] 바 rect 안 색 히스토그램 — 페이지 6번');
  for (let i = 0; i < 6; i++) {
    const p = await open(ctx, 'file://' + SRC);
    if (p.dim && p.dim.__err) { no('[7] ' + i + '회 하네스 실패'); await p.page.close(); continue; }
    const h = await p.ev(() => {
      const T = window.__t372, e = T.mk('zombie');
      T.put(e, VW / 2, VH / 2);
      const w = Math.max(22, e.r * 2.2), by = e.y - e.r * 3.1 - 6;
      const bx = fxClampX(e.x, w / 2, by) - w / 2;
      /* 채워진 부분(분홍)이 놓일 rect 를 게임px → 디바이스px 로 */
      const X0 = Math.floor((bx + camOx) * 2), Y0 = Math.floor((by + camOy) * 2);
      const X1 = Math.ceil((bx + camOx + w * 0.6) * 2), Y1 = Math.ceil((by + camOy + 4) * 2);
      const g = cvs.getContext('2d');
      const d = g.getImageData(X0, Y0, X1 - X0, Y1 - Y0).data;
      const hist = {};
      for (let k = 0; k < d.length; k += 4) {
        const key = d[k] + ',' + d[k + 1] + ',' + d[k + 2] + ',' + d[k + 3];
        hist[key] = (hist[key] || 0) + 1;
      }
      const top = Object.keys(hist).sort((a, b) => hist[b] - hist[a]).slice(0, 5)
        .map((k) => k + '×' + hist[k]);
      return { rect: [X0, Y0, X1 - X0, Y1 - Y0], top, pink: hist['255,107,138,255'] || 0,
               ptx: player.x + camOx, pty: player.y + camOy, pat: player.at, panim: player.anim };
    });
    console.log('       #' + i + (h.__err ? ' 평가실패 ' + h.__err : ' 분홍 ' + h.pink +
      ' · rect ' + JSON.stringify(h.rect) + '\n           색 ' + (h.top || []).join(' | ') +
      '\n           player 화면(' + (h.ptx || 0).toFixed(1) + ',' + (h.pty || 0).toFixed(1) + ') anim ' + h.panim + ' at ' + (+h.pat).toFixed(2)));
    await p.page.close();
  }
  ok('[7-a] 히스토그램 출력 완료');

  /* ⑧ 가설 — «중앙» 표본이 플레이어 스프라이트 **밑에 깔린다**. 한 페이지에서 애니 위상만 흔든다 */
  console.log('\n[8] 같은 페이지에서 player.at(애니 위상)만 흔든다');
  const r8 = await cur.ev(() => {
    const T = window.__t372, out = [];
    for (const at of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const e = T.mk('zombie');
      T.put(e, VW / 2, VH / 2);
      player.at = at; draw();
      out.push(at + ':' + T.scan([255, 107, 138]).n);
    }
    return out;
  });
  if (r8.__err) no('[8] 평가 실패 — ' + r8.__err);
  else {
    console.log('       at:개수 ' + r8.join(' '));
    const ns = uniq(r8.map((s) => +s.split(':')[1]));
    is(ns.length > 1, '[8-a] 애니 위상만 흔들어도 개수가 갈린다 — ' + JSON.stringify(ns) +
      ' (= 바가 플레이어 스프라이트에 먹힌다)');
  }

  /* ⑨ 처방 후보 — 표본을 플레이어에서 떼면 결정적인가 (여러 페이지) */
  console.log('\n[9] 처방 후보 — 표본을 플레이어 위쪽으로 뗀 자리에서 6번 새로 연다');
  const r9 = [];
  for (let i = 0; i < 6; i++) {
    const p = await open(ctx, 'file://' + SRC);
    if (p.dim && p.dim.__err) { no('[9] ' + i + '회 하네스 실패'); await p.page.close(); continue; }
    const v = await p.ev(() => {
      const T = window.__t372, e = T.mk('zombie');
      T.put(e, VW / 2, VH / 2 - 260);
      const q = T.scan([255, 107, 138]);
      return { n: q.n, x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1, pty: player.y + camOy, pat: player.at };
    });
    r9.push(v.__err ? -1 : v.n);
    console.log('       #' + i + (v.__err ? ' 평가실패' : ' n ' + v.n + ' · x ' + v.x0.toFixed(1) + '..' + v.x1.toFixed(1) +
      ' · y ' + v.y0.toFixed(1) + '..' + v.y1.toFixed(1) + ' · player 화면y ' + v.pty.toFixed(1) + ' at ' + (+v.pat).toFixed(2)));
    await p.page.close();
  }
  is(uniq(r9).length === 1 && r9[0] > 0, '[9-a] 플레이어에서 뗀 자리 — 값 ' + uniq(r9).length + '가지 ' + JSON.stringify(uniq(r9)));

  is(cur.errs.length === 0, '[10] 콘솔/페이지 오류 ' + cur.errs.length + '건' + (cur.errs.length ? ' — ' + cur.errs[0].slice(0, 140) : ''));

  await browser.close();
  console.log('\nPROBE372 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
