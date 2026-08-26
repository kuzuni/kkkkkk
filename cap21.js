/* 21 도감 보너스 팝업 캡처 — 1080x2280 (2026-08-25 기준 해상도).
   레퍼런스(docs/ref/21-도감-보너스-팝업.jpg)와 «같은 상태»를 만든다(04 교훈 1).

   ⚑ 11회차(2026-08-26) — 91·118 이 도감을 «부위 × 등급 세트» 로 갈아엎으면서 이 하네스가 죽어 있었다.
     구 구조: 탭 4개(무기·방어구·스킬·동료) · `COLL21[tab].sets` · 세트당 카드 2장.
     신 구조: 탭 6개(스킬·무기·방패·목걸이·펫·유물) · `COLL_SETS`(`st.tab`) · 장비 세트당 카드 5장.
     `openColl21('armor')` 는 이제 «없는 탭» 이라 `#collList` 가 통째로 비어서 나왔다(blocks: []).
     → 탭은 레퍼런스의 «방어구» 에 가장 가까운 **방패(shield)** 로 잡는다.
     ref 의 «5/6 · 6/6 / 3/4 / 1/2» 라벨은 «Lv. 현재/다음 단계 요구» 이므로 세트별 **받은 단계**
     (`S.coll['equip:shield:n']`)와 아이템 레벨을 같이 심어야 재현된다. 카드 수(2 → 5)는
     91 이 못박은 구성이라 ref 와 다르며, 이 차이는 비평 전달문에 명시한다.
   사용법: node cap21.js [출력경로]   (기본 docs/review/21-r1.png) */
const { chromium } = require('playwright');
const path = require('path');

/* 9회차 — 블록 좌표가 회차마다 최대 14px 씩 흔들려 게이트가 무작위로 깨졌다.
   원인은 60 쥬시의 모달 등장 애니메이션(`.jz-o.jz-dlg>*{animation:jzBoxIn .22s}`)이다 —
   고정 `waitForTimeout` 은 러너 부하에 따라 애니메이션 도중에 재기도 한다(피치가 410 이 아니라
   413~417 로 나오는 것이 증거). 69 세션의 «변환 항등 대기» 와 같은 처방:
   **무한 반복(jzDotPulse 등)을 뺀 모든 애니메이션이 끝날 때까지 기다린다.** */
const settle = page => page.evaluate(() => Promise.all(
  document.getAnimations()
    .filter(a => a.effect && a.effect.getTiming().iterations !== Infinity)
    .map(a => a.finished.catch(() => {}))
));

(async () => {
  const out = process.argv[2] || 'docs/review/21-r1.png';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.addInitScript(() => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify({
      gold: 1234567, dia: 3210, relic: 450, stage: 37, best: 37,
      buyQty: 1, autoBuy: false, tuto: 3,
      seen: { hero: 1, up: 1, adv: 1, box: 1, shop: 1 },
      /* 레퍼런스 라벨 재현(91 구조) — 블록1 «Lv. 5/6 · 6/6…» · 블록2 «3/4» · 블록3 «1/2».
         라벨 = «아이템 Lv / (받은 단계+1)» 이므로 S.coll 의 받은 단계와 함께 심는다. */
      own: { shield0:{n:1,l:5}, shield0_1:{n:1,l:6}, shield0_2:{n:1,l:6}, shield0_3:{n:1,l:6}, shield0_4:{n:1,l:6},
             shield1:{n:1,l:3}, shield1_1:{n:1,l:3}, shield1_2:{n:1,l:4}, shield1_3:{n:1,l:4}, shield1_4:{n:1,l:4},
             shield2:{n:1,l:1}, shield2_1:{n:1,l:1}, shield2_2:{n:1,l:2}, shield2_3:{n:1,l:2}, shield2_4:{n:1,l:2},
             /* 스킬 탭 레드닷 = 그 탭에 «강화 가능한 세트» 가 있다(collTabReady) */
             slash:{n:1,l:4}, shuri:{n:1,l:3} },
      coll: { 'equip:shield:0': 5, 'equip:shield:1': 3, 'equip:shield:2': 1 }
    }));
  });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  /* 28 교훈 3 — 캔버스의 흰 데미지 숫자가 잉크 스캔을 오염시킨다 */
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.evaluate(() => openColl21('shield'));
  await page.waitForTimeout(500);
  await settle(page);
  await page.screenshot({ path: out });

  /* DOM 실측 — 프레임(#app) 좌표계 px */
  const m = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080;
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: +((b.x - app.x) / sc).toFixed(1), y: +((b.y - app.y) / sc).toFixed(1),
               w: +(b.width / sc).toFixed(1), h: +(b.height / sc).toFixed(1) }; };
    const q = s => r(document.querySelector(s));
    const blocks = [...document.querySelectorAll('.clb')].map(b => ({
      panel: r(b.querySelector('.clb-panel')), head: r(b.querySelector('.clb-head')),
      bdg: r(b.querySelector('.clb-bdg')), nm: r(b.querySelector('.clb-nm')),
      cards: [...b.querySelectorAll('.cd')].map(r),
      eff: r(b.querySelector('.clb-eff')), btn: r(b.querySelector('.clb-btn'))
    }));
    return {
      frameH: +(app.height / sc).toFixed(1),
      cl: q('.cl'), band: q('.cl-band'), rib: q('.cl-rib'), ribBody: q('.cl-rib>s.bd'),
      srch: q('.cl-srch'), body: q('.cl-body'),
      tabs: [...document.querySelectorAll('.cltab')].map(t => ({
        id: t.dataset.ct, on: t.classList.contains('on'), box: r(t),
        y: r(t.querySelector('s.y')), b: r(t.querySelector('s.b')), lb: r(t.querySelector('i'))
      })),
      blocks
    };
  });
  console.log(JSON.stringify(m, null, 1));
  console.log('CONSOLE ERRORS:', errs.length, errs.slice(0, 5).join(' | '));
  await browser.close();
})();
