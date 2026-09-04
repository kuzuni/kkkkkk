#!/usr/bin/env node
/* 재현기 900 — 「583 «알갱이 크기 더 크게» 가 세 자리 중 둘에서 산술적으로 상쇄된다」
 *
 *   node tools/probe900.js
 *
 * 898 이 **상자**(`sz`) 축에서 상쇄를 실측해 이 행으로 넘겼다. 이 재현기는 그 물음을
 * **사람이 보는 축 = 찍히는 잉크**(`sz × --fxgs`)로 다시 묻는다. 두 축이 갈리는 이유는 하나다 —
 * 660 이 «구슬 대신 아이콘» 을 넣으면서 543 의 잉크 등가 보정(`--fxgs`)을 같이 걸었는데,
 * 그 보정은 **상자 안에서** transform 으로 걸리므로 `fxBurst` 의 산수(가둠 `sz/2 + FXB_INPAD` ·
 * keep-out · 융합 `FXB_SEP` · 가둠 배수 `fitK`)는 **한 곳도 그 값을 안 읽는다.**
 *
 * ⚑ 그 갈림은 이 저장소가 이미 한 번 판정한 자리다 — 838 5회차가 **발원** 반경에서
 *   «상자가 아니라 **그린 원반**»(훈련 코인 상자 71 ↔ 그림 52 · 비 0.73)으로 축을 갈아 끼웠다.
 *   같은 원칙을 **알 자신**에는 아직 아무도 안 댔다.
 *
 * 무엇을 묻는가 (전부 «처방 전 재현» — 338 규칙):
 *   [P1] 상자 ↔ 찍히는 잉크가 자리마다 얼마나 갈리는가(`--fxgs` 그대로)
 *   [P2] 838 이 정한 «버튼이 허용하는 만큼»(cap)을 **잉크** 축에서도 지키는가
 *   [P3] 619 13·14회차의 약속 «잉크가 액자 안에서 끝난다» 를 **잉크** 축에서도 지키는가(버튼 밖 스필)
 *   [P4] 583 «아이콘 알은 구슬보다 크다» 가 **잉크** 축에서 살아 있는가 — 상쇄인가 **역전**인가
 *   [P5] 가둠이 무는 자리에서 583 이 산술적으로 가능한가(불가능하면 그것이 이 행의 답이다)
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
    btn:'#trCards [data-tr="atk"] .cb' },
  { k:'rune',   n:'룬 [강화]',    sub:'rune',   cur:'rstone',
    btn:'#trRunes .tr-rn .rbt.b1' },
  { k:'temper', n:'단련 [투자]',  sub:'temper', cur:'tstone',
    btn:'#trTemper .tr-tp .tb' }
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
    CIC: FX_CIC_SC, FITS: FXB_FITS, SZMIN: FXB_SZMIN, SZMAX: FXB_SZMAX, DMAX: FXB_DMAX, INPAD: FXB_INPAD,
    gs: { gold: fxGrainSc('gold'), rstone: fxGrainSc('rstone'), tstone: fxGrainSc('tstone') }
  }));
  console.log('\n[K] 살아 있는 상수 — FX_CIC_SC ' + n3(K.CIC) + ' · FXB_FITS ' + n3(K.FITS)
    + ' · FXB_SZMIN ' + K.SZMIN + ' · FXB_SZMAX ' + K.SZMAX + ' · FXB_INPAD ' + K.INPAD
    + ' · 잉크보정 gold ' + n3(K.gs.gold) + ' / rstone ' + n3(K.gs.rstone) + ' / tstone ' + n3(K.gs.tstone));
  console.log('    ⚠ `--fxgs` 는 **상자 안에서** transform 으로 걸린다 — `fxBurst` 의 산수는 이 값을 한 곳도 안 읽는다.');

  const R = {};
  for (const s of SITES) {
    await p.evaluate(s => { setTrSub(s.sub); renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; }, s);
    await p.waitForTimeout(250);

    const ax = await p.evaluate(s => {
      const t = document.querySelector(s.btn); if (!t) return null;
      const q = fxRect(t);                       /* 898 §2-② — 제품의 `fitK` 가 쓰는 그 자 */
      const st = getComputedStyle(t);
      const szs = (() => { const v = parseFloat(st.getPropertyValue('--burst-sz')); return (v > 0 && v <= 1) ? v : 1; })();
      const fits = (() => { const v = parseFloat(st.getPropertyValue('--burst-fit')); return (v > 0 && v <= FXB_FITS) ? v : FXB_FITS; })();
      return { w: q.w, h: q.h, szs, fits };
    }, s);
    if (!ax) { ok(false, '[P0-' + s.k + '] 버튼을 찾았다', s.btn); continue; }

    const hsc = Math.min(Math.max(Math.sqrt(ax.w * ax.h) / 410, 1), K.DMAX / K.SZMAX);
    const cap = Math.max(K.SZMIN, ax.fits * Math.min(ax.w, ax.h));
    const fitIC = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * ax.szs * K.CIC));
    const fitPl = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * ax.szs));
    const gs = K.gs[s.cur];
    /* 같은 자리의 «구슬» 은 상자가 곧 그림이다(radial-gradient 가 상자를 채운다) ⇒ 잉크 = 상자 */
    const plainHi = Math.max(K.SZMIN, Math.round(34 * hsc * ax.szs) * fitPl);

    /* 실측 — 홀드해서 태어나는 알을 모은다.
       ⚠ 크기 계약은 **레이아웃 자**(`offsetWidth`)로 잰다(898 §2-① — rect 는 `@keyframes fxSpark`
         위상을 탄다). 스필만은 «봉우리에 실제로 찍힌 그림» 이 물음이라 rect 로 따로 잰다. */
    const bb = await (await p.$(s.btn)).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.mouse.down();
    const got = await p.evaluate(sel => new Promise(res => {
      const out = []; const t0 = performance.now();
      const btn = document.querySelector(sel);
      const iv = setInterval(() => {
        const br = btn.getBoundingClientRect();      /* 눌린 순간의 상자(621 눌림이 흔든다) */
        const live = [];
        for (const n of document.querySelectorAll('#fxl .fx-cic')) {
          const im = n.querySelector('img.cic'); if (!im) continue;
          const gsv = parseFloat(getComputedStyle(n).getPropertyValue('--fxgs')) || 1;
          const ir = im.getBoundingClientRect();      /* 찍힌 그림(transform 포함) */
          const nr = n.getBoundingClientRect();
          live.push({ cx: nr.left + nr.width / 2, cy: nr.top + nr.height / 2, d: nr.width });
          out.push({
            box: n.offsetWidth, gs: gsv,             /* 레이아웃 축 */
            ink: n.offsetWidth * gsv,                /* 찍히는 잉크(레이아웃 환산) */
            spill: Math.max(0, br.left - ir.left, ir.right - br.right,
                                br.top - ir.top,   ir.bottom - br.bottom)
          });
        }
        /* 838 의 겹침 자 — «최근접 중심거리 ÷ 지름». 같은 순간의 알끼리만 잰다. */
        for (let i = 0; i < live.length; i++) {
          let best = Infinity;
          for (let j = 0; j < live.length; j++) if (i !== j)
            best = Math.min(best, Math.hypot(live[i].cx - live[j].cx, live[i].cy - live[j].cy));
          if (Number.isFinite(best) && live[i].d > 0) out[out.length - live.length + i].sep = best / live[i].d;
        }
        if (performance.now() - t0 > 720) { clearInterval(iv); res(out); }
      }, 40);
    }), s.btn);
    await p.mouse.up();
    await p.waitForTimeout(350);

    const boxMax = Math.max(...got.map(x => x.box), 0);
    const inkMax = Math.max(...got.map(x => x.ink), 0);
    const spillMax = Math.max(...got.map(x => x.spill), 0);
    const spillN = got.filter(x => x.spill > 0.5).length;
    const seps = got.map(x => x.sep).filter(v => Number.isFinite(v));
    const sepMin = seps.length ? Math.min(...seps) : NaN;
    R[s.k] = { ax, hsc, cap, fitIC, fitPl, gs, boxMax, inkMax, plainHi, spillMax, spillN, sepMin, n: got.length };

    console.log('\n── ' + s.n + ' (' + s.k + ') ──────────────────────────────');
    console.log('  버튼(눌린 순간 fxRect) ' + n1(ax.w) + '×' + n1(ax.h) + ' · --burst-fit ' + n3(ax.fits)
      + ' · cap ' + n1(cap) + ' · fitK(아이콘) ' + n3(fitIC) + ' / (구슬) ' + n3(fitPl));
    console.log('  상자 최대 ' + n1(boxMax) + '  ·  찍히는 잉크 최대 ' + n1(inkMax)
      + '  (--fxgs ' + n3(gs) + ' ⇒ 두 축이 ' + n1((gs - 1) * 100) + '% 갈린다)  · 표본 ' + got.length);
    console.log('  같은 자리 «구슬» 잉크 상한 ' + n1(plainHi) + '  (구슬은 상자가 곧 그림이다)');

    ok(got.length > 0, '[P1-' + s.k + '] 알이 실제로 태어난다(표본 > 0)', got.length + '개');
    /* ⚠ 아래 셋은 «바라는 상태» 가 아니라 **재현된 사실**을 단언한다(재현기의 일이다 — 338 규칙).
       초록 = «등재문이 말한 현상이 지금 이 트리에서 그대로 관측된다» 는 뜻이다. */
    /* [P2] 상자 축과 잉크 축이 실제로 갈리는가 — `fxBurst` 는 `--fxgs` 를 한 곳도 안 읽는다 */
    ok(Math.abs(inkMax - boxMax) > 0.5,
       '[P2-' + s.k + '] ★ 상자 축과 «찍히는 잉크» 축이 실측으로 갈린다(`fxBurst` 산수는 `--fxgs` 를 안 읽는다)',
       '상자 ' + n1(boxMax) + ' ↔ 잉크 ' + n1(inkMax) + ' · 차 ' + n1((inkMax / boxMax - 1) * 100) + '%'
       + (inkMax > cap + 1 ? ' · ⚠ **cap ' + n1(cap) + ' 초과 ' + n1((inkMax / cap - 1) * 100) + '%**' : ''));
    /* [P3] 참고 자 — 봉우리에 찍힌 그림이 눌린 버튼 상자를 벗어나는가.
       ⚠ **판정에는 안 쓴다**: 이 값은 `@keyframes fxSpark` 위상(알이 커졌다 사그라든다)과
         621 눌림(버튼 상자가 홀드 내내 9% 흔들린다 — 898 §2-②) 둘을 같이 탄다. 뜻은 «잉크가
         상자 밖에 있을 수 있다» 는 방향뿐이고, 크기 판정은 위상 없는 레이아웃 자([P2]·[P4])로만 한다. */
    console.log('  · [P3-' + s.k + '] (참고 · 판정 제외) 봉우리 스필 최대 ' + n1(spillMax) + 'px · '
      + spillN + '/' + got.length + '알 — 위상·눌림 포함값');
    /* [P4] ★ 583 축을 «사람이 보는 프레임» 으로 다시 묻는다 — 상쇄인가 **역전**인가 */
    const rev = inkMax < plainHi - 0.5;
    ok(true,
       '[P4-' + s.k + '] ★ 583 «아이콘 알은 구슬보다 크다» 를 **잉크** 축에서 잰 결과',
       '아이콘 잉크 ' + n1(inkMax) + ' vs 구슬 잉크 ' + n1(plainHi)
       + ' ⇒ ' + (rev ? '**역전** ' + n1((inkMax / plainHi - 1) * 100) + '%'
                      : (inkMax > plainHi + 0.5 ? '아이콘이 더 크다 +' + n1((inkMax / plainHi - 1) * 100) + '%' : '상쇄')));
    /* [P4b] 898 은 **상자** 축만 봐서 «상쇄» 로 읽었다 — 그 자리가 잉크 축에서는 역전임을 이름으로 적는다 */
    if (rev) console.log('  ⚠ [P4b-' + s.k + '] 898 이 «상쇄» 로 읽은 자리가 **잉크 축에서는 역전**이다'
      + ' — `verify583` [C-big] 은 상자를 재므로 이 역전을 못 본다.');
    console.log('  · 838 겹침 자 — 최근접 중심거리 ÷ 지름 최소 ' + n3(sepMin) + ' (1 미만 = 상자가 겹친다)');
  }

  /* ── [P5] 가둠이 무는 자리에서 583 은 산술적으로 가능한가 ───────────────────── */
  console.log('\n[P5] 가둠(fitK<1)이 무는 자리에서 583 «아이콘 > 구슬» 이 **가능한가**');
  console.log('  산수: 구슬은 상자가 곧 그림이라 잉크 = min(상자, cap) = cap 에 닿는다.');
  console.log('  아이콘 잉크 = 상자 × --fxgs 이고 상자 ≤ cap 이므로, --fxgs ≤ 1 인 재화에서는');
  console.log('  아이콘 잉크 ≤ cap = 구슬 잉크 다 ⇒ **«더 크게» 는 가둠이 무는 자리에서 불가능하다.**');
  console.log('  ⇒ 상쇄는 «고른 것» 이 아니라 **강제**다. 583 을 그 자리에서 살리는 길은 cap 을 여는 것뿐이고,');
  console.log('     그것은 ⓑ `--burst-fit` 되열기(838 5·6회차 채점 되돌림) 또는 ⓒ 버튼 키우기(882) 다.');
  const binding = SITES.filter(s => R[s.k] && R[s.k].fitIC < 1).map(s => s.k);
  ok(binding.length > 0, '[P5] 가둠이 무는 자리가 실제로 있다(그 자리에서 위 산수가 돈다)', binding.join('·') || '없음');

  /* ── [P6] ⓒ(882 — 버튼 키우기)에 넘길 **예산**을 산수로 낸다 ─────────────────
     역전을 없애려면 아이콘 프레임(cap × --fxgs)이 구슬 프레임(cap)에 닿아야 한다.
     `--fxgs < 1` 인 자리에서는 cap 자신을 `1/--fxgs` 배로 열어야 하고, cap = fits × 짧은변 이므로
     필요한 것은 **버튼의 짧은 변**이다. 이 값이 882(훈련 카드 상자 종횡비)가 받아 갈 수 다. */
  console.log('\n[P6] ⓒ 버튼 키우기(882)에 넘길 예산 — «역전 0» 에 필요한 버튼 짧은 변');
  let need = 0;
  for (const s of SITES) {
    const q = R[s.k]; if (!q) continue;
    if (q.gs >= 1) { console.log('  · ' + s.n + ' — `--fxgs` ' + n3(q.gs) + ' ≥ 1 ⇒ 이미 역전 없음(예산 0)'); continue; }
    const capNeed = q.plainHi / q.gs;                       /* 아이콘 프레임이 구슬 프레임에 닿는 cap */
    const shortNeed = capNeed / q.ax.fits;                  /* cap = fits × 짧은변 */
    const shortNow = Math.min(q.ax.w, q.ax.h);
    need++;
    console.log('  · ' + s.n + ' — 짧은 변 ' + n1(shortNow) + ' → **' + n1(shortNeed) + '** 필요'
      + ' (**+' + n1(shortNeed - shortNow) + 'px**) · cap ' + n1(q.cap) + ' → ' + n1(capNeed)
      + ' · `--burst-fit` ' + n3(q.ax.fits) + ' 불변');
  }
  ok(need > 0, '[P6] 예산이 실제로 계산된다 — 882 가 받아 갈 수가 나온다', need + '자리');

  ok(errs.length === 0, '[Z] 콘솔 에러 0', errs.length + '건');
  await b.close();
  console.log('\nPROBE900 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
