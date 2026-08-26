/* 작업 114 — 17회차 프로브: **① «릴리스 절벽»** 실측 (16회차 인수인계 2순위)
 *
 * 16회차 AW[1][2][3] · AX[5][16] 이 **독립 2명 · 수치 일치**로 적은 것:
 *   · boom 화구가 f8→f9 에 **−95.6%**(Y>200 화소 30,976 → 500)
 *   · bolt 꼬리가 f3→f4 에 **−89%**
 * 둘 다 «한 프레임(80ms)에 통째로 삭제» 다. 두 사람의 처방도 같다 —
 *   «릴리스를 3~4프레임 ease-out 으로 펴고 **한 프레임 알파 감소 상한 0.30~0.45**».
 *
 * ── 무엇을 재는가 ─────────────────────────────────────────────
 * 비평가는 «Y>200 화소 수» 로 쟀다. 그 자는 임계 근처에서 알파의 작은 변화가 화소 수의 큰 변화로
 * 증폭돼(LESSONS: «밝은·어두운 것에 같은 절대 임계를 대면 유령이 난다») 처방의 «알파 감소» 와
 * 직접 견줄 수 없다. 두 연출 모두 **가산 합성(`lighter`)** 이므로, 대신
 *
 *     잉크량(ink) = Σ max(0, 프레임 휘도 − 같은 화소의 배경 휘도)
 *
 * 를 잰다. 가산 합성에서 이 값은 **그리기 알파에 정확히 선형**이라 «프레임당 알파 감소» 를
 * 곧바로 읽을 수 있다. 배경은 «연출이 뜨기 전» 같은 판·같은 화소에서 먼저 떠 둔다.
 *
 * ── 합격선 ───────────────────────────────────────────────────
 *   ① 프레임당 상대 감소 ≤ 0.45   (두 처방의 상한. 한 프레임 삭제 = 1.00 이면 실패)
 *   ② 마지막 프레임 → 소멸의 낙차 ≤ 0.45 (릴리스 끝이 하드 컷이면 안 된다)
 *   ③ 살아 있는 프레임 수 ≥ 3    («3~4프레임 ease-out»)
 *
 * ── ④ 계층 분리(17회차 1순위)도 같이 본다 ───────────────────
 *   피격 링과 배경 링(파문·여진·시전 플래시)이 **선폭·불투명도로 갈렸는가**.
 *   합격선 — 선폭 비 ≥ 1.6배 · 불투명도 비 ≥ 1.5배 (수명 끝까지 유지).
 *
 * 실행: node tools/probe114j.js
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const GRID = 80 / 1000;            /* 비평가가 보는 캡처 그리드(80ms) */

