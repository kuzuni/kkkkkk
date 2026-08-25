/* 작업 90 — 03 던전 페이지(#dunw) 캡처. 기준 화면비 9:19(1080×2280).
   실행: node tools/cap90.js [출력경로] [--locked]
     기본     — 유물조각 1~3단 해금 · 4단 잠김(해금 체인이 보이는 상태)
     --locked — 유물조각 전 단 잠김(가이드미션 전 초기 상태)
   지시서 [3]-(가) 작업이라 비평 루프는 돌지 않는다. 카드 6장·잠금 칸·스크롤을 눈으로 확인하는 용도.
   playwright 번들 브라우저가 없으면 /opt/pw-browsers/chromium 으로 떨어진다(smoke.js 처방). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) || 'docs/review/90-r1.png';
const LOCKED = args.includes('--locked');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  let b;
  try { b = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await chromium.launch(o); }
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate((locked) => {
    S.guide.idx = locked ? 0 : 99;
    S.dun.gold = 4; S.dun.dia = 2;
    S.dun.relic1 = locked ? 1 : 6;
    S.dun.relic2 = locked ? 1 : 6;
    S.dun.relic3 = 1; S.dun.relic4 = 1;
    S.daily.dun = { gold: 2, dia: 3, relic1: 3, relic2: 1, relic3: 3, relic4: 3 };
    dunSub = 'dun';
    msgTxt = ''; msgT = 0;                 /* LESSONS 30-② — 로드 직후 토스트가 캡처에 섞이지 않게 */
    openDungeon();
    document.getElementById('dunList').scrollTop = 0;
  }, LOCKED);
  await p.waitForTimeout(500);
  fs.mkdirSync(path.dirname(path.resolve(__dirname, '..', out)), { recursive: true });
  await p.screenshot({ path: path.resolve(__dirname, '..', out) });
  console.log('saved ' + out + (LOCKED ? ' (전 단 잠김)' : ' (1~3단 해금 · 4단 잠김)'));
  await b.close();
})();
