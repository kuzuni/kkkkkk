#!/usr/bin/env node
/* 작업 556 재현 — `verify359` §5 「적 30마리 틱 처리 ≤ 30ms」 이 왜 흔들리는가,
 * 그리고 그 자리에 무엇을 놓을 수 있는가(237 선례의 «작업량 예산» 을 이 씬에 맞춰 시험한다).
 *
 *   node tools/probe556.js                     → 마지막 줄이 `PROBE556 n/n PASS`
 *   node tools/probe556.js --frames 600 --reps 3
 *   node tools/probe556.js --inject 1          → 대시 블록에 «일부러 무거운» 사본으로 재본다(주입 시험)
 *
 * 등재문(556)이 갈래 셋을 적어 뒀다 — 이 자는 그 셋을 **찍힌 값으로** 가른다:
 *   ⓐ 러너 CPU 경합(측정 자체가 흔들린다)
 *   ⓑ 표본의 «적 78마리» 가 회차마다 다른가(예산은 «30마리» 인데 실측 표본이 그보다 크다)
 *   ⓒ 워밍업 프레임이 포함되는가
 *
 * [A] 현행 재현 — `verify359` RUN_MOB 과 같은 규칙(20 아래로 떨어질 때만 30 으로 리필).
 * [B] 후보 씬  — 237 `perf237.js` 와 같은 꼴의 **고정 씬**: 적 30마리를 링에 세우고 hp 를
 *     불멸로 둬 죽음·리필·전리품이 안 섞이게 한다. 이 씬에서 네 축의 «회차 간 폭» 을 잰다:
 *       ① 시간 ms/프레임            ② 프레임당 캔버스 명령 수(237 ⓐ 와 같은 자)
 *       ③ 프레임당 Math 호출 수(틱 «로직» 의 작업량 — 359 가 더한 것은 그림이 아니라 상태 기계다)
 *       ④ 같은 실행 안 «부하 ÷ 기준선» 비(237 ⓑ · 기준선 = 적 0)
 *     그리고 게임과 무관한 고정 산술 자(`cal`)로 러너 속도를 따로 뽑는다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FRAMES = arg('--frames', 600);
const REPS = arg('--reps', 3);
const INJECT = arg('--inject', 0);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const stat = a => {
  const s = a.slice().map(Number).sort((x, y) => x - y);
  const med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  return { min: s[0], max: s[s.length - 1], med, spread: med ? (s[s.length - 1] - s[0]) / med : 0 };
};
const show = (nm, st, unit) => ok(true, nm, `${st.min}~${st.max}${unit || ''} · 중앙값 ${st.med} · 폭 ${(st.spread * 100).toFixed(1)}%`);

const RUN = async ({ frames }) => {
  /* 게임과 무관한 고정 산술 — 러너 속도만 잰다 */
  const cal = () => { const t = performance.now(); let x = 0; for (let i = 0; i < 4e6; i++) x += (i % 7) * 1.000001; return +(performance.now() - t).toFixed(3); };

  /* [A] 현행 재현 — verify359 RUN_MOB 과 같은 규칙 */
  const runCur = async n => {
    S.stage = 30; S.best = 30; S.bossFarm = false;
    spawnStage();
    for (let i = 0; i < 30; i++) makeEnemy('zombie');
    const cnt = []; const t0 = performance.now();
    for (let f = 0; f < n; f++) {
      player.hp = stat.maxHp; player.dead = 0;
      cnt.push(enemies.length);
      window.__v359tick();
      if (enemies.length < 20) for (let i = enemies.length; i < 30; i++) makeEnemy('zombie');
      if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return { ms: +((performance.now() - t0) / n).toFixed(3), nMin: Math.min.apply(null, cnt), nMax: Math.max.apply(null, cnt), nEnd: enemies.length };
  };

  /* [B] 고정 씬 — 237 perf237.scene() 과 같은 꼴 */
  const scene = n => {
    S.stage = 30; S.best = 30; S.bossFarm = false;
    try { sbufClear(); } catch (_) {}
    try { markDirty(); } catch (_) {}
    shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
    rings.length = 0; parts.length = 0; enemies.length = 0; spawnQ.length = 0;
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 99; player.hp = stat.maxHp;
    for (let i = 0; i < n; i++) makeEnemy('zombie');
    enemies.forEach((e, i) => {
      e.born = 1; e.hp = e.max = 1e12;
      const a = i * 6.283 / Math.max(1, n);
      e.x = player.x + Math.cos(a) * (150 + (i % 5) * 45);   /* DASH.mob 창 120~380 안 */
      e.y = player.y + Math.sin(a) * (150 + (i % 5) * 45);
    });
  };
  const keep = n => {                       /* 표본을 «정확히 n» 으로 유지 — 죽음·리필이 안 섞이게 */
    while (enemies.length > n) enemies.pop();
    for (let i = enemies.length; i < n; i++) makeEnemy('zombie');
    enemies.forEach(e => { if (e.hp < 1e11) e.hp = e.max = 1e12; });
    player.hp = stat.maxHp; player.dead = 0; player.inv = 99;
  };
  const spin = (n, frames) => {
    scene(n);
    let dashN = 0, seen = new Set(), cMin = 1e9, cMax = 0;
    const t0 = performance.now();
    for (let f = 0; f < frames; f++) {
      cMin = Math.min(cMin, enemies.length); cMax = Math.max(cMax, enemies.length);
      for (const e of enemies) { const inD = e.dashT > 0 || e.dashD > 0; if (inD && !seen.has(e)) { dashN++; seen.add(e); } else if (!inD) seen.delete(e); }
      step(1 / 60); draw();
      keep(n);
    }
    return { ms: +((performance.now() - t0) / frames).toFixed(3), dashN, cMin, cMax };
  };

  /* 작업량 자 둘 — 캔버스 명령(237 ⓐ) · Math 호출(틱 로직) */
  const CP = CanvasRenderingContext2D.prototype;
  const OPS = ['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText', 'clearRect', 'putImageData', 'arc', 'ellipse', 'createRadialGradient', 'createLinearGradient'];
  const MOPS = ['hypot', 'atan2', 'sqrt', 'cos', 'sin', 'random', 'max', 'min', 'abs'];
  const cnt = { c: 0, m: 0 }, orig = {}, morig = {};
  OPS.forEach(k => { const f = CP[k]; if (typeof f !== 'function') return; orig[k] = f; CP[k] = function () { cnt.c++; return f.apply(this, arguments); }; });
  MOPS.forEach(k => { const f = Math[k]; if (typeof f !== 'function') return; morig[k] = f; Math[k] = function () { cnt.m++; return f.apply(Math, arguments); }; });
  const work = (n, frames) => {
    scene(n);
    cnt.c = 0; cnt.m = 0;
    for (let f = 0; f < frames; f++) { step(1 / 60); draw(); keep(n); }
    return { ops: +(cnt.c / frames).toFixed(1), mops: +(cnt.m / frames).toFixed(1) };
  };
  /* [현행] 씬의 작업량 — «주입이 그 씬에서도 살아 있는가» 를 확인하는 대조군 */
  const curWork = async frames => {
    S.stage = 30; S.best = 30; S.bossFarm = false;
    spawnStage();
    for (let i = 0; i < 30; i++) makeEnemy('zombie');
    cnt.c = 0; cnt.m = 0;
    for (let f = 0; f < frames; f++) {
      player.hp = stat.maxHp; player.dead = 0;
      window.__v359tick();
      if (enemies.length < 20) for (let i = enemies.length; i < 30; i++) makeEnemy('zombie');
      if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return { ops: +(cnt.c / frames).toFixed(1), mops: +(cnt.m / frames).toFixed(1), n: enemies.length };
  };

  const c0 = cal();
  const cur = await runCur(frames);
  spin(30, 60);                                    /* 워밍업 */
  const pairs = [];
  for (let k = 0; k < 3; k++) { const b = spin(0, Math.round(frames / 3)); const h = spin(30, Math.round(frames / 3)); pairs.push({ base: b.ms, heavy: h.ms, ratio: +(h.ms / b.ms).toFixed(3), dashN: h.dashN, cMin: h.cMin, cMax: h.cMax }); }
  const w = work(30, Math.round(frames / 3));
  const wBase = work(0, Math.round(frames / 6));
  const wCur = await curWork(Math.round(frames / 3));
  const c1 = cal();
  OPS.forEach(k => { if (orig[k]) CP[k] = orig[k]; });
  MOPS.forEach(k => { if (morig[k]) Math[k] = morig[k]; });
  return { cur, pairs, w, wBase, wCur, cal: +((c0 + c1) / 2).toFixed(3) };
};

async function openPage(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e && e.message || e)));
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v359tick = () => { vt += 1000 / 60; const l = q.splice(0, q.length); for (const cb of l) { try { cb(vt); } catch (e) {} } };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto('file://' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v359tick(); });
  return { page, ctx, errs };
}

