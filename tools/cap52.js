/* 작업 52 — ▦ 메뉴 열림 상태 캡처 + 기하 덤프 (1080×2280).
   기준 화면비 9:19. 레퍼런스 y − 84 = 프레임 y.
   실행: node tools/cap52.js [출력경로] [--geo]
     --geo  캡처 대신(겸해서) 주요 요소의 프레임 좌표를 JSON 으로 찍는다.
   LESSONS 28-③ — 캔버스가 흰 잉크 스캔을 오염시키므로 캡처 직전에 #view 를 숨긴다.
   LESSONS 51-③ — 유휴 루프가 굴리는 값(닉네임·전투력)은 픽셀 회귀에서 빼야 한다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const out = process.argv[2] || 'docs/review/52-r1.png';
const GEO = process.argv.includes('--geo');

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);

  /* 메뉴 열기 — 위임 핸들러를 타야 하므로 query 와 click 을 같은 태스크 안에서(LESSONS 50-①) */
  await p.evaluate(() => { document.querySelector('#menub').click(); });
  await p.waitForTimeout(320);                 /* 펼침 트랜지션이 끝난 정지 상태 */

  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const g = {};
    const R = (k, sel) => {
      const e = document.querySelector(sel); if (!e) { g[k] = null; return; }
      const r = e.getBoundingClientRect();
      g[k] = { x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    R('app', '#app'); R('menub', '#menub'); R('panel', '#mnw .mn-col'); R('tail', '#mnw .mn-tail');
    for (let i = 1; i <= 8; i++) {
      R('b' + i, `#mnw .mn-b:nth-of-type(${i})`);
      R('i' + i, `#mnw .mn-b:nth-of-type(${i}) .mn-i`);
      R('l' + i, `#mnw .mn-b:nth-of-type(${i}) .mn-l`);
    }
    return g;
  });

  if (GEO) {
    console.log(JSON.stringify(geo, null, 1));
    /* ref 환산 — 프레임 y + 84 = 레퍼런스 y */
    console.log('-- ref 환산(y+84) --');
    for (const [k, v] of Object.entries(geo)) if (v) console.log(`  ${k}\tref x${v.x} y${(v.y + 84).toFixed(1)}  ${v.w}x${v.h}`);
  }

  /* LESSONS 28-③ 대로 캔버스를 숨겨 회차 간 재현성을 확보하되, **그냥 숨기면 안 된다** —
     이 화면의 패널·칸은 전부 반투명이라 뒤가 새까매지면 «불투명한 판» 으로 찍힌다
     (실제로 1회차 비평가가 «패널 대비가 5배 약하다 / 사실상 불투명» 으로 읽었다).
     그래서 캔버스를 숨긴 자리에 **평탄한 중간톤**을 깐다 — 재현성(고정색)과 투명도 가시성을 둘 다 만족한다.
     색은 레퍼런스 52 의 던전 바닥 실측값(#6A3844)이라 알파가 레퍼런스와 같은 배경 위에서 비교된다. */
  await p.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const st = document.getElementById('stagearea'); if (st) st.style.background = '#6A3844';
  });
  await p.waitForTimeout(60);
  await p.screenshot({ path: out });
  console.log('captured ' + out + (errs.length ? '  ⚠ 콘솔 에러 ' + errs.length + ': ' + errs.join(' | ') : '  콘솔 에러 0'));
  await b.close();
})();
