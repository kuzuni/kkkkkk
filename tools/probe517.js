/* 작업 517 재현 프로브 — «훈련 단계 돌파 필요 경험치 = 1~4단계 300 · 5~7단계 600 · 8 이후 900»
 * (저장소 주인 지시 2026-08-31 — 326 번복)
 *
 *   node tools/probe517.js
 *
 * 338 규칙 — 처방(구간표 교체 + 세이브 이관)을 짜기 전에 **제품에게 먼저 묻는다.**
 * PROGRESS 517 등재문이 세운 것 셋을 한 자로 굴린다:
 *   ⓐ 현행 곡선이 정말 «300n»(326 증가식)인가 — 486 스크린샷의 «9단계 0/2700» 이 그 식인가.
 *   ⓑ 신 구간표를 깔면 상한이 **작아지는 세이브가 어디부터인가** — 등재문은 «9단계» 를 예로 들었다.
 *   ⓒ 상한이 작아져 `lv > trainCap()` 이 되면 제품이 그 상태를 어떻게 읽는가 —
 *      등재문의 예상은 ① 표시만 깎임 ② `trainReady()` 즉시 참 → **단계 연쇄 폭등** ③ 진행바 굳음,
 *      그리고 **19841 의 483 단계 재산정 코드**(`while(k < b.trainStage && trainCapAt(k) <= lo) k++`)가
 *      그 상황을 «못 본다»(Math.min 이라 내리기만 한다).
 *
 * ⚠ **수리 전 트리에서 돌린다.** 신 구간표는 아직 없으므로 ⓒ 는 «상한이 작아진 세이브» 대신
 *    **레벨이 상한 위에 있는 세이브**로 같은 코드 경로를 밟는다 — `trainCap()`/`trainReady()`/
 *    `trainLvRel()`/이관 블록이 보는 것은 «lv 와 cap 의 대소» 하나뿐이라 경로가 동일하다.
 *    ⓑ 는 제품을 안 고치고도 답이 나온다(두 식을 나란히 계산한다).
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용 · LESSONS 319 — evaluate 예외는 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 주인 신 지시 — 단계 «그 단계 몫»(3종 합). 8단계 이후는 900 고정. */
const NEED_NEW = n => (n <= 4 ? 300 : n <= 7 ? 600 : 900);
const CAP_NEW = n => { let s = 0; for (let k = 1; k <= n; k++) s += NEED_NEW(k) / 3; return s; };
/* 현행(326) — 스탯당 몫 100n · 상한 누적합 100·n(n+1)/2 */
const CAP_OLD = n => 100 * n * (n + 1) / 2;

const save = (stage, l) => ({
  gold: 1e30, dia: 1e9, best: 60, a105: 1, buyQty: 1, autoBuy: false,
  trainStage: stage, lv: { atk: l, hp: l, regen: l },
});

async function open(browser, sv) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  if (sv) await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(sv)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainProg === 'function');
  await page.evaluate(() => { window.step = () => {}; });   /* 전투 루프를 세워 값이 흔들리지 않게 */
  await page.waitForTimeout(400);
  return { ctx, page };
}
const evOf = (page) => async (fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 220) }; }
};

/* 어느 트리에서 돌고 있는가 — 신 구간표(`TRAIN_NEED`)가 깔려 있으면 «수리 후» 다.
   같은 명령이 두 트리에서 **둘 다 초록**이어야 한다: 이 프로브는 «무엇이 바뀌었나» 를 재는 자다.
   (`git stash` 로 제품만 되돌려 같은 명령을 돌리면 §A·§C 가 수리 전 표를 그대로 다시 찍는다.) */
let NEW = false;

