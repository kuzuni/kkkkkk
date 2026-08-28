#!/usr/bin/env node
/* 125 검증 — 화폐 아이콘이 «정해진 이미지 1개» 로 통일됐는가
 *
 *   node tools/verify125.js
 *
 * 지시(PROGRESS 125 «검증 [3]-(가)+(다)») 가 요구한 항목 그대로. 치환형 작업이라 LESSONS 111-① 대로
 * **두 층**으로 나눠 본다 — ⓐ 옛것이 사라졌는가(소스 스캔) · ⓑ 새것이 맞는가(런타임 표시 결과).
 *
 *   [A] 소스 — 주석을 걷어낸 index.html 에 화폐 이모지(🪙💰🥇💎💠🔮🎟️🎫) 0건.
 *       비재화는 **두 층**으로 뺀다 — ① «아트 자리» 규칙(`ic:`/`art:` 의 한 글리프 값 = 그 항목의 그림)과
 *       ② 규칙으로 안 걸리는 나머지의 **줄 단위 허용 목록**. 목록은 «한 항목 = 한 줄»(A2)이고
 *       **죽은 항목이 있으면 실패**다(A3) — 목록이 소스를 못 따라가 조용히 새는 것이 125 의 고질병이다(289).
 *   [B] 단일 출처 — `assets/ui/cur-*.svg` 리터럴은 `CUR_ICON` 블록 안에만 있다(문자열에 경로 복제 금지).
 *       [A] 와 **같은 주석 제거 소스**에서 센다 — 주석에 적힌 경로는 설명이지 복제가 아니다(작업 145).
 *   [C] 자산 — 화폐 SVG 가 실제로 있고 유효하다(파일 · <svg> · viewBox).
 *       **종 수를 손으로 적지 않는다** — `CUR_ICON` 블록에서 전수로 뽑는다(C0). 194·203·210 이 재화를
 *       늘릴 때마다 «7종»·«9종»·«11종» 이 뒤처져 세 번 부패했다(작업 289).
 *   [D] 기하 — HUD `.cbox i` 아이콘 **63×63**(measure/A3) · 41 팝업 재화 바 `.pcb-p>i` **57×57**(measure/41),
 *       옛 이모지 보정(`scaleX`)이 이미지에 남아 있지 않다.
 *   [E] «한 종류» — 전 화면 스윕에서 모인 모든 화폐 아이콘의 src 가 재화별로 **유일**하고 CUR_ICON 과 같다.
 *       특히 골드는 옛 🪙/💰/🥇 3종이 섞여 있던 자리다.
 *   [F] 유출 — 스윕 중 화면 텍스트에 `<img` 0건(= 이미지 태그를 textContent 로 박은 자리 없음) ·
 *       화면 텍스트에 화폐 이모지 0건 · NaN/undefined 0건.
 *   [G] 58 연출 — 재화 비행 파티클이 이모지가 아니라 CUR_ICON 이미지다(fxFly 직후 `.fx-fly>img.cic`).
 *   [H] 입장권 — 던전 계열 5종(골드·다이아·유물·강화석·룬강화석)만 쓰인다. 던전 카드 권종이 계열과 일치.
 *   [I] 콘솔 에러 0건.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const CUR_EMOJI = ['\u{1FA99}', '\u{1F4B0}', '\u{1F947}', '\u{1F48E}', '\u{1F4A0}', '\u{1F52E}', '\u{1F39F}', '\u{1F3AB}'];
/* 화면 텍스트에 남으면 무조건 실패인 «순수 화폐» 글리프 — 나머지(💎🔮💠🥇)는 등급·계급·탭 아이콘으로도
   쓰이므로 런타임 텍스트로는 못 가른다(그쪽은 [A] 소스 스캔이 줄 단위로 잡는다. LESSONS 111-①). */
