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
  /* ── 2회차(같은 세션) — 비율이 가장 크게 어긋나 있던 화면 묶음 «54 랭킹 + 35 패스» ── */
  { k: '.rk-bd', why: '54 랭킹 행 메달 (수리 전 2.07 — 전체 최악)' },
  { k: '.rk-sh', why: '54 랭킹 시상대 메달 3칸 (1.86)' },
  { k: '.rk-tab', why: '54 랭킹 탭 아이콘 3칸 (1.19~1.36)' },
  { k: '.ps-bdg', why: '35 패스 헤더 뱃지 (1.82·1.94)' },
  /* ⚠ 스캐너 경로는 id 를 만나면 거기서 멈춘다 — `.ps-bar` 가 아니라 **`#psBar`** 로 잡아야 한다
     (`.ps-bar` 로 뒀더니 «노드 0개» 로 빨개졌다 = 헛초록 방지 항이 제 일을 했다) */
  { k: '#psBar', why: '35 패스 하단 탭 아이콘 4칸 (.87~1.6)' },
  { k: '.ps-bx', why: '35 패스 칸 자물쇠 (1.10·1.21)' },
  { k: '.at-cr', why: '70 출석 👑 (1.4)' },
  { k: 'i.cdic', why: '21 도감 칸 아이콘 (1.15 — `.pt` 는 이미 transform:none 이었다)' },
  /* ── 3회차 — 상점 팝업 두 탭(10 소환 · 13 재화). 남은 자리 중 비율이 가장 컸다(1.631·1.433·1.234) ── */
  { k: 'div.cart', why: '10 상점 카드 아트 5칸 (수리 전 1.203~1.631 — 잔여 최악)' },
  { k: 'span.gem', why: '10 상점 [10/30회 소환] 버튼 💎 (1.234 — transform 이 아니라 object-fit:fill 축)' },
  { k: 'div.cn-bn', why: '13 재화 탭 배너 🎁 (1.433)' },
  { k: 'u.pr', why: '13 재화 탭 구매가 화폐 아이콘 (라벨 scaleX 1.02 를 자식이 뒤집어쓰던 자리)' },
];
/* [B] 래칫 — 2026-08-29 1회차 실측. 줄이면 같이 내려 적을 것. */
const REMAIN = 54;   /* 3회차 실측(셀렉터 기준) — 2회차 63 → **54**. 스캐너 머리글의 «자리» 와는 자가 다르다
                        (스캐너는 셀렉터+비율로 접어 79→66, 이 자는 셀렉터만으로 접어 63→54).
                        같은 자로 두 번 잰 값이 54 다(`scan356` 출력의 스코프 밖 셀렉터 unique 도 54).
                        ⚠ 1회차의 96 은 «셀렉터+비율» 로 세던 값이라 63·50 과 직접 비교 불가(자가 바뀌었다). */

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
  /* ⚠ 키를 «셀렉터 + 비율» 로 잡으면 **매 실행 값이 달라진다** — 60 쥬시의 `.jz-st` 가 등장 프레임마다
     다른 `scale:1.0xx` 를 걸어서, 같은 자리가 실행마다 다른 비율로 잡힌다(1회차에 78↔79 로 흔들렸다).
     래칫은 «자리» 를 세는 자이므로 **셀렉터만** 으로 접는다. */
  const outSel = new Set(badRows.filter((r) => !inScope(r.sel)).map((r) => r.sel));
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
    /* 3회차 스코프는 팝업 안이라 따로 연다 — scaleX 를 뗀 뒤 글리프 advance 가 상자를 넘으면
       크로미움이 줄을 line-left 에 박아 «아트가 왼쪽으로 쏠린» 것처럼 보인다(357 함정). */
    const over2 = await page.evaluate(async () => {
      const out = [];
      document.querySelector('.tab[data-t="shop"]').click();
      await new Promise((r) => setTimeout(r, 500));
      const check = (sel) => {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          const adv = parseFloat(getComputedStyle(el).fontSize) * 1.2478;
          const boxw = el.clientWidth || r.width;
          if (adv > boxw + 0.5) out.push({ sel, adv: +adv.toFixed(2), boxw: +boxw.toFixed(2) });
        }
      };
      check('#shopList .shp-card .cart');
      document.querySelector('#shopCats .shp-ct[data-cat="coin"]').click();
      await new Promise((r) => setTimeout(r, 500));
      check('#shopList .cn-bn>.art');
      return out;
    });
    /* `.ibtn .si`·`.tab .ti` 는 상자를 일부러 1.6배·172px 로 넓혀 둔 자리라 넘치면 실패다 */
    if (over.length) over.forEach((o) => bad(`advance 넘침 ${o.sel}: ${o.adv} > 상자 ${o.boxw}`));
    else ok('스코프 4부품 전부 advance ≤ 상자 (넘치는 줄 0)');
    if (over2.length) over2.forEach((o) => bad(`advance 넘침 ${o.sel}: ${o.adv} > 상자 ${o.boxw}`));
    else ok('3회차 스코프(상점 아트 · 재화 배너) advance ≤ 상자');
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

  /* [R] 는 부팅 화면(02)에서만 돈다 — 3회차 스코프는 팝업 안이라 그 자에 안 걸린다.
     그래서 같은 시험을 상점 팝업에서 한 번 더 한다. ⚠ 💎 는 transform 이 아니라
     «상자 종횡비 ≠ 원본» 축이라 되돌림도 `object-fit:fill` + 58×47 로 해야 한다. */
  console.log('[R2] 되돌림 시험(3회차 스코프) — 상점 팝업에서 옛 값을 도로 심으면 빨개지는가');
  for (const [tab, cat, css, want] of [
    ['shop', null,
      '#shopList .shp-card .cart{transform:scaleX(1.343) !important}'
      + '#shopList .shp-card .cbtn>.pan .gem>.cic{width:58px !important;height:47px !important;object-fit:fill !important}',
      2],
    ['shop', 'coin',
      '#shopList .cn-bn>.art{transform:scaleX(1.433) !important}'
      + '#shopList .cn-cd>.bt.buy>.pr>.cic{transform:none !important}',
      2],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.evaluate((q) => { document.querySelector(q).click(); }, `.tab[data-t="${tab}"]`);
    await page.waitForTimeout(500);
    if (cat) {
      await page.evaluate((q) => { document.querySelector(q).click(); }, `#shopCats .shp-ct[data-cat="${cat}"]`);
      await page.waitForTimeout(500);
    }
    await page.evaluate((t) => {
      const st = document.createElement('style'); st.textContent = t; document.head.appendChild(st);
    }, css);
    await page.waitForTimeout(200);
    const got = await page.evaluate(COLLECT, { all: false });
    const hit = got.filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel));
    const lab = cat ? '13 재화 탭' : '10 상점';
    if (hit.length >= want) ok(`[R2] ${lab} — 옛 값을 심으면 ${hit.length}자리가 빨개진다 (자가 살아 있다)`);
    else bad(`[R2] ${lab} — 심어도 ${hit.length}건뿐(≥${want} 이어야 한다): 이 자리는 감시 밖이다`);
    await ctx.close();
  }

  await browser.close();
  const total = oks.length + fails.length;
  console.log(`\nVERIFY356 ${oks.length}/${total} ` + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
