#!/usr/bin/env node
/* 작업 609 재현 — «`verify585` §5 가 흔들린다» 의 뿌리를 찍는다 (338 규칙: 처방 전에 재현)
 *
 *   node tools/probe609.js   → 마지막 줄이 `PROBE609 n/n PASS`
 *
 * 등재문(PROGRESS 609)은 갈래를 **둘**로 봤다:
 *   ⓐ 골드 66.03 이 두 실행 다 같은 값 = «결정적 드리프트 +0.73»(연출이 아니다)
 *   ⓑ 다이아 72.06 ↔ 59.73 = «`.pcb-p.fx-punch` 무력화가 샌다»
 * 이 자는 그 둘을 같은 나무에서 직접 물어 **한 뿌리**임을 보인다 —
 * 골드·다이아가 **같은 측정에서 같은 배율**로 어긋나고, 그 배율은 `.pcb-p` 에 걸린
 * **인라인** `transform:scale(1+a)` 다. 클래스(`fx-punch`)는 붙어 있지 않다.
 *
 * 왜 현행 무력화가 못 잡는가 — 93/13회차가 «UI 발» 펄스를 CSS 애니메이션에서
 * **JS 진폭 경로**(`fxPzHit` → `fxPzTick` 이 매 프레임 `el.style.transform` 을 쓴다)로 옮겼다.
 * `verify585` 152~159행의 `.pcb-p.fx-punch{transform:none!important}` 는 «클래스가 붙은»
 * 전투 발 경로만 겨냥하므로, 클래스 없이 인라인만 쓰는 그 경로를 통째로 지나친다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length)));
const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;

/* verify585 와 **같은 자**를 쓴다 — 다른 자로 재면 무엇을 비교하는지 알 수 없다 */
const ASSETS = fs.readdirSync(path.join(ROOT, 'assets/ui')).filter((f) => /^cur-.*\.svg$/.test(f));
async function inkRatio(ctx) {
  const src = {};
  for (const f of ASSETS) src[f] = fs.readFileSync(path.join(ROOT, 'assets/ui', f), 'utf8');
  const page = await ctx.newPage();
  await page.goto('about:blank');
  const out = await page.evaluate(async ({ src, N }) => {
    const res = {};
    for (const f in src) {
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src[f]);
      const img = new Image();
      await new Promise((y, n) => { img.onload = y; img.onerror = () => n(new Error(f)); img.src = url; });
      const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      let x1 = N, y1 = N, x2 = -1, y2 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
        if (d[(y * N + x) * 4 + 3] > 16) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
      res[f] = x2 < 0 ? { w: 0, h: 0 } : { w: (x2 - x1 + 1) / N, h: (y2 - y1 + 1) / N };
    }
    return res;
  }, { src, N: 512 });
  await page.close();
  return out;
}

const SETUP = `S.guide.idx = 99;
  Object.keys(DUN_UI).forEach(function(id){ S.dun[id] = 1; S.dunTk[id] = 9; });
  S.gold = 1e12; S.dia = 1e9; S.tstone = 9999; S.rstone = 9999; S.relic = 9999;
  markDirty && markDirty(); renderUI && renderUI();`;

/* 측정 = verify585 의 PICK 과 같은 식(조상 transform 을 곱한 «그려진» 폭) + 그 자리의 상태 */
const SHOT = `(function(){
  var M = (window.DOMMatrixReadOnly || window.DOMMatrix), out = [];
  [['pcbG','#dunw .pcb-g'],['pcbD','#dunw .pcb-d']].forEach(function(p){
    var pill = document.querySelector(p[1]); if(!pill) return;
    var im = pill.querySelector('i>.cic'); if(!im) return;
    var m = new M(getComputedStyle(im).transform === 'none' ? '' : getComputedStyle(im).transform);
    var el = im.parentElement;
    while(el && el !== document.documentElement){
      var t = getComputedStyle(el).transform;
      if(t && t !== 'none') m = new M(t).multiply(m);
      el = el.parentElement;
    }
    out.push({ slot:p[0], src:(im.getAttribute('src')||'').split('/').pop(),
               bw: parseFloat(getComputedStyle(im).width) * Math.hypot(m.a, m.b),
               inlineTr: pill.style.transform || '',
               cls: pill.className,
               pzA: (typeof fxPz !== 'undefined' && fxPz.get(pill)) ? fxPz.get(pill).a : null });
  });
  return { rows: out, pzSize: (typeof fxPz !== 'undefined' ? fxPz.size : -1),
           punchN: (typeof fxPunchN !== 'undefined' ? fxPunchN : -1) };
})`;

