#!/usr/bin/env node
/* 351 캡처 — 화면마다 **9:19(1080×2280) 와 9:13.3(1080×1600) 을 «짝»으로** 찍는다.
 *
 * 실행: node tools/cap351.js [회차]      기본 r1 → docs/review/351-r1-<화면>-{2280,1600}.png
 *
 * 왜 짝인가(주인 보강 2026-08-29): 비평가에게 1600 한 장만 주면 «9:19 에도 있는 문제» 를
 * 1600 탓으로 적어 온다. 두 장을 같이 줘야 «1600 에서만 나빠진 것» 만 남는다.
 * 세로가 다르므로 **같은 배율(1:1)** 로 찍고, 비교는 y 좌표가 아니라 «무엇이 보이나» 로 한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const R = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/review');
const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();

/* 1회차 화면 — 프로브가 «1600 에서만 생긴 것» 을 찍은 자리 + 짧은 프레임에서 원리적으로
   제일 먼저 넘치는 자리(바닥 앵커 페이지·가장 키 큰 다이얼로그·바닥 시트).
   ROUND2(4회차, 2026-08-29) — 나머지 35 화면을 이어 붙였다. `--set r1|r2|all` 로 가른다.
   ⚠ `how` 는 `probe351.js` 의 오프너 라벨과 **같은 문자열**을 쓴다 — 자와 눈이 같은 화면을 봐야
   «자는 초록인데 사람은 감점» 을 그 자리에서 대조할 수 있다(3회차 08 장신구 칸이 그랬다). */
const SET1 = [
  { id: '34-bless', label: '34 축복 팝업', how: 'side:bless' },
  { id: '89-relic', label: '89 유물(보물상자 탭)', how: 'tab:box' },
  { id: '10-shop', label: '10 상점 탭', how: 'tab:shop' },
  { id: '08-hero', label: '08 영웅(장비 시트)', how: 'tab:hero' },
  { id: '03-adv', label: '03 모험(던전 카드)', how: 'tab:adv' },
  { id: '23-grow', label: '23 성장(훈련 시트)', how: 'tab:grow' },
  { id: '54-rank', label: '54 랭킹(바닥 앵커 3장)', how: 'menu:rank' },
  { id: '103-chat', label: '103 채팅(바닥 앵커 입력 바)', how: 'util:chat' },
  { id: '55-conf', label: '55 설정(가장 키 큰 다이얼로그)', how: 'menu:conf' },
  { id: '53-bag', label: '53 가방(가운데 다이얼로그)', how: 'menu:bag' },
];

/* 4회차 배치 — 남은 35 중 «세로로 제일 긴 것 / 바닥에 앵커된 것 / 시트» 12개를 먼저. */
const SET2 = [
  { id: '70-attend', label: '70 출석 팝업(카드 격자)', how: 'side:attend' },
  { id: '29-roul', label: '29 룰렛(원판 — 세로로 큰 블록)', how: 'side:roul' },
  { id: '22-quest', label: '22 퀘스트 팝업(목록)', how: 'side:quest' },
  { id: '54-promo', label: '승급전 팝업', how: 'side:promo' },
  { id: '21-coll', label: '21 도감 보너스 팝업', how: 'side:coll' },
  { id: '69-mail', label: '69 우편함', how: 'menu:mail' },
  { id: '35-pass', label: '35 패스(가장 요소 많은 페이지)', how: 'pass:35' },
  { id: '06-eqsk', label: '08 영웅 → 스킬 시트', how: 'eqtab:sk' },
  { id: '06-eqcos', label: '08 영웅 → 코스튬 시트', how: 'eqtab:cos' },
  { id: '06-eqpet', label: '08 영웅 → 펫 시트', how: 'eqtab:pet' },
  { id: '30-tower', label: '03 모험 → 탑 서브탭', how: 'dunsub:tower' },
  { id: '19-prof', label: '19 프로필 팝업', how: 'prof:19' },
];

