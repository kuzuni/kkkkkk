#!/usr/bin/env node
/* 작업 706 재현기 — 「칭호가 다른 것으로 장착이 안 된다」(주인 보고 2026-09-02 02:25)
 *
 *   node tools/probe706.js
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문이 갈래 셋을 열어 뒀다:
 *   ⓐ 클릭 핸들러 결선 누락 — 카드를 눌러도 아무 일도 안 일어난다
 *   ⓑ S 저장 누락 — 눌리기는 하는데 재로드하면 되돌아간다
 *   ⓒ 표시 갱신 누락 — 저장은 되는데 화면이 안 바뀐다
 *
 * 이 자는 **제품을 한 줄도 안 고치고** 세 갈래를 가른다. 관측점 넷:
 *   ① 클릭 전후의 `.pf-card.eq` 가 가리키는 칸  ② `#pfTtl` 잉크
 *   ③ 클릭이 만든 `S` 변화(JSON 스냅숏 diff)   ④ save() 후 재로드 뒤의 ①②
 *
 * 그리고 «장착» 이 어떤 값에서 파생되는지도 소스에서 직접 읽는다 — 파생이면 클릭이
 * 아무리 잘 결선돼 있어도 **저장할 자리가 없다**(그것이 곧 처방의 모양을 정한다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 화면에서 «지금 장착된 칭호» 를 읽는 한 벌 — 자와 재현기가 같은 눈을 쓴다 */
