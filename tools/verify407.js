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
 * 본다:
 *   §1 겹침 0      — 1600·1700·1741 에서 세로 겹침이 0 이고 배너 부품 덮임이 전부 0%
 *   §2 Δ0px        — 2280·1920 은 `max()` 가 234 를 골라 팝업 좌표가 한 픽셀도 안 움직인다
 *   §3 연속·앵커   — 교차점 1801 에서 두 항이 234 로 만나 층이 안 생기고, 그 아래는 H−531 로 굳는다
 *   §4 잘림 0      — 짧은 프레임에서도 상자는 813 그대로이고 위쪽 띠(126)를 안 넘는다
 *   §5 자          — `probe351` **D7** 의 고정 요소 목록에 `#tuto` 가 있다(없으면 이 자리는 안 세진다)
 *   §R 되돌림 시험 — 클램프를 뗀 사본에서 70.5px 겹침과 87.5% 덮임이 **되살아난다**
 *      (살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다 — LESSONS 191 · 사본으로 연다)
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
  return {
    frameH: Math.round(A.height), ci: rel(rc), tuto: rel(rt),
    h: +rc.height.toFixed(1),
    ovY: +(Math.min(rc.bottom, rt.bottom) - Math.max(rc.top, rt.top)).toFixed(1),
    ovX: +(Math.min(rc.right, rt.right) - Math.max(rc.left, rt.left)).toFixed(1),
    pad: getComputedStyle(document.getElementById('ciw')).paddingBottom,
    pedBot: ped ? +(ped.getBoundingClientRect().bottom - A.top).toFixed(1) : null,
    worst: Math.max(...Object.values(parts)),
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

  const M = {};
  for (const h of [1600, 1700, RAW, CROSS, 1850, 1920, 2280]) M[h] = await read(browser, h, null, 'gold');
  const Mdia = await read(browser, 1600, null, 'dia');

  /* ── §1 겹침 0 ── */
  console.log('§1 겹침 0 — 짧은 프레임에서 팝업이 배너를 안 파고들고 배너 부품 덮임이 0% 다');
  for (const h of [1600, 1700, RAW, CROSS, 1850, 1920, 2280]) {
    const m = M[h];
    ok(m.opened, `[${h}] 33 팝업이 열린다`);
    ok(m.ovY <= 0 || m.ovX <= 0, `[${h}] 팝업 ↔ 배너 세로 겹침 없음 (세로 ${m.ovY} · 가로 ${m.ovX})`);
    eq(`[${h}] 배너 부품 최대 덮임 0%`, m.worst, 0);
  }
  eq('[1600] 배너 [진행중] 버튼 덮임 0% (등재 당시 87.5)', M[1600].btn, 0);
  eq('[1600 · dia] 같은 지오메트리 — 덮임 0%', Mdia.worst, 0);
  ok(Mdia.ovY <= 0, `[1600 · dia] 세로 겹침 없음 (${Mdia.ovY})`);

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
  const negSrc = SRC.replace(CLAMP, OLD);
  ok(negSrc !== SRC, '사본을 만들었다 — 클램프를 옛 고정 여백으로 되돌림');
  const f = path.join(ROOT, `.v407-neg-${process.pid}.html`);
  fs.writeFileSync(f, negSrc);
  try {
    const n1600 = await read(browser, 1600, f, 'gold');
    near('[음성 1600] 세로 겹침 70.5 로 되돌아간다', n1600.ovY, 70.5);
    near('[음성 1600] 가로 겹침 219', n1600.ovX, 219);
    near('[음성 1600] 배너 [진행중] 버튼 87.5% 덮인다', n1600.btn, 87.5, 1.5);
    near('[음성 1600] 팝업 하변 1169.5 (중앙 정렬 그대로)', n1600.ci.y2, 1169.5);
    /* 등재문이 «1600 에서만» 이라고 못박은 것도 같이 센다 — 2280 은 사본에서도 안 겹친다.
       이게 없으면 §R 은 «어느 프레임에서든 겹친다» 와 구별이 안 된다. */
    const n2280 = await read(browser, 2280, f, 'gold');
    ok(n2280.ovY <= 0, `[음성 2280] 사본에서도 2280 은 안 겹친다 (${n2280.ovY}) — 1600 전용 결함이 맞다`);
    const nRaw = await read(browser, RAW, f, 'gold');
    near(`[음성 ${RAW}] 클램프 없는 교차점에서 겹침이 정확히 0`, nRaw.ovY, 0, 1.1);
  } finally { try { fs.unlinkSync(f); } catch (e) {} }

  await browser.close();
  console.log(`\nVERIFY407 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY407 CRASH', e); process.exit(2); });
