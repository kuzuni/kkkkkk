/* 작업 340 — 41 팝업 내장 재화 바(.pcb) 재화 아이콘 «잉크» 게이트.
 *
 *   node tools/verify340.js
 *
 * 왜 이 자가 필요한가 ─────────────────────────────────────────────────────
 * 72 의 비평가 6명이 13·15·16·17 네 회차에 걸쳐 «헤더 재화 아이콘 −14~21%» 를 지적했는데
 * 게이트(verify125 D3)는 초록이었다. **둘 다 맞았다** — 게이트는 `<i>` 의 레이아웃 박스(57×57)를
 * 재고 있었고, 사람이 보는 것은 박스가 아니라 **아트의 색 잉크**다. `assets/ui/cur-*.svg` 가
 * viewBox 안에서 덜 차기 때문에 박스가 맞아도 잉크는 −14~20% 였다:
 *
 *      코인 노란 원판  ref 57×57 → 49×50 (−14.0% / −12.3%)
 *      젬  시안 몸통  ref 56×57 → 45×51 (−19.6% / −10.5%)
 *      실루엣         ref 64×65 → 57×57 · 54×55
 *
 * A3 는 HUD 에서 이미 같은 것을 겪고 고쳤다(6회차 젬 `scaleX(1.16)` · 9회차 코인 상자 63→65.3,
 * «ref 외곽은 63 이 아니라 64×65»). 그 보정이 `.pcb` 에만 안 걸려 있었다 — 93 이 `.fx-fly`·
 * `.fx-lit` 에서 잡은 «보정을 한 자리에서만 걸어 둔» 결손의 같은 계열이다.
 *
 * ⚠ 측정표 41 §3 의 «bbox(검정 아웃라인 포함) 57×57» 은 실은 노란 원판/시안 몸통이다.
 *   이 게이트는 §1 에서 **ref 를 직접 다시 재서** 그 정오(실루엣 64×65 · 코어 57×57)를 못박는다 —
 *   표가 다시 57 로 되돌려지면 여기서 빨개진다.
 *
 * 자 — 박스가 아니라 **색 마스크 bbox** 를 쓴다(코인=노랑/주황 · 젬=시안). ref 는 JPEG 를
 * 캔버스에 올려 같은 창을 스캔하고, cap 은 «아이콘 껐다 켠 차분» 안에서만 색을 센다
 * (바·알약 배경이 그라데이션이라 색 목록으로는 못 가른다 — 141 ink 프로브와 같은 처방).
 *
 * 되돌림 시험(§R) — LESSONS 334-③. 보정을 걷어내면(.cic 을 다시 57×57 · transform:none)
 * §2 가 빨개지고, 걷어낸 것을 되돌리면 초록이어야 한다. «무르게 푼 수리» 가 아님을 못박는다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('  PASS ' + name + ' — ' + got); }
  else { fail++; console.log('  FAIL ' + name + ' — ' + got); }
};
const near = (name, got, want, tol) =>
  ok(name + ' (ref ' + want + ', Δ≤' + tol + ')', Math.abs(got - want) <= tol,
    got + '  Δ' + (got - want >= 0 ? '+' : '') + (+(got - want).toFixed(1)));

const REF_IMG = 'file://' + path.resolve(__dirname, '../docs/ref/03-던전-팝업.jpg');
const IDX = 'file://' + path.resolve(__dirname, '../index.html');
const REF_Y_OFF = 84;                                   /* ROUTINE [2] — ref y − 84 = 프레임 y */

/* 창(ref 절대좌표) — 아이콘만 들고 알약 숫자는 안 든다 */
const WIN = { gold: { x: 488, y: 99, w: 82, h: 82 }, dia: { x: 789, y: 99, w: 82, h: 82 } };

/* 41 §3 «주요 색» 표본 기준 마스크 */
const MASKS = {
  gold: '(r,g,b) => r > 150 && g > 110 && b < 130 && r - b > 60',
  dia:  '(r,g,b) => b > 130 && b - r > 40 && g > 90',
};

