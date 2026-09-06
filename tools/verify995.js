/* 작업 995 게이트 — «`verify792` [E1] 의 덩치 눈금이 «bbox 대각» 이라 잠복 초록을 만든다»
 *
 *   node tools/verify995.js
 *
 * 792 14회차(비평 2인 CZ·DA 독립)가 ③ 덩치 밴드를 «깨졌다» 로 냈는데 [E1] 은 같은 트리에서
 * **밖 0종**으로 초록이었다. 등재 995 가 그 어긋남의 뿌리를 산수 한 줄로 찍었다:
 *
 *     대각 = 최대변 × √(1 + (최소변/최대변)²)
 *
 * 가산분이 **종횡비에 통째로 달려 있다** — 정사각형 `stone`·`shuri` 에 **+41.4%**,
 * 가느다란 `lance`(152×22)에 **+1.0%**. 비평가가 «작다» 고 지목한 둘이 정확히 정사각형이고
 * «크다» 고 지목한 둘이 정확히 조각이라, 대각은 **눈이 보는 스프레드를 그 자리에서만 골라
 * 눌러 준다.** ⇒ [E1] 의 초록은 규격이 선 증거가 아니라 **눈금이 만든 것**이었다
 * (LESSONS 979-② 다섯 번째 자리 · 989 «상자가 만든 초록» 의 형제).
 *
 * ── 995 가 고른 눈금 (선택이지 측정이 아니다 — 394 규약) ────────────────────
 *   **최대 변**(`bulk` = max(w, h) — 그 상자가 화면에서 뻗는 길이).
 *   상자(989 «본체 + 제 손으로 깐 반투명 부품»)와 문턱(±25% · 10회차 CV 목표)은 **한 글자도**
 *   안 건드렸다. 셋 중 최대 변만이 14회차 2인이 **눈으로** 지목한 넷을 그대로 도로 낸다:
 *     · 최대 변  — 밖 5종 = shuri·stone(작다) + arrow·lance(크다) + meteor
 *     · 기하평균 — 밖 4종인데 그 안에 **`lance` 가 «가장 작은 종» 으로** 뒤집혀 들어간다
 *     · 대각     — 밖 0종 (위 산수)
 *
 * 절:
 *   [A] 산수 — 두 수가 같은 상자에서 나온다(항등식) · 대각의 가산분이 **종횡비에 달려 있다**.
 *   [B] 선언 — 자가 그 눈금을 실제로 읽는가(792 [E1]·982 [C1] · 이름이 눈금을 말하는가 ·
 *              버린 접는 법 셋이 기록으로 남아 있는가 = 되돌림 경로).
 *   [R] 되돌림 — 같은 표를 대각으로 도로 접으면 **밖 종 수가 줄어든다**(= 대각은 더 무르다).
 *              ⚠ 이 자의 되돌림은 사본을 굽지 않는다 — 등재문 그대로 **재현 비용 0**이다.
 *                 접는 법을 바꾸는 것이 곧 되돌림이라 같은 측정 한 판에서 둘 다 나온다.
 *
 * ⚠ 이 자는 [E1] 이 **초록인지 빨간지는 묻지 않는다** — 밴드를 닫는 것은 792 의 몫(`SHOT_SC`)이고
 *   995 의 몫은 «눈금이 거짓 초록을 만들지 않는 것» 하나다. 992·989 와 같은 갈래다.
 * ⚠ 재는 자는 새로 안 적었다 — `verify792.measure()` 하나뿐이다(402 «사본을 지운다»).
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { measure } = require('./verify792');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const V792 = path.join(ROOT, 'tools', 'verify792.js');
/* ⚑ 1001 — **인자로 다른 982 사본을 물릴 수 있다**(998 이 `verify981` 에 준 것과 같은 손잡이).
   그것이 [B4] 의 되돌림 시험이다: 1001 이전 꼴(인라인 접기)로 되돌린 사본을 물리면 [B4] 가
   실제로 빨개진다 — `node tools/verify995.js <982사본>` · 굽는 쪽은 `tools/verify1001.js` [R3]. */
const V982 = process.argv[2] && !/^--/.test(process.argv[2])
             ? path.resolve(process.argv[2]) : path.join(ROOT, 'tools', 'verify982.js');
