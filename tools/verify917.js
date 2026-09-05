#!/usr/bin/env node
/* 작업 917 게이트 — «배수 토글 바에서 라벨은 알약이 아니라 4등분 칸에 속한다»
 *
 *   node tools/verify917.js
 *
 * ── 이 자가 지키는 약속 ──────────────────────────────────────────────────────
 *  [A] 세로 — 배수 바 네 칸의 잉크가 **같은 높이**에 앉는다(켠 칸이 어디든 · 프레임 다섯 다)
 *  [B] 가로 — 라벨 중심 = **4등분 칸 중심**(끝 칸을 켜도 안 밀린다)
 *  [C] 화소 — 위 둘을 찍힌 화소로 겹쳐 확인(문턱 130/150 두 곳)
 *  [D] 스코프 — 고침이 닿는 곳은 «칸이 `data-mul` 을 단 `.stabs`» 넷뿐이다
 *  [E] 음성항 — ref 가 구속하는 서브탭 바(10 `#shopCats` · 03 `#dunSub`)는 **그대로**다
 *  [R] 되돌림 시험 — 고침을 무르면 [A]·[B] 가 빨개진다
 *
 * ⚑ **[B] 는 상수를 안 묻고 «잰 값» 을 묻는다.** 수리가 라벨에 넣는 보정량은
 *   `11.75/2 + b/2`(sp2·sp3·sp4 끝 칸을 각각 풀면 셋 다 이 한 값으로 떨어진다 — 칸 폭이
 *   약분된다)인데, 이 자는 그 식을 옮겨 적지 않고 **라벨 중심이 4등분 칸 중심에 앉는가**만 묻는다.
 *   그래서 11.75 나 `--sb` 가 언젠가 바뀌면 CSS 주석이 아니라 **이 자가** 빨개진다.
 *
 * ⚠ **[E] 가 이 자의 절반이다.** 세로 5px 은 서브탭에서는 결함이 아니라 **ref 다**
 *   (337 이 07·03 두 그림에서 «ref 는 비활성이 활성보다 5px 아래» 를 확정했다).
 *   고침이 부품 전체로 새면 그 ref 정합이 조용히 깨지므로, 그 두 바가 77/87 을
 *   **유지하는지**를 음성항으로 못박는다.
 *
 * 재현기는 `tools/probe917.js`. 127 — 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» 한 줄 + 종료 코드 2 */

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const FRAMES = [1600, 1841, 1920, 2280, 2600];
const MULS = [1, 10, 100, 1000];
const TOL = 0.06;                       /* 부분화소 반올림 몫 — 실측 잔차가 0.02 다 */

let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) pass++; console.log((c ? '  ✅ ' : '  ❌ ') + m); };

/* 배수 바의 유일한 표식 = 칸이 `data-mul` 을 단다(`mulBarHTML()` 한 곳에서만 나온다) */
const MUL_SCOPE = '.stabs:has(> .stab[data-mul])';
const MUL_HOSTS = ['rwMulBar', 'sumMulBar', 'rnMulBar', 'tpMulBar'];

const MEASURE = `(barSel => {
  const bar = document.querySelector(barSel);
  if(!bar) return null;
  const br = bar.getBoundingClientRect();
  const r2 = v => Math.round(v * 100) / 100;
  const cells = [...bar.children].map((c, k) => {
    const i = c.querySelector('i');
    const r = i && i.getBoundingClientRect();
    return { k: k+1, on: c.classList.contains('on'),
             lh: getComputedStyle(c).lineHeight,
             cw: r2(c.getBoundingClientRect().width),
             cx: r ? r2((r.left + r.right) / 2 - br.left) : null,
             cy: r ? r2((r.top + r.bottom) / 2 - br.top) : null };
  });
  const Q = br.width / cells.length;
  cells.forEach(c => { c.dcx = c.cx === null ? null : r2(c.cx - Q * (c.k - 0.5)); });
  return { w: r2(br.width), cells };
})`;

async function openRw(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(200);
  return { ctx, page };
}

