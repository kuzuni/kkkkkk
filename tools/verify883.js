#!/usr/bin/env node
/* 작업 883 게이트 — 「keep-hole 은 **글꼴 상자가 아니라 글리프 잉크**를 담는다」
 * (816 이 판 구멍의 **헛자리**를 걷어낸 자리 · 상세는 PROGRESS 883 행 · `docs/review/883-*.md`)
 *
 *   node tools/verify883.js
 *
 *   [A] 선언  — 자(`fxbInkRect`)가 한 벌이고, **글자 구멍에서만** 갈렸으며(`fxbTextHoles` 는 옛 자),
 *               캔버스 지표가 레이아웃과 어긋나면 **옛 자로 되돌아간다**(무르게 푸는 길이 없다)
 *   [B] 그림  — 신고한 세 호스트(훈련 `i` · 단련 `.tbn` · 룬 `.rbn`)에서 구멍이 **세로만** 좁아지고,
 *               새 구멍은 옛 구멍의 **부분집합**이다(= 이 변경은 자리를 «돌려줄» 뿐 더 뺏지 못한다)
 *   [C] 불변  — 홀드 내내 **글리프 잉크 덮임 0**(816 의 약속) · 밀도·«스폰은 버튼뿐»(660) 그대로
 *   [R] 되돌림 — 옛 자로 되돌리면 [B] 가 빨개지고, 신고를 지우면 [C] 가 빨개진다
 *
 * ⚠ **산포·빈 각은 이 자가 안 본다.** 그 축은 시드마다 ±0.5 로 흔들려(882 정정 ③) 문턱으로 쓰면
 *   574·709·825·854·855·870·871·872·873 계열의 «플레이키 자» 를 하나 더 만든다. 그 값은
 *   재현자(`probe883`)가 시드 3장 중앙값으로 **기록만** 하고, 게이트는 결정적인 기하만 지킨다.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const HOLD_MS = Number(process.env.V883_HOLD || 1200);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p2 = n => Math.round(n * 100) / 100;

/* 한 호스트의 «옛 구멍 ↔ 새 구멍» 을 같은 순간에 잰다(자만 갈아 끼운다 — 상자는 한 번도 안 움직인다) */
const HOLES = (arg) => {
  const host = document.querySelector(arg.host);
  if (!host) return { err: '호스트 없음 ' + arg.host };
  const el = host.querySelector(arg.keep);
  if (!el) return { err: '신고 잉크 없음 ' + arg.keep };
  const m = arg.m;
  const one = () => { const h = fxbKeepHoles(host, m); return h.length === 1 ? h[0] : { n: h.length }; };
  const neu = one();
  const save = window.fxbInkRect; window.fxbInkRect = () => null;
  const old = one();
  window.fxbInkRect = save;
  const f = fxSc();
  const br = host.getBoundingClientRect();
  const rg = document.createRange(); rg.selectNodeContents(el);
  const rr = rg.getBoundingClientRect();
  const ink = fxbInkRect(el, rr);
  return {
    neu, old, m,
    btn: { y: (br.y - f.y) / f.s, h: br.height / f.s, w: br.width / f.s },
    range: { h: rr.height, w: rr.width }, ink: ink ? { h: ink.height, w: ink.width } : null,
  };
};

/* 홀드 한 판 — «글리프 잉크» 덮임·밀도·버튼 밖 알을 센다(816 [B][C] 와 같은 산수, 자만 잉크다) */
const HOLD = async (ms) => {
  const cb = document.querySelector('#trCards [data-tr] .cb');
  const i = cb.querySelector('i');
  const L = document.getElementById('fxl');
  const inkBox = () => {
    const rg = document.createRange(); rg.selectNodeContents(i);
    const rr = rg.getBoundingClientRect();
    return fxbInkRect(i, rr) || rr;
  };
  const cov = (bx, eggs) => {
    const x0 = Math.floor(bx.left), y0 = Math.floor(bx.top);
    const w = Math.ceil(bx.width), h = Math.ceil(bx.height);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
    }
    return n / (w * h);
  };
  const rows = [];
  cb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await new Promise(r => setTimeout(r, 16));
    const b = cb.getBoundingClientRect();
    const eggs = [...L.children].filter(nd => /fx-spark/.test(nd.className + ''))
                                .map(nd => nd.getBoundingClientRect());
    if (!eggs.length) continue;
    const out = eggs.filter(e => {
      const cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
      return cx < b.left - 1 || cx > b.right + 1 || cy < b.top - 1 || cy > b.bottom + 1;
    }).length;
    rows.push({ c: cov(inkBox(), eggs), n: eggs.length, out });
  }
  cb.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  const mx = k => (rows.length ? Math.max(...rows.map(r => r[k])) : 0);
  return {
    frames: rows.length, max: mx('c'),
    n05: rows.filter(r => r.c >= 0.05).length, n25: rows.filter(r => r.c >= 0.25).length,
    eggs: rows.reduce((a, r) => a + r.n, 0) / Math.max(1, rows.length), out: mx('out'),
  };
};

