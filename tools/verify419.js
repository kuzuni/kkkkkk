#!/usr/bin/env node
/* 작업 419 회귀 게이트 — 화면을 소유하는 오버레이 ↔ 미션 배너(`#tuto`) 의 «토막»
 *   실행: node tools/verify419.js   → 마지막 줄이 `VERIFY419 n/n PASS` 여야 한다.
 *
 * 등재문은 «전체 높이 시트·공용 모달이 배너를 통째로 덮는다 — 17건 · 화면 7개» 였고 값은 그대로
 * 재현됐다. 다만 **덮임 px 로는 이 결함의 모양을 말할 수 없다**(`tools/probe419.js`):
 * 상자는 전부 1080 보다 좁고 배너는 우변 붙박이(x 620..1080)라 겹쳐도 오른쪽에 **노란 토막**이
 * 남는다(토막 폭 = (1080 − 상자폭)/2 = 실측 41~142px — 0 이 되는 상자가 하나도 없다).
 * 사람이 «깨졌다» 고 읽는 것은 그 토막이다. ⇒ 이 게이트가 지키는 것은 **불변식** 하나다:
 *
 *      배너는 **온전히 보이거나(덮임 0%) 아예 안 보인다.** 그 사이 = «토막» = 결함.
 *
 * 처방은 배경 요소를 감추는 것이다(상자는 한 픽셀도 안 건드린다) —
 *   `#app:has(:is(#modal,#collw,#blsw,#bagw,#pfw,#specw,#cfw).on) #tuto{display:none}`
 * 407 처방(상자를 밀어 자리를 만든다)을 안 쓴 이유는 §3 이 숫자로 들고 있다 — 여기 상자들은
 * 전체 높이라 배너를 피하려면 세로 예산의 16~57% 를 내야 한다(403·404 가 방금 키운 그 시트들이다).
 *
 * 본다:
 *   §0 전제       — 선언이 있고, `#ciw` 는 목록에 **없고**, 배너 하단 앵커의 재료가 살아 있다
 *   §1 불변식     — 오프너 전수 × 3프레임에서 «토막» 0건 (목록이 뒤처지면 여기가 먼저 빨개진다)
 *   §2 대가       — 406-④ 음성항: 407 이 살려 둔 `#ciw` 는 **숨김이 아니라 100% 보임**,
 *                   오버레이가 없는 화면·전체를 덮는 탭 페이지에서는 배너가 **안 숨는다**,
 *                   닫으면 **되돌아온다**(display 를 지운 것이 아니라 조건부로 감춘 것이다)
 *   §3 Δ0px       — 호스트 상자가 «선언을 뺀 사본» 과 2280·1600 에서 0.2px 이내로 같다(상수 0개)
 *   §R 되돌림시험 — 선언을 뺀 **사본**에서 토막이 실측값 그대로 되살아난다(+ 2280 음성항)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, drive, collectOpeners } = require('./probe351lib');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);
const near = (m, got, want, tol) => ok(Math.abs(got - want) <= (tol === undefined ? 0.6 : tol),
  `${m} (기대 ${want} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

/* ⚑ 467(2026-08-30) — **선언을 손으로 적어 두었더니 그 목록이 늘어난 날 자가 통째로 빨개졌다.**
   467 이 `#wpnw`(05 장비 세부 팝업)를 목록에 더하자 이 상수와 안 맞아 `SRC.replace(RULE,'')` 가
   **아무 것도 안 지운 사본**을 만들었고(= 사본에서도 배너가 숨는다), §3·§R 63항이 한꺼번에
   `보임 null%` 로 죽었다. 자기가 §0 주석에 «목록은 손으로 적는 표라 뒤처진다(402)» 라고 적어 둔
   바로 그 사고를 자기 상수가 냈다. ⇒ **제품에게 묻는다** — 목록이 아니라 «그 모양의 선언» 을 찾는다.
   ⚠ 그래도 «무엇이 목록에 있어야 하는가» 를 안 묻게 되면 안 된다 — 아래 §0 이 `#ciw`·`#relw`
      **제외**(407·350 이 값을 치른 자리)와 «항이 늘기만 했는가» 를 따로 단언한다. */
