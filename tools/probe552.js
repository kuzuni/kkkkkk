#!/usr/bin/env node
/* 552 재현기 — `verify77` [B] 「combat 묶음의 +n 이 #fxlc 에 없다」 가 왜 뜨고 지는가
 *
 *   node tools/probe552.js [반복수] [--dead] [--dump]
 *
 * 등재문의 두 갈래를 «찍힌 자리» 로 가른다(338 규칙):
 *   ⓐ 자 쪽 — [B] 는 층별 `.fx-plus` 를 **개수 델타**로 잰다. 그런데 이 자는 배경 자동 전투가
 *             돌아가는 채로 재므로, 호출 직전 #fxlc 에 있던 **남의 전투 `+n`**(수명 840ms)이
 *             700ms 창 안에 사라지면 «내 것이 들어왔는데도» 델타가 0 이 된다.
 *   ⓑ 제품 쪽 — combat 묶음의 `+n` 이 `#fxl`(팝업 **위**)로 샌다.
 *
 * 두 갈래를 한 번에 가르는 자:
 *   ① 두 묶음의 **금액을 다르게** 준다(combat 1,010 / UI 2,020) — 542 «금액으로 묶음 고르기».
 *      배경 전투 금액과도 겹치지 않으므로 «내 +n» 을 글자로 정확히 집는다.
 *   ② `MutationObserver` 로 **어느 층에 무엇이 언제 붙었는지**를 그대로 적는다(잔존 수가 아니라 생성).
 *   ③ 같은 시나리오를 **배경 전투를 막고**(`killEnemy` 무력화 — [E] 선례) 한 번 더 돌린다.
 *      ⓐ 라면 격리했을 때만 델타가 안정되고, ⓑ 라면 격리해도 #fxl 에 combat 금액이 찍힌다.
 *
 * ⚑⚑ 946 4회차 — **판정 축을 «700ms 잔존 델타» 에서 «어느 층에 생성됐나» 로 옮겼다.**
 *   부하(`par 7`)에서 이 자가 흔들린 얼굴은 하나였다: 격리한 표본에서 내 `+n` 이
 *   **#fxlc 에 정확히 붙었는데(@805ms)** 자의 고정 창이 700ms 라 «격리해도 델타가 빨갛다 —
 *   오염 말고 다른 축이 있다» 로 **제품을 지목**했다(한가할 때 붙는 시각은 234~282ms).
 *   곧 옛 축의 전제는 «700ms 안에 도착이 끝난다» 였고 부하가 그 전제를 깬다.
 *   ⇒ 새 축은 시각을 안 본다 — **도착할 때까지 기다렸다가 «어느 층인가» 만** 본다.
 *   기다리는 한도도 손으로 안 적는다: 제품이 자기 `fxFlies` 에 적어 둔 `dur`·`t`(출발 지연)에서
 *   **약속한 도착 시각을 읽어** 그 배수로 잡는다(757 «손 상수 금지» · 946 3회차 ㉢ 와 같은 꼴).
 *   옛 축의 수는 **버리지 않고 계기판으로 계속 찍는다**(«옛 축으로 세면 미달 N 건»).
 *
 * ⚑ 셈은 셋이다(946 3회차 규약) — **통과 / 실패(제품) / 무효(자가 못 쟀다)**.
 *   판정 표본이 하나도 없으면 «실패» 가 아니라 **«못 쟀다»(종료 코드 3)** 로 답한다(939 규약).
 *   ⚠ 무르게 푼 수리가 아님은 `--dead` 되돌림 시험이 매 실행 못박는다 — `fxPlus` 가 combat 을
 *   잃은 사본에서는 `+n` 이 **#fxl 에 그대로 생성**되므로 무효로 안 빠지고 전부 빨갛다.
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const ARGV = process.argv.slice(2);
const DEAD = ARGV.includes('--dead');
const DUMP = ARGV.includes('--dump');
const N = Math.max(1, parseInt(ARGV.find((a) => /^\d+$/.test(a)) || '10', 10));
const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

/* 옛 축이 쓰던 창 — **판정에서 뺐고 계기판으로만 남긴다**(위 헤더 참조). */
const OLD_WIN = 700;

