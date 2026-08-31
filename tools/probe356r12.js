#!/usr/bin/env node
/* 356 12·13회차 재현기 — 스코프 구멍을 **두 축**으로 판다
 *
 * ⚠ 12회차는 **두 세션이 동시에 돌았다**(review §20 머리말). 이 파일은 그중 `sess-0958-10124` 판이고,
 *   [A] 화면 축이 찾은 넷(269·429·478×2)은 다른 판이 `scan356` SCREENS 에 **이미 등재했다**
 *   (48 → 56화면). 그래서 [A] 는 이제 «닫힌 축의 회귀» 이고, **살아 있는 물음은 [B] 프레임 축**이다.
 *
 *   node tools/probe356r12.js            # [A] 화면 축 + [B] 프레임 축을 둘 다
 *   node tools/probe356r12.js --only A   # 화면 축만 (smoke 오프너 차집합 3화면)
 *   node tools/probe356r12.js --only B   # 프레임 축만 (스캐너 전 화면 × 1080×1600)
 *   node tools/probe356r12.js --json
 *
 * [B] 프레임 축이 왜 필요한가:
 *   `scan356.js` 는 **1080×2280 한 프레임**에서만 돈다(253행). 그런데 주인이 명시적으로 요구한
 *   기기는 하나가 더 있다 — **9:13.3(1080×1600)** 이고, 351·403·404 가 그 프레임 전용으로 등재된
 *   작업이다. 세로가 680px 짧아지면 `flex` 아이가 **교차축으로 눌린다**(shrink) — 그것이 바로
 *   이 작업이 잡는 «찌그러짐» 이고, 2280 에서는 한 픽셀도 안 보인다.
 *   ⇒ 스캐너의 `SCREENS` 를 **그대로** 1600 에서 한 번 더 돌려 «프레임에 따라 달라지는 자리» 를 찾는다.
 *
 * 왜 또 스코프인가(338 규칙 — 처방 전에 재현):
 *   11회차가 스코프를 42 → 48화면으로 넓힌 근거는 **351 오프너 목록**(`tools/cap351.js`)이었다.
 *   그 차집합은 이제 비었다. 그런데 이 저장소에는 **세 번째 목록**이 있고 그게 제일 넓다 —
 *   `tools/smoke.js` 의 «팝업 전부 열기» 오프너다. 이유가 있다: ROUTINE [6] 이
 *   «새 팝업·탭·오버레이를 만들면 smoke.js 의 오프너 목록에 추가하는 것까지가 그 작업의 범위» 라고
 *   못박아 두어서, 팝업을 만든 워커가 **반드시 등재하는 목록**이 그것 하나다.
 *   실제로 smoke 오프너에는 있는데 351 에도 356 에도 없는 자리가 셋 있다 —
 *   269(코스튬 [?]) · 429(89 유물 [?]) · 478(상점 청약철회 [더보기]). 셋 다 A5 `popup()` 창이고
 *   **1~11회차 내내 아이콘 자가 한 번도 밟은 적이 없다.**
 *
 * 판정은 `scan356.js` 의 수집기(COLLECT)를 **그대로** 부른다 — 자를 두 벌로 적으면 한쪽만 늙는다
 * ([S3] 주석 · 385 «자매 자 드리프트» · 11회차와 같은 규율).
 *
 * ⚠ LESSONS 356-⑬ — «눌렀다» 가 아니라 «그 화면의 고유 노드가 보인다» 를 확인한다.
 *   조용히 실패한 클릭은 **직전 화면을 두 번 세고 초록을 준다.**
 *   A5 세 창은 껍데기(`#mbox`)가 **같으므로** 상자 서명으로는 못 가른다 → 제목(`#mtitle`)을
 *   내용 서명으로 같이 잡는다(11회차가 05 세 슬롯에서 쓴 그 처방).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚠ `STEP` 도 **반드시 스캐너에서 받아 쓴다.** 12회차가 단계 종류 `js:<식>` 을 새로 만들었는데
   이 자가 «셀렉터를 누른다» 한 줄을 자기 손으로 다시 적고 있어서, 새 종류를 만나자
   `querySelector('js:openDunDetail(…)')` 로 **던지고 04 던전 세부를 통째로 놓쳤다**
   (직전 화면 «03 던전» 을 두 번 세고 초록을 줬다 — 385 «자매 자 드리프트» 가 두 시간 만에 재발).
   ⇒ 수집기(COLLECT)뿐 아니라 **구동기(STEP)도 한 벌**이어야 한다. */
const { COLLECT, URL, TOL, SCREENS, STEP } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const RUN_A = !ONLY || ONLY === 'A';
const RUN_B = !ONLY || ONLY === 'B';

/* [B] 프레임 축 — 주인이 명시적으로 요구한 짧은 기기(351 «9:13.3»). 1080×2280 은 스캐너가 이미 본다. */
const FRAME_B = { width: 1080, height: 1600 };

/* 후보 = smoke.js 오프너에는 있는데 356(48화면)·351(55화면) 둘 다에 없는 자리.
   sig = «그 화면에 갔다» 를 말하는 고유 노드(없으면 진입 실패로 본다). */
const CAND = [
  ['269 코스튬 도움말', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]', '#bCos [data-coshelp]'], '#modal.on #mbox'],
  ['429 89 유물 도움말', ['.tab[data-t="box"]', '#relw [data-rlhelp]'], '#modal.on #mbox'],
  ['478 청약철회 고지', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="coin"]', '#lgMore'], '#modal.on #mbox'],
];