(async () => {
  const browser = await launch(chromium);

  /* ══════════════════════════════════════════════════════════════════════
     §A ⓐ 지금 깔린 곡선 — 제품 함수에게 직접 묻는다
     ══════════════════════════════════════════════════════════════════════ */
  {
    const { ctx, page } = await open(browser, null);
    const ev = evOf(page);
    NEW = await ev(() => typeof TRAIN_NEED !== 'undefined') === true;
    console.log('\n' + '='.repeat(72) + '\n  §A ⓐ 지금 깔린 곡선 — 제품 함수 직접 호출  ['
      + (NEW ? '수리 후 · 517 구간표' : '수리 전 · 326 증가식') + ']\n' + '='.repeat(72));

    blk('A1 단계 1~12 의 «그 단계 몫»(3종 합)과 상한');
    const cur = await ev(() => {
      const r = [];
      for (let n = 1; n <= 12; n++) r.push({ n, cap: trainCapAt(n), step3: (trainCapAt(n) - trainCapAt(n - 1)) * 3 });
      return r;
    });
    if (cur.__err) { console.log('  ❌ ' + cur.__err); fail++; }
    else {
      console.log('   n :  몫(3종 합)   상한(스탯당)');
      cur.forEach(r => console.log('  ' + String(r.n).padStart(2) + ' : ' + String(r.step3).padStart(10)
        + String(r.cap).padStart(14)));
      const need = n => (NEW ? NEED_NEW(n) : 300 * n), cap = n => (NEW ? CAP_NEW(n) : CAP_OLD(n));
      ok(cur.every(r => r.step3 === need(r.n)),
        '몫이 ' + (NEW ? '주인 구간표(300·300·300·300·600·600·600·900…)' : '«300×단계»(326 증가식)') + ' 다');
      ok(cur.every(r => r.cap === cap(r.n)),
        '상한이 ' + (NEW ? '구간표 누적합' : '누적합 100·n(n+1)/2') + ' 이다');
    }

    blk('A2 486 스크린샷 — 9단계에서 진행바 분모가 얼마인가');
    const den9 = await ev(() => {
      S.trainStage = 9; return { max: trainMax(), cap: trainCap(), base: trainBase() };
    });
    if (den9.__err) { console.log('  ❌ ' + den9.__err); fail++; }
    else {
      console.log('  9단계 → 분모 ' + den9.max + ' · 상한(스탯당) ' + den9.cap + ' · 기저 ' + den9.base);
      ok(den9.max === (NEW ? 900 : 2700), NEW ? '주인 지시대로 «8 이후 900» 이다'
        : '주인 스크린샷의 «0/2700» 이 이 식이다');
      ok(den9.cap === (NEW ? 1600 : 4500), '9단계 상한(스탯당) = ' + (NEW ? '1,600' : '4,500'));
    }
    await ctx.close();
  }

  /* ══════════════════════════════════════════════════════════════════════
     §B ⓑ 신 구간표를 깔면 «상한이 작아지는» 세이브가 어디부터인가
     ══════════════════════════════════════════════════════════════════════ */
  {
    console.log('\n' + '='.repeat(72) + '\n  §B ⓑ 신 구간표 vs 현행 — 상한이 작아지는 구간\n' + '='.repeat(72));
    blk('B1 단계별 상한(스탯당) 대조');
    console.log('   n :   현행(326)   신(517)    차');
    let firstShrink = 0;
    for (let n = 1; n <= 12; n++) {
      const o = CAP_OLD(n), w = CAP_NEW(n);
      if (!firstShrink && w < o) firstShrink = n;
      console.log('  ' + String(n).padStart(2) + ' : ' + String(o).padStart(11) + String(w).padStart(10)
        + String(w - o).padStart(8));
    }
    ok(firstShrink === 2, '상한이 작아지기 시작하는 단계 = 2 (등재문의 «9단계» 는 예시일 뿐 '
      + '**2단계 이상 모든 세이브**가 넘친다)');
    ok(CAP_NEW(9) === 1600 && CAP_OLD(9) === 4500, '9단계 — 4,500 → 1,600 (등재문 수치 확인)');
  }

  /* ══════════════════════════════════════════════════════════════════════
     §C ⓒ 상한이 레벨보다 «작아진» 상태를 제품이 어떻게 읽는가
        (수리 전 트리에서는 lv 를 상한 위에 놓아 같은 경로를 밟는다)
     ══════════════════════════════════════════════════════════════════════ */
  {
    /* 신 표에서 9단계 세이브가 놓일 자리와 같은 모양: 단계 9 · lv 4500(현행 상한 4500 = 꽉) 이
       아니라, «상한이 1600 으로 줄어든 것» 과 같은 대소를 만들려면 단계를 낮춰 상한을 낮춘다.
       단계 4(상한 1000) · lv 4500 ⇒ lv/cap = 4.5 배로 신 표의 9단계(4500/1600 = 2.8배)보다 더 깊다. */
    const { ctx, page } = await open(browser, save(4, 4500));
    const ev = evOf(page);
    console.log('\n' + '='.repeat(72) + '\n  §C ⓒ lv(4,500) > cap — 제품의 읽기\n' + '='.repeat(72));

    blk('C1 로드 직후 — 483 이관 블록은 이 상황을 보는가');
    const st = await ev(() => ({
      stage: trainStage(), cap: trainCap(), base: trainBase(),
      lv: TRAIN_STATS.map(id => lv(id)), rel: TRAIN_STATS.map(id => trainLvRel(id)),
      prog: trainProg(), max: trainMax(), ready: trainReady(),
    }));
    if (st.__err) { console.log('  ❌ ' + st.__err); fail++; }
    else {
      console.log('  단계 ' + st.stage + ' · cap ' + st.cap + ' · base ' + st.base
        + ' · lv ' + st.lv.join('/') + ' → rel ' + st.rel.join('/'));
      console.log('  진행 ' + st.prog + '/' + st.max + ' · trainReady ' + st.ready);
      if (!NEW) {
        ok(st.stage === 4, '483 이관 블록은 단계를 «안 올린다»(Math.min — 내리기 전용)');
        ok(st.prog === st.max, '진행바가 로드 즉시 꽉 찬다 (' + st.prog + '/' + st.max + ')');
        ok(st.ready === true, 'trainReady() 가 로드 즉시 참 — [↑] 가 열려 있다');
      } else {
        ok(st.stage === 19, '517 이관이 단계를 «자연 단계»(19)로 올려 놓는다 — [↑] 를 다 눌렀을 때와 같은 자리');
        ok(st.prog < st.max && st.prog === 600, '진행바가 «이번 단계 몫» 안에 있다 (' + st.prog + '/' + st.max + ')');
        ok(st.ready === false, 'trainReady() 가 거짓 — [↑] 가 로드 직후에 열려 있지 않다');
      }
    }

    blk('C2 [↑] 를 계속 누르면 어디까지 오르나 — «단계 연쇄 폭등»');
    const climb = await ev(() => {
      const seen = [];
      let guard = 0;
      while (trainReady() && guard++ < 200) { const s0 = trainStage(); trainUp(); seen.push(trainStage()); if (trainStage() === s0) break; }
      return { from: 4, to: trainStage(), presses: seen.length, cap: trainCap(), prog: trainProg(), max: trainMax() };
    });
    if (climb.__err) { console.log('  ❌ ' + climb.__err); fail++; }
    else {
      console.log('  단계 ' + climb.from + ' → ' + climb.to + ' (' + climb.presses + '회 연속 승급) · '
        + '끝난 자리 진행 ' + climb.prog + '/' + climb.max + ' · cap ' + climb.cap);
      /* «자연 단계» = `capAt(n) > lo` 를 처음 만족하는 n. lv 4,500 은 수리 전 cap(9)=4,500 을 «꽉»
         채우므로 9 에서도 [↑] 가 열려 10 까지 간다(경계는 ≥ 다 — `trainReady` 가 `lv >= cap`). */
      if (!NEW) {
        ok(climb.presses > 1, '한 번 열린 [↑] 가 «연쇄» 로 눌린다 — 이관 없이 두면 이렇게 된다');
        ok(climb.to === 10, '레벨이 허락하는 자리(자연 단계 10)까지 오른다 — 폭등의 끝은 «자연 단계» 다');
      } else {
        ok(climb.presses === 0, '누를 것이 없다 — 이관이 이미 그 자리에 세워 놨다(연쇄 0회)');
        ok(climb.to === 19, '단계는 자연 단계 19 그대로 — 이관이 «한 단계도 더» 주지 않는다');
      }
    }
    await ctx.close();
  }

  /* ══════════════════════════════════════════════════════════════════════
     §D 483 방향(lv < base)은 신 표에서도 그대로 필요한가
     ══════════════════════════════════════════════════════════════════════ */
  {
    const { ctx, page } = await open(browser, save(9, 900));
    const ev = evOf(page);
    console.log('\n' + '='.repeat(72) + '\n  §D 483 방향 — 326 이전 세이브(단계 9 · lv 900)\n' + '='.repeat(72));
    const st = await ev(() => ({ stage: trainStage(), cap: trainCap(), base: trainBase(), prog: trainProg(), max: trainMax() }));
    if (st.__err) { console.log('  ❌ ' + st.__err); fail++; }
    else {
      console.log('  단계 ' + st.stage + ' · cap ' + st.cap + ' · base ' + st.base + ' · 진행 ' + st.prog + '/' + st.max);
      ok(st.stage === (NEW ? 7 : 4), '이관이 단계를 «레벨이 산 만큼»(' + (NEW ? '신 표 7' : '구 표 4')
        + ')으로 내려 놓는다 — 483 이 세운 이 방향은 517 뒤에도 살아 있다');
      /* 신 표에서 같은 세이브가 놓일 자리 — 계산으로만(제품은 아직 구 표다) */
      let k = 1; while (CAP_NEW(k) <= 900) k++;
      console.log('  신 구간표에서 같은 세이브의 «자연 단계» = ' + k + ' (cap(' + (k - 1) + ')='
        + CAP_NEW(k - 1) + ' ≤ 900 < cap(' + k + ')=' + CAP_NEW(k) + ')');
      ok(k === 7, '신 표에서도 같은 답(7) — 이관 규칙은 «자연 단계» 한 줄로 두 방향을 다 덮는다');
    }
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + '='.repeat(72));
  console.log('PROBE517 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
