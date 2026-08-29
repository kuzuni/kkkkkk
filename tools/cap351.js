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
  { id: '35-pbox', label: '35 패스 → 상자', how: 'ptab:box' },
  { id: '35-ptower', label: '35 패스 → 탑', how: 'ptab:tower' },
  { id: '35-patt', label: '35 패스 → 출석', how: 'ptab:att' },
  { id: '89-collall', label: '21 도감(보물상자 경유)', how: 'coll21' },
  { id: '10-cart', label: '10 상점(장바구니 잉크 D3 자리)', how: 'tab:shop' },
];

const SET = (() => { const i = process.argv.indexOf('--set'); return i > 0 ? process.argv[i + 1] : 'r2'; })();
const SCREENS = SET === 'r1' ? SET1 : SET === 'r3' ? SET3 : SET === 'all' ? [...SET1, ...SET2, ...SET3] : SET2;

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
  else if (kind === 'cur') await click(`[data-cur="${key}"]`);
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
    await click('.tab[data-t="box"]');
    await page.waitForTimeout(400);
    await tapIn('[data-opencoll]');
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

(async () => {
  const br = await launch(chromium);
  const list = ONLY ? SCREENS.filter((s) => s.id.includes(ONLY)) : SCREENS;
  const made = [];
  for (const s of list) {
    for (const h of [2280, 1600]) {
      const ctx = await br.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(FILE, { waitUntil: 'load' });
      await page.waitForTimeout(1100);
      await drive(page, s.how);
      const f = path.join(OUT, `351-${R}-${s.id}-${h}.png`);
      await page.screenshot({ path: f });
      made.push(path.basename(f));
      await ctx.close();
    }
    console.log(`  ${s.id.padEnd(10)} ${s.label}`);
  }
  await br.close();
  fs.writeFileSync(path.join(OUT, `351-${R}-화면목록.txt`),
    list.map((s) => `${s.id}\t${s.label}\t${s.how}`).join('\n') + '\n');
  console.log(`\n[351] ${made.length}장 → docs/review/351-${R}-*.png`);
})();
