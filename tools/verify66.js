#!/usr/bin/env node
/* 작업 66 게이트 — 보스 추격 AI «도망치지 않고 붙는가» 측정 (ROUTINE [3]-(가) 수치 검증)
 *
 *   node tools/verify66.js                       # 기본 스테이지 10·30 × 30초 보스전
 *   V66_SEC=30 V66_STAGES=10,30 node tools/verify66.js
 *   V66_REF=<sha> node tools/verify66.js         # 그 커밋의 index.html 도 같이 돌려 before/after 비교
 *
 * 통과 조건 (시나리오 전부):
 *   ① 30초 안에 «사거리+20» 안으로 한 번은 붙는다(첫 접촉 = 수렴 구간의 시작)
 *   ② 수렴 구간(첫 접촉 이후) 평균 거리 ≤ 사거리(e.r+player.r+6) + 50px
 *      — 전체 평균이 아니라 «수렴» 평균으로 본다. 보스는 플레이어 반경 300~700px 링(67)에 스폰하므로
 *        전체 평균에는 «아직 붙기 전» 의 스폰 거리가 통째로 섞인다.
 *   ③ 수렴 구간 «추격 표본» 중 멀어진 표본(직전 표본보다 거리가 +2px 이상 늘어난 표본) < 4%
 *      — «추격 표본» = 표본 창(6프레임 = 0.1초) 안에 **공격 모션(`e.atkT > 0`)** 도
 *        **대시(`e.dashT`/`e.dashD > 0` · 359)** 도 한 프레임도 없던 표본.
 *      — 추격 표본이 30개 미만이면 «③ 을 잴 표본이 없다» 로 FAIL (표본이 사라져서 통과하는 것을 막는다).
 *   ④ 30초 동안 보스 공격 ≥ 1회 (붙기만 하고 안 때리면 실패)
 *   ⑤ 콘솔 pageerror 0건
 *
 * ③ 이 «추격 표본만» 을 세는 이유 (작업 234 · 2026-08-27 — 233 의 처방을 그대로 옮겼다) ────────
 * 원래 ③ 은 수렴 구간의 **모든** 표본에서 «직전보다 +2px 멀어졌나» 를 셌다. 그런데 66 이 넣은
 * `if(e.atkT > 0 && d < e.r + player.r + 6) spd = 0`(index.html ~16372) 때문에 **공격 모션 0.45초 동안
 * 보스는 설계대로 제자리에 서고**, 그 사이 카이팅(59)하는 플레이어만 움직여 거리가 벌어진다.
 * 즉 그 표본의 «멀어짐» 은 추격이 밀린 것이 아니라 **지금 때리고 있다는 뜻**이다
 * («때리는가» 는 ④ 공격 횟수 축이 이미 따로 잰다).
 *   그래서 옛 ③ 은 **부호가 뒤집힌 자**였다 — 보스가 잘 붙어 공격이 늘수록 값이 올라간다.
 *   실측(`tools/probe288away.js` · 승급 수호자 30초): away 표본의 **100%** 가 모션 걸친 표본이고,
 *   모션이 없는 표본의 away 는 **0.0%**(모션 표본 171개 중 16.4% · 비모션 표본 128개 중 0.0%).
 *   이 파일에서도 같은 병이 «뜨고 지는 FAIL» 로 났다 — 같은 트리 연속 2회에 12.5% FAIL → 9.3/9.4% PASS.
 * 처방은 «문턱 완화» 가 아니라 **재정의**다(177-③ 계열). 옛 정의 값은 `convAwayRaw` 로 표에만 남기고
 * 판정에서는 뺐다 — 그 값은 8.6~12.5% 로 10% 선을 걸치고 진동한다(그래서 간헐 FAIL 이었다).
 * 자세한 근거는 `docs/review/233-verify172-멀어짐게이트재정의.md` · `docs/review/234-verify66-멀어짐게이트재정의.md`.
 *
 * 59 교훈 1 — 실시간 30초를 기다리지 않는다. rAF 를 가상 시계(고정 dt 1/60s)로 갈아끼워
 * CPU 속도로 돌린다. dt 고정이라 회차 간 재현성도 확보된다.
 *
 * 측정 중에만 거는 하니스 조건 2가지 (게임 코드는 건드리지 않는다):
 *   · 보스 hp 를 매 틱 max 로 되돌린다 — 30초 표본을 끝까지 채우기 위해(46 레이드 샌드백과 같은 처리)
 *   · 플레이어 hp 를 매 틱 채운다 — 사망(정지 2.4초)·부활 구간이 «거리» 표본을 오염시키지 않게
 * 둘 다 «보스가 플레이어에게 접근하는가» 만 재기 위한 것이고 이동 로직은 원본 그대로다.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();


const SEC = Number(process.env.V66_SEC || 30);
const STAGES = (process.env.V66_STAGES || '10,30').split(',').map(Number);
const REF = process.env.V66_REF || '';
const SLACK = 50;          /* ① 허용 여유 — 사거리 + 이 값 */
const LIM_AWAY = 4;        /* ③ «추격 표본» 멀어짐 상한 (%) — 234 에서 10 → 4 (재정의 뒤 실측이 전부 0.0%) */
const MIN_CHASE = 30;      /* ③ 추격 표본 최소 개수 — 이보다 적으면 ③ 을 잰 것이 아니다 */
const ROOT = path.resolve(__dirname, '..');

