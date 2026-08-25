/* 작업 22 — 퀘스트 팝업 채점용 캡처. 1080x2280 (2026-08-25 기준 화면비).
 * 레퍼런스(docs/ref/22-퀘스트-팝업.jpg)와 «같은 상태»로 맞춘다(LESSONS 04-①):
 *   · 탭 = «반복»(레퍼런스 선택 상태) · 5행 전부 진행 중(회색 비활성 버튼) · [모두 받기] 비활성
 *   · 진행률은 레퍼런스와 비슷하게 50% / 53% / 22% / 85% / 58% 부근
 * 캡처 오염 방지: 렌더 루프를 세우고(41-④) · 캔버스를 내리고(28-③) · 유휴 갱신을 멈춘다.
 *   node tools/cap22.js [출력이름]   → docs/review/22-r{n}.png
 */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const name = process.argv[2] || '22-r1.png';
const out = path.resolve(__dirname, '..', 'docs', 'review', name);

/* 레퍼런스 진행률에 맞춘 카운터.
   goal = base * mul^s (s=0) → kill 60 / stage 3 / summon 5 / upg 20 / coll 4.
   base(기준선) 를 같이 심어 «진행 = get() − base» 가 원하는 값이 되게 한다. */
const SAVE = {
  totalKills: 1000, best: 12, summons: 500, upgrades: 3000,
  gold: 5e7, dia: 12000,
  quest: {
    summon: { s: 3, base: 500 - 6 },    /* goal 5*1.6^3 = 20.5 → 21, 진행 6  (29%) */
    upg:    { s: 4, base: 3000 - 70 },  /* goal 20*1.6^4 = 131, 진행 70      (53%) */
    kill:   { s: 3, base: 1000 - 50 },  /* goal 60*1.55^3 = 224, 진행 50     (22%) */
    stage:  { s: 2, base: 0 },          /* goal 3*1.5^2 = 7, 진행 12 → 상한  (100%) */
    coll:   { s: 1, base: 0 }           /* goal 4*1.45 = 6, 진행 = 보유 종수 */
  }
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* stage 퀘스트가 «완료» 로 뜨면 레퍼런스(전부 회색)와 상태가 달라진다 — 기준선을 현재로 밀어
     5행 전부 미완료로 만든다. 진행률은 각 행마다 다르게 남긴다. */
  await page.evaluate(() => {
    S.quest.stage.base = S.best - 4;            /* goal 7, 진행 4 (57%) */
    S.quest.coll.base  = Math.max(0, ownedTotal() - 5); /* goal 6, 진행 5 (83%) */
    save();
  });
  await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="quest"]').click());
  await page.waitForTimeout(700);

  /* 캔버스 데미지 숫자 · 자동 전투가 캡처를 오염시킨다(LESSONS 28-③ · 41-④) */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
  });
  await page.waitForTimeout(300);

  const st = await page.evaluate(() => ({
    tab: document.querySelector('.qs-tg b.on') && document.querySelector('.qs-tg b.on').dataset.t,
    rows: [...document.querySelectorAll('.qs-r')].map(r => ({
      t: r.querySelector('.qs-t').textContent,
      p: r.querySelector('.qs-p b').textContent,
      w: r.querySelector('.qs-p i').style.width,
      dis: r.querySelector('.qs-b').disabled
    })),
    all: document.getElementById('qAll').disabled
  }));
  console.log(JSON.stringify(st, null, 1));
  if (st.rows.length !== 5) throw new Error('행 5개가 아니다: ' + st.rows.length);
  if (st.rows.some(r => !r.dis)) throw new Error('레퍼런스와 상태 불일치 — 활성(초록) 버튼이 있다');

  await page.screenshot({ path: out });
  await browser.close();
  console.log('CAP22 OK — docs/review/' + name);
})();
