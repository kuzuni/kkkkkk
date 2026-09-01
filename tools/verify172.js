#!/usr/bin/env node
/* 작업 172 게이트 — «보스가 플레이어 반대편으로 자꾸 간다» 재현·회귀 (ROUTINE [3]-(가) 수치 검증)
 *
 *   node tools/verify172.js
 *   V172_SEC=30 V172_SCN=boss,promo,arena node tools/verify172.js
 *   V172_REF=<sha> node tools/verify172.js       # 그 커밋의 index.html 도 같이 돌려 before/after 비교
 *
 * 66 은 «스테이지 보스»(tk:'boss') 하나만 쟀다(tools/verify66.js). 172 의 등재문 ① 이 요구하는
 * «스폰 경로별 tk 전수 확인» 을 게이트로 굳힌 것이 이 파일이다 — **1:1 단독 개체 3종을 전부 잰다**:
 *
 *   ┌ 경로 ─────────────┬ tk ──────┬ 스폰 ────────────────────────┐
 *   │ 28·162 스테이지 보스 │ 'boss'  │ startBoss() → spawnQ         │
 *   │ 46 레이드 샌드백     │ 'boss'  │ startRaid() → makeEnemy      │  ← 같은 tk 라 boss 와 한 몸
 *   │ 승급전 수호자        │ 'promo' │ startPromo() → enemies.push  │  ← 66 의 예외가 «안 걸린다»
 *   │ 123 아레나 도전자    │ 'arena' │ startArena() → makeEnemy     │  ← 66 의 예외가 «안 걸린다»
 *   └────────────────────┴─────────┴──────────────────────────────┘
 *   (30 던전 런은 일반 몹만 리필한다 — 보스 개체 스폰이 없다. 작업 178 의 몫)
 *
 * 통과 조건 — **세 개체 전부**(172 자신의 불변식: 예외가 «걸려 있나»):
 *   ⑥ 진행 방향 정렬(이동 벡터 ↔ 플레이어 방향 코사인) ≥ 0.93 — 접선 스월이 꺼졌다
 *   ⑦ **평시 걸음** 속도가 플레이어 속도 × 0.86 ~ 1.00 안 — 속도 바닥(BOSS_CHASE)이 걸렸고,
 *      359 의 «보스는 플레이어보다 살짝 느리게» 도 지켜졌다(359 이관 — 대시·예고·공격 모션 표본은 뺀다)
 *   ⑤ 콘솔 pageerror 0건 · 표본 충분
 * 통과 조건 — **보스·승급 수호자만**(66 과 같은 «붙어서 때리는가» 축):
 *   ① 제한 시간 안에 «사거리+20» 안으로 한 번은 붙는다(첫 접촉 = 수렴 구간의 시작)
 *   ② 수렴 구간(첫 접촉 이후) 평균 거리 ≤ 사거리 + 50px
 *   ③ 수렴 구간 «추격 표본» 중 멀어진 표본(직전 표본보다 +2px 이상) < 4%
 *      — «추격 표본» = 표본 창(6프레임) 안에 **공격 모션(e.atkT > 0)** 도 **대시(e.dashT/e.dashD > 0, 359)** 도
 *        한 프레임도 없던 표본.
 *   ④ 제한 시간 동안 그 개체의 공격 ≥ 1회
 *
 * ③ 이 «추격 표본만» 을 세는 이유 (작업 233 · 2026-08-27 — 185 후속) ─────────────────
 * 원래 ③ 은 수렴 구간의 **모든** 표본에서 «직전보다 +2px 멀어졌나» 를 셌다. 그런데 66 이 넣은
 * `if(e.atkT > 0 && d < 사거리) spd = 0`(index.html ~16372) 때문에 **공격 모션 0.45초 동안 대상은
 * 제자리에 서고**, 그 사이 카이팅(59)하는 플레이어만 움직여 거리가 벌어진다. 즉 그 표본의 «멀어짐» 은
 * 추격이 밀린 것이 아니라 **때리고 있다는 뜻**이다.
 *   185(스킬 넉백 폐지)가 대상을 «더 잘 붙게» 만들자 공격이 20 → 30회로 늘었고, ③ 만 3.0% → 11.8%
 *   로 올라 빨개졌다 — 같은 표의 다른 열은 전부 좋아졌는데도(접촉까지 6.7 → 1.2s · 붙어있음
 *   75.7 → 96.0% · 정렬 0.999 → 1.000). **잘 될수록 빨개지는, 부호가 뒤집힌 자였다.**
 *   실측(`tools/probe288away.js` · 승급 수호자 30초): away 표본의 **100%** 가 모션 걸친 표본이고,
 *   모션이 없는 표본의 away 는 **0.0%**(모션 표본 171 개 중 16.4% · 비모션 표본 128 개 중 0.0%).
 * 처방은 «문턱 완화» 가 아니라 **재정의**다(177-③ 계열: 전제가 죽은 자는 무디게 하는 게 아니라 다시
 * 정의한다). 모션 프레임이 걸친 표본을 분모·분자에서 **함께** 뺐다 — «때리는가» 는 ④ 가 이미 따로 잰다.
 * 재정의 뒤 실측은 세 개체 전부 **0.0%** 라 문턱을 10% → **4%** 로 조였다(옛 정의 값은 표에 같이 남긴다).
 *   아레나가 ①~④ 에서 빠지는 이유는 아래 «아레나» 주석에 적었다 — 원인이 추격 규칙이 아니라
 *   123 의 스폰 배치(플레이어 반경 300~700px 링)라서, 172 가 손댈 구간이 아니다.
 * ⚠ **쌍둥이 게이트**: 이 ③ 의 원본은 `tools/verify66.js` ③ 이고, 작업 **234**(2026-08-27)에서
 *   같은 재정의를 이식해 정의·상수·열 이름(`chaseN`·`atkSampN`·`convAwayRaw`·`LIM_AWAY`·`MIN_CHASE`)을
 *   **글자 그대로** 맞춰 두었다. **한쪽 ③ 을 고치면 반드시 다른 쪽도 같이 고칠 것** — 갈라지면
 *   «부호가 뒤집힌 자» 가 한쪽에서만 되살아난다. 기록 `docs/review/234-verify66-멀어짐게이트재정의.md`
 *
 * 59 교훈 1 — 실시간을 기다리지 않는다. rAF 를 가상 시계(고정 dt 1/60s)로 갈아끼워 CPU 속도로 돌린다.
 *
 * 측정 중에만 거는 하니스 조건 (게임 코드는 건드리지 않는다. 전부 «표본을 끝까지 채우기» 위한 것이고
 * 이동 로직은 원본 그대로다):
 *   · 대상 hp 를 매 틱 max 로 되돌린다(46 레이드 샌드백과 같은 처리)
 *   · 플레이어 hp·무적을 매 틱 채운다 — 사망(정지 2.4초)·부활 구간이 «거리» 표본을 오염시키지 않게
 *   · 제한 시간(bossT · promo.t · arena.t)을 매 틱 재충전 — 표본 끝에서 개체가 사라지지 않게
 *   · promo 시나리오는 `S.rank = -1` 로 승급 조건을 연다(nextRank() → RANKS[0], stage 1 · cp 0).
 *     계급 보너스 rb = 1 + S.rank*0.25 는 «공격력·최대 체력» 에만 걸리고 stat.speed 와 무관하므로
 *     이동 거동은 영향을 받지 않는다.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SEC = Number(process.env.V172_SEC || 30);
const SCN = (process.env.V172_SCN || 'boss,promo,arena').split(',').map(s => s.trim()).filter(Boolean);
const REF = process.env.V172_REF || '';
const STAGE = Number(process.env.V172_STAGE || 30);
const SLACK = 50;          /* ② 허용 여유 — 사거리 + 이 값 */
/* ③ 상한 (%) — «추격 표본»(공격 모션이 안 걸친 표본) 중 멀어진 표본의 비율.
   실측(2026-08-27 · 스테이지 30 · 30초 · 3회): 스테이지 보스 0.0/0.0/0.0 · 승급 수호자 0.0/0.0/0.0.
   옛 정의(모션 표본 포함)의 8~12% 와 달리 이 자는 0 에 붙어 있으므로 4% 로 조인다.
   ※ 문턱을 «올려서» 통과시키는 것은 금지다 — 자가 무뎌질 뿐 부호는 그대로다(작업 233 주석). */
