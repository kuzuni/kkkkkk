#!/usr/bin/env node
/* 작업 519 ⑤ — 「같은 식 꼴이 다른 탭에도 있는가」 전수 스윕.
 *
 *   node tools/scan519.js
 *
 * 166 ⓔ · 202 §3 · 283 · 294 · 519 로 **다섯 번째** 나는 계열이라 이번에는 자리를 손으로 세지 않고
 * 브라우저에게 묻는다: 저장소 안의 모든 레드닷 노드(`.updot` · `.bdg` · `s.dot`)에 대해
 *   ① 지금 켜고 끄는 축(`.alert`/`.on`/`.fresh` …)을 **떼어 낸 상태**의 캐스케이드 승자를 고르고
 *   ② 그 승자가 «기본 꺼짐» 규칙(display:none)이 아니면 = 상시 점등 후보로 찍는다.
 * 노드는 «숨어 있는 화면» 에도 있으므로 열지 않고 **CSSOM 만으로** 판정한다(화면 전환 없이 전수).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined');
  await page.waitForTimeout(500);

  const out = await page.evaluate(() => {
    const spec = sel => {
      const s = sel.trim();
      const a = (s.match(/#[\w-]+/g) || []).length;
      const b = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
      const c = (s.replace(/[#.][\w-]+|\[[^\]]+\]|:{1,2}[\w-]+/g, '').match(/[a-zA-Z][\w-]*/g) || []).length;
      return [a, b, c];
    };
    const cmp = (x, y) => (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]);

    /* display 를 선언하는 규칙을 선언 순으로 한 벌 모은다(@media/@supports 안까지) */
    const all = [];
    const walk = list => {
      if (!list) return;
      for (const r of list) {
        if (r.type === 1 && r.selectorText) {
          if (!/(^|;|\s)display\s*:/.test(r.style.cssText || '')) continue;
          r.selectorText.split(',').forEach(sel => all.push({ sel: sel.trim(), disp: r.style.display, sp: spec(sel) }));
        } else if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } walk(rs); }

    const winnerFor = el => {
      let w = null;
      for (const r of all) {
        let hit = false; try { hit = el.matches(r.sel); } catch (e) {}
        if (hit && (!w || cmp(r.sp, w.sp) >= 0)) w = r;
      }
      return w;
    };
    const pathOf = el => {
      const bits = [];
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        bits.unshift(n.id ? '#' + n.id : n.tagName.toLowerCase() + (n.className && typeof n.className === 'string'
          ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
        if (n.id) break;
      }
      return bits.join(' > ');
    };

    /* 켜고 끄는 축으로 쓰이는 클래스 — 이것을 뗀 «기본» 상태에서 꺼져 있어야 한다 */
    const GATE = ['alert', 'on', 'fresh', 'off', 'lk', 'close', 'mnon'];
    const seen = new Set(), rows = [];
    document.querySelectorAll('.updot, .bdg, s.dot').forEach(el => {
      const removed = GATE.filter(c => el.classList.contains(c));
      removed.forEach(c => el.classList.remove(c));
      const upRemoved = [];
      for (let n = el.parentElement; n; n = n.parentElement) {
        GATE.forEach(c => { if (n.classList && n.classList.contains(c)) { n.classList.remove(c); upRemoved.push([n, c]); } });
      }
      const w = winnerFor(el);
      removed.forEach(c => el.classList.add(c));
      upRemoved.forEach(([n, c]) => n.classList.add(c));
      const key = pathOf(el);
      if (seen.has(key)) return;
      seen.add(key);
      const off = w && w.disp === 'none';
      rows.push({ key, win: w ? w.sel : '(없음)', disp: w ? w.disp : '(기본)', sp: w ? w.sp.join(',') : '-', off });
    });
    /* ── [2] 함정의 «재료» 를 정적으로 전수 — 부팅 시점에 노드가 없는 화면까지 덮는다.
       꼴: `#X … s{display:<none 아님>}` 처럼 **ID 급으로 `<s>`(또는 i/b/em/u) 를 통째로 켜는** 규칙.
       그런 스코프마다 «같은 급의 짝»(`#X … .updot{display:none}` 또는 `#X … .bdg{display:none}`)이
       있어야 166 규약이 산다. 짝이 없으면 그 화면에 레드닷을 «놓는 순간» 상시 점등이 된다. */
    const scopes = new Map();
    all.forEach(r => {
      if (r.disp === 'none') return;
      const m = r.sel.match(/^#([\w-]+)[^#]*\s(?:s|i|b|em|u)$/);
      if (!m) return;
      if (!scopes.has(m[1])) scopes.set(m[1], { id: m[1], sels: [], pair: false });
      scopes.get(m[1]).sels.push(r.sel);
    });
    all.forEach(r => {
      if (r.disp !== 'none') return;
      const m = r.sel.match(/^#([\w-]+)\b/);
      if (m && scopes.has(m[1]) && /(\.updot|\.bdg|s\.dot)/.test(r.sel)) scopes.get(m[1]).pair = true;
    });
    return { rows, scopes: [...scopes.values()] };
  });

  const rows = out.rows, bad = rows.filter(r => !r.off);
  console.log('[1] 부팅 시점 레드닷 노드 ' + rows.length + '개 — «축 클래스를 뗀» 기본 상태의 캐스케이드 승자\n');
  rows.forEach(r => console.log('  ' + (r.off ? '  ok  ' : '⚠ ON  ')
    + r.key + '\n           승자 (' + r.sp + ') ' + r.win + ' → display:' + r.disp));
  console.log('\n    상시 점등 후보: ' + bad.length + ' / ' + rows.length);
  bad.forEach(r => console.log('     ⚠ ' + r.key + '  ←  ' + r.win));

  const noPair = out.scopes.filter(s => !s.pair);
  console.log('\n[2] ID 급으로 `<s>` 를 통째로 켜는 스코프 ' + out.scopes.length + '개 — «같은 급 짝» 유무');
  out.scopes.forEach(s => console.log('  ' + (s.pair ? '  ok  ' : '⚠ 짝없음')
    + ' #' + s.id + '   (' + s.sels.length + '개 선언)'));
  console.log('\n    짝 없는 스코프: ' + noPair.length + ' / ' + out.scopes.length
    + (noPair.length ? '  → ' + noPair.map(s => '#' + s.id).join(' · ') : ''));
  console.log('    ⚠ 짝이 없어도 그 화면에 레드닷 «노드» 가 아직 없으면 오늘은 안 보인다 — «놓는 순간» 켜진다는 뜻이다.');

  await browser.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
