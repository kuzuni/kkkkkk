#!/usr/bin/env node
/* 작업 356 — «아이콘 원본 비율» 전수 스캐너 (측정 전용 · 판정은 verify356.js)
 *
 *   node tools/scan356.js              # 전 화면 순회 → 비균등 스케일 아이콘 목록
 *   node tools/scan356.js --json       # 기계 판독용
 *   node tools/scan356.js --all        # 아이콘이 아닌 노드(라벨 등)까지 같이 찍는다(대조용)
 *
 * 주인 지시(2026-08-29): «모든 아이콘들이 안 찌그러지게 — 원본 비율».
 * ⚠ 라벨(글자)의 scaleX 는 대상이 아니다. 그래서 이 스캐너의 본체는 «무엇이 아이콘인가» 를
 *   기계가 판정하는 부분이다 — 사람이 목록을 손으로 고르면 다음 세션이 그 목록을 못 잇는다.
 *
 * 아이콘 판정(하나라도 맞으면 아이콘):
 *   ⓐ IMG / CANVAS / SVG 노드
 *   ⓑ 자기 «직접» 텍스트가 그림문자(Extended_Pictographic)로만 이뤄진 노드 — 이모지 아이콘
 *   ⓒ 텍스트가 없고 자식이 ⓐ 하나뿐인 노드 — 이모지/SVG 를 감싼 자리
 * 라벨은 ⓑ 에서 한글·숫자·라틴 한 글자만 섞여도 곧바로 탈락한다.
 *
 * 스케일은 **조상까지 누적**해서 잰다 — 아이콘 자신은 등방인데 감싼 상자가 scaleX 를 걸면
 * 화면에 찍히는 것은 찌그러진 아이콘이다(A1 `.ti` · A2 `.si` 가 그 구조다).
 * 개별 `scale` 속성(transform 과 별개 프로퍼티)도 같이 읽는다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const HTML = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + HTML.replace(/\\/g, '/');
const JSON_OUT = process.argv.includes('--json');
const ALL = process.argv.includes('--all');
const TOL = Number(process.env.SCAN356_TOL || 0.02);   /* |sx/sy − 1| 허용치 */

/* ---------- 화면 목록 ----------
   smoke.js 오프너 목록과 같은 자리를 돈다. 단계는 «셀렉터를 페이지 안에서 찾아 누른다» 로 통일 —
   재렌더가 잦은 화면에서 resolve↔click 사이에 노드가 detach 되는 함정을 피한다(LESSONS 50-①). */
/* ⚑ 397 — 이 목록의 «무음 실패» 가 356 의 스코프 구멍이었다(2026-08-29).
   단계는 `querySelector(q); if (el) el.click()` 이라 **셀렉터가 안 맞으면 예외 없이 조용히 넘어간다.**
   그래서 «화면 이름은 있는데 한 번도 그 화면에 간 적이 없는» 줄이 넷 있었고
   (`[data-eqtab="eq"]`·`[data-eqtab="mate"]`·`#relTabs [data-reltab="rel"]`·`[data-opencoll]`
   — 넷 다 DOM 에 없는 이름이다), 그 줄들은 직전 화면을 두 번 센 것이었다.
   ⇒ `tools/probe397.js` 가 단계마다 resolved/moved 를 찍어 이것을 감시한다.
   **이 목록에 줄을 더할 때는 반드시 probe397 을 돌려 resolved=true 를 확인할 것.**
   그리고 «탭·서브탭을 갈아타야만 붙는 CSS»(`#psw.att …` 처럼)는 그 탭에 실제로 가야 보인다 —
   397 의 눌린 젬이 그 자리였다. */

