#!/usr/bin/env node
/* 작업 754 게이트 — «팝업·오버레이의 앵커/피벗»
 *
 *   node tools/verify754.js   → 마지막 줄이 `VERIFY754 n/n PASS`
 *
 * 주인 지시(2026-09-02 05:45): «대부분의 팝업이 하단앵커로 됐는지 하단 피벗으로 됐는지 해서
 * 옆으로 넓은 화면하면 화면이 존나 이상해짐 … 하단 피벗이나 앵커여서 이상한것들은
 * 중앙 피벗이나 앵커로 해서 쨌든 뭐 해결해».
 * 재현자는 `tools/probe754.js`(전 오버레이 스윕). 이 자는 **판정**만 한다.
 *
 * ── 눈금(394 규약 — 무엇을 재는지 먼저 적는다) ──────────────────────────────
 *   재는 것은 «오버레이 상자» 가 아니라 **콘텐츠 묶음의 bbox 중심**이다.
 *   ⚠ 딤(`#statw`·`#defw`)은 `inset:0` 이라 상자로 재면 **수리 전에도** 언제나 정중앙이다 —
 *     §전제 가 그 헛초록을 못박는다(661 이 같은 함정을 같은 자리에 적어 두었다).
 *   ⚠ 자식 **전체**의 합집합으로도 안 된다 — 바닥에 매달린 «터치하여 닫기»가 중심을 끌어내린다.
 *     그 줄은 754 예외 목록 ①(탭바 기준)이라 묶음에서 빠진다(§5 가 그것을 따로 확인한다).
 *
 * ── 절 ─────────────────────────────────────────────────────────────────────
 *   §전제  자가 헛초록이 아님 — 딤 상자로 재면 수리 전에도 중앙이었다
 *   §1     앵커 일치 — 한 그릇 안의 요소가 프레임 5종에서 **상대 좌표 Δ0**(= 앵커 1종)
 *   §2     중앙 앵커 — 17·18 묶음 중심 = 프레임 중심, 프레임 5종 전부
 *   §3     겹침 0 — 묶음 하변 ↔ «터치하여 닫기» 간극이 5종 전부 양수(수리 전 1600 은 −35)
 *   §4     묶음 **안**의 좌표는 측정표 값 그대로 (앵커만 옮겼지 내부는 안 건드렸다)
 *   §5     예외 목록 — 바닥에 매달린 것은 목록에 적힌 부품뿐
 *   §R     되돌림 — 묶음 앵커를 옛 절대 배치로 되돌리면 §2·§3 이 빨개진다
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

/* 화면비 5종 = 프레임 5종. `fit()` 이 frameH 를 1600..2600 으로 clamp 하므로
   9:13.3 보다 «넓은» 화면은 전부 1600 으로 눌린다 — 레이아웃이 갈리는 축은 frameH 하나다. */
const FRAMES = [
  { id: '9:13.3+', h: 1600 },   /* clamp 하한 — 9:13.3 과 그보다 넓은 화면 전부 */
  { id: 'shortf−', h: 1841 },   /* `.shortf` 경계(1842) 바로 아래 */
  { id: '9:16',    h: 1920 },
  { id: '9:19',    h: 2280 },   /* 기준 해상도 */
  { id: 'clamp↑',  h: 2600 },   /* clamp 상한 */
];
const TOL = 1.5;                /* calc() 반올림 한 겹 */

/* 감사 대상 — 이번 회차가 «한 그릇» 으로 묶은 두 오버레이 */
const CASES = [
  { id: '17', name: '스탯업(능력 획득)', host: '#statw', grp: '.st-grp', close: '.upr-close',
    open: `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})`,
    /* 수리 전 실측(probe754) — 묶음이 프레임 상단에 못 박혀 있었다 */
    was: { top: 793, bottom: 1415, center: 1104, gap1600: -35 } },
  { id: '18', name: '패배화면', host: '#defw', grp: '.df-grp', close: '.upr-close',
    open: `openDefeat()`,
    was: { top: 458, bottom: 1357, center: 907.5, gap1600: 23 } },
];

/* 묶음의 bbox 는 «그릇의 상자» 가 아니라 **보이는 자식들의 합집합**으로 잰다 —
   그릇은 높이 0(426 규약)이라 상자로는 아무것도 안 나온다. */
