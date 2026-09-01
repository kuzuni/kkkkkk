#!/usr/bin/env node
/* 작업 757 게이트 — 「만렙 스킬·펫의 잉여 조각을 **소환 1회 단가로** 다이아 환급」
 *
 *   node tools/verify757.js
 *
 * 주인 원문(2026-09-02 05:55): «아까 스킬중에 불멸 등급 만들라고 했는데 그러지말고 걍 그런거
 * 없게 하기. 그렇게 되면 강화를 해도 스킬들이 100 레벨 다 되게 되고 나머지 스킬들이 조각이
 * 500 막 이런식으로 남게 되는데, 그렇게 되면 환급 버튼 뜨게 해서 클릭시 그 스킬들 환급해서
 * 다이아로 도로 받게 하기. 소환했을때 가격이랑 같아야함. 만약에 소환에 가격 바꾸게 되면 환급
 * 가격도 자동으로 바뀔수있게 해줘야함. 스킬 소환 10회 10원이면 스킬 1조각 환급당 1원이어야하는식임»
 * 보강(06:00): «펫도 만렙 100으로 하고 불멸 등급 없애고 스킬이랑 같은 방식으로 환급 방식 하기»
 *
 * 지킬 것:
 *   [S] 선언 — 옛 등급표 `REFUND` 가 **선언째** 사라졌다 · 환급가는 `summonCost` 에서만 온다(손 상수 0)
 *   [A] ★ 항등 — 「환급가 × 10 = 10회 소환가」 (스킬·펫 둘 다. 주인이 못박은 문장 그대로)
 *   [B] 범위 — 만렙(100) 도달분의 조각만 · 만렙 미만은 강화 재료라 환급 0
 *   [C] 노출 — 환급 가능분 0 이면 [환급] 버튼이 **없다** · 있으면 딱 1개(07·26 두 시트)
 *   [D] 실행 — 확인 팝업 → [환급] 이면 조각 0 · 다이아 +amt **즉시**(우편 0건, 697) / [취소] 면 Δ0
 *   [E] ★ 자동 추종 — 소환가를 바꾼 사본에서 환급가가 저절로 따라온다(손 상수였으면 안 따라온다)
 *   [F] 카테고리 — 장비는 환급 0(조각이 합성 재료다 · 719) · 유물도 0
 *   [G] 레이아웃 — 환급 0 상태(흔한 상태)의 두 버튼은 레퍼런스 240/551 **Δ0px**,
 *                  3칸 상태만 91/402/713 로 벌어진다(폭·높이·bottom 은 어느 상태에서도 불변)
 *   [H] 740 스킬 항 취소 — 스킬 배너에 «불멸» 이 0(확률표 6행 · SKILLS 최고 등급 = 신화)
 *   [R] 되돌림 — 만렙 조건을 지운 사본에서 [B] 가 **실제로** 빨개진다
 *   [K] 콘솔 에러 0건
 *
 * ⚑ 왜 [E] 가 이 자의 핵심인가 — 「환급가 = 소환가」 는 **한 번 맞춰 놓기**로도 초록이 된다.
 *   주인이 요구한 것은 «가격을 바꾸면 자동으로» 이므로, 값이 아니라 **파생**을 물어야 한다.
 *   소환가를 바꾼 사본에서 환급가가 안 따라오면 그것이 곧 손 상수다.
 * ⚑ 왜 [G] 가 있는가 — 버튼이 하나 늘어난다는 것은 레퍼런스 2칸 배치를 건드릴 위험이다.
 *   환급이 0 인 «흔한 상태» 가 ref 와 한 픽셀도 안 달라야 이 기능이 공짜로 얹힌 것이다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const blk = t => console.log('\n[' + t + ']');
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 표본 — 배너 전 종을 «만렙 + 조각 frag» 로 둔다. sub 를 주면 앞 sub 종만 Lv1 로 낮춘다
   (만렙 미만은 환급 대상이 아니라는 [B] 의 대조군). */
const SEED = ({ bank, frag, sub }) => {
  const list = BANNERS[bank].list;
  list.forEach(it => { S.own[it.id] = { n: frag, l: MAX_LEVEL }; });
  (sub || 0) && list.slice(0, sub).forEach(it => { S.own[it.id].l = 1; });
  S.dia = 0; save();
  return { n: list.length, sub: sub || 0 };
};
const CLEAR = ({ bank }) => { BANNERS[bank].list.forEach(it => { S.own[it.id] = { n: 0, l: MAX_LEVEL }; }); save(); };