(async () => {
  let file = SRC;
  if (INJECT) {                                    /* 주입 시험 — 대시 상태 기계에 «무거운» 한 줄을 넣은 사본 */
    const raw = fs.readFileSync(SRC, 'utf8');
    const anchor = 'const DK = isBoss ? DASH.boss : DASH.mob;';
    if (raw.indexOf(anchor) < 0) { console.log('주입 앵커를 못 찾았다'); process.exit(1); }
    const inj = raw.replace(anchor, anchor + ' for (let __i = 0; __i < 400; __i++) Math.hypot(__i, e.x, e.y);');
    file = path.join(ROOT, 'docs', 'shots', '__probe556-inject.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, inj);
    console.log('[주입] 대시 블록에 프레임·적당 Math.hypot 400회를 넣은 사본으로 잰다');
  }
  const browser = await launch(chromium);
  const R = []; let errs = [];
  try {
    for (let i = 0; i < REPS; i++) {
      const h = await openPage(browser, file);
      const r = await h.page.evaluate(RUN, { frames: FRAMES });
      errs = errs.concat(h.errs);
      await h.ctx.close();
      R.push(r);
      console.log(`  회차 ${i + 1}: [현행] ${r.cur.ms}ms(적 ${r.cur.nMin}~${r.cur.nMax}→${r.cur.nEnd}) · ` +
        `[고정] ${r.pairs.map(p => p.heavy).join('/')}ms · 기준선 ${r.pairs.map(p => p.base).join('/')}ms · ` +
        `비 ${r.pairs.map(p => p.ratio).join('/')} · 명령 ${r.w.ops} · Math ${r.w.mops} · ` +
        `[현행]작업량 명령 ${r.wCur.ops}/Math ${r.wCur.mops}(적 ${r.wCur.n}) · cal ${r.cal}ms`);
    }
  } finally { await browser.close(); if (INJECT) try { fs.unlinkSync(file); } catch (_) {} }

  const med = a => stat(a).med;
  console.log('\n=== [1] ⓑ 표본이 고정돼 있는가 ===');
  show('1-a [현행] 끝 적 수', stat(R.map(r => r.cur.nEnd)), '마리');
  ok(R.every(r => r.cur.nMax > 30), '1-b [현행] 은 라벨(«적 30마리»)보다 많은 적을 잰다', `최대 ${stat(R.map(r => r.cur.nMax)).max}마리`);
  ok(R.every(r => r.pairs.every(p => p.cMin === 30 && p.cMax === 30)), '1-c [고정 씬] 은 매 프레임 정확히 30마리다',
    R.map(r => r.pairs.map(p => `${p.cMin}~${p.cMax}`).join(',')).join(' · '));
  ok(R.every(r => r.pairs.every(p => p.dashN > 0)), '1-d 그 씬에서 대시가 실제로 일어난다(빈 씬을 재는 게 아니다)',
    R.map(r => r.pairs.map(p => p.dashN).join('/')).join(' · '));

  console.log('\n=== [2] 축별 회차 간 폭 — 자를 어디에 둘까 ===');
  show('2-a 게임 무관 자(cal)', stat(R.map(r => r.cal)), 'ms');
  show('2-b [현행] ms(= 지금 §5 가 재는 값)', stat(R.map(r => r.cur.ms)), 'ms');
  show('2-c [고정 씬] ms', stat(R.map(r => med(r.pairs.map(p => p.heavy)))), 'ms');
  show('2-d 부하÷기준선 비(같은 실행 안)', stat(R.map(r => med(r.pairs.map(p => p.ratio)))));
  show('2-e 프레임당 캔버스 명령 수', stat(R.map(r => r.w.ops)));
  show('2-f 프레임당 Math 호출 수', stat(R.map(r => r.w.mops)));
  ok(true, '2-g 기준선(적 0) 작업량', `명령 ${stat(R.map(r => r.wBase.ops)).med} · Math ${stat(R.map(r => r.wBase.mops)).med}`);
  show('2-h [현행] 씬의 Math 호출 수(대조군 — 주입이 거기서도 사는가)', stat(R.map(r => r.wCur.mops)));

  console.log('\n=== [3] 에러 ===');
  ok(errs.length === 0, '3 pageerror 0건', errs.slice(0, 3).join(' | ') || '0건');

  console.log('\n| 회차 | 현행 ms | 끝 적 | 고정 ms | 기준선 ms | 비 | 명령/프레임 | Math/프레임 | cal ms |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  R.forEach((r, i) => console.log(`| ${i + 1} | ${r.cur.ms} | ${r.cur.nEnd} | ${med(r.pairs.map(p => p.heavy))} | ${med(r.pairs.map(p => p.base))} | ${med(r.pairs.map(p => p.ratio))} | ${r.w.ops} | ${r.w.mops} | ${r.cal} |`));

  console.log(`\nPROBE556 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
