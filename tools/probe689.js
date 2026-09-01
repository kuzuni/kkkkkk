#!/usr/bin/env node
/* 689 재현 — 훈련 상한 카드 비용 줄이 «상한» 이라고 쓴다 (주인 지시 2026-09-02 01:30)
 *
 *   node tools/probe689.js
 *
 * 주인 원문: «훈련에 상한으로 뜨지말고 MAX 라고 떠야함».
 *
 * 338 규칙 — 처방 전에 재현한다. 이 자가 답할 것은 넷이다:
 *   [A] 주인이 본 그림이 실제로 있는가 — 상한 카드 3장의 `.cb i` 가 «상한» 인가.
 *   [B] **같은 카드 안에서 이미 규약이 갈라져 있는가** — `.cv i` 는 486 이 이미 «MAX» 로
 *       바꿔 놓았다. 그렇다면 이 작업은 «새 표기» 가 아니라 «한 카드 안의 표기 통일» 이다.
 *   [C] «상한» 문자열이 훈련 밖(단련·룬·소환 Lv)에도 렌더되는가 — 지시서의
 *       «같은 부품이면 같이 MAX 로 통일 / 별개 구현이면 훈련만» 갈림을 사실로 가른다.
 *   [D] ⚠ 380 선례(라틴 폴백) — «MAX» 는 라틴 3글자, «상한» 은 한글 2글자다.
 *       비용 줄은 `<s>💰</s><i>텍스트</i>` 가 **가운데 정렬로 나란히** 놓인 flex 라
 *       글자가 길어지면 코인까지 같이 밀린다. 그래서 «잘림» 만 보면 모자라고
 *       **폭 예산 · 코인 중심 이동 · 실제 렌더 서체**를 같이 재야 한다.
 *       (`.cv i` 는 홀로 놓인 text-align:center 라 같은 위험이 없다 — 그래서 486 은 안 겪었다.)
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };
const sec = t => console.log('\n' + t);

const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { return { __err: String((e && e.message) || e).split('\n')[0] }; }
};
const blk = (r, m) => {
  if (r && r.__err) { ok(false, '  ' + m + ' — 평가가 죽었다: ' + r.__err); return false; }
  return true;
};

const save = { gold: 1e30, dia: 1e9, best: 60, a105: 1, buyQty: 1,
  autoBuy: false, trainStage: 3, lv: { atk: 0, hp: 0, regen: 0 } };

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + SRC);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function');
  await page.evaluate(() => { step = () => {}; S.autoBuy = false; openTrain(); renderTrain(); });
  await page.evaluate(CAPALL_SRC);
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

/* 상한 카드를 만든다 — 세 스탯 전부 그 단계의 캡으로.
   page.evaluate 안에서 쓰려면 **페이지 쪽에** 심어야 한다(노드 스코프 함수는 안 넘어간다). */
const CAPALL_SRC = `window.CAPALL_ = function(){
  S.trainStage = 3; var cap = trainCap();
  S.lv.atk = cap; S.lv.hp = cap; S.lv.regen = cap;
  markDirty(); renderTrain();
  return cap;
};`;

