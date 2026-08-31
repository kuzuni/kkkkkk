#!/usr/bin/env node
/* 작업 591 재현 — `tools/verify579.js` 가 3회 중 1회 빨개지는 자리를 «찍어서» 가른다 (338 규칙)
 *
 *   node tools/probe591.js [반복수]        (부하를 걸고 돌려야 재현된다 — 아래 [A] 머리말)
 *
 * 등재문의 가설은 «문턱이 한 장도 안 봐준다» 였다. 이 자는 그 앞을 묻는다 —
 * 빠지는 한 장이 **정말로 누름이 빠진 프레임인가**, 아니면 **자가 엉뚱한 창을 재고 있는가**.
 *
 * 절:
 *   [A] §2 축 — 홀드를 n 회 굴려 «누름이 빠진 프레임» 의 t·scale·직전 변이를 전부 찍는다.
 *               같은 표본을 **두 자로** 채점한다: 현행(클래스가 붙은 뒤 100ms) vs 새 자(값이 도착한 뒤).
 *   [B] §4·§R-b 축 — 뗀 뒤 «`jz-up` 클래스 장수» 와 «`animationName === jzUp` 장수»·오버슈트를 나눠 센다
 *   [C] 되돌림 사본 셋(ⓐ·ⓑ·ⓒ)에서 같은 두 자를 돌려 **새 자도 빨간지** 확인한다
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, '.p591-neg.html');
const N = Number(process.argv[2] || 8);

const p2 = n => Math.round(n * 100) / 100;
const isDown = r => r.sc && r.sc !== 'none' && parseFloat(r.sc) <= 0.96;
const RAMP = 100;                                   /* 현행 자의 창 */

async function boot(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    openTrain(); setTrSub('train'); renderTrain();
  });
  await page.waitForTimeout(400);
  return { ctx, page };
}

