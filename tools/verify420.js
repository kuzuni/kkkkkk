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
 *   §2 여백   — 팝업 하변이 **클램프 산식이 정하는 자리**에 있고, 여백은 전 구간 ≥ 0 · 바닥 구간 ≥ 30
 *   §3 연속·앵커 — 교차점 1931 에서 두 항이 234 로 만나 층이 없고, 2280 은 **Δ0px**
 *   §4 스코프 — 메인 화면(골드·다이아)에서는 407 의 자리(H−531)가 한 칸도 안 움직인다
 *   §R 되돌림 — 스코프 규칙을 지우면 여백이 **407 식(234 + 1801 − H)** 으로 떨어지고 팝업이 **65px** 내려온다
 *   §N 음성   — 버튼을 위로 40/80px 올리면 §2 하한과 §1 겹침·덮임 축이 **실제로 빨개진다**(888 완화의 짝)
 *
 * ⚑ **888(2026-09-03) — 이 자의 §2·§R 6항이 «제품 0줄인 트리» 에서 빨갰다(102/108).**
 *   부패의 기계는 하나다 — 두 항이 **버튼(`#rwBasin`)의 자리에서 파생된 상수**를 못박고 있었다:
 *     · §2 「여백 = 30」 은 「버튼 상변 = H − **566**」(옛 상수 `F`)의 다른 얼굴이다. 팝업 하변은
 *       내내 제자리(「H − 596」 초록)였고 움직인 것은 버튼이다 — `probe888` 커밋 대조로
 *       **F 566 → 530**(버튼이 36px 아래로 · 여백 30 → **66**)임을 확인했다. 사용자가 보는
 *       결함은 없다(§1 12항 전부 초록 · 덮임 0%).
 *     · §R 「되돌리면 35px 겹친다」 도 같은 파생값이다 — 버튼이 내려간 지금은 407 값으로 되돌려도
 *       **안 겹친다**(−1px). 즉 «이 수리가 아직 하중을 받는가» 를 더는 **못 묻는** 상태였다.
 *   ⇒ 두 절을 **제품이 실제로 산 것**만 묻도록 갈아 끼웠다(334 «무르게 푼 수리» 의 반대 얼굴을 피한다):
 *     ⓐ §2 는 「= 30」 대신 ① 팝업 하변이 **클램프 산식**(H − (X/2 − 369.5))이 정하는 자리에 있는가
 *        ② 여백이 음수가 아닌가(§1 과 같은 축) ③ 바닥 구간에서 **≥ 30** 인가 를 묻는다.
 *        ③ 이 «≥» 인 것이 핵심이다 — `여백 = 596 − F` 라 **버튼이 위로 올라와 30 을 파고들 때만**
 *        빨개지고(그때가 진짜 결함이다), 멀어지는 쪽 이동에는 안 흔들린다.
 *     ⓑ §R 은 되돌림의 **대상**을 옮겼다 — 「겹침이 되살아난다」(스택 파생) 대신
 *        「`#ciw` 하단 여백이 407 식으로 떨어지고 팝업이 정확히 (1931 − 1801)/2 = **65px** 내려온다」
 *        (제품 CSS 를 직접 묻는 항이라 세로 스택이 움직여도 안 흔들린다).
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
const CROSS = 1931;   /* = 2 × (566 + 399.5) — 여백 30 을 얹은 교차점 (규칙이 실제로 쓰는 수) */
const BASE_X = 1801;  /* 407 기본 클램프의 교차점 — §R 이 되돌리는 자리 */
const GAP = 30;       /* 56 절전 · 407 이 쓴 여백. 888 부터 «= 30» 이 아니라 «≥ 30» 의 하한이다 */
const BOXH = 813;     /* `.ci` 높이 — 측정표 33 */
/* 클램프가 무는 구간에서 팝업 하변이 앉는 자리 — 상수가 아니라 **규칙에서 푸는 산식**이다.
   padding-bottom = 234 + X − H 이면 하변 = 126 + (H − 126 − pad + 813)/2 + 17 = H − (X/2 − 369.5).
     X = 1931(420 스코프) ⇒ H − 596   ·   X = 1801(407 기본) ⇒ H − 531(§4 가 쓰는 값)
   ⚠ 596 은 «F 566 + 여백 30» 과 우연히 같지만 **버튼에서 온 수가 아니다** — 888 이 갈랐다. */
const y2at = (h, x) => h - (x / 2 - 369.5);
const LIFT = (CROSS - BASE_X) / 2;   /* 스코프 규칙이 사는 것 = 팝업이 407 자리보다 65px 위에 앉는다 */

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
/* §N 음성 시험 — 버튼을 **위로** 올려 §1·§2 가 «여전히 무는지» 를 묻는다(888).
   888 이 「= 30」 을 「≥ 30」 으로 푼 자리라, 그 완화가 «무르게 푼 수리»(334)가 아님을
   자기 자신으로 증명해야 한다. `position:relative;top:-n` 은 형제 배치를 안 건드리고
   자기 상자만 올린다 — 「버튼이 팝업 쪽으로 되돌아온다」 를 가장 얇게 흉내 낸다. */
