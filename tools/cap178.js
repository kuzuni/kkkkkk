/* 178 — 던전 보스 캡처(1080×2280). 던전 6종의 보스가 각자 «자기 카드 썸네일 몬스터» 로,
   28 스테이지 보스와 같은 덩치로 서 있는지 눈으로 확인하는 용도다.
   보스를 플레이어 바로 옆에 세워 카메라 안에 확실히 들어오게 하고 한 장씩 찍는다.
   실행: node tools/cap178.js [출력디렉터리]   (기본 docs/review) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const dir = process.argv[2] || 'docs/review';
const IDS = ['gold', 'dia', 'relic1', 'relic2', 'relic3', 'relic4'];

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1100);

  for (const id of IDS) {
    const info = await p.evaluate((dunId) => {
      localStorage.clear();
      Object.assign(S, DEF());
      S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
      S.stage = 12; S.best = 12; S.guide.idx = 99;
      const d = DUNGEONS.find(x => x.id === dunId);
      S.daily.dun[d.id] = 9; S.dun[d.id] = 3;
      if (dunRun) endDunRun(false, true);
      startDunRun(d, 3);
      /* 보스 국면으로 바로 넘긴다 — 30초를 기다리지 않는다 */
      dunRun.t = DUN_SEC - DUN_BOSS_AT;
      dunBossTick();
      for (let k = 0; k < 200; k++) step(1 / 60);       /* 스폰 딜레이(1.4s) 통과 */
      const e = enemies.find(x => x.tk === 'dunboss');
      if (!e) return { err: '보스 미스폰' };
      /* 카메라 안에 확실히 담기게 플레이어 옆에 세운다(그리기 확인이 목적) */
      e.x = player.x + 190; e.y = player.y;
      e.hp = e.max;                                     /* 체력바가 안 뜨는 만피 상태 */
      draw(); drawDunHud();
      return { atlas: e.T.atlas, walk: e.T.walk, scale: +e.T.scale.toFixed(3), r: e.T.r };
    }, id);
    if (info.err) { console.log(id + ' — ' + info.err); continue; }
    const out = path.join(dir, '178-boss-' + id + '.png');
    await p.screenshot({ path: out });
    console.log('captured ' + out + '  (' + info.atlas + '/' + info.walk
      + ' scale ' + info.scale + ' r ' + info.r + ')');
  }
  console.log(errs.length ? '⚠ 콘솔 에러 ' + errs.length + ': ' + errs.slice(0, 3).join(' | ') : '콘솔 에러 0건');
  await b.close();
})();
