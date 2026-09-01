#!/usr/bin/env node
/* 작업 674 재현 프로브 — «verify458 2건 · verify425 3건 실패» 가 무엇이었나
 *
 *   node tools/probe674.js
 *
 * 338 규칙 — 처방을 따르기 전에 먼저 재현한다. 등재문(PROGRESS 674)은 다섯 항을
 * «게이트 플레이키/부패» 로 적어 두고 처방 방향을 둘로 나눠 놨다. 여기서 재는 것은
 * **그 다섯이 정말 자의 결함인가, 그리고 뿌리가 몇 개인가** 다.
 *
 *   §1  verify425 [F]despair·[F-a]·[D] — 뿌리는 하나다: 자의 표본 정리(`__v425.cleanup`)가
 *       **격파 시퀀스(475 bossClear)를 안 닫는다.** [F] 의 «시련의 탑» 은 1층 요구 피해가
 *       168(황금 동굴 1000 의 1/6)이라 표본 창 안에서 보스가 실제로 죽고, 그 프레임에 런이
 *       끝나 `endDunRun` 이 조기 return 한다 ⇒ 시퀀스만 남아 `battleLocked()` 가 계속 참 ⇒
 *       **그 다음 표본부터 입장이 전부 막힌다**(despair 가 목록의 마지막이라 거기서 터졌고,
 *       바로 뒤에 도는 §D 도 같은 이유로 막혔다).
 *       ⚠ 제품 결함이 아니다 — 제품은 다음 틱에 스스로 지운다(index.html 23547).
 *          시계를 표본 끝에서 멈추는 것은 이 자뿐이다.
 *
 *   §2  verify458 [R-tower] — 되돌림 사본에서 탑 표본이 «죽고도 계속 싸운다» 대신
 *       **«이겨서 끝난다».** 같은 need 168 이 여기서도 뿌리다: 사본에서는 플레이어가 안 죽으므로
 *       사망 창(90프레임) + 4초 동안 계속 때려 보스를 격파하고 층이 1 → 2 로 오른다 ⇒ md "".
 *
 *   §3  verify458 [1-g] — «보상 0» 의 **눈금이 전투 수입까지 센다.** 사망 프레임의 골드 Δ 는
 *       0 인데, 자는 실패 뒤 10초를 더 흘린 뒤에 물어 스테이지로 돌아간 플레이어의 잡몹 킬
 *       골드(`killEnemy` 의 `S.gold += g`)를 «보상» 으로 읽는다.
 *
 * 각 절은 «수리 전 ↔ 수리 후» 를 같은 실행에서 나란히 찍는다 — 수리가 무르지 않다는 근거다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * 646/648 — 임시 사본 이름에 pid 를 넣는다(워커 넷이 같이 돌아도 안 부딪힌다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const SRC = path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const is = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };

/* verify425 의 헬퍼를 **그 파일에서 그대로** 읽어 온다 — 사본을 손으로 적으면 자가 두 벌이 된다 */
const HARNESS = fs.readFileSync(path.join(__dirname, 'verify425.js'), 'utf8')
  .match(/window\.__v425 = \{[\s\S]*?\n\};/)[0];

/* 458 이 §R 에서 쓰는 «옛 가드» 치환 — 같은 문자열을 쓴다(둘이 갈라지면 재현이 아니다) */
const GUARD_NEW = `  if(md === 'arena') return false;                    /* 123 — step 의 아레나 절이 받는다 */
  if(md === 'dun')  { endDunRun(false); return true; }  /* 30·209 — 206 실패 통보(보스 체력 n% 남음) */
  if(md === 'promo'){ endPromo(false, true); return true; }
  if(md === 'raid') { endRaid(false, true);  return true; }`;
const GUARD_OLD = `  if(arena || raidOn || dunRun || promo) return false;`;

const boot = async (ctx, url) => {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto('file://' + url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof step === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   /* 161 — 얼리지 않으면 다음 프레임이 되돌린다 */
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 180) }; }
  };
  return { page, errs, ev };
};