const LIM_AWAY = 4;
const MIN_CHASE = 30;      /* ③ 추격 표본 최소 개수 — 이보다 적으면 ③ 을 잰 것이 아니다 */
/* ⑥ 진행 방향 정렬 하한 — 접선 스월(±0.55)이 걸리면 진행 방향이 최대 28.8° 틀어진다(거리 가중
   clamp(d/220,0.25,1) 때문에 붙을수록 약해져 평균은 18° 안팎으로 나온다). 직진 추격이면
   넉백(실측 평균 9.5px/s)만큼만 깎인다.
   실측(2026-08-27 · 스테이지 30 · 30초 · 같은 하니스로 before/after):
     승급 수호자 0.949 → 0.999 · 아레나 도전자 0.943 → 1.000 · 스테이지 보스 1.000 → 1.000
   before 최대 0.949 와 after 최소 0.999 사이를 넉넉히 가르는 0.98 을 문턱으로 둔다. */
const LIM_ALIGN = 0.98;
/* ⑦ 속도 바닥 — **평시 걸음**(359 이관)이 플레이어 속도의 이 비율 이상. BOSS_CHASE(359 이후 0.94)가
   걸리면 넉백을 빼고도 0.90 을 넘고, 안 걸리면 ETYPE.sp 그대로라 0.55~0.72 로 떨어진다. */
