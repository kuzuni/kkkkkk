#!/usr/bin/env node
/* 950 검증 — «`verify485` 가 부하에서 흔들린다»(자 플레이키 · 291 353 구멍)
 *
 *   node tools/verify950.js
 *
 * 무엇을 고쳤나: `verify485` [E] 는 세부 팝업을 열고 **고정 400ms** 를 기다린 뒤 `.sk-db` 를 쟀다.
 * 그 400ms 는 `jzBoxIn`(.22s · scale .92 → 1.02 → 1) 곡선 위 아무 데나 떨어진다 —
 * par 7 부하에서 14회 중 5회 빨강(690×267 = ×0.920 · 751×290 · 754×292).
 *
 * ⚑ **등재문이 «settle291() 한 줄» 을 처방으로 적었는데 그것만으로는 안 닫힌다** — 291 의 필터
 *   `/^jz(Pg|Sheet)/` 에 `jzBoxIn` 이 **없다**(`probe950` [2] 가 «불러도 여전히 690×267» 로 찍는다).
 *   ⇒ `settle291.js` 에 **§box**(QUIET_SRC · `window.settleBox()`)를 세우고 그것을 부른다.
 *
 *   [1] 부품    — §box 가 심긴다(`window.settleBox`·`window.settleAnim291`)
 *   [2] 훅 불변 — `waitForTimeout` 훅 필터는 한 글자도 안 넓혔다(764 ⓐ — 64·262·107 은 시간을 잰다)
 *   [3] 규칙    — 「두 프레임 연속 조용」 + 상한 1500ms + 자기 스위치
 *   [4] 자리    — `verify485` [E] 가 시계 대신 §box 를 쓴다(폴백은 남는다)
 *   [5] 실동작  — §box 로 재면 12회가 한 값이다
 *   [6] 스위치  — `PW_SETTLE=0`(931·946 대조 조건)은 §box 를 **안** 끈다 · 끄는 것은 `PW_SETTLEBOX=0`
 *   [7] 래칫    — 「한 evaluate 안에서 열고→기다리고→잰다」 게이트 수가 더 안 는다
 *   [R] 되돌림  — §box 를 안 부르면 그 자리에서 690×267 이 잡힌다(이 자가 헛초록이 아니다)
 *   [Z] 콘솔 에러 0건
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SETTLE_SRC, IN_PAGE_SRC, QUIET_SRC, CAP_MS } = require('./settle291');
const { census } = require('./probe950');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const TOOLS = __dirname;
const rd = f => fs.readFileSync(path.join(TOOLS, f), 'utf8');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const blk = t => console.log('\n' + t);

/* 게이트 [E5]·[E6] 이 재는 것과 같은 두 상자 — 750×290 / 684×120 이 정답 */
const SAMPLE = `async (how) => { try {
  const pet = PETS.find(x => x.g === 5 && (x.j || 0) === 3);
  S.own[pet.id] = { l: 1 };
  showItem(pet.id);
  let waited = -1;
  if (how.ms >= 0) await new Promise(res => setTimeout(res, how.ms));
  if (how.settleBox && window.settleBox) { const t = performance.now(); await window.settleBox();
                                           waited = Math.round(performance.now() - t); }
  const box = document.querySelector('#modal .sk-db');
  const p = box ? box.querySelector('p') : null;
  const r = e => e ? Math.round(e.getBoundingClientRect().width) + '×'
                     + Math.round(e.getBoundingClientRect().height) : '없음';
  const out = { db: r(box), p: r(p), waited };
  if (typeof closeModal === 'function') closeModal();
  delete S.own[pet.id];
  await new Promise(res => setTimeout(res, 320));
  return out;
} catch (e) { return { err: String(e && e.message || e) }; } }`;

