/* 작업 114 — 19회차 프로브: **연쇄 여진 링이 «맞은 적» 위에만, «바닥 타원» 으로 앉는가**
 *
 * 18회차 인수인계 1순위. BA[18]·BB[6] 이 **독립으로** 같은 것을 적었다:
 *   «예고 원 **밖**의 적에게 링이 뜨는데 그 적에는 데미지 숫자가 없다»
 *   (BA 실측 피해 반경의 **110.3%** · BB **116%**)
 * 그리고 BA[1]·BB[1] 은 그 링을 «적을 안 따라가는 피격 링» 으로 읽었다(세 회차 연속 오독).
 *
 * 원인은 두 가지가 겹친 것이다.
 *   ① 후보 조건이 `dx²+dy² < r*r*1.82` — 반지름으로 **1.35배**라 «맞지도 않은 적» 이 들어온다.
 *   ② 그 링이 **적 몸통 중심에 선 확장 «원»** 이라 피격 링과 자리·움직임·형태가 전부 같다.
 *      17회차가 선폭·불투명도(계층)로 갈랐지만 «적 위에 앉아 확장하는 원» 이라는 **의미론**은 못 갈랐다.
 *
 * 19회차의 처방 — **크기는 한 값도 안 깎는다. 자를 바꾸고, 자리와 형태를 바꾼다.**
 *   ① 후보 = `areaDamage` 와 **글자 그대로 같은 자**(`(r+e.r)²` · `born≥0.3`) → 후보 ≡ 피해 입은 적
 *   ② 링을 발밑(`e.y`)에 눕는 **바닥 타원**(`fl` → tele 계층)으로 내린다
 *
 * ── 합격선 ───────────────────────────────────────────────────
 *   A. 여진 링이 «피해를 안 입은 적» 위에 앉은 건수 = **0**
 *   B. 후보 집합 ≡ 피해 집합 (대칭차 0) — 빈 땅 연쇄(15회차 결함)도 안 돌아왔는가
 *   C. 여진 링 전부 `fl=1` (바닥 타원 = tele 계층)
 *   D. 링 중심 y = 적 **발밑**(e.y) — 몸통 중심(e.y−e.r)과 e.r 만큼 갈렸는가
 *   E. **크기 불변** — 링 최대 반경 = r×0.45 = Ø117 (운석 경로. 18회차와 같은 값)
 *
 * 실행: node tools/probe114k.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

async function run(p) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);
  return await p.evaluate(async () => {
    if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
    document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));

    const out = { runs: [], err: [] };
    const R = 130;                       /* 운석 폭발 반경 — verify114 [7] 이 불변으로 잠근 값 */

    for (let trial = 0; trial < 12; trial++) {
      /* 판을 깨끗이 세운다 */
      sbufClear();
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 9999;
      S.lv.crit = 0;

      /* 적을 «피해 반경 안 · 경계 · 밖» 에 고루 세운다.
         옛 조건(반지름 1.35배 = 175.5)과 새 조건(r+e.r ≈ 147)이 갈리는 구간이 핵심이다 */
      const ds = [60, 110, 140, 152, 165, 200];
      for (let i = 0; i < ds.length; i++) makeEnemy('zombie');
      const bx = player.x, by = player.y;
      enemies.forEach((e, i) => {
        e.born = 1; e.hp = e.max = 1e12;
        const a = i * 6.283 / ds.length + trial * 0.21;
        e.x = bx + Math.cos(a) * ds[i];
        e.y = by + Math.sin(a) * ds[i];
      });

      /* 폭발 «전» 체력을 떠 둔다 — 피해 집합의 정답은 hp 변화다(조건식을 베끼면 순환 논증) */
      const hp0 = enemies.map(e => e.hp);
      areaDamage(bx, by, R, 100, '#ffb45c');
      const hurt = new Set();
      enemies.forEach((e, i) => { if (e.hp < hp0[i]) hurt.add(e); });
      /* ⚠ 자리는 **여기서** 뜬다. `areaDamage` → `hitEnemy` 가 넉백으로 적을 밀기 때문에
         폭발 «전» 좌표로 견주면 링이 «빈 땅» 으로 잘못 잡힌다(게이트의 결함이지 코드의 결함이 아니다).
         실제 순서도 «피해 → 넉백 → 여진» 이므로 여진이 보는 자리는 넉백 «후» 다. */
      const before = enemies.map(e => ({ e, x: e.x, y: e.y, r: e.r }));
      /* 운석 착탄 경로와 **같은 인자**로 여진을 부른다(index.html 의 meteor 분기와 1:1) */
      chainBoomFx(bx, by, R, '#ffb45c', [0.42, 0.78], 0.45, 0.14);

      /* 연쇄 여진 링만 고른다 — `bn`(연쇄 파티클 스펙)이 실린 링이 그것이다 */
      const ch = rings.filter(r => r.bn);
      const rec = { hurt: hurt.size, chain: ch.length, onClean: 0, onHurt: 0, empty: 0, flat: 0, maxR: 0, dy: [] };

      for (const r of ch) {
        rec.maxR = Math.max(rec.maxR, r.r1);
        if (r.fl) rec.flat++;
        /* 이 링이 어느 적 위에 앉았는가 — 발밑 기준 최근접 */
        let best = null, bd = 1e9;
        for (const s of before) {
          const d = Math.hypot(r.x - s.x, r.y - s.y);
          if (d < bd) { bd = d; best = s; }
        }
        if (bd > 8) { rec.empty++; continue; }          /* 빈 땅에 떨어진 링 */
        /* 몸통 중심(e.y − e.r) 대비 세로 오프셋 — +e.r 이면 발밑(e.y)에 앉은 것이다 */
        if (hurt.has(best.e)) { rec.onHurt++; rec.dy.push(r.y - (best.y - best.r)); }
        else rec.onClean++;
      }
      out.runs.push(rec);
    }
    return out;
  });
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  const o = await run(p);
  await b.close();

  const sum = (k) => o.runs.reduce((a, r) => a + r[k], 0);
  const onClean = sum('onClean'), onHurt = sum('onHurt'), empty = sum('empty');
  const chain = sum('chain'), flat = sum('flat');
  const maxR = Math.max(...o.runs.map(r => r.maxR));
  const dys = o.runs.flatMap(r => r.dy);
  const dyMin = dys.length ? Math.min(...dys) : 0, dyMax = dys.length ? Math.max(...dys) : 0;

  console.log('\n== 19회차 프로브 — 연쇄 여진 링 (12회 시전 · 적 6기: 60/110/140/152/165/200 게임px) ==');
  console.log('  피해 입은 적 총 ' + sum('hurt') + ' · 여진 링 총 ' + chain);
  console.log('  링이 앉은 자리 — 맞은 적 ' + onHurt + ' · **안 맞은 적 ' + onClean + '** · 빈 땅 ' + empty);
  console.log('  바닥 타원(fl=1) ' + flat + '/' + chain);
  console.log('  링 중심 − 몸통 중심 세로 오프셋 ' + dyMin.toFixed(2) + ' ~ ' + dyMax.toFixed(2) + ' 게임px (적 e.r 만큼이면 발밑)');
  console.log('  링 최대 반경 ' + maxR.toFixed(1) + ' 게임px');

  const T = [];
  const ok = (c, s) => { T.push(c); console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + s); };
  console.log('');
  ok(chain > 0, '표본이 잡혔는가 — 여진 링 ' + chain + '개 (0 이면 게이트가 못 보고 있다)');
  ok(onClean === 0, 'A. «안 맞은 적» 위에 앉은 링 ' + onClean + '건 (상한 0 — BA[18] 110.3% · BB[6] 116%)');
  ok(empty === 0, 'B. 빈 땅에 떨어진 링 ' + empty + '건 (상한 0 — 15회차 AU#5·AV[10] 결함이 안 돌아왔는가)');
  ok(flat === chain, 'C. 바닥 타원 ' + flat + '/' + chain + ' (전부 fl=1 = tele 계층)');
  ok(dys.length > 0 && dyMin > 6, 'D. 발밑에 앉는가 — 몸통 중심 대비 +' + dyMin.toFixed(2) + ' 게임px (하한 6 = 적 반지름)');
  ok(Math.abs(maxR - 130 * 0.45) < 0.6, 'E. 크기 불변 — 최대 반경 ' + maxR.toFixed(1) + ' = 130×0.45 = Ø117 (깎지 않았다)');
  ok(errs.length === 0, '콘솔/페이지 에러 ' + errs.length + '건');

  const pass = T.every(Boolean);
  console.log('\nPROBE114K ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})();
