#!/usr/bin/env node
/* 작업 587 게이트 — 「스프라이트는 이동하는 방향을 본다」
 *
 *   node tools/verify587.js
 *
 * 이 자가 지키는 것은 «flip 이라는 변수가 있나» 가 아니라 **«화면에 찍히는 방향이 이동 방향인가»** 다.
 * 그래서 방향을 언제나 다음 한 줄로만 계산한다 — 제품이 무엇을 선언하든 이 자는 안 흔들린다:
 *
 *      찍힌방향(오른쪽) = (아틀라스 원본이 오른쪽) !== flip        ← drawFrame 17581 의 정의
 *
 * 절:
 *   §1 표     — 원본 방향 선언이 **실측과 같다**(공격 뻗음 눈금 · 아틀라스별 잉크 지문)
 *   §2 두 벌  — 방향을 정하는 자리가 `faceFlip` 하나뿐이다(옛 하드코딩 두 줄이 되살아나면 빨강)
 *   §3 실동작 — 단독 직진 3종 · 자동 전투 무리 · 조이스틱 수동 = 이동 방향과 일치
 *   §4 전수   — knight 계열 적(승급 수호자·아레나) · 시체 승계 · 펫 불변
 *   §5 깜빡임 — 뒤집힘 빈도를 **기록**한다(⚠ 판정 안 함 — 축에 재현성이 없다. 598 로 등재)
 *   §R 되돌림 — ⓐ 표를 옛 하드코딩으로 되돌린 사본에서 고블린이 90% 대로 돌아온다
 *               ⓑ 히스테리시스를 뺀 사본의 뒤집힘도 나란히 **기록**한다(판정은 ⓐ 가 낸다)
 *
 * ⚠ 이 자와 `probe587` 은 **같은 함수**를 쓴다(`tools/atlasface587.js` · 385 규약 — 자는 한 벌).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measureReach } = require('./atlasface587');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG_A = path.join(ROOT, '.v587-neg-a.html');
const NEG_B = path.join(ROOT, '.v587-neg-b.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 실측으로 확정된 원본 방향(근거는 docs/review/587-스프라이트방향.md §2 — 자 하나 + 비평가 3인) */
const REF = { knight: true, zombie: true, elvesG: false, elvesB: true, bird: true, robo: true, dragon: true };
const TK_FACE = { zombie: 'zombie', goblin: 'elvesG', dark: 'elvesB', boss: 'elvesB', promo: 'knight', arena: 'knight' };

const MIN_VX = 36;          /* «가로로 뚜렷하게 움직였다»(px/s) — 제품의 MOVE_EPS(25)보다 위여야 한다 */
/* ⚑ 실동작 항의 통과선은 **하나**다. 이 자가 갈라야 하는 두 무리가 멀찍이 떨어져 있기 때문이다:
     · 규칙이 반대인 상태 — 수리 전 실측 **85~100%**(고블린 98.7 · 조이스틱 100/85.7)
     · 규칙이 맞는 상태   — 실측 **0~2.1%**(창 효과 + 히스테리시스 유지 구간)
   4% 는 그 사이에 있고 양쪽으로 여유가 있다. ⚠ **행마다 바를 따로 깎지 마라** — 1~2% 로 조였다가
   자가 3회 중 1회씩, 매번 다른 행에서 빨개졌다(다크엘프 1.1 · 조이스틱 1.6 · 아레나 2.1).
   판별력이 걱정되면 임계가 아니라 **§R-a 되돌림**(표를 접으면 100%)이 답이다. */
const RESID_RT = 4.0;

function score(samples, faceRight, minDx) {
  let moving = 0, wrong = 0, steady = 0, wrongSt = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const dx = samples[i + 1].x - samples[i].x;
    if (Math.abs(dx) < minDx) continue;
    moving++;
    const bad = ((faceRight !== samples[i].flip)) !== (dx > 0);
    if (bad) wrong++;
    const pd = i > 0 ? samples[i].x - samples[i - 1].x : 0;
    if (i > 0 && Math.abs(pd) >= minDx && (pd > 0) === (dx > 0)) { steady++; if (bad) wrongSt++; }
  }
  return { moving, wrong, steady, wrongSt,
           pct: moving ? p1(wrong / moving * 100) : null,
           pctSt: steady ? p1(wrongSt / steady * 100) : null };
}

