/* 작업 121 6회차 — «화면에서 실제로 몇 px 움직이는가» 게이트.
 *
 * 지시 ⑥ 의 값은 «짧은 들썩 −8px · 큰 점프 −14px» 이고, `thBob` 키프레임에는 그 값이 그대로 적혀 있다.
 * 그런데 6회차 비평가 I·J 가 화면 실측으로 **18~25px**(지시 14 의 129~179%)을 냈다. 둘 다 옳았다 —
 * 키프레임은 맞고 **스쿼시 축**이 틀렸기 때문이다: 축이 잉크 발밑보다 D px 아래에 있으면
 * 스쿼시 s 가 잉크를 D×(1−s) 만큼 내리는 «이동» 이 되고 머리는 (D+h)×(1−s) 만큼 더 움직인다.
 *
 * 그래서 이 자는 CSS 선언값이 아니라 **잉크 bbox 를 위상마다 다시 재서** 진폭을 낸다.
 * 카드 간 격차도 같이 본다(«같은 키프레임인데 카드마다 다르게 보인다» 가 ② 감점원이었다).
 *
 * 실행: node tools/bobamp121.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* thBob 키프레임 위치(%) — 착지 0 · 짧은 들썩 정점 10 · 깊은 웅크림 84 · 큰 점프 정점 90 */
