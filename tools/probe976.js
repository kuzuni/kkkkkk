/* 작업 976 — 재현: **씬 B 표본이 «틱 직후» 로 쏠리는가**(하네스 · 975 1회차 곁다리 등재)
 *
 *   node tools/probe976.js [--n 12] [--gap 200] [--no-shot]
 *
 * 등재문이 갈래 둘을 세웠다:
 *   ⓐ 우리 `evaluate`(얼림+표)가 **틱의 JS 버스트 직후**에 실행돼 생기는 표본 편향
 *   ⓑ 제품이 정말 틱마다 한 알을 새로 놓고 앞 알을 빨리 걷는다(= 제품 값)
 * 가르는 자도 등재문이 적어 놨다 — **얼리지 않고 틱 시각을 길게 기록한 뒤 «표본 시각 − 직전 틱
 * 시각» 분포를 그린다. 고르면 ⓑ, 0 부근에 몰리면 ⓐ.**
 *
 * ⚠ 이 자는 `tools/cap683.js` 의 `open()`·`holdUntil()`·`FREEZE_TALLY` 를 **require 해서 그대로**
 *   쓴다. 사본을 뜨면 「자를 재는 자」가 사본을 재게 되어 판정이 통째로 거짓이 된다(402 «사본을 지운다»).
 *
 * 사법 둘을 같은 페이지 규격으로 나란히 돌린다:
 *   ⓐ «지금 방식» — Node 가 폴링하다 목표를 넘으면 그 자리에서 `evaluate` 로 얼린다(975 까지의 씬 B)
 *   ⓑ «위상 지정» — 다음 틱을 기다렸다 그 틱의 `iv` 의 `frac` 만큼 지난 뒤 **페이지 안에서** 얼린다
 * 두 사법 다 프레임마다 스크린샷을 찍는다(얼림 1~2초가 위상에 섞이는지까지 같이 보려는 것 —
 * `--no-shot` 으로 뺄 수 있다).
 *
 * ⚑⚑ **984 — 러너가 정하는 값에는 문턱을 안 건다.** 이 자는 `verify976` [P-a] 로 불리는데,
 *   [3a2]«겨눈 알이 대개 살아 있다(≥70%)» · [3b]«|실측 − 겨눔| 중앙값 ≤ 80ms» 둘이 **재는 것이
 *   러너의 몫**(스핀이 렌더 뒤로 밀린 양)이라 초록이 러너 기분에 달렸다 — 실측이 문턱에 붙어
 *   다녔다(중앙값 35·61.5·64·**77** ↔ 문턱 80 · 생존 10/12·10/12·10/12·11/12 ↔ 바닥 9/12).
 *   ⇒ 둘 다 **관찰**로 내리고, 판정은 이 자가 **고르는** 축으로 옮겼다: «실측 ≥ 겨눔»(스핀이
 *   `d >= off` 에서만 얼리므로 구조상 결정적 · `verify976` [3-c] 와 같은 축)과 «눈금표를
 *   차례대로 받았다». 넓히지도 좁히지도 않았다 — 과녁을 옮겼다.
 */
const os = require('os');
const fs = require('fs');
const path = require('path');
const { open, holdUntil, FREEZE_TALLY, PHASE_FREEZE_TALLY, PHASE_MS, SEED } = require('./cap683');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const N = arg('--n', 12);
const GAP = arg('--gap', 200);
const SHOT = !process.argv.includes('--no-shot');

/* 표본이 들고 오는 것 — 「지금 시각」과 「그때까지의 틱 목록」뿐이다(그림은 안 센다). */
const LIGHT = () => {
  const T = window.__tick976 || { at: [], iv: [], js: [], mo: [] };
  /* ⚠ 칸 이름을 `at` 로 쓰면 안 된다 — `FREEZE_TALLY` 가 그 칸에 «표본의 페이지 시각» 을 덮어쓴다
     (한 번 밟았다). 틱 목록은 `tk`. */
  return { pn: Math.round(performance.now()),
           tk: T.at.slice(), iv: T.iv.slice(), js: T.js.slice(), mo: T.mo.slice(), egg: T.egg.slice() };
};

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); c ? pass++ : fail++; };
const med = v => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