/* ⚑ 443(2026-08-30) — **패스 탭 줄은 손으로 안 적는다. 마크업에서 파생한다**(402 «표가 아니라 id 파생»).
   397 이 이 목록을 손으로 채운 뒤 428(주인 지시)이 패스 탭을 «보물상자·시련의탑» →
   «시련의 탑·절망의 탑»(box → tower·tower2)으로 갈았는데, 여기 박아 둔
   `#psBar [data-ptab="box"]` 한 줄은 안 따라와 **다시 무음 실패**했다(verify356 [C] 92/93).
   = 397 이 고친 것은 «그때의 네 줄» 이지 «목록이 뒤처지는 구조» 가 아니었다.
   ⇒ `#psBar` 마크업의 `data-ptab` 을 읽어 탭 수만큼 줄을 만든다. 탭이 개명·신설·폐지돼도 따라온다.
   ⚠ **못 읽으면 조용히 빈 목록을 내지 않고 던진다** — 무음 실패를 «화면 0개» 라는 다른 무음으로
   갈아 끼우면 [B] 래칫이 헛초록이 된다(397 의 «직전 화면을 두 번 셌다» 와 같은 사고).
   ⚠ 라벨 글자는 renderPass() 가 PASS_TABS[].tab 으로 덮어쓰므로(210 «한 곳 규약») 화면 이름은
   읽기 편하라고 쓰는 것뿐이고, **자리를 정하는 것은 키(`data-ptab`)** 다. */
function derivePassScreens(src) {
  const bar = src.match(/id="psBar"[\s\S]*?<\/div>\s*<\/div>/);
  if (!bar) throw new Error('[scan356] index.html 에서 `#psBar` 마크업을 못 찾았다 — 패스 탭 화면을 파생할 수 없다');
  const tabs = [...bar[0].matchAll(/data-ptab="([^"]+)"[\s\S]*?<b><em>([^<]*)<\/em><\/b>/g)]
    .map((m) => ({ k: m[1], txt: m[2].trim() }));
  if (tabs.length < 2)
    throw new Error(`[scan356] \`#psBar\` 에서 파생한 탭이 ${tabs.length}개다 — 파생 규칙이 마크업과 어긋났다`);
  return tabs.map((t) => [`35 패스(${t.txt || t.k})`, ['#menub', '#psGo', `#psBar [data-ptab="${t.k}"]`]]);
}
const PASS_SCREENS = derivePassScreens(fs.readFileSync(HTML, 'utf8'));

/* ⚑ 12회차(2026-08-31) — 단계 종류를 하나 더 둔다: **`js:<식>`**.
   여태 단계는 «셀렉터를 눌러라» 하나뿐이었고, 그래서 **누를 수 있는 문이 없는 화면**은
   목록에 적을 방법 자체가 없었다 — 04 던전 세부(`#dgdw`)가 그 자리다: 03 카드의 [도전] 버튼은
   입장권이 0이면 `disabled`(27533) 라 부팅 세이브로는 눌리지 않는다. 1~11회차 내내
   «스캔 밖» 이었던 이유가 스코프 판단이 아니라 **자의 표현력**이었다.
   ⚠ 여기에 화면을 «그리는» 코드를 적지 마라 — **제품의 진입점만** 부른다(그리는 것은 제품이어야
     하고, 자가 그리면 그 화면은 제품이 깨져도 초록이다).
   ⚠ 던지면 `false` 를 돌려 [C]·스윕이 **무음 실패로 잡는다**(443 규율 — 조용한 초록 금지). */
const STEP = (page, q) => (q.startsWith('js:')
  ? page.evaluate((code) => { try { (0, eval)(code); return true; } catch (e) { return false; } }, q.slice(3))
  : page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, q));

