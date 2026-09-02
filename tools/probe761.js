#!/usr/bin/env node
/* 761 재현 — 9:13.3(1600) 에서 23 훈련 팝업 타이틀이 상단 «⚔️ 전투력» 토스트에 가린다
 *            «잠복(748 자매 — 팝업 밖 겹침)»
 *
 *   node tools/probe761.js
 *
 * ⚑ 338 규칙 — 처방을 따르기 전에 **찍힌 값**으로 재현부터 한다.
 *   등재문(비평 2인 일치)은 «타이틀 상단 ≈57% 가림 · 2280 은 0» 이라고 적었다.
 *   이 재현기가 묻는 것은 넷이다:
 *
 *   [1] 겹침    — 1600 에서 토스트 상자가 «훈련» 글리프를 실제로 덮는가(덮이는 세로 %).
 *   [2] 무해    — 2280 에서는 같은 두 상자가 안 겹치는가(= «짧은 프레임에서만» 나는 병).
 *   [3] 뿌리    — 토스트 top 은 **프레임과 무관한 상수**(143)이고 시트는 **하단 앵커**라,
 *                 프레임이 짧아지면 시트가 토스트 쪽으로 올라온다. 두 앵커가 서로를 안 본다.
 *   [4] 수리 후 — 현재 트리에서 1600 겹침이 0 이고, 2280 좌표는 **Δ0px**(무개입)이며,
 *                 토스트가 프레임 안에 있고 «가려서 못 읽는 자리»(타이틀)를 안 문다.
 *
 * ⚠ [1]~[3] 은 «수리 전 트리»가 아니라 **지금 트리에서 토스트 상수를 되돌린 사본**으로 재지 않는다 —
 *   수리 전 트리를 `git show` 로 꺼내 그대로 띄운다(756 공용 부품이 얕은 클론을 판다).
 *   못 꺼내면 «보류(환경)» 이고 실패가 아니다. [4] 는 현재 트리라 언제나 돈다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const G756 = require('./gitrev756');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const CUR = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const PRE = process.env.PROBE761_PRE || '9a52e9f';   /* claim(761) — 수리 직전 트리 */

let pass = 0, fail = 0, skip = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const na = (name, detail) => { console.log('⏸ SKIP ' + name + (detail ? ' — ' + detail : '')); skip++; };

const open = async (browser, url, h) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof fxToast === 'function' && typeof openTrain === 'function');
  await page.waitForTimeout(900);                /* 60 쥬시(등장 전이)가 걷힐 때까지 */
  return { page, errs };
};

/* 23 훈련 팝업을 열고 «⚔️ 전투력 +n» 토스트를 띄운 뒤, 두 상자를 **같은 순간**에 잰다.
   토스트는 `cpSay()` 가 만드는 것과 **같은 문자열·같은 함수**(fxToast)로 낸다 —
   여기서 재는 것은 문구가 아니라 **자리**다. */
const shoot = async (page) => {
  await page.click('.tab[data-t="grow"]', { timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__t761 = fxToast('⚔️ 전투력 <b>+1,234</b>'); });
  /* ⚠ 등장 애니(`fxToastIn` .76s)의 0% 는 `translateY(-40px)` 이다 — 만들자마자 재면
     **정착 자리보다 40px 위**가 찍혀 «안 겹친다» 는 반대 결론이 나온다(1회차에 실제로 그랬다).
     정착(25% = 190ms)을 지나 부유 구간에서 잰다. */
  await page.waitForTimeout(320);
  return page.evaluate(() => {
    const el = window.__t761;
    const r = o => { const b = o.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), b: +(b.y + b.height).toFixed(2) }; };
    const ink = n => { const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); return { y: +b.y.toFixed(2), h: +b.height.toFixed(2), b: +(b.y + b.height).toFixed(2) }; };
    const ti = document.querySelector('#trw .tr-head > i');
    const sheet = document.querySelector('#trw .tr-sheet');
    const plate = document.querySelector('.pedge');
    const t = r(el), g = ink(ti);
    /* 덮인 세로 구간 — 토스트 상자 ∩ 타이틀 글리프 */
    const ov = Math.max(0, Math.min(t.b, g.b) - Math.max(t.y, g.y));
    return {
      open: document.getElementById('trw').classList.contains('on'),
      frameH: document.getElementById('app').getBoundingClientRect().height,
      toast: t, title: g, sheet: r(sheet),
      plate: plate ? r(plate) : null,
      ovPx: +ov.toFixed(2), ovPct: +(100 * ov / g.h).toFixed(1),
      /* ⚠ 자리를 «상수인가» 로 물을 때는 rect 가 아니라 **CSS top** 을 본다 —
         rect 에는 부유(62% 키프레임 5px)·scale(1.006) 이 섞여 프레임마다 소수점이 흔들린다. */
      cssTop: +parseFloat(getComputedStyle(el).top).toFixed(2),
      zT: getComputedStyle(el).zIndex, layer: getComputedStyle(el.parentNode).zIndex
    };
  });
};

