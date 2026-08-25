/* 작업 114 기능 체크 표 — «스킬 24종을 실제로 시전하면 화면에 무엇이 생기는가» 를 헤드리스로 센다.
   T2(기능 TODO) 완료 규칙: «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작» 을 표로 남긴다.
   실행: node tools/func114.js        → 마크다운 표를 stdout 으로. review 파일에 붙인다. */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  const rows = await p.evaluate(() => {
    const out = [];
    for (const s of SKILLS) {
      sbufClear();
      S.own = {}; S.own[s.id] = { n: 0, l: 1 };
      S.eqSkill = [s.id];
      skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
      rings.length = 0; parts.length = 0; nums.length = 0; enemies.length = 0; spawnQ.length = 0;
      markDirty();
      player.x = WORLD.w/2; player.y = WORLD.h/2; player.dead = 0; player.inv = 99;
      player.hp = stat.maxHp*0.5;
      cam.shake = 0;
      for (let i = 0; i < 6; i++) makeEnemy('zombie');
      enemies.forEach((e, i) => { e.born = 1; e.hp = e.max = 1e12;
        const a = i*6.283/6; e.x = player.x + Math.cos(a)*130; e.y = player.y + Math.sin(a)*130; });
      const hp0 = enemies.reduce((t, e) => t + e.hp, 0), php0 = player.hp;
      let trail = 0, ring = 0, spark = 0, deb = 0, bolt = 0, boom = 0, zone = 0, shot = 0, shake = 0, num = 0;
      for (let i = 0; i < 240; i++) {
        const r0 = rings.length, p0 = parts.length, b0 = bolts.length, m0 = booms.length,
              z0 = zones.length, s0 = shots.length;
        step(1/60);
        if (shots.length > s0) shot += shots.length - s0;
        if (rings.length > r0) ring += rings.length - r0;
        if (bolts.length > b0) bolt += bolts.length - b0;
        if (booms.length > m0) boom += booms.length - m0;
        if (zones.length > z0) zone += zones.length - z0;
        if (parts.length > p0) {
          for (let j = p0; j < parts.length; j++) (parts[j].gy ? deb++ : spark++);
        }
        for (const q of shots) trail = Math.max(trail, q.tn);
        shake = Math.max(shake, cam.shake);
        num = Math.max(num, nums.length);
        enemies.forEach(e => { if (e.hp < 1e11) e.hp = 1e12; });
      }
      out.push({ id: s.id, n: s.n, g: s.g, trail, ring, spark, deb, bolt, boom, zone, shot, num,
                 shake: Math.round(shake*10)/10,
                 dmg: hp0 - enemies.reduce((t, e) => t + e.hp, 0) > 0,
                 buff: !!(sbuf.atk || sbuf.rate || sbuf.def || sbuf.regen),
                 /* 자연 재생(regen)과 구분 — «heal 비율을 가진 스킬» 만 즉시 회복으로 센다.
                    체력 증가만 보면 4초 자연 재생도 걸려 전 종이 «회복» 으로 찍힌다 */
                 heal: !!s.heal && player.hp > php0 });
    }
    return out;
  });

  const GN = ['일반','고급','희귀','영웅','전설','신화'];
  console.log('| 스킬 | 등급 | 시전하면 생기는 것(4초 · 적 6기) | 트레일 | 링 | 스파크/파편 | 흔들림 | 피해 |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const made = [];
    if (r.shot)  made.push('투사체 ' + r.shot);
    if (r.bolt)  made.push('번개 ' + r.bolt);
    if (r.boom)  made.push('폭발 ' + r.boom);
    if (r.zone)  made.push('장판 ' + r.zone);
    if (r.buff)  made.push('자기 강화 버프');
    if (r.heal)  made.push('즉시 회복');
    if (r.num)   made.push('피해 숫자 ' + r.num);
    console.log('| ' + r.n + ' `' + r.id + '` | ' + GN[r.g] + ' | ' + (made.join(' · ') || '—') +
                ' | ' + (r.trail ? r.trail + '표본' : '–') +
                ' | ' + (r.ring || '–') +
                ' | ' + (r.spark || 0) + '/' + (r.deb || 0) +
                ' | ' + (r.shake || '–') +
                ' | ' + (r.dmg ? '○' : (r.buff || r.heal ? '보조' : '✗')) + ' |');
  }
  console.log('\n콘솔 에러 ' + errs.length + '건');
  await b.close();
})();
