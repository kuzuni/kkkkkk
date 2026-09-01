#!/usr/bin/env node
/* 게이트 — 작업 656 「버튼을 누르면 뒤에 «검정 테두리» 찌꺼기가 남는다」
 *
 *   node tools/verify656.js
 *
 * 결함의 정의는 구조다 — **버튼의 실루엣을 같이 그리면서 눌림 변형을 안 따라가는 장식 레이어**.
 * 그 레이어는 122 22회차가 만든 «획 사본» `.stk` 이고(카드 전면 광택 «위» 로 검은 링을 올리려고
 * 형제 노드로 따로 그린 것), 눌림은 버튼에만 걸려 사본만 원래 크기로 남아 있었다.
 *
 *   [A] 부품  — 짝 찾기가 한 곳(`jzStkOf`) · 누를 때 걸고 **뗄 때 반드시 푼다** · 진폭을 새로 안 적었다
 *   [B] 실동작 — 상점 두 탭에서 누른 순간 사본의 **그려진 상자**가 버튼과 ±0.5px 로 같다
 *   [C] 뗌    — 떼면 둘 다 원래 상자로 돌아온다
 *   [D] 122 회귀 — 사본의 «광택 위» 규약(z-index 2 · pointer-events:none · 쉴 때 상자 픽셀 동일)이 불변
 *   [E] 스코프 — 화면에 있는 **모든** `.stk` 사본이 짝을 찾는다(610 꼴 스코프 구멍 금지)
 *   [R] 되돌림 — `jzStkOf` 를 무력화한 사본에서는 [B] 가 **빨개진다**(무르게 푼 수리가 아니다)
 *
 * ⚑ 수치의 출처는 `tools/probe656.js` 다 — 수리 전 [A] 유령 **18쌍** · 픽셀 유령 비율 0.973~0.979,
 *   수리 후 [A] **0쌍** · 0.027~0.149. (1.000 으로 남는 다섯 줄은 «버튼 뒤가 진짜로 새까만 자리»
 *   라 수리 전·후가 **같은 값**이다 — probe 머리말의 한계 그대로다.)
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const TOL = 0.5;                 /* 그려진 상자가 «같다» = 네 값 전부 0.5px 안 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* 상점 두 탭 = `.stk` 사본이 사는 곳 전부(소환 카드 3버튼 · 13 재화 카드 [구매])
   ⚠ 사본은 **버튼의 형제**이므로 셀렉터도 «버튼의 부모 안에서» 찾는다 — 문서 첫 `.btstk` 를
     그냥 집으면 다른 카드의 것이 잡혀 [D1] 이 «상자가 다르다» 로 헛빨강이 된다(1회차에 그랬다). */
const SPOTS = [
  { id: 'summon2', cat: 'summon', btn: '.shp-card .cbtn.b2', stk: '.stk2', n: '10 상점 소환 «10회 소환»' },
  { id: 'summon3', cat: 'summon', btn: '.shp-card .cbtn.b3', stk: '.stk3', n: '10 상점 소환 «30회 소환»' },
  { id: 'coin', cat: 'coin', btn: '.cn-cd>.bt.buy', stk: '.btstk', n: '13 재화 카드 [구매]' },
];

const box = (r) => [r.x, r.y, r.width, r.height];
const same = (a, b) => !!(a && b && a.every((v, i) => Math.abs(v - b[i]) <= TOL));
const p2 = (a) => a ? a.map((v) => Math.round(v * 10) / 10).join('/') : 'n/a';

/* ⚠ 고정 대기(140ms)로 표본을 잡으면 안 된다 — 누름 트랜지션은 **다음 애니메이션 프레임**에야
   시작해서 진행도 0 인 프레임이 두어 장 있고(실측 `probe656` 계열 추적), 그 사이에 재면
   «안 물러났다» 로 읽힌다(1회차에 [B4]·[R1] 이 그렇게 헛빨강이었다 — 638 «고정 대기 금지» 와 같은 자리).
   ⇒ **상태가 바뀔 때까지 폴링**하고, 노드가 재렌더로 갈리면 셀렉터로 다시 찾는다. */
