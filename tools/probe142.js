#!/usr/bin/env node
/* 작업 142 — «⚑ 74(탭 유실)가 탭바 한 대상에서만 재발» 진단 도구
 *
 *   node tools/probe142.js                 # 20탭 (adv↔box 교대, verify74 ⑤ 와 동일 조건)
 *   TAP_N=40 node tools/probe142.js
 *
 * verify74 는 «성공/실패» 만 세고 실패 이유를 «가려짐 / 대상이 최상위» 두 갈래로만 나눈다.
 * 탭바는 «대상이 최상위인데 click 이 아예 안 났다» 라서, 그 사이의 74 탭 합성기가
 * **어느 return 에서 탭을 버렸는지**를 봐야 한다. 여기서는 pointerdown/up 마다
 * tapRec · dsDragged · tapFind() 결과 · 딤 가드(__jzOpT) 를 그대로 찍는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = process.env.TAP_FILE || 'index.html';
const URL = 'file://' + path.resolve(__dirname, '..', FILE).replace(/\\/g, '/');
const N = Number(process.env.TAP_N || 20);
const HOLD = Number(process.env.TAP_HOLD || 90);

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    S.gold = 1e13; S.dia = 1e9; uiDirty = true;
    if (S.opt) { S.opt.sfx = false; S.opt.bgm = false; }
    if (typeof bgmApply === 'function') { try { bgmApply(); } catch (_) {} }
    window.__alive = setInterval(() => {
      try { if (typeof player !== 'undefined' && typeof stat !== 'undefined') { player.hp = stat.maxHp; player.dead = 0; } } catch (_) {}
      const d = document.getElementById('defw');
      if (d && d.classList.contains('on')) d.classList.remove('on');
    }, 100);
    window.__desc = el => {
      if (!el) return '(null)';
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
      return s;
    };
    window.__log = [];
    window.__clicks = [];
    document.addEventListener('click', e => {
      window.__clicks.push({ tgt: window.__desc(e.target), tap: !!e.__tap, trusted: e.isTrusted });
    }, true);
    /* 74 합성기보다 «뒤» 에 등록 → 그 판정이 끝난 상태를 그대로 읽는다 */
    addEventListener('pointerdown', e => {
      const rec = (typeof tapRec !== 'undefined') ? tapRec : null;
      window.__log.push({ ph: 'down(win)', now: Math.round(performance.now()), ts: Math.round(e.timeStamp), tgt: window.__desc(e.target),
        prim: e.isPrimary, ptype: e.pointerType, x: Math.round(e.clientX), y: Math.round(e.clientY),
        rec: rec ? window.__desc(rec.el) + '@' + Math.round(rec.t) : '(null)' });
    }, true);
    /* #app 위임(74 tapInit)보다 «뒤» — 그 핸들러가 실제로 돌았는지 본다 */
    document.getElementById('app').addEventListener('pointerdown', e => {
      const rec = (typeof tapRec !== 'undefined') ? tapRec : null;
      window.__log.push({ ph: 'down(app)', now: Math.round(performance.now()),
        rec: rec ? window.__desc(rec.el) + '@' + Math.round(rec.t) + ' xy=' + Math.round(rec.x) + ',' + Math.round(rec.y) : '(null)' });
    }, true);
    ['pointercancel','touchcancel','touchstart','touchend','contextmenu','pointermove'].forEach(t =>
      addEventListener(t, e => {
        if (t === 'pointermove' && window.__log.filter(l => l.ph === 'pointermove').length > 3) return;
        window.__log.push({ ph: t, now: Math.round(performance.now()), ts: Math.round(e.timeStamp),
          tgt: window.__desc(e.target), x: Math.round(e.clientX || 0), y: Math.round(e.clientY || 0) });
      }, true));
    addEventListener('pointerup', e => {
      const rec = (typeof tapRec !== 'undefined') ? tapRec : null;
      const o = { ph: 'up', now: Math.round(performance.now()), ts: Math.round(e.timeStamp), tgt: window.__desc(e.target),
        rec: rec ? window.__desc(rec.el) + '@' + Math.round(rec.t) + ' xy=' + Math.round(rec.x) + ',' + Math.round(rec.y) : '(null)',
        upxy: Math.round(e.clientX) + ',' + Math.round(e.clientY) };
      if (rec) {
        o.done = !!rec.done;
        o.dt = Math.round(performance.now() - rec.t);
        o.type = rec.type;
        o.dsDragged = (typeof dsDragged !== 'undefined') ? !!dsDragged : 'n/a';
        o.connected = !!(rec.el && rec.el.isConnected);
        o.rects = rec.el && rec.el.getClientRects ? rec.el.getClientRects().length : -1;
        try {
          const found = tapFind(rec, e.clientX, e.clientY);
          o.found = window.__desc(found);
          o.disabled = found ? !!found.disabled : null;
          if (found) {
            const ov = found.closest ? found.closest(TAP_OV_SEL) : null;
            o.ov = ov ? ov.id : '(none)';
            o.ovAge = ov ? Math.round(performance.now() - (ov.__jzOpT || -1e9)) : -1;
          }
        } catch (err) { o.found = 'ERR ' + err; }
      }
      window.__log.push(o);
    }, true);
  });

  const cdp = await ctx.newCDPSession(page);
  const tap = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await new Promise(r => setTimeout(r, HOLD));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

  await page.evaluate(() => { window.__closeAllP = () => {
    ['closeShopPage','closeTrain','closeDungeon','closeRelw','closeModal'].forEach(n => {
      if (typeof window[n] === 'function') { try { window[n](); } catch (_) {} } });
  }; window.__closeAllP(); });
  await page.waitForTimeout(600);

  const sels = ['.tab[data-t="adv"]', '.tab[data-t="box"]'];
  for (let i = 0; i < N; i++) {
    const sel = sels[i % sels.length];
    const p = await page.evaluate(s => {
      const el = document.querySelector(s);
      const b = el.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      const top = document.elementFromPoint(x, y);
      window.__log = []; window.__clicks = [];
      return { x, y, top: window.__desc(top), cls: el.className,
        open: ['dunw','relw','shopw','trw'].filter(id => { const e = document.getElementById(id); return e && e.classList.contains('on'); }).join(',') };
    }, sel);
    await tap(p.x, p.y);
    await page.waitForTimeout(50);
    const early = await page.evaluate(() => window.__clicks.length);   /* verify74 와 같은 50ms 시점 */
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => ({ log: window.__log, clicks: window.__clicks }));
    const ok = r.clicks.length > 0;
    console.log(`#${i} ${sel} ${ok ? '✓' : '✗'} 50ms시점=${early} 열린것=[${p.open}] cls="${p.cls}" 최상위=${p.top}`);
    r.log.forEach(l => console.log('    ' + JSON.stringify(l)));
    r.clicks.forEach(c => console.log('    click ' + JSON.stringify(c)));
  }
  await browser.close();
})();
