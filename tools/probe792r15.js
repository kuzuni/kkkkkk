/* 792 15회차 재현 — **«운석이 낙하로 안 읽힌다» 는 제품인가 하네스인가** (2026-09-06, sess-1413-13635 루틴 워커 A)
 *
 *   node tools/probe792r15.js
 *
 * ── 무엇을 묻나 ───────────────────────────────────────────────────────────
 * 「`meteor` 가 낙하로 안 읽힌다」는 792 에서 **가장 오래 산 지적**이다 — 4·8·10·12·14회차,
 * 여섯 회 연속 2인 공통이고 **비평가 열두 명이 각자 독립으로** 같은 말을 했다:
 *   · 14회차 CZ — «꼬리 쐐기가 방위각 **0°(수평 왼쪽)** · 하강 성분 **0px**»
 *   · 14회차 DA — «쐐기 1,073px 중 952px(88.7%)이 심선 **왼쪽** · 좌:우 **7.9 : 1** · 세로 성분 0»
 *
 * ⚠ 338 규칙 — 처방 전에 **재현**한다. 그리고 이 자리에서 재현이 가장 먼저 물을 것은
 *   **«비평가가 본 그림이 게임의 그림인가»** 다. 792 등재문이 못박아 둔 경계가 정확히 이것이고
 *   («자로 검산하지 않은 눈의 지적을 그대로 받지 마라»), 2회차가 CN 의 ②③ 3건을 **하네스 격자**를
 *   잰 유령으로 판정한 전례도 같은 자리다.
 *
 * ── 갈래 ─────────────────────────────────────────────────────────────────
 *   ⓐ **제품이 안 떨어진다** — 이 종이 실제로 수평으로 날아가거나 방향이 없다 ⇒ 작도를 고쳐야 한다.
 *   ⓑ **하네스가 각을 죽인다** — 제품은 떨어지는데 대조 시트가 그 각을 안 싣는다 ⇒ 자를 고쳐야 하고
 *      **제품은 0줄**이다(338·341 이 등재문 가설을 기각한 것과 같은 꼴).
 *
 * ── 이 자가 찍는 눈금 ─────────────────────────────────────────────────────
 *   · `az`  = 본체(바위) 무게중심 → 옅은 잉크(불꼬리) 무게중심의 **방위각**
 *             (캔버스 좌표 · 0° = 오른쪽 · 90° = 아래 · 270° = 위)
 *   · `fall`= 그 벡터의 **세로 성분**(단위벡터 dy). 꼬리가 위면 −1 에 가깝고 = 바위가 아래로 떨어진다.
 *   · 알파 풀이(한 번 그린 판 ↔ 두 번 그린 판)와 본체 문턱 A_BODY 0.55 는
 *     `verify792` [E1]·`probe792r13` 과 **같은 산수**다 — 다른 값을 쓰면 두 값을 견줄 수 없다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const R = 60;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const note = m => console.log('  (기록) ' + m);

(async () => {
  /* ── §1 하네스 계약 — 어느 자가 각을 실어야 하고 어느 자가 눕혀야 하는가 ──
     ⚠ 둘은 서로 반대가 맞다. **대조 시트**(cap710)는 «게임의 그림» 을 보여 주는 자라 제품이 정한
       각을 실어야 하고, **실루엣 자**(verify792 [D1]·[E1] · probe792r13)는 종끼리 겹쳐 재는 자라
       17종이 **같은 각**이어야 견줄 수 있다. 15회차 전에는 셋 다 눕히고 있었다. */
  console.log('\n§1 하네스 계약 — 시트는 각을 싣고, 실루엣 자는 눕힌다');
  {
    const src = fs.readFileSync(path.join(__dirname, 'cap710.js'), 'utf8');
    ok(/\ba:\s*b\.a\b/.test(src) && /aFixed/.test(src),
       'cap710.js — 종의 a 를 담고 «조준 ↔ 제품 상수» 를 가른다(`aFixed`)');
    ok(/\bvx:\s*0,\s*vy:\s*0,\s*a:\s*sp\.a\b/.test(src),
       'cap710.js — 시트에 세우는 발이 **그 종의 각**을 쓴다(`a: sp.a`)');
    ok(!/\bvx:\s*0,\s*vy:\s*0,\s*a:\s*0\b/.test(src),
       'cap710.js — 각을 0 으로 박는 자리가 남아 있지 않다');
  }
  for (const f of ['probe792r13.js', 'verify792.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    ok(/\bvx:\s*0,\s*vy:\s*0,\s*a:\s*0\b/.test(src),
       `${f} — 실루엣 축이라 a:0 을 **일부러** 유지한다(같은 각이라야 종끼리 겹쳐 잰다)`);
  }

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + SRC);
  await page.waitForTimeout(1100);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });

  const out = await page.evaluate((R) => {
    let _rs = 0x2f6e2b1 >>> 0;
    Math.random = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) >>> 0; return _rs / 4294967296; };
    localStorage.clear(); Object.assign(S, DEF());
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    step(1 / 60); draw();
    const ox = camOx, oy = camOy;

    const FXMAP = { shots, ghosts, bolts, zones, booms, drones, parts, rings };
    const clearFx = () => { for (const n in FXMAP) FXMAP[n].length = 0; };

    let foe = null;
    const putFoe = (fx, fy) => {
      if (fx === undefined) { fx = 300; fy = 300; }
      if (!foe) { let g = 0; while (enemies.length === 0 && g++ < 600) step(1 / 60); foe = enemies[0]; }
      enemies.length = 0; spawnQ.length = 0;
      if (foe) {
        enemies.push(foe);
        foe.x = fx - ox; foe.y = fy - oy; foe.born = 9;
        foe.hp = 1e12; foe.max = 1e12; foe.sp = 0; foe.slow = 0; foe.dmg = 0;
      }
      return foe;
    };
    putFoe(); orbitAng = 0;

    /* ── 제품이 실제로 만든 발 — **각·속도·중력·출발 높이**를 그대로 받아 적는다 ──
       표적을 **두 자리**에 두고 두 번 시전한다: 각이 안 변한 종이 «제품 상수각», 변한 종이 «조준각» 이다
       (cap710 이 시트를 세울 때 쓰는 것과 **같은 판정**이다 — 자와 시트가 갈리면 안 된다). */
    const castAll = (fx, fy) => {
      const o = {};
      for (const s of SKILLS) {
        putFoe(fx, fy); clearFx();
        let done = false;
        try { done = castSkill(s); } catch (e) { done = false; }
        if (done && shots.length) {
          const b = shots[0];
          o[s.id] = { k: b.k, sh: b.sh, sa: b.sa, col: b.col, r: b.r, spin: b.spin,
                      a: b.a, vx: b.vx, vy: b.vy, gy: b.gy, fl0: b.fl0,
                      tx: b.tx, ty: b.ty, y0: b.y };
        }
        clearFx();
      }
      return o;
    };
    const cast = castAll(300, 300), castB = castAll(760, 900);
    const census = [];
    for (const id in cast) {
      if (!castB[id]) continue;
      census.push({ id, sh: cast[id].sh, a: +cast[id].a.toFixed(3),
                    fixed: castB[id].a === cast[id].a });
    }

    /* ── 찍힌 픽셀 — 같은 종을 두 각으로 세워 꼬리 방위각을 잰다 ── */
    putFoe(); clearFx();
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    const CX = Math.round(player.x + ox + 180), CY = Math.round(player.y + oy - 22);
    const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);
    const bw = Math.round(2 * R * SC), bh = Math.round(2 * R * SC);
    const cx2 = cvs.getContext('2d');
    const grab = () => { draw(); return cx2.getImageData(bx, by, bw, bh).data; };
    performance.now = () => 1e6;
    const base = grab();

    const A_BODY = 0.55;
    const shoot = (sp, ang) => ({ k: sp.k, sh: sp.sh, sa: sp.sa, x: CX - ox, y: CY - oy,
                                  vx: 0, vy: 0, a: ang, dmg: 0, life: 9, pierce: 99, hit: [], col: sp.col,
                                  spin: sp.spin === undefined ? undefined : 0.7, r: sp.r,
                                  tx: sp.tx === undefined ? undefined : CX - ox,
                                  ty: sp.ty === undefined ? undefined : CY - oy, fl0: sp.fl0 });

    /* 본체(α ≥ .55 = 바위)와 옅은 잉크(0 < α < .55 = 불꼬리·후광)의 무게중심을 각각 낸다 */
    const centroids = (sp, ang) => {
      clearFx(); shots.push(shoot(sp, ang));        const a0 = grab();
      clearFx(); shots.push(shoot(sp, ang), shoot(sp, ang)); const a2 = grab();
      clearFx();
      let bn = 0, bxs = 0, bys = 0, fn = 0, fxs = 0, fys = 0;
      for (let i = 0, p = 0; i < a0.length; i += 4, p++) {
        let c = 0, best = 0;
        for (let k = 0; k < 3; k++) {
          const v = Math.abs(a0[i + k] - base[i + k]);
          if (v > best) { best = v; c = k; }
        }
        if (best <= 8) continue;
        const d1 = a0[i + c] - base[i + c], d2 = a2[i + c] - a0[i + c];
        let al = 1 - d2 / d1;
        if (!isFinite(al)) al = 1;
        al = al < 0 ? 0 : (al > 1 ? 1 : al);
        const x = p % bw, y = (p - x) / bw;
        if (al >= A_BODY) { bn++; bxs += x; bys += y; }
        else { fn++; fxs += x; fys += y; }
      }
      if (!bn || !fn) return null;
      const dx = fxs / fn - bxs / bn, dy = fys / fn - bys / bn;
      const len = Math.hypot(dx, dy);
      let az = Math.atan2(dy, dx) * 180 / Math.PI;
      if (az < 0) az += 360;
      return { bn, fn, dx: +dx.toFixed(1), dy: +dy.toFixed(1), len: +len.toFixed(1),
               az: +az.toFixed(1), fall: len ? +(dy / len).toFixed(3) : 0 };
    };

    const m = cast.meteor;
    const res = { cast, census, meteorAt0: m ? centroids(m, 0) : null,
                  meteorAtReal: m ? centroids(m, m.a) : null, others: {} };
    /* 방향을 가진 이웃들도 같은 자로 재 둔다 — «이 종만 역주행» 이라는 지적의 검산 */
    for (const id of ['ice', 'arrow', 'lance', 'gale', 'slash', 'curve']) {
      if (cast[id]) res.others[id] = { a: +cast[id].a.toFixed(3), c0: centroids(cast[id], 0) };
    }
    clearFx();
    return res;
  }, R);

  /* ── §2 제품 — 이 종은 실제로 «떨어지는가» ── */
  console.log('\n§2 제품 — `meteor` 가 게임에서 실제로 하는 일');
  const m = out.cast.meteor;
  ok(!!m, '`meteor` 시전이 발을 만든다');
  if (m) {
    ok(Math.abs(m.a - Math.PI / 2) < 0.05,
       `발의 각 a = ${m.a.toFixed(3)} rad = ${(m.a * 180 / Math.PI).toFixed(1)}° (= 수직 · 꼬리가 위)`);
    ok(m.vy > 0 && m.vx === 0,
       `속도가 **아래로만** — vx ${m.vx} · vy ${m.vy.toFixed(0)} (가로 흔들림 0 = 114 13회차 처방)`);
    ok(m.gy > 0, `중력 gy ${m.gy.toFixed(0)} — 등속이 아니라 **가속**한다(114 13회차: 프레임당 55 → 100)`);
    ok(m.fl0 > 0 && m.ty - m.y0 > 0,
       `출발이 착탄점보다 **위** — 낙하 거리 ${m.fl0.toFixed(0)} · 출발 y ${m.y0.toFixed(0)} → 착탄 y ${m.ty.toFixed(0)}`);
  }

  /* ── §3 찍힌 픽셀 — 같은 종, 두 각 ── */
  console.log('\n§3 찍힌 픽셀 — 하네스의 각(a=0) ↔ 게임의 각(a=π/2)');
  const c0 = out.meteorAt0, cR = out.meteorAtReal;
  ok(!!(c0 && cR), '두 각 모두에서 본체·옅은 잉크가 잡힌다');
  if (c0 && cR) {
    note(`a=0     — 꼬리 방위각 ${c0.az}° · 벡터 (${c0.dx}, ${c0.dy}) · 세로 성분 ${c0.fall}`);
    note(`a=π/2   — 꼬리 방위각 ${cR.az}° · 벡터 (${cR.dx}, ${cR.dy}) · 세로 성분 ${cR.fall}`);
    ok(c0.az > 135 && c0.az < 225,
       `a=0 에서 꼬리가 **왼쪽**(방위각 ${c0.az}° ∈ 135~225) — 14회차 CZ «방위각 0°(수평 왼쪽)» 와 같은 그림`);
    ok(Math.abs(c0.fall) < 0.30,
       `a=0 에서 **세로 성분 ${c0.fall}** ≈ 0 — CZ «하강 성분 0px» · DA «낙하(세로) 성분 0» 이 그대로 재현된다`);
    ok(cR.az > 225 && cR.az < 315,
       `a=π/2 에서 꼬리가 **위**(방위각 ${cR.az}° ∈ 225~315) = 바위가 아래로 떨어진다`);
    ok(cR.fall < -0.70,
       `a=π/2 에서 **세로 성분 ${cR.fall}** ≤ −0.70 — «떨어진다» 가 그림에 있다`);
  }

  /* ── §4 «이 종만 역주행» 검산 — 이웃들의 각도 하네스가 죽였다 ── */
  console.log('\n§4 «이 종만 역주행» 검산 — 방향을 가진 이웃 6종');
  const ids = Object.keys(out.others);
  ok(ids.length >= 5, `방향성 이웃 ${ids.length}종을 같은 자로 쟀다`);
  const flat = ids.filter(id => Math.abs(out.others[id].a) > 0.05);
  note('종:시전각(rad) — ' + ids.map(id => `${id}:${out.others[id].a}`).join(' · '));
  ok(flat.length >= 1,
     `시전각이 0 이 아닌 이웃 ${flat.length}종 — 하네스는 그 각도 **전부 0 으로 눕힌다**(${flat.join(' · ')})`);
  note('⇒ 14회차 DA 의 «우향인 나머지 6종과 역주행» 은 성립하지 않는다 — 시트에서는 17종이 전부 같은 각이고, ' +
       '운석의 꼬리도 나머지와 **같은 −x(뒤)** 를 가리킨다. 갈린 것은 방향이 아니라 **각을 실었는가**다');

  /* ── §5 고정각 인구조사 — 시트에서 그림이 바뀌는 칸은 몇 개인가 ── */
  console.log('\n§5 고정각 인구조사 — 표적을 두 자리에 두고 두 번 시전한다');
  const cen = out.census || [];
  const fixed = cen.filter(c => c.fixed), aimed = cen.filter(c => !c.fixed);
  ok(cen.length >= 17, `잰 종 ${cen.length}종`);
  note('고정각 — ' + fixed.map(c => `${c.id}(${c.sh}) a=${c.a}`).join(' · '));
  note('조준각 — ' + aimed.map(c => c.id).join(' · ') + ` (${aimed.length}종 · 표적 자리가 정하므로 시트에서는 0 으로 눕힌다)`);
  const moved = fixed.filter(c => Math.abs(c.a) > 1e-6);
  ok(moved.length === 1 && moved[0].id === 'meteor',
     `고정각이 **0 이 아닌** 종은 ${moved.length}종 — ${moved.map(c => c.id).join(' · ')} ⇒ 시트에서 그림이 바뀌는 칸은 그 하나뿐이다`);
  note('실측 대조(칸별 화소 · r14 시트 ↔ 15회차 시트 4판): `meteor` **6,914화소 변화 · 잡음 0** · ' +
       '나머지 16칸은 «각을 안 바꾼 사본» 과 견줘도 같은 크기로 흔들린다(cap710 은 시간을 안 얼린다 — **996 등재**)');

  ok(errs.length === 0, `콘솔/페이지 오류 0건 (실측 ${errs.length})`);
  await browser.close();

  console.log(`\nPROBE792R15 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
