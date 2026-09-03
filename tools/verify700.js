#!/usr/bin/env node
/* 700 게이트 — 유물 소환 배수 토글 ×1/×10/×100/×1000 (주인 지시 2026-09-02 02:10)
 *
 *   node tools/verify700.js
 *
 * 묻는 것은 여섯이다.
 *   [A] 부품   — 668·713 과 **같은 공용 셸**(`.stabs.sp4`)이고 칸 목록이 `SUM_MULS` 한 곳에서 온다
 *   [B] 자리   — 상인방 ↔ 격자 사이 «죽은 벽» · 폭 724 · 중심 540 · 하변이 격자 상변 −20 · 바닥 접합선 위
 *   [C] Δ0px   — 바를 얹어도 **89 의 어떤 요소도 안 움직인다**(수리 전 트리와 네 프레임 대조)
 *   [D] 라벨·가격 — 배수를 켜면 라벨·수량·가격이 **한 배수**를 따른다(주인 원문 «필요재화도 마찬가지»)
 *   [E]~[G] 동작 — 실제 클릭으로 뽑히는 장수·차감·부족 반려·닫으면 ×1 복귀
 *   [F] 등가성 — 씨앗 고정 «×1000 한 번 ↔ ×1 을 1000번» 이 **장부까지 같다**
 *   [I] 경계   — 탭바 레드닷(×1 축)은 배수를 **안 탄다**
 *   [R] 되돌림 — 배수를 읽는 자리를 지운 사본에서 이 자가 **실제로 빨개진다**
 *
 * ⚠ 사본은 저장소 루트에 둔다 — /tmp 는 `assets/**`·웹폰트가 404 라 «다른 것을 재게» 된다
 *   (probe700 §preTree 의 1회차 함정 · 360·367·438·541 선례). 이름에 pid(648 규약).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const G = require('./gitrev756');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1920, 2280, 2600];
const MULS = [1, 10, 100, 1000];
const SHELL_H = 98, BAR_W = 724, BAR_L = 178, GRID_GAP = 44, COST1 = 100;  /* GRID_GAP: 813 2회차 20 → 44 */
/* 867 — 바가 벽을 떠나 «받침 위» 로 내려오면서 «아래 이웃» 이 격자에서 받침으로 바뀌었다.
   GRID_GAP(44)은 **벽에 있던 시절의 값**이라 지우지 않고 계보로 남긴다(위 [B4] 주석). */
const PED_GAP = 12;

let pass = 0, fail = 0, hold = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const skip = (name, why) => { console.log('HOLD ' + name + ' — ' + why); hold++; };

async function open(browser, url, height) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.waitForTimeout(220);
  return { ctx, page };
}
/* 89 의 «움직이면 안 되는 것» 전부 — [C] 가 수리 전과 이 표를 통째로 견준다 */
const SNAP = `(() => {
  const R = s => { const e = document.querySelector(s); if (!e) return null;
    const q = e.getBoundingClientRect();
    return [+q.left.toFixed(2), +q.top.toFixed(2), +q.width.toFixed(2), +q.height.toFixed(2)]; };
  return { panel:R('.rw-panel'), grid:R('.rw-grid'), mid:R('.rw-mid'), basin:R('#rwBasin'),
    cost:R('#rwCost'), lab:R('#rwBasin>b'), cap:R('.rw-cap'), lintel:R('.rw-lintel'),
    floor:R('.rw-floor'), ground:R('.rw-ground'), steps:R('.rw-steps'), pcb:R('#relw .pcb') };
})()`;
const SEEDED = `(seed => { let s = seed >>> 0;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })(20260902)`;

