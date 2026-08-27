/* 작업 170 회귀 게이트 — 스테이지 클리어 보상은 «골드만» (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify170.js   → 마지막 줄이 `VERIFY170 n/n PASS` 여야 한다.

   주인 지시: «스테이지 클리어했다고 다이아 보상 주면 안 됨 — 골드만 보상 줘야 함».
   162 이후 **보스 격파 = 스테이지 클리어** 이므로 폐지 대상은 두 자리다:
     ⓐ 클리어 블록의 «최고 기록 첫 돌파» 다이아  `const d = 35 + Math.floor(S.stage*3.6); S.dia += d`
        와 그 문구 조각 `msg += ' 다이아 +' + fmt(d)`   (index.html `if(stageWin){ … }`)
     ⓑ `killEnemy()` 의 보스 킬 다이아            `if(e.tk === 'boss' && S.stage >= S.best) S.dia += 250 + S.stage*25`

   본다 (LESSONS 184-③ — «전수 조사의 결과물은 목록이 아니라 그 목록을 다시 만들어 주는 게이트»):
     §1 소스   폐지 두 자리가 **구간 단위**로 비었는가 — 리터럴 금지어가 아니라
               «클리어 블록 / killEnemy 본문 안에 `S.dia` 가산이 0건» 이라는 **패턴**으로 센다.
               (되살리는 사람이 상수를 바꿔 넣어도 걸린다.) 골드 보너스 줄은 그대로 살아 있어야 한다.
     §2 런타임 최고 기록 **갱신** 클리어 — Δ다이아 0 · Δ골드 > 0 · 스테이지 +1 · 문구 «STAGE CLEAR!».
     §3 런타임 최고 기록 **미갱신** 클리어 — 마찬가지로 Δ다이아 0 · Δ골드 > 0.
     §4 런타임 `killEnemy(보스)` 단독 호출 — Δ다이아 0 (골드는 그대로 들어온다).
     §5 런타임 일반 몹 `killEnemy` — Δ다이아 0 · Δ골드 > 0 (원래 없던 자리에 새로 안 생겼는지).
     §6 회귀   **다른 다이아 수급처는 살아 있다** — 퀘스트 수령이 여전히 다이아를 준다
               («전부 막아 버리기» 로도 통과하는 게이트를 쓰지 않는다 — LESSONS 181-⑥).
     §7 콘솔 에러 0. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);

const SRC = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
/* «없어야 한다» 검사는 주석을 빼고 본다 — 폐기 사유를 적어 둔 주석까지 위반으로 잡으면
   기록을 남기지 못하게 만드는 게이트가 된다(162 와 같은 방침). */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

/* `{` 하나를 짝맞춰 그 블록 본문을 잘라낸다(주석을 이미 지운 CODE 에 쓴다). */
function block(src, head) {
  const i = src.indexOf(head);
  if (i < 0) return null;
  let d = 0, j = i + head.length - 1;                     /* head 는 여는 `{` 로 끝난다 */
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return src.slice(i, j + 1); }
  }
  return null;
}