/* 5회차 이후로 남는 23 화면 — 여기 적어 두는 것까지가 4회차의 범위다(다음 세션이 목록을 다시 안 짜게). */
const SET3 = [
  { id: '00-menu', label: '메뉴 시트', how: 'menu' },
  { id: '56-saver', label: '56 절약 모드', how: 'saver:56' },
  { id: '55-guide', label: '가이드', how: 'menu:guide' },
  { id: '20-spec', label: '20 프로필 스펙', how: 'prof:20-스펙' },
  { id: '13-gold', label: '13 재화(골드)', how: 'cur:gold' },
  { id: '13-dia', label: '13 재화(다이아)', how: 'cur:dia' },
  { id: '13-relic', label: '13 재화(유물조각)', how: 'cur:relic' },
  { id: '30-raid', label: '03 모험 → 레이드', how: 'dunsub:raid' },
  { id: '30-dun', label: '03 모험 → 던전', how: 'dunsub:dun' },
  { id: '23-train', label: '23 성장 → 훈련', how: 'trsub:train' },
  { id: '23-rune', label: '23 성장 → 룬', how: 'trsub:rune' },
  { id: '23-temper', label: '23 성장 → 단련', how: 'trsub:temper' },
  { id: '10-summon', label: '10 상점 → 소환', how: 'shopcat:summon' },
  { id: '10-coin', label: '10 상점 → 재화', how: 'shopcat:coin' },
  { id: '10-pass', label: '10 상점 → 패스', how: 'shopcat:pass' },
  { id: '22-daily', label: '22 퀘스트 → 일일', how: 'qtab:daily' },
  { id: '22-rep', label: '22 퀘스트 → 반복', how: 'qtab:rep' },
  { id: '35-pstage', label: '35 패스 → 스테이지', how: 'ptab:stage' },
  /* 12회차(2026-08-30) — 428 이 «보물상자 · 시련의탑» 을 «시련의 탑 · 절망의 탑» 으로 갈면서
     `ptab:box` 는 **죽은 이름**이 됐다(눌리는 것이 없어 스테이지 탭이 «상자 탭» 으로 찍혔다 —
     r12 첫 실행이 «35-pstage 와 같은 서명» 으로 그것을 잡았다). `tower2` 는 새로 생긴 탭이고
     **자·눈이 한 번도 본 적이 없다.** 이름을 제품과 맞춘다(라벨 글자는 `PASS_TABS[].tab` 이 소유). */
  { id: '35-ptower', label: '35 패스 → 시련의 탑', how: 'ptab:tower' },
  { id: '35-ptower2', label: '35 패스 → 절망의 탑', how: 'ptab:tower2' },
  { id: '35-patt', label: '35 패스 → 출석', how: 'ptab:att' },
  /* ⚑ 13회차(2026-08-30) — `89-collall`(«21 도감(보물상자 경유)», `how: 'coll21'`)을 **지웠다**:
     그 경로의 문(`[data-opencoll]`)이 제품에서 사라져 이 줄은 89 유물 페이지를 도감이라 부르며
     찍고 있었고, 문을 살아 있는 것으로 바꾸면 `21-coll`(`side:coll`)과 **같은 화면**이 된다.
     대신 그동안 **한 번도 찍힌 적이 없는 카테고리 탭 다섯 칸**을 세운다(기본 탭 «무기» 는
     `21-coll` 이 이미 찍는다 — 자·눈이 같은 화면을 보게 라벨을 `probe351` 오프너와 맞춘다). */
  { id: '21-clskill', label: '21 도감 → 스킬', how: 'colltab:skill' },
  { id: '21-clshield', label: '21 도감 → 방패', how: 'colltab:shield' },
  { id: '21-clamulet', label: '21 도감 → 목걸이', how: 'colltab:amulet' },
  { id: '21-clpet', label: '21 도감 → 펫', how: 'colltab:pet' },
  { id: '21-clrelic', label: '21 도감 → 유물', how: 'colltab:relic' },
  { id: '10-cart', label: '10 상점(장바구니 잉크 D3 자리)', how: 'tab:shop' },
  /* ⚑ 14회차(2026-08-30) — `probe351lib` 이 `#eqCards [data-eqslot]` 을 **08 영웅 시트를 열기 전에**
     물어(빈 그릇이라 언제나 `[]`) `eqslot:*` 오프너가 한 번도 만들어진 적이 없었다 = 이 세 화면
     (부위 슬롯이 여는 **05 장비 세부 팝업 `#wpnw`**)을 자도 눈도 1~13회차 내내 본 적이 없다.
     `drive()` 의 `kind === 'eqslot'` 갈래는 141행에 처음부터 있었다 — 부를 일이 없었을 뿐이다.
     라벨은 `probe351` 오프너 문자열과 맞춘다(자·눈이 같은 화면을 봐야 대조가 선다). */
  { id: '05-eqweapon', label: '05 장비 세부(무기 슬롯)', how: 'eqslot:weapon' },
  { id: '05-eqshield', label: '05 장비 세부(방패 슬롯)', how: 'eqslot:shield' },
  { id: '05-eqamulet', label: '05 장비 세부(목걸이 슬롯)', how: 'eqslot:amulet' },
];

