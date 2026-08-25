/* verify52.js — 작업 52 ▦ 메뉴 회귀 게이트.
   ① 기하: 패널·꼬리·7칸·아이콘/라벨 슬롯이 측정표 `docs/measure/52-메뉴팝업.md` 와 일치하는가
   ② 기능: 열기/닫기 · ▦→✕ 스왑 · 7칸이 «눌렀을 때 실제로 무엇을 바꾸는가»
   ⚠ 칸 수는 **9 → 7** 이다(2026-08-25 작업 71 — 레퍼런스 8칸에서 «공지»·«게임 라운지» 삭제,
     임시 «패스» 칸은 유지). 71 이 index.html 만 고치고 이 게이트를 안 고쳐 4회차 시작 시 FAIL 이었다
     (LESSONS 52-② 의 재현 — «갈아끼우라» 고 인계한 자리를 보는 게이트도 같이 옮겨야 한다).
   ③ 회귀: 메뉴를 열고 닫아도 메인 화면 고정 요소가 Δ0 인가 (작업 38 «패널 오버레이화» 유지)
   실행: node tools/verify52.js        → 마지막 줄 `VERIFY52 PASS n/n`
   LESSONS 50-① — 위임 핸들러를 타야 하는 클릭은 query+click 을 같은 evaluate 안에 넣는다. */
