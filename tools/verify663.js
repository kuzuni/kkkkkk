/* 게이트 663 — «08 스킬 세부 팝업 아이콘이 상자 안에서 세로 중앙»
 *
 * 주인 지시(2026-09-02 00:22): «스킬 세부팝업에 스킬 아이콘 아래에 치우쳐있음 수정하기».
 *
 * ⚑ **재는 것은 «찍힌 잉크» 다**(350 처방). `getBoundingClientRect` 로 재면 이모지는 언제나
 *   상자를 꽉 채운 것처럼 나온다 — 줄상자(86px)와 글리프 잉크는 다른 물건이라 rect 로는
 *   «치우침» 이 원리적으로 안 보인다. 그래서 **아이콘 있음/없음 두 캡처의 차분** bbox 를 쓴다:
 *   배경(그라데이션 · 검정 테두리 · inset 링)은 두 장에서 같으므로 차분에 안 남고,
 *   남는 것이 정확히 «그려진 아이콘» 이다. 면색 임계로 세는 방식(probe411)과 달리
 *   아이콘 색이 배경색과 비슷해도 안 놓친다.
 *
 * 절 다섯:
 *   [A] 스킬 27종 전수 × 9:19 — 잉크 중심의 세로 오프셋 |dy| ≤ TOL
 *   [B] 같은 것을 9:13.3(1080×1600)에서 한 번 더 (두 프레임 규약)
 *   [C] 보유·미보유 두 상태에서 같은 값 (662 가 미보유 표시를 열었다 — 두 상태 다 중앙)
 *   [D] 예외의 대가 — 코스튬 기사 캔버스(150×189, 상자보다 크다)는 **바닥 정렬 Δ0px**
 *   [R] 되돌림 시험 — `align-items:flex-end` 로 되돌린 사본은 dy 가 +20 을 넘어 빨개진다
 *
 * TOL 의 근거: 수리 후 실측 |dy| 최대 **4.0px**(27종, 평균 −2.8)이고 글리프별 흩어짐이
 *   **2.5px** 다 — 상수 하나로는 원리적으로 ±1.25 밑으로 못 내린다. 6 은 그 위에 여유를 둔
 *   값이고, 수리 전 **+24.5** 는 네 배 넘게 벗어나므로 이 자가 그것을 놓칠 수 없다.
 *   ⚠ 남은 −2.8 을 마저 지우려면 `.sk-ic{padding-top:6px}` 이지만 그러면 **펫 캔버스가
 *     +3 로 밀린다**(148 크기 캔버스는 안쪽 141 보다 커서 padding 을 그대로 받는다) —
 *     흩어짐(2.5)보다 작은 편차를 상수로 쫓다가 다른 계열을 미는 것이라 안 했다(356·394 교훈).
 *
 * 실행: node tools/verify663.js
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const TOL = 6;                 /* 잉크 중심 세로 오프셋 허용치(px) */
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

/* 아이콘 있음/없음 차분으로 잉크 bbox 를 잰다. 반환은 상자 중심 기준 (dx, dy). */
async function inkOffset(p, id, own){
  const box = await p.evaluate(({ i, o }) => {
    if(o) S.own[i] = S.own[i] || { l:1, n:0 }; else delete S.own[i];
    showSkillDetail(i);
    const el = document.getElementById('mbox').querySelector('.sk-ic');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }, { i: id, o: own });
  const clip = { x: box.x, y: box.y, width: box.w, height: box.h };
  const a = await p.screenshot({ clip });
  await p.evaluate(() => { document.getElementById('mbox').querySelector('.sk-ic').textContent = ''; });
  const c = await p.screenshot({ clip });
  return p.evaluate(async ({ a, c, box }) => {
    const load = async u => { const im = new Image(); im.src = u; await im.decode(); return im; };
    const ia = await load(a), ib = await load(c);
    const cv = document.createElement('canvas'); cv.width = box.w; cv.height = box.h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0); const A = g.getImageData(0, 0, box.w, box.h).data;
    g.clearRect(0, 0, box.w, box.h); g.drawImage(ib, 0, 0);
    const B = g.getImageData(0, 0, box.w, box.h).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for(let y = 0; y < box.h; y++) for(let x = 0; x < box.w; x++){
      const i = (y * box.w + x) * 4;
      if(Math.abs(A[i]-B[i]) + Math.abs(A[i+1]-B[i+1]) + Math.abs(A[i+2]-B[i+2]) > 24){
        if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y;
      }
    }
    if(x1 < 0) return null;
    return { w: x1-x0+1, h: y1-y0+1,
             dx: +((x0 + (x1-x0+1)/2) - box.w/2).toFixed(2),
             dy: +((y0 + (y1-y0+1)/2) - box.h/2).toFixed(2) };
  }, { a: 'data:image/png;base64,' + a.toString('base64'),
       c: 'data:image/png;base64,' + c.toString('base64'), box });
}

