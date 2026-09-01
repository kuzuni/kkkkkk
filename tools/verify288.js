#!/usr/bin/env node
/* 작업 288 게이트 — «스킬 맞고 적이 밀려나지 않는다» (주인 지시 2026-08-27)
 *   ⚠ 번호 이동(작업 286, 2026-08-28): 옛 `tools/verify185.js`(출력 V185). 185 가 두 벌 등재라 넉백 쪽을 288 로 옮겼다.
 *
 *   node tools/verify288.js
 *   V288_REF=<sha> node tools/verify288.js     # 그 커밋의 index.html 도 같이 돌려 before/after 비교
 *   V288_SEC=20 node tools/verify288.js
 *
 * ── 무엇을 어떻게 재는가 ──────────────────────────────────────────────
 * 적의 위치를 쓰는 코드는 **한 줄뿐**이다(index.html ~16353):
 *     e.x += (ax/al)*spd * dt;      (288 이전엔 여기에 `+ e.kx` 가 붙어 있었다)
 * 즉 이동 = «추격» + «넉백» 두 항의 합이고, 넉백만 따로 재려면 **추격 항을 0 으로 만들면 된다**.
 * 하니스는 매 틱 `e.sp = 0` 을 박는다(일반 몹은 `spd = e.sp * (slow?0.55:1)` 이라 그대로 0).
 * 그러면 남는 이동은 넉백뿐이므로 — **변위 0.00px = 넉백 없음** 이 산술적으로 동치가 된다.
 * 눈대중·문턱 튜닝이 필요 없는 자다(223-③: 상태는 제품이 실제로 쓰는 문 `step()` 으로만 만든다).
 *
 * ⚑ 510(2026-08-30) — 그 동치가 **359 로 한 번 깨졌다.** 대시 공격이 잡몹에게도 붙으면서
 *   돌진 중에는 속도가 `e.sp` 가 아니라 `stat.speed × DASH.mob.spd` 로 갈아 끼워진다
 *   (index.html 21750 `else if(dashing) spd = stat.speed * DK.spd`). 그래서 경로 3종이
 *   스킬과 무관하게 **전부 같은 79.733px**(= `2.6 × 115 × 0.26`, DASH.mob 산식)를 냈다 —
 *   넉백이 아니라 «대시 한 번» 의 변위다. ⇒ 하니스가 상태 기계를 프레임마다 쿨다운으로
 *   되돌려 **돌진에 못 들어가게** 한다(507 이 `verify193` 에서 쓴 것과 같은 세 줄).
 *   허용치(0.01px)는 한 칸도 안 넓혔고, 무르게 푼 것이 아님은 아래 [2-전제] 두 항이 못박는다.
 *
 * 등재문이 지목한 «kx/ky 를 실제로 넘기던 2곳» 은 실측 결과 **3곳**이었다 — 셋 다 잰다:
 *   ┌ 경로 ───────────┬ 옛 넉백 인자 ─────────┬ 대표 스킬 ──────────┐
 *   │ 폭발(areaDamage) │ ex*0.4 / ey*0.4       │ boom 화염구         │
 *   │ 회전검(지속 orb) │ cos(a)*70 / sin(a)*70 │ orbit 회전검        │
 *   │ 투사체(shots)    │ b.vx*0.05 / b.vy*0.05 │ shuri 표창 난사     │
 *   └─────────────────┴──────────────────────┴────────────────────┘
 *
 * 통과 조건
 *   [1] 구조 — `hitEnemy` 인자 3개(kx/ky 폐지) · 적 객체에 `kx`/`ky` 필드 없음
 *   [2] 기능 — 경로 3종 각각: 적중 ≥ 5회 **이면서** 적 최대 변위 ≤ 0.01px (추격 정지 상태)
 *   [2-전제] 자 자신을 먼저 가른다(507 이관) — p1 스킬을 하나도 안 낀 대조군이 0px ·
 *       p2 같은 하니스에서 2.5px 를 밀면 자가 그대로 본다. 이 둘이 없으면 «변위 0» 은
 *       «안 밀렸다» 와 «대시를 끄다가 자가 눈이 멀었다» 를 구별하지 못한다.
 *   [3] 양성 대조(177-④) — 같은 하니스에서 **추격을 켜면** 적이 실제로 움직인다(≥ 20px).
 *       이 항목이 초록이어야 [2] 의 «0.00px» 이 «측정이 죽어서» 가 아님이 증명된다.
 *   [4] 피격 반응 보존 — 지운 것은 «이동» 뿐이다: 피해가 들어가고(hp 감소) 피격 플래시(e.fx)가 뜬다.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SEC = Number(process.env.V288_SEC || 12);
const REF = process.env.V288_REF || '';
const ROOT = path.resolve(__dirname, '..');
const LIM_MOVE = 0.01;      /* [2] 넉백 변위 상한 (px) — 산술적으로 0 이어야 한다 */
const MIN_HIT = 5;          /* [2] 표본 하한 — 적중이 없으면 «안 밀렸다» 는 공백일 뿐이다 */
const MIN_CHASE = 20;       /* [3] 양성 대조 — 추격을 켜면 이만큼은 움직인다 (px) */
const LIM_PRE = 0.5;        /* [2-전제 p1] 스킬 없는 대조군 변위 상한 (px) — 510 */
const KICK_PX = 2.5;        /* [2-전제 p2] 되돌림으로 미는 거리 (px) — 510 */

