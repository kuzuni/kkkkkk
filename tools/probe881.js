/* 작업 881 재현기 — 「요소 대상 버스트 알이 «판독 하한» 아래로 줄어든다」를 빨갛게 찍는 자.
 *
 *   node tools/probe881.js [--src <index.html 사본>]
 *
 * ⚑ 무엇을 재는가 — 838 9회차 채점 2인(DJ·DK)이 **각자 다른 자로 ② 에 같은 것**을 적었다:
 *   DJ «프레임 3~8 검출 알 27개 중 22개가 Ø5~11px = 발원 코인 Ø50 의 10~22% · 최댓값도 13px(26%)
 *       — 판독 최소선 14~16px 미달» · DK «#4 ≈12px → #8 ≈6px = 50% 축소».
 *   ⇒ 눈금은 **알 지름 ÷ 발원 아이콘 지름**(비율)이다. 절대 px 로 적으면 호스트마다 아이콘이
 *     달라(훈련 골드 · 단련 단련석 · 룬 룬석) 같은 결함이 세 값으로 읽힌다.
 *
 * ⚠ 왜 «봉우리» 가 아니라 «꼬리» 인가 — 봉우리(18%)는 이미 하한 안이다(자 실측 Ø16.22 = 32%).
 *   `fxSpark`/`fxSparkE` 의 scale 이 18% 에서 1.0 → 100% 에서 **0.5** 로 내려가 320ms 에 19% 가 된다.
 *   즉 «태어날 때 작다» 가 아니라 «사는 동안 줄어든다» 이고, 그래서 자는 **프레임별** 로 센다.
 *
 * ⚠ 표본은 새로 안 만든다 — `travel838`(838·873·877 이 같이 쓰는 부품)의 per-egg `pts[].w`
 *   (= 브라우저가 그린 상자 폭)를 그대로 읽는다.
 *   자를 두 벌로 적으면 재현이 찍은 수치와 게이트가 지키는 수치가 조용히 갈린다(402 «두 벌 금지»).
 *
 * ⚑⚑ **분모는 `geo.fr` 이 아니다 — 1회차에 이 자가 먼저 틀렸다.** `travel838` 의 `geo.fr` 은
 *   `--burst-from` 노드의 `max(w,h)/2` 라, 훈련의 발원 `<s>` 에서는 **줄상자 높이 71.31**을 집는다.
 *   그런데 DJ 가 «코인 Ø50» 이라고 적은 것은 **그려진 코인**이고, 직접 재 보니 그 `<s>` 안의
 *   `img.cic` 가 **52.97 정사각 · 잉크 bbox 53×53** 이다(71.31 은 그 위아래 여백까지 센 값).
 *   분모를 71.31 로 쓰면 같은 알이 봉우리 30.6% → **22.7%** 로 읽혀 «봉우리도 하한 미달» 이라는
 *   유령이 생긴다(등재문은 봉우리가 하한 «안» 이라고 적어 두었다). ⇒ 발원 아이콘의 **정사각 그림**
 *   (`.cic` 자식이 있으면 그것 · 없으면 `min(w,h)`)을 분모로 쓴다.
 */
'use strict';
const path = require('path');
const { runScene, SCENES, STOPS } = require('./travel838');

/* DJ 가 적은 판독 하한 — «발원 아이콘 지름의 28~32%». 아래쪽(28%)을 자의 문턱으로 삼는다
   (위쪽 32% 를 쓰면 봉우리조차 경계에 걸려 «전부 빨강» 이 되고 꼬리가 안 보인다). */
const FLOOR = 0.28;
/* DJ 가 «검출 알» 로 센 프레임 창 — 3~8 번째 장(45ms 이후). 앞 두 장은 태어나는 중이라 뺀다. */
const F0 = 2;

const args = process.argv.slice(2);
const srcIx = args.indexOf('--src');
const SRC = srcIx >= 0 ? args[srcIx + 1] : path.join(__dirname, '../index.html');