/* ⚑ 19회차(2026-08-31) — **`smoke.js` 는 열고 351 은 안 열던 화면들.** 18회차가 «오프너 54화면
   전부 통과» 로 루프를 닫은 그 트리에서 smoke 는 66개를 연다. 차이 12개가 통째로 스캔 밖이었고,
   그중 셋은 **팝업이 신설된 지 하루가 지난 것**(429 유물 [?] · 478 상점 고지 [더보기] · 269 코스튬 [?])
   이다 — 18회차가 적은 재개 조건(«오프너가 54 보다 늘어날 때»)이 **이 자가 셀 수 있는 계열만**
   세고 있었기 때문이다(뿌리·처방은 `probe351lib` 19회차 주석).
   여기 세우는 다섯은 `probe351` 오프너 중 **팝업을 여는 것**만 고른 것이다 —
   `costab:*` 넷과 `cos:data-coswear|cosup` 은 08·06 시트로 되돌아가 이미 찍힌 화면과 같고
   (`probe351c` 나갈길 5→5 = 시트 · 1→1 = 모달), `pass:back` 은 화면이 아니라 되돌아가기다. */
const SET4 = [
  { id: '89-relhelp', label: '89 유물 → [?] 도움말(429)', how: 'rel:help' },
  { id: '10-legalcoin', label: '10 상점 재화 → 청약철회 고지(478)', how: 'shoplegal:coin' },
  { id: '10-legalpass', label: '10 상점 이용권 → 청약철회 고지(478)', how: 'shoplegal:pass' },
  { id: '50-coshelp', label: '50 코스튬 → [?] 도움말(269)', how: 'cos:data-coshelp' },
  { id: '50-cosun', label: '50 코스튬 → [소환]', how: 'cos:data-cosun' },
];

const SET = (() => { const i = process.argv.indexOf('--set'); return i > 0 ? process.argv[i + 1] : 'r2'; })();
const SCREENS = SET === 'r1' ? SET1 : SET === 'r3' ? SET3 : SET === 'r4' ? SET4
  : SET === 'all' ? [...SET1, ...SET2, ...SET3, ...SET4] : SET2;

