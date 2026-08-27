/* 작업 118 — 21 도감의 «유물» 을 임의 3 · 4 · 3 세트 3개로.  실행: node tools/verify118.js [--table]
   지시서 [3]-(가)(레퍼런스 대조가 아니라 데이터 구조 교체) + T2 «기능 완성 규칙»(실제로 동작해야 완료).
     [1] 구조 — `COLL_SET['relic:0..2']` 구성원 3·4·3 · `RELICS` 배열 순서 · 세트명 · 등급 mul(구성원 평균)
     [2] 규칙 — 91 그대로: 세트 전원 Lv≥1 이어야 1단계, 가능 단계 = 세트 최저 Lv(상한 10).
                «세트 2 만 전원 Lv1» 이면 **세트 2 만** ready (지시 검증 예시)
     [3] 보너스 — 세트별 단계당 값 = `COLL_BASE.relic.atk(0.020) × 세트 mul`, 축 가산 후 1회 곱
     [4] 저장 — 구 세이브의 `relic:0` 단계는 새 «세트 1» 로 이월, 나머지 세트는 0. 구 카테고리 카운터는 버림
     [5] UI  — 유물 탭 = 블록 3개(3·4·3칸) · 칸 규격이 장비 탭과 동일(±2px) · 가로 스크롤 불필요
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
const rows = [];
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
  console.log('[1] 구조 — 유물 3세트 3·4·3');
  const st = await p.evaluate(() => ({
    keys: COLL_SETS.filter(s => s.cat === 'relic').map(s => s.key),
    it: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || { it: [] }).it),
    n: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || { n: '' }).n),
    mul: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || { mul: 0 }).mul),
    eff: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || { eff: {} }).eff),
    relicIds: RELICS.map(r => r.id),
    relicMul: RELICS.map(r => GRADE[r.g].mul),
    base: COLL_BASE.relic,
    tab: [0, 1, 2].map(i => (COLL_SET['relic:' + i] || {}).tab)
  }));
  ok(st.keys.join(',') === 'relic:0,relic:1,relic:2', '유물 세트 키 = relic:0 · relic:1 · relic:2 (실측 ' + st.keys.join(',') + ')');
  ok(JSON.stringify(st.it.map(a => a.length)) === '[3,4,3]',
     '지시 ① 구성원 수 3 · 4 · 3 (실측 ' + JSON.stringify(st.it.map(a => a.length)) + ')');
  ok(st.it[0].join(',') === 'rl0,rl1,rl2', '세트 1 = rl0 · rl1 · rl2 (실측 ' + st.it[0].join(',') + ')');
  ok(st.it[1].join(',') === 'rl3,rl4,rl5,rl6', '세트 2 = rl3 · rl4 · rl5 · rl6 (실측 ' + st.it[1].join(',') + ')');
  ok(st.it[2].join(',') === 'rl7,rl8,rl9', '세트 3 = rl7 · rl8 · rl9 (실측 ' + st.it[2].join(',') + ')');
  ok(st.it.flat().join(',') === st.relicIds.join(','), '순서는 `RELICS` 배열 순 · 10종 전부 어느 한 세트에 속한다');
  ok(new Set(st.it.flat()).size === 10, '한 유물이 두 세트에 걸치지 않음');
  ok(st.n.join(' / ') === '전사의 유물 / 현자의 유물 / 창세의 유물', '세트명 (실측 ' + st.n.join(' / ') + ')');
  ok(st.tab.every(t => t === 'relic'), '세 세트 모두 «유물» 탭 소속');
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const want = [avg(st.relicMul.slice(0, 3)), avg(st.relicMul.slice(3, 7)), avg(st.relicMul.slice(7))];
  ok(st.mul.every((m, i) => near(m, want[i], 1e-9)),
     '세트 등급배율 = 구성원 mul 평균 ' + want.map(v => v.toFixed(3)).join(' / ')
     + ' (실측 ' + st.mul.map(v => v.toFixed(3)).join(' / ') + ')');
  ok(st.eff.every((e, i) => near(e.atk, st.base.atk * st.mul[i], 1e-12)),
     '지시 ② 단계당 값 = 91 유물 계수 ' + (st.base.atk * 100).toFixed(1) + '% × 세트 mul (실측 '
     + st.eff.map(e => (e.atk * 100).toFixed(2) + '%').join(' / ') + ')');
  ok(st.eff.every(e => Object.keys(e).join(',') === 'atk'), '축은 91 그대로 «모든 피해(atk)» 1개');
  rows.push(['세트 구성', 'relic:0/1/2 = 3·4·3 (RELICS 순)', st.it.map(a => a.length).join('·')]);
  rows.push(['단계당 값', '0.020 × 세트 mul', st.eff.map(e => (e.atk * 100).toFixed(2) + '%').join(' / ')]);

  /* ---------------- [2] 규칙 — «세트 2 만 전원 Lv1 → 세트 2 만 ready» ---------------- */
  console.log('[2] 규칙 — 세트 단위 해금');
  const only2 = await p.evaluate(() => {
    S.own = {}; S.coll = {};
    COLL_SET['relic:1'].it.forEach(id => S.own[id] = { n: 0, l: 1 });
    markDirty();
    return [0, 1, 2].map(i => ({ lv: collLv(COLL_SET['relic:' + i]), cap: collCap(COLL_SET['relic:' + i]),
                                 rdy: collReady('relic:' + i) }));
  });
  ok(!only2[0].rdy && only2[1].rdy && !only2[2].rdy,
     '지시 검증 예시 — 세트 2 만 전원 Lv1 이면 세트 2 만 강화 가능 (실측 '
     + only2.map((r, i) => (i + 1) + ':' + (r.rdy ? 'ready' : '-')).join(' · ') + ')');
  ok(only2[1].cap === 1 && only2[0].cap === 0 && only2[2].cap === 0,
     '가능 단계 = 세트 최저 Lv (실측 ' + only2.map(r => r.cap).join(' / ') + ')');
  const partial = await p.evaluate(() => {
    S.own = {}; S.coll = {};
    COLL_SET['relic:0'].it.slice(0, 2).forEach(id => S.own[id] = { n: 0, l: 9 });   /* 3종 중 2종만 */
    markDirty();
    const a = { cap: collCap(COLL_SET['relic:0']), rdy: collReady('relic:0') };
    COLL_SET['relic:0'].it.forEach((id, i) => S.own[id] = { n: 0, l: [7, 3, 5][i] });
    markDirty();
    const c = { cap: collCap(COLL_SET['relic:0']), lv: collLv(COLL_SET['relic:0']) };
    COLL_SET['relic:0'].it.forEach(id => S.own[id] = { n: 0, l: 40 });
    markDirty();
    return { a, c, capped: collCap(COLL_SET['relic:0']) };
  });
  ok(partial.a.cap === 0 && !partial.a.rdy, '한 종만 미보유여도 0단계 (실측 cap ' + partial.a.cap + ')');
  ok(partial.c.cap === 3 && partial.c.lv === 3, 'Lv 7/3/5 → 가능 단계 3 (세트 최저 Lv, 실측 ' + partial.c.cap + ')');
  ok(partial.capped === 10, '전부 Lv40 이어도 상한 10 (실측 ' + partial.capped + ')');
  rows.push(['세트 2 만 전원 Lv1', '세트 2 만 [강화] 활성', only2.map((r, i) => (i + 1) + ':' + (r.rdy ? 'ready' : '-')).join(' ')]);

  /* ---------------- [3] 보너스 — 실제 게임 데이터로 강화 → bonus() 반영 ---------------- */
  console.log('[3] 보너스 — 강화가 전투력에 반영된다');
  const bo = await p.evaluate(() => {
    S.own = {}; S.coll = {};
    [0, 1, 2].forEach(i => COLL_SET['relic:' + i].it.forEach(id => S.own[id] = { n: 0, l: 2 }));
    markDirty();
    const before = { atk: bonus().atk, cp: cp() };
    let clicks = 0;
    [0, 1, 2].forEach(i => { while (collReady('relic:' + i)) { claimColl('relic:' + i); clicks++; } });
    markDirty();
    const sum = [0, 1, 2].reduce((n, i) => n + COLL_SET['relic:' + i].eff.atk * collStep('relic:' + i), 0);
    return { before, after: { atk: bonus().atk, cp: cp() }, clicks, sum,
             steps: [0, 1, 2].map(i => collStep('relic:' + i)) };
  });
  ok(JSON.stringify(bo.steps) === '[2,2,2]', '전 종 Lv2 → 세 세트 각 2단계까지 강화 (실측 ' + JSON.stringify(bo.steps) + ')');
  ok(bo.clicks === 6, '[강화] 한 번에 한 단계 (클릭 ' + bo.clicks + '회)');
  ok(near(bo.after.atk / bo.before.atk, 1 + bo.sum, 1e-9),
     '축 가산 후 1회 곱 — 공격력 ×' + (1 + bo.sum).toFixed(4) + ' (실측 ×' + (bo.after.atk / bo.before.atk).toFixed(4) + ')');
  ok(bo.after.cp > bo.before.cp, '전투력 즉시 상승 (' + Math.round(bo.before.cp) + ' → ' + Math.round(bo.after.cp) + ')');
  const capTbl = await p.evaluate(() => [0, 1, 2].reduce((n, i) => n + COLL_SET['relic:' + i].eff.atk * COLL_MAX_STEP, 0));
  ok(capTbl > 0 && capTbl < 3, '유물 축 만단계 상한 +' + (capTbl * 100).toFixed(1) + '% (구 1세트 +75.6% → 3세트)');
  rows.push(['[강화] ×6 (세 세트 2단계)', '공격력 ×' + (1 + bo.sum).toFixed(4) + ' · 전투력 상승',
             '×' + (bo.after.atk / bo.before.atk).toFixed(4) + ' · cp ' + Math.round(bo.before.cp) + '→' + Math.round(bo.after.cp)]);

  /* ---------------- [4] 저장 — 구 `relic:0` 단계 이월 ---------------- */
  console.log('[4] 저장 — 구 세이브 이월 (지시 ④)');
  /* LESSONS 91-2: `localStorage.setItem` + reload 는 `beforeunload` 의 save() 가 덮는다.
     **S 를 구 세이브 모양으로 만든 뒤 save() 하고 reload** 해야 마이그레이션이 실제로 돈다. */
  await p.evaluate(() => {
    S.coll = { 'relic:0': 4, relic: 7, 'equip:weapon:0': 2 };   /* 구 세트 키 + 구 카테고리 카운터 + 타 카테고리 */
    [0, 1, 2].forEach(i => COLL_SET['relic:' + i].it.forEach(id => S.own[id] = { n: 0, l: 6 }));
    save();
  });
  await p.reload();
  await p.waitForTimeout(1200);
  const mig = await p.evaluate(() => ({ coll: JSON.parse(JSON.stringify(S.coll)),
                                        steps: [0, 1, 2].map(i => collStep('relic:' + i)) }));
  ok(mig.steps[0] === 4, '구 «세트 1 수령 4단계» 가 새 세트 1 로 이월 (실측 ' + mig.steps[0] + ')');
  ok(mig.steps[1] === 0 && mig.steps[2] === 0, '새로 생긴 세트 2 · 3 은 0단계에서 시작 (실측 ' + mig.steps.join('/') + ')');
  ok(mig.coll.relic === undefined, '구 카테고리 카운터 `coll.relic` 은 버려진다(91 화이트리스트 필터)');
  ok(mig.coll['equip:weapon:0'] === 2, '타 카테고리 진행도는 그대로 (실측 ' + mig.coll['equip:weapon:0'] + ')');
  rows.push(['구 세이브 로드', 'relic:0 4단계 → 세트1 4 / 세트2·3 0', mig.steps.join(' / ')]);

  /* ---------------- [5] UI — 유물 탭 블록 3개 · 칸 규격이 장비와 동일 ---------------- */
  console.log('[5] UI — 21 유물 탭');
  const ui = await p.evaluate(async () => {
    S.own = {}; S.coll = {};
    [0, 1, 2].forEach(i => COLL_SET['relic:' + i].it.forEach(id => S.own[id] = { n: 0, l: 3 }));
    COLL_SET['equip:weapon:0'].it.forEach(id => S.own[id] = { n: 0, l: 3 });
    markDirty(); renderUI();
    const grab = tab => {
      openColl21(tab);
      const blocks = [...document.querySelectorAll('#collList .clb')];
      const cd = document.querySelector('#collList .cd').getBoundingClientRect();
      const box = document.querySelector('#collList .clb-cards').getBoundingClientRect();
      const cds = [...document.querySelectorAll('#collList .clb:first-child .cd')].map(e => e.getBoundingClientRect());
      return { blocks: blocks.length,
               per: blocks.map(b => b.querySelectorAll('.cd').length),
               w: cd.width, h: cd.height, x0: cd.left - box.left,
               pitch: cds.length > 1 ? cds[1].left - cds[0].left : 0,
               names: blocks.map(b => b.querySelector('.clb-nm').textContent),
               steps: blocks.map(b => b.querySelector('.clb-st').textContent),
               scroll: [...document.querySelectorAll('#collList .clb-cards')]
                         .map(c => c.scrollWidth - c.clientWidth) };
    };
    const eq = grab('weapon'), rl = grab('relic');
    return { eq, rl, listH: document.querySelector('#collList').scrollHeight };
  });
  await settle(p);
  ok(ui.rl.blocks === 3, '유물 탭 = 세트 블록 3개 (실측 ' + ui.rl.blocks + ')');
  ok(JSON.stringify(ui.rl.per) === '[3,4,3]', '블록별 카드 3 · 4 · 3칸 (실측 ' + JSON.stringify(ui.rl.per) + ')');
  ok(ui.rl.names.join(' / ') === '전사의 유물 / 현자의 유물 / 창세의 유물', '블록 제목 (실측 ' + ui.rl.names.join(' / ') + ')');
  ok(Math.abs(ui.rl.w - ui.eq.w) <= 2 && Math.abs(ui.rl.h - ui.eq.h) <= 2,
     '지시 ③ 칸 규격이 장비 탭과 동일 ±2px (장비 ' + ui.eq.w.toFixed(1) + '×' + ui.eq.h.toFixed(1)
     + ' · 유물 ' + ui.rl.w.toFixed(1) + '×' + ui.rl.h.toFixed(1) + ')');
  ok(Math.abs(ui.rl.pitch - ui.eq.pitch) <= 2 && Math.abs(ui.rl.x0 - ui.eq.x0) <= 2,
     '칸 pitch·시작 x 도 장비 탭과 동일 ±2px (장비 pitch ' + ui.eq.pitch.toFixed(2)
     + ' · 유물 pitch ' + ui.rl.pitch.toFixed(2) + ')');
  ok(ui.rl.scroll.every(d => d <= 0), '지시 ③ 가로 스크롤 불필요 (넘침 ' + ui.rl.scroll.join('/') + 'px)');
  ok(ui.rl.steps.every(t => /단계 0\/3/.test(t)), '세 블록 모두 «단계 0/3» (전 종 Lv3, 실측 ' + ui.rl.steps.join(' · ') + ')');
  rows.push(['21 유물 탭 열기', '블록 3개 · 3·4·3칸 · 스크롤 없음', ui.rl.per.join('·') + ' · 넘침 ' + ui.rl.scroll.join('/') + 'px']);

  /* 버튼 실동작 — 세트 2 [강화] 를 실제로 눌러 본다(hit-test 후 페이지 안 click) */
  const click = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('#collList .clb-btn')];
    const btn = btns[1];
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const before = { step: collStep('relic:1'), cp: cp(),
                     eff: document.querySelectorAll('#collList .clb-eff')[1].textContent };
    btn.click();
    return { reachable: btn.contains(hit) || hit === btn, before,
             after: { step: collStep('relic:1'), cp: cp(),
                      eff: document.querySelectorAll('#collList .clb-eff')[1].textContent,
                      others: [collStep('relic:0'), collStep('relic:2')] } };
  });
  ok(click.reachable, '세트 2 [강화] 버튼이 실제로 눌리는 자리에 있다(hit-test)');
  ok(click.after.step === click.before.step + 1, '누르면 그 세트만 단계 +1 (' + click.before.step + ' → ' + click.after.step + ')');
  ok(click.after.others.join(',') === '0,0', '다른 세트 단계는 그대로 (실측 ' + click.after.others.join('/') + ')');
  ok(click.after.cp > click.before.cp, '전투력 즉시 상승 (' + Math.round(click.before.cp) + ' → ' + Math.round(click.after.cp) + ')');
  ok(click.after.eff !== click.before.eff, '그 블록 효과 바 갱신 ("' + click.before.eff + '" → "' + click.after.eff + '")');
  rows.push(['세트 2 [강화] 클릭', '세트 2 만 +1 · 전투력 상승 · 효과 바 갱신',
             click.before.step + '→' + click.after.step + ' · cp ' + Math.round(click.before.cp) + '→' + Math.round(click.after.cp)]);

  ok(errs.length === 0, '콘솔/페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();
  if (process.argv.includes('--table')) {
    console.log('\n| 조작 | 기대 | 실측 |');
    console.log('|---|---|---|');
    rows.forEach(r => console.log('| ' + r.join(' | ') + ' |'));
  }
  console.log('\nVERIFY118 ' + pass + '/' + (pass + fail) + '  ' + (fail ? '✗ FAIL' : '✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
