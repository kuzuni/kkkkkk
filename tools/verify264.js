/* 264 — 「시련의 탑도 «보스» 전투 · DPS 측정장은 «죽지 않는 보스에게 30초 동안 넣은 피해»」 기능 게이트.
 *
 * 저장소 주인 지시 원문(2026-08-27):
 *   «시련의 탑도 보스가 떠야 하는 거고 dps 도 마찬가지다 /
 *    dps 적은 안 죽고 데미지만 30초 만에 얼마나 넣는지 측정하는 용임»
 *
 * ROUTINE.md «기능 완성 규칙» — «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작하고 결과가
 * 저장(S)·HUD·다른 화면에 반영됨» 이 완료 조건이다. 그래서 이 게이트는 **버튼을 실제로 눌러**
 * 무엇이 바뀌는지 본다(§8 기능 체크 표).
 *
 * 지키는 것 6가지:
 *   ① 탑(209 시련 · 210 절망) 전투는 **보스 1마리** 전투다 — 그 카드에 그려진 몬스터가 선다(178/233)
 *   ② 탑의 클리어는 **보스 격파**다 — 요구 피해를 다 채워도 그것만으로는 안 끝난다(255 규칙 승격)
 *   ③ 격파하면 층 +1 · 보상 지급 · 세이브 반영, 실패 통보는 «보스» 를 말한다
 *   ④ DPS 측정장 제한 시간 = **30초**(카드·04 세부·런 타이머가 같은 값을 본다)
 *   ⑤ 샌드백은 **보스 규격 + 보스 등장**(BGM/등장음)이되 **안 죽고 반격 없음** 은 그대로다
 *   ⑥ 기록은 «어느 길이의 창에서 잰 값인가»(sec)를 들고 다니고, 창이 바뀌면 DPS 는 두고
 *      총 피해량만 환산한다 — 초기화가 아니다(주인 결정 ⓐ 의 «60초 환산»)
 *
 *   node tools/verify264.js
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const yes = (m, c, d) => (c ? ok(m + (d === undefined ? '' : ' — ' + d)) : no(m + (d === undefined ? '' : ' — ' + d)));
const near = (m, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(m + ' = ' + (+got).toFixed(2) + ' (기대 ' + want + ', Δ' + Math.abs(got - want).toFixed(2) + ')')
  : no(m + ' = ' + (+got).toFixed(2) + ' — 기대 ' + want + ' (허용 ' + tol + ')'));

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const reset = () => page.evaluate(() => {
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    if (typeof raidOn !== 'undefined' && raidOn) endRaid(false);
    document.querySelectorAll('.modal.on, .mw.on').forEach((el) => el.classList.remove('on'));
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
  });

  /* ─────────────────────────────────────────────────────────────────────────
     §1 데이터 — 표가 유일한 출처다
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[1] 데이터 — 제한 시간 30초 · 탑은 보스 1마리');
  const d1 = await page.evaluate(() => ({
    sec: RAIDS[0].sec, id: RAIDS[0].id, n: RAIDS[0].n,
    towerBn: TOWERS.map((t) => ({ id: t.id, bn: dunBossN(t), md: dunBossMd(t), ui: !!DUN_UI[t.id] })),
  }));
  is('④ RAIDS[0].sec = 30초 (주인 지시 «30초 만에»)', d1.sec, 30);
  is('④ id 는 세이브 키라 r60 그대로 (123 이 버린 옛 r30 기록 부활 방지)', d1.id, 'r60');
  for (const t of d1.towerBn) {
    yes('① ' + t.id + ' — DUN_UI 항목이 있다(보스가 «그 카드의 몬스터»)', t.ui);
    is('① ' + t.id + ' — 보스 수 (층 하나 = 보스 하나)', t.bn, 1);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     §2 탑 — 보스가 실제로 «그 카드의 몬스터» 로, «보스 크기» 로 선다
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[2] ① 탑 전투 — 카드의 몬스터가 보스 크기로 선다 (178/233 규칙)');
  for (const tid of ['tower', 'despair']) {
    await reset();
    const r = await page.evaluate(([id]) => {
      challengeTower(id);
      if (!dunRun) return { err: 'challengeTower 실패' };
      /* 331 — 소환 눈금 폐지: 입장이 곧 보스 예약이다(dmg 를 안 건드린다) */
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (!b) return { err: '보스가 안 선다' };
      const u = DUN_UI[id], f = dunBossFrame(u, dunBossAnims(u).walk);
      return {
        atlas: b.T.atlas, walk: b.T.walk, cardAtlas: u.thk, cardWalk: dunBossAnims(u).walk,
        drawnH: f[3] * b.T.scale, bossH: bossDrawnH(),
        mobs: enemies.filter((e) => e.tk !== 'dunboss').length,
        hp: b.hp, need: dunRun.need, hpk: DUN_BOSS_HPK,
      };
    }, [tid]);
    if (r.err) { no(tid + ' — ' + r.err); continue; }
    is('① ' + tid + ' — 보스 아틀라스 = 카드 썸네일 아틀라스', r.atlas, r.cardAtlas);
    is('① ' + tid + ' — 보스 애니 = 카드 썸네일 애니', r.walk, r.cardWalk);
    near('① ' + tid + ' — 그려진 높이 = 28 스테이지 보스와 같다', r.drawnH, r.bossH, 1.5);
    near('① ' + tid + ' — 체력 = 요구 피해 × ' + r.hpk, r.hp, r.need * r.hpk, 1);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     §3 탑 — 클리어 판정이 «보스 격파» 다 (요구 피해 충족만으로는 안 끝난다)
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[3] ②③ 탑 클리어 = 보스 격파 (요구 피해는 «보스를 부르는 눈금» 일 뿐)');
  for (const tid of ['tower', 'despair']) {
    await reset();
    const r = await page.evaluate(([id]) => {
      /* 보상 키(`rel`)와 세이브 키(`S.relic`)가 다르다 — giveReward 의 대응표를 그대로 옮겨 적는다 */
      const SKEY = { rel: 'relic', dia: 'dia', gold: 'gold', stone: 'stone', rstone: 'rstone', tstone: 'tstone' };
      const t = towerById(id), key = t.fk, rwKey = Object.keys(t.rw(1))[0], sKey = SKEY[rwKey] || rwKey;
      challengeTower(id);
      if (!dunRun) return { err: 'challengeTower 실패' };
      const f0 = towerFloor(t), want = t.rw(f0)[rwKey];
      S[sKey] = 0;
      /* ② 요구 피해를 통째로 채운다 — 264 이전이면 여기서 런이 끝나고 층이 올랐다 */
      dunRun.dmg = dunRun.need;
      step(1 / 60);
      const mid = { run: !!dunRun, f: towerFloor(t), prog: dunRunProg() };
      if (!dunRun) return { err: '요구 피해만으로 런이 끝났다(옛 판정 잔존)', f0, mid };
      /* ③ 보스를 세우고 실제로 잡는다 */
      dunBossTick();
      spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
      step(1 / 60);
      const b = enemies.find((e) => e.tk === 'dunboss');
      if (!b) return { err: '보스가 안 선다', f0, mid };
      killEnemy(b);
      const progAtKill = dunRunProg();
      /* 332 이관 — 격파와 완료 화면 사이에 «터짐 → 클리어 → 1초» 시퀀스가 들어갔다.
         한 틱으로는 아직 안 끝나고(run1), 시퀀스를 다 돌려야 층·보상·클리어 화면이 온다. */
      step(1 / 60);
      const run1 = !!dunRun;
      for (let g = 0; g < 600 && dunRun; g++) step(1 / 60);
      let saved = 'ERR';
      try { saved = JSON.parse(localStorage.getItem(KEY))[key]; } catch (e) { /* noop */ }
      return { f0, mid, progAtKill, run1, run: !!dunRun, f1: towerFloor(t), rwKey: rwKey + '→S.' + sKey, want,
               got: S[sKey], saved, clw: document.getElementById('dclw').classList.contains('on') };
    }, [tid]);
    if (r.err) { no(tid + ' — ' + r.err); continue; }
    is('② ' + tid + ' — 요구 피해 100% 를 채워도 런이 계속된다', r.mid.run, true);
    is('② ' + tid + ' — 그때 층은 그대로 ' + r.f0, r.mid.f, r.f0);
    /* ⚑ 331 이관 — 옛 단언은 «앞 국면이 DUN_BOSS_P(0.3)에서 멈춘다» 였다. 몹 국면이 폐지돼
       앞 국면 몫이 사라졌으므로 같은 표본을 «누적 피해는 바를 못 민다»(0) 로 뒤집어 옮긴다. */
    near('② ' + tid + ' — 331: 요구 피해 100% 를 채워도 진행바는 0 이다(앞 국면 잔재 없음)', r.mid.prog, 0, 0.001);
    near('③ ' + tid + ' — 격파 순간 진행바 = 1 (바가 끝에 닿는 순간이 곧 클리어)', r.progAtKill, 1, 0.001);
    is('③ ' + tid + ' — 332: 격파 다음 틱에는 아직 시퀀스 중', r.run1, true);
    is('③ ' + tid + ' — 시퀀스가 끝나면 런 종료', r.run, false);
    is('③ ' + tid + ' — 층 ' + r.f0 + ' → ' + r.f1, r.f1, r.f0 + 1);
    is('③ ' + tid + ' — 보상(' + r.rwKey + ')이 실제로 들어온다', r.got, r.want);
    is('③ ' + tid + ' — 진행이 세이브에 남는다', r.saved, r.f0 + 1);
    yes('③ ' + tid + ' — 31 클리어 화면이 뜬다', r.clw);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     §4 탑 — 실패 통보가 «보스» 를 말한다 (옛 «피해 n/m» 폐기)
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[4] ③ 탑 실패 통보 — 사유가 «보스» 다');
  for (const [tid, label, tick] of [['tower', '보스 미등장', false], ['despair', '보스 체력 남음', true]]) {
    await reset();
    const r = await page.evaluate(([id, doTick]) => {
      challengeTower(id);
      if (!dunRun) return { err: 'challengeTower 실패' };
      if (doTick) {
        /* 331 — 소환 눈금 폐지: 보스는 startDunRun/challengeTower 가 이미 예약했다 */
        dunBossTick();
        spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
        step(1 / 60);
        const b = enemies.find((e) => e.tk === 'dunboss');
        if (b) b.hp = b.max * 0.4;
      }
      /* ⚑ 425 이관(2026-08-30) — 제한 시간은 «보스가 서고 등장 국면이 끝난 뒤» 부터 흐른다.
         · `doTick`(보스 체력 남음) 갈래: 국면이 끝날 때까지 흘린 **뒤에** 시간 초과를 만든다.
         · 보스 미등장 갈래: 시간 초과로는 이제 닿을 수 없다(그래서 이 문구는 방어 분기다 —
           index.html finishDunRun 주석). 그 사실 자체를 아래 [E-425] 로 묻고, 갈래의 «뜻» 은
           «보스 전에 실패로 끝난 런» 을 직접 만들어 확인한다. 항을 눌러 초록으로 되돌리지 않는다. */
      let msg = '', noTimeout = null;
      if (doTick) for (let i = 0; i < 900 && dunRun && !dunRun.fight; i++) step(1 / 60);
      else {
        /* ⚠ 60프레임까지만 흘린다 — 스폰 딜레이가 1.4초(84프레임)라 그 안쪽이어야 «보스 미등장» 이
           실제로 미등장이다. 90프레임을 흘렸더니 보스가 서서 «체력 100% 남음» 이 떴다(1차 실측). */
        dunRun.t = 0.005;
        for (let i = 0; i < 60 && dunRun; i++) step(1 / 60);
        noTimeout = { run: !!dunRun, t: dunRun ? dunRun.t : null, fight: !!(dunRun && dunRun.fight),
                      bossIn: !!(dunRun && dunRun.bossIn) };
      }
      const on = notify;
      notify = function (m) { msg = String(m); return on.apply(this, arguments); };
      if (doTick) { dunRun.t = 0.005; step(1 / 60); }
      else endDunRun(false);                     /* 보스가 서기 전의 실패 — 방어 분기를 직접 태운다 */
      notify = on;
      return { msg: msg.replace(/<[^>]+>/g, ''), f: towerFloor(towerById(id)), noTimeout };
    }, [tid, tick]);
    if (r.err) { no(tid + ' — ' + r.err); continue; }
    if (r.noTimeout) {
      is('[E-425] ③ ' + tid + ' — 보스가 서기 전에는 t=0.005 여도 시간 초과가 없다', r.noTimeout.run, true);
      is('[E-425] ③ ' + tid + ' — 그 동안 t 는 한 프레임도 안 깎인다', r.noTimeout.t, 0.005);
      is('[E-425] ③ ' + tid + ' — 표본이 실제로 «보스 미등장» 이다(스폰 딜레이 안쪽)', r.noTimeout.bossIn, false);
    }
    yes('③ ' + tid + ' — 실패 통보가 보스를 말한다 (' + label + ')',
      /보스\s*(미등장|체력)/.test(r.msg), '«' + r.msg + '»');
    yes('③ ' + tid + ' — 옛 «피해 n / m» 문구가 남아 있지 않다', !/피해\s*[\d.,]+\s*\//.test(r.msg));
    is('③ ' + tid + ' — 실패하면 층은 그대로', r.f, 1);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     §5 DPS 측정장 — 30초가 카드·세부 팝업·런 타이머 세 곳에 같이 박힌다
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[5] ④ DPS 측정장 30초 — 카드 · 04 세부 · 런 타이머');
  await reset();
  const d5 = await page.evaluate(() => {
    openDungeon();
    document.querySelector('#dunSub [data-dsub="raid"]').click();
    const card = document.querySelector('#dunList [data-rcard="r60"]');
    const cardSec = card && card.querySelector('.sp.lv i').textContent.trim();
    openRaidDetail(RAIDS[0]);
    const dgdSec = document.getElementById('dgdFloor').textContent.trim();
    return { cardSec, dgdSec, sec: RAIDS[0].sec };
  });
  is('④ 카드 «제한 시간(초)» 표기', d5.cardSec, String(d5.sec));
  is('④ 04 세부 팝업 «제한 시간»', d5.dgdSec, d5.sec + '초');

  /* ─────────────────────────────────────────────────────────────────────────
     §6 샌드백 — «보스» 로 뜨되 안 죽고 반격이 없다
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[6] ⑤ 샌드백 = 죽지 않는 보스 (등장 연출 있음 · 반격 없음)');
  await reset();
  const d6 = await page.evaluate(() => {
    bgmSet('main');
    const bgm0 = bgmWant, left0 = raidLeft();
    document.getElementById('dgdGo').click();          /* 04 세부 [도전] 을 실제로 누른다 */
    if (!raidOn) return { err: '[도전] 이 레이드를 시작하지 않았다' };
    const b = enemies.find((e) => e.raid);
    if (!b) return { err: '샌드백이 안 섰다' };
    const hp0 = b.hp;
    hitEnemy(b, 1234, false);                          /* 때려 본다 — 죽지도, 체력이 줄지도 않아야 한다 */
    const dmg0 = raidDmg;
    drawBossHud();                                     /* HUD 는 다음 프레임에 그려진다 — 여기서 한 번 돌린다 */
    return {
      bgm0, bgmIn: bgmWant, left0, left1: raidLeft(), t: raidT, sec: raidOn.sec,
      tk: b.tk, scale: b.T.scale, r: b.r, col: b.T.col, atkDmg: b.dmg, gold: b.gold,
      bossScale: ETYPE.boss.scale, bossR: ETYPE.boss.r,
      alive: enemies.includes(b), hpKept: b.hp === hp0 && b.hp === b.max, dmg0,
      others: enemies.filter((e) => !e.raid).length,
      hud: document.getElementById('bossTm').classList.contains('on'),
    };
  });
  if (d6.err) { no('⑤ ' + d6.err); } else {
    is('④ 런 타이머가 30초에서 시작한다', Math.round(d6.t), d6.sec);
    is('⑤ 샌드백은 보스 종(tk)이다', d6.tk, 'boss');
    is('⑤ 보스 배율 그대로', d6.scale, d6.bossScale);
    is('⑤ 보스 판정 반경 그대로', d6.r, d6.bossR);
    is('⑤ 보스 금색 체력바 색 그대로', d6.col, '#ffca5c');
    is('⑤ 반격 없음 — 공격력 0', d6.atkDmg, 0);
    is('⑤ 보상 없음 — 골드 0', d6.gold, 0);
    is('⑤ 몹은 한 마리도 안 선다 (샌드백 1마리 전투)', d6.others, 0);
    yes('⑤ 때려도 죽지 않고 체력이 만피로 되돌아온다', d6.alive && d6.hpKept);
    is('⑤ 그래도 피해는 집계된다', d6.dmg0, 1234);
    yes('⑤ **등장 연출** — 입장에서 보스 BGM 으로 갈아탄다 (264 신설)',
      d6.bgm0 === 'main' && d6.bgmIn === 'boss', d6.bgm0 + ' → ' + d6.bgmIn);
    yes('⑤ 28 보스전 HUD(⏱ 타이머) 재사용', d6.hud);
    is('§8 [도전] 이 남은 횟수를 1 깎는다 (205)', d6.left1, d6.left0 - 1);
  }
  yes('⑤ 소스에 startRaid → bossInSfx 경로가 실재한다',
    /makeEnemy\('boss'\)[\s\S]{0,1200}?bossInSfx\(e\)/.test(SRC));

  /* ─────────────────────────────────────────────────────────────────────────
     §7 기록 — {dmg, dps, sec} · 종료 후 BGM 복귀
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[7] ⑥ 기록에 sec 이 같이 남는다 · 종료 후 BGM 복귀');
  const d7 = await page.evaluate(() => {
    raidDmg = 60000;
    raidT = 0.0;
    endRaid(true);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)).raidBest.r60; } catch (e) { /* noop */ }
    return { best: S.raidBest.r60, saved, bgm: bgmWant, on: !!raidOn,
             sand: enemies.filter((e) => e.raid).length };
  });
  yes('⑥ 기록이 남는다', !!(d7.best && d7.best.dps > 0), JSON.stringify(d7.best));
  if (d7.best) {
    is('⑥ 기록이 «잰 창의 길이»(sec)를 들고 다닌다', d7.best.sec, 30);
    near('⑥ 총 피해량 = DPS × 30 (같은 창에서 잰 값이라 자기 일치)', d7.best.dmg, d7.best.dps * 30, 1);
  }
  yes('⑥ localStorage 에도 sec 이 저장된다', !!(d7.saved && d7.saved.sec === 30), JSON.stringify(d7.saved));
  is('⑤ 종료하면 BGM 이 메인으로 돌아온다 (264 신설)', d7.bgm, 'main');
  is('§8 [포기하기]·만료 뒤 샌드백이 전장에서 치워진다', d7.sand, 0);

  /* ─────────────────────────────────────────────────────────────────────────
     §8 기능 체크 표 — 버튼을 실제로 눌렀을 때 무엇이 바뀌는가
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[8] 기능 체크 표 — 버튼별 «눌렀을 때 무엇이 바뀌는지»');
  await reset();
  const d8 = await page.evaluate(() => {
    const out = {};
    /* 탑 카드 → 04 세부 → [도전] */
    openDungeon();
    document.querySelector('#dunSub [data-dsub="tower"]').click();
    const tcard = document.querySelector('#dunList [data-tcard]');
    out.card = !!tcard;
    if (tcard) tcard.click();
    out.dgdTitle = document.getElementById('dgdTitle').textContent.trim();
    document.getElementById('dgdGo').click();
    out.run = !!dunRun;
    out.dunMode = document.getElementById('app').classList.contains('dunrun');
    /* 보스가 실제로 서고, 잡으면 클리어 화면이 뜬다.
       ⚑ 331 — 보스는 입장과 동시에 예약된다(옛 «누적 피해 눈금» 폐지). 스폰 딜레이만 걷어낸다. */
    /* 331 — 소환 눈금 폐지: 보스는 startDunRun/challengeTower 가 이미 예약했다 */
    dunBossTick();
    spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
    step(1 / 60);
    out.bossUp = enemies.filter((e) => e.tk === 'dunboss').length;
    const b = enemies.find((e) => e.tk === 'dunboss');
    if (b) { killEnemy(b); step(1 / 60);
             /* 332 — 시퀀스(터짐 → 클리어 → 1초)를 끝까지 돌려야 클리어 화면이 뜬다 */
             for (let g = 0; g < 600 && dunRun; g++) step(1 / 60); }
    out.cleared = !dunRun;
    out.clearScreen = document.getElementById('dclw').classList.contains('on');
    out.floor = S.tower;
    return out;
  });
  yes('§8 «탑» 서브탭 → 탑 카드가 보인다', d8.card);
  is('§8 카드 클릭 → 04 세부 팝업 제목', d8.dgdTitle, '시련의 탑');
  yes('§8 [도전] → 전투 화면(#app.dunrun)으로 전환된다', d8.run && d8.dunMode);
  is('§8 보스가 필드에 선다', d8.bossUp, 1);
  yes('§8 보스를 잡으면 → 런 종료 + 31 클리어 화면', d8.cleared && d8.clearScreen);
  is('§8 층이 실제로 오른다 (S.tower)', d8.floor, 2);

  /* ─────────────────────────────────────────────────────────────────────────
     §9 옛 세이브 환산 — 초기화가 아니라 «60초 환산»
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[9] ⑥ 옛 세이브(60초 기록) 환산 — DPS 는 그대로, 총 피해량만 다시 적는다');
  for (const [label, rec, wantDmg, wantDps] of [
    ['sec 없음(264 이전 60초 기록)', '{"dmg":600000,"dps":10000}', 300000, 10000],
    ['이미 30초 기록', '{"dmg":300000,"dps":10000,"sec":30}', 300000, 10000],
    ['옛 30초 기록(가상 — 창이 또 바뀌어도 받는다)', '{"dmg":150000,"dps":5000,"sec":15}', 150000, 5000],
  ]) {
    const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 } });
    const errs2 = [];
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => errs2.push(String(e.message)));
    await c2.addInitScript(`(() => {
      localStorage.setItem('idle_hunter_save_v4', JSON.stringify(
        { stage: 7, best: 12, gold: 1000, dia: 100, raidBest: { r60: ${rec} } }));
    })()`);
    await p2.goto(URL, { waitUntil: 'load' });
    await p2.waitForTimeout(700);
    const g = await p2.evaluate(() => ({
      b: S.raidBest.r60,
      bad: /\bNaN\b|\bundefined\b/.test(document.body.innerText || ''),
    }));
    yes('⑥ «' + label + '» → 기록이 살아남는다(초기화 아님)', !!(g.b && g.b.dps > 0), JSON.stringify(g.b));
    if (g.b) {
      is('⑥ «' + label + '» DPS 불변', g.b.dps, wantDps);
      is('⑥ «' + label + '» 총 피해량 = DPS × 30', g.b.dmg, wantDmg);
      is('⑥ «' + label + '» sec 이 현재 창으로 갱신된다', g.b.sec, 30);
    }
    yes('⑥ «' + label + '» NaN/undefined 새어 나옴 0건', !g.bad && errs2.length === 0, errs2.slice(0, 1));
    await c2.close();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     §10 회귀 — 던전 8종은 264 로 한 줄도 안 바뀐다
     ───────────────────────────────────────────────────────────────────────── */
  console.log('\n[10] 회귀 — 일반 던전(8종)의 보스 수·방식은 불변이다');
  const d10 = await page.evaluate(() => DUNGEONS.map((d) => d.id + ':' + dunBossN(d) + dunBossMd(d)[0]));
  is('회귀 — DUNGEONS 보스 표', d10.join(','),
    'gold:1p,dia:1p,relic1:1p,relic2:2p,relic3:2a,relic4:3p,stone:2a,rstone:3a');

  console.log('\n[11] 콘솔 에러');
  yes('pageerror/console.error 0건', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY264 ${pass}/${pass + fail} ${fail === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(fail ? 1 : 0);
})();