function preTree() {
  let base;
  try { base = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch (_) { return { ok: false, env: true, why: 'merge-base 를 못 읽는다' }; }
  const r = G.ensure(base);
  if (!r.ok) return { ok: false, env: !!r.env, why: r.why || ('객체 없음: ' + base) };
  let src;
  try { src = execFileSync('git', ['show', base + ':index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); }
  catch (e) { return { ok: false, env: false, why: 'git show 실패: ' + e.message }; }
  const f = path.join(ROOT, '.v700-pre-' + process.pid + '.html');
  fs.writeFileSync(f, src);
  return { ok: true, file: f, url: 'file://' + f.replace(/\\/g, '/') };
}

(async () => {
  const browser = await launch(chromium);
  const tmp = [];

  /* ── [A] 부품 ─────────────────────────────────────────────────────────── */
  {
    const { ctx, page } = await open(browser, URL, 2280);
    const r = await page.evaluate(() => {
      S.relic = 1e9; openRelw();
      const bar = document.getElementById('rwMulBar');
      const cells = [...bar.querySelectorAll('[data-mul]')];
      return {
        host: bar.closest('#relw') ? 'relw' : 'other',
        cls: bar.className,
        n: cells.length,
        muls: cells.map(c => +c.dataset.mul),
        labs: cells.map(c => c.querySelector('i').textContent),
        on: cells.filter(c => c.classList.contains('on')).map(c => +c.dataset.mul),
        srcMuls: SUM_MULS.slice(),
        outside: document.querySelectorAll('[data-mul]').length
          - document.querySelectorAll('#relw [data-mul],#sumw [data-mul]').length
      };
    });
    ok(r.host === 'relw' && /\bstabs\b/.test(r.cls) && /\bsp4\b/.test(r.cls),
      '[A1] 부품 — 668·713 과 같은 공용 셸(`.stabs.sp4`)이고 호스트는 `#relw`', r.host + ' · ' + r.cls);
    ok(r.n === 4 && JSON.stringify(r.muls) === JSON.stringify(r.srcMuls),
      '[A2] 칸 목록은 `SUM_MULS` 한 곳에서 온다(마크업에 숫자를 두 벌 안 적는다)',
      r.muls.join('/') + ' ↔ SUM_MULS ' + r.srcMuls.join('/'));
    ok(JSON.stringify(r.labs) === JSON.stringify(MULS.map(m => '×' + m.toLocaleString('en-US'))),
      '[A3] 라벨은 «×n» 천단위 구분 — 713 과 같은 낱말', r.labs.join(' '));
    ok(r.on.length === 1 && r.on[0] === 1, '[A4] 활성 알약은 정확히 하나 · 기본은 ×1', r.on.join(','));
    ok(r.outside === 0, '[A5] 713 규약 — 배수 칸은 «토글이 보이는 두 화면» 밖에 0개',
      '밖 ' + r.outside + '개');
    await ctx.close();
  }

  /* ── [B] 자리 (네 프레임) ─────────────────────────────────────────────── */
  {
    const rows = [];
    for (const H of FRAMES) {
      const { ctx, page } = await open(browser, URL, H);
      rows.push(await page.evaluate(H => {
        S.relic = 1e9; openRelw();
        const R = s => { const q = document.querySelector(s).getBoundingClientRect();
          return { l: +q.left.toFixed(2), r: +q.right.toFixed(2), t: +q.top.toFixed(2),
            b: +q.bottom.toFixed(2), w: +q.width.toFixed(2), h: +q.height.toFixed(2) }; };
        const bar = R('#rwMulBar'), mid = R('.rw-mid'), grid = R('.rw-grid'),
          lin = R('.rw-lintel'), gnd = R('.rw-ground');
        /* 867 — 자리가 «벽» 에서 «받침 위» 로 내려오면서 이웃이 바뀌었다. 옛 이름(gapGrid ·
           clearLintel)은 **지우지 않는다** — [B5] 가 «바가 벽 밖에 있다» 를 그 값으로 묻는다. */
        const flr = R('.rw-floor');
        return { H, bar, gapGrid: +(grid.t - bar.b).toFixed(2), clearLintel: +(bar.t - lin.b).toFixed(2),
          overSeam: +(gnd.t - bar.b).toFixed(2),
          gapUp: +(bar.t - grid.b).toFixed(2),        /* 867 — 격자 하변 ↓ 바 (위 이웃) */
          gapDown: +(flr.t - bar.b).toFixed(2),       /* 867 — 바 ↓ 받침 상변 (아래 이웃) */
          overPed: +(flr.t - bar.b).toFixed(2),
          cxBar: +((bar.l + bar.r) / 2).toFixed(2), cxMid: +((mid.l + mid.r) / 2).toFixed(2) };
      }, H));
      await ctx.close();
    }
    const eq = (a, b) => Math.abs(a - b) < 0.01;
    ok(rows.every(r => eq(r.bar.h, SHELL_H)),
      '[B1] 셸 높이 98 — 96·437 규약(줄이면 `.stab.on` 정지점 표가 두 벌이 된다)',
      rows.map(r => r.H + ':' + r.bar.h).join(' · '));
    ok(rows.every(r => eq(r.bar.w, BAR_W) && eq(r.bar.l, BAR_L)),
      '[B2] 폭 724 = 4 × 181 · 좌 178 (713 이 쓴 칸 폭 그대로)',
      rows.map(r => r.H + ':' + r.bar.w + '@' + r.bar.l).join(' · '));
    ok(rows.every(r => eq(r.cxBar, 540) && eq(r.cxMid, 540)),
      '[B3] 바 중심 = 수반 중심 = 화면 중심 540 (둘이 한 덩어리로 읽힌다)',
      rows.map(r => r.H + ':' + r.cxBar + '↔' + r.cxMid).join(' · '));
    /* ── 754 6회차 이관 — **«네 프레임 고정 20» 은 1600 에서 대가를 숨기고 있었다.** ──
       옛 [B4] 는 아래 여유만 물었다. 그래서 700 이 스스로 적어 둔 «상인방과의 여유 8(1600)»
       — 위 8 / 아래 20 의 **비대칭** — 을 게이트가 한 번도 안 봤다(754 의 자가 찾아냈다).
       1600 의 벽은 상인방 하변 86 ↔ 격자 상변 212 = **126px** 뿐이고 셸이 98 이라 여유는
       통틀어 28px 이다. 그 28 을 8/20 이 아니라 **14/14** 로 나누는 것이 이번 수리다.
       ⇒ 항을 둘로 가른다. 지우지 않고 **조건을 좁혀** 옛 약속(넉넉한 프레임의 20 고정)은
         그대로 지키고, 좁은 벽에서의 새 약속(대칭)을 한 줄 더 세운다(328-330 교훈 —
         «누른 항을 묻는 항» 이 없으면 수리가 통째로 사라져도 초록이다). */
    /* ── 813 2회차 이관 — **«아래 20 고정» → «아래 44 고정».** ──
       813 1회차 비평 2인(CF·CG)이 각자 «바 하변 ↔ 격자 상변 19px 은 **격자 자신의 행 간
       25~26px 보다 좁아** 바가 격자의 0번째 행처럼 읽힌다» 고 냈다(CF «비 6.5:1 → 목표 2:1» ·
       CG «행 간의 1.5배 38px 고정»). 두 사람의 대역 [38,48] 안에서 **44** 를 골랐다 —
       44 는 «바를 격자에서 떼는 값» 이면서 동시에 «쌍ⓐ 의 기준(2280 들보↔바)을 6px 낮추는 값»
       이라, 813 2회차가 그 비를 25.8% → 28.0% 로 넘기는 데 같이 쓰인다.
       ⚠ 갈림 문턱도 20 → 44 를 따라 **40 → 88** 로 옮긴다(여유 88 = 44 × 2). 안 옮기면
         1600(여유 46)이 «넉넉» 으로 분류돼 [B4] 가 «44 고정» 을 요구하고, 그 프레임은
         예산이 없어 영원히 빨갛다. */
    /* ── 867 이관 — **자리가 «벽» 에서 «아치 안쪽 받침 위» 로 내려왔다.** ──────────────
       옛 [B4]·[B4b] 는 «벽 안에서 위·아래를 어떻게 나누는가» 를 물었다. 그 벽에는 이제 바가
       없으므로 두 항은 **뜻을 잃는다**. 지우지 않고 **새 자리의 같은 질문**으로 갈아 끼운다
       (333 처방 — 자리를 비우지 않는다):
         [B4]  아래 이웃(받침)과의 여백이 전 프레임 **12px 고정**인가
         [B4b] 위 이웃(격자 하변)과의 여백이 **격자 행 간(25.6)보다 넓고** 아래보다 큰가
               — 813 5회차 CP·CQ 의 1순위(«1600 에서 25.1 ≈ 행 간 25.6 이라 바가 격자의
                 한 줄로 읽힌다»)를 **새 이웃 기준으로** 다시 묻는 항이다.
       ⚠ 옛 대역(44 고정 · 좁은 벽 대칭)은 «벽에 있을 때» 의 값이라 되살리지 마라 —
         되살리려면 867 을 통째로 되돌려야 한다(그때는 [B5] 가 먼저 빨개진다). */
    const ROW_PITCH = 25.6;   /* 격자 행 간 — 813 1회차 CF·CG 실측 */
    ok(rows.every(r => Math.abs(r.gapDown - PED_GAP) <= 1),
      '[B4] 바 하변 ↔ 받침 상변 = 12px 고정 — 바가 «받침 위에 얹힌» 것으로 읽힌다(867)',
      rows.map(r => r.H + ':' + r.gapDown).join(' · '));
    ok(rows.every(r => r.gapUp > ROW_PITCH && r.gapUp > r.gapDown),
      '[B4b] 위(격자 하변↓바)가 격자 행 간 25.6 보다 넓고 아래(바↓받침)보다 크다 — «격자의 한 줄» 로 안 읽힌다(867)',
      rows.map(r => `${r.H}: 위 ${r.gapUp} / 아래 ${r.gapDown} = ${(r.gapUp / r.gapDown).toFixed(2)}`).join(' · '));
    /* ⚑ 방향 전환 — 옛 [B5] 는 «바가 상인방을 안 밟는다» 였고 자리가 벽 밖으로 나간 지금은
       **아무것도 안 물어도 초록**이다(328-330 교훈의 «헛초록»). 바가 실제로 벽을 떠났는지를
       묻는 쪽으로 뒤집는다 — 867 이 통째로 되돌아가면 이 항이 먼저 빨개진다. */
    ok(rows.every(r => r.clearLintel > 0 && r.gapGrid < 0),
      '[B5] ★ 바가 «상인방↓격자» 벽 밖에 있다 — 상인방 아래이면서 격자 **하변보다도** 아래(867)',
      rows.map(r => `${r.H}: 상인방↓바 ${r.clearLintel} · 격자상변↓바하변 ${-r.gapGrid}`).join(' · '));
    /* ⚑ 이 항이 «자리» 결정의 본체다 — 아래 절 §1 의 표를 그대로 자로 옮긴 것이다.
       수반 옆 띠에 두면 1600 에서 바가 **접합선 그림자대(gy+4..gy+16)를 통째로 덮어**
       `verify120` [1600] ①-2 가 빨개진다(1회차에 실제로 그랬다: 그림자 52.6 vs 아래 47.5 = Δ−5.1).
       바닥·계단은 120 이 20회차에 걸쳐 세운 «그림» 이고, 그것을 가리는 것은 게이트 문제가
       아니라 **주인이 보는 화면에서 그 폴리시가 사라지는** 문제다. */
    ok(rows.every(r => r.overSeam > 0),
      '[B6] ★ 바가 바닥 접합선보다 **위**에 있다 — 120 이 20회차에 걸쳐 세운 바닥 그림을 한 픽셀도 안 덮는다',
      rows.map(r => r.H + ':' + r.overSeam).join(' · '));
  }

  /* ── [C] 레이아웃 Δ0px (수리 전 트리 대조) ────────────────────────────── */
  /* ⚑ 813 1회차 — **이 항은 «700 의 바» 가 아니라 «이번 작업 트리» 를 재고 있었다(등재만).**
     `preTree()` 의 기준은 700 커밋이 아니라 `merge-base origin/main HEAD` 라, 89 의 여백 예산을
     **정당하게** 다시 잡는 뒤 작업도 예외 없이 빨갛게 만든다. 813 1회차는 제품을 되돌렸으므로
     지금은 Δ0 이 성립해 항을 손대지 않았지만, **2회차가 E 재배분을 넣는 순간 이 항이 먼저 빨개진다.**
     그때 «Δ ≤ n 허용» 으로 무르게 풀지 마라 — 700 이 지키려던 «바를 얹느라 다른 것을 밀지 않았다»
     가 통째로 사라진다. 아래 `ALLOW813` 처럼 **등재된 이동만 이름과 값으로** 통과시켜라(333 처방).
     표가 비어 있는 지금은 «어떤 이동도 등재되지 않았다» 는 뜻이다. */
  const LTWH = ['l', 't', 'w', 'h'];
  /* ── 813 2회차 — **등재된 이동 12건.** 위 주석이 예고한 자리다. «Δ ≤ n 허용» 으로 풀지 않고
     이동 하나하나를 **이름과 값으로** 적는다(333 처방) — 여기 없는 이동이 1px 이라도 생기면
     이 항은 그대로 빨개진다. 출처는 셋뿐이다:
       [E2] 격자 상변 «벽 하한 232»       → 1600 만 grid/floor/ground 가 +20 (긴 프레임은 하한이 안 이긴다)
       [E3] `--rw-lt` 벽 폭 300 → 294     → 긴 세 프레임의 상인방 +6 (1600 은 lt 가 하한 20 이라 0)
       [E4] 안내문 아래 블록 ref 비 분할  → 안내문 top 이 아래로 (총량 불변 · 1600 +12 ~ 2600 +50.75)
     ⚠ 1600 의 floor/ground 는 top 이 +20 이면 height 가 −20 이다(패널 바닥에서 역산하는 요소라
       상변이 내려가면 그만큼 짧아진다). 값을 둘 다 적어야 «높이가 안 줄었다» 는 거짓이 안 통과한다.
     ⚠ **바(#rwMulBar) 자신은 이 표에 없다** — [C] 는 «바를 얹느라 89 를 밀지 않았나» 를 묻는
       항이라 바는 애초에 대상이 아니다. 그 약속은 위 [B1]~[B6] 이 따로 지킨다. */
  /* 3회차 [F1] 이 격자를 아래로 내리면서 이동이 늘었다 — 긴 세 프레임에서 격자·상인방·받침·
     바닥·계단이 **같은 양**만큼 내려간다(gridt = lintelt = floort = groundt, 그리고 아래에서
     역산하는 요소는 높이가 그만큼 준다). 계단(steps)만 84 의 정수배로 끊기므로 값이 다르다. */
  /* ── 813 4회차 [G1] — **표를 갈아 끼웠다.** 이 항의 기준은 커밋이 아니라
     `merge-base origin/main HEAD` 라, 2·3회차의 이동은 **이미 main 에 있어 Δ0 으로 읽힌다**.
     그래서 옛 값을 그대로 두면 «등재된 이동 67.95 를 기다리는데 실제는 10.3» 이라 빨개진다.
     옛 표는 지우지 않고 아래에 남긴다(어디서 왔는지를 지우면 다음 회차가 못 읽는다):
       2회차+3회차 누적 — 1600 {gridt 20, capt 12, floort 20, floorh −20, groundt 20, groundh −20}
         1920 {capt 29.23, lintelt/gridt/floort/groundt −10.03, floorh/groundh +10.03, stepsh −0.02}
         2280 {capt 50.75, lintelt/gridt/floort/groundt 67.95, floorh/groundh −67.95, stepst 84, stepsh −84}
         2600 {capt 50.75, lintelt/gridt/floort/groundt 151.66, floorh/groundh −151.66, stepst 168, stepsh −168}
     4회차의 이동은 **한 출처뿐**이다 — 비 47:53 → 48:52 ⇒ 격자·상인방·받침·바닥이 **같은 양**
     (1920 +7.05 · 2280 +10.3 · 2600 +13.5)만큼 내려가고, 패널 바닥에서 역산하는 요소는 그만큼
     짧아진다. **1600 은 Δ0**(하한 232 가 이기는 프레임이라 비 규칙이 안 닿는다) ·
     안내문(`cap`)도 Δ0(아래 블록 총량은 이 회차가 안 건드렸다). */
  /* ── ⚑ 작업 859 — **표를 다시 갈아 끼웠다(4회차와 같은 이유·같은 규칙).** ──
     기준이 `merge-base origin/main HEAD` 라 813 2~4회차의 이동은 이미 main 에 있어 Δ0 으로 읽힌다.
     ⚑ **2회차(하단 앵커)에서 표가 극적으로 단순해졌다** — 이동이 **강체 평행이동 하나**다:
     열 요소가 **전부 같은 양**만큼 아래로 가고 **높이는 하나도 안 변한다**(1회차의 중앙 정렬은
     위 앵커는 아래로·바닥 역산은 위로 갈리며 `floorh`/`groundh`/`stepsh` 까지 흔들었다).
     그 양은 «패널 − 그릇» = 위 띠에서 하단 블록 재배분분을 뺀 값이다(1920 53 · 2280 233 · 2600 393).
     859 의 이동은 **출처가 둘뿐**이다:
       ⓐ **그릇 캡 1527 + 하단 앵커**(`--rw-ph`/`--rw-oy`) — 캡이 걸리는 프레임에서만 내려간다.
       ⓑ **아래 예약 137 → 139**(계단 1단 복귀 — 제품 주석) — ⓐ 에 흡수돼 별도 항이 없다.
     ⚠ 여기 없는 이동이 1px 이라도 생기면 이 항은 그대로 빨개진다(«Δ ≤ n 허용» 으로 풀지 마라).
     ⚠ **1600 은 빈 칸이 정답이다.** 캡이 안 걸리는 프레임이라 859 는 그 프레임을 한 픽셀도 안 건드렸고,
       예약 139 도 1600 에서는 하한(av+94)이 이겨 안 닿는다.
     옛 표(813 2~4회차 누적)는 위 주석에 그대로 남아 있다 — 어디서 왔는지를 지우지 않는다. */
  /* ⚑ 813 5회차 — 표를 **통째로** 다시 적었다. 이 자는 «커밋» 이 아니라
     `merge-base origin/main HEAD` 를 기준으로 읽으므로, main 에 들어간 앞 회차(859 r1~r3 ·
     813 r1~r4)의 이동은 이제 Δ0 이다 — 옛 값(2280 gridt 233 등)을 남겨 두면 «등재된 이동을
     기다리는데 실제는 33.8» 이라 이 항이 빨개진다(4회차 §14 가 같은 것을 밟았다).
     아래는 `P813_DUMP=1` 출력을 그대로 옮긴 것이고, 출처는 **하나**다 — 아래 블록 총량
     90.6 → 36 이 수반·안내문·계단을 내리고(midt/basint/costt/labt/stepst +57.69),
     그 절반이 `--rw-gt` 의 48:52 규칙으로 격자·바닥·상인방으로 간다(gridt/floort/groundt
     +33.77 · lintelt +8.08). 1600 은 캡이 안 걸린 프레임이라 값이 따로다.
     ⚠ `capl +40 · capw −80` 은 **안내문 상자 좁히기**(left/right 0 → 40)다 — 잉크는 가운데
       정렬이라 그려지는 자리는 Δ0px 이고, 바뀐 것은 상자뿐이다(`verify813` [2d]가 그 이유). */
  /* ⚑ 813 6회차 — 표를 다시 적었다(5회차가 그랬던 이유 그대로). 이 자의 기준은
     `merge-base origin/main HEAD` 라 main 에 들어간 앞 회차(859 r1~r3 · 813 r1~r5)의 이동은
     이제 전부 Δ0 으로 읽힌다 — 옛 값을 남겨 두면 «등재된 이동을 기다리는데 실제는 0» 이 되고,
     그 자리에 새 이동이 겹치면 두 번 세어진다. 아래는 `P813_DUMP=1` 출력 그대로다.
     출처는 **하나**다 — 안내문 아래 블록의 분할 계수(6회차 `.375 → .468` · 7회차 `.468 → .5`)가
     안내문 상자를 올린다(6회차 −3.36 → 7회차 **−1.14** — merge-base 가 6회차를 이미 담고 있어
     이 표에는 7회차의 이동만 남는다: `.468 → .5`). 잉크·수반·격자·바는 한 픽셀도 안 움직인다
     (총량 36 은 불변이라 위·아래의 나눔만 바뀐다 — `verify813` [1a]).
     옛 표(813 r2~r5 누적: basint/costt/labt/midt/stepst +57.69 · gridt/floort/groundt +33.77 ·
     lintelt +8.08 · capt +21.64 · capl +40 · capw −80 · 1600 은 캡이 안 걸려 따로)는
     이 주석에 남긴다 — 어디서 왔는지를 지우지 않는다(333). */
  const ALLOW813 = {
    1600: { capt: -1.14 },
    1920: { capt: -1.14 },
    2280: { capt: -1.14 },
    2600: { capt: -1.14 },
  };
  {
    const pre = preTree();
    if (!pre.ok) {
      if (pre.env) skip('[C] 레이아웃 Δ0px', pre.why);
      else ok(false, '[C] 수리 전 사본을 못 꺼냈다', pre.why);
    } else {
      tmp.push(pre.file);
      const worst = [];
      for (const H of FRAMES) {
        const a = await open(browser, pre.url, H);
        const before = await a.page.evaluate(S2 => { S.relic = 1e9; openRelw(); return eval(S2); }, SNAP);
        await a.ctx.close();
        const b = await open(browser, URL, H);
        const after = await b.page.evaluate(S2 => { S.relic = 1e9; openRelw(); return eval(S2); }, SNAP);
        await b.ctx.close();
        let mx = 0, who = '';
        for (const k of Object.keys(before)) {
          if (!before[k] || !after[k]) { mx = 999; who = k + '(없음)'; continue; }
          for (let i = 0; i < 4; i++) {
            const d = +(after[k][i] - before[k][i]).toFixed(2);
            if (Math.abs(d) < 0.01) continue;
            /* `P813_DUMP=1` 으로 돌리면 등재 전 이동을 전부 찍는다 — ALLOW813 을 손으로
               추측하지 말고 **이 출력을 그대로 옮겨 적으라**는 뜻이다(다음 회차용). */
            if (process.env.P813_DUMP) console.log('  DUMP ' + H + ' ' + k + LTWH[i] + ' ' + d);
            const allow = ALLOW813[H] && ALLOW813[H][k + LTWH[i]];
            if (allow != null && Math.abs(d - allow) < 0.51) continue;   /* 등재된 이동은 통과 */
            if (Math.abs(d) > mx) { mx = Math.abs(d); who = k + '[' + LTWH[i] + '] ' + before[k][i] + '→' + after[k][i]; }
          }
        }
        worst.push({ H, mx: +mx.toFixed(2), who });
      }
      ok(worst.every(w => w.mx < 0.01),
        '[C] 레이아웃 Δ0px — 바를 얹어도 89 의 12개 요소가 네 프레임 전부 안 움직인다(813 등재분 제외)',
        worst.map(w => w.H + ':Δ' + w.mx + (w.mx ? '(' + w.who + ')' : '')).join(' · '));
    }
  }

  /* ── [D]·[E]·[G]·[H]·[I]·[J] 동작 ─────────────────────────────────────── */
  {
    const { ctx, page } = await open(browser, URL, 2280);
    const click = m => page.evaluate(m => {
      document.querySelector('#rwMulBar [data-mul="' + m + '"]').click();
      const bar = document.getElementById('rwMulBar');
      return {
        mul: relMul,
        on: [...bar.querySelectorAll('.stab.on')].map(c => +c.dataset.mul),
        lab: document.querySelector('#rwBasin>b').textContent,
        cost: document.querySelector('#rwCost>b').textContent,
        lack: document.getElementById('rwCost').classList.contains('lack'),
        dot: document.getElementById('rwBasin').classList.contains('alert')
      };
    }, m);
    await page.evaluate(() => { S.relic = 1e9; openRelw(); });

    const want = { 1: ['유물 소환', '100'], 10: ['10회 소환', '1,000'],
      100: ['100회 소환', '10,000'], 1000: ['1,000회 소환', '100,000'] };
    for (const m of MULS) {
      const r = await click(m);
      ok(r.mul === m && r.on.length === 1 && r.on[0] === m
        && r.lab === want[m][0] && r.cost === want[m][1] && !r.lack && r.dot,
        '[D×' + m + '] 라벨 «' + want[m][0] + '» · 가격 ' + want[m][1] + ' · 알약 이동 · 닷 점등',
        '라벨 «' + r.lab + '» 가격 ' + r.cost + ' 알약 ' + r.on.join(',') + ' 닷 ' + r.dot);
    }
    /* ⚑ ×1 은 레퍼런스 상태 그대로다 — 89 측정표의 낱말이 한 글자도 안 바뀐다 */
    const back = await click(1);
    ok(back.lab === '유물 소환' && back.cost === '100',
      '[D-R] ×1 로 되돌리면 레퍼런스 낱말·값으로 정확히 복귀', '«' + back.lab + '» ' + back.cost);

    /* [E] 실동작 — ×100 을 실제로 눌러 본다 */
    const e = await page.evaluate(() => {
      S.relic = 1e6; S.own = {}; S.cnt.sumRelic = 0; openRelw();
      document.querySelector('#rwMulBar [data-mul="100"]').click();
      const b0 = { relic: S.relic, sum: S.cnt.sumRelic };
      document.getElementById('rwBasin').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      document.getElementById('rwBasin').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      const lv = Object.values(S.own).reduce((a, o) => a + o.l, 0);
      return { spent: b0.relic - S.relic, drew: S.cnt.sumRelic - b0.sum, lv };
    });
    ok(e.spent === 100 * COST1 && e.drew === 100 && e.lv === 100,
      '[E] ×100 클릭 한 번 — 조각 −10,000 · 100장 · 유물 레벨 합 +100',
      '지불 ' + e.spent + ' · 장수 ' + e.drew + ' · 레벨합 ' + e.lv);

    /* [G] 부족 반려 — 모 아니면 도(668 유료 버튼과 같은 규약) */
    const g = await page.evaluate(() => {
      S.relic = 5000; S.own = {}; S.cnt.sumRelic = 0; openRelw();
      document.querySelector('#rwMulBar [data-mul="100"]').click();
      const lack0 = document.getElementById('rwCost').classList.contains('lack');
      const dot0 = document.getElementById('rwBasin').classList.contains('alert');
      const b0 = S.relic;
      document.getElementById('rwBasin').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      document.getElementById('rwBasin').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      return { lack0, dot0, spent: b0 - S.relic, drew: S.cnt.sumRelic };
    });
    ok(g.spent === 0 && g.drew === 0 && g.lack0 === true && g.dot0 === false,
      '[G] 5,000 으로 ×100(10,000 필요) — **0장·0차감** · 알약 `.lack` · 닷 소등(321 «지금 누를 수 있다»)',
      '지불 ' + g.spent + ' 장수 ' + g.drew + ' lack ' + g.lack0 + ' dot ' + g.dot0);

    /* [I] 탭바 닷은 배수를 안 탄다 — «화면 밖에서 배수가 보이는» 713 [4] 결함 방지 */
    const i = await page.evaluate(() => {
      S.relic = 5000; openRelw();
      document.querySelector('#rwMulBar [data-mul="1000"]').click();
      return { btnDot: document.getElementById('rwBasin').classList.contains('alert'),
        x1: relicSummonReady(), mulReady: relicSummonReadyMul() };
    });
    ok(i.btnDot === false && i.x1 === true && i.mulReady === false,
      '[I] 조각 5,000 에 ×1000 — 버튼 닷은 꺼지고 «×1 기준»(탭바·미션이 읽는 자)은 그대로 참',
      '버튼 ' + i.btnDot + ' · ×1축 ' + i.x1 + ' · 배수축 ' + i.mulReady);

    /* [J] 홀드 틱도 같은 배수 한 벌 */
    const j = await page.evaluate(() => {
      S.relic = 1e6; S.cnt.sumRelic = 0; openRelw();
      document.querySelector('#rwMulBar [data-mul="10"]').click();
      rwHold = { iv: 160, timer: 0 };
      const b0 = S.relic; rwHoldTick(); clearTimeout(rwHold && rwHold.timer); rwHold = null;
      return { spent: b0 - S.relic, drew: S.cnt.sumRelic };
    });
    ok(j.spent === 10 * COST1 && j.drew === 10,
      '[J] 홀드 틱 1회 = 소환 relMul 장(×10 → 10장·1,000 지불)',
      '지불 ' + j.spent + ' · 장수 ' + j.drew);

    /* [H] 닫으면 ×1 로 복귀 */
    const h = await page.evaluate(() => {
      S.relic = 1e9; openRelw();
      document.querySelector('#rwMulBar [data-mul="1000"]').click();
      closeRelw(); openRelw();
      return { mul: relMul, on: [...document.querySelectorAll('#rwMulBar .stab.on')].map(c => +c.dataset.mul),
        lab: document.querySelector('#rwBasin>b').textContent };
    });
    ok(h.mul === 1 && h.on.length === 1 && h.on[0] === 1 && h.lab === '유물 소환',
      '[H] 닫으면 ×1 복귀(713 §5 규약 — 오타 한 번이 조각 10만이 되지 않게)',
      'relMul ' + h.mul + ' 알약 ' + h.on.join(',') + ' «' + h.lab + '»');
    await ctx.close();
  }

  /* ── [F] 등가성 — 씨앗 고정 «×1000 한 번 ↔ ×1 을 1000번» ──────────────── */
  {
    const run = async batch => {
      const { ctx, page } = await open(browser, URL, 2280);
      const r = await page.evaluate(([SEED, batch]) => {
        eval(SEED);
        S.relic = 1e7; S.own = {}; S.summons = 0; S.cnt.sumRelic = 0; openRelw();
        if (batch) summonRelicBatch(1000, true);
        else for (let k = 0; k < 1000; k++) summonRelic(true);
        return { relic: S.relic, sum: S.cnt.sumRelic, summons: S.summons,
          lv: Object.keys(S.own).sort().map(k => k + ':' + S.own[k].l).join(' ') };
      }, [SEEDED, batch]);
      await ctx.close();
      return r;
    };
    const one = await run(false), bulk = await run(true);
    ok(one.lv === bulk.lv && one.relic === bulk.relic && one.sum === bulk.sum && one.summons === bulk.summons,
      '[F] 씨앗 고정 — «×1000 한 번» 이 «×1 을 1000번» 과 장부까지 **완전히 같다**',
      '잔액 ' + one.relic + '↔' + bulk.relic + ' · 소환수 ' + one.sum + '↔' + bulk.sum
      + ' · 레벨 ' + (one.lv === bulk.lv ? '일치' : '어긋남'));
    ok(one.relic === 1e7 - 1000 * COST1,
      '[F2] 1000장의 지불은 정확히 100 × 1000', '잔액 ' + one.relic);
  }

  /* ── [R] 되돌림 시험 — 배수를 읽는 자리를 지우면 이 자가 빨개지는가 ──── */
  {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const NEG = 'const relicMulCost = () => relicCost() * relMul;';
    if (!src.includes(NEG)) {
      ok(false, '[R] 되돌림 시험 — 표본 문자열을 못 찾는다(자가 낡았다)', NEG);
    } else {
      const f = path.join(ROOT, '.v700-neg-' + process.pid + '.html');
      fs.writeFileSync(f, src.replace(NEG, 'const relicMulCost = () => relicCost() * 1;'));
      tmp.push(f);
      const { ctx, page } = await open(browser, 'file://' + f.replace(/\\/g, '/'), 2280);
      const r = await page.evaluate(() => {
        S.relic = 1e9; openRelw();
        document.querySelector('#rwMulBar [data-mul="100"]').click();
        return { cost: document.querySelector('#rwCost>b').textContent };
      });
      await ctx.close();
      ok(r.cost === '100',
        '[R] 되돌림 — 배수를 안 읽는 사본에서는 ×100 인데도 가격이 100 이다 = [D] 가 실제로 무언가를 잰다',
        '가격 ' + r.cost);
    }
  }

  await browser.close();
  for (const f of tmp) { try { fs.unlinkSync(f); } catch (_) {} }
  console.log('\nVERIFY700 ' + pass + '/' + (pass + fail) + (hold ? ' (⏸ 보류 ' + hold + ')' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