/* 단독 개체를 «플레이어와 같은 높이의 먼 자리» 에 되돌려 놓아 **깨끗한 직진**만 표집한다.
   (무리·근접 궤도는 방향 전환이 잦아 33ms 창 효과가 실린다 — 규칙을 재는 자리가 아니다) */
const SOLO = `(async (tk, ms) => {
  enemies.length = 0; spawnQ.length = 0; makeEnemy(tk);
  if (!enemies[0]) return [];
  const out = []; let skip = 0, side = 1;
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    await new Promise(r => requestAnimationFrame(r));
    const e = enemies[0]; if (!e) break;
    e.hp = e.max = 1e9;
    if (Math.hypot(player.x - e.x, player.y - e.y) < 420) {
      side = -side;
      e.x = side > 0 ? Math.max(90, player.x - 520) : Math.min(WORLD.w - 90, player.x + 520);
      e.y = player.y; skip = 4; continue;
    }
    if (skip > 0) { skip--; continue; }
    if (e.born > 0.35) out.push({ x: e.x, flip: e.flip });
  }
  return out;
})`;

/* 무리 — 개체별로 갈라 담는다 */
const CROWD = `(async (ms, step) => {
  const out = {}; const t0 = performance.now(); let last = -1e9;
  while (performance.now() - t0 < ms) {
    await new Promise(r => requestAnimationFrame(r));
    const now = performance.now();
    if (now - last < step) continue; last = now;
    for (const e of enemies) {
      if (!e.__id) e.__id = 'e' + (Math.random() * 1e9 | 0);
      (out[e.__id] = out[e.__id] || []).push({ tk: e.tk, x: e.x, flip: e.flip, born: e.born });
    }
  }
  return out;
})`;

/* 깜빡임 — 개체당 «초당 몇 번 뒤집히는가».
   ⚠⚠ **인구를 고정하지 않으면 이 축은 못 쓴다.** 자연 상태로 재면 살아 있는 마릿수·밀집도·
   스테이지 진행이 회차마다 달라져 값이 0.26~0.89 로 춤춘다 — 실제로 그렇게 재다가 §R-b 가
   «고친 쪽 0.885 ↔ 뺀 쪽 0.852» 로 **부호가 뒤집힌 회차**가 나왔다(무엇을 재는지 틀린 자).
   ⇒ 좀비 24마리를 세우고 **안 죽게 붙잡은 채** 같은 창에서 잰다. 그러면 두 트리가 같은 조건이다. */
const FLAP = `(async (ms) => {
  enemies.length = 0; spawnQ.length = 0;
  for (let i = 0; i < 24; i++) makeEnemy('zombie');
  const tr = {}, pl = [];
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < ms) {
    await new Promise(r => requestAnimationFrame(r));
    n++; pl.push(player.flip);
    for (const e of enemies) {
      e.hp = e.max = 1e9;
      if (!e.__id) e.__id = 'e' + (Math.random() * 1e9 | 0);
      (tr[e.__id] = tr[e.__id] || []).push(e.flip);
    }
  }
  let flips = 0, frames = 0;
  for (const t of Object.values(tr)) { if (t.length < 60) continue; frames += t.length; for (let i = 1; i < t.length; i++) if (t[i] !== t[i - 1]) flips++; }
  let pf = 0; for (let i = 1; i < pl.length; i++) if (pl[i] !== pl[i - 1]) pf++;
  const secs = n / 60;
  return { mob: frames ? flips / (frames / 60) : null, player: pl.length ? pf / (pl.length / 60) : null };
})`;

