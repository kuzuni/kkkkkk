#!/usr/bin/env node
/* 작업 415 회귀 게이트 — 19 프로필 팝업 «패널 높이 축»
 *   실행: node tools/verify415.js   → 마지막 줄이 `VERIFY415 n/n PASS` 여야 한다.
 *
 * 등재문: «패널 1396 이 1600 프레임의 띠(1458)의 95.7% 를 먹어 위·아래 여백이 각 31px 을
 * **구조적으로** 못 넘는다». `probe415` 가 그 값을 그대로 재현했고 **등재문이 안 적은 것 둘**을 냈다:
 *   ⓐ 역전은 «내부 상단 패딩 37»(CE) 만이 아니다 — **내부 하단 패딩 40 이 더 크다.**
 *      외곽 31 이 팝업 자신의 두 패딩을 **둘 다** 밑돌고 있었다.
 *   ⓑ 아래 여백 31 은 «1600 만» 이 아니다 — 상한 항(`100% − 1427`)이 431 을 이기는
 *      **1600..1858 구간 전체**가 31 이었다(1841 도 31 · 1875 에서 48). 9:13.3 전용이 아니었다.
 *
 * 처방(연속형 — `.shortf` 갈래를 안 만든다):
 *   · `--pfsh` = clamp(0, 1634 − frameH, 34) — 프레임이 «48/48 문턱» 1634 아래로 내려간 만큼.
 *     1634 = 142(HUD 잉크) + 48 + 1396(패널) + 48 이라 **상수가 아니라 역산값**이다.
 *   · 그만큼 **스크롤 그릇 `.pf-grid` 하나만** 짧아지고(403·404 처방),
 *     그 아래 넷(`.pf-msn`·`.pf-ftr`·`.pf-btn`·`.pf-tgl`)이 **같은 양만큼 같이** 올라간다
 *     ⇒ 서로의 간격과 내부 하단 패딩 40 은 Δ0. 위쪽(gid·por·ttl·tab)은 한 픽셀도 안 움직인다.
 *   · 상한 1427 → **1444**(= 1396 + 48) — 1634~1875 구간의 아래 여백도 48 로 든다.
 *
 * 본다:
 *   §1 기하 — 1600 에서 48/48 · 얼려 둔 세 프레임(1920·2280·2600) Δ0px
 *   §2 유도 — 48 도 34 도 상수가 아니다(문턱·흡수분·여백을 관계식으로 되묻는다)
 *   §3 역전 해소 — 외곽 여백 > 팝업 **내부** 패딩(둘 다 자로 읽는다 — 상수로 안 적는다)
 *   §4 연속 — 임계(1634·1875) 앞뒤에서 점프 0. `.shortf` 갈래였다면 여기서 34px 이 튄다(LESSONS 391-②)
 *   §5 흡수 — 그릇 하나만 짧아진다 · 아래 넷의 상호 간격 Δ0 · 잘림 0
 *   §6 조작 — 1600 에서 버튼·토글이 hit-test 최상단이고 토글 클릭이 실제로 동작한다(241 §4 를 새 좌표에서)
 *   §R 되돌림 4종 — ① 391 선언 사본에서 역전(31 < 37·40)이 되살아난다
 *      ② 흡수만 뺀 사본은 되밀기만 남아 **중심이 흡수분의 절반(50px)만큼 밀린다**(= «반쪽 수리» 금지)
 *      ③ 자식만 올리고 그릇을 안 줄인 사본에서는 그리드가 해금 미션 띠를 **밟는다**
 *         (= «흡수 그릇» 이 이 처방의 본체라는 것)
 *      ④ 앵커만 옛 415 상한형으로 되돌린 사본에서 **중심 오프셋이 −11 → +71 로 튄다**(830 신설)
 *      (살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다 — LESSONS 191)
 *
 * ⚑ **754 이관(2026-09-02, 작업 830)** — 이 자의 «자리» 축이 다른 규칙으로 넘어갔다.
 *   415 는 패널을 **띠(HUD 잉크..프레임 끝) 중앙**에 놓아 위·아래 여백을 81 로 **같게** 만들었는데,
 *   754(주인 지시 «중앙 앵커·중앙 피벗 기본»)가 기준을 **프레임 중앙**으로 옮겼다:
 *     옛 `top:clamp(223px, 431px, calc(var(--frameh, 2280px) - 1477px))`
 *     새 `top:calc(50% - 709px + var(--pfsh) / 2)`   (709 = 반높이 698 + 레퍼런스 오프셋 11)
 *   ⇒ **제품이 옳고 이 자가 낡았다.** «위 = 아래 = 81» 은 옛 규칙의 부산물이라 더는 참이 아니고
 *   (1600 에서 −1 ↔ 163), 그 자리를 **«중심이 프레임 중심을 −11px 로 따라간다»** 로 갈아 끼웠다(333 처방).
 *   흡수분·패널 높이·자식 local y·연속성(§4)·역전 해소(§3) 는 754 가 안 건드렸으므로 **그대로 살아 있다.**
 *   ⚠ 1600 의 위 여백 −1(= HUD 잉크를 1px 밟는다)은 **811 에 등재된 별개 축**이라 여기서는
 *   값을 못박지 않고 «더 나빠지면 빨개지는» 래칫으로만 잡는다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');
const INK = 142;      /* HUD 잉크 끝 = `.pedge` 하변 */
const PH = 1396;      /* 기준 프레임 패널 높이 — 241 이 얼려 둔 값 */
const GAP = 81;       /* 목표 여백 — «카드가 스크롤 뒤로 숨지 않는 최대치» (§2-b 가 그 뜻을 되묻는다) */
const KNEE = INK + GAP + PH + GAP;   /* = 1700. 흡수가 시작되는 문턱 — 상수가 아니라 이 합이다 */
const SHMAX = KNEE - 1600;           /* = 100. 흡수분 상한 — 문턱과 지원 최저 프레임의 차 */