/* 127 — 모듈 해석 + 번들 브라우저 폴백은 tools/pwlaunch.js 공용. 여기 있던
   `require('playwright')` + `chromium.launch()` 는 클라우드 러너(미리 깔린
   /opt/pw-browsers, 빌드 번호 불일치)에서 `Executable doesn't exist` 로 즉사했다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const T = [];
const ok = (n, m) => T.push([true, n, m || '']);
const no = (n, m) => T.push([false, n, m || '']);
const eq = (n, got, exp, tol = 0.6) =>
  Math.abs(got - exp) <= tol ? ok(n, `${got} (기대 ${exp})`) : no(n, `${got} ≠ ${exp} (Δ${(got - exp).toFixed(1)})`);

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  const R = (sel) => p.evaluate((s) => {
    const A = document.getElementById('app').getBoundingClientRect();
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  }, sel);

  /* ---- ② 기능: 초기 상태 ---- */
  ok('초기 상태: 메뉴 닫힘', await p.$eval('#mnw', e => !e.classList.contains('on')) ? 'on 클래스 없음' : '');
  const shut = await p.$eval('#mnw', e => getComputedStyle(e).display);
  eq('닫힘일 때 #mnw display:none', shut === 'none' ? 1 : 0, 1);

  /* ---- 열기 ---- */
  await p.evaluate(() => document.getElementById('menub').click());
  await p.waitForTimeout(320);
  ok('▦ 클릭 → 메뉴 열림', await p.$eval('#mnw', e => e.classList.contains('on')) ? 'on' : 'FAIL');
  ok('▦ → ✕ 스왑', await p.$eval('#menub', e => e.classList.contains('mnon')) ? 'mnon' : 'FAIL');
  const sq = await p.$eval('#menub s', e => getComputedStyle(e).display);
  eq('열림일 때 ▦ 4분할 사각형 숨김', sq === 'none' ? 1 : 0, 1);
  const mx = await p.$eval('#menub .mx', e => getComputedStyle(e).display);
  eq('열림일 때 ✕ 표시', mx === 'block' ? 1 : 0, 1);

  /* ---- ① 기하 (측정표 기준. 프레임 좌표) ---- */
  const col = await R('#mnw .mn-col');
  eq('패널 x', col.x, 761); eq('패널 y', col.y, 128.5); eq('패널 폭', col.w, 138);
  /* 검산식(LESSONS 52-①): 칸수×100 + (칸수−1)×10 + 상20.5 + 하20.
     레퍼런스 8칸이면 910, 작업 71 이후의 실칸 6 + 임시 «패스» 1 = **7칸이면 800**.
     패스가 좌측 사이드로 옮겨 가면 6칸 690 으로 내리고 이 기대값도 같이 내린다. */
  eq('패널 높이(7칸 = 6실칸 + 임시 패스칸)', col.h, 800);
  const tl = await R('#mnw .mn-tail');
  eq('꼬리 x(패널 우변)', tl.x, 899); eq('꼬리 y', tl.y, 181.5);
  eq('꼬리 길이', tl.w, 29); eq('꼬리 밑변', tl.h, 46, 1);   /* border-width 는 레이아웃이 정수로 내림한다 — 22.75 로 적으면 44 가 된다 */
  const mb = await R('#menub');
  /* 꼬리 꼭짓점 ref x926 은 ▦ 좌변(934)에 «닿지 않는다» — 8px 떨어져 있다(y289 단면 실측). */
  eq('꼬리 꼭짓점 x (ref 928 — 4회차 A·B 합치)', tl.x + tl.w, 928, 1);
  ok('▦ 좌변까지 남는 틈', `${(mb.x - (tl.x + tl.w)).toFixed(1)}px (ref 934−928 = 6)`);

  const NB = await p.$$eval('#mnw .mn-b', es => es.length);
  eq('칸 개수(작업 71 이후 = 6 + 임시 패스 1)', NB, 7);
  for (let i = 1; i <= NB; i++) {
    const r = await R(`#mnw .mn-b:nth-of-type(${i})`);
    eq(`칸${i} x`, r.x, 780); eq(`칸${i} 폭`, r.w, 100); eq(`칸${i} 높이`, r.h, 100);
    eq(`칸${i} y (pitch 110)`, r.y, 149 + (i - 1) * 110);
    const ic = await R(`#mnw .mn-b:nth-of-type(${i}) .mn-i`);
    /* 슬롯 중심의 기준은 칸top+32(측정표 §3-1)이고, 거기에 «이 이모지의 잉크가 라인박스 중앙에서 벗어난 만큼»을
       되돌리는 --dy 가 더해진다. 즉 검사해야 할 값은 «슬롯 중심 − dy» 다. 그냥 32 로 재면 --dy 를 준 칸이 전부 실패한다.
       8번(.gl)은 초록 타일이 아이콘 슬롯을 겸하므로 기준이 44.5 다(ref 타일 y1020..1074 = 칸(top 1003) 로컬 17..71). */
    const dy = await p.evaluate((n) => {
      const e = document.querySelector(`#mnw .mn-b:nth-of-type(${n}) .mn-i`);
      return parseFloat(getComputedStyle(e).getPropertyValue('--dy')) || 0;
    }, i);
    const base = await p.evaluate((n) =>
      document.querySelector(`#mnw .mn-b:nth-of-type(${n})`).classList.contains('gl') ? 44.5 : 42.7, i);
    eq(`칸${i} 아이콘 슬롯 중심 y (칸top+${base}, --dy ${dy})`, ic.y + ic.h / 2 - r.y - dy, base);
    const lb = await R(`#mnw .mn-b:nth-of-type(${i}) .mn-l`);
    eq(`칸${i} 라벨 중심 y (칸top+80)`, lb.y + lb.h / 2 - r.y, 80);
  }

  /* ---- ② 기능: 7칸이 실제로 무엇을 바꾸는가 ----
     «공지»·«게임 라운지» 는 작업 71(저장소 주인 지시)로 삭제됐다 — 칸이 없으므로 프로브도 뺐다.
     되살아나면 `['notice','공지',…]` · `['lounge','게임 라운지',…]` 를 여기에 되돌린다. */
  const openers = [
    ['mail',   '우편',     () => p.$eval('#modal', e => e.classList.contains('on'))],
    /* 작업 54(랭킹)·55(설정)·56(절전)이 화면을 올리면서 52 주석의 «분기 한 줄 교체» 지시대로
       목적지를 각자의 전용 오버레이로 바꿨다. 프로브도 같이 옮긴다 — 이 자리는 화면이 하나 올라올 때마다
       움직인다(LESSONS 52-⑤). `#modal` 을 보는 프로브가 남아 있으면 «칸이 안 열린다» 로 오진한다. */
    ['rank',   '랭킹',     () => p.$eval('#rkw', e => e.classList.contains('on')).catch(() => false)],
    ['guide',  '길라잡이', () => p.$eval('#modal', e => e.classList.contains('on'))],
    /* 작업 53 이 «가방» 화면을 올리면서 52 주석의 지시대로 분기를 `openBag()` 으로 갈아끼웠다 —
       목적지가 `#modal` 이 아니라 전용 오버레이 `#bagw` 다. 화면이 올라올 때마다 여기 프로브도 같이 옮긴다. */
    ['bag',    '가방',     () => p.$eval('#bagw', e => e.classList.contains('on')).catch(() => false)],
    ['saver',  '절전',     () => p.$eval('#svw', e => e.classList.contains('on')).catch(() => false)],
    ['conf',   '설정',     () => p.$eval('#cfw', e => e.classList.contains('on')).catch(() => false)],
    ['pass',   '패스',     () => p.$eval('#psw', e => getComputedStyle(e).display !== 'none').catch(() => false)],
  ];
  for (const [k, label, probe] of openers) {
    await p.evaluate(() => { const m = document.getElementById('modal'); if (m) m.classList.remove('on'); });
    await p.evaluate(() => document.getElementById('menub').click());   /* 열기 */
    await p.waitForTimeout(200);
    await p.evaluate((kk) => document.querySelector(`#mnw [data-mn="${kk}"]`).click(), k);
    await p.waitForTimeout(350);
    const opened = await probe();
    const closed = await p.$eval('#mnw', e => !e.classList.contains('on'));
    if (opened && closed) ok(`칸 «${label}» → 목적지 열림 + 메뉴 닫힘`);
    else no(`칸 «${label}»`, `열림=${opened} 메뉴닫힘=${closed}`);
    await p.evaluate(() => {
      /* 다음 칸을 재기 전에 열린 목적지를 전부 닫는다. 화면이 늘어나면 여기 id 도 같이 늘린다.
         절전(#svw)은 `#app.sv` 클래스와 렌더 스킵까지 걸어서 closeSaver() 를 부르는 편이 안전하다. */
      const off = (id) => { const e = document.getElementById(id); if (e) e.classList.remove('on'); };
      ['modal', 'psw', 'bagw', 'rkw', 'cfw'].forEach(off);
      if (typeof window.closeSaver === 'function') window.closeSaver(); else { off('svw'); document.getElementById('app').classList.remove('sv'); }
    });
    await p.waitForTimeout(150);
  }

  /* ---- 바깥 클릭으로 닫기 ---- */
  await p.evaluate(() => document.getElementById('menub').click());
  await p.waitForTimeout(200);
  await p.evaluate(() => document.getElementById('mnw').click());
  await p.waitForTimeout(200);
  ok('바깥 클릭 → 닫힘', await p.$eval('#mnw', e => !e.classList.contains('on')) ? 'closed' : 'FAIL');
  ok('닫으면 ✕ → ▦ 복귀', await p.$eval('#menub', e => !e.classList.contains('mnon')) ? '▦' : 'FAIL');

  /* ---- ③ 회귀: 메뉴 열림이 메인 고정 요소를 밀지 않는가 (작업 38 유지) ---- */
  const FIX = ['#top', '#tabbar', '#sideL', '#menub', '#stinfo'];
  const before = {};
  for (const s of FIX) before[s] = await R(s);
  await p.evaluate(() => document.getElementById('menub').click());
  await p.waitForTimeout(250);
  for (const s of FIX) {
    const a = before[s], c = await R(s);
    if (!a || !c) { no(`고정요소 ${s}`, '없음'); continue; }
    const d = Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y), Math.abs(a.w - c.w), Math.abs(a.h - c.h));
    d <= 0.6 ? ok(`메뉴 열려도 ${s} Δ0`) : no(`${s} 가 ${d}px 움직임`);
  }

  eq('콘솔 에러 0', errs.length, 0);
  await ctx.close();

  /* ---- ④ 짧은 프레임 — 메뉴를 «열어 놓고» 잘림을 본다 (LESSONS 20-④ / 22-④) ----
     오버레이 자체는 `inset:0` 이라 프레임 안이므로 smoke 의 «프레임 잘림» 검사에는 **안 걸린다.**
     패널이 #app 밖으로 나가는지 · 탭바(bottom 180)를 파고드는지 직접 재야 잡힌다.
     20 과 22 가 이 자리에서 «하단이 통째로 삼켜지는» 결함을 각각 한 번씩 냈다. */
  for (const [w, h] of [[1080, 2280], [1080, 1920], [1920, 1080], [1024, 768], [1080, 2520]]) {
    const c2 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p2 = await c2.newPage();
    await p2.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p2.waitForTimeout(800);
    await p2.evaluate(() => document.getElementById('menub').click());
    await p2.waitForTimeout(280);
    const r = await p2.evaluate(() => {
      const A = document.getElementById('app').getBoundingClientRect();
      const col = document.querySelector('#mnw .mn-col').getBoundingClientRect();
      const tb = document.getElementById('tabbar').getBoundingClientRect();
      const last = document.querySelector('#mnw .mn-b:last-of-type').getBoundingClientRect();
      return { appH: +A.height.toFixed(0), top: +(col.top - A.top).toFixed(1), bot: +(col.bottom - A.top).toFixed(1),
        lastBot: +(last.bottom - A.top).toFixed(1), tabTop: +(tb.top - A.top).toFixed(1) };
    });
    const msg = `#app h${r.appH} · 패널 ${r.top}..${r.bot} · 마지막칸 하단 ${r.lastBot} · 탭바 상단 ${r.tabTop}`;
    if (r.bot > r.appH + 0.5) no(`${w}×${h} 메뉴 프레임 밖`, msg);
    else if (r.bot > r.tabTop + 0.5) no(`${w}×${h} 메뉴가 탭바 침범`, msg);
    else ok(`${w}×${h} 메뉴 열림 — 잘림·탭바 침범 없음`, msg);
    await c2.close();
  }

  await b.close();

  let pass = 0;
  for (const [good, n, m] of T) { console.log(`  ${good ? '✓' : '✗'} ${n}${m ? '  — ' + m : ''}`); if (good) pass++; }
  console.log(`\nVERIFY52 ${pass === T.length ? 'PASS' : 'FAIL'} ${pass}/${T.length}`);
  process.exit(pass === T.length ? 0 : 1);
})();