function ratios(sum) {
  const d0 = sum.geo.fi;                           /* 발원 아이콘의 «그려진 정사각» (위 머리말) */
  const rows = [];
  for (let i = 0; i < STOPS.length; i++) {
    const w = sum.per.map(e => e.pts[i].w);
    rows.push({ t: STOPS[i], mean: w.reduce((a, b) => a + b, 0) / w.length / d0,
                min: Math.min(...w) / d0, max: Math.max(...w) / d0 });
  }
  let below = 0, total = 0;
  for (let i = F0; i < STOPS.length; i++)
    sum.per.forEach(e => { total++; if (e.pts[i].w / d0 < FLOOR) below++; });
  return { d0, rows, below, total, tail: rows[STOPS.length - 1].mean, peak: Math.max(...rows.map(r => r.mean)) };
}

(async () => {
  console.log('작업 881 재현 — 요소 대상 버스트 알의 «판독 하한»(발원 아이콘 지름의 ' + (FLOOR * 100) + '%) 미달');
  console.log('  자: travel838 per-egg pts[].w ÷ (geo.fr×2) · 시드 고정 · 프레임 ' + STOPS.join('/') + 'ms\n');

  let bad = 0, seen = 0;
  for (const sc of SCENES) {
    const sum = await runScene(sc, SRC);
    if (sum.err) { console.log('  ✖ ' + sc.id + ' — ' + sum.err); bad++; continue; }
    console.log('[' + sc.id + '] ' + sc.n);
    if (!(sum.geo.fi > 0)) {   /* 점 대상은 `--burst-from` 신고가 없어 분모가 없다 — 절대 px 만 찍는다 */
      const abs = STOPS.map((t, i) => String(t) + 'ms Ø'
        + (sum.per.reduce((a, e) => a + e.pts[i].w, 0) / sum.per.length).toFixed(1));
      console.log('  점 대상(대조군) · 알 ' + sum.n + '개 · 발원 아이콘 신고 없음');
      console.log('    ' + abs.join(' · '));
      console.log('  ⇒ (대조군 — 판정 안 함)\n');
      continue;
    }
    const r = ratios(sum);
    console.log('  요소 대상 · 알 ' + sum.n + '개 · 발원 아이콘 정사각 Ø' + r.d0.toFixed(1)
      + 'px (호스트 상자 긴 변 ' + (sum.geo.fr * 2).toFixed(1) + 'px — 분모 아님)');
    console.log('  프레임별 지름비(평균 / 최소 / 최대, % of 발원 아이콘):');
    r.rows.forEach(x => console.log('    ' + String(x.t).padStart(4) + 'ms   '
      + (x.mean * 100).toFixed(1).padStart(5) + '%  ' + (x.min * 100).toFixed(1).padStart(5) + '%  '
      + (x.max * 100).toFixed(1).padStart(5) + '%' + (x.t >= STOPS[F0] && x.min < FLOOR ? '   ← 하한 미달' : '')));
    console.log('  봉우리 ' + (r.peak * 100).toFixed(1) + '% · 꼬리(320ms) ' + (r.tail * 100).toFixed(1) + '%'
      + ' · 하한 미달 표본 ' + r.below + '/' + r.total + ' (' + (r.below / r.total * 100).toFixed(0) + '%)');
    {
      seen++;
      const red = r.below > 0;
      console.log('  ⇒ ' + (red ? '🔴 재현됨' : '🟢 하한 안') + ' — DJ «22/27 미달» · DK «50% 축소»\n');
      if (red) bad++;
    }
  }
  console.log('PROBE881 ' + (bad ? '재현됨 — 요소 대상 ' + bad + '/' + seen + ' 씬이 하한 미달'
                                 : '미재현 — 하한 미달 표본 0'));
  process.exit(bad ? 1 : 0);
})();