/* 754 이관(2026-09-02, 작업 830) — 되돌릴 **원본**이 415 상한 clamp 에서 754 중앙 앵커로 바뀌었다.
   치환 원본만 새 글자로 옮기고 **되돌린 뒤에 묻는 것(391 상태의 여백 31 · 역전)은 그대로**다. */
const ANCHOR = 'top:calc(50% - 709px + var(--pfsh) / 2)';
const REV = [   /* 현행 선언 → 391 시절 선언. 일곱 자리를 **전부** 되돌려야 391 상태가 재현된다 */
  [ANCHOR, 'top:clamp(104px, 431px, calc(100% - 1427px))'],
  ['height:calc(1396px - var(--pfsh))', 'height:1396px'],
  ['height:calc(544px - var(--pfsh))', 'height:544px'],
  ['top:calc(1026px - var(--pfsh))', 'top:1026px'],
  ['top:calc(1089px - var(--pfsh))', 'top:1089px'],
  ['top:calc(1105px - var(--pfsh))', 'top:1105px'],
  ['top:calc(1261px - var(--pfsh))', 'top:1261px'],
];
const revert = (src, list) => list.reduce((s, [a, b]) => {
  if (!s.includes(a)) { console.error('갈아 끼울 자리를 못 찾았다: ' + a); process.exit(2); }
  return s.replace(a, b);
}, src);

const MEAS = `(function(){
  openProfile();
  void document.body.offsetHeight;
  const A = document.getElementById('app').getBoundingClientRect();
  const P = document.querySelector('#pfw .pf').getBoundingClientRect();
  const ink = document.querySelector('.pedge').getBoundingClientRect();
  const g = document.querySelector('#pfw .pf-grid');
  const q = (s) => { const e = document.querySelector('#pfw ' + s); if(!e) return null;
    const r = e.getBoundingClientRect();
    return { ly: Math.round((r.top - P.top) * 10) / 10, h: Math.round(r.height * 10) / 10,
             top: Math.round((r.top - A.top) * 10) / 10,
             out: Math.round((r.bottom - A.bottom) * 10) / 10 }; };
  const gid = q('.pf-gid'), tgl = q('.pf-tgl'), grid = q('.pf-grid'), msn = q('.pf-msn');
  return {
    frameH: Math.round(A.height),
    ink: Math.round((ink.bottom - A.top) * 10) / 10,
    top: Math.round((P.top - A.top) * 10) / 10,
    h:   Math.round(P.height * 10) / 10,
    topGap: Math.round((P.top - ink.bottom) * 10) / 10,
    botGap: Math.round((A.bottom - P.bottom) * 10) / 10,
    padTop: gid.ly,                              /* 팝업 내부 상단 패딩 = 첫 내용의 local y */
    padBot: Math.round((P.height - (tgl.ly + tgl.h)) * 10) / 10,
    gridBotToMsn: Math.round((msn.ly - (grid.ly + grid.h)) * 10) / 10,
    gid, grid, msn, tgl, btn: q('.pf-btn'), ftr: q('.pf-ftr'), tab: q('.pf-tab'), por: q('.pf-por'),
    gScroll: g.scrollHeight, gClient: g.clientHeight,
  };
})`;

