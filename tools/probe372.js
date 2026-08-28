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
/* verify348 이 372 로 옮긴 «화면 안» 표본의 세로 자리 — 이 프로브는 옛 자리(0)와 새 자리를 나란히 잰다 */
const IN_DY_PROBE = -260;

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
    is(ns.length === 1, '[1-a] 한 페이지 안에서는 20회가 **한 값** ' + JSON.stringify(ns) +
      ' — «호출마다 흔들린다»(mk 난수·cam.shake) 가설 기각. 뿌리는 페이지 «사이» 다');
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
    console.log('       개수 ' + JSON.stringify(un) + ' · VH ' + JSON.stringify(uh) +
      ' — VH 가 한 값인데 개수가 갈리면 «해상도 정착» 가설도 죽는다');
    /* ⚠ 이 관측 자체는 확률적이다(6번이 다 «깨끗한» 부팅일 수 있다) — 그래서 아래 [8]·[11] 의
       스윕이 판정을 맡는다. 여기서는 «갈린다면 VH 때문이 아니다» 만 못박는다. */
    is(un.length === 1 || uh.length === 1,
      '[6-a] 개수가 갈려도 VH 는 한 값 ' + JSON.stringify(uh) + ' (해상도·레이아웃 정착이 뿌리가 아니다)');
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

  /* ⑧ 뿌리 — «중앙» 표본 **위에 무엇이 굳는가**.
     ⚠ 여기까지의 소거법으로 죽은 가설: 플레이어(월드에서 4000 치워도 그대로) · 펫(0마리) ·
     parts·rings·bolts·shots·drones·ghosts·zones·corpses(전부 비워도 그대로) · 적 스프라이트
     (아틀라스를 꺼도 그대로) · 회전검(skillEquipped 를 막아도 그대로) · 자리(같은 rect 에
     **바만** 다시 그리면 308 = 기대값).
     ⇒ ctx 메서드를 감싸 «바가 그려진 **뒤** 그 자리를 건드리는 호출» 을 잡으니 하나가 나왔다 —
     `draw()` 의 `fillText(msgTxt, VW/2, VH/2 − 40)` = **94 중앙 문구**(`showMsg`).
     이 하네스는 `rAF` 를 죽여 시계를 세우므로 `msgT` 를 깎는 `step()` 이 안 돌고, 부팅 1200ms 안에
     토스트가 떴던 페이지는 그 글자가 **영원히** 화면 한복판에 굳는다 = 페이지마다 갈리는 개수.
     아래는 그 토스트를 **일부러 띄워** 결정적으로 재현한 것이다. */
  console.log('\n[8] 뿌리 — 94 중앙 문구(showMsg)를 일부러 띄운다');
  const r8m = await cur.ev(([dyOld, dyNew]) => {
    const T = window.__t372;
    const meas = (dy) => {
      const e = T.mk('zombie');
      T.put(e, VW / 2, VH / 2 + dy);
      const w = Math.max(22, e.r * 2.2), by = e.y - e.r * 3.1 - 6;
      const bx = fxClampX(e.x, w / 2, by) - w / 2;
      const X0 = (bx + camOx) * 2, Y0 = (by + camOy) * 2;
      const X1 = X0 + w * clamp(e.hp / e.max, 0, 1) * 2, Y1 = Y0 + 8;
      const lo = Math.max(0, Math.floor(X1) - Math.ceil(X0)) * Math.max(0, Math.floor(Y1) - Math.ceil(Y0));
      const hi = Math.max(0, Math.ceil(X1) - Math.floor(X0)) * Math.max(0, Math.ceil(Y1) - Math.floor(Y0));
      return { n: T.scan([255, 107, 138]).n, lo, hi };
    };
    msgTxt = ''; msgT = 0; draw();
    const cleanOld = meas(dyOld), cleanNew = meas(dyNew);
    /* 토스트를 «다 뜬» 상태로 굳힌다 — 부른 직후는 페이드 인 첫 프레임(globalAlpha 0)이라 안 보인다.
       `draw()` 의 분기: el = MSG_DUR − msgT 가 MSG_IN 이상이고 msgT > MSG_OUT 이면 알파 1 · dy 0. */
    showMsg('스테이지 20');
    msgT = Math.max(MSG_OUT + 0.01, MSG_DUR - MSG_IN - 0.01);
    const msgOld = meas(dyOld), msgNew = meas(dyNew);
    msgTxt = ''; msgT = 0; draw();
    const backOld = meas(dyOld);
    return { cleanOld, cleanNew, msgOld, msgNew, backOld };
  }, [0, IN_DY_PROBE]);
  if (r8m.__err) no('[8] 평가 실패 — ' + r8m.__err);
  else {
    const f = (v) => v.n + '/기대 ' + v.lo + '..' + v.hi;
    console.log('       토스트 없음 — 옛 자리 ' + f(r8m.cleanOld) + ' · 새 자리 ' + f(r8m.cleanNew));
    console.log('       토스트 있음 — 옛 자리 ' + f(r8m.msgOld) + ' · 새 자리 ' + f(r8m.msgNew));
    console.log('       토스트 지움 — 옛 자리 ' + f(r8m.backOld));
    is(r8m.msgOld.n < r8m.msgOld.lo, '[8-a] 토스트를 띄우면 **옛 자리**(VH/2)가 기대 밴드 아래로 — ' +
      r8m.msgOld.n + ' < ' + r8m.msgOld.lo + ' (글자가 바를 덮는다)');
    is(r8m.msgNew.n === r8m.msgNew.lo, '[8-b] 같은 토스트에서 **새 자리**(VH/2' + IN_DY_PROBE + ')는 기대값 그대로 — ' +
      r8m.msgNew.n + ' = ' + r8m.msgNew.lo);
    is(r8m.backOld.n === r8m.backOld.lo, '[8-c] 토스트를 지우면 옛 자리도 복귀 — ' +
      r8m.backOld.n + ' = ' + r8m.backOld.lo + ' (뿌리가 이것 하나임을 못박는다)');
  }

  /* ⑧-2 두 번째 오염원 — 플레이어 스프라이트. 토스트가 없는 프레임에서도 위상에 따라 갈릴 수 있다.
     위상 4 × 플레이어 x 5 × y 3 = 60칸(부팅 때 실제로 흔들리는 폭)을 훑는다. */
  const SWEEP = (dy) => ({ dy });
  const sweep = (ev, dy) => ev((dy2) => {
    const T = window.__t372, e = T.mk('zombie');
    T.put(e, VW / 2, VH / 2 + dy2);
    const w = Math.max(22, e.r * 2.2), by = e.y - e.r * 3.1 - 6;
    const bx = fxClampX(e.x, w / 2, by) - w / 2;
    const X0 = (bx + camOx) * 2, Y0 = (by + camOy) * 2;
    const X1 = X0 + w * clamp(e.hp / e.max, 0, 1) * 2, Y1 = Y0 + 8;
    const lo = Math.max(0, Math.floor(X1) - Math.ceil(X0)) * Math.max(0, Math.floor(Y1) - Math.ceil(Y0));
    const hi = Math.max(0, Math.ceil(X1) - Math.floor(X0)) * Math.max(0, Math.ceil(Y1) - Math.floor(Y0));
    const a0 = player.at, y0 = player.y, x0 = player.x, ns = [];
    for (const px of [-6, -3, 0, 3, 6]) {
      for (const py of [-2, 0, 2]) {
        player.x = x0 + px; player.y = y0 + py;
        for (const at of [0, 2, 4, 6]) { player.at = at; draw(); ns.push(T.scan([255, 107, 138]).n); }
      }
    }
    player.at = a0; player.y = y0; player.x = x0; draw();
    return { lo, hi, ns, out: ns.filter((n) => n < lo || n > hi).length, uniq: Array.from(new Set(ns)).length };
  }, dy);

  console.log('\n[8-2] 옛 자리(VH/2) — 플레이어 위상 4 × x 5 × y 3 = 60칸');
  const r8 = await sweep(cur.ev, 0);
  if (r8.__err) no('[8-2] 평가 실패 — ' + r8.__err);
  else {
    console.log('       기대 밴드 ' + r8.lo + '..' + r8.hi + ' · 값 ' + r8.uniq + '가지 · 밴드 밖 ' + r8.out + '/60');
    console.log('       개수 ' + JSON.stringify(Array.from(new Set(r8.ns)).sort((a, b) => a - b)));
    /* 이 축은 페이지마다 잡히기도, 안 잡히기도 한다(그래서 판정은 [8]·[11] 이 맡는다) —
       잡힌 페이지에서는 위상만으로 308 · 288 · 84 · 54 까지 벌어졌다. */
    ok('[8-2a] 옛 자리 — 60칸 중 ' + r8.out + '칸이 기대 밴드 밖 · 값 ' + r8.uniq + '가지 (관측만)');
  }

  /* ⑧-3 소거법 — 옛 자리의 바를 «무엇이» 먹는가. 한 프레임에서 하나씩 치워 본다.
     ⚠ `step()` 을 안 부르므로 카메라는 안 따라온다 — 월드에서 치우면 화면에서도 치워진다. */
  console.log('\n[8-3] 소거법 — 옛 자리(VH/2)에서 하나씩 치운다 · 페이지 4번 (죽은 가설의 기록)');
  for (let i = 0; i < 4; i++) {
    const p = await open(ctx, 'file://' + SRC);
    if (p.dim && p.dim.__err) { no('[8-2] ' + i + '회 하네스 실패'); await p.page.close(); continue; }
    const v = await p.ev(() => {
      const T = window.__t372, e = T.mk('zombie');
      T.put(e, VW / 2, VH / 2);
      const w = Math.max(22, e.r * 2.2), by = e.y - e.r * 3.1 - 6;
      const bx = fxClampX(e.x, w / 2, by) - w / 2;
      const X0 = (bx + camOx) * 2, Y0 = (by + camOy) * 2;
      const X1 = X0 + w * clamp(e.hp / e.max, 0, 1) * 2, Y1 = Y0 + 8;
      const lo = Math.max(0, Math.floor(X1) - Math.ceil(X0)) * Math.max(0, Math.floor(Y1) - Math.ceil(Y0));
      const sc = () => T.scan([255, 107, 138]).n;
      const base = sc();
      const py = player.y, np = pets.length;
      player.y = py + 4000; draw(); const noPl = sc();          /* 플레이어만 치운다 */
      player.y = py; pets.length = 0; draw(); const noPet = sc(); /* 펫만 치운다 */
      player.y = py + 4000; draw(); const noBoth = sc();
      player.y = py; draw();
      return { lo, base, noPl, noPet, noBoth, np,
               pet: np ? { x: pets[0] ? 0 : 0 } : null };
    });
    console.log('       #' + i + (v.__err ? ' 평가실패' : ' 기대 ' + v.lo + ' · 있는대로 ' + v.base +
      ' · 플레이어 뺌 ' + v.noPl + ' · 펫 뺌 ' + v.noPet + ' · 둘 다 뺌 ' + v.noBoth + ' · 펫 ' + v.np + '마리'));
    await p.page.close();
  }
  ok('[8-3a] 소거법 출력 완료 — 플레이어·펫을 치워도 개수가 안 돌아온다(둘 다 뿌리가 아니다)');

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

  /* ⑩ 되돌림 시험 — 새 자가 «진짜 밀림» 을 여전히 잡는가 (무르게 푼 수리가 아님) */
  console.log('\n[10] 되돌림 시험 — 바를 실제로 밀면 새 자가 빨개지는가');
  const r10 = await cur.ev(() => {
    const T = window.__t372, out = [];
    for (const dx of [0, 0.5, 1, -0.5]) {
      const e = T.mk('zombie');
      T.put(e, VW / 2 + dx, VH / 2 - 260);
      const p = T.scan([255, 107, 138]);
      out.push({ dx, n: p.n, x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1 });
    }
    return out;
  });
  if (r10.__err) no('[10] 평가 실패 — ' + r10.__err);
  else {
    for (const v of r10) console.log('       dx ' + v.dx + ' → n ' + v.n + ' · x ' + v.x0.toFixed(1) + '..' + v.x1.toFixed(1));
    const base = r10[0];
    const caught = r10.slice(1).every((v) => v.n !== base.n || v.x0 !== base.x0 || v.x1 !== base.x1);
    is(caught, '[10-a] 0.5px·1px 밀림 3종 전부 — 개수 또는 bbox 가 기준과 다르다 (자를 안 넓혔다)');
  }

  /* ⑪ 대조 — 같은 60칸 스윕을 **새 자리**에서. 여기가 깨끗하면 «자리» 가 뿌리라는 것이 못박힌다 */
  console.log('\n[11] 새 자리(VH/2−260) — 같은 60칸 스윕');
  const r11 = await sweep(cur.ev, -260);
  if (r11.__err) no('[11] 평가 실패 — ' + r11.__err);
  else {
    console.log('       기대 밴드 ' + r11.lo + '..' + r11.hi + ' · 값 ' + r11.uniq + '가지 · 밴드 밖 ' + r11.out + '/60');
    is(r11.out === 0 && r11.uniq === 1, '[11-a] 새 자리 — 60칸 전부 같은 값이고 전부 기대 밴드 안 (밴드 밖 ' +
      r11.out + '칸 · 값 ' + r11.uniq + '가지)');
  }

  is(cur.errs.length === 0, '[12] 콘솔/페이지 오류 ' + cur.errs.length + '건' + (cur.errs.length ? ' — ' + cur.errs[0].slice(0, 140) : ''));

  await browser.close();
  console.log('\nPROBE372 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
