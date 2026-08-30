#!/usr/bin/env node
/* 420 게이트 — 33 재화 정보 팝업(`#ciw>.ci`)이 89 유물 페이지의 주 CTA(`#rwBasin` 「유물 소환」)를
 * 짧은 프레임에서 파고들지 않는다.
 *
 * 실행: node tools/verify420.js
 *
 * ⚑ 등재문의 실측은 **407 수리 전 값**이다(가림 128~134px · 라벨 100%). `probe420` 으로 지금 트리를
 *   다시 재서 나온 값은 겹침 **35px(1600) · 최대 44.7px(1800)** · **라벨 잉크 덮임 0%** 였다.
 *   이 자는 «등재문» 이 아니라 **재현한 값**을 지킨다(338 규칙).
 *
 * 처방(407 과 같은 산식·같은 여백 30, 다른 것은 «피해자가 하단에서 얼마나 떨어져 있나» 하나):
 *     팝업 하변 = H − X/2 + 369.5  ·  피해자 상변 = H − f  ⇒ 여백 30 ⇒ **X = 2f + 799**
 *       407 배너   f = 501 ⇒ 1801   ·   420 유물 버튼   f = **566** ⇒ **1931**
 *   `#relw.on ~ #ciw{padding-bottom:calc(234px + max(0px, 1931px - var(--frameh, 2280px)))}`
 *
 * 절:
 *   §0 전제   — 소스에 스코프 규칙이 있고, **`#ciw{…}` 뒤에** 있으며, 407 기본 클램프는 무수정이다
 *   §1 겹침 0 — 1600~1931 전 프레임에서 팝업 ↔ 버튼 겹침 0 · 버튼 부품 덮임 0%
 *   §2 여백   — 바닥 구간(1600·1650·1700)에서 여백이 정확히 30.0 이고, 전 구간에서 ≥ 0
 *   §3 연속·앵커 — 교차점 1931 에서 두 항이 234 로 만나 층이 없고, 2280 은 **Δ0px**
 *   §4 스코프 — 메인 화면(골드·다이아)에서는 407 의 자리(H−531)가 한 칸도 안 움직인다
 *   §R 되돌림 — 스코프 규칙을 407 값으로 되돌린 사본에서 **35px 겹침과 16.2% 덮임이 되살아난다**
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
/* ⚠ 60 쥬시 개봉 연출(`jz…`)이 도는 중에 재면 상자가 **813 을 넘겨** 잡힌다 — 1회차에 그대로
   재다가 2280 하변이 1509.5 대신 1514.4 로, 교차점 걸음이 «1317 → 1333.9 → 1339.9 → 1335.5» 로
   흔들렸다(단조도 아니고 값도 틀린다). `probe420` 이 쓰는 정착기를 자도 그대로 쓴다 —
   두 자가 «다른 순간» 을 재면 숫자를 대조할 수 없다(385 «자매 자 드리프트»). */
const { settle } = require('./probe351lib');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) < (tol === undefined ? 0.6 : tol),
  `${m} (기대 ${want} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

const RULE = '#relw.on ~ #ciw{padding-bottom:calc(234px + max(0px, 1931px - var(--frameh, 2280px)))}';
const BASE = 'padding:126px 0 calc(234px + max(0px, 1801px - var(--frameh, 2280px)))';
const CROSS = 1931;   /* = 2 × (566 + 399.5) — 여백 30 을 얹은 교차점 */
const GAP = 30;       /* 56 절전 · 407 이 쓴 여백 그대로 */
const F = 566;        /* 버튼 상변 = 프레임 하변 − 566 (`#relw` 여백 배분이 바닥을 치는 H ≤ 1700 구간) */
const BOXH = 813;     /* `.ci` 높이 — 측정표 33 */

/* 89 유물 페이지를 연 뒤 그 안 «유물조각» 알약을 눌러 33 팝업을 연다.
   ⚠ 알약은 `#relw` 안 `.pcb` 에만 있다 — 메인 화면에서는 상자가 0×0 이라 클릭이 조용히 실패하고
      «안 열린 화면» 을 재게 된다(probe351lib 10회차 사고). 탭을 «표» 로 적지 않고 제품에게 묻는다. */
