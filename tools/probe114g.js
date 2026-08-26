/* 작업 114 — 16회차 프로브: **사거리 캡을 넣어도 되는가 / «툭 잘림» 이 없어졌는가**
 *
 * 배경 — 15회차 AU#4 · AV[15] 가 **공통·실측 일치**로 «직선 투사체가 교전 거리 210 을 +29~36% 넘겨
 * 논리 뷰포트(540×998) 가장자리에서 하드 클리핑된다» 를 짚었다(코드상 최대 비행 `1.4s × 430` = 602
 * 게임px = 선언 사거리의 2.9배). 15회차는 **«이건 연출이 아니라 얼마나 멀리까지 맞히는가라 밸런스가
 * 걸린다»** 며 손대지 않고 16회차 1순위로 넘겼고, «`sim112` 계열로 캡 전/후 DPS 를 재고 넣어라» 고 지시했다.
 *
 * ★ 처음에 «캡 켠 판 / 끈 판의 총 DPS 를 비교» 로 짰다가 버렸다 — **못 쓰는 계측이었다.**
 *   시드를 고정해도 첫 킬 한 번에 스폰·표적·스테이지가 갈려 두 판이 즉시 다른 전투가 된다.
 *   실측 시드 3개에서 Δ 가 **+27.3% / −19.5% / −3.4%(편차 폭 46.8%p)** — 평균이 ±1% 로 나와도
 *   그건 «영향이 없다» 가 아니라 **«이 계측으로는 아무것도 말할 수 없다»** 다. 그 판정을 근거로
 *   밸런스 불변을 주장하면 노이즈에 도장을 찍는 것이다.
 *
 * 그래서 «두 판을 비교» 하지 않고 **캡이 잘라 내는 몫을 직접 잰다.** 캡을 끈 채로 한 판만 굴리고,
 * 명중한 순간의 «그 발이 원점에서 날아온 거리» 를 피해량과 함께 히스토그램으로 쌓는다.
 *   → **비행 260 게임px 을 넘겨서 들어온 피해의 비율**이 곧 캡이 없앨 피해다. 노이즈가 아니라 몫이다.
 *   → 같은 판에서 «캡이 실제로 자르는 발수»(수명 만료 전에 260 을 넘긴 발)도 같이 센다.
 *
 * ②로 «적이 붙어 있지 않은» 최악을 따로 본다 — 적을 고정 거리 링에 세우고 죽지 않게 해서
 * 거리별 명중률을 잰다(전투가 갈리지 않으므로 이쪽은 판 간 비교가 성립한다).
 *
 * 실행: node tools/probe114g.js [초]
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SECS  = parseFloat(process.argv[2] || '120');
const STEPS = Math.round(SECS * 60);
const CAP   = 260;

/* ── ① 캡을 끈 채 정상 전투를 굴리고, «명중 시점의 비행 거리» 별 피해를 쌓는다 ── */
async function histogram(p, seed, steps) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  return await p.evaluate(({ seed, steps, cap }) => {
    let s = seed >>> 0;
    Math.random = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    /* 캡은 **index.html 에 넣지 않았다**(이 프로브가 넣지 말라고 답했다). 그래서 «캡 없음» 은
       그냥 현재 빌드다 — 되돌릴 상수가 없다. 캡이 있었다면 없앴을 몫을 아래에서 거리로 가려낸다 */

    S.own = {}; ['shuri', 'ice', 'slash', 'boom'].forEach(id => { if (SK[id]) S.own[id] = { n: 0, l: 1 }; });
    S.eqSkill = Object.keys(S.own);
    S.opt.shake = false;
    skillCd = {}; shots.length = 0; enemies.length = 0; spawnQ.length = 0;
    player.x = WORLD.w / 2; player.y = WORLD.h / 2;
    player.hp = stat.maxHp; player.dead = 0; player.inv = 1e9;

    /* 명중을 «어느 발이 냈는지» 알아야 비행 거리를 붙일 수 있다. 투사체 명중은 shots 루프가
       hitEnemy 를 부르는 순간뿐이므로, 그 직전에 «지금 처리 중인 발» 을 남기게 감싼다.
       투사체가 아닌 경로(장판·번개·즉발)는 cur 가 비어 있어 «근접/기타» 로 분류된다. */
    const BINS = [0, 60, 120, 180, 240, 260, 320, 400, 500, 620];
    const dmgBin = new Array(BINS.length).fill(0);
    let dmgProj = 0, dmgOther = 0, hitsProj = 0, over = 0, overHits = 0;

    const realHit = hitEnemy;
    hitEnemy = (e, dmg, crit, kx, ky) => {
      const b = window.__curShot;
      if (b && b.x0 !== undefined) {
        const d = Math.hypot(b.x - b.x0, b.y - b.y0);
        let k = 0; while (k + 1 < BINS.length && d >= BINS[k + 1]) k++;
        dmgBin[k] += dmg; dmgProj += dmg; hitsProj++;
        if (d > cap) { over += dmg; overHits++; }
      } else dmgOther += dmg;
      return realHit(e, dmg, crit, kx, ky);
    };

    /* shots 루프 안에서 «현재 발» 을 노출한다 — 배열 순회 순서가 곧 처리 순서라
       각 스텝에서 발마다 표시했다가 지우면 hitEnemy 가 자기 발을 정확히 본다.
       (step() 내부를 못 고치므로 발 객체의 좌표 접근을 훔치는 대신, 스텝을 발 단위로 쪼개지 않고
        «명중 직전 프레임의 발» 을 x 게터로 표시한다) */
    let capKill = 0, lifeKill = 0, born = 0;
    const seen = new WeakSet();
    for (let i = 0; i < steps; i++) {
      for (const b of shots) {
        if (seen.has(b)) continue;
        seen.add(b); born++;
        /* 발마다 «내가 지금 판정 중» 을 알리는 훅 — hit 배열에 적이 들어가는 순간이 명중이다 */
        let arr = b.hit;
        Object.defineProperty(b, 'hit', {
          configurable: true,
          get() { window.__curShot = b; return arr; },
          set(v) { arr = v; }
        });
      }
      const before = shots.slice();
      window.__curShot = null;
      step(1 / 60);
      window.__curShot = null;
      for (const b of before) {
        if (shots.indexOf(b) >= 0 || b.k === 'meteor' || b.k === 'boomer') continue;
        if (b.x0 === undefined) continue;
        const d = Math.hypot(b.x - b.x0, b.y - b.y0);
        if (d > cap) capKill++; else lifeKill++;
      }
      player.hp = stat.maxHp; player.inv = 1e9;
    }
    return { BINS, dmgBin, dmgProj, dmgOther, hitsProj, over, overHits,
             capKill, lifeKill, born, stage: S.stage };
  }, { seed, steps, cap: CAP });
}

