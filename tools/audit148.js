/* 작업 148 곁가지 감사 — «글자가 든 `<s>`/`<u>` 인데 기본 밑줄·취소선을 끄지 않은 자리» 를 전수로 찾는다.
   실행: node tools/audit148.js
   왜: 148 의 두 번째 원인이 «`<s>` 의 기본 `line-through` 가 `-webkit-text-stroke` 를 뒤집어써
       검정 막대가 되고 글리프를 가로로 자르는» 것이었다. 같은 함정이 다른 화면에도 있으면
       그 화면 담당이 자기 구간에서 고칠 수 있게 목록만 남긴다(병렬 세션 규칙 3 — 남의 구간은 안 건드린다).
   판정: 텍스트 노드가 있고 · text-decoration-line ≠ none · -webkit-text-stroke-width > 0 → 위험. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);
  await p.evaluate(() => document.fonts.ready);

  /* 정적 마크업만으로는 «렌더될 때만 생기는» 자리를 못 본다 → 팝업·탭을 최대한 열어 둔 뒤 훑는다.
     smoke.js 의 오프너 목록과 같은 정신이되, 여기서는 실패해도 그냥 넘어간다. */
  const openers = ['openQuest()', 'openProfile()', 'openMail()', 'openShopPage("skill")',
                   'openRelicPage()', 'goTab("hero")', 'goTab("train")', 'goTab("shop")'];
  const hits = new Map();
  const scan = async (where) => {
    const rows = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('s,u,strike')) {
        const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim();
        if (!txt) continue;                              /* 글자 없는 장식용 <s> 는 대상 아님 */
        const cs = getComputedStyle(el);
        if (cs.textDecorationLine === 'none') continue;
        const sw = parseFloat(cs.webkitTextStrokeWidth) || 0;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const id = (el.closest('[id]') ? '#' + el.closest('[id]').id + ' ' : '') +
                   el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '');
        out.push({ id, txt: txt.slice(0, 20), deco: cs.textDecorationLine, stroke: +sw.toFixed(2),
                   risk: sw > 0 ? '위험(스트로크가 선을 검정 막대로 만든다)' : '주의(선만 보인다)' });
      }
      return out;
    });
    for (const r of rows) if (!hits.has(r.id + '|' + r.txt)) hits.set(r.id + '|' + r.txt, { ...r, where });
  };

  await scan('메인');
  for (const o of openers) {
    try { await p.evaluate(o); await p.waitForTimeout(350); await scan(o); } catch (_) {}
    try { await p.evaluate(() => { closeModal(); gmCloseAll(); }); await p.waitForTimeout(150); } catch (_) {}
  }

  console.log('== AUDIT148 — 글자 든 <s>/<u> 중 밑줄·취소선이 살아 있는 자리 ==');
  if (!hits.size) console.log('  없음 ✅');
  for (const v of hits.values())
    console.log(`  · ${v.id.padEnd(28)} «${v.txt}»  deco=${v.deco} stroke=${v.stroke}  ${v.risk}   [${v.where}]`);
  console.log('총 ' + hits.size + '건');
  await b.close();
})();
