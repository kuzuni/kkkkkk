#!/usr/bin/env node
/* 689 검증 — 훈련 상한 표기는 «상한» 이 아니라 «MAX» (저장소 주인 지시 2026-09-02 01:30)
 *
 *   node tools/verify689.js
 *
 * 주인 원문: «훈련에 상한으로 뜨지말고 MAX 라고 떠야함».
 *
 * 계약 한 줄 — **23 훈련 카드가 그 단계의 상한에 닿으면 비용 줄(`.cb i`)이 «MAX» 라고 쓴다.**
 *   같은 카드의 알약(`.cv i`)은 486 부터 이미 «MAX» 였다 ⇒ 이 작업은 «새 표기» 가 아니라
 *   **한 카드 안에서 갈려 있던 표기의 통일**이다(재현 `tools/probe689.js` [A2] 가 그 갈림을 찍었다).
 *
 * 재현이 먼저 가른 것(338 규칙 · `tools/probe689.js`):
 *   · [A] 상한 카드 3장 전부 `.cb i` = «상한» · `.cv i` = «MAX» — 주인이 본 그림 재현.
 *   · [C] **스코프는 훈련 카드 한 부품뿐**이다. 단련·룬 서브탭을 실제로 갈아 훑어도
 *         렌더된 «상한» 은 0건 ⇒ 지시서의 «같은 부품이면 같이 통일» 갈래는 **탈 것이 없다**.
 *         (⚠ 1회차에 `trSub` 만 바꿔 `#trw` 를 훑었더니 같은 카드를 세 번 세어 거짓 3건이 나왔다 —
 *          `renderTrain()` 은 서브탭과 무관하게 `#trCards` 를 늘 채운다. 라벨은 컨테이너가 준다.)
 *   · [D] **380(라틴 폴백) 걱정은 구조적으로 없다.** GameKR 서브셋이 ASCII 를 포함하고,
 *         폭 예산은 비용 문자열이 정한다 — 최장 «999.99AA» 208.98px ≫ «MAX» 92.83px(밴드 안쪽 299px).
 *         코인 중심은 7.36px 왼쪽으로 갈 뿐이고 그 폭은 평소 비용 문자열 변동(«1.23K» 기준) 안이다.
 *         ⇒ CSS 보정 0줄이 정답이다. 제품은 `index.html` 2자리(통째 렌더 · 가벼운 갱신).
 *
 * 검사 항목 (LESSONS «156 비고» 4 — «틀린 것을 잡는 칸» 과 «맞은 것을 지키는 칸» 을 짝으로):
 *   [A] 상한 카드 3장(공격·체력·재생) · 두 렌더 경로 모두 `.cb i` = «MAX»
 *   [B] 음성항 — 상한 «미달» 이면 비용 숫자 그대로다(«MAX» 가 상시 뜨지 않는다)
 *   [C] 경계 — 상한 직전(cap−1)은 숫자, 상한에 닿는 순간 «MAX» 로 바뀐다(실제 구매로)
 *   [D] 통일 — 알약과 버튼이 같은 말을 한다(한쪽만 되돌아가면 빨강)
 *   [E] 렌더된 «상한» 0건 — 열린 문서 어디에도 안 남았다(단련·룬 포함)
 *   [F] 소스 — 두 렌더 경로에 «상한» 문자열 리터럴이 안 남았다
 *   [G] 잘림·침범 0 — «MAX» 잉크가 밴드 안(380 축) · 레이아웃 Δ0px(밴드 상자 불변)
 *   [R] 되돌림 시험 — «MAX» 를 «상한» 으로 되돌린 사본에서 [A]·[E] 가 실제로 빨개진다
 *       (안 하면 «이미 참인 것을 게이트로 굳힌» 338 함정과 구별이 안 된다)
 *   [I] 콘솔·페이지 에러 0
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };
const eq = (m, got, want) => ok(got === want, m, 'got ' + JSON.stringify(got) + ' · want ' + JSON.stringify(want));
const sec = t => console.log('\n' + t);

/* 708 처방 — evaluate 안의 예외로 게이트가 통째로 죽지 않게 한다 */
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

const CAPALL_SRC = `window.CAPALL_ = function(){
  S.trainStage = 3; var cap = trainCap();
  S.lv.atk = cap; S.lv.hp = cap; S.lv.regen = cap;
  markDirty(); renderTrain();
  return cap;
};`;

async function open(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const errs = [];
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(save)]);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function');
  await page.evaluate(() => { step = () => {}; S.autoBuy = false; openTrain(); renderTrain(); });
  await page.evaluate(CAPALL_SRC);
  await page.waitForTimeout(400);
  return { ctx, page, errs };
}

