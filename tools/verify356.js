#!/usr/bin/env node
/* 작업 356 게이트 — «아이콘은 원본 비율» (저장소 주인 지시 2026-08-29)
 *
 *   node tools/verify356.js
 *
 * 규칙(이 작업이 세운 것):
 *   아이콘 노드의 **누적** 스케일 (sx, sy) 가 다르면 찌그러진 것이다.
 *   고칠 때는 «작은 쪽으로» 맞춘다 — s = min(sx, sy). 커지는 쪽으로 맞추면 호스트를 넘쳐
 *   잘리거나(`.cdw{overflow:hidden}`) 이웃을 밟는다. 라벨(글자)의 scaleX 는 대상이 아니다.
 *
 * 절:
 *   [A] 스코프(전 화면 상시 크롬) 비균등 0건
 *   [B] 잔여 자리 래칫 — 스코프 밖 비균등 «자리 수» 가 등재값보다 늘면 빨강(새로 만들면 걸린다)
 *   [C] 잘림 0 — 스코프 아이콘의 글리프 advance 가 호스트 상자를 안 넘는다(357 함정)
 *   [R] 되돌림 시험 — 스코프 노드에 scaleX 를 도로 주입하면 [A] 가 실제로 빨개진다
 *
 * ⚠ [B] 는 «줄었다» 를 막지 않는다(라운드마다 줄어드는 것이 정상). 늘어난 것만 잡는다.
 *   라운드를 돌아 자리를 닫았으면 REMAIN 을 그 값으로 내려 적어라 — 안 내리면 래칫이 헐거워진다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, COLLECT, URL } = require('./scan356.js');

const TOL = 0.02;

/* ── 이번 라운드에 닫은 자리 = 전 화면에 «상시» 보이는 크롬 아이콘 ──
   셀렉터 조각으로 잡는다(스캐너가 돌려주는 경로 문자열에 대한 부분 일치). */
const SCOPE = [
  { k: 'span.ti', why: 'A1 하단 탭 아이콘 5칸' },
  { k: 'span.si', why: 'A2 좌측 사이드 아이콘 6칸' },
  { k: 'i.mn-i', why: '52 ▦ 메뉴 아이콘 7칸' },
  { k: 'span.si3', why: 'A4 스킬 슬롯 아이콘' },
  { k: 'span.lk', why: 'A4 슬롯 자물쇠' },
  { k: 'b.kboss', why: '28 보스 해골' },
  { k: 'div.pcp', why: 'A3 칭호 🔥' },
  { k: '.cDia', why: 'A3 HUD 보석(알약·비행·착지)' },
  { k: '.cGold', why: 'A3 HUD 코인' },
];
/* [B] 래칫 — 2026-08-29 1회차 실측. 줄이면 같이 내려 적을 것. */
const REMAIN = 96;

const fails = [];
const oks = [];
const ok = (m) => { oks.push(m); console.log('  ✓ ' + m); };
const bad = (m) => { fails.push(m); console.log('  ✗ ' + m); };

const inScope = (sel) => SCOPE.find((s) => sel.includes(s.k));

async function sweep(browser, inject) {
  const rows = [];
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); }, s);
        await page.waitForTimeout(400);
      }
      if (inject) { await page.evaluate(inject); await page.waitForTimeout(120); }
      await page.waitForTimeout(200);
      const got = await page.evaluate(COLLECT, { all: false });
      for (const g of got) rows.push(Object.assign({ screen: label }, g));
    } catch (e) { /* 화면 하나가 안 열려도 나머지는 본다 — 진입 실패는 smoke 의 몫이다 */ }
    await ctx.close();
  }
  return rows;
}

