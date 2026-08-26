/* 작업 148 — 미션 텍스트의 «글자별 잉크 상자» 를 재서 겹침·틈을 수치로 잡는다.
   실행: node tools/probe148b.js
   Range API 로 글자 한 자씩 getBoundingClientRect() 를 받되, transform(scaleX) 이 걸린
   자식(<u>·<em>·<b>…)은 rect 가 이미 변환 후 값이므로 «보이는 대로» 의 상자다.
   인접 글자의 gap(다음 left − 이전 right)이 음수면 겹침이다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SELS = [
  ['#tuto .tbtn', 'L1 [미션-1]'],
  ['#tuto .tt',   'L2 미션 문구'],
  ['#tuto .tpg',  'L3 (0/1)'],
  ['#tuto .tsub', '보상 수량'],
];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    uiDirty = true; renderUI(); drawTuto();
  });
  await p.waitForTimeout(400);

  const res = await p.evaluate((SELS) => {
    const out = [];
    for (const [sel, name] of SELS) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ name, miss: true }); continue; }
      const chars = [];
      const walk = n => {
        if (n.nodeType === 3) {
          for (let i = 0; i < n.data.length; i++) {
            const r = document.createRange();
            r.setStart(n, i); r.setEnd(n, i + 1);
            const b = r.getBoundingClientRect();
            const par = n.parentElement;
            chars.push({ c: n.data[i], l: +b.left.toFixed(1), r: +b.right.toFixed(1),
                         t: +b.top.toFixed(1), bo: +b.bottom.toFixed(1),
                         tag: par.tagName.toLowerCase(),
                         fs: +parseFloat(getComputedStyle(par).fontSize).toFixed(1) });
          }
        } else for (const k of n.childNodes) walk(k);
      };
      walk(el);
      const gaps = [];
      for (let i = 1; i < chars.length; i++) gaps.push(+(chars[i].l - chars[i-1].r).toFixed(1));
      out.push({ name, sel, chars, gaps });
    }
    return out;
  }, SELS);

  for (const g of res) {
    if (g.miss) { console.log(g.name + ': 요소 없음'); continue; }
    console.log('\n== ' + g.name + ' (' + g.sel + ') ==');
    console.log(g.chars.map(c => `${JSON.stringify(c.c)}<${c.tag}|fs${c.fs}> x${c.l}..${c.r} y${c.t}..${c.bo}`).join('\n'));
    console.log('어간(다음left−이전right): ' + g.gaps.join(' , '));
    const bad = g.gaps.filter(v => v < -0.5).length;
    console.log('겹침(<-0.5px) ' + bad + '건');
    const tops = g.chars.map(c => c.t), bots = g.chars.map(c => c.bo);
    console.log('상단 편차 ' + (Math.max(...tops) - Math.min(...tops)).toFixed(1) +
                'px · 하단 편차 ' + (Math.max(...bots) - Math.min(...bots)).toFixed(1) + 'px');
  }
  await b.close();
})();
