/* 작업 982 게이트 — «본체 채움 밀도가 종끼리 2.81배»
 *
 *   node tools/verify982.js
 *
 * 792 11회차가 ③ 덩치를 둘로 갈랐다 — ⓐ **크기**(본체 bbox 대각)는 `SHOT_SC` 한 표로 밴드에
 * 들어갔고(`verify792` [E1] 판정), ⓑ 남은 것이 **채움 밀도**(본체 잉크 ÷ bbox 면적)다.
 * 실측 2.81배(`bmr` 0.28 ~ `boom` 0.78)를 [E2] 가 «실루엣 축이라 792 밖» 으로 내려놓았고,
 * 그 축이 이 번호다.
 *
 * ── 축을 먼저 적는다 (등재문이 요구한 갈림) ──────────────────────────────
 * 등재문은 «밀도 밴드» 와 «재질별 무리 안에서만 밴드» 중 하나를 고르라고 했다. **둘 다 아니다.**
 *
 *   ① **재질 무리는 스프레드를 설명하지 못한다.** 방사 발광 무리(제품이 `fFar` 로 스스로 말하는
 *      `boom`·`meteor`·`flask`)를 통째로 빼도 남는 14종이 여전히 2.49배다(전체 2.81배).
 *      무리를 갈라도 결손이 그 안에 그대로 남으므로 «재질별 밴드» 는 축이 아니다 — [A1] 이 잰다.
 *   ② **위쪽은 «고를 수 있는 값» 이 아니다.** 밀도의 천장은 형상의 원형도가 정한다 —
 *      꽉 찬 원반이 π/4 = 0.785 이고 `boom`(화구) 0.779 는 그 99.2%다. 상한을 걸면 «불덩이를
 *      속 빈 고리로 파라» 가 되어 412 가 «한 밴드» 로 인정한 방사 발광 재질을 깨뜨린다.
 *      결손은 아래쪽에 산다 — 선화로 그린 종의 **획 굵기**는 고를 수 있는 값이다.
 *   ⇒ 이 자는 **하한 한 줄**이다. 문턱은 관측값이 아니라 [E1] 이 쓴 비평가 CV 의 목표
 *      «중앙값 ±25%» 의 **아래쪽 반**(중앙값 × 0.75)이다(825 — 관측값을 박으면 «지금 그대로»
 *      가 규격이 된다).
 *
 * ⚠ «밀도가 고르다» 가 «다 꽉 채운다» 는 아니다(등재문의 경고). 하한만 걸므로 원반은 원반대로,
 *   막대는 막대대로 남고 **성긴 쪽만** 올라온다. 실제로 수리 후에도 0.4~0.78 이 공존한다.
 *
 * 절:
 *   [A] 축   — 재질 무리 가설의 기각이 지금도 참인가(축이 바뀌면 이 항이 먼저 빨개진다).
 *   [B] 하한 — 17종 전부가 중앙값 × 0.75 이상. 위쪽은 원형도 천장을 안 넘는가(근거 항).
 *   [C] 대가 — 792 [E1] 덩치(**최대 변** · 995 이관 — 되돌림 사본과 견준다) · 710 분간(IoU) ·
 *              **손 안 댄 13종의 밀도 Δ0**.
 *   [D] 선언 — `SHOT_FILL` 이 한 곳에서만 선언되고 한 곳에서만 읽힌다(402 «사본을 지운다»).
 *   [R] 되돌림 시험 — 표를 비운 사본에서 [B1] 이 **실제로** 빨개진다.
 *
 * ⚑ 재는 자는 새로 안 적었다 — 후광/본체/하이라이트를 **알파를 풀어서** 가르는 자리는
 *   `verify792.measure()` 하나뿐이고, 여기서 다시 적으면 그 순간 사본이 둘이다(402).
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

/* 되돌림 사본 — 채움 표를 **비운다**(= 982 이전 세계: 네 종이 선화로 떨어진다).
   ⚠ 저장소 루트에 둔다 — /tmp 에 두면 상대 경로 assets/** 가 통째로 404 다(710·792 선례).
     이름에 pid 를 섞어 병렬 실행끼리 안 지운다(648). */
const NEG_FILL = path.join(ROOT, '.v982-neg-fill-' + process.pid + '.html');
const TAG_FILL = `const SHOT_FILL = {`;

