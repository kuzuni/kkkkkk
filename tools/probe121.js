/* 작업 121 — 픽셀 프로브. 비평가 수치를 «반영하기 전에» 반증/확증하기 위한 자체 측정기.
   실행: node tools/probe121.js
   내보내는 것(콘솔):
     [1] 썸네일 «잉크» bbox 를 위상별로 — 상단 여유가 얼마나 남고 몇 px 잘리는지
     [2] 카드별 배경 «움직임 세기» — 프레임 차 평균/최대, 움직인 면적 비율
     [3] 잠금 카드가 정말 정지인지 (CSS paused 를 존중한 표본)

   이 환경엔 PIL 이 없다(LESSONS 23). 그래서 픽셀은 **브라우저 안에서** 읽는다 —
   playwright 스크린샷 버퍼를 data: URL 로 페이지에 돌려보내 캔버스에 그리면 file:// 오염 없이
   `getImageData` 가 된다. 잉크 bbox 는 «썸네일을 숨긴 캡처» 와의 차분으로 구한다
   (LESSONS 04-③ «반투명·겹친 요소는 뒤 레이어를 평탄화한 프로브 캡처로 재라» 의 차분 판). */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const CARD = ['골드', '다이아', '유물석1', '유물석2', '유물석3', '유물석4'];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1500);
  const OPEN = process.argv.includes('open');
  if (OPEN) await p.evaluate(() => {              /* 6장 전부·컨텐츠 3장까지 «해금» 상태로 재려면 */
    S.guide.idx = 99; S.best = 999;
    ['relic1', 'relic2', 'relic3'].forEach(k => { S.dun[k] = 99; });
  });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(800);
  if (OPEN) { await p.evaluate(() => renderDunPage()); await p.waitForTimeout(400); }

  /* 위상을 직접 찍되 **CSS 로 paused 인 애니메이션은 건드리지 않는다** —
     잠금 카드를 억지로 돌리면 캡처가 «잠금인데 움직인다» 는 거짓을 만든다(1회차 비평이 여기서 갈렸다). */
  await p.evaluate(() => {
    document.getAnimations().forEach(a => {
      a._css = a.playState;                       /* running / paused (CSS 게이트 결과) */
      try { a.pause(); } catch (_) {}
    });
  });
  const seek = ms => p.evaluate(t => {
    document.getAnimations().forEach(a => {
      if (a._css !== 'running') return;           /* 정지해야 하는 것은 정지한 채로 둔다 */
      const d = a.effect && a.effect.getComputedTiming().duration;
      if (typeof d === 'number' && d > 0) { try { a.currentTime = t; } catch (_) {} }
    });
  }, ms);

  const clip = await p.evaluate(() => {
    const r = document.querySelector('#dunList .dnc>.th').getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  });
  const grab = async c => 'data:image/png;base64,' + (await p.screenshot({ clip: c })).toString('base64');
  /* 두 이미지의 «다른 픽셀» bbox + 통계 */
  const diff = (a, b2, w, h) => p.evaluate(async ([ia, ib, W, H]) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
    const [A, B] = await Promise.all([load(ia), load(ib)]);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, W, H).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, sum = 0, max = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      const v = d / 3; sum += v; if (v > max) max = v;
      if (v > 24) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { x0, y0, x1, y1, n, area: +(n / (W * H) * 100).toFixed(2),
             avg: +(sum / (W * H)).toFixed(2), max: Math.round(max) };
  }, [a, b2, w, h]);

  /* ---------- [1] 썸네일 잉크 bbox — 위상별 ---------- */
  console.log('[1] 카드1 썸네일 «잉크» bbox (슬롯 좌상단 기준, 슬롯 ' + clip.width + '×' + clip.height + ')');
  console.log('    위상   ink_top ink_bot ink_h   상단여유   비고');
  const rows = [];
  for (const t of [0, 390, 780, 1170, 1950, 2730, 3510]) {
    await seek(t);
    await p.waitForTimeout(60);
    const withEm = await grab(clip);
    await p.evaluate(() => { document.querySelector('#dunList .dnc>.th>em').style.visibility = 'hidden'; });
    await p.waitForTimeout(50);
    const noEm = await grab(clip);
    await p.evaluate(() => { document.querySelector('#dunList .dnc>.th>em').style.visibility = ''; });
    const d = await diff(withEm, noEm, clip.width, clip.height);
    const cut = d.y0 <= 0 ? '⚠ 상단 잘림' : '';
    rows.push([t, d.y0, d.y1, d.y1 - d.y0]);
    console.log('  ' + String(t).padStart(5) + 'ms ' + String(d.y0).padStart(7) + String(d.y1).padStart(8)
      + String(d.y1 - d.y0).padStart(7) + String(d.y0).padStart(10) + '   ' + cut);
  }
  const tops = rows.map(r => r[1]);
  console.log('  → 잉크 상단 p2p ' + (Math.max(...tops) - Math.min(...tops)) + 'px · 최소 상단여유 ' + Math.min(...tops) + 'px');

  /* ---------- [2] 카드별 배경 «움직임 세기» ---------- */
  console.log('\n[2] 카드별 배경 움직임 (썸네일·글자를 뺀 좌중앙 260×90 띠, 위상 0s ↔ 6s)');
  console.log('    카드        평균차/255  최대차  움직인면적%  잠금');
  /* ⚠ 카드 5·6 은 처음엔 화면 밖이다. 그대로 clip 을 잡으면 뷰포트 밖이라 스크린샷이 비어
     «차이 0 = 안 움직인다» 는 거짓이 나온다(1회차 프로브가 유물석4 를 0 으로 찍었다).
     카드마다 리스트를 스크롤해 보이게 만든 뒤 rect 를 «그때» 다시 잰다. */
  const n = await p.evaluate(() => document.querySelectorAll('#dunList .dnc').length);
  for (let i = 0; i < n; i++) {
    const c = await p.evaluate(i => {
      const el = document.querySelectorAll('#dunList .dnc')[i];
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { lkd: el.classList.contains('lkd'),
               clip: { x: Math.round(r.left) + 340, y: Math.round(r.top) + 250, width: 260, height: 90 } };
    }, i);
    await p.waitForTimeout(120);
    await seek(0); await p.waitForTimeout(60);
    const f0 = await grab(c.clip);
    await seek(6000); await p.waitForTimeout(60);
    const f1 = await grab(c.clip);
    const d = await diff(f0, f1, 260, 90);
    console.log('  ' + CARD[i].padEnd(10) + String(d.avg).padStart(9) + String(d.max).padStart(8)
      + String(d.area).padStart(12) + '   ' + (c.lkd ? '잠금' : '-'));
  }

  /* ---------- [3] 컨텐츠(레이드) 탭 배경 움직임 ---------- */
  console.log('\n[3] 컨텐츠(레이드) 카드 배경 움직임 (같은 260×90 띠, 위상 0s ↔ 6s)');
  console.log('    카드        평균차/255  최대차  움직인면적%  잠금');
  await p.evaluate(() => setDunSub('raid'));
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    document.getAnimations().forEach(a => { a._css = a.playState; try { a.pause(); } catch (_) {} });
  });
  const rn = await p.evaluate(() => document.querySelectorAll('#dunList .dnc.rd').length);
  for (let i = 0; i < rn; i++) {
    const c = await p.evaluate(i => {
      const el = document.querySelectorAll('#dunList .dnc.rd')[i];
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { id: el.dataset.rcard || ('rd' + (i + 1)), lkd: el.classList.contains('lkd'),
               clip: { x: Math.round(r.left) + 340, y: Math.round(r.top) + 250, width: 260, height: 90 } };
    }, i);
    await p.waitForTimeout(120);
    await seek(0); await p.waitForTimeout(60);
    const f0 = await grab(c.clip);
    await seek(6000); await p.waitForTimeout(60);
    const f1 = await grab(c.clip);
    const d = await diff(f0, f1, 260, 90);
    console.log('  ' + c.id.padEnd(10) + String(d.avg).padStart(9) + String(d.max).padStart(8)
      + String(d.area).padStart(12) + '   ' + (c.lkd ? '잠금' : '-'));
  }

  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