/* 진입 확인용 — 화면 서명(같은 서명이 둘이면 하나는 안 열린 것이다 · cap351 SIG 와 같은 뜻) */
const SIG = function () {
  const box = [];
  document.querySelectorAll('#app [id]').forEach((el) => {
    if (/^fx/.test(el.id)) return;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
    if (r.width * r.height < 120000) return;
    box.push(el.id + ':' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + ',' + Math.round(r.height));
  });
  return box.sort().join('|');
};

(async () => {
  const browser = await launch(chromium);
  const out = [];
  const errs = [];
  const sigs = new Map();

  for (const [label, steps, sig] of (RUN_A ? CAND : [])) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        const found = await STEP(page, s);
        if (!found) errs.push(`${label}: 무음 실패 — 단계 '${s}' 가 안 먹었다`);
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(300);
      const seen = await page.evaluate((q) => {
        const el = document.querySelector(q);
        if (!el) return null;
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0)
          ? [+r.width.toFixed(1), +r.height.toFixed(1)] : null;
      }, sig);
      if (!seen) errs.push(`${label}: 진입 실패 — 고유 노드 '${sig}' 가 안 보인다 (직전 화면을 쟀을 수 있다)`);
      /* ⚠ 셋 다 `#mbox` 한 껍데기라 상자 서명이 바이트로 같다 — 제목을 내용 서명으로 붙인다. */
      const s = await page.evaluate(SIG) + '‖' + await page.evaluate(() => (document.querySelector('#mtitle')?.textContent || '').trim());
      if (sigs.has(s)) errs.push(`${label}: 서명이 '${sigs.get(s)}' 과 같다 — 둘 중 하나는 안 열렸다`);
      else sigs.set(s, label);

      const got = await page.evaluate(COLLECT, { all: false });
      const bad = got.filter((g) => Math.abs(g.ratio - 1) > TOL);
      out.push({ label, sig: seen, nodes: got.length, bad });
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
      out.push({ label, sig: null, nodes: 0, bad: [] });
    }
    await ctx.close();
  }
  /* ── [B] 프레임 축 — 스캐너의 `SCREENS` 를 그대로, 1080×1600 에서 한 번 더 ── */
  const rowsB = [];
  const errsB = [];
  if (RUN_B) {
    for (const [label, steps] of SCREENS) {
      const ctx = await browser.newContext({ viewport: FRAME_B, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        for (const s of steps) {
          const found = await STEP(page, s);
          if (!found) errsB.push(`${label}: 무음 실패 — 단계 '${s}' 가 안 먹었다`);
          await page.waitForTimeout(420);
        }
        await page.waitForTimeout(250);
        const got = await page.evaluate(COLLECT, { all: false });
        for (const g of got) rowsB.push(Object.assign({ screen: label }, g));
      } catch (e) {
        errsB.push(label + ': ' + String(e.message || e).split('\n')[0]);
      }
      await ctx.close();
    }
  }
  await browser.close();

  /* scan356 과 같은 접기 — «선택자 + 비율» 로 자리를 센다 */
  const badB = rowsB.filter((r) => Math.abs(r.ratio - 1) > TOL);
  const byKey = new Map();
  for (const r of badB) {
    const k = r.sel + '|' + r.ratio;
    if (!byKey.has(k)) byKey.set(k, Object.assign({}, r, { screens: new Set() }));
    byKey.get(k).screens.add(r.screen);
  }
  const listB = [...byKey.values()].map((r) => { r.screens = [...r.screens]; return r; })
    .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));

  if (JSON_OUT) {
    console.log(JSON.stringify({
      tol: TOL, scanned356: SCREENS.length,
      A: { out, errs },
      B: { frame: FRAME_B, scanned: rowsB.length, bad: badB.length, groups: listB, errs: errsB },
    }, null, 1));
    process.exit(0);
  }

  if (RUN_A) {
    console.log(`[probe356r12 · A 화면 축] 스캐너 스코프 ${SCREENS.length}화면 · 후보 ${CAND.length}화면 (smoke 오프너에는 있는데 356·351 둘 다에 없는 자리)`);
    let total = 0;
    for (const r of out) {
      console.log(`\n── ${r.label} — 아이콘 노드 ${r.nodes}개 · 비균등 ${r.bad.length}개` + (r.sig ? ` (고유 노드 ${r.sig[0]}×${r.sig[1]})` : ' (진입 실패)'));
      for (const b of r.bad) {
        total++;
        const pct = ((b.ratio - 1) * 100).toFixed(1);
        console.log(`   ${b.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${b.kind}] ${b.sel}  «${b.txt}»  ${b.w}×${b.h}`);
        for (const c of b.chain) console.log(`      ← ${c}`);
        if (b.own) console.log(`      own: ${b.own}`);
      }
    }
    console.log(`\n[A] 합계 비균등 노드 ${total}개`);
    if (errs.length) { console.log('[!] 진입/무음 실패'); errs.forEach((e) => console.log('  ' + e)); }
  }

  if (RUN_B) {
    console.log(`\n[probe356r12 · B 프레임 축] ${FRAME_B.width}×${FRAME_B.height} (9:13.3) · ${SCREENS.length}화면 · 아이콘 노드 ${rowsB.length}개 · 비균등 ${badB.length}개 → ${listB.length}자리`);
    for (const r of listB) {
      const pct = ((r.ratio - 1) * 100).toFixed(1);
      console.log(`  ${r.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${r.kind}] ${r.sel}  «${r.txt}»  ${r.w}×${r.h}`);
      console.log(`      화면: ${r.screens.join(', ')}`);
      for (const c of r.chain) console.log(`      ← ${c}`);
      if (r.own) console.log(`      own: ${r.own}`);
    }
    if (errsB.length) { console.log('[!] 화면 진입 실패'); errsB.forEach((e) => console.log('  ' + e)); }
  }
  process.exit(0);
})();
