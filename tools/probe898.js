#!/usr/bin/env node
/* 재현기 898 — 「`verify583` [C-train]·[C-rune]·[C-big] 3건 실패 — 버스트 아이콘 폭이 660 산식의 «절반»」
 *
 *   node tools/probe898.js
 *
 * 등재문의 갈래 둘을 **재현으로** 가른다(338 규칙 — 처방 전에 재현):
 *   ⓐ 제품이 작아진 것 (660·666 이후 `FX_CIC_SC` 를 읽는 경로가 갈라졌나)
 *   ⓑ 자의 산식이 낡은 것 (683·753·838 이 알 크기를 바꾼 뒤 [C] 만 옛 구간에 굳었나)
 *
 * 무엇을 재는가 — `verify583` [C] 는 «안쪽 아이콘 폭» 을 660 산식
 *   `구슬(24~34) × FX_CIC_SC × 잉크보정(--fxgs)` 에 댄다. 그 산식이 **제품의 크기 사슬 전부**인지를
 *   묻는 것이 이 재현기다. 사슬은 `fxBurst`(index.html) 안에 이렇게 적혀 있다:
 *
 *     hsc  = clamp(√(r.w·r.h)/410, 1, FXB_DMAX/FXB_SZMAX)            ← 619 6·12회차
 *     szs  = 호스트 신고 `--burst-sz`(없으면 1)                        ← 814 5회차
 *     fits = 호스트 신고 `--burst-fit`(없으면 FXB_FITS)                ← 838 6회차
 *     fitK = min(1, max(FXB_SZMIN, fits·min(r.w,r.h))
 *                   / (FXB_SZMAX · hsc · szs · (아이콘이면 FX_CIC_SC)))  ← 838 2·3회차
 *     sz   = round(round(rnd(24,34)·hsc·szs) · FX_CIC_SC) · fitK  (하한 FXB_SZMIN)
 *     안쪽 아이콘 = sz × `--fxgs`(543 재화별 잉크 보정)
 *
 *   ⇒ 660 산식에는 **`hsc`·`szs`·`fitK` 세 축이 통째로 빠져 있다.** 그 셋이 1 이 아니면
 *     자는 «제품이 절반» 이라고 읽는다. 이 재현기는 세 자리에서
 *       ① 살아 있는 축 값(제품에게 직접 묻는다)
 *       ② 실제로 렌더된 알의 바깥/안쪽 폭
 *       ③ 660 산식이 기대하는 구간 · 사슬 전부가 기대하는 구간
 *     를 나란히 찍어 어느 쪽이 실측과 맞는지를 **수치로** 가른다.
 *
 * ⚑ 덤으로 «주인 지시가 아직 살아 있는가» 도 잰다 — 583 «알갱이 크기 더 크게» 의 살아 있는 몸은
 *   `FX_CIC_SC`(아이콘 알은 구슬보다 크다)다. 838 의 `fitK` 는 **아이콘 갈래에서만 분모에
 *   `FX_CIC_SC` 를 곱하므로** 가둠이 무는 자리에서는 그 배수가 산술적으로 **상쇄**된다.
 *   그래서 자리마다 «아이콘 알 ↔ 같은 자리의 구슬 알» 을 같이 계산해 찍는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const n1 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(1);
const n3 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(3);

const SITES = [
  { k:'train',  n:'23 훈련 카드', sub:'train',  cur:'gold',
    host:'#trCards [data-tr="atk"]', btn:'#trCards [data-tr="atk"] .cb' },
  { k:'rune',   n:'룬 [강화]',    sub:'rune',   cur:'rstone',
    host:'#trRunes .tr-rn',        btn:'#trRunes .tr-rn .rbt.b1' },
  { k:'temper', n:'단련 [투자]',  sub:'temper', cur:'tstone',
    host:'#trTemper .tr-tp',       btn:'#trTemper .tr-tp .tb' }
];

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
  await p.waitForTimeout(1200);
  await p.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; openTrain(); });
  await p.waitForTimeout(400);

  const K = await p.evaluate(() => ({
    CIC: FX_CIC_SC, FITS: FXB_FITS, SZMIN: FXB_SZMIN, SZMAX: FXB_SZMAX, DMAX: FXB_DMAX,
    gs: { gold: fxGrainSc('gold'), rstone: fxGrainSc('rstone'), tstone: fxGrainSc('tstone') }
  }));
  console.log('\n[K] 살아 있는 상수 — FX_CIC_SC ' + n3(K.CIC) + ' · FXB_FITS ' + n3(K.FITS)
    + ' · FXB_SZMIN ' + K.SZMIN + ' · FXB_SZMAX ' + K.SZMAX + ' · FXB_DMAX ' + K.DMAX
    + ' · 잉크보정 gold ' + n3(K.gs.gold) + ' / rstone ' + n3(K.gs.rstone) + ' / tstone ' + n3(K.gs.tstone));

  const R = {};
  for (const s of SITES) {
    await p.evaluate(s => { setTrSub(s.sub); renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; }, s);
    await p.waitForTimeout(250);

    /* ① 살아 있는 축 — 제품이 실제로 읽는 값들을 그 자리에서 다시 읽는다(상수를 손으로 안 적는다) */
    const ax = await p.evaluate(s => {
      const t = document.querySelector(s.btn); if (!t) return null;
      /* ⚠ **`getBoundingClientRect` 로 재면 안 된다** — 제품의 `fitK` 는 `fxRect()`(프레임 좌표 ·
         `fxSc()` 배율로 나눈 값)를 쓴다. 이 화면비에서 배율이 1 이 아니라(≈0.978) 두 자가 갈리고,
         그 차가 그대로 «알 1px» 로 나온다(1회차에 실측 25 vs 예측 24 로 어긋난 자리다). */
      const q = fxRect(t);
      const st = getComputedStyle(t);
      const num = (k, d) => { const v = parseFloat(st.getPropertyValue(k)); return (v > 0 && v <= 1) ? v : d; };
      return { w: q.w, h: q.h, sc: fxSc() ? fxSc().s : null,
               szs: num('--burst-sz', 1),
               fits: (() => { const v = parseFloat(st.getPropertyValue('--burst-fit'));
                              return (v > 0 && v <= FXB_FITS) ? v : FXB_FITS; })(),
               from: (st.getPropertyValue('--burst-from') || '').trim() };
    }, s);
    if (!ax) { ok(false, '[P0-' + s.k + '] 버튼을 찾았다', s.btn); continue; }

    const hsc = Math.min(Math.max(Math.sqrt(ax.w * ax.h) / 410, 1), K.DMAX / K.SZMAX);
    const cap = Math.max(K.SZMIN, ax.fits * Math.min(ax.w, ax.h));
    const fitIC = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * ax.szs * K.CIC));
    const fitPl = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * ax.szs));
    const gs = K.gs[s.cur];

    /* 사슬 전부가 기대하는 안쪽 아이콘 폭 구간(반올림 두 번은 ±1px 로 흡수) */
    const chainLo = Math.max(K.SZMIN, Math.round(Math.round(24 * hsc * ax.szs) * K.CIC) * fitIC) * gs;
    const chainHi = Math.max(K.SZMIN, Math.round(Math.round(34 * hsc * ax.szs) * K.CIC) * fitIC) * gs;
    /* 660 산식(자가 지금 쓰는 것) — hsc·szs·fitK 가 통째로 빠져 있다 */
    const gateLo = 24 * K.CIC * gs, gateHi = 34 * K.CIC * gs;
    /* 같은 자리의 «구슬»(비아이콘) 알 — 583 «더 크게» 가 살아 있는지의 잣대 */
    const plainHi = Math.max(K.SZMIN, Math.round(34 * hsc * ax.szs) * fitPl);
    const icHi = Math.max(K.SZMIN, Math.round(Math.round(34 * hsc * ax.szs) * K.CIC) * fitIC);

    /* ② 실측 — 홀드해서 태어나는 알의 바깥/안쪽 폭을 모은다 */
    const bb = await (await p.$(s.btn)).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.mouse.down();
    /* ⚠ 재는 자를 둘로 갈랐다 — **`getBoundingClientRect` 는 `@keyframes fxSpark` 의 위상을 탄다**
       (알이 태어나 커졌다 사그라든다). 그 자로 «최대» 를 잡으면 값이 표본 위상 운에 흔들려
       ±2% 문턱에서 플레이키가 된다(344 계열). ⇒ 크기 계약은 **레이아웃 폭**(`offsetWidth` ·
       변환을 안 탄다)으로 재고, «찍힌 픽셀» 은 rect 로 따로 찍는다. */
    const got = await p.evaluate(() => new Promise(res => {
      const out = []; const t0 = performance.now();
      const iv = setInterval(() => {
        for (const n of document.querySelectorAll('#fxl .fx-cic')) {
          const r = n.getBoundingClientRect();
          const im = n.querySelector('img.cic'); const ir = im ? im.getBoundingClientRect() : r;
          const gsv = parseFloat(getComputedStyle(n).getPropertyValue('--fxgs')) || 1;
          out.push({ o: r.width, i: ir.width,
                     on: n.offsetWidth, inn: (im ? im.offsetWidth : n.offsetWidth) * gsv });
        }
        if (performance.now() - t0 > 720) { clearInterval(iv); res(out); }
      }, 40);
    }));
    await p.mouse.up();
    await p.waitForTimeout(350);

    const oMax = Math.max(...got.map(x => x.on), 0), iMax = Math.max(...got.map(x => x.inn), 0);
    const oMin = Math.min(...got.map(x => x.on), 1e9), iMin = Math.min(...got.map(x => x.inn), 1e9);
    const rMax = Math.max(...got.map(x => x.i), 0);
    R[s.k] = { ax, hsc, cap, fitIC, fitPl, gs, chainLo, chainHi, gateLo, gateHi, plainHi, icHi, oMax, oMin, iMax, iMin, n: got.length };

    console.log('\n── ' + s.n + ' (' + s.k + ') ──────────────────────────────');
    console.log('  버튼 ' + n1(ax.w) + '×' + n1(ax.h) + ' · --burst-from «' + ax.from + '» · --burst-sz ' + n3(ax.szs)
      + ' · --burst-fit ' + n3(ax.fits));
    console.log('  hsc ' + n3(hsc) + ' · 허용 상한(cap = max(SZMIN, fits·짧은변)) ' + n1(cap)
      + ' · fitK(아이콘) ' + n3(fitIC) + ' · fitK(구슬) ' + n3(fitPl));
    console.log('  실측 안쪽 아이콘 폭  ' + n1(iMin) + ' ~ ' + n1(iMax) + '  (바깥 상자 ' + n1(oMin) + ' ~ ' + n1(oMax) + ' · 표본 ' + got.length + ')');
    console.log('  ↑ 레이아웃 자(offsetWidth · 변환 무관) · 위상 타는 rect 자로는 안쪽 최대 ' + n1(rMax));
    console.log('  660 산식(자)        ' + n1(gateLo) + ' ~ ' + n1(gateHi) + '   ← hsc·szs·fitK 빠짐');
    console.log('  사슬 전부           ' + n1(chainLo) + ' ~ ' + n1(chainHi));

    ok(got.length > 0, '[P1-' + s.k + '] 알이 실제로 태어난다(표본 > 0)', got.length + '개');
    /* ⓐ 판정 — 실측이 «사슬 전부» 안이면 제품은 자기 계약대로 그린 것이다 */
    ok(iMax >= chainLo * 0.94 && iMax <= chainHi * 1.06,
       '[P2-' + s.k + '] ★ 실측이 **제품 사슬 전부**(hsc·szs·fitK 포함)와 맞는다 = 제품은 안 작아졌다(갈래 ⓐ 기각)',
       '실측 최대 ' + n1(iMax) + ' vs 사슬 ' + n1(chainLo) + '~' + n1(chainHi));
    /* ⓑ 판정 — **구간 자체**가 어긋나면 자의 산식이 낡은 것이다.
       ⚠ «실측이 660 구간 밖인가» 로 물으면 안 된다 — 단련은 두 구간이 겹쳐 **우연히 안**에 든다
         (아래 [P3b] 가 그 헛초록을 따로 못박는다). 낡음의 증거는 한 표본이 아니라 **구간의 어긋남**이다. */
    ok(Math.abs(gateHi - chainHi) > chainHi * 0.02 || Math.abs(gateLo - chainLo) > chainLo * 0.02,
       '[P3-' + s.k + '] ★ 660 산식 구간이 **사슬 구간과 어긋난다** = 자의 산식이 낡았다(갈래 ⓑ 확인)',
       '660 ' + n1(gateLo) + '~' + n1(gateHi) + ' vs 사슬 ' + n1(chainLo) + '~' + n1(chainHi)
       + ' · 위끝 차 ' + n1((gateHi / chainHi - 1) * 100) + '%');
    /* 헛초록 표시 — 실측이 낡은 구간 «안» 에 우연히 드는 자리(= 지금 초록인 [C-temper])를 이름으로 적는다 */
    if (iMax >= gateLo * 0.98 && iMax <= gateHi * 1.02)
      console.log('  ⚠ [P3b-' + s.k + '] **헛초록** — 실측 ' + n1(iMax) + ' 가 낡은 660 구간('
        + n1(gateLo) + '~' + n1(gateHi) + ') 안에 **우연히** 든다. 이 자리는 자가 옳아서 초록인 게 아니다.');
    /* 알은 «버튼이 허용하는 만큼» 에 실제로 닿는가 — 660 «버튼이 허용하는 만큼 키운다» 의 살아 있는 몸 */
    ok(oMax >= cap * 0.94 && oMax <= cap * 1.06,
       '[P4-' + s.k + '] 알 바깥 상자가 «버튼이 허용하는 최대»(cap)에 닿는다 — 여유를 남기고 작아진 게 아니다',
       '바깥 최대 ' + n1(oMax) + ' vs cap ' + n1(cap));
    console.log('  · 583 «더 크게» 축 — 아이콘 알 상한 ' + n1(icHi) + ' vs 같은 자리 구슬 상한 ' + n1(plainHi)
      + '  ⇒ ' + (icHi > plainHi + 0.5 ? '아이콘이 더 크다' : '**상쇄**(가둠이 물어 같아진다)'));
  }

  /* ── [P5] 583 «알갱이 크기 더 크게» 가 어디서 살아 있는가 ─────────────────── */
  console.log('\n[P5] 583 «더 크게» 의 살아 있는 몸 — `FX_CIC_SC` 가 실제로 알을 키우는 자리');
  const bigger = SITES.filter(s => R[s.k] && R[s.k].icHi > R[s.k].plainHi + 0.5).map(s => s.k);
  const eq = SITES.filter(s => R[s.k] && !(R[s.k].icHi > R[s.k].plainHi + 0.5)).map(s => s.k);
  ok(bigger.length > 0,
     '[P5] ★ 가둠(838 fitK)이 안 무는 자리가 **적어도 하나** 남아 있다 — 거기서 `FX_CIC_SC` 가 실제로 알을 키운다',
     '더 크다: ' + (bigger.join('·') || '없음') + ' · 상쇄: ' + (eq.join('·') || '없음'));
  console.log('  ⚑ 상쇄의 산수: `fitK` 는 아이콘 갈래에서만 분모에 `FX_CIC_SC` 를 곱한다 ⇒ 가둠이 무는(fitK<1)');
  console.log('     자리에서는 두 갈래가 **같은 cap** 에 눌려 배수가 사라진다. 이것은 660 이 적어 둔');
  console.log('     «버튼이 허용하는 만큼 키우는 것» 의 산술적 귀결이지 회귀가 아니다.');

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.length + '건');
  await b.close();
  console.log('\nPROBE898 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