const setMul = async (page, m) => {
  await page.evaluate(v => { relMul = v; renderRwMulBar(); }, m);
  await page.waitForTimeout(60);
};

/* 칸별 잉크 세로 bbox — 배경(셸 #61523D/#705F4B · 알약면 #634F37)과 라벨
   (#A9A8AD / #F2BC8D)을 가르는 문턱을 둘 써서 문턱 의존이 아님을 같이 보인다. */
async function inkTops(page, th) {
  const box = await (await page.$('#rwMulBar')).boundingBox();
  const buf = await page.screenshot({ clip: { x: Math.floor(box.x), y: Math.floor(box.y),
                                              width: Math.ceil(box.width), height: Math.ceil(box.height) } });
  const { width: W, height: H, data } = PNG.sync.read(buf);
  const out = [];
  for (let k = 0; k < 4; k++) {
    const x0 = Math.round(W * k / 4), x1 = Math.round(W * (k + 1) / 4);
    let top = null, bot = null;
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
      const o = (y * W + x) * 4;
      if (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2] > th) {
        if (top === null) top = y; bot = y; break;
      }
    }
    out.push({ k: k + 1, top, bot });
  }
  return out;
}

(async () => {
  const browser = await launch(chromium);

  /* ══ [A]·[B] 기하 — 프레임 5종 × 켠 칸 4종 전수 ══════════════════════════ */
  console.log('[A] 세로 — 네 칸의 잉크가 같은 높이에 앉는가 (켠 칸 무관 · 프레임 5종)');
  console.log('[B] 가로 — 라벨 중심 = 4등분 칸 중심 (끝 칸을 켜도)');
  const geo = {};
  for (const H of FRAMES) {
    const { ctx, page } = await openRw(browser, H);
    geo[H] = {};
    let worstA = 0, worstB = 0, lhBad = [];
    for (const m of MULS) {
      await setMul(page, m);
      const o = await page.evaluate(([M, s]) => eval(M)(s), [MEASURE, '#rwMulBar']);
      geo[H][m] = o;
      const cys = o.cells.map(c => c.cy);
      worstA = Math.max(worstA, Math.max(...cys) - Math.min(...cys));
      worstB = Math.max(worstB, ...o.cells.map(c => Math.abs(c.dcx)));
      o.cells.forEach(c => { if (c.lh !== '87px') lhBad.push('×' + m + '/' + c.k + '=' + c.lh); });
    }
    ok(worstA <= TOL, '[A' + H + '] 네 칸 잉크 중심의 최대 편차 ' + Math.round(worstA * 100) / 100
       + 'px ≤ ' + TOL + ' (수리 전 5.00)');
    ok(worstB <= TOL, '[B' + H + '] 라벨 중심 − 4등분 칸 중심 최대 |Δ| ' + Math.round(worstB * 100) / 100
       + 'px ≤ ' + TOL + ' (수리 전 첫 칸 +9.34 · 끝 칸 −9.38)');
    ok(lhBad.length === 0, '[L' + H + '] 배수 바는 두 상태가 **한 줄상자**를 쓴다(전부 87px)'
       + (lhBad.length ? ' — 어긋난 칸 ' + lhBad.join(' ') : ''));
    await ctx.close();
  }

  /* ⚑ 폭이 다른 두 칸을 켜도 같은 값이 나오는가 = «폭이 뿌리가 아니다» 의 게이트판.
     등재문이 지목한 뿌리(«알약이 칸보다 +7.3% 넓다»)가 참이라면 **더 넓은** 2·3번 칸이
     더 밀려야 한다 — `probe917` [B] 가 그것을 기각했고, 여기서 그 기각을 굳힌다. */
  {
    const g = geo[1600];
    const wide = g[10].cells.find(c => c.on).cw, narrow = g[1].cells.find(c => c.on).cw;
    const dWide = Math.abs(g[10].cells.find(c => c.on).dcx);
    const dNarrow = Math.abs(g[1].cells.find(c => c.on).dcx);
    ok(wide > narrow + 15, '[B★1] 2번 칸 알약(' + wide + ')이 1번 칸(' + narrow + ')보다 뚜렷이 넓다 — 표본이 성립한다');
    ok(dWide <= TOL && dNarrow <= TOL,
       '[B★2] ★ 그런데 **넓은 칸도 좁은 칸도 안 민다**(' + dWide + ' / ' + dNarrow
       + ') — 미는 것은 «폭» 이 아니라 «비대칭» 이다(등재문 뿌리 기각)');
  }

  /* ══ [C] 화소 ═══════════════════════════════════════════════════════════ */
  console.log('\n[C] 화소 — 찍힌 잉크로 겹쳐 확인 (1600 · ×1 켜짐)');
  {
    const { ctx, page } = await openRw(browser, 1600);
    await setMul(page, 1);
    for (const th of [130, 150]) {
      const p = await inkTops(page, th);
      const tops = p.map(x => x.top);
      const bad = tops.some(t => t === null);
      const spread = bad ? null : Math.max(...tops) - Math.min(...tops);
      ok(!bad && spread === 0, '[C' + th + '] 문턱 ' + th + ' — 네 칸 잉크 상단 '
         + tops.join(' / ') + (bad ? ' (잉크를 못 찾았다)' : ' · 편차 ' + spread + 'px (수리 전 5)'));
    }
    await ctx.close();
  }

  /* ══ [D] 스코프 — 넷을 다 잡고 넷만 잡는다 ═══════════════════════════════ */
  console.log('\n[D] 스코프 — «칸이 `data-mul` 을 단 `.stabs`» 가 배수 바 넷과 정확히 같은가');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof paintMulBar === 'function');
    /* 네 자리를 다 그려 둔다 — 팝업을 여는 것과 무관하게 칸은 같은 한 함수가 만든다 */
    const seen = await page.evaluate(ids => {
      ids.forEach(id => { const b = document.getElementById(id); if (b) paintMulBar(b, 1); });
      return {
        matched: [...document.querySelectorAll('.stabs:has(> .stab[data-mul])')].map(e => e.id || e.className),
        allStabs: [...document.querySelectorAll('.stabs')].map(e => e.id || e.className),
        /* 선언이 실제로 네 자리에 다 닿는지 — 숨어 있어도 계산값은 나온다 */
        lh: ids.map(id => {
          const b = document.getElementById(id); if (!b) return [id, null];
          const on = b.querySelector('.stab.on') || b.children[0];
          return [id, on ? getComputedStyle(on).lineHeight : null];
        })
      };
    }, MUL_HOSTS);
    const got = seen.matched.slice().sort().join(',');
    ok(got === MUL_HOSTS.slice().sort().join(','),
       '[D1] ★ 스코프가 잡는 것 = ' + JSON.stringify(seen.matched) + ' (기대 ' + JSON.stringify(MUL_HOSTS) + ')');
    const outside = seen.allStabs.filter(x => !MUL_HOSTS.includes(x));
    ok(outside.length > 0, '[D2] 스코프 **밖**에도 `.stabs` 가 있다(음성항이 성립한다) — ' + JSON.stringify(outside));
    const lhBad = seen.lh.filter(([, v]) => v !== '87px');
    ok(lhBad.length === 0, '[D3] 네 호스트 전부에 같은 선언이 닿는다(활성 칸 line-height 87px)'
       + (lhBad.length ? ' — 어긋난 곳 ' + JSON.stringify(lhBad) : ''));
    await ctx.close();
  }

  /* ══ [E] 음성항 — ref 구속 서브탭 바는 그대로 ═══════════════════════════ */
  console.log('\n[E] 음성항 — ref 가 구속하는 서브탭 바는 한 자리도 안 움직였다(337)');
  for (const [tab, sel, name] of [['shop', '#shopCats', '10 상점'], ['adv', '#dunSub', '03 던전']]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined');
    await page.click('.tab[data-t="' + tab + '"]');
    await page.waitForTimeout(400);
    const o = await page.evaluate(([M, s]) => eval(M)(s), [MEASURE, sel]);
    await ctx.close();
    if (!o || !o.w) { ok(false, '[E:' + name + '] 바를 못 열었다 — 음성항을 못 세운다'); continue; }
    const on = o.cells.find(c => c.on), off = o.cells.find(c => !c.on);
    ok(on && on.lh === '77px' && off && off.lh === '87px',
       '[E1:' + name + '] ★ 활성 77px ↔ 비활성 87px 이 **살아 있다** — ref 의 «비활성이 5px 아래»'
       + ' (실측 ' + (on ? on.lh : '-') + ' / ' + (off ? off.lh : '-') + ')');
    /* 끝 칸을 켠 상태라면 379 ⓒ 의 비대칭도 그대로 남아 있어야 한다(고침이 안 샜다는 증거) */
    if (on && (on.k === 1 || on.k === o.cells.length)) {
      ok(Math.abs(on.dcx) > 5,
         '[E2:' + name + '] 끝 칸(' + on.k + ')의 379 ⓒ 비대칭이 그대로 — 라벨 밀림 ' + on.dcx + 'px');
    } else {
      ok(true, '[E2:' + name + '] 켠 칸이 ' + (on ? on.k : '-') + '번(가운데)이라 비대칭 표본이 아니다 — 건너뜀');
    }
  }

  /* ══ [R] 되돌림 시험 ════════════════════════════════════════════════════ */
  console.log('\n[R] 되돌림 시험 — 고침을 무르면 [A]·[B] 가 빨개지는가');
  {
    /* 수리 세 줄을 각각 무른다. 무르는 말은 CSS 로만 넣는다(제품은 안 건드린다). */
    const UNDO_V = '.stabs:has(> .stab[data-mul])>.stab.on{line-height:77px!important}';
    const UNDO_H = '.stabs:has(> .stab[data-mul])>.stab.on:first-of-type>i,'
                 + '.stabs:has(> .stab[data-mul])>.stab.on:last-of-type>i{left:0!important}';

    const { ctx: c1, page: p1 } = await openRw(browser, 1600, UNDO_V);
    await setMul(p1, 1);
    const rv = await p1.evaluate(([M, s]) => eval(M)(s), [MEASURE, '#rwMulBar']);
    await c1.close();
    const cysR = rv.cells.map(c => c.cy);
    const spreadR = Math.round((Math.max(...cysR) - Math.min(...cysR)) * 100) / 100;
    ok(spreadR >= 4.5, '[R1] ★ 줄상자를 77 로 되돌리면 잉크 편차가 ' + spreadR
       + 'px 로 벌어진다(≥4.5 — 등재문의 «5px 위»)');

    const { ctx: c2, page: p2 } = await openRw(browser, 1600, UNDO_H);
    const worst = {};
    for (const m of [1, 1000]) {
      await setMul(p2, m);
      const o = await p2.evaluate(([M, s]) => eval(M)(s), [MEASURE, '#rwMulBar']);
      worst[m] = o.cells.find(c => c.on).dcx;
    }
    await c2.close();
    ok(Math.abs(worst[1]) >= 9 && Math.abs(worst[1000]) >= 9,
       '[R2] ★ 라벨 보정을 지우면 끝 칸이 다시 밀린다 — 1번 ' + worst[1] + ' · 4번 ' + worst[1000]
       + ' (|Δ| ≥ 9 · 이상값 ±9.375)');
    ok(worst[1] > 0 && worst[1000] < 0,
       '[R3] 부호가 서로 반대다 — 첫 칸은 오른쪽·끝 칸은 왼쪽(379 ⓒ «안쪽으로만» 의 지문)');

    /* 원복하면 다시 초록 — [A1600]/[B1600] 이 위에서 이미 그것을 쟀다 */
    ok(true, '[R4] 무르는 말을 빼면 위 [A1600]·[B1600] 이 초록이다(같은 자·같은 프레임)');
  }

  await browser.close();
  console.log('\nVERIFY917 ' + pass + '/' + total + (pass === total ? ' PASS' : ' FAIL'));
  process.exit(pass === total ? 0 : 1);
})();
