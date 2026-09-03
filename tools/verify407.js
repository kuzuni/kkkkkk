#!/usr/bin/env node
/* 작업 407 회귀 게이트 — 33 재화 정보 팝업(`#ciw>.ci`) ↔ 미션 배너(`#tuto`) 의 «앵커가 둘» 충돌
 *   실행: node tools/verify407.js   → 마지막 줄이 `VERIFY407 n/n PASS` 여야 한다.
 *
 * 등재문: 1600 에서 팝업이 배너를 **71px** 파고들고, 3인(BY·BZ·CA)이 «헤더가 86~91% 가려
 * `]` 한 글자만 남는다» 로 짚었다. `probe407` 이 그 둘을 그대로 재현했다 — 겹침 **70.5px** ·
 * 배너 [진행중] 버튼(`#tutoBtn`) 잉크 **87.5%** 덮임(338·341 처럼 기각되지 않았다).
 *
 * 뿌리는 **앵커가 둘**이다(56 절전 `.sv-hint` 와 같은 꼴):
 *   팝업 `#ciw` = 세로 중앙 앵커 · 배너 `#tuto` = 하단 앵커(`bottom:171` + 탭바 180 ⇒ 상변 = H − 501)
 *   ⇒ 겹침 = (369.5 + H/2) − (H − 501) = **870.5 − H/2**, 0 이 되는 지점 H = **1741**
 * 처방은 하단 여백 한 겹 — `padding-bottom: calc(234px + max(0px, 1801px - var(--frameh)))`.
 * 중앙 정렬은 여백 ΔB 에 상자를 ΔB/2 만 올리므로 ΔB = 2 × (겹침 + 30) 이고, 그 결과
 * **H ≤ 1801 에서 팝업이 배너에 하단 앵커된다**(하변 = H − 531 = 배너 상변 − 30).
 *
 * ⚑⚑ 853(2026-09-03) — **부품을 잴 수가 없어졌다(850 과 같은 한 줄).** 작업 811(주인 지시
 *   «팝업이 떠 있는데 그 밖의 HUD(**미션 트래커** · 재화 표시 · 스킬 슬롯줄)가 딤 너머로 읽힌다»)이
 *   전면 딤 오버레이 목록에 **`#ciw` 를 넣고** `:is(#top,#tuto,#slots){visibility:hidden}` 을 걸었다.
 *   `MEAS` 는 `visibility:hidden` 인 노드를 건너뛰므로 **보이는 부품이 0개**가 되어
 *   `Math.max()` 가 `-Infinity` 를, 이름으로 찾는 항이 `undefined` 를 냈다(10건 · 81/91).
 *   값이 틀린 게 아니라 **«잴 것이 없다»** 다 — 노드도 상자도 그대로 살아 있다(`tools/probe850.js`).
 *   ⇒ 850 이 `verify419` 에 쓴 처방을 그대로 준용해 자를 세 자리에서 돌렸다:
 *     ① §0 이 **두 번째 겹**을 등재한다(811 선언 · `#tuto` 포함 · 목록에 `#ciw` 가 있는가).
 *     ② §1 의 방향을 뒤집었다 — 현재 트리에서 묻는 것은 «부품이 안 덮였나» 가 아니라
 *        **«배너를 끈 것이 811 인가»**(`visibility:hidden` · `display` ≠ `none` · 상자 460×150 생존).
 *     ③ 407 이 지키던 **부품 덮임 0%** 는 «811 목록에서 `#tuto` 만 뺀 사본»(T2)에서 그대로 잰다 —
 *        `visibility` 겹이 걷히면 407 의 자리는 되살아나야 하고, 안 되살아나면 그때가 빨강이다.
 *   ⚠ 무르게 풀지 마라 — 기대를 `-Infinity`·`undefined` 로 바꾸면 407 이 지키던 «하단 여백» 을
 *      **아무도 안 재게 된다**(334). T2 는 «부품을 n개 실제로 셌다» 를 같이 단언해 헛초록을 막는다.
 *
 * 본다:
 *   §0 전제        — 클램프 선언 + **811 선언(두 번째 겹)** 이 소스에 있다
 *   §1 겹침 0      — 1600·1700·1741 에서 세로 겹침이 0 · 배너는 **811 이 껐다**(853) ·
 *                    `#tuto` 만 뺀 사본(T2)에서 배너 부품 덮임이 전부 0%
 *   §2 Δ0px        — 2280·1920 은 `max()` 가 234 를 골라 팝업 좌표가 한 픽셀도 안 움직인다
 *   §3 연속·앵커   — 교차점 1801 에서 두 항이 234 로 만나 층이 안 생기고, 그 아래는 H−531 로 굳는다
 *   §4 잘림 0      — 짧은 프레임에서도 상자는 813 그대로이고 위쪽 띠(126)를 안 넘는다
 *   §5 자          — `probe351` **D7** 의 고정 요소 목록에 `#tuto` 가 있다(없으면 이 자리는 안 세진다)
 *   §R 되돌림 시험 — 클램프를 뗀 사본(+ 811 의 `#tuto` 만 뺀 것)에서 70.5px 겹침과 87.5% 덮임이
 *      **되살아난다** (살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다 — LESSONS 191 · 사본으로 연다)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) < (tol === undefined ? 0.6 : tol),
  `${m} (기대 ${want} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');
const P351 = fs.readFileSync(path.join(__dirname, 'probe351.js'), 'utf8');

const CLAMP = 'padding:126px 0 calc(234px + max(0px, 1801px - var(--frameh, 2280px)))';
const OLD = 'padding:126px 0 234px';
const CROSS = 1801;   /* 여백 30 을 얹은 교차점 — 여기서 두 항이 정확히 234 로 만난다 */
const RAW = 1741;     /* 클램프가 없을 때 겹침이 0 이 되는 지점(870.5 − H/2 = 0) */
const GAP = 30;       /* 56 절전이 같은 꼴의 충돌에 쓴 여백 그대로 */
const BOXH = 813;     /* `.ci` 높이 — 측정표 33 */
const BAND = 501;     /* 배너 상변 = 프레임 하변 − 501 (`#tuto{bottom:171}` + `#tabbar{height:180}` + h150) */

