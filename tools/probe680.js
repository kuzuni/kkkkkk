#!/usr/bin/env node
/* 680 재현 — `verify504` [C2] 의 `poison` 빨강이 무엇인가 (T1 «버그(게이트 눈금 ↔ 제품 어긋남)»)
 *
 *   node tools/probe680.js
 *
 * ⚑ **등재문(680)은 «가설을 정하지 말고 재현부터» 라고 적으며 후보 셋을 세웠다**
 *   (ⓐ `poison` 선언이 낡았다 · ⓑ 자의 표본 조건이 장판 계열에 불리해졌다 · ⓒ 밴드 40% 가
 *   이 종에만 좁다). **그 셋은 이미 622 가 갈랐다** — 680 은 같은 빨강의 **세 번째 등재**다
 *   (620 이 관측 → 622 로 등재·완료 → 회귀 스윕이 다시 보고 680 으로 등재). 그래서 이 프로브가
 *   먼저 하는 일은 새 가설을 세우는 것이 아니라 **622 의 판정이 오늘 트리에서도 서는지** 를
 *   같은 자로 다시 재는 것이고(§1~§3), 그 다음이 **왜 세 번이나 다시 등재됐는가** 다(§4~§5).
 *
 *   [0] 자가 하나인가 — 게이트·프로브가 `rul504.js` 를 읽고, 게이트 안에 하네스 사본이 0건
 *   [1] 재현 — `poison` 선언 29.36 ↔ 눈금 504-RUL 실측이 허용 오차 밖 (622 가 잰 16.06 자리)
 *   [2] 흔들림이 아니다 — K회 폭이 좁아 재실행으로는 안 닫힌다 («플레이키» 기각)
 *   [3] 나란히 — **27종 전수**. 밴드를 벗어나는 종이 `poison` **하나**여야 ⓑ·ⓒ 가 기각된다
 *   [4] 199 가 넣을 한 벌이 실제로 닫는가 — `hits`+`m` 을 주입하면 [C2] 도 [D1] 도 초록
 *   [5] ⏸199 칸이 무르지 않다 — ⓐ 다른 종은 면제 안 된다 ⓑ 값이 바뀌면 면제가 풀린다
 *       ⓒ 대기 종이라도 «밴드 안» 이면 애초에 걸리지 않는다
 *
 * ⚠ §4·§5 는 **`rul504.js` 의 실제 판정 함수(`c2Split`·`held199`)를 부른다.** 사본을 만들어
 *   시험하면 시험이 통과해도 게이트가 통과한다는 뜻이 아니다(553·620 이 사본으로 값을 치렀다).
 */
