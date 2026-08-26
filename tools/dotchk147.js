#!/usr/bin/env node
/* 작업 147 — «숨겨 놨는데 CSS 특이성에 져서 항상 보이는 것» 상시 감시.  실행: node tools/dotchk147.js
 *
 * 147 의 증상: 21 도감 탭 6개에 레드닷이 **강화 가능 여부와 무관하게 항상** 떠 있었다.
 * 원인은 JS 가 아니라 CSS 특이성이었다 —
 *     #collw s      { display:inline-block }   ← ID 셀렉터 (1,0,1)
 *     .cltab>s.dot  { display:none }           ← 클래스 2 (0,2,1)  … 진다
 * `.alert` 토글은 멀쩡히 돌고 있었고, `.cltab.alert>s.dot{display:block}`(0,3,1) 도 마찬가지로 졌다.
 * 즉 «클래스가 붙었나» 만 보는 게이트로는 절대 안 잡힌다(verify91 [6] 이 실제로 초록이었다).
 *
 * 이 게이트가 보는 것: 스타일시트에서 `display:none` 을 주는 규칙을 전부 모아
 * 실제로 매칭되는 요소의 computed display 를 확인하고, 안 숨겨졌으면 **이긴 규칙**을 찾아낸다.
 * 이긴 규칙이 «상태 클래스»(.on/.alert/.fresh/.ready/.todo/.rdy/.own/.eq …)를 달고 있으면 정상이고,
 * 그렇지 않으면 «숨김이 사고로 무력화됐다» 로 본다.
 *
 * 통과 조건: 상태 클래스가 아닌 규칙에 진 `display:none` 이 0건.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
/* 상태 클래스 = «켜졌을 때만 보여라» 를 뜻하는 클래스. 여기 없는 이름으로 숨김을 이기면 사고다. */
const STATE = ['on', 'alert', 'fresh', 'ready', 'todo', 'rdy', 'own', 'eq', 'lack', 'off',
               'open', 'run', 'boss', 'sel', 'max', 'lock', 'locked', 'new', 'has', 'show', 'mnon'];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(FILE);
  await p.waitForTimeout(1200);

  /* 화면을 하나만 보면 대부분의 오버레이가 display:none 이라 자식이 안 잡힌다 —
     레드닷이 사는 껍데기를 차례로 열어 두고 한 번에 훑는다. */
  const opened = await p.evaluate(() => {
    const tried = [];
    [['21 도감', () => openColl21('skill')], ['52 메뉴', () => typeof openMenu === 'function' && openMenu()],
     ['34 축복', () => typeof openBless === 'function' && openBless()]].forEach(([n, f]) => {
      try { f(); tried.push(n); } catch (e) {}
    });
    return tried;
  });

  const bad = await p.evaluate((STATE) => {
    /* 대략적 특이성 — 이 파일은 `!important`·인라인 스타일을 숨김 판정에 쓰지 않는다 */
    const spec = s => {
      const id = (s.match(/#[\w-]+/g) || []).length;
      const cl = (s.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!:)/g) || []).length;
      const el = (s.match(/(^|[\s>+~])[a-zA-Z]+/g) || []).length;
      return id * 10000 + cl * 100 + el;
    };
    const rules = [];
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (const r of rs || []) if (r.style && r.style.display) rules.push({ sel: r.selectorText, val: r.style.display });
    }
    const isState = sel => sel.split(',').some(s =>
      STATE.some(k => new RegExp('\\.' + k + '(?![\\w-])').test(s)));
    const out = [], seen = new Set();
    for (const hide of rules) {
      if (hide.val !== 'none' || !hide.sel || hide.sel.includes('::')) continue;
      let els = []; try { els = [...document.querySelectorAll(hide.sel)]; } catch (e) { continue; }
      for (const el of els) {
        if (getComputedStyle(el).display === 'none') continue;
        let win = null, ws = -1;
        rules.forEach(r => {
          let m = false; try { m = el.matches(r.sel); } catch (e) {}
          if (!m) return;
          const s = spec(r.sel);
          if (s >= ws) { ws = s; win = r; }                    /* 같은 값이면 뒤에 온 규칙이 이긴다 */
        });
        if (!win || isState(win.sel)) continue;
        const k = hide.sel + '|' + win.sel;
        if (seen.has(k)) continue; seen.add(k);
        out.push({ hide: hide.sel, win: win.sel, val: win.val,
                   at: (el.id || el.tagName.toLowerCase() + '.' + (el.className || '')) });
      }
    }
    return out;
  }, STATE);

  console.log('열어 둔 껍데기: ' + opened.join(' · '));
  bad.forEach(x => console.log('  ✗ `' + x.hide + '{display:none}` 이 `' + x.win + '{display:' + x.val
    + '}` 에 진다 (예: ' + x.at + ')'));
  if (!bad.length) console.log('  ✓ 특이성에 진 display:none 0건');
  const consoleOk = errs.length === 0;
  if (!consoleOk) console.log('  ✗ 페이지 에러 ' + errs.length + '건 — ' + errs[0]);
  else console.log('  ✓ 페이지 에러 0건');

  await b.close();
  const pass = (bad.length === 0 ? 1 : 0) + (consoleOk ? 1 : 0);
  console.log('\nDOTCHK147 ' + pass + '/2' + (pass === 2 ? '  ✓ PASS' : ' — FAIL'));
  process.exit(pass === 2 ? 0 : 1);
})();