const SCREENS = [
  ['02 메인', []],
  ['A1 탭바 열림', ['.tab[data-t="hero"]']],
  ['06 장비', ['.tab[data-t="hero"]', '#eqTabs .stab-c1']],
  ['07 스킬', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="sk"]']],
  ['50 코스튬', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]']],
  ['26 펫', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="pet"]']],
  ['23 훈련', ['.tab[data-t="grow"]']],
  ['23 룬', ['.tab[data-t="grow"]', '#trSubs [data-trsub="rune"]']],
  ['23 단련', ['.tab[data-t="grow"]', '#trSubs [data-trsub="temper"]']],
  ['03 던전', ['.tab[data-t="adv"]']],
  ['03 레이드', ['.tab[data-t="adv"]', '#dunSub [data-dsub="raid"]']],
  ['03 탑', ['.tab[data-t="adv"]', '#dunSub [data-dsub="tower"]']],
  ['89 유물', ['.tab[data-t="box"]']],
  ['10 상점', ['.tab[data-t="shop"]']],
  ['13 재화 탭', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="coin"]']],
  ['124 이용권 탭', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="pass"]']],
  ['52 메뉴', ['#menub']],
  ['53 우편', ['#menub', '#mnw [data-mn="mail"]']],
  ['54 랭킹', ['#menub', '#mnw [data-mn="rank"]']],
  ['55 설정', ['#menub', '#mnw [data-mn="conf"]']],
  ['56 가방', ['#menub', '#mnw [data-mn="bag"]']],
  /* ⚑ 397 — `#psw.att …` 규칙은 출석 탭에서만 붙는다. 그 탭이 스캔 밖이라 눌린 젬이 살아남았다.
     ⚑ 443 — 그 네 줄을 손으로 적는 대신 마크업에서 파생한다(위 derivePassScreens 주석).
     지금 파생값: 35 패스(스테이지) · 35 패스(시련의 탑) · 35 패스(절망의 탑) · 35 패스(출석) */
  ...PASS_SCREENS,
  ['70 출석', ['.side .ibtn[data-pop="attend"]']],
  ['29 룰렛', ['.side .ibtn[data-pop="roul"]']],
  ['22 퀘스트', ['.side .ibtn[data-pop="quest"]']],
  ['승급전', ['.side .ibtn[data-pop="promo"]']],
  ['21 도감(스킬)', ['.side .ibtn[data-pop="coll"]']],
  ['21 도감(무기)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="weapon"]']],
  ['21 도감(방패)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="shield"]']],
  ['21 도감(목걸이)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="amulet"]']],
  ['21 도감(펫)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="pet"]']],
  ['21 도감(유물)', ['.side .ibtn[data-pop="coll"]', '.cltab[data-ct="relic"]']],
  ['34 축복', ['.side .ibtn[data-pop="bless"]']],
  ['19 프로필', ['#profBtn']],
  ['20 스펙', ['#profBtn', '.pf-tgl>.lb']],
  ['33 재화 정보(골드)', ['[data-cur="gold"]']],
  ['33 재화 정보(다이아)', ['[data-cur="dia"]']],
  ['33 재화 정보(유물조각)', ['[data-cur="relic"]']],
  ['103 채팅', ['#botleft .ubtn[data-util="chat"]']],
  /* ⚑ 11회차(2026-08-31) — **스코프 구멍 여섯 자리.** 397(36 출석 패스)·443(패스 탭)·
     5회차(23 훈련)에 이어 **네 번째 같은 자리**다: 목록에 없는 화면은 [A]·[B]·[S3] 에게
     «0건» 이고, 그래서 «전 화면 0건» 이라는 이 작업의 결론이 그만큼 좁았다.
     후보를 고른 근거는 눈이 아니라 **같은 저장소의 다른 목록**이다 —
     351 오프너(`tools/cap351.js` SET1~SET3)는 **55화면**인데 여기는 42화면이었다.
     그 차집합을 `tools/probe356r11.js` 로 먼저 열어 재현했고(338 규칙),
     **56 절전에서 비균등 3노드**가 나왔다(⏱️ .706 · 💀 .862 · 배지 💀 1.19).
     ⚠ 05 장비 세부 세 슬롯은 `#wpnw` 한 껍데기를 공유해 **큰 상자 서명이 셋 다 같다** —
       진입 확인은 서명이 아니라 «부위별로 다른 내용»(아이콘 노드 수 76/78/78)이 한다. */
  ['05 장비 세부(무기)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="weapon"]']],
  ['05 장비 세부(방패)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="shield"]']],
  ['05 장비 세부(목걸이)', ['.tab[data-t="hero"]', '#eqCards [data-eqslot="amulet"]']],
  ['55 길라잡이', ['#menub', '#mnw [data-mn="guide"]']],
  ['56 절전', ['#menub', '#mnw [data-mn="saver"]']],
  ['22 퀘스트(반복)', ['.side .ibtn[data-pop="quest"]', '.qs-tg b[data-t="rep"]']],
  /* ⚑ 12회차(2026-08-31) — **스코프 구멍 여덟 자리, 다섯 번째 같은 사고.**
     11회차의 표본이던 «351 오프너와의 차집합» 은 이제 비었다(남은 `10-summon`·`22-daily` 는
     기본 탭이라 `10 상점`·`22 퀘스트` 줄과 같은 화면이고, `probe356r12` 가 둘 다 0건으로 확인했다).
     ⇒ 이번 표본은 **더 넓은 목록** 하나다 — `tools/smoke.js` 의 오프너 «우주».
        smoke 는 목록을 손으로 안 적고 DOM 속성에서 파생하므로(data-mn·data-cat·data-coshelp·
        data-rlhelp·#shopLegal …) 351(56화면)보다 넓고, 그중 **넷**이 여기 없었다:
        269 코스튬 도움말 · 429 유물 도움말 · 478 청약철회 둘.
     ⇒ 거기에 **«카드를 눌러야 열리는 세부 팝업» 넷**을 더한다(04 던전 세부 · 08 스킬/펫/코스튬 세부).
        세 목록(356·351·smoke) 어디에도 없던 자리이고, 아이콘이 가장 빽빽한 화면들이다.
     재현은 `tools/probe356r12.js` 가 먼저 했다(338 규칙) — 04 세부 화살표 2 · 08 코스튬 세부 1 = **3노드**.
     ⚠ 08 코스튬 카드는 «한 번 = 선택 · 두 번 = 세부» 라 같은 자리를 두 번 누른다(32653~32657). */
  ['04 던전 세부', ['.tab[data-t="adv"]', 'js:openDunDetail(DUNGEONS[0])']],
  ['08 스킬 세부', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="sk"]', '#bSk [data-skit]']],
  ['08 펫 세부', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="pet"]', '#bPet [data-ptit]']],
  ['08 코스튬 세부', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]', '#bCos [data-cosit]', '#bCos [data-cosit]']],
  ['50 코스튬 도움말(269)', ['.tab[data-t="hero"]', '#eqTabs [data-eqtab="cos"]', '#bCos [data-coshelp]']],
  ['89 유물 도움말(429)', ['.tab[data-t="box"]', '#relw [data-rlhelp]']],
  ['13 재화 청약철회(478)', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="coin"]', '#lgMore']],
  ['124 이용권 청약철회(478)', ['.tab[data-t="shop"]', '#shopCats .shp-ct[data-cat="pass"]', '#lgMore']],
  /* ⚑ 15회차(2026-08-31) — **스코프 구멍 여섯 자리, 여섯 번째 같은 사고.**
     12회차가 넘긴 프런티어를 그대로 잡았다: «오프너로 못 여는 화면» = **사건이 있어야 뜨는** 자리.
     여기 여섯은 «누를 문» 이 없어서 빠진 것이지 아이콘이 없어서 빠진 것이 아니다 —
     01 코인 · 09 강화 카드(이모지 + **펫 스프라이트 캔버스**) · 12 소환 결과 그리드 ·
     17 ⚔️ · 18 엠블럼/합성 아이콘 · 31 대표 재화 + 입장권. **아이콘이 가장 빽빽한 축**이었다.
     재현은 `tools/probe356r15.js` 가 먼저 했다(338 규칙) — 2280·1600 두 프레임에서 **4노드**
     (01 코인 `scaleY(.97)` · 17 `#stIc` `scaleX(.86)` · 18 불꽃 `scale(.82,.86)` · 18 묶음 `scale(.892,.885)`).
     ⚠ 단계는 전부 **제품의 진입점**이다(12회차 `js:` 규율 — 자가 화면을 그리지 않는다).
     ⚠ 09 는 `openUpAll(ups)` 가 **빈 배열에 false 를 돌려 조용히 안 연다** — 이 줄이 뒤처져
        빈 결과를 넘기게 되면 [C] 가 아니라 잉크가 0 이 되는 쪽으로 조용해진다. 표본은 스킬 3 + 펫 3
        (192 가 «펫이 섞인 결과» 를 고친 자리라 두 그림 출처를 **한 화면에서** 같이 밟는다). */
  ['01 오프라인 보상', ['js:offlineReward(Date.now() - 3600e3)']],
  ['09 일괄 강화 결과', ['js:openUpAll([].concat(SKILLS.slice(0,3), PETS.slice(0,3)).map(function(it){return {it:it, from:1, to:2};}))']],
  ['12 소환 결과', ['js:doSummonFree("skill", 10, true)']],
  ['17 스탯업 보너스', ['js:openStatUp({ ic:"⚔️", desc:"훈련 2 단계 달성! 모든 능력치 10% 증가" })']],
  ['18 패배', ['js:openDefeat()']],
  ['31 던전 클리어', ['js:openDunClear(DUNGEONS[0], 1, false, false)']],
  /* ⚑ 18회차(2026-08-31) — **«상태가 있어야 보이는 노드» 다섯 자리**(15회차 프런티어 소진).
     부팅 세이브는 우편 0통 · 던전 2해금 · 유물 0보유라 아래 노드들은 여태 «없는 노드» 였다:
     우편 보상 썸네일(MAIL_RW 4종 curIc) · 해금 던전 카드 알약 · 12 소환 결과의 **펫 캔버스**와
     장비 배너 그리드 · 89 유물 보유 칸 아트. 상태는 전부 **합법 세이브 + 제품 진입점**으로
     만든다(cap72 «--unlock» 선례 · 336 «값은 제품에게 묻는다»): 우편 4통은 sendMail(실제 생산자 ·
     통당 한 재화 = 한 화면에서 4 썸네일 전부), 던전 해금은 S.guide.idx + DUN_UI[].pre 층수,
     소환은 doSummonFree(보상 경유) · 유물은 던전 수입 범위의 S.relic + summonRelic(실제 경로) 8회.
     재현은 `tools/probe356r18.js` 가 먼저 했다(338 규칙) — 2280·1600 두 프레임 **비균등 0** =
     제품은 건강했고, 이 다섯 줄은 «앞으로도 0 인지» 를 래칫 [B] 밑에 두는 것이다. */
  /* ⚑ 19회차(2026-08-31) — 18회차가 «대표 표본» 이라고 **스스로 이름을 남긴** 상태 축 셋을 넓혔다:
     «배너 3종 중 무기만, 유물 8/전종, 우편 4재화/아이콘 우편(`m.ic`) 제외».
     재현은 `tools/probe356r19.js` 가 먼저 했다(338 규칙) — 2280·1600 두 프레임 **비균등 0** ·
     **귀속(그 상태가 만든 노드가 자에 들어온 수)** 방패 6 · 목걸이 6 · 유물 10 · 우편 10.
     ⚠ 우편은 **썸네일 종류가 둘**이라는 것이 이 회차의 관측이다 —
       재화 통은 `span.ml-i.ifr > img.cic`(media), 아이콘 통(`m.ic`)은 `span.ml-i.ifr` **자신이
       이모지 글리프**(emoji)다. 자의 `kind` 가 갈리는 자리라 18회차 표본은 한쪽만 밟고 있었다.
       아래 줄이 그 아이콘 통을 재화 통과 **같은 통에 섞어** 나란히 둔다.
     ⚠ 방패·목걸이는 무기와 **다른 아이콘 표**(EQUIPS.slot 별)를 그린다 — 배너가 갈리면 그림도 갈린다.
     ⚑ **20회차 정정** — 19회차는 아이콘 통을 **두 줄**(`🎫 ig:4` · `🎟️ ig:3`) 넣고 둘 다
       «34206 프리미엄 패스가 실제로 보내는 꼴» 이라고 적었다. 소스 전수(`probe356r20` [ⓐ] —
       `sendMail({… ic …})` 호출을 괄호 균형으로 잘라 센다)로는 **생산자가 index.html:34221 한 곳뿐**이고
       그 한 곳이 보내는 꼴도 **`ic:'🎫'` · `ig:4` 하나**다. 두 번째 줄은 제품이 **한 번도 안 보내는**
       값이었다 = 356 이 15회차부터 지켜 온 «합법 세이브 + 제품 진입점» 밖의 표본이라 걷어냈다.
       ⚠ 잃은 것이 없음은 같은 회차의 [ⓒ] 가 잰다 — `ig` 가 바꾸는 것은 `SUM_CARD` 의
       `--face`/`--rim`(색)뿐이고 아이콘 노드의 상자·transform·font-size 는 **등급과 무관**하다
       (12 결과 그리드 최저↔최고: 색은 `#7D5A44/#AC7B5B` → `#D1483F/#F0766A` 로 갈리는데
        기하는 두 프레임·두 등급 전부 `79.859×64 · none · 64px`). 즉 그 줄은 **같은 선택자의
       도달 불가능한 사본**이었지 새 자리가 아니다. */
  ['53 우편(보상 통)', ['js:sendMail({t:"📦 골드", g:12345});sendMail({t:"📦 다이아", c:678});'
    + 'sendMail({t:"📦 유물조각", r:90});sendMail({t:"📦 마일리지", m:3});'
    + 'sendMail({t:"🎫 프리미엄 패스 — 스테이지", ic:"🎫", iq:"프리미엄", ig:4});',
    '#menub', '#mnw [data-mn="mail"]']],
  ['03 던전(전량 해금)', ['js:S.guide.idx = 99;'
    + 'Object.keys(DUN_UI).forEach(function(id){ if(DUN_UI[id].pre) S.dun[id] = 1; });'
    + 'Object.values(DUN_UI).forEach(function(u){ if(u.pre) S.dun[u.pre.id] = (u.pre.f|0) + 1; });',
    '.tab[data-t="adv"]']],
  ['12 소환 결과(펫)', ['js:doSummonFree("pet", 10, true)']],
  ['12 소환 결과(무기)', ['js:doSummonFree("weapon", 10, true)']],
  ['12 소환 결과(방패)', ['js:doSummonFree("shield", 10, true)']],
  ['12 소환 결과(목걸이)', ['js:doSummonFree("amulet", 10, true)']],
  /* 19회차 — 8회 난수(18회차)는 RELICS **10종** 중 평균 5~6칸만 켠다(쿠폰 수집가).
     «전 10종이 켜질 때까지» 로 바꿔 보유 칸 아트를 전부 판정에 넣는다. 값은 상수로 박지 않고
     제품에게 묻고(`relicCost()`), 조각은 «모자라면 한 판 벌어 온다» 로 채운다(합법 세이브). */
  ['89 유물(전 10종 보유)', ['.tab[data-t="box"]',
    'js:for(var i=0;i<400 && !RELICS.every(function(r){return has(r.id);});i++){'
    + 'if(S.relic < relicCost()) S.relic += relicCost(); summonRelic(true); }']],
  /* ⚑ 21회차(2026-09-01) — **전투 HUD 두 화면. 스무 회차 동안 이 목록에 한 줄도 없었다.**
     비평가 BW·BX 가 **2인 독립으로 같은 자리**를 지목해 드러난 스코프 구멍이다:
     `#bossHp u`·`#dunBar u`(💀)에 `scale(1.122,.824)` = 종횡 **1.362** 가 살아 있었다.
     자가 못 본 이유는 판정식이 아니라 **문**이다 — 이 둘은 탭·사이드·메뉴 어느 것으로도 못 열고
     «전투를 시작해야» 뜬다(상단 HUD·탭바가 통째로 사라지는 유일한 상태라 15회차의 «사건이 있어야
     뜨는 화면» 여섯 곳에도 안 끼어 있었다).
     ⚠ 15·19·20회차가 프런티어를 «상태» 로 좁혀 읽은 대가가 이것이다 — 남은 것은 «같은 부품의
       다른 상태» 가 아니라 **«아예 다른 문으로만 열리는 화면»** 이었다.
     ⚠ 단계는 전부 제품 진입점이다(12회차 `js:` 규율) — `startRaid`·`challengeDungeon` 을 부른다.
       입장권·도전권은 세이브 값이라 따로 심는다(smoke.js 2-1 과 같은 손). */
  ['39 보스전 HUD(레이드)', ['js:S.daily.raid = RAID_TRY', 'js:startRaid(RAIDS[0])']],
  ['30 던전 런 HUD', ['js:S.dunTk[DUNGEONS[0].id] = 3', 'js:challengeDungeon(DUNGEONS[0])']],
  /* ⚑ 20회차(2026-08-31) — **줄을 한 줄도 안 더했다. 그것이 이 회차의 결론이다.**
     19회차 인계문이 남긴 프런티어는 «화면» 이 아니라 «같은 부품의 안 밟은 상태» 셋이었고,
     같은 인계문이 그 셋에 조건을 걸어 뒀다: «18·19회차처럼 «새 kind 가 나오는가» 를 먼저 물어라 —
     안 나오면 표본만 무거워지고 래칫만 오른다.» `tools/probe356r20.js` 가 그 물음이고,
     기준선을 **여기 SCREENS 에서 이름으로 꺼내** 나란히 재서(자를 두 벌로 안 적는다 — 13회차 [R12])
     세 축 전부 **새 kind 0 · 새 선택자 0** 이 나왔다:
       ⓐ 우편 `m.ic` «전 종류» — 소스 전수로 **생산자 1종**(위 정정). 이미 밟혀 있었다.
       ⓑ 09 일괄 강화 «목록» 축 — `UP_LISTS` 는 `{eq, sk, pet}` 셋이라 `#upCards` 에 **EQUIPS** 도
          들어오는데, 여기 줄은 `SKILLS+PETS` 뿐이라 «장비는 한 번도 안 밟았다» 로 읽혔다. 실측은
          그 반대다 — 장비 몫은 선택자 **3종**(`.upr-card>b` · `.upr-lv>em` · `>em>svg`)이고
          기준선 줄은 거기에 `b>canvas.pt-cv`(펫 스프라이트) 하나를 **더** 가진 **4종**이다.
          ⇒ 기준선이 장비 목록의 **상위집합**이라 줄을 더하면 노드만 18개 늘고 새 자리는 0이다.
       ⓒ 12 «최고 등급 칸» — 등급이 바꾸는 것은 색뿐이다(위 정정의 실측값). 356 축이 안 걸린다.
     ⇒ [S3] 래칫 여유(19회차 추기 «다시 2»)를 **한 칸도 안 썼다.** 다음 세션이 볼 것은
        LESSONS 356(20회차) ①②③ 과 `docs/review/356-아이콘원본비율.md` §28 «남은 프런티어» 다. */
];