/* 시트를 열고 버튼 줄을 읽는다 — 좌표는 #app 기준(프레임 절대 px) */
const READ = ({ sheet }) => {
  const app = document.getElementById('app').getBoundingClientRect();
  const root = document.getElementById(sheet);
  const btns = [...root.querySelectorAll('.sk-btn')];
  const R = e => { const r = e.getBoundingClientRect();
    return { x: +(r.left - app.left).toFixed(1), y: +(r.top - app.top).toFixed(1),
             w: +r.width.toFixed(1), h: +r.height.toFixed(1),
             cls: e.className, txt: (e.textContent || '').trim() }; };
  /* ⚑ 자리 상자는 «화면 1080» 이 아니라 버튼의 `offsetParent`(`.shsc-in` — x 7 · 폭 1066)다.
     레퍼런스 2칸이 그 안에서 240..826(좌우 여백 240 대칭)이라는 것이 그 증거이므로,
     좌표는 **그 상자 기준**으로 환산해 잰다(335 «앵커가 둘» 함정 회피). */
  const hostEl = btns.length ? btns[0].offsetParent : null;
  const hr = hostEl ? hostEl.getBoundingClientRect() : app;
  return { n: btns.length, boxes: btns.map(R),
           rf: root.querySelectorAll('[data-skrf],[data-ptrf]').length,
           host: { x: +(hr.left - app.left).toFixed(1), w: +hr.width.toFixed(1) },
           appW: +app.width.toFixed(1) };
};

const OPEN = async (page, bank) => {
  const sub = bank === 'skill' ? 'sk' : 'pet';
  await ev(page, s => { if (!(panelOpen && curTab === 'hero')) goTab('hero'); heroSubGo(s); uiDirty = true; renderUI(); }, sub);
  await page.waitForTimeout(300);
};

