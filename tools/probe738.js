/* 작업 738 재현 프로브 — «모드 전환 때 이전 모드의 전투 연출이 남는가»
 *
 *   node tools/probe738.js
 *
 * 주인 보고(2026-09-02 04:40): «승급전 도전할때 스테이지에서 있던 스킬들 찌꺼기 보임. 없어지게 해야하는데»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **무엇이 얼마나 남는가를 먼저 보는** 자리다
 * (338 규칙 — 처방을 따르기 전에 재현한다. 338·341 은 여기서 등재문 가설이 기각됐다).
 *
 * 방법 — «남은 것» 과 «새 모드가 스스로 만든 것» 을 섞지 않는다:
 *   전환 **직전**에 살아 있는 전투 연출 객체·DOM 노드에 전부 표식(`__p738`)을 찍고,
 *   전환 **직후 첫 프레임**에 그 표식이 몇 개 살아남았는지 센다.
 *   (승급전은 입장하면서 수호자·등장 국면·jzFx 를 스스로 만든다 — 그것을 «찌꺼기» 로 세면 거짓 빨강이다.)
 *
 * 축(전투 연출 배열 11종 + DOM 2층):
 *   shots(투사체) · parts(파티클) · nums(피해 숫자) · corpses(시체) · zones(장판) · booms(폭발)
 *   · bolts(전격) · drones(소환수) · rings(링) · ghosts(잔상) · spawnQ(스폰 예약) / #fxlc · #fxl
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* `P738_SRC` 로 다른 사본을 겨눌 수 있다 — «수리 전 트리» 표를 추측이 아니라 실행으로 얻는다
   (예: `git show HEAD~1:index.html > /tmp/pre.html && P738_SRC=/tmp/pre.html node tools/probe738.js`). */
const SRC = process.env.P738_SRC ? path.resolve(process.env.P738_SRC) : path.resolve(__dirname, '../index.html');

/* 갈아탈 대상 — 주인이 든 «승급전» 이 1순위이고, 같은 구조를 쓰는 나머지 모드도 같은 표에서 본다 */
const TOS = ['promo', 'dun', 'tower', 'raid', 'arena', 'stage'];

const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);

