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
  /* 각 장면은 «트리거 직후» 부터 80ms 간격으로 찍는다(ROUTINE [3]-(다)).
     1회차 비평 공통 지적: 자동 시전에 맡겼더니 8프레임 중 4~8장이 «연출 0» 이었다 —
     쿨을 계속 비워 연출이 끊기지 않게 하고, 첫 장은 강제 시전 직후에 찍는다. */
  { key:'trail',  skills:['shuri','ice'], dist:430, n:8,  gap:80, cast:'shuri', recast:200, crit:0 },
  { key:'impact', skills:['slash'],       dist:95,  n:8,  gap:80, cast:'slash', recast:110, crit:1 },
  /* 운석은 «한 발의 전 과정»(예고 0.69s → 착탄 → 잔해)을 봐야 한다. 재시전을 1.4s 로 벌려
     두 발이 겹치지 않게 한다 — 2회차 비평가가 «헤드가 450px 역주행» 으로 읽은 것이 겹친 두 발이었다 */
  { key:'boom',   skills:['meteor'],      dist:150, n:12, gap:80, cast:'meteor', recast:1400, crit:0 },
  { key:'bolt',   skills:['bolt'],        dist:240, n:8,  gap:80, cast:'bolt',  recast:200, crit:0 }
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
      /* 치명타 장면은 «확률» 에 맡기지 않는다 — 치명타 업그레이드 레벨을 올려 상한(95%)까지 띄운다.
         Math.random 을 고정하면 파티클 각도까지 한 방향으로 굳어 연출 자체가 달라지므로 쓰지 않는다 */
      S.lv.crit = sc.crit ? 400 : (S.lv.crit || 0);
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
      /* 적이 죽어 장면이 무너지지 않게 체력을 되돌리고, 쿨을 비워 연출이 끊기지 않게 한다 */
      window.__cap114 = setInterval(() => {
        enemies.forEach(e => { e.hp = e.max = 1e12; e.slow = 0; });
      }, 16);
      /* ⚠ `skillCd = {}` 로 «비우면» 오히려 시전이 늦어진다 — 다음 프레임에 `skillCd[id] = rnd(0,0.4)`
         로 재초기화되기 때문(index.html 스킬 루프). 0 을 «넣어야» 즉시 시전된다 */
      window.__cap114b = setInterval(() => { S.eqSkill.forEach(id => { skillCd[id] = 0; }); }, sc.recast);
      /* 트리거 — 첫 장이 «시전 직후» 가 되게 여기서 한 번 직접 쏜다 */
      if (SK[sc.cast]) castSkill(SK[sc.cast]);
    }, sc);
    await p.waitForTimeout(40);
    const st = [];
    for (let i = 1; i <= sc.n; i++) {
      await p.screenshot({ path: path.join(OUT, '114-r' + R + '-' + sc.key + '-' + i + '.png') });
      /* «그 프레임에 연출이 실제로 있었는가» 를 픽셀이 아니라 상태로 남긴다 —
         비평가가 «무연출» 이라고 한 프레임이 정말 빈 프레임인지, 작아서 못 본 것인지 구분된다 */
      st.push(await p.evaluate(() => rings.length + 'r/' + parts.length + 'p/' + shots.length +
                                     's/' + bolts.length + 'b/' + booms.length + 'x'));
      await p.waitForTimeout(sc.gap);
    }
    console.log('    상태: ' + st.join(' | '));
    await p.evaluate(() => { clearInterval(window.__cap114); clearInterval(window.__cap114b); });
    console.log('  ' + sc.key + ' — ' + sc.n + '장');
  }
  await b.close();
  console.log('CAP114 r' + R + ' 완료 → docs/review/114-r' + R + '-*.png');
})();
