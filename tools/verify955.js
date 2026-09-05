#!/usr/bin/env node
/* 작업 955 게이트 — «정착(291) 훅이 rect 를 재는 `probe*.js` 도 덮는가»
 *
 *   node tools/verify955.js
 *   PW_SETTLE=0 node tools/verify955.js   # §R 이 뜻대로 빨개지는지 손으로 볼 때
 *
 * 병(등재문 · 941 1회차 곁다리): `settle291.enabled()` 의 조건 ⓐ 가 entry 를 `verify*.js` 로만
 * 보아, rect 를 재는 `probe*.js` **361자**가 훅 밖에 있었다. probe 는 «자를 새로 세우는 자» 라
 * 게이트보다 **먼저** 거짓말을 한다 — 941 재현이 실제로 `jzSheetIn` 0% 프레임(scale .985)을 잡아
 * 등재문을 기각할 뻔했다. 재현·수치는 `tools/probe955.js` 와 `docs/review/955-probe정착훅범위.md`.
 *
 * 이 자가 지키는 것 다섯:
 *   [1] 훅 조건 — verify · **probe** 는 켜고, `cap*`(연출을 일부러 한복판에서 찍는 하네스)은 끈다.
 *   [2] 훅 **본체**는 한 글자도 안 넓혔다 — 이름 필터 `^jz(Pg|Sheet)` · `MIN_WAIT` · `CAP_MS` 불변.
 *       (764·950 이 적어 둔 이유: 그 필터를 넓히면 «시간 자체를 재는» 게이트 64·262·107 이 문턱을 넘는다.)
 *   [3] 실부착 — probe entry 로 연 페이지가 정말 정착된 프레임에서 잰다. **§R 되돌림 시험**이 짝이다.
 *   [4] 빼는 쪽은 **선언**으로 받는다 — `settle291.js` 안에 probe 이름 목록(사본)이 있으면 빨강.
 *   [5] 인구조사 래칫 — rect 를 재는 probe 수는 **하한**이다(자가 늘어도 규약이 따라온다).
 *
 * 110 — 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const settle = require('./settle291');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(TOOLS, 'settle291.js'), 'utf8');

let pass = 0, total = 0;
const ok = (c, m, x) => { total++; if (c) pass++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (x ? ' — ' + x : '')); };
const d2 = v => Math.round(v * 100) / 100;

/* entry 와 환경을 갈아 끼우고 `enabled()` 에 직접 묻는다(브라우저 없이) */
function askEnabled(entry, env) {
  const sv = process.argv[1], se = process.env.PW_SETTLE;
  process.argv[1] = '/x/tools/' + entry;
  if (env === undefined) delete process.env.PW_SETTLE; else process.env.PW_SETTLE = env;
  const v = settle.enabled();
  process.argv[1] = sv;
  if (se === undefined) delete process.env.PW_SETTLE; else process.env.PW_SETTLE = se;
  return v;
}

/* 정착 유무 두 팔로 «열고 · 300ms 기다리고 · 잰다» 를 돈다.
   `entry` 로 argv 를 갈아 끼워 **probe 경로**를 그대로 재현한다(arm 은 페이지마다 enabled() 를 다시 읽는다). */
async function shoot(browser, { entry, env, rate }) {
  const sv = process.argv[1], se = process.env.PW_SETTLE;
  process.argv[1] = '/x/tools/' + entry;
  if (env === undefined) delete process.env.PW_SETTLE; else process.env.PW_SETTLE = env;
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  process.argv[1] = sv;
  if (se === undefined) delete process.env.PW_SETTLE; else process.env.PW_SETTLE = se;
  const cdp = await ctx.newCDPSession(page);
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.evaluate(() => { S.relic = 1e9; openRelw(); });
  await page.waitForTimeout(300);            /* ≥ MIN_WAIT — 훅이 걸려 있으면 여기서 정착이 돈다 */
  const g = await page.evaluate(() => {
    const e = document.querySelector('#relw .rw-panel');
    if (!e) return { has: false };
    const r = e.getBoundingClientRect(); const q = v => Math.round(v * 100) / 100;
    return { has: true, x: q(r.x), y: q(r.y), w: q(r.width), h: q(r.height) };
  });
  await ctx.close();
  return g;
}

