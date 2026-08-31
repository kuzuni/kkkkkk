#!/usr/bin/env node
/* 재현 — 작업 545 「`tools/audit148.js` 오프너 목록의 죽은 이름 `openRelicPage()` 를
 *          `catch (_) {}` 가 삼켜 89 유물 페이지가 한 번도 스캔된 적이 없다」
 *
 *   node tools/probe545.js
 *
 * 338 규칙대로 **처방 전에 재현한다.** 등재문은 «안 보이던 자리» 라고만 적었으므로
 * 이 자가 할 일은 «정말로 한 번도 안 열렸나» 와 «고치면 실제로 열리나» 를 찍힌 상태로 가르는 것이다.
 * 397(스캐너 SCREENS 스코프 구멍) · 133(`aspect63` 죽은 셀렉터가 `missing:true` 로 조용히 빠짐)과 같은 계열.
 *
 * 묻는 것:
 *   [A] 옛 이름 `openRelicPage` 가 제품에 **없다**(호출하면 던진다) · 새 이름 `openRelw` 는 **있다**.
 *   [B] `audit148.js` 의 **옛 오프너 목록 그대로** 한 바퀴 돌 때, 매 scan 순간 `#relw.on` 이
 *       한 번도 참이 아니다 = 유물 페이지가 스캔 범위 밖이다. (그리고 그 실패는 **조용하다**)
 *   [C] 이름만 `openRelw()` 로 바꾼 목록으로 같은 바퀴를 돌면 `#relw.on` 이 참인 scan 이 생긴다.
 *   [D] 옛 목록의 오프너 8개 중 **실제로 던지는 것이 몇 개**인가(= 침묵으로 삼켜진 건수).
 *   [E] 유물 페이지가 열린 상태에서 `audit148` 의 판정을 그대로 돌리면 위험 자리가 몇 건 잡히는가
 *       (③ 처방 — 새로 잡히는 자리가 있으면 그 화면 담당 구간으로 등재한다).
 *
 * ⚠ 이 자는 아무것도 고치지 않는다 — audit148.js 는 읽지도 않고, 같은 목록을 여기에 적어 둔 뒤
 *   «옛 목록 ↔ 새 목록» 을 같은 페이지에서 대조한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

/* audit148.js 21행의 목록 그대로(수리 전) */
const OLD = ['openQuest()', 'openProfile()', 'openMail()', 'openShopPage("skill")',
             'openRelicPage()', 'goTab("hero")', 'goTab("train")', 'goTab("shop")'];
/* 이름 하나만 바꾼 목록 */
const NEW = OLD.map(o => o === 'openRelicPage()' ? 'openRelw()' : o);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined ? ' — ' + d : '')); };