/* 문턱 — **관측값이 아니라 목표**다(825). [E1] 이 박은 비평가 CV 의 «중앙값 ±25%» 를
   밀도 축에 그대로 옮기되, 위쪽 반은 형상의 원형도가 정하는 값이라 안 건다(위 주석 ②). */
const DENS_TOL = 0.25;
/* 꽉 찬 원반의 밀도 천장 — 반지름 r 원의 면적 πr² ÷ bbox (2r)² = π/4. 손 상수가 아니라 산수다. */
const DISK = Math.PI / 4;
/* «방사 발광 재질» 목록은 자에 손으로 안 적는다 — 제품에게 물어서 만든 `fFar` 로 가른다
   (`verify792` [B8s] 와 **같은 문턱**이라 두 자가 같은 무리를 본다). */
const FAR_MAX = 0.03;
/* [C1] — 792 [E1] 과 같은 값. 이 자가 «대가 0» 을 말하려면 그쪽과 같은 자를 써야 한다.
   ⚑ 995 — 792 가 이름을 `BULK_TOL` 로 옮겼다(눈금이 대각 → 최대 변). 값은 그대로 ±25%. */
const BULK_TOL = 0.25;
/* [C2] — 710 [C1] · 792 [D1] 과 같은 문턱. */
const IOU_MAX = 0.90;
/* [C3]·[C4] 문턱 — «표에 없는 종이 안 움직였는가» 를 **Δ0 으로 물으면 자가 스스로 플레이키다**.
   이 자리의 측정은 판(프로세스)을 넘어 흔들린다 — `page.goto` 뒤 1.1초가 **실시간**이라 그 사이
   카메라가 선 자리가 판마다 다르고, 그러면 실루엣 가장자리 화소 한 줄이 문턱을 넘었다 말았다 한다
   (실측: `spiral` bbox 폭 89 · 91 · 93 = 밀도 0.465~0.482 · Δ0.017 — 손 안 댄 트리에서). ⇒ 실측이
   **두 무리로 갈리고 사이가 비었다**: 안 댄 종의 흔들림 ≤ 0.02 ↔ 표에 적은 네 종의 이동 ≥ 0.06.
   ⚑ [C3] 은 **한 판 안에서** 두 번 재므로 그 판 흔들림만 탄다 — 실측 0.0015 ~ 0.0147(`spiral`).
   ⇒ 실측이 **두 무리로 갈리고 사이가 비었다**: 안 댄 종의 흔들림 ≤ 0.015 ↔ 표에 적은 네 종의
   이동 ≥ 0.07. 빈 구간의 0.03 을 [C3] 이 쓰고, 그것이 «빈 구간» 임을 [C4] 가 반대쪽에서
   못박는다(825 — 한쪽만 세우면 문턱이 곧 손 상수다).
   ⚠ 처음엔 0.02 로 잡았다가 되물렀다 — 같은 트리 한 판에서 `spiral` 흔들림이 **0.0147** 까지
     올라와 문턱과 1.4배밖에 안 벌어졌다(그대로 뒀으면 «내가 만든 플레이키» 다 · 825).
   ⚠ 그 흔들림은 이 행이 만든 것이 아니다(수리 전 트리에서 같다) — 곁다리 985 등재. */
const MOVE_MIN = 0.06;

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

const dens = r => r.hard / Math.max(1, r.bbw * r.bbh);
const spread = ds => Math.max.apply(null, ds) / Math.max(1e-6, Math.min.apply(null, ds));
const med = xs => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };

