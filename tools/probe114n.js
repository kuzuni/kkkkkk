/* 작업 114 — 19회차 프로브: **치명타 표식이 타격마다 있다 없다 하지 않는가**
 *
 * BC[8]·BD[12] 2인 공통(r18 채점):
 *   «같은 스킬 두 치명타의 링 구성이 다르다» — 타격1 은 2겹(안 Ø45.5→63.5 / 바 Ø69.5→98),
 *   타격2 는 **1겹(Ø37→54)** 뿐인데 숫자는 둘 다 주황 치명타(BC 실측).
 *   BD[12] 도 같은 것을 «같은 의미에 두 어휘» 로 적었다.
 *
 * 원인은 `hitRing()` 의 겹침 억제였다. 치명타율이 95% 라도 **첫 타가 5% 비치명**이면 비치명 링
 * 1겹이 깔리고, 뒤이은 치명타는 억제에 걸려 그냥 `return` 하므로 **바깥 링을 영영 못 얹는다** —
 * 숫자만 치명타가 된다. 억제 자체는 옳으므로(연타가 링을 쌓으면 안 읽힌다) **승격만 허용**했다.
 *
 * ── 무엇을 재는가 ─────────────────────────────────────────────
 * 억제 경로를 «확률에 맡기지 않고» 직접 만든다: 같은 적을 **비치명 → 치명타** 순으로 때린다.
 * 그 적 위에 남는 `imp` 링이 몇 겹인지, 두 겹의 반경 비가 7회차가 고정한 IMP_K 인지 본다.
 *
 * ── 합격선 ───────────────────────────────────────────────────
 *   A. «비치명 뒤 치명타» 에 링이 **2겹**이다 (수정 전에는 1겹 = 결함)
 *   B. 두 겹의 반경 비가 IMP_K 로 고정 — 전 구간 편차 ≤ 0.02 (7회차가 잡은 위상 일치)
 *   C. 연타가 링을 **쌓지 않는다** — 같은 적 위 imp 링 ≤ 2겹 (10회차 AK 가 잡은 것이 안 풀렸는가)
 *   D. «치명타 뒤 비치명» 은 강등되지 않는다 (승격은 단방향)
 *
 * 실행: node tools/probe114n.js
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

    function board() {
      sbufClear();
      skillCd = {}; shots.length = 0; rings.length = 0; parts.length = 0; nums.length = 0;
      enemies.length = 0; spawnQ.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 9999;
      makeEnemy('zombie');
      const e = enemies[0];
      e.born = 1; e.hp = e.max = 1e12; e.x = player.x + 95; e.y = player.y;
      return e;
    }
    /* 그 적 위에 남아 있는 피격 링만 고른다 */
    const on = (e) => rings.filter(r => r.imp && Math.hypot(r.x - e.x, r.y - (e.y - e.r)) < 45);

    const out = { err: [] };
    try {
      /* ── A/B: «비치명 → 치명타» (BC[8] 이 잡은 바로 그 순서) ── */
      let e = board();
      hitRing(e.x, e.y - e.r, 0, e, e.r);          /* 첫 타 = 비치명 */
      step(1 / 60); step(1 / 60);
      hitRing(e.x, e.y - e.r, 1, e, e.r);          /* 두 번째 = 치명타 */
      let g = on(e);
      out.upgrade = g.length;
      /* 두 겹의 반경 비를 수명 전 구간에서 본다 */
      const ratios = [];
      for (let i = 0; i < 5; i++) {
        const cur = on(e);
        if (cur.length === 2) {
          const rr = cur.map(r => {
            const f = clamp(r.t / r.life, 0, 1);
            return r.r0 + (r.r1 - r.r0) * f;
          }).sort((a, b) => a - b);
          if (rr[0] > 0.01) ratios.push(rr[1] / rr[0]);
        }
        step(0.08);
      }
      out.ratios = ratios.map(v => +v.toFixed(4));
      out.impK = IMP_K;

      /* ── C: 연타가 쌓이지 않는가 (10회차 AK) ── */
      e = board();
      let maxLayer = 0;
      for (let i = 0; i < 8; i++) {
        hitRing(e.x, e.y - e.r, 1, e, e.r);
        maxLayer = Math.max(maxLayer, on(e).length);
        step(0.11);                                  /* 검기 연타 간격 */
      }
      out.maxLayer = maxLayer;

      /* ── D: «치명타 → 비치명» 은 강등되지 않는다 ── */
      e = board();
      hitRing(e.x, e.y - e.r, 1, e, e.r);
      step(1 / 60); step(1 / 60);
      hitRing(e.x, e.y - e.r, 0, e, e.r);
      out.noDown = on(e).length;
    } catch (err) { out.err.push(String(err)); }
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
  o.err.forEach(e => errs.push(e));

  const rs = o.ratios || [];
  const spread = rs.length ? Math.max(...rs) - Math.min(...rs) : 999;

  console.log('\n== 19회차 프로브 — 치명타 링 구성의 일관성 ==');
  console.log('  «비치명 → 치명타» 뒤 그 적 위의 피격 링 겹수 : ' + o.upgrade + ' (수정 전 = 1)');
  console.log('  두 겹의 반경 비(수명 전 구간)               : ' + (rs.length ? rs.join(' · ') : '표본 없음') + '  (IMP_K = ' + o.impK + ')');
  console.log('  치명타 8연타 뒤 최대 겹수                   : ' + o.maxLayer);
  console.log('  «치명타 → 비치명» 뒤 겹수                   : ' + o.noDown);

  const T = [];
  const ok = (c, s) => { T.push(c); console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + s); };
  console.log('');
  ok(o.upgrade === 2, 'A. «비치명 뒤 치명타» 가 2겹이다 — ' + o.upgrade + '겹 (BC[8]·BD[12] 가 잡은 1겹 결함)');
  ok(rs.length >= 2, '표본이 잡혔는가 — 반경 비 표본 ' + rs.length + '개 (0 이면 게이트가 못 보고 있다)');
  ok(spread <= 0.02, 'B. 반경 비가 전 구간 고정 — 편차 ' + spread.toFixed(4) + ' (상한 0.02 · 7회차 위상 일치)');
  ok(o.maxLayer <= 2, 'C. 연타가 링을 안 쌓는다 — 최대 ' + o.maxLayer + '겹 (상한 2 · 10회차 AK)');
  ok(o.noDown === 2, 'D. 승격은 단방향 — «치명타 뒤 비치명» 이 ' + o.noDown + '겹으로 유지된다');
  ok(errs.length === 0, '콘솔/페이지 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));

  const pass = T.every(Boolean);
  console.log('\nPROBE114N ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})();
