/* 작업 934 — 배지 두 줄 덩어리가 별판 안에서 «위로 떠 있는가» 의 **게이트**.
   답: **떠 있지 않다(기각)** — 895 1회차 채점 GH 의 «위 5.8px» 은 자의 그림자다.

   이 자가 지키는 것은 «글자가 제자리다» 한 줄이 아니라 **왜 두 비평이 갈렸는가** 다.
   분홍 마스크는 판 «전체» 가 아니라 노랑 글자 + 검정 획이 뚫어 놓은 **도넛**이고,
   도넛의 무게중심은 구멍의 크기·자리에 끌려간다 ⇒ **GH 의 원점은 재려는 대상에 의존한다.**

   ⚑⚑ **972 갈아 끼움(2026-09-06) — 934 가 «둘째 증인» 으로 세웠던 덮개 원점은 증인이 아니었다.**
   961(«배지 윗줄 검정 획 8 → 10»)이 그 사실을 드러냈다. 흘려채우기(flood fill)는 검정 획이
   판 실루엣 **안에 갇혀 있을 때만** 글자를 메운다 — 새 눈금 `encl`(«가둠 정도» = 노랑 잉크 중
   메워진 판 안에 드는 비율)이 그 체제를 직접 찍는다:
       ref **20.7%**  ·  우리 획 8px **68.0%**  ·  우리 획 10px(961 이후) **19.2%**
   ⇒ 934 마감 당시 우리는 글자를 **가두고** 있었고 ref 는 **새고** 있었다. 서로 다른 체제의
   두 값(ref +4.37 ↔ 우리 +4.80)이 0.4px 안에서 만난 것이 «별 모양이 충실하다» 로 읽혔을 뿐이다.
   961 뒤 우리도 ref 와 **같은 체제**(19.2% ↔ 20.7%)로 들어오자 덮개 기울음이 +9.44 로 벌어졌다.
   ⇒ **덮개는 «생 무게중심» 과 같은 부류다** — 체제를 글자(획 두께)가 정한다.
   ⚑ **그래도 934 의 결론은 그대로 선다.** 판정을 지는 원점은 **AABB 중심 하나**이고
   그 답은 두 체제에서 **한 자도 안 움직였다**(획 8 · 획 10 둘 다 +1.43px = 판 높이의 0.79%).
   §S 가 그것을 양성 대조로 못박는다.
   ⚠ **961 은 잘못한 게 없다** — `probe961` 이 선언 8~12 를 실제로 그려 10 을 골랐고,
   가둠 정도로 보면 10 이 **ref 체제에 더 가깝다**(19.2 ↔ 20.7). 상수를 박아 둔 쪽이 자였다(368 선례).

   § 절 다섯
     [A] 원점이 무엇에 의존하는가 — 구멍·가둠 · 생 갈림 재현 · 덮개도 그것을 못 없앤다
     [B] 답 — 글자에 안 기대는 원점은 **하나**(AABB 중심)뿐이다
     [R] 되돌림 시험 — GH 처방을 **실제로 얹어** 캡처하면 그 하나가 빨개진다
         (여기가 이 자의 심장이다: «제자리» 가 자의 무딤이 아니라는 것을 이 절이 못박는다)
     [C] 자기 검사 — 생·덮개 두 원점은 글자를 따라 **움직이고** AABB 는 안 움직인다
     [S] 획 되돌림 대조(972 신설) — 획을 8 로 되돌리면 **옛 체제가 그대로 돌아오고**,
         그런데도 AABB 의 답만은 안 움직인다 = 위 갈아 끼움이 «문턱을 푼 것» 이 아님을 못박는다

   ⚠ [R]·[S] 는 index.html 을 **안 건드린다** — `addStyleTag` 로 그 페이지에만 얹는다
      (병렬 워커가 같은 파일을 만지므로 파일을 고쳤다 되돌리는 길은 쓰지 않는다).

   실행: node tools/verify934.js
*/
const { pw, launch } = require('./pwlaunch');
const { py } = require('./pydep937');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SC = path.join(ROOT, 'scratch');