async function sweep(ctx, url, w, h, own){
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w, height: h });
  await p.goto(url);
  await p.waitForTimeout(1200);
  /* ⚠ 첫 호출은 모달 등장 전이(transition)가 도는 중이라 «차분» 이 상자 전체가 된다 —
     한 장 열어 두고 가라앉힌 뒤에 잰다(1회차에 slash 만 149×149 로 나온 함정). */
  await p.evaluate(() => showSkillDetail(SKILLS[0].id));
  await p.waitForTimeout(700);
  const ids = await p.evaluate(() => SKILLS.map(s => s.id));
  const rows = [];
  for(const id of ids){
    const r = await inkOffset(p, id, own);
    rows.push(r ? Object.assign({ id }, r) : { id, miss: 1 });
  }
  return { p, rows };
}

const worst = rows => rows.reduce((a, r) => Math.max(a, Math.abs(r.dy || 0)), 0);
const listBad = rows => rows.filter(r => r.miss || Math.abs(r.dy) > TOL)
                            .map(r => r.id + (r.miss ? '(잉크없음)' : '=' + r.dy));

(async () => {
  console.log('\n=== verify663 — 08 세부 팝업 아이콘 세로 중앙 (허용 ±' + TOL + 'px) ===');
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const URL = 'file://' + SRC;

  /* ── [A] 9:19 · 보유 상태 ─────────────────────────────────────── */
  console.log('\n[A] 9:19 (1080×2280) — 스킬 27종 전수');
  const A = await sweep(ctx, URL, 1080, 2280, true);
  ok(A.rows.length === 27, '[A0] 27종을 전부 쟀다 — ' + A.rows.length);
  ok(A.rows.every(r => !r.miss), '[A1] 잉크를 못 찾은 칸 0건 — '
     + A.rows.filter(r => r.miss).length);
  ok(listBad(A.rows).length === 0, '[A2] |dy| ≤ ' + TOL + ' — 최대 ' + worst(A.rows)
     + 'px · 벗어난 칸 ' + listBad(A.rows).length
     + (listBad(A.rows).length ? ' : ' + listBad(A.rows).join(',') : ''));
  const mean = (A.rows.reduce((a, r) => a + r.dy, 0) / A.rows.length).toFixed(2);
  console.log('  [i] dy 평균 ' + mean + ' · 최소 ' + Math.min.apply(null, A.rows.map(r => r.dy))
            + ' · 최대 ' + Math.max.apply(null, A.rows.map(r => r.dy))
            + '  (수리 전 평균 +23.5)');
  ok(Math.abs(worst(A.rows.map(r => ({ dy: r.dx })))) <= TOL,
     '[A3] 가로도 중앙이다 |dx| ≤ ' + TOL + ' — 최대 '
     + A.rows.reduce((a, r) => Math.max(a, Math.abs(r.dx)), 0) + 'px');
  await A.p.close();

  /* ── [B] 9:13.3 ───────────────────────────────────────────────── */
  console.log('\n[B] 9:13.3 (1080×1600) — 같은 27종');
  const B = await sweep(ctx, URL, 1080, 1600, true);
  ok(B.rows.every(r => !r.miss), '[B1] 잉크를 못 찾은 칸 0건 — ' + B.rows.filter(r => r.miss).length);
  ok(listBad(B.rows).length === 0, '[B2] |dy| ≤ ' + TOL + ' — 최대 ' + worst(B.rows)
     + 'px · 벗어난 칸 ' + listBad(B.rows).length
     + (listBad(B.rows).length ? ' : ' + listBad(B.rows).join(',') : ''));
  /* 두 프레임이 같은 값이어야 한다 — 다르면 어느 한쪽이 스크롤·클램프에 밀린 것이다 */
  const dif = A.rows.map((r, i) => Math.abs(r.dy - B.rows[i].dy));
  ok(Math.max.apply(null, dif) <= 1.5, '[B3] 두 프레임의 dy 차 ≤ 1.5px — 최대 '
     + Math.max.apply(null, dif).toFixed(2) + 'px');
  await B.p.close();

  /* ── [C] 미보유 상태에서도 같은 자리 ─────────────────────────── */
  console.log('\n[C] 미보유 상태(662 가 연 그림)에서도 중앙');
  const C = await sweep(ctx, URL, 1080, 2280, false);
  ok(C.rows.every(r => !r.miss), '[C1] 미보유 27종 전부 아이콘이 그려진다 — '
     + C.rows.filter(r => r.miss).length + '건 누락  (662 전에는 27종이 전부 ❔ 하나였다)');
  ok(listBad(C.rows).length === 0, '[C2] |dy| ≤ ' + TOL + ' — 최대 ' + worst(C.rows)
     + 'px · 벗어난 칸 ' + listBad(C.rows).length
     + (listBad(C.rows).length ? ' : ' + listBad(C.rows).join(',') : ''));
  const cdif = A.rows.map((r, i) => Math.abs(r.dy - C.rows[i].dy));
  ok(Math.max.apply(null, cdif) <= 1.5, '[C3] 보유·미보유의 dy 차 ≤ 1.5px — 최대 '
     + Math.max.apply(null, cdif).toFixed(2) + 'px');

  /* ── [D] 코스튬 캔버스는 바닥 정렬 그대로 ────────────────────── */
  console.log('\n[D] 예외 — 코스튬 기사 캔버스는 바닥 정렬 Δ0');
  const cos = await C.p.evaluate(() => {
    const id = (typeof AVATARS !== 'undefined' && AVATARS[0]) ? AVATARS[0].id : null;
    if(!id) return { err: 'AVATARS 없음' };
    showCosDetail(id);
    const box = document.getElementById('mbox').querySelector('.sk-ic');
    const cv = box && box.querySelector('.cos-cv');
    if(!cv) return { err: '.cos-cv 없음' };
    const cs = getComputedStyle(box), rb = box.getBoundingClientRect(), rc = cv.getBoundingClientRect();
    /* 상자 «안쪽»(content box) 하변 — border 4px 을 뺀 자리 */
    const bw = parseFloat(cs.borderBottomWidth) || 0;
    return { align: cs.alignItems, selfAlign: getComputedStyle(cv).alignSelf,
             gap: +(Math.round((rb.bottom - bw) - rc.bottom)).toFixed(2),
             cvH: Math.round(rc.height), inner: Math.round(rb.height - 2 * bw) };
  });
  ok(!cos.err, '[D0] 코스튬 세부가 열린다 — ' + (cos.err || 'ok'));
  ok(cos.align === 'center', '[D1] 상자 기본 정렬은 «center» 다 — ' + cos.align);
  ok(cos.selfAlign === 'flex-end', '[D2] 캔버스만 «flex-end» 로 빠져나간다 — ' + cos.selfAlign);
  ok(cos.gap === 0, '[D3] 캔버스 하변 = 상자 안쪽 하변 (Δ' + cos.gap + 'px — 수리 전과 같은 자리)'
     + '  · 캔버스 ' + cos.cvH + ' > 안쪽 ' + cos.inner);
  await C.p.close();

  /* ── [R] 되돌림 시험 ─────────────────────────────────────────── */
  console.log('\n[R] 되돌림 시험 — 바닥 정렬로 되돌린 사본');
  const src = fs.readFileSync(SRC, 'utf8');
  const OLD_ON = '#modal.sk8 .sk-ic{display:flex;align-items:center;justify-content:center}';
  ok(src.indexOf(OLD_ON) >= 0, '[R0] 지금 선언을 찾았다 — «align-items:center»');
  const tmp = path.join(path.dirname(SRC), '.verify663-old.html');
  fs.writeFileSync(tmp, src.replace(OLD_ON,
      '#modal.sk8 .sk-ic{display:flex;align-items:flex-end;justify-content:center}'));
  try {
    const O = await sweep(ctx, 'file://' + tmp, 1080, 2280, true);
    ok(worst(O.rows) > 20, '[R1] 되돌리면 dy 가 +20 을 넘는다 — 최대 ' + worst(O.rows)
       + 'px (주인이 본 «아래로 치우침»)');
    ok(listBad(O.rows).length === O.rows.length,
       '[R2] 그 상태에서는 27종이 **전부** 허용치를 벗어난다 — '
       + listBad(O.rows).length + '/' + O.rows.length + ' (한 칸만 고쳐 넘어갈 수 없다)');
    await O.p.close();
  } finally { try { fs.rmSync(tmp, { force: true }); } catch(_){} }

  await b.close();
  console.log('\n  VERIFY663 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail + '건' : '  ✓'));
  process.exit(fail ? 1 : 0);
})();
