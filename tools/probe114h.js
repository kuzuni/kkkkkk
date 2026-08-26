/* 작업 114 — 16회차 프로브: 화면에 뜨는 **링이 정말 «4종»인가**
 *
 * 16회차 비평가 두 사람이 독립으로 «피격 링이 장면마다 다르다» 를 ④ 의 1순위로 적었다.
 *   AW[10] 최대 지름 trail 51 · bolt 48 · impact 91.5 · boom 102.5 (2.14배)
 *   AX[11] 최대 지름 trail 48 · bolt 48 · impact 96 · boom 106 (2.2배), 수명도 160ms vs 400ms+
 * 두 사람의 **수치가 서로 거의 일치**하므로 «봤다» 는 사실은 의심할 게 없다.
 *
 * 그런데 15회차가 `hitRing()` 한 곳으로 링을 모았고 규격은 한 벌(ir 26 · 치명타 30)이다.
 * 그림에서 «4종» 이 나오는데 코드가 «1종» 이면, 둘 중 하나가 아니라 **둘 다 맞을 수** 있다 —
 * 화면에 뜨는 링이 «피격 링» 만이 아니기 때문이다(폭발 파문·연쇄 여진·치명타 2겹은 다른 것이다).
 * 비평가는 그림만 보므로 그 셋을 구분할 방법이 없다.
 *
 * 그래서 «몇 종인가» 를 그림이 아니라 **코드가 만든 링의 대장**으로 센다. 장면마다
 * `fxRing()`/`hitRing()` 을 가로채 (r0 → r1 · life · 두께 · imp 여부 · 치명타 여부)를 전부 적는다.
 *   → 진짜로 피격 링 규격이 갈렸으면 imp=1 인 링의 r1 이 장면마다 다르게 나온다(= 고칠 것이 있다).
 *   → 갈린 게 «피격 링 vs 파문» 이면 imp=1 은 한 벌이고 다른 종류가 섞여 있는 것이다
 *     (= 고칠 것은 크기가 아니라 **구분**이다. 같은 모양으로 다른 뜻을 말하는 게 ④ 감점의 실체다).
 *
 * 실행: node tools/probe114h.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* cap114.js 의 4장면과 같은 정의 — 채점본과 같은 조건에서 재야 의미가 있다 */
const SCENES = [
  { key: 'trail',  skills: ['shuri', 'ice'], dist: 210, crit: 0 },
  { key: 'impact', skills: ['slash'],        dist: 95,  crit: 1 },
  { key: 'boom',   skills: ['meteor'],       dist: 150, crit: 0 },
  { key: 'bolt',   skills: ['bolt'],         dist: 240, crit: 0 }
];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  let err = 0;
  p.on('pageerror', e => { err++; console.log('  [pageerror] ' + e); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1400);

  const all = {};
  for (const sc of SCENES) {
    all[sc.key] = await p.evaluate((sc) => {
      if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
      document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));
      S.own = {}; sc.skills.forEach(id => { if (SK[id]) S.own[id] = { n: 0, l: 1 }; });
      S.eqSkill = sc.skills.slice();
      S.opt.shake = false;
      S.lv.crit = sc.crit ? 400 : 0;
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 1e9;
      player.hp = stat.maxHp;
      for (let i = 0; i < 6; i++) makeEnemy('zombie');
      enemies.forEach((e, i) => {
        e.born = 1; e.hp = e.max = 1e12;
        const a = i * 6.283 / 6;
        e.x = player.x + Math.cos(a) * sc.dist; e.y = player.y + Math.sin(a) * sc.dist;
      });

      /* 링 대장 — 만들어지는 순간의 규격을 그대로 적는다. rings 배열을 나중에 훑으면
         이미 t 가 흘러 r0/r1 이 아니라 «현재 반경» 만 남으므로 생성 시점에 잡아야 한다 */
      const log = [];
      let inHit = 0;
      const realFxRing = fxRing, realHitRing = hitRing;
      hitRing = (x, y, crit) => { inHit = crit ? 2 : 1; const r = realHitRing(x, y, crit); inHit = 0; return r; };
      fxRing = (x, y, r1, col, life, w, r0, dl, nd) => {
        log.push({ r0: r0 || 2, r1, life: life || 0.25, w: w || 3,
                   imp: inHit ? 1 : 0, crit: inHit === 2 ? 1 : 0, dl: dl || 0 });
        return realFxRing(x, y, r1, col, life, w, r0, dl, nd);
      };

      S.eqSkill.forEach(id => { if (SK[id]) castSkill(SK[id]); });
      for (let i = 0; i < 150; i++) {          /* 2.5초 — 한 시전의 전 과정이 들어간다 */
        enemies.forEach(e => { e.hp = e.max = 1e12; e.slow = 0; });
        step(1 / 60);
      }
      fxRing = realFxRing; hitRing = realHitRing;

      /* 같은 규격끼리 묶는다 */
      const byKey = {};
      for (const r of log) {
        const k = `${r.imp ? (r.crit ? '피격(치명)' : '피격') : '그 밖'}|Ø${(r.r0 * 2).toFixed(0)}→Ø${(r.r1 * 2).toFixed(0)}|${(r.life * 1000).toFixed(0)}ms|w${r.w}`;
        byKey[k] = (byKey[k] || 0) + 1;
      }
      return byKey;
    }, sc);
  }

  console.log('\n== 장면별로 «만들어진» 링의 규격 대장 (그림이 아니라 코드가 만든 것) ==');
  const impSpecs = new Set(), otherSpecs = new Set();
  for (const k of Object.keys(all)) {
    console.log(`\n[${k}]`);
    const rows = Object.entries(all[k]).sort((a, c) => c[1] - a[1]);
    if (!rows.length) { console.log('  (링 없음)'); continue; }
    for (const [spec, n] of rows) {
      console.log(`  ${String(n).padStart(3)}회  ${spec}`);
      const body = spec.split('|').slice(1).join('|');
      if (spec.startsWith('피격')) impSpecs.add(spec.split('|')[0] + '|' + body);
      else otherSpecs.add(body);
    }
  }

  console.log('\n== 판정 ==');
  console.log(`  «피격 링(imp)» 규격 종류 : ${impSpecs.size}종`);
  [...impSpecs].forEach(s => console.log(`      ${s}`));
  console.log(`  그 밖의 링(파문·여진 등) : ${otherSpecs.size}종`);
  [...otherSpecs].forEach(s => console.log(`      ${s}`));
  const onlyCritSplit = impSpecs.size <= 2;
  console.log(`\n  → 피격 링이 장면마다 갈렸는가 : ${onlyCritSplit ? 'NO — 한 벌이다(일반/치명 2종은 설계)' : 'YES — 규격이 갈렸다'}`);
  console.log(`  → 비평가가 «4종» 으로 읽은 것은 ${onlyCritSplit ? '피격 링과 **다른 종류의 링**이 같은 모양이기 때문이다' : '실제 규격 차이다'}`);
  console.log(`콘솔 에러 ${err}건`);
  await b.close();
  process.exit(err ? 1 : 0);
})();
