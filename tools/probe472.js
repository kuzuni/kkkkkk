#!/usr/bin/env node
/* 472·484·485 재현(338 규칙) — «지금 표» 를 제품에게 직접 물어서 찍는다.
 *
 *   node tools/probe472.js
 *
 * 등재문이 적어 둔 현행 수치(장비 장착 효과 · 스킬 등급 안 DPS 편차 · 펫엔 장착 효과 축이 없음)를
 * 손으로 계산한 표가 아니라 **제품이 실제로 쓰는 함수**(equipVal · skillDmg · petDmg · bonus)로 확인한다.
 *
 *   ⓐ 장비 — 3부위 × 8등급 × 티어별 `equipVal` (Lv1 기준 %) · 등급 안 인접 칸 비 · 등급 경계 비
 *   ⓑ 스킬 — 27종 `m × hits / cd`(stat.dps 가 쓰는 식) 등급별 최대/최소 비 · 등급 간 기준선 비
 *   ⓒ 펫   — «장착만으로 붙는 스탯 %» 축이 있는가(장착/해제 전후 stat.dmg Δ)
 *   ⓓ 규모 — 불멸 1티어까지의 누적 배수(199 이관 근거)
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

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
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof EQUIPS !== 'undefined'
    && typeof PETS !== 'undefined' && typeof SKILLS !== 'undefined' && typeof equipVal === 'function');
  await page.waitForTimeout(600);

  /* ── ⓐ 장비 장착 효과 표(Lv1 기준) ─────────────────────── */
  const A = await page.evaluate(() => {
    /* Lv1 로 못박아 레벨 축을 뺀다 — 표 자체를 본다 */
    const at1 = it => { S.own[it.id] = { l: 1 }; const v = equipVal(it); delete S.own[it.id]; return v; };
    const rows = [], stepIn = [], stepEdge = [];
    SLOTS.forEach(s => {
      const tiers = GRADE.map((_, g) => EQUIPS.filter(e => e.slot === s.k && e.g === g));
      tiers.forEach((t, g) => {
        const vals = t.map(at1);
        rows.push({ slot: s.k, g, vals: vals.map(x => +(x * 100).toFixed(2)) });
        for (let j = 1; j < vals.length; j++) stepIn.push(+(vals[j] / vals[j - 1]).toFixed(4));
      });
      for (let g = 0; g + 1 < tiers.length; g++) {
        if (!tiers[g].length || !tiers[g + 1].length) continue;
        const hi = Math.max(...tiers[g].map(at1)), lo = Math.min(...tiers[g + 1].map(at1));
        stepEdge.push(+(lo / hi).toFixed(4));
      }
    });
    return { rows, stepIn, stepEdge,
      g0t0: +(at1(EQUIPS.find(e => e.slot === 'weapon' && e.g === 0)) * 100).toFixed(3),
      top:  +(at1(EQUIPS.find(e => e.slot === 'weapon' && e.g === 7)) * 100).toFixed(1) };
  });
  const inMin = Math.min(...A.stepIn), inMax = Math.max(...A.stepIn);
  console.log('\n[ⓐ] 장비 장착 효과(Lv1, %) — 부위×등급 행');
  A.rows.forEach(r => console.log('   ' + r.slot.padEnd(7) + ' g' + r.g + ' : ' + r.vals.join(' · ')));
  ok(true, 'ⓐ1 일반 1티어 장착 효과', A.g0t0 + '%');
  ok(true, 'ⓐ2 등급 안 인접 칸 비(티어 한 칸)', inMin.toFixed(3) + ' ~ ' + inMax.toFixed(3));
  ok(true, 'ⓐ3 등급 경계 비(그 등급 최강 → 다음 등급 최약)',
     Math.min(...A.stepEdge).toFixed(3) + ' ~ ' + Math.max(...A.stepEdge).toFixed(3));
  ok(true, 'ⓐ4 불멸(g7) 1티어 장착 효과', A.top + '%');

  /* ── ⓑ 스킬 등급 안 DPS 편차 ───────────────────────────── */
  const B = await page.evaluate(() => {
    /* `stat.dps` 가 쓰는 발수 모델 그대로(19442) · `multi` 만 티어 축의 규약대로 Lv1 기준 3발(23494) */
    const H = s => s.id === 'shuri' ? 8 : s.id === 'bolt' ? 3 : s.id === 'multi' ? 3 : (s.hits || 1);
    const dps = s => s.cd > 0 ? s.m * H(s) / s.cd : s.m * 3;
    const per = [];
    for (let g = 0; g < 6; g++) {
      const list = SKILLS.filter(s => s.g === g);
      if (!list.length) continue;
      const vals = list.map(s => ({ id: s.id, d: +dps(s).toFixed(3) }));
      const ds = vals.map(x => x.d);
      per.push({ g, n: list.length, vals, min: Math.min(...ds), max: Math.max(...ds),
                 ratio: +(Math.max(...ds) / Math.min(...ds)).toFixed(3),
                 mean: +(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(3) });
    }
    return per;
  });
  console.log('\n[ⓑ] 스킬 기본 DPS(m×hits/cd) — 등급별');
  B.forEach(p => console.log('   g' + p.g + ' (' + p.n + '종) 평균 ' + p.mean +
    ' · 최소 ' + p.min + ' · 최대 ' + p.max + ' · 최대/최소 ' + p.ratio +
    '\n        ' + p.vals.map(v => v.id + ' ' + v.d).join(' · ')));
  ok(true, 'ⓑ1 등급 안 최대/최소 비', B.map(p => 'g' + p.g + ' ' + p.ratio).join(' / '));
  ok(true, 'ⓑ2 등급 평균의 등급 간 비(gWear 앞의 기준선)',
     B.slice(1).map((p, i) => 'g' + B[i].g + '→g' + p.g + ' ' + (p.mean / B[i].mean).toFixed(3)).join(' / '));
  /* 484 전 = 1.86~2.94(등재문 확인) · 484 후 = 1.00x. 방향을 단언하지 않고 값만 찍는다 —
     이 파일은 «재현 기록» 이고, 통과/실패를 묻는 자는 `verify484` 다. */
  ok(true, 'ⓑ3 등급 안 DPS 최대 편차', String(Math.max(...B.map(p => p.ratio))));

  /* ── ⓒ 펫 «장착만으로 붙는 스탯 %» 축이 있는가 ─────────── */
  const C = await page.evaluate(() => {
    const p = PETS.find(x => x.g === 4);
    S.own[p.id] = { l: 1 };                       /* 보유는 켠 채로 — 장착 축만 본다 */
    S.eqPet = []; markDirty();
    const off = stat.dmg;                          /* stat 은 전부 getter — markDirty 하나면 다시 센다 */
    S.eqPet = [p.id]; markDirty();
    const on = stat.dmg;
    S.eqPet = []; delete S.own[p.id]; markDirty();
    return { id: p.id, off, on, delta: +(on - off).toFixed(6),
             ratio: +(on / off).toFixed(4) };
  });
  /* 수리 전에는 Δ0 이 정상(= 축이 없다)이고, 485 이후에는 Δ>0 이 정상이다. 둘 다 그대로 찍는다. */
  ok(true, 'ⓒ1 펫 장착만으로 stat.dmg 가 오르는가(485 전 = Δ0 / 후 = Δ>0)',
     C.id + ' 해제 ' + C.off.toFixed(3) + ' → 장착 ' + C.on.toFixed(3) + ' (×' + C.ratio + ')');

  /* ── ⓓ 규모(199 이관 근거) ─────────────────────────────── */
  const D = await page.evaluate(() => {
    const out = { gWearTop: gWear(7), jump: GRADE_JUMP, lvStep: LV_STEP, lv1: lvWear(1) };
    /* 199 이관 근거 — «한 벌»(불멸 장비 3 + 불멸 펫 3 + 신화 스킬 8) 을 Lv1 로 끼운 전투력.
       주인이 199 에서 «과금 한 벌» 을 목표로 잡아 뒀으므로 그 한 벌의 크기를 숫자로 남긴다. */
    const eqIds = SLOTS.map(s => EQUIPS.find(e => e.slot === s.k && e.g === 7));
    const pets  = PETS.filter(p => p.g === 7).concat(PETS.filter(p => p.g === 6).slice(-2));
    const sks   = SKILLS.filter(s => s.g === 5).slice(0, 8);
    const keepEq = Object.assign({}, S.eqSlot), keepPet = S.eqPet.slice(), keepSk = S.eqSkill.slice();
    S.eqSlot = { weapon: null, shield: null, amulet: null }; S.eqPet = []; S.eqSkill = []; markDirty();
    out.cpBare = cp();
    eqIds.concat(pets, sks).forEach(x => { S.own[x.id] = { l: 1 }; });
    SLOTS.forEach((s, i) => { S.eqSlot[s.k] = eqIds[i].id; });
    S.eqPet = pets.map(p => p.id); S.eqSkill = sks.map(s => s.id); markDirty();
    out.cpSet = cp();
    eqIds.concat(pets, sks).forEach(x => { delete S.own[x.id]; });
    S.eqSlot = keepEq; S.eqPet = keepPet; S.eqSkill = keepSk; markDirty();
    out.ratio = out.cpSet / Math.max(1, out.cpBare);
    return out;
  });
  ok(true, 'ⓓ1 현행 착용 계단 누적(g0→g7)', '×' + D.gWearTop + ' (등급당 ×' + D.jump + ')');
  ok(true, 'ⓓ2 레벨 축 lvWear(1)', D.lv1.toFixed(3) + ' (Lv당 +' + (D.lvStep * 100).toFixed(1) + '%)');
  ok(true, 'ⓓ3 «한 벌»(불멸 장비 3 + 최상위 펫 3 + 신화 스킬 8, 전부 Lv1) 전투력 — 199 이관 근거',
     '맨몸 ' + D.cpBare.toExponential(3) + ' → 한 벌 ' + D.cpSet.toExponential(3)
     + ' (×' + D.ratio.toExponential(3) + ')');

  ok(errs.length === 0, 'ⓔ 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
