/* 작업 460 게이트 — «플레이어 애니는 idle · run 둘만(+ 사망 die)»
 *
 *   node tools/verify460.js
 *
 * 주인 지시(2026-08-30) 원문: «플레이어는 공격모션없이 가만히 있을때는 idle 움직일떄는 move만
 * 애니메이션 하기».
 *
 * 이 자가 지키는 것 일곱:
 *   [A] 소스 규약 — 플레이어 애니 선택에 `attack_A`·`get_hit` 가 **한 자리도** 없고,
 *       `atkFx`(공격 모션 타이머)는 **식별자째** 사라졌다(주석 제외). 죽은 값이 남으면
 *       다음 세션이 그것을 «쓰는 값» 으로 되살린다(LESSONS 295-②).
 *   [B] 일반 스테이지 전투 60초 — 플레이어 `anim` 표본이 `idle`·`run`·`die` 외 **0건**.
 *   [C] 보스전 30초 — 같은 표본, 같은 0건.
 *   [D] 원인 자리 — 스킬을 실제로 시전한 프레임에 `attack_A` 0건 · 피격당한 프레임에 `get_hit` 0건.
 *   [E] 둘이 실제로 **갈린다** — 속도를 주면 `run`, 0 으로 두면 `idle`.
 *       ⚠ 이 절이 없으면 «둘 다 idle 로 굳은» 사본도 [B]·[C] 를 통과한다.
 *   [F] 사망 `die` 는 살아 있고 부활하면 `idle` 로 돌아온다(주인 원문 밖 — 지시서 판단 근거는 review).
 *   [G] 에셋은 안 지웠다 — 아틀라스의 `attack_A`·`get_hit` 프레임이 그대로 있고,
 *       **적**(승급 수호자·아레나 도전자)은 여전히 `attack_A` 로 때린다(범위는 «플레이어» 뿐).
 *   [R] 되돌림 시험 — 옛 4갈래 분기와 `atkFx` 를 되살린 사본은 **다시 빨개진다**.
 *       이 절이 없으면 «이미 참인 것을 굳힌 게이트»(338 이 잡은 그 모양)와 구별되지 않는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
/* ⚠ 사본은 **저장소 루트**에 둔다 — /tmp 에 두면 상대 경로 assets/** 가 통째로 404 다
   (360·367·438·439·453 선례. .gitignore 에 등재돼 있다). */
