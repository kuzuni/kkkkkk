#!/usr/bin/env node
/* 261 검증 — 06 장비 시트 부위 슬롯 3칸이 «장착한 장비의 등급색» 을 탄다
 *   (저장소 주인 보고 2026-08-27 · 스크린샷: 일반 장비 3종을 껴도 세 칸이 전부 초록)
 *
 *   node tools/verify261.js
 *
 * 검사 항목:
 *   [A] 레퍼런스 고정 — g=1(고급) 을 끼면 슬롯 림·면 위/아래 · 뱃지 링 2개·채움 6색이
 *       06 측정표 §2-6·§2-6-1 실측값과 **정확히** 같다(레퍼런스 상태 1px 불변이 이 작업의 조건).
 *   [B] 등급 연동 — 8등급을 하나씩 끼워 실제 렌더된 색을 읽는다. 등급마다 색이 달라야 하고
 *       (전 등급 쌍이 서로 구분됨) 각 색이 `EQSL_G[g]` 와 일치해야 한다.
 *   [C] 되돌림 잠금 — 슬롯 색이 CSS 상수가 아니다: 세 부위에 **서로 다른 등급**을 끼우면
 *       세 칸이 서로 다른 색으로 렌더된다(버그 재현 조건 그대로 = 등재문의 «세 칸 전부 같은 초록»).
 *   [D] 빈 칸 — 장착 해제하면 «비었음» 초록(폴백)으로 돌아간다(등재문 처방: 빈 칸은 지금 색 유지).
 *   [E] 뱃지 동행 — 뱃지가 슬롯과 같은 등급 계열을 탄다(명암 순서 rim > face > badge-fill).
 *   [F] 05 일관성 — 06 슬롯 면색 == 05 팝업이 같은 아이템에 쓰는 `WGRADE[g].c`
 *       (06 슬롯을 누르면 그대로 05 가 열리므로 같은 아이템이 두 화면에서 같은 색이어야 한다).
 *       단 g=1 은 [A] 의 레퍼런스 실측값이 우선이다(측정표 정오표) — Δ채널 ≤ 10 으로만 본다.
 *   [G] 콘솔 에러 0
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
/* `rgb(r, g, b)` → `#rrggbb` (대소문자 통일) */
const hex = s => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s || '');
  return m ? '#' + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, '0')).join('') : String(s);
};
const dch = (a, b) => Math.max(...[1, 3, 5].map(i =>
  Math.abs(parseInt(a.substr(i, 2), 16) - parseInt(b.substr(i, 2), 16))));

