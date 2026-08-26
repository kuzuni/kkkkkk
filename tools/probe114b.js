/* 114 7회차 — «남은 문제 B» 5건의 회수 실측.
   각 항목이 6회차에 비평가가 잰 값에서 어디로 갔는지를 수치로 남긴다(review §7 표의 근거).
   실행: NODE_PATH=/opt/node22/lib/node_modules node tools/probe114b.js */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => typeof window.castSkill === 'function' && typeof window.step === 'function');
  await p.waitForTimeout(600);

  /* 공용 하네스 — verify114 와 같은 방식으로 «진짜» 적을 세운다.
     직접 리터럴로 enemies 를 만들면 타입 테이블(T2)이 없어 draw 가 터진다(7회차에 실제로 겪었다) */
  await p.evaluate(() => {
    window.__pb = {
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
      }
    };
  });

  /* ---- B1 : 표창 8발이 «적 방향» 에서 뽑히는가 (적 3기) ---- */
  const b1 = await p.evaluate(() => {
    const place = k => window.__pb.setup(k, 300);
    const run = k => {
      place(k);
      shots.length = 0;
      const s = SKILLS.find(q => q.id === 'shuri');
      skillCd[s.id] = 0;
      castSkill(s);
      const tg = enemies.map(e => Math.atan2(e.y - e.r - (player.y - 22), e.x - player.x));
      let onTarget = 0;
      const errDeg = [];
      for (const sh of shots) {
        let best = 9;
        for (const t of tg) {
          let d = Math.abs(((sh.a - t + Math.PI * 3) % 6.283) - Math.PI);
          best = Math.min(best, d);
        }
        errDeg.push(Math.round(best * 180 / Math.PI));
        if (best <= 0.35) onTarget++;          /* 20° 이내 = «적 쪽으로 간다» */
      }
      return { k, n: shots.length, onTarget, errDeg: errDeg.sort((a, c) => a - c) };
    };
    return [run(3), run(1), run(6)];
  });

  /* ---- B2 : 화구 가시 수명 (알파가 0.02 아래로 떨어질 때까지) ---- */
  const b2 = await p.evaluate(() => {
    booms.length = 0;
    booms.push({ x: 0, y: 0, at: 0, afps: BOOM_FPS, aloop: false,
                 akey: 'boom', anim: 'boom', scale: 5.0, alpha: 0.5 });
    const bl = boomFrames();
    let t = 0, vis = 0, lastA = 1;
    const bb = booms[0];
    while (booms.length && t < 1.5) {
      const pr = Math.min(bb.at / bl, 1);
      const dk = pr <= BOOM_FADE ? 1 : 1 - Math.pow((pr - BOOM_FADE) / (1 - BOOM_FADE), 1.6);
      lastA = bb.alpha * dk;
      if (lastA > 0.02) vis = t;
      step(1 / 60); t += 1 / 60;
    }
    return { frames: bl, fps: BOOM_FPS, animMs: Math.round(bl / BOOM_FPS * 1000),
             visMs: Math.round(vis * 1000), deadMs: Math.round(t * 1000) };
  });

  /* ---- B3 : 치명타 임팩트 2겹의 반경 비가 프레임마다 흔들리는가 ---- */
  const b3 = await p.evaluate(() => {
    rings.length = 0;
    impactFx(500, 500, 300, 0, '#fff', true, 0);
    const ratios = [];
    for (let f = 0; f < 20; f++) {
      const live = rings.filter(r => r.t >= 0);
      if (live.length === 2) {
        const rad = live.map(r => {
          const q = Math.min(r.t / r.life, 1), e = 1 - (1 - q) * (1 - q);
          return r.r0 + (r.r1 - r.r0) * e;
        }).sort((a, c) => a - c);
        ratios.push(Math.round(rad[1] / rad[0] * 100) / 100);
      }
      step(1 / 60);
    }
    return { n: ratios.length, min: Math.min.apply(null, ratios),
             max: Math.max.apply(null, ratios), ratios };
  });

  /* ---- B4 : 폭발 «위» 숫자의 채움색이 순백으로 전환되는가 ---- */
  const b4 = await p.evaluate(() => {
    /* 그리기 경로를 직접 재실행하지 않고, 판정식과 같은 식으로 hot 을 재현해 확인한다 */
    booms.length = 0;
    booms.push({ x: 500, y: 500, at: 0, afps: BOOM_FPS, aloop: false,
                 akey: 'boom', anim: 'boom', scale: 5.0, alpha: 0.5 });
    const hr = 32 * 5.0 * 1.05;
    const at = (dx, dy) => {
      const nx = 500 + dx, ny = 500 + dy;
      let hot = 0;
      for (const bb of booms) {
        const h = 32 * bb.scale * 1.05;
        if ((bb.x - nx) * (bb.x - nx) + (bb.y - ny) * (bb.y - ny) < h * h) { hot = 1; break; }
      }
      return hot;
    };
    return { hotR: Math.round(hr), inside: at(0, 0), edge: at(hr - 4, 0), outside: at(hr + 30, 0) };
  });

  /* ---- B5 : 표창 잔상 지름이 한 팔 안에서 단조인가 ---- */
  const b5 = await p.evaluate(() => {
    window.__pb.setup(3, 320);
    shots.length = 0;
    const s = SKILLS.find(q => q.id === 'shuri');
    skillCd[s.id] = 0;
    castSkill(s);
    const out = [];
    for (let f = 0; f < 40; f++) {
      step(1 / 60);
      const sh = shots.find(q => q.k === 'shuri' && q.tn >= 5);
      if (!sh) continue;
      /* drawTrails 의 shuri 분기와 같은 식으로 지름을 재현한다 */
      const pmx = player.x, pmy = player.y - 22;
      let first = (sh.ti - sh.tn + TRAIL_N * 2) % TRAIL_N, nn = sh.tn;
      while (nn > 2) {
        const ox0 = sh.tr[first * 2] - pmx, oy0 = sh.tr[first * 2 + 1] - pmy;
        if (ox0 * ox0 + oy0 * oy0 > 3025) break;
        first = (first + 1) % TRAIL_N; nn--;
      }
      const tl = Math.max(2, trailLen(sh));
      const d = [];
      for (let i = 0; i < nn; i++) {
        const q = Math.max(0, Math.min(1, 1 - (nn - 1 - i) / tl));
        d.push(Math.round((2.0 + 5.0 * q) * 2 * 10) / 10);
      }
      let mono = 1;
      for (let i = 1; i < d.length; i++) if (d[i] < d[i - 1] - 0.01) mono = 0;
      out.push({ f, nn, mono, d });
    }
    const bad = out.filter(o => !o.mono);
    return { frames: out.length, nonMono: bad.length, sample: out[Math.floor(out.length / 2)] };
  });

  console.log('[B1] 표창 스폰 각도 — 적 방향 샘플링');
  for (const r of b1) {
    console.log('  적 ' + r.k + '기 → 투사체 ' + r.n + '발 · 적 방향 20° 이내 ' + r.onTarget +
                '발 · 각 오차(정렬) ' + r.errDeg.join('/') + '°');
  }
  console.log('[B2] 화구 수명 — ' + b2.frames + '프레임 × ' + b2.fps + 'fps = ' + b2.animMs +
              'ms · 가시(α>0.02) ' + b2.visMs + 'ms · 소멸 ' + b2.deadMs + 'ms');
  console.log('[B3] 치명타 임팩트 2겹 반경 비 — ' + b3.n + '프레임 · ' + b3.min + ' ~ ' + b3.max +
              ' (' + b3.ratios.join(' ') + ')');
  console.log('[B4] 폭발 위 숫자 hot 판정 — 반경 ' + b4.hotR + 'px · 중심 ' + b4.inside +
              ' · 테두리 안 ' + b4.edge + ' · 밖 ' + b4.outside);
  console.log('[B5] 표창 잔상 지름 — 검사 ' + b5.frames + '프레임 · 비단조 ' + b5.nonMono +
              '프레임 · 표본(nn=' + (b5.sample ? b5.sample.nn : '-') + ') ' +
              (b5.sample ? b5.sample.d.join('→') : '-'));
  console.log('오류 ' + errs.length + '건' + (errs.length ? ' — ' + errs[0] : ''));
  await b.close();
})();