const line = (tag, m) => console.log('    ' + tag + ' 시트 상변 ' + m.sheet.y + ' · 타이틀 글리프 '
  + m.title.y + '..' + m.title.b + ' · 토스트 ' + m.toast.y + '..' + m.toast.b
  + ' · 덮임 ' + m.ovPx + 'px (' + m.ovPct + '%)');

(async () => {
  const browser = await launch(chromium);

  /* ── 수리 전 트리 ─────────────────────────────────────────────────────── */
  let preUrl = null, tmp = null;
  const got = G756.show(PRE, 'index.html');
  if (got.ok) {
    if (got.how) console.log('[i]' + got.how);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe761-'));
    fs.writeFileSync(path.join(tmp, 'index.html'), got.buf);
    preUrl = 'file://' + path.join(tmp, 'index.html').replace(/\\/g, '/');
  }

  if (preUrl) {
    const a = await open(browser, preUrl, 1600); const m16 = await shoot(a.page);
    const b = await open(browser, preUrl, 2280); const m22 = await shoot(b.page);

    console.log('\n[1] 재현 — 수리 전 트리(' + PRE + ') · 1080×1600');
    line('1600', m16);
    ok(m16.open, '[1-a] 23 훈련 팝업이 열렸다', '#trw.on');
    ok(m16.ovPx > 0, '[1-b] 토스트가 타이틀 글리프를 덮는다', m16.ovPx + 'px');
    /* ⚠ 등재문의 «57%» 는 **잉크 기준 자**(캡처에서 찍힌 글리프)의 값이고, 이 자는 **글리프 상자**
       (Range rect — 위아래 leading 포함)를 쓴다. 같은 결함을 다른 자로 잰 것이라 값이 다르다:
       상자로는 35%, 잉크로는 그보다 크다(상자 위 leading 이 먼저 덮이므로). 문턱은 이 자의 값으로 적는다. */
    ok(m16.ovPct >= 25, '[1-c] 덮임이 «타이틀 상단이 통째로 가리는» 급이다(등재문 잉크 자로는 ≈57%)',
      m16.ovPct + '% · ' + m16.ovPx + 'px');

    console.log('\n[2] 무해 — 같은 트리 · 1080×2280');
    line('2280', m22);
    ok(m22.ovPx === 0, '[2-a] 2280 에서는 안 겹친다 — 짧은 프레임만의 병',
      '시트 상변 ' + m22.sheet.y + ' > 토스트 밑변 ' + m22.toast.b);

    console.log('\n[3] 뿌리 — 두 앵커가 서로를 안 본다');
    ok(m16.cssTop === m22.cssTop && m16.cssTop === 143,
      '[3-a] 토스트 top 은 프레임과 무관한 상수(CSS top)', m16.cssTop + ' = ' + m22.cssTop);
    ok(m16.sheet.y < m22.sheet.y - 100,
      '[3-b] 시트는 하단 앵커라 짧은 프레임에서 올라온다',
      m22.sheet.y + ' → ' + m16.sheet.y + ' (Δ' + (m22.sheet.y - m16.sheet.y).toFixed(1) + ')');
    await a.page.context().close(); await b.page.context().close();
  } else {
    na('[1]~[3] 수리 전 트리', PRE + ' 를 못 꺼냈다(얕은 클론 · 환경) — 실패 아님');
  }

  /* ── 현재 트리 ────────────────────────────────────────────────────────── */
  const c = await open(browser, CUR, 1600); const n16 = await shoot(c.page);
  const d = await open(browser, CUR, 2280); const n22 = await shoot(d.page);

  console.log('\n[4] 수리 후 — 현재 트리');
  line('1600', n16); line('2280', n22);
  ok(n16.ovPx === 0, '[4-a] 1600 에서 타이틀 덮임 0px', n16.ovPx + 'px');
  ok(n22.ovPx === 0, '[4-b] 2280 에서 타이틀 덮임 0px', n22.ovPx + 'px');
  ok(n16.toast.y >= 0 && n16.toast.b <= n16.frameH,
    '[4-c] 1600 토스트가 프레임 안', n16.toast.y + '..' + n16.toast.b + ' ⊂ 0..' + n16.frameH);
  ok(n16.sheet.y === 175 && n22.sheet.y === 855,
    '[4-d] 팝업 기하 0줄 — 시트 상변이 수리 전과 같은 자리(1600 175 · 2280 855)',
    n16.sheet.y + ' / ' + n22.sheet.y);
  ok(c.errs.length === 0 && d.errs.length === 0, '[4-e] 콘솔 에러 0',
    (c.errs.concat(d.errs).join(' | ')) || '0건');

  await browser.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\nPROBE761 ' + pass + '/' + (pass + fail) + (skip ? ' (보류 ' + skip + ')' : '')
    + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