const OPEN_RELIC = `(async function(){
  const sel = '[data-cur="relic"]';
  const drawn = () => { const e = document.querySelector(sel); if (!e) return false;
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  if (!drawn()) {
    for (const t of [...document.querySelectorAll('.tab[data-t]')]) {
      t.click(); await new Promise(r => setTimeout(r, 340));
      if (drawn()) break;
    }
  }
  if (!drawn()) return { ok:false, why:'유물조각 알약이 어느 탭에서도 안 그려진다' };
  document.querySelector(sel).click();
  await new Promise(r => setTimeout(r, 500));
  const ciw = !!document.querySelector('#ciw.on'), relw = !!document.querySelector('#relw.on');
  return { ok: ciw && relw, ciw, relw };
})`;

/* 메인 화면 재화 아이콘(골드·다이아) — 407 오프너와 같은 경로 */
const OPEN_MAIN = `(async function(cur){
  const e = document.querySelector('[data-cur="' + cur + '"]'); if (e) e.click();
  await new Promise(r => setTimeout(r, 460));
  return { ok: !!document.querySelector('#ciw.on'), ciw: !!document.querySelector('#ciw.on'),
           relw: !!document.querySelector('#relw.on') };
})`;

const MEAS = `(function(){
  const A = document.getElementById('app').getBoundingClientRect();
  const sc = A.width / 1080 || 1;
  const ci = document.querySelector('#ciw.on .ci');
  const btn = document.getElementById('rwBasin');
  if (!ci) return null;
  const rel = (r) => ({ y1: +((r.top - A.top) / sc).toFixed(1), y2: +((r.bottom - A.top) / sc).toFixed(1),
                        x1: +((r.left - A.left) / sc).toFixed(1), x2: +((r.right - A.left) / sc).toFixed(1) });
  const rc = ci.getBoundingClientRect();
  const out = {
    frameH: Math.round(A.height / sc), ci: rel(rc), h: +(rc.height / sc).toFixed(1),
    pad: getComputedStyle(document.getElementById('ciw')).paddingBottom,
    padTop: getComputedStyle(document.getElementById('ciw')).paddingTop,
  };
  if (!btn) return out;
  const rb = btn.getBoundingClientRect();
  out.btn = rel(rb);
  out.ovY = +((Math.min(rc.bottom, rb.bottom) - Math.max(rc.top, rb.top)) / sc).toFixed(1);
  out.ovX = +((Math.min(rc.right, rb.right) - Math.max(rc.left, rb.left)) / sc).toFixed(1);
  out.gap = +((rb.top - rc.bottom) / sc).toFixed(1);
  const cov = (r) => {
    const ix = Math.max(0, Math.min(r.right, rc.right) - Math.max(r.left, rc.left));
    const iy = Math.max(0, Math.min(r.bottom, rc.bottom) - Math.max(r.top, rc.top));
    return +(100 * ix * iy / (r.width * r.height)).toFixed(1);
  };
  /* 버튼 안 부품 전수 — «CTA 가 안 읽힌다» 를 자로 옮긴 축 */
  const parts = {};
  for (const el of [btn, ...btn.querySelectorAll('*')]) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;
    const key = el.id ? '#' + el.id : (el === btn ? '#rwBasin' : '.' + String(el.className || el.tagName).split(' ')[0]);
    const p = cov(r);
    if (parts[key] === undefined || p > parts[key]) parts[key] = p;
  }
  /* 라벨은 상자가 아니라 «글자 잉크» 로 — .rw-basin>b 는 left:0;right:0 라 상자가 버튼 전폭이다 */
  const b = btn.querySelector('b');
  if (b && b.firstChild) {
    const rg = document.createRange(); rg.selectNodeContents(b);
    const r = rg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) { out.label = cov(r); out.labelBox = rel(r); }
  }
  const cost = document.getElementById('rwCost');
  if (cost) out.cost = cov(cost.getBoundingClientRect());
  out.parts = parts;
  out.worst = Math.max(...Object.values(parts));
  return out;
})`;

/* §R 음성 대조 — 420 클램프만 407 값으로 되돌린다(같은 선택자를 뒤에 얹어 순서로 이긴다) */
const UNPATCH = `(function(){
  const st = document.createElement('style');
  st.textContent = '#relw.on ~ #ciw{padding-bottom:calc(234px + max(0px, 1801px - var(--frameh, 2280px)))}';
  document.head.appendChild(st);
})`;

async function read(browser, h, opt) {
  const o = opt || {};
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + FILE);
  await p.waitForTimeout(1100);
  if (o.unpatch) await p.evaluate(UNPATCH + '()');
  const opened = await p.evaluate(o.cur ? OPEN_MAIN + `('${o.cur}')` : OPEN_RELIC + '()');
  await settle(p);
  const m = opened.ok ? await p.evaluate(MEAS + '()') : null;
  await ctx.close();
  return { ...(m || {}), opened, errs };
}

