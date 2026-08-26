/* 58 29회차 — 2인 공통 1순위 «씬 A 스폰 91ms 무반응» 의 **DOM 진실**을 잰다.
 *
 * 28회차 인계가 지목한 자리다. AX «gain-2(91ms) 아레나 금색 화소 518px = 기준 540px 과 Δ−4%» ·
 * AW «세 임계 전부 블롭 0개». 두 사람이 **같은 처방**을 냈다: 스폰을 0ms 로 당기고 스케일인을
 * 90ms 안에 끝내 t≈91ms 에 «최소 8개가 지름 16px 이상» 으로 보이게 할 것.
 *
 * 그런데 코드를 읽으면 t=91ms 에 이미 보여야 한다(퍼짐 220ms · op 램프 39.6ms · s 0.58→0.70).
 * 그러니 «안 보인다» 의 원인이 (ㄱ) 스폰 자체가 늦다 (ㄴ) 스폰은 빠른데 첫 프레임에 안 그려진다
 * (ㄷ) 크기가 임계 미달이다 중 어느 것인지부터 갈라야 처방이 정해진다. 상수를 만지기 전에 잰다.
 *
 * 시계 원점 = **트리거**(`S.gold += n` 을 부르기 **직전**의 performance.now). cap58 의 t0 는
 * «첫 .fx-fly 가 DOM 에 생긴 순간» 이라 스폰 지연이 원점에 접혀 있다 — 여기서는 일부러 가른다.
 * 매 rAF 마다 아이콘별 **화면 잉크 지름**(img 의 rect, #app 스케일 보정)과 computed opacity 를 찍는다.
 */
const path = require('path');
const { pw, launch } = require('./tools/pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium);
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);

  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9;
    const app = document.getElementById('app');
    const runs = [];

    for (let k = 0; k < 5; k++) {
      /* 씬을 cap58 gain 과 같은 상태로 되돌린다(fx 감시 상태까지 — 안 맞추면 되돌리기가 획득으로 잡힌다) */
      S.gold = 0; fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
      fxFlies.length = 0;
      const L = document.getElementById('fxl'); if (L) L.innerHTML = '';
      await sleep(260);

      const sc = app.getBoundingClientRect().width / 1080;   /* fit() 배율 — 프레임 px 로 환산 */
      const rows = [];
      const t0 = performance.now();
      fxAt({ x: 540, y: 1400 });
      S.gold += 128000;                                      /* ← 트리거. 이 직전이 원점 */

      await new Promise(res => {
        const step = () => {
          const t = performance.now() - t0;
          const els = [...document.querySelectorAll('#fxl .fx-fly')];
          const sz = els.map(e => {
            const g = e.querySelector('img, i, b, svg') || e;
            const r = g.getBoundingClientRect();
            return { d: Math.max(r.width, r.height) / sc, op: +getComputedStyle(e).opacity };
          });
          /* 비평가 기준: «보인다» = opacity 유의 + 잉크 지름 16px 이상 */
          const vis = sz.filter(o => o.op >= 0.5 && o.d >= 16);
          rows.push({
            t: +t.toFixed(1), dom: els.length, vis: vis.length,
            dmax: sz.length ? +Math.max(...sz.map(o => o.d)).toFixed(1) : 0,
            opmax: sz.length ? +Math.max(...sz.map(o => o.op)).toFixed(2) : 0
          });
          if (t < 400) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });

      /* 관심 지표: ① 첫 DOM 생성 ② 첫 «보이는» 프레임 ③ t=91ms 에 몇 개가 보이나 */
      const firstDom = rows.find(r => r.dom > 0);
      const firstVis = rows.find(r => r.vis > 0);
      const vis8 = rows.find(r => r.vis >= 8);
      /* t=91 에 해당하는 프레임 = 91ms 이하의 마지막 표본(cap58 정답표와 같은 규칙) */
      let at91 = null;
      for (const r of rows) if (r.t <= 91) at91 = r;
      runs.push({
        firstDomMs: firstDom ? firstDom.t : null,
        firstVisMs: firstVis ? firstVis.t : null,
        vis8Ms: vis8 ? vis8.t : null,
        at91,
        head: rows.slice(0, 8)
      });
      await sleep(1900);
    }
    return runs;
  });

  const num = k => out.map(r => r[k]).filter(v => v != null);
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
  console.log(JSON.stringify(out, null, 1));
  console.log('\n== 요약 (5런) ==');
  console.log('첫 DOM 생성   중앙 ' + med(num('firstDomMs')) + 'ms  범위 ' + JSON.stringify([Math.min(...num('firstDomMs')), Math.max(...num('firstDomMs'))]));
  console.log('첫 «보임»     중앙 ' + med(num('firstVisMs')) + 'ms  범위 ' + JSON.stringify([Math.min(...num('firstVisMs')), Math.max(...num('firstVisMs'))]));
  console.log('8개 «보임»    중앙 ' + med(num('vis8Ms')) + 'ms  범위 ' + JSON.stringify([Math.min(...num('vis8Ms')), Math.max(...num('vis8Ms'))]));
  console.log('t=91 프레임   ' + JSON.stringify(out.map(r => r.at91)));
  await b.close();
})();
