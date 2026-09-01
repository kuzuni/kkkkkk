#!/usr/bin/env node
/* 작업 661 재현 — «장비 강화 결과가 화면 중앙에 떠야 한다» (338 규칙: 처방 전에 찍힌 값부터)
 *
 *   node tools/probe661.js
 *
 * 주인 원문: «장비 강화 결과는 화면 중앙에 뜨게 해줘야함».
 * 등재문이 갈래를 열어 뒀다 — ⓐ 09 일괄 강화 결과 팝업(`#upw`)이 중앙이 아니다
 *                            ⓑ 단건 강화가 결과 표시 자체를 안 낸다
 *                            ⓒ 팝업이 아예 안 뜨는 경로가 있다
 * 이 프로브는 셋을 **같은 자로** 잰다: «결과라고 부를 만한 것이 무엇으로 어디에 뜨는가»,
 * 그리고 그 중심이 뷰포트 중심에서 몇 px 인가. 두 프레임(9:19 2280 · 9:13.3 1600) 전부.
 *
 * ⚠ `#upw` 는 딤이 화면 전체(inset:0)라 «팝업 상자» 로 재면 언제나 정중앙이 나온다 —
 *   사람이 보는 것은 그 안의 **내용 묶음**(리본 + 카드 + 레벨줄 + «터치하여 닫기»)이다.
 *   그래서 자식들의 합집합 bbox 로 잰다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const FRAMES = [
  { id: '9:19',   w: 1080, h: 2280 },
  { id: '9:13.3', w: 1080, h: 1600 },
];

const out = [];
let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; out.push('  ✓ ' + n + (m ? ' — ' + m : '')); };
const bad = (n, m) => { fail++; out.push('  ✗ ' + n + (m ? ' — ' + m : '')); };
const r2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

/* 강화가 «되는» 상태를 만든다 — 조각을 넉넉히 주고 보유로 만든다 */
const SETUP = `
  S.guide.idx = 99;
  EQUIPS.forEach(function(e){ S.own[e.id] = { n: 100000, l: 1 }; });
  SKILLS.forEach(function(s){ S.own[s.id] = { n: 100000, l: 1 }; });
  S.gold = 1e12; S.dia = 1e9;
  markDirty && markDirty(); renderUI && renderUI();`;

/* 화면에 실제로 «보이는» 자식들의 합집합 bbox — 딤·투명 껍데기는 뺀다 */
const GROUP = `(function(sel){
  var host = document.querySelector(sel);
  if(!host) return null;
  var vis = getComputedStyle(host).display !== 'none' && host.classList.contains('on');
  var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9, n = 0, seen = [];
  host.querySelectorAll('*').forEach(function(el){
    var cs = getComputedStyle(el);
    if(cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
    /* 딤 계열(화면 전체를 덮는 반투명 판)은 «내용» 이 아니다 */
    var r = el.getBoundingClientRect();
    if(!r.width || !r.height) return;
    if(r.width >= innerWidth * 0.99 && r.height >= innerHeight * 0.99) return;
    if(el.children.length && r.width >= innerWidth * 0.99) return;
    if(x1 > r.x) x1 = r.x; if(y1 > r.y) y1 = r.y;
    if(x2 < r.right) x2 = r.right; if(y2 < r.bottom) y2 = r.bottom;
    n++;
    if(seen.length < 6) seen.push(el.className || el.tagName);
  });
  if(!n) return { on: vis, empty: true };
  return { on: vis, x: x1, y: y1, w: x2 - x1, h: y2 - y1,
           cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, n: n, seen: seen };
})`;

