/* 작업 241 회귀 게이트 — 19 프로필 팝업이 9:16(frameH 1600)에서 바닥 227px 잘림 (T1 버그).
   실행: node tools/verify241.js   → 마지막 줄이 `VERIFY241 n/n PASS` 여야 한다.

   증상(등재 실측 · `verify201` §8): `.pf{top:431px;height:1396px}` → 431+1396 = **1827** 인데
   `fit()` 의 frameH 는 짧은 기기에서 **1600 으로 clamp** 된다. 바닥 227px 이 프레임 밖이라
   «장착 중» 버튼(패널 local +1105..1224)과 하단 토글(+1261..1356)이 **통째로 안 보였다.**

   처방: `.pf{top:clamp(104px, 431px, calc(100% - 1427px))}` — 값이 아니라 **상한**이다.
     · 최대값 `100% − 1427`(=1396 패널 + **31** 여유): 2280 → 853 · 1920 → 493 → 둘 다 431 이 이긴다.
       **기준 프레임 기하는 한 픽셀도 안 바뀐다**(19 는 ①~④ 8점 통과 화면).
       1600 → 173 이라 이때만 258px 위로 붙는다.
       ⚑ 여유 8 → **31** 은 작업 391(2026-08-29)이 바꿨다 — 8 은 «프레임 안에 넣기» 만 보고 고른 값이라
         1600 에서 패널이 바닥에 붙어 흘러내리는 것처럼 읽혔다. 31 = (1458 − 1396) ÷ 2 =
         쓸 수 있는 띠(HUD 잉크 142 .. 프레임 끝)의 남는 62px 의 절반 ⇒ **1600 에서 위 = 아래 = 31**.
     · 최소값 104px: 상단 HUD(0..104) 가드.

   같이 고친 것 — `tools/smoke.js` 의 «바닥 시트 잘림» 후보 목록이 **오버레이**(`#pfw{inset:0}` 등
   항상 프레임과 같은 크기)를 재고 있어 이 결함이 원리적으로 안 걸렸다(189-③ «헛초록»).
   껍데기 8개를 안쪽 박스로 갈아 끼웠다. 전수 확인은 `node tools/audit241.js`(읽기 전용).

   본다:
     §1 화면비 4종 — **상자 중심이 프레임 중심을 −11px 로 따라간다**(754 이관 · 아래 ⚑), 네 경우 다 프레임 안.
     §2 원 증상 — «장착 중» 버튼 `.pf-btn` · 하단 토글 `.pf-tgl` 이 4종 전부 프레임 안.
     §3 기준 프레임(2280) 불변 — `.pf` 와 자식 5종의 프레임 좌표가 수정 전 값 그대로.
        (패널 local 좌표가 그대로인지도 같이 본다 — 상한이 자식 앵커를 밀면 여기서 잡힌다)
     §4 1600 에서 실제로 **눌린다** — 두 요소가 hit-test 최상단이고, 토글 클릭 → 20 스펙 팝업 전환.
     §5 소스 — smoke 후보 목록에 «맨 오버레이» 가 없고 안쪽 박스가 들어 있다.
     §6 음성항 — 갈아 끼운 사본(`.v241-neg.html`)을 **새로 열어** 재면 1600 바닥 +227 이 복원되고,
        smoke 와 같은 자(후보 = 안쪽 박스)가 그 사본에서 실제로 **빨개진다.**
        (살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다 — LESSONS 191)

   ⚑ **754 이관(2026-09-02, 작업 830)** — `.pf` 의 자리 규칙이 **상단 앵커 → 중앙 앵커**로 바뀌었다:
     옛 `top:clamp(223px, 431px, calc(var(--frameh, 2280px) - 1477px))`
     새 `top:calc(50% - 709px + var(--pfsh) / 2)`   (709 = 반높이 698 + 레퍼런스 오프셋 11)
   **제품이 옳고 이 자가 낡았다.** «1920·2600 도 431 불변» 과 «위 여백 = 아래 여백 = 81» 은 둘 다
   **옛 규칙의 부산물**이었고(754 실측: 옛 축은 중심이 1920 +169 ↔ 2600 −171 로 340px 스윙),
   333 처방대로 자리를 비우지 않고 **묻는 방향만** «중심이 프레임을 따라가는가» 로 갈아 끼웠다.
   2280 의 top 431 은 그대로 남는다 — 754 가 자리를 안 옮겼다는(레퍼런스 Δ0px) 증거다.
   §6 은 치환 원본 한 줄만 새 선언으로 옮겼고 **기대값(431 · 227)은 한 글자도 안 바꿨다.** */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= tol, `${m} (기대 ${want}±${tol} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SMOKE = fs.readFileSync(path.join(__dirname, 'smoke.js'), 'utf8');
/* 830(2026-09-02) — «선언으로 살아 있는가» 를 묻는 항들이 쓰는 사본. 주석은 역사 기록이라
   세지 않는다(754 가 옛 clamp 값과 `var(--pfsh)/2` 의 뜻을 CSS 주석에 남겼다). */
const noCmt = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const URL = 'file://' + path.join(ROOT, 'index.html');

/* smoke.js 의 «시트 잘림» 판정과 **같은 자**. 후보 목록도 smoke 소스에서 그대로 뽑아 쓴다 —
   목록이 다시 오버레이로 되돌아가면 §6 이 초록이 돼 버리므로 여기서 읽는 것이 중요하다. */
const CANDS = (SMOKE.match(/const cands = \[\.\.\.document\.querySelectorAll\('([^']+)'\)\]/) || [])[1] || '';
const CUT = `(function(sel){
  const app = document.getElementById('app'); if(!app) return 'no #app';
  const A = app.getBoundingClientRect();
  const out = [];
  for(const e of document.querySelectorAll(sel)){
    if(!(e.offsetParent !== null || getComputedStyle(e).position === 'fixed')) continue;
    const cs = getComputedStyle(e);
    if(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0) continue;
    const r = e.getBoundingClientRect(); if(!r.width || !r.height) continue;
    if(r.top < A.top - 1.5 || r.bottom > A.bottom + 1.5)
      out.push((e.id || e.className) + ' top ' + Math.round(r.top - A.top) + ' bottom ' + Math.round(r.bottom - A.bottom));
  }
  return out;
})`;

/* 프로필을 연 뒤 재는 값 한 벌 */
const MEAS = `(function(){
  openProfile();
  void document.body.offsetHeight;
  const A = document.getElementById('app').getBoundingClientRect();
  const pf = document.querySelector('#pfw .pf');
  const P = pf.getBoundingClientRect();
  const box = (s) => { const e = document.querySelector(s); if(!e) return null;
    const r = e.getBoundingClientRect();
    return { top: Math.round(r.top - A.top), bot: Math.round(r.bottom - A.bottom),
             lx: Math.round(r.left - P.left), ly: Math.round(r.top - P.top),
             w: Math.round(r.width), h: Math.round(r.height) }; };
  return {
    frameH: Math.round(A.height),
    pf:    box('#pfw .pf'),
    btn:   box('#pfw .pf-btn'),
    tgl:   box('#pfw .pf-tgl'),
    grid:  box('#pfw .pf-grid'),
    tab:   box('#pfw .pf-tab'),
    por:   box('#pfw .pf-por'),
    msn:   box('#pfw .pf-msn'),
  };
})`;

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL); await p.waitForTimeout(900);

  /* ── §1 화면비 4종 — 상한은 짧은 프레임에서만 걸린다 ── */
  console.log('§1 화면비 4종 — top 431 불변 · 1600 만 올라간다 · 전부 프레임 안');
  const M = {};
  for (const h of [1600, 1920, 2280, 2600]) {
    await p.setViewportSize({ width: 1080, height: h });
    await p.waitForTimeout(350);
    M[h] = await p.evaluate(MEAS + "()");
    eq(`[${h}] frameH`, M[h].frameH, h);
  }
  /* 작업 754(2026-09-02) 이관 — 상단 앵커(`clamp(223px, 431px, frameH − 1477px)`)가 **중앙 앵커**
     (`top:calc(50% - 709px + var(--pfsh)/2)`)로 바뀌었다. 그래서 «1920·2600 도 431» 은 이제 거짓이다.
     ⚠ **제품이 옳고 이 항이 낡았다** — «431 불변» 은 415 상한의 **부산물**을 묻던 것이고,
     754 가 실측한 옛 축의 실제 성질은 그 반대였다: 중심 오프셋이 1920 **+169** ↔ 2600 **−171** 로
     **340px 을 스윙**했고 기준 프레임 2280 에서만 우연히 −11(≈중앙)이라 «중앙처럼» 보였다.
     ⇒ 333 처방대로 자리를 비우지 말고 **묻는 방향만 갈아 끼운다** —
     «top 이 431 이냐» 가 아니라 **«상자 중심이 프레임 중심을 같은 오프셋으로 따라가느냐»** 다.
     ⚑ 2280 의 431 은 그대로 남는다 — 754 가 **자리를 안 옮겼다는(레퍼런스 Δ0px)** 증거이자
     아래 오프셋의 재료다(오프셋을 손으로 −11 이라 적지 않고 기준 프레임에서 읽어 온다). */
  const cen = (b, h) => Math.round((b.top + b.h / 2 - h / 2) * 10) / 10;
  eq('[2280] .pf top 431 — 레퍼런스 Δ0px (754 가 자리를 안 옮겼다)', M[2280].pf.top, 431);
  const CEN = cen(M[2280].pf, 2280);
  eq('기준 프레임 중심 오프셋 = −11 (709 = 반높이 698 + 레퍼런스 오프셋 11)', CEN, -11);
  for (const h of [1600, 1920, 2280, 2600])
    eq(`[${h}] 상자 중심 − 프레임 중심 (프레임을 따라간다)`, cen(M[h].pf, h), CEN);
  /* 작업 391(2026-08-29) 이관 — 상한의 «여유» 가 8 → 31 로 바뀌었다(1404 → 1427).
     ⚠ 숫자만 196 → 173 으로 갈아 끼우면 «상한이 통째로 사라져도 초록» 인 자가 되지는 않지만
     «왜 173 인가» 를 아무도 안 묻는 자가 된다(LESSONS 328-330 의 «누른 항을 묻는 항»).
     그래서 값 항 옆에 **유도 항**을 나란히 둔다 — 여유는 상수가 아니라
     «쓸 수 있는 띠(HUD 잉크 142 .. 프레임 끝)의 남는 62px 의 절반» 이다. */
  /* 작업 415(2026-08-30) 이관 — 여유가 31 → **48** 로 올라갔다(상한 1427 → 1444).
     ⚠ 숫자만 173 → 190 으로 갈아 끼우면 «왜 48 인가» 를 아무도 안 묻는 자가 된다(391 이 남긴 규칙).
     81 은 상수가 아니라 **카드가 스크롤 뒤로 숨지 않는 선에서 낼 수 있는 최대 여백**이고,
     그 값이 되도록 패널이 짧아진다(`--pfsh`). 그래서 값 항 셋 옆에 유도 항 셋을 나란히 둔다.
     (2회차 — 1회차의 48 은 비평가 CU 가 «좌우 거터 92 의 0.52배» 로 ③=7 을 줬다) */
  /* 754 이관 — «위 여백 = 아래 여백 = 81» 은 **띠(HUD 잉크 142 .. 프레임 끝) 중앙 정렬**의 부산물이었다.
     754 가 기준을 **프레임 중앙**으로 옮기면서 둘은 더 이상 같지 않다(1600 에서 위 −1 ↔ 아래 163).
     ⇒ 값 항 셋을 «중심이 흡수분에 흔들리지 않는다» 로 갈아 끼운다 — 흡수분 100 이 들어오는 1600 에서도
     중심 오프셋이 기준 프레임과 같아야 한다. `var(--pfsh)/2` 되밀기가 하는 일이 정확히 이것이라,
     그 절반 항이 사라지면 이 자리가 곧바로 빨개진다(=무르게 푼 것이 아니다).
     ⚠ **위 여백 −1(= HUD 잉크를 1px 밟는다)은 이 번호가 고칠 자리가 아니다** — 별도로 811 에 등재돼 있다.
     여기서는 «더 나빠지면 빨개지는» 래칫으로만 잡아 둔다(값을 0 으로 못 박으면 811 을 이 자가 대신 닫아 버린다). */
  eq('[1600] .pf top = 프레임중심 800 − 709 + 흡수분/2 (50)', M[1600].pf.top, 800 - 709 + 50);
  ok(M[1600].pf.top - 142 >= -1,
    `[1600] 래칫 — HUD 잉크(142)와 겹침이 1px 이내 (위 여백 ${M[1600].pf.top - 142} · 축은 811 몫)`);
  eq('[1600] 패널이 그만큼 짧아졌다 (1396 − 100)', M[1600].pf.h, 1296);
  eq('[1600] 유도 — 여백 = (띠 1458 − 패널) ÷ 2', Math.round((1600 - 142 - M[1600].pf.h) / 2), 81);
  ok(-M[1600].pf.bot > 37 && -M[1600].pf.bot > 40 && -M[1600].pf.bot >= 81,
    `[1600] 외곽 여백 ${-M[1600].pf.bot} 이 내부 패딩(상 37 · 하 40)보다 넓다 — 415 가 닫은 역전`);
  /* 415 ⓑ — 아래 여백 31 은 «1600 만» 이 아니라 상한 항이 이기는 구간 전체의 성질이었다.
     상한을 올린 지금은 그 구간(1600..1875)이 전부 48 이어야 한다. */
  for (const h of [1600, 1920, 2280, 2600]) {
    ok(M[h].pf.bot <= 1.5, `[${h}] .pf 바닥이 프레임 안 (프레임 밖 ${Math.max(0, M[h].pf.bot)}px)`);
    ok(M[h].pf.top >= 104, `[${h}] .pf 상단이 HUD(104) 아래 (top ${M[h].pf.top})`);
  }
  /* 수정 전에는 바로 이 값이 227 이었다 — 표에 남긴다(233-③) */
  console.log('      · [1600] 수정 전 이 값이 +227 이었다 → 지금 ' + M[1600].pf.bot);

  /* ── §2 원 증상 — 버튼·토글이 안 보이던 것 ── */
  console.log('§2 «장착 중» 버튼 · 하단 토글이 4종 전부 프레임 안');
  for (const h of [1600, 1920, 2280, 2600]) {
    ok(M[h].btn.bot <= 1.5 && M[h].btn.top >= 0, `[${h}] .pf-btn 프레임 안 (top ${M[h].btn.top} · 바닥 ${M[h].btn.bot})`);
    ok(M[h].tgl.bot <= 1.5 && M[h].tgl.top >= 0, `[${h}] .pf-tgl 프레임 안 (top ${M[h].tgl.top} · 바닥 ${M[h].tgl.bot})`);
  }

  /* ── §3 기준 프레임(2280) 기하 불변 ── */
  console.log('§3 기준 프레임 2280 — 수정 전 좌표 그대로 (19 는 ①~④ 8점 통과 화면)');
  const WANT2280 = { pf: 431, btn: 1536, tgl: 1692, grid: 901, tab: 833, por: 511, msn: 1457 };
  for (const k of Object.keys(WANT2280)) eq(`[2280] ${k} 프레임 top`, M[2280][k].top, WANT2280[k]);
  eq('[2280] .pf 크기', `${M[2280].pf.w}×${M[2280].pf.h}`, '896×1396');
  /* 패널 local — 상한이 자식 앵커를 밀지 않았는가(LESSONS 189-①) */
  const LOCAL = { btn: 1105, tgl: 1261, grid: 470, tab: 402, por: 80, msn: 1026 };
  for (const h of [1920, 2280, 2600])
    for (const k of Object.keys(LOCAL))
      eq(`[${h}] ${k} 패널 local y (자식 앵커 불변)`, M[h][k].ly, LOCAL[k]);
  /* 작업 415 이관 — 1600 에서만 «그리드 아래 세 요소» 가 흡수분(34)만큼 같이 올라간다.
     ⚠ 새 상수(1071·1227·992)를 적지 않는다 — 그러면 «흡수 구조가 사라져도 초록» 이 된다.
     묻는 것은 **관계**다: ① 위쪽 앵커(tab·por·grid top)는 여전히 2280 과 같은 값이고
     ② 아래 셋은 «2280 값 − (1396 − 패널 높이)» 이며 ③ 그 흡수는 `.pf-grid` 높이에서만 나온다. */
  const SH = 1396 - M[1600].pf.h;                       /* 흡수분 — 상수가 아니라 실측 */
  eq('[1600] 흡수분 = 1396 − 패널 높이', SH, 100);
  for (const k of ['grid', 'tab', 'por'])
    eq(`[1600] ${k} 패널 local y — 위쪽 앵커는 2280 과 같다`, M[1600][k].ly, LOCAL[k]);
  for (const k of ['msn', 'btn', 'tgl'])
    eq(`[1600] ${k} 패널 local y = 2280 값 − 흡수분 ${SH}`, M[1600][k].ly, LOCAL[k] - SH);
  eq('[1600] 흡수는 스크롤 그릇 `.pf-grid` 높이에서만 난다', M[2280].grid.h - M[1600].grid.h, SH);
  /* 아래 네 요소의 «서로의 간격» 과 내부 하단 패딩은 Δ0 이어야 한다(같이 올라갔으므로) */
  for (const h of [1600, 2280]) {
    eq(`[${h}] msn → btn 간격`, M[h].btn.ly - M[h].msn.ly, 79);
    eq(`[${h}] btn → tgl 간격`, M[h].tgl.ly - M[h].btn.ly, 156);
    eq(`[${h}] 내부 하단 패딩 (패널 − 토글 하변)`, M[h].pf.h - (M[h].tgl.ly + M[h].tgl.h), 40);
    eq(`[${h}] 그리드 하변 → msn 간격`, M[h].msn.ly - (M[h].grid.ly + M[h].grid.h), 12);
  }

  /* ── §4 1600 에서 실제로 눌린다 ── */
  console.log('§4 1600 — 두 요소가 hit-test 최상단이고 토글이 실제로 동작한다');
  await p.setViewportSize({ width: 1080, height: 1600 });
  await p.waitForTimeout(350);
  const hit = await p.evaluate(() => {
    openProfile(); void document.body.offsetHeight;
    const at = (sel) => { const r = document.querySelector(sel).getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!(e && (e.matches(sel) || e.closest(sel))); };
    return { btn: at('#pfw .pf-btn'), lb: at('#pfw .pf-tgl>.lb') };
  });
  ok(hit.btn, '[1600] «장착 중» 버튼이 실제 클릭 지점에서 잡힌다');
  ok(hit.lb, '[1600] 하단 토글 «종합 스탯» 라벨이 실제 클릭 지점에서 잡힌다');
  const sw = await p.evaluate(async () => {
    const r = document.querySelector('#pfw .pf-tgl>.lb').getBoundingClientRect();
    document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).click();
    await new Promise(z => setTimeout(z, 250));
    return { spec: document.getElementById('specw').classList.contains('on'),
             prof: document.getElementById('pfw').classList.contains('on') };
  });
  ok(sw.spec && !sw.prof, `[1600] 토글 클릭 → 20 스펙 팝업으로 전환 (spec ${sw.spec} · prof ${sw.prof})`);

  /* ── §5 소스 — smoke 후보 목록 ── */
  console.log('§5 smoke 후보 목록 = 오버레이가 아니라 안쪽 박스');
  ok(CANDS.length > 0, 'smoke.js 에서 후보 목록을 읽었다');
  for (const bad of ['#pfw', '#specw', '#ciw', '#trw', '#eqw', '#relw', '#shopw', '#dunw'])
    ok(!new RegExp('(^|,\\s*)' + bad + '\\s*(,|$)').test(CANDS), `후보에 맨 오버레이 ${bad} 가 없다`);
  for (const good of ['#pfw .pf', '#specw .spc', '#ciw .ci', '#trw .tr-sheet', '#eqw .eqp',
                      '#relw .rw-grid', '#shopw .shp-list', '#dunw .dns-list'])
    ok(CANDS.includes(good), `후보에 안쪽 박스 ${good} 가 있다`);
  /* 754 이관 — 이 자리는 «상한 문자열이 있다» 를 묻고 있었는데 754 가 상한을 **선언째** 걷어냈다.
     소멸을 그냥 지우면 «앵커가 통째로 사라져도 초록» 이 되므로, 새 선언을 묻는 항과
     **옛 선언이 되살아나지 않았는가**를 묻는 항을 나란히 세운다(415 도 같은 문자열을 본다 — 830). */
  ok(/top:calc\(50% - 709px \+ var\(--pfsh\) \/ 2\)/.test(SRC),
    'index.html 에 .pf 중앙 앵커가 있다 (754: 709 = 반높이 698 + 레퍼런스 오프셋 11)');
  /* ⚠ «옛 문자열이 한 글자도 없다» 로 물으면 안 된다 — 754 가 그 값을 **주석에 역사로 적어 뒀고**
     그 기록은 지워야 할 것이 아니다. 묻는 것은 **선언으로 살아 있는가** 다(주석은 세지 않는다). */
  ok(!noCmt(SRC).includes('top:clamp(223px, 431px, calc(var(--frameh, 2280px) - 1477px))'),
    'index.html 에 옛 상단 앵커(clamp 223/431)가 **선언으로는** 없다 (754 · 주석의 역사 기록은 셈에서 뺀다)');
  ok(/--pfsh:clamp\(0px,\s*calc\(1700px - var\(--frameh, 2280px\)\),\s*100px\)/.test(SRC),
    'index.html 에 415 흡수분 `--pfsh` 가 있다 (연속형 — `.shortf` 갈래가 아니다)');

  /* ── §6 음성항 — 갈아 끼운 사본을 새로 열어서 잰다 ── */
  console.log('§6 음성항 — 옛 규칙 사본에서 227px 이 되살아나고 smoke 자가 빨개진다');
  const negPath = path.join(ROOT, `.v241-neg-${process.pid}.html`);
  /* 415 이관 — 사본은 **241 이전 선언 그대로**로 되돌린다(상한도 흡수분도 없는 고정 1396).
     상한만 떼면 흡수분이 남아 밖으로 나가는 양이 227 이 아니라 193 이 되어 원 증상과 달라진다. */
  const REV241 = [   /* 415 자리 일곱 개를 **전부** 되돌린다 — 상자만 되돌리면 자식이 100px 올라간 채라
                        «장착 중»·토글이 프레임 안에 남아 241 의 원 증상이 재현되지 않는다 */
    /* 754 이관(2026-09-02) — 되돌릴 원본이 상한 clamp 에서 **중앙 앵커**로 바뀌었다.
       치환 원본만 새 글자로 옮기고 **묻는 것도 기대값(431 · 227)도 그대로다**: 어느 쪽 선언에서 출발하든
       «top 431 고정 + 흡수분 없음» 으로 되돌리면 1600 에서 바닥이 227px 밖으로 나간다. */
    ['top:calc(50% - 709px + var(--pfsh) / 2);', 'top:431px;'],
    /* 705 이관(2026-09-02) — 이 선언이 `.pf{…}` 에서 **`.pf, .spc{…}`(19·20 공용)** 로 옮겨가면서
       블록 끝이 됐다(`…var(--pfsh))}`). 자리만 새 글자로 옮기고 **묻는 것은 그대로**다:
       흡수분을 떼면 짧은 프레임에서 상자가 프레임 밖으로 227px 나간다. */
    ['height:calc(1396px - var(--pfsh))}', 'height:1396px}'],
    ['height:calc(544px - var(--pfsh));', 'height:544px;'],
    ['top:calc(1026px - var(--pfsh));', 'top:1026px;'],
    ['top:calc(1089px - var(--pfsh));', 'top:1089px;'],
    ['top:calc(1105px - var(--pfsh));', 'top:1105px;'],
    ['top:calc(1261px - var(--pfsh));', 'top:1261px;'],
  ];
  const neg = REV241.reduce((t, [a, b]) => {
    if (!t.includes(a)) { console.error('갈아 끼울 자리를 못 찾았다: ' + a); process.exit(2); }
    return t.replace(a, b);
  }, SRC);
  /* 754 이관 — «흡수분이 한 글자도 없다» 도 같은 이유로 **주석을 뺀 사본**에 묻는다
     (754 가 `var(--pfsh)/2` 되밀기의 뜻을 CSS 주석에 적어 뒀다 — 그것까지 지우라는 뜻이 아니다). */
  ok(neg !== SRC && !noCmt(neg).includes('var(--pfsh)'),
    '사본을 241 이전 선언(top 431 고정 · 흡수분 없음)으로 되돌렸다 — 일곱 자리 전부');
  fs.writeFileSync(negPath, neg);
  try {
    const nctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const np = await nctx.newPage();
    await np.goto('file://' + negPath); await np.waitForTimeout(900);
    const nm = await np.evaluate(MEAS + "()");
    eq('[음성 1600] 옛 규칙이면 .pf top 431 로 돌아온다', nm.pf.top, 431);
    eq('[음성 1600] 옛 규칙이면 바닥 227px 이 프레임 밖', nm.pf.bot, 227);
    ok(nm.btn.bot > 1.5 && nm.tgl.bot > 1.5, `[음성 1600] «장착 중»·토글이 프레임 밖 (${nm.btn.bot} · ${nm.tgl.bot})`);
    /* 60 쥬시 개봉 연출(`jz-*` scale)이 도는 중에 재면 상자가 줄어든 순간이 잡힌다 —
       연출이 끝난 뒤에 잰다(smoke 의 같은 가드와 같은 이유). */
    await np.waitForTimeout(800);
    const ncut = await np.evaluate(`(${CUT})(${JSON.stringify(CANDS)})`);
    ok(Array.isArray(ncut) && ncut.some(s => /(^|\s)pf(\s|$)/.test(s)),
      `[음성 1600] smoke 자가 .pf 를 잡는다 (${JSON.stringify(ncut)})`);
    /* 대조 — 같은 자를 «안 갈아 낀» 현재 트리에 대면 0건이어야 한다(항등식이 아님) */
    await np.goto(URL); await np.waitForTimeout(700);
    await np.evaluate(() => openProfile());
    await np.waitForTimeout(800);
    const bcut = await np.evaluate(`(${CUT})(${JSON.stringify(CANDS)})`);
    eq('[대조 1600] 현재 트리에서는 같은 자가 0건', Array.isArray(bcut) ? bcut.length : -1, 0);
    await nctx.close();
  } finally { try { fs.unlinkSync(negPath); } catch (_) {} }

  eq('콘솔/런타임 에러', errs.length, 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log(`\nVERIFY241 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
