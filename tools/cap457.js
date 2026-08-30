/* 작업 457 연속 프레임 계측 — ROUTINE [3]-(다) «연출 작업» 의 증거표
 *
 *   node tools/cap457.js
 *
 * 425 의 `cap425.js` 와 같은 자를 **세 모드**(28 스테이지 보스 · 승급전 · 46 레이드)에 댄다.
 * 캡처 PNG 는 .gitignore 로 막혀 있으므로(2026-08-30 이력 정리) 증거는 **수치**로 남긴다 —
 * 프레임마다 국면 경과 u · 가중치 w · 그 모드의 시계 표기 · 카메라↔플레이어 · 카메라↔보스(그려진
 * 스프라이트 중심) · 화면 좌표를 찍어 `docs/review/457-frames.json` 과 표로 낸다.
 *
 * 보는 것:
 *   ① 머묾 구간(0.35~1.05s)에 **아무것도 안 움직인다**(세 프레임의 좌표가 Δ0.0px)
 *   ② 왕복이 **대칭**이다(u=0.18 과 u=1.22 의 w·거리가 같다)
 *   ③ 국면 내내 시계 표기가 만시간 그대로이고, 국면이 끝난 뒤에야 움직인다
 *   ④ 보스 «그림» 이 화면 정중앙(VW/2, VH/2)에 선다
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const OUT = path.resolve(__dirname, '..', 'docs', 'review', '457-frames.json');

const HARNESS = `
window.__c457 = {
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
    bossIntro = null; bossOn = false; bossT = 0; S.bossFarm = false; stageWin = false;
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
    return false;
  },
  clock(md){ return md === 'stage' ? bossT : md === 'promo' ? (promo ? promo.t : null) : raidT; },
  boss(md){
    var k = md === 'promo' ? 'promo' : 'boss';
    return enemies.find(function(e){ return e.tk === k && e.hp > 0; }) || null;
  }
};`;

/* 국면이 열린 뒤 지정한 u(초)마다 한 장씩 찍는다 */
const SHOOT = ([md, us]) => {
  const H = window.__c457;
  if (!H.enter(md)) return { md, err: '입장 실패' };
  let g = 0;
  while (!bossIntro && g++ < 600) H.tick();          /* 보스가 설 때까지 */
  if (!bossIntro) return { md, err: '국면이 안 열린다' };
  const sx = (wx) => +(wx - cam.x + VW / 2).toFixed(1);
  const sy = (wy) => +(wy - cam.y + VH / 2).toFixed(1);
  const shots = [];
  let f = 0, ui = 0;
  const grab = (u) => {
    const b = H.boss(md);
    const m = b ? bossIntroMid(b) : null;
    if (typeof drawHud === 'function') drawHud();
    shots.push({
      u: +u.toFixed(2), w: +bossIntroW().toFixed(3), intro: !!bossIntro,
      hud: (document.getElementById('bossTmN') || {}).textContent,
      clock: +H.clock(md).toFixed(3),
      camPlayer: +Math.hypot(cam.x - player.x, cam.y - player.y).toFixed(1),
      camBoss: b && m ? +Math.hypot(cam.x - (b.x + m.x), cam.y - (b.y + m.y)).toFixed(1) : null,
      player: [sx(player.x), sy(player.y)],
      bossFoot: b ? [sx(b.x), sy(b.y)] : null,
      bossMid: b && m ? [sx(b.x + m.x), sy(b.y + m.y)] : null,
      born: b ? +b.born.toFixed(3) : null,
    });
  };
  grab(0);
  while (ui < us.length && f < 60 * 6) {
    H.tick(); f++;
    const u = f / 60;
    if (u >= us[ui] - 1e-9) { grab(u); ui++; }
  }
  const out = { md, VW, VH, center: [VW / 2, VH / 2], len: bossIntroLen(), shots };
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

  const US = [0.18, 0.35, 0.70, 1.05, 1.22, 1.40, 2.00];
  const all = {};
  for (const [md, nm] of [['stage', '28 스테이지 보스'], ['promo', '승급전'], ['raid', '46 레이드']]) {
    let r;
    try { r = await page.evaluate(SHOOT, [md, US]); }
    catch (e) { r = { md, err: String((e && e.message) || e).split('\n')[0].slice(0, 120) }; }
    all[md] = r;
    console.log('\n### ' + nm + (r.err ? ' — ' + r.err : ' (화면 중앙 ' + r.center.join(', ') + ')'));
    if (r.err) continue;
    console.log('| 프레임 | u | w | 시계 HUD | cam↔player | cam↔보스중심 | 플레이어 화면 | 보스 화면(그림 중심) |');
    console.log('|---|---|---|---|---|---|---|---|');
    r.shots.forEach((s, i) => {
      console.log('| f' + (i + 1) + ' | ' + s.u + 's | ' + s.w + ' | ' + s.hud + ' | ' + s.camPlayer +
                  ' | ' + s.camBoss + ' | (' + s.player.join(', ') + ') | ' +
                  (s.bossMid ? '(' + s.bossMid.join(', ') + ')' : '—') + ' |');
    });
  }
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  console.log('\n→ ' + path.relative(process.cwd(), OUT) + ' · 페이지 에러 ' + errs.length + '건');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
