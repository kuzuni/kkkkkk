/* 작업 531 — 「레드닷 «상시 점등» 함정의 재료」 **처방 전 재현**(338 규칙).
 *
 *   node tools/probe531.js
 *
 * 등재문은 `scan519 [2]`(셀렉터 **모양**을 세는 자)를 근거로 «짝 없는 스코프 23곳에 짝을 미리 깔면
 * 노드가 없어도 무해» 라고 적었다. 이 자는 그 두 문장을 **찍어서** 검사한다.
 *
 *   [1] «진짜 닷을 놓아 보고» 재는 자 — `#app` 안 id 요소마다 `<i><s class="updot"></s></i>` 를 심고
 *       ① 축(.alert) 없이 display 가 none 인가 ② .alert 를 붙이면 보이는가 를 읽는다.
 *       레드닷 노드는 예외 없이 `<s>` 이므로 이것이 함정의 **정의 그대로**다.
 *   [2] 오프너 스윕 — 화면을 열어야 태어나는 닷 노드까지 모아 «지금 보이는 닷» 목록을 만든다.
 *       (scan519 는 부팅 시점 CSSOM 만 봐서 이 노드들을 한 개도 못 본다.)
 *   [3] A/B — [1] 이 고른 함정 root 에만 짝을 깔고 같은 스윕을 다시 돌려
 *       «보이던 닷이 꺼지는가 · 꺼져 있던 닷이 켜지는가» 를 센다. 둘 다 0 이어야 «무해» 다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

/* 닷 3종을 «실제로 쓰이는 host 꼴» 로 심는다.
 * ⚠ 그냥 셋을 맨몸으로 심으면 자가 거짓말을 한다 — 전역 기본값 `display:none` 을 가진 것은
 *   `.updot` 하나뿐이고(11081), `.bdg`·`s.dot` 의 «꺼짐» 은 구조 규칙(`.stab>.bdg` 8811 ·
 *   `.cltab>s.dot` 8812)이 준다. 맨몸 `.bdg` 는 어디에 놓든 `<s>` 기본값 inline 이라
 *   저장소 전체가 «함정» 으로 찍힌다(1차 실행이 그랬다 — root 34 중 20 이 그 허수였다). */
const DOTS = [
  { c: 'updot', host: '' },       /* `.updot{display:none}` — 카드·버튼 어디에나 붙는 공용 부품 */
  { c: 'bdg', host: 'stab' },     /* `.stab>.bdg{display:none}` — 서브탭 배지 */
  { c: 'dot', host: 'cltab' },    /* `.cltab>s.dot{display:none}` — 도감 탭 닷 */
];

/* ⚠ 짝은 **`<s>` 꼴로만** 적는다 — `.bdg` 는 레드닷 배지 말고 10 상점 배너 리본(`<div class="bdg">`)
 *   에도 쓰이는 이름이라, 클래스만으로 적으면 그 리본 3장이 같이 꺼진다(A/B 1차 실행이 그것을 찍었다). */
const PAIR_CSS = ids => {
  const sc = ids.map(i => '#' + i).join(',');
  return `:is(${sc}) :is(s.updot,s.bdg,s.dot){display:none}\n`
       + `:is(${sc}) .alert>:is(s.updot,s.bdg,s.dot){display:block}`;
};

