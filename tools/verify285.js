/* 작업 285 (구 278ⓑ — 281 이 번호를 옮겼다) 게이트 — «보스전 제한 시간을 전부 15초로 — 던전·스테이지 보스·승급전 등»
 *
 *   node tools/verify285.js   → 마지막 줄이 `VERIFY285 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-27): «던전이고 뭐고 다 15초».
 *
 * T2 «기능 완성 규칙» — «상수를 15 로 적어 놓음» 이 아니라 «실제 게임 데이터로 동작» 이어야 완료다.
 * 그래서 전부 실제 진입점(startBoss / startDunRun / startPromo / startRaid / startArena)을 불러
 * **실제 런타임 시계와 화면의 실제 DOM 숫자**를 잰다 — 상수를 다시 읽는 항등식이 아니다.
 *
 *   §1 단일 출처  BOSS_SEC 하나가 15 이고, 던전·승급전이 **자기 리터럴이 아니라 그것을 참조**한다.
 *                 (소스 정규식 — 참조가 다시 리터럴로 굳는 회귀를 잡는 자리다)
 *   §2 실동작     세 보스전에 실제로 들어가 남은 시간이 15 에서 시작하는지 · HUD ⏱ 숫자가 «15.0» 인지.
 *   §3 예외 2곳   DPS 측정장(46)은 30초 · 아레나(123)는 30초 그대로다 — 264 주인 지시와 «PvP 는 보스전이 아님».
 *   §4 밸런스     시간만 줄이면 하드락이다. 보스 체력 배수가 시간과 **같은 비율로** 내려갔는지(×22 → ×11 ·
 *                 승급 ×60 → ×BOSS_SEC), 그리고 던전 계수가 15초 창으로 다시 잡혔는지(DUN_DMG_K).
 *   §5 파생       331 이 시간 폴백 DUN_BOSS_AT 을 폐지했다 — 되살아나지 않았는지 본다.
 *   §6 음성항     되돌리면 잡히는가 — 옛 값으로 계산해 «이 게이트가 무엇을 막는지» 를 보인다.
 *   §7 에러       콘솔·페이지 에러 0건.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const KEY = 'idle_hunter_save_v4';
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');   /* 주석을 뺀 «진짜 코드» — 주석 속 옛 숫자에 안 속는다 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const eq = (m, got, want) => ok(got === want, m, `기대 ${want} · 실제 ${got}`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= Math.abs(want) * tol + 1e-12,
                                       m, `기대 ≈${want} · 실제 ${got}`);

/* 게이트 자기 상수 — 설치본을 다시 부르는 «항등식» 을 피한다(LESSONS 212-①). */
const C = { SEC: 15, BOSS_HP: 11, BOSS_DMG: 22, RAID_SEC: 30, ARENA_SEC: 30, DMG_K: 0.4, BOSS_AT: null };   /* 331 — 시간 폴백 폐지 */
/* 285 이전 값 — §6 음성항이 «되돌리면 빨개진다» 를 보이는 데 쓴다 */
const OLD = { SEC: 30, PROMO_SEC: 60, BOSS_HP: 22, PROMO_HP: 60, DMG_K: 1.2, BOSS_AT: 10 };

const SAVE = {
  rank: 0, best: 9999, stage: 50, gold: 1e30, dia: 1e12, trainStage: 6,
  lv: { atk: 900, hp: 900, regen: 400, aspd: 60, crit: 60, cdmg: 60, def: 40, spd: 20, pierce: 6 }
};
/* 게임 루프를 얼린다 — 얼리지 않으면 박아 둔 상태를 다음 프레임이 곧바로 되돌린다(161 교훈). */
const freeze = p => p.evaluate(() => { window.requestAnimationFrame = () => 0; });

