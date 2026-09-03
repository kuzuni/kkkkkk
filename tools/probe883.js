#!/usr/bin/env node
/* 작업 883 재현 — 「씬 A 산포의 지렛대 = 「53」 keep-hole」 을 **찍힌 값**으로 잰다.
 *
 *   node tools/probe883.js
 *
 * 338 규칙 — 처방 전에 잰다. 이 자가 묻는 것은 셋이다:
 *   [1] **헛구멍이 어디에 있는가** — 883 등재문은 «`line-height:62` 상자 ↔ 잉크 47 ⇒ 위·아래 각 7.5px»
 *       라고 적었다. 제품은 그 전에 이미 요소 rect(62)가 아니라 **Range 상자**를 담고 있었으므로
 *       (816 §3) 등재문의 자리는 한 겹 위다. 실제 헛구멍은 **Range 상자(글꼴 상자) ↔ 글리프 잉크** 다.
 *   [2] **좁히면 무엇이 좋아지는가** — 같은 트리·같은 시드에서 자만 갈아 끼워(옛 자 = 글꼴 상자)
 *       산포·빈 각·몸길이를 비교한다. ⓑ 상한(구멍 없음)도 같이 재서 **어디까지 회수했는지**를 적는다.
 *   [3] **대가가 얼마인가** — 좁힌 만큼 알이 글꼴 상자 안으로 들어온다. 지켜야 하는 것은
 *       «가격을 읽을 수 있는가» 이므로 **글리프 잉크 덮임**이 0 이어야 하고, 글꼴 상자 덮임은
 *       올라도 된다(그 차이가 이 행의 본체다 — 816 [B] 의 자를 이 회차가 이관한 이유).
 *
 * ⚠ 자는 `tools/travel838.js` 한 벌 그대로(402 «두 벌 금지»). 판 사이 차이는 `opts.init` 한 줄뿐이다.
 * ⚠ **산포로 판정하지 않는다 — 시드 3장의 중앙값이다**(882 정정 ③ · 872·873 계열의 그 함정).
 * ⚠ 이 재현자는 **수리 후 트리에서도 초록**이다(882 §3 규약 — «수리 전에만 초록» 인 재현자는
 *   다음 세션이 게이트 부패로 읽는다). 옛 자 판은 파일 사본이 아니라 런타임 손잡이로 만든다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { runScene, SCENES } = require('./travel838');

const SRC = path.resolve(__dirname, '../index.html');
const p2 = n => Math.round(n * 100) / 100;
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 옛 자(글꼴 상자 = `Range` bbox)로 되돌리는 한 줄 — 883 이전의 구멍이 그대로 재현된다 */
const OLD_RULER = 'window.fxbInkRect = function(){ return null; };';
/* 816 이전 — 신고 자체를 지운다(구멍 0개 = ⓑ 상한) */
const NO_KEEP = "for(const c of document.querySelectorAll('#trCards [data-tr] .cb')) c.style.setProperty('--burst-keep','none-x');";

const SEEDS = [20260902, 20260903, 20260904];
const med = a => [...a].sort((x, y) => x - y)[1];

function spread(A) {
  const rs = A.per.map(p => p.rE);
  return { mn: Math.min(...rs), mx: Math.max(...rs), ratio: Math.max(...rs) / Math.max(1e-9, Math.min(...rs)) };
}

async function board(label, init, seed) {
  const A = await runScene(SCENES[0], null, { seed, init });
  if (A.err) throw new Error(label + ' — ' + A.err);
  const s = spread(A);
  console.log('    · ' + label.padEnd(30) + '산포 ×' + p2(s.ratio)
    + ' (끝반경 ' + p2(s.mn) + '..' + p2(s.mx) + ') | 빈각 ' + p2(A.fanGap)
    + '° | 몸길이 ' + p2(A.bodyMed) + ' | 스필 ' + p2(A.spill) + ' | 알 ' + A.n);
  return { A, s };
}

async function trio(label, init) {
  const rows = [];
  for (const sd of SEEDS) rows.push(await board(label + ' · 시드 ' + sd, init, sd));
  const out = { ratio: med(rows.map(r => r.s.ratio)), fan: med(rows.map(r => r.A.fanGap)),
                body: med(rows.map(r => r.A.bodyMed)), spill: Math.max(...rows.map(r => r.A.spill)),
                rs: rows.map(r => r.s.ratio) };
  console.log('    ⇒ ' + label.padEnd(20) + ' **중앙값** 산포 ×' + p2(out.ratio)
    + ' · 빈각 ' + p2(out.fan) + '° · 몸길이 ' + p2(out.body));
  return out;
}