const LIM_SPD = 0.86;
/* 359 — ⑦ 의 위쪽 벽. 아래 벽 0.86 은 «바닥이 아예 안 걸린» 경우(ETYPE.sp 0.55~0.72배)와
   실제 바닥 사이를 넉넉히 가른다.
   ⚑ **501 이관(2026-08-31)** — 주인이 «살짝 느리게» 를 뒤집어 `BOSS_CHASE` 가 0.94 → **1.10** 이 됐다.
   1.00 을 그대로 두면 «바닥이 제대로 걸린» 개체가 오히려 빨개진다(실제로 아레나 도전자가 ×1.08 로
   빨개졌다). 벽을 **1.15** 로 올린다 — 1.10 + 표본 잡음은 통과하고, 축은 여전히 산다
   (BOSS_CHASE 를 1.3 같은 값으로 밀면 다시 빨개진다). 값 자체의 상·하한은 `verify501` §1-ⓐ 가 잰다. */
const LIM_SPD_HI = 1.15;
const ROOT = path.resolve(__dirname, '..');

/* 페이지 안에서 가상 rAF 로 1:1 전투를 돌리며 대상↔플레이어 거리를 10Hz 로 샘플링 */
const RUN = async ({ frames, sampleEvery, stage, scn }) => {
  const TK = { boss: 'boss', promo: 'promo', arena: 'arena' }[scn];
  S.stage = stage; S.best = Math.max(S.best || 1, stage); S.bossFarm = false;
  spawnStage();
  if (scn === 'boss') startBoss();
  else if (scn === 'promo') { S.rank = -1; startPromo(); }
  else if (scn === 'arena') startArena();

  const find = () => enemies.find(e => e.tk === TK);
  const e0 = find();
  const reach = (e0 ? e0.r : ETYPE[TK].r) + player.r + 6;
  const NEAR = reach + 20;                        /* «붙었다» 판정 반경 */
  let n = 0, away = 0, near = 0, sumD = 0, maxD = 0, prev = null, noFoe = 0;
  let cn = 0, cAway = 0, cSum = 0, cPrev = null;  /* 수렴 구간(첫 접촉 이후) */
  /* 233 — ③ 은 «추격 표본»(표본 창 안에 공격 모션이 한 프레임도 없던 표본)만 센다.
     모션 중에는 대상이 서 있으라고 66 이 못 박아 둔 것이라, 그때 벌어진 거리는 추격의 실패가 아니다. */
  let chN = 0, chAway = 0, atkSampN = 0, sawAtk = false;
  /* 359 이관 — 233 의 «모션 표본은 추격 표본이 아니다» 를 **대시 표본**에도 그대로 적용한다.
     대시는 «예고(dashT) 동안 제자리 → 잠근 방향으로 돌진(dashD)» 이라 제품이 스스로
     «지금은 걷는 중이 아니다» 라고 선언한 구간이다: 예고 중 벌어진 거리는 추격이 밀린 것이 아니고,
     돌진이 플레이어를 지나쳐 스쳐 간 뒤 벌어지는 거리도 «공격의 뒷부분» 이지 도망이 아니다.
     ⚠ 무르게 푸는 것이 아니다 — 대시가 통째로 사라지면 이 창은 0개가 되어 분모가 옛 값으로 돌아가고,
     «대시가 실제로 일어나는가 · 접근인가» 는 `verify359` 가 양성항으로 따로 못박는다. */
  let dashSampN = 0, sawDash = false, dashSeen = 0, wasDash = false;
  /* 359 이관 — ⑦ «속도 바닥» 은 이제 **평시 걸음**(대시·예고·공격 모션이 안 걸친 표본)만 잰다.
     359 의 계약이 «평시는 플레이어보다 살짝 느리고, 순간 속도는 대시가 낸다» 로 바뀌었기 때문이다. */
  let walkSp = 0, walkN = 0;
  let tClose = -1;
  let sumSp = 0, spN = 0, atk = 0;
  let sumAl = 0, alN = 0;                         /* 진행 방향 ↔ 플레이어 방향 코사인 정렬 */
  let bx = null, by = null;
  for (let f = 0; f < frames; f++) {
    const b0 = find();
    /* 하니스 — 틱 «전에» 걸어야 그 틱의 피해·사망을 막는다 */
    if (b0) b0.hp = b0.max;
    player.inv = 9; player.hp = stat.maxHp; player.dead = 0;
    bossT = 9999;
    if (typeof promo !== 'undefined' && promo) promo.t = 9999;
    if (typeof arena !== 'undefined' && arena) arena.t = 9999;
    const cd0 = b0 ? b0.cd : null;
    window.__v172tick();
    const b = find();
    if (b && cd0 !== null && b.cd > cd0) atk++;      /* 쿨다운이 «올라간» 프레임 = 공격 시작 */
    if (b && b.atkT > 0) sawAtk = true;              /* 233 — 이 표본 창에 공격 모션이 걸쳤나 */
    /* 359 — 이 표본 창에 대시(예고·돌진)가 걸쳤나 + 대시가 몇 번 일어났나(양성 관측) */
    if (b) {
      const inD = (b.dashT > 0) || (b.dashD > 0);
      if (inD) sawDash = true;
      if (inD && !wasDash) dashSeen++;
      wasDash = inD;
    }
    if (f % sampleEvery === 0) {
      if (!b) { noFoe++; prev = null; sawAtk = false; sawDash = false; continue; }
      const d = Math.hypot(player.x - b.x, player.y - b.y);
      if (prev !== null && d > prev + 2) away++;
      prev = d;
      /* 172 — «스월이 꺼졌나» 를 직접 잰다: 이번 표본의 실제 이동 벡터가 «플레이어를 향한 방향» 과
         얼마나 같은 쪽인가(코사인 정렬). 접선 스월 ±0.55 가 걸리면 진행 방향이 28.8° 틀어져
         정렬이 0.88 이하로 내려간다. 직진 추격이면 넉백만큼만 깎여 1 에 붙는다. */
      /* 359 이관 — 돌진 표본은 이 축에서 뺀다. 돌진은 «예고가 끝난 순간의 방향으로 **잠근** 채»
         달리는 구간이라(유도하지 않는 것이 설계다) 진행 방향이 «지금의 플레이어 방향» 과
         어긋나는 것이 정상이고, 그 어긋남은 스월(±0.55)이 켜졌다는 뜻이 아니다.
         잠글 때 플레이어를 겨눴는지는 `verify359` §3 이 직접 단언한다. */
      if (bx !== null && !sawDash) {
        const mvx = b.x - bx, mvy = b.y - by, ml = Math.hypot(mvx, mvy);
        const tx = player.x - bx, ty = player.y - by, tl = Math.hypot(tx, ty);
        if (ml > 0.5 && tl > 0.5) { sumAl += (mvx * tx + mvy * ty) / (ml * tl); alN++; }
      }
      sumD += d; if (d > maxD) maxD = d;
      if (d <= NEAR) { near++; if (tClose < 0) tClose = f / 60; }
      n++;
      if (tClose >= 0) {
        cSum += d; cn++;
        const isAway = cPrev !== null && d > cPrev + 2;
        if (isAway) cAway++;
        if (cPrev !== null) {
          if (sawAtk) atkSampN++;
          else if (sawDash) dashSampN++;                /* 359 이관 */
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
    scn, n, noFoe, reach, meanD: sumD / Math.max(1, n), maxD, tClose,
    away: away / Math.max(1, n) * 100, near: near / Math.max(1, n) * 100,
    cn, convD: cn ? cSum / cn : Infinity, atk,
    /* ③ 본체 — 추격 표본만. convAwayRaw 는 옛 정의(모션 표본 포함) 로, 판정에는 안 쓰고 표에만 남긴다. */
    chaseN: chN, convAway: chN ? chAway / chN * 100 : 100,
    atkSampN, dashSampN, dashSeen, convAwayRaw: cn ? cAway / cn * 100 : 100,
    walkN, walkSp: walkN ? walkSp / walkN : 0,           /* 359 — 평시 걸음 속도 */
    foeSp: sumSp / Math.max(1, spN), pSpeed: stat.speed, stage: S.stage,
    align: alN ? sumAl / alN : 0,
  };
};

async function runOne(browser, url, scn) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => {
    let vt = 0; const q = [];
    window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__v172tick = () => {
      vt += 1000 / 60;
      const list = q.splice(0, q.length);
      for (const cb of list) { try { cb(vt); } catch (e) {} }
    };
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof enemies !== 'undefined', null, { timeout: 20000 });
  await page.evaluate(() => { for (let i = 0; i < 600; i++) window.__v172tick(); });   /* 워밍업 10초(가상) */
  const r = await page.evaluate(RUN, { frames: Math.round(SEC * 60), sampleEvery: 6, stage: STAGE, scn });
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
  const p = path.join(ROOT, `.v172-before-${sha.slice(0, 7)}-${process.pid}.html`);
  fs.writeFileSync(p, out);
  return p;
}

const NAME = { boss: '스테이지 보스(28·162)', promo: '승급 수호자', arena: '아레나 도전자(123)' };

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  let refFile = null;
  try {
    if (REF) refFile = checkoutRef(REF);
    const targets = [{ tag: 'after', file: process.env.V172_FILE ? path.resolve(process.env.V172_FILE) : path.join(ROOT, 'index.html') }];
    if (refFile) targets.unshift({ tag: 'before(' + REF.slice(0, 7) + ')', file: refFile });

    for (const t of targets) {
      const url = 'file://' + t.file.replace(/\\/g, '/');
      for (const scn of SCN) {
        process.stdout.write(`[·] ${t.tag} · ${NAME[scn] || scn} · ${SEC}초 … `);
        const r = await runOne(browser, url, scn);
        rows.push({ tag: t.tag, ...r });
        console.log(`수렴거리 ${r.cn ? Math.round(r.convD) : '—'}px · 추격 멀어짐 ${r.convAway.toFixed(1)}%(옛 정의 ${r.convAwayRaw.toFixed(1)}%) · 접촉까지 ${r.tClose < 0 ? '없음' : r.tClose.toFixed(1) + 's'}`);
        if (r.errs.length) console.log('    pageerror: ' + r.errs.slice(0, 3).join(' | '));
      }
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n| 빌드 | 대상 | 표본 | 사거리 | 전체 평균 | 접촉까지 | 수렴 평균 | **추격 멀어짐%(③)** | 추격 표본 | 모션 표본 | 대시 표본 | 대시 횟수 | 옛 정의 멀어짐% | 붙어있음% | 최대거리 | 평시 걸음 | 전체 평균속도 | 플레이어속도 | 정렬 | 공격 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${NAME[r.scn] || r.scn} | ${r.n} | ${r.reach}px | ${Math.round(r.meanD)}px | ${r.tClose < 0 ? '—' : r.tClose.toFixed(1) + 's'} | `
      + `${r.cn ? Math.round(r.convD) + 'px' : '—'} | **${r.convAway.toFixed(1)}%** | ${r.chaseN} | ${r.atkSampN} | ${r.dashSampN} | ${r.dashSeen}회 | ${r.convAwayRaw.toFixed(1)}% | `
      + `${r.near.toFixed(1)}% | ${Math.round(r.maxD)}px | `
      + `${Math.round(r.walkSp)}px/s | ${Math.round(r.foeSp)}px/s | ${Math.round(r.pSpeed)}px/s | ${r.align.toFixed(3)} | ${r.atk}회 |`);

  const fails = [];
  for (const r of rows.filter(r => r.tag === 'after')) {
    const nm = NAME[r.scn] || r.scn;
    if (r.errs.length) fails.push(`${nm}: pageerror ${r.errs[0]}`);
    if (r.n < SEC * 10 * 0.8) fails.push(`${nm}: 표본 부족 ${r.n} (대상 없음 ${r.noFoe})`);

    /* ── 172 자신의 불변식: 세 개체 «전부» 에 SOLO_CHASER 예외가 걸려 있다 ── */
    if (r.align < LIM_ALIGN)
      fails.push(`${nm}: 진행 방향 정렬 ${r.align.toFixed(3)} < ${LIM_ALIGN} — 접선 스월이 아직 걸려 있다(SOLO_CHASER 누락)`);
    /* ⑦ 359 이관 — 재는 것이 «전체 평균 속도» 에서 **«평시 걸음»**(대시·예고·공격 모션이 안 걸친 표본)
       으로 바뀌었다. 359 가 BOSS_CHASE 를 1.08 → 0.94 로 내리고 그 자리를 대시가 메우기 때문에,
       전체 평균은 대시 순간 속도(×3.6)와 예고 정지(0)가 섞여 «바닥이 걸렸나» 를 못 잰다.
       ⚠ 상·하한을 **양쪽으로** 건다: 아래로 새면 바닥이 아예 안 걸린 것(ETYPE.sp 0.55~0.72 = 0.55~0.72배),
       위로 새면 바닥이 `BOSS_CHASE` 가 정한 값보다 크게 벗어난 것이다(501 이관 — 위쪽 벽 1.00 → 1.15). */
    if (r.walkN < 20)
      fails.push(`${nm}: 평시 걸음 표본 ${r.walkN} < 20 — ⑦ 을 잴 표본이 없다`);
    else if (r.walkSp < r.pSpeed * LIM_SPD)
      fails.push(`${nm}: 평시 걸음 ${Math.round(r.walkSp)}px/s < 플레이어 ${Math.round(r.pSpeed)}px/s × ${LIM_SPD} — 속도 바닥(BOSS_CHASE)이 안 걸렸다`);
    else if (r.walkSp > r.pSpeed * LIM_SPD_HI)
      fails.push(`${nm}: 평시 걸음 ${Math.round(r.walkSp)}px/s > 플레이어 ${Math.round(r.pSpeed)}px/s × ${LIM_SPD_HI} — 359 «보스는 플레이어보다 살짝 느리게» 가 깨졌다`);

    /* ── 66 의 «붙어서 때리는가» 축 — 접촉 판정은 보스·승급전만 건다 ──
       아레나(123)는 172 를 고쳐도 30초 안에 못 붙는다. 원인이 추격 규칙이 «아니라» 123 자신의
       스폰 배치이기 때문이다: `startArena()` 가 `makeEnemy('arena')` 로 **플레이어 반경 300~700px 링**
       (67 SPAWN_RMIN/RMAX)에 놓는데, 같은 함수는 `e.nopop = true` 에 «팝인 없이 마주 선 채 시작»
       이라는 주석을 달아 «마주 선» 배치를 말한다 — 보스는 BOSS_RMAX 340 으로 링을 좁혀 두었지만
       아레나는 안 좁혔다.
       거기에 아레나 상대는 플레이어 스프라이트 규격(r 16)이라 사거리가 38px(보스 76px)뿐이고,
       추격 상한이 플레이어 속도 ×1.08 이라 30초 동안 벌 수 있는 거리가 45px 남짓이다.
       **스폰 배치는 작업 123 의 구간이므로 여기서 손대지 않는다**(PROGRESS 172 비고에 남겼다). */
    if (r.scn === 'arena') continue;
    if (r.tClose < 0) fails.push(`${nm}: ${SEC}초 안에 사거리+20 안으로 «한 번도» 못 붙음`);
    else if (r.convD > r.reach + SLACK) fails.push(`${nm}: 수렴 구간 평균 거리 ${Math.round(r.convD)}px > 사거리+${SLACK} (${r.reach + SLACK}px)`);
    /* ③ — 추격 표본(공격 모션이 안 걸친 표본)만. 모션 표본은 «때리느라 서 있는» 것이라 ④ 의 몫이다. */
    if (r.chaseN < MIN_CHASE)
      fails.push(`${nm}: 추격 표본 ${r.chaseN} < ${MIN_CHASE} — ③ 을 잴 표본이 없다(모션 표본 ${r.atkSampN} · 대시 표본 ${r.dashSampN})`);
    else if (r.convAway >= LIM_AWAY)
      fails.push(`${nm}: 수렴 구간 «추격» 표본 멀어짐 ${r.convAway.toFixed(1)}% ≥ ${LIM_AWAY}% (추격 표본 ${r.chaseN} · 모션 표본 ${r.atkSampN} · 대시 표본 ${r.dashSampN} 제외 · 옛 정의로는 ${r.convAwayRaw.toFixed(1)}%)`);
    if (r.atk < 1) fails.push(`${nm}: ${SEC}초 동안 «공격을 한 번도» 하지 않음`);
  }
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); console.log('\nV172 FAIL'); process.exit(1); }
  console.log('\nV172 PASS');
})().catch(e => { console.error(e); process.exit(2); });
