#!/usr/bin/env node
/* 356 15회차 재현기 — **«사건이 있어야 뜨는 화면»** 이 열두 회차 동안 스캔 밖이었다
 *
 *   node tools/probe356r15.js          # 두 프레임(2280·1600)에서 후보 6화면
 *   node tools/probe356r15.js --json
 *
 * 왜 이 표본인가(338 규칙 — 처방 전에 재현):
 *   12회차가 다음 세션에 넘긴 문장이 이것이다 — «남은 프런티어는 «오프너로 못 여는 화면» 이다:
 *   12 소환 결과 · 09 일괄 강화 결과 · 31 클리어 · 17 레벨업 · 01 오프라인 보상처럼
 *   **사건이 있어야 뜨는** 자리들. 이제 `js:` 단계가 있으므로 적을 수는 있다».
 *   여기에 **18 패배**(`openDefeat()`)를 더한다 — 09·17 과 같은 «딤 위 연출» 한 세트인데
 *   세 목록(356 SCREENS · 351 오프너 · smoke 오프너) 어디에도 없다.
 *
 *   ⇒ 이 여섯은 «누를 문» 이 없어서 빠진 것이지 «아이콘이 없어서» 빠진 것이 아니다.
 *      01 은 코인·젬, 09 는 강화 카드(이모지 + **펫 스프라이트 캔버스**), 12 는 소환 결과 그리드
 *      최대 30칸, 17 은 ⚔️ 한 장, 31 은 대표 재화 아이콘 + 입장권, 18 은 엠블럼 SVG 다.
 *      **아이콘 밀도가 가장 높은 축이 통째로 스캔 밖이었다.**
 *
 * 단계는 전부 제품의 **진입점**이다(12회차 `js:` 규율 — 자가 화면을 «그리지» 않는다):
 *   01 `offlineReward(lastTime)` · 09 `openUpAll(ups)` · 12 `doSummonFree(b,times,viaReward)` ·
 *   17 `openStatUp({ic,desc})`(27245 의 제품 호출과 같은 인자) · 18 `openDefeat()` ·
 *   31 `openDunClear(d,f,sweep,auto)`.
 *
 * 판정은 `scan356.js` 의 수집기(COLLECT)·구동기(STEP)를 **그대로** 받아 쓴다 —
 * 자를 두 벌로 적으면 한쪽만 늙는다([S3] 주석 · 13회차 [R12] 가 게이트로 만든 규율).
 *
 * ⚠ LESSONS 356-⑬ — «불렀다» 가 아니라 «그 화면의 고유 노드가 보인다» 를 확인한다.
 *   `js:` 단계는 던지면 false 를 돌리지만, **조건 때문에 조용히 안 열리는 것**(예: `openUpAll`
 *   이 빈 배열에 false 를 돌리는 자리 · `openDefeat` 의 `if(arena) return`)은 예외가 아니다.
 *   그래서 화면마다 «그 화면에만 있는 노드» 를 서명으로 같이 잡는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COLLECT, URL, TOL, STEP } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');

/* 두 프레임 — 2280 은 기준 해상도(ROUTINE [2]), 1600 은 주인이 명시적으로 요구한 9:13.3.
   14회차가 [F] 로 상시 항을 만든 축이라 신규 화면도 처음부터 둘 다 잰다. */
const FRAMES = [
  { name: '9:19  1080×2280', width: 1080, height: 2280 },
  { name: '9:13.3 1080×1600', width: 1080, height: 1600 },
];

/* label · steps · sig(그 화면에만 있는 노드) */
const CAND = [
  ['01 오프라인 보상', ['js:offlineReward(Date.now() - 3600e3)'], '#offw.on .ofr-pill'],
  ['09 일괄 강화 결과', ['js:openUpAll([].concat(SKILLS.slice(0,3), PETS.slice(0,3)).map(function(it){return {it:it, from:1, to:2};}))'], '#upw.on #upCards .upr-card'],
  ['12 소환 결과', ['js:doSummonFree("skill", 10, true)'], '#sumw.on .sm-panel'],
  ['17 스탯업 보너스', ['js:openStatUp({ ic:"⚔️", desc:"훈련 2 단계 달성! 모든 능력치 10% 증가" })'], '#statw.on .st-icon'],
  ['18 패배', ['js:openDefeat()'], '#defw.on .df-emb'],
  /* ⚠ `.dcl-grp` 는 **높이 0 인 앵커**다(426 — 자식이 전부 absolute). 서명으로 쓰면 열려 있는데도
     «진입 실패» 가 뜬다(1회차에 실제로 그랬다) — 크기를 가진 노드로 잡는다. */
  ['31 던전 클리어', ['js:openDunClear(DUNGEONS[0], 1, false, false)'], '#dclw.on .dcl-tile'],
];

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  const errs = [];

  for (const F of FRAMES) {
    for (const [label, steps, sig] of CAND) {
      const ctx = await browser.newContext({ viewport: { width: F.width, height: F.height }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        for (const s of steps) {
          const ok = await STEP(page, s);
          if (!ok) errs.push(`${F.name} · ${label}: 무음 실패 — 단계 '${s}' 가 던졌다`);
          await page.waitForTimeout(600);
        }
        /* 12 소환은 등장 연출(58/252 스태거 · 칸당 0.055s)이 끝나야 최종 상태다 */
        await page.waitForTimeout(900);
        const seen = await page.evaluate((q) => {
          const el = document.querySelector(q);
          if (!el) return null;
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0)
            ? [+r.width.toFixed(1), +r.height.toFixed(1)] : null;
        }, sig);
        if (!seen) errs.push(`${F.name} · ${label}: 진입 실패 — 고유 노드 '${sig}' 가 안 보인다`);
        const got = await page.evaluate(COLLECT, { all: false });
        const bad = got.filter((g) => Math.abs(g.ratio - 1) > TOL);
        rows.push({ frame: F.name, label, sig: seen, nodes: got.length, bad });
      } catch (e) {
        errs.push(`${F.name} · ${label}: ` + String(e.message || e).split('\n')[0]);
        rows.push({ frame: F.name, label, sig: null, nodes: 0, bad: [] });
      }
      await ctx.close();
    }
  }
  await browser.close();

  if (JSON_OUT) {
    console.log(JSON.stringify({ tol: TOL, rows, errs }, null, 1));
    process.exit(0);
  }

  console.log(`[probe356r15] «사건이 있어야 뜨는 화면» ${CAND.length}곳 × 프레임 ${FRAMES.length}벌 · TOL ${TOL}`);
  let total = 0;
  for (const r of rows) {
    console.log(`\n── ${r.frame} · ${r.label} — 아이콘 노드 ${r.nodes}개 · 비균등 ${r.bad.length}개`
      + (r.sig ? ` (고유 노드 ${r.sig[0]}×${r.sig[1]})` : ' ⚠ 진입 실패'));
    for (const b of r.bad) {
      total++;
      const pct = ((b.ratio - 1) * 100).toFixed(1);
      console.log(`   ${b.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${b.kind}] ${b.sel}  «${b.txt}»  ${b.w}×${b.h}`);
      for (const c of b.chain) console.log(`      ← ${c}`);
      if (b.own) console.log(`      own: ${b.own}`);
    }
  }
  console.log(`\n합계 비균등 노드 ${total}개`);
  if (errs.length) { console.log('[!] 진입/무음 실패'); errs.forEach((e) => console.log('  ' + e)); }
  process.exit(0);
})();