(async () => {
  console.log('=== VERIFY 982 — 투사체 본체 «채움 밀도» ===\n');
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const src = fs.readFileSync(SRC, 'utf8');
  const clean = () => { try { fs.unlinkSync(NEG_FILL); } catch (_) {} };

  try {
    /* ---- [D] 선언 — 표가 한 곳에서만 선언되고 한 곳에서만 읽힌다 ---- */
    const decl = (src.match(/const SHOT_FILL\s*=/g) || []).length;
    ok(decl === 1, '[D1] `SHOT_FILL` 선언 ' + decl + '곳 = 1 (규격은 한 벌 — 402)');
    const uses = (src.match(/SHOT_FILL\[/g) || []).length;
    ok(uses === 1, '[D2] `SHOT_FILL[` 를 읽는 자리 ' + uses + '곳 = 1 (`shotBody` 맨 앞 `pad` 한 줄 — ' +
       '종마다 따로 꺼내면 굽는 재귀가 다른 실루엣을 재료로 쓴다)');
    const padUse = (src.match(/2\*pad|2 \* pad|pad \/ 0\.82|if\(pad\)/g) || []).length;
    ok(padUse >= 8, '[D3] `pad` 가 실제로 그리는 자리에 닿는다 — 쓰임 ' + padUse + '곳 ≥ 8 ' +
       '(표만 있고 그리는 코드가 안 읽으면 «선언한 규격» 이 거짓말이 된다)');

    /* ---- 측정 (제품) ---- */
    const { out, errs } = await measure(browser, 'file://' + SRC);
    if (out && out.__err) { ok(false, '[M] 측정 블록 예외 — ' + out.__err); }
    else {
      const ids = Object.keys(out.rows);
      const rows = ids.map(i => ({ i, sh: out.rows[i].sh, d: dens(out.rows[i]),
                                   hard: out.rows[i].hard, bbw: out.rows[i].bbw, bbh: out.rows[i].bbh,
                                   diag: out.rows[i].diag, own: out.rows[i].own, bulk: out.rows[i].bulk, fFar: out.rows[i].fFar }));
      const all = rows.map(r => r.d);
      const dMed = med(all);
      const LO = +(dMed * (1 - DENS_TOL)).toFixed(4);

      /* ---- [A] 축 — 재질 무리 가설은 지금도 기각인가 ---- */
      const fire = rows.filter(r => r.fFar > FAR_MAX);
      const rest = rows.filter(r => r.fFar <= FAR_MAX);
      const sAll = spread(all), sRest = spread(rest.map(r => r.d));
      const keep = sRest / sAll;
      ok(keep >= 0.5,
         '[A1] 축 검산 — 방사 발광 재질 ' + fire.length + '종(' + fire.map(r => r.i).join('·') +
         ')을 빼도 밀도 스프레드가 ' + (keep * 100).toFixed(0) + '% 남는다 (전체 ' + sAll.toFixed(2) +
         '배 → 나머지 ' + sRest.toFixed(2) + '배 · ≥50%) ⇒ 축은 «재질별 밴드» 가 아니라 «전 종 하한»');
      /* ⚑ 989 이관 — 래칫 3~4 → **2**. 989 가 화구를 0.733 으로 눌러 불빛의 뻗음이 CBAND 안으로
         들어오면서 `boom` 이 이 무리에서 빠졌다(먼몫 0.167 → 0.03 이하). `verify792` [B8s] 가
         같은 수(≤ 2)를 들고 있다 — 재고가 줄면 문을 그만큼 좁힌다(865·989 와 같은 규칙). */
      ok(fire.length === 2,
         '[A2] 그 무리를 자에 손으로 안 적었다 — 제품의 `fFar` > ' + FAR_MAX + ' 로 갈린 ' +
         fire.length + '종 (2 · `verify792` [B8s] 와 같은 문턱·같은 수)');

      /* ---- [B] 하한 ---- */
      const bad = rows.filter(r => r.d < LO).sort((a, b) => a.d - b.d);
      ok(bad.length === 0,
         '[B1] 채움 밀도 하한 — 본체 잉크 ÷ bbox 면적이 중앙값 ' + dMed.toFixed(3) + ' 의 −' +
         Math.round(DENS_TOL * 100) + '% (' + LO + ') 이상 · 미달 ' + bad.length + '종' +
         (bad.length ? ' (' + bad.map(r => r.i + ':' + r.d.toFixed(3)).join(' · ') + ')' : ''));
      const over = rows.filter(r => r.d > DISK + 0.02);
      ok(over.length === 0,
         '[B2] 위쪽은 형상이 정한다 — 꽉 찬 원반 천장 π/4 = ' + DISK.toFixed(3) +
         ' 를 넘는 종 ' + over.length + '종 (넘으면 «원반보다 꽉 찬 것» 이니 상한 축을 다시 본다 · 실측 최대 ' +
         Math.max.apply(null, all).toFixed(3) + ')');
      const ratio = spread(all);
      ok(ratio <= 2.2,
         '[B3] 밀도 스프레드 ' + ratio.toFixed(2) + '배 ≤ 2.2 (수리 전 2.81 · 하한을 올린 만큼만 좁아진다 — ' +
         '천장은 원형도가 잡고 있으므로 1.0 으로는 안 간다)');

      /* ---- [C] 대가 ---- */
      /* ⚑ 989 이관 — [E1] 의 **눈금이 바뀌었다**(본체 → 본체 + 종이 제 손으로 깐 반투명 부품).
         옛 눈금(`diag`)을 여기서 계속 재면 이 항은 «792 의 판정» 이 아니라 **792 가 버린 자**를
         지키게 된다 — 989 뒤 실제로 밖 4종으로 빨개졌고 그 넷(whirl·arrow·bounce·gale)은
         989 가 한 글자도 안 건드린 종이다. 값은 `verify792` 의 measure 가 돌려준 것 그대로다(402).
         ⚑⚑ **995 이관 — 접는 법이 «대각» 에서 «최대 변»(`bulk`)으로 바뀌었다**(같은 이유로 한 번 더:
         대각은 정사각형 종을 +41.4% 부풀려 밴드를 인위적으로 좁힌다 — `verify792` measure 주석).
         ⚠ **묻는 문장도 같이 바뀌었다.** 옛 [C1] 은 792 의 **절대 밴드**를 여기서 한 번 더 물었는데,
           995 뒤 그 밴드는 792 자신이 배율표로 닫을 때까지 **빨간 것이 정상**이라(등재 995) 그대로
           두면 982 는 «남의 미완» 때문에 빨개진다 — 982 가 한 글자도 안 건드린 종 때문에.
         ⇒ 982 가 질 수 있는 것은 **«내 획 처방이 덩치를 더 벌렸는가»** 하나뿐이므로 자기 되돌림
           사본(`SHOT_FILL` 빈 표)과 **견준다**. 792 가 밴드를 닫아도 이 항은 그대로 초록이고,
           982 가 획을 부풀려 덩치를 밀면 그때 빨개진다(문턱은 부등호 하나 — 825). */
      fs.writeFileSync(NEG_FILL, src.replace(new RegExp(TAG_FILL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*'),
                                             'const SHOT_FILL = {};'));
      const neg = await measure(browser, 'file://' + NEG_FILL);
      const negOk = !(neg.out && neg.out.__err);
      if (!negOk) ok(false, '[R] 되돌림 측정 블록 예외 — ' + neg.out.__err);
      /* ⚠ **묻는 것은 [E1] 이 묻는 것과 같은 것 하나뿐이다 — «밴드 밖 종»**(개수가 아니라 이름).
         스프레드는 같이 찍되 판정에 안 넣는다: 획을 패딩하면 그 종의 bbox 가 몇 px 커지므로
         **밖에 이미 나가 있는 종의 값이 조금 더 커지는 것**은 이 처방의 정의상 따라오는 몫이고,
         그것까지 부등호로 묶으면 문턱이 곧 손 상수가 된다(825). 판정이 잡는 것은 **«안에 있던
         종이 밖으로 나갔는가»** — 그것이 «내 획이 [E1] 의 판정을 더 나쁘게 만들었는가» 다. */
      /* ⚑⚑ 1001 이관 — **접는 법·견주는 법을 여기서 다시 적지 않는다**(402 «사본을 지운다»).
         이 자리는 989 → 995 → 998 이 **세 번 연속으로 고친 사본**이었다: 눈금이 본체 → 본체+반투명
         부품으로(989), 대각 → 최대 변으로(995) 옮길 때마다 인라인 산수만 뒤처져 «792 가 버린 자»
         를 지켰다. 998 이 그 산수를 부품 `tools/bulk998.js` 한 벌로 빼 뒀고 `verify981` [D2] 가
         먼저 갈아 끼웠다 — 여기가 그 **네 번째이자 마지막 사본**이다(제품 0줄).
         ⚠ `verify995` 의 인라인 접기는 사본이 아니다 — 그 자의 일이 «네 접는 법을 나란히 견주는
           것» 이라 부품 하나로 묶으면 그 물음 자체를 잃는다. 건드리지 마라.
         ⚠ 눈금(`bulk` = 최대 변)과 밴드 반폭(`BULK_TOL`)은 **792 가 고른다** — 부품은 픽셀도
           문턱도 안 만들고, 재는 자는 위 `measure`(= `verify792.measure`) 하나뿐이다. */
      const B998 = require('./bulk998');
      const bulkBand = (rs) => B998.band(rs, BULK_TOL, 'bulk');
      if (negOk) {
        const cur = bulkBand(out.rows);
        const nb = bulkBand(neg.out.rows);
        /* 되돌림 판이 하나뿐이라 «판 전부에서 안» = «이 판에서 안» 이다(부품 `newOut` 의 정의). */
        const newOut = B998.newOut(cur, [nb]);
        ok(newOut.length === 0,
           '[C1] 대가 — 획 처방이 792 [E1] 덩치(최대 변) 밴드에서 **안에 있던 종을 밖으로 내보내지 ' +
           '않았다** · 새로 밖 ' + newOut.length + '종' + (newOut.length ? ' (' + newOut.join(' · ') + ')' : '') +
           ' · 밖 [' + nb.out.join('·') + '](되돌림) → [' + cur.out.join('·') + '](제품)' +
           ' · (기록) 스프레드 ' + nb.sp + '배 → ' + cur.sp + '배 · 중앙값 ' + nb.m + ' → ' + cur.m + 'px' +
           ' · 밴드 ' + cur.lo + '~' + cur.hi +
           ' (⚠ 절대 밴드는 792 [E1] 이 든다 — 995 뒤 그것은 배율표를 닫을 때까지 빨갛다)');
      }
      ok(out.worst.iou <= IOU_MAX,
         '[C2] 대가 — 710 분간이 안 되감겼다 · 실루엣 IoU 최댓값 ' + out.worst.iou + ' ≤ ' + IOU_MAX +
         ' (최악 쌍 ' + out.worst.a + '↔' + out.worst.b + ')');
      ok(errs.length === 0, '[G1] 콘솔/페이지 오류 0건 (실측 ' + errs.length + ')');

      /* ---- [R] 되돌림 + [C3] 범위 ---- */
      /* ⚑ 995 — 되돌림 사본은 위 [C1] 이 이미 재 두었다(한 번만 굽는다 · 402 «사본을 지운다»). */
      if (negOk) {
        const nd = {};
        for (const i of Object.keys(neg.out.rows)) nd[i] = dens(neg.out.rows[i]);
        const nAll = Object.values(nd);
        const nMed = med(nAll), nLo = nMed * (1 - DENS_TOL);
        const nBad = Object.keys(nd).filter(i => nd[i] < nLo);
        /* ⚑ 이관(2026-09-06, 981 2회차) — 기대를 **4 → 3** 으로 내렸다. 되돌림 사본의 하한은
           «그 사본의 중앙값 × 0.75» 라 **남의 회차가 밀도를 내리면 같이 내려간다**: 981 2회차가
           `rico`(마름모 → 뿔 결정) 0.532 → 0.465 · `meteor` 0.641 → 0.501 · `flask` 0.645 → 0.593
           으로 셋을 내리자 중앙값이 0.532 → 0.489, 되돌림 하한이 0.399 → 0.360 이 됐고
           표의 넷 중 `whirl`(0.36 대)이 그 아래로 **안 떨어지게** 됐다(4 → 3).
           ⚠ 이것은 982 의 수리가 풀린 것이 아니다 — [B1]·[B3] 은 초록이고 스프레드는 오히려
             2.81 → 1.77 로 더 좁다(981 이 꽉 찬 쪽을 깎았다). 숫자를 못박으면 이런 «옆 회차»
             마다 자가 거짓말을 한다(348). 「셋 이상이면 표가 일하고 있다」로 충분하다.
           ⚑⚑ 이관 두 번째(2026-09-06, 981 **4회차**) — 같은 기계로 **3 → 2** 다.
             4회차가 `curve`(초승달)를 굽은 띠에서 손톱달로 갈며 밀도를 0.603 → 0.456 으로 내리자
             되돌림 사본의 중앙값이 또 내려가 하한이 **0.371 → 0.347** 이 됐고, 표의 셋 중
             `arrow`(**0.348**)가 그 아래로 **0.001 차이로** 안 떨어지게 됐다.
             ⚠ 대조로 못박았다(338·344) — `330352a`(981 4회차 직전)의 index.html 을 그대로 놓고
               지금 자를 돌리면 **14/14 PASS**(하한 0.371 · 미달 3종)다. 곧 «자가 썩은 것» 이 아니라
               **밀도 지형이 움직인 것**이고, [B1]·[B3]·[C1] 은 그 트리에서 전부 초록이다.
             ⚠ **2 로 내리는 것이 3 을 지키려 문턱을 손대는 것보다 낫다** — arrow 의 0.001 은
               동전 던지기라 그것을 붙잡으면 «내가 만든 플레이키» 가 된다(792-⑤). 남는 둘
               (`boomer` 0.277 · `gale` 0.292)은 하한에서 **16~21% 아래**라 흔들리지 않는다.
             ⚠ 이 수를 **다시 올리지 마라** — 981 이 남은 볼록 무리(`ball`·`bottle`·`rock`·`fire`)를
               계속 깎을 예정이라 하한은 앞으로도 내려간다. 1 이 되면 그때는 **무엇을 묻는지**를
               다시 적어라(«표를 비우면 빨개진다» 는 미달 1종이면 이미 참이다 — 988 처방). */
        ok(nBad.length >= 2,
           '[R1] 표를 비우면 [B1] 이 빨개진다 — 하한(' + nLo.toFixed(3) + ') 미달 ' + nBad.length +
           '종 ≥ 2 (' + nBad.map(i => i + ':' + nd[i].toFixed(3)).join(' · ') + ')');
        /* ⚑ [C3] 이 «범위» 를 못박는다 — 표에 없는 종은 **한 화소도** 안 바뀌어야 한다.
           표를 비운 사본과 제품에서 그 13종의 밀도가 갈리면 pad 가 남의 자리로 샌 것이다. */
        const touched = new Set((src.match(/const SHOT_FILL = \{([^}]*)\}/) || [, ''])[1]
                                .split(',').map(s => s.split(':')[0].trim()).filter(Boolean));
        const leak = rows.filter(r => !touched.has(r.sh) && nd[r.i] !== undefined &&
                                      Math.abs(nd[r.i] - r.d) > MOVE_MIN / 2);
        ok(leak.length === 0,
           '[C3] 범위 — 표에 없는 ' + rows.filter(r => !touched.has(r.sh)).length +
           '종이 되돌림 사본과 같은 밀도다 (Δ ≤ ' + (MOVE_MIN / 2) + ') · 샌 종 ' + leak.length +
           (leak.length ? ' (' + leak.map(r => r.i + ':' + r.d.toFixed(4) + '↔' + nd[r.i].toFixed(4)).join(' · ') + ')' : '') +
           ' · 잰 흔들림 최대 ' + Math.max.apply(null, rows.filter(r => !touched.has(r.sh) && nd[r.i] !== undefined)
                                                    .map(r => Math.abs(nd[r.i] - r.d))).toFixed(4) +
           ' (표 ' + Array.from(touched).join('·') + ')');
        /* 문턱이 **빈 구간 한가운데**에 있음을 짝 항이 못박는다(825) — 안 세우면 «0.03» 이
           손 상수가 된다. 손댄 종은 전부 그 두 배 넘게 움직였고, 안 댄 종은 절반 아래다. */
        const moved = rows.filter(r => touched.has(r.sh) && nd[r.i] !== undefined);
        const still = moved.filter(r => Math.abs(nd[r.i] - r.d) < MOVE_MIN);
        ok(still.length === 0,
           '[C4] 문턱이 빈 구간에 있다 — 표에 적은 ' + moved.length + '종은 전부 Δ ≥ ' + MOVE_MIN +
           ' 만큼 움직였다 · 못 움직인 종 ' + still.length + ' (' +
           moved.map(r => r.sh + ':+' + (r.d - nd[r.i]).toFixed(3)).join(' · ') + ')');
        console.log('\n  [표] 종별 밀도 — 제품 ↔ 되돌림 (본체잉크 / bbox)\n');
        console.log('        ' + 'id'.padEnd(9) + 'sh'.padEnd(10) + '밀도'.padStart(8) +
                    '되돌림'.padStart(9) + '잉크'.padStart(8) + 'bbox'.padStart(11) + '대각'.padStart(8));
        for (const r of rows.slice().sort((a, b) => a.d - b.d)) {
          console.log('        ' + r.i.padEnd(9) + String(r.sh).padEnd(10) +
                      r.d.toFixed(3).padStart(8) +
                      (nd[r.i] === undefined ? '—' : nd[r.i].toFixed(3)).padStart(9) +
                      String(r.hard).padStart(8) + (r.bbw + '×' + r.bbh).padStart(11) +
                      String(r.diag).padStart(8) + (r.d < LO ? '   ← 하한 미달' : ''));
        }
        console.log('');
      }
    }
  } finally {
    clean();
    await browser.close();
  }

  console.log('VERIFY982 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