const PURE = ['\u{1FA99}', '\u{1F4B0}', '\u{1F39F}', '\u{1F3AB}'];
/* 화폐 아이콘 목록 — **상수 목록이 아니라 `CUR_ICON` 블록의 전수 결과다**(작업 289).
   194(7→9종)·203(9→11종)·210(11→**12종**, `tstone` 단련석) 처럼 재화가 늘 때마다 여기 손으로 적은
   목록이 뒤처져 C2 가 «11종이 디코드된다» 를 12종 앞에서 빨갛게 만들었다 — 세 번째 부패였다.
   125 의 규칙은 «재화 하나에 이미지 하나» 이므로, 세는 자는 **선언 그 자체**여야 한다.
   B1 이 «경로 리터럴은 CUR_ICON 블록 안에만» 을 못 박으므로 이 블록이 곧 전수 목록이다. */
function curIconFiles(bare) {
  const decl = bare.indexOf('const CUR_ICON = {');
  if (decl < 0) return [];
  const end = bare.indexOf('};', decl);
  /* 파일명을 «cur-…\.svg» 로 좁히지 않는다 — 좁히면 오타(`cur-NOPE.svg`)가 **추출에서 조용히 빠져**
     C1 이 «남은 11종은 멀쩡하다» 로 초록이 된다(289 음성 대조 N4 가 실제로 그렇게 새어 나갔다).
     블록 안의 `assets/ui/…` 리터럴은 전부 화폐 아이콘이므로 있는 그대로 받아 C1 에 넘긴다. */
  const seen = [];
  for (const m of bare.slice(decl, end).matchAll(/'assets\/ui\/([^']+)'/g)) {
    if (!seen.includes(m[1])) seen.push(m[1]);
  }
  return seen;
}

/* ── 비재화 제외 ① «아트 자리» — 이름이 아니라 **구조**로 뺀다(작업 289) ────────────────
   `ic:'🔮'` · `art:'🎟'` 처럼 **한 글리프짜리 리터럴이 `ic`/`art` 키의 값**인 자리는 «그 항목의 그림»
   이지 재화 표시가 아니다(장비·펫 이름 표, 등급·계급 엠블럼, 출석 보상 아이템, 151 이용권 카드 아트).
   125 의 화폐 표시는 전부 `curIc()`/`<img class="cic">` 를 지나가므로(B2·E1~E4·G1 이 못 박는다)
   `ic:`/`art:` 값과는 애초에 겹치지 않는다.
   **왜 규칙으로 바꿨나**: 예전엔 이 자리를 «{n:'마력 장벽'» 처럼 **항목 이름 한 줄씩** 적어 뒀는데,
   85·186 이 장비 표에 `id:` 를 넣고 등급별 항목을 늘리자 그 세 줄이 **한 글자도 안 맞는 죽은 항목**이
   되어 A1 이 빨개졌다(289 진단 ⓐ). 이름 목록은 장비가 늘 때마다 또 부패한다 — 구조는 안 그런다.
   값 길이를 8자로 묶어 «짧은 글리프» 만 면제한다(문장·경로를 `ic:` 로 숨기지 못하게). */
const ART_SLOT = /\b(?:ic|art)\s*:\s*'[^'\s]{1,8}'/g;

/* ── 비재화 제외 ② 아트 자리로 안 걸리는 나머지 — 줄 단위 허용 목록 ──────────────────
   («한 항목 = 한 줄» 이 원칙이다. A2 가 부풀기를, A3 이 죽은 항목을 막는다) */
