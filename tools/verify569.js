/* 작업 569 게이트 — «두 재화 동시»(`fxCnt2`)는 **같이 나는** 재화만 센다.
 *
 * 무엇을 지키나 — 93 3회차가 세운 규칙은 «골드·다이아가 같이 들어오면 두 묶음이 겹치니 각자 절반»
 * 이다. 512 가 `FXCUR` 를 7종으로 넓히면서 그 판정이 **알약(도착지)이 없어 한 개도 안 나는 재화**
 * 까지 세게 됐고, 다이아 팩 우편(다이아 + 마일리지 쿠폰) 한 통이 6개가 아니라 3개로 났다
 * (`probe569` 수리 전 실측: 씬 A dia **3** · mile 비행 **0** · fxCnt2 **true**).
 *
 *   [A] 과탐지가 없다 — 다이아+마일리지 묶음: 다이아 **단독 상한**으로 나고 `fxCnt2` 는 false,
 *       마일리지 비행은 0(512 ③ 「도착지 없으면 안 난다」가 그대로 살아 있다).
 *   [B] 단독 기준선 — 다이아만 든 우편이 [A] 와 **같은 개수**로 난다(A 의 «6» 이 상한임을 못박는다).
 *   [C] 살아 있어야 하는 규칙 — 골드+다이아는 종전대로 **각자 절반**이고 `fxCnt2` 는 true.
 *   [D] 좁히지 않았다 — 41 재화 바가 **열린** 화면(89 유물 페이지)에서는 유물조각에 알약이 생기므로
 *       실제로 날고, 그때는 다시 «상대» 로 세어진다. 판정 축이 «알약 유무» 임을 이 항이 못박는다
 *       («마일리지·강화석을 이름으로 빼는» 식의 무른 수리였다면 여기서 빨개진다).
 *   [R] 되돌림 시험 — 조건에서 `&& !!fxPill(FXCUR[k2])` 만 뺀 사본(= 569 이전)에서 [A] 가
 *       **3 · true** 로 무너진다. 이 항이 없으면 위 넷은 «이미 참인 것을 굳힌 자» 와 구분되지 않는다
 *       (338 규칙).
 *
 * 실행: node tools/verify569.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
/* ⚠ 사본은 **저장소 루트**에 둔다 — /tmp 에 두면 index.html 이 상대 경로로 무는 assets/** 가
   통째로 404 다(360·367·438·439·453·467·471·541 선례). */
const NEG = path.join(ROOT, `.v569-neg-${process.pid}.html`);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

/* 우편 한 통을 받고 «묶음이 무엇을 상대로 봤는가 · 몇 개를 쐈는가» 를 그대로 받아 적는다.
   폴링으로는 못 잡는다(같은 프레임에 끝난다) — `fxFly` 를 감싸 호출 인자와 결과를 적는다.
   제품 코드는 안 고친다: 전역 바인딩을 감쌌다가 되돌린다(probe564 와 같은 방식). */
async function claim(file, prep, pick) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto('file://' + file);
  await p.waitForTimeout(1100);
  /* 배경 전투 골드가 묶음에 끼면 «상대 재화» 축이 오염된다(554 선례) — 루프를 세운다. */
  await p.evaluate(() => { if (typeof window.step === 'function') window.step = () => {}; });
  await p.evaluate(prep);
  await p.evaluate(() => openMail());
  await p.waitForTimeout(400);
  const id = await p.evaluate(pick);
  const out = await p.evaluate(async (mid) => {
    const btn = document.querySelector('button[data-ml="' + mid + '"]');
    if (!btn) return { err: 'no button ' + mid };
    const calls = [], seen = {};
    const _fly = window.fxFly;
    window.fxFly = function (from, cur, n) {
      const n0 = fxFlies.length;
      const r = _fly(from, cur, n);
      calls.push({ cur, cnt2: fxCnt2, spawned: fxFlies.length - n0 });
      return r;
    };
    const t0 = performance.now();
    btn.click();
    await new Promise((res) => {
      const tick = () => {
        const now = {};
        for (const f of fxFlies) { if (!f.ui) continue; now[f.cur] = (now[f.cur] || 0) + 1; }
        for (const k in now) seen[k] = Math.max(seen[k] || 0, now[k]);
        if (performance.now() - t0 >= 1500) return res();
        setTimeout(tick, 16);
      };
      tick();
    });
    window.fxFly = _fly;
    const pill = {}; for (const k in FXCUR) pill[k] = !!fxPill(FXCUR[k]);
    return { calls, seen, pill };
  }, id).finally(() => b.close());
  return { id, ...out };
}

const cnt2Of = (r, cur) => { const c = (r.calls || []).find(x => x.cur === cur); return c ? c.cnt2 : null; };
const spawn = (r, cur) => { const c = (r.calls || []).find(x => x.cur === cur); return c ? c.spawned : 0; };

/* 497 팩 d4 = 다이아 90만 + 마일리지 쿠폰 1 짜리 우편 한 통.
   ⚑ **697(2026-09-02) 이관** — 구매는 더는 우편을 만들지 않는다(즉시 지급). 569 가 재는 것은
   «우편 한 통을 **수령**할 때 나는 비행 개수» 라 표본을 «사서 만든 통» 에서 **옛 세이브에 남아
   있는 통**으로 옮긴다(주인 «소급 삭제 금지» — 그 통은 실재하고 그대로 수령된다).
   내용은 d4 팩과 **같은 표**에서 뽑는다(값이 움직여도 표본이 따라온다). */
