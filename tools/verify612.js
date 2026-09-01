#!/usr/bin/env node
/* 작업 612 게이트 — «단련 탭 아이콘이 작다 — 크게» (주인 지시 2026-09-01 01:08)
 *
 *   node tools/verify612.js
 *
 * 무엇을 잠그나:
 *   [A] 커졌는가 — `.ti` 액자 178×178(= 행 222 − 여백 22×2) · 잉크가 411 비(0.6957)의 ±3%
 *   [B] 서로 고른가 — 세 축(⚔️❤️✨) 잉크 세로 최대÷최소 ≤ 1.05 (411 자를 그대로 가져왔다)
 *   [C] 파생 — TEMPER_ART 가 SLOT_ART/SLOT_BOX × TI_BOX 파생이다(소스 정규식 — 손으로 적은 사본 금지)
 *   [D] 이웃 밀림·겹침 0 — 글줄이 아이콘을 비키고(224), `.td` 우변 ≤ `.tb` 좌변,
 *       `.tc`·`.tb`·행 pitch·헤더/푸터는 584 값 그대로(Δ0)
 *   [E] `.td` 두 줄 — <br> 분할 · 최악 자릿수(Lv 99,999)에서도 상자 안 · liveTemper 와 같은 그림(297)
 *   [F] 9:13.3(1080×1600) — 확대된 아이콘·버튼이 시트 밖 0px (351 규약)
 *   [R] 되돌림 — 액자를 104 로 되돌리면 [A] 축이, sa-e 를 벗기면 [B] 축이 빨개진다
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✅ ' + m + (d ? '  — ' + d : '')); }
                          else { fail++; console.log('  ❌ ' + m + (d ? '  — ' + d : '')); } };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 60 - t.length)));

const INK_FN = `
  window.__ink612 = function(ch, fs, fam){
    const P = 100, cv = document.createElement('canvas');
    cv.width = P * 3; cv.height = P * 3;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, cv.width, cv.height);
    g.font = P + 'px ' + fam;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    g.fillText(ch, cv.width / 2, Math.round(cv.height * 0.72));
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for(let y = 0; y < cv.height; y++)
      for(let x = 0; x < cv.width; x++)
        if(d[(y * cv.width + x) * 4 + 3] > 8){
          if(x < x0) x0 = x; if(x > x1) x1 = x;
          if(y < y0) y0 = y; if(y > y1) y1 = y;
        }
    if(x1 < 0) return null;
    const k = fs / P;
    return { w: +((x1 - x0 + 1) * k).toFixed(2), h: +((y1 - y0 + 1) * k).toFixed(2) };
  };`;

async function open(browser, h) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h || 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.evaluate(INK_FN);
  await page.waitForTimeout(400);
  return { ctx, page };
}
const evOf = p => async (fn, a) => {
  try { return await p.evaluate(fn, a); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
};

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await open(browser);
  const ev = evOf(page);

  /* ══ [A] 액자·잉크 ═══════════════════════════════════════════════════ */
  blk('[A] 액자 178 · 잉크 = 411 비');
  const A = await ev(() => {
    openTrain(); setTrSub('temper'); renderTrain();
    const w = document.getElementById('trTemper');
    const rows = [...w.querySelectorAll('.tr-tp')].map(row => {
      const rb = row.getBoundingClientRect();
      const ti = row.querySelector('.ti'), tr = ti.getBoundingClientRect();
      const art = ti.querySelector('i.sa-e');
      const src = art || ti, cs = getComputedStyle(src);
      const ink = window.__ink612((src.textContent || '').trim(), parseFloat(cs.fontSize), cs.fontFamily);
      return { k: row.dataset.temper, box: +tr.width.toFixed(1), boxH: +tr.height.toFixed(1),
               x: +(tr.x - rb.x).toFixed(1), y: +(tr.y - rb.y).toFixed(1), sa: !!art, ink };
    });
    return { rows, TI_BOX: typeof TI_BOX !== 'undefined' ? TI_BOX : null,
             ART: typeof TEMPER_ART !== 'undefined' ? TEMPER_ART : null, R: SLOT_ART.h / 115 };
  });
  if (A.__err) ok(false, 'evaluate 실패: ' + A.__err);
  else {
    ok(A.rows.length === 3, '단련 축 카드 3장', A.rows.map(r => r.k).join(','));
    ok(A.rows.every(r => r.box === 178 && r.boxH === 178), '[A1] 액자 178×178(= 222 − 22×2)',
       A.rows.map(r => r.box + '×' + r.boxH).join(' · '));
    ok(A.rows.every(r => r.x === 26 && r.y === 22), '[A2] 자리 (26,22) — 세로 여백 22 대칭',
       A.rows.map(r => '(' + r.x + ',' + r.y + ')').join(' '));
    ok(A.rows.every(r => r.sa), '[A3] 세 액자 모두 «그림 자리»(i.sa-e)를 쓴다');
    const want = A.R * 178;
    ok(A.rows.every(r => r.ink && Math.abs(r.ink.h - want) / want <= 0.03),
       '[A4] 잉크 세로 = 411 비 × 178 (±3%)',
       A.rows.map(r => r.k + ' ' + (r.ink ? r.ink.h : '?')).join(' · ') + ' vs ' + want.toFixed(1));
    ok(A.rows.every(r => r.ink && r.ink.h >= 100),
       '[A5] ★ 커졌는가 — 잉크 ≥ 100px (수리 전 69.4)', A.rows.map(r => r.ink && r.ink.h).join(' · '));
  }

  /* ══ [B] 서로 고른가 ═════════════════════════════════════════════════ */
  blk('[B] 세 글리프 잉크 고름(411 자: ≤ 1.05)');
  if (!A.__err && A.rows.every(r => r.ink)) {
    const hs = A.rows.map(r => r.ink.h);
    const ratio = Math.max(...hs) / Math.min(...hs);
    ok(ratio <= 1.05, '[B1] 세로 덩치 최대÷최소 ≤ 1.05', hs.join(' · ') + ' ⇒ ' + ratio.toFixed(3));
  } else ok(false, '[B1] 잉크 측정 실패');

  /* ══ [C] 파생(소스) ══════════════════════════════════════════════════ */
  blk('[C] TEMPER_ART 는 파생이다(손 사본 금지)');
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  ok(/const TI_BOX = 178;/.test(src), '[C1] TI_BOX = 178 선언');
  ok(/const TEMPER_ART = \{ w: \+\(SLOT_ART\.w \/ SLOT_BOX \* TI_BOX\)\.toFixed\(1\),\s*\n\s*h: \+\(SLOT_ART\.h \/ SLOT_BOX \* TI_BOX\)\.toFixed\(1\) \};/.test(src),
     '[C2] TEMPER_ART = SLOT_ART/SLOT_BOX × TI_BOX (리터럴 아님)');
  ok(/slotEmoji\(t\.ic, TEMPER_ART\)/.test(src), '[C3] renderTemper 가 «그림 자리» 를 읽는다');
  ok(/put\(row, '\.td i', x\.eff, true\)/.test(src), '[C4] liveTemper 의 `.td` 가 html 경로(297 짝)');

  /* ══ [D] 이웃 — 밀림·겹침 0 · 584 값 Δ0 ═════════════════════════════ */
  blk('[D] 이웃 rect — 겹침 0 · 584 불변값');
  const D = await ev(() => {
    setTrSub('temper'); renderTrain();
    const w = document.getElementById('trTemper');
    const row = w.querySelector('.tr-tp.k0'), rb = row.getBoundingClientRect();
    const g = s => { const n = row.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect();
      return { x: +(r.x - rb.x).toFixed(1), y: +(r.y - rb.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
               x2: +(r.x - rb.x + r.width).toFixed(1), y2: +(r.y - rb.y + r.height).toFixed(1) }; };
    const wb = w.getBoundingClientRect();
    const tops = ['.tr-tp.k0', '.tr-tp.k1', '.tr-tp.k2'].map(s => { const r = w.querySelector(s).getBoundingClientRect();
      return { y: +(r.y - wb.y).toFixed(1), h: +r.height.toFixed(1) }; });
    return { ti: g('.ti'), tn: g('.tn'), tl: g('.tl'), td: g('.td'), tc: g('.tc'), tb: g('.tb'), tops };
  });
  if (D.__err) ok(false, 'evaluate 실패: ' + D.__err);
  else {
    ok(D.tn.x >= D.ti.x2 + 16 && D.tl.x >= D.ti.x2 + 16 && D.td.x >= D.ti.x2 + 16,
       '[D1] 글줄 세 개가 아이콘을 비킨다(우변 204 + 여백)', 'tn ' + D.tn.x + ' · tl ' + D.tl.x + ' · td ' + D.td.x);
    ok(D.td.x2 <= D.tb.x, '[D2] `.td` 우변 ≤ [단련] 버튼 좌변', D.td.x2 + ' ≤ ' + D.tb.x);
    /* 686 이관 — 비용 열(.tc)이 주인 지시로 사라졌다(그 자리는 버튼의 세로가 먹는다).
       [D3] 이 묻던 것(«이름 잉크가 오른쪽 상자를 안 밟는다»)은 죽지 않았다 — 오른쪽에 남은
       상자가 버튼 하나뿐이므로 과녁만 옮긴다(333 처방: 자리를 비우지 말고 방향·과녁을 고친다). */
    ok(D.tn.x2 <= D.tb.x, '[D3] 이름 잉크가 오른쪽 상자(686 이후 = 버튼)를 안 밟는다',
       D.tn.x2 + ' ≤ ' + D.tb.x);
    /* [D4] 가로는 여전히 584 값이고(632 · 340 — 자릿수 예산) 세로만 686 값이다(22 · 178). */
    ok(D.tb.x === 632 && D.tb.w === 340 && D.tb.y === 22 && D.tb.h === 178,
       '[D4] [단련] 버튼 — 가로 584 Δ0(632 · 340) · 세로 686(22 · 178)',
       D.tb.x + ',' + D.tb.y + ' ' + D.tb.w + '×' + D.tb.h);
    /* [D5] 는 방향을 뒤집었다 — «있어야 한다» 에서 «없어야 한다» 로. 되살아나면 빨개진다.
       ⚠ 값(비용)이 화면에서 사라진 것이 아니다: 그것은 [D5b] 가 버튼 라벨에서 확인한다. */
    ok(D.tc === null, '[D5] 686 — 비용 열(.tc)이 없다(되살아나면 빨강)',
       D.tc === null ? '없음' : JSON.stringify(D.tc));
    ok(D.tb.h === D.ti.h && D.tb.y === D.ti.y,
       '[D5b] 686 — 버튼 세로 밴드 = 같은 행 아이콘 상자 밴드(22..200)',
       `버튼 ${D.tb.y}..${D.tb.y2} ↔ 아이콘 ${D.ti.y}..${D.ti.y2}`);
    ok(D.tops.map(t => t.y).join(',') === '102,338,574' && D.tops.every(t => t.h === 222),
       '[D6] 행 pitch·높이 Δ0 (102/338/574 · 222)', JSON.stringify(D.tops));
    ok(D.ti.y2 <= 222 - 8 && D.td.y2 <= 222 - 8, '[D7] 아이콘·효과 줄이 행 베벨(8) 안', D.ti.y2 + ' · ' + D.td.y2);
  }

  /* ══ [E] `.td` 두 줄 — 최악 자릿수 ═══════════════════════════════════ */
  blk('[E] `.td` 두 줄 · 자릿수 스윕');
  const E = await ev(() => {
    const w = document.getElementById('trTemper');
    const o = temperObj(); const keep = o.alloc.atk || 0;
    const at = lv => { o.alloc.atk = lv; renderTemper();
      const row = w.querySelector('.tr-tp.k0'), rb = row.getBoundingClientRect();
      const i = row.querySelector('.td i'), r = i.getBoundingClientRect();
      return { lv, x2: +(r.x - rb.x + r.width).toFixed(1), h: +r.height.toFixed(1),
               br: !!i.querySelector('br'), txt: row.querySelector('.td').textContent.length }; };
    const res = [0, 999, 99999].map(at);
    o.alloc.atk = keep; renderTemper();
    /* 297 — liveTemper 경로와 같은 그림인가(태그가 글자로 안 찍히나) */
    rtHold = { tag: 'temper' }; o.alloc.atk = 137; markDirty(); renderTemper();
    const liveTxt = w.querySelector('.tr-tp.k0 .td').textContent;
    rtHold = null; o.alloc.atk = keep; markDirty(); renderTemper();
    return { res, liveTxt };
  });
  if (E.__err) ok(false, 'evaluate 실패: ' + E.__err);
  else {
    ok(E.res.every(r => r.br), '[E1] 효과 줄이 <br> 두 줄이다');
    ok(E.res.every(r => r.x2 <= 616), '[E2] 최악 자릿수(Lv 99,999)에서도 상자 안(≤616)',
       E.res.map(r => 'Lv' + r.lv + '→' + r.x2).join(' · '));
    ok(E.res.every(r => r.h <= 68.5), '[E3] 세 줄로 접히지 않는다(h ≤ 68)', E.res.map(r => r.h).join(' · '));
    ok(E.liveTxt.indexOf('<br>') < 0 && /137|274/.test(E.liveTxt.replace(/,/g, '')),
       '[E4] 홀드 중(liveTemper)에도 태그가 글자로 안 찍히고 값은 갱신된다', E.liveTxt.slice(0, 40));
  }

  /* ══ [F] 9:13.3 ══════════════════════════════════════════════════════ */
  blk('[F] 1080×1600 잘림 0');
  const { ctx: c2, page: p2 } = await open(browser, 1600);
  const ev2 = evOf(p2);
  const F = await ev2(() => {
    openTrain(); setTrSub('temper'); renderTrain();
    const sh = document.querySelector('#trw .tr-sheet').getBoundingClientRect();
    const out = [];
    /* 614 가 푸터(.tp-ft 회수 띠)를 걷어냈다 — 죽은 표본을 살아 있는 마지막 행 요소로(333 규약) */
    ['#trTemper .tr-tp.k0 .ti', '#trTemper .tr-tp.k2 .ti', '#trTemper .tr-tp.k2 .tb', '#trTemper .tr-tp.k2 .td']
      .forEach(s => { const n = document.querySelector(s); if (!n) { out.push(s + ' 없음'); return; }
        const r = n.getBoundingClientRect();
        const o = Math.max(0, (r.y + r.height) - (sh.y + sh.height), sh.y - r.y);
        if (o > 0) out.push(s + ' ' + o.toFixed(1) + 'px 밖'); });
    return { out };
  });
  if (F.__err) ok(false, 'evaluate 실패: ' + F.__err);
  else ok(F.out.length === 0, '[F1] 확대분이 짧은 프레임에서도 시트 안', F.out.join(' · ') || '0건');
  await c2.close();

  /* ══ [R] 되돌림 ══════════════════════════════════════════════════════ */
  blk('[R] 되돌림 — 무르게 풀지 않았다');
  const R = await ev(() => {
    const w = document.getElementById('trTemper');
    /* R1 — 액자를 옛 104 로 눌러 본다 ⇒ [A1] 축이 빨개져야 한다 */
    const st = document.createElement('style');
    st.textContent = '.tr-tp>.ti{width:104px!important;height:104px!important}';
    document.head.appendChild(st);
    const b1 = w.querySelector('.tr-tp.k0 .ti').getBoundingClientRect().width;
    st.remove();
    /* R2 — sa-e 를 벗겨 옛 «맨 글자 fs62» 로 ⇒ [A3] 축이 빨개져야 한다 */
    const ti = w.querySelector('.tr-tp.k0 .ti');
    const html = ti.innerHTML;
    ti.textContent = '⚔️';
    const noSa = !ti.querySelector('i.sa-e');
    ti.innerHTML = html;
    return { b1, noSa, back: !!w.querySelector('.tr-tp.k0 .ti i.sa-e') };
  });
  if (R.__err) ok(false, 'evaluate 실패: ' + R.__err);
  else {
    ok(R.b1 === 104, '[R1] 액자를 104 로 되돌리면 [A1] 이 잡는다(자가 실제로 그 축을 잰다)', String(R.b1));
    ok(R.noSa && R.back, '[R2] sa-e 를 벗기면 [A3] 이 잡는다 · 원복 확인', 'noSa=' + R.noSa);
  }

  await ctx.close();
  await browser.close();
  console.log('\nVERIFY612 ' + pass + '/' + (pass + fail) + (fail ? ' ❌ FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
