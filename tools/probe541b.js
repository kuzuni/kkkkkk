/* 541 밸런스 이관용 실측 — «크기를 키웠더니 피격이 얼마나 늘었나» 를 숫자로 남긴다.
   ⚠ 이 파일은 **게이트가 아니다**(계수를 고치지 않는다). 541 은 주인 지시대로 크기만 바꾸고
   난이도 상쇄는 199 몫이라, 199 가 볼 표를 여기서 만들어 둔다(326·331 이 같은 방식으로 넘겼다).

   재는 것:
     · 피격 거리 `e.r + player.r + 6` — 잡몹 3종의 수리 전/후 값
     · 스테이지 20 · 같은 시간(sim 60초)에 플레이어가 **몇 번 맞았나** (시드 무작위라 3판 평균)

   실행: node tools/probe541b.js            (현재 트리)
         node tools/probe541b.js <파일>      (사본 — 수리 전 대조)                        */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const file = process.argv.slice(2).find(a => !a.startsWith('--'));
const TARGET = file ? path.resolve(file) : path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + TARGET);
  await page.waitForTimeout(1500);

  const out = await page.evaluate(() => {
    const res = { reach: {}, hits: [] };
    for (const tk of ['zombie', 'goblin', 'dark']) {
      enemies.length = 0;
      makeEnemy(tk);
      const e = enemies.filter(o => o.tk === tk).pop();
      res.reach[tk] = +(e.r + player.r + 6).toFixed(2);
    }
    enemies.length = 0;
    /* 스테이지 20 · sim 60초 × 3판 — 플레이어가 맞은 횟수(피격 틴트가 새로 켜지는 프레임을 센다) */
    for (let run = 0; run < 3; run++) {
      S.stage = 20; enemies.length = 0; shots.length = 0; zones.length = 0; corpses.length = 0;
      player.hp = player.max = 1e12; player.dead = 0; player.inv = 0;
      let hits = 0, prev = 0;
      for (let i = 0; i < 60 / 0.02; i++) {
        step(0.02);
        if (player.hitFx > prev) hits++;
        prev = player.hitFx;
        player.hp = 1e12;                      /* 죽어서 판이 끊기지 않게 — 피격 «횟수» 만 센다 */
      }
      res.hits.push(hits);
    }
    enemies.length = 0;
    return res;
  });

  await browser.close();
  const avg = out.hits.reduce((a, b) => a + b, 0) / out.hits.length;
  console.log(`\n=== probe541b (${path.basename(TARGET)}) ===`);
  console.log(`피격 거리(e.r + player.r + 6): 좀비 ${out.reach.zombie} · 고블린 ${out.reach.goblin} · 다크엘프 ${out.reach.dark}`);
  console.log(`스테이지 20 · 60초 피격 횟수: ${out.hits.join(' / ')}  (평균 ${avg.toFixed(1)})`);
})();