(async () => {
  const browser = await launch(chromium);
  let allErrs = [];

  /* ─────────────────────────────────────────────────────────────
     [A] 주인이 본 그림 — 상한 카드 3장의 비용 줄
     ───────────────────────────────────────────────────────────── */
  sec('[A] 상한 카드 3장 — 비용 줄(.cb i) 문자열');
  const { ctx, page, errs } = await open(browser);
  allErrs = allErrs.concat(errs);

  const A = await ev(page, () => {
    const cap = CAPALL_();
    const rows = ['atk', 'hp', 'regen'].map(k => {
      const el = document.querySelector('#trCards [data-tr="' + k + '"]');
      return { k, cls: el.className,
        cb: el.querySelector('.cb i').textContent,
        cv: el.querySelector('.cv i').textContent };
    });
    return { cap, rows };
  });
  if (blk(A, '[A]')) {
    console.log('    단계 3 상한 Lv = ' + A.cap);
    A.rows.forEach(r => console.log('    ' + r.k.padEnd(6) + ' .cb i «' + r.cb + '»   .cv i «' + r.cv + '»   class=' + r.cls));
    ok(A.rows.every(r => r.cb === '상한'), 'A1 상한 카드 3장 전부 비용 줄이 «상한» = 주인이 본 그림 재현',
      A.rows.map(r => r.cb).join('/'));
    ok(A.rows.every(r => r.cv === 'MAX'), 'A2 **같은 카드의 알약은 이미 «MAX»**(486) — 한 카드 안에서 표기가 갈렸다',
      A.rows.map(r => r.cv).join('/'));
    ok(A.rows.every(r => /\bfull\b/.test(r.cls)), 'A3 세 장 다 .full 클래스');
  }

  /* ─────────────────────────────────────────────────────────────
     [B] 상한 미달이면 기존 표기(비용 숫자) — 되돌림 대조군
     ───────────────────────────────────────────────────────────── */
  sec('[B] 상한 미달 카드 — 비용 숫자 그대로(«상한»/«MAX» 둘 다 아니다)');
  const B = await ev(page, () => {
    S.trainStage = 3; S.lv.atk = 0; S.lv.hp = 0; S.lv.regen = 0; markDirty(); renderTrain();
    const el = document.querySelector('#trCards [data-tr="atk"]');
    return { cb: el.querySelector('.cb i').textContent, cv: el.querySelector('.cv i').textContent,
      cls: el.className };
  });
  if (blk(B, '[B]')) {
    console.log('    미달 .cb i «' + B.cb + '»   .cv i «' + B.cv + '»');
    ok(B.cb !== '상한' && B.cb !== 'MAX' && B.cb.length > 0, 'B1 미달 카드 비용 줄은 숫자다', B.cb);
    ok(!/\bfull\b/.test(B.cls), 'B2 미달 카드에 .full 없음', B.cls);
  }

  /* ─────────────────────────────────────────────────────────────
     [C] 스코프 — «상한» 이 훈련 밖에도 렌더되는가
         (단련·룬 탭을 실제로 열어 본문 텍스트를 훑는다)
     ───────────────────────────────────────────────────────────── */
  sec('[C] 스코프 — 렌더된 «상한» 문자열이 훈련 밖에도 있는가');
  const C = await ev(page, () => {
    /* ⚠ 1회차 실패에서 배운 것 — `trSub` 를 바꿔 가며 `#trw` 를 통째로 훑으면
       **같은 훈련 카드를 세 번 센다**. `renderTrain()` 은 서브탭과 무관하게 `#trCards` 를
       늘 채우고(룬·단련도 같이 그린다), 서브탭 전환은 표시만 감춘다.
       ⇒ 라벨을 «그때 열려 있던 탭» 이 아니라 **그 노드가 실제로 속한 컨테이너**로 붙인다. */
    const SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
    const host = (n) => {
      for (let p = n; p; p = p.parentElement) {
        if (!p.id) continue;
        if (p.id === 'trCards') return '훈련 카드(#trCards)';
        if (/rune/i.test(p.id)) return '룬(' + p.id + ')';
        if (/temper|tmp/i.test(p.id)) return '단련(' + p.id + ')';
        if (p.id === 'trw') return '23 팝업 기타(#trw)';
      }
      return '기타';
    };
    CAPALL_();
    const scanAll = () => {
      const out = [];
      document.querySelectorAll('body *').forEach(n => {
        if (SKIP[n.tagName] || n.children.length) return;     /* 잎 노드만 · 스크립트 제외 */
        const t = (n.textContent || '').trim();
        if (t.includes('상한')) out.push({ where: host(n), sel: n.className || n.tagName, txt: t.slice(0, 40) });
      });
      return out;
    };
    /* 세 서브탭을 실제로 갈아 보되, 라벨은 컨테이너가 준다(중복 계수 방지: 노드 기준 dedupe) */
    const seen = new Set(); const hits = [];
    ['train', 'rune', 'temper'].forEach(t => {
      trSub = t; renderTrain();
      scanAll().forEach(h => { const k = h.where + '|' + h.sel + '|' + h.txt;
        if (!seen.has(k)) { seen.add(k); hits.push(h); } });
    });
    trSub = 'train'; renderTrain();
    return { hits, all: hits };
  });
  if (blk(C, '[C]')) {
    console.log('    렌더된 «상한» 잎 노드 ' + C.hits.length + '건(컨테이너 기준 dedupe)');
    C.hits.forEach(h => console.log('      [' + h.where + '] ' + h.sel + ' «' + h.txt + '»'));
    ok(C.hits.length > 0 && C.hits.every(h => h.where === '훈련 카드(#trCards)'),
      'C1 «상한» 은 훈련 카드 한 부품에서만 렌더된다 = 스코프는 훈련뿐(단련·룬 0건)',
      C.hits.map(h => h.where).join(',') || '(0건)');
  }

  /* ─────────────────────────────────────────────────────────────
     [D] 380 선례 — «MAX» 를 넣으면 폭·코인 중심·서체가 어떻게 되는가
         지금 화면에 **직접 글자만 갈아 넣어** 잰다(제품 수정 전 예산 확인).
     ───────────────────────────────────────────────────────────── */
  sec('[D] 380 — «상한» ↔ «MAX» 폭 예산 · 코인 중심 이동 · 실렌더 서체');
  const D = await ev(page, () => {
    CAPALL_();
    const el = document.querySelector('#trCards [data-tr="atk"]');
    const band = el.querySelector('.cb');
    const i = band.querySelector('i');
    const s = band.querySelector('s');
    const measure = (txt) => {
      i.textContent = txt;
      /* 강제 리플로우 */
      void band.offsetWidth;
      const bb = band.getBoundingClientRect();
      const ib = i.getBoundingClientRect();
      const sb = s.getBoundingClientRect();
      const cs = getComputedStyle(i);
      /* 잉크 폭은 Range 로 — 글리프 실제 advance */
      const rg = document.createRange(); rg.selectNodeContents(i);
      const rb = rg.getBoundingClientRect();
      const pr = parseFloat(getComputedStyle(band).paddingRight) || 0;
      return { txt,
        bandW: +bb.width.toFixed(2), bandL: +bb.left.toFixed(2), bandR: +bb.right.toFixed(2),
        inner: +(bb.width - pr).toFixed(2),
        iW: +ib.width.toFixed(2), iL: +ib.left.toFixed(2), iR: +ib.right.toFixed(2),
        inkW: +rb.width.toFixed(2), inkH: +rb.height.toFixed(2),
        coinCx: +((sb.left + sb.right) / 2).toFixed(2),
        coinL: +sb.left.toFixed(2), coinR: +sb.right.toFixed(2),
        font: cs.fontFamily, fs: cs.fontSize,
        /* 잘림 판정 — 내용이 밴드 안쪽(패딩 제외)을 넘는가 */
        overL: +(bb.left - sb.left).toFixed(2),
        overR: +(ib.right - (bb.right - pr)).toFixed(2) };
    };
    const before = measure('상한');
    const after = measure('MAX');
    const num = measure('1.23K');                 /* 평소 비용 문자열 — 가장 흔한 길이 */
    const long = measure('999.99AA');             /* 최장 비용 문자열(486 [E] 가 쓴 표본) */
    i.textContent = '상한';                        /* 원복 */
    return { before, after, num, long };
  });
  if (blk(D, '[D]')) {
    const row = r => '      «' + r.txt + '»  잉크 ' + r.inkW + '×' + r.inkH
      + '  ·  i 상자 ' + r.iW + '  ·  코인중심 ' + r.coinCx
      + '  ·  밴드 ' + r.bandL + '..' + r.bandR + '(안쪽폭 ' + r.inner + ')'
      + '  ·  우측 넘침 ' + r.overR;
    console.log('    실렌더 서체: ' + D.before.font + ' @ ' + D.before.fs);
    console.log(row(D.before));
    console.log(row(D.after));
    console.log(row(D.num));
    console.log(row(D.long));

    const dInk = +(D.after.inkW - D.before.inkW).toFixed(2);
    const dCoin = +(D.after.coinCx - D.before.coinCx).toFixed(2);
    console.log('    Δ 잉크폭 «상한»→«MAX» = ' + (dInk >= 0 ? '+' : '') + dInk + 'px'
      + '   ·   Δ 코인 중심 = ' + (dCoin >= 0 ? '+' : '') + dCoin + 'px');

    ok(D.after.overR <= 0, 'D1 «MAX» 가 밴드 안쪽을 안 넘는다(우측 넘침 ≤ 0)', D.after.overR);
    ok(D.after.coinL >= D.after.bandL, 'D2 «MAX» 에서 코인이 밴드 좌변을 안 넘는다',
      D.after.coinL + ' vs ' + D.after.bandL);
    ok(Math.abs(dCoin) <= 14, 'D3 코인 중심 이동이 흔한 비용 문자열 폭 변동 안(±14px)',
      dCoin + 'px');
    ok(D.after.inkW <= D.long.inkW, 'D4 «MAX» 잉크폭 ≤ 최장 비용 문자열 = 폭 예산은 이미 그 값이 정한다',
      D.after.inkW + ' vs ' + D.long.inkW);
  }

  sec('[E] 콘솔·페이지 에러');
  ok(allErrs.length === 0, 'E1 에러 0건', allErrs.join(' | '));

  await ctx.close();
  await browser.close();
  console.log('\nPROBE689  ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