/* ⚑ 10회차(2026-08-29) — **재화 알약이 지금 화면에 없으면 «호스트» 를 먼저 연다.**
   `cur:relic` 은 8회차의 상점 세 화면과 **같은 사고**를 내고 있었다: 유물조각 알약은 89 유물
   페이지(`#relw`) 안 `.pcb` 에만 있어(index.html 14265 — 골드·다이아와 달리 HUD 에는 없다)
   메인 화면에서는 상자가 0×0 이고, `force:true` 도 상자가 없으면 못 누른다. `.catch()` 가 삼켜
   **아무 것도 안 누른 채 필드 화면이 찍혔고** 10회차 비평가 CN·CP 가 각자 «13-relic 은 두 장 다
   필드 화면» 이라고 짚어 드러났다(화면목록 서명도 오버레이 id 가 빈칸이었다).
   ⚠ 표(«relic → 보물상자 탭»)를 만들지 않는다(402 «표는 뒤처진다») — 탭을 하나씩 눌러 보며
   **제품에게 묻는다**. ⚠ `probe351lib.drive()` 에 같은 처방이 따로 들어간다 — 두 자가 같은 화면을
   봐야 «자는 초록인데 사람은 감점» 을 그 자리에서 대조할 수 있다(cap351 은 자기 drive 를 쓴다). */
async function openCur(page, key, click, tapIn) {
  const sel = `[data-cur="${key}"]`;
  const drawn = () => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }, sel).catch(() => false);
  if (await drawn()) { await click(sel); return; }
  const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t)).catch(() => []);
  for (const t of tabs) {
    await click(`.tab[data-t="${t}"]`);
    await page.waitForTimeout(320);
    if (await drawn()) { await tapIn(sel); return; }
  }
  console.log(`  ⚠ cur:${key}  ${sel} 이 어느 탭에서도 안 그려진다 — 진입 실패(필드 화면이 찍힌다)`);
}

