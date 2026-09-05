#!/usr/bin/env node
/* 481 재현(338 규칙) — «펫 피해·주기가 무엇으로 만들어지는가» 를 제품에게 직접 묻는다.
 *
 *   node tools/probe481.js
 *
 * 등재문(PROGRESS 481 행)이 적어 둔 현행 식을 손계산 표가 아니라 **제품이 실제로 쓰는 함수**
 * (`petDmg` · `bonus()` · `PETS`)로 확인·기각한 자다. 수리 전 값은 아래 `BEFORE` 에 박아 두었다
 * (2026-08-30, 수리 직전 커밋 `4cc31ea` 에서 이 자로 찍은 값) — 지금은 **수리 후 상태**를 재고
 * 그 둘을 나란히 찍는다. 게이트(되돌림 시험 포함)는 `tools/verify481.js` 가 따로 있다.
 *
 *   ⓐ 피해   — `petDmg` 가 무엇에 좌우되는가(등급·자리·강화 Lv 전수 스윕)
 *   ⓑ b.pet  — 등재문은 이것을 «보유 효과 축» 이라고 적었다. **무엇이 이 값을 올리는가**를
 *              직접 흔들어 본다(펫 보유 ↔ 21 도감 pet 세트 단계). ← 등재문 기각의 근거
 *   ⓒ 주기   — 등급 표 · 등급 안 자리 · 인접 등급 차 · 경계 역전 건수
 *   ⓓ 축 요약 — «등급·자리·레벨» 이 각각 피해/주기 중 어디에 붙는가
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

/* 수리 전 실측(커밋 4cc31ea · 이 자의 첫 실행) — 되돌아보는 근거이자 review 표의 원본 */
const BEFORE = {
  dmgRatio: { bird0: 0.4554, robo0: 1.9734, drag2: 836.1144, pet6_4: 4264.921188, pet7_0: 17515.613016 },
  lvGain: 2.174,                       /* drag2 Lv1 → Lv100 피해 배수 */
  cd: [1.30, 1.20, 1.10, 1.01, 0.91, 0.82, 0.75, 0.68],
  cdStepWorst: 0.9231,                 /* 인접 등급 최대비 = 7.7% 만 빨라진다 */
  cdEdgeBad: 3                         /* 구 9종 오버라이드가 만든 등급 경계 역전 건수 */
};

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof PETS !== 'undefined'
    && typeof petDmg === 'function' && typeof bonus === 'function');
  await page.waitForTimeout(600);

  /* ── ⓐ 피해 — 36종 × Lv{1,100} 전수 스윕 ─────────────────── */
  const A = await page.evaluate(() => {
    S.own = {}; S.coll = {}; markDirty();
    const vals = [];
    PETS.forEach(p => {
      [1, 100].forEach(l => {
        S.own[p.id] = { l }; markDirty();
        vals.push({ id: p.id, g: p.g, l, r: petDmg(p) / stat.dmg });
        delete S.own[p.id]; markDirty();
      });
    });
    const uniq = [...new Set(vals.map(v => +v.r.toFixed(9)))];
    return { n: vals.length, uniq, min: Math.min(...vals.map(v => v.r)), max: Math.max(...vals.map(v => v.r)) };
  });
  console.log('     · 수리 전 petDmg/stat.dmg — bird0 ' + BEFORE.dmgRatio.bird0
    + ' · robo0 ' + BEFORE.dmgRatio.robo0 + ' · drag2 ' + BEFORE.dmgRatio.drag2
    + ' · 불멸 pet7_0 ×' + BEFORE.dmgRatio.pet7_0 + ' (등급·레벨을 타고 자랐다)');
  console.log('     · 수리 후 — 36종 × Lv{1,100} = ' + A.n + '표본 전부 ×' + A.uniq.join('/'));
  ok(A.uniq.length === 1 && A.uniq[0] === 1,
    'ⓐ petDmg 는 등급·자리·강화 Lv 어디에도 안 좌우된다 — 전 표본이 stat.dmg 그대로',
    '표본 ' + A.n + '개 · 서로 다른 값 ' + A.uniq.length + '가지');

  /* ── ⓑ b.pet 은 무슨 축인가 — 등재문의 «보유 효과» 가설을 흔든다 ── */
  const B = await page.evaluate(() => {
    const base = (() => { S.own = {}; S.coll = {}; markDirty(); return bonus().pet; })();
    PETS.forEach(p => { S.own[p.id] = { l: 50 }; });   /* ① 전 펫 «보유»(ownVal 축) */
    markDirty();
    const own = bonus().pet, ownAtk = bonus().atk;
    const keys = COLL_SETS.filter(st => st.tab === 'pet').map(st => st.key);
    keys.forEach(k => { S.coll[k] = COLL_MAX_STEP; });  /* ② 21 도감 pet 세트 만단계 */
    markDirty();
    const coll = bonus().pet;
    const src = COLL_BASE.pet;
    S.own = {}; S.coll = {}; markDirty();
    return { base: +base.toFixed(6), own: +own.toFixed(6), ownAtk: +ownAtk.toFixed(3),
             coll: +coll.toFixed(6), keys: keys.length, src: JSON.stringify(src) };
  });
  console.log('     · b.pet — 기본 ' + B.base + ' · 전 펫 보유(Lv50) ' + B.own
    + ' · 도감 pet 세트 ' + B.keys + '개 만단계 ' + B.coll + '   [기준값 ' + B.src + ']');
  ok(B.own === B.base, 'ⓑ1 «펫 보유» 는 b.pet 을 1px 도 안 올린다 (등재문 «보유 효과 축» 기각)',
    B.base + ' → ' + B.own + ' (보유는 b.atk 로 간다: ×' + B.ownAtk + ')');
  ok(B.coll > B.base * 10, 'ⓑ2 b.pet 을 올리는 것은 21 도감 «펫» 세트 하나뿐 — 걷어내면 죽는 축이다',
    B.base + ' → ' + B.coll);

  /* ── ⓒ 주기 표 ────────────────────────────────────────── */
  const C = await page.evaluate(() => {
    const tiers = GRADE.map((_, g) => PETS.filter(p => p.g === g));
    const step = [];
    for (let g = 0; g + 1 < tiers.length; g++) step.push(+(PET_CD[g + 1] / PET_CD[g]).toFixed(4));
    const badMono = [], badEdge = [];
    tiers.forEach((t, g) => {
      for (let j = 1; j < t.length; j++) if (!(t[j].cd < t[j - 1].cd)) badMono.push('g' + g + '[' + j + ']');
    });
    for (let g = 0; g + 1 < tiers.length; g++) {
      const lo = Math.min(...tiers[g].map(p => p.cd)), hi = Math.max(...tiers[g + 1].map(p => p.cd));
      if (!(lo > hi)) badEdge.push('g' + g + '→g' + (g + 1) + ' ' + lo + '≤' + hi);
    }
    return { table: PET_CD.join(' · '), rows: tiers.map((t, g) => 'g' + g + ' [' + t.map(p => p.cd).join(' ') + ']'),
             step, worst: Math.max(...step), span: +(PET_CD[0] / PET_CD[GRADE.length - 1]).toFixed(3),
             badMono, badEdge };
  });
  console.log('     · 수리 전 PET_CD = [' + BEFORE.cd.join(' · ') + '] · 최대 인접비 ' + BEFORE.cdStepWorst
    + '(= ' + ((1 - BEFORE.cdStepWorst) * 100).toFixed(1) + '% 만 빨라진다) · 경계 역전 ' + BEFORE.cdEdgeBad + '건');
  console.log('     · 수리 후 PET_CD = [' + C.table + '] · 인접비 ' + C.step.join(' '));
  C.rows.forEach(r => console.log('       · ' + r));
  ok(C.worst <= 0.92, 'ⓒ1 인접 등급이 최소 ' + ((1 - C.worst) * 100).toFixed(1) + '% 빨라진다 (요구 ≥ 8%)',
    '최대 인접비 ' + C.worst + ' · g0/g7 = ×' + C.span);
  ok(C.badMono.length === 0 && C.badEdge.length === 0,
    'ⓒ2 등급 안 단조 감소 · 등급 경계 비역전 (수리 전 역전 ' + BEFORE.cdEdgeBad + '건 → 0건)',
    (C.badMono.concat(C.badEdge).join(' / ')) || '위반 0');

  /* ── ⓓ 축 요약 ────────────────────────────────────────── */
  const D = await page.evaluate(() => {
    const p = PT['drag2'];
    const at = l => { S.own[p.id] = { l }; markDirty(); const r = { d: petDmg(p) / stat.dmg, cd: p.cd }; delete S.own[p.id]; markDirty(); return r; };
    const a = at(1), b = at(100);
    const t = PETS.filter(x => x.g === 5);
    return { lv: +(b.d / a.d).toFixed(3), lvCd: a.cd === b.cd,
             jSpan: +(Math.max(...t.map(x => x.cd)) / Math.min(...t.map(x => x.cd))).toFixed(3),
             gSpan: +(PET_CD[0] / PET_CD[7]).toFixed(3) };
  });
  console.log('     · 축 — 등급: 주기 ×' + D.gSpan + ' · 자리(개체차): 주기 ×' + D.jSpan
    + ' · 강화 Lv: 피해 ×' + D.lv + '(수리 전 ×' + BEFORE.lvGain + ') · 주기 ' + (D.lvCd ? '불변' : '변함'));
  ok(D.lv === 1 && D.lvCd, 'ⓓ 강화 Lv 는 피해에도 주기에도 안 붙는다 (보유·장착 효과 축으로만 남았다)',
    '피해 ×' + D.lv + ' · 주기 ' + (D.lvCd ? '불변' : '변함'));

  ok(errs.length === 0, 'ⓔ 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0');

  await browser.close();
  console.log('\nPROBE481 ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