async function run(p) {
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1300);
  return await p.evaluate(async ({ GRID }) => {
    if (typeof closeAll === 'function') try { closeAll(); } catch (e) {}
    document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));

    const out = { boom: null, bolt: null, tier: null, hit: null, err: [] };

    /* ---------- 공용 하네스 ---------- */
    function reset(skill) {
      S.own = { [skill]: { n: 0, l: 1 } }; S.eqSkill = [skill];
      S.opt.shake = false; S.lv.crit = 0;
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 1e9;
      player.hp = stat.maxHp;
      makeEnemy('zombie');
      const e = enemies[0];
      e.born = 1; e.hp = e.max = 1e12;
      e.x = player.x; e.y = player.y + 150;
      return e;
    }
    /* 화면 한 상자의 «배경 대비 잉크량». 가산 합성이라 그리기 알파에 선형이다 */
    /* 두 자를 함께 낸다 —
       `ink`   전체 잉크량(배경 대비). 연출 «덩어리» 전체의 크기.
       `hot`   **밝은 쪽만**: Σ max(0, Y − 200). 비평가가 쓴 «Y>200 화소 수» 의 연속판이다.
               화소 «수» 는 임계 근처에서 튀지만(LESSONS: 같은 절대 임계 = 유령), 여유분의 «합» 은
               알파에 선형이라 처방의 «알파 감소» 와 직접 견줄 수 있다.
       번개처럼 «가장 밝은 요소(흰 코어)만 한 프레임에 사라지는» 결함은 ink 에는 20% 로만 보이고
       hot 에만 통째로 보인다 — 16회차 AX[16] 이 −89% 로 읽은 것이 이것이다. */
    function inkOf(box, base) {
      const d = ctx.getImageData(box.x, box.y, box.w, box.h).data;
      let s = 0, h = 0;
      for (let i = 0, k = 0; i < d.length; i += 4, k++) {
        const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        s += base ? Math.max(0, y - base[k]) : y;
        h += Math.max(0, y - 200);
      }
      return { ink: s, hot: h };
    }
    function lumBuf(box) {
      const d = ctx.getImageData(box.x, box.y, box.w, box.h).data;
      const a = new Float64Array(box.w * box.h);
      for (let i = 0, k = 0; i < d.length; i += 4, k++) a[k] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return a;
    }
    /* 프레임 열 → 프레임당 상대 감소 열 */
    function drops(rows, key) {
      const series = rows.map(r => r[key]);
      const pk = Math.max(...series);
      if (pk <= 0) return { rel: [], maxDrop: 1, alive: 0, tailStep: 1, peak: 0 };
      const rel = series.map(v => v / pk);
      let maxDrop = 0;
      for (let i = 1; i < rel.length; i++) maxDrop = Math.max(maxDrop, rel[i - 1] - rel[i]);
      /* «소멸 낙차» — 마지막으로 살아 있던 프레임의 값이 곧 다음 프레임에 잃는 몫이다 */
      let last = 0;
      for (let i = rel.length - 1; i >= 0; i--) if (rel[i] > 0.02) { last = rel[i]; break; }
      return { rel, maxDrop, alive: rel.filter(v => v > 0.02).length, tailStep: last, peak: pk,
               series: series.map(v => Math.round(v)) };
    }

    /* ---------- ① boom 화구 ---------- */
    /* ★ 화소로 재면 못 쓴다 — 운석은 본 화구 뒤에 **연쇄 폭발 3발**을 0.08s 간격으로 얹어서
       상자 안 잉크가 여러 화구의 «겹침» 이 된다(첫 계측이 그랬다: 1.000 → 0.354 → 0.984 로
       릴리스가 아니라 다음 화구의 점화를 읽었다). 릴리스는 **한 화구의 알파** 이야기이므로
       `drawFrameC` 를 가로채 **본 화구(booms[0])가 실제로 그려진 알파**를 그대로 적는다.
       공식을 프로브에 베끼지 않고 그리기 경로에서 뽑으므로, 곡선을 고치면 여기 그대로 나타난다. */
    try {
      const e = reset('meteor');
      const realDFC = drawFrameC;
      let frameAlpha = null;
      drawFrameC = function (key, fr, x, y, sc, flip, a) {
        if (key === 'boom' && frameAlpha === null) frameAlpha = a;   /* 프레임의 «첫» 화구 = booms[0] */
        return realDFC.apply(null, arguments);
      };
      castSkill(SK.meteor);
      const shot = shots.find(b => b.k === 'meteor');
      if (shot) { e.x = shot.tx; e.y = shot.ty; }
      let series = [], acc = 0, prim = null, gone = 0;
      for (let i = 0; i < 300; i++) {
        e.hp = e.max = 1e12; e.slow = 0;
        if (shot && !shot.dead) { e.x = shot.tx; e.y = shot.ty; }
        frameAlpha = null;
        step(1 / 60); draw();
        if (!prim) {
          if (!booms.length) continue;
          prim = booms[0];                       /* 본 화구 — 가장 먼저 push 된 것 */
          acc = GRID;                            /* 표본 위상을 점화 프레임에 잠근다 */
        } else acc += 1 / 60;
        if (booms[0] !== prim) gone = 1;         /* 본 화구가 사라졌다 → 알파 0 */
        if (acc >= GRID - 1e-9) {
          acc -= GRID;
          const a = gone ? 0 : (frameAlpha === null ? 0 : frameAlpha);
          series.push({ ink: a, hot: a });
          if (gone && series.length > 2) break;
        }
      }
      drawFrameC = realDFC;
      out.boom = { ink: drops(series, 'ink'), hot: null };
      out.boom.ink.series = series.map(r => +r.ink.toFixed(4));
    } catch (err) { out.err.push('boom: ' + err.message); }

    /* ---------- ② bolt 코어·잔광 ---------- */
    try {
      const e = reset('bolt');
      /* 상자 — 시전자와 대상을 함께 덮는다 */
      const gx0 = Math.min(player.x, e.x) + camOx, gx1 = Math.max(player.x, e.x) + camOx;
      const gy0 = Math.min(player.y, e.y) + camOy, gy1 = Math.max(player.y, e.y) + camOy;
      const pad = 60;
      const bx = Math.max(0, Math.round((gx0 - pad) * SC)), by = Math.max(0, Math.round((gy0 - pad) * SC));
      const bw = Math.min(cvs.width - bx, Math.round((gx1 - gx0 + pad * 2) * SC));
      const bh = Math.min(cvs.height - by, Math.round((gy1 - gy0 + pad * 2) * SC));
      const box = { x: bx, y: by, w: bw, h: bh };
      step(1 / 60); draw();
      const base = lumBuf(box);
      castSkill(SK.bolt);
      /* ★ 표본 위상을 **번개가 처음 존재하는 프레임**에 잠근다. 시전 → 생성 사이 지연이 빌드마다
         다르면 80ms 그리드가 어긋나 «전/후» 가 다른 위상에서 비교돼 최대 감소가 뒤바뀐다
         (첫 계측이 실제로 그랬다 — 기준선 0.240 vs 새 빌드 0.325 는 위상차였다) */
      let series = [], acc = 0, seen = 0;
      for (let i = 0; i < 200; i++) {
        e.hp = e.max = 1e12; e.slow = 0;
        step(1 / 60); draw();
        if (!seen) { if (!bolts.length) continue; seen = 1; acc = GRID; }
        else acc += 1 / 60;
        if (acc >= GRID - 1e-9) {
          acc -= GRID;
          series.push(inkOf(box, base));
          if (series.length > 3 && !bolts.length) break;
        }
      }
      out.bolt = { ink: drops(series, 'ink'), hot: drops(series, 'hot') };
    } catch (err) { out.err.push('bolt: ' + err.message); }

    /* ---------- ④ 피격 링: 표적 드리프트 · 릴리스 ---------- */
    /* 17회차 두 비평가 공통 —
         ③ AY[6] 21.2/30.5 · AZ[1] 33.6 · AZ[15] 4.4~18.1 게임px  «링이 월드 고정, 적은 걷는다»
         ① AZ[5][6] · AY[8]  «수명 3프레임 240ms · 피크의 21~36% 에서 한 프레임에 0»
       둘 다 «살아 있는 링 하나» 를 프레임마다 따라가며 재면 확정된다. 그림이 아니라 상태를 읽는다. */
    try {
      const e = reset('slash');
      S.lv.crit = 0;
      let drift = 0, alphas = [], acc = 0, ring = null, seen = 0;
      for (let i = 0; i < 400; i++) {
        e.hp = e.max = 1e12; e.slow = 0;      /* 적은 죽지 않고 계속 걷는다 — 드리프트의 원인 */
        step(1 / 60); draw();
        if (!ring) {
          ring = rings.find(r => r.imp && r.t >= 0);
          if (!ring) continue;
          acc = GRID;                          /* 표본 위상을 링 생성에 잠근다 */
        } else acc += 1 / 60;
        /* 링이 배열에서 빠졌으면(수명 끝) 알파 0 을 한 번 적고 끝낸다 */
        const alive = rings.indexOf(ring) >= 0;
        if (alive) {
          const f = Math.min(Math.max(ring.t / ring.life, 0), 1);
          const tr = ringTier(ring);
          const a = (1 - f * f) * (ring.fl ? 0.8 : 0.95) * tr.a;
          const dx = ring.x - e.x, dy = ring.y - (e.y - e.r);
          drift = Math.max(drift, Math.sqrt(dx * dx + dy * dy));
          if (acc >= GRID - 1e-9) { acc -= GRID; alphas.push(a); }
        } else if (!seen) { seen = 1; alphas.push(0); break; }
      }
      out.hit = { drift, life: ring ? ring.life : 0,
                  alphas: alphas.map(v => +v.toFixed(4)),
                  drops: alphas.slice(1).map((v, i) => +(alphas[i] - v).toFixed(4)) };
    } catch (err) { out.err.push('hit: ' + err.message); }

    /* ---------- ③ 링 계층 분리 ---------- */
    try {
      const T = RING_TIER;
      /* 그려지는 선폭은 `max(1.2*t.w, r.w*t.w*(1−0.6f))`, 알파는 `(1−f²)*(fl?0.8:0.95)*t.a`.
         피격(w4·hit) 과 배경(w4·amb) 을 **같은 수명 위상**에서 견준다 — 비가 f 에 따라 무너지면 안 된다 */
      const rows = [];
      for (let f = 0; f <= 1.0001; f += 0.25) {
        const wHit = Math.max(1.2 * T.hit.w, 4 * T.hit.w * (1 - f * 0.6));
        const wAmb = Math.max(1.2 * T.amb.w, 4 * T.amb.w * (1 - f * 0.6));
        const aHit = (1 - f * f) * 0.95 * T.hit.a;
        const aAmb = (1 - f * f) * 0.95 * T.amb.a;
        rows.push({ f: +f.toFixed(2), wR: +(wHit / wAmb).toFixed(3), aR: aAmb > 0 ? +(aHit / aAmb).toFixed(3) : 999 });
      }
      out.tier = { rows, wMin: Math.min(...rows.map(r => r.wR)), aMin: Math.min(...rows.filter(r => r.aR < 999).map(r => r.aR)) };
    } catch (err) { out.err.push('tier: ' + err.message); }

    return out;
  }, { GRID });
}

