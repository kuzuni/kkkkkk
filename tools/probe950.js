#!/usr/bin/env node
/* 950 재현기 — «`verify485` 가 부하에서 흔들린다»
 *
 *   node tools/probe950.js              (위상 스윕 + 필터 구멍 + 처방 + 인구조사)
 *   node tools/probe950.js --reps 12    ([3] 반복 수)
 *
 * 등재문의 주장(sess-1627-9711 워커 B):
 *   «[E5]·[E6] 두 항이 «연출 한복판에서 잰 rect» 다 — `.sk-db` 690×267 ↔ 과녁 750×290 = ×0.920,
 *    문단 629×110 ↔ 684×120 = ×0.920. 한 배율이 두 축에 같이 걸렸으니 «값이 틀렸다» 가 아니라
 *    «입장 연출의 한 프레임을 읽었다» 다. 뿌리는 353 구멍(대기를 페이지 **안**에서 한다).»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라 **왜 그 자리가 흔들리는지 눈으로 보는** 자리다(338 선례).
 * 찍는 것:
 *   [1] 위상 스윕 — `showItem()` 뒤 n ms 에 재면 무슨 값이 나오는가(**부하 없이 결정적**)
 *       + 그 순간 살아 있는 `jz…` 애니메이션 이름
 *   [2] ⚑ **등재문이 몰랐던 두 번째 구멍** — 353 처방(`settle291()`)을 그 자리에서 불러도 안 닫힌다.
 *       291 의 필터는 `/^jz(Pg|Sheet)/` 인데 가운데 다이얼로그는 **`jzBoxIn`** 이라 안 걸린다.
 *   [3] 처방 — 공용 §box(`settle291.js` QUIET_SRC · `window.settleBox()`)를 부르면 몇 번을 재도 같은 값인가
 *   [4] 인구조사 — 353 이 적어 둔 «이 모양은 5개(96·22·46·125·299)» 가 지금도 맞나
 *   [5] 사본 조사 — `jzBox` 정착을 **손으로 적은** 자가 몇인가(공용 부품이 필요한 근거)
 *
 * ⚠ 되돌림 팔을 따로 두지 않는다 — `PW_SETTLEBOX=0` 이면 `settleBox()` 는 즉시 돌아오므로
 *   **되돌림 = [1] 의 위상 곡선 그대로**다. 게이트째 되돌리는 시험은
 *   `PW_SETTLEBOX=0 node tools/verify485.js` 로 따로 돌린다(review 950 §5).
 *
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
/* 291 훅은 entry 가 `verify*.js` 일 때만 자동으로 걸린다(`settle291.enabled()`).
   여기는 프로브라 그대로면 «훅이 원래 안 걸리는 상태» 를 재게 된다 — 게이트와 같은 조건으로 맞춘다. */
if (!process.env.PW_SETTLE) process.env.PW_SETTLE = '1';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const REPS = arg('--reps', 8);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

/* 게이트 [E5]·[E6] 이 재는 것과 **똑같은** 두 상자. 750×290 / 684×120 이 정답. */
const READ = `() => { const box = document.querySelector('#modal .sk-db');
  const p = box ? box.querySelector('p') : null;
  const r = e => e ? Math.round(e.getBoundingClientRect().width) + '×'
                     + Math.round(e.getBoundingClientRect().height) : '없음';
  const A = (document.getAnimations ? document.getAnimations() : [])
    .filter(a => /^jz(Box|Pg|Sheet)/.test(a.animationName || ''))
    .map(a => (a.animationName || '') + ':' + a.playState);
  return { db: r(box), p: r(p), anim: A.join(' ') }; }`;

/* 한 표본 = «세부 팝업을 열고 → 주어진 방법으로 기다리고 → 잰다 → 닫는다». 게이트 [E] 블록과 같은 꼴. */
const SAMPLE = `async (how) => { try {
  const pet = PETS.find(x => x.g === 5 && (x.j || 0) === 3);
  S.own[pet.id] = { l: 1 };
  showItem(pet.id);
  if (how.ms >= 0) await new Promise(r => setTimeout(r, how.ms));
  if (how.settle291 && window.settle291) await window.settle291();
  if (how.settleBox && window.settleBox) await window.settleBox();
  const out = (${READ})();
  if (typeof closeModal === 'function') closeModal();
  delete S.own[pet.id];
  await new Promise(r => setTimeout(r, 320));   /* 닫힘 연출(jzBoxOut .12s)까지 걷고 다음 표본으로 */
  return out;
} catch (e) { return { err: String(e && e.message || e) }; } }`;