/* 페이지 안에서 가상 rAF 로 보스전을 돌리며 보스↔플레이어 거리를 10Hz 로 샘플링 */
const RUN = async ({ frames, sampleEvery, stage }) => {
  S.stage = stage; S.best = Math.max(S.best || 1, stage); S.bossFarm = false;
  spawnStage();
  /* 172(2026-08-27) — 162 이후 `spawnStage()` 는 «몹 구간» 만 깐다(보스는 50킬 뒤 `startBoss()`).
     이 게이트는 그 전제(구 `isBossStage` → 보스 단독 스폰)로 쓰여 있어 162 이후 «보스 없음 300»
     으로 항상 FAIL 했다. 재는 대상은 그대로 «보스전» 이므로 여기서 보스 구간을 직접 연다. */
  startBoss();                                    /* 보스 단독 스폰(28·162) */
  const reach = ETYPE.boss.r + player.r + 6;
  const NEAR = reach + 20;                        /* «붙었다» 판정 반경 */
  let n = 0, away = 0, near = 0, sumD = 0, maxD = 0, prev = null, noBoss = 0;
  let cn = 0, cAway = 0, cSum = 0, cPrev = null;  /* 수렴 구간(첫 접촉 이후) */
  /* 234 — ③ 은 «추격 표본»(표본 창 안에 공격 모션이 한 프레임도 없던 표본)만 센다.
     모션 중에는 보스가 서 있으라고 66 자신이 못 박아 둔 것이라, 그때 벌어진 거리는 추격의 실패가 아니다. */
  let chN = 0, chAway = 0, atkSampN = 0, sawAtk = false;
  /* 359 이관(쌍둥이 게이트 verify172 와 «글자 그대로» 같은 정의) — 234 의 «모션 표본은 추격 표본이
     아니다» 를 **대시 표본**에도 그대로 적용한다. 대시는 «예고(dashT) 동안 제자리 → 잠근 방향으로
     돌진(dashD)» 이라 제품이 스스로 «지금은 걷는 중이 아니다» 라고 선언한 구간이다.
     ⚠ 무르게 푸는 것이 아니다 — 대시가 사라지면 이 창은 0개가 되어 분모가 옛 값으로 돌아간다. */
  let dashSampN = 0, sawDash = false, dashSeen = 0, wasDash = false;
  /* 359 이관 — 359 가 BOSS_CHASE 를 1.08 → 0.94 로 내렸으므로 «속도» 열은 **평시 걸음**을 따로 낸다 */
  let walkSp = 0, walkN = 0;
  let tClose = -1;                                /* 첫 접촉까지 걸린 시간(초) */
  let sumSp = 0, spN = 0, atk = 0;                /* 보스 실제 이동 속도 평균 · 공격 시도 횟수 */
  let bx = null, by = null;
  for (let f = 0; f < frames; f++) {
    const b0 = enemies.find(e => e.tk === 'boss');
    /* 하니스 — 틱 «전에» 걸어야 그 틱의 피해·사망을 막는다.
       무적으로 두는 이유: 세이브를 비우고 시작하므로 플레이어는 «강화 0» 상태이고,
       stage 10 보스(dmg ×22) 앞에서 몇 초 만에 죽어 표본이 끊긴다. 추격 «거동» 만 재기 위한 처리다. */
    if (b0) b0.hp = b0.max;
    /* 172 — 30초 제한(BOSS_SEC)이 표본 끝에서 failBoss() 를 부르면 보스가 사라져 마지막 표본이 오염된다.
       거동만 재는 하니스 조건이라 제한 시간을 재충전한다(이동 로직은 원본 그대로). */
    bossT = 9999;
    player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
    const cd0 = b0 ? b0.cd : null;
    window.__v66tick();
    const b = enemies.find(e => e.tk === 'boss');
    if (b && cd0 !== null && b.cd > cd0) atk++;      /* 쿨다운이 «올라간» 프레임 = 공격 시작 */
    if (b && b.atkT > 0) sawAtk = true;              /* 234 — 이 표본 창에 공격 모션이 걸쳤나 */
    if (b) {                                         /* 359 — 이 표본 창에 대시(예고·돌진)가 걸쳤나 */
      const inD = (b.dashT > 0) || (b.dashD > 0);
      if (inD) sawDash = true;
      if (inD && !wasDash) dashSeen++;
      wasDash = inD;
    }
    if (f % sampleEvery === 0) {
      if (!b) { noBoss++; prev = null; sawAtk = false; sawDash = false; continue; }
      const d = Math.hypot(player.x - b.x, player.y - b.y);
      if (prev !== null && d > prev + 2) away++;
      prev = d;
      sumD += d; if (d > maxD) maxD = d;
      if (d <= NEAR) { near++; if (tClose < 0) tClose = f / 60; }
      n++;
      if (tClose >= 0) {                          /* 접근이 끝난 뒤 = «수렴» 구간 */
        cSum += d; cn++;
        const isAway = cPrev !== null && d > cPrev + 2;
        if (isAway) cAway++;
        if (cPrev !== null) {                     /* 234 — 모션 걸친 표본은 분자·분모에서 «함께» 뺀다 */
          if (sawAtk) atkSampN++;
          else if (sawDash) dashSampN++;          /* 359 이관 — 대시 표본도 같은 이유로 «함께» 뺀다 */
          else { chN++; if (isAway) chAway++; }
        }
        cPrev = d;
      }
      if (bx !== null) {
        const sp = Math.hypot(b.x - bx, b.y - by) / (sampleEvery / 60);
        sumSp += sp; spN++;
        if (!sawDash && !sawAtk) { walkSp += sp; walkN++; }   /* 359 — 평시 걸음만 */
      }
      bx = b.x; by = b.y;
      sawAtk = false; sawDash = false;
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    n, noBoss, reach, meanD: sumD / Math.max(1, n), maxD, tClose,
    away: away / Math.max(1, n) * 100, near: near / Math.max(1, n) * 100,
    cn, convD: cn ? cSum / cn : Infinity, atk,
    /* ③ 본체 — 추격 표본만. convAwayRaw 는 옛 정의(모션 표본 포함)로, 판정에는 안 쓰고 표에만 남긴다. */
    chaseN: chN, convAway: chN ? chAway / chN * 100 : 100,
    atkSampN, dashSampN, dashSeen, convAwayRaw: cn ? cAway / cn * 100 : 100,
    walkN, walkSp: walkN ? walkSp / walkN : 0,           /* 359 — 평시 걸음 속도 */
    bossSp: sumSp / Math.max(1, spN), pSpeed: stat.speed, stage: S.stage,
  };
};

async function runOne(browser, url, stage) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => {
    /* 가상 시계 rAF — dt 고정 1/60s (59 교훈 1) */
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v66tick = () => {
      vt += 1000 / 60;
      const list = q.splice(0, q.length);
      for (const cb of list) { try { cb(vt); } catch (e) {} }
    };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v66tick(); });   /* 워밍업 10초(가상) */
  const r = await page.evaluate(RUN, { frames: Math.round(SEC * 60), sampleEvery: 6, stage });
  await ctx.close();
  return { ...r, errs };
}

