/* 작업 699 재현 프로브 — «전투 연출 스킵» 이 없을 때의 세 모드 연출 타임라인
 *
 *   node tools/probe699.js
 *
 * 주인 원문(2026-09-02 02:00): «보스도전할때 연출효과 스킵 토글도 만들어줘. 그거클릭시
 * 던전,보스,승급전 전부 스킵 됨 연출효과. 보스도전할때 설정 가능하고 설정팝업에도 있게 해줘»
 *
 * 338 규칙 — 처방(토글을 만든다) 전에 **무엇이 시간을 먹는지 먼저 잰다.** 여기서 나온 표가
 * 곧 PROGRESS 가 요구한 «세 모드의 연출 타임라인 표» 이고, 수리 뒤 같은 자를 다시 돌려
 * «ON 이면 그 구간이 0» 을 보이는 것이 게이트(`tools/verify699.js`)의 축이다.
 *
 * 재는 것(프레임 수 · DT = 1/60):
 *   ① 스폰 대기 — 도전 시작 ~ 보스가 필드에 서는 프레임(28 `startBoss` 1.4s · 30 `DUN_BOSS_DLY` 1.4s)
 *   ② 등장 국면 — `bossIntro` 가 살아 있는 동안(457 팬 0.35 + 머묾 0.70 + 복귀 0.35)
 *   ③ 격파 시퀀스 — `bossClear` 가 살아 있는 동안(475 die 애니 + `DUN_CLR_HOLD` 1.0s)
 *   ④ 합계 — 도전 시작 ~ 결과 도달(스테이지 상승 · 던전 완료 화면 · 승급 팝업)
 *      ⚠ ④ 에는 «보스를 실제로 때려 죽이는» 시간이 안 들어간다 — 이 자는 보스를 즉사시켜
 *        (killEnemy) **연출 구간만** 남긴다. 판정·보상은 건드리지 않는다.
 *
 * 각 모드를 스킵 OFF / ON 두 번 굴린다. 수리 전에는 두 줄이 **같아야** 정상이다(= 토글이 없다).
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용. LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const MODES = ['stage', 'dun', 'promo'];

async function run() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await ev(() => { window.requestAnimationFrame = () => 0; });

  const rows = [];
  for (const md of MODES) {
    for (const skip of [false, true]) {
      /* eslint-disable no-undef */
      const r = await ev(([md, skip]) => {
        const DT = 1 / 60;
        const tick = () => { player.hp = stat.maxHp; player.dead = 0; step(DT); };

        localStorage.clear();
        Object.assign(S, DEF());
        S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash'];
        S.stage = 30; S.best = 30; S.guide.idx = 99; S.rank = 0; S.dia = 999999; S.gold = 999999;
        for (const d of DUNGEONS) S.dunTk[d.id] = 9;
        for (const t of TOWERS) S.dunTk[t.id] = 9;
        S.opt.fxSkip = !!skip;
        arena = null; raidOn = null; promo = null;
        if (dunRun) endDunRun(false, true);
        spawnStage();
        document.querySelectorAll('.modal.on, .mw.on, #defw.on').forEach((el) => el.classList.remove('on'));
        const on = notify, op = popup;
        notify = () => {}; popup = () => {};

        const tk = md === 'stage' ? 'boss' : md === 'dun' ? 'dunboss' : 'promo';
        const dg = DUNGEONS[0];
        const st0 = S.stage, rk0 = S.rank;
        /* 결과 도달 판정 — 모드마다 «이미 있는» 후속 경로가 서는 자리를 본다(새 축을 안 만든다) */
        const done = () => md === 'stage' ? S.stage > st0
                         : md === 'dun'   ? (!dunRun && $('dclw').classList.contains('on'))
                         :                  (!promo && S.rank > rk0);

        if (md === 'stage') startBoss();
        else if (md === 'dun') startDunRun(dg, (S.dun[dg.id] || 0) + 1);
        else startPromo();

        let f = 0, spawn = -1, intro = 0, clear = 0, killed = false, total = -1;
        const LIM = 1200;                                  /* 20초 — 안 끝나면 그대로 보고한다 */
        while (f < LIM) {
          const standing = enemies.some((e) => e.tk === tk);
          if (spawn < 0 && standing) spawn = f;            /* ① 보스가 선 프레임 */
          if (bossIntro) intro++;                          /* ② 등장 국면 */
          if (bossClear) clear++;                          /* ③ 격파 시퀀스 */
          /* 보스가 서고 국면이 닫힌 첫 프레임에 즉사시킨다 — 남는 것은 연출 구간뿐이다 */
          if (!killed && standing && !bossIntro) {
            const b = enemies.find((e) => e.tk === tk);
            if (b) { killEnemy(b); killed = true; }
          }
          tick(); f++;
          if (killed && done()) { total = f; break; }
        }
        notify = on; popup = op;
        return { md, skip, spawn, intro, clear, total, killed, err: null };
      }, [md, skip]);
      rows.push(r && r.__err ? { md, skip, err: r.__err } : r);
    }
  }

  await browser.close();
  return { rows, errs };
}

const F = (n) => (n < 0 ? '  —  ' : (n / 60).toFixed(2) + 's');
run().then(({ rows, errs }) => {
  console.log('PROBE699 — 세 모드의 연출 타임라인(프레임 → 초, DT=1/60)');
  console.log('모드   스킵 | ①스폰대기 ②등장국면 ③격파시퀀스 ④합계(도전→결과)');
  let bad = 0;
  for (const r of rows) {
    if (r.err) { console.log(`${r.md.padEnd(6)} ${r.skip ? 'ON ' : 'OFF'} | ERR ${r.err}`); bad++; continue; }
    console.log(`${r.md.padEnd(6)} ${r.skip ? 'ON ' : 'OFF'} | ${F(r.spawn).padStart(7)}  ${F(r.intro).padStart(7)}  `
      + `${F(r.clear).padStart(9)}  ${F(r.total).padStart(7)}${r.total < 0 ? '  ⚠ 20초 안에 결과 없음' : ''}`);
    if (r.total < 0 || !r.killed) bad++;
  }
  /* 대조 한 줄 — OFF ↔ ON 이 같으면 «스킵이 없다»(수리 전), 다르면 스킵이 실제로 접는다(수리 후) */
  console.log('');
  for (const md of MODES) {
    const o = rows.find((r) => r.md === md && !r.skip), n = rows.find((r) => r.md === md && r.skip);
    if (!o || !n || o.err || n.err) continue;
    const cut = o.total - n.total;
    console.log(`${md.padEnd(6)} OFF ${F(o.total)} → ON ${F(n.total)} : ${cut === 0 ? '변화 없음(스킵 미구현)' : '−' + F(cut)}`);
  }
  if (errs.length) console.log('\n콘솔 에러 ' + errs.length + '건: ' + errs.slice(0, 3).join(' | '));
  console.log(bad ? `\nPROBE699 ${bad}건 미측정` : '\nPROBE699 측정 완료');
}).catch((e) => { console.error(e); process.exit(1); });