const path = require('path');
const fs = require('fs');
const RUL = require('./rul504');

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
const { K, SEC, POP } = RUL;

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  /* ── [0] 자가 하나인가 ─────────────────────────────────── */
  const gate = fs.readFileSync(path.join(__dirname, 'verify504.js'), 'utf8');
  ok(/require\(['"]\.\/rul504['"]\)/.test(gate), '0-a 게이트가 눈금을 `rul504.js` 에서 읽는다',
     '`require(\'./rul504\')` 있음');
  /* 하네스가 게이트 안에 다시 적혀 있으면 «자가 둘» 이다 — 그 표식은 판을 까는 두 줄이다 */
  const copied = /spawnStage\(\)/.test(gate) || /makeEnemy\('zombie'\)/.test(gate);
  ok(!copied, '0-b 게이트 안에 눈금 하네스 사본 0건(402·508·553·620 이 값을 치른 자리)',
     copied ? '`spawnStage()`/`makeEnemy` 가 게이트에 남아 있다' : '사본 0건');
  ok(typeof RUL.measure === 'function' && typeof RUL.c2Split === 'function'
     && typeof RUL.held199 === 'function' && RUL.TOL_FLOOR === 0.40,
     '0-c 눈금 모듈이 하네스·판정·허용 오차 바닥을 한 곳에서 준다',
     'K=' + K + ' · SEC=' + SEC + ' · POP=' + POP + ' · TOL_FLOOR=' + RUL.TOL_FLOOR);

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

  /* ── [1]~[3] 27종 전수를 **같은 자로 한 번에** 잰다 ─────────
     ⚑ poison 만 따로 재면 안 된다 — 등재문 후보 ⓑ(«자의 표본 조건이 장판 계열에 불리해졌다»)·
     ⓒ(«밴드가 이 종에만 좁다»)를 기각하는 것은 **형제들이 밴드 안에 있다** 는 사실이고,
     그 사실은 나란히 재야만 나온다(622 는 표본 11종으로 봤다 — 여기서 27종으로 넓힌다). */
  const ids = await page.evaluate(() => SKILLS.filter(s => !s.sup).map(s => s.id));
  const C = await RUL.measure(page, ids, { K, SEC, POP });
  const rows = C.map(x => {
    const tol = RUL.tolOf(x.spread, K), off = RUL.offOf(x.mean, x.decl);
    return Object.assign({}, x, { tol: +tol.toFixed(3), off: +off.toFixed(3) });
  });
  console.log('     ' + 'id'.padEnd(8) + '선언'.padEnd(9) + '실측(K=' + K + ')'.padEnd(11)
    + '이탈'.padEnd(9) + '허용'.padEnd(8) + 'K회 폭');
  rows.slice().sort((a, b) => b.off - a.off).forEach(x => console.log('     ' + x.id.padEnd(8)
    + String(x.decl).padEnd(9) + String(x.mean).padEnd(11)
    + ((x.off * 100).toFixed(0) + '%').padEnd(9) + ('±' + (x.tol * 100).toFixed(0) + '%').padEnd(8)
    + (x.spread * 100).toFixed(0) + '%' + (RUL.held199(x) ? '   ⏸199' : '')));

  const pz = rows.find(x => x.id === 'poison');
  ok(pz && pz.off > pz.tol, '1 재현 — `poison` 선언 ↔ 실측이 허용 오차 밖(622 가 잰 자리)',
     pz ? '선언 ' + pz.decl + ' ↔ 실측 ' + pz.mean + ' = ' + (pz.off * 100).toFixed(0)
          + '% > ±' + (pz.tol * 100).toFixed(0) + '%' : 'poison 행 없음');
  /* «플레이키니까 재실행하면 닫힌다» 를 여기서 끊는다 — K회 폭이 이탈보다 훨씬 작다.
     ⚠ 이 항이 없으면 다음 스윕이 또 «흔들림» 으로 읽고 네 번째 등재를 한다. */
  ok(pz && pz.spread < 0.25 && (pz.off - pz.tol) > 0.02,
     '2 흔들림이 아니다 — K회 폭이 좁고 이탈이 밴드를 고정으로 넘는다(재실행으로 안 닫힌다)',
     pz ? 'K회 폭 ' + (pz.spread * 100).toFixed(0) + '% · 이탈−허용 '
          + ((pz.off - pz.tol) * 100).toFixed(0) + 'p · 값 ' + pz.each.join('/') : '-');

  /* [3] 후보 ⓑ·ⓒ 를 기각하는 것은 «poison 하나뿐» 이 아니라 **형제 구조가 밴드 안** 이라는 사실이다.
     ⚠ 27종으로 넓히자 622 가 못 본 것이 나왔다 — `orbit`·`aura`(cd 0 지속형)·`whirl` 이 밴드 밖이다.
     그 셋은 **눈금이 한 번도 재 본 적 없는 구조**이고(게이트 표본 11종에 cd 0 이 하나도 없다)
     K회 폭이 46~164% 라 poison(11%)과 성질이 다르다 ⇒ **이 작업 단위 밖 · 695 로 등재**.
     여기서 같이 고치면 «재현 없이 처방» 이 된다(338 규칙). */
  const KIN = ['flask', 'meteor', 'nova', 'holy', 'laser', 'boom', 'lance'];  /* 장판·폭발·빔·관통 — poison 의 형제 */
  const kin = rows.filter(x => KIN.includes(x.id));
  const kinBad = kin.filter(x => x.off > x.tol);
  ok(kin.length === KIN.length && kinBad.length === 0,
     '3-a 형제 구조(장판·폭발·빔·관통 7종)가 전부 밴드 안 ⇒ 후보 ⓑ(판·표본 조건이 장판 계열에 불리해졌다) 기각',
     '벗어난 형제 ' + kinBad.length + '건 · 같은 `zones` 틱을 타는 flask '
     + ((rows.find(x => x.id === 'flask') || {}).off * 100).toFixed(0) + '% · 최악 형제 '
     + kin.reduce((a, b) => a.off > b.off ? a : b).id + ' '
     + (Math.max(...kin.map(x => x.off)) * 100).toFixed(0) + '%');
  /* ⓒ «밴드 40% 가 이 종에만 좁다» — poison 자신의 흔들림에 비하면 밴드는 오히려 후하다.
     표준오차(폭 ÷ 2√K)의 몇 배인지로 잰다. 좁아서 걸린 것이 아니라 **멀어서** 걸린 것이다. */
  const se = pz.spread / (2 * Math.sqrt(K));
  ok(pz.tol / Math.max(se, 1e-9) > 4 && pz.off > pz.tol,
     '3-b 밴드는 이 종의 자체 흔들림의 여러 배 ⇒ 후보 ⓒ(밴드가 이 종에만 좁다) 기각 — 좁아서가 아니라 멀어서 걸린다',
     '표준오차 ' + (se * 100).toFixed(1) + '% · 밴드 ±' + (pz.tol * 100).toFixed(0) + '% = 그 '
     + (pz.tol / Math.max(se, 1e-9)).toFixed(1) + '배 · 이탈 ' + (pz.off * 100).toFixed(0) + '%');
  /* 곁다리를 «관측했다» 로 남긴다 — 실패로 세지 않되 이름·값은 표에 찍힌다(681 등재 근거). */
  const outBand = rows.filter(x => x.off > x.tol && x.id !== 'poison');
  console.log('     [곁다리 → 695] 밴드 밖 ' + outBand.length + '종(전부 눈금 미검증 구조): '
    + (outBand.map(x => x.id + ' cd' + x.cd + ' 이탈 ' + (x.off * 100).toFixed(0)
       + '% 폭 ' + (x.spread * 100).toFixed(0) + '%').join(' · ') || '없음'));
  /* ⚑ 759(2026-09-01) — 이 항이 실행마다 갈렸다: `whirl`(cd 1.6)은 **폭 한 축으로만** 걸리는데
     그 폭이 문턱 40% 를 정확히 걸친다(759 실측 5회 37~43% · 등재문 29~80%) ⇒ 4회 중 1회 빨강.
     뿌리는 흔들림이 아니라 **자기모순**이다 — 695 가 그 종을 «이 눈금으로 못 잰다»(⏸접촉)로
     이미 등재해 뒀는데, [3-c] 는 그 종을 **폭이라는 눈금 하나로** 다시 판정하고 있었다.
     ⇒ 695-④ 의 처분을 그대로 쓴다: **문턱 40% 는 한 칸도 안 건드리고**(값을 밴드에 맞추는 짓 금지)
     «판정 불가» 로 등재된 종만 이 항의 모수에서 뺀다. 자물쇠는 `held695()` — 낡은 선언 그 값일
     때만 면제라 199 가 값을 넣는 순간 스스로 하드로 돌아온다(손으로 지울 목록이 아니다).
     ⚠ 면제가 «항상 켜진 우회로» 가 되지 않게 **판정을 한 함수로 두고 [3-d] 가 그 함수로 되돌림
     시험을 친다** — 사본을 만들면 시험의 뜻이 사라진다(§0·[5] 와 같은 이유). */
  const sideOk = (x) => RUL.held695(x) || x.cd === 0 || x.spread > 0.40;
  ok(outBand.every(sideOk),
     '3-c 곁다리는 성질이 다르다 — 밴드 밖 나머지는 전부 ⏸접촉(695 등재 · 눈금 미적용)이거나 cd 0 지속형이거나 K회 폭 > 40%(poison 은 11%)',
     outBand.map(x => x.id + '(cd' + x.cd + ' 폭 ' + (x.spread * 100).toFixed(0) + '%'
       + (RUL.held695(x) ? ' ⏸접촉' : '') + ')').join(' · ') || '없음');
  /* [3-d] 되돌림 시험 — 면제가 «다 통과» 로 굳지 않았는지 **같은 함수**에 물어본다.
     ⓐ 이번 회차의 실제 poison 이 그 우회로를 하나도 못 탄다(⏸접촉 아님 · cd>0 · 폭<40%)
     ⓑ 등재 안 된 종은 whirl 과 똑같은 모양(cd 1.6 · 폭 37%)이어도 그대로 빨갛다.
     이 두 줄이 없으면 [3-c] 는 «곁다리가 통째로 사라져도 초록» 인 항이 된다(334 처방). */
  const ghost = { id: 'ghost', decl: 17.88, mean: 5, off: 0.75, tol: 0.40, cd: 1.6, spread: 0.37 };
  const whirlShape = Object.assign({}, ghost, { id: 'whirl' });   /* 이름만 다르다 — 자물쇠는 이름+선언 */
  ok(!sideOk(pz) && !sideOk(ghost) && sideOk(whirlShape),
     '3-d 되돌림 시험 — 면제는 «이름이 적힌 종 + 낡은 선언» 에서만 열린다(poison·미등재 종은 그대로 빨강)',
     'poison(cd' + pz.cd + ' 폭 ' + (pz.spread * 100).toFixed(0) + '%) 우회 ' + sideOk(pz)
     + ' · 미등재 ghost(cd1.6 폭 37%) 우회 ' + sideOk(ghost)
     + ' · 등재 whirl 같은 모양 우회 ' + sideOk(whirlShape));

  /* ── [4] 199 가 넣을 한 벌이 실제로 닫는가 ─────────────────
     622 가 넘긴 처방은 «`hits` 만 갈면 [D1] 이 1.0001 → 1.8281 로 즉시 빨개진다 ⇒ 한 벌» 이다.
     여기서는 **제품 표에 손대지 않고** 페이지 안에서만 주입해 두 축을 같이 본다. */
  const F = await page.evaluate(({ newHits }) => {
    const s = SK.poison, oldH = s.hits, oldM = s.m;
    const gradeRatio = () => {
      const out = [];
      GRADE.forEach((_, g) => {
        const t = SKILLS.filter(k => k.g === g && !k.sup);
        if (t.length < 2) return;
        const d = t.map(k => k.cd > 0 ? k.m * skillHits(k) / k.cd : k.m * skillHits(k));
        out.push(Math.max(...d) / Math.min(...d));
      });
      return Math.max(...out);
    };
    const base = gradeRatio();
    s.hits = newHits;                    /* ⓐ hits 만 — 484 의 약속이 깨진다 */
    const onlyHits = gradeRatio();
    s.m = +(SK_DPS_REF * s.cd / newHits).toFixed(4);   /* ⓑ 한 벌 */
    const pair = gradeRatio(), newM = s.m;
    s.hits = oldH; s.m = oldM;           /* 원복 — 이 프로브는 제품을 안 바꾼다 */
    return { base, onlyHits, pair, newM, restored: s.hits === oldH && s.m === oldM };
  }, { newHits: pz.mean });
  console.log('     [D1] 등급 안 최대/최소 — 지금 ' + F.base.toFixed(4)
    + ' · hits 만 ' + F.onlyHits.toFixed(4) + ' · 한 벌 ' + F.pair.toFixed(4)
    + ' (넣을 m ≈ ' + F.newM + ')');
  ok(F.onlyHits > 1.03, '4-a `hits` 만 갈면 [D1] 이 빨개진다 — 622 의 «한 벌» 경고가 실측으로 선다',
     'hits 만 ' + F.onlyHits.toFixed(4) + ' > 1.03');
  ok(F.pair <= 1.03 && F.restored,
     '4-b `hits`+`m` 한 벌이면 [D1] 이 그대로 초록 ⇒ 199 가 넣을 값은 «닫히는» 값이다',
     '한 벌 ' + F.pair.toFixed(4) + ' ≤ 1.03 · 주입 원복됨 ' + F.restored);
  const declOff = RUL.offOf(pz.mean, pz.mean);
  ok(declOff <= pz.tol, '4-c 그 값을 넣으면 [C2] 의 이 종도 밴드 안으로 들어온다',
     '이탈 ' + (declOff * 100).toFixed(0) + '% ≤ ±' + (pz.tol * 100).toFixed(0) + '%');

  /* ── [5] ⏸199 칸이 무르지 않다 — 게이트의 **실제 판정 함수**를 부른다 ─────
     ⚑ 여기서 사본을 만들면 시험의 뜻이 사라진다(§0 과 같은 이유). */
  const synth = (id, decl, off) => ({ id, decl, mean: 1, off, tol: 0.40, cd: 1, spread: 0 });
  const otherBroken = RUL.c2Split([synth('flask', 20.71, 0.9)]);
  ok(otherBroken.bad.length === 1 && otherBroken.hold.length === 0,
     '5-a 대기 목록에 없는 종이 벗어나면 그대로 빨갛다(면제는 이름이 적힌 종뿐)',
     'flask 90% → bad ' + otherBroken.bad.length + ' · hold ' + otherBroken.hold.length);
  const afterFix = RUL.c2Split([synth('poison', 16.06, 0.9)]);
  ok(afterFix.bad.length === 1 && afterFix.hold.length === 0,
     '5-b 199 가 `hits` 를 넣는 순간 면제가 풀린다 — 대기 칸은 «낡은 선언 그 값일 때만»(손목록 아님)',
     '선언 16.06 으로 바뀐 poison → bad ' + afterFix.bad.length + ' · hold ' + afterFix.hold.length);
  const stillStale = RUL.c2Split([synth('poison', 29.36, 0.9)]);
  ok(stillStale.hold.length === 1 && stillStale.bad.length === 0,
     '5-c 낡은 선언 그대로면 ⏸199 로 간다(실패로 안 세되 표에는 남는다)',
     '선언 29.36 → hold ' + stillStale.hold.length);
  const inBand = RUL.c2Split([synth('poison', 29.36, 0.1)]);
  ok(inBand.hold.length === 0 && inBand.bad.length === 0,
     '5-d 대기 종이라도 밴드 안이면 애초에 안 걸린다 — 면제가 «항상 켜진 우회로» 가 아니다',
     '이탈 10% → bad 0 · hold 0');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
