/* 작업 383 — 03 던전 카드 «레벨» 알약 값 숫자의 **정렬 모델** 게이트.
 *
 *   node tools/verify383.js
 *
 * 무엇을 지키나 — 342 §10 이 이관한 한 줄이다(4회차 비평가 AY ④ 실측):
 *   ref 는 «레벨» 값이 **중심 abs 209.5 = 카드+159.5 에 center** 다.
 *     ref 카드1 «3» abs 201..219(중심 210) · 카드4 «1» abs 204..213(중심 208.5)
 *   우리는 `left:66px` **좌단 고정**이었다 — 한 자리에서는 2~3px 이지만 자릿수가 늘면 커진다.
 *
 * ⚑ 이 게이트의 본체는 «지금 값이 ref 자리에 있나» 가 아니라 **«어느 모델인가»** 다.
 *   한 자리 표본 하나로는 좌단 고정과 중앙 정렬을 **구분할 수 없어서**(LESSONS 328),
 *   기대값만 갈아 끼우면 383 이 통째로 되돌아가도 초록인 게이트가 된다. 그래서 §3 이
 *   같은 칸에 «1 → 8 → 88 → 888» 을 넣어 가며 **중심이 안 움직이는지**를 묻는다.
 *
 * ⚑ 자는 둘로 갈라 둔다(357 처방) — **배치(상자) ±0.5 · 잉크 ±2**.
 *   상자 중심은 CSS 가 정하는 값이라 결정적이고, 잉크 중심은 글리프 side bearing 이 섞인다
 *   (ref 자신도 «1» 208.5 ↔ «3» 210 으로 1.5px 벌어져 있다 = 폰트 몫). 잉크를 ±0.5 로 조이면
 *   폰트 몫을 CSS 로 때우라는 뜻이 되어 «비균등 보정» 으로 간다(357 이 금지한 그것).
 *
 * 재는 법 — 상자는 `getBoundingClientRect`, 잉크는 **찍힌 픽셀**(350 처방).
 * ⚠ 잉크는 **해금 칸에서만** 읽힌다: 잠금 카드는 `.dnc .lk{background:rgba(0,0,0,.65)}` 스크림이
 *   흰 숫자를 89 로 눌러 색 마스크에 안 걸린다(실측). 그래서 8칸은 상자가, 2칸은 잉크가 맡는다.
 *
 * 좌표계 — 카드 리스트는 상단 앵커다(335 «앵커가 둘»): ref_y = cap_y + 84. 가로는 1:1.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const near = (n, got, want, tol) => ok(got !== null && got !== undefined && Math.abs(got - want) <= tol,
  `${n} ${got} = ${want} (±${tol})`);
const span = (a) => +(Math.max(...a) - Math.min(...a)).toFixed(2);

/* ── 레퍼런스 실측 (342 §10 · 측정표 03 §3-5-2) — 카드 좌변 abs 50 ───────── */
const R = {
  cx: 159.5,          /* 값의 **중심**(advance 기준) — abs 209.5 */
  ink1: 158.5,        /* 글리프 «1» 잉크 중심 — abs 208.5 (204..213) */
  ink3: 160.0,        /* 글리프 «3» 잉크 중심 — abs 210.0 (201..219) */
  tkX: 350,           /* «남은 횟수» 값 상자 좌변 — 383 이 안 건드린 자리 */
  rdX: 148,           /* 레이드 카드 값 상자 좌변 — **다른 모델**, 새면 안 된다 */
};

/* 383 이전 CSS — §R 이 사본에 도로 주입한다 */
const OLD = `.dnc:not(.rd) .sp.lv>i{left:66px!important;width:auto!important;text-align:left!important}`;