/* verify579 의 hold() 와 같은 절차 + 노드 uid(교체를 본다)·클래스 변이 로그 */
async function hold(page, sel, ms, tail) {
  tail = tail || 460;
  const rest = await page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return null;
    const r = (typeof jzRestRect === 'function') ? jzRestRect(el) : el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);
  if (!rest) return null;
  await page.evaluate(([s, all]) => {
    window.__p591 = []; window.__uid = 0; window.__mut = [];
    const t0 = performance.now();
    const root = document.getElementById('trCards');
    if (root) {
      const mo = new MutationObserver(ms2 => {
        for (const m of ms2) window.__mut.push({ t: performance.now() - t0, a: m.attributeName,
          was: m.oldValue, now: m.target.getAttribute(m.attributeName) });
      });
      mo.observe(root, { attributes: true, subtree: true, attributeOldValue: true, attributeFilter: ['class'] });
      setTimeout(() => mo.disconnect(), all + 200);
    }
    const tick = () => {
      const el = document.querySelector(s);
      const t = performance.now() - t0;
      if (el) {
        if (!el.dataset.p591) el.dataset.p591 = String(++window.__uid);
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        window.__p591.push({ t, uid: +el.dataset.p591, cls: el.className, an: cs.animationName, sc: cs.scale, w: r.width });
      } else window.__p591.push({ t, uid: -1, cls: '', an: '', sc: '', w: 0 });
      if (t < all) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [sel, ms + tail]);
  await page.mouse.move(rest.x + rest.w / 2, rest.y + rest.h / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  const upAt = await page.evaluate(() => window.__p591.length ? window.__p591[window.__p591.length - 1].t : 0);
  await page.mouse.up();
  await page.waitForTimeout(tail + 120);
  const s = await page.evaluate(() => window.__p591);
  const mut = await page.evaluate(() => window.__mut || []);
  return { rest, s, upAt, mut };
}

const HAS = (r, c) => new RegExp('(^| )' + c + '( |$)').test(r.cls);

function metrics(run) {
  const s = run.s;
  const cls = s.filter(r => HAS(r, 'jz-dn'));
  const t0 = cls.length ? cls[0].t : 0;
  /* 자 ①(현행) — «클래스가 보인 뒤 100ms» 부터 전 프레임 */
  const dnOld = cls.filter(r => r.t >= t0 + RAMP);
  const oldPct = dnOld.length ? dnOld.filter(isDown).length / dnOld.length * 100 : 0;
  /* 자 ②(새 자) — «누름 값이 **도착한** 프레임» 부터 전 프레임 */
  const arr = cls.find(isDown);
  const dnNew = arr ? cls.filter(r => r.t >= arr.t) : [];
  const newPct = dnNew.length ? dnNew.filter(isDown).length / dnNew.length * 100 : 0;
  const lag = arr ? arr.t - t0 : -1;                 /* 값이 도착하기까지 걸린 시간 */
  const hbNew = dnNew.filter(r => HAS(r, 'jz-hb') || HAS(r, 'jz-hbx'));
  const tail = s.filter(r => r.t > run.upAt);
  const upCls = tail.filter(r => HAS(r, 'jz-up'));
  const upRun = tail.filter(r => r.an === 'jzUp');     /* **스프링이 실제로 도는** 프레임 */
  const over = tail.filter(r => r.w / run.rest.w > 1.005);
  return { clsN: cls.length, t0, lag, dnOld: dnOld.length, oldPct, dnNew: dnNew.length, newPct,
           hbOld: dnOld.filter(r => HAS(r, 'jz-hb') || HAS(r, 'jz-hbx')).length,
           hbNew: hbNew.length, hbNewDown: hbNew.filter(isDown).length,
           upCls: upCls.length, upRun: upRun.length, lost: upCls.filter(r => r.an !== 'jzUp').length,
           over: over.length, miss: dnOld.filter(r => !isDown(r)) };
}

function line(tag, m) {
  console.log('  ' + tag
    + ' | 도착 지연 ' + p2(m.lag) + 'ms'
    + ' | 자①(현행) ' + m.dnOld + '장 ' + p2(m.oldPct) + '%'
    + ' | 자②(새) ' + m.dnNew + '장 ' + p2(m.newPct) + '% (맥박 ' + m.hbNewDown + '/' + m.hbNew + ')'
    + ' | 뗌: jz-up 클래스 ' + m.upCls + '장 · **jzUp 실행** ' + m.upRun + '장 · 밀림 ' + m.lost
    + ' · 오버슈트 ' + m.over);
  if (m.miss.length) console.log('      ↯ 자① 빠짐 ' + m.miss.length + '장: '
    + m.miss.slice(0, 6).map(r => Math.round(r.t) + 'ms(sc=' + r.sc + ')').join(' · '));
}

async function sweep(browser, file, label, ms, n) {
  const c = await boot(browser, file);
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = await hold(c.page, '#trCards [data-tr]', ms);
    if (!r) { console.log('  ' + label + (i + 1) + ' | 표본 없음'); continue; }
    const m = metrics(r); out.push(m); line(label + (i + 1), m);
    await c.page.waitForTimeout(220);
  }
  await c.ctx.close();
  return out;
}

const sum = (o, n) => '자① 빨강 ' + o.filter(x => x.oldPct < 99).length + '/' + n
  + ' · 자② 빨강 ' + o.filter(x => x.newPct < 99).length + '/' + n
  + ' · jzUp 0장 ' + o.filter(x => !x.upRun).length + '/' + n
  + ' · 오버슈트 0장 ' + o.filter(x => !x.over).length + '/' + n
  + ' · 도착 지연 최대 ' + p2(Math.max(...o.map(x => x.lag))) + 'ms';

(async () => {
  const browser = await launch(chromium);
  const src = fs.readFileSync(SRC, 'utf8');

  console.log('\n[A] 현재 트리 — 훈련 카드 홀드 1.2초 × ' + N
    + '  (⚠ 재현하려면 CPU 를 채운 채 돌려라 — 한가한 기계에서는 지연이 안 난다)');
  console.log('  ⇒ ' + sum(await sweep(browser, SRC, 'A', 1200, N), N));

  console.log('\n[B] 현재 트리 — 900ms 홀드(§R-b 가 쓰는 길이) × ' + N);
  console.log('  ⇒ ' + sum(await sweep(browser, SRC, 'B', 900, N), N));

  const REV = [
    ['ⓐ 정적 값 → animation(수리 전)', s0 => s0.replace(
      /\.jz-dn\{scale:\.94;translate:0 8px;filter:brightness\(1\.10\);transition:[^}]*\}/,
      '.jz-dn{animation:jzDn .06s ease-out both;filter:brightness(1.10)}\n'
      + '  @keyframes jzDn{from{scale:1;translate:0 0}to{scale:.94;translate:0 8px}}')],
    ['ⓑ jzRelease 의 맥박 제거 줄 삭제', s0 => s0.replace("  el.classList.remove('jz-hb', 'jz-hbx');\n", '')],
    ['ⓒ 맥박을 통째로 죽인다', s0 => s0.replace('.jz-hb{animation:jzHb .08s ease-out both}', '.jz-hb{}')],
  ];
  for (const [name, fn] of REV) {
    const rev = fn(src);
    console.log('\n[C] 되돌림 사본 — ' + name + ' × ' + Math.min(N, 5));
    if (rev === src) { console.log('  ↯ 사본을 못 만들었다'); continue; }
    fs.writeFileSync(NEG, rev);
    try { console.log('  ⇒ ' + sum(await sweep(browser, NEG, 'C', 900, Math.min(N, 5)), Math.min(N, 5))); }
    finally { try { fs.unlinkSync(NEG); } catch (_) {} }
  }

  await browser.close();
})();
