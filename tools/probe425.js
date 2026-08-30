/* 작업 425 재현 프로브 — «던전 보스 등장 연출 · 제한 시간은 전투 시작부터»
 *
 *   node tools/probe425.js
 *
 * 주인 원문: «던전은 보스 등장하면 등장하고 나서 전투 시작할때부터 시간 흘러야함.
 *             등장할때는 보스 잠깐 비췃다가 플레이어쪽으로 카메라 다시 하고 전투 시작해야함».
 *
 * 이 파일은 «고쳤다» 를 재는 게이트(`verify425.js`)가 아니라 **무엇이 어떻게 어긋나는가를 눈으로 보는**
 * 자리다(338 규칙 — 처방을 따르기 전에 재현한다). 던전 8종 + 탑 2종을 실제 진입점으로 굴리며
 *   ① 입장 프레임부터 `dunRun.t` 가 깎이는가 = **제한 시간이 새는 양**(초)
 *   ② 보스가 «필드에 실제로 선» 프레임(`bossIn`)까지 걸린 시간과 그때 남은 `dunRun.t`
 *   ③ 그 구간 내내 카메라가 플레이어에게 붙어 있는가(= 보스를 한 번도 안 비춘다)
 *      — `cam ↔ player` 거리 최대 · `cam ↔ boss` 거리 최소를 같이 찍는다
 *   ④ 페이즈 던전의 2번째 보스에서도 같은지
 * 를 찍는다.
 *
 * ⚠ 카메라는 `step()` 이 아니라 `loop()` 가 «실시간 dt» 로 부른다(108 주석) — rAF 를 얼린 뒤에는
 *    `camUpdate(dt)` 를 손으로 같이 돌려야 카메라가 한 프레임도 안 움직인다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  /* 425 4회차 — `frameInk` 가 아틀라스 픽셀을 읽는다. file:// 는 이 플래그가 없으면
     캔버스가 «교차 출처» 로 오염돼 rect 중심 폴백으로 떨어진다(verify348 선례). */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  /* 게임 루프를 얼린다 — 아래 step()/camUpdate() 호출만이 유일한 시계 (probe338 과 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const DUNS = await ev(() => DUNGEONS.concat(TOWERS)
    .map((d) => ({ id: d.id, n: d.n, bn: dunBossN(d), bm: dunBossMd(d), tw: isTower(d) })));
  if (DUNS.__err) { console.log('던전 목록 실패: ' + DUNS.__err); await browser.close(); process.exit(1); }

  const CONST = await ev(() => ({
    sec: DUN_SEC, dly: DUN_BOSS_DLY, pdly: DUN_PHASE_DLY,
    intro: (typeof bossIntroLen === 'function' ? bossIntroLen() : null),
  }));
  console.log('상수 — DUN_SEC ' + CONST.sec + 's · DUN_BOSS_DLY ' + CONST.dly + 's · DUN_PHASE_DLY ' + CONST.pdly +
              's · 등장 국면 ' + (CONST.intro === null ? '없음(수리 전)' : CONST.intro.toFixed(2) + 's'));
  console.log('던전·탑 ' + DUNS.length + '종\n');

  /* 한 던전을 실제 진입점으로 굴리며 매 프레임 t·카메라를 찍는다.
     보스를 죽이지 않는다 — 이 프로브가 보는 것은 «등장 구간» 이다. */
  const run = (id) => ev(([i]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const tw = TOWERS.find((x) => x.id === i);
    if (tw) {
      challengeTower(i);
    } else {
      const d = DUNGEONS.find((x) => x.id === i);
      S.dunTk[d.id] = 9;
      for (let k = 0; k < 8; k++) {
        const u = DUN_UI[d.id];
        if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
        if (!dunLocked(d)) break;
      }
      challengeDungeon(d);
    }
    if (!dunRun) return { err: '입장 실패' };

    const DT = 1 / 60;
    const camStep = () => { if (typeof camUpdate === 'function') camUpdate(DT); };
    const bossOf = () => enemies.find((e) => e.tk === 'dunboss' && e.hp > 0) || null;
    const d2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

    const t0 = dunRun.t;
    let f = 0, fIn = -1, tIn = null, fFight = -1, tFight = null;
    let camPlayMax = 0, camBossMin = Infinity, camBossAt = null, wSeen = 0;
    let hudAtIn = null;
    const hud = () => (document.getElementById('dunTmN') || {}).textContent;

    /* 최대 8초(가상)까지 — 등장 딜레이 1.4s + 등장 국면 + 여유 */
    while (dunRun && f < 60 * 8) {
      step(DT); camStep(); drawHud(); f++;
      const r = dunRun; if (!r) break;
      const b = bossOf();
      camPlayMax = Math.max(camPlayMax, d2(cam.x, cam.y, player.x, player.y));
      if (b) {
        const dB = d2(cam.x, cam.y, b.x, b.y);
        if (dB < camBossMin) { camBossMin = dB; camBossAt = +(f / 60).toFixed(3); }
      }
      if (typeof bossIntroW === 'function') wSeen = Math.max(wSeen, bossIntroW());
      if (fIn < 0 && r.bossIn) { fIn = f; tIn = +r.t.toFixed(4); hudAtIn = hud(); }
      /* «전투 시작» = 이 프레임에 t 가 처음 줄어든 프레임 */
      if (fFight < 0 && r.t < t0 - 1e-9) { fFight = f; tFight = +r.t.toFixed(4); }
      if (fIn > 0 && fFight > 0 && f > fIn + 180) break;
    }
    const r = dunRun;
    const out = {
      t0, f, sec: +(f / 60).toFixed(3),
      fIn, tIn, secIn: fIn < 0 ? null : +(fIn / 60).toFixed(3), hudAtIn,
      fFight, tFight, secFight: fFight < 0 ? null : +(fFight / 60).toFixed(3),
      leak: fIn < 0 || tIn === null ? null : +(t0 - tIn).toFixed(4),
      tNow: r ? +r.t.toFixed(4) : null,
      camPlayMax: +camPlayMax.toFixed(1),
      camBossMin: camBossMin === Infinity ? null : +camBossMin.toFixed(1),
      camBossAt, wSeen: +wSeen.toFixed(3),
      bn: r ? r.bossN : null, bm: r ? r.bossMode : null,
    };
    if (dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    const cl = document.getElementById('dclw'); if (cl) cl.classList.remove('on');
    if (typeof closeModal === 'function') closeModal();
    return out;
  }, [id]);

  /* 페이즈 던전의 «2번째 보스» — 첫 보스를 죽이고 다음 보스가 설 때 카메라가 또 가는가 */
  const runPhase2 = (id) => ev(([i]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const d = DUNGEONS.concat(TOWERS).find((x) => x.id === i);
    if (TOWERS.some((x) => x.id === i)) challengeTower(i);
    else {
      S.dunTk[d.id] = 9;
      for (let k = 0; k < 8; k++) {
        const u = DUN_UI[d.id];
        if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
        if (!dunLocked(d)) break;
      }
      challengeDungeon(d);
    }
    if (!dunRun || dunRun.bossMode !== 'phase' || dunRun.bossN < 2) {
      if (dunRun) endDunRun(false, true);
      return { skip: true };
    }
    const DT = 1 / 60;
    const camStep = () => { if (typeof camUpdate === 'function') camUpdate(DT); };
    /* 1번째 보스가 설 때까지 → 죽인다 → 2번째가 설 때까지의 카메라 왕복을 센다 */
    let g = 0;
    while (dunRun && !dunRun.bossIn && g++ < 600) { step(DT); camStep(); }
    /* ⚠ 국면이 **끝날 때까지** 흘린다 — `bossIntroW()` 는 국면이 막 열린 프레임에도 0 이라
       (이징 시작점) 그것으로 while 을 돌면 첫 프레임에 빠져나가 첫 왕복의 꼬리가 아래 표본에 섞인다. */
    let g2 = 0;
    while (dunRun && dunRun.introOn && g2++ < 600) { step(DT); camStep(); }
    const b1 = enemies.find((e) => e.tk === 'dunboss');
    if (b1) killEnemy(b1);
    let w2 = 0, camBossMin = Infinity, k = 0;
    const t0 = dunRun ? dunRun.t : 0;
    while (dunRun && !dunRun.bossDown && k++ < 600) {
      step(DT); camStep();
      if (typeof bossIntroW === 'function') w2 = Math.max(w2, bossIntroW());
      const b = enemies.find((e) => e.tk === 'dunboss' && e.hp > 0);
      if (b) camBossMin = Math.min(camBossMin, Math.hypot(cam.x - b.x, cam.y - b.y));
      if (dunRun && dunRun.bossUp >= 2 && k > 240) break;
    }
    const out = { w2: +w2.toFixed(3), camBossMin: camBossMin === Infinity ? null : +camBossMin.toFixed(1),
                  drop: dunRun ? +(t0 - dunRun.t).toFixed(3) : null, frames: k };
    if (dunRun) endDunRun(false, true);
    return out;
  }, [id]);

  console.log('① 입장 → 보스가 «필드에 선» 순간까지 제한 시간이 새는가 (t0 = ' + CONST.sec + 's)');
  console.log('   id          보스등장  그때 t    샌 양   HUD      전투시작  cam↔player최대  cam↔boss최소');
  let leakN = 0, camN = 0;
  const rows = [];
  for (const d of DUNS) {
    const r = await run(d.id);
    if (r.__err || r.err) { console.log('   ' + d.id.padEnd(11) + ' 실패: ' + (r.__err || r.err)); continue; }
    rows.push([d, r]);
    const leak = r.leak === null ? '—' : r.leak.toFixed(3) + 's';
    if (r.leak > 0.001) leakN++;
    if (r.camPlayMax > 60) camN++;
    console.log('   ' + d.id.padEnd(11) +
      String(r.secIn === null ? '—' : r.secIn.toFixed(3) + 's').padEnd(10) +
      String(r.tIn === null ? '—' : r.tIn.toFixed(3)).padEnd(10) +
      leak.padEnd(9) + String(r.hudAtIn).padEnd(9) +
      String(r.secFight === null ? '—' : r.secFight.toFixed(3) + 's').padEnd(10) +
      String(r.camPlayMax).padEnd(16) + String(r.camBossMin));
  }

  console.log('\n② 판정');
  console.log('   · 제한 시간이 «보스가 서기 전» 에 새는 던전: ' + leakN + ' / ' + rows.length +
              '  (0 이어야 주인 지시대로다)');
  console.log('   · 카메라가 플레이어에게서 60px 넘게 떨어진 던전: ' + camN + ' / ' + rows.length +
              '  (등장 연출이 있으면 > 0)');
  const wMax = rows.reduce((a, [, r]) => Math.max(a, r.wSeen || 0), 0);
  console.log('   · 등장 국면 가중치 최대 w = ' + wMax.toFixed(3) + '  (수리 전에는 함수 자체가 없어 0)');

  const ph = DUNS.filter((d) => d.bm === 'phase' && d.bn >= 2);
  if (ph.length) {
    console.log('\n③ 페이즈 던전 «2번째 보스» — 둘째부터는 안 비춘다 (' + ph[0].id + ')');
    const p = await runPhase2(ph[0].id);
    if (p.__err) console.log('   실패: ' + p.__err);
    else if (p.skip) console.log('   해당 없음');
    else console.log('   2번째 보스 구간 w 최대 = ' + p.w2 + ' · cam↔boss 최소 ' + p.camBossMin +
                     ' · 그 구간 t 감소 ' + p.drop + 's (' + p.frames + '프레임)');
  } else console.log('\n③ 페이즈 던전(bn≥2) 없음 — 건너뜀');

  console.log('\npageerror/console.error ' + errs.length + '건' + (errs.length ? '\n  ' + errs.slice(0, 3).join('\n  ') : ''));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
