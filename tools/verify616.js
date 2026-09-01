#!/usr/bin/env node
/* 작업 616 게이트 — 레이드·아레나 카드 썸네일이 원본 종횡을 지키는가
 *
 *   node tools/verify616.js        → 마지막 줄이 `VERIFY616 n/n PASS` 여야 한다
 *
 * ── 이 자가 있는 이유 ──────────────────────────────────────────────────
 * `verify356`·`scan356` 은 **CSS 변환**을 세므로 캔버스에 그려진 픽셀은 감시 밖이고
 * (356 8회차 교훈), `probe418` 은 `naturalWidth/Height` 가 있는 img·svg 를 기준으로 삼아
 * 캔버스에는 «원본» 이 없다. 그래서 레이드 마법사 ×1.45 · 아레나 기사 ×1.65 의 찌그러짐이
 * 게이트 60여 개 사이에서 **한 번도 안 빨갰다** — 그 구멍이 이 파일이다.
 * 원본은 아틀라스 rect 를 1:1 로 그려 «원본 잉크» 를 만들어 쓴다(`probe616` 과 같은 식).
 *
 * ── 무엇을 묻는가 ──────────────────────────────────────────────────────
 *  [1] 제품 경로 — 레이드·아레나 3칸이 등방(±0.5%)
 *  [2] 기본값 — `fit` 을 안 준 호출도 늘리지 않는다(옛 «꽉 채우기» 경로가 사라졌다)
 *  [3] 회귀 — 던전 카드 8장(액자)은 그대로 등방이고 그림이 줄지 않았다
 *  [R] 되돌림 시험 — 옛 식(`dw=W · dh=H−32`)으로 그린 사본은 **반드시 빨개진다**
 *  [R2] 음성항 — «등방이면 아무리 작아도 통과» 가 아니다(칸을 놀리면 [3] 축이 잡는다)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const HTML = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const TOL = 0.005;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

/* 페이지 안에서 쓰는 공용 조각 — 문자열로 넘겨 evaluate 안에서 eval 한다 */
const HELPERS = `
  const bboxOf = (d, w, h) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  const canvasInk = (cv) => bboxOf(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
  const srcInk = (k, frame) => {
    const A = ATLAS[k]; if (!A || !A.image) return null;
    const fr = A.f[frame]; if (!fr) return null;
    const t = document.createElement('canvas'); t.width = fr[2]; t.height = fr[3];
    const g = t.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
    const b = bboxOf(g.getImageData(0, 0, fr[2], fr[3]).data, fr[2], fr[3]);
    return b && { w: b.w, h: b.h, rect: [fr[2], fr[3]] };
  };
`;

const COLLECT = `(() => {
  ${HELPERS}
  const out = [];
  document.querySelectorAll('#dunList canvas.thcv').forEach((cv) => {
    const card = cv.closest('.dnc');
    const rd = !!(card && card.classList.contains('rd'));
    const k = cv.dataset.arnav ? 'knight' : cv.dataset.thk;
    const ink = canvasInk(cv), src = srcInk(k, cv._fr);
    out.push({ rd, arena: !!cv.dataset.arnav, k, frame: cv._fr, cw: cv.width, ch: cv.height,
               ink: ink && { w: ink.w, h: ink.h, x0: ink.x0, y0: ink.y0, x1: ink.x1, y1: ink.y1 },
               src });
  });
  return out;
})()`;