async function drive(page, how) {
  const ev = (fn, a) => page.evaluate(fn, a).catch(() => {});
  const i = how.indexOf(':');
  const kind = i < 0 ? how : how.slice(0, i);
  const key = i < 0 ? '' : how.slice(i + 1);
  const click = async (sel) => page.click(sel, { timeout: 3000, force: true }).catch(() => {});
  const tapIn = async (sel) => ev((s) => { const e = document.querySelector(s); if (e) e.click(); }, sel);

  if (kind === 'tab') await click(`.tab[data-t="${key}"]`);
  else if (kind === 'side') await click(`.side .ibtn[data-pop="${key}"]`);
  else if (kind === 'util') await click(`#botleft .ubtn[data-util="${key}"]`);
  else if (kind === 'cur') await openCur(page, key, click, tapIn);
  else if (kind === 'menu' && !key) await ev(() => document.querySelector('#menub').click());
  else if (kind === 'menu') {
    await ev(() => document.querySelector('#menub').click());
    await page.waitForTimeout(340);
    await ev((k) => { const e = document.querySelector(`#mnw [data-mn="${k}"]`); if (e) e.click(); }, key);
  } else if (kind === 'eqtab' || kind === 'eqslot') {
    await click('.tab[data-t="hero"]');
    await page.waitForTimeout(400);
    await tapIn(kind === 'eqtab' ? `#eqTabs [data-eqtab="${key}"]` : `#eqCards [data-eqslot="${key}"]`);
  } else if (kind === 'costab') {
    await click('.tab[data-t="hero"]');
    await page.waitForTimeout(400);
    await tapIn('#eqTabs [data-eqtab="cos"]');
    await page.waitForTimeout(400);
    await tapIn(`#bCos [data-costab="${key}"]`);
  } else if (kind === 'cos') {
    /* 19회차 — 코스튬 시트 헤더/액션 버튼(`data-coshelp` 등). 키가 곧 속성 이름이다. */
    await click('.tab[data-t="hero"]');
    await page.waitForTimeout(400);
    await tapIn('#eqTabs [data-eqtab="cos"]');
    await page.waitForTimeout(400);
    await tapIn(`#bCos [${key}]`);
  } else if (kind === 'rel') {
    /* 19회차 · 429 — «보물상자 탭 → 89 유물 페이지 → 좌상단 [?]» */
    await click('.tab[data-t="box"]');
    await page.waitForTimeout(400);
    await tapIn('#relw [data-rlhelp]');
  } else if (kind === 'shoplegal') {
    /* 19회차 · 478 — «상점 탭 → 카테고리 → 고지 띠 [더보기]» */
    await click('.tab[data-t="shop"]');
    await page.waitForTimeout(400);
    await tapIn(`#shopCats .shp-ct[data-cat="${key}"]`);
    await page.waitForTimeout(400);
    await tapIn('#lgMore');
  } else if (kind === 'dunsub') {
    await click('.tab[data-t="adv"]');
    await page.waitForTimeout(400);
    await tapIn(`#dunSub [data-dsub="${key}"]`);
  } else if (kind === 'trsub') {
    await click('.tab[data-t="grow"]');
    await page.waitForTimeout(400);
    await tapIn(`#trSubs [data-trsub="${key}"]`);
  } else if (kind === 'shopcat') {
    await click('.tab[data-t="shop"]');
    await page.waitForTimeout(400);
    await tapIn(`#shopCats .shp-ct[data-cat="${key}"]`);
  } else if (kind === 'prof') {
    await click('#profBtn');
    if (key !== '19') { await page.waitForTimeout(400); await tapIn('.pf-tgl>.lb'); }
  } else if (kind === 'coll21' || kind === 'colltab') {
    /* 13회차(2026-08-30) — 옛 진입 «보물상자 탭 → [세트 도감](`[data-opencoll]`)» 은 **문이 없어졌다**
       (`index.html` 에 그 속성이 0건 — 사이드 레일 `.ibtn[data-pop="coll"]` 이 대신한다).
       `tapIn` 이 조용히 지나쳐 `89-collall` 은 **89 유물 페이지를 «21 도감» 이라 부르며 찍고 있었다**
       (r13 첫 실행이 «89-relic 과 같은 서명» 으로 그것을 잡았다 — 12회차 `ptab:box` 와 같은 꼴). */
    await click('.side .ibtn[data-pop="coll"]');
    if (kind === 'colltab') { await page.waitForTimeout(400); await tapIn(`#collTabs .cltab[data-ct="${key}"]`); }
  } else if (kind === 'quest' || kind === 'qtab') {
    await click('.side .ibtn[data-pop="quest"]');
    await page.waitForTimeout(400);
    if (key === 'rep') { await tapIn('.qs-tg b[data-t="daily"]'); await page.waitForTimeout(300); }
    await ev((t) => { const e = document.querySelector(`.qs-tg b[data-t="${t}"]`); if (e) e.click(); }, key);
  } else if (kind === 'pass' || kind === 'ptab') {
    await ev(() => document.getElementById('menub').click());
    await page.waitForTimeout(300);
    await ev(() => { const e = document.getElementById('psGo'); if (e) e.click(); });
    if (kind === 'ptab') { await page.waitForTimeout(400); await tapIn(`#psBar [data-ptab="${key}"]`); }
  } else if (kind === 'saver') {
    await ev(() => { if (typeof openSaver === 'function') openSaver(); });
  }
  await page.waitForTimeout(600);
  /* 60 쥬시 개봉 연출이 끝난 뒤에 찍는다(smoke.js 135 주석) */
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(200);
}

/* 진입 확인 — «조용히 실패한 클릭» 은 예외를 안 내고 **다른 화면**을 찍는다(LESSONS 356-⑬).
   오프너는 전부 `.catch(() => {})` 라 실패가 안 보이므로, 찍기 직전에 «지금 무슨 화면인가» 를
   서명으로 받아 둔다. 서명이 **둘 이상 화면에서 같으면** 그 중 하나는 안 열린 것이다. */
