/* 114 11회차 — 10회차 인수인계 «코드로 회수 가능한 남은 항목» 1·3·4·5 의 실측.
 *
 * 교훈(LESSONS 114-2 의 1): 연출 지적이 «없다 / 빗나간다 / 안 꺼진다» 계열이면
 * 고치기 전에 코드에서 같은 양을 직접 재라. 비평가 2명이 같은 하네스를 봤으면 독립이 아니다.
 * 여기서 재는 값은 전부 **게임px**(캡처px ÷ 2) 다. 적 몸통 지름 = 2*e.r = 34.
 *
 * 실행: node tools/probe114c.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const R = n => Math.round(n * 10) / 10;

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => typeof window.castSkill === 'function' && typeof window.step === 'function');
  await p.waitForTimeout(700);

  await p.evaluate(() => {
    window.__pc = {
      setup(k, dist){
        sbufClear();
        skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
        rings.length = 0; parts.length = 0; nums.length = 0;
        enemies.length = 0; spawnQ.length = 0;
        markDirty();
        player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 99;
        player.hp = stat.maxHp; cam.shake = 0;
        for (let i = 0; i < k; i++) makeEnemy('zombie');
        enemies.forEach((e, i) => {
          e.born = 1; e.hp = e.max = 1e12;
          const a = i * 6.283 / enemies.length + 0.4;
          e.x = player.x + Math.cos(a) * dist; e.y = player.y + Math.sin(a) * dist;
        });
      },
      cast(id){ const s = SKILLS.find(q => q.id === id); skillCd[s.id] = 0; return castSkill(s); },
      /* 고정스텝 — cap114.js 와 같은 60fps 스텝으로 굴린다 */
      roll(n){ for (let k = 0; k < n; k++) step(1/60); }
    };
  });

  const out = {};

  /* ---- 1 : 시전 첫 2프레임(0·80ms)에 «그려지는 잔상» 이 있는가 (trail 장면 = shuri, dist 210) ---- */
  out.trail = await p.evaluate(() => {
    window.__pc.setup(6, 210);
    window.__pc.cast('shuri');
    const rows = [];
    for (let f = 0; f < 8; f++){
      /* 그리기 게이트: b.tr && b.tn >= GATE — 소스와 같은 조건을 여기서 재현해 «몇 발이 그려지는가» 를 센다 */
      const g5 = shots.filter(s => s.tr && s.tn >= 5).length;
      const g3 = shots.filter(s => s.tr && s.tn >= 3).length;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const s of shots){ x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
      rows.push({ ms: f*80, shots: shots.length, drawn5: g5, drawn3: g3,
                  bboxW: shots.length ? Math.round(x1-x0) : 0, bboxH: shots.length ? Math.round(y1-y0) : 0 });
      window.__pc.roll(5);   /* 80ms */
    }
    return rows;
  });

  /* ---- 3 : 숫자 가로 클램프(150) 가 실제로 얼마나 미는가 ---- */
  out.clamp = await p.evaluate(() => {
    window.__pc.setup(6, 210);
    /* 좌측 끝 적을 하나 골라 그 적에게만 숫자를 띄운다 */
    const e = enemies.slice().sort((a, c) => a.x - c.x)[0];
    nums.length = 0;
    dmgNum(e.x, e.y - e.r, 1234, false);
    const n = nums[nums.length - 1];
    /* 화면 좌표 환산은 draw 쪽과 같은 식(ox/oy = 카메라). VW 는 논리 뷰포트 폭 */
    const ox = (typeof cam === 'object' && cam) ? (cam.x || 0) : 0;
    const drawn = Math.max(150, Math.min(n.x + n.ox + ox, VW - 110)) - ox;
    return { VW, enemyWorldX: Math.round(e.x), enemyScreenX: Math.round(e.x - ox),
             numRawX: Math.round(n.x + n.ox), numDrawnX: Math.round(drawn),
             pushed: Math.round(drawn - (n.x + n.ox)) };
  });

  /* ---- 4 : 폭발(운석) 링의 최대 지름 — 게임px, 몸통(34) 배수, 뷰포트 폭(540) 대비 ---- */
  out.boom = await p.evaluate(() => {
    window.__pc.setup(6, 150);
    rings.length = 0;
    window.__pc.cast('meteor');
    let maxR = 0, peak = null;
    const rows = [];
    for (let f = 0; f < 16; f++){
      for (const r of rings){
        /* fxRing 의 r1 이 «도달 반경» 이다. 현재 반경은 t/life 로 자란다 */
        const cur = r.r0 + (r.r1 - r.r0) * Math.min(Math.max(r.t / r.life, 0), 1);
        if (cur > maxR){ maxR = cur; peak = { ms: f*80, r1: r.r1, w: r.w }; }
      }
      rows.push({ ms: f*80, rings: rings.length,
                  maxCur: Math.round(Math.max(0, ...rings.map(r => r.r0 + (r.r1-r.r0)*Math.min(Math.max(r.t/r.life,0),1)))) });
      window.__pc.roll(5);
    }
    return { maxRadius: Math.round(maxR), maxDiameter: Math.round(maxR*2),
             bodyRatio: Math.round(maxR*2/34*10)/10, viewportPct: Math.round(maxR*2/540*100),
             peak, rows };
  });

  /* ---- 5 : 번개 체인 기하 — 세그먼트가 시전자를 지나는가 / 길이 분포 ---- */
  out.bolt = await p.evaluate(() => {
    const res = [];
    for (const dist of [240, 120]){
      window.__pc.setup(6, dist);
      bolts.length = 0;
      window.__pc.cast('bolt');
      const px = player.x, py = player.y - 22;
      const segs = bolts.map(l => ({
        len: Math.round(Math.hypot(l.x2-l.x1, l.y2-l.y1)),
        dx: Math.round(Math.abs(l.x2-l.x1)), dy: Math.round(Math.abs(l.y2-l.y1)),
        fromCaster: Math.hypot(l.x1-px, l.y1-py) < 3
      }));
      res.push({ dist, n: segs.length, fromCaster: segs.filter(s => s.fromCaster).length, segs });
    }
    return res;
  });

  await b.close();

  console.log('== 1. trail — 시전 직후 «그려지는» 투사체 수 (게이트 tn>=5 vs tn>=3) ==');
  console.table(out.trail);
  console.log('== 3. 숫자 가로 클램프 (게임px) ==');
  console.log(out.clamp);
  console.log('== 4. 폭발 링 최대 지름 (게임px · 몸통 34 배수 · 뷰포트 540 대비) ==');
  console.log({ maxRadius: out.boom.maxRadius, maxDiameter: out.boom.maxDiameter,
                bodyRatio: out.boom.bodyRatio, viewportPct: out.boom.viewportPct, peak: out.boom.peak });
  console.table(out.boom.rows);
  console.log('== 5. 번개 체인 세그먼트 ==');
  for (const r of out.bolt) console.log('dist ' + r.dist + ' — 세그 ' + r.n + ' · 시전자 발 ' + r.fromCaster + ' · ' + JSON.stringify(r.segs));
  console.log('페이지 에러 ' + errs.length + '건');
})();