const PATHS = [
  { id: 'boom',  n: '폭발(areaDamage)', old: 'ex*0.4' },
  { id: 'orbit', n: '회전검(지속 orb)', old: 'cos(a)*70' },
  { id: 'shuri', n: '투사체(shots)',    old: 'b.vx*0.05' },
];

/* 페이지 안에서 «추격을 끈 채» 스킬을 퍼붓고 적의 변위를 잰다 */
const RUN = ({ id, frames, chase, kick }) => {
  sbufClear();
  /* id === null 은 [2-전제] 의 «스킬을 하나도 안 낀 대조군» 이다 — 남는 변위는 하니스가
     못 끈 «적 자신의 이동» 뿐이므로 그 값이 곧 하니스의 눈금 영점이다(507 [A3]). */
  S.own = {}; S.eqSkill = [];
  if (id) { S.own[id] = { n: 0, l: 1 }; S.eqSkill = [id]; }
  skillCd = {}; shots.length = 0; zones.length = 0; bolts.length = 0; booms.length = 0;
  enemies.length = 0; spawnQ.length = 0;
  markDirty();
  player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.dead = 0; player.inv = 99;
  player.vx = 0; player.vy = 0;
  for (let i = 0; i < 6; i++) makeEnemy('zombie');
  /* 적을 플레이어 주위 60~140px 링에 «결정적으로» 놓는다 — 폭발 반경(190)·회전검 반경(78)·
     투사체 사거리 안에 전부 들어오게. 시드 난수를 안 쓰는 이유는 배치가 결과를 바꾸지 않기
     때문이다(변위 상한은 0 이라 위치와 무관하다). */
  enemies.forEach((e, i) => {
    const a = i * (6.2832 / 6);
    e.born = 1; e.hp = e.max = 1e12;
    e.x = player.x + Math.cos(a) * (60 + i * 14);
    e.y = player.y + Math.sin(a) * (60 + i * 14);
  });
  const p0 = enemies.map(e => ({ x: e.x, y: e.y }));
  const hp0 = enemies.reduce((s, e) => s + e.hp, 0);
  let hits = 0, fxSeen = 0, maxMove = 0;
  let prevFx = enemies.map(e => e.fx);
  for (let f = 0; f < frames; f++) {
    /* 하니스 — 틱 «전에» 박는다. chase=false 면 추격 항이 0 이 되어 남는 이동은 넉백뿐이다.
       ⚑ 510 — `e.sp = 0` 하나로는 모자란다(머리말 참조). 359 대시는 `e.sp` 를 우회하므로
       상태 기계를 «쿨다운으로 되돌려» 돌진에 못 들어가게 한다: 예고(dashT)·돌진(dashD)을 0 으로
       비우고 쿨다운을 1e9 로 박으면 `else if(e.dashCd > 0) e.dashCd -= dt` 가지에서 멈춘다. */
    if (!chase) enemies.forEach(e => { e.sp = 0; e.dashT = 0; e.dashD = 0; e.dashCd = 1e9; });
    player.x = WORLD.w / 2; player.y = WORLD.h / 2; player.vx = 0; player.vy = 0;
    player.hp = stat.maxHp; player.inv = 99; player.dead = 0;
    step(1 / 60);
    /* [2-전제 p2] 되돌림 — 지정 프레임에 적 0번을 그만큼 옆으로 민다(= «넉백 한 줄» 을 되살린 것과 같다).
       이 손잡이가 있어야 «대시를 껐더니 자가 눈이 멀었다» 가 아님을 게이트 안에서 증명할 수 있다. */
    if (kick && f === kick.f && enemies[0]) enemies[0].x += kick.px;
    enemies.forEach((e, i) => {
      /* 피격 플래시가 «올라간» 프레임 = 이 틱에 맞았다 (hitEnemy 가 e.fx = 0.12 로 박는다) */
      if (e.fx > (prevFx[i] || 0) + 1e-9) { hits++; fxSeen++; }
      prevFx[i] = e.fx;
      if (p0[i]) maxMove = Math.max(maxMove, Math.hypot(e.x - p0[i].x, e.y - p0[i].y));
      if (e.hp < 1e11) e.hp = 1e12;      /* 죽지 않게 되돌린다 — 피해 총량은 아래서 따로 센다 */
    });
  }
  const hp1 = enemies.reduce((s, e) => s + e.hp, 0);
  return { hits, fxSeen, maxMove, dmg: hp0 - hp1, foes: enemies.length };
};

