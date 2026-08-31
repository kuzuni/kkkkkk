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
const fs = require('fs');
const path = require('path');
const { SCREENS, COLLECT, URL, derivePassScreens, HTML, STEP } = require('./scan356.js');

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

async function sweep(browser, inject) {
  const rows = [];
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
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
    } catch (e) { /* 화면 하나가 안 열려도 나머지는 본다 — 진입 실패는 smoke 의 몫이다 */ }
    await ctx.close();
  }
  return rows;
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
  const rows = await sweep(browser, null);
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
    const JUDGE_MIN = 180, RATCHET_CELLS = 67, RATCHET_SITES = 16;
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
      { sel: 'div#shopList>div.cn-wrap>div.cn-a2>div.gm>img.cic', cap: 2.6,
        why: '548 — 형제 가림 1px + 아트·AA 2px. 상자는 정수 96, 95·97 을 심어도 Δw +2.00px 로 불변(✗ 상자 아님)' },
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
      { sel: 'div#shopList>div.cn-wrap>div.cn-cd.alert>div.pn>em>img.cic', cap: 1.4,
        why: '548 — 래스터 1px(Δw −1.00px). 상자는 정수 120, 119·121 을 심어도 불변 · DSF3·4 에서 사라진다' },
      /* ↓ 596 이 뺀 `bgm-dia>.sp.tk`(cap 1.4)의 근거 — **기록으로 남긴다**(자리는 위 블록이 뺐다).
         548 §4-C — **Δw 가 0.47px 로 한 device 픽셀보다 작다** = 더 정확해질 자리가 없다.
         ⚠ 부모 `em` 이 `transform:scale(.8269)` 라 **선언 상자(60.4688) ≠ 그려지는 상자(50.0016)** 다 —
           `width:50px` 를 심으면 그려지는 상자가 41.35 가 되어 다른 것을 묻게 된다(548 §3).
           그려지는 상자를 49·50.0000 으로 맞춰도 편차는 한 자리도 안 움직였다.
         ⚠ 51 로 키우면 «초록» 이 되지만 그것은 수리가 아니라 **스코프 손실**이다
           (그 실행의 판정 12 → 7 · 가려짐 0 → 5 — 다섯 노드가 판정 밖으로 나갔다). */
      { sel: 'div#dunList>div.dnc.bgm-dia>div.sp.tk>em>img.cic', cap: 1.4,
        why: '548 — Δw +0.47px(1px 미만 = 자의 바닥). 그려지는 상자 50.0016 을 49·50.0000 으로 맞춰도 불변' },
      /* ── 356 12회차 — **새로 스코프에 들어온 두 자리**(SCREENS 48 → 56).
         둘 다 이 회차가 «처음 본» 자리이지 새로 생긴 결함이 아니다 — 그 화면들이 여태 스캔 밖이었다.
         ⚠ [S3] 은 **래스터**(소수 상자·페인트 스냅) 축이고 [A] 는 **선언된 변환** 축이다. 아래 첫 자리는
           12회차가 [A] 쪽을 역보정으로 닫은 바로 그 노드인데, 여기 남는 0.74% 는 그것과 다른 물음이다. */
      { sel: 'div.skd>div.sk-ct>div.vl>div.nt>b>img.cic', cap: 1.4,
        why: '356 12회차 — 08 세부 쿨타임 «다음 레벨» 칸(잉크 40×43 · +0.74%). 그 화면이 1~11회차 내내 스캔 밖이었다' },
      /* ⚠ **이 자리는 실행마다 나왔다 안 나왔다 한다** — 같은 트리·같은 DSF2 로 돌린 독립 두 실행이
         «칸 63 · 자리 18» ↔ «칸 67 · 자리 19» 로 갈렸고, 갈린 항이 정확히 이것 하나다.
         `#dgdIcon` 은 `openDunDetail()` 이 `curIcEl()` 로 채우는 슬롯이라 이미지가 그 프레임에 붙었는지에
         따라 «판정» 과 «가려짐» 사이를 오간다. 값 자체는 두 실행 다 −1.49% 로 같다(자리의 «유무» 만 흔들린다).
         ⇒ 이름표에는 올려 두되(안 올리면 나올 때마다 «등재 안 된 자리» 로 빨개진다) **흔들림은 **601** 로 등재돼 있다. */
      { sel: 'em#dgdIcon>img.cic', cap: 2.6,
        why: '356 12회차 — 04 던전 세부 보상 아이콘(잉크 132×134 · −1.49%). ⚠ 실행마다 판정↔가려짐을 오간다(601)' },
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
      else if (Math.abs(got[0] - f.box) > 0.01 || Math.abs(got[1] - f.box) > 0.01)
        bad(`[S3] ① ${f.lab} — 상자 ${got[0]}×${got[1]}, 기대 ${f.box} 정수 (소수 상자 1.08em 이 되살아났다)`);
      else ok(`[S3] ① ${f.lab} — 상자 ${f.box} 정수 고정`);
      await ctx.close();
    }

    /* ② 스윕이 실제로 돌았는가 — 헛초록 방지. 화면 진입 실패가 있으면 그 화면은 감시 밖이다(397 사고). */
    const R = await inkSweep({ dsf: 2 });
    if (R.errs.length) bad(`[S3] ② 스윕 — 화면 ${R.errs.length}개 진입 실패: ${R.errs.join(' / ')}`);
    else ok(`[S3] ② 스윕 — 화면 ${R.screens}개 전부 진입`);
    if (R.judged < JUDGE_MIN) bad(`[S3] ② 스윕 — 판정한 노드가 ${R.judged}개뿐(≥${JUDGE_MIN} 이어야 한다): 스코프가 줄었다`);
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
        if (measured.length !== capped.length)
          bad(`[S3] ③ 눈금 [전제] — 상한이 붙은 ${capped.length}자리 중 ${measured.length}자리만 이번 실행이 쟀다: ` +
            capped.filter((k) => !measured.some((m) => m.k === k)).map((k) => k.sel).join(' / ') +
            '\n        (자리가 판정 밖으로 나갔거나 dev 가 숫자가 아니다 — 그러면 위 «눈금» 은 볼 것이 없어 조용히 초록이다.\n' +
            '         자리를 실제로 닫았으면 KNOWN_SITES 에서 근거와 함께 빼고, 아니면 왜 안 나오는지부터 밝혀라)');
        else
          ok(`[S3] ③ 눈금 [전제] — 상한이 붙은 ${capped.length}자리를 이번 실행이 전부 쟀다 (판정 안 · dev 가 유한값)`);

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

  await browser.close();
  const total = oks.length + fails.length;
  console.log(`\nVERIFY356 ${oks.length}/${total} ` + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
