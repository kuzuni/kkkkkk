#!/usr/bin/env node
/* 470 검증 — «Lv» 글자 잘림: 등재 자리는 초록이고, 스캐너의 스코프가 다시 좁아지지 않는다.
 * (주인 보고 2026-08-30 «소환팝업쪽에 레벨들 글씨가 잘려보임»)
 *
 *   node tools/verify470.js   →  마지막 줄이 `VERIFY470 n/n PASS` 여야 한다.
 *
 * ⚑ **이 자가 무엇을 지키는지 먼저 읽어라.** 470 은 제품을 0줄 고쳤다 — 재현이 등재문을
 * 기각했기 때문이다(338·341 선례). 그러면 «이미 참인 것을 게이트로 굳히는» 헛초록이
 * 되기 쉬우므로(338 이 등재문 처방을 그대로 따랐으면 그랬을 자리), 이 자는 **값이 아니라
 * 스코프를 지킨다**:
 *
 *   [A] 스코프 — `scan470.SCREENS` 54화면의 **문이 전부 살아 있다**(못 여는 문 0).
 *       397 이 «스캐너가 출석 패스 탭을 한 번도 안 열었다» 로 걸린 자리이고, 470 1~3회차가
 *       26화면만 보고 «전수» 라고 적었던 자리다. 문이 죽으면 검사는 **실패가 아니라 없던 일**이
 *       되므로(smoke 351-13회차 교훈) 여기서 **빨개져야 한다**. 화면 수 하한도 같이 못박는다.
 *   [B] 등재 자리 — 주인이 지목한 **소환 계열 3화면**(10 상점 소환 탭 · 11 확률 팝업 ·
 *       12 결과 팝업)의 «Lv» 노드가 [C]하드클립·[B]테두리물림·[S]획파먹힘 **어느 축에도
 *       안 걸린다**. 이것이 «그 자리는 정상이다» 의 게이트다.
 *   [C] 래칫 — 전수 하드 클립은 **21 도감 `.cd > i.cl2` 여섯 탭뿐**이다(REMAIN = 6).
 *       그 밖의 자리에서 새 클립이 생기면 빨개진다. 21 도감 건은 별도 번호(487)로 등재돼
 *       있으므로 여기서 고치지 않되, **늘어나는 것은 막는다**.
 *   [S] 획 — «Lv» 노드 전수에서 `-webkit-text-stroke` 를 쓰면서 `paint-order:stroke fill`
 *       이 빠진 자리 0건(등재문 처방 ② — 손댈 것이 없음을 못박는다).
 *   [R] 되돌림 시험 — 자가 무른지 시험한다. 자 자신을 못 믿으면 위 셋은 전부 무의미하다:
 *       R1 소환 배너 알약(`.clv`)을 강제로 좁히면 [B] 가 **빨개진다**(양성 통제).
 *       R2 21 도감 카드의 클리핑을 풀면 [C] 의 REMAIN 이 **6 → 0 으로 떨어진다**
 *          (탐지기가 실제로 그 자리를 보고 있다 — 상수를 세고 있는 게 아니다).
 *   [H] 페이지 에러 0.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, RAISE, SCAN, classify } = require('./scan470.js');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 등재문이 지목한 자리 = 주인 원문의 «소환팝업쪽» */
const SUMMON = ['10 상점(소환)', '11 소환 확률', '12 소환 결과'];
/* 래칫 — 지금 남아 있는 하드 클립은 21 도감 한 부품(6탭)뿐이고 별도 번호(487)로 등재돼 있다 */
const REMAIN = 6;
const REMAIN_SEL = 'i.cl2';
const REMAIN_SCREEN = /^21 도감/;

/* 한 화면을 열고 스캔한다 — `scan470` 의 본체와 같은 순서다(문 → RAISE → renderAll → SCAN). */
async function scanScreen(p, name, steps, extra, extraCss) {
  await p.reload();
  await p.waitForTimeout(700);
  if (extraCss) await p.addStyleTag({ content: extraCss });
  await p.evaluate(RAISE);
  for (const s of steps) {
    const done = await p.evaluate((sel) => {
      const el = document.querySelector(sel); if (!el) return false;
      el.click(); return true;
    }, s).catch(() => false);
    if (!done) return null;                      /* 문이 죽었다 — null 이 곧 [A] 의 실패다 */
    await p.waitForTimeout(420);
  }
  if (extra) await p.waitForTimeout(extra);
  await p.evaluate(RAISE);
  await p.evaluate(() => { try { renderAll && renderAll(); } catch (e) {} });
  await p.waitForTimeout(320);
  return await p.evaluate(SCAN);
}

