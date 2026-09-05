/* probe620 — verify504 의 눈금 504-RUL 이 8번째 판부터 «시전 0» 으로 굳는 자리를 찍고,
 *            수리(620)가 그것을 실제로 푸는지, 그리고 남은 [C2] poison 이탈이
 *            **내 변경이 만든 값이 아님**을 같은 자리에서 대조한다(338·344 규칙).
 *
 *   node tools/probe620.js
 *
 * 세 절:
 *   [1] 옛 초기화 목록(504 원본)으로 굴리면 어느 판부터 굳고, 그 뒤로는 종을 바꿔도 0 이다.
 *   [2] 새 초기화(620 — `spawnStage()` + `killed` 고정)로 같은 순서를 굴리면 안 굳는다.
 *   [3] poison 을 **첫 종으로** K회 재면(굳기 전 창) 옛 초기화도 새 초기화와 같은 값을 준다
 *       = 47% 이탈은 620 의 수리가 만든 것이 아니라 원래 그 자리에 있던 값이다.
 */
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const IDS = ['slash', 'bolt', 'drain', 'nova', 'holy'];
const K = 6, SEC = 25, POP = 23;

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok  ' : '  FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function');
  await page.waitForTimeout(500);

  /* 한 하네스로 «옛/새» 를 둘 다 돈다 — 두 사본을 만들면 다른 것이 갈릴 수 있다 */
  const run = (mode, ids, k) => page.evaluate(({ mode, ids, K, SEC, POP }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    const log = [];
    let ownSave, n = 0;
    const snap = () => ({
      intro: !!bossIntro, clear: !!bossClear,
      cdArm: typeof cdArm !== 'undefined' ? !!cdArm : null,
      busy: typeof battleBusy === 'function' ? !!battleBusy() : null,
      mode: typeof bossMode === 'function' ? bossMode() : '?'
    });
    const one = (id) => {
      if (mode === 'old') {
        /* 504 원본의 «판을 통째로 되돌린다» 목록 — 보스전 상태가 하나도 없다 */
        S.stage = 20; killed = 0;
        player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
        player.dead = 0; player.hp = stat.maxHp;
        enemies.length = 0; shots.length = 0; zones.length = 0;
        if (typeof drones !== 'undefined') drones.length = 0;
      } else {
        /* 620 — 제품의 «새 판» 입구 하나 + 눈금 쪽 조건 */
        S.stage = 20;
        spawnStage();
        enemies.length = 0; spawnQ.length = 0;
        player.vx = 0; player.vy = 0;
      }
      for (const key of Object.keys(skillCd)) delete skillCd[key];
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
      const before = snap();
      let casts = 0, hits = 0, shut = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * SEC; f++) {
        step(1 / 60);
        while (enemies.length > POP) {
          let wi = 0, wd = -1;
          for (let i = 0; i < enemies.length; i++) {
            const d = (enemies[i].x - player.x) ** 2 + (enemies[i].y - player.y) ** 2;
            if (d > wd) { wd = d; wi = i; }
          }
          enemies.splice(wi, 1);
        }
        while (enemies.length < POP) { const b = enemies.length; makeEnemy('zombie'); if (enemies.length === b) break; }
        if (mode !== 'old') killed = 0;
        if (preFight() || bossClear) shut++;
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      S.own = ownSave; markDirty();
      log.push({ n: ++n, id, casts, shut, per: casts ? +(hits / casts).toFixed(2) : 0, before });
    };
    for (const id of ids) for (let i = 0; i < K; i++) one(id);
    S.eqSkill = ['slash']; markDirty();
    return log;
  }, { mode, ids, K: k, SEC, POP });

  const fmt = s => 'intro=' + (s.intro ? 1 : 0) + ' clear=' + (s.clear ? 1 : 0)
    + ' cdArm=' + (s.cdArm ? 1 : 0) + ' busy=' + (s.busy ? 1 : 0) + ' mode="' + s.mode + '"';
  const show = (title, log) => {
    console.log('\n  ' + title);
    console.log('     ' + '판'.padEnd(5) + 'id'.padEnd(8) + '시전'.padEnd(7) + '닫힌프레임'.padEnd(12) + '판 시작 상태');
    for (const r of log) console.log('     ' + String(r.n).padEnd(5) + r.id.padEnd(8)
      + String(r.casts).padEnd(7) + String(r.shut).padEnd(12) + fmt(r.before));
  };

  /* ── [1] 옛 초기화 — 굳는다 ─────────────────────────────── */
  const OLD = await run('old', IDS, K);
  show('[1] 옛 초기화 목록(504 원본)', OLD);
  const first0 = OLD.find(r => r.casts === 0);
  ok(OLD.some(r => r.casts > 0) && !!first0,
     '[1-a] 옛 초기화는 어느 판부터 «시전 0» 으로 굳는다',
     first0 ? first0.n + '번째 판(' + first0.id + ')부터' : '안 굳었다');
  ok(!!first0 && OLD.filter(r => r.n >= first0.n).every(r => r.casts === 0),
     '[1-b] 그 뒤로는 **종을 바꿔도** 한 번도 안 나간다 = 판이 아니라 «앞 판이 남긴 상태» 다',
     first0 ? OLD.filter(r => r.n >= first0.n).length + '판 연속 0' : '—');
  const latched = first0 ? first0.before : null;
  ok(!!latched && !latched.clear && latched.cdArm && latched.busy && latched.mode === 'stage',
     '[1-c] 닫은 항은 473 `cdArm && battleBusy()` 다 — 475 `bossClear` 가 아니다',
     latched ? fmt(latched) : '—');

  /* ── [2] 새 초기화 — 안 굳는다 ──────────────────────────── */
  const NEW = await run('new', IDS, K);
  show('[2] 새 초기화(620 — `spawnStage()` + `killed` 고정)', NEW);
  ok(NEW.every(r => r.casts > 0), '[2-a] 모든 판에서 시전된다(굳는 판 0)',
     NEW.filter(r => !r.casts).length + '판 0');
  ok(NEW.every(r => r.shut === 0), '[2-b] 재는 동안 22708 가드가 한 프레임도 안 닫혔다',
     NEW.reduce((a, r) => a + r.shut, 0) + '프레임');

  /* ── [3] poison 이탈은 620 이 만든 값이 아니다 ──────────── */
  /* 굳기 전 창에서 재려고 poison 을 **첫 종**으로 놓는다 — 옛 초기화로도 여기까지는 잰다. */
  const PO_OLD = await run('old', ['poison'], K);
  const PO_NEW = await run('new', ['poison'], K);
  const mean = l => +(l.reduce((a, r) => a + r.per, 0) / l.length).toFixed(2);
  const mo = mean(PO_OLD), mn = mean(PO_NEW);
  const decl = await page.evaluate(() => skillHits(SK.poison));
  console.log('\n  [3] poison — 선언 ' + decl + ' / 옛 초기화 ' + mo + ' / 새 초기화 ' + mn);
  console.log('       옛 ' + PO_OLD.map(r => r.per).join('/') + '  ·  새 ' + PO_NEW.map(r => r.per).join('/'));
  ok(PO_OLD.every(r => r.casts > 0), '[3-a] poison 을 첫 종으로 놓으면 옛 초기화로도 굳기 전에 잰다',
     PO_OLD.filter(r => !r.casts).length + '판 0');
  ok(Math.abs(mn / mo - 1) <= 0.15,
     '[3-b] 옛·새 초기화가 **같은 값**을 준다 = 47% 이탈은 620 의 수리가 만든 값이 아니다',
     '옛 ' + mo + ' ↔ 새 ' + mn + ' = ' + ((mn / mo - 1) * 100).toFixed(1) + '%');
  ok(Math.abs(mn / decl - 1) > 0.40,
     '[3-c] 그런데 둘 다 선언(' + decl + ')에서 40% 넘게 벗어난다 = 선언 쪽이 낡았다(622 로 등재)',
     '이탈 ' + ((1 - mn / decl) * 100).toFixed(0) + '%');

  console.log('\nPROBE620 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
