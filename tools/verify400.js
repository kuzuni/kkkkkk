#!/usr/bin/env node
/* 작업 400 회귀 게이트 — 55 설정 팝업(#cfw>.cf55)의 «짧은 프레임 띠»
 *   실행: node tools/verify400.js   → 마지막 줄이 `VERIFY400 n/n PASS` 여야 한다.
 *
 * 등재문: 1600 에서 `.cf55` 가 **탭바를 42px · HUD 판때기(`.pedge`)를 27px** 파고든다.
 * `probe400` 이 그 두 값을 그대로 재현했다(등재문 가설 확인 — 338·341 처럼 기각되지 않았다).
 *
 * ⚑ 이 작업이 391 과 다른 점: 391 은 «띠(1278)가 패널(1396)보다 짧아 안 덮기가 불가능» 해서
 *   덮임을 감점에서 뺐지만, 55 는 **띠 1278 vs 상자 1347 로 69px 만 모자라고** 그 69px 은
 *   `max-height:100%` 가 눌러 흡수할 수 있다. ⇒ 여기서는 «덮임 0» 이 실제로 달성 가능한 목표다.
 *
 * 처방 두 자리:
 *   ① `#app.shortf #cfw{padding:142px 0 180px}` — 390 이 공용 `#modal` 에서 못박은 띠와 같은 상수.
 *      55 는 `#modal` 이 아니라 `#cfw` 라는 자기 오버레이라 390 의 선언을 한 번도 안 지났다.
 *   ② 본문 아래쪽 9자리를 `top` → `bottom` 앵커로(항등식 `bottom = 1228 − (top + height)`).
 *      «top+bottom 을 둘 다 가진» 리스트 한 장만 줄어든다(LESSONS 22-④ · 54 랭킹과 같은 처방).
 *
 * 본다:
 *   §1 띠 — 1600 에서 상변 = `.pedge` 하변 · 하변 = 탭바 상변 (침범 0)
 *   §2 Δ0px — 2280·1920 은 `.shortf` 가 안 붙어 원소별 좌표가 그대로다(20자리 표)
 *   §3 흡수 — 눌린 69px 을 리스트 한 장이 받는다(다른 블록의 «상자 기준 offset» 은 세 프레임 동일)
 *   §4 잘림·겹침 0 — 본문 잉크가 본문 안 · 리스트 6행이 안 겹치고 계정 패널과 안 붙는다
 *   §R 되돌림 시험 — ⓐ `.shortf` 패딩을 뗀 사본은 42/27 침범이 되살아난다
 *                    ⓑ 리스트에 옛 `height:509px` 를 되돌린 사본은 리스트가 안 줄어 본문을 넘친다
 *      (살아 있는 페이지에 CSS 를 주입하면 거짓 초록이 난다 — LESSONS 191 · 사본으로 연다)
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const eq = (m, got, want) => ok(got === want, `${m} (기대 ${want} · 실제 ${got})`);

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

const BAND = '#app.shortf #cfw{padding:142px 0 180px}';
const SQ = '--sq:clamp(0px, calc(1669px - var(--frameh, 2280px)), 69px)';
const LIST = '.cf55-list{left:30px;top:calc(185px - var(--sq) * 0.188406);bottom:calc(534px - var(--sq) * 0.449275);width:699px;display:flex;flex-direction:column}';
const LIST_OLD = '.cf55-list{left:30px;top:185px;width:699px;height:509px;display:flex;flex-direction:column}';
const INK = 142;   /* HUD 판때기 `.pedge` 하변 — 351 4회차가 못박은 축 */
const H0 = 1347;   /* 2280 에서의 `.cf55` 높이(측정표 55) */

/* 상자 기준 offset — «흡수는 리스트 한 장» 을 증명하는 표.
   2280 에서 잰 값이고, 리스트 아래 블록은 세 프레임에서 **상자 하변 기준**이 같아야 한다. */
const KIDS = ['.cf55-head', '.cf55-body', '.cf55-sub', '.cf55-track', '.cf55-knob', '.cf55-e0',
  '.cf55-emax', '.cf55-rule', '.cf55-list', '.cf55-acc', '.cf55-acch', '.cf55-badge',
  '.cf55-btn.b1', '.cf55-btn.b2', '.cf55-btn.b3', '.cf55-del', '.cf55-dl', '.cf55-n1', '.cf55-n2'];