/* ⚑ 분류는 `scan470` 에서 **가져다 쓴다** — 두 벌 적으면 조용히 갈라진다.
   4회차에 실제로 그랬다: 자를 새로 적으면서 «스크롤로 닿는 밖» 을 클립으로 세는 바람에
   스캐너는 6건, 자는 299건을 냈다. 정의가 하나여야 자가 스캐너를 지킬 수 있다. */

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForTimeout(900);

  /* ── 전수 1회 — [A]·[B]·[C]·[S] 가 이 한 바퀴를 나눠 읽는다 ─────────────── */
  console.log('[A] 스코프 — scan470 의 문 ' + SCREENS.length + '개가 전부 살아 있는가');
  const dead = [], all = [];
  let nodes = 0;
  for (const [name, steps, extra] of SCREENS) {
    const rows = await scanScreen(p, name, steps, extra);
    if (rows === null) { dead.push(name); continue; }
    nodes += rows.length;
    all.push([name, rows]);
  }
  ok(dead.length === 0, 'A1 못 여는 문 0',
    dead.length ? '죽은 문 ' + dead.length + '건 — ' + dead.join(' · ')
                : SCREENS.length + '화면 전부 열림 · «Lv» 노드 ' + nodes);
  /* 하한을 못박는다 — 목록이 줄면(누가 화면을 지우면) 위 A1 은 여전히 초록이다 */
  ok(SCREENS.length >= 54, 'A2 화면 목록 하한 54', SCREENS.length + '화면');
  ok(nodes >= 500, 'A3 «Lv» 노드 하한 500', nodes + '개 (1~3회차 26화면은 267개였다)');
  /* 주인이 지목한 계열이 목록 안에 실제로 있는가 — 이름이 바뀌면 [B] 가 조용히 0건이 된다 */
  for (const s of SUMMON)
    ok(all.some(([n]) => n === s), 'A4 소환 계열 «' + s + '» 이 스캔 목록에 있다');

  /* ── [B] 등재 자리 = 소환 계열 3화면 ───────────────────────────────── */
  console.log('\n[B] 등재 자리 — 소환 계열 3화면의 «Lv» 는 세 축 전부 초록');
  let sumNodes = 0;
  for (const s of SUMMON) {
    const hit = all.find(([n]) => n === s);
    if (!hit) { ok(false, 'B «' + s + '» 스캔 결과 없음'); continue; }
    const { C, B, S } = classify(hit[1]);
    sumNodes += hit[1].length;
    const worst = hit[1].reduce((m, r) => Math.min(m, r.pad[0], r.pad[1]), 999);
    ok(C.length === 0 && B.length === 0 && S.length === 0,
      'B «' + s + '» 클립·물림·획 0',
      '노드 ' + hit[1].length + ' · 클립 ' + C.length + ' · 물림 ' + B.length
      + ' · 획 ' + S.length + ' · 최소 좌우 여백 ' + (worst === 999 ? '—' : worst.toFixed(1) + 'px'));
  }
  ok(sumNodes > 0, 'B4 소환 계열이 실제로 «Lv» 를 그린다', '노드 ' + sumNodes
    + '개 (0 이면 위 초록은 «아무것도 안 본» 초록이다)');

  /* ── [C]·[S] 전수 래칫 ──────────────────────────────────────────────── */
  console.log('\n[C] 전수 래칫 — 하드 클립은 21 도감 한 부품(6탭)뿐');
  const allC = [], allS = [];
  for (const [name, rows] of all) {
    const { C, S } = classify(rows);
    C.forEach(r => allC.push({ name, ...r }));
    S.forEach(r => allS.push({ name, ...r }));
  }
  const foreign = allC.filter(r => !(REMAIN_SCREEN.test(r.name) && r.sel === REMAIN_SEL));
  ok(foreign.length === 0, 'C1 21 도감 밖의 하드 클립 0',
    foreign.length ? foreign.map(r => r.name + '/' + r.sel).join(' · ')
                   : '전수 ' + all.length + '화면에서 새 클립 없음');
  /* 래칫은 «자리» 로 센다 — `scan470` 의 출력과 같은 열쇠(화면|노드|문자열)로 접는다.
     같은 부품이 한 탭에 카드 수만큼(21 도감은 22칸) 찍히므로 원시 행수로 세면 래칫이
     «칸이 몇 개인가» 를 따라 흔들린다. 새 자리가 생기는 것을 막는 게 이 항의 일이다. */
  const sites = new Set(allC.map(r => r.name + '|' + r.sel + '|' + r.txt));
  ok(sites.size <= REMAIN, 'C2 래칫 REMAIN ≤ ' + REMAIN,
    '지금 ' + sites.size + '자리 / 원시 ' + allC.length + '행'
    + ' (전부 21 도감 .cd > i.cl2 — 별도 번호 487 로 등재)');
  ok(allS.length === 0, 'S1 paint-order 빠진 «Lv» 노드 0',
    allS.length ? allS.map(r => r.name + '/' + r.sel).join(' · ') : '전수 0건 — 등재문 처방 ② 는 손댈 것이 없다');

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 이 자가 실제로 그 자리를 보고 있는가');

  /* R1 — 소환 배너 알약을 강제로 좁히면 [B] 가 빨개져야 한다(양성 통제) */
  {
    const hit = SCREENS.find(([n]) => n === '10 상점(소환)');
    const rows = await scanScreen(p, hit[0], hit[1], hit[2],
      '.shp-card .clv{width:36px!important;min-width:0!important;padding:0!important;overflow:hidden!important}');
    const bad = rows ? classify(rows) : null;
    ok(!!bad && (bad.C.length > 0 || bad.B.length > 0),
      'R1 알약을 36px 로 좁히면 소환 배너가 빨개진다',
      bad ? '클립 ' + bad.C.length + ' · 물림 ' + bad.B.length + ' (0/0 이면 이 자는 아무것도 안 본다)' : '스캔 실패');
  }

  /* R2 — 21 도감의 클리핑을 풀면 REMAIN 이 6 → 0 으로 떨어져야 한다 */
  {
    const hit = SCREENS.find(([n]) => n === '21 도감(스킬)');
    const rows = await scanScreen(p, hit[0], hit[1], hit[2], '.cd{overflow:visible!important}');
    const c = rows ? classify(rows).C.length : -1;
    ok(c === 0, 'R2 `.cd{overflow:visible}` 로 풀면 21 도감 클립이 사라진다',
      '클립 ' + c + '건 (풀어도 남으면 탐지기가 다른 것을 세고 있다)');
  }

  /* ── [H] ─────────────────────────────────────────────────────────────── */
  console.log('');
  ok(errs.length === 0, 'H 페이지 에러 0', errs.length ? errs.slice(0, 2).join(' | ') : '');

  await browser.close();
  const n = pass + fail;
  console.log('\nVERIFY470 ' + pass + '/' + n + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
