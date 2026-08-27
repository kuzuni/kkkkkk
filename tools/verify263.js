/* 263 — 「새로 뽑은 것이 자동으로 장착돼 있다 → 장착은 플레이어가 한 것만」 기능 게이트.
   지시 원문(저장소 주인 2026-08-27): «새로 뽑은 것이 자동으로 장착돼 있다 — 장착은 플레이어가 한 것만
   (장비·스킬·펫 전부)». 105 가 남겨 둔 «유일한 예외»(`equipFillNew` — 처음 얻은 것 + 빈 칸 1회 채움)까지
   없앤 것이 263 이다.

   ROUTINE.md «기능 완성 규칙» — «지웠음» 이 아니라 «실제 게임 데이터로 돌려도 안 끼워진다» 를 잰다.
   그래서 이 게이트는 소스 검사(§1)만 하지 않고 **실제로 소환·합성을 돌려**(§2~§5) 장착 목록이
   한 글자도 안 바뀌는지 본다.

   ★ 음성항 주의 — «불변» 은 **아무 일도 안 일어났을 때도** 참이다(LESSONS 「값만 물으면 우연히 통과한다」).
     그래서 모든 절이 «장착 목록 불변» 과 «신규 획득이 실제로 n건 발생» 을 **한 쌍으로** 단언한다.
     §7 은 반대 방향 대조군 — 같은 자로 재서 «플레이어가 누르면 바뀐다» 를 확인한다. 이것이 없으면
     게이트가 «아무것도 안 재는 자» 로 굳어도 초록이다.

   실행: node tools/verify263.js
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html');
let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log('  ok   ' + m + (d ? '  — ' + d : '')); };
const no = (m, d) => { fail++; console.log('  NO   ' + m + (d ? '  — ' + d : '')); };
const t = (c, m, d) => (c ? ok(m, d) : no(m, d));
const is = (m, got, want) => t(got === want, m, '기대 ' + want + ' · 실제 ' + got);

(async () => {
  /* ---------------- [1] 소스 — 자동 장착 식별자·호출 0건 ---------------- */
  console.log('\n[1] 소스 — 자동 장착 코드 경로가 남아 있지 않다');
  const src = fs.readFileSync(path.resolve(ROOT, 'index.html'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const dead = ['equipFillNew', 'autoEquipAll', 'autoEquipTick', 'autoEqT', 'S.autoEquip'];
  const hits = dead.filter((x) => code.includes(x));
  t(hits.length === 0, '[1] 자동 장착 식별자 0건 (주석 제외)', hits.length ? '잔존: ' + hits.join(', ') : dead.join(' / '));
  /* 되살림 방지 — 주석에는 «되살리지 마라» 근거가 남아 있어야 한다(다음 세션이 다시 만들지 않도록) */
  t(/263[^\n]*자동 장착[^\n]*폐지|263 이 그 예외까지 없앴다/.test(src), '[1] 263 폐지 근거 주석 존재');
  /* 시작 지급은 별개 경로 — 지워지면 안 된다 */
  t(code.includes("S.eqSkill = ['slash']"), '[1] 첫 실행 시작 지급(slash 1개)은 그대로');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof doSummon === 'function' && typeof craft === 'function');
  await page.waitForTimeout(900);

  /* 공용 — «장착 목록» 한 벌을 문자열로 굳혀 비교한다(세 축을 한 자로 본다) */
  await page.evaluate(() => {
    window.__eqSnap = () => JSON.stringify({
      sk: S.eqSkill.slice(), pet: S.eqPet.slice(),
      slot: SLOTS.map((s) => s.k + ':' + (S.eqSlot[s.k] || '-')).join(' '),
    });
    window.__ownCount = () => Object.keys(S.own).length;
    /* 모든 절이 같은 출발선에서 시작한다 — 칸을 전부 비우고, 가이드 배너 차단(gmBlocked)도 푼다 */
    window.__reset = () => {
      Object.assign(S, DEF());
      S.own = {}; S.eqSkill = []; S.eqPet = []; SLOTS.forEach((s) => S.eqSlot[s.k] = null);
      S.best = 99; S.stage = 99; S.dia = 1e12; S.gold = 1e12; S.relic = 1e12;
      S.guide.idx = 99;
      if (typeof syncPets === 'function') syncPets();
    };
  });

  /* 한 경로를 돌리고 «장착 불변 + 신규 획득 n건» 을 한 쌍으로 돌려준다 */
  const run = (label, body) => page.evaluate(([b]) => {
    window.__reset();
    const before = window.__eqSnap(), ownB = window.__ownCount();
    // eslint-disable-next-line no-new-func
    new Function(b)();
    return { before, after: window.__eqSnap(), gained: window.__ownCount() - ownB };
  }, [body]).then((r) => Object.assign(r, { label }));

  /* ---------------- [2] 유료 소환 — 스킬·펫·장비 3계열 ---------------- */
  console.log('\n[2] 유료 소환 — 빈 칸이 있어도 자동 장착되지 않는다');
  for (const [label, b] of [['스킬', 'skill'], ['펫', 'pet'], ['무기', 'weapon'], ['방패', 'shield'], ['목걸이', 'amulet']]) {
    const r = await run(label, "doSummon('" + b + "', 10);");
    t(r.gained > 0, '[2] ' + label + ' 10연 — 신규 획득이 실제로 발생', r.gained + '종');
    t(r.after === r.before, '[2] ' + label + ' 10연 뒤 장착 목록 불변', r.before + ' → ' + r.after);
  }

  /* ---------------- [3] 무료 소환(광고·보상) ---------------- */
  console.log('\n[3] 무료 소환 — 같은 규칙');
  for (const [label, b] of [['스킬', 'skill'], ['펫', 'pet'], ['무기', 'weapon']]) {
    const r = await run(label, "doSummonFree('" + b + "', 10, true);");
    t(r.gained > 0, '[3] 무료 ' + label + ' 10연 — 신규 획득 발생', r.gained + '종');
    t(r.after === r.before, '[3] 무료 ' + label + ' 10연 뒤 장착 목록 불변', r.after);
  }

  /* ---------------- [4] 합성 ---------------- */
  console.log('\n[4] 합성 — 빈 부위 + 처음 얻는 상위 등급이어도 안 낀다');
  const cr = await page.evaluate(() => {
    window.__reset();
    const base = BANNERS.amulet.list.find((e) => !isTopGrade(e));
    EQUIPS.filter((e) => e.slot === base.slot && e.g === base.g + 1).forEach((e) => delete S.own[e.id]);
    S.own[base.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
    const before = window.__eqSnap();
    const made = craft(base);
    return { before, after: window.__eqSnap(), made: made && made.id, isNew: !!made };
  });
  t(cr.isNew, '[4] 합성이 실제로 상위 등급을 만들었다', String(cr.made));
  t(cr.after === cr.before, '[4] 합성 뒤 장착 목록 불변', cr.before + ' → ' + cr.after);

  /* ---------------- [5] 105 회귀 — 해제한 것은 되돌아오지 않는다 ---------------- */
  console.log('\n[5] 105 회귀 — 해제·중복 획득으로도 되돌아오지 않는다');
  const rev = await page.evaluate(() => {
    window.__reset();
    /* 무기 하나를 «플레이어가» 끼운 뒤 해제하고, 같은 계열을 왕창 더 뽑는다 */
    doSummon('weapon', 10);
    const owned = BANNERS.weapon.list.find((e) => has(e.id));
    toggleEquip(owned, 'equip');
    const wornOn = S.eqSlot.weapon;
    toggleEquip(owned, 'equip');
    const wornOff = S.eqSlot.weapon;
    const before = window.__eqSnap();
    doSummon('weapon', 30);
    doSummonFree('weapon', 10, true);
    return { wornOn, wornOff, before, after: window.__eqSnap() };
  });
  t(!!rev.wornOn, '[5] 플레이어가 누르면 장착된다(대조군)', String(rev.wornOn));
  is('[5] 다시 누르면 해제된다', rev.wornOff, null);
  t(rev.after === rev.before, '[5] 해제 뒤 40회 더 뽑아도 빈 칸 그대로', rev.after);

  /* ---------------- [6] 세이브 왕복 ---------------- */
  console.log('\n[6] 세이브 왕복 — 저장·로드가 빈 칸을 채우지 않는다');
  const sv = await page.evaluate(() => {
    window.__reset();
    doSummon('skill', 10); doSummon('pet', 10); doSummon('weapon', 10);
    const before = window.__eqSnap();
    save();
    const raw = localStorage.getItem('idle_hunter_save_v4');
    load && load();
    return { before, after: window.__eqSnap(), saved: !!raw };
  });
  t(sv.saved, '[6] 세이브가 실제로 쓰였다');
  t(sv.after === sv.before, '[6] 저장·로드 왕복 뒤에도 장착 목록 불변', sv.before + ' → ' + sv.after);

  /* ---------------- [7] 새 게임 시작 지급 ---------------- */
  console.log('\n[7] 새 게임 — 전투력 0 으로 시작하지 않는다(시작 지급은 별개 경로)');
  const fresh = await ctx.newPage();
  await fresh.addInitScript(() => localStorage.removeItem('idle_hunter_save_v4'));
  await fresh.goto(URL);
  await fresh.waitForFunction(() => typeof S !== 'undefined');
  await fresh.waitForTimeout(900);
  const ng = await fresh.evaluate(() => ({ sk: S.eqSkill.slice(), pet: S.eqPet.slice(), slot: Object.assign({}, S.eqSlot) }));
  is('[7] 시작 스킬 1개만 장착', ng.sk.join(','), 'slash');
  is('[7] 시작 펫 0', ng.pet.length, 0);
  is('[7] 시작 장비 0부위', Object.values(ng.slot).filter(Boolean).length, 0);
  await fresh.close();

  /* ---------------- [8] 전투 루프 ---------------- */
  console.log('\n[8] 전투 루프 — 시간이 지나도 안 낀다(autoEquipTick 회귀)');
  const tick = await page.evaluate(async () => {
    window.__reset();
    doSummon('skill', 10); doSummon('pet', 10); doSummon('weapon', 10);
    const before = window.__eqSnap();
    await new Promise((r) => setTimeout(r, 4000));   /* 구 autoEquipTick 주기(2초)의 2배 */
    return { before, after: window.__eqSnap() };
  });
  t(tick.after === tick.before, '[8] 4초(구 주기 2배) 방치 뒤에도 장착 목록 불변', tick.after);

  is('[9] 콘솔 에러 0건', errs.length, 0);
  if (errs.length) console.log('      ' + errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY263  ' + pass + '/' + (pass + fail) + (fail ? '  — FAIL ' + fail + '건' : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
