/* 작업 569 재현기 — `fxCnt2`(«두 재화 동시»)가 과탐지하는가.
 *
 * 등재문(PROGRESS 569)의 요구: **처방 전에** «`fxAcc` 가 실제로 차는 경로에서 개수가 절반이
 * 되는지» 를 먼저 찍는다(338 규칙). 이 자는 **관측만** 한다 — 제품을 한 줄도 안 고치고,
 * `fxFly` 의 판정식을 베끼지도 않는다. 대신 제품이 실제로 만든 비행을 **개수로** 센다.
 *
 * 갈래를 가르는 세 씬 (전부 «실제 게임 경로» — 상태를 손으로 밀어 넣지 않는다):
 *   A  다이아 팩 우편 수령  — 우편 한 통에 **다이아 + 마일리지**(153·497 경로: `devBuyDia('d4')`
 *      가 `sendMail({c:900000, m:1})` 을 쌓는다). 다이아는 알약이 있어 날고, 마일리지는
 *      `FXCUR.mile.pill === null` 이라 **한 개도 안 난다**(512 ③ — 도착지가 없으면 버스트+`+n`).
 *      ⇒ «상대 재화» 가 실제로는 없는데 `other` 가 참이면 다이아 개수가 절반이 된다.
 *   B  대조 — 다이아만 든 우편(m2: c 40,000). 상대가 아예 없으니 개수 상한은 단독(6)이다.
 *   C  대조 — 골드+다이아가 **둘 다 나는** 우편(m1: g 3,000 · c 80,000 · r 300).
 *      여기서 «각자 절반» 은 93 3회차가 일부러 넣은 규칙이라 **고쳐지면 안 된다**.
 *
 * 읽는 값: 씬마다 재화별 «동시에 떠 있던 비행 최대 개수» 와 그 묶음이 정한 `fxCnt2`.
 *   A 가 B 와 같으면 결함 없음, A 가 C 와 같으면 등재문대로 과탐지다.
 *
 * ⚑ **수리 전 실측(2026-08-31, 이 자의 첫 실행 — 등재문 그대로 확인)**
 *      A 다이아+마일리지 : dia **3** · mile 0 · fxCnt2 **true**   ← 상대가 안 나는데 절반
 *      B 다이아만        : dia **6** · fxCnt2 false               ← 단독 상한
 *      C 골드+다이아      : gold 3 · dia 3 · relic 0 · fxCnt2 true ← 진짜 동시(93 3회차, 정상)
 *    즉 A 는 «안 나는 마일리지» 때문에 C 와 **구분되지 않았다**. 아래 항목은 그 상태에서
 *    [2]·[3]·[4] 가 빨갛고 수리 뒤 초록이 되도록 «옳은 거동» 으로 적혀 있다.
 *
 * 실행: node tools/probe569.js            (씬 A·B·C 를 한 번씩)
 *       P569_FILE=.v569-neg.html node …   (수리 전 사본을 물려 대조할 때) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', process.env.P569_FILE || 'index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 한 씬 = 새 로드 → 우편함 → 지정한 한 통의 [받기] 클릭 → 비행을 프레임마다 센다.
   prep 은 클릭 전에 도는 준비(예: 다이아 팩 구매로 우편 한 통 쌓기)이고,
   pick 은 «어떤 우편을 받을 것인가» 를 돌려준다. */
async function scene(name, prep, pick) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForTimeout(1100);

  /* 전투 루프를 세운다 — 배경 킬 골드가 묶음에 끼면 «상대 재화» 판정이 오염된다(554 선례). */
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });
  await p.evaluate(prep);
  await p.evaluate(() => openMail());
  await p.waitForTimeout(400);

  const id = await p.evaluate(pick);
  const before = await p.evaluate(() => ({
    acc: Object.assign({}, fxAcc),
    pill: Object.keys(FXCUR).reduce((o, k) => (o[k] = !!fxPill(FXCUR[k]), o), {}),
    cnt2: fxCnt2
  }));

  const r = await p.evaluate(async (mid) => {
    const btn = document.querySelector('button[data-ml="' + mid + '"]');
    if (!btn) return { err: 'no button ' + mid };
    /* 비행이 «어느 재화» 인지는 제품이 그린 아이콘 파일명이 말한다(fxFlies 의 cur 과 교차 확인). */
    const seen = {}, accHit = {}, snap = [];
    let cnt2 = false, cnt2Seen = false;
    /* ⚑ 묶음이 «무엇을 상대로 봤는가» 는 폴링으로는 못 잡는다(같은 프레임에 다 끝난다) —
       `fxFly` 를 감싸 **호출 순간의 `fxAcc`** 와 **그 호출이 정한 `fxCnt2`** 를 그대로 적는다.
       제품 코드는 안 고친다(전역 바인딩만 감쌌다가 되돌린다 — probe564 와 같은 방식). */
    const calls = [];
    const _fly = window.fxFly;
    window.fxFly = function (from, cur, n) {
      const acc = {}; for (const k in fxAcc) if (fxAcc[k] > 0) acc[k] = Math.round(fxAcc[k]);
      const n0 = fxFlies.length;
      const r = _fly(from, cur, n);
      calls.push({ cur, n: Math.round(n), acc, cnt2: fxCnt2, spawned: fxFlies.length - n0 });
      return r;
    };
    const t0 = performance.now();
    btn.click();
    await new Promise((res) => {
      const tick = () => {
        const t = performance.now() - t0;
        const now = {};
        for (const f of fxFlies) { if (!f.ui) continue; now[f.cur] = (now[f.cur] || 0) + 1; }
        for (const k in now) seen[k] = Math.max(seen[k] || 0, now[k]);
        for (const k in fxAcc) if (fxAcc[k] > 0) accHit[k] = true;
        if (fxFlies.length && !cnt2Seen) { cnt2 = fxCnt2; cnt2Seen = true; }
        snap.push({ t: Math.round(t), n: Object.assign({}, now) });
        if (t >= 1600) return res();
        setTimeout(tick, 16);
      };
      tick();
    });
    window.fxFly = _fly;
    /* 그려진 노드로도 한 번 더 — 개수 축이 fxFlies 하나에만 걸리지 않게 한다 */
    return { seen, accHit, cnt2, cnt2Seen, calls,
             snapMax: snap.reduce((m, s) => Math.max(m, Object.values(s.n).reduce((a, b2) => a + b2, 0)), 0) };
  }, id).finally(() => b.close());

  return { name, id, before, ...r };
}

