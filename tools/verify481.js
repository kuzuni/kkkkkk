#!/usr/bin/env node
/* 481 검증 — «펫 피해량 = 플레이어 공격력 · 등급은 공격 주기만»
 *
 *   node tools/verify481.js   → 마지막 줄이 `VERIFY481 n/n PASS` 여야 한다.
 *
 * 저장소 주인 지시(2026-08-30): «펫의 피해량이 플레이어 공격력 대로 되게 해줘 걍.
 * 그리고 등급에 따라 공격주기만 좀 빨라지는식으로». 지시서 [3]-(가) 기계+기능 작업이라
 * 비평가 없이 헤드리스 실동작만 본다(레이아웃 0px 변경 — 08 설명문 한 줄만 글자가 바뀐다).
 *
 *   [A] 피해   36종 × 등급 × 강화 Lv 전수 — `petDmg` 가 전부 같다 · 기본 세이브에서 = `stat.dmg`
 *              · 피해 계수 축(PET_M·항목 m)이 저장소에서 사라졌다 · `gWear`·`lvWear` 를 안 탄다
 *   [B] 주기   PET_CD = 1.30 × (0.40/1.30)^(g/7) · 단조 감소 · 인접 등급 차 ≥ 8%
 *              · 36종 cd = PET_CD[g]/v · v = 자리 파생(대칭 계단) · 등급 안 단조 · 등급 경계 비역전
 *              · 개체차 폭 < 등급 한 칸 (경계 여유의 근거)
 *   [C] 도감축 `bonus().pet`(21 도감 «펫» 세트)은 살아 있다 — 등재문의 «보유 효과라 이중 적용» 기각
 *              (`probe481` ⓑ). 단계를 올리면 펫 피해가 그만큼 오르고, 보유로는 안 움직인다
 *   [D] 소비처 `stat.dps` · 전투 루프 발사 주기 · `power`/`tierScore` 가 전부 새 축을 본다
 *   [E] 표시   08 세부 팝업 표(«공격 주기»/«피해량») · 설명문 3줄 · 등급이 다른 두 펫의 주기가 다르다
 *   [F] 세이브 구 세이브(구 9종 보유·장착·강화 Lv)를 그대로 로드한다 — 이관 0줄이 정답
 *   [R] 되돌림 시험 — 축을 옛날로 되돌린 사본에서 [A]·[B] 가 실제로 빨개진다
 *   [G] 콘솔 에러 0건
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

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

async function open(browser, seed) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  if (seed) await page.addInitScript(s => { try { localStorage.setItem('idle_hunter_save_v4', s); } catch (_) {} }, seed);
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof PETS !== 'undefined'
    && typeof petDmg === 'function');
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await chromium.launch({ executablePath: p });
  }
  const { ctx, page, errs } = await open(browser, null);

  /* ── [A] 피해 ─────────────────────────────────────────────── */
  const A = await page.evaluate(() => {
    S.own = {}; S.coll = {}; markDirty();
    const rs = [];
    PETS.forEach(p => [0, 1, 40, 100].forEach(l => {
      if (l) S.own[p.id] = { l }; else delete S.own[p.id];
      markDirty();
      rs.push(petDmg(p) / stat.dmg);
      delete S.own[p.id]; markDirty();
    }));
    const uniq = [...new Set(rs.map(r => +r.toFixed(12)))];
    /* 등급·레벨을 «가짜 펫» 으로 직접 흔들어도 안 움직인다(gWear·lvWear 를 안 탄다) */
    const fake = GRADE.map((_, g) => petDmg({ g, cd: 1, id: '__z' }) / stat.dmg);
    return { n: rs.length, uniq, fake: [...new Set(fake.map(r => +r.toFixed(12)))] };
  });
  ok(A.uniq.length === 1 && A.uniq[0] === 1,
    'A1 36종 × Lv{0,1,40,100} = ' + A.n + '표본 전부 petDmg = stat.dmg (등급·자리·레벨 0)',
    '서로 다른 값 ' + A.uniq.length + '가지: ' + A.uniq.join('/'));
  ok(A.fake.length === 1 && A.fake[0] === 1, 'A2 등급을 직접 올려도 안 움직인다 — gWear·lvWear 를 안 탄다',
    A.fake.join('/'));
  ok(!/\bPET_M\b/.test(SRC.replace(/PET_M[·`]/g, '')) === false || SRC.indexOf('const PET_M') < 0,
    'A3 피해 계수 표 `PET_M` 선언이 저장소에 없다', SRC.indexOf('const PET_M') < 0 ? '0건' : '남아 있다');
  ok(!/\bm:\s*[0-9]/.test(SRC.slice(SRC.indexOf('const PET_NAMES'), SRC.indexOf('const PET_SP'))),
    'A4 PET_NAMES 36칸에 피해 계수 `m` 오버라이드 0건', '0건');
  ok(/const petDmg\s+= p => stat\.dmg \* bonus\(\)\.pet;/.test(SRC),
    'A5 `petDmg` 는 한 줄이다 — stat.dmg × 도감 펫 축');

  /* ── [B] 주기 ─────────────────────────────────────────────── */
  const B = await page.evaluate(() => {
    const want = GRADE.map((_, g) =>
      Math.round(PET_CD_TOP * Math.pow(PET_CD_END / PET_CD_TOP, g / (GRADE.length - 1)) * 100) / 100);
    const curveBad = PET_CD.filter((c, g) => Math.abs(c - want[g]) > 1e-9).length;
    const step = [];
    for (let g = 1; g < PET_CD.length; g++) step.push(PET_CD[g] / PET_CD[g - 1]);
    const tiers = GRADE.map((_, g) => PETS.filter(p => p.g === g));
    const vBad = [], cdBad = [], monoBad = [], edgeBad = [];
    tiers.forEach((t, g) => t.forEach((p, j) => {
      const wantV = Math.round((1 + (j - (t.length - 1) / 2) * PET_V_STEP) * 1000) / 1000;
      if (p.v !== wantV) vBad.push(p.id + ' v' + p.v + '≠' + wantV);
      if (Math.abs(p.cd - Math.round(PET_CD[g] / p.v * 1000) / 1000) > 1e-9) cdBad.push(p.id);
      if (j && !(p.cd < t[j - 1].cd)) monoBad.push(p.id);
    }));
    for (let g = 0; g + 1 < tiers.length; g++) {
      const lo = Math.min(...tiers[g].map(p => p.cd)), hi = Math.max(...tiers[g + 1].map(p => p.cd));
      if (!(lo > hi)) edgeBad.push('g' + g + '→g' + (g + 1) + ' ' + lo + '≤' + hi);
    }
    const vs = PETS.map(p => p.v);
    return { curveBad, step, worst: Math.max(...step), vBad, cdBad, monoBad, edgeBad,
             vSpan: Math.max(...vs) / Math.min(...vs), gStep: Math.max(...step),
             top: PET_CD[0], end: PET_CD[GRADE.length - 1], cd: PET_CD.join('·') };
  });
  ok(B.curveBad === 0, 'B1 PET_CD = 1.30 × (0.40/1.30)^(g/7) (소수 2자리)', B.cd);
  ok(B.top === 1.30 && B.end === 0.40, 'B2 일반 1.30초 → 불멸 0.40초', B.top + ' → ' + B.end);
  ok(B.worst <= 0.92, 'B3 인접 등급이 최소 ' + ((1 - B.worst) * 100).toFixed(1) + '% 빨라진다 (요구 ≥ 8%)',
    B.step.map(v => v.toFixed(3)).join('/'));
  ok(B.vBad.length === 0, 'B4 개체차 v = 1 + (j − (n−1)/2) × PET_V_STEP — 표가 아니라 자리에서 파생',
    B.vBad.slice(0, 3).join(' / ') || '36종 전부');
  ok(B.cdBad.length === 0, 'B5 36종 전부 cd = PET_CD[등급] / v (구 9종 오버라이드 0건)',
    B.cdBad.slice(0, 3).join(',') || '36종 전부');
  ok(B.monoBad.length === 0, 'B6 등급 안 자리가 뒤로 갈수록 빠르다 (260 규약 · 주기 축)',
    B.monoBad.slice(0, 3).join(',') || '위반 0');
  ok(B.edgeBad.length === 0, 'B7 등급 경계 비역전 — 그 등급 최속 < 다음 등급 최저속',
    B.edgeBad.join(' / ') || '위반 0');
  ok(B.vSpan < 1 / B.worst, 'B8 개체차 폭 < 등급 한 칸 (B7 이 성립하는 이유)',
    '×' + B.vSpan.toFixed(3) + ' < ×' + (1 / B.worst).toFixed(3));

  /* ── [C] 도감 «펫» 축이 살아 있다 (등재문 기각의 게이트) ──── */
  const C = await page.evaluate(() => {
    S.own = {}; S.coll = {}; markDirty();
    const p = PT['drag2'];
    S.own[p.id] = { l: 1 }; markDirty();
    const base = petDmg(p) / stat.dmg;
    const keys = COLL_SETS.filter(st => st.tab === 'pet').map(st => st.key);
    S.coll[keys[0]] = 1; markDirty();
    const one = petDmg(p) / stat.dmg;
    keys.forEach(k => { S.coll[k] = COLL_MAX_STEP; });
    markDirty();
    const full = petDmg(p) / stat.dmg;
    S.own = {}; S.coll = {}; markDirty();
    return { base, one, full, sets: keys.length, effN: COLL_EFFN.pet, has: COLL_BASE.pet.pet > 0 };
  });
  ok(C.base === 1 && C.one > C.base, 'C1 21 도감 «펫» 세트 한 단계가 펫 피해를 실제로 올린다',
    '×' + C.base + ' → ×' + C.one.toFixed(4));
  ok(C.full > C.one, 'C2 만단계까지 자란다 — 걷어냈으면 죽은 축이 될 자리였다',
    '×' + C.full.toFixed(2) + ' (' + C.sets + '세트)');
  ok(C.has && C.effN === '펫 피해', 'C3 세트 효과 이름이 실제 축과 같다', C.effN);

  /* ── [D] 소비처 ───────────────────────────────────────────── */
  const D = await page.evaluate(async () => {
    S.own = {}; S.coll = {}; markDirty();
    /* 757 이관 — «최고 등급 펫» 을 id 로 적어 두면 등급이 접히는 날 자가 통째로 죽는다
       (실제로 757 이 불멸 1종을 걷어내자 `PT['pet7_0']` 이 undefined 가 됐다).
       ⇒ 이름 대신 **가장 센 펫**(등급 → 등급 안 자리)을 데이터에서 고른다. */
    const a = PT['bird0'];
    const b = PETS.reduce((m, p) => (p.g > m.g || (p.g === m.g && p.j > m.j)) ? p : m, PETS[0]);
    S.own[a.id] = { l: 1 }; S.own[b.id] = { l: 1 };
    /* ⚠ 두 상태의 `stat.dps` 를 그냥 나누면 안 된다 — 펫을 «보유·장착» 하는 것만으로 `b.atk` 가
       움직인다(보유 효과 ownVal · 485 장착 효과 petEquipVal). 그래서 **스킬 칸을 비워** dps 를
       펫 항 하나로 만들고 **항등식**을 직접 확인한다. */
    S.eqSkill = [];
    S.eqPet = [a.id]; markDirty();
    const dpsA = stat.dps, wantA = petDmg(a) / a.cd * stat.critMul;
    S.eqPet = [b.id]; markDirty();
    const dpsB = stat.dps, wantB = petDmg(b) / b.cd * stat.critMul;
    /* 순위 자 — power·tierScore 가 «주기» 를 본다 */
    const pw = power(b, 'pet') / power(a, 'pet');
    const ts = tierScore(b, 'pet') / tierScore(a, 'pet');
    /* 전투 루프의 발사 주기 — syncPets() 가 만든 살아 있는 펫이 def.cd 를 읽는가 */
    S.eqPet = [b.id]; syncPets();
    const live = (typeof pets !== 'undefined' && pets[0]) ? pets[0].def.cd : null;
    S.eqPet = []; S.own = {}; syncPets(); markDirty();
    return { idA: Math.abs(dpsA - wantA) / wantA, idB: Math.abs(dpsB - wantB) / wantB,
             want: a.cd / b.cd, pw, ts, live, wantLive: b.cd };
  });
  ok(D.idA < 1e-9 && D.idB < 1e-9,
    'D1 `stat.dps` 의 펫 항 = petDmg / 주기 (스킬 칸을 비워 항등식으로 확인)',
    '상대 오차 ' + D.idA.toExponential(1) + ' / ' + D.idB.toExponential(1));
  ok(Math.abs(D.pw - D.want) < 1e-6 && Math.abs(D.ts - D.want) < 1e-6,
    'D2 `power(pet)`·`tierScore(pet)` 도 같은 축 (482 자동 선택 · 11 확률표 티어 가중)',
    'power ×' + D.pw.toFixed(3) + ' · tierScore ×' + D.ts.toFixed(3));
  ok(D.live === D.wantLive, 'D3 전투 루프의 펫이 새 주기를 그대로 쓴다', D.live + '초');

  /* ── [E] 표시 ─────────────────────────────────────────────── */
  const E = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = s => ((document.querySelector(s) || {}).textContent || '').trim();
    const a = PT['bird0'];                       /* 757 이관 — 위 [D] 와 같은 이유 */
    const b = PETS.reduce((m, p) => (p.g > m.g || (p.g === m.g && p.j > m.j)) ? p : m, PETS[0]);
    S.own[a.id] = { l: 5 }; S.own[b.id] = { l: 5 }; markDirty();
    closeModal(); showItem(a.id); await sleep(160);
    const o = { hd: t('#mbox .sk-ct .hd .nt b'), vl: t('#mbox .sk-ct .vl .nt b'),
                cdA: t('#mbox .sk-ct .hd .nt em') || '' };
    const em = [].map.call(document.querySelectorAll('#mbox .sk-db p em'), e => e.textContent.trim());
    o.emA = em.slice();
    o.lines = (document.querySelector('#mbox .sk-db p') || { innerHTML: '' }).innerHTML.split('<br>').length;
    closeModal(); showItem(b.id); await sleep(160);
    o.emB = [].map.call(document.querySelectorAll('#mbox .sk-db p em'), e => e.textContent.trim());
    o.vlB = t('#mbox .sk-ct .vl .nt b');
    /* 기대값도 제품에서 만든다 — 08 세부가 쓰는 그 식(`it.cd.toFixed(2) + '초'`) 그대로 */
    o.wantA = a.cd.toFixed(2) + '초'; o.wantB = b.cd.toFixed(2) + '초';
    o.topName = b.n + '(' + GRADE[b.g].n + ')';
    closeModal();
    delete S.own[a.id]; delete S.own[b.id]; markDirty();
    return o;
  });
  ok(E.hd === '피해량', 'E1 08 세부 표 헤더 «피해량»', E.hd);
  ok(E.lines === 3, 'E2 설명문 3줄 유지 (`.sk-db` 750×290 고정)', String(E.lines));
  /* 757 이관 — «0.40초» 는 불멸 칸의 값이었다. 값을 손으로 적는 대신 제품의 식과 대조하고,
     «등급마다 다르다» 는 성질은 두 값이 실제로 갈리는 것으로 못박는다(333 처방). */
  ok(E.emA[0] === E.wantA && E.emB[0] === E.wantB && E.emA[0] !== E.emB[0],
    'E3 «주기» 가 등급마다 다르게 찍힌다 (일반 꼬마 새 ↔ ' + E.topName + ')',
    E.emA[0] + ' ↔ ' + E.emB[0]);
  ok(E.vl === E.vlB, 'E4 «피해량» 칸은 두 등급이 같은 값 — 화면이 새 규칙을 말한다', E.vl + ' = ' + E.vlB);

  /* ── [F] 구 세이브 ────────────────────────────────────────── */
  await ctx.close();
  const seed = JSON.stringify({
    v: 1, time: Date.now(),
    own: { bird0: { l: 7 }, robo2: { l: 12 }, drag2: { l: 30 } },
    eqPet: ['bird0', 'robo2', 'drag2'], gold: 1e6, dia: 1000
  });
  const F0 = await open(browser, seed);
  const F = await F0.page.evaluate(() => ({
    own: ['bird0', 'robo2', 'drag2'].map(id => (S.own[id] || {}).l).join(','),
    eq: (S.eqPet || []).join(','),
    cds: ['bird0', 'robo2', 'drag2'].map(id => PT[id].cd).join(','),
    live: (typeof pets !== 'undefined' ? pets.length : -1)
  }));
  ok(F.own === '7,12,30', 'F1 구 세이브의 보유·강화 Lv 가 그대로다 (이관 0줄이 정답)', F.own);
  ok(F.eq === 'bird0,robo2,drag2', 'F2 장착 3마리 그대로', F.eq);
  ok(F.cds === '1.3,0.78,0.577', 'F3 그 세 마리의 주기는 새 표에서 나온다', F.cds);
  ok(F.live === 3, 'F4 전투에 펫 3마리가 실제로 선다', String(F.live));
  ok(F0.errs.length === 0, 'F5 구 세이브 로드 콘솔 에러 0건', F0.errs.slice(0, 2).join(' | ') || '0건');
  await F0.ctx.close();

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────
     «무르게 풀지 않았음» 을 못 박는다. 축을 옛날로 되돌린 **사본**을 페이지 안에서 만들어
     [A]·[B] 의 단언이 실제로 거짓이 되는지 본다(파일은 안 건드린다). */
  const R0 = await open(browser, null);
  const R = await R0.page.evaluate(() => {
    /* R1 — 피해에 등급 계단을 도로 얹으면 «전 펫 같은 피해» 가 깨진다 */
    const old = p => stat.dmg * gWear(p.g) * bonus().pet;
    const rs = [...new Set(PETS.map(p => +(old(p) / stat.dmg).toFixed(9)))];
    /* R2 — 주기를 구 곡선(1.30 × mul^-0.20)으로 되돌리면 인접 차가 8% 밑으로 내려간다 */
    const oldCd = GRADE.map(g => Math.round(1.30 * Math.pow(g.mul, -0.20) * 100) / 100);
    const step = [];
    for (let g = 1; g < oldCd.length; g++) step.push(oldCd[g] / oldCd[g - 1]);
    /* R3 — 개체차를 구 폭(0.90~1.15)으로 벌리면 등급 경계가 뒤집힌다 */
    const wideEdge = [];
    for (let g = 0; g + 1 < GRADE.length - 1; g++) {
      const lo = PET_CD[g] / 1.15, hi = PET_CD[g + 1] / 0.90;
      if (!(lo > hi)) wideEdge.push('g' + g);
    }
    return { uniq: rs.length, worstOld: Math.max(...step), wideEdge: wideEdge.length };
  });
  ok(R.uniq > 1, '§R1 피해에 등급 계단을 도로 얹으면 A1 이 빨개진다', '서로 다른 값 ' + R.uniq + '가지');
  ok(R.worstOld > 0.92, '§R2 구 주기 곡선으로 되돌리면 B3(≥ 8%) 이 빨개진다',
    '최대 인접비 ' + R.worstOld.toFixed(4));
  ok(R.wideEdge > 0, '§R3 개체차를 0.90~1.15 로 벌리면 B7(경계 비역전) 이 빨개진다',
    R.wideEdge + '경계');
  ok(R0.errs.length === 0, '§R4 되돌림 시험 자체는 콘솔 에러 0건', R0.errs.slice(0, 2).join(' | ') || '0건');
  await R0.ctx.close();

  ok(errs.length === 0, 'G1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY481 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
