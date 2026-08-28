#!/usr/bin/env node
/* 작업 348 게이트 — «화면 밖 몬스터의 HP바는 안 그린다» (ROUTINE [3]-(가) 수치 검증 · 비평가 없음)
 *
 *   node tools/verify348.js
 *
 * 주인 원문: «몬스터들 화면 벗어났는데 hp바 보여주는거 괜히 거슬림. 그거 빼셈»
 *
 * 재는 자 — **찍힌 픽셀**이다(350 교훈). HP바는 `fillRect` 로 불투명 단색을 깐다:
 *   일반 적 `#ff6b8a`(255,107,138) · 보스류 `#ffca5c`(255,202,92).
 * 상태값이나 rect 가 아니라 캔버스에 실제로 들어간 그 색의 «개수와 자리» 를 읽는다.
 *
 * 절 구성 ────────────────────────────────────────────────────────────────────────
 *   §1 판정식      — `eOnScreen` 이 네 방향 전부에서 갈리는가(경계 ±1px 포함)
 *   §2 화면 밖     — 네 방향 × 일반/보스, 바 픽셀 0
 *   §3 화면 안 불변 — 중앙·좌끝(사이드 열)·우끝·반쯤 걸침에서 바가 그대로 · **클램프 규약(13회차) 유지**
 *   §4 복귀·왕복   — 같은 적을 밖 → 안 → 밖 으로 옮기면 바가 그대로 사라졌다 돌아온다
 *   §5 카메라 축   — 적은 안 움직이고 **카메라만** 밀어도 사라진다(월드 좌표가 아니라 화면 좌표로 판정하는가)
 *   §6 옛 규약 불변 — `hp === max` 는 화면 안이어도 여전히 안 그린다 · `fxClampX` 는 다른 연출이 계속 쓴다
 *   §R 되돌림 시험 — 가시성 검사를 뺀 사본에서는 §2 가 **빨개진다**(무르게 푼 수리가 아님의 증명)
 *
 * ⚠ `file://` 은 아틀라스가 캔버스를 오염시켜 getImageData 가 SecurityError 다 →
 *    측정 전용으로 `--allow-file-access-from-files` 를 켠다(제품 코드와 무관).
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const GUARD = 'if(e.hp < e.max && grow >= 1 && eOnScreen(e)){';
const GUARD_OLD = 'if(e.hp < e.max && grow >= 1){';

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (c, m) => (c ? ok(m) : no(m));

/* 페이지 안에서 쓸 공용 하네스 — 문자열로 넣어 «수리 전» 사본에도 똑같이 건다 */
const HARNESS = () => {
  window.requestAnimationFrame = () => 0;                 /* 유일한 시계는 아래 draw() 다 */
  localStorage.clear(); Object.assign(S, DEF());
  S.stage = 20; S.best = 20; S.guide.idx = 99;
  if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
  spawnStage(); step(1 / 60);
  window.__t348 = {
    /* 적 한 마리만 남기고 «바가 그려질 조건» 으로 세운다 */
    mk(tk, hpR) {
      enemies.length = 0; spawnQ.length = 0;
      makeEnemy(tk || 'zombie');
      const e = enemies[enemies.length - 1];
      e.born = 1; e.hp = e.max * (hpR === undefined ? 0.6 : hpR);
      return e;
    },
    /* 화면 좌표(게임px)로 적을 놓는다 — 카메라 오프셋은 draw() 가 굳힌 값을 쓴다 */
    put(e, sx, sy) { draw(); e.x = sx - camOx; e.y = sy - camOy; draw(); },
    /* 찍힌 픽셀에서 그 색을 센다 → { n, x0, x1, y0 } (게임px) */
    scan(rgb) {
      const g = cvs.getContext('2d');
      const d = g.getImageData(0, 0, cvs.width, cvs.height).data;
      let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] === rgb[0] && d[i + 1] === rgb[1] && d[i + 2] === rgb[2] && d[i + 3] === 255) {
          const p = (i / 4) | 0, x = p % cvs.width, y = (p / cvs.width) | 0;
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y;
        }
      }
      return n ? { n, x0: x0 / 2, x1: x1 / 2, y0: y0 / 2 } : { n: 0 };
    },
  };
  return { VW, VH };
};

const PINK = [255, 107, 138], GOLD = [255, 202, 92];

