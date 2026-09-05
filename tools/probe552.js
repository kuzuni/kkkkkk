#!/usr/bin/env node
/* 552 재현기 — `verify77` [B] 「combat 묶음의 +n 이 #fxlc 에 없다」 가 왜 뜨고 지는가
 *
 *   node tools/probe552.js [반복수]
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
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const N = Math.max(1, parseInt(process.argv[2] || '10', 10));
const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);


/* 페이지 안에서 도는 한 회차 — isolate 면 배경 전투 획득을 막는다 */
async function round(page, isolate){
  return page.evaluate(async (iso) => {
    const L = document.getElementById('fxl'), LC = document.getElementById('fxlc');
    const realKill = killEnemy;
    if (iso) killEnemy = () => {};
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
      const base = { l: L.querySelectorAll('.fx-plus').length, lc: LC.querySelectorAll('.fx-plus').length };
      fxFly({ x: 540, y: 1200, combat: true }, 'gold', 1010);
      const flyC = LC.querySelectorAll('.fx-fly').length;
      fxFly({ x: 540, y: 1200 }, 'gold', 2020);
      const flyU = L.querySelectorAll('.fx-fly').length;
      await new Promise((res) => setTimeout(res, 700));
      const at700 = { l: L.querySelectorAll('.fx-plus').length, lc: LC.querySelectorAll('.fx-plus').length };
      await new Promise((res) => setTimeout(res, 800));
      oL.disconnect(); oLC.disconnect();
      return { log, base, at700, flyC, flyU,
        cTxt: (typeof fmtCur === 'function') ? '+' + fmtCur('gold', 1010) : null,
        uTxt: (typeof fmtCur === 'function') ? '+' + fmtCur('gold', 2020) : null };
    } finally { killEnemy = realKill; }
  }, isolate);
}

function summarize(rows, label){
  const bad = rows.filter((r) => r.deltaC <= 0);
  const leak = rows.filter((r) => r.leak);
  const missing = rows.filter((r) => r.mineLC == null);
  console.log(`\n── ${label} ──`);
  console.log(`  표본 ${rows.length}회`);
  console.log(`  [B] 델타 판정이 빨간 회차(combatPlusΔ ≤ 0): ${bad.length}회  ${bad.map((r) => '#' + r.k).join(' ')}`);
  console.log(`  내 combat «+n» 이 #fxlc 에 실제로 붙은 회차: ${rows.length - missing.length}/${rows.length}`);
  console.log(`  내 combat «+n» 이 #fxl 로 샌 회차(갈래 ⓑ): ${leak.length}회  ${leak.map((r) => '#' + r.k).join(' ')}`);
  const ts = rows.filter((r) => r.mineLC != null).map((r) => r.mineLC).sort((a, b) => a - b);
  if (ts.length) console.log(`  붙은 시각: 중앙 ${ts[ts.length >> 1]}ms · 범위 ${ts[0]}~${ts[ts.length - 1]}ms (자의 창 700ms)`);
  const others = rows.map((r) => r.othersLC).reduce((a, b) => a + b, 0);
  console.log(`  같은 창에 섞여 든 «남의» #fxlc +n: 합 ${others}건 · 호출 직전 재고 중앙 ${rows.map((r) => r.baseLC).sort((a, b) => a - b)[rows.length >> 1]}건`);
  return { bad, leak, missing };
}

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const modes = [{ iso: false, label: '① 자와 같은 조건 — 배경 자동 전투가 도는 채로' },
                 { iso: true,  label: '② 씬 격리 — killEnemy 무력화([E] 선례)' }];
  const res = {};
  for (const m of modes) {
    console.log('\n' + m.label);
    const rows = [];
    for (let k = 0; k < N; k++) {
      const r = await round(page, m.iso);
      const cTxt = r.cTxt, uTxt = r.uTxt;
      const mine = r.log.filter((e) => e.txt === cTxt);
      const mineLC = (mine.find((e) => e.lay === 'fxlc') || {}).t;
      const leak = mine.some((e) => e.lay === 'fxl');
      const othersLC = r.log.filter((e) => e.lay === 'fxlc' && e.txt !== cTxt && e.t <= 700).length;
      const deltaC = r.at700.lc - r.base.lc, deltaU = r.at700.l - r.base.l;
      rows.push({ k: k + 1, deltaC, deltaU, mineLC, leak, othersLC, baseLC: r.base.lc });
      console.log(
        `  #${String(k + 1).padStart(2)} fly(c/u)=${r.flyC}/${r.flyU}` +
        ` | base(lc)=${r.base.lc} → @700=${r.at700.lc}  ⇒ [B]델타 ${deltaC}${deltaC <= 0 ? ' ✗' : ''}` +
        ` | 내 «${cTxt}» → ${mineLC != null ? '#fxlc @' + mineLC + 'ms' : '없음'}${leak ? ' ⚠#fxl 로도' : ''}` +
        ` | 남의 +n ${othersLC}건`
      );
      await page.waitForTimeout(400);
    }
    res[m.iso ? 'iso' : 'raw'] = summarize(rows, m.label);
  }

  console.log('\n──── 판정 ────');
  if (res.raw.leak.length || res.iso.leak.length) {
    console.log('ⓑ — combat 묶음의 +n 이 #fxl 로 샌다(제품 결손).');
    fail('제품 결손 — combat +n 이 #fxl 로 샌다');
  } else if (res.iso.missing.length) {
    console.log('ⓐ-1 — 격리해도 combat 묶음이 +n 을 못 만든다(도착 실패 또는 room 고갈).');
    fail('격리 상태에서도 combat +n 이 안 난다');
  } else if (res.raw.bad.length && !res.iso.bad.length) {
    console.log('ⓐ-2 — 제품은 옳다. [B] 의 «층별 개수 델타» 가 배경 전투의 +n(수명 840ms)에 오염돼');
    console.log('       내 +n 이 제 층에 들어와도 델타가 0 이 될 수 있다. 처방 = 씬 격리 + 금액으로 묶음 고르기.');
    ok('제품 0줄 — 자(尺)의 결함으로 확정');
  } else if (!res.raw.bad.length && !res.iso.bad.length) {
    console.log('이 실행에서는 [B] 델타가 한 번도 안 빨갰다(오염이 확률적이라 표본을 늘려라).');
  } else {
    console.log('격리해도 델타가 빨갛다 — 오염 말고 다른 축이 있다. trace 를 다시 보라.');
    fail('격리 후에도 델타가 빨갛다');
  }
  await browser.close();
  if (fails.length) { console.log(`\nPROBE552 FAIL (${fails.length})`); process.exit(1); }
  console.log('\nPROBE552 PASS');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