const RULE = (SRC.match(/#app:has\(:is\([^)]*\)\.on\) #tuto\{display:none\}/) || [''])[0];
/* 419 당시의 일곱 — 여기서 **줄어들면** 그때 갚은 자리가 되살아난다(늘어나는 것은 정상이다). */
const RULE_MUST = ['#modal', '#collw', '#blsw', '#bagw', '#pfw', '#specw', '#cfw'];
/* 일부러 뺀 둘 — `#ciw` 는 407 이 하단 여백으로 자리를 만들어 배너를 살려 둔 자리,
   `#relw` 는 배경이 통째로 덮어 «토막» 이 원리적으로 안 생기는 자리(350 처방으로 유령을 기각했다). */
const RULE_NEVER = ['#ciw', '#relw'];
const BAND = 501;      /* 배너 상변 = 프레임 하변 − 501 (`bottom:171` + 탭바 180 + 높이 150) */
const FRAMES = [2280, 1920, 1600];

/* 배너를 토막 내던 화면 전부(수리 전 `probe419 --all` 실측) + 음성 대조 화면 */
const HOSTS = [
  { label: 'side:attend', sel: '.side .ibtn[data-pop="attend"]', box: '#modal>.mbox' },
  { label: 'side:roul', sel: '.side .ibtn[data-pop="roul"]', box: '#modal>.mbox' },
  { label: 'side:quest', sel: '.side .ibtn[data-pop="quest"]', box: '#modal>.mbox' },
  { label: 'side:promo', sel: '.side .ibtn[data-pop="promo"]', box: '#modal>.mbox' },
  { label: 'menu:mail', mn: 'mail', box: '#modal>.mbox' },
  { label: 'side:coll', sel: '.side .ibtn[data-pop="coll"]', box: '#collw>.cl' },
  { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]', box: '#blsw>.bls' },
  { label: 'menu:bag', mn: 'bag', box: '#bagw>.bg53' },
  { label: 'menu:conf', mn: 'conf', box: '#cfw>.cf55' },
  { label: 'prof:19', sel: '#profBtn', box: '#pfw>.pf' },
  { label: 'prof:20-스펙', prof: '.pf-tgl>.lb', box: '#specw>.spc' },
  /* ⚑ 467 — 419 당시 자가 **한 번도 열어 본 적이 없던** 화면이다(`probe351lib` 이 `#eqCards` 를
     08 영웅 시트를 열기 전에 물어 `eqslot:*` 오프너가 아예 안 만들어졌다 — 351 14회차가 고쳤다).
     세 슬롯(무기·방패·목걸이)은 기하가 픽셀 동일이라 대표로 무기 한 판만 든다. */
  { label: 'eqslot:weapon', hero: '#eqCards [data-eqslot="weapon"]', box: '#wpnw>.wm' },
];
/* ⚑ 수리 «전» 절대 좌표는 **상수로 안 박는다** — §3 주석 참조(415 가 1회차 중에 19 프로필 패널을
   1600 에서 1396 → 1296 으로 바꿨다). 기록용 실측표는 `docs/review/419-미션배너덮임.md` §5 에 있다. */
/* 수리 «전» 배너 보임 % — §R 이 사본에서 이 값을 되살려야 한다(0 이면 «원래 안 겹쳤다» = 음성항) */
const BEFORE = {
  'side:attend': { 2280: 100, 1600: 15.2 }, 'side:roul': { 2280: 100, 1600: 19.8 },
  'side:quest': { 2280: 47.9, 1600: 19.8 }, 'side:promo': { 2280: 100, 1600: 19.8 },
  'menu:mail': { 2280: 93.3, 1600: 19.8 }, 'side:coll': { 2280: 80.6, 1600: 20.1 },
  'side:bless': { 2280: 100, 1600: 8.9 }, 'menu:bag': { 2280: 100, 1600: 14.3 },
  'menu:conf': { 2280: 89.4, 1600: 30.9 }, 'prof:19': { 2280: 74.4, 1600: 20 },
  'prof:20-스펙': { 2280: 75.2, 1600: 20 },
  /* 467 — 사본(선언을 뺀 트리)에서 잰 값. ⚠ 이 자리의 «수리 전» 은 **467 이후의 상자**다
     (467 이 `.wm` 을 1600 에서 156..1420 으로 옮겼다) — 419 선언만 뺀 대조이므로 그것이 맞다. */
  'eqslot:weapon': { 2280: 0, 1600: 0 },
};
/* ⚑ `tab:box`(89 유물)는 여기 없다 — 1회차에 자가 «토막 8.1px» 을 냈지만 **찍힌 픽셀은 0** 이었다
   (`#relw{background:#0D100D}`). 유령의 뿌리는 «세우고 → 연다» 순서였고(열림 연출 한복판에서 재면
   `#relw` 가 `opacity:0` 이라 불투명 상자에서 빠진다), 순서를 바로잡자 자에서도 사라졌다. */
const TOL = {};

/* 페이지 안에서 재는 자 — «불투명 상자» 판정·클리핑 접기는 `probe351` D7 과 **글자 그대로 같다**.
   같은 자리를 다른 자로 재면 값이 안 붙는다(LESSONS 351-⑨). */
const MEAS = function (boxSel) {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const tuto = document.getElementById('tuto');
  const vis = (el) => {
    const cs = getComputedStyle(el);
    return !(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0);
  };
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    return d;
  };
  const out = { frameH: Math.round(A.height), box: null, hidden: true, visPct: null, stub: null, disp: null };
  if (boxSel) {
    const b = document.querySelector(boxSel);
    if (b && vis(b)) {
      const r = b.getBoundingClientRect();
      out.box = [Math.round((r.left - A.left) * 10) / 10, Math.round((r.top - A.top) * 10) / 10,
        Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
    }
  }
  out.disp = tuto ? getComputedStyle(tuto).display : null;
  if (!tuto || !vis(tuto)) return out;
  out.hidden = false;
  const t = tuto.getBoundingClientRect();
  out.tutoY1 = Math.round((t.top - A.top) * 10) / 10;
  const area = (t.right - t.left) * (t.bottom - t.top);
  const rects = [];
  for (const el of app.querySelectorAll('*')) {
    if (!vis(el) || el === tuto || el.contains(tuto) || tuto.contains(el)) continue;
    if (el.classList.contains('dim')) continue;
    const cs = getComputedStyle(el);
    const m = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    const parts = m ? m[1].split(',').map((s) => parseFloat(s)) : [];
    const alpha = m ? (parts.length > 3 ? parts[3] : 1) : 0;
    if (!(alpha >= 0.9 || cs.backgroundImage !== 'none')) continue;
    const d = clipped(el);
    const w = d.x2 - d.x1, h = d.y2 - d.y1;
    if (w < 300 || h < 200 || w * h < 120000) continue;
    if (Math.min(d.y2, t.bottom) - Math.max(d.y1, t.top) <= 2) continue;
    if (Math.min(d.x2, t.right) - Math.max(d.x1, t.left) <= 40) continue;
    rects.push({ x1: Math.max(d.x1, t.left), y1: Math.max(d.y1, t.top), x2: Math.min(d.x2, t.right), y2: Math.min(d.y2, t.bottom) });
  }
  let covered = 0;
  if (rects.length) {
    const xs = [...new Set(rects.flatMap((r) => [r.x1, r.x2]))].sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i++) {
      const x1 = xs[i], x2 = xs[i + 1];
      if (x2 <= x1) continue;
      const spans = rects.filter((r) => r.x1 <= x1 && r.x2 >= x2).map((r) => [r.y1, r.y2]).sort((p, q) => p[0] - q[0]);
      let cy = 0, cur = null;
      for (const [y1, y2] of spans) {
        if (!cur) { cur = [y1, y2]; continue; }
        if (y1 <= cur[1]) cur[1] = Math.max(cur[1], y2); else { cy += cur[1] - cur[0]; cur = [y1, y2]; }
      }
      if (cur) cy += cur[1] - cur[0];
      covered += (x2 - x1) * cy;
    }
  }
  let stub = t.right - t.left;
  for (const r of rects) if (r.y2 - r.y1 > (t.bottom - t.top) * 0.9) stub = Math.min(stub, t.right - r.x2);
  out.visPct = Math.round(1000 * (1 - covered / area)) / 10;
  out.stub = Math.round(stub * 10) / 10;
  return out;
};

async function shot(browser, o, H, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + (file || FILE));
  await page.waitForTimeout(1100);
  /* ⚠ 순서는 «열고 → 세운다» 다(probe351 277~278행). 뒤집으면 **열림 연출 한복판**에서 재게 되고,
     그러면 `#relw`(89 유물 페이지)가 `opacity:0` 로 읽혀 불투명 상자에서 빠진다 = «배너가 1.8%
     보인다» 는 유령(1회차에 실제로 그랬다 — 찍힌 픽셀로는 0 이었다). */
  if (o) await drive(page, o);
  await settle(page);
  const m = await page.evaluate(MEAS, o && o.box ? o.box : null);
  await ctx.close();
  return { ...m, errs };
}

