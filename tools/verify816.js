#!/usr/bin/env node
/* 작업 816 게이트 — 「훈련 강화 버튼의 **가격 숫자**는 버스트가 덮지 않는다」
 * (T1 «버그(연출 폐색)» · 660 의 근거 ① 이 훈련에서 거짓인 자리 · 상세는 PROGRESS 816 행)
 *
 *   node tools/verify816.js
 *
 *   [A] 선언  — 신고 부품(`--burst-keep` + `fxbKeepHoles`)이 **한 벌**이고, 여유가 아이콘 배율을 타며,
 *               **호스트 자신은 안 담는다**(660 이 «빈자리 0» 을 만난 그 벽을 다시 세우지 않는다)
 *   [B] 그림  — 홀드(연속 강화) 내내 **숫자 잉크 덮임 0**이고, 그 대가로 **밀도를 잃지 않았다**
 *   [C] 불변  — 660 의 «스폰은 버튼뿐» 과 **미신고 호스트(단련·룬·그 밖) 구멍 0개**
 *               (⚑ 871 — «버튼» 은 **그 알이 태어난 순간의 상자**다. 홀드 중 621 눌림이 상자를
 *                왕복시키므로 표본 시각 상자로 재면 판정이 제비뽑기가 된다 · 되돌림은 [C1r])
 *   [R] 되돌림 — 무르게 푼 수리가 아님을 못박는다(신고를 지우면·엉뚱한 데를 신고하면 빨개진다)
 *
 * ⚠ 338 규칙 — 판정은 «함수를 불렀는가» 가 아니라 **화면에 실제로 놓인 알과 잉크 상자**로 센다.
 * ⚠ 트리거는 실제 사용자 경로(버튼 pointerdown 홀드)다 — `fxBurst` 를 직접 부르지 않는다.
 * ⚠ **871(870 계열) — «밖» 은 «지금 상자» 가 아니라 «태생 상자» 에 대고 묻는다.** 제품은 알을 낳는
 *   순간의 `fxRect(t)` 상자에 가두는데(`inM = sz/2 + FXB_INPAD`), 이 자는 홀드 내내 벽시계로 표본을
 *   뜨므로 «그때의 상자» 로 재면 눌림 위상이 판정을 뽑는다. `probe871` 실측 — 눌림 변당 변위 **12.4px**
 *   ↔ 가장 작은 알의 가둠 여유 **12.0px** 이라, 제품이 **놓아도 되는** 클램프 자리(넓은 위상 상자 우변
 *   −12.0)가 눌린 상자 우변보다 **0.39px 밖**이다 ⇒ 옛 자는 그 자리를 «밖» 이라 답한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V816_HOLD || 1400);
const STEP_MS = Number(process.env.V816_STEP || 16);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* ⚑ 871 — 계측기. 알이 `#fxl` 에 붙는 **그 순간**의 `.cb` 상자를 알에 적어 둔다(`nd.__hb816`).
   MutationObserver 콜백은 발화가 알을 **동기로** 붙인 직후의 마이크로태스크에서 도므로 그 상자가 곧
   제품이 가둠에 쓴 `fxRect(t)` 의 상자다(870 이 846 에서 세운 근거 그대로).
   ⚠ 제품 코드는 한 글자도 안 건드린다 — 자의 관측 창을 여는 것뿐이다. */
const INSTALL = () => {
  const L = document.getElementById('fxl');
  if (!L) return false;
  const box = () => {
    const e = document.querySelector('#trCards [data-tr] .cb'); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height };
  };
  if (window.__V816) window.__V816.mo.disconnect();
  const st = { mo: null, born: [] };
  st.mo = new MutationObserver(recs => {
    const b = box();
    for (const r of recs) for (const nd of r.addedNodes)
      if (nd.nodeType === 1 && /fx-spark/.test(nd.className + '')) { nd.__hb816 = b; if (b) st.born.push(b); }
  });
  st.mo.observe(L, { childList: true });
  window.__V816 = st;
  return true;
};

