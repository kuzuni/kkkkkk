/* 작업 934 — 배지 두 줄 덩어리가 별판 안에서 «위로 떠 있는가» 의 **게이트**.
   답: **떠 있지 않다(기각)** — 895 1회차 채점 GH 의 «위 5.8px» 은 자의 그림자다.

   이 자가 지키는 것은 «글자가 제자리다» 한 줄이 아니라 **왜 두 비평이 갈렸는가** 다.
   분홍 마스크는 판 «전체» 가 아니라 노랑 글자 + 검정 획이 뚫어 놓은 **도넛**이고,
   도넛의 무게중심은 구멍의 크기·자리에 끌려간다 ⇒ **GH 의 원점은 재려는 대상에 의존한다.**
   구멍 넓이가 ref 9.0% ↔ 우리 21.8% 로 갈리므로 그 원점도 갈리고,
   그 갈림(4.6px)이 두 비평의 갈림(5.83 − 1.43 = 4.40px)을 통째로 설명한다.

   § 절 넷
     [A] 원점이 무엇에 의존하는가 — 구멍 차이 · 생 갈림 재현 · 덮개가 그것을 없앤다
     [B] 답 — 글자에 안 기대는 원점 **둘**(AABB 중심 · 덮개 무게중심)이 같은 «제자리» 를 낸다
     [R] 되돌림 시험 — GH 처방을 **실제로 얹어** 캡처하면 그 둘이 빨개진다
         (여기가 이 자의 심장이다: «제자리» 가 자의 무딤이 아니라는 것을 이 절이 못박는다)
     [C] 자기 검사 — 생 원점은 글자를 따라 **움직이고** 덮개 원점은 안 움직인다

   ⚠ [R] 은 index.html 을 **안 건드린다** — `addStyleTag` 로 그 페이지에만 얹는다
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
  await shot(null, capA, geoA);
  await shot(GH_CSS, capB, geoB);
  const A = scan(capA, geoA);
  const B = scan(capB, geoB);

  const [aabbDx, aabbDy, aabbPct] = A.dx_dy_pct.aabb;
  const [, rawDy, rawPct] = A.dx_dy_pct.raw;
  const [covDx, covDy, covPct] = A.dx_dy_pct.cov;

  console.log('\n[A] 원점이 무엇에 의존하는가');
  ck('A1 구멍 넓이가 두 형에서 갈린다(우리가 ref 보다 최소 8%p 크다)',
    A.hole_our - A.hole_ref >= 8,
    `ref ${A.hole_ref.toFixed(1)}% ↔ 우리 ${A.hole_our.toFixed(1)}% (차 ${(A.hole_our - A.hole_ref).toFixed(1)}%p)`);
  const skewRawGap = A.skew_raw[1] - A.skew_raw[0];
  const skewCovGap = A.skew_cov[1] - A.skew_cov[0];
  ck('A2 «생 무게중심 − AABB 중심» 이 두 형에서 3px 넘게 갈린다(GH 갈림의 뿌리)',
    skewRawGap >= 3,
    `ref ${A.skew_raw[0].toFixed(2)} ↔ 우리 ${A.skew_raw[1].toFixed(2)} ⇒ ${skewRawGap.toFixed(2)}px`);
  ck('A3 덮개로 구멍을 메우면 그 갈림이 1px 아래로 사라진다',
    Math.abs(skewCovGap) < 1,
    `ref ${A.skew_cov[0].toFixed(2)} ↔ 우리 ${A.skew_cov[1].toFixed(2)} ⇒ ${skewCovGap.toFixed(2)}px`);
  ck('A4 두 비평의 갈림(생 − AABB)이 A2 의 뿌리로 1px 안에서 설명된다',
    Math.abs((rawDy - aabbDy) - skewRawGap) < 1,
    `비평 갈림 ${(rawDy - aabbDy).toFixed(2)}px ↔ 원점 갈림 ${skewRawGap.toFixed(2)}px`);

  console.log('\n[B] 답 — 글자에 안 기대는 원점 둘이 «제자리» 를 낸다');
  ck('B1 AABB 중심 기준 세로 어긋남이 판 높이의 1.5% 이내',
    Math.abs(aabbPct) <= 1.5, `${aabbDy.toFixed(2)}px = ${aabbPct.toFixed(2)}%`);
  ck('B2 덮개 무게중심 기준도 1.5% 이내',
    Math.abs(covPct) <= 1.5, `${covDy.toFixed(2)}px = ${covPct.toFixed(2)}%`);
  ck('B3 그 두 원점의 답이 서로 1px 이내(원점을 골라도 답이 안 바뀐다)',
    Math.abs(aabbDy - covDy) < 1, `${aabbDy.toFixed(2)} ↔ ${covDy.toFixed(2)}`);
  ck('B4 생 무게중심만 창 밖 — 이상치가 하나뿐임을 못박는다',
    Math.abs(rawPct) > 2, `생 ${rawPct.toFixed(2)}% (AABB ${aabbPct.toFixed(2)} · 덮개 ${covPct.toFixed(2)})`);
  ck('B5 가로는 세 원점이 처음부터 일치한다(갈림은 세로 한 축뿐)',
    Math.abs(aabbDx - covDx) < 1, `AABB ${aabbDx.toFixed(2)} ↔ 덮개 ${covDx.toFixed(2)}`);
  /* 932 규약 — 판정을 지는 축이 «정수 걸음» 이면 ref 에서 K 배수로 굳는다.
     덮개를 이진 마스크로 낸 값과 **부분 피복 질량 적분**으로 낸 값이 같아야
     «계단이 답을 만든 것이 아니다» 가 선다. */
  const covBinDy = A.dx_dy_pct.cov_bin[1];
  ck('B6 덮개를 질량 적분으로 다시 내도 답이 안 바뀐다 (932 — 계단이 답을 만들지 않았다)',
    Math.abs(covBinDy - covDy) < 0.5, `이진 ${covBinDy.toFixed(2)} ↔ 질량적분 ${covDy.toFixed(2)}`);

  console.log('\n[R] 되돌림 시험 — GH 처방(윗줄 +4.9 · 아랫줄 +6.4)을 실제로 얹는다');
  const [, ghAabbDy, ghAabbPct] = B.dx_dy_pct.aabb;
  const [, ghRawDy, ghRawPct] = B.dx_dy_pct.raw;
  const [, ghCovDy, ghCovPct] = B.dx_dy_pct.cov;
  ck('R1 AABB 중심이 «제자리» 에서 아래로 2% 넘게 밀려 빨개진다',
    ghAabbPct <= -1.5, `${aabbPct.toFixed(2)}% → ${ghAabbPct.toFixed(2)}%`);
  ck('R2 덮개 무게중심도 같이 빨개진다',
    ghCovPct <= -1.5, `${covPct.toFixed(2)}% → ${ghCovPct.toFixed(2)}%`);
  ck('R3 두 원점이 되돌림 뒤에도 서로 1px 이내로 같은 말을 한다',
    Math.abs(ghAabbDy - ghCovDy) < 1, `${ghAabbDy.toFixed(2)} ↔ ${ghCovDy.toFixed(2)}`);
  ck('R4 처방이 실제로 «위로 뜬 양»(1.43px)보다 크게 옮긴다 = 자가 무딘 것이 아니다',
    Math.abs(ghAabbDy - aabbDy) > 3, `Δ ${(ghAabbDy - aabbDy).toFixed(2)}px 이동`);

  console.log('\n[C] 자기 검사 — 어느 원점이 글자를 따라 움직이는가');
  const rawMoved = Math.abs(B.skew_raw[1] - A.skew_raw[1]);
  const covMoved = Math.abs(B.skew_cov[1] - A.skew_cov[1]);
  ck('C1 글자를 옮기면 **생** 무게중심 원점이 같이 움직인다(1px 초과)',
    rawMoved > 1, `${A.skew_raw[1].toFixed(2)} → ${B.skew_raw[1].toFixed(2)} (${rawMoved.toFixed(2)}px)`);
  ck('C2 같은 이동에도 **덮개** 원점은 제자리다(1px 이내)',
    covMoved < 1, `${A.skew_cov[1].toFixed(2)} → ${B.skew_cov[1].toFixed(2)} (${covMoved.toFixed(2)}px)`);
  ck('C3 그래서 GH 의 자는 자기 처방을 «고쳐진» 것으로 읽는다(생 기준이 창 쪽으로 당겨진다)',
    Math.abs(ghRawPct) < Math.abs(rawPct), `생 ${rawPct.toFixed(2)}% → ${ghRawPct.toFixed(2)}%`);
  ck('C4 ref 의 덮개 기울음이 우리 것과 1px 이내 — 별 모양 자체는 충실하다',
    Math.abs(A.skew_cov[1] - A.skew_cov[0]) < 1,
    `ref ${A.skew_cov[0].toFixed(2)} ↔ 우리 ${A.skew_cov[1].toFixed(2)}`);

  const n = pass + fail;
  console.log(`\nVERIFY934 ${pass}/${n} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