(async () => {
  let br = null;
  try {
    /* ── §1 소스 ─────────────────────────────────────────────── */
    console.log('§1 소스 — 폐지 두 자리가 구간 단위로 비었다');

    const clear = block(CODE, 'if(stageWin){');
    ok(!!clear, '§1 클리어 블록 `if(stageWin){ … }` 을 찾았다');
    const kill = block(CODE, 'function killEnemy(e){');
    ok(!!kill, '§1 `killEnemy()` 본문을 찾았다');

    const diaAdd = /S\.dia\s*(\+=|=\s*S\.dia\s*\+)/g;
    eq('§1-ⓐ 클리어 블록 안 `S.dia` 가산 0건',
       ((clear || '').match(diaAdd) || []).length, 0);
    eq('§1-ⓑ `killEnemy()` 안 `S.dia` 가산 0건',
       ((kill || '').match(diaAdd) || []).length, 0);
    /* 상수만 갈아 끼워 되살리는 길도 막는다 — 두 구간에 `S.dia` 라는 글자 자체가 없어야 한다 */
    eq('§1-ⓐ 클리어 블록에 `S.dia` 언급 0건', ((clear || '').match(/S\.dia/g) || []).length, 0);
    eq('§1-ⓑ `killEnemy()` 에 `S.dia` 언급 0건', ((kill || '').match(/S\.dia/g) || []).length, 0);
    /* 옛 상수식이 다른 자리로 «이사» 하지도 않았는지 파일 전체로 확인 */
    eq('§1 옛 클리어 다이아 식 `35 + Math.floor(S.stage*3.6)` 0건',
       (CODE.match(/35\s*\+\s*Math\.floor\(\s*S\.stage\s*\*\s*3\.6\s*\)/g) || []).length, 0);
    eq('§1 옛 보스 킬 다이아 식 `250 + S.stage*25` 0건',
       (CODE.match(/250\s*\+\s*S\.stage\s*\*\s*25/g) || []).length, 0);
    /* 문구 — «STAGE CLEAR!» 뒤에 아무것도 안 붙는다 */
    ok(/const msg = 'STAGE CLEAR!';/.test(CODE), '§1 클리어 문구는 `const msg = \'STAGE CLEAR!\'`');
    eq('§1 클리어 블록 안 `msg +=` 0건', ((clear || '').match(/msg\s*\+=/g) || []).length, 0);
    eq('§1 클리어 문구에 «다이아» 낱말 0건', ((clear || '').match(/다이아/g) || []).length, 0);
    /* 살아 있어야 하는 것 — 골드 보너스(«골드만» 의 «만» 이 아니라 «골드» 쪽) */
    ok(/const bonusG = eGold\(S\.stage-1\) \* 12 \* stat\.goldMul;/.test(CODE),
       '§1 클리어 골드 보너스는 그대로 살아 있다');
    ok(/S\.gold \+= bonusG; goldWin \+= bonusG;/.test(clear || ''),
       '§1 클리어 블록이 골드를 지급한다');
    ok(/S\.gold \+= g;/.test(kill || ''), '§1 `killEnemy()` 는 골드를 계속 준다');

    /* ── 런타임 ──────────────────────────────────────────────── */
    br = await launch(chromium, { args: ['--allow-file-access-from-files'] });
    const ctx = await br.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e && e.message || e)));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    /* 게임 루프를 얼린다 — 얼리지 않으면 박아 둔 상태를 다음 프레임이 되돌린다(161 교훈) */
    await p.evaluate(() => { window.requestAnimationFrame = () => 0; });

    /* 162 의 실제 클리어 경로로 굴린다: 50킬 → 보스 도전 → 보스 스폰 → killEnemy → 클리어.
       («전장 비우고 step 한 틱» 은 162 이후 클리어를 못 태운다 — probe160 이 그렇게 썩어 있었다.) */
    const clearRun = (first) => p.evaluate((first) => {
      arena = null; raidOn = null; dunRun = null; promo = null;
      S.stage = 12; S.best = first ? 12 : 999; S.bossFarm = false;
      spawnStage();
      player.dead = 0; player.hp = stat.maxHp;
      enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
      step(0.016);                                        /* → 보스 도전 */
      for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
      const b = enemies.find(e => e.tk === 'boss');
      msgT = 0; msgTxt = ''; msgLast = ''; msgLastT = -1e9;
      const d0 = S.dia, g0 = S.gold;
      if (b) killEnemy(b);
      step(0.016);
      return { spawned: !!b, stage: S.stage, txt: msgTxt,
               dDia: S.dia - d0, dGold: S.gold - g0 };
    }, first);

    console.log('§2 최고 기록 갱신 클리어 — 다이아 0 · 골드만');
    const A = await clearRun(true);
    ok(A.spawned, '§2 보스가 실제로 스폰했다(하네스가 클리어를 태웠다)');
    eq('§2 스테이지 12 → 13', A.stage, 13);
    eq('§2 문구는 «STAGE CLEAR!» 뿐', A.txt, 'STAGE CLEAR!');
    eq('§2 Δ다이아 0', A.dDia, 0);
    ok(A.dGold > 0, '§2 Δ골드 > 0 (클리어 보너스 + 보스 골드)', A.dGold);

    console.log('§3 최고 기록 미갱신 클리어 — 마찬가지');
    const B = await clearRun(false);
    ok(B.spawned, '§3 보스가 실제로 스폰했다');
    eq('§3 문구는 «STAGE CLEAR!» 뿐', B.txt, 'STAGE CLEAR!');
    eq('§3 Δ다이아 0', B.dDia, 0);
    ok(B.dGold > 0, '§3 Δ골드 > 0', B.dGold);

    console.log('§4·§5 killEnemy 단독 — 보스도 일반 몹도 다이아 0');
    const K = await p.evaluate(() => {
      arena = null; raidOn = null; dunRun = null; promo = null;
      S.stage = 30; S.best = 30; S.bossFarm = false;
      spawnStage(); player.dead = 0; player.hp = stat.maxHp;
      enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
      step(0.016);
      for (let i = 0; i < 120 && !enemies.some(e => e.tk === 'boss'); i++) step(0.05);
      const b = enemies.find(e => e.tk === 'boss');
      const d0 = S.dia, g0 = S.gold;
      if (b) killEnemy(b);                                /* step 하지 않는다 — 킬 그 자체만 본다 */
      const boss = { dDia: S.dia - d0, dGold: S.gold - g0, had: !!b };
      /* 일반 몹 — 새 스테이지를 세우고 첫 몹 하나만 죽인다 */
      S.stage = 8; S.best = 8; S.bossFarm = false; spawnStage();
      for (let i = 0; i < 200 && !enemies.length; i++) step(0.05);
      const m = enemies.find(e => e.tk !== 'boss');
      const d1 = S.dia, g1 = S.gold;
      if (m) killEnemy(m);
      return { boss, mob: { dDia: S.dia - d1, dGold: S.gold - g1, had: !!m } };
    });
    ok(K.boss.had, '§4 보스 개체를 잡았다');
    eq('§4 보스 킬 Δ다이아 0', K.boss.dDia, 0);
    ok(K.boss.dGold > 0, '§4 보스 킬 Δ골드 > 0', K.boss.dGold);
    ok(K.mob.had, '§5 일반 몹 개체를 잡았다');
    eq('§5 일반 몹 킬 Δ다이아 0', K.mob.dDia, 0);
    ok(K.mob.dGold > 0, '§5 일반 몹 킬 Δ골드 > 0', K.mob.dGold);

    console.log('§6 회귀 — 다른 다이아 수급처는 살아 있다');
    const Q = await p.evaluate(() => {
      S.best = 5000;                                      /* QUESTS «스테이지 도달» 이 여러 단계 찬다 */
      const d0 = S.dia;
      claimAllQuests();
      return { dDia: S.dia - d0 };
    });
    ok(Q.dDia > 0, '§6 퀘스트 수령은 여전히 다이아를 준다(전면 차단이 아니다)', Q.dDia);

    console.log('§7 콘솔 에러');
    eq('§7 콘솔·런타임 에러 0', errs.length ? errs.join(' | ') : '0', '0');

    const n = pass + fail;
    console.log('\nVERIFY170 ' + pass + '/' + n + ' ' + (fail ? 'FAIL' : 'PASS'));
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.error('VERIFY170 ERROR ' + (e && e.message || e));
    process.exit(2);
  } finally { if (br) await br.close(); }
})();
