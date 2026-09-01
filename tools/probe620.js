/* probe620 — verify504 [C] 표본이 8번째 판부터 «시전 0» 이 되는 자리를 찍는다.
 *
 * 무엇을 묻나: verify504 의 눈금 504-RUL 은 한 종을 K=6 회 굴린다(슬래시 6 · 볼트 6 · …).
 * 2026-09-01 실행에서 slash 6/6 · bolt 1/6 · 그 뒤 9종 0/6 으로 **시전이 통째로 멈춘다**.
 * 「판이 문제」가 아니라 「앞 판이 남긴 상태」라면 멈춘 자리 뒤로는 무엇을 굴려도 0 이다.
 *
 * 그래서 이 자는 값을 재지 않고 **가드의 세 항**(475 `bossClear` · 473 `preFight` 의
 * `bossIntro` · `cdArm && battleBusy()`)을 판마다 찍는다 — 22708 의
 *   if(!preFight() && !bossClear){ … 스킬 루프 … }
 * 에서 어느 항이 참으로 굳는지가 곧 뿌리다.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const IDS = ['slash', 'bolt', 'drain', 'nova', 'holy'];
const K = 6, SEC = 25, POP = 23;

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok  ' : '  FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function');
  await page.waitForTimeout(500);

  const R = await page.evaluate(({ ids, K, SEC, POP }) => {
    const rawCast = window.castSkill;
    const log = [];
    let ownSave;
    const snap = () => ({
      intro: !!bossIntro,
      clear: !!bossClear,
      clearMd: bossClear ? bossClear.md : '',
      clearT: bossClear ? +bossClear.t.toFixed(2) : 0,
      clearDie: bossClear ? bossClear.die : null,
      cdArm: typeof cdArm !== 'undefined' ? !!cdArm : null,
      busy: typeof battleBusy === 'function' ? !!battleBusy() : null,
      mode: typeof bossMode === 'function' ? bossMode() : '?',
      bossT: typeof bossT !== 'undefined' ? +bossT.toFixed(2) : null,
      best: S.best, stage: S.stage
    });
    const one = (id, n) => {
      S.stage = 20; killed = 0;
      player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
      player.dead = 0; player.hp = stat.maxHp;
      enemies.length = 0; shots.length = 0; zones.length = 0;
      if (typeof drones !== 'undefined') drones.length = 0;
      for (const k of Object.keys(skillCd)) delete skillCd[k];
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
      const before = snap();
      let casts = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
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
      }
      window.castSkill = rawCast;
      const after = snap();
      S.own = ownSave; markDirty();
      log.push({ n, id, casts, before, after });
    };
    let n = 0;
    outer:
    for (const id of ids) {
      for (let k = 0; k < K; k++) {
        one(id, ++n);
        if (log.length >= 2 && log[log.length - 1].casts === 0 && log[log.length - 2].casts === 0) break outer;
      }
    }
    S.eqSkill = ['slash']; markDirty();
    return log;
  }, { ids: IDS, K, SEC, POP });

  console.log('\nprobe620 — 판별 표 (판 = 504-RUL 한 번, ' + SEC + '초)');
  console.log('     ' + '판'.padEnd(5) + 'id'.padEnd(8) + '시전'.padEnd(7)
    + '판 시작 상태'.padEnd(30) + '판 끝 상태');
  const fmt = s => 'intro=' + (s.intro ? 1 : 0) + ' clear=' + (s.clear ? 1 : 0)
    + (s.clear ? '(' + s.clearMd + ' t=' + s.clearT + '/die=' + s.clearDie + ')' : '')
    + ' cdArm=' + (s.cdArm ? 1 : 0) + ' busy=' + (s.busy ? 1 : 0) + ' mode="' + s.mode + '"';
  for (const r of R) {
    console.log('     ' + String(r.n).padEnd(5) + r.id.padEnd(8) + String(r.casts).padEnd(7)
      + fmt(r.before).padEnd(30) + ' | ' + fmt(r.after));
  }

  const first0 = R.find(r => r.casts === 0);
  const tail = R.filter(r => first0 && r.n >= first0.n);

  ok(R.some(r => r.casts > 0), '[1] 굳기 전에는 실제로 시전된다(하네스 자체는 살아 있다)',
     R.filter(r => r.casts > 0).length + '판 시전 > 0');
  ok(!!first0, '[2] 어느 판부터 «시전 0» 이 되는 자리가 있다',
     first0 ? first0.n + '번째 판(' + first0.id + ')부터' : '없음');
  ok(!!first0 && tail.every(r => r.casts === 0),
     '[3] 그 뒤로는 종을 바꿔도 **한 번도** 안 나간다 = 판이 아니라 «남은 상태» 다',
     tail.length + '판 연속 0');
  const latched = first0 ? first0.before : null;
  ok(!!latched && (latched.clear || latched.intro || (latched.cdArm && latched.busy)),
     '[4] 굳은 판은 **시작 시점에 이미** 22708 가드가 닫혀 있다',
     latched ? fmt(latched) : '—');
  ok(!!latched && latched.clear && !latched.intro,
     '[5] 닫은 항은 475 `bossClear` 다(473 `bossIntro`·`cdArm` 이 아니다)',
     latched ? 'clear=' + (latched.clear ? 1 : 0) + ' intro=' + (latched.intro ? 1 : 0)
       + ' cdArm=' + (latched.cdArm ? 1 : 0) + ' busy=' + (latched.busy ? 1 : 0) : '—');
  ok(!!latched && latched.clear && !(latched.clearDie > 0),
     '[6] `bossClear.die` 가 «> 0» 이 아니라 23351 `t >= die + HOLD` 가 영원히 거짓이다',
     latched && latched.clear ? 'die=' + latched.clearDie + ' t=' + latched.clearT : '—');

  console.log('\nPROBE620 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
