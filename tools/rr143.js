/* 작업 143 — 22 «보상 프레임» 코너 반경 실측기 (레퍼런스 · 우리 렌더를 **같은 자로** 잰다).
 *
 *   node tools/rr143.js              # 표로 출력
 *   node tools/rr143.js --json a.json
 *
 * 왜 새 도구인가 — 143 은 «우리 값 24.7 vs ref 29~31» 로 **출처마다 다른 세 값**이 등재돼 있다:
 *   · 측정표 §12 정오표 31  (좌·우 14열 «세로 연속 높이» 최소자승 피팅 → h 105.8 · r 30.9)
 *   · 비평가 X 실측 29      (최상단 dark row 폭 48 vs 64 로 역산 — 단발 표본)
 *   · 104 주석 .293         (= 31/106. 정오표와 같은 값)
 * LESSONS 22-2 «단일 코너 원호 피팅은 과대 추정된다 / 도형은 여러 단면으로 재라» 와
 * LESSONS 34-4 «`box-sizing:border-box` + `border` 요소의 지정 radius 는 실측 외곽 곡률과 다르다 —
 * 최상단 행의 좌·우 inset 을 재서 역산하라» 가 **동시에** 걸리는 자리라, 스펙 값을 그대로 적는 대신
 * ref 와 캡처에 **같은 마스크·같은 피팅**을 걸어 «실측 r» 끼리 비교한다(inkcmp23 방식).
 *
 * 무엇을 재는가 — 프레임 **상단 두 코너의 «열별 최상단 inset 프로파일»** 이다:
 *   라운드 사각형은 좌단에서 d px 떨어진 열의 상단이 y0 + r − √(r² − (r−d)²) 에서 시작한다.
 *   (d ≥ r 이면 y0). 좌·우 코너 두 벌을 합쳐 (y0, r) 을 격자 탐색으로 최소자승 피팅한다.
 * 왜 «상단» 만 보나 — 하단은 수량 배지(`.ifq`)가 프레임 밖으로 20px 걸쳐 있어(141) 실루엣이
 *   오염된다. 상단 두 코너는 행 크림 배경(#F7ECDA) 위에 깨끗하게 떠 있다.
 * 마스크 — «행 크림색에서 얼마나 먼가» 한 가지를 ref·캡처에 그대로 쓴다. 두 이미지의 행 배경이
 *   같은 #F7ECDA 라서 성립한다(23 교훈: 기준이 다른 두 자를 대면 회차가 통째로 날아간다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const REF_JPG = path.resolve(__dirname, '..', 'docs', 'ref', '22-퀘스트-팝업.jpg');
const KEY = 'idle_hunter_save_v4';
const JSON_AT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
const DSF = (() => { const i = process.argv.indexOf('--dsf'); return i > 0 ? +process.argv[i + 1] : 4; })();

/* 레퍼런스에서 프레임이 있는 자리 (측정표 §5-1 + §12 정오표. 가로 1:1 · 세로는 ref 좌표 그대로) */
const REF_BOX = { x0: 167, x1: 273, y0: 698 };   /* x1 = x0 + 106 (끝 배타) */

/* cap22.js 와 같은 세이브 — 레퍼런스와 같은 탭·같은 진행률이라야 대조가 성립한다.
   ⚑ 851(2026-09-03) — 799 가 진행을 «누적 절대값»(`questProg = q.get()`) 으로, 목표를 등차
   (`step × (s+1)`) 로 바꾼 뒤로 기준선 `S.quest[].base` 는 **읽는 곳이 0곳**이다. 옛 표본은
   그 base 로 짜여 있어 5행 중 4행이 진행 100% · 초록 활성이었다(레퍼런스와 정반대).
   ⇒ 진행률은 **카운터와 s 두 값**으로 만든다. base 를 되살리는 방향으로 고치지 마라(799 금지). */