const S_A = {
  prep: () => { window.devBuyDia('d4'); },                       /* 497 팩 d4 = 다이아 90만 + 마일리지 1 */
  pick: () => (S.mailx || []).filter(m => !S.mail[m.id]).map(m => m.id).pop()
};
const S_B = { prep: () => {}, pick: () => 'm2' };                /* 다이아만 */
const S_C = { prep: () => {}, pick: () => 'm1' };                /* 골드+다이아(+유물조각) */

(async () => {
  console.log('PROBE569 — fxCnt2 «두 재화 동시» 과탐지 재현\n');
  const A = await scene('A 다이아+마일리지', S_A.prep, S_A.pick);
  const B = await scene('B 다이아만',        S_B.prep, S_B.pick);
  const C = await scene('C 골드+다이아',      S_C.prep, S_C.pick);

  for (const r of [A, B, C]) {
    if (r.err) { console.log(`  [${r.name}] ERR ${r.err}`); continue; }
    const per = Object.entries(r.seen).map(([k, v]) => `${k} ${v}`).join(' · ') || '(없음)';
    console.log(`  [${r.name}] 우편 ${r.id} · 동시 최대 ${per} · 총 ${r.snapMax}`);
    for (const c of r.calls || []) {
      console.log(`      fxFly(${c.cur}, ${c.n}) — 그 순간 fxAcc {${Object.entries(c.acc).map(([k, v]) => k + ':' + v).join(', ')}}`
        + ` → 스폰 ${c.spawned}개 · fxCnt2 ${c.cnt2}`);
    }
  }
  /* 씬별 «다이아 묶음이 정한 fxCnt2» — 폴링이 아니라 호출 기록에서 읽는다 */
  const diaCnt2 = r => { const c = (r.calls || []).find(x => x.cur === 'dia'); return c ? c.cnt2 : null; };
  A.cnt2 = diaCnt2(A); B.cnt2 = diaCnt2(B); C.cnt2 = diaCnt2(C);
  console.log('\n  [알약 유무] ' + Object.entries(A.before.pill).map(([k, v]) => `${k} ${v ? 'O' : 'X'}`).join(' · '));

  console.log('\n[1] 알약 없는 재화는 실제로 «한 개도 안 난다»');
  ok(!A.seen.mile, `A: mile 비행 ${A.seen.mile || 0}개 — 512 ③ 대로 도착지가 없으면 안 난다`);

  console.log('[2] 안 나는 재화는 «상대» 가 아니다 (수리 전 true)');
  ok(A.cnt2 === false, `A: 다이아 묶음이 정한 fxCnt2 = ${A.cnt2} (수리 전 true — 마일리지를 상대로 셌다)`);

  console.log('[3] 그래서 다이아 개수가 단독과 같다 — 단독 대조(B)와 비교 (수리 전 3 < 6)');
  ok((A.seen.dia || 0) === (B.seen.dia || 0),
    `A dia ${A.seen.dia || 0} == B dia ${B.seen.dia || 0} — 상대가 없으니 단독 상한 그대로다`);

  console.log('[4] «진짜 두 재화»(C)와 구분된다 (수리 전 둘 다 3 이라 구분 불가)');
  ok((A.seen.dia || 0) > (C.seen.dia || 0),
    `A dia ${A.seen.dia || 0} > C dia ${C.seen.dia || 0} — 과탐지와 진짜 동시가 갈린다`);

  console.log('[5] 살아 있어야 하는 규칙 — 진짜 두 재화는 각자 절반(93 3회차)');
  ok((C.seen.gold || 0) > 0 && (C.seen.dia || 0) > 0 && (C.seen.dia || 0) < (B.seen.dia || 0),
    `C: gold ${C.seen.gold || 0} · dia ${C.seen.dia || 0} — 둘 다 날고 단독(${B.seen.dia || 0})보다 적다`);

  console.log(`\nPROBE569 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(0);
})();
