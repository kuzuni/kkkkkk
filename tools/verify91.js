/* 작업 91 — 도감 시스템 «부위 × 등급 세트» 전면 교체.  실행: node tools/verify91.js [--table]
   지시서 [3]-(가)(레퍼런스 대조가 필요 없는 시스템 교체) + T2 «기능 완성 규칙»(실제로 동작해야 완료).
     [1] 구조 — 세트 39개(장비 24 · 스킬 6 · 펫 8 · 유물 1) · 키 형식 · 구성원 · 등급 mul
         (106 으로 동료가 8등급 36종이 되면서 펫 세트가 6 → 8 이 됐다. 91 의 «자동 생성» 설계대로
          도감 코드는 한 줄도 안 고쳤고, 이 게이트의 «분포» 단언만 새 종 수로 따라간다.)
     [2] 규칙 — 가능 단계 = min(세트 최저 Lv, 10). 지시 검증 예시 그대로 단언
     [3] 보너스 — 강화 후 bonus() 수치 = 표값(단계당 = 기준값 × 등급 mul, 축별 가산 후 1회 곱)
     [4] 저장 — 구 세이브(카테고리 카운터 4개) 로드 → 버려지고 안내 1회 · 새 키는 보존
     [5] UI  — 21 팝업 탭 6개 · 세트 카드 · [강화] 버튼 실동작(단계 +1 · 전투력 상승) · 유물 3세트 3·4·3(118)
     [6] 연동 — 레드닷(사이드·탭·서브탭) · 가이드 미션 «도감 보너스 1회» · 87 코스튬 해금 조건
   기능 체크 표는 `--table` 로 출력한다(review 파일에 붙일 것). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  ✓ ' + m)) : (fail++, console.log('  ✗ ' + m)); };
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e);
const FILE = 'file://' + path.resolve(__dirname, '../index.html');

/* 애니메이션이 끝난 뒤에 재는 «변환 항등 대기»(LESSONS 21(2)-1) — 무한 반복은 반드시 거른다 */
const settle = p => p.evaluate(() => Promise.all(document.getAnimations()
  .filter(a => a.effect && a.effect.getTiming().iterations !== Infinity)
  .map(a => a.finished.catch(() => {}))));