/* 한 브라우저 안에서 «현재 파일» 과 «수리 전 사본» 을 같은 순서로 잰다 */
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

/* 화면 밖 표본 — [이름, 화면좌표 식(VW계수, VW상수, VH계수, VH상수)] */
const OUT = [
  ['좌', [0, -200, 0.5, 0]],
  ['우', [1, 200, 0.5, 0]],
  ['위', [0.5, 0, 0, -200]],
  ['아래', [0.5, 0, 1, 200]],
];
const IN = [
  ['중앙', [0.5, 0, 0.5, 0]],
  ['좌끝(사이드 아이콘 열 위)', [0, 30, 0.5, 0]],
  ['우끝', [1, -30, 0.5, 0]],
  ['반쯤 걸침(좌)', [0, 6, 0.5, 0]],
];

/* «그 자리에 놓고 바 픽셀을 센다» 를 한 번의 evaluate 로 — 왕복 사이에 상태가 흔들리지 않게 */
const shotAt = (ev, spec, tk, rgb, hpR) => ev(([p, tk2, rgb2, hp2]) => {
  const T = window.__t348, e = T.mk(tk2, hp2);
  T.put(e, VW * p[0] + p[1], VH * p[2] + p[3]);
  return T.scan(rgb2);
}, [spec, tk, rgb, hpR]);

