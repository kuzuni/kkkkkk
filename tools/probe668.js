#!/usr/bin/env node
/* 668 재현 — «대량 소환이 1회씩 뽑은 것과 같은가» 를 **시드 고정 RNG 로 실제로 굴려서** 잰다
 *
 *   node tools/probe668.js
 *
 * 338 규칙: 처방을 따르기 전에 등재문의 가설을 재현으로 확인한다.
 * 등재문(주인 원문)은 «3000회 소환해도 … 1회씩 소환했을때 처럼 해당레벨 들에 맞게» 를 요구한다.
 * 이 자는 그 요구를 **말이 아니라 시퀀스**로 묻는다 — 같은 씨앗에서
 *   ⓐ «×N 한 번»  ⓑ «×1 을 N 번»  ⓒ 668 이전 알고리즘(경험치를 먼저 통째로 넣고 N 번 굴린다)
 * 셋을 굴려 뽑힌 종·레벨 궤적·경험치·잔액을 바이트로 비교한다.
 *
 * ⚑ ⓒ 가 이 자의 **핵심**이다. ⓒ 는 668 이전 제품 코드를 페이지 안에서 그대로 재현한 것이라
 *   ⓒ ≠ ⓑ 가 나오면 «결손이 실재했다» 는 재현이고(등재문 확인), ⓐ = ⓑ 가 나오면 «수리가 닫았다» 는
 *   증거다. 둘을 한 실행에서 같이 찍어야 «이미 참인 것을 게이트로 굳히는»(338 전례) 사고가 안 난다.
 *
 * 재는 것:
 *   [1] ⓐ vs ⓑ — 뽑힌 종 시퀀스·sumLv·sumExp·dia·summons·cnt 전부 동일한가 (수리의 자)
 *   [2] ⓒ vs ⓑ — 668 이전 알고리즘이 실제로 갈리는가 (결손의 재현 · 갈리는 첫 자리도 찍는다)
 *   [3] 배치 중 레벨업 경계에서 확률표가 «그 시점부터» 바뀌는가 (gradeProbs 딸깍)
 *   [4] 가격 선형성 — summonCost(b, n×m) = m × summonCost(b, n) (flat 규약 73④·195)
 *   [5] ×1000 성능 — 30,000 회가 프레임을 잡아먹지 않는가 (실측 ms)
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof BANNERS !== 'undefined' && typeof S !== 'undefined'
    && typeof doSummon === 'function' && typeof summonBatch === 'function');
  await page.waitForTimeout(300);
  return { ctx, page };
}

/* 페이지 안에 심는 공용 하네스 — 씨앗 고정 RNG · 상태 리셋 · 결과 가로채기.
   ⚠ 제품 코드는 한 줄도 안 고친다. `showSummonResult` 를 감싸 `res` 를 받아 적을 뿐이다. */