/* ── ② 최악의 경우 — 적을 고정 거리 링에 세우고 죽지 않게 해서 거리별 명중률을 잰다 ── */
async function ring(p, dist, cap, steps) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  return await p.evaluate(({ dist, cap, steps }) => {
    let s = 12345;
    Math.random = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    S.own = {}; ['shuri', 'ice', 'slash', 'boom'].forEach(id => { if (SK[id]) S.own[id] = { n: 0, l: 1 }; });
    S.eqSkill = Object.keys(S.own);
    S.opt.shake = false;
    skillCd = {}; shots.length = 0; enemies.length = 0; spawnQ.length = 0;
    player.x = WORLD.w / 2; player.y = WORLD.h / 2;
    player.hp = stat.maxHp; player.dead = 0; player.inv = 1e9;
    for (let i = 0; i < 6; i++) makeEnemy('zombie');

    let dmgSum = 0;
    const realHit = hitEnemy;
    hitEnemy = (e, dmg, crit, kx, ky) => { dmgSum += dmg; return realHit(e, dmg, crit, kx, ky); };

    for (let i = 0; i < steps; i++) {
      /* ★ 캡은 빌드에 없다 — **프로브가 흉내 낸다.** 판정 «전» 에 비행 거리를 넘긴 발을 걷어 내면
         그 프레임의 명중 기회가 사라지므로, 실제 캡과 같은 효과가 난다(오차는 최대 한 프레임).
         상수를 껐다 켰다 하는 것보다 이쪽이 정직하다 — 껐다 켤 상수 자체를 안 넣기로 했기 때문이다. */
      if (cap < Infinity) {
        for (let j = shots.length - 1; j >= 0; j--) {
          const b = shots[j];
          if (b.k === 'meteor' || b.k === 'boomer' || b.x0 === undefined) continue;
          if (Math.hypot(b.x - b.x0, b.y - b.y0) > cap) shots.splice(j, 1);
        }
      }
      /* 적을 «그 자리에» 붙들어 둔다 — 죽지도, 다가오지도 않게 해야 거리 변수만 남는다 */
      enemies.forEach((e, j) => {
        e.born = 1; e.hp = e.max = 1e12; e.slow = 0;
        const a = j * 6.283 / 6;
        e.x = player.x + Math.cos(a) * dist; e.y = player.y + Math.sin(a) * dist;
      });
      player.x = WORLD.w / 2; player.y = WORLD.h / 2;   /* 카이팅으로 거리가 흐르지 않게 고정 */
      player.vx = 0; player.vy = 0;
      step(1 / 60);
    }
    return dmgSum;
  }, { dist, cap, steps });
}

