/* 작업 191 곁가지 — «상자가 글리프보다 좁아 가운데 정렬이 통째로 무효» 가 다른 화면에도 있는가.

   191 의 원인은 유물 슬롯 고유가 아니라 **일반 규칙**이다:
     가운데 정렬(`justify-content:center` · `text-align:center`)은 «남는 여백» 을 나눠 주는 규칙이라
     여백이 음수면(= 글리프 advance > 상자 안폭) **아무 일도 안 하고 start 로 떨어진다.**
     그러면 초과분이 전부 한쪽으로만 흘러 «그 화면의 아이콘이 다 같은 방향으로 밀린» 것처럼 보인다.

   이 자는 **읽기 전용**이다 — 열 수 있는 화면을 순회하며 «가운데 정렬인데 넘치는» 요소를 세서 찍는다.
   고치지 않는다. 191 은 유물 페이지만 담당이고 나머지는 각자의 작업 단위(207·125 계열)에 넘긴다.

   실행: node tools/audit191.js [높이]        기본 2280
*/
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const H = Number(process.argv[2] || 2280);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

/* 화면마다 «여는 방법» 한 줄. 못 열리면 건너뛴다(다른 작업이 그 화면을 갈아엎는 중일 수 있다). */
const SCREENS = [
  ['02 메인', () => {}],
  ['03 던전', () => document.querySelector('#tabbar [data-t="dun"]')?.click()],
  ['10 상점', () => document.querySelector('#tabbar [data-t="shop"]')?.click()],
  ['89 유물', () => document.querySelector('#tabbar [data-t="box"]')?.click()],
  ['06 영웅', () => document.querySelector('#tabbar [data-t="hero"]')?.click()],
  ['23 훈련', () => document.querySelector('#tabbar [data-t="grow"]')?.click()],
];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    try { RELICS.forEach(r => { S.own[r.id] = { n: 0, l: 10 }; }); S.relic = 99999; S.gold = 1e12; S.dia = 1e9; } catch (_) {}
  });

  let grand = 0;
  for (const [name, open] of SCREENS) {
    try { await p.evaluate(open); } catch (_) { console.log(`- ${name}: 못 열었다`); continue; }
    await p.waitForTimeout(700);
    const hits = await p.evaluate(() => {
      const out = [];
      const vis = el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
      for (const el of document.querySelectorAll('body *')) {
        if (el.childNodes.length !== 1 || el.firstChild.nodeType !== 3) continue;
        const t = el.textContent.trim();
        if (!t || t.length > 4) continue;              /* 아이콘 한 글자짜리만 본다 */
        if (!vis(el)) continue;
        const st = getComputedStyle(el);
        const centred = st.textAlign === 'center'
          || (st.display.includes('flex') && st.justifyContent === 'center')
          || (st.display.includes('grid') && (st.justifyItems === 'center' || st.placeItems.includes('center')));
        if (!centred) continue;
        const r = el.getBoundingClientRect();
        const inner = r.width - parseFloat(st.borderLeftWidth) - parseFloat(st.borderRightWidth)
          - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
        const rg = document.createRange(); rg.selectNodeContents(el);
        const g = rg.getBoundingClientRect();
        if (g.width <= inner + 0.5) continue;          /* 여백이 양수 = 정렬이 걸린다 */
        const dx = (g.left + g.width / 2) - (r.left + r.width / 2);
        if (Math.abs(dx) < 1) continue;                /* 넘쳐도 실제로 안 밀렸으면 넘어간다 */
        out.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').slice(0, 2).join('.') : ''),
          ch: t, box: +inner.toFixed(1), adv: +g.width.toFixed(1), dx: +dx.toFixed(2) });
      }
      /* 같은 클래스는 한 줄로 접는다 */
      const m = new Map();
      for (const o of out) { const k = o.sel + '|' + o.dx.toFixed(1); if (!m.has(k)) m.set(k, { ...o, n: 0 }); m.get(k).n++; }
      return [...m.values()].sort((a, b) => Math.abs(b.dx) - Math.abs(a.dx));
    });
    grand += hits.reduce((a, h) => a + h.n, 0);
    console.log(`\n## ${name} — ${hits.reduce((a, h) => a + h.n, 0)}개`);
    for (const h of hits.slice(0, 12)) console.log(`   ${String(h.n).padStart(3)}× ${h.sel.padEnd(26)} «${h.ch}» 상자 ${h.box} < advance ${h.adv} → Δx ${h.dx > 0 ? '+' : ''}${h.dx}`);
  }
  console.log(`\nAUDIT191 총 ${grand}개 (읽기 전용 — 유물 페이지 밖은 각자의 작업 단위 몫)`);
  await b.close();
})();
