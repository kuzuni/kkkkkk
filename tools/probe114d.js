/* 114 12회차 — «운석 낙하 예고 원» 판정 보류 항목의 실측.
 *
 * 11회차가 남긴 갈림길: 비평가 두 명이 같은 곳(boom-1~5 예고 링)을 보고 **서로 반대**로 적었다.
 *   AM «5프레임(400ms) 동안 크기·알파 변화 0, 십자 마커도 정지»
 *   AN «예고 원 지름 261 → 298 게임px 로 수축이 아니라 **확대**»
 * LESSONS 114-2 의 1: 둘이 갈리면 **코드에서 잰 쪽**을 채택한다.
 *
 * 여기서는 `cap114.js` 의 boom 장면(dist 150 · lead 240ms · 80ms × 12프레임)을 그대로 재현해
 * 프레임마다 **바깥 원 Ø · 안쪽 원 Ø · 십자 길이 · 각 알파** 를 게임px 로 찍는다.
 * 값은 전부 게임px(캡처px ÷ 2). 적 몸통 지름 = 2*e.r = 34 · 논리 뷰포트 540×998.
 *
 * 실행: node tools/probe114d.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const R1 = n => Math.round(n * 10) / 10;

(async () => {
  const b = await launch(chromium);
  const p = await b.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => typeof window.castSkill === 'function' && typeof window.step === 'function');
  await p.waitForTimeout(700);

  await p.evaluate(() => {
    window.__pd = {
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
      roll(n){ for (let k = 0; k < n; k++) step(1/60); }
    };
  });

  /* ---- 예고 원 — cap114 boom 장면(dist 150 · lead 240 · 80ms × 12)과 같은 표본 ---- */
  const rows = await p.evaluate(() => {
    window.__pd.setup(6, 150);
    window.__pd.cast('meteor');
    /* cap114 의 lead 240ms = 14프레임(1/60) */
    for (let k = 0; k < Math.round(0.240 * 60); k++) step(1/60);
    const out = [];
    for (let f = 0; f < 12; f++){
      const m = shots.find(s => s.k === 'meteor');
      if (m){
        /* index.html 의 예고 렌더와 «같은 식» 을 여기서 다시 계산한다 */
        const fr = Math.min(Math.max(1 - (m.ty - m.y) / 620, 0), 1);
        const ro = m.r;                          /* 바깥 원 반지름 — 고정(= 피해 반경) */
        /* ⚠ index.html 의 예고 렌더와 «같은 식» 을 여기서 다시 계산한다 — 저쪽을 바꾸면 여기도 바꿔라.
           12회차: 선형 (1−0.92f) → 0.92·pow(1−f, 0.55) (AO③·AP① 공통 «이징 0» + AO②·AP «0 미수렴») */
        const ri = m.r * 0.92 * Math.pow(1 - fr, 0.55); /* 안쪽 원 반지름 — f=1 에서 정확히 0 */
        out.push({
          frame: f + 1, ms: f * 80, f: Math.round(fr * 1000) / 1000,
          outerD: Math.round(ro * 2), innerD: Math.round(ri * 2),
          gapPx: Math.round(ro - ri),              /* 두 원 사이 «틈» — 0 이면 한 겹으로 보인다 */
          crossLen: Math.round(ri * 0.34 * 2),
          aOuter: Math.round((0.52 + 0.30 * fr) * 100) / 100,   /* 12회차 — 위계 반전 교정 후 값 */
          aInner: Math.round((0.35 + 0.5 * fr) * 100) / 100,
          fallY: Math.round(m.ty - m.y)
        });
      } else {
        out.push({ frame: f + 1, ms: f * 80, f: null, outerD: 0, innerD: 0, gapPx: 0,
                   crossLen: 0, aOuter: 0, aInner: 0, fallY: null,
                   note: '착탄 후 — 예고 없음' });
      }
      window.__pd.roll(5);   /* 80ms */
    }
    return out;
  });

  /* ---- 13회차 신설 — «화구 가시 구간 vs 링 생존 구간» 을 같은 축에서 잰다 ----
     12회차가 다음 회차로 넘긴 충돌: AO «2단 파문이 화구보다 160ms 더 산다, 줄여라(Ø294)» ↔
     AP «160ms 만에 죽고 최대 Ø245~256 이라 피해 지름 260 에 미달, 늘리고 키워라».
     두 사람이 잰 최대 Ø 부터 갈렸으므로 코드에서 먼저 가른다(LESSONS 114-2 의 1).
     착탄 순간을 t=0 으로 잡고 **20ms 간격**으로 화구 알파·링 지름을 함께 찍는다 —
     캡처 그리드(80ms)에서 무엇이 몇 장에 잡히는지도 같이 나온다. */
  const wave = await p.evaluate(() => {
    window.__pd.setup(6, 150);
    window.__pd.cast('meteor');
    /* 착탄(= booms 가 처음 생기는 순간)까지 굴린다 */
    let guard = 0;
    while (booms.length === 0 && guard++ < 300) step(1/60);
    const DT = 1/60, STEP_MS = 20;
    const out = [];
    for (let k = 0; k <= 40; k++) {                    /* 0 ~ 800ms */
      const ms = k * STEP_MS;
      /* 화구 — index.html 의 렌더식과 같은 계산(BOOM_FADE 뒤 1.6제곱 감쇠) */
      let fireA = 0, fireD = 0;
      for (const b of booms) {
        const fr = curFrame(b); if (!fr) continue;
        const bl = boomFrames(), pr = bl ? Math.min(b.at / bl, 1) : 0;
        const dk = pr <= BOOM_FADE ? 1 : 1 - Math.pow((pr - BOOM_FADE) / (1 - BOOM_FADE), 1.6);
        const a = b.alpha * dk;
        if (a > fireA) { fireA = a; fireD = Math.round(ATLAS.boom.f[fr][6] * b.scale); }
      }
      /* 링 — 지연 발화 대기(t<0)는 «아직 없음». rr 는 ease-out(1-(1-f)^2) */
      const rs = rings.map(r => {
        if (r.t < 0) return null;
        const f = Math.min(Math.max(r.t / r.life, 0), 1), e = 1 - (1 - f) * (1 - f);
        return { d: Math.round((r.r0 + (r.r1 - r.r0) * e) * 2), a: Math.round((1 - f * f) * (r.fl ? 0.8 : 0.95) * 100) / 100 };
      }).filter(Boolean).sort((x, y) => y.d - x.d);
      out.push({
        ms,
        capFrame: ms % 80 === 0 ? ms / 80 + 1 : '',      /* 80ms 캡처 그리드에 걸리는 지점 */
        fireA: Math.round(fireA * 100) / 100, fireD,
        rings: rs.length,
        maxD: rs.length ? rs[0].d : 0,
        maxA: rs.length ? rs[0].a : 0,
        dList: rs.map(r => r.d).join('/')
      });
      for (let s = 0; s < Math.round(STEP_MS / 1000 / DT); s++) step(DT);
    }
    return out;
  });

  await b.close();

  console.log('== 운석 예고 원 — cap114 boom 장면 재현 (게임px · 몸통 34 · 뷰포트 540) ==');
  console.table(rows);

  const live = rows.filter(r => r.f !== null);
  const first = live[0], last = live[live.length - 1];
  const outerVary = Math.max(...live.map(r => r.outerD)) - Math.min(...live.map(r => r.outerD));
  const innerDrop = first.innerD - last.innerD;
  console.log('');
  console.log('바깥 원 Ø 변동폭 : ' + outerVary + ' 게임px  (설계 = 0, 고정)');
  console.log('안쪽 원 Ø        : ' + first.innerD + ' → ' + last.innerD +
              '  (' + (innerDrop >= 0 ? '−' : '+') + Math.abs(innerDrop) + ' 게임px, ' +
              Math.round(innerDrop / first.innerD * 100) + '% 수축)');
  console.log('첫 프레임 두 원 틈: ' + first.gapPx + ' 게임px' +
              (first.gapPx < 6 ? '  ← 6 게임px 미만이면 한 겹으로 읽힌다' : ''));
  console.log('십자 길이        : ' + first.crossLen + ' → ' + last.crossLen + ' 게임px');

  console.log('');
  console.log('== 착탄 이후 — 화구 vs 링 (같은 축 · 20ms 간격 · 착탄 = 0ms) ==');
  console.table(wave.filter(r => r.ms % 40 === 0));
  const fireLast = [...wave].reverse().find(r => r.fireA > 0.02);
  const ringLast = [...wave].reverse().find(r => r.rings > 0);
  const peak = wave.reduce((a, r) => (r.maxD > a.maxD ? r : a), wave[0]);
  console.log('');
  console.log('화구 가시 마지막  : ' + (fireLast ? fireLast.ms : 0) + 'ms  (알파 > 0.02)');
  console.log('링 생존 마지막    : ' + (ringLast ? ringLast.ms : 0) + 'ms');
  console.log('링이 화구보다 더 삶: ' + ((ringLast ? ringLast.ms : 0) - (fireLast ? fireLast.ms : 0)) + 'ms');
  console.log('링 최대 지름      : Ø' + peak.maxD + ' 게임px (' + peak.ms + 'ms · 몸통의 ' +
              R1(peak.maxD / 34) + '배 · 뷰포트 폭의 ' + Math.round(peak.maxD / 540 * 100) + '%)');
  console.log('피해 지름 Ø260 과의 차: ' + (peak.maxD - 260) + ' 게임px');
  const capRows = wave.filter(r => r.capFrame !== '');
  console.log('80ms 캡처 그리드에서 링이 잡히는 장 수: ' +
              capRows.filter(r => r.rings > 0).length + ' / ' + capRows.length);
  console.log('페이지 에러 ' + errs.length + '건');
})();