async function run(mode) {
  const { b, p, errs } = await open(SEED);
  const el = await p.$('#rwBasin');
  const bb = await el.boundingBox();
  const cdp = await p.context().newCDPSession(p);
  const c = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  await p.evaluate(() => {
    window.__capT0 = 0;
    document.getElementById('rwBasin').addEventListener('pointerdown',
      () => { if (!window.__capT0) window.__capT0 = performance.now(); }, true);
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  const out = [];
  const tmp = path.join(os.tmpdir(), 'probe976-' + mode + '.png');
  let target = 560;                                   /* cap683 의 첫 눈금과 같은 자리에서 시작한다 */
  for (let i = 0; i < N; i++) {
    await holdUntil(p, cdp, c, target);
    const info = mode === 'asis'
      ? await p.evaluate(FREEZE_TALLY, { tally: LIGHT.toString() })
      : await p.evaluate(PHASE_FREEZE_TALLY,
          { tally: LIGHT.toString(), off: PHASE_MS[i % PHASE_MS.length], wait: 900 });
    if (SHOT) await p.screenshot({ path: tmp });      /* 얼려 있는 1~2초를 그대로 재현한다 */
    await p.evaluate(() => window.__capResume());
    out.push(info);
    target = info.at + GAP;
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
  const last = out[out.length - 1];
  await b.close();
  try { fs.unlinkSync(tmp); } catch (e) {}
  return { out, ticks: last.tk, ivs: last.iv, js: last.js, mo: last.mo, eggs: last.egg, errs: errs.length };
}

/* 표본 하나의 위상 — «표본 시각 − 직전 틱 시각», 그 틱의 **실측** 간격으로 나눈 값.
   ⚠ 마지막 틱 뒤의 표본은 «그 주기가 얼마였는지» 를 아직 모른다 — 선언값으로 때우면 251% 같은
     값이 나온다(1회차에 실제로 나왔다). 그런 표본은 `frac` 을 안 낸다(`null`). */
function phase(sample, ticks) {
  const pn = sample.pn;
  let k = -1;
  for (let i = 0; i < ticks.length; i++) if (ticks[i] <= pn) k = i; else break;
  if (k < 0) return null;
  const ms = pn - ticks[k];
  const ivAct = (k + 1 < ticks.length) ? ticks[k + 1] - ticks[k] : null;
  return { k, ms, iv: ivAct, frac: ivAct > 0 ? ms / ivAct : null };
}

/* 975 가 본 값 그대로 — «표본 시각 − **직전 알**이 태어난 시각»(= 표의 «나이» 최솟값) */
const eggAge = (sample, eggs) => {
  let b = null;
  for (const t of eggs) if (t <= sample.pn) b = t; else break;
  return b == null ? null : sample.pn - b;
};

const quad = f => Math.max(0, Math.min(3, Math.floor(f * 4)));
function table(name, r) {
  console.log('\n' + name);
  console.log('| # | 표본 t(ms) | 직전 틱 # | 틱 위상 ms | 그 틱 실측 주기 | 틱 위상 % | 사분면 | 직전 알 나이 ms |');
  console.log('|---|---|---|---|---|---|---|---|');
  const ph = [], ages = [];
  r.out.forEach((s, i) => {
    const q = phase(s, r.ticks), a = eggAge(s, r.eggs);
    ph.push(q); ages.push(a);
    console.log('| ' + (i + 1) + ' | ' + s.at + ' | ' + (q ? q.k : '–') + ' | ' + (q ? q.ms : '–')
      + ' | ' + (q && q.iv ? q.iv + 'ms' : '–') + ' | ' + (q && q.frac != null ? (q.frac * 100).toFixed(1) + '%' : '–')
      + ' | ' + (q && q.frac != null ? 'Q' + (quad(q.frac) + 1) : '–')
      + ' | ' + (a == null ? '–' : a) + ' |');
  });
  const fr = ph.filter(x => x && x.frac != null).map(x => x.frac);
  const qc = [0, 0, 0, 0];
  fr.forEach(f => qc[quad(f)]++);
  const ag = ages.filter(a => a != null);
  console.log('사분면 분포(Q1 0~25% · Q2 25~50% · Q3 50~75% · Q4 75~100%): '
    + qc.map((n, i) => 'Q' + (i + 1) + ' ' + n).join(' · ') + ' (셈에 든 표본 ' + fr.length + '개)'
    + ' · 틱 위상 중앙값 ' + (med(fr) * 100).toFixed(1) + '%'
    + ' · 직전 알 나이 중앙값 ' + med(ag) + 'ms');
  return { ph, fr, qc, ages: ag, out: r.out };
}

(async () => {
  console.log('# 976 재현 — 씬 B 표본 위상 (시드 ' + SEED + ' · 표본 ' + N + '개 · 간격 ' + GAP
    + 'ms · 스크린샷 ' + (SHOT ? '있음' : '없음') + ')');

  const A = await run('asis');
  const B = await run('phase');

  /* [1] 자 자신부터 — 「틱」과 「알」은 같은 수가 아니다 */
  console.log('\n[1] 틱·알 목록 (rwSummonFx 훅 ↔ #fxl MutationObserver ↔ 획득 알 탄생)');
  const ivAct = A.ticks.slice(1).map((t, i) => t - A.ticks[i]);
  const eggGap = A.eggs.slice(1).map((t, i) => t - A.eggs[i]);
  console.log('  소환 틱(훅) ' + A.ticks.length + '회 · 실측 주기 ' + ivAct.join('·') + 'ms (중앙값 '
    + med(ivAct) + 'ms · 선언 ' + A.ivs.slice(-1)[0] + 'ms)');
  console.log('  #fxl 무더기(관찰자) ' + A.mo.length + '회 · 획득 알 탄생 ' + A.eggs.length + '개 · 알 사이 간격 중앙값 '
    + med(eggGap) + 'ms');
  console.log('  틱의 JS 버스트 길이 중앙값 ' + med(A.js) + 'ms (' + A.js.slice(0, 6).join('·') + '…)');
  ok(A.ticks.length >= 6 && ivAct.length >= 5 && med(ivAct) >= 30 && med(ivAct) <= 600,
    '[1a] 홀드가 실제로 돌았다 — 틱 ' + A.ticks.length + '회 · 주기 중앙값 ' + med(ivAct) + 'ms');
  ok(A.eggs.length >= A.ticks.length,
    '[1b] ★ **알은 틱보다 자주 태어난다** — 틱 ' + A.ticks.length + '회 ↔ 알 ' + A.eggs.length
    + '개(무더기 ' + A.mo.length + '회). 「나이 최솟값」이 재는 것은 **틱 위상이 아니라 알 간격**이다');
  ok(med(A.js) < med(ivAct),
    '[1c] 틱의 JS 버스트(' + med(A.js) + 'ms)가 주기(' + med(ivAct) + 'ms)보다 짧다 — 주 스레드가 주기 내내 바쁜 것은 아니다');

  const ta = table('[2] 사법 ⓐ «지금 방식»(975 까지의 씬 B — Node 폴링이 떨어진 자리에서 얼린다)', A);
  const tb = table('[3] 사법 ⓑ «위상 지정»(다음 틱 + frac × 실측 주기 뒤에 **페이지 안에서** 얼린다 · 지정 '
    + PHASE_MS.join('·') + 'ms)', B);

  console.log('\n[4] 판정 — 등재문의 갈래 ⓐ(표본 편향) ↔ ⓑ(제품 값)');
  const band = [0, 40, 100, 200], bn = a => { let i = 0; while (i < 3 && a >= band[i + 1]) i++; return i; };
  const fresh = v => v.filter(a => a <= 5).length;                 /* «갓 태어난 알» = 나이 ≤5ms */
  const mAge = med(ta.ages), mGap = med(eggGap);
  const expect = ta.ages.length * 6 / (mGap || 1);                 /* 고르게 떨어졌다면 나올 수 */
  const spike = fresh(ta.ages) >= 2 && fresh(ta.ages) >= 2 * expect;
  console.log('  지금 방식 알 나이: 중앙값 ' + mAge + 'ms · **나이 ≤5ms 가 ' + fresh(ta.ages) + '/'
    + ta.ages.length + '**(알 간격 중앙값 ' + mGap + 'ms 에 고르게 떨어졌다면 ' + expect.toFixed(1) + '개)');
  console.log('  지금 방식 틱 위상: 첫 사분면 ' + ta.qc[0] + '/' + ta.fr.length + ' · 중앙값 '
    + (med(ta.fr) * 100).toFixed(1) + '%');
  console.log('  ⇒ **둘 다 반쪽씩 맞다**: ' + (spike
    ? 'ⓐ 가 맞는 쪽 — 표본에 「알이 갓 태어난 자리」 스파이크가 있다(' + fresh(ta.ages) + '/'
      + ta.ages.length + ' ↔ 기대 ' + expect.toFixed(1) + '). '
    : 'ⓐ 의 스파이크는 이 실행에서 안 나왔다. ')
    + '단 «표본이 언제나 틱 직후» 는 **아니다** — 나이 중앙값 ' + mAge + 'ms · 첫 사분면 '
    + ta.qc[0] + '/' + ta.fr.length + '. 나머지는 ⓑ(제품이 틱마다 한 알을 놓고 앞 알을 걷는다)로 설명된다');
  ok(ta.ages.length >= 8, '[2a] 나이를 잴 수 있는 표본이 ' + ta.ages.length + '개(≥8) — 분포를 말할 근거가 있다');
  /* ⚠ **스파이크는 실행의 «틱 촘촘함» 에 달렸다** — 알 간격 중앙값이 104~128ms 인 판에서는 4~7/16 이
     나오고, 249ms 로 성긴 판에서는 0~1/12 이다(다섯 판 실측: 7·4·3·1·0). 그래서 «항상 재현된다» 로
     걸면 초록이 러너 기분에 달린다(플레이키 게이트 금지) ⇒
     문턱은 «0 이거나 기대의 2배 이상» 이다 — 0 보다 크면서 기대에도 못 미치는 값이 나오면
     그때는 이 자의 모형(균등 기대 = n×6ms/알 간격)이 틀린 것이라 빨개져야 맞다. */
  ok(fresh(ta.ages) === 0 || fresh(ta.ages) >= 2 * expect,
    '[2b] ★ 지금 방식의 표본은 «갓 태어난 알» 을 **덜 만나지 않는다**(0 이거나 기대 이상) — 나이 ≤5ms 가 ' + fresh(ta.ages) + '/'
    + ta.ages.length + ' (고르면 ' + expect.toFixed(1) + '개 · 기대의 '
    + (fresh(ta.ages) / (expect || 1)).toFixed(1) + '배). '
    + (fresh(ta.ages) ? '**등재문 ⓐ 의 절반이 이 실행에서 재현됐다**'
       : '이 실행은 틱이 성겨(알 간격 중앙값 ' + mGap + 'ms) 스파이크가 안 났다 — 등재문 ⓐ 는 조건부다'));
  ok(mAge > 5 && ta.qc[0] <= ta.fr.length * 0.5,
    '[2c] ★ **등재문의 «대개 0~45ms» 는 정정된다** — 나이 중앙값 ' + mAge + 'ms · 틱 위상 첫 사분면 '
    + ta.qc[0] + '/' + ta.fr.length + '(≤50%). 쏠림은 «스파이크» 지 «전부» 가 아니다');
  /* ⚠ **«나이 ≤5ms 를 0 으로 만든다» 는 목표가 아니다**(1회차에 그렇게 적었다가 값에 반증당했다).
     겨눈 알을 기다리는 사이 새 틱이 오면 그 프레임의 «가장 어린 알» 은 당연히 갓 태어난 알이고,
     그것이 바로 683 이 보려는 겹침이다. 고쳐야 할 것은 «우연히 그 자리에 붙는 것» 이다. */
  /* ⚑⚑ 984 — **설명하는 단위를 «틱» 에서 «알» 로 바꿨다.** 종전 [3a] 는 「그 프레임의 가장 어린
     **알**이 갓 태어났다」를 「기다리는 사이 새 **틱**이 왔다(`newTicks`)」로 설명하려 했는데,
     이 자의 [1b] 가 바로 위에서 **«알은 틱보다 자주 태어난다»** 를 값으로 증명한다(훅 48회 ↔ 알
     89개). 그래서 **틱 없이 알만 태어난 순간**에 표본이 서면 «설명 안 되는 1건» 이 되어 [P-a] 가
     빨개졌다 — 실측으로 재현했다(8판 중 1판: 3건 중 2건만 설명 → `PROBE976 FAIL 10/11`).
     제품이 잘못한 것도 표본이 잘못 선 것도 아니다. **자가 틀린 단위로 물은 것**이다.
     ⇒ 「닻 이후에 **알**이 새로 태어났는가」로 묻는다(같은 사실을 옳은 단위로). */
  const anchorT = s => (s.ph && s.ph.k >= 0 && B.ticks[s.ph.k] != null) ? B.ticks[s.ph.k] : null;
  const bornAfter = s => { const a = anchorT(s); return a == null ? 0
    : B.eggs.filter(t => t > a && t <= s.pn).length; };
  const freshRows = tb.out.map((s, i) => ({ i, a: eggAge(s, B.eggs), ph: s.ph, born: bornAfter(s) }))
                          .filter(x => x.a != null && x.a <= 5);
  const explained = freshRows.filter(x => x.ph && (x.ph.off <= 10 || x.born >= 1));
  ok(freshRows.length === explained.length,
    '[3a] ★ 위상 지정에서 «갓 태어난 알» 프레임은 **전부 설명된다** — ' + freshRows.length + '건 중 '
    + explained.length + '건이 「10ms 눈금」이거나 「기다리는 사이 **알이 새로 태어난**」 프레임이다'
    + '(닻 이후 태어난 알 ' + (freshRows.map(x => x.born).join('·') || '–')
    + ' · 지금 방식은 ' + fresh(ta.ages) + '건이 우연히 붙었다)');
  /* 우리가 **겨눈** 알은 그 자리에 우연히 안 붙는다 — 스핀이 `d >= off` 에서만 얼리므로
     10ms 눈금 밖에서는 겨눈 나이가 ≤5ms 일 수 없다. 위 [3a] 가 세는 «가장 어린 알» 과 달리
     이 축은 이 자가 **고르는** 것이라 흔들리지 않는다(984 · `verify976` [3-c] 와 같은 축). */
  const aimFresh = tb.out.filter(s => s.ph && !s.ph.late && s.ph.off > 10 && s.ph.ms <= 5).length;
  ok(aimFresh === 0,
    '[3a3] ★ **겨눈** 알은 «갓 태어난» 자리에 우연히 안 붙는다 — 10ms 눈금 밖에서 겨눈 나이 ≤5ms 가 '
    + aimFresh + '건 (겨눈 나이 ' + tb.out.map(s => s.ph ? s.ph.ms : '–').join('·') + 'ms)');
  /* ⚑⚑ 984 — **[3a2]·[3b] 의 문턱을 걷어냈다(«관찰» 로 강등).** 둘 다 재는 것이 **러너의 몫**이라
     초록이 러너 기분에 달렸다 — 이 자가 [P-a] 로 플레이키했던 자리다.
       · 겨눈 알이 아직 살아 있는가(수명 380ms) = 스핀이 얼마나 밀렸나 = 러너
       · |실측 − 겨눔| 중앙값 = 밀린 양 그 자체 = 러너
     문턱 80ms 는 실측이 **35 · 61.5 · 64 · 77ms** 로 붙어 다녔고(부하가 걸린 판이 77), 70% 문턱은
     실측 **10/12 · 10/12 · 10/12 · 11/12**(바닥 9/12)로 한 표본 차였다. 문턱을 넓히는 것은
     헛초록이고(LESSONS 334) 좁히는 것은 상시 빨강이다 ⇒ **값으로 밝히고 판정은 안 건다.**
     판정은 아래 [3b] 가 «이 자가 고르는 축» 한 곳에서 진다(= `verify976` [3-c] 와 같은 축). */
  const alive = tb.out.filter(s => s.ph && s.ph.ms >= 0 && s.ph.ms <= 380).length;
  console.log('  · **관찰(판정 아님)** 겨눈 알이 프레임에 살아 있던 표본 ' + alive + '/' + tb.out.length
    + ' (수명 380ms 안 · 겨눈 나이 ' + tb.out.map(s => s.ph ? s.ph.ms : '–').join('·') + 'ms)');
  const errs = tb.out.map((s, i) => (s.ph && s.ph.ms >= 0) ? Math.abs(s.ph.ms - PHASE_MS[i % PHASE_MS.length]) : null)
                     .filter(x => x != null);
  /* **이 자가 고르는 것은 «언제 얼릴지» 뿐이다** — 스핀이 `d >= off` 에서만 얼리므로 «실측 ≥ 겨눔»
     은 구조상 참이고 흔들리지 않는다. 못 맞춘 장은 조용히 옛 자리로 돌아가지 않고 `late` 로
     밝혀지므로 그 수도 같이 센다(밝힌 것은 결함이 아니지만 **밝히지 않은 것은 결함**이다). */
  const keptN = tb.out.filter(s => s.ph && !s.ph.late && s.ph.ms >= s.ph.off).length;
  const lateN = tb.out.filter(s => s.ph && s.ph.late).length;
  ok(keptN + lateN === tb.out.length,
    '[3b] ★ 표본이 **겨눈 눈금을 지켰다**(실측 ≥ 겨눔) — ' + keptN + '/' + tb.out.length
    + ' (놓쳐서 «(놓침)» 으로 밝힌 장 ' + lateN + '). 초과분 |실측 − 겨눔| 중앙값 ' + med(errs)
    + 'ms 는 **러너의 몫이라 문턱을 안 건다**(984)');
  ok(tb.out.every((s, i) => s.ph && s.ph.off === PHASE_MS[i % PHASE_MS.length]),
    '[3a2] 표본이 눈금표(' + PHASE_MS.join('·') + 'ms)를 **차례대로** 받았다 — 겨눔 '
    + tb.out.map(s => s.ph ? s.ph.off : '–').join('·') + 'ms');
  const covB = new Set(tb.ages.map(bn)).size, covA = new Set(ta.ages.map(bn)).size;
  ok(covB >= 3,
    '[3c] ★ 위상 지정이 알 수명을 고르게 덮는다 — 네 토막(0~40·40~100·100~200·200~) ' + covB
    + '/4 (지금 방식 ' + covA + '/4)');
  const late = tb.out.filter(s => s.ph && s.ph.late).length;
  console.log('  · 겨눈 자리를 놓친 표본 ' + late + '/' + tb.out.length
    + ' · 기다리는 사이 새로 온 틱 ' + tb.out.map(s => s.ph ? s.ph.newTicks : '–').join('·')
    + ' (그 틱들이 곧 683 이 보려는 겹침이다 — 몇 개여야 하는지는 이 자가 안 정한다)');
  ok(A.errs === 0 && B.errs === 0, '[4a] 콘솔 에러 0건 — ⓐ ' + A.errs + ' · ⓑ ' + B.errs);

  console.log('\nPROBE976 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