const ALLOW = [
  '<span class="ti">',                        /* 탭바 «유물» 탭 아이콘 */
  'data-mn="pass"',                           /* ▦ 메뉴 «패스» 버튼 아이콘 */
  'data-ptab="stage"',                        /* 35 패스 «스테이지» 탭 아이콘 */
  'class="rk-sh s1"',                         /* 54 랭킹 단상 1위 방패 */
  "['\u{1F947}', '\u{1F948}', '\u{1F949}']",  /* 54 랭킹 메달 3종 */
  /* ── 작업 289 판정: 🎫 «이용권» 은 화폐가 아니다 ──────────────────────────────
     125 가 통일한 화폐는 12종이다(210 이후) — 골드·다이아·유물조각·강화석·룬강화석·단련석·마일리지 +
     **던전 입장권** 5종(`cur-ticket-*.svg`, H1 이 던전 카드 권종으로 못 박는다).
     124·151 의 «이용권» 은 상점 **상품**(오프라인 보상 +4시간 등)이라 그 어느 것도 아니다 —
     `curIc('tkDia')` 로 옮기면 **던전 입장권 아이콘을 상점 상품 토스트에 붙이는 오표기**가 된다. */
  "' 이용권 — '",                             /* 151·124 이용권 적용 토스트(재화 아님) */
  /* ── 작업 211 판정: 🎟 «쿠폰» 은 화폐가 아니다 ──────────────────────────────
     쿠폰 코드(`CF_CODES`)도 화폐가 아니라서 `curIc('tkDia')`/`curIc('tkRelic')` 로 옮기면 같은
     오표기가 된다. 실제 «지급물» 인 다이아는 이미 같은 줄에서 `curIc('dia')` 로 나가고 있다. */
  '사용할 수 없는 코드입니다',                /* 쿠폰 — 잘못된 코드 토스트 */
  '이미 사용한 코드입니다',                   /* 쿠폰 — 중복 사용 토스트 */
  'fmt(CF_CODES[code])',                      /* 쿠폰 — 획득 토스트(지급물 다이아는 curIc('dia')) */
];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 주석(/* *​/ · <!-- -->)을 걷어낸 소스 — 주석 속 «옛 이모지» 는 역사 기록이라 남긴다(LESSONS 111-①ⓐ) */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
            .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
}

