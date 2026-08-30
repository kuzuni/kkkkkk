/* 작업 425 캡처 — 던전 보스 «등장 연출» 연속 프레임
 *
 *   node tools/cap425.js [던전id]        (기본 gold)
 *
 * ROUTINE [3]-(다) «연출 작업» — 정지 1장이 아니라 **연속 프레임 8장**을 비평가에게 준다.
 * ⚠ 고정 간격 촬영은 못 찍는다(LESSONS 92-1: `page.screenshot()` 한 장이 337~629ms).
 *    그래서 rAF 를 얼리고 `step()`·`camUpdate()` 를 **손으로** 정확한 프레임 수만큼 돌린 뒤 찍는다 = 오차 0.
 *
 * 프레임 규격(등장 국면 1.40s = 84프레임 · 그 앞 스폰 딜레이 1.4s):
 *   f1 보스가 선 프레임(u=0.00 · 아직 플레이어 화면)      f5 u=1.05 머묾 끝
 *   f2 u=0.18 팬 중간                                     f6 u=1.22 돌아오는 팬 중간
 *   f3 u=0.35 팬 끝(보스 중앙)                            f7 u=1.40 국면 끝(플레이어 복귀)
 *   f4 u=0.70 머묾 중간                                   f8 전투 시작 0.60초 뒤
 * 캡처는 `docs/review/425-f<n>.png` (.gitignore 로 커밋 차단 — 증거는 review .md 의 수치다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const ID = process.argv[2] || 'gold';
const OUT = path.join(ROOT, 'docs/review');

(async () => {
  /* 425 4회차 — `frameInk` 가 아틀라스 픽셀을 읽는다. file:// 는 이 플래그가 없으면
     캔버스가 «교차 출처» 로 오염돼 rect 중심 폴백으로 떨어진다(verify348 선례). */
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });

  const setup = await page.evaluate(([id]) => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if (dunRun) endDunRun(false, true);
    const d = DUNGEONS.find((x) => x.id === id);
    S.dunTk[d.id] = 9;
    for (let k = 0; k < 8; k++) {
      const u = DUN_UI[d.id];
      if (u && u.pre) S.dun[u.pre.id] = Math.max(S.dun[u.pre.id] | 0, u.pre.f + 1);
      if (!dunLocked(d)) break;
    }
    challengeDungeon(d);
    if (!dunRun) return { err: '입장 실패' };
    const tick = () => { step(1 / 60); camUpdate(1 / 60); draw(); drawHud(); };
    window.__c425 = { tick };
    /* 보스가 «필드에 설» 때까지 = 등장 국면이 열리는 프레임까지 */
    let g = 0;
    while (dunRun && !dunRun.bossIn && g++ < 600) tick();
    return { g, len: dunIntroLen(), sec: DUN_SEC, name: d.n };
  }, [ID]);
  if (setup.err) { console.log('실패: ' + setup.err); await browser.close(); process.exit(1); }
  console.log('입장 «' + setup.name + '» — 보스가 선 프레임 ' + setup.g + ' · 등장 국면 ' + setup.len.toFixed(2) + 's');

  const state = () => page.evaluate(() => {
    const b = enemies.find((e) => e.tk === 'dunboss' && e.hp > 0);
    return {
      u: dunRun ? +(dunRun.introT || 0).toFixed(3) : null,
      w: +dunIntroW().toFixed(3),
      t: dunRun ? +dunRun.t.toFixed(3) : null,
      hud: (document.getElementById('dunTmN') || {}).textContent,
      camPlayer: +Math.hypot(cam.x - player.x, cam.y - player.y).toFixed(1),
      camBoss: b ? +Math.hypot(cam.x - b.x, cam.y - b.y).toFixed(1) : null,
      /* 화면 좌표 — 카메라가 실제로 «누구를 가운데 놓았나» 를 픽셀로 말한다 */
      pScr: [+(player.x - cam.x + VW / 2).toFixed(1), +(player.y - cam.y + VH / 2).toFixed(1)],
      bScr: b ? [+(b.x - cam.x + VW / 2).toFixed(1), +(b.y - cam.y + VH / 2).toFixed(1)] : null,
      VW, VH, intro: !!(dunRun && dunRun.introOn), fight: !!(dunRun && dunRun.fight),
      /* 3회차 비평(CU·CV 2인 독립) — «정지 국면에서 보스가 좌우로 뒤집힌다» 를 픽셀로 봤다고 했다.
         `e.flip` 은 얼어 있는 적 갱신 루프에서만 써지므로 이 값이 f1~f7 내내 같으면 그 관측은
         «flip 이 아니라 애니메이션 프레임» 이다. 값을 직접 찍어 가른다(338 규칙 — 가설을 재현으로). */
      bFlip: b ? !!b.flip : null, bAnim: b ? b.anim : null, bAt: b ? +b.at.toFixed(2) : null,
      bBorn: b ? +b.born.toFixed(3) : null, pFlip: !!player.flip,
    };
  });
  const advance = (n) => page.evaluate(([k]) => { for (let i = 0; i < k; i++) window.__c425.tick(); }, [n]);

  /* u(초) 목표 → 프레임 수. 국면은 f1 시점에 u=0 이다. */
  const STOPS = [0, 0.18, 0.35, 0.70, 1.05, 1.22, 1.40, 2.00];
  const rows = [];
  let cur = 0;
  for (let i = 0; i < STOPS.length; i++) {
    const want = Math.round(STOPS[i] * 60);
    if (want > cur) { await advance(want - cur); cur = want; }
    const st = await state();
    /* ⚠ 찍기 직전에 **한 번 더 그린다**(상태는 안 움직인다 — `draw()` 는 현재 상태를 칠할 뿐이다).
       던전 입장은 `#app.dunrun` 으로 레이아웃을 바꾸고 그 뒤 ResizeObserver → `fit()` 이 전장 캔버스를
       **다시 잡으면서 지운다**. 그 리사이즈는 evaluate 가 끝난 뒤(다음 태스크)에 돌기 때문에,
       바로 찍으면 «칠해지기 전» 이 찍힌다 — 1회차 캡처의 f1 이 정확히 그래서 필드가 통째로 검었고
       비평가 CQ 가 그것을 ④ 3점으로 짚었다(파일 86.6KB vs 나머지 475KB). 제품 결함이 아니라 캡처 함정이다. */
    await page.waitForTimeout(60);
    await page.evaluate(() => { draw(); drawHud(); });
    const f = 'docs/review/425-f' + (i + 1) + '.png';
    await page.screenshot({ path: path.join(ROOT, f) });
    rows.push({ n: i + 1, at: STOPS[i], ...st });
    console.log('  f' + (i + 1) + ' u=' + STOPS[i].toFixed(2) + 's  w=' + String(st.w).padEnd(6) +
      ' HUD ' + String(st.hud).padEnd(6) + ' t=' + String(st.t).padEnd(7) +
      ' cam↔player ' + String(st.camPlayer).padEnd(7) + ' cam↔boss ' + String(st.camBoss).padEnd(7) +
      ' 보스 화면 ' + JSON.stringify(st.bScr) +
      ' flip=' + st.bFlip + ' anim=' + st.bAnim + ' at=' + st.bAt + ' born=' + st.bBorn);
  }
  fs.writeFileSync(path.join(OUT, '425-frames.json'), JSON.stringify(rows, null, 1));
  console.log('\n표: docs/review/425-frames.json · 캡처 8장 docs/review/425-f1..f8.png (커밋 안 됨)');
  console.log('pageerror ' + errs.length + '건');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
