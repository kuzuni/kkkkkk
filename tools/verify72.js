/* 작업 72 회귀 게이트 — 03 던전 카드 우측 썸네일 슬롯.
   실행: node tools/verify72.js   → 마지막 줄이 `VERIFY72 n/n PASS` 여야 한다.
   본다: ① 카드 5장 전부 슬롯이 있고 기하가 레퍼런스 실측(카드 안쪽 우측 315×334)과 일치
        ② 슬롯이 클릭을 먹지 않는다(pointer-events:none) — 카드 진입이 살아 있어야 한다
        ③ z 순서: 썸네일이 프레임(.fr)·텍스트·잠금 딤(.lk) «아래»
        ④ 잠금 카드는 썸네일도 딤 아래로 들어간다
        ⑤ 콘솔 에러 0 */
/* 110 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 복붙돼 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린 /opt/pw-browsers,
   빌드 번호 불일치)에서 즉사한다 — 실제로 이 게이트가 그래서 못 돌았다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

(async () => {
  /* 97 §5 가 캔버스 잉크를 읽는다 — file:// 이미지는 캔버스를 오염시켜 getImageData 가 막힌다 */
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(1200);

  const d = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#dunList .dnc')];
    return cards.map((c) => {
      const cr = c.getBoundingClientRect();
      const th = c.querySelector('.th');
      if (!th) return { th: null };
      const tr = th.getBoundingClientRect();
      const kids = [...c.children].map((e) => e.className);
      return {
        th: { dx: +(tr.left - cr.left).toFixed(1), dy: +(tr.top - cr.top).toFixed(1), w: +tr.width.toFixed(1), h: +tr.height.toFixed(1) },
        pe: getComputedStyle(th).pointerEvents,
        emoji: (th.textContent || '').trim(),
        sx: getComputedStyle(th.querySelector('em')).transform,
        iTh: kids.indexOf('th'), iSh: kids.indexOf('sh'), iFr: kids.indexOf('fr'), iLk: kids.indexOf('lk'),
        locked: !!c.querySelector('.lk'),
        card: { w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) }
      };
    });
  });

  /* 카드별 기대 슬롯 — 레퍼런스 실측(비평가 O·P 교차 확인): 카드1 x712 rel top 36 / 카드2 x726 rel top 52.
     잠금 카드 3~6 은 개별 측정이 불가(딤)해 카드1·2 중간값(폭 305 · top 42)을 쓴다.
     ⚠ 2026-08-26(97): 작업 90 이 던전을 5장 → **6장**(골드·다이아·유물조각 4단)으로 재편하면서
     이 기대치가 5장에 멈춰 있어 게이트가 `EXP[5] undefined` 로 즉사하고 있었다(90 은 verify90 만 돌렸다).
     구성 변경이 게이트를 앞지른 것이라 카드 수만 따라 올린다 — 기하 자체는 relic 3종과 같다. */
  const EXP = [
    { w: 311, h: 305, dy: 36 }, { w: 296, h: 289, dy: 52 },
    { w: 330, h: 330, dy: 11 }, { w: 330, h: 330, dy: 11 },
    { w: 330, h: 330, dy: 11 }, { w: 330, h: 330, dy: 11 }];
  console.log('[1] 슬롯 기하 — 카드 안쪽 우측 정렬(우단 inset 7), 카드별 폭·상단 인셋');
  ok(d.length === 6, `카드 6장 (실제 ${d.length})`);
  d.forEach((c, i) => {
    ok(!!c.th, `카드${i + 1} 썸네일 슬롯 존재`);
    if (!c.th) return;
    const e = EXP[i];
    ok(Math.abs(c.th.w - e.w) <= 1 && Math.abs(c.th.h - e.h) <= 1, `카드${i + 1} 슬롯 ${c.th.w}×${c.th.h} = ${e.w}×${e.h}`);
    ok(Math.abs(c.th.dx - (980 - 7 - e.w)) <= 1, `카드${i + 1} 슬롯 x offset ${c.th.dx} = ${980 - 7 - e.w} (우측 안쪽 정렬)`);
    ok(Math.abs(c.th.dy - e.dy) <= 1, `카드${i + 1} 슬롯 y offset ${c.th.dy} = ${e.dy}`);
    ok(!!c.emoji, `카드${i + 1} 대체 아트 있음 (${c.emoji})`);
    ok(/matrix\(/.test(c.sx), `카드${i + 1} 잉크 폭 정규화 scaleX 적용 (${c.sx})`);
  });

  console.log('[2] 클릭 통과 · z 순서');
  d.forEach((c, i) => {
    if (!c.th) return;
    ok(c.pe === 'none', `카드${i + 1} 슬롯 pointer-events:none`);
    ok(c.iTh > -1 && c.iTh < c.iSh && c.iTh < c.iFr, `카드${i + 1} 썸네일이 .sh/.fr 아래(${c.iTh} < ${c.iSh},${c.iFr})`);
    if (c.locked) ok(c.iLk > c.iTh, `카드${i + 1}(잠금) 딤·자물쇠가 썸네일 위(${c.iLk} > ${c.iTh})`);
  });

  console.log('[2-1] 잠금 카드 씬 아트 자리 — 카드 안쪽 전면(x57~1022, 비평가 P·R·T 교차)');
  const scn = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc')].map((c) => {
    const s = c.querySelector('.scn'); if (!s) return null;
    const cr = c.getBoundingClientRect(), sr = s.getBoundingClientRect();
    return { dx: +(sr.left - cr.left).toFixed(1), w: +sr.width.toFixed(1), h: +sr.height.toFixed(1),
             locked: !!c.querySelector('.lk') };
  }));
  [7, 7, 7, 7].forEach((want, k) => {   /* 90 — 유물조각 던전 4단 */
    const c = scn[k + 2];
    ok(!!c, `잠금 카드${k + 3} 씬 자리 존재`);
    if (c) ok(Math.abs(c.dx - want) <= 1, `잠금 카드${k + 3} 씬 좌단 offset ${c.dx} = ${want}`);
  });
  ok(!scn[0] && !scn[1], '해금 카드 1·2 에는 씬 자리가 없다(레퍼런스도 우측 썸네일뿐)');

  console.log('[3] 카드 진입이 살아 있다 (썸네일 위를 눌러도 세부 팝업이 뜬다)');
  const opened = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc');
    const r = c.getBoundingClientRect();
    document.elementFromPoint(r.left + 800, r.top + 175).closest('.dnc').click();
    return true;
  });
  await p.waitForTimeout(400);
  const hit = await p.evaluate(() => document.elementFromPoint(
    document.querySelector('#dunList .dnc').getBoundingClientRect().left + 800,
    document.querySelector('#dunList .dnc').getBoundingClientRect().top + 175) !== null);
  ok(opened && hit, '썸네일 영역의 히트 타깃이 카드로 잡힌다');

  /* ---- 97 — 레이드 탭 카드도 같은 썸네일 슬롯을 갖는다 ----
     기하는 03 측정표 §3-8 의 던전 카드 값 재사용(카드1 311×305/36 · 카드2 296×289/52 ·
     카드3 330×330/11), 안에 드는 것은 이모지가 아니라 «군주» 스프라이트 캔버스다.
     세 칸을 모두 보려면 잠금(S.best<open)을 풀어야 하고, 알약 겹침은 최고 DPS 가
     가장 길 때가 최악이므로 기록도 크게 넣고 잰다. */
  console.log('[5] 97 — 레이드 카드 썸네일');
  await p.evaluate(() => {
    S.best = 999;
    S.raidBest = { r60: { dmg: 9.9e14, dps: 9.9e12 } };   /* 123 — r30·r120 폐기 */
    setDunSub('raid');
  });
  await p.waitForTimeout(900);
  const rd = await p.evaluate(() => [...document.querySelectorAll('#dunList .dnc.rd')].map((c) => {
    const cr = c.getBoundingClientRect();
    const th = c.querySelector('.th'), cvs = [...c.querySelectorAll('canvas.thcv')];
    const rel = (e) => { const r = e.getBoundingClientRect();
      return { x: +(r.left - cr.left).toFixed(1), y: +(r.top - cr.top).toFixed(1),
               w: +r.width.toFixed(1), h: +r.height.toFixed(1), r2: +(r.right - cr.left).toFixed(1) }; };
    /* 123 — 아레나 카드는 «마주 본 플레이어 2명» 이라 캔버스가 2장이다. 잉크 bbox 는
       두 캔버스를 슬롯 좌표로 합쳐(왼쪽 칸 오프셋 0, 오른쪽 칸 오프셋 = 칸 폭) 하나로 본다. */
    let ink = null;
    let off = 0;
    for (const cv of cvs) {
      const im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, on = 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        if (im[(y * cv.width + x) * 4 + 3] > 8) { on++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (on) {
        const b = { x0: x0 + off, y0, x1: x1 + off, y1 };
        ink = ink ? { x0: Math.min(ink.x0, b.x0), y0: Math.min(ink.y0, b.y0),
                      x1: Math.max(ink.x1, b.x1), y1: Math.max(ink.y1, b.y1) } : b;
      }
      off += cv.width;
    }
    if (ink) { ink.w = ink.x1 - ink.x0 + 1; ink.h = ink.y1 - ink.y0 + 1; }
    return { id: c.dataset.rcard || (c.dataset.arena ? 'arena' : null), th: th ? rel(th) : null,
             cvpx: cvs.length ? [cvs.reduce((a, v) => a + v.width, 0), Math.max(...cvs.map((v) => v.height))] : null,
             ncv: cvs.length, ink,
             pe: th ? getComputedStyle(th).pointerEvents : '',
             kids: [...c.children].map((e) => e.className),
             right: Math.max(...[...c.querySelectorAll('.pill,.sp')].map((e) => rel(e).r2)) };
  }));
  /* 123 — «컨텐츠» 탭 카드는 2장이다: ① DPS 측정장(구 r60, 311×305/36) ② 아레나(구 카드2 규격 296×289/52).
     r30·r120 은 폐기됐다(구 3장 기대치는 여기까지). */
  /* 아레나 칸 여유(tx/ty): 기사 아틀라스 idle 프레임 rect 는 44×46 인데 잉크는 (1,1)~(42,45) 라
     **사방에 투명 1px** 이 들어 있다(실측). 그 1px 이 슬롯으로 늘어나면 가로 148/44 ≈ 3.4px ·
     세로 289/46 ≈ 6.3px 이 된다 — 배치 오차가 아니라 아틀라스 프레임의 여백이므로 그만큼 허용한다. */
  const REXP = [{ w: 311, h: 305, dy: 36 }, { w: 296, h: 289, dy: 52, ncv: 2, tx: 4, ty: 7 }];
  ok(rd.length === 2, `컨텐츠 카드 2장 — 측정장 + 아레나 (실제 ${rd.length})`);
  rd.forEach((c, i) => {
    const e = REXP[i]; if (!e) return;
    ok(!!c.th, `레이드 카드${i + 1}(${c.id}) 썸네일 슬롯 존재`);
    if (!c.th) return;
    ok(Math.abs(c.th.w - e.w) <= 2 && Math.abs(c.th.h - e.h) <= 2,
       `레이드 카드${i + 1} 슬롯 ${c.th.w}×${c.th.h} = ${e.w}×${e.h} (±2)`);
    ok(Math.abs(c.th.x - (980 - 7 - e.w)) <= 2, `레이드 카드${i + 1} 슬롯 x ${c.th.x} = ${980 - 7 - e.w} (우측 안쪽 정렬)`);
    ok(Math.abs(c.th.y - e.dy) <= 2, `레이드 카드${i + 1} 슬롯 y ${c.th.y} = ${e.dy}`);
    ok(!!c.cvpx && c.cvpx[0] === e.w && c.cvpx[1] === e.h,
       `레이드 카드${i + 1} 캔버스 픽셀(합) ${JSON.stringify(c.cvpx)} = [${e.w},${e.h}] (1:1)`);
    ok(c.ncv === (e.ncv || 1), `레이드 카드${i + 1} 캔버스 ${c.ncv}장 = ${e.ncv || 1}장`);
    /* «자리를 잡았다» 와 «자리를 채웠다» 는 다르다(LESSONS 72-③) — 잉크가 슬롯 4변에 5px 안으로 닿아야 한다 */
    ok(!!c.ink, `레이드 카드${i + 1} 스프라이트가 실제로 그려졌다`);
    const tx = e.tx || 5, ty = e.ty || 5;
    if (c.ink) ok(c.ink.x0 <= tx && c.ink.y0 <= ty && c.ink.x1 >= e.w - tx - 1 && c.ink.y1 >= e.h - ty - 1,
       `레이드 카드${i + 1} 잉크가 슬롯 bbox 를 채운다 (${c.ink.x0},${c.ink.y0})~(${c.ink.x1},${c.ink.y1}) ±${tx}/${ty}`);
    ok(c.pe === 'none', `레이드 카드${i + 1} 슬롯 pointer-events:none`);
    const iTh = c.kids.indexOf('th'), iSh = c.kids.indexOf('sh'), iFr = c.kids.indexOf('fr');
    ok(iTh > -1 && iTh < iSh && iTh < iFr, `레이드 카드${i + 1} 썸네일이 .sh/.fr 아래(${iTh} < ${iSh},${iFr})`);
    ok(c.right < c.th.x, `레이드 카드${i + 1} 알약·라벨 우단 ${c.right} < 슬롯 좌단 ${c.th.x} (겹침 0)`);
  });

  console.log('[5-1] 잠금 레이드 카드 — 딤·자물쇠가 썸네일 위');
  const rl = await p.evaluate(() => { S.best = 1; setDunSub('raid');
    return [...document.querySelectorAll('#dunList .dnc.rd')].map((c) => ({
      locked: !!c.querySelector('.lk'), th: !!c.querySelector('.th'),
      kids: [...c.children].map((e) => e.className) })); });
  await p.waitForTimeout(300);
  rl.forEach((c, i) => {
    ok(c.th, `레이드 카드${i + 1} 잠금 상태에서도 썸네일 유지`);
    if (c.locked) ok(c.kids.indexOf('lk') > c.kids.indexOf('th'),
      `레이드 카드${i + 1}(잠금) 딤·자물쇠가 썸네일 위(${c.kids.indexOf('lk')} > ${c.kids.indexOf('th')})`);
  });
  ok(rl.some((c) => c.locked), '기본 상태에서 잠긴 레이드 카드가 있다(딤 순서를 실제로 잰다)');

  console.log('[5-2] 던전 탭 회귀 — 서브탭을 되돌려도 던전 카드 6장이 그대로');
  const back = await p.evaluate(() => { setDunSub('dun');
    return [...document.querySelectorAll('#dunList .dnc')]
      .map((c) => ({ th: !!c.querySelector('.th'), rd: c.classList.contains('rd'),
                     em: !!c.querySelector('.th>em') })); });
  ok(back.length === 6 && back.every((c) => c.th && !c.rd && c.em),
     `던전 탭 복귀 — 카드 ${back.length}장 전부 이모지 썸네일 유지`);

  console.log('[4] 콘솔 에러');
  ok(errs.length === 0, `콘솔 에러 ${errs.length}건`);
  errs.slice(0, 5).forEach((e) => console.log('    ERR', e));

  console.log(`\nVERIFY72 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