async function runOne(browser, url, id, chase, kick) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof player !== 'undefined' && typeof step === 'function', null, { timeout: 20000 });
  const shape = await page.evaluate(() => {
    makeEnemy('zombie');
    const e = enemies[enemies.length - 1];
    const keys = Object.keys(e);
    const r = { args: hitEnemy.length, hasKx: keys.includes('kx'), hasKy: keys.includes('ky') };
    enemies.length = 0;
    return r;
  });
  const r = await page.evaluate(RUN, { id, frames: Math.round(SEC * 60), chase, kick });
  await ctx.close();
  return { ...r, ...shape, errs };
}

function checkoutRef(sha) {
  /* 756 — 얕은 클론이면 **먼저 판다**(규약 ①). 못 가져오면 «환경이냐 진짜 없음이냐» 를 밝혀 던진다(규약 ②).
     ⚠ 이 `checkoutRef` 는 자 여섯 벌에 **글자 그대로 복사**돼 있었다 — 판는 사다리는 부품 한 벌에 둔다. */
  const got = require('./gitrev756').show(sha, 'index.html', { maxBuffer: 64 * 1024 * 1024 });
  if (!got.ok) throw new Error((got.env ? '[보류·환경] ' : '[빨강] ') + got.why);
  if (got.how) console.log('[i]' + got.how);
  const out = got.buf;
  const p = path.join(ROOT, `.v288-before-${sha.slice(0, 7)}-${process.pid}.html`);
  fs.writeFileSync(p, out);
  return p;
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  let refFile = null;
  try {
    if (REF) refFile = checkoutRef(REF);
    const targets = [{ tag: 'after', file: process.env.V288_FILE ? path.resolve(process.env.V288_FILE) : path.join(ROOT, 'index.html') }];
    if (refFile) targets.unshift({ tag: 'before(' + REF.slice(0, 7) + ')', file: refFile });

    for (const t of targets) {
      const url = 'file://' + t.file.replace(/\\/g, '/');
      for (const p of PATHS) {
        process.stdout.write(`[·] ${t.tag} · ${p.n} · ${SEC}초 … `);
        const r = await runOne(browser, url, p.id, false);
        rows.push({ tag: t.tag, chase: false, ...p, ...r });
        console.log(`적중 ${r.hits}회 · 최대 변위 ${r.maxMove.toFixed(2)}px`);
        if (r.errs.length) console.log('    pageerror: ' + r.errs.slice(0, 3).join(' | '));
      }
      /* [2-전제] 하니스 자체를 먼저 가른다(507 이관) — 스킬 없는 대조군 · 2.5px 되돌림 */
      process.stdout.write(`[·] ${t.tag} · 전제 p1(스킬 없는 대조군) … `);
      const q1 = await runOne(browser, url, null, false);
      rows.push({ tag: t.tag, chase: false, premise: 'p1', id: null, n: '전제 p1(스킬 없음)', old: '—', ...q1 });
      console.log(`최대 변위 ${q1.maxMove.toFixed(3)}px`);
      process.stdout.write(`[·] ${t.tag} · 전제 p2(같은 하네스에 2.5px 밀기) … `);
      const q2 = await runOne(browser, url, null, false, { f: 30, px: 2.5 });
      rows.push({ tag: t.tag, chase: false, premise: 'p2', id: null, n: '전제 p2(2.5px 밀기)', old: '—', ...q2 });
      console.log(`최대 변위 ${q2.maxMove.toFixed(3)}px`);

      /* [3] 양성 대조 — 추격을 켜면 같은 자가 «움직인다» 고 말해야 한다 */
      process.stdout.write(`[·] ${t.tag} · 양성 대조(추격 ON) … `);
      const c = await runOne(browser, url, 'boom', true);
      rows.push({ tag: t.tag, chase: true, id: 'boom', n: '양성 대조(추격 ON)', old: '—', ...c });
      console.log(`최대 변위 ${c.maxMove.toFixed(1)}px`);
    }
  } finally {
    await browser.close();
    if (refFile) { try { fs.unlinkSync(refFile); } catch (e) {} }
  }

  console.log('\n| 빌드 | 경로 | 옛 넉백 인자 | 추격 | 적중 | 피격플래시 | 누적 피해 | **최대 변위** |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${r.tag} | ${r.n} | \`${r.old}\` | ${r.chase ? 'ON' : 'OFF'} | ${r.hits}회 | ${r.fxSeen}회 | `
      + `${r.dmg.toExponential(2)} | **${r.maxMove.toFixed(2)}px** |`);

  const fails = [];
  const after = rows.filter(r => r.tag === 'after');
  const a0 = after[0];

  console.log('\n[1] 구조');
  const okc = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails.push(m); };
  okc(a0 && a0.args === 3, `hitEnemy 인자 3개 — kx/ky 폐지 (실측 ${a0 ? a0.args : '?'}개)`);
  okc(a0 && !a0.hasKx && !a0.hasKy, `적 객체에 kx/ky 필드 없음 (실측 kx ${a0 && a0.hasKx} · ky ${a0 && a0.hasKy})`);

  console.log('[2-전제] 하니스 자체 — 507 이관');
  const q1 = after.find(r => r.premise === 'p1'), q2 = after.find(r => r.premise === 'p2');
  okc(q1 && q1.maxMove < LIM_PRE,
      `[전제 p1] 스킬 없는 대조군의 적 변위 ${q1 ? q1.maxMove.toFixed(3) : '?'}px < ${LIM_PRE}`
      + ' — 하니스가 359 대시까지 껐다(안 끄면 79.733px)');
  okc(q2 && q2.maxMove >= KICK_PX - 0.1,
      `[전제 p2] 같은 하네스에서 ${KICK_PX}px 를 밀면 자가 ${q2 ? q2.maxMove.toFixed(3) : '?'}px 로 본다`
      + ' = 넉백은 그대로 잡힌다(껐다고 눈이 먼 것이 아니다)');

  console.log('[2] 기능 — 경로 3종');
  for (const r of after.filter(r => !r.chase && !r.premise)) {
    if (r.errs.length) okc(false, `${r.n}: pageerror ${r.errs[0]}`);
    okc(r.hits >= MIN_HIT, `${r.n}: 적중 ${r.hits}회 ≥ ${MIN_HIT} (표본)`);
    okc(r.maxMove <= LIM_MOVE, `${r.n}: 추격 정지 상태 최대 변위 ${r.maxMove.toFixed(3)}px ≤ ${LIM_MOVE} — 넉백 없음`);
    okc(r.dmg > 0, `${r.n}: 피해가 실제로 들어간다 (누적 ${r.dmg.toExponential(2)})`);
    okc(r.fxSeen >= MIN_HIT, `${r.n}: 피격 플래시(e.fx) ${r.fxSeen}회 — 피격 «반응» 은 살아 있다`);
  }

  console.log('[3] 양성 대조 — 추격을 켜면 움직인다');
  const ctl = after.find(r => r.chase);
  okc(ctl && ctl.maxMove >= MIN_CHASE,
      `추격 ON 최대 변위 ${ctl ? ctl.maxMove.toFixed(1) : '?'}px ≥ ${MIN_CHASE} — 자가 살아 있다(0.00 이 «측정 죽음» 이 아니다)`);

  if (fails.length) { console.log('\nV288 FAIL'); process.exit(1); }
  console.log(`\nV288 PASS (${SEC}초 × 경로 3종 + 양성 대조)`);
})().catch(e => { console.error(e); process.exit(2); });