/* ── §1 표본 — verify425 [F] 루프를 그대로 굴리되 «표본 정리» 를 두 벌로 갈아 본다 ── */
const F_LOOP = ([closeSeq]) => {
  const H = window.__v425;
  const ids = DUNGEONS.concat(TOWERS).map(d => d.id);
  const rows = [];
  for (const id of ids) {
    const preLocked = battleLocked();
    const entered = H.enter(id);
    if (!entered) { rows.push({ id, preLocked, entered: false }); continue; }
    /* verify425 RUN 과 같은 창: 보스 등장 + 국면 + 전투 30프레임 */
    let f = 0, fIn = -1, fFight = -1;
    const t0 = dunRun.t;
    while (dunRun && f < 600) {
      H.tick(); f++;
      const r = dunRun; if (!r) break;
      if (fIn < 0 && r.bossIn) fIn = f;
      if (fFight < 0 && r.t < t0 - 1e-9) fFight = f;
      if (fFight > 0 && fIn > 0 && f > fFight + 30) break;
    }
    const killed = !!(dunRun && dunRun.bossKilled) || !dunRun;
    /* 수리 전 정리 = 격파 시퀀스를 안 닫는다(옛 cleanup 의 세 줄만) */
    if (closeSeq) H.cleanup();
    else {
      if (dunRun) endDunRun(false, true);
      document.querySelectorAll('.modal.on, .mw.on').forEach(el => el.classList.remove('on'));
      const cl = document.getElementById('dclw'); if (cl) cl.classList.remove('on');
      if (typeof closeModal === 'function') closeModal();
    }
    rows.push({ id, preLocked, entered: true, killed, seqLeft: !!bossClear, lockedAfter: battleLocked() });
  }
  /* 다음 절을 위해 전장을 비운다 */
  H.cleanup();
  return rows;
};