(async () => {
  console.log('작업 955 — 정착(291) 훅이 rect 를 재는 probe 도 덮는가\n');

  /* ── [1] 훅 조건 ──────────────────────────────────────────────────── */
  console.log('[1] 훅 조건 — `settle291.enabled()`');
  ok(askEnabled('verify955.js') === true, '[1a] `verify*.js` 는 켠다(291 조건 ⓐ · 불변)');
  ok(askEnabled('probe955.js') === true,
    '[1b] **`probe*.js` 도 켠다 — 955 가 고친 자리**');
  ok(askEnabled('probe122r25b.js') === true, '[1c] 이름이 길고 접미가 붙은 probe 도 같다');
  ok(askEnabled('cap01.js') === false,
    '[1d] `cap*.js` 는 **여전히 끈다** — 연출 한복판을 일부러 찍는 하네스다(291 ⓐ 의 근거는 안 바뀌었다)');
  ok(askEnabled('scan01.js') === false && askEnabled('smoke.js') === false
     && askEnabled('bot199.js') === false,
    '[1e] 나머지 하네스(`scan*`·`smoke`·`bot*`)도 종전대로 끈다');
  ok(askEnabled('probe955.js', '0') === false && askEnabled('verify955.js', '0') === false,
    '[1f] 되돌림 스위치 `PW_SETTLE=0` 은 둘 다에 그대로 듣는다');
  ok(askEnabled('cap01.js', '1') === true,
    '[1g] `PW_SETTLE=1` 은 entry 조건을 무시하고 켠다(종전 그대로)');

  /* ── [2] 훅 본체 불변 ─────────────────────────────────────────────── */
  console.log('\n[2] 훅 **본체**는 안 넓혔다 — 955 는 «누구에게 거나» 만 바꿨다');
  const nameRe = (SRC.match(/\/\^jz\\?\(Pg\|Sheet\)\//g) || []).length;
  ok(nameRe >= 3,
    '[2a] 이름 필터 `^jz(Pg|Sheet)` 가 훅·선검사·§in-page 셋에 그대로 있다', nameRe + '곳');
  ok(settle.MIN_WAIT === 250, '[2b] `MIN_WAIT` 250 불변', String(settle.MIN_WAIT));
  ok(settle.CAP_MS === 1500, '[2c] `CAP_MS` 1500 불변', String(settle.CAP_MS));
  ok(/PW_SETTLEBOX/.test(SRC) && typeof settle.settleAnimOn === 'function',
    '[2d] §box(950·957)는 안 건드렸다 — 되돌림 스위치가 따로인 채 그대로다');
  /* `enabled()` 는 **entry 이름과 환경변수**만으로 답해야 한다 — 페이지·연출을 보면 그 판정이
     «언제 물었나» 에 좌우돼 훅이 걸리다 말다 한다. 본문에 DOM·페이지 축이 있으면 빨강. */
  const eBody = settle.enabled.toString();
  ok(!/getAnimations|document\.|\bpage\b/.test(eBody),
    '[2e] `enabled()` 는 entry 와 환경변수만 본다 — 페이지·연출 상태를 안 본다');

  /* ── [4] 빼는 쪽은 선언으로 ───────────────────────────────────────── */
  console.log('\n[4] 빼는 쪽은 **선언**으로 받는다 — 목록(사본)을 두지 않는다');
  /* ⚠ 원문 grep 은 못 쓴다 — 주석에 적힌 선례 이름(`probe353` 등)이 목록으로 읽힌다.
     **행동**으로 묻는다: 저장소에 없는 이름도 같은 답이면 그것은 목록이 아니라 이름 규칙이다. */
  const ghost = askEnabled('probe999999zz.js'), known = askEnabled('probe353.js');
  ok(ghost === true && known === true && ghost === known,
    '[4a] `enabled()` 가 probe 이름 **목록을 읽지 않는다** — 저장소에 없는 `probe999999zz.js` 도 같은 답이다'
    + '(402 «사본을 지운다» — 목록은 자가 늘면 뒤처진다)',
    '없는 이름 ' + ghost + ' · 있는 이름 ' + known);
  const files = fs.readdirSync(TOOLS).filter(f => /^probe.*\.js$/.test(f));
  const rd = f => fs.readFileSync(path.join(TOOLS, f), 'utf8');
  const optOut = files.filter(f => /process\.env\.PW_SETTLE\s*=\s*'0'/.test(rd(f)));
  const optIn = files.filter(f => /process\.env\.PW_SETTLE\s*=\s*'1'/.test(rd(f)));
  console.log('     옵트아웃 선언 ' + optOut.length + '자'
    + (optOut.length ? '(' + optOut.map(f => f.replace(/\.js$/, '')).join(' ') + ')' : '')
    + ' · 옵트인 선언 ' + optIn.length + '자(' + optIn.map(f => f.replace(/\.js$/, '')).join(' ') + ')');
  ok(optIn.length >= 3,
    '[4b] 정착이 **꼭 필요한** probe 는 여전히 스스로 선언한다 — 훅이 이름 규칙이라 이름이 바뀌어도 산다',
    optIn.length + '자');
  ok(optOut.every(f => /955/.test(rd(f))),
    '[4c] 옵트아웃한 자는 **사유(955)를 자기 파일에** 적었다 — 이유 없는 옵트아웃은 조용한 되돌림이다',
    optOut.length ? optOut.join(' ') : '0자(해당 없음)');

  /* ── [5] 인구조사 래칫 ────────────────────────────────────────────── */
  console.log('\n[5] 인구조사 래칫 — 수는 **하한**이다');
  const rect = files.filter(f => /getBoundingClientRect/.test(rd(f)));
  console.log('     probe*.js ' + files.length + '자 · rect 를 재는 자 ' + rect.length + '자');
  ok(rect.length >= 355,
    '[5a] rect 를 재는 probe 가 355자 이상 — 이 규약이 덮는 면적', rect.length + '자');
  const covered = rect.filter(f => askEnabled(f) === true);
  ok(covered.length === rect.length,
    '[5b] 그 **전부**가 훅 안이다(옵트아웃 선언은 실행 시점에 갈린다)',
    covered.length + '/' + rect.length + '자');

  /* ── [3] 실부착 + §R 되돌림 ───────────────────────────────────────── */
  console.log('\n[3] 실부착 — probe entry 로 연 페이지가 정말 정착된 프레임에서 재는가');
  const browser = await launch(chromium);
  const REF_W = 1080;
  const on = await shoot(browser, { entry: 'probe955.js', rate: 6 });      /* 기본값 = 훅 켜짐 */
  const off = await shoot(browser, { entry: 'probe955.js', env: '0', rate: 6 });  /* §R */
  const cap = await shoot(browser, { entry: 'cap955.js', rate: 6 });       /* 291 ⓐ 보존 */
  const fmt = g => !g.has ? '(없음)' : g.w + '×' + g.h + ' @(' + g.x + ',' + g.y + ')';
  console.log('     probe entry (기본)      ' + fmt(on));
  console.log('     probe entry PW_SETTLE=0 ' + fmt(off) + '   ← §R');
  console.log('     cap entry   (기본)      ' + fmt(cap));
  ok(on.has && Math.abs(on.w - REF_W) < 0.02,
    '[3a] probe entry 가 **1080 폭**(= 연출이 끝난 프레임)을 잰다', on.has ? String(on.w) : '없음');
  ok(off.has && off.w < REF_W - 0.5,
    '[3b] **§R 되돌림** — `PW_SETTLE=0` 이면 같은 자리가 0% 프레임(scale .985 ⇒ 1063.8)으로 되돌아간다',
    off.has ? off.w + ' (배율 ' + d2(off.w / REF_W) + ')' : '없음');
  ok(off.has && on.has && Math.abs(off.x - on.x) > 4,
    '[3c] 좌변 밀림이 291 머리말의 `540·(1/s−1)` 지문과 같다',
    off.has && on.has ? d2(off.x - on.x) + 'px' : '—');
  ok(cap.has && cap.w < REF_W - 0.5,
    '[3d] `cap*` 하네스는 **여전히 정착하지 않는다** — 찍으려던 프레임이 살아 있다(291 ⓐ)',
    cap.has ? String(cap.w) : '없음');
  await browser.close();

  console.log('\nVERIFY955 ' + pass + '/' + total + (pass === total ? ' PASS' : ' FAIL'));
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
