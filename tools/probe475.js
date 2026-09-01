/* 작업 475 재현기 — «격파 프레임에 바로 넘어간다» 를 **수리 전 사본에서 실제로 재고**,
 * 수리 후 트리와 나란히 찍는다(338 규칙: 처방을 따르기 전에 재현한다).
 *
 *   node tools/probe475.js   → 표 2벌(수리 전 사본 · 현재 트리)을 찍는다. 단언은 verify475 가 한다.
 *
 * 수리 전 사본은 시퀀스의 **홀드 한 줄**을 걷어내 만든다(`bossClearDone()` 을 첫 프레임에 부른다) —
 * 그러면 세 모드가 전부 «죽는 프레임 + 1틱» 에 후속으로 넘어가 등재문이 적은 그 거동이 된다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '../index.html');
const FROM = 'if(bossClear.t >= bossClear.die + DUN_CLR_HOLD) bossClearDone();';
const TO = 'bossClearDone();';

const SETUP = `
  localStorage.clear();
  Object.assign(S, DEF());
  S.guide.idx = 99;
  S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
`;

const RUN = ([setup, md]) => {
  window.requestAnimationFrame = () => 0;
  eval(setup);
  const out = { md };
  if (md === 'stage') {
    S.stage = 12; S.best = 12; spawnStage();
    enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
    for (let i = 0; i < 600 && (!enemies.some((e) => e.tk === 'boss') || bossIntro); i++) step(1 / 60);
    const b = enemies.find((e) => e.tk === 'boss');
    if (!b) return { md, err: '보스가 안 섰다' };
    const st0 = S.stage; out.die = +(typeof bossDieSec === 'function' ? bossDieSec(b) : -1).toFixed(3);
    msgTxt = '';
    killEnemy(b);
    let t = 0, msgAt = -1, doneAt = -1;
    for (let i = 0; i < 600 && doneAt < 0; i++) {
      step(1 / 60); t += 1 / 60;
      if (msgAt < 0 && msgTxt === 'STAGE CLEAR!') msgAt = t;
      if (S.stage !== st0) doneAt = t;
    }
    out.msgAt = +msgAt.toFixed(3); out.doneAt = +doneAt.toFixed(3);
  } else if (md === 'promo') {
    S.stage = 30; S.best = 30; spawnStage(); startPromo();
    if (!promo) return { md, err: '승급전 입장 실패' };
    for (let i = 0; i < 600 && bossIntro; i++) step(1 / 60);
    const g = enemies.find((e) => e.tk === 'promo');
    if (!g) return { md, err: '수호자가 없다' };
    out.die = +(typeof bossDieSec === 'function' ? bossDieSec(g) : -1).toFixed(3);
    msgTxt = ''; document.getElementById('modal').classList.remove('on');
    killEnemy(g);
    let t = 0, msgAt = -1, doneAt = -1;
    for (let i = 0; i < 600 && doneAt < 0; i++) {
      step(1 / 60); t += 1 / 60;
      if (msgAt < 0 && msgTxt === '승급 성공!') msgAt = t;
      if (!promo) doneAt = t;
    }
    out.msgAt = +msgAt.toFixed(3); out.doneAt = +doneAt.toFixed(3);
  } else {
    S.stage = 20; S.best = 20;
    if (dunRun) endDunRun(false, true);
    const d = DUNGEONS.find((x) => x.id === 'gold');
    S.dunTk[d.id] = 9;
    challengeDungeon(d);
    if (!dunRun) return { md, err: '던전 입장 실패' };
    out.die = +dunRun.clrDie.toFixed(3);
    spawnQ.forEach((q) => { if (q.t === 'dunboss') q.delay = 0; });
    for (let i = 0; i < 600 && (!enemies.some((e) => e.tk === 'dunboss') || bossIntro); i++) step(1 / 60);
    const b = enemies.find((e) => e.tk === 'dunboss');
    if (!b) return { md, err: '던전 보스가 안 섰다' };
    msgTxt = '';
    killEnemy(b);
    let t = 0, msgAt = -1, doneAt = -1;
    for (let i = 0; i < 600 && doneAt < 0; i++) {
      step(1 / 60); t += 1 / 60;
      if (msgAt < 0 && msgTxt === '클리어') msgAt = t;
      if (!dunRun) doneAt = t;
    }
    out.msgAt = +msgAt.toFixed(3); out.doneAt = +doneAt.toFixed(3);
  }
  return out;
};

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const revPath = path.join(path.dirname(SRC), `.probe475-old-${process.pid}.html`);
  if (src.indexOf(FROM) < 0) { console.log('시퀀스 홀드 줄을 못 찾았다 — 사본을 못 만든다'); process.exit(1); }
  fs.writeFileSync(revPath, src.replace(FROM, TO));

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });

  const table = async (title, url) => {
    console.log('\n== ' + title);
    console.log('  모드      die(초)   알림(초)   후속(초)');
    for (const md of ['stage', 'promo', 'dun']) {
      const p = await ctx.newPage();
      await p.goto(url);
      await p.waitForTimeout(1000);
      let r;
      try { r = await p.evaluate(RUN, [SETUP, md]); }
      catch (e) { r = { md, err: String(e.message || e).split('\n')[0].slice(0, 120) }; }
      await p.close();
      if (r.err) console.log('  ' + md.padEnd(8) + ' — ' + r.err);
      else console.log('  ' + md.padEnd(8) + String(r.die).padEnd(10) + String(r.msgAt).padEnd(11) + r.doneAt);
    }
  };

  await table('수리 전 사본(홀드 제거 = 죽는 프레임에 바로)', 'file://' + revPath);
  await table('현재 트리(475 — 터짐 → 알림 → 1초 → 후속)', 'file://' + SRC);

  await browser.close();
  try { fs.unlinkSync(revPath); } catch (e) {}
  console.log('\nPROBE475 done');
})();
