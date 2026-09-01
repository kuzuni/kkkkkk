#!/usr/bin/env node
/* 504 검증 — 스킬 «발수(hits)» 선언이 실제 타격수와 맞는가 (T1 «버그(자 문제)»)
 *
 *   node tools/verify504.js
 *
 * 결함: 484 는 `m × hits / cd` 를 27종 전부 같은 값으로 맞췄지만 그 식의 `hits` 는 손으로 적은
 * 선언이었고, 뜻이 표 안에서 **둘로 갈려** 있었다 — 다발형은 «쏜 발수»(전 표적 합계), 장판·빔·
 * 폭발형은 «**한 적이** 받는 총 타격량». 뒤쪽은 여러 적을 동시에 때리는 것을 한 번도 안 세서
 * nova 가 실제의 **1/14** 로 잡혔고, 그래서 «등급 안 DPS 동일» 이 실전에서는 27종 **16.6배**
 * (실제 DPS 1.57~26.11)로 깨져 있었다.
 *
 *   [A] 모델 입구 — 발수를 읽는 문이 `skillHits()` 하나뿐이다(사슬 사본 0건 · 선언 빈칸 0건)
 *   [B] 뜻 — 여러 적에 닿는 구조(관통·링·장판·빔·범위)는 `hits` > 1. «한 적이 받는 수» 로 되돌리면 빨개진다
 *   [C] 실측 대조 — 눈금 504-RUL(실제 판 K회 평균)로 재서 선언과 맞는지 본다
 *   [D] 결과 — 등급 안 «실제» DPS 편차가 선언 편차와 같은 자리로 내려왔다
 *   [R] 되돌림 시험 — 한 종의 hits 를 옛 «한 적» 값으로 되돌리면 [C] 가 빨개진다
 *   [Z] 콘솔 에러 0건
 *
 * ⚠ **허용 오차의 출처(394 규칙 — 눈금을 먼저 적는다).** 이 축은 ±15% 로 못 잡는다.
 *   자유 판 한 번의 흔들림이 23~77% 이고(예비 실측, review §2 표), K회 평균의 흔들림도
 *   개체수를 고정한 뒤에도 `probe504` [D2] 기준 최악 ±22% 다. 그래서 [C] 의 허용 오차는
 *   **바라는 값이 아니라 잰 값**에서 왔다: 종마다 «그 종의 K회 폭 ÷ 2√K» 와 바닥값 `TOL_FLOOR`
 *   중 큰 쪽을 쓴다. 이렇게 해도 504 가 고친 결함(122~1212% 이탈)은 빠짐없이 걸린다 — [R] 이
 *   그것을 못박는다.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 없음'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const K = 6;             /* [C] 반복 수 — 평균의 흔들림이 √K 로 좁혀진다.
                            ⚠ **프로브와 같은 K 여야 한다.** 선언값은 `probe504` 가 K=6 으로 잰
                            평균이라, 게이트가 더 적게 재면 두 평균이 서로의 오차 안에서 갈린다
                            (K=4 로 두었더니 poison 이 29.4 ↔ 41.1 로 허용 오차 턱에 걸렸다). */
const SEC = 25;          /* 한 번의 길이(초). K × SEC × 표본 수가 이 게이트의 실행 시간이다 */
const POP = 23;          /* 눈금이 고정하는 개체수 — `probe504` [A] 의 실제 판 관측 중앙값 */
const TOL_FLOOR = 0.40;  /* 허용 오차 바닥 — 흔들림이 작게 나온 종도 이 아래로는 안 조인다.
                            0.40 = `probe504` [D] 가 K=6 에서 잰 «평균의 흔들림» 최악 ±30% 에
                            여유 1/3 을 얹은 값. 바라는 값이 아니라 **잰 값**에서 왔다. */
/* [C] 표본 — 504 가 실제로 고친 자리(장판·빔·폭발·관통) + 안 고친 대조군(고정 표적형).
   27종 전부를 매번 재면 이 게이트 하나가 20분을 먹는다. 고른 표본이 «두 뜻» 을 다 덮는다. */
const PROBE = ['slash', 'bolt', 'drain',              /* 대조군 — 504 가 안 건드린 종 */
               'nova', 'holy', 'laser', 'meteor',     /* 폭발·빔 — 이탈이 가장 컸던 자리 */
               'poison', 'flask',                     /* 장판 */
               'lance', 'boom'];                      /* 관통·폭발 */
