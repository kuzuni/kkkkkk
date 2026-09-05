#!/usr/bin/env node
/* 957 검증 — «가운데 다이얼로그 개폐 연출(`jzBox…`) 정착을 손으로 적은 자가 다섯»
 *
 *   node tools/verify957.js
 *
 * 무엇을 고쳤나: 950 이 §box(`tools/settle291.js` QUIET_SRC · `window.settleBox`)를 세웠는데
 * **같은 일을 손으로 적은 자가 다섯 남아 있었다**(`probe950` [5]) — `verify46`(244) ·
 * `verify429`(764) · `probe764` · `verify268`(135) · `smoke.js`(135). 957 은 그 중 **넷**을
 * §box 로 모았고(+ `verify429` 의 771 `settlePg` 까지 다섯 자리), 그 이관이 성립하도록
 * §box 의 `pend()` 에 **«무한 반복은 안 기다린다»** 한 항을 심었다.
 *
 *   [1] 부품   — §box 가 무한 반복을 거르고, 노드 쪽 한 자리(`settleAnimOn`)가 있다
 *   [2] 그 항이 **일한다** — `^jz` 로 불러도 즉시 돌아온다(없으면 상한까지 붙잡힌다 = 되돌림 시험)
 *   [3] 사본 0 — 네 자리가 규칙을 다시 안 적고 §box 를 부른다(`settlePg` 동치 포함)
 *   [4] 실동작 — 그 자리에서 재면 연출이 정착된 값이 잡힌다(`.sk-db` 750×290)
 *   [5] 래칫   — 손으로 적은 자는 **하나**(`verify46`)뿐이고 그 파일이 사유를 적었다
 *   [6] 무해   — `^jzBox` 에는 무한 반복 연출이 0건이다(485·950 의 기존 호출자 동작 불변)
 *   [R] 되돌림 — `PW_SETTLEBOX=0` 이면 §box 가 즉시 돌아오고 그 자리에서 연출 프레임이 잡힌다
 *   [Z] 콘솔 에러 0건
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { QUIET_SRC, settleAnimOn, CAP_MS } = require('./settle291');
const { handRolled } = require('./probe950');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const rd = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const blk = t => console.log('\n' + t);

/* 무한 반복 `jz…` 를 **자기 손으로** 하나 세운다 — 제품 상태에 안 기대는 결정적 시험대다.
   (제품에도 `jzDotPulse`·`bgm*` 같은 상시 연출이 있지만 화면·시점에 따라 있고 없다) */
const PLANT_INF = `() => {
  if (!document.getElementById('inf957')) {
    const st = document.createElement('style'); st.id = 'inf957';
    st.textContent = '@keyframes jzInf957{from{opacity:.9}to{opacity:.5}}'
      + '#infnode957{position:fixed;left:-99px;top:-99px;width:2px;height:2px;'
      + 'animation:jzInf957 .3s linear infinite}';
    document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'infnode957'; document.body.appendChild(d);
  }
  return (document.getAnimations ? document.getAnimations() : [])
    .filter(a => /^jzInf957/.test(a.animationName || '')).length; }`;

/* [4][R] 이 재는 상자 — 950 이 쓰던 것과 같은 자리(펫 세부 `.sk-db` 750×290) */
const SAMPLE = `async (how) => { try {
  const pet = PETS.find(x => x.g === 5 && (x.j || 0) === 3);
  S.own[pet.id] = { l: 1 };
  showItem(pet.id);
  if (how.settle) await window.settleAnim291('^jz', 3000);
  const box = document.querySelector('#modal .sk-db');
  const r = box ? Math.round(box.getBoundingClientRect().width) + '×'
                  + Math.round(box.getBoundingClientRect().height) : '없음';
  if (typeof closeModal === 'function') closeModal();
  delete S.own[pet.id];
  await new Promise(res => setTimeout(res, 320));
  return r;
} catch (e) { return 'ERR ' + String(e && e.message || e); } }`;

