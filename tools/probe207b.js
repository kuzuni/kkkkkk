/* 작업 207 보조 프로브 — `.pvc>.rb>b` 의 `display` 를 «누가» 정하는지 CDP CSS.getMatchedStylesForNode 로 찾는다.
   probe207 실측: 판(b)의 computed display 가 flex 가 아니라 **block** 이라 안의 `.cic` 이
   가운데로 안 가고 좌상단(0,0)에 붙는다(Δ −9.5,−9.5 = slack 19 의 절반).
   실행: node tools/probe207b.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { S.dia = 3e5; openShopTab('pass'); });
  await p.waitForTimeout(900);

  const cdp = await ctx.newCDPSession(p);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const doc = await cdp.send('DOM.getDocument');
  const q = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#shopw .pvc .rb1 > b' });
  const st = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: q.nodeId });

  const hits = [];
  (st.matchedCSSRules || []).forEach((m) => {
    const props = (m.rule.style.cssProperties || []).filter((x) => /^(display|align-items|justify-content|position|width|height|line-height|font-size|text-align)$/.test(x.name));
    if (props.length) hits.push({ sel: m.rule.selectorList.text, origin: m.rule.origin,
      props: props.map((x) => x.name + ':' + x.value + (x.important ? '!' : '')) });
  });
  console.log(JSON.stringify(hits, null, 1));
  console.log('\n--- inline ---');
  console.log(JSON.stringify((st.inlineStyle && st.inlineStyle.cssText) || '', null, 1));
  await b.close();
})();
