/* 작업 70 — 출석 보상 팝업 «실동작» 게이트 (T2 기능 완성 규칙).
   레이아웃이 아니라 «버튼을 눌렀을 때 무엇이 바뀌는지» 만 본다.
   실행: node tools/verify70.js   → 마지막 줄이 `VERIFY70 PASS n/n` 이어야 한다. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function launchOpts(){
  const cands = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean);
  for (const p of cands) { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

const R = [];
const ok = (n, c, d) => { R.push({ n, c, d }); console.log((c ? '  ✓ ' : '  ✗ ') + n + (d ? '  — ' + d : '')); };

(async () => {
  let b;
  try { b = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; b = await chromium.launch(o); }
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* 유휴 루프가 재화를 굴려 증분 비교를 망친다(LESSONS 51-③·34-⑤) */
  await p.evaluate(() => { S.autoBuy = false; if (typeof spAuto !== 'undefined') S.spAuto = false; });

  const open = () => p.evaluate(() => { document.querySelector('.side .ibtn[data-pop="attend"]').click(); });

  /* ---------- 1. 열기 · 껍데기 ---------- */
  await p.evaluate(() => { S.att.n = 9; S.att.date = ''; });        /* 2주차(8~14일) · 10일차가 오늘 */
  await open();
  await p.waitForTimeout(320);
  let g = await p.evaluate(() => ({
    on: document.getElementById('modal').classList.contains('on'),
    at70: document.getElementById('modal').classList.contains('at70'),
    title: document.getElementById('mtitle').textContent,
    rings: document.querySelectorAll('#modal .mhead .at-ring').length,
    cards: document.querySelectorAll('#mbox .at-c').length,
    wide: document.querySelectorAll('#mbox .at-c7').length,
    labels: [...document.querySelectorAll('#mbox .at-bd>i')].map((e) => e.textContent),
    got: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map((e) => e.classList.contains('got')),
    today: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map((e) => e.classList.contains('today')),
    checks: document.querySelectorAll('#mbox .at-ck').length,
    crowns: document.querySelectorAll('#mbox .at-cr').length,
    d7frames: document.querySelectorAll('#mbox .at-c7 .at-rw').length,
    hiBands: [...document.querySelectorAll('#mbox .at-bd')].map((e) => e.classList.contains('hi')),
    txt: document.getElementById('mbox').textContent,
  }));
  ok('팝업 열림 — #modal.on.at70', g.on && g.at70);
  ok('타이틀 «출석 보상» (신규 유저 문구 없음)', g.title === '출석 보상' && !/신규/.test(g.title), g.title);
  ok('캘린더 고리 2개', g.rings === 2, String(g.rings));
  ok('카드 = 3열×2행 6장 + 7일차 전폭 1장', g.cards === 6 && g.wide === 1, g.cards + '+' + g.wide);
  ok('현재 주차 자동 표시 (S.att.n=9 → 8~14일 차)',
    g.labels.join(',') === '8일 차,9일 차,10일 차,11일 차,12일 차,13일 차,14일 차', g.labels.join(','));
  ok('수령 완료 = 8·9일 차 2장 (✔ 오버레이 2개)',
    g.got.filter(Boolean).length === 2 && g.checks === 2 && g.got[0] && g.got[1]);
  ok('오늘 = 10일 차 1장 (👑 포인터 1개)',
    g.today.filter(Boolean).length === 1 && g.today[2] && g.crowns === 1);
  ok('7일차 카드 보상 3칸', g.d7frames === 3, String(g.d7frames));
  ok('강조 밴드 = 오늘(10일) + 7일차(14일) 2개', g.hiBands.filter(Boolean).length === 2 && g.hiBands[2] && g.hiBands[6]);
  ok('NaN/undefined 없음', !/NaN|undefined/.test(g.txt));

  /* ---------- 2. 오늘 카드 탭 → 실제 지급 ---------- */
  const before = await p.evaluate(() => ({ dia: S.dia, gold: S.gold, rel: S.relic, n: S.att.n, date: S.att.date,
    hud: (document.querySelector('#top [data-cur="dia"]') || {}).textContent || '' }));
  await p.evaluate(() => { document.querySelector('#mbox [data-att]').click(); });
  await p.waitForTimeout(420);
  const after = await p.evaluate(() => ({ dia: S.dia, gold: S.gold, rel: S.relic, n: S.att.n, date: S.att.date,
    today: typeof today === 'function' ? today() : '',
    hud: (document.querySelector('#top [data-cur="dia"]') || {}).textContent || '',
    got: [...document.querySelectorAll('#mbox .at-c,#mbox .at-c7')].map((e) => e.classList.contains('got')),
    crowns: document.querySelectorAll('#mbox .at-cr').length,
    checks: document.querySelectorAll('#mbox .at-ck').length,
    on: document.getElementById('modal').classList.contains('at70'),
    badge: getComputedStyle(document.querySelector('.side .ibtn[data-pop="attend"] .bdg')).display,
    fx: document.querySelectorAll('#fxl > *').length,
  }));
  /* 10일차 = i%5===0 → 유물석 400+10*25 = 650 */
  ok('오늘 카드 탭 → 보상 실지급 (S 반영)', after.dia + after.rel + after.gold > before.dia + before.rel + before.gold,
    `Δdia ${after.dia - before.dia} · Δrel ${after.rel - before.rel} · Δgold ${Math.round(after.gold - before.gold)}`);
  ok('10일차 보상 = 유물석 650 (ATTEND 데이터 그대로)', after.rel - before.rel === 650, String(after.rel - before.rel));
  ok('S.att.n +1 · S.att.date = 오늘', after.n === before.n + 1 && after.date === after.today);
  ok('팝업이 그 자리에서 재렌더 (닫히지 않음)', after.on);
  ok('수령한 칸이 ✔ 로 바뀌고 👑 사라짐 (내일 칸은 «미래» 유지)',
    after.checks === 3 && after.crowns === 0 && after.got[2] && !after.got[3],
    `✔${after.checks} 👑${after.crowns}`);
  ok('58 연출 발생 (#fxl 에 노드)', after.fx > 0, String(after.fx));
  ok('좌측 사이드 출석 배지 꺼짐', after.badge === 'none', after.badge);

  /* ---------- 3. 재입력 차단 · 저장 ---------- */
  const dbl = await p.evaluate(() => {
    const d0 = S.dia, r0 = S.relic, g0 = S.gold;
    claimAttend(null);
    return { same: S.dia === d0 && S.relic === r0 && S.gold === g0, n: S.att.n };
  });
  ok('하루 두 번 수령 불가', dbl.same && dbl.n === after.n);

  await p.evaluate(() => save());
  await p.reload();
  await p.waitForTimeout(900);
  const rel = await p.evaluate(() => ({ n: S.att.n, date: S.att.date, rel: S.relic }));
  ok('새로고침 후에도 유지 (세이브 반영)', rel.n === after.n && rel.date === after.date && rel.rel >= after.rel,
    `n ${rel.n} · ${rel.date}`);

  /* ---------- 4. 다른 팝업 오염 없음 ---------- */
  await open();
  await p.waitForTimeout(260);
  const leak = await p.evaluate(() => {
    document.getElementById('modal').click();                       /* 딤 탭 = 닫기 */
    popup('테스트', '<p>ok</p>');
    const m = document.getElementById('modal');
    const ring = document.querySelector('#modal .mhead .at-ring');
    return { at70: m.classList.contains('at70'),
      ringVis: ring ? getComputedStyle(ring).display : 'none',
      /* rect 는 60 쥬시의 열기/닫기 스프링 도중 값이라 못 쓴다 — 계산된 스타일로 본다 */
      headH: getComputedStyle(document.querySelector('#modal .mhead')).height };
  });
  ok('딤 탭으로 닫히고 다른 팝업에 at70 이 안 남음', !leak.at70);
  ok('공용 헤더에 붙인 고리가 다른 팝업에서는 숨음', leak.ringVis === 'none', leak.ringVis);
  ok('공용 모달 헤더 높이 원복 (91px)', leak.headH === '91px', String(leak.headH));

  ok('콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));

  await b.close();
  const pass = R.filter((x) => x.c).length;
  console.log('\nVERIFY70 ' + (pass === R.length ? 'PASS' : 'FAIL') + ' ' + pass + '/' + R.length);
  process.exit(pass === R.length ? 0 : 1);
})();