const SWEEP = [1600, 1650, 1700, 1741, 1800, 1850, 1900, 1924, 1931, 1950, 2000, 2100, 2280];

(async () => {
  const browser = await launch(chromium);
  const M = {};
  try {
    /* ── §0 전제 ── */
    console.log('§0 전제 — 스코프 규칙이 소스에 있고, `#ciw{…}` 뒤에 있으며, 407 은 무수정이다');
    ok(SRC.includes(RULE), '`#relw.on ~ #ciw` 스코프 클램프 선언이 있다');
    ok(SRC.includes(BASE), '407 기본 클램프(1801)가 한 칸도 안 바뀌었다');
    /* ⚠ `verify407` §0 은 `/#ciw\{[^}]*\}/` 로 **첫** 규칙을 읽는다. 내 규칙이 앞에 오면
       남의 게이트가 내 선언을 읽어 407 이 빨개진다 — 순서 자체를 못 박는다. */
    ok(SRC.indexOf('  #ciw{') >= 0 && SRC.indexOf(RULE) > SRC.indexOf('  #ciw{'),
      '스코프 규칙이 `#ciw{…}` **뒤**에 있다 (verify407 §0 의 첫-규칙 정규식 보호)');
    ok((SRC.match(/#relw\.on ~ #ciw/g) || []).length === 1, '스코프 규칙은 한 곳뿐이다(사본 없음)');
    ok(/#relw\.on\{display:block\}/.test(SRC), '`#relw.on` 이 페이지 열림 표시 그대로다 (스코프의 재료)');
    ok(SRC.indexOf('<div id="relw">') < SRC.indexOf('<div id="ciw">'),
      '`#relw` 가 `#ciw` 보다 앞선 형제다 (`~` 결합자의 전제)');

    /* ── §1 겹침 0 ── */
    console.log('\n§1 겹침 0 — 짧은 프레임 전수에서 팝업이 주 CTA 를 안 파고들고 부품 덮임이 0% 다');
    for (const h of SWEEP) M[h] = await read(browser, h);
    for (const h of SWEEP) {
      const m = M[h];
      ok(m.opened.ok, `[${h}] 진입 서명 — #ciw@on 과 #relw@on 이 둘 다 열렸다`,
        `ciw=${m.opened.ciw} relw=${m.opened.relw}${m.opened.why ? ' · ' + m.opened.why : ''}`);
      ok(m.ovY <= 0 || m.ovX <= 0, `[${h}] 팝업 ↔ #rwBasin 겹침 없음 (세로 ${m.ovY} · 가로 ${m.ovX})`);
      ok(m.worst === 0, `[${h}] 버튼 부품 덮임 최댓값 0% (실제 ${m.worst}%)`);
    }
    /* 라벨·코스트 알약은 «남은 반쪽» 이 아니라 처음부터 0 이었다 — 등재문 정정을 못 박는다 */
    for (const h of [1600, 1800]) {
      eq(`[${h}] 라벨 잉크 «유물 소환» 덮임 0%`, M[h].label, 0);
      eq(`[${h}] 코스트 알약 #rwCost 덮임 0%`, M[h].cost, 0);
    }
    ok(M[1600].labelBox.y1 > M[1600].ci.y2,
      `[1600] 라벨 잉크(y${M[1600].labelBox.y1})는 팝업 하변(${M[1600].ci.y2}) 아래다 — 등재문의 «라벨 100% 가림» 은 407 이전 값`);

    /* ── §2 여백 ── */
    console.log('\n§2 여백 — 바닥 구간에서 정확히 30.0 이고, 전 구간에서 음수가 없다');
    for (const h of [1600, 1650, 1700]) {
      near(`[${h}] 팝업 하변 ↔ 버튼 상변 여백 = ${GAP}`, M[h].gap, GAP, 0.35);
      near(`[${h}] 팝업 하변 = H − ${F + GAP}`, M[h].ci.y2, h - F - GAP, 0.35);
      eq(`[${h}] #ciw 하단 여백 = 234 + (1931 − H)`, M[h].pad, (234 + CROSS - h) + 'px');
    }
    for (const h of SWEEP) ok(M[h].gap >= 0, `[${h}] 여백이 음수가 아니다 (${M[h].gap})`);
    ok(Math.min(...SWEEP.map((h) => M[h].gap)) >= 2,
      `여유 최솟값 ≥ 2px (실제 ${Math.min(...SWEEP.map((h) => M[h].gap))} — 교차점 부근)`);

    /* ── §3 연속·앵커 ── */
    console.log('\n§3 연속·앵커 — 1931 에서 두 항이 234 로 만나고 2280 은 Δ0px 다');
    eq('[2280] #ciw 하단 여백 = 234px (클램프가 안 붙는다)', M[2280].pad, '234px');
    near('[2280] 팝업 하변 1509.5 — 9:19 기준은 한 칸도 안 움직였다', M[2280].ci.y2, 1509.5, 0.35);
    near('[2280] 팝업 상변 696.5 — 63 검산값 그대로', M[2280].ci.y1, 696.5, 0.35);
    eq(`[${CROSS}] 교차점에서 여백이 정확히 234px`, M[CROSS].pad, '234px');
    const step = [];
    for (const h of [1929, 1930, 1931, 1932, 1933]) step.push((await read(browser, h)).ci.y2);
    ok(step.every((v, i) => i === 0 || v >= step[i - 1] - 0.01),
      `교차점 ${CROSS} 부근에서 하변이 단조 증가 (${step.join(' → ')})`);
    ok(Math.max(...step.map((v, i) => i === 0 ? 0 : v - step[i - 1])) < 1.2,
      '교차점에서 층이 안 생긴다 (한 칸 걸음 < 1.2px)');
    near('[1600] 팝업 높이 813 — 상자를 누르지 않았다', M[1600].h, BOXH, 0.6);
    ok(M[1600].ci.y1 >= 126, `[1600] 팝업 상변(${M[1600].ci.y1})이 상단 여백 126 아래다 — 위로 안 넘친다`);
    eq('[1600] #ciw 상단 여백은 126px 그대로', M[1600].padTop, '126px');

    /* ── §4 스코프 ── */
    console.log('\n§4 스코프 — 메인 화면(골드·다이아)은 407 의 자리에서 한 칸도 안 움직인다');
    for (const cur of ['gold', 'dia']) {
      for (const h of [1600, 1700, 1800]) {
        const m = await read(browser, h, { cur });
        ok(m.opened.ok && !m.opened.relw, `[${h} · ${cur}] 메인 화면에서 열렸다 (#relw 는 닫혀 있다)`);
        eq(`[${h} · ${cur}] #ciw 하단 여백 = 234 + (1801 − H) — 407 값`, m.pad, (234 + 1801 - h) + 'px');
        near(`[${h} · ${cur}] 팝업 하변 = H − 531 (407 하단 앵커)`, m.ci.y2, h - 531, 0.35);
      }
    }

    /* ── §R 되돌림 시험 ── */
    console.log('\n§R 되돌림 — 스코프 클램프를 407 값으로 되돌리면 35px 겹침이 되살아난다');
    const n1600 = await read(browser, 1600, { unpatch: true });
    const n1800 = await read(browser, 1800, { unpatch: true });
    ok(n1600.opened.ok && n1800.opened.ok, '[음성] 되돌린 사본도 같은 화면이 열린다');
    near('[음성 1600] 세로 겹침 35 로 되돌아간다', n1600.ovY, 35, 1.1);
    near('[음성 1600] 가로 겹침 400 (버튼 전폭)', n1600.ovX, 400, 1.1);
    near('[음성 1600] 수반 `.rw-stone` 덮임 16.2% 로 되돌아간다', n1600.parts['.rw-stone'], 16.2, 0.6);
    near('[음성 1800] 최악 프레임에서 겹침 44.7', n1800.ovY, 44.7, 1.1);
    near('[음성 1600] 팝업 하변이 407 자리(1069)로 내려간다', n1600.ci.y2, 1069, 0.35);
    /* 무르게 푼 수리가 아님 — 음성 판에서도 **라벨은 0%** 다(등재문이 틀린 자리는 되돌려도 안 살아난다) */
    eq('[음성 1600] 라벨 잉크는 되돌려도 0% — 「라벨 100% 가림」은 407 이전에만 참이었다', n1600.label, 0);

    /* ── §H 위생 ── */
    console.log('\n§H 위생 — 콘솔·페이지 에러 0건');
    const errs = SWEEP.flatMap((h) => M[h].errs || []);
    ok(errs.length === 0, `콘솔·페이지 에러 0건 — ${errs.length}건`, errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }

  console.log(`\nVERIFY420 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY420 CRASH', e); process.exit(2); });