/* ---------- 페이지 안에서 도는 수집기 ---------- */
const COLLECT = function (opt) {
  const PIC = /\p{Extended_Pictographic}/u;
  const app = document.getElementById('app');
  if (!app) return [];

  /* 자기 «직접» 텍스트만 — 자식 라벨의 글자가 섞이면 아이콘 판정이 무너진다 */
  function ownText(el) {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s;
  }
  function isMedia(el) {
    const t = el.tagName;
    return t === 'IMG' || t === 'CANVAS' || t === 'svg' || t === 'SVG';
  }
  function iconKind(el) {
    if (isMedia(el)) return 'media';
    const raw = ownText(el).replace(/[\s‍️︎]/g, '');
    if (raw) {
      /* 한 글자라도 그림문자가 아니면 라벨이다 */
      for (const ch of raw) if (!PIC.test(ch)) return null;
      return 'emoji';
    }
    /* 텍스트가 없고 미디어 자식 하나뿐인 상자 */
    const kids = [...el.children];
    if (kids.length === 1 && isMedia(kids[0]) && !ownText(el).trim()) return 'wrap';
    return null;
  }

  /* transform 문자열 + 개별 scale 프로퍼티에서 (sx, sy) 를 뽑는다 */
  function selfScale(cs) {
    let sx = 1, sy = 1, txt = '';
    const t = cs.transform;
    if (t && t !== 'none') {
      txt = t;
      const m = t.match(/^matrix\(([^)]+)\)/);
      const m3 = t.match(/^matrix3d\(([^)]+)\)/);
      if (m) {
        const v = m[1].split(',').map(Number);
        sx = Math.hypot(v[0], v[1]); sy = Math.hypot(v[2], v[3]);
      } else if (m3) {
        const v = m3[1].split(',').map(Number);
        sx = Math.hypot(v[0], v[1], v[2]); sy = Math.hypot(v[4], v[5], v[6]);
      }
    }
    const sc = cs.scale;
    if (sc && sc !== 'none') {
      const v = sc.trim().split(/\s+/).map(Number);
      if (v.length === 1) { sx *= v[0]; sy *= v[0]; }
      else { sx *= v[0]; sy *= v[1]; }
      txt += (txt ? ' + ' : '') + 'scale:' + sc;
    }
    return { sx, sy, txt };
  }

  function pathOf(el) {
    const out = [];
    let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s);
      e = e.parentElement;
    }
    return out.join('>');
  }

  const out = [];
  const all = app.querySelectorAll('*');
  for (const el of all) {
    const kind = iconKind(el);
    if (!kind && !opt.all) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;               /* 안 보이는 것은 안 센다 */
    /* 자기 + 조상 누적 */
    let sx = 1, sy = 1, own = '', chain = [];
    let e = el;
    while (e && e !== document.documentElement) {
      const cs = getComputedStyle(e);
      const s = selfScale(cs);
      if (Math.abs(s.sx - 1) > 1e-6 || Math.abs(s.sy - 1) > 1e-6) {
        sx *= s.sx; sy *= s.sy;
        chain.push(pathOf(e) + ' {' + s.txt + '}');
        if (e === el) own = s.txt;
      }
      e = e.parentElement;
    }
    if (sy === 0) continue;
    let ratio = sx / sy;
    /* ⚠ 이미지는 transform 이 등방이어도 «상자 종횡비 ≠ 원본 종횡비 + object-fit:fill» 이면
       그대로 찌그러진다(`.gem>.cic{width:58;height:47;object-fit:fill}` 가 그 자리였다).
       그래서 img 는 transform 비가 아니라 **화면 종횡비 ÷ 원본 종횡비**를 본다. */
    let imgNote = '';
    if (el.tagName === 'IMG' && el.naturalWidth && el.naturalHeight) {
      const fit = getComputedStyle(el).objectFit;
      if (fit === 'fill') {
        const shown = (r.width / r.height);
        const nat = (el.naturalWidth / el.naturalHeight);
        ratio = shown / nat;
        imgNote = `object-fit:fill · 원본 ${el.naturalWidth}×${el.naturalHeight}`;
      }
    }
    out.push({
      /* ⚠ SVG 노드의 `className` 은 문자열이 아니라 `SVGAnimatedString` 이라 `.slice` 가 없다.
         23 훈련의 ↑ 돌파 버튼(`#trUp`)이 SVG 라 이 한 줄이 그 화면 진입을 통째로 죽이고 있었다
         (5회차에 잡음 — 스캐너가 못 도는 화면은 래칫 [B] 의 감시 밖이다 = 헛초록). */
      kind, sel: pathOf(el), txt: (ownText(el).trim() || el.getAttribute('class') || '').slice(0, 12),
      sx: +sx.toFixed(4), sy: +sy.toFixed(4), ratio: +ratio.toFixed(4),
      own: own + (imgNote ? (own ? ' + ' : '') + imgNote : ''), chain,
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
    });
  }
  return out;
};