(async () => {
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, SAVE]);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof BOSS_SEC === 'number');
  await freeze(page);

  /* ───────────────────────── §1 단일 출처 ───────────────────────── */
  console.log('\n[1] 단일 출처 — BOSS_SEC 하나를 던전·승급전이 «참조» 한다');
  const src = await page.evaluate(() => ({ boss: BOSS_SEC, dun: DUN_SEC }));
  eq('① BOSS_SEC = 15 (주인 지시 «다 15초»)', src.boss, C.SEC);
  eq('① DUN_SEC 이 BOSS_SEC 과 같은 값이다', src.dun, C.SEC);
  /* 값이 같은 것만으로는 «두 곳에 15 를 각각 적어 둔» 상태와 구분이 안 된다 — 참조인지 소스로 본다.
     이것이 등재문의 «또 갈라지면 같은 지시가 반복된다» 를 막는 항목이다. */
  ok(/const DUN_SEC\s*=\s*BOSS_SEC\s*;/.test(CODE),
     '① DUN_SEC 은 리터럴이 아니라 `BOSS_SEC` 참조다 (갈라짐 방지)');
  ok(!/const DUN_SEC\s*=\s*\d/.test(CODE), '① DUN_SEC 에 숫자 리터럴이 다시 굳지 않았다');
  ok(/promo = \{ t:BOSS_SEC, max:BOSS_SEC,/.test(CODE),
     '① 승급전 시계도 `BOSS_SEC` 참조다 (60 리터럴이 사라졌다)');
  ok(!/promo = \{ t:\d+, max:\d+/.test(CODE), '① 승급전 시계에 숫자 리터럴이 다시 굳지 않았다');

  /* ───────────────────────── §2 실동작 ───────────────────────── */
  console.log('\n[2] 실동작 — 세 보스전에 실제로 들어가 시계·HUD 숫자를 잰다');
  const hudT = `(() => { drawHud(); return document.getElementById('bossTmN').textContent; })()`;

  /* ⓐ 스테이지 보스(28/162) */
  const a = await page.evaluate(`(() => {
    S.stage = 50; startBoss();
    const t = bossT, tx = ${hudT};
    return { t, tx, on: document.getElementById('bossTm').classList.contains('on') };
  })()`);
  eq('② ⓐ 스테이지 보스 — bossT 가 15 에서 시작한다', a.t, C.SEC);
  ok(a.on, '② ⓐ ⏱ HUD 가 떠 있다');
  eq('② ⓐ ⏱ 화면 숫자 = «15.0»', a.tx, '15.0');

  /* ⓑ 던전 런(30) */
  const b = await page.evaluate(`(() => {
    bossT = 0; bossOn = false; S.bossFarm = false;
    const d = DUNGEONS.find(x => x.id === 'gold'); startDunRun(d, 1);
    drawHud();
    return { t: dunRun.t, tx: document.getElementById('dunTmN').textContent,
             need: dunRun.need, req: d.req(1) };
  })()`);
  eq('② ⓑ 던전 런 — dunRun.t 가 15 에서 시작한다', b.t, C.SEC);
  eq('② ⓑ 던전 ⏱ 화면 숫자 = «15.0»', b.tx, '15.0');

  /* ⓒ 승급전(179/208) — 던전 런을 먼저 걷어낸다 */
  const c = await page.evaluate(`(() => {
    dunRun = null; enemies.length = 0; spawnQ.length = 0;
    S.rank = 0; startPromo();
    const e = enemies.find(x => x.tk === 'promo');
    return { t: promo && promo.t, max: promo && promo.max, tx: ${hudT},
             hp: e ? e.max : null, want: eHp(S.stage) };
  })()`);
  eq('② ⓒ 승급전 — promo.t 가 15 에서 시작한다', c.t, C.SEC);
  eq('② ⓒ 승급전 — promo.max 도 15 다 (진행바 분모)', c.max, C.SEC);
  eq('② ⓒ 승급전 ⏱ 화면 숫자 = «15.0»', c.tx, '15.0');

  /* ───────────────────────── §3 예외 2곳 ───────────────────────── */
  console.log('\n[3] 예외 — DPS 측정장·아레나는 30초 그대로다 (보스전이 아니다)');
  const x = await page.evaluate(() => ({ raid: RAIDS[0].sec, arena: ARENA.sec }));
  eq('③ DPS 측정장(46) = 30초 — 264 주인 지시 «30초 만에 얼마나 넣는지 측정»', x.raid, C.RAID_SEC);
  eq('③ 아레나(123) = 30초 — PvP 지 보스전이 아니다', x.arena, C.ARENA_SEC);
  /* 예외가 «빠뜨린 것» 이 아니라 «뺀 것» 임을 소스에 남겼는지까지 본다 */
  ok(/285[\s\S]{0,400}?DPS 측정장/.test(SRC), '③ DPS 예외 사유가 소스 주석에 적혀 있다');
  ok(/285[\s\S]{0,400}?아레나는 PvP/.test(SRC), '③ 아레나 예외 사유가 소스 주석에 적혀 있다');

  /* ───────────────────────── §4 밸런스 ───────────────────────── */
  console.log('\n[4] 밸런스 — 시간만 줄이면 하드락이다. 체력이 같은 비율로 내려갔는가');
  const bal = await page.evaluate(() => ({
    hp: ETYPE.boss.hp, dmg: ETYPE.boss.dmg, gate: BOSS_GATE_HP, k: DUN_DMG_K
  }));
  eq('④ 보스 체력 배수 ×11 — 30→15초와 같은 비율(×22 의 절반)', bal.hp, C.BOSS_HP);
  eq('④ 보스 공격력 배수 ×22 불변 — «오래 걸리는 것이지 즉사가 아니다»(249 ②)', bal.dmg, C.BOSS_DMG);
  /* 시간과 체력이 같은 비율로 줄면 sim249 [C] 역산 상한이 불변이다 — 그래서 이 값은 안 바뀐다 */
  near('④ BOSS_GATE_HP 1.44 불변 — 시간·체력이 같은 비로 줄어 역산 상한(1.4469)이 그대로다', bal.gate, 1.44, 1e-12);
  near('④ DUN_DMG_K = 0.4 — 15초 창으로 다시 잰 값(probe255: 30/30 · 최악 예산의 65%)', bal.k, C.DMG_K, 1e-12);
  /* 승급 수호자 체력도 시간과 같이 내려갔는가 — 실제 스폰된 개체로 잰다(표시가 아니라 개체) */
  near('④ 승급 수호자 체력 = eHp(s) × BOSS_SEC — 60초/×60 의 «초당 배수 1.0» 을 옮긴 자리',
       c.hp, c.want * C.SEC, 1e-9);
  ok(/hp = eHp\(s\)\*BOSS_SEC;/.test(CODE), '④ 승급 체력식도 리터럴이 아니라 `BOSS_SEC` 참조다');

  /* ───────────────────────── §5 파생 상수 ───────────────────────── */
  console.log('\n[5] 파생 — 절대 초로 남은 값이 없는가');
  /* ⚑ 331 이관 — 옛 §5 는 «시간 폴백 DUN_BOSS_AT 이 절대 초가 아니라 예산의 1/3 인가» 를 쟀다.
     331 이 몹 국면과 함께 **그 폴백을 통째로 폐지**했으므로(보스는 입장과 동시에 선다) 잴 값이 없다.
     단언은 지우지 않고 그 부류로 옮긴다(LESSONS 317-②): 285 가 지키려던 것은 «절대 초로 남은 값이
     예산 밖에 서지 않는가» 였고, 이제 그 자리는 **폴백이 되살아나지 않았는가** 로 지킨다. */
  const at = await page.evaluate(() => (typeof DUN_BOSS_AT === 'undefined' ? null : DUN_BOSS_AT));
  eq('⑤ 331 — DUN_BOSS_AT(시간 폴백)이 폐지돼 없다', at, null);
  ok(!/const DUN_BOSS_AT\s*=/.test(CODE), '⑤ 331 — 선언도 남아 있지 않다(되살아난 눈금 회귀 잠금)');
  /* 남은 유일한 지연은 «등장음이 울릴 틈» 이다 — 그것만은 예산 안에 있어야 한다 */
  const dly = await page.evaluate(() => DUN_BOSS_DLY);
  ok(dly < src.dun, `⑤ 스폰 딜레이(${dly}s) < 제한 시간(${src.dun}s) — 입장 즉시 보스가 설 틈이 남는다`);

  /* ───────────────────────── §6 음성항 ───────────────────────── */
  console.log('\n[6] 음성항 — 옛 값으로 되돌리면 이 게이트가 잡는가');
  ok(src.boss !== OLD.SEC, `⑥ N1 — BOSS_SEC 이 옛 30 이었다면 §1·§2 가 전부 빨갛다 (지금 ${src.boss})`);
  ok(c.t !== OLD.PROMO_SEC, `⑥ N2 — 승급전이 옛 60초였다면 §2ⓒ 가 빨갛다 (지금 ${c.t})`);
  ok(bal.hp !== OLD.BOSS_HP,
     `⑥ N3 — 보스 체력이 ×22 로 남았다면 «훈련만» 설계 플레이어가 15초 안에 못 잡는다(sim249 [C] 상한 «없음») (지금 ×${bal.hp})`);
  ok(Math.abs(bal.k - OLD.DMG_K) > 1e-9,
     `⑥ N4 — DUN_DMG_K 가 옛 1.2 로 남았다면 던전 요구치가 시간 대비 3배가 된다 (지금 ${bal.k})`);
  ok(at !== OLD.BOSS_AT,
     `⑥ N5 — 331 이후 DUN_BOSS_AT 은 폐지값(null)이다 — 옛 10초로 되살아나면 이 항이 빨개진다 (지금 ${at})`);
  /* N6 — «값은 15 인데 리터럴로 각각 적어 둔» 상태는 §1 참조 항목만이 잡는다는 증명 */
  ok(!/const DUN_SEC\s*=\s*15\s*;/.test(CODE),
     '⑥ N6 — DUN_SEC 을 «15» 리터럴로 다시 적으면 §1 이 잡는다 (값 대조만으로는 못 잡는 자리)');

  /* ───────────────────────── §7 에러 ───────────────────────── */
  console.log('\n[7] 에러');
  eq('⑦ 콘솔·페이지 에러 0건', errs.length, 0);
  if (errs.length) errs.slice(0, 5).forEach(e => console.log('      ' + e.slice(0, 160)));

  await browser.close();
  console.log('\nVERIFY285 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