/* ── ③ 가장자리에서 «툭 잘리는» 정도 — 발이 화면 밖으로 나가기 직전 프레임의 알파 ──
 * 비평가가 실제로 잰 것은 «사라지는 순간의 휘도» 였다(AU: x534 에서 15 게임px 하드 클리핑,
 * 그 순간 휘도 255). 그리기 알파가 1.0 인 채로 클립 경계를 지나면 그게 «툭» 이다.
 * 여기서는 렌더러가 쓰는 바로 그 `edgeFade()` 를 프레임마다 불러 «마지막으로 보이던 알파» 와
 * «한 프레임에 떨어진 폭» 을 잰다. 고치기 «전» 은 edgeFade 를 1 로 덮어 같은 판에서 잰다. */
async function edgePop(p, before) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  return await p.evaluate(({ before }) => {
    let s = 999;
    Math.random = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const realFade = edgeFade;
    if (before) edgeFade = () => 1;      /* «고치기 전» = 가장자리 페이드가 없던 상태 */

    S.own = {}; ['shuri', 'ice', 'slash'].forEach(id => { if (SK[id]) S.own[id] = { n: 0, l: 1 }; });
    S.eqSkill = Object.keys(S.own);
    S.opt.shake = false;
    skillCd = {}; shots.length = 0; enemies.length = 0; spawnQ.length = 0;
    player.x = WORLD.w / 2; player.y = WORLD.h / 2;
    player.hp = stat.maxHp; player.dead = 0; player.inv = 1e9;
    for (let i = 0; i < 6; i++) makeEnemy('zombie');

    /* ★ 첫 판에서 이 계측을 «발이 shots 에서 사라진 순간의 알파» 로 짰다가 버렸다 — 틀린 정의였다.
       발은 **화면 밖으로 나가도 지워지지 않는다**(수명 1.4s 나 월드 경계까지 산다. 월드 1920×3072 는
       뷰포트 540×998 보다 훨씬 크다). 그래서 «사라진 순간» 을 재면 화면 한복판에서 수명이 끝난 발까지
       같이 세어 고친 뒤에도 최대 1.000 이 나온다(실측 그랬다).
       클리핑은 «지워지는 사건» 이 아니라 **살아 있는 채로 클립 경계를 넘는 프레임**이다.
       → 뷰 안(d ≥ 0) 에서 뷰 밖(d < 0) 으로 넘어가는 발만 골라, **마지막으로 뷰 안에 있던 프레임의
         알파**를 잰다. 그 값이 1.0 이면 «휘도 255 인 채로 툭 잘린» 것이다(AU 가 잰 바로 그 값). */
    const last = new Map();
    let worst = 0, n = 0, sum = 0;
    const dEdge = (b) => {
      const sx = b.x + camOx, sy = b.y + camOy;
      return Math.min(sx, VW - sx, sy - EDGE_TOP, VH - sy);
    };
    for (let i = 0; i < 1800; i++) {
      enemies.forEach((e, j) => {
        e.born = 1; e.hp = e.max = 1e12; e.slow = 0;
        const a = j * 6.283 / 6;
        e.x = player.x + Math.cos(a) * 300; e.y = player.y + Math.sin(a) * 300;
      });
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      step(1 / 60);
      draw();                            /* camOx/camOy 를 채우게 실제 렌더를 한 프레임 돌린다 */
      for (const b of shots) {
        if (b.k === 'meteor' || b.x0 === undefined) continue;
        const d = dEdge(b);
        const prev = last.get(b);
        if (prev !== undefined && prev.d >= 0 && d < 0) {
          /* 이 발이 이번 프레임에 클립 경계를 넘었다 — 직전 프레임의 그리기 알파가 «툭» 의 크기다 */
          worst = Math.max(worst, prev.a); sum += prev.a; n++;
        }
        last.set(b, { d, a: before ? 1 : realFade(b.x, b.y, edgeW(b)) });
      }
    }
    edgeFade = realFade;
    return { worst, mean: n ? sum / n : 0, n };
  }, { before });
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  let err = 0;
  p.on('pageerror', e => { err++; console.log('  [pageerror] ' + e); });

  console.log(`\n== ① 캡 없이 굴린 정상 전투에서 «비행 거리별 피해» (게임 시간 ${SECS}s × 시드 3) ==`);
  let over = 0, proj = 0, other = 0, overHits = 0, hitsProj = 0, capKill = 0, lifeKill = 0, born = 0;
  const agg = [];
  let BINS = [];
  for (let seed = 1; seed <= 3; seed++) {
    const r = await histogram(p, seed, STEPS);
    BINS = r.BINS;
    r.dmgBin.forEach((v, i) => { agg[i] = (agg[i] || 0) + v; });
    over += r.over; proj += r.dmgProj; other += r.dmgOther;
    overHits += r.overHits; hitsProj += r.hitsProj;
    capKill += r.capKill; lifeKill += r.lifeKill; born += r.born;
  }
  const total = proj + other;
  console.log('비행 거리(게임px) | 피해 몫(투사체 피해 대비)');
  BINS.forEach((lo, i) => {
    const hi = i + 1 < BINS.length ? BINS[i + 1] : '∞';
    const share = proj > 0 ? agg[i] / proj * 100 : 0;
    const bar = '█'.repeat(Math.round(share / 2));
    console.log(`  ${String(lo).padStart(3)}~${String(hi).padStart(3)} | ${share.toFixed(2).padStart(6)}%  ${bar}`);
  });
  const overPctProj  = proj  > 0 ? over / proj  * 100 : 0;
  const overPctTotal = total > 0 ? over / total * 100 : 0;
  console.log(`\n  투사체 피해 ${(proj / total * 100).toFixed(1)}% · 그 밖의 경로 ${(other / total * 100).toFixed(1)}%`);
  console.log(`  ★ 비행 ${CAP} 초과에서 들어온 피해 = 투사체 피해의 **${overPctProj.toFixed(2)}%** · 전체 피해의 **${overPctTotal.toFixed(2)}%**`);
  console.log(`     (명중 ${overHits} / ${hitsProj}회 · 발사 ${born}발 중 캡이 자를 발 ${capKill}, 수명으로 죽던 발 ${lifeKill})`);

  console.log(`\n== ② 최악의 경우 — 적을 고정 거리 링에 세우고 잰 피해 (게임 시간 20s) ==`);
  console.log('적 거리 | 캡 없음 | 캡 260 |    Δ%');
  console.log('--------|---------|--------|--------');
  const rows = [];
  for (const d of [95, 150, 210, 260, 330]) {
    const a = await ring(p, d, Infinity, 1200);
    const c = await ring(p, d, CAP, 1200);
    const pct = a > 0 ? (c - a) / a * 100 : 0;
    rows.push({ d, pct });
    console.log(`  ${String(d).padStart(4)}  | ${a.toExponential(2)} | ${c.toExponential(2)} | ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`);
  }

  /* ①② 판정 — 캡을 넣어도 되는가. «교전 거리에서 손실 없음» + «잘리는 몫이 전체의 1% 미만» */
  const inRange = rows.filter(r => r.d <= 210).every(r => Math.abs(r.pct) < 1);
  const tiny = overPctTotal < 1;
  console.log('\n판정 A — 사거리 캡 260 을 넣어도 되는가');
  console.log(`  교전 거리(95·150·210)에서 피해 손실 < 1% : ${inRange ? 'PASS' : 'FAIL'}`);
  console.log(`  캡이 없앨 피해가 전체의 < 1%             : ${tiny ? 'PASS' : 'FAIL'} (${overPctTotal.toFixed(2)}%)`);
  console.log(`  → ${inRange && tiny ? '넣어도 된다' : '**넣지 마라 — 사거리는 밸런스다.** 연출은 페이드로 고친다(판정 B)'}`);

  console.log('\n== ③ 화면 밖으로 나가는 순간의 그리기 알파 («툭» 의 크기) ==');
  const bef = await edgePop(p, true);
  const aft = await edgePop(p, false);
  console.log('           | 사라지기 직전 알파(최대) | 평균 | 표본');
  console.log(`  고치기 전 |        ${bef.worst.toFixed(3)}             | ${bef.mean.toFixed(3)} | ${bef.n}`);
  console.log(`  고친 뒤   |        ${aft.worst.toFixed(3)}             | ${aft.mean.toFixed(3)} | ${aft.n}`);
  const popOk = aft.n > 0 && aft.worst <= 0.25;
  console.log('\n판정 B — 가장자리 하드 클리핑이 사라졌는가');
  console.log(`  사라지기 직전 알파 ≤ 0.25 : ${popOk ? 'PASS' : 'FAIL'} (${aft.worst.toFixed(3)}, 전 ${bef.worst.toFixed(3)})`);
  console.log(`  → ${popOk ? 'PROBE114G PASS — 판정은 그대로 두고 «툭» 만 없앴다' : 'PROBE114G FAIL'}`);
  console.log(`콘솔 에러 ${err}건`);
  await b.close();
  process.exit(err || !popOk ? 1 : 0);
})();
