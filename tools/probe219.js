/* 작업 219 — 진단 도구(읽기 전용)
 *
 * `tools/verify96.js` 의 «비활성/활성 라벨 — 영웅 vs 10 상점 Δ0» 2건이 왜 빨간지 재는 자다.
 * 네 자리(영웅 `#bSk .stabs` · 06 `#eqTabs` · 03 `#dunSub` · 10 `#shopCats`)의 서브탭 라벨에서
 *   ① 붙은 클래스(.ol3/.ol4)  ② font-size  ③ text-shadow 항 목록(분해)
 * 을 그대로 찍는다. 어느 쪽이 «공용» 이고 어느 쪽이 «화면 전용 덧칠» 인지 눈으로 가르기 위한 것.
 *
 * 실행: node tools/probe219.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* "rgb(0, 0, 0) 3px 0px 0px" → {c:'rgb(0, 0, 0)', x:3, y:0, b:0} */
const SPLIT = `(ts) => {
  if (!ts || ts === 'none') return [];
  return ts.split(/,(?![^()]*\\))/).map(s => s.trim()).map(s => {
    const m = s.match(/(rgba?\\([^)]*\\))\\s+(-?[\\d.]+)px\\s+(-?[\\d.]+)px\\s+(-?[\\d.]+)px/);
    return m ? { c: m[1], x: +m[2], y: +m[3], b: +m[4] } : { raw: s };
  });
}`;

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(900);

    const read = async (name, opener, sel) => {
      await page.evaluate(opener);
      await page.waitForTimeout(600);
      const o = await page.evaluate(([s, sp]) => {
        const S = eval(sp), bar = document.querySelector(s);
        if (!bar) return { err: 'bar 없음: ' + s };
        const pick = el => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          return { cls: el.className, fs: cs.fontSize, sw: cs.webkitTextStrokeWidth,
            tr: cs.transform, terms: S(cs.textShadow) };
        };
        return { off: pick(bar.querySelector('.stab:not(.on)>i')), on: pick(bar.querySelector('.stab.on>i')) };
      }, [sel, SPLIT]);
      const dump = (k, v) => {
        if (!v) { console.log('    ' + k + ' — 없음'); return; }
        const fs = parseFloat(v.fs);
        console.log('    ' + k + ' [' + v.cls + '] fs ' + v.fs + ' · stroke ' + v.sw + ' · 항 ' + v.terms.length + '개');
        v.terms.forEach((t, i) => {
          const r = Math.max(Math.abs(t.x), Math.abs(t.y));
          console.log('      #' + (i + 1) + ' x' + t.x + ' y' + t.y +
            (i >= 8 ? '   ← 덧칠 (em 비율 x ' + (t.x / fs).toFixed(4) + ' · y ' + (t.y / fs).toFixed(4) + ')' : '   r=' + r));
        });
      };
      console.log('\n[' + name + '] ' + sel);
      if (o.err) { console.log('  ' + o.err); return; }
      dump('비활성', o.off); dump('활성  ', o.on);
    };

    await read('영웅 07 스킬', () => { goTab('hero', true); heroSubGo('sk'); }, '#bSk .stabs');
    await read('06 장비', () => heroSubGo('eq'), '#eqTabs');
    await read('03 던전', () => { goTab('adv'); }, '#dunSub');
    await read('10 상점', () => goTab('shop'), '#shopCats');

    const root = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { drop: cs.getPropertyValue('--sh-drop').trim(), dropx: cs.getPropertyValue('--sh-dropx').trim() };
    });
    console.log('\n:root --sh-drop = ' + root.drop + ' · --sh-dropx = ' + root.dropx);
  } finally { await browser.close(); }
})();
