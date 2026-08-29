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
  /* ⚑ 397(2026-08-29) — 이 키는 2회차부터 있었는데도 **36 출석 패스의 보상 젬**(scaleX .76)이
     살아남았다. 스코프가 아니라 `scan356.js` 의 SCREENS 가 출석 탭을 안 열어서다
     (`#psw.att …` 는 그 탭에서만 붙는다) = «스코프 키는 있는데 그 화면을 본 적이 없는» 헛초록.
     되돌림은 [R6], SCREENS 자체의 무음 실패 감시는 [C]. */
  { k: '.ps-bx', why: '35 패스 칸 자물쇠 (1.10·1.21) + 36 출석 패스 보상 젬 (397 — .76)' },
  { k: '.at-cr', why: '70 출석 👑 (1.4)' },
  { k: 'i.cdic', why: '21 도감 칸 아이콘 (1.15 — `.pt` 는 이미 transform:none 이었다)' },
  /* ── 3회차 — 상점 팝업 두 탭(10 소환 · 13 재화). 남은 자리 중 비율이 가장 컸다(1.631·1.433·1.234) ── */
  { k: 'div.cart', why: '10 상점 카드 아트 5칸 (수리 전 1.203~1.631 — 잔여 최악)' },
  { k: 'span.gem', why: '10 상점 [10/30회 소환] 버튼 💎 (1.234 — transform 이 아니라 object-fit:fill 축)' },
  { k: 'div.cn-bn', why: '13 재화 탭 배너 🎁 (1.433)' },
  { k: 'u.pr', why: '13 재화 탭 구매가 화폐 아이콘 (라벨 scaleX 1.02 를 자식이 뒤집어쓰던 자리)' },
  /* ── 4회차 — §9 가 «자리가 한 화면에 몰려 있다» 로 넘긴 두 화면 + 전 화면 상시 크롬 한 자리 ── */
  { k: 'b.ch-bd', why: '103 채팅 이름줄 배지 (수리 전 1.09~1.55 — 잔여 최악. `CHAT_BSX` 표째 폐기)' },
  { k: 'b.ch-sx', why: '103 채팅 성별 기호 ♂♀ (1.06 · 1.55)' },
  { k: 'i.cf55-ic', why: '55 설정 행 아이콘 6칸 (.87~1.48 — 데이터 `CF_ROWS.ix` 폐기)' },
  /* ⚠ 스캐너 경로는 id 를 만나면 멈춘다 — `.ri` 가 아니라 **`#tutoRew`** 로 잡는다(2회차 `#psBar` 선례).
     이 한 자리가 노드 수로는 가장 컸다 — 30화면 «전부» 에서 같은 노드를 집으므로 60노드다. */
  { k: '#tutoRew', why: '61 가이드 미션 배너 보상 아이콘 (전 화면 상시 · todo .834/.968 · ready .94/.79)' },
  /* ── 5회차 — 03 던전/레이드 카드 알약 아이콘 세 자리. 잔여 중 **노드 수가 가장 컸다**(48노드).
     4회차 교훈(«자리» 와 «노드» 는 다르다)대로 «비율 × 보이는 화면 수» 로 줄을 세워 고른 자리다.
     ⚑ 세 자리 다 세로 축(scaleY)이라 앞 회차의 scaleX 자에는 한 번도 안 걸렸다. */
  { k: 'div.sp.tk>em', why: '03 던전/레이드 입장권 알약 아이콘 (수리 전 scaleY 1.25 = 잉크가 ref 50 대비 75.6)' },
  { k: 'div.sp.lv>em', why: '03 던전/레이드 레벨 알약 아이콘 (scaleY .91)' },
  /* ⚠ 두 키로 나눠 적는다 — 경로가 `div.pill.p2>em`(레이드 둘째 알약)일 때는 `div.pill>em` 이
     **부분 일치가 안 된다**(클래스가 사이에 끼어든다). 한 키로 뒀으면 그 자리는 감시 밖이었다. */
  { k: 'div.pill>em', why: '03 던전/레이드 재화 알약 아이콘 (scaleY 1.08)' },
  { k: 'div.pill.p2>em', why: '03 레이드 둘째 재화 알약 아이콘 (같은 규칙)' },
  /* ── 6회차 — 34 축복 팝업. 잔여 14자리 중 **8자리가 이 한 화면**이었다(5회차가 넘긴 최대 묶음).
     ⚑ 앞 회차들과 부호가 반대인 자리다 — 여기의 scaleX 는 «ref 잉크 폭에 맞추려고» 일부러 건
     보정이라 수리 «전» 이 ref 에 더 가까웠다(probe356r6 [C]). 그래도 걷어낸 근거는 주인 지시가
     레퍼런스보다 우선이라는 것(354 선례)이고, 남는 거리는 아트 종횡이 만든 것이라 CSS 로는 못 닫는다. */
  { k: 'div#blsC_atk>div.b>s.ic', why: '34 축복 카드1 ⚔️ (수리 전 scaleX .974)' },
  { k: 'div#blsC_hp>div.b>s.ic', why: '34 축복 카드2 ❤️ (scaleX .858 + fs 153 — 둘이 한 벌이었다)' },
  { k: 'div#blsC_rate>div.b>s.ic', why: '34 축복 카드3 🌀 (scaleX .875)' },
  /* ⚠ 세 카드를 **각각** 적는다 — 스캐너 경로가 `div#blsC_<k>` 로 id 를 물고 시작하므로
     `s.tm.alert>b.ck` 한 키로는 세 자리 중 아무것도 부분 일치가 안 된다(5회차 `div.pill.p2` 선례). */
  { k: 'div#blsC_atk>div.b>s.tm.alert>b.ck', why: '34 축복 카드1 ⏱ 시계 (scaleX .97)' },
  { k: 'div#blsC_hp>div.b>s.tm.alert>b.ck', why: '34 축복 카드2 ⏱ 시계 (같은 규칙 `.bls-c .tm>b.ck`)' },
  { k: 'div#blsC_rate>div.b>s.tm.alert>b.ck', why: '34 축복 카드3 ⏱ 시계 (같은 규칙)' },
  { k: 'div#blsBonus>s.ic', why: '34 보너스 바 💰 (그룹 scale(.706,.748) — 형제 .ch 와 한 그림)' },
  /* ── 7회차 — **남은 전부**(23 훈련 3 · 33 재화 정보 2 · 50 코스튬 1). 이 회차로 REMAIN 이 0 이 된다.
     ⚠ 키에 **상태 클래스를 넣지 않는다** — 스캐너 경로는 `div.tr-card.no` · `div.sk-btn.sk-b2.no`
     처럼 그때그때의 상태를 달고 나오므로, 세이브가 달라 `.ok` 가 되면 «노드 0개» 로 헛초록이 아니라
     **빨강**이 된다(그건 옳지만 이 자리의 물음이 아니다). 상태가 안 끼는 조각으로 문다. */
  { k: '>span.ci', why: '23 훈련 카드 아트 ⚔️ (수리 전 scale(.829,.893) — 남은 6자리 중 두 축이 다 실린 유일한 자리)' },
  { k: 'span.cb>s', why: '23 훈련 카드 비용 코인 (scaleX .968 — wrap + img 2노드)' },
  { k: 'i#ciIcon', why: '33 재화 정보 팝업 아이콘 (scaleX .87 — 골드·다이아·유물조각 3화면에서 같은 자리)' },
  /* ⚠ 여기만 **역보정**이다 — 호스트 `<i class="ol3">` 는 «강화 [아이콘] 30» 이라 글자를 품은
     **라벨**이고, 라벨의 scaleX 는 지시 대상이 아니다(3회차 `u.pr` 선례). 손잡이를 뗄 수 없으므로
     아이콘 쪽에 `scaleX(1.15473)` 을 걸어 누적을 1.0 으로 되돌렸다. 그래서 이 키가 보는 노드의
     **자기** 배율은 1.15473 로 비등방이고, 스캐너가 세는 것은 «누적» 이라 초록이다. */
  { k: 'i.ol3>img.cic', why: '50 코스튬 [강화] 라벨 안 강화석 아이콘 (라벨 scaleX .866 을 뒤집어쓰던 자리 — 역보정)' },
];
/* [B] 래칫 — 2026-08-29 1회차 실측. 줄이면 같이 내려 적을 것. */
const REMAIN = 0;    /* ⚑ 7회차(2026-08-29, sess-1005-3302 워커 D) — **0**. 노드 수로도 16 → **0**.
                        닫은 것은 남은 전부다: 23 훈련 3자리(⚔️ · 코인 wrap+img) · 33 재화 정보 2자리
                        (`#ciIcon` wrap+img — 3화면에서 잡히므로 6노드) · 50 코스튬 1자리(2노드).
                        ⚠ **0 은 «다 봤다» 가 아니라 «지금 SCREENS 42화면 안에서 0» 이다.** 397 이
                        못박은 대로 REMAIN 은 표본이 고정일 때만 뜻이 있다 — SCREENS 에 줄을 더하면
                        늘 수 있고, 그때는 [C] 가 아니라 이 값을 다시 재서 적어라.
                        ⚠ 0 이 된 뒤로 [B] 는 «새 비균등 아이콘이 하나라도 생기면 빨강» 인 자다.

                        ── 아래는 6회차까지의 이력(값의 출처를 지우지 않는다) ──
                        6회차 실측(셀렉터 기준) — 5회차 14 → **6**. 노드 수로는 20 → **12**.
                        닫은 것은 34 축복 한 화면(8자리 / 8노드)이다.
                        ⚠ 5회차에 이 값은 **두 번 움직였다**: 먼저 스캐너의 «23 훈련» 즉사를 고치자
                        그 화면이 처음 스캔에 들어와 44 → **47** 로 «늘었고»(고친 것이 아니라 처음 본 것이다.
                        SVG 노드의 className 은 SVGAnimatedString 이라 `.slice` 가 없었다 — 그 화면은
                        내내 래칫의 감시 밖 = 헛초록), 그 뒤 03 세 자리를 닫아 47 → 14.
                        ⚠ 1회차의 96 은 «셀렉터+비율» 로 세던 값이라 63·54·44·14·6 과 직접 비교 불가.
                        남은 6자리: 23 훈련 3 · 33 재화 정보 2 · 50 코스튬 1 (docs/review/356 §13 표).

                        ⚑ 397(2026-08-29) — **표본이 넓어졌는데 값은 6 그대로다. 우연이 아니라 계산이다.**
                        SCREENS 를 31 → **42화면**(무음 실패 4줄 교정 + 탭·서브탭 11줄 신설)으로 채우자
                        스캔 노드가 1886 → **3318** 로 늘고 자리가 6 → **10** 이 됐는데, 늘어난 4자리가
                        전부 36 출석 패스의 보상 젬(`.ps-bx`)이라 **[B] 가 아니라 [A] 가 잡는 자리**였다
                        (`.ps-bx` 는 스코프 안이다). 397 이 그 자리를 닫아 다시 6 이 된 것이다.
                        ⚠ **노드 수는 12 → 16 으로 늘었다** — 자리가 는 게 아니라 «33 재화 정보» 2자리가
                        골드·다이아·유물조각 3화면에서 각각 잡히기 때문이다(같은 자리 × 3). */

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
    /* 4회차 스코프 — 55 설정·103 채팅. 여기는 «상자보다 넓어지는» 쪽 위험이 다르다:
       ix<1 이던 셋은 fs 를 내려 흡수했으니 좁아지기만 하고, ix>1 이던 셋은 선언만 뗐으니
       advance 는 그대로다. 즉 **수리로 새로 넘칠 수 있는 자리는 없다** — 그래도 잰다(357 함정). */
    const over3 = await page.evaluate(async () => {
      const out = [];
      const check = (sel) => {
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          const adv = parseFloat(getComputedStyle(el).fontSize) * 1.2478;
          const boxw = el.clientWidth || r.width;
          if (adv > boxw + 0.5) out.push({ sel, adv: +adv.toFixed(2), boxw: +boxw.toFixed(2) });
        }
      };
      document.querySelector('#menub').click();
      await new Promise((r) => setTimeout(r, 400));
      document.querySelector('#mnw [data-mn="conf"]').click();
      await new Promise((r) => setTimeout(r, 500));
      check('#cfList .cf55-ic');
      return out;
    });
    if (over3.length) over3.forEach((o) => bad(`advance 넘침 ${o.sel}: ${o.adv} > 상자 ${o.boxw}`));
    else ok('4회차 스코프(55 설정 행 아이콘) advance ≤ 상자');
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

  /* [R3] 4회차 스코프 — 55 설정·103 채팅은 팝업 안이라 [R]·[R2] 어느 자에도 안 걸린다.
     ⚠ 두 화면은 되돌림의 «모양» 이 서로 다르다:
       · 103 은 CSS 배율(`--bsx`·`scaleX`)이라 옛 값을 스타일로 도로 심으면 된다.
       · 55 는 **데이터**(`CF_ROWS.ix`)라 스타일로는 못 되돌린다 — 인라인 `--sx` 를 직접 심고
         `.cf55-ic` 의 transform 에 그 손잡이를 다시 붙여야 «폐기 전» 과 같은 모양이 된다.
     이 갈래를 안 나누면 55 쪽은 «심어도 안 빨개지는» 헛초록이 된다. */
  console.log('[R3] 되돌림 시험(4회차 스코프) — 55 설정 · 103 채팅에서 옛 값을 도로 심으면 빨개지는가');
  for (const [lab, steps, revert, want] of [
    ['103 채팅', ['#botleft .ubtn[data-util="chat"]'], () => {
      const st = document.createElement('style');
      st.textContent = '.ch-nm>.ch-bd{transform:translateY(-4px) scaleX(var(--bsx,1.25)) !important}'
        + '.ch-nm>.ch-sx.m{transform:scaleX(1.06) !important}'
        + '.ch-nm>.ch-sx.f{transform:scaleX(1.55) !important}';
      document.head.appendChild(st);
      const T = { '⭐': 1.09, '👿': 1.13, '🛡️': 1.30, '🎖️': 1.55, '🔥': 1.40, '👑': 1.20 };
      for (const b of document.querySelectorAll('.ch-nm>.ch-bd'))
        b.style.setProperty('--bsx', T[b.textContent.trim()] || 1.25);
    }, 3],
    ['55 설정', ['#menub', '#mnw [data-mn="conf"]'], () => {
      const st = document.createElement('style');
      st.textContent = '.cf55-ic{transform:translate(var(--dx,0px),var(--dy,0px)) scaleX(var(--sx,1)) !important}';
      document.head.appendChild(st);
      const IX = [0.96, 1.18, 1.48, 1.24, 0.92, 0.87];   /* 폐기한 CF_ROWS.ix — 행 순서 그대로 */
      document.querySelectorAll('#cfList .cf55-ic').forEach((el, i) => {
        if (IX[i]) el.style.setProperty('--sx', IX[i]);
      });
    }, 4],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    for (const s of steps) {
      await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); }, s);
      await page.waitForTimeout(450);
    }
    await page.evaluate(revert);
    await page.waitForTimeout(200);
    const got = await page.evaluate(COLLECT, { all: false });
    const hit = got.filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel));
    if (hit.length >= want) ok(`[R3] ${lab} — 옛 값을 심으면 ${hit.length}자리가 빨개진다 (자가 살아 있다)`);
    else bad(`[R3] ${lab} — 심어도 ${hit.length}건뿐(≥${want} 이어야 한다): 이 자리는 감시 밖이다`);
    await ctx.close();
  }

  /* [R4] 5회차 스코프 — 03 던전/레이드는 탭을 눌러야 열리는 페이지라 [R]·[R2]·[R3] 어느 자에도 안 걸린다.
     되돌림은 «옛 scaleY 를 도로 심는 것» 하나로 끝난다(세 자리 다 CSS 배율이라 55 같은 데이터 갈래가 없다).
     ⚠ 음성항을 같이 세운다 — 심기 «전» 에 0건이어야 [R4] 가 «주입 때문에 빨개진 것» 을 증명한다.
     안 그러면 원래 빨간 자리를 주입 공로로 읽는 헛초록이 된다. */
  console.log('[R4] 되돌림 시험(5회차 스코프) — 03 던전 카드에 옛 scaleY 를 도로 심으면 빨개지는가');
  for (const [lab, sub] of [['03 던전', null], ['03 레이드', 'raid']]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.evaluate(() => { document.querySelector('.tab[data-t="adv"]').click(); });
    await page.waitForTimeout(600);
    if (sub) {
      /* ⚠ 라벨 글자로 찾지 마라 — 123(2026-08-26 주인 지시)이 «레이드» 를 **«컨텐츠»** 로 개칭했다.
         `/레이드/` 로 찾던 첫 판은 **아무것도 못 눌러 던전 화면을 두 번 잰 헛초록**이었다
         (5회차 비평가 AY 가 제출 캡처에서 잡아 줬다). 스캐너와 같은 `data-dsub` 축으로 잡는다. */
      const moved = await page.evaluate(() => {
        const el = document.querySelector('#dunSub [data-dsub="raid"]');
        if (!el) return false;
        el.click();
        return true;
      });
      if (!moved) bad(`[R4] ${lab} — 서브탭 진입 실패: '#dunSub [data-dsub="raid"]' 가 없다`);
      await page.waitForTimeout(500);
      /* 진입했는지 «화면» 으로 확인한다 — 레이드 카드는 `.dnc.rd` 다 */
      const rd = await page.evaluate(() => document.querySelectorAll('#dunList .dnc.rd').length);
      if (!rd) bad(`[R4] ${lab} — 눌렀는데 레이드 카드(.dnc.rd)가 0장이다 (화면이 안 바뀌었다)`);
      else ok(`[R4] ${lab} — 레이드 카드 ${rd}장 진입 확인 (헛초록 방지)`);
    }
    /* 음성항 — 주입 전에는 이 스코프가 깨끗해야 한다 */
    const pre = (await page.evaluate(COLLECT, { all: false }))
      .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel)
        && /sp\.tk>em|sp\.lv>em|pill(\.p2)?>em/.test(r.sel));
    if (pre.length) bad(`[R4] ${lab} — 주입 «전» 에 이미 ${pre.length}건 빨강: ${pre[0].sel} ${pre[0].ratio}`);
    else ok(`[R4] ${lab} — 주입 전 0건 (음성항)`);

    await page.evaluate(() => {
      const st = document.createElement('style');
      st.textContent = '.dnc .sp.tk>em{transform:scaleY(1.25) !important}'
        + '.dnc .sp.lv>em{transform:scaleY(.91) !important}'
        + '.dnc .pill>em{transform:scaleY(1.08) !important}';
      document.head.appendChild(st);
    });
    await page.waitForTimeout(200);
    const hit = (await page.evaluate(COLLECT, { all: false }))
      .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel)
        && /sp\.tk>em|sp\.lv>em|pill(\.p2)?>em/.test(r.sel));
    if (hit.length >= 3) ok(`[R4] ${lab} — 옛 scaleY 를 심으면 ${hit.length}노드가 빨개진다 (자가 살아 있다)`);
    else bad(`[R4] ${lab} — 심어도 ${hit.length}건뿐(≥3 이어야 한다): 이 자리는 감시 밖이다`);
    await ctx.close();
  }

  /* [S] 6회차 배율 고정 — «등방이기만 하면 통과» 의 구멍을 막는다.
     [A] 는 sx=sy 만 보므로 `transform:none` 도 초록이다. 그런데 6회차의 다섯 수는
     **ref 상자에 담는 contain 배율**이라 지워지면 아이콘이 ref 를 넘거나(카드) 어긋난다(보너스 바).
     ⚑ 이 항이 필요해진 경위 자체가 교훈이다 — `verify325` [H] 가 시계의 **그려진** 폭(38.8)을
     박고 있어서 그 자가 우연히 이 질문을 대신 하고 있었다. 6회차가 [H] 를 레이아웃 상자로
     이관하면서 그 질문이 **아무 자에게도 안 남을 뻔했다**(328~330 이 겪은 «통째로 사라져도 초록»).
     그래서 질문을 주인에게 옮겨 적는다. 값을 바꾸려면 `cal356r6` 으로 다시 역산할 것.
     ⚑ **394 이관(2026-08-29)** — 카드 3장의 눈금이 **폭(contain) → 높이**로 바뀌었다
     (`.9494/.9236/.8684` → `.9745/1.0694/.9936`). 이 절이 지키는 것은 «어느 눈금이냐» 가
     아니라 «역산값이 제품에 그대로 있는가» 이므로 절의 뜻은 그대로고 **수만 갈아 끼운다.**
     ⚠ 세 카드의 값은 이제 `cal356r6`(contain 역산기)이 아니라 **`probe394` [B]**(높이 눈금
     역산)가 낸다 — 여기서 cal356r6 을 돌려 도로 적으면 394 가 통째로 되돌아간다.
     눈금 자체(«세로 덩치 최대÷최소 ≤ 1.05»)는 `verify394` 가 찍힌 픽셀로 따로 묻는다.
     나머지 셋(⏱ · 보너스 바 둘)은 형제 집합이 아니라 **contain 그대로**다. */
  console.log('[S] 6회차 배율 고정 — contain 으로 역산한 등방 배율이 제품에 그대로 있는가');
  {
    const WANT = [
      /* 394 — 높이 눈금(refH/natH). 옛 contain 값은 .9494 / .9236 / .8684 였다. */
      ['#blsC_atk .ic', 0.9745], ['#blsC_hp .ic', 1.0694], ['#blsC_rate .ic', 0.9936],
      ['#blsC_atk .tm>b.ck', 0.9167], ['#blsBonus>s.ic', 0.6765], ['#blsBonus>s.ch', 0.6765],
    ];
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const el = document.querySelector('.side .ibtn[data-pop="bless"]');
      if (el) el.click();
    });
    await page.waitForTimeout(700);
    const got = await page.evaluate((list) => list.map(([q]) => {
      const e = document.querySelector(q);
      if (!e) return null;
      const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(getComputedStyle(e).transform);
      return m ? [+m[1], +m[4]] : null;
    }), WANT);
    WANT.forEach(([q, want], i) => {
      const g = got[i];
      if (!g) { bad(`[S] ${q} — 노드가 없다(선택자가 죽었다)`); return; }
      const [sx, sy] = g;
      if (Math.abs(sx - want) > 0.004 || Math.abs(sy - want) > 0.004)
        bad(`[S] ${q} — 배율 ${sx}/${sy}, 기대 ${want} (contain 역산값이 사라졌다)`);
      else ok(`[S] ${q} — 등방 ${want} 고정`);
    });
    await ctx.close();
  }

  /* [R5] 6회차 스코프 — 34 축복은 사이드 버튼으로 여는 팝업이라 앞 자들 어느 것에도 안 걸린다.
     되돌림은 세 갈래를 **한꺼번에** 심는다: 카드 아이콘 scaleX 3개 + ❤️ 의 fs 153 + ⏱ scaleX
     + 보너스 바의 비균등 «그룹» scale. ⚠ ❤️ 는 «scaleX 와 fs 가 한 벌» 이라 둘 다 심어야
     수리 전 상태다(356-⑥ «되돌림 시험은 옛 값이 어디에 살았는가로 갈래를 나눠야 한다»).
     ⚠ 음성항(주입 «전» 0건)과 진입 확인(카드 3장)을 같이 세운다 — [R4] 와 같은 이유다. */
  console.log('[R5] 되돌림 시험(6회차 스코프) — 34 축복에 옛 scaleX·그룹 비균등을 도로 심으면 빨개지는가');
  {
    const RE = /blsC_(atk|hp|rate)>div\.b>s\.(ic|tm)|blsBonus>s\.ic/;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const el = document.querySelector('.side .ibtn[data-pop="bless"]');
      if (el) el.click();
    });
    await page.waitForTimeout(700);
    /* 진입을 «화면» 으로 확인한다 — 클릭이 조용히 실패해도 스코프 키가 없으면 0건 = 헛초록이다
       (LESSONS 356-⑬: 조용히 실패한 클릭은 다른 화면을 재고 초록을 준다) */
    const cards = await page.evaluate(() => document.querySelectorAll('.bls-c').length);
    if (cards !== 3) bad(`[R5] 34 축복 — 팝업 진입 실패: .bls-c 가 ${cards}장(3 이어야 한다)`);
    else ok(`[R5] 34 축복 — 축복 카드 ${cards}장 진입 확인 (헛초록 방지)`);

    /* 음성항 — 주입 전에는 이 스코프가 깨끗해야 한다 */
    const pre = (await page.evaluate(COLLECT, { all: false }))
      .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && RE.test(r.sel));
    if (pre.length) bad(`[R5] 34 축복 — 주입 «전» 에 이미 ${pre.length}건 빨강: ${pre[0].sel} ${pre[0].ratio}`);
    else ok('[R5] 34 축복 — 주입 전 0건 (음성항)');

    await page.evaluate(() => {
      const st = document.createElement('style');
      st.textContent = '#blsC_atk .ic{transform:scaleX(.974) !important}'
        + '#blsC_hp .ic{font-size:153px !important;transform:scaleX(.858) !important}'
        + '#blsC_rate .ic{transform:scaleX(.875) !important}'
        + '.bls-c .tm>b.ck{transform:scaleX(.97) !important}'
        + '.bls-bn .ic{transform:translate(57.71px,7.62px) scale(.706,.748) !important}'
        + '.bls-bn .ch{transform:translate(21.55px,-12.54px) scale(.706,.748) !important}';
      document.head.appendChild(st);
    });
    await page.waitForTimeout(250);
    const hit = (await page.evaluate(COLLECT, { all: false }))
      .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && RE.test(r.sel));
    if (hit.length >= 7) ok(`[R5] 34 축복 — 옛 값을 심으면 ${hit.length}노드가 빨개진다 (자가 살아 있다)`);
    else bad(`[R5] 34 축복 — 심어도 ${hit.length}건뿐(≥7 이어야 한다): 이 자리는 감시 밖이다`);
    await ctx.close();
  }

  /* [R6] 397(2026-08-29) — 36 출석 패스 보상 젬.
     ⚑ 이 자리가 남아 있던 이유는 스코프에 없어서가 아니다 — `.ps-bx` 는 **2회차부터 SCOPE 에
     있었다.** `scan356.js` 의 SCREENS 가 «35 패스» 를 `['#menub','#psGo']` 까지만 열어
     **출석 탭으로 갈아타는 단계가 없었고**, `#psw.att …` 규칙은 그 탭에서만 붙으므로
     스캐너가 이 노드를 한 번도 «본 적이» 없었다. 즉 결손은 스코프가 아니라 **화면 목록**이었다.
     (그래서 397 은 SCREENS 를 먼저 채우고 전수 재스캔했다 — 자리 6 → 10 으로 «늘었다».)
     ⇒ 이 자는 그 함정을 그대로 재연한다: **탭까지 갈아탄 뒤** 옛 `scaleX(.76)` 을 심는다.
     ⚠ 진입 확인을 반드시 세운다 — `#psw.att` 가 안 붙은 채로 재면 0건 = 헛초록이고,
     그것이 397 이 살아남은 경로 자체다(LESSONS 356-⑬ · 397). */
  console.log('[R6] 되돌림 시험(397) — 36 출석 패스 보상 젬에 옛 scaleX(.76) 을 도로 심으면 빨개지는가');
  {
    const RE = /ps-bx/;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    for (const q of ['#menub', '#psGo', '#psBar [data-ptab="att"]']) {
      await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, q);
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(250);

    /* 진입 확인 — «출석 탭이 실제로 켜졌는가» 를 클래스로 묻는다. 이 항이 없으면
       스테이지 탭을 재고 초록을 주는 것이 정확히 397 의 구멍이다. */
    const att = await page.evaluate(() => {
      const w = document.querySelector('#psw');
      return { on: !!(w && w.classList.contains('att')), bx: document.querySelectorAll('#psw.att .ps-bx').length };
    });
    if (!att.on) bad('[R6] 36 출석 패스 — 진입 실패: #psw 에 .att 가 안 붙었다 (스테이지 탭을 재고 있다)');
    else ok('[R6] 36 출석 패스 — #psw.att 진입 확인 (헛초록 방지)');
    if (!att.bx) bad('[R6] 36 출석 패스 — `.ps-bx` 칸이 0개다 (보상 칸이 안 그려졌다)');
    else ok(`[R6] 36 출석 패스 — 보상 칸 ${att.bx}개 확인`);

    /* 음성항 — 수리 후에는 이 자리가 깨끗해야 한다 */
    const pre = (await page.evaluate(COLLECT, { all: false }))
      .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && RE.test(r.sel));
    if (pre.length) bad(`[R6] 36 출석 패스 — 주입 «전» 에 이미 ${pre.length}건 빨강: ${pre[0].sel} ${pre[0].ratio}`);
    else ok('[R6] 36 출석 패스 — 주입 전 0건 (음성항)');

    await page.evaluate(() => {
      const st = document.createElement('style');
      st.textContent = '#psw.att .ps-bx>i{font-size:96px !important;transform:scaleX(.76) !important}';
      document.head.appendChild(st);
    });
    await page.waitForTimeout(250);
    const hit = (await page.evaluate(COLLECT, { all: false }))
      .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && RE.test(r.sel));
    if (hit.length >= 4) ok(`[R6] 36 출석 패스 — 옛 값을 심으면 ${hit.length}노드가 빨개진다 (자가 살아 있다)`);
    else bad(`[R6] 36 출석 패스 — 심어도 ${hit.length}건뿐(≥4 이어야 한다): 이 자리는 감시 밖이다`);
    await ctx.close();
  }

  /* [S2] 7회차 배율 고정 — [S] 와 같은 이유다. [A] 는 «sx=sy» 만 보므로 `transform:none` 도 초록이고,
     그러면 «아이콘이 ref 상자에 담기는가» 라는 질문이 아무 자에게도 안 남는다(328~330 계열).
     ⇒ contain 으로 역산한 네 수를 여기에 못박는다. 값을 바꾸려면 `node tools/cal356r7.js` 로 다시 역산할 것.
     ⚠ 네 번째(`.sk-btn>i>.cic`)만 **일부러 비등방**이다 — 라벨의 scaleX(.866) 을 되돌리는 역보정이라
     이 노드의 «자기» 배율은 1.15473/1 이고 **누적**이 1.0 이다. 그래서 기대를 sx·sy 로 나눠 적는다. */
  console.log('[S2] 7회차 배율 고정 — contain 역산값(과 역보정 상수)이 제품에 그대로 있는가');
  {
    const WANT = [
      { q: '#trCards .tr-card:first-child > .ci',      sx: 0.81183, sy: 0.81183, open: ['.tab[data-t="grow"]'],
        why: '23 훈련 ⚔️ — 자연 186×186 · ref 152×151 ⇒ min = .81183' },
      { q: '#trCards .tr-card:first-child > .cb > s',  sx: 0.96364, sy: 0.96364, open: ['.tab[data-t="grow"]'],
        why: '23 훈련 코인 — 자연 55×55 · ref 53×55 ⇒ min = .96364' },
      /* ⚠ 33 재화 정보만 8회차에 **손잡이가 바뀌었다** — 배율이 아니라 «정수 상자» 다.
         소수 상자(103.68) + 소수 배율이 DSF 2·3 에서 잉크를 92×91 로 그렸기 때문이다.
         그래서 이 자리의 기대는 `transform:none` 이고, 물음은 [S3] 으로 옮겼다(«상자가 정수 98 인가»).
         여기 남겨 두는 이유는 **옛 배율이 되살아나는 것**을 잡기 위해서다. */
      { q: '#ciIcon',                                   sx: 1, sy: 1, open: ['[data-cur="dia"]'],
        why: '33 재화 정보 — 8회차에 배율을 걷고 정수 상자로 갔다(상자 자체는 [S3])', none: true },
      { q: '#bCos .sk-btn.sk-b2 > i > .cic',            sx: 1.15473, sy: 1,       open: ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]'],
        why: '50 코스튬 역보정 — .866 × 1.15473 = 1.00000' },
    ];
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    for (const w of WANT) {
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(800);
      for (const q of w.open) {
        await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, q);
        await page.waitForTimeout(550);
      }
      const g = await page.evaluate((q) => {
        const e = document.querySelector(q);
        if (!e) return null;
        const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(getComputedStyle(e).transform);
        return m ? [+m[1], +m[4]] : 'none';
      }, w.q);
      if (g === null) bad(`[S2] ${w.q} — 노드가 없다(선택자가 죽었거나 화면에 못 갔다)`);
      else if (w.none) {
        if (g === 'none' || (Math.abs(g[0] - 1) < 1e-6 && Math.abs(g[1] - 1) < 1e-6))
          ok(`[S2] ${w.q} — transform 없음 고정 (${w.why})`);
        else bad(`[S2] ${w.q} — transform ${g[0]}/${g[1]}: 8회차가 걷어낸 소수 배율이 되살아났다 (${w.why})`);
      }
      else if (g === 'none') bad(`[S2] ${w.q} — transform 이 통째로 없다: contain 배율이 사라졌다 (${w.why})`);
      else if (Math.abs(g[0] - w.sx) > 0.004 || Math.abs(g[1] - w.sy) > 0.004)
        bad(`[S2] ${w.q} — 배율 ${g[0]}/${g[1]}, 기대 ${w.sx}/${w.sy} (${w.why})`);
      else ok(`[S2] ${w.q} — ${w.sx}/${w.sy} 고정`);
      await page.close();
    }
    /* [S2-b] 역보정의 «짝» 을 묻는다 — 7회차 비평가 BC 가 축 밖으로 짚은 구멍이다.
       50 코스튬 아이콘의 1.15473 은 **라벨의 .866 과 서로를 모르는 채 묶여 있는** 상수다.
       위의 [S2] 는 아이콘 쪽 상수만 보므로, 라벨의 .866 을 누가 바꾸면 **상쇄가 깨져 아이콘이
       즉시 찌그러지는데 [S2] 는 초록**이다([A] 는 누적을 보지만 «왜 1.0 이어야 하는지» 는 안 묻는다).
       ⇒ 물어야 할 것은 상수 하나가 아니라 **곱이 1 인가** 다. */
    {
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(800);
      for (const q of ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]']) {
        await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, q);
        await page.waitForTimeout(550);
      }
      const g = await page.evaluate(() => {
        const im = document.querySelector('#bCos .sk-btn.sk-b2 > i > .cic');
        if (!im) return null;
        const sx = (q) => {
          const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(getComputedStyle(q).transform);
          return m ? [+m[1], +m[4]] : [1, 1];
        };
        const a = sx(im), b = sx(im.parentElement);
        return { prod: [a[0] * b[0], a[1] * b[1]], label: b, icon: a };
      });
      if (!g) bad('[S2-b] 50 코스튬 — 아이콘 노드가 없다(라벨이 MAX 라 아이콘이 안 그려졌을 수 있다)');
      else if (Math.abs(g.prod[0] / g.prod[1] - 1) > 0.002)
        bad(`[S2-b] 50 코스튬 — 라벨 ${g.label[0]} × 아이콘 ${g.icon[0]} = ${g.prod[0].toFixed(5)} (세로 ${g.prod[1]}): 상쇄가 깨졌다`);
      else ok(`[S2-b] 50 코스튬 — 라벨 ${g.label[0]} × 아이콘 ${g.icon[0]} = ${g.prod[0].toFixed(5)} ⇒ 누적 등방 (역보정의 짝이 살아 있다)`);
      await page.close();
    }
    await ctx.close();
  }

  /* [S3] 8회차 — **«찍힌 픽셀» 을 묻는 유일한 항이다.**
     [A]·[S2] 는 둘 다 «선언된 변환» 을 본다. 그런데 7회차 비평가 BD 가 찾아낸 것은 선언이 아니라
     **페인트 스냅**이었다 — `.cic{width:1.08em}` × `font-size:96` = 103.68px 라는 소수 상자에
     소수 배율이 얹히자 DSF 2·3 에서 잉크가 **92×91**(종횡 1.011)로 그려졌다.
     ⚠ **DSF 1 에서는 그 1px 이 반올림에 묻혀 92×92 로 보인다** — 7회차의 자도, 캡처도, 비평가 한 명도
     그래서 못 봤다. ⇒ 이 항은 반드시 **deviceScaleFactor 2** 로 재고, 되돌림(소수 상자 재주입)까지 한 벌이다.
     ⇒ 교훈: «종횡비 0» 을 선언으로만 물으면 래스터가 만드는 찌그러짐은 통째로 감시 밖이다. */
  console.log('[S3] 8회차 그려진 잉크 — 33 재화 정보 보석이 DSF 2 에서도 정사각인가');
  {
    const inkOf = async (page, sel) => {
      const r = await page.evaluate((s) => {
        const e = document.querySelector(s); if (!e) return null;
        const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height };
      }, sel);
      if (!r) return null;
      const PAD = 60;
      const clip = { x: Math.max(0, Math.floor(r.x - PAD)), y: Math.max(0, Math.floor(r.y - PAD)),
        width: Math.ceil(r.w + PAD * 2), height: Math.ceil(r.h + PAD * 2) };
      await page.waitForTimeout(180);
      const on = await page.screenshot({ clip });
      await page.evaluate((s) => { for (const e of document.querySelectorAll(s)) e.style.opacity = '0'; }, sel);
      await page.waitForTimeout(180);
      const off = await page.screenshot({ clip });
      await page.evaluate((s) => { for (const e of document.querySelectorAll(s)) e.style.opacity = ''; }, sel);
      await page.waitForTimeout(120);
      const d = await calcPage.evaluate(async ([a, b2]) => {
        const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
          const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
          return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height }; };
        const A = await load(a), B = await load(b2);
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
        for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) { const i = (y * A.W + x) * 4;
          const dd = Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
          if (dd > 12) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
        return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
      }, [on.toString('base64'), off.toString('base64')]);
      return d ? { w: d.w / 2, h: d.h / 2 } : null;
    };
    const calcPage = await browser.newPage();
    await calcPage.setContent('<body></body>');
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { const e = document.querySelector('[data-cur="dia"]'); if (e) e.click(); });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      for (const a of document.getAnimations()) { try { a.finish(); } catch (e) {} }
      for (let i = 1; i < 20000; i++) { try { clearInterval(i); clearTimeout(i); } catch (e) {} }
      window.requestAnimationFrame = () => 0;
    });
    const SEL = '#ciIcon>img.cic';
    const n = await page.evaluate((s) => document.querySelectorAll(s).length, SEL);
    if (!n) bad('[S3] 33 재화 정보 — 진입 실패: `#ciIcon>img.cic` 가 0개다');
    else {
      ok(`[S3] 33 재화 정보 — ${SEL} ${n}개 진입 확인 (헛초록 방지)`);
      /* 상자가 정수인가 — 이것이 8회차가 바꾼 손잡이 자체다 */
      const box = await page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.width, b.height]; }, SEL);
      if (Math.abs(box[0] - 98) > 0.01 || Math.abs(box[1] - 98) > 0.01)
        bad(`[S3] 33 재화 정보 — 상자 ${box[0]}×${box[1]}, 기대 98×98 정수 (소수 상자가 되살아났다)`);
      else ok('[S3] 33 재화 정보 — 상자 98×98 정수 고정');

      const a = await inkOf(page, SEL);
      const a2 = await inkOf(page, SEL);
      if (!a) bad('[S3] 33 재화 정보 — 잉크 차분이 0이다(요소가 안 그려졌다)');
      else {
        if (a.w !== a2.w || a.h !== a2.h) bad(`[S3] 33 재화 정보 — 재실행이 흔들린다 ${a.w}×${a.h} ↔ ${a2.w}×${a2.h}`);
        else ok(`[S3] 33 재화 정보 — 재실행 일치 ${a.w}×${a.h}`);
        const dev = Math.abs(a.w / a.h - 1) * 100;
        if (dev > 0.5) bad(`[S3] 33 재화 정보 — DSF2 잉크 ${a.w}×${a.h} 종횡 편차 ${dev.toFixed(2)}% (0.5% 이내여야 한다)`);
        else ok(`[S3] 33 재화 정보 — DSF2 잉크 ${a.w}×${a.h} · 편차 ${dev.toFixed(2)}%`);
        if (Math.abs(a.w - 92) > 1) bad(`[S3] 33 재화 정보 — 잉크 폭 ${a.w}, ref 92 에서 ${Math.abs(a.w - 92)}px 벗어났다`);
        else ok(`[S3] 33 재화 정보 — 잉크 폭 ${a.w} = ref 92 (±1)`);
      }
      /* 되돌림 — 소수 상자를 도로 심으면 그 1px 이 돌아오는가. 이 항이 없으면 위 셋은
         «지금 우연히 초록» 일 뿐이고, 무엇이 그것을 지키는지 아무도 안 묻는다. */
      await page.addStyleTag({ content: '.ci-ic>i>.cic{width:1.08em !important;height:1.08em !important}.ci-ic>i{transform:scale(.93878) !important}' });
      await page.waitForTimeout(250);
      const r = await inkOf(page, SEL);
      if (r && Math.abs(r.w / r.h - 1) * 100 > 0.5) ok(`[S3] 되돌림 — 소수 상자(103.68)+소수 배율을 심으면 ${r.w}×${r.h} 로 빨개진다 (자가 살아 있다)`);
      else bad(`[S3] 되돌림 — 심어도 ${r ? r.w + '×' + r.h : '차분 0'} 로 정사각이다: 이 항은 감시 밖이다`);
    }
    await ctx.close();
    await calcPage.close();
  }

  /* [R7] 되돌림 시험(7회차 스코프) — 세 화면 전부 탭·팝업 뒤라 [R]~[R6] 어느 자에도 안 걸린다.
     세 자리의 «옛 값이 어디에 살았는가» 가 서로 달라서 갈래를 셋으로 나눈다(356-⑥):
       ⓐ 23 훈련 — 규칙 자체의 비균등 `scale(.829,.893)` · `scaleX(.968)`
       ⓑ 33 재화 정보 — 규칙 자체의 `scaleX(.87)`
       ⓒ 50 코스튬 — **역보정을 떼는 것**이 되돌림이다(라벨의 .866 이 그대로 아이콘에 내려온다).
          ⚠ ⓒ 를 «옛 값 주입» 으로 적으면 안 된다 — 옛 상태는 «아무 규칙도 없는» 상태다.
     ⚠ 음성항(주입 «전» 0건)과 진입 확인을 셋 다 세운다 — [R4]·[R5]·[R6] 과 같은 이유. */
  console.log('[R7] 되돌림 시험(7회차 스코프) — 23 훈련 · 33 재화 정보 · 50 코스튬');
  {
    const CASES = [
      { lab: '23 훈련', open: ['.tab[data-t="grow"]'], re: /tr-card/, want: 3,
        seen: () => document.querySelectorAll('#trCards .tr-card').length,
        seenName: '.tr-card', min: 1,
        css: '.tr-card>.ci{transform:scale(.829,.893) !important}'
           + '.tr-card>.cb>s{transform:scaleX(.968) !important}' },
      { lab: '33 재화 정보', open: ['[data-cur="dia"]'], re: /ciIcon/, want: 2,
        seen: () => document.querySelectorAll('#ciw #ciIcon>img.cic').length,
        seenName: '#ciIcon>img.cic', min: 1,
        css: '.ci-ic>i{transform:scaleX(.87) !important}' },
      { lab: '50 코스튬', open: ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]'], re: /i\.ol3>img\.cic/, want: 1,
        seen: () => document.querySelectorAll('#bCos .sk-btn>i>.cic').length,
        seenName: '#bCos .sk-btn>i>.cic', min: 1,
        css: ':is(#bSk,#bPet,#bCos) .sk-btn>i>.cic{transform:none !important}' },
    ];
    for (const c of CASES) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(800);
      for (const q of c.open) {
        await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, q);
        await page.waitForTimeout(550);
      }
      /* 진입 확인 — 조용히 실패한 클릭은 «다른 화면» 을 재고 0건으로 초록을 준다(LESSONS 356-⑬) */
      const n = await page.evaluate(c.seen);
      if (n < c.min) { bad(`[R7] ${c.lab} — 진입 실패: ${c.seenName} 가 ${n}개다`); await ctx.close(); continue; }
      ok(`[R7] ${c.lab} — ${c.seenName} ${n}개 진입 확인 (헛초록 방지)`);

      const pre = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (pre.length) bad(`[R7] ${c.lab} — 주입 «전» 에 이미 ${pre.length}건 빨강: ${pre[0].sel} ${pre[0].ratio}`);
      else ok(`[R7] ${c.lab} — 주입 전 0건 (음성항)`);

      await page.evaluate((css) => {
        const st = document.createElement('style');
        st.textContent = css;
        document.head.appendChild(st);
      }, c.css);
      await page.waitForTimeout(250);
      const hit = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (hit.length >= c.want) ok(`[R7] ${c.lab} — 되돌리면 ${hit.length}노드가 빨개진다 (자가 살아 있다)`);
      else bad(`[R7] ${c.lab} — 되돌려도 ${hit.length}건뿐(≥${c.want} 이어야 한다): 이 자리는 감시 밖이다`);
      await ctx.close();
    }
  }

  /* [C] 397 — SCREENS 자체의 «무음 실패» 감시.
     scan356 의 단계는 `querySelector(q); if (el) el.click()` 이라 셀렉터가 안 맞아도
     예외가 안 난다 = 화면 이름만 있고 한 번도 못 간 줄이 조용히 생긴다(397 이 그 사고다).
     ⇒ 모든 단계 셀렉터가 실제로 resolve 되는지 여기서 못박는다. 상세 재현은 tools/probe397.js. */
  console.log('[C] SCREENS 무음 실패 — 모든 단계 셀렉터가 DOM 에 실재하는가');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    let dead = 0;
    for (const [label, steps] of SCREENS) {
      if (!steps.length) continue;
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        const found = await page.evaluate((q) => {
          const el = document.querySelector(q);
          if (el) el.click();
          return !!el;
        }, s);
        if (!found) { bad(`[C] «${label}» 단계가 무음 실패: '${s}' 가 DOM 에 없다`); dead++; }
        await page.waitForTimeout(420);
      }
    }
    if (!dead) ok(`[C] SCREENS ${SCREENS.length}화면의 모든 단계 셀렉터가 resolve 된다`);
    await ctx.close();
  }

  await browser.close();
  const total = oks.length + fails.length;
  console.log(`\nVERIFY356 ${oks.length}/${total} ` + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