(async () => {
  /* `getImageData` 를 쓰므로 file:// 스프라이트로 캔버스가 오염되지 않게 한다(probe114i 와 같은 인자) */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  const r = await run(p);
  await browser.close();

  let fail = 0;
  const line = (ok, s) => { if (!ok) fail++; console.log((ok ? '  PASS ' : '  FAIL ') + s); };

  console.log('\n== ① 릴리스 절벽 (80ms 그리드 · 잉크량 = 배경 대비 가산 합, 알파에 선형) ==');
  for (const k of ['boom', 'bolt']) {
    const g = r[k];
    console.log(`\n[${k}]`);
    if (!g || !g.ink || !g.ink.series.length) { console.log('  (표본 없음)'); fail++; continue; }
    for (const lens of ['ink', 'hot']) {
      const d = g[lens];
      if (!d) continue;
      const nm = k === 'boom' ? '본 화구 그리기 알파(drawFrameC 가로채기)'
               : lens === 'ink' ? '전체 잉크' : '밝은 쪽(Y−200 여유분)';
      console.log(`  ${nm}`);
      console.log('    값     : ' + d.series.join(' → '));
      console.log('    정규화 : ' + d.rel.map(v => v.toFixed(3)).join(' → '));
      line(d.maxDrop <= 0.45, `[${lens}] 프레임당 최대 감소 ${d.maxDrop.toFixed(3)} (상한 0.45 — 비평가 2인 공통 처방)`);
      line(d.tailStep <= 0.45, `[${lens}] 소멸 낙차 ${d.tailStep.toFixed(3)} (상한 0.45)`);
      line(d.alive >= 3, `[${lens}] 살아 있는 프레임 ${d.alive} (하한 3 — «3~4프레임 ease-out»)`);
    }
  }

  console.log('\n== ③ 피격 링: 표적 드리프트 · 릴리스 ==');
  if (!r.hit) { console.log('  (측정 실패)'); fail++; }
  else {
    console.log('  수명       : ' + (r.hit.life * 1000).toFixed(0) + 'ms');
    console.log('  알파 열    : ' + r.hit.alphas.join(' → '));
    console.log('  프레임 낙차: ' + r.hit.drops.join(' / '));
    const md = r.hit.drops.length ? Math.max(...r.hit.drops) : 1;
    line(r.hit.drift <= 5, `표적 드리프트 최대 ${r.hit.drift.toFixed(2)} 게임px (상한 5 — AZ[15] 처방 «±5 게임px»)`);
    line(r.hit.life >= 0.30, `수명 ${(r.hit.life * 1000).toFixed(0)}ms (하한 300ms — 58 규칙 «단발 0.3~0.8초»)`);
    line(md <= 0.45, `프레임당 최대 알파 낙차 ${md.toFixed(3)} (상한 0.45)`);
  }

  console.log('\n== ④ 링 계층 분리 (피격 : 배경) ==');
  if (!r.tier) { console.log('  (측정 실패)'); fail++; }
  else {
    for (const x of r.tier.rows) console.log(`  f=${x.f.toFixed(2)}  선폭비 ${x.wR.toFixed(2)}x  불투명도비 ${x.aR.toFixed(2)}x`);
    line(r.tier.wMin >= 1.6, `선폭비 최저 ${r.tier.wMin.toFixed(2)}x (하한 1.6 — 수명 끝까지 유지)`);
    line(r.tier.aMin >= 1.5, `불투명도비 최저 ${r.tier.aMin.toFixed(2)}x (하한 1.5)`);
  }

  if (r.err.length) { console.log('\n측정 오류: ' + r.err.join(' / ')); fail += r.err.length; }
  console.log('\n콘솔 에러 ' + errs.length + '건');
  if (errs.length) { console.log(errs.slice(0, 5).join('\n')); fail++; }
  console.log(fail ? `\nPROBE114J FAIL (${fail})` : '\nPROBE114J PASS');
  process.exit(fail ? 1 : 0);
})();
