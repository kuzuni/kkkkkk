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

/* ⚑ 912 — «열렸는가» 를 묻는 술어. MEASURE 가 null 을 내는 조건과 **같은 식**이어야 한다
   (다르면 «기다림은 통과했는데 측정은 null» 이라는 새 유령이 생긴다). */
const OPENED = ([host, grp]) => {
  const vis = (e) => { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const H = document.querySelector(host), G = document.querySelector(grp);
  if (!H || !G || !vis(H)) return false;
  return [...G.querySelectorAll('*')].some(vis);
};

async function open1(browser, F, css, kase) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: F.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  /* 912 — 삼킨 예외를 되살린다. 실패가 «측정 실패» 한 줄로만 남던 것이 이 자의 결함이었다. */
  const cerr = [];
  page.on('pageerror', (e) => cerr.push(String(e.message).split('\n')[0].slice(0, 90)));
  await page.goto(URL, { waitUntil: 'load' });
  /* ⚑ 912 — 고정 `waitForTimeout(650)` 이 아니라 **트리거가 준비됐는지**를 묻는다.
     650ms 는 한가한 기계에서 고른 수라 회귀 스윕처럼 브라우저가 여럿 뜬 실행에서는
     근거가 없다(등재문 처방 ⓐ). 준비되면 즉시 지나가므로 평시에는 오히려 빨라진다. */
  const fnName = String(kase.open).split('(')[0].trim();
  await page.waitForFunction((n) => typeof window[n] === 'function', fnName, { timeout: 20000 })
    .catch(() => {});
  if (css) await page.addStyleTag({ content: css });
  /* 912 — `catch(e){}` 로 삼키지 않는다. 던진 것은 갈래 ⓐ 의 증거다. */
  let threw = '';
  try { await page.evaluate(kase.open); } catch (e) { threw = String(e.message).split('\n')[0].slice(0, 90); }
  /* ⚑ 912 — 트리거 뒤에도 «떴는가» 를 묻는다. 아래 380ms 는 **정착**(jzBoxIn 오버슛)용이지
     «열림»용이 아니었는데, 열림까지 그 한 줄에 기대고 있었다. */
  const opened = await page.waitForFunction(OPENED, [kase.host, kase.grp], { timeout: 10000 })
    .then(() => true).catch(() => false);
  await page.waitForTimeout(380);
  /* 8회차 — **이 자가 4번에 1번 빨갰다**(§2 «묶음 중심 = 프레임 중심» 이 17@2600 Δ6.25 · 18@1920 Δ4.74,
     TOL 1.5 초과). 뿌리는 제품이 아니라 **이 대기 한 줄**이다: 묶음은 열릴 때 `jzBoxIn`(220ms)을 타고
     그 곡선이 **오버슛했다가 되돌아온다** — 대기를 60/150/250/380ms 로 쪼개 재니 중심이
     −88.32 → −77.36 → **+20.62** → 0.00 (17@2600) · −72.60 → −15.91 → **+11.37** → 0.00 (18@1920) 이었다.
     380ms 는 정착점(≈250~380ms) 바로 뒤라 여유가 130ms 뿐이고, 컨텍스트 10개를 잇달아 띄우는 이 자의
     부하에서는 애니가 그만큼 밀려 **정착 전에 재는 실행**이 나온다.
     ⇒ 시각이 아니라 **애니가 끝났는지**를 묻는다(무한 반복은 빼야 한다 — 배경 반짝임이 영영 안 끝난다).
     되돌리는 법: 이 블록을 지우면 4번에 1번꼴로 §2 가 빨개진다. */
  await page.evaluate(async (grp) => {
    const g = document.querySelector(grp);
    if (!g) return;
    const as = (g.getAnimations ? g.getAnimations({ subtree: true }) : [])
      .filter((a) => { const t = (a.effect && a.effect.getTiming) ? a.effect.getTiming() : {}; return t.iterations !== Infinity; });
    await Promise.all(as.map((a) => a.finished.catch(() => {})));
  }, kase.grp);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  const m = await page.evaluate(`(${MEASURE})(${JSON.stringify(kase.host)},${JSON.stringify(kase.grp)},${JSON.stringify(kase.close)})`);
  /* ⚑ 912 — null 이면 **왜** 인지까지 들고 나온다. 세 갈래가 «측정 실패» 한 낱말로 뭉쳐 있던 것이
     이 자를 못 고치게 만들던 것이다(probe912 의 갈래와 같은 이름을 쓴다). */
  let why = '';
  if (!m) {
    const d = await page.evaluate(([host, grp]) => {
      const H = document.querySelector(host), G = document.querySelector(grp);
      const cs = H ? getComputedStyle(H) : null;
      const vis = (e) => { const c = getComputedStyle(e);
        if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) === 0) return false;
        const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
      return { host: !!H, grp: !!G, hostVis: H ? vis(H) : false, disp: cs ? cs.display : '',
               kidsVis: G ? [...G.querySelectorAll('*')].filter(vis).length : -1 };
    }, [kase.host, kase.grp]).catch(() => null);
    why = !d ? '진단 evaluate 실패'
      : threw ? `ⓐ 트리거가 던졌다 «${threw}»`
      : !d.host || !d.grp ? `ⓑ 노드 없음(host ${d.host} · grp ${d.grp})`
      : !d.hostVis ? `ⓑ 호스트가 안 떴다(display:${d.disp} · 열림대기 ${opened ? '통과' : '시간초과'})`
      : `ⓒ 떴는데 «보이는 자식» 0(열림대기 ${opened ? '통과' : '시간초과'})`;
    if (cerr.length) why += ` · 콘솔«${cerr[0]}»`;
  }
  return { ctx, page, m, why };
}

