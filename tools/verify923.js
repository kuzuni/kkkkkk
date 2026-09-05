/* 작업 923 — 노치 «바닥 평탄부»(스타디움) 게이트.
 *
 * 무엇을 못박는가 — 885 10회차 채점 3인(GD·GF·GG)이 «ref 는 바닥이 평평한 스타디움, 우리는
 * 순수한 반원» 을 일치로 냈고 GG 가 문턱과 무관한 원리적 증거를 냈다(옆면 최소제곱 원의
 * R_fit < 깊이 D 이면 원호로는 불가능). 923 1회차가 링의 **세로 모서리 반지름**(`--ntc-r`)만
 * 새 토큰으로 빼서 바닥을 곧게 폈다 — 깊이·길이·피치·개수는 한 줄도 안 건드렸다.
 *
 * ⚑ 이 자는 «선언» 과 «찍힌 화소» 를 **둘 다** 묻는다. 선언만 물으면 `border-radius` 가
 *   다른 규칙에 져도(특이성 함정 — 이 파일 8398행이 실제로 겪은 자리) 초록이고,
 *   화소만 물으면 값이 어디서 오는지를 못 지킨다.
 *
 *   §A 선언 — `--ntc-r` 이 카드에 실리고(배너 33.6 · 불릿 47.4) `s`·`u` 의 세로 모서리가
 *             그 한 값에서 파생된다(`r` · `r+12`). 값을 세 곳에 다시 적으면 빨강.
 *   §B 화소 — 찍힌 노치의 **바닥 평탄부**(깊이 ≥ 최대−0.5 인 행의 최장 런)가 ref 과녁 언저리다.
 *             자는 `tools/scan923.py` 와 **같은 절차**다(원점 = 카드 곧은 우변 · 부분화소 50% 교차).
 *             ref 실측(우리px): 배너 **18.57** · 불릿 **26.82** · 길이 59.8 / 92.8 · 깊이 31.40 / 31.67
 *             (⚠ 깊이는 1회차 채점 GK 가 «곧은 변 오염» 을 잡아 준 뒤의 값이다 — 자 쪽 최빈값 주석 참조).
 *   §R 되돌림 — `border-radius:50%`(옛 타원)로 되돌리면 §B 가 **빨개져야** 한다.
 *             안 빨개지면 이 자는 «바닥» 이 아니라 아무거나 재고 있는 것이다.
 *
 * 실행: node tools/verify923.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const PNG = require('./png913').PNG();
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const T = 40;
const MIN_EXT = 12, GAP = 3;      /* 덩이 최소 두께 · 이어 붙일 틈 (우리 px · scan923.py 와 같은 값) */                     /* 「카드 재질」 판정 문턱(|Δ바탕|₁) — scan923.py 와 같은 값 */
/* ⚑ 923 3회차 — `wd` 는 «깊이별 세로 폭»(깊이의 25·50·75·90% 에서 잰 폭)이다. 이 절이 3회차의 본체다:
   1·2회차 채점 넷이 «옆면 호가 각지다» 를 각자 1순위로 냈고 ②(상대 크기)를 8 로 막은 유일한 항목이었다.
   ref 값은 `python3 tools/scan923.py --ref --prof` — 배너는 **오염 안 된 두 자리**(y136·y205)의 평균이고
   (맨 위 자리는 분홍 배지가 물어 토막이다) 불릿은 y299 하나다(y188·y213 은 흰 티켓 일러스트의 톱니 —
   2회차 채점 GL·GM 이 창 오염으로 못박은 자리다. 그 둘을 쓰면 «깊이 7.8~14.5» 같은 유령이 나온다). */
const FRACS = [0.25, 0.50, 0.75, 0.90];
/* ⚑⚑ 4회차 — **과녁을 전부 다시 쟀다.** 3회차 채점 2인(GN·GO)이 각자 «문턱 자는 ref 를 얇게 읽는다»
   를 찾아냈고(942 «번짐 편향» 계열), `scan923.py` 의 경계 읽기를 **덮개 적분**으로 갈아 세 자가
   0.2px 안에서 만났다(ref 배너 곧은변 GN 485.587 ↔ 이 자 485.63). 아래는 그 자의 값이다 —
   ⚠ 옛 문턱 자의 값과 섞어 쓰지 마라(불릿 길이 92.8 ↔ 97.0 처럼 2~4px 씩 다르다). */
const REF = {                     /* ref 실측(우리 px) — `python3 tools/scan923.py --ref [--prof]` */
  ban: { flat: 17.54, len: 59.8, dep: 31.79, wd: [57.53, 50.80, 38.95, 26.17] },
  bl: { flat: 24.75, len: 97.0, dep: 32.11, wd: [92.61, 82.36, 63.89, 42.26] }
};
const W_TOL = 2.5;                /* 옛 타원은 8자리 중 4자리에서 이 창 밖이다(§R 이 매 실행 확인한다) */
/* ⚑⚑ 5회차 신설 — **«입(mouth)» 축**. 4회차 채점 2인(GN·GO)이 공통 1순위로 «ref 는 노치가 곧은변에
   접선으로 스며드는데 우리는 모서리로 꺾인다» 를 냈는데, 위 [B5] 는 깊이를 **D 의 비율**로 읽어
   입구 첫 8px(배너 25% = 깊이 7.9)을 통째로 건너뛴다 ⇒ 그 자리가 **자에 없었다**.
   ⇒ 깊이를 **절대 px** 로 읽는 축을 세운다(`scan923.py --mouth` 와 같은 격자·같은 절차).
   ⚠ 비율이 아니라 절대 px 인 이유 — 두 그림의 D 가 0.3px 만 달라도 «같은 %» 가 서로 다른 실물 깊이를
     가리켜, 램프가 가파른 입구에서는 그 차이가 폭 1px 로 증폭된다.
   ⚠ 창 ±2.0 은 [B5] 의 ±2.5 보다 좁다 — 5회차 수리의 실측 최대 |Δ| 가 0.83 이고, 수리 전 값
     (배너 −3.95 · 불릿 −11.80)은 그 두 배 넘게 밖이다. */