/* GH 처방(895 1회차 채점) — 윗줄 top +4.9 · 아랫줄 top +6.4.
   ⚠ 두 줄을 **다른** 양으로 미는 것이라 885 [1-m] «강체» 도 같이 깬다(등재문 경고). */
const GH_CSS = `.pvc>.bdg>i{top:64.275px!important}
                .pvc>.bdg>b{top:109.075px!important}`;

/* 972 §S — 961 **직전**의 윗줄 검정 획(8px)을 그 페이지에만 되돌린다.
   되돌림 한 줄은 index.html `.pvc>.bdg>i` 위 주석이 이미 적어 두고 있다. */
const S8_CSS = `.pvc>.bdg>i{-webkit-text-stroke:8px #000!important}`;

let pass = 0, fail = 0;
const ck = (name, cond, got) => {
  if (cond) { pass++; console.log('  ✓ ' + name + (got === undefined ? '' : '  — ' + got)); }
  else { fail++; console.log('  ✗ ' + name + (got === undefined ? '' : '  — ' + got)); }
};

async function shot(css, out, geoOut) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    S.dia = 3e5; S.gold = 1e9;
    S.seen = S.seen || {};
    document.querySelectorAll('#tabbar .tab').forEach((x) => { S.seen[x.dataset.t] = 1; });
    document.querySelectorAll('#tabbar .tab').forEach((x) => x.classList.remove('fresh'));
    openShopTab('pass');                 /* 164 공용 헬퍼 — cap151.js 와 같은 정식 경로 */
  });
  await p.waitForTimeout(1000);
  if (css) await p.addStyleTag({ content: css });
  await p.waitForTimeout(200);
  /* 정지 캡처 — LESSONS 28-③ · 51-③(전투 캔버스·유휴 루프·등장 애니가 잉크를 오염시킨다) */
  await p.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *, #top *, #tabbar *').forEach((e) => {
      e.style.animation = 'none'; e.style.transition = 'none';
    });
  });
  await p.waitForTimeout(150);
  const geo = await p.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const box = (r) => ({
      x: +(r.left - A.left).toFixed(1), y: +(r.top - A.top).toFixed(1),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
    });
    return {
      frameH: +A.height.toFixed(1),
      cards: [...document.querySelectorAll('.pvc')].map((c) => {
        const e = c.querySelector('.bdg');
        return { id: c.dataset.pv, cls: [...c.classList], bdg: e ? box(e.getBoundingClientRect()) : null };
      }),
    };
  });
  await p.locator('#app').screenshot({ path: out });
  fs.writeFileSync(geoOut, JSON.stringify(geo));
  await b.close();
}

