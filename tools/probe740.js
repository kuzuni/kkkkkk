#!/usr/bin/env node
/* 작업 740 재현 프로브 — «장비 불멸이 5종처럼 보인다 / 실제로는 1종»
 *
 *   node tools/probe740.js
 *
 * 338·341·350·363·372·429·654·683·726 규칙 — **처방을 따르기 전에 등재문의 주장이 참인지
 * 제품에게 직접 묻는다.** 주인 원문: «장비 부분 보니까 불멸 아이템 5개 인거 처럼 보이는데
 * 실제로 1개니까 4개는 없애라».
 *
 * 등재문(PROGRESS 740 ①)이 가르라고 한 것은 딱 하나 —
 *   «5» 가 **데이터**(불멸 종이 실제로 5개다)냐, **표시**(1종인데 칸이 5개 그려진다)냐.
 * 갈래에 따라 처방이 통째로 다르다:
 *   ⓐ 데이터면  → 4종 삭제 + 세이브 합산 이관 + KEY 올림(등재문이 준비한 길)
 *   ⓑ 표시면    → 격자가 «남는 칸을 잠금 더미로 채우는» 자리를 고친다(제품 데이터·세이브 무관)
 *
 * 절:
 *   [1] 데이터 — 부위별 불멸(최고 등급) 장비 종수. **구조축**(수리 전·후 같은 답)
 *   [2] 표시   — 05 장비 팝업 격자의 불멸 행에 **그려진 카드 수**.
 *                수리 전 5 = 등재문이 참(ⓑ 갈래). **수리 전에 빨간 것이 정상이다**
 *   [3] 더미   — 그 행에서 «가리킬 것이 있는» 칸(`data-wpn`) 수. 1 이면 나머지는 빈 껍데기다
 *   [4] 무한 강화(740 ③) — 불멸 장비의 `maxLv` 가 상한 없음인가. **구조축**
 *   [5] 잘림·겹침 — 불멸 행 카드가 프레임(1080×2280) 밖으로 안 나가는가. **구조축**
 *   [6] 콘솔 에러 0. **구조축**
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 한 부위의 05 팝업을 열고 «불멸 행» 을 읽는다.
   행 = 등급이므로 불멸 행 = 최고 등급(topG) 행이고, 카드는 절대 배치(top = 32 + r*190)라
   **행 번호를 top 으로 되찾는다** — 클래스 이름이 아니라 좌표로 묻는 이유는 더미 칸이
   실물 칸과 같은 클래스(`.wgc.ifr`)를 쓰기 때문이다. */
const READ_ROW = part => {
  const g = EQUIPS.filter(e => e.slot === part).reduce((m, e) => Math.max(m, e.g), 0);
  const app = document.getElementById('app').getBoundingClientRect();
  const cards = [...document.querySelectorAll('#wpnGrid .wgc')];
  const rowTop = 32 + g * 190;
  const row = cards.filter(c => Math.abs(parseFloat(c.style.top) - rowTop) < 1);
  const boxes = row.map(c => {
    const r = c.getBoundingClientRect();
    return { x: r.left - app.left, y: r.top - app.top, w: r.width, h: r.height,
             id: c.getAttribute('data-wpn') || null };
  });
  const it = EQUIPS.find(e => e.slot === part && e.g === g);
  return {
    topG: g,
    dataN: EQUIPS.filter(e => e.slot === part && e.g === g).length,
    drawn: row.length,
    real: row.filter(c => c.getAttribute('data-wpn')).length,
    boxes,
    open: document.getElementById('wpnw') ? document.getElementById('wpnw').classList.contains('on') : null,
    maxLv: it ? String(maxLv(it)) : 'n/a',
    app: { w: app.width, h: app.height }
  };
};

const OPEN = async (page, part) => {
  await ev(page, p => { openWeapon(null, p); uiDirty = true; renderUI(); }, part);
  await page.waitForTimeout(300);
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openWeapon === 'function');
  await page.waitForTimeout(700);

  const parts = ['weapon', 'shield', 'amulet'];
  const out = {};
  for (const p of parts) { await OPEN(page, p); out[p] = await ev(page, READ_ROW, p); }

  blk('[1] 데이터 — 부위별 불멸 종수 (구조축)');
  parts.forEach(p => {
    const r = out[p];
    ok(!!r && r.dataN === 1, p + ' 불멸(g' + (r ? r.topG : '?') + ') 종수 = 1',
       r ? String(r.dataN) : 'read 실패');
  });

  blk('[2] 표시 — 05 격자 불멸 행에 그려진 카드 수 (수리 전 5 = 등재문이 참)');
  parts.forEach(p => {
    const r = out[p];
    ok(!!r && r.drawn === 1, p + ' 불멸 행 카드 = 1(데이터와 같은 수)',
       r ? String(r.drawn) : 'read 실패');
  });

  blk('[3] 더미 — 그 행에서 가리킬 것이 있는 칸');
  parts.forEach(p => {
    const r = out[p];
    if (!r) { ok(false, p + ' 실물 칸 수', 'read 실패'); return; }
    info(p + ' 실물(data-wpn) / 그려진 칸', r.real + ' / ' + r.drawn);
    ok(r.real === r.drawn, p + ' 더미 칸 0개', '더미 ' + (r.drawn - r.real) + '칸');
  });

  blk('[4] 무한 강화(740 ③) — 불멸 장비 상한 (구조축)');
  parts.forEach(p => {
    const r = out[p];
    ok(!!r && r.maxLv === 'Infinity', p + ' 불멸 maxLv = 상한 없음', r ? r.maxLv : 'read 실패');
  });

  blk('[5] 잘림 — 불멸 행 카드가 프레임 안 (구조축)');
  parts.forEach(p => {
    const r = out[p];
    if (!r) { ok(false, p + ' bbox', 'read 실패'); return; }
    const bad = r.boxes.filter(b => b.x < -0.5 || b.y < -0.5 || b.x + b.w > r.app.w + 0.5);
    ok(bad.length === 0, p + ' 프레임 밖 카드 0',
       bad.length ? JSON.stringify(bad[0]) : r.boxes.length + '칸 전부 안쪽');
  });

  blk('[6] 콘솔 에러');
  ok(errs.length === 0, '콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await ctx.close(); await browser.close();
  console.log('\nPROBE740 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail + '건' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
