#!/usr/bin/env node
/* 356 19회차 재현기 — 18회차가 «대표 표본» 이라고 스스로 적어 둔 **상태 축 셋**을 넓힌다
 *
 *   node tools/probe356r19.js          # 두 프레임(2280·1600)에서 후보 5화면
 *   node tools/probe356r19.js --json
 *
 * 왜 이 표본인가(338 규칙 — 처방 전에 재현):
 *   18회차가 «스코프 구멍 프런티어 세 갈래가 전부 소진됐다» 고 닫으면서, 바로 다음 줄에
 *   **아직 안 닫힌 것**을 이름으로 남겼다 —
 *     «상태 조합은 아직 «대표 표본» 이다 — 배너 3종 중 무기만, 유물 8/전종,
 *      우편 4재화/아이콘 우편(`m.ic`) 제외. 새 결함 계열이 나오면 그 축부터 넓혀라.»
 *   이 회차가 그 세 축이다(새 화면이 아니라 **같은 화면의 안 밟은 상태**):
 *     ⓐ 12 소환 결과 — 18회차는 `weapon`(장비 3배너의 대표)·`pet` 둘뿐이었다.
 *        `shield`·`amulet` 은 **다른 아이콘 표**(EQUIPS.slot 별)를 그리고,
 *        `skill` 은 15회차가 «이모지만» 밟은 배너라 결과 그리드 자체는 미관측이다.
 *     ⓑ 89 유물 — 18회차는 `summonRelic` 8회 = «여러 칸 보유» 까지였다. RELICS 는 **10종**이라
 *        난수로 8번 뽑으면 평균 5~6종만 켜진다(쿠폰 수집가). 여기서는 **전 10종이 켜질 때까지**
 *        돌려 보유 칸 아트를 **전부** 판정에 넣는다.
 *     ⓒ 53 우편 — 18회차는 `MAIL_RW` 네 재화(g·c·r·m)뿐이었다. 우편 썸네일에는 **두 번째 종류**가
 *        있다: `m.ic`(이용권·패스가 제 아이콘을 들고 오는 통 — 28322 주석, 실제 생산자는 34206
 *        «프리미엄 패스»). 그 자리는 `curIc()` img 가 아니라 **이모지 글리프**라 자가 다르다.
 *
 * 상태는 전부 **합법 세이브 + 제품 진입점**으로 만든다(336 처방 · 18회차와 같은 규율) —
 * 자가 화면을 그리지 않고, 실제 세이브가 가질 수 있는 값만 만든다.
 *
 * 판정은 `scan356.js` 의 수집기(COLLECT)·구동기(STEP)를 **그대로** 받아 쓴다 —
 * 자를 두 벌로 적으면 한쪽만 늙는다([S3] 주석 · 13회차 [R12] 규율).
 *
 * ⚠ LESSONS 356-⑬ — «불렀다» 가 아니라 «그 화면의 고유 노드가 보인다» 를 서명으로 확인한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COLLECT, URL, TOL, STEP } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');

const FRAMES = [
  { name: '9:19  1080×2280', width: 1080, height: 2280 },
  { name: '9:13.3 1080×1600', width: 1080, height: 1600 },
];

/* ⓑ 유물 «전 10종» — 값을 상수로 박지 않고 제품에게 묻는다(`relicCost()`),
   조각은 «모자라면 한 판 벌어 온다» 로 채운다(던전 1회 수급 150~400 범위 안의 반복). */
const OWN_ALL_RELICS =
  'js:for(var i=0;i<400 && !RELICS.every(function(r){return has(r.id);});i++){'
  + 'if(S.relic < relicCost()) S.relic += relicCost();'
  + 'summonRelic(true); }';

/* ⓒ 아이콘 우편 — 34206(프리미엄 패스)이 실제로 보내는 꼴 그대로.
   네 재화 통(18회차)과 **같은 화면에** 섞어 둔다: 행 마크업이 갈리는 자리라 나란히 놓고 본다. */
const SEND_IC_MAILS =
  'js:sendMail({t:"🎫 프리미엄 패스 — 스테이지", ic:"🎫", iq:"프리미엄", ig:4});'
  + 'sendMail({t:"🎫 프리미엄 패스 — 출석", ic:"🎟️", iq:"프리미엄", ig:3});'
  + 'sendMail({t:"📦 골드", g:12345});sendMail({t:"📦 다이아", c:678});';

/* label · steps · sig(상태가 만든 그 화면 고유 노드) · owner(그 상태가 만든 노드의 경로 표식)
 *
 * ⚑ `owner` 가 이 회차의 핵심이다. «비균등 0» 은 **그 상태가 만든 노드가 실제로 자에 들어왔을 때만**
 *   뜻이 있다 — 안 들어왔으면 0 은 «건강하다» 가 아니라 «안 봤다» 이고, 그것이 356 이 열여덟 회차
 *   동안 여섯 번 반복한 사고다(11·12·15·18회차 주석). 그래서 판정을 두 벌로 적지 않고
 *   **COLLECT 가 돌려준 그 행들의 `sel`** 을 세어 귀속을 찍는다(자는 한 벌 그대로). */
