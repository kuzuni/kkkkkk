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

  /* [E0] «위험 0건» 이 헛초록이 아님을 먼저 못박는다 — 유물 페이지에 «글자 든 <s>/<u>» 자체가
     몇 개나 있는가(deco 무관). 여기가 0 이면 «위험 0» 은 «볼 것이 없었다» 는 뜻이고,
     여기가 양수면 «봤는데 전부 안전» 이라는 뜻이다. 534 가 겪은 «헛초록»(잴 게 0종인 회귀) 예방. */
  await page.evaluate(() => { try { closeModal(); gmCloseAll(); } catch (e) {} });
  await page.evaluate('openRelw()');
  await page.waitForTimeout(350);
  const inRel = await page.evaluate(() => {
    const root = document.getElementById('relw');
    let text = 0, all = 0, deco = 0;
    for (const el of root.querySelectorAll('s,u,strike')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      all++;
      const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim();
      if (!t) continue;
      text++;
      if (getComputedStyle(el).textDecorationLine !== 'none') deco++;
    }
    return { all, text, deco, on: root.classList.contains('on') };
  });
  ok(inRel.on, '[E0a] #relw 가 열려 있다(수집 전제)');
  ok(inRel.text > 0, '[E0b] 유물 페이지에 «글자 든 <s>/<u>» 가 실제로 있다 = 위험 0 은 헛초록이 아니다',
     `보이는 s/u/strike ${inRel.all}개 중 글자 든 것 ${inRel.text}개 · 그중 deco≠none ${inRel.deco}개`);

  /* [E] 새로 스캔되는 자리에 위험 항목이 있는가 */
  const uniq = new Map();
  for (const h of after.hits) uniq.set(h.id + '|' + h.txt, h);
  console.log('\n  -- 유물 페이지가 열린 scan 에서 잡힌 «글자 든 <s>/<u> · deco≠none» --');
  if (!uniq.size) console.log('     없음');
  for (const v of uniq.values())
    console.log(`     · ${v.id.padEnd(28)} «${v.txt}»  deco=${v.deco} stroke=${v.stroke}`);
  console.log('     총 ' + uniq.size + '건');
  ok(true, '[E] 유물 페이지 위험 자리 수집 완료(등재 판단용 · 실패 아님)', uniq.size + '건');

  /* [F] 목록 자체가 좁다 — audit148 의 오프너는 **손으로 적은 8개**이고, `smoke.js` 는 같은 일을
     DOM 에서 파생한다(`.tab[data-t]` · `.side .ibtn[data-pop]` · `[data-mn]` …). 손 목록은 개명에
     썩고 신설에 뒤처진다(545 가 바로 그 사고다). 그래서 «고친 8개로 0건» 이 «전수 0건» 인지를
     여기서 한 번 더 묻는다 — 이 절은 **읽기만 한다**(제품·감사 파일을 안 고친다). */
  const wide = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const seen = new Map();
    const sel = [...document.querySelectorAll('.tab[data-t]')].map(e => ['tab', e.dataset.t])
      .concat([...document.querySelectorAll('.side .ibtn[data-pop]')].map(e => ['pop', e.dataset.pop]))
      .concat([...document.querySelectorAll('[data-mn]')].map(e => ['mn', e.dataset.mn]));
    const scan = (where) => {
      for (const el of document.querySelectorAll('s,u,strike')) {
        const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.data).join('').trim();
        if (!t) continue;
        const cs = getComputedStyle(el);
        if (cs.textDecorationLine === 'none') continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const id = (el.closest('[id]') ? '#' + el.closest('[id]').id + ' ' : '') + el.tagName.toLowerCase() +
                   (el.className ? '.' + String(el.className).split(' ')[0] : '');
        if (!seen.has(id + '|' + t)) seen.set(id + '|' + t, { id, txt: t.slice(0, 20), deco: cs.textDecorationLine,
                                                             stroke: +(parseFloat(cs.webkitTextStrokeWidth) || 0).toFixed(2), where });
      }
    };
    let opened = 0;
    for (const [kind, k] of sel) {
      try {
        const node = kind === 'tab' ? document.querySelector(`.tab[data-t="${k}"]`)
                   : kind === 'pop' ? document.querySelector(`.side .ibtn[data-pop="${k}"]`)
                   : document.querySelector(`[data-mn="${k}"]`);
        if (!node) continue;
        node.click(); opened++;
        await wait(260);
        scan(kind + ':' + k);
        try { closeModal(); gmCloseAll(); } catch (e) {}
        await wait(120);
      } catch (e) {}
    }
    return { opened, rows: [...seen.values()] };
  });
  console.log(`\n  -- [F] DOM 에서 파생한 넓은 스윕(${wide.opened}개 입구 · 읽기 전용) --`);
  if (!wide.rows.length) console.log('     위험 자리 없음');
  for (const v of wide.rows)
    console.log(`     · ${v.id.padEnd(28)} «${v.txt}»  deco=${v.deco} stroke=${v.stroke}   [${v.where}]`);
  ok(wide.opened >= 8, '[F1] 손 목록(8개)보다 넓은 입구를 실제로 열었다', wide.opened + '개');
  ok(true, '[F2] 넓은 스윕의 위험 자리 수(등재 판단용 · 실패 아님)', wide.rows.length + '건');

  console.log(`\nPROBE545 ${pass}/${pass + fail}` + (fail ? '  ← FAIL ' + fail : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
