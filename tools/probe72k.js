/* 작업 72 12회차 — 액자 안 그림의 **표시 배율이 프레임마다 다시 풀리는지** 잰다.
 *
 * `drawSpriteTo(fit)` 는 «그 프레임의 아틀라스 rect» 를 contain 하므로, 한 사이클 안에서 rect 크기가
 * 바뀌는 애니는 같은 캐릭터가 프레임마다 다른 크기로 그려진다(= 화면에서 «부풀었다 쪼그라든다»).
 * 258 이 04 세부 팝업 배너에서 같은 것을 실측해 12.9~45.9% 로 찍었지만 **03 행 카드는 그대로 뒀다**
 * (그때는 121 구간이라 판단). 이 프로브가 03 행 카드에서 같은 자를 댄다.
 *
 * 재는 대상은 «전 프레임» 이 아니라 **실제로 도는 프레임**이다 — 121 6회차가 `TH_IDLE` 로
 * 아이들 창을 좁혀 놨으므로, 창이 있으면 창만, 없으면 전 사이클이 화면에 나오는 집합이다.
 *
 * 실행: node tools/probe72k.js [--unlock]
 * 출력: 카드별 k(표시 배율) 목록 + 스윙(max/min − 1). 마지막 줄 `SWING max=…%`.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const UNLOCK = process.argv.includes('--unlock');

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1000);
  if (UNLOCK) await p.evaluate(() => {
    S.guide.idx = 99;
    Object.values(DUN_UI).forEach(u => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
  });
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const out = await p.evaluate(() => {
    const res = [];
    const cvs = [...document.querySelectorAll('#dunList .dnc:not(.rd)>.th>canvas.thcv')];
    cvs.forEach((cv, ci) => {
      const A = ATLAS[cv.dataset.thk];
      if (!A) return;
      /* 실제로 도는 집합 — 아이들 창이 있으면 창, 없으면 전 사이클, 애니가 없으면 정지 1장 */
      const anim = cv.dataset.thi;
      const win = (typeof TH_IDLE !== 'undefined' && TH_IDLE[cv.dataset.thk + '/' + anim]) || null;
      const list = win || (anim && A.a[anim]) || [cv.dataset.thf];
      const W = cv.width, H = cv.height, sp = TH_PAD;
      const rows = [];
      const keep = cv._fr;
      for (const fn of list) {
        const fr = A.f[fn]; if (!fr) continue;
        /* ⚠ 배율은 **제품이 그린 결과에서 역산**한다 — 게이트가 다시 계산하면 동어반복이다(279).
           `raidDraw(cv, pin)` 이 `drawSpriteTo` 의 {dx,dy,dw,dh} 를 그대로 돌려준다. */
        const r = raidDraw(cv, fn);
        const k = (r && r.dw) ? r.dw / fr[2] : -1;
        /* 121 축 — 잉크 top(슬롯 로컬). 프레임 사이로 이게 튀면 스프라이트가 CSS 들썩을 덮는다. */
        const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
        let y0 = -1;
        for (let y = 0; y < H && y0 < 0; y++) for (let x = 0; x < W; x++) {
          if (d[(y * W + x) * 4 + 3] > 8) { y0 = y; break; }
        }
        rows.push({ fn, src: [fr[2], fr[3]], k: +k.toFixed(4),
                    draw: r ? [r.dw, r.dh] : null, top: y0 });
      }
      if (keep) raidDraw(cv, keep);
      res.push({ card: ci + 1, k: cv.dataset.thk, anim, win: !!win, cv: [W, H], rows });
    });
    return res;
  });

  let worst = 0, worstCard = '', jit = 0, jitCard = '';
  out.forEach((c) => {
    const ks = c.rows.map((r) => r.k);
    const tops = c.rows.map((r) => r.top).filter((t) => t >= 0);
    const sw = ks.length ? (Math.max(...ks) / Math.min(...ks) - 1) * 100 : 0;
    /* 121 축 — 잉크 top 의 peak-to-peak(프레임 사이 흔들림). thBob 진폭 18 의 절반(9)이 121 의 기준선. */
    const tp = tops.length ? Math.max(...tops) - Math.min(...tops) : 0;
    if (sw > worst) { worst = sw; worstCard = `카드${c.card} ${c.k}/${c.anim}`; }
    if (tp > jit) { jit = tp; jitCard = `카드${c.card} ${c.k}/${c.anim}`; }
    console.log(`카드${c.card} ${c.k}/${c.anim}${c.win ? ' (아이들 창)' : ''} — ${c.rows.length}프레임 · 배율 스윙 ${sw.toFixed(1)}% · 잉크 top p2p ${tp}px`);
    c.rows.forEach((r) => console.log(`    ${r.fn} rect ${r.src.join('x')} → k ${r.k} · 그려진 ${(r.draw || []).join('x')} · top ${r.top}`));
  });
  console.log(`\n콘솔 에러 ${errs.length}건`);
  console.log(`SWING max=${worst.toFixed(1)}% (${worstCard})`);
  console.log(`INKTOP p2p max=${jit}px (${jitCard})  — 121 기준선 9px(thBob 18 의 절반)`);
  await b.close();
  process.exit(worst > 0.5 ? 1 : 0);
})();
