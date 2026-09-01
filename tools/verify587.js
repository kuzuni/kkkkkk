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
 *   §5 깜빡임 — 뒤집힘 빈도를 **결정적 판**에서 잰다(598 — 시드 고정 · step 수동 구동 · 배우 못박기)
 *   §R 되돌림 — ⓐ 표를 옛 하드코딩으로 되돌린 사본에서 고블린이 90% 대로 돌아온다
 *               ⓑ 히스테리시스를 뺀 사본이 §5 와 **같은 바를 넘는다**(바에 판별력이 있다는 증명)
 *
 * ⚠ 이 자와 `probe587` 은 **같은 함수**를 쓴다(`tools/atlasface587.js` · 385 규약 — 자는 한 벌).
 * ⚠ §5·§R-b 의 깜빡임 시나리오도 `probe598` 과 **같은 함수**다(`tools/flap598lib.js`).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measureReach } = require('./atlasface587');
/* 598 — 깜빡임 축은 **결정적 시나리오** 한 벌에서만 온다(probe598 과 같은 함수 · 385 규약)
   606 — §3·§4 실동작 하네스도 **같은 구동**을 쓴다(rAF 표본 폐지 · 아래 §3 머리말) */
const { FLAP_DET, PLAY_DET, SUB_HYST,
        SOLO_DET, CROWD_DET, JOY_DET, CORPSE_DET } = require('./flap598lib');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG_A = path.join(ROOT, `.v587-neg-a-${process.pid}.html`);
const NEG_B = path.join(ROOT, `.v587-neg-b-${process.pid}.html`);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const p1 = n => Math.round(n * 10) / 10;
const p2 = n => (typeof n === 'number' ? n.toFixed(2) : String(n));   /* 598 — 깜빡임 값 표기(부동소수 꼬리 제거) */

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

/* 606 — 실동작 표본의 손잡이. **벽시계(ms)가 아니라 프레임 수**다: `step(1/60)` 을 손으로
   굴리므로 «12초» 가 회차마다 334~357프레임으로 달라지던 일이 없다(598 §5 가 깐 길).
   프레임 수는 옛 벽시계와 **같은 게임 시간**으로 맞췄다(12초·16초·4.5초·9초 = 720·960·270·540). */
const ACT_FRAMES = 720;          /* [3-a] 단독 직진 — 12초 */
const CROWD_FRAMES = 960;        /* [3-b] 무리 — 16초 */
const CROWD_EVERY = 2;           /* 2프레임(33ms)마다 표집 — 옛 판의 «30ms 마다» 와 같은 뜻 */
const JOY_FRAMES = 270;          /* [3-c] 방향당 4.5초 */
const JOY_WARM = 30;             /* 꺾은 직후 0.5초 버리기(옛 판과 같은 규약) */
const JOY_EVERY = 2;
const KN_FRAMES = 540;           /* [4-a] knight 계열 — 9초 */
/* 시드는 하나면 된다(값 자체에는 뜻이 없다 — «회차마다 같기만 하면» 된다).
   §5 가 쓰는 11 을 그대로 써서 이 자가 굴리는 판이 두 벌이 되지 않게 한다. */
const ACT_SEED = 11;

/* 598 — 깜빡임 판정의 손잡이. 시드 둘은 `probe598` §C 가 잰 다섯 시드의 **최대·최소 자리**다
   (11 = 고친 쪽 15.674 로 가장 많이 도는 시드 · 44 = 13.632 로 가장 적게 도는 시드).
   바 16.4 는 두 무리(고침 13.63~15.67 ↔ 뺌 17.21~19.41) 사이 한복판이고 여유가 대칭이다. */