/* scan519 [2] 와 **같은 식** — 모양으로 세는 자(대조용) */
async function shapeScan(page) {
  return page.evaluate(() => {
    const all = [];
    const walk = list => {
      if (!list) return;
      for (const r of list) {
        if (r.type === 1 && r.selectorText) {
          if (!/(^|;|\s)display\s*:/.test(r.style.cssText || '')) continue;
          r.selectorText.split(',').forEach(sel => all.push({ sel: sel.trim(), disp: r.style.display }));
        } else if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } walk(rs); }
    const sc = new Map();
    all.forEach(r => {
      if (r.disp === 'none') return;
      const m = r.sel.match(/^#([\w-]+)[^#]*\s(?:s|i|b|em|u)$/);
      if (m && !sc.has(m[1])) sc.set(m[1], { id: m[1], pair: false });
    });
    all.forEach(r => {
      if (r.disp !== 'none') return;
      const m = r.sel.match(/^#([\w-]+)\b/);
      if (m && sc.has(m[1]) && /(\.updot|\.bdg|s\.dot)/.test(r.sel)) sc.get(m[1]).pair = true;
    });
    return [...sc.values()];
  });
}

/* [1] 진짜 닷을 심어 보고 재는 자 — 함정 = «축 없이도 보인다» */
async function plantScan(page, dots) {
  return page.evaluate(cls => {
    /* ⚠ 조상의 «살아 있는 축» 을 먼저 떼어야 한다 — 안 떼면 자가 거짓말을 한다.
     *   `#menub` 은 부팅 때 «안 읽은 우편» 으로 `.alert` 가 켜져 있어서 `#menub.alert .bdg{display:block}`
     *   (제 몫을 하는 정상 규칙)이 심은 닷까지 켠다 ⇒ 함정으로 오독됐다(1차 실행). scan519 [1] 과 같은 규율. */
    const GATE = ['alert', 'on', 'fresh', 'mnon'];
    const strip = el => {
      const undo = [];
      for (let n = el; n; n = n.parentElement)
        GATE.forEach(c => { if (n.classList && n.classList.contains(c)) { n.classList.remove(c); undo.push([n, c]); } });
      return () => undo.forEach(([n, c]) => n.classList.add(c));
    };
    const rows = [];
      /* ⚠ 자식을 못 받는 요소는 건너뛴다 — `<input>` 같은 void/replaced 요소는 appendChild 가 통해도
       그 자식이 **렌더 트리에 안 들어가서** getComputedStyle 이 늘 none 을 준다. 안 걸러 내면
       `#chIn`(채팅 입력칸)이 «.alert 를 붙여도 안 켜진다» 는 허수로 빨개진다. */
    const VOID = ['INPUT','IMG','CANVAS','BR','HR','TEXTAREA','SELECT','VIDEO','IFRAME','EMBED','OBJECT','SVG'];
    document.querySelectorAll('#app [id]').forEach(host => {
      if (VOID.indexOf(host.tagName) >= 0) return;
      const bad = [];
      const restore = strip(host);
      cls.forEach(({ c, host: hc }) => {
        const box = document.createElement('i');
        box.style.position = 'relative';
        if (hc) box.className = hc;
        const dot = document.createElement('s');
        dot.className = c;
        box.appendChild(dot); host.appendChild(box);
        const off = getComputedStyle(dot).display;
        /* «켜짐» 은 축이 **호스트 상자**에 오는 꼴(.alert>.updot)과 **화면 자신**에 오는 꼴
         * (`#menub.alert .bdg`)이 둘 다 있다 — 하나라도 켜면 켜지는 것으로 센다.
         * 상자 쪽만 보면 #menub 처럼 «제 몫을 하는» 자리가 함정으로 오독된다(2차 실행). */
        box.classList.add('alert');
        let on = getComputedStyle(dot).display;
        if (on === 'none') {
          box.classList.remove('alert'); host.classList.add('alert');
          on = getComputedStyle(dot).display;
          host.classList.remove('alert');
        }
        box.remove();
        if (off !== 'none' || on === 'none') bad.push({ c, off, on });
      });
      restore();
      if (bad.length) rows.push({ id: host.id, bad });
    });
    /* root = 자기보다 위에 «같이 빨간» id 조상이 없는 것 */
    const ids = new Set(rows.map(r => r.id));
    rows.forEach(r => {
      let root = true;
      for (let n = document.getElementById(r.id).parentElement; n; n = n.parentElement)
        if (n.id && ids.has(n.id)) { root = false; break; }
      r.root = root;
    });
    return rows;
  }, dots);
}

/* 화면을 열어야 태어나는 닷까지 모으는 오프너 스윕 */
async function sweep(page) {
  const snapFn = `(() => {
    const out = [];
    const key = el => {
      const bits = [];
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        let b = n.tagName.toLowerCase();
        if (n.id) { bits.unshift('#' + n.id); break; }
        if (n.className && typeof n.className === 'string') b += '.' + n.className.trim().split(/\\s+/).sort().join('.');
        const sib = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [];
        if (sib.length > 1) b += ':nth(' + sib.indexOf(n) + ')';
        bits.unshift(b);
      }
      return bits.join('>');
    };
    document.querySelectorAll('.updot,.bdg,s.dot').forEach(el => {
      let scope = null;
      for (let n = el.parentElement; n; n = n.parentElement) if (n.id) { scope = n.id; break; }
      const p = el.parentElement;
      const axis = ['alert','on','fresh'].filter(c => el.classList.contains(c) || (p && p.classList.contains(c)));
      out.push({ k: key(el), scope: scope, tag: el.tagName.toLowerCase(), disp: getComputedStyle(el).display, axis: axis.join('+') || '-' });
    });
    return out;
  })`;

  const openers = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.tab[data-t]').forEach(n => out.push({ label: 'tab:' + n.dataset.t, sel: '.tab[data-t="' + n.dataset.t + '"]' }));
    document.querySelectorAll('.side .ibtn[data-pop]').forEach(n => out.push({ label: 'side:' + n.dataset.pop, sel: '.side .ibtn[data-pop="' + n.dataset.pop + '"]' }));
    if (document.getElementById('menub')) out.push({ label: 'menu', sel: '#menub' });
    document.querySelectorAll('[data-mn]').forEach(n => out.push({ label: 'menu:' + n.dataset.mn, sel: '#menub', then: '[data-mn="' + n.dataset.mn + '"]' }));
    document.querySelectorAll('[data-cur]').forEach(n => {
      const k = n.dataset.cur;
      if (!out.some(o => o.label === 'cur:' + k)) out.push({ label: 'cur:' + k, sel: '[data-cur="' + k + '"]' });
    });
    document.querySelectorAll('#dunSub [data-dsub]').forEach(n => out.push({ label: 'dunsub:' + n.dataset.dsub, sel: '.tab[data-t="adv"]', then: '#dunSub [data-dsub="' + n.dataset.dsub + '"]' }));
    document.querySelectorAll('#trSubs [data-trsub]').forEach(n => out.push({ label: 'trsub:' + n.dataset.trsub, sel: '.tab[data-t="grow"]', then: '#trSubs [data-trsub="' + n.dataset.trsub + '"]' }));
    document.querySelectorAll('#shopCats [data-cat]').forEach(n => out.push({ label: 'shopcat:' + n.dataset.cat, sel: '.tab[data-t="shop"]', then: '#shopCats [data-cat="' + n.dataset.cat + '"]' }));
    document.querySelectorAll('#eqTabs [data-eqtab]').forEach(n => out.push({ label: 'eqtab:' + n.dataset.eqtab, sel: '.tab[data-t="hero"]', then: '#eqTabs [data-eqtab="' + n.dataset.eqtab + '"]' }));
    document.querySelectorAll('#bCos [data-costab]').forEach(n => out.push({ label: 'costab:' + n.dataset.costab, sel: '.side .ibtn[data-pop="cos"]', then: '#bCos [data-costab="' + n.dataset.costab + '"]' }));
    return out;
  });

  const seen = new Map();
  for (const o of openers) {
    await page.evaluate(async o => {
      const raf = () => new Promise(r => requestAnimationFrame(r));
      if (typeof closeAllModals === 'function') { try { closeAllModals(); } catch (e) {} }
      const click = sel => { const n = document.querySelector(sel); if (!n) return false; n.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); n.click(); return true; };
      click(o.sel);
      for (let i = 0; i < 8; i++) await raf();
      if (o.then) { click(o.then); for (let i = 0; i < 8; i++) await raf(); }
    }, o).catch(() => {});
    await page.waitForTimeout(140);
    const rows = await page.evaluate(snapFn + '()');
    rows.forEach(r => { if (!seen.has(r.k) || seen.get(r.k).disp === 'none') seen.set(r.k, { ...r, at: o.label }); });
  }
  return { seen, n: openers.length };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  console.log('\n=== probe531 — 「레드닷 상시 점등 함정」 재현');

  const pA = await ctx.newPage();
  await pA.goto(URL); await pA.waitForFunction(() => typeof S !== 'undefined'); await pA.waitForTimeout(600);

  const shape = await shapeScan(pA);
  const shapeNoPair = shape.filter(s => !s.pair).map(s => s.id);
  console.log('\n[0] scan519 [2] 재현(셀렉터 «모양») — 스코프 ' + shape.length + ' · 짝 없음 ' + shapeNoPair.length);
  console.log('    ' + shapeNoPair.map(i => '#' + i).join(' · '));

  const plant = await plantScan(pA, DOTS);
  const roots = plant.filter(r => r.root).map(r => r.id);
  console.log('\n[1] «진짜 닷을 놓아 보고» 잰 함정 — `#app` 안 id 요소 전수 (닷 3종 .updot/.bdg/s.dot)');
  console.log('    빨간 id ' + plant.length + '개 · 그중 **root** ' + roots.length + '개');
  plant.filter(r => r.root).forEach(r => console.log('    ⚠ #' + r.id + '   '
    + r.bad.map(b => '.' + b.c + '(축없음→' + b.off + ' / .alert→' + b.on + ')').join(' · ')));
  const onlyShape = shapeNoPair.filter(i => !roots.includes(i) && !plant.some(p => p.id === i));
  const onlyPlant = roots.filter(i => !shapeNoPair.includes(i));
  console.log('\n    ▸ 모양으로만 빨갛고 실제로는 함정이 아닌 스코프 ' + onlyShape.length + '개: '
    + (onlyShape.map(i => '#' + i).join(' · ') || '없음'));
  console.log('    ▸ 모양은 «짝 있음» 인데 실제로는 함정인 스코프 ' + onlyPlant.length + '개: '
    + (onlyPlant.map(i => '#' + i).join(' · ') || '없음'));

  const A = await sweep(pA);
  await pA.close();
  const tags = {};
  [...A.seen.values()].forEach(r => { tags[r.tag] = (tags[r.tag] || 0) + 1; });
  console.log('\n[2] 오프너 스윕(' + A.n + ') — 살아 있는 닷 노드 ' + A.seen.size + '개 (그중 «보임» '
    + [...A.seen.values()].filter(r => r.disp !== 'none').length + '개)');
  console.log('    ▸ 태그별: ' + Object.entries(tags).map(([t, n]) => '<' + t + '> ' + n).join(' · ')
    + '   ⇒ 레드닷은 `<s>` 이고 `<div class="bdg">` 는 **다른 부품**(상점 배너 리본)이다');
  const live = [...A.seen.values()].filter(r => r.disp !== 'none' && r.axis === '-');
  console.log('    ▸ **축 없이 보이는** 닷(= 노드를 만들거나 말거나로 켜는 자리) ' + live.length + '개');
  live.forEach(r => console.log('        ● ' + r.k.slice(-92) + '   (' + r.at + ')'));

  const pB = await ctx.newPage();
  await pB.addInitScript(css => {
    addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.id = 'probe531'; st.textContent = css;
      document.head.appendChild(st);
    });
  }, PAIR_CSS(roots));
  await pB.goto(URL); await pB.waitForFunction(() => typeof S !== 'undefined'); await pB.waitForTimeout(600);
  const inj = await pB.evaluate(() => !!document.getElementById('probe531'));
  const B = await sweep(pB);
  const plantB = await plantScan(pB, DOTS);
  await pB.close();

  console.log('\n[3] A/B — 함정 root ' + roots.length + '곳에만 짝을 깔았을 때 (주입: ' + (inj ? 'O' : 'X') + ')');
  let killed = 0, born = 0, same = 0, miss = 0;
  const kills = [], borns = [];
  for (const [k, a] of A.seen) {
    const b = B.seen.get(k);
    if (!b) { miss++; continue; }
    if (a.disp !== 'none' && b.disp === 'none') { killed++; kills.push({ k, a }); }
    else if (a.disp === 'none' && b.disp !== 'none') { born++; borns.push({ k, a }); }
    else same++;
  }
  console.log('    공통 노드 ' + (A.seen.size - miss) + ' · 같음 ' + same
    + ' · **꺼진 닷 ' + killed + '** · **새로 켜진 닷 ' + born + '** · B 에 없음 ' + miss);
  kills.forEach(r => console.log('      ⚠ 꺼짐  #' + r.a.scope + '  축[' + r.a.axis + ']  ' + r.k.slice(-96)));
  borns.forEach(r => console.log('      ⚠ 켜짐  #' + r.a.scope + '  축[' + r.a.axis + ']  ' + r.k.slice(-96)));
  const leftB = plantB.filter(r => r.root);
  console.log('    남은 함정 root(B) : ' + leftB.length + '개'
    + (leftB.length ? ' → ' + leftB.map(r => '#' + r.id + '[' + r.bad.map(b => '.' + b.c + ' ' + b.off + '/' + b.on).join(',') + ']').join(' · ') : ''));

  console.log('\n[4] 판정');
  console.log('    · 함정은 «셀렉터 모양» 이 아니라 «심어서 잰 display» 로만 정확히 센다'
    + ' (모양 ' + shapeNoPair.length + ' ↔ 실제 root ' + roots.length + ').');
  console.log('    · 짝을 «실제 함정 root» 에만 깔면 꺼진 닷 ' + killed + ' · 새로 켜진 닷 ' + born
    + (killed + born === 0 ? '  ⇒ 무해' : '  ⇒ 무해가 아니다'));

  await browser.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
