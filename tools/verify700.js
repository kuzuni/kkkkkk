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
const SHELL_H = 98, BAR_W = 724, BAR_L = 178, GRID_GAP = 20, COST1 = 100;

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
        return { H, bar, gapGrid: +(grid.t - bar.b).toFixed(2), clearLintel: +(bar.t - lin.b).toFixed(2),
          overSeam: +(gnd.t - bar.b).toFixed(2),
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
    const wide = rows.filter(r => r.clearLintel + r.gapGrid >= 40);
    const tight = rows.filter(r => r.clearLintel + r.gapGrid < 40);
    ok(wide.length >= 3 && wide.every(r => eq(r.gapGrid, GRID_GAP)),
      '[B4] 벽이 넉넉한 프레임(여유 ≥ 40)은 바 하변 ↔ 격자 상변 = 20px 고정 — 바는 격자에 «붙어» 산다',
      wide.map(r => r.H + ':' + r.gapGrid).join(' · ') + (wide.length ? '' : ' — 넓은 프레임 0'));
    ok(tight.length >= 1 && tight.every(r => Math.abs(r.clearLintel - r.gapGrid) <= 1.5),
      '[B4b] 벽이 좁은 프레임(여유 < 40)은 위·아래를 **고르게** 나눈다 — 754 가 잡은 8/20 비대칭이 없다',
      tight.map(r => `${r.H}: 위 ${r.clearLintel} / 아래 ${r.gapGrid}`).join(' · ')
        + (tight.length ? '' : ' — 좁은 프레임 0(1600 이 표본에 없다)'));
    ok(rows.every(r => r.clearLintel > 0),
      '[B5] 바 상변이 상인방 하변보다 아래 — 상인방(120 ② «66px 온전»)을 한 픽셀도 안 밟는다',
      rows.map(r => r.H + ':' + r.clearLintel).join(' · '));
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
  /* ⚑ 813 1회차 이관 — **이 항은 «700 의 바» 가 아니라 «이번 작업 트리» 를 재고 있었다.**
     `preTree()` 의 기준은 700 커밋이 아니라 `merge-base origin/main HEAD` 라, 89 의 여백 예산을
     **정당하게** 다시 잡는 뒤 작업(= 813)도 예외 없이 빨갛게 만든다. 그렇다고 항을 무르게 풀면
     («Δ ≤ 8 허용» 같은 식) 700 이 지키려던 것 — «바를 얹느라 다른 것을 밀지 않았다» — 이 통째로
     사라진다(333 처방: 자리를 비우지 말고 방향을 다시 겨눈다).
     ⇒ **등재된 이동만 이름과 값으로 통과시킨다.** 아래 표에 없는 이동은 크기 무관 빨강이다.

     813 1회차가 낸 이동(`--rw-g3` 하한 44 → 50 — 1600 한 프레임만 clamp 하한을 본다):
       · 안내문 아래 여백이 6px 넓어져 **아래 묶음이 통째로 6px 위로** (수반·받침·계단·안내문)
       · `--rw-tt` 가 6 줄어 `--rw-av` 가 **3** 줄고, 그만큼 **격자가 3px 위로**
       · 받침·지면은 위로 6 가면서 아래는 패널 바닥에 붙어 있으므로 **높이가 +6**
     다른 네 프레임은 clamp 의 가운데 항이 이겨 하한 50 을 **한 번도 안 본다** ⇒ 표가 비어 있고,
     그 «비어 있음» 자체가 813 의 «1600 한 프레임만 움직인다» 는 주장의 자다. */
  const LTWH = ['l', 't', 'w', 'h'];
  const ALLOW813 = {
    1600: { gridt: -3, midt: -6, basint: -6, costt: -6, labt: -6, capt: -6,
            floort: -6, floorh: +6, groundt: -6, groundh: +6, stepst: -6 },
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