function checkoutRef(sha) {
  /* 756 — 얕은 클론이면 **먼저 판다**(규약 ①). 못 가져오면 «환경이냐 진짜 없음이냐» 를 밝혀 던진다(규약 ②).
     ⚠ 이 `checkoutRef` 는 자 여섯 벌에 **글자 그대로 복사**돼 있었다 — 판는 사다리는 부품 한 벌에 둔다. */
  const got = require('./gitrev756').show(sha, 'index.html', { maxBuffer: 64 * 1024 * 1024 });
  if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
  if (got.how) console.log('[i]' + got.how);
  const out = got.buf;
  const p = path.join(ROOT, `.v66-before-${sha.slice(0, 7)}-${process.pid}.html`);
  fs.writeFileSync(p, out);
  return p;
}

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const rows = [];
  let refFile = null;
  try {
    if (REF) refFile = checkoutRef(REF);
    /* V66_FILE — 튜닝 실험용(상수만 바꾼 임시 복사본을 재는 용도). 기본은 저장소 index.html */
    const targets = [{ tag: 'after', file: process.env.V66_FILE ? path.resolve(process.env.V66_FILE) : path.join(ROOT, 'index.html') }];
    if (refFile) targets.unshift({ tag: 'before(' + REF.slice(0, 7) + ')', file: refFile });

    for (const t of targets) {
      const url = 'file://' + t.file.replace(/\\/g, '/');
      for (const st of STAGES) {
        process.stdout.write(`[·] ${t.tag} · stage ${st} · ${SEC}초 보스전 … `);
        const r = await runOne(browser, url, st);
        rows.push({ tag: t.tag, st, ...r });
        console.log(`수렴거리 ${r.cn ? Math.round(r.convD) : '—'}px · 추격 멀어짐 ${r.convAway.toFixed(1)}%(옛 정의 ${r.convAwayRaw.toFixed(1)}%) · 접촉까지 ${r.tClose < 0 ? '없음' : r.tClose.toFixed(1) + 's'}`);
        if (r.errs.length) console.log('    pageerror: ' + r.errs.slice(0, 3).join(' | '));
      }
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n| 빌드 | stage | 표본 | 사거리 | 전체 평균 | 접촉까지 | 수렴 평균 | **추격 멀어짐%** | 추격 표본 | 모션 표본 | 대시 표본 | 대시 횟수 | 옛 정의% | 붙어있음% | 최대거리 | 평시 걸음 | 전체 평균속도 | 플레이어속도 | 보스 공격 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${r.st} | ${r.n} | ${r.reach}px | ${Math.round(r.meanD)}px | ${r.tClose < 0 ? '—' : r.tClose.toFixed(1) + 's'} | `
      + `${r.cn ? Math.round(r.convD) + 'px' : '—'} | **${r.convAway.toFixed(1)}%** | ${r.chaseN} | ${r.atkSampN} | ${r.dashSampN} | ${r.dashSeen}회 | ${r.convAwayRaw.toFixed(1)}% | ${r.near.toFixed(1)}% | ${Math.round(r.maxD)}px | `
      + `${Math.round(r.walkSp)}px/s | ${Math.round(r.bossSp)}px/s | ${Math.round(r.pSpeed)}px/s | ${r.atk}회 |`);

  const fails = [];
  for (const r of rows.filter(r => r.tag === 'after')) {
    if (r.errs.length) fails.push(`stage ${r.st}: pageerror ${r.errs[0]}`);
    if (r.n < SEC * 10 * 0.8) fails.push(`stage ${r.st}: 표본 부족 ${r.n} (보스 없음 ${r.noBoss})`);
    if (r.tClose < 0) fails.push(`stage ${r.st}: ${SEC}초 안에 사거리+20 안으로 «한 번도» 못 붙음`);
    else if (r.convD > r.reach + SLACK) fails.push(`stage ${r.st}: 수렴 구간 평균 거리 ${Math.round(r.convD)}px > 사거리+${SLACK} (${r.reach + SLACK}px)`);
    if (r.chaseN < MIN_CHASE)
      fails.push(`stage ${r.st}: 추격 표본 ${r.chaseN} < ${MIN_CHASE} — ③ 을 잴 표본이 없다(모션 표본 ${r.atkSampN} · 대시 표본 ${r.dashSampN})`);
    else if (r.convAway >= LIM_AWAY)
      fails.push(`stage ${r.st}: 수렴 구간 «추격» 표본 멀어짐 ${r.convAway.toFixed(1)}% ≥ ${LIM_AWAY}% (추격 표본 ${r.chaseN} · 모션 표본 ${r.atkSampN} · 대시 표본 ${r.dashSampN} 제외 · 옛 정의로는 ${r.convAwayRaw.toFixed(1)}%)`);
    if (r.atk < 1) fails.push(`stage ${r.st}: 보스가 ${SEC}초 동안 «공격을 한 번도» 하지 않음`);
  }
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); console.log('\nV66 FAIL'); process.exit(1); }
  console.log('\nV66 PASS');
})().catch(e => { console.error(e); process.exit(2); });
