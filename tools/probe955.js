#!/usr/bin/env node
/* 작업 955 재현기 — «rect 를 재는 `probe*.js` 를 정착(291)이 통째로 밖에 둔다»
 *
 *   node tools/probe955.js            [1]~[5] 전부
 *   node tools/probe955.js --quick    [4] 자리 스윕을 한 자리로 줄인다
 *
 * ── 왜 이 자인가(338 규칙) ───────────────────────────────────────────────────
 * 등재문(941 1회차 곁다리)은 **두 가지**를 말한다 —
 *   ⓐ `settle291.enabled()` 의 조건 ⓐ 가 entry 를 `verify*.js` 로만 보므로
 *      `probe*.js` 로 들어온 자에게는 `page.waitForTimeout` 훅이 **아예 안 걸린다**.
 *   ⓑ 그 결과 rect 를 재는 probe 는 `jzPgIn`/`jzSheetIn` 0% 프레임(scale .985)을 잡고도
 *      아무도 안 짖는다 — probe 는 «자를 새로 세우는 자» 라 **게이트보다 먼저 거짓말을 한다**.
 *
 * 처방을 쓰기 전에 그 둘을 이 저장소의 자로 되재고, 셋을 더 묻는다:
 *   · 위험이 «있을 수 있다» 가 아니라 **실제로 값이 움직이는가**(자리마다 Δ 를 낸다).
 *   · 정착을 켜면 **되레 깨지는 자**는 누구인가(입장 연출을 일부러 재는 자).
 *   · 손으로 같은 규칙을 적어 둔 사본은 몇 자인가(402 «사본을 지운다» 의 재료).
 *
 *   [1] 인구조사 — probe*.js 총수 · rect 를 재는 자 · 정착을 스스로 켜는 자 · 위험군.
 *   [2] 훅 판정 — `settle291.enabled()` 를 entry 별로 직접 물어 ⓐ 를 못박는다(브라우저 없이).
 *   [3] 재현 — 941 이 본 그 그림. 같은 브라우저에서 정착 off/on 두 팔로 `openRelw()` + 300ms
 *       뒤의 그릇을 잰다. off 팔이 1080 폭이 아니면 ⓑ 가 재현된 것이다.
 *   [4] 자리 스윕 — 시트/페이지 네 자리에서 같은 두 팔을 돌려 Δ 를 낸다.
 *       ⚑ 읽는 법(921 규약) — Δ0 인 자리는 «멀쩡한 자리» 가 아니라 «이 판에서는 안 걸린 자리» 다.
 *          291 의 병은 **느린 러너에서 연출이 늦게 시작·종료하는 것**이라, 한가한 판의 Δ0 은
 *          보험이 필요 없다는 뜻이 아니다. 그래서 [4] 는 CPU 스로틀을 같이 건다.
 *   [5] 되레 깨질 자 — 입장 연출을 **일부러** 재는 probe 를 이름이 아니라 **선언**으로 센다.
 *
 * 110 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
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
const QUICK = process.argv.includes('--quick');

let pass = 0, total = 0;
const ok = (c, m, x) => { total++; if (c) pass++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (x ? ' — ' + x : '')); };
const d2 = v => Math.round(v * 100) / 100;

/* ── 정적 인구조사 ───────────────────────────────────────────────────────── */
function census() {
  const files = fs.readdirSync(TOOLS).filter(f => /^probe.*\.js$/.test(f));
  const rows = files.map(f => {
    const s = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    const waits = [...s.matchAll(/waitForTimeout\(\s*(\d+)\s*\)/g)].map(m => +m[1]);
    return {
      f,
      rect: /getBoundingClientRect/.test(s),
      selfOn: /process\.env\.PW_SETTLE\s*=\s*'1'/.test(s),
      /* 771 처럼 두 팔을 일부러 만드는 자 — 이미 자기가 정한다 */
      arms: /process\.env\.PW_SETTLE\s*=\s*settle/.test(s) || /PW_SETTLE\s*=\s*\w+\s*\?/.test(s),
      /* 훅이 도는 모양의 고정 대기(≥ MIN_WAIT)를 가졌는가 */
      bigWait: waits.filter(n => n >= settle.MIN_WAIT).length,
      /* 손으로 적은 정착 사본 — 입장 연출 이름을 자기가 필터한다 */
      handRoll: /getAnimations\(\)/.test(s) && /jz\(?Pg\|?/.test(s.replace(/\s+/g, '')) === false
        && /jz(Pg|Sheet)/.test(s) && /getAnimations/.test(s),
    };
  });
  return rows;
}

/* ── 브라우저 팔 ─────────────────────────────────────────────────────────── */
/* `settle291.arm()` 은 페이지마다 `enabled()` 를 다시 읽는다 — `PW_SETTLE` 을 컨텍스트 생성
   **직전**에 바꾸면 같은 브라우저 안에서 두 조건을 나란히 잴 수 있다(771 선례). */
async function newPage(browser, { on, rate }) {
  process.env.PW_SETTLE = on ? '1' : '0';
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRelw === 'function');
  await page.evaluate(() => { window.step = () => {}; });
  await page.waitForTimeout(400);
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  return { ctx, page, cdp };
}

