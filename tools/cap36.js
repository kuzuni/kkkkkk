/* 작업 36 — 패스(출석 패스) 탭 채점용 캡처. 1080x2280 (2026-08-25 기준 화면비).
 * 껍데기는 35 와 같은 #psw 다 — cap35.js 의 오염 가드를 그대로 쓴다(LESSONS 04-① · 52 운영메모).
 * 레퍼런스(docs/ref/36-패스-출석패스.jpg)와 «같은 상태»로 맞춘다:
 *   · 접속일 2 · 프리미엄 미활성(프리미엄 칸 🔒) · 리스트 스크롤 최상단(«접속일» 알약이 보인다)
 *   node tools/cap36.js [출력이름]   → docs/review/36-r{n}.png
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const name = process.argv[2] || '36-r1.png';
const out = path.resolve(__dirname, '..', 'docs', 'review', name);

/* 레퍼런스와 같은 진행 상태. 출석 패스는 단계 간격 1일이라 단계 i 의 목표는 i+1 일이다.
   «접속일 2» = 1·2 일차 해금, 3 일차부터 잠금. 레퍼런스는 **무료 1·2 일차가 수령완료(✓)** 다(측정표 §8-3). */
const SAVE = {
  best: 79, stage: 79, gold: 5e9, dia: 120000, relic: 4000,
  att: { n: 2, date: '' },
  pass: { prem: {}, got: { 'att:0:0': 1, 'att:1:0': 1 } },
};

function launchOpts() {
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (e) {} }
  return {};
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { const o = launchOpts(); if (!o.executablePath) throw e; browser = await chromium.launch(o); }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 진입은 실제 경로(▦ 메뉴 → 🎫 패스 → 하단바 «출석» 탭)로 — 위임 핸들러를 그대로 태운다(LESSONS 50-①) */
  await page.evaluate(() => document.getElementById('menub').click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('psGo').click());
  /* «연출이 끝났나» 는 시간이 아니라 «상태» 로 판정한다(cap35 주석 참고 — 1회차 캡처가 그래서 오염됐다) */
  await page.waitForFunction(() => {
    const w = document.getElementById('psw'), m = document.getElementById('modal');
    return getComputedStyle(w).opacity === '1' && getComputedStyle(m).display === 'none';
  }, null, { timeout: 10000 });
  await page.evaluate(() => document.querySelector('#psBar [data-ptab="att"]').click());
  await page.waitForTimeout(300);

  /* 캔버스 데미지 숫자·자동 전투가 캡처를 오염시킨다(LESSONS 28-③ · 58-②) */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
  });
  /* 레퍼런스는 리스트 최상단(측정표 35 §11-5) — «접속일» 알약이 보이는 상태다 */
  await page.evaluate(() => { document.getElementById('psList').scrollTop = 0; });
  await page.waitForTimeout(300);

  const st = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const rows = [...document.querySelectorAll('#psTk .ps-r:not(.ps-hr)')].filter(e => {
      const b = e.getBoundingClientRect(); return b.bottom > 715 && b.top < 2098;
    }).map(e => ({
      hex: e.querySelector('.ps-hex i').textContent,
      lk: e.querySelector('.ps-hex').classList.contains('lk'),
      bx: [...e.querySelectorAll('.ps-bx')].map(b => (b.classList.contains('dn') ? '✓' : '') + b.querySelector('b').textContent)
    }));
    return { hero: r('.ps-hero'), gold: r('.ps-gold'), hdr: r('.ps-hdr'), list: r('.ps-list'),
             bar: r('.ps-bar'), buy: r('.ps-buy'), lb: r('.ps-lb'), ttl: r('.ps-ttl'),
             on: document.querySelector('#psBar .pt.on').dataset.ptab,
             onBox: r('#psBar .pt.on'), cols: document.querySelector('#psTk .ps-r:not(.ps-hr)').querySelectorAll('.ps-bx').length,
             c1: r('#psTk .ps-r:not(.ps-hr) .ps-bx.c1'), scroll: document.getElementById('psList').scrollTop, rows,
             overlays: [...document.querySelectorAll('#app > *')].filter(e => e.id !== 'psw' && e.id !== 'fxl'
               && getComputedStyle(e).display !== 'none'
               && Number(getComputedStyle(e).zIndex || 0) >= 34).map(e => e.id || e.className) };
  });
  console.log(JSON.stringify(st, null, 1));
  /* 캡처 오염 가드 — 딴 오버레이가 위에 떠 있으면 그 회차 비평은 통째로 무효다(LESSONS 04-①) */
  if (st.overlays.length) throw new Error('캡처 위에 떠 있는 오버레이: ' + st.overlays.join(', '));
  if (st.on !== 'att') throw new Error('활성 탭이 att 가 아니다: ' + st.on);
  if (st.scroll !== 0) throw new Error('레퍼런스와 상태 불일치 — 리스트가 최상단이 아니다: ' + st.scroll);
  if (!st.lb) throw new Error('«접속일» 선두 라벨 알약이 없다');
  if (st.cols !== 2) throw new Error('프리미엄 칸이 1개가 아니다(총 칸 ' + st.cols + ')');
  if (st.rows.length < 5) throw new Error('보이는 행이 5개 미만: ' + st.rows.length);
  if (st.rows[0].hex !== '1') throw new Error('첫 행이 1일차가 아니다: ' + st.rows[0].hex);
  if (!st.rows[0].bx[0].startsWith('✓') || !st.rows[1].bx[0].startsWith('✓'))
    throw new Error('레퍼런스와 상태 불일치 — 무료 1·2 일차가 수령완료가 아니다');

  await page.screenshot({ path: out });
  await browser.close();
  console.log('CAP36 OK — docs/review/' + name);
})();
