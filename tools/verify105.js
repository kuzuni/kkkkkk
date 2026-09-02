#!/usr/bin/env node
/* 105 검증 — 자동 장착 폐기 (스킬·펫·장비가 «알아서» 다시 장착되는 버그)
 *
 *   node tools/verify105.js
 *
 * 지시서 [3]-(가) 기계적/기능 작업 — 비평가 없이 헤드리스 실동작만 본다.
 *
 * 검사 항목:
 *   [A] 소스 — autoEquipAll / autoEquipTick / autoEqT / S.autoEquip 이 코드(주석 제외)에 0건
 *   [B] 기본값 — 새 게임: S.autoEquip 키 없음 · S.autoBuy false · a105 표식 1
 *   [C] 구 세이브 — autoEquip:true·autoBuy:true 세이브를 로드해도 둘 다 꺼진다(1회 정리)
 *   [D] 플레이어 선택 존중 — a105 가 찍힌 세이브에서 autoBuy:true 는 그대로 유지된다
 *   [E] 해제 유지(핵심) — 스킬 1개 해제 → 전투 30초 진행 → 여전히 해제 상태
 *       (장비 부위 1칸·펫 1마리 해제도 같이 본다)
 *   [F] 소환 뒤 장착 불변 — 전 종류를 이미 보유한 상태에서 10연 → 장착 슬롯 전부 그대로
 *   [G] 해제한 칸이 중복 획득으로 되돌아오지 않음 — 무기 해제 + 전 무기 보유 → 10연 → 여전히 빈 칸
 *   [H] 빈 칸 1회 채움(허용된 예외) — 처음 얻은 스킬/무기는 빈 칸에 들어간다
 *   [I] 차 있는 칸은 신규 획득으로도 안 바뀜 — 더 강한 신규가 나와도 끼워진 것을 밀어내지 않는다
 *   [J] 합성(craft) — 처음 만든 등급은 빈 칸이면 채우고, 차 있으면 그대로
 *   [K] 콘솔 에러 0건
 *   [L] «자동» 감사표 출력 — 남아 있는 자동 동작 목록(주인 보고용)
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
  console.error('playwright 없음 — npm i --no-save playwright && npx playwright install chromium'); process.exit(2);
})();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
const IDLE = Number(process.env.V105_SECS || 30);   /* [E] 전투 진행 시간(초) — 구 자동 장착 주기 2초의 15배 */
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

async function launch() {
  try { return await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    return await chromium.launch({ executablePath: p });
  }
}
/* 세이브를 심고 새 페이지를 연다. seed=null 이면 새 게임. */
async function open(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(s => {
    const KEY = 'idle_hunter_save_v4';
    if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY);
  }, seed);
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof toggleEquip === 'function' && typeof doSummon === 'function');
  await page.waitForTimeout(800);
  return { ctx, page, errs };
}