(async () => {
  let b;
  try { b = await launch(chromium); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await launch(chromium, o); }
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(FILE);
  await p.waitForTimeout(1200);

  /* ---------------- [1] 구조 ---------------- */
  console.log('[1] 구조');
  const st = await p.evaluate(() => ({
    len: COLL_SETS.length,
    byCat: ['equip', 'skill', 'pet', 'relic'].map(c => COLL_SETS.filter(s => s.cat === c).length),
    byTab: COLL_TABS.map(t => COLL_SETS.filter(s => s.tab === t.k).length),
    keys: COLL_SETS.map(s => s.key),
    dupIt: (() => { const seen = {}; let d = 0;
      COLL_SETS.forEach(s => s.it.forEach(i => { if (seen[i]) d++; seen[i] = 1; })); return d; })(),
    wCounts: [0,1,2,3,4,5,6,7].map(g => (COLL_SET['equip:weapon:' + g] || { it: [] }).it.length),
    skCounts: [0,1,2,3,4,5].map(g => (COLL_SET['skill:' + g] || { it: [] }).it.length),
    /* 106 — 동료가 8등급 36종이 되면서 펫 세트도 0~7 이다(구 6등급 9종에서 확장) */
    petCounts: [0,1,2,3,4,5,6,7].map(g => (COLL_SET['pet:' + g] || { it: [] }).it.length),
    /* 118 — 유물이 «10종 1세트» 에서 «3 · 4 · 3» 3세트로 바뀌었다 */
    relic: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || { it: [] }).it.length),
    relicMul: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || { mul: 0 }).mul),
    relicN: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || { n: '' }).n),
    wEff: [0,1,2,3,4,5,6,7].map(g => (COLL_SET['equip:weapon:' + g] || { eff: {} }).eff.atk),
    maxStep: COLL_MAX_STEP,
    gone: typeof COLL === 'undefined'
  }));
  ok(st.len === 41, '세트 41개 (118 이후 — 실측 ' + st.len + ')');
  ok(JSON.stringify(st.byCat) === '[24,6,8,3]', '카테고리 분포 장비24·스킬6·펫8(106)·유물3(118) (실측 ' + JSON.stringify(st.byCat) + ')');
  ok(JSON.stringify(st.byTab) === '[6,8,8,8,8,3]', '탭 분포 스킬6·무기8·방패8·목걸이8·펫8(106)·유물3(118) (실측 ' + JSON.stringify(st.byTab) + ')');
  ok(new Set(st.keys).size === st.len, '세트 키 중복 없음');
  ok(st.keys.every(k => /^(equip:(weapon|shield|amulet):[0-7]|skill:[0-5]|pet:[0-7]|relic:[0-2])$/.test(k)),
     '키 형식 equip:{slot}:{g} · skill:{g} · pet:{g} · relic:{0..2}(118)');
  ok(st.dupIt === 0, '한 아이템이 두 세트에 속하지 않음 (중복 ' + st.dupIt + ')');
  ok(JSON.stringify(st.wCounts) === '[5,5,5,5,5,5,5,1]', '무기 세트 구성원 5×7 + 최종등급 1 (실측 ' + JSON.stringify(st.wCounts) + ')');
  /* 193(2026-08-27, 주인 지시) — 버프 5종 폐기 + 공격 8종 신설로 스킬은 27종 · [4,4,5,5,5,4].
     91 이 지키려는 것은 «세트가 그 등급의 전 종을 담는다» 이므로 수치만 이관한다. */
  ok(JSON.stringify(st.skCounts) === '[4,4,5,5,5,4]', '스킬 세트 구성원 [4,4,5,5,5,4](193) (실측 ' + JSON.stringify(st.skCounts) + ')');
  ok(st.petCounts.reduce((a, c) => a + c, 0) === 36, '펫 세트 구성원 합 36종 (106 — 실측 ' + JSON.stringify(st.petCounts) + ')');
  ok(JSON.stringify(st.relic) === '[3,4,3]', '118 — 유물 3세트 3·4·3 (실측 ' + JSON.stringify(st.relic) + ')');
  ok(st.relicMul.every((m, i) => near(m, [1.6, 3.875, 5.833333333333333][i], 0.001)),
     '유물 세트 등급배율 = 세트별 구성원 mul 평균 1.600 / 3.875 / 5.833 (실측 '
     + st.relicMul.map(m => m.toFixed(3)).join(' / ') + ')');
  ok(near(st.wEff[0], 0.02, 1e-9), '지시 예시 — 무기·일반 단계당 공격력 +2% (실측 ' + (st.wEff[0] * 100).toFixed(1) + '%)');
  ok(st.wEff.every((v, i) => i === 0 || v > st.wEff[i - 1]), '등급이 오를수록 단계당 값이 커진다 ('
     + st.wEff.map(v => (v * 100).toFixed(1) + '%').join(' → ') + ')');
  ok(st.maxStep === 10, '단계 상한 10 (실측 ' + st.maxStep + ')');
  ok(st.gone, '구 COLL(카테고리 티어 표) 폐기');

  /* ---------------- [2] 규칙 — 가능 단계 = min(세트 최저 Lv, 10) ---------------- */
  console.log('[2] 규칙 — 지시 검증 예시');
  const setLv = (ids, lv) => p.evaluate(({ ids, lv }) => {
    S.own = {}; ids.forEach((id, i) => { if (lv[i] > 0) S.own[id] = { n: 0, l: lv[i] }; });
    markDirty();
    const s = COLL_SET['equip:weapon:0'];
    return { lv: collLv(s), cap: collCap(s), ready: collReady(s.key), got: collStep(s.key) };
  }, { ids, lv });
  const W0 = await p.evaluate(() => COLL_SET['equip:weapon:0'].it);
  let r = await setLv(W0, [1, 1, 1, 1, 1]);
  ok(r.cap === 1 && r.ready, '무기·일반 5종 전부 Lv.1 → 1단계 가능 (cap ' + r.cap + ')');
  r = await setLv(W0, [1, 1, 1, 1, 0]);
  ok(r.cap === 0 && !r.ready, '한 종만 미보유(Lv.0) → 0단계 (cap ' + r.cap + ')');
  r = await setLv(W0, [2, 2, 2, 2, 2]);
  ok(r.cap === 2, '전부 Lv.2 → 2단계 가능 (cap ' + r.cap + ')');
  r = await setLv(W0, [9, 2, 7, 5, 3]);
  ok(r.cap === 2, '가능 단계 = «세트 최저 Lv» (9/2/7/5/3 → cap ' + r.cap + ')');
  r = await setLv(W0, [40, 40, 40, 40, 40]);
  ok(r.cap === 10, '전부 Lv.40 이어도 상한 10 (cap ' + r.cap + ')');

  /* ---------------- [3] 보너스 — 표값과 일치 ---------------- */
  console.log('[3] 보너스 — 표값 대조');
  const bo = await p.evaluate(() => {
    /* 깨끗한 상태에서 무기·일반 5종 Lv.3 → 3단계까지 강화 */
    S.own = {}; S.coll = {};
    COLL_SET['equip:weapon:0'].it.forEach(id => S.own[id] = { n: 0, l: 3 });
    markDirty();
    const base = bonus().atk;
    const owned = base;                       /* 보유 효과만 반영된 값 */
    let n = 0;
    while (collReady('equip:weapon:0')) { claimColl('equip:weapon:0'); n++; }
    markDirty();
    return { owned, after: bonus().atk, steps: collStep('equip:weapon:0'), clicks: n,
             per: COLL_SET['equip:weapon:0'].eff.atk };
  });
  ok(bo.steps === 3 && bo.clicks === 3, '[강화] 3회 → 3단계 (한 번에 한 단계씩)');
  ok(near(bo.after / bo.owned, 1 + bo.per * 3, 1e-9),
     '무기·일반 3단계 = 공격력 ×' + (1 + bo.per * 3).toFixed(3) + ' (실측 ×' + (bo.after / bo.owned).toFixed(3) + ')');
  const grades = await p.evaluate(() => {
    const out = [];
    ['equip:weapon:0', 'equip:weapon:4', 'equip:shield:2', 'equip:amulet:1', 'skill:3', 'pet:2', 'relic:0']
      .forEach(k => { const s = COLL_SET[k]; out.push({ k, n: s.n, mul: s.mul, eff: s.eff }); });
    return out;
  });
  grades.forEach(g => {
    const axes = Object.keys(g.eff);
    ok(axes.length > 0, g.n + ' (' + g.k + ') 단계당 ' + axes.map(a => a + ' +' + (g.eff[a] * 100).toFixed(2) + '%').join(' · '));
  });
  /* 축별 만단계 상한 — 전투력 회귀 검산 */
  const capTbl = await p.evaluate(() => {
    const cb = { atk: 0, hp: 0, gold: 0, rate: 0, pet: 0, cdmg: 0 };
    COLL_SETS.forEach(s => Object.keys(s.eff).forEach(k => cb[k] += s.eff[k] * COLL_MAX_STEP));
    return cb;
  });
  ok(capTbl.atk > 0 && capTbl.atk < 25, '만단계 공격력 상한 ×' + (1 + capTbl.atk).toFixed(2) + ' — 구 도감 상한(×40.97) 미만');
  ok(capTbl.hp > 0 && capTbl.hp < 25, '만단계 최대 체력 상한 ×' + (1 + capTbl.hp).toFixed(2));

  /* ---------------- [4] 저장 — 구 세이브 마이그레이션 ---------------- */
  console.log('[4] 저장 — 구 세이브(카테고리 카운터) 마이그레이션');
  /* ⚠ `beforeunload` 가 save() 를 부르므로 localStorage 에 직접 써 넣으면 reload 직전에 덮인다.
     현재 S 자체를 구 세이브 모양으로 만든 뒤 save() 해야 그 값이 그대로 다시 로드된다. */
  await p.evaluate(() => {
    S.coll = { skill: 3, equip: 2, pet: 1, relic: 4, 'equip:weapon:0': 2 };   /* 구 4개 + 새 키 1개 */
    S.own = { weapon0: { n: 0, l: 5 }, weapon0_1: { n: 0, l: 5 }, weapon0_2: { n: 0, l: 5 },
              weapon0_3: { n: 0, l: 5 }, weapon0_4: { n: 0, l: 5 } };
    save();
  });
  await p.reload();
  await p.waitForTimeout(1400);
  const mig = await p.evaluate(() => ({
    keys: Object.keys(S.coll), legacy: collLegacy,
    kept: S.coll['equip:weapon:0'] | 0,
    cap: collCap(COLL_SET['equip:weapon:0']),
    ready: collReady('equip:weapon:0'),
    /* 206(2026-08-27, 주인 재지시) — 이 «바뀌었습니다» 안내는 모달이 아니라 토스트로 뜬다 */
    notice: [...document.querySelectorAll('#fxl .fx-toast')].some(e => /도감이/.test(e.textContent)),
    modal: !!document.querySelector('#modal.on')
  }));
  ok(mig.keys.length === 1 && mig.keys[0] === 'equip:weapon:0',
     '구 카테고리 카운터 4개 폐기 · 세트 키만 보존 (남은 키 ' + JSON.stringify(mig.keys) + ')');
  ok(mig.kept === 2, '이미 받은 세트 단계(2)는 그대로 (실측 ' + mig.kept + ')');
  ok(mig.legacy === true, '구 세이브 감지 플래그(collLegacy)');
  ok(mig.notice && !mig.modal, '206 — 로드 후 «도감이 바뀌었습니다» 안내가 토스트 1회 (모달 ' + (mig.modal ? 'ON ←' : 'off') + ')');
  ok(mig.cap === 5 && mig.ready, '되돌아온 진행도 — Lv.5 세트라 5단계까지 바로 재강화 가능 (cap ' + mig.cap + ')');
  await p.evaluate(() => { closeModal(); localStorage.removeItem(KEY); });

  /* ---------------- [5] UI — 21 팝업 ---------------- */
  console.log('[5] UI — 21 도감 팝업');
  await p.goto(FILE); await p.waitForTimeout(1200);
  const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('#collTabs .cltab'))
    .map(t => ({ k: t.dataset.ct, n: t.querySelector('i').textContent,
                 x: t.getBoundingClientRect().left, w: t.getBoundingClientRect().width })));
  ok(tabs.length === 6, '상단 탭 6개 (실측 ' + tabs.length + ')');
  ok(tabs.map(t => t.k).join(',') === 'skill,weapon,shield,amulet,pet,relic',
     '탭 순서 스킬·무기·방패·목걸이·펫·유물 (실측 ' + tabs.map(t => t.n).join('·') + ')');
  ok(tabs[5].x + tabs[5].w <= tabs[0].x + 840 + 1,
     '탭 6칸이 컨테이너(840) 안에 들어감 (우끝 ' + Math.round(tabs[5].x + tabs[5].w - tabs[0].x) + ')');

  const ui = await p.evaluate(async () => {
    /* 실제 게임 데이터로 채운다 — 무기 일반·고급 만렙급, 스킬 일반 4종, 유물 전 종 */
    S.own = {}; S.coll = {};
    COLL_SET['equip:weapon:0'].it.forEach(id => S.own[id] = { n: 0, l: 4 });
    COLL_SET['equip:weapon:1'].it.forEach(id => S.own[id] = { n: 0, l: 1 });
    COLL_SET['skill:0'].it.forEach(id => S.own[id] = { n: 0, l: 2 });
    [0, 1, 2].forEach(i => COLL_SET['relic:' + i].it.forEach(id => S.own[id] = { n: 0, l: 3 }));
    markDirty(); renderUI();
    openColl21('weapon');
    return { blocks: document.querySelectorAll('#collList .clb').length,
             cards: document.querySelectorAll('#collList .clb:first-child .cd').length,
             step: document.querySelector('#collList .clb-st').textContent,
             eff: document.querySelector('#collList .clb-eff').textContent,
             lv: document.querySelector('#collList .clb-bdg>i.n').textContent,
             rdy: document.querySelectorAll('#collList .clb-btn.rdy').length,
             dis: document.querySelectorAll('#collList .clb-btn[disabled]').length };
  });
  await settle(p);
  ok(ui.blocks === 8, '무기 탭 = 8등급 세트 블록 (실측 ' + ui.blocks + ')');
  ok(ui.cards === 5, '일반 무기 세트 카드 5칸 (실측 ' + ui.cards + ')');
  ok(ui.step === '단계 0/4', '머리 우측 «현재 단계 / 가능 단계» 표기 (실측 "' + ui.step + '")');
  ok(/공격력 \+0\.0%/.test(ui.eff), '효과 바 = 받은 단계 기준 누적 수치 (실측 "' + ui.eff + '")');
  ok(ui.lv === '4', '뱃지 Lv = 세트 최저 Lv (실측 ' + ui.lv + ')');
  ok(ui.rdy === 2 && ui.dis === 6, '강화 가능 세트만 버튼 활성 (활성 ' + ui.rdy + ' · 비활성 ' + ui.dis + ')');

  /* [강화] 버튼 실동작 — 눌렀을 때 단계 · 전투력 · 효과 바가 바뀌는가 */
  const click = await p.evaluate(() => {
    const before = { cp: cp(), step: collStep('equip:weapon:0'),
                     eff: document.querySelector('#collList .clb-eff').textContent };
    const btn = document.querySelector('#collList .clb-btn.rdy');
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const reachable = btn.contains(hit) || hit === btn;
    btn.click();
    return { reachable, before, after: { cp: cp(), step: collStep('equip:weapon:0'),
             eff: document.querySelector('#collList .clb-eff').textContent,
             stepTxt: document.querySelector('#collList .clb-st').textContent },
             modal: !!document.querySelector('#modal.on'),
             /* 206(2026-08-27, 주인 재지시) — 강화 «결과» 는 모달이 아니라 토스트다 */
             toast: [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).join(' | '),
             modalTxt: (document.querySelector('#modal .mbox') || {}).textContent || '' };
  });
  ok(click.reachable, '[강화] 버튼이 실제로 눌리는 자리에 있다(hit-test)');
  ok(click.after.step === click.before.step + 1, '누르면 단계 +1 (' + click.before.step + ' → ' + click.after.step + ')');
  ok(click.after.cp > click.before.cp, '전투력 즉시 상승 (' + Math.round(click.before.cp) + ' → ' + Math.round(click.after.cp) + ')');
  ok(click.after.eff !== click.before.eff, '효과 바 갱신 ("' + click.before.eff + '" → "' + click.after.eff + '")');
  ok(click.after.stepTxt === '단계 1/4', '단계 표기 갱신 (실측 "' + click.after.stepTxt + '")');
  ok(!click.modal && /도감/.test(click.toast), '206 — 강화 결과가 토스트로 «' + click.toast + '» (모달 ' + (click.modal ? 'ON ←' : 'off') + ')');

  const relic = await p.evaluate(() => {
    closeModal(); openColl21('relic');
    const cs = [...document.querySelectorAll('#collList .clb-cards')];
    const c = cs[0];
    return { blocks: document.querySelectorAll('#collList .clb').length,
             cards: document.querySelectorAll('#collList .cd').length,
             perBlock: [...document.querySelectorAll('#collList .clb')].map(b => b.querySelectorAll('.cd').length),
             sw: c.scrollWidth, cw: c.clientWidth, over: cs.some(x => x.scrollWidth > x.clientWidth),
             right: c.getBoundingClientRect().right,
             panelRight: document.querySelector('#collList .clb-panel').getBoundingClientRect().right };
  });
  ok(relic.blocks === 3 && relic.cards === 10, '118 — 유물 탭 = 3세트 10칸 (실측 ' + relic.blocks + '블록 ' + relic.cards + '칸)');
  ok(JSON.stringify(relic.perBlock) === '[3,4,3]', '118 — 세트별 칸 3·4·3 (실측 ' + JSON.stringify(relic.perBlock) + ')');
  ok(!relic.over, '118 — 가로 스크롤 없이 담긴다 (scrollWidth ' + Math.round(relic.sw) + ' ≤ clientWidth ' + Math.round(relic.cw) + ')');
  ok(relic.right <= relic.panelRight + 1, '카드 상자가 세트 패널 밖으로 넘치지 않음 (상자 우끝 ' + Math.round(relic.right) + ' ≤ 패널 ' + Math.round(relic.panelRight) + ')');

  const tabSwitch = await p.evaluate(() => {
    const out = {};
    ['skill', 'weapon', 'shield', 'amulet', 'pet', 'relic'].forEach(k => {
      document.querySelector('#collTabs .cltab[data-ct="' + k + '"]').click();
      out[k] = { blocks: document.querySelectorAll('#collList .clb').length,
                 on: document.querySelectorAll('#collTabs .cltab.on').length };
    });
    return out;
  });
  ok(Object.keys(tabSwitch).every(k => tabSwitch[k].blocks > 0 && tabSwitch[k].on === 1),
     '탭 6개 전부 전환·렌더 성립 (' + Object.keys(tabSwitch).map(k => k + ':' + tabSwitch[k].blocks).join(' · ') + ')');

  /* ---------------- [6] 연동 ---------------- */
  console.log('[6] 연동 — 레드닷 · 가이드 미션 · 코스튬 해금');
  const link = await p.evaluate(() => {
    closeColl21();
    S.own = {}; S.coll = {}; markDirty(); renderUI();
    openColl21('weapon');                          /* 탭 레드닷은 팝업이 그릴 때 갱신된다 */
    const none = { any: collAnyReady(), dot: document.querySelectorAll('#collTabs .cltab.alert').length };
    COLL_SET['skill:0'].it.forEach(id => S.own[id] = { n: 0, l: 2 });
    markDirty(); renderUI(); openColl21('skill');
    const some = { any: collAnyReady(), cat: collCatReady('skill'), tab: collTabReady('skill'),
                   other: collCatReady('pet'), dot: document.querySelectorAll('#collTabs .cltab.alert').length,
                   side: !!document.querySelector('.side .ibtn[data-pop="coll"].on') };
    const g0 = collSteps();
    claimColl('skill:0');
    const g1 = collSteps(), cat1 = collCatSteps('skill');
    closeColl21();
    return { none, some, g0, g1, cat1,
             /* 182 — 코스튬 해금이 «도감 누적 단계» 에서 떨어져 나가 계급 축 하나가 됐다.
                이 게이트가 여기서 보는 것은 «도감이 코스튬을 더 이상 잠그지 않는다» 뿐이다. */
             cosRank: cosRankOf('av45'),
             cosTxt: cosReqText(AVATARS.find(a => a.id === 'av45')) };
  });
  ok(!link.none.any && link.none.dot === 0, '아무것도 없으면 레드닷 0');
  ok(link.some.any && link.some.cat && link.some.tab && !link.some.other, 'collAnyReady / collCatReady / collTabReady 판정');
  ok(link.some.dot === 1, '강화 가능한 탭에만 레드닷 (실측 ' + link.some.dot + ')');
  ok(link.some.side, '좌측 사이드 «도감» 아이콘 레드닷(83)');
  ok(link.g1 === link.g0 + 1 && link.cat1 === 1, '가이드 미션 «도감 보너스 1회» 카운터 = 누적 단계 수 (' + link.g0 + ' → ' + link.g1 + ')');
  /* 182 — 옛 «av45 = 스킬 도감 누적 3단계» 조건은 데이터째 폐기됐다(구매 폐지 → 조건 해금 폐기).
     91 이 여기서 지키는 것은 «도감 진행도가 코스튬 해금과 더 이상 얽혀 있지 않다» 는 사실이다. */
  ok(link.cosRank >= 1 && /승급전 클리어$/.test(link.cosTxt),
    '182 — 코스튬 해금 조건이 계급 축 하나로 (av45 → 도전 계급 ' + link.cosRank + ' · "' + link.cosTxt + '")');
  const cos = await p.evaluate(() => {
    const keep = Object.assign({}, S.avatars), kr = S.rank;
    delete S.avatars.av45;
    S.coll = {}; COLL_SETS.filter(s => s.cat === 'skill').forEach(s => S.coll[s.key] = 1);
    S.rank = 0;
    const byColl = cosReqOk(AVATARS.find(a => a.id === 'av45'));   /* 도감을 채워도 안 열린다 */
    S.rank = cosRankOf('av45');
    const byRank = cosReqOk(AVATARS.find(a => a.id === 'av45'));   /* 계급으로만 열린다 */
    S.avatars = keep; S.rank = kr; markDirty();
    return { steps: collCatSteps('skill'), byColl, byRank };
  });
  ok(cos.steps === 6, '스킬 세트 6개 × 1단계 = 누적 6단계 (실측 ' + cos.steps + ')');
  ok(!cos.byColl && cos.byRank, '182 — 도감 6단계로는 av45 가 안 열리고, 계급으로만 열린다');

  ok(errs.length === 0, '콘솔/페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  const tbl = await p.evaluate(() => COLL_TABS.map(t => {
    const ss = COLL_SETS.filter(s => s.tab === t.k);
    return { tab: t.n, sets: ss.length,
             eff: Object.keys(ss[0].eff).map(k => COLL_EFFN[k]).join(' · '),
             lo: Object.keys(ss[0].eff).map(k => '+' + (ss[0].eff[k] * 100).toFixed(2) + '%').join(' · '),
             hi: Object.keys(ss[ss.length - 1].eff).map(k => '+' + (ss[ss.length - 1].eff[k] * 100).toFixed(2) + '%').join(' · '),
             hiN: ss[ss.length - 1].n };
  }));
  await b.close();

  if (process.argv.includes('--table')) {
    console.log('\n| 탭 | 세트 수 | 보너스 축 | 최저 등급 세트 단계당 | 최고 등급 세트 단계당 |');
    console.log('|---|---|---|---|---|');
    tbl.forEach(t => console.log('| ' + t.tab + ' | ' + t.sets + ' | ' + t.eff + ' | ' + t.lo + ' | ' + t.hi + ' (' + t.hiN + ') |'));
    console.log('\n축별 만단계(39세트 × 10단계) 상한 — ' + Object.keys(capTbl)
      .map(k => k + ' ' + (k === 'cdmg' ? '+' + capTbl[k].toFixed(2) : '×' + (1 + capTbl[k]).toFixed(2))).join(' · '));
  }

  console.log('\nVERIFY91 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