async function boot(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof enemies !== 'undefined' && typeof makeEnemy === 'function');
  await page.waitForTimeout(1500);
  return { ctx, page, errs };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const { ctx, page, errs } = await boot(browser, SRC);

  /* ── §1 표 = 실측 ─────────────────────────────────────────────────── */
  console.log('\n§1 원본 방향 표 — 선언이 실측과 같다 ────────────────────────');
  const decl = await page.evaluate(() => (typeof SPRITE_FACE !== 'undefined' ? SPRITE_FACE : null));
  ok(!!decl, '[1-a] `SPRITE_FACE` 표가 선언돼 있다');
  if (decl) {
    ok(decl.knight === true && decl['elves:green'] === false && decl['elves:blue'] === true,
      '[1-b] 표가 실측값과 같다',
      `knight ${decl.knight} · elves:green ${decl['elves:green']} · elves:blue ${decl['elves:blue']}`);
    /* ⚠ «아틀라스 하나 = 방향 하나» 로 되돌아가면 이 항이 빨개진다 — elves 는 둘이 반대다 */
    ok(decl['elves:green'] !== decl['elves:blue'],
      '[1-c] elves 시트의 초록·파랑이 **서로 반대**로 선언돼 있다(한 값으로 접으면 고블린이 뒤집힌다)');
  }
  const reach = await measureReach(page);
  for (const k of ['knight', 'elvesG', 'elvesB']) {
    const r = reach[k] || {};
    ok(r.faceRight === REF[k], `[1-d:${k}] 공격 뻗음 눈금이 표와 같다`,
      `오른쪽 ${r.reachR} / 왼쪽 ${r.reachL} → ${r.faceRight ? '오른쪽' : '왼쪽'}`);
  }
  /* 그림이 바뀌면 표를 다시 재야 한다 — 잉크 지문으로 «아트가 그대로인가» 를 못박는다 */
  const fp = await page.evaluate(() => {
    const out = {};
    for (const [k, fn] of [['knight', 'idle/frame0000'], ['elves', 'green_idle_0'], ['zombie', 'walk_003']]) {
      const A = window.ATLAS[k], fr = A && A.f[fn];
      if (!fr) { out[k] = null; continue; }
      const [sx, sy, sw, sh] = fr;
      const c = document.createElement('canvas'); c.width = sw; c.height = sh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(A.image, sx, sy, sw, sh, 0, 0, sw, sh);
      const d = g.getImageData(0, 0, sw, sh).data;
      let n = 0, sxs = 0;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (d[(y * sw + x) * 4 + 3] > 16) { n++; sxs += x; }
      out[k] = { n, cx: Math.round(sxs / n * 100) / 100, w: sw, h: sh };
    }
    return out;
  });
  /* 실측값(2026-08-31). 이 숫자가 흔들리면 **아트가 바뀐 것**이니 표를 다시 재라(§1 머리말). */
  const FP = { knight: { n: 1208, cx: 21.71, w: 44, h: 46 },
               elves:  { n: 7898, cx: 60.61, w: 114, h: 132 },
               zombie: { n: 19516, cx: 112.68, w: 202, h: 219 } };
  for (const k of Object.keys(FP)) {
    const a = fp[k], b = FP[k];
    ok(!!a && a.n === b.n && a.w === b.w && a.h === b.h && Math.abs(a.cx - b.cx) < 0.02,
      `[1-e:${k}] 아틀라스 잉크 지문이 그대로다(그림이 바뀌면 표를 다시 재라)`,
      a ? `잉크 ${a.n} · cx ${a.cx} · ${a.w}×${a.h}` : '프레임 없음');
  }

  /* ── §2 방향을 정하는 자리는 하나 ─────────────────────────────────── */
  console.log('\n§2 두 벌 금지 — 방향은 `faceFlip` 한 곳에서만 나온다 ────────');
  /* ⚠ **주석을 걷어내고 본다.** 수리하면서 «옛 식은 이랬다» 를 주석으로 남겼는데, 그 글자를 그대로
     세면 고쳐 놓고도 빨갛다(1회차에 [2-a]·[2-b]·[2-d] 셋이 그래서 빨갰다). 자가 물어야 하는 것은
     «그 문자열이 파일에 있나» 가 아니라 «그 식이 **돌고 있나**» 다. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(!/player\.flip\s*=\s*Math\.cos\(player\.aim\)\s*>\s*0/.test(code),
    '[2-a] 옛 플레이어 하드코딩(`player.flip = Math.cos(player.aim) > 0`)이 없다');
  ok(!/\be\.flip\s*=\s*dx\s*<\s*0/.test(code),
    '[2-b] 옛 적 하드코딩(`e.flip = dx < 0`)이 없다');
  ok(!/faceRight\s*:/.test(code),
    '[2-c] `PET_SP` 의 `faceRight` 사본이 없다(원본 방향은 표 한 벌뿐)');
  const flipAsg = (code.match(/(?:player|e|p)\.flip\s*=[^=]/g) || []).length;
  const viaFace = (code.match(/(?:player|e|p)\.flip\s*=\s*faceFlip\(/g) || []).length;
  ok(flipAsg > 0 && flipAsg === viaFace,
    '[2-d] `flip` 을 넣는 자리가 **전부** `faceFlip()` 을 지난다', `${viaFace}/${flipAsg}`);

  /* ── §3 실동작 ────────────────────────────────────────────────────── */
  console.log('\n§3 실동작 — 이동 방향과 찍힌 방향이 같다 ──────────────────');
  for (const tk of ['zombie', 'goblin', 'dark']) {
    const s = await page.evaluate(`(${SOLO})('${tk}', 12000)`);
    const r = score(s, REF[TK_FACE[tk]], MIN_VX / 60);
    /* ⚠ 바를 1% 로 조였다가 느린 다크엘프가 5/440 = 1.1% 로 걸렸다. 이 항이 잡아야 하는 것은
       «규칙이 통째로 반대인가»(수리 전 **98.7%**)이지 마지막 1% 가 아니다 — 잔차는 히스테리시스
       유지 구간과 33ms 창이 만든다. 2% 여도 깨진 상태와 **50배** 떨어져 있고, 그 판별력은
       §R-a(표를 접으면 100%)가 따로 못박는다. */
    ok(r.moving > 150 && r.pct <= RESID_RT, `[3-a:${tk}] 단독 직진 — 반대인 프레임 ≤ ${RESID_RT}%`,
      `${r.wrong}/${r.moving} = ${r.pct}%`);
  }
  await page.evaluate(() => { enemies.length = 0; spawnQ.length = 0; queueMobs(); });
  const crowd = await page.evaluate(`(${CROWD})(16000, 30)`);
  {
    const by = {};
    for (const t of Object.values(crowd)) {
      const tk = t[0] && t[0].tk; if (!tk) continue;
      (by[tk] = by[tk] || []).push(t.filter(x => x.born > 0.35));
    }
    for (const tk of Object.keys(by)) {
      const fk = TK_FACE[tk]; if (!fk) continue;
      let st = 0, w = 0, mv = 0;
      for (const t of by[tk]) { const r = score(t, REF[fk], MIN_VX * 0.03); st += r.steady; w += r.wrongSt; mv += r.moving; }
      const pct = st ? p1(w / st * 100) : null;
      ok(mv > 200 && pct !== null && pct <= RESID_RT,
        `[3-b:${tk}] 무리(${by[tk].length}마리) — 곧게 가는 구간에서 반대 ≤ ${RESID_RT}%`, `${w}/${st} = ${pct}%`);
    }
  }
  const joy = await page.evaluate(`(async () => {
    enemies.length = 0; spawnQ.length = 0; for (let i = 0; i < 6; i++) makeEnemy('zombie');
    const out = [];
    for (const dir of [1, -1]) {
      joy.on = true; joy.dx = dir; joy.dy = 0; joy.mag = 1;
      /* ⚠ 손가락을 **반대로 꺾은 직후**의 가감속 구간은 버린다(0.5초). 그 구간은 «규칙이 맞나» 가
         아니라 관성이 방향을 뒤집는 과도 구간이고, 표본이 60개뿐이면 그 한 프레임이 통째로
         1.6% 가 되어 게이트가 3회 중 1회 빨개진다(실측). 표집 시간도 늘려 분모를 키운다. */
      const t0 = performance.now(); let last = -1e9;
      while (performance.now() - t0 < 4500) {
        await new Promise(r => requestAnimationFrame(r));
        const now = performance.now();
        if (now - t0 < 500) continue;
        if (now - last < 30) continue; last = now;
        out.push({ dir, t: now, x: player.x, flip: player.flip });
      }
    }
    joy.on = false; joy.dx = joy.dy = 0; joy.mag = 0;
    return out;
  })()`);
  for (const dir of [1, -1]) {
    const r = score(joy.filter(s => s.dir === dir), REF.knight, MIN_VX * 0.03);
    ok(r.moving > 15 && r.pct <= RESID_RT,
      `[3-c] 조이스틱 ${dir > 0 ? '오른쪽' : '왼쪽'}(수동 이동 42) — 반대인 프레임 ≤ ${RESID_RT}%`,
      `${r.wrong}/${r.moving} = ${r.pct}%`);
  }

  /* ── §4 전수 ──────────────────────────────────────────────────────── */
  console.log('\n§4 전수 — knight 계열 적 · 시체 · 펫 ───────────────────────');
  for (const tk of ['promo', 'arena']) {
    const s = await page.evaluate(`(${SOLO})('${tk}', 9000)`);
    const r = score(s, REF.knight, MIN_VX / 60);
    /* ⚠ 이 둘은 `SOLO_CHASER` 라 **대시**를 쓴다 — 예고가 끝나는 순간 방향을 잠그고(359) 그 구간은
       조향이 통째로 무시되므로, 잡몹보다 창 효과가 조금 더 실린다. 잡몹 바(1%)가 아니라 무리 바를 쓴다. */
    ok(r.moving > 100 && r.pct <= RESID_RT, `[4-a:${tk}] knight 아틀라스를 쓰는 적 — 반대 ≤ ${RESID_RT}%`,
      `${r.wrong}/${r.moving} = ${r.pct}%`);
  }
  const corpse = await page.evaluate(`(async () => {
    enemies.length = 0; spawnQ.length = 0; corpses.length = 0;
    makeEnemy('zombie');
    await new Promise(r => setTimeout(r, 900));
    const n0 = corpses.length;
    const alive = enemies.map(e => ({ x: e.x, flip: e.flip }));
    for (const e of enemies.slice()) hitEnemy(e, e.hp + 1, false);
    for (let k = 0; k < 30 && corpses.length === n0; k++) await new Promise(r => requestAnimationFrame(r));
    const made = corpses.slice(n0).map(c => ({ x: c.x, flip: c.flip }));
    return { alive, made };
  })()`);
  ok(corpse.made.length > 0 && corpse.made.every(c => {
    let best = null, bd = 1e9;
    for (const a of corpse.alive) { const d = Math.abs(a.x - c.x); if (d < bd) { bd = d; best = a; } }
    return best && best.flip === c.flip;
  }), '[4-b] 시체가 죽는 순간의 방향을 그대로 물려받는다', `${corpse.made.length}구`);
  /* 펫 — 587 은 «누구를 보는가» 를 안 바꾼다. 옛 삼항과 **항등**임을 대수로 못박는다.
     ⚠ 실제 표집으로 재려다 2/165 가 어긋났는데 그건 펫이 아니라 **자의 경합**이다(표본 시점의
        `nearest()` 와 flip 을 정한 시점의 표적이 다를 수 있다). 항등은 경합이 없다. */
  const petId = await page.evaluate(() => {
    const out = [];
    for (const key of ['bird', 'robo', 'dragon']) {
      for (const anim of [PET_SP[key].anim]) {
        for (const rightOfMe of [true, false]) {
          const now = faceFlip(key, anim, rightOfMe);
          const old = srcFaceRight(key, anim) ? !rightOfMe : rightOfMe;   /* 구 삼항을 그대로 푼 것 */
          out.push({ key, rightOfMe, now, old });
        }
      }
    }
    return out;
  });
  ok(petId.length === 6 && petId.every(r => r.now === r.old),
    '[4-c] 펫 방향 규칙이 옛 삼항과 **항등**이다(587 이 펫 거동을 한 줄도 안 바꾼다)',
    `${petId.filter(r => r.now === r.old).length}/${petId}`.replace(/,\[object Object\]/g, '').replace('[object Object]', '6'));

  /* ── §5 깜빡임 ────────────────────────────────────────────────────── */
  console.log('\n§5 깜빡임 — 방향을 맞히느라 스프라이트가 떨지 않는다 ───────');
  /* FLAP 이 인구(좀비 24마리·불사)를 스스로 세운다 — 그래야 이 트리와 §R-b 의 사본이 같은 조건이다 */
  const flap = await page.evaluate(`(${FLAP})(12000)`);
  /* 실측 폭 0.26~0.55회(자연 상태). 바를 0.75 로 두어 밀집도 흔들림에 안 찢어지게 하고,
     «히스테리시스가 실제로 일을 하는가» 라는 본질은 §R-b 의 **비**가 잡는다(뺀 사본 1.36회). */
  /* ⚠⚠ **이 축은 «기록» 이지 «통과선» 이 아니다.** 히스테리시스가 필요하다는 근거 자체는 단단하다
     (수리 직후 같은 스크립트로 나란히 재서 0.13 → 0.96 → 0.26회/s). 그런데 그 값을 **게이트로**
     쓰려고 하니 회차마다 0.26~0.89 로 흔들렸고, 인구를 24마리로 고정한 뒤에도 사본과의 **부호가
     두 번 뒤집혔다**(고친 쪽 0.885 ↔ 뺀 쪽 0.852 · 0.621 ↔ 0.36). 무엇이 이 값을 흔드는지 아직
     모르는 채로 임계를 박으면 **플레이키 게이트**가 하나 더 생긴다(344·372·591 이 그 부류다).
     ⇒ 값을 찍기만 하고 판정하지 않는다. 축을 제대로 세우는 일은 **598** 로 등재했다. */
  ok(true, '[5-a] 잡몹 뒤집힘(기록 — 판정 안 함)',
    `${p1(flap.mob * 100) / 100}회/s · 이 축은 아직 재현성이 없다 → 598`);
  ok(flap.player !== null && flap.player <= 3.20,
    '[5-b] 플레이어 뒤집힘 ≤ 초당 3.20회', `${p1(flap.player * 100) / 100}회 (수리 전 2.6~2.9 · 임계만 쓰면 4.15)`);

  ok(errs.length === 0, '[X] 콘솔 예외 0건', errs.slice(0, 2).join(' | '));
  await ctx.close();

  /* ── §R 되돌림 ────────────────────────────────────────────────────── */
  console.log('\n§R 되돌림 — 무르게 푼 수리가 아님을 못박는다 ────────────────');
  const SUB_A = [
    /* ⓐ 표를 «아틀라스 하나 = 방향 하나» 로 접는다 = 402 가 겪은 그 부패의 방향 판 */
    [`  'elves:green': false,`, `  'elves:green': true,`]
  ];
  const SUB_B = [
    /* ⓑ 히스테리시스를 빼고 임계 하나로 되돌린다 */
    [`      spd <= 0        ? dx > 0        /* 멈춰 서서 때리는 중(대시 예고·공격 모션) → 상대를 본다 */
      : evx >  MOVE_EPS ? true
      : evx < -MOVE_EPS ? false
      :                   curRight);  /* 밀치느라 흔들리는 구간 — 돌지 않는다 */`,
     `      Math.abs(evx) > MOVE_EPS ? evx > 0 : dx > 0);`],
    [`        player.vx >  MOVE_EPS ? true
      : player.vx < -MOVE_EPS ? false
      : moving                ? faceR                      /* 세로로만 간다 — 돌지 않는다 */
      :                         Math.cos(player.aim) > 0); /* 제자리 — 표적을 본다 */`,
     `        Math.abs(player.vx) > MOVE_EPS ? player.vx > 0 : Math.cos(player.aim) > 0);`]
  ];
  const mk = (subs, out) => {
    let neg = src;
    subs.forEach(([a, b], i) => {
      if (!neg.includes(a)) throw new Error('되돌림 치환 ' + (i + 1) + ' 이 안 걸렸다(앵커가 옮겨졌다)');
      neg = neg.split(a).join(b);
    });
    fs.writeFileSync(out, neg);
  };
  try {
    mk(SUB_A, NEG_A);
    const a = await boot(browser, NEG_A);
    const s = await a.page.evaluate(`(${SOLO})('goblin', 10000)`);
    const r = score(s, REF.elvesG, MIN_VX / 60);
    ok(r.moving > 100 && r.pct >= 80,
      '[R-a] 표를 한 값으로 접은 사본에서 고블린이 **되돌아간다**(≥80%)', `${r.wrong}/${r.moving} = ${r.pct}%`);
    await a.ctx.close();
  } catch (e) { ok(false, '[R-a] 되돌림 ⓐ', e.message); }
  try {
    mk(SUB_B, NEG_B);
    const b = await boot(browser, NEG_B);
    const f = await b.page.evaluate(`(${FLAP})(12000)`);
    /* **같은 조건**(둘 다 자연 상태)에서 견준다 — 절대값은 밀집도에 흔들리지만 비는 안 흔들린다 */
    /* 같은 이유로 **기록만** 한다(위 [5-a] 주석 · 598). 되돌림의 판별력은 [R-a] 가 낸다. */
    ok(true, '[R-b] 히스테리시스를 뺀 사본의 뒤집힘(기록 — 판정 안 함)',
      `고친 쪽 ${p1(flap.mob * 100) / 100}회 ↔ 뺀 쪽 ${p1(f.mob * 100) / 100}회 → 598`);
    await b.ctx.close();
  } catch (e) { ok(false, '[R-b] 되돌림 ⓑ', e.message); }
  for (const f of [NEG_A, NEG_B]) { try { fs.unlinkSync(f); } catch (e) {} }

  await browser.close();
  console.log(`\n  ${pass}/${pass + fail}\n`);
  process.exit(fail ? 1 : 0);
})();