async function sweep(url) {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(url);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  /* 게임 루프를 얼린다 — 아래 step() 호출만이 유일한 시계(161 교훈 · probe665 와 같은 처방) */
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const rows = [];
  for (const to of TOS) {
    /* eslint-disable no-undef */
    const r = await ev((to) => {
      const DT = 1 / 60;
      const tick = (sec) => {
        for (let i = 0; i < Math.round(sec / DT); i++) { player.hp = stat.maxHp; player.dead = 0; step(DT); }
      };
      const ARR = ['shots', 'parts', 'nums', 'corpses', 'zones', 'booms', 'bolts', 'drones', 'rings', 'ghosts', 'spawnQ'];
      const bag = () => ({ shots, parts, nums, corpses, zones, booms, bolts, drones, rings, ghosts, spawnQ });

      /* ---- 공통 준비 ---- */
      localStorage.clear();
      Object.assign(S, DEF());
      /* 연출이 풍성한 스킬을 골고루 — 투사체·장판·전격·소환수·버프가 한 번씩 걸리게 */
      const use = SKILLS.slice(0, 8).map((s) => s.id);
      S.own = {}; for (const id of use) S.own[id] = { n: 0, l: 5 };
      S.eqSkill = use.slice(0, 6);
      S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0; S.dia = 999999; S.gold = 999999;
      for (const d of DUNGEONS) S.dunTk[d.id] = 9;
      for (const t of TOWERS) S.dunTk[t.id] = 9;
      /* ⚠ `raidLeft()` 는 «남은 횟수» 다(소진 수가 아니다) — 0 으로 두면 startRaid 가 문턱에서
         돌아서고 표가 «아무것도 안 지웠다» 로 읽힌다(1회차에 실제로 그랬다). */
      S.daily = S.daily || {}; S.daily.raid = RAID_TRY; S.daily.arena = 0;
      arena = null; raidOn = null; promo = null;
      if (dunRun) endDunRun(false, true);
      spawnStage();
      document.querySelectorAll('.modal.on, .mw.on, #defw.on').forEach((el) => el.classList.remove('on'));

      /* ---- 스테이지에서 스킬을 다발로 터뜨린다 ---- */
      tick(1.0);                                  /* 잡몹이 실제로 서야 스킬이 대상을 찾는다 */
      for (let round = 0; round < 3; round++) {
        for (const id of S.eqSkill) { const s = SK[id]; if (s) { try { castSkill(s); } catch (_) {} } }
        tick(0.15);
      }
      const before = {}; for (const k of ARR) before[k] = bag()[k].length;
      const domBefore = { fxlc: ($('fxlc') || { children: [] }).children.length,
                          fxl: ($('fxl') || { children: [] }).children.length };
      const liveTotal = ARR.reduce((a, k) => a + before[k], 0);

      /* ---- 표식 — «전환 직전에 살아 있던 것» 만 센다 ---- */
      for (const k of ARR) for (const o of bag()[k]) { try { o.__p738 = 1; } catch (_) {} }
      for (const id of ['fxlc', 'fxl']) {
        const l = $(id); if (!l) continue;
        for (const el of Array.prototype.slice.call(l.children)) el.setAttribute('data-p738', '1');
      }

      /* ---- 갈아타기 ---- */
      const dg = DUNGEONS[0];
      if (to === 'promo') startPromo();
      else if (to === 'dun') startDunRun(dg, (S.dun[dg.id] || 0) + 1);
      else if (to === 'tower') startDunRun(TOWER, towerFloor(TOWER));
      else if (to === 'raid') startRaid(RAIDS[0]);
      else if (to === 'arena') startArena();
      else if (to === 'stage') spawnStage();

      /* 전환 직후 «첫 프레임» — 아직 step() 을 한 번도 안 돌린 자리다(등재문의 축 그대로) */
      const left = {}; for (const k of ARR) left[k] = bag()[k].filter((o) => o && o.__p738).length;
      const domLeft = {};
      for (const id of ['fxlc', 'fxl']) {
        const l = $(id);
        domLeft[id] = l ? l.querySelectorAll('[data-p738]').length : 0;
      }
      const md = (typeof bossMode === 'function') ? bossMode() : '?';
      const leftTotal = ARR.reduce((a, k) => a + left[k], 0);
      return { before, liveTotal, left, leftTotal, domBefore, domLeft, md,
               arrs: ARR.filter((k) => left[k] > 0).map((k) => k + ':' + left[k]) };
    }, to);
    /* eslint-enable no-undef */
    rows.push({ to, r });
  }
  await browser.close();
  return { rows, errs };
}

(async () => {
  const { rows, errs } = await sweep('file://' + SRC);
  console.log('\n===== probe738 — 스테이지에서 스킬 다발 발동 직후 갈아탄다 =====');
  console.log('새 모드 | 전환 전 살아있던 연출 | 전환 후 mode | 남은 연출(표식) | 남은 DOM(fxlc/fxl)');
  let bad = 0;
  for (const { to, r } of rows) {
    if (r.__err) { console.log(pad(to, 8) + '| ⚠ ' + r.__err); bad++; continue; }
    const dom = r.domLeft.fxlc + '/' + r.domLeft.fxl;
    const verdict = r.leftTotal > 0 ? '🔴 찌꺼기' : '초록';
    console.log(pad(to, 8) + '| ' + pad(String(r.liveTotal), 22) + '| ' + pad(String(r.md), 13) + '| '
      + pad(String(r.leftTotal) + (r.arrs.length ? ' (' + r.arrs.join(' ') + ')' : ''), 46) + '| ' + dom + '  ' + verdict);
    if (r.leftTotal > 0) bad++;
  }
  if (errs.length) console.log('콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  console.log('요약 — 찌꺼기가 남는 모드 ' + bad + ' / ' + rows.length);
  console.log('\nprobe738 — 재현 자다(합격/불합격이 아니라 «무엇이 얼마나 남는가» 를 본다).');
})().catch((e) => { console.error(e); process.exit(1); });
