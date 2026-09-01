/* 작업 498 재현 프로브 — «첫날 환영 100만 다이아 + 2일차 이후 수급 곡선»
 *
 *   node tools/probe498.js
 *
 * 338·341·350·372·464 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * (338·341·377 은 여기서 등재문이 기각됐고, 350·363·455·464 는 확인됐다. 어느 쪽인지는 제품만 안다.)
 *
 * 등재문(PROGRESS 498)이 «첫날 100만» 을 쪼갠 여섯 자리:
 *   ⓐ 환영 우편 20만            → `MAILS` 5통의 `c`
 *   ⓑ 가이드 미션 10개 × 5만    → `GUIDE[].dia`
 *   ⓒ 출석 1일차 10만           → `ATTEND[0].dia`
 *   ⓓ 첫 승급전 클리어 10만     → `endPromo(true)`
 *   ⓔ 첫날 스테이지 30 도달 미션 5만
 *   ⓕ 소환 «첫 10연 무료» 5배너 ≈5만 (`summonCost` 첫 회 0 · 플래그 `S.firstFree[b]`)
 *
 * 이 자가 묻는 것 — ⓔ·ⓕ 는 **자리가 실재하는가**(등재문이 코드를 안 보고 적은 자리인가):
 *   [1] GUIDE 에 «스테이지 30» 미션이 있는가 · 체인의 스테이지 축은 무엇인가
 *   [2] `S.firstFree` / «첫 회 무료» 플래그가 저장소에 있는가 · 10연 정가는 얼마인가 ·
 *       이미 있는 무료 10연(`SHOP_FREE`)이 하루 몇 회인가 = ⓕ 가 **새로 만드는 다이아**가 얼마인가
 *   [3] 첫날 네 자리(ⓐⓑⓒⓓ)의 **지금 값** 합계
 *   [4] 정상 하루 수급 — `S.dia +=` 하는 **모든 경로**를 출처별로 세운 기대치 표(처방 ⓑ)
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455·464 규약).
 *   구조 축([1][2])은 수리 전·후 둘 다 같은 답이고(제품을 안 바꾸는 자리다),
 *   갈리는 것은 [3] 의 **합계**(수리 전 ≈2만 → 수리 후 100만)뿐이라 그 항만 `info` 로 찍는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};
const fmtN = n => (n == null ? '?' : Number(n).toLocaleString('en-US'));

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);                                /* 새 세이브 — 첫날을 재는 자라 주입하지 않는다 */
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof GUIDE !== 'undefined');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.step = () => {}; });
  return { page, errs };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */

  const browser = await launch(chromium);
  const { page, errs } = await boot(browser);

  /* ------------------------------------------------------------------ */
  blk('[1] 등재문 ⓔ — «첫날 스테이지 30 도달 미션» 은 실재하는가');
  const g = await ev(page, () => ({
    n: GUIDE.length,
    v: GUIDE_V,
    names: GUIDE.map(m => m.n),
    stages: GUIDE.map((m, i) => ({ i, n: m.n })).filter(m => /스테이지/.test(m.n)),
    dias: GUIDE.map((m, i) => ({ i, n: m.n, dia: typeof m.dia === 'function' ? m.dia() : (m.dia || 0),
                                 fn: typeof m.dia === 'function' })),
  }));
  if (g) {
    ok(!g.names.some(n => /스테이지 30/.test(n)),
       '[1-a] GUIDE 에 «스테이지 30 도달» 미션은 **없다** — 등재문 ⓔ 는 코드에 자리가 없는 항목이다',
       '스테이지 축 = ' + g.stages.map(s => 'idx' + s.i + ' ' + s.n).join(' · '));
    info('[1-b] GUIDE 미션 수 · 버전 («순서·개수 절대 변경 금지» — 61/73/256 규약)', g.n + '개 · GUIDE_V ' + g.v);
    ok(g.n === 20, '[1-c] 미션 수 20 — «10개» 가 아니라 체인 전체가 첫날 온보딩 구간이다', g.n + '개');
    info('[1-d] `dia` 가 함수인 미션(73 ② — 다음 소환 10연을 감당해야 하는 자리)',
         g.dias.filter(d => d.fn).map(d => 'idx' + d.i + '(' + fmtN(d.dia) + ')').join(' · '));
  }

  /* ------------------------------------------------------------------ */
  blk('[2] 등재문 ⓕ — «첫 10연 무료» 가 새로 만드는 다이아는 얼마인가');
  const s = await ev(page, () => ({
    firstFreeInS: Object.prototype.hasOwnProperty.call(S, 'firstFree'),
    banners: BKEYS.map(b => ({ b, c10: summonCost(b, 10) })),
    shopFree: SHOP_FREE,
    boxes: SHOP_BOXES.length,
    freeLeft: BKEYS.map(b => (S.daily && S.daily.free ? (S.daily.free[b] == null ? SHOP_FREE : S.daily.free[b]) : null)),
  }));
  const firstFreeSrc = (code.match(/firstFree/g) || []).length;
  if (s) {
    ok(!s.firstFreeInS && firstFreeSrc === 0,
       '[2-a] `S.firstFree` 플래그는 저장소에 **0건** — 등재문 ⓕ 는 새로 만들어야 하는 시스템이다',
       '제품 줄 ' + firstFreeSrc + '건');
    const c10 = s.banners.reduce((n, b) => n + b.c10, 0);
    info('[2-b] 10연 정가(배너별)', s.banners.map(b => b.b + ' ' + fmtN(b.c10)).join(' · '));
    ok(c10 < 50000,
       '[2-c] 5배너 10연 **정가 합** = ' + fmtN(c10) + ' — 등재문의 «≈5만» 과 자릿수가 다르다(1/' + Math.round(50000 / c10) + ')',
       fmtN(c10) + ' 다이아');
    ok(s.shopFree > 0,
       '[2-d] 무료 10연은 **이미 매일** 있다(`SHOP_FREE`) — 상자마다 하루 ' + s.shopFree + '회 × ' + s.boxes + '상자',
       '하루 ' + (s.shopFree * s.boxes) + '회 = 정가 환산 ' + fmtN(s.shopFree * c10) + ' 다이아/일');
    info('[2-e] ⇒ ⓕ 가 **새로 만드는 다이아**', '0 (무료 10연은 원래 다이아를 안 쓴다 · 첫 회를 또 무료로 해도 잔고는 그대로)');
  }

  /* ------------------------------------------------------------------ */
  blk('[3] 첫날 네 자리(ⓐⓑⓒⓓ)의 «지금 값»');
  const d1 = await ev(page, () => {
    const mail = MAILS.reduce((n, m) => n + (m.c || 0), 0);
    const gm = GUIDE.reduce((n, m) => n + (typeof m.dia === 'function' ? m.dia() : (m.dia || 0)), 0);
    const att1 = ATTEND[0] ? ATTEND[0].dia : 0;
    const promo = typeof FIRST_PROMO_DIA === 'number' ? FIRST_PROMO_DIA : 0;
    const day1 = typeof DAY1_DIA === 'number' ? DAY1_DIA : 0;
    return { mail, gm, att1, promo, day1, mails: MAILS.map(m => ({ id: m.id, c: m.c || 0 })) };
  });
  const promoDia = (code.match(/FIRST_PROMO_DIA/g) || []).length;
  if (d1) {
    info('[3-a] 환영 우편 5통 합 (ⓐ 목표 200,000)', fmtN(d1.mail) + ' — ' + d1.mails.map(m => m.id + ':' + fmtN(m.c)).join(' · '));
    info('[3-b] 가이드 미션 20개 합 (ⓑ)', fmtN(d1.gm));
    info('[3-c] 출석 1일차 (ⓒ 목표 100,000)', fmtN(d1.att1));
    info('[3-d] 첫 승급전 보상 (ⓓ 목표 100,000) — `FIRST_PROMO_DIA`', fmtN(d1.promo) + ' · 제품 줄 ' + promoDia + '건');
    const tot = d1.mail + d1.gm + d1.att1 + d1.promo;
    info('[3-e] ⇒ 첫날 합계 (수리 전 25,480 → 수리 후 1,000,000 — 트리에 따라 갈리는 유일한 축)',
         fmtN(tot) + (d1.day1 ? ' / 선언 ' + fmtN(d1.day1) : ''));
  }

  /* ------------------------------------------------------------------ */
  blk('[4] 정상 하루 수급 — `S.dia +=` 경로 전수(처방 ⓑ)');
  const day = await ev(page, () => {
    const roulEv = ROULETTE.reduce((n, r) => n + r.dia * r.w, 0) / 100;
    const adDia = COIN_ADS.filter(a => a.r && a.r.dia).reduce((n, a) => n + a.r.dia * a.cap, 0);
    const dq = DQUESTS.reduce((n, q) => n + q.dia, 0);
    const att = ATTEND.reduce((n, a) => n + (a.dia || 0), 0);
    const diaDun = DUNGEONS.find(d => d.id === 'dia');
    const dunAt = f => (diaDun.rw(f).dia || 0);
    const q22 = s => QUESTS.reduce((n, q) => n + (q.rw(s).c || 0), 0);
    return {
      roulEv, roulTry: ROUL_TRY, adDia, dq,
      /* 498 — 반복 수급 표에서 «1일차 환영 칸» 은 뺀다(첫날 축이지 하루 축이 아니다) */
      attSum: att - (ATTEND[0] ? ATTEND[0].dia : 0), attN: ATTEND.length - 1,
      attPassFree: PASS_TABS.att.rw(0, 0).n, attPassFree2: PASS_TABS.att.rw(1, 0).n,
      passFree: [0, 5, 11, 19, 29, 39].map(i => ({ i, n: PASS_CUR[0].n(i) })),
      passN: PASS_N, passStep: PASS_STEP, towerN: PASS_TOWER_N,
      dunTry: DUN_TRY, dun: [1, 5, 10, 20].map(f => ({ f, n: dunAt(f) })),
      /* ⚑ 712 — 옛 사본 `offH: OFF_MAX_H, offPerMin: 3` 은 199 21회차(결3 ⓑ)가 `OFF_MAX_H` 를
         선언째 걷어낸 뒤 `ReferenceError` 로 죽어 §4 가 통째로 조용히 사라졌다(자는 6/6 초록).
         자르는 축은 하루 예산 `OFF_DAY_CAP_MIN`(분) 하나이고 분당 지급은 `OFF_DIA_PM` 이다
         — «분당 3» 도 199 2회차(48)·21회차(75) 이전의 낡은 사본이라 같이 갈았다. */
      offCapMin: OFF_DAY_CAP_MIN, offPerMin: OFF_DIA_PM,
      q22: [0, 3, 6, 10].map(st => ({ st, n: q22(st) })),
    };
  });
  /* ⚑ 712 위생 — 절이 통째로 비면 그것 자체가 한 항의 실패다(278·319 처방).
     머리말이 «예외는 그 블록만 빨갛게» 라고 적어 두고도 실제로는 조용히 넘어가고 있었다. */
  ok(day !== null, '[4-0] §4 가 실제로 돌았다 (evaluate 예외 0건)',
     day !== null ? '' : '`ev` 가 예외를 삼켜 [4-a]·[4-b] 와 출처별 표가 통째로 사라졌다');
  if (day) {
    const roul = Math.round(day.roulEv * day.roulTry);
    const off = day.offCapMin * day.offPerMin;
    const attAvg = Math.round(day.attSum / day.attN);
    const dun10 = day.dunTry * day.dun.find(d => d.f === 10).n;
    info('룰렛      ', fmtN(roul) + '/일 (기대값 ' + day.roulEv + ' × ' + day.roulTry + '회)');
    info('광고 상품 ', fmtN(day.adDia) + '/일 (보석 칸 × cap)');
    info('일일 퀘스트', fmtN(day.dq) + '/일 (5종 전부 수령)');
    info('22 반복 퀘스트', day.q22.map(q => 'step' + q.st + ' ' + fmtN(q.n)).join(' · ') + ' (5종 한 바퀴)');
    info('출석      ', fmtN(attAvg) + '/일 평균 (' + day.attN + '일 합 ' + fmtN(day.attSum) + ')');
    info('출석 패스 ', fmtN(day.attPassFree2) + '/일 무료 칸 (1일차만 ' + fmtN(day.attPassFree) + ')');
    info('스테이지 패스', day.passFree.map(p => '단계' + (p.i + 1) + ' ' + fmtN(p.n)).join(' · ')
        + ' (무료 칸 · ' + day.passStep + '스테이지마다 · ' + day.passN + '단)');
    info('탑 패스 ×2', '같은 곡선 · 각 ' + day.towerN + '단 (레벨 1칸 = 1단계)');
    info('수정 광산 ', day.dun.map(d => 'f' + d.f + ' ' + fmtN(d.n)).join(' · ') + ' × 입장권 ' + day.dunTry + '장/일');
    info('오프라인  ', fmtN(off) + '/일 (하루 예산 ' + fmtN(day.offCapMin) + '분 × 분당 ' + day.offPerMin + ')');
    const core = roul + day.adDia + day.dq + attAvg + day.attPassFree2 + dun10 + off;
    ok(core > 0, '[4-a] 반복 수급 «바닥» 합계(룰렛+광고+일퀘+출석+출석패스+수정광산f10+오프라인)',
       fmtN(core) + '/일');
    ok(core < 200000, '[4-b] 목표 20만/일과의 배수 — 지금은 **' + (200000 / core).toFixed(1) + '배 모자라다**',
       fmtN(core) + ' vs 200,000');
  }

  blk('[5] 콘솔');
  ok(errs.length === 0, '[5-a] 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE498 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
