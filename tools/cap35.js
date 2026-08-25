/* 작업 35 — 패스(스테이지 패스) 페이지 채점용 캡처. 1080x2280 (2026-08-25 기준 화면비).
 * 레퍼런스(docs/ref/35-패스-스테이지패스.jpg)와 «같은 상태»로 맞춘다(LESSONS 04-①):
 *   · 최고 스테이지 79 · 프리미엄 미활성(프리미엄 칸 전부 🔒)
 *   · 무료 칸은 스테이지 65·70·75 가 수령완료(✓ + 회색 수량), 80 이후는 미수령
 *   · 스크롤을 «스테이지 65 행이 맨 위» 로 맞춘다(레퍼런스와 같은 구간)
 * 캡처 오염 방지: 렌더 루프를 세우고(41-④) · 캔버스를 내리고(28-③) · 게임 로직을 멈춘다(58-②).
 *   node tools/cap35.js [출력이름]   → docs/review/35-r{n}.png
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const name = process.argv[2] || '35-r1.png';
const out = path.resolve(__dirname, '..', 'docs', 'review', name);

/* 레퍼런스와 같은 진행 상태. PASS_STEP=5 이므로 단계 i 의 목표 스테이지는 (i+1)*5.
   스테이지 65/70/75 = 단계 12/13/14. 무료 칸(c=0)만 수령완료로 심는다. */
const SAVE = {
  best: 79, stage: 79, gold: 5e9, dia: 120000, relic: 4000,
  pass: { prem: false, got: { '12:0': 1, '13:0': 1, '14:0': 1 } },
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

  /* 진입은 실제 경로(▦ 메뉴 → 🎫 패스)로 — 위임 핸들러를 그대로 태운다(LESSONS 50-①) */
  await page.evaluate(() => document.getElementById('menub').click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('psGo').click());
  await page.waitForTimeout(500);

  /* 캔버스 데미지 숫자·자동 전투가 캡처를 오염시킨다(LESSONS 28-③ · 58-②) */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
  });
  /* 레퍼런스와 같은 구간: 스테이지 65 행(단계 12)이 맨 위, 상단 6px 만 가려진 상태 */
  await page.evaluate(() => { document.getElementById('psList').scrollTop = 12 * 229.85 + 6; });
  await page.waitForTimeout(300);

  const st = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const rows = [...document.querySelectorAll('#psTk .ps-r')].filter(e => {
      const b = e.getBoundingClientRect(); return b.bottom > 715 && b.top < 2098;
    }).map(e => ({
      hex: e.querySelector('.ps-hex i').textContent,
      lk: e.querySelector('.ps-hex').classList.contains('lk'),
      bx: [...e.querySelectorAll('.ps-bx')].map(b => (b.classList.contains('dn') ? '✓' : '') + b.querySelector('b').textContent)
    }));
    return { hero: r('.ps-hero'), gold: r('.ps-gold'), hdr: r('.ps-hdr'), list: r('.ps-list'),
             bar: r('.ps-bar'), buy: r('.ps-buy'), on: document.querySelector('#psBar .pt.on').dataset.ptab,
             onBox: r('#psBar .pt.on'), scroll: document.getElementById('psList').scrollTop, rows };
  });
  console.log(JSON.stringify(st, null, 1));
  if (st.rows.length < 6) throw new Error('보이는 행이 6개 미만: ' + st.rows.length);
  if (st.rows[0].hex !== '65') throw new Error('첫 행이 스테이지 65 가 아니다: ' + st.rows[0].hex);
  if (!st.rows[0].bx[0].startsWith('✓')) throw new Error('레퍼런스와 상태 불일치 — 65 무료 칸이 수령완료가 아니다');
  if (st.on !== 'stage') throw new Error('활성 탭이 stage 가 아니다: ' + st.on);

  await page.screenshot({ path: out });
  await browser.close();
  console.log('CAP35 OK — docs/review/' + name);
})();
