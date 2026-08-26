/* 작업 121 — «체감 반복 주기» 프로브 (7회차 신설).
   실행: node tools/period121.js

   6회차 비평가 I·J 가 독립으로 같은 지적을 냈다 — 「배경의 체감 반복 주기가 지시(40~90s)의 절반이다」
   (I: 카드1 20.2s / 카드2 25.2 / 카드3 29.5 / 카드4 34.7 · J: 골드 20s / 다이아 25 / 유물 30~45).
   6회차 인계(review ⓘ-1)가 산술로 정리한 원인은 이렇다:

     체감주기 = 축주기 / 속도,  속도 = --bgw1 / --bgt1,  --bgw1 = 타일폭,  그리고 타일폭 = 2 × 축주기
     ⇒ **체감주기 = --bgt1 / 2** — 타일폭·줄무늬 피치와 무관하다.

   즉 «줄무늬를 성기게» 도 «타일을 키워» 도 소용이 없다. 타일 **안에** 똑같은 줄기가 2주기 들어
   있다는 것(`repeating-linear-gradient` 의 자기유사성)이 원인이므로, 고쳤는지 아닌지는
   **«반 주기에서 그림이 되돌아오는가»** 를 직접 재야 판정된다. seam121 은 이걸 못 본다 —
   그 게이트는 «타일 경계의 간격이 짧아지는가»(이음매)만 보고, 타일당 2주기는 이음매가 **없는**
   쪽이라 오히려 100% ok 로 나온다. 실제로 6회차까지 seam121 은 내내 «이음매 0개» 였다.

   측정 방법 — 흐름 레이어(`::before`)만 남기고 위상을 0 부터 한 주기(--bgt1)까지 훑으면서
   매 위상의 그림을 **위상 0 의 그림과** 비교한다. D(t) = 평균 |Δ| (0~255).
     · 진짜 주기 t=T 에서는 D 가 0 으로 돌아온다(루프니까 당연하다).
     · 타일 안에 n 주기가 있으면 t=T/n 에서도 D 가 0 으로 떨어진다 — 그게 «가짜 되돌아옴» 이고
       눈에는 그쪽이 반복 주기로 읽힌다.
   그래서 구간 (0.15T, 0.85T) 안의 **최저점**을 찾아 그 깊이를 본다:

     되돌아옴 지수 R = D(가짜 최저점) / max D        R 이 0 에 가까울수록 «그 위상에서 원위치»

   판정 — R ≥ 0.50 이어야 통과. (R=0 은 그 자리에서 그림이 완전히 같다는 뜻이고,
   R=1 은 한 주기 안 어디에서도 원위치하지 않는다는 뜻이다.)

   ⚠ 여기서 `::after`(입자·안개)는 끈다. 그 레이어는 주기가 --bgt2 로 달라서 켜 두면 D 가 어디서도
   0 으로 안 떨어져 **R 이 저절로 커진다** — 결함을 가려 버리는 측정이 된다. 결함은 흐름 레이어의
   자기유사성이므로 그 레이어만 격리해서 잰다(참고용으로 합성 값도 같이 찍는다). */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const TH = { gold: '골드 던전', dia: '다이아 던전', rel: '유물석', raid: '컨텐츠(레이드)' };
