#!/usr/bin/env node
/* 356 18회차 재현기 — **«상태가 있어야 보이는 노드»** 가 열일곱 회차 동안 스캔 밖이었다
 *
 *   node tools/probe356r18.js          # 두 프레임(2280·1600)에서 후보 5화면
 *   node tools/probe356r18.js --json
 *
 * 왜 이 표본인가(338 규칙 — 처방 전에 재현):
 *   17회차가 다음 세션에 넘긴 문장이 이것이다 — «15회차 프런티어 «상태가 있어야 보이는 화면»
 *   (잠금/해금 · 보유/미보유 · 레드닷 켜짐)은 여전히 아무도 안 잡았다 — `cap72.js` 의
 *   «합법 세이브»(336 처방)가 선례다».
 *   부팅 세이브는 우편 0통 · 던전 2해금 6잠금 · 유물 0보유라, 그 상태로만 돌던 스캐너에게
 *   아래 노드들은 «없는 노드» 였다:
 *     53 우편 — 보상 썸네일(`.ml-i` 안 `curIc()` 4종: 골드·다이아·유물조각·마일리지)
 *     03 던전 — 해금 카드의 입장권/재화 알약(잠금 카드는 딤+🔒 로 다른 마크업)
 *     12 소환 결과(펫) — **펫 스프라이트 캔버스** 그리드(15회차의 스킬 배너는 이모지만 밟았다)
 *     12 소환 결과(무기) — 장비 아이콘 그리드(세 장비 배너의 대표)
 *     89 유물(보유) — 보유 칸의 유물 아트(부팅은 전 칸 미보유 실루엣)
 *
 * 상태는 전부 **합법 세이브 + 제품 진입점**으로 만든다(cap72 «--unlock» · 336 처방 —
 *   자가 화면을 그리지 않고, 실제 세이브가 가질 수 있는 값만 만든다):
 *     우편 `sendMail(o)`(25779 — 상점발 우편의 실제 생산자) · 던전 해금 = cap72 --unlock 블록
 *     (S.guide.idx + DUN_UI[].pre 층수) · 소환 `doSummonFree(b,10,true)`(보상 경유 무료 소환) ·
 *     유물 `S.relic`(던전 수입 범위) + `summonRelic(true)`(30112 — 실제 소환 경로).
 *
 * 판정은 `scan356.js` 의 수집기(COLLECT)·구동기(STEP)를 **그대로** 받아 쓴다 —
 * 자를 두 벌로 적으면 한쪽만 늙는다([S3] 주석 · 13회차 [R12] 규율).
 *
 * ⚠ LESSONS 356-⑬ — «불렀다» 가 아니라 «그 화면의 고유 노드가 보인다» 를 서명으로 확인한다.
 *   여기서는 서명이 곧 «상태가 만든 노드» 다(예: 우편은 `.ml-r .ml-i` — 통이 없으면 행이 없다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { COLLECT, URL, TOL, STEP } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');

const FRAMES = [
  { name: '9:19  1080×2280', width: 1080, height: 2280 },
  { name: '9:13.3 1080×1600', width: 1080, height: 1600 },
];

/* 합법 세이브 조각들 — 값은 상수가 아니라 제품에게 묻는다(336 처방) */
const UNLOCK_DUN = 'js:S.guide.idx = 99;'
  + 'Object.keys(DUN_UI).forEach(function(id){ if(DUN_UI[id].pre) S.dun[id] = 1; });'
  + 'Object.values(DUN_UI).forEach(function(u){ if(u.pre) S.dun[u.pre.id] = (u.pre.f|0) + 1; });';
/* 네 통 = 네 썸네일(MAIL_RW 4종을 한 화면에서 전부 밟는다 — 행은 통당 최고액 아이콘 하나) */
const SEND_MAILS = 'js:sendMail({t:"📦 골드", g:12345});sendMail({t:"📦 다이아", c:678});'
  + 'sendMail({t:"📦 유물조각", r:90});sendMail({t:"📦 마일리지", m:3});';
/* 유물 — 던전 수입 범위의 조각으로 실제 소환 경로를 여덟 번(8종 전부는 난수라 «여러 칸 보유» 까지만) */
const OWN_RELICS = 'js:S.relic = Math.max(S.relic, relicCost() * 8 + 100);'
  + 'for(var i=0;i<8;i++) summonRelic(true);';

/* label · steps · sig(상태가 만든 그 화면 고유 노드) */
const CAND = [
  ['53 우편(보상 통)', [SEND_MAILS, '#menub', '#mnw [data-mn="mail"]'], '.ml-r .ml-i'],
  ['03 던전(전량 해금)', [UNLOCK_DUN, '.tab[data-t="adv"]'], '#dunList .dnc:not(.lock)'],
  ['12 소환 결과(펫)', ['js:doSummonFree("pet", 10, true)'], '#sumw.on .sm-panel canvas'],
  ['12 소환 결과(무기)', ['js:doSummonFree("weapon", 10, true)'], '#sumw.on .sm-panel'],
  ['89 유물(보유)', ['.tab[data-t="box"]', OWN_RELICS], '#rwGrid [data-rw]'],
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

  console.log(`[probe356r18] «상태가 있어야 보이는 노드» ${CAND.length}곳 × 프레임 ${FRAMES.length}벌 · TOL ${TOL}`);
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