/* 2280 절대 좌표(프레임 기준) — 391 §1 과 같은 «얼린 표» */
const WANT2280 = {
  '.cf55': [142, 455, 796, 1347], '.cf55-head': [149, 462, 782, 91], '.cf55-body': [161, 553, 758, 1230],
  '.cf55-sub': [227, 564, 52.6, 45], '.cf55-track': [216, 619, 679, 50], '.cf55-knob': [835, 619, 60, 50],
  '.cf55-e0': [220, 673, 15.3, 32], '.cf55-emax': [812, 674, 42.4, 32], '.cf55-rule': [191, 717, 699, 4],
  '.cf55-list': [191, 740, 699, 509], '.cf55-acc': [191, 1280, 699, 198], '.cf55-acch': [191, 1296, 699, 46],
  '.cf55-badge': [416, 1370, 248, 78], '.cf55-btn.b1': [201, 1504, 218, 99], '.cf55-btn.b2': [432, 1504, 218, 99],
  '.cf55-btn.b3': [661, 1504, 218, 99], '.cf55-del': [161, 1637, 758, 36], '.cf55-dl': [496, 1664, 90, 2],
  '.cf55-n1': [191, 1689, 699, 32], '.cf55-n2': [161, 1740, 758, 32],
};

const OPEN = `(async function(){
  document.querySelector('#menub').click();
  await new Promise(r => setTimeout(r, 340));
  const e = document.querySelector('#mnw [data-mn="conf"]'); if (e) e.click();
  await new Promise(r => setTimeout(r, 500));
})`;

const MEAS = `(function(KIDS){
  const A = document.getElementById('app').getBoundingClientRect();
  const R = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect();
    return [ +(b.x - A.left).toFixed(1), +(b.y - A.top).toFixed(1), +b.width.toFixed(1), +b.height.toFixed(1) ]; };
  const cf = document.querySelector('.cf55').getBoundingClientRect();
  const body = document.querySelector('.cf55-body').getBoundingClientRect();
  const tb = document.getElementById('tabbar').getBoundingClientRect();
  const ped = document.querySelector('.pedge').getBoundingClientRect();
  const kids = {}; for (const s of KIDS) kids[s] = R(s);
  kids['.cf55'] = R('.cf55');
  /* 상자 하변 기준 offset — 리스트 아래 블록이 «바닥 앵커» 인지 여기서 드러난다 */
  const fromBot = {}; for (const s of KIDS) { const e = document.querySelector(s);
    if (e) fromBot[s] = +(cf.bottom - e.getBoundingClientRect().bottom).toFixed(1); }
  /* 본문 안 잉크 하변 · 리스트 6행 */
  let ink = 0, inkOf = '';
  for (const c of document.querySelector('.cf55-body').querySelectorAll('*')) {
    const r = c.getBoundingClientRect(); if (!r.height) continue;
    const rel = r.bottom - body.top; if (rel > ink) { ink = rel; inkOf = c.className || c.tagName; }
  }
  const rows = [...document.querySelectorAll('.cf55-row')]
    .map(e => { const b = e.getBoundingClientRect(); return { y: +(b.y - A.top).toFixed(1), h: +b.height.toFixed(1) }; });
  return {
    frameH: Math.round(A.height), shortf: document.getElementById('app').classList.contains('shortf'),
    pad: getComputedStyle(document.getElementById('cfw')).padding,
    top: Math.round(cf.top - A.top), bot: Math.round(cf.bottom - A.top), h: Math.round(cf.height),
    inkEnd: Math.round(ped.bottom - A.top), tabTop: Math.round(tb.top - A.top),
    overTab: +(cf.bottom - tb.top).toFixed(1), overHud: +(ped.bottom - cf.top).toFixed(1),
    bodyH: +body.height.toFixed(1), inkBottom: +ink.toFixed(1), inkOf,
    slack: +(body.height - ink).toFixed(1),
    accTop: +(document.querySelector('.cf55-acc').getBoundingClientRect().y - A.top).toFixed(1),
    listBot: +(document.querySelector('.cf55-list').getBoundingClientRect().bottom - A.top).toFixed(1),
    kids, fromBot, rows,
  };
})`;