const PREP_PACK = () => {
  const p = DIA_PACKS.find(x => x.id === 'd4');
  window.sendMail({ t:'🛒 ' + diaPackName(p), c:p.dia, m:p.cp || 0, src:'shop', b:'697 이전 발송분' });
};
const PICK_LAST = () => (S.mailx || []).filter(m => !S.mail[m.id]).map(m => m.id).pop();

(async () => {
  console.log('VERIFY569 — «두 재화 동시» 는 같이 나는 재화만 센다\n');

  /* ── [A] 과탐지 없음 ────────────────────────────────────────────── */
  console.log('[A] 다이아 + 마일리지 쿠폰 — 마일리지는 안 나므로 «상대» 가 아니다');
  const A = await claim(SRC, PREP_PACK, PICK_LAST);
  console.log(`     우편 ${A.id} · 스폰 ${JSON.stringify(A.calls)}`);
  ok(!A.pill.mile, `마일리지는 알약이 없다(fxPill mile = ${A.pill.mile})`);
  ok(spawn(A, 'mile') === 0, `마일리지 비행 ${spawn(A, 'mile')}개 — 512 ③ 그대로`);
  ok(cnt2Of(A, 'dia') === false, `다이아 묶음의 fxCnt2 = ${cnt2Of(A, 'dia')} (569 이전 true)`);
  ok((A.seen.dia || 0) === 6, `다이아 동시 최대 ${A.seen.dia || 0}개 = 단독 상한 6 (569 이전 3)`);

  /* ── [B] 단독 기준선 ────────────────────────────────────────────── */
  console.log('\n[B] 단독 기준선 — 다이아만 든 우편(m2)');
  const B = await claim(SRC, () => {}, () => 'm2');
  ok((B.seen.dia || 0) === (A.seen.dia || 0),
    `단독 ${B.seen.dia || 0} == [A] ${A.seen.dia || 0} — [A] 의 값이 «상한» 이 맞다`);
  ok(cnt2Of(B, 'dia') === false, `단독 묶음의 fxCnt2 = ${cnt2Of(B, 'dia')}`);

  /* ── [C] 살아 있어야 하는 규칙 ──────────────────────────────────── */
  console.log('\n[C] 진짜 «두 재화 동시» 는 종전대로 각자 절반(93 3회차 · m1 골드+다이아)');
  const C = await claim(SRC, () => {}, () => 'm1');
  ok(cnt2Of(C, 'gold') === true && cnt2Of(C, 'dia') === true,
    `골드·다이아 묶음의 fxCnt2 = ${cnt2Of(C, 'gold')}·${cnt2Of(C, 'dia')}`);
  ok((C.seen.gold || 0) > 0 && (C.seen.dia || 0) > 0, `둘 다 난다 — gold ${C.seen.gold || 0} · dia ${C.seen.dia || 0}`);
  ok((C.seen.dia || 0) < (B.seen.dia || 0), `각자 절반 — dia ${C.seen.dia || 0} < 단독 ${B.seen.dia || 0}`);
  ok((C.seen.gold || 0) >= 3 && (C.seen.dia || 0) >= 3,
    `사양 하한 3 유지(verify58 [2]·verify93) — ${C.seen.gold || 0}·${C.seen.dia || 0}`);

  /* ── [D] 좁히지 않았다 — 알약이 «생기는» 화면에서는 다시 센다 ──── */
  console.log('\n[D] 41 재화 바가 열린 화면(89 유물 페이지)에서는 유물조각이 날고 상대로 세어진다');
  const D = await claim(SRC, () => { openRelw(); }, () => 'm1');
  ok(D.pill.relic, `89 유물 페이지에서는 유물조각에 알약이 있다(fxPill relic = ${D.pill.relic})`);
  ok(spawn(D, 'relic') > 0, `유물조각 비행 ${spawn(D, 'relic')}개 — 실제로 난다`);
  ok(cnt2Of(D, 'dia') === true, `다이아 묶음의 fxCnt2 = ${cnt2Of(D, 'dia')} — 알약이 있으면 종전대로 상대다`);

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 조건에서 `&& !!fxPill(FXCUR[k2])` 만 빼면 [A] 가 무너진다');
  const src = fs.readFileSync(SRC, 'utf8');
  const NEEDLE = "fxAcc[k2] > 0 && !!fxPill(FXCUR[k2])";
  if (src.indexOf(NEEDLE) < 0) {
    ok(false, '되돌릴 자리를 못 찾았다 — 조건식이 바뀌었다면 이 자도 같이 고칠 것');
  } else {
    fs.writeFileSync(NEG, src.replace(NEEDLE, "fxAcc[k2] > 0"), 'utf8');
    try {
      const R = await claim(NEG, PREP_PACK, PICK_LAST);
      console.log(`     (되돌림) 스폰 ${JSON.stringify(R.calls)}`);
      ok(cnt2Of(R, 'dia') === true, `되돌린 사본의 fxCnt2 = ${cnt2Of(R, 'dia')} (참이어야 «수리 전» 이다)`);
      ok((R.seen.dia || 0) < (A.seen.dia || 0),
        `되돌린 사본 dia ${R.seen.dia || 0} < 지금 ${A.seen.dia || 0} — 이 자가 실제로 그 한 항을 잰다`);
      ok(spawn(R, 'mile') === 0, `되돌려도 마일리지는 여전히 0개 — 결함은 «개수» 축 하나다`);
    } finally { try { fs.unlinkSync(NEG); } catch (e) {} }
  }

  console.log(`\nVERIFY569 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