(async () => {
  console.log('=== VERIFY 348 — 화면 밖 몬스터 HP바 제거 ===\n');
  const src = fs.readFileSync(SRC, 'utf8');
  if (!src.includes(GUARD)) {
    console.log('  NO   [전제] index.html 에 가시성 검사(`eOnScreen(e)`)가 없다 — 수리가 사라졌다');
    console.log('\nVERIFY348 0/1 — FAIL 1');
    process.exit(1);
  }
  /* §R 용 «수리 전» 사본. 상대 경로 자산 때문에 반드시 같은 폴더에 둔다(probe350 함정) */
  const revPath = path.join(path.dirname(SRC), '.verify348-rev.html');
  fs.writeFileSync(revPath, src.replace(GUARD, GUARD_OLD));
  process.on('exit', () => { try { fs.unlinkSync(revPath); } catch (e) {} });

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const cur = await open(ctx, 'file://' + SRC);
  if (cur.dim && cur.dim.__err) { console.log('  NO   [전제] 하네스 실패: ' + cur.dim.__err); process.exit(1); }
  ok('[전제] 하네스 — 스테이지 전투 부팅 · VW ' + cur.dim.VW + ' · VH ' + cur.dim.VH.toFixed(0));

  /* ═══ §1 판정식 ═══════════════════════════════════════════════════════════════ */
  console.log('\n[1] 판정식 — eOnScreen 이 네 방향 전부에서 갈리는가 (경계 ±1px)');
  {
    const r = await cur.ev(() => {
      if (typeof eOnScreen !== 'function') return { err: 'eOnScreen 이 없다' };
      draw();
      const R = 20, at = (sx, sy) => eOnScreen({ x: sx - camOx, y: sy - camOy, r: R });
      return {
        mid: at(VW / 2, VH / 2),
        /* 가로 — 몸통 오른쪽 끝이 0 을 지나는 순간 · 왼쪽 끝이 VW 를 지나는 순간 */
        lIn: at(-R + 1, VH / 2), lOut: at(-R - 1, VH / 2),
        rIn: at(VW + R - 1, VH / 2), rOut: at(VW + R + 1, VH / 2),
        /* 세로 — 발밑(e.y)이 0 을 지나는 순간 · 머리(e.y − 2r)가 VH 를 지나는 순간 */
        tIn: at(VW / 2, 1), tOut: at(VW / 2, -1),
        bIn: at(VW / 2, VH + 2 * R - 1), bOut: at(VW / 2, VH + 2 * R + 1),
      };
    });
    if (r.err || r.__err) no('[1] 평가 실패 — ' + (r.err || r.__err));
    else {
      is(r.mid === true, '[1-a] 화면 중앙 = 보임');
      is(r.lIn === true && r.lOut === false, '[1-b] 좌 경계 — 몸통 오른끝 +1px 안 = 보임 · −1px 밖 = 안 보임');
      is(r.rIn === true && r.rOut === false, '[1-c] 우 경계 — 몸통 왼끝 −1px 안 = 보임 · +1px 밖 = 안 보임');
      is(r.tIn === true && r.tOut === false, '[1-d] 위 경계 — 발밑이 화면 안 = 보임 · 위로 벗어나면 안 보임');
      is(r.bIn === true && r.bOut === false, '[1-e] 아래 경계 — 머리가 화면 안 = 보임 · 아래로 벗어나면 안 보임');
    }
  }

  /* ═══ §2 화면 밖 — 바 픽셀 0 ═════════════════════════════════════════════════ */
  console.log('\n[2] 화면 밖 — 일반 적 4방향 · 보스 4방향, 바 픽셀 0');
  const outCur = {};
  for (const [nm, spec] of OUT) {
    const p = await shotAt(cur.ev, spec, 'zombie', PINK);
    outCur[nm] = p;
    is(!p.__err && p.n === 0, '[2-a] 일반 적 ' + nm + ' 밖 — 분홍(#ff6b8a) 픽셀 ' + (p.__err ? '평가 실패' : p.n));
  }
  for (const [nm, spec] of OUT) {
    const p = await shotAt(cur.ev, spec, 'boss', GOLD);
    is(!p.__err && p.n === 0, '[2-b] 보스 ' + nm + ' 밖 — 금색(#ffca5c) 픽셀 ' + (p.__err ? '평가 실패' : p.n));
  }

  /* ═══ §3 화면 안 불변 ════════════════════════════════════════════════════════ */
  console.log('\n[3] 화면 안 — 바가 그대로 그려지고 클램프 규약(13회차)도 그대로');
  const inCur = {};
  for (const [nm, spec] of IN) {
    const p = await shotAt(cur.ev, spec, 'zombie', PINK);
    inCur[nm] = p;
    is(!p.__err && p.n > 0, '[3-a] ' + nm + ' — 바 픽셀 ' + (p.__err ? '평가 실패' : p.n) + (p.n ? ' (x ' + p.x0.toFixed(1) + '..' + p.x1.toFixed(1) + ')' : ''));
  }
  {
    /* 13회차 규약 — 좌측 끝 적의 바는 사이드 아이콘 열 **밖(오른쪽)** 으로 밀려 있어야 한다 */
    const sb = await cur.ev(() => (sideBox ? { x2: sideBox.x2 } : { x2: null }));
    const p = inCur['좌끝(사이드 아이콘 열 위)'];
    if (!sb || sb.__err || sb.x2 == null) no('[3-b] sideBox 를 못 읽었다 — 클램프 규약을 잴 수 없다');
    else is(p && p.n > 0 && p.x0 >= sb.x2, '[3-b] 좌끝 적의 바 좌변 ' + (p && p.n ? p.x0.toFixed(1) : '—') +
      ' ≥ 사이드 열 우변 ' + sb.x2.toFixed(1) + ' (클램프가 살아 있다)');
    const q = inCur['우끝'];
    is(q && q.n > 0 && q.x1 <= 540 - 24 + 0.5, '[3-c] 우끝 적의 바 우변 ' + (q && q.n ? q.x1.toFixed(1) : '—') + ' ≤ VW−24');
  }

  /* ═══ §4 복귀·왕복 ═══════════════════════════════════════════════════════════ */
  console.log('\n[4] 복귀 — 같은 적을 밖 → 안 → 밖 으로 옮긴다');
  {
    const r = await cur.ev(([rgb]) => {
      const T = window.__t348, e = T.mk('zombie');
      const at = (sx, sy) => { T.put(e, sx, sy); return T.scan(rgb).n; };
      return {
        out1: at(VW + 300, VH / 2),
        in1: at(VW / 2, VH / 2),
        out2: at(-300, VH / 2),
        in2: at(VW / 2, VH / 2),
      };
    }, [PINK]);
    if (r.__err) no('[4] 평가 실패 — ' + r.__err);
    else {
      is(r.out1 === 0 && r.out2 === 0, '[4-a] 밖에 있는 두 프레임 = 0 · 0 (실제 ' + r.out1 + ' · ' + r.out2 + ')');
      is(r.in1 > 0 && r.in2 > 0, '[4-b] 안으로 돌아오면 복귀 = ' + r.in1 + ' · ' + r.in2);
      is(r.in1 === r.in2, '[4-c] 왕복해도 같은 그림 (' + r.in1 + ' = ' + r.in2 + ')');
    }
  }

  /* ═══ §5 카메라 축 ═══════════════════════════════════════════════════════════ */
  console.log('\n[5] 카메라 축 — 적은 그대로 두고 카메라만 밀어도 사라지는가');
  {
    const r = await cur.ev(([rgb]) => {
      const T = window.__t348, e = T.mk('zombie');
      T.put(e, VW / 2, VH / 2);
      const before = T.scan(rgb).n;
      const wx = e.x, wy = e.y, cx0 = cam.x;
      cam.x = cam.x + VW * 3;                    /* 적은 한 px 도 안 움직인다 */
      draw();
      const moved = T.scan(rgb).n, same = (e.x === wx && e.y === wy);
      cam.x = cx0; draw();
      return { before, moved, back: T.scan(rgb).n, same };
    }, [PINK]);
    if (r.__err) no('[5] 평가 실패 — ' + r.__err);
    else {
      is(r.same === true, '[5-a] 적의 월드 좌표는 한 px 도 안 움직였다');
      is(r.before > 0 && r.moved === 0, '[5-b] 카메라만 밀면 바가 사라진다 (' + r.before + ' → ' + r.moved + ')');
      is(r.back === r.before, '[5-c] 카메라를 되돌리면 그대로 복귀 (' + r.back + ')');
    }
  }

  /* ═══ §6 옛 규약 불변 ════════════════════════════════════════════════════════ */
  console.log('\n[6] 옛 규약 — 만피는 여전히 침묵 · fxClampX 는 다른 연출이 계속 쓴다');
  {
    const full = await shotAt(cur.ev, IN[0][1], 'zombie', PINK, 1);
    is(!full.__err && full.n === 0, '[6-a] hp === max 는 화면 안이어도 바 없음 — 픽셀 ' + (full.__err ? '평가 실패' : full.n));
    const body = src.slice(src.indexOf('function fxClampX'));
    const uses = (src.match(/fxClampX\(/g) || []).length;
    is(uses >= 3, '[6-b] `fxClampX` 호출부 ' + uses + '곳 — 정의 1 + 호출 2 이상(HP바 말고 다른 연출도 쓴다)');
    is(/const bx = fxClampX\(e\.x, w\/2, by\)/.test(src), '[6-c] HP바는 «보일 때» 여전히 클램프로 그린다(사이드 열 회피 규약)');
    is(!/function eOnScreen[\s\S]{0,400}?VW[\s\S]{0,200}?\bWORLD\b/.test(body.slice(0, 600)),
      '[6-d] 가시성 판정이 WORLD 가 아니라 뷰포트(VW·VH) 자다');
  }

  /* ═══ §R 되돌림 시험 ═════════════════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험 — 가시성 검사를 뺀 사본에서는 §2 가 빨개져야 한다');
  {
    const rev = await open(ctx, 'file://' + revPath);
    if (rev.dim && rev.dim.__err) no('[R] 사본 하네스 실패 — ' + rev.dim.__err);
    else {
      let drawn = 0, seen = 0;
      for (const [nm, spec] of OUT) {
        const p = await shotAt(rev.ev, spec, 'zombie', PINK);
        if (!p.__err) { seen++; if (p.n > 0) drawn++; }
      }
      is(drawn > 0, '[R-a] 사본(수리 전) — 화면 밖 ' + seen + '자리 중 ' + drawn + '자리에서 바가 그려진다 (0이면 이 게이트는 헛초록이다)');
      const p = await shotAt(rev.ev, IN[0][1], 'zombie', PINK);
      is(!p.__err && p.n > 0 && inCur['중앙'] && p.n === inCur['중앙'].n,
        '[R-b] 사본과 현재 — 화면 안 중앙의 바는 픽셀까지 같다 (' + (p.n || 0) + ' = ' + ((inCur['중앙'] || {}).n || 0) + ') = 레이아웃 Δ0');
      is(rev.errs.length === 0, '[R-c] 사본 콘솔/페이지 오류 ' + rev.errs.length + '건');
    }
    await rev.page.close();
  }

  is(cur.errs.length === 0, '[7] 콘솔/페이지 오류 ' + cur.errs.length + '건' + (cur.errs.length ? ' — ' + cur.errs[0].slice(0, 140) : ''));

  await browser.close();
  console.log('\nVERIFY348 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