const HOSTS = [
  { nm: '훈련 `.cb`',      host: '#trCards [data-tr] .cb',    keep: 'i',     sub: null },
  { nm: '단련 `.tb`',      host: '#trw .tr-tp.k0 .tb',        keep: '.tbn',  sub: 'temper' },
  { nm: '룬 `.rbt.b1`',    host: '#trw .tr-rn .rbt.b1',       keep: '.rbn',  sub: 'rune' },
];

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ───────────────────────────────────────────────────── */
  console.log('[A] 선언 — 자가 한 벌이고, 갈린 자리는 하나이며, 어긋나면 옛 자로 되돌아간다');
  const inkFn = (code.match(/function fxbInkRect\(el, b\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(inkFn.length > 0, 'A1 글리프 잉크 자 `fxbInkRect(el, b)` 가 있다');
  ok(/measureText/.test(inkFn) && /actualBoundingBoxAscent/.test(inkFn) && /actualBoundingBoxDescent/.test(inkFn),
    'A2 자는 캔버스 `measureText` 의 **잉크 지표**(actualBoundingBox*)로 잰다');
  ok(/\(fa \+ fd\) - b\.height\) > 1\.5/.test(inkFn) && /return null/.test(inkFn),
    'A3 ⚑ **대조 항** — 캔버스가 잰 글꼴 상자가 레이아웃 Range 상자와 어긋나면 `null`(= 옛 자)로 되돌아간다',
    '무르게 푸는 길을 안 연다');
  ok(/left: b\.left/.test(inkFn) && /width: b\.width/.test(inkFn),
    'A4 **가로는 안 건드린다** — 좌변·폭은 Range 상자 그대로(883 [1-d]: 가로 헛자리는 세로의 1/5)');
  const keepFn = (code.match(/function fxbKeepHoles\(t, m\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(/fxbInkRect\(el, b\) \|\| b/.test(keepFn),
    'A5 `fxbKeepHoles` 의 **글자 갈래만** 새 자를 쓰고, 실패하면 옛 자로 떨어진다');
  const textFn = (code.match(/function fxbTextHoles\(t, m\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(textFn.length > 0 && !/fxbInkRect/.test(textFn),
    'A6 ⚑ `fxbTextHoles`(660·43회차)의 자는 **안 바뀌었다** — 09·12·17·장비·코스튬이 그 값 위에 서 있다');

  const b = await launch(chromium);
  const errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      S.gold = 1e18; S.dia = 1e9; S.tstone = 1e9; S.rstone = 1e9;
      if (S.temper) S.temper.pts = 1e6;
      uiDirty = true; renderUI(); openTrain();
    });
    await page.waitForTimeout(400);

    /* ── [B] 그림 ─────────────────────────────────────────────────── */
    console.log('\n[B] 그림 — 구멍이 **세로만** 좁아지고, 새 구멍 ⊂ 옛 구멍 (신고한 세 호스트 전부)');
    const got = [];
    for (const h of HOSTS) {
      if (h.sub) { await page.evaluate(s => { setTrSub(s); }, h.sub); await page.waitForTimeout(350); }
      const r = await page.evaluate(HOLES, { host: h.host, keep: h.keep, m: 30 });
      if (r.err) { ok(false, 'B0 ' + h.nm + ' — ' + r.err); continue; }
      got.push({ h, r });
      console.log('    · ' + h.nm.padEnd(16) + '글꼴상자 h' + p2(r.range.h) + ' → 잉크 h' + p2(r.ink ? r.ink.h : NaN)
        + ' | 구멍 h' + p2(r.old.h) + ' → ' + p2(r.neu.h) + ' (폭 ' + p2(r.old.w) + ' → ' + p2(r.neu.w) + ')'
        + ' | 버튼 h' + p2(r.btn.h));
    }
    ok(got.length === HOSTS.length, 'B1 신고한 호스트 셋을 다 찾았다 — ' + got.length + '/3');
    for (const { h, r } of got) {
      ok(r.ink && r.neu.h <= r.old.h + 0.01 && Math.abs(r.neu.w - r.old.w) < 0.51,
        'B2 ' + h.nm + ' — 구멍이 **세로만** 안 커진다(h' + p2(r.old.h) + '→' + p2(r.neu.h)
        + ' · 폭 Δ' + p2(r.neu.w - r.old.w) + ')');
      ok(r.neu.x >= r.old.x - 0.01 && r.neu.y >= r.old.y - 0.01
        && r.neu.x + r.neu.w <= r.old.x + r.old.w + 0.01 && r.neu.y + r.neu.h <= r.old.y + r.old.h + 0.01,
        'B3 ' + h.nm + ' — 새 구멍이 옛 구멍의 **부분집합**이다(자리를 돌려줄 뿐 더 못 뺏는다)');
    }
    const tr = got[0].r;
    ok(Math.abs(tr.neu.h - (tr.ink.h + 2 * tr.m)) < 0.51,
      'B4 훈련 — 구멍 세로 = **잉크 + 여유 2m** — ' + p2(tr.neu.h) + ' ↔ ' + p2(tr.ink.h + 2 * tr.m));
    ok(tr.old.h >= tr.btn.h - 0.51 && tr.neu.h <= tr.btn.h - 8,
      'B5 ⚑ 옛 구멍은 **버튼 세로를 통째로** 막았다(h' + p2(tr.old.h) + ' ≥ 버튼 ' + p2(tr.btn.h)
      + ') — 새 구멍은 ' + p2(tr.btn.h - tr.neu.h) + 'px 을 되돌린다');

    /* ── [C] 불변 ─────────────────────────────────────────────────── */
    console.log('\n[C] 불변 — 홀드 내내 **잉크 덮임 0** · 밀도 · «스폰은 버튼뿐»(660)');
    await page.evaluate(() => { setTrSub('train'); });
    await page.waitForTimeout(350);
    const H = await page.evaluate(HOLD, HOLD_MS);
    console.log('    · 홀드 ' + H.frames + '표본 — 잉크 최대 ' + p2(100 * H.max) + '% · ≥5% ' + H.n05
      + '개 · ≥25% ' + H.n25 + '개 · 알 ' + p2(H.eggs) + ' · 버튼 밖 ' + H.out);
    ok(H.frames >= 8, 'C0 알이 실제로 태어났다(전제 항 — 없으면 아래가 헛초록) — 표본 ' + H.frames);
    ok(H.max < 0.05, 'C1 ⚑ **글리프 잉크 덮임 최대 <5%**(816 의 약속) — ' + p2(100 * H.max) + '%');
    ok(H.n25 === 0 && H.n05 === 0, 'C2 잉크 ≥5%·≥25% 표본 0개 — ' + H.n05 + ' / ' + H.n25);
    ok(H.eggs >= 9, 'C3 밀도를 안 잃었다(816 [C2] 와 같은 눈금) — 평균 ' + p2(H.eggs) + '알');
    ok(H.out === 0, 'C4 알 중심이 버튼 밖 0개(660 «스폰은 버튼뿐») — ' + H.out);

    /* ── [R] 되돌림 ───────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 — 무르게 푼 수리가 아니다');
    const rev = await page.evaluate((arg) => {
      const save = window.fxbInkRect; window.fxbInkRect = () => null;
      const h = fxbKeepHoles(document.querySelector(arg.host), arg.m)[0];
      window.fxbInkRect = save;
      return h;
    }, { host: HOSTS[0].host, m: 30 });
    ok(rev.h > tr.neu.h + 8,
      'R1 옛 자로 되돌리면 구멍이 다시 글꼴 상자로 커진다 — h' + p2(tr.neu.h) + ' → ' + p2(rev.h)
      + ' ([B4] 가 빨개지는 자리)');

    await page.evaluate(() => {
      document.querySelector('#trCards [data-tr] .cb').style.setProperty('--burst-keep', 'none-x');
    });
    const noKeep = await page.evaluate(HOLD, HOLD_MS);
    await page.evaluate(() => {
      document.querySelector('#trCards [data-tr] .cb').style.removeProperty('--burst-keep');
    });
    ok(noKeep && (noKeep.n05 > 0 || noKeep.max >= 0.05),
      'R2 신고를 지우면(816 이전) 잉크가 다시 덮인다 — 최대 ' + p2(100 * (noKeep ? noKeep.max : 0))
      + '% · ≥5% 표본 ' + (noKeep ? noKeep.n05 : '-') + '개 ([C1] 이 헛초록이 아니다)');

    /* R3 — 캔버스 지표가 레이아웃과 어긋나는 판을 **실제로 만들어** 폴백을 확인한다 */
    const fb = await page.evaluate((arg) => {
      const proto = CanvasRenderingContext2D.prototype;
      const real = proto.measureText;
      proto.measureText = function (t) {
        const m = real.call(this, t);
        return { width: m.width, fontBoundingBoxAscent: 5, fontBoundingBoxDescent: 5,
                 actualBoundingBoxAscent: 3, actualBoundingBoxDescent: 1,
                 actualBoundingBoxLeft: 0, actualBoundingBoxRight: m.width };
      };
      if (fxbInkRect.cv) fxbInkRect.cv = null;
      const h = fxbKeepHoles(document.querySelector(arg.host), arg.m)[0];
      proto.measureText = real; fxbInkRect.cv = null;
      return h;
    }, { host: HOSTS[0].host, m: 30 });
    ok(Math.abs(fb.h - rev.h) < 0.51,
      'R3 ⚑ 캔버스 지표가 레이아웃과 어긋나면 **옛 자로 되돌아간다**(잉크 4px 이 아니라 글꼴 상자 '
      + p2(rev.h) + ') — h' + p2(fb.h), '자를 속여도 구멍이 무르게 안 풀린다');

    /* ⚠ R4 는 **h 를 [B4] 의 값과 직접 비교하지 않는다** — 홀드가 가격을 올려 문자열이 바뀌었고
       (「45」 → 자릿수·글리프가 다르다) 잉크 높이는 그 문자열을 따라간다. 그것이 816 의 요지
       («여기 적힌 것은 라벨이 아니라 «지금 누르면 얼마인가» 이고 강화할 때마다 오른다») 이므로
       묻는 것은 «그 순간의 잉크» 다: 새 자 = 잉크 + 2m 이고 옛 자보다 여전히 작은가. */
    const back = await page.evaluate((arg) => {
      const host = document.querySelector(arg.host), el = host.querySelector(arg.keep);
      const neu = fxbKeepHoles(host, arg.m)[0];
      const save = window.fxbInkRect; window.fxbInkRect = () => null;
      const old = fxbKeepHoles(host, arg.m)[0];
      window.fxbInkRect = save;
      const rg = document.createRange(); rg.selectNodeContents(el);
      const ink = fxbInkRect(el, rg.getBoundingClientRect());
      return { neu, old, ink: ink ? ink.height : null, tx: (el.textContent || '').trim() };
    }, { host: HOSTS[0].host, keep: HOSTS[0].keep, m: 30 });
    ok(back.ink !== null && Math.abs(back.neu.h - (back.ink + 60)) < 0.51 && back.neu.h < back.old.h - 8,
      'R4 원복하면 다시 새 자다 — 「' + back.tx + '」(홀드가 가격을 올렸다) 잉크 h' + p2(back.ink)
      + ' ⇒ 구멍 h' + p2(back.neu.h) + ' (옛 자 ' + p2(back.old.h) + ') — **자가 그 순간의 문자열을 따라간다**');
    ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.length);
  } finally { await b.close(); }

  console.log('\nVERIFY883 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
