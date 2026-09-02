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
 *   [R] 되돌림 — 무르게 푼 수리가 아님을 못박는다(신고를 지우면·엉뚱한 데를 신고하면 빨개진다)
 *
 * ⚠ 338 규칙 — 판정은 «함수를 불렀는가» 가 아니라 **화면에 실제로 놓인 알과 잉크 상자**로 센다.
 * ⚠ 트리거는 실제 사용자 경로(버튼 pointerdown 홀드)다 — `fxBurst` 를 직접 부르지 않는다.
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
  const eggs = L ? [...L.children].filter(nd => /fx-spark/.test(nd.className + ''))
                     .map(nd => nd.getBoundingClientRect()) : [];
  const card = document.querySelector('#trCards [data-tr]');
  const cb = card && card.querySelector('.cb');
  const b = cb && cb.getBoundingClientRect();
  return {
    n: eggs.length,
    num: cov(inkOf(cb, 'i'), eggs),
    out: b ? eggs.filter(e => {
      const cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
      return cx < b.left || cx > b.right || cy < b.top || cy > b.bottom;
    }).length : 0
  };
};

const clearFx = page => page.waitForFunction(() => {
  const L = document.getElementById('fxl');
  return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
}, null, { timeout: 5000 }).catch(() => {});

async function holdTrain(page, keep) {
  await page.evaluate(v => {
    for (const c of document.querySelectorAll('#trCards [data-tr] .cb'))
      if (v === null) c.style.removeProperty('--burst-keep'); else c.style.setProperty('--burst-keep', v);
  }, keep);
  await clearFx(page);
  await page.waitForTimeout(120);
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
  while (Date.now() - t0 < HOLD_MS) { rows.push(await page.evaluate(SAMPLE)); await page.waitForTimeout(STEP_MS); }
  await page.mouse.up();
  await page.waitForTimeout(60);
  const live = rows.filter(r => r.n > 0);
  return {
    frames: live.length,
    max: live.length ? Math.max(...live.map(r => r.num)) : 0,
    n25: live.filter(r => r.num >= 0.25).length,
    n05: live.filter(r => r.num >= 0.05).length,
    eggs: rows.reduce((a, r) => a + r.n, 0) / Math.max(1, rows.length),
    peak: Math.max(0, ...rows.map(r => r.n)),
    out: Math.max(0, ...rows.map(r => r.out))
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
  ok(/if\(IC && r\) kh\.push\(\.\.\.fxbKeepHoles\(t, Math\.round\(FXB_KOS \* hsc \* FX_CIC_SC\)\)\);/.test(code),
     'A4 아이콘 버스트가 그 구멍을 탄다 · 여유가 **아이콘 배율(`FX_CIC_SC`)을 같이 탄다**(619 4회차 «여유는 입자 크기에서»)');
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
  ok(now && now.out === 0, 'C1 660 [C] — 알 중심이 강화 버튼(`.cb`) 밖으로 나간 표본 0개', (now ? now.out : '?') + '개');
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
  ok(r1 && r1.n25 > 0, 'R1 신고를 지우면(816 이전) 숫자가 다시 «읽을 수 없다» 급으로 덮인다 — [B3] 이 빨개지는 자리',
     '≥25% 표본 ' + (r1 ? r1.n25 : '?') + '개 · 최대 ' + p1((r1 ? r1.max : 0) * 100) + '%');
  const r2 = await holdTrain(page, 's');
  ok(r2 && r2.n05 > 0, 'R2 엉뚱한 잉크(코인)를 신고하면 숫자는 그대로 덮인다 — 자가 «신고한 그 잉크» 를 본다',
     '≥5% 표본 ' + (r2 ? r2.n05 : '?') + '개');
  const r3 = await holdTrain(page, null);
  ok(r3 && r3.n05 === 0 && r3.frames > 0, 'R3 원복하면 다시 0 이다', '≥5% 표본 ' + (r3 ? r3.n05 : '?') + '개');

  ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0');

  await browser.close();
  console.log('\nVERIFY816 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