const MEASURE = `(host, grp, close) => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const fy = (v) => Math.round((v - A.top) * 100) / 100;
  const vis = (e) => { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const H = document.querySelector(host), G = document.querySelector(grp);
  if (!H || !G || !vis(H)) return null;
  const kids = [...G.querySelectorAll('*')].filter(vis);
  if (!kids.length) return null;
  let T = Infinity, B = -Infinity;
  const rel = [];
  const GT = G.getBoundingClientRect().top;
  /* ⚠ 키는 **DOM 순번**이다 — 클래스 이름으로 키를 만들면 «.df-card c1/c2/c3» 셋이 한 키로 뭉쳐
     서로를 덮어써 «Δ360px» 이라는 유령이 나온다(1회차에 실제로 그랬다. LESSONS 335 계열). */
  kids.forEach((e, i) => {
    const r = e.getBoundingClientRect();
    if (r.height < 2 || r.width < 2) return;
    T = Math.min(T, fy(r.top)); B = Math.max(B, fy(r.bottom));
    rel.push([i + ':' + (e.id ? '#' + e.id : '.' + ((e.className || '').toString().trim().split(/\\s+/)[0] || e.tagName)),
              Math.round((r.top - GT) * 100) / 100, Math.round(r.height * 100) / 100]);
  });
  /* ⚠ 닫기 줄은 **호스트 안에서** 찾는다 — «.upr-close» 는 09·17·18 공용이라
     문서 전체에서 첫 번째를 집으면 숨어 있는 09 것이 잡혀 «닫기 줄 없음» 이 된다(1회차 실패). */
  const C = H.querySelector(close);
  const cr = C && vis(C) ? C.getBoundingClientRect() : null;
  const hb = H.getBoundingClientRect();
  return { frameH: Math.round(A.height), top: T, bottom: B, cy: (T + B) / 2,
           hostCy: fy(hb.top) + hb.height / 2,
           close: cr ? { y: fy(cr.top), b: fy(cr.bottom) } : null, rel };
}`;

async function open1(browser, F, css, kase) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: F.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(650);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(`try{ ${kase.open} }catch(e){}`);
  await page.waitForTimeout(380);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  const m = await page.evaluate(`(${MEASURE})(${JSON.stringify(kase.host)},${JSON.stringify(kase.grp)},${JSON.stringify(kase.close)})`);
  return { ctx, page, m };
}