async function snap(p, pillSel) {
  const shot = (await p.screenshot()).toString('base64');
  return p.evaluate(async ([b64, sel]) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, cv.width, cv.height).data;
    /* 창은 «알약 박스 × `<i>` 세로 구간» — 가로를 알약으로 넓게 잡아야 좌단 고정(옛 모델)과
       중앙 정렬(새 모델)을 **같은 창**으로 비교할 수 있다. */
    const inkIn = (pill, el, tol) => {
      if (!pill || !el) return null;
      const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number);
      const rp = pill.getBoundingClientRect(), re = el.getBoundingClientRect();
      const x0 = Math.max(0, Math.floor(rp.left)), x1 = Math.min(cv.width, Math.ceil(rp.right));
      const y0 = Math.max(0, Math.floor(re.top) - 3), y1 = Math.min(cv.height, Math.ceil(re.bottom) + 3);
      if (x1 - x0 < 2 || y1 - y0 < 2) return null;
      let bx0 = 1e9, bx1 = -1;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * cv.width + x) * 4;
        if (Math.abs(D[i] - m[0]) <= tol && Math.abs(D[i + 1] - m[1]) <= tol && Math.abs(D[i + 2] - m[2]) <= tol) {
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
        }
      }
      return bx1 < 0 ? null : { x: bx0, w: bx1 - bx0 + 1 };
    };
    const out = [];
    document.querySelectorAll('#dunList .dnc').forEach((c, i) => {
      const cr = c.getBoundingClientRect();
      const vis = cr.top >= 0 && cr.bottom <= cv.height;
      const pill = c.querySelector(sel), el = pill && pill.querySelector('i');
      const r = el && el.getBoundingClientRect();
      const ink = vis ? inkIn(pill, el, 26) : null;
      out.push({ n: i + 1, rd: c.classList.contains('rd'), lkd: c.classList.contains('lkd'),
        txt: el ? el.textContent : '',
        box: r ? { x: +(r.left - cr.left).toFixed(2), w: +r.width.toFixed(2),
          cx: +(r.left + r.width / 2 - cr.left).toFixed(2) } : null,
        ink: ink ? { x: +(ink.x - cr.left).toFixed(1), w: ink.w,
          cx: +(ink.x + ink.w / 2 - cr.left).toFixed(1) } : null });
    });
    return out;
  }, [shot, pillSel]);
}

async function setLv(p, v) {
  await p.evaluate((v) => {
    document.querySelectorAll('#dunList .dnc:not(.rd) .sp.lv>i').forEach((el) => { el.textContent = v; });
  }, v);
  await p.waitForTimeout(200);
}

async function openAdv(p) {
  await p.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
  await p.waitForTimeout(450);
  await p.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
  await p.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
  await p.waitForTimeout(800);   /* 60 쥬시 pop-in 이 끝나야 bbox 가 확정된다 */
}