const SAVE = {
  totalKills: 44, best: 6, summons: 15, upgrades: 69,
  gold: 5e7, dia: 12000,
  own: { slash: { n:0, l:1 }, shuri: { n:0, l:1 }, stone: { n:0, l:1 },
         curve: { n:0, l:1 }, multi: { n:0, l:1 }, orbit: { n:0, l:1 } },
  quest: {
    summon: { s: 1 },   /* goal 15×2  =  30 · 진행 15 (50%) */
    upg:    { s: 12 },  /* goal 10×13 = 130 · 진행 69 (53%) */
    kill:   { s: 1 },   /* goal 100×2 = 200 · 진행 44 (22%) */
    stage:  { s: 6 },   /* goal 1×7   =   7 · 진행 6  (86%) */
    coll:   { s: 1 }    /* goal 5×2   =  10 · 진행 6  (60%) */
  }
};

/* ── 페이지 안에 이미지 한 장을 디코드해 둔다(npm 의존성 0 — 54·05 방식) ── */
async function stash(page, slot, b64, mime) {
  await page.evaluate(async ({ slot, b64, mime }) => {
    const im = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = () => rej(new Error('decode ' + slot));
      i.src = 'data:' + mime + ';base64,' + b64;
    });
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    window.__rr143 = window.__rr143 || {};
    window.__rr143[slot] = { d: g.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height };
  }, { slot, b64, mime });
}

/* ── 열별 «최상단 비배경 픽셀» 프로파일 ──
   k = 이 이미지의 CSS px 당 디바이스 px (ref 는 1, 캡처는 DSF) */
async function profile(page, slot, box, k, TH) {
  return page.evaluate(({ slot, box, k, TH }) => {
    const img = window.__rr143[slot];
    const D = img.d, W = img.w;
    const BG = [247, 236, 218];            /* .qs-r 크림 #F7ECDA — ref·캡처 공통 */
    const far = (o) => Math.abs(D[o] - BG[0]) + Math.abs(D[o + 1] - BG[1]) + Math.abs(D[o + 2] - BG[2]) > TH;
    const out = [];
    const x0 = Math.round(box.x0 * k), x1 = Math.round(box.x1 * k);
    const yTop = Math.round((box.y0 - 14) * k), yBot = Math.round((box.y0 + 60) * k);
    for (let X = x0; X < x1; X++) {
      let hit = -1;
      for (let Y = yTop; Y < yBot; Y++) {
        const o = (Y * W + X) * 4;
        if (far(o)) { hit = Y; break; }
      }
      /* 열 좌표·상단 좌표를 CSS px 로 되돌린다. 픽셀 중심(+.5)을 쓴다 */
      out.push(hit < 0 ? null : { x: (X + 0.5) / k, y: (hit + 0.5) / k });
    }
    /* ── 2번째 추정기: «AA 램프 50% 교차» 서브픽셀 프로파일 (LESSONS 16-④ 의 표준) ──
       임계 한 값으로 «켜짐/꺼짐» 을 가르는 위 방식은 JPEG 번짐만큼 통째로 부풀지만(δ),
       램프의 절반 지점을 선형보간으로 찍으면 번짐이 대칭인 한 δ 가 스스로 상쇄된다.
       두 추정기가 같은 답을 내야 이 측정을 믿는다. */
    const half = [];
    for (let X = x0; X < x1; X++) {
      let plateau = 0;
      for (let Y = yTop; Y < yBot; Y++) {
        const o = (Y * W + X) * 4;
        const v = Math.abs(D[o] - BG[0]) + Math.abs(D[o + 1] - BG[1]) + Math.abs(D[o + 2] - BG[2]);
        if (v > plateau) plateau = v;
      }
      if (plateau < 300) { half.push(null); continue; }   /* 검정 테두리를 못 지나간 열은 버린다 */
      const hv = plateau / 2;
      let prev = 0, hit = null;
      for (let Y = yTop; Y < yBot; Y++) {
        const o = (Y * W + X) * 4;
        const v = Math.abs(D[o] - BG[0]) + Math.abs(D[o + 1] - BG[1]) + Math.abs(D[o + 2] - BG[2]);
        if (v >= hv) { hit = (v === prev) ? Y : Y - (v - hv) / (v - prev); break; }
        prev = v;
      }
      half.push(hit === null ? null : { x: (X + 0.5) / k, y: hit / k });
    }

    /* ── 마스크의 «부풀림» δ 를 같은 이미지 안에서 잰다 ──
       코너를 벗어난 직선 구간(상단에서 아래로 55px)의 좌·우 끝을 재고 알려진 폭 106 과 비교한다.
       라운드 사각형을 균일하게 δ 만큼 부풀리면 **반경도 정확히 δ 만큼 커진다** — JPEG 번짐이
       ref 만 +1~2px 키우는 것(22 비고 «R 의 108×108 은 JPEG 쪽만 +2»)을 여기서 상쇄한다. */
    const rowY = Math.round((box.y0 + 55) * k);
    let L = null, R = null;
    for (let X = Math.round((box.x0 - 12) * k); X < Math.round((box.x1 + 12) * k); X++) {
      if (far((rowY * W + X) * 4)) { if (L === null) L = X; R = X; }
    }
    const widthMask = (L === null) ? null : (R - L + 1) / k;
    return { prof: out, half, widthMask, edgeL: L === null ? null : (L - 0.5) / k };
  }, { slot, box, k, TH });
}

