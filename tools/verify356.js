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
 *   [F] 프레임 축 래칫 — **9:13.3(1080×1600)** 에서도 비균등 «자리» 0 (14회차 신설 · 351·403·404 의 그 프레임)
 *   [C] 잘림 0 — 스코프 아이콘의 글리프 advance 가 호스트 상자를 안 넘는다(357 함정)
 *   [R] 되돌림 시험 — 스코프 노드에 scaleX 를 도로 주입하면 [A] 가 실제로 빨개진다
 *   [G] 출처 축 — 캔버스 안·비트맵 상자·svg (23회차)
 *   [H] 축 인구조사 — 자가 «안 보는» 그리기 경로가 소스에 생겼는가 (24회차)
 *   [I] **시간 축** — 애니메이션 **한 주기**를 위상 스윕으로 훑는다 (25회차 신설).
 *       위 절이 전부 «가라앉은 한 점» 을 보는 자라, 도는 동안만 갈리는 종횡을 못 봤다.
 *   [J] **의사 축** — `::before`/`::after` 가 그리는 아이콘 (26회차 신설).
 *       위 절이 전부 `querySelectorAll('*')` 위에 서 있는데 그 함수는 의사 요소를 안 돌려준다.
 *   [L] **캔버스 축 전 화면** — [G-b]·[G-g] 를 대표 4화면에서 스윕 전 화면으로 (28회차 신설 · 작업 634).
 *       [G] 는 «[A] 가 도는 축의 다른 각도» 로 분류돼 접혀 있었는데, 캔버스 안 픽셀은
 *       `getComputedStyle` 에 흔적이 없어 **[A] 가 구조적으로 못 보는** 자리다([L-d2] 가 실측한다).
 *   [M] **매체 축** — 배율이 하나도 안 걸려도 «내용 좌표계 ↔ 표시 상자» 의 비가 어긋나면
 *       브라우저가 상자에 맞춰 늘린다 (29회차 신설 · canvas 비트맵 · svg preserveAspectRatio · img object-fit:fill).
 *   [N] **매체 축 × 짧은 프레임** — 같은 축을 **1080×1600** 에서 한 번 더 (30회차 신설).
 *       [M] 은 리사이즈 «전» 에만 꺼내 2280 밖을 구조적으로 못 봤다. 이 층이 프레임을 타는 이유는
 *       [F] 의 이유와 다르다 — 배율이 아니라 **상자만** 줄어 비트맵 비와 어긋난다([N-e] 가 실측한다).
 *   [O] **매체 축 × 시간** — 같은 축을 **한 주기**(위상 16칸) 훑는다 (31회차 신설).
 *       [M]·[N] 은 «가라앉은 한 점» 이라, 배율이 한 줄도 안 걸린 채 `width`/`height` 키프레임으로
 *       **상자만** 흔들리는 자리는 [A]·[I]·[M]·[N] 이 **동시에 초록**이다([O-e]·[O-f] 가 실측한다).
 *
 * ⚠ [B] 는 «줄었다» 를 막지 않는다(라운드마다 줄어드는 것이 정상). 늘어난 것만 잡는다.
 *   라운드를 돌아 자리를 닫았으면 REMAIN 을 그 값으로 내려 적어라 — 안 내리면 래칫이 헐거워진다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const { SCREENS, COLLECT, URL, derivePassScreens, HTML, STEP } = require('./scan356.js');
/* 26회차 — 의사 축. 수집기·소스 인구조사를 `probe356r26` 한 곳에서 읽는다(자를 두 벌로 안 적는다 · 13회차 [R12]) */
const R26 = require('./probe356r26.js');
/* 28회차(작업 634) — 캔버스 축 훅. 주 스윕에 얹는다(자를 두 벌로 안 적는다 · 13회차 [R12]) */
const R23_HOOK = require('./probe356r23.js');
/* [M] 29회차 — 매체 «내용 좌표계 ↔ 표시 상자» 수집기. 자를 두 벌로 안 적는다(13회차 [R12]). */
const { COLLECT_MEDIA, verdict: MEDIA_VERDICT } = require('./probe356r29.js');
/* [N] 30회차 — 같은 매체 축의 «두 프레임 짝짓기». 짝짓기·합성 표본을 `probe356r30` 에서 받아 쓴다(13회차 [R12]). */
const R30 = require('./probe356r30.js');
/* [O] 31회차 — 같은 매체 축의 «한 주기». 접기(`foldScreen`)·합성 표본을 `probe356r31` 에서,
   위상 못박기(`PIN`)·주기 칸수(`PHASES`)는 그 파일을 거쳐 `probe356r25` 것을 받아 쓴다(13회차 [R12]). */
const R31 = require('./probe356r31.js');
/* 32회차 — 매체 축 × 시간 × 짧은 프레임([P]). 합성 표본 `SYN_FT` 와 두 프레임 짝짓기 `pairCycle` 을 받아 쓴다. */
const R32 = require('./probe356r32.js');
/* 33회차 — 매체 축 × 시간 × **WAAPI**([Q]). `PIN` 이 닿지 못하는 매체를 못박는 손(`PIN_WA`)과
   그 인구조사(`WA_CENSUS`)·한 주기 훑기(`sweepCycle`)를 `probe356r33` 에서 받아 쓴다(13회차 [R12]). */
const R33 = require('./probe356r33.js');
/* 34회차 — 매체 축 × 시간 × **전이(`transition`)**([R]). `PIN` 도 `PIN_WA` 도 안 닿는 층을 못박는
   손(`PIN_TR`)과 그 인구조사(`TR_CENSUS`)·제품 누름(`WAKE_PRESS`)·한 램프 훑기(`sweepCycle`)를
   `probe356r34` 에서 받아 쓴다(13회차 [R12] — 자를 두 벌로 안 적는다). */
const R34 = require('./probe356r34.js');
const { PIN: PIN_PHASE } = require('./probe356r25.js');
const { COLLECT_PSEUDO } = R26;

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
     `s.tm>b.ck` 한 키로는 세 자리 중 아무것도 부분 일치가 안 된다(5회차 `div.pill.p2` 선례).
     ⚑ 602(2026-08-31) — 이 세 키는 6회차에 `s.tm.**alert**>b.ck` 로 적혀 있었고 581 이 «받기»
     국면에 부품 클래스를 하나 더 얹자(`classList.toggle('ifbtn', !on)`) 실제 경로가
     `s.tm.alert.**ifbtn**>b.ck` 가 되어 **세 키가 한꺼번에 회색**이 됐다(«노드를 한 개도 못 봤다»).
     제품은 멀쩡했다 — 시계는 부팅 상태에서도 3개 다 그려져 있다(`probe602` ①②).
     ⇒ 바로 아래 7회차 주석의 «키에 **상태 클래스를 넣지 않는다**» 를 6회차 키에도 적용한다:
     `s.tm` 까지만 물면 두 국면(«받기» = `.tm.alert.ifbtn` · «시간이 남았다» = `.tm`) 다 잡힌다.
     ⚠ 느슨해진 것이 아니다 — `.tm` 아래에서 수집기가 아이콘으로 세는 노드는 시계(`b.ck`) 하나뿐이고
     (`>i` 는 «받기»·«00:09:59» 라 라벨, `s.updot` 은 빈 상자), 시계가 사라지면 여전히 «노드 0개» 로
     빨개진다(334 가 같은 화면에서 잡은 «시계가 통째로 사라져도 초록» 을 되살리지 않는다).
     국면이 갈려도 안 놓치는지는 [R5] 의 «국면 무관» 항이 매 실행 다시 묻는다. */
  { k: 'div#blsC_atk>div.b>s.tm', why: '34 축복 카드1 ⏱ 시계 (scaleX .97)' },
  { k: 'div#blsC_hp>div.b>s.tm', why: '34 축복 카드2 ⏱ 시계 (같은 규칙 `.bls-c .tm>b.ck`)' },
  { k: 'div#blsC_rate>div.b>s.tm', why: '34 축복 카드3 ⏱ 시계 (같은 규칙)' },
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
  /* ── 11회차 — **56 절전(`#svw`)**. 이 화면은 1~10회차 내내 `SCREENS` 에 없어서 [A]·[B]·[S3] 셋 다
     «0건» 으로 읽고 있었다(397 36 출석 패스 · 443 패스 탭 · 5회차 23 훈련에 이어 네 번째 스코프 구멍).
     차집합을 고른 근거는 351 오프너 목록(55화면) ↔ 356 SCREENS(42화면)이고, 재현은 probe356r11.
     ⚠ 라벨은 그대로 둔다 — `.sv-st>i`(STAGE 80) `.sv-r>i`(라벨) `.sv-r>b`(값)의 scaleX 는
       **글자**라 이 지시의 대상이 아니다(3회차 `u.pr` 선례). 대상은 아이콘 셋뿐이다. */
  { k: 'div.sv-st>s>em', why: '56 절전 STAGE 배지 💀 (수리 전 scaleX 1.19 → contain .82222)' },
  { k: 'div.sv-r>u', why: '56 절전 요약 pill 아이콘 3칸 ⏱️·💀·🪙 (수리 전 scaleX .706/.862 → contain .89744/.93333)' },
  /* ── 12회차 — **04 던전 세부(`#dgdw`)와 08 세부 껍데기**. 둘 다 1~11회차 내내 SCREENS 밖이었다.
     04 는 «누를 수 있는 문이 없어서»(카드 [도전] 이 입장권 0이면 disabled) 목록에 적을 방법 자체가
     없었고 — 그래서 `js:` 단계를 새로 뒀다 —, 08 세부는 «카드를 눌러야 열려서» 세 목록
     (356·351·smoke) 어디에도 없었다. 재현은 `tools/probe356r12.js`, 배율 역산은 `tools/cal356r12.js`.
     ⚠ 08 세부의 자리는 **역보정**이다(7회차 `i.ol3>img.cic` 과 같은 꼴) — 호스트 `.sk-ct b` 는
       쿨타임 표의 **글자**라 scaleX(.93)이 지시 대상이 아니고, 그 칸에 `mdLive()` 가 화폐 아이콘을
       innerHTML 로 넣는 50 코스튬 세부에서만 img 가 그 .93 을 뒤집어쓴다. 그래서 이 키가 보는 노드의
       **자기** 배율은 1.07527 로 비등방이고, 스캐너가 세는 «누적» 은 1.0 이라 초록이다. */
  { k: 'button#dgdPrev>i', why: '04 던전 세부 좌 화살표 ◀ (수리 전 scaleX 1.19 → contain 1.01205)' },
  { k: 'button#dgdNext>i', why: '04 던전 세부 우 화살표 ▶ (같은 규칙 `.dgd-ar i`)' },
  { k: 'div.sk-ct>div.vl>div.nt>b>img.cic', why: '08 세부 쿨타임 표 «다음 레벨» 칸 화폐 아이콘 (라벨 scaleX .93 을 뒤집어쓰던 자리 — 역보정)' },
  /* ── 15회차(2026-08-31) — «사건이 있어야 뜨는 화면». 12회차가 프런티어로 넘긴 자리다:
     01·09·12·17·18·31 은 «누를 문» 이 없어 열두 회차 동안 SCREENS 밖이었고, `js:` 단계가 생긴
     지금은 **제품 진입점**으로 적을 수 있다. 재현 `tools/probe356r15.js`(2280·1600 두 프레임에서
     4노드) · 역산 `tools/cal356r15.js`.
     ⚠ 셋 다 **폐기된 관행의 잔재**다 — «ref 잉크 폭에 맞추려고 한 축만 눌렀다».
     ⚠ 18 은 자리가 **둘**이다: 불꽃 자신(.82/.86)과 그것을 감싼 묶음(.892/.885). 묶음의 비는
       1.0079 라 TOL 0.02 아래여서 [A]·[B] 는 못 본다 — 그래서 «누적» 이 아니라 **선언**을 보는
       [S5] 가 그 자리를 맡는다(같은 규율: [S] 와 [S2] 가 `transform:none` 을 [A] 대신 잡는다). */
  { k: 'div.ofr-fr>i>b', why: '01 오프라인 보상 코인 (수리 전 scaleY .97 — ref 잉크 75×76 인데 73 으로 눌렀다 = ref 에서 멀어지는 방향)' },
  { k: 'b#stIc', why: '17 스탯업 ⚔️ (수리 전 scaleX .86 — 「높이는 일치하므로 scaleX 만」이 그 관행의 문장이다)' },
  { k: 'div.df-ic>b.fl', why: '18 패배 카드2 불꽃 (수리 전 scale(.82,.86) · 묶음 .892/.885 와 누적 0.961)' },
];

/* ⚑ 12회차 잠복 자 — **키에 상태 클래스를 박지 마라**(7회차가 주석으로만 적어 둔 규율을 자로 세운다).
   6회차가 `s.tm.alert>b.ck` 로 적은 세 줄이 581 의 클래스 하나(`.ifbtn`)에 부분 일치가 끊겨
   [A] 세 항 + [R5] 가 통째로 빨개져 있었다(착수 기준선 106/112 · 제품 0줄). 상태는 세이브·지시로
   언제든 바뀌므로, 상태를 문 키는 «노드 0개» 라는 **다른 무음**으로 늙는다.
   ⚠ 이 목록은 «본 적 있는 상태 클래스» 다 — 새 상태 클래스가 생기면 여기 더한다. */
const STATE_CLS = ['.alert', '.ifbtn', '.on', '.off', '.no', '.ok', '.dim', '.lk', '.sel', '.open'];
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

/* ⚑ 12회차 — 여기 잠깐 정규식(rx) 키를 뒀다가 **걷어냈다**: 같은 시각 다른 세션이 602 로
   같은 부패를 «키를 `s.tm` 까지만 문다» 로 고쳐 상류에 먼저 올렸고, 그 판을 받으면 rx 의
   소비처가 0 이 된다(죽은 코드 금지 — 295-② · 399 · 460). 판정은 부분 일치 하나로 되돌린다. */
const hitsKey = (s, sel) => sel.includes(s.k);
const inScope = (sel) => SCOPE.find((s) => hitsKey(s, sel));

/* ⚑ 443 — [A]·[B] 가 **실제로 돈 스윕**에서 무음 실패가 있었는지. [C] 는 스윕이 끝난 뒤 새 페이지에서
   다시 물어보는 자라, 스윕 자신의 숫자(관측 노드 수·래칫)가 어느 화면을 빼먹고 나온 값인지는 못 말한다.
   428 사고의 나머지 절반이 그것이다 — «92/93» 한 줄이 빨개지는 동안 [A]·[B] 는 초록이었다. */
const SWEEP_MISS = [];

/* ── [F] 프레임 축 (14회차 신설) ─────────────────────────────────────────────
   스캐너는 **1080×2280 한 프레임**에서만 돈다. 그런데 주인이 명시적으로 요구한 기기가 하나 더
   있다 — **9:13.3(1080×1600)** 이고, 351·403·404 가 그 프레임 전용으로 등재된 작업이다.
   세로가 680px 짧아지면 `flex` 아이가 **교차축으로 눌린다**(shrink) — 그것이 바로 이 작업이
   잡는 «찌그러짐» 이고 2280 에서는 한 픽셀도 안 보인다. 13회차가 `probe356r12 --only B` 로
   그 축을 처음 쟀고(0자리) «게이트에 넣을 거면 [S3] 처럼 래칫으로, 지금 값 0 을 상한으로»
   라고 넘겼다 — 이 절이 그 숙제다. */
const FRAME_F = { width: 1080, height: 1600 };
/* [F] 래칫 — 13회차 `probe356r12 --only B` 실측 **0자리**(56화면 · 3531노드),
   14회차 `probe356r14` 가 두 방법으로 재확인. [B] 와 같은 규율이다:
   ⚠ «줄었다» 는 안 막는다. **늘어난 것만** 잡고, 자리를 닫았으면 이 값을 내려 적어라.
   ⚠ 0 이 된 뒤로 이 자는 «짧은 프레임에서만 눌리는 아이콘이 하나라도 생기면 빨강» 이다. */
const FRAME_REMAIN = 0;

async function sweep(browser, inject) {
  const rows = [];
  const rowsF = [];       /* [F] 프레임 축 — 같은 화면을 1080×1600 으로 줄인 뒤 한 번 더 수집한 것 */
  const rowsP = [];       /* [J] 의사 축 — 같은 페이지에서 `::before`/`::after` 를 한 번 더 수집한 것 (26회차) */
  const seenF = [];       /* 화면별 «리사이즈가 정말 먹었나» — innerHeight 실측 (무음 실패 감시) */
  const seenG = [];       /* [L] 캔버스 축 — 화면별 `window.__r23` 스냅샷 (28회차 · 작업 634) */
  const rowsM = [];       /* [M] 매체 «내용 좌표계 ↔ 표시 상자» 축 — 같은 페이지에서 한 번 더 수집 (29회차) */
  const rowsMF = [];      /* [N] 같은 매체 축을 **리사이즈 뒤**(1080×1600)에 한 번 더 수집한 것 (30회차) */
  const seenO = [];       /* [O] 같은 매체 축을 **한 주기**(위상 16칸) 훑어 화면분으로 접은 것 (31회차) */
  const seenP = [];       /* [P] 같은 «한 주기» 를 **리사이즈 뒤**(1080×1600)에 한 번 더 훑은 것 (32회차) */
  const seenQ = [];       /* [Q] 화면별 «WAAPI 로 도는 애니» 인구조사 — `PIN` 이 못 세는 매체 (33회차) */
  const seenR = [];       /* [R] 화면별 «전이» 인구조사 — `PIN` 도 `PIN_WA` 도 안 닿는 층 (34회차) */
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      /* ── [L] 캔버스 축 (28회차 · 작업 634) — [J]·[F] 와 **같은 손**이다: 스윕을 한 벌 더 돌지 않고
         이미 여는 이 페이지에 훅을 얹는다. 그래서 23회차가 대표 4화면에서만 보던 축
         ([G-b] drawImage 비균등 · [G-g] 비균등 컨텍스트 변환)이 **[A] 와 같은 전 화면 커버리지**를
         evaluate 한 번 값으로 얻는다.
         ⚠ 훅은 `probe356r23.initHook` 을 **받아 쓴다**(자를 두 벌로 안 적는다 — 13회차 [R12]).
            그 훅이 `getTransform()` 을 일부러 안 부르는 이유가 거기 주석에 있다(60fps 캔버스에서
            훅이 게임을 느리게 만든다) — 그래서 이 스윕에 얹어도 [A]·[B]·[F]·[I]·[J] 값이 안 움직인다.
         ⚠ **`goto` 보다 먼저** 걸어야 전수다: `drawImage` 는 프로토타입에 있으므로
            컨텍스트가 만들어지기 전에 갈아 끼워야 한다(23회차 주석). */
      await page.addInitScript(R23_HOOK.initHook, TOL);
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        /* 12회차 — 단계 해석은 `scan356.STEP` 한 곳(`js:` 단계 포함 · [C] 와 같은 자를 쓴다) */
        const found = await STEP(page, s);
        if (!found && !SWEEP_MISS.includes(`«${label}» → '${s}'`)) SWEEP_MISS.push(`«${label}» → '${s}'`);
        await page.waitForTimeout(400);
      }
      if (inject) { await page.evaluate(inject); await page.waitForTimeout(120); }
      await page.waitForTimeout(200);
      const got = await page.evaluate(COLLECT, { all: false });
      for (const g of got) rows.push(Object.assign({ screen: label }, g));

      /* ── [J] 의사 축 (26회차) — [F] 와 **같은 손**이다: 스윕을 한 벌 더 돌지 않고
         이미 열려 있는 이 페이지에 `evaluate` 를 한 번 더 한다.
         25회차 인계문이 그렇게 적어 넘겼다 — «화면 진입 비용을 두 번 내지 마라».
         그래서 새 축인데도 [A] 와 **같은 전 화면 커버리지**를 공짜로 얻는다
         ([G]·[I] 가 대표 화면만 훑는 것과 갈리는 자리다 — 저 둘은 [A] 가 이미 도는 축의 «다른 각도»
          지만, 의사 요소는 [A] 가 **구조적으로 못 보는** 노드라 대표 화면으로 접으면 그만큼이 그냥 구멍이다). */
      const gotP = await page.evaluate(COLLECT_PSEUDO, { all: false });
      for (const g of gotP) rowsP.push(Object.assign({ screen: label }, g));

      /* [L] — 훅 스냅샷은 **리사이즈 «전»** 에 꺼낸다. 이 축을 [A]·[G] 와 같은 프레임(2280)에서
         재야 «[A] 가 도는 그 순간에 [A] 가 못 보는 것» 이라는 말이 실측이 된다.
         (1600 프레임의 캔버스는 [F] 의 물음이고 아직 아무도 안 봤다 — 634 review §4 에 적어 뒀다.) */
      seenG.push([label, await page.evaluate(() => window.__r23 || null)]);

      /* ── [M] 매체 축 (29회차) — [J]·[L]·[F] 와 **같은 손**: `evaluate` 한 번이다.
         [A] 가 보는 것은 «노드에 걸린 배율» 이고, 이 축이 보는 것은 **배율이 하나도 안 걸려도**
         내용 좌표계와 표시 상자의 비가 어긋나 브라우저가 늘려 버리는 층이다
         (`<canvas 88×92>` 를 150×50 상자에 넣으면 [A] 는 ratio 1 = 초록인데 그림은 3.14배 늘어난다).
         ⚠ 리사이즈 **전**에 꺼낸다 — [A]·[L] 과 같은 프레임(2280)에서 재야
            «[A] 가 도는 그 순간에 [A] 가 못 보는 것» 이 실측이 된다. */
      const gotM = await page.evaluate(COLLECT_MEDIA);
      for (const g of gotM) rowsM.push(Object.assign({ screen: label }, g));

      /* ── [Q] 매체 축 × 시간 × WAAPI (33회차) — [J]·[L]·[M] 과 **같은 손**: `evaluate` 한 번이다.
         [O]·[P] 가 주기를 훑는 손(`PIN`)은 **CSS 애니메이션에만** 닿는다(`animation-delay` 를 민다).
         `Element.animate()` 로 상자를 흔드는 노드는 `animationName` 이 `none` 이라
         그 손이 **세지도 못박지도 못한다** ⇒ 열여섯 칸 스윕이 그 노드에 대해서만
         «자기가 도착한 순간» 을 열여섯 번 읽는다(`probe356r33` [2] 가 «주기의 0.06% 만 봤다» 로 실측).
         ⚠ 이 자리에서는 **세기만** 한다 — 이 저장소의 WAAPI 두 자리는 둘 다 «누르는 동안» 만 살아서
            가라앉은 화면에서는 0 이다. 그 0 을 커버리지로 읽지 않으려고 판정은 아래 [Q] 절이
            **제품의 틱을 깨워서** 한다(§[Q-c]). 여기 수는 «지금 트리에 상시 WAAPI 가 없다» 는 관측이다. */
      seenQ.push({ label, wa: await page.evaluate(R33.WA_CENSUS) });

      /* ── [R] 매체 축 × 시간 × **전이** (34회차) — 같은 손으로 한 번 더 센다(`evaluate` 한 번).
         `PIN` 은 `animation-*` 손잡이라 전이에 안 닿고, `PIN_WA` 는 `CSSTransition` 을 **일부러 걸러 낸다**
         (33회차 §40-4 · 교훈 ④ 가 그 `continue` 한 줄을 «다음 프런티어의 주소» 로 넘겼다).
         ⚠ 여기서도 **세기만** 한다 — 전이는 «상태가 바뀌는 동안» 만 살아서 가라앉은 화면에서는 0 이다.
            그 0 을 커버리지로 읽지 않으려고 판정은 아래 [R] 절이 **제품의 누름을 실제로 만들어서** 한다. */
      seenR.push({ label, tr: await page.evaluate(R34.TR_CENSUS) });

      /* ── [O] 매체 축 × 시간 (31회차) — [J]·[L]·[M]·[N] 과 **같은 손**이다: 스윕을 한 벌 더 돌지 않고
         이미 열려 있는 이 페이지에서 위상만 옮겨 가며 `evaluate` 를 더 한다.
         [M]·[N] 이 재는 것은 «가라앉은 뒤의 **한 점**» 이라, 상자가 애니메이션으로 흔들리는 매체는
         그 점에서 초록이어도 주기 한복판에서 비트맵 비와 어긋날 수 있다
         (배율은 한 줄도 안 걸리므로 [A]·[I]·[F] 도 못 본다 — `probe356r31` [2]·[4] 가 실측한다).
         ⚠ 리사이즈 **전**에 돈다 — [M] 과 같은 프레임(2280)이어야 «[M] 이 도는 그 순간에
            [M] 이 못 보는 것» 이 실측이 된다. 끝나면 `PIN(null)` 로 되돌려 [F]·[N] 이 안 물든다.
         ⚠ 화면분을 **바로 접는다**(`R31.foldScreen`) — 16위상 × 71화면 × 1100행을 통째로 들고 있지 않는다. */
      let foldO = null, pinnedO = 0, animO = null;
      try {
        animO = await page.evaluate(R31.MEDIA_ANIM);
        pinnedO = await page.evaluate(PIN_PHASE, 0);
        const perPhase = [];
        for (let k = 0; k < R31.PHASES; k++) {
          await page.evaluate(PIN_PHASE, k / R31.PHASES);
          const got = await page.evaluate(COLLECT_MEDIA);
          /* 같은 위상에서 «배율이 걸렸는가» 도 같이 잰다 — 상자를 미는 것이 배율이면 그 자리는
             [A]·[I] 몫이고 이 절 «전용» 이 아니다(그 구분이 없으면 커버리지를 부풀려 읽는다). */
          const tr = await page.evaluate(R31.MEDIA_TR);
          perPhase.push({ at: k / R31.PHASES, rows: got.map((g) => Object.assign({ screen: label }, g)), tr });
        }
        foldO = R31.foldScreen(perPhase, TOL);
      } catch (e) { foldO = null; }
      try { await page.evaluate(PIN_PHASE, null); } catch (e) { /* 되돌리기 실패는 아래 [F]·[N] 값이 말한다 */ }
      seenO.push({ label, pinned: pinnedO, fold: foldO, anim: animO });

      /* ── [F] 프레임 축 (14회차) — **스윕을 한 벌 더 돌지 않는다** ──────────────────
         비용의 거의 전부는 위의 ①컨텍스트 ②goto ③단계 클릭이고 `COLLECT` 는 evaluate 한 번이다.
         그래서 같은 페이지를 9:13.3 으로 **줄여서 한 번 더 수집**한다 —
         프레임 축이 «스윕 한 벌» 이 아니라 «evaluate 한 번» 값이 된다.
         ⚠ 이것이 «처음부터 1600 에서 몰기» 와 같은 값이라는 근거는 손이 아니라 자에 있다:
            `node tools/probe356r14.js` 가 두 방법을 56화면에서 나란히 돌려 세 축
            (노드 수 · 비균등 자리 · 공통 노드 ratio 드리프트)으로 대조한다. 갈리면 그 자가 말한다.
         ⚠ **14회차 실측이 «완전히 같다» 는 아니다** — 35 패스 네 탭에서 **행 수**가 다르다
            (R 158·108 vs D 134·93). `passWin()`(34247)이 창을 `psList.clientHeight` 로 잡는데
            `setViewportSize` 는 재채움을 안 부르기 때문이다(493 가상 목록). 다만 셀렉터 집합은
            **같고**(D 만 보는 자리 0) 공통 노드 ratio 드리프트도 0이라, 이 방식은 D 의 **상위집합**을
            1600 기하로 재는 것 = 래칫에 **안전한 방향**이다(더 많이 재고도 0이면 0).
         ⚑ **스코프를 넓히거나 가상 목록을 건드리는 회차는 `probe356r14` 를 같이 돌려라** —
            «D 만 보는 자리» 가 하나라도 생기면 그때부터 이 절은 1600 에서 따로 몰아야 한다. */
      await page.setViewportSize(FRAME_F);
      /* `fit()` 이 resize 핸들러에서 돌고, 그 뒤 레이아웃·페인트가 한 프레임 더 필요하다. */
      await page.waitForTimeout(420);
      seenF.push([label, await page.evaluate(() => window.innerHeight)]);
      const gotF = await page.evaluate(COLLECT, { all: false });
      for (const g of gotF) rowsF.push(Object.assign({ screen: label }, g));

      /* ── [N] 매체 축 × 짧은 프레임 (30회차) — 29회차 인계문이 «값은 공짜» 라고 적어 넘긴 자리다.
         [M] 은 리사이즈 **전**에만 꺼내므로 2280 밖을 구조적으로 못 본다. 그런데 이 층이
         프레임을 타는 이유는 [F] 의 이유와 **다르다**: [F] 는 짧아진 시트에서 요소가 `transform`
         으로 눌리는 것을 보고, 이 축은 **배율이 한 줄도 안 걸린 채** 상자만 줄어 내용 좌표계와
         비가 어긋나는 것을 본다(`#stagearea{flex:1}` 이 남는 높이를 흡수하므로 전투 캔버스 상자는
         프레임을 그대로 타는데 비트맵 `canvas.width/height` 는 `resize` 핸들러가 다시 잡아 줘야만 따라온다).
         ⇒ «2280 에서 0» 은 «1600 에서 0» 의 근거가 못 된다. [F] 와 같은 손 — `evaluate` 한 번이다. */
      const gotMF = await page.evaluate(COLLECT_MEDIA);
      for (const g of gotMF) rowsMF.push(Object.assign({ screen: label }, g));

      /* ── [P] 매체 축 × 시간 × 짧은 프레임 (32회차) — [O] 와 **같은 손**이되 프레임이 1600 이다.
         31회차 인계문이 이름까지 적어 넘긴 자리다: «[N] 이 프레임을 열었고 [O] 가 시간을 열었지만
         **둘의 곱은 아직 아무도 안 봤다**».
         이 층이 곱에서만 보이는 이유는 [N]·[O] 어느 쪽의 이유와도 다르다 — **키프레임의 값 자체가
         프레임에 매인 단위**(`vh`·`%`·`min()`)일 때다. 그런 노드는 2280 에서 주기를 다 훑어도
         상자가 비트맵 비와 계속 맞을 수 있고([O] 초록), 1600 의 «가라앉은 한 점» 은 0%/100% 위상이라
         역시 맞는다([N] 초록). 어긋나는 것은 **짧은 프레임의 주기 한복판** 하나뿐이다
         (`probe356r32` [2]·[5] 가 합성으로 실측: 2280 한 주기 0자리 · 1600 한 점 0자리 ↔ 1600 한 주기 1자리).
         ⚠ [N] 의 `gotMF` **뒤에** 돈다 — 못박기가 [N] 값을 물들이면 안 된다.
         ⚠ 화면분을 **바로 접는다**(`R31.foldScreen`) — [O] 와 같은 규율. */
      let foldP = null, pinnedP = 0;
      try {
        pinnedP = await page.evaluate(PIN_PHASE, 0);
        const perPhaseP = [];
        for (let k = 0; k < R31.PHASES; k++) {
          await page.evaluate(PIN_PHASE, k / R31.PHASES);
          const gotP2 = await page.evaluate(COLLECT_MEDIA);
          const trP = await page.evaluate(R31.MEDIA_TR);
          perPhaseP.push({ at: k / R31.PHASES, rows: gotP2.map((g) => Object.assign({ screen: label }, g)), tr: trP });
        }
        foldP = R31.foldScreen(perPhaseP, TOL);
      } catch (e) { foldP = null; }
      try { await page.evaluate(PIN_PHASE, null); } catch (e) { /* 페이지는 곧 닫힌다 */ }
      seenP.push({ label, pinned: pinnedP, fold: foldP });
    } catch (e) { /* 화면 하나가 안 열려도 나머지는 본다 — 진입 실패는 smoke 의 몫이다 */ }
    await ctx.close();
  }
  return { rows, rowsF, rowsP, seenF, seenG, rowsM, rowsMF, seenO, seenP, seenQ, seenR };
}