/* 1001 이관 — 982 [C1] 의 접는 산수가 부품으로 갔다. [B4] 가 «부품이 실제로 그 눈금으로 접는가»
   까지 봐야 «`B998.band(…)` 라고 부르기만 하는 빈 껍데기» 로 초록이 되지 않는다. */
const B998F = path.join(ROOT, 'tools', 'bulk998.js');

/* [E1] 밴드 — 792 가 든 값 그대로다(±25% · 10회차 비평가 CV 목표). 여기서 다시 고르지 않는다. */
const BULK_TOL = 0.25;
/* [A1] 항등식 허용 오차 — 두 수는 **같은 정수 bbox** 에서 나오고 소수 1자리로 반올림돼 있다
   (`+Math.hypot(w,h).toFixed(1)`). 그러니 오차의 상한은 반올림 폭 0.05 뿐이고, 0.2px 는
   그 네 배다 — 관측값이 아니라 **표기 자릿수에서 나온 수**다(825). */
const ID_EPS = 0.2;
/* [A2] 문턱 — 손 상수가 아니라 **산수**다. 대각의 가산분은 종횡비 하나로 정해지므로
     · 정사각형(비 1.00) : √2 − 1        = 0.4142
     · 종횡비 2.0        : √(1+1/4) − 1  = 0.1180
   ⇒ «한 판에 정사각형과 종횡비 2 이상이 같이 있으면» 가산분 폭이 이 차(0.2962)를 넘는다.
   이 판의 실제 지형은 비 1.00 ~ 6.91 이라 폭 0.404 다. 이 항이 빨개지는 세계는 «17종이 전부
   비슷한 종횡비» 인 세계이고, 그때는 **대각도 중립**이니 이 행의 전제를 다시 읽어야 한다. */
const SQ = Math.SQRT2 - 1, ASP2 = Math.sqrt(1 + 0.25) - 1;
const SPAN_MIN = +(SQ - ASP2).toFixed(4);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const med = xs => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
const fold = (rows, ids, key) => {
  const g = ids.map(i => rows[i][key]).sort((a, b) => a - b);
  const m = med(g);
  return { m: +m.toFixed(1), out: ids.filter(i => rows[i][key] < m * (1 - BULK_TOL) ||
                                                  rows[i][key] > m * (1 + BULK_TOL)),
           sp: +(g[g.length - 1] / Math.max(1, g[0])).toFixed(2), min: g[0], max: g[g.length - 1] };
};

