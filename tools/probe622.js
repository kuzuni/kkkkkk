/* probe622 — `SK.poison.hits` 선언 29.36 ↔ 실측 15.48(이탈 47%)의 **뿌리**를 대조로 확정한다.
 *
 *   node tools/probe622.js
 *
 * 622 등재문이 못박은 순서다 — «⚠ 뿌리 확정 전에 값을 고치지 마라(338 규칙 — 이속을 옛 값으로
 * 되돌려 재는 대조가 먼저다)». 그래서 이 자는 **제품을 한 줄도 안 고치고** 손잡이만 되돌려 잰다.
 *
 * 재는 것은 `verify504` [C2] 와 **같은 눈금 504-RUL**(K=6 · SEC=25 · POP=23 · 한 종만 장착 ·
 * `killed` 고정)이다. probe620 [3] 이 확인해 둔 대로 poison 을 첫 종으로 놓아 «굳기 전 창» 에서 잰다.
 *
 * 용의자 셋(등재문) — 전부 «장판 위에 적이 머무는 시간·자리» 를 건드린다:
 *   ⓐ 580  `SPD_SC = 2`      — 플레이어·잡몹 이속이 **한 상수로** 2배. 장판 수명(5.0s)·틱(0.4s)은
 *                              실시간이라 두 배 빨리 지나가면 머무는 틱 수가 **절반**이 된다.
 *   ⓑ 502  `MOB_SPD_BASE`/`CAP` — 잡몹만의 이속 축.
 *   ⓒ 541  `MOB_DRAW_SC = 1.2` — `unitSc` 가 `r`(판정) 까지 지나므로 장판 판정의 표본점
 *                              `(e.y − e.r)` 이 위로 밀린다.
 *
 * 손잡이는 `const` 라 못 바꾸므로 **값이 쓰이는 자리**에서 되돌린다(제품 무수정):
 *   · 잡몹 이속 = 프레임마다 새 개체의 `e.sp` 에 배수를 곱한다
 *   · 플레이어 이속 = `stat.speed` 게터를 재정의(원본은 `PLAYER_SPEED` 상수 하나)
 *   · 잡몹 반경 = 새 개체의 `e.r` 을 `MOB_DRAW_SC` 로 나눈다
 * 잰 뒤에는 전부 원복한다.
 *
 * ⚑ 2026-09-01(작업 721) — 자 자신의 플레이키 수리. `[3-d]`·`[3b-c]` 가 실행마다 갈렸다(5회 중
 *   [3-d] 4빨강 · [3b-c] 2빨강). 제품 0줄 — 고친 것은 **문턱뿐**이고 결론(«용의자 셋은 뿌리가
 *   아니다» · «불사 판은 부푼다»)은 그대로다. 상세는 `docs/review/721-probe622문턱플레이키.md`.
 */
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const K = 6, SEC = 25, POP = 23;
const TOL_FLOOR = 0.40;      /* `verify504` [C] 와 같은 허용 오차 바닥 */

/* ── 문턱은 «바라는 값» 이 아니라 «잰 값» 에서 온다(504-④) ─────────────────────────
 * 아래 두 뭉치의 출처는 **2026-09-01 · 같은 트리 5회 실행**의 실측 분포다(작업 721).
 *   base(현행)          15.83 / 16.50 / 16.17 / 16.67 / 15.96  → 평균 16.23 · 폭 ±2.7%
 *   용의자 되돌림 최댓값  c541 16.82 · pr15 16.30 · ply 15.86    → 셋 다 base 의 잡음 폭 **안**
 *   불사(hpinf)         26.09 / 25.11 / 23.23 / 25.44 / 23.42  → 평균 24.66 · 판별 sd 4.6
 *
 * ⚑ 721 이 고친 것 — 옛 자는 «base 보다 조금이라도 선언에 가까우면 그 손잡이가 뿌리» 였다.
 *   그런데 c541·ply·pr15 의 되돌림은 base 와 **잡음 안에서 겹친다** ⇒ 어느 쪽이 위로 가는지가
 *   실행마다 뒤집혀 [3-d] 가 5회 중 4회 헛빨강이었다([3-a]·[3-b] 도 `ply` 로 같은 함정 위에 있었다).
 *   ⇒ «뿌리» 를 **현행↔선언 간극을 절반 이상 메우는 손잡이**로 다시 정의한다(REACH).
 *   무르게 푼 것이 아님은 §R 이 산술로 못박는다 — 개체수·불사 축은 이 자로도 그대로 «뿌리» 로 읽힌다. */