/* ⚑ 853 — 두 번째 겹(작업 811). 목록을 손으로 안 적는다: 467·850 교훈대로 **제품에게 «그 모양의
   선언» 을 묻는다**(줄바꿈이 섞여 있어 `[\s\S]`). 목록이 좁아지는 날 §0 이 먼저 빨개진다. */
const RULE811 = (SRC.match(/#app:has\(:is\([\s\S]*?\)\.on\) :is\(#top,#tuto,#slots\)\{visibility:hidden\}/) || [''])[0];
const RULE811_IDS = RULE811 ? (RULE811.match(/:is\(([\s\S]*?)\)\.on/) || ['', ''])[1].replace(/\s+/g, '').split(',').filter(Boolean) : [];
/* 811 목록에서 `#tuto` **만** 뺀 사본 — 407 이 지키던 자리를 다시 잴 수 있게 하는 한 줄
   (`tools/probe850.js` 의 `strip811` 과 같은 변환이다). */
const strip811 = (s) => (RULE811 ? s.replace(RULE811, RULE811.replace(':is(#top,#tuto,#slots)', ':is(#top,#slots)')) : s);
const TUTOBOX = [460, 150];   /* 껍데기 상자 — `visibility:hidden` 은 상자를 안 접는다(probe850 §2) */

/* 재화 아이콘을 눌러 33 팝업을 연다 — `cur:gold` 오프너와 같은 경로 */
const OPEN = `(async function(cur){
  const e = document.querySelector('[data-cur="' + cur + '"]'); if (e) e.click();
  await new Promise(r => setTimeout(r, 460));
  return !!document.querySelector('#ciw.on');
})`;

const MEAS = `(function(){
  const A = document.getElementById('app').getBoundingClientRect();
  const ci = document.querySelector('#ciw.on .ci'), tuto = document.getElementById('tuto');
  if (!ci || !tuto) return null;
  const rc = ci.getBoundingClientRect(), rt = tuto.getBoundingClientRect();
  const rel = (r) => ({ y1: +(r.top - A.top).toFixed(1), y2: +(r.bottom - A.top).toFixed(1),
                        x1: +(r.left - A.left).toFixed(1), x2: +(r.right - A.left).toFixed(1) });
  /* 배너 부품별 «팝업 상자에 덮인 %» — 팝업은 불투명(테 #56443A + 크림 본문)이라 겹친 만큼이
     그대로 안 읽히는 만큼이다. 3인이 짚은 축을 자로 옮긴 자리다. */
  const parts = {};
  for (const el of [tuto, ...tuto.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    const ix = Math.max(0, Math.min(r.right, rc.right) - Math.max(r.left, rc.left));
    const iy = Math.max(0, Math.min(r.bottom, rc.bottom) - Math.max(r.top, rc.top));
    const key = el.id ? '#' + el.id : (el === tuto ? '#tuto' : '.' + (el.className || el.tagName));
    const pct = +(100 * ix * iy / (r.width * r.height)).toFixed(1);
    if (parts[key] === undefined || pct > parts[key]) parts[key] = pct;
  }
  const ped = document.querySelector('.pedge');
  /* ⚑ 853 — 보이는 부품이 0개면 Math.max() 는 -Infinity 를 낸다. 그 값을 그대로 흘려보내면
     «덮임이 0 이 아니다» 라는 **거짓 결함**이 되므로, «못 쟀다» 는 null 로 말하고 셈한 개수(n)를
     같이 돌려준다 — 부르는 쪽이 «잴 것이 있었나» 와 «덮였나» 를 갈라 물을 수 있게. */
  const keys = Object.keys(parts);
  const ts = getComputedStyle(tuto);
  return {
    frameH: Math.round(A.height), ci: rel(rc), tuto: rel(rt),
    h: +rc.height.toFixed(1),
    ovY: +(Math.min(rc.bottom, rt.bottom) - Math.max(rc.top, rt.top)).toFixed(1),
    ovX: +(Math.min(rc.right, rt.right) - Math.max(rc.left, rt.left)).toFixed(1),
    pad: getComputedStyle(document.getElementById('ciw')).paddingBottom,
    pedBot: ped ? +(ped.getBoundingClientRect().bottom - A.top).toFixed(1) : null,
    worst: keys.length ? Math.max(...keys.map((k) => parts[k])) : null,
    n: keys.length,
    tdisp: ts.display, tvis: ts.visibility,
    tbox: [Math.round(rt.width), Math.round(rt.height)],
    btn: parts['#tutoBtn'], parts,
  };
})`;

async function read(browser, h, src, cur) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + (src || FILE));
  await p.waitForTimeout(1100);
  const opened = await p.evaluate(OPEN + `('${cur || 'gold'}')`);
  const m = opened ? await p.evaluate(MEAS + '()') : null;
  await ctx.close();
  return m ? { ...m, errs, opened } : { opened, errs };
}