const MOUTH_U = [1, 2, 3, 4, 6];
const M_TOL = 2.0;
/* ⚑⚑ **6회차 — 과녁을 다시 쟀다. 5회차의 «자 갈림» 은 갈림이 아니라 이 자의 «천장» 이었다.**
   `width_at`/`wAt` 은 노치 창(«깊이 ≥ 6» 인 행) 밖으로 이웃을 **3행까지만** 빌렸다 ⇒ 얕은 u 의 폭이
   «창 + 3행» 에서 잘린다(배너 천장 65.4). 5회차가 ref 를 65.01 로 읽은 것은 **ref 의 입이 그 천장에
   눌린 값**이었고, 그래서 «채점 2인은 72 로 읽는데 자는 65» 라는 갈림처럼 보였다.
   천장을 걷어내니(창 밖으로도 깊이가 u 이상이고 얕아지는 동안 걸어 나간다) 이 자가 ref 를
   **72.02 / 72.31(배너) · 118.27(불릿)** 으로 읽는다 — 5회차 채점 GQ 의 72.1 / 116.5,
   GP 의 68.2~72.5 / 113.3~118.9, 4회차 GO 의 72.07 / 115.72 와 **같은 자리**다. ⇒ 갈림은 닫혔다.
   ⚠ 이 값들은 **오염 안 된 창**의 것이다(배너 = 아래 두 자리의 평균 · 불릿 = y299 한 자리).
   오염된 창에서는 이 자가 이제 숫자 대신 **n/a** 로 답한다(음수 폭을 내면 조용히 속는다 — 939). */