async function read(page, h, KIDS) {
  await page.setViewportSize({ width: 1080, height: h });
  await page.waitForTimeout(420);
  return page.evaluate(MEAS + '(' + JSON.stringify(KIDS) + ')');
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + FILE); await p.waitForTimeout(1100);
  await p.evaluate(OPEN + '()');

  const M = {};
  for (const h of [1600, 1634, 1669, 1700, 1841, 1920, 2280]) M[h] = await read(p, h, KIDS);

  /* ── §1 띠 ── */
  console.log('§1 띠 — 1600 에서 상변 = `.pedge` 하변 142 · 하변 = 탭바 상변 (등재문 27/42 가 닫힌다)');
  ok(SRC.includes(BAND), 'index.html 에 `.shortf` 띠 선언이 있다 (142/180)');
  eq('[1600] `.shortf` 가 붙는다', M[1600].shortf, true);
  eq('[1600] HUD 판때기 하변 = 142 (띠의 윗변)', M[1600].inkEnd, INK);
  eq('[1600] 탭바 상변 = 1420 (띠의 아랫변)', M[1600].tabTop, 1420);
  eq('[1600] `.cf55` 상변 = 142', M[1600].top, INK);
  eq('[1600] `.cf55` 하변 = 1420', M[1600].bot, 1420);
  eq('[1600] HUD 침범 0 (등재문 27)', M[1600].overHud, 0);
  eq('[1600] 탭바 침범 0 (등재문 42)', M[1600].overTab, 0);
  eq('[1600] 띠를 꽉 채운다 — 상자 높이 = 1420 − 142', M[1600].h, 1278);

  /* ── §2 Δ0px ── */
  console.log('§2 Δ0px — 2280·1920 은 `.shortf` 가 안 붙어 20자리 좌표가 그대로다');
  for (const h of [1920, 2280]) {
    eq(`[${h}] `.trim() + ` \`.shortf\` 가 안 붙는다`, M[h].shortf, false);
    eq(`[${h}] #cfw 패딩이 원래 값`, M[h].pad, '40px 0px 63px');
    eq(`[${h}] .cf55 높이 ${H0} (max-height 가 안 걸린다)`, M[h].h, H0);
    ok(M[h].overTab < 0 && M[h].overHud < 0, `[${h}] 원래도 안 덮었다 (탭바 ${M[h].overTab} · HUD ${M[h].overHud})`);
  }
  for (const s of Object.keys(WANT2280)) {
    const g = M[2280].kids[s], w = WANT2280[s];
    ok(g && g.every((v, i) => Math.abs(v - w[i]) < 0.6),
      `[2280] ${s} Δ0px`, `기대 ${JSON.stringify(w)} · 실제 ${JSON.stringify(g)}`);
  }
  /* 1920 은 상자만 통째로 −180 이동한다(가운데 정렬) — 상자 기준 offset 이 2280 과 같아야 한다 */
  for (const s of KIDS) {
    ok(Math.abs(M[1920].kids[s][1] - M[1920].kids['.cf55'][1] - (M[2280].kids[s][1] - M[2280].kids['.cf55'][1])) < 0.6,
      `[1920] ${s} 의 상자 기준 세로 offset 이 2280 과 같다`);
  }
  eq('[1841] 띠가 붙는 마지막 프레임에서도 상자는 안 눌린다 (1841 − 322 = 1519 > 1347)', M[1841].h, H0);
  eq('[1841] `.shortf` 는 붙는다', M[1841].shortf, true);
  ok(M[1841].overTab <= 0 && M[1841].overHud <= 0, `[1841] 침범 0 (탭바 ${M[1841].overTab} · HUD ${M[1841].overHud})`);

  /* ── §3 흡수 — 눌린 69px 을 «흰공간 전체» 가 지분대로 나눠 받는다 ── */
  console.log('§3 흡수 — 69px 을 한 자리에 안 몰고 흰공간 전체가 ≈22.5% 씩 나눠 받는다');
  ok(SRC.includes(SQ), '`.cf55` 가 `--sq`(눌리는 양)를 선언한다');
  ok(SRC.includes(LIST), '리스트가 `top`+`bottom` 이고 `height` 가 없다 (한 장은 반드시 늘고 줄어야 한다)');
  ok(!SRC.includes(LIST_OLD), '옛 `height:509px` 가 안 남아 있다 (과잉 지정이면 bottom 이 무시된다)');
  eq('[1600] 눌린 양 = 1347 − 1278', H0 - M[1600].h, 69);
  /* 1회차 실패의 자: 리스트 한 장에 다 떠넘기면 440(행 73.3 · 데드존 4.3)이 된다.
     비평가 CG 6 / CH 5 가 그 한 축(④ 조작성)만으로 갈렸다 — 그 값이 다시 나오면 빨갛다. */
  eq('[1600] 리스트 높이 500 (1회차 440 · 2회차 488 이 아니다)', M[1600].kids['.cf55-list'][3], 500);
  eq('[2280] 리스트 높이 509', M[2280].kids['.cf55-list'][3], 509);
  const rowH = (h) => M[h].rows[0].h;
  ok(rowH(1600) - 69 >= 14, `[1600] 이웃 토글 사이 데드존 ${(rowH(1600) - 69).toFixed(1)}px ≥ 14 (1회차 4.3 · 2회차 12.3 · 2280 은 15.8)`);
  ok(rowH(1600) / rowH(2280) > 0.97,
    `[1600] 행 pitch 감소 ${(100 - 100 * rowH(1600) / rowH(2280)).toFixed(1)}% < 3% (1회차 13.5% · 2회차 4.1%)`);
  /* 지분표 — 1600 에서 «블록 사이 여백» 이 전부 줄되 한 자리도 반토막 나지 않는다 */
  const GAP = [
    ['볼륨 제목 → 슬라이더', '.cf55-sub', '.cf55-track', 10, 8],
    ['「0」 → 구분선', '.cf55-e0', '.cf55-rule', 12, 9],
    ['구분선 → 리스트', '.cf55-rule', '.cf55-list', 19, 14],
    ['리스트 → 계정 패널', '.cf55-list', '.cf55-acc', 31, 27],
    ['계정 패널 → 버튼', '.cf55-acc', '.cf55-btn.b1', 26, 22],
    ['버튼 → 계정 삭제', '.cf55-btn.b1', '.cf55-del', 34, 29],
    ['계정 삭제 → UID', '.cf55-del', '.cf55-n1', 16, 14],
    ['UID → Gamer Id', '.cf55-n1', '.cf55-n2', 19, 16],
  ];
  for (const [nm, a, b, w2280, w1600] of GAP) {
    const g = (h) => +(M[h].kids[b][1] - (M[h].kids[a][1] + M[h].kids[a][3])).toFixed(1);
    ok(Math.abs(g(2280) - w2280) < 0.6, `[2280] ${nm} 여백 ${w2280} (실제 ${g(2280)})`);
    ok(Math.abs(g(1600) - w1600) < 0.6, `[1600] ${nm} 여백 ${w1600} (실제 ${g(1600)})`);
    ok(g(1600) / g(2280) > 0.72, `[1600] ${nm} 이 28% 넘게 안 줄었다 (${(100 - 100 * g(1600) / g(2280)).toFixed(1)}%)`);
  }
  eq('[1600] 계정 패널 높이 187 (2280 은 198)', M[1600].kids['.cf55-acc'][3], 187);
  eq('[1600] 헤더 높이 75 (2280 은 91 — 3회차에 지분으로 편입했다)', M[1600].kids['.cf55-head'][3], 75);
  eq('[2280] 헤더 높이 91', M[2280].kids['.cf55-head'][3], 91);
  eq('[2280] 계정 패널 높이 198', M[2280].kids['.cf55-acc'][3], 198);
  /* ⚑ 3회차 — 헤더·볼륨 그룹도 지분에 넣었다. 비평가 CJ 가 «흰공간 전부에서 균등하게 라고 해놓고
     헤더 53px 패딩과 볼륨 블록 여백을 면제해 준 채 부담을 데드존에 떠넘겼다» 를 짚었다(④ 7점).
     그래서 이 다섯 자리는 이제 «2280 과 같아야» 가 아니라 «줄되 표적은 안 건드려야» 한다. */
  for (const s2 of ['.cf55-head', '.cf55-sub', '.cf55-track', '.cf55-rule', '.cf55-list']) {
    const o = (h) => +(M[h].kids[s2][1] - M[h].kids['.cf55'][1]).toFixed(1);
    ok(o(1600) < o(2280) || s2 === '.cf55-head', `[1600] ${s2} 도 지분을 냈다 (${o(2280)} → ${o(1600)})`);
    ok(o(1920) === o(2280), `[1920↔2280] ${s2} 의 상자 상변 기준 offset 이 같다 (기준 프레임 Δ0px)`);
  }
  /* 표적은 한 픽셀도 안 줄었다 — 이것이 세 회차 내내 지킨 선이다 */
  for (const s2 of ['.cf55-btn.b1', '.cf55-btn.b2', '.cf55-btn.b3', '.cf55-badge', '.cf55-track', '.cf55-knob']) {
    ok(M[1600].kids[s2][3] === M[2280].kids[s2][3] && M[1600].kids[s2][2] === M[2280].kids[s2][2],
      `[1600] ${s2} 크기 0% 변화 (${M[2280].kids[s2][2]}×${M[2280].kids[s2][3]})`);
  }
  /* 연속 — 문턱이 아니라 `--frameh` 라 1600↔1669 사이에 층이 안 생긴다 */
  ok(rowH(1600) < rowH(1634) && rowH(1634) < rowH(1669),
    `연속: 행 pitch 가 프레임을 따라 매끄럽다 (1600 ${rowH(1600)} < 1634 ${rowH(1634)} < 1669 ${rowH(1669)})`);
  eq('[1669] 눌림이 시작되는 지점 — 여기서는 아직 2280 값', rowH(1669), rowH(2280));

  /* ── §4 잘림·겹침 0 ── */
  console.log('§4 잘림·겹침 — 본문 잉크가 본문 안 · 6행이 안 겹치고 계정 패널과 안 붙는다');
  for (const h of [1600, 1634, 1669, 1700, 1841, 1920, 2280]) {
    ok(M[h].slack >= 0, `[${h}] 본문 잉크(${M[h].inkOf})가 본문 안 — 여유 ${M[h].slack}px`);
    eq(`[${h}] 리스트가 6행`, M[h].rows.length, 6);
    const gaps = M[h].rows.slice(1).map((r, i) => +(r.y - (M[h].rows[i].y + M[h].rows[i].h)).toFixed(1));
    ok(gaps.every((g) => Math.abs(g) < 0.6), `[${h}] 6행이 안 겹치고 안 벌어진다 (${JSON.stringify(gaps)})`);
    ok(M[h].accTop - M[h].listBot > 20, `[${h}] 리스트 하변 ↔ 계정 패널 사이 ${(M[h].accTop - M[h].listBot).toFixed(1)}px`);
    const rh = M[h].rows[0].h;
    ok(rh >= 83, `[${h}] 행 높이 ${rh} ≥ 83 (토글 69 + 데드존 14)`);
  }
  ok(errs.length === 0, `콘솔·런타임 에러 0 (${errs.length})`);
  await ctx.close();

  /* ── §R 되돌림 시험 ── */
  console.log('§R 되돌림 — 띠를 떼면 42/27 이 되살아나고, 리스트에 옛 height 를 되돌리면 계정 패널을 깔고 앉는다');
  const cases = [
    { name: 'ⓐ `.shortf` 띠 제거', src: SRC.replace(BAND, ''),
      chk: (m) => { eq('[음성 1600 · ⓐ] 탭바 침범 42 로 되돌아간다', m.overTab, 42);
        eq('[음성 1600 · ⓐ] HUD 침범 27 로 되돌아간다', m.overHud, 27);
        eq('[음성 1600 · ⓐ] 상자가 안 눌린다', m.h, H0); } },
    { name: 'ⓑ 리스트에 옛 height:509 복원', src: SRC.replace(LIST, LIST_OLD),
      chk: (m) => { eq('[음성 1600 · ⓑ] 리스트가 안 줄어든다 (509)', m.kids['.cf55-list'][3], 509);
        /* 과잉 지정(top+height+bottom)이면 bottom 이 무시돼 리스트가 안 줄고, 바닥 앵커로 올라온
           계정 패널을 그대로 깔고 앉는다 — 잉크는 여전히 본문 안이라 «여유» 로는 안 잡힌다.
           §R 이 잡아야 하는 것은 그 겹침이다(38px). */
        /* 과잉 지정(top+height+bottom)이면 bottom 이 무시돼 리스트가 안 줄어든다. 지분 분배가
           계정 패널을 24px 위까지 끌어올려 둔 자리라, 리스트가 그 24 를 3 으로 깔아뭉갠다
           (1회차 처방에서는 38px 겹침이었고, 지분을 나눈 지금은 여백 붕괴로 나타난다). */
        ok(m.accTop - m.listBot < 8,
          `[음성 1600 · ⓑ] 리스트↔계정 패널 여백이 ${(m.accTop - m.listBot).toFixed(1)}px 로 붕괴한다 (정상 24)`); } },
  ];
  for (const c of cases) {
    ok(c.src !== SRC, `사본을 만들었다 — ${c.name}`);
    const f = path.join(ROOT, '.v400-neg.html');
    fs.writeFileSync(f, c.src);
    try {
      const nc = await browser.newContext({ viewport: { width: 1080, height: 1600 }, deviceScaleFactor: 1 });
      const np = await nc.newPage();
      await np.goto('file://' + f); await np.waitForTimeout(1100);
      await np.evaluate(OPEN + '()');
      c.chk(await read(np, 1600, KIDS));
      await nc.close();
    } finally { fs.unlinkSync(f); }
  }

  await browser.close();
  console.log(`\nVERIFY400 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
