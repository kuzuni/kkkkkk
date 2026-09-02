#!/usr/bin/env node
/* 작업 567 — `verify349` [B] «±45px 드리프트» 가 왜 흔들리는가 (재현 도구)
 *
 *   node tools/probe567.js
 *
 * 338 규칙: **처방을 따르기 전에 먼저 재현한다.** 등재문은 갈래를 셋으로 갈라 놨다 —
 *   ① 자의 임계(`v >= 5`)가 **벽시계**에 물려 있다(기계 부하 축) ⇒ 임계를 «비율» 로 바꾼다
 *   ② «±30 은 초록인데 ±45 만 빨갛다» 가 **드리프트 폭 축**이다 ⇒ 제품 결함, 자는 안 건드린다
 *   ③ 그 둘을 먼저 가른다.
 *
 * 이 도구가 재는 것은 **기하 하나**다: 홀드 중 그 좌표가 «버튼 안» 인가 «밖» 인가.
 * 부하 축(①)은 이 도구가 곧바로 기각한다 — 실패한 실행에서도 보낸 touchMove 와 받은
 * pointermove 가 **1:1** 이고(드롭 0), 실패는 «덜 돌아서» 가 아니라 **한 번의 «이탈» 로 멎어서**다.
 *
 * 절: [A] 배치 자리 vs 그려진 자리   [B] 자가 찍는 표본점이 어느 쪽에 드나
 *     [C] 위상 — 맥박이 켜진 프레임에서만 «밖» 이 된다(그래서 흔들린다)
 *     [D] 이웃 ±30 은 왜 안 걸리나(폭 축이 아니라는 증거)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install } = require('./closers540');
const { chromium } = pw();

const FILE = process.env.P567_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, msg, extra) => { (c ? pass++ : fail++); console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra ? '  [' + extra + ']' : '')); };
const n1 = v => Math.round(v * 10) / 10;

/* 349·551 이 이미 옮겨 둔 자리 — 490 이후 결제 버튼은 하나다(자 두 벌 금지) */
const MAT = '#trRunes .tr-rn[data-rune="r1"] .rbt.b1';
const CARD = '#trRunes .tr-rn[data-rune="r1"]';

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);
  await install(p, { arm: true });
  const cdp = await ctx.newCDPSession(p);

  await p.evaluate(() => {
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    /* 죽어서 18 패배 화면이 버튼을 덮는 것만 막는다(74 규약 · 524) — 루프는 돌린다 */
    if (!window.__alive) window.__alive = setInterval(() => { try { if (S.hp != null) S.hp = maxHp(); } catch (_) {} }, 200);
    /* 계측 — 시도 수 · 받은 pointermove · 옛 판정이 «밖» 이라고 본 순간의 기하 */
    if (!window.__wrap) {
      window.__wrap = 1;
      /* ⚑ 701·797 이관(2026-09-02) — «1회» 가 코어 `runeTryOne` + 막힌 안내 `runeBuy` 로 갈렸다.
         홀드에서 둘은 배타적이라 **같은 카운터에 더한다**(`verify349` 와 같은 처방). */
      const o = window.runeBuy;
      window.runeBuy = function () { window.__n = (window.__n || 0) + 1; return o.apply(this, arguments); };
      const o1 = window.runeTryOne;
      if (typeof o1 === 'function') window.runeTryOne = function () { window.__n = (window.__n || 0) + 1; return o1.apply(this, arguments); };
    }
    window.__mv = 0; window.__miss = [];
    addEventListener('pointermove', e => {
      window.__mv++;
      if (typeof rtHold === 'undefined' || !rtHold) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && t.closest && t.closest(rtHold.sel)) return;
      const el = document.querySelector(rtHold.sel);
      const r = el ? el.getBoundingClientRect() : null;
      const nm = q => q ? (q.tagName + (q.id ? '#' + q.id : '') + (q.className ? '.' + String(q.className).trim().split(/\s+/).join('.') : '')) : '(null)';
      window.__miss.push({
        x: Math.round(e.clientX), y: Math.round(e.clientY), hit: nm(t),
        painted: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
        rest: (typeof jzRestRect === 'function' && el) ? (q => q && { x: q.x, y: q.y, w: q.width, h: q.height })(jzRestRect(el)) : null
      });
    }, true);   /* capture — 제품 리스너보다 **먼저** 돈다(제품이 멈추기 전 기하를 잡는다) */
  });

  const reset = async () => {
    await p.evaluate(() => {
      window.__clear540();
      S.rune = { r1: 0, r2: 0, r3: 0 }; S.rstone = 1e9; S.dia = 1e9;
      openTrain(); setTrSub('rune'); setRuneSub('r1'); renderTrain();
      window.__n = 0; window.__mv = 0; window.__miss = [];
    });
    await p.waitForTimeout(450);   /* 팝업 슬라이드 종료 대기(297 함정 ①) */
  };
  const center = async sel => {
    await p.locator(sel).scrollIntoViewIfNeeded();
    const b = await p.locator(sel).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
  };
  /* verify349 [B] 와 **같은 손** — 60ms 마다 반지름 r 의 원을 돈다(dx²+dy² = r² 로 항상 정확히 r) */
  const driftHold = async (c, ms, r) => {
    const st = cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
    const t0 = Date.now(); let i = 0, sent = 0;
    while (Date.now() - t0 < ms) {
      await new Promise(z => setTimeout(z, 60)); i++;
      sent++;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + Math.sin(i / 2) * r, y: c.y + Math.cos(i / 2) * r }] }).catch(() => {});
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await st.catch(() => {});
    await p.waitForTimeout(140);
    const g = await p.evaluate(() => ({ n: window.__n || 0, mv: window.__mv, miss: window.__miss }));
    return Object.assign({ sent }, g);
  };

  console.log('[A] 배치 자리 vs 그려진 자리 — 연출이 버튼을 얼마나 줄이는가');
  await reset();
  const restGeo = await p.evaluate(o => {
    const r = document.querySelector(o.MAT).getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, { MAT });
  /* ⚠ 클래스만 얹어서 «지금» 재면 못 잰다 — 둘 다 애니메이션이라 그 프레임은 0% 다.
     ⇒ 위상을 **손으로 세운다**: `jz-dn`(누름)은 **끝**(scale .94 · translate 0 8px 이 `both` 로 굳는 자리),
       `jz-hb`(맥박)은 **처음**(scale --hb-s). 그 둘이 겹치는 프레임이 홀드 중 최악이고,
       값은 전부 제품 선언에서 읽으므로 이 도구에 상수를 안 적는다. */
  const geo = await p.evaluate(o => {
    const btn = document.querySelector(o.MAT), card = document.querySelector(o.CARD);
    const g = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const at = (el, end) => el.getAnimations().forEach(a => {
      a.pause();
      const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
      a.currentTime = end ? (typeof d === 'number' ? d : 0) : 0;
    });
    btn.classList.add('jz-dn'); card.classList.add('jz-hb');
    void btn.offsetWidth; void card.offsetWidth;
    at(btn, true); at(card, false);
    const pressed = g(btn);
    const out = { pressed, hbs: getComputedStyle(card).getPropertyValue('--hb-s').trim(),
                  dnScale: getComputedStyle(btn).scale, dnMove: getComputedStyle(btn).translate };
    btn.getAnimations().forEach(a => a.cancel()); card.getAnimations().forEach(a => a.cancel());
    btn.classList.remove('jz-dn'); card.classList.remove('jz-hb');
    return out;
  }, { MAT, CARD });
  geo.rest = restGeo;
  const R = geo.rest, P = geo.pressed;
  ok(Math.abs(R.w - 420) < 2 && Math.abs(R.h - 112) < 2,
    '배치 자리(연출 없음) = 420×112 — 349 등재문이 쓴 그 상자다',
    n1(R.w) + '×' + n1(R.h) + ' @ ' + n1(R.x) + ',' + n1(R.y));
  ok(P.h < R.h - 3 && P.y > R.y + 2,
    '★ 눌림(scale ' + geo.dnScale + ' · translate ' + geo.dnMove + ') + 카드 맥박(--hb-s ' + geo.hbs + ')이 버튼을 **줄이고 아래로 민다**',
    n1(P.w) + '×' + n1(P.h) + ' @ ' + n1(P.x) + ',' + n1(P.y) + ' · 상변 Δ+' + n1(P.y - R.y));

  console.log('[B] 자가 찍는 표본점 — ±45px 의 «맨 위» 는 배치 자리 «안», 그려진 자리 «밖»');
  const cy = R.y + R.h / 2, top45 = cy - 45;
  ok(top45 > R.y && top45 < R.y + R.h,
    '±45px 표본의 맨 위(y ' + n1(top45) + ')는 **배치 자리 안**이다 — 위 가장자리에서 ' + n1(top45 - R.y) + 'px 안쪽',
    '배치 상변 ' + n1(R.y));
  ok(top45 < P.y,
    '★ 그런데 **그려진 자리 밖**이다 — 3.8px 안팎으로 갈린다(여기가 «이탈» 오판의 자리)',
    '그려진 상변 ' + n1(P.y) + ' · 차 ' + n1(P.y - top45) + 'px');

  console.log('[C] 위상 — 맥박이 켜진 프레임에서만 «밖» 이 된다(그래서 흔들린다)');
  let missSeen = 0, mvDrop = 0, runs = [];
  for (let k = 0; k < 8; k++) {
    await reset();
    const r = await driftHold(await center(MAT), 1500, 45);
    runs.push(r.n);
    if (r.miss.length) missSeen++;
    if (r.mv < r.sent) mvDrop++;
  }
  /* ⚠ «몇 회 났나» 는 **단언으로 쓰지 않는다** — 위상 경합이라 0 회인 실행도 정상이다.
     그것을 ok() 로 세우면 이 도구가 567 과 똑같은 플레이키가 된다(562 교훈: 값을 보라).
     결정적인 못은 [B](기하)와 `verify567` [R](옛 꼴 vs 새 꼴)이 박는다. */
  console.log('  --   «이탈 오판»(옛 꼴 기준) ' + missSeen + '/8 회 — 위상 경합이라 실행마다 다르다  [시도수 ' + runs.join('/') + ']');
  ok(mvDrop === 0,
    '★ 부하 축 기각 — 보낸 touchMove 와 받은 pointermove 가 **1:1**(드롭 0). 실패는 «덜 돌아서» 가 아니다',
    '드롭 난 실행 ' + mvDrop + '/8');
  ok(Math.min.apply(null, runs) >= 5,
    '수리 뒤 — 8회 전부 임계(5회) 위다(수리 전에는 여기서 3~4회가 섞였다)',
    '최소 ' + Math.min.apply(null, runs) + '회 · 최대 ' + Math.max.apply(null, runs) + '회');

  console.log('[D] 이웃 ±30px 은 왜 안 걸리나 — «드리프트 폭 축» 이 아니라는 증거');
  const top30 = cy - 30;
  ok(top30 > P.y,
    '±30px 의 맨 위(y ' + n1(top30) + ')는 **그려진 자리 안**이다 — 연출이 다 먹어도 ' + n1(top30 - P.y) + 'px 남는다',
    '그려진 상변 ' + n1(P.y));
  {
    await reset();
    const r = await driftHold(await center(MAT), 1500, 30);
    ok(r.n >= 5 && r.miss.length === 0, '±30px 은 오판이 0 건이고 임계 위다(등재문의 «이웃 셋은 두 자릿수»)',
      r.n + '회 · 오판 ' + r.miss.length + '건');
  }

  console.log('\n콘솔 에러 ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  ok(errs.length === 0, '콘솔 에러 0건');
  await browser.close();
  console.log('PROBE567 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
