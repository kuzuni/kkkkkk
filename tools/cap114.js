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
  /* lead — 첫 장 전에 게임 시간을 이만큼 굴린다. 운석은 낙하 0.69s 가 전부 예고 구간이라
     앞 240ms 를 건너뛰어야 12장 안에 «예고 → 착탄 → 잔해» 가 고르게 담긴다 */
  { key:'boom',   skills:['meteor'],      dist:150, n:12, gap:80, cast:'meteor', recast:1400, crit:0, lead:240 },
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
      /* 게임 시간을 멈춰 굴리므로 인터벌이 아니라 «스텝마다» 손봐야 한다. __realStep 을 감싸 둔다.
         ⚠ `skillCd = {}` 로 «비우면» 오히려 시전이 늦어진다 — 다음 프레임에 `skillCd[id] = rnd(0,0.4)`
         로 재초기화되기 때문(index.html 스킬 루프). 0 을 «넣어야» 즉시 시전된다 */
      window.__capT = 0;
      window.__capRecast = sc.recast/1000;
      window.__capWrap = (dt) => {
        enemies.forEach(e => { e.hp = e.max = 1e12; e.slow = 0; });
        window.__capT += dt;
        if (window.__capT >= window.__capRecast) { window.__capT = 0; S.eqSkill.forEach(id => { skillCd[id] = 0; }); }
      };
      /* 트리거 — 첫 장이 «시전 직후» 가 되게 여기서 한 번 직접 쏜다 */
      if (SK[sc.cast]) castSkill(SK[sc.cast]);
    }, sc);
    await p.waitForTimeout(40);
    /* ★ 프레임 간격을 «벽시계» 로 재면 스크린샷 지연(1080×2280 한 장에 150~400ms)이 그대로 더해져
       실제 표본 간격이 80ms 가 아니라 300ms 안팎이 된다 — 4회차까지 비평가들이 «연출이 1프레임만 보인다»
       고 한 것의 상당 부분이 이 과소표집이었다(운석 낙하가 6,190px/s 로 측정된 것도 같은 이유).
       그래서 캡처 동안에는 **게임 시간을 멈추고**(step 을 무해한 함수로 바꾼다) 프레임마다
       «정확히 gap ms 만큼» 손으로 굴린다. 스크린샷이 얼마나 걸리든 표본 간격은 정확히 80ms 다. */
    await p.evaluate(() => {
      const real = step;
      window.__realStepRaw = real;
      window.__realStep = (dt) => { window.__capWrap(dt); real(dt); };
      step = () => {};
    });
    const SUB = Math.round(sc.gap/1000 * 60);            /* 80ms = 60fps 5스텝 */
    if (sc.lead) await p.evaluate((n) => { for (let k = 0; k < n; k++) window.__realStep(1/60); },
                                  Math.round(sc.lead/1000 * 60));
    const st = [];
    for (let i = 1; i <= sc.n; i++) {
      if (i > 1) await p.evaluate((n) => {
        for (let k = 0; k < n; k++) window.__realStep(1/60);
      }, SUB);
      await p.screenshot({ path: path.join(OUT, '114-r' + R + '-' + sc.key + '-' + i + '.png') });
      /* «그 프레임에 연출이 실제로 있었는가» 를 픽셀이 아니라 상태로 남긴다 —
         비평가가 «무연출» 이라고 한 프레임이 정말 빈 프레임인지, 작아서 못 본 것인지 구분된다 */
      st.push(await p.evaluate(() => rings.length + 'r/' + parts.length + 'p/' + shots.length +
                                     's/' + bolts.length + 'b/' + booms.length + 'x'));
    }
    await p.evaluate(() => { step = window.__realStepRaw || window.__realStep; });   /* 게임 시간 재개 */
    console.log('    상태: ' + st.join(' | '));

    console.log('  ' + sc.key + ' — ' + sc.n + '장');
  }
  await b.close();
  console.log('CAP114 r' + R + ' 완료 → docs/review/114-r' + R + '-*.png');
})();