(async () => {
  const browser = await launch(chromium);

  console.log('[A] 스코프 — 전 화면 상시 크롬 아이콘의 비균등 0건');
  const rows = await sweep(browser, null);
  if (!rows.length) bad('아이콘 노드를 한 개도 못 봤다 (스캐너가 죽었다 — 헛초록 방지)');
  else ok(`아이콘 노드 ${rows.length}개 관측`);

  const badRows = rows.filter((r) => Math.abs(r.ratio - 1) > TOL);
  for (const s of SCOPE) {
    const hit = badRows.filter((r) => r.sel.includes(s.k));
    const seen = rows.filter((r) => r.sel.includes(s.k));
    if (!seen.length) bad(`${s.k} (${s.why}) — 노드를 한 개도 못 봤다: 셀렉터가 바뀌었거나 화면이 안 열렸다`);
    else if (hit.length) {
      const w = hit[0];
      bad(`${s.k} (${s.why}) — 비균등 ${hit.length}건, 최악 ${w.ratio} «${w.txt}» ${w.own || w.chain.join(' ; ')}`);
    } else ok(`${s.k} (${s.why}) — ${seen.length}노드 전부 등방`);
  }

  console.log('[B] 잔여 래칫 — 스코프 밖 비균등 «자리» 수');
  const outSel = new Set(badRows.filter((r) => !inScope(r.sel)).map((r) => r.sel + '|' + r.ratio));
  if (outSel.size > REMAIN) bad(`잔여 자리 ${outSel.size} > 등재값 ${REMAIN} — 새 비균등 아이콘이 생겼다`);
  else ok(`잔여 자리 ${outSel.size} ≤ 등재값 ${REMAIN}` + (outSel.size < REMAIN ? ' (줄었다 — REMAIN 을 내려 적어라)' : ''));

  console.log('[C] 잘림 0 — 스코프 아이콘 advance 가 호스트를 안 넘는다');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    /* 357 함정 — 이모지 advance(= font-size × 1.2478)가 상자보다 넓으면 크로미움이 줄을
       line-left 에 박아 «다 오른쪽으로 밀린» 것처럼 보인다. 356 이 폭을 되돌렸으니 여기서 다시 잰다. */
    const over = await page.evaluate(() => {
      const out = [];
      const check = (sel, hostSel) => {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          const cs = getComputedStyle(el);
          const fs = parseFloat(cs.fontSize);
          const adv = fs * 1.2478;                      /* Noto Color Emoji 고정 advance */
          const host = hostSel ? el.closest(hostSel) : el.parentElement;
          const hw = host ? host.getBoundingClientRect().width : r.width;
          const boxw = el.clientWidth || r.width;
          if (adv > boxw + 0.5) out.push({ sel, adv: +adv.toFixed(2), boxw: +boxw.toFixed(2), hw: +hw.toFixed(2) });
        }
      };
      check('.slot2 .si3', '.cdw');
      check('#mnw .mn-i', '.mn-b');
      check('.ibtn .si', '.ibtn');
      check('.tab .ti', '.tab');
      return out;
    });
    /* `.ibtn .si`·`.tab .ti` 는 상자를 일부러 1.6배·172px 로 넓혀 둔 자리라 넘치면 실패다 */
    if (over.length) over.forEach((o) => bad(`advance 넘침 ${o.sel}: ${o.adv} > 상자 ${o.boxw}`));
    else ok('스코프 4부품 전부 advance ≤ 상자 (넘치는 줄 0)');
    await ctx.close();
  }

  console.log('[R] 되돌림 시험 — scaleX 를 도로 주입하면 [A] 가 빨개지는가');
  {
    const inject = () => {
      const st = document.createElement('style');
      st.textContent = '.tab .ti,.ibtn .si,#mnw .mn-i{transform:scaleX(1.3) !important}';
      document.head.appendChild(st);
    };
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.evaluate(inject);
    await page.waitForTimeout(200);
    const got = await page.evaluate(COLLECT, { all: false });
    const hit = got.filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel));
    if (hit.length >= 3) ok(`주입하면 스코프 ${hit.length}건이 빨개진다 (자가 살아 있다)`);
    else bad(`주입해도 스코프가 ${hit.length}건뿐 — [A] 가 아무것도 못 보는 «헛초록» 이다`);
    await ctx.close();
  }

  await browser.close();
  const total = oks.length + fails.length;
  console.log(`\nVERIFY356 ${oks.length}/${total} ` + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