const REACH = 0.50;          /* 간극의 절반 — 용의자 최댓값 16.82 ↔ 이 문턱 22.6~23.0 사이에 6 의 여유 */
/* ⚑ 불사 축의 흔들림은 «판» 이 아니라 **«실행»** 단위다 — K 를 6→18(3배)로 올려 다시 5회 재 보니
 *   실행 간 폭이 **안 줄었다**(K=6 은 23.23~26.09 · K=18 은 22.04~27.22 로 오히려 넓다).
 *   ⇒ 표본을 늘리는 길은 값을 못 사고 시간만 쓴다(K=6 유지). 문턱은 잰 분포에서 뽑는다(504-④).
 *   실측 **16회 풀**(K=6 5회 + K=18 5회 + 문턱 확정 뒤 6회) — 선언 대비 **74~95%**(평균 82.4 · sd 5.8%p) ·
 *   현행 대비 **1.33~1.73배**(평균 1.51 · sd 0.11). 옛 문턱 0.85 는 그 분포를 **한복판에서 가로지른다**
 *   (16회 중 9회가 0.85 아래 — 등재문이 «4회 중 2회» 로 잡은 그 흔들림이다). */
const HPINF_DECL = 0.65;     /* 평균에서 3.0σ 아래 · 실측 최저 74% — 현행 판(선언의 55%)과는 또렷이 갈린다 */
const HPINF_OVER = 1.15;     /* 평균에서 3.3σ 아래 · 실측 최저 1.33배 — 용의자 되돌림은 전부 현행의 1.03배 안이다 */

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok  ' : '  FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 되돌림 조합 — `mob`/`ply` 는 이속 배수, `rdiv` 는 잡몹 반경 나눗수,
   `pdiv` 는 **플레이어** 반경 나눗수(541 의 나머지 갈래), `pop` 은 눈금의 개체수, `hp` 는 잡몹 체력 배수 */