(async () => {
  const browser = await launch(chromium);

  /* ── §0 전제 ── */
  console.log('§0 전제 — 소스에 클램프가 있고 옛 고정 여백은 안 남아 있다');
  ok(SRC.includes(CLAMP), '`#ciw` 에 407 클램프 선언이 있다');
  /* ⚠ 옛 여백 문자열은 **다른 오버레이도 쓰는 공통 처방**이다(#pfw·#dgdw — 8506 주석).
     소스 전체에서 세면 남의 자리에 걸려 영원히 빨간 게이트가 된다 ⇒ `#ciw{…}` 규칙 안에서만 센다. */
  const CIW_RULE = (SRC.match(/#ciw\{[^}]*\}/) || [''])[0];
  ok(CIW_RULE.includes('calc(234px + max(0px, 1801px'), '`#ciw` 규칙 안에 클램프가 들어 있다');
  ok(!/padding:126px 0 234px/.test(CIW_RULE), '`#ciw` 규칙에 옛 고정 여백이 안 남아 있다');
  ok(SRC.includes('#tuto{position:absolute;right:0;bottom:171px'), '배너가 하단 앵커 그대로다 (bottom:171)');
  ok(/#tabbar\{flex:none;height:180px/.test(SRC), '탭바 높이 180 그대로다 (배너 상변 산식의 재료)');
  /* ⚑ 853 — 두 번째 겹(811)을 등재한다. 이 세 항이 없으면 811 이 조용히 좁아지거나 사라지는 날
     §1 의 «811 이 껐다» 만 빨개지고 «왜» 를 아무도 못 읽는다(850 §0 과 같은 자리). */
  ok(!!RULE811 && SRC.split(RULE811).length === 2,
    '853 — 811 HUD 숨김 선언(`:is(#top,#tuto,#slots){visibility:hidden}`)이 소스에 정확히 한 번 있다',
    RULE811 || '(못 찾음)');
  ok(RULE811.includes('#tuto'),
    '853 — 811 목록이 `#tuto`(미션 트래커)를 **같이** 숨긴다 (부품을 못 재게 된 그 한 줄)');
  ok(RULE811_IDS.includes('#ciw'),
    `853 — 811 목록에 \`#ciw\`(33 재화 정보)가 **있다** — 407 이 살려 둔 자리를 나중 지시가 덮었다 (${RULE811_IDS.length}종)`,
    RULE811_IDS.join(',') || '(빈 목록)');

  const M = {};
  for (const h of [1600, 1700, RAW, CROSS, 1850, 1920, 2280]) M[h] = await read(browser, h, null, 'gold');
  const Mdia = await read(browser, 1600, null, 'dia');

  /* ⚑ 853 — 407 이 지키던 «부품 덮임» 을 재려면 811 의 `visibility` 겹을 걷어야 한다.
     살아 있는 페이지에 CSS 를 주입하지 않고 **사본**으로 연다(LESSONS 191). */
  const t2 = path.join(ROOT, `.v407-t2-${process.pid}.html`);
  fs.writeFileSync(t2, strip811(SRC));
  const T2 = {};
  let T2dia = null;
  try {
    for (const h of [1600, 1700, RAW, CROSS, 1850, 1920, 2280]) T2[h] = await read(browser, h, t2, 'gold');
    T2dia = await read(browser, 1600, t2, 'dia');
  } finally { try { fs.unlinkSync(t2); } catch (e) {} }

  /* ── §1 겹침 0 ── */
  console.log('§1 겹침 0 — 짧은 프레임에서 팝업이 배너를 안 파고들고, `#tuto` 만 뺀 사본에서 부품 덮임이 0% 다');
  ok(strip811(SRC) !== SRC, '853 — 811 목록에서 `#tuto` 만 뺀 사본을 만들 수 있다 (부품을 재는 재료)');
  for (const h of [1600, 1700, RAW, CROSS, 1850, 1920, 2280]) {
    const m = M[h], t = T2[h];
    ok(m.opened, `[${h}] 33 팝업이 열린다`);
    ok(m.ovY <= 0 || m.ovX <= 0, `[${h}] 팝업 ↔ 배너 세로 겹침 없음 (세로 ${m.ovY} · 가로 ${m.ovX})`);
    /* 853 — 방향 전환: 지금 트리에서 배너를 끈 것은 407 이 아니라 811 이다.
       `display` 는 살아 있고(419 목록 밖) 상자도 460×150 그대로다 = «잴 것이 없는» 게 아니라 «가려 뒀다». */
    eq(`[853][${h}] 배너를 끈 것은 811 이다 (visibility)`, m.tvis, 'hidden');
    ok(m.tdisp !== 'none', `[853][${h}] 419 는 이 자리를 안 건드린다 — display 는 살아 있다 (${m.tdisp})`);
    ok(m.tbox[0] === TUTOBOX[0] && Math.abs(m.tbox[1] - TUTOBOX[1]) <= 2,
      `[853][${h}] 껍데기 상자 ${TUTOBOX[0]}×${TUTOBOX[1]} 생존 (visibility:hidden 은 상자를 안 접는다)`, m.tbox.join('x'));
    /* 그 겹을 걷으면 407 이 지키던 자리가 그대로 되살아나야 한다 — 개수를 같이 세서 헛초록을 막는다 */
    ok(t.opened && t.n >= 6, `[T2][${h}] 부품을 ${t.n}개 실제로 쟀다 (0개면 아래 «0%» 는 헛초록이다)`);
    eq(`[T2][${h}] 배너 부품 최대 덮임 0%`, t.worst, 0);
  }
  eq('[T2][1600] 배너 [진행중] 버튼 덮임 0% (등재 당시 87.5)', T2[1600].btn, 0);
  eq('[T2][1600 · dia] 같은 지오메트리 — 덮임 0%', T2dia.worst, 0);
  ok(Mdia.ovY <= 0, `[1600 · dia] 세로 겹침 없음 (${Mdia.ovY})`);
  eq('[853][1600 · dia] 배너를 끈 것은 811 이다 (visibility)', Mdia.tvis, 'hidden');

  /* ── §2 Δ0px ── */
  console.log('§2 Δ0px — 교차점 위에서는 `max()` 가 234 를 골라 9:19 좌표가 그대로다');
  const WANT = { 2280: [696.5, 1509.5], 1920: [516.5, 1329.5], 1850: [481.5, 1294.5] };
  for (const h of [2280, 1920, 1850]) {
    eq(`[${h}] #ciw 하단 여백 234px (클램프가 안 먹는다)`, M[h].pad, '234px');
    near(`[${h}] 팝업 상변`, M[h].ci.y1, WANT[h][0]);
    near(`[${h}] 팝업 하변`, M[h].ci.y2, WANT[h][1]);
    near(`[${h}] 팝업 하변 = 369.5 + H/2 (순수 중앙 정렬 산식)`, M[h].ci.y2, 369.5 + h / 2);
  }
  near('[2280] 배너 상변 = 2280 − 501', M[2280].tuto.y1, 2280 - BAND);
  ok(M[2280].tuto.y1 - M[2280].ci.y2 > 200,
    `[2280] 팝업 하변 ↔ 배너 상변 ${(M[2280].tuto.y1 - M[2280].ci.y2).toFixed(1)}px (원래도 안 닿았다)`);

  /* ── §3 연속·앵커 ── */
  console.log('§3 연속 — 1801 에서 두 항이 234 로 만나고, 그 아래는 팝업도 하단 앵커(H−531)가 된다');
  eq(`[${CROSS}] 교차점에서도 여백은 아직 234px (끊김 없음)`, M[CROSS].pad, '234px');
  near(`[${CROSS}] 교차점 팝업 하변 = 중앙 정렬 산식과 하단 앵커 산식이 같은 값`,
    M[CROSS].ci.y2, CROSS - BAND - GAP);
  near(`[${CROSS}] 369.5 + H/2 도 같은 값 (두 산식이 여기서 만난다)`, 369.5 + CROSS / 2, CROSS - BAND - GAP, 0.6);
  for (const h of [1600, 1700, RAW]) {
    near(`[${h}] 팝업 하변 = H − 531 (하단 앵커로 굳었다)`, M[h].ci.y2, h - BAND - GAP);
    near(`[${h}] 팝업 하변 ↔ 배너 상변 여백 = ${GAP}`, M[h].tuto.y1 - M[h].ci.y2, GAP);
    eq(`[${h}] #ciw 하단 여백 = 234 + (1801 − H)`, M[h].pad, (234 + CROSS - h) + 'px');
  }
  /* 층이 안 생긴다 — 프레임을 1px 씩 내려도 하변이 단조롭게 따라 내려간다 */
  const step = [];
  for (const h of [1799, 1800, 1801, 1802]) step.push(await read(browser, h, null, 'gold'));
  ok(step.every((m, i) => i === 0 || m.ci.y2 - step[i - 1].ci.y2 > 0.4),
    `교차점 1801 부근에서 하변이 단조 증가 (${step.map((m) => m.ci.y2).join(' → ')})`);
  ok(Math.abs((step[3].ci.y2 - step[0].ci.y2) - 3) < 1.2,
    `교차점을 지나며 튐이 없다 — 3px 프레임 차에 하변 ${(step[3].ci.y2 - step[0].ci.y2).toFixed(1)}px`);

  /* ── §4 잘림 0 ── */
  console.log('§4 잘림 0 — 상자는 813 그대로이고 위쪽 HUD 띠(126)를 안 넘는다');
  for (const h of [1600, 1700, RAW, CROSS, 1920, 2280]) {
    eq(`[${h}] 팝업 상자 높이 ${BOXH} (max-height 가 안 걸린다)`, M[h].h, BOXH);
    ok(M[h].ci.y1 >= 126, `[${h}] 팝업 상변 ${M[h].ci.y1} ≥ 126 (위쪽 띠 안)`);
    ok(M[h].pedBot === null || M[h].ci.y1 >= M[h].pedBot,
      `[${h}] HUD 판때기(${M[h].pedBot}) 침범 0`);
    ok(M[h].errs.length === 0, `[${h}] 콘솔·런타임 에러 0`);
  }
  ok(M[1600].ci.y1 - 126 > 100,
    `[1600] 가장 짧은 프레임에서도 위쪽 여유 ${(M[1600].ci.y1 - 126).toFixed(1)}px 이 남는다`);

  /* ── §5 자 ── */
  console.log('§5 자 — probe351 D7 의 고정 요소 목록에 배너가 있다 (없으면 이 자리는 안 세진다)');
  ok(/navs\.push\(\{\s*name:\s*'tuto'/.test(P351), '`probe351` D7 이 `#tuto` 를 고정 요소로 센다');
  ok(P351.includes("getElementById('tuto')"), 'D7 이 배너를 DOM 에서 직접 집는다');

  /* ── §R 되돌림 시험 ── */
  console.log('§R 되돌림 — 클램프를 뗀 사본에서 70.5px 겹침과 87.5% 덮임이 되살아난다');
  /* ⚑ 853 — 사본이 «두 겹을 뗀 것» 이다. 클램프만 되돌리면 811 이 여전히 배너를 꺼서
     **덮임을 잴 수가 없다**(그게 이번 부패의 얼굴이다). `visibility` 는 레이아웃을 안 바꾸므로
     겹침 70.5·219 는 한 픽셀도 안 달라진다 — 그 사실 자체를 [음성 겹] 항이 못박는다. */
  const negSrc = strip811(SRC).replace(CLAMP, OLD);
  ok(negSrc !== SRC && !negSrc.includes(CLAMP), '사본을 만들었다 — 클램프를 옛 고정 여백으로 되돌리고 811 의 `#tuto` 를 뺐다');
  const f = path.join(ROOT, `.v407-neg-${process.pid}.html`);
  fs.writeFileSync(f, negSrc);
  /* 겹만 뗀 사본(클램프는 그대로) — «겹침은 겹과 무관하다» 를 재는 음성 대조 */
  const f2 = path.join(ROOT, `.v407-neg811-${process.pid}.html`);
  fs.writeFileSync(f2, strip811(SRC));
  try {
    const n1600 = await read(browser, 1600, f, 'gold');
    near('[음성 1600] 세로 겹침 70.5 로 되돌아간다', n1600.ovY, 70.5);
    near('[음성 1600] 가로 겹침 219', n1600.ovX, 219);
    ok(n1600.n >= 6, `[음성 1600] 부품을 ${n1600.n}개 실제로 쟀다 (853 — 0개면 아래 항이 undefined 로 죽는다)`);
    near('[음성 1600] 배너 [진행중] 버튼 87.5% 덮인다', n1600.btn, 87.5, 1.5);
    near('[음성 1600] 팝업 하변 1169.5 (중앙 정렬 그대로)', n1600.ci.y2, 1169.5);
    /* 등재문이 «1600 에서만» 이라고 못박은 것도 같이 센다 — 2280 은 사본에서도 안 겹친다.
       이게 없으면 §R 은 «어느 프레임에서든 겹친다» 와 구별이 안 된다. */
    const n2280 = await read(browser, 2280, f, 'gold');
    ok(n2280.ovY <= 0, `[음성 2280] 사본에서도 2280 은 안 겹친다 (${n2280.ovY}) — 1600 전용 결함이 맞다`);
    const nRaw = await read(browser, RAW, f, 'gold');
    near(`[음성 ${RAW}] 클램프 없는 교차점에서 겹침이 정확히 0`, nRaw.ovY, 0, 1.1);
    /* 853 — 겹만 떼면 «부품이 보이는데 덮임은 0» 이다 = 클램프가 살아 있다는 뜻이고,
       동시에 «`visibility` 겹은 좌표를 한 픽셀도 안 바꾼다» 는 증거다(위 T2 값과 같아야 한다). */
    const g1600 = await read(browser, 1600, f2, 'gold');
    eq('[음성 겹 1600] 겹만 떼면 덮임은 0% (클램프는 살아 있다)', g1600.worst, 0);
    near('[음성 겹 1600] 좌표는 그대로 — 팝업 하변이 T2 와 같다', g1600.ci.y2, T2[1600].ci.y2, 0.01);
    eq('[음성 겹 1600] 배너가 다시 보인다 (visibility)', g1600.tvis, 'visible');
  } finally { for (const p of [f, f2]) { try { fs.unlinkSync(p); } catch (e) {} } }

  await browser.close();
  console.log(`\nVERIFY407 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY407 CRASH', e); process.exit(2); });