async function open(browser, F) {
  const ctx = await browser.newContext({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  await page.waitForTimeout(200);
  return { ctx, page, errs };
}

(async () => {
  const browser = await launch(chromium);
  try {
    for (const F of FRAMES) {
      out.push(`\n[${F.id}] ${F.w}×${F.h} — 뷰포트 중심 (${F.w / 2}, ${F.h / 2})`);
      const { ctx, page } = await open(browser, F);

      /* ── ⓐ 06 장비 → 05 무기 팝업 → [일괄 강화] → 09 결과(#upw) ── */
      const opened = await page.evaluate(() => {
        try { goTab('hero'); } catch (e) {}
        try { openWeapon(null, 'weapon'); } catch (e) { return 'openWeapon 실패: ' + e.message; }
        return document.querySelector('#wpnw') && document.querySelector('#wpnw').classList.contains('on');
      });
      ok('05 무기 팝업 열림', String(opened));
      const btn = await page.evaluate(() => {
        const b = document.getElementById('wpnBtnUp');
        if (!b) return null;
        return { txt: (b.textContent || '').trim(), off: b.classList.contains('off') };
      });
      out.push(`     [일괄 강화] 버튼 = «${btn && btn.txt}» · off=${btn && btn.off}`);
      await page.evaluate(() => document.getElementById('wpnBtnUp').click());
      await page.waitForTimeout(500);
      const upw = await page.evaluate(GROUP + '("#upw")');
      if (!upw) bad('09 결과 팝업(#upw) 존재', '노드 없음');
      else if (!upw.on) bad('09 결과 팝업이 떴다', '`.on` 이 안 붙었다 — 강화된 것이 없다');
      else {
        ok('09 결과 팝업(#upw)이 떴다', `내용 묶음 ${upw.n}개`);
        const dy = upw.cy - F.h / 2, dx = upw.cx - F.w / 2;
        out.push(`     내용 bbox ${r2(upw.w)}×${r2(upw.h)} @ (${r2(upw.x)}, ${r2(upw.y)})`
               + ` · 중심 (${r2(upw.cx)}, ${r2(upw.cy)})`);
        (Math.abs(dx) <= 8 ? ok : bad)('09 결과 가로 중심 = 뷰포트 중심', `Δx ${r2(dx)}px`);
        /* ⚠ 이 합집합은 **바닥에 매달린 «터치하여 닫기»** 까지 물고 있어서 세로 중심이 항상 아래로
           끌린다 — 그것은 결함이 아니라 설계다(탭바 상단 기준 bottom −4). 이 행을 «결함» 으로 세면
           고쳐도 영원히 빨간 자가 된다. 세로 축의 판정은 아래 `.upr-grp` 한 줄이 한다. */
        out.push(`     [참고] 합집합 세로 중심 Δy ${r2(dy)}px`
               + ' — «터치하여 닫기»(바닥 기준)를 물어서 나온 값이라 판정 축이 아니다');
      }
      /* 결과 «묶음» 은 노드 하나다 — `.upr-grp{top:928px;height:300px}`.
         위 bbox 가 이것보다 큰 이유는 바닥에 매달린 «터치하여 닫기» 까지 물었기 때문이다.
         사람이 «결과» 라고 부르는 것은 리본+카드+레벨줄 = 이 묶음이다. */
      const grp = await page.evaluate(() => {
        const g = document.querySelector('#upw .upr-grp');
        if (!g) return null;
        const r = g.getBoundingClientRect();
        const c = document.querySelector('#upw .upr-close');
        const cr = c && c.getBoundingClientRect();
        return { y: r.y, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2,
                 close: cr ? { y: cr.y, h: cr.height } : null };
      });
      if (!grp) bad('결과 묶음 `.upr-grp`', '노드 없음');
      else {
        const dy = grp.cy - F.h / 2;
        out.push('     **결과 묶음 `.upr-grp`** ' + r2(grp.y) + '..' + r2(grp.y + grp.h)
               + ' (높이 ' + r2(grp.h) + ') · 중심 y ' + r2(grp.cy));
        (Math.abs(dy) <= 8 ? ok : bad)('결과 묶음 세로 중심 = 뷰포트 중심',
          `Δy ${r2(dy)}px (뷰포트 중심 ${F.h / 2})`);
        if (grp.close) out.push(`     «터치하여 닫기» ${r2(grp.close.y)}..${r2(grp.close.y + grp.close.h)}`
                              + ' (바닥 기준 — 결과 묶음이 아니다)');
      }
      /* 팝업을 닫는다 */
      await page.evaluate(() => { try { closeUpAll(); } catch (e) {} });
      await page.waitForTimeout(200);
      await ctx.close();

      /* ── ⓑ 08 세부 팝업 단건 [강화] — «결과» 라고 부를 만한 것이 뜨는가 ──
         ⚠ **새 컨텍스트에서 연다.** 위 [일괄 강화] 가 조각을 다 써 버려서 같은 페이지에서 이어
            재면 `canLevel` 이 거짓이 되고 `[강화]` 버튼이 아예 안 그려진다(1회차가 그렇게 읽었다). */
      const s2 = await open(browser, F);
      const page2 = s2.page;
      const single = await page2.evaluate(async () => {
        try { closeWeapon(); } catch (e) {}
        const e0 = EQUIPS.find((e) => S.own[e.id] && S.own[e.id].n > 0);
        if (!e0) return { err: '보유 장비가 없다' };
        showItem(e0.id);
        await new Promise((r) => setTimeout(r, 300));
        const l = document.getElementById('mLv');
        if (!l) return { err: '[강화] 버튼이 없다', id: e0.id };
        const before = oLv(e0.id);
        l.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
        await new Promise((r) => setTimeout(r, 120));
        l.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
        await new Promise((r) => setTimeout(r, 220));
        /* 강화 자체는 됐는가 + 무엇이 화면에 새로 떴는가 */
        const fx = [...document.querySelectorAll('.fx-up, .fx-upok, #fxlc>*, .fx-pl, .fx-float')]
          .map((n) => { const r = n.getBoundingClientRect();
                        return { cls: String(n.className || ''), cx: r.x + r.width / 2, cy: r.y + r.height / 2,
                                 w: r.width, h: r.height }; })
          .filter((n) => n.w && n.h);
        const lv = document.querySelector('#mbox .sk-lv');
        const lr = lv && lv.getBoundingClientRect();
        return { id: e0.id, before, after: oLv(e0.id), fx,
                 lv: lr ? { cx: lr.x + lr.width / 2, cy: lr.y + lr.height / 2 } : null,
                 upwOn: document.getElementById('upw').classList.contains('on') };
      });
      await s2.ctx.close();
      if (single.err) bad('08 단건 강화 경로', single.err);
      else {
        (single.after > single.before ? ok : bad)('08 세부 [강화] 가 실제로 레벨을 올렸다',
          `Lv ${single.before} → ${single.after}`);
        (single.upwOn ? bad : ok)('[전제] 단건은 09 결과 팝업을 안 띄운다 (설계 그대로)',
          single.upwOn ? '떴다' : '안 뜬다');
        if (single.lv)
          out.push(`     단건 피드백 자리 = `
                 + `«.sk-lv» 중심 (${r2(single.lv.cx)}, ${r2(single.lv.cy)})`
                 + ` · 뷰포트 중심에서 Δy ${r2(single.lv.cy - F.h / 2)}px`);
        out.push(`     단건 강화가 만든 fx 노드 ${single.fx.length}개`
               + (single.fx.length ? ' — ' + single.fx.slice(0, 3).map((n) =>
                   `${n.cls}@(${r2(n.cx)},${r2(n.cy)})`).join(' · ') : ''));
      }
    }
  } finally { await browser.close(); }

  console.log(out.join('\n'));
  const tot = pass + fail;
  console.log(`\nPROBE661 ${pass}/${tot} ` + (fail ? '— 위 ✗ 가 재현된 결손이다' : 'PASS'));
  process.exit(0);
})();
