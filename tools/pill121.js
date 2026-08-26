/* 작업 121 — «재화 알약이 배경 흐름에 맥동한다» 프로브 (5회차 신설).
   실행: node tools/pill121.js

   4회차 비평가 E·F 가 독립적으로 같은 곳을 짚어 5회차로 이월한 ④ 항목이다.
   E: 골드 알약 코어 25.5 → 79.5(+212%), 알약 라벨 대비 6.7:1 → 3.0:1(−55%).
   F: 같은 것을 12.8%/12.2%/11.5% 로 잰다(측정 창이 달라 배율이 갈린다).

   뿌리: `.dnc .sp` 가 `rgba(0,0,0,.75)` 라 **움직이는 레이어가 25% 비쳐 보인다.**
   그래서 알약 «속» 밝기가 배경 위상을 따라 오르내린다 — 그 위의 흰 라벨과의 대비가 같이 흔들린다.

   여기서는 카드마다 알약 안쪽(라벨을 피한 여백)의 밝기를 **14위상**에서 재서
   p2p 진폭·상대 변동·라벨 대비 최저값을 낸다. 처방을 넣기 전/후로 같은 수를 비교하면 된다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const PH = 14;                 /* 위상 표본 수 */
const SPAN = 60000;            /* 60초를 훑는다 — 흐름 주기(44~88s)의 대부분 */

