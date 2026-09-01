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
 *       F2 는 **글리프를 담은 노드**로 판정한다(작업 373) — A1 이 소스에서 «아트 자리» 를 구조로 면제하듯
 *       런타임에서도 아트 자리 노드(`ART_NODE`)만 면제하고, 그 면제가 죽지 않았는지를 F2b 가 A3 처럼 본다.
 *       §R6~§R8 이 «글리프까지 · 그 자리에만» 을 되돌림 시험으로 못박는다.
 *   [G] 58 연출 — 재화 비행 파티클이 이모지가 아니라 CUR_ICON 이미지다(fxFly 직후 `.fx-fly>img.cic`).
 *   [H] 입장권 — **던전마다 한 장**(402 로 «계열 5종» 규약 폐기). 권종 키가 CUR_ICON 에 다 있고(H1),
 *       그림이 던전마다 다르며(H2), 03 카드가 그린 것이 선언과 같다(H3 — 손으로 적은 사본 금지).
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
/* ── 작업 373: F2 의 «아트 자리» 면제 — A1 과 같은 판정을 **런타임 층에서** 한다 ─────────
   373 이전의 F2 는 «화면 텍스트 한 덩어리»(`body.innerText`)에 PURE 글리프가 있으면 무조건
   빨갛게 봤다. 그런데 같은 파일의 A1 은 그중 🎫 한 자리(▦ 메뉴 «패스» 칸 `data-mn="pass"`)를
   **아트 자리로 이미 면제**하고 있었다 — 한 게이트가 같은 글리프를 반대로 말하던 자리다.
   F2 가 그동안 초록이었던 것은 판정이 일치해서가 아니라 **스윕이 ▦ 메뉴를 한 번도 안 열어서**다
   (`probe373` [1]·[2]: 메뉴를 열면 `i.mn-i` 가 **94.8×48.35 로 보이는 채** 🎫 를 흘린다).
   ⇒ 스윕에 ▦ 메뉴를 넣어 F2 가 그 화면을 **실제로 보게** 하고(아래 steps), 판정은
   «글리프 목록» 이 아니라 **글리프를 담은 노드**로 옮긴다.
   ⚠ **PURE 를 좁히지 않았다.** 등재문 처방 ⓐ(«🎟🎫 를 목록에서 뺀다»)는 `probe373` [5] 로 기각된다 —
      「던전 입장권을 이모지로 되돌린 화면」을 좁힌 목록은 **0건**으로 놓치고 아래 판정식은 잡는다.
   ⚠ 제품(🎫 글리프)은 **0줄**이다. ▦ 메뉴 7칸은 전부 같은 부품(`i.mn-i`)의 이모지 아트 자리이고
      (`probe373` [3]), measure/52 §6-3 «아트 필요» 표가 그 7칸을 통째로 아트 대기로 등재해 뒀다.
      패스 칸만 전용 아트로 바꾸면 형제 6칸과 규격이 갈린다(등재문 ⓑ 의 제품 절반을 이 근거로 기각).
   면제는 **셋이 모두 맞을 때만** 듣는다 — ① 그 자리(선택자) ② 그 글리프 ③ 노드 텍스트가 그 글리프 하나뿐.
   §R6·§R7 되돌림 시험이 ①②를, F2b(죽은 항목)가 «항목이 조용히 죽는 것» 을 못박는다. */
