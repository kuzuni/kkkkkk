#!/usr/bin/env node
/* 작업 818 재현기 — 「단련 `.tb` · 룬 `.rbt.b1` 버튼도 «(아이콘) 수량» 을 이고 있는데 버스트가 그 수치를 덮는다」
 *
 *   node tools/probe818.js
 *
 * 816 이 훈련 `.cb` 한 자리에서 닫은 것과 **같은 결손·다른 밀도 예산**이다(816 §6 이 818 로 등재).
 * 338 규칙대로 처방 전에 **찍힌 값**으로 잰다 — 세 상태를 같은 자로 나란히:
 *   [P/R] ⓐ 수리 전(`--burst-keep:none` = 신고 0개) · ⓑ 수량만 신고 · ⓒ 라벨 통째(`i`) 신고.
 * ⓒ 는 «채택 안 함» 을 값으로 말하기 위한 대조군이다(816 §3 의 «코인까지 신고» 와 같은 자리 —
 * 816 은 그 대안이 동시 알 수를 55% 깎는 것을 재고 신고를 숫자 하나로 정했다).
 *
 * ⚠ 이 자는 «지금 무엇인가» 를 찍을 뿐 통과·실패를 말하지 않는다(판정은 `tools/verify818.js`).
 * ⚠ 트리거는 실제 사용자 경로다(버튼 pointerdown 홀드) — `fxBurst` 를 직접 부르지 않는다.
 * ⚠ **수리 뒤에도 [P1][R1] 이 성립하게 짰다**(803 «옛 재현이 굳는» 함정 회피) — 등재문 재현은
 *   주입한 **수리 전 사본**에서 잰다. 제품 코드는 한 줄도 안 건드리고 `--burst-keep` 인라인만 바꾼다.
 * ⚠ 816 이 놓은 자와 눈금을 그대로 쓴다(잉크 상자 1px 격자 훑기 · 뭉침 = 반지름합 × 1.30).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.P818_HOLD || 1400);   /* 홀드 길이 — 연속 강화 구간 */
const STEP_MS = Number(process.env.P818_STEP || 16);     /* 표본 간격 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const info = (k, v) => console.log('       · ' + k + ': ' + v);
const p1 = n => Math.round(n * 10) / 10;

/* 한 표본 = «지금 살아 있는 알들이 이 잉크 상자를 몇 % 덮는가»(816 SAMPLE 과 같은 자).
   host = 버튼 셀렉터 · num = 수량 요소 · ic = 아이콘 요소. */