/* 페이지 안에서 도는 한 회차 — isolate 면 배경 전투 획득을 막는다 */
async function round(page, isolate, dead){
  return page.evaluate(async ([iso, dd, oldWin]) => {
    const L = document.getElementById('fxl'), LC = document.getElementById('fxlc');
    const realKill = killEnemy;
    const realPlus = fxPlus;
    if (iso) killEnemy = () => {};
    /* 되돌림 시험 — «층이 안 따라가는» 사본(verify77 [B-R] 과 같은 방식) */
    if (dd) fxPlus = (cur, n, combat, at) => realPlus(cur, n, false, at);
    try {
      if (iso) await new Promise((res) => setTimeout(res, 1000));   /* 앞 비행 착지 대기([E] 선례) */
      const log = [];
      const t0 = performance.now();
      const watch = (id, el) => { const o = new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes)
          if (n.classList && n.classList.contains('fx-plus'))
            log.push({ lay: id, txt: n.textContent, t: Math.round(performance.now() - t0) });
      }); o.observe(el, { childList: true }); return o; };
      const oL = watch('fxl', L), oLC = watch('fxlc', LC);
      /* [B] 와 같은 호출 — 금액만 다르게(내 묶음을 글자로 집기 위해) */
      const cN = 1010, uN = 2020;
      const base = { l: L.querySelectorAll('.fx-plus').length, lc: LC.querySelectorAll('.fx-plus').length };
      fxFly({ x: 540, y: 1200, combat: true }, 'gold', cN);
      const flyC = LC.querySelectorAll('.fx-fly').length;
      fxFly({ x: 540, y: 1200 }, 'gold', uN);
      const flyU = L.querySelectorAll('.fx-fly').length;

      const cTxt = (typeof fmtCur === 'function') ? '+' + fmtCur('gold', cN) : null;
      const uTxt = (typeof fmtCur === 'function') ? '+' + fmtCur('gold', uN) : null;

      /* ⚑ 한도를 제품에서 읽는다 — `fxFlies` 의 내 묶음이 «언제 도착한다» 고 적어 두었다.
         `f.t` 는 출발 지연(음수 초) · `f.dur` 는 주행 시간(초)이므로 (dur − t) 가 도착 시각이다. */
      const mineFlies = () => fxFlies.filter((f) => f.n === cN || f.n === uN);
      const promiseMs = Math.max(0, ...mineFlies().map((f) => (f.dur - f.t) * 1000));
      const capMs = Math.max(3000, promiseMs * 8);   /* 무효(못 쟀다) 판정에만 쓰는 한도 */

      /* 옛 축 계기판 — 창이 실제로 언제 닫혔는지도 같이 적는다(부하에서 밀린다) */
      let at700 = null, at700T = null;
      setTimeout(() => {
        at700 = { l: L.querySelectorAll('.fx-plus').length, lc: LC.querySelectorAll('.fx-plus').length };
        at700T = Math.round(performance.now() - t0);
      }, oldWin);

      /* 새 축 — 시각이 아니라 «생성» 을 기다린다.
         멈추는 조건 셋: ⓐ 내 두 묶음의 +n 이 다 붙었다 ⓑ 내 비행이 전부 착지했는데도 안 붙었다
         (= 제품 결손이지 측정 실패가 아니다) ⓒ 한도 초과(= 무효). */
      const has = (txt) => log.some((e) => e.txt === txt);
      let landedAt = null, capped = false;
      for (;;) {
        const el = performance.now() - t0;
        if (has(cTxt) && has(uTxt)) break;
        if (!mineFlies().length) {
          if (landedAt == null) landedAt = el;
          if (el - landedAt > 200) break;            /* 착지 뒤 한 숨 — +n 은 착지 프레임에 뜬다 */
        } else landedAt = null;
        if (el > capMs) { capped = true; break; }
        await new Promise((res) => setTimeout(res, 16));
      }
      const doneT = Math.round(performance.now() - t0);
      /* 옛 축 창이 아직 안 닫혔으면 닫힐 때까지만 더 기다린다(계기판을 비우지 않기 위해) */
      while (at700 == null && performance.now() - t0 < oldWin * 6)
        await new Promise((res) => setTimeout(res, 16));

      oL.disconnect(); oLC.disconnect();
      return { log, base, at700, at700T, flyC, flyU, cTxt, uTxt,
        promiseMs: Math.round(promiseMs), capMs: Math.round(capMs), capped, doneT,
        left: mineFlies().length };
    } finally { killEnemy = realKill; fxPlus = realPlus; }
  }, [isolate, dead, OLD_WIN]);
}

