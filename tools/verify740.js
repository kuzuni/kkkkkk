#!/usr/bin/env node
/* 작업 740 게이트 — «불멸 = 그 카테고리의 최상위 단 1종 · 무한 강화» (장비)
 *
 *   node tools/verify740.js
 *
 * 주인 원문: «스킬도 맨마지막꺼 불멸 1개 있게 하기 … 장비 부분 보니까 불멸 아이템 5개 인거
 * 처럼 보이는데 실제로 1개니까 4개는 없애라».
 * ⚠ **스킬 항은 757 이 취소했다**(주인 지시 2026-09-02 05:55 — «스킬은 24종·만렙 100» + 조각 환급).
 *   그래서 이 자는 **장비 축만** 본다. 스킬 불멸을 되살리려는 회귀는 [A4] 가 잡는다.
 *
 * 재현(`probe740`)이 갈래를 갈랐다 — 불멸 종수는 **데이터에서 이미 부위당 1종**이었고
 * «5» 는 격자가 남는 칸을 잠금 더미로 채우던 표시였다(그린 칸 5 · 실물 칸 1). 그래서
 * 등재문이 준비해 둔 «4종 삭제 + 세이브 합산 이관 + KEY 올림» 은 **할 일이 없었다** —
 * 그 사실 자체를 [F] 가 구 세이브 실로드로 못박는다(402 선례: 이관 «없음» 이 정답임을 증명한다).
 *
 * 절:
 *   [A] 데이터  — 부위별 불멸 종수 1 · 최고 등급이 불멸 · 스킬/펫에는 불멸 없음(757)
 *   [B] 표시    — 05 격자 칸 수 = 종 수(등급별) · 불멸 행 1칸 · 더미 0칸
 *   [C] 자리    — 칸이 빠져도 남은 칸이 안 밀린다(x = 10 + j·170 · y = 32 + g·190)
 *   [D] 무한 강화 — maxLv 상한 없음 · 어떤 레벨에서도 atMax 거짓 · 08 세부에 «MAX» 안 뜸 ·
 *                  실제로 계속 오른다
 *   [E] 719 정합 — 불멸이 합성 종착지(nextTierItem = null · canCraft 거짓)
 *   [F] 세이브   — 이관 «없음» 이 정답: 구 세이브(불멸 보유·강화분)를 실로드해도 그대로다
 *   [R] 되돌림   — ①  종을 늘리면 칸이 따라 는다(칸 수를 «1» 로 못 박지 않았다)
 *                  ②  음성항: 상한이 있는 등급(초월)은 만렙에서 «MAX» 가 실제로 뜬다
 *                      (= [D] 의 «MAX 안 뜸» 이 공허한 초록이 아니다)
 *   [H] 콘솔 에러 0
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined && detail !== '' ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};
const PARTS = ['weapon', 'shield', 'amulet'];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openWeapon === 'function');
  await page.waitForTimeout(800);

  /* ── [A] 데이터 ────────────────────────────────────────────────── */
  const A2 = await page.evaluate(parts => {
    const topEq = EQUIPS.reduce((m, e) => Math.max(m, e.g), 0);
    return {
      topEq,
      gradeName: GRADE[topEq] ? GRADE[topEq].n : '?',
      per: parts.map(p => EQUIPS.filter(e => e.slot === p && e.g === topEq).length),
      ids: parts.map(p => (EQUIPS.find(e => e.slot === p && e.g === topEq) || {}).id),
      skillTop: SKILLS.reduce((m, x) => Math.max(m, x.g), 0),
      petTop:   PETS.reduce((m, x) => Math.max(m, x.g), 0),
      immortalG: GRADE.findIndex(g => g.n === '불멸')
    };
  }, PARTS);
  ok(A2.topEq === A2.immortalG && A2.gradeName === '불멸',
    'A1 장비의 최고 등급은 «불멸»', 'g' + A2.topEq + ' ' + A2.gradeName);
  ok(A2.per.every(n => n === 1), 'A2 부위별 불멸 종수 = 1',
    PARTS.map((p, i) => p + ':' + A2.per[i]).join(' · '));
  ok(A2.ids.every(Boolean), 'A3 부위마다 불멸 1종이 실재한다', A2.ids.join(','));
  /* 757 — 스킬 불멸 항은 취소됐다. 스킬·펫 최고 등급이 «불멸»(=장비 최고 등급) 로 올라오면
     740 의 취소된 항이 되살아난 것이므로 여기가 빨개진다. */
  ok(A2.skillTop < A2.immortalG && A2.petTop < A2.immortalG,
    'A4 757 정합 — 스킬·펫에는 불멸 등급이 없다',
    '스킬 g' + A2.skillTop + ' · 펫 g' + A2.petTop + ' < 불멸 g' + A2.immortalG);

  /* ── [B] 표시 — 격자 칸 수는 데이터가 정한다 ───────────────────── */
  const B = await page.evaluate(parts => {
    const out = {};
    for (const p of parts) {
      openWeapon(null, p);
      const g = document.getElementById('wpnGrid');
      const cells = [...g.children];
      const per   = GRADE.map((_, gi) => EQUIPS.filter(e => e.slot === p && e.g === gi).length);
      const drawn = GRADE.map((_, gi) => cells.filter(c => Math.round((c.offsetTop - 32) / 190) === gi).length);
      out[p] = { per, drawn, total: cells.length,
                 dummies: cells.filter(c => !c.dataset.wpn).length,
                 topRow: drawn[EQUIPS.reduce((m, e) => Math.max(m, e.g), 0)] };
      closeWeapon();
    }
    return out;
  }, PARTS);
  PARTS.forEach(p => {
    const b = B[p];
    ok(b.drawn.join(',') === b.per.join(','), 'B1 ' + p + ' — 등급별 칸 수 = 그 등급 종 수',
      '그림 ' + b.drawn.join(',') + ' vs 종 ' + b.per.join(','));
    ok(b.topRow === 1, 'B2 ' + p + ' — 불멸 행은 1칸(주인이 «5개» 로 본 그 행)', b.topRow + '칸');
    ok(b.dummies === 0, 'B3 ' + p + ' — 가리킬 것 없는 더미 칸 0', b.dummies + '칸');
  });

  /* ── [C] 자리 — 칸이 빠져도 남은 칸은 안 밀린다 ────────────────── */
  const C = await page.evaluate(parts => {
    const bad = [];
    for (const p of parts) {
      openWeapon(null, p);
      const g = document.getElementById('wpnGrid');
      [...g.children].forEach(c => {
        const it = EQUIPS.find(e => e.id === c.dataset.wpn);
        if (!it) { bad.push(p + ':더미'); return; }
        const wx = 10 + it.j * 170, wy = 32 + it.g * 190;
        if (c.offsetLeft !== wx || c.offsetTop !== wy)
          bad.push(p + ':' + it.id + ' ' + c.offsetLeft + ',' + c.offsetTop + ' ≠ ' + wx + ',' + wy);
      });
      closeWeapon();
    }
    return bad;
  }, PARTS);
  ok(C.length === 0, 'C1 전 칸 x=10+j·170 · y=32+g·190 (남은 칸이 왼쪽으로 안 밀린다)',
    C.length ? C.slice(0, 3).join(' | ') : '어긋남 0건');

  /* ── [D] 무한 강화 ─────────────────────────────────────────────── */
  const D = await page.evaluate(parts => {
    const out = {};
    for (const p of parts) {
      const it = EQUIPS.filter(e => e.slot === p).reduce((m, e) => (e.g > m.g ? e : m));
      const before = S.own[it.id] ? { ...S.own[it.id] } : null;
      S.own[it.id] = { n: 999999, l: MAX_LEVEL * 5 };            /* 만렙의 5배까지 올려 둔다 */
      const r = {
        maxLv: String(maxLv(it)),
        atMaxHigh: atMax(it),
        canLevel: canLevel(it),
        lvBefore: oLv(it.id)
      };
      levelUp(it);
      r.lvAfter = oLv(it.id);
      /* 08 세부 팝업이 «MAX» 라고 말하지 않는가 */
      showItem(it.id);
      const btn = document.getElementById('mLv');
      /* ⚠ `.sk-pb i` 는 «채움 막대» 이고 글자는 `.sk-pb b` 다(`mdLive` 가 그렇게 갈라 쓴다) —
         막대를 읽으면 텍스트가 늘 빈 문자열이라 «MAX 가 아니다» 가 공허하게 초록이 된다. */
      const pb  = document.querySelector('#mbox .sk-pb b');
      r.btn = btn ? btn.textContent.trim() : '(없음)';
      r.pbTxt = pb ? pb.textContent.trim() : '(없음)';
      const md = document.getElementById('modal'); if (md) md.classList.remove('on');
      if (before) S.own[it.id] = before; else delete S.own[it.id];
      out[p] = r;
    }
    return out;
  }, PARTS);
  PARTS.forEach(p => {
    const d = D[p];
    ok(d.maxLv === 'Infinity', 'D1 ' + p + ' 불멸 — 레벨 상한 없음', d.maxLv);
    ok(d.atMaxHigh === false, 'D2 ' + p + ' 불멸 — 만렙 ×5 레벨에서도 «만렙» 이 아니다', String(d.atMaxHigh));
    ok(d.lvAfter === d.lvBefore + 1, 'D3 ' + p + ' 불멸 — 그 레벨에서도 강화가 먹는다',
      d.lvBefore + ' → ' + d.lvAfter);
    ok(d.btn !== 'MAX', 'D4 ' + p + ' 불멸 — 08 세부 [강화] 버튼이 «MAX» 가 아니다', d.btn);
    ok(d.pbTxt !== 'MAX' && d.pbTxt !== '(없음)' && d.pbTxt !== '',
      'D5 ' + p + ' 불멸 — 08 세부 진행바가 «MAX» 가 아니라 «n/n» 을 말한다', d.pbTxt);
  });

  /* ── [E] 719 합성 정합 — 불멸이 종착지 ─────────────────────────── */
  const E = await page.evaluate(parts => parts.map(p => {
    const it = EQUIPS.filter(e => e.slot === p).reduce((m, e) => (e.g > m.g ? e : m));
    const before = S.own[it.id] ? { ...S.own[it.id] } : null;
    S.own[it.id] = { n: 99, l: MAX_LEVEL };            /* 합성 조건(만렙 + 조각)을 전부 충족시킨다 */
    const r = { id: it.id, next: nextTierItem(it) ? nextTierItem(it).id : null, can: canCraft(it) };
    if (before) S.own[it.id] = before; else delete S.own[it.id];
    return r;
  }), PARTS);
  E.forEach((e, i) => {
    ok(e.next === null, 'E1 ' + PARTS[i] + ' 불멸 — 다음 합성 대상 없음(719 «최고 등급 합성 없음»)',
      String(e.next));
    ok(e.can === false, 'E2 ' + PARTS[i] + ' 불멸 — 만렙·조각 충족에도 합성 불가', String(e.can));
  });

  /* ── [F] 세이브 이관 «없음» 이 정답 ────────────────────────────── */
  const F = await page.evaluate(() => {
    /* 구 세이브를 그대로 흉내 낸다 — 불멸 3종 보유 + 강화분. 740 은 KEY 를 안 올렸으므로
       이 세이브는 **그대로** 살아 있어야 한다(합산 이관도 삭제도 없다). */
    const want = { weapon7: 137, shield7: 42, amulet7: 8 };
    Object.entries(want).forEach(([id, l]) => { S.own[id] = { n: 3, l }; });
    save();
    return { key: (typeof KEY !== 'undefined' ? String(KEY) : '?'), want, raw: localStorage.getItem(KEY) ? 1 : 0 };
  });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openWeapon === 'function');
  await page.waitForTimeout(700);
  const F2 = await page.evaluate(want => Object.entries(want).map(([id, l]) =>
    ({ id, l, got: S.own[id] ? S.own[id].l : null })), F.want);
  ok(F2.every(x => x.got === x.l), 'F1 구 세이브 실로드 — 불멸 보유·강화 레벨 그대로(이관 0건)',
    F2.map(x => x.id + ' ' + x.got + '/' + x.l).join(' · '));

  /* ── [R] 되돌림 시험 ───────────────────────────────────────────── */
  const R1 = await page.evaluate(() => {
    const g = EQUIPS.reduce((m, e) => Math.max(m, e.g), 0);
    const cnt = () => { openWeapon(null, 'weapon');
      const el = document.getElementById('wpnGrid');
      const n = [...el.children].filter(c => Math.round((c.offsetTop - 32) / 190) === g).length;
      closeWeapon(); return n; };
    const before = cnt();
    EQUIPS.push({ id: '__t740', n: '시험 종', slot: 'weapon', g, j: 1, v: 1.0, ic: '♾️' });
    const moved = cnt();
    EQUIPS.splice(EQUIPS.findIndex(e => e.id === '__t740'), 1);
    const back = cnt();
    return { before, moved, back };
  });
  ok(R1.before === 1 && R1.moved === 2 && R1.back === 1,
    'R1 되돌림 — 불멸 종을 2종으로 늘리면 칸도 2칸, 원복하면 1칸',
    R1.before + ' → ' + R1.moved + ' → ' + R1.back);
  /* 음성항 — 「불멸에 MAX 안 뜸」이 «어디에도 MAX 가 없어서» 초록인 것이 아님을 못박는다.
     상한이 있는 등급(초월 = 불멸 바로 아래)은 만렙에서 실제로 «MAX» 가 떠야 한다. */
  const R2 = await page.evaluate(() => {
    const g = EQUIPS.reduce((m, e) => Math.max(m, e.g), 0);
    const it = EQUIPS.find(e => e.slot === 'weapon' && e.g === g - 1);
    const before = S.own[it.id] ? { ...S.own[it.id] } : null;
    S.own[it.id] = { n: 0, l: MAX_LEVEL };
    showItem(it.id);
    const btn = document.getElementById('mLv');
    const r = { id: it.id, grade: GRADE[it.g].n, atMax: atMax(it),
                btn: btn ? btn.textContent.trim() : '(없음)' };
    const md = document.getElementById('modal'); if (md) md.classList.remove('on');
    if (before) S.own[it.id] = before; else delete S.own[it.id];
    return r;
  });
  ok(R2.atMax === true && R2.btn === 'MAX',
    'R2 음성항 — 상한이 있는 등급(' + R2.grade + ')은 만렙에서 «MAX» 가 실제로 뜬다',
    R2.id + ' atMax=' + R2.atMax + ' 버튼=' + R2.btn);

  ok(errs.length === 0, 'H1 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await ctx.close(); await browser.close();
  console.log('\nVERIFY740 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