const ART_NODE = [
  { sel: '#mnw .mn-b[data-mn="pass"] > i.mn-i', g: '\u{1F3AB}',
    why: '52 ▦ 메뉴 «패스» 칸 아이콘 — A1 이 data-mn="pass" 로 이미 면제한 아트 자리(measure/52 §6-3)' },
  /* ── 작업 607(2026-08-31) — 69 우편 행 **썸네일**. 373 이 ▦ 메뉴에서 잡은 것과 **같은 병**이다:
     A1 은 이 자리를 `ART_SLOT`(`ic:'…'` 한 글리프) 규칙으로 **이미 구조로 면제**하는데 F2 는 몰랐다.
     F2 가 초록이던 이유는 판정이 일치해서가 아니라 **스윕이 그 그림을 한 번도 안 봐서**다 —
     기본 세이브에는 그 통이 없고, 스윕에서 아무도 **사지 않았다**(`probe607` [1] 사기 전 0건 →
     [2] 산 뒤 1건 · [4] `span.ml-i.ifr` **108×108** 로 보이는 채 🎫 를 흘린다).
     ⇒ 아래 스윕에 «우편-결제확인» 단계를 넣어 **실제로 사서 보게** 했고, 판정은 이 항이 받는다.
     ⚠ 여기서 면제하는 것은 **제목이 아니라 썸네일**이다 — 제목 머리글자는 애초에 화면에 안 오고
        (`^[^가-힣\w]+` strip · `probe607` [3][5][6]), 만약 오게 되면 `.ml-t` 는 이 목록에 없으므로
        F2 가 그대로 잡는다. §R9 가 그 갈림을 되돌림 시험으로 못박는다.
     ⚠ 179/589 의 «보상 0통» 예외(`m.ic` 썸네일)가 사라지면 F2b 가 «죽은 항목» 으로 먼저 빨개진다. */
  { sel: '.ml-r .ml-i', g: '\u{1F3AB}',
    why: '69 우편 행 썸네일 — 589 결제 목업의 `ic:\'🎫\'` 아트 자리(A1 이 ART_SLOT 으로 이미 면제)' },
];
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
     125 가 통일한 화폐는 재화 7종(골드·다이아·유물조각·강화석·룬강화석·단련석·마일리지) +
     **던전 입장권**(`cur-ticket-*.svg` — 402 이후 **던전마다 한 장**이라 던전이 늘면 같이 는다.
     종수를 여기 적어 두지 않는 이유가 그것이다. H1~H3 이 던전 수와의 일치로 못 박는다)이다.
     124·151 의 «이용권» 은 상점 **상품**(오프라인 보상 +4시간 등)이라 그 어느 것도 아니다 —
     `curIc('tkDia')` 로 옮기면 **던전 입장권 아이콘을 상점 상품 토스트에 붙이는 오표기**가 된다. */
  /* ── 작업 607(2026-08-31): 그 토스트는 **사라졌다** — 자리를 비우지 않고 **살아 있는 표본으로 옮긴다**.
     588·589 가 이용권·프리미엄 패스 구매를 `payMock()` + 우편 한 통으로 갈아 끼우면서 «… 이용권 — …»
     토스트가 없어졌고, 항목이 죽은 채 굳어 A3 가 빨개졌다(등재문의 뿌리 ②). 그냥 지우면 289 가 세운
     판정(«🎫/이용권 표기는 화폐가 아니다»)을 지키는 항이 **한 줄도 안 남는다** — 333 처방대로 방향을
     안 바꾸고 **같은 판정의 살아 있는 자리**로 갈아 끼운다. 그 자리가 곧 A1 이 새로 빨개진 줄이다:
       `sendMail({ t:'🎫 프리미엄 패스 — ' + …, ic:'🎫', … })`  (index.html · 589 결제 목업)
     ⚑ **집 관행이 「제목 머리에 글리프 한 자」다** — 같은 파일의 우편 여섯 통이 전부 그렇다
        (`📅 월별 다이아` · `🛒 …` ×3 · `📦 …` ×2). 589 는 그 관행을 그대로 따랐고, 하필 고른 글리프
        하나가 `CUR_EMOJI` 안에 있었을 뿐이다.
     ⚑ **왜 «화폐가 아니다» 인가 — `tools/probe607.js` 가 찍은 값이 근거다**:
       ⓐ 그 머리 글리프는 **화면에 한 번도 안 온다**. 우편 제목을 그리는 두 자리가 모두
          `m.t.replace(/^[^가-힣\w]+/, '')` 로 머리 기호를 뗀다(우편 행 `.ml-t` 28231 · 수령 토스트 25810)
          — `probe607` [3] 제목 «프리미엄 패스 — 스테이지» · [5] 토스트 «우편 확인 — 프리미엄 패스 — 스테이지».
          그리고 그것이 우연이 아님을 **[6] 음성항**이 못박는다(같은 글리프를 문장 **가운데**로 옮기면
          제목에 그대로 샌다 → 그 자리는 여전히 F2 가 잡는다).
       ⓑ 등재문 갈래 ⓐ(«제목·아이콘을 `curIc()` 계열로 옮긴다»)는 **오표기**다 — `cur-ticket-*.svg` 는
          전부 **던전 입장권**이고(H1~H3), 패스 구매 우편에 붙이면 289(이용권)·211(쿠폰)·370(패스 토스트)이
          이미 세 번 기각한 그 오표기가 된다.
     ⚠ 항목에 **글리프까지 적어 둔다**(370 규약) — §R2b 가 그 무름을 되돌림 시험으로 못박는다.
     ⚑ 남은 절반(썸네일 `ic:'🎫'` 은 화면에 **실제로 그려진다** · `probe607` [4] 108×108)은 소스가 아니라
        런타임 몫이라 [F] 의 `ART_NODE` + 스윕이 받는다 — 아래 그 자리를 보라. */
  /* ⚑ **697(2026-09-02)이 이 항목의 앵커를 없앴다** — 구매 확인 우편을 안 보내므로 그 제목
     리터럴이 제품에서 사라졌고, 남겨 두면 A3 이 «죽은 항목» 으로 잡는다(그것이 A3 의 일이다).
     지우되 **판정은 안 비운다**: 같은 판정(«🎫 는 화폐가 아니다»)을 아래 370 항목
     (`'🎫 <b>일괄 받기</b> '` — 35 패스 일괄 받기 토스트)이 **살아 있는 자리**에서 그대로 진다.
     썸네일 쪽 면제(`.ml-r .ml-i`)는 옛 세이브의 통이 여전히 그리므로 [F]·§R9 에 그대로 남는다. */
  /* ── 작업 211 판정: 🎟 «쿠폰» 은 화폐가 아니다 ──────────────────────────────
     쿠폰 코드(`CF_CODES`)도 화폐가 아니라서 `curIc('tkDia')`/`curIc('tkRelic1')` 로 옮기면 같은
     오표기가 된다. 실제 «지급물» 인 다이아는 이미 같은 줄에서 `curIc('dia')` 로 나가고 있다. */
  '사용할 수 없는 코드입니다',                /* 쿠폰 — 잘못된 코드 토스트 */
  '이미 사용한 코드입니다',                   /* 쿠폰 — 중복 사용 토스트 */
  'fmt(CF_CODES[code])',                      /* 쿠폰 — 획득 토스트(지급물 다이아는 curIc('dia')) */
  /* ── 작업 370 판정: 🎫 «패스» 는 화폐가 아니다 (289 판정의 같은 줄기) ──────────────
     302 가 35 패스에 [일괄 받기] 를 붙이면서 그 토스트가 새로 생겼고, 목록이 안 따라와 A1 이 빨개졌다.
     **A1 이 새 줄에 빨개진 것 자체는 부패가 아니라 게이트가 제 일을 한 것**이다 — 판정만 하면 된다.
     `tools/probe370.js` 로 찍힌 값이 판정의 근거다:
       ⓐ 그 토스트의 **재화는 이미 전부 `curIc()` 이미지**로 나간다
          (`gold:cur-gold.svg · dia:cur-dia.svg · relic:cur-relic.svg` — 125 규약 준수) ·
          남은 이모지는 머리글자 **🎫 ×1** 뿐이라 이 글리프는 «화폐 표시» 자리가 아니다.
       ⓑ 🎫 는 이 게임에서 **«패스» 기능의 글리프**다 — ▦ 메뉴 «패스» 칸(`data-mn="pass"`, 실측 아이콘 "🎫" ·
          라벨 "패스")을 A1 이 **이미 위에서 면제**하고 있다. 같은 기능의 토스트 머리에 같은 글리프가 온 것이다.
       ⓒ 등재문 처방 ⓐ(«문구를 `curIc('ticket…')` 계열로 갈아 끼운다»)는 **오표기가 된다** — 그것들은
          전부 `cur-ticket-*.svg` = **던전 입장권** 자산이고(H1~H3 이 던전 권종으로 못 박는다),
          패스 토스트에 붙이면 124·151 «이용권» 에서 289 가, 쿠폰에서 211 이 이미 기각한 그 오표기다.
     ⚠ 항목에 **글리프까지 적어 둔다** — «일괄 받기» 만 적으면 머리글자가 🪙 로 바뀌어도 초록이 된다.
        §R2 가 그 무름을 되돌림 시험으로 못박는다. */
  "'\u{1F3AB} <b>일괄 받기</b> '",             /* 302 패스 [일괄 받기] 토스트 머리글자(재화 아님) */
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