/* [R] 되돌림 재료 — 504 이전의 «한 적이 받는 수» 선언. 이 표는 옛 값이므로 갱신하지 마라.
   ⚠ **`lance` 는 일부러 뺐다.** 옛 3 과 새 4.45 의 거리가 [C] 의 허용 오차(±40%) 안이라
   «되돌리면 잡힌다» 를 이 자로는 **증명할 수 없다**(실행마다 37~52% 로 걸쳤다 안 걸렸다 한다).
   못 잡는 것을 잡는다고 적으면 그게 헛초록이다 — 잡을 수 있는 7종만 적는다. lance 의 선언은
   [C] 가 «지금 값이 맞는가» 로 지키고, «옛 값으로 못 돌아간다» 는 여기서 주장하지 않는다. */
const OLD_HITS = { nova: 1, holy: 1, laser: 1.7, meteor: 1, poison: 5, flask: 4.5, boom: 1 };

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof skillHits === 'function'
    && typeof step === 'function');
  await page.waitForTimeout(500);

  /* ── [A] 모델 입구가 하나인가 ───────────────────────────── */
  const A = await page.evaluate(() => {
    const src = Object.getOwnPropertyDescriptor(stat, 'dps').get.toString();
    return {
      usesFn: /skillHits\s*\(/.test(src),
      noChain: !/shuri'\s*\?/.test(src) && !/bolt'\s*\?/.test(src) && !/multi'\s*\?/.test(src),
      noHard3: !/:\s*dmg\s*\*\s*3\b/.test(src),
      blanks: SKILLS.filter(s => typeof s.hits !== 'number' || !(s.hits > 0)).map(s => s.id),
      n: SKILLS.length,
      /* multi 만은 Lv 로 자란다 — 그 예외가 살아 있는지도 여기서 본다 */
      multiBase: skillHits(SK.multi),
      multiDecl: SK.multi.hits
    };
  });
  ok(A.usesFn && A.noChain, 'A1 발수를 읽는 문이 `skillHits()` 하나뿐 — 베껴 적은 삼항 사슬 0건');
  ok(A.noHard3, 'A2 지속형(cd 0)의 «× 3» 손 상수가 사라졌다 — 초당 타격도 선언에서 온다');
  ok(A.blanks.length === 0 && A.n === 27, 'A3 27종 전부 `hits` 선언이 있다(빈칸이면 모델이 조용히 1 로 떨어진다)',
     A.blanks.join(',') || '빈칸 0');
  ok(A.multiBase === A.multiDecl, 'A4 `multi` 의 Lv 성장 예외가 살아 있다(Lv1 = 선언값)',
     'Lv1 ' + A.multiBase + ' = 선언 ' + A.multiDecl);

  /* ── [B] 뜻 — 총 타격 ≥ 발사체 수 ──────────────────────── */
  /* ⚠ `hits ≥ cnt` 는 **틀린 자**다 — 링형은 빈 방향의 발이 아무도 못 맞혀 `hits < cnt` 가
     정상이다(gale 12발 → 9.92). 볼 것은 «여러 적에 닿는 구조인데 1 이하로 적혀 있는가» 다. */
  const B = await page.evaluate(() => SKILLS
    .filter(s => (s.pierce >= 2) || s.ring || s.zk || s.dur || s.r !== undefined)
    .filter(s => (s.hits || 0) <= 1).map(s => s.id + ' hits ' + s.hits));
  ok(B.length === 0, 'B1 여러 적에 닿는 구조(pierce≥2·ring·장판·빔·범위)는 `hits` > 1 — «한 적» 규약 잔재 0건',
     B.join(' / ') || '위반 0');

  /* ── [C] 눈금 504-RUL 로 실측 대조 ─────────────────────── */
  const C = await page.evaluate(({ ids, K, SEC, POP }) => {
    const rawCast = window.castSkill, rawHit = window.hitEnemy;
    let ownSave;
    /* 눈금 504-RUL — 스테이지 20 자유 전투(몹이 **실제로 죽는** 판) + **개체수 POP 고정**,
       K회 × SEC초. 세 조건이 다 필요하다:
       ⚠ 적을 불사로 만들면 안 된다 — 안 죽는 적은 플레이어에게 뭉쳐서 광역기를 최대 14배
         부풀린다(`probe504` [C]). 484 [E] 가 그 하네스였고, 504 등재문의 두 숫자가 그 산물이다.
       ⚠ 개체수를 안 잡으면 안 된다 — 타격수는 «서 있는 적의 수» 에 거의 비례하고(poison:
         평균 13.8 / 27.4 / 52 마리에서 14.75 / 49.1 / 96.5), 레벨 0 스킬 아래서 그 수가 안 갇힌다.
         고정하지 않으면 같은 종이 실행마다 2배씩 갈린다(504 1회차에 실제로 그랬다). */
    const one = (id) => {
      /* ⚑ 판을 **통째로** 되돌린다. 아래 넷 중 하나라도 남으면 «몇 번째로 잰 종인가» 가 값을
         바꾼다 — 504 1회차에 poison 이 프로브(15번째)와 게이트(8번째)에서 29.4 ↔ 42.1 로
         갈렸고, 뿌리는 `killed`(누적 처치 → 보스 소환 눈금)와 죽어 있던 플레이어였다.
         ⚑ 620 — 그 «되돌린다» 를 **손으로 적은 목록**에서 제품의 «새 판» 입구 `spawnStage()`
         하나로 옮겼다. 손목록은 504 를 쓸 당시의 세계에 굳어 있어서, 그 뒤 들어온 보스전 상태
         (457 `bossIntro` · 459 `cdArm` · 162 `bossOn`/`bossT` · 475 `bossClear`)를 하나도
         안 되돌렸다 — 7번째 판에서 `killed` 가 눈금에 차 보스가 서고 **등장 국면이 열린 채**
         판이 끝나면, 다음 판 입구의 `enemies.length = 0` 이 국면 중인 보스를 «격파가 아닌
         경로로» 지운다. 그러면 23372 의 자기치유 항 `(bossT < BOSS_SEC || enemies.some(boss))`
         이 **둘 다 거짓**이라(국면이 `!bossIntro` 로 시계를 한 프레임도 안 흘렸다) 시계가
         영영 안 흘러 `bossMode()` 가 `stage` 로 굳고, 473 가드 `cdArm && battleBusy()` 가
         22708 의 스킬 루프를 **그 뒤 모든 판에서** 막았다(`probe620` [2]·[3]·[5]).
         ⚠ 그래서 여기 «보스전 상태를 끄는 줄» 을 새로 적지 마라 — 같은 목록이 또 뒤처진다.
           `spawnStage()` 는 `bossOn`·`bossT`·`stageWin`·`S.bossFarm` 을 스스로 끄고,
           `bossIntro`·`bossClear` 는 `bossMode()` 가 빈 문자열이 되는 순간 22542·23339 가
           자기 자리에서 닫는다. 굳은 판이 다시 생기면 아래 [C0] 이 이름으로 잡는다. */
      S.stage = 20;
      spawnStage();
      /* 눈금 쪽 조건은 그 뒤에 얹는다 — `spawnStage()` 가 깐 50마리 파도(`queueMobs`)를 비워
         **개체수도 종도 아래 채움 루프(zombie 고정)가 혼자 정한다**. 안 비우면 스테이지 20 의
         고블린·다크가 섞여 «몇 번째 판인가» 가 다시 값을 바꾼다(위 ⚠ 두 줄과 같은 이유). */
      enemies.length = 0; spawnQ.length = 0;
      player.vx = 0; player.vy = 0;
      for (const k of Object.keys(skillCd)) delete skillCd[k];
      /* ⚑ 보유 상태를 **격리**한다. `S.own` 에 앞서 시험한 스킬이 쌓이면 `bonus()` 의 보유 효과가
         커져 플레이어가 점점 세지고, 적이 빨리 죽어 장판·범위형의 타격수가 순서에 따라 갈린다
         (504 1회차에 poison 이 11.1 ↔ 18.1 로 갈린 원인이 정확히 이것이다). */
      ownSave = S.own; S.own = { [id]: { l: 0 } }; S.eqSkill = [id]; markDirty();
      let hits = 0, casts = 0, shut = 0;
      window.castSkill = function (sk) { const r = rawCast.apply(this, arguments); if (r && sk.id === id) casts++; return r; };
      window.hitEnemy = function () { hits++; return rawHit.apply(this, arguments); };
      for (let f = 0; f < 60 * SEC; f++) {
        step(1 / 60);
        while (enemies.length > POP) {           /* 넘치면 **가장 먼** 것부터 — 가까운 것을 지우면 교전 밀도가 꺼진다 */
          let wi = 0, wd = -1;
          for (let i = 0; i < enemies.length; i++) {
            const d = (enemies[i].x - player.x) ** 2 + (enemies[i].y - player.y) ** 2;
            if (d > wd) { wd = d; wi = i; }
          }
          enemies.splice(wi, 1);
        }
        while (enemies.length < POP) { const b = enemies.length; makeEnemy('zombie'); if (enemies.length === b) break; }
        /* ⚑ 620 — 눈금의 이름이 «자유 전투» 다. 개체수를 고정해 두면 25초 안에 처치가
           `ENEMY_COUNT` 를 넘어(162 의 50킬 자동 진입) 판이 도중에 **보스전으로 바뀐다** —
           그때 473 가드가 스킬 루프를 닫으므로 재는 창이 종마다 다른 길이로 잘린다.
           `killed` 를 0 으로 눌러 두는 것은 개체수를 POP 으로 눌러 두는 것과 **같은 조건**이고,
           위 초기화 주석이 이미 `killed` 를 «보스 소환 눈금» 이라고 부른 그 자리다.
           ⚠ 이것을 빼면 [C0] 이 곧바로 빨개진다(그것이 [R3] 되돌림 시험이다). */
        killed = 0;
        if (preFight() || bossClear) shut++;
      }
      window.castSkill = rawCast; window.hitEnemy = rawHit;
      S.own = ownSave; markDirty();
      return { per: casts ? hits / casts : 0, hps: hits / SEC, casts, shut };
    };
    const out = [];
    for (const id of ids) {
      const s = SK[id], runs = [];
      for (let k = 0; k < K; k++) runs.push(one(id));
      const v = runs.map(r => s.cd > 0 ? r.per : r.hps);
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      const spread = mean ? (Math.max(...v) - Math.min(...v)) / mean : 0;
      out.push({ id, cd: s.cd, decl: skillHits(s), mean: +mean.toFixed(3),
                 each: v.map(x => +x.toFixed(2)), spread: +spread.toFixed(3),
                 casts: Math.round(runs.reduce((a, r) => a + r.casts, 0) / K),
                 shut: runs.reduce((a, r) => a + r.shut, 0) });
    }
    S.eqSkill = ['slash']; markDirty();
    return out;
  }, { ids: PROBE, K, SEC, POP });
  console.log('     ' + 'id'.padEnd(8) + '선언'.padEnd(9) + '실측(K=' + K + ')'.padEnd(11)
    + '이탈'.padEnd(9) + '허용'.padEnd(8) + 'K회 값');
  const rows = C.map(x => {
    const tol = Math.max(TOL_FLOOR, x.spread / (2 * Math.sqrt(K)));
    const off = x.decl ? Math.abs(x.mean / x.decl - 1) : 1;
    return Object.assign({}, x, { tol: +tol.toFixed(3), off: +off.toFixed(3) });
  });
  rows.forEach(x => console.log('     ' + x.id.padEnd(8) + String(x.decl).padEnd(9)
    + String(x.mean).padEnd(11) + ((x.off * 100).toFixed(0) + '%').padEnd(9)
    + ('±' + (x.tol * 100).toFixed(0) + '%').padEnd(8) + x.each.join('/')));
  /* ⚑ 620 [C0] «전제» — [C1] 보다 **먼저** 묻는다. 판이 22708 의 가드가 닫힌 채로 시작하면
     그 판은 «약한 종» 이 아니라 «잰 적이 없는 종» 이고, 그때 [C1]·[C2] 가 말하는 «미발동» 은
     스킬이 아니라 하네스를 가리킨다. 이 항이 없으면 굳은 판이 다시 생겨도 이유가 표에 안 남는다
     (315·333·341 이 «자리를 비우지 말고 전제를 세워라» 로 남긴 자리와 같은 꼴). */
  ok(rows.every(x => x.shut === 0), 'C0 전제 — 재는 동안 22708 가드가 **한 프레임도** 안 닫혔다(473 `preFight` · 475 `bossClear`)',
     rows.filter(x => x.shut).map(x => x.id + ' ' + x.shut + '프레임').join(' / ')
     || '닫힌 프레임 0 / ' + (PROBE.length * K * SEC * 60) + '프레임');
  ok(rows.every(x => x.casts > 0), 'C1 표본 ' + PROBE.length + '종이 실제 전투에서 발동했다',
     rows.filter(x => !x.casts).map(x => x.id).join(',') || '미발동 0종');
  const cBad = rows.filter(x => x.off > x.tol);
  ok(cBad.length === 0, 'C2 선언 ↔ 실측(504-RUL) — 종마다 «잰» 허용 오차 안',
     cBad.map(x => x.id + ' ' + (x.off * 100).toFixed(0) + '% > ' + (x.tol * 100).toFixed(0) + '%').join(' / ')
     || '최악 ' + rows.reduce((a, b) => a.off > b.off ? a : b).id + ' '
        + (Math.max(...rows.map(x => x.off)) * 100).toFixed(0) + '%');

  /* ── [D] 결과 — 등급 안 «실제» DPS 가 평탄해졌나 ────────── */
  const D = await page.evaluate(measured => {
    const rows = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (t.length < 2) return;
      const d = t.map(s => s.cd > 0 ? s.m * skillHits(s) / s.cd : s.m * skillHits(s));
      rows.push({ g, ratio: Math.max(...d) / Math.min(...d) });
    });
    /* 실측이 있는 종만 «실제 DPS»(= m × 실측발수 / cd)로 다시 재서 표본 안 편차를 본다 */
    const r = measured.map(x => { const s = SK[x.id]; return s.cd > 0 ? s.m * x.mean / s.cd : s.m * x.mean; });
    return { rows, realMin: Math.min(...r), realMax: Math.max(...r), realRatio: Math.max(...r) / Math.min(...r) };
  }, rows.map(x => ({ id: x.id, mean: x.mean })));
  D.rows.forEach(r => console.log('     g' + r.g + ' 선언 기준 등급 안 최대/최소 ' + r.ratio.toFixed(4)));
  ok(D.rows.every(r => r.ratio <= 1.03), 'D1 선언 기준 등급 안 DPS 동일(484 의 약속)이 유지된다',
     '최악 ' + Math.max(...D.rows.map(r => r.ratio)).toFixed(4));
  /* 504 전에는 27종의 «실제» DPS 가 1.57~26.11 = 16.6배로 벌어져 있었다(probe504 [D]·[E]).
     선언이 실측을 따라오면 이 비는 «선언 오차» 만큼으로 줄어든다. */
  ok(D.realRatio <= 3.0, 'D2 표본의 «실제» DPS 편차 — 504 전 16.6배(27종 1.57~26.11)에서 내려왔다',
     D.realMin.toFixed(2) + '~' + D.realMax.toFixed(2) + ' = ' + D.realRatio.toFixed(2) + '배');

  /* ── [R] 되돌림 시험 ────────────────────────────────────── */
  /* 무르게 푼 수리가 아님을 못박는다 — 옛 «한 적이 받는 수» 선언으로 되돌리면 [C] 의 그 종이
     자기 허용 오차를 반드시 넘는다. 실측은 위에서 이미 잰 값을 재사용한다(다시 안 굴린다). */
  const R = rows.filter(x => x.id in OLD_HITS).map(x => {
    const off = Math.abs(x.mean / OLD_HITS[x.id] - 1);
    return { id: x.id, old: OLD_HITS[x.id], now: x.decl, mean: x.mean, tol: x.tol, off, caught: off > x.tol };
  });
  R.forEach(x => console.log('     ' + x.id.padEnd(8) + '옛 ' + String(x.old).padEnd(6)
    + '→ 이탈 ' + ((x.off * 100).toFixed(0) + '%').padEnd(8)
    + '허용 ±' + (x.tol * 100).toFixed(0) + '%   ' + (x.caught ? '걸린다' : '못 잡는다')));
  ok(R.length === Object.keys(OLD_HITS).length && R.every(x => x.caught),
     'R1 옛 «한 적이 받는 수» 선언으로 되돌리면 [C] 가 그 종을 전부 잡는다',
     R.filter(x => !x.caught).map(x => x.id).join(',') || R.length + '종 전부 걸린다');
  const R2 = await page.evaluate(() => {
    /* 두 번째 되돌림 — `skillHits()` 를 옛 사슬(장판형을 1 로 떨어뜨리던 `s.hits || 1` 에
       cd 0 은 3)로 되돌린 사본을 만들어 등급 안 편차를 다시 잰다. */
    const oldH = s => s.id === 'shuri' ? 8 : s.id === 'bolt' ? 3 : s.id === 'multi' ? 3 : 1;
    const out = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (t.length < 2) return;
      const d = t.map(s => s.cd > 0 ? s.m * oldH(s) / s.cd : s.m * 3);
      out.push(Math.max(...d) / Math.min(...d));
    });
    return Math.max(...out);
  });
  ok(R2 > 1.03, 'R2 발수 선언을 통째로 무시하는 옛 모델로 되돌리면 D1 이 빨개진다',
     '되돌림 ' + R2.toFixed(3) + ' > 1.03');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