const RAISE = `(function(px){
  const st = document.createElement('style');
  st.textContent = '#rwBasin{position:relative;top:-' + px + 'px}';
  document.head.appendChild(st);
})`;

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
  if (o.raise) await p.evaluate(RAISE + `(${o.raise})`);
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
    console.log('\n§2 여백 — 팝업 하변이 클램프 산식의 자리에 있고, 여백은 음수가 아니다(바닥 구간 ≥ 30)');
    for (const h of [1600, 1650, 1700]) {
      near(`[${h}] 팝업 하변 = H − (1931/2 − 369.5) — 클램프 산식이 정하는 자리`, M[h].ci.y2, y2at(h, CROSS), 0.35);
      eq(`[${h}] #ciw 하단 여백 = 234 + (1931 − H)`, M[h].pad, (234 + CROSS - h) + 'px');
      /* ⚑ 888 — 여기가 「= 30」 이었다. 여백 = 596 − F 라 **버튼이 움직이면 팝업이 제자리여도 빨개진다**
         (실제로 F 566 → 530 이 되어 66 이 나왔고 §1 은 전부 초록이었다). 지킬 것은 «정확히 30» 이 아니라
         «420 이 확보한 30 을 버튼이 도로 파고들지 않는가» 이므로 **하한**으로 묻는다. */
      ok(M[h].gap >= GAP, `[${h}] 팝업 하변 ↔ 버튼 상변 여백 ≥ ${GAP} (실제 ${M[h].gap} · 버튼 상변 = H − ${+(h - M[h].btn.y1).toFixed(1)})`);
    }
    for (const h of SWEEP) ok(M[h].gap >= 0, `[${h}] 여백이 음수가 아니다 (${M[h].gap})`);
    ok(Math.min(...SWEEP.map((h) => M[h].gap)) >= 2,
      `여유 최솟값 ≥ 2px (실제 ${Math.min(...SWEEP.map((h) => M[h].gap))} — 교차점 부근)`);
    /* 관측(단언 아님) — 버튼이 프레임 하변에서 얼마나 떨어져 있는지. 다음에 세로 스택이 움직이면
       이 줄이 먼저 말한다(888 은 이 값이 조용히 566 → 530 으로 걷는 동안 두 절이 빨갰다). */
    console.log('  · 관측 F = H − 버튼 상변 : ' + SWEEP.map((h) => `${h}:${+(h - M[h].btn.y1).toFixed(1)}`).join(' · '));

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
    console.log('\n§R 되돌림 — 스코프 규칙을 지우면 여백이 407 식으로 떨어지고 팝업이 65px 내려온다');
    const n1600 = await read(browser, 1600, { unpatch: true });
    const n1800 = await read(browser, 1800, { unpatch: true });
    ok(n1600.opened.ok && n1800.opened.ok, '[음성] 되돌린 사본도 같은 화면이 열린다');
    /* ⚑ 888 — 여기가 「겹침 35 · 덮임 16.2%」 였다. 그 셋은 **버튼의 자리에서 파생된 수**라
       버튼이 36px 내려간 뒤로는 되돌려도 안 겹친다(−1px) ⇒ 되돌림 시험이 물지 않았다.
       ⇒ 되돌림의 **대상**을 제품 CSS 로 옮긴다: 스코프 규칙이 사는 것은 «팝업이 407 자리보다
       정확히 (1931 − 1801)/2 = 65px 위에 앉는다» 이고, 그것은 세로 스택과 무관한 항등식이다. */
    for (const [h, m] of [[1600, n1600], [1800, n1800]]) {
      eq(`[음성 ${h}] #ciw 하단 여백이 407 식(234 + 1801 − H)으로 떨어진다`, m.pad, (234 + BASE_X - h) + 'px');
      near(`[음성 ${h}] 팝업 하변이 407 자리(H − 531)로 내려간다`, m.ci.y2, y2at(h, BASE_X), 0.35);
      near(`[음성 ${h}] 스코프 규칙이 사는 값 = 팝업이 ${LIFT}px 위에 앉는다`, m.ci.y2 - M[h].ci.y2, LIFT, 0.35);
    }
    near('[음성 1600] 가로 겹침 400 (버튼 전폭) — 두 상자는 같은 세로줄에 있다', n1600.ovX, 400, 1.1);
    ok(n1600.ovY > M[1600].ovY, `[음성 1600] 되돌리면 세로 간격이 그만큼 줄어든다 (${M[1600].ovY} → ${n1600.ovY})`);
    /* 무르게 푼 수리가 아님 — 음성 판에서도 **라벨은 0%** 다(등재문이 틀린 자리는 되돌려도 안 살아난다) */
    eq('[음성 1600] 라벨 잉크는 되돌려도 0% — 「라벨 100% 가림」은 407 이전에만 참이었다', n1600.label, 0);

    /* ── §N 음성 시험(888) — 완화한 하한이 아직 문다 ── */
    console.log('\n§N 음성 — 버튼을 위로 올리면 §2 하한과 §1 겹침 축이 실제로 빨개진다');
    const up40 = await read(browser, 1600, { raise: 40 });
    const up80 = await read(browser, 1600, { raise: 80 });
    ok(up40.opened.ok && up80.opened.ok, '[음성] 버튼을 올린 사본도 같은 화면이 열린다');
    near('[음성 1600 ↑40] 여백이 올린 만큼 그대로 줄어든다', M[1600].gap - up40.gap, 40, 0.6);
    ok(up40.gap < GAP, `[음성 1600 ↑40] 여백이 ${GAP} 미만으로 떨어진다 — §2 하한이 여전히 문다 (실제 ${up40.gap})`);
    ok(up80.ovY > 0, `[음성 1600 ↑80] §1 「겹침 없음」 이 실제로 깨진다 (세로 겹침 ${up80.ovY})`);
    ok(up80.worst > 0, `[음성 1600 ↑80] §1 「부품 덮임 0%」 도 같이 깨진다 (최댓값 ${up80.worst}%)`);

    /* ── §H 위생 ── */
    console.log('\n§H 위생 — 콘솔·페이지 에러 0건');
    const errs = SWEEP.flatMap((h) => M[h].errs || []);
    ok(errs.length === 0, `콘솔·페이지 에러 0건 — ${errs.length}건`, errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }

  console.log(`\nVERIFY420 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('VERIFY420 CRASH', e); process.exit(2); });
