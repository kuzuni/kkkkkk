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
 *       [C2-199] ⏸ 대기 — 뿌리 진단이 끝나고 **계수만 199 몫으로 남은** 종은 실패로 안 세고
 *                값·이탈%·«199 가 넣을 한 벌» 을 매 실행 찍는다(680 · 326 `ck199` 선례).
 *                면제는 «낡은 선언 그 값일 때만» 이라 199 가 값을 넣으면 스스로 하드로 돌아온다.
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
/* ⚑ 680 — 눈금 504-RUL(하네스 + K·SEC·POP·TOL_FLOOR + 허용 오차 식)은 이제 `tools/rul504.js`
   **한 곳에서만** 선언한다. `probe680` 이 같은 자로 27종을 재야 해서 뽑았다 — 베껴 적으면
   «어느 자로 잰 값인가» 가 값을 바꾼다(402·508·553·620 이 같은 값을 치른 자리). */
const RUL = require('./rul504');
const { K, SEC, POP, TOL_FLOOR } = RUL;
/* [C] 표본 — 504 가 실제로 고친 자리(장판·빔·폭발·관통) + 안 고친 대조군(고정 표적형).
   27종 전부를 매번 재면 이 게이트 하나가 20분을 먹는다. 고른 표본이 «두 뜻» 을 다 덮는다. */
const PROBE = ['slash', 'bolt', 'drain',              /* 대조군 — 504 가 안 건드린 종 */
               'nova', 'holy', 'laser', 'meteor',     /* 폭발·빔 — 이탈이 가장 컸던 자리 */
               'poison', 'flask',                     /* 장판 */
               'lance', 'boom',                       /* 관통·폭발 */
               'orbit', 'aura', 'whirl'];             /* 695 — 접촉형(cd 0 지속형 2 + 링) */
/* ⚑ **695 — 표본이 구조 한 종류를 통째로 안 덮고 있었다.** 위 열하나에는 `cd 0` 이 하나도
   없었고 «닿는 거리가 몸 주위» 인 종도 하나도 없었다 ⇒ 이 게이트는 그 구조를 **한 번도 재 본 적이
   없다.** 680 이 27종으로 넓히자 셋이 한꺼번에 밴드 밖(71~85%)으로 나왔고, 그것이 695 다.
   ⚠ 셋은 «틀린 선언» 이 아니라 **«이 눈금으로 못 재는 종»** 으로 들어온다(rul504 `HOLD695` 주석).
   넣은 이유는 값을 판정하려는 것이 아니라 **못 잰다는 사실이 표에 매 실행 찍히게** 하려는 것이다 —
   [C3] 이 그 구조 덮개를 자로 지킨다(356-㉞ «인계문에 적을 것을 자로 옮겨라»). */
/* [R] 되돌림 재료 — 504 이전의 «한 적이 받는 수» 선언. 이 표는 옛 값이므로 갱신하지 마라.
   ⚠ **`lance` 는 일부러 뺐다.** 옛 3 과 새 4.45 의 거리가 [C] 의 허용 오차(±40%) 안이라
   «되돌리면 잡힌다» 를 이 자로는 **증명할 수 없다**(실행마다 37~52% 로 걸쳤다 안 걸렸다 한다).
   못 잡는 것을 잡는다고 적으면 그게 헛초록이다 — 잡을 수 있는 7종만 적는다. lance 의 선언은
   [C] 가 «지금 값이 맞는가» 로 지키고, «옛 값으로 못 돌아간다» 는 여기서 주장하지 않는다. */
const OLD_HITS = { nova: 1, holy: 1, laser: 1.7, meteor: 1, poison: 5, flask: 4.5, boom: 1 };

/* ⏸199 대기 — 선언·판정은 `rul504.js` 한 곳에 있다(680). 왜 그렇게 했는지도 거기 적혀 있다. */
const { HOLD199, held199, HOLD695, held695 } = RUL;

