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
 * ⚑⚑ 850(2026-09-03) — **배너를 숨기는 겹이 둘이 됐다.** 작업 811(주인 지시 «팝업이 떠 있는데
 *   그 밖의 HUD(**미션 트래커** · 재화 표시 · 스킬 슬롯줄)가 딤 너머로 읽힌다»)이 전면 딤 오버레이
 *   **17종**에 `:is(#top,#tuto,#slots){visibility:hidden}` 을 걸었고, 그 17종은 여기 일곱을 **전부 품는다.**
 *   `vis()` 는 `visibility:hidden` 을 «안 보인다» 로 읽으므로 §2-c·§R 74항이 «보임 **null**» 로 죽었다
 *   (`tools/probe850.js` — 값이 틀린 게 아니라 **잴 것을 못 찾았다**. 노드도 상자도 그대로 살아 있다).
 *   ⇒ 자를 세 자리에서 돌렸다:
 *     ① §0 이 **두 번째 겹**을 등재한다(811 선언 · `#tuto` 포함 · 목록이 여기 일곱을 품는가).
 *     ② §2-c 의 방향을 뒤집었다 — `#ciw` 는 407 이 살려 둔 자리였지만 **811 이 덮었다**(나중 지시가
 *        이긴다 · 333 처방). 407 이 만든 자리가 살아 있다는 증거는 §R2 의 T2 항이 매 실행 다시 잰다.
 *     ③ §R 의 사본은 이제 **두 겹을 다 뺀 것**이다 — 안 그러면 `BEFORE` 표를 잴 수가 없다.
 *   ⚠ 무르게 풀지 마라 — «숨든 안 숨든 통과» 로 바꾸면 811 선언이 통째로 사라져도 초록이다(334).
 *
 * 본다:
 *   §0 전제       — 선언이 **둘 다** 있고, `#ciw` 는 419 목록에 **없고**(811 목록에는 있다),
 *                   배너 하단 앵커의 재료가 살아 있다
 *   §1 불변식     — 오프너 전수 × 3프레임에서 «토막» 0건 (목록이 뒤처지면 여기가 먼저 빨개진다)
 *   §2 대가       — 406-④ 음성항: 오버레이가 없는 화면·전체를 덮는 탭 페이지에서는 배너가 **안 숨는다**,
 *                   `#ciw` 는 **811 이 덮어 숨는다**(토막이 아니다 · 850),
 *                   닫으면 **되돌아온다**(display 를 지운 것이 아니라 조건부로 감춘 것이다)
 *   §3 Δ0px       — 호스트 상자가 «두 선언을 뺀 사본» 과 2280·1600 에서 0.2px 이내로 같다(상수 0개)
 *   §R 되돌림시험 — 두 겹을 뺀 **사본**에서 토막이 실측값 그대로 되살아난다(+ 2280 음성항)
 *   §R2 겹 분리   — 419 만 빼도(T1) · 811 의 `#tuto` 만 빼도(T2) 일곱은 여전히 숨는다
 *                   = **두 겹이 각각 혼자서도 그 일곱을 지킨다** · `#ciw` 는 T2 에서 407 의 100% 로 돌아온다
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
   `#relw` 는 배경이 통째로 덮어 «토막» 이 원리적으로 안 생기는 자리(350 처방으로 유령을 기각했다).
   ⚑ 850 — `#ciw` 가 **이 목록에 없는 것**은 그대로다(419 는 그 자리를 안 건드린다). 다만 811 이
      자기 목록에 넣어 결과적으로 배너가 숨는다 — §2-c 가 그 사실을, §R2 가 407 의 자리를 잰다. */
const RULE_NEVER = ['#ciw', '#relw'];
/* ⚑ 850 — 두 번째 겹(작업 811). 목록을 손으로 안 적는다: 467 교훈대로 **제품에게 «그 모양의 선언» 을 묻는다.**
   줄바꿈이 섞여 있으므로 `[\s\S]` 로 잡는다. */
