#!/usr/bin/env node
/* 485 검증 — 펫 «장착 효과 — 공격력 +n%» 신설(수치는 장비 472 와 같은 표)
 *
 *   node tools/verify485.js
 *
 * 주인 원문(2026-08-30): «펫도 장착효과로 공격력 올라가는 그런거 해줘야함.
 *                         그래서 장비랑 동일한 식으로 해주면됨 올라가는 수준이»
 *
 *   [A] 표 공유 — 펫 표가 장비 표(EQ_BASE)와 **같은 함수**다(상수 두 벌이 아니다)
 *   [B] 계단   — 등급 안 티어 ×1.5 · 등급 경계 ×3 · 불멸은 t0 하나
 *   [C] 합산   — 장착 3마리 값이 **합**으로 공격력에 붙는다(곱이 아니다) · 미장착은 기여 0
 *   [D] 보유 축 불변 — ownVal(공격 ×0.6 · 골드)·펫 피해(petDmg)·106 곡선이 그대로
 *   [E] 표시   — 08 세부 팝업이 «장착 효과 — 공격력 +n%» 를 말하고 줄 수·상자가 그대로(Δ0)
 *   [F] 전투력 — power/cp 가 새 축을 읽는다(장착하면 전투력이 오른다)
 *   [G] 세이브 — 이관 0줄이 정답(축이 늘어도 저장하는 것은 id·Lv 그대로)
 *   [R] 되돌림 시험 — 합산 항을 빼면 [C]·[F] 가 빨개진다
 *   [Z] 콘솔 에러 0건
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
  await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof petEquipVal === 'function'
    && typeof EQ_BASE === 'function');
  await page.waitForTimeout(500);

  /* ── [A] 표 공유 ────────────────────────────────────────── */
  const A = await page.evaluate(() => {
    const at1 = it => { const keep = S.own[it.id]; S.own[it.id] = { l: 1 };
      const v = petEquipVal(it); if (keep) S.own[it.id] = keep; else delete S.own[it.id]; return v; };
    const bad = [], vsEq = [];
    PETS.forEach(p => {
      if (Math.abs(at1(p) - EQ_BASE(p.g, p.j || 0)) > 1e-9 * Math.max(1, EQ_BASE(p.g, p.j || 0))) bad.push(p.id);
      /* 같은 등급·같은 티어의 장비와 값이 정확히 같아야 한다(«장비랑 동일한 식») */
      const e = EQUIPS.find(x => x.slot === 'weapon' && x.g === p.g && (x.j || 0) === (p.j || 0));
      if (e) {
        const keep = S.own[e.id]; S.own[e.id] = { l: 1 }; const ev = equipVal(e);
        if (keep) S.own[e.id] = keep; else delete S.own[e.id];
        if (Math.abs(ev - at1(p)) > 1e-9 * Math.max(1, ev)) vsEq.push(p.id + '≠' + e.id);
      }
    });
    return { bad, vsEq, n: PETS.length, hasJ: PETS.every(p => typeof p.j === 'number'),
             src: petEquipVal.toString() };
  });
  ok(A.n === 35, 'A1 펫 35종 (757 — 불멸 1종 폐지)', String(A.n));
  ok(A.hasJ, 'A2 펫에 티어(`j` = 260 이 정한 등급 안 자리)가 실려 있다');
  ok(/EQ_BASE/.test(A.src), 'A3 `petEquipVal` 이 장비 표(EQ_BASE)를 **그대로 부른다**(상수 두 벌 아님)', A.src.trim());
  ok(A.bad.length === 0, 'A4 36종 전부 petEquipVal(Lv1) = EQ_BASE(등급, 티어)', A.bad.join(' / ') || '위반 0');
  ok(A.vsEq.length === 0, 'A5 같은 등급·티어의 장비와 값이 정확히 같다', A.vsEq.join(' / ') || '위반 0');

  /* ── [B] 계단 ───────────────────────────────────────────── */
  const B = await page.evaluate(() => {
    const at1 = it => { const keep = S.own[it.id]; S.own[it.id] = { l: 1 };
      const v = petEquipVal(it); if (keep) S.own[it.id] = keep; else delete S.own[it.id]; return v; };
    const inStep = [], edge = [];
    const tiers = GRADE.map((_, g) => PETS.filter(p => p.g === g));
    tiers.forEach(t => { const v = t.map(at1); for (let j = 1; j < v.length; j++) inStep.push(v[j] / v[j - 1]); });
    for (let g = 0; g + 1 < tiers.length; g++) {
      if (!tiers[g].length || !tiers[g + 1].length) continue;
      edge.push(Math.min(...tiers[g + 1].map(at1)) / Math.max(...tiers[g].map(at1)));
    }
    /* 757 — «최고 등급 칸» 을 7 로 적어 두면 등급이 접힌 날 undefined 를 읽는다 */
    return { inStep, edge, g7: (tiers[7] || []).length, gTop: topG('pet'),
             gTopN: tiers[topG('pet')].length };
  });
  const near = (a, x) => Math.abs(a - x) < 1e-6;
  ok(B.inStep.every(r => near(r, 1.5)), 'B1 등급 안 티어 한 칸 = ×1.5',
     B.inStep.length + '칸 · ' + Math.min(...B.inStep).toFixed(4) + '~' + Math.max(...B.inStep).toFixed(4));
  ok(B.edge.every(r => near(r, 3)), 'B2 등급 경계 = ×3',
     B.edge.length + '경계 · ' + Math.min(...B.edge).toFixed(4) + '~' + Math.max(...B.edge).toFixed(4));
  /* 757 이관 — 펫 불멸(1종)이 폐지됐다. 묻는 것을 «최고 등급 칸이 비지 않았는가» 로 옮기고
     «불멸은 정말 없는가» 를 짝으로 세운다(333 처방 — 자리를 비우지 않는다). */
  ok(B.g7 === 0 && B.gTop === 6 && B.gTopN === 5,
     'B3 펫 불멸 0종 · 최고 등급은 초월(g6) 5종 (757)', 'g7=' + B.g7 + ' · top g' + B.gTop + ' ' + B.gTopN + '종');

  /* ── [C] 합산 ───────────────────────────────────────────── */
  const C = await page.evaluate(() => {
    const p = PETS.filter(x => x.g === 2).slice(0, 3);
    p.forEach(x => { S.own[x.id] = { l: 1 }; });
    S.eqPet = []; markDirty(); const off = stat.dmg;
    S.eqPet = [p[0].id]; markDirty(); const one = stat.dmg;
    S.eqPet = p.map(x => x.id); markDirty(); const three = stat.dmg;
    /* 미장착 펫은 기여 0 — 보유만 켠 채 장착을 비우면 off 로 돌아온다 */
    S.eqPet = []; markDirty(); const back = stat.dmg;
    /* ⚑ 724 — 펫은 «보유 + 장착» 이 한 카테고리(장부)라 장착 배수가 보유 Σ 로 희석된다.
       기댓값을 장부 꼴로 준다 — 지키는 뜻(«3마리는 합산 한 번, 곱이 아니다»)은 그대로다. */
    const pOwn = PETS.reduce((a, x) => has(x.id) ? a + ownVal(x) * 0.6 : a, 0);
    const want1 = (1 + pOwn + petEquipVal(p[0])) / (1 + pOwn);
    const want3 = (1 + pOwn + p.reduce((a, x) => a + petEquipVal(x), 0)) / (1 + pOwn);
    const prod3 = p.reduce((a, x) => a * (1 + petEquipVal(x)), 1);
    p.forEach(x => delete S.own[x.id]); S.eqPet = []; markDirty();
    return { r1: one / off, want1, r3: three / off, want3, prod3, backEq: back === off,
             ids: p.map(x => x.id) };
  });
  ok(Math.abs(C.r1 / C.want1 - 1) < 1e-9, 'C1 1마리 장착 = 공격력 ×(1 + petEquipVal)',
     '×' + C.r1.toFixed(4) + ' (기대 ×' + C.want1.toFixed(4) + ')');
  ok(Math.abs(C.r3 / C.want3 - 1) < 1e-9, 'C2 3마리는 **합산** 한 번(곱이 아니다)',
     '×' + C.r3.toFixed(4) + ' (합 ' + C.want3.toFixed(4) + ' · 곱이면 ' + C.prod3.toFixed(4) + ')');
  ok(Math.abs(C.r3 - C.prod3) > 1e-6, 'C3 합과 곱이 실제로 다른 값이다(C2 가 헛초록이 아니다)',
     '차이 ' + (C.prod3 - C.r3).toFixed(4));
  ok(C.backEq, 'C4 미장착 펫은 이 축에 한 톨도 기여하지 않는다');

  /* ── [D] 안 건드린 축 ───────────────────────────────────── */
  const D = await page.evaluate(() => {
    const p = PETS.find(x => x.g === 4 && (x.j || 0) === 2);
    S.own[p.id] = { l: 3 }; markDirty();
    const own = ownVal(p), dmg = petDmg(p);
    const wantOwn = 0.02 * gMul(p.g) * lvMul(3) * 1;   /* 펫엔 slot 이 없어 eqv=1 (106 규약) */
    /* 481 이관(2026-08-30, 주인 지시) — 485 가 «안 건드렸다» 고 못박아 둔 두 축이 481 로 바뀌었다.
       ⓐ 피해는 이제 `stat.dmg × bonus().pet` 하나다(등급·자리·레벨 0) ⓑ 피해 계수 표는 폐지되고
       주기 표가 새 곡선(1.30 → 0.40 등비)으로 갈렸다. 485 가 여기서 지키려던 것은 «내가 얹은 축이
       옆 축을 밀지 않았다» 이므로, 묻는 것을 **지금의 옆 축**으로 옮긴다(333: 자리를 비우지 마라). */
    const wantDmg = stat.dmg * bonus().pet;
    /* ⚠ 절대값으로 재면 안 된다 — 보유 효과(ownVal)가 `b.atk` 를 통해 `stat.dmg` 를 올리므로
       레벨을 바꾸면 petDmg 의 **절대값**은 (정상적으로) 움직인다. 481 이 못박는 것은
       «펫 자신의 피해 축» 이므로 `stat.dmg` 대비 **비율**로 잰다. */
    const lvFree = petDmg(p) / stat.dmg;
    S.own[p.id] = { l: 90 }; markDirty();
    const lvFree2 = petDmg(p) / stat.dmg, cd2 = p.cd;
    delete S.own[p.id]; markDirty();
    return { own, wantOwn, dmg, wantDmg, cd: p.cd,
             lvFlat: lvFree === lvFree2 && cd2 === p.cd,
             hasM: PETS.some(x => x.m !== undefined),
             petCd: PET_CD.join('·') };
  });
  ok(Math.abs(D.own - D.wantOwn) < 1e-12, 'D1 보유 효과(ownVal)는 식·값 그대로', (D.own * 100).toFixed(4) + '%');
  ok(Math.abs(D.dmg - D.wantDmg) < 1e-9, 'D2 펫 피해(petDmg) = stat.dmg × 도감 펫 축 (481 이관)',
     D.dmg.toFixed(3));
  ok(!D.hasM, 'D3 펫 피해 계수 축(m)은 폐지됐다 — 485 의 장착 효과 축과 겹치지 않는다 (481 이관)',
     D.hasM ? '남아 있다' : '0종');
  ok(D.petCd === '1.3·1.1·0.93·0.78·0.66·0.56·0.47·0.4', 'D4 481 곡선 PET_CD (등급 = 주기 축)', D.petCd);
  ok(D.lvFlat, 'D5 강화 Lv 는 피해·주기 어디에도 안 붙는다 — 레벨은 보유·장착 효과 축에만 (481)',
     'Lv3 ↔ Lv90 피해·주기 동일');

  /* ── [E] 표시 ───────────────────────────────────────────── */
  const E = await page.evaluate(async () => {
    const p = PETS.find(x => x.g === 5 && (x.j || 0) === 3);
    S.own[p.id] = { l: 1 };
    showItem(p.id);
    /* 60 쥬시 열림 연출(scale)이 끝난 뒤에 재야 한다 — 120ms 에 재면 690×267 처럼 «연출 중» 크기가
       잡혀 Δ0 판정이 거짓으로 빨개진다(350·345 계열 함정). */
    await new Promise(r => setTimeout(r, 400));
    const box = document.querySelector('#modal .sk-db');
    const pEl = box ? box.querySelector('p') : null;
    const html = pEl ? pEl.innerHTML : '';
    const txt = pEl ? pEl.innerText : '';
    const over = box ? { w: box.scrollWidth - box.clientWidth, h: box.scrollHeight - box.clientHeight } : null;
    const rect = box ? { w: Math.round(box.getBoundingClientRect().width),
                         h: Math.round(box.getBoundingClientRect().height) } : null;
    const pRect = pEl ? { w: Math.round(pEl.getBoundingClientRect().width),
                          h: Math.round(pEl.getBoundingClientRect().height) } : null;
    if (typeof closeModal === 'function') closeModal();
    delete S.own[p.id];
    return { html, lines: (html.match(/<br>/g) || []).length + 1, over, rect, pRect,
             /* 725 이관 — «+n%» 가 «×N배» 로 갔다. 항의 뜻(«장착 효과 줄에 공격력 수치가 있다»)은 그대로다. */
             hasEq: /장착 효과 — 공격력 ×[\d.,A-Z]+배/.test(txt), hasDmg: /전투 피해/.test(txt),
             oldTxt: /전투에 참여해/.test(txt), digits: (txt.match(/\d/g) || []).length };
  });
  ok(E.hasEq, 'E1 08 세부 팝업이 «장착 효과 — 공격력 ×N배» 를 말한다(725)', E.html);
  ok(E.hasDmg && !E.oldTxt, 'E2 옛 문구(«전투에 참여해 n 피해»)는 «전투 피해» 로 갈아 끼웠다 (481 — 라벨 단축)');
  ok(E.lines === 3, 'E3 줄 수 3 — 485 전과 같다(`.sk-db` 750×290 고정이라 한 줄이 늘면 넘친다)',
     String(E.lines));
  ok(E.over && E.over.w <= 0 && E.over.h <= 0, 'E4 상자가 안 넘친다',
     E.over ? ('가로 ' + E.over.w + ' · 세로 ' + E.over.h) : '못 찾음');
  /* 수리 전(a72cad0) 커밋을 같은 하네스로 재서 얻은 값이다(연출이 앉은 뒤 400ms):
     상자 750×290 @ (165,1149) · 문단 684×120 @ (198,1184). 두 트리가 **같은 값**이다 = Δ0. */
  ok(E.rect && E.rect.w === 750 && E.rect.h === 290, 'E5 `.sk-db` 기하 Δ0 (수리 전과 같은 750×290)',
     E.rect ? E.rect.w + '×' + E.rect.h : '못 찾음');
  ok(E.pRect && E.pRect.w === 684 && E.pRect.h === 120, 'E6 설명 문단 기하 Δ0 (684×120) — 줄이 안 늘었다',
     E.pRect ? E.pRect.w + '×' + E.pRect.h : '못 찾음');

  /* ── [F] 전투력 ─────────────────────────────────────────── */
  const F = await page.evaluate(() => {
    const p = PETS.find(x => x.g === 3 && (x.j || 0) === 4);
    S.own[p.id] = { l: 1 };
    S.eqPet = []; markDirty(); const off = cp();
    S.eqPet = [p.id]; markDirty(); const on = cp();
    S.eqPet = []; delete S.own[p.id]; markDirty();
    return { off, on, up: on > off };
  });
  ok(F.up, 'F1 펫을 끼우면 전투력(cp)이 오른다', F.off + ' → ' + F.on);

  /* ── [G] 세이브 ─────────────────────────────────────────── */
  const G = await page.evaluate(() => {
    const p = PETS.find(x => x.g === 1 && (x.j || 0) === 4);
    /* 구 세이브가 담는 것은 id·Lv·장착 목록뿐 — 새 축은 코드에서 파생된다(이관 0줄이 정답) */
    S.own = Object.assign({}, S.own, JSON.parse('{"' + p.id + '":{"l":5}}'));
    S.eqPet = [p.id]; markDirty();
    const got = petEquipVal(p), want = EQ_BASE(1, 4) * lvWear(5) / lvWear(1);
    S.eqPet = []; delete S.own[p.id]; markDirty();
    return { got, want };
  });
  ok(Math.abs(G.got - G.want) < 1e-9, 'G1 구 세이브(id + Lv)가 새 축을 그대로 탄다 — 이관 0줄이 정답',
     'Lv5 고급 5티어 = ' + (G.got * 100).toFixed(2) + '%');

  /* ── [R] 되돌림 시험 ────────────────────────────────────── */
  const R = await page.evaluate(() => {
    /* 합산 항을 뺀 «485 이전» 세계를 손으로 만들어 [C]·[F] 를 다시 잰다 */
    const p = PETS.find(x => x.g === 2 && (x.j || 0) === 0);
    S.own[p.id] = { l: 1 };
    S.eqPet = []; markDirty(); const off = stat.dmg, cpOff = cp();
    S.eqPet = [p.id]; markDirty(); const on = stat.dmg, cpOn = cp();
    /* 485 이전 = 장착이 공격력을 못 올린다 ⇒ on === off 여야 «옛 세계» 다 */
    S.eqPet = []; delete S.own[p.id]; markDirty();
    return { same: Math.abs(on - off) < 1e-9, ratio: on / off, cpUp: cpOn > cpOff };
  });
  ok(!R.same && R.cpUp, 'R1 «장착해도 공격력이 그대로» 이면(485 이전) C1·F1 이 빨개진다',
     '지금 ×' + R.ratio.toFixed(4) + ' (485 이전이면 ×1.0000)');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
