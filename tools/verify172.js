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
 *   ⑦ 실측 이동 속도 ≥ 플레이어 속도 × 0.92 — 속도 바닥(BOSS_CHASE)이 걸렸다
 *   ⑤ 콘솔 pageerror 0건 · 표본 충분
 * 통과 조건 — **보스·승급 수호자만**(66 과 같은 «붙어서 때리는가» 축):
 *   ① 제한 시간 안에 «사거리+20» 안으로 한 번은 붙는다(첫 접촉 = 수렴 구간의 시작)
 *   ② 수렴 구간(첫 접촉 이후) 평균 거리 ≤ 사거리 + 50px
 *   ③ 수렴 구간 «멀어지는 구간»(직전 표본보다 +2px 이상) < 10%
 *   ④ 제한 시간 동안 그 개체의 공격 ≥ 1회
 *   아레나가 ①~④ 에서 빠지는 이유는 아래 «아레나» 주석에 적었다 — 원인이 추격 규칙이 아니라
 *   123 의 스폰 배치(플레이어 반경 300~700px 링)라서, 172 가 손댈 구간이 아니다.
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
const LIM_AWAY = 10;       /* ③ 멀어지는 구간 상한 (%) */
/* ⑥ 진행 방향 정렬 하한 — 접선 스월(±0.55)이 걸리면 진행 방향이 최대 28.8° 틀어진다(거리 가중
   clamp(d/220,0.25,1) 때문에 붙을수록 약해져 평균은 18° 안팎으로 나온다). 직진 추격이면
   넉백(실측 평균 9.5px/s)만큼만 깎인다.
   실측(2026-08-27 · 스테이지 30 · 30초 · 같은 하니스로 before/after):
     승급 수호자 0.949 → 0.999 · 아레나 도전자 0.943 → 1.000 · 스테이지 보스 1.000 → 1.000
   before 최대 0.949 와 after 최소 0.999 사이를 넉넉히 가르는 0.98 을 문턱으로 둔다. */
const LIM_ALIGN = 0.98;
/* ⑦ 속도 바닥 — 실측 이동 속도가 플레이어 속도의 이 비율 이상. BOSS_CHASE(1.08) 가 걸리면
   넉백을 빼고도 0.95 를 넘고, 안 걸리면 ETYPE.sp 그대로라 0.55~0.72 로 떨어진다. */
const LIM_SPD = 0.92;
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
    if (f % sampleEvery === 0) {
      if (!b) { noFoe++; prev = null; continue; }
      const d = Math.hypot(player.x - b.x, player.y - b.y);
      if (prev !== null && d > prev + 2) away++;
      prev = d;
      /* 172 — «스월이 꺼졌나» 를 직접 잰다: 이번 표본의 실제 이동 벡터가 «플레이어를 향한 방향» 과
         얼마나 같은 쪽인가(코사인 정렬). 접선 스월 ±0.55 가 걸리면 진행 방향이 28.8° 틀어져
         정렬이 0.88 이하로 내려간다. 직진 추격이면 넉백만큼만 깎여 1 에 붙는다. */
      if (bx !== null) {
        const mvx = b.x - bx, mvy = b.y - by, ml = Math.hypot(mvx, mvy);
        const tx = player.x - bx, ty = player.y - by, tl = Math.hypot(tx, ty);
        if (ml > 0.5 && tl > 0.5) { sumAl += (mvx * tx + mvy * ty) / (ml * tl); alN++; }
      }
      sumD += d; if (d > maxD) maxD = d;
      if (d <= NEAR) { near++; if (tClose < 0) tClose = f / 60; }
      n++;
      if (tClose >= 0) {
        cSum += d; cn++;
        if (cPrev !== null && d > cPrev + 2) cAway++;
        cPrev = d;
      }
      if (bx !== null) { sumSp += Math.hypot(b.x - bx, b.y - by) / (sampleEvery / 60); spN++; }
      bx = b.x; by = b.y;
    }
    if (f % 900 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return {
    scn, n, noFoe, reach, meanD: sumD / Math.max(1, n), maxD, tClose,
    away: away / Math.max(1, n) * 100, near: near / Math.max(1, n) * 100,
    cn, convD: cn ? cSum / cn : Infinity, convAway: cn ? cAway / cn * 100 : 100, atk,
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
  const out = execFileSync('git', ['show', `${sha}:index.html`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  const p = path.join(ROOT, `.v172-before-${sha.slice(0, 7)}.html`);
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
        console.log(`수렴거리 ${r.cn ? Math.round(r.convD) : '—'}px · 멀어짐 ${r.convAway.toFixed(1)}% · 접촉까지 ${r.tClose < 0 ? '없음' : r.tClose.toFixed(1) + 's'}`);
        if (r.errs.length) console.log('    pageerror: ' + r.errs.slice(0, 3).join(' | '));
      }
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n| 빌드 | 대상 | 표본 | 사거리 | 전체 평균 | 접촉까지 | 수렴 평균 | 수렴 멀어짐% | 붙어있음% | 최대거리 | 대상속도 | 플레이어속도 | 정렬 | 공격 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${NAME[r.scn] || r.scn} | ${r.n} | ${r.reach}px | ${Math.round(r.meanD)}px | ${r.tClose < 0 ? '—' : r.tClose.toFixed(1) + 's'} | `
      + `${r.cn ? Math.round(r.convD) + 'px' : '—'} | ${r.convAway.toFixed(1)}% | ${r.near.toFixed(1)}% | ${Math.round(r.maxD)}px | `
      + `${Math.round(r.foeSp)}px/s | ${Math.round(r.pSpeed)}px/s | ${r.align.toFixed(3)} | ${r.atk}회 |`);

  const fails = [];
  for (const r of rows.filter(r => r.tag === 'after')) {
    const nm = NAME[r.scn] || r.scn;
    if (r.errs.length) fails.push(`${nm}: pageerror ${r.errs[0]}`);
    if (r.n < SEC * 10 * 0.8) fails.push(`${nm}: 표본 부족 ${r.n} (대상 없음 ${r.noFoe})`);

    /* ── 172 자신의 불변식: 세 개체 «전부» 에 SOLO_CHASER 예외가 걸려 있다 ── */
    if (r.align < LIM_ALIGN)
      fails.push(`${nm}: 진행 방향 정렬 ${r.align.toFixed(3)} < ${LIM_ALIGN} — 접선 스월이 아직 걸려 있다(SOLO_CHASER 누락)`);
    if (r.foeSp < r.pSpeed * LIM_SPD)
      fails.push(`${nm}: 실측 이동 속도 ${Math.round(r.foeSp)}px/s < 플레이어 ${Math.round(r.pSpeed)}px/s × ${LIM_SPD} — 속도 바닥(BOSS_CHASE)이 안 걸렸다`);

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
    if (r.convAway >= LIM_AWAY) fails.push(`${nm}: 수렴 구간 멀어짐 ${r.convAway.toFixed(1)}% ≥ ${LIM_AWAY}%`);
    if (r.atk < 1) fails.push(`${nm}: ${SEC}초 동안 «공격을 한 번도» 하지 않음`);
  }
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f)); console.log('\nV172 FAIL'); process.exit(1); }
  console.log('\nV172 PASS');
})().catch(e => { console.error(e); process.exit(2); });
