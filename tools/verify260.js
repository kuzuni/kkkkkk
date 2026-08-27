#!/usr/bin/env node
/* 260 검증 — «같은 등급 안에서 1번째가 제일 약하고 마지막이 제일 세다»
 *
 *   node tools/verify260.js
 *
 * 저장소 주인 보고(2026-08-27): «같은 등급 안에서 1번째가 제일 약하고 5번째가 제일 세다» 가
 * 안 지켜진다 — 장착 효과가 뒤죽박죽(장비·스킬·펫 전부).
 * 요구 규칙: 등급 안에서 자리가 뒤로 갈수록 세지고, **그 등급 마지막 < 다음 등급 첫째** 여야 한다.
 * 스킬은 주인 추가 지시로 완화 — 오름차순을 강제하지 않고 «등급 안 세기 편차»만 조인다.
 *
 * 검사 항목:
 *   [A] 장비 — 24티어(3부위 × 8등급) 전부 `v` 단조 증가 · 등급 경계 비역전(gWear × v)
 *              · `power(it)` 순서 = 배열 순서 · v 전부 0.90~1.15
 *   [B] 펫   — 8티어 전부 «세기»(m/cd) 단조 증가 · 등급 경계 비역전 · 구 9종 m·cd 보존(106 A5 재확인)
 *   [C] 스킬 — 등급 안 `m × hits / cd` 최대/최소 ≤ 3.0 (오름차순은 요구하지 않는다)
 *   [D] id 짝 보존 — 재배치가 id↔이름·수치 짝을 안 바꿨다(구 세이브 안전).
 *                   구 54종 장비 id + 구 9종 펫 id 전부 생존 · id 유일 · 총 144종
 *   [E] 나열 순서 — 05 무기 격자(`#wpnGrid`)의 DOM 순서 · 21 도감 세트 32개의 구성원 순서가
 *                  배열(= 약→강) 순서와 같다
 *   [F] 구 세이브 — 옛 id 로 보유·장착·강화 Lv 를 저장한 세이브가 그대로 살아난다
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

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SK_RATIO_MAX = 3.0;   /* [C] 등급 안 세기 편차 상한 — index.html SKILLS 주석의 «기준선» 과 한 벌 */
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
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof EQUIPS !== 'undefined'
    && typeof PETS !== 'undefined' && typeof SKILLS !== 'undefined' && typeof renderUI === 'function');
  await page.waitForTimeout(800);

  /* ── [A] 장비 ───────────────────────────────────────────── */
  const A = await page.evaluate(() => {
    const badMono = [], badEdge = [], badPow = [];
    SLOTS.forEach(s => {
      const tiers = GRADE.map((_, g) => EQUIPS.filter(e => e.slot === s.k && e.g === g));
      tiers.forEach((t, g) => {
        for (let j = 1; j < t.length; j++)
          if (!(t[j].v > t[j - 1].v)) badMono.push(s.k + 'g' + g + '[' + j + '] ' + t[j - 1].v + '→' + t[j].v);
        /* «세기» 는 실제로 장착값을 고르는 함수(power)로 잰다 — 배열 순서와 같아야 한다 */
        for (let j = 1; j < t.length; j++)
          if (!(power(t[j]) > power(t[j - 1]))) badPow.push(s.k + 'g' + g + '[' + j + ']');
      });
      for (let g = 0; g + 1 < tiers.length; g++) {
        if (!tiers[g].length || !tiers[g + 1].length) continue;
        const hi = gWear(g) * Math.max(...tiers[g].map(e => e.v));
        const lo = gWear(g + 1) * Math.min(...tiers[g + 1].map(e => e.v));
        if (!(hi < lo)) badEdge.push(s.k + ' g' + g + '→g' + (g + 1) + ' ' + hi.toFixed(3) + '≥' + lo.toFixed(3));
      }
    });
    return {
      badMono, badEdge, badPow,
      total: EQUIPS.length,
      vBad: EQUIPS.filter(e => !(e.v >= 0.90 && e.v <= 1.15)).length,
      /* 폭 여유 — v 최대/최소가 등급 배수 최소 비보다 작아야 경계가 안 뒤집힌다 */
      vSpan: Math.max(...EQUIPS.map(e => e.v)) / Math.min(...EQUIPS.map(e => e.v)),
      gSpan: Math.min(...GRADE.slice(1).map((x, i) => x.mul / GRADE[i].mul))
    };
  });
  ok(A.total === 108, 'A1 장비 108종', String(A.total));
  ok(A.badMono.length === 0, 'A2 24티어 전부 v 단조 증가(1번째가 최약)', A.badMono.slice(0, 4).join(' / ') || '위반 0');
  ok(A.badPow.length === 0, 'A3 power() 순서 = 배열 순서', A.badPow.slice(0, 4).join(' / ') || '위반 0');
  ok(A.badEdge.length === 0, 'A4 등급 경계 비역전(그 등급 최강 < 다음 등급 최약)', A.badEdge.slice(0, 3).join(' / ') || '위반 0');
  ok(A.vBad === 0, 'A5 v 전부 0.90~1.15', '위반 ' + A.vBad);
  ok(A.vSpan < A.gSpan, 'A6 개체차 폭 < 등급 배수 최소 비(경계 여유)',
    A.vSpan.toFixed(3) + ' < ' + A.gSpan.toFixed(3));

  /* ── [B] 펫 ─────────────────────────────────────────────── */
  const B = await page.evaluate(() => {
    const str = p => p.m / p.cd;                       /* power(p,'pet') 와 같은 순서(공통 배수만 다르다) */
    const badMono = [], badEdge = [];
    const tiers = GRADE.map((_, g) => PETS.filter(p => p.g === g));
    tiers.forEach((t, g) => {
      for (let j = 1; j < t.length; j++)
        if (!(str(t[j]) > str(t[j - 1])))
          badMono.push('g' + g + '[' + j + '] ' + str(t[j - 1]).toFixed(3) + '→' + str(t[j]).toFixed(3));
    });
    for (let g = 0; g + 1 < tiers.length; g++) {
      if (!tiers[g].length || !tiers[g + 1].length) continue;
      const hi = Math.max(...tiers[g].map(str)), lo = Math.min(...tiers[g + 1].map(str));
      if (!(hi < lo)) badEdge.push('g' + g + '→g' + (g + 1) + ' ' + hi.toFixed(3) + '≥' + lo.toFixed(3));
    }
    /* 106 A5 재확인 — 재배치는 «자리만» 옮긴 것이라 구 9종 수치가 그대로여야 한다 */
    const OLD = { bird0: [0.45, 1.30], bird1: [0.60, 1.20], robo0: [0.65, 1.40], bird2: [0.85, 1.10],
                  robo1: [0.95, 1.20], drag0: [1.30, 1.10], robo2: [1.40, 1.00], drag1: [2.20, 0.95],
                  drag2: [3.40, 0.80] };
    const oldBad = Object.keys(OLD).filter(id => {
      const p = PT[id];
      return !p || Math.abs(p.m - OLD[id][0]) > 1e-9 || Math.abs(p.cd - OLD[id][1]) > 1e-9;
    });
    return { badMono, badEdge, oldBad, total: PETS.length,
             dist: tiers.map(t => t.length).join(',') };
  });
  ok(B.total === 36 && B.dist === '5,5,5,5,5,5,5,1', 'B1 펫 36종 · 분포 5,5,5,5,5,5,5,1', B.dist);
  ok(B.badMono.length === 0, 'B2 8티어 전부 세기(m/cd) 단조 증가', B.badMono.slice(0, 4).join(' / ') || '위반 0');
  ok(B.badEdge.length === 0, 'B3 등급 경계 비역전', B.badEdge.join(' / ') || '위반 0');
  ok(B.oldBad.length === 0, 'B4 구 9종 m·cd 보존(106 A5)', B.oldBad.join(',') || '전부 일치');

  /* ── [C] 스킬 ───────────────────────────────────────────── */
  const C = await page.evaluate(max => {
    /* stat.dps 가 실제로 쓰는 식 그대로 — 등급 안 상대 비교라 gWear·lvWear 는 약분된다 */
    const dpsOf = s => {
      const hits = s.id === 'shuri' ? 8 : s.id === 'bolt' ? 3
                 : s.id === 'multi' ? Math.min(3 + Math.floor(oLv('multi') / 2), 9)
                 : s.hits || 1;
      return s.cd > 0 ? s.m * hits / s.cd : s.m * 3;
    };
    const rows = [];
    GRADE.forEach((_, g) => {
      const t = SKILLS.filter(s => s.g === g && !s.sup);
      if (t.length < 2) return;
      const d = t.map(dpsOf);
      rows.push({ g, n: t.length, ratio: Math.max(...d) / Math.min(...d),
                  lo: t[d.indexOf(Math.min(...d))].n, hi: t[d.indexOf(Math.max(...d))].n });
    });
    return { rows, over: rows.filter(r => r.ratio > max + 1e-9) };
  }, SK_RATIO_MAX);
  C.rows.forEach(r => console.log('     g' + r.g + ' n=' + r.n + ' 최대/최소=' + r.ratio.toFixed(2)
    + '  (최약 ' + r.lo + ' · 최강 ' + r.hi + ')'));
  ok(C.over.length === 0, 'C1 스킬 등급 안 세기 편차 ≤ ' + SK_RATIO_MAX.toFixed(1),
    C.over.map(r => 'g' + r.g + '=' + r.ratio.toFixed(2)).join(' / ') || '전 등급 기준선 안');

  /* ── [D] id 짝 보존 ─────────────────────────────────────── */
  const D = await page.evaluate(() => {
    const ids = EQUIPS.map(e => e.id).concat(PETS.map(p => p.id));
    const oldCnt = [4, 4, 3, 3, 2, 2];                 /* 75 시절 등급별 종수 — 구 세이브가 이 id 로 저장돼 있다 */
    const oldEq = [];
    SLOTS.forEach(s => oldCnt.forEach((n, g) => { for (let j = 0; j < n; j++) oldEq.push(s.k + g + (j ? '_' + j : '')); }));
    const oldPt = ['bird0', 'bird1', 'bird2', 'robo0', 'robo1', 'robo2', 'drag0', 'drag1', 'drag2'];
    /* 자리(j)가 바뀌었으므로 «id 를 자리에서 파생» 하는 코드가 남아 있으면 안 된다 —
       파생식으로 만든 id 가 실제 id 와 어긋나는 항목 수를 센다(0 이면 전부 명시 id 를 쓴 것). */
    const derivedMismatch = EQUIPS.filter(e => e.id !== (e.slot + e.g + (e.j ? '_' + e.j : ''))).length;
    return {
      total: ids.length, uniq: new Set(ids).size === ids.length,
      oldEqMiss: oldEq.filter(id => !EQ[id]).length,
      oldPtMiss: oldPt.filter(id => !PT[id]).length,
      derivedMismatch
    };
  });
  ok(D.total === 144 && D.uniq, 'D1 장비 108 + 펫 36 = 144종 · id 유일', String(D.total));
  ok(D.oldEqMiss === 0, 'D2 구 54종 장비 id 전부 생존', '누락 ' + D.oldEqMiss);
  ok(D.oldPtMiss === 0, 'D3 구 9종 펫 id 전부 생존', '누락 ' + D.oldPtMiss);
  ok(D.derivedMismatch > 0, 'D4 재배치가 실제로 일어났다(파생식 id ≠ 실제 id 인 항목 존재)',
    D.derivedMismatch + '종');

  /* ── [E] 나열 순서 ──────────────────────────────────────── */
  const E = await page.evaluate(() => {
    /* 격자는 «행 = 등급 · 칸 = 그 등급의 항목»이고 8등급 행은 1종 + 잠금 더미 4칸이라
       칸 수는 항상 8×5 = 40 이다. 대조 대상은 «실제 항목이 박힌 칸»의 순서다.
       미보유 칸에는 `data-wpn` 이 안 붙으므로 전 종을 보유로 만들어 놓고 읽는다. */
    const bak = JSON.stringify(S.own);
    EQUIPS.forEach(e => { if (!S.own[e.id]) S.own[e.id] = { n: 0, l: 1 }; });
    openWeapon(null, 'weapon');
    const g = document.getElementById('wpnGrid');
    const cells = [...g.children];
    const got = cells.map(c => c.getAttribute('data-wpn')).filter(Boolean);
    const want = EQUIPS.filter(e => e.slot === 'weapon').map(e => e.id);
    const html = g.innerHTML;
    closeWeapon();
    S.own = JSON.parse(bak);
    const bad = [];
    want.forEach((id, i) => { if (got[i] !== id) bad.push('#' + i + ' ' + (got[i] || '없음') + '≠' + id); });
    return { cells: cells.length, got: got.length, want: want.length, bad,
             badTxt: /NaN|undefined/.test(html) };
  });
  ok(E.cells === 40 && E.got === E.want, 'E1 05 무기 격자 8행 40칸 · 실항목 칸 = 무기 종 수',
    E.cells + '칸 / 실항목 ' + E.got + '=' + E.want);
  ok(E.bad.length === 0, 'E2 격자 DOM 순서 = 배열(약→강) 순서', E.bad.slice(0, 4).join(' / ') || '전 칸 일치');
  ok(!E.badTxt, 'E3 격자 NaN/undefined 0건');

  /* E4 — 21 도감 세트도 같은 순서로 보이는가. `COLL_SETS.it` 은 EQUIPS/PETS 를 그대로 걸러 만들므로
     배열 순서가 곧 도감 나열 순서다 — 나중에 누가 정렬을 끼워 넣으면 여기서 잡힌다. */
  const E4 = await page.evaluate(() => {
    const bad = []; let seen = 0;
    COLL_SETS.forEach(st => {
      const src = st.cat === 'equip' ? EQUIPS.filter(e => e.slot === st.tab && ('equip:' + e.slot + ':' + e.g) === st.key)
                : st.cat === 'pet'   ? PETS.filter(p => ('pet:' + p.g) === st.key)
                : null;
      if (!src) return;
      const want = src.map(e => e.id).join(',');
      seen++;
      if (st.it.join(',') !== want) bad.push(st.key);
    });
    return { bad, seen, total: COLL_SETS.length };
  });
  ok(E4.bad.length === 0 && E4.seen === 32, 'E4 21 도감 세트 나열 순서 = 배열(약→강) 순서',
    E4.bad.slice(0, 4).join(' / ') || ('장비 24 + 펫 8 = ' + E4.seen + '세트 대조 · 전부 일치'));

  /* ── [F] 구 세이브 ──────────────────────────────────────── */
  const F = await page.evaluate(() => {
    const raw = localStorage.getItem(KEY);
    const s = JSON.parse(raw);
    /* 옛 id 로 보유·장착·강화 Lv 를 박아 넣는다 — 재배치 뒤에도 그대로 살아야 한다 */
    s.own = Object.assign({}, s.own, { weapon2: { n: 0, l: 7 }, weapon2_1: { n: 0, l: 3 },
                                       bird0: { n: 0, l: 5 }, robo2: { n: 0, l: 9 },
                                       shield4_3: { n: 0, l: 2 } });
    s.eqSlot = Object.assign({}, s.eqSlot, { weapon: 'weapon2' });
    s.eqPet = ['bird0', 'robo2'];
    localStorage.setItem(KEY, JSON.stringify(s));
    load();
    return {
      lv: oLv('weapon2'), lv2: oLv('robo2'), lv3: oLv('shield4_3'),
      eq: S.eqSlot.weapon, pets: (S.eqPet || []).join(','),
      nm: (EQ['weapon2'] || {}).n, nm2: (PT['robo2'] || {}).n,
      names: (EQ['weapon2_1'] || {}).n
    };
  });
  ok(F.lv === 7 && F.lv2 === 9 && F.lv3 === 2, 'F1 옛 id 강화 Lv 유지', [F.lv, F.lv2, F.lv3].join('/'));
  ok(F.eq === 'weapon2' && F.pets === 'bird0,robo2', 'F2 옛 id 장착 유지', F.eq + ' · ' + F.pets);
  ok(F.nm === '기사의 대검' && F.nm2 === '파괴 병기' && F.names === '은빛 세이버',
    'F3 id↔이름 짝 불변', [F.nm, F.nm2, F.names].join(' · '));

  /* ── [G] 콘솔 에러 ──────────────────────────────────────── */
  ok(errs.length === 0, 'G1 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY260 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
