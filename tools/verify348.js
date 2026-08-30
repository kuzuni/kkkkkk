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
/* 368 §R2 — «클램프를 뺀» 사본을 만드는 자리. [3-b] 가 무르게 풀린 항이 아님을 이것이 못박는다.
   ⚑ 442 이관 — 그리기 블록에 인라인으로 있던 이 줄이 공용 `eBarBox()` 안으로 들어갔다(자리를
   한 곳에서만 정한다). 자르는 자리만 그리로 옮겼고 §R2 가 묻는 것은 한 글자도 안 바뀐다. */
const CLAMP = 'return { x: fxClampX(e.x, w/2, y) - w/2, y, w, h };';
const CLAMP_OFF = 'return { x: e.x - w/2, y, w, h };';

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
  /* 372 — 부팅 토스트(94 중앙 문구)를 지운다. `msgT` 는 step() 이 깎는데 이 하네스는 시계를
     `rAF` 째로 세우므로, 부팅 1200ms 안에 토스트가 떴던 페이지는 그 글자가 **영원히** 화면
     한복판(VH/2 − 40)에 굳는다 — 화면 중앙 표본의 바 위에 그대로 얹힌다.
     `probe372` [8] 이 ctx 추적으로 찍은 자리가 이것이다(index.html `draw()` 의 fillText).
     제품 코드는 이미 같은 함정을 알고 있다 — 캡처 하네스 3곳이 `msgTxt=''; msgT=0` 으로
     연다(LESSONS 30-②). 게이트도 같은 자를 쓴다. */
  try { if (typeof msgT !== 'undefined') { msgTxt = ''; msgT = 0; } } catch (e) {}
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
      let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] === rgb[0] && d[i + 1] === rgb[1] && d[i + 2] === rgb[2] && d[i + 3] === 255) {
          const p = (i / 4) | 0, x = p % cvs.width, y = (p / cvs.width) | 0;
          n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return n ? { n, x0: x0 / 2, x1: x1 / 2, y0: y0 / 2, y1: y1 / 2 } : { n: 0 };
    },
    /* 372 — 그 적의 바가 **가려지지 않았다면** 나와야 할 «정확한 색» 픽셀 수의 상·하한.
       불투명 단색 fillRect 하나이므로 개수는 «온전히 덮인 칸»(lo) 이상, «걸친 칸 전부»(hi) 이하다.
       무엇이 바 위에 올라오면 lo 아래로, 다른 데서 같은 색이 새면 hi 위로 나간다.
       그리기와 **같은 식**을 쓴다(index.html HP바 블록) — 상수를 새로 만들지 않는다.
       ⚑ 442 이관 — 식을 여기 다시 «적지» 않고 **제품 `eBarBox(e)` 에게 묻는다**(368 처방).
       옛 사본(`e.y − e.r*3.1 − 6`)은 442 가 앵커를 «그려진 잉크 윗변» 으로 갈아 끼운 순간 낡았다.
       폴백(옛 식)은 `eBarBox` 가 없는 **수리 전 사본**(§R)에서만 쓰인다. */
    band(e) {
      const b = typeof eBarBox === 'function'
        ? eBarBox(e)
        : (() => { const w = Math.max(22, e.r * 2.2), h = 4, by = e.y - e.r * 3.1 - 6;
                   return { x: fxClampX(e.x, w / 2, by) - w / 2, y: by, w, h }; })();
      const w = b.w, h = b.h, bx = b.x;
      const X0 = (bx + camOx) * 2, Y0 = (b.y + camOy) * 2;
      const X1 = X0 + w * clamp(e.hp / e.max, 0, 1) * 2, Y1 = Y0 + h * 2;
      const cols = Math.max(0, Math.floor(X1) - Math.ceil(X0)), rows = Math.max(0, Math.floor(Y1) - Math.ceil(Y0));
      const colsH = Math.max(0, Math.ceil(X1) - Math.floor(X0)), rowsH = Math.max(0, Math.ceil(Y1) - Math.floor(Y0));
      return { lo: cols * rows, hi: colsH * rowsH };
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
/* 372 — «화면 안» 표본의 세로 자리. 화면 세로 한복판(VH/2)은 **플레이어가 서 있는 자리**다:
   카메라가 플레이어를 화면 중앙에 붙들어 두므로 그 행의 바는 플레이어 스프라이트 **밑에 깔린다**.
   `probe372` [8] — 다른 것을 한 톨도 안 건드리고 `player.at`(달리기 애니 위상)만 0~7 로 흔들면
   같은 자리의 «정확한 색» 개수가 **308 · 288 · 84 · 54** 로 갈린다. 페이지를 새로 열 때마다
   부팅 1200ms 동안 달린 위상이 달라지므로 [R-b]«사본과 현재가 픽셀까지 같다» 가 간헐적으로 빨갰다
   (등재문이 본 227·277·301·308 이 같은 축이다).
   ⚠ 자리를 **위로** 뗀다. 아래로 떼면 368 이 잡은 비네트(캔버스 중심에서 VH*0.34 ≈ 339px)
   밖으로 나가 «정확한 색» 이 0개가 되고, 130(상단 HUD 클립선) 위로 올라가도 안 된다.
   −260 은 그 사이(바 상변 게임px 180.3 · 중심에서 260 < 339)에서 플레이어 몸통을 완전히 벗어나는 자리다. */
const IN_DY = -260;
const IN = [
  ['중앙', [0.5, 0, 0.5, IN_DY]],
  ['우끝', [1, -30, 0.5, 0]],
  ['반쯤 걸침(좌)', [0, 6, 0.5, 0]],
];

/* «그 자리에 놓고 바 픽셀을 센다» 를 한 번의 evaluate 로 — 왕복 사이에 상태가 흔들리지 않게.
   372 — 같은 프레임에서 «가려지지 않았다면 나와야 할 개수»(band)도 같이 돌려준다. */
const shotAt = (ev, spec, tk, rgb, hpR) => ev(([p, tk2, rgb2, hp2]) => {
  const T = window.__t348, e = T.mk(tk2, hp2);
  T.put(e, VW * p[0] + p[1], VH * p[2] + p[3]);
  return Object.assign(T.scan(rgb2), T.band(e));
}, [spec, tk, rgb, hpR]);

/* 368 — «좌측 사이드 아이콘 열» 표본은 상수가 아니라 **제품에게 물어서** 만든다.
   종전에는 화면 세로 한복판(VH/2)에 박아 뒀는데, 그 자리는 348 이 실린 그때의 열 높이
   (게임px y 36..442)에서만 띠 «안» 이었다 — **360**(주인 지시 «출석·축복 크기·간격 통일»)이
   열을 14px 줄여 y2 442 → **428** 이 되자 바 상변 440.5 가 띠 밖(여유 +8 = 436)으로 빠졌고,
   `fxClampX` 는 **설계대로** 여백 24 만 먹였다(제품 결함이 아니라 표본이 자리를 잃은 것).
   ⇒ 자리를 `sideBox` 에서 만든다. 바 상변은 발밑에서 `e.r*3.1 + 6` 위 — 그리기와 **같은 식**이다.

   ⚠ 368 이 걸린 두 번째 함정 — **비네트**(index.html ~21012 `createRadialGradient(VW/2, VH/2, VH*.34, …)`).
   draw() 맨 끝에 화면 전체를 덮으므로, 캔버스 중심에서 `VH*0.34`(≈339px) 밖에 있는 바는 색이
   **살짝 어두워져**(#ff6b8a → 249,104,135) «정확한 색» 표본이 **0개**가 된다 — 350 의 «찍힌 픽셀» 자를
   쓰는 한 이건 상시 함정이다. 띠 세로 한복판(232)은 클램프 **뒤** 자리(x 78.5)는 안쪽이지만
   클램프 **전** 자리(x 22)는 바깥이라, §R2 가 «바가 아예 없다» 로 읽혔다.
   ⇒ 표본 행은 **띠 안에서 캔버스 세로 중심에 가장 가까운 행**으로 잡는다(비네트가 가장 옅은 자리).
   mode 'mid' = 그 행(양성항) · 'below' = 띠 아래 pad px(음성항). */
const shotBand = (ev, sx, mode, pad, tk, rgb) => ev(([sx2, md, pd, tk2, rgb2]) => {
  const T = window.__t348, sb = sideBox;
  if (!sb) return { __err: 'sideBox 가 null — 띠를 못 쟀다' };
  const e = T.mk(tk2);
  const top = md === 'mid' ? Math.max(sb.y1 + 8, Math.min(sb.y2 - 8, VH / 2)) : sb.y2 + pd;
  /* 442 이관 — «발밑에서 바 상변까지» 를 상수로 적지 않는다. 한 번 놓아 보고 **제품이 실제로 잡은**
     바 상변과 발밑의 차(`dy`)를 재서 그만큼 되민다. 앵커식이 또 바뀌어도 표본이 자리를 안 잃는다. */
  const barY = (o) => (typeof eBarBox === 'function' ? eBarBox(o).y : o.y - o.r * 3.1 - 6);
  T.put(e, sx2, top);
  const dy = barY(e) - e.y;
  T.put(e, sx2, top - dy);                         /* 바 상변이 top 에 오도록 발밑을 잡는다 */
  const p = T.scan(rgb2);
  return Object.assign(p, { barY: barY(e) + camOy, y1: sb.y1, y2: sb.y2, x2: sb.x2 });
}, [sx, mode, pad, tk, rgb]);

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
  /* 368 §R2 용 «클램프를 뺀» 사본 */
  const clpPath = path.join(path.dirname(SRC), '.verify348-noclamp.html');
  if (src.includes(CLAMP)) fs.writeFileSync(clpPath, src.replace(CLAMP, CLAMP_OFF));
  process.on('exit', () => {
    try { fs.unlinkSync(revPath); } catch (e) {}
    try { fs.unlinkSync(clpPath); } catch (e) {}
  });

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
    /* 372 — «중앙» 표본이 다시 플레이어 위로 돌아가면 이 항이 먼저 빨개진다.
       다른 것은 한 톨도 안 건드리고 달리기 애니 위상만 흔든다 — 자리가 깨끗하면 개수가 안 변한다.
       (수리 전 자리 VH/2 에서는 308 · 288 · 84 · 54 로 갈렸다 — `probe372` [8]) */
    const r = await cur.ev(([rgb, dy]) => {
      const T = window.__t348, e = T.mk('zombie'), out = [];
      T.put(e, VW / 2, VH / 2 + dy);
      const a0 = player.at;
      for (const at of [0, 1, 2, 3, 4, 5, 6, 7]) { player.at = at; draw(); out.push(T.scan(rgb).n); }
      player.at = a0; draw();
      return out;
    }, [PINK, IN_DY]);
    if (r.__err) no('[3-e] 평가 실패 — ' + r.__err);
    else {
      const u = Array.from(new Set(r));
      is(u.length === 1 && u[0] > 0, '[3-e] 중앙 표본은 플레이어 애니 위상 8종에서 같은 개수 — ' +
        u.length + '가지 ' + JSON.stringify(u) + ' (2가지 이상이면 표본이 플레이어 밑에 깔린 것이다)');
    }
  }
  {
    /* 13회차 규약 — 좌측 끝 적의 바는 사이드 아이콘 열 **밖(오른쪽)** 으로 밀려 있어야 한다.
       368 — 그 «자리» 는 sideBox 에서 만든다(위 shotBand 주석). */
    const p = await shotBand(cur.ev, 30, 'mid', 0, 'zombie', PINK);
    if (p.__err) no('[3-b] 좌끝 표본을 못 만들었다 — ' + p.__err);
    else {
      ok('[3-a] 좌끝(사이드 아이콘 열 위) — 바 픽셀 ' + p.n + (p.n ? ' (x ' + p.x0.toFixed(1) + '..' + p.x1.toFixed(1) + ')' : ''));
      /* 전제 — 표본이 실제로 띠 «안» 이어야 [3-b] 가 무언가를 묻는다(밖이면 헛초록이다) */
      is(p.barY > p.y1 - 8 && p.barY < p.y2 + 8,
        '[전제 3-b] 표본의 바 상변 ' + p.barY.toFixed(1) + ' 이 사이드 열 띠 ' +
        p.y1.toFixed(1) + '..' + p.y2.toFixed(1) + ' «안» 이다');
      is(p.n > 0 && p.x0 >= p.x2, '[3-b] 좌끝 적의 바 좌변 ' + (p.n ? p.x0.toFixed(1) : '—') +
        ' ≥ 사이드 열 우변 ' + p.x2.toFixed(1) + ' (클램프가 살아 있다)');
    }
    const q = inCur['우끝'];
    is(q && q.n > 0 && q.x1 <= 540 - 24 + 0.5, '[3-c] 우끝 적의 바 우변 ' + (q && q.n ? q.x1.toFixed(1) : '—') + ' ≤ VW−24');
    /* 368 음성항 — 클램프가 «상수» 가 아니라 «띠» 를 재는지. 띠 아래 자리에서는 여백 24 까지만 민다.
       (이 자리가 바로 360 이후 옛 표본이 흘러 들어간 곳이다 — 그때 24 는 결함이 아니라 설계다) */
    const r = await shotBand(cur.ev, 30, 'below', 60, 'zombie', PINK);
    if (r.__err) no('[3-d] 띠 아래 표본을 못 만들었다 — ' + r.__err);
    else is(r.n > 0 && r.barY > r.y2 + 8 && Math.abs(r.x0 - 24) <= 0.5,
      '[3-d] 띠 «아래»(바 상변 ' + r.barY.toFixed(1) + ' > ' + (r.y2 + 8).toFixed(1) + ') 적의 바 좌변 ' +
      (r.n ? r.x0.toFixed(1) : '—') + ' = 여백 24 — 클램프는 상수가 아니라 띠를 잰다');
  }

  /* ═══ §4 복귀·왕복 ═══════════════════════════════════════════════════════════ */
  console.log('\n[4] 복귀 — 같은 적을 밖 → 안 → 밖 으로 옮긴다');
  {
    const r = await cur.ev(([rgb, dy]) => {
      const T = window.__t348, e = T.mk('zombie');
      const at = (sx, sy) => { T.put(e, sx, sy); return T.scan(rgb).n; };
      return {
        out1: at(VW + 300, VH / 2),
        in1: at(VW / 2, VH / 2 + dy),          /* 372 — 플레이어가 서 있는 행을 피한다 */
        out2: at(-300, VH / 2),
        in2: at(VW / 2, VH / 2 + dy),
      };
    }, [PINK, IN_DY]);
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
    const r = await cur.ev(([rgb, dy]) => {
      const T = window.__t348, e = T.mk('zombie');
      T.put(e, VW / 2, VH / 2 + dy);           /* 372 — 플레이어가 서 있는 행을 피한다 */
      const before = T.scan(rgb).n;
      const wx = e.x, wy = e.y, cx0 = cam.x;
      cam.x = cam.x + VW * 3;                    /* 적은 한 px 도 안 움직인다 */
      draw();
      const moved = T.scan(rgb).n, same = (e.x === wx && e.y === wy);
      cam.x = cx0; draw();
      return { before, moved, back: T.scan(rgb).n, same };
    }, [PINK, IN_DY]);
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
    is(/x: fxClampX\(e\.x, w\/2, y\) - w\/2/.test(src), '[6-c] HP바는 «보일 때» 여전히 클램프로 그린다(사이드 열 회피 규약)');
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
      const c = inCur['중앙'] || {};
      /* 372 ① — 두 페이지를 비교하기 **전에**, 그 자리가 무엇에도 안 가려졌는지부터 묻는다.
         개수는 불투명 fillRect 하나의 면적이므로 «온전히 덮인 칸» 이상 «걸친 칸» 이하여야 한다.
         가려지면 lo 아래, 다른 데서 같은 색이 새면 hi 위로 나간다. */
      for (const [nm, q] of [['현재', c], ['사본', p]]) {
        is(!q.__err && q.n >= q.lo && q.n <= q.hi,
          '[전제 R-b] ' + nm + ' — 중앙 표본의 바 픽셀 ' + (q.n || 0) + ' 이 기하 기대 ' +
          (q.lo || 0) + '..' + (q.hi || 0) + ' 안이다 (밖이면 무언가가 바를 덮고 있다)');
      }
      is(!p.__err && p.n > 0 && c.n === p.n &&
         p.x0 === c.x0 && p.x1 === c.x1 && p.y0 === c.y0 && p.y1 === c.y1,
        '[R-b] 사본과 현재 — 화면 안 중앙의 바는 픽셀까지 같다 (' + (p.n || 0) + ' = ' + (c.n || 0) +
        ' · x ' + (p.x0 === undefined ? '—' : p.x0.toFixed(1) + '..' + p.x1.toFixed(1)) +
        ' · y ' + (p.y0 === undefined ? '—' : p.y0.toFixed(1) + '..' + p.y1.toFixed(1)) + ') = 레이아웃 Δ0');
      is(rev.errs.length === 0, '[R-c] 사본 콘솔/페이지 오류 ' + rev.errs.length + '건');
    }
    await rev.page.close();
  }

  /* ═══ §R2 되돌림 시험 — 368 ══════════════════════════════════════════════════
     [3-b] 를 «자리만 옮겨» 초록으로 되돌린 것이 무른 수리가 아님의 증명.
     클램프를 뺀 사본에서는 같은 표본·같은 술어가 **빨개져야** 한다. */
  console.log('\n[R2] 되돌림 시험(368) — 클램프를 뺀 사본에서는 [3-b] 가 빨개져야 한다');
  {
    if (!fs.existsSync(clpPath)) no('[R2] 클램프 사본을 못 만들었다 — 그리기 식이 바뀌었다(' + CLAMP + ' 없음)');
    else {
      const nc = await open(ctx, 'file://' + clpPath);
      if (nc.dim && nc.dim.__err) no('[R2] 사본 하네스 실패 — ' + nc.dim.__err);
      else {
        const p = await shotBand(nc.ev, 30, 'mid', 0, 'zombie', PINK);
        if (p.__err) no('[R2] 사본 표본 실패 — ' + p.__err);
        else {
          is(p.n > 0 && p.x0 < p.x2, '[R2-a] 사본(클램프 없음) — 좌끝 적의 바 좌변 ' +
            (p.n ? p.x0.toFixed(1) : '—') + ' < 사이드 열 우변 ' + p.x2.toFixed(1) +
            ' = 열 위를 덮는다 (0이면 [3-b] 는 헛초록이다)');
          /* 음성항 [3-d] 는 클램프를 빼도 24 근처일 수 있으므로 여기서 묻지 않는다 —
             §R2 가 재는 것은 «[3-b] 가 클램프에 매여 있는가» 하나다. */
        }
        is(nc.errs.length === 0, '[R2-b] 사본 콘솔/페이지 오류 ' + nc.errs.length + '건');
      }
      await nc.page.close();
    }
  }

  is(cur.errs.length === 0, '[7] 콘솔/페이지 오류 ' + cur.errs.length + '건' + (cur.errs.length ? ' — ' + cur.errs[0].slice(0, 140) : ''));

  await browser.close();
  console.log('\nVERIFY348 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
