/* verify52.js — 작업 52 ▦ 메뉴 회귀 게이트.
   ① 기하: 패널·꼬리·9칸·아이콘/라벨 슬롯이 측정표 `docs/measure/52-메뉴팝업.md` 와 일치하는가
   ② 기능: 열기/닫기 · ▦→✕ 스왑 · 9칸이 «눌렀을 때 실제로 무엇을 바꾸는가»
   ③ 회귀: 메뉴를 열고 닫아도 메인 화면 고정 요소가 Δ0 인가 (작업 38 «패널 오버레이화» 유지)
   실행: node tools/verify52.js        → 마지막 줄 `VERIFY52 PASS n/n`
   LESSONS 50-① — 위임 핸들러를 타야 하는 클릭은 query+click 을 같은 evaluate 안에 넣는다. */
const { chromium } = require('playwright');
const path = require('path');

const T = [];
const ok = (n, m) => T.push([true, n, m || '']);
const no = (n, m) => T.push([false, n, m || '']);
const eq = (n, got, exp, tol = 0.6) =>
  Math.abs(got - exp) <= tol ? ok(n, `${got} (기대 ${exp})`) : no(n, `${got} ≠ ${exp} (Δ${(got - exp).toFixed(1)})`);

(async () => {
  const b = await chromium.launch();
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
  eq('패널 x', col.x, 761); eq('패널 y', col.y, 141); eq('패널 폭', col.w, 138);
  /* 높이는 «레퍼런스 8칸 887» + «35 인계 임시 9번째 칸 110» = 997.
     패스가 좌측 사이드로 옮겨 가면 887 로 되돌리고 이 기대값도 같이 내린다. */
  eq('패널 높이(8칸 887 + 임시 패스칸 110)', col.h, 997);
  const tl = await R('#mnw .mn-tail');
  eq('꼬리 x(패널 우변)', tl.x, 899); eq('꼬리 y', tl.y, 183);
  eq('꼬리 길이', tl.w, 36); eq('꼬리 밑변', tl.h, 46);
  const mb = await R('#menub');
  eq('꼬리 꼭짓점 x = ▦ 좌변', tl.x + tl.w, mb.x + 1, 1.5);

  for (let i = 1; i <= 9; i++) {
    const r = await R(`#mnw .mn-b:nth-of-type(${i})`);
    eq(`칸${i} x`, r.x, 780); eq(`칸${i} 폭`, r.w, 99); eq(`칸${i} 높이`, r.h, 100);
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

  /* ---- ② 기능: 9칸이 실제로 무엇을 바꾸는가 ---- */
  const openers = [
    ['notice', '공지',     () => p.$eval('#modal', e => e.classList.contains('on'))],
    ['mail',   '우편',     () => p.$eval('#modal', e => e.classList.contains('on'))],
    ['rank',   '랭킹',     () => p.$eval('#modal', e => e.classList.contains('on'))],
    ['guide',  '길라잡이', () => p.$eval('#modal', e => e.classList.contains('on'))],
    ['bag',    '가방',     () => p.$eval('#modal', e => e.classList.contains('on'))],
    ['saver',  '절전',     () => p.$eval('#modal', e => e.classList.contains('on'))],
    ['conf',   '설정',     () => p.$eval('#modal', e => e.classList.contains('on'))],
    ['lounge', '게임 라운지', () => p.$eval('#modal', e => e.classList.contains('on'))],
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
    await p.evaluate(() => { const m = document.getElementById('modal'); if (m) m.classList.remove('on');
      const w = document.getElementById('psw'); if (w) w.classList.remove('on'); });
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
  await b.close();

  let pass = 0;
  for (const [good, n, m] of T) { console.log(`  ${good ? '✓' : '✗'} ${n}${m ? '  — ' + m : ''}`); if (good) pass++; }
  console.log(`\nVERIFY52 ${pass === T.length ? 'PASS' : 'FAIL'} ${pass}/${T.length}`);
  process.exit(pass === T.length ? 0 : 1);
})();