/* 06 측정표 §2-6 / §2-6-1 실측 (= 261 이전의 CSS 상수 = EQSL_G[1]) */
const REF1 = { r:'#c7e746', f:'#9cc638', fb:'#97bd36', br:'#acc640', bm:'#9eba3c', bf:'#7c9a38' };

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof renderEqPage === 'function' && typeof EQSL_G !== 'undefined');
  await page.waitForTimeout(600);

  /* 장비 시트 열기 */
  await page.evaluate(() => { heroTab = 'eq'; S.heroTab = 'eq'; goTab('hero', true); });
  await page.waitForTimeout(300);

  /* 부위별로 «그 등급의 실제 아이템» 을 골라 끼우고 렌더된 색을 읽는다.
     읽는 값은 CSS 변수가 아니라 **실제 계산된 배경색**이다(변수만 실어 놓고 CSS 가 안 쓰면 잡힌다). */
  const read = (part, g) => page.evaluate(([part, g]) => {
    const it = EQUIPS.find(e => e.slot === part && e.g === g);
    if (!it) return { err: 'no item ' + part + ' g' + g };
    S.own[it.id] = S.own[it.id] || { lv: 1, frag: 0 };
    S.eqSlot[part] = it.id;
    renderEqPage();
    const sl = document.querySelector('#eqCards [data-eqslot="' + part + '"]');
    const bd = sl && sl.nextElementSibling;             /* 뱃지는 슬롯 바로 뒤 형제 */
    if (!sl || !bd || !bd.classList.contains('eqbd')) return { err: 'no dom ' + part };
    const cs = el => getComputedStyle(el);
    const fi = sl.querySelector('.rim>.fi');
    const grad = cs(fi).backgroundImage;                /* linear-gradient(...) 문자열에서 두 색을 캔다 */
    const cols = (grad.match(/rgba?\([^)]*\)/g) || []);
    return {
      id: it.id, g: it.g,
      rim: cs(sl.querySelector('.rim')).backgroundColor,
      f: cols[0], fb: cols[cols.length - 1],
      bf: cs(bd).backgroundColor, box: cs(bd).boxShadow,
      pal: EQSL_G[it.g]
    };
  }, [part, g]);

  /* ---- [A] 레퍼런스 고정 (g=1 고급) ---- */
  const a = await read('weapon', 1);
  if (a.err) ok(false, '[A] g1 렌더', a.err);
  else {
    ok(hex(a.rim) === REF1.r,  '[A1] g1 슬롯 림   = 측정표 ' + REF1.r,  hex(a.rim));
    ok(hex(a.f)   === REF1.f,  '[A2] g1 슬롯 면 위 = 측정표 ' + REF1.f,  hex(a.f));
    ok(hex(a.fb)  === REF1.fb, '[A3] g1 슬롯 면 아래 = 측정표 ' + REF1.fb, hex(a.fb));
    ok(hex(a.bf)  === REF1.bf, '[A4] g1 뱃지 채움 = 측정표 ' + REF1.bf, hex(a.bf));
    const bcols = (a.box.match(/rgba?\([^)]*\)/g) || []).map(hex);
    ok(bcols.length === 3, '[A5] 뱃지 inset 링 3겹', bcols.join(' '));
    ok(bcols.includes(REF1.br), '[A6] g1 뱃지 밝은 링 = 측정표 ' + REF1.br, bcols.join(' '));
    ok(bcols.includes(REF1.bm), '[A7] g1 뱃지 중간 링 = 측정표 ' + REF1.bm, bcols.join(' '));
    ok(bcols.includes('#000000'), '[A8] g1 뱃지 검정 링 유지', bcols.join(' '));
  }

  /* ---- [B] 8등급 전수 ---- */
  const seen = [];
  for (let g = 0; g < 8; g++) {
    const r = await read('weapon', g);
    if (r.err) { ok(false, '[B' + g + '] g' + g + ' 렌더', r.err); continue; }
    const got = { r: hex(r.rim), f: hex(r.f), fb: hex(r.fb), bf: hex(r.bf) };
    const want = r.pal;
    const same = got.r === want.r.toLowerCase() && got.f === want.f.toLowerCase()
              && got.fb === want.fb.toLowerCase() && got.bf === want.bf.toLowerCase();
    ok(same, '[B' + g + '] g' + g + ' 렌더색 = EQSL_G[' + g + ']',
       'rim ' + got.r + '/' + want.r + ' face ' + got.f + '/' + want.f + ' bdg ' + got.bf + '/' + want.bf);
    seen.push(got.f);
  }
  ok(new Set(seen).size === seen.length, '[B8] 8등급 면색이 전부 서로 다르다', seen.join(' '));

  /* ---- [C] 되돌림 잠금 — 세 부위에 서로 다른 등급 ---- */
  const c = await page.evaluate(() => {
    const parts = ['weapon', 'shield', 'amulet'], gs = [0, 4, 7];
    parts.forEach((p, i) => {
      const it = EQUIPS.find(e => e.slot === p && e.g === gs[i]);
      S.own[it.id] = S.own[it.id] || { lv: 1, frag: 0 };
      S.eqSlot[p] = it.id;
    });
    renderEqPage();
    return parts.map(p => {
      const sl = document.querySelector('#eqCards [data-eqslot="' + p + '"]');
      return getComputedStyle(sl.querySelector('.rim')).backgroundColor;
    });
  });
  const cs3 = c.map(hex);
  ok(new Set(cs3).size === 3, '[C] 세 부위에 다른 등급 → 세 칸이 다른 색(등재된 «전부 같은 초록» 재현 안 됨)', cs3.join(' '));
  ok(!cs3.includes(REF1.r) , '[C2] 그 세 칸에 «고정 초록» 이 하나도 안 남음', cs3.join(' '));

  /* ---- [D] 빈 칸 ---- */
  const d = await page.evaluate(() => {
    S.eqSlot.weapon = null; renderEqPage();
    const sl = document.querySelector('#eqCards [data-eqslot="weapon"]');
    const bd = sl.nextElementSibling;
    return {
      empty: sl.classList.contains('empty'),
      rim: getComputedStyle(sl.querySelector('.rim')).backgroundColor,
      fi: getComputedStyle(sl.querySelector('.rim>.fi')).backgroundImage,
      bf: getComputedStyle(bd).backgroundColor,
      inline: sl.getAttribute('style') + ' | ' + bd.getAttribute('style')
    };
  });
  ok(d.empty, '[D1] 빈 칸에 .empty');
  ok(hex(d.rim) === REF1.r, '[D2] 빈 칸 림 = 폴백 초록 ' + REF1.r, hex(d.rim));
  ok(/126,\s*156,\s*44|7e9c2c/i.test(d.fi) || d.fi.includes('rgb(126, 156, 44)'),
     '[D3] 빈 칸 면 = «비었음» 어두운 초록(#7E9C2C)', d.fi.slice(0, 70));
  ok(hex(d.bf) === REF1.bf, '[D4] 빈 칸 뱃지 = 폴백 초록 ' + REF1.bf, hex(d.bf));
  ok(!/--r:|--f:|--bf:/.test(d.inline), '[D5] 빈 칸에는 등급 변수를 안 싣는다', d.inline);

  /* ---- [E] 뱃지 동행 (명암 순서) ---- */
  const lum = h => 0.299 * parseInt(h.substr(1, 2), 16) + 0.587 * parseInt(h.substr(3, 2), 16) + 0.114 * parseInt(h.substr(5, 2), 16);
  let eBad = [];
  for (let g = 0; g < 8; g++) {
    const r = await read('weapon', g);
    const L = { r: lum(hex(r.rim)), f: lum(hex(r.f)), bf: lum(hex(r.bf)) };
    if (!(L.r > L.f && L.f > L.bf)) eBad.push('g' + g + ' ' + JSON.stringify(L));
  }
  ok(eBad.length === 0, '[E] 전 등급 명암 순서 rim > 면 > 뱃지채움', eBad.join(' | '));

  /* ---- [F] 05 팝업과 같은 색 ---- */
  const f = await page.evaluate(() => WGRADE.map(w => w.c.toLowerCase()));
  let fBad = [];
  for (let g = 0; g < 8; g++) {
    const r = await read('weapon', g);
    const got = hex(r.f), want = f[g];
    const d = dch(got, want);
    if (g === 1 ? d > 10 : got !== want) fBad.push('g' + g + ' ' + got + ' vs WGRADE ' + want + ' Δ' + d);
  }
  ok(fBad.length === 0, '[F] 06 슬롯 면 = 05 WGRADE[g].c (g1 은 측정표 우선이라 Δ≤10)', fBad.join(' | '));

  /* ---- [G] ---- */
  ok(errs.length === 0, '[G] 콘솔 에러 0', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nVERIFY261 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