(async () => {
  const settleSrc = rd('settle291.js');
  const v429 = rd('verify429.js'), p764 = rd('probe764.js');
  const v268 = rd('verify268.js'), smk = rd('smoke.js'), v46 = rd('verify46.js');

  /* ── [1] 부품 ─────────────────────────────────────────────── */
  blk('[1] 부품 — §box 가 무한 반복을 거르고, 노드 쪽 한 자리가 있다');
  ok(/iterations\s*===\s*Infinity/.test(QUIET_SRC),
    '1a §box(QUIET_SRC)가 «무한 반복은 안 기다린다» 를 갖는다');
  ok(typeof settleAnimOn === 'function' && /function settleAnimOn/.test(settleSrc),
    '1b 노드 쪽 한 자리 `settleAnimOn(page, pat, cap)` 이 있다');
  ok(settleSrc.includes('QUIET_SRC') && /eval\(src\)\(p, c\)/.test(settleSrc),
    '1c 안 심긴 페이지에서도 **같은 소스 문자열**을 돌린다(사본을 안 적는다)');
  ok(/quiet >= 2/.test(QUIET_SRC) && QUIET_SRC.includes(String(CAP_MS)),
    '1d 규칙 자체(두 프레임 조용 · 상한 ' + CAP_MS + 'ms)는 950 것 그대로다');
  ok(/Promise\.race\(\[Promise\.all/.test(QUIET_SRC) && /const left = Math\.max/.test(QUIET_SRC),
    '1e 상한이 **기다리는 동안에도** 산다 — `finished` 를 기다리는 자리를 남은 시간과 경주시킨다');

  /* ── [3] 사본 0 ───────────────────────────────────────────── */
  blk('[3] 사본 0 — 네 자리가 규칙을 다시 안 적는다');
  const RULE = /for \(let quiet = 0; quiet < 2/;      /* 손으로 적은 그 루프의 지문 */
  ok(!RULE.test(v429) && /window\.settleBox\(\)/.test(v429),
    '3a `verify429` 가 §box 를 부르고 규칙 루프는 0건');
  ok(!RULE.test(p764) && /window\.settleBox\(\)/.test(p764),
    '3b `probe764` 가 §box 를 부르고 규칙 루프는 0건');
  ok(/settleAnimOn\(page, '\^jzPg'\)/.test(v429),
    '3c 771 의 `settlePg` 도 같은 부품의 **이름 패턴 일반형**으로 접혔다');
  ok(/settleAnimOn\(p, '\^jz', 3000\)/.test(v268) && !/getAnimations/.test(v268),
    '3d `verify268`(135) 이 §box 를 쓰고 `getAnimations` 사본은 0건');
  ok(/settleAnimOn\(page, '\^jz', 3000\)/.test(smk) && !/getAnimations/.test(smk),
    '3e `smoke.js`(135) 도 같다 — 상한 3000ms 는 종전 값 그대로');
  ok(/require\('\.\/settle291'\)/.test(v268) && /require\('\.\/settle291'\)/.test(smk)
     && /require\('\.\/settle291'\)/.test(v429),
    '3f 셋 다 부품을 이름으로 가져다 쓴다');

  /* ── [5] 래칫 ─────────────────────────────────────────────── */
  blk('[5] 래칫 — 손으로 적은 자는 하나뿐이고 사유가 적혀 있다');
  const dup = handRolled();
  for (const d of dup) console.log('   ' + d.file + ':' + d.line + '  ' + d.why);
  const hand = dup.filter(d => d.why === '손으로 적었다');
  ok(hand.length <= 1, '5a 손 사본 ' + hand.length + '자 (957 착수 시 5자)',
    hand.map(h => h.file).join(' · ') || '없음');
  ok(hand.every(h => h.file === 'verify46.js'),
    '5b 남은 하나는 `verify46`(244 · 셀렉터형)이다', hand.map(h => h.file).join(' · ') || '없음');
  ok(/작업 957/.test(v46) && /안 접는다/.test(v46),
    '5c 그 파일이 **왜 안 접었는지**를 스스로 적었다(사유 없는 사본이 생기면 여기가 빨개진다)');
  const GONE = ['verify429.js', 'verify268.js', 'smoke.js'];
  ok(GONE.every(f => !dup.some(d => d.file === f)),
    '5d 셋은 **지문 자체가 사라졌다** — `getAnimations`+`playState` 사본이 0건이다',
    GONE.filter(f => dup.some(d => d.file === f)).join(' · ') || GONE.join(' · ') + ' 전부');
  ok(dup.some(d => d.file === 'probe764.js' && d.why === '공용 §box 를 쓴다'),
    '5e `probe764` 는 «부르는 쪽» 으로 남았다 — 재현기가 재는 대상이 곧 공용 부품이다');

  /* ── 브라우저 ─────────────────────────────────────────────── */
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof showItem === 'function');
  await page.waitForTimeout(500);

  /* ── [2] 그 항이 일한다 ───────────────────────────────────── */
  blk('[2] 무한 반복 항 — `^jz` 로 불러도 즉시 돌아온다 (없으면 상한까지 붙잡힌다)');
  const planted = await page.evaluate(src => eval(src)(), PLANT_INF);
  ok(planted >= 1, '2a 무한 반복 `jzInf957` 을 세웠다', planted + '개');
  const tWith = await page.evaluate(async () => {
    const t = performance.now(); await window.settleAnim291('^jz', 3000);
    return Math.round(performance.now() - t); });
  ok(tWith < 800, '2b 항이 있으면 ' + tWith + 'ms 만에 돌아온다(무한 연출을 안 기다린다)');
  /* 되돌림 시험 — 그 항만 지운 사본은 같은 자리에서 상한(800ms)까지 붙잡힌다 */
  const noGuard = QUIET_SRC.replace(/\s*&& !\(a\.effect && a\.effect\.getTiming[\s\S]*?Infinity\)/, '');
  ok(noGuard !== QUIET_SRC && !/Infinity/.test(noGuard), '2c 되돌림 사본(그 항만 뺀 것)을 만들었다');
  /* ⚠ 이 사본은 무한 연출의 `finished` 를 기다리므로 **상한이 없으면 영영 안 돌아온다.**
     1e 의 경주가 그것을 상한 800ms 로 자른다 — 그래서 «오래 붙잡힌다» 로 재고,
     혹시라도 안 돌아오면 노드 쪽 시계(2500ms)가 -1 로 끊어 자가 안 멎게 한다. */
  const noGuardRun = page.evaluate(async src => {
    const t = performance.now(); await eval(src)('^jz', 800);
    return Math.round(performance.now() - t); }, noGuard).catch(() => -2);
  const tNo = await Promise.race([noGuardRun, new Promise(r => setTimeout(() => r(-1), 2500))]);
  ok(tNo === -1 || tNo >= 700,
    '2d 항이 없으면 그 자리에 오래 붙잡힌다 — 2b 가 헛초록이 아니다',
    (tNo === -1 ? '2500ms 안에 안 돌아왔다' : tNo + 'ms'));
  await page.evaluate(() => { const n = document.getElementById('infnode957');
                              const s = document.getElementById('inf957');
                              if (n) n.remove(); if (s) s.remove(); });

  /* ── [6] 무해 ─────────────────────────────────────────────── */
  blk('[6] 무해 — `^jzBox` 자리에는 무한 반복이 0건이라 485·950 의 동작이 안 바뀐다');
  const infBox = await page.evaluate(async () => {
    const pet = PETS.find(x => x.g === 5 && (x.j || 0) === 3);
    S.own[pet.id] = { l: 1 }; showItem(pet.id);
    const n = (document.getAnimations ? document.getAnimations() : [])
      .filter(a => /^jzBox/.test(a.animationName || '')
        && a.effect && a.effect.getTiming().iterations === Infinity).length;
    if (typeof closeModal === 'function') closeModal();
    delete S.own[pet.id];
    await new Promise(r => setTimeout(r, 320));
    return n; });
  ok(infBox === 0, '6a 상자 연출 중 무한 반복 `jzBox…` 0건', infBox + '개');

  /* ── [4] 실동작 ───────────────────────────────────────────── */
  blk('[4] 실동작 — 135 계열이 쓰는 `^jz` 패턴으로도 상자가 정착한다');
  const run = how => page.evaluate(([src, h]) => eval(src)(h), [SAMPLE, how]);
  const fixed = [];
  for (let i = 0; i < 6; i++) fixed.push(await run({ settle: true }));
  ok(fixed.every(r => r === '750×290'), '4a 6회 전부 750×290', [...new Set(fixed)].join(' · '));
  ok(new Set(fixed).size === 1, '4b 흔들림 0 — 값이 한 가지다', new Set(fixed).size + '가지');

  /* ── [R] 되돌림 ───────────────────────────────────────────── */
  blk('[R] 되돌림 — `PW_SETTLEBOX=0`(`__settleBoxOff`) 이면 §box 는 기다리지 않는다');
  const offMs = await page.evaluate(async () => {
    window.__settleBoxOff = true; const t = performance.now();
    await window.settleAnim291('^jz', 3000); return Math.round(performance.now() - t); });
  ok(offMs < 50, 'R1 스위치를 켜면 즉시 돌아온다', offMs + 'ms');
  const offBox = await run({ settle: true });
  ok(offBox !== '750×290', 'R2 그 상태에서는 그 자리가 다시 «연출 중» 프레임이다 — 4a 가 헛초록이 아니다', offBox);
  await page.evaluate(() => { window.__settleBoxOff = false; });
  const back = await run({ settle: true });
  ok(back === '750×290', 'R3 스위치를 내리면 되돌아온다', back);

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\nVERIFY957 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
