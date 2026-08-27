/* 작업 237 — verify114 [8] «성능 예산» 의 자를 다시 세울 때 쓰는 표본 수집기.
 *
 * 이 컨테이너에서 «절대 fps» 는 못 잰다(LESSONS 121-④ · 237). 같은 커밋·같은 씬이 실행마다
 * 19.4ms ↔ 32.7ms 로 흔들리기 때문이다. 그래서 게이트의 판정 축을 두 개로 나눴고, 이 하네스는
 * 그 두 축의 **분포**를 찍어 «자를 어디에 둘지» 를 근거로 정하게 해 준다.
 *
 *   ⓐ 작업량(주 판정) — 적 30 · 8스킬 씬의 프레임당 캔버스 명령 수. 러너 부하와 무관하고
 *      제품이 바뀔 때만 바뀐다. 실측 폭 7.4%.
 *   ⓑ 시간(보조 판정) — 같은 실행 안에서 «기준선(스킬 0칸) ↔ 부하(8칸)» 를 번갈아 재고
 *      쌍별 비율의 중앙값을 본다. 한쪽을 다 재고 나중에 다른 쪽을 재면 그 사이의 컨테이너
 *      부하 변화가 통째로 비율에 실린다.
 *
 * 실행: node tools/perf237.js [프레임수=600] [쌍수=5]
 *   자를 옮길 때는 이 하네스를 **최소 2회** 돌려 실행 간 폭까지 보고 나서 정한다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const N = +(process.argv[2] || 600);
const PAIRS = +(process.argv[3] || 5);

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
    function spin(withSkills, n){
      scene(withSkills);
      let partMax = 0, ringMax = 0;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) {
        step(1/60); draw();
        partMax = Math.max(partMax, parts.length); ringMax = Math.max(ringMax, rings.length);
        enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; });
      }
      return { ms: (performance.now() - t0) / n, partMax, ringMax, pool: trPool.length };
    }

    /* ⓑ 시간 — 기준선↔부하를 번갈아 */
    spin(false, 60); spin(true, 60);                       /* 워밍업 */
    const rows = [];
    for (let k = 0; k < PAIRS; k++) {
      const a = spin(false, N), h = spin(true, N);
      rows.push({ base: a.ms, heavy: h.ms, ratio: h.ms / a.ms,
                  partMax: h.partMax, ringMax: h.ringMax, pool: h.pool });
    }

    /* ⓐ 작업량 — 프로토타입을 래핑해 세고 되돌린다 */
    const CP = CanvasRenderingContext2D.prototype;
    const OPS = ['fill','stroke','fillRect','strokeRect','drawImage','fillText','strokeText',
                 'clearRect','putImageData','arc','ellipse','createRadialGradient','createLinearGradient'];
    const cnt = {}, orig = {}, sd = {};
    OPS.forEach(k => { const f = CP[k]; if (typeof f !== 'function') return; orig[k] = f;
      CP[k] = function(){ cnt[k] = (cnt[k]||0) + 1; return f.apply(this, arguments); }; });
    ['filter','shadowBlur'].forEach(k => {
      const d = Object.getOwnPropertyDescriptor(CP, k); if (!d || !d.set) return; sd[k] = d;
      Object.defineProperty(CP, k, { configurable:true, enumerable:d.enumerable, get:d.get,
        set(v){ if (v && v !== 'none' && v !== 0) cnt[k] = (cnt[k]||0) + 1; return d.set.call(this, v); } });
    });
    const opRun = (withSkills, n) => {
      scene(withSkills);
      Object.keys(cnt).forEach(k => delete cnt[k]);
      for (let i = 0; i < n; i++) { step(1/60); draw();
        enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; }); }
      let tot = 0; const costly = (cnt.filter||0) + (cnt.shadowBlur||0);
      const per = {};
      Object.keys(cnt).forEach(k => { per[k] = Math.round(cnt[k]/n*10)/10;
        if (k !== 'filter' && k !== 'shadowBlur') tot += cnt[k]; });
      return { ops: Math.round(tot/n*10)/10, costly: Math.round(costly/n*100)/100, per };
    };
    const ops = [];
    for (let k = 0; k < PAIRS; k++) ops.push(opRun(true, N));
    const opBase = opRun(false, Math.max(120, N/3|0));
    OPS.forEach(k => { if (orig[k]) CP[k] = orig[k]; });
    Object.keys(sd).forEach(k => Object.defineProperty(CP, k, sd[k]));
    return { rows, ops, opBase };
  }, { N, PAIRS });

  const med = a => a.slice().sort((x, y) => x - y)[(a.length - 1) >> 1];
  const f = a => a.map(v => (+v).toFixed(2)).join('/');
  const o = out.ops.map(r => r.ops);
  console.log('ⓐ 작업량  부하 ' + f(o) + '  중앙값 ' + med(o).toFixed(1) +
    '  폭 ' + (Math.max(...o) - Math.min(...o)).toFixed(1) +
    ' (' + (100*(Math.max(...o) - Math.min(...o))/med(o)).toFixed(1) + '%)  기준선 ' + out.opBase.ops);
  console.log('          filter·shadowBlur ' + f(out.ops.map(r => r.costly)) + ' /프레임');
  console.log('          종류별(1회) ' + JSON.stringify(out.ops[0].per));
  const rt = out.rows.map(r => r.ratio);
  console.log('ⓑ 시간    기준선 ' + f(out.rows.map(r => r.base)) + 'ms  부하 ' + f(out.rows.map(r => r.heavy)) + 'ms');
  console.log('          비율 ' + f(rt) + '  중앙값 ' + med(rt).toFixed(3) +
    '  폭 ' + (Math.max(...rt) - Math.min(...rt)).toFixed(3));
  console.log('상한      parts ' + out.rows.map(r => r.partMax).join('/') +
    ' · rings ' + out.rows.map(r => r.ringMax).join('/') + ' · pool ' + out.rows.map(r => r.pool).join('/'));
  await b.close();
})();