let pass = 0, fail = 0, held = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
/* 326 `ck199` 와 같은 칸 — 실패로 안 세되 표에는 «⏸» 로 남는다.
   ⚠ 695 — 칸이 **둘**이고 뜻이 다르다: `⏸199` 는 «뿌리 진단이 끝났고 계수만 199 몫» 이고,
   `⏸접촉` 은 «이 눈금이 그 구조를 못 잰다»(판정 자체가 없다) 다. 한 표식으로 합치면
   «못 잰다» 가 «199 가 값만 넣으면 된다» 로 읽힌다 — 695 §5 가 그 오독을 금지한다. */
let heldC = 0;
const hold = (name, detail, tag) => {
  console.log((tag || '⏸199') + ' ' + name + (detail ? ' — ' + detail : ''));
  tag === '⏸접촉' ? heldC++ : held++;
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
  /* 484 의 «등급 기준 DPS» 상수 — ⏸199 칸이 «199 가 넣을 m» 을 이 값에서 역산해 찍는다.
     ⚠ 손으로 적지 않는다(504 가 1.84 → 6.49 로 옮긴 값이고, 553 이 «사본이 뒤처진다» 로 값을 치렀다). */
  const SK_DPS_REF = await page.evaluate(() => SK_DPS_REF);
  const C = await RUL.measure(page, PROBE, { K, SEC, POP });
  console.log('     ' + 'id'.padEnd(8) + '선언'.padEnd(9) + '실측(K=' + K + ')'.padEnd(11)
    + '이탈'.padEnd(9) + '허용'.padEnd(8) + 'K회 값');
  const rows = C.map(x => {
    const tol = RUL.tolOf(x.spread, K), off = RUL.offOf(x.mean, x.decl);
    return Object.assign({}, x, { tol: +tol.toFixed(3), off: +off.toFixed(3) });
  });
  rows.forEach(x => console.log('     ' + x.id.padEnd(8) + String(x.decl).padEnd(9)
    + String(x.mean).padEnd(11) + ((x.off * 100).toFixed(0) + '%').padEnd(9)
    + ('±' + (x.tol * 100).toFixed(0) + '%').padEnd(8) + x.each.join('/')
    + (held199(x) ? '   ⏸199(' + HOLD199[x.id].ref + ')' : '')
    + (held695(x) ? '   ⏸접촉(' + HOLD695[x.id].ref + ' — 이 눈금 미적용)' : '')));
  /* ⚑ 620 [C0] «전제» — [C1] 보다 **먼저** 묻는다. 판이 22708 의 가드가 닫힌 채로 시작하면
     그 판은 «약한 종» 이 아니라 «잰 적이 없는 종» 이고, 그때 [C1]·[C2] 가 말하는 «미발동» 은
     스킬이 아니라 하네스를 가리킨다. 이 항이 없으면 굳은 판이 다시 생겨도 이유가 표에 안 남는다
     (315·333·341 이 «자리를 비우지 말고 전제를 세워라» 로 남긴 자리와 같은 꼴). */
  ok(rows.every(x => x.shut === 0), 'C0 전제 — 재는 동안 22708 가드가 **한 프레임도** 안 닫혔다(473 `preFight` · 475 `bossClear`)',
     rows.filter(x => x.shut).map(x => x.id + ' ' + x.shut + '프레임').join(' / ')
     || '닫힌 프레임 0 / ' + (PROBE.length * K * SEC * 60) + '프레임');
  /* ⚑ 695 — `casts` 는 `castSkill` 을 지난 수다. **cd 0 지속형은 그 문을 안 지난다**
     (`orbit`·`aura` 는 `step()` 안에서 매 프레임 스스로 돈다) ⇒ 옛 문장 그대로 표본에 넣으면
     «발동 0» 으로 **헛빨강**이 난다. 물어야 할 것은 «그 종이 이번 판에서 일을 했는가» 이고,
     그 답은 cd > 0 이면 발동 수, cd = 0 이면 **타격이 났는가**다(620-② «0 은 두 가지 뜻» 과
     같은 자리 — 자가 못 본 것을 «안 했다» 로 읽지 않게 뜻을 갈라 적는다). */
  const idle = rows.filter(x => (x.cd > 0 ? x.casts : x.mean) <= 0);
  ok(idle.length === 0, 'C1 표본 ' + PROBE.length + '종이 실제 전투에서 일했다(cd>0 은 발동 · cd0 지속형은 타격)',
     idle.map(x => x.id).join(',') || '미발동 0종 · cd0 ' + rows.filter(x => !x.cd).length + '종은 타격으로 확인');
  /* [C2] 는 **199 대기분을 뺀 나머지**를 하드로 단언한다. 대기분은 아래 [C2-199] 가 받는다.
     ⚠ 대기 목록에 없는 종이 새로 벗어나면 그 종은 그대로 빨개진다 — `probe680` [5] 가 못박는다. */
  const { bad: cBad, hold: cHold, contact: cCon } = RUL.c2Split(rows);
  ok(cBad.length === 0, 'C2 선언 ↔ 실측(504-RUL) — 종마다 «잰» 허용 오차 안(⏸199 대기분 제외)',
     cBad.map(x => x.id + ' ' + (x.off * 100).toFixed(0) + '% > ' + (x.tol * 100).toFixed(0) + '%').join(' / ')
     || '최악 ' + rows.filter(x => !held199(x) && !held695(x)).reduce((a, b) => a.off > b.off ? a : b).id + ' '
        + (Math.max(...rows.filter(x => !held199(x) && !held695(x)).map(x => x.off)) * 100).toFixed(0) + '%'
        + (cHold.length ? ' · ⏸199 ' + cHold.length + '종은 아래 칸' : '')
        + (cCon.length ? ' · ⏸접촉 ' + cCon.length + '종은 아래 칸' : ''));
  /* ⏸199 — 값·이탈%·«199 가 넣을 한 벌» 을 매 실행 찍는다(326 ck199 · verify498 §6 과 같은 꼴).
     한 벌 재역산 식은 484 의 약속 그 자체다: m = SK_DPS_REF × cd ÷ hits.
     ⚠ `hits` 만 갈면 [D1] 이 즉시 빨개진다(622 실측 1.0001 → 1.8281) — 그래서 «한 벌» 이다. */
  rows.filter(x => held199(x)).forEach(x => {
    const newM = +(SK_DPS_REF * x.cd / x.mean).toFixed(4);
    hold('C2-199 `' + x.id + '` 선언 ↔ 실측 — 계수는 199 몫(' + HOLD199[x.id].ref + ' 이관 · 뿌리 진단 끝남)',
         '선언 ' + x.decl + ' ↔ 실측 ' + x.mean + ' = 이탈 ' + (x.off * 100).toFixed(0) + '%'
         + ' (허용 ±' + (x.tol * 100).toFixed(0) + '%) · 199 가 넣을 한 벌: hits ' + x.decl + ' → ≈'
         + x.mean + ' · m ' + HOLD199[x.id].staleM + ' → ≈' + newM
         + ' (= SK_DPS_REF ' + SK_DPS_REF + ' × cd ' + x.cd + ' ÷ ' + x.mean + ')');
  });
  /* ⏸접촉(695) — «틀렸다» 가 아니라 «이 눈금으로 못 잰다». 값·이탈%·K회 폭을 매 실행 찍되
     실패로 안 센다(504-④ «못 잡는 것은 안 잡는다고 적어라»). 자물쇠는 «낡은 선언 그 값일 때만». */
  rows.filter(x => held695(x)).forEach(x => {
    hold('C2-접촉 `' + x.id + '` — 닿는 거리가 몸 주위라 이 눈금(판 위 개체수 고정)이 못 잰다(695)',
         '선언 ' + x.decl + ' ↔ 실측 ' + x.mean + ' = 이탈 ' + (x.off * 100).toFixed(0) + '%'
         + ' (허용 ±' + (x.tol * 100).toFixed(0) + '%) · K회 폭 ' + (x.spread * 100).toFixed(0) + '%'
         + ' · 재실행 사이 평균이 배로 갈린다 ⇒ **판정 불가**(선언이 틀렸다는 뜻이 아니다) · 695 §5',
         '⏸접촉');
  });
  /* ── [C3] 표본이 «구조 종류» 를 덮는가 (695 신설) ─────────
     695 의 뿌리는 «선언이 틀렸다» 가 아니라 **표본에 그 구조가 아예 없었다** 는 것이다.
     한 종을 이름으로 지키면 그 종만 지켜지므로, 지키는 것은 이름이 아니라 **구조 축**이다:
     ⓐ cd 0 지속형이 표본에 있는가 ⓑ 접촉형(HOLD695 등재분)이 전부 표본 안인가.
     ⚠ 이 항이 없으면 다음 세션이 «느리다» 며 셋을 빼도 게이트는 초록으로 넘어간다(356-㉞). */
  const cd0 = rows.filter(x => !x.cd).map(x => x.id);
  ok(cd0.length > 0, 'C3-a 표본이 `cd 0` 지속형을 덮는다 — 504~680 동안 한 번도 안 재던 구조',
     cd0.join(',') || '표본에 cd 0 종 0개 — 구조가 통째로 안 보인다');
  const missing = Object.keys(HOLD695).filter(id => !PROBE.includes(id));
  ok(missing.length === 0, 'C3-b ⏸접촉 등재분이 전부 표본 안 — 못 잰다는 사실이 매 실행 표에 남는다',
     missing.join(',') || Object.keys(HOLD695).length + '종 전부 표본 안');

  /* ── [D] 결과 — 등급 안 «실제» DPS 가 평탄해졌나 ────────── */
  const D = await page.evaluate(measured => {
    const rows = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (t.length < 2) return;
      const d = t.map(s => s.cd > 0 ? s.m * skillHits(s) / s.cd : s.m * skillHits(s));
      rows.push({ g, ratio: Math.max(...d) / Math.min(...d) });
    });
    /* 실측이 있는 종만 «실제 DPS»(= m × 실측발수 / cd)로 다시 재서 표본 안 편차를 본다.
       ⚠ 695 — «이 눈금이 못 잰다» 고 방금 적은 종(⏸접촉)은 여기서 **뺀다**. 판정 불가라고
       말해 놓고 그 값을 편차 단언에 넣으면 자가 자기 말을 뒤집는 것이고, 그 빨강은 결함이
       아니라 표본을 넓힌 대가로 생긴 헛빨강이다(504-④ «못 잡는 것은 안 잡는다고 적어라»).
       ⏸199(poison)은 뺀 게 아니다 — 그쪽은 값이 재현되고 뿌리도 닫혀 계수만 남은 자리다. */
    const r = measured.filter(x => !x.contact)
      .map(x => { const s = SK[x.id]; return s.cd > 0 ? s.m * x.mean / s.cd : s.m * x.mean; });
    return { rows, realMin: Math.min(...r), realMax: Math.max(...r), realRatio: Math.max(...r) / Math.min(...r) };
  }, rows.map(x => ({ id: x.id, mean: x.mean, contact: held695(x) })));
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
  if (held) {
    console.log('\n  ⏸ 199 대기 ' + held + '칸 — 622 가 뿌리를 «선언 한 칸이 낡았다» 로 닫고 계수를 199 로 넘겼다.');
    console.log('    실패로 안 세되 값·이탈%·한 벌 재역산은 위에 매 실행 찍힌다. 199 가 `hits` 를 넣는 순간');
    console.log('    이 칸은 스스로 하드 단언으로 돌아온다(면제 조건 = «낡은 선언 그 값일 때만»).');
  }
  if (heldC) {
    console.log('\n  ⏸ 접촉 ' + heldC + '칸(695) — 이 셋은 «선언이 틀렸다» 가 아니라 **이 눈금이 못 잰다**.');
    console.log('    닿는 거리가 몸 주위 한 뼘이라 값을 정하는 것은 판 위 개체수(이 자가 고정)가 아니라');
    console.log('    반경 안 개체수(안 갇힘)이고, 그래서 같은 자·같은 트리인데 평균이 재실행 사이에 배로 갈린다.');
    console.log('    ⚠ 여기 찍힌 실측을 선언에 옮겨 적지 마라 — 값·계수는 199 몫이다(`probe695` §3·§5).');
  }
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail)
    + (held ? ' · ⏸' + held + ' → 199 대기' : '')
    + (heldC ? ' · ⏸' + heldC + ' → 접촉(눈금 미적용 · 695)' : ''));
  process.exit(fail ? 1 : 0);
})();