const CAND = [
  ['12 소환 결과(방패)', ['js:doSummonFree("shield", 10, true)'], '#sumw.on .sm-panel', '#sumGridIn>'],
  ['12 소환 결과(목걸이)', ['js:doSummonFree("amulet", 10, true)'], '#sumw.on .sm-panel', '#sumGridIn>'],
  ['12 소환 결과(스킬)', ['js:doSummonFree("skill", 10, true)'], '#sumw.on .sm-panel', '#sumGridIn>'],
  ['89 유물(전 10종 보유)', ['.tab[data-t="box"]', OWN_ALL_RELICS], '#rwGrid [data-rw]:not(.off)', '#rwGrid>'],
  ['53 우편(아이콘 통 + 재화 통)', [SEND_IC_MAILS, '#menub', '#mnw [data-mn="mail"]'], '.ml-r .ml-i', '.ml-i'],
];

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  const errs = [];

  for (const F of FRAMES) {
    for (const [label, steps, sig, owner] of CAND) {
      const ctx = await browser.newContext({ viewport: { width: F.width, height: F.height }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        for (const s of steps) {
          const ok = await STEP(page, s);
          if (!ok) errs.push(`${F.name} · ${label}: 무음 실패 — 단계 '${s.slice(0, 60)}…' 가 던졌다`);
          await page.waitForTimeout(600);
        }
        await page.waitForTimeout(900);   /* 12 소환 등장 연출(칸당 0.055s)이 끝나야 최종 상태 */
        const seen = await page.evaluate((q) => {
          const el = document.querySelector(q);
          if (!el) return null;
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0)
            ? [+r.width.toFixed(1), +r.height.toFixed(1)] : null;
        }, sig);
        if (!seen) errs.push(`${F.name} · ${label}: 진입 실패 — 고유 노드 '${sig}' 가 안 보인다`);
        /* 축이 «전종/전 통» 인 회차라 몇 칸이 켜졌는지도 같이 찍는다(표본 폭의 증거) */
        const span = await page.evaluate(() => ({
          relics: document.querySelectorAll('#rwGrid [data-rw]:not(.off)').length,
          relicsAll: document.querySelectorAll('#rwGrid [data-rw]').length,
          mailRows: document.querySelectorAll('.ml-r .ml-i').length,
          cards: document.querySelectorAll('#sumGridIn .sm-c').length,
        }));
        const got = await page.evaluate(COLLECT, { all: false });
        /* 귀속 — 이 상태가 만든 노드가 자에 몇 개 들어왔나(0 이면 «건강» 이 아니라 «안 봤다») */
        const mine = got.filter((g) => (g.sel || '').includes(owner));
        const kinds = [...new Set(mine.map((g) => g.kind))].sort();
        const bad = got.filter((g) => Math.abs(g.ratio - 1) > TOL);
        if (!mine.length) errs.push(`${F.name} · ${label}: 귀속 0 — 상태가 만든 노드('${owner}')가 자에 한 개도 안 들어왔다`);
        rows.push({ frame: F.name, label, sig: seen, nodes: got.length, own: mine.length, kinds, span, bad });
      } catch (e) {
        errs.push(`${F.name} · ${label}: ` + String(e.message || e).split('\n')[0]);
        rows.push({ frame: F.name, label, sig: null, nodes: 0, own: 0, kinds: [], span: null, bad: [] });
      }
      await ctx.close();
    }
  }
  await browser.close();

  if (JSON_OUT) {
    console.log(JSON.stringify({ tol: TOL, rows, errs }, null, 1));
    process.exit(0);
  }

  console.log(`[probe356r19] «18회차가 남긴 상태 축» ${CAND.length}곳 × 프레임 ${FRAMES.length}벌 · TOL ${TOL}`);
  let total = 0;
  for (const r of rows) {
    const sp = r.span
      ? `  [유물 ${r.span.relics}/${r.span.relicsAll} · 우편행 ${r.span.mailRows} · 결과칸 ${r.span.cards}]`
      : '';
    console.log(`\n── ${r.frame} · ${r.label} — 아이콘 노드 ${r.nodes}개`
      + ` · 그중 이 상태 몫 ${r.own}개(${r.kinds.join('+') || '없음'}) · 비균등 ${r.bad.length}개`
      + (r.sig ? ` (고유 노드 ${r.sig[0]}×${r.sig[1]})` : ' ⚠ 진입 실패') + sp);
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
