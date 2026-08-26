/* 작업 114 — 19회차 프로브: **운석 낙하 예고 링**을 80ms 그리드에서 실측한다
 *
 * 18회차 인수인계 2순위. BA[2][7]·BB[2][3] 이 **독립으로 · 두 회차째** 같은 것을 적었다:
 *   ㄱ. 수축 «안쪽» 링이 **직경 94~96 을 남기고** 착탄 **80ms 전에** 사라진다
 *      → 처방: 착탄 프레임에 Ø0 으로 수렴 (BB «프레임당 ΔØ −24±6 로 균등화» · BA «−34 등속»)
 *   ㄴ. «바깥» 링이 480ms 동안 Δ **0.19~1.2%** 로 완전 정지
 *      → 처방: 알파 램프(BB «0.55 → 1.00») 또는 두께 펄스
 *
 * ── 무엇을 재는가 ─────────────────────────────────────────────
 * 수식을 베껴 계산하면 순환 논증이다. `CanvasRenderingContext2D` 의 `arc`·`stroke` 를 감싸
 * **실제로 그려진 값**(반경 · globalAlpha · lineWidth)을 받아 적는다. 예고 링은 착탄 지점
 * (b.tx, b.ty) 을 중심으로 그리는 두 개의 arc 이므로 중심으로 골라낸다(바깥 = 큰 쪽).
 * 표본 간격은 비평가가 보는 그리드와 같은 **80ms** 다.
 *
 * ── 합격선 ───────────────────────────────────────────────────
 *   A. 마지막 가시 프레임의 안쪽 Ø ≤ 20 게임px  (BA·BB 실측 94~96 → «착탄에 0»)
 *   B. 안쪽 ΔØ 가 «절벽» 이 아니다 — 프레임당 낙차 최대 ≤ 55 게임px
 *   C. 안쪽이 **가속**한다 — 마지막 ΔØ ≥ 첫 ΔØ (12회차 AO②·AP 가 요구한 것. p=1.8 감속 기각 근거)
 *   D. 바깥 링 알파 램프 폭 ≥ 1.6배 (종전 0.52→0.82 = 1.58배가 «정지» 로 읽혔다)
 *   E. 바깥 링 반경 불변 (6회차 R③ «바깥 원 = 실제 피해 반경» — 줄이면 사거리를 거짓말한다)
 *
 * 실행: node tools/probe114l.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const GRID = 80 / 1000;

async function run(p) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);
  return await p.evaluate(async ({ GRID }) => {
    if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
    document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));

    /* ---- 그리기 후크: 실제로 그려진 arc 를 받아 적는다 ---- */
    const C = CanvasRenderingContext2D.prototype;
    const arc0 = C.arc, stroke0 = C.stroke;
    let rec = null, pend = null;
    C.arc = function (x, y, r) { pend = { x, y, r }; return arc0.apply(this, arguments); };
    C.stroke = function () {
      if (rec && pend) rec.push({ x: pend.x, y: pend.y, r: pend.r, a: this.globalAlpha, lw: this.lineWidth });
      pend = null;
      return stroke0.apply(this, arguments);
    };

    const out = { frames: [], err: [] };
    try {
      sbufClear();
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
      S.own = { meteor: { n: 0, l: 1 } }; S.eqSkill = ['meteor']; S.lv.crit = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 9999;
      player.hp = stat.maxHp;
      makeEnemy('zombie');
      const e = enemies[0];
      e.born = 1; e.hp = e.max = 1e12; e.x = player.x + 150; e.y = player.y;

      castSkill(SKILLS.find(s => s.id === 'meteor'));
      const b = shots.find(s => s.k === 'meteor');
      if (!b) { out.err.push('운석이 안 생겼다'); return out; }
      const tx = b.tx, ty = b.ty, R = b.r, fall = b.fl0;
      out.meta = { R, fall, v0: b.vy, gy: b.gy };

      /* 80ms 그리드로 굴리며 «그 프레임에 그려진» 예고 링을 받아 적는다 */
      for (let i = 0; i < 14; i++) {
        step(GRID);
        rec = [];
        draw();
        const mine = rec.filter(q => Math.abs(q.x - tx) < 0.6 && Math.abs(q.y - ty) < 0.6 && q.r > 0.5);
        rec = null;
        if (!shots.includes(b)) break;                    /* 착탄 — 여기서 끝 */
        if (!mine.length) { out.frames.push(null); continue; }
        mine.sort((p1, p2) => p2.r - p1.r);
        const outer = mine[0], inner = mine.length > 1 ? mine[mine.length - 1] : null;
        out.frames.push({
          t: +(i * GRID * 1000).toFixed(0),
          oR: outer.r, oA: outer.a, oW: outer.lw,
          iD: inner ? inner.r * 2 : 0,
        });
      }
    } catch (err) { out.err.push(String(err)); }
    C.arc = arc0; C.stroke = stroke0;
    return out;
  }, { GRID });
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

  const F = o.frames.filter(Boolean);
  console.log('\n== 19회차 프로브 — 운석 낙하 예고 링 (80ms 그리드 = 비평가가 보는 그리드) ==');
  if (o.meta) console.log('  피해 반경 ' + o.meta.R + ' · 낙하 거리 ' + Math.round(o.meta.fall) + ' · v0 ' + Math.round(o.meta.v0) + ' · a ' + Math.round(o.meta.gy));
  console.log('  t(ms) | 안쪽 Ø  | ΔØ     | 바깥 반경 | 바깥 α | 바깥 선폭');
  let prev = null;
  const dd = [];
  for (const f of F) {
    const d = prev === null ? null : f.iD - prev;
    if (d !== null) dd.push(d);
    console.log('  ' + String(f.t).padStart(5) + ' | ' + f.iD.toFixed(1).padStart(6) + ' | ' +
      (d === null ? '   —  ' : d.toFixed(1).padStart(6)) + ' | ' +
      f.oR.toFixed(1).padStart(9) + ' | ' + f.oA.toFixed(3).padStart(6) + ' | ' + f.oW.toFixed(2).padStart(9));
    prev = f.iD;
  }

  const lastD = F.length ? F[F.length - 1].iD : 999;
  const maxDrop = dd.length ? Math.max(...dd.map(d => -d)) : 999;
  const oA = F.map(f => f.oA), oR = F.map(f => f.oR);
  const ramp = oA.length ? Math.max(...oA) / Math.min(...oA) : 0;
  const rSpread = oR.length ? Math.max(...oR) - Math.min(...oR) : 999;

  const T = [];
  const ok = (c, s) => { T.push(c); console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + s); };
  console.log('');
  ok(F.length >= 5, '표본이 잡혔는가 — 예고 프레임 ' + F.length + '장 (0 이면 게이트가 못 보고 있다)');
  ok(lastD <= 20, 'A. 마지막 가시 프레임 안쪽 Ø ' + lastD.toFixed(1) + ' (상한 20 — BA·BB 실측 94~96)');
  ok(maxDrop <= 55, 'B. 안쪽 프레임당 최대 낙차 Ø' + maxDrop.toFixed(1) + ' (상한 55 — «절벽» 이 아닌가)');
  ok(dd.length >= 2 && (-dd[dd.length - 1]) >= (-dd[0]) - 0.01,
    'C. 착탄으로 갈수록 가속 — 첫 ΔØ ' + dd[0].toFixed(1) + ' → 마지막 ΔØ ' + dd[dd.length - 1].toFixed(1) + ' (12회차 AO②·AP)');
  ok(ramp >= 1.6, 'D. 바깥 알파 램프 ' + ramp.toFixed(2) + '배 (하한 1.6 — 종전 1.58 이 «정지» 로 읽혔다)');
  ok(rSpread < 0.6, 'E. 바깥 반경 불변 — 편차 ' + rSpread.toFixed(2) + ' 게임px (6회차 R③ 피해 반경 고정)');
  ok(errs.length === 0, '콘솔/페이지 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));

  const pass = T.every(Boolean);
  console.log('\nPROBE114L ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})();
