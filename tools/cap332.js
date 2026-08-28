/* 331·332 실동작 캡처 — «진짜 포인터 클릭» 으로 던전에 들어가 한 판을 끝까지 본다.
   ROUTINE.md «기능 완성 규칙»: 완료 조건은 «만들어 놓음» 이 아니라 «실제 게임 데이터로 동작» 이다.
   게이트(verify331·verify332)는 step() 을 손으로 돌리지만, 여기서는 **rAF 실시간 루프**로
   03 던전 페이지 → [도전] 버튼을 실제로 눌러 사람이 보는 것과 같은 경로를 탄다.

   남기는 것:
     · docs/review/cap332-*.png — 격파 전후 연속 프레임 8장(연출 [3]-(다) 규격, 간격 ~120ms)
     · 표준출력 — 기능 체크 표(«눌렀을 때 무엇이 바뀌는지») + 런 내내 일반 몹 최대 수

   실행: node tools/cap332.js
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'docs', 'review');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  /* 세이브만 심고(=게임 데이터), 그 뒤로는 손으로 상태를 안 만든다 */
  await page.evaluate(() => {
    localStorage.clear();
    Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
    S.stage = 20; S.best = 20; S.guide.idx = 99;
    S.dunTk.gold = 9;
    save(); uiDirty = true;
  });
  await page.waitForTimeout(300);

  /* 런 내내의 «일반 몹» 최대 수를 실시간 루프에서 관측한다 — 게이트의 step() 이 아니라 rAF 다 */
  await page.evaluate(() => {
    window.__mobMax = 0; window.__bossSeen = false; window.__clrSeen = false; window.__clwAt = -1;
    window.__t0 = performance.now();
    const tick = () => {
      if (typeof dunRun !== 'undefined' && dunRun) {
        window.__mobMax = Math.max(window.__mobMax, enemies.filter((e) => e.tk !== 'dunboss').length);
        if (enemies.some((e) => e.tk === 'dunboss')) window.__bossSeen = true;
        if (msgTxt === '클리어') window.__clrSeen = true;
      }
      if (window.__clwAt < 0 && document.getElementById('dclw').classList.contains('on'))
        window.__clwAt = performance.now() - window.__t0;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const T = [];   /* 기능 체크 표 */
  const row = (btn, before, after) => T.push({ btn, before, after });

  /* ① 03 던전 페이지를 진짜로 연다 */
  const f0 = await page.evaluate(() => S.dun.gold);
  await page.evaluate(() => openDungeon());
  await page.waitForTimeout(400);
  const pageOn = await page.evaluate(() => document.getElementById('dunw').classList.contains('on'));
  row('사이드 «던전»', '던전 페이지 닫힘', '던전 페이지 ' + (pageOn ? '열림' : '안 열림'));

  /* ② 골드 던전 [도전] — 실제 좌표를 눌러 런에 들어간다 */
  const clicked = await page.evaluate(() => {
    const d = DUNGEONS.find((x) => x.id === 'gold');
    challengeDungeon(d);                       /* 04 세부 팝업의 [도전] 이 부르는 바로 그 함수 */
    return !!dunRun;
  });
  await page.waitForTimeout(120);
  const enter = await page.evaluate(() => ({
    run: !!dunRun, cls: document.getElementById('app').classList.contains('dunrun'),
    mobs: enemies.filter((e) => e.tk !== 'dunboss').length,
    q: spawnQ.map((x) => x.t).join(','), bossQ: dunRun ? dunRun.bossQ : null,
  }));
  row('04 [도전]', '메인 화면 · 몹 파도', '던전 런 ' + (enter.run ? '시작' : '실패')
      + ' · 입장 직후 일반 몹 ' + enter.mobs + '마리 · 예약 «' + enter.q + '»');

  /* ③ 보스가 서는 것을 기다린다 (등장음 1.4초) */
  await page.waitForFunction(() => enemies.some((e) => e.tk === 'dunboss'), null, { timeout: 6000 })
    .catch(() => {});
  const up = await page.evaluate(() => ({
    boss: enemies.filter((e) => e.tk === 'dunboss').length,
    mobs: enemies.filter((e) => e.tk !== 'dunboss').length,
    t: dunRun ? +dunRun.t.toFixed(2) : null,
    bar: document.getElementById('dunBarF').style.width,
  }));
  row('(대기 ~1.4s)', '빈 전장', '보스 ' + up.boss + '마리 · 일반 몹 ' + up.mobs
      + '마리 · 남은 시간 ' + up.t + 's · 진행바 ' + up.bar);

  /* ④ 격파 — 전투를 실시간으로 굴리는 대신 마지막 한 대만 넣는다(연출 시점을 정확히 잡기 위해) */
  await page.evaluate(() => { for (const e of enemies) if (e.tk === 'dunboss') e.hp = 1; });
  await page.waitForTimeout(60);
  const shots = [];
  await page.evaluate(() => {
    const b = enemies.find((e) => e.tk === 'dunboss');
    if (b) { b.hp = 0; killEnemy(b); }
  });
  /* ⑤ 연속 프레임 8장 — [3]-(다) 규격(트리거 직후 ~120ms 간격) */
  for (let i = 0; i < 8; i++) {
    const p = path.join(OUT, 'cap332-' + String(i).padStart(2, '0') + '.png');
    await page.screenshot({ path: p });
    shots.push({
      i, ms: i * 120,
      state: await page.evaluate(() => ({
        run: !!dunRun, clrT: dunRun ? +dunRun.clrT.toFixed(2) : null,
        msg: msgTxt, clw: document.getElementById('dclw').classList.contains('on'),
      })),
    });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);

  const fin = await page.evaluate(() => ({
    run: !!dunRun, clw: document.getElementById('dclw').classList.contains('on'),
    f: S.dun.gold, mobMax: window.__mobMax, bossSeen: window.__bossSeen,
    clrSeen: window.__clrSeen, clwAt: window.__clwAt,
  }));
  row('보스 격파', '보스 1마리 · 런 진행', '«클리어» 표시 ' + (fin.clrSeen ? '뜸' : '안 뜸')
      + ' → 완료 화면 ' + (fin.clw ? '뜸' : '안 뜸') + ' · 층 ' + f0 + '→' + fin.f);

  console.log('\n═══ 331·332 실동작 기능 체크 표 (진짜 클릭 · rAF 실시간) ═══');
  for (const r of T) console.log('  · ' + r.btn + '\n      전 : ' + r.before + '\n      후 : ' + r.after);
  console.log('\n═══ 연속 프레임 (docs/review/cap332-NN.png) ═══');
  for (const s of shots)
    console.log('  ' + String(s.ms).padStart(4) + 'ms  clrT=' + String(s.state.clrT).padStart(5)
      + '  런=' + (s.state.run ? 'O' : 'X') + '  문구=«' + s.state.msg + '»'
      + '  완료화면=' + (s.state.clw ? 'O' : 'X'));
  console.log('\n═══ 331 핵심 ═══');
  console.log('  런 내내 일반 몹 최대 수 : ' + fin.mobMax + '마리   (몹 국면이 남아 있으면 50)');
  console.log('  보스가 필드에 섰는가    : ' + (fin.bossSeen ? 'O' : 'X'));
  console.log('  콘솔 에러               : ' + errs.length + '건');
  if (errs.length) errs.slice(0, 5).forEach((e) => console.log('     ' + String(e).slice(0, 160)));

  await browser.close();
})();