const DET_SEEDS = [11, 44];
const DET_FRAMES = 720;          /* 12초 @ 60fps — 587 의 자연 측정과 같은 «게임 시간» */
const BAR_FLAP = 16.4;

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
  /* ⚑ **606 이 이 절과 §4 의 구동을 갈아 끼웠다.** 여기까지는 rAF 표본이라 **머신 부하가 곧 값**이었다 —
     같은 커밋·같은 트리에서 `[4-a:promo]` 가 2.1 · 2.9 · 4.7 · 5.7 · 6.6%(바 4.0)로 흔들렸고
     `[3-c]` 표본 수는 72 ↔ 28 로 2.6배 갈렸다. 598 이 §5 에서 찾은 답을 그대로 넓힌다:
     루프를 멈추고 `step(1/60)` 을 손으로 굴리고, `Math.random` 을 시드 LCG 로 갈고,
     배우·좌표·스월을 선언으로 세운다(`flap598lib` 의 `SOLO_DET`·`CROWD_DET`·`JOY_DET`·`CORPSE_DET`).
     ⚠ **표본 규약은 한 줄도 안 바꿨다**(되돌려 놓기 · 4프레임 버리기 · born 필터 · 0.5초 워밍업) —
       바뀐 것은 «무엇이 굴리는가» 뿐이다. 그래서 바(4%)도 **한 칸도 안 넓혔다**: 판별력은
       임계가 아니라 §R-a(표를 접으면 100%)가 낸다. */
  for (const tk of ['zombie', 'goblin', 'dark']) {
    const s = await page.evaluate(`(${SOLO_DET})('${tk}', ${ACT_FRAMES}, ${ACT_SEED})`);
    const r = score(s, REF[TK_FACE[tk]], MIN_VX / 60);
    /* ⚠ 바를 1% 로 조였다가 느린 다크엘프가 5/440 = 1.1% 로 걸렸다. 이 항이 잡아야 하는 것은
       «규칙이 통째로 반대인가»(수리 전 **98.7%**)이지 마지막 1% 가 아니다 — 잔차는 히스테리시스
       유지 구간과 33ms 창이 만든다. 2% 여도 깨진 상태와 **50배** 떨어져 있고, 그 판별력은
       §R-a(표를 접으면 100%)가 따로 못박는다. */
    ok(r.moving > 150 && r.pct <= RESID_RT, `[3-a:${tk}] 단독 직진 — 반대인 프레임 ≤ ${RESID_RT}%`,
      `${r.wrong}/${r.moving} = ${r.pct}%`);
  }
  /* ⚑ 606 — `queueMobs()` 를 안 쓴다. 그 함수는 종을 `S.stage`(부팅 세이브!)와 난수로 뽑아서
     실측 3회 내내 **zombie 한 종만** 채점됐다(고블린·다크엘프 항은 «빨간» 게 아니라 아예 없었다).
     `CROWD_DET` 이 세 종을 선언으로 세우므로 이 항은 이제 **언제나 셋**이다. */
  const crowd = await page.evaluate(`(${CROWD_DET})(${CROWD_FRAMES}, ${ACT_SEED}, ${CROWD_EVERY})`);
  {
    const by = {};
    for (const t of Object.values(crowd)) {
      const tk = t[0] && t[0].tk; if (!tk) continue;
      (by[tk] = by[tk] || []).push(t.filter(x => x.born > 0.35));
    }
    ok(Object.keys(by).filter(tk => TK_FACE[tk]).length === 3,
      '[3-b0] 무리에 세 종이 **전부** 서 있다(한 종만 채점되던 자리 — 606)', Object.keys(by).join('·'));
    for (const tk of Object.keys(by).sort()) {
      const fk = TK_FACE[tk]; if (!fk) continue;
      let st = 0, w = 0, mv = 0;
      /* 최소 이동 눈금은 **표집 간격에서 유도**한다(옛 벽시계 상수 0.03 은 간격과 갈라진다) */
      for (const t of by[tk]) { const r = score(t, REF[fk], MIN_VX * CROWD_EVERY / 60); st += r.steady; w += r.wrongSt; mv += r.moving; }
      const pct = st ? p1(w / st * 100) : null;
      ok(mv > 200 && pct !== null && pct <= RESID_RT,
        `[3-b:${tk}] 무리(${by[tk].length}마리) — 곧게 가는 구간에서 반대 ≤ ${RESID_RT}%`, `${w}/${st} = ${pct}%`);
    }
  }
  /* ⚠ 손가락을 **반대로 꺾은 직후**의 가감속 구간은 버린다(0.5초 = 30프레임). 그 구간은 «규칙이
     맞나» 가 아니라 관성이 방향을 뒤집는 과도 구간이고, 표본이 60개뿐이면 그 한 프레임이 통째로
     1.6% 가 되어 게이트가 3회 중 1회 빨개진다(587 실측). 그 규약은 `JOY_DET` 이 그대로 갖고 있다. */
  const joy = await page.evaluate(`(${JOY_DET})(${JOY_FRAMES}, ${ACT_SEED}, ${JOY_EVERY}, ${JOY_WARM})`);
  for (const dir of [1, -1]) {
    const r = score(joy.filter(s => s.dir === dir), REF.knight, MIN_VX * JOY_EVERY / 60);
    ok(r.moving > 15 && r.pct <= RESID_RT,
      `[3-c] 조이스틱 ${dir > 0 ? '오른쪽' : '왼쪽'}(수동 이동 42) — 반대인 프레임 ≤ ${RESID_RT}%`,
      `${r.wrong}/${r.moving} = ${r.pct}%`);
  }

  /* ── §4 전수 ──────────────────────────────────────────────────────── */
  console.log('\n§4 전수 — knight 계열 적 · 시체 · 펫 ───────────────────────');
  for (const tk of ['promo', 'arena']) {
    const s = await page.evaluate(`(${SOLO_DET})('${tk}', ${KN_FRAMES}, ${ACT_SEED})`);
    const r = score(s, REF.knight, MIN_VX / 60);
    /* ⚠ 이 둘은 `SOLO_CHASER` 라 **대시**를 쓴다 — 예고가 끝나는 순간 방향을 잠그고(359) 그 구간은
       조향이 통째로 무시되므로, 잡몹보다 창 효과가 조금 더 실린다. 잡몹 바(1%)가 아니라 무리 바를 쓴다. */
    ok(r.moving > 100 && r.pct <= RESID_RT, `[4-a:${tk}] knight 아틀라스를 쓰는 적 — 반대 ≤ ${RESID_RT}%`,
      `${r.wrong}/${r.moving} = ${r.pct}%`);
  }
  /* ⚑ 606 — 옛 판은 0.9초 동안 판을 **그대로 굴려** 두었고, 그 사이 플레이어가 그 좀비를 먼저
     죽이면 `enemies` 가 비어 «시체 0구» 로 빨개졌다(실측 1회). 스킬 봉인 + 체력 붙잡기로
     «내가 죽이는 순간» 말고는 아무도 안 죽는다 — 판정(방향 승계)은 한 글자도 안 바꿨다. */
  const corpse = await page.evaluate(`(${CORPSE_DET})(${ACT_SEED})`);
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
  console.log('\n§5 깜빡임 — 방향을 맞히느라 스프라이트가 떨지 않는다(결정적 판) ───');
  /* ⚑ **598 이 이 절을 통째로 갈아 끼웠다.** 587 은 이 축을 «기록만» 으로 두고 넘겼다 —
     자연 상태로 재면 회차마다 0.26~1.04 로 춤췄고 사본과 **부호가 뒤집히는 회차**까지 나왔기
     때문이다(고친 쪽 1.038 ↔ 뺀 쪽 1.022). 598 이 재현으로 찾아낸 답은 **«축이 아니라 판이
     흔들렸다»** 였다(`probe598` §B·§C):
        · rAF 로 굴리면 같은 12초에 굴러간 프레임이 334~357 로 다르고(dt 가 안 같다)
        · 스폰 좌표·스월 부호·돌진 시각이 전부 `Math.random` 이고
        · 부팅 워밍업이 남긴 배우 상태(플레이어 좌표·조준·스킬 쿨·투사체)가 회차마다 다르다
     ⇒ `flap598lib` 이 그 셋을 못박는다 — 루프를 멈추고 `step(1/60)` 을 손으로 굴리고,
        `Math.random` 을 시드 LCG 로 갈고, 좌표·스월·배우를 선언으로 세운다.
        같은 시드면 값이 **완전히 같다**(`probe598` [B2] 3/3 · 아래 [5-c] 가 매 실행 다시 확인).
     ⚠ 바는 «넉넉히 벌려 초록» 이 아니다 — 시드 5개 실측이 **두 무리로 갈라져 있다**:
        고친 쪽 13.63~15.67 ↔ 뺀 쪽 17.21~19.41. 바 16.4 는 그 사이 한복판이고
        양쪽으로 4.6% / 4.7% 여유가 대칭이다. 판별력은 §R-b 가 **같은 바**로 낸다. */
  const detMob = [];
  for (const sd of DET_SEEDS) detMob.push(await page.evaluate(`(${FLAP_DET})(${DET_FRAMES}, ${sd})`));
  DET_SEEDS.forEach((sd, i) => ok(detMob[i].mob !== null && detMob[i].mob <= BAR_FLAP,
    `[5-${'ab'[i]}] 잡몹 뒤집힘(결정적 · 시드 ${sd}) ≤ 초당 ${BAR_FLAP}회`,
    `${p2(detMob[i].mob)}회/s · 깜빡임 ${p2(detMob[i].flick)} · ${detMob[i].mobs}마리`));
  const again = await page.evaluate(`(${FLAP_DET})(${DET_FRAMES}, ${DET_SEEDS[0]})`);
  ok(Math.abs(again.mob - detMob[0].mob) < 1e-9,
    '[5-c] **같은 시드를 다시 재면 값이 같다**(축에 재현성이 있다 — 598 의 본체)',
    `${p2(again.mob)} = ${p2(detMob[0].mob)} (오차 ${(Math.abs(again.mob - detMob[0].mob)).toExponential(1)})`);
  /* 플레이어 — 각본(0.75초마다 여섯 국면 · 세로만 둘 · 임계 언저리 둘)대로 손가락을 꺾는다.
     각본이 요구하는 가로 전환은 12초에 8번이고 고친 쪽은 9번(0.75회/s)으로 **거의 그것뿐**이다.
     ⚠ 판정은 «몇 번 도나» 가 아니라 **«돌았다가 0.25초 안에 되돌아오나»** 로 한다 — 바닥이 0 이라
        환경이 달라져도 안 흔들리고, 587 §6 이 말한 병(«카이팅 중 홱홱 돈다»)이 정확히 그것이다. */
  const detPl = await page.evaluate(`(${PLAY_DET})(${DET_FRAMES}, ${DET_SEEDS[0]})`);
  ok(detPl.flick === 0,
    '[5-d] 플레이어 — 각본을 도는 동안 **0.25초 안에 되돌아오는 뒤집힘이 0건**',
    `깜빡임 ${p2(detPl.flick)}회/s · 전체 ${p2(detPl.player)}회/s`);
  ok(detPl.player <= 1.0,
    '[5-e] 플레이어 뒤집힘 ≤ 초당 1.0회(각본이 요구하는 전환 8번 + 여유)',
    `${p2(detPl.player)}회/s (뺀 사본 0.83~1.33)`);

  ok(errs.length === 0, '[X] 콘솔 예외 0건', errs.slice(0, 2).join(' | '));
  await ctx.close();

  /* ── §R 되돌림 ────────────────────────────────────────────────────── */
  console.log('\n§R 되돌림 — 무르게 푼 수리가 아님을 못박는다 ────────────────');
  const SUB_A = [
    /* ⓐ 표를 «아틀라스 하나 = 방향 하나» 로 접는다 = 402 가 겪은 그 부패의 방향 판 */
    [`  'elves:green': false,`, `  'elves:green': true,`]
  ];
  /* ⓑ 히스테리시스를 뺀 사본 — 치환표는 `flap598lib` 한 곳에 있다(probe598 과 같은 앵커) */
  const SUB_B = SUB_HYST;
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
    /* 606 — 음성항도 **같은 판**에서 재야 «같은 자로 잰 두 값» 이다(양성 0% ↔ 음성 100%) */
    const s = await a.page.evaluate(`(${SOLO_DET})('goblin', ${ACT_FRAMES}, ${ACT_SEED})`);
    const r = score(s, REF.elvesG, MIN_VX / 60);
    ok(r.moving > 100 && r.pct >= 80,
      '[R-a] 표를 한 값으로 접은 사본에서 고블린이 **되돌아간다**(≥80%)', `${r.wrong}/${r.moving} = ${r.pct}%`);
    await a.ctx.close();
  } catch (e) { ok(false, '[R-a] 되돌림 ⓐ', e.message); }
  try {
    mk(SUB_B, NEG_B);
    const b = await boot(browser, NEG_B);
    /* **같은 시드·같은 각본**으로 견준다. 견줄 수 있는 근거: `flip` 은 그리기에만 쓰이고 물리로
       되먹임되지 않으므로(`.flip` 참조가 전부 drawFrame/시체 승계다) 두 트리의 **궤적이 같다** —
       차는 궤적이 아니라 **규칙 하나**다. 587 이 못 잡던 «부호 뒤집힘» 이 여기서 사라진다. */
    const nb = [];
    for (const sd of DET_SEEDS) nb.push(await b.page.evaluate(`(${FLAP_DET})(${DET_FRAMES}, ${sd})`));
    DET_SEEDS.forEach((sd, i) => ok(nb[i].mob > BAR_FLAP,
      `[R-b:${sd}] 히스테리시스를 뺀 사본은 **같은 바(${BAR_FLAP})를 넘는다** = 바에 판별력이 있다`,
      `뺀 쪽 ${p2(nb[i].mob)} ↔ 고친 쪽 ${p2(detMob[i].mob)} (×${p2(nb[i].mob / detMob[i].mob)})`));
    ok(nb.every((x, i) => x.mob / detMob[i].mob >= 1.15),
      '[R-c] 배수가 시드마다 1.15 이상이다(실측 1.22~1.26 — 무르게 푼 수리가 아니다)',
      nb.map((x, i) => '×' + p2(x.mob / detMob[i].mob)).join(' · '));
    const np = await b.page.evaluate(`(${PLAY_DET})(${DET_FRAMES}, ${DET_SEEDS[0]})`);
    ok(np.flick > 0,
      '[R-d] 뺀 사본은 **플레이어가 각본 도중 되돌아온다**(고친 쪽 0건 · [5-d] 의 음성항)',
      `깜빡임 ${p2(np.flick)}회/s · 전체 ${p2(np.player)}회/s`);
    await b.ctx.close();
  } catch (e) { ok(false, '[R-b] 되돌림 ⓑ', e.message); }
  for (const f of [NEG_A, NEG_B]) { try { fs.unlinkSync(f); } catch (e) {} }

  await browser.close();
  console.log(`\n  ${pass}/${pass + fail}\n`);
  process.exit(fail ? 1 : 0);
})();
