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
   제일 먼저 넘치는 자리(바닥 앵커 페이지·가장 키 큰 다이얼로그·바닥 시트). */
const SCREENS = [
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

async function drive(page, how) {
  const ev = (fn, a) => page.evaluate(fn, a).catch(() => {});
  const [kind, key] = how.split(':');
  if (kind === 'tab') await page.click(`.tab[data-t="${key}"]`, { timeout: 3000, force: true }).catch(() => {});
  else if (kind === 'side') await page.click(`.side .ibtn[data-pop="${key}"]`, { timeout: 3000, force: true }).catch(() => {});
  else if (kind === 'util') await page.click(`#botleft .ubtn[data-util="${key}"]`, { timeout: 3000, force: true }).catch(() => {});
  else if (kind === 'menu') {
    await ev(() => document.querySelector('#menub').click());
    await page.waitForTimeout(340);
    await ev((k) => { const e = document.querySelector(`#mnw [data-mn="${k}"]`); if (e) e.click(); }, key);
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
