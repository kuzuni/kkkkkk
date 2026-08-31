#!/usr/bin/env node
/* 작업 443 — «356 스캐너의 패스 탭 목록이 마크업과 같은가» 재현기 (측정 전용 · 판정은 verify356.js)
 *
 *   node tools/probe443.js
 *   node tools/probe443.js --json
 *
 * 등재문의 주장: `tools/scan356.js` 68행이 `#psBar [data-ptab="box"]` 로 패스 화면을 열려 하는데
 * **428 이 그 탭을 없앴다** → `verify356` [C] 92/93.
 * 338·341·350 규칙대로 처방을 따르기 전에 **직접 물어서** 확인한다 — 등재문은 «죽은 이름 하나» 를
 * 지목했지만, 목록이 손으로 적힌 표인 한 결손은 두 방향이다:
 *   ⓐ 유령 — 목록에 있는데 DOM 에 없는 이름 (무음 실패 · [C] 가 잡는 방향)
 *   ⓑ 사각지대 — DOM 에 있는데 목록에 없는 탭 ([C] 는 **끝까지 초록**이다. 397 의 출석 젬이 그 자리였다)
 * 428 은 box 하나를 지우고 tower2 하나를 **신설**했으므로 두 방향이 같이 났는지가 이 자의 물음이다.
 *
 * 찍는 것:
 *   ① 마크업이 말하는 탭   — index.html `#psBar` 파생(scan356.derivePassScreens)
 *   ② 살아 있는 DOM 의 탭  — 실제로 페이지를 열어 `#psBar [data-ptab]` 을 센다
 *   ③ 자가 도는 탭        — scan356 SCREENS 의 패스 줄이 여는 키
 *   ④ 유령·사각지대 대조   — ③ ↔ ② 의 차집합 (수리 전 = 유령 box 1 · 사각지대 tower2 1)
 *   ⑤ 사각지대의 값       — 그 탭을 실제로 열어 356 이 세는 아이콘 노드가 몇 개인가 (= 안 보던 표본 크기)
 *   ⑥ 되돌림             — 마크업 사본의 키를 바꾸면 파생이 따라오는가 / `#psBar` 를 지우면 던지는가
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚠ 356 13회차 — 구동기는 `scan356.STEP` 한 벌이다(자기 손으로 다시 적으면 `js:<식>` 단계를
   조용히 건너뛴다 · `verify356` [R12] 가 지킨다). */
const { SCREENS, COLLECT, URL, derivePassScreens, HTML, STEP } = require('./scan356.js');

const JSON_OUT = process.argv.includes('--json');

/* 수리 전 68행이 붙들고 있던 표 — 이 자는 «옛 목록» 을 기록으로 들고 있어야 대조가 된다 */
const OLD_TABLE = ['stage', 'att', 'box', 'tower'];

const oks = [];
const fails = [];
const ok = (m) => { oks.push(m); if (!JSON_OUT) console.log('  ✓ ' + m); };
const bad = (m) => { fails.push(m); if (!JSON_OUT) console.log('  ✗ ' + m); };
const say = (m) => { if (!JSON_OUT) console.log(m); };

