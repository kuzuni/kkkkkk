/* 작업 237 실측 하네스 v5 — «러너 무관 축» 후보: 프레임당 캔버스 명령 수(작업량).
   시간은 이 컨테이너에서 실행마다 40% 흔들리지만 명령 수는 제품이 바뀔 때만 바뀐다.
   적 30 · 8스킬 씬을 K회 돌려 프레임당 명령 수의 중앙값·최댓값과 종류별 분포를 찍는다.
   실행: node tools/perf237e.js [프레임수=600] [회수=5]                                        */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const N = +(process.argv[2] || 600);
const REP = +(process.argv[3] || 5);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  const out = await p.evaluate(({ N, REP }) => {
    const EQ = ['meteor','boom','holy','nova','gale','lance','bolt','shuri'];
    /* --- 캔버스 명령 계수기 (전 캔버스 공통 · 프로토타입 래핑) --- */
    const CP = CanvasRenderingContext2D.prototype;
    const OPS = ['fill','stroke','fillRect','strokeRect','drawImage','fillText','strokeText',
                 'clearRect','putImageData','arc','ellipse','createRadialGradient','createLinearGradient'];
    const cnt = {};
    if (!CP.__c237) {
      OPS.forEach(k => { const f = CP[k]; if (typeof f !== 'function') return;
        CP[k] = function(){ cnt[k] = (cnt[k]||0) + 1; return f.apply(this, arguments); }; });
      /* 비싼 상태 2종은 «켠 횟수» 로 따로 센다 — 명령 수는 적은데 시간은 폭발하는 부류 */
      ['filter','shadowBlur'].forEach(k => {
        const d = Object.getOwnPropertyDescriptor(CP, k); if (!d || !d.set) return;
        Object.defineProperty(CP, k, { configurable:true, enumerable:d.enumerable, get:d.get,
          set(v){ if (v && v !== 'none' && v !== 0) cnt[k] = (cnt[k]||0) + 1; return d.set.call(this, v); } });
      });
      CP.__c237 = 1;
    }
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
    function run(withSkills, n){
      scene(withSkills);
      Object.keys(cnt).forEach(k => delete cnt[k]);
      let partMax = 0, ringMax = 0;
      for (let i = 0; i < n; i++) {
        step(1/60); draw();
        partMax = Math.max(partMax, parts.length);
        ringMax = Math.max(ringMax, rings.length);
        enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; });
      }
      const per = {}; let tot = 0;
      Object.keys(cnt).forEach(k => { per[k] = Math.round(cnt[k]/n*10)/10; tot += cnt[k]; });
      return { per, tot: Math.round(tot/n*10)/10, partMax, ringMax };
    }
    run(true, 60);
    const rows = [];
    for (let k = 0; k < REP; k++) rows.push({ b: run(true, N), a: run(false, N) });
    return rows;
  }, { N, REP });

  console.log('B(8스킬) 프레임당 총 명령 ' + out.map(o => o.b.tot).join('/'));
  console.log('A(0스킬) 프레임당 총 명령 ' + out.map(o => o.a.tot).join('/'));
  const s = out.map(o => o.b.tot).sort((x,y)=>x-y);
  console.log('B 중앙값 ' + s[(s.length-1)>>1] + ' · 폭 ' + (s[s.length-1]-s[0]).toFixed(1) +
              ' (' + (100*(s[s.length-1]-s[0])/s[(s.length-1)>>1]).toFixed(1) + '%)');
  console.log('B 종류별(1회차) ' + JSON.stringify(out[0].b.per));
  console.log('A 종류별(1회차) ' + JSON.stringify(out[0].a.per));
  console.log('parts ' + out.map(o => o.b.partMax).join('/') + ' · rings ' + out.map(o => o.b.ringMax).join('/'));
  await b.close();
})();