const RULE811 = (SRC.match(/#app:has\(:is\([\s\S]*?\)\.on\) :is\(#top,#tuto,#slots\)\{visibility:hidden\}/) || [''])[0];
/* 811 목록에서 id 만 뽑는다(줄바꿈·공백 제거) */
const RULE811_IDS = RULE811 ? (RULE811.match(/:is\(([\s\S]*?)\)\.on/) || ['', ''])[1].replace(/\s+/g, '').split(',').filter(Boolean) : [];
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
  /* ⚑ 467 — **0 은 «음성항» 이다**(위 다섯의 100 과 반대쪽 끝). 05 세부 팝업은 06 장비 시트에서만
     열리고 그 시트 `#eqw .eqp`(불투명 #000 · 폭 1080)가 배너 자리를 2280·1600 둘 다 100% 덮으므로
     **419 선언이 있든 없든 보임 0%** 다 ⇒ 토막이 원리적으로 안 생겨 목록에 넣을 이유가 없다.
     `probe351` D7 은 같은 자리를 «`#wpnGrid` 가 150px 덮는다» 로 내는데, 그것은 **안 보이는 요소와의
     기하 겹침**이다(자 쪽 몫으로 등재). 두 자가 같은 자리를 다르게 답하면 «찍힌 그림» 쪽이 이긴다(350 처방). */
  'eqslot:weapon': { 2280: 0, 1600: 0 },
};
/* ⚑ `tab:box`(89 유물)는 여기 없다 — 1회차에 자가 «토막 8.1px» 을 냈지만 **찍힌 픽셀은 0** 이었다
   (`#relw{background:#0D100D}`). 유령의 뿌리는 «세우고 → 연다» 순서였고(열림 연출 한복판에서 재면
   `#relw` 가 `opacity:0` 이라 불투명 상자에서 빠진다), 순서를 바로잡자 자에서도 사라졌다. */
const TOL = {};

/* 페이지 안에서 재는 자 — «불투명 상자» 판정·클리핑 접기·덮임 면적은 `probe351` D7 과 **한 벌**이다.
   같은 자리를 다른 자로 재면 값이 안 붙는다(LESSONS 351-⑨).
   ⚑ 476(2026-08-30) — 그 «한 벌» 이 오래 **말뿐이었다.** 여기 있던 사본은 «덮임 면적» 까지 세는데
   D7 은 «상자 ↔ 내비 세로 겹침» 만 재서, 같은 자리(05 장비 세부 팝업)를 두 자가 반대로 답했다
   (D7 «배너를 37px 덮는다» ↔ 여기 «배너 보임 0%» = 덮을 것이 애초에 없다). ⇒ 계산을
   `tools/cover351lib.js` 로 갈라 **두 자가 같은 함수를 페이지에 넣는다**(385 «자매 자 드리프트»).
   값은 한 칸도 안 바뀌었다 — 476 이 옮기기 전후로 §1·§2·§3·§R 전항을 대조했다. */
const { COVER_SRC } = require('./cover351lib');
const MEAS = function (opt) {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const tuto = document.getElementById('tuto');
  const vis = (el) => {
    const cs = getComputedStyle(el);
    return !(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0);
  };
  const cover = new Function('return (' + opt.coverSrc + ')')();
  const out = { frameH: Math.round(A.height), box: null, hidden: true, visPct: null, stub: null, disp: null, visb: null };
  if (opt.boxSel) {
    const b = document.querySelector(opt.boxSel);
    if (b && vis(b)) {
      const r = b.getBoundingClientRect();
      out.box = [Math.round((r.left - A.left) * 10) / 10, Math.round((r.top - A.top) * 10) / 10,
        Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
    }
  }
  /* ⚑ 850 — «어느 겹이 숨겼나» 를 말하려면 두 낱말을 다 찍어야 한다:
     419 는 `display:none`(상자까지 접는다) · 811 은 `visibility:hidden`(상자는 남긴다). */
  out.disp = tuto ? getComputedStyle(tuto).display : null;
  out.visb = tuto ? getComputedStyle(tuto).visibility : null;
  if (!tuto || !vis(tuto)) return out;
  out.hidden = false;
  const t = tuto.getBoundingClientRect();
  out.tutoY1 = Math.round((t.top - A.top) * 10) / 10;
  const c = cover(tuto, t);
  out.visPct = c.visPct;
  out.stub = c.stub;
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
  const m = await page.evaluate(MEAS, { boxSel: o && o.box ? o.box : null, coverSrc: COVER_SRC });
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
  /* ⚑ 467 — **`#wpnw` 는 일부러 «없다».** D7 이 «`#wpnGrid` 가 배너를 150px 덮는다» 를 내지만
     05 팝업은 06 장비 시트 위에서만 열리고 그 시트가 배너를 이미 100% 덮는다 ⇒ 토막이 0 이다.
     아래 §R 의 `eqslot:weapon` 음성항(사본에서도 보임 0%)이 그것을 매 실행 다시 잰다. */
  ok(!RULE.includes('#wpnw'),
    '467 — `#wpnw`(05 장비 세부)는 목록에 **없다** (뒤의 06 시트가 배너를 이미 100% 덮는다 — §R 음성항이 잰다)');
  ok(SRC.includes('#tuto{position:absolute;right:0;bottom:171px;width:460px;height:150px'),
    '배너 껍데기가 그대로다 (하단 앵커 · 460×150)');
  ok(/#tabbar\{flex:none;height:180px/.test(SRC), '탭바 180 그대로다 (배너 상변 산식의 재료)');
  ok(SRC.includes('#app.dunrun #tuto{display:none}'), '던전 런 숨김(선례)이 그대로 살아 있다');
  /* ── 850 — 두 번째 겹(811)을 등재한다 ─────────────────────────────────────
     이 세 항이 없으면 811 이 조용히 좁아지는 날 §2-c 만 빨개지고 «왜» 를 아무도 못 읽는다. */
  ok(!!RULE811 && SRC.split(RULE811).length === 2,
    '850 — 811 HUD 숨김 선언(`:is(#top,#tuto,#slots){visibility:hidden}`)이 소스에 정확히 한 번 있다',
    RULE811 || '(못 찾음)');
  ok(RULE811.includes('#tuto'),
    '850 — 811 목록이 `#tuto`(미션 트래커)를 **같이** 숨긴다 (주인 지시가 지목한 셋 중 하나)');
  ok(RULE_MUST.every((s) => RULE811_IDS.includes(s)),
    `850 — 811 의 ${RULE811_IDS.length}종이 419 의 일곱을 **전부 품는다** (겹이 겹인 근거 — 좁아지면 여기가 먼저 빨개진다)`,
    RULE_MUST.filter((s) => !RULE811_IDS.includes(s)).join(',') || '빠진 것 없음');
  ok(RULE811_IDS.includes('#ciw'),
    '850 — `#ciw`(33 재화 정보)는 419 목록에는 **없고** 811 목록에는 **있다** — §2-c 의 방향을 정하는 자리다');

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
  /* ⚑ 850 방향 전환 — 여기는 419 가 **안 건드리는** 자리인데(407 이 하단 여백으로 배너를 살려 뒀다),
     811(나중 주인 지시)이 `#ciw` 를 자기 목록에 넣어 «미션 트래커» 를 껐다. 333 처방대로 나중 지시가
     이긴다 ⇒ 묻는 것을 «배너가 살아 있는가» 에서 **«419 가 아니라 811 이 껐는가»** 로 옮겼다.
     ⚠ 두 낱말을 다 물어야 뜻이 남는다: `display` 는 419 가 안 건드렸으니 **`none` 이 아니어야** 하고
        (여기가 `none` 이 되면 누군가 `#ciw` 를 419 목록에 넣은 것이다 = §0 RULE_NEVER 와 짝),
        `visibility` 는 811 이 껐으니 **`hidden`** 이다. 407 이 만든 자리는 §R2 T2 가 잰다. */
  for (const cur of ['gold', 'dia']) {
    for (const H of [2280, 1600]) {
      const m = await shot(browser, { label: 'cur:' + cur, sel: `[data-cur="${cur}"]`, box: '#ciw>.ci' }, H);
      eq(`[2-c][${H}] cur:${cur} — 배너를 끈 것은 811 이다 (visibility)`, m.visb, 'hidden');
      ok(m.disp !== 'none', `[2-c][${H}] cur:${cur} — 419 는 이 자리를 여전히 안 건드린다 (display ${m.disp})`);
      ok(m.hidden, `[2-c][${H}] cur:${cur} — 그래서 배너는 «토막» 이 아니라 통째로 안 보인다 (850 · 811 이 덮었다)`);
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
  /* ⚑ 850 — 사본이 셋이다. 419 만 빼면 811 이 여전히 배너를 끄므로 «토막» 을 잴 수가 없다
     (그게 74건 빨강의 정체였다) ⇒ §3·§R 은 **두 겹을 다 뺀** 사본으로 재고,
     겹 하나씩만 뺀 사본 둘은 §R2 가 «각 겹이 혼자서도 지키는가» 를 재는 데 쓴다. */
  const strip811 = (s) => s.replace(RULE811, RULE811.replace(':is(#top,#tuto,#slots)', ':is(#top,#slots)'));
  const tmp = path.join(ROOT, `.v419-neg-${process.pid}.html`);        /* 둘 다 뺀 사본 */
  const tmp1 = path.join(ROOT, `.v419-neg419-${process.pid}.html`);    /* 419 만 뺀 사본 */
  const tmp2 = path.join(ROOT, `.v419-neg811-${process.pid}.html`);    /* 811 의 #tuto 만 뺀 사본 */
  ok(SRC.split(RULE).length === 2, '선언이 소스에 정확히 한 번 있다 (사본을 만들 수 있다)');
  ok(strip811(SRC) !== SRC, '850 — 811 목록에서 `#tuto` 만 뺀 사본을 만들 수 있다 (겹 분리 시험의 재료)');
  fs.writeFileSync(tmp, strip811(SRC).replace(RULE, ''));
  fs.writeFileSync(tmp1, SRC.replace(RULE, ''));
  fs.writeFileSync(tmp2, strip811(SRC));
  try {
  console.log('§3 Δ0px — 호스트 상자가 «두 겹을 뺀 사본» 과 한 픽셀도 안 다르다 (처방이 배경만 만졌다)');
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

  /* ── §R 되돌림 시험 — 두 겹을 뺀 사본에서 «토막» 이 되살아난다 (850) ───── */
  console.log('§R 되돌림 시험 — 두 겹(419·811)을 뺀 사본에서 토막이 실측값 그대로 되살아난다');
  for (const o of HOSTS) {
    const want = BEFORE[o.label];
    if (!want) continue;
    for (const H of PAIR) {
      const m = REV[o.label + '@' + H];
      ok(!m.hidden, `[R][${o.label}@${H}] 두 겹을 뺀 사본에서는 배너가 안 숨는다`);
      if (want[H] === 0) {
        /* ⚑ 467 음성항 — 이 자리는 **선언과 무관하게 0%** 다(뒤의 불투명 시트가 이미 다 덮는다).
           «토막» 이 원리적으로 안 생기므로 목록에 넣을 이유가 없다는 것을 매 실행 다시 잰다.
           ⚠ 여기가 0 이 아니게 되는 날은 진입 경로가 늘었다는 뜻이다 — 그때는 목록에 넣어야 한다. */
        eq(`[R-음성][${o.label}@${H}] 사본에서도 보임 0% (뒤 시트가 배너를 이미 100% 덮는다 = 토막 없음)`,
          m.visPct, 0);
      } else if (want[H] === 100) {
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
  /* ── §R2 겹 분리 시험(850) — 두 겹이 **각각 혼자서도** 그 일곱을 지킨다 ─────
     이 절이 이 수리가 «무르지 않다» 는 증거다. §R 이 두 겹을 한꺼번에 빼기 때문에,
     이것 없이는 «419 선언이 통째로 사라져도 §R 은 초록» 이 된다(334 가 잡은 바로 그 함정).
     ⚠ 한 항이라도 빨개지면 겹이 하나 걷힌 것이다 — 그때는 §2-c 의 방향을 다시 정하라. */
  console.log('§R2 겹 분리 시험(850) — 419 만 빼도 · 811 의 #tuto 만 빼도 그 일곱은 여전히 안 보인다');
  const LAYER = ['side:attend', 'side:bless', 'menu:bag', 'prof:19'];
  for (const lab of LAYER) {
    const o = HOSTS.find((h) => h.label === lab);
    const m1 = await shot(browser, o, 1600, tmp1);
    const m2 = await shot(browser, o, 1600, tmp2);
    eq(`[R2-a][${lab}@1600] 419 만 빼도 배너는 안 보인다 — 811 이 혼자 지킨다 (visibility)`, m1.visb, 'hidden');
    eq(`[R2-b][${lab}@1600] 811 의 #tuto 만 빼도 배너는 안 보인다 — 419 가 혼자 지킨다 (display)`, m2.disp, 'none');
  }
  /* 407 의 자리 — 419 목록 밖이라 811 을 걷으면 **하단 여백이 만든 «100% 보임» 이 그대로 돌아온다.**
     이 두 항이 407 의 투자가 제품에 살아 있다는 증거이고, §2-c 를 방향 전환하면서 비운 자리를 대신 채운다. */
  for (const H of PAIR) {
    const m2 = await shot(browser, { label: 'cur:gold', sel: '[data-cur="gold"]', box: '#ciw>.ci' }, H, tmp2);
    ok(!m2.hidden, `[R2-c][cur:gold@${H}] 811 을 걷으면 배너가 되살아난다 (407 이 만든 자리가 제품에 살아 있다)`);
    eq(`[R2-c][cur:gold@${H}] 되살아난 배너는 «토막» 이 아니라 온전한 100% 다 (407 의 하단 여백)`, m2.visPct, 100);
  }
  } finally { for (const f of [tmp, tmp1, tmp2]) { try { fs.unlinkSync(f); } catch (e) {} } }
  /* 콘솔 에러 0 */
  {
    const m = await shot(browser, { label: 'side:bless', sel: '.side .ibtn[data-pop="bless"]' }, 1600);
    eq('콘솔 에러 0건', m.errs.length, 0);
  }

  await browser.close();
  console.log(`\nVERIFY419 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