/* ref 실측(§1 에서 확정) — 이 값이 이 게이트의 «자» 다 */
const REF = {
  gold: { sil: [64, 65], col: [57, 57], c: [529.5, 140] },
  dia:  { sil: [64, 65], col: [56, 57], c: [828.5, 140] },
};

const SCAN_SRC = `(A, B, W, H, mask) => {
  const acc = () => ({ lo: 1e9, hi: -1e9, top: 1e9, bot: -1e9, n: 0 });
  const add = (o, x, y) => { o.n++; if (x < o.lo) o.lo = x; if (x > o.hi) o.hi = x; if (y < o.top) o.top = y; if (y > o.bot) o.bot = y; };
  const put = (o) => ({ w: o.hi - o.lo + 1, h: o.bot - o.top + 1, cx: (o.lo + o.hi) / 2, cy: (o.top + o.bot) / 2, px: o.n });
  const sil = acc(), col = acc();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = A[o], g = A[o+1], b = A[o+2];
    const on = B ? (Math.abs(r - B[o]) + Math.abs(g - B[o+1]) + Math.abs(b - B[o+2])) >= 18
                 : !((Math.abs(r-66)<=14 && Math.abs(g-54)<=14 && Math.abs(b-42)<=14)
                  || (Math.abs(r-58)<=14 && Math.abs(g-46)<=14 && Math.abs(b-34)<=14)
                  || (Math.abs(r-35)<=14 && Math.abs(g-26)<=14 && Math.abs(b-19)<=14)
                  || (Math.abs(r-29)<=14 && Math.abs(g-22)<=14 && Math.abs(b-14)<=14));
    if (!on) continue;
    add(sil, x, y);
    if (mask(r, g, b)) add(col, x, y);
  }
  return { sil: sil.n > 20 ? put(sil) : null, col: col.n > 20 ? put(col) : null };
}`;