/* A1·A2·A3 의 스캐너 본체(작업 370 이 함수로 뺐다). **§R 되돌림 시험이 이것을 그대로 다시 부른다** —
   시험이 자기만의 사본을 들고 있으면 «게이트는 무른데 시험만 초록» 이 되기 때문이다(334 교훈). */
function scanEmoji(bare) {
  const leftovers = [];
  let artHits = 0;                      /* 규칙(ART_SLOT)으로 빠진 줄 */
  const allowUse = ALLOW.map(() => 0);  /* 허용 목록 항목별 적중 수 — A2·A3 이 같이 읽는다 */
  bare.split('\n').forEach((ln, i) => {
    if (!CUR_EMOJI.some(e => ln.indexOf(e) >= 0)) return;
    /* ① 아트 자리(ic:/art: 한 글리프)를 지운 뒤에도 이모지가 남는지로 본다 */
    if (!CUR_EMOJI.some(e => ln.replace(ART_SLOT, '').indexOf(e) >= 0)) { artHits++; return; }
    /* ② 나머지는 줄 단위 허용 목록 */
    const k = ALLOW.findIndex(a => ln.indexOf(a) >= 0);
    if (k >= 0) { allowUse[k]++; return; }
    leftovers.push((i + 1) + ': ' + ln.trim().slice(0, 80));
  });
  return { leftovers, artHits, allowUse, dead: ALLOW.filter((a, k) => allowUse[k] === 0) };
}