const SIG = function () {
  /* ⚠ 항상 떠 있는 연출 층(fx*)은 빼고 **z 가 가장 높은 큰 상자**를 쓴다.
     처음엔 «마지막 두 개» 로 잡았다가 collw/psw/panel/pfw 가 전부 fxlc·fxl 뒤로 밀려
     서로 다른 다섯 화면이 같은 서명을 받았다 — 서명이 화면을 못 가르면 이 검사 자체가 헛초록이다. */
  const box = [];
  document.querySelectorAll('#app [id]').forEach((el) => {
    if (/^fx/.test(el.id)) return;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    if (r.width < 300 || r.height < 300) return;
    const z = Number(cs.zIndex); if (!Number.isFinite(z) || z < 5) return;
    box.push({ id: el.id, z });
  });
  box.sort((a, b) => b.z - a.z);
  /* 껍데기(#modal 등)만으로는 팝업끼리 안 갈리므로 그 안의 제목 글자를 같이 쓴다. */
  /* `.ci-head` — 33 재화 팝업(#ciw)은 **탭이 없고 내용만 갈린다**(골드/다이아/유물조각).
     그래서 서브탭 축으로는 안 갈리고 제목으로 갈라야 한다(5회차에 13-gold ↔ 13-dia 가 같은 서명이었다). */
  const head = [...document.querySelectorAll('.mhead,.mtitle,.mbox h3,.mbox b,.pop h3,.sh-hd,.eqp-hd,.ci-head')]
    .map((e) => (e.textContent || '').trim()).filter(Boolean).slice(0, 2).join('/');
  const sheet = ['#bSk', '#bCos', '#bPet', '#bEq', '#blsw']
    .filter((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.height > 50 && getComputedStyle(e).display !== 'none'; }).join(',');
  /* ⚠ 5회차 — 이 줄이 **서명을 통째로 헛초록으로 만들고 있었다.**
     `querySelector('a,b,c')` 는 «관련된 것» 이 아니라 **문서 순서상 첫 매치**를 준다.
     `#dunSub` 가 `#trSubs`·`#shopCats` 보다 앞이라 어느 화면을 찍든 sub 칸이 늘 «던전» 이었고,
     그 결과 **같은 오버레이의 서브탭들이 전부 같은 서명**을 받아(23 훈련/룬/단련 · 10 소환/재화/이용권 ·
     35 패스 4탭 · 13 재화 2탭) «진입 실패 의심» 9건이 찍혔다 — 실제로는 9장 다 md5 가 다른 **정상 캡처**였다.
     ⇒ 바를 **전부** 훑어 켜진 칸을 다 잇는다. 그리고 4회차에 빠져 있던 바(패스·상점·도감·퀘스트·재화)를 채웠다.
     **후보 목록이 곧 사각지대다**(3회차 교훈) — 새 서브탭 바를 만들면 여기에도 같이 적을 것. */
  const SUBBARS = ['#dunSub [data-dsub].on', '#eqTabs [data-eqtab].on', '#trSubs [data-trsub].on',
    '#psBar [data-ptab].on', '#shopCats .shp-ct.on', '#collTabs .cltab.on',
    '.qs-tg b[data-t].on'];
  const subs = SUBBARS.map((s) => {
    const e = document.querySelector(s);
    return e ? (e.textContent || '').trim().slice(0, 8) : '';
  }).filter(Boolean).join('+');
  return [box.slice(0, 2).map((b) => b.id + '@' + b.z).join(','), head.slice(0, 24), sheet, subs].join('|');
};

/* 9회차 — «이 오프너의 표적이 제품에서 잠겨 있나». 잠긴 탭은 눌러도 화면이 안 바뀌는 것이
   **정상**이라 중복 서명을 경고로 찍으면 안 된다(위 dup 갈래 주석).
   ⚠ 표는 «어느 갈래가 잠길 수 있나» 만 적는다 — 잠김 여부 자체는 **제품에게 묻는다**(`.lk`).
   상태를 상수로 베껴 적으면 제품이 해금하는 날 이 자만 옛말을 하게 된다(402 «표가 뒤처진다»).
   ⚠ 표를 **함수 안에** 둔 것은 취향이 아니다 — 이 함수는 `page.evaluate` 로 브라우저에서 돌아
   노드 스코프의 const 를 못 본다. probe351e 첫 판이 `MIN_AREA is not defined` 로 통째로 죽고도
   `.catch` 에 삼켜져 «결함 0건 = 초록» 으로 읽힌 것이 정확히 이 함정이다(8회차 교훈). */