/* 한 표본을 셋 중 하나로 가른다 — 통과 / 실패(제품) / 무효(자가 못 쟀다) */
function judge(r){
  const mine = r.log.filter((e) => e.txt === r.cTxt);
  const ui   = r.log.filter((e) => e.txt === r.uTxt);
  const lays = mine.map((e) => e.lay);
  const mineLC = (mine.find((e) => e.lay === 'fxlc') || {}).t;
  const leak = lays.includes('fxl');
  const othersLC = r.log.filter((e) => e.lay === 'fxlc' && e.txt !== r.cTxt && e.t <= OLD_WIN).length;
  const deltaC = (r.at700 ? r.at700.lc : r.base.lc) - r.base.lc;   /* 옛 축(계기판) */

  let kind, why;
  if (!mine.length && !ui.length && r.capped)
    { kind = '무효'; why = `한도 ${r.capMs}ms 안에 도착 자체가 없다(비행 ${r.left}개 남음 · 약속 ${r.promiseMs}ms)`; }
  else if (!mine.length && !r.capped)
    { kind = '실패'; why = '내 비행이 전부 착지했는데 combat +n 이 한 층에도 없다'; }
  else if (!mine.length)
    { kind = '무효'; why = `combat +n 미도착 · 한도 ${r.capMs}ms 초과(비행 ${r.left}개 남음)`; }
  else if (leak && lays.includes('fxlc'))
    { kind = '실패'; why = 'combat +n 이 #fxlc 와 #fxl 양쪽에 붙었다'; }
  else if (leak)
    { kind = '실패'; why = 'ⓑ combat +n 이 #fxl(팝업 위)로 샜다'; }
  else if (!lays.includes('fxlc'))
    { kind = '실패'; why = 'combat +n 이 #fxlc 가 아닌 층에 붙었다'; }
  else kind = '통과';

  return { kind, why, mineLC, leak, othersLC, deltaC, lays,
    oldRed: deltaC <= 0, oldBlind: r.at700 == null };
}