/* ⚑ 912 — 측정이 null 이면 **다시 찍는다**(등재문 처방 ⓐ의 짝). 한 번의 헛읽음으로
   §1~§4 열두 항이 통째로 안 세어지던 것(총항 60 → 48)이 이 자의 두 번째 결함이다 —
   총항이 실행마다 갈리면 «전과 같은 자인가» 를 물을 수 없다.
   ⚠ 무르게 푸는 길이 아니다: 재시도해도 안 뜨면 **이유를 말하며** 그대로 빨개진다. */
async function openRetry(browser, F, css, kase, tries = 3) {
  let last = null;
  for (let t = 1; t <= tries; t++) {
    const r = await open1(browser, F, css, kase);
    if (r.m) { if (t > 1) r.why = `${t}판째에 읽힘`; return r; }
    await r.ctx.close();
    last = r;
  }
  return { ctx: null, page: null, m: null, why: `${tries}판 모두 실패 — ${last ? last.why : ''}` };
}

(async () => {
  const browser = await launch(chromium);
  try {
    /* ── §전제 — 딤 상자로 재면 수리 전에도 중앙이다 ───────────────────────── */
    blk('§전제 자가 헛초록이 아님 — 무엇을 재는가');
    {
      const { ctx, m, why } = await openRetry(browser, FRAMES[0], null, CASES[0]);
      ok(m && Math.abs(m.hostCy - FRAMES[0].h / 2) < TOL,
        '§전제 딤(`#statw`)은 `inset:0` 이라 **상자로 재면 언제나 중앙**이다',
        m ? `상자 중심 ${r2(m.hostCy)} vs 프레임 중심 ${FRAMES[0].h / 2} — 그래서 묶음으로 잰다` : '측정 실패 — ' + why);
      if (ctx) await ctx.close();
    }

    /* ── §1·§2·§3·§4 ─────────────────────────────────────────────────────── */
    for (const K of CASES) {
      blk(`§1~§4 ${K.id} ${K.name} (${K.host})`);
      const got = [];
      for (const F of FRAMES) {
        const { ctx, m, why } = await openRetry(browser, F, null, K);
        got.push({ F, m, why });
        if (ctx) await ctx.close();
      }
      const bad = got.filter((g) => !g.m);
      /* 912 — 실패하면 **어느 프레임이 왜** 인지까지 적는다. 재시도로 읽힌 판도 밝힌다. */
      const retried = got.filter((g) => g.m && g.why).map((g) => `${g.F.id} ${g.why}`);
      ok(!bad.length, `[${K.id}] 프레임 5종 전부 측정됐다`,
        bad.length ? '실패 ' + bad.map((b) => `${b.F.id} — ${b.why}`).join(' / ')
                   : '5/5' + (retried.length ? ' (' + retried.join(' · ') + ')' : ''));
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
    const PRB = fs.readFileSync(path.join(ROOT, 'tools', 'probe754.js'), 'utf8');
    const EXBLK = (PRB.match(/const EXEMPT = \[([\s\S]*?)\n\];/) || ['', ''])[1];
    const exempt = [...EXBLK.matchAll(/\{ sel: '([^']+)'/g)].map((m) => m[1]);
    ok(/const EXEMPT = \[/.test(PRB) && exempt.length > 0,
      '§5 예외 목록이 재현기 안에 **글로 적혀** 있다 (늘릴 때 사유를 같이 적는 자리)', exempt.join(' · '));
    /* ⚑ 3회차 — 목록은 **자라는 자리**다. 그래서 «몇 개인가» 가 아니라 «전부 사유가 붙어 있나» 를 묻는다.
       재현기 머리말이 «적을 말이 없으면 그것은 예외가 아니라 아직 안 고친 자리다» 라고 못박고 있는데
       그 문장을 지키는 자가 없었다 — 사유 없는 한 줄이 조용히 늘면 이 게이트는 «전부 예외» 로 초록이 된다. */
    const whys = [...EXBLK.matchAll(/\{ sel: '[^']+',\s*why: '([^']{10,})'/g)].map((m) => m[1]);
    ok(whys.length === exempt.length,
      '§5 예외 항 전부에 **사유(why)** 가 붙어 있다 (사유 없는 예외 = 아직 안 고친 자리)',
      `${whys.length}/${exempt.length} 항`);
    /* 이번 회차가 묶은 두 화면에는 목록 밖 하단 앵커가 없어야 한다 */
    const stBlk = (RAW.match(/#statw\{[\s\S]*?\n  #defw\{/) || [''])[0];
    const botsInStat = (stBlk.match(/\.(st|upr)-[a-z-]+\{[^}]*bottom:/g) || []).filter((s) => !/upr-close/.test(s));
    ok(botsInStat.length === 0, '§5 17 묶음 안에 목록 밖 하단 앵커 0건', botsInStat.join(' ') || '0건');

    /* ⚑ 3회차 신설 — 이번 회차가 목록에 **더한** `.sv-hint`(56 절전 «밀어서 잠금 해제») 의
       근거를 자가 직접 잰다. 예외를 «목록에 적었으니 통과» 로 두면 그 근거를 누가 지워도 초록이다.
       근거는 두 겹이고 둘 다 351 6회차가 심은 것이다 —
         ⓐ 클램프가 CSS 에 살아 있는가(`bottom:min(195px, 100% − 1561px)`)
         ⓑ 그 덕에 **가장 넓은 화면(1600)** 에서도 통계 패널과 안 겹치는가.
       ⚠ 재현기는 이 쌍을 «간극붕괴» 로 읽었었다(1600:30 ↔ 2600:874 = 최댓값의 3.4%). 30 은
         무너진 값이 아니라 351 이 고른 여백이고, 그 차이를 가르는 것이 바로 아래 두 항이다. */
    ok(/#svw \.sv-hint\{position:absolute;left:0;right:0;bottom:min\(var\(--hnb,195px\), ?calc\(100% - 1561px\)\)/.test(RAW),
      '§5 `.sv-hint` 예외 근거 ⓐ — 351 클램프가 살아 있다', 'bottom:min(195px, 100%−1561px)');
    {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(650);
      await page.evaluate(`try{ openSaver() }catch(e){}`);
      await page.waitForTimeout(380);
      const sv = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const P = q('#svw .sv-p'), H = q('#svw .sv-hint');
        if (!P || !H) return null;
        const pb = P.getBoundingClientRect().bottom, ht = H.getBoundingClientRect().top;
        return { gap: Math.round((ht - pb) * 100) / 100 };
      });
      ok(sv && sv.gap > 0, '§5 `.sv-hint` 예외 근거 ⓑ — 1600 에서 통계 패널과 겹침 0 (클램프가 만든 바닥 여백)',
        sv ? `간극 ${sv.gap}px` : '측정 실패');
      await ctx.close();
    }

    /* ── §6 19 프로필 · 20 종합스탯 (3회차 신설) ───────────────────────────
       ⚑ **자가 «무해» 로 읽던 자리다.** 재현기는 «담는 상자 «안»의 자식들» 을 재는데 19·20 은
       자식은 상자에 잘 매달려 있고 **상자 자신이 프레임 상단에 못 박혀** 있었다 —
       즉 자의 구멍은 «그릇 자체의 앵커를 아무도 안 묻는다» 였다(비평가 CB·CC 2인 독립 일치).
       수리 전 실측: 상자 중심 − 프레임 중심 = +71 / +141.5 / +169 / −11 / −171 ⇒ **340px 스윙**.
       (2280 에서만 −11 이라 기준 프레임만 보면 «중앙» 으로 보였다 — 705 가 두 탭을 통일한 자리라
        더 그럴듯했다.) 이 절은 그래서 **그릇의 중심**을 프레임 5종에서 직접 잰다. */
    blk('§6 19 프로필 · 20 종합스탯 — 그릇 **자신**이 중앙 앵커 (3회차 신설)');
    {
      const REF_OFF = -11;            /* 측정표 — 상자 중심은 프레임 중심에서 11px 위 */
      const seen = [];
      for (const K of [{ id: '19', open: 'openProfile()', sel: '.pf' },
                       { id: '20', open: 'openSpec()',    sel: '.spc' }]) {
        const offs = [];
        for (const F of FRAMES) {
          const ctx = await browser.newContext({ viewport: { width: 1080, height: F.h }, deviceScaleFactor: 1 });
          const page = await ctx.newPage();
          await page.goto(URL, { waitUntil: 'load' });
          await page.waitForTimeout(650);
          await page.evaluate(`try{ ${K.open} }catch(e){}`);
          /* ⚠ **고정 대기 뒤 rect 를 재지 마라**(291 규약 · LESSONS 30-②). 20 은 열릴 때 60 쥬시의
             `jzBoxIn` 이 돌아서 350ms 에 재면 2600 에서 top 590.1 이 나오고 700ms 면 591 로 앉는다 —
             그 3.65px 때문에 «19 와 20 이 다른 자리» 라는 유령이 이 자에 한 번 잡혔다. 연출이 끝날
             때까지 기다린 뒤에 잰다(상한 2.5초 — 안 끝나면 그대로 재고 값으로 말하게 둔다). */
          await page.waitForFunction((s) => {
            const e = document.querySelector(s);
            return !!e && getComputedStyle(e).animationName === 'none';
          }, K.sel, { timeout: 2500 }).catch(() => {});
          await page.waitForTimeout(120);
          const m = await page.evaluate((s) => {
            const a = document.getElementById('app').getBoundingClientRect();
            const e = document.querySelector(s);
            if (!e) return null;
            const q = e.getBoundingClientRect();
            return { off: Math.round(((q.top + q.bottom) / 2 - a.top - a.height / 2) * 100) / 100,
                     top: Math.round((q.top - a.top) * 100) / 100 };
          }, K.sel);
          offs.push({ F, m });
          await ctx.close();
        }
        const bad = offs.filter((o) => !o.m || Math.abs(o.m.off - REF_OFF) > TOL);
        ok(bad.length === 0, `§6 ${K.id} \`${K.sel}\` 중심이 프레임 5종 전부 중심 −11px (수리 전 +169 … −171 = 340px 스윙)`,
          offs.map((o) => `${o.F.h}:${o.m ? o.m.off : 'x'}`).join(' '));
        const at2280 = offs.find((o) => o.F.h === 2280);
        ok(at2280 && Math.abs(at2280.m.top - 431) <= TOL,
          `§6 ${K.id} 기준 프레임(2280)은 **Δ0px** — 레퍼런스 자리를 안 옮겼다`, at2280 ? `top ${at2280.m.top}` : 'x');
        seen.push(offs.map((o) => o.m && o.m.top).join(','));
      }
      /* 705 규약 — 두 탭은 «선언 한 벌» 을 읽는다. 갈라지면 «프로필로 자꾸 클릭하면 위치가 바뀜» 이 돌아온다. */
      ok(seen[0] === seen[1], '§6 19·20 이 프레임 5종에서 **같은 자리** (705 «선언 한 벌» 규약)',
        seen[0] === seen[1] ? seen[0] : `19[${seen[0]}] ≠ 20[${seen[1]}]`);
      ok(/\.pf, \.spc\{[^}]*top:calc\(50% - 709px \+ var\(--pfsh\) \/ 2\)/.test(RAW),
        '§6 선언이 **한 줄**이다 (값을 어느 한쪽에 다시 적으면 상수 두 벌이 갈린다 — 705 ⚠)', 'top:calc(50% − 709px + --pfsh/2)');
      /* ⚠ 이 항은 **RAW 전체로 물으면 안 된다** — 바로 위 주석이 옛 값을 «무엇이 틀렸었나» 로
         인용하고 있어서 파일 전체를 훑으면 제 주석에 걸려 영영 빨갛다(지시서 [4] §4 가 «기록에
         표시 문자열을 적을 때» 로 경고하는 자리와 같은 함정이다). 물어야 하는 것은 **규칙 안**이다. */
      const PFRULE = (RAW.match(/\.pf, \.spc\{[^}]*\}/) || [''])[0];
      ok(PFRULE.length > 0 && !/top:clamp\(223px, ?431px/.test(PFRULE),
        '§6 옛 상단 앵커(`clamp(223px, 431px, frameh − 1477px)`) 가 **규칙 안에** 없다', '0건');
    }

    /* ── §R 되돌림 ───────────────────────────────────────────────────────── */
    blk('§R 되돌림 — 옛 절대 배치를 도로 심으면 §2·§3 이 빨개진다');
    for (const K of CASES) {
      const revert = `${K.grp}{top:0!important}`;   /* 묶음을 프레임 상단에 도로 못 박는다 */
      const F = FRAMES[0];                          /* 1600 — 주인이 본 «넓은 화면» */
      const { ctx, m, why } = await openRetry(browser, F, revert, K);
      const cyBad = m ? Math.abs(m.cy - F.h / 2) > TOL : false;
      const gap = m && m.close ? m.close.y - m.bottom : null;
      ok(cyBad, `[R] ${K.id} 옛 절대 배치 사본은 §2 를 못 지킨다`,
        m ? `중심 ${r2(m.cy)} vs ${F.h / 2} (Δ ${r2(m.cy - F.h / 2)})` : '측정 실패 — ' + why);
      ok(gap != null && gap <= K.was.gap1600 + TOL,
        `[R] ${K.id} 그 사본은 1600 에서 간극이 수리 전 값으로 돌아간다`,
        gap == null ? '측정 실패 — ' + why : `간극 ${r2(gap)}px (수리 전 ${K.was.gap1600}px)`);
      if (ctx) await ctx.close();
    }
    /* §6 의 되돌림 — 옛 상단 앵커를 도로 심으면 «340px 스윙» 이 그대로 돌아온다.
       무르게 푼 수리가 아님을 이 두 항이 못박는다(1920 은 위로, 2600 은 아래로 갈린다). */
    {
      const revert = `.pf, .spc{top:clamp(223px, 431px, calc(var(--frameh, 2280px) - 1477px))!important}`;
      const got = [];
      for (const F of [FRAMES[2], FRAMES[4]]) {          /* 1920 · 2600 — 스윙의 양 끝 */
        const ctx = await browser.newContext({ viewport: { width: 1080, height: F.h }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        await page.goto(URL, { waitUntil: 'load' });
        await page.waitForTimeout(650);
        await page.addStyleTag({ content: revert });
        await page.evaluate(`try{ openProfile() }catch(e){}`);
        await page.waitForTimeout(350);
        got.push(await page.evaluate(() => {
          const a = document.getElementById('app').getBoundingClientRect();
          const q = document.querySelector('.pf').getBoundingClientRect();
          return Math.round(((q.top + q.bottom) / 2 - a.top - a.height / 2) * 100) / 100;
        }));
        await ctx.close();
      }
      ok(got[0] > 150 && got[1] < -150,
        '[R] §6 옛 상단 앵커 사본은 1920 에서 아래로·2600 에서 위로 갈린다 (수리 전 +169 / −171)',
        `1920:${got[0]} · 2600:${got[1]} (Δ ${r2(got[0] - got[1])}px 스윙)`);
    }
    /* ── §7 (6회차 신설) — **자 자신의 회귀: 쌍 간극 판정 규칙** ────────────────
       5회차까지 `probe754` 는 상자 안 **모든 쌍의 최솟값**으로 판정했다. 그 최솟값은
       프레임마다 다른 쌍을 가리킬 수 있어 «없는 비단조» 를 만들고(89 유물 7.9→31.7→0),
       이미 겹친 쌍은 통째로 건너뛰어 **음수 간극을 잴 수 없었다**(= 주인이 지목한 «겹친다» 를
       자가 구조적으로 못 봤다). 6회차가 판정을 **쌍 단위**로 다시 짰고, 이 절이 그 규칙을
       **표로 못박는다** — 브라우저가 필요 없는 순수 함수라 게이트 시간이 안 는다.
       ⚑ 이 표의 첫 두 줄이 «무르게 푼 수리가 아님» 의 증거다: 새 규칙에서도 17 의 −35 겹침과
         18 의 703→23 붕괴는 **그대로 잡힌다**. 뒤 네 줄은 이번에 기각한 유령들이다. */
    blk('§7 자의 쌍 간극 판정 규칙 — 되돌림 표 (6회차 신설)');
    {
      const { judgeGaps } = require('./probe754.js');
      const FH = FRAMES.map((f) => f.h);
      const mk = (a) => FH.map((fh, i) => ({ fh, g: a[i] }));
      const TABLE = [
        { n: '17 수리 전 — 1600 에서 −35px 파고듦',      g: [-35, 20, 20, 20, 20],                    want: 'overlap' },
        { n: '18 수리 전 — 703 → 23px (97% 붕괴)',       g: [23, 300, 400, 703, 900],                 want: 'collapse' },
        { n: '89 계단↓수반 — 짧은 프레임엔 쌍이 없다',    g: [null, null, 0, 0, 0],                    want: 'none' },
        { n: '54·06 — 다섯 프레임 전부 0 (맞닿음)',       g: [0, 0, 0, 0, 0],                          want: 'none' },
        { n: '12 — 2600 에서만 벌어짐 (붕괴가 아니다)',   g: [20, 20, 20, 20, 237],                    want: 'none' },
        { n: '10 상점 — 프레임 따라 단조 증가',           g: [1172, 1413, 1492, 1848.3, 2158.7],       want: 'none' },
      ];
      for (const t of TABLE) {
        const j = judgeGaps(mk(t.g));
        ok(j.harm === t.want, `[7] ${t.n}`, `→ ${j.why} (harm=${j.harm}, 기대 ${t.want})`);
      }
      /* 기준이 «최댓값» 이 아니라 «기준 프레임» 이라는 것 자체를 한 줄로 못박는다 —
         옛 규칙(`min < max * .25`)이었다면 12 줄이 collapse 로 빨개진다. */
      const twelve = mk([20, 20, 20, 20, 237]).filter((x) => x.g != null).map((x) => x.g);
      ok(Math.min(...twelve) < Math.max(...twelve) * 0.25,
        '[7] 옛 규칙이었다면 12 는 붕괴로 읽혔다 (기준을 최댓값→기준프레임으로 옮긴 이유)',
        `min ${Math.min(...twelve)} < max ${Math.max(...twelve)} × .25`);
    }
  } finally { await browser.close(); }

  const tot = pass + fail;
  console.log(`\nVERIFY754 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