/* 상대휘도 → 대비비 (WCAG) */
const lum = (r, g, b) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    S.guide.idx = 99; S.best = 999;
    ['relic1', 'relic2', 'relic3'].forEach(k => { S.dun[k] = 99; });
  });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => renderDunPage());
  await p.waitForTimeout(400);

  /* CSS 로 paused 인 것(잠금 카드)은 건드리지 않는다 — 억지로 돌리면 «잠금인데 움직인다» 는 거짓이 된다. */
  await p.evaluate(() => {
    document.getAnimations().forEach(a => { a._css = a.playState; try { a.pause(); } catch (_) {} });
  });
  const seek = ms => p.evaluate(t => {
    document.getAnimations().forEach(a => {
      if (a._css !== 'running') return;
      const d = a.effect && a.effect.getComputedTiming().duration;
      if (typeof d === 'number' && d > 0) { try { a.currentTime = t % (d * 4); } catch (_) {} }
    });
  }, ms);

  /* 알약(.sp) 안쪽에서 «글자가 없는» 띠를 고른다 — 알약 우측 끝 24px 을 세로 중앙 높이로만 읽는다.
     (라벨·아이콘은 좌측에 몰려 있다. 우측 여백이 배경이 가장 잘 비치는 곳이다.) */
  /* ⚠ 5회차 — 목록 밖으로 잘린 알약을 그냥 재면 «정지 화면» 을 재게 되어 **p2p 0.0% 라는 거짓 합격**이
     나온다(처음 판에서 유물석4 가 그렇게 0.0% 로 찍혔다 — 해금·running 인데도).
     그래서 #dunList 의 보이는 사각형 안에 **완전히** 들어오는 알약만 잰다. */
  const boxes = await p.evaluate(() => {
    const out = [], skip = [];
    const L = document.querySelector('#dunList').getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    document.querySelectorAll('#dunList .dnc').forEach((el, i) => {
      const cls = [...el.classList].find(c => c.indexOf('bgm-') === 0) || '';
      const lkd = el.classList.contains('lkd');
      el.querySelectorAll('.sp').forEach((sp, j) => {
        const r = sp.getBoundingClientRect();
        if (r.width < 40 || r.height < 20) return;
        const box = {
          card: i, key: cls.replace('bgm-', ''), lkd, idx: j,
          x: Math.round(r.right - 30), y: Math.round(r.top + r.height / 2 - 6),
          w: 24, h: 12,
        };
        const inView = box.x >= Math.max(0, L.left) && box.x + box.w <= Math.min(vw, L.right)
          && box.y >= Math.max(0, L.top) && box.y + box.h <= Math.min(vh, L.bottom);
        (inView ? out : skip).push(box);
      });
    });
    return { out, skip };
  }).then(r => {
    if (r.skip.length) console.log('  (목록 밖으로 잘려 건너뛴 알약 ' + r.skip.length + '개: '
      + r.skip.map(s => s.key + '#' + s.card + '/' + s.idx).join(', ') + ')\n');
    return r.out;
  });

  const readPx = async box => {
    const buf = await p.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
    return p.evaluate(async d => {
      const img = new Image(); img.src = d; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      cv.getContext('2d').drawImage(img, 0, 0);
      const g = cv.getContext('2d').getImageData(0, 0, img.width, img.height).data;
      let r = 0, gg = 0, bb = 0; const n = img.width * img.height;
      const px = [];
      for (let i = 0; i < n; i++) {
        r += g[i * 4]; gg += g[i * 4 + 1]; bb += g[i * 4 + 2];
        px.push([g[i * 4], g[i * 4 + 1], g[i * 4 + 2]]);
      }
      /* 평균만 보면 «가장 밝은 자리» 를 놓친다 — 흰 글자가 앉는 최악 국소가 거기다.
         상위 5% 밝기 화소의 평균을 «국소 최악 배경» 으로 같이 돌려준다(H 14 의 지표). */
      px.sort((a, b) => (b[0] + b[1] + b[2]) - (a[0] + a[1] + a[2]));
      const k = Math.max(1, Math.round(n * 0.05));
      let hr = 0, hg = 0, hb = 0;
      for (let i = 0; i < k; i++) { hr += px[i][0]; hg += px[i][1]; hb += px[i][2]; }
      return { avg: [r / n, gg / n, bb / n], hot: [hr / k, hg / k, hb / k] };
    }, 'data:image/png;base64,' + buf.toString('base64'));
  };

  console.log('[pill] 재화 알약 안쪽(우측 여백 24×12) 밝기를 ' + PH + '위상에서 — 배경이 알약을 얼마나 맥동시키나\n');
  console.log('  카드         알약  잠금    평균L    최소~최대      p2p(/255)   상대변동   대비(평균)  대비(국소최악)');

  /* 위상별로 전 알약을 한 번에 읽는다(위상 전환 비용을 줄인다) */
  const series = boxes.map(() => []);
  for (let t = 0; t < PH; t++) {
    await seek(Math.round(SPAN * t / PH));
    await p.waitForTimeout(60);
    for (let i = 0; i < boxes.length; i++) series[i].push(await readPx(boxes[i]));
  }

  let worstSwing = 0, worstCr = 99;
  boxes.forEach((bx, i) => {
    const L = series[i].map(s => (s.avg[0] + s.avg[1] + s.avg[2]) / 3);
    const lo = Math.min(...L), hi = Math.max(...L), avg = L.reduce((a, v) => a + v, 0) / L.length;
    const p2p = hi - lo;
    const rel = avg > 0.5 ? p2p / avg * 100 : 0;
    /* 흰 라벨(#fff)과의 대비 — 알약 속이 밝아질수록 대비가 준다. 최악 위상만 본다.
       평균 기준과 **국소 최악(상위 5% 밝기)** 기준을 둘 다 낸다 — 후자가 H 14 의 «최악 26px 창» 지표다. */
    const crs = series[i].map(s => ratio(lum(255, 255, 255), lum(s.avg[0], s.avg[1], s.avg[2])));
    const cr = Math.min(...crs);
    const crHot = Math.min(...series[i].map(s => ratio(lum(255, 255, 255), lum(s.hot[0], s.hot[1], s.hot[2]))));
    if (!bx.lkd) { worstSwing = Math.max(worstSwing, rel); worstCr = Math.min(worstCr, crHot); }
    console.log('  ' + (bx.key + '#' + bx.card).padEnd(13) + String(bx.idx).padStart(4)
      + (bx.lkd ? '  잠금' : '    -')
      + String(avg.toFixed(1)).padStart(9)
      + String(lo.toFixed(1) + '~' + hi.toFixed(1)).padStart(14)
      + String(p2p.toFixed(1)).padStart(13)
      + String(rel.toFixed(1) + '%').padStart(11)
      + String(cr.toFixed(2) + ':1').padStart(14)
      + String(crHot.toFixed(2) + ':1').padStart(14));
  });

  console.log('\n  → 해금 알약 최대 상대변동 ' + worstSwing.toFixed(1) + '%  ·  **국소최악** 흰 라벨 대비 ' + worstCr.toFixed(2) + ':1'
    + (worstCr < 4.5 ? '   ⚠ 4.5:1 미달' : '   ok'));
  console.log('  * 대비 4.5:1 미만이면 본문 가독성 기준(WCAG AA) 미달이다.');
  console.log('  * 잠금 카드는 배경이 정지라 p2p 가 0 이어야 한다 — 0 이 아니면 정지 게이트가 새는 것이다.');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
