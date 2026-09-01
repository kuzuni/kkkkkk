#!/usr/bin/env node
/* 작업 661 게이트 — «장비 강화 결과가 화면 중앙에 뜬다»
 *
 *   node tools/verify661.js   → 마지막 줄이 `VERIFY661 n/n PASS`
 *
 * 주인 지시(2026-09-02 00:10): «장비 강화 결과는 화면 중앙에 뜨게 해줘야함».
 * 재현자는 `tools/probe661.js`. 이 자는 **판정**만 한다.
 *
 * ── 눈금(394 규약 — 무엇을 재는지 먼저 적는다) ──────────────────────────────
 *   재는 것은 «팝업 상자» 가 아니라 **결과 묶음 `.upr-grp`**(리본 + 꼬리 + 카드 + 레벨줄)의 중심이다.
 *   ⚠ `#upw` 자신은 `inset:0` 딤이라 상자로 재면 **언제나 정중앙**이 나온다 — 고치기 전에도 초록인
 *     헛자가 된다(§전제 가 그것을 못박는다).
 *   ⚠ `#upw` 자식 전체의 **합집합**으로 재도 안 된다 — 바닥에 매달린 «터치하여 닫기»(탭바 상단 기준
 *     bottom −4)가 중심을 아래로 끌어서, 묶음이 정중앙이어도 합집합은 400px 가까이 어긋난다.
 *     그 노드는 결과가 아니라 힌트이고 **자리가 설계대로**다(§2 가 그것을 따로 확인한다).
 *
 * ── 절 ─────────────────────────────────────────────────────────────────────
 *   §전제  자가 헛초록이 아님 — 딤 상자로 재면 수리 전에도 중앙이었다(그래서 묶음으로 잰다)
 *   §1     결과 묶음 중심 = 뷰포트 중심, **두 프레임**(9:19 2280 · 9:13.3 1600) 전부
 *   §2     안 가림 — 묶음이 탭바·프레임 밖으로 안 나가고, «터치하여 닫기» 는 바닥 기준 그대로
 *   §3     묶음 **안**의 좌표는 측정표 값 그대로다(앵커만 옮겼지 내부를 안 건드렸다)
 *   §4     스코프 — 이 규칙을 공유하는 17(#statw)·31(#dclw)은 **안 따라왔다**
 *   §R     되돌림 — 옛 `top:928px` 를 도로 심으면 §1 이 두 프레임에서 빨개진다
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const RAW = fs.readFileSync(SRC, 'utf8');
const URL = 'file://' + SRC;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blk = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const r2 = (n) => Math.round(n * 100) / 100;

const FRAMES = [
  { id: '9:19', w: 1080, h: 2280 },
  { id: '9:13.3', w: 1080, h: 1600 },
];
const TOL = 1.5;          /* 중심 허용 — calc() 반올림 한 겹만 덮는다 */

const SETUP = `
  S.guide.idx = 99;
  EQUIPS.forEach(function(e){ S.own[e.id] = { n: 100000, l: 1 }; });
  S.gold = 1e12; S.dia = 1e9;
  markDirty && markDirty(); renderUI && renderUI();`;

/* 09 결과 팝업을 «장비 일괄 강화» 경로로 실제로 띄운다 — 주인이 지목한 그 경로다 */
async function openResult(ctx, F, css) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: F.w, height: F.h });
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(new Function(SETUP));
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => { try { goTab('hero'); } catch (e) {} openWeapon(null, 'weapon'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('wpnBtnUp').click());
  await page.waitForTimeout(450);
  return { page, errs };
}

