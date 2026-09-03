/* 작업 22 — 퀘스트 팝업 채점용 캡처. 1080x2280 (2026-08-25 기준 화면비).
 * 레퍼런스(docs/ref/22-퀘스트-팝업.jpg)와 «같은 상태»로 맞춘다(LESSONS 04-①):
 *   · 탭 = «업적»(레퍼런스 선택 상태) · 5행 전부 진행 중(회색 비활성 버튼) · [모두 받기] 비활성
 *   · 진행률은 레퍼런스와 비슷하게 50% / 53% / 22% / 86% / 60% (행 순서 = 소환·강화·처치·스테이지·도감)
 * 캡처 오염 방지: 렌더 루프를 세우고(41-④) · 캔버스를 내리고(28-③) · 유휴 갱신을 멈춘다.
 *   node tools/cap22.js [출력이름]   → docs/review/22-r{n}.png
 */
/* 110 공용 부트스트랩 — 번들 브라우저가 없는 컨테이너에서 즉사하던 것을 폴백시킨다
   (141, 2026-08-26: 이 캡처기가 아직 옛 2줄이라 클라우드 워커에서 못 돌았다) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const name = process.argv[2] || '22-r1.png';
const out = path.resolve(__dirname, '..', 'docs', 'review', name);

/* 레퍼런스 진행률에 맞춘 카운터 — **851(2026-09-03) 재작성**.
   799 가 업적 퀘스트를 «누적 절대값» 으로 바꾼 뒤로 축이 둘뿐이다:
     · 진행 = `questProg(q)` = `q.get()`   (기준선 `S.quest[].base` 는 **읽는 곳이 0곳**)
     · 목표 = `questGoal(q)` = `q.step × (s + 1)`  (등차)
   ⇒ 원하는 진행률은 **카운터와 s 두 값**으로 만든다. 옛 표본은 등비 goal 과 base 로 짜여 있어
   진행이 목표를 통째로 넘겼고(60/60 · 50/50 · 400/400 · 3/3) 5행 중 4행이 **초록 활성**이었다 —
   레퍼런스(전부 회색)와 정반대다. ⚠ `base` 를 되살리는 방향으로 고치지 마라(799 금지). */
const SAVE = {
  totalKills: 44, best: 6, summons: 15, upgrades: 69,
  gold: 5e7, dia: 12000,
  /* coll 진행 = `ownedTotal()` = `Object.keys(S.own).length` 라 카운터가 아니라 보유 종수로 심는다 */
  own: { slash: { n:0, l:1 }, shuri: { n:0, l:1 }, stone: { n:0, l:1 },
         curve: { n:0, l:1 }, multi: { n:0, l:1 }, orbit: { n:0, l:1 } },
  quest: {                /* 서두가 약속한 진행률 50 / 53 / 22 / 85 / 58 % 를 등차 축에서 되만든 값 */
    summon: { s: 1 },   /* goal 15×2  =  30 · 진행 15 (50%) */
    upg:    { s: 12 },  /* goal 10×13 = 130 · 진행 69 (53%) */
    kill:   { s: 1 },   /* goal 100×2 = 200 · 진행 44 (22%) */
    stage:  { s: 6 },   /* goal 1×7   =   7 · 진행 6  (86%) */
    coll:   { s: 1 }    /* goal 5×2   =  10 · 진행 6  (60%) */
  }
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 부팅 뒤 900ms 동안 자동 전투가 처치 수·스테이지를 밀어 진행률이 캡처마다 흔들린다 —
     팝업을 열기 직전에 카운터를 다시 못박는다(851). 진행이 목표를 넘으면 그 행이 초록으로
     뒤집혀 레퍼런스(전부 회색)와 상태가 달라진다. */
  await page.evaluate(() => {
    window.step = () => {};                     /* 팝업은 열 때 한 번 그리므로 루프가 필요 없다 */
    S.totalKills = 44; S.best = 6; S.summons = 15; S.upgrades = 69;
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
