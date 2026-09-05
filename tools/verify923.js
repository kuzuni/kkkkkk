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
const REF = {                     /* ref 실측(우리 px) — `python3 tools/scan923.py --ref` */
  ban: { flat: 18.57, len: 59.8, dep: 31.40 },
  bl: { flat: 26.82, len: 92.8, dep: 31.67 }
};
const R_DECL = { ban: 33.6, bl: 47.4 };   /* 923 1회차가 고른 세로 모서리 반지름 */

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
    return { y0: a, y1: b, len: b - a + 1, dep: D, flat: best };
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

  blk('§A 선언 — 세로 모서리 반지름이 «값 하나»(`--ntc-r`)에서 파생된다');
  const decl = await page.evaluate(() => [...document.querySelectorAll('.pvc')].map((c) => {
    const cs = getComputedStyle(c);
    const s = c.querySelector('.ntc>s'), u = c.querySelector('.ntc>u');
    const rr = (e) => (e ? getComputedStyle(e).borderTopLeftRadius : '');
    return {
      id: c.dataset.pv, ban: c.classList.contains('ban1'),
      r: cs.getPropertyValue('--ntc-r').trim(), d: cs.getPropertyValue('--ntc-d').trim(),
      sR: rr(s), uR: rr(u),
      sW: s ? s.getBoundingClientRect().width : 0, sH: s ? s.getBoundingClientRect().height : 0,
      uW: u ? u.getBoundingClientRect().width : 0
    };
  }));
  ok(decl.length === 3, `[A0] 카드 3장 — ${decl.length}`);
  for (const c of decl) {
    const k = c.ban ? 'ban' : 'bl';
    const want = R_DECL[k];
    ok(Math.abs(num(c.r) - want) < 0.05,
      `[A1] ${k}(${c.id}) «--ntc-r» = ${c.r} (과녁 ${want}px)`);
    /* border-radius 는 «가로 / 세로» 두 값이다 — 가로는 폭의 절반(= 깊이 축), 세로는 --ntc-r */
    /* ⚠ `borderTopLeftRadius` 는 «가로 / 세로» 두 값이고 **가로는 백분율 그대로**(`50% 47.4px`) 온다 —
       숫자로 파싱하면 50 이 되어 폭의 절반(43)과 안 맞는 유령 실패가 난다. 가로는 문자열로 묻는다. */
    const [sxs, sys] = c.sR.split(' ');
    ok(sxs.trim() === '50%' && Math.abs(num(sys) - want) < 0.6,
      `[A2] ${k} 링 «s» 모서리 = 가로 ${sxs}(= 폭의 절반 ${(c.sW / 2).toFixed(1)}px) · 세로 ${sys}(= --ntc-r)`);
    const [uxs, uys] = c.uR.split(' ');
    ok(uxs.trim() === '50%' && Math.abs(num(uys) - (want + 12)) < 0.6,
      `[A3] ${k} 림 «u» 모서리 = 가로 ${uxs} · 세로 ${uys}(= --ntc-r + 12 — 호가 나란히 돈다)`);
    ok(num(c.r) < c.sH / 2,
      `[A4] ${k} 세로 모서리 ${num(c.r)} < 링 높이의 절반 ${(c.sH / 2).toFixed(1)} — 그래야 바닥에 곧은 구간이 생긴다`);
  }

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
        `[B4] ${k}(${c.id}) y${n.y0} 보이는 깊이 ${n.dep.toFixed(2)} 가 ref ${REF[k].dep} 창(±1.2) 안 — 두 형이 한 값(41)이다`);
    }
  }

  blk('§R 되돌림 — 옛 타원(`border-radius:50%`)으로 되돌리면 §B [B1] 이 빨개진다');
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = '__v923rev';
    st.textContent = '#shopw .pvc>.ntc>s{border-radius:50% !important}#shopw .pvc>.ntc>u{border-radius:50% !important}';
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
  try { require('fs').unlinkSync(tmp); } catch (e) { /* 지워졌으면 됐다 */ }

  blk('§Z 콘솔');
  ok(errs.length === 0, `[Z] 콘솔·페이지 에러 0건 — ${errs.length}`);

  await b.close();
  console.log(`\nVERIFY923 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
