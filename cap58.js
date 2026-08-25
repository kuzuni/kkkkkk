#!/usr/bin/env node
/* 58 UI 연출 — 연속 프레임 캡처 (ROUTINE [3]-(다): 트리거 직후 80~100ms 간격 6~8장)
 *
 *   node cap58.js [라운드]      # 기본 r1 → docs/review/58-r1-<씬>-<n>.png
 *
 * 씬 3개(58 표의 «필수 연출» 중 실제 게임 데이터로 트리거되는 것):
 *   gain  재화 획득  — 전투 킬 지점에서 코인이 HUD 골드 알약으로 날아가 꽂힘 + 알약 튐 + 숫자 롤링 + `+n`
 *   quest 보상 수령  — 22 퀘스트 «보상 받기» → 체크 드로잉 + 버스트 + 토스트 + 재화 비행
 *   upg   강화 성공  — 23 훈련 카드 강화 → 카드 흰 플래시 + 성공 파티클
 *
 * 결정성(41 교훈 4 · 42 교훈 1·2):
 *   - rAF 가 도는 것을 먼저 확인하고 주입한다. 주입이 안 붙으면 스스로 throw 한다.
 *   - 전투는 «적을 비우지» 않고 멀리 주차 + player.inv 로 넉백을 막아 캔버스를 조용히 만든다
 *     (배열을 비우면 파도 클리어로 처리돼 상태가 리셋된다).
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');

const ROUND = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, 'docs', 'review');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const N = 8, GAP = 90;                      /* 8장 · 90ms 간격 = 트리거 후 0~630ms */

async function frames(page, tag){
  for(let i=0;i<N;i++){
    await page.screenshot({ path: path.join(OUT, `58-${ROUND}-${tag}-${i+1}.png`) });
    await page.waitForTimeout(GAP);
  }
  console.log(`  ✓ ${tag}: ${N}장`);
}

/* rAF 가 실제로 도는지 확인 — 안 돌면 주입한 상태가 화면에 반영되지 않는다 */
async function ensureLoop(page){
  const ok = await page.evaluate(() => new Promise(res => {
    let n = 0;
    const t = setInterval(() => { if(++n > 40) { clearInterval(t); res(false); } }, 25);
    const s = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      clearInterval(t); res(performance.now() - s < 500);
    }));
  }));
  if(!ok) throw new Error('rAF 루프가 돌지 않는다 — 캡처가 결정적이지 않다');
}

/* 캔버스를 조용히 만든다(연출만 보이게). 적은 지우지 말고 멀리 주차한다. */
async function quiet(page){
  await page.evaluate(() => {
    player.inv = 1e9;                                  /* 넉백·피격 제거 (42 교훈 2) */
    for(const e of enemies){ e.x = 1; e.y = 1; }       /* 배열을 비우면 파도 클리어 (42 교훈 1) */
    parts.length = 0; nums.length = 0; shots.length = 0;
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });

  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await ensureLoop(page);

  /* ── 씬 1: 재화 획득 (전투 드랍) ── */
  await quiet(page);
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => {
    const p = fxWorld(player.x + 120, player.y - 40);
    fxAt(p);
    S.gold += 128000;                                  /* 실제 획득 경로와 같은 «S 증가» 로 트리거 */
    return { g:S.gold, x:p.x, y:p.y };
  });
  await page.waitForTimeout(200);                      /* fxWatch 디바운스(180ms) 통과 */
  const flying = await page.evaluate(() => document.querySelectorAll('#fxl .fx-fly').length);
  if(!flying) throw new Error('재화 비행 아이콘이 생성되지 않았다 — 트리거 실패');
  await frames(page, 'gain');
  console.log(`     출발점 ${before.x.toFixed(0)},${before.y.toFixed(0)} · 비행 아이콘 ${flying}개`);

  /* ── 씬 2: 보상 수령 (퀘스트) ── */
  await page.evaluate(() => {
    S.quest.kill.base = -1e9;                          /* 진행도 = get() - base → 즉시 달성 */
    openQuest('rep');
  });
  await page.waitForTimeout(350);
  const qok = await page.evaluate(() => {
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return false;
    b.click();                                         /* 페이지 안에서 resolve+click (25 교훈 5) */
    return true;
  });
  if(!qok) throw new Error('퀘스트 «보상 받기» 버튼을 찾지 못했다 — 트리거 실패');
  await frames(page, 'quest');

  /* ── 씬 3: 강화 성공 (훈련 카드) ── */
  await page.evaluate(() => { closeModal(); S.gold = 1e13; openTrain(); });
  await page.waitForTimeout(500);
  const uok = await page.evaluate(() => {
    const c = document.querySelector('#trw [data-tr]');
    if(!c) return false;
    c.click();
    return true;
  });
  if(!uok) throw new Error('훈련 카드를 찾지 못했다 — 트리거 실패');
  await frames(page, 'upg');

  await browser.close();
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,8).forEach(e => console.log('  ! ' + e)); process.exit(1); }
  console.log('\ncap58 OK — docs/review/58-' + ROUND + '-*.png');
})().catch(e => { console.error('cap58 실패:', e.message); process.exit(1); });
