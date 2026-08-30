/* 작업 457 재현기 — «모든 보스전» 의 등장 국면·제한 시간을 수리 전/후 같은 표로 낸다
 *
 *   node tools/probe457.js                 → 현재 index.html
 *   node tools/probe457.js <다른 index.html 경로>   → 수리 전 사본(대조군)
 *
 * 338 규칙 — 처방을 따르기 전에 **등재문의 가설을 재현으로 확인/기각**한다.
 * 등재문의 주장: 스테이지 보스전(28)·승급전·레이드(46)에는 425 의 등장 국면이 없고,
 * 스테이지는 스폰 딜레이 1.4초가 제한 시간에서 샌다(`bossT = BOSS_SEC` 를 예약과 동시에 세운다).
 *
 * 재는 것(모드마다):
 *   · 보스가 «필드에 선» 프레임 · 그때 남은 그 모드의 시계 · 만시간 대비 «샌 양»
 *   · 시계가 처음 줄어드는 프레임 · 등장 국면 프레임 수 · 카메라 가중치 최대 w
 *   · 국면 중 카메라–플레이어 최대 거리(= «보스를 비췄나»)
 * 아레나(123)는 «국면이 없어야 정상» 인 대조군으로 같이 돌린다.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));

const HARNESS = `
window.__p457 = {
  DT: 1/60,
  tick(){ step(this.DT); if(typeof camUpdate === 'function') camUpdate(this.DT); },
  reset(){
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n:0, l:1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    if(dunRun) endDunRun(false, true);
    if(arena) endArena(null);
    if(raidOn) endRaid(false);
    if(promo) promo = null;
    if(typeof bossIntro !== 'undefined') bossIntro = null;
    bossOn = false; bossT = 0; S.bossFarm = false; stageWin = false;
    enemies.length = 0; spawnQ.length = 0; shots.length = 0; nums.length = 0; corpses.length = 0;
    player.x = WORLD.w/2; player.y = WORLD.h/2; player.hp = stat.maxHp; player.dead = 0;
    var c = camClamp(player.x, player.y); cam.x = c.x; cam.y = c.y;
    document.querySelectorAll('.modal.on, .mw.on').forEach(function(el){ el.classList.remove('on'); });
    if(typeof closeModal === 'function') closeModal();
  },
  enter(md){
    this.reset();
    if(md === 'stage'){ startBoss(); return inBossFight(); }
    if(md === 'promo'){ startPromo(); return !!promo; }
    if(md === 'raid'){ startRaid(RAIDS[0]); return !!raidOn; }
    if(md === 'arena'){ startArena(); return !!arena; }
    if(md === 'dun'){
      var d = DUNGEONS[0]; S.dunTk[d.id] = 9; challengeDungeon(d); return !!dunRun;
    }
    return false;
  },
  clock(md){
    if(md === 'stage') return bossT;
    if(md === 'promo') return promo ? promo.t : null;
    if(md === 'raid')  return raidT;
    if(md === 'arena') return arena ? arena.t : null;
    if(md === 'dun')   return dunRun ? dunRun.t : null;
    return null;
  },
  boss(md){
    var k = md === 'stage' ? 'boss' : md === 'promo' ? 'promo'
          : md === 'arena' ? 'arena' : md === 'dun' ? 'dunboss' : 'boss';
    return enemies.find(function(e){ return e.tk === k && e.hp > 0; }) || null;
  },
  /* 수리 전 사본에는 bossIntroW 가 없다(이름이 dunIntroW 다) — 둘 다 받아 준다 */
  w(){
    if(typeof bossIntroW === 'function') return bossIntroW();
    if(typeof dunIntroW === 'function') return dunIntroW();
    return 0;
  },
  on(){
    if(typeof bossIntro !== 'undefined' && bossIntro) return true;
    if(typeof dunRun !== 'undefined' && dunRun && dunRun.introOn) return true;
    return false;
  }
};`;

const RUN = ([md]) => {
  const H = window.__p457;
  if (!H.enter(md)) return { md, err: '입장 실패' };
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const t0 = H.clock(md);
  let f = 0, fStood = -1, clockAtStood = null, fFirstDrop = -1, introFrames = 0;
  let wMax = 0, camPlayMaxIntro = 0, camPlayMax = 0;
  while (f < 60 * 8) {
    H.tick(); f++;
    const c = H.clock(md);
    if (c === null) break;
    wMax = Math.max(wMax, H.w());
    if (H.on()) { introFrames++; camPlayMaxIntro = Math.max(camPlayMaxIntro, d2(cam, player)); }
    camPlayMax = Math.max(camPlayMax, d2(cam, player));
    const b = H.boss(md);
    if (fStood < 0 && b) { fStood = f; clockAtStood = +c.toFixed(4); }
    if (fFirstDrop < 0 && c < t0 - 1e-9) fFirstDrop = f;
    if (fFirstDrop > 0 && fStood > 0 && f > fFirstDrop + 60) break;
  }
  const out = {
    md, t0, fStood, clockAtStood,
    leak: clockAtStood === null ? null : +(t0 - clockAtStood).toFixed(4),
    fFirstDrop, dropAt: fFirstDrop > 0 ? +(fFirstDrop / 60).toFixed(3) : null,
    introFrames, wMax: +wMax.toFixed(3),
    camPlayMaxIntro: +camPlayMaxIntro.toFixed(1), camPlayMax: +camPlayMax.toFixed(1),
  };
  H.reset();
  return out;
};

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto('file://' + SRC.replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.evaluate(HARNESS);

  console.log('probe457 — ' + SRC);
  console.log('| 모드 | 보스가 선 프레임 | 그때 남은 시계 | 샌 양(초) | 시계 감소 시작 | 국면 프레임 | w 최대 | 국면 중 cam↔player |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const [md, nm] of [['stage', '28 스테이지 보스'], ['promo', '승급전'], ['raid', '46 레이드'],
                          ['dun', '30 던전(425 대조군)'], ['arena', '123 아레나(제외 대조군)']]) {
    let r;
    try { r = await page.evaluate(RUN, [md]); }
    catch (e) { r = { err: String((e && e.message) || e).split('\n')[0].slice(0, 120) }; }
    if (r.err) { console.log('| ' + nm + ' | — | — | — | — | — | — | ' + r.err + ' |'); continue; }
    console.log('| ' + nm + ' | ' + r.fStood + ' | ' + r.clockAtStood + ' / ' + r.t0 + ' | **' + r.leak +
                '** | ' + r.fFirstDrop + '프레임(' + r.dropAt + 's) | ' + r.introFrames + ' | ' + r.wMax +
                ' | ' + r.camPlayMaxIntro + 'px |');
  }
  console.log('\n페이지 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
