#!/usr/bin/env node
/* 작업 598 재현 — 「스프라이트 뒤집힘 빈도」 축에 재현성이 없다
 *
 *   node tools/probe598.js            (전 절)
 *   node tools/probe598.js --runs 3   (회차 조절)
 *
 * 338 규칙: 처방 전에 재현한다. 이 자는 «고친다» 가 아니라 «무엇이 흔드는지» 를 찍는다.
 *
 *   §A 재현 — 587 이 쓰던 자연 상태 축을 두 트리(고친 쪽 · 히스테리시스 뺀 사본)에서 n회.
 *             값의 폭과 **부호 뒤집힘**(고친 쪽 ≥ 뺀 쪽인 회차)이 실제로 나오는가.
 *   §B 분해 — 축을 하나씩 못박아 변동계수(CV)를 잰다: 자연 → 프레임 고정 → +난수 시드 → +좌표·스월.
 *             어느 단계에서 흔들림이 죽는지가 곧 «무엇이 흔들었나» 다.
 *   §C 대조 — 결정적 시나리오 위에서 두 트리를 시드 5개로 견준다.
 *             차가 회차 편차보다 큰가 = 통과선을 세울 자격이 있는가.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { FLAP_DET, PLAY_DET, FLAP_NAT, FLAP_STAGE, SUB_HYST, stat598 } = require('./flap598lib');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, `.p598-neg-${process.pid}.html`);

const argv = process.argv.slice(2);
const RUNS = Math.max(2, +((argv[argv.indexOf('--runs') + 1]) || 3) || 3);
const FRAMES = 720;              /* 12초 @ 60fps — 587 의 자연 측정과 같은 «게임 시간» */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };
const f3 = n => (typeof n === 'number' ? n.toFixed(3) : String(n));

async function boot(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => typeof enemies !== 'undefined' && typeof makeEnemy === 'function' && typeof step === 'function');
  await page.waitForTimeout(1500);
  return { ctx, page, errs };
}

function mkNeg() {
  let s = fs.readFileSync(SRC, 'utf8');
  SUB_HYST.forEach(([a, b], i) => {
    if (!s.includes(a)) throw new Error('되돌림 치환 ' + (i + 1) + ' 이 안 걸렸다(앵커가 옮겨졌다)');
    s = s.split(a).join(b);
  });
  fs.writeFileSync(NEG, s);
}