async function sub(p, key) {
  await p.evaluate((k) => { document.querySelector('#dunSub [data-dsub="' + k + '"]').click(); }, key);
  await p.waitForTimeout(600);
}

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(900);
  await openAdv(p);

  const d = await snap(p, '.sp.lv');
  const un = d.filter((c) => !c.lkd);

  console.log('\n[§1 배치 — 값 상자 중심이 ref 중심 카드+159.5 다] (8칸 전부 · 자 ±0.5)');
  ok(d.length === 8, `던전 카드 8칸이 표본에 있다 (${d.length})`);
  for (const c of d) near(`카드${c.n} 값 상자 중심`, c.box && c.box.cx, R.cx, 0.5);

  console.log('\n[§2 잉크 — 찍힌 픽셀이 ref 글리프 자리에 온다] (해금 칸 · 자 ±2 = 폰트 몫)');
  ok(un.length >= 2 && un.every((c) => c.ink),
    `해금 ${un.length}칸 전부에서 잉크를 읽었다 — 잠금 칸은 \`.lk\` 스크림(rgba(0,0,0,.65))이 흰 잉크를 89 로 눌러 못 읽는다`);
  for (const c of un) near(`카드${c.n} «1» 잉크 중심`, c.ink && c.ink.cx, R.ink1, 2);
  /* ref 는 글리프 둘을 준다 — «3» 은 «1» 보다 잉크가 넓고 중심이 1.5px 오른쪽이다.
     한 글리프만 물면 «중심이 맞다» 가 아니라 «이 글자에서 맞다» 밖에 안 된다. */
  await setLv(p, '3');
  const d3 = await snap(p, '.sp.lv');
  for (const c of d3.filter((x) => !x.lkd)) near(`카드${c.n} «3» 잉크 중심`, c.ink && c.ink.cx, R.ink3, 2);
  ok(d3.filter((x) => !x.lkd).every((c) => c.ink.w > un[0].ink.w + 4),
    `«3» 잉크가 «1» 보다 넓다 — 두 글리프가 정말 다른 표본이다 (${d3.filter((x) => !x.lkd).map((c) => c.ink.w).join('/')} > ${un.map((c) => c.ink.w).join('/')})`);

  console.log('\n[§3 ⚑ 모델 — 자릿수가 늘어도 중심이 안 움직인다] (등재문이 «필수» 로 못박은 되돌림 축)');
  const lad = [];
  for (const v of ['1', '8', '88', '888']) {
    await setLv(p, v);
    lad.push({ v, d: await snap(p, '.sp.lv') });
  }
  const cx1 = lad.map((r) => r.d[0].box.cx), xi = lad.map((r) => r.d[0].ink && r.d[0].ink.x);
  ok(span(cx1) <= 0.5, `카드1 중심이 «1→8→88→888» 에서 한 값 — ${cx1.join(' · ')} (span ${span(cx1)} ≤ 0.5)`);
  /* ⚠ «상자 좌변이 움직인다» 로 물으면 안 된다 — 새 모델의 상자는 폭 고정이라 좌변도 고정이다.
     «좌단 고정이 아니다» 를 말하는 것은 **잉크 좌변**이다: 자릿수가 늘면 왼쪽으로 자라야 한다.
     이 항이 없으면 «글자를 아예 안 그려도» 중심 항이 초록일 수 있다. */
  ok(xi.every((v) => v !== null) && span(xi) >= 8 && xi[0] > xi[3],
    `그리고 잉크 좌변은 자릿수를 따라 **왼쪽으로** 자란다 — ${xi.join(' · ')} (span ${span(xi)} ≥ 8) ⇒ «좌단 고정» 이 아니다`);
  const inkL = lad.map((r) => r.d[0].ink && r.d[0].ink.cx);
  ok(inkL.every((v) => v !== null) && span(inkL) <= 2,
    `찍힌 픽셀도 같다 — 잉크 중심 ${inkL.join(' · ')} (span ${span(inkL)} ≤ 2)`);
  /* 8칸 전부에 같은 질문을 한다 — 카드 하나만 물면 «그 카드만» 고쳐도 초록이다. */
  ok(lad.every((r) => r.d.every((c) => Math.abs(c.box.cx - R.cx) <= 0.5)),
    `8칸 × 4자릿수 = ${8 * 4} 표본 전부 중심 ${R.cx} (±0.5)`);

  console.log('\n[§4 상자가 글리프보다 넓다 — `text-align` 이 살아 있다] (357 본체)');
  const longest = lad[3].d[0];
  ok(longest.ink.w < longest.box.w,
    `최장 «888» 잉크 폭 ${longest.ink.w} < 상자 폭 ${longest.box.w} — 넘치지 않으므로 line-left 로 안 떨어진다`);
  /* 양성 대조 — `text-align` 을 흔들면 값이 **실제로 움직여야** 한다. 357 은 세 값이 완전히
     같은 것으로 «죽어 있음» 을 못박았다. 여기서는 그 반대(살아 있음)를 같은 자로 잰다. */
  await setLv(p, '88');
  const alignCx = [];
  for (const a of ['left', 'center', 'right']) {
    const h = await p.addStyleTag({ content: `.dnc:not(.rd) .sp.lv>i{text-align:${a}!important}` });
    await p.waitForTimeout(150);
    alignCx.push((await snap(p, '.sp.lv'))[0].ink.cx);
    await p.evaluate((el) => el.remove(), h);
  }
  ok(span(alignCx) >= 30,
    `양성 대조 — text-align left/center/right 로 잉크가 실제로 움직인다 ${alignCx.join(' · ')} (span ${span(alignCx)} ≥ 30)`);
  await p.waitForTimeout(150);

  console.log('\n[§5 안 새는 자리 — 383 은 «레벨» 알약 하나만 건드렸다]');
  await p.evaluate(() => { if (typeof renderDunPage === 'function') renderDunPage(); });
  await p.waitForTimeout(400);
  const tk = await snap(p, '.sp.tk');
  for (const c of tk) near(`카드${c.n} «남은 횟수» 값 상자 좌변`, c.box && c.box.x, R.tkX, 0.5);
  ok(tk.every((c) => Math.abs(c.box.w - tk[0].box.w) <= 0.5),
    `«남은 횟수» 는 여전히 shrink-to-fit 이다 — 폭 ${tk[0].box.w} (383 은 폭을 안 줬다)`);

  await sub(p, 'raid');
  const rd = (await snap(p, '.sp.lv')).filter((c) => c.rd);
  ok(rd.length >= 1, `레이드 카드 ${rd.length}장이 표본에 있다`);
  for (const c of rd) near(`레이드${c.n} 값 상자 좌변`, c.box && c.box.x, R.rdX, 0.5);
  ok(rd.every((c) => c.box.w < 100),
    `레이드 값은 여전히 shrink-to-fit 이다 — 폭 ${rd.map((c) => c.box.w).join('/')} (151 이 안 붙었다 = \`:not(.rd)\` 가 살아 있다)`);

  await sub(p, 'tower');
  const tw = await snap(p, '.sp.lv');
  ok(tw.length >= 1, `탑 카드 ${tw.length}장이 표본에 있다`);
  for (const c of tw) near(`탑${c.n} 값 상자 중심`, c.box && c.box.cx, R.cx, 0.5);
  await sub(p, 'dun');

  console.log('\n[§6 콘솔]');
  ok(errs.length === 0, `콘솔 에러 0건 (${errs.length})`);

  /* ── §R 되돌림 시험 ────────────────────────────────────────────────── */
  console.log('\n[§R 되돌림 시험 — 383 이전 CSS 를 사본에 주입하면 §1·§3 이 빨개진다]');
  const p2 = await ctx.newPage();
  p2.on('pageerror', () => {});
  await p2.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p2.waitForTimeout(900);
  await openAdv(p2);
  await p2.addStyleTag({ content: OLD });
  await p2.waitForTimeout(300);
  const o1 = await snap(p2, '.sp.lv');
  ok(o1.some((c) => Math.abs(c.box.cx - R.cx) > 0.5),
    `R-a 옛 CSS 에서 §1 이 빨갛다 — 상자 중심 ${o1[0].box.cx} ≠ ${R.cx}`);
  ok(o1.filter((c) => !c.lkd).some((c) => Math.abs(c.ink.cx - R.ink1) > 2),
    `R-b 옛 CSS 에서 §2 가 빨갛다 — «1» 잉크 중심 ${o1.filter((c) => !c.lkd).map((c) => c.ink.cx).join('/')} ≠ ${R.ink1}`);
  const oLad = [];
  for (const v of ['1', '8', '88', '888']) {
    await setLv(p2, v);
    oLad.push((await snap(p2, '.sp.lv'))[0].box.cx);
  }
  ok(span(oLad) >= 8,
    `R-c 옛 CSS 에서 §3 이 빨갛다 — 자릿수를 올리면 중심이 끌려간다 ${oLad.join(' · ')} (span ${span(oLad)} ≥ 8)`);
  /* ⚠ 되돌림 시험이 «전부 빨갛다» 를 기대하면 안 된다(348 §R 교훈) — 옛 모델도 한 자리에서는
     ref 와 1.7px 차이라 §1 의 ±0.5 를 겨우 넘는다. 그 한 칸이 아니라 **자릿수 축**이 본체다. */
  ok(Math.abs(oLad[0] - R.cx) < 3,
    `R-d 옛 모델도 **한 자리에서는 ref 근처**다(${oLad[0]}) — 그래서 342 가 통과선 안이었고, 한 자리 표본만으로는 결함이 안 보인다`);
  await p2.close();

  console.log('\nVERIFY383 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
