/* 작업 114 연속 프레임 캡처 — «잔상 · 임팩트 · 폭발» 3장면 × 12프레임(80ms 간격)
   ROUTINE [3]-(다) 연출 검증용. 실행: node tools/cap114.js <회차>
   결과: docs/review/114-r<회차>-<장면>-<n>.png  (1080×2280)

   장면
     trail  — 표창 난사 + 얼음창(등급 낮은 투사체)이 날아가는 동안: 잔상이 보이는가
     impact — 검기가 코앞의 적을 연타: 방향성 스파크 + 플래시 링 + 치명타 숫자 팝
     boom   — 운석 낙하 → 착탄(예고 링 → 충격파 2단 → 연쇄 폭발 → 파편)
     bolt   — 연쇄 번개(가지 + 잔광)
*/
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const R = process.argv[2] || '1';
const OUT = path.resolve(__dirname, '..', 'docs', 'review');

const SCENES = [
  { key:'trail',  skills:['shuri','ice'],  dist:420, n:8,  gap:80,  pre:0 },
  { key:'impact', skills:['slash'],        dist:90,  n:8,  gap:80,  pre:0 },
  { key:'boom',   skills:['meteor'],       dist:150, n:12, gap:80,  pre:0 },
  { key:'bolt',   skills:['bolt'],         dist:220, n:8,  gap:80,  pre:0 }
];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('  [pageerror] ' + e));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);

  for (const sc of SCENES) {
    await p.evaluate((sc) => {
      /* 팝업·패널을 전부 닫고 전투 화면만 남긴다 */
      if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
      document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));
      sbufClear();
      S.own = {}; sc.skills.forEach(id => S.own[id] = { n:0, l:1 });
      S.eqSkill = sc.skills.slice();
      S.opt.shake = true;
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
      /* 적이 죽어 장면이 무너지지 않게 매 프레임 체력을 되돌린다 */
      window.__cap114 = setInterval(() => enemies.forEach(e => { e.hp = e.max = 1e12; }), 16);
    }, sc);
    await p.waitForTimeout(220);
    for (let i = 1; i <= sc.n; i++) {
      await p.screenshot({ path: path.join(OUT, '114-r' + R + '-' + sc.key + '-' + i + '.png') });
      await p.waitForTimeout(sc.gap);
    }
    await p.evaluate(() => { clearInterval(window.__cap114); });
    console.log('  ' + sc.key + ' — ' + sc.n + '장');
  }
  await b.close();
  console.log('CAP114 r' + R + ' 완료 → docs/review/114-r' + R + '-*.png');
})();