/* ── (y0, r) 격자 최소자승 피팅 ──
   모델: 좌단에서 d 떨어진 열의 상단 = y0 + r − √(r² − (r−d)²)   (d < r) / y0 (d ≥ r)
   좌·우 코너를 «d» 로 접어 한 표본으로 합친다. 직선부(d ≥ 45)는 y0 만 잡아 주므로 같이 넣는다. */
function fit(prof, x0, x1) {
  const pts = [];
  for (const p of prof) {
    if (!p) continue;
    const d = Math.min(p.x - x0, x1 - p.x);     /* 좌·우 중 가까운 쪽까지의 거리 */
    if (d < 0) continue;
    pts.push({ d, y: p.y });
  }
  if (pts.length < 20) return null;
  const pred = (d, r) => d >= r ? 0 : r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d)));
  let best = null;
  for (let r = 5; r <= 60; r += 0.05) {
    /* r 이 정해지면 y0 은 잔차 평균으로 닫힌 해다 */
    let s = 0;
    for (const p of pts) s += p.y - pred(p.d, r);
    const y0 = s / pts.length;
    let e = 0;
    for (const p of pts) { const q = y0 + pred(p.d, r) - p.y; e += q * q; }
    const mse = e / pts.length;
    if (!best || mse < best.mse) best = { r: +r.toFixed(2), y0: +y0.toFixed(2), mse: +mse.toFixed(3), n: pts.length };
  }
  return best;
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: DSF });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(SAVE)]);
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1000);
  /* 부팅 뒤 자동 전투가 카운터를 밀어 진행률이 실행마다 흔들린다 — 팝업을 열기 직전에 못박는다(851) */
  await page.evaluate(() => {
    window.step = () => {};
    S.totalKills = 44; S.best = 6; S.summons = 15; S.upgrades = 69;
    save();
  });
  await page.evaluate(() => document.querySelector('.side .ibtn[data-pop="quest"]').click());
  await page.waitForTimeout(800);
  /* 캡처 오염 방지 — 렌더 루프·유휴 갱신을 세우고 캔버스를 내린다(cap22.js 와 같다) */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    window.step = () => {};
    document.querySelectorAll('*').forEach(e => {
      e.style.animationPlayState = 'paused'; e.style.transition = 'none';
    });
  });
  await page.waitForTimeout(300);

  const geo = await page.evaluate(() => {
    const e = document.querySelector('.qs-i');
    if (!e) return null;
    const q = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    const app = document.getElementById('app');
    const sc = app ? app.getBoundingClientRect().width / app.offsetWidth : 1;
    return {
      x: q.left / sc, y: q.top / sc, w: q.width / sc, h: q.height / sc, sc,
      cssRadius: parseFloat(cs.borderTopLeftRadius) || 0,
      rr: (cs.getPropertyValue('--if-rr') || '').trim(),
      ifw: (cs.getPropertyValue('--if-w') || '').trim()
    };
  });
  if (!geo) { console.error('.qs-i 없음 — 퀘스트 팝업이 안 열렸다'); await browser.close(); process.exit(1); }

  /* 캡처: 프레임 상단 주변 창 하나 */
  const win = { x: Math.round(geo.x - 10), y: Math.round(geo.y - 16), width: Math.round(geo.w + 20), height: 76 };
  const capB64 = (await page.screenshot({ clip: win })).toString('base64');
  await stash(page, 'cap', capB64, 'image/png');
  await stash(page, 'ref', fs.readFileSync(REF_JPG).toString('base64'), 'image/jpeg');

  /* 임계값을 3단으로 훑는다 — «반경 지적이 비평가마다 정반대면 임계값 문제다»(LESSONS 16-④).
     δ 보정을 걸면 세 임계에서 같은 답이 나와야 한다. 그게 이 측정의 신뢰도 검사다. */
  const rows = [];
  for (const TH of [40, 60, 90]) {
    const cap = await profile(page, 'cap', { x0: geo.x - win.x, x1: geo.x - win.x + geo.w, y0: geo.y - win.y }, DSF, TH);
    const ref = await profile(page, 'ref', { x0: REF_BOX.x0, x1: REF_BOX.x1, y0: REF_BOX.y0 }, 1, TH);
    const capFit = fit(cap.prof, geo.x - win.x, geo.x - win.x + geo.w);
    const refFit = fit(ref.prof, REF_BOX.x0, REF_BOX.x1);
    const capHalf = fit(cap.half, geo.x - win.x, geo.x - win.x + geo.w);
    const refHalf = fit(ref.half, REF_BOX.x0, REF_BOX.x1);
    const W = 106;
    const dCap = cap.widthMask == null ? null : (cap.widthMask - W) / 2;
    const dRef = ref.widthMask == null ? null : (ref.widthMask - W) / 2;
    rows.push({
      TH, capFit, refFit, capHalf, refHalf, capW: cap.widthMask, refW: ref.widthMask, dCap, dRef,
      capR: capFit && dCap != null ? +(capFit.r - dCap).toFixed(2) : null,
      refR: refFit && dRef != null ? +(refFit.r - dRef).toFixed(2) : null,
    });
  }
  await browser.close();

  const f = (v, n) => v == null ? '   —' : v.toFixed(n == null ? 2 : n).padStart(6);
  console.log('\n작업 143 — 22 보상 프레임 코너 반경 (ref·캡처를 같은 마스크·같은 피팅으로)');
  console.log('  CSS: --if-w ' + geo.ifw + ' · --if-rr ' + geo.rr + ' → border-radius ' + geo.cssRadius.toFixed(2) + 'px');
  console.log('  프레임 rect: ' + geo.w.toFixed(1) + '×' + geo.h.toFixed(1) + ' @ (' + geo.x.toFixed(1) + ',' + geo.y.toFixed(1) + ') · fit scale ' + geo.sc.toFixed(3));
  console.log('');
  /* ── ① 주정정기: AA 램프 50% 교차 (임계값 무관·서브픽셀) ──
     이쪽을 답으로 쓴다. 근거는 **우리 렌더에서의 자가검증**이다 — 지정값을 이미 아는
     합성 이미지에 같은 추정기를 걸면 그 지정값이 그대로 되돌아와야 한다. */
  const h0 = rows[0];
  let primary = null;
  if (h0.refHalf && h0.capHalf) {
    const bias = geo.cssRadius - h0.capHalf.r;
    primary = { ref: h0.refHalf.r, cap: h0.capHalf.r, bias, css: h0.refHalf.r + bias };
    console.log('  [① 주정정기] AA 램프 50% 교차 — 임계값 무관·서브픽셀');
    console.log('    레퍼런스 r ' + h0.refHalf.r.toFixed(2) + '  (y0 ' + h0.refHalf.y0.toFixed(2) + ' · MSE ' + h0.refHalf.mse + ' · 표본 ' + h0.refHalf.n + ')');
    console.log('    우리 측정기 r ' + h0.capHalf.r.toFixed(2) + '  (지정 ' + geo.cssRadius.toFixed(2) + ' → **자가검증 오차 ' + bias.toFixed(2) + 'px**)');
    console.log('    ⇒ ref 를 맞추는 CSS 지정값 ' + primary.css.toFixed(2) + 'px  →  --if-rr ' + (primary.css / parseFloat(geo.ifw)).toFixed(4));
    console.log('    Δ(우리 − ref) = ' + (h0.capHalf.r - h0.refHalf.r).toFixed(2) + 'px (' + (100 * (h0.capHalf.r - h0.refHalf.r) / h0.refHalf.r).toFixed(1) + '%)');
    console.log('');
  }

  console.log('  [② 보조] 단일 임계 + 부풀림 δ 보정 — 진단용이다. **답으로 쓰지 마라**:');
  console.log('  JPEG 번짐은 균일 팽창이 아니라 δ 를 반경에서 빼는 보정이 과잉 된다 — 위 자가검증이 그것을 보여 준다.');
  console.log('  임계 |  ref 폭  δref | ref r  → 보정 | 캡처 폭  δcap | 캡처 r → 보정 |   Δ');
  console.log('  -----+---------------+---------------+---------------+---------------+-------');
  for (const r of rows) {
    console.log('  ' + String(r.TH).padStart(4) + ' |' + f(r.refW, 1) + ' ' + f(r.dRef, 2) + ' |' +
      f(r.refFit && r.refFit.r) + ' ' + f(r.refR) + ' |' + f(r.capW, 1) + ' ' + f(r.dCap, 2) + ' |' +
      f(r.capFit && r.capFit.r) + ' ' + f(r.capR) + ' |' +
      ((r.capR != null && r.refR != null) ? f(r.capR - r.refR) : '   —'));
  }
  const ok = rows.filter(r => r.refR != null);
  if (ok.length) {
    const mean = ok.reduce((s, r) => s + r.refR, 0) / ok.length;
    const spread = Math.max(...ok.map(r => r.refR)) - Math.min(...ok.map(r => r.refR));
    const capMean = ok.reduce((s, r) => s + r.capR, 0) / ok.length;
    /* 캡처의 «지정 → δ보정 실측» 편차를 그대로 ref 에 얹어 CSS 지정값을 역산한다(LESSONS 34-4) */
    const bias = geo.cssRadius - capMean;
    const want = mean + bias;
    console.log('');
    console.log('  ref 보정 r = ' + mean.toFixed(2) + '  (임계 3단 산포 ' + spread.toFixed(2) + 'px)');
    console.log('  캡처 보정 r = ' + capMean.toFixed(2) + '  · 지정(' + geo.cssRadius.toFixed(2) + ') 대비 자가검증 오차 ' + bias.toFixed(2) + 'px');
    console.log('  (이 추정기는 자가검증 오차가 ①(' + (primary ? primary.bias.toFixed(2) : '—') + ')보다 크다 — 그래서 ② 다. 참고값 ' +
      want.toFixed(2) + 'px / --if-rr ' + (want / parseFloat(geo.ifw)).toFixed(4) + ' 는 채택하지 않는다)');
  }
  if (JSON_AT) fs.writeFileSync(JSON_AT, JSON.stringify({ geo, rows, primary }, null, 1));
  console.log('');
})();