const HARNESS = () => {
  /* mulberry32 — 짧고 재현 가능한 32bit PRNG */
  window.__seed668 = s => {
    let a = s >>> 0;
    Math.random = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  window.__real668 = Math.random;
  window.__cap668 = [];
  const orig = window.showSummonResult;
  window.showSummonResult = function (b, times, res, lvUp) {
    window.__cap668.push(...res.map(r => r.it.id));
    /* 팝업·연출은 이 자의 관심이 아니다 — 그리지 않는다(3만 칸 렌더로 시간을 태우지 않게) */
  };
  window.__restore668 = () => { window.showSummonResult = orig; Math.random = window.__real668; };
  /* 같은 출발점을 만든다: 재화 넉넉 · 소환 레벨 1 · 도감 비움 · 경험치를 레벨업 경계 바로 앞에 */
  window.__reset668 = expOff => {
    S.dia = 1e12; S.relic = 1e12;
    /* 714 — 소환 레벨·경험치가 배너 칸으로 돌아왔다(496 공용 스칼라 폐지).
       리셋은 다섯 칸 전부, 읽기는 시험 대상 배너(`window.__b668`)에 건다. */
    BKEYS.forEach(k => { S.sum[k].lv = 1; S.sum[k].exp = Math.max(0, sumNeedExp(1) - expOff); });
    S.own = {};
    S.summons = 0;
    for (const k in S.cnt) if (/^sum/.test(k)) S.cnt[k] = 0;
    window.__cap668 = [];
  };
  window.__snap668 = () => ({
    lv: sumLv(window.__b668 || 'weapon'), exp: sumExp(window.__b668 || 'weapon'), dia: S.dia, summons: S.summons,
    cnt: S.cnt.sumEquip + S.cnt.sumSkill + S.cnt.sumPet + S.cnt.sumRelic, seq: window.__cap668.slice()
  });
  /* ⓒ — 668 **이전** 알고리즘의 재현(경험치를 통째로 먼저 넣고 N 번 굴린다).
     제품 함수를 부르지 않고 여기서 같은 순서를 다시 적는다: 제품이 고쳐졌으므로
     «옛 모습» 은 이 자 안에만 남는다(그래서 이 항은 수리 뒤에도 계속 결손을 재현한다). */
  window.__old668 = (b, times) => {
    sumAddExp(b, times);
    const out = [];
    for (let i = 0; i < times; i++) out.push(summonOne(b).it.id);
    return out;
  };
};

(async () => {
  const browser = await launch(chromium);
  const { ctx, page } = await open(browser);
  await page.evaluate(HARNESS);

  /* ⚠ 73 ③ — 가이드 소환 미션이 진행 중이면 `gmBlocked()` 가 **다른 배너를 통째로 막는다**
     (1회차에 이것을 몰라 [1] 이 «둘 다 0회» 로 헛초록·빨강이 섞여 나왔다). 지목된 배너가 있으면
     그것으로 잰다 — 제품의 가드를 끄지 않고 그 가드가 여는 문으로 들어가는 것이 옳다. */
  const B = await page.evaluate(() => (typeof gmBan === 'function' && gmBan()) || 'weapon');
  await page.evaluate(b => { window.__b668 = b; }, B);   /* 714 — 스냅숏이 읽을 배너 칸 */
  const N = 100;
  const EXPOFF = 5;   /* 5번째 뽑기에서 레벨업이 걸리게 — 배치 한복판의 경계 */

  /* ---------------- [1] ⓐ ×N 한 번  vs  ⓑ ×1 을 N 번 ---------------- */
  const r1 = await page.evaluate(({ B, N, EXPOFF }) => {
    window.__seed668(20260902); window.__reset668(EXPOFF);
    doSummon(B, N);
    const a = window.__snap668();
    window.__seed668(20260902); window.__reset668(EXPOFF);
    for (let i = 0; i < N; i++) doSummon(B, 1);
    const b = window.__snap668();
    let firstDiff = -1;
    for (let i = 0; i < Math.max(a.seq.length, b.seq.length); i++)
      if (a.seq[i] !== b.seq[i]) { firstDiff = i; break; }
    return { a, b, firstDiff };
  }, { B, N, EXPOFF });

  const same = (x, y) => x.lv === y.lv && x.exp === y.exp && x.dia === y.dia
    && x.summons === y.summons && x.cnt === y.cnt && x.seq.join(',') === y.seq.join(',');
  ok(r1.a.seq.length === N && r1.b.seq.length === N, '[1-a] 두 경로가 같은 횟수를 뽑는다',
    '×N=' + r1.a.seq.length + ' · ×1×N=' + r1.b.seq.length);
  ok(r1.firstDiff === -1, '[1-b] 뽑힌 종 시퀀스가 완전히 같다',
    r1.firstDiff === -1 ? '100/100 일치' : ('첫 불일치 i=' + r1.firstDiff));
  ok(same(r1.a, r1.b), '[1-c] 레벨·경험치·잔액·카운터가 전부 같다',
    'lv ' + r1.a.lv + '/' + r1.b.lv + ' · exp ' + r1.a.exp + '/' + r1.b.exp
    + ' · dia ' + r1.a.dia + '/' + r1.b.dia + ' · summons ' + r1.a.summons + '/' + r1.b.summons);
  ok(r1.a.lv > 1, '[1-d] [전제] 이 표본은 배치 한복판에서 실제로 레벨업한다',
    'lv 1 → ' + r1.a.lv + ' (경계를 안 넘으면 [1] 은 헛초록이 된다)');

  /* ---------------- [2] ⓒ 668 이전 알고리즘이 실제로 갈리는가(결손 재현) ---------------- */
  const r2 = await page.evaluate(({ B, N, EXPOFF }) => {
    window.__seed668(20260902); window.__reset668(EXPOFF);
    const old = window.__old668(B, N);
    window.__seed668(20260902); window.__reset668(EXPOFF);
    for (let i = 0; i < N; i++) doSummon(B, 1);
    const seq = window.__snap668().seq;
    let firstDiff = -1, n = 0;
    for (let i = 0; i < N; i++) { if (old[i] !== seq[i]) { n++; if (firstDiff < 0) firstDiff = i; } }
    return { firstDiff, n, old: old.slice(0, 8), seq: seq.slice(0, 8) };
  }, { B, N, EXPOFF });
  ok(r2.firstDiff >= 0, '[2-a] 668 이전 알고리즘은 «×1 을 N 번» 과 갈린다(결손 재현)',
    r2.firstDiff >= 0 ? ('첫 불일치 i=' + r2.firstDiff + ' · 어긋난 칸 ' + r2.n + '/' + 100)
                      : '차이 0 — 이 표본으로는 결손이 재현되지 않는다');
  ok(r2.n > 0, '[2-b] 어긋난 칸이 0 이 아니다', '어긋남 ' + r2.n + '칸');

  /* [2-c] ⚑ **결손의 크기**는 배치가 클수록 커진다 — 옛 알고리즘은 3,000 뽑기 **전부**를
     «다 뽑고 난 뒤의 레벨» 표로 굴린다. 등급 분포로 그 왜곡을 잰다(주인이 걱정한 «확률 문제»). */
  const r2c = await page.evaluate(({ B }) => {
    const N = 3000;
    window.__seed668(4242); window.__reset668(0);
    const p1 = gradeProbs(B).slice();          /* 순차가 첫 장에 쓰는 표(Lv 1) */
    const old = window.__old668(B, N);
    const pEnd = gradeProbs(B).slice();        /* 옛 알고리즘이 **첫 장부터** 쓰는 표(배치 종료 레벨) */
    const lvEnd = sumLv(window.__b668 || 'weapon');
    window.__seed668(4242); window.__reset668(0);
    doSummon(B, N);
    const seq = window.__snap668().seq;
    /* 두 표의 총변동거리 — 표본 잡음과 무관한 **구조적** 왜곡의 크기 */
    const tvd = p1.reduce((a, p, i) => a + Math.abs(p - pEnd[i]), 0) / 2;
    const dist = s => { const d = {}; s.forEach(id => { d[id] = (d[id] || 0) + 1; }); return d; };
    const dOld = dist(old), dSeq = dist(seq);
    const keys = [...new Set([...Object.keys(dOld), ...Object.keys(dSeq)])];
    const histDiff = keys.reduce((a, k) => a + Math.abs((dOld[k] || 0) - (dSeq[k] || 0)), 0);
    return { lv: lvEnd, n: N, tvd, histDiff,
             diff: old.reduce((a, id, i) => a + (id !== seq[i] ? 1 : 0), 0) };
  }, { B });
  ok(r2c.diff > 0 && r2c.tvd > 0,
    '[2-c] 3,000 뽑기에서 옛 알고리즘은 **첫 장부터** 종료 레벨의 표를 쓴다(결손의 크기)',
    '표 총변동거리 Lv1↔Lv' + r2c.lv + ' = ' + r2c.tvd.toExponential(3)
    + ' · 어긋난 칸 ' + r2c.diff + '/' + r2c.n + ' · 종별 도수차 합 ' + r2c.histDiff);

  /* ---------------- [3] 배치 중 레벨업 경계에서 확률표가 바뀌는가 ---------------- */
  const r3 = await page.evaluate(({ B, EXPOFF }) => {
    window.__seed668(7); window.__reset668(EXPOFF);
    const before = gradeProbs(B).slice();
    const lv0 = sumLv(window.__b668 || 'weapon');
    sumAddExp(B, EXPOFF);                    /* 경계를 정확히 넘긴다 */
    const after = gradeProbs(B).slice();
    return { lv0, lv1: sumLv(window.__b668 || 'weapon'), before, after };
  }, { B, EXPOFF });
  const moved = r3.before.some((p, i) => Math.abs(p - r3.after[i]) > 1e-12);
  ok(r3.lv1 === r3.lv0 + 1, '[3-a] [전제] 경계에서 레벨이 정확히 한 칸 오른다', r3.lv0 + ' → ' + r3.lv1);
  ok(moved, '[3-b] 그 순간 등급 확률표가 실제로 바뀐다(딸깍)',
    'Δp0 = ' + (r3.after[0] - r3.before[0]).toExponential(3));

  /* ---------------- [4] 가격 선형성 ---------------- */
  const r4 = await page.evaluate(() => {
    const out = {};
    for (const b in BANNERS) {
      out[b] = [1, 10, 100, 1000].map(m => ({
        m, c10: summonCost(b, 10 * m), c30: summonCost(b, 30 * m),
        lin10: m * summonCost(b, 10), lin30: m * summonCost(b, 30)
      }));
    }
    return out;
  });
  let linBad = [];
  for (const b in r4) for (const r of r4[b])
    if (r.c10 !== r.lin10 || r.c30 !== r.lin30) linBad.push(b + '×' + r.m);
  ok(!linBad.length, '[4] 가격이 배수에 정확히 선형이다(flat 규약 73④·195)',
    linBad.length ? linBad.join(' ') : Object.keys(r4).length + '배너 × 4배수 전부 선형');

  /* ---------------- [5] ×1000 성능 ---------------- */
  const r5 = await page.evaluate(({ B }) => {
    window.__seed668(11); window.__reset668(0);
    const t0 = performance.now();
    doSummon(B, 30000);                       /* 30회 × ×1000 = 최악 */
    const ms = performance.now() - t0;
    return { ms, n: window.__cap668.length, lv: sumLv(window.__b668 || 'weapon') };
  }, { B });
  ok(r5.n === 30000, '[5-a] 30,000 회가 전부 굴러간다', '뽑힌 수 ' + r5.n + ' · 최종 Lv ' + r5.lv);
  ok(r5.ms < 2000, '[5-b] 30,000 회가 2초 안에 끝난다(프레임 예산)', r5.ms.toFixed(1) + 'ms');

  await page.evaluate(() => window.__restore668());
  await ctx.close(); await browser.close();
  console.log('\nprobe668: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