module.exports = { SCREENS, COLLECT, URL, TOL, derivePassScreens, PASS_SCREENS, HTML, STEP };

if (require.main !== module) return;

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  const errs = [];
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        /* ⚑ 443 — 안 맞는 셀렉터는 **조용히 넘어가지 않는다**. 예전에는 `if (el) el.click()` 이라
           그 줄이 직전 화면을 두 번 세고도 아무 표시가 없었다(397·443 이 같은 자리에서 두 번). */
        const found = await STEP(page, s);
        if (!found) errs.push(`${label}: 무음 실패 — '${s}' 가 DOM 에 없다(또는 던졌다)`);
        await page.waitForTimeout(420);
      }
      await page.waitForTimeout(250);
      const got = await page.evaluate(COLLECT, { all: ALL });
      for (const g of got) rows.push(Object.assign({ screen: label }, g));
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  await browser.close();

  /* 같은 자리가 화면마다 반복되므로 «선택자 + 비율» 로 접는다 */
  const bad = rows.filter((r) => Math.abs(r.ratio - 1) > TOL);
  const byKey = new Map();
  for (const r of bad) {
    const k = r.sel + '|' + r.ratio;
    if (!byKey.has(k)) byKey.set(k, Object.assign({}, r, { screens: new Set() }));
    byKey.get(k).screens.add(r.screen);
  }
  const list = [...byKey.values()].map((r) => {
    r.screens = [...r.screens];
    return r;
  }).sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));

  if (JSON_OUT) {
    console.log(JSON.stringify({ tol: TOL, scanned: rows.length, bad: bad.length, groups: list, errs }, null, 1));
  } else {
    console.log(`[scan356] 아이콘 노드 ${rows.length}개 관측 · 비균등(|sx/sy−1| > ${TOL}) ${bad.length}개 → ${list.length}자리`);
    for (const r of list) {
      const pct = ((r.ratio - 1) * 100).toFixed(1);
      console.log(`  ${r.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${r.kind}] ${r.sel}  «${r.txt}»  ${r.w}×${r.h}`);
      console.log(`      화면: ${r.screens.join(', ')}`);
      for (const c of r.chain) console.log(`      ← ${c}`);
    }
    if (errs.length) { console.log('\n[!] 화면 진입 실패'); errs.forEach((e) => console.log('  ' + e)); }
  }
  process.exit(0);
})();