const READ = () => {
  const cards = [].slice.call(document.querySelectorAll('#pfCards .pf-card'));
  return {
    n: cards.length,
    eq: cards.findIndex(c => c.classList.contains('eq')),
    own: cards.map(c => c.classList.contains('own') ? 1 : 0),
    ttl: (document.getElementById('pfTtl').textContent || '').trim(),
    hud: (document.getElementById('rankN').textContent || '').trim(),
    names: cards.map(c => { const i = c.querySelector('.pf-bn>i'); return i ? i.textContent.trim() : ''; })
  };
};

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  console.log('[0] 소스 — «장착» 이 무엇에서 파생되는가');
  const eqLine = (code.match(/const own = titleOwn\(i\), eq = ([^,;]+)/) || [])[1];
  ok(!!eqLine, '0a `renderProfile` 의 «장착» 판정식을 읽었다', eqLine ? eqLine.trim() : 'n/a');
  const derived = !!eqLine && /S\.rank/.test(eqLine);
  ok(true, '0b 판정식이 `S.rank` 파생인가', derived ? '**예 — 계급에서 파생**' : '아니오(전용 필드)');
  /* ⚠ 느슨한 정규식은 여기서 **거짓 «있다»** 를 낸다 — `$('pfCards').innerHTML` 뒤 400자 안에
     아무 `addEventListener`(#pfw 닫기 등)나 있으면 걸린다. 결선의 정의는 «`pfCards` 나 `pf-card`
     **자신에** 리스너를 건다» 이므로 그 두 꼴만 본다. */
  const hasHandler = /\$\('pfCards'\)\s*\.\s*(onclick|addEventListener)/.test(code)
                  || /querySelectorAll\('[^']*\.pf-card[^']*'\)[\s\S]{0,120}?(onclick|addEventListener)/.test(code);
  ok(true, '0c `#pfCards`/`.pf-card` **자신에** 클릭 결선이 있는가', hasHandler ? '있다' : '**없다**');
  const hasField = /titleEq/.test(code);
  ok(true, '0d 장착 칭호 전용 저장 필드가 있는가', hasField ? '있다' : '**없다**');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProfile === 'function');
  await page.waitForTimeout(600);

  /* 표본 상태 — 계급 2(골드)에 칭호 0~4 를 보유. «다른 것으로 장착» 이 성립하는 최소 조건이다. */
  await page.evaluate(() => {
    S.rank = 2;
    S.titles = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 };
    save(); drawHud(); openProfile();
  });
  await page.waitForTimeout(300);

  console.log('\n[1] 전제 — 표본이 «다른 칭호를 갖고 있다»');
  const a = await page.evaluate(READ);
  ok(a.n === 8, '1a 칭호 카드 8칸', 'n = ' + a.n);
  ok(a.eq === 2, '1b 지금 장착 = 계급 index 2', 'eq = ' + a.eq + ' (' + a.names[a.eq] + ')');
  ok(a.own.filter(Boolean).length === 5, '1c 보유 5칸', 'own = ' + a.own.join(''));
  ok(a.own[0] === 1 && a.own[4] === 1, '1d 장착칸 말고도 보유칸이 있다 — 0·4번', a.names[0] + ' · ' + a.names[4]);
  ok(a.ttl === a.names[2], '1e 배너(#pfTtl) 가 장착 칭호를 보여준다', a.ttl);

  console.log('\n[2] 재현 — 다른 보유 칭호(4 = ' + a.names[4] + ')를 누른다');
  /* ⚠ `JSON.stringify(S)` 전체는 **판별력이 없다** — 게임 루프가 골드·playtime 을 매 틱 바꾸므로
     클릭이 아무 일도 안 해도 «변화 있음» 이 나온다(초판이 그래서 2e 를 헛초록으로 냈다).
     칭호 축의 값만 본다. */
  const snapA = await page.evaluate(() => JSON.stringify([S.titleEq, S.rank, S.titles]));
  const clicked = await page.evaluate(() => {
    const c = document.querySelectorAll('#pfCards .pf-card')[4];
    if (!c) return false;
    const b = c.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height };
  });
  ok(!!clicked && clicked.w > 0, '2a 4번 카드가 화면에 있다', clicked ? Math.round(clicked.w) + '×' + Math.round(clicked.h) : 'n/a');
  await page.mouse.click(clicked.x, clicked.y);
  await page.waitForTimeout(350);
  const b1 = await page.evaluate(READ);
  const snapB = await page.evaluate(() => JSON.stringify([S.titleEq, S.rank, S.titles]));

  ok(b1.eq === 4, '2b [본체] 클릭 뒤 장착이 4번으로 옮겨갔다', 'eq = ' + b1.eq + ' (' + (b1.names[b1.eq] || '없음') + ')');
  ok(b1.ttl === a.names[4], '2c 배너가 새 칭호로 바뀌었다', b1.ttl);
  ok(b1.hud === a.names[4], '2d HUD 칭호도 바뀌었다', b1.hud);
  ok(snapB !== snapA, '2e 클릭이 칭호 축의 `S` 를 바꿨다',
     snapB === snapA ? '**무변화 — 저장할 자리가 없다** ' + snapA : snapA + ' → ' + snapB);

  console.log('\n[3] 갈래 가르기 — 저장·표시 중 어디가 끊겼나');
  await page.evaluate(() => { save(); });
  await page.reload();
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openProfile === 'function');
  await page.waitForTimeout(600);
  await page.evaluate(() => { openProfile(); });
  await page.waitForTimeout(250);
  const c1 = await page.evaluate(READ);
  ok(c1.eq === 4, '3a 재로드 뒤에도 4번이 장착이다', 'eq = ' + c1.eq);

  console.log('\n[4] 잠금 칭호 — 반려 피드백(664 꼴)');
  await page.evaluate(() => { window.__n706 = []; const f = window.notify;
    if (typeof f === 'function') window.notify = function (...x) { window.__n706.push(String(x[0] || '')); return f.apply(this, x); };
    const g = window.fxToast;
    if (typeof g === 'function') window.fxToast = function (...x) { window.__n706.push(String(x[0] || '')); return g.apply(this, x); }; });
  const lk = await page.evaluate(() => {
    const c = document.querySelectorAll('#pfCards .pf-card')[7];   /* 챌린저 = 미보유 */
    if (!c) return null; const b = c.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, own: c.classList.contains('own') };
  });
  ok(lk && !lk.own, '4a 7번(챌린저)은 미보유 칸이다', lk ? ('own = ' + lk.own) : 'n/a');
  const before4 = await page.evaluate(READ);
  await page.mouse.click(lk.x, lk.y);
  await page.waitForTimeout(300);
  const after4 = await page.evaluate(READ);
  const msgs = await page.evaluate(() => (window.__n706 || []).slice());
  ok(after4.eq === before4.eq, '4b 미보유 칸을 눌러도 장착이 안 옮겨간다', 'eq ' + before4.eq + ' → ' + after4.eq);
  ok(msgs.length > 0, '4c 미보유 칸 클릭에 반려 피드백이 있다', msgs.length ? msgs.join(' / ') : '**피드백 0건**');

  console.log('\n[5] 콘솔');
  ok(errs.length === 0, '5a 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '없음');

  await browser.close();
  console.log('\nprobe706: ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