/* [1]·[3] — 기하와 덮임은 한 페이지에서 잰다(브라우저를 또 띄우지 않는다) */
async function geoCov() {
  const b = await launch(chromium);
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto('file://' + SRC.replace(/\\/g, '/'));
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(800);
    await page.evaluate(() => { S.gold = 1e18; uiDirty = true; renderUI(); openTrain(); });
    await page.waitForTimeout(400);

    const geo = await page.evaluate(() => {
      const cb = document.querySelector('#trCards [data-tr] .cb');
      const i = cb.querySelector('i');
      const rg = document.createRange(); rg.selectNodeContents(i);
      const rr = rg.getBoundingClientRect();
      const ink = fxbInkRect(i, rr);
      const cs = getComputedStyle(i);
      const cv = document.createElement('canvas').getContext('2d');
      cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + parseFloat(cs.fontSize) + 'px ' + cs.fontFamily;
      const mt = cv.measureText(i.textContent);
      const m = Math.round(FXB_KOS * FX_CIC_SC);
      const holeNew = fxbKeepHoles(cb, m)[0];
      const save = window.fxbInkRect; window.fxbInkRect = () => null;
      const holeOld = fxbKeepHoles(cb, m)[0];
      window.fxbInkRect = save;
      const br = cb.getBoundingClientRect();
      return {
        text: i.textContent, m,
        elemH: i.getBoundingClientRect().height, lineH: cs.lineHeight,
        range: { top: rr.top, h: rr.height, w: rr.width },
        ink: ink ? { top: ink.top, h: ink.height, w: ink.width } : null,
        mt: { fa: mt.fontBoundingBoxAscent, fd: mt.fontBoundingBoxDescent,
              aa: mt.actualBoundingBoxAscent, ad: mt.actualBoundingBoxDescent,
              al: mt.actualBoundingBoxLeft, ar: mt.actualBoundingBoxRight, w: mt.width },
        holeNew, holeOld, btn: { top: br.top, h: br.height, w: br.width },
      };
    });

    /* 덮임 — 홀드 1400ms 를 16ms 로 훑어 «글리프 잉크» 와 «글꼴 상자» 를 따로 센다(816 [B] 와 같은 산수) */
    const COV = async (init) => {
      if (init) await page.evaluate(s => { (new Function(s))(); }, init);
      const r = await page.evaluate(async () => {
        const cb = document.querySelector('#trCards [data-tr] .cb');
        const i = cb.querySelector('i');
        const boxes = () => {
          const rg = document.createRange(); rg.selectNodeContents(i);
          const rr = rg.getBoundingClientRect();
          const ink = (window.__oldRuler ? null : fxbInkRect(i, rr)) || rr;
          return { font: rr, ink };
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
        const L = document.getElementById('fxl');
        const out = { font: [], ink: [], n: [] };
        cb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        const t0 = Date.now();
        while (Date.now() - t0 < 1400) {
          await new Promise(r2 => setTimeout(r2, 16));
          const eggs = [...L.children].filter(nd => /fx-spark/.test(nd.className + ''))
                                      .map(nd => nd.getBoundingClientRect());
          if (!eggs.length) continue;
          const bx = boxes();
          out.font.push(cov(bx.font, eggs)); out.ink.push(cov(bx.ink, eggs)); out.n.push(eggs.length);
        }
        cb.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        await new Promise(r2 => setTimeout(r2, 600));
        const mx = a => (a.length ? Math.max(...a) : 0);
        const cnt = (a, t) => a.filter(v => v >= t).length / (a.length || 1);
        return { samples: out.font.length, fontMax: mx(out.font), inkMax: mx(out.ink),
                 font05: cnt(out.font, 0.05), ink05: cnt(out.ink, 0.05), ink25: cnt(out.ink, 0.25),
                 eggs: out.n.reduce((a, b2) => a + b2, 0) / (out.n.length || 1) };
      });
      return r;
    };

    const covNew = await COV(null);
    const covOld = await COV(OLD_RULER + 'window.__oldRuler = 1;');
    await page.evaluate(() => { delete window.__oldRuler; });
    const covNone = await COV(NO_KEEP);
    return { geo, covNew, covOld, covNone, errs };
  } finally { await b.close(); }
}