(async () => {
  const browser = await launch(chromium);
  mkNeg();

  /* ── §A 재현 ─────────────────────────────────────────────────────── */
  console.log('\n§A 재현 — 587 의 자연 상태 축(rAF · 자연 난수 · 12초)을 두 트리에서 ' + RUNS + '회 ───');
  const natFix = [], natNeg = [];
  for (let r = 0; r < RUNS; r++) {
    const a = await boot(browser, SRC);
    natFix.push(await a.page.evaluate(`(${FLAP_NAT})(12000)`));
    await a.ctx.close();
    const b = await boot(browser, NEG);
    natNeg.push(await b.page.evaluate(`(${FLAP_NAT})(12000)`));
    await b.ctx.close();
    console.log(`      ${r + 1}회차 — 고친 쪽 ${f3(natFix[r].mob)}회/s ↔ 뺀 쪽 ${f3(natNeg[r].mob)}회/s` +
      `  (프레임 ${natFix[r].frames} ↔ ${natNeg[r].frames})`);
  }
  const sFix = stat598(natFix.map(x => x.mob)), sNeg = stat598(natNeg.map(x => x.mob));
  const inv = natFix.filter((x, i) => x.mob >= natNeg[i].mob).length;
  ok(sFix.max - sFix.min > 0.15,
    '[A1] 옛 축은 같은 트리에서도 회차마다 크게 흔들린다(폭 > 0.15회/s)',
    `${f3(sFix.min)}~${f3(sFix.max)} · 평균 ${f3(sFix.mean)} · CV ${(sFix.cv * 100).toFixed(1)}%`);
  ok(true, '[A2] 뺀 사본도 같이 흔들린다(참고)',
    `${f3(sNeg.min)}~${f3(sNeg.max)} · 평균 ${f3(sNeg.mean)} · CV ${(sNeg.cv * 100).toFixed(1)}%`);
  /* «부호 뒤집힘» 은 회차 운이라 3회로는 안 나올 수 있다(587 은 두 번 봤고, 이 자를 쓴 날의
     `verify587` 기준선 실행도 1.038 ↔ 1.022 로 뒤집혔다). 그래서 단언은 **겹침**으로 한다 —
     두 무리의 간극보다 각자의 폭이 크면 «어느 회차엔가 뒤집힌다» 가 통계로 보장된다. */
  ok(sFix.cv > 0.10,
    '[A3] **옛 축의 회차 간 변동계수가 10% 를 넘는다** — 신호(두 무리 차 ~35%)의 3분의 1이라 몇 회만 돌리면 부호가 뒤집힌다',
    `CV ${(sFix.cv * 100).toFixed(1)}% · 이번 실행 뒤집힘 ${inv}/${RUNS} (같은 날 verify587 기준선 실행은 1.038 ↔ 1.022 로 뒤집혔다)`);
  const frAll = natFix.map(x => x.frames).concat(natNeg.map(x => x.frames));
  ok(Math.max(...frAll) - Math.min(...frAll) > 3,
    '[A4] 같은 12초에 굴러간 프레임 수부터 회차마다 다르다(rAF 라 dt 가 안 같다)',
    frAll.join('·'));

  /* ── §B 분해 ─────────────────────────────────────────────────────── */
  console.log('\n§B 분해 — 축을 하나씩 못박으며 변동계수를 본다 ─────────────────');
  const stage = async (mode, seeds) => {
    const out = [];
    for (const sd of seeds) {
      const a = await boot(browser, SRC);
      out.push(await a.page.evaluate(`(${FLAP_STAGE})(${FRAMES}, ${sd}, ${JSON.stringify(mode)})`));
      await a.ctx.close();
    }
    return out;
  };
  const det = async (file, seeds) => {
    const out = [];
    for (const sd of seeds) {
      const a = await boot(browser, file);
      out.push(await a.page.evaluate(`(${FLAP_DET})(${FRAMES}, ${sd})`));
      await a.ctx.close();
    }
    return out;
  };
  const seedsSame = new Array(RUNS).fill(20250831);      /* 같은 시드 — 결정성을 본다 */
  const S2 = await stage('dt', seedsSame);
  const S3 = await stage('rng', seedsSame);
  const S4 = await det(SRC, seedsSame);
  const st2 = stat598(S2.map(x => x.mob)), st3 = stat598(S3.map(x => x.mob)), st4 = stat598(S4.map(x => x.mob));
  console.log(`      S1 자연(rAF·자연난수)        ${f3(sFix.min)}~${f3(sFix.max)}  CV ${(sFix.cv * 100).toFixed(1)}%`);
  console.log(`      S2 프레임 고정(step 1/60)     ${f3(st2.min)}~${f3(st2.max)}  CV ${(st2.cv * 100).toFixed(1)}%`);
  console.log(`      S3 + 난수 시드                ${f3(st3.min)}~${f3(st3.max)}  CV ${(st3.cv * 100).toFixed(1)}%`);
  console.log(`      S4 + 좌표·스월·배우 전부 못박기 ${f3(st4.min)}~${f3(st4.max)}  CV ${(st4.cv * 100).toFixed(1)}%`);
  ok(st2.cv > 0.02 || st3.cv > 0.02,
    '[B1] 프레임만·난수만으로는 안 잡힌다 — 부팅 뒤 배우 상태(플레이어 좌표·조준·스킬 쿨)가 남는다',
    `S2 CV ${(st2.cv * 100).toFixed(1)}% · S3 CV ${(st3.cv * 100).toFixed(1)}%`);
  ok(st4.max - st4.min < 1e-9,
    '[B2] **같은 시드면 값이 완전히 같다**(결정성 확보 — 이것이 통과선의 자격이다)',
    `${RUNS}회 전부 ${f3(st4.mean)}회/s`);
  ok(S4.every(x => x.frames === FRAMES),
    '[B3] 프레임 수도 회차마다 같다', `${S4.map(x => x.frames).join('·')}`);

  /* 시드를 바꾸면 «시나리오» 가 달라지므로 값도 달라진다 — 그 폭이 시드 간 편차다 */
  const seeds = [11, 22, 33, 44, 55];
  const S4m = await det(SRC, seeds);
  const st4m = stat598(S4m.map(x => x.mob));
  ok(true, '[B4] 시드를 바꾸면 값이 움직인다(= 시드 간 편차 — §C 의 견줄 자)',
    `전체 뒤집힘 ${f3(st4m.min)}~${f3(st4m.max)} · CV ${(st4m.cv * 100).toFixed(1)}%`);

  /* ── §C 대조 ─────────────────────────────────────────────────────── */
  console.log('\n§C 대조 — 결정적 시나리오에서 히스테리시스 유무 ─────────────────');
  const negOut = await det(NEG, seeds);
  console.log('      시드 | 전체 뒤집힘 고침↔뺌 | **깜빡임**(0.25초 안 왕복) 고침↔뺌 | 전환당 뒤집힘 고침↔뺌');
  seeds.forEach((sd, i) => console.log(
    `      ${String(sd).padStart(4)} | ${f3(S4m[i].mob)} ↔ ${f3(negOut[i].mob)} | ` +
    `${f3(S4m[i].flick)} ↔ ${f3(negOut[i].flick)} | ${f3(S4m[i].ratio)} ↔ ${f3(negOut[i].ratio)}`));

  const cmp = (key, label) => {
    const a = S4m.map(x => x[key]), b = negOut.map(x => x[key]);
    const sa = stat598(a), sb = stat598(b);
    const win = a.filter((v, i) => b[i] > v).length;
    console.log(`      · ${label} — 고친 쪽 ${f3(sa.min)}~${f3(sa.max)} ↔ 뺀 쪽 ${f3(sb.min)}~${f3(sb.max)}` +
      `  (뺀 쪽이 더 큰 시드 ${win}/${a.length} · 간극 ${f3(sb.min - sa.max)})`);
    return { sa, sb, win, gap: sb.min - sa.max };
  };
  const cAll = cmp('mob', '전체 뒤집힘');
  const cFl = cmp('flick', '깜빡임');
  const cRt = cmp('ratio', '전환당 뒤집힘');

  ok(cAll.win === seeds.length,
    '[C1] **결정적 판에서는 «전체 뒤집힘» 도 부호가 안 뒤집힌다** — 흔들던 것은 축이 아니라 **판**이었다',
    `뺀 쪽이 더 큰 시드 ${cAll.win}/${seeds.length} · 간극 ${f3(cAll.gap)}`);
  ok(cFl.win === seeds.length && cFl.gap >= cAll.gap * 0.9,
    '[C2] «깜빡임»(0.25초 안 왕복)도 시드 전부에서 뺀 쪽이 크다(주인이 본 병에 더 가까운 축)',
    `${cFl.win}/${seeds.length} · 간극 ${f3(cFl.gap)}`);
  ok(cFl.gap > 0,
    '[C3] 두 무리가 **겹치지 않는다**(고친 쪽 최댓값 < 뺀 쪽 최솟값 = 한 임계로 가른다)',
    `고친 ≤ ${f3(cFl.sa.max)} < 뺀 ≥ ${f3(cFl.sb.min)} (간극 ${f3(cFl.gap)})`);
  ok(true, '[C4] 참고 — 전환당 뒤집힘', `뺀 쪽이 더 큰 시드 ${cRt.win}/${seeds.length}`);

  /* ── §D 플레이어 축 ──────────────────────────────────────────────── */
  console.log('\n§D 플레이어 — 각본대로 손가락을 꺾는다(세로만·임계 언저리 국면 포함) ───');
  const play = async (file, seeds2) => {
    const out = [];
    for (const sd of seeds2) {
      const a = await boot(browser, file);
      out.push(await a.page.evaluate(`(${PLAY_DET})(${FRAMES}, ${sd})`));
      await a.ctx.close();
    }
    return out;
  };
  const pSame = await play(SRC, new Array(RUNS).fill(20250831));
  const pFix = await play(SRC, seeds);
  const pNeg = await play(NEG, seeds);
  seeds.forEach((sd, i) => console.log(
    `      seed ${String(sd).padStart(3)} — 고친 쪽 ${f3(pFix[i].player)}회/s (깜빡임 ${f3(pFix[i].flick)})` +
    `  ↔  뺀 쪽 ${f3(pNeg[i].player)} (깜빡임 ${f3(pNeg[i].flick)})`));
  const spSame = stat598(pSame.map(x => x.player));
  ok(spSame.max - spSame.min < 1e-9,
    '[D1] 플레이어 축도 같은 시드면 값이 완전히 같다', `${RUNS}회 전부 ${f3(spSame.mean)}회/s`);
  const spF = stat598(pFix.map(x => x.player)), spN = stat598(pNeg.map(x => x.player));
  ok(pFix.every((x, i) => pNeg[i].player > x.player),
    '[D2] 시드 전부에서 뺀 사본이 더 떤다',
    `고친 ${f3(spF.min)}~${f3(spF.max)} ↔ 뺀 ${f3(spN.min)}~${f3(spN.max)}`);
  ok(spN.min - spF.max > 0,
    '[D3] 두 무리가 겹치지 않는다', `간극 ${f3(spN.min - spF.max)}`);

  try { fs.unlinkSync(NEG); } catch (e) {}
  await browser.close();
  console.log(`\n  ${pass}/${pass + fail}\n`);
  process.exit(fail ? 1 : 0);
})();