/* 한 표본 = «살아 있는 알들이 이 잉크 상자를 몇 % 덮는가» — 겹치는 알을 두 번 세지 않게 1px 격자로 훑는다 */
const SAMPLE = () => {
  const inkOf = (host, sel) => {
    const el = host && host.querySelector(sel); if (!el) return null;
    let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); }
    return el.getBoundingClientRect();
  };
  const cov = (ink, eggs) => {
    if (!ink || !ink.width || !ink.height) return 0;
    const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
    const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
    }
    return n / (w * h);
  };
  const L = document.getElementById('fxl');
  const nodes = L ? [...L.children].filter(nd => /fx-spark/.test(nd.className + '')) : [];
  /* 밀도·덮임 축에는 [C1r] 이 손으로 낳은 알을 안 섞는다 — 되돌림은 «밖» 축 하나만 건드린다(870 규약) */
  const eggs = nodes.filter(nd => !nd.__inj816).map(nd => nd.getBoundingClientRect());
  const card = document.querySelector('#trCards [data-tr]');
  const cb = card && card.querySelector('.cb');
  const b = cb && cb.getBoundingClientRect();
  const isOut = (e, g) => {
    const cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
    return cx < g.left || cx > g.right || cy < g.top || cy > g.bottom;
  };
  /* ⚑ 871 — 판정 자는 **그 알의 태생 상자**(`nd.__hb816`)다. 표본 시각 상자(`b`)로 잰 값은
     눌림 위상이 정하는 제비뽑기라 **기록으로만** 남긴다(LESSONS 239-①). */
  let out = 0, outNow = 0;
  for (const nd of nodes) {
    const e = nd.getBoundingClientRect();
    if (!e.width || !e.height) continue;
    const g = nd.__hb816 || b;
    if (g && isOut(e, g)) out++;
    if (b && isOut(e, b)) outNow++;
  }
  return {
    n: eggs.length,
    num: cov(inkOf(cb, 'i'), eggs),
    coin: cov(inkOf(cb, 's'), eggs),                 /* 838 이관 — 「신고 안 한 잉크」 쪽 표본(아래 [R2a·b]) */
    out, outNow,
    hb: b ? { left: b.left, top: b.top, w: b.width, h: b.height } : null
  };
};

const clearFx = page => page.waitForFunction(() => {
  const L = document.getElementById('fxl');
  return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
}, null, { timeout: 5000 }).catch(() => {});

/* ⚑ 871 [C1r] — **버튼 밖에 알 한 알을 우리 손으로 낳는다.** 태생 상자 자가 무르게 푼 것이 아님을
   못박는 자리다: 이 알이 있으면 `out` 은 반드시 ≥1 이다. `position:fixed` 로 앉히고 한 번 재서 보정한다
   (조상 transform 이 있어도 클라이언트 좌표에 정확히 앉는다). 애니메이션이 없어 표본마다 안 움직인다. */
const INJECT = off => {
  const L = document.getElementById('fxl');
  const cb = document.querySelector('#trCards [data-tr] .cb');
  if (!L || !cb) return null;
  const b = cb.getBoundingClientRect();
  const cx = b.right + off, cy = (b.top + b.bottom) / 2;
  const nd = document.createElement('s');
  nd.className = 'fx-spark';
  nd.style.cssText = 'position:fixed;margin:0;width:10px;height:10px;animation:none;left:0;top:0';
  nd.__inj816 = true;
  nd.__hb816 = { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height };
  L.appendChild(nd);
  const b0 = nd.getBoundingClientRect();
  nd.style.left = (cx - 5 - b0.left) + 'px';
  nd.style.top = (cy - 5 - b0.top) + 'px';
  const r = nd.getBoundingClientRect();
  return { cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, right: b.right };
};

