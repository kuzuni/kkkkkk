/* 작업 402 재현 프로브 — «던전 입장권 색이 던전마다 달라야 하는데 유물 4단이 전부 같은 보라»
 *
 *   node tools/probe402.js
 *
 * 등재문(주인 보고 2026-08-29)의 주장:
 *   «입장권 SVG 5장은 실제로 색이 다르고, 빨간 것은 매핑이다 — `dunTk()` 의 마지막 폴백이
 *    relic1~4 를 `tkRelic` 하나로 접는다. 03 카드·04 세부·13 교환 카드 세 자리가 같은 그림을 그린다.»
 *
 * 338 규칙 — 처방을 따르기 전에 **재현부터**. 이 파일은 «고쳤다» 를 재는 게이트가 아니라
 * 주장이 참인지 **실제 진입점으로 돌며 그림 파일명을 찍어** 보는 자리다.
 * 찍는 것:
 *   ① `dunTk()` 의 순수 함수 결과 — 8던전이 몇 종으로 접히는가
 *   ② 03 던전 목록 카드 `.sp.tk` 가 실제로 그린 `<img src>` (8장)
 *   ③ 04 세부 팝업 `#dgdTki` 가 실제로 그린 `<img src>` (8던전 각각 진입)
 *   ④ 13 재화 탭 던전 입장권 교환 카드 `.cn-cd.dtk .pn` 의 `<img src>` (8장)
 *   ⑤ 정적 기본값 `#dgdTki[data-cur-slot]` — 덮는 경로가 안 돌면 남는 값
 *   ⑥ 죽은 필드 둘(`tower.tk`·`despair.tk`)이 화면에 나오는가 — 탑 카드는 `♾️ 없음` 인가
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✅ ' + m + (d ? ' — ' + d : '')); } else { fail++; console.log('  ❌ ' + m + (d ? ' — ' + d : '')); } };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));

const base = s => String(s || '').split('/').pop();

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  /* ── ① 순수 함수 ─────────────────────────────────────────────── */
  blk('① dunTk() — 8던전이 몇 종으로 접히는가');
  const A = await ev(() => DUNGEONS.map(d => ({ id: d.id, k: dunTk(d.id), f: CUR_ICON[dunTk(d.id)] })));
  if (A.__err) { ok(false, '① evaluate 실패', A.__err); }
  else {
    A.forEach(x => console.log('     ' + x.id.padEnd(8) + ' → ' + String(x.k).padEnd(9) + ' ' + base(x.f)));
    const kinds = new Set(A.map(x => x.k));
    ok(kinds.size === A.length, '①-a 8던전이 서로 다른 권종을 쓴다', A.length + '던전 → ' + kinds.size + '종');
    const relics = A.filter(x => /^relic\d$/.test(x.id));
    ok(new Set(relics.map(x => x.k)).size === relics.length,
       '①-b 유물 4단의 권종이 서로 다르다', relics.map(x => x.id + ':' + x.k).join(' · '));
  }

  /* ── ② 03 던전 목록 카드 ────────────────────────────────────── */
  blk('② 03 던전 카드 `.sp.tk` — 실제로 그려진 그림');
  const B = await ev(() => {
    /* 카드 8장이 전부 보이도록 해금만 연다(cap72 선례 — 상태 조작은 해금 축 하나) */
    S.guide.idx = 99;
    Object.values(DUN_UI).forEach(u => { if (u.pre) S.dun[u.pre.id] = (u.pre.f | 0) + 1; });
    document.querySelector('#tabbar [data-t="adv"]').click();
    const out = [];
    document.querySelectorAll('#dunList .dnc').forEach(c => {
      const im = c.querySelector('.sp.tk img.cic');
      out.push({ id: c.dataset.dcard || '?',
                 src: im ? im.getAttribute('src') : null,
                 txt: (c.querySelector('.sp.tk i') || {}).textContent || '' });
    });
    return out;
  });
  if (B.__err) { ok(false, '② evaluate 실패', B.__err); }
  else {
    B.forEach(x => console.log('     ' + String(x.id).padEnd(8) + ' ' + String(base(x.src)).padEnd(24) + ' «' + x.txt + '»'));
    const dun = B.filter(x => x.src);
    const kinds = new Set(dun.map(x => base(x.src)));
    ok(kinds.size === dun.length, '②-a 카드가 그린 권종 그림이 서로 다르다',
       dun.length + '장 → ' + kinds.size + '종 (' + [...kinds].join(', ') + ')');
  }

  /* ── ③ 04 세부 팝업 ─────────────────────────────────────────── */
  blk('③ 04 세부 팝업 `#dgdTki` — 던전마다 진입해서 찍는다');
  const C = await ev(() => {
    const out = [];
    for (const d of DUNGEONS) {
      openDunDetail(d);
      const im = document.querySelector('#dgdTki img.cic');
      out.push({ id: d.id, src: im ? im.getAttribute('src') : null,
                 slot: document.getElementById('dgdTki').dataset.curSlot || null });
      const cl = document.querySelector('#dgd .x') || document.querySelector('#dgd [data-close]');
      if (cl) cl.click(); else closeModal && closeModal('dgd');
    }
    return out;
  });
  if (C.__err) { ok(false, '③ evaluate 실패', C.__err); }
  else {
    C.forEach(x => console.log('     ' + x.id.padEnd(8) + ' ' + String(base(x.src)).padEnd(24) + ' slot=' + x.slot));
    const kinds = new Set(C.map(x => base(x.src)));
    ok(kinds.size === C.length, '③-a 세부 팝업의 권종 그림이 서로 다르다',
       C.length + '회 → ' + kinds.size + '종');
  }

  /* ── ④ 13 재화 탭 교환 카드 ─────────────────────────────────── */
  blk('④ 13 재화 탭 던전 입장권 교환 카드 `.cn-cd.dtk`');
  const D = await ev(() => {
    openShopTab('coin');
    const out = [];
    document.querySelectorAll('#shopList .cn-cd.dtk').forEach(c => {
      const im = c.querySelector('.pn img.cic');
      const bt = c.querySelector('[data-dunex]');
      out.push({ id: bt ? bt.dataset.dunex : '?', src: im ? im.getAttribute('src') : null });
    });
    return out;
  });
  if (D.__err) { ok(false, '④ evaluate 실패', D.__err); }
  else {
    D.forEach(x => console.log('     ' + String(x.id).padEnd(8) + ' ' + base(x.src)));
    const kinds = new Set(D.map(x => base(x.src)));
    ok(kinds.size === D.length, '④-a 교환 카드의 권종 그림이 서로 다르다',
       D.length + '장 → ' + kinds.size + '종');
  }

  /* ── ⑤ 죽은 필드 둘 ─────────────────────────────────────────── */
  blk('⑤ 탑 2장(tower·despair) — `.sp.tk` 에 무엇이 그려지는가');
  const E = await ev(() => {
    /* 탑 2장은 03 «탑» 서브탭에 있다(DUNGEONS 에 없다 — 209) */
    dunSub = 'tower'; renderDunPage();
    const out = [];
    document.querySelectorAll('#dunList .dnc').forEach(c => {
      const sp = c.querySelector('.sp.tk');
      out.push({ id: (c.querySelector('.nm i') || {}).textContent || '?',
                 html: sp ? sp.innerHTML.slice(0, 120) : null,
                 img: sp && sp.querySelector('img') ? sp.querySelector('img').getAttribute('src') : null });
    });
    dunSub = 'dun'; renderDunPage();
    return { rows: out,
             towerTk: ('tk' in DUN_UI.tower) ? String(DUN_UI.tower.tk) : '(필드 없음 — 402 가 걷어냈다)',
             despairTk: ('tk' in DUN_UI.despair) ? String(DUN_UI.despair.tk) : '(필드 없음 — 402 가 걷어냈다)' };
  });
  if (E.__err) { ok(false, '⑤ evaluate 실패', E.__err); }
  else {
    console.log('     DUN_UI.tower.tk   = ' + E.towerTk);
    console.log('     DUN_UI.despair.tk = ' + E.despairTk);
    E.rows.forEach(x => console.log('     [' + x.id + '] img=' + x.img + '  html=' + x.html));
    ok(E.rows.length === 2 && E.rows.every(x => !x.img),
       '⑤-a 탑 2장은 `.sp.tk` 에 그림을 안 그린다(죽은 필드다)',
       E.rows.map(x => x.id + ':' + (x.img ? base(x.img) : '없음')).join(' · '));
  }

  /* ── ⑥ 콘솔 ─────────────────────────────────────────────────── */
  blk('⑥ 콘솔');
  ok(errs.length === 0, '⑥-a 콘솔 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  console.log('\nPROBE402 ' + (fail ? 'FAIL(= 결손이 재현됐다)' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(0);   /* 프로브는 «재현» 이 목적이라 종료 코드로 게이트하지 않는다 */
})();