/* 열린 문서에서 렌더된 «상한» 잎 노드를 센다 — 스크립트·스타일 제외, 컨테이너 라벨 */
const SCAN_SRC = function () {
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
  const seen = new Set(); const hits = [];
  ['train', 'rune', 'temper'].forEach(t => {
    trSub = t; renderTrain();
    document.querySelectorAll('body *').forEach(n => {
      if (SKIP[n.tagName] || n.children.length) return;
      const txt = (n.textContent || '').trim();
      if (!txt.includes('상한')) return;
      const k = host(n) + '|' + (n.className || n.tagName) + '|' + txt.slice(0, 40);
      if (!seen.has(k)) { seen.add(k); hits.push({ where: host(n), sel: n.className || n.tagName, txt: txt.slice(0, 40) }); }
    });
  });
  trSub = 'train'; renderTrain();
  return hits;
};

(async () => {
  const browser = await launch(chromium);
  let allErrs = [];
  const CODE = fs.readFileSync(SRC, 'utf8');

  const { ctx, page, errs } = await open(browser, SRC);
  allErrs = allErrs.concat(errs);

  /* ── [A] 상한 카드 3장 · 두 렌더 경로 ── */
  sec('[A] 상한 카드 3장 — 비용 줄이 «MAX»(통째 렌더 · 가벼운 갱신 둘 다)');
  const A = await ev(page, () => {
    const cap = CAPALL_();
    const read = () => ['atk', 'hp', 'regen'].map(k => {
      const el = document.querySelector('#trCards [data-tr="' + k + '"]');
      return { k, cb: el.querySelector('.cb i').textContent,
        cv: el.querySelector('.cv i').textContent, cls: el.className };
    });
    const full = read();                        /* renderTrain() 통째 */
    renderTrainLive();                          /* 가벼운 갱신 경로 */
    const live = read();
    return { cap, full, live };
  });
  if (blk(A, '[A]')) {
    console.log('    단계 3 상한 Lv = ' + A.cap);
    A.full.forEach(r => console.log('    ' + r.k.padEnd(6) + ' .cb i «' + r.cb + '»   .cv i «' + r.cv + '»'));
    ok(A.full.every(r => r.cb === 'MAX'), 'A1 통째 렌더 — 3장 전부 비용 줄 «MAX»',
      A.full.map(r => r.k + ':' + r.cb).join(' '));
    ok(A.live.every(r => r.cb === 'MAX'), 'A2 가벼운 갱신 뒤에도 3장 전부 «MAX»',
      A.live.map(r => r.k + ':' + r.cb).join(' '));
    ok(A.full.every(r => /\bfull\b/.test(r.cls)), 'A3 세 장 다 .full 클래스(전제)');
  }

  /* ── [B] 음성항 — 미달이면 숫자 ── */
  sec('[B] 음성항 — 상한 미달이면 비용 숫자 그대로(«MAX» 상시 점등 아님)');
  const B = await ev(page, () => {
    S.trainStage = 3; S.lv.atk = 0; S.lv.hp = 0; S.lv.regen = 0; markDirty(); renderTrain();
    const el = document.querySelector('#trCards [data-tr="atk"]');
    const a = { cb: el.querySelector('.cb i').textContent, cls: el.className };
    renderTrainLive();
    return { a, liveCb: el.querySelector('.cb i').textContent };
  });
  if (blk(B, '[B]')) {
    console.log('    미달 .cb i «' + B.a.cb + '»');
    ok(B.a.cb !== 'MAX' && B.a.cb !== '상한' && B.a.cb.length > 0,
      'B1 미달 카드 비용 줄은 숫자다', B.a.cb);
    ok(B.liveCb === B.a.cb, 'B2 가벼운 갱신도 같다', B.liveCb);
    ok(!/\bfull\b/.test(B.a.cls), 'B3 미달 카드에 .full 없음', B.a.cls);
  }

  /* ── [C] 경계 — cap−1 은 숫자, 실제 구매로 cap 에 닿으면 «MAX» ── */
  sec('[C] 경계 — 상한 직전은 숫자 · 닿는 순간 «MAX»(실제 구매 경로)');
  /* ⚠ 합성 `el.click()` 으로는 안 산다 — 64 가 카드 구매를 **포인터 이벤트**(pointerdown/up,
     꾹누르기 반복)에 걸어 두었기 때문이다. 실제 입력으로 눌러야 한다(verify326 선례). */
  const C0 = await ev(page, () => {
    S.trainStage = 3; const cap = trainCap();
    S.buyQty = 1; S.lv.atk = cap - 1; S.lv.hp = 0; S.lv.regen = 0; markDirty(); renderTrain();
    return { cap, lv0: S.lv.atk,
      before: document.querySelector('#trCards [data-tr="atk"] .cb i').textContent };
  });
  await page.click('#trCards > [data-tr="atk"] .cb');
  await page.waitForTimeout(250);
  const C1 = await ev(page, () => {
    renderTrainLive();
    return { lv: S.lv.atk,
      after: document.querySelector('#trCards [data-tr="atk"] .cb i').textContent };
  });
  const C = (C0 && C0.__err) ? C0 : (C1 && C1.__err) ? C1 : Object.assign({}, C0, C1);
  if (blk(C, '[C]')) {
    console.log('    cap ' + C.cap + ' · Lv ' + C.lv0 + ' → ' + C.lv + ' · «' + C.before + '» → «' + C.after + '»');
    ok(C.before !== 'MAX' && C.before.length > 0, 'C1 상한 직전(cap−1)은 숫자다', C.before);
    ok(C.lv === C.cap, 'C2 구매로 상한에 닿았다(전제)', C.lv + '/' + C.cap);
    eq('C3 닿는 순간 «MAX» 로 바뀐다', C.after, 'MAX');
  }

  /* ── [D] 통일 — 알약과 버튼이 같은 말 ── */
  sec('[D] 통일 — 상한 카드의 알약과 버튼이 같은 표기(689 의 본체)');
  const D = await ev(page, () => {
    CAPALL_();
    const el = document.querySelector('#trCards [data-tr="atk"]');
    return { cb: el.querySelector('.cb i').textContent, cv: el.querySelector('.cv i').textContent };
  });
  if (blk(D, '[D]')) {
    eq('D1 알약 «MAX»', D.cv, 'MAX');
    eq('D2 버튼 «MAX»', D.cb, 'MAX');
    ok(D.cb === D.cv, 'D3 둘이 같다 — 한쪽만 되돌아가면 여기가 빨개진다', D.cb + ' / ' + D.cv);
  }

  /* ── [E] 렌더된 «상한» 0건 ── */
  sec('[E] 렌더된 «상한» 0건 — 단련·룬 포함 열린 문서 전체');
  const E = await ev(page, SCAN_SRC);
  if (blk(E, '[E]')) {
    E.forEach(h => console.log('      [' + h.where + '] ' + h.sel + ' «' + h.txt + '»'));
    ok(E.length === 0, 'E1 렌더된 «상한» 0건', E.length + '건');
  }

  /* ── [F] 소스 — 두 렌더 경로에 리터럴 잔재 0 ── */
  sec('[F] 소스 — 두 렌더 경로에 «상한» 리터럴이 안 남았다');
  ok(!/set\('\.cb i',\s*c\.full \? '상한'/.test(CODE),
    'F1 가벼운 갱신 경로(renderTrainLive)에 «상한» 리터럴 없음');
  ok(!/class="cb"><s>'\s*\+\s*c\.coin\s*\+\s*'<\/s><i>'\s*\+\s*\(c\.full \? '상한'/.test(CODE),
    'F2 통째 렌더 경로(renderTrain)에 «상한» 리터럴 없음');
  ok(/set\('\.cb i',\s*c\.full \? 'MAX'/.test(CODE), 'F3 가벼운 갱신 경로가 «MAX» 를 쓴다');
  ok(/\(c\.full \? 'MAX' : c\.cost\)/.test(CODE), 'F4 통째 렌더 경로가 «MAX» 를 쓴다');

  /* ── [G] 380 축 — 잉크가 밴드 안 · 레이아웃 Δ0px ── */
  sec('[G] 380 축 — «MAX» 잉크가 밴드 안 · 밴드 상자 Δ0px');
  const G = await ev(page, () => {
    CAPALL_();
    const el = document.querySelector('#trCards [data-tr="atk"]');
    const band = el.querySelector('.cb');
    const i = band.querySelector('i'), s = band.querySelector('s');
    const bb = band.getBoundingClientRect();
    const pr = parseFloat(getComputedStyle(band).paddingRight) || 0;
    const rg = document.createRange(); rg.selectNodeContents(i);
    const rb = rg.getBoundingClientRect();
    const sb = s.getBoundingClientRect();
    /* 같은 밴드에 최장 비용 문자열을 넣었을 때의 폭 — 예산의 주인이 누구인지 */
    const keep = i.textContent; i.textContent = '999.99AA'; void band.offsetWidth;
    const rg2 = document.createRange(); rg2.selectNodeContents(i);
    const longW = rg2.getBoundingClientRect().width;
    /* 레이아웃 Δ0px 은 **상수를 외워 두는 것이 아니라 두 상태를 재서** 본다 —
       상한(«MAX») 판과 미달(숫자) 판의 밴드 상자가 같으면 표기가 기하를 안 건드린 것이다.
       (⚠ 1회차에 `line-height:74px` 를 밴드 높이로 착각해 «310×74» 를 박았다가 빨개졌다. 실측 106.) */
    i.textContent = keep; void band.offsetWidth;
    const boxMax = band.getBoundingClientRect();
    S.lv.atk = 0; markDirty(); renderTrain();
    const band2 = document.querySelector('#trCards [data-tr="atk"] .cb');
    const boxNum = band2.getBoundingClientRect();
    const numTxt = band2.querySelector('i').textContent;
    CAPALL_();                                  /* 원복 */
    return {
      boxMax: [+boxMax.width.toFixed(2), +boxMax.height.toFixed(2), +boxMax.left.toFixed(2), +boxMax.top.toFixed(2)],
      boxNum: [+boxNum.width.toFixed(2), +boxNum.height.toFixed(2), +boxNum.left.toFixed(2), +boxNum.top.toFixed(2)],
      numTxt,
      bandL: +bb.left.toFixed(2), bandR: +bb.right.toFixed(2), bandT: +bb.top.toFixed(2),
      bandW: +bb.width.toFixed(2), bandH: +bb.height.toFixed(2), pr,
      inkL: +rb.left.toFixed(2), inkR: +rb.right.toFixed(2), inkW: +rb.width.toFixed(2),
      coinL: +sb.left.toFixed(2), longW: +longW.toFixed(2) };
  });
  if (blk(G, '[G]')) {
    console.log('    밴드 ' + G.bandL + '..' + G.bandR + ' (w' + G.bandW + ' h' + G.bandH + ', padR ' + G.pr + ')');
    console.log('    «MAX» 잉크 ' + G.inkL + '..' + G.inkR + ' (w' + G.inkW + ')  ·  최장 비용 잉크 w' + G.longW);
    ok(G.inkR <= G.bandR - G.pr, 'G1 잉크 우변이 밴드 안쪽(패딩 제외) 안', G.inkR + ' ≤ ' + (G.bandR - G.pr));
    ok(G.coinL >= G.bandL, 'G2 코인 좌변이 밴드 안', G.coinL + ' ≥ ' + G.bandL);
    ok(G.inkW < G.longW, 'G3 폭 예산은 비용 문자열이 정한다 — «MAX» 는 그보다 좁다',
      G.inkW + ' < ' + G.longW);
    /* 레이아웃 Δ0px — 상한 판(«MAX»)과 미달 판(숫자« + G.numTxt + »)의 밴드 상자를 **재서** 견준다 */
    console.log('    밴드 상자  «MAX» [' + G.boxMax.join(', ') + ']  ·  숫자«' + G.numTxt + '» [' + G.boxNum.join(', ') + ']');
    ok(G.boxMax.join(',') === G.boxNum.join(','),
      'G4 상한 판과 미달 판의 밴드 상자가 같다 = 표기가 기하를 안 건드렸다(레이아웃 Δ0px)',
      G.boxMax.join(',') + '  vs  ' + G.boxNum.join(','));
  }

  sec('[I] 콘솔·페이지 에러');
  ok(allErrs.length === 0, 'I1 에러 0건', allErrs.join(' | '));
  await ctx.close();

  /* ── [R] 되돌림 시험 — «MAX» 를 «상한» 으로 되돌린 사본에서 [A]·[E] 가 빨개지는가 ──
     338 함정 방지: 이 절이 없으면 «이미 참이던 것을 굳힌 게이트» 와 구별이 안 된다. */
  sec('[R] 되돌림 시험 — 되돌린 사본에서 A·E 가 실제로 빨개진다');
  const tmp = path.join(os.tmpdir(), 'verify689-revert-' + process.pid + '.html');
  const reverted = CODE
    .replace(/set\('\.cb i', c\.full \? 'MAX' : c\.cost\)/, "set('.cb i', c.full ? '상한' : c.cost)")
    .replace(/\(c\.full \? 'MAX' : c\.cost\)/, "(c.full ? '상한' : c.cost)");
  const changed = (reverted.match(/'상한'/g) || []).length;
  ok(changed >= 2, 'R0 사본이 두 자리 다 되돌려졌다(전제)', changed + '자리');
  fs.writeFileSync(tmp, reverted);
  try {
    const r = await open(browser, tmp);
    const rA = await ev(r.page, () => {
      CAPALL_();
      return ['atk', 'hp', 'regen'].map(k =>
        document.querySelector('#trCards [data-tr="' + k + '"] .cb i').textContent);
    });
    const rE = await ev(r.page, SCAN_SRC);
    if (blk(rA, '[R] A')) ok(rA.every(t => t === '상한'),
      'R1 되돌린 사본은 «상한» 으로 돌아간다 = A1 이 실제로 이 자리를 본다', rA.join('/'));
    if (blk(rE, '[R] E')) ok(rE.length > 0,
      'R2 되돌린 사본에서 E1 이 빨개진다(«상한» ' + rE.length + '건 검출)', rE.length + '건');
    await r.ctx.close();
  } finally { try { fs.unlinkSync(tmp); } catch (_) {} }

  await browser.close();
  console.log('\nVERIFY689  ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