/* 임의의 옵션으로 «따로 그린» 사본 한 장 — [2]·[R]·[R2] 가 쓴다 */
const SCRATCH = `((W, H, opt, old) => {
  ${HELPERS}
  const k = 'knight';
  const list = ATLAS[k] && ATLAS[k].a && ATLAS[k].a.idle;
  if (!list || !list.length) return null;
  const frame = list[0];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  if (old) {
    /* ⚠ 616 이 걷어낸 **옛 «꽉 채우기» 식**을 여기서만 되살린다 — 제품 코드가 아니라 사본이다.
       dw = W · dh = H − padY*2 (padY 16). 이 사본이 빨개져야 이 자가 진짜 재고 있는 것이다. */
    const A = ATLAS[k], fr = A.f[frame];
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const py = 16, dh = Math.max(1, H - py * 2);
    g.drawImage(A.image, fr[0], fr[1], fr[2], fr[3], 0, Math.round((H - dh) / 2), W, dh);
  } else {
    drawSpriteTo(cv, Object.assign({ k, frame }, opt || {}));
  }
  const ink = canvasInk(cv), src = srcInk(k, frame);
  if (!ink || !src) return null;
  return { W, H, ink: { w: ink.w, h: ink.h, x0: ink.x0, y0: ink.y0, x1: ink.x1, y1: ink.y1 }, src,
           aniso: (ink.w / ink.h) / (src.w / src.h) };
})`;

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(HTML, { waitUntil: 'load' });
  await p.waitForTimeout(1500);

  await p.evaluate(() => { S.best = 999; document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(700);

  console.log('[3] 회귀 — 던전 카드 8장(액자)은 그대로다');
  const dun = (await p.evaluate(COLLECT)).filter((r) => !r.rd && r.ink && r.src);
  ok(dun.length >= 6, `던전 카드 표본 ${dun.length}장(≥6)`);
  dun.forEach((r, i) => {
    const a = (r.ink.w / r.ink.h) / (r.src.w / r.src.h);
    ok(Math.abs(a - 1) <= TOL + 0.02, `던전 카드${i + 1} ${r.k}/${r.frame} 등방 ×${a.toFixed(3)}`);
  });
  /* 616 이 던전 카드를 «건드리지 않았다» 는 것은 그림 크기로 못박는다 — 액자 인셋(`TH_INS`
     t10 r6 b5 l6)이 그대로면 담기는 축의 여백은 그 인셋 + 아틀라스 rect 의 투명 테두리뿐이다.
     실측(2026-09-01, 8장): 6·7·7·7·8·9·9 — 문턱 12 는 그 최댓값 9 에 3px 여유다.
     여기서 «둘 중 하나만 봐도 된다» 로 풀면 안 된다 — dragon 은 세로 여백이 87 이라(96×64 격자,
     가로가 담기는 축) OR 로 물으면 어느 쪽이 담기는 축인지 모른 채 초록이 된다. */
  const dunSlack = dun.map((r) => Math.min(Math.min(r.ink.x0, r.cw - 1 - r.ink.x1),
                                           Math.min(r.ink.y0, r.ch - 1 - r.ink.y1)));
  ok(dunSlack.every((s) => s <= 12),
     `던전 카드는 담기는 축이 액자를 그대로 채운다 — 여백 [${dunSlack.join(',')}] 전부 ≤ 12 (그림이 안 줄었다)`);

  await p.evaluate(() => setDunSub('raid'));
  await p.waitForTimeout(900);
  const rd = (await p.evaluate(COLLECT)).filter((r) => r.rd && r.ink && r.src);

  console.log('[1] 제품 경로 — 레이드·아레나 3칸이 원본 종횡을 지킨다');
  ok(rd.length === 3, `레이드·아레나 캔버스 3장(측정장 1 + 아레나 2) — 실제 ${rd.length}`);
  rd.forEach((r) => {
    const a = (r.ink.w / r.ink.h) / (r.src.w / r.src.h);
    ok(Math.abs(a - 1) <= TOL,
       `${r.arena ? '아레나' : '측정장'} ${r.k}/${r.frame} 등방 — 그려진 ${r.ink.w}×${r.ink.h} ÷ 원본 ${r.src.w}×${r.src.h} = ×${a.toFixed(3)}`);
  });
  /* 97 의 살아 있는 절반 — 담기는 축은 여전히 칸을 채운다(들썩 여유 16 + 아틀라스 여백 허용) */
  rd.forEach((r) => {
    const sx = Math.min(r.ink.x0, r.cw - 1 - r.ink.x1), sy = Math.min(r.ink.y0, r.ch - 1 - r.ink.y1);
    ok(Math.min(sx, sy) <= 21,
       `${r.arena ? '아레나' : '측정장'} 담기는 축이 칸을 채운다 — 여백 min(${sx},${sy}) ≤ 21`);
  });
  /* 616 이 «세로 들썩 자리» 를 잃지 않았다 — 인셋 t/b = TH_BOBPAD 16 이 그대로 남아 있어야 한다.
     세로가 담기는 축인 칸(측정장)에서 위·아래 여백이 각각 16 이상이면 들썩(최대 14px)이 안 잘린다. */
  const mg = rd.find((r) => !r.arena);
  if (mg) ok(mg.ink.y0 >= 14 && mg.ch - 1 - mg.ink.y1 >= 14,
     `측정장 세로 들썩 자리 유지 — 위 ${mg.ink.y0} · 아래 ${mg.ch - 1 - mg.ink.y1} (각 ≥14)`);

  console.log('[2] 기본값 — `fit` 을 안 줘도 늘리지 않는다(옛 «꽉 채우기» 경로가 사라졌다)');
  const bare = await p.evaluate(`${SCRATCH}(200, 60, null, false)`);
  ok(!!bare, 'knight 아이들 프레임으로 사본을 그릴 수 있다');
  if (bare) ok(Math.abs(bare.aniso - 1) <= TOL,
     `옵션 없이 그린 200×60 사본도 등방 ×${bare.aniso.toFixed(3)} (옛 경로였다면 ×3 이상으로 늘어난다)`);

  console.log('[R] 되돌림 시험 — 옛 식으로 그린 사본은 빨갛다');
  const oldc = await p.evaluate(`${SCRATCH}(200, 60, null, true)`);
  ok(!!oldc && Math.abs(oldc.aniso - 1) > TOL,
     `옛 «꽉 채우기» 식 사본은 이방성 ×${oldc ? oldc.aniso.toFixed(3) : '?'} 로 이 자에 걸린다(허용 ±0.5%)`);
  const oldTall = await p.evaluate(`${SCRATCH}(148, 289, null, true)`);
  ok(!!oldTall && Math.abs(oldTall.aniso - 1) > 0.3,
     `아레나 칸 크기(148×289)로 되돌리면 ×${oldTall ? oldTall.aniso.toFixed(3) : '?'} — 수리 전 실측(×0.606)과 같은 방향`);

  console.log('[R2] 음성항 — «등방이면 아무리 작아도 통과» 가 아니다');
  /* 인셋을 크게 줘 그림을 반으로 줄인 사본: 등방은 통과하지만 «담기는 축이 칸을 채운다» 는 못 넘는다 */
  const tiny = await p.evaluate(`${SCRATCH}(148, 289, { fit: { t: 90, b: 90, l: 40, r: 40 } }, false)`);
  /* ⚠ 허용치가 [1] 보다 무른 것은 «봐주는» 것이 아니라 **자의 바닥**이다 — 44×46 rect 를 68px 로
     담으면 배율 1.48 이라 잉크 한 변의 반올림 1px 이 곧 0.7% 다(제품 칸은 배율 2.0~3.4 라 0.2% 안).
     이 항이 묻는 것은 «작아도 등방은 유지된다» 이고, 판정을 지는 항은 바로 아래 «칸을 채운다» 다. */
  ok(!!tiny && Math.abs(tiny.aniso - 1) <= 0.02, `줄인 사본도 등방은 맞다 ×${tiny ? tiny.aniso.toFixed(3) : '?'} (±2% — 소배율 반올림 바닥)`);
  if (tiny) {
    const sx = Math.min(tiny.ink.x0, tiny.W - 1 - tiny.ink.x1), sy = Math.min(tiny.ink.y0, tiny.H - 1 - tiny.ink.y1);
    ok(Math.min(sx, sy) > 21,
       `줄인 사본은 «칸을 채운다» 축에 걸린다 — 여백 min(${sx},${sy}) > 21 (등방만으로는 통과 못 한다)`);
  }

  ok(errs.length === 0, `콘솔 에러 0건 (${errs.length})`);
  await b.close();
  console.log(`\nVERIFY616 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