async function read(page, h) {
  await page.setViewportSize({ width: 1080, height: h });
  await page.waitForTimeout(360);
  return page.evaluate(MEAS + '()');
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + FILE); await p.waitForTimeout(900);

  const HS = [1600, 1699, 1700, 1701, 1841, 1875, 1907, 1908, 1909, 1920, 2280, 2600];
  const M = {};
  for (const h of HS) M[h] = await read(p, h);

  /* ── §1 기하 ── */
  console.log('§1 기하 — 1600 에서 48/48 · 얼려 둔 세 프레임 Δ0px');
  ok(SRC.includes('--pfsh:clamp(0px, calc(1700px - var(--frameh, 2280px)), 100px)'),
    'index.html 에 415 흡수분 --pfsh 선언이 있다 (연속형 — .shortf 갈래가 아니다)');
  /* ⚑ 754 이관(2026-09-02, 작업 830) — **415 의 «자리» 축이 통째로 다른 규칙으로 넘어갔다.**
     415 는 패널을 **띠(HUD 잉크 142 .. 프레임 끝) 중앙**에 놓아 위·아래 여백을 81 로 같게 만들었고,
     754(주인 지시 «중앙 앵커·중앙 피벗 기본»)가 기준을 **프레임 중앙**으로 옮겼다:
         옛 `top:clamp(223px, 431px, calc(var(--frameh, 2280px) - 1477px))`
         새 `top:calc(50% - 709px + var(--pfsh) / 2)`      (709 = 반높이 698 + 레퍼런스 오프셋 11)
     ⇒ «위 여백 = 아래 여백 = 81» 은 **옛 규칙의 부산물**이라 더는 참이 아니다(1600 에서 −1 ↔ 163).
     ⚠ 그 항들을 «81 → 실측값» 으로 갈아 끼우기만 하면 **왜 그 값인가를 아무도 안 묻는 자**가 된다
        (391 이 남기고 415 가 이어받은 규칙 — 값 항 옆에는 유도 항을 둔다).
     ⇒ 333 처방대로 자리를 비우지 말고 축을 **«중심이 프레임 중심을 같은 오프셋으로 따라간다»** 로 돌린다.
        옛 축의 실제 성질이 그 반대였다는 것이 754 의 실측이다 — 중심 오프셋이
        1600 +71 · 1841 +141.5 · 1920 +169 · 2280 −11 · 2600 −171 로 **340px 을 스윙**했고,
        기준 프레임 2280 에서만 우연히 −11 이라 «중앙처럼» 보였다. §R ④ 가 그 스윙을 되돌림으로 못박는다.
     ⚑ **살아남는 것**: 흡수분(`--pfsh`) 축 · 패널 높이 1296/1396 · 자식들 local y · 연속성(§4) ·
        역전 해소(§3) 는 754 가 안 건드렸다 — 그대로 둔다. 갈아 끼우는 것은 **«자리» 항뿐**이다. */
  ok(SRC.includes('top:calc(50% - 709px + var(--pfsh) / 2)'),
    'index.html 에 754 중앙 앵커가 있다 (709 = 반높이 698 + 레퍼런스 오프셋 11)');
  eq('[1600] HUD 잉크 끝 142', M[1600].ink, INK);
  /* 중심 오프셋은 손으로 −11 이라 적지 않고 **기준 프레임(2280 · 레퍼런스 Δ0px)에서 읽어 온다** —
     재료가 제품 안에 있으므로 «왜 −11 인가» 를 이 자가 스스로 답한다. */
  const cen = (m, h) => Math.round((m.top + m.h / 2 - h / 2) * 10) / 10;
  eq('[2280] .pf top 431 — 레퍼런스 Δ0px (754 가 자리를 안 옮겼다)', M[2280].top, 431);
  const CEN = cen(M[2280], 2280);
  eq('기준 프레임 중심 오프셋 −11 (= top 431 + 반높이 698 − 1140)', CEN, -11);
  eq('[1600] .pf top = 프레임중심 800 − 709 + 흡수분/2 50', M[1600].top, 800 - 709 + SHMAX / 2);
  eq('[1600] 중심 오프셋이 기준 프레임과 같다 (흡수분 100 이 들어와도)', cen(M[1600], 1600), CEN);
  /* ⚠ 위 여백 −1(= HUD 잉크를 1px 밟는다)은 **811 에 등재된 별개 축**이다. 여기서는 값을 못박지 않고
     «더 나빠지면 빨개지는» 래칫으로만 잡는다 — 0 으로 못박으면 이 자가 811 을 대신 닫아 버린다. */
  ok(M[1600].topGap >= -1,
    `[1600] 래칫 — HUD 잉크와 겹침이 1px 이내 (위 여백 ${M[1600].topGap} · 이 축은 811 몫)`);
  ok(M[1600].botGap > 0 && M[1600].top + M[1600].h <= 1600,
    `[1600] 패널이 프레임 안 (아래 여백 ${M[1600].botGap})`);
  eq('[1600] 패널 높이 1296 (= 1396 − 흡수분 100)', M[1600].h, 1396 - SHMAX);
  for (const h of [1920, 2280, 2600]) {
    eq(`[${h}] 중심 오프셋 불변 (프레임을 따라간다)`, cen(M[h], h), CEN);
    eq(`[${h}] 패널 높이 1396 불변 (흡수분 0)`, M[h].h, PH);
    eq(`[${h}] .pf-grid 높이 544 불변`, M[h].grid.h, 544);
    for (const k of ['msn', 'ftr', 'btn', 'tgl'])
      eq(`[${h}] .pf-${k} 패널 local y 불변`, M[h][k].ly, { msn: 1026, ftr: 1089, btn: 1105, tgl: 1261 }[k]);
  }
  /* 415 ⓑ — «1600 만» 이 아니었다: 옛 상한 항이 이기는 **구간 전체**의 성질이었다.
     754 이관 — 묻는 것은 이제 «그 구간이 전부 81» 이 아니라 «그 구간에 계단이 없다» 다.
     옛 축이 바로 이 구간에서 스윙했으므로(1600 +71 → 1920 +169) 표본 자리는 그대로 값어치가 있다. */
  for (const h of [1600, 1700, 1841, 1875, 1907])
    eq(`[${h}] 중심 오프셋 불변 (구간 전체 — 옛 축은 여기서 스윙했다)`, cen(M[h], h), CEN);

  /* ── §2 유도 — 48 도 34 도 상수가 아니다 ── */
  console.log('§2 유도 — 문턱 1700 = 142 + 81 + 1396 + 81 · 흡수분 = 문턱 − 프레임 · 여백 = (띠 − 패널) ÷ 2');
  eq('문턱 = HUD 잉크 + 여백 + 패널 + 여백', KNEE, 1700);
  eq('[1700] 문턱에서 흡수분이 정확히 0 (패널이 온전한 1396)', M[1700].h, PH);
  eq('[1600] 흡수분 = 문턱 − 프레임', PH - M[1600].h, KNEE - 1600);
  ok(PH - M[1600].h === SHMAX, `흡수분 상한 ${SHMAX} = 문턱 − 지원 최저 프레임 1600 (${PH - M[1600].h})`);
  /* 754 이관 — 유도식의 **기준이 띠에서 프레임으로** 옮겨졌다.
     옛 유도: 여백 = (띠 − 패널) ÷ 2      (띠 = HUD 잉크 142 .. 프레임 끝)
     새 유도: top  = 프레임중심 − 709 + 흡수분 ÷ 2   (709 = 반높이 698 + 레퍼런스 오프셋 11)
     ⚑ 뒤 항(`흡수분 ÷ 2`)이 **이 유도의 본체**다 — 짧은 프레임에서 상자가 줄어든 만큼을 되밀어
     중심을 그대로 두는 일을 그 절반 항이 한다. 항이 사라지면 1600 의 중심이 50px 밀려 곧바로 빨개진다. */
  for (const h of [1600, 1699, 1700]) {
    const sh = Math.round((PH - M[h].h) * 10) / 10;         /* 그 프레임의 흡수분 — 상수로 안 적고 잰다 */
    eq(`[${h}] 유도 — top = 중심 ${h / 2} − 709 + 흡수분 ${sh}÷2`, M[h].top, h / 2 - 709 + sh / 2);
  }
  ok(M[1841].topGap > M[1600].topGap && M[1841].botGap > M[1600].botGap
     && Math.abs((M[1841].topGap - M[1600].topGap) - (M[1841].botGap - M[1600].botGap)) <= 1,
    `[1841] 중앙 앵커형 — 프레임이 커지면 위·아래가 **같은 양**만큼 벌어진다 ` +
    `(위 ${M[1600].topGap}→${M[1841].topGap} · 아래 ${M[1600].botGap}→${M[1841].botGap} · ` +
    `옛 «여유»형은 위쪽만 커졌다)`);

  /* §2-b 유도 — 81 의 «최대» 근거: 이보다 더 벌리면 카드가 스크롤 뒤로 숨는다.
     내용 높이는 상수로 안 적고 **상자를 눌러 scrollHeight 로 물어본다**(368 처방 — 제품에게 묻는다). */
  console.log('§2-b 유도 — 81 은 «카드가 스크롤 뒤로 안 숨는 최대 여백» 이다');
  const need = await p.evaluate(() => { const g = document.querySelector('#pfw .pf-grid');
    const old = g.style.height; g.style.height = '100px'; void g.offsetHeight;
    const n = g.scrollHeight; g.style.height = old; void g.offsetHeight; return n; });
  await p.setViewportSize({ width: 1080, height: 1600 }); await p.waitForTimeout(360);
  const m16 = await p.evaluate(MEAS + '()');
  ok(m16.gClient >= need, `[1600] 카드 리스트가 스크롤 없이 다 보인다 (그릇 ${m16.gClient} ≥ 내용 ${need})`);
  ok(m16.gClient - need <= 8, `[1600] 그 여유가 ${m16.gClient - need}px 뿐 — 여백을 더 벌리면 카드가 숨는다 (= 81 이 최대)`);
  ok(M[2280].grid.h - need > 8, `[2280] 기준 프레임에는 아직 여유가 ${M[2280].grid.h - need}px 남아 있다 (얼려 둔 값이라 안 건드렸다)`);

  /* ── §3 역전 해소 — 내부 패딩을 «자로» 읽는다 ── */
  console.log('§3 역전 — 외곽 여백이 팝업 내부 패딩(상·하)보다 넓다');
  eq('[1600] 내부 상단 패딩 = 첫 내용(.pf-gid) local y', M[1600].padTop, 37);
  eq('[1600] 내부 하단 패딩 = 패널 − 토글 하변', M[1600].padBot, 40);
  ok(M[1600].botGap > M[1600].padTop, `[1600] 외곽 ${M[1600].botGap} > 내부 상단 ${M[1600].padTop} (CE 가 지적한 6px 역전이 +${M[1600].botGap - M[1600].padTop} 로 뒤집혔다)`);
  ok(M[1600].botGap > M[1600].padBot, `[1600] 외곽 ${M[1600].botGap} > 내부 하단 ${M[1600].padBot} (등재문이 안 적은 9px 역전이 +${M[1600].botGap - M[1600].padBot} 로 뒤집혔다)`);
  ok(M[1600].botGap >= 40, `[1600] CF 의 «라이브 HUD 잉크 대비 최소선 40» 충족 (${M[1600].botGap})`);
  /* 2회차 — CT·CU 가 독립으로 같은 축을 짚었다: «세로 공기가 좌우 거터(92)의 0.52배로 역전».
     좌우 거터는 두 프레임 픽셀 동일(92/92)이므로 상수로 안 적고 패널 상자에서 되묻는다. */
  const gutter = Math.round((1080 - 896) / 2);
  ok(M[1600].botGap >= gutter * 0.85,
    `[1600] 세로 공기 ${M[1600].botGap} 이 좌우 거터 ${gutter} 의 ${(M[1600].botGap / gutter).toFixed(2)}배 (1회차 48 = 0.52배가 CU ③=7 의 근거였다)`);
  for (const h of [1600, 2280]) eq(`[${h}] 내부 하단 패딩 40 은 프레임과 무관하게 같다`, M[h].padBot, 40);

  /* ── §4 연속 — 임계에서 점프 0 ── */
  console.log('§4 연속 — 1700·1908 앞뒤로 튀지 않는다 (.shortf 갈래였다면 100px 이 튄다)');
  for (const [a, b] of [[1699, 1700], [1700, 1701], [1907, 1908], [1908, 1909]]) {
    ok(Math.abs(M[b].h - M[a].h) <= 1.5, `[${a}→${b}] 패널 높이 점프 ≤ 1.5px (${M[a].h} → ${M[b].h})`);
    ok(Math.abs(M[b].top - M[a].top) <= 1.5, `[${a}→${b}] 패널 top 점프 ≤ 1.5px (${M[a].top} → ${M[b].top})`);
    ok(Math.abs(M[b].tgl.ly - M[a].tgl.ly) <= 1.5, `[${a}→${b}] 토글 local y 점프 ≤ 1.5px (${M[a].tgl.ly} → ${M[b].tgl.ly})`);
  }
  ok(!/#app\.shortf[^{]*\.pf\b/.test(SRC), '415 는 `.shortf` 갈래를 안 만들었다 (연속형)');

  /* ── §5 흡수 — 그릇 하나 · 상호 간격 Δ0 · 잘림 0 ── */
  console.log('§5 흡수 — .pf-grid 하나만 짧아지고 아래 넷은 같이 올라간다');
  eq('[1600] .pf-grid 높이 = 544 − 흡수분', M[1600].grid.h, 544 - (PH - M[1600].h));
  eq('[1600] .pf-grid top 470 불변 (위쪽 앵커는 안 움직인다)', M[1600].grid.ly, 470);
  for (const k of ['tab', 'por', 'gid'])
    eq(`[1600] .pf-${k} local y 불변 (위쪽 앵커)`, M[1600][k].ly, M[2280][k].ly);
  for (const k of ['msn', 'ftr', 'btn', 'tgl'])
    eq(`[1600] .pf-${k} local y = 2280 값 − 흡수분`, M[1600][k].ly, M[2280][k].ly - (PH - M[1600].h));
  for (const h of [1600, 2280]) {
    eq(`[${h}] 그리드 하변 → 해금 미션 띠 간격 12`, M[h].gridBotToMsn, 12);
    eq(`[${h}] msn → btn 간격`, M[h].btn.ly - M[h].msn.ly, 79);
    eq(`[${h}] btn → tgl 간격`, M[h].tgl.ly - M[h].btn.ly, 156);
  }
  ok(M[1600].gridBotToMsn > 0, `[1600] 그리드가 해금 미션 띠를 안 밟는다 (${M[1600].gridBotToMsn}px 이격)`);
  ok(M[1600].gScroll <= M[1600].gClient + 0.5,
    `[1600] 짧아진 그릇에 내용이 그대로 들어간다 (scroll ${M[1600].gScroll} ≤ client ${M[1600].gClient})`);
  for (const h of HS) {
    ok(M[h].tgl.out <= 1 && M[h].tgl.top >= 0, `[${h}] 하단 토글 프레임 안 (밖 ${M[h].tgl.out})`);
    ok(M[h].btn.out <= 1 && M[h].btn.top >= 0, `[${h}] «장착 중» 버튼 프레임 안 (밖 ${M[h].btn.out})`);
  }
  ok(errs.length === 0, `콘솔·런타임 에러 0 (${errs.length})`);

  /* ── §6 조작 — 새 좌표에서도 실제로 눌린다 ── */
  console.log('§6 조작 — 1600 에서 버튼·토글이 hit-test 최상단이고 토글이 동작한다');
  await p.setViewportSize({ width: 1080, height: 1600 }); await p.waitForTimeout(360);
  const hit = await p.evaluate(() => {
    openProfile(); void document.body.offsetHeight;
    const at = (sel) => { const r = document.querySelector(sel).getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!(e && (e.matches(sel) || e.closest(sel))); };
    return { btn: at('#pfw .pf-btn'), lb: at('#pfw .pf-tgl>.lb') };
  });
  ok(hit.btn, '[1600] «장착 중» 버튼이 실제 클릭 지점에서 잡힌다');
  ok(hit.lb, '[1600] 하단 토글 라벨이 실제 클릭 지점에서 잡힌다');
  const sw = await p.evaluate(async () => {
    const r = document.querySelector('#pfw .pf-tgl>.lb').getBoundingClientRect();
    document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click();
    await new Promise(z => setTimeout(z, 250));
    return { spec: document.getElementById('specw').classList.contains('on'),
             prof: document.getElementById('pfw').classList.contains('on') };
  });
  ok(sw.spec && !sw.prof, `[1600] 토글 클릭 → 20 스펙 팝업 전환 (spec ${sw.spec} · prof ${sw.prof})`);

  /* ── §R 되돌림 3종 ── */
  console.log('§R 되돌림 — 391 선언 · 흡수만 제거 · 그릇만 안 줄임 · 앵커만 옛 축(830)');
  /* 1600 에서의 중심 오프셋 — §1 이 쓰는 것과 같은 산수(음성 사본은 1600 에서만 잰다) */
  const cen16 = (m) => Math.round((m.top + m.h / 2 - 800) * 10) / 10;
  const cases = [
    { name: '391 선언(여유 31 · 흡수 없음)', src: revert(SRC, REV),
      chk: (m) => [
        [m.botGap === 31, `아래 여백이 31 로 돌아온다 (${m.botGap})`],
        [m.botGap < m.padTop && m.botGap < m.padBot,
          `역전이 되살아난다 — 외곽 ${m.botGap} < 내부 상 ${m.padTop} · 하 ${m.padBot}`],
      ] },
    /* 754 이관(830) — 이 항의 «밖으로 19px» 은 **옛 상단 앵커에서만** 나오는 값이었다(top 223 + 1396 = 1619).
       중앙 앵커에서는 흡수를 빼도 프레임 밖으로는 안 나간다(top 141 + 1396 = 1537).
       ⚠ 그렇다고 이 자리를 비우면 «흡수 그릇 여섯이 통째로 사라져도 초록» 이 된다 —
       묻는 것을 **앵커의 되밀기 항과 그릇 여섯이 짝인가**로 돌린다: 그릇을 안 줄이면 되밀기(`흡수분/2`)만
       남아 중심이 정확히 그 절반(50px)만큼 밀린다(−11 → +39). «반쪽 수리 금지» 의 새 얼굴이다. */
    { name: '흡수만 제거(앵커는 754 그대로)', src: revert(SRC, REV.slice(1)),
      chk: (m) => [
        [cen16(m) === 39,
          `되밀기만 남아 중심이 흡수분의 절반(50px)만큼 밀린다 — −11 → +${cen16(m)}`],
        [m.h === PH, `그릇이 안 줄어든 채다 (${m.h}) — 짝이 깨진 자리가 여기다`],
      ] },
    { name: '그릇만 안 줄임(자식만 올림)', src: SRC.replace('height:calc(544px - var(--pfsh))', 'height:544px'),
      chk: (m) => [
        [m.gridBotToMsn < 0, `그리드가 해금 미션 띠를 ${-m.gridBotToMsn}px 밟는다 — «흡수 그릇» 이 처방의 본체다`],
      ] },
    /* ④ 830 신설 — §1·§2 의 새 축(중심 오프셋)이 **무르게 푼 초록이 아님**을 못박는다.
       앵커만 415 상한형으로 되돌리면(흡수 그릇 여섯은 그대로 둔다) 1600 의 중심이 −11 → **+71** 로
       82px 튄다 = 754 가 실측한 340px 스윙의 이 프레임 몫이다. 이 항이 없으면
       «앵커가 통째로 옛 축으로 돌아가도 초록» 인 자가 된다(334 교훈). */
    { name: '앵커만 415 상한형으로 되돌림(830)',
      src: SRC.replace(ANCHOR, 'top:clamp(223px, 431px, calc(var(--frameh, 2280px) - 1477px))'),
      chk: (m) => [
        [cen16(m) === 71,
          `중심 오프셋이 −11 → +71 로 돌아온다 (${cen16(m)}) — 754 표의 1600 칸 그대로`],
        [m.top === 223, `옛 축의 top 223 이 되살아난다 (${m.top})`],
      ] },
  ];
  for (const c of cases) {
    ok(c.src !== SRC, `사본을 만들었다 — ${c.name}`);
    const f = path.join(ROOT, `.v415-neg-${process.pid}.html`);
    fs.writeFileSync(f, c.src);
    try {
      const nc = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
      const np = await nc.newPage();
      await np.goto('file://' + f); await np.waitForTimeout(900);
      const m = await np.evaluate(MEAS + '()');
      for (const [c2, msg] of c.chk(m)) ok(c2, `[음성 1600 · ${c.name}] ${msg}`);
      await nc.close();
    } finally { try { fs.unlinkSync(f); } catch (_) {} }
  }

  await browser.close();
  console.log(`\nVERIFY415 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