/* audit148 의 판정을 그대로 옮긴 것 — «글자가 든 <s>/<u> 인데 밑줄·취소선이 살아 있는가» */
const SCAN = () => {
  const out = [];
  for (const el of document.querySelectorAll('s,u,strike')) {
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim();
    if (!txt) continue;
    const cs = getComputedStyle(el);
    if (cs.textDecorationLine === 'none') continue;
    const sw = parseFloat(cs.webkitTextStrokeWidth) || 0;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const id = (el.closest('[id]') ? '#' + el.closest('[id]').id + ' ' : '') +
               el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '');
    out.push({ id, txt: txt.slice(0, 20), deco: cs.textDecorationLine, stroke: +sw.toFixed(2) });
  }
  return out;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1300);
  await page.evaluate(() => document.fonts.ready);

  /* audit148 과 같은 한 바퀴. 다만 «실패했는가» 와 «그 순간 유물 페이지가 열려 있었는가» 를 같이 적는다. */
  const round = async (list) => {
    const log = [];
    let relOpenScans = 0, thrown = [], hits = [];
    for (const o of list) {
      let threw = null;
      try { await page.evaluate(o); } catch (e) { threw = String(e.message || e).split('\n')[0]; }
      await page.waitForTimeout(350);
      const relOn = await page.evaluate(() => !!(document.getElementById('relw') || {}).classList &&
                                              document.getElementById('relw').classList.contains('on'));
      if (relOn) { relOpenScans++; hits = hits.concat(await page.evaluate(SCAN)); }
      if (threw) thrown.push(o);
      log.push({ o, threw, relOn });
      try { await page.evaluate(() => { closeModal(); gmCloseAll(); }); } catch (_) {}
      await page.waitForTimeout(150);
    }
    return { log, relOpenScans, thrown, hits };
  };

  console.log('== PROBE545 — audit148 오프너 스코프 구멍 재현 ==\n');

  /* [A] 이름 */
  const names = await page.evaluate(() => ({
    old: typeof window.openRelicPage, now: typeof window.openRelw,
    relw: !!document.getElementById('relw'),
  }));
  ok(names.old === 'undefined', '[A1] 옛 이름 openRelicPage 는 제품에 없다', 'typeof = ' + names.old);
  ok(names.now === 'function', '[A2] 현재 이름 openRelw 는 있다', 'typeof = ' + names.now);
  ok(names.relw, '[A3] 유물 페이지 노드 #relw 는 문서에 있다(= 열 대상은 존재한다)');

  /* [B] 옛 목록 한 바퀴 */
  const before = await round(OLD);
  console.log('\n  -- 옛 목록 한 바퀴 --');
  for (const r of before.log)
    console.log(`     ${r.o.padEnd(22)} ${r.threw ? '던짐: ' + r.threw : '통과'}${r.relOn ? '   [#relw.on]' : ''}`);
  ok(before.relOpenScans === 0, '[B1] 옛 목록으로는 #relw 가 열린 scan 이 한 번도 없다',
     before.relOpenScans + '회');
  ok(before.thrown.length === 1 && before.thrown[0] === 'openRelicPage()',
     '[B2] 던진 오프너는 openRelicPage() 하나다', before.thrown.join(', ') || '없음');

  /* [C] 이름만 고친 목록 */
  const after = await round(NEW);
  console.log('\n  -- 이름만 고친 목록 한 바퀴 --');
  for (const r of after.log)
    console.log(`     ${r.o.padEnd(22)} ${r.threw ? '던짐: ' + r.threw : '통과'}${r.relOn ? '   [#relw.on]' : ''}`);
  ok(after.relOpenScans >= 1, '[C1] 이름을 고치면 #relw 가 열린 scan 이 생긴다', after.relOpenScans + '회');
  ok(after.thrown.length === 0, '[C2] 고친 목록에는 던지는 오프너가 없다', after.thrown.join(', ') || '없음');

  /* [D] 침묵으로 삼켜진 건수 */
  ok(before.thrown.length - after.thrown.length === 1,
     '[D] 침묵으로 삼켜지던 실패는 정확히 1건이었다',
     `옛 ${before.thrown.length}건 → 새 ${after.thrown.length}건`);

  /* [E] 새로 스캔되는 자리에 위험 항목이 있는가 */
  const uniq = new Map();
  for (const h of after.hits) uniq.set(h.id + '|' + h.txt, h);
  console.log('\n  -- 유물 페이지가 열린 scan 에서 잡힌 «글자 든 <s>/<u> · deco≠none» --');
  if (!uniq.size) console.log('     없음');
  for (const v of uniq.values())
    console.log(`     · ${v.id.padEnd(28)} «${v.txt}»  deco=${v.deco} stroke=${v.stroke}`);
  console.log('     총 ' + uniq.size + '건');
  ok(true, '[E] 유물 페이지 위험 자리 수집 완료(등재 판단용 · 실패 아님)', uniq.size + '건');

  console.log(`\nPROBE545 ${pass}/${pass + fail}` + (fail ? '  ← FAIL ' + fail : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
