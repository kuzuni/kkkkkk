/* 작업 237 실측 하네스 — «절대 fps» 대신 «같은 러너·같은 실행 안의 A/B 비율» 자를 세우기 위한 표본 수집.
   A(기준선) = 적 30 · 스킬 0칸(연출 OFF)   B(부하) = 적 30 · 8스킬(연출 ON)
   A/B 를 번갈아 3쌍 재고 쌍별 비율을 찍는다 (LESSONS 121-④ — ON 을 다 재고 OFF 를 나중에 재면 거짓 FAIL).
   실행: node tools/perf237.js [프레임수=1200] [쌍수=3]                                        */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const N = +(process.argv[2] || 1200);
const PAIRS = +(process.argv[3] || 3);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  const out = await p.evaluate(({ N, PAIRS }) => {
    const EQ = ['meteor','boom','holy','nova','gale','lance','bolt','shuri'];
    function scene(withSkills){
      sbufClear();
      S.own = {}; EQ.forEach(id => S.own[id] = { n:0, l:1 });
      S.eqSkill = withSkills ? EQ.slice() : [];
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; enemies.length = 0; spawnQ.length = 0;
      markDirty();
      player.x = WORLD.w/2; player.y = WORLD.h/2; player.dead = 0; player.inv = 99;
      for (let i = 0; i < 30; i++) makeEnemy('zombie');
      enemies.forEach((e, i) => { e.born = 1; e.hp = e.max = 1e12;
        const a = i*6.283/30; e.x = player.x + Math.cos(a)*(120 + (i%5)*40); e.y = player.y + Math.sin(a)*(120 + (i%5)*40); });
    }
    function run(withSkills){
      scene(withSkills);
      let partMax = 0, ringMax = 0;
      const t0 = performance.now();
      for (let i = 0; i < N; i++) {
        step(1/60); draw();
        partMax = Math.max(partMax, parts.length);
        ringMax = Math.max(ringMax, rings.length);
        enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; });
      }
      return { ms: (performance.now() - t0) / N, partMax, ringMax, pool: trPool.length };
    }
    const rows = [];
    for (let k = 0; k < PAIRS; k++) {
      const a = run(false);          /* 기준선 먼저 — 쌍 안에서 인접하게 */
      const bb = run(true);
      rows.push({ base: a.ms, heavy: bb.ms, ratio: bb.ms / a.ms,
                  partMax: bb.partMax, ringMax: bb.ringMax, pool: bb.pool });
    }
    return rows;
  }, { N, PAIRS });

  const r = out.map(o => o.ratio).sort((x, y) => x - y);
  const med = r[(r.length - 1) >> 1];
  out.forEach((o, i) => console.log('쌍 ' + (i+1) +
    ' — 기준선 ' + o.base.toFixed(3) + 'ms · 부하 ' + o.heavy.toFixed(3) + 'ms · 비율 ' + o.ratio.toFixed(3) +
    ' · parts ' + o.partMax + ' · rings ' + o.ringMax + ' · pool ' + o.pool));
  console.log('비율 중앙값 ' + med.toFixed(3) + ' (프레임 ' + N + ' × ' + PAIRS + '쌍)');
  await b.close();
})();
