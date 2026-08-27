/* 178 — 던전 런 «보스 국면» 밸런스 프로브.
   30 던전 런의 판정은 «30초 누적 피해 ≥ 요구 피해» 하나뿐이다(index.html ~18496).
   보스 개체를 넣으면 그 30초의 «때릴 대상 구성» 이 바뀌므로, 넣기 전과 넣은 뒤의
   `dmg / need` 비를 같은 방법으로 재서 밸런스가 흔들리지 않았는지 본다.

   방법 — 실시간 30초를 기다리지 않고 `step(1/60)` 을 1800번 직접 돌린다(전역 함수다).
   rAF 루프도 동시에 도므로 실경과분(~수십 틱)이 섞이지만, **비교하는 두 트리에 똑같이**
   섞이므로 차분에는 영향이 없다. 난수(스폰 각도·크리)는 시드가 없으므로 RUNS 번 돌려 평균한다.

   실행: node tools/probe178.js [RUNS]
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const RUNS = +(process.argv[2] || 3);
/* 스테이지 × 던전 × 층 — 요구 피해가 스테이지 곡선과 어떻게 맞물리는지 갈리도록 넓게 잡는다 */
const CASES = [
  { stage: 1,  dun: 'gold',   f: 1 },
  { stage: 12, dun: 'gold',   f: 3 },
  { stage: 12, dun: 'dia',    f: 3 },
  { stage: 40, dun: 'relic1', f: 2 },
  { stage: 90, dun: 'gold',   f: 8 }
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const rows = [];
  for (const c of CASES) {
    const acc = { ratio: [], cleared: 0, deaths: [], boss: [] };
    for (let i = 0; i < RUNS; i++) {
      const r = await page.evaluate(([stage, dunId, f]) => {
        /* 매 판 «갓 시작한 캐릭터» 로 되돌린다 — 앞 판의 골드·성장이 다음 판에 새면 비교가 깨진다 */
        localStorage.clear();
        Object.assign(S, DEF());
        /* 부팅 절차(index.html ~25533)가 새 게임에 주는 기본 스킬 — 이게 없으면 피해가 0 이다
           (평타는 없고 모든 피해가 스킬에서 나온다). 30 측정표의 «기본 캐릭터 cp 503» 상태다. */
        S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
        S.stage = stage; S.best = stage;
        const d = DUNGEONS.find(x => x.id === dunId);
        S.daily.dun[d.id] = 9;
        S.dun[d.id] = Math.max(S.dun[d.id] | 0, f);
        S.guide.idx = 99;                      /* 해금 조건(가이드미션)을 지나친 상태로 */
        startDunRun(d, f);
        if (!dunRun) return { err: 'startDunRun 실패' };
        const need = dunRun.need;
        let last = 0, deaths = 0, wasDead = false, bossSeen = 0, bossAlive = 0;
        for (let k = 0; k < 1800 && dunRun; k++) {
          step(1 / 60);
          if (!dunRun) break;
          last = dunRun.dmg;
          if (player.dead > 0 && !wasDead) { deaths++; wasDead = true; }
          if (player.dead <= 0) wasDead = false;
          const nb = enemies.filter(e => e.tk === 'dunboss').length;
          if (nb > bossAlive) bossSeen++;
          bossAlive = nb;
        }
        const cleared = !dunRun;              /* 클리어(또는 시간 초과)로 런이 끝났다 */
        const ratio = last / need;
        if (dunRun) endDunRun(false, true);
        return { need, dmg: last, ratio, cleared: cleared && ratio >= 1, deaths, bossSeen };
      }, [c.stage, c.dun, c.f]);
      if (r.err) { console.log('  ' + JSON.stringify(c) + ' — ' + r.err); continue; }
      acc.ratio.push(r.ratio); acc.deaths.push(r.deaths); acc.boss.push(r.bossSeen);
      if (r.cleared) acc.cleared++;
      /* 팝업(실패 안내)·클리어 화면이 다음 판을 막지 않게 닫는다 */
      await page.evaluate(() => {
        document.querySelectorAll('.mw.on, #dunClear.on').forEach(el => el.classList.remove('on'));
        if (typeof closeModal === 'function') closeModal();
      });
      await page.waitForTimeout(60);
    }
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    rows.push({ c, ratio: avg(acc.ratio), cleared: acc.cleared + '/' + RUNS,
                deaths: avg(acc.deaths), boss: avg(acc.boss) });
  }

  console.log('\n178 던전 런 프로브 — RUNS=' + RUNS + ' (판당 30초 = step 1800틱)');
  console.log('  케이스                  dmg/need   클리어   사망   보스등장');
  for (const r of rows) {
    console.log('  ' + ('S' + r.c.stage + ' ' + r.c.dun + ' ' + r.c.f + '층').padEnd(22)
      + r.ratio.toFixed(3).padStart(8) + r.cleared.padStart(9)
      + r.deaths.toFixed(1).padStart(7) + r.boss.toFixed(1).padStart(10));
  }
  if (errs.length) console.log('\n  콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  else console.log('\n  콘솔 에러 0건');
  await browser.close();
})();