(async () => {
  /* ---- [A] 소스 스캔 ----
     `BARE` = 주석을 «같은 길이의 공백» 으로 지운 소스. 길이가 원본과 1:1 이라 문자 오프셋·줄 번호가
     그대로 통한다 — [A] 와 [B] 가 같은 전처리를 공유하게 하려고 한 번만 만들어 둔다(작업 145). */
  const BARE = stripComments(SRC);
  const { leftovers, artHits, allowUse } = scanEmoji(BARE);
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

  /* ---- §R 되돌림 시험(작업 370 신설) ----
     A1 은 «전 화면에서 화폐 이모지를 걷어냈다»(125 본체)를 지키는 **유일한 자**다. 그래서 허용 목록에
     한 줄을 더할 때마다 «이 항목이 무엇을 여전히 잡는가» 를 같이 못박아야 한다 — 안 그러면 목록이
     한 줄씩 자라다가 어느 날 아무것도 안 잡는 초록이 된다(334 «무르게 푼 수리» 와 같은 함정).
     시험은 **소스를 고치지 않는다** — 메모리 위에서 변조본을 만들어 A1 과 **같은 `scanEmoji()`** 에 먹인다. */
  const R = (name, mutate, want) => {
    const r = scanEmoji(mutate(BARE));
    /* ⚠ 작업 607 — 이 그물도 **목록과 같이 늙는다**. «이용권» 은 588·589 가 그 토스트를 걷어낸 뒤로
       아무 줄도 안 잡으므로 살아 있는 표본(«프리미엄 패스»)으로 갈아 끼웠다. 그물이 죽으면
       §R1~§R3 이 «0건인데 초록» 이 되는 것이 아니라 **엉뚱한 줄을 세지 않아 조용히 통과**한다. */
    const got = r.leftovers.filter(l => /RSEED|일괄 받기|프리미엄 패스|코드입니다/.test(l));
    ok(want(r, got), name, (r.leftovers.length ? r.leftovers.length + '건 빨강' : '0건 = 초록')
       + (got.length ? ' · ' + got[0].slice(0, 72) : '')
       + (r.dead.length ? ' · 죽은 항목 ' + r.dead.map(a => JSON.stringify(a)).join(',') : ''));
  };
  /* R1 — 화폐 이모지를 «한 개 도로 심으면» 빨개지는가(등재문이 요구한 짝). 머리글자 자리라도 예외 없다:
         🪙 는 `cur-gold.svg` 가 있는 진짜 화폐라 토스트 머리에 와도 125 위반이다. */
  R('§R1 화폐 이모지(🪙)를 토스트에 도로 심으면 A1 이 빨개진다',
    b => b + "\n  notify('\u{1FA99} <b>골드</b> +' + n);   /*RSEED*/\n",
    (r, got) => got.length === 1);
  /* R2 — **370 항목이 «일괄 받기» 라는 말이 아니라 «🎫» 라는 글리프에 걸려 있는가.**
         머리글자만 🪙 로 바꾼 줄은 여전히 빨개져야 한다. 여기가 초록이면 그 항목은 무르게 푼 것이다. */
  R('§R2 370 항목은 글리프까지 못 박는다(머리글자를 🪙 로 바꾸면 빨강)',
    b => b.replace("'\u{1F3AB} <b>일괄 받기</b> '", "'\u{1FA99} <b>일괄 받기</b> '"),
    (r, got) => got.length === 1);
  /* R3 — 항목은 **그 줄에만** 듣는다. 같은 문구를 쓰더라도 다른 화폐 이모지가 함께 있는 별개의 줄은 잡힌다. */
  R('§R3 허용은 그 줄에만 듣는다(같은 문구 + 💎 인 새 줄은 빨강)',
    b => b + "\n  notify('\u{1F48E} <b>일괄 받기</b> ' + n);   /*RSEED*/\n",
    (r, got) => got.length === 1);
  /* R4 — 제품에서 그 줄이 사라지면 **A3 이 먼저** 잡는다(항목이 조용히 죽은 채 굳지 않는다). */
  R('§R4 그 줄이 사라지면 A3 이 죽은 항목으로 잡는다',
    b => b.replace("notify('\u{1F3AB} <b>일괄 받기</b> '", "notify('<b>일괄 받기</b> '"),
    r => r.dead.length === 1 && r.dead[0].indexOf('일괄 받기') >= 0);
  /* ── 작업 607 이 «결제 목업 우편 제목» 항목에 달아 둔 짝(§R2b·§R4b)은 **697 이 그 항목을
     없애면서 같이 간다** — 시험이 변조할 리터럴이 제품에 없다. 370 규약(«항목 하나에 짝 하나»)은
     깨지지 않는다: 남은 🎫 항목은 위의 «일괄 받기» 하나이고 그 짝이 §R2·§R4 다. */
  /* R5 — 음성 대조: 아무것도 안 건드리면 초록이어야 한다(시험 자체가 항상 빨간 게 아님을 못박는다). */
  R('§R5 변조가 없으면 초록(시험이 «항상 빨강» 이 아니다)', b => b, r => r.leftovers.length === 0);

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
    /* ⚑ 644(2026-09-01) — 옛 술어는 `viewBox="0 0 64 64"` **문자열**이었다. 644 가 15장의 viewBox 를
       각자의 잉크 bbox 로 잘라(채움비 1.0000 통일) 그 문자열이 아트마다 달라졌다.
       C1 이 실제로 지키려던 것은 «파일이 있고 · <svg> 이고 · viewBox 가 유효하다» 이고(이 절의 머리말),
       `.cic` 가 기대는 계약은 **캔버스가 정사각 64** 라는 것이다(`width/height` 가 그것을 정한다 —
       viewBox 는 그 캔버스 안에서 `preserveAspectRatio` 로 맞춰 들어간다).
       ⇒ 술어를 «네 수짜리 viewBox + width/height 64» 로 옮긴다 — **넓힌 것이 아니라 옮긴 것**이다:
         옛 술어가 잡던 것(viewBox 없음·깨진 값)은 그대로 잡히고, 자르기 값 자체는
         `tools/verify644.js` [A]·[C]·[C2] 가 «잉크 bbox 와 같은가» 로 **더 세게** 지킨다. */
    return !/<svg[\s\S]*?viewBox="\s*-?[\d.]+\s+-?[\d.]+\s+[\d.]+\s+[\d.]+\s*"/.test(t)
        || !/<svg[\s\S]*?width="64"[\s\S]*?height="64"/.test(t);
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
  /* ⚑ 671(2026-09-01) — dia 59.06 → **65.3 = 골드와 같은 값**. 위 D3 주석이 «자산이 고쳐지면
     D1 과 함께 내린다» 고 적어 둔 그 자리이고, **이번이 그 «자산이 고쳐진» 회차다.**
     644 는 아트가 비등방인 채로(색÷실루엣 가로 .848 · 세로 .973) 잉크를 Δ0 으로 보존하느라
     두 재화의 상자를 다르게 뒀다 — 같은 프레임 안 덩치 비 **1.106** 이 411·356 눈금(≤1.05)을 넘었다.
     671 이 `cur-dia.svg` 의 테 규격을 **.875 등방**으로 다시 그려 «같은 상자 = 같은 잉크» 가 됐다.
     ⇒ 이제 두 재화가 **한 값**이고, 그것이 이 D1·D3 이 원래 말하려던 것이다(«재화별 확정값» 이
     둘로 갈려 있던 것은 아트 결손의 그림자였다). 음성항은 `verify340` [2](색 잉크·실루엣 ref ±3)와
     `verify671` [C](자리 잉크 덩치 비 ≤1.05)다. */
  const HUD_EXP = { gold: { w: 65.3, h: 65.3, tf: false }, dia: { w: 65.3, h: 65.3, tf: false } };
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
     'D1 HUD 아이콘 확정 크기 — 코인·젬 둘 다 65.3×65.3 (671 이관: 아트 .875 등방 재작도로 한 값이 됐다)',
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
  /* ⚑ 671 — D1 과 같은 이관(위 주석). dia 59.06 → 65.3 = 코인과 한 값. */
  const PCB_EXP = { gold: { w: 65.3, h: 65.3, tf: false }, dia: { w: 65.3, h: 65.3, tf: false } };  /* 356·671 이관 */
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
     'D3 41 재화 바 아이콘 = HUD 와 같은 확정값 (코인·젬 둘 다 65.3×65.3 — 340·356·644·671)',
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

  /* ---- [E][F] 전 화면 스윕 ----
     F2 판정 본체를 **페이지에 한 번만 심는다**(작업 373) — 스윕과 §R6~§R8 되돌림 시험이 **같은 함수**를
     부르게 하기 위해서다. 시험이 자기 사본을 들면 «게이트는 무른데 시험만 초록» 이 된다(334 교훈). */
  await page.evaluate(([PURE, ART]) => {
    window.__f2scan = () => {
      /* 재는 대상은 373 이전과 같다 — **화면 텍스트**(`body.innerText`). 달라진 것은 «있으면 빨강» 이
         아니라 그 글리프를 담은 **보이는 호스트 노드**를 찾아 아트 자리인지 가르는 것뿐이다. */
      const t = document.body.innerText || '';
      const found = PURE.filter(e => t.indexOf(e) >= 0);
      const leaks = [], art = [], seen = [];
      if (!found.length) return { leaks, art };
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const v = n.nodeValue || '';
        const gs = PURE.filter(e => v.indexOf(e) >= 0);
        if (!gs.length) continue;
        const el = n.parentElement; if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;                 /* 닫힌 오버레이(0×0)는 «화면 텍스트» 가 아니다 */
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || +st.opacity === 0) continue;
        const desc = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
          + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : '')
          + '[' + Math.round(r.width) + '×' + Math.round(r.height) + ']';
        for (const g of gs) {
          seen.push(g);
          const k = ART.findIndex(a => {
            try { return el.matches(a.sel) && a.g === g && v.trim() === g; } catch (e) { return false; }
          });
          if (k >= 0) art.push({ k, g, desc }); else leaks.push({ g, desc, txt: v.trim().slice(0, 40) });
        }
      }
      /* innerText 에는 있는데 «보이는 호스트» 를 못 찾은 글리프 = 분류 불가 → 유출로 센다.
         (무르게 풀지 않는다 — 판정식이 못 읽는 자리는 면제가 아니라 실패다) */
      for (const g of found) if (seen.indexOf(g) < 0) leaks.push({ g, desc: '(호스트 미상)', txt: '' });
      return { leaks, art };
    };
  }, [PURE, ART_NODE]);

  const sweep = await page.evaluate(async (ART_N) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    /* ⚠ 작업 373 — `closeMenu` 가 여기 있어야 한다. ▦ 메뉴는 스윕 단계로 들어왔는데 닫는 손이 없으면
       그 뒤 19화면이 메뉴를 얹은 채 찍히고, 🎫 가 화면마다 새어 판정이 통째로 흐려진다. */
    const shut = () => ['closeShopPage','closeDungeon','closeDunDetail','closeRelw','closeMail','closeQuest',
      'closeAttend','closePass','closeBag','closeCurInfo','closeColl21','closeRank','closeBless','closeProfile',
      'closeTrain','closeMenu','closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
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
      /* 작업 373 — 20화면 어디도 ▦ 메뉴를 열지 않아 F2 가 «판정이 일치해서» 가 아니라
         «그 화면을 본 적이 없어서» 초록이었다(`probe373` [1]). 이제 실제로 본다. */
      ['▦ 메뉴', () => openMenu()],
      /* 작업 607 — 같은 병의 두 번째 자리. «우편» 단계는 **기본 세이브의 우편함**이라 589 결제 목업이
         만드는 통이 없다(`probe607` [1] 0건). 그 통에만 `ic:'🎫'` 썸네일이 붙으므로, 사지 않으면
         F2 는 그 그림을 영원히 못 본다. **맨 끝에 둔다** — 이 단계는 `S.pass.prem`·`S.mailx` 를
         바꾸므로 앞 화면들이 그 상태를 얹은 채 찍히면 안 된다. */
      /* 697(2026-09-02) — 구매가 더는 확인 우편을 만들지 않는다(우편함 경유 폐지). 하지만
         **옛 세이브에는 그 통이 남아 있고**(주인 «기존 우편 소급 삭제 금지») 그 행은 여전히
         이 썸네일을 그린다 ⇒ 표본을 «사서 만든다» 에서 «옛 통을 주입한다» 로 옮긴다.
         `sendMail` 의 `ic` 스키마(589·179 «보상 0통» 예외)가 살아 있는 한 이 그림은 실재한다. */
      ['우편-결제확인', () => {
        sendMail({ t:'\u{1F3AB} 프리미엄 패스 — 스테이지', ic:'\u{1F3AB}', iq:'프리미엄', ig:4,
                   b:'옛 세이브에 남아 있는 구매 확인 우편(697 이전 발송분)' });
        openMail();
      }],
    ];
    const srcs = {}, leaks = [], emo = [], nan = [], err = [];
    const artUse = ART_N.map(() => 0);        /* 아트 자리 면제 항목별 적중 수 — F2b 가 읽는다 */
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
      const f2 = window.__f2scan();
      f2.leaks.forEach(l => emo.push(name + ':' + l.g + '@' + l.desc + (l.txt ? ' «' + l.txt + '»' : '')));
      f2.art.forEach(a => { artUse[a.k]++; });
      if (/\bNaN\b|\bundefined\b/.test(t)) nan.push(name);
    }
    return { srcs, leaks, emo, nan, err, artUse, n: steps.length };
  }, ART_NODE);

  ok(sweep.err.length === 0, 'E0 스윕 ' + sweep.n + '개 화면이 전부 열렸다',
     sweep.err.join(' | ') || sweep.n + '/' + sweep.n);
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
  ok(sweep.emo.length === 0, 'F2 화면 텍스트에 «순수 화폐» 이모지(🪙💰🎟️🎫) 0건 — 아트 자리 노드만 면제(373)',
     sweep.emo.slice(0, 6).join(',') || '0건 (아트 자리 면제 '
       + sweep.artUse.reduce((a, b) => a + b, 0) + '건)');
  /* F2b — A3 과 같은 자다(작업 373). 면제 항목이 **아무것도 안 잡는 채 굳는 것**을 막는다:
     제품에서 그 자리가 사라지거나 선택자가 어긋나면 여기가 먼저 빨개진다. 스윕이 ▦ 메뉴를
     실제로 열게 됐으므로 이 항목은 «적중 0» 이면 곧 «스윕이 그 화면을 다시 안 본다» 는 뜻이다. */
  const artDead = ART_NODE.filter((a, k) => sweep.artUse[k] === 0);
  ok(artDead.length === 0, 'F2b 아트 자리 면제에 죽은 항목 0건(스윕이 그 화면을 실제로 본다)',
     artDead.length ? artDead.map(a => a.sel).join(' | ')
                    : ART_NODE.map((a, k) => a.sel + ' ×' + sweep.artUse[k]).join(' · '));
  ok(sweep.nan.length === 0, 'F3 화면 텍스트에 NaN/undefined 0건', sweep.nan.join(',') || '0건');

  /* ---- §R6~§R8 — F2 면제의 되돌림 시험(작업 373) ----
     A1 의 §R1~§R5 와 같은 뜻이다: «이 면제가 무엇을 **여전히** 잡는가» 를 짝으로 못박지 않으면
     목록이 자라다가 어느 날 아무것도 안 잡는 초록이 된다. 소스는 안 고치고 **DOM 위 변조본**을
     스윕이 쓴 **같은 `window.__f2scan()`** 에 먹인다(334 교훈). 시험 뒤 원복까지가 한 벌이다. */
  const RT = await page.evaluate(() => {
    ['closeShopPage','closeDungeon','closeDunDetail','closeRelw','closeMail','closeQuest','closeAttend',
     'closePass','closeBag','closeCurInfo','closeColl21','closeRank','closeBless','closeProfile','closeTrain',
     'closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    openMenu();
    const i = document.querySelector('#mnw .mn-b[data-mn="pass"] > i.mn-i');
    const l = document.querySelector('#mnw .mn-b[data-mn="pass"] > i.mn-l');
    if (!i || !l) return { miss: true };
    const oi = i.textContent, ol = l.textContent;
    i.textContent = '\u{1FA99}';                     /* R6 — 자리는 그대로, 글리프만 진짜 화폐로 */
    const r6 = window.__f2scan();
    i.textContent = oi;
    l.textContent = '\u{1F3AB}';                     /* R7 — 글리프는 그대로, 자리만 라벨 칸으로 */
    const r7 = window.__f2scan();
    l.textContent = ol;
    const r8 = window.__f2scan();                    /* R8 — 원복하면 초록 */
    closeMenu();
    return { miss: false,
             r6: r6.leaks.map(x => x.g + '@' + x.desc), r6a: r6.art.length,
             r7: r7.leaks.map(x => x.g + '@' + x.desc), r7a: r7.art.length,
             r8: r8.leaks.length, r8a: r8.art.length };
  });
  ok(!RT.miss && RT.r6.length === 1 && RT.r6a === 0,
     '§R6 면제는 글리프까지 못 박는다(패스 칸을 🪙 로 바꾸면 F2 빨강)',
     RT.miss ? '패스 칸 없음' : (RT.r6.join(',') || '0건 = 초록(무름)'));
  ok(!RT.miss && RT.r7.length === 1,
     '§R7 면제는 그 자리에만 듣는다(같은 🎫 라도 라벨 칸에 있으면 빨강)',
     RT.miss ? '패스 칸 없음' : (RT.r7.join(',') || '0건 = 초록(무름)'));
  ok(!RT.miss && RT.r8 === 0 && RT.r8a === 1,
     '§R8 원복하면 초록(시험이 «항상 빨강» 이 아니다)',
     RT.miss ? '패스 칸 없음' : '유출 ' + RT.r8 + '건 · 면제 ' + RT.r8a + '건');

  /* ---- §R9~§R11 — 607 이 더한 «우편 썸네일» 면제의 되돌림 시험 ----
     ART_NODE 의 두 번째 항목에도 373 과 **같은 짝**을 단다. 특히 §R9 가 이 작업의 판정을 못박는다:
     면제한 것은 **썸네일**이지 **제목**이 아니다 — 제목 자리에 같은 🎫 가 오면 여전히 빨개져야 한다
     (`probe607` [6] 이 그 자리가 실제로 새는 것을 제품에서 확인했다). */
  const RT2 = await page.evaluate(() => {
    ['closeShopPage','closeDungeon','closeDunDetail','closeRelw','closeMail','closeQuest','closeAttend',
     'closePass','closeBag','closeCurInfo','closeColl21','closeRank','closeBless','closeProfile','closeTrain',
     'closeMenu','closeModal'].forEach(f => { try { window[f] && window[f](); } catch (e) {} });
    openMail();
    /* 스윕의 마지막 단계가 이미 사 두었다 — 그 통의 행을 id 로 집는다(첫 행은 고정 우편이다). */
    const m = (S.mailx || []).filter(x => x.ic === '\u{1F3AB}').slice(-1)[0];
    const btn = m && document.querySelector('.ml-b[data-ml="' + m.id + '"]');
    const row = btn && btn.closest('.ml-r');
    const ic = row && row.querySelector('.ml-i');
    const t = row && row.querySelector('.ml-t');
    if (!ic || !t) return { miss: true };
    const oi = ic.firstChild && ic.firstChild.nodeType === 3 ? ic.firstChild : null;
    if (!oi) return { miss: true };
    const ov = oi.nodeValue, ot = t.textContent;
    oi.nodeValue = '\u{1FA99}';                      /* R9a — 자리는 그대로, 글리프만 진짜 화폐로 */
    const r9a = window.__f2scan();
    oi.nodeValue = ov;
    t.textContent = '\u{1F3AB} ' + ot;               /* R9b — 글리프는 그대로, 자리만 제목 칸으로 */
    const r9b = window.__f2scan();
    t.textContent = ot;
    const r10 = window.__f2scan();                   /* R10 — 원복하면 초록 */
    try { window.closeMail && window.closeMail(); } catch (e) {}
    return { miss: false,
             r9a: r9a.leaks.map(x => x.g + '@' + x.desc),
             r9b: r9b.leaks.map(x => x.g + '@' + x.desc),
             r10: r10.leaks.length, r10a: r10.art.length };
  });
  ok(!RT2.miss && RT2.r9a.length === 1,
     '§R9a 우편 썸네일 면제는 글리프까지 못 박는다(같은 자리를 🪙 로 바꾸면 F2 빨강)',
     RT2.miss ? '결제 목업 우편 없음' : (RT2.r9a.join(',') || '0건 = 초록(무름)'));
  ok(!RT2.miss && RT2.r9b.length === 1,
     '§R9b 면제는 썸네일에만 듣는다(같은 🎫 라도 «제목» 칸에 있으면 빨강 — 607 판정의 본체)',
     RT2.miss ? '결제 목업 우편 없음' : (RT2.r9b.join(',') || '0건 = 초록(무름)'));
  ok(!RT2.miss && RT2.r10 === 0 && RT2.r10a >= 1,
     '§R10 원복하면 초록(시험이 «항상 빨강» 이 아니다)',
     RT2.miss ? '결제 목업 우편 없음' : '유출 ' + RT2.r10 + '건 · 면제 ' + RT2.r10a + '건');

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

  /* ---- [H] 입장권은 **던전마다 한 장**(402 — 주인 지시 2026-08-29) ----
     ⚠ 이 절은 402 에서 **뜻이 뒤집혔다.** 종전 H1·H2 는 «입장권은 던전 계열로만 갈린다 · 종류는
       5종뿐» 을 단언했다(125 가 세우고 194·203 이 이어 온 규약). 주인이 «던전 입장권 색이 다
       달라야 하는데 안그러고 있네» 라고 그 규약 자체를 뒤집었으므로 자도 같이 뒤집는다
       (356 이 «비균등 스케일 금지» 로 관행을 뒤집은 것과 같은 꼴).
     ⚠ 스코프는 **`DUNGEONS` 8개**다 — 탑 2장(tower·despair)은 `DUNGEONS` 에 없고 카드가
       `.sp.tk` 에 «♾️ 없음» 을 그린다(209). 402 가 그 두 칸의 죽은 `tk:` 필드를 걷어냈다.
     ⚠ 숫자(«5종»)를 손으로 적지 않는다 — 그 상수가 194·203 에서 두 번 뒤처졌고, 이번에도
       뒤처졌을 자리다. 세는 것은 **던전 수와의 일치**이지 어떤 상수가 아니다. */
  const H = await page.evaluate(() => {
    openDungeon();
    const got = DUNGEONS.map((d) => {
      const k = dunTk(d.id);
      const src = CUR_ICON[k] || null;
      /* 03 던전 카드가 **실제로 그린** 그림 — 선언만 보면 «카드는 옛 사본을 그린다» 를 놓친다 */
      const card = document.querySelector('#dunList [data-dcard="' + d.id + '"] .sp.tk img.cic');
      return { id: d.id, k, src: src ? src.split('/').pop() : null,
               drawn: card ? card.getAttribute('src').split('/').pop() : null };
    });
    return got;
  });
  const hMiss = H.filter((x) => !x.src);
  ok(hMiss.length === 0, 'H1 던전 ' + H.length + '개의 권종 키가 CUR_ICON 에 전부 있다',
     hMiss.length ? hMiss.map((x) => x.id + '→' + x.k).join(',')
                  : H.map((x) => x.id + ':' + x.k).join(' · '));
  const hDup = new Set(H.map((x) => x.src));
  ok(hDup.size === H.length,
     'H2 입장권 그림이 던전마다 다르다(중복 0건 · 402 로 «계열 5종» 규약 폐기)',
     H.length + '던전 → ' + hDup.size + '종');
  const hDrawn = H.filter((x) => x.drawn !== x.src);
  ok(hDrawn.length === 0, 'H3 03 카드가 그린 그림 = 선언(손으로 적은 사본이 없다)',
     hDrawn.length ? hDrawn.map((x) => x.id + ' 선언 ' + x.src + ' ≠ 그림 ' + x.drawn).join(' | ')
                   : H.length + '장 일치');

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
