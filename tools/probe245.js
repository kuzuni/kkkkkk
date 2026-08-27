/* 245 프로브 — 03 던전 카드 썸네일의 «지금 그려진 프레임» 이 얼마나 자주 겹치는지 **확률로** 잰다.
   실행: node tools/probe245.js [표본수=120] [간격ms=50]

   왜 필요한가: `verify72` [1-2] 의 「카드 N장이 서로 다른 아트다」는 한때 «지금 그려진 프레임»
   (`cv._fr`)을 비교해서 **뜨고 지는 FAIL** 이었다. 그런 자는 게이트를 몇 번 돌려서는 확인이 안 된다
   (인계 당시 3회 연속 PASS, 실제 충돌률 34.2% — 0.658³ = 28.5% 로 그냥 일어난다).
   이 프로브는 ① 충돌률 ② 어느 쌍이 어느 프레임에서 겹치는지 ③ 설계값(`thk/thi/thf`) 쪽 충돌 여부를
   한 번에 찍는다. 245 가 게이트를 설계값으로 옮긴 뒤로 ①·③ 은 «게이트가 무엇을 안 보게 됐는지» 의
   기록이자, 아트가 들어와 아틀라스 중복이 풀렸는지 확인하는 자로 쓴다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const N = +(process.argv[2] || 120), GAP = +(process.argv[3] || 50);

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const snap = () => p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map((c) => {
    const cv = c.querySelector('canvas.thcv');
    if (!cv) return null;
    return { id: c.dataset.dcard || '?', lkd: c.classList.contains('lkd'),
             thn: cv.dataset.thn, at: cv._an ? +cv._an.at.toFixed(2) : null,
             now: cv.dataset.thk + '/' + (cv._fr || cv.dataset.thf),
             dsg: cv.dataset.thk + '/' + cv.dataset.thi + '/' + cv.dataset.thf };
  }).filter(Boolean));

  /* [1] 카드별 상태 한 줄 — 잠금 카드는 `at` 이 멈춰 있고, 굳은 프레임은 `thf` 가 아닐 수 있다 */
  console.log('[1] 카드 상태 (잠금 카드는 raidIdleTick 지시 ④ 로 정지 → at 고정)');
  (await snap()).forEach((s) => console.log(
    `  ${s.id.padEnd(8)} lkd=${String(s.lkd).padEnd(5)} thn=${String(s.thn).padStart(2)} at=${String(s.at).padStart(6)}  지금 ${s.now.padEnd(22)} 설계 ${s.dsg}`));

  /* [2] 충돌률 */
  console.log(`\n[2] «지금 그려진 프레임» 충돌률 — ${N}표본 × ${GAP}ms`);
  let coll = 0, collDsg = 0;
  const dups = new Map();
  for (let i = 0; i < N; i++) {
    const s = await snap();
    const now = new Set(s.map((x) => x.now)), dsg = new Set(s.map((x) => x.dsg));
    if (dsg.size < s.length) collDsg++;
    if (now.size < s.length) {
      coll++;
      const by = new Map();
      s.forEach((x) => by.set(x.now, (by.get(x.now) || []).concat(x.id)));
      [...by.entries()].filter(([, v]) => v.length > 1).forEach(([k, v]) => {
        const key = v.join('+') + ' → ' + k;
        dups.set(key, (dups.get(key) || 0) + 1);
      });
    }
    await p.waitForTimeout(GAP);
  }
  console.log(`  «지금 프레임» 충돌 ${coll}/${N} (${(coll / N * 100).toFixed(1)}%)`);
  [...dups.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`     ${k} — ${v}회`));
  console.log(`  «설계값(thk/thi/thf)» 충돌 ${collDsg}/${N} (${(collDsg / N * 100).toFixed(1)}%)  ← verify72 가 재는 자리`);
  await b.close();
  process.exit(collDsg ? 1 : 0);   /* 설계값이 겹치면 verify72 가 빨개진다 — 여기서도 알린다 */
})();