const PH = [0, 10, 20, 50, 70, 84, 90, 95];
const SPEC = { short: 8, big: 14, tol: 3, spread: 1.25 };

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1500);
  await p.evaluate(() => { S.guide.idx = 99; S.best = 999; S.dun.relic1 = 99; });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => renderDunPage());
  await p.waitForTimeout(400);

  const freeze = () => p.evaluate(() => {
    window.__idleFrozen = true;
    document.getAnimations().forEach(a => { a._css = a.playState; try { a.pause(); } catch (_) {} });
  });
  const seek = ms => p.evaluate(t => {
    document.getAnimations().forEach(a => {
      if (a._css !== 'running') return;
      const d = a.effect && a.effect.getComputedTiming().duration;
      if (typeof d === 'number' && d > 0) { try { a.currentTime = t % (d * 4); } catch (_) {} }
    });
  }, ms);
  const grab = async c => 'data:image/png;base64,' + (await p.screenshot({ clip: c })).toString('base64');
  /* 잉크 bbox = «썸네일 보임» − «썸네일 숨김» 차분 (반투명 배경 위라 알파로는 못 잰다) */
  const inkY = (a, b2, w, h) => p.evaluate(async ([ia, ib, W, H]) => {
    const load = s => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
    const [A, B] = await Promise.all([load(ia), load(ib)]);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, W, H).data;
    let y0 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      let c = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
        if (d > 40) c++;
      }
      if (c >= 3) { if (y0 < 0) y0 = y; y1 = y; }   /* 3px 이상인 행만 — 글로우 한 줄을 흡수 */
    }
    return { y0, y1 };
  }, [a, b2, w, h]);

  const rows = [];
  for (const [tabName, sub] of [['던전', 'dun'], ['컨텐츠', 'raid']]) {
    if (sub === 'raid') { await p.evaluate(() => setDunSub('raid')); await p.waitForTimeout(900); }
    await freeze();
    /* ⚠ **칸(캔버스) 단위로 잰다.** 아레나 카드는 캔버스가 2장이고 위상이 서로 다르게(`--thd`) 걸려
       있어서, 슬롯 하나를 통째로 재면 두 스프라이트의 **합집합** 이 잡혀 진폭이 눌린다(첫 판에서
       아레나만 «짧은 들썩 0px» 으로 나온 이유다). */
    const n = await p.evaluate(() => document.querySelectorAll('#dunList .dnc:not(.lkd) >.th>canvas').length);
    for (let i = 0; i < n; i++) {
      const info = await p.evaluate(i => {
        const cv0 = document.querySelectorAll('#dunList .dnc:not(.lkd) >.th>canvas')[i];
        const el = cv0.closest('.dnc');
        el.scrollIntoView({ block: 'center' });
        const r = cv0.getBoundingClientRect(), cs = getComputedStyle(cv0);
        const base = el.dataset.dcard || el.dataset.rcard || (el.classList.contains('arn2') ? 'arena' : '?');
        return { name: base + (cv0.dataset.arnav ? (cv0.classList.contains('arn-me') ? '/me' : '/op') : ''),
                 dur: parseFloat(cs.animationDuration) * 1000,
                 dly: parseFloat(cs.animationDelay) * 1000,
                 clip: { x: Math.round(r.left), y: Math.round(r.top),
                         width: Math.round(r.width), height: Math.round(r.height) } };
      }, i);
      await p.waitForTimeout(140);
      if (!info) continue;
      const tops = [];
      for (const ph of PH) {
        /* ⚠ 카드마다 `animation-delay`(`--thd`, 음수)가 달라서 «전역 currentTime = 주기×ph%» 는
           카드 하나(지연 0)에만 맞는다. 첫 판에서 다이아·아레나가 «진폭 −17px» 로 뒤집혀 나온 것이
           그 때문이었다(착지와 정점 표본이 서로 바뀌었다). 키프레임 진행률 ph% 를 맞추려면
           **그 카드의 지연을 더한** 로컬 시각을 그 카드의 애니메이션에만 찍어야 한다. */
        await p.evaluate(([i, t]) => {
          const cv = document.querySelectorAll('#dunList .dnc:not(.lkd) >.th>canvas')[i];
          cv.getAnimations().forEach(a => {
            const d = a.effect && a.effect.getComputedTiming().duration;
            if (typeof d === 'number' && d > 0) { let v = t; while (v < 0) v += d; try { a.currentTime = v; } catch (_) {} }
          });
        }, [i, Math.round(info.dly + info.dur * ph / 100)]);
        await p.waitForTimeout(45);
        const on = await grab(info.clip);
        await p.evaluate(i => { document.querySelectorAll('#dunList .dnc:not(.lkd) >.th>canvas')[i]
          .style.visibility = 'hidden'; }, i);
        await p.waitForTimeout(40);
        const off = await grab(info.clip);
        await p.evaluate(i => { document.querySelectorAll('#dunList .dnc:not(.lkd) >.th>canvas')[i]
          .style.visibility = ''; }, i);
        tops.push((await inkY(on, off, info.clip.width, info.clip.height)).y0);
      }
      /* 착지(0/20) 대비 짧은 들썩 정점(10/50/70) · 깊은 웅크림(84) 대비 큰 점프 정점(90) */
      const land = (tops[0] + tops[2]) / 2;
      const shortPk = Math.min(tops[1], tops[3], tops[4]);
      const big = tops[5] - tops[6];
      rows.push({ tab: tabName, name: info.name, tops, short: +(land - shortPk).toFixed(1), big });
    }
  }
  await p.evaluate(() => setDunSub('dun'));

  console.log('썸네일 «들썩» 화면 실측 진폭 — 잉크 상단 기준 px (지시: 짧은 들썩 8 · 큰 점프 14)');
  console.log('  탭      카드        짧은 들썩   큰 점프    위상별 잉크상단');
  let bad = 0;
  for (const r of rows) {
    const okS = Math.abs(r.short - SPEC.short) <= SPEC.tol, okB = Math.abs(r.big - SPEC.big) <= SPEC.tol;
    if (!okS || !okB) bad++;
    console.log('  ' + r.tab.padEnd(7) + r.name.padEnd(11)
      + (r.short + (okS ? '' : ' ✗')).padStart(10) + (r.big + (okB ? '' : ' ✗')).padStart(10)
      + '    ' + r.tops.join(','));
  }
  const bigs = rows.map(r => r.big).filter(v => v > 0);
  const spread = bigs.length ? Math.max(...bigs) / Math.min(...bigs) : 1;
  const okSp = spread <= SPEC.spread;
  console.log(`  카드 간 큰 점프 격차 ${spread.toFixed(2)}배 (${okSp ? 'ok' : '✗'} ≤ ${SPEC.spread})`);
  if (!okSp) bad++;
  console.log(bad ? `BOBAMP121 FAIL — ${bad}건` : `BOBAMP121 PASS — ${rows.length}장 전부 지시값 ±${SPEC.tol}px, 격차 ${spread.toFixed(2)}배`);
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