const keysOf = (screens) => screens.flatMap(([, st]) => st)
  .map((s) => (s.match(/#psBar \[data-ptab="([^"]+)"\]/) || [])[1]).filter(Boolean);

(async () => {
  const src = fs.readFileSync(HTML, 'utf8');
  const out = {};

  say('① 마크업이 말하는 탭 — index.html `#psBar` 파생');
  const derived = keysOf(derivePassScreens(src));
  out.derived = derived;
  if (derived.length >= 2) ok(`파생 ${derived.length}개: ${derived.join(' · ')}`);
  else bad(`파생이 ${derived.length}개뿐 — 파생 규칙이 마크업과 어긋났다`);

  say('② 살아 있는 DOM 의 탭 — 실제로 열어서 센다');
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => { const e = document.querySelector('#menub'); if (e) e.click(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const e = document.querySelector('#psGo'); if (e) e.click(); });
  await page.waitForTimeout(500);
  const live = await page.evaluate(() =>
    [...document.querySelectorAll('#psBar [data-ptab]')].map((e) => e.dataset.ptab));
  out.live = live;
  if (live.length >= 2) ok(`살아 있는 탭 ${live.length}개: ${live.join(' · ')} (헛초록 방지)`);
  else bad(`살아 있는 탭 ${live.length}개 — 패스 화면 진입 실패`);

  say('③ 자가 도는 탭 — scan356 SCREENS 의 패스 줄');
  const mine = keysOf(SCREENS);
  out.screens = mine;
  ok(`SCREENS ${SCREENS.length}화면 중 패스 줄 ${mine.length}개: ${mine.join(' · ')}`);

  say('④ 유령 · 사각지대 대조');
  const ghostNow = mine.filter((k) => !live.includes(k));
  const blindNow = live.filter((k) => !mine.includes(k));
  out.ghost = ghostNow; out.blind = blindNow;
  if (!ghostNow.length) ok('유령(목록에 있는데 DOM 에 없는 이름) 0개');
  else bad(`유령 ${ghostNow.length}개: ${ghostNow.join(' · ')} — 그 줄은 직전 화면을 두 번 센다`);
  if (!blindNow.length) ok('사각지대(DOM 에 있는데 목록에 없는 탭) 0개');
  else bad(`사각지대 ${blindNow.length}개: ${blindNow.join(' · ')} — 그 탭의 CSS 는 356 이 한 번도 못 봤다`);

  /* 수리 전 표를 같은 자로 대조 — «내가 무엇을 고쳤는가» 를 이 자가 스스로 말한다 */
  const ghostOld = OLD_TABLE.filter((k) => !live.includes(k));
  const blindOld = live.filter((k) => !OLD_TABLE.includes(k));
  out.oldGhost = ghostOld; out.oldBlind = blindOld;
  say(`   [대조] 수리 전 표 ${OLD_TABLE.join(' · ')} → 유령 ${ghostOld.join(',') || '0'} · 사각지대 ${blindOld.join(',') || '0'}`);
  if (ghostOld.length || blindOld.length)
    ok(`수리 전 표는 유령 ${ghostOld.length}개(${ghostOld.join(',')}) · 사각지대 ${blindOld.length}개(${blindOld.join(',')}) 였다 = 428 이 두 방향을 같이 냈다`);
  else bad('수리 전 표에도 결손이 없다 — 등재문의 전제가 이 트리에서 거짓이다');

  say('⑤ 사각지대의 값 — 그 탭이 실제로 몇 노드였나 (356 이 안 보던 표본)');
  const counts = {};
  for (const k of live) {
    const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const p2 = await c2.newPage();
    await p2.goto(URL, { waitUntil: 'load' });
    await p2.waitForTimeout(700);
    for (const s of ['#menub', '#psGo', `#psBar [data-ptab="${k}"]`]) {
      await STEP(p2, s);
      await p2.waitForTimeout(400);
    }
    await p2.waitForTimeout(200);
    const got = await p2.evaluate(COLLECT, { all: false });
    counts[k] = got.length;
    await c2.close();
  }
  out.counts = counts;
  for (const k of live) say(`   ${k}: 아이콘 노드 ${counts[k]}개`);
  const blindTotal = blindOld.reduce((a, k) => a + (counts[k] || 0), 0);
  if (blindOld.length) ok(`수리 전 사각지대(${blindOld.join(',')})에 아이콘 노드 ${blindTotal}개가 있었다 — 그만큼이 감시 밖이었다`);
  else ok('수리 전 사각지대 없음');

  say('⑥ 되돌림 — 표가 아니라 파생인가');
  const renamed = src.replace(/data-ptab="tower2"/g, 'data-ptab="zzTest"');
  if (renamed === src) bad('되돌림 표본을 못 심었다 — `data-ptab="tower2"` 가 마크업에 없다');
  else {
    const after = keysOf(derivePassScreens(renamed));
    if (after.includes('zzTest') && !after.includes('tower2'))
      ok(`키를 바꾸면 파생이 따라온다: ${after.join(' · ')} (표였다면 tower2 가 남는다)`);
    else bad(`키를 바꿔도 목록이 그대로다: ${after.join(' · ')}`);
  }
  let threw = '';
  try { derivePassScreens(src.replace('id="psBar"', 'id="psBarGONE"')); }
  catch (e) { threw = String(e.message || e); }
  if (threw) ok('`#psBar` 가 사라진 사본에는 던진다 (조용히 빈 목록을 내지 않는다)');
  else bad('`#psBar` 가 없는데도 조용히 목록을 냈다 — 무음을 무음으로 갈아 끼운 것이다');

  await ctx.close();
  await browser.close();

  if (JSON_OUT) console.log(JSON.stringify({ ok: oks.length, fail: fails.length, ...out }, null, 1));
  const total = oks.length + fails.length;
  console.log(`\nPROBE443 ${oks.length}/${total} ` + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})();