async function holdTrain(page, keep, inject) {
  await page.evaluate(v => {
    for (const c of document.querySelectorAll('#trCards [data-tr] .cb'))
      if (v === null) c.style.removeProperty('--burst-keep'); else c.style.setProperty('--burst-keep', v);
  }, keep);
  await clearFx(page);
  await page.waitForTimeout(120);
  await page.evaluate(INSTALL);            /* 871 — 알마다 «태생 상자» 를 적어 둔다(아래 [C1]) */
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr]'); if (!h) return null;
    const b = (h.querySelector('.cb') || h).getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const rows = [];
  const t0 = Date.now();
  let inj = null;
  while (Date.now() - t0 < HOLD_MS) {
    rows.push(await page.evaluate(SAMPLE));
    if (inject && !inj) inj = await page.evaluate(INJECT, inject);
    await page.waitForTimeout(STEP_MS);
  }
  await page.mouse.up();
  await page.waitForTimeout(60);
  const born = await page.evaluate(() => {
    const s = window.__V816; if (!s) return [];
    s.mo.disconnect();
    const L = document.getElementById('fxl');
    if (L) for (const nd of [...L.children]) if (nd.__inj816) nd.remove();
    return s.born;
  });
  const live = rows.filter(r => r.n > 0);
  const sw = k => { const v = born.map(b => b[k]); return v.length ? [Math.min.apply(null, v), Math.max.apply(null, v)] : [0, 0]; };
  return {
    frames: live.length,
    max: live.length ? Math.max(...live.map(r => r.num)) : 0,
    n25: live.filter(r => r.num >= 0.25).length,
    n05: live.filter(r => r.num >= 0.05).length,
    c05: live.filter(r => r.coin >= 0.05).length,
    eggs: rows.reduce((a, r) => a + r.n, 0) / Math.max(1, rows.length),
    peak: Math.max(0, ...rows.map(r => r.n)),
    out: Math.max(0, ...rows.map(r => r.out)),
    outNow: Math.max(0, ...rows.map(r => r.outNow)),   /* 871 — 기록 전용(표본 시각 상자) */
    inj,
    /* 871 — 621 눌림이 홀드 중 상자를 얼마나 흔들었는가(기록 전용). 이 진폭이 옛 자의 제비뽑기 크기다. */
    swing: { top: sw('top'), w: sw('w') }
  };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('[A] 선언 — 신고 부품 한 벌 · 여유는 알 크기에서 · 호스트 자신은 안 담는다');
  ok(/function fxbKeepHoles\(t, m\)\{/.test(code),
     'A1 신고된 잉크만 담는 부품 `fxbKeepHoles(t, m)` 이 있다');
  const keepFn = (code.match(/function fxbKeepHoles\(t, m\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(/getPropertyValue\('--burst-keep'\)/.test(keepFn) && /t\.querySelectorAll\(sel\)/.test(keepFn),
     'A2 그 부품은 **호스트가 신고한 셀렉터**(`--burst-keep`)에 걸리는 자손만 훑는다');
  ok(keepFn.length > 0 && !/\[t, \.\.\.t\.querySelectorAll/.test(keepFn),
     'A3 **호스트 자신을 안 담는다** — 담으면 배경 그라디언트가 «그림 잉크» 로 걸려 상자 통째가 구멍이 된다(660 의 벽)');
  /* ⚑ 838 3회차 이관 — 여유에 `* fitK` 가 붙었다. **묻는 것은 그대로다**(«여유가 입자 크기를 따라가는가»):
     838 이 좁은 버튼에서 알을 줄이면서 여유만 54px 짜리 값으로 두면 구멍이 발원 옆 3px 까지 밀고 들어와
     한쪽 반원이 통째로 죽는다 — 619 4회차의 규칙을 **더** 지키는 방향이라 항을 넓힌다. */
  ok(/if\(IC && r\) kh\.push\(\.\.\.fxbKeepHoles\(t, Math\.round\(FXB_KOS \* hsc \* FX_CIC_SC( \* fitK)?\)\)\);/.test(code)
     && /const fitK = \(fo && r\)/.test(code),
     'A4 아이콘 버스트가 그 구멍을 탄다 · 여유가 **아이콘 배율(`FX_CIC_SC`)과 838 의 크기 배율(`fitK`)을 같이 탄다**(619 4회차 «여유는 입자 크기에서»)');
  /* ⚠ 신고는 **`.cb` 자신**이 한다 — 카드에 적으면 `--burst-to` 를 지운 사본에서 카드 안 `<i>` 넷이
     통째로 구멍이 되어 `verify619` [E3](되돌림 시험)이 0.06 으로 빨개진다(1회차에 실제로 그랬다). */
  ok(/\.tr-card>\.cb\{--burst-keep:i;/.test(code),
     'A5 훈련 **강화 버튼 자신**(`.tr-card>.cb`)이 `--burst-keep:i`(가격 숫자)를 신고한다');
  ok(!/\.tr-card\{[^}]*--burst-keep/.test(code),
     'A5b 카드(`.tr-card`)에는 안 적었다 — 적으면 호스트가 카드가 되는 사본에서 `<i>` 넷이 구멍이 된다(`verify619` [E3])');
  /* 660 의 원형이 그대로 살아 있어야 한다 — 이 작업은 «예외 한 줄» 이지 되돌리기가 아니다 */
  ok(/const kh = \(r && !IC\) \? fxbTextHoles\(t, strict \? Math\.round\(FXB_KOS \* hsc\) : undefined\) : \[\];/.test(code),
     'A6 660 의 원형(«아이콘 버스트는 자손 글자 구멍을 안 판다»)은 한 글자도 안 바뀌었다');
  /* ⚑ 818 이관 — 이 항이 지키는 뜻은 «한 자리» 라는 수가 아니라 **«신고는 헤프게 뿌리는 것이 아니다»**
     이다(가격을 이고 있는 버튼에만 있고, 그 밖에는 없다). 818 이 단련·룬을 같은 신고로 닫으면서
     그 자리가 셋이 됐으므로 **수가 아니라 목록**을 묻는다 — 수만 3 으로 올리면 «네 번째가 아무 데나
     생겨도 초록» 이 되고, 항을 지우면 «저장소 전체에 뿌려도 초록» 이 된다(333 처방). */
  const keepAt = [...code.matchAll(/([.#][\w.>\-]*)\{--burst-keep:([^;}]+)/g)].map(m => m[1] + ' → ' + m[2]);
  ok(keepAt.length === 3
     && keepAt.some(s => /^\.tr-card>\.cb → i$/.test(s))
     && keepAt.some(s => /^\.tr-tp>\.tb → \.tbn$/.test(s))
     && keepAt.some(s => /^\.tr-rn>\.rbt\.b1 → \.rbn$/.test(s)),
     'A7 신고 자리는 **가격을 이고 있는 버튼 셋뿐**이다 — 훈련 `.cb`→`i` · 단련 `.tb`→`.tbn` · 룬 `.rbt.b1`→`.rbn`(818)',
     keepAt.join(' · ') || '0자리');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    openTrain();
  });
  await page.waitForTimeout(400);

  /* ── [B] 그림 ─────────────────────────────────────────────────────── */
  console.log('\n[B] 그림 — 훈련 홀드 ' + HOLD_MS + 'ms · 가격 숫자 잉크를 덮는가');
  const now = await holdTrain(page, null);
  ok(now && now.frames > 0, 'B1 홀드 중 알이 실제로 태어난다(0 이면 아래 초록은 헛초록이다)',
     now ? now.frames + '표본 · 동시 최대 ' + now.peak + '알' : '없음');
  ok(now && now.max < 0.05, 'B2 가격 숫자 잉크 덮임 **최대 5% 미만**', '최대 ' + p1(now.max * 100) + '%');
  ok(now && now.n25 === 0, 'B3 «읽을 수 없다» 급(≥25%) 표본 **0개**', now.n25 + '표본');
  ok(now && now.n05 === 0, 'B4 «스친다» 급(≥5%) 표본도 **0개**', now.n05 + '표본');

  /* ── [C] 불변 ─────────────────────────────────────────────────────── */
  console.log('\n[C] 불변 — 660 의 스폰 규약 · 미신고 호스트는 구멍 0개');
  /* ⚑⚑ 871 — **이 항의 기준 상자를 «그 알이 태어난 순간의 버튼» 으로 옮겼다**(870 이 `verify818` 에서
     한 것과 같은 처방). 옛 자는 표본을 뜨는 그 순간의 상자로 열 세대를 전부 쟀는데, 홀드 중 버튼은
     621 눌림으로 **쉼 ↔ 눌림 ↔ 되튐** 을 왕복한다(아래 «상자 진폭» 기록 — 폭 24.8px = 변당 12.4px).
     `probe871` 실측: 제품은 자기 태생 상자를 **한 번도 안 어겼고**(6판 · 2,000여 알 · 밖 0개),
     옛 자가 초록이던 것은 «옳아서» 가 아니라 문턱에서 **3~5px** 떨어져 돌고 있었기 때문이다 —
     제품이 **놓아도 되는** 클램프 자리(가장 작은 알의 여유 `sz/2+4` = 12.0px)를 눌린 상자로 재면
     **0.39px 밖**으로 읽힌다(`probe871` [3]). 838 이 훈련 손잡이를 더 조여 알이 작아지면 그 자리가
     실제 궤적에 들어오고, 그때 이 자는 818 이 겪은 제비뽑기를 그대로 물려받는다.
     ⚠ **눈금은 한 칸도 안 넓히지 않았다** — 묻는 문장도 문턱(0개)도 그대로이고, 바뀐 것은
       «어느 순간의 버튼인가» 하나다. 무르게 푼 것이 아님은 [C1r] 이 못박는다. */
  ok(now && now.out === 0, 'C1 660 [C] — 알 중심이 **제가 태어난 순간의** 강화 버튼(`.cb`) 상자 밖으로 나간 표본 0개',
     (now ? now.out : '?') + '개'
     + (now ? '  ── 기록(판정 안 함): 표본 시각 상자로 재면 ' + now.outNow
        + '개 · 홀드 중 상자 진폭 top ' + p1(now.swing.top[1] - now.swing.top[0])
        + 'px · 폭 ' + p1(now.swing.w[1] - now.swing.w[0]) + 'px(621 눌림)' : ''));
  const pre = await holdTrain(page, 'none');          /* 수리 전 사본 = 구멍 0개 */
  ok(now && pre && now.eggs >= pre.eggs * 0.85,
     'C2 밀도를 대가로 안 치렀다 — 동시 알 수가 수리 전의 85% 이상',
     p1(now.eggs) + '알 ↔ 수리 전 ' + p1(pre.eggs) + '알');
  await holdTrain(page, null);                        /* 원복 */
  /* 미신고 호스트는 이 부품이 **빈 배열**을 돌려준다.
     ⚑ 818 이관 — 표본을 «단련 `.tb` · 룬 `.rbt.b1`» 에서 **그 버튼들이 얹혀 있는 행·카드**로 옮겼다.
     818 이 두 버튼을 같은 신고로 닫았으므로 옛 표본은 뜻이 뒤집혔지만, 이 항이 지키는 것은
     «신고 안 한 호스트는 한 값도 안 바뀐다» 이고 **그 자리가 바로 816 §4 의 함정**이다 —
     `--burst-to` 를 지운 사본에서 호스트가 되는 것이 이 행·카드다. 지우지 않고 옮긴다(333 처방). */
  const zero = await page.evaluate(() => {
    const out = {};
    const ask = (name, el) => { out[name] = el ? fxbKeepHoles(el, 30).length : -1; };
    setTrSub('temper'); renderTrain();
    ask('단련 행 .tr-tp', document.querySelector('#trTemper .tr-tp.k0'));
    ask('단련 .tb', document.querySelector('#trTemper .tr-tp.k0 .tb'));
    setTrSub('rune'); renderTrain();
    ask('룬 행 .tr-rn', document.querySelector('#trRunes .tr-rn'));
    ask('룬 .rbt.b1', document.querySelector('#trRunes .tr-rn .rbt.b1'));
    setTrSub('train'); renderTrain();
    ask('훈련 카드 .tr-card', document.querySelector('#trCards [data-tr]'));
    ask('훈련 .cb', document.querySelector('#trCards [data-tr] .cb'));
    return out;
  });
  for (const k of ['단련 행 .tr-tp', '룬 행 .tr-rn', '훈련 카드 .tr-card'])
    ok(zero[k] === 0, 'C3 미신고 호스트 «' + k + '» 구멍 **0개**(816 §4 — `--burst-to` 를 지우면 여기가 호스트다)', zero[k] + '개');
  ok(zero['훈련 .cb'] === 1, 'C4 신고한 호스트 «훈련 .cb» 는 구멍 **1개**(가격 숫자 하나)', zero['훈련 .cb'] + '개');
  /* ⚑ 818 — 옛 [C3] 이 세던 두 자리는 이제 «신고한 호스트» 다. 자리를 비우지 않고 방향만 뒤집는다. */
  for (const k of ['단련 .tb', '룬 .rbt.b1'])
    ok(zero[k] === 1, 'C4b 818 이 신고한 호스트 «' + k + '» 도 구멍 **1개**(수량 하나)', zero[k] + '개');

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 무르게 푼 수리가 아니다');
  const r1 = await holdTrain(page, 'none');
  /* ⚑ 838 5회차 이관 — 문턱을 «≥25%» 에서 **«≥5%»** 로 내렸다(818 [R1] 과 같은 눈금).
     묻는 것은 그대로다(«신고를 지우면 숫자가 덮이는가 = [B3] 이 헛초록이 아닌가»).
     838 이 알을 54 → 20px 로 줄이고 궤적을 발원 밖으로 밀어내면서 **신고 없이도 최대 덮임이 19.1%** 가 됐다 —
     «25% 이상» 은 그 시절 알 크기의 값이라 이제 제품이 옳은데 빨간 자리가 된다. 최대값은 계속 찍는다. */
  ok(r1 && r1.n05 > 0, 'R1 신고를 지우면(816 이전) 숫자가 다시 덮인다 — [B3] 이 빨개지는 자리',
     '≥5% 표본 ' + (r1 ? r1.n05 : '?') + '개 · ≥25% ' + (r1 ? r1.n25 : '?') + '개 · 최대 '
     + p1((r1 ? r1.max : 0) * 100) + '% (838 전에는 최대 70.4% · ≥25% 13개)');
  const r2 = await holdTrain(page, 's');
  const r3b = await holdTrain(page, null);
  /* ⚑⚑ **838 이관(333 처방)** — 종전 항은 «코인을 신고하면 **숫자**가 그대로 덮인다» 였다.
     838 이 발원을 코인(`--burst-from:s`)으로 옮기면서 그 전제가 죽었다: 코인을 신고하는 순간
     구멍이 **발원 자신**을 덮어 궤적이 통째로 걸러지고, 그러면 숫자도 안 덮인다(실측 ≥5% 0개).
     ⇒ 묻는 것(«자가 신고를 따라가는가»)은 그대로, **재는 잉크를 코인으로 옮긴다.**
     ⚠ 문턱이 0 이 아닌 이유 — 코인은 발원이라 알이 그 위에서 «태어난다». 구멍은 «지나가지 마라»
       라서 태어나는 자리를 0 으로 못 만든다. 그래서 «줄어드는가» 로 묻고 R2b 가 짝을 이룬다. */
  ok(r2 && r3b && r3b.eggs > 0 && r2.eggs <= r3b.eggs * 0.6,
     'R2a **발원 잉크를 신고하면 그 버스트가 죽는다** — 자가 신고를 따라간다는 가장 굵은 증거',
     '알 평균 ' + (r2 ? r2.eggs.toFixed(1) : '?') + ' ↔ 안 신고 ' + (r3b ? r3b.eggs.toFixed(1) : '?')
     + ' · 봉우리 ' + (r2 ? r2.peak : '?') + ' ↔ ' + (r3b ? r3b.peak : '?')
     + ' · 코인 ≥5% 표본 ' + (r2 ? r2.c05 : '?') + ' ↔ ' + (r3b ? r3b.c05 : '?')
     + ' (덮임 쪽은 기록만 — 실행마다 0.48~0.74 배로 흔들린다)');
  ok(r3b && r3b.c05 > 0, 'R2b 제품 선언(숫자만)에서는 **코인은 덮인다** — R2a 가 헛초록이 아니다',
     '≥5% 표본 ' + (r3b ? r3b.c05 : '?') + '개 · 816 «코인(`s`)은 안 신고한다»');
  const r3 = await holdTrain(page, null);
  ok(r3 && r3.n05 === 0 && r3.frames > 0, 'R3 원복하면 다시 0 이다', '≥5% 표본 ' + (r3 ? r3.n05 : '?') + '개');
  /* ⚑⚑ 871 — [C1] 의 기준 상자를 «태생» 으로 옮긴 것이 **자를 무르게 푼 것이 아님**을 못박는다
     (870 이 `verify818` [C1r] 로 세운 자리와 같은 꼴). 버튼 오른쪽 밖 30px 에 알 한 알을 우리 손으로
     낳고, 그 판의 [C1] 값이 **≥1** 이어야 통과다. 이 항이 빨개지는 길은 «자가 밖을 아예 못 본다» 뿐이고,
     그때가 [C1] 이 헛초록이 되는 자리다. ⚠ 이 알은 «밖» 축에만 섞인다(`__inj816` — 밀도·덮임 제외). */
  const rc = await holdTrain(page, null, 30);
  ok(rc && rc.inj && rc.out >= 1,
     'C1r **버튼 밖에 알을 낳으면 [C1] 이 빨개진다** — 태생 상자 자가 «밖» 을 여전히 본다',
     (rc ? rc.out : '?') + '개 · 심은 자리 x ' + (rc && rc.inj ? p1(rc.inj.cx) + ' (버튼 우변 ' + p1(rc.inj.right) + ')' : '?'));
  ok(rc && rc.n05 === 0,
     'C1r-b 그 판에서도 덮임 축은 안 흔들렸다 — 되돌림 알은 «밖» 축에만 섞인다',
     '≥5% 표본 ' + (rc ? rc.n05 : '?') + '개');
  await holdTrain(page, null);                        /* 원복 — 심은 알은 holdTrain 이 걷는다 */

  ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0');

  await browser.close();
  console.log('\nVERIFY816 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