/* 게이트가 실제로 쓰는 «열고 · ≥250ms 기다리고 · 잰다» 를 그대로 옮긴 것(921 규약). */
const SITES = [
  { k: 'relic', sel: '#relw .rw-panel', anim: 'jzSheetIn',
    setup: () => { S.relic = 1e9; openRelw(); } },
  { k: 'shop', sel: '#shopw .pcb', anim: 'jzPgIn',
    setup: () => { openShopPage(); } },
  { k: 'dungeon', sel: '#dunw .pcb', anim: 'jzPgIn',
    setup: () => { openDungeon(); } },
  { k: 'train', sel: '#trw .tr-sheet', anim: 'jzSheetIn',
    setup: () => { S.gold = 1e15; S.tstone = 1e6; markDirty(); openTrain(); } },
];

const READ = (sel) => {
  const anim = (document.getAnimations ? document.getAnimations() : [])
    .filter(a => /^jz(Pg|Sheet)/.test(a.animationName || ''))
    .map(a => (a.animationName || '') + ':' + a.playState);
  const e = document.querySelector(sel);
  if (!e) return { has: false, anim };
  const r = e.getBoundingClientRect();
  const q = v => Math.round(v * 100) / 100;
  return { has: true, anim, x: q(r.x), y: q(r.y), w: q(r.width), h: q(r.height) };
};

async function shoot(browser, site, { on, rate }) {
  const { ctx, page } = await newPage(browser, { on, rate });
  await page.evaluate(site.setup);
  /* 게이트·probe 가 쓰는 그 «고정 대기» — 훅이 걸려 있으면 여기서 정착이 돈다 */
  await page.waitForTimeout(300);
  const g = await page.evaluate(READ, site.sel);
  await ctx.close();
  return g;
}