const N = 48;                       /* 한 주기를 몇 등분해 훑는가 */
const PASS_R = 0.50;                /* 상대 기준 — 최저 D 가 최대 D 의 50% 이상이면 되돌아옴 아님 */
const ABS_NEAR = 8;                 /* 절대 기준 — «그림이 같다» 고 할 수 있는 평균 |Δ| (0~255) */

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

  await p.evaluate(() => {
    document.getAnimations().forEach(a => { a._css = a.playState; try { a.pause(); } catch (_) {} });
  });
  const seek = ms => p.evaluate(t => {
    document.getAnimations().forEach(a => {
      if (a._css !== 'running') return;
      const d = a.effect && a.effect.getComputedTiming().duration;
      if (typeof d === 'number' && d > 0) { try { a.currentTime = t; } catch (_) {} }
    });
  }, ms);

  /* 흐름 레이어만 남긴다(seam121 과 같은 격리). `only` 가 false 면 두 레이어를 다 켠 «합성» 이다. */
  const isolate = only => p.evaluate(o => {
    let st = document.getElementById('p121per');
    if (!st) { st = document.createElement('style'); st.id = 'p121per'; document.head.appendChild(st); }
    st.textContent = `
      #dunw .dnc>*:not(.bgm){visibility:hidden !important}
      #dunw .dnc>.bgm{background:#000 !important;inset:0 !important;border-radius:0 !important}
      ${o ? '#dunw .dnc>.bgm::after{display:none !important}' : ''}
      #dunw .dnc>.bgm::before{opacity:1 !important}`;
  }, only);

  const readCards = () => p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const cls = [...el.classList].find(c => c.indexOf('bgm-') === 0) || '';
    return {
      key: cls.replace('bgm-', ''), x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      t1: parseFloat(cs.getPropertyValue('--bgt1')) * 1000,
      /* 화면 밖으로 잘린 카드는 재지 않는다 — 잘린 띠는 어느 위상에서도 안 변해 D 를 눌러 버린다 */
      vis: r.top >= 0 && r.bottom <= 2280,
    };
  }));

  const grab = async c => 'data:image/png;base64,' + (await p.screenshot({ clip: c })).toString('base64');
  const meanAbs = (a, b2, w, h) => p.evaluate(async ([ia, ib, W, H]) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
    const [A, B] = await Promise.all([load(ia), load(ib)]);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, W, H).data;
    let s = 0;
    for (let i = 0; i < da.length; i += 4) {
      s += Math.abs((da[i] + da[i + 1] + da[i + 2]) / 3 - (db[i] + db[i + 1] + db[i + 2]) / 3);
    }
    return s / (da.length / 4);
  }, [a, b2, w, h]);

  /* 카드 세로 중앙 밴드 하나만 본다 — 카드 전체를 쓰면 모서리 라운딩·그림자가 상수로 섞인다 */
  const band = c => ({ x: c.x + 12, y: c.y + Math.round(c.h * 0.30), width: c.w - 24, height: Math.round(c.h * 0.40) });

  async function sweep(c) {
    const cl = band(c);
    await seek(0); await p.waitForTimeout(50);
    const ref = await grab(cl);
    const D = [];
    for (let i = 1; i <= N; i++) {
      await seek(Math.round(c.t1 * i / N));
      await p.waitForTimeout(35);
      D.push({ f: i / N, d: await meanAbs(ref, await grab(cl), cl.width, cl.height) });
    }
    return D;
  }

  const out = [];
  for (const sub of ['dun', 'raid']) {
    if (sub === 'raid') { await p.evaluate(() => setDunSub('raid')); await p.waitForTimeout(900); }
    const cards = await readCards();
    for (const c of cards) {
      if (!TH[c.key] || out.some(o => o.key === c.key) || !c.vis) continue;
      await isolate(true);  await p.waitForTimeout(150);
      const solo = await sweep(c);
      await isolate(false); await p.waitForTimeout(150);
      const comp = await sweep(c);
      out.push({ key: c.key, t1: c.t1, solo, comp });
    }
  }

  /* ⚠ 7회차 2차 — 처음엔 판정을 R = 최저 D / 최대 D 하나로 했는데, 그 비율은 **대비가 낮은 테마에서
     저절로 나빠진다.** 레이드는 `--bgo1` 이 .24 로 넷 중 가장 낮아 D 의 진폭 자체가 좁고,
     그래서 «되돌아옴이 전혀 없는데도» R 이 0.40 으로 찍혔다(최저 D 가 25.25/255 — 그림이
     원위치한 게 아니라 그냥 커브가 평평한 것이다. 진짜 되돌아옴이던 골드는 0.02 였다).
     그래서 **절대 기준을 같이 본다**: «되돌아옴» 은 그림이 실제로 같아지는 것이므로 최저 D 가
     한 주기 끝(t=T, 진짜 루프 = D≈0)에 가까워야 한다. 두 조건을 **둘 다** 만족할 때만 결함이다.
        ① 상대 — 최저 D < 0.50 × 최대 D      ② 절대 — 최저 D < ABS_NEAR (= 8/255)
     (LESSONS 의 «하네스가 만든 지적» 함정 — 게이트 문턱을 통과하도록 옮기지 말고, 재는 양을 고쳐야 한다.) */
  const summarize = D => {
    const ds = D.map(v => v.d);
    const mx = Math.max(...ds);
    const sorted = [...ds].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const mid = D.filter(v => v.f > 0.15 && v.f < 0.85);
    const lo = mid.reduce((w, v) => (v.d < w.d ? v : w), mid[0]);
    return { mx, med, R: mx ? lo.d / mx : 1, at: lo.f, lod: lo.d };
  };

  console.log('\n[period121] 흐름 레이어의 «체감 반복 주기» — 한 주기 안에서 그림이 원위치하는 곳을 찾는다\n');
  console.log('  테마              --bgt1   가짜되돌아옴 위상   그때 D   최대 D   되돌아옴지수 R   체감주기   판정');
  let bad = 0;
  for (const o of out) {
    const s = summarize(o.solo);
    /* 결함 = 상대·절대 **둘 다** 걸릴 때. 어느 하나만이면 «커브가 평평한 저대비 테마» 지 되돌아옴이 아니다. */
    const ok = !(s.R < PASS_R && s.lod < ABS_NEAR);
    if (!ok) bad++;
    const felt = (s.R < PASS_R && s.lod < ABS_NEAR) ? (o.t1 / 1000 * s.at).toFixed(1) + 's' : (o.t1 / 1000).toFixed(0) + 's';
    console.log('  ' + (TH[o.key] + ' (' + o.key + ')').padEnd(22)
      + String((o.t1 / 1000).toFixed(0) + 's').padStart(6)
      + String((s.at * 100).toFixed(1) + '%').padStart(14)
      + String(s.lod.toFixed(2)).padStart(11)
      + String(s.mx.toFixed(2)).padStart(9)
      + String(s.R.toFixed(3)).padStart(14)
      + String(felt).padStart(11)
      + (ok ? '   ok' : '   ⚠ 반복 빠름')
      + (ok && s.R < PASS_R ? '  (R 은 낮지만 최저 D ' + s.lod.toFixed(1) + ' ≥ ' + ABS_NEAR
          + ' — 저대비 테마라 커브가 평평할 뿐, 원위치 아님. 중앙값 D ' + s.med.toFixed(1) + ')' : ''));
  }
  console.log('\n  참고 — 합성(::before + ::after 둘 다 켠 상태). 두 레이어의 주기가 달라 R 이 커 보이는 것이');
  console.log('  정상이며, 이 값으로는 판정하지 않는다(결함이 가려진다).');
  for (const o of out) {
    const s = summarize(o.comp);
    console.log('    ' + (TH[o.key]).padEnd(16) + ' R ' + s.R.toFixed(3) + ' (최저 위상 ' + (s.at * 100).toFixed(1) + '%)');
  }
  console.log('\n  * R = 구간 (0.15T, 0.85T) 최저 D / 최대 D. R < 0.25 면 그 위상에서 사실상 원위치 =');
  console.log('    체감 주기가 --bgt1 이 아니라 그 위상만큼으로 짧아진다. 통과 기준 R ≥ ' + PASS_R.toFixed(2) + '.');
  console.log('\n  → 체감 주기가 짧은 테마 ' + bad + '개');
  console.log(bad ? '\nPERIOD121 FAIL' : '\nPERIOD121 PASS ' + out.length + '/' + out.length);

  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
