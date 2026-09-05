/* 작업 933 — «노랑 획이 가늘다» 의 손잡이 후보를 **그려 보고** 고른다 (재현기).

   등재문이 지목한 손잡이는 `font-weight` 하나다. 그런데 이 저장소의 서체 선언은
     @font-face{font-family:'GameKR'; src:url(assets/fonts/Jua-subset.woff2); font-weight:400 900}
   로 **한 벌(Jua)이 400~900 을 전부 자기 것이라고 말한다.** 그러면 굵기를 올려도
   브라우저는 «그 굵기의 얼굴이 이미 있다» 고 보아 **합성 볼드를 안 건다** — 선언만 바뀌고
   그림은 한 화소도 안 움직인다. 이 자는 그것을 **그림으로** 확인하고,
   합성 볼드를 실제로 켰을 때(같은 파일을 400 만 주장하는 두 번째 이름으로 다시 실어) 잉크가
   얼마나 굵어지는지까지 잰다 — 그 값이 처방의 대가를 정한다.

   변이:
     v0  현행
     v1  `font-weight:900`(같은 이름 'GameKR')            — 손잡이가 살아 있는가
     v2  두 번째 얼굴 'GameKR933'(같은 woff2 · 400 만 주장) + `font-weight:700`  — 합성 볼드
     v3  같은 얼굴 + `font-weight:900`                      — 합성 볼드의 단(段)이 있는가

   실행: node tools/probe933.js [출력접두]      (기본 scratch/933)
   결과: <접두>-v0..v3.png · <접두>-geo.json · 콘솔에 «그려진 굵기»(computed) 표
*/
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const pre = process.argv[2] || 'scratch/933';
const FACE = "@font-face{font-family:'GameKR933';src:url('assets/fonts/Jua-subset.woff2') format('woff2');font-weight:400;font-style:normal}";
const SEL = "#shopw .pvc>.bdg>i,#shopw .pvc>.bdg>b";
const VARIANTS = [
  ['v0', ''],
  ['v1', `${SEL}{font-weight:900}`],
  ['v2', `${FACE} ${SEL}{font-family:'GameKR933';font-weight:700}`],
  ['v3', `${FACE} ${SEL}{font-family:'GameKR933';font-weight:900}`],
];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    S.dia = 3e5; S.gold = 1e9;
    S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; x.classList.remove('fresh'); });
    openShopTab('pass');
  });
  await p.waitForTimeout(1000);
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *, #top *, #tabbar *').forEach((e) => {
      e.style.animation = 'none'; e.style.transition = 'none';
    });
  });

  /* 기하는 한 번만 — 배지 상자(.bdg)는 변이로 안 움직인다(움직이면 아래 표가 먼저 알려 준다). */
  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const box = (r) => ({ x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    return {
      frameH: +A.height.toFixed(1),
      cards: [...document.querySelectorAll('.pvc')].map((c) => {
        const o = box(c.getBoundingClientRect());
        o.id = c.dataset.pv;
        const e = c.querySelector('.bdg'); o.bdg = e ? box(e.getBoundingClientRect()) : null;
        return o;
      }),
    };
  });
  fs.writeFileSync(path.resolve(__dirname, '..', pre + '-geo.json'), JSON.stringify(geo));

  console.log('=== 변이별 «선언 ↔ 그려진 것» ===');
  for (const [tag, css] of VARIANTS) {
    const info = await p.evaluate(async (c) => {
      const old = document.getElementById('probe933');
      if (old) old.remove();
      if (c) {
        const s = document.createElement('style');
        s.id = 'probe933'; s.textContent = c;
        document.head.appendChild(s);
      }
      try { await document.fonts.ready; } catch (e) {}
      const i = document.querySelector('.pvc>.bdg>i');
      const bb = document.querySelector('.pvc>.bdg>b');
      const cs = (e) => { const s = getComputedStyle(e); return { fw: s.fontWeight, ff: s.fontFamily.split(',')[0], w: +e.getBoundingClientRect().width.toFixed(2) }; };
      /* 낱자 폭(advance)은 합성 볼드가 건드리는지 아닌지가 갈리는 자리라 같이 잰다. */
      const cv = document.createElement('canvas').getContext('2d');
      const st = getComputedStyle(i);
      cv.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      return { i: cs(i), b: cs(bb), adv: +cv.measureText('2000%').width.toFixed(2), txt: i.textContent };
    }, css);
    await p.waitForTimeout(160);
    const out = pre + '-' + tag + '.png';
    await p.locator('#app').screenshot({ path: path.resolve(__dirname, '..', out) });
    console.log('  %s | i fw=%s ff=%s | b fw=%s ff=%s | «%s» advance %s | %s',
      tag, info.i.fw, info.i.ff, info.b.fw, info.b.ff, info.txt, info.adv, out);
  }
  console.log('errors:', errs.length ? errs.slice(0, 5) : 0);
  await b.close();
})();