const SAMPLE = (sel) => {
  const host = document.querySelector(sel.host);
  const inkOf = el => {
    if (!el) return null;
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
  let fused = 0;
  for (let i = 0; i < eggs.length; i++) {
    const a = eggs[i], ax = (a.left + a.right) / 2, ay = (a.top + a.bottom) / 2, ar = a.width / 2;
    for (let j = 0; j < eggs.length; j++) {
      if (i === j) continue;
      const b = eggs[j], bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2, br = b.width / 2;
      const m = (ar + br) * 1.30;
      if ((ax - bx) * (ax - bx) + (ay - by) * (ay - by) < m * m) { fused++; break; }
    }
  }
  return {
    t: Math.round(performance.now()),
    n: eggs.length,
    fused: eggs.length ? fused / eggs.length : 0,
    num: cov(inkOf(host && host.querySelector(sel.num)), eggs),
    ic:  cov(inkOf(host && host.querySelector(sel.ic)), eggs),
    /* 알 중심이 버튼 밖으로 나갔는가 — 660 [C1]«스폰은 버튼뿐» 의 재현판 */
    out: host ? eggs.filter(e => {
      const b = host.getBoundingClientRect(), cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
      return cx < b.left || cx > b.right || cy < b.top || cy > b.bottom;
    }).length : 0
  };
};

async function holdSample(page, sel, ms, step) {
  const g = await page.evaluate(s => {
    const h = document.querySelector(s.host); if (!h) return null;
    const b = h.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, sel);
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const rows = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    rows.push(await page.evaluate(SAMPLE, sel));
    await page.waitForTimeout(step);
  }
  await page.mouse.up();
  await page.waitForTimeout(60);
  return rows;
}

function digest(rows, key) {
  const live = rows.filter(r => r.n > 0);
  const vals = live.map(r => r[key]);
  const max = vals.length ? Math.max(...vals) : 0;
  const n25 = live.filter(r => r[key] >= 0.25).length;
  const n05 = live.filter(r => r[key] >= 0.05).length;
  return { max, pct25: live.length ? n25 / live.length : 0, pct05: live.length ? n05 / live.length : 0,
           frames: live.length, n25, n05 };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', e => { if (e.type() === 'error') errs.push(e.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  /* 두 대상. `sub` = 서브탭 · `host` = 버튼 · `num` = 수량 요소 · `ic` = 아이콘 · `keep` = 채택 신고
     `far` = **자릿수 최악**을 만드는 세이브 주입. 기본값(«1»·«12»)만 재면 이 작업을 헛 닫는다 —
     두 버튼이 이고 있는 것은 «지금 누르면 얼마인가» 이고 그 수는 홀드 중에도 자란다(816 §2).
     · 단련 `temperSegCost(⌊lv/100⌋)` — 686 [5-c] 가 쓰는 far 표본 Lv 10만 ⇒ 비용 **501,501**(6자리).
     · 룬  `12 × 1.006^lv` — Lv 400 ⇒ **131**(3자리 · 만렙 500 까지 100레벨 여유라 홀드 중 안 닫힌다). */
  const TARGETS = [
    { tag: 'P', name: '단련', sub: 'temper', host: '#trw .tr-tp .tb',      num: '.tbn', ic: '.cic', keep: '.tbn',
      far: "S.tstone = 1e12; const o = temperObj(); o.alloc = o.alloc || {}; o.alloc.atk = 100000; renderTemper();" },
    { tag: 'R', name: '룬',   sub: 'rune',   host: '#trw .tr-rn .rbt.b1',  num: '.rbn', ic: '.cic', keep: '.rbn',
      far: "S.rstone = 1e12; S.rune = S.rune || {}; S.rune.r1 = 400; renderRunes();" }
  ];

  console.log('[D] 선언 — 두 버튼이 이고 있는 «(아이콘) 수량» 과 지금의 신고');
  for (const T of TARGETS) {
    await page.evaluate(s => setTrSub(s), T.sub);
    await page.waitForTimeout(250);
    const d = await page.evaluate(t => {
      const f = fxSc(), h = document.querySelector(t.host);
      if (!h) return null;
      const cv = r => [+((r.left - f.x) / f.s).toFixed(1), +((r.top - f.y) / f.s).toFixed(1),
                       +(r.width / f.s).toFixed(1), +(r.height / f.s).toFixed(1)];
      const ink = el => { if (!el) return null; const rg = document.createRange(); rg.selectNodeContents(el);
                          return cv(rg.getBoundingClientRect()); };
      const row = h.closest('[style*="--"]') || h.parentElement;
      return { to: getComputedStyle(row).getPropertyValue('--burst-to').trim(),
               keep: getComputedStyle(h).getPropertyValue('--burst-keep').trim(),
               box: cv(h.getBoundingClientRect()),
               ic: h.querySelector(t.ic) ? cv(h.querySelector(t.ic).getBoundingClientRect()) : null,
               num: ink(h.querySelector(t.num)),
               lab: ink(h.querySelector('i')),
               txt: (h.textContent || '').trim() };
    }, T);
    if (!d) { console.log('  · ' + T.name + ': (버튼을 못 찾았다)'); continue; }
    console.log('  · ' + T.name + '  ' + T.host);
    info('--burst-to / --burst-keep', d.to + ' / ' + (d.keep || '(신고 없음)'));
    info('버튼 상자', d.box.join(' / '));
    info('아이콘', d.ic ? d.ic.join(' / ') : '-');
    info('수량 잉크', (d.num ? d.num.join(' / ') : '-') + '  «' + d.txt + '»');
    info('라벨 통째(i) 잉크', d.lab ? d.lab.join(' / ') : '-');
    T.d = d;
  }

  const setKeep = (host, v) => page.evaluate(a => {
    for (const c of document.querySelectorAll(a.host)) c.style.setProperty('--burst-keep', a.v);
  }, { host, v });

  const runState = async (T, label, keep) => {
    await setKeep(T.host, keep);
    /* ⚠ 앞 상태의 알이 아직 살아 있으면 다음 상태의 첫 표본에 섞인다(816 의 함정) — 비고 다 지고 시작한다. */
    await page.waitForFunction(() => {
      const L = document.getElementById('fxl');
      return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
    }, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(120);
    const rows = await holdSample(page, T, HOLD_MS, STEP_MS);
    const num = digest(rows, 'num'), ic = digest(rows, 'ic');
    const live = rows.filter(r => r.n > 0);
    const st = { label, keep, rows, num, ic,
      eggs: rows.reduce((a, r) => a + r.n, 0) / Math.max(1, rows.length),
      fused: live.length ? live.reduce((a, r) => a + r.fused, 0) / live.length : 0,
      out: Math.max(0, ...rows.map(r => r.out)) };
    console.log('  · ' + label + '  (--burst-keep: ' + keep + ')');
    info('수량 덮임 최대 / ≥25% 표본 / ≥5% 표본',
         p1(num.max * 100) + '% / ' + p1(num.pct25 * 100) + '% / ' + p1(num.pct05 * 100) + '%');
    info('아이콘 덮임 최대 / ≥25% 표본', p1(ic.max * 100) + '% / ' + p1(ic.pct25 * 100) + '%');
    info('동시 알 수 평균 / 뭉친 알 비율', p1(st.eggs) + '알 / ' + p1(st.fused * 100) + '%');
    info('알 중심이 버튼 밖', st.out + '개(최대 표본)');
    return st;
  };

  for (const T of TARGETS) {
    if (!T.d) continue;
    await page.evaluate(s => setTrSub(s), T.sub);
    await page.waitForTimeout(250);
    console.log('\n[' + T.tag + '] ' + T.name + ' — 홀드(연속 강화) ' + HOLD_MS + 'ms · 표본 간격 ' + STEP_MS + 'ms');
    const base = await runState(T, T.tag + '1 수리 전 · 기본 자릿수 «' + T.d.txt + '»', 'none');

    /* ⚑ 자릿수 최악으로 갈아탄다 — 여기서부터가 이 작업의 판정 자리다(머리말 `far`). */
    await page.evaluate(src => { new Function(src)(); }, T.far);
    await page.waitForTimeout(300);
    const fd = await page.evaluate(t => {
      const f = fxSc(), h = document.querySelector(t.host); if (!h) return null;
      const rg = document.createRange(); const el = h.querySelector(t.num); if (!el) return null;
      rg.selectNodeContents(el); const b = rg.getBoundingClientRect();
      return { w: +(b.width / f.s).toFixed(1), h: +(b.height / f.s).toFixed(1), txt: (h.textContent || '').trim() };
    }, T);
    info('자릿수 최악 주입', fd ? ('«' + fd.txt + '» — 수량 잉크 ' + fd.w + ' × ' + fd.h
         + '  (기본 ' + T.d.num[2] + ' × ' + T.d.num[3] + ')') : '(실패)');
    T.fd = fd;

    const pre  = await runState(T, T.tag + '2 수리 전 · 최악 자릿수 — 신고 0개(660 그대로)', 'none');
    const now  = await runState(T, T.tag + '3 채택안 · 최악 자릿수 — 수량만 신고(' + T.keep + ')', T.keep);
    const both = await runState(T, T.tag + '4 대조군 · 최악 자릿수 — 라벨 통째 신고(i · 채택 안 함)', 'i');
    await setKeep(T.host, '');                      /* 원복 — 제품 선언 그대로 본다 */

    ok(pre.num.frames > 0, T.tag + '1 홀드 중 알이 실제로 태어난다(발화 0 이면 이 재현은 무효다)',
       pre.num.frames + '표본');
    ok(pre.num.max >= 0.25, T.tag + '2 등재문 재현 — 수리 전 사본에서 ' + T.name + ' 수량 잉크가 25% 이상 덮인다',
       '최대 ' + p1(pre.num.max * 100) + '%  (기본 자릿수에서는 ' + p1(base.num.max * 100) + '%)');
    ok(pre.num.pct05 >= 0.30, T.tag + '3 등재문 재현 — 그 덮임이 홀드 내내 이어진다',
       '≥5% 표본 ' + p1(pre.num.pct05 * 100) + '%');
    ok(now.num.max < 0.05, T.tag + '4 채택안 — 수량 잉크 덮임이 사라졌다',
       '최대 ' + p1(now.num.max * 100) + '%');
    ok(now.eggs >= pre.eggs * 0.85, T.tag + '5 밀도를 대가로 치르지 않았다(동시 알 수 ≥ 수리 전의 85%)',
       p1(now.eggs) + '알 ↔ 수리 전 ' + p1(pre.eggs) + '알');
    ok(both.eggs <= now.eggs, T.tag + '6 대조군(라벨 통째)은 밀도를 더 깎거나 같다 — 신고를 수량 하나로 둔 근거',
       '동시 ' + p1(both.eggs) + '알 ↔ 채택안 ' + p1(now.eggs) + '알 (뭉침 '
       + p1(both.fused * 100) + '% ↔ ' + p1(now.fused * 100) + '%)');
    T.st = { base, pre, now, both };
  }

  console.log('\n[C] 불변 — 816 이 소유한 훈련 자리와 콘솔');
  const cb = await page.evaluate(() => {
    const c = document.querySelector('#trCards [data-tr] .cb');
    return c ? getComputedStyle(c).getPropertyValue('--burst-keep').trim() : null;
  });
  ok(cb === 'i', 'C1 훈련 `.cb` 의 816 신고(`i`)는 한 값도 안 바뀌었다', String(cb));
  ok(errs.length === 0, 'C2 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0');

  await browser.close();
  console.log('\nPROBE818 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
