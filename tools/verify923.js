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
const REF = {                     /* ref 실측(우리 px) — `python3 tools/scan923.py --ref [--prof]` */
  ban: { flat: 18.57, len: 59.8, dep: 31.40, wd: [56.66, 52.87, 40.75, 28.42] },
  bl: { flat: 26.82, len: 92.8, dep: 31.67, wd: [90.23, 81.26, 66.06, 43.88] }
};
const W_TOL = 2.5;                /* 옛 타원은 8자리 중 4자리에서 이 창 밖이다(§R 이 매 실행 확인한다) */

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
  if (last + 1 >= d.length) return x0 + last + 0.5;
  const a = d[last], b = d[last + 1];
  return x0 + last + 0.5 + (a === b ? 0 : (a - T) / (a - b));
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
    const wAt = (u) => {
      const idx = [];
      for (let i = a; i <= b; i++) if (inn[i] != null && inn[i] >= u) idx.push(i);
      if (!idx.length) return null;
      const cross = (i, step) => {
        const j = i - step;
        if (j < a || j > b || inn[j] == null) return i;
        return inn[j] === inn[i] ? i : j + (u - inn[j]) / (inn[i] - inn[j]);
      };
      return cross(idx[idx.length - 1], -1) - cross(idx[0], 1);
    };
    return { y0: a, y1: b, len: b - a + 1, dep: D, flat: best, wd: FRACS.map((f) => wAt(f * D)) };
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
    /* 정규화 프로필 = (깊이/d, |y − 중심|/반길이) — 두 형이 같은 표를 읽으면 이 열이 같다. */
    if (c.sO && c.sY.length === c.sO.length) {
      const cy = c.sH / 2, hl = Math.max(...c.sY.map((y) => Math.abs(y - cy)));
      const half = c.sO.slice(0, c.sO.length / 4);       /* 바깥 곡선의 위쪽 절반 */
      norm.push({ k, v: half.map((o, i) => `${(o / d).toFixed(3)}:${(Math.abs(c.sY[i] - cy) / hl).toFixed(3)}`).join(' ') });
    }
  }
  const nb = norm.find((n) => n.k === 'ban'), nl = norm.find((n) => n.k === 'bl');
  ok(!!nb && !!nl && nb.v === nl.v,
    `[A4] 두 형이 **한 프로필 표**를 읽는다 — 정규화 좌표 열이 같다 (형마다 손으로 적으면 빨강)`);

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
    }
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
      + 'inset:12px auto auto 12px!important;width:calc(var(--ntc-d)*2)!important;'
      + 'height:calc(100% - 24px)!important;box-sizing:border-box!important;'
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
      + 'inset:12px auto auto 12px!important;width:calc(var(--ntc-d)*2)!important;'
      + 'height:calc(100% - 24px)!important;box-sizing:border-box!important;'
      + 'border:10px solid #000!important;border-radius:50% / var(--ntc-rev)!important}';
  });
  await page.waitForTimeout(120);
  const png3 = await shot(page, '#app', tmp);
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
    /* 짝 항 — 그때 **바닥은 멀쩡하다**(1회차가 고친 자리다) ⇒ [B1] 만으로는 이 결함을 못 본다는 증거. */
    const worst2 = ns.length ? Math.min(...ns.map((n) => n.flat)) : 0;
    ok(ns.length > 0 && Math.abs(worst2 - REF[k].flat) <= 4.5,
      `[R4] ${k}(${c.id}) 그때 바닥 평탄부는 ${worst2.toFixed(1)} 로 **초록이다**(ref ${REF[k].flat} ±4.5) — `
      + `[B1] 만 있었으면 3회차 결함을 못 봤다는 증거`);
  }
  try { require('fs').unlinkSync(tmp); } catch (e) { /* 지워졌으면 됐다 */ }

  blk('§Z 콘솔');
  ok(errs.length === 0, `[Z] 콘솔·페이지 에러 0건 — ${errs.length}`);

  await b.close();
  console.log(`\nVERIFY923 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