function scan(cap, geo) {
  /* `py()` 는 코드 2(환경에 없음)·3(자가 못 쟀다)을 그대로 옮기며 스스로 죽는다(937·939) —
     여기서 다시 감싸면 그 신호가 «없는 자» 로 뭉개진다. 성공한 경우만 손에 들어온다. */
  const out = String(py([path.join(__dirname, 'scan934.py'), '--cap', cap, '--geo', geo],
    { cwd: ROOT, encoding: 'utf8' }));
  const lines = out.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

(async () => {
  fs.mkdirSync(SC, { recursive: true });
  const capA = path.join(SC, 'v934-base.png'), geoA = path.join(SC, 'v934-base.json');
  const capB = path.join(SC, 'v934-gh.png'), geoB = path.join(SC, 'v934-gh.json');
  const capS = path.join(SC, 'v934-s8.png'), geoS = path.join(SC, 'v934-s8.json');
  await shot(null, capA, geoA);
  await shot(GH_CSS, capB, geoB);
  await shot(S8_CSS, capS, geoS);
  const A = scan(capA, geoA);
  const B = scan(capB, geoB);
  const S8 = scan(capS, geoS);

  const [aabbDx, aabbDy, aabbPct] = A.dx_dy_pct.aabb;
  const [, rawDy, rawPct] = A.dx_dy_pct.raw;
  const [covDx, covDy, covPct] = A.dx_dy_pct.cov;

  const holeGap = A.hole_our - A.hole_ref;
  const holeGap8 = S8.hole_our - S8.hole_ref;
  const enclGap = A.encl_our - A.encl_ref;
  const enclGap8 = S8.encl_our - S8.encl_ref;
  const skewRawGap = A.skew_raw[1] - A.skew_raw[0];
  const skewCovGap = A.skew_cov[1] - A.skew_cov[0];
  const skewCovGap8 = S8.skew_cov[1] - S8.skew_cov[0];

  console.log('\n[A] 원점이 무엇에 의존하는가');
  /* 972 방향 전환 — 934 는 «우리 구멍이 ref 보다 8%p 넘게 크다» 를 단언했다.
     933·961 이 그 결함을 실제로 고쳐 없앴으므로, 지금은 «두 형이 만난다» 를 지키고
     갈렸던 값은 §S 가 **매 실행 다시 재서** 기록으로 남긴다(손 상수로 굳히지 않는다). */
  ck('A1 구멍 넓이가 이제 두 형에서 만난다(933·961 이 고쳐 없앤 결함 — 옛값은 §S)',
    Math.abs(holeGap) <= 2,
    `ref ${A.hole_ref.toFixed(1)}% ↔ 우리 ${A.hole_our.toFixed(1)}% (차 ${holeGap.toFixed(1)}%p · 획 8 시절 ${holeGap8.toFixed(1)}%p)`);
  ck('A2 «생 무게중심 − AABB 중심» 이 두 형에서 3px 넘게 갈린다(GH 갈림의 뿌리)',
    skewRawGap >= 3,
    `ref ${A.skew_raw[0].toFixed(2)} ↔ 우리 ${A.skew_raw[1].toFixed(2)} ⇒ ${skewRawGap.toFixed(2)}px`);
  /* 972 방향 전환 — 934 는 «덮개로 메우면 갈림이 1px 아래로 사라진다» 를 단언했다.
     그 사라짐은 **두 형이 서로 다른 가둠 체제**에 있었기 때문이고(A5), 같은 체제로 들어온
     지금은 안 사라진다. 덮개가 «해결책» 이 아니라 «또 하나의 글자 의존 원점» 이라는 것이 답이다. */
  ck('A3 덮개로 구멍을 메워도 그 갈림이 안 사라진다(덮개는 해결책이 아니다)',
    Math.abs(skewCovGap) >= 3,
    `ref ${A.skew_cov[0].toFixed(2)} ↔ 우리 ${A.skew_cov[1].toFixed(2)} ⇒ ${skewCovGap.toFixed(2)}px`);
  ck('A4 두 비평의 갈림(생 − AABB)이 A2 의 뿌리로 1px 안에서 설명된다',
    Math.abs((rawDy - aabbDy) - skewRawGap) < 1,
    `비평 갈림 ${(rawDy - aabbDy).toFixed(2)}px ↔ 원점 갈림 ${skewRawGap.toFixed(2)}px`);
  /* 972 신설 — A3 의 «왜» 를 직접 재는 눈금. 이 항이 없으면 A3 는 그냥 «문턱을 뒤집었다» 로 읽힌다. */
  ck('A5 가둠 정도(글자가 판 안에 갇히는가)가 두 형에서 같은 체제다 — A3 의 뿌리',
    Math.abs(enclGap) <= 4,
    `ref ${A.encl_ref.toFixed(1)}% ↔ 우리 ${A.encl_our.toFixed(1)}% (차 ${enclGap.toFixed(1)}%p · 획 8 시절 ${enclGap8.toFixed(1)}%p)`);

  console.log('\n[B] 답 — 글자에 안 기대는 원점은 **하나**(AABB 중심)다');
  ck('B1 AABB 중심 기준 세로 어긋남이 판 높이의 1.5% 이내',
    Math.abs(aabbPct) <= 1.5, `${aabbDy.toFixed(2)}px = ${aabbPct.toFixed(2)}%`);
  /* 972 방향 전환 — 덮개는 창 «안» 이 아니라 창 밖이다. 생 무게중심과 같은 부류(B4). */
  ck('B2 덮개 무게중심은 창(1.5%) 밖이다 — 판정 원점으로 쓸 수 없다',
    Math.abs(covPct) > 1.5, `${covDy.toFixed(2)}px = ${covPct.toFixed(2)}%`);
  ck('B3 그래서 두 원점의 답이 3px 넘게 갈린다(원점을 고르면 답이 바뀐다)',
    Math.abs(aabbDy - covDy) >= 3, `${aabbDy.toFixed(2)} ↔ ${covDy.toFixed(2)}`);
  ck('B4 생 무게중심도 창 밖 — 창 안에 남는 것은 AABB 하나뿐이다',
    Math.abs(rawPct) > 2, `생 ${rawPct.toFixed(2)}% (AABB ${aabbPct.toFixed(2)} · 덮개 ${covPct.toFixed(2)})`);
  ck('B5 가로는 세 원점이 처음부터 일치한다(갈림은 세로 한 축뿐)',
    Math.abs(aabbDx - covDx) < 1, `AABB ${aabbDx.toFixed(2)} ↔ 덮개 ${covDx.toFixed(2)}`);
  /* 932 규약 — 판정을 지는 축이 «정수 걸음» 이면 ref 에서 K 배수로 굳는다.
     덮개를 이진 마스크로 낸 값과 **부분 피복 질량 적분**으로 낸 값이 같아야
     «계단이 답을 만든 것이 아니다» 가 선다. (덮개가 판정에서 물러난 뒤에도 이 항은
     남는다 — 덮개를 창 밖으로 미는 것이 계단이 아님을 이 항이 못박는다.) */
  const covBinDy = A.dx_dy_pct.cov_bin[1];
  ck('B6 덮개를 질량 적분으로 다시 내도 답이 안 바뀐다 (932 — 계단이 답을 만들지 않았다)',
    Math.abs(covBinDy - covDy) < 0.5, `이진 ${covBinDy.toFixed(2)} ↔ 질량적분 ${covDy.toFixed(2)}`);

  console.log('\n[R] 되돌림 시험 — GH 처방(윗줄 +4.9 · 아랫줄 +6.4)을 실제로 얹는다');
  const [, ghAabbDy, ghAabbPct] = B.dx_dy_pct.aabb;
  const [, ghRawDy, ghRawPct] = B.dx_dy_pct.raw;
  const [, ghCovDy, ghCovPct] = B.dx_dy_pct.cov;
  ck('R1 AABB 중심이 «제자리» 에서 아래로 1.5% 넘게 밀려 빨개진다',
    ghAabbPct <= -1.5, `${aabbPct.toFixed(2)}% → ${ghAabbPct.toFixed(2)}%`);
  /* 972 방향 전환 — 덮개는 GH 처방을 얹으면 오히려 창 «쪽으로» 당겨진다.
     C3 가 생 무게중심에서 말하는 것과 **같은 실패 모양**이고, 그것이 덮개를 물러나게 한 이유다. */
  ck('R2 덮개는 그 처방을 «고쳐진» 것으로 읽는다(창 쪽으로 당겨진다 — C3 와 같은 실패)',
    Math.abs(ghCovPct) < Math.abs(covPct), `덮개 ${covPct.toFixed(2)}% → ${ghCovPct.toFixed(2)}%`);
  ck('R3 되돌림 뒤에도 두 원점은 1px 안에서 안 만난다(덮개는 증인이 아니다)',
    Math.abs(ghAabbDy - ghCovDy) >= 1, `${ghAabbDy.toFixed(2)} ↔ ${ghCovDy.toFixed(2)}`);
  ck('R4 처방이 실제로 «위로 뜬 양»(1.43px)보다 크게 옮긴다 = 자가 무딘 것이 아니다',
    Math.abs(ghAabbDy - aabbDy) > 3, `Δ ${(ghAabbDy - aabbDy).toFixed(2)}px 이동`);

  console.log('\n[C] 자기 검사 — 어느 원점이 글자를 따라 움직이는가');
  const rawMoved = Math.abs(B.skew_raw[1] - A.skew_raw[1]);
  const covMoved = Math.abs(B.skew_cov[1] - A.skew_cov[1]);
  ck('C1 글자를 옮기면 **생** 무게중심 원점이 같이 움직인다(1px 초과)',
    rawMoved > 1, `${A.skew_raw[1].toFixed(2)} → ${B.skew_raw[1].toFixed(2)} (${rawMoved.toFixed(2)}px)`);
  /* 972 방향 전환 — 934 는 «덮개는 제자리(1px 이내)» 를 단언했다. 그것은 획 8 의 «가둠» 체제에서만
     참이었다(§S 가 재현한다). 같은 체제로 들어온 지금은 덮개도 글자를 따라 움직인다. */
  ck('C2 같은 이동에 **덮개** 원점도 따라 움직인다(1px 초과) = 글자 독립이 아니다',
    covMoved > 1, `${A.skew_cov[1].toFixed(2)} → ${B.skew_cov[1].toFixed(2)} (${covMoved.toFixed(2)}px)`);
  ck('C3 그래서 GH 의 자는 자기 처방을 «고쳐진» 것으로 읽는다(생 기준이 창 쪽으로 당겨진다)',
    Math.abs(ghRawPct) < Math.abs(rawPct), `생 ${rawPct.toFixed(2)}% → ${ghRawPct.toFixed(2)}%`);
  /* 972 방향 전환 — «ref 의 덮개 기울음이 우리 것과 1px 이내» 는 두 형이 **다른 가둠 체제**에
     있던 동안의 우연이다(A5·§S). 별 모양의 충실함은 이 눈금이 답할 수 있는 물음이 아니다. */
  ck('C4 ref 와 우리의 덮개 기울음은 안 만난다 — 이 눈금은 «별 모양» 을 못 판정한다',
    Math.abs(skewCovGap) >= 3,
    `ref ${A.skew_cov[0].toFixed(2)} ↔ 우리 ${A.skew_cov[1].toFixed(2)} ⇒ ${skewCovGap.toFixed(2)}px`);

  console.log('\n[S] 획 되돌림 대조(972) — 961 직전(윗줄 획 8px)을 그 페이지에만 되돌린다');
  const [, s8AabbDy, s8AabbPct] = S8.dx_dy_pct.aabb;
  ck('S1 획을 8 로 되돌리면 가둠 체제가 ref 에서 30%p 넘게 벗어난다(934 마감 당시의 상태)',
    enclGap8 >= 30,
    `ref ${S8.encl_ref.toFixed(1)}% ↔ 우리 ${S8.encl_our.toFixed(1)}% (차 ${enclGap8.toFixed(1)}%p)`);
  ck('S2 그 체제에서 덮개 기울음이 ref 와 1px 안에서 «우연히» 만난다 = 934 마감값 재현',
    Math.abs(skewCovGap8) < 1,
    `ref ${S8.skew_cov[0].toFixed(2)} ↔ 우리 ${S8.skew_cov[1].toFixed(2)} ⇒ ${skewCovGap8.toFixed(2)}px`);
  /* ⚑ 이 자의 새 심장 — 갈아 끼운 [A][B][C] 가 «문턱을 푼 것» 이 아님을 못박는다.
     체제가 통째로 뒤집혀도 판정 원점의 답은 안 움직인다 ⇒ 934 의 결론이 획에 안 걸린다. */
  ck('S3 그런데 AABB 원점의 답만은 두 체제에서 안 움직인다 = 934 의 결론이 획에 안 걸린다',
    Math.abs(s8AabbDy - aabbDy) <= 0.5 && Math.abs(s8AabbPct) <= 1.5,
    `획 10 ${aabbDy.toFixed(2)}px(${aabbPct.toFixed(2)}%) ↔ 획 8 ${s8AabbDy.toFixed(2)}px(${s8AabbPct.toFixed(2)}%)`);

  const n = pass + fail;
  console.log(`\nVERIFY934 ${pass}/${n} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
