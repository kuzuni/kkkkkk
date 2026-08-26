/* 작업 114 — 15회차 프로브: «피격 표현이 장면마다 다르다» 를 경로 단위로 실측
 *
 * 배경 — 13회차 AR#14 · 14회차 AS④ · AT④ 가 **세 사람 독립으로** «장면마다 피격 표현이 다르다» 를
 * ④ 가독성·일관성의 근거로 적었다. 14회차는 «수치 처방이 서로 달라» 못 잡고 15회차 1순위로 넘겼다.
 *
 * 이 프로브가 재는 것은 «어떻게 보이는가» 가 아니라 **«피해 경로마다 무엇이 붙는가»** 다.
 * 그림이 아니라 코드 사실이라 비평가 사이의 수치 불일치와 무관하게 확정된다.
 *
 *   ① 장면별 «타격 1회당 피격 링이 붙어 있는 비율»(부착률) — 장면 간 격차가 곧 ④ 감점의 크기다
 *   ② 타격당 링 개수 — 치명타 2겹을 빼면 1 이어야 한다(연타·장판이 링을 쌓지 않는가)
 *   ③ 링 배열 최대 길이 — RING_CAP(44) 헤드룸. 경로를 늘렸으니 상한을 넘기지 않는지 같이 본다
 *
 * 15회차 «고치기 전» 실측 — trail 100% · impact 100% · **boom 0% · bolt 0%**, 최대 격차 **100%p**.
 *
 * 실행: node tools/probe114f.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* cap114.js 의 4장면과 같은 정의를 쓴다 — 채점본과 같은 조건에서 재야 의미가 있다 */
const SCENES = [
  { key:'trail',  skills:['shuri','ice'], dist:210, n:8,  gap:80, recast:700, crit:0, lead:0 },
  { key:'impact', skills:['slash'],       dist:95,  n:8,  gap:80, recast:110, crit:1, lead:0 },
  { key:'boom',   skills:['meteor'],      dist:150, n:12, gap:80, recast:1400, crit:0, lead:160 },
  { key:'bolt',   skills:['bolt'],        dist:240, n:8,  gap:80, recast:700, crit:0, lead:0 }
];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  let err = 0;
  p.on('pageerror', e => { err++; console.log('  [pageerror] ' + e); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);

  console.log('\n== ①② 피해 경로 대비 피격 연출 부착률 (장면 무관 · 코드 사실) ==');

  const rows = [];
  for (const sc of SCENES) {
    const r = await p.evaluate((sc) => {
      if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
      document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));
      sbufClear();
      S.own = {}; sc.skills.forEach(id => S.own[id] = { n:0, l:1 });
      S.eqSkill = sc.skills.slice();
      S.opt.shake = true;
      S.lv.crit = sc.crit ? 400 : 0;
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
      markDirty();
      player.x = WORLD.w/2; player.y = WORLD.h/2; player.dead = 0; player.inv = 9999;
      player.hp = stat.maxHp;
      for (let i = 0; i < 6; i++) makeEnemy('zombie');
      enemies.forEach((e, i) => {
        e.born = 1; e.hp = e.max = 1e12;
        const a = i*6.283/6;
        e.x = player.x + Math.cos(a)*sc.dist; e.y = player.y + Math.sin(a)*sc.dist;
      });

      /* ---- 계측기 부착 -------------------------------------------------------
         `hitEnemy` 는 전역 함수 선언이라 재대입이 호출부에 그대로 먹는다.
         재는 것은 «링을 새로 만들었는가» 가 아니라 **«이 타격 직후 맞은 적 자리에 피격 링이 있는가»** 다.
         억제(45px 안에 형제 링이 살아 있으면 되살리고 만들지 않는다)는 «없음» 이 아니라 «합쳐짐» 이므로
         새 링 개수만 세면 연타 장면이 부당하게 낮게 나온다. 적 앵커 기준으로 «존재» 를 본다. */
      const M = { hits:0, withRing:0, ringsAlive:0, maxRings:0 };
      const realHit = hitEnemy;
      window.hitEnemy = function(e, dmg, crit, kx, ky){
        const out = realHit.apply(null, arguments);
        M.hits++;
        const ax = e.x, ay = e.y - e.r;
        let near = 0;
        for (const q of rings) {
          if (!q.imp || q.t < 0 || q.t > IMP_LIFE) continue;
          if ((q.x-ax)*(q.x-ax) + (q.y-ay)*(q.y-ay) < 2025) near++;
        }
        if (near > 0) M.withRing++;
        M.ringsAlive += near;
        M.maxRings = Math.max(M.maxRings, rings.length);
        return out;
      };

      window.__capT = 0;
      window.__capRecast = sc.recast/1000;
      window.__capWrap = (dt) => {
        enemies.forEach(e => { e.hp = e.max = 1e12; e.slow = 0; });
        window.__capT += dt;
        if (window.__capT >= window.__capRecast) { window.__capT = 0; S.eqSkill.forEach(id => { skillCd[id] = 0; }); }
      };
      S.eqSkill.forEach(id => { if (SK[id]) castSkill(SK[id]); });
      S.eqSkill.forEach(id => { skillCd[id] = sc.recast/1000; });
      window.__M = M;
      return true;
    }, sc);

    /* 캡처와 같은 창(lead + n×gap)을 게임 시간으로 손수 굴린다 */
    const total = (sc.lead || 0) + sc.n * sc.gap;
    const out = await p.evaluate((total) => {
      const real = window.__realStepRaw || window.__realStep || step;
      const SUB = 1/60;
      let t = 0;
      while (t < total/1000) {
        real(SUB);
        if (window.__capWrap) window.__capWrap(SUB);
        t += SUB;
      }
      return window.__M;
    }, total);

    rows.push({ key: sc.key, ...out });
  }

  console.log('\n  | 장면 | 타격 수 | 피격 링이 붙은 타격 | 부착률 | 타격당 링 | 링 배열 최대 |');
  console.log('  |---|---|---|---|---|---|');
  for (const r of rows) {
    const pct = r.hits ? Math.round(r.withRing / r.hits * 1000) / 10 : 0;
    const rpm = r.hits ? Math.round(r.ringsAlive / r.hits * 100) / 100 : 0;
    console.log(`  | ${r.key} | ${r.hits} | ${r.withRing} | **${pct}%** | ${rpm} | ${r.maxRings} |`);
  }

  const tot = rows.reduce((a, r) => a + r.hits, 0);
  const totImp = rows.reduce((a, r) => a + r.withRing, 0);
  console.log(`\n  합계 — 타격 ${tot} 회 중 피격 링이 붙은 것 ${totImp} 회 ` +
              `(**${tot ? Math.round(totImp/tot*1000)/10 : 0}%**)`);
  console.log('  장면 간 부착률 최대 격차 : **' +
    (Math.max(...rows.map(r => r.hits ? r.withRing/r.hits : 0)) * 100 -
     Math.min(...rows.map(r => r.hits ? r.withRing/r.hits : 0)) * 100).toFixed(1) + '%p**');
  console.log('  링 배열 최대 : ' + Math.max(...rows.map(r => r.maxRings)) + ' (RING_CAP 44)');
  console.log('\n  [pageerror] ' + err + '건');

  await b.close();
})();