(async () => {
  const browser = await launch(chromium);
  try {
    /* ── §전제 — 딤 상자로 재면 수리 전에도 중앙이다 ───────────────────────── */
    blk('§전제 자가 헛초록이 아님 — 무엇을 재는가');
    {
      const { ctx, m } = await open1(browser, FRAMES[0], null, CASES[0]);
      ok(m && Math.abs(m.hostCy - FRAMES[0].h / 2) < TOL,
        '§전제 딤(`#statw`)은 `inset:0` 이라 **상자로 재면 언제나 중앙**이다',
        m ? `상자 중심 ${r2(m.hostCy)} vs 프레임 중심 ${FRAMES[0].h / 2} — 그래서 묶음으로 잰다` : '측정 실패');
      await ctx.close();
    }

    /* ── §1·§2·§3·§4 ─────────────────────────────────────────────────────── */
    for (const K of CASES) {
      blk(`§1~§4 ${K.id} ${K.name} (${K.host})`);
      const got = [];
      for (const F of FRAMES) {
        const { ctx, m } = await open1(browser, F, null, K);
        got.push({ F, m });
        await ctx.close();
      }
      const bad = got.filter((g) => !g.m);
      ok(!bad.length, `[${K.id}] 프레임 5종 전부 측정됐다`, bad.length ? '실패 ' + bad.map((b) => b.F.id).join(',') : '5/5');
      if (bad.length) continue;

      /* §2 중앙 앵커 */
      for (const g of got) {
        ok(Math.abs(g.m.cy - g.F.h / 2) <= TOL,
          `§2 [${K.id}] ${g.F.id}(${g.F.h}) 묶음 중심 = 프레임 중심`,
          `중심 ${r2(g.m.cy)} vs ${g.F.h / 2} (Δ ${r2(g.m.cy - g.F.h / 2)})`);
      }
      /* §2-b 수리 전에는 «어느 프레임에서나 같은 절대 y» 였다 — 이제는 프레임마다 달라야 한다 */
      const cys = got.map((g) => g.m.cy);
      ok(new Set(cys.map(r2)).size === FRAMES.length,
        `§2 [${K.id}] 묶음 중심이 프레임마다 **다르다**(수리 전에는 ${K.was.center} 에 못 박혀 있었다)`,
        cys.map(r2).join(' · '));

      /* §1 앵커 일치 — 묶음 안 상대 좌표가 프레임 5종에서 Δ0 */
      const base = new Map(got.find((g) => g.F.h === 2280).m.rel.map((r) => [r[0] + '@' + r[2], r[1]]));
      let worst = 0, worstEl = '';
      for (const g of got) {
        for (const [k, y, h] of g.m.rel) {
          const b = base.get(k + '@' + h);
          if (b == null) continue;
          const d = Math.abs(y - b);
          if (d > worst) { worst = d; worstEl = `${k} ${g.F.id}`; }
        }
      }
      ok(worst <= TOL, `§1 [${K.id}] 묶음 **안**의 상대 좌표가 프레임 5종에서 불변 (= 앵커 1종)`,
        `최대 Δ ${r2(worst)}px${worstEl ? ' (' + worstEl + ')' : ''}`);

      /* §3 겹침 0 — 묶음 하변 ↔ «터치하여 닫기» */
      for (const g of got) {
        const gap = g.m.close ? g.m.close.y - g.m.bottom : null;
        ok(gap != null && gap > 0,
          `§3 [${K.id}] ${g.F.id}(${g.F.h}) 묶음 하변 ↔ «터치하여 닫기» 겹침 0`,
          gap == null ? '닫기 줄 없음' : `간극 ${r2(gap)}px` + (g.F.h === 1600 ? ` (수리 전 ${K.was.gap1600}px)` : ''));
      }
    }

    /* ── §4 소스 — 묶음 «안» 의 좌표는 측정표 값 그대로 ────────────────────── */
    blk('§4 묶음 안의 좌표는 측정표 값 그대로 (앵커만 옮겼다)');
    ok(/#statw \.upr-grp\{top:793px/.test(RAW), '§4 17 리본 `top:793px` — ref 877−84 그대로', '있음');
    ok(/\.st-icon\{position:absolute;left:416px;top:1004px/.test(RAW), '§4 17 아이콘 `top:1004px` 그대로', '있음');
    ok(/\.st-desc\{position:absolute;left:0;right:0;top:1345px/.test(RAW), '§4 17 문구 `top:1345px` 그대로', '있음');
    ok(/\.df-emb\{position:absolute;left:429px;top:458px/.test(RAW), '§4 18 해골 `top:458px` 그대로', '있음');
    ok(/\.st-grp\{position:absolute;left:0;right:0;top:calc\(50% - 1104px\);height:0\}/.test(RAW),
      '§4 17 묶음 = **높이 0** 좌표계 원점 (426 규약 — 빈 면 클릭을 안 먹는다)', 'height:0');
    ok(/\.df-grp\{position:absolute;left:0;right:0;top:calc\(50% - 907\.5px\);height:0\}/.test(RAW),
      '§4 18 묶음 = 높이 0 좌표계 원점', 'height:0');
    ok(!/\.st-grp\{[^}]*z-index/.test(RAW) && !/\.df-grp\{[^}]*z-index/.test(RAW),
      '§4 묶음에 `z-index` 를 안 걸었다 (새 쌓임 맥락이 자식 z 를 가둔다 — 426 ⚠)', 'z-index 0건');
    ok(!/\.st-grp\{[^}]*transform/.test(RAW) && !/\.df-grp\{[^}]*transform/.test(RAW),
      '§4 묶음에 `transform` 을 안 걸었다 (60 쥬시 등장 연출과 자리를 안 다툰다 — 661 ⚠)', 'transform 0건');

    /* ── §5 예외 목록 ────────────────────────────────────────────────────── */
    blk('§5 예외 목록 — 바닥에 매달린 것은 목록에 적힌 부품뿐');
    ok(/\.upr-close\{position:absolute;left:0;right:0;bottom:175px/.test(RAW),
      '§5 «터치하여 닫기» 는 탭바 기준 하단 앵커 그대로 (예외 ① — 09·17·18 공용)', 'bottom:175px');
    const exempt = ['.upr-close', '.sm-close', '#psBar'];
    ok(/const EXEMPT = \[/.test(fs.readFileSync(path.join(ROOT, 'tools', 'probe754.js'), 'utf8')),
      '§5 예외 목록이 재현기 안에 **글로 적혀** 있다 (늘릴 때 사유를 같이 적는 자리)', exempt.join(' · '));
    /* 이번 회차가 묶은 두 화면에는 목록 밖 하단 앵커가 없어야 한다 */
    const stBlk = (RAW.match(/#statw\{[\s\S]*?\n  #defw\{/) || [''])[0];
    const botsInStat = (stBlk.match(/\.(st|upr)-[a-z-]+\{[^}]*bottom:/g) || []).filter((s) => !/upr-close/.test(s));
    ok(botsInStat.length === 0, '§5 17 묶음 안에 목록 밖 하단 앵커 0건', botsInStat.join(' ') || '0건');

    /* ── §R 되돌림 ───────────────────────────────────────────────────────── */
    blk('§R 되돌림 — 옛 절대 배치를 도로 심으면 §2·§3 이 빨개진다');
    for (const K of CASES) {
      const revert = `${K.grp}{top:0!important}`;   /* 묶음을 프레임 상단에 도로 못 박는다 */
      const F = FRAMES[0];                          /* 1600 — 주인이 본 «넓은 화면» */
      const { ctx, m } = await open1(browser, F, revert, K);
      const cyBad = m ? Math.abs(m.cy - F.h / 2) > TOL : false;
      const gap = m && m.close ? m.close.y - m.bottom : null;
      ok(cyBad, `[R] ${K.id} 옛 절대 배치 사본은 §2 를 못 지킨다`,
        m ? `중심 ${r2(m.cy)} vs ${F.h / 2} (Δ ${r2(m.cy - F.h / 2)})` : '측정 실패');
      ok(gap != null && gap <= K.was.gap1600 + TOL,
        `[R] ${K.id} 그 사본은 1600 에서 간극이 수리 전 값으로 돌아간다`,
        gap == null ? '측정 실패' : `간극 ${r2(gap)}px (수리 전 ${K.was.gap1600}px)`);
      await ctx.close();
    }
  } finally { await browser.close(); }

  const tot = pass + fail;
  console.log(`\nVERIFY754 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