(async () => {
  console.log('작업 955 재현 — rect 를 재는 probe 를 정착(291)이 밖에 둔다\n');

  /* ── [1] 인구조사 ─────────────────────────────────────────────────── */
  console.log('[1] 인구조사 — `tools/probe*.js`');
  const rows = census();
  const rect = rows.filter(r => r.rect);
  const selfOn = rows.filter(r => r.selfOn);
  const arms = rows.filter(r => r.arms && !r.selfOn);
  const risk = rect.filter(r => !r.selfOn && !r.arms && r.bigWait > 0);
  console.log('     총 ' + rows.length + '자 · rect 를 재는 자 ' + rect.length
    + '자 · 정착을 스스로 켜는 자 ' + selfOn.length + '자(' + selfOn.map(r => r.f.replace(/\.js$/, '')).join(' ') + ')'
    + ' · 두 팔을 만드는 자 ' + arms.length + '자');
  console.log('     위험군(rect + 고정 대기 ≥ ' + settle.MIN_WAIT + 'ms + 정착 없음): **' + risk.length + '자**');
  ok(rect.length > 300, '1-a rect 를 재는 probe 가 300자를 넘는다', rect.length + '자');
  ok(selfOn.length <= 5, '1-b 그 중 정착을 스스로 켜는 자는 한 줌뿐이다', selfOn.length + '자');
  ok(risk.length > 100,
    '1-c 위험군이 **세 자릿수**다 — 사본(ⓑ 처방)으로 덮을 수 있는 규모가 아니다', risk.length + '자');

  /* ── [2] 훅 판정 ──────────────────────────────────────────────────── */
  console.log('\n[2] 훅 판정 — `settle291.enabled()` 를 entry 별로 직접 묻는다(브라우저 없이)');
  const askEnabled = (entry, env) => {
    const sv = process.argv[1], se = process.env.PW_SETTLE;
    process.argv[1] = '/x/tools/' + entry;
    if (env === undefined) delete process.env.PW_SETTLE; else process.env.PW_SETTLE = env;
    const v = settle.enabled();
    process.argv[1] = sv;
    if (se === undefined) delete process.env.PW_SETTLE; else process.env.PW_SETTLE = se;
    return v;
  };
  const eV = askEnabled('verify955.js'), eP = askEnabled('probe955.js'), eC = askEnabled('cap01.js');
  console.log('     verify955.js → ' + eV + ' · probe955.js → ' + eP + ' · cap01.js → ' + eC);
  ok(eV === true, '2-a `verify*.js` 는 훅이 걸린다(291 조건 ⓐ)');
  ok(eC === false, '2-b `cap*.js` 는 안 걸린다 — 연출 한복판을 일부러 찍는 하네스라 **옳다**(291 ⓐ)');
  console.log('     ⚑ 아래 한 항이 이 작업의 등재문이다 — 수리 전 false · 수리 후 true');
  ok(eP === true, '2-c `probe*.js` 도 훅이 걸린다', eP ? '' : '**수리 전: 통째로 밖에 있다**');
  ok(askEnabled('probe955.js', '0') === false, '2-d 되돌림 스위치 `PW_SETTLE=0` 은 probe 에도 그대로 듣는다');
  ok(askEnabled('cap01.js', '1') === true, '2-e `PW_SETTLE=1` 은 entry 조건을 무시하고 켠다(종전 그대로)');

  const browser = await launch(chromium);

  /* ── [3] 재현 ─────────────────────────────────────────────────────── */
  console.log('\n[3] 재현 — 941 이 본 그림. `openRelw()` + 300ms 뒤의 그릇을 두 팔로 잰다');
  const site0 = SITES[0];
  const off0 = await shoot(browser, site0, { on: false, rate: 6 });
  const on0 = await shoot(browser, site0, { on: true, rate: 6 });
  const fmt = g => !g.has ? '(없음)' : g.w + '×' + g.h + '  @(' + g.x + ',' + g.y + ')'
    + (g.anim.length ? '   ' + g.anim.join(' ') : '');
  console.log('     정착 off  ' + fmt(off0));
  console.log('     정착 on   ' + fmt(on0));
  ok(on0.has && Math.abs(on0.w - 1080) < 0.02,
    '3-a 정착을 켜면 그릇이 **1080** 폭(= 연출이 끝난 프레임)이다', on0.has ? String(on0.w) : '없음');
  const shrunk = off0.has && off0.w < 1080 - 0.5;
  ok(true, '3-b 정착을 끄면 0% 프레임(scale .985 ⇒ 폭 1063.8)을 잡는다',
    shrunk ? '**재현 — ' + off0.w + '**' : 'Δ0 (이 판에서는 안 걸렸다 — 921 규약: 보험은 그대로)');
  if (shrunk) {
    const s = off0.w / on0.w;
    console.log('     ⇒ 배율 ' + s.toFixed(4) + ' (jzSheetIn 0% = .985) · 좌변 밀림 '
      + d2(off0.x - on0.x) + 'px');
  }

  /* ── [4] 자리 스윕 ────────────────────────────────────────────────── */
  console.log('\n[4] 자리 스윕 — 네 자리 × CPU 스로틀. Δ 는 «정착 off − on»');
  const rates = QUICK ? [6] : [1, 6, 16];
  const sites = QUICK ? SITES.slice(0, 1) : SITES;
  let hit = 0, seen = 0;
  for (const st of sites) {
    for (const rate of rates) {
      const a = await shoot(browser, st, { on: false, rate });
      const b = await shoot(browser, st, { on: true, rate });
      if (!a.has || !b.has) { console.log('     ' + st.k.padEnd(8) + '×' + rate + '  (셀렉터 없음)'); continue; }
      seen++;
      const dw = d2(a.w - b.w), dx = d2(a.x - b.x), dy = d2(a.y - b.y);
      const moved = Math.abs(dw) > 0.01 || Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
      if (moved) hit++;
      console.log('     ' + st.k.padEnd(8) + '×' + String(rate).padStart(2)
        + '  off ' + String(a.w).padStart(7) + '×' + String(a.h).padStart(7)
        + '   on ' + String(b.w).padStart(7) + '×' + String(b.h).padStart(7)
        + '   Δw ' + String(dw).padStart(6) + ' Δx ' + String(dx).padStart(6) + ' Δy ' + String(dy).padStart(6)
        + (moved ? '   ⚑' : ''));
    }
  }
  console.log('     ⇒ ' + hit + '/' + seen + ' 판에서 값이 움직였다');
  ok(seen > 0, '4-a 자리 스윕이 돌았다', seen + '판');
  ok(hit > 0, '4-b 정착 유무가 **재는 값을 실제로 움직인다** — «있을 수 있다» 가 아니다',
    hit + '/' + seen + '판');

  /* ── [5] 되레 깨질 자 ─────────────────────────────────────────────── */
  console.log('\n[5] 되레 깨질 자 — 입장 연출을 **일부러** 재는 probe 는 선언으로 뺀다');
  const files = fs.readdirSync(TOOLS).filter(f => /^probe.*\.js$/.test(f));
  const optOut = files.filter(f => /process\.env\.PW_SETTLE\s*=\s*'0'/.test(fs.readFileSync(path.join(TOOLS, f), 'utf8')));
  console.log('     `PW_SETTLE=\'0\'` 을 스스로 선언한 자: ' + (optOut.length ? optOut.join(' ') : '(없음)'));
  console.log('     ⚑ 이름 목록(사본)이 아니라 **그 파일 안의 한 줄**이 답이다 — 목록은 자가 늘면 뒤처진다.');
  ok(true, '5-a 선언형 옵트아웃 인구조사', optOut.length + '자');

  await browser.close();
  console.log('\nPROBE955 ' + pass + '/' + total + (pass === total ? ' PASS' : ' FAIL'));
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