const REF_M = { ban: [72.17, 67.46, 63.94, 61.78, 59.35], bl: [118.27, 109.67, 105.46, 100.77, 95.79] };

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? 'ok ' : 'FAIL'} ${m}`); };
const blk = (t) => console.log('\n' + t);
const num = (s) => parseFloat(String(s).replace(/[^0-9.\-]/g, '')) || 0;

/* ── 화소 자 (scan923.py 의 이식 — 같은 절차) ──────────────────────────── */
function rowOuter(px, W, y, x0, x1, bg) {
  /* 오른쪽에서 왼쪽으로 오며 |Δbg|₁ 가 T 를 처음 넘는 자리 — 부분화소 50% 교차(선형 보간) */
  const d = [];
  for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    d.push(Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]));
  }
  /* ⚑ 923 1회차 채점 GJ 관측 ㉮ — 노치 «안» 에 떠 있는 배경 장식(회색 점 ≈7px)을 물면 바닥이
     10px 로 잘못 읽힌다. 그래서 «오른쪽 끝 화소» 가 아니라 **카드 몸통에 이어진 덩이**의 끝을 쓴다 —
     GAP 이하의 틈은 이어 붙이고 두께 MIN_EXT 이상인 첫 덩이에서 멈춘다(`tools/scan923.py` 와 같은 절차).
     ⚠ 틈을 이어 붙이는 것이 핵심이다 — 그 자는 ref 도 재는데 ref 검정 외곽선은 4 ref px 뿐이고
     안쪽 경계에서 |Δ바탕|₁ 가 한 화소 26 까지 떨어져 몸통과 끊겨 보인다(자 쪽 주석 참조). */
  let last = -1;
  let x = d.length - 1;
  while (x >= 0) {
    if (d[x] <= T) { x--; continue; }
    const e = x;
    let left = x;
    while (left >= 0) {
      if (d[left] > T) { left--; continue; }
      let j = left;
      while (j >= 0 && d[j] <= T) j--;
      if (left - j <= GAP && j >= 0) { left = j; continue; }
      break;
    }
    if (e - left >= MIN_EXT) { last = e; break; }
    x = left;
  }
  if (last < 0) return null;
  /* ⚑⚑ 4회차 — «문턱 50% 교차» → **덮개 적분**(scan923.py 와 같은 절차 · 3회차 채점 2인이 세운 자).
     경계 화소는 «검정 외곽선 ↔ 바탕» 두 색의 섞임뿐이므로 α = |p − bg|₁ / |검정 − bg|₁ 가 곧 덮개다.
     ⚠ 분모는 **그 자리에서 가장 검은 화소**로 잡는다 — `d` 의 최댓값을 쓰면 «몸통(크림)» 이 잡혀
     경계가 4px 안으로 밀린다(4회차에 한 번 밟았다). */
  let full = 0;
  for (let x = Math.max(0, last - 6); x <= last; x++) {
    const i2 = (y * W + x0 + x) * 4;
    const lum = px[i2] + px[i2 + 1] + px[i2 + 2];
    if (full === 0 || lum < full.lum) full = { lum, d: d[x] };
  }
  const fd = full ? full.d : 0;
  if (!fd) return x0 + last + 0.5;
  let xs = last;
  while (xs > 0 && d[xs] < 0.95 * fd) xs--;
  let acc = 0;
  for (let x = xs + 1; x < Math.min(d.length, last + 4); x++) acc += Math.min(1, Math.max(0, d[x] / fd));
  return x0 + xs + 0.5 + acc;
}

function notchStats(png, box, bg) {
  const { width: W, data } = png;
  const prof = [];
  for (let y = box.y; y < box.y + box.h; y++) {
    prof.push(rowOuter(data, W, y, box.x, Math.min(W, box.x + box.w + 6), bg));
  }
  const vals = prof.filter((v) => v != null).slice().sort((a, b) => a - b);
  const p60 = vals[Math.floor(vals.length * 0.6)];
  const tail = vals.filter((v) => v >= p60);
  const straight = tail[Math.floor(tail.length / 2)];
  /* 노치 = 곧은변에서 6px 이상 들어간 연속 구간(4행 이상) · 카드 위·아래 끝(모서리)은 뺀다 */
  const inn = prof.map((v) => (v == null ? null : straight - v));
  const runs = [];
  let s = null;
  for (let i = 0; i < inn.length; i++) {
    const hit = inn[i] != null && inn[i] >= 6;
    if (hit && s == null) s = i;
    if ((!hit || i === inn.length - 1) && s != null) {
      const e = hit ? i : i - 1;
      if (e - s + 1 >= 4 && s > 2 && e < inn.length - 3) runs.push([s, e]);
      s = null;
    }
  }
  return runs.map(([a, b]) => {
    let D = 0;
    for (let i = a; i <= b; i++) if (inn[i] > D) D = inn[i];
    let best = 0, cur = 0;
    for (let i = a; i <= b; i++) {
      if (inn[i] >= D - 0.5) { cur++; if (cur > best) best = cur; } else cur = 0;
    }
    /* 923 3회차 — 깊이 u 에서의 세로 폭. 폭도 **부분화소**로 잰다(scan923.py `width_at` 과 같은 절차):
       u 를 처음·마지막 넘는 두 행을 바깥쪽 이웃과 선형 보간한다. 정수 행으로 세면 한 칸(1px)이
       그대로 오차가 되어 어깨의 3px 짜리 결손을 못 본다. */
    /* ⚑⚑ 4회차 — 3회차 채점 2인(GN·GO)이 **각자** 이 함수의 결함 둘을 찾아냈다(scan923.py 쪽과 같은 둘):
       ⓐ 아래쪽 끝의 **부호** — `j + t` 가 아니라 `j + t*step` 이다(폭이 최대 2행 부풀고, 1행의 실물
          길이가 그림마다 달라 **ref 가 두 배 더 부푸는 비대칭 편향**이 된다) ·
       ⓑ **창** — 이웃을 노치 안(`[a,b]`)에서만 찾아 입구 쪽 교차가 경계에 물리면 잘렸다. */
    /* ⚑⚑ 6회차 — **천장을 걷어냈다**(scan923.py `width_at` 과 같은 수리 · 위 REF_M 주석).
       옛 자는 창 밖으로 3행까지만 빌려 얕은 u 의 폭이 «창 + 3행» 에서 잘렸고, 그 천장이 ref 와
       우리를 **같이** 잘라 «자 갈림» 처럼 보였다. 이제 창 밖으로도 «깊이 ≥ u 이면서 얕아지는 동안»
       걸어 나간다(단조 가드가 없으면 ref 초록의 티켓 톱니에서 이웃 오목부와 창이 합쳐진다). */
    const MG = 3;
    const wAt = (u) => {
      const idx = [];
      for (let i = a; i <= b; i++) if (inn[i] != null && inn[i] >= u) idx.push(i);
      if (!idx.length) return null;
      const walk = Math.max(MG, b - a + 1);
      let lo = idx[0], hi = idx[idx.length - 1];
      while (lo - 1 >= Math.max(0, a - walk) && inn[lo - 1] != null
        && inn[lo - 1] >= u && inn[lo - 1] <= inn[lo]) lo--;
      while (hi + 1 <= Math.min(inn.length - 1, b + walk) && inn[hi + 1] != null
        && inn[hi + 1] >= u && inn[hi + 1] <= inn[hi]) hi++;
      const lo2 = Math.max(0, lo - MG), hi2 = Math.min(inn.length - 1, hi + MG);
      const cross = (i, step) => {
        const j = i - step;
        if (j < lo2 || j > hi2 || inn[j] == null) return i;
        return inn[j] === inn[i] ? i : j + step * ((u - inn[j]) / (inn[i] - inn[j]));
      };
      const w = cross(hi, -1) - cross(lo, 1);
      return w > 0 ? w : null;
    };
    return { y0: a, y1: b, len: b - a + 1, dep: D, flat: best, wd: FRACS.map((f) => wAt(f * D)),
      /* 5회차 — 같은 `wAt` 에 **절대 깊이**를 넣는다(자를 새로 만들지 않는다 — 같은 자, 다른 격자). */
      md: MOUTH_U.map((u) => wAt(u)) };
  });
}

async function shot(page, sel, out) {
  await page.locator(sel).screenshot({ path: out });
  return PNG.sync.read(require('fs').readFileSync(out));
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(900);
  await page.evaluate(() => { S.dia = 3e5; S.gold = 1e9; openShopTab('pass'); });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    document.querySelectorAll('#shopw *').forEach((e) => { e.style.animation = 'none'; e.style.transition = 'none'; });
  });

  /* ⚑⚑ 923 3회차 — 이 절의 **기계가 바뀌었다**(333 처방 — 자리를 비우지 않고 뜻을 옮긴다).
     1·2회차의 §A 는 «세로 모서리 반지름 `--ntc-r` 에서 `s`·`u` 의 border-radius 가 파생되는가» 를 물었다.
     3회차가 모양을 **프로필 표 → 폴리곤**으로 옮겼으므로 같은 물음을 폴리곤에 한다:
       ⓐ 두 띠가 정말 `--ntc-ps`/`--ntc-pu` 를 읽는가(= 모양이 선언에 있다)
       ⓑ 두 꼭지(바깥·안쪽)가 «`--ntc-d` 파생» 인가 — 숫자로 구워 넣으면 833 §R 이 조용해진다
       ⓒ 두 형이 **한 프로필 표**를 쓰는가 — 형마다 손으로 다른 표를 적으면 여기가 빨개진다
     ⚠ 폴리곤 x 는 `calc(100% ± Npx)` 로 온다(브라우저가 % 를 안 푼다) — 부호를 같이 읽어야 한다.
     ⚠ 림은 상자가 `inset:0 10px 0 0` 이라 그 10 만큼 좌표가 밀려 온다(833 10회차의 «10px 안쪽»). */
  blk('§A 선언 — 노치 모양이 «프로필 표 한 벌 + `--ntc-d`» 에서 파생된다 (3회차 이관)');
  const decl = await page.evaluate(() => {
    /* 폴리곤 한 벌에서 점의 «깊이»(카드 우변에서 왼쪽으로) 목록을 낸다. eo = 상자가 밀린 몫. */
    const offs = (el, eo) => {
      const cp = getComputedStyle(el).clipPath;
      if (!/^polygon\(/.test(cp)) return null;
      const v = [...cp.matchAll(/calc\(\s*100%\s*([+-])\s*([\d.]+)px\s*\)|(?:^|[,(\s])100%(?=\s)/g)]
        .map((m) => (m[1] ? (m[1] === '-' ? +m[2] : -m[2]) : 0) + eo);
      return v.length ? v : null;
    };
    /* ⚠ y 만 골라야 한다 — x 는 `calc(100% - 43.6px)` 이라 «px)» 로 끝나서 순진한 정규식에 같이 걸린다
       (그 유령을 3회차가 한 번 밟았다). 점을 «x 토큰 + 공백 + y» 로 통째로 물어 두 번째만 취한다. */
    const ys = (el) => {
      const cp = getComputedStyle(el).clipPath;
      return [...cp.matchAll(/(?:calc\([^)]*\)|100%|-?[\d.]+px)\s+(-?[\d.]+)px/g)].map((m) => +m[1]);
    };
    return [...document.querySelectorAll('.pvc')].map((c) => {
      const cs = getComputedStyle(c);
      const s = c.querySelector('.ntc>s'), u = c.querySelector('.ntc>u');
      return {
        id: c.dataset.pv, ban: c.classList.contains('ban1'),
        d: cs.getPropertyValue('--ntc-d').trim(),
        hasVar: !!cs.getPropertyValue('--ntc-ps').trim() && !!cs.getPropertyValue('--ntc-pu').trim(),
        usesVar: !!s && /var\(\s*--ntc-ps\s*\)/.test(s.style.clipPath || getComputedStyle(s).clipPath)
          ? true : (!!s && /polygon/.test(getComputedStyle(s).clipPath)),
        sO: s ? offs(s, 0) : null, uO: u ? offs(u, 10) : null,
        sY: s ? ys(s) : [], sH: s ? s.getBoundingClientRect().height : 0
      };
    });
  });
  ok(decl.length === 3, `[A0] 카드 3장 — ${decl.length}`);
  const norm = [];
  for (const c of decl) {
    const k = c.ban ? 'ban' : 'bl';
    const d = num(c.d);
    const mx = (a) => (a ? Math.max(...a) : NaN);
    const has = (a, v) => !!a && a.some((x) => Math.abs(x - v) < 0.05);
    ok(c.hasVar && c.usesVar,
      `[A1] ${k}(${c.id}) 모양이 «선언» 에 있다 — 카드가 «--ntc-ps/-pu» 를 싣고 두 띠가 폴리곤으로 읽는다`);
    ok(Math.abs(mx(c.sO) - d) < 0.05 && has(c.sO, d - 10),
      `[A2] ${k} 검정 «s» 폴리곤 — 바깥 꼭지 ${mx(c.sO)} = «--ntc-d»(${d}) · 안쪽 꼭지 ${d - 10} 있음(두께 10)`);
    ok(Math.abs(mx(c.uO) - (d + 12)) < 0.05 && has(c.uO, d),
      `[A3] ${k} 림 «u» 폴리곤 — 바깥 꼭지 ${mx(c.uO)} = d+12 · 안쪽이 검정 바깥(${d})과 같다 — 호가 나란히 돈다`);
    /* 정규화 프로필 = (깊이/d, |y − 중심|/반길이). f 격자와 v 열을 갈라 담는다 — 4회차부터
       **격자는 공유하고 값은 형마다 다르다**(아래 [A4]·[A4b]). */
    if (c.sO && c.sY.length === c.sO.length) {
      const cy = c.sH / 2, hl = Math.max(...c.sY.map((y) => Math.abs(y - cy)));
      const half = c.sO.slice(0, c.sO.length / 4);       /* 바깥 곡선의 위쪽 절반 */
      norm.push({ k,
        f: half.map((o) => (o / d).toFixed(3)).join(' '),
        v: half.map((o, i) => (Math.abs(c.sY[i] - cy) / hl).toFixed(3)).join(' ') });
    }
  }
  /* ⚑⚑ 4회차 — 이 항의 **방향이 뒤집혔다**(333 처방 — 자리를 비우지 않는다).
     3회차는 «두 형이 한 표» 를 물었는데, 3회차 채점 2인이 각자의 자로 그 표가 두 형을 **반대 방향**으로
     틀리게 한다는 것을 냈다(배너 +1.8~2.0 넓다 ↔ 불릿 −2.8~3.1 좁다). 근거는 새것이 아니다 —
     **667 7회차가 이미 «두 형의 스캘럽 모양이 다르다»** 고 적어 뒀다(ref 배너는 거의 반원 · 불릿은 납작한 호).
     ⇒ 지금 묻는 것은 «규약이 하나인가»(격자 공유)와 «모양이 정말 갈려 있는가»(값이 다름) 둘이다. */
  const nb = norm.find((n) => n.k === 'ban'), nl = norm.find((n) => n.k === 'bl');
  ok(!!nb && !!nl && nb.f === nl.f,
    `[A4] 두 형이 **같은 f 격자**를 쓴다 — 표는 형마다지만 규약은 하나다 (격자를 손으로 갈라 적으면 빨강)`);
  ok(!!nb && !!nl && nb.v !== nl.v,
    `[A4b] 두 형의 v 열이 **다르다** — ref 두 형의 스캘럽 모양이 다르다(667 7회차 · 3회차 채점 2인 실측). `
    + `한 표로 되돌리면 한쪽이 반드시 틀린다`);

  blk('§B 화소 — 찍힌 노치의 «바닥 평탄부»가 ref 과녁 언저리다 (자 = scan923.py 와 같은 절차)');
  const boxes = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    return [...document.querySelectorAll('.pvc')].map((c) => {
      const r = c.getBoundingClientRect();
      return {
        id: c.dataset.pv, ban: c.classList.contains('ban1'),
        x: Math.round(r.left - A.left), y: Math.round(r.top - A.top),
        w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom - A.top)
      };
    });
  });
  const tmp = path.join(ROOT, `.v923-${process.pid}.png`);
  const png = await shot(page, '#app', tmp);
  const measured = {};
  for (const c of boxes) {
    if (c.y < 0 || c.bottom > png.height) { console.log(`  --  ${c.id} 화면 밖 — 건너뜀`); continue; }
    const i = ((c.y + Math.round(c.h / 2)) * png.width + Math.min(png.width - 3, c.x + c.w + 12)) * 4;
    const bg = [png.data[i], png.data[i + 1], png.data[i + 2]];
    const k = c.ban ? 'ban' : 'bl';
    /* ⚠ 맨 위 노치는 **분홍 배지가 카드 우변을 덮어** 토막 나 있다(ref 도 같다 — ref 배너 맨 위
       노치는 길이 39.2 · 평탄부 2.06). 가려진 자리를 과녁에 걸면 유령 실패가 난다 ⇒
       «온전히 보이는 노치»(길이가 ref 의 8px 안)만 채점하고 나머지는 관측으로 찍는다. */
    const all = notchStats(png, c, bg).filter((n) => n.dep > 20);
    const ns = all.filter((n) => Math.abs(n.len - REF[k].len) <= 8);
    for (const n of all.filter((n) => !ns.includes(n))) {
      console.log(`  --  ${k}(${c.id}) y${n.y0} 길이 ${n.len} — 배지·탭에 가린 토막(관측 · 평탄부 ${n.flat})`);
    }
    measured[c.id] = ns;
    ok(ns.length >= 1, `[B0] ${k}(${c.id}) 깊은 노치 ${ns.length}자리`);
    for (const n of ns) {
      ok(Math.abs(n.flat - REF[k].flat) <= 4.5,
        `[B1] ${k}(${c.id}) y${n.y0} 바닥 평탄부 ${n.flat.toFixed(1)} (ref ${REF[k].flat} · ±4.5)`);
      ok(Math.abs(n.len - REF[k].len) <= 4.0,
        `[B2] ${k}(${c.id}) y${n.y0} 노치 길이 ${n.len.toFixed(1)} (ref ${REF[k].len} · ±4.0 — 바닥을 펴면서 길이가 안 늘었다)`);
      ok(Math.abs(n.dep - (num(decl.find((d) => d.id === c.id).d) - 10)) <= 1.0,
        `[B3] ${k}(${c.id}) y${n.y0} 보이는 깊이 ${n.dep.toFixed(2)} = «--ntc-d − 링 두께 10»`);
      /* ⚑ 923 2회차 — 깊이를 **ref 화소에 직접** 매단다. 1회차까지 이 자리는 «선언과 그림이 같은가»
         만 물었고(위 [B3]) 그래서 40/43 이라는 **두 값**도 초록이었다. ±1.2 는 옛 두 값을 둘 다
         떨어뜨리는 창이다(배너 30.00 → |Δ| 1.40 · 불릿 33.00 → 1.33). 창을 넓히지 마라. */
      ok(Math.abs(n.dep - REF[k].dep) <= 1.2,
        `[B4] ${k}(${c.id}) y${n.y0} 보이는 깊이 ${n.dep.toFixed(2)} 가 ref ${REF[k].dep} 창(±1.2) 안 — 두 형이 한 값이다`);
      /* ⚑⚑ 3회차의 본체 — «옆면이 ref 를 따라가는가». 바닥(평탄부 [B1])과 깊이([B4])만 물으면
         **옆면이 각져도 초록**이고, 그게 1·2회차가 8 에 묶여 있던 자리다(채점 넷이 각자 1순위). */
      FRACS.forEach((f, j) => {
        const got = n.wd[j], want = REF[k].wd[j];
        ok(got != null && Math.abs(got - want) <= W_TOL,
          `[B5-${Math.round(f * 100)}] ${k}(${c.id}) y${n.y0} 깊이 ${Math.round(f * 100)}% 세로 폭 `
          + `${got == null ? 'n/a' : got.toFixed(2)} (ref ${want} · ±${W_TOL})`);
      });
      /* ⚑⚑ 5회차의 본체 — «입» 이 곧은변에 스며드는가. [B5] 가 못 보는 첫 8px 을 절대 깊이로 묻는다. */
      MOUTH_U.forEach((u, j) => {
        const got = n.md[j], want = REF_M[k][j];
        ok(got != null && Math.abs(got - want) <= M_TOL,
          `[B6-u${u}] ${k}(${c.id}) y${n.y0} 깊이 ${u}px 세로 폭 `
          + `${got == null ? 'n/a' : got.toFixed(2)} (ref ${want} · ±${M_TOL})`);
      });
    }
  }

  /* ⚑⚑ 6회차 신설 [B7] — **구멍(마스크)과 띠(폴리곤)의 두 대수 보장.** 찍힌 실루엣은
     «구멍 ∩ 검정 안쪽 곡선» 이라 이 둘이 어긋나면 표를 벌려도 그림이 안 따라오거나(입이 잘린다),
     검정 밖으로 바탕이 샌다. 6회차가 입 전용 구멍을 한 겹 얹은 자리이므로 그 산수를 자로 세운다:
       ⓐ 구멍 ⊇ 검정 «안쪽» 곡선 (안 그러면 노치 속에 카드 재질이 남고 입이 잘린다)
       ⓑ 구멍 ⊆ 검정 «바깥» 곡선 (안 그러면 검정 없는 자리가 뚫려 바탕이 샌다)
     ⚠ ⓑ 의 창이 −0.6 인 것은 **3회차부터 있던 값**이다(배너 −0.43 · 타원 구멍 ↔ 폴리곤 띠의
     모양 차이가 중간 깊이에서 내는 몫 · 6회차가 만든 것이 아니다 — 4회차 트리에서도 같은 −0.43).
     찍힌 화소로는 «검정 밖 바탕» 행이 수리 전후 20행으로 같다(review 5회차 §곁들여). */
  blk('§B7 구멍 ↔ 띠의 두 대수 보장 (입 전용 구멍 층 포함)');
  const inv = await page.evaluate(() => {
    const out = [];
    for (const k of ['ban', 'bl']) {
      const pf = NTC_PROF[k], len = NTC_LEN[k], d = NTC_DEP;
      const hin = (len - 20) / 2, hout = len / 2, ryMain = len / 2 - 1, din = d - 10;
      const m = pvNtcMouth(pf, len, d);
      let a = 99, b = 99, au = 0, bu = 0;
      for (let u = 0; u <= din; u += 0.05) {
        const main = ryMain * Math.sqrt(Math.max(0, 1 - (u / d) ** 2));
        const mouth = m && u < m.rx ? m.ry * Math.sqrt(Math.max(0, 1 - (u / m.rx) ** 2)) : 0;
        const hole = Math.max(main, mouth);
        const ca = hole - ntcV(pf, u / din) * hin, cb = ntcV(pf, u / d) * hout - hole;
        if (ca < a) { a = ca; au = u; }
        if (cb < b) { b = cb; bu = u; }
      }
      out.push({ k, a: +a.toFixed(2), au: +au.toFixed(2), b: +b.toFixed(2), bu: +bu.toFixed(2),
        mouth: m ? `rx${m.rx}/ry${m.ry.toFixed(1)}` : '없음' });
    }
    return out;
  });
  for (const r of inv) {
    ok(r.a >= -0.05, `[B7a] ${r.k} 구멍 ⊇ 검정 안쪽 — 최소 여유 ${r.a} (u=${r.au} · 입 구멍 ${r.mouth})`);
    ok(r.b >= -0.6, `[B7b] ${r.k} 구멍 ⊆ 검정 바깥 — 최소 여유 ${r.b} (u=${r.bu} · 창 −0.6 = 3회차부터의 값)`);
  }

  /* ⚑⚑ 6회차 채점 GS 신설 축 [B8] — **띠(검정 링) 두께가 노치를 따라 얇아진다.**
     GS 실측(찍힌 화소 · 문턱 사다리 5단 부호 불변): 곧은변 10.00 ↔ 노치 최소 **8.08**(ref 9.93 ·
     곧은변 대비 −0.28 밖에 안 준다) ⇒ **Δ −1.85**. 5회차 8.77 → 6회차 8.08 이므로 **입 층이 0.69 를 더 깎았다**.
     기계는 «세 곡선이 한 표를 서로 다른 (깊이, 길이)로 읽는다»(833 §12) 는 규약 자체다 — 어깨에서
     두 곡선의 **수직** 거리가 10 보다 작아진다(선언 기하로 재면 배너 최소 7.7 · 불릿 6.7, 둘 다 u≈8).
     ⚠ **이 항은 «래칫» 이다** — 과녁(ref 9.93)에 아직 못 갔고, 7회차가 그 자리다(review 6회차 §5 처방:
     안쪽 곡선을 과녁으로 두고 **바깥·림을 그 오프셋으로** 내면 띠가 어디서나 10 이 된다.
     ⚠ 반대 방향(바깥을 두고 안쪽을 오프셋)은 **입을 무너뜨린다** — 실측으로 기각했다: 배너 −8.3 · 불릿 −16.0).
     지금 값보다 **나빠지면 빨강**이라 7회차 전에 조용히 더 깎이는 것을 막는다. */
  blk('§B8 띠 두께 래칫 (6회차 채점 GS 신설 축 · 과녁 ref 9.93 — 7회차 몫)');
  const thick = await page.evaluate(() => {
    const out = [];
    for (const k of ['ban', 'bl']) {
      const pf = NTC_PROF[k], len = NTC_LEN[k], d = NTC_DEP;
      const hin = (len - 20) / 2, hout = len / 2, din = d - 10;
      const inner = [], outer = [];
      for (let i = 0; i <= 2000; i++) {
        const f = i / 2000;
        inner.push([f * din, ntcV(pf, f) * hin]);
        outer.push([f * d, ntcV(pf, f) * hout]);
      }
      let min = 99, mu = 0;
      for (const [x, y] of outer) {
        let best = 99;
        for (const [a, b] of inner) {
          const dd = (x - a) ** 2 + (y - b) ** 2;
          if (dd < best) best = dd;
        }
        best = Math.sqrt(best);
        if (best < min) { min = best; mu = x; }
      }
      out.push({ k, min: +min.toFixed(2), u: +mu.toFixed(1) });
    }
    return out;
  });
  for (const t of thick) {
    /* 래칫 값 4.0 = 6회차 선언 기하의 실측(배너 5.75 · 불릿 4.22) 바로 아래. ⚠ 이 수는 GS 가 찍힌
       화소로 잰 8.08 과 **정의가 다르다** — 여기는 두 폴리곤 곡선 사이의 수직 거리(더 엄한 대리자)이고,
       찍힌 띠는 구멍이 입 쪽 일부를 덮어 그보다 두껍게 보인다. 두 수를 섞어 쓰지 마라. */
    ok(t.min >= 4.0, `[B8] ${t.k} 띠 두께(선언 기하) 최소 ${t.min}(u=${t.u}) ≥ 4.0 래칫 — 곧은변 10 · ref 9.93 (7회차가 올린다)`);
  }

  /* ⚑ 923 3회차 — 되돌림의 사보타주가 바뀌었다. 1·2회차는 `border-radius:50%` 한 줄이면 옛 그림이 됐지만
     3회차는 모양이 폴리곤이라, **옛 «작은 상자 + 테두리 + 반지름» 링을 통째로 세워야** 옛 그림이 된다
     (`clip-path:none` 만 걸면 상자가 통째로 검게 칠해져 «다른 결함» 을 재게 된다 — 그건 이 자의 물음이 아니다).
     높이는 `.ntc` 상자에서 파생시킨다(`100% − 24px` = 노치 길이) — 자리마다 다른 값을 손으로 안 적는다. */
  blk('§R 되돌림 — 옛 타원 링(`border-radius:50%`)을 세우면 §B 의 [B1]·[B5] 가 빨개진다');
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = '__v923rev';
    st.textContent = '#shopw .pvc>.ntc>s{clip-path:none!important;background:none!important;'
      + 'inset:calc(12px + var(--ntc-m,0px)) auto auto 12px!important;width:calc(var(--ntc-d)*2)!important;'
      + 'height:calc(100% - 24px - 2*var(--ntc-m,0px))!important;box-sizing:border-box!important;'
      + 'border:10px solid #000!important;border-radius:50%!important}';
    document.head.appendChild(st);
  });
  await page.waitForTimeout(120);
  const png2 = await shot(page, '#app', tmp);
  for (const c of boxes) {
    if (c.y < 0 || c.bottom > png2.height) continue;
    const i = ((c.y + Math.round(c.h / 2)) * png2.width + Math.min(png2.width - 3, c.x + c.w + 12)) * 4;
    const bg = [png2.data[i], png2.data[i + 1], png2.data[i + 2]];
    const k = c.ban ? 'ban' : 'bl';
    const ns = notchStats(png2, c, bg).filter((n) => n.dep > 20 && Math.abs(n.len - REF[k].len) <= 8);
    const worst = ns.length ? Math.min(...ns.map((n) => n.flat)) : 0;
    ok(ns.length > 0 && worst < REF[k].flat - 4.5,
      `[R1] ${k}(${c.id}) 타원으로 되돌리면 평탄부 ${worst.toFixed(1)} — ref ${REF[k].flat} 의 창(±4.5) 밖으로 무너진다`);
    const before = (measured[c.id] || []).map((n) => n.flat);
    ok(before.length > 0 && worst < Math.min(...before) - 3,
      `[R2] ${k}(${c.id}) 수리본(${before.map((v) => v.toFixed(1)).join('/')}) > 되돌림(${worst.toFixed(1)}) — 이 자가 재는 것이 «바닥» 이 맞다`);
  }

  /* ⚑⚑ 3회차 신설 — **되돌림이 둘이 된 이유**가 이 절의 소득이다. 위 사보타주(순수 반원)는 [B1] 을
     무너뜨리지만 **[B5] 는 배너에서 못 무너뜨린다**(|Δ|max 1.34) — ref 배너 노치가 «거의 반원» 이라
     순수 반원이 우연히 어깨까지 맞기 때문이다(667 7회차 주석이 이미 «배너는 스팬 ≈ 2×깊이» 라고 적어 뒀다).
     ⇒ [B5] 가 지키는 것은 «반원이 아님» 이 아니라 **«2회차의 타원(50% / r)이 아님»** 이다. 그래서
     되돌림도 그 선언 그대로 세운다(`--ntc-r` 배너 33.6 · 불릿 47.4 — 3회차가 지운 두 값). */
  blk('§R2 되돌림 둘째 — 2회차 타원(`50% / --ntc-r`)을 세우면 [B5] 가 빨개진다');
  await page.evaluate(() => {
    document.getElementById('__v923rev').textContent =
      '#shopw .pvc{--ntc-rev:47.4px}#shopw .pvc.ban1{--ntc-rev:33.6px}'
      + '#shopw .pvc>.ntc>s{clip-path:none!important;background:none!important;'
      + 'inset:calc(12px + var(--ntc-m,0px)) auto auto 12px!important;width:calc(var(--ntc-d)*2)!important;'
      + 'height:calc(100% - 24px - 2*var(--ntc-m,0px))!important;box-sizing:border-box!important;'
      + 'border:10px solid #000!important;border-radius:50% / var(--ntc-rev)!important}';
  });
  await page.waitForTimeout(120);
  const png3 = await shot(page, '#app', tmp);
  const r4 = [];
  for (const c of boxes) {
    if (c.y < 0 || c.bottom > png3.height) continue;
    const i = ((c.y + Math.round(c.h / 2)) * png3.width + Math.min(png3.width - 3, c.x + c.w + 12)) * 4;
    const bg = [png3.data[i], png3.data[i + 1], png3.data[i + 2]];
    const k = c.ban ? 'ban' : 'bl';
    const ns = notchStats(png3, c, bg).filter((n) => n.dep > 20 && Math.abs(n.len - REF[k].len) <= 8);
    const outw = ns.flatMap((n) => n.wd.map((g, j) => (g == null ? 0 : Math.abs(g - REF[k].wd[j]))));
    ok(outw.some((v) => v > W_TOL),
      `[R3] ${k}(${c.id}) 2회차 타원으로 되돌리면 «깊이별 폭»(§B [B5])이 창 밖이다 — 최대 |Δ| `
      + `${outw.length ? Math.max(...outw).toFixed(2) : 'n/a'} > ${W_TOL}`);
    /* 짝 자료 — 그때 바닥([B1])은 초록인가. 한 형에서라도 «바닥 초록 + 폭 빨강» 이면 [B5] 가
       [B1] 로 대체될 수 없다는 증거다(아래 [R4]). */
    const worst2 = ns.length ? Math.min(...ns.map((n) => n.flat)) : 0;
    r4.push({ k, id: c.id, flatOk: ns.length > 0 && Math.abs(worst2 - REF[k].flat) <= 4.5,
      wdBad: outw.some((v) => v > W_TOL), flat: worst2 });
  }
  /* ⚑ 4회차 정정 — 3회차는 이 항을 **형마다** 걸었다가 빨개졌다. 자를 덮개 적분으로 갈고 나니
     2회차 타원은 **불릿형에서는 바닥까지** 무너뜨린다(평탄부 32.0 ↔ ref 24.75). 배너형에서는
     여전히 «바닥 초록 + 폭 빨강» 이다 ⇒ 주장은 «모든 형에서» 가 아니라 **«적어도 한 형에서»** 다.
     그 한 자리가 있는 한 [B5] 는 [B1] 로 대체되지 않는다. */
  ok(r4.some((r) => r.flatOk && r.wdBad),
    `[R4] 적어도 한 형에서 «바닥([B1])은 초록인데 깊이별 폭([B5])은 빨강» 이다 — [B5] 가 [B1] 로 `
    + `대체되지 않는다는 증거 · ${r4.map((r) => `${r.k}:${r.flat.toFixed(1)}${r.flatOk ? '초록' : '빨강'}/`
      + `${r.wdBad ? '폭빨강' : '폭초록'}`).join(' ')}`);
  /* ⚑⚑ 5회차 신설 — **되돌림 셋째: «입» 만 눌러 본다.** 위 둘(순수 반원 · 2회차 타원)은 모양을
     통째로 갈아 [B1]·[B5] 를 무너뜨리지만, 5회차가 만진 것은 표의 **머리**(f ≤ .16 의 v > 1)뿐이라
     그 둘로는 이번 수리가 되돌려졌는지 알 수 없다. ⇒ 표의 머리를 v = 1 로 눌러(= 4회차 상태)
     **[B6] 은 빨개지고 [B5] 는 초록인가**를 묻는다. 초록이어야 «[B6] 이 [B5] 로 대체되지 않는다» 가
     증명된다(3회차가 [R4] 로 세운 것과 같은 꼴).
     ⚠ 사보타주는 CSS 가 아니라 **표 자체**다 — 상자 여백도 `pvNtcMargin` 이 표에서 파생하므로
     표만 누르면 상자까지 4회차 값으로 같이 돌아간다(그래서 이 되돌림이 «수리 전» 과 픽셀 동일이다). */
  blk('§R3 되돌림 셋째 — 표의 «머리»(v>1)만 v=1 로 누르면 [B6] 이 빨개지고 [B5] 는 초록이다');
  await page.evaluate(() => {
    document.getElementById('__v923rev').textContent = '';   /* 앞 되돌림 CSS 를 걷는다 */
    /* 원래 표를 먼저 떠 둔다 — 아래 §R4 가 이 사본으로 표를 되살린 뒤 «구멍 층만» 뗀다. */
    window.PROF0 = {};
    Object.keys(NTC_PROF).forEach((k) => { PROF0[k] = NTC_PROF[k].map((p) => p[1]); });
    Object.keys(NTC_PROF).forEach((k) => NTC_PROF[k].forEach((p) => { if (p[1] > 1) p[1] = 1; }));
    openShopTab('pass');
  });
  await page.waitForTimeout(500);
  const png4 = await shot(page, '#app', tmp);
  const r5 = [];
  for (const c of boxes) {
    if (c.y < 0 || c.bottom > png4.height) continue;
    const i = ((c.y + Math.round(c.h / 2)) * png4.width + Math.min(png4.width - 3, c.x + c.w + 12)) * 4;
    const bg = [png4.data[i], png4.data[i + 1], png4.data[i + 2]];
    const k = c.ban ? 'ban' : 'bl';
    /* 앞 되돌림 둘과 같은 창 — 배너 맨 위 자리는 분홍 배지가 물어 토막이라 길이로 걸러 낸다
       (안 거르면 그 토막이 «입 33px 틀림» 같은 유령을 낸다 — §B 가 쓰는 창과 같은 것이다). */
    const ns = notchStats(png4, c, bg).filter((n) => n.dep > 20 && Math.abs(n.len - REF[k].len) <= 8);
    if (!ns.length) continue;
    const mBad = ns.flatMap((n) => n.md.map((g, j) => (g == null ? 99 : Math.abs(g - REF_M[k][j]))));
    const wOut = ns.flatMap((n) => n.wd.map((g, j) => (g == null ? 99 : Math.abs(g - REF[k].wd[j]))));
    r5.push({ k, id: c.id, mMax: Math.max(...mBad), wMax: Math.max(...wOut) });
  }
  for (const r of r5) {
    ok(r.mMax > M_TOL,
      `[R5] ${r.k}(${r.id}) 표의 머리를 v=1 로 누르면 «입 폭»([B6])이 창 밖 — 최대 |Δ| ${r.mMax.toFixed(2)} > ${M_TOL}`);
  }
  ok(r5.length > 0 && r5.every((r) => r.wMax <= W_TOL),
    `[R5b] 그때 «깊이별 폭»([B5])은 전부 초록이다 — [B6] 이 [B5] 로 대체되지 않는다는 증거 · `
    + r5.map((r) => `${r.k}:입${r.mMax.toFixed(2)}/폭${r.wMax.toFixed(2)}`).join(' '));

  /* ⚑⚑ 6회차 신설 — **되돌림 넷째: 입 전용 구멍 층만 뗀다.** 표는 그대로 두고 `pvNtcMouth` 만
     «층 없음» 으로 돌리면, 찍힌 입은 **타원 구멍에서 잘려**(불릿 2×55.98 = 112) [B6-u1] 이 빨개진다.
     배너는 주 구멍이 이미 덮으므로 층이 없어도 초록이다 — 그 비대칭이 «이 층이 실제로 일을 한다» 는
     증거다(층이 장식이면 두 형 다 초록일 것이다). */
  blk('§R4 되돌림 넷째 — 입 전용 구멍 층을 떼면 불릿 [B6-u1] 이 빨개진다 (배너는 초록)');
  await page.evaluate(() => {
    Object.keys(NTC_PROF).forEach((k) => NTC_PROF[k].forEach((p, i) => { p[1] = PROF0[k][i]; }));
    pvNtcMouth = () => null;
    openShopTab('pass');
  });
  await page.waitForTimeout(500);
  const png5 = await shot(page, '#app', tmp);
  const r6 = [];
  for (const c of boxes) {
    if (c.y < 0 || c.bottom > png5.height) continue;
    const i = ((c.y + Math.round(c.h / 2)) * png5.width + Math.min(png5.width - 3, c.x + c.w + 12)) * 4;
    const bg = [png5.data[i], png5.data[i + 1], png5.data[i + 2]];
    const k = c.ban ? 'ban' : 'bl';
    const ns = notchStats(png5, c, bg).filter((n) => n.dep > 20 && Math.abs(n.len - REF[k].len) <= 8);
    if (!ns.length) continue;
    const d1 = Math.max(...ns.map((n) => (n.md[0] == null ? 99 : Math.abs(n.md[0] - REF_M[k][0]))));
    r6.push({ k, id: c.id, d1 });
  }
  ok(r6.some((r) => r.k === 'bl' && r.d1 > M_TOL) && r6.every((r) => r.k !== 'ban' || r.d1 <= M_TOL),
    `[R6] 입 구멍 층을 떼면 불릿만 [B6-u1] 이 빨개진다 — ${r6.map((r) => `${r.k}:|Δ|${r.d1.toFixed(2)}`).join(' ')}`
    + ` (창 ${M_TOL})`);

  try { require('fs').unlinkSync(tmp); } catch (e) { /* 지워졌으면 됐다 */ }

  blk('§Z 콘솔');
  ok(errs.length === 0, `[Z] 콘솔·페이지 에러 0건 — ${errs.length}`);

  await b.close();
  console.log(`\nVERIFY923 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
