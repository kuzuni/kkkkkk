#!/usr/bin/env node
/* 186 검증 — 05 장비 팝업이 **8등급 전부를 미리 보여준다** (2026-08-27, 저장소 주인 지시
 * «(잠긴 등급도) 미리 보여야지»).
 *
 *   node tools/verify186.js
 *
 * 무엇이 문제였나: 격자가 `WPN_ROWS = 4` + `wpnPage` 로 **4행씩 페이징**하고, `openWeapon()` 이
 * 열 때마다 `wpnPage = 0` 으로 되돌렸다 → 전설·신화·초월·불멸 4등급이 2페이지에 갇혀
 * «우리 게임엔 4등급뿐» 인 것처럼 보였다(주인 실플레이). 격자 자체는 8등급을 이미 잘 그렸고
 * 미보유 칸도 82 규칙대로 자물쇠로 보여주고 있었다 — 문제는 **페이징 하나**였다.
 *
 * 검사 항목:
 *   [A] 페이징 폐지 — ◀▶(`#wpnPrev`/`#wpnNext`)·`wpnPages()`·전역 `wpnPage` 잔존 0건
 *   [B] 8행 40칸 — 무기·방패·목걸이 **세 부위 전부** 한 번에 40칸, 8등급 아이템이 전부 격자 안
 *   [C] 기하 무회귀 — 칸 148×158 · x = 10 + c·170 · y = 32 + r·190 (05 측정표 그대로)
 *   [D] 스크롤 도달 — 격자(844×621)가 마지막 행까지 스크롤로 닿는다
 *   [E] 해금 안내 — 소환 Lv 가 모자란 등급 행의 잠금 칸에 «소환 Lv.N»(GRADE_ROLL_EQ.unlock)
 *   [F] 안내 위치 — 자물쇠 아래·진행바 위 빈 띠 안(카드 밖으로 새지 않는다)
 *   [G] 실동작 — 스크롤 아래쪽(불멸) 칸을 눌러 선택·장착이 되고 S·HUD·재렌더에 반영된다
 *   [H] NaN/undefined 0건 · 콘솔 에러 0건
 */