(async () => {
  const settleSrc = rd('settle291.js');
  const v485 = rd('verify485.js');

  /* ── [1] 부품 ─────────────────────────────────────────────── */
  blk('[1] 부품 — §box 가 `settle291.js` 안에 있고 페이지에 심긴다');
  ok(/const QUIET_SRC = /.test(settleSrc) && typeof QUIET_SRC === 'string' && QUIET_SRC.length > 100,
    '1a `settle291.js` 가 §box 본체(QUIET_SRC)를 갖고 내보낸다', QUIET_SRC.length + '자');
  ok(/window\.settleBox\s*=/.test(settleSrc) && /window\.settleAnim291\s*=/.test(settleSrc),
    '1b `addInitScript` 가 `window.settleBox`·`window.settleAnim291` 을 심는다');
  ok(/jzBox/.test(QUIET_SRC), '1c §box 는 `jzBox` 를 본다(291 필터가 못 보던 그 이름)');

  /* ── [2] 훅 불변 ──────────────────────────────────────────── */
  blk('[2] 훅 불변 — `waitForTimeout` 훅 필터는 한 글자도 안 넓혔다 (764 ⓐ)');
  ok(!/jzBox/.test(SETTLE_SRC), '2a SETTLE_SRC 에 `jzBox` 0건');
  ok(!/jzBox/.test(IN_PAGE_SRC), '2b IN_PAGE_SRC(§in-page) 에 `jzBox` 0건');
  const pendSrc = (settleSrc.match(/const PENDING_SRC = `[\s\S]*?`;/) || [''])[0];
  ok(pendSrc && !/jzBox/.test(pendSrc), '2c PENDING_SRC(선검사) 에 `jzBox` 0건');
  ok(/jz\(Pg\|Sheet\)/.test(SETTLE_SRC) && /jz\(Pg\|Sheet\)/.test(IN_PAGE_SRC),
    '2d 훅·§in-page 는 여전히 `/^jz(Pg|Sheet)/` 다 — 44자에 rAF 두 프레임을 얹지 않았다');

  /* ── [3] 규칙 ─────────────────────────────────────────────── */
  blk('[3] 규칙 — 두 프레임 조용 · 상한 · 자기 스위치');
  ok(/quiet >= 2/.test(QUIET_SRC),
    '3a 「**두 프레임 연속** 돌 것이 없을 때만 끝낸다」 — 다음 프레임에 붙는 연출의 창을 닫는다(764 ⓑ)');
  ok(new RegExp('performance\\.now\\(\\) - t0 > lim').test(QUIET_SRC) && QUIET_SRC.includes(String(CAP_MS)),
    '3b 상한 ' + CAP_MS + 'ms — `finished` 가 안 와도 자를 멈추지 않는다');
  ok(/__settleBoxOff/.test(QUIET_SRC) && /PW_SETTLEBOX/.test(settleSrc),
    '3c 자기 되돌림 스위치 `PW_SETTLEBOX=0`');
  ok(/requestAnimationFrame\(\(\) => requestAnimationFrame\(r\)\)/.test(QUIET_SRC),
    '3d 조용한 프레임도 rAF 2프레임으로 센다(스타일이 확정된 프레임에서 재게)');

  /* ── [4] 자리 ─────────────────────────────────────────────── */
  blk('[4] 자리 — `verify485` [E] 가 시계 대신 §box 를 쓴다');
  const eBlock = v485.slice(v485.indexOf('const E = await page.evaluate'), v485.indexOf('ok(E.hasEq'));
  ok(/window\.settleBox\(\)/.test(eBlock), '4a [E] 가 `window.settleBox()` 를 부른다');
  ok(/__settleBoxOff/.test(eBlock), '4b 되돌림 스위치를 보고 종전 고정 대기로 되돌아간다');
  ok((eBlock.match(/setTimeout\(r, 400\)/g) || []).length === 1
     && /else await new Promise\(r => setTimeout\(r, 400\)\)/.test(eBlock),
    '4c 남은 400ms 는 **폴백 한 자리뿐**이다(사슬 밖·스위치 off 에서만 돈다)');

  /* ── [5][R] 실동작 ────────────────────────────────────────── */
  blk('[5][R] 실동작 — 브라우저에서 직접 재 본다');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof showItem === 'function');
  await page.waitForTimeout(500);
  const run = how => page.evaluate(([src, h]) => eval(src)(h), [SAMPLE, how]);

  ok(await page.evaluate(() => typeof window.settleBox === 'function'
                            && typeof window.settleAnim291 === 'function'),
    '5a 페이지에 §box 가 실제로 심겼다');
  const fixed = [];
  for (let i = 0; i < 12; i++) fixed.push(await run({ ms: -1, settleBox: true }));
  const set = new Set(fixed.map(r => r.db + ' / ' + r.p));
  ok(fixed.every(r => r.db === '750×290' && r.p === '684×120'),
    '5b §box 로 12회 — 전부 750×290 / 684×120', [...set].join(' · '));
  ok(set.size === 1, '5c 흔들림 0 — 값이 한 가지다', set.size + '가지');
  ok(fixed.every(r => r.waited >= 0 && r.waited < CAP_MS),
    '5d 정착이 실제로 기다렸고 상한에 안 걸렸다',
    Math.min(...fixed.map(r => r.waited)) + '~' + Math.max(...fixed.map(r => r.waited)) + 'ms');

  /* [R] 되돌림 시험 — 안 부르면 그 자리에서 «연출 중» 크기가 잡힌다 */
  const raw = [];
  for (let i = 0; i < 4; i++) raw.push(await run({ ms: 0, settleBox: false }));
  ok(raw.every(r => r.db === '690×267'),
    'R1 §box 를 안 부르면 690×267(= 과녁 ×0.920) 이 잡힌다 — 5b 가 헛초록이 아니다',
    raw.map(r => r.db).join(' · '));
  /* ⚑ 764 ⓑ 의 실물 — `showItem()` 과 **같은 태스크**에서 재면 연출이 아직 안 붙어 750×290 이 나온다.
     그래서 «부를 때 pending 이 0 이면 곧바로 끝낸다» 는 사다리는 이 자리를 못 닫는다(= [3a] 가 필요한 이유). */
  const sameTask = await run({ ms: -1, settleBox: false });
  ok(sameTask.db === '750×290',
    'R1b 같은 태스크에서 재면 연출이 **아직 안 붙어** 750×290 이다 — 「두 프레임 조용」 규칙이 필요한 이유',
    sameTask.db);
  const off = await page.evaluate(async () => {
    window.__settleBoxOff = true; const t = performance.now();
    await window.settleBox(); const dt = performance.now() - t;
    window.__settleBoxOff = false; return Math.round(dt);
  });
  ok(off < 50, 'R2 스위치를 켜면 §box 는 기다리지 않는다(부르는 자의 폴백이 산다)', off + 'ms');

  /* ── [6] 스위치 가름 ──────────────────────────────────────── */
  blk('[6] 스위치 — `PW_SETTLE=0` 과 `PW_SETTLEBOX=0` 은 서로 다른 손잡이다');
  const armSrc = settleSrc.slice(settleSrc.indexOf('await page.addInitScript'), settleSrc.indexOf('page.settle291 = async'));
  ok(/boxOff: process\.env\.PW_SETTLEBOX/.test(armSrc) && !/boxOff: process\.env\.PW_SETTLE\b/.test(armSrc),
    '6a §box 의 off 는 `PW_SETTLEBOX` 만 읽는다 — 931·946 의 `PW_SETTLE=0` 대조가 이 부품을 안 뒤집는다');
  ok(/off: process\.env\.PW_SETTLE ===/.test(armSrc),
    '6b 291 쪽 off 는 그대로 `PW_SETTLE` 이다');

  /* ── [7] 래칫 ─────────────────────────────────────────────── */
  blk('[7] 래칫 — 「한 evaluate 안에서 열고 → 기다리고 → 잰다」 게이트');
  const c = census();
  const bare = c.filter(h => !h.settle);
  console.log('   ' + c.length + '곳 중 정착 0회 ' + bare.length + '곳: '
    + bare.map(h => h.file.replace(/\.js$/, '') + ':' + h.line).join(' · '));
  ok(c.length <= 15, '7a 이 모양의 자리가 15곳 이하다(950 착수 시 15곳)', c.length + '곳');
  ok(bare.length <= 13, '7b 그중 «정착 0회» 가 13곳 이하다(950 착수 시 14곳 → 485 를 빼서 13)',
    bare.length + '곳');
  ok(!bare.some(h => h.file === 'verify485.js'), '7c `verify485` 는 그 목록에서 빠졌다');

  ok(errs.length === 0, 'Z 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');
  await browser.close();
  console.log('\nVERIFY950 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