(async () => {
  /* ---------- [A] 소스 검사 ---------- */
  const src = fs.readFileSync(path.resolve(ROOT, 'index.html'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  /* `delete b.autoEquip`(로드 마이그레이션 1줄)만 남는다 — 그 외 자동 장착 코드 경로는 0건이어야 한다 */
  const dead = ['autoEquipAll', 'autoEquipTick', 'autoEqT', 'S.autoEquip', 'autoEquip:'];
  const hits = dead.filter(t => code.includes(t));
  ok(hits.length === 0, '[A] 자동 장착 식별자 0건 (주석 제외)', hits.length ? '잔존: ' + hits.join(', ') : 'autoEquipAll/Tick/autoEqT/S.autoEquip');
  /* 263(2026-08-27) — 105 가 «유일한 예외» 로 남겼던 빈 칸 1회 채움(equipFillNew)까지 폐지됐다.
     그래서 이 줄은 «존재» 가 아니라 «0건» 을 묻는다. 전용 게이트는 tools/verify263.js. */
  ok(!code.includes('equipFillNew'), '[A] 빈 칸 1회 채움 equipFillNew() 도 0건 (263)',
    code.includes('equipFillNew') ? '잔존' : '자동 장착 경로 전무');

  const browser = await launch();
  const allErrs = [];

  /* ---------- [B] 새 게임 기본값 ---------- */
  {
    const { ctx, page, errs } = await open(browser, null);
    const B = await page.evaluate(() => ({ ae: S.autoEquip, ab: S.autoBuy, a105: S.a105, eqSkill: S.eqSkill.slice() }));
    ok(B.ae === undefined, '[B] 새 게임 S.autoEquip 키 없음', String(B.ae));
    ok(B.ab === false, '[B] 새 게임 S.autoBuy = false', String(B.ab));
    ok(B.a105 === 1, '[B] a105 표식 = 1', String(B.a105));
    ok(B.eqSkill.length === 1 && B.eqSkill[0] === 'slash', '[B] 시작 스킬 slash 1개만 장착', B.eqSkill.join(','));
    allErrs.push(...errs); await ctx.close();
  }

  /* ---------- [C] 구 세이브 1회 정리 ---------- */
  {
    const { ctx, page, errs } = await open(browser, {
      nick: 'V105old', gold: 1e7, dia: 1e6, stage: 5, best: 5,
      autoEquip: true, autoBuy: true,
      own: { slash: { n: 0, l: 1 } }, eqSkill: ['slash']
    });
    const C = await page.evaluate(() => ({ nick: S.nick, ae: S.autoEquip, ab: S.autoBuy, a105: S.a105 }));
    ok(C.nick === 'V105old', '[C] 구 세이브 로드 정상');
    ok(C.ae === undefined, '[C] 구 세이브의 autoEquip:true → 키 삭제', String(C.ae));
    ok(C.ab === false, '[C] 구 세이브의 autoBuy:true → false 로 1회 정리', String(C.ab));
    ok(C.a105 === 1, '[C] a105 표식 기록', String(C.a105));
    allErrs.push(...errs); await ctx.close();
  }

  /* ---------- [D] a105 이후 플레이어가 켠 자동 구매는 유지 ---------- */
  {
    const { ctx, page, errs } = await open(browser, {
      nick: 'V105on', gold: 1e7, dia: 1e6, a105: 1, autoBuy: true,
      own: { slash: { n: 0, l: 1 } }, eqSkill: ['slash']
    });
    const D = await page.evaluate(() => S.autoBuy);
    ok(D === true, '[D] a105 찍힌 세이브의 autoBuy:true 유지(플레이어 선택 존중)', String(D));
    allErrs.push(...errs); await ctx.close();
  }

  /* ---------- [E]~[J] 본 시나리오 ---------- */
  const { ctx, page, errs } = await open(browser, null);

  /* 전 종류 보유 + 스킬 8칸·펫 3칸·장비 3칸을 채운 상태를 만든다 */
  const setup = await page.evaluate(() => {
    SKILLS.forEach(s => S.own[s.id] = { n: 5, l: 1 });
    PETS.forEach(p => S.own[p.id] = { n: 5, l: 1 });
    EQUIPS.forEach(e => S.own[e.id] = { n: 5, l: 1 });
    S.dia = 1e9; S.gold = 1e9;
    S.eqSkill = SKILLS.slice(0, 8).map(s => s.id);
    S.eqPet = PETS.slice(0, 3).map(p => p.id);
    SLOTS.forEach(s => { S.eqSlot[s.k] = EQUIPS.filter(e => e.slot === s.k)[0].id; });
    syncPets(); markDirty();
    return { sk: S.eqSkill.length, pet: S.eqPet.length, slot: Object.values(S.eqSlot).filter(Boolean).length };
  });
  ok(setup.sk === 8 && setup.pet === 3 && setup.slot === 3, '[E] 준비 — 스킬8·펫3·장비3 장착', JSON.stringify(setup));

  /* [E] 해제 → 전투 IDLE 초 → 여전히 해제 */
  const before = await page.evaluate(() => {
    const skId = S.eqSkill[3], petId = S.eqPet[1];
    toggleEquip(SK[skId], 'skill');
    toggleEquip(PT[petId], 'pet');
    toggleEquip(EQ[S.eqSlot.weapon], 'equip');
    return { skId, petId, sk: S.eqSkill.slice(), pet: S.eqPet.slice(), slot: Object.assign({}, S.eqSlot), stage: S.stage };
  });
  ok(!before.sk.includes(before.skId) && !before.pet.includes(before.petId) && before.slot.weapon === null,
    '[E] 해제 직후 상태 확인', 'skill=' + before.skId + ' pet=' + before.petId + ' weapon=null');
  process.stdout.write('     … 전투 ' + IDLE + '초 진행 중\n');
  await page.waitForTimeout(IDLE * 1000);
  const after = await page.evaluate(() => ({
    sk: S.eqSkill.slice(), pet: S.eqPet.slice(), slot: Object.assign({}, S.eqSlot),
    stage: S.stage, kills: S.totalKills
  }));
  ok(!after.sk.includes(before.skId), '[E] ' + IDLE + '초 뒤에도 스킬 해제 유지', before.skId + ' ∉ [' + after.sk.join(',') + ']');
  ok(!after.pet.includes(before.petId), '[E] ' + IDLE + '초 뒤에도 펫 해제 유지', before.petId + ' ∉ [' + after.pet.join(',') + ']');
  ok(after.slot.weapon === null, '[E] ' + IDLE + '초 뒤에도 무기 칸 비어 있음', String(after.slot.weapon));
  ok(after.sk.length === 7 && after.pet.length === 2, '[E] 다른 칸도 임의로 늘지 않음', 'sk=' + after.sk.length + ' pet=' + after.pet.length);
  ok(after.kills > 0, '[E] 그 사이 전투는 실제로 돌았다(자동 사냥 유지)', 'kills=' + after.kills);

  /* [F][G] 전 종류 보유 상태에서 10연 → 장착 불변 · 빈 무기 칸도 그대로 */
  const sum = await page.evaluate(() => {
    const b4 = { sk: S.eqSkill.slice(), pet: S.eqPet.slice(), slot: Object.assign({}, S.eqSlot) };
    doSummon('weapon', 10); doSummon('skill', 10); doSummon('pet', 10);
    closeSummonResult && closeSummonResult();
    return { b4, af: { sk: S.eqSkill.slice(), pet: S.eqPet.slice(), slot: Object.assign({}, S.eqSlot) } };
  });
  ok(JSON.stringify(sum.b4.sk) === JSON.stringify(sum.af.sk)
    && JSON.stringify(sum.b4.pet) === JSON.stringify(sum.af.pet),
    '[F] 10연 ×3 뒤 스킬·펫 장착 배열 불변', sum.af.sk.length + '개 / ' + sum.af.pet.length + '마리');
  ok(sum.b4.slot.shield === sum.af.slot.shield && sum.b4.slot.amulet === sum.af.slot.amulet,
    '[F] 차 있는 장비 칸 불변', JSON.stringify(sum.af.slot));
  ok(sum.af.slot.weapon === null, '[G] 해제한 무기 칸은 중복 획득으로 되돌아오지 않음', String(sum.af.slot.weapon));

  /* [H] 263 — 빈 칸 + 처음 얻은 것이어도 **안 낀다**(105 의 예외가 폐지됐다).
     ★ 「불변」 은 아무 일도 안 일어나도 참이므로, «신규 획득이 실제로 발생했는지» 를 같이 잰다. */
  const fill = await page.evaluate(() => {
    /* 무기 배너를 «하나도 없는» 상태로 되돌리고 칸을 비운다 */
    BANNERS.weapon.list.forEach(e => delete S.own[e.id]);
    S.eqSlot.weapon = null; S.dia = 1e9; S.guide.idx = 99;
    const ownB = Object.keys(S.own).length;
    doSummon('weapon', 10); closeSummonResult && closeSummonResult();
    const w1 = S.eqSlot.weapon, gained = Object.keys(S.own).length - ownB;
    /* 스킬: 빈 칸 + 처음 얻는 스킬 */
    const unown = SKILLS.find(s => !S.eqSkill.includes(s.id));
    delete S.own[unown.id];
    const skBefore = S.eqSkill.length;
    S.own[unown.id] = { n: 0, l: 1 };
    return { w1, gained, skBefore, skAfter: S.eqSkill.length, newSk: unown.id, has: S.eqSkill.includes(unown.id) };
  });
  ok(fill.gained > 0, '[H] 무기 10연이 실제로 신규를 줬다(음성항 방지)', fill.gained + '종');
  ok(fill.w1 === null, '[H] 263 — 빈 무기 칸 + 처음 얻은 무기여도 안 낀다', String(fill.w1));
  ok(fill.skAfter === fill.skBefore && !fill.has, '[H] 263 — 빈 스킬 칸 + 처음 얻은 스킬이어도 안 낀다',
    fill.skBefore + '→' + fill.skAfter + ' (' + fill.newSk + ')');

  /* [I] 차 있는 칸도 당연히 안 바뀐다 — 플레이어가 끼운 것은 신규 획득에 밀리지 않는다 */
  const keep = await page.evaluate(() => {
    const mine = BANNERS.weapon.list.find(e => has(e.id));
    if (!mine) return { skip: true };
    toggleEquip(mine, 'equip');                       /* 플레이어가 직접 장착 */
    const cur = S.eqSlot.weapon;
    const ownB = Object.keys(S.own).length;
    doSummon('weapon', 20);                           /* 더 강한 것이 섞여 나와도 */
    return { cur, gained: Object.keys(S.own).length - ownB, now: S.eqSlot.weapon };
  });
  ok(keep.skip || !!keep.cur, '[I] 플레이어가 누른 장착은 남는다(대조군)', keep.skip ? '건너뜀' : String(keep.cur));
  ok(keep.skip || keep.now === keep.cur, '[I] 차 있는 칸은 더 강한 신규가 나와도 그대로',
    keep.skip ? '후보 없음(건너뜀)' : keep.cur + ' (신규 ' + keep.gained + '종 무시)');

  /* [J] 263 — 합성 뒤에도 장착 목록이 그대로다(등재문이 지정한 단언) */
  const cr = await page.evaluate(() => {
    /* 719 — 산출은 이제 `nextTierItem` 으로 **결정적**이지만, 풀 전체를 미보유로 미는 이 준비는
       그대로 둔다(«처음 얻은 것이어도 안 낀다» 라는 이 절의 뜻이 더 강한 표본이다) */
    const clearNext = it => EQUIPS.filter(e => e.slot === it.slot && e.g === it.g + 1).forEach(e => delete S.own[e.id]);
    const base = BANNERS.shield.list.find(e => !isTopGrade(e));
    if (!base) return { skip: true };
    S.own[base.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
    clearNext(base);
    S.eqSlot.shield = null;
    const made = craft(base);
    const filled = S.eqSlot.shield;
    /* 두 번째: 플레이어가 끼워 둔 칸도 그대로 */
    const base2 = BANNERS.shield.list.find(e => !isTopGrade(e) && e.id !== base.id && e.id !== (made && made.id));
    let keptSame = true, made2 = null, cur = null;
    if (base2) {
      if (made) toggleEquip(EQ[made.id] || made, 'equip');   /* 플레이어가 직접 장착 */
      cur = S.eqSlot.shield;
      S.own[base2.id] = { n: CRAFT_NEED, l: MAX_LEVEL };
      clearNext(base2);
      made2 = craft(base2);
      keptSame = S.eqSlot.shield === cur;
    }
    return { made: made && made.id, filled, keptSame, cur, made2: made2 && made2.id };
  });
  ok(cr.skip || !!cr.made, '[J] 합성이 실제로 상위 등급을 만들었다(음성항 방지)', cr.skip ? '후보 없음' : String(cr.made));
  ok(cr.skip || cr.filled === null, '[J] 263 — 합성 뒤 빈 부위는 빈 채로', cr.skip ? '' : cr.made + ' → ' + String(cr.filled));
  ok(cr.skip || cr.keptSame, '[J] 263 — 플레이어가 끼운 칸도 합성으로 안 바뀐다',
    cr.skip ? '' : String(cr.cur) + ' (신규 ' + cr.made2 + ' 무시)');

  /* [K2] 훈련 자동 구매 토글 — 기본 OFF 지만 «플레이어가 켜면» 그대로 동작해야 한다 */
  await page.evaluate(() => { goTab('grow'); renderUp(); });
  await page.waitForTimeout(300);
  const tg = await page.evaluate(() => {
    const btn = document.querySelector('#bUp [data-auto]');
    if (!btn) return { none: true };
    const off = S.autoBuy, txtOff = btn.textContent.trim();
    btn.click();
    return { none: false, off, on: S.autoBuy, txtOff, txtOn: (document.querySelector('#bUp [data-auto]') || btn).textContent.trim(), gold: S.gold, up: S.upgrades };
  });
  ok(!tg.none && tg.off === false && tg.on === true, '[K2] 강화 탭 «자동» 토글 — OFF 기본 · 누르면 ON',
    tg.none ? '토글 없음' : tg.txtOff + ' → ' + tg.on);
  await page.waitForTimeout(1500);
  const tg2 = await page.evaluate(() => ({ up: S.upgrades, ab: S.autoBuy }));
  ok(tg2.up > tg.up, '[K2] 켠 뒤에는 훈련 자동 구매가 실제로 돈다', tg.up + '→' + tg2.up);
  await page.evaluate(() => { S.autoBuy = false; });

  /* [K] 콘솔 에러 */
  await page.waitForTimeout(600);
  allErrs.push(...errs);
  ok(allErrs.length === 0, '[K] 콘솔 에러 0건', allErrs.slice(0, 3).join(' | '));

  /* [L] «자동» 감사표 */
  const audit = await page.evaluate(() => ({
    autoBuy: S.autoBuy, buyToggle: !!document.querySelector('#bUp [data-auto]'),
    dgd: typeof dgdAutoOn !== 'undefined' ? dgdAutoOn : null
  }));
  console.log('\n[L] «자동» 감사표 (105 ④ — 주인 지시 없이 알아서 바뀌는 것)');
  console.log('  · 자동 장착(autoEquipAll/Tick) ........ 폐기 — **263 으로 빈 칸 1회 채움(equipFillNew)까지 폐지**, 남은 경로 0');
  console.log('  · 훈련 자동 구매(S.autoBuy) .......... 기본 OFF(현재 ' + audit.autoBuy + ') · 강화 탭 토글 유지=' + audit.buyToggle);
  console.log('  · 스탯 자동 분배(spAuto) ............. 88 에서 시스템째 폐기(식별자 0건)');
  console.log('  · 던전 «연속 도전» 체크(dgdAutoOn) ... 표시 전용(현재 ' + audit.dgd + ') — 자동 반복 로직 없음');
  console.log('  · 유물 자동 강화(89) ................. 유지(주인 지시 설계 — 버튼을 눌러야 소환·강화)');
  console.log('  · 스테이지 자동 진행 · 자동 사냥/시전 · 자동 이동(59) · 자동 부활 · 자동 저장 ... 유지(지시대로)');

  await browser.close();
  console.log('\nVERIFY105 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