/* ── §2·§3 표본 — verify458 SCEN 의 뼈대. pump=false 면 수리 전(체력 안 올림) ── */
const SCEN = ([md, pump]) => {
  const out = { md, pump };
  try {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    S.rank = 0; S.dia = 99999; S.gold = 1e7;
    arena = null; raidOn = null; promo = null;
    if (dunRun) endDunRun(false, true);
    spawnStage();
    document.getElementById('defw').classList.remove('on');
    document.getElementById('dclw').classList.remove('on');
    const rewards = [];
    const rg = window.giveReward;
    window.giveReward = function (r) {
      rewards.push(Object.keys(r || {}).map(k => k + ':' + r[k]).join(','));
      return rg.apply(this, arguments);
    };
    if (md === 'tower') challengeTower(TOWERS[0].id);
    else { const d = DUNGEONS[0]; S.dunTk[d.id] = 9; challengeDungeon(d); }
    if (!dunRun) { window.giveReward = rg; out.err = '진입 실패'; return out; }
    out.need = dunRun.need;
    out.floor0 = md === 'tower' ? S.tower : S.dun[DUNGEONS[0].id];
    out.gold0 = S.gold;
    spawnQ.forEach(q => { if (q.t === 'dunboss') q.delay = 0; });
    for (let i = 0; i < 30 && !enemies.some(e => e.tk === 'dunboss'); i++) step(1 / 60);
    for (let i = 0; i < 300 && dunRun && dunRun.introOn; i++) step(1 / 60);
    if (pump) enemies.forEach(x => { if (x.max > 0) { x.max = 1e12; x.hp = 1e12; } });
    let deaths = 0; const rd = window.playerDied;
    window.playerDied = function () { deaths++; return rd.apply(this, arguments); };
    player.hp = 1; player.inv = 0; player.dead = 0;
    let e = enemies[0]; if (!e) { makeEnemy('zombie'); e = enemies[enemies.length - 1]; }
    e.born = 1; e.cd = 0; e.atkT = 0; e.dmg = 1e9; e.x = player.x; e.y = player.y;
    out.mdIn = bossMode();
    let fr = 0; for (; fr < 90 && !deaths; fr++) step(1 / 60);
    window.playerDied = rd;
    out.died = deaths > 0; out.frames = fr;
    out.at0 = { md: bossMode(), gold: S.gold, dia: S.dia };
    for (let i = 0; i < 240; i++) step(1 / 60);
    out.at4 = { md: bossMode(), gold: S.gold };
    /* 종전 [1-g] 가 읽던 자리 — 실패 뒤 +10초 */
    const trace = []; let prev = S.gold;
    for (let i = 0; i < 360; i++) {
      step(1 / 60);
      if (S.gold !== prev) { trace.push({ f: i, d: +(S.gold - prev).toFixed(2), md: bossMode(), dun: !!dunRun }); prev = S.gold; }
    }
    out.at10 = { md: bossMode(), gold: S.gold };
    out.floor1 = md === 'tower' ? S.tower : S.dun[DUNGEONS[0].id];
    out.rewards = rewards.slice();
    out.gainAfterEnd = trace.length;
    out.gainSample = trace.slice(0, 3);
    window.giveReward = rg;
    if (dunRun) endDunRun(false, true);
    document.querySelectorAll('.modal.on, .mw.on').forEach(el => el.classList.remove('on'));
    document.getElementById('dclw').classList.remove('on');
  } catch (err) { out.err = String((err && err.message) || err).slice(0, 200); }
  return out;
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const rev = path.join(path.dirname(SRC), `.probe674-rev-${process.pid}.html`);
  fs.writeFileSync(rev, src.replace(GUARD_NEW, GUARD_OLD));
  process.on('exit', () => { try { fs.unlinkSync(rev); } catch (e) {} });
  if (!src.includes(GUARD_NEW)) {
    console.log('PROBE674 — 458 의 갈아 끼울 자리를 못 찾았다(제품이 바뀌었다). 아래가 헛초록이다.');
    process.exit(1);
  }

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  /* ═══ §1 — verify425 [F]·[D] 의 뿌리 ═══════════════════════════════════ */
  console.log('[§1] verify425 — 표본 정리가 격파 시퀀스를 안 닫으면 다음 표본이 통째로 막힌다');
  const cur = await boot(ctx, SRC);
  await cur.page.evaluate(HARNESS);
  const before = await cur.ev(F_LOOP, [false]);
  const after = await cur.ev(F_LOOP, [true]);
  const shape = (rows) => Array.isArray(rows)
    ? { n: rows.length, entered: rows.filter(r => r.entered).length,
        blocked: rows.filter(r => !r.entered).map(r => r.id).join(',') || '없음',
        killedAt: rows.filter(r => r.killed).map(r => r.id).join(',') || '없음',
        seqLeft: rows.filter(r => r.seqLeft).map(r => r.id).join(',') || '없음' }
    : rows;
  const B = shape(before), A = shape(after);
  console.log('  · 수리 전(시퀀스 안 닫음) — ' + JSON.stringify(B));
  console.log('  · 수리 후(시퀀스 닫음)   — ' + JSON.stringify(A));
  is(B.entered === B.n - 1, '[1-a] 수리 전에는 표본 하나가 입장을 못 한다(등재문의 «despair 입장 실패»)',
     B.entered + '/' + B.n + ' · 막힌 표본 ' + B.blocked);
  is(B.seqLeft !== '없음', '[1-b] 그 앞 표본이 격파 시퀀스를 남겼다 = 뿌리', '시퀀스 남긴 표본 ' + B.seqLeft);
  is(A.entered === A.n, '[1-c] ★ 수리 후에는 전 종이 입장한다', A.entered + '/' + A.n);
  is(A.seqLeft === '없음', '[1-d] ★ 수리 후에는 표본이 시퀀스를 안 남긴다', A.seqLeft);

  /* ═══ §2·§3 — verify458 ════════════════════════════════════════════════ */
  console.log('\n[§2] verify458 §R — 사본의 탑 표본은 «죽고도 싸운다» 가 아니라 «이겨서 끝난다»');
  const rp = await boot(ctx, rev);
  const rvTowerBefore = await rp.ev(SCEN, ['tower', false]);
  const rvTowerAfter = await rp.ev(SCEN, ['tower', true]);
  const rvDun = await rp.ev(SCEN, ['dun', false]);
  console.log('  · 사본/탑 수리 전 — need ' + rvTowerBefore.need + ' · 층 ' + rvTowerBefore.floor0 + '→' + rvTowerBefore.floor1
    + ' · at4.md "' + (rvTowerBefore.at4 || {}).md + '" · 보상 ' + (rvTowerBefore.rewards || []).join('|'));
  console.log('  · 사본/탑 수리 후 — at4.md "' + (rvTowerAfter.at4 || {}).md + '" · 보상 '
    + ((rvTowerAfter.rewards || []).join('|') || '0건'));
  console.log('  · 사본/던전(대조) — need ' + rvDun.need + ' · at4.md "' + (rvDun.at4 || {}).md + '"');
  is(rvTowerBefore.need < rvDun.need, '[2-a] 탑 1층 요구 피해가 던전보다 훨씬 작다 = 창 안에 격파된다',
     '탑 ' + rvTowerBefore.need + ' vs 던전 ' + rvDun.need);
  is(rvTowerBefore.floor1 === rvTowerBefore.floor0 + 1,
     '[2-b] 수리 전 사본 표본은 **클리어**로 끝났다(층이 올랐다) = 결함이 아니라 승리',
     rvTowerBefore.floor0 + ' → ' + rvTowerBefore.floor1);
  is(rvTowerBefore.at4 && rvTowerBefore.at4.md === '', '[2-c] 그래서 at4.md 가 "" 였다(= [R-tower] 빨강)');
  is(rvTowerAfter.at4 && rvTowerAfter.at4.md === rvTowerAfter.mdIn && rvTowerAfter.at4.md !== '',
     '[2-d] ★ 수리 후에는 사본에서 탑이 «죽고도 계속 싸운다» = 결함이 재현된다',
     rvTowerAfter.at4 && ('md="' + rvTowerAfter.at4.md + '"'));
  is((rvTowerAfter.rewards || []).length === 0, '[2-e] ★ 그 표본은 보상을 한 푼도 안 받는다(승리가 아니다)');

  console.log('\n[§3] verify458 [1-g] — «보상 0» 의 눈금이 전투 수입을 세고 있었다');
  const okDun = await cur.ev(SCEN, ['dun', true]);
  console.log('  · 수리본/던전 — 진입 ' + okDun.gold0 + ' · 사망프레임 ' + (okDun.at0 || {}).gold
    + ' · +4초 ' + (okDun.at4 || {}).gold + ' · +14초 ' + (okDun.at10 || {}).gold);
  console.log('  · 실패 뒤 골드가 오른 프레임 ' + okDun.gainAfterEnd + '건 — ' + JSON.stringify(okDun.gainSample));
  is(okDun.at0 && okDun.at0.gold === okDun.gold0,
     '[3-a] 사망 프레임의 골드 Δ 는 0 이다 = 보상은 실제로 안 나갔다',
     okDun.gold0 + ' → ' + (okDun.at0 || {}).gold);
  is(okDun.at10 && okDun.at10.gold > okDun.gold0,
     '[3-b] 그런데 +14초 창에서는 골드가 오른다 = 종전 [1-g] 가 읽던 자리',
     okDun.gold0 + ' → ' + (okDun.at10 || {}).gold + ' (Δ +' + (okDun.at10.gold - okDun.gold0).toFixed(2) + ')');
  is(okDun.gainSample && okDun.gainSample.every(g => g.md === '' && g.dun === false),
     '[3-c] ★ 그 증가는 전부 **런이 끝난 뒤 스테이지에서** 났다(md "" · dunRun 없음) = 잡몹 킬 골드',
     JSON.stringify(okDun.gainSample));
  is((okDun.rewards || []).length === 0,
     '[3-d] ★ 같은 판에서 지급 경로(giveReward)는 0건 = 새 눈금은 이 차이를 안 섞는다',
     (okDun.rewards || []).length + '건');

  const errs = cur.errs.concat(rp.errs);
  is(errs.length === 0, '[4] 콘솔·페이지 오류 0건', errs.length ? errs.slice(0, 2).join(' | ') : '0건');

  await browser.close();
  console.log('\nPROBE674 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