(async () => {
  const browser = await launch(chromium);

  console.log('[A] 스코프 — 전 화면 상시 크롬 아이콘의 비균등 0건');
  /* [A-s] 12회차 잠복 — 스코프 키가 «상태» 를 물고 있으면 그 항은 언젠가 조용히 늙는다(위 STATE_CLS 주석) */
  {
    /* ⚠ 첫 판이 `span.lk`(A4 슬롯 **자물쇠 아이콘**)를 잡았다 — 거기의 `.lk` 는 «잠김 상태» 가
       아니라 **그 요소의 이름**이다. 갈래는 «앞에 다른 클래스가 붙어 있는가» 로 갈린다:
       `s.tm.alert` 처럼 **클래스 위에 겹쳐 적힌** 것만 상태다(`span.lk` 는 태그 뒤 첫 클래스). */
    const keyTxt = (s) => s.k;
    const rot = SCOPE.filter((s) => STATE_CLS.some((c) => new RegExp('\\.[\\w-]+\\' + c + '(?![\\w-])').test(keyTxt(s))));
    if (rot.length) bad(`[A-s] 스코프 키 ${rot.length}건이 상태 클래스를 물고 있다(581 사고 재발 예약): ${rot.map((s) => s.k).join(' · ')}`);
    else ok(`[A-s] 스코프 키 ${SCOPE.length}건 전부가 상태 클래스를 안 문다 (581 «.ifbtn» 이 끊은 그 부분 일치가 다시 안 생긴다)`);
  }
  const { rows, rowsF, rowsP, seenF, seenG, rowsM, rowsMF, seenO, seenP, seenQ, seenR } = await sweep(browser, null);
  if (!rows.length) bad('아이콘 노드를 한 개도 못 봤다 (스캐너가 죽었다 — 헛초록 방지)');
  else ok(`아이콘 노드 ${rows.length}개 관측`);
  /* ⚑ 443 — 이 숫자와 아래 [B] 래칫이 «전 화면» 을 본 값인지. 한 단계라도 무음 실패면 아니다. */
  if (SWEEP_MISS.length) bad(`[A] 스윕이 무음 실패한 단계 ${SWEEP_MISS.length}건 — 이 실행의 관측 수·래칫은 그 화면을 빼먹은 값이다: ${SWEEP_MISS.join(' · ')}`);
  else ok(`[A] 스윕 ${SCREENS.length}화면의 모든 단계가 resolve 됐다 (관측 수·래칫이 전 화면 값이다)`);

  const badRows = rows.filter((r) => Math.abs(r.ratio - 1) > TOL);
  for (const s of SCOPE) {
    const hit = badRows.filter((r) => hitsKey(s, r.sel));
    const seen = rows.filter((r) => hitsKey(s, r.sel));
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

  console.log(`[F] 프레임 축 래칫 — 9:13.3(${FRAME_F.width}×${FRAME_F.height})에서도 비균등 «자리» 0`);
  {
    /* ⓐ 전제 — 리사이즈가 **정말 먹었나**. 안 먹으면 이 절은 2280 을 두 번 잰 것이고 그건 헛초록이다.
       ([A] 가 «무음 실패한 단계» 를 세는 것과 같은 자리 — 443·12·13회차가 세 번 데인 그 모양이다.) */
    const wrong = seenF.filter(([, h]) => h !== FRAME_F.height);
    if (!seenF.length) bad('[F-a] 프레임 축을 잰 화면이 0개다 — 스윕이 1600 수집에 한 번도 못 닿았다(헛초록 방지)');
    else if (wrong.length) bad(`[F-a] 리사이즈가 안 먹은 화면 ${wrong.length}개 — 이 절은 2280 을 두 번 잰 값이다: ${wrong.map(([l, h]) => `${l}(${h})`).join(' · ')}`);
    else ok(`[F-a] ${seenF.length}화면 전부 innerHeight ${FRAME_F.height} 에서 쟀다 (리사이즈가 먹었다)`);

    /* ⓑ 전제 — 짧은 프레임에서 노드가 통째로 사라지면 «비균등 0» 은 «안 봤다» 는 뜻이다.
       문턱은 2280 관측 수의 90% — 시트가 짧아지며 몇 칸이 뷰포트 밖으로 나가는 것은 정상이고,
       화면 하나가 통째로 빠지는 것(56화면 중 1개 ≈ 2%)보다 훨씬 크게 잡아 둔다. */
    const floor = Math.floor(rows.length * 0.9);
    if (rowsF.length < floor) bad(`[F-b] 1600 관측 노드 ${rowsF.length}개 < 바닥 ${floor}(2280 의 ${rows.length}개 × 0.9) — 짧은 프레임에서 스코프가 줄었다`);
    else ok(`[F-b] 1600 관측 노드 ${rowsF.length}개 ≥ 바닥 ${floor} (2280 은 ${rows.length}개)`);

    /* ⓒ 래칫 — [B] 와 같이 «자리»(셀렉터)로 접는다. 비율로 접으면 60 쥬시의 `.jz-st` 때문에
       실행마다 값이 흔들린다([B] 주석). */
    const badF = rowsF.filter((r) => Math.abs(r.ratio - 1) > TOL);
    const selF = new Set(badF.map((r) => r.sel));
    /* «프레임 전용» = 1600 에서만 눌리는 자리. 이 절의 존재 이유가 바로 이 집합이다. */
    const sel2280 = new Set(rows.filter((r) => Math.abs(r.ratio - 1) > TOL).map((r) => r.sel));
    const onlyShort = [...selF].filter((s) => !sel2280.has(s));
    if (selF.size > FRAME_REMAIN)
      bad(`[F-c] 래칫 — 1600 에서 비균등인 자리 ${selF.size}개(래칫 ${FRAME_REMAIN}) · 그중 «1600 에서만» ${onlyShort.length}개:\n` +
          badF.slice(0, 12).map((r) => `      ${r.ratio} [${r.kind}] ${r.sel} «${r.txt}» ${r.w}×${r.h} @${r.screen}`).join('\n'));
    else ok(`[F-c] 래칫 — 1600 비균등 자리 ${selF.size}개 ≤ ${FRAME_REMAIN}` + (selF.size < FRAME_REMAIN ? ' (줄었다 — FRAME_REMAIN 을 내려 적어라)' : ''));

    /* ⓓ·ⓔ 되돌림·음성 — **검출기가 짧은 프레임에서도 정말 잡는가.**
       래칫이 0 인 자는 «아무것도 안 잡는 자» 와 겉모습이 같다(334 처방). 화면 하나(02 메인)를
       1600 으로 열어 ⓓ 비균등(scaleX)·ⓔ 등방(scale)을 차례로 주입해 갈라 본다 — 컨텍스트 1개짜리다. */
    const ctx = await browser.newContext({ viewport: FRAME_F, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      const probe = async (css) => {
        await page.evaluate((c) => {
          document.getElementById('f356probe')?.remove();
          const st = document.createElement('style');
          st.id = 'f356probe'; st.textContent = c;
          document.head.appendChild(st);
        }, css);
        await page.waitForTimeout(150);
        const got = await page.evaluate(COLLECT, { all: false });
        return got.filter((g) => g.sel.includes('span.ti') && Math.abs(g.ratio - 1) > TOL).length;
      };
      const base = await probe('');
      const nonUni = await probe('.tab span.ti{transform:scaleX(.8)}');
      const uni = await probe('.tab span.ti{transform:scale(.8)}');
      if (base !== 0) bad(`[F-d] 전제 — 주입 전 A1 탭 아이콘이 이미 비균등 ${base}건이다 (되돌림 시험의 기준선이 안 선다)`);
      else if (nonUni > 0) ok(`[F-d] 되돌림 — 1600 에서 \`scaleX(.8)\` 을 주입하면 검출기가 ${nonUni}건 잡는다 (래칫 0 이 «안 보는 자» 가 아니다)`);
      else bad('[F-d] 되돌림 실패 — 1600 에서 `scaleX(.8)` 을 주입해도 검출기가 0건이다 (이 절은 무엇도 안 보고 있다)');
      if (uni === 0) ok('[F-e] 음성항 — 등방 `scale(.8)` 은 안 잡는다 (크기 변경은 결함이 아니다)');
      else bad(`[F-e] 음성항 실패 — 등방 \`scale(.8)\` 을 ${uni}건 잡는다 (상시 빨강이 된다)`);
    } catch (e) { bad('[F-d] 되돌림 시험이 예외로 끝났다: ' + String(e.message || e).split('\n')[0]); }
    await ctx.close();
  }

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
      await STEP(page, s);              /* 12회차 — 단계 해석은 `scan356.STEP` 한 곳 */
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
    /* ⚑ 602 — 합계만 세면 **시계 3자리가 통째로 빠져도 ≥7 이 찬다**(카드 아이콘 3 + 보너스 2 + … ).
       실제로 581 이후 이 절은 «5건뿐» 으로 빨갰지만, 그 숫자만 보면 «어느 자리가 빠졌는지» 를 말하지
       못한다. 그래서 심은 갈래별로 나눠 묻는다 — 시계(`b.ck`)가 빨간 목록 안에 셋 다 있는가. */
    const hitCk = hit.filter((r) => /b\.ck$/.test(r.sel));
    if (hitCk.length >= 3) ok(`[R5] 34 축복 — 그 중 ⏱ 시계가 ${hitCk.length}노드 (581 이 얹은 부품 클래스에 키가 안 물린다)`);
    else bad(`[R5] 34 축복 — 심은 ⏱ scaleX(.97) 이 ${hitCk.length}노드뿐(3 이어야 한다): 시계 3자리가 감시 밖이다`);

    /* ⚑ 602 — «국면 무관» 항. `.tm` 은 국면이 둘이고(581) 클래스가 그때그때 갈린다:
       «받기» = `.tm.alert.ifbtn` · «시간이 남았다» = `.tm`. 키가 한쪽 국면의 클래스에 물리면
       다른 국면에서 조용히 0개가 된다 — 그것이 602 가 고친 결함 자체다.
       325·117 이 쓰던 상태 주입 그대로 축복 3개를 켜고(새 경로 안 만든다) 같은 스코프를 다시 센다. */
    await page.evaluate(() => {
      S.bless.exp = { atk: Date.now() + 6e5, hp: Date.now() + 6e5, rate: Date.now() + 6e5 };
      markDirty(); renderBless();
    });
    await page.waitForTimeout(250);
    const phase = await page.evaluate(() => [...document.querySelectorAll('.bls-c .tm')].map((t) => [...t.classList].join('.')));
    const onCk = (await page.evaluate(COLLECT, { all: false }))
      .filter((r) => inScope(r.sel) && /b\.ck$/.test(r.sel));
    if (phase.every((p) => !/alert/.test(p)) && onCk.length === 3)
      ok(`[R5] 34 축복 — 국면을 갈아도(«${phase[0]}») 스코프가 ⏱ 3노드를 그대로 본다 (키가 상태 클래스에 안 물린다)`);
    else bad(`[R5] 34 축복 — 국면을 갈면 스코프가 ⏱ ${onCk.length}노드만 본다(3 이어야 한다 · .tm=«${phase.join(' | ')}»)`);
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

  /* [S3] **«찍힌 픽셀» 을 묻는 절이다 — 418 이 [S3](8회차·33 재화 정보)와 [S4](9회차·70 출석)를
     스윕 한 벌로 합쳤다.**
     [A]·[S2] 는 둘 다 «선언된 변환» 을 본다. 8·9회차가 찾아낸 것은 선언이 아니라 **페인트 스냅**이다 —
     `.cic{width:1.08em}` 에 소수 `font-size` 가 곱해져 **소수 상자**가 되고, 그 상자가 **소수 좌표**에
     앉은 자리만 래스터가 한 축을 1px 더 먹는다.
     ⚠ **DSF 1 에서는 그 1px 이 반올림에 묻힌다** — 7회차의 자도, 캡처도, 비평가 한 명도 그래서 못 봤다.
     ⚠ 옛 [S3]·[S4] 는 «33 재화 정보» · «70 출석» 두 화면짜리 **상수 두 벌**이라 **새 자리를 못 봤다**.
       실제로 418 의 전 화면 스윕이 세 자리를 더 찾았다(22 퀘스트 5칸 −1.79% · 35 패스 27칸 −1.19% ·
       미션 배너 7화면 +0.79%). ⇒ 물음을 스윕으로 올린다.
     ⚑ 이 절은 `tools/probe418.js` 의 `sweep()` 을 **그대로** 부른다(자를 두 벌로 적으면 한쪽만 늙는다).
       그 자의 세 가지 함정은 그 파일 서두에 적혀 있다 — ⓐ 스냅은 산수로 못 흉내 낸다(잉크로 재라)
       ⓑ 기준은 viewBox 가 아니라 **그 그림의 잉크**다 ⓒ **가려진 아이콘은 판정 밖**이다. */
  console.log('[S3] 그려진 잉크 전 화면 스윕 — 소수 상자가 만든 찌그러짐 (418 · 옛 [S3]+[S4] 통합)');
  {
    const { sweep: inkSweep } = require('./probe418');
    const { FIXED } = require('./scan418');
    /* 스윕이 돌려주는 `sel` 은 경로 문자열이라(`div#mbox>…>span.qs-i.ifr>img.cic`) 정규식으로 짚는다 */
    const FIXED_RE = [/i#ciIcon>img\.cic/, /at-if[^>]*>em>img\.cic/, /qs-i[^>]*>img\.cic/,
      /ps-bx[^>]*>i>img\.cic/, /span#tutoRew>img\.cic/];
    /* 래칫 상수 — 418 1회차 수리 **뒤** 전수 실측(판정 208 · 칸 46 · 자리 12)에 여유를 얹었다.
       여유를 준 이유는 스윕이 «가려짐» 을 상태(애니·랜덤 보상)에 따라 36~41개로 다르게 세기 때문이다.
       ⚠ 다음 세션은 여러 번 돌려 흔들림 폭을 재고 **줄이는 쪽으로만** 다시 적을 것.

       ⚑ 356 10회차(2026-08-30, sess-1407-2525 워커 E) — 418 의 그 숙제를 했다. 전 화면 스윕
         **4회 실측**(418 게이트 45/11 · 418 손 46/12 · 10회차 46/12 · 10회차 45/11)에서
         **칸 45~46 · 자리 11~12 · 판정 190~209 · 가려짐 35~41** 로 흔들린다.
         ⇒ 칸 65 → **50**(관측 최대 46 + 4) · 자리 14 → **13**(관측 최대 12 + 1) 으로 **줄인다.**
         여유가 이만큼 있는 이유는 «가려짐» 흔들림이 판정 노드 수를 19개까지 움직이기 때문이고,
         그 흔들림이 칸 수에 미치는 폭은 4회 관측에서 **1칸**이었다.
       ⚠ `JUDGE_MIN` 은 **안 올렸다** — 이것은 결함 래칫이 아니라 «스윕이 죽었는가» 를 보는 바닥이고,
         관측 최소가 190 이지만 폭이 19 라 185 로 올리면 여유가 5밖에 안 남아 플레이키해진다. */
    /* ⚑ 530(2026-08-30, sess-1959-16876 워커 D) — **자가 흔들리던 것을 닫자 이 두 상수의 뜻이 바뀌었다.**
         10회차의 «45~46 / 11~12» 는 «연출이 섞인 화면» 을 잰 값이고, 그래서 실행마다 달랐다
         (530 재현: 칸 47·49·51 · 자리 10·11 — base3 이 래칫 50 을 넘었다).
         스윕을 «상시» 상태에서 재게 하자(연출 레이어를 내리고 · 타이머 창구를 닫고 · 무한 애니를 주기 0 에)
         전 화면 3회가 **글자 하나까지 같은 답**을 냈다 — 판정 205 · 칸 **50** · 자리 **14** · 가려짐 19.
         ⇒ 칸은 **50 그대로**(여유 4 → **0**, 조인 것이다) · 자리는 13 → **14**.
       ⚠ **자리 13 → 14 는 «늘려서 초록을 만든 것» 이 아니다.** 늘어난 셋은 새로 생긴 결함이 아니라
         **옛 자가 뜨고 지며 놓치던 자리**다(`cn-a2>.gm` +1.68% · `cn-cd.alert>.pn` −0.55% ·
         `bgm-dia>.sp.tk` +0.50% — 앞의 둘은 수리 전 실행에서도 간헐로 나왔다). 가려짐이 39~52 → 19 로
         줄면서 그 노드들이 판정 안으로 들어온 것이다. **숨기지 않았다는 증거는 아래 `KNOWN_SITES`** —
         자리를 «수» 가 아니라 **이름표**로 못박아, 수가 14 라도 **목록에 없는 자리가 하나라도 나오면 빨갛다.**
         옛 게이트는 «13자리 이하» 면 그것이 어느 자리든 초록이었다 ⇒ **이 절은 순수하게 세졌다.**
         셋의 처리는 곁다리 **532** 로 등재했다.
       ⚠ 다음 세션도 규칙은 그대로다 — **이 두 수는 줄이는 쪽으로만** 고치고, `KNOWN_SITES` 에서
         자리를 뺄 때는 «그 자리를 실제로 닫았다» 는 근거를 같이 적는다. */
    /* ⚑ 11회차(2026-08-31) — **칸 50 → 55. «표본이 넓어졌다» 는 이유로만 올린다.**
       규칙은 «줄이는 쪽으로만» 이고 그건 **표본이 고정일 때**의 규칙이다(REMAIN 주석이 같은 말을 한다).
       이 회차가 `SCREENS` 를 42 → 48화면으로 넓혔으므로 늘어난 칸이 «새 결함» 인지 «처음 본 것» 인지를
       **자리별로 갈라서** 확인했다 — `node tools/probe418.js --screen <이름>` 을 새 화면에만 돌린 값:

         05 장비 세부(무기·방패·목걸이)  3칸  ← 전부 `div#top>…>div.cbox.cDia>i>img.cic` (+0.85%)
         55 길라잡이                     1칸  ← 같은 자리
         56 절전                         0칸  (절전이 HUD 를 덮어 «가려짐» 으로 빠진다)
         22 퀘스트(반복)                 1칸  ← 같은 자리
         ─────────────────────────────  합 5칸 · **새 자리 0개**

       ⇒ 50 + 5 = 55 가 정확히 맞고, **다섯 칸 전부가 이미 등재된 한 자리**(A3 HUD 젬)의
         추가 목격이다. 그 자리는 10회차가 DSF 수렴으로 **«측정 바닥»(유령)** 임을 이미 못박았다
         (상자 63 · 좌표 812,23 둘 다 정수 · DSF4 에서 0.00%).
       ⚠ **결함을 숨기는 쪽으로 올린 것이 아니라는 증거는 이 절의 다른 두 항이 든다** —
         `자리 14 ≤ 14` 와 `이름표`(나온 자리가 전부 등재된 자리인가)는 **한 칸도 안 넓혔다.**
         새 결함은 «칸» 이 아니라 그 둘이 잡는다.
       ⚠ **여기서부터는 다시 «줄이는 쪽으로만»** 이다. 55 는 48화면 표본의 값이고,
         화면을 또 더하면 같은 방식으로 **자리별 귀속을 찍어서** 다시 적어라(수만 올리지 마라). */
    /* ⚑ **12회차(2026-08-31) — 칸 55 → 67 · 자리 14 → 16.** 11회차와 같은 근거·같은 규율:
       «표본이 넓어졌다»(SCREENS **48 → 56**) 로만 올렸고, **자리별 귀속을 찍어서** 증명했다.
       `probe418 --screen` 을 **새 화면에만** 돌린 값(전부 DSF2):

         04 던전 세부 4칸 → `#dgdIcon`(신규) · 03 카드 3자리(`.dnc.bgm-rel.lkd` sp.tk·pill · `.bgm-gold` sp.tk)
         08 스킬 세부 1칸 · 08 펫 세부 1칸 · 08 코스튬 세부 3칸 · 도움말 2화면 3칸 · 청약철회 2화면 1칸
         → **새 «자리» 는 둘뿐**(`em#dgdIcon>img.cic` · `div.skd>…>div.nt>b>img.cic`), 나머지는
           전부 **이미 등재된 자리의 추가 목격**이다(A3 HUD 젬 `.cbox.cDia` 가 새 화면 넷에서 다시 잡히는 것 등).

       ⚠ **11회차와 달리 이번 값은 결정적이지 않다.** 같은 트리·같은 DSF2 로 돌린 독립 두 실행이
         **칸 63 · 자리 18** ↔ **칸 67 · 자리 19** 로 갈렸고, 갈린 항은 `em#dgdIcon>img.cic` **하나**다
         (값은 두 실행 다 −1.49% — 흔들리는 것은 «판정 ↔ 가려짐» 이지 편차가 아니다).
         ⇒ 래칫은 **큰 쪽(67 · 그 자리를 포함한 16)** 으로 적고, **흔들림 자체는 601** 로 등재돼 있다.
            작은 쪽으로 적으면 절반의 실행이 «새 자리가 생겼다» 로 헛빨강이 된다(530 규율의 반대편 함정).
       ⚠ **자리 16 은 «내가 넓힌 만큼»(14 + 2) 이다** — 착수 기준선에서 이미 초과하던
         **미등재 4자리**(`#mbox .mwell p` · `#rwCost>i` · `#trRunes … .rbt.b1.no` · `.dnc.bgm-rel>.pill`)는
         **일부러 안 덮었다.** 그것은 12회차가 만든 것이 아니고(48화면 기준선에서도 자리 17 · 이름표 4로
         빨갰다) 다른 행의 제품 변경이 남긴 드리프트라 **601** 로 등재돼 있었다. 수를 올려 덮으면 그 4자리가
         조용히 사라진다 — 래칫의 뜻이 «새 결함이 안 생겼다» 인 이상 그건 자를 죽이는 것이다.
       ⚠ **여기서부터는 다시 «줄이는 쪽으로만»** 이다. */
    /* ⚑ 601(2026-08-31, sess-0837-10287 워커 B) — **칸 55 → 57 · 자리 14 → 16.**
       표본(`SCREENS` 48화면)은 **한 줄도 안 넓혔다.** 늘어난 둘은 그 사이에 들어온 **제품 변경**이
       판정 안으로 데려온 자리이고, 위 11회차 규약대로 **자리별로 귀속을 찍어서** 적는다:

         `div#trRunes>…>span.rbt.b1.no>i>img.cic`   1칸 +2.64%  ← **584**(`TR_CUR_PX = 53`, 룬 [강화] 버튼 안 화폐)
         `div#dunList>div.dnc.bgm-rel>div.pill>em>img.cic` 1칸 +1.27%  ← **585**(`.dnc .pill>em` relic 배율 1.0732 → 1.14664)
         ───────────────────────────────────────── 합 2칸 · 새 «부품» 0개(둘 다 이미 등재된 부품의 다른 인스턴스)

       ⚠ **둘 다 «닫아 보고» 나서 적은 값이다**(`tools/probe601.js` — 418 §5 + 548 Δw/DSF 축 + 새 «좌표» 축):
         · A(룬 버튼): 상자는 **이미 정수 53**(`curIc()` 이 인라인으로 박는다)이고, x 를 정수로 밀어도
           (491.5625 → 491 · 492) 편차가 **+2.64% 로 한 자리도 안 움직인다** ⇒ `.ps-bx` 식 «좌표 몫» 이 아니다.
           이웃 정수 상자도 안 통한다(52 → +1.54% · 54 → +0.74% · 둘 다 문턱 0.5% 위) — 게다가 상자를
           바꾸면 584 가 `verify584` [2-h]·[2-i] 로 못박은 버튼 안 여백 대칭이 깨진다(PROGRESS 601 «크기는 그대로»).
           DSF 수렴이 답을 준다: **2.64% → 1.64%(DSF3) → 1.13%(DSF4)** = 잉크 폭에 상수로 얹힌 AA 테
           (Δw device px 1.75 → 1.63 → 1.50 · CSS px 로는 0.88 → 0.54 → 0.38 로 0 을 향한다) ⇒ **자의 바닥**이다.
           %가 유독 큰 것은 결함이 커서가 아니라 **잉크가 이 표에서 제일 좁아서**다(68px — rstone 아트가 .625×1.000).
         · B(03 **탑** 유물 계열 알약): 이미 등재된 `.dnc.bgm-rel.lkd>.pill`(03 던전)과 **같은 부품·같은 상자
           54.4833·같은 잉크 94×107·같은 +1.27%** 인 «잠금 안 걸린» 인스턴스다. Δw 가 DSF2·3·4 에서
           +1.18 · −0.99 · +1.01 device px 로 **한 래스터 픽셀에 붙박이**(부호까지 뒤집힌다) ⇒ 548 §4-B 와 같은 자리.
           귀속도 되돌림으로 못박았다 — 585 이전 배율(1.0732)을 도로 심으면 이 자리가 **문턱 아래로 사라진다**(칸 0).
       ⚠ **이것이 «늘려서 초록을 만든 것» 이 아니라는 증거는 아래 `KNOWN_SITES` 두 항이다** —
         둘 다 **이름표 + 눈금(cap)** 과 함께 들어갔으므로, 이 자리가 자의 바닥에서 벗어나 커지면
         «칸» 이 아니라 **눈금**이 잡는다. 이름표(16자리)는 한 칸도 안 넓혔다 — 17번째 자리는 여전히 빨갛다.
       ⚠ **여기서부터도 «줄이는 쪽으로만»** 이다. 제품이 이 두 자리를 실제로 닫으면 55/14 로 되돌려 적어라. */
    /* ⚑ **601 이 12회차의 «일부러 안 덮은 4자리» 를 받아 닫는다(2026-08-31, sess-0837-10287 워커 B).**
       12회차는 자리를 «내가 넓힌 만큼»(14 + 2 = 16)만 올리고 나머지 4자리를 601 로 넘겼다 —
       그래서 그 트리에서 [S3] ③ 자리·이름표는 **일부러 빨간 채**였다. 601 이 그 넷을 전부
       `KNOWN_SITES` 에 **이름표 + 눈금(cap)** 으로 등재했으므로 이제 두 수를 실측으로 다시 적는다.
       ⚠ 값의 근거는 **이 트리(56화면)에서 직접 돌린 실행**이고, `probe601` 이 자리마다
         «닫아 봤는가 · 왜 남는가» 를 시험해 뒀다(위 두 주석 + `KNOWN_SITES` 의 `why`).
       ⚠ 여기서부터도 «줄이는 쪽으로만».

       ⚑ **그리고 596 이 그 사이에 들어와 두 수의 뜻이 또 한 번 바뀌었다.** 596 이 카드 입장권을
         −18° 로 눕히자 **입장권 다섯 칸이 판정 → «가려짐» 으로 통째로 옮겨 갔다**(아래 `bgm-dia` 자리 주석).
         그래서 12회차가 잰 «칸 63~67 · 자리 18~19» 는 **596 이전 세계의 값**이다.
         601 이 596 **이후** 트리에서 전 화면을 두 번 돌린 값은 두 번 다 **칸 62 · 자리 15**(등재 15자리 전부 일치)다.
       ⇒ 자리는 **19 → 16 으로 도로 조인다**(601 이 잠깐 19 로 올렸던 것은 596 이전 관측을 근거로 한 값이라 무효다).
         **칸 67 은 안 건드린다** — 12회차가 같은 트리에서 63↔67 로 4칸 흔들린 것을 봤고,
         596 이후 관측은 아직 두 번뿐이라 조이려면 세 번째 실행이 먼저다(줄이는 쪽 개정은 다음 세션 몫).
       ⚠ 조일 때는 «수만» 내리지 말고 위처럼 **자리별 귀속**을 다시 찍어라.

       ⚑ **601 3회차(2026-08-31, sess-1035-19169) — 그 «세 번째 실행» 을 했고 칸을 67 → 64 로 조인다.**
         596 이후 전 화면 스윕(`node tools/probe418.js`, DSF2 · 56화면) **네 번**이 전부 같은 답을 냈다:
             판정 **245** · 원본비 없음 173 · 가려짐 **31** · 칸 **62** · 자리 **15**
         (601 2회차 2회 + 3회차 2회. 3·4번째 두 실행은 **자리 목록도 편차 %도 글자까지 같았다** —
          `diff` 로 대조했고 차이 0줄이다.)
       ⇒ **자리별 귀속**(수만 내린 것이 아니라는 근거) — 이 62칸의 임자는 등재된 15자리가 전부다:
           `.cbox.cDia` 36 · `.ps-bx.c0` 5 · `.bgm-rel.lkd>.pill` 4 · `.sk-btn.sk-b2.no` 3 · `.cn-bn>.gem` 3 ·
           `.cn-cd.alert>.pn` 2 · 나머지 9자리 각 1칸(`.rbt.b1.no` · `.cn-a2>.gm` · `#dgdIcon` ·
           `.bgm-rel>.pill` · `.pvc.pb.ban1>.pil` · `.pvc.pg>.pil` · `.bgm-gold>.pill` · `.skd…>.nt>b` · `#ciIcon`)
           = 36+5+4+3+3+2+9 = **62**. 미등재 칸 **0**.
       ⚠ **12회차의 «63↔67 4칸 흔들림» 은 596 이전 것이다** — 그 흔들림의 임자 `em#dgdIcon` 은
         596 이후 네 실행에 **빠짐없이** 나왔고(−1.49% · 1칸) 가려짐도 31 로 고정이다.
         입장권 다섯 칸이 회전으로 판정 밖으로 나가면서 그 자리의 «판정↔가려짐» 경계가 같이 닫힌 것으로 읽는다.
       ⚠ 여유 2 는 그 한 자리가 다시 흔들려도(±1칸) 덮는다. **자리 16 은 안 건드렸다** —
         12회차가 정한 수이고, 여유 1 이 남아도 «새 자리» 는 아래 **이름표** 항이 이름으로 잡는다. */
    /* ⚑ **356 15회차(2026-08-31, sess-1228-23820) — 표본이 넓어져서 다시 적는다(칸 64 → 72 · 자리 16 → 19).**
       SCREENS 를 **56 → 62화면**으로(«사건이 있어야 뜨는 화면» 6곳) 넓혔으므로 601 의 «62칸 · 15자리» 는
       그 표본의 값이다. 11·12회차 규약대로 **수만 올리지 않고 자리별 귀속을 찍었다** —
       `node tools/probe418.js --screen "<이름>"` 을 새 화면마다 돌렸고 **두 실행이 글자까지 같았다**:
           `.cbox.cDia`(등재된 자리)          **+5칸** — 01 · 09 · 12 · 18 · 31 (HUD 젬은 상시라 화면 수만큼 는다)
           `#sumB10>.gem>.cic`  −1.89%  1칸 — 12 소환 결과 (**새 자리**)
           `#sumB30>.gem>.cic`  −1.89%  1칸 — 12 소환 결과 (**새 자리**)
           `#tutoRew>img.cic`   −0.81%  1칸 — 31 던전 클리어 (**새 자리**)
         62 + 5 + 1 + 1 + 1 = **70칸** · 15 + 3 = **18자리**. 미등재 칸 0.
       ⚠ **셋 다 «새로 생긴 결함» 이 아니라 «처음 본 자리» 다**(12회차 08 세부와 같은 성질) —
         이 회차가 제품에서 고친 것은 [A] 축(선언된 비균등)이고, 여기 남는 것은 래스터 축이다.
       ⚠ 여유는 601 과 같은 근거다 — 칸 +2 는 `#dgdIcon` 이 판정↔가려짐을 오가는 폭(±1칸),
         자리 +1 도 같은 한 자리 몫이다. **새 자리는 수가 아니라 아래 «이름표» 가 이름으로 잡는다.** */
    /* ⚑ **356 16회차(2026-08-31, sess-1419-17298) — 래칫을 «조이는 쪽» 으로 다시 적는다(칸 72 → 68 · 자리 19 → 18).**
       실측(`node tools/probe418.js` 전 화면 1회 · 62화면 · 판정 263)은 **칸 66 · 자리 17** 이다.
       15회차 값(70칸 · 18자리)에서 **−4칸 · −1자리** 이고, 그 차이의 귀속은 이렇다:
           `#sumB10>.gem>.cic`  −1.89% 1칸 ⇒ **0칸**  — 이 회차가 제품에서 닫았다(아래 «닫힘» 주석)
           `#sumB30>.gem>.cic`  −1.89% 1칸 ⇒ **0칸**  — 같은 부품
           `#mbox .mwell>p>.cic`               **+1칸** — 55 길라잡이 (**새 자리** · 이 회차가 처음 봤다)
           `#rwCost>i>.cic`                    **+2칸** — 89 유물 · 89 유물 도움말(429) (**새 자리**)
           `.cbox.cDia`(등재된 자리)           **−4칸** — 41칸(15회차 45칸). HUD 젬은 상시라 화면 수를 따라 흔들린다
         70 − 2 + 3 − 4 = **66칸** · 18 − 2 + 2 = **17자리**. 미등재 칸 0.
       ⚠ 여유는 601·15회차와 같은 근거다(칸 +2 · 자리 +1 = `#dgdIcon` 이 판정↔가려짐을 오가는 폭).
       ⚠ **줄이는 쪽으로만 고쳐라** — 이 수를 올리는 커밋은 새 찌그러짐을 덮는다. */
    /* ⚑ **356 18회차(2026-08-31, sess-1731-27551 워커 B) — 표본이 넓어져서 다시 적는다(칸 68 → 77 · 자리 18 그대로).**
       SCREENS 를 **62 → 67화면**으로(«상태가 있어야 보이는 노드» 5곳 — 우편 보상 통 · 던전 전량 해금 ·
       소환 결과 펫/무기 · 유물 보유) 넓혔으므로 16회차의 «66칸(+여유 2 = 68)» 은 그 표본의 값이다.
       15·16회차 규약대로 **수만 올리지 않고 자리별 귀속을 찍었다** —
       `node tools/probe418.js --screen "<이름>"` 을 새 화면마다 돌렸다:
           `.cbox.cDia`(등재된 자리)      **+3칸** — 53 우편(보상 통) · 12 소환 결과(펫) · 12 소환 결과(무기)
                                                     (HUD 젬은 상시라 화면 수만큼 는다 — 15회차와 같은 축)
           `.dnc.bgm-rel>.pill`(등재된 자리) **+3칸** — 03 던전(전량 해금): 부팅엔 잠금(.lkd)이던 유물 2~4단이
                                                     해금 마크업으로 한 번 더 잡힌다(잠금 칸 4는 기존 03 던전 몫 그대로)
           `.dnc.bgm-gold>.pill`(등재된 자리) **+1칸** — 03 던전(전량 해금) · 89 유물(보유)은 **0칸**
         68 + 7 = **75칸** 실측(전량 실행 75 = 귀속 합과 일치) · 자리 **16**(18 등재 중 band 2자리가 이번 실행 문턱 아래).
       ⚠ **새 자리 0 · 미등재 칸 0** — 다섯 화면이 더한 칸의 임자는 전부 등재된 자리다. 새 결함이 아니라
         «같은 부품을 더 많은 화면에서 본 것» 이고, 그 증거가 위 귀속과 [S3] 이름표·눈금 초록이다.
       ⚠ 여유는 601·15·16회차와 같은 근거다(칸 +2 = `#dgdIcon` 판정↔가려짐 폭 — 16회차 66 이 17회차
         실행에서 68 로 오간 것이 실측 폭이다). **표본이 고정인 동안은 줄이는 쪽으로만 고쳐라.**

       ⚑ 356 19회차(2026-08-31, sess-1940-32478 워커 C) — 18회차가 «대표 표본» 이라 적어 둔 상태 축 셋을
         넓히면서(SCREENS 67 → **69** · `12 소환 결과(방패)`·`(목걸이)` 신설 · 우편·유물 줄 확장)
         칸이 **75 → 77** 로 올랐다. 래칫 77 에 **정확히 닿아** 초록이었다 = 여유가 0 이 된 것이다.
         15·16·18회차 규약대로 «수만 올리지 않고» 자리별 귀속을 먼저 찍었다(`probe418` 전량 실행):
           `.cbox.cDia`(HUD 젬 — **상시**라 화면 수만큼 는다) 45 → **46칸** · 새 화면 둘 중
           `12 소환 결과(방패)`·`(목걸이)` 가 각각 +1 · 넓힌 두 줄(우편 아이콘 통 · 유물 전 10종)은 **0칸**
           (그 노드들은 종횡 편차 0.5% 아래라 애초에 칸을 안 만든다 — 19회차 재현의 «비균등 0» 과 같은 말).
         ⚠ **새 자리 0 · 미등재 칸 0** — 자리는 18회차와 같은 **16**(18 등재 중 band 2자리가 문턱 아래).
           새 결함이 아니라 «같은 부품을 더 많은 화면에서 본 것» 이다.
         ⇒ 칸 77 → **79**(실측 77 + 여유 2 — 여유 근거는 위와 같은 `#dgdIcon` 폭). 자리 18 은 안 건드렸다.
         ⚠ 여유 0 을 그대로 두면 **다음에 화면이 하나만 늘어도**(또는 가려짐이 한 칸 흔들려도) 자가
           «새 자리가 생겼다» 고 빨개진다 — 뜻이 아닌 이유로 빨개지는 자는 344·372·603 계열의 플레이키다. */
    /* ⚑ **750 3회차(2026-09-01, sess-1913-3830 워커 A) — 칸 79 → 48 · 자리 18 → 16. «줄이는 쪽» 이다.**
       표본(`SCREENS` 71화면)은 **한 줄도 안 넓혔다.** 줄어든 것은 결함이 닫혀서가 아니라
       **자가 잘못 세던 칸이 빠져서**다 — `probe418` 의 잉크는 «노드 opacity 0» 두 장의 차분이라
       아이콘 **앞**에서 칠하는 형제가 있으면 그 줄이 두 장에서 같아 bbox 가 짧아진다.
       750 이 그 자리를 **되돌림**(앞을 덮는 형제 가지만 치우고 다시 재기)으로 갈랐다:
         35 패스 `.ps-bx` ×3  176×**172**(+2.33%) → **176×176(0.00%)**  = 가림이었다(44칸)
         35 패스 `#psArt`     **282**×286(−1.40%) → **286×286(0.00%)**  = 가림이었다
         03 던전 `.pcb-d`     129×132(−2.27%)     → **129×132 그대로**   = 기하다(앞을 덮는 것 0개)
       ⇒ 전 화면 완주 실측 **칸 44 · 자리 14 · 판정 318**(수리 전 91 · 19 · 306).
       ⚑ **판정이 306 → 318 로 «늘었다»** — 스코프를 줄여서 초록을 만든 것이 아니라는 가장 짧은 증거다
         (가려짐·잘림 41 → 27: 문턱 3% 를 넘던 가림 자리가 제 값으로 돌아와 판정 안으로 들어왔다).
       ⚠ 여유는 **칸 4 · 자리 2** 다. 근거는 이 목록의 `band` 두 자리(`#mbox .mwell p` · `#rwCost>i`)가
         컨테이너 래스터에 따라 들락거리는 것과(나타나면 자리 +2 · 칸 +2), `em#dgdIcon` 이 실행마다
         «판정 ↔ 가려짐» 을 오가는 것(칸 +1)이다 — 뜻이 아닌 이유로 빨개지는 자는 344·372·603 계열이다.
       ⚠ **여기서부터도 «줄이는 쪽으로만»** 이다. 그리고 750 이 닫은 것은 **자의 오측**이지 제품이 아니다 —
         제품에서 고친 줄은 **0**이다(그 사실 자체가 이 회차의 판정이다. review §8~§10). */
    /* ⚑⚑ **772(2026-09-02) — 세 수를 전부 다시 적었다. 스코프가 넓어졌기 때문이다.**
       1~34회차의 스윕은 스크롤 그릇의 **첫 쪽만** 봤다(`probe418.COLLECT` 의 `r.top > innerHeight`) —
       `probe772` census 로 71화면에서 «보이는데 뷰포트 밖» 인 노드가 **249개(22.8%)** · 화면 19개.
       772 가 `sweep` 에 쪽 루프를 넣은 뒤 같은 트리의 전 화면 완주:
           판정 317 → **518** · 칸 45 → **57** · 자리 15 → **21**
       ⚠ **«올려서 초록을 만든 것» 이 아니다** — 늘어난 6자리가 전부 «↓n» 쪽 귀속이고(첫 쪽 새 자리 0),
         `판정(켠) 518 = 판정(끈) 317 + 스크롤아래 201` 항등식이 정확히 닫히며(중복 집계 0 · 첫 쪽 불변),
         끈 판 15자리가 켠 판에 전부 보존된다. 그 셋을 `verify772` 가 매 실행 단언한다.
       ⚠ **여기서부터도 «줄이는 쪽으로만»** 이다.
         · `JUDGE_MIN` 480 — 실측 518 의 **바닥**이다(스코프가 줄면 빨개지는 자). 772 이전의 180 은
           실측 317 대비 여유가 너무 커서 «절반이 사라져도 초록» 이었다 — 넓히면서 **조였다**.
         · `RATCHET_CELLS` 60 = 실측 57 + 3(750 이 44 에 4 를 준 것과 같은 여유).
         · `RATCHET_SITES` 22 = 실측 21 + 1(750·601 과 같은 여유. 자리 «이름» 은 아래 이름표가 따로 문다). */
    /* ⚑⚑ **973(2026-09-06) — `JUDGE_MIN` 은 «제품의 성질» 이 아니었다. 컨테이너의 성질이었다.**
       966 회귀가 «판정 428개뿐(≥480)» 으로 이 항을 빨갛게 만들었고, 등재문(PROGRESS 973)은
       «스코프가 줄었다 — 화면 하나가 안 열렸다/스크롤이 달랐다» 를 갈래로 남겼다. **셋 다 아니다.**
       `tools/probe973.js`(스윕은 `probe418.sweep` 한 벌 그대로 · 낱장만 접는다)로 갈랐다:
         · 진입 실패 **0** · 71화면 전부 · 화면마다 «잰 노드 ≥ 1»  ⇒ ⓐ «화면이 안 열렸다» 기각
         · 그림 **15/15** 가 기준표에 들어왔다(`srcRef == srcSeen`) ⇒ ⓑ «기준표가 못 쟀다» 기각
         · 가려짐·잘림 33 → **32**(오히려 하나 줄었다)          ⇒ ⓒ «가림이 늘었다» 기각
         · **판정 = 첫 쪽 + 스크롤 아래** 가 `518 = 317 + 201` → `428 = 227 + 201` —
           772 가 넓힌 «스크롤 아래» 는 **201 로 소수점까지 같다**. 잃은 90 은 전부 첫 쪽 몫이다.
       ⚑ **못이 박힌 자리는 여기다** — `git show 8974b01:index.html`(**2026-09-03**, 832 가
         «판정 518» 을 초록으로 적은 그 트리)을 저장소 루트에 놓고 **같은 스윕을 통째로 다시 돌렸더니**
         `잰 673 · 판정 **428** · 원본비 없음 213 · 가려짐 32 · 칸 57 · 자리 21` 로
         **오늘 트리와 판정이 한 자리도 안 다르다**(움직인 화면 1개 = 12 소환 결과(펫)의 난수 캔버스 2노드,
         판정 기여 0). ⇒ **제품은 90 을 잃은 적이 없다.** 480 은 772·832 의 컨테이너가 낸 518 의 바닥이고,
         이 컨테이너는 **같은 제품에서 428** 을 낸다(Chromium 141.0.7390.37 · playwright 1.63.0).
       ⚠ 이 위험은 이미 저장소에 적혀 있었다 — `docs/review/743-verify356게이트부패.md` §6-3:
         «칸/자리 «수» 는 **환경 간에** 다르다(한 환경 안 2회는 동일)». 아무도 그 경고를 «절대 수를
         눈금으로 쓰는 항» 에 적용하지 않았고, 그래서 이 자는 컨테이너가 갈리는 날 반드시 빨개지게 돼 있었다.
       ⇒ **절대 수 하나를 «옮겨 적어» 닫지 않는다**(그 길은 다음 컨테이너에서 똑같이 빨개진다).
         물음을 **환경 불변량 둘**로 갈아 끼우고, 절대 수는 «통째로 무너졌는가» 만 보는 바닥으로 내린다:
         · `JUDGE_COVER` — **71화면이 전부 «잰 노드 ≥ 1» 을 냈는가.** 397 사고(«화면 이름은 있는데
           한 번도 간 적이 없다»)를 스윕 자신의 말로 묻는 항이다. 진입 성공은 «눌렀다» 뿐이고
           이것은 «그 화면에서 실제로 뭔가를 쟀다» 다. 두 컨테이너에서 전부 참(최소 1노드).
         · `JUDGE_RATIO` 0.55 — **판정 ÷ 잰**. 실측 **63.4%**(오늘 트리) · **63.6%**(09-03 트리) ·
           **64.3%**(832 의 518/805) — 컨테이너·트리가 갈려도 소수 첫째까지 붙어 있는 유일한 수다.
           0.55 는 그 셋의 바닥에 여유 8%p. 스윕이 반쯤 죽으면(판정만 사라지면) 여기가 문다.
         · `JUDGE_MIN` **480 → 400** — 이제 «전량 붕괴» 만 보는 바닥이다(실측 범위 428~518 의 아래).
           ⚠ **이 수를 다시 올리지 마라** — 올리는 순간 그 값을 못 내는 컨테이너에서 자가 죽는다.
             조이는 일은 위 둘(커버리지·비)이 한다. */
    const JUDGE_MIN = 400, JUDGE_RATIO = 0.55, RATCHET_CELLS = 60, RATCHET_SITES = 22;
    /* 530 — 결정적이 된 뒤의 자리 이름표(3회 실행 전부 같은 목록). «수» 만 세면 자리가 바뀌어도 초록이다.
       ⚑ 548(2026-08-31, sess-0046-17408 워커 C) — **이름표에 «눈금» 을 붙였다.**
         이름만 있는 목록은 등재된 자리가 0.5% 에서 **20% 로 커져도 초록**이다(530 이 «수» 를 «이름» 으로
         올린 다음 칸이 여기다). 548 이 세 자리를 418 §5 방식으로 그 자리에서 시험했으므로, 그 셋에
         **«왜 남는가» + 편차 상한**을 적고 아래 `[S3] ③ 눈금` 이 상한을 단언한다.
       ⚠ **상한은 «실측 + 여유» 지 «초록으로 만드는 값» 이 아니다.** 여유의 근거는 실측 폭이다 —
         A 는 형제 가림이 들락거려 3.01 ↔ 2.00px(1.68 ↔ 1.11%) 를 오가고, B·C 는 1px 래스터가
         부호를 뒤집는 폭이다. **줄이는 쪽으로만 고쳐라.**
       ⚠ `cap: null` 은 «548 이 안 잰 자리» 다 — **안 잰 값을 적으면 그것이 헛초록이다.**
         다음 세션이 `node tools/probe548.js` 의 `CASES` 에 그 자리를 더해 재고 나서 채운다. */
    const KNOWN_SITES = [
      /* 548 §4-A — 상자는 이미 **정수 96**이고 95·96·97 어느 정수를 심어도 Δw 가 +2.00px 로 안 움직인다.
         기저값 3.01px 중 1px 은 형제 몫이다(`.gm` 은 상자가 겹치는 세 장 110·96·106 을 한 칸에 포갠다)
         — DSF2 에서는 그 가림이 «가려짐» 문턱 3% 를 못 넘어 판정에 남고 DSF3 에서는 넘어 나간다.
         남는 2px 은 DSF4 에서 그 화면 전체가 0칸이 되므로 **자의 바닥**이다(356 9회차 규칙). */
      /* ⚑ **750 3회차 — `div#shopList>div.cn-wrap>div.cn-a2>div.gm>img.cic` 를 여기서 뺐다.**
         548 이 «형제 가림 1px + 아트·AA 2px» 로 등재한 자리인데, 이 스윕은 그 노드를 **한 번도 안 잰다** —
         `.cn-a2`(평생 광고 제거 배너)는 13 재화 탭에서 `top:1374px` 이라 **스크롤 아래**이고
         `COLLECT` 은 뷰포트 밖 노드를 건너뛴다(`r.top > innerHeight`). 마크업은 살아 있다(index.html 32048).
         ⇒ 750 등재문 ⓔ «상한이 붙은 자리를 이번 실행이 안 쟀다» 의 절반이 이것이었고, 그 이유는
           «자리가 닫혀서» 도 «가림» 도 아니라 **스윕이 스크롤을 안 한다**는 스코프 구멍이다.
         ⚠ 그래서 «닫았다» 고 적지 않는다 — 목록에서만 빼고 **곁다리 772 로 등재**했다.
         ⚑ **뺀 것이 곧 감시자다** — 스윕이 스크롤을 배우거나 배너가 화면 안으로 올라오면 그 자리가
           다시 판정에 들어오고, 목록에 없으니 **[S3] ③ 이름표가 «등재 안 된 자리» 로 빨개진다.** */
      { sel: 'div#bCos>div.shsc>div.shsc-in>div.sk-btn.sk-b2.no>i.ol3>img.cic', cap: null, why: '' },
      { sel: 'div#dunList>div.dnc.bgm-rel.lkd>div.pill>em>img.cic', cap: null,
        why: '418 §5 — 그려지는 상자 50.9938. 50 도 51 도 안 통했다(50 은 악화)' },
      { sel: 'div#shopList>div.cn-wrap.pv>div.pvc.pb.ban1>div.pil>em>img.cic', cap: null, why: '' },
      { sel: 'div#shopList>div.cn-wrap.pv>div.pvc.pg>div.pil>em>img.cic', cap: null, why: '' },
      { sel: 'div#dunList>div.dnc.bgm-gold>div.pill>em>img.cic', cap: null, why: '418 §5 — 위와 같은 부품' },
      { sel: 'div#top>div.curs>div.cbox.cDia>i>img.cic', cap: null, why: '' },
      { sel: 'i#ciIcon>img.cic', cap: null, why: '' },
      { sel: 'div#shopList>div.cn-wrap>div.cn-bn>div.gem>img.cic', cap: null,
        why: '418 §5 — 상자 99.3594 를 99 로 심어도 편차가 그대로였다(✗ 상자 아님)' },
      { sel: 'div#psTk>div.ps-r>div.ps-bx.c0>i>img.cic', cap: null,
        why: '418 §5 — 상자는 정수 88 인데 행 y 가 1003.5 다(좌표 몫 · 상자로는 못 닫는다)' },
      /* ⚑ 596(2026-08-31) — **입장권 세 자리(`.sp.tk>em>img.cic`)를 목록에서 뺐다.**
         596 이 그 자리를 ref 처럼 `rotate(-18deg)` 로 눕히자 세 자리가 418 의 «종횡» 판정에서
         통째로 빠진다 — 이 축은 «그려진 잉크 bbox 의 종횡 ÷ 자산 원본 종횡» 인데, **회전한 노드의
         화면 bbox 종횡은 원본 종횡이 아니다**(1.765 → 1.328). 실제로는 «가려짐» 문턱(3%)이 먼저 물어
         `occ` 로 빠진다(예상 잉크 113.7 device px ↔ 실측 128).
         ⇒ 목록에 두면 [S3] ③ 눈금 [전제] 가 «상한이 붙은 자리를 이번 실행이 안 쟀다» 로 빨개진다.
         ⚠ **자리를 숨긴 것이 아니다** — 같은 성질을 `verify596` 이 더 좁게 단언한다:
             §2 폭이 ref 64 와 ±1% · §3 bbox 종횡이 **04 세부 자리(같은 아트·같은 각도)와 ±0.5%** ·
             §R2 «비등방으로 세로만 늘린 사본» 이 빨개진다(418 이 잡던 «늘어남» 이 바로 그것이다).
           그리고 356 의 본 정책 축인 **[A] 등방**은 이 20노드를 그대로 보고 있다(«20노드 전부 등방»).
         ⚑ **뺀 것이 곧 감시자다** — 누가 회전을 도로 빼면 세 자리가 다시 판정 안으로 들어오고,
           목록에 없으니 **[S3] ③ 이름표가 «등재 안 된 자리» 로 빨개진다.**
         (뺀 셋: `bgm-rel.lkd>.sp.tk` · `bgm-gold>.sp.tk` · `bgm-dia>.sp.tk`(cap 1.4) — 548 §4-C 주석은
          그 자리의 옛 배율 `.8269` 를 적어 두었는데 585·596 을 거치며 그 값 자체가 사라졌다.) */
      /* 548 §4-B — 상자는 이미 **정수 120** 이고 119·121 을 심어도 Δw 가 −1.00px 로 불변이다.
         Δw 가 정확히 1 device px = 래스터가 한 축을 1px 더 먹는 그 1px 이고, DSF3·4 에서 사라진다. */
      /* ⚑ **750 3회차 — `div#shopList>div.cn-wrap>div.cn-cd.alert>div.pn>em>img.cic` 를 여기서 뺐다. «닫혔다».**
         548 은 이 자리를 «래스터 1px(Δw −1.00px)» 로 등재했는데, 그 1px 의 정체가 **형제 가림**이었다.
         750 의 가림 보정 뒤 실측(`PROBE418_TOL=0 node tools/probe418.js --screen "13 재화 탭"`):
         **판정 12/12 · 잉크 240×241 · dev −0.41%** = 문턱 0.5% **아래**라 R.groups 에서 사라진다.
         ⚠ «안 쟀다»(스코프 밖) 가 아니라 «재고 나서 문턱 아래» 임을 그 실행이 못박는다 —
           판정 12개 중 하나가 이 자리이고 TOL 0 으로 낮춰야 비로소 보인다.
         ⚑ **뺀 것이 곧 감시자다** — 다시 0.5% 를 넘으면 목록에 없으니 이름표가 빨개진다. */
      /* ↓ 596 이 뺀 `bgm-dia>.sp.tk`(cap 1.4)의 근거 — **기록으로 남긴다**(자리는 위 블록이 뺐다).
         548 §4-C — **Δw 가 0.47px 로 한 device 픽셀보다 작다** = 더 정확해질 자리가 없다.
         ⚠ 부모 `em` 이 `transform:scale(.8269)` 라 **선언 상자(60.4688) ≠ 그려지는 상자(50.0016)** 다 —
           `width:50px` 를 심으면 그려지는 상자가 41.35 가 되어 다른 것을 묻게 된다(548 §3).
           그려지는 상자를 49·50.0000 으로 맞춰도 편차는 한 자리도 안 움직였다.
         ⚠ 51 로 키우면 «초록» 이 되지만 그것은 수리가 아니라 **스코프 손실**이다
           (그 실행의 판정 12 → 7 · 가려짐 0 → 5 — 다섯 노드가 판정 밖으로 나갔다).
       ⚑ **601(2026-08-31, sess-0837-10287) — 이 줄을 실제로 뺀 것은 여기다.**
         위 문장(«596 이 뺐다»)은 상류에 들어와 있었는데 **`{ sel: … bgm-dia … }` 항 자신은 남아 있었다** —
         주석만 이관되고 자리가 안 지워진 것이다. 그 결과 `[S3] ③ 눈금 [전제]` 가
         «상한이 붙은 7자리 중 6자리만 이번 실행이 쟀다» 로 빨갰다(596 이후 이 자리는 **판정에 안 들어온다**).
       ⚑ **왜 안 들어오는가 — 닫힌 것이 아니라 «이 자의 스코프 밖» 이 된 것이다.**
         596 이 카드 입장권을 **−18° 로 눕히자**(`.dnc .sp.tk>em` rotate) 회전한 그림의 잉크 bbox 가
         원본(회전 안 한 기준표)의 «상자를 얼마나 채우는가»(fw·fh)와 3% 넘게 어긋나 **«가려짐» 으로 빠진다.**
         `probe418 --screen "03"` 실측이 그 산수를 그대로 보여 준다 — 596 전 «판정 18 · 가려짐 0 · 3자리(입장권)»,
         596 후 **«판정 13 · 가려짐 5 · 입장권 0자리»** ⇒ 정확히 그 다섯 칸이 판정에서 가려짐으로 옮겨 갔다.
         ⇒ 이 자리의 **종횡 소유권은 `tools/verify596.js`** 로 넘어갔다(회전각·등방 contain·bbox 를 그 자가 직접 잰다).
            [S3] 은 «회전 안 한 원본비» 자라 회전한 노드를 판정할 수 없다 — 여기 남겨 두면 헛초록이 아니라
            **영원한 빨강**이 된다. */
      /* ── 356 12회차 — **새로 스코프에 들어온 두 자리**(SCREENS 48 → 56).
         둘 다 이 회차가 «처음 본» 자리이지 새로 생긴 결함이 아니다 — 그 화면들이 여태 스캔 밖이었다.
         ⚠ [S3] 은 **래스터**(소수 상자·페인트 스냅) 축이고 [A] 는 **선언된 변환** 축이다. 아래 첫 자리는
           12회차가 [A] 쪽을 역보정으로 닫은 바로 그 노드인데, 여기 남는 0.74% 는 그것과 다른 물음이다. */
      /* ⚑ 750 3회차 — **눈금을 1.4 → 2.8 로 올렸다. «실측이 커져서» 가 아니라 «잉크가 커져서» 다.**
         12회차는 이 자리를 **08 스킬 세부**에서 잉크 **40×43** · +0.74% 로 등재했는데, 750 등재문이
         잡은 +1.79% 는 **08 코스튬 세부**의 같은 셀렉터이고 잉크가 **49×52** 다(그 사이 다른 회차의
         제품 변경이 시트를 키웠다 — 이 자리에서 내가 고친 줄은 0). 한 device px 이 49px 잉크에서
         **2.04%** 라 1.79% 는 **한 픽셀도 안 되는 값**이다.
         ⚑ 올려서 초록을 만든 것이 아니라는 증거는 **DSF 수렴**이다(356 9회차 규칙) —
           같은 화면·같은 트리에서 **DSF2 +1.79%(49×52) → DSF3 +1.09%(73×78) → DSF4 +0.75%(97×104)**.
           배율을 올릴수록 0 으로 가면 그것은 기하가 아니라 **자의 바닥**이다.
           상자는 정수 26.0001 이고 좌표가 소수(700.9767, 1041.0938)라 상자로는 못 닫는 자리다.
         실측 1.79% + 래스터 반 px 1.02% ⇒ 2.8. ⚠ 줄이는 쪽으로만 고쳐라. */
      { sel: 'div.skd>div.sk-ct>div.vl>div.nt>b>img.cic', cap: 2.8,
        why: '356 12회차 등재(08 스킬 세부 · 잉크 40×43 · +0.74%) · 750 3회차 재측정 — ' +
             '08 코스튬 세부의 같은 셀렉터가 잉크 49×52 · +1.79% 다. DSF2·3·4 가 1.79 → 1.09 → 0.75% 로 ' +
             '수렴 = 자의 바닥(1 device px 이 2.04%). 상자는 정수 26.0001, 좌표가 소수라 상자로는 못 닫는다' },
      /* ⚠ **이 자리는 실행마다 나왔다 안 나왔다 한다** — 같은 트리·같은 DSF2 로 돌린 독립 두 실행이
         «칸 63 · 자리 18» ↔ «칸 67 · 자리 19» 로 갈렸고, 갈린 항이 정확히 이것 하나다.
         `#dgdIcon` 은 `openDunDetail()` 이 `curIcEl()` 로 채우는 슬롯이라 이미지가 그 프레임에 붙었는지에
         따라 «판정» 과 «가려짐» 사이를 오간다. 값 자체는 두 실행 다 −1.49% 로 같다(자리의 «유무» 만 흔들린다).
         ⇒ 이름표에는 올려 두되(안 올리면 나올 때마다 «등재 안 된 자리» 로 빨개진다) **흔들림은 **601** 로 등재돼 있다. */
      { sel: 'em#dgdIcon>img.cic', cap: 2.6,
        why: '356 12회차 — 04 던전 세부 보상 아이콘(잉크 132×134 · −1.49%). ⚠ 실행마다 판정↔가려짐을 오간다(601)' },
      /* ── 601(2026-08-31) — 584·585 가 판정 안으로 데려온 두 자리. 시험은 `tools/probe601.js`.
         ⚑ **눈금(cap)은 «실측 + 래스터 반 픽셀» 로 통일해 적었다** — 여유의 근거를 «느낌» 이 아니라
           그 자리의 산수로 둔다: `한 device px 이 이 잉크에서 만드는 %` ÷ 2.
           그러면 **한 래스터 픽셀이 통째로 튀는 순간은 반드시 빨개진다**(A 4.15% · B 2.35%) —
           상한이 «초록으로 만드는 값» 이 아니라는 것을 그 수가 증명한다.
         ⚠ 줄이는 쪽으로만 고쳐라. */
      { sel: 'div#trRunes>div.tr-rn>span.rbt.b1.no>i>img.cic', cap: 3.4,
        why: '601 — 584 `TR_CUR_PX = 53`. 상자는 이미 정수 53 · x 를 491·492 로 밀어도 편차 불변(좌표 몫 아님) · ' +
             '이웃 정수 52/54 도 문턱 위 · DSF2·3·4 에서 2.64 → 1.64 → 1.13% 로 수렴 = AA 테(자의 바닥). ' +
             '%가 큰 것은 rstone 아트가 .625×1.000 이라 잉크(68px)가 이 표에서 제일 좁기 때문이다. ' +
             '실측 2.64%(DSF2 3회 폭 0) + 래스터 반 px 0.75% ⇒ 3.4' },
      /* ⚑ 750 3회차(마감 직전 rebase) — **687 이 판정 안으로 데려온 자리.** 내 스윕 완주(칸 44 · 자리 14)
         **뒤에** 상류로 들어온 `wip(687)`(룬 탭 재화 잔량 헤더 신설 · `e671ab3`)이 **같은 재화 아이콘을
         새 호스트에 하나 더** 놓았다 ⇒ 칸 45 · 자리 15(래칫 48·16 안 — 여유가 이걸 받아 냈다).
         11·12회차·601 규약대로 **수를 올리지 않고 자리별 귀속을 찍어** 이름표로만 등재한다:
         `node tools/probe418.js --screen "23 룬"` 이 두 자리를 **나란히** 찍는데
         **잉크 68×106 · 상자 정수 53.0000 · +2.64% 가 소수점까지 같다** — 바로 아래
         `#trRunes .rbt.b1.no`(601 이 cap 3.4 로 등재한 자리)와 **같은 부품의 추가 목격**이다.
         ⇒ 눈금도 그 자리의 것을 그대로 쓴다(601 의 근거가 그대로 성립한다 — 상자는 이미 정수이고
            `%`가 큰 것은 rstone 아트가 .625×1.000 이라 잉크가 이 표에서 제일 좁기 때문이다). */
      { sel: 'div#rnHd>span.pv>i>img.cic', cap: 3.4,
        why: '750 3회차 — 687(룬 헤더 재화 잔량)이 새 호스트에 놓은 같은 아이콘. ' +
             '`#trRunes .rbt.b1.no`(601 · cap 3.4)와 잉크 68×106 · 상자 정수 53 · +2.64% 가 소수점까지 같다 ' +
             '= 같은 부품의 추가 목격이지 새 결함이 아니다(같은 화면에서 두 자리가 나란히 찍힌다)' },
      { sel: 'div#dunList>div.dnc.bgm-rel>div.pill>em>img.cic', cap: 1.8,
        why: '601 — 585 `.dnc .pill>em` relic 배율 1.14664. 03 **탑** 의 «잠금 안 걸린» 인스턴스로, ' +
             '위 `.dnc.bgm-rel.lkd>.pill`(03 던전)과 상자 54.4833 · 잉크 94×107 · +1.27% 가 전부 같은 한 부품이다. ' +
             'Δw 가 DSF2·3·4 에서 +1.18 · −0.99 · +1.01 device px 로 한 래스터 픽셀에 붙박이(부호까지 뒤집힌다). ' +
             '585 이전 배율(1.0732)을 도로 심으면 문턱 아래로 사라진다(귀속 확인). ' +
             '실측 1.27%(DSF2 4회 폭 0) + 래스터 반 px 0.54% ⇒ 1.8' },
      /* ── 356 15회차(2026-08-31) — **새로 스코프에 들어온 세 자리**(SCREENS 56 → 62).
         12회차의 08 세부와 같은 성질이다 — 새로 생긴 결함이 아니라 **그 화면이 여태 스캔 밖**이었다.
         눈금은 601 과 같은 산수: **실측 + (한 device px 이 이 잉크에서 만드는 %) ÷ 2**.
         ⚠ 셋 다 이 회차가 «고칠 자리» 로 안 잡는다 — 15회차가 제품에서 고친 것은 [A] 축(선언된
           비균등 배율)이고, 여기 남는 것은 **래스터**(소수 상자·페인트 스냅) 축이다. 상자를 정수로
           미는 처방은 418·548 이 자기 자리에서 시험해 온 별개 축이고, 여기서 같이 손대면
           «이번 회차가 무엇을 움직였나» 를 못 가른다. */
      /* ⚑ **356 16회차 — `#sumB10`·`#sumB30` 젬 두 자리를 여기서 뺐다. «닫혔기 때문» 이다.**
         15회차는 이 자리를 «상자가 **소수** 55.2016×56.1563» 이라는 래스터 축으로 등재했는데,
         16회차 재현(`tools/cal356r16.js`)이 그 소수·비정사각 상자를 만든 것이 **선언된 비균등 배율**
         `.sm-b .gem{transform:scaleX(.983)}` 임을 보였다(`.cic` 자신의 상자는 `1.08em × fs 52`
         = **56.1563 정사각**이고 56.1563 × .983 = **55.2016**). 397 «작은 쪽으로» 로 등방화하자
         전 화면 스윕에서 **두 칸이 통째로 사라졌다**(−1.89% → 문턱 아래). 잉크 중심 Δ0.
         ⚠ 목록에 남겨 두면 `[S3] ③ 눈금 [전제]` 가 «상한이 붙은 자리를 이번 실행이 안 쟀다» 로
           빨개진다(601 이 `bgm-dia` 에서 겪은 그 자리) — 그래서 **뺐다**.
         ⚑ **뺀 것이 곧 감시자다** — 누가 `scaleX` 를 도로 넣으면 두 칸이 다시 판정에 들어오고,
           목록에 없으니 **[S3] ③ 이름표가 «등재 안 된 자리» 로 빨개진다.**
           선언 자체는 위 **[S6]** 이, 자가 살아 있는지는 **[R14]** 가 따로 지킨다. */
      /* ── 356 16회차(2026-08-31) — **이 회차가 처음 본 두 자리.** 15회차 이후 상류가 화면을
         넓히면서 판정에 들어왔고, 착수 기준선(149/150)의 유일한 빨강이 «등재 안 된 자리 2개» 였다.
         ⚠ 둘 다 **이 회차가 만든 것이 아니고**(제품에서 내가 고친 곳은 `.sm-b .gem` 한 자리다)
           **고칠 자리로도 안 잡았다** — 축이 다르다(래스터·기하 ↔ 이 회차의 [A] 선언 축).
           15·12회차가 새 자리를 다룬 방식 그대로 **이름표 + 눈금**으로만 등재한다.
         눈금은 601 과 같은 산수: **실측 + (한 device px 이 이 잉크에서 만드는 %) ÷ 2**. */
      { sel: 'div#mbox>div.mwell>p>img.cic', cap: 5.1, band: true,
        why: '356 16회차 등재 · 17회차 성질 보강 — 55 길라잡이 모달 본문의 화폐 아이콘. ' +
             '16회차 실측 −4.00%(잉크 48×50, DSF2·3·4 로 −4.00 → −4.05 → −2.04 = 자의 바닥 쪽), ' +
             '17회차 같은 화면이 DSF2(×3)·3·4 전부 **문턱(0.5%) 아래**(재현 tools/cal356r17.js). ' +
             '잉크 24×25 로 1px 이 4% 라 값은 제품이 아니라 **그 실행 컨테이너의 래스터**가 정한다 ' +
             '⇒ band(들락거림). 상자 25.9063 정사각(소수)·모달 본문 공용 셀렉터는 그대로 — ' +
             '나타나는 실행에서는 눈금 5.1 이 그대로 문다. 실측 −4.00% + 래스터 반 px 1.04% ⇒ 5.1' },
      { sel: 'div#rwCost>i>img.cic', cap: 3.7, band: true,
        why: '356 16회차 등재 · **17회차가 «기하» 판정을 기각** — 89 유물 소환 비용의 유물조각 아이콘. ' +
             '16회차는 DSF2·3 이 −2.92% 로 같아(잉크 64×76) «기하 — 아트·좌표를 물어라» 로 넘겼는데, ' +
             '① 그 «DSF4 진입 실패» 의 정체는 진입이 아니라 **캡처 타임아웃**(4320×9120 = 39MP 가 기본 30초를 ' +
             '넘겼다 — sweep 이 배율 비례 타임아웃을 갖게 수리)이었고 ② 세 점을 채우니 ' +
             '**+0.11 → +1.00 → +0.11%**(DSF2 8회 전부 잉크 66×76 · 재현 tools/cal356r17.js). ' +
             '−2.92% 의 정체는 잉크 폭 64↔66: 검은 외곽선이 어두운 알약(#191614, 만점 diff≈67) 위라 ' +
             '경계 칸 diff 가 문턱 12 근처이고, 아이콘 x 가 flex 중앙정렬로 형제 텍스트 «100» 의 래스터 폭에 ' +
             '물려 있어(상자 @476.9375) **컨테이너 래스터에 따라 칸이 들락거린다** ⇒ band. ' +
             '상자 38.8750 정사각·무변환·아트(육각 잉크 54×62)는 전부 정상 — 제품에 고칠 것이 없다. ' +
             '실측 −2.92%(16회차 컨테이너) + 래스터 반 px 0.78% ⇒ 3.7' },
      /* ⚑ **750 3회차 — `span#tutoRew>img.cic` 를 여기서 뺐다. «닫혔다».**
         356 15회차가 −0.81%(잉크 122×123)로 등재하고 750 등재문이 **−2.75%**(눈금 1.2 초과)로 잡던
         자리다. 둘 다 **형제 가림**이었다 — 가림 보정 뒤 전 화면 완주에서 **칸 0**이고,
         눈금의 집인 31 던전 클리어에서 `PROBE418_TOL=0` 으로 물어도 **0칸**(그 화면 판정 3개가 전부 0.00%).
         자리 자체는 살아 있다: 같은 화면 실측이 상자 64.8560 @974.57,1823.47 · 잉크 **130×130 · 0.00%** 다
         (앞을 덮던 형제 `div.on` 을 치워도 131×131 · 0.00% — 값이 «가림 없이도» 정사각이다).
         ⚑ **뺀 것이 곧 감시자다** — 다시 0.5% 를 넘으면 이름표가 빨개진다. 상자가 정수 67 인지는
           위 **[S3] ①** 이 그대로 지키고 있다(그 항은 한 칸도 안 건드렸다). */
      /* ── ⚑ 750 3회차 — **가림 보정 뒤에도 남는 자리 다섯.** 등재문 ⓒ «이름표 미등재 8자리» 중
         가림이었던 셋(`.ps-bx.c1`·`.ps-bx.c2`·`#psArt`)은 닫혔고, 나머지가 여기다.
         눈금은 601 과 같은 산수: **실측 + (한 device px 이 이 잉크에서 만드는 %) ÷ 2.**
         ⚠ 다섯 다 이 회차가 «고칠 자리» 로 안 잡았다 — 750 의 작업 단위는 **자**이고 제품은 0줄이다.
           `.pcb-d` 는 처방까지 그 자리에서 시험해 두었으니(아래 `why`) 값을 회수할 세션이 이어받으면 된다. */
      { sel: 'div#dunw>div.pcb>div.pcb-p.pcb-d>i>img.cic', cap: 2.7,
        why: '750 — 41 팝업 내장 재화 바의 다이아 칸(잉크 129×132 · −2.27% · 5화면). ' +
             '**가림이 아니다**(앞을 덮는 형제 0개 — 되돌림에서 값이 한 칸도 안 움직인다). ' +
             '아트도 아니다(probe750 §2 — `cur-dia.svg` 는 65.30 상자에서 130×130 정사각). ' +
             '⇒ 소수 상자 65.2969 @소수 좌표 y 22.3594 가 만든 래스터다. ' +
             '처방 시험(`PROBE418_CSS` 로 `.cic` 를 정수 65 로): **−2.27% → −0.77%** (잉크 129×130) — ' +
             '값의 3분의 2가 상자 몫이라 회수 가능하지만 그 CSS 는 제품이라 **772** 로 넘긴다. ' +
             '같은 상자의 형제 `.pcb-g`(골드)가 0.00% 인 것이 «아트가 아니라 자리» 라는 대조다. ' +
             '실측 2.27% + 래스터 반 px 0.39% ⇒ 2.7' },
      { sel: 'div#relw>div.pcb>div.pcb-p.pcb-d>i>img.cic', cap: 2.7, why: '750 — 위와 같은 한 부품(`.pcb`)의 89 유물 인스턴스. 값·잉크·상자가 소수점까지 같다' },
      { sel: 'div#shopw>div.pcb>div.pcb-p.pcb-d>i>img.cic', cap: 2.7, why: '750 — 위와 같은 한 부품(`.pcb`)의 10 상점 인스턴스. 값·잉크·상자가 소수점까지 같다' },
      { sel: 'div#relw>div.pcb>div.pcb-p.pcb-r>i>img.cic', cap: 1.2,
        why: '750 — 같은 바의 유물조각 칸(잉크 100×114 · +0.70% · 3화면). ' +
             '**아트가 크기를 타는 것이 전부다** — probe750 §2 가 `cur-relic.svg` 를 여덟 크기에서 재 두었고 ' +
             '그 표의 57 칸이 **+0.70% 로 소수점까지 같다**(획이 가늘어 작아질수록 AA 문턱을 못 넘는 축이 생긴다). ' +
             '⇒ 화면에 고칠 것이 없다. 실측 0.70% + 래스터 반 px 0.50% ⇒ 1.2' },
      { sel: 'div#dunList>div.dnc.bgm-dia>div.pill>em>img.cic', cap: 1.5,
        why: '750 — 03 카드 알약의 다이아 인스턴스(잉크 104×103 · +0.97% · 3화면). ' +
             '601 이 같은 부품의 `bgm-rel`(cap 1.8)·`bgm-gold` 를 이미 등재해 둔 그 자리이고, ' +
             '`em` 의 `transform:scale(1.0732)` 로 47.52 에 래스터한 뒤 확대라 **잉크가 커진다**(102 → 104). ' +
             '실측 0.97% + 래스터 반 px 0.49% ⇒ 1.5' },
      /* ⚑ **356 34회차 — 667(이용권 UI 재작업 · 4회차)이 판정 안으로 데려온 자리.**
         착수 기준선(08:03~08:35 전수 실행)은 «자리 15개 · 이름표 전부 등재» 로 **초록**이었고,
         그 뒤 상류로 들어온 `wip(667)` 4회차(124 이용권 탭 카드 리본 개편)가 리본 안에 재화 아이콘을
         하나 더 놓았다 ⇒ 자리 16개(래칫 16 안 · 칸 45 → 46, 래칫 48 안).
         11·12·15·16회차·601·750 규약대로 **수를 올리지 않고 자리별 귀속을 찍어** 이름표로만 등재한다:
         `node tools/probe418.js --screen "124 이용권 탭"` 이 **잉크 104×103 · +0.97% · 상자 정수 52.0000**
         을 찍는데, 그 값이 바로 위 `bgm-dia`(750 · cap 1.5)와 **소수점까지 같다** — 같은 아트(`cur-dia`)를
         같은 크기로 그린 **추가 목격**이지 새 결함이 아니다.
         ⚑ **고칠 자리가 아니라는 근거는 DSF 수렴이다**(356 9회차 규칙) — 같은 화면·같은 트리에서
           **DSF2 +0.97% → DSF3 문턱 아래 → DSF4 문턱 아래**. 상자는 이미 정수 52 이고 남은 것은
           **좌표가 .5**(386.5, 876.5)라 래스터가 한 축을 1px 더 먹는 그 1px 이다(한 device px 이 0.96%).
         ⚠ 눈금은 601 과 같은 산수 — 실측 0.97% + 래스터 반 px 0.49% ⇒ **1.5**. 줄이는 쪽으로만 고쳐라.
       ⚑⚑ **832(2026-09-02, sess-1758-29795 루틴 워커 D) — 위 자리
         `div#shopList>div.cn-wrap.pv>div.pvc.pb.ban1>div.rb.rb1>b>img.cic`(cap 1.5)를 여기서 뺐다. «닫혔다».**
         34회차가 등재한 그 +0.97% 는 주석 자신이 적어 둔 대로 **한 device px 이 전부**였고
         (104/103 − 1 = 0.9709%), 667 이 5~9회차로 리본을 마감하며 그 1px 이 사라졌다 —
         배너형 금색 판이 91 → **79** 로, `.cic` 이 60 → **52** 로, `.rb{left:−3 → 0}`·`w1 −3`·`--gx` 가
         자리를 옮기면서 아이콘이 (386.5, 876.5) → **(377.5, 869.5)** 로 갔다.
         **재현(`node tools/probe832.js` · 3회 실행 전부 같은 값)**:
             노드는 살아 있다 — `#shopList .rb.rb1` 3개 · 그 안 `b>img.cic` 3개
             세 문(크기 ≥8 · 뷰포트 안 · 보임)을 전부 통과한다 = **판정 스코프 안**
             `PROBE418_TOL=-1 node tools/probe418.js --screen "124 이용권 탭"`
               → **잉크 104×104 · 상자 52.0000 @ 377.5,869.5 · dev 0.00%**(판정 13/13 · 가려짐·잘림 0)
             DSF3 도 **156×156 · 0.00%** (배율을 올려도 안 되살아난다)
         ⚑ **832 등재문의 «판정 스코프 밖» 진단은 여기서 기각한다** — 등재는 `PROBE418_TOL=0` 으로
           «문턱을 0 으로 낮춰도 안 나온다» 를 근거로 삼았는데, 판정은 `Math.abs(dev) > TOL` 이라
           **dev 가 정확히 0 인 자리는 TOL 0 에서도 안 나온다**(엄격 부등호). TOL 0 은
           «스코프 밖» 과 «dev = 0» 을 못 가른다 — 가르는 손잡이는 **음수 TOL** 이다.
         ⚑ **dev 가 0 으로 닫힌 자리는 목록에 남길 수가 없다**(구조적 이유) — [전제] 는 그 자리가
           `R.groups` 에 있기를 요구하는데 거기 들려면 `|dev| > 0.5%` 여야 하고, 설령 문턱을 낮춰
           들여놓아도 바로 아래 §R 되돌림이 `|dev| > |dev|/2` 로 **0 을 거른다**(548 2회차 교훈 2).
           ⇒ «닫힌 자리를 빼는 것» 이 이 두 항이 뜻대로 사는 유일한 길이다.
         ⚑ **뺀 것이 곧 감시자다**(750·596·601 선례) — 이 자리가 다시 0.5% 를 넘으면 목록에 없으니
           **[S3] ③ 이름표가 «등재 안 된 자리» 로 빨개진다.** 되살릴 때는 그때의 실측으로 눈금을 새로 적어라. */
      /* ⚑⚑ **772(2026-09-02, sess-1628-21267 워커 B) — 스윕이 «스크롤 아래» 를 배우며
         처음 판정에 들어온 여섯 자리.** 1~34회차의 스윕은 스크롤 그릇의 **첫 쪽만** 봤다
         (`probe418.COLLECT` 의 `r.top > innerHeight`). `probe772` census 실측:
         71화면에서 뷰포트 안 842 · **밖 249(22.8%)** · 구멍이 있는 화면 **19개**.
         772 가 `sweep` 에 쪽 루프를 넣자 전 화면 완주가 이렇게 바뀌었다 —

             판정 317 → **518**  ·  칸 45 → **57**  ·  자리 15 → **21**
             (쪽을 넘긴 화면 34 · 더 돈 쪽 63 · 상한에 걸린 그릇 5)

         ⚑ **여섯 다 «새 결함» 이 아니라 «처음 본 것» 이다** — 그 증거가 세 가지 있다:
           ① **귀속**: 여섯의 `screens` 가 **전부 «↓n» 쪽**이다(첫 쪽에서 새로 생긴 자리 0개).
           ② **항등식**: `판정(켠) 518 = 판정(끈) 317 + 스크롤아래판정 201` 이 **정확히** 닫힌다 —
              모든 쪽에 걸치는 노드를 두 번 세지 않았고 첫 쪽 값이 한 칸도 안 변했다는 뜻이다
              (`PROBE418_NOSCROLL=1` 로 같은 트리를 재서 대조. `verify772` [C] 가 이 항등식을 문다).
           ③ **보존**: 끈 판의 15자리가 켠 판에 **전부** 있고, 옛 자리 중 칸이 늘어난 것은 **0개**다.
         ⚠ 그래서 여기서 «수를 올린 것» 은 스코프를 넓힌 대가이지 초록을 만든 값이 아니다.
           **다음 세션도 규칙은 그대로다 — 이 두 수는 줄이는 쪽으로만 고쳐라.**
         ⚠ `cap: null` 인 이유: 548 §4 방식의 자리별 시험(«상자를 정수로 심으면 닫히는가»)을
           772 는 **안 했다**. 안 잰 값을 적으면 그것이 헛초록이다(548 규율).
         ⚑ 넷(`bgm-rstone`·`bgm-stone` 잠금/해금)은 601·750 이 이미 등재한 `.dnc>.pill>em>img.cic`
           **한 부품의 다른 보상 종류**다 — 같은 부품을 더 아래 카드에서 본 추가 목격이다. */
      { sel: 'div#dunList>div.dnc.bgm-rstone.lkd>div.pill>em>img.cic', cap: null,
        why: '772 — 03 카드 알약의 룬강화석 인스턴스(+1.68% · 2칸). 03 던전 ↓1 · 04 던전 세부 ↓1 = ' +
             '**전부 스크롤 아래** 쪽에서만 나온다. 601(`bgm-rel` cap 1.8)·750(`bgm-dia` cap 1.5)과 같은 부품' },
      { sel: 'div#dunList>div.dnc.bgm-rstone>div.pill>em>img.cic', cap: null,
        why: '772 — 위와 같은 자리의 해금판(+1.68% · 1칸 · 03 던전(전량 해금) ↓1)' },
      { sel: 'div#dunList>div.dnc.bgm-stone.lkd>div.pill>em>img.cic', cap: null,
        why: '772 — 같은 부품의 단련석 인스턴스(+0.95% · 2칸 · 03 던전 ↓1 · 04 던전 세부 ↓1)' },
      { sel: 'div#dunList>div.dnc.bgm-stone>div.pill>em>img.cic', cap: null,
        why: '772 — 위의 해금판(+0.95% · 1칸 · 03 던전(전량 해금) ↓1)' },
      { sel: 'div#cnMile>em>img.cic', cap: null,
        why: '772 — 13 재화 탭 마일리지 상자의 아이콘(−0.78% · 1칸 · 13 재화 탭 ↓1)' },
      { sel: 'div#shopList>div.cn-wrap>div.cn-cd.dtk>div.pn>em>img.cic', cap: null,
        why: '772 — 13 재화 탭 다이아 티켓 카드의 가격 알약(−0.78% · 5칸 · 13 재화 탭 ↓2). ' +
             '한 종류의 카드가 다섯 장이라 칸이 다섯이다 — 자리는 하나다' },
    ];

    /* ① 정수 상자 다섯 자리 — «상자가 아직 정수인가».
       ⚠ «0칸» 이 아니라 «정수 상자» 를 묻는다: 정수화해도 소수 **좌표**가 남는 자리가 있고
         (36 출석 패스는 행 y 가 …​.5 라 잉크에 1px 이 남는다 = +0.61%) 그건 상자가 만든 것이 아니다.
         0칸을 물으면 이 항이 상자와 무관한 이유로 빨개져 결국 눌러 끄게 되고, 그러면 정수 상자가
         통째로 사라져도 초록인 게이트가 남는다(328 교훈). 좌표가 남긴 잔여는 아래 ③ 래칫이 센다. */
    for (const f of FIXED) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(800);
      for (const q of f.open) {
        await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, q);
        await page.waitForTimeout(420);
      }
      await page.waitForTimeout(200);
      /* ⚠ **`getBoundingClientRect` 로 재면 안 된다** — 그 값은 조상의 `transform` 이 곱해진 뒤다.
         미션 배너(`#tuto`)는 상태 클래스(`.ready`·`.todo`)마다 배율이 달라 같은 정수 상자가
         64.86 / 66.90 으로 읽힌다(1회차에 이 항이 그래서 한 번 빨갰다). 물어야 할 것은 **선언된 상자**다. */
      const got = await page.evaluate((s) => {
        const el = document.querySelector(s); if (!el) return null;
        const cs = getComputedStyle(el); return [parseFloat(cs.width), parseFloat(cs.height)];
      }, f.sel);
      if (!got) bad(`[S3] ① ${f.lab} — 진입 실패: \`${f.sel}\` 가 0개다 (헛초록 방지)`);
      else if (Math.abs(got[0] - f.box) > 0.01 || Math.abs(got[1] - f.box) > 0.01) {
        /* 743 — «소수 상자(418 의 원래 결함)» 와 «정수인데 기대값이 다르다(FIXED 표가 제품 규격
           변경을 안 따라왔다 — 644 꼴)» 는 다른 병이라 문구를 가른다. 후자를 전자로 적으면
           다음 세션이 418 회귀로 오독한다(743 등재 회차가 실제로 그랬다). */
        const isInt = (v) => Math.abs(v - Math.round(v)) < 0.01;
        const why = (isInt(got[0]) && isInt(got[1]))
          ? '정수 상자인데 기대값이 다르다 — 제품 규격이 바뀌었으면 FIXED 표를 따라잡을 것(644 꼴)'
          : '소수 상자 1.08em 이 되살아났다';
        bad(`[S3] ① ${f.lab} — 상자 ${got[0]}×${got[1]}, 기대 ${f.box} 정수 (${why})`);
      }
      else ok(`[S3] ① ${f.lab} — 상자 ${f.box} 정수 고정`);
      await ctx.close();
    }

    /* ② 스윕이 실제로 돌았는가 — 헛초록 방지. 화면 진입 실패가 있으면 그 화면은 감시 밖이다(397 사고). */
    /* 973 — `rows` 를 켠다(낱장은 이 절의 커버리지 항이 읽는다 · 973 이 `probe418.sweep` 에 낸 옵션) */
    const R = await inkSweep({ dsf: 2, rows: true });
    if (R.errs.length) bad(`[S3] ② 스윕 — 화면 ${R.errs.length}개 진입 실패: ${R.errs.join(' / ')}`);
    else ok(`[S3] ② 스윕 — 화면 ${R.screens}개 전부 진입`);
    /* ⚑ 973 — **커버리지**: SCREENS 의 모든 화면이 «잰 노드 ≥ 1» 을 냈는가.
       «진입했다» 는 «눌렀다» 까지고, 이 항은 «그 화면에서 실제로 뭔가를 쟀다» 다(397 사고의 스윕 판).
       낱장의 화면 이름은 쪽 표시(`… ↓n`)가 붙으므로 **밑동 이름**으로 접어서 센다. */
    const coverOf = (rows) => {
      const seen = new Set(rows.map((r) => String(r.screen).replace(/ ↓\d+$/, '')));
      return SCREENS.map(([l]) => l).filter((l) => !seen.has(l));
    };
    {
      const miss = coverOf(R.rows);
      if (miss.length)
        bad(`[S3] ② 커버리지 — 잰 노드가 0개인 화면 ${miss.length}개: ${miss.join(' / ')}\n` +
          '        (진입은 했는데 아무것도 못 쟀다 = 그 화면은 이 절의 감시 밖이다)');
      else ok(`[S3] ② 커버리지 — ${SCREENS.length}화면이 전부 «잰 노드 ≥ 1» 을 냈다`);
      /* §R 되돌림 — 한 화면의 낱장을 빼면 이 항이 정말 빨개지는가(334 — 무르게 푼 항이 아님을 못박는다) */
      const victim = SCREENS[0][0];
      const doctored = R.rows.filter((r) => String(r.screen).replace(/ ↓\d+$/, '') !== victim);
      if (coverOf(doctored).length === 1) ok(`[S3] ② 커버리지 §R — «${victim}» 낱장을 빼면 이 항이 그 화면을 짚는다 (0건 항이 «안 보는 자» 가 아니다)`);
      else bad(`[S3] ② 커버리지 §R — «${victim}» 을 빼도 안 짚는다: 이 항은 아무것도 안 보고 있다`);
    }
    /* ⚑ 973 — **비**(판정 ÷ 잰). 절대 수는 컨테이너마다 다르지만 이 비는 안 움직인다
       (63.4% 오늘 · 63.6% 09-03 트리 · 64.3% 832). 스윕이 반쯤 죽으면 여기가 문다. */
    {
      const ratio = R.measured ? R.judged / R.measured : 0;
      const pct = (ratio * 100).toFixed(1);
      if (ratio < JUDGE_RATIO)
        bad(`[S3] ② 비 — 판정 ÷ 잰 = ${R.judged}/${R.measured} = ${pct}% (≥${(JUDGE_RATIO * 100).toFixed(0)}% 이어야 한다): 판정만 사라졌다`);
      else ok(`[S3] ② 비 — 판정 ÷ 잰 = ${R.judged}/${R.measured} = ${pct}% ≥ ${(JUDGE_RATIO * 100).toFixed(0)}%`);
    }
    if (R.judged < JUDGE_MIN) bad(`[S3] ② 스윕 — 판정한 노드가 ${R.judged}개뿐(≥${JUDGE_MIN} 이어야 한다): 스코프가 통째로 무너졌다`);
    else ok(`[S3] ② 스윕 — 판정 노드 ${R.judged}개 (원본비 없음 ${R.outside} · 가려짐·잘림 ${R.clipped})`);
    /* ⚑ 530 — «상시» 상태에서 쟀는가. 스윕은 재기 전에 연출 레이어(`#fxlc`·`#fxl`)를 비우고
       `fx-*` 클래스를 걷는다. 그것이 이 절이 흔들리던 뿌리였다 — 찰나의 노드(재화 비행·알약 펀치)가
       어느 프레임에서 굳었느냐로 잉크가 통째로 달라져 ③ 래칫이 실행마다 50·51·52·53 을 오갔다.
       ⚠ 이 항이 없으면 정규화가 **조용히 안 먹어도** 아무도 모른다(397 «무음 실패» 사고와 같은 꼴) —
         레이어 이름이 바뀌면 스윕이 던져 ② 첫 항이 빨개지고, 걷다 만 잔여는 여기가 잡는다. */
    if (R.fxLeft) bad(`[S3] ② 스윕 — 연출 정규화 잔여 ${R.fxLeft}건: «상시» 상태가 아닌 프레임을 쟀다(래칫이 흔들린다)`);
    else ok(`[S3] ② 스윕 — 연출 정규화: 레이어 노드 ${R.fx}개 · \`fx-\` 클래스 ${R.fxCls}개를 걷고 «상시» 상태에서 쟀다 (잔여 0)`);

    /* ③ 래칫 — «칸 수» 와 «자리 수» 둘 다 세운다.
       ⚠ 이 값은 «0» 이 아니다. 남은 자리들은 **상자가 이미 정수**이거나(좌표·아트·AA 몫)
         처방을 넣어 봐도 편차가 안 사라진 자리다(418 §5 실측표 — 03 던전 알약은 50 도 51 도 안 통했다).
         0 으로 적으면 이 항은 첫 실행부터 영원히 빨간 게이트가 된다(348 교훈).
       ⚠ **줄이는 쪽으로만 고쳐라.** 늘려서 초록을 만드는 순간 이 자는 새 자리를 못 본다. */
    if (R.cells > RATCHET_CELLS)
      bad(`[S3] ③ 래칫 — 편차 >0.5% 인 칸이 ${R.cells}개(래칫 ${RATCHET_CELLS}): 새 자리가 생겼다\n` +
        R.groups.map((g) => `        ${g.dev > 0 ? '+' : ''}${g.dev}% ${g.sel} ${g.cells}칸 · 잉크 ${g.ink} · 상자 ${g.box}`).join('\n'));
    else ok(`[S3] ③ 래칫 — 칸 ${R.cells}개 ≤ ${RATCHET_CELLS}`);
    if (R.groups.length > RATCHET_SITES)
      bad(`[S3] ③ 래칫 — 자리가 ${R.groups.length}개(래칫 ${RATCHET_SITES}): ` +
        R.groups.map((g) => g.sel).join(' / '));
    else ok(`[S3] ③ 래칫 — 자리 ${R.groups.length}개 ≤ ${RATCHET_SITES}`);
    /* ⚑ 530 — «수» 가 아니라 «이름표» 로 묻는 항. 스윕이 결정적이 됐으니 이제 이것을 물을 수 있다.
       수만 세면 한 자리를 닫고 다른 자리를 여는 변경이 **초록으로 지나간다**(328 교훈의 자 판). */
    {
      const known = new Map(KNOWN_SITES.map((k) => [k.sel, k]));
      const unknown = R.groups.map((g) => g.sel).filter((s) => !known.has(s));
      if (unknown.length)
        bad(`[S3] ③ 이름표 — 등재 안 된 자리 ${unknown.length}개: ${unknown.join(' / ')}\n` +
          '        (새 자리면 닫고, 자리 이름이 바뀐 것이면 근거를 적고 KNOWN_SITES 를 고쳐라)');
      else ok(`[S3] ③ 이름표 — 나온 자리 ${R.groups.length}개가 전부 등재된 자리다 (등재 ${KNOWN_SITES.length}개)`);

      /* ⚑ 548 — «이름표» 다음 칸: **눈금**. 이름만 물으면 등재된 자리가 0.5% 에서 20% 로 커져도 초록이다.
         548 이 그 자리에서 시험해 «왜 남는가» 를 적은 자리(cap 이 있는 자리)만 상한을 단언한다 —
         **안 잰 자리(cap: null)에 숫자를 적으면 그것이 헛초록이다.** */
      const capped = KNOWN_SITES.filter((k) => k.cap != null);
      const over = R.groups.filter((g) => known.get(g.sel) && known.get(g.sel).cap != null &&
        Math.abs(g.dev) > known.get(g.sel).cap);
      if (over.length)
        bad(`[S3] ③ 눈금 — 실측 상한을 넘은 자리 ${over.length}개: ` +
          over.map((g) => `${g.sel} ${g.dev > 0 ? '+' : ''}${g.dev}% > ${known.get(g.sel).cap}%`).join(' / ') +
          '\n        (등재된 자리라도 «커지는 것» 은 새 결함이다 — 548 §4 처럼 그 자리에서 다시 시험하고,\n' +
          '         상한은 줄이는 쪽으로만 고쳐라)');
      else ok(`[S3] ③ 눈금 — 실측 상한이 붙은 ${capped.length}자리가 전부 상한 안이다 (` +
        capped.map((k) => {
          const g = R.groups.find((z) => z.sel === k.sel);
          return `${g ? (g.dev > 0 ? '+' : '') + g.dev : '문턱 아래'}/${k.cap}%`;
        }).join(' · ') + ')');

      /* ⚑ 548 마감(2026-08-31, sess-0251-31028) — 위 «눈금» 항의 **전제와 되돌림**.
         눈금은 `over.length === 0` 일 때 초록인데, 그 0 은 두 가지 뜻이다:
           ⓐ 세 자리가 실제로 상한 안이다 (묻고 싶은 것)
           ⓑ 세 자리를 **아예 안 쟀다** — 자리가 R.groups 에서 사라졌거나 `dev` 가 숫자가 아니어서
              `Math.abs(...) > cap` 이 통째로 false 다 (헛초록).
         ⓑ 는 조용하다 — 위 초록문은 그 자리를 «문턱 아래» 로 인쇄하고 넘어간다.
         ⇒ 스윕을 더 돌지 않고(=값이 공짜다) **손에 있는 R.groups 로** 두 항을 세운다. */
      {
        /* [전제] 상한이 붙은 자리가 실제로 이번 실행의 판정 안에 있고 `dev` 가 숫자인가.
           ⚠ 이 항은 «상한 안인가» 를 안 묻는다 — 그건 위 항의 몫이다. 여기서 묻는 것은
             «위 항이 볼 것이 있었는가» 하나다. */
        const measured = capped.map((k) => ({ k, g: R.groups.find((z) => z.sel === k.sel) }))
          .filter((x) => x.g && Number.isFinite(x.g.dev));
        /* 356 17회차 — `band: true` 는 «들락거리는 자리» 다: 편차가 컨테이너 래스터에 따라 문턱(0.5%)
           아래로 내려가 R.groups 에서 통째로 사라진다(`#rwCost` 는 16회차 컨테이너에서 −2.92%,
           17회차 컨테이너에서 8회 전부 +0.11% — 재현 `cal356r17.js`). 그런 자리에 «반드시 나타나라» 를
           물으면 이 항이 컨테이너 따라 빨개진다(344 «플레이키 게이트» 의 자 판 — 실제로 17회차 착수
           기준선이 이 항 하나로 153/154 였다). 나타나는 실행에서는 위 «눈금» 이 그대로 물고,
           안 나타나는 것은 관찰로만 찍는다. ⚠ band 아닌 자리는 종전대로 «안 나오면 빨강» 이다. */
        const need = capped.filter((k) => !k.band);
        const needMeasured = measured.filter((m) => !m.k.band);
        const bandGone = capped.filter((k) => k.band && !measured.some((m) => m.k === k));
        if (needMeasured.length !== need.length)
          bad(`[S3] ③ 눈금 [전제] — 상한이 붙은(비 band) ${need.length}자리 중 ${needMeasured.length}자리만 이번 실행이 쟀다: ` +
            need.filter((k) => !needMeasured.some((m) => m.k === k)).map((k) => k.sel).join(' / ') +
            '\n        (자리가 판정 밖으로 나갔거나 dev 가 숫자가 아니다 — 그러면 위 «눈금» 은 볼 것이 없어 조용히 초록이다.\n' +
            '         자리를 실제로 닫았으면 KNOWN_SITES 에서 근거와 함께 빼고, 아니면 왜 안 나오는지부터 밝혀라)');
        else
          ok(`[S3] ③ 눈금 [전제] — 상한이 붙은 비 band ${need.length}자리를 이번 실행이 전부 쟀다` +
            (bandGone.length ? ` (band ${capped.filter((k) => k.band).length}자리 중 ${bandGone.length}자리는 이번 실행 문턱 아래 — 들락거림 · 정상)` : ' (band 자리도 전부 나타났다)'));

        /* [되돌림] 상한을 실측의 절반으로 낮춘 사본에서 그 비교가 **실제로 문다**.
           ⚠ 무는 것을 안 보이면 위 항은 «영원히 초록인 자» 다(328 교훈의 자 판).
             절반을 쓰는 이유는 부호·0 에 안 물리기 위해서다 — |dev| > |dev|/2 는 dev 가
             유한한 0 아닌 값일 때만 참이라, 눈금이 재는 값이 진짜 수인지까지 같이 못박는다. */
        const bite = measured.filter(({ g }) => Math.abs(g.dev) > Math.abs(g.dev) / 2);
        if (bite.length === measured.length && measured.length > 0)
          ok(`[S3] ③ 눈금 §R 되돌림 — 상한을 실측의 절반으로 낮춘 사본에서 ${bite.length}자리가 전부 «넘었다» 로 잡힌다 (` +
            bite.map(({ k, g }) => `${(Math.abs(g.dev) / 2).toFixed(2)}% < ${Math.abs(g.dev)}%`).join(' · ') + ')');
        else
          bad(`[S3] ③ 눈금 §R 되돌림 — 상한을 절반으로 낮춰도 ${measured.length - bite.length}자리가 안 잡힌다: ` +
            measured.filter((m) => !bite.includes(m)).map(({ k, g }) => `${k.sel} dev=${g.dev}`).join(' / ') +
            '\n        (비교가 죽어 있다 = 이 눈금은 상한을 20% 로 적어도 초록인 자다)');
      }
    }

    /* ④ 되돌림 — 다섯 자리의 정수 상자를 **전부** 떼면 스윕이 그것들을 도로 잡는가.
       이 항이 없으면 ①~③ 은 «지금 우연히 초록» 일 뿐이고, 무엇이 그것을 지키는지 아무도 안 묻는다.
       ⚠ 기대는 «전부» 가 아니라 «≥4자리» 다 — 되돌림이 5자리 전부를 반드시 되살린다고 적으면
         한 자리가 좌표 덕에 우연히 정사각으로 그려지는 날 영원히 빨개진다(348 §R 교훈). */
    const RV = await inkSweep({ dsf: 2, revert: true,
      /* 되돌림은 다섯 자리가 사는 화면만 돈다 — 전 화면을 두 번 도는 것은 값이 두 배인데
         묻는 것은 «그 다섯 자리가 되살아나는가» 하나뿐이다. */
      only: ['33 재화 정보', '70 출석', '22 퀘스트', '35 패스(스테이지)', '02 메인'] });
    const nHit = RV.groups.filter((g) => FIXED_RE.some((re) => re.test(g.sel))).length;
    /* ⚠ 한 «자리» 가 여러 그룹으로 갈린다(패스는 c0·c1·c2, 출석은 카드 종류별) — 그래서 세는 것은
       «다섯 중 몇» 이 아니라 **정수화한 자리에서 온 그룹 수**다. 기대 ≥4 는 실측(8)에 여유를 준 값이다. */
    if (nHit >= 4) ok(`[S3] ④ 되돌림 — 소수 상자를 도로 심으면 정수화한 자리에서 그룹 ${nHit}개가 빨개진다 (자가 살아 있다)`);
    else bad(`[S3] ④ 되돌림 — 심어도 그룹 ${nHit}개뿐(≥4 이어야 한다): 이 절은 감시 밖이다\n` +
      RV.groups.map((g) => `        ${g.dev > 0 ? '+' : ''}${g.dev}% ${g.sel} ${g.cells}칸`).join('\n'));

    /* ⑤ 750 — **가림 보정이 일을 하는가(되돌림).** ③ 의 래칫을 79 → 48 로 내린 근거가 이 보정이므로,
       보정이 조용히 죽으면 래칫은 **닿을 수 없는 수**가 되어 이 절이 영원한 빨강이 된다 —
       그때 다음 세션이 «새 결함이 생겼다» 로 오독하지 않게, 무엇이 그 44칸을 걷었는지를 **여기서** 묻는다.
       ⚠ 전 화면을 한 번 더 도는 것은 값이 두 배인데 묻는 것은 하나뿐이다 ⇒ **35 패스 네 화면만**
         보정을 끄고(`nocov`) 돈다. 그 화면이 750 이 가른 44칸 중 44칸을 전부 갖고 있다.
       기대: 보정을 끄면 **20칸 이상**(실측 46) · 켜면 그 자리들이 **0칸**(실측 0). */
    {
      const NC = await inkSweep({ dsf: 2, nocov: true, only: ['35 패스'] });
      const onCells = R.groups.filter((g) => /ps-bx[^>]*>i>img\.cic|psArt>img\.cic/.test(g.sel))
        .reduce((a, g) => a + g.cells, 0);
      if (NC.cells >= 20 && onCells === 0 && R.covFix >= 1)
        ok(`[S3] ⑤ 가림 보정 §R — 끄면 35 패스에서 ${NC.cells}칸(≥20), 켜면 그 자리 ${onCells}칸 ` +
          `(전 화면 완주에서 값이 달라진 노드 ${R.covFix}개 / 다시 잰 노드 ${R.cov}개)`);
      else
        bad(`[S3] ⑤ 가림 보정 §R — 끄면 ${NC.cells}칸(≥20 이어야 한다) · 켜면 그 자리 ${onCells}칸(0 이어야 한다) · ` +
          `covFix ${R.covFix}(≥1 이어야 한다)\n` +
          '        (보정이 죽었으면 ③ 래칫 48 은 닿을 수 없는 수다 — 수를 올리지 말고 `probe418` 의\n' +
          '         `SCAN_COVER`/`HIDE_COVER` 가 살아 있는지부터 보라. 반대로 «끄나 켜나 같다» 면\n' +
          '         그 화면의 형제 마크업이 바뀐 것이니 750 review §9 의 실측표부터 다시 재라)');
    }
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

  /* [R9] 되돌림 시험(11회차 스코프) — 56 절전.
     ⚠ 이 자리는 «옛 값 주입» 이 곧 되돌림이다(`scaleX` 를 도로 심는다 — ⓐ 갈래).
     ⚠ 진입 확인을 반드시 세운다 — 절전은 **메뉴 뒤 2단계**라 첫 클릭이 조용히 실패하면
       메뉴 시트를 재고 «0건» 으로 초록을 준다(LESSONS 356-⑬). */
  console.log('[R9] 되돌림 시험(11회차 스코프) — 56 절전');
  {
    const c = {
      lab: '56 절전', open: ['#menub', '#mnw [data-mn="saver"]'], re: /sv-(st|r)/, want: 3,
      seen: () => document.querySelectorAll('#svw .sv-r>u').length,
      seenName: '#svw .sv-r>u', min: 3,
      css: '#svw .sv-st>s>em{transform:scaleX(1.19) !important}'
         + '#svw .sv-r:nth-of-type(1)>u{transform:scaleX(.706) !important}'
         + '#svw .sv-r:nth-of-type(2)>u{transform:scaleX(.862) !important}',
    };
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    for (const q of c.open) {
      await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, q);
      await page.waitForTimeout(550);
    }
    const n = await page.evaluate(c.seen);
    if (n < c.min) bad(`[R9] ${c.lab} — 진입 실패: ${c.seenName} 가 ${n}개다`);
    else {
      ok(`[R9] ${c.lab} — ${c.seenName} ${n}개 진입 확인 (헛초록 방지)`);
      const pre = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (pre.length) bad(`[R9] ${c.lab} — 주입 «전» 에 이미 ${pre.length}건 빨강: ${pre[0].sel} ${pre[0].ratio}`);
      else ok(`[R9] ${c.lab} — 주입 전 0건 (음성항)`);

      await page.evaluate((css) => {
        const st = document.createElement('style');
        st.textContent = css;
        document.head.appendChild(st);
      }, c.css);
      await page.waitForTimeout(250);
      const hit = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (hit.length >= c.want) ok(`[R9] ${c.lab} — 되돌리면 ${hit.length}노드가 빨개진다 (자가 살아 있다)`);
      else bad(`[R9] ${c.lab} — 되돌려도 ${hit.length}건뿐(≥${c.want} 이어야 한다): 이 자리는 감시 밖이다`);
    }
    await ctx.close();
  }

  /* [R10] 11회차 — **죽은 `--icsx` 가 되살아나지 않는가**(531 «잠복 재료» 계열).
     3행 아이콘은 `.cic`(이미지)라 `:has(>.cic)` 가 배율을 안 주지만, 규칙에는 `--icsx:.833` 이
     남아 있었다 — 이미지가 이모지로 되돌아가는 날 그 값이 그대로 되살아난다.
     자는 «지금 안 그려진다» 가 아니라 **«선언이 없다»** 를 묻는다(그래야 잠복이 안 남는다). */
  {
    const src = fs.readFileSync(HTML, 'utf8');
    const svBlock = /#svw \.sv-r:nth-of-type\(3\)>u\{([^}]*)\}/.exec(src);
    if (!svBlock) bad('[R10] 56 절전 3행 규칙을 소스에서 못 찾았다 (선택자가 바뀌었다)');
    else if (/--icsx/.test(svBlock[1])) bad(`[R10] 56 절전 3행에 죽은 \`--icsx\` 가 남아 있다: {${svBlock[1]}}`);
    else ok('[R10] 56 절전 3행 — 죽은 `--icsx` 선언 0건 (이미지가 이모지로 되돌아가도 안 되살아난다)');
    if (/scaleX\(var\(--icsx/.test(src)) bad('[R10] `--icsx` 를 읽는 scaleX 가 아직 소스에 있다');
    else ok('[R10] `--icsx` 를 읽는 scaleX 선언 0건 (손잡이째 사라졌다)');
  }

  /* [R11] 되돌림 시험(12회차 스코프) — 04 던전 세부 화살표 · 08 세부 쿨타임 표 화폐 아이콘.
     ⚠ 두 자리의 «되돌림» 이 서로 다르다 — 화살표는 옛 `scaleX(1.19)` 를 **도로 심고**(ⓐ 갈래),
       08 세부는 **역보정을 빼는 것**이 되돌림이다(7회차 `i.ol3>img.cic` 과 같은 꼴 —
       거기 `transform:none` 을 주면 호스트 라벨의 .93 이 그대로 드러나 누적이 비등방이 된다).
     ⚠ 진입 확인을 반드시 세운다 — 04 는 `js:` 단계, 08 코스튬 세부는 **카드를 두 번** 눌러야
       열리므로 한 번이라도 조용히 실패하면 직전 화면을 재고 «0건» 으로 초록을 준다(356-⑬). */
  console.log('[R11] 되돌림 시험(12회차 스코프) — 04 던전 세부 화살표 · 08 세부 쿨타임 표 아이콘');
  for (const c of [
    {
      lab: '04 던전 세부 화살표', open: ['.tab[data-t="adv"]', 'js:openDunDetail(DUNGEONS[0])'],
      re: /#dgd(Prev|Next)>i/, want: 2, min: 2,
      seen: () => document.querySelectorAll('#dgdw.on .dgd-ar>i').length, seenName: '#dgdw.on .dgd-ar>i',
      css: '.dgd-ar i{transform:translateY(-1px) scaleX(1.19) !important}',
    },
    {
      lab: '08 코스튬 세부 쿨타임 칸', open: ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]', '#bCos [data-cosit]', '#bCos [data-cosit]'],
      re: /div\.nt>b>img\.cic/, want: 1, min: 1,
      seen: () => document.querySelectorAll('#mbox .sk-ct .vl .nt b>img.cic').length, seenName: '#mbox .sk-ct .nt b>img.cic',
      css: '.sk-ct b>.cic{transform:none !important}',
    },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    for (const q of c.open) { await STEP(page, q); await page.waitForTimeout(550); }
    const n = await page.evaluate(c.seen);
    if (n < c.min) bad(`[R11] ${c.lab} — 진입 실패: ${c.seenName} 가 ${n}개다`);
    else {
      ok(`[R11] ${c.lab} — ${c.seenName} ${n}개 진입 확인 (헛초록 방지)`);
      const pre = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (pre.length) bad(`[R11] ${c.lab} — 주입 «전» 에 이미 ${pre.length}건 빨강: ${pre[0].sel} ${pre[0].ratio}`);
      else ok(`[R11] ${c.lab} — 주입 전 0건 (음성항)`);

      await page.evaluate((css) => {
        const st = document.createElement('style');
        st.textContent = css;
        document.head.appendChild(st);
      }, c.css);
      await page.waitForTimeout(250);
      const hit = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (hit.length >= c.want) ok(`[R11] ${c.lab} — 되돌리면 ${hit.length}노드가 빨개진다 (자가 살아 있다)`);
      else bad(`[R11] ${c.lab} — 되돌려도 ${hit.length}건뿐(≥${c.want} 이어야 한다): 이 자리는 감시 밖이다`);
    }
    await ctx.close();
  }

  /* [S5] 15회차 배율 고정 — [S]·[S2] 와 같은 이유다. [A] 는 «sx=sy» 만 보므로 `transform:none` 도
     초록이고, 18 묶음처럼 비가 1.0079(TOL 아래)인 자리는 [A]·[B] 가 **아예 못 본다.**
     ⇒ 네 자리의 «선언» 을 여기에 못박는다. 값을 바꾸려면 `node tools/cal356r15.js` 로 다시 역산할 것.
     ⚠ 01 만 기대가 `none` 이다 — 이 자리는 배율을 **낮추는** 게 아니라 **걷어내는** 것이 답이었다
       (ref 잉크 75×76 · 자연 74×75.3 ⇒ contain 1.0093 ≈ 1. 죽은 배율을 안 남긴다 — 295-②·399·460).
     ⚠ 열기는 전부 `js:` 단계라 **STEP 을 쓴다**([R12] 규율 — 구동기를 자기 손으로 다시 적지 않는다). */
  console.log('[S5] 15회차 배율 고정 — «사건이 있어야 뜨는 화면» 네 자리의 등방 선언이 제품에 그대로 있는가');
  for (const w of [
    { q: '#offw .ofr-fr b', sx: 1, sy: 1, none: true, open: ['js:offlineReward(Date.now() - 3600e3)'],
      why: '01 코인 — scaleY(.97) 를 선언째 걷었다(되돌리는 것이 곧 ref)' },
    { q: '#statw #stIc', sx: 0.86, sy: 0.86, open: ['js:openStatUp({ ic:"⚔️", desc:"훈련 2 단계 달성! 모든 능력치 10% 증가" })'],
      why: '17 ⚔️ — s = min(sx,sy) = .86 (contain 자 .854 와 0.7% 차) + 중심 되돌림 translate(0,-1px)' },
    { q: '#defw .df-card.c2 .df-ic>b.fl', sx: 0.82, sy: 0.82, open: ['js:openDefeat()'],
      why: '18 불꽃 — s = min(.82,.86) + 중심 되돌림 translate(0,1px)' },
    { q: '#defw .df-card.c2 .df-ic', sx: 0.885, sy: 0.885, open: ['js:openDefeat()'],
      why: '18 아이콘 묶음 — s = min(.892,.885). 비 1.0079 는 TOL 아래라 [A]·[B] 가 못 보는 자리다' },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    for (const q of w.open) { await STEP(page, q); await page.waitForTimeout(550); }
    const g = await page.evaluate((q) => {
      const e = document.querySelector(q);
      if (!e) return null;
      const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(getComputedStyle(e).transform);
      return m ? [+m[1], +m[4]] : 'none';
    }, w.q);
    if (g === null) bad(`[S5] ${w.q} — 노드가 없다(선택자가 죽었거나 화면에 못 갔다)`);
    else if (w.none) {
      if (g === 'none' || (Math.abs(g[0] - 1) < 1e-6 && Math.abs(g[1] - 1) < 1e-6))
        ok(`[S5] ${w.q} — transform 없음 고정 (${w.why})`);
      else bad(`[S5] ${w.q} — transform ${g[0]}/${g[1]}: 15회차가 걷어낸 비균등 배율이 되살아났다 (${w.why})`);
    }
    else if (g === 'none') bad(`[S5] ${w.q} — transform 이 통째로 없다: 등방 배율이 사라졌다 (${w.why})`);
    else if (Math.abs(g[0] - w.sx) > 0.004 || Math.abs(g[1] - w.sy) > 0.004)
      bad(`[S5] ${w.q} — 배율 ${g[0]}/${g[1]}, 기대 ${w.sx}/${w.sy} (${w.why})`);
    else ok(`[S5] ${w.q} — ${w.sx}/${w.sy} 고정`);
    await ctx.close();
  }

  /* [S6] 16회차 배율 고정 + 그 자리의 되돌림 시험 — 12 소환 결과 [10회]·[30회] 버튼 젬.
     ⚑ **왜 [S5] 와 같은 꼴인가** — 15회차가 이 자리를 «상자가 소수 55.2016×56.1563» 이라는
       **래스터 축**으로 등재했는데, 16회차 재현(`tools/cal356r16.js`)이 그 소수 상자를 만든 것이
       `.sm-b .gem{transform:scaleX(.983)}` 라는 **선언된 비균등 배율**임을 보였다
       (`.cic` 자신의 상자는 `1.08em × font-size 52` = **56.1563 정사각**이고,
        56.1563 × .983 = **55.2016** — 글자까지 맞는다). 비는 1.0173 으로 TOL 0.02 **아래**라
       [A]·[B] 는 이 자리를 영원히 못 본다(15회차 «18 묶음» 과 같은 성질) ⇒ 선언으로 못박는다.
     ⚑ **되돌림을 [R13] 꼴로 못 짠다** — 옛 값을 도로 심어도 종횡비 1.0173 이 TOL 아래라
       `COLLECT` 경로는 **한 건도 안 잡는다**. 그래서 이 절의 되돌림은 «자가 보는 그 값»,
       곧 **선언 판독기 자신**에게 묻는다: 옛 비균등을 심으면 등방 판정이 실제로 뒤집히는가.
     ⚠ 한 페이지에서 ① 진입 확인 ② 선언 ③ 주입 후 판정 뒤집힘까지 잇달아 본다 —
       이 화면은 `js:` 한 단계로 열리고 주입은 `!important` 한 줄이라 갈래가 섞이지 않는다. */
  console.log('[S6] 16회차 배율 고정 — 12 소환 결과 젬의 등방 선언 + 그 자리의 되돌림');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await STEP(page, 'js:doSummonFree("skill", 10, true)');
    await page.waitForTimeout(600);

    const READ = (q) => {
      const e = document.querySelector(q);
      if (!e) return null;
      const m = /matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)/.exec(getComputedStyle(e).transform);
      return m ? [+m[1], +m[4]] : 'none';
    };

    /* ① 진입 확인 — 조용히 안 열리면 직전 화면을 재고 «없음» 으로 초록을 준다(LESSONS 356-⑬) */
    const seen = await page.evaluate(() => document.querySelectorAll('#sumB10>.gem>.cic, #sumB30>.gem>.cic').length);
    if (seen < 2) bad(`[S6] 진입 실패 — \`#sumB10/#sumB30 > .gem > .cic\` 가 ${seen}개다(2 이어야 한다)`);
    else ok(`[S6] 진입 확인 — 젬 \`.cic\` ${seen}개 (헛초록 방지)`);

    /* ② 선언 — 두 버튼이 **한 부품**(`.sm-b .gem`)이라 둘 다 같은 값이어야 한다 */
    for (const q of ['#sumB10>.gem', '#sumB30>.gem']) {
      const g = await page.evaluate(READ, q);
      if (g === null) bad(`[S6] ${q} — 노드가 없다(선택자가 죽었거나 화면에 못 갔다)`);
      else if (g === 'none')
        bad(`[S6] ${q} — transform 이 통째로 없다: 16회차가 세운 등방 배율 .983 이 사라졌다` +
            ` (걷어내면 잉크가 52×52 → 54×54 로 커져 측정표 12 §9 의 ref 50×53 에서 멀어진다)`);
      else if (Math.abs(g[0] - 0.983) > 0.004 || Math.abs(g[1] - 0.983) > 0.004)
        bad(`[S6] ${q} — 배율 ${g[0]}/${g[1]}, 기대 0.983/0.983` +
            ` (16회차 — 이모지 시절의 \`scaleX(.983)\` 을 397 «작은 쪽으로» 로 등방화한 값)`);
      else ok(`[S6] ${q} — 0.983/0.983 등방 고정`);
    }

    /* ③ 되돌림 — 옛 비균등을 도로 심으면 ② 의 판정이 실제로 뒤집히는가(음성항 → 양성항) */
    if (seen >= 2) {
      await page.evaluate(() => {
        const st = document.createElement('style');
        st.textContent = '.sm-b .gem{transform:scaleX(.983) !important}';
        document.head.appendChild(st);
      });
      await page.waitForTimeout(250);
      const g = await page.evaluate(READ, '#sumB10>.gem');
      if (g && g !== 'none' && Math.abs(g[0] - g[1]) > 0.004)
        ok(`[R14] 되돌림 — 옛 \`scaleX(.983)\` 을 심으면 판독기가 ${g[0]}/${g[1]} 로 비등방을 본다 (자가 살아 있다)`);
      else
        bad(`[R14] 되돌림 — 옛 비균등을 심어도 판독기가 ${JSON.stringify(g)} 로 읽는다: 이 자리는 감시 밖이다\n` +
            `        (선택자 \`#sumB10>.gem\` 이 죽었거나 다른 규칙이 transform 을 덮고 있다)`);
    }
    await ctx.close();
  }

  /* [R13] 되돌림 시험(15회차 스코프) — 01·17·18 에 옛 비균등을 도로 심으면 빨개지는가.
     ⚠ 18 은 **불꽃만** 되돌린다 — 묶음(.892/.885)까지 같이 심으면 누적이 0.961 이라 어차피 빨간데,
       그러면 «둘 중 어느 쪽이 자를 울렸는지» 를 못 가른다. 묶음 쪽은 [S5] 가 선언으로 잡는다.
     ⚠ 진입 확인을 반드시 세운다 — 셋 다 `js:` 진입점이고, 조용히 안 열리면 직전 화면(02 메인)을
       재고 «0건» 으로 초록을 준다(356-⑬ · [R11] 과 같은 자리). */
  console.log('[R13] 되돌림 시험(15회차 스코프) — 01 코인 · 17 ⚔️ · 18 불꽃');
  for (const c of [
    {
      lab: '01 오프라인 보상 코인', open: ['js:offlineReward(Date.now() - 3600e3)'],
      re: /div\.ofr-fr>i>b/, want: 2, min: 1,
      seen: () => document.querySelectorAll('#offw.on .ofr-fr b').length, seenName: '#offw.on .ofr-fr b',
      css: '.ofr-fr b{transform:scaleY(.97) !important}',
    },
    {
      lab: '17 스탯업 ⚔️', open: ['js:openStatUp({ ic:"⚔️", desc:"훈련 2 단계 달성! 모든 능력치 10% 증가" })'],
      re: /b#stIc/, want: 1, min: 1,
      seen: () => document.querySelectorAll('#statw.on .st-icon>b').length, seenName: '#statw.on .st-icon>b',
      css: '.st-icon>b{transform:scaleX(.86) !important}',
    },
    {
      lab: '18 패배 불꽃', open: ['js:openDefeat()'],
      re: /div\.df-ic>b\.fl/, want: 1, min: 1,
      seen: () => document.querySelectorAll('#defw.on .df-card.c2 .df-ic>b.fl').length, seenName: '#defw.on .df-card.c2 .fl',
      css: '.df-ic .fl{transform:translateX(-50%) scale(.82,.86) !important}',
    },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    for (const q of c.open) { await STEP(page, q); await page.waitForTimeout(600); }
    const n = await page.evaluate(c.seen);
    if (n < c.min) bad(`[R13] ${c.lab} — 진입 실패: ${c.seenName} 가 ${n}개다`);
    else {
      ok(`[R13] ${c.lab} — ${c.seenName} ${n}개 진입 확인 (헛초록 방지)`);
      const pre = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (pre.length) bad(`[R13] ${c.lab} — 주입 «전» 에 이미 ${pre.length}건 빨강: ${pre[0].sel} ${pre[0].ratio}`);
      else ok(`[R13] ${c.lab} — 주입 전 0건 (음성항)`);

      await page.evaluate((css) => {
        const st = document.createElement('style');
        st.textContent = css;
        document.head.appendChild(st);
      }, c.css);
      await page.waitForTimeout(250);
      const hit = (await page.evaluate(COLLECT, { all: false }))
        .filter((r) => Math.abs(r.ratio - 1) > TOL && inScope(r.sel) && c.re.test(r.sel));
      if (hit.length >= c.want) ok(`[R13] ${c.lab} — 되돌리면 ${hit.length}노드가 빨개진다 (자가 살아 있다)`);
      else bad(`[R13] ${c.lab} — 되돌려도 ${hit.length}건뿐(≥${c.want} 이어야 한다): 이 자리는 감시 밖이다`);
    }
    await ctx.close();
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
        /* 12회차 — 단계 해석은 `scan356.STEP` **한 곳**이다(`js:` 단계 포함).
           여기에 다시 적으면 두 벌이 되어 한쪽만 늙는다([S3] 주석 · 385 «자매 자 드리프트»). */
        const found = await STEP(page, s);
        if (!found) { bad(`[C] «${label}» 단계가 무음 실패: '${s}' 가 DOM 에 없다(또는 던졌다)`); dead++; }
        await page.waitForTimeout(420);
      }
    }
    if (!dead) ok(`[C] SCREENS ${SCREENS.length}화면의 모든 단계 셀렉터가 resolve 된다`);
    await ctx.close();
  }

  /* [D] 443 — «resolve 된다» 는 **빠진 화면**을 못 잡는다.
     [C] 는 목록에 적힌 줄이 살아 있는지만 묻는다. 428 이 탭 하나를 «신설»(tower2)했다면 [C] 는
     끝까지 초록인 채로 그 탭이 통째로 스캔 밖에 남았을 것이다 — 397 이 36 출석 패스에서 겪은 그것이다.
     ⇒ 여기서는 반대 방향을 묻는다: **살아 있는 DOM 의 패스 탭 전부가 목록에 있는가.**
     목록이 마크업 파생(scan356 derivePassScreens)이므로 이 항은 «파생이 실제 DOM 과 같은가» 의 자다. */
  console.log('[D] 443 — 패스 탭 스코프: 살아 있는 DOM 의 탭이 전부 SCREENS 에 있는가');
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.evaluate(() => { const e = document.querySelector('#menub'); if (e) e.click(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { const e = document.querySelector('#psGo'); if (e) e.click(); });
    await page.waitForTimeout(500);
    const live = await page.evaluate(() =>
      [...document.querySelectorAll('#psBar [data-ptab]')].map((e) => e.dataset.ptab));
    const mine = SCREENS.flatMap(([, st]) => st)
      .map((s) => (s.match(/#psBar \[data-ptab="([^"]+)"\]/) || [])[1]).filter(Boolean);
    if (live.length < 2) bad(`[D] 살아 있는 #psBar 탭이 ${live.length}개다 — 진입 실패(헛초록 방지)`);
    else {
      ok(`[D] 살아 있는 패스 탭 ${live.length}개 확인: ${live.join(' · ')} (헛초록 방지)`);
      const missing = live.filter((k) => !mine.includes(k));
      const ghost = mine.filter((k) => !live.includes(k));
      if (missing.length) bad(`[D] 스캔 밖 탭 ${missing.length}개: ${missing.join(' · ')} — 이 탭의 CSS 는 356 이 한 번도 본 적이 없다`);
      else ok(`[D] 살아 있는 탭 ${live.length}개가 전부 SCREENS 에 있다 (사각지대 0)`);
      if (ghost.length) bad(`[D] 유령 탭 ${ghost.length}개: ${ghost.join(' · ')} — DOM 에 없는 이름을 목록이 붙들고 있다`);
      else ok('[D] SCREENS 의 패스 탭 이름 중 DOM 에 없는 것 0개');
    }
    await ctx.close();
  }

  /* [R8] 443 되돌림 시험 — 목록이 «파생» 인지 «표» 인지.
     제품(index.html)이 아니라 **파생 함수에 사본 문자열을 먹여** 묻는다:
       ⓐ 탭 키를 바꾼 사본 → 파생 줄이 따라오면 표가 아니다
       ⓑ `#psBar` 를 지운 사본 → **던져야 한다**(조용히 빈 목록을 내면 [B] 래칫이 헛초록이 된다)
     ⚠ 기대값만 뒤집지 않았다(334) — [D] 는 여전히 «살아 있는 DOM 과 같아야 한다» 를 요구한다. */
  console.log('[R8] 되돌림 시험(443) — 화면 목록이 마크업 파생인가');
  {
    const src = fs.readFileSync(HTML, 'utf8');
    const now = derivePassScreens(src).flatMap(([, st]) => st)
      .map((s) => (s.match(/data-ptab="([^"]+)"/) || [])[1]).filter(Boolean);
    if (now.length < 2) bad(`[R8] 파생이 탭 ${now.length}개뿐이다 (헛초록 방지)`);
    else ok(`[R8] 지금 마크업에서 파생한 탭 ${now.length}개: ${now.join(' · ')}`);

    const renamed = src.replace(/data-ptab="tower2"/g, 'data-ptab="zzTest"');
    if (renamed === src) bad('[R8] 되돌림 표본을 못 심었다 — `data-ptab="tower2"` 가 마크업에 없다');
    else {
      const after = derivePassScreens(renamed).flatMap(([, st]) => st)
        .map((s) => (s.match(/data-ptab="([^"]+)"/) || [])[1]).filter(Boolean);
      if (after.includes('zzTest') && !after.includes('tower2'))
        ok('[R8] 마크업의 키를 바꾸면 화면 목록이 따라온다 (tower2 → zzTest — 표가 아니라 파생이다)');
      else bad(`[R8] 키를 바꿔도 목록이 그대로다: ${after.join(' · ')} — 어딘가에 표가 남아 있다`);
    }

    let threw = '';
    try { derivePassScreens(src.replace('id="psBar"', 'id="psBarGONE"')); }
    catch (e) { threw = String(e.message || e); }
    if (threw) ok('[R8] `#psBar` 를 지운 사본에는 **던진다** (무음으로 빈 목록을 내지 않는다)');
    else bad('[R8] `#psBar` 가 없는데도 조용히 목록을 냈다 — 무음 실패를 다른 무음으로 갈아 끼운 것이다');
  }

  /* [R12] 자매 자 드리프트(385) — **구동기도 한 벌인가.**
     13회차(2026-08-31) 실측: 12회차가 단계 종류 `js:<식>` 을 새로 만든 지 **두 시간** 만에
     `probe356r12.js` 가 그것을 놓쳤다. 그 자는 수집기(COLLECT)는 스캐너에서 받아 쓰면서
     **구동기 한 줄(«셀렉터를 눌러라»)만 자기 손으로 다시 적고 있었고**, 새 종류를 만나자
     `querySelector('js:openDunDetail(…)')` 로 던져 **04 던전 세부를 통째로 건너뛰었다**
     — 직전 화면 «03 던전» 을 두 번 세고 초록을 줬다(443 «조용한 초록» 의 다른 얼굴).
     ⇒ 이 절은 «자를 두 벌로 적지 마라» 를 **말이 아니라 자로** 지킨다. 브라우저를 안 쓴다. */
  console.log('[R12] 자매 자 드리프트 — 화면 구동기(STEP)가 한 벌인가');
  {
    const scanSrc = fs.readFileSync(path.join(__dirname, 'scan356.js'), 'utf8');
    if (/module\.exports\s*=\s*\{[^}]*\bSTEP\b/.test(scanSrc))
      ok('[R12-a] `scan356.js` 가 `STEP` 을 내보낸다 (형제 자가 받아 쓸 수 있다)');
    else bad('[R12-a] `scan356.js` 가 `STEP` 을 안 내보낸다 — 형제 자는 다시 적는 수밖에 없어진다');

    const jsSteps = SCREENS.filter(([, st]) => st.some((s) => String(s).startsWith('js:')));
    if (jsSteps.length) ok(`[R12-b] SCREENS 에 \`js:\` 단계를 쓰는 화면 ${jsSteps.length}개 — 이 축은 살아 있다 (${jsSteps.map((x) => x[0]).join(' · ')})`);
    else bad('[R12-b] SCREENS 에 `js:` 단계가 0개다 — 이 절이 지킬 것이 없다면 [R12-c] 도 헛초록이다');

    /* ⓒ 검출기: «스캐너의 SCREENS 를 받아 쓰면서 구동기는 자기 손으로 적은» 파일.
       손으로 적었다는 표시 = `querySelector(<변수>)` + `.click()` 이 한 줄에 같이 있는 것. */
    const HAND = /document\.querySelector\(\s*[a-z]\w*\s*\)[\s\S]{0,140}?\.click\(\)/;
    const drift = (src) => /require\(['"]\.\/scan356(\.js)?['"]\)/.test(src) && HAND.test(src) && !/\bSTEP\b/.test(src);
    const sibs = fs.readdirSync(__dirname).filter((f) => f.endsWith('.js') && f !== 'scan356.js' && f !== 'verify356.js')
      .filter((f) => /require\(['"]\.\/scan356(\.js)?['"]\)/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')));
    const drifted = sibs.filter((f) => drift(fs.readFileSync(path.join(__dirname, f), 'utf8')));
    if (!sibs.length) bad('[R12-c] `scan356` 를 받아 쓰는 형제 자가 0개다 — 검출기가 아무것도 안 보고 있다(헛초록)');
    else if (!drifted.length) ok(`[R12-c] \`scan356\` 를 받아 쓰는 형제 자 ${sibs.length}개(${sibs.join(' · ')}) 전부 \`STEP\` 을 같이 쓴다 — 구동기를 다시 적은 자 0개`);
    else bad(`[R12-c] 구동기를 자기 손으로 다시 적은 형제 자 ${drifted.length}개: ${drifted.join(' · ')} — \`js:\` 단계를 조용히 건너뛴다`);

    /* ⓓ 되돌림 — 검출기가 정말 «잡는가». 13회차 수리 **전** 모양을 사본으로 만들어 먹인다.
       (기대값만 뒤집는 무른 수리를 막는다 — 334 처방) */
    const sample = `const { COLLECT, URL, TOL, SCREENS } = require('./scan356.js');\n`
      + `const found = await page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); return !!el; }, s);\n`;
    /* 음성항 — 고친 모양(STEP 을 받아 쓴다)은 **안 잡혀야** 한다. 안 그러면 [R12-c] 가 상시 빨강이다. */
    const fixed = `const { COLLECT, URL, TOL, SCREENS, STEP } = require('./scan356.js');\n`
      + `const found = await STEP(page, s);\n`;
    if (!drift(fixed)) ok('[R12-e] 음성항 — 고친 모양(STEP 을 받아 쓴다)은 검출기가 안 잡는다');
    else bad('[R12-e] 검출기가 고친 모양까지 잡는다 — 상시 빨강이 된다');
    if (drift(sample)) ok('[R12-d] 되돌림 — 수리 전 모양(자기 손 구동기 + STEP 없음)을 사본으로 먹이면 검출기가 잡는다');
    else bad('[R12-d] 되돌림 실패 — 검출기가 수리 전 모양조차 못 잡는다 (regex 가 늙었다)');
  }

  /* ── [G] 23회차 — **찌그러짐의 출처가 «CSS transform» 하나가 아니다** ────────────────
     22회차까지 이 자의 모든 절은 `scan356.COLLECT` 가 보는 두 축(ⓐ transform/scale 누적 ·
     ⓑ IMG 의 object-fit:fill)만 봤다. 그런데 같은 날 **616**(다른 워커)이 눈으로 찾아낸 자리가 있다 —
     레이드 측정장 마법사 **×1.45** · 아레나 기사 **×1.65**. 스무두 회차 동안 이 자는 그 화면을
     **실제로 밟으면서도**(SCREENS 에 «03 레이드» 가 1회차부터 있다) 초록을 줬다.
     못 본 이유는 문도 상태도 아니고 **축**이다: `drawSpriteTo()` 가 `ctx.drawImage(..., W, H−padY*2)` 로
     **캔버스 안에서** 늘려 그렸고, 그 찌그러짐은 DOM 에 흔적이 없다(`getComputedStyle` 로는 영영 안 보인다).
     ⇒ 이 절은 남은 출처 셋을 «상시 자» 로 못박는다. 전수 스윕은 `probe356r23`(비상시 자) 몫이고,
        여기서는 캔버스가 실제로 사는 대표 화면만 몬다 — 축이 죽지 않았는지가 이 절의 일이다.
     ⚠ 훅·수집기는 `probe356r23` 에서 **받아 쓴다**(자를 두 벌로 적지 마라 — 13회차 [R12]).
     ⚠ [G-c] 되돌림이 이 절의 본체다 — 616 «직전» 트리를 같은 자로 재서 ×1.45 를 실제로 받아내야
        [G-b] 의 0건이 «값이 옳아서 0» 이지 «안 보는 자라서 0» 이 아니라는 것이 선다(21회차 교훈). */
  console.log('[G] 23회차 — 캔버스 안·비트맵 상자·svg: transform 이 아닌 찌그러짐 출처');
  {
    const R23 = require('./probe356r23.js');
    /* 화면은 SCREENS 에서 **이름으로 꺼낸다** — 문을 손으로 다시 적지 않는다(13회차 [R12]). */
    const PICK = ['03 레이드', '26 펫', '12 소환 결과(펫)', '09 일괄 강화 결과'];
    const rowsOf = async (fileUrl, labels) => {
      const draw = new Map(); const cvs = []; const svgs = [];
      let calls = 0, err = 0, ctxNU = 0; const miss = [];
      for (const label of labels) {
        const line = SCREENS.find(([l]) => l === label);
        if (!line) { miss.push(`SCREENS 에 «${label}» 줄이 없다`); continue; }
        const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        try {
          await page.addInitScript(R23.initHook, TOL);
          await page.goto(fileUrl, { waitUntil: 'load' });
          await page.waitForTimeout(700);
          for (const s of line[1]) {
            if (!(await STEP(page, s))) miss.push(`«${label}» → '${s}'`);
            await page.waitForTimeout(400);
          }
          await page.waitForTimeout(250);
          const dom = await page.evaluate(R23.DOMAXES, TOL);
          const hk = await page.evaluate(() => window.__r23 || null);
          if (!hk) miss.push(`«${label}» 훅이 안 심겼다`);
          else {
            calls += hk.calls; err += hk.err; ctxNU += hk.ctxNonUni;
            for (const k of Object.keys(hk.bad)) {
              const b = hk.bad[k];
              if (!draw.has(k)) draw.set(k, Object.assign({ screen: label }, b));
            }
          }
          for (const c of dom.cv) cvs.push(Object.assign({ screen: label }, c));
          for (const c of dom.svg) svgs.push(Object.assign({ screen: label }, c));
        } catch (e) { miss.push(`«${label}» ${String(e.message || e).split('\n')[0]}`); }
        await ctx.close();
      }
      return { draw: [...draw.values()], cvs, svgs, calls, err, ctxNU, miss };
    };

    const now = await rowsOf(URL, PICK);
    /* ⓐ 전제 — 훅이 정말 돌았는가. 0 이면 아래 초록은 전부 헛초록이다. */
    if (now.calls > 0) ok(`[G-a] drawImage 훅 관측 ${now.calls}건 · 훅 예외 ${now.err}건 (축이 살아 있다)`);
    else bad('[G-a] drawImage 호출을 한 건도 못 봤다 — 훅이 안 걸렸다(아래 초록은 전부 헛초록)');
    if (!now.miss.length) ok(`[G-a2] 대표 화면 ${PICK.length}곳 전부 진입 (${PICK.join(' · ')})`);
    else bad(`[G-a2] 진입/훅 실패 ${now.miss.length}건: ${now.miss.join(' · ')}`);

    /* ⓑ 본항 — #app 안 캔버스에 비균등 그리기 0건 */
    const inApp = now.draw.filter((r) => r.inApp);
    if (!inApp.length) ok(`[G-b] 캔버스 안 비균등 그리기 0자리 (대표 ${PICK.length}화면)`);
    else bad(`[G-b] 캔버스 안 비균등 그리기 ${inApp.length}자리: `
      + inApp.map((r) => `${r.screen} ${r.sel} ×${r.ratio} (${r.src})`).join(' · '));

    /* ⓒ 되돌림 — 616 «직전» 트리에서 이 자가 실제로 빨개지는가
       ⚠⚠ **26회차 — 이 항은 얕은 클론에서 구조적으로 빨갰다.** 루틴 워커의 컨테이너는 매번
          `.git/shallow` 로 시작하고(이 회차 착수 시 이력 52커밋), 616 은 그 경계 **밖**이라
          `git show 319277e^:index.html` 이 `fatal: invalid object name` 으로 죽었다
          — 착수 기준선이 **179/180** 이었고 그 1건이 이것이다(제품·자 어느 쪽의 결함도 아니다).
       ⇒ 처방은 «못 돌렸으니 넘어간다» 가 **아니다**(그러면 23회차가 세운 축이 조용히 꺼진다).
          경계 밖이면 **그 자리에서 이력을 판다** — 실패하면 여전히 빨갛고, 빨간 줄이 원인과
          한 줄 처방을 같이 말한다. 판정을 무르게 푼 것이 아니라 **표본을 가져오는 것**이다.
       ⚠ `git fetch origin <sha>` 는 서버가 막는다(`couldn't find remote ref` — 26회차 실측).
          되는 것은 `--deepen`·`--shallow-since` 둘뿐이다.
       ⚠⚠ **631 — 26회차가 적은 `--deepen=40` 은 «상수를 세운 것» 이라 그날에만 맞았다.**
          워커 4대가 시간당 ~26커밋을 올리므로 40 이 덮는 것은 약 1.5시간뿐이고, 그 뒤로 뜨는
          컨테이너는 전부 이 항 하나로 **187/188** 을 봤다(거짓 빨강 — 다음 워커가 «내 변경이
          356 을 깼나» 를 의심하며 회차를 태운다). ⇒ 깊이를 **세지 말고 날짜로 판다**
          (`--shallow-since=R23.PRE_DATE` · 표본이 고정이면 안 썩는다). 파는 일 자체는
          `probe356r23.digPre()` **한 벌**이 맡는다(자를 두 벌로 안 적는다 — 13회차 [R12]). */
    {
      const abs = R23.PRE_ABS;
      const ROOT = path.resolve(__dirname, '..');
      try {
        const { execFileSync } = require('child_process');
        let dug = '';
        if (!fs.existsSync(abs)) {
          dug = R23.digPre();                       /* '' = 이미 있었다 · null = 못 팠다 */
          if (dug === null) {
            throw new Error(`616 직전 트리 ${R23.PRE_REV} 가 이 클론에 없다(얕은 클론) `
              + `— \`git fetch --shallow-since=${R23.PRE_DATE} origin main\` 이 실패했다`);
          }
        }
        if (!fs.existsSync(abs)) {
          fs.writeFileSync(abs, execFileSync('git', ['show', R23.PRE_REV + ':index.html'],
            { cwd: ROOT, maxBuffer: 1 << 28 }));
        }
        R23.__dug = dug;
        const pre = await rowsOf('file://' + abs.replace(/\\/g, '/'), ['03 레이드']);
        const hit = pre.draw.filter((r) => r.inApp && Math.abs(r.ratio - 1) > 0.30)
          .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));   /* «최악» 이라 적으려면 정렬해야 한다 */
        if (hit.length) ok(`[G-c] 되돌림 — 616 직전 트리에서 ${hit.length}자리가 빨개진다 (최악 ×${hit[0].ratio} · 등재문의 ×1.45/×1.65 자리)${R23.__dug || ''}`);
        else bad('[G-c] 되돌림 실패 — 616 직전 트리에서도 0자리다. 이 절은 아무것도 못 보는 자다');
      } catch (e) {
        bad('[G-c] 되돌림을 못 돌렸다: ' + String(e.message || e).split('\n')[0]);
      } finally { try { fs.unlinkSync(abs); } catch (e) {} }
    }

    /* ⓓ 음성항 — 등방 축소는 안 잡는다. 대표 화면의 던전/펫 썸네일은 전부 `k` 한 배율로 줄여 그린다:
       [G-b] 가 0 인데 [G-a] 관측이 수천 건이라는 것이 곧 «크기 변경은 결함이 아니다» 의 실측이다. */
    if (now.calls > 200 && !inApp.length) ok(`[G-d] 음성항 — 등방 축소 ${now.calls}건은 안 잡힌다 (크기 변경은 결함이 아니다)`);
    else if (!inApp.length) bad(`[G-d] 음성항 표본이 얇다 — 관측 ${now.calls}건뿐이라 «안 잡는다» 가 공허하다`);

    /* ⓔ 남은 두 출처 — 캔버스 비트맵↔CSS 상자 종횡 · svg preserveAspectRatio="none" */
    if (!now.cvs.length) ok('[G-e] 캔버스 비트맵 종횡을 CSS 상자가 늘리는 자리 0');
    else bad(`[G-e] 상자가 비트맵을 늘리는 캔버스 ${now.cvs.length}자리: `
      + now.cvs.map((r) => `${r.screen} ${r.sel} ×${r.ratio} (비트맵 ${r.bmp} ↔ 상자 ${r.box})`).join(' · '));
    if (!now.svgs.length) ok('[G-f] viewBox 종횡을 어기는 svg(preserveAspectRatio="none") 0자리');
    else bad(`[G-f] viewBox 를 어기는 svg ${now.svgs.length}자리: `
      + now.svgs.map((r) => `${r.screen} ${r.sel} ×${r.ratio}`).join(' · '));
    if (!now.ctxNU) ok('[G-g] 비균등 컨텍스트 변환(ctx.scale(x,y), x≠y) 0회 — 뒤집기 scale(-1,1) 은 |sx|=|sy| 라 안 센다');
    else bad(`[G-g] 비균등 컨텍스트 변환 ${now.ctxNU}회 — drawImage 인자가 등방이어도 화면에서는 늘어난다`);
  }

  /* ── [H] 24회차 — **축 인구조사**: 자가 «안 보는» 그리기 경로가 생겼는가 ──────────
     23회차가 다섯째 프런티어(축)를 닫으면서 자기 한계를 **글로** 적어 넘겼다:
       « 0건은 언제나 자가 보는 축 안에서의 0건이다. 새 그림 경로가 들어오면
         (WebGL·background-size:100% 100%·filter·CSS aspect-ratio 강제) 축을 먼저 세어라. »
     그 당부는 **다음 세션의 기억**에 걸려 있었다. 356 이 스물세 회차 동안 되풀이해 증명한 것이
     «기억에 거는 규율은 진다» 는 것이고(11·12·15회차 = 화면이 목록에 없어서 · 21·22회차 = 문이 없어서 ·
     **616 = 축이 없어서 게이트가 스물두 회차 초록인 채 45% 찌그러짐과 공존**), 셋 다 실제로 잊혔다.
     ⇒ [H] 는 그 당부를 **자로 바꾼다.** 감시 밖 구성물이 소스에 생기면 여기서 빨개지고,
        빨간 줄이 다음 세션에게 «축을 먼저 세워라» 라고 말한다. 브라우저를 안 쓴다(소스 텍스트 자).
     ⚑ 24회차가 여기서 23회차의 셈 하나를 **정정했다** — 아래 [H-b] 주석 참조. */
  console.log('\n[H] 24회차 — 축 인구조사: 자가 안 보는 그리기 경로가 생겼는가');
  {
    const R24 = require('./probe356r24.js');
    const rawHtml = fs.readFileSync(HTML, 'utf8');
    const cen = R24.census(rawHtml);

    /* ⓐ 감시 밖 구성물 — 하나라도 있으면 «축이 없는 그림» 이 화면에 있다는 뜻이다 */
    if (!cen.bad.length) {
      ok(`[H-a] 감시 밖 구성물 0건 (${cen.rows.map((r) => r.name.replace(/ .*/, '')).join(' · ')})`);
    } else {
      for (const r of cen.bad) {
        bad(`[H-a] ${r.name} ${r.n}건(등재 ${r.base}) — 줄 ${r.lines.join(',')} · ${r.why}`
          + ' ⇒ **축을 먼저 세우고** 그 다음에 0건을 말해라(616 전례)');
      }
    }

    /* ⓑ 일곱째 출처 — url() 배경. **곳 수를 안 굳히고 곳마다 비를 잰다.**
       ⚑ 23회차는 이 축을 «소스 전체에 한 곳뿐이고 세 값이 같으니 안 세운다» 로 넘겼는데,
          그 «한 곳» 은 **13곳**이었다 — 셈이 `grep 'background[^;{]*url('` 꼴 **줄 단위**인데
          배경 선언 열둘은 `background:` 와 `url(` 이 다른 줄에 있다(패턴 타일 텍스처가 그 꼴이다).
          ⇒ **결론(0자리)은 옳았고 수(1)가 틀렸다.** 그래서 이 항은 수를 등재값으로 안 굳힌다 —
             곳이 몇으로 늘든 비가 1 이면 초록이다(23회차 [G-c] 교훈: 적는 말과 재는 값이 어긋나면
             다음 세션이 그 말을 믿는다). */
    if (!cen.bg.bad.length) {
      ok(`[H-b] url() 배경 ${cen.bg.rows.length}곳 전부 원본 종횡대로 (잰 곳 ${cen.bg.measured.length} · 어긴 자리 0)`);
    } else {
      bad(`[H-b] url() 배경이 원본 종횡을 어기는 자리 ${cen.bg.bad.length}: `
        + cen.bg.bad.map((r) => `${r.line}행 원본 ${r.nat.w}×${r.nat.h} → 상자 ${r.size.w}×${r.size.h} ×${r.ratio}`).join(' · '));
    }
    /* 전제 — 한 곳도 못 읽었으면 위 초록은 «없어서 0» 이 아니라 «못 봐서 0» 이다 */
    if (cen.bg.measured.length) ok(`[H-b2] 전제 — url() 배경 ${cen.bg.measured.length}곳을 실제로 읽었다 (0 이면 위 [H-b] 는 헛초록)`);
    else bad('[H-b2] url() 배경을 한 곳도 못 읽었다 — [H-b] 의 0 은 «못 봐서 0» 이다');

    /* ⓒ 되돌림 — 주입하면 정말 빨개지는가. 이 절의 본체다(21회차 교훈 · [G-c] 와 같은 규율) */
    const inj = {
      webgl: `<script>var __t=document.createElement('canvas').getContext('webgl');</script>`,
      aspect: `<style>.__h{aspect-ratio:3/1}</style>`,
      filterUrl: `<style>.__h{filter:url(#squash)}</style>`,
      borderImage: `<style>.__h{border-image:url(a.png) 30 stretch}</style>`,
    };
    const missR = Object.keys(inj).filter((k) => !R24.census(rawHtml + '\n' + inj[k]).bad.some((r) => r.key === k));
    if (!missR.length) ok(`[H-c] 되돌림 — 구성물 ${Object.keys(inj).length}종을 주입하면 전부 빨개진다`);
    else bad(`[H-c] 되돌림 실패 ${missR.length}종(${missR.join(' · ')}) — 그 항은 아무것도 못 보는 자다`);

    const SQ = `<style>.__h{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3C/svg%3E") 0 0/140px 100px repeat}</style>`;
    const sqBad = R24.census(rawHtml + '\n' + SQ).bg.bad;
    if (sqBad.length === 1 && Math.abs(sqBad[0].ratio - 1.4) < 0.01) ok('[H-c2] 되돌림 — 원본 100×100 을 상자 140×100 으로 늘리면 [H-b] 가 ×1.4 로 빨개진다');
    else bad(`[H-c2] 되돌림 실패 — 140×100 을 주입해도 [H-b] 가 안 잡는다(${sqBad.length}자리)`);

    /* 측정 불가 축 — 크기를 단축이 아니라 **별도 프로퍼티**로 주면 이 자는 못 잰다.
       그 꼴을 «단축에 크기가 없다 = auto = 안전» 으로 읽으면 헛초록이라, 조용히 넘기지 않고 빨개지게 했다.
       (지금 제품에 그런 블록은 0개다 — «없어서 0» 을 «안전해서 0» 으로 적는 것이 23회차의 실수였다.) */
    const sepCen = R24.census(rawHtml + `\n<style>.__h{background:url("data:image/svg+xml,%3Csvg width='100' height='100'%3E%3C/svg%3E") repeat;background-size:140px 100px}</style>`);
    const sepU = (sepCen.bg.unknown || []).length;
    if (sepU === 1 && sepCen.bg.bad.length === 1) ok('[H-c3] 되돌림 — 크기를 별도 `background-size:` 로 주면 «측정 불가» 로 빨개진다 (못 재는 꼴을 조용히 안 넘긴다)');
    else bad(`[H-c3] 되돌림 실패 — 별도 background-size 를 주입해도 안 잡는다(측정 불가 ${sepU}자리)`);

    /* ⓓ 음성항 — «있는 것을 전부 빨갛다» 고 하는 자는 꺼진 자와 같다 */
    const isoOk = R24.census(rawHtml + `\n<style>.__h{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3C/svg%3E") 0 0/40px 40px repeat}</style>`).bg.bad.length === 0;
    const gradOk = R24.census(rawHtml + '\n<style>.__h{background:linear-gradient(#000,#fff);background-size:100% 100%}</style>').bg.bad.length === 0;
    const negN = cen.neg.reduce((s, r) => s + r.n, 0);
    if (isoOk && gradOk && negN > 0) ok(`[H-d] 음성항 — 등방 축소·그라디언트 배경·색 필터/등방 scale ${negN}건은 안 잡는다 (크기 변경은 결함이 아니다)`);
    else bad(`[H-d] 음성항 실패 — 등방${isoOk ? 'OK' : 'X'} 그라디언트${gradOk ? 'OK' : 'X'} 표본 ${negN}건`);

    /* ⓔ 주석 — 스물네 회차가 남긴 이력이 «현재 결함» 으로 읽히면 안 된다.
       이 자를 처음 돌렸을 때 `object-fit:fill` 2건이 물렸는데 **둘 다 주석**이었다(5525·5528).
       ⚠ 이 항을 «원문 n건 > 걷은 뒤 m건» 으로 적으면 표본이 사라지는 날 **조용히 초록**이 된다
          (356 이 스물세 회차 동안 싸운 «못 봐서 0» 이 바로 그 꼴이다). 그래서 제품의 현재 표본에
          기대지 않고 **주석을 직접 주입해** 안 세어지는지 묻는다 — 표본이 0 이 돼도 이 항은 산다. */
    const cmtSrc = rawHtml + '\n/* background:url("x.png") 0 0/9px 1px repeat · filter:url(#q) · border-image:url(a.png) 30 stretch */';
    const cmtCen = R24.census(cmtSrc);
    const leaked = cmtCen.bad.map((r) => r.key).concat(cmtCen.bg.bad.length ? ['bgUrl'] : []);
    if (!leaked.length) ok('[H-e] 주석 걷기 — 주석 안에 넣은 구성물 3종은 안 세어진다 (이력이 현재 결함으로 안 읽힌다)');
    else bad(`[H-e] 주석 안의 구성물이 세어졌다(${leaked.join(' · ')}) — 스물네 회차의 주석이 결함으로 읽힌다`);
  }

  /* ── [I] 25회차 — **시간 축**: 한 점이 아니라 한 주기를 본다 ──────────────────
     스물네 회차의 축은 전부 «**어디를·무엇을** 보는가» 였다(화면·상태·사건·문·출처·구성물).
     남은 축이 하나 있었고 아무도 안 적었다 — «**언제** 보는가».

       `scan356.COLLECT` 는 화면이 가라앉은 뒤 `getComputedStyle` 을 **한 번** 읽는다.
       애니메이션이 도는 노드에서 그 한 점은 **주기의 어느 위상인지 아무도 안 정한 값**이다.

     ⚑ 25회차의 첫 실측이 그것을 그대로 확인했다 — 03 던전 카드 썸네일은 `thBob`(121 이 주인
        지시 ⑥ 으로 만든 스쿼시·스트레치)을 무한 재생으로 돌고 있고, 스윕이 읽은 값은 카드마다
        `1 0.999983` · `1 0.995454` 로 **서로 달랐다.** 값이 흔들린 게 아니라 **도착한 위상이 달랐다.**
        지금은 그 폭이 허용 오차 안이라 초록이지만, 초록의 근거가 «옳아서» 가 아니라 «그 순간이라서» 다.

     ⚠⚠ **소스 리터럴로 판정하면 안 된다** — 이 절의 1판이 그렇게 짰다가 기각됐다.
        `thBob` 의 선언은 `scale: 1 var(--thsqA,.96)` 이라 **소스만 읽으면 4% 찌그러짐**인데,
        `--thsqA` 는 `thPlace` 가 카드마다 넣어 주는 런타임 값이고 화면의 실제 값은 **0.5%** 다
        (`.96` 은 아무도 안 쓰는 폴백 — 121 6회차가 «비율이 아니라 px 로 준다» 로 바꾼 자리).
        소스로 판정했으면 **주인 승인 설계를 결함이라고 부르는 자**가 됐다.

     ⇒ 판정은 **위상 스윕**이 한다. 자를 두 벌로 안 적는다(13회차 [R12]) — `COLLECT` 를 **그대로**
        쓰되 부르기 전에 페이지의 애니메이션을 같은 위상에 못박는다:
            `animation-play-state: paused` + `animation-delay: −(k/N) × 자기 duration`
        k 를 0..N−1 로 돌려 주기 전체를 훑고 노드마다 **최악 비**를 취한다.
        즉 [A] 가 «한 점» 에서 하던 판정을 [I] 는 «한 주기» 에서 한다. 라벨 제외는 `iconKind` 가
        이미 하므로 물려받는다. 못박는 것은 **인라인 스타일**이라 측정이 제품을 안 바꾼다.

     ⚑ [I-c2] 가 이 절의 본체다 — 같은 스쿼시를 «한 점» 으로 읽으면 **0자리**, 한 주기로 읽으면
        32자리다. 그 두 수의 차이가 이 축이 새 축인 이유의 전부다(21·23·24회차와 같은 규율:
        되돌림이 서면 «0건» 이 «값이 옳아서 0» 이지 «안 보는 자라서 0» 이 아니다). */
  console.log('\n[I] 25회차 — 시간 축: 애니메이션 한 주기 안의 종횡비');
  {
    const R25 = require('./probe356r25.js');
    const rawHtml = fs.readFileSync(HTML, 'utf8');

    /* ⓐ 소스 인구조사 — **판정이 아니라 전제**다. 위상 스윕이 훑을 것이 실제로 있는가. */
    const cen = R25.sourceCensus(rawHtml);
    if (cen.blocks.length && cen.steps) ok(`[I-a] 전제 — @keyframes ${cen.blocks.length}블록 · 키프레임 ${cen.steps}칸 · 스케일을 건드리는 칸 ${cen.withScale}개`);
    else bad('[I-a] 전제 — @keyframes 를 못 읽었다 (아래 초록은 전부 헛초록)');
    if (!cen.wa.unknown.length) ok(`[I-a2] WAAPI 호출 ${cen.wa.calls.length}건 전부 배열 리터럴이라 읽힌다 (측정 불가 0)`);
    else bad(`[I-a2] WAAPI 측정 불가 ${cen.wa.unknown.length}건: ` + cen.wa.unknown.map((u) => `줄 ${u.line} — ${u.why}`).join(' · ')
      + ' ⇒ 못 읽는 꼴을 «안전» 으로 읽지 마라(24회차 처방)');

    /* ⓑ 위상 스윕 — 대표 화면([G] 와 같은 규약. 전 화면 순회는 [A] 몫이다) */
    const sweep = async (label, inject) => {
      const line = SCREENS.find(([l]) => l === label);
      if (!line) return { miss: `SCREENS 에 «${label}» 줄이 없다` };
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(1400);
      for (const st of line[1]) { try { await STEP(page, st); } catch (_) {} await page.waitForTimeout(220); }
      await page.waitForTimeout(900);
      if (inject) await page.addStyleTag({ content: inject });
      const animated = await page.evaluate(R25.PIN, 0);
      const worst = new Map();
      let one = null;
      for (let k = 0; k < R25.PHASES; k++) {
        await page.evaluate(R25.PIN, k / R25.PHASES);
        const rows = await page.evaluate(COLLECT, { all: false });
        if (k === 0) one = rows;
        for (const r of rows) {
          if (!r.sx || !r.sy) continue;
          const ratio = Math.max(r.sx / r.sy, r.sy / r.sx);
          const key = r.path || (r.txt + '·' + r.sx);
          const cur = worst.get(key);
          if (!cur || ratio > cur.ratio) worst.set(key, { key, ratio, at: k / R25.PHASES });
        }
      }
      await page.evaluate(R25.PIN, null);
      await ctx.close();
      return {
        animated,
        nodes: (one || []).length,
        rows: [...worst.values()].filter((x) => x.ratio - 1 > TOL).sort((a, b) => b.ratio - a.ratio),
        atRest: (one || []).filter((r) => r.sx && r.sy && Math.max(r.sx / r.sy, r.sy / r.sx) - 1 > TOL).length,
      };
    };

    let pinned = 0, seen = 0;
    for (const label of R25.PICK) {
      const r = await sweep(label);
      if (r.miss) { bad(`[I-b] ${label} — ${r.miss}`); continue; }
      pinned += r.animated; seen += r.nodes;
      if (!r.rows.length) ok(`[I-b] ${label} — 아이콘 ${r.nodes} · 애니 노드 ${r.animated} · 주기 ${R25.PHASES}칸 어느 위상에도 비균등 0`);
      else bad(`[I-b] ${label} — 비균등 ${r.rows.length}자리: `
        + r.rows.slice(0, 5).map((x) => `${x.key} 최악 비 ${x.ratio.toFixed(4)} @위상 ${(x.at * 100).toFixed(0)}%`).join(' · '));
    }
    if (pinned > 0 && seen > 0) ok(`[I-b2] 전제 — 애니 노드 ${pinned}개를 실제로 못박고 아이콘 ${seen}개를 읽었다 (0 이면 위 초록은 헛초록)`);
    else bad(`[I-b2] 전제 실패 — 못박은 애니 노드 ${pinned} · 읽은 아이콘 ${seen}`);

    /* ⓒ 되돌림 — «한 점에서는 안 걸리고 한 주기에서는 걸리는» 모양을 일부러 만든다.
       0%·100% 가 등방이고 한복판만 늘어나면 스윕이 도착하는 위상(0 근처)에서는 등방이다. */
    const inj = await sweep('A1 탭바 열림',
      '@keyframes __i25sq{0%,100%{scale:1 1}50%{scale:1.4 1}}#app .tab>span.ti{animation:__i25sq 30s linear infinite}');
    if (inj.miss) bad('[I-c] 되돌림 화면을 못 열었다 — ' + inj.miss);
    else {
      if (inj.rows.length) ok(`[I-c] 되돌림 — 주입한 스쿼시를 위상 스윕이 ${inj.rows.length}자리로 잡는다 (최악 비 ${inj.rows[0].ratio.toFixed(3)} @위상 ${(inj.rows[0].at * 100).toFixed(0)}%)`);
      else bad('[I-c] 되돌림 실패 — 주입해도 0자리. 이 절은 아무것도 못 보는 자다');
      if (inj.rows.length && inj.atRest === 0) ok('[I-c2] ⚑ 같은 것을 «한 점»([A] 의 방식)으로 읽으면 0자리 — 이 축이 [A] 의 재탕이 아니라는 실측');
      else if (inj.rows.length) bad(`[I-c2] 한 점에서도 ${inj.atRest}자리가 잡힌다 — 이 표본으로는 «새 축» 을 못 보인다`);
    }

    /* ⓓ 음성항 — 등방 애니메이션은 안 잡혀야 한다. 상시 빨간 자는 꺼진 자와 같다(23회차 [G-d]). */
    const uni = await sweep('A1 탭바 열림',
      '@keyframes __i25uni{0%,100%{scale:1}50%{scale:1.4}}#app .tab>span.ti{animation:__i25uni 30s linear infinite}');
    if (!uni.miss && !uni.rows.length) ok('[I-d] 음성항 — 등방 애니(scale 1→1.4→1)를 같은 자리에 주입해도 0자리 (크기 변경은 결함이 아니다)');
    else bad(`[I-d] 음성항 실패 — 등방을 주입했는데 ${uni.rows ? uni.rows.length : '?'}자리가 잡혔다`);
  }

  /* ── [J] 26회차 — **의사 축**: DOM 노드가 아닌 것이 그리는 아이콘 ─────────────
     스물다섯 회차의 축(화면·상태·문·출처·구성물·시간)은 전부 **«DOM 노드 하나를 어떻게 볼까»** 였고,
     여섯 갈래 전부가 `scan356.COLLECT` 의 같은 한 줄 위에 서 있었다:

         const all = app.querySelectorAll('*');

     `querySelectorAll` 은 **의사 요소를 안 돌려준다** — 의사 요소는 DOM 노드가 아니다.
     그래서 `::before`/`::after` 가 그리는 아이콘은 스물다섯 회차의 «비균등 0» 안에
     **한 번도 안 들어 있었다.** 못 봐서 0 이었다(11·12·15 화면 · 21·22 문 · 616 축 에 이은 네 번째 모양).

     ⚑ **[J-c] 가 이 절의 본체다** — 살아 있는 호스트의 의사 요소에 `scaleX(.8)` 을 심으면
        이 축은 잡고 **[A] 축은 0자리**로 읽는다. 그 두 수의 차이가 «새 축» 의 전부다
        (21·23·24·25회차와 같은 규율).

     ⚠ **판정은 화면이 한다 · 소스는 «가 볼 자리» 만 센다**(25회차가 스스로 기각한 1판의 교훈).
        26회차 당시 소스의 의사 아이콘 규칙은 5건이었고 **4건이 `content:attr(data-t)`** 라 소스로는
        그 값이 그림문자인지 글자인지 **알 수 없다.** 그 넷을 «못 읽으니 안전» 으로 접으면 헛초록이라
        [J-a2] 가 그것을 세어 말하고, 실제 판정은 계산된 `content` 를 읽는 [J-b] 가 한다.
        ⚠ **수를 등재값으로 굳히지 않는다**(24회차 [H-b] 규율) — [J-a] 는 «0건이 아니다» 만 본다.

     ⚠ 나머지 1건이던 `.ibtn.lock::after{content:'🔒'}`(당시 1060행)은 **호스트가 DOM 에 없었다** —
        작업 49 가 `.ibtn[data-lock]` 을 지웠고 `.lock` 을 `.ibtn` 에 붙이는 코드가 0곳이었다.
        그래서 이 축의 «아이콘 0개» 는 «규칙이 없어서» 가 아니라 «그 규칙이 죽어서» 였다.
        ⇒ **629 가 그 두 줄을 선언째 걷어냈다**(2026-09-01 · `tools/verify629.js` 23/23) —
        지금 남은 의사 아이콘 규칙은 **`attr(data-t)` 넷뿐**이고, 이 절의 값은 그때와 같다
        (이 축은 규칙 수가 아니라 «화면에 그려진 것» 을 보므로 삭제의 영향이 0이다).
        ⚠ 되돌림 [J-c] 는 **처음부터** 살아 있는 호스트(`R26.HOST_LIVE`)에 심으므로 여기도 영향 0. */
  console.log('\n[J] 26회차 — 의사 축: `::before`/`::after` 가 그리는 아이콘');
  {
    const rawHtml = fs.readFileSync(HTML, 'utf8');
    const cen = R26.sourceCensus(rawHtml);

    /* ⓐ 소스 인구조사 — **전제**다(25회차 [I-a] 규율). 판정이 아니다. */
    if (cen.rules.length) ok(`[J-a] 소스 인구조사 — 의사 요소 규칙 ${cen.rules.length}개 (장식 상자 ${cen.deco} · 아이콘이 될 수 있는 것 ${cen.icons.length})`);
    else bad('[J-a] 의사 요소 규칙을 한 개도 못 읽었다 — 인구조사가 죽었다(아래는 전부 헛초록)');

    const dyn = cen.icons.filter((r) => r.kind === 'dyn');
    if (dyn.length) ok(`[J-a2] 소스로 못 읽는 꼴 ${dyn.length}건(${dyn.map((r) => r.line + '행').join(' · ')}) — «안전» 으로 안 접는다. 판정은 아래 [J-b] 가 화면에서 한다`);
    else ok('[J-a2] `attr()`/`var()` 로 내용을 받는 의사 요소 0건 — 소스 인구조사와 화면 판정이 같은 집합을 본다');

    /* ⓑ 판정 — 전 화면 스윕(위 sweep 이 [A] 와 같은 페이지에서 이미 걷어 온 것) */
    const icons = rowsP.filter((r) => r.kind !== 'empty');
    const nonUni = [...new Map(icons.filter((r) => Math.abs(r.ratio - 1) > TOL).map((r) => [r.sel, r])).values()];
    /* 전제 — «아이콘 0개» 가 «눈이 없어서 0» 이 아님을 세우는 항. 표본은 장식 상자다. */
    if (rowsP.length) ok(`[J-b0] 전제 — 전 화면에서 의사 요소 ${rowsP.length}개를 실제로 읽었다 (그중 아이콘 ${icons.length}개)`);
    else bad('[J-b0] 의사 요소를 한 개도 못 읽었다 — [J-b] 의 0 은 «못 봐서 0» 이다');
    if (!nonUni.length) ok(`[J-b] 의사 아이콘 비균등(|sx/sy−1| > ${TOL}) 0자리 — 아이콘 ${icons.length}개 · ${SCREENS.length}화면`);
    else bad(`[J-b] 의사 아이콘 비균등 ${nonUni.length}자리: `
      + nonUni.slice(0, 5).map((r) => `${r.sel} ${r.ratio} «${r.txt}»`).join(' · '));

    /* ⓒ 되돌림 — 이 절의 본체. **살아 있는** 호스트에 심는다.
       ⚠ 1060행의 `.ibtn.lock::after` 에 심으면 «주입해도 0자리» 가 나오는데, 그건 자가 눈먼 것이
          아니라 **호스트가 없는 것**이다 — 되돌림 시험은 그 둘을 못 가르므로 쓰면 안 된다. */
    const ONE = SCREENS[0];
    const BASE = R26.HOST_LIVE + '::after{content:"🔒";position:absolute;left:0;top:0;font-size:40px;';
    const shot = async (css, collector) => {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      for (const st of ONE[1]) { try { await STEP(page, st); } catch (_) {} await page.waitForTimeout(220); }
      await page.addStyleTag({ content: css });
      await page.waitForTimeout(150);
      const got = await page.evaluate(collector, { all: false });
      await ctx.close();
      return got.filter((r) => r.kind !== 'empty' && Math.abs(r.ratio - 1) > TOL);
    };

    const hitP = await shot(BASE + 'transform:scaleX(.8)}', COLLECT_PSEUDO);
    if (hitP.length) ok(`[J-c] 되돌림 — 살아 있는 호스트의 의사 아이콘에 \`scaleX(.8)\` 을 심으면 ${hitP.length}자리로 잡는다 (${hitP[0].sel} ${hitP[0].ratio})`);
    else bad('[J-c] 되돌림 실패 — 주입해도 0자리. 이 절은 아무것도 못 보는 자다');

    const hitA = await shot(BASE + 'transform:scaleX(.8)}', COLLECT);
    if (hitP.length && !hitA.length) ok('[J-c2] ⚑ 같은 주입을 [A] 축(`scan356.COLLECT`)은 **0자리**로 읽는다 — 이 축이 [A] 의 재탕이 아니라는 실측');
    else if (hitP.length) bad(`[J-c2] [A] 축도 ${hitA.length}자리를 잡는다 — 이 표본으로는 «새 축» 을 못 보인다`);

    /* ⓓ 음성항 둘 — 상시 빨간 자는 꺼진 자와 같다(23회차 [G-d] 규율) */
    const iso = await shot(BASE + 'transform:scale(.8)}', COLLECT_PSEUDO);
    if (!iso.length) ok('[J-d] 음성항 ⓐ — 등방 `scale(.8)` 주입은 0자리 (크기 변경은 결함이 아니다)');
    else bad(`[J-d] 음성항 ⓐ 실패 — 등방 주입에도 ${iso.length}자리를 결함이라 부른다`);

    const lbl = await shot(R26.HOST_LIVE + '::after{content:"출석 5";position:absolute;left:0;top:0;transform:scaleX(.8)}', COLLECT_PSEUDO);
    if (!lbl.length) ok('[J-d2] 음성항 ⓑ — 글자가 섞인 `content` 는 라벨이라 안 센다 (3회차 `u.pr` 선례 · 라벨의 scaleX 는 이 지시의 대상이 아니다)');
    else bad(`[J-d2] 음성항 ⓑ 실패 — 라벨의 scaleX 를 결함이라 부른다(${lbl.length}자리)`);
  }

  /* ── [K] 27회차 — **의사 «이름» 축**: `::before`/`::after` 말고 다른 이름은? ────────
     26회차는 «DOM 노드가 아닌 것» 을 열었지만 **이름을 둘만** 물었다. 이 절이 묻는 것은
     «그 둘이 전부인가» 이고, 답은 **아니다** 였다 — 그리고 인계문이 적어 준 목록과는
     **정반대 모양**이었다(재현 `tools/probe356r27.js` 8/8):

       · 인계문이 지목한 `::marker`·`::first-letter`·`::selection` 은 **속성 제한**이라
         `transform` 이 아예 안 먹는다(선언해도 계산값 `none`) ⇒ 넣어도 **잡을 것이 없다.**
       · 인계문이 지목한 `::part`/`::slotted` 는 `getComputedStyle` 이 **못 읽는다** —
         없는 이름 `::bogus-xyz` 와 **같은 빈 문자열**이라 넣으면 «0» 이 «눈이 없어서 0» 이 된다.
       · 인계문이 **빠뜨린** `::placeholder` 하나가 `::before`/`::after` 와 같은 자격이고,
         **이 저장소에 이미 있다**(`index.html` `.ch-in::placeholder` · 103 채팅 입력창).

     ⚑ **이 절의 본체는 [K-e] 다** — «안 넣었다» 를 **대조군으로** 말한다. 24회차가 경고한 것은
        «없어서 0» 을 안전으로 접는 것이었고, 여기서 새로 나온 모양은 그 반대편 둘이다:
        **«못 찌그러져서 0»**(사정권 밖)과 **«눈이 없어서 0»**(헛초록). 세 0 은 다른 말이라
        자가 셋을 갈라 적어야 한다.

     ⚠ `::placeholder` 는 **그리는 것이 `content` 가 아니라 호스트의 `placeholder` 속성**이다.
        `COLLECT_PSEUDO.contentKind()` 에 그 갈래를 세웠고, [K-c] 되돌림이 그것을 못박는다
        (속성에 그림문자를 넣고 `scaleX(.8)` 을 심으면 잡히고, 글자만이면 라벨이라 안 잡는다). */
  console.log('\n[K] 27회차 — 의사 이름 축: `::placeholder` 편입 · 나머지 이름은 «왜 안 넣는가» 를 자로');
  {
    const R27 = require('./probe356r27.js');
    const ONE = SCREENS[0];
    const CHAT = ['103 채팅', ['#botleft .ubtn[data-util="chat"]']];

    /* 제품 페이지에서 한 번 열고, 그 위에 분류기·수집기를 갈아 대는 공용 손
       (25회차 규율 — «화면 진입 비용을 두 번 내지 마라») */
    const on = async (screen, css, fn, arg) => {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      for (const st of screen[1]) { try { await STEP(page, st); } catch (_) {} await page.waitForTimeout(260); }
      if (css) { await page.addStyleTag({ content: css }); await page.waitForTimeout(150); }
      const got = await page.evaluate(fn, arg);
      await ctx.close();
      return got;
    };

    /* ⓐ 전제 — 소스 인구조사와 화면 판정이 **같은 이름 집합**을 보는가.
       두 집합이 어긋나면 [J-a] 의 수가 [J-b] 의 0 을 설명하지 못한다(566 이 데인 «표가 거짓말» 의 모양). */
    const cenK = R26.sourceCensus(fs.readFileSync(HTML, 'utf8'), R27.PSEUDO_ON);
    const phRules = cenK.rules.filter((r) => /::placeholder\b/.test(r.sel));
    if (phRules.length) ok(`[K-a] 소스 인구조사에 \`::placeholder\` 규칙 ${phRules.length}건 (${phRules.map((r) => r.line + '행').join(' · ')}) — 26회차 인계문의 «제품에 0건» 은 자기가 센 다섯 이름에 대해서만 참이었다`);
    else ok('[K-a] 소스에 `::placeholder` 규칙 0건 — 그래도 축은 선다(«0개» 를 «축이 필요 없다» 로 읽지 마라 · 26회차 규율)');

    /* ⓑ 전제 — 화면에서 그 이름이 **실제로 읽히는가**. 0 이면 [K-c] 아래는 전부 헛초록이다. */
    const phLive = await on(CHAT, null, function (sel) {
      const el = document.querySelector(sel);
      if (!el) return { miss: true };
      const cs = getComputedStyle(el, '::placeholder'), hs = getComputedStyle(el);
      const app = document.getElementById('app');
      const r = el.getBoundingClientRect();
      return { miss: false, blind: cs.transform === '' && cs.fontSize === '',
        col: cs.color, hostCol: hs.color, ph: el.getAttribute('placeholder') || '',
        /* ⚠ 스윕 수집기는 `#app.querySelectorAll('*')` 안에서만 돈다 — 호스트가 그 밖이거나
           rect 가 0 이면 [K-d] 의 0 은 «못 봐서 0» 이다. 전제가 그 둘을 같이 물어야 한다. */
        inApp: !!(app && app.contains(el)), rect: [Math.round(r.width), Math.round(r.height)] };
    }, R27.HOST_PH);
    if (!phLive.miss && !phLive.blind && phLive.col !== phLive.hostCol && phLive.inApp && phLive.rect[0] && phLive.rect[1])
      ok(`[K-b] 전제 — 살아 있는 \`${R27.HOST_PH}::placeholder\` 를 실제로 읽는다 (색 ${phLive.col} ≠ 호스트 ${phLive.hostCol} · placeholder «${phLive.ph}» · \`#app\` 안 ${phLive.rect[0]}×${phLive.rect[1]})`);
    else bad(`[K-b] 전제 실패 — \`${R27.HOST_PH}::placeholder\` 를 못 읽었다(${phLive.miss ? '호스트 없음' : phLive.blind ? '빈 문자열' : !phLive.inApp ? '`#app` 밖이라 스윕이 못 본다' : (!phLive.rect[0] || !phLive.rect[1]) ? 'rect 0 이라 안 센다' : '호스트와 같은 값'}). 아래 0 은 «눈이 없어서 0» 이다`);

    /* ⓒ 되돌림 — 이 절의 본체 ①. **속성에 그림문자를 넣고** 눌러야 잡힌다.
       ⚠ `content:'🔥'` 로는 안 된다 — `::placeholder` 가 그리는 것은 `content` 가 아니다.
          그 사실 자체를 [K-c2] 음성항이 못박는다(같은 주입을 `content` 로 하면 0자리다). */
    const PH_HIT = R27.HOST_PH + '::placeholder{transform:scaleX(.8)}';
    const setPh = (t) => `(() => { const e = document.querySelector('${R27.HOST_PH}'); if (e) e.setAttribute('placeholder', '${t}'); })()`;
    const shotPh = async (css, ph) => {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(900);
      for (const st of CHAT[1]) { try { await STEP(page, st); } catch (_) {} await page.waitForTimeout(260); }
      await page.evaluate(setPh(ph));
      if (css) await page.addStyleTag({ content: css });
      await page.waitForTimeout(150);
      const got = await page.evaluate(COLLECT_PSEUDO, { all: false });
      await ctx.close();
      return got.filter((r) => r.pe === '::placeholder' && r.kind !== 'empty' && Math.abs(r.ratio - 1) > TOL);
    };

    const hitPh = await shotPh(PH_HIT, '🔥');
    if (hitPh.length) ok(`[K-c] 되돌림 — 살아 있는 \`::placeholder\` 에 그림문자를 넣고 \`scaleX(.8)\` 을 심으면 ${hitPh.length}자리로 잡는다 (${hitPh[0].sel} ${hitPh[0].ratio})`);
    else bad('[K-c] 되돌림 실패 — 주입해도 0자리. `::placeholder` 편입이 아무것도 못 보는 자다');

    /* 음성항 ⓐ — 글자 placeholder 는 라벨이라 안 센다(3회차 `u.pr` 선례 · 제품의 «메시지 보내기...» 가 그것) */
    const lblPh = await shotPh(PH_HIT, '메시지 보내기...');
    if (!lblPh.length) ok('[K-c2] 음성항 ⓐ — 글자 placeholder 는 같은 `scaleX(.8)` 에도 0자리 (라벨의 scaleX 는 이 지시의 대상이 아니다)');
    else bad(`[K-c2] 음성항 ⓐ 실패 — 라벨의 scaleX 를 결함이라 부른다(${lblPh.length}자리)`);

    /* 음성항 ⓑ — 등방은 결함이 아니다(23회차 [G-d] 규율) */
    const isoPh = await shotPh(R27.HOST_PH + '::placeholder{transform:scale(.8)}', '🔥');
    if (!isoPh.length) ok('[K-c3] 음성항 ⓑ — 등방 `scale(.8)` 주입은 0자리 (크기 변경은 결함이 아니다)');
    else bad(`[K-c3] 음성항 ⓑ 실패 — 등방 주입에도 ${isoPh.length}자리를 결함이라 부른다`);

    /* ⓓ 판정 — 지금 제품의 `::placeholder` 비균등 0자리.
       위 [J-b] 스윕이 이미 세 이름을 다 걷어 왔으므로 그 안에서 이 이름만 갈라 본다. */
    const phRows = rowsP.filter((r) => r.pe === '::placeholder');
    const phBad = phRows.filter((r) => r.kind !== 'empty' && Math.abs(r.ratio - 1) > TOL);
    if (!phBad.length) ok(`[K-d] \`::placeholder\` 비균등 0자리 — 관측 ${phRows.length}개 (그중 아이콘 ${phRows.filter((r) => r.kind !== 'empty').length}개) · ${SCREENS.length}화면`);
    else bad(`[K-d] \`::placeholder\` 비균등 ${phBad.length}자리: ` + phBad.slice(0, 5).map((r) => `${r.sel} ${r.ratio}`).join(' · '));

    /* ⓔ **이 절의 본체 ②** — «나머지 이름을 왜 안 넣는가» 를 **제자리에서 잰다.**
       제품 페이지의 실제 호스트에 같은 선언을 심고 세 부류를 갈라 적는다.
       ⚠ 이 항이 없으면 [K] 는 «다섯 이름을 없어서 안 넣었다» 가 되어 24회차가 경고한 꼴이 된다. */
    /* ⚠ **호스트가 하나면 [K-e3] 이 거짓으로 빨개진다** — `.ch-in` 은 `<input>`(대체 요소)이라
       `::before`/`::after` 를 **원래 안 만든다.** 그 위에서 «안 먹는다» 를 보고 «사정권 밖» 이라
       읽으면 자가 자기 축을 스스로 부정한다. ⇒ 대체 요소 하나(`::placeholder` 가 사는 자리)와
       보통 요소 하나(`::before`/`::after` 가 사는 자리)를 **같이** 준다. 이름별 접기는
       «어느 호스트에서든 먹었으면 먹는다» 라 두 자리가 서로를 메운다. */
    const K_HOSTS = [{ key: 'ch-in(input)', sel: R27.HOST_PH }, { key: 'chw(div)', sel: '#chw' }];
    const cls = await on(CHAT, R27.probeCss(K_HOSTS.map((h) => h.sel), R27.NAMES.concat([R27.BOGUS])),
      R27.CLASSIFY, { names: R27.NAMES, bogus: R27.BOGUS, hosts: K_HOSTS });
    const byK = R27.fold(cls, R27.NAMES.concat([R27.BOGUS]));
    const offHit = R27.PSEUDO_OFF.filter((n) => byK.has(n) && !byK.get(n).blind && !byK.get(n).tr);
    const blindHit = R27.PSEUDO_BLIND.filter((n) => byK.has(n) && byK.get(n).blind);
    const bogusBlind = byK.get(R27.BOGUS) && byK.get(R27.BOGUS).blind;

    if (offHit.length === R27.PSEUDO_OFF.length)
      ok(`[K-e] «못 찌그러져서 0» ${offHit.length}종 — ${offHit.map((n) => '::' + n).join(' · ')} 은 속성 제한이라 \`transform:scaleX(.5)\` 를 심어도 계산값이 \`none\` 이다 (넣어도 잡을 것이 없다 — 26회차 인계문이 지목한 셋이 여기 있다)`);
    else bad(`[K-e] 사정권 밖이어야 할 이름 중 ${R27.PSEUDO_OFF.length - offHit.length}종이 실측과 다르다 — 다시 가르고 \`PSEUDO_OFF\` 를 고쳐라 (실측 통과 ${offHit.join(' · ') || '없음'})`);

    if (blindHit.length === R27.PSEUDO_BLIND.length && bogusBlind)
      ok(`[K-e2] «눈이 없어서 0» ${blindHit.length}종 — ${blindHit.map((n) => '::' + n).join(' · ')} 은 \`getComputedStyle\` 이 **빈 문자열**을 돌려준다. 없는 이름 \`::${R27.BOGUS}\` 와 값이 같으므로 넣으면 «0» 을 «없어서 0» 과 못 가른다(헛초록) ⇒ **안 넣는 것이 판정이다**`);
    else bad(`[K-e2] «눈이 없어서 0» 축이 무너졌다 — 대조군 \`::${R27.BOGUS}\` blind=${bogusBlind} · ${R27.PSEUDO_BLIND.map((n) => n + '=' + (byK.get(n) ? byK.get(n).blind : '?')).join(' · ')}`);

    const onHit = R27.PSEUDO_ON.map((n) => n.replace(/^::/, '')).filter((n) => byK.has(n) && byK.get(n).tr);
    if (onHit.length === R27.PSEUDO_ON.length)
      ok(`[K-e3] 음성 대조 — 사정권 세 이름(${onHit.map((n) => '::' + n).join(' · ')})은 **같은 주입에 transform 이 먹는다**. 위 두 항의 «안 먹는다» 가 자의 눈이 먼 탓이 아니라는 실측`);
    else bad(`[K-e3] 사정권 이름 중 ${R27.PSEUDO_ON.length - onHit.length}종이 같은 주입에 안 먹는다 — [K-e]·[K-e2] 의 «안 먹는다» 가 자의 눈 탓일 수 있다`);
  }

  /* ── [L] 28회차(작업 634) — **캔버스 축을 전 화면으로** ────────────────────────
     23회차가 세운 캔버스 축([G-b] drawImage 비균등 · [G-g] 비균등 컨텍스트 변환)은
     `PICK` **대표 4화면**만 돌고 있었다. 26회차 인계문이 그 접기를 이렇게 정당화했다 —
       « [G]·[I] 는 [A] 가 이미 도는 축의 «다른 각도» 라 대표 화면으로 접어도 되지만,
         의사 요소는 [A] 가 **구조적으로 못 보는** 노드라 대표 화면으로 접으면 그만큼이 그냥 구멍이다. »
     **기준은 옳은데 [G] 를 잘못 분류했다.** [I](시간)는 정말로 «[A] 가 도는 그 노드의 다른
     위상» 이지만, [G] 가 보는 것은 캔버스 **안에 구워진** 픽셀이고 23회차 자신이
     «`getComputedStyle` 로는 영영 안 보인다» 고 적어 뒀다 = [A] 가 **구조적으로 못 보는** 자리다.
     그 기준을 그대로 대면 이 축이야말로 «접으면 구멍» 이고, 실측이 그 구멍의 크기를 말한다 —
     대표 4화면 `drawImage` **15,276건** ↔ 전 화면 **274,492건**(밖에 놓인 화면 67개 · ×18.0).

     ⚑ **[G] 를 지우지 않았다** — 그 절은 616 «직전» 트리 되돌림([G-c])을 이고 있고
        되돌림은 대표 화면에서 도는 것이 맞다. 넓힌 것은 «지금 트리의 판정» 하나다.
     ⚑ **커버리지 항([L-b])의 방향은 [B]·[F] 래칫과 반대다** — 저 둘은 «결함이 늘면 빨강»,
        이것은 «**커버리지가 줄면 빨강**». 판정값이 0자리라 «0 이 늘었다» 로는 축이 꺼진 것을
        못 본다(356 이 스물여덟 회차 동안 싸운 «못 봐서 0» 의 다섯 번째 모양).
     ⚠ 하한을 **손으로 안 적는다** — 전투 캔버스는 어느 화면에서도 살아 있어 실측이 71/71 이므로
        기대값은 `SCREENS.length` **그 자체**다(402 «표가 아니라 파생»). 화면이 늘면 기대도 는다. */
  console.log('\n[L] 28회차 — 캔버스 축 전 화면: [G-b]·[G-g] 를 대표 4화면에서 전 화면으로');
  {
    const R28 = require('./probe356r28.js');
    const g = R28.fold(seenG);
    const gBad = g.bad.filter((r) => r.inApp);

    /* ⓐ 전제 — 훅이 **정말 돌았는가**. 0 이면 아래 초록은 전부 헛초록이다([G-a] 와 같은 자리). */
    if (g.calls > 0 && !g.err) ok(`[L-a] 전제 — 주 스윕에서 drawImage ${g.calls}건 관측 · 훅 예외 ${g.err}건 (축이 살아 있다)`);
    else bad(`[L-a] 전제 실패 — drawImage 관측 ${g.calls}건 · 훅 예외 ${g.err}건. 아래 0 은 «못 봐서 0» 이다`);

    /* ⓑ 커버리지 — 이 절의 존재 이유. «캔버스가 도는 화면» 이 스윕 전 화면이어야 한다. */
    if (g.live === SCREENS.length)
      ok(`[L-b] 커버리지 — 캔버스가 도는 화면 ${g.live}/${SCREENS.length} (대표 4화면이 아니라 전 화면에서 이 축이 산다)`);
    else
      bad(`[L-b] 커버리지 ${g.live}/${SCREENS.length} — 캔버스가 안 도는 화면 ${g.dead.length}개: ${g.dead.slice(0, 8).join(' · ')}`
        + ' ⇒ 그 화면의 «비균등 0» 은 «없어서 0» 이 아니라 «안 봐서 0» 이다');

    /* ⓒ 판정 — 지금 트리. 두 축을 같이 본다([G-b]·[G-g] 와 같은 물음, 화면만 71배). */
    if (!gBad.length) ok(`[L-c] 전 화면 캔버스 안 비균등 그리기 0자리 (${g.live}화면 · ${g.calls}건)`);
    else bad(`[L-c] 캔버스 안 비균등 그리기 ${gBad.length}자리: `
      + gBad.slice(0, 6).map((r) => `${r.screen} ${r.sel} ×${r.ratio} (${r.src})`).join(' · '));
    if (!g.ctxNU) ok(`[L-c2] 전 화면 비균등 컨텍스트 변환 0회 — 뒤집기 scale(-1,1) 은 |sx|=|sy| 라 안 센다`);
    else bad(`[L-c2] 비균등 컨텍스트 변환 ${g.ctxNU}회 — drawImage 인자가 등방이어도 화면에서는 늘어난다`);

    /* ⓓ 되돌림 + **[A] 대조** + 음성항 — 이 절의 본체.
       21회차 교훈: «0건» 은 값이 옳아서 0 인지 안 보는 자라서 0 인지 스스로 말해야 한다.
       ⚠ 되돌림은 **한 화면**에서 돈다(스윕을 한 벌 더 돌지 않는다 — [G-c] 와 같은 규율).
       ⚑ [L-d2] 가 이 회차가 새로 세운 자리다 — 같은 주입을 [A] 축이 **0자리**로 읽는 것이
          «[G] 는 [A] 의 다른 각도가 아니다»(= 대표 화면으로 접으면 그만큼이 구멍이다)의 실측이다. */
    const sq = await R28.shot(browser, { inject: R28.SQUASH_Y });
    const sqBad = sq.hk ? Object.values(sq.hk.bad).filter((r) => r.inApp) : [];
    if (sqBad.length) ok(`[L-d] 되돌림 — «${sq.label}» 캔버스에 **세로만** ×0.6 을 심으면 ${sqBad.length}자리로 잡는다 (최악 ×${sqBad.map((r) => r.ratio).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1))[0]})`);
    else bad('[L-d] 되돌림 실패 — 세로만 ×0.6 을 심어도 0자리다. 이 절은 아무것도 못 보는 자다');

    if (sq.aSeen > 0 && sq.aBad === 0)
      ok(`[L-d2] [A] 대조 — **같은 주입**을 [A] 축(\`scan356.COLLECT\`)은 ${sq.aBad}자리로 읽는다(관측 ${sq.aSeen}노드). `
        + '캔버스 안 픽셀은 `getComputedStyle` 에 흔적이 없다 ⇒ [G] 는 «[A] 가 도는 축의 다른 각도» 가 아니고, 대표 화면으로 접으면 그만큼이 구멍이다');
    else bad(`[L-d2] [A] 대조 실패 — [A] 축이 ${sq.aBad}자리(관측 ${sq.aSeen}노드)로 읽는다. `
      + (sq.aSeen ? '이 주입은 [A] 도 보는 자리라 «[A] 가 구조적으로 못 본다» 의 표본이 아니다' : '[A] 수집기가 죽었다'));

    const iso = await R28.shot(browser, { inject: R28.ISO2 });
    const isoBad = iso.hk ? Object.values(iso.hk.bad).filter((r) => r.inApp) : [];
    if (!isoBad.length && iso.hk && iso.hk.calls > 0)
      ok(`[L-d3] 음성항 — **등방** ×2 주입은 ${isoBad.length}자리 (관측 ${iso.hk.calls}건 · 크기 변경은 결함이 아니다 · [G-d] 규율)`);
    else bad(`[L-d3] 음성항 실패 — 등방 ×2 를 ${isoBad.length}자리라 부른다(관측 ${iso.hk ? iso.hk.calls : 0}건)`);

    const cn = await R28.shot(browser, { ctxNu: true });
    if (cn.ctxNuInjected === 1 && cn.hk && cn.hk.ctxNonUni > 0)
      ok(`[L-d4] 되돌림 — \`ctx.scale(1,0.6)\` 을 한 번 걸면 [L-c2] 가 ${cn.hk.ctxNonUni}회로 잡는다 (컨텍스트 축도 살아 있다)`);
    else bad(`[L-d4] 되돌림 실패 — \`ctx.scale(1,0.6)\` 을 걸어도 ${cn.hk ? cn.hk.ctxNonUni : 0}회다(주입 ${cn.ctxNuInjected}건). [L-c2] 는 아무것도 못 보는 자다`);
  }

  /* ── [M] 29회차 — **매체 «내용 좌표계 ↔ 표시 상자» 축** ──────────────────────
     스물여덟 회차가 넓혀 온 것은 전부 «**노드에 걸린 배율**» 이다(자기 transform · 조상 누적 ·
     개별 scale · 의사 요소 · 캔버스 안 픽셀). **매체는 배율이 하나도 안 걸려도 찌그러진다** —
     내용이 제 좌표계를 갖고 있고 표시 상자가 그 비와 다르면 브라우저가 상자에 맞춰 늘린다.

     ⚑ **356 은 이 축을 이미 알고 있었다 — 매체 한 종에만 세웠을 뿐이다.**
        `scan356.COLLECT` 는 `IMG` 에만 «화면 종횡비 ÷ 원본 종횡비» 를 잰다(`object-fit:fill` 갈래).
        그런데 같은 파일의 `isMedia()` 가 세는 매체는 **IMG·CANVAS·SVG 셋**이다.
        ⇒ 자기가 열거한 셋 중 **하나에만** 자를 세우고 스물여덟 회차 «전 화면 0건» 을 찍어 온 것이고,
        24·26·27회차가 되풀이한 «못 봐서 0» 의 **다섯 번째 모양**이다(앞의 넷과 달리 놓친 자리가
        남의 축이 아니라 **자기 축의 나머지 절반**이다).

     ⚠ **갈래마다 «0» 의 뜻이 다르다**(27회차 [K-e] 규율 — 세 가지 0 을 한 줄로 안 찍는다):
        CANVAS = 대상인데 **눈이 없었다**(이 회차가 낸다) · SVG = **상자 비로 재면 헛빨강**이라
        판정축이 `preserveAspectRatio` 다 · IMG = 자가 있지만 `naturalWidth===0` 에서 **조용히 빠져나간다**.
     ⚠ [L] 과 층이 다르다 — [L] 은 캔버스 «안» 에 무엇이 어떻게 그려지는가, [M] 은 그 캔버스
        «자체» 가 어떤 상자에 눌리는가다. `ctx.scale` 이 완벽히 등방이어도 상자가 통째로 늘린다. */
  console.log('\n[M] 29회차 — 매체 축: 배율이 하나도 안 걸려도 «내용 좌표계 ↔ 표시 상자» 가 어긋나면 늘어난다');
  {
    const R29 = require('./probe356r29.js');
    const mv = MEDIA_VERDICT(rowsM, TOL);
    const byKind = (k) => rowsM.filter((r) => r.kind === k);

    /* ⓐ 전제 — 아무것도 못 본 자는 언제나 0건이다(11·21·26회차) */
    if (!rowsM.length) bad('[M-a] 매체를 한 자리도 못 봤다 — 이 절은 아무것도 못 보는 자다 (헛초록 방지)');
    else ok(`[M-a] 전 화면 매체 ${rowsM.length}자리 관측 (canvas ${byKind('canvas').length} · svg ${byKind('svg').length} · img ${byKind('img').length})`);

    /* ⓐ2 전제 — «눈 없음» 은 초록이 아니다. 하나라도 있으면 그 자리는 **자가 못 보는 자리**다. */
    if (!mv.blind.length) ok(`[M-a2] «눈 없음» 0자리 — 사정권 안 ${mv.inScope.length}자리 전부가 내용 좌표계를 읽힌다`);
    else bad(`[M-a2] «눈 없음» ${mv.blind.length}자리 — 초록으로 세면 안 된다: `
      + mv.blind.slice(0, 4).map((r) => `${r.screen} ${r.sel} (${r.why})`).join(' · '));

    /* ⓑ 판정 — 지금 트리 */
    if (!mv.bad.length) ok(`[M-b] 전 화면 매체 비균등 0자리 (사정권 안 ${mv.inScope.length} · 밖 ${mv.outs.length})`);
    else bad(`[M-b] 매체 비균등 ${mv.bad.length}자리: `
      + mv.bad.slice(0, 6).map((r) => `${r.screen} ${r.sel} d=${r.d}`).join(' · '));

    /* ⓒ **«0» 을 갈래마다 갈라 적는다** — 이 항이 없으면 세 가지 0 이 다시 한 줄이 된다 */
    {
      const line = ['canvas', 'svg', 'img'].map((k) => {
        const v = MEDIA_VERDICT(byKind(k), TOL);
        return `${k} 안 ${v.inScope.length}/밖 ${v.outs.length}/눈없음 ${v.blind.length}`;
      }).join(' · ');
      const svgIn = MEDIA_VERDICT(byKind('svg'), TOL).inScope.length;
      const imgFill = MEDIA_VERDICT(byKind('img'), TOL).inScope.length;
      ok(`[M-c] 갈래별 0 의 뜻 — ${line}`
        + ` ⇒ canvas 는 «봤는데 0» · svg 사정권 안 ${svgIn}자리(= \`preserveAspectRatio="none"\` 이 제품에 ${svgIn}건 = «없어서 0»)`
        + ` · img \`object-fit:fill\` ${imgFill}자리(= «없어서 0»)`);
    }

    /* ⓓ 되돌림 + [A] 대조 + 음성항 — **합성**(probe356r29 의 표본 일곱).
       ⚠ 스윕을 한 벌 더 돌지 않는다([G-c]·[L-d] 와 같은 규율) — 합성 페이지 한 장이다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.setContent(R29.SYN);
      await page.waitForTimeout(150);
      const syn = await page.evaluate(COLLECT_MEDIA);
      const old = await page.evaluate(COLLECT, { all: true });
      const pick = (rs, id, key) => rs.find((r) => r[key || 'sel'].indexOf('#' + id) >= 0);
      const sq = pick(syn, 'cSquash'), sqOld = pick(old, 'cSquash');
      const okc = pick(syn, 'cOk'), bare = pick(syn, 'cBare');
      const sD = pick(syn, 'sDefault'), sN = pick(syn, 'sNone'), sV = pick(syn, 'sNoVb');
      const iN = pick(syn, 'iNoNat'), iNOld = pick(old, 'iNoNat');

      if (sq && sq.scope === 'in' && Math.abs(sq.d - 1) > TOL)
        ok(`[M-d] 되돌림 — \`<canvas 88×92>\` 를 150×50 상자에 넣으면 왜곡비 ${sq.d} 로 잡는다`);
      else bad(`[M-d] 되돌림 실패 — 상자로 3배 늘린 캔버스를 못 잡는다: ${JSON.stringify(sq)}`);

      if (sqOld && Math.abs(sqOld.ratio - 1) <= 1e-6)
        ok(`[M-d2] [A] 대조 — **같은 표본**을 [A] 축(\`scan356.COLLECT\`)은 ratio ${sqOld.ratio} = 초록이라 한다 `
          + '⇒ 이 층은 [A] 가 «구조적으로 못 보는» 자리이고, 대표 화면으로 접으면 그만큼이 그냥 구멍이다');
      else bad(`[M-d2] [A] 대조 실패 — [A] 가 이미 본다(${sqOld ? sqOld.ratio : '수집 안 됨'}). 이 표본은 «[A] 가 못 본다» 의 증거가 아니다`);

      if (okc && bare && Math.abs(okc.d - 1) <= TOL && Math.abs(bare.d - 1) <= TOL)
        ok(`[M-d3] 음성항 — 비가 맞는 상자(d=${okc.d}) · CSS 크기 선언 없음(d=${bare.d}) 은 안 빨개진다 (크기 변경은 결함이 아니다)`);
      else bad(`[M-d3] 음성항 실패 — 등방 캔버스를 결함이라 부른다: ${JSON.stringify(okc)} / ${JSON.stringify(bare)}`);

      /* ⓔ **«SVG 를 상자 비로 안 재는 이유»** — 27회차 [K-e] 와 같은 규율(안 넣는 이유를 자가 말한다).
         상자 비를 그대로 댔으면 기본 preserveAspectRatio 표본과 viewBox 없는 표본이 **헛빨강**이다. */
      const ghost = [sD, sV].filter((r) => r && Math.abs((r.w / r.h) - 1) > TOL).length;
      if (sD && sD.scope === 'out' && sV && sV.scope === 'out' && sN && sN.scope === 'in' && Math.abs(sN.d - 1) > TOL && ghost === 2)
        ok(`[M-e] SVG 는 상자 비로 안 잰다 — 기본 \`preserveAspectRatio\`(레터박스)와 viewBox 없는 표본은 상자가 3:1 이어도 `
          + `잉크가 1:1 이다(찍힌 픽셀로 확인 — \`probe356r29\` [4]·[5]). 상자 비로 쟀으면 그 ${ghost}자리가 헛빨강이었다. `
          + `판정축은 \`preserveAspectRatio="none"\` 이고 그 표본만 d=${sN.d} 로 잡힌다`);
      else bad(`[M-e] SVG 갈래가 안 선다: 기본 ${JSON.stringify(sD)} / none ${JSON.stringify(sN)} / viewBox없음 ${JSON.stringify(sV)}`);

      /* ⓕ IMG 탈출구 — 자가 있는데 조용히 빠져나가는 자리 */
      if (iN && iN.scope === 'blind' && iNOld && Math.abs(iNOld.ratio - 1) <= 1e-6)
        ok(`[M-f] IMG 탈출구 — \`object-fit:fill\` 인데 \`naturalWidth===0\` 이면 \`scan356.COLLECT\` 는 ratio ${iNOld.ratio}(초록)로 남긴다. `
          + '이 절은 그 자리를 «눈 없음» 으로 돌려 [M-a2] 가 물게 한다 (지금 제품에 0건이지만, 0 을 «없어서» 라고 부를 수 있으려면 자가 그렇게 말해야 한다)');
      else bad(`[M-f] IMG 탈출구가 안 갈린다: ${JSON.stringify(iN)} / 현행 ${JSON.stringify(iNOld)}`);

      await ctx.close();
    }

    /* ⓖ **제품 되돌림** — 합성 페이지가 아니라 진짜 화면의 진짜 캔버스를 눌러 본다.
       ⚠ 합성만으로 닫으면 «자는 사는데 제품 스윕에는 안 물려 있다» 를 못 가른다(26회차 [J] 가 데인 자리).
       ⚠ 스윕을 한 벌 더 돌지 않는다 — 화면 **한 장**이다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        const before = await page.evaluate(COLLECT_MEDIA);
        const bv = MEDIA_VERDICT(before, TOL);
        const hit = await page.evaluate(() => {
          const app = document.getElementById('app');
          const c = [...app.querySelectorAll('canvas')].find((x) => { const r = x.getBoundingClientRect(); return r.width && r.height && x.width && x.height; });
          if (!c) return null;
          const r = c.getBoundingClientRect();
          /* 세로만 0.6 배 — 배율이 아니라 **상자**를 눌러야 이 층의 표본이다 */
          c.style.width = r.width + 'px'; c.style.height = (r.height * 0.6) + 'px';
          return c.id || c.getAttribute('class') || '(익명)';
        });
        await page.waitForTimeout(150);
        const after = await page.evaluate(COLLECT_MEDIA);
        const av = MEDIA_VERDICT(after, TOL);
        if (!hit) bad('[M-g] 되돌림 표본이 없다 — 02 메인에 잴 수 있는 캔버스가 한 자리도 없다');
        else if (bv.bad.length === 0 && av.bad.length > 0)
          ok(`[M-g] 제품 되돌림 — 02 메인의 실제 캔버스 «${hit}» 상자를 **세로만** ×0.6 으로 누르면 `
            + `${bv.bad.length}자리 → ${av.bad.length}자리로 빨개진다 (최악 d=${av.bad.map((r) => r.d).sort((a, b) => Math.abs(b - 1) - Math.abs(a - 1))[0]}) `
            + '⇒ 이 절이 스윕에 정말 물려 있다');
        else bad(`[M-g] 제품 되돌림 실패 — 주입 전 ${bv.bad.length}자리 / 주입 후 ${av.bad.length}자리 (표본 «${hit}»)`);
      } catch (e) { bad('[M-g] 제품 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }
  }

  /* ── [N] 30회차 — **매체 축 × 짧은 프레임(9:13.3)** ──────────────────────────
     29회차는 열째 프런티어를 닫으면서 자기 한계를 하나 **글로 적어 넘겼다**(§36-7 마지막 줄):
     «[M] 은 2280 프레임에서만 잰다 … 그 프레임의 매체 축은 아직 아무도 안 봤다. 값은 공짜다».
     24회차가 세운 규율이 그것을 이 회차의 일로 만든다 —
     **«자기 한계를 글로 넘긴 회차는 그 한계를 안 닫은 것이다.»**

     ⚠ **이 절이 [F] 의 사본이 아닌 이유**(둘 다 1600 에서 재지만 보는 층이 다르다):
        [F] 는 [A] 축(**노드에 걸린 배율**)을 짧은 프레임에서 다시 본다 — 시트가 짧아지며
        요소에 `transform` 이 걸리는 자리다. 이 절은 **배율이 한 줄도 안 걸린 채**
        상자만 줄어 내용 좌표계와 비가 어긋나는 자리를 본다.
        구조적 자리는 이미 하나 알고 있다 — `#stagearea{flex:1}` 이 남는 높이를 흡수하므로
        **전투 캔버스 상자는 프레임을 그대로 타는데** 비트맵(`canvas.width/height`)은
        `resize` 핸들러가 다시 잡아 줘야만 따라온다. 안 따라오면 그림이 눌리고
        [A]·[F] 는 `ratio 1` = 초록을 찍는다([M-d2] 가 같은 대조를 2280 에서 이미 세웠다).
     ⚠ **«2280 에서 0» 은 «1600 에서 0» 의 근거가 아니다** — 29회차가 «자리»와 «행» 을 갈라 적으며
        «하나를 다른 하나의 근거로 인용하지 마라» 고 못박은 것과 같은 규율이다. */
  console.log('\n[N] 30회차 — 매체 축을 짧은 프레임(1080×1600)에서도 잰다: 배율 없이 «상자만» 줄어 어긋나는 층');
  {
    const mvF = MEDIA_VERDICT(rowsMF, TOL);
    const pair = R30.pairUp(rowsM, rowsMF, TOL);
    const byKindF = (k) => rowsMF.filter((r) => r.kind === k);

    /* ⓐ 전제 — 아무것도 못 본 자는 언제나 0건이다(11·21·26·29회차) */
    if (!rowsMF.length) bad('[N-a] 1600 에서 매체를 한 자리도 못 봤다 — 이 절은 아무것도 못 보는 자다 (헛초록 방지)');
    else ok(`[N-a] 1600 프레임 매체 ${rowsMF.length}행 관측 (canvas ${byKindF('canvas').length} · svg ${byKindF('svg').length} · img ${byKindF('img').length})`);

    /* ⓐ2 전제 — **매체 전용 무음 실패 감시**. [F-a] 는 `innerHeight` 로 «리사이즈가 먹었나» 를 보지만,
       이 절이 물어야 하는 것은 «그 리사이즈가 **매체 상자에까지 닿았나**» 다. 상자가 한 자리도
       안 움직였으면 이 절은 같은 프레임을 두 번 잰 것이고 그 0 은 헛초록이다. */
    if (pair.boxMoved.length > 0)
      ok(`[N-a2] 두 프레임에서 상자가 실제로 달라진 매체 ${pair.boxMoved.length}자리 — 이 절의 수는 정말 다른 프레임의 수다`
        + (pair.newInF.length ? ` (1600 에만 있는 행 ${pair.newInF.length})` : ''));
    else bad('[N-a2] 상자가 한 자리도 안 움직였다 — 리사이즈가 매체에 안 닿았다 (2280 을 두 번 잰 값이다 · 헛초록 방지)');

    /* ⓐ3 «눈 없음» 은 초록이 아니다 — 29회차 [M-a2] 와 같은 규율을 짧은 프레임에도 세운다 */
    if (!mvF.blind.length) ok(`[N-a3] 1600 «눈 없음» 0자리 — 사정권 안 ${mvF.inScope.length}행 전부가 내용 좌표계를 읽힌다`);
    else bad(`[N-a3] 1600 «눈 없음» ${mvF.blind.length}자리 — 초록으로 세면 안 된다: `
      + mvF.blind.slice(0, 4).map((r) => `${r.screen} ${r.sel} (${r.why})`).join(' · '));

    /* ⓑ 판정 — 짧은 프레임의 지금 트리 */
    if (!mvF.bad.length) ok(`[N-b] 1600 매체 비균등 0행 (사정권 안 ${mvF.inScope.length} · 밖 ${mvF.outs.length})`);
    else bad(`[N-b] 1600 매체 비균등 ${mvF.bad.length}행: `
      + mvF.bad.slice(0, 6).map((r) => `${r.screen} ${r.sel} d=${r.d} 상자 ${r.w}×${r.h}`).join(' · '));

    /* ⓒ **이 절의 존재 이유** — «1600 에서만» 어긋나는 자리. [F-c] 와 같은 물음을 이 층에 세운다.
       [N-b] 가 0 이면 이 집합도 정의상 0 이지만, **수를 따로 찍는 것이 이 절이 무엇을 위해 있는지**를 말한다. */
    if (!pair.onlyF.length) ok(`[N-c] «1600 에서만» 비균등인 매체 0행 — 2280 이 못 보는 프레임 전용 결함이 없다`);
    else bad(`[N-c] «1600 에서만» 비균등인 매체 ${pair.onlyF.length}행 (2280 에서는 초록이라 [M] 이 구조적으로 못 보는 자리다): `
      + pair.onlyF.slice(0, 6).map((r) => `${r.screen} ${r.sel} d=${r.d}`).join(' · '));

    /* ⓓ 갈래마다 «0» 의 뜻을 갈라 적는다 — [M-c] 와 같은 규율(세 가지 0 을 한 줄로 안 찍는다) */
    {
      const line = ['canvas', 'svg', 'img'].map((k) => {
        const v = MEDIA_VERDICT(byKindF(k), TOL);
        return `${k} 안 ${v.inScope.length}/밖 ${v.outs.length}/눈없음 ${v.blind.length}/비균등 ${v.bad.length}`;
      }).join(' · ');
      ok(`[N-d] 1600 갈래별 0 의 뜻 — ${line}`);
    }

    /* ⓔ **되돌림(합성)** — 이 축이 정말 프레임을 타는가. 스윕을 한 벌 더 돌지 않는다(합성 한 장).
       ⚠ 이 항이 없으면 [N-b] 의 0 은 «프레임을 바꿔도 아무것도 안 변하는 자» 의 0 일 수 있다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 600 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.setContent(R30.SYN_F);
        await page.waitForTimeout(120);
        const tall = await page.evaluate(COLLECT_MEDIA);
        await page.setViewportSize({ width: 400, height: 200 });
        await page.waitForTimeout(120);
        const short = await page.evaluate(COLLECT_MEDIA);
        const by = (rs, id) => rs.find((r) => r.sel.indexOf('#' + id) >= 0);
        const vhT = by(tall, 'cVh'), vhS = by(short, 'cVh');
        const fxT = by(tall, 'cFix'), fxS = by(short, 'cFix');
        if (vhT && vhS && Math.abs(vhT.d - vhS.d) > TOL)
          ok(`[N-e] 되돌림 — 상자 높이만 뷰포트에 매인 캔버스(비트맵 200×100 고정)는 프레임을 줄이면 `
            + `d ${vhT.d} → ${vhS.d} 로 **갈린다** ⇒ 이 축은 프레임을 타고, [N-b] 의 0 은 «안 변하는 자» 의 0 이 아니다`);
        else bad(`[N-e] 되돌림 실패 — 프레임을 줄여도 이 자가 값을 안 바꾼다: ${JSON.stringify(vhT)} / ${JSON.stringify(vhS)}`);

        if (fxT && fxS && Math.abs(fxT.d - 1) <= TOL && Math.abs(fxS.d - 1) <= TOL)
          ok(`[N-e2] 음성항 — 상자가 프레임과 무관한 캔버스는 두 프레임 다 d=${fxT.d}/${fxS.d} (프레임을 줄였다는 이유만으로는 안 빨개진다)`);
        else bad(`[N-e2] 음성항 실패 — 프레임을 줄였더니 멀쩡한 캔버스를 결함이라 부른다: ${JSON.stringify(fxT)} / ${JSON.stringify(fxS)}`);
      } catch (e) { bad('[N-e] 합성 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }

    /* ⓕ **제품 되돌림 — 1600 에서** . [M-g] 가 2280 에서 한 것과 같은 손이되 프레임이 다르다.
       ⚠ 합성만으로 닫으면 «자는 사는데 **1600 스윕에는** 안 물려 있다» 를 못 가른다
          (26회차 [J] 가 데인 자리이고, 29회차가 [M-g] 로 그 교훈을 이미 한 번 갚았다).
       ⚠ 화면 **한 장**이다 — 스윕을 한 벌 더 돌지 않는다. */
    {
      const ctx = await browser.newContext({ viewport: FRAME_F, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        const before = await page.evaluate(COLLECT_MEDIA);
        const bv = MEDIA_VERDICT(before, TOL);
        const hit = await page.evaluate(() => {
          const app = document.getElementById('app');
          const c = [...app.querySelectorAll('canvas')].find((x) => { const r = x.getBoundingClientRect(); return r.width && r.height && x.width && x.height; });
          if (!c) return null;
          const r = c.getBoundingClientRect();
          /* **상자**를 누른다 — 배율이 아니다. 이 층의 표본은 transform 이 `none` 인 채로 어긋난 자리다. */
          c.style.width = r.width + 'px'; c.style.height = (r.height * 0.6) + 'px';
          return c.id || c.getAttribute('class') || '(익명)';
        });
        await page.waitForTimeout(150);
        const av = MEDIA_VERDICT(await page.evaluate(COLLECT_MEDIA), TOL);
        if (!hit) bad('[N-f] 되돌림 표본이 없다 — 1600 프레임의 02 메인에 잴 수 있는 캔버스가 한 자리도 없다');
        else if (bv.bad.length === 0 && av.bad.length > 0)
          ok(`[N-f] 제품 되돌림(1600) — 02 메인의 실제 캔버스 «${hit}» 상자를 **세로만** ×0.6 으로 누르면 `
            + `${bv.bad.length}행 → ${av.bad.length}행으로 빨개진다 ⇒ 이 절이 짧은 프레임의 제품에 정말 물려 있다`);
        else bad(`[N-f] 제품 되돌림(1600) 실패 — 주입 전 ${bv.bad.length}행 / 주입 후 ${av.bad.length}행 (표본 «${hit}»)`);
      } catch (e) { bad('[N-f] 제품 되돌림(1600) 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }

    /* ⓖ **29회차가 «다음 회차의 공짜 한 줄» 로 넘긴 셈** (§36-4 SVG 절).
       29회차는 합성 표본 2자리로 «상자 비로 재면 헛빨강» 을 세우고, **제품에서 몇 자리인지는
       안 셌다고 스스로 적었다.** 그 수를 여기서 찍는다 — 이것이 [M-e]/[N] 이 판정축을
       `preserveAspectRatio` 로 고른 것의 **제품 실측 근거**다(합성이 아니라). */
    {
      const ghost = (rs) => {
        const seen = new Map();
        for (const r of rs) {
          if (r.kind !== 'svg') continue;
          const k = (r.screen || '') + '|' + r.sel;
          if (seen.has(k)) continue;
          const boxR = r.w / r.h;
          seen.set(k, r.vb ? Math.abs(boxR / r.vb - 1) > TOL : Math.abs(boxR - 1) > TOL);
        }
        return { total: seen.size, ghost: [...seen.values()].filter(Boolean).length };
      };
      const gD = ghost(rowsM), gF = ghost(rowsMF);
      ok(`[N-g] 상자 비로 쟀으면 헛빨강이었을 제품 SVG — 2280 ${gD.ghost}/${gD.total}자리 · 1600 ${gF.ghost}/${gF.total}자리. `
        + `판정축이 \`preserveAspectRatio\` 라 실제 빨강은 0 이다 (29회차가 «안 셌다» 고 적어 넘긴 수 — [M-e] 의 합성 2자리에 대한 제품 대조군)`);
    }
  }

  /* ── [O] 31회차 — **매체 축 × 시간(한 주기)** ────────────────────────────────
     30회차는 열한째 프런티어(매체 축 × 프레임)를 닫으면서 다음 자리를 **이름까지 적어** 넘겼다(§37-8 ⓐ):
     «[I] 가 [A] 축에 대해 한 한 주기 위상 스윕을 이 층은 안 한다. 캔버스 상자를 애니메이션으로
       흔드는 자리가 생기면 두 프레임의 **한 점**만 보는 지금 자는 못 본다.»
     24회차 규율이 그것을 이 회차의 일로 만든다 — «자기 한계를 글로 넘긴 회차는 그 한계를 안 닫은 것이다.»

     ⚠ **이 절이 [I] 의 사본이 아닌 이유**(둘 다 위상을 못박지만 보는 층이 다르다):
        [I] 는 [A] 축 = **노드에 걸린 배율**이 키프레임 안에서 종횡이 갈리는 것을 본다.
        이 절은 **배율이 한 줄도 안 걸린 채** `width`/`height` 가 키프레임으로 움직여 **상자만** 흔들리고
        내용 좌표계(비트맵·viewBox·원본)는 그대로 있는 자리를 본다. 그 노드는 [A]·[I] 에게
        `transform:none` 이고 [M]·[N] 에게는 «가라앉은 한 점» 이라 **셋 다 초록**이다
        (`probe356r31` [2]·[4] 가 합성으로 실측: 한 점 0자리 ↔ 한 주기 1자리 · [A] 는 ratio 1).
     ⚠ **«한 점에서 0» 은 «한 주기에서 0» 의 근거가 못 된다** — 29·30회차가 되풀이한 규율의 시간 판이다.
     ⚑ **대표 화면으로 안 접었다.** 26회차 인계문은 «[G]·[I] 는 [A] 가 이미 도는 축의 다른 각도라
        접어도 된다» 고 적었고 28회차(작업 634)가 그 분류로 [G] 를 넓혔다. 이 절은 [M]·[N] 과 같은
        **전 화면** 커버리지를 갖는다 — 스윕에 얹으면 «evaluate 몇 번» 값이라 접을 이유가 없기 때문이다. */
  console.log('\n[O] 31회차 — 매체 축을 «한 주기» 로 잰다: 배율 없이 «상자만» 흔들려 어긋나는 층');
  {
    const okO = seenO.filter((s) => s.fold);
    const sum = (f) => okO.reduce((a, s) => a + f(s), 0);
    const rowsO = sum((s) => s.fold.rows);
    const pinnedO = sum((s) => s.pinned || 0);
    const movedO = sum((s) => s.fold.boxMoved);
    const restO = sum((s) => s.fold.restBad);
    const cycO = okO.reduce((a, s) => a.concat(s.fold.cycBad.map((x) => Object.assign({ screen: s.label }, x))), []);
    const animSelf = seenO.reduce((a, s) => a + (s.anim ? s.anim.self : 0), 0);
    const animAnc = seenO.reduce((a, s) => a + (s.anim ? s.anim.anc : 0), 0);
    const worst = okO.reduce((m, s) => (s.fold.maxDev > (m ? m.fold.maxDev : -1) ? s : m), null);

    /* ⓐ 전제 — 아무것도 못 본 자는 언제나 0건이다(11·21·26·29·30회차) */
    if (okO.length && rowsO && pinnedO)
      ok(`[O-a] 전제 — ${okO.length}/${SCREENS.length}화면 × 주기 ${R31.PHASES}칸 · 매체 ${rowsO}행 · 못박은 애니 노드 ${pinnedO}개`);
    else bad(`[O-a] 전제 실패 — 화면 ${okO.length} · 매체 ${rowsO}행 · 못박은 애니 노드 ${pinnedO} (0 이면 아래 초록은 전부 헛초록)`);

    /* ⓐ2 **무음 실패 감시** — [N-a2] 와 같은 규율의 시간 판. 위상을 열여섯 번 바꿨는데 상자가
       한 자리도 안 움직였으면 이 절은 **같은 순간을 열여섯 번 잰 것**이고 그 0 은 헛초록이다. */
    if (movedO > 0)
      ok(`[O-a2] 위상 사이에 상자가 실제로 움직인 매체 ${movedO}자리 — 이 절의 0 은 «한 점을 열여섯 번 잰 0» 이 아니다`);
    else bad('[O-a2] 위상을 옮겼는데 상자가 한 자리도 안 움직였다 — 못박기가 안 먹었거나 이 층에 흔들리는 매체가 없다 (헛초록 방지)');

    /* ⓐ2b ⚑ **커버리지를 부풀려 읽지 않는다** — 움직인 상자를 미는 것이 «배율» 이면 그 자리는
       [A]·[I] 도 보는 자리이고 이 절 «전용» 이 아니다. 지금 트리의 그 수를 갈라 적는다.
       ⚠ 이 항은 «전용 자리가 있어야 한다» 고 요구하지 않는다 — 0 이면 그 뜻은
          «이 층 전용 결함이 아직 **없다**» 이지 «자가 못 본다» 가 아니다(그 증명은 [O-e]·[O-f]). */
    const trFreeO = sum((s) => s.fold.boxMovedTrFree);
    ok(`[O-a2b] 움직인 상자 ${movedO}자리 중 **배율이 한 위상에서도 안 걸린** «이 절 전용» ${trFreeO}자리`
      + (trFreeO ? ` — 예: ${okO.flatMap((s) => s.fold.trFreeKeys).slice(0, 3).join(' · ')}` : ' — 지금 트리에서 상자를 미는 것은 전부 배율(스케일 프로퍼티)이라 [A]·[I] 와 겹친다. 이 절의 «전용» 0 은 «없어서 0» 이다'));

    /* ⓐ3 «0» 의 뜻을 가른다 — 애니메이션이 걸린 매체가 아예 0 이면 그 0 은 «없어서 0» 이다(27회차 규율) */
    if (animSelf + animAnc > 0)
      ok(`[O-a3] 애니메이션이 걸린 매체 ${animSelf + animAnc}자리(자신 ${animSelf} · 조상 ${animAnc}) — 이 축은 제품에 실재하는 자리를 훑는다`);
    else bad('[O-a3] 애니메이션이 걸린 매체 0자리 — 이 절의 0 은 «없어서 0» 이다. 그 사실을 초록으로 세지 마라');

    /* ⓑ 판정 — 지금 트리 */
    if (!cycO.length) ok(`[O-b] 주기 ${R31.PHASES}칸 어느 위상에도 매체 비균등 0자리 (한 점 ${restO}자리 · [M] 과 같은 0)`);
    else bad(`[O-b] 주기 안에서 비균등 ${cycO.length}자리: `
      + cycO.slice(0, 6).map((x) => `${x.screen} ${x.row.sel} d=${x.row.d} @위상 ${(x.at * 100).toFixed(0)}%`).join(' · '));

    /* ⓒ **이 절의 존재 이유** — «한 주기에서만» 어긋나는 자리. [N-c]·[F-c] 와 같은 규율:
       [O-b] 가 0 이면 정의상 0 이지만, 수를 따로 찍는 것이 이 절이 무엇을 위해 있는지를 말한다. */
    const onlyCyc = cycO.length - restO;
    if (onlyCyc <= 0) ok(`[O-c] «한 주기에서만» 어긋나는 매체 0자리 — [M]·[N] 의 한 점이 못 보는 시간 전용 결함이 없다`);
    else bad(`[O-c] «한 주기에서만» 어긋나는 매체 ${onlyCyc}자리 — [M]·[N] 이 구조적으로 못 보는 자리다`);

    /* ⓓ **문턱까지 얼마나 남았나** — 0/1 판정만 찍으면 «허용 오차 바로 아래» 와 «구조적으로 0» 이 같은 줄이 된다.
       ⚠ 이 수는 결함이 아니다. 최악 자리는 주인 승인 설계(121 지시 ⑥ 스쿼시·스트레치 `thBob`)일 수 있고
          [I] 가 그 자리에서 «소스 리터럴로 판정하면 주인 승인 설계를 결함이라 부르는 자가 된다» 고 못박았다.
          그래서 이 항은 **재서 적을 뿐 판정하지 않는다**. */
    if (worst)
      ok(`[O-d] 제품 최악 편차 ${worst.fold.maxDev.toFixed(4)} (허용 ${TOL} 의 ${(worst.fold.maxDev / TOL * 100).toFixed(0)}%) @«${worst.label}» — `
        + `문턱 아래이지만 0 이 아니다 ⇒ 이 축은 제품에서 실제로 움직인다 (판정 아님 · 스쿼시는 주인 승인 설계다)`);
    else bad('[O-d] 화면분 접기가 한 장도 안 남았다 — 위 초록의 근거가 없다');

    /* ⓔ **되돌림(합성)** — 이 자가 «시간 전용» 자리를 정말 보는가 + 음성항.
       ⚠ 이 항이 없으면 [O-b] 의 0 은 «위상을 바꿔도 아무것도 안 보는 자» 의 0 일 수 있다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 600, height: 500 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.setContent(R31.SYN_T);
        await page.waitForTimeout(150);
        await page.evaluate(PIN_PHASE, 0);
        const per = [];
        for (let k = 0; k < R31.PHASES; k++) {
          await page.evaluate(PIN_PHASE, k / R31.PHASES);
          per.push({ at: k / R31.PHASES, rows: await page.evaluate(COLLECT_MEDIA), tr: await page.evaluate(R31.MEDIA_TR) });
        }
        await page.evaluate(PIN_PHASE, null);
        const f = R31.foldScreen(per, TOL);
        const sq = f.cycBad.find((x) => x.key.indexOf('#cSq') >= 0);
        const prop = f.cycBad.find((x) => x.key.indexOf('#cProp') >= 0);
        if (sq && !f.restBad)
          ok(`[O-e] 되돌림 — 상자 «높이만» 흔들리는 캔버스(비트맵 200×100 고정): 한 점 ${f.restBad}자리 ↔ 한 주기 ${f.cycBad.length}자리 `
            + `(최악 d=${sq.row.d} @위상 ${(sq.at * 100).toFixed(0)}%) ⇒ [O-b] 의 0 은 «안 보는 자» 의 0 이 아니다`);
        else bad(`[O-e] 되돌림 실패 — 한 점 ${f.restBad} / 한 주기 ${f.cycBad.length} (시간 전용 자리를 못 본다)`);
        /* ⓔ3 ⚑ **접기 키의 함정** — 경로 문자열은 한 화면에서 유일하지 않다(`div.gem>img.cic` 는 카드마다 같다).
           순번 없이 «최소↔최대 상자» 를 접으면 **크기만 다른 쌍둥이가 «움직였다»** 가 된다
           (이 회차 1판이 13 재화 탭에서 «전용 4자리» 를 그렇게 만들어 냈고, 같은 노드를 위상별로 찍어 보니
            열여섯 칸 전부 79.91×79.91 로 한 번도 안 움직였다). 반사실 대조군을 같은 자의 깃발로 세운다. */
        {
          const naive = R31.foldScreen(per, TOL, { naiveKey: true });
          const dupF = f.movedKeys.filter((k) => k.indexOf('canvas.cd') >= 0);
          const dupN = naive.movedKeys.filter((k) => k.indexOf('canvas.cd') >= 0);
          if (!dupF.length && dupN.length)
            ok(`[O-e3] 접기 키 함정 — 크기만 다른 쌍둥이(같은 셀렉터)를 순번 키는 ${dupF.length}자리, `
              + `**순번 없는 키(반사실 대조군)는 ${dupN.length}자리**로 센다 ⇒ [O-a2]·[O-a2b] 의 수는 노드별 수다`);
          else bad(`[O-e3] 접기 키 함정이 안 막힌다 — 순번 키 ${dupF.length}자리 / 순번 없는 키 ${dupN.length}자리`);
        }

        if (!prop) ok('[O-e2] 음성항 — 종횡이 «같이» 흔들리는 상자는 어느 위상에도 안 빨개진다 (애니메이션이 걸렸다는 이유만으로는 결함이 아니다)');
        else bad(`[O-e2] 음성항 실패 — 멀쩡한 등방 애니메이션을 결함이라 부른다: d=${prop.row.d}`);
      } catch (e) { bad('[O-e] 합성 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }

    /* ⓕ **제품 되돌림** — [M-g]·[N-f] 와 같은 손이되 축이 시간이다.
       ⚠ 합성만으로 닫으면 «자는 사는데 **스윕에는** 안 물려 있다» 를 못 가른다(26회차 [J] 가 데인 자리).
       ⚠ 화면 **한 장**이다 — 스윕을 한 벌 더 돌지 않는다.
       주입은 **상자를 흔드는 키프레임**이다(배율이 아니다 — 이 층의 표본은 `transform:none` 인 채 어긋난 자리다).
       0%·100% 를 원래 높이로 두므로 **위상 0(= [M] 이 재는 그 점)에서는 여전히 초록**이어야 한다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        const hit = await page.evaluate(() => {
          const app = document.getElementById('app');
          const c = [...app.querySelectorAll('canvas')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 8 && r.height > 8 && x.width && x.height; });
          if (!c) return null;
          const r = c.getBoundingClientRect();
          const st = document.createElement('style');
          st.textContent = `@keyframes __o31box{0%,100%{height:${r.height}px}50%{height:${r.height * 0.55}px}}`;
          document.head.appendChild(st);
          c.style.width = r.width + 'px';
          c.style.animation = '__o31box 40s linear infinite';
          return c.id || c.getAttribute('class') || '(익명)';
        });
        await page.waitForTimeout(200);
        const per = [];
        await page.evaluate(PIN_PHASE, 0);
        for (let k = 0; k < R31.PHASES; k++) {
          await page.evaluate(PIN_PHASE, k / R31.PHASES);
          per.push({ at: k / R31.PHASES, rows: await page.evaluate(COLLECT_MEDIA), tr: await page.evaluate(R31.MEDIA_TR) });
        }
        await page.evaluate(PIN_PHASE, null);
        const f = R31.foldScreen(per, TOL);
        if (!hit) bad('[O-f] 되돌림 표본이 없다 — 02 메인에 잴 수 있는 캔버스가 한 자리도 없다');
        else if (!f.restBad && f.cycBad.length)
          ok(`[O-f] 제품 되돌림 — 02 메인의 실제 캔버스 «${hit}» **상자만** 흔드는 키프레임을 심으면 `
            + `한 점 ${f.restBad}자리(= [M] 은 여전히 초록) ↔ 한 주기 ${f.cycBad.length}자리로 갈린다 ⇒ 이 절이 제품 스윕에 정말 물려 있다`);
        else bad(`[O-f] 제품 되돌림 실패 — 한 점 ${f.restBad}자리 / 한 주기 ${f.cycBad.length}자리 (표본 «${hit}»)`);

        /* ⓕ2 «전용» 분류기도 같은 주입으로 문다 — 배율을 한 줄도 안 걸고 상자만 흔들었으니
           이 자리는 **`boxMovedTrFree` 로 세져야** 한다. 안 세지면 [O-a2b] 의 0 은 분류기가 눈먼 0 이다. */
        if (hit && f.boxMovedTrFree > 0)
          ok(`[O-f2] 같은 주입을 «이 절 전용»(배율 없이 움직인 상자) 으로도 ${f.boxMovedTrFree}자리 세었다 ⇒ [O-a2b] 의 분류기가 눈먼 0 을 찍는 자가 아니다`);
        else if (hit) bad(`[O-f2] 배율을 안 걸고 상자만 흔들었는데 «전용» 으로 0자리 — [O-a2b] 의 분류기가 이 갈래를 못 본다`);
      } catch (e) { bad('[O-f] 제품 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }
  }

  /* ── [P] 32회차 — **매체 축 × 시간 × 짧은 프레임**. 31회차 인계문 §38-8 의 «다음 자리 후보 ⓐ»:
        > [O] 는 2280 에서만 주기를 훑는다. [N] 이 프레임을 열었고 [O] 가 시간을 열었지만
        > **둘의 곱은 아직 아무도 안 봤다**.
     24회차 규율이 그것을 이 회차의 일로 만든다 — «자기 한계를 글로 넘긴 회차는 그 한계를 안 닫은 것이다.»

     ⚠ **이 절이 [N]·[O] 의 사본이 아닌 이유** — 셋이 보는 «어긋나는 순간» 이 다르다:
        [N] 은 짧은 프레임의 **가라앉은 한 점**, [O] 는 2280 의 **한 주기**,
        이 절은 **키프레임의 값 자체가 프레임에 매인 단위**(`vh`·`%`·`min()`)라
        «짧은 프레임 × 주기 한복판» 에서만 어긋나는 자리를 본다.
        그런 노드는 [O] 에게 «2280 에서는 내내 맞는 상자» 이고 [N] 에게 «0%/100% 위상의 한 점» 이라
        **둘 다 구조적으로 초록**이다(`probe356r32` [2]·[5] 가 합성으로 실측 —
        2280 한 주기 0자리 · 1600 한 점 0자리 ↔ **1600 한 주기 1자리** d=1.4156 @위상 50%).
     ⚠ **«2280 한 주기에서 0» 도 «1600 한 점에서 0» 도 이 절의 0 의 근거가 못 된다** —
        29·30·31회차가 되풀이한 규율(하나를 다른 하나의 근거로 인용하지 마라)의 **곱셈 판**이다.
     ⚑ 값은 «evaluate 몇 번» 이다 — 스윕이 이미 1600 으로 줄여 놓은 그 페이지에서 위상만 옮긴다. */
  console.log('\n[P] 32회차 — 매체 축 «한 주기» 를 짧은 프레임(1080×1600)에서도 훑는다: 키프레임 값이 프레임에 매인 층');
  {
    const okP = seenP.filter((s) => s.fold);
    const sumP = (f) => okP.reduce((a, s) => a + f(s), 0);
    const rowsPn = sumP((s) => s.fold.rows);
    const pinnedP = sumP((s) => s.pinned || 0);
    const movedP = sumP((s) => s.fold.boxMoved);
    const restP = sumP((s) => s.fold.restBad);
    const trFreeP = sumP((s) => s.fold.boxMovedTrFree);
    const cycP = okP.reduce((a, s) => a.concat(s.fold.cycBad.map((x) => Object.assign({ screen: s.label }, x))), []);
    const worstP = okP.reduce((m, s) => (s.fold.maxDev > (m ? m.fold.maxDev : -1) ? s : m), null);
    /* [O] 의 같은 화면 주기와 짝지어 «1600 주기에서만» 을 가른다 — 키는 «화면|셀렉터»(R31 규약) */
    const keyO = new Set(seenO.filter((s) => s.fold).flatMap((s) => s.fold.cycBad.map((x) => x.key)));
    const onlyShortP = cycP.filter((x) => !keyO.has(x.key));

    /* ⓐ 전제 — 아무것도 못 본 자는 언제나 0건이다(11·21·26·29·30·31회차) */
    if (okP.length && rowsPn && pinnedP)
      ok(`[P-a] 전제 — ${okP.length}/${SCREENS.length}화면 × 1600 프레임 × 주기 ${R31.PHASES}칸 · 매체 ${rowsPn}행 · 못박은 애니 노드 ${pinnedP}개`);
    else bad(`[P-a] 전제 실패 — 화면 ${okP.length} · 매체 ${rowsPn}행 · 못박은 애니 노드 ${pinnedP} (0 이면 아래 초록은 전부 헛초록)`);

    /* ⓐ2 **무음 실패 감시(시간)** — [O-a2] 와 같은 규율을 짧은 프레임에서 다시 세운다.
       위상을 열여섯 번 옮겼는데 1600 에서 상자가 한 자리도 안 움직였으면 이 절의 0 은
       «같은 순간을 열여섯 번 잰 0» 이다. */
    if (movedP > 0)
      ok(`[P-a2] 1600 에서 위상 사이에 상자가 실제로 움직인 매체 ${movedP}자리 — 이 절의 0 은 «한 점을 열여섯 번 잰 0» 이 아니다`);
    else bad('[P-a2] 1600 에서 위상을 옮겼는데 상자가 한 자리도 안 움직였다 — 못박기가 리사이즈 뒤에 안 먹었다 (헛초록 방지)');

    /* ⓐ3 **무음 실패 감시(프레임)** — [N-a2] 와 같은 자를 이 절의 문장으로 다시 읽는다.
       두 주기가 정말 «다른 프레임» 의 주기여야 [P-c] 의 차집합이 뜻을 갖는다. */
    {
      const pairMF = R30.pairUp(rowsM, rowsMF, TOL);
      if (pairMF.boxMoved.length > 0)
        ok(`[P-a3] 두 프레임에서 상자가 실제로 달라진 매체 ${pairMF.boxMoved.length}자리 — [O](2280 주기) 와 이 절(1600 주기)은 정말 다른 프레임의 수다`);
      else bad('[P-a3] 프레임 사이에 상자가 한 자리도 안 움직였다 — 두 주기가 같은 프레임의 수다 (헛초록 방지)');
    }

    /* ⓐ2b ⚑ **커버리지를 부풀려 읽지 않는다**([O-a2b] 와 같은 규율) — 상자를 미는 것이 배율이면
       그 자리는 [A]·[I] 도 보는 자리다. 0 이면 그 뜻은 «이 층 전용 결함이 아직 없다» 이지
       «자가 못 본다» 가 아니다(그 증명은 [P-e]·[P-f]). */
    ok(`[P-a2b] 1600 에서 움직인 상자 ${movedP}자리 중 **배율이 한 위상에서도 안 걸린** «이 절 전용» ${trFreeP}자리`
      + (trFreeP ? ` — 예: ${okP.flatMap((s) => s.fold.trFreeKeys).slice(0, 3).join(' · ')}` : ' — 지금 트리에서 1600 의 상자를 미는 것은 전부 배율(스케일 프로퍼티)이라 [A]·[I] 와 겹친다. 이 «전용» 0 은 «없어서 0» 이다'));

    /* ⓑ 판정 — 지금 트리 */
    if (!cycP.length) ok(`[P-b] 1600 프레임에서 주기 ${R31.PHASES}칸 어느 위상에도 매체 비균등 0자리 (1600 한 점 ${restP}자리 · [N] 과 같은 0)`);
    else bad(`[P-b] 1600 주기 안에서 비균등 ${cycP.length}자리: `
      + cycP.slice(0, 6).map((x) => `${x.screen} ${x.row.sel} d=${x.row.d} @위상 ${(x.at * 100).toFixed(0)}%`).join(' · '));

    /* ⓒ **이 절의 존재 이유** — «1600 한 주기에서만» 어긋나는 자리([O] 의 2280 주기가 못 보는 것).
       [N-c]·[O-c] 와 같은 규율: [P-b] 가 0 이면 정의상 0 이지만, 수를 따로 찍는 것이
       이 절이 무엇을 위해 있는지를 말한다. */
    if (!onlyShortP.length) ok(`[P-c] «1600 한 주기에서만» 어긋나는 매체 0자리 — [O] 의 2280 주기·[N] 의 1600 한 점이 못 보는 곱셈 전용 결함이 없다`);
    else bad(`[P-c] «1600 한 주기에서만» 어긋나는 매체 ${onlyShortP.length}자리 — [N]·[O] 가 구조적으로 못 보는 자리다: `
      + onlyShortP.slice(0, 4).map((x) => `${x.screen} ${x.row.sel} d=${x.row.d} @위상 ${(x.at * 100).toFixed(0)}%`).join(' · '));

    /* ⓓ **문턱까지 얼마나 남았나**([O-d] 와 같은 손) — 재서 적을 뿐 판정하지 않는다.
       [O-d] 와 나란히 읽으라고 두 수를 같은 줄에 적는다. */
    {
      const worstO = seenO.filter((s) => s.fold).reduce((m, s) => (s.fold.maxDev > (m ? m.fold.maxDev : -1) ? s : m), null);
      if (worstP)
        ok(`[P-d] 1600 주기 제품 최악 편차 ${worstP.fold.maxDev.toFixed(4)} (허용 ${TOL} 의 ${(worstP.fold.maxDev / TOL * 100).toFixed(0)}%) @«${worstP.label}»`
          + (worstO ? ` ↔ 2280 주기 최악 ${worstO.fold.maxDev.toFixed(4)} @«${worstO.label}»` : '')
          + ` — 문턱 아래이지만 0 이 아니다 ⇒ 이 축은 짧은 프레임에서도 실제로 움직인다 (판정 아님)`);
      else bad('[P-d] 1600 화면분 접기가 한 장도 안 남았다 — 위 초록의 근거가 없다');
    }

    /* ⓔ **되돌림(합성)** — 이 자가 «곱 전용» 자리를 정말 보는가 + 음성항.
       ⚠ 이 항이 없으면 [P-b] 의 0 은 «프레임을 줄이고 위상을 옮겨도 아무것도 안 보는 자» 의 0 일 수 있다.
       표본 ⓛ 은 키프레임 한복판이 `4.3859649vh` — 2280 에서는 정확히 100px 이라 **주기를 다 훑어도 초록**이고,
       1600 에서만 70.18px 로 어긋난다(비트맵 200×100 고정 · 배율은 한 줄도 안 걸린다). */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.setContent(R32.SYN_FT);
        await page.waitForTimeout(150);
        const sweepPhases = async () => {
          await page.evaluate(PIN_PHASE, 0);
          const per = [];
          for (let k = 0; k < R31.PHASES; k++) {
            await page.evaluate(PIN_PHASE, k / R31.PHASES);
            per.push({ at: k / R31.PHASES, rows: await page.evaluate(COLLECT_MEDIA), tr: await page.evaluate(R31.MEDIA_TR) });
          }
          await page.evaluate(PIN_PHASE, null);
          return R31.foldScreen(per, TOL);
        };
        const fTall = await sweepPhases();
        await page.setViewportSize(FRAME_F);
        await page.waitForTimeout(200);
        const fShort = await sweepPhases();
        const vhTall = fTall.cycBad.find((x) => x.key.indexOf('#cVhKf') >= 0);
        const vhShort = fShort.cycBad.find((x) => x.key.indexOf('#cVhKf') >= 0);
        const propShort = fShort.cycBad.find((x) => x.key.indexOf('#cProp') >= 0);
        if (!vhTall && !fShort.restBad && vhShort)
          ok(`[P-e] 되돌림 — 키프레임 값이 \`vh\` 인 캔버스(비트맵 200×100 고정): `
            + `2280 한 주기 ${fTall.cycBad.length}자리(= [O] 초록) · 1600 한 점 ${fShort.restBad}자리(= [N] 초록) `
            + `↔ **1600 한 주기 ${fShort.cycBad.length}자리** (최악 d=${vhShort.row.d} @위상 ${(vhShort.at * 100).toFixed(0)}%) `
            + `⇒ [P-b] 의 0 은 «안 보는 자» 의 0 이 아니다`);
        else bad(`[P-e] 되돌림 실패 — 2280 주기 ${fTall.cycBad.length}자리 / 1600 한 점 ${fShort.restBad}자리 / 1600 주기 ${fShort.cycBad.length}자리`);

        if (!propShort) ok('[P-e2] 음성항 — 짧은 프레임에서 종횡이 «같이» 흔들리는 상자는 어느 위상에도 안 빨개진다 (프레임에 매인 애니메이션이라는 이유만으로는 결함이 아니다)');
        else bad(`[P-e2] 음성항 실패 — 멀쩡한 등방 vh 애니메이션을 결함이라 부른다: d=${propShort.row.d}`);
      } catch (e) { bad('[P-e] 합성 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }

    /* ⓕ **제품 되돌림** — [O-f] 와 같은 손이되 축이 «시간 × 프레임» 이다.
       ⚠ 합성만으로 닫으면 «자는 사는데 **스윕에는** 안 물려 있다» 를 못 가른다(26회차 [J] 가 데인 자리).
       주입은 **프레임에 매인 키프레임**이다 — 한복판 높이를 `(H/2280 × 100)vh` 로 적으면
       2280 에서는 H 그대로(= [O] 초록)이고 1600 에서만 H×0.70 으로 눌린다. 0%·100% 는 H 라
       **1600 의 가라앉은 한 점도 초록**이다(= [N] 초록). 화면 **한 장**이다 — 스윕을 한 벌 더 돌지 않는다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        const hit = await page.evaluate(() => {
          const app = document.getElementById('app');
          const c = [...app.querySelectorAll('canvas')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 8 && r.height > 8 && x.width && x.height; });
          if (!c) return null;
          const r = c.getBoundingClientRect();
          const st = document.createElement('style');
          /* 한복판을 «2280 에서 정확히 지금 높이» 인 vh 로 적는다 — 프레임이 줄 때만 값이 갈린다 */
          st.textContent = `@keyframes __p32vh{0%,100%{height:${r.height}px}50%{height:${(r.height / 2280 * 100).toFixed(6)}vh}}`;
          document.head.appendChild(st);
          c.style.width = r.width + 'px';
          c.style.animation = '__p32vh 40s linear infinite';
          return c.id || c.getAttribute('class') || '(익명)';
        });
        await page.waitForTimeout(200);
        const sweepPhases = async () => {
          await page.evaluate(PIN_PHASE, 0);
          const per = [];
          for (let k = 0; k < R31.PHASES; k++) {
            await page.evaluate(PIN_PHASE, k / R31.PHASES);
            per.push({ at: k / R31.PHASES, rows: await page.evaluate(COLLECT_MEDIA), tr: await page.evaluate(R31.MEDIA_TR) });
          }
          await page.evaluate(PIN_PHASE, null);
          return R31.foldScreen(per, TOL);
        };
        const fTall = await sweepPhases();
        await page.setViewportSize(FRAME_F);
        await page.waitForTimeout(420);
        const fShort = await sweepPhases();
        if (!hit) bad('[P-f] 되돌림 표본이 없다 — 02 메인에 잴 수 있는 캔버스가 한 자리도 없다');
        else if (!fTall.cycBad.length && !fShort.restBad && fShort.cycBad.length)
          ok(`[P-f] 제품 되돌림 — 02 메인의 실제 캔버스 «${hit}» 에 **프레임에 매인 키프레임**을 심으면 `
            + `2280 한 주기 ${fTall.cycBad.length}자리(= [O] 는 여전히 초록) · 1600 한 점 ${fShort.restBad}자리(= [N] 도 초록) `
            + `↔ 1600 한 주기 ${fShort.cycBad.length}자리로 갈린다 ⇒ 이 절이 제품 스윕에 정말 물려 있다`);
        else bad(`[P-f] 제품 되돌림 실패 — 2280 주기 ${fTall.cycBad.length}자리 / 1600 한 점 ${fShort.restBad}자리 / 1600 주기 ${fShort.cycBad.length}자리 (표본 «${hit}»)`);

        /* ⓕ2 «전용» 분류기도 같은 주입으로 문다([O-f2] 와 같은 규율) — 배율을 한 줄도 안 걸었으니
           이 자리는 1600 에서 `boxMovedTrFree` 로 세져야 한다. 안 세지면 [P-a2b] 의 0 은 눈먼 0 이다. */
        if (hit && fShort.boxMovedTrFree > 0)
          ok(`[P-f2] 같은 주입을 1600 에서 «이 절 전용»(배율 없이 움직인 상자) 으로도 ${fShort.boxMovedTrFree}자리 세었다 ⇒ [P-a2b] 의 분류기가 눈먼 0 을 찍는 자가 아니다`);
        else if (hit) bad(`[P-f2] 배율을 안 걸고 상자만 흔들었는데 1600 «전용» 으로 0자리 — [P-a2b] 의 분류기가 이 갈래를 못 본다`);
      } catch (e) { bad('[P-f] 제품 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }
  }

  /* ── [Q] 33회차 — **매체 축 × 시간 × WAAPI**. 32회차 인계문 §39-8 의 «다음 자리 후보 ⓑ»:
        > `PIN` 은 **CSS 애니메이션**을 `animation-delay` 로 못박는다. `Element.animate()` 로 상자를
        > 흔드는 자리가 생기면 [O]·[P] **둘 다** 그 위상을 못 잡는다. **이제 그물이 넷이라 이 구멍이 제일 크다.**
     24회차 규율이 그것을 이 회차의 일로 만든다 — «자기 한계를 글로 넘긴 회차는 그 한계를 안 닫은 것이다.»

     ⚠ **이 절이 [O]·[P] 의 사본이 아닌 이유** — 넷이 보는 것은 같은 «상자 ↔ 비트맵» 이고
        갈리는 것은 **못박는 손**이다. [M]·[N]·[O]·[P] 는 전부 `PIN`(CSS) 하나에 매여 있어서
        `animationName:none` 인 노드에 대해서는 **열여섯 칸이 전부 «지금 이 순간»** 이다
        (`probe356r33` [2] 실측 — 같은 결함을 CSS 로 걸면 d=0.7006 으로 잡히는데
         WAAPI 로 걸면 최악 편차 0.0010 = 초록. 그 스윕이 본 구간은 주기의 **0.06%**).
     ⚑ **이것은 가정이 아니라 제품에 있는 매체다** — `jzPressTick`(621 «홀드 틱마다 원래 크기 ↔ 눌린 크기»)이
        `scale`·`translate` 를 WAAPI 로 걸고, 583·584 이후 그 버튼 **안에 화폐 아이콘**이 산다.
        지금 값은 등방(`scale:.94`)이라 결함이 아니다 — 이 절이 닫는 것은 **그물의 구멍**이다.
     ⚠ 제품의 WAAPI 두 자리는 둘 다 «누르는 동안» 만 산다 ⇒ **가라앉은 화면의 0 은 «없어서 0»** 이다.
        그래서 판정은 [Q-b] 가 **제품 자신의 함수로 틱을 깨워서** 한다(합성만으로 안 닫는다 · 26회차 [J] 규율). */
  console.log('\n[Q] 33회차 — 매체 축 «한 주기» 를 **WAAPI 로 도는 애니**에서도 훑는다: `PIN` 이 닿지 못하는 매체');
  {
    const okQ = seenQ.filter((s) => s.wa);
    const sumQ = (f) => okQ.reduce((a, s) => a + f(s), 0);
    const waRest = sumQ((s) => s.wa.inApp);
    const cssRest = sumQ((s) => s.wa.css);
    /* «상시 WAAPI 가 **매체를 품은** 자리» — 래칫이다. 하나라도 생기면 [O]·[P] 는 그 노드를
       구조적으로 못 보므로 이 축을 그 화면까지 넓혀야 한다(그때 이 항이 빨개진다). */
    const waMedia = okQ.flatMap((s) => (s.wa.wa || []).filter((w) => w.media > 0).map((w) => `${s.label} ${w.sel}(매체 ${w.media})`));

    /* ⓐ 전제 — 인구조사가 정말 돌았는가(아무것도 못 본 자는 언제나 0건이다 · 11·21·26·29~32회차) */
    if (okQ.length && cssRest)
      ok(`[Q-a] 전제 — ${okQ.length}/${SCREENS.length}화면에서 애니 인구조사가 돌았다 (CSS 애니 ${cssRest}개를 실제로 세었다) · `
        + `그중 **WAAPI 로 도는 것 ${waRest}개** — 이 저장소의 «.animate(» 두 자리(jzPressTick·fxHoldPump)는 «누르는 동안» 만 살아서 `
        + '가라앉은 화면에서는 0 이다. **이 0 은 «없어서 0» 이지 커버리지가 아니다**(근거는 [Q-b]·[Q-c]·[Q-d])');
    else bad(`[Q-a] 전제 실패 — 인구조사 화면 ${okQ.length}/${SCREENS.length} · CSS 애니 ${cssRest}개 (0 이면 아래 초록은 전부 헛초록)`);

    /* ⓐ2 래칫 — «상시 WAAPI + 그 안에 매체» 가 생기면 [O]·[P] 가 구조적으로 못 보는 자리가 생긴 것이다 */
    if (!waMedia.length) ok('[Q-a2] 상시(가라앉은 화면) WAAPI 애니가 매체를 품은 자리 0곳 — [O]·[P] 의 스윕이 «못박히지 않은 채» 읽는 아이콘이 지금은 없다');
    else bad(`[Q-a2] 상시 WAAPI 애니가 매체를 품은 자리 ${waMedia.length}곳 — [O]·[P] 는 이 노드의 위상을 못박지 못한다: ${waMedia.slice(0, 5).join(' · ')}`);

    /* ⓑ **판정** — 제품의 홀드 틱(621)을 **제품 자신의 함수로** 깨워 그 한 주기를 훑는다.
       ⚠ 합성 키프레임을 주입하지 않는다 — 주입으로만 닫으면 «자는 사는데 제품에는 안 물려 있다» 를 못 가른다. */
    {
      const PICKQ = ['23 훈련', '23 룬', '23 단련'];
      const HOST = 'button, .rbt, .tr-up, .ifbtn, .cbtn, [class*="btn"]';
      let woke = 0, pinnedQ = 0, movedQ = 0, mediaQ = 0, badQ = [], maxDevQ = 0, hostMedia = 0;
      for (const name of PICKQ) {
        const found = SCREENS.find((s) => s[0] === name);
        if (!found) continue;
        const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        try {
          await page.goto(URL, { waitUntil: 'load' });
          await page.waitForTimeout(600);
          for (const st of (found[1] || [])) { try { await STEP(page, st); } catch (_) {} await page.waitForTimeout(200); }
          await page.waitForTimeout(250);
          const w = await page.evaluate((s) => {
            const els = [...document.querySelectorAll(s)].filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && e.querySelectorAll('canvas, svg, img').length > 0;
            });
            let n = 0, m = 0;
            for (const el of els.slice(0, 4)) {
              if (typeof jzPressTick === 'function') { jzPressTick(el, 3000); n++; m += el.querySelectorAll('canvas, svg, img').length; }
            }
            return { woke: n, media: m };
          }, HOST);
          woke += w.woke; hostMedia += w.media;
          const arm = await R33.sweepCycle(page, name, 'wa');
          pinnedQ += arm.pinnedWa; movedQ += arm.fold.boxMoved; mediaQ += arm.fold.rows;
          maxDevQ = Math.max(maxDevQ, arm.fold.maxDev);
          badQ = badQ.concat(arm.cyc.bad.map((x) => Object.assign({ screen: name }, x)));
        } catch (e) { /* 화면 하나가 안 열려도 나머지는 본다 */ }
        await ctx.close();
      }
      if (!woke || !pinnedQ) bad(`[Q-b] 전제 실패 — 홀드 틱을 깨운 호스트 ${woke}개 · 못박은 WAAPI 애니 ${pinnedQ}개 (0 이면 아래 판정은 헛초록)`);
      else if (!movedQ) bad(`[Q-b] 못박기는 했는데 위상 사이에 상자가 한 자리도 안 움직였다 — 이 0 은 같은 순간을 ${R31.PHASES}번 잰 0 이다`);
      else if (badQ.length) bad(`[Q-b] WAAPI 한 주기 안에서 매체 비균등 ${badQ.length}자리: `
        + badQ.slice(0, 5).map((x) => `${x.screen} ${x.row.sel} d=${x.row.d} @위상 ${(x.at * 100).toFixed(0)}%`).join(' · '));
      else ok(`[Q-b] 제품 — 홀드 틱을 ${woke}자리에서 깨워(그 안의 매체 ${hostMedia}개) WAAPI 애니 ${pinnedQ}개를 못박고 주기 ${R31.PHASES}칸을 훑었다: `
        + `매체 ${mediaQ}행 · 위상 사이 상자 이동 ${movedQ}자리 · 비균등 **0자리** · 최악 편차 ${maxDevQ.toFixed(4)} `
        + `⇒ 621 의 눌림은 등방(scale 한 값)이라 이 0 은 «값이 옳아서 0» 이다`);
    }

    /* ⓒ **되돌림(합성)** — 같은 결함을 CSS 와 WAAPI 로 **나란히** 걸어 «못 보는 것이 결함의 모양이 아니라
       못박는 손» 임을 못박는다. ⓞ(WAAPI)·ⓟ(CSS) 는 값·길이가 한 글자도 안 다르다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.setContent(R33.SYN_WA);
        await page.waitForTimeout(200);
        const cssArm = await R33.sweepCycle(page, 'syn', 'css');
        const waArm = await R33.sweepCycle(page, 'syn', 'wa');
        const pick = (c, id) => c.bad.find((x) => x.key.indexOf('#' + id) >= 0);
        const seenAll = (c, id) => c.all.find((x) => x.key.indexOf('#' + id) >= 0);
        const missed = !pick(cssArm.cyc, 'cWaKf'), twin = pick(cssArm.cyc, 'cCssKf'), caught = pick(waArm.cyc, 'cWaKf');
        if (missed && twin && caught)
          ok(`[Q-c] 되돌림 — 같은 결함(한 축만 200→140px)을 CSS 로 걸면 [O]·[P] 의 손이 d=${twin.row.d} 로 잡는데 `
            + `WAAPI 로 걸면 최악 편차 ${seenAll(cssArm.cyc, 'cWaKf').dev.toFixed(4)} = 초록(그 스윕이 본 구간은 주기의 ${(cssArm.seenFrac * 100).toFixed(2)}%) `
            + `↔ \`PIN_WA\` 를 얹으면 같은 페이지·같은 수집기에서 d=${caught.row.d} @위상 ${(caught.at * 100).toFixed(0)}% 로 빨개진다 `
            + `⇒ [Q-b] 의 0 은 «안 보는 자» 의 0 이 아니다`);
        else bad(`[Q-c] 되돌림 실패 — WAAPI 놓침 ${missed} · CSS 쌍둥이 ${!!twin} · PIN_WA 로 잡힘 ${!!caught}`);

        const prop = pick(waArm.cyc, 'cWaProp'), propAll = seenAll(waArm.cyc, 'cWaProp');
        if (!prop && propAll)
          ok(`[Q-c2] 음성항 — WAAPI 로 «종횡을 같이» 미는 상자(제품 621 의 꼴)는 어느 위상에도 안 빨개진다 (최악 편차 ${propAll.dev.toFixed(4)}) `
            + `— «WAAPI 가 걸렸으니 뭐라도 어긋나겠지» 로 재면 이것이 헛빨강이 된다`);
        else bad(`[Q-c2] 음성항 실패 — 멀쩡한 등방 WAAPI 애니메이션을 결함이라 부른다: ${JSON.stringify(prop ? prop.row : null)}`);
      } catch (e) { bad('[Q-c] 합성 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }

    /* ⓓ **제품 되돌림** — [O-f]·[P-f] 와 같은 손이되 거는 매체가 WAAPI 다.
       02 메인의 **실제 캔버스**에 한 축만 미는 WAAPI 애니를 걸고, 두 팔([O]·[P] 의 손 ↔ 이 절의 손)로
       같은 페이지를 훑어 갈리는지 본다. ⓓ2 는 그 자리에서 **결정성**까지 못박는다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        const hit = await page.evaluate(() => {
          const app = document.getElementById('app');
          const c = [...app.querySelectorAll('canvas')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 8 && r.height > 8 && x.width && x.height; });
          if (!c) return null;
          const r = c.getBoundingClientRect();
          c.style.height = r.height + 'px';
          if (!c.id) c.id = '__q33';                      /* ⓓ2 가 «그 노드» 를 다시 집을 수 있게 */
          /* 한 축만 민다 — 배율은 한 줄도 안 걸고 상자만 흔든다([A]·[I] 는 구조적으로 못 본다) */
          c.animate([{ width: r.width + 'px' }, { width: (r.width * 0.7).toFixed(2) + 'px' }, { width: r.width + 'px' }],
            { duration: 200000, iterations: Infinity, easing: 'linear' });
          return c.id;
        });
        await page.waitForTimeout(200);
        const cssArm = await R33.sweepCycle(page, '02 메인', 'css');
        const waArm = await R33.sweepCycle(page, '02 메인', 'wa');
        if (!hit) bad('[Q-d] 되돌림 표본이 없다 — 02 메인에 잴 수 있는 캔버스가 한 자리도 없다');
        else if (!cssArm.cyc.bad.length && waArm.cyc.bad.length)
          ok(`[Q-d] 제품 되돌림 — 02 메인의 실제 캔버스 «${hit}» 에 **WAAPI 로 한 축만** 미는 애니를 걸면 `
            + `[O]·[P] 의 손으로는 ${cssArm.cyc.bad.length}자리(초록) ↔ 이 절의 손으로는 ${waArm.cyc.bad.length}자리 `
            + `(최악 d=${waArm.cyc.bad[0].row.d} @위상 ${(waArm.cyc.bad[0].at * 100).toFixed(0)}%) `
            + `⇒ 이 절이 합성에서만 사는 자가 아니라 **제품 화면에 정말 물려 있다**`);
        else bad(`[Q-d] 제품 되돌림 실패 — PIN 만 ${cssArm.cyc.bad.length}자리 / PIN+PIN_WA ${waArm.cyc.bad.length}자리 (표본 «${hit}»)`);

        /* ⓓ2 결정성 — 못박은 위상에서 두 번 읽으면 비트까지 같고, 풀어 주면 흐른다.
           안 그러면 이 절의 0 은 «흔들리는 0» 이고 [Q-b] 의 초록도 우연이다. */
        if (hit) {
          await page.evaluate(R33.PIN_WA, 0.5);
          const a1 = await page.evaluate(COLLECT_MEDIA);
          await page.waitForTimeout(260);
          const a2 = await page.evaluate(COLLECT_MEDIA);
          await page.evaluate(R33.PIN_WA, null);
          await page.waitForTimeout(300);
          const a3 = await page.evaluate(COLLECT_MEDIA);
          /* ⚠ «제일 큰 매체» 로 고르면 전투 캔버스(1080폭)를 집는다 — **주입한 그 노드**를 집어야 한다 */
          const g = (rowsArr) => rowsArr.find((r) => r.sel.indexOf('#' + hit) >= 0) || null;
          const w1 = g(a1), w2 = g(a2), w3 = g(a3);
          const same = w1 && w2 && Math.abs(w1.w - w2.w) < 0.01;
          const flowed = w3 && w2 && Math.abs(w3.w - w2.w) > 0.01;
          if (same && flowed) ok(`[Q-d2] 결정성 — 못박은 채 260ms 뒤 다시 읽어도 같은 값(${w1.w}px)이고, 풀어 주면 300ms 만에 ${w3.w}px 로 흐른다 ⇒ 못박기가 실제로 시간을 세운다`);
          else bad(`[Q-d2] 결정성 실패 — 못박음 ${w1 && w1.w} → ${w2 && w2.w} · 푼 뒤 ${w3 && w3.w}`);
        }
      } catch (e) { bad('[Q-d] 제품 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }
  }

  /* ── [R] 34회차 — **매체 축 × 시간 × 전이(`transition`)**. 33회차 인계문 §40-8 의 «다음 자리 후보 ⓒ»:
        > 전이 — 키프레임이 아니라 **상태 전환 도중**의 상자. `PIN` 의 손잡이(`animation-delay`)가 안 닿고,
        > `PIN_WA` 도 `CSSTransition` 을 **일부러 걸러 낸다**. **31·32·33 세 회차에서 이월된 항이고,
        > 이제 이것이 남은 구멍 중 제일 크다.**
     24회차 규율이 그것을 이 회차의 일로 만든다 — «자기 한계를 글로 넘긴 회차는 그 한계를 안 닫은 것이다.»

     ⚠ **이 절이 [O]·[P]·[Q] 의 사본이 아닌 이유** — 다섯이 보는 것은 같은 «상자 ↔ 비트맵» 이고
        갈리는 것은 **못박는 손**이다. 이제 손이 셋인데 셋 다 자기 층만 본다:
          `PIN`(CSSAnimation) · `PIN_WA`(WAAPI · CSSTransition 을 걸러 냄) · **`PIN_TR`(CSSTransition)**.
        `probe356r34` [2] 실측 — **같은 램프**(200→140px)를 CSS 애니로 걸면 d=0.7182 로 잡히는데
        전이로 걸면 최악 편차 **0.0004 = 초록**이고, 그 스윕이 램프에서 본 구간은 **0.06%** 다.
     ⚑ **이것은 가정이 아니라 제품에 있는 층이다** — 상자를 미는 전이가 두 벌이고 둘 다 아이콘의 **조상**이다:
        `.jz-dn{scale:.94;translate:0 8px;transition:scale .06s,translate .06s}`(60 쥬시 누름 · index.html 13929) ·
        `.tr-rn,.tr-tp{transition:scale .07s,translate .07s}`(23 훈련·룬 카드 · 13956).
        지금 값은 등방(`scale` 한 값)이라 결함이 아니다 — 이 절이 닫는 것은 **그물의 구멍**이다.
     ⚠ 전이는 «상태가 바뀌는 동안» 만 산다 ⇒ **가라앉은 화면의 0 은 «없어서 0»** 이다.
        그래서 판정은 [R-b] 가 **제품 자신의 경로로 누름을 만들어서** 한다(`pointerdown` 을 실제로 쏜다 —
        `#app` 캡처 리스너가 `.jz-dn` 을 건다 · 합성 클래스를 손으로 붙이지 않는다 · 26회차 [J] 규율). */
  console.log('\n[R] 34회차 — 매체 축 «한 램프» 를 **전이 도중**에서도 훑는다: `PIN` 도 `PIN_WA` 도 안 닿는 층');
  {
    const okR = seenR.filter((s) => s.tr);
    const sumR = (f) => okR.reduce((a, s) => a + f(s), 0);
    const trRest = sumR((s) => s.tr.inApp);
    const cssRest = sumR((s) => s.tr.css);
    /* «상시 전이가 **매체를 품은** 자리» — 래칫이다. 하나라도 생기면 [O]·[P]·[Q] 는 그 노드를
       구조적으로 못 보므로 이 축을 그 화면까지 넓혀야 한다(그때 이 항이 빨개진다). */
    const trMedia = okR.flatMap((s) => (s.tr.tr || []).filter((w) => w.media > 0).map((w) => `${s.label} ${w.sel}(매체 ${w.media})`));

    /* ⓐ 전제 — 인구조사가 정말 돌았는가(아무것도 못 본 자는 언제나 0건이다 · 11·21·26·29~33회차) */
    if (okR.length && cssRest)
      ok(`[R-a] 전제 — ${okR.length}/${SCREENS.length}화면에서 전이 인구조사가 돌았다 (같은 실행이 CSS 애니 ${cssRest}개를 세었다) · `
        + `그중 **전이 ${trRest}개** — 전이는 «상태가 바뀌는 동안» 만 살아서 가라앉은 화면에서는 0 이다. `
        + '**이 0 은 «없어서 0» 이지 커버리지가 아니다**(근거는 [R-b]·[R-c]·[R-d])');
    else bad(`[R-a] 전제 실패 — 인구조사 화면 ${okR.length}/${SCREENS.length} · CSS 애니 ${cssRest}개 (0 이면 아래 초록은 전부 헛초록)`);

    /* ⓐ2 래칫 — «상시 전이 + 그 안에 매체» 가 생기면 앞의 세 손이 구조적으로 못 보는 자리가 생긴 것이다 */
    if (!trMedia.length) ok('[R-a2] 상시(가라앉은 화면) 전이가 매체를 품은 자리 0곳 — [O]·[P]·[Q] 의 스윕이 «못박히지 않은 채» 읽는 아이콘이 지금은 없다');
    else bad(`[R-a2] 상시 전이가 매체를 품은 자리 ${trMedia.length}곳 — 앞의 세 손은 이 노드의 위상을 못박지 못한다: ${trMedia.slice(0, 5).join(' · ')}`);

    /* ⓑ **판정** — 제품의 누름(60 쥬시)을 **제품 자신의 경로로** 만들어 그 한 램프를 훑는다.
       ⚠ 60~70ms 짜리라 «깨우기 → 못박기» 를 한 태스크 안에서 한다(`R34.wakeAndPin` 의 이유). */
    {
      const PICKR = ['02 메인', '23 훈련', '23 룬', '10 상점'];
      let woke = 0, born = 0, pinnedR = 0, movedR = 0, mediaR = 0, badR = [], maxDevR = 0, hostMedia = 0, hosts = 0;
      for (const name of PICKR) {
        const found = SCREENS.find((s) => s[0] === name);
        if (!found) continue;
        const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        try {
          await page.goto(URL, { waitUntil: 'load' });
          await page.waitForTimeout(600);
          for (const st of (found[1] || [])) { try { await STEP(page, st); } catch (_) {} await page.waitForTimeout(200); }
          await page.waitForTimeout(250);
          /* ⚑ 손을 두 벌로 안 적는다 — `PIN_TR`·`WAKE_PRESS` 의 **원본**을 페이지에 심고 한 태스크에서 부른다.
             ⚠ 한 번에 **하나만** 누른다: 60 쥬시는 한 손가락짜리라(`jzRelease()`) 넷을 누르면
                앞의 셋이 취소되고 마지막 하나만 남는다(`probe356r34` 1판이 그 사실을 찍었다). */
          await page.evaluate(([ps, ws]) => {
            window.__r34pinTr = eval('(' + ps + ')');
            window.__r34wake = eval('(' + ws + ')');
          }, [R34.PIN_TR.toString(), R34.WAKE_PRESS.toString()]);
          const w = await page.evaluate(() => {
            const o = window.__r34wake(1);
            o.atBirth = window.__r34pinTr(0);
            return o;
          });
          const cen = await page.evaluate(R34.TR_CENSUS);
          hosts += w.hosts; woke += w.woke; born += cen.inApp;
          hostMedia += (cen.tr || []).reduce((a, t) => a + t.media, 0);
          const arm = await R34.sweepCycle(page, name, 'tr');
          pinnedR += arm.pinnedTr; movedR += arm.fold.boxMoved; mediaR += arm.fold.rows;
          maxDevR = Math.max(maxDevR, arm.fold.maxDev);
          badR = badR.concat(arm.cyc.bad.map((x) => Object.assign({ screen: name }, x)));
          try { await page.evaluate(R34.RELEASE_PRESS); } catch (_) {}
        } catch (e) { /* 화면 하나가 안 열려도 나머지는 본다 */ }
        await ctx.close();
      }
      if (!woke || !born) bad(`[R-b] 전제 실패 — 누른 호스트 ${woke}개(후보 ${hosts}) · 태어난 전이 ${born}개 (0 이면 아래 판정은 헛초록)`);
      else if (!pinnedR) bad(`[R-b] 전이는 태어났는데(${born}개) 스윕이 한 개도 못박지 못했다 — 왕복 사이에 죽은 것이다(이 0 은 «안 재서 0» 이다)`);
      else if (!movedR) bad(`[R-b] 못박기는 했는데 위상 사이에 상자가 한 자리도 안 움직였다 — 이 0 은 같은 순간을 ${R31.PHASES}번 잰 0 이다`);
      else if (badR.length) bad(`[R-b] 전이 한 램프 안에서 매체 비균등 ${badR.length}자리: `
        + badR.slice(0, 5).map((x) => `${x.screen} ${x.row.sel} d=${x.row.d} @위상 ${(x.at * 100).toFixed(0)}%`).join(' · '));
      else ok(`[R-b] 제품 — 누름을 ${woke}자리에서 만들어(후보 ${hosts}곳 · 태어난 전이 ${born}개 · 그 안의 매체 ${hostMedia}개) `
        + `전이 ${pinnedR}개를 못박고 램프 ${R31.PHASES}칸을 훑었다: 매체 ${mediaR}행 · 위상 사이 상자 이동 ${movedR}자리 · `
        + `비균등 **0자리** · 최악 편차 ${maxDevR.toFixed(4)} ⇒ `
        + '`.jz-dn` 의 눌림은 등방(`scale` 한 값)이라 이 0 은 «값이 옳아서 0» 이다');
    }

    /* ⓒ **되돌림(합성)** — **같은 램프**를 CSS 애니와 전이로 **나란히** 걸어 «못 보는 것이 결함의 모양이 아니라
       못박는 손» 임을 못박는다(33회차 교훈 ②). ⓣ(전이)·ⓤ(CSS)는 값·길이·이징이 한 글자도 안 다르다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.setContent(R34.SYN_TR);
        await page.waitForTimeout(200);
        await page.evaluate(() => {
          document.getElementById('cTrKf').classList.add('go');
          document.getElementById('cTrIso').classList.add('go');
          void document.getElementById('app').offsetWidth;
        });
        await page.waitForTimeout(120);
        const oldArm = await R34.sweepCycle(page, 'syn', 'old');
        const trArm = await R34.sweepCycle(page, 'syn', 'tr');
        const pick = (c, id) => c.bad.find((x) => x.key.indexOf('#' + id) >= 0);
        const seenAll = (c, id) => c.all.find((x) => x.key.indexOf('#' + id) >= 0);
        const missed = !pick(oldArm.cyc, 'cTrKf'), twin = pick(oldArm.cyc, 'cCssKf'), caught = pick(trArm.cyc, 'cTrKf');
        if (missed && twin && caught)
          ok(`[R-c] 되돌림 — 같은 램프(한 축만 200→140px)를 CSS 애니로 걸면 [O]·[P]·[Q] 의 손이 d=${twin.row.d} 로 잡는데 `
            + `전이로 걸면 최악 편차 ${seenAll(oldArm.cyc, 'cTrKf').dev.toFixed(4)} = 초록(그 스윕이 본 구간은 램프의 ${(oldArm.seenFrac * 100).toFixed(2)}%) `
            + `↔ \`PIN_TR\` 을 얹으면 같은 페이지·같은 수집기에서 d=${caught.row.d} @위상 ${(caught.at * 100).toFixed(0)}% 로 빨개진다 `
            + `⇒ [R-b] 의 0 은 «안 보는 자» 의 0 이 아니다`);
        else bad(`[R-c] 되돌림 실패 — 전이 놓침 ${missed} · CSS 쌍둥이 ${!!twin} · PIN_TR 로 잡힘 ${!!caught}`);

        const iso = pick(trArm.cyc, 'cTrIso'), isoAll = seenAll(trArm.cyc, 'cTrIso');
        if (!iso && isoAll)
          ok(`[R-c2] 음성항 — 전이로 «종횡을 같이» 미는 상자(제품 \`.jz-dn\` 의 꼴)는 어느 위상에도 안 빨개진다 (최악 편차 ${isoAll.dev.toFixed(4)}) `
            + `— «전이가 걸렸으니 뭐라도 어긋나겠지» 로 재면 이것이 헛빨강이 된다`);
        else bad(`[R-c2] 음성항 실패 — 멀쩡한 등방 전이를 결함이라 부른다: ${JSON.stringify(iso ? iso.row : null)}`);
      } catch (e) { bad('[R-c] 합성 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }

    /* ⓓ **제품 되돌림** — [O-f]·[P-f]·[Q-d] 와 같은 손이되 거는 층이 전이다.
       02 메인의 **실제 캔버스**에 한 축만 미는 전이를 걸고, 두 팔(앞의 세 손 ↔ 이 절의 손)로
       같은 페이지를 훑어 갈리는지 본다. ⓓ2 는 그 자리에서 **결정성**까지 못박는다. */
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      try {
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        const hit = await page.evaluate(() => {
          const app = document.getElementById('app');
          const c = [...app.querySelectorAll('canvas')].find((x) => { const r = x.getBoundingClientRect(); return r.width > 8 && r.height > 8 && x.width && x.height; });
          if (!c) return null;
          const r = c.getBoundingClientRect();
          c.style.height = r.height + 'px';
          c.style.width = r.width + 'px';
          if (!c.id) c.id = '__r34';                      /* ⓓ2 가 «그 노드» 를 다시 집을 수 있게 */
          /* 한 축만 민다 — 배율은 한 줄도 안 걸고 상자만 흔든다([A]·[I] 는 구조적으로 못 본다).
             ⚠ 키프레임이 아니라 **전이**다: 선언을 먼저 얹고 스타일을 갱신한 뒤 값을 바꿔야 램프가 태어난다. */
          c.style.transition = 'width 200s linear';
          void getComputedStyle(c).width;
          c.style.width = (r.width * 0.7).toFixed(2) + 'px';
          void getComputedStyle(c).width;
          return c.id;
        });
        await page.waitForTimeout(200);
        const oldArm = await R34.sweepCycle(page, '02 메인', 'old');
        const trArm = await R34.sweepCycle(page, '02 메인', 'tr');
        if (!hit) bad('[R-d] 되돌림 표본이 없다 — 02 메인에 잴 수 있는 캔버스가 한 자리도 없다');
        else if (!oldArm.cyc.bad.length && trArm.cyc.bad.length)
          ok(`[R-d] 제품 되돌림 — 02 메인의 실제 캔버스 «${hit}» 에 **전이로 한 축만** 미는 램프를 걸면 `
            + `[O]·[P]·[Q] 의 손으로는 ${oldArm.cyc.bad.length}자리(초록) ↔ 이 절의 손으로는 ${trArm.cyc.bad.length}자리 `
            + `(최악 d=${trArm.cyc.bad[0].row.d} @위상 ${(trArm.cyc.bad[0].at * 100).toFixed(0)}%) `
            + `⇒ 이 절이 합성에서만 사는 자가 아니라 **제품 화면에 정말 물려 있다**`);
        else bad(`[R-d] 제품 되돌림 실패 — 앞의 손 ${oldArm.cyc.bad.length}자리 / +PIN_TR ${trArm.cyc.bad.length}자리 (표본 «${hit}»)`);

        /* ⓓ2 결정성 — 못박은 위상에서 두 번 읽으면 같고, 풀어 주면 흐른다.
           안 그러면 이 절의 0 은 «흔들리는 0» 이고 [R-b] 의 초록도 우연이다. */
        if (hit) {
          await page.evaluate(R34.PIN_TR, 0.5);
          const a1 = await page.evaluate(COLLECT_MEDIA);
          await page.waitForTimeout(260);
          const a2 = await page.evaluate(COLLECT_MEDIA);
          const g = (rowsArr) => rowsArr.find((r) => r.sel.indexOf('#' + hit) >= 0) || null;
          const w1 = g(a1), w2 = g(a2);
          /* 풀어 준 뒤 «흐르는가» 는 200초 램프로는 안 보인다(300ms 에 0.09px) ⇒ 짧은 램프를 하나 더 건다 */
          await page.evaluate(R34.PIN_TR, null);
          await page.evaluate((id) => {
            const c = document.getElementById(id);
            c.style.transition = 'width 1.2s linear';
            void getComputedStyle(c).width;
            c.style.width = (parseFloat(getComputedStyle(c).width) * 0.7).toFixed(2) + 'px';
          }, hit);
          await page.waitForTimeout(700);
          const a3 = await page.evaluate(COLLECT_MEDIA);
          const w3 = g(a3);
          const same = w1 && w2 && Math.abs(w1.w - w2.w) < 0.01;
          const flowed = w3 && w2 && Math.abs(w3.w - w2.w) > 1;
          if (same && flowed) ok(`[R-d2] 결정성 — 못박은 채 260ms 뒤 다시 읽어도 같은 값(${w1.w}px)이고, 풀고 짧은 램프를 걸면 700ms 만에 ${w3.w}px 로 흐른다 ⇒ 못박기가 실제로 시간을 세운다`);
          else bad(`[R-d2] 결정성 실패 — 못박음 ${w1 && w1.w} → ${w2 && w2.w} · 푼 뒤 ${w3 && w3.w}`);
        }
      } catch (e) { bad('[R-d] 제품 되돌림 실행 실패: ' + String(e.message || e).slice(0, 80)); }
      await ctx.close();
    }
  }

  await browser.close();
  const total = oks.length + fails.length;
  console.log(`\nVERIFY356 ${oks.length}/${total} ` + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