(async () => {
  console.log('PROBE883 — 「53」 구멍의 헛자리와 그 지렛대 (씬 A · 훈련 [강화])');

  console.log('\n[1] 헛구멍은 어디에 있는가 — 요소 상자 ↔ Range(글꼴) 상자 ↔ 글리프 잉크');
  const { geo, covNew, covOld, covNone, errs } = await geoCov();
  const g = geo;
  console.log('    · 「' + g.text + '」 요소 h' + p2(g.elemH) + '(line-height ' + g.lineH + ')'
    + ' · Range h' + p2(g.range.h) + ' @y' + p2(g.range.top)
    + ' · 잉크 h' + p2(g.ink.h) + ' @y' + p2(g.ink.top));
  console.log('    · 글꼴 지표 — ascent ' + g.mt.fa + ' / descent ' + g.mt.fd
    + ' · 잉크 ascent ' + g.mt.aa + ' / descent ' + g.mt.ad
    + ' ⇒ 헛구멍 위 ' + p2(g.mt.fa - g.mt.aa) + 'px · 아래 ' + p2(g.mt.fd - g.mt.ad) + 'px');
  console.log('    · 가로 advance ' + p2(g.mt.w) + ' ↔ 잉크 ' + p2(g.mt.ar + g.mt.al)
    + ' (차 ' + p2(g.mt.w - (g.mt.ar + g.mt.al)) + 'px — 안 건드린다)');
  console.log('    · 구멍(여유 m=' + g.m + ') 옛 h' + p2(g.holeOld.h) + ' → 새 h' + p2(g.holeNew.h)
    + ' · 버튼 h' + p2(g.btn.h));

  ok(Math.abs(g.elemH - 62) < 1.5 && Math.abs(g.range.h - 46) < 1.5,
    '[1-a] ⚑⚑ **등재문 정정** — 제품이 담던 것은 요소 상자(62)가 아니라 **Range 상자 ' + p2(g.range.h) + '**'
    + ' 다(816 §3). 등재문의 «위·아래 각 7.5px» 은 한 겹 위의 자리다');
  ok(Math.abs((g.mt.fa + g.mt.fd) - g.range.h) <= 1.5,
    '[1-b] Range 상자 = 글꼴 상자(ascent+descent) — ' + (g.mt.fa + g.mt.fd) + ' ↔ ' + p2(g.range.h)
    + ' (`fxbInkRect` 의 대조 항이 이것이다)');
  ok(g.ink && g.ink.h < g.range.h - 8,
    '[1-c] ⚑ **헛구멍은 실재한다** — 글꼴 상자 h' + p2(g.range.h) + ' ↔ 글리프 잉크 h' + p2(g.ink.h)
    + ' (위 ' + p2(g.mt.fa - g.mt.aa) + ' · 아래 ' + p2(g.mt.fd - g.mt.ad) + ')', '숫자는 내림이 없다');
  ok(Math.abs(g.mt.w - (g.mt.ar + g.mt.al)) < 0.3 * ((g.mt.fa - g.mt.aa) + (g.mt.fd - g.mt.ad)),
    '[1-d] 가로 헛자리는 세로의 1/5 뿐이라 **안 건드린다** — advance ' + p2(g.mt.w) + ' ↔ 잉크 '
    + p2(g.mt.ar + g.mt.al) + ' (가로 ' + p2(g.mt.w - (g.mt.ar + g.mt.al)) + 'px ↔ 세로 '
    + p2((g.mt.fa - g.mt.aa) + (g.mt.fd - g.mt.ad)) + 'px)',
    '여유 m=' + g.m + ' 이 사방에 붙은 구멍에서 1.3px 씩은 잡음이고, 커닝 붙는 문자열에서 잉크를 자를 위험만 남는다');
  ok(g.holeNew.h < g.holeOld.h - 8 && Math.abs(g.holeNew.w - g.holeOld.w) < 0.51,
    '[1-e] 구멍이 **세로만** 좁아졌다 — h' + p2(g.holeOld.h) + ' → ' + p2(g.holeNew.h)
    + ' · 폭 ' + p2(g.holeOld.w) + ' → ' + p2(g.holeNew.w));
  ok(g.holeOld.h >= g.btn.h - 0.51 && g.holeNew.h < g.btn.h - 8,
    '[1-f] ⚑ 옛 구멍은 **버튼 세로를 통째로** 막았다(h' + p2(g.holeOld.h) + ' ≥ 버튼 ' + p2(g.btn.h)
    + ') — 새 구멍은 ' + p2(g.btn.h - g.holeNew.h) + 'px 을 되돌려 준다');

  console.log('\n[2] 좁히면 무엇이 좋아지는가 — 같은 트리·같은 시드 · 자만 갈아 끼운다 (시드 3장 중앙값)');
  const oldR = await trio('옛 자(글꼴 상자)', OLD_RULER);
  const newR = await trio('새 자(글리프 잉크)', null);
  const noneR = await trio('ⓑ 상한(구멍 없음)', NO_KEEP);
  const recov = (oldR.ratio - newR.ratio) / Math.max(1e-9, oldR.ratio - noneR.ratio);
  console.log('    ⇒ 회수율(산포) = (' + p2(oldR.ratio) + ' − ' + p2(newR.ratio) + ') ÷ ('
    + p2(oldR.ratio) + ' − ' + p2(noneR.ratio) + ') = **' + p2(100 * recov) + '%**');

  ok(oldR.ratio >= 2.3, '[2-a] 옛 자의 산포가 882 가 적은 자리에 있다(×2.4~2.9) — ×' + p2(oldR.ratio));
  ok(noneR.ratio < oldR.ratio, '[2-b] ⓑ 상한이 옛 자보다 낫다(882 정정 ② 재현) — ×'
    + p2(oldR.ratio) + ' → ×' + p2(noneR.ratio));
  ok(newR.ratio <= oldR.ratio + 0.001, '[2-c] ⚑ **새 자가 옛 자보다 나쁘지 않다** — 산포 ×'
    + p2(oldR.ratio) + ' → ×' + p2(newR.ratio) + ' (회수 ' + p2(100 * recov) + '%)');
  ok(newR.fan <= oldR.fan + 0.51, '[2-d] 빈 각도 안 나빠진다 — ' + p2(oldR.fan) + '° → ' + p2(newR.fan) + '°');
  ok(newR.body >= oldR.body - 0.01, '[2-e] 몸길이도 안 나빠진다 — ' + p2(oldR.body) + ' → ' + p2(newR.body));
  ok(newR.spill <= 0.01 && oldR.spill <= 0.01,
    '[2-f] 어느 판에서도 스필 0(619 13·14회차 불변) — ' + p2(oldR.spill) + ' / ' + p2(newR.spill));

  console.log('\n[3] 대가 — 좁힌 만큼 알이 «글꼴 상자» 안으로 들어온다. 지켜야 하는 것은 **잉크**다');
  const row = (nm, c) => console.log('    · ' + nm.padEnd(18) + '잉크 최대 ' + p2(100 * c.inkMax) + '%'
    + ' · 잉크 ≥5% 표본 ' + p2(100 * c.ink05) + '%' + ' · 글꼴상자 최대 ' + p2(100 * c.fontMax) + '%'
    + ' · 글꼴상자 ≥5% ' + p2(100 * c.font05) + '% · 알 ' + p2(c.eggs) + ' (표본 ' + c.samples + ')');
  row('옛 자', covOld); row('새 자', covNew); row('구멍 없음', covNone);

  ok(covNew.inkMax < 0.05, '[3-a] ⚑ **새 자에서도 글리프 잉크 덮임은 5% 미만**(816 의 약속) — 최대 '
    + p2(100 * covNew.inkMax) + '%');
  ok(covNew.ink25 === 0, '[3-b] 잉크 ≥25% 표본 0개 — ' + covNew.ink25);
  ok(covNone.inkMax > covNew.inkMax + 0.05,
    '[3-c] 신고를 지우면 잉크가 덮인다 — 최대 ' + p2(100 * covNone.inkMax) + '% ↔ 새 자 '
    + p2(100 * covNew.inkMax) + '% ([3-a] 가 헛초록이 아니다)');
  ok(covNew.eggs >= covOld.eggs * 0.85,
    '[3-d] 밀도는 안 깎였다 — 옛 ' + p2(covOld.eggs) + ' ↔ 새 ' + p2(covNew.eggs) + '알');
  ok(errs.length === 0, '[3-e] 콘솔 에러 0건', errs.length);

  console.log('\nPROBE883 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