(async () => {
  /* ---- [A] 소스 스캔 ----
     `BARE` = 주석을 «같은 길이의 공백» 으로 지운 소스. 길이가 원본과 1:1 이라 문자 오프셋·줄 번호가
     그대로 통한다 — [A] 와 [B] 가 같은 전처리를 공유하게 하려고 한 번만 만들어 둔다(작업 145). */
  const BARE = stripComments(SRC);
  const lines = BARE.split('\n');
  const leftovers = [];
  let artHits = 0;                      /* 규칙(ART_SLOT)으로 빠진 줄 */
  const allowUse = ALLOW.map(() => 0);  /* 허용 목록 항목별 적중 수 — A2·A3 이 같이 읽는다 */
  lines.forEach((ln, i) => {
    if (!CUR_EMOJI.some(e => ln.indexOf(e) >= 0)) return;
    /* ① 아트 자리(ic:/art: 한 글리프)를 지운 뒤에도 이모지가 남는지로 본다 */
    if (!CUR_EMOJI.some(e => ln.replace(ART_SLOT, '').indexOf(e) >= 0)) { artHits++; return; }
    /* ② 나머지는 줄 단위 허용 목록 */
    const k = ALLOW.findIndex(a => ln.indexOf(a) >= 0);
    if (k >= 0) { allowUse[k]++; return; }
    leftovers.push((i + 1) + ': ' + ln.trim().slice(0, 80));
  });
  ok(leftovers.length === 0, 'A1 소스에 남은 화폐 이모지 0건(주석·비재화 제외)',
     leftovers.length ? leftovers.slice(0, 6).join(' | ') : '0건 (아트 자리 ' + artHits + '줄 · 허용 목록 '
       + allowUse.reduce((a, b) => a + b, 0) + '줄)');
  /* A2 — 허용 «목록» 이 부풀지 않았다. 세는 대상은 **목록이 면제한 줄** 뿐이다(규칙이 뺀 아트 자리는
     항목이 아니라 정의라 세지 않는다). «한 항목 = 한 줄» 이 원칙이므로 상한은 목록 길이 그대로다. */
  const allowHits = allowUse.reduce((a, b) => a + b, 0);
  ok(allowHits <= ALLOW.length, 'A2 허용 목록이 부풀지 않았다(면제한 줄 ' + allowHits + '개 ≤ 항목 '
     + ALLOW.length + '개)', allowHits + '/' + ALLOW.length);
  /* A3 — **죽은 허용 항목 0건**(작업 289 가 신설). 이번 부패의 정체가 이것이다: 85·186 이 장비 표를
     고치자 «{n:'마력 장벽'» 등 3항목이 아무 줄과도 안 맞게 됐는데, 목록은 «있기만 하면» 통과라
     아무도 몰랐고 그 줄들만 조용히 A1 로 새어 나왔다. 이제는 항목이 죽는 순간 여기가 먼저 빨개진다. */
  const dead = ALLOW.filter((a, k) => allowUse[k] === 0);
  ok(dead.length === 0, 'A3 허용 목록에 죽은 항목 0건(어긋난 채 굳지 않았다)',
     dead.length ? dead.map(a => JSON.stringify(a)).join(' | ') : ALLOW.length + '항목 전부 적중');

  /* ---- [B] 단일 출처 ----
     A1 과 **같은 `BARE`(주석 제거) 위에서** 센다. 원본을 훑으면 «주석에 경로를 적었다» 를
     «코드가 경로를 복제했다» 로 오판한다 — 작업 144 가 남긴 설명 주석 한 줄 때문에 B1 이
     상시 FAIL(23/24) 이었다(작업 145). 금지 대상은 «실행되는 코드의 경로 복제» 지 문서가 아니다. */
  const decl = BARE.indexOf('const CUR_ICON = {');
  const declEnd = BARE.indexOf('};', decl);
  const paths = [];
  let idx = -1;
  while ((idx = BARE.indexOf('assets/ui/cur-', idx + 1)) >= 0) paths.push(idx);
  const outside = paths.filter(p => !(p > decl && p < declEnd));
  const outAt = outside.map(p => 'L' + (SRC.slice(0, p).split('\n').length));
  ok(decl > 0 && outside.length === 0, 'B1 아이콘 경로는 CUR_ICON 블록 안에만 있다(주석 제외)',
     '총 ' + paths.length + '건 · 블록 밖 ' + outside.length + '건'
     + (outAt.length ? ' @ ' + outAt.slice(0, 6).join(',') : ''));
  ok(/function curIc\(/.test(SRC) && /function curIcEl\(/.test(SRC),
     'B2 헬퍼 curIc()/curIcEl() 존재');

  /* ---- [C] 자산 ----
     목록은 손으로 적지 않고 위에서 만든 `BARE` 의 CUR_ICON 블록에서 **전수로 뽑는다**(작업 289). */
  const ICONS = curIconFiles(BARE);
  ok(ICONS.length >= 11, 'C0 CUR_ICON 블록에서 화폐 아이콘 전수 추출 (상수 목록 아님)',
     ICONS.length + '종 · ' + ICONS.map(f => f.replace(/^cur-|\.svg$/g, '')).join(','));
  const bad = ICONS.filter(f => {
    const p = path.join(ROOT, 'assets', 'ui', f);
    if (!fs.existsSync(p)) return true;
    const t = fs.readFileSync(p, 'utf8');
    return !/<svg[\s\S]*viewBox="0 0 64 64"/.test(t);
  });
  ok(bad.length === 0, 'C1 화폐 SVG ' + ICONS.length + '종 존재·유효', bad.length ? bad.join(',') : ICONS.length + '개');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof curIc === 'function');
  await page.waitForTimeout(400);

  /* 재화를 넉넉히 넣어 «부족» 분기가 아닌 정상 표시를 본다 */
  await page.evaluate(() => {
    S.gold = 4.2e12; S.dia = 3.5e6; S.relic = 88000; S.mileage = 12;
    S.dun = S.dun || {}; DUNGEONS.forEach(d => { S.dunTk[d.id] = DUN_TRY; });
    if (typeof fxDisp === 'object') { fxDisp.gold = S.gold; fxDisp.dia = S.dia; }
    drawHud();
  });

  /* ---- [D] 기하 ----
     ⚠ 작업 211 판정 — «HUD 아이콘 둘 다 63×63» 은 **게이트가 든 낡은 값**이었다.
     63×63 은 `.cbox i>.cic` 의 **컴포넌트 기본값**이고, A3 2차 폴리시 라운드가 화면(#top)에서만
     재화별로 거기서 «의도적으로» 벗어났다. 근거는 index.html 의 그 두 줄 주석 + measure/A3 §아트 필요:
       · gold — 자산 링(`stroke-width:4`)이 두꺼워 **노란 코어가 55** 로 나온다(ref 57).
                상자를 63 × 57/55 = **65.3** 으로 키워 코어를 ref Δ0 으로 맞췄다(A3 9회차,
                비평가 4인 U·V·W·X 동일값). 외곽도 65.3 으로 ref 실측 64~65 에 더 가까워졌다.
       · dia  — `cur-dia.svg` 의 마름모가 viewBox 64 안에서 덜 차 **가로만** 모자란다.
                A3 6회차는 **이미지 자신에** `scaleX(1.16)` 을 걸어 rect 를 73.1×63 으로 만들었다.
                ★ 356 이관(주인 지시 2026-08-29 «아이콘은 원본 비율») — 그 한 줄이 **폐기**됐다.
                «잉크 가로를 되돌린 것» 이 아니라 **아이콘을 16% 늘린 것**이고, 주인이 지운 것이
                정확히 그런 자리다. ⇒ dia 도 상자 그대로 **63×63 · transform 없음**.
                남는 폭 부족(−12~15%)은 자산 몫이다(`cur-dia.svg` 재작도 — 아래 «자산이 고쳐지면» 절). 
     그래서 D1 은 «63×63» 이 아니라 **재화별 확정값**을 잰다. 그리고 그 두 override 가
     «어느 축으로» 걸렸는지(gold=상자 · dia=transform)까지 봐야 다음 세션이 기전을 바꿔치기 못 한다 — D1b.
     자산(`cur-*.svg`)이 고쳐져 override 가 필요 없어지면 **이 기대값도 같이 내려야** 한다
     (measure/A3 §아트 필요 «자산이 고쳐지면 그 override 를 지워야 한다»).
     화면 override 는 `#top .curs` 한정이라 13 재화 탭(55×55)은 이 선택자에 안 들어온다. */
  const HUD_EXP = { gold: { w: 65.3, h: 65.3, tf: false }, dia: { w: 63, h: 63, tf: false } };
  const D = await page.evaluate(() => {
    const out = { hud: [], tf: [] };
    document.querySelectorAll('.cbox i > img.cic').forEach(im => {
      const r = im.getBoundingClientRect();
      out.hud.push({ k: im.dataset.curIc, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
                     tf: getComputedStyle(im).transform });
      out.tf.push(getComputedStyle(im.parentElement).transform);
    });
    return out;
  });
  const geoBad = D.hud.filter(x => !HUD_EXP[x.k]
    || Math.abs(x.w - HUD_EXP[x.k].w) > 2 || Math.abs(x.h - HUD_EXP[x.k].h) > 2);
  ok(D.hud.length === 2 && geoBad.length === 0,
     'D1 HUD 아이콘 재화별 확정 크기 (gold 65.3×65.3 · dia 63×63 — 356 이관: dia scaleX 폐기)',
     D.hud.map(x => x.k + ' ' + x.w + '×' + x.h).join(' · '));
  const mBad = D.hud.filter(x => HUD_EXP[x.k]
    && HUD_EXP[x.k].tf !== (x.tf !== 'none' && x.tf !== 'matrix(1, 0, 0, 1, 0, 0)'));
  ok(D.hud.length === 2 && mBad.length === 0,
     'D1b override 기전 (gold=상자 크기 · dia=override 없음 — 356 이 scaleX 를 폐기했다)',
     D.hud.map(x => x.k + ' ' + (x.tf === 'none' ? '상자' : x.tf)).join(' · '));
  ok(D.tf.every(t => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'),
     'D2 HUD 아이콘에 옛 scaleX 보정이 남지 않았다', D.tf.join(' | '));

  /* ⚑ 340 이관 — D3 은 «41 재화 바 아이콘 57×57» 이었다. 그 57 은 측정표 41 §3 의
     «bbox(검정 아웃라인 포함) 57×57» 에서 온 값인데, ref 를 다시 재면 그 57 은 아웃라인
     포함 실루엣이 아니라 **노란 원판/시안 몸통**이고 실루엣은 **64×65** 다
     (`node tools/probe340.js` · measure/41 §3 정오표). A3 가 HUD 에서 9회차에 뒤집은 것과
     같은 값·같은 이유다. 상자를 57 로 붙들고 있는 동안 실제 잉크는 코인 −14.0% · 젬 −19.6%
     였고 72 비평가 6명이 그것을 네 회차 연속 지적했다.
     ⇒ 기대값을 HUD(D1)와 **같은 재화별 확정값**으로 옮긴다. 상자(`<i>` 57×57)는 그대로이고
     움직인 것은 **이미지**뿐이라, 여기서 재는 것도 이미지 rect 다. 자산이 고쳐지면 D1 과
     함께 내린다. 잉크가 실제로 ref 에 붙었는지는 `tools/verify340.js` 가 픽셀로 못박는다. */
  const PCB_EXP = { gold: { w: 65.3, h: 65.3, tf: false }, dia: { w: 63, h: 63, tf: false } };  /* 356 이관 */
  const P = await page.evaluate(() => {
    openDungeon();
    const out = [];
    document.querySelectorAll('#dunw .pcb-p > i > img.cic').forEach(im => {
      const r = im.getBoundingClientRect();
      out.push({ k: im.dataset.curIc, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
                 tf: getComputedStyle(im.parentElement).transform,
                 itf: getComputedStyle(im).transform });
    });
    return out;
  });
  const pBad = P.filter(x => PCB_EXP[x.k] && (Math.abs(x.w - PCB_EXP[x.k].w) > 2 || Math.abs(x.h - PCB_EXP[x.k].h) > 2));
  ok(P.length >= 2 && pBad.length === 0,
     'D3 41 재화 바 아이콘 = HUD 와 같은 재화별 확정값 (gold 65.3×65.3 · dia 63×63 — 340·356)',
     P.map(x => x.k + ' ' + x.w + '×' + x.h).join(' · '));
  const pmBad = P.filter(x => PCB_EXP[x.k]
    && PCB_EXP[x.k].tf !== (x.itf !== 'none' && x.itf !== 'matrix(1, 0, 0, 1, 0, 0)'));
  ok(P.length >= 2 && pmBad.length === 0,
     'D3b 재화 바도 HUD 와 같은 기전 (gold=상자 크기 · dia=override 없음 — 340·356)',
     P.map(x => x.k + ' ' + (x.itf === 'none' ? '상자' : x.itf)).join(' · '));
  ok(P.every(x => x.tf === 'none' || x.tf === 'matrix(1, 0, 0, 1, 0, 0)'),
     'D4 재화 바 아이콘에 옛 scaleX 보정이 남지 않았다', P.map(x => x.tf).join(' | '));

  /* ---- [C2] 이미지가 실제로 뜬다(경로·SVG 문법) ---- */
  const dec = await page.evaluate(async () => {
    const wait = [];
    const out = [];
    for (const k of Object.keys(CUR_ICON)) {
      wait.push(new Promise(res => {
        const im = new Image();
        im.onload = () => { out.push({ k, src: CUR_ICON[k], w: im.naturalWidth, h: im.naturalHeight }); res(); };
        im.onerror = () => { out.push({ k, src: CUR_ICON[k], w: 0, h: 0 }); res(); };
        im.src = CUR_ICON[k];
      }));
    }
    await Promise.all(wait);
    return out;
  });
  /* 소스에서 뽑은 파일 집합 == 런타임 CUR_ICON 이 실제로 부른 파일 집합 (둘 다 «전수» 라 개수를
     못 박지 않는다 — 재화가 늘어도 같이 는다). 그 위에서 12종 전부 디코드되는지를 본다. */
  const decFiles = dec.map(x => x.src.split('/').pop()).sort();
  const sameSet = decFiles.length === ICONS.length && decFiles.join() === ICONS.slice().sort().join();
  ok(sameSet && dec.every(x => x.w > 0 && x.h > 0),
     'C2 ' + ICONS.length + '종이 실제로 디코드된다(경로·SVG 문법 · 소스↔런타임 같은 집합)',
     dec.map(x => x.k + ' ' + x.w + '×' + x.h).join(' · ')
     + (sameSet ? '' : ' | 집합 불일치: 소스 ' + ICONS.length + ' vs 런타임 ' + decFiles.length));

  /* ---- [E][F] 전 화면 스윕 ---- */
  const sweep = await page.evaluate(async (PURE) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const shut = () => ['closeShopPage','closeDungeon','closeDunDetail','closeRelw','closeMail','closeQuest',
      'closeAttend','closePass','closeBag','closeCurInfo','closeColl21','closeRank','closeBless','closeProfile',
      'closeTrain','closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    const steps = [
      ['메인', () => shut()],
      ['영웅', () => goTab('hero')],
      ['훈련', () => openTrain && openTrain()],
      ['던전', () => openDungeon()],
      ['던전세부', () => openDunDetail(DUNGEONS[0])],
      ['유물', () => openRelw && openRelw()],
      ['상점-소환', () => { openShopPage(); shopCat = 'sum'; setShopCatTabs('sum'); renderShopPage(); }],
      ['상점-재화', () => { openShopPage(); shopCat = 'coin'; setShopCatTabs('coin'); renderShopPage(); }],
      ['우편', () => openMail()],
      ['퀘스트', () => openQuest()],
      ['출석', () => openAttend()],
      ['패스', () => openPass()],
      ['가방', () => openBag()],
      ['재화정보-골드', () => openCurInfo('gold')],
      ['재화정보-다이아', () => openCurInfo('dia')],
      ['재화정보-유물', () => openCurInfo('relic')],
      ['도감', () => openColl21()],
      ['랭킹', () => openRank()],
      ['축복', () => openBless()],
      ['프로필', () => openProfile()],
    ];
    const srcs = {}, leaks = [], emo = [], nan = [], err = [];
    for (const [name, fn] of steps) {
      shut();
      try { fn(); } catch (e) { err.push(name + ': ' + e.message); continue; }
      await sleep(90);
      document.querySelectorAll('img.cic').forEach(im => {
        const r = im.getBoundingClientRect();
        if (!r.width) return;                                  /* 닫힌 오버레이 안은 세지 않는다 */
        (srcs[im.dataset.curIc] = srcs[im.dataset.curIc] || {})[im.getAttribute('src')] = 1;
      });
      const t = document.body.innerText || '';
      if (/<?img\s+class="cic"|cur-[a-z-]+\.svg/.test(t)) leaks.push(name);   /* '<' 가 떨어진 이스케이프본까지 */
      for (const e of PURE) if (t.indexOf(e) >= 0) emo.push(name + ':' + e);
      if (/\bNaN\b|\bundefined\b/.test(t)) nan.push(name);
    }
    return { srcs, leaks, emo, nan, err };
  }, PURE);

  ok(sweep.err.length === 0, 'E0 스윕 20개 화면이 전부 열렸다', sweep.err.join(' | ') || '20/20');
  const multi = Object.entries(sweep.srcs).filter(([, v]) => Object.keys(v).length !== 1);
  ok(multi.length === 0, 'E1 재화마다 아이콘 이미지가 정확히 1종',
     multi.length ? multi.map(([k, v]) => k + '→' + Object.keys(v).join('/')).join(' | ')
                  : Object.keys(sweep.srcs).map(k => k + '=' + Object.keys(sweep.srcs[k])[0].split('/').pop()).join(' · '));
  ok(!!(sweep.srcs.gold && sweep.srcs.gold['assets/ui/cur-gold.svg']),
     'E2 골드는 옛 🪙/💰/🥇 3종 대신 cur-gold.svg 하나', Object.keys(sweep.srcs.gold || {}).join(','));
  ok(!!(sweep.srcs.dia && sweep.srcs.dia['assets/ui/cur-dia.svg']),
     'E3 다이아는 cur-dia.svg 하나', Object.keys(sweep.srcs.dia || {}).join(','));
  ok(!!(sweep.srcs.relic && sweep.srcs.relic['assets/ui/cur-relic.svg']),
     'E4 유물조각은 cur-relic.svg 하나', Object.keys(sweep.srcs.relic || {}).join(','));
  ok(sweep.leaks.length === 0, 'F1 화면 텍스트에 아이콘 마크업 0건(textContent 유출 없음)',
     sweep.leaks.join(',') || '0건');
  ok(sweep.emo.length === 0, 'F2 화면 텍스트에 «순수 화폐» 이모지(🪙💰🎟️🎫) 0건',
     sweep.emo.slice(0, 6).join(',') || '0건');
  ok(sweep.nan.length === 0, 'F3 화면 텍스트에 NaN/undefined 0건', sweep.nan.join(',') || '0건');

  /* ---- [G] 58 파티클 ---- */
  const G = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    ['closeShopPage','closeDungeon','closeDunDetail','closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    document.querySelectorAll('#fxl .fx-fly').forEach(e => e.remove());
    fxFly({ x: 540, y: 1200 }, 'gold', 12345);
    for (let i = 0; i < 40 && !document.querySelector('#fxl .fx-fly'); i++) await sleep(16);
    const el = document.querySelector('#fxl .fx-fly');
    if (!el) return { n: 0 };
    const im = el.querySelector('img.cic');
    const r = im ? im.getBoundingClientRect() : null;
    return { n: document.querySelectorAll('#fxl .fx-fly').length,
             src: im ? im.getAttribute('src') : null,
             txt: el.textContent, w: r ? Math.round(r.width) : 0 };
  });
  ok(G.src === 'assets/ui/cur-gold.svg', 'G1 재화 비행 파티클이 CUR_ICON 이미지', String(G.src) + ' ×' + G.n);
  ok(G.txt === '', 'G2 파티클에 이모지 글자가 남지 않았다', JSON.stringify(G.txt));

  /* ---- [H] 입장권 5종(194 — 강화석 계열 · 203 — 룬강화석 계열 신설) ---- */
  const H = await page.evaluate(() => {
    openDungeon();
    const want = { gold: 'cur-ticket-gold.svg', dia: 'cur-ticket-dia.svg',
                   stone: 'cur-ticket-stone.svg',     /* 194 — 4번째 던전 계열 */
                   rstone: 'cur-ticket-rstone.svg' }; /* 203 — 5번째 던전 계열 */
    const got = DUNGEONS.map(d => {
      const m = String(DUN_UI[d.id].tk).match(/cur-ticket-[a-z]+\.svg/);
      return { id: d.id, tk: m ? m[0] : null,
               want: want[d.id] || 'cur-ticket-relic.svg' };
    });
    return got;
  });
  const tkBad = H.filter(x => x.tk !== x.want);
  ok(tkBad.length === 0, 'H1 던전 ' + H.length + '개의 입장권이 계열 5종과 일치',
     tkBad.length ? tkBad.map(x => x.id + '→' + x.tk).join(',') : H.map(x => x.id + ':' + x.tk.replace('cur-ticket-', '').replace('.svg', '')).join(' · '));
  ok(new Set(H.map(x => x.tk)).size === 5,
     'H2 입장권 종류는 5종뿐(골드·다이아·유물·강화석·룬강화석)', [...new Set(H.map(x => x.tk))].join(','));

  /* ---- [J] 제목 자리 금지 규칙 ----
     showModal 은 `<h2>` 를 **textContent** 로 넣고 앞머리 기호를 떼기까지 한다(«레퍼런스 헤더에는 이모지가 없다»).
     우편 제목 `m.t` 도 같은 정규식을 쓴다. 그래서 그 두 자리에 아이콘 마크업을 붙이면 **글자로 샌다**. */
  const titleBad = [];
  const clean = stripComments(SRC);
  const reTitle = /popup\(\s*curIc\(/g;
  if (reTitle.test(clean)) titleBad.push('popup() 제목에 curIc()');
  if (/\bt:\s*curIc\(/.test(clean)) titleBad.push('우편 t: 에 curIc()');
  ok(titleBad.length === 0, 'J1 모달·우편 «제목» 자리에는 아이콘을 넣지 않는다', titleBad.join(' | ') || '0건');

  /* ---- [I] 콘솔 ---- */
  ok(errs.length === 0, 'I1 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nVERIFY125 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
