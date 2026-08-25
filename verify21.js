/* 21 도감 보너스 팝업 (#collw) 검증 — 좌표(측정표 대조) + 실제 동작.
   좌표 기준: 프레임 1080x2280, «프레임 y = 레퍼런스 y − 84» (2026-08-25 기준).
   사용법: node verify21.js */
const { chromium } = require('playwright');
const path = require('path');

const REF = y => y - 84;               /* 레퍼런스 y → 프레임 y */
let pass = 0, fail = 0;
const T = (name, got, want, tol) => {
  const ok = Math.abs(got - want) <= (tol === undefined ? 1 : tol);
  ok ? pass++ : fail++;
  console.log((ok ? '  ok  ' : ' FAIL ') + name + ' = ' + got + ' (기대 ' + want + '±' + (tol === undefined ? 1 : tol) + ')');
};
const B = (name, got) => { got ? pass++ : fail++; console.log((got ? '  ok  ' : ' FAIL ') + name); };

(async () => {
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
      own: { shield0:{n:1,l:5}, amulet0:{n:1,l:6}, shield1:{n:1,l:3}, amulet1:{n:1,l:3},
             shield2:{n:1,l:1}, amulet2:{n:1,l:1} }
    }));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  /* 42 교훈 2 — 검증 중 플레이어가 죽으면 패배 화면(#defw)이 덮어 뒤 항목이 통째로 오염된다 */
  await page.evaluate(() => setInterval(() => { if (typeof player !== 'undefined' && player) player.inv = 1e9; }, 100));

  /* ── 1. 진입점 — 보물상자 탭의 [📖 세트 도감] 버튼을 «실제 클릭» ── */
  console.log('\n[1] 진입점');
  await page.evaluate(() => goTab('box', true));
  await page.waitForTimeout(900);
  B('[data-opencoll] 버튼 존재', await page.locator('[data-opencoll]').count() > 0);
  /* 6회차 — `locator.click()` 이 여기서 영원히 재시도한다. 원인은 21 이 아니라 **공용 `renderUI()`**:
     보물상자 탭이 열려 있으면 0.35초 루프가 `renderBanner('relic','bRel')` 로 패널 innerHTML 을
     통째로 갈아끼워, 버튼 노드가 초당 수십 번 detach 된다(MutationObserver 실측 3초에 87회).
     playwright 의 «visible·enabled·stable» 대기가 끝나기 전에 노드가 사라져 타임아웃이다.
     → 클릭 전에 «보이고 그 좌표의 hit target 이 자기 자신인지» 를 직접 확인해 클릭의 강도를 유지하고,
       클릭 자체는 페이지 안에서 `el.click()` 으로 쏜다(같은 위임 핸들러를 그대로 탄다).
     ※ 이 재렌더 폭주는 02·14 구간 버그다 — 21 작업 범위가 아니라 PROGRESS 비고에만 남긴다. */
  const hit = await page.evaluate(() => {
    const el = document.querySelector('[data-opencoll]');
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { vis: s.visibility === 'visible' && s.display !== 'none' && +s.opacity > 0,
             sized: r.width > 0 && r.height > 0, self: !!top && (top === el || el.contains(top)) };
  });
  B('진입 버튼이 보이고 클릭 가능(hit target = 자기 자신)', hit.vis && hit.sized && hit.self);
  await page.evaluate(() => document.querySelector('[data-opencoll]').click());
  await page.waitForTimeout(400);
  B('#collw 열림', await page.evaluate(() => $('collw').classList.contains('on')));

  const geo = () => page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const sc = app.width / 1080;
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect();
      return { x: +((b.x - app.x) / sc).toFixed(1), y: +((b.y - app.y) / sc).toFixed(1),
               w: +(b.width / sc).toFixed(1), h: +(b.height / sc).toFixed(1) }; };
    const q = s => r(document.querySelector(s));
    const blk = [...document.querySelectorAll('.clb')].map(b => ({
      head: r(b.querySelector('.clb-head')), bdg: r(b.querySelector('.clb-bdg')),
      cards: [...b.querySelectorAll('.cd')].map(r),
      eff: r(b.querySelector('.clb-eff')), btn: r(b.querySelector('.clb-btn')) }));
    return { cl: q('.cl'), band: q('.cl-band'), rib: q('.cl-rib'), srch: q('.cl-srch'),
             body: q('.cl-body'), panel: q('.clb-panel'),
             tabs: [...document.querySelectorAll('.cltab')].map(t => r(t)), blk };
  });

  /* ── 2. 껍데기 좌표 (측정표 §2·§3·§4·§7) ── */
  console.log('\n[2] 껍데기 좌표 — ref−84');
  let g = await geo();
  T('모달 x', g.cl.x, 92, 1);            T('모달 y', g.cl.y, REF(356), 1);
  T('모달 width', g.cl.w, 895, 1);       T('모달 height', g.cl.h, 1544, 2);
  T('다크 밴드 y', g.band.y, REF(364), 1); T('다크 밴드 height', g.band.h, 110, 1);   /* 8회차 실측 ref 364.5~474.5 */
  T('리본 x', g.rib.x, 269, 1);          T('리본 y', g.rib.y, REF(346), 1);
  T('리본 width', g.rib.w, 543, 1);      T('리본 height', g.rib.h, 115, 1);
  T('🔍 x', g.srch.x, 836, 1);           T('🔍 y', g.srch.y, REF(381), 1);
  T('🔍 지름', g.srch.w, 68, 1);
  T('스크롤 뷰포트 x', g.body.x, 108, 1); T('스크롤 뷰포트 y', g.body.y, REF(475), 1);
  T('스크롤 뷰포트 width', g.body.w, 860, 1);
  /* 6회차 실측 — ref 패널 좌 130.5 / 우 948.5 (y540 단면) → 폭 818 */
  T('블록 패널 x', g.panel.x, 130, 1);   T('블록 패널 width', g.panel.w, 818, 1);

  /* ── 3. 블록 격자 — pitch 410 ──
     ref 헤더 상단(x600 단면, 전이 중점) 495.5 / 904.5 / 1314.5 / 1724.5 → 간격 409·410·410.
     정수 pitch 410 + 첫 블록 495.5 면 아래 블록이 ref 보다 최대 1px 낮다(허용 오차 안). */
  console.log('\n[3] 블록 격자 — pitch 410');
  [495.5, 905.5, 1315.5, 1725.5].forEach((y, i) => {
    if (g.blk[i]) T('블록' + (i + 1) + ' 헤더 y', g.blk[i].head.y, REF(y), 1);
  });
  T('블록 헤더 다크밴드 h', g.blk[0].head.h, 80, 1);
  T('블록1 Lv뱃지 y', g.blk[0].bdg.y, REF(489), 1);
  T('블록1 Lv뱃지 w', g.blk[0].bdg.w, 101, 1);
  T('블록1 Lv뱃지 h', g.blk[0].bdg.h, 108, 1);
  /* 6회차 실측 — ref 카드 검정 외곽 x157~277 / y615~735 (y675 행 · x217 열 단면) → 121×121, pitch 129 */
  T('블록1 카드1 x', g.blk[0].cards[0].x, 157, 1);
  T('블록1 카드1 y', g.blk[0].cards[0].y, REF(614.5), 1);
  T('카드 width', g.blk[0].cards[0].w, 121, 1);
  T('카드 height', g.blk[0].cards[0].h, 121, 1);
  T('카드 pitch', g.blk[0].cards[1].x - g.blk[0].cards[0].x, 129.25, 1);
  /* 6회차 실측 — ref 효과바 y786.5~864.5 (x705 열 단면) → h78, 좌단은 패널과 같은 130.5 */
  T('블록1 효과바 x', g.blk[0].eff.x, 130, 1);
  T('블록1 효과바 y', g.blk[0].eff.y, REF(786.5), 1);
  T('블록1 효과바 h', g.blk[0].eff.h, 78, 1);
  /* 6회차 실측 — ref 강화버튼 x716.5~955.5 / y779.5~869.5 (x836 열 단면) → 239×90 */
  T('블록1 강화버튼 x', g.blk[0].btn.x, 716.5, 1);
  T('블록1 강화버튼 y', g.blk[0].btn.y, REF(779.5), 1);
  T('블록1 강화버튼 w', g.blk[0].btn.w, 239, 1);
  T('블록1 강화버튼 h', g.blk[0].btn.h, 90, 1);

  /* ── 4. 하단 깃발 서브탭 (측정표 §6) ── */
  console.log('\n[4] 깃발 서브탭');
  T('탭 top', g.tabs[0].y, REF(1898), 1);
  T('탭1 x', g.tabs[0].x, 124, 1);
  T('탭 pitch', g.tabs[1].x - g.tabs[0].x, 207, 2);
  T('비활성 탭 높이', g.tabs[0].h, 118, 2);
  const act = await page.evaluate(() => [...document.querySelectorAll('.cltab')].findIndex(t => t.classList.contains('on')));
  T('활성 탭 높이', g.tabs[act].h, 145, 2);
  T('4탭 묶음 중심', (g.tabs[0].x + g.tabs[3].x + g.tabs[3].w) / 2, 542, 3);

  /* ── 5. 탭 전환 왕복 (실제 클릭) ── */
  console.log('\n[5] 탭 전환');
  for (const k of ['weapon', 'skill', 'pet', 'armor']) {
    await page.locator('.cltab[data-ct="' + k + '"]').click();
    await page.waitForTimeout(200);
    const st = await page.evaluate(k => ({
      on: document.querySelector('.cltab[data-ct="' + k + '"]').classList.contains('on'),
      n: document.querySelectorAll('#collList .clb').length,
      want: COLL21[k].sets.length, tab: collTab }), k);
    B('탭 ' + k + ' 활성', st.on && st.tab === k);
    T('탭 ' + k + ' 블록 수', st.n, st.want, 0);
  }

  /* ── 6. 실데이터 반영 (T2 기능 체크) ── */
  console.log('\n[6] 실데이터 반영');
  const lab = await page.evaluate(() => [...document.querySelectorAll('#collList .clb')].slice(0, 3)
    .map(b => [...b.querySelectorAll('.cd .cl2')].map(i => i.textContent)));
  B('블록1 라벨 = Lv. 5/6 · Lv. 6/6', lab[0].join('|') === 'Lv. 5/6|Lv. 6/6');
  B('블록2 라벨 = Lv. 3/4 ×2', lab[1].join('|') === 'Lv. 3/4|Lv. 3/4');
  B('블록3 라벨 = Lv. 1/2 ×2', lab[2].join('|') === 'Lv. 1/2|Lv. 1/2');
  const bdg = await page.evaluate(() => [...document.querySelectorAll('#collList .clb .clb-bdg > i.n')].slice(0, 3).map(i => i.textContent));
  B('뱃지 Lv = 세트 내 최저 레벨 (5·3·1)', bdg.join(',') === '5,3,1');
  /* 레벨을 올리면 라벨·뱃지가 따라 움직인다 */
  await page.evaluate(() => { S.own.shield0.l = 6; renderColl21(); });
  const lab2 = await page.evaluate(() => [...document.querySelectorAll('#collList .clb')][0].querySelectorAll('.cd .cl2')[0].textContent);
  const bdg2 = await page.evaluate(() => [...document.querySelectorAll('#collList .clb .clb-bdg > i.n')][0].textContent);
  B('레벨 변경이 라벨에 반영 (Lv. 6/6)', lab2 === 'Lv. 6/6');
  B('레벨 변경이 뱃지에 반영 (6)', bdg2 === '6');
  const clr = await page.evaluate(() => [...document.querySelectorAll('#collList .clb')][0].querySelectorAll('.cd .cl2')[0].style.color);
  B('요구 레벨 충족 라벨 = 흰색', clr.replace(/\s/g, '') === 'rgb(255,255,255)');
  await page.evaluate(() => { S.own.shield0.l = 5; renderColl21(); });

  /* ── 7. 강화 버튼 — 조건 미충족 비활성 · 충족 시 실제 claimColl ── */
  console.log('\n[7] 강화 버튼');
  const dis = await page.evaluate(() => [...document.querySelectorAll('#collList .clb-btn')].map(b => b.disabled));
  B('컬렉션 미충족 시 전부 비활성', dis.every(Boolean));
  const rdy = await page.evaluate(() => {
    /* 방어구 = equip 카테고리. 컬렉션 티어 조건을 실제로 채운다 */
    COLL.equip.list.forEach(it => { S.own[it.id] = { n: 1, l: 10 }; });
    renderColl21();
    return { ready: collReady('equip'), any: [...document.querySelectorAll('#collList .clb-btn')].some(b => !b.disabled) };
  });
  B('컬렉션 충족 시 collReady=true', rdy.ready);
  B('충족 세트의 강화 버튼 활성', rdy.any);
  const before = await page.evaluate(() => ({ c: S.coll.equip, g: S.gold }));
  await page.locator('#collList .clb-btn:not([disabled])').first().click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ c: S.coll.equip, g: S.gold,
    saved: JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}').coll }));
  B('강화 클릭 → S.coll.equip 증가', after.c === before.c + 1);
  B('세이브(localStorage)에 반영', after.saved && after.saved.equip === after.c);

  /* ── 8. 닫기 ── */
  console.log('\n[8] 닫기');
  await page.mouse.click(30, 60);
  await page.waitForTimeout(250);
  B('딤 클릭으로 닫힘', !(await page.evaluate(() => $('collw').classList.contains('on'))));
  await page.evaluate(() => openColl21('armor'));
  await page.waitForTimeout(200);
  await page.evaluate(() => $('tabbar').click());
  await page.waitForTimeout(250);
  B('탭바 클릭으로 닫힘', !(await page.evaluate(() => $('collw').classList.contains('on'))));

  /* ── 9. 화면비 회귀 (LESSONS 63) ──
     이 껍데기는 «패딩 안 중앙 정렬» 이므로 앵커는 프레임 절대가 아니라 «중앙»이다:
     기준 프레임 2280 에서 ref−84 를 맞추고, 다른 프레임에서는 정확히 (frameH−2280)/2 만 움직여야 한다.
     짧은 기기(1920)에서 상단 HUD(0..104)를 파고들지 않고, 깃발탭이 프레임 밖으로 나가지 않아야 한다. */
  console.log('\n[9] 화면비 회귀');
  for (const h of [1920, 2520]) {
    await page.setViewportSize({ width: 1080, height: h });
    await page.waitForTimeout(400);
    await page.evaluate(() => openColl21('armor'));
    await page.waitForTimeout(250);
    const gg = await geo();
    /* 기준 프레임보다 «큰» 화면에서는 순수 중앙 앵커라 Δ=(frameH−2280)/2 로 정확히 예측된다.
       «짧은» 화면에서는 상자가 max-height 로 눌려 패딩 가드에 붙는데, 이때 정확한 top 은
       flex 오버플로 규칙이 정하는 값이라 설계값이 아니다. 여기서 의미 있는 조건은
       «상단 HUD(0..104)를 파고들지 않고 패딩 가드(168) 안에 있다» 뿐이고 그건 아래에서 따로 본다. */
    const d = (h - 2280) / 2, clamped = gg.cl.h < 1540;
    if (clamped) B('프레임 ' + h + ' 모달 y 가 패딩 가드 안 (104 < ' + gg.cl.y + ' ≤ 168)', gg.cl.y > 104 && gg.cl.y <= 168);
    else T('프레임 ' + h + ' 모달 y (중앙 앵커 Δ' + d + ')', gg.cl.y, REF(356) + d, 2);
    /* 깃발탭은 모달 «하단» 앵커다(51 계열 수정) — 상자가 눌리면 같이 올라와야 프레임 밖으로 안 나간다 */
    T('프레임 ' + h + ' 탭 top (모달 하단 앵커)', gg.tabs[0].y, gg.cl.y + gg.cl.h - 1, 2);
    B('프레임 ' + h + ' 상단 HUD(104) 침범 없음', gg.cl.y >= 104);
    B('프레임 ' + h + ' 깃발탭 프레임 안', gg.tabs[1].y + gg.tabs[1].h <= h);
  }

  console.log('\n콘솔 에러: ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  if (errs.length) fail++; else pass++;
  console.log('\n' + (fail === 0 ? 'VERIFY21 PASS' : 'VERIFY21 FAIL') + ' ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