function summarize(rows, label){
  const c = (k) => rows.filter((r) => r.j.kind === k);
  const pass = c('통과'), bad = c('실패'), voidR = c('무효');
  const oldRed = rows.filter((r) => r.j.oldRed);
  const oldBlind = rows.filter((r) => r.j.oldBlind);
  console.log(`\n── ${label} ──`);
  console.log(`  표본 ${rows.length}회 — **통과 ${pass.length} · 실패 ${bad.length} · 무효 ${voidR.length}**`);
  if (bad.length) for (const r of bad) console.log(`    ✗ #${r.k} ${r.j.why}`);
  if (voidR.length) for (const r of voidR) console.log(`    · #${r.k} 무효 — ${r.j.why}`);
  console.log(`  내 combat «+n» 이 #fxl 로 샌 회차(갈래 ⓑ): ${rows.filter((r) => r.j.leak).length}회`);
  const ts = rows.map((r) => r.j.mineLC).filter((t) => t != null).sort((a, b) => a - b);
  if (ts.length) console.log(`  붙은 시각: 중앙 ${ts[ts.length >> 1]}ms · 범위 ${ts[0]}~${ts[ts.length - 1]}ms`
    + `  (약속 ${rows[0].r.promiseMs}ms · 한도 ${rows[0].r.capMs}ms)`);
  /* 계기판 — 옛 축을 옛 축으로 센다(946 3회차 ⓓ′: 새 축의 값을 갖다 쓰면 거짓 위안이 된다) */
  const oldRedButPass = oldRed.filter((r) => r.j.kind === '통과');
  console.log(`  [계기판] 옛 축(${OLD_WIN}ms 잔존 델타)으로 세면 미달 ${oldRed.length}/${rows.length}회`
    + ` — 그중 ${oldRedButPass.length}회는 새 축에서 **통과**(자의 몫)`);
  if (oldBlind.length) console.log(`  [계기판] 옛 축 창이 한 번도 안 닫힌 표본 ${oldBlind.length}건(부하로 타이머가 밀렸다)`);
  const others = rows.map((r) => r.j.othersLC).reduce((a, b) => a + b, 0);
  console.log(`  같은 창에 섞여 든 «남의» #fxlc +n: 합 ${others}건 · 호출 직전 재고 중앙 `
    + `${rows.map((r) => r.r.base.lc).sort((a, b) => a - b)[rows.length >> 1]}건`);
  return { pass, bad, void: voidR, oldRed };
}

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  if (DEAD) console.log('※ --dead — `fxPlus` 가 combat 을 잃은 사본에서 돈다(전부 빨간 것이 통과)');

  const modes = [{ iso: false, label: '① 자와 같은 조건 — 배경 자동 전투가 도는 채로' },
                 { iso: true,  label: '② 씬 격리 — killEnemy 무력화([E] 선례)' }];
  const res = {};
  for (const m of modes) {
    console.log('\n' + m.label);
    const rows = [];
    for (let k = 0; k < N; k++) {
      const r = await round(page, m.iso, DEAD);
      const j = judge(r);
      rows.push({ k: k + 1, r, j });
      console.log(
        `  #${String(k + 1).padStart(2)} fly(c/u)=${r.flyC}/${r.flyU}` +
        ` | 내 «${r.cTxt}» → ${j.mineLC != null ? '#fxlc @' + j.mineLC + 'ms' : (j.lays[0] ? '#' + j.lays[0] : '없음')}` +
        `${j.leak ? ' ⚠#fxl 로도' : ''} | 판정 **${j.kind}**${j.why ? ' — ' + j.why : ''}` +
        ` | [계기판] 옛 축 델타 ${r.at700 ? j.deltaC : '못 쟀다'}${j.oldRed ? ' ✗' : ''}`
      );
      if (DUMP) console.log('     log=' + JSON.stringify(r.log));
      await page.waitForTimeout(400);
    }
    res[m.iso ? 'iso' : 'raw'] = summarize(rows, m.label);
  }
  await browser.close();

  const judged = res.raw.pass.length + res.raw.bad.length + res.iso.pass.length + res.iso.bad.length;
  const bad = res.raw.bad.length + res.iso.bad.length;
  const leak = res.raw.pass.concat(res.raw.bad, res.iso.pass, res.iso.bad).filter((r) => r.j.leak).length;

  console.log('\n──── 판정 ────');
  if (DEAD) {
    /* 되돌림 시험 — 부호를 뒤집어 낸다(전부 빨간 것이 통과) */
    if (!judged) { console.log('되돌림 시험이 판정 표본을 하나도 못 얻었다 — 부하를 낮춰 다시 돌려라.'); process.exit(3); }
    if (bad === judged) { console.log(`PROBE552(--dead) 되돌림 시험 PASS — 판정 표본 ${judged} 건 전부 빨갛다(축이 층을 실제로 본다)`); process.exit(0); }
    console.log(`PROBE552(--dead) 되돌림 시험 FAIL — 판정 표본 ${judged} 건 중 ${judged - bad} 건이 초록이다(자가 헛돈다)`);
    process.exit(1);
  }
  if (!judged) {
    console.log('판정 표본 0 — 도착이 한 번도 안 왔다(부하 또는 실행 환경). **못 쟀다**이지 «초록» 이 아니다.');
    console.log('\nPROBE552 못 쟀다(코드 3)');
    process.exit(3);
  }
  if (leak) {
    console.log('ⓑ — combat 묶음의 +n 이 #fxl 로 샌다(제품 결손).');
    fail('제품 결손 — combat +n 이 #fxl 로 샌다');
  } else if (bad) {
    console.log('제품 결손 — 위 «실패» 줄의 사유를 보라(층이 안 따라간다).');
    fail(`제품 결손 ${bad}건`);
  } else {
    console.log('ⓐ — 제품은 옳다. combat +n 은 판정 표본 ' + judged + '건 전부 #fxlc 에 붙었고 #fxl 로 안 샜다.');
    console.log('     옛 축(«층별 개수 델타» · 고정 창)이 빨개지는 것은 배경 전투의 +n(수명 840ms) 오염과');
    console.log('     **부하로 밀린 도착**(위 계기판 줄) 몫이다 — 처방 = 씬 격리 + 금액으로 묶음 고르기 + 도착을 기다리기.');
    ok('제품 0줄 — 자(尺)의 결함으로 확정');
  }

  if (fails.length) { console.log(`\nPROBE552 FAIL (${fails.length})`); process.exit(1); }
  console.log(`\nPROBE552 PASS (판정 ${judged}건 · 무효 ${res.raw.void.length + res.iso.void.length}건)`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