(async () => {
  const browser = await launch(chromium);

  /* ── §0 전제 ───────────────────────────────────────────────────────────── */
  console.log('§0 전제 — 선언·목록·배너 앵커의 재료');
  ok(!!RULE && SRC.split(RULE).length === 2, '419 선언이 소스에 정확히 한 번 있다', RULE || '(못 찾음)');
  ok(RULE_MUST.every((s) => RULE.includes(s)),
    '419 당시 일곱 자리가 목록에 그대로 있다 (줄어들면 그때 갚은 토막이 되살아난다)',
    RULE_MUST.filter((s) => !RULE.includes(s)).join(',') || '빠진 것 없음');
  ok(RULE_NEVER.every((s) => !RULE.includes(s)),
    '`#ciw`·`#relw` 는 숨김 목록에 **없다** (407 이 자리를 만들어 배너를 살려 둔 자리 — 406-④ 대가)',
    RULE_NEVER.filter((s) => RULE.includes(s)).join(',') || '섞인 것 없음');
  ok(RULE.includes('#wpnw'),
    '467 — `#wpnw`(05 장비 세부)가 목록에 있다 (419 스코프 밖이었던 자리 · 351 14회차)');
  ok(SRC.includes('#tuto{position:absolute;right:0;bottom:171px;width:460px;height:150px'),
    '배너 껍데기가 그대로다 (하단 앵커 · 460×150)');
  ok(/#tabbar\{flex:none;height:180px/.test(SRC), '탭바 180 그대로다 (배너 상변 산식의 재료)');
  ok(SRC.includes('#app.dunrun #tuto{display:none}'), '던전 런 숨김(선례)이 그대로 살아 있다');

  /* ── §1 불변식 — 오프너 전수 ─────────────────────────────────────────────
     ⚠ 목록(HOSTS)이 아니라 **제품이 실제로 여는 화면 전부**를 훑는다. 손으로 적은 표는
     뒤처지므로(402), 새 오버레이가 배너를 토막 내면 목록이 아니라 이 절이 먼저 빨개진다. */
  console.log('§1 불변식 — 오프너 전수 × 3프레임: «토막»(0% < 보임 < 100%) 0건');
  const openers = await collectOpeners(browser);
  const stubs = [];
  for (const o of openers) {
    for (const H of FRAMES) {
      const m = await shot(browser, o, H);
      if (!m.hidden && m.visPct > 0.05 && m.visPct < 99.95) stubs.push(`${o.label}@${H} 보임 ${m.visPct}% · 토막 ${m.stub}px`);
    }
  }
  ok(stubs.length === 0, `오프너 ${openers.length}개 × ${FRAMES.length}프레임에서 토막 0건`,
    stubs.slice(0, 8).join(' / '));

  /* ── §2 대가 — 406-④ 음성항 ─────────────────────────────────────────────── */
  console.log('§2 대가 — «숨겨도 된다» 의 짝(음성항). 이게 없으면 §1 은 «배너는 언제 없어도 된다» 는 자다');
  for (const H of FRAMES) {
    const m = await shot(browser, null, H);
    ok(!m.hidden && m.visPct === 100, `[2-a][${H}] 오버레이가 없는 메인 화면에서 배너는 **온전히 보인다** (보임 ${m.visPct}%)`);
    near(`[2-a][${H}] 배너 상변 = H − ${BAND}`, m.tutoY1, H - BAND);
  }
  for (const cur of ['gold', 'dia']) {
    for (const H of [2280, 1600]) {
      const m = await shot(browser, { label: 'cur:' + cur, sel: `[data-cur="${cur}"]`, box: '#ciw>.ci' }, H);
      ok(!m.hidden, `[2-c][${H}] cur:${cur} — 배너가 **안 숨는다** (407 이 살려 둔 자리)`);
      eq(`[2-c][${H}] cur:${cur} — 배너 100% 보임`, m.visPct, 100);
    }
  }
  /* 전체를 덮는 탭 페이지에서는 규칙이 안 걸린다 — 덮임 100% 는 «토막» 이 아니므로 손댈 이유가 없다 */
  for (const o of [{ label: 'tab:adv', sel: '.tab[data-t="adv"]' }, { label: 'tab:hero', sel: '.tab[data-t="hero"]' },
    { label: 'tab:box', sel: '.tab[data-t="box"]' }]) {
    for (const H of [2280, 1600]) {
      const m = await shot(browser, o, H);
      ok(!m.hidden, `[2-d][${H}] ${o.label} — 규칙이 **안 걸린다** (탭 페이지는 목록에 없다)`);
      eq(`[2-d][${H}] ${o.label} — 그래도 배너는 완전히 덮여 0% 다 (토막이 아니다)`, m.visPct, 0);
    }
  }
  /* 닫으면 되돌아온다 — display 를 «지운» 것이 아니라 «조건부로 감춘» 것이다 */
  {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto('file://' + FILE);
    await page.waitForTimeout(1100);
    await settle(page);
    await drive(page, { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' });
    const on = await page.evaluate(() => getComputedStyle(document.getElementById('tuto')).display);
    await page.evaluate(() => { const b = document.querySelector('#blsw .bls-x'); if (b) b.click(); else document.getElementById('blsw').classList.remove('on'); });
    await page.waitForTimeout(500);
    const off = await page.evaluate(() => getComputedStyle(document.getElementById('tuto')).display);
    eq('[2-e] 34 축복이 열려 있는 동안 배너 display', on, 'none');
    ok(off !== 'none', `[2-e] 닫으면 배너가 되돌아온다 (display ${off})`);
    await ctx.close();
  }

  /* ── §3 Δ0px + §R 되돌림 시험 — **사본 한 벌로 둘 다 잰다** ────────────────
     ⚠ 사본은 **저장소 뿌리에** 둔다(407 선례) — `/tmp` 에 두면 `assets/` 상대 경로가 통째로 깨져
     그림이 안 뜨고, 그 차이가 «되돌렸더니 값이 다르다» 로 읽힌다(1회차에 tab:box 1.8 → 0 으로 실제로 그랬다). */
  const tmp = path.join(ROOT, '.v419-neg.html');
  ok(SRC.split(RULE).length === 2, '선언이 소스에 정확히 한 번 있다 (사본을 만들 수 있다)');
  fs.writeFileSync(tmp, SRC.replace(RULE, ''));
  try {
  console.log('§3 Δ0px — 호스트 상자가 «선언을 뺀 사본» 과 한 픽셀도 안 다르다 (처방이 배경만 만졌다)');
  /* ⚑ 절대 좌표를 상수로 박지 않는다. 이 시트들은 **다른 워커가 지금도 고치고 있다** —
     1회차 중에 415 가 19 프로필 패널을 1600 에서 1396 → 1296 으로 바꿨고, 상수를 박았으면
     남의 정당한 작업에 내 게이트가 빨개졌을 것이다(402 «표는 뒤처진다» 의 좌표판).
     묻는 것은 «좌표가 얼마냐» 가 아니라 **«내 선언이 그 좌표를 움직였느냐»** 이므로
     같은 트리의 사본과 견주는 것이 정확히 그 질문이다. 기록용 실측값은 review §5 에 있다. */
  const PAIR = [2280, 1600];
  const REV = {};
  for (const o of [...HOSTS, { label: 'cur:gold', sel: '[data-cur="gold"]', box: '#ciw>.ci' }]) {
    for (const H of PAIR) {
      const now = await shot(browser, o, H);
      const was = await shot(browser, o, H, tmp);
      REV[o.label + '@' + H] = was;
      ok(now.box !== null && was.box !== null, `[${o.label}@${H}] 호스트 상자 ${o.box} 가 양쪽에서 열렸다`);
      if (!now.box || !was.box) continue;
      const axis = ['x', 'y', 'w', 'h'];
      for (let k = 0; k < 4; k++) near(`[${o.label}@${H}] ${axis[k]} Δ0`, now.box[k], was.box[k], 0.2);
    }
  }

  /* ── §R 되돌림 시험 — 선언을 뺀 사본에서 «토막» 이 되살아난다 ─────────── */
  console.log('§R 되돌림 시험 — 선언을 뺀 사본에서 토막이 실측값 그대로 되살아난다');
  for (const o of HOSTS) {
    const want = BEFORE[o.label];
    if (!want) continue;
    for (const H of PAIR) {
      const m = REV[o.label + '@' + H];
      ok(!m.hidden, `[R][${o.label}@${H}] 사본에서는 배너가 안 숨는다`);
      if (want[H] === 100) {
        /* 음성항 — 이 자리는 사본의 2280 에서 **온전했다**(짧은 프레임이 만든 결함이라는 증명) */
        eq(`[R-음성][${o.label}@2280] 사본에서도 온전히 보인다`, m.visPct, 100);
      } else {
        ok(m.visPct > 0.05 && m.visPct < 99.95, `[R][${o.label}@${H}] «토막» 이 되살아난다 (보임 ${m.visPct}%)`);
        near(`[R][${o.label}@${H}] 보임 %`, m.visPct, want[H], TOL[o.label] || 1.2);
      }
    }
  }
  /* 음성항 — 사본의 2280 에서 **100% 보임** 인 다섯은 «짧은 프레임이 새로 만든» 자리다.
     나머지 여섯은 2280 에서도 이미 토막이라 «1600 전용» 처방(`.shortf` 문턱)으로는 못 닫는다. */
  {
    const short = ['side:attend', 'side:roul', 'side:promo', 'side:bless', 'menu:bag'];
    const both = ['side:quest', 'menu:mail', 'side:coll', 'menu:conf', 'prof:19', 'prof:20-스펙'];
    ok(short.every((k) => BEFORE[k][2280] === 100), '[R-음성] 다섯 자리는 2280 에서 온전했다 = 짧은 프레임이 만든 결함');
    ok(both.every((k) => BEFORE[k][2280] < 99), '[R-음성] 여섯 자리는 2280 에서도 토막이었다 = `.shortf` 문턱으로는 못 닫는다');
    eq('[R-음성] 사본에서도 cur:gold 는 100% 보임 (407 은 이 선언과 무관하게 산다)',
      REV['cur:gold@1600'].visPct, 100);
  }
  } finally { fs.unlinkSync(tmp); }
  /* 콘솔 에러 0 */
  {
    const m = await shot(browser, { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' }, 1600);
    eq('콘솔 에러 0건', m.errs.length, 0);
  }

  await browser.close();
  console.log(`\nVERIFY419 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