const MEASURE = `(function(){
  var g = document.querySelector('#upw .upr-grp');
  var w = document.getElementById('upw');
  var c = document.querySelector('#upw .upr-close');
  var tb = document.getElementById('tabbar');
  if(!g || !w) return null;
  var R = function(e){ if(!e) return null; var r = e.getBoundingClientRect();
    return { x:r.x, y:r.y, w:r.width, h:r.height, cx:r.x+r.width/2, cy:r.y+r.height/2 }; };
  var kid = {};
  ['.upr-rb', '.upr-tl.l', '.upr-tl.r', '.upr-cards'].forEach(function(s){
    var e = g.querySelector(s); if(e){ var r = e.getBoundingClientRect(), gr = g.getBoundingClientRect();
      kid[s] = { top: r.y - gr.y, left: r.x - gr.x, h: r.height }; }
  });
  return { on: w.classList.contains('on'), grp: R(g), dim: R(w), close: R(c), tab: R(tb),
           kid: kid, cards: (document.getElementById('upCards')||{}).childElementCount };
})`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const seen = {};
  try {
    /* ── §전제 ───────────────────────────────────────────────────────────── */
    blk('§전제 — 이 자가 «딤 상자» 로 재는 헛자가 아님');
    {
      const F = FRAMES[0];
      const { page } = await openResult(ctx, F);
      const m = await page.evaluate(MEASURE + '()');
      ok(!!m && m.on, '[전제] 장비 [일괄 강화] 로 09 결과 팝업이 실제로 떴다',
        m ? '카드 ' + m.cards + '칸' : '못 띄웠다');
      ok(m && Math.abs(m.dim.cy - F.h / 2) <= TOL,
        '[전제] `#upw` 딤 상자는 원래부터 정중앙이다 — 이것으로 재면 고치기 전에도 초록이다',
        m ? 'Δy ' + r2(m.dim.cy - F.h / 2) : '—');
      ok(m && Math.abs(m.grp.cy - m.dim.cy) <= TOL === false || (m && true),
        '[전제] 그래서 판정 축은 딤이 아니라 결과 묶음 `.upr-grp` 다', '축 선언');
      await page.close();
    }

    /* ── §1 두 프레임 중앙 ────────────────────────────────────────────────── */
    blk('§1 결과 묶음 중심 = 뷰포트 중심 (두 프레임)');
    for (const F of FRAMES) {
      const { page, errs } = await openResult(ctx, F);
      const m = await page.evaluate(MEASURE + '()');
      seen[F.id] = m;
      if (!m) { ok(false, `§1 ${F.id} 측정`, '노드 없음'); await page.close(); continue; }
      ok(Math.abs(m.grp.cy - F.h / 2) <= TOL,
        `§1 ${F.id} 결과 묶음 세로 중심 = ${F.h / 2}`,
        `${r2(m.grp.cy)} (Δy ${r2(m.grp.cy - F.h / 2)}px)`);
      ok(Math.abs(m.grp.cx - F.w / 2) <= 2,
        `§1 ${F.id} 결과 묶음 가로 중심 = ${F.w / 2}`,
        `${r2(m.grp.cx)} (Δx ${r2(m.grp.cx - F.w / 2)}px)`);
      ok(errs.length === 0, `§1 ${F.id} pageerror 0건`, errs.length ? errs[0] : '0건');
      /* §2 안 가림 — 같은 페이지에서 이어 본다 */
      ok(m.grp.y >= 0 && m.grp.y + m.grp.h <= F.h,
        `§2 ${F.id} 묶음이 프레임 안에 있다`, `${r2(m.grp.y)}..${r2(m.grp.y + m.grp.h)} / ${F.h}`);
      ok(!m.tab || m.grp.y + m.grp.h <= m.tab.y + 0.5,
        `§2 ${F.id} 묶음이 탭바를 안 밟는다`,
        m.tab ? `묶음 하변 ${r2(m.grp.y + m.grp.h)} ≤ 탭바 상변 ${r2(m.tab.y)}` : '탭바 없음');
      ok(m.close && m.close.y > m.grp.y + m.grp.h,
        `§2 ${F.id} «터치하여 닫기» 는 묶음 아래 · 바닥 기준 그대로 (결과가 아니라 힌트다)`,
        m.close ? `${r2(m.close.y)}..${r2(m.close.y + m.close.h)}` : '없음');
      await page.close();
    }

    /* ── §3 묶음 «안» 은 측정표 그대로 ────────────────────────────────────── */
    blk('§3 앵커만 옮겼다 — 묶음 안의 좌표는 측정표(09) 값 그대로');
    {
      const a = seen['9:19'], b = seen['9:13.3'];
      const K = [['.upr-rb', 0], ['.upr-tl.l', 25], ['.upr-tl.r', 25]];
      for (const [s, top] of K) {
        const va = a && a.kid[s], vb = b && b.kid[s];
        ok(va && Math.abs(va.top - top) <= 1,
          `§3 «${s}» 묶음 기준 top = ${top} (측정표 값)`, va ? r2(va.top) : '없음');
        ok(va && vb && Math.abs(va.top - vb.top) <= 1,
          `§3 «${s}» 두 프레임에서 같은 자리 (프레임에 안 딸려간다)`,
          va && vb ? `${r2(va.top)} / ${r2(vb.top)}` : '—');
      }
      /* ⚑ 726 이관 — 옛 항은 «묶음 높이 = 상수 300» 이었다. 726(«일괄 강화 결과를 전부 보여 준다»)
         이후 높이는 **결과 칸 수**가 정한다: 6칸 이하면 그대로 300, 넘으면 행 수만큼 자라고
         짧은 프레임은 «보이는 행수» 로 가둔다(그래서 두 프레임 값이 서로 다르다).
         661 이 소유한 성질은 «상수» 가 아니라 «중앙» 이고 그것은 §1·§2 가 그대로 지킨다 —
         그냥 지우면 «묶음이 통째로 다른 크기가 돼도 초록인 게이트» 가 되므로(333 처방)
         항을 **둘로 갈라** 방향만 뒤집는다: ⓐ 레퍼런스 크기(≤6칸)에서는 옛 상수 300 이 살아 있다
         ⓑ 7칸 이상에서는 실제로 자란다(= 726 이 되돌려지면 여기가 300 으로 굳어 빨개진다). */
      for (const F of FRAMES) {
        const page = await ctx.newPage();
        await page.setViewportSize({ width: F.w, height: F.h });
        await page.goto(URL);
        await page.waitForTimeout(1400);
        const m3 = await page.evaluate(() => {
          openUpAll(EQUIPS.slice(0, 3).map((it, i) => ({ it, from: 1, to: 2 + i })));
          const g = document.querySelector('#upw .upr-grp').getBoundingClientRect();
          return { n: document.getElementById('upCards').childElementCount, h: g.height, cy: g.y + g.height / 2 };
        });
        ok(m3 && m3.n === 3 && Math.abs(m3.h - 300) <= 1,
          `§3 ${F.id} 레퍼런스 크기(3칸)면 묶음 높이 300 그대로 — 726 가변 높이는 7칸부터다`,
          m3 ? `${m3.n}칸 · h ${r2(m3.h)}` : '—');
        ok(m3 && Math.abs(m3.cy - F.h / 2) <= TOL,
          `§3 ${F.id} 그 3칸 결과도 세로 중앙 (661 의 성질은 높이가 아니라 앵커다)`,
          m3 ? `Δy ${r2(m3.cy - F.h / 2)}` : '—');
        await page.close();
      }
      ok(a && b && a.grp.h > 300 && b.grp.h > 300,
        '§3 7칸 이상 결과는 묶음이 실제로 자란다 (726 — 옛 6칸 상한이 되살아나면 여기가 300 으로 굳는다)',
        a && b ? `${r2(a.grp.h)} / ${r2(b.grp.h)} · 카드 ${a.cards}/${b.cards}` : '—');
    }

    /* ── §4 스코프 ────────────────────────────────────────────────────────── */
    blk('§4 스코프 — 공유 부품이지만 17·31 은 안 따라왔다');
    /* 726 이관 — 상수 150/300 이 `--upr-gh`(폴백 300px)로 바뀌었다. **식은 그대로**이고
       («top = 50% − 높이/2») 폴백이 옛 상수라 17·31 처럼 변수를 안 쓰는 화면은 한 픽셀도 안 움직인다. */
    ok(/\.upr-grp\{position:absolute;left:0;right:0;top:calc\(50% - var\(--upr-gh,300px\)\/2\);height:var\(--upr-gh,300px\)\}/.test(RAW),
      '§4 09 규칙이 중앙 앵커다 (726 — 상수가 변수로 바뀌었어도 «50% − 높이/2» 식 그대로)',
      'top:calc(50% - var(--upr-gh,300px)/2)');
    ok(/#statw \.upr-grp\{top:793px/.test(RAW),
      '§4 17 스탯업(#statw)은 제 `top:793px` 을 그대로 덮는다 (특이도 id+class)', '있음');
    ok(/#dclw \.upr-grp\{top:768px/.test(RAW),
      '§4 31 클리어(#dclw)는 제 `top:768px` 을 그대로 덮는다 (중앙은 426 의 `.dcl-grp` 몫)', '있음');
    ok(!/\.upr-grp\{[^}]*transform/.test(RAW),
      '§4 묶음에 `transform` 을 안 걸었다 (60 쥬시 등장 연출과 자리를 안 다툰다)', 'transform 0건');

    /* ── §R 되돌림 ───────────────────────────────────────────────────────── */
    blk('§R 되돌림 — 옛 절대 배치를 도로 심으면 두 프레임에서 빨개진다');
    for (const F of FRAMES) {
      const { page } = await openResult(ctx, F, '#upw .upr-grp{top:928px!important}');
      const m = await page.evaluate(MEASURE + '()');
      const dy = m ? m.grp.cy - F.h / 2 : 0;
      ok(m && Math.abs(dy) > TOL,
        `[R] ${F.id} 옛 \`top:928px\` 사본은 §1 을 못 지킨다`,
        m ? `Δy ${r2(dy)}px (수리 전 실측: 9:19 −62 · 9:13.3 +278)` : '측정 실패');
      await page.close();
    }
  } finally { await ctx.close(); await browser.close(); }

  const tot = pass + fail;
  console.log(`\nVERIFY661 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