const LOCKED = function (how) {
  const i = String(how || '').indexOf(':');
  if (i < 0) return false;
  const tpl = ({ 'ptab': '#psBar [data-ptab="%"]' })[how.slice(0, i)];
  if (!tpl) return false;
  const el = document.querySelector(tpl.replace('%', how.slice(i + 1)));
  return !!(el && el.classList.contains('lk'));
};

(async () => {
  const br = await launch(chromium);
  const list = ONLY ? SCREENS.filter((s) => s.id.includes(ONLY)) : SCREENS;
  const made = [];
  const sigs = new Map();
  for (const s of list) {
    for (const h of [2280, 1600]) {
      const ctx = await br.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(FILE, { waitUntil: 'load' });
      await page.waitForTimeout(1100);
      await drive(page, s.how);
      if (h === 1600) {
        s.sig = await page.evaluate(SIG).catch(() => '?');
        s.lk = await page.evaluate(LOCKED, s.how).catch(() => false);
      }
      const f = path.join(OUT, `351-${R}-${s.id}-${h}.png`);
      await page.screenshot({ path: f });
      made.push(path.basename(f));
      await ctx.close();
    }
    const dup = sigs.get(s.sig);
    /* 9회차 — 중복 서명의 뜻을 **둘로 갈랐다.** 8회차는 `35-pbox`·`35-ptower` 를 «진입 실패 의심» 으로
       찍어 두고 «잠김 탭이라 진짜 같은 화면일 수 있으나 확인 안 된 채 채점에 들어간다» 를 숙제로 남겼다.
       확인 결과 **잠김이 맞다** — 두 탭은 마크업에 `class="pt lk"` 를 달고 있고(index.html 14554·14555)
       `#psBar` 핸들러가 `if(b.classList.contains('lk')){ notify(…); return; }` 로 **탭 전환 자체를 거절**한다.
       ⇒ 같은 화면인 것이 정상이다. 그런데 그러면 **비평가에게 같은 화면이 두 번 더 들어간다** —
       한 벌을 세 번 채점하는 것이고, 더 나쁘게는 «보물상자 탭인데 스테이지 내용이 보인다» 를
       결함으로 짚을 수 있다(없는 결함 = 유령). 그래서 잠김은 «정상» 으로 갈라 찍고 목록에도 남긴다. */
    if (dup && s.lk) console.log(`  · ${s.id.padEnd(10)} 잠김 탭(제품 상태) — «${dup}» 과 같은 화면이 **정상**이다`);
    else if (dup) console.log(`  ⚠ ${s.id.padEnd(10)} 진입 실패 의심 — «${dup}» 과 같은 화면(서명 ${s.sig})`);
    else sigs.set(s.sig, s.id);
    console.log(`  ${s.id.padEnd(10)} ${s.label}`);
  }
  await br.close();
  const dups = list.length - new Set(list.map((s) => s.sig)).size;
  const lkDups = list.filter((s) => s.lk).length;
  /* 목록에 잠김 표시를 남긴다 — 채점 프롬프트를 짜는 다음 세션이 «이 둘은 빼거나 묶어라» 를
     파일 하나만 보고 알 수 있어야 한다(8회차는 그걸 몰라 같은 화면을 셋으로 채점했다). */
  fs.writeFileSync(path.join(OUT, `351-${R}-화면목록.txt`),
    list.map((s) => `${s.id}\t${s.label}\t${s.how}\t${s.sig || ''}${s.lk ? '\t잠김' : ''}`).join('\n') + '\n');
  console.log(`\n[351] ${made.length}장 → docs/review/351-${R}-*.png`);
  console.log(`[351] 진입 서명 중복 ${dups}건 (그중 잠김 탭 ${lkDups}건 = 정상) ` +
    `${dups - lkDups ? '— ⚠ 나머지는 위 목록 확인' : '— 설명 안 되는 중복 없음'}`);
})();
