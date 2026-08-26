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

  /* ---------- [0] 정지 자세(thBob OFF) — «내 탓인가» 판정기 ---------- */
  /* LESSONS 121-6: 움직임을 넣는 작업은 앞 작업의 정적 오차를 «드러낸다». 그래서 [1] 을 읽기 전에
     **들썩을 통째로 끈 72 의 정지 자세**를 먼저 잰다 — 끄고도 여유가 0 이면 잘림은 121 이 만든 것이 아니다.
     `node tools/probe121.js static` 으로 이 절만 돌릴 수도 있다. */
  console.log('[0] 정지 자세(thBob OFF = 72 의 기준 자세) 슬롯 여유 — 0 이면 «움직이기 전에 이미» 천장에 닿아 있다');
  console.log('    카드        상단여유  하단여유   잉크h   슬롯h');
  await p.evaluate(() => {
    const st = document.createElement('style'); st.id = 'p121static';
    st.textContent = '#dunList .dnc>.th>em,#dunList .dnc>.th>canvas{animation:none !important;translate:none !important;scale:none !important}';
    document.head.appendChild(st);
  });
  await p.waitForTimeout(160);
  const nc0 = await p.evaluate(() => document.querySelectorAll('#dunList .dnc').length);
  for (let i = 0; i < nc0; i++) {
    const info = await p.evaluate(i => {
      const el = document.querySelectorAll('#dunList .dnc')[i];
      el.scrollIntoView({ block: 'center' });
      const th = el.querySelector(':scope>.th'), r = th.getBoundingClientRect();
      return { has: !!th.querySelector('em,canvas'), h: Math.round(r.height),
               clip: { x: Math.round(r.left), y: Math.round(r.top),
                       width: Math.round(r.width), height: Math.round(r.height) } };
    }, i);
    await p.waitForTimeout(140);
    if (!info.has) { console.log('  ' + CARD[i].padEnd(10) + '  (이모지 썸네일 아님 — 건너뜀)'); continue; }
    const withEm = await grab(info.clip);
    await p.evaluate(i => { document.querySelectorAll('#dunList .dnc')[i]
      .querySelector(':scope>.th>em,:scope>.th>canvas').style.visibility = 'hidden'; }, i);
    await p.waitForTimeout(60);
    const noEm = await grab(info.clip);
    await p.evaluate(i => { document.querySelectorAll('#dunList .dnc')[i]
      .querySelector(':scope>.th>em,:scope>.th>canvas').style.visibility = ''; }, i);
    const d = await diff(withEm, noEm, info.clip.width, info.clip.height);
    console.log('  ' + CARD[i].padEnd(10) + String(d.y0).padStart(8) + String(info.h - d.y1).padStart(10)
      + String(d.y1 - d.y0).padStart(8) + String(info.h).padStart(8)
      + (d.y0 <= 0 ? '  ⚠ 정지 상태에서 이미 천장' : ''));
  }
  await p.evaluate(() => { const s = document.getElementById('p121static'); if (s) s.remove(); });
  await p.waitForTimeout(120);
  if (process.argv.includes('static')) { await b.close(); return; }
  console.log('');

  /* ---------- [0-2] «천장 접촉 폭» — 비평가가 «평평하게 썰린 정수리» 로 보는 바로 그 양 ---------- */
  /* ⚠ [1] 의 잉크 bbox 는 글리프의 **글로우까지** 잡아서 «몇 px 잘렸나» 를 못 센다(4회차에 확인:
     scale 을 0.8 까지 줄여도 bbox 가 0/1 로 안 변한다 — 재는 것이 잉크가 아니라 글로우이기 때문).
     비평가가 실제로 보는 것은 **슬롯 최상단 행에 잉크가 닿아 만든 «직선»의 길이** 다. 그것을 직접 센다.
     접촉 폭 0 = 잘림 없음. 4회차에 이 표로 하강량을 스윕해 +12px 를 골랐다.
     `node tools/probe121.js cut [추가하강px]` 로 이 절만 돌린다(스윕용 인자). */
  console.log('[0-2] 슬롯 «천장 접촉 폭»(px) — 0 이면 잘림 없음 (전 카드 × 14위상)');
  const EXTRA = (() => { const a = process.argv.find(v => /^\d+$/.test(v)); return a ? Number(a) : 0; })();
  if (EXTRA) {
    await p.evaluate(o => {
      const st = document.createElement('style'); st.id = 'p121cut';
      st.textContent = '#dunList .dnc>.th>em{margin-top:' + o + 'px !important}';
      document.head.appendChild(st);
    }, EXTRA);
    await p.waitForTimeout(180);
    console.log('    (시험용 추가 하강 ' + EXTRA + 'px 적용)');
  }
  const contact = (a, b2, w, h) => p.evaluate(async ([ia, ib, W, H]) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
    const [A, B] = await Promise.all([load(ia), load(ib)]);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, W, H).data;
    let best = 0;
    for (let y = 0; y < 3; y++) {                 /* 최상단 3행 — 안티에일리어싱 한 줄을 흡수 */
      let c = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
        if (d > 60) c++;                          /* 글로우를 빼려고 [1] 보다 높은 문턱 */
      }
      if (c > best) best = c;
    }
    return best;
  }, [a, b2, w, h]);
  const PHC = [0, 195, 390, 585, 780, 1170, 1560, 1950, 2340, 2730, 3120, 3315, 3510, 3705];
  console.log('    카드        최대접촉  접촉위상수  위상별');
  const ncut = await p.evaluate(() => document.querySelectorAll('#dunList .dnc').length);
  let cutBad = 0;
  for (let i = 0; i < ncut; i++) {
    const info = await p.evaluate(i => {
      const el = document.querySelectorAll('#dunList .dnc')[i];
      el.scrollIntoView({ block: 'center' });
      const th = el.querySelector(':scope>.th'), r = th.getBoundingClientRect();
      return { has: !!th.querySelector('em,canvas'),
               clip: { x: Math.round(r.left), y: Math.round(r.top),
                       width: Math.round(r.width), height: Math.round(r.height) } };
    }, i);
    await p.waitForTimeout(150);
    if (!info.has) { console.log('  ' + CARD[i].padEnd(10) + '  (이모지 썸네일 아님 — 건너뜀)'); continue; }
    const vals = [];
    for (const t of PHC) {
      await seek(t); await p.waitForTimeout(45);
      const w1 = await grab(info.clip);
      await p.evaluate(i => { document.querySelectorAll('#dunList .dnc')[i]
        .querySelector(':scope>.th>em,:scope>.th>canvas').style.visibility = 'hidden'; }, i);
      await p.waitForTimeout(40);
      const w0 = await grab(info.clip);
      await p.evaluate(i => { document.querySelectorAll('#dunList .dnc')[i]
        .querySelector(':scope>.th>em,:scope>.th>canvas').style.visibility = ''; }, i);
      vals.push(await contact(w1, w0, info.clip.width, info.clip.height));
    }
    const bad = vals.filter(v => v > 0).length;
    cutBad += bad;
    console.log('  ' + CARD[i].padEnd(10) + String(Math.max(...vals)).padStart(8)
      + String(bad + '/' + PHC.length).padStart(12) + '  ' + vals.join(',') + (bad ? '  ⚠' : ''));
  }
  console.log('  → 천장 절단 위상 합계 ' + cutBad + (cutBad ? '  ⚠ 잘린다' : '  (잘림 0)'));
  await p.evaluate(() => { const s = document.getElementById('p121cut'); if (s) s.remove(); });
  if (process.argv.includes('cut')) { await b.close(); return; }
  console.log('');

  /* ---------- [1] 썸네일 잉크 bbox — **전 카드** × 위상별 ---------- */
  /* ⚠ 1·2회차 프로브는 카드1 만 봤다. 카드마다 --thcy(잉크 중심)·--thf(글리프 크기)·--tht(슬롯 인셋)이
     달라 **상단 여유가 카드마다 다르다** — 비평가 C 가 카드2·4 에서 잘림을 잡아냈고 카드1 만 보던
     프로브는 그것을 못 봤다. 전 카드를 돈다. */
  console.log('[1] 썸네일 «잉크» 상단 여유 — 전 카드 × 위상 (px, 0 이하면 슬롯 천장에 잘림)');
  const PH = [0, 195, 390, 585, 780, 1170, 1560, 1950, 2340, 2730, 3120, 3315, 3510, 3705];
  const ncard = await p.evaluate(() => document.querySelectorAll('#dunList .dnc').length);
  console.log('    카드        최소여유  최대여유  잉크높이 p2p  잘린 위상');
  for (let i = 0; i < ncard; i++) {
    const info = await p.evaluate(i => {
      const el = document.querySelectorAll('#dunList .dnc')[i];
      el.scrollIntoView({ block: 'center' });
      const th = el.querySelector(':scope>.th'), r = th.getBoundingClientRect();
      return { has: !!th.querySelector('em,canvas'),
               clip: { x: Math.round(r.left), y: Math.round(r.top),
                       width: Math.round(r.width), height: Math.round(r.height) } };
    }, i);
    await p.waitForTimeout(120);
    if (!info.has) { console.log('  ' + CARD[i].padEnd(10) + '  (이모지 썸네일 아님 — 건너뜀)'); continue; }
    const tops = [], hs = [];
    for (const t of PH) {
      await seek(t); await p.waitForTimeout(45);
      const withEm = await grab(info.clip);
      await p.evaluate(i => { document.querySelectorAll('#dunList .dnc')[i]
        .querySelector(':scope>.th>em,:scope>.th>canvas').style.visibility = 'hidden'; }, i);
      await p.waitForTimeout(40);
      const noEm = await grab(info.clip);
      await p.evaluate(i => { document.querySelectorAll('#dunList .dnc')[i]
        .querySelector(':scope>.th>em,:scope>.th>canvas').style.visibility = ''; }, i);
      const d = await diff(withEm, noEm, info.clip.width, info.clip.height);
      tops.push(d.y0); hs.push(d.y1 - d.y0);
    }
    const cut = tops.filter(v => v <= 0).length;
    console.log('  ' + CARD[i].padEnd(10) + String(Math.min(...tops)).padStart(8)
      + String(Math.max(...tops)).padStart(10) + String(Math.max(...hs) - Math.min(...hs)).padStart(12)
      + String(cut + '/' + PH.length).padStart(11) + (cut ? '  ⚠' : ''));
  }

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