const D0 = { mob: 1, ply: 1, rdiv: 1, pdiv: 1, pop: POP, hp: 1, dps: 1, sid: 'poison' };
const C = (key, label, o) => Object.assign({ key, label }, D0, o);
const CASES = [
  C('base', '현행(수리 없음)',              {}),
  C('a580', 'ⓐ 580 되돌림 SPD_SC 2→1',      { mob: 0.5, ply: 0.5 }),
  C('c541', 'ⓒ 541 되돌림 MOB_DRAW_SC→1',   { rdiv: 1.2 }),
  C('ac',   'ⓐ+ⓒ 둘 다 되돌림',             { mob: 0.5, ply: 0.5, rdiv: 1.2 }),
  C('mob',  '잡몹 이속만 ×0.5(플레이어 현행)', { mob: 0.5 }),
  C('ply',  '플레이어 이속만 ×0.5(잡몹 현행)', { ply: 0.5 }),
  /* ── 등재문 밖의 축(위 셋이 전부 기각된 뒤에 연 자리) ── */
  C('pr15', '541 나머지 갈래 — 플레이어 반경 ÷1.5', { pdiv: 1.5 }),
  C('pop30', '개체수 23 → 30(눈금 자신의 축)',      { pop: 30 }),
  C('pop35', '개체수 23 → 35',                     { pop: 35 }),
  C('pop40', '개체수 23 → 40',                     { pop: 40 }),
  C('hp3',  '잡몹 체력 ×3',                        { hp: 3 }),
  C('hp10', '잡몹 체력 ×10',                       { hp: 10 }),
  C('hpinf', '잡몹 불사(체력 ×1e6)',               { hp: 1e6 }),
  C('dps50', '장판 피해 ×0.5(= 적이 2배 오래 산다)', { dps: 0.5 }),
  C('dps25', '장판 피해 ×0.25',                    { dps: 0.25 })
];

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message || e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof step === 'function'
    && typeof skillHits === 'function');
  await page.waitForTimeout(500);

  const consts = await page.evaluate(() => ({
    decl: skillHits(SK.poison), hitsRaw: SK.poison.hits, m: SK.poison.m, cd: SK.poison.cd,
    SPD_SC: typeof SPD_SC !== 'undefined' ? SPD_SC : null,
    MOB_SPD_BASE: typeof MOB_SPD_BASE !== 'undefined' ? MOB_SPD_BASE : null,
    MOB_SPD_CAP: typeof MOB_SPD_CAP !== 'undefined' ? MOB_SPD_CAP : null,
    PLAYER_SPEED: typeof PLAYER_SPEED !== 'undefined' ? PLAYER_SPEED : null,
    MOB_DRAW_SC: typeof MOB_DRAW_SC !== 'undefined' ? MOB_DRAW_SC : null,
    zone: (String(castSkill).match(/k:'poison'[^}]*/) || [''])[0]
  }));
  console.log('\n  손잡이 실측 — SPD_SC=' + consts.SPD_SC + ' · MOB_SPD_BASE=' + consts.MOB_SPD_BASE
    + ' · MOB_SPD_CAP=' + consts.MOB_SPD_CAP + ' · PLAYER_SPEED=' + consts.PLAYER_SPEED
    + ' · MOB_DRAW_SC=' + consts.MOB_DRAW_SC);
  console.log('  poison 선언 hits=' + consts.decl + ' · m=' + consts.m + ' · cd=' + consts.cd);

  /* ── 한 하네스로 여섯 조합을 돈다(사본을 만들면 다른 것이 갈릴 수 있다 — probe620 규약) ── */
  const run = (cs) => page.evaluate(({ mob, ply, rdiv, pdiv, pop, hp, dps, sid, K, SEC }) => {
    const POP = pop;
    const rawCast = window.castSkill, rawHit = window.hitEnemy, rawKill = window.killEnemy, rawSpeed =
      Object.getOwnPropertyDescriptor(stat, 'speed');
    const out = [];
    const pr0 = player.r;
    let ownSave;
    if (pdiv !== 1) player.r = pr0 / pdiv;
    /* 플레이어 이속 되돌림 — 원본 게터는 `PLAYER_SPEED` 상수 하나라 배수만 씌우면 된다 */
    if (ply !== 1) Object.defineProperty(stat, 'speed',
      { configurable: true, get: () => rawSpeed.get.call(stat) * ply });
    const norm = () => {                       /* 새 개체에만 한 번 — 프레임마다 곱하면 발산한다 */
      for (const e of enemies) {
        if (!e || e.__p622) continue;
        e.__p622 = 1;
        if (mob !== 1) e.sp *= mob;
        if (rdiv !== 1) e.r /= rdiv;
        if (hp !== 1) { e.hp *= hp; e.max *= hp; }
      }
      if (dps !== 1) for (const z of zones) {
        if (z.__p622) continue;
        z.__p622 = 1; z.dps *= dps;
      }
    };
    const one = () => {
      /* 620 의 «새 판» 초기화 — 제품 입구 하나 + 눈금 쪽 조건 */
      S.stage = 20;
      spawnStage();
      enemies.length = 0; spawnQ.length = 0;
      player.vx = 0; player.vy = 0;
      for (const key of Object.keys(skillCd)) delete skillCd[key];
      ownSave = S.own; S.own = { [sid]: { l: 0 } }; S.eqSkill = [sid]; markDirty();
      let casts = 0, hits = 0, shut = 0, inSum = 0, inN = 0, kills = 0, killIn = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === sid) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      /* «장판 위에서 죽었나» — 발수의 두 출구(걸어 나갔다 / 죽었다)를 가른다 */
      window.killEnemy = function (e) {
        kills++;
        if (e) for (const z of zones) {
          if (sid === 'poison' && z.k !== 'poison') continue;
          const dx = e.x - z.x, dy = (e.y - e.r) - z.y;
          if (dx * dx + dy * dy < z.r * z.r) { killIn++; break; }
        }
        return rawKill.apply(this, arguments);
      };
      for (let f = 0; f < 60 * SEC; f++) {
        norm();
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
        killed = 0;
        if (preFight() || bossClear) shut++;
        /* 장판 위 «동시 체류 수» — 발수를 나누는 두 축(체류 수 × 틱 수) 중 하나를 따로 본다 */
        for (const z of zones) {
          if (sid === 'poison' && z.k !== 'poison') continue;
          let c = 0;
          for (const e of enemies) {
            if (!e || e.born < 0.3) continue;
            const dx = e.x - z.x, dy = (e.y - e.r) - z.y;
            if (dx * dx + dy * dy < z.r * z.r) c++;
          }
          inSum += c; inN++;
        }
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit; window.killEnemy = rawKill;
      S.own = ownSave; markDirty();
      out.push({ casts, shut, per: casts ? +(hits / casts).toFixed(2) : 0,
                 dwell: inN ? +(inSum / inN).toFixed(2) : 0, kills, killIn });
    };
    for (let i = 0; i < K; i++) one();
    Object.defineProperty(stat, 'speed', rawSpeed);
    player.r = pr0;
    for (const e of enemies) delete e.__p622;
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, Object.assign({ K, SEC }, cs));

  const avg = (l, k) => +(l.reduce((a, r) => a + r[k], 0) / l.length).toFixed(2);

  const res = {};
  console.log('\n  [1] 되돌림 대조 — 눈금 504-RUL(K=' + K + ' · ' + SEC + '초 · POP ' + POP + ')');
  console.log('     ' + '조합'.padEnd(32) + '평균발수'.padEnd(11) + '선언대비'.padEnd(11)
    + '동시체류'.padEnd(11) + '판당처치'.padEnd(11) + '장판안사망'.padEnd(12) + 'K회 값');
  for (const c of CASES) {
    const log = await run(c);
    const m = avg(log, 'per'), d = avg(log, 'dwell');
    res[c.key] = { m, d, log, kills: avg(log, 'kills'), killIn: avg(log, 'killIn'),
                   casts: log.reduce((a, r) => a + r.casts, 0), shut: log.reduce((a, r) => a + r.shut, 0) };
    console.log('     ' + c.label.padEnd(32) + String(m).padEnd(11)
      + ((m / consts.decl * 100).toFixed(0) + '%').padEnd(11)
      + String(d).padEnd(11) + String(res[c.key].kills).padEnd(11)
      + String(res[c.key].killIn).padEnd(12)
      + (log.length !== K ? '(K=' + log.length + ') ' : '') + log.map(r => r.per).join('/'));
  }

  const base = res.base, decl = consts.decl;

  /* ── [2] 전제 — 눈금이 열려 있었나 ─────────────────────── */
  ok(CASES.every(c => res[c.key].casts > 0), '[2-a] 전제 — 여섯 조합 전부 실제로 발동했다(굳은 판 0)',
     CASES.filter(c => !res[c.key].casts).map(c => c.key).join(',') || '미발동 0조합');
  ok(CASES.every(c => res[c.key].shut === 0), '[2-b] 전제 — 재는 동안 22708 가드가 한 프레임도 안 닫혔다',
     CASES.reduce((a, c) => a + res[c.key].shut, 0) + '프레임');
  ok(Math.abs(base.m / decl - 1) > 0.40,
     '[2-c] 현행 재현 — 선언 ' + decl + ' 에서 40% 넘게 벗어난다(622 등재문 재현)',
     '실측 ' + base.m + ' · 이탈 ' + ((1 - base.m / decl) * 100).toFixed(0) + '%');

  /* ── [3] 뿌리 — 등재문의 용의자 셋을 «되돌려» 물었다 ─────
     ⚑ 결론은 등재문과 **반대**다. 338·341·391·414 처럼 재현이 가설을 기각한 자리다.
     되돌림이 값을 **선언 쪽으로** 끌어올려야 그 손잡이가 뿌리인데, 셋 다 반대로 내린다. */
  const gain = k => (res[k].m - base.m) / base.m;                  /* 되돌렸을 때의 변화율 */
  /* «그 손잡이가 뿌리인가» 의 자 — 간극(현행 → 선언)을 REACH 만큼 메워야 뿌리다.
     ⚠ 옛 자(«base 보다 조금이라도 가까우면») 는 잡음 폭 안에서 부호가 뒤집혀 헛빨강을 냈다(721 · 위 주석). */
  const reachBar = () => base.m + REACH * (decl - base.m);
  const nearsDecl = m => m >= reachBar();
  const closer = k => nearsDecl(res[k].m);
  console.log('\n  [3] 되돌림 변화율(현행 대비) — a580 ' + (gain('a580') * 100).toFixed(0)
    + '% · c541 ' + (gain('c541') * 100).toFixed(0) + '% · ac ' + (gain('ac') * 100).toFixed(0)
    + '% · mob ' + (gain('mob') * 100).toFixed(0) + '% · ply ' + (gain('ply') * 100).toFixed(0)
    + '% · pr15 ' + (gain('pr15') * 100).toFixed(0) + '%');
  ok(!closer('a580'),
     '[3-a] ⓐ 580(`SPD_SC` 2→1) 기각 — 되돌리면 선언에서 **더 멀어진다**(이속은 발수를 올린다)',
     base.m + ' → ' + res.a580.m + ' (' + (gain('a580') * 100).toFixed(0) + '%) · 선언 ' + decl);
  ok(!closer('mob') && !closer('ply'),
     '[3-b] ⓑ 502(잡몹 이속) 기각 — 잡몹만·플레이어만 되돌려도 방향이 같다',
     '잡몹만 ' + res.mob.m + '(' + (gain('mob') * 100).toFixed(0) + '%) · 플레이어만 '
     + res.ply.m + '(' + (gain('ply') * 100).toFixed(0) + '%)');
  ok(Math.abs(gain('c541')) < 0.15 && Math.abs(gain('pr15')) < 0.15,
     '[3-c] ⓒ 541 기각 — 잡몹 반경·플레이어 반경 어느 쪽을 되돌려도 발수가 안 움직인다',
     '잡몹 ' + res.c541.m + '(' + (gain('c541') * 100).toFixed(0) + '%) · 플레이어 '
     + res.pr15.m + '(' + (gain('pr15') * 100).toFixed(0) + '%)');
  const SUS = ['a580', 'c541', 'ac', 'mob', 'ply', 'pr15'];   /* 등재문의 용의자 셋이 만드는 되돌림 여섯 */
  ok(SUS.every(k => !closer(k)),
     '[3-d] ⇒ 등재문의 용의자 셋(580·502·541)은 **전부 뿌리가 아니다** — 하나도 간극의 '
     + (REACH * 100).toFixed(0) + '% 를 못 메운다',
     SUS.map(k => k + ' ' + res[k].m).join(' · ') + ' · 뿌리 문턱 ' + reachBar().toFixed(2)
     + '(현행 ' + base.m + ' → 선언 ' + decl + ')');

  /* ── [3b] 그럼 무엇이 정하나 — 눈금 자신의 축(개체수)과 잡몹 체력 ── */
  console.log('\n  [3b] 눈금 축 — 개체수 23/' + res.pop30.m + '@30/' + res.pop40.m
    + '@40 · 잡몹 체력 ×3 → ' + res.hp3.m
    + ' (판당 처치 ' + base.kills + ' → ' + res.hp3.kills + ' · 장판 안 사망 '
    + base.killIn + ' → ' + res.hp3.killIn + ')');
  ok(res.pop30.m > base.m && res.pop40.m > res.pop30.m,
     '[3b-a] 발수는 **개체수에 단조 증가**한다 — 504 가 «타격수를 정하는 것은 적의 수» 라고 적은 축 그대로',
     '23→' + base.m + ' · 30→' + res.pop30.m + ' · 40→' + res.pop40.m);
  ok(res.pop40.m >= decl * 0.85,
     '[3b-b] 개체수를 올리면 선언 ' + decl + ' 에 닿는다 = 선언은 «더 붐비던 판» 의 값이다',
     'POP 40 에서 ' + res.pop40.m + ' (선언의 ' + (res.pop40.m / decl * 100).toFixed(0) + '%)');
  const hpOk = (m, ki) => m >= decl * HPINF_DECL && m >= base.m * HPINF_OVER && ki === 0;
  ok(hpOk(res.hpinf.m, res.hpinf.killIn),
     '[3b-c] **적이 안 죽는 판**에서도 선언에 닿는다 — 504 가 «불사 자유 판은 부푼다» 고 적어 둔 그 자리다',
     '불사 ' + res.hpinf.m + '(선언의 ' + (res.hpinf.m / decl * 100).toFixed(0) + '% ≥ '
     + (HPINF_DECL * 100).toFixed(0) + '% · 현행의 ' + (res.hpinf.m / base.m).toFixed(2) + '배 ≥ '
     + HPINF_OVER + '배) · 장판 안 사망 ' + base.killIn + '/판 → ' + res.hpinf.killIn);
  ok(base.killIn / Math.max(1, base.kills) > 0.95,
     '[3b-d] 현행 판은 **처치가 전부 장판 위에서 일어난다** = 발수의 출구는 «걸어 나감» 이 아니라 «사망» 이다',
     base.killIn + '/' + base.kills + '건 (판당 ' + (base.kills / SEC).toFixed(1) + '킬/초)');

  /* ── [5] 대조군 — 같은 판에서 «형제 장판·폭발형» 은 자기 선언 안에 있나 ──
     이것이 «판이 밀렸나 / 선언 하나가 낡았나» 를 가른다(338·344 의 대조 규칙).
     판이 밀렸으면 같은 축을 타는 형제들도 같이 빗나가야 한다. */
  const SIB = ['flask', 'meteor', 'nova', 'holy'];
  console.log('\n  [5] 대조군 — 같은 판·같은 눈금의 형제 광역형(허용 ±' + (TOL_FLOOR * 100) + '%)');
  console.log('     ' + 'id'.padEnd(9) + '선언'.padEnd(9) + '실측'.padEnd(9) + '이탈'.padEnd(9) + 'K회 값');
  const sib = [];
  for (const id of SIB) {
    const log = await run(Object.assign({}, D0, { sid: id }));
    const m = avg(log, 'per');
    const d = await page.evaluate(i => skillHits(SK[i]), id);
    const off = Math.abs(m / d - 1);
    sib.push({ id, decl: d, m, off });
    console.log('     ' + id.padEnd(9) + String(d).padEnd(9) + String(m).padEnd(9)
      + ((off * 100).toFixed(0) + '%').padEnd(9) + log.map(r => r.per).join('/'));
  }
  const sibBad = sib.filter(x => x.off > TOL_FLOOR);
  ok(sibBad.length === 0,
     '[5-a] 형제 광역형은 **같은 판에서 자기 선언 안**이다 = 판이 밀린 것이 아니다',
     sibBad.map(x => x.id + ' ' + (x.off * 100).toFixed(0) + '%').join(' / ')
     || SIB.length + '종 전부 ±' + (TOL_FLOOR * 100) + '% 안(최악 '
        + sib.reduce((a, b) => a.off > b.off ? a : b).id + ' '
        + (Math.max(...sib.map(x => x.off)) * 100).toFixed(0) + '%)');
  ok(Math.abs(base.m / decl - 1) > TOL_FLOOR,
     '[5-b] ⇒ 낡은 것은 **`poison` 선언 하나**다(형제 ' + SIB.length + '종은 초록, poison 만 빨강)',
     'poison ' + (Math.abs(base.m / decl - 1) * 100).toFixed(0) + '% > ±' + (TOL_FLOOR * 100) + '%');

  /* ── [4] 199 이관 표 — `hits` 만 고치면 484 가 깨진다 ───── */
  const D = await page.evaluate(meas => {
    const g = SK.poison.g;
    const t = SKILLS.filter(s => s.g === g && !s.sup);
    const dps = s => s.cd > 0 ? s.m * skillHits(s) / s.cd : s.m * skillHits(s);
    const now = t.map(dps);
    /* `hits` 만 실측으로 갈아 끼운 사본 — `m` 을 안 따라 고치면 등급 안 DPS 가 벌어진다 */
    const alt = t.map(s => s.id === 'poison'
      ? s.m * meas / s.cd
      : (s.cd > 0 ? s.m * skillHits(s) / s.cd : s.m * skillHits(s)));
    /* `m` 을 한 벌로 재역산하면(같은 DPS 를 지키는 값) 비가 제자리로 돌아온다 */
    const keep = SK.poison.m * skillHits(SK.poison) / meas;
    return { g, ids: t.map(s => s.id),
             nowRatio: Math.max(...now) / Math.min(...now),
             altRatio: Math.max(...alt) / Math.min(...alt),
             mNow: SK.poison.m, mKeep: +keep.toFixed(4) };
  }, base.m);
  console.log('\n  [4] 484 축(«등급 안 DPS 동일») — g' + D.g + ' = ' + D.ids.join(','));
  console.log('     지금 최대/최소 ' + D.nowRatio.toFixed(4)
    + ' · `hits` 만 ' + base.m + ' 로 갈면 ' + D.altRatio.toFixed(4)
    + ' · 같은 DPS 를 지키는 `m` = ' + D.mKeep + '(지금 ' + D.mNow + ')');
  ok(D.nowRatio <= 1.03, '[4-a] 지금은 `verify504` [D1](≤1.03) 이 초록이다', D.nowRatio.toFixed(4));
  ok(D.altRatio > 1.03,
     '[4-b] `hits` 만 실측으로 갈면 [D1] 이 곧바로 빨개진다 = `m` 과 **한 벌**이어야 한다',
     D.altRatio.toFixed(4) + ' > 1.03');

  /* ── [R] 되돌림 시험 — 721 이 문턱을 «무르게 푼 것» 이 아님을 산술로 못박는다(368 §R 규약) ──
     자를 바꾼 두 항([3-d]·[3b-c])에 **거짓인 사본**을 먹여 빨개지는지, **참인 사본**은 초록인지 본다.
     브라우저를 다시 안 돌리므로 공짜다 — 재는 것은 «판» 이 아니라 «판정식» 이다. */
  console.log('\n  [R] 되돌림 시험 — 뿌리 문턱 ' + reachBar().toFixed(2)
    + ' · 불사 문턱 ' + (decl * HPINF_DECL).toFixed(2) + '/' + (base.m * HPINF_OVER).toFixed(2));
  ok(!nearsDecl(base.m * 1.05) && !nearsDecl(Math.max(...SUS.map(k => res[k].m))),
     '[R-a] 잡음 폭(현행 ±5%)만큼 흔들린 값은 «뿌리» 로 안 읽힌다 = 721 이 없앤 헛빨강',
     '현행×1.05 ' + (base.m * 1.05).toFixed(2) + ' · 용의자 최댓값 '
     + Math.max(...SUS.map(k => res[k].m)) + ' < 문턱 ' + reachBar().toFixed(2));
  /* ⚠ 여기에 `hpinf` 를 쓰면 안 된다 — 그 축은 판별 sd 4.6 이라 문턱 22.8 에서 3σ 안이다(새 헛빨강이 된다).
     자가 «무르지 않다» 는 것은 **흔들리지 않는 축**(선언 자신 · 개체수 40)으로 보인다. */
  ok(nearsDecl(decl) && nearsDecl(res.pop40.m),
     '[R-b] **진짜로 선언에 닿는 손잡이**는 새 자로도 «뿌리» 다 — 자를 무르게 풀지 않았다',
     '선언 ' + decl + ' · 개체수40 ' + res.pop40.m + ' 둘 다 ≥ ' + reachBar().toFixed(2));
  ok(!hpOk(base.m, 0) && !hpOk(decl * (HPINF_DECL - 0.02), 0),
     '[R-c] 불사 판이 «안 부푸는» 사본은 [3b-c] 를 빨갛게 만든다',
     '현행값 ' + base.m + ' · 문턱 바로 아래 ' + (decl * (HPINF_DECL - 0.02)).toFixed(2)
     + ' 둘 다 빨강');
  ok(!hpOk(res.hpinf.m, 1),
     '[R-d] «장판 안 사망 0» 전제가 깨지면 [3b-c] 는 빨갛다 — 불사 전제 자체를 지킨다',
     '같은 발수(' + res.hpinf.m + ')라도 장판 안 사망 1건이면 빨강');

  ok(errs.length === 0, '[Z] 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  console.log('\nPROBE622 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