async function shot(page, sp) {
  return await page.evaluate(([bs, ss]) => new Promise((res) => {
    const findB = () => document.querySelector(bs);
    const findS = (b) => b && b.parentElement ? b.parentElement.querySelector(ss) : null;
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
    const b = findB(); if (!b) return res({ err: 'no button ' + bs });
    const s0n = findS(b); if (!s0n) return res({ err: 'no stk ' + ss });
    const b0 = R(b), s0 = R(s0n);
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }));
    const t0 = performance.now();
    const settle = (test, done, cap) => {
      const tick = () => {
        const bb = b.isConnected ? b : findB();
        if (test(bb) || performance.now() - t0 > cap) return done(bb);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    /* 눌림 봉우리 = 폭이 쉴 때보다 1px 넘게 줄어든 첫 프레임(캡 700ms) */
    settle((bb) => { const r = R(bb); return r && Math.abs(r[2] - b0[2]) > 1; }, (bb) => {
      const sn = findS(bb);
      const b1 = R(bb), s1 = R(sn);
      const cb = bb ? getComputedStyle(bb) : null, cs = sn ? getComputedStyle(sn) : null;
      const dn = { btn: !!(bb && bb.classList.contains('jz-dn')), stk: !!(sn && sn.classList.contains('jz-dn')),
        bsc: cb && cb.scale, btr: cb && cb.translate, ssc: cs && cs.scale, str: cs && cs.translate,
        z: cs && cs.zIndex, pe: cs && cs.pointerEvents };
      dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true }));
      /* 뗌 = `jz-up` 스프링(0.18s)이 끝나 원래 폭으로 돌아온 첫 프레임(캡 900ms) */
      const t1 = performance.now();
      const tick2 = () => {
        const bb2 = document.querySelector(bs);
        const r = R(bb2);
        if ((r && Math.abs(r[2] - b0[2]) <= 0.5) || performance.now() - t1 > 900) {
          const sn2 = findS(bb2);
          return res({ b0, s0, b1, s1, dn, b2: R(bb2), s2: R(sn2) });
        }
        requestAnimationFrame(tick2);
      };
      requestAnimationFrame(tick2);
    }, 700);
  }), [sp.btn, sp.stk]);
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 부품 ─────────────────────────────────────────────────────── */
  console.log('[A] 부품 — 짝 찾기는 한 곳 · 누를 때 걸고 뗄 때 푼다 · 진폭은 새로 안 적는다');
  ok((src.match(/function jzStkOf\(/g) || []).length === 1, 'A1 `jzStkOf` 선언이 정확히 한 곳', String((src.match(/function jzStkOf\(/g) || []).length));
  ok(/const stk = jzStkOf\(el\);\s*\n\s*if\(stk\)\{ jzDownStk = stk; stk\.classList\.add\('jz-dn'\); \}/.test(src),
     'A2 pointerdown 이 사본에 **버튼과 같은 어휘**(`jz-dn`)를 건다');
  ok(/if\(jzDownStk\)\{ jzDownStk\.classList\.remove\('jz-dn'\); jzOn\(jzDownStk, 'jz-up', 200\); jzDownStk = null; \}/.test(src),
     'A3 `jzRelease` 가 사본을 풀고 **같은 스프링**(`jz-up`)을 태운다');
  {
    /* 뗌 처리는 `jzRelease` 의 «이른 return»(`if(!jzDown) return;`) **앞**에 있어야 한다 —
       버튼 쪽이 이미 정리된 뒤에도 사본이 눌린 채 남는 자리를 없애려는 것이다. */
    const iRel = src.indexOf('function jzRelease(){');
    const iStk = src.indexOf('if(jzDownStk){', iRel);
    const iRet = src.indexOf('if(!jzDown) return;', iRel);
    ok(iRel > 0 && iStk > iRel && iStk < iRet, 'A4 사본 해제가 `jzRelease` 의 이른 return **앞**에 있다');
  }
  {
    /* 진폭(.94 / 8px)을 656 블록이 다시 적었으면 값이 두 곳이 되어 회귀가 생긴다 */
    const i0 = src.indexOf('let jzDownStk = null;');
    const i1 = src.indexOf('function jzRelease(){', i0);
    const blk = src.slice(i0, i1);
    ok(!/\.94|scale\s*:/.test(blk) && !/8px/.test(blk), 'A5 656 블록이 진폭을 새로 적지 않았다(값은 `.jz-dn` 한 곳)');
  }
  ok(/\.stk\{position:absolute;box-sizing:border-box;border:6px solid #000;\s*\n\s*z-index:2;pointer-events:none/.test(src),
     'A6 122 22회차 사본 규약(z-index 2 · pointer-events:none)이 소스에 그대로');

  /* ── 브라우저 ─────────────────────────────────────────────────────── */
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof jzStkOf === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { S.dia = 9999999; S.gold = 1e12; openShopPage(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation-play-state:paused!important}';
    document.head.appendChild(s);
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
  });

  const go = async (cat) => {
    await page.evaluate((k) => { const c = document.querySelector(`#shopCats .shp-ct[data-cat="${k}"]`); if (c) c.click(); }, cat);
    await page.waitForTimeout(520);
  };

  const R = {};
  for (const sp of SPOTS) { await go(sp.cat); R[sp.id] = await shot(page, sp); }

  /* ── [B] 실동작 ───────────────────────────────────────────────────── */
  console.log('\n[B] 실동작 — 누른 순간 사본의 «그려진 상자» 가 버튼과 같다');
  for (const sp of SPOTS) {
    const o = R[sp.id];
    ok(o && !o.err && o.dn && o.dn.btn, 'B0 ' + sp.n + ' — 버튼이 실제로 눌렸다(`jz-dn`)', o && o.err ? o.err : '');
    ok(o && !o.err && o.dn && o.dn.stk, 'B1 ' + sp.n + ' — 사본에도 같은 어휘가 걸렸다');
    ok(o && !o.err && same(o.b1, o.s1), 'B2 ' + sp.n + ' — 눌린 상자가 ±' + TOL + 'px 로 같다',
       o && !o.err ? '버튼 ' + p2(o.b1) + ' ↔ 사본 ' + p2(o.s1) : 'n/a');
    ok(o && !o.err && o.dn && o.dn.ssc === o.dn.bsc && o.dn.str === o.dn.btr,
       'B3 ' + sp.n + ' — scale·translate 가 버튼과 같은 값',
       o && o.dn ? o.dn.ssc + ' / ' + o.dn.str : 'n/a');
    /* «정말로 물러났는가» — 안 물러나면 B2 는 공짜로 초록이다(전제항) */
    ok(o && !o.err && Math.abs(o.b1[2] - o.b0[2]) > 1, 'B4 ' + sp.n + ' — [전제] 버튼이 실제로 물러난다',
       o && !o.err ? o.b0[2] + ' → ' + Math.round(o.b1[2] * 10) / 10 : 'n/a');
  }

  /* ── [C] 뗌 ──────────────────────────────────────────────────────── */
  console.log('\n[C] 뗌 — 떼면 둘 다 원래 상자로 돌아온다');
  for (const sp of SPOTS) {
    const o = R[sp.id];
    ok(o && !o.err && same(o.b2, o.b0), 'C1 ' + sp.n + ' — 버튼 복귀', o && !o.err ? p2(o.b2) : 'n/a');
    ok(o && !o.err && same(o.s2, o.s0), 'C2 ' + sp.n + ' — 사본 복귀', o && !o.err ? p2(o.s2) : 'n/a');
  }

  /* ── [D] 122 회귀 ────────────────────────────────────────────────── */
  console.log('\n[D] 122 22회차 회귀 — «광택 위» 규약과 «쉴 때 상자 픽셀 동일» 이 불변');
  for (const sp of SPOTS) {
    const o = R[sp.id];
    ok(o && !o.err && same(o.b0, o.s0), 'D1 ' + sp.n + ' — 쉴 때 상자가 픽셀 동일',
       o && !o.err ? p2(o.b0) + ' ↔ ' + p2(o.s0) : 'n/a');
    ok(o && !o.err && o.dn && o.dn.pe === 'none' && Number(o.dn.z) >= 2,
       'D2 ' + sp.n + ' — 사본은 여전히 `pointer-events:none` · z ≥ 2',
       o && o.dn ? o.dn.pe + ' · z ' + o.dn.z : 'n/a');
  }

  /* ── [E] 스코프 ──────────────────────────────────────────────────── */
  console.log('\n[E] 스코프 — 보이는 `.stk` 사본이 **하나도 빠짐없이** 짝을 찾는다');
  for (const cat of ['summon', 'coin']) {
    await go(cat);
    const s = await page.evaluate(() => {
      let seen = 0, paired = 0; const orphan = [];
      for (const d of document.querySelectorAll('.stk')) {
        const r = d.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        seen++;
        let hit = false;
        for (const b of d.parentElement.children) {
          if (b === d) continue;
          if (jzStkOf(b) === d) { hit = true; break; }
        }
        if (hit) paired++; else orphan.push(String(d.className));
      }
      return { seen, paired, orphan: [...new Set(orphan)] };
    });
    ok(s.seen > 0, 'E0 ' + cat + ' — [전제] `.stk` 사본이 실제로 있다', s.seen + '개');
    ok(s.seen === s.paired, 'E1 ' + cat + ' — 짝 없는 사본 0개',
       s.paired + '/' + s.seen + (s.orphan.length ? ' · 고아 ' + s.orphan.join(',') : ''));
  }
  ok(errs.length === 0, 'E2 콘솔 에러 0', errs.slice(0, 2).join(' | '));

  /* ── [R] 되돌림 ──────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — `jzStkOf` 를 무력화하면 [B] 가 빨개진다');
  await page.evaluate(() => { window.__jzStk0 = window.jzStkOf; window.jzStkOf = () => null; });
  const rv = {};
  for (const sp of SPOTS) { await go(sp.cat); rv[sp.id] = await shot(page, sp); }
  await page.evaluate(() => { if (window.__jzStk0) window.jzStkOf = window.__jzStk0; });
  for (const sp of SPOTS) {
    const o = rv[sp.id];
    ok(o && !o.err && !o.dn.stk && !same(o.b1, o.s1),
       'R1 ' + sp.n + ' — 무력화 사본은 획이 제자리에 남는다',
       o && !o.err ? '버튼 ' + p2(o.b1) + ' ↔ 사본 ' + p2(o.s1) : 'n/a');
  }
  {
    await go(SPOTS[0].cat);
    const o = await shot(page, SPOTS[0]);
    ok(o && !o.err && o.dn.stk && same(o.b1, o.s1), 'R2 원복하면 같은 자로 다시 초록',
       o && !o.err ? p2(o.b1) + ' ↔ ' + p2(o.s1) : 'n/a');
  }

  console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