(async () => {
  console.log('=== VERIFY 995 — 덩치 눈금(대각 → 최대 변) ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  try {
    const s792 = fs.readFileSync(V792, 'utf8');
    const s982 = fs.readFileSync(V982, 'utf8');

    /* ---- [B] 선언 — 자가 그 눈금을 읽는가 ---- */
    /* [E1] 판정 줄. `bulkBand('bulk')` 한 곳에서 나오고, 그 결과(`bk.bad`)가 ok() 에 들어간다. */
    ok(/const bk = bulkBand\('bulk'\);/.test(s792) && /ok\(bk\.bad\.length === 0,/.test(s792),
       '[B1] 792 [E1] 이 **최대 변**(`bulk`)으로 판정한다 — `bulkBand(\'bulk\')` → `bk.bad.length === 0`');
    ok(!/ok\(\s*[a-zA-Z]*[Bb]ad\.length === 0,\s*\n?\s*'\[E1\][^']*대각/.test(s792) &&
       !/rows\[i\]\.own < dLo/.test(s792),
       '[B2] 옛 눈금(대각)이 판정에 안 남아 있다 — [E1] 이 `own`/`diag` 로 재던 사본 0곳');
    ok(!/DIAG_TOL/.test(s792.replace(/`DIAG_TOL`/g, '')) && !/DIAG_TOL/.test(s982),
       '[B3] 이름이 눈금을 말한다 — `DIAG_TOL` 이 792·982 어디에도 없다(`BULK_TOL`). ' +
       '이름이 거짓말하면 다음 회차가 또 대각을 읽는다');
    /* ⚑ 1001 이관 — 묻는 것은 그대로 «982 [C1] 도 같은 눈금을 읽는가» 이고, **자리만 옮겼다**.
       인라인 산수(`r.bulk < m * (1 - BULK_TOL)`)를 그대로 물으면 998 이 그 산수를 부품
       `tools/bulk998.js` 로 뺀 순간 이 항이 «남의 정리» 때문에 빨개진다 — 989 → 995 → 998 →
       1001 이 네 번 고친 것이 바로 그 사본이다. ⇒ 부품을 **어떤 눈금으로 부르는가**를 묻되,
       부품이 실제로 그 열쇠로 접는지까지 같이 본다(안 그러면 이름만 부르는 껍데기로 초록이 된다). */
    const sB998 = fs.readFileSync(B998F, 'utf8');
    ok(/B998\.band\(\s*rs\s*,\s*BULK_TOL\s*,\s*'bulk'\s*\)/.test(s982) && /\[C1\] 대가/.test(s982) &&
       /rows\[i\]\[k\]\s*<\s*lo/.test(sB998) && /const k = key \|\| 'bulk';/.test(sB998),
       '[B4] 982 [C1] 도 **같은 눈금**을 읽는다 — 1001 이관: 인라인 산수가 부품 ' +
       '`bulk998.band(rs, BULK_TOL, \'bulk\')` 로 갔고 그 부품이 실제로 그 열쇠로 접는다 ' +
       '(눈금이 둘이면 두 자가 서로 다른 덩치를 지킨다 — 402)');
    ok(/\[E1n\] 같은 상자를 접는 법/.test(s792) &&
       /\['최대변\(판정\)', 'bulk'\]/.test(s792) && /\['대각\(옛 눈금\)', 'own'\]/.test(s792),
       '[B5] 버린 접는 법 셋이 [E1n] 표에 기록으로 남아 있다 — **되돌림 방법이 곧 그 표**다 ' +
       '(위임 규약: 주인이 뒤집으면 판정 열만 바꾼다)');

    /* ---- 측정 (제품) — 한 판으로 네 접는 법을 전부 낸다(재현 비용 0) ---- */
    const { out, errs } = await measure(browser, 'file://' + SRC);
    if (out && out.__err) { ok(false, '[M] 측정 블록 예외 — ' + out.__err); }
    else {
      const ids = Object.keys(out.rows);
      ok(ids.length >= 17, '[A0] 투사체를 내는 종 ' + ids.length + '종 ≥ 17 (792 [A0] 과 같은 판)');

      /* ---- [A] 산수 ---- */
      const bad1 = ids.filter(i => {
        const r = out.rows[i], mx = Math.max(r.obw, r.obh), mn = Math.min(r.obw, r.obh);
        return Math.abs(r.own - mx * Math.sqrt(1 + (mn / mx) * (mn / mx))) > ID_EPS;
      });
      ok(bad1.length === 0,
         '[A1] 두 수가 같은 상자에서 나온다 — `대각 = 최대변 × √(1+(최소변/최대변)²)` 이 ' +
         ids.length + '종 전부에서 ±' + ID_EPS + 'px 안 · 어긋난 종 ' + bad1.length +
         (bad1.length ? ' (' + bad1.join(' · ') + ')' : '') +
         ' (틀리면 아래 [A2]·[R1] 이 «다른 상자» 를 견주는 것이다)');

      const inf = ids.map(i => {
        const r = out.rows[i], mx = Math.max(r.obw, r.obh), mn = Math.min(r.obw, r.obh);
        return { i, asp: +(mx / mn).toFixed(2), g: r.own / mx - 1 };
      }).sort((a, b) => b.g - a.g);
      const span = +(inf[0].g - inf[inf.length - 1].g).toFixed(4);
      ok(span >= SPAN_MIN,
         '[A2] 대각은 **중립적인 접는 법이 아니다** — 가산분이 종횡비 하나로 정해진다 · 이 판의 폭 ' +
         (span * 100).toFixed(1) + '%p ≥ ' + (SPAN_MIN * 100).toFixed(1) +
         '%p (= 정사각형 41.4% − 종횡비 2.0 의 11.8% · 손 상수가 아니라 산수) · 최대 ' +
         inf[0].i + ' 비' + inf[0].asp + ' +' + (inf[0].g * 100).toFixed(1) + '% ↔ 최소 ' +
         inf[inf.length - 1].i + ' 비' + inf[inf.length - 1].asp + ' +' +
         (inf[inf.length - 1].g * 100).toFixed(1) + '%');
      console.log('  (기록) 종별 대각 가산분 — ' +
        inf.map(r => r.i + ':' + (r.g * 100).toFixed(1) + '%(비' + r.asp + ')').join(' · '));

      /* ---- [R] 되돌림 — 같은 표를 도로 접는다 ---- */
      for (const i of ids) out.rows[i].inkR = +Math.sqrt(out.rows[i].hard).toFixed(1);
      const fB = fold(out.rows, ids, 'bulk'), fD = fold(out.rows, ids, 'own');
      const fG = fold(out.rows, ids, 'ownGeo'), fI = fold(out.rows, ids, 'inkR');
      ok(fD.out.length <= fB.out.length,
         '[R1] 대각으로 도로 접으면 밴드가 **무르게 풀린다** — 밖 ' + fB.out.length + '종(최대 변) → ' +
         fD.out.length + '종(대각) · 스프레드 ' + fB.sp + '배 → ' + fD.sp + '배 ' +
         '(등재 실측: 5종 → **0종** · 2.10 → 1.59배 = [E1] 이 초록이던 이유 그 자체)');
      /* ⚑ [R2] 는 [R1] 과 **다른 것을 묻는다** — [R1] 은 «전체가 무르게 풀리는가»(개수),
         [R2] 는 **«누구를 밀어 올려서 그렇게 되는가»**(자리)다. 비평가가 «작다» 고 지목한 종이
         정확히 정사각형이었으므로, 대각이 그 종들을 **중앙값 쪽으로 밀어 넣는지**를 직접 잰다.
         ⚠ 이것은 산수라 트리가 바뀌어도 산다 — 정사각형은 대각에서 항상 최대(+41.4%)를 받고
           중앙값 종은 그보다 적게 받으므로 «중앙값 대비 자리» 가 반드시 올라간다. 792 가
           배율표로 밴드를 닫아도 이 항은 그대로 초록이다(그때는 [R1] 의 개수만 0-0 이 된다). */
      const sq = ids.filter(i => { const r = out.rows[i];
        return Math.max(r.obw, r.obh) / Math.min(r.obw, r.obh) <= 1.1; });
      const notPushed = sq.filter(i => (out.rows[i].own / fD.m) <= (out.rows[i].bulk / fB.m));
      ok(sq.length >= 2 && notPushed.length === 0,
         '[R2] 대각은 **정사각형 종을 중앙값 쪽으로 밀어 넣는다** — 비 ≤ 1.1 인 ' + sq.length +
         '종(' + sq.join('·') + ') 전부가 중앙값 대비 자리가 올라간다 · 안 올라간 종 ' +
         notPushed.length + ' · ' + sq.map(i => i + ' ' + (out.rows[i].bulk / fB.m).toFixed(3) +
         '→' + (out.rows[i].own / fD.m).toFixed(3)).join(' · ') +
         ' (비평 2인이 «작다» 로 지목한 둘이 정확히 이 무리다 — 그 신호를 눌러 온 것이 대각이다)');
      console.log('  (기록) 같은 상자를 접는 법 — 최대변 중앙값 ' + fB.m + '(' + fB.min + '~' + fB.max +
        ' · ' + fB.sp + '배 · 밖 ' + fB.out.length + '종 [' + fB.out.join('·') + ']) · 대각 ' + fD.m +
        '(' + fD.sp + '배 · 밖 ' + fD.out.length + '종) · 기하평균 ' + fG.m + '(' + fG.sp + '배 · 밖 ' +
        fG.out.length + '종 [' + fG.out.join('·') + ']) · 잉크√ ' + fI.m + '(' + fI.sp + '배 · 밖 ' +
        fI.out.length + '종 [' + fI.out.join('·') + '])');
      ok(errs.length === 0, '[G1] 콘솔/페이지 오류 0건 (실측 ' + errs.length + ')');
    }
  } finally {
    await browser.close();
  }

  console.log('\nVERIFY995 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
