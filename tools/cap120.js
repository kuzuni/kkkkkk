/* 작업 120 — 89 유물 페이지(#relw) «영역 꽉 채우기» 캡처 하네스.
   120 의 채점 대상은 «레퍼런스 대조» 가 아니라 «재화 바 밑 ~ 탭바 위 영역을 꽉 채우는가» 다.
   그래서 89(cap89.js)처럼 패널만 크롭하지 않고 **프레임 전체**를 찍는다 —
   검은 띠는 «패널 밖» 에 생기므로 크롭하면 정작 보려던 결함이 안 보인다.

   실행: node tools/cap120.js <회차> [높이…]
     예) node tools/cap120.js r1              → 1600·1920·2280·2600 4장
         node tools/cap120.js r2 2280         → 2280 한 장
   출력: docs/review/120-<회차>-<H>.png (1080×H 전체 프레임)

   상태 주입은 cap89 와 같다 — 유물 10종 보유·점등(Lv 두 자리 포함) + 유물조각 충분.
   비용 숫자는 119 곡선(100 + 소환 횟수)의 실제 값을 그대로 둔다(레퍼런스 822 고정 안 함) —
   120 은 잉크 대조가 아니라 배치 채움을 본다.

   ★ **고정 대기(waitForTimeout)로 찍으면 안 된다 — 60 쥬시 오픈 애니메이션 중간이 찍힌다.**
   `#relw` 는 `JZ_OVID` 에 들어 있어 열 때 팝인이 돈다. 실측(2280):
     t=80·150ms → 슬롯 130.6px(0.865배·중심으로 수축) · t=250 → 144.0 · t=350 → 153.9(오버슛)
     · t≥450 → 151.0 로 안정.
   2회차 캡처가 450ms 경계에 걸려 **수축 프레임**이 찍혔고, 비평가 2명이 독립적으로
   «슬롯이 4칸뿐 · 금테가 아예 없다 · 슬롯 크기가 145~157 로 제각각» 이라고 보고했다
   (수축하면 금테 5px 이 프레임 밖으로 밀리고 행 y 가 어긋나 칸이 사라진 것처럼 보인다).
   그래서 **기하가 실제로 멈출 때까지 폴링**하고, 멈춘 뒤에도 규격(슬롯 151×151 ×10)을
   확인한 다음에만 찍는다. 어긋나면 저장하지 않고 실패한다. */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const args = process.argv.slice(2);
const RND = args[0] || 'r1';
const HEIGHTS = (args.slice(1).length ? args.slice(1) : ['1600', '1920', '2280', '2600']).map(Number);
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const b = await launch(chromium);
  let errTotal = 0;
  for (const H of HEIGHTS) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL);
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      RELICS.forEach((r, i) => { S.own[r.id] = { n: 0, l: [11, 10, 13, 9, 10, 12, 10, 11, 9, 10][i] }; });
      S.relic = 99999;
      document.querySelector('#tabbar [data-t="box"]').click();
    });
    /* ① 기하가 멈출 때까지 — 슬롯 10칸 bbox 가 연속 4회(≈240ms) 완전히 같아야 통과 */
    const settle = await p.evaluate(async () => {
      const sig = () => [...document.querySelectorAll('#relw .rw-c')]
        .map(e => { const q = e.getBoundingClientRect();
          return `${q.left.toFixed(2)},${q.top.toFixed(2)},${q.width.toFixed(2)}`; }).join('|');
      const wait = ms => new Promise(r => setTimeout(r, ms));
      let prev = '', same = 0, waited = 0;
      while (waited < 6000) {
        await wait(60); waited += 60;
        const s = sig();
        same = (s === prev && s !== '') ? same + 1 : 0;
        prev = s;
        if (same >= 4) break;
      }
      /* 애니메이션이 남아 있으면 끝까지 */
      const anims = document.getElementById('relw').getAnimations
        ? document.getElementById('relw').getAnimations() : [];
      return { waited, settled: same >= 4, anims: anims.length };
    });

    /* ② 멈춘 기하가 «규격» 인가 — 슬롯 10칸 151×151 · 금테가 패널 가장자리 */
    const spec = await p.evaluate(() => {
      const relw = document.getElementById('relw');
      const slots = [...relw.querySelectorAll('.rw-c')];
      const panel = relw.querySelector('.rw-panel').getBoundingClientRect();
      const fr = relw.querySelector('.rw-frame').getBoundingClientRect();
      const bad = slots.filter(e => { const q = e.getBoundingClientRect();
        return Math.abs(q.width - 151) > 0.6 || Math.abs(q.height - 151) > 0.6; });
      return {
        n: slots.length, badN: bad.length,
        frameInset: [+(fr.left - panel.left).toFixed(2), +(panel.right - fr.right).toFixed(2),
                     +(fr.top - panel.top).toFixed(2), +(panel.bottom - fr.bottom).toFixed(2)],
      };
    });
    const specOK = spec.n === 10 && spec.badN === 0 && spec.frameInset.every(v => Math.abs(v - 2) < 0.6);

    if (!specOK) {
      console.log(`  FAIL ${H}: 애니메이션이 안 끝났거나 기하가 규격이 아니다 — ` +
        `슬롯 ${spec.n}칸(규격 이탈 ${spec.badN}) · 금테 인셋 ${spec.frameInset.join('/')} ` +
        `(settle ${settle.waited}ms · ${settle.settled ? '정지' : '미정지'} · anim ${settle.anims})`);
      errTotal++;
      await ctx.close();
      continue;                      /* 잘못된 프레임은 저장하지 않는다 */
    }

    const out = `docs/review/120-${RND}-${H}.png`;
    await p.screenshot({ path: out });
    console.log(`saved ${out} (1080×${H} full frame) · settle ${settle.waited}ms · ` +
      `슬롯 10칸 151² · 금테 인셋 2 · console errors ${errs.length}`);
    errs.slice(0, 3).forEach(e => console.log('   ' + e));
    errTotal += errs.length;
    await ctx.close();
  }
  await b.close();
  if (errTotal) process.exitCode = 1;
})();