/* 문자열 본체를 인자와 함께 페이지로 보낸다 — playwright 는 «문자열 표현식» 에 인자를 안 실어 준다. */
const run = (page, how) => page.evaluate(([src, h]) => eval(src)(h), [SAMPLE, how]);

/* ⚠ `verify950` 가 이 파일의 인구조사 함수를 그대로 쓴다(표를 두 벌로 안 적는다) —
   그래서 본체는 **직접 실행일 때만** 돈다. 안 그러면 require 만으로 브라우저가 뜬다. */
if (require.main === module) (async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof PETS !== 'undefined' && typeof showItem === 'function');
  await page.waitForTimeout(500);

  /* ── [1] 위상 스윕 ─────────────────────────────────────────── */
  blk('[1] 위상 스윕 — 고정 대기가 곡선 위 어디에 떨어지는가 (부하 없음)');
  const PHASES = [0, 40, 80, 120, 160, 200, 220, 260, 400];
  const sweep = [];
  for (const ms of PHASES) {
    const r = await run(page, { ms, settle291: false, settleBox: false });
    sweep.push({ ms, ...r });
    console.log('   ' + String(ms).padStart(4) + 'ms  .sk-db ' + String(r.db).padEnd(9)
      + ' · 문단 ' + String(r.p).padEnd(9) + ' · ' + (r.anim || '(없음)'));
  }
  const at = ms => (sweep.find(s => s.ms === ms) || {});
  ok(sweep.every(s => !s.err), '[1a] 표본 9개 전부 읽혔다');
  ok(at(0).db === '690×267' && at(0).p === '629×110',
    '[1b] 0ms 는 `jzBoxIn` 0% 프레임 — 690×267 / 629×110 (= 과녁 ×0.920, 등재문의 그 값)');
  ok(at(220).db !== '750×290' && at(400).db === '750×290',
    '[1c] 220ms 는 62% 오버슛(≈764×295)이고 400ms 라야 750×290 — **곡선은 단조가 아니다**');
  const distinct = new Set(sweep.map(s => s.db)).size;
  ok(distinct >= 4, '[1d] 같은 «열고 기다렸다» 인데 나온 크기가 ' + distinct + '가지다 — 시계로는 못 고정한다');
  ok(sweep.some(s => /jzBoxIn/.test(s.anim || '')),
    '[1e] 그 프레임에 살아 있는 것은 **`jzBoxIn`** 이다(`jzPg…`·`jzSheet…` 가 아니다)');

  /* ── [2] 필터 구멍 ─────────────────────────────────────────── */
  blk('[2] 353 처방(`settle291()`)을 그 자리에서 불러 본다 — 등재문이 몰랐던 두 번째 구멍');
  const { SETTLE_SRC, IN_PAGE_SRC, QUIET_SRC } = require('./settle291');
  const reHit = s => /jz\(Pg\|Sheet\)/.test(s);
  ok(reHit(SETTLE_SRC) && reHit(IN_PAGE_SRC),
    '[2a] 291 의 필터는 `/^jz(Pg|Sheet)/` — 소스에 `jzBox` 가 없다');
  const s291 = [];
  for (let i = 0; i < 4; i++) s291.push(await run(page, { ms: 0, settle291: true, settleBox: false }));
  console.log('   settle291() 만: ' + s291.map(r => r.db).join(' · '));
  ok(s291.every(r => r.db === '690×267'),
    '[2b] `settle291()` 을 불러도 **여전히 690×267** — 상자 연출은 그 정규식을 안 지난다');
  ok(/jzBox/.test(QUIET_SRC),
    '[2c] §box(QUIET_SRC)는 `jzBox` 를 본다 — 구멍을 메우는 것은 이 부품이다');

  /* ── [3] 처방 ──────────────────────────────────────────────── */
  blk('[3] 처방 — 공용 §box `settleBox()` 로 ' + REPS + '회 재본다');
  const fixed = [];
  for (let i = 0; i < REPS; i++) fixed.push(await run(page, { ms: -1, settle291: false, settleBox: true }));
  console.log('   ' + fixed.map(r => r.db).join(' · '));
  ok(fixed.every(r => r.db === '750×290'), '[3a] ' + REPS + '회 전부 750×290');
  ok(fixed.every(r => r.p === '684×120'), '[3b] ' + REPS + '회 전부 문단 684×120');
  ok(new Set(fixed.map(r => r.db + '/' + r.p)).size === 1, '[3c] 흔들림 0 — 값이 한 가지다');

  /* ── [4] 인구조사 ──────────────────────────────────────────── */
  blk('[4] 인구조사 — 「한 evaluate 안에서 열고 → 기다리고 → 잰다」 게이트');
  const c = census();
  for (const h of c) console.log('   ' + h.file + ':' + h.line + (h.settle ? '  [정착 부름]' : '  [정착 0회]'));
  console.log('   ⇒ ' + new Set(c.map(h => h.file)).size + '자 / ' + c.length + '곳'
    + ' (353 이 적어 둔 표는 «5자 — 96·22·46·125·299»)');
  ok(c.length > 5, '[4a] 353 의 표가 낡았다 — 지금 ' + c.length + '곳이다');
  ok(c.some(h => h.file === 'verify485.js'), '[4b] `verify485` 가 그 표에 있다(등재문의 «여섯째»)');

  /* ── [5] 사본 조사 ─────────────────────────────────────────── */
  blk('[5] 사본 조사 — `jzBox` 정착을 손으로 적은 자');
  const dup = handRolled();
  for (const d of dup) console.log('   ' + d.file + ':' + d.line + '  ' + d.why);
  const hand = dup.filter(d => d.why === '손으로 적었다');
  ok(hand.length >= 1, '[5a] 상자 정착을 **손으로 적은** 자가 ' + hand.length + '자 — 공용 부품이 필요한 이유다 (244 `verify46` · 764 `verify429` · 771 `probe771`)');

  ok(errs.length === 0, '[Z] 콘솔 에러 0건 — ' + (errs.slice(0, 2).join(' | ') || '없음'));
  await browser.close();
  console.log('\nPROBE950 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();

/* ── 인구조사 자 (verify950 도 이 함수를 쓴다 — 표를 두 벌로 안 적는다) ───────── */
function census() {
  const MEAS = /getBoundingClientRect|offsetWidth|offsetHeight|clientWidth|clientHeight|scrollWidth|scrollHeight|getComputedStyle/;
  const WAIT = /setTimeout\s*\(|requestAnimationFrame\s*\(/;
  const OPEN = /\b(open[A-Z]\w*|show[A-Z]\w*|setTab\s*\(|switchTab|\.click\s*\(\s*\)|dispatchEvent)/;
  const out = [];
  for (const file of fs.readdirSync(__dirname).filter(f => /^verify.*\.js$/.test(f)).sort()) {
    const s = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const re = /\.evaluate\(/g; let m;
    while ((m = re.exec(s))) {
      let i = re.lastIndex - 1, depth = 0, j = i;
      for (; j < s.length; j++) { if (s[j] === '(') depth++; else if (s[j] === ')') { depth--; if (!depth) break; } }
      const body = s.slice(i, j);
      const wi = body.search(WAIT);
      if (wi < 0) continue;
      if (OPEN.test(body.slice(0, wi)) && MEAS.test(body.slice(wi))) {
        out.push({ file, line: s.slice(0, i).split('\n').length, settle: /settle291|settleBox/.test(body) });
      }
    }
  }
  return out;
}

/* «상자 개폐 연출이 멎기를 손으로 기다리는» 자 — 공용 부품이 필요한 근거.
   지문은 둘을 **같이** 갖는 것이다: ⓐ `getAnimations()` 로 애니를 집고 ⓑ `playState` 로 «아직 도는가» 를 본다.
   그 위에 상자를 가리키는 말(`jzBox` 또는 그 오버슛 값 690/764)이 있으면 이 부품과 같은 일을 하는 사본이다. */
function handRolled() {
  const out = [];
  for (const file of fs.readdirSync(__dirname).filter(f => /\.js$/.test(f)).sort()) {
    if (['settle291.js', 'probe950.js', 'verify950.js'].includes(file)) continue;
    const s = fs.readFileSync(path.join(__dirname, file), 'utf8');
    if (!/getAnimations\s*\(/.test(s) || !/playState/.test(s)) continue;
    if (!/jzBox/.test(s)) continue;
    const line = s.split('\n').findIndex(l => /jzBox/.test(l)) + 1;
    out.push({ file, line, why: /window\.settleBox|settleAnim291/.test(s) ? '공용 §box 를 쓴다' : '손으로 적었다' });
  }
  return out;
}

module.exports = { census, handRolled };