/* cap 한 자리를 «껐다 켠 차분» 으로 잰다 */
async function capInk(page, kind, sel) {
  const w = WIN[kind];
  /* ⚠ 골드는 방치 수입으로 **매 초 오른다** — 숫자가 바뀌면 두 장의 차분이 창 오른쪽까지
     번지고(58 알약 펄스까지 얹히면 잉크가 20px 넘게 부푼다) «아이콘 잉크» 가 아닌 것을 센다.
     그래서 재는 동안만 숫자와 펄스를 죽인다(캡처 상태 위생 — LESSONS 30-②). */
  await page.evaluate(() => {
    if (document.getElementById('v340-freeze')) return;
    const s = document.createElement('style'); s.id = 'v340-freeze';
    s.textContent = '.pcb-p>b{visibility:hidden!important}.pcb-p,.pcb-p>i,.pcb-p>i>.cic{animation:none!important;transition:none!important}';
    document.head.appendChild(s);
  });
  await page.waitForTimeout(120);
  const clip = { x: w.x, y: w.y - REF_Y_OFF, width: w.w, height: w.h };
  const on = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
  await page.waitForTimeout(120);
  const off = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
  await page.waitForTimeout(60);
  const r = await page.evaluate(async ({ on, off, MASK, SCAN_SRC }) => {
    const load = async (s) => { const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + s; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height }; };
    const A = await load(on), B = await load(off);
    return eval('(' + SCAN_SRC + ')')(A.d, B.d, A.W, A.H, eval('(' + MASK + ')'));
  }, { on, off, MASK: MASKS[kind], SCAN_SRC });
  /* 스캔 y + 창 y = ref 좌표계(clip.y 가 이미 −84 다) */
  const off2 = (o) => o && { w: o.w, h: o.h, cx: +(o.cx + w.x).toFixed(1), cy: +(o.cy + w.y).toFixed(1) };
  return { sil: off2(r.sil), col: off2(r.col) };
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  try {
    await page.goto(IDX);
    await page.waitForTimeout(900);
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(1700);            /* 60 쥬시 pop-in 이 끝나야 기하가 확정된다 */
    await page.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
    await page.waitForTimeout(250);

    /* ── [1] ref 를 직접 다시 잰다 (측정표 §3 정오의 근거) ── */
    console.log('\n[1] 레퍼런스 실측 — 측정표 41 §3 의 «57×57» 은 실루엣이 아니라 색 잉크다');
    const ref = await page.evaluate(async ({ src, WIN, MASKS, SCAN_SRC }) => {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const scan = eval('(' + SCAN_SRC + ')');
      const out = {};
      for (const k of ['gold', 'dia']) {
        const w = WIN[k];
        const d = g.getImageData(w.x, w.y, w.w, w.h).data;
        const r = scan(d, null, w.w, w.h, eval('(' + MASKS[k] + ')'));
        const off = (o) => o && { w: o.w, h: o.h, cx: +(o.cx + w.x).toFixed(1), cy: +(o.cy + w.y).toFixed(1) };
        out[k] = { sil: off(r.sil), col: off(r.col) };
      }
      return out;
    }, { src: REF_IMG, WIN, MASKS, SCAN_SRC });
    for (const k of ['gold', 'dia']) {
      near('[1] ' + k + ' ref 실루엣 w', ref[k].sil.w, REF[k].sil[0], 2);
      near('[1] ' + k + ' ref 실루엣 h', ref[k].sil.h, REF[k].sil[1], 2);
      near('[1] ' + k + ' ref 색 잉크 w', ref[k].col.w, REF[k].col[0], 2);
      near('[1] ' + k + ' ref 색 잉크 h', ref[k].col.h, REF[k].col[1], 2);
    }
    ok('[1] ref 실루엣이 색 잉크보다 7~9px 크다 (아웃라인 몫 — 57 은 실루엣일 수 없다)',
      ['gold', 'dia'].every(k => ref[k].sil.w - ref[k].col.w >= 5 && ref[k].sil.h - ref[k].col.h >= 5),
      ['gold', 'dia'].map(k => k + ' Δw' + (ref[k].sil.w - ref[k].col.w) + ' Δh' + (ref[k].sil.h - ref[k].col.h)).join(' · '));

    /* ── [2] 우리 잉크가 ref 에 붙는다 ── */
    console.log('\n[2] 03 던전 재화 바 — 색 잉크가 ref 에 붙었나 (72 비평가 6명이 −14~21% 로 지적한 자리)');
    const cap = { gold: await capInk(page, 'gold', '#dunw .pcb-g>i'), dia: await capInk(page, 'dia', '#dunw .pcb-d>i') };
    /* ★ 671 이관(2026-09-01) — **«자산이 고쳐지면 여기 값을 0 으로 되돌린다» 던 그 회차가 왔다.**
       356 이 `scaleX(1.16)` 을 폐기한 뒤 젬 폭은 자연값 **−12.5%** 였고, 이 자는 그 값을
       기대값으로 박아 두고 «자산 몫» 이라고 적었다. 671 이 그 자산을 고쳤다 —
       뿌리는 «테가 얇다» 가 아니라 **색÷실루엣이 등방이 아니었던 것**이다(`probe671` [B]
       가로 .848 · 세로 .973 = 1.147배). 테 규격을 .875 등방으로 다시 그리고 상자를 코인과 같은
       65.3 으로 모으자 젬 폭이 코인과 **같은 −1.8%** 로 붙었다.
       ⇒ 기대값을 코인과 **같은 술어**(ref ±3 · 오차 ≤6%)로 되돌린다. 이 항은 여전히 음성항이다:
         누가 `scaleX(1.16)` 을 되살리거나 아트의 테를 다시 비등방으로 만들면 즉시 빨개진다
         (그 되돌림은 §R 이 실제로 굴려서 못박는다. 옛 상수 DIA_356/−12.5% 는 이제 §R 이 주입한
         «보정 없는 상자 57» 의 값이라 상수로 둘 자리가 없다 — §R 이 문턱으로 직접 적는다). */
    for (const k of ['gold', 'dia']) {
      const dw = (cap[k].col.w - REF[k].col[0]) / REF[k].col[0] * 100;
      {
        near('[2] ' + k + ' 색 잉크 w', cap[k].col.w, REF[k].col[0], 3);
        ok('[2] ' + k + ' 색 잉크 폭 오차 ≤6% (지적된 −14~21% 가 회수됐다)', Math.abs(dw) <= 6,
          dw.toFixed(1) + '%');
      }
      near('[2] ' + k + ' 색 잉크 h', cap[k].col.h, REF[k].col[1], 3);
      near('[2] ' + k + ' 잉크 중심 x', +cap[k].col.cx, REF[k].c[0], 2.5);
      near('[2] ' + k + ' 잉크 중심 y', +cap[k].col.cy, REF[k].c[1], 2.5);
    }
    /* 실루엣은 «아트의 아웃라인 몫» 이라 코인만 ref 에 붙는다 — 젬은 우리 자산의 위·아래
       아웃라인이 얇아 세로가 5px 모자란다(A3 6회차가 HUD 에서 받아들인 것과 같은 대가).
       그래서 여기서는 «코인 ±3 · 젬은 가로만» 을 단언한다. 몸통이 맞는 것이 목적이다. */
    near('[2] 코인 실루엣 w', cap.gold.sil.w, REF.gold.sil[0], 3);
    near('[2] 코인 실루엣 h', cap.gold.sil.h, REF.gold.sil[1], 3);
    /* 젬 실루엣은 «몸통을 맞춘 대가» 로 ref +5px(+7.8%) 다 — 우리 자산의 검정 아웃라인이
       가로로 두껍고 세로로 얇은데 scaleX 는 그 아웃라인까지 늘리기 때문이다(A3 6회차가 HUD 에서
       받아들인 것과 같은 대가). 몸통(위 단언)이 목적이고 이 줄은 «보정이 달아나지 않는지» 를 본다 —
       누가 scaleX 를 1.3 쯤으로 올리면 여기서 빨개진다. 자산이 고쳐지면 둘 다 ref 로 붙는다. */
    /* ⚑ 671 이관 — 이 두 줄은 «자산 몫» 이라 느슨했던 자리다(w ±6 · h 는 기록만).
       671 이 테를 다시 그려 실루엣도 ref 에 붙었으므로(w 59→65 · h 60→66) **코인과 같은 ±3** 으로 조인다.
       느슨한 채로 두면 아트가 다시 작아져도 초록이라 이번 회차의 회수분을 못 지킨다. */
    near('[2] 젬 실루엣 w', cap.dia.sil.w, REF.dia.sil[0], 3);
    near('[2] 젬 실루엣 h', cap.dia.sil.h, REF.dia.sil[1], 3);

    /* ── [3] 기전 — 상자는 그대로, 움직인 것은 이미지뿐 ── */
    console.log('\n[3] 기전 — 알약·그릇을 건드리지 않았다(235 의 186.5 그릇 불변)');
    const mech = await page.evaluate(() => {
      const o = {};
      for (const [k, sel] of [['gold', '#dunw .pcb-g'], ['dia', '#dunw .pcb-d']]) {
        const pill = document.querySelector(sel), i = pill.querySelector('i'), im = pill.querySelector('img.cic'), b = pill.querySelector('b');
        const R = (e) => { const r = e.getBoundingClientRect(); return [+r.width.toFixed(1), +r.height.toFixed(1)]; };
        const ps = getComputedStyle(pill);
        o[k] = { pill: R(pill), i: R(i), img: R(im), itf: getComputedStyle(im).transform,
                 boxtf: getComputedStyle(i).transform, has: !!b,
                 pad: [parseFloat(ps.paddingLeft), parseFloat(ps.paddingRight)] };
      }
      return o;
    });
    for (const k of ['gold', 'dia']) {
      ok('[3] ' + k + ' 알약 254×49 그대로', Math.abs(mech[k].pill[0] - 254) <= 1 && Math.abs(mech[k].pill[1] - 49) <= 1, mech[k].pill.join('×'));
      ok('[3] ' + k + ' 아이콘 상자 57×57 그대로 (박스는 41 측정표 값이다)',
        Math.abs(mech[k].i[0] - 57) <= 1 && Math.abs(mech[k].i[1] - 57) <= 1, mech[k].i.join('×'));
      ok('[3] ' + k + ' 상자에는 transform 이 없다 (125 교훈 4 — 보정은 이미지에 건다)',
        mech[k].boxtf === 'none' || mech[k].boxtf === 'matrix(1, 0, 0, 1, 0, 0)', mech[k].boxtf);
    }
    /* 356 이관 — 젬 쪽 손잡이가 사라졌다. «기전이 같다» 는 뜻도 같이 바뀐다:
       코인은 상자 키우기(그대로) · 젬은 **override 없음**(63×63 · transform none). */
    const noTf = (t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
    /* ⚑ 671(2026-09-01) — 젬 상자 59.06 → **65.3 = 코인과 같은 값**.
       644 는 «아트가 비등방인 채로» 잉크를 Δ0 으로 보존하느라 두 재화의 상자를 다르게 뒀고(비 1.106),
       671 이 아트를 .875 등방으로 다시 그려 **같은 상자가 같은 잉크를 내게** 만들었다.
       ⇒ 이 이관의 **음성항은 바로 위 [2]** 다 — 색 잉크(ref ±3)·실루엣(ref ±3)이 초록인 한
       여기서 두 숫자를 한 값으로 모은 것은 무르게 푼 것이 아니다. 이제 한 술어가 둘을 같이 잰다. */
    ok('[3] 코인·젬 모두 상자 65.3×65.3 (671 — 같은 아트 규격 · 같은 상자 · 같은 잉크) — HUD(A3)와 같은 기전',
      Math.abs(mech.gold.img[0] - 65.3) <= 1 && Math.abs(mech.gold.img[1] - 65.3) <= 1
      && Math.abs(mech.dia.img[0] - 65.3) <= 1 && Math.abs(mech.dia.img[1] - 65.3) <= 1
      && Math.abs(mech.gold.img[0] - mech.dia.img[0]) <= 0.5
      && noTf(mech.gold.itf) && noTf(mech.dia.itf),
      'gold ' + mech.gold.img.join('×') + ' tf ' + mech.gold.itf + ' · dia ' + mech.dia.img.join('×') + ' tf ' + mech.dia.itf);
    /* 235 가 «알약 콘텐츠 폭 186.5 = 254 − padding 53/14.5» 를 고정해 두었다. 아이콘은 절대배치라
       그 그릇을 밀 수 없어야 한다 — 패딩 두 값이 그대로면 그릇도 그대로다(235 가 폭 자체를 잰다). */
    ok('[3] 알약 패딩 53/14.5 불변 → 숫자 그릇 186.5 불변 (235)',
      ['gold', 'dia'].every(k => Math.abs(mech[k].pad[0] - 53) <= 0.5 && Math.abs(mech[k].pad[1] - 14.5) <= 0.5 && mech[k].has),
      ['gold', 'dia'].map(k => k + ' ' + mech[k].pad.join('/')).join(' · '));

    /* ── [4] 같은 컴포넌트를 쓰는 다른 두 자리도 같이 움직였나 (81 «두 바 Δ0» 규약) ── */
    console.log('\n[4] 10 상점 · 89 유물 — 같은 .pcb 컴포넌트라 같은 값이어야 한다');
    const other = await page.evaluate(() => {
      const out = {};
      for (const [nm, open] of [['shop', () => { const t = document.querySelector('#tabbar [data-t="shop"]'); t && t.click(); }],
                                ['relic', () => { openRelw(); }]]) {
        try { open(); } catch (e) {}
        const root = nm === 'shop' ? '#shopw' : '#relw';
        const g = document.querySelector(root + ' .pcb-g img.cic'), d = document.querySelector(root + ' .pcb-d img.cic');
        out[nm] = { g: g ? [+g.getBoundingClientRect().width.toFixed(1), +g.getBoundingClientRect().height.toFixed(1)] : null,
                    d: d ? [+d.getBoundingClientRect().width.toFixed(1), +d.getBoundingClientRect().height.toFixed(1)] : null };
      }
      return out;
    });
    for (const nm of ['shop', 'relic']) {
      const o = other[nm];
      ok('[4] ' + nm + ' 코인 65.3×65.3', !!o.g && Math.abs(o.g[0] - 65.3) <= 1 && Math.abs(o.g[1] - 65.3) <= 1, JSON.stringify(o.g));
      ok('[4] ' + nm + ' 젬 65.3×65.3 (671 이관 — 코인과 한 값으로 모았다 · 비 1.106 → 1.000)',
        !!o.d && Math.abs(o.d[0] - 65.3) <= 1 && Math.abs(o.d[1] - 65.3) <= 1
        && !!o.g && Math.abs(o.d[0] - o.g[0]) <= 0.5, JSON.stringify(o.d));
    }

    /* ── [R] 되돌림 시험 — 보정을 걷어내면 §2 가 다시 빨개진다 ── */
    console.log('\n[R] 되돌림 시험 — 보정을 걷어내면 지적이 되살아나나');
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(900);
    await page.addStyleTag({ content: '#dunw .pcb-p>i>.cic{width:57px!important;height:57px!important;transform:none!important}' });
    await page.waitForTimeout(200);
    const bad = { gold: await capInk(page, 'gold', '#dunw .pcb-g>i'), dia: await capInk(page, 'dia', '#dunw .pcb-d>i') };
    ok('R-1 보정을 걷어내면 코인 노란 원판이 −10% 아래로 떨어진다',
      (bad.gold.col.w - REF.gold.col[0]) / REF.gold.col[0] * 100 < -10,
      bad.gold.col.w + ' vs ref ' + REF.gold.col[0] + ' ('
        + ((bad.gold.col.w - REF.gold.col[0]) / REF.gold.col[0] * 100).toFixed(1) + '%)');
    /* 671 이관 — 상자를 57 로 되돌리면 젬도 코인과 **같은 기전으로** 떨어진다(57 × .875 = 49.9).
       옛 문턱 −15 는 «비등방 아트 + 59.06 상자» 시절의 값이라 이제 −12.5% 를 못 잡는다 ⇒ −8 로 조인다.
       (문턱을 느슨하게 푼 것이 아니다 — 회수분 −1.8% 와 자연값 −12.5% 사이는 여전히 10%p 다) */
    ok('R-2 보정을 걷어내면 젬 시안 몸통이 −8% 아래로 떨어진다',
      (bad.dia.col.w - REF.dia.col[0]) / REF.dia.col[0] * 100 < -8,
      bad.dia.col.w + ' vs ref ' + REF.dia.col[0] + ' ('
        + ((bad.dia.col.w - REF.dia.col[0]) / REF.dia.col[0] * 100).toFixed(1) + '%)');
    await page.evaluate(() => { const s = document.querySelectorAll('style'); s[s.length - 1].remove(); });
    await page.waitForTimeout(200);
    const back = { gold: await capInk(page, 'gold', '#dunw .pcb-g>i'), dia: await capInk(page, 'dia', '#dunw .pcb-d>i') };
    /* 671 이관 — 젬도 이제 **ref 로** 돌아온다(356 이 남긴 −12.5% 는 §R 이 주입한 상태의 값이 됐다) */
    ok('R-3 주입을 걷어내면 다시 초록 (술어를 무르게 푼 것이 아니다)',
      Math.abs(back.gold.col.w - REF.gold.col[0]) <= 3
      && Math.abs(back.dia.col.w - REF.dia.col[0]) <= 3,
      'gold ' + back.gold.col.w + ' · dia ' + back.dia.col.w);

    console.log('\n[5] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0] : ''));
  } finally { await browser.close(); }

  console.log('\nVERIFY340 ' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