const NEG = path.join(ROOT, '.v460-neg.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => {
  if (c) { pass++; console.log('  ✅ ' + m + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  ❌ ' + m + (d ? ' — ' + d : '')); }
};
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

const ALLOW = ['idle', 'run', 'die'];

/* 주석을 지운 소스 — [A] 는 «코드» 만 본다(460 이 남긴 «폐지했다» 주석이 증거로 세어지면 표가 거꾸로다) */
function stripComments(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const s = src.indexOf('/*', i);
    if (s < 0) { out += src.slice(i); break; }
    out += src.slice(i, s);
    const e = src.indexOf('*/', s + 2);
    if (e < 0) break;
    i = e + 2;
  }
  return out.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}

/* ── 한 페이지에서 쓰는 공용 자 ─────────────────────────────────────────── */

/* 세이브를 깨끗이 세우고 스킬 하나를 장착시킨다(시전이 있어야 옛 attack_A 가 뜬다) */
const SETUP = (boss) => `(() => {
  localStorage.clear();
  Object.assign(S, DEF());
  S.own.slash = { n: 0, l: 1 };
  S.eqSkill = ['slash'];
  S.stage = ${boss ? 20 : 17};
  S.best = S.stage; S.guide.idx = 99;
  if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
  player.dead = 0; player.hp = stat.maxHp;
  enemies.length = 0; shots.length = 0;
  ${boss ? 'startBoss();' : ''}
  return true;
})()`;

/* n 프레임 굴리며 애니 이름과 «시전/피격 프레임» 을 센다.
   ⚠ «시전한 프레임» 은 `atkFx` 로 세면 안 된다 — 수리 후 트리에는 그 값이 아예 없어서
      **세는 자가 트리마다 달라진다**(1회차에 그래서 수리 후 3회 · 되돌림 52회로 찍혀
      [D2] 가 사실상 안 시험됐다). 두 트리가 **같은 자**를 쓰도록 제품의 `castSkill` 자체를 감싼다. */
const SAMPLE = `((N) => {
  const cnt = {};
  let casts = 0, castBad = 0, hits = 0, hitBad = 0, pHit = 0, flag = false;
  const orig = window.castSkill;
  window.castSkill = function(){ const r = orig.apply(this, arguments); if(r) flag = true; return r; };
  try {
    for (let i = 0; i < N; i++) {
      flag = false;
      step(1 / 60);
      const a = player.anim || '(없음)';
      cnt[a] = (cnt[a] || 0) + 1;
      if (flag) { casts++; if (a === 'attack_A') castBad++; }
      if (player.hitFx > pHit + 1e-9) { hits++; if (a === 'get_hit') hitBad++; }
      pHit = player.hitFx;
    }
  } finally { window.castSkill = orig; }
  return { n: N, cnt, casts, castBad, hits, hitBad };
})`;

async function runSamples(page) {
  const ev = async (expr, arg) => {
    try { return await page.evaluate(new Function('a', 'return ' + expr + '(a)'), arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  const out = {};
  for (const [key, boss, n] of [['stage', false, 3600], ['boss', true, 1800]]) {
    const s = await ev('(() => ' + SETUP(boss) + ')');
    out[key] = s && s.__err ? s : await ev(SAMPLE, n);
  }
  return out;
}

const badFrames = (r) => Object.keys(r.cnt)
  .filter((k) => !ALLOW.includes(k))
  .reduce((s, k) => s + r.cnt[k], 0);
const badNames = (r) => Object.keys(r.cnt).filter((k) => !ALLOW.includes(k));

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = stripComments(src);

  /* ── [A] 소스 규약 ─────────────────────────────────────────────────── */
  blk('[A] 소스 규약 — 죽은 값이 안 남았는가');
  const atkFxHits = (code.match(/\batkFx\b/g) || []).length;
  ok(atkFxHits === 0, 'A1 `atkFx` 식별자가 코드에 0건(주석 제외)', '찍힘 ' + atkFxHits + '건');
  /* 플레이어 애니 선택 자리 — setAnim(player, 'knight', …) 호출의 애니 이름만 모은다 */
  const names = [...code.matchAll(/setAnim\(\s*player\s*,\s*'knight'\s*,\s*'([a-zA-Z_]+)'/g)].map((m) => m[1]);
  const uniq = [...new Set(names)].sort();
  ok(names.length > 0, 'A2 플레이어 setAnim 호출을 찾았다', names.length + '곳');
  ok(uniq.every((n) => ALLOW.includes(n)),
     'A3 플레이어가 고르는 애니는 idle·run·die 뿐', '찍힘 [' + uniq.join(', ') + ']');
  ok(uniq.includes('idle') && uniq.includes('run'),
     'A4 idle·run 둘 다 실제로 선택된다(한쪽만 남기지 않았다)', '[' + uniq.join(', ') + ']');
  ok(uniq.includes('die'), 'A5 사망 die 는 남아 있다(공격 모션이 아니라 상태 연출)');

  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + SRC);
  await page.waitForTimeout(1200);

  const R = await runSamples(page);

  /* ── [B]·[C] 실제 전투 표본 ────────────────────────────────────────── */
  blk('[B] 일반 스테이지 전투 60초(3600프레임)');
  if (R.stage.__err) { fail++; console.log('  ❌ [B] 블록 예외: ' + R.stage.__err); }
  else {
    const bad = badFrames(R.stage);
    ok(R.stage.n === 3600, 'B1 3600프레임을 굴렸다');
    ok(bad === 0, 'B2 idle·run·die 외 프레임 0건',
       '찍힘 ' + bad + '건 [' + badNames(R.stage).join(', ') + ']');
    ok((R.stage.cnt.run || 0) > 0 && (R.stage.cnt.idle || 0) > 0,
       'B3 표본에 run·idle 이 둘 다 들어 있다(표본이 한쪽으로 죽지 않았다)',
       'run ' + (R.stage.cnt.run || 0) + ' · idle ' + (R.stage.cnt.idle || 0));
  }

  blk('[C] 보스전 30초(1800프레임)');
  if (R.boss.__err) { fail++; console.log('  ❌ [C] 블록 예외: ' + R.boss.__err); }
  else {
    const bad = badFrames(R.boss);
    ok(R.boss.n === 1800, 'C1 1800프레임을 굴렸다');
    ok(bad === 0, 'C2 idle·run·die 외 프레임 0건',
       '찍힘 ' + bad + '건 [' + badNames(R.boss).join(', ') + ']');
  }

  /* ── [D] 원인 자리 ─────────────────────────────────────────────────── */
  blk('[D] 원인 — 시전·피격 프레임');
  if (!R.stage.__err) {
    ok(R.stage.casts > 0, 'D1 표본 안에서 스킬이 실제로 시전됐다(전제)', R.stage.casts + '회');
    ok(R.stage.castBad === 0, 'D2 시전 프레임에 attack_A 0건', '찍힘 ' + R.stage.castBad + '회');
    ok(R.stage.hits > 0, 'D3 표본 안에서 실제로 피격당했다(전제)', R.stage.hits + '회');
    ok(R.stage.hitBad === 0, 'D4 피격 프레임에 get_hit 0건', '찍힘 ' + R.stage.hitBad + '회');
  }

  /* ── [E] 둘이 갈리는가 ────────────────────────────────────────────── */
  blk('[E] 이동 ↔ 정지 전환');
  const e = await (async () => {
    try {
      return await page.evaluate(() => {
        enemies.length = 0; shots.length = 0;
        player.dead = 0; player.hp = stat.maxHp;
        const at = (vx, vy) => {
          player.vx = vx; player.vy = vy;
          /* step 이 속도를 다시 계산하므로 «그 프레임의 선택» 을 보려면 선택 로직만 재현하면 안 된다 —
             제품을 한 프레임 굴리고 그 결과를 읽는다. 관성 때문에 몇 프레임 필요하다. */
          for (let i = 0; i < 3; i++) { player.vx = vx; player.vy = vy; step(1 / 60); }
          return player.anim;
        };
        const moving = at(400, 0);
        const still = at(0, 0);
        return { moving, still };
      });
    } catch (err) { return { __err: String((err && err.message) || err).slice(0, 200) }; }
  })();
  if (e.__err) { fail++; console.log('  ❌ [E] 블록 예외: ' + e.__err); }
  else {
    ok(e.moving === 'run', 'E1 속도를 주면 run', '찍힘 ' + e.moving);
    ok(e.still === 'idle', 'E2 속도를 0 으로 두면 idle', '찍힘 ' + e.still);
  }

  /* ── [F] 사망·부활 ────────────────────────────────────────────────── */
  blk('[F] 사망 die · 부활 idle');
  const f = await (async () => {
    try {
      return await page.evaluate(() => {
        enemies.length = 0; shots.length = 0;
        player.hp = 0; player.dead = 2.4;
        step(1 / 60);
        const dead = player.anim;
        for (let i = 0; i < 200 && player.dead > 0; i++) step(1 / 60);
        step(1 / 60);
        return { dead, after: player.anim, alive: player.dead <= 0 };
      });
    } catch (err) { return { __err: String((err && err.message) || err).slice(0, 200) }; }
  })();
  if (f.__err) { fail++; console.log('  ❌ [F] 블록 예외: ' + f.__err); }
  else {
    ok(f.dead === 'die', 'F1 사망 프레임은 die', '찍힘 ' + f.dead);
    ok(f.alive, 'F2 부활했다(전제)');
    ok(ALLOW.includes(f.after) && f.after !== 'die', 'F3 부활 뒤 idle·run 으로 돌아온다', '찍힘 ' + f.after);
  }

  /* ── [G] 에셋·범위 ────────────────────────────────────────────────── */
  blk('[G] 에셋은 두고 «선택만» 안 한다 · 적은 범위 밖');
  const g = await (async () => {
    try {
      return await page.evaluate(() => ({
        atk: (ATLAS.knight.a.attack_A || []).length,
        hit: (ATLAS.knight.a.get_hit || []).length,
        idle: (ATLAS.knight.a.idle || []).length,
        run: (ATLAS.knight.a.run || []).length,
        promo: ETYPE.promo && ETYPE.promo.atk,
        arena: ETYPE.arena && ETYPE.arena.atk,
      }));
    } catch (err) { return { __err: String((err && err.message) || err).slice(0, 200) }; }
  })();
  if (g.__err) { fail++; console.log('  ❌ [G] 블록 예외: ' + g.__err); }
  else {
    ok(g.atk > 0 && g.hit > 0, 'G1 아틀라스 attack_A·get_hit 프레임은 안 지웠다',
       'attack_A ' + g.atk + ' · get_hit ' + g.hit + '장');
    ok(g.idle > 0 && g.run > 0, 'G2 idle·run 프레임이 실재한다', 'idle ' + g.idle + ' · run ' + g.run + '장');
    ok(g.promo === 'attack_A' && g.arena === 'attack_A',
       'G3 적(승급 수호자·아레나 도전자)은 여전히 attack_A 로 때린다 — 범위는 «플레이어» 뿐',
       'promo ' + g.promo + ' · arena ' + g.arena);
  }

  await page.close(); await ctx.close();

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  blk('[R] 되돌림 — 옛 4갈래 분기를 되살린 사본은 다시 빨개진다');
  let negStage = null, negBoss = null, negCast = null;
  const SUBS = [
    ['dead: 0, hitFx: 0, buffFx: 0, inv: 0,',
     'dead: 0, hitFx: 0, atkFx: 0, buffFx: 0, inv: 0,'],
    ["                   dmg, life:1.15, pierce:stat.pierce, hit:[], col:'#dff2ff' });",
     "                   dmg, life:1.15, pierce:stat.pierce, hit:[], col:'#dff2ff' });\n      player.atkFx = 0.22;"],
    ["                     dmg, life:1.15, pierce:stat.pierce, hit:[], col:'#bfe0ff' });",
     "                     dmg, life:1.15, pierce:stat.pierce, hit:[], col:'#bfe0ff' });\n      player.atkFx = 0.22;"],
    ['    if(player.buffFx > 0) player.buffFx -= dt;',
     '    if(player.buffFx > 0) player.buffFx -= dt;\n    if(player.atkFx > 0) player.atkFx -= dt;'],
    ["    const moving = Math.hypot(player.vx, player.vy) > 25;\n" +
     "    if(moving) setAnim(player, 'knight', 'run', 14, true);\n" +
     "    else       setAnim(player, 'knight', 'idle', 8, true);",
     "    const moving = Math.hypot(player.vx, player.vy) > 25;\n" +
     "    if(player.atkFx > 0)      setAnim(player, 'knight', 'attack_A', 16, false);\n" +
     "    else if(player.hitFx > 0) setAnim(player, 'knight', 'get_hit', 12, false);\n" +
     "    else if(moving)           setAnim(player, 'knight', 'run', 14, true);\n" +
     "    else                      setAnim(player, 'knight', 'idle', 8, true);"],
  ];
  try {
    let neg = src;
    SUBS.forEach(([a, b], i) => {
      if (!neg.includes(a)) throw new Error('되돌림 치환 ' + (i + 1) + ' 이 안 걸렸다(앵커가 옮겨졌다)');
      neg = neg.split(a).join(b);
    });
    fs.writeFileSync(NEG, neg);
    const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p2 = await c2.newPage();
    await p2.goto('file://' + NEG);
    await p2.waitForTimeout(1200);
    const RN = await runSamples(p2);
    if (!RN.stage.__err) { negStage = badFrames(RN.stage); negCast = RN.stage.castBad; }
    if (!RN.boss.__err) negBoss = badFrames(RN.boss);
    await p2.close(); await c2.close();
  } catch (err) {
    fail++; console.log('  ❌ [R] 블록 예외: ' + String((err && err.message) || err).slice(0, 220));
  } finally {
    try { fs.unlinkSync(NEG); } catch (_) { /* 이미 없으면 그만 */ }
  }
  /* 수리 전 실측(probe460, 같은 하네스)은 [A] 1326/3600 = 36.8% · [B] 509/1800 = 28.3% 였다.
     브라우저 편차에 안 흔들리도록 «10% 이상» 으로 잡는다 — 0 과 가르는 것이 목적이다. */
  ok(negStage !== null && negStage > 360,
     'R1 되돌린 사본의 일반 전투는 위반 프레임이 다시 10% 이상',
     '찍힘 ' + negStage + ' / 3600 (수리 후 0)');
  ok(negBoss !== null && negBoss > 180,
     'R2 되돌린 사본의 보스전도 마찬가지',
     '찍힘 ' + negBoss + ' / 1800 (수리 후 0)');
  ok(negCast !== null && negCast > 0,
     'R3 되돌린 사본은 시전 프레임이 다시 attack_A 다 — [D2] 가 헛초록이 아니다',
     '찍힘 ' + negCast + '회 (수리 후 0)');

  ok(errs.length === 0, '콘솔 에러 0건', errs.length ? errs.slice(0, 2).join(' | ') : '');

  await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('VERIFY460: ' + pass + '/' + (pass + fail) + (fail ? '  ❌ 실패 ' + fail : '  ✅'));
  process.exit(fail ? 1 : 0);
})();