/* 애니메이터 끄기 — «결과(transform)» 가 아니라 «만드는 쪽» 을 끈다.
   그래야 제품이 `.pcb-p` 에 **정적** 배율을 얹는 회귀는 자가 여전히 본다([6] 이 못박는다). */
const STOP = `(function(){
  window.fxPunch = function(){ return false; };     /* 전투 발 — 클래스 경로 */
  window.fxPzHit = function(){ return false; };     /* UI 발 — JS 진폭 경로(93/13회차) */
  try { fxPz.clear(); } catch(e){}
  document.querySelectorAll('.pcb-p').forEach(function(e){
    e.classList.remove('fx-punch');   /* 897 — fx-punch2 는 제품에서 삭제됐다 */
    e.style.transform = ''; e.style.transformOrigin = '';
  });
})`;

async function open(ctx, opt) {
  opt = opt || {};
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1080, height: 2280 });
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  if (opt.css) await page.evaluate((t) => { const s = document.createElement('style'); s.textContent = t; document.head.appendChild(s); }, opt.css);
  await page.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await page.waitForTimeout(600);
  /* verify585 의 현행 무력화 — 그대로 심는다(이 자는 «그것이 새는가» 를 묻는다) */
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = '.pcb-p.fx-punch{animation:none!important;transform:none!important}';
    document.head.appendChild(s);
  });
  if (opt.stop) await page.evaluate(new Function('return ' + STOP)());
  await page.waitForTimeout(150);
  return page;
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const ratio = await inkRatio(ctx);
  const ink = (r) => r.bw * ((ratio[r.src] || { w: 1 }).w);

  /* ⚑ 671 이관(911, 2026-09-05) — 젬 상자 **59.06 → 65.3**.
     671(완료 2026-09-01, sess-1518-20796)이 «같은 `.pcb` 안에서 코인 65.3 ↔ 젬 59.06 = 비 1.106 이
     411·356 의 «덩치 최대÷최소 ≤ 1.05» 를 넘는다» 를 닫으면서 젬 상자를 코인과 **한 값**으로 모았다
     (`index.html` 5099·5106). 이 자만 옛 값에 굳어 §[4]·§[5] 가 빨갰던 것이고 **제품은 내내 옳았다** —
     59.06 을 되살리는 것은 671 을 되돌리는 것이다(`verify671` [R-2] 가 그 사본을 빨갛게 잡는다).
     ⚠ **두 이름을 한 상수로 접지 마라** — §[5] 는 «골드와 다이아가 **각각** 제 ref 에 있는가» 를 묻는다.
     한 이름으로 접으면 «둘이 같기만 하면 초록» 이 되어 671 이전으로 다시 갈라져도 안 짖는다.
     그 대신 «671 이 세운 코인 = 젬» 은 §[5] 의 [5-b] 가 **따로** 묻는다(333 «누른 항을 묻는 항»). */
  const REFG = 65.3, REFD = 65.3;

  /* ── [1] 재현 — 현행 무력화만으로 N회 재면 흔들린다 ─────────────────── */
  blk('[1] 등재문 재현 — 현행 무력화(`.pcb-p.fx-punch`)만으로 6회 측정');
  const page = await open(ctx, {});
  /* ⚑ 911 — 펄스를 **두 알약에 다 걸고** 잰다. 방치 수입이 골드만 올리므로 자연 표본에서는
     골드만 튀는데, 옛 자는 그 자리를 «다이아도 어긋난다»(= 낡은 REFD) 로 메우고 있었다.
     UI 발 진입점(`fxPunch(el, soft=true)` → `fxPzHit`)을 제품 그대로 불러 **같은 축이 두 알약을
     같이 덮는지**를 실제로 묻는다 — 표본이 «어쩌다 펄스에 걸렸는가» 에 의존하지 않게 하는 값도 겸한다. */
  await page.evaluate(`(function(){
    ['#dunw .pcb-g','#dunw .pcb-d'].forEach(function(q){
      var el = document.querySelector(q); if(el) fxPunch(el, true, true);
    });
  })()`);
  const on = [];
  for (let i = 0; i < 6; i++) {
    const s = await page.evaluate(SHOT + '()');
    const g = s.rows.find((r) => r.slot === 'pcbG'), d = s.rows.find((r) => r.slot === 'pcbD');
    on.push({ g: ink(g), d: ink(d), trG: g.inlineTr, trD: d.inlineTr, clsG: g.cls, clsD: d.cls,
              aG: g.pzA, aD: d.pzA, pz: s.pzSize });
    console.log('    #' + (i + 1) + '  골드 ' + r2(ink(g)) + '  다이아 ' + r2(ink(d))
      + '   인라인 g=' + (g.inlineTr || '없음') + ' d=' + (d.inlineTr || '없음')
      + '   클래스 g=[' + g.cls + ']');
    await page.waitForTimeout(220);
  }
  const offRef = (v, ref) => Math.abs(v / ref - 1) > 0.005;
  const badG = on.filter((s) => offRef(s.g, REFG)).length;
  const badD = on.filter((s) => offRef(s.d, REFD)).length;
  ok(badG > 0 && badD > 0, '§5 의 두 값이 실제로 ref 를 벗어난다 (자 부패가 재현된다)',
    '골드 ' + badG + '/6 · 다이아 ' + badD + '/6 벗어남');
  const spanG = Math.max(...on.map((s) => s.g)) - Math.min(...on.map((s) => s.g));
  const spanD = Math.max(...on.map((s) => s.d)) - Math.min(...on.map((s) => s.d));
  ok(spanG > 0.01 || spanD > 0.01, '같은 페이지 안에서도 값이 흔들린다 (플레이키의 정체)',
    '골드 폭 ' + r2(spanG) + ' · 다이아 폭 ' + r2(spanD));

  /* ── [2] 뿌리 — 클래스가 아니라 «인라인» transform 이다 ────────────── */
  blk('[2] 뿌리 — 어긋난 프레임에 무엇이 걸려 있나');
  const drift = on.filter((s) => offRef(s.g, REFG) || offRef(s.d, REFD));
  const sample = drift[0] || on[0];
  ok(drift.length > 0, '어긋난 표본을 잡았다', drift.length + '/6');
  ok(/scale\(/.test(sample.trG || '') || /scale\(/.test(sample.trD || ''),
    '그 표본의 `.pcb-p` 에 **인라인** `transform:scale(...)` 이 걸려 있다',
    'g=' + (sample.trG || '없음') + ' · d=' + (sample.trD || '없음'));
  ok(!/fx-punch/.test(sample.clsG) && !/fx-punch/.test(sample.clsD),
    '그런데 클래스에는 `fx-punch` 가 **없다** — 현행 무력화의 선택자가 이 자리를 안 덮는다',
    'g=[' + sample.clsG + '] · d=[' + sample.clsD + ']');
  ok(sample.aG != null || sample.aD != null,
    '그 배율의 출처는 `fxPz`(93/13회차 JS 진폭 경로)다',
    'a(gold)=' + r4(sample.aG) + ' · a(dia)=' + r4(sample.aD) + ' · fxPz.size=' + sample.pz);

  /* ── [3] 등재문 «갈래가 둘» 기각 — 골드·다이아가 같은 축이다 ──────── */
  blk('[3] 등재문 «갈래가 둘 · 한 처방으로 안 닫힌다» 를 대조로 확인/기각');
  const both = on.filter((s) => s.aG != null && s.aD != null);
  const paired = on.map((s) => ({ rg: s.g / REFG, rd: s.d / REFD }));
  paired.forEach((p, i) => console.log('    #' + (i + 1) + '  골드 배율 ' + r4(p.rg) + '  다이아 배율 ' + r4(p.rd)));
  ok(on.some((s) => offRef(s.g, REFG)) && on.some((s) => offRef(s.d, REFD)),
    '골드도 다이아도 같은 원인으로 어긋난다 (골드만 «결정적 드리프트» 가 아니다)',
    '골드 ' + badG + '/6 · 다이아 ' + badD + '/6');
  /* ⚑ 911 — 옛 자는 여기가 `both.length > 0 || true` 라 **무엇을 재도 초록**이었다(헛초록).
     `|| true` 를 걷어내 «두 알약이 같은 표에 같이 올라간다» 를 실제로 묻게 한다. */
  ok(both.length > 0, '두 알약이 같은 `fxPz` 표에 같이 올라간다', 'a 쌍 표본 ' + both.length + '건');

  /* ── [4] 처방 — 애니메이터를 끄면 값이 정확해진다 ───────────────────── */
  blk('[4] 처방 — 만드는 쪽(`fxPunch`/`fxPzHit`)을 끄고 6회 측정');
  await page.evaluate(new Function('return ' + STOP)());
  await page.waitForTimeout(200);
  const off = [];
  for (let i = 0; i < 6; i++) {
    const s = await page.evaluate(SHOT + '()');
    const g = s.rows.find((r) => r.slot === 'pcbG'), d = s.rows.find((r) => r.slot === 'pcbD');
    off.push({ g: ink(g), d: ink(d), trG: g.inlineTr, trD: d.inlineTr });
    console.log('    #' + (i + 1) + '  골드 ' + r2(ink(g)) + '  다이아 ' + r2(ink(d))
      + '   인라인 g=' + (g.inlineTr || '없음') + ' d=' + (d.inlineTr || '없음'));
    await page.waitForTimeout(220);
  }
  /* ⚑ 911 — 기대값을 문장에 손으로 적지 않는다(그 사본이 늙어서 이 자가 빨갰다). 상수에서 찍는다. */
  ok(off.every((s) => !offRef(s.g, REFG)), '6회 전부 골드 = ' + REFG + ' (±0.5%)',
    off.map((s) => r2(s.g)).join(' · '));
  ok(off.every((s) => !offRef(s.d, REFD)), '6회 전부 다이아 = ' + REFD + ' (±0.5%)',
    off.map((s) => r2(s.d)).join(' · '));
  ok(off.every((s) => !s.trG && !s.trD), '인라인 transform 이 남지 않는다 (쉬는 상태와 같은 값)',
    '남은 표본 ' + off.filter((s) => s.trG || s.trD).length + '건');
  await page.close();

  /* ── [5] 제품 값이 원래 그 값임을 10 상점으로 검산 ─────────────────── */
  blk('[5] 검산 — 같은 부품을 10 상점에서 재면 처음부터 ' + REFG + ' / ' + REFD + ' 이다');
  const p2 = await open(ctx, { stop: true });
  await p2.evaluate(() => { openShopPage(); return 1; });
  await p2.waitForTimeout(500);
  const shop = await p2.evaluate(`(function(){
    var M = (window.DOMMatrixReadOnly || window.DOMMatrix), out = {};
    [['g','#shopw .pcb-g'],['d','#shopw .pcb-d']].forEach(function(p){
      var im = document.querySelector(p[1] + ' i>.cic'); if(!im) return;
      var m = new M(getComputedStyle(im).transform === 'none' ? '' : getComputedStyle(im).transform);
      var el = im.parentElement;
      while(el && el !== document.documentElement){
        var t = getComputedStyle(el).transform;
        if(t && t !== 'none') m = new M(t).multiply(m);
        el = el.parentElement;
      }
      out[p[0]] = { src:(im.getAttribute('src')||'').split('/').pop(),
                    bw: parseFloat(getComputedStyle(im).width) * Math.hypot(m.a, m.b) };
    });
    return out;
  })()`);
  ok(!offRef(ink(shop.g), REFG) && !offRef(ink(shop.d), REFD),
    '[5-a] 10 상점 `.pcb` = ' + REFG + ' / ' + REFD + ' ⇒ 제품(`index.html` 5099·5106)은 안 바뀌었다',
    r2(ink(shop.g)) + ' / ' + r2(ink(shop.d)));
  /* ⚑ 911 신설 — 333 «누른 항을 묻는 항». [5-a] 는 두 알약을 **각각** 제 ref 에 대는 항이라,
     REFD 를 옮긴 이번 수리 자체(«671 이 코인과 젬을 한 값으로 모았다»)는 아무도 안 묻는다.
     둘이 다시 갈라지면 [5-a] 는 «REFD 도 같이 갈아 끼우면» 초록으로 되돌아갈 수 있으므로,
     411·356 눈금(덩치 최대÷최소 ≤ 1.05)을 **찍힌 값으로** 여기서 따로 못박는다. */
  const bg = ink(shop.g), bd = ink(shop.d);
  const rat = Math.max(bg, bd) / Math.min(bg, bd);
  ok(rat <= 1.05,
    '[5-b] 671 — 같은 `.pcb` 안에서 코인과 젬이 **한 값**이다 (411·356 눈금 ≤ 1.05)',
    r2(bg) + ' ÷ ' + r2(bd) + ' = ' + r4(rat) + ' (671 수리 전 65.3 ÷ 59.06 = 1.106)');
  await p2.close();

  /* ── [6] 무르게 안 풀었음 — 정적 회귀는 껐어도 그대로 보인다 ───────── */
  blk('[6] 무르게 풀지 않았음 — 제품이 `.pcb-p` 에 **정적** 배율을 얹으면 여전히 빨개진다');
  const p3 = await open(ctx, { css: '#dunw .pcb-p{transform:scale(1.05)}', stop: true });
  const s3 = await p3.evaluate(SHOT + '()');
  const g3 = ink(s3.rows.find((r) => r.slot === 'pcbG')), d3 = ink(s3.rows.find((r) => r.slot === 'pcbD'));
  ok(offRef(g3, REFG) && offRef(d3, REFD),
    '[6] 정적 `scale(1.05)` 사본에서 골드·다이아가 둘 다 ref 를 벗어난다',
    r2(g3) + ' / ' + r2(d3) + ' (기대 ' + REFG + ' / ' + REFD + ')');
  await p3.close();

  await browser.close();
  console.log('\nPROBE609 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