const path = require('path');
const fs = require('fs');
/* 작업 931 — 부트스트랩을 공용 사슬(`pwlaunch`)로 갈아 끼웠다(925 가 화소 자 넷에 한 것과 같다).
   여기 손으로 적혀 있던 모듈 해석·실행 파일 폴백은 `pwlaunch` 것과 **같은 말**이었고,
   사슬을 지나야 291 정착·731 소실 차단기가 붙는다(둘 다 화소와 무관한 장치다). */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  let browser;
  browser = await launch(chromium);   /* 931 — 실행 파일 폴백까지 사슬이 맡는다 */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof EQUIPS !== 'undefined' && typeof openWeapon === 'function');
  await page.waitForTimeout(800);

  /* [A] 페이징 폐지 — 되돌림 감지. «항상 1 을 내는 wpnPages()» 로 남겨 두는 것도 FAIL 이다
     (다음 세션이 «페이징이 아직 있다» 고 읽는다). */
  const A = await page.evaluate(() => ({
    prev: !!document.getElementById('wpnPrev'),
    next: !!document.getElementById('wpnNext'),
    arrows: document.querySelectorAll('#wpnw .wm-ar').length,
    /* ⚠ `window.wpnPages` 로 물으면 **폐지 전에도 undefined** 다 — 최상위 `const`/`let` 은
       window 에 붙지 않는다(전역 렉시컬 스코프). 되돌림 시험에서 이 두 줄만 초록으로 남아
       «있으나 마나 한 단언» 이라는 게 드러났다. 맨이름 `typeof` 는 전역 렉시컬까지 본다
       (미선언 식별자여도 던지지 않는다 — typeof 의 유일한 예외). */
    pages: typeof wpnPages,
    page: typeof wpnPage,
    rows: typeof WPN_ROWS === 'number' ? WPN_ROWS : -1,
    grades: GRADE.length
  }));
  ok(!A.prev && !A.next && A.arrows === 0, 'A1 ◀▶ 페이지 화살표 DOM 0건',
    'prev=' + A.prev + ' next=' + A.next + ' .wm-ar=' + A.arrows);
  ok(A.pages === 'undefined', 'A2 wpnPages() 폐지', 'typeof=' + A.pages);
  ok(A.page === 'undefined', 'A3 전역 wpnPage 폐지', 'typeof=' + A.page);
  ok(A.rows === A.grades, 'A4 WPN_ROWS 가 등급 수(GRADE.length)를 따라간다',
    A.rows + ' vs ' + A.grades);

  /* [B] 세 부위 전부 8행 · 8등급 아이템이 격자 안에 있다.
     ⚑ **740 이관(2026-09-02)** — 종전 기대값은 `GRADE.length × WPN_COLS`(= 40칸)였다.
       740 이 «남는 칸을 잠금 더미로 채운다» 를 폐지하면서 `WPN_COLS` 가 선언째 사라졌고,
       그 40 은 **1종뿐인 불멸 행에 더미 4칸을 세던 값**이라 이제 거짓이다(그 4칸이 주인 눈에
       «불멸 아이템 5개» 로 읽힌 것이 740 의 등재 사유다).
     ⚠ 항을 눌러 초록으로 되돌리는 것(«칸 수를 안 센다»)은 328 이 경고한 헛초록이다 —
       그러면 «격자가 통째로 비어도 초록» 이 된다. 기대값을 **데이터**(그 부위의 실제 종 수)로
       갈아 끼우고, 아래 B1b 로 «칸 수 = 종 수» 가 우연이 아님을 등급별로 못박는다. */
  const B = await page.evaluate(() => {
    const out = {};
    for (const part of ['weapon', 'shield', 'amulet']) {
      openWeapon(null, part);
      const g = document.getElementById('wpnGrid');
      const h = g.innerHTML;
      /* 그 부위 8등급의 «1번 칸 아이템» 이 전부 격자에 들어와 있는지 — id 로 확인한다 */
      const firstOfGrade = GRADE.map((_, gi) => (EQUIPS.filter(e => e.slot === part && e.g === gi)[0] || {}).id);
      const cells = [...g.children];
      const ids = new Set(cells.map(c => c.dataset.wpn).filter(Boolean));
      /* 미보유 칸은 data-wpn 이 없다 → 아이콘 문자열로 등급 행 존재를 확인 */
      const rowsSeen = new Set(cells.map(c => Math.round((c.offsetTop - 32) / 190)));
      const perGrade = GRADE.map((_, gi) => EQUIPS.filter(e => e.slot === part && e.g === gi).length);
      /* 등급별로 «그 행에 그려진 칸 수»(top = 32 + g·190 으로 되찾는다) ↔ «그 등급의 종 수» */
      const drawnPerGrade = GRADE.map((_, gi) =>
        cells.filter(c => Math.round((c.offsetTop - 32) / 190) === gi).length);
      out[part] = {
        cells: cells.length, want: perGrade.reduce((a, c) => a + c, 0),
        perGrade, drawnPerGrade,
        rows: rowsSeen.size, owned: ids.size, firstOfGrade,
        bad: /NaN|undefined/.test(h)
      };
      closeWeapon();
    }
    return out;
  });
  for (const part of ['weapon', 'shield', 'amulet']) {
    const b = B[part];
    ok(b.cells === b.want, 'B1 ' + part + ' — 격자 ' + b.want + '칸(= 그 부위 종 수) 일괄 렌더',
      b.cells + '칸');
    /* 740 — B1 의 합이 «우연히» 맞는 것을 막는 짝. 등급별로 «그린 칸 = 그 등급 종 수» 여야 하고,
       특히 불멸 행은 **1칸**이다(종전 5칸 = 더미 4). */
    ok(b.drawnPerGrade.join(',') === b.perGrade.join(','),
      'B1b ' + part + ' — 등급별 칸 수 = 그 등급 종 수(불멸 행 1칸)',
      '그림 ' + b.drawnPerGrade.join(',') + ' vs 종 ' + b.perGrade.join(','));
    ok(b.rows === 8, 'B2 ' + part + ' — 서로 다른 등급 행 8개', String(b.rows));
    ok(b.firstOfGrade.every(Boolean), 'B3 ' + part + ' — 8등급 모두 대표 아이템 존재',
      b.firstOfGrade.join(','));
    ok(!b.bad, 'B4 ' + part + ' — NaN/undefined 0건');
  }

  /* [C] 기하 무회귀 — 05 측정표(`docs/measure/05-무기팝업.md` §5·부록)의 칸 격자 그대로.
     186 은 «페이징만» 없앤다. 칸 하나라도 움직이면 05 의 8점(①~④)이 깨진다. */
  const C = await page.evaluate(() => {
    openWeapon(null, 'weapon');
    const g = document.getElementById('wpnGrid');
    const bad = [];
    /* 740 이관 — 종전에는 «DOM 순번 i» 를 고정 열 수로 나눠 (행, 열)을 되찾았다. 행마다 칸 수가
       다를 수 있게 된 뒤로 그 식은 성립하지 않는다. 이제 **아이템의 (등급 g, 등급 안 자리 j)**
       가 곧 (행, 열)이다 — 카드의 `data-wpn` 으로 그 아이템을 찾아 좌표를 역산한다.
       ⚠ 이렇게 해야 «칸이 빠져도 남은 칸이 왼쪽으로 밀리지 않는다» 까지 같이 지킨다. */
    const seq = [...g.children].map(c => EQUIPS.find(e => e.id === c.dataset.wpn) || null);
    [...g.children].forEach((c, i) => {
      const it = seq[i];
      if(!it){ bad.push(i + ': data-wpn 없음(더미 칸 — 740 이 폐지했다)'); return; }
      const r = it.g, col = it.j;
      const wx = 10 + col * 170, wy = 32 + r * 190;
      if (c.offsetLeft !== wx || c.offsetTop !== wy || c.offsetWidth !== 148 || c.offsetHeight !== 158)
        bad.push(i + ':' + c.offsetLeft + ',' + c.offsetTop + ' ' + c.offsetWidth + 'x' + c.offsetHeight
                 + ' (기대 ' + wx + ',' + wy + ' 148x158)');
    });
    const gr = { w: g.clientWidth, h: g.clientHeight };
    closeWeapon();
    return { bad, gr };
  });
  ok(C.bad.length === 0, 'C1 전 칸 148×158 · x=10+j·170 · y=32+g·190 (740 — 자리는 (등급,티어)가 정한다)',
    C.bad.length ? C.bad.slice(0, 3).join(' | ') : '어긋남 0건');
  ok(C.gr.w === 844 && C.gr.h === 621, 'C2 격자 크기 844×621 유지',
    C.gr.w + 'x' + C.gr.h);

  /* [D] 스크롤 도달 — 마지막 행 바닥까지 실제로 닿는가. 4행일 때도 격자는 이미 스크롤했다
     (32 + 4·190 = 792 > 621) — 186 은 그 스크롤이 8행을 담게 만든 것이다. */
  const D = await page.evaluate(async () => {
    openWeapon(null, 'weapon');
    const g = document.getElementById('wpnGrid');
    const last = g.children[g.children.length - 1];
    const need = last.offsetTop + last.offsetHeight;              /* 1520 = 32 + 7·190 + 158 */
    g.scrollTop = g.scrollHeight;                                  /* 바닥까지 */
    await new Promise(r => requestAnimationFrame(r));
    const seenBottom = g.scrollTop + g.clientHeight;
    const r = { need, scrollH: g.scrollHeight, clientH: g.clientHeight, seenBottom };
    g.scrollTop = 0; closeWeapon();
    return r;
  });
  ok(D.scrollH >= D.need, 'D1 스크롤 높이가 마지막 행을 담는다',
    D.scrollH + ' ≥ ' + D.need);
  ok(D.seenBottom >= D.need, 'D2 바닥까지 스크롤하면 마지막 행이 보인다',
    D.seenBottom + ' ≥ ' + D.need);

  /* [E] 해금 안내 — «언제 열리는지» 가 보여야 한다(지시서 등재문의 처방).
     소환 Lv 1 에서는 «해금 레벨 > 1» 인 6개 행이 잠겨 있고, 만렙에서는 한 칸도 없어야 한다
     — «미보유»(자물쇠)와 «미해금»(등급 자체가 안 나옴)은 다르다.
     ⚑ 767(2026-09-01) — 이 주석은 186 당시 사다리(5·15·30·40·55·75)를 적고 있었다. 196·496 이
       그것을 두 번 옮겼는데(현재 10·16·24·32·40·`SUM_MAXLV−1`) **아래 단언은 `GRADE_ROLL_EQ` 에서
       파생하므로 내내 초록이었고 주석만 썩었다.** 형제 자 `fnchk186` 은 같은 숫자를 단언에 박아
       두 세대 내내 빨갰다 — 그 수리(767)가 여기 숫자를 다시 못 박지 않게 낱말로 되돌린다(522-①). */
  const E = await page.evaluate(() => {
    const read = lv => {
      const o = S.sum.weapon.lv; S.sum.weapon.lv = lv;
      openWeapon(null, 'weapon');
      const g = document.getElementById('wpnGrid');
      const byRow = {};
      [...g.children].forEach(c => {
        const r = Math.round((c.offsetTop - 32) / 190);
        const u = c.querySelector('.ulk');
        byRow[r] = byRow[r] || { n: 0, txt: null, owned: 0 };
        if (u) { byRow[r].n++; byRow[r].txt = u.textContent.trim(); }
        if (c.dataset.wpn) byRow[r].owned++;
      });
      closeWeapon(); S.sum.weapon.lv = o;
      return byRow;
    };
    return { lv1: read(1), lv100: read(100),
             need: GRADE_ROLL_EQ.map(g => g.unlock),
             /* 740 이관 — 「행마다 5칸」은 «등급당 5종» 이 참일 때만 성립하는 상수였다.
                불멸(1종) 행은 1칸이므로 기대값을 **그 등급의 종 수**에서 파생한다. */
             perGrade: GRADE.map((_, gi) => EQUIPS.filter(e => e.slot === 'weapon' && e.g === gi).length) };
  });
  const lockedRows = E.need.map((n, i) => (n > 1 ? i : -1)).filter(i => i >= 0);
  const e1 = lockedRows.every(r => E.lv1[r] && E.lv1[r].n === E.perGrade[r] && E.lv1[r].txt === '소환 Lv.' + E.need[r]);
  ok(e1, 'E1 Lv1 — 미해금 등급 행(' + lockedRows.join(',') + ') 잠금 칸 전부(등급별 ' + lockedRows.map(r => E.perGrade[r]).join('/') + '칸)에 «소환 Lv.N»',
    lockedRows.map(r => r + ':' + (E.lv1[r] ? E.lv1[r].n + '칸 ' + E.lv1[r].txt : '없음')).join(' / '));
  const openRows = E.need.map((n, i) => (n <= 1 ? i : -1)).filter(i => i >= 0);
  ok(openRows.every(r => !E.lv1[r] || E.lv1[r].n === 0),
    'E2 Lv1 — 이미 열린 등급 행(' + openRows.join(',') + ')에는 안내 0건',
    openRows.map(r => r + ':' + ((E.lv1[r] && E.lv1[r].n) || 0)).join(' / '));
  ok(Object.values(E.lv100).every(v => v.n === 0),
    'E3 Lv100 — 전 등급 해금이라 안내 0건',
    Object.entries(E.lv100).map(([r, v]) => r + ':' + v.n).join(' / '));

  /* [E4] 보유한 칸에는 안내가 붙지 않는다 — 이미 가진 물건에 «소환 Lv.N» 은 거짓말이다. */
  const E4 = await page.evaluate(() => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = 1;
    const g7 = EQUIPS.find(e => e.slot === 'weapon' && e.g === 7);
    const had = S.own[g7.id]; S.own[g7.id] = { n: 1, l: 1 };
    openWeapon(null, 'weapon');
    const cell = document.querySelector('#wpnGrid [data-wpn="' + g7.id + '"]');
    const r = { found: !!cell, ulk: !!(cell && cell.querySelector('.ulk')),
                lk: !!(cell && cell.classList.contains('lk')) };
    closeWeapon();
    if (had === undefined) delete S.own[g7.id]; else S.own[g7.id] = had;
    S.sum.weapon.lv = o;
    return r;
  });
  ok(E4.found && !E4.ulk && !E4.lk, 'E4 보유한 불멸 칸에는 안내·자물쇠 없음',
    '칸=' + E4.found + ' 안내=' + E4.ulk + ' 자물쇠=' + E4.lk);

  /* [F] 안내 위치 — 자물쇠(카드기준 38~93) 아래, 진행바(114~) 위의 빈 띠 안. 카드 밖으로 새면
     아래 칸을 덮는다. 82 게이트가 «아이콘 표시/숨김 픽셀 차분» 을 재는 칸이라 배경도 깔면 안 된다. */
  const F = await page.evaluate(() => {
    const o = S.sum.weapon.lv; S.sum.weapon.lv = 1;
    openWeapon(null, 'weapon');
    const cell = [...document.getElementById('wpnGrid').children].find(c => c.querySelector('.ulk'));
    const u = cell.querySelector('.ulk'), lock = cell.querySelector('.lock'), pb = cell.querySelector('.pb');
    const cr = cell.getBoundingClientRect(), ur = u.getBoundingClientRect();
    const lr = lock.getBoundingClientRect(), pr = pb.getBoundingClientRect();
    const cs = getComputedStyle(u);
    const r = {
      top: +(ur.top - cr.top).toFixed(1), bottom: +(ur.bottom - cr.top).toFixed(1),
      lockBottom: +(lr.bottom - cr.top).toFixed(1), pbTop: +(pr.top - cr.top).toFixed(1),
      inX: ur.left >= cr.left - 0.5 && ur.right <= cr.right + 0.5,
      bg: cs.backgroundColor, bgi: cs.backgroundImage
    };
    closeWeapon(); S.sum.weapon.lv = o;
    return r;
  });
  ok(F.top >= F.lockBottom - 0.5, 'F1 안내가 자물쇠 아래에서 시작',
    'ulk top ' + F.top + ' ≥ lock bottom ' + F.lockBottom);
  ok(F.bottom <= F.pbTop + 0.5, 'F2 안내가 진행바 위에서 끝',
    'ulk bottom ' + F.bottom + ' ≤ pb top ' + F.pbTop);
  ok(F.inX, 'F3 안내가 카드 가로 안쪽');
  ok(/rgba\(0, 0, 0, 0\)|transparent/.test(F.bg) && F.bgi === 'none',
    'F4 안내에 배경 없음(82 §0 캘리브레이션 보호)', F.bg + ' / ' + F.bgi);

  /* [G] 실동작 — «만들어 놓음» 이 아니라 «눌렀을 때 무엇이 바뀌는가»(기능 완성 규칙 2026-08-25).
     예전에는 2페이지로 넘겨야 닿던 불멸 칸을, 이제 스크롤만으로 눌러 선택·장착까지 간다. */
  const G = await page.evaluate(() => {
    const g7 = EQUIPS.find(e => e.slot === 'weapon' && e.g === 7);
    const had = S.own[g7.id], eq0 = S.eqSlot.weapon;
    S.own[g7.id] = { n: 1, l: 1 };
    openWeapon(null, 'weapon');
    const g = document.getElementById('wpnGrid');
    const cell = g.querySelector('[data-wpn="' + g7.id + '"]');
    /* 1) 페이지 넘김 없이 스크롤만으로 닿는다 */
    g.scrollTop = cell.offsetTop - 100;
    const visible = cell.offsetTop >= g.scrollTop && cell.offsetTop < g.scrollTop + g.clientHeight;
    /* 2) 클릭 → 선택 전환 + 상단 정보 갱신 */
    cell.click();
    const selName = document.getElementById('wpnName').textContent.trim();
    const selGrade = document.getElementById('wpnGrade').textContent.trim();
    /* 3) 장착 버튼 → S 반영 + 재렌더 «장착 중» 라벨 */
    document.getElementById('wpnBtnEq').onclick();
    const eqNow = S.eqSlot.weapon;
    const tagged = !!g.querySelector('[data-wpn="' + g7.id + '"] .eqt');
    const saved = /"weapon":"?/.test(JSON.stringify(S.eqSlot)) ? S.eqSlot.weapon : null;
    closeWeapon();
    S.eqSlot.weapon = eq0;
    if (had === undefined) delete S.own[g7.id]; else S.own[g7.id] = had;
    return { id: g7.id, name: g7.n, visible, selName, selGrade, eqNow, tagged, saved };
  });
  ok(G.visible, 'G1 불멸 칸에 스크롤만으로 닿는다(페이지 넘김 없음)');
  ok(G.selName === G.name, 'G2 클릭 → 상단 이름이 불멸 무기로 바뀐다', G.selName);
  ok(G.selGrade === '불멸', 'G3 클릭 → 상단 등급 «불멸»', G.selGrade);
  ok(G.eqNow === G.id, 'G4 [장착] → S.eqSlot.weapon 반영', String(G.eqNow));
  ok(G.tagged, 'G5 [장착] → 그 칸에 «장착 중» 라벨 재렌더');

  /* [H] 콘솔 */
  ok(errs.length === 0, 'H1 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nVERIFY186 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
