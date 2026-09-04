#!/usr/bin/env node
/* 게이트 900 — 「583 «알갱이 크기 더 크게» 가 세 자리 중 둘에서 상쇄된다」 의 **판정을 못박는다**
 *
 *   node tools/verify900.js
 *
 * 이 행은 «제품이 깨졌나» 가 아니라 **«583 과 838 중 어느 쪽을 이 세 버튼에서 우선할 것인가»** 였고,
 * 재현(`tools/probe900.js`)이 그 물음을 **산수로 닫았다**:
 *
 *   구슬은 상자가 곧 그림이라 프레임 = min(상자, cap) = **cap** 에 닿는다.
 *   아이콘 프레임 = 상자 × `--fxgs` 이고 상자 ≤ cap 이므로, `--fxgs ≤ 1` 인 재화에서는
 *   아이콘 프레임 ≤ cap = 구슬 프레임 ⇒ **«아이콘이 구슬보다 크다» 는 가둠이 무는 자리에서
 *   산술적으로 불가능하다.** 상쇄는 «고른 것» 이 아니라 **강제**다.
 *
 * ⇒ 판정(위임 규약 채택 · 2026-09-04): **ⓐ 현행 유지.** 583 은 660 이 정한 해석
 *   («버튼이 허용하는 만큼»)으로는 **지금도 지켜지고 있고**(사슬의 위끝이 곧 cap — [E]),
 *   문자 그대로의 «아이콘 > 구슬» 을 그 세 자리에서 살리는 길은 **cap 을 여는 것뿐**이다.
 *   그 지렛대는 이 행이 아니라 **882**(버튼 키우기)에 있다 — 예산은 [F] 가 못박는다.
 *
 * 이 자가 묻는 것(전부 «지금 초록» 이고, 판정이 **조용히 뒤집히면** 빨개진다):
 *   [A] 상쇄가 도는 자리는 **`--burst-from` 을 신고한 호스트뿐**이고 지금 그것은 셋이다
 *       — 넷째가 생기면 상쇄 자리가 몰래 는다.
 *   [B] 838 이 채점한 손잡이가 그대로다(`FXB_FITS` · 훈련 `--burst-fit` · `FX_CIC_SC`)
 *       — ⓑ(되열기)를 몰래 고르면 빨갛다.
 *   [C] 세 자리 전부 가둠이 **실제로 문다**(fitK < 1) — 불가능 증명의 전제.
 *   [D] ★ 그 자리에서 아이콘 프레임 ≤ 구슬 프레임 = 증명의 결론이 실측으로 성립한다.
 *   [E] 583 이 660 의 해석으로는 지켜진다 — **사슬의 위끝이 곧 cap** 이다(여유를 남기고 안 작아진다).
 *   [F] ⓒ(882)에 넘긴 **예산**이 표에 적힌 값 그대로다 — 훈련 +15.9px · 단련 +18.1px.
 *   [R] 되돌림 — 훈련 `--burst-fit` 을 `.22` 로 되열은 **제품 사본**에서 cap 이 실제로 열려
 *       알이 지금 판보다 커진다 = [B]·[F] 가 공허한 항이 아니다.
 *
 * ⚠ 크기는 **레이아웃 자**(`offsetWidth`)로만 잰다 — `getBoundingClientRect` 는 `@keyframes fxSpark`
 *   위상을 탄다(898 §2-①). 발원 상자는 **눌린 순간**의 `fxRect` 다(898 §2-②).
 * ⚠ 표본 최댓값(`rnd(24,34)` 뽑기)은 실행마다 흔들리므로 **판정은 해석적 값**(제품이 그 자리에서
 *   읽는 상수·신고값으로 다시 유도한 값)으로 한다 — 뽑기에 문턱을 물리면 새 플레이키를 심는다(344·872).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const n1 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(1);
const n3 = v => (v == null || !Number.isFinite(+v)) ? 'n/a' : (+v).toFixed(3);

const SITES = [
  { k:'train',  n:'23 훈련 카드', sub:'train',  cur:'gold',   btn:'#trCards [data-tr="atk"] .cb', fit:0.18, budget:121.9 },
  { k:'rune',   n:'룬 [강화]',    sub:'rune',   cur:'rstone', btn:'#trRunes .tr-rn .rbt.b1',      fit:null, budget:null },
  { k:'temper', n:'단련 [투자]',  sub:'temper', cur:'tstone', btn:'#trTemper .tr-tp .tb',         fit:null, budget:191.1 }
];

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 상쇄가 도는 자리 = `--burst-from` 신고 호스트뿐 ─────────────────────
     `fitK` 는 `fo`(발원 신고)가 있을 때만 1 이 아니다(index.html `fxBurst`). 그러니
     «583 이 상쇄되는 자리» 의 개수는 곧 **CSS 에서 `--burst-from:` 을 적은 규칙의 수**다.
     ⚠ 주석 안의 백틱 인용(`--burst-from`)은 콜론이 없어 안 세어진다 — 선언만 센다. */
  const decl = (src.match(/--burst-from\s*:/g) || []).length;
  ok(decl === 3, '[A] 상쇄가 도는 자리는 `--burst-from` 신고 호스트뿐이고 지금 **셋**이다 — 넷째가 생기면 빨갛다',
     '선언 ' + decl + '개');
  for (const sel of ['.tr-card>.cb', '.tr-rn>.rbt.b1', '.tr-tp>.tb'])
    ok(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*--burst-from\\s*:').test(src),
       '[A] 신고 호스트 `' + sel + '` 가 그대로다', sel);

  /* ── [B] 838 이 채점한 손잡이 ────────────────────────────────────────────── */
  ok(/const FXB_FITS = 0\.22\b/.test(src), '[B] `FXB_FITS` = 0.22(838 3회차 채점값)가 그대로다');
  ok(/\.tr-card>\.cb\{[^}]*--burst-fit\s*:\s*\.18\b/.test(src),
     '[B] 훈련 `--burst-fit: .18`(838 5·6회차 채점 — 비평 DF·DG 가 «알을 더 작게» 로 낸 값)이 그대로다 = ⓑ 를 안 골랐다');
  ok(/const FX_CIC_SC = 1\.6;/.test(src), '[B] `FX_CIC_SC` = 1.6(583 의 살아 있는 몸)이 그대로다');
  ok(!/\.tr-rn>\.rbt\.b1\{[^}]*--burst-fit\s*:/.test(src) && !/\.tr-tp>\.tb\{[^}]*--burst-fit\s*:/.test(src),
     '[B] 룬·단련은 `--burst-fit` 을 **신고하지 않는다**(= `FXB_FITS` 그대로) — 838 6회차 규약');

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
  console.log('\n[K] FX_CIC_SC ' + n3(K.CIC) + ' · FXB_FITS ' + n3(K.FITS) + ' · 잉크보정 gold ' + n3(K.gs.gold)
    + ' / rstone ' + n3(K.gs.rstone) + ' / tstone ' + n3(K.gs.tstone));

  const CH = {};
  for (const s of SITES) {
    await p.evaluate(s => { setTrSub(s.sub); renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; }, s);
    await p.waitForTimeout(250);

    /* ⚠ 자를 둘로 갈랐다 —
       · **눌린 순간**의 상자: 제품의 `fitK` 가 알이 태어나는 그 순간에 읽는 값이다(898 §2-②).
         살아 있는 계약([C][D][E])은 이 자로 잰다.
       · **쉬는 상자**: 621 눌림은 홀드 내내 ±9% 흔들리므로(같은 자리) 눌린 자로 «버튼을 얼마나
         키워야 하는가»([F] 예산)를 내면 실행마다 값이 흔들린다 — 예산은 **레이아웃 설계값**이라
         쉬는 상자로 낸다(1회차에 이 자를 안 갈라 [F] 가 121.9 ↔ 124.4 로 흔들렸다). */
    const rest = await p.evaluate(sel => { const q = fxRect(document.querySelector(sel)); return { w:q.w, h:q.h }; }, s.btn);
    const bb = await (await p.$(s.btn)).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.mouse.down();
    const m = await p.evaluate(sel => new Promise(res => {
      const t = document.querySelector(sel); let box = 0, rw = 0, rh = 0, best = 0;
      const t0 = performance.now();
      const iv = setInterval(() => {
        const q = fxRect(t);
        if (Math.min(q.w, q.h) > best) { best = Math.min(q.w, q.h); rw = q.w; rh = q.h; }
        for (const n of document.querySelectorAll('#fxl .fx-cic')) box = Math.max(box, n.offsetWidth);
        if (performance.now() - t0 > 720) {
          const st = getComputedStyle(t);
          const szs = (() => { const v = parseFloat(st.getPropertyValue('--burst-sz')); return (v > 0 && v <= 1) ? v : 1; })();
          const fits = (() => { const v = parseFloat(st.getPropertyValue('--burst-fit')); return (v > 0 && v <= FXB_FITS) ? v : FXB_FITS; })();
          clearInterval(iv); res({ box, w: rw, h: rh, szs, fits });
        }
      }, 40);
    }), s.btn);
    await p.mouse.up();
    await p.waitForTimeout(300);

    const hsc = Math.min(Math.max(Math.sqrt(m.w * m.h) / 410, 1), K.DMAX / K.SZMAX);
    const cap = Math.max(K.SZMIN, m.fits * Math.min(m.w, m.h));
    const fitIC = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * m.szs * K.CIC));
    const fitPl = Math.min(1, cap / Math.max(1, K.SZMAX * hsc * m.szs));
    const gs = K.gs[s.cur];
    /* 사슬의 위끝(해석적) — 아이콘 상자 / 그 프레임 / 같은 자리 구슬 프레임 */
    const icBox = Math.max(K.SZMIN, Math.round(Math.round(34 * hsc * m.szs) * K.CIC) * fitIC);
    const icFrame = icBox * gs;
    const plFrame = Math.max(K.SZMIN, Math.round(34 * hsc * m.szs) * fitPl);
    CH[s.k] = { m, hsc, cap, fitIC, fitPl, gs, icBox, icFrame, plFrame };

    console.log('\n── ' + s.n + ' ── 버튼(눌린 순간) ' + n1(m.w) + '×' + n1(m.h)
      + ' · --burst-fit ' + n3(m.fits) + ' · cap ' + n1(cap) + ' · fitK(아이콘) ' + n3(fitIC) + ' / (구슬) ' + n3(fitPl));
    console.log('   사슬 위끝 — 아이콘 상자 ' + n1(icBox) + ' · 그 프레임(×--fxgs ' + n3(gs) + ') ' + n1(icFrame)
      + ' · 같은 자리 구슬 프레임 ' + n1(plFrame) + '   [실측 상자 최대 ' + n1(m.box) + ']');

    /* [C] 증명의 전제 */
    ok(fitIC < 1, '[C-' + s.k + '] 가둠이 **실제로 문다**(fitK < 1) — 불가능 증명의 전제', 'fitK ' + n3(fitIC));
    /* ── [D] 증명의 결론 — **`--fxgs` 의 부호가 자리를 둘로 가른다** ──────────────
       재현(`probe900`)이 등재문을 한 칸 정정했다. 등재문은 «세 자리 중 둘에서 상쇄» 라고 적었지만
       그것은 **상자** 축의 그림이고, 사람이 보는 **프레임** 축에서는 셋이 두 종류로 갈린다:
         · `--fxgs ≤ 1`(훈련 gold .869 · 단련 tstone .809) — 아이콘 프레임 ≤ 상자 ≤ cap = 구슬 프레임
           ⇒ «아이콘이 더 크다» 가 **산술적으로 불가능**하다(상쇄가 아니라 **역전**이다).
         · `--fxgs > 1`(룬 rstone 1.108) — 아이콘 프레임이 구슬을 **실제로 넘는다**. 단 그 몫은
           상자에서 나온 게 아니라 **상자 밖**에서 나오므로, 같은 크기만큼 838 의 허용치(cap)를 넘는다.
       ⇒ 어느 쪽이든 «583 을 cap 안에서 지키는 길» 은 없다 — 이것이 이 행의 답이다. */
    if (gs <= 1) {
      ok(icFrame <= plFrame + 1,
         '[D-' + s.k + '] ★ `--fxgs` ≤ 1 ⇒ 아이콘 프레임 ≤ 구슬 프레임 = «아이콘이 더 크다» 는 이 자리에서 **산술적으로 불가능**하다',
         '아이콘 ' + n1(icFrame) + ' vs 구슬 ' + n1(plFrame)
         + ' ⇒ ' + (icFrame < plFrame - 0.5 ? '역전 ' + n1((icFrame / plFrame - 1) * 100) + '%' : '상쇄')
         + ' · gs ' + n3(gs));
    } else {
      ok(icFrame > plFrame + 0.5 && icFrame > cap + 1,
         '[D-' + s.k + '] ★ `--fxgs` > 1 ⇒ 아이콘 프레임이 구슬을 넘지만 그 몫이 곧 **838 허용치(cap) 초과분**이다 — 공짜가 아니다',
         '아이콘 ' + n1(icFrame) + ' vs 구슬 ' + n1(plFrame) + ' · cap ' + n1(cap)
         + ' 초과 ' + n1((icFrame / cap - 1) * 100) + '% · gs ' + n3(gs) + ' ⇒ **902 로 등재**');
    }
    /* [E] 660 의 해석으로는 583 이 지켜진다 — 사슬의 위끝이 곧 cap */
    ok(Math.abs(icBox - cap) <= 1.2,
       '[E-' + s.k + '] 583 은 660 의 해석(«버튼이 허용하는 만큼»)으로 지켜진다 — 사슬의 위끝이 곧 cap 이다',
       '위끝 ' + n1(icBox) + ' vs cap ' + n1(cap));
    /* [F] ⓒ(882) 예산 — 역전 0 에 필요한 버튼 짧은 변(**쉬는 상자** 기준 · 위 머리말) */
    if (s.budget != null) {
      const hscR = Math.min(Math.max(Math.sqrt(rest.w * rest.h) / 410, 1), K.DMAX / K.SZMAX);
      const capR = Math.max(K.SZMIN, m.fits * Math.min(rest.w, rest.h));
      const plFrameR = Math.max(K.SZMIN, Math.round(34 * hscR * m.szs)
                                         * Math.min(1, capR / Math.max(1, K.SZMAX * hscR * m.szs)));
      const need = (plFrameR / gs) / m.fits;
      ok(Math.abs(need - s.budget) <= 1.5,
         '[F-' + s.k + '] ⓒ(882)에 넘긴 예산이 표 값 그대로다 — 짧은 변 ' + s.budget + 'px 필요',
         '산출 ' + n1(need) + ' (쉬는 상자 ' + n1(Math.min(rest.w, rest.h))
         + ' · **+' + n1(need - Math.min(rest.w, rest.h)) + 'px**)');
    } else {
      ok(gs >= 1, '[F-' + s.k + '] `--fxgs` ≥ 1 이라 이 자리는 역전이 없다 = 예산 0', 'gs ' + n3(gs));
    }
  }

  /* ── [R] 되돌림 — ⓑ(훈련 `--burst-fit` 되열기)를 고른 **제품 사본** ─────────────
     [B]·[F] 가 «이미 참인 것을 굳힌 항» 이 아님을 못박는다(334·348 §R).
     기대: `.18 → .22` 면 cap 이 19.1 → 23.3 으로 열려 훈련 알이 지금 판보다 **실제로 커진다**. */
  const FROM = '--burst-fit:.18;', TO = '--burst-fit:.22;';
  if (src.indexOf(FROM) < 0) {
    ok(false, '[R] 되돌림 앵커 `' + FROM + '` 를 찾았다 — 조용한 통과 금지');
  } else {
    const tmpAbs = path.join(path.dirname(SRC), '.v900-r-' + process.pid + '.html');
    fs.writeFileSync(tmpAbs, src.split(FROM).join(TO));
    let revBox = null;
    try {
      const p2 = await ctx.newPage();
      await p2.goto('file://' + tmpAbs);
      await p2.waitForFunction(() => typeof S !== 'undefined' && typeof upFx === 'function');
      await p2.waitForTimeout(1000);
      await p2.evaluate(() => { S.gold = 5e8; S.dia = 1e6; S.rstone = 1e6; S.tstone = 1e6; openTrain(); });
      await p2.waitForTimeout(300);
      await p2.evaluate(() => { setTrSub('train'); renderTrain();
        const L = document.getElementById('fxl'); if (L) L.innerHTML = ''; });
      await p2.waitForTimeout(250);
      const bb2 = await (await p2.$('#trCards [data-tr="atk"] .cb')).boundingBox();
      await p2.mouse.move(bb2.x + bb2.width / 2, bb2.y + bb2.height / 2);
      await p2.mouse.down();
      revBox = await p2.evaluate(() => new Promise(res => {
        let m = 0; const t0 = performance.now();
        const iv = setInterval(() => {
          for (const n of document.querySelectorAll('#fxl .fx-cic')) m = Math.max(m, n.offsetWidth);
          if (performance.now() - t0 > 720) { clearInterval(iv); res(m); }
        }, 40);
      }));
      await p2.mouse.up();
      await p2.close();
    } finally { try { fs.unlinkSync(tmpAbs); } catch (_) {} }
    ok(revBox !== null && revBox > CH.train.icBox + 1.5,
       '[R] ★ ⓑ 를 고른 사본(훈련 `--burst-fit` .18 → .22)에서 알이 **실제로 커진다** = [B]·[F] 가 공허하지 않다',
       '되열은 판 최대 ' + n1(revBox) + 'px > 지금 판 위끝 ' + n1(CH.train.icBox) + 'px');
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
  ok(errs.length === 0, '[Z] 콘솔 에러 0');
  await b.close();
  console.log('\nVERIFY900 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
