/* 작업 170 회귀 게이트 — 스테이지 클리어 보상은 «골드만» (2026-08-27, 저장소 주인 지시).
   실행: node tools/verify170.js   → 마지막 줄이 `VERIFY170 n/n PASS` 여야 한다.

   주인 지시: «스테이지 클리어했다고 다이아 보상 주면 안 됨 — 골드만 보상 줘야 함».
   162 이후 **보스 격파 = 스테이지 클리어** 이므로 폐지 대상은 두 자리다:
     ⓐ 클리어 블록의 «최고 기록 첫 돌파» 다이아  `const d = 35 + Math.floor(S.stage*3.6); S.dia += d`
        와 그 문구 조각 `msg += ' 다이아 +' + fmt(d)`   (index.html `if(stageWin){ … }`)
     ⓑ `killEnemy()` 의 보스 킬 다이아            `if(e.tk === 'boss' && S.stage >= S.best) S.dia += 250 + S.stage*25`

   ⚑ **2026-08-31, 작업 599 — 문구 표본을 살아 있는 자리로 갈아 끼웠다(제품 0줄 · 게이트 부패 수리).**
   170 이 세워질 때 클리어 문구는 클리어 블록 안의 `const msg = 'STAGE CLEAR!'` 리터럴이었다.
   **475**(주인 지시 «보스전들 전부 다 죽을 때 연출 있게 하고 나서 그 다음에 …»)가 격파와 클리어
   사이에 시퀀스(die 애니 → 문구 → 1초 홀드 → 후속)를 넣으면서 그 리터럴을 **공용 문구 표
   `BOSS_CLR_TXT.stage` 로 옮기고 클리어 블록에서는 지웠다** — 문구를 여기서 또 띄우면 이미 시작된
   다음 스테이지 위에 덮이기 때문이다. 그래서 **`verify475` [0-j] 는 `const msg = 'STAGE CLEAR!'` 가
   «없어야» 통과하고, 이 파일 §1 은 «있어야» 통과**하도록 정면으로 반대를 단언하고 있었다
   (333 이 `verify149` ↔ `verify295` 에서 겪은 것과 같은 꼴 — 나중 지시가 옳다).
   ⇒ §1 문구 항은 **표 선언 + 알림 자리**로, §2·§3 런타임 표본은 **시퀀스를 끝까지 굴려서** 다시 적었다.
   ⛔ 자리를 비우지 않았다 — 170 이 지키는 규칙(«클리어 보상은 골드뿐 · 문구에 다이아 꼬리표 금지»)은
      그대로 살아 있고, 부패한 것은 **어디를 보느냐** 뿐이었다. §R 이 그것을 못박는다.

   본다 (LESSONS 184-③ — «전수 조사의 결과물은 목록이 아니라 그 목록을 다시 만들어 주는 게이트»):
     §1 소스   폐지 두 자리가 **구간 단위**로 비었는가 — 리터럴 금지어가 아니라
               «클리어 블록 / killEnemy 본문 안에 `S.dia` 가산이 0건» 이라는 **패턴**으로 센다.
               (되살리는 사람이 상수를 바꿔 넣어도 걸린다.) 골드 보너스 줄은 그대로 살아 있어야 한다.
     §2 런타임 최고 기록 **갱신** 클리어 — Δ다이아 0 · Δ골드 > 0 · 스테이지 +1 · 문구 «STAGE CLEAR!».
     §3 런타임 최고 기록 **미갱신** 클리어 — 마찬가지로 Δ다이아 0 · Δ골드 > 0.
     §R 되돌림 시험 — 위 §1·§2 판정식이 «무엇을 지우면» 빨개지는지(무르게 푼 수리가 아님).
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
    /* 문구 — «STAGE CLEAR!» 뒤에 아무것도 안 붙는다.
       ⚑ 599 — 자리가 475 로 옮겨졌다: 리터럴은 **공용 표 `BOSS_CLR_TXT`** 에 있고, 화면에는
       시퀀스의 알림 시점(`showMsg(bossClear.txt)`)에서 **그대로** 나온다. 세 항이 한 줄기다 —
       ① 표에 그 문구가 있고 ② 알림이 표의 값을 **가공 없이** 쓰고 ③ 아무도 꼬리를 붙이지 않는다. */
    const txtDecl = (CODE.match(/const BOSS_CLR_TXT = \{[^}]*\}/) || [''])[0];
    ok(/stage\s*:\s*'STAGE CLEAR!'/.test(txtDecl),
       '§1 클리어 문구는 공용 표 `BOSS_CLR_TXT.stage` 의 \'STAGE CLEAR!\'', txtDecl || '표 선언 없음');
    ok(/showMsg\(bossClear\.txt\);/.test(CODE),
       '§1 그 문구는 시퀀스 알림에서 **표 값 그대로** 나온다(`showMsg(bossClear.txt)`)');
    eq('§1 문구에 꼬리를 붙이는 자리 0건 (`bossClear.txt +`)',
       (CODE.match(/bossClear\.txt\s*\+/g) || []).length, 0);
    eq('§1 문구 표에 «다이아» 낱말 0건', (txtDecl.match(/다이아/g) || []).length, 0);
    /* ⚑ 599 — 옛 `msg +=` 항은 클리어 블록에 `msg` 가 없어진 뒤로 **무엇을 지워도 초록**이었다
       (LESSONS 328-330 «329 가 통째로 사라져도 초록인 게이트»). 살아 있는 뜻으로 갈아 끼운다:
       475 규약 — 클리어 블록은 문구를 **띄우지 않는다**(띄우면 다음 스테이지 위에 덮인다). */
    eq('§1 클리어 블록은 문구를 띄우지 않는다 (`showMsg` 0건 — 475 규약)',
       ((clear || '').match(/showMsg\(/g) || []).length, 0);
    eq('§1 클리어 블록에 «다이아» 낱말 0건', ((clear || '').match(/다이아/g) || []).length, 0);
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
       («전장 비우고 step 한 틱» 은 162 이후 클리어를 못 태운다 — probe160 이 그렇게 썩어 있었다.)
       ⚑ 599 — 475 이후 클리어는 **격파 프레임의 일이 아니다**: 격파 → die 애니 → 문구 → 1초 홀드 →
       후속(`S.stage++`). 옛 하네스는 `killEnemy` 뒤 **한 프레임**만 굴려 시퀀스 한복판을 읽고 있었다
       (그래서 스테이지 12 · 문구 '' 로 빨갰다). 시퀀스를 **끝까지** 굴리고, 문구는 «알림이 뜬 그 순간»
       에 집어 온다 — 후속이 `spawnStage()` 로 «STAGE n» 을 덮는 것이 475 의 설계이기 때문이다.
       다이아·골드는 **시퀀스 전체 구간**의 차이로 잰다(격파 프레임만 보면 후속 지급을 놓친다). */
    const clearRun = (first) => p.evaluate((first) => {
      arena = null; raidOn = null; dunRun = null; promo = null; bossClear = null; bossIntro = null;
      S.stage = 12; S.best = first ? 12 : 999; S.bossFarm = false;
      spawnStage();
      player.dead = 0; player.hp = stat.maxHp;
      enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
      step(1 / 60);                                       /* → 보스 도전 */
      /* 457 등장 국면이 끝나야 보스를 때릴 수 있다 — 국면 중 격파는 이 게이트가 볼 자리가 아니다 */
      for (let i = 0; i < 600 && (!enemies.some(e => e.tk === 'boss') || bossIntro); i++) step(1 / 60);
      const b = enemies.find(e => e.tk === 'boss');
      msgT = 0; msgTxt = ''; msgLast = ''; msgLastT = -1e9;
      const d0 = S.dia, g0 = S.gold, st0 = S.stage;
      if (b) killEnemy(b);
      const atKill = { stage: S.stage, seq: !!bossClear, dDia: S.dia - d0 };
      let msgSeq = null, diaDuring = 0, done = false;
      for (let i = 0; i < 600 && !done; i++) {
        step(1 / 60);
        if (msgSeq === null && bossClear && bossClear.msg) msgSeq = msgTxt;   /* 알림이 뜬 그 프레임 */
        if (S.stage !== st0) done = true;                                    /* 후속이 돌았다 */
        else diaDuring = Math.max(diaDuring, Math.abs(S.dia - d0));
      }
      return { spawned: !!b, atKill, msgSeq, diaDuring, done,
               stage: S.stage, txt: msgTxt, dDia: S.dia - d0, dGold: S.gold - g0 };
    }, first);

    console.log('§2 최고 기록 갱신 클리어 — 다이아 0 · 골드만 (475 시퀀스를 끝까지 굴린다)');
    const A = await clearRun(true);
    ok(A.spawned, '§2 보스가 실제로 스폰했다(하네스가 클리어를 태웠다)');
    ok(A.atKill.seq, '§2 격파 프레임에 475 시퀀스가 선다(bossClear)');
    eq('§2 격파 프레임에는 아직 스테이지가 안 오른다 (475)', A.atKill.stage, 12);
    eq('§2 격파 프레임 Δ다이아 0', A.atKill.dDia, 0);
    ok(A.done, '§2 시퀀스가 후속까지 돌았다(홀드 끝)');
    eq('§2 시퀀스 알림 문구는 «STAGE CLEAR!» 뿐', A.msgSeq, 'STAGE CLEAR!');
    eq('§2 스테이지 12 → 13', A.stage, 13);
    eq('§2 후속 뒤 화면에 남는 문구는 다음 판의 «STAGE n»', A.txt, 'STAGE 13');
    eq('§2 시퀀스 도중 Δ다이아 0', A.diaDuring, 0);
    eq('§2 Δ다이아 0 (격파 → 후속 전 구간)', A.dDia, 0);
    ok(A.dGold > 0, '§2 Δ골드 > 0 (클리어 보너스 + 보스 골드)', A.dGold);

    console.log('§3 최고 기록 미갱신 클리어 — 마찬가지');
    const B = await clearRun(false);
    ok(B.spawned, '§3 보스가 실제로 스폰했다');
    ok(B.done, '§3 시퀀스가 후속까지 돌았다');
    eq('§3 시퀀스 알림 문구는 «STAGE CLEAR!» 뿐', B.msgSeq, 'STAGE CLEAR!');
    eq('§3 시퀀스 도중 Δ다이아 0', B.diaDuring, 0);
    eq('§3 Δ다이아 0 (격파 → 후속 전 구간)', B.dDia, 0);
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

    /* ── §R 되돌림 시험 ─────────────────────────────────────────
       ⚑ 599 — «갈아 끼운 자리가 무르지 않다» 를 못박는다(334 처방). 새 §1 판정식 넷을 **깨는 사본**에
       각각 다시 걸어 빨개지는지 보고, 런타임 쪽은 «오래 기다려서 초록» 이 아니라는 것을
       **한 프레임만 굴린 표본이 빨간 것**으로 보인다(= 옛 하네스가 빨갰던 바로 그 자리). */
    console.log('§R 되돌림 시험 — 지우면 빨개진다');
    const mut = (from, to) => CODE.replace(from, to);
    const decl = s => (s.match(/const BOSS_CLR_TXT = \{[^}]*\}/) || [''])[0];
    eq('§R-a 표에서 문구를 지우면 §1 문구 항이 거짓',
       /stage\s*:\s*'STAGE CLEAR!'/.test(decl(mut("stage:'STAGE CLEAR!'", "stage:''"))), false);
    eq('§R-b 알림에서 표를 안 읽으면 §1 알림 항이 거짓',
       /showMsg\(bossClear\.txt\);/.test(mut('showMsg(bossClear.txt);', "showMsg('STAGE CLEAR!');")), false);
    eq('§R-c 클리어 블록에 다이아를 되살리면 §1-ⓐ 가 1건',
       ((block(mut('S.gold += bonusG; goldWin += bonusG;',
                   'S.dia += 1; S.gold += bonusG; goldWin += bonusG;'),
               'if(stageWin){') || '').match(/S\.dia\s*\+=/g) || []).length, 1);
    eq('§R-d 클리어 블록이 문구를 다시 띄우면 §1 475 규약 항이 1건',
       ((block(mut('spawnStage();\n      uiDirty = true;',
                   "showMsg('STAGE CLEAR!');\n      spawnStage();\n      uiDirty = true;"),
               'if(stageWin){') || '').match(/showMsg\(/g) || []).length, 1);
    const R = await p.evaluate(() => {
      arena = null; raidOn = null; dunRun = null; promo = null; bossClear = null; bossIntro = null;
      S.stage = 12; S.best = 12; S.bossFarm = false;
      spawnStage(); player.dead = 0; player.hp = stat.maxHp;
      enemies.length = 0; spawnQ.length = 0; killed = ENEMY_COUNT;
      step(1 / 60);
      for (let i = 0; i < 600 && (!enemies.some(e => e.tk === 'boss') || bossIntro); i++) step(1 / 60);
      const b = enemies.find(e => e.tk === 'boss');
      msgT = 0; msgTxt = ''; msgLast = ''; msgLastT = -1e9;
      if (b) killEnemy(b);
      step(1 / 60);                                        /* 옛 하네스가 굴린 딱 한 프레임 */
      return { stage: S.stage, txt: msgTxt, seq: !!bossClear };
    });
    eq('§R-e 격파 뒤 한 프레임만 굴리면 스테이지는 그대로 12 (시퀀스가 실재한다)', R.stage, 12);
    eq('§R-e 그 프레임에는 클리어 문구도 아직 없다', R.txt, '');
    ok(R.seq, '§R-e 그때 시퀀스는 진행 중이다 — «기다림» 이 아니라 상태가 있다');

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