async function boot(browser, url, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h || 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');
  /* 주석은 왜 폐지했는지를 일부러 적어 두므로 «주석을 걷어낸 코드» 만 본다(726 S 절 규약) */
  const bare = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const browser = await launch(chromium);

  blk('S — 선언: 등급 환급표가 사라지고 환급가가 소환가에서 파생한다');
  ok(!/\bconst\s+REFUND\b/.test(bare), 'S1 `const REFUND` 선언 0건 (등급별 환급 상수 폐지)');
  ok(!/\bREFUND\s*\[/.test(bare), 'S2 `REFUND[…]` 참조 0건');
  ok(/const refundUnit\s*=[^\n]*summonCost\(/.test(bare), 'S3 `refundUnit` 이 `summonCost` 로 정의된다(손 상수 아님)');
  ok(/const RF_BANK\s*=\s*\{\s*skill:'skill',\s*pet:'pet'\s*\}/.test(bare),
     'S4 환급 대상 카테고리는 스킬·펫 둘뿐(RF_BANK)');
  ok(/function askRefund\(/.test(bare) && /askRefund\('skill'\)/.test(bare) && /askRefund\('pet'\)/.test(bare),
     'S5 확인 팝업 `askRefund` 선언 1 + 07·26 두 호출부');

  const { ctx, page, errs } = await boot(browser, URL);

  /* ── [A] 항등 · [F] 카테고리 ─────────────────────────────────────── */
  blk('A·F — 「환급가 × 10 = 10회 소환가」 · 장비·유물은 환급 대상이 아니다');
  const A = await ev(page, () => {
    const out = {};
    ['skill', 'pet'].forEach(b => {
      const it = BANNERS[b].list[0];
      out[b] = { unit: refundUnit(it), c1: summonCost(b, 1), c10: summonCost(b, 10), cost: BANNERS[b].cost };
    });
    /* 장비·유물: 만렙 + 조각을 잔뜩 줘도 환급 0 이어야 한다 */
    const wp = EQUIPS.filter(e => e.slot === 'weapon');
    wp.forEach(e => { S.own[e.id] = { n: 9, l: MAX_LEVEL }; });
    RELICS.forEach(r => { S.own[r.id] = { n: 9, l: MAX_LEVEL }; });
    out.eqAmt = refundAmount(wp);
    out.eqUnit = refundUnit(wp[0]);
    out.rlUnit = refundUnit(RELICS[0]);
    out.eqFragKept = wp.every(e => frag(e.id) === 9);
    return out;
  });
  if (A) {
    ['skill', 'pet'].forEach(b => {
      ok(A[b].unit === A[b].c1, 'A1 ' + b + ' — 조각 1개 환급가 = 소환 1회 단가',
         A[b].unit + ' vs ' + A[b].c1);
      ok(A[b].unit * 10 === A[b].c10, 'A2 ★ ' + b + ' — 환급가 × 10 = 10회 소환가(주인 문장)',
         A[b].unit + '×10 = ' + (A[b].unit * 10) + ' vs ' + A[b].c10);
    });
    ok(A.eqAmt === 0 && A.eqUnit === 0, 'F1 장비 조각은 환급 0 (합성 재료 — 719)', 'amt=' + A.eqAmt);
    ok(A.rlUnit === 0, 'F2 유물도 환급 0', String(A.rlUnit));
    ok(A.eqFragKept, 'F3 장비 조각은 한 개도 안 사라졌다');
  } else ok(false, 'A/F 읽기');

  /* ── [B] 만렙만 · [D] 실행 ────────────────────────────────────────── */
  blk('B·D — 만렙 도달분만 환급 · 실행하면 즉시 지급, 취소하면 Δ0');
  for (const bank of ['skill', 'pet']) {
    const seed = await ev(page, SEED, { bank, frag: 7, sub: 3 });
    const B = await ev(page, b => {
      const L = BANNERS[b].list;
      return { amt: refundAmount(L), cnt: refundFrag(L),
               maxed: L.filter(it => atMax(it)).length, tot: L.length,
               unit: refundUnit(L[L.length - 1]) };
    }, bank);
    const wantFrag = (seed.n - seed.sub) * 7;
    ok(B.cnt === wantFrag, 'B1 ' + bank + ' — 만렙 ' + (seed.n - seed.sub) + '종 × 7조각 = ' + wantFrag + ' 만 환급 대상',
       '실측 ' + B.cnt);
    ok(B.amt === wantFrag * B.unit, 'B2 ' + bank + ' — 금액 = 대상 조각 × 단가',
       B.amt + ' vs ' + (wantFrag * B.unit));
    ok(B.maxed === seed.n - seed.sub, 'B3 ' + bank + ' — Lv1 로 낮춘 ' + seed.sub + '종은 만렙이 아니다',
       B.maxed + '/' + B.tot);

    /* 취소 → 아무것도 안 바뀐다 */
    const cancel = await ev(page, b => {
      const L = BANNERS[b].list, before = { dia: S.dia, frag: refundFrag(L) };
      askRefund(b);
      const on = document.getElementById('modal').classList.contains('on');
      const no = document.getElementById('rfNo');
      if (no) no.click();
      return { on, after: { dia: S.dia, frag: refundFrag(L) }, before,
               closed: !document.getElementById('modal').classList.contains('on') };
    }, bank);
    ok(cancel && cancel.on, 'D1 ' + bank + ' — [환급] 은 확인 팝업을 띄운다(206 «선택이 필요한 것»)');
    ok(cancel && cancel.closed && cancel.after.dia === cancel.before.dia
       && cancel.after.frag === cancel.before.frag,
       'D2 ' + bank + ' — [취소] 면 다이아·조각 Δ0',
       cancel ? cancel.before.dia + '→' + cancel.after.dia : 'n/a');

    /* 확인 → 즉시 지급 · 우편 0 */
    const done = await ev(page, b => {
      /* 697 — «지급은 즉시, 우편 경유 0». 우편은 `allMails()` 목록이고 `S.mail` 은 그 상태표다 */
      const L = BANNERS[b].list, mailBefore = allMails().length;
      const amt = refundAmount(L), dia0 = S.dia;
      askRefund(b);
      document.getElementById('rfOk').click();
      const subLeft = L.filter(it => !atMax(it)).reduce((s, it) => s + frag(it.id), 0);
      return { amt, dia0, dia: S.dia, left: refundFrag(L), subLeft,
               mailAdded: allMails().length - mailBefore };
    }, bank);
    ok(done && done.dia === done.dia0 + done.amt, 'D3 ' + bank + ' — 다이아 +' + (done ? done.amt : '?') + ' 즉시 반영',
       done ? done.dia0 + '→' + done.dia : 'n/a');
    ok(done && done.left === 0, 'D4 ' + bank + ' — 환급한 조각은 0 이 된다', done ? String(done.left) : 'n/a');
    ok(done && done.subLeft === seed.sub * 7, 'D5 ' + bank + ' — 만렙 아닌 종의 조각은 그대로 남는다(강화 재료)',
       done ? done.subLeft + ' / 기대 ' + seed.sub * 7 : 'n/a');
    ok(done && done.mailAdded === 0, 'D6 ' + bank + ' — 우편 경유 0건(697 즉시 지급)',
       done ? String(done.mailAdded) : 'n/a');
  }

  /* ── [C]·[G] 노출과 자리 ─────────────────────────────────────────── */
  blk('C·G — [환급] 버튼은 있을 때만 뜨고, 없을 때 두 버튼은 레퍼런스 Δ0px');
  /* 자리 상자(`.shsc-in`, 폭 1066) 기준 좌변. 2칸은 레퍼런스 값, 3칸은 같은 상자의 대칭 배치 */
  const REF2 = { x: [240, 551], w: 275, h: 131 };
  const REF3 = [84.5, 395.5, 706.5];
  for (const [bank, sheet] of [['skill', 'bSk'], ['pet', 'bPet']]) {
    await ev(page, CLEAR, { bank });
    await OPEN(page, bank);
    const off = await ev(page, READ, { sheet });
    ok(off && off.rf === 0 && off.n === 2, 'C1 ' + bank + ' — 환급 0 이면 버튼이 없다(2칸)',
       off ? off.n + '칸 / rf ' + off.rf : 'n/a');
    if (off && off.n === 2) {
      const dx = off.boxes.map((b, i) => +(b.x - off.host.x - REF2.x[i]).toFixed(1));
      ok(dx.every(d => Math.abs(d) < 0.6) && off.boxes.every(b => Math.abs(b.w - REF2.w) < 0.6 && Math.abs(b.h - REF2.h) < 0.6),
         'G1 ' + bank + ' — 2칸 상태는 레퍼런스 240/551 · 275×131 Δ0px',
         'Δx ' + dx.join('/') + ' w ' + off.boxes.map(b => b.w).join('/') + ' host ' + off.host.x + '/' + off.host.w);
    } else ok(false, 'G1 ' + bank + ' — 2칸 상태를 못 읽었다');

    await ev(page, SEED, { bank, frag: 5 });
    await OPEN(page, bank);
    const on = await ev(page, READ, { sheet });
    ok(on && on.rf === 1 && on.n === 3, 'C2 ' + bank + ' — 환급분이 있으면 [환급] 딱 1개(3칸)',
       on ? on.n + '칸 / rf ' + on.rf : 'n/a');
    if (on && on.n === 3) {
      const dx = on.boxes.map((b, i) => +(b.x - on.host.x - REF3[i]).toFixed(1));
      const mid = on.boxes.map(b => b.x - on.host.x + b.w / 2);
      const gaps = [1, 2].map(i => +(on.boxes[i].x - (on.boxes[i - 1].x + on.boxes[i - 1].w)).toFixed(1));
      ok(dx.every(d => Math.abs(d) < 0.6), 'G2 ' + bank + ' — 3칸 상태 좌변 84.5/395.5/706.5 (자리 상자 기준)',
         on.boxes.map(b => +(b.x - on.host.x).toFixed(1)).join('/'));
      ok(on.boxes.every(b => Math.abs(b.w - REF2.w) < 0.6 && Math.abs(b.h - REF2.h) < 0.6),
         'G3 ' + bank + ' — 3칸이어도 버튼 규격 275×131 불변', on.boxes.map(b => b.w + 'x' + b.h).join(' '));
      ok(Math.abs((mid[0] + mid[2]) / 2 - on.host.w / 2) < 0.6 && gaps.every(g => Math.abs(g - 36) < 0.6),
         'G4 ' + bank + ' — 3칸 줄은 자리 상자 중앙 대칭 · 간격 36 유지',
         '중심 ' + ((mid[0] + mid[2]) / 2).toFixed(1) + ' vs ' + (on.host.w / 2) + ' · 간격 ' + gaps.join('/'));
      ok(on.boxes.every(b => b.y === on.boxes[0].y), 'G5 ' + bank + ' — 세 버튼 상변이 한 줄',
         on.boxes.map(b => b.y).join('/'));
      ok(/환급/.test(on.boxes[2].txt), 'G6 ' + bank + ' — 셋째 칸 라벨이 «환급»', on.boxes[2].txt);
    } else { ok(false, 'G2 ' + bank + ' — 3칸 상태를 못 읽었다'); }
  }

  /* ── [H] 740 스킬 불멸 항 취소 ─────────────────────────────────────── */
  blk('H — 757 ① : 스킬에는 «불멸» 이 없다(740 스킬 항 취소)');
  const H = await ev(page, () => ({
    roll: rollOf('skill').length,
    topSkill: Math.max(...SKILLS.map(s => s.g)),
    topName: GRADE[Math.max(...SKILLS.map(s => s.g))].n,
    probLast: gradeProbs('skill').length,
    imm: gradeProbs('skill')[7] || 0,
    maxSkillLv: maxLv(SKILLS[0])
  }));
  ok(H && H.roll === 6, 'H1 스킬 배너 확률표는 6행(초월·불멸 없음)', H ? String(H.roll) : 'n/a');
  ok(H && H.topName === '신화', 'H2 SKILLS 최고 등급 = 신화', H ? H.topName + '(g' + H.topSkill + ')' : 'n/a');
  ok(H && !H.imm, 'H3 스킬 소환에서 불멸 확률 0', H ? String(H.imm) : 'n/a');
  ok(H && H.maxSkillLv === 100, 'H4 스킬 만렙 100 (무한 강화 아님)', H ? String(H.maxSkillLv) : 'n/a');

  /* ── [P] 펫 «불멸» 폐지 ───────────────────────────────────────────── */
  blk('P — 757 보강 : 펫에 «불멸» 이 없다 · 만렙 100 · 장비 불멸은 그대로');
  const P = await ev(page, () => {
    const topPet = PETS.reduce((m, p) => Math.max(m, p.g), 0);
    const probs = gradeProbs('pet');
    /* 만렙에서 30연을 300번 — 불멸 등급이 한 번이라도 나오면(또는 undefined 가 나오면) 빨강 */
    sumOf('pet').lv = SUM_MAXLV;   /* 714 — 소환 레벨은 배너별이다(`S.sumLv` 는 없다) */
    let g7 = 0, undef = 0, top = 0;
    for (let i = 0; i < 300; i++) for (let k = 0; k < 30; k++) {
      const _r = summonOne('pet'), it = _r && _r.it;   /* summonOne 은 { it, isNew } 를 돌려준다 */
      if (!it || it.g === undefined) { undef++; continue; }
      if (it.g === 7) g7++;
      if (it.g === topPet) top++;
    }
    return { topPet, topName: GRADE[topPet].n, immPets: PETS.filter(p => p.g === 7).length,
             roll: rollOf('pet').length, rollEq: rollOf('weapon').length, rollSk: rollOf('skill').length,
             p7: probs[7], probLen: probs.length, sum: probs.reduce((a, x) => a + x, 0),
             g7, undef, top, maxPetLv: maxLv(PETS[0]),
             topGpet: topG('pet'), topGeq: topG('equip'), topGsk: topG('skill'),
             collPet7: COLL_SETS.filter(s => s.key === 'pet:7').length,
             collPet6: COLL_SETS.filter(s => s.key === 'pet:6').length,
             eqImm: EQUIPS.filter(e => e.g === 7).length, heir: PET_HEIR };
  });
  if (P) {
    ok(P.immPets === 0 && P.topName === '초월', 'P1 펫 최고 등급 = 초월(불멸 0종)',
       P.topName + '(g' + P.topPet + ') · 불멸 ' + P.immPets + '종');
    ok(P.roll === 7 && P.rollSk === 6 && P.rollEq === 8,
       'P2 확률표 행 수가 종 목록에서 파생한다 — 스킬 6 · 펫 7 · 장비 8',
       '스킬 ' + P.rollSk + ' / 펫 ' + P.roll + ' / 장비 ' + P.rollEq);
    ok(!P.p7 && Math.abs(P.sum - 1) < 1e-9, 'P3 펫 확률표에 불멸 칸이 없고 합 = 1',
       'p7=' + P.p7 + ' 합 ' + P.sum.toFixed(6));
    ok(P.g7 === 0 && P.undef === 0 && P.top > 0,
       'P4 만렙 30연 ×300(9,000뽑) — 불멸 0건 · undefined 0건 · 초월은 실제로 나온다',
       '불멸 ' + P.g7 + ' · undefined ' + P.undef + ' · 초월 ' + P.top);
    ok(P.maxPetLv === 100, 'P5 펫 만렙 100 (주인 «펫도 만렙 100으로»)', String(P.maxPetLv));
    ok(P.topGpet === 6 && P.topGsk === 5 && P.topGeq === 7,
       'P6 topG 가 카테고리별 데이터에서 파생 — 펫 6 · 스킬 5 · 장비 7',
       [P.topGsk, P.topGpet, P.topGeq].join('/'));
    ok(P.collPet7 === 0 && P.collPet6 === 1, 'P7 도감도 따라온다 — «불멸 펫» 세트 0 · «초월 펫» 세트 1',
       'pet:7 ' + P.collPet7 + ' · pet:6 ' + P.collPet6);
    ok(P.eqImm === 3, 'P8 ★ 장비 불멸은 그대로다(740 장비 항은 757 이 안 건드린다 — 부위마다 1종)',
       String(P.eqImm));
    ok(P.heir === 'pet6_4', 'P9 승계처는 남는 최고 등급의 맨 끝 종', String(P.heir));
  } else ok(false, 'P 읽기');

  blk('K — 콘솔');
  ok(errs.length === 0, 'K1 콘솔 에러 0건', errs.slice(0, 2).join(' | '));
  await ctx.close();

  /* ── [M] 구 세이브 이관 — 불멸 펫을 들고 있던 세이브는 손해 0 ──────── */
  blk('M — 구 세이브: 폐지된 불멸 펫이 승계 종으로 «합산» 이관된다(손해 0)');
  {
    const m = await boot(browser, URL);
    const M = await ev(m.page, () => {
      /* 승계처도 이미 갖고 있고 출전 중인 «가장 까다로운» 세이브를 만든다.
         ⚠ `localStorage` 를 직접 써 놓고 reload 하면 **돌고 있는 게임의 autosave 가 그 사이에
           덮어쓴다**(실제로 그래서 1회차에 이 절이 통째로 빨갰다). 살아 있는 `S` 를 고치고
           제품의 `save()` 로 내보내야 «심은 세이브» 가 남는다. */
      S.own.pet7_0 = { n: 5, l: 40 };
      S.own.pet6_4 = { n: 2, l: 7 };
      S.eqPet = ['pet7_0', 'pet6_4'];
      S.coll['pet:7'] = 1;
      save();
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return !!(raw.own && raw.own.pet7_0 && raw.own.pet7_0.n === 5);
    });
    ok(M === true, 'M0 구 세이브를 심었다(pet7_0 조각5·Lv40 출전 + pet6_4 조각2·Lv7 출전)');
    await m.page.reload();
    await m.page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
    await m.page.waitForTimeout(500);
    const R1 = await ev(m.page, () => ({
      old: !!S.own.pet7_0, heir: S.own.pet6_4, eq: S.eqPet.slice(),
      coll7: 'pet:7' in S.coll, know: !!PT.pet7_0
    }));
    ok(R1 && !R1.know, 'M1 `pet7_0` 은 더 이상 존재하지 않는 종이다');
    ok(R1 && !R1.old, 'M2 세이브에서 옛 키가 사라졌다(멱등의 근거)');
    ok(R1 && R1.heir && R1.heir.n === 7, 'M3 ★ 조각은 «합산» — 5 + 2 = 7', R1 && R1.heir ? String(R1.heir.n) : 'n/a');
    ok(R1 && R1.heir && R1.heir.l === 40, 'M4 ★ 레벨은 «큰 쪽» — max(40, 7) = 40', R1 && R1.heir ? String(R1.heir.l) : 'n/a');
    ok(R1 && R1.eq.length === 1 && R1.eq[0] === 'pet6_4',
       'M5 출전 슬롯도 승계된다 · 중복은 한 칸으로 접힌다', R1 ? JSON.stringify(R1.eq) : 'n/a');
    ok(R1 && !R1.coll7, 'M6 폐지된 등급의 도감 키도 정리된다(365 ② 처방)');
    /* 멱등 — 한 번 더 로드해도 값이 안 늘어난다 */
    await m.page.reload();
    await m.page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
    await m.page.waitForTimeout(400);
    const R2 = await ev(m.page, () => ({ n: S.own.pet6_4 && S.own.pet6_4.n, l: S.own.pet6_4 && S.own.pet6_4.l,
                                         eq: S.eqPet.length }));
    ok(R2 && R2.n === 7 && R2.l === 40 && R2.eq === 1, 'M7 멱등 — 두 번 로드해도 그대로',
       R2 ? R2.n + '/' + R2.l + '/' + R2.eq : 'n/a');
    await m.ctx.close();
  }

  /* ── [E] 자동 추종 ──────────────────────────────────────────────── */
  blk('E — ★ 소환가를 바꾼 사본에서 환급가가 저절로 따라온다');
  {
    const rev = code.replace("skill:  { n:'스킬',   ic:'📜', cost:100,", "skill:  { n:'스킬',   ic:'📜', cost:250,");
    ok(rev !== code, 'E0 소환가 사본을 만들었다(스킬 cost 100 → 250)');
    const tmp = path.resolve(__dirname, '..', '.rev757a.html');
    fs.writeFileSync(tmp, rev);
    try {
      const r0 = await boot(browser, 'file://' + tmp.replace(/\\/g, '/'));
      const E = await ev(r0.page, () => {
        SKILLS.forEach(s => { S.own[s.id] = { n: 4, l: MAX_LEVEL }; });
        return { unit: refundUnit(SKILLS[0]), c1: summonCost('skill', 1), c10: summonCost('skill', 10),
                 amt: refundAmount(SKILLS), n: SKILLS.length };
      });
      ok(E && E.unit === 250, 'E1 ★ 환급가가 250 으로 따라왔다(손 상수였으면 100 에 머문다)',
         E ? String(E.unit) : 'n/a');
      ok(E && E.unit * 10 === E.c10, 'E2 사본에서도 항등 «×10 = 10회가» 유지', E ? E.unit + '×10 vs ' + E.c10 : 'n/a');
      ok(E && E.amt === E.n * 4 * 250, 'E3 총액도 새 단가로 계산된다', E ? E.amt + ' vs ' + (E.n * 4 * 250) : 'n/a');
      await r0.ctx.close();
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  }

  /* ── [R] 되돌림 ────────────────────────────────────────────────── */
  blk('R — 되돌림: 만렙 조건을 지우면 [B] 가 실제로 빨개진다');
  {
    const rev = code.replace('const canRefund  = it => !!RF_BANK[catOf(it)] && atMax(it) && frag(it.id) > 0;',
                             'const canRefund  = it => !!RF_BANK[catOf(it)] && frag(it.id) > 0;');
    ok(rev !== code, 'R0 되돌림 사본을 만들었다(만렙 조건 제거)');
    const tmp = path.resolve(__dirname, '..', '.rev757b.html');
    fs.writeFileSync(tmp, rev);
    try {
      const r0 = await boot(browser, 'file://' + tmp.replace(/\\/g, '/'));
      const seed = await ev(r0.page, SEED, { bank: 'skill', frag: 7, sub: 3 });
      const B = await ev(r0.page, () => refundFrag(SKILLS));
      ok(B === seed.n * 7, 'R1 ★ 되돌린 사본은 만렙 아닌 종의 조각까지 센다 = [B1] 이 빨개진다',
         B + ' vs 원본 기대 ' + (seed.n - seed.sub) * 7);
      await r0.ctx.close();
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }

    /* 무르게 잡아 통과한 게 아님 — 같은 자로 원본이 다시 초록 */
    const r2 = await boot(browser, URL);
    const seed2 = await ev(r2.page, SEED, { bank: 'skill', frag: 7, sub: 3 });
    const g = await ev(r2.page, () => refundFrag(SKILLS));
    ok(g === (seed2.n - seed2.sub) * 7, 'R2 원본은 같은 자로 다시 초록', String(g));
    await r2.ctx.close();
  }

  await browser.close();
  console.log('\nVERIFY757 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
