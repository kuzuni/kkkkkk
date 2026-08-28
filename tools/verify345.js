/* 작업 345 게이트 — «우편 팝업이 찌그러지며 닫힘» (주인 보고 2026-08-29)
 *
 *   node tools/verify345.js   → 마지막 줄이 `VERIFY345 n/n PASS` 여야 한다.
 *
 * 주인 원문: «우편팝업닫힐때 이상하게 닫히더라. 뭔가 팝업이 찌그러지면서 닫힘».
 *
 * 등재문의 가설이 **재현으로 확인됐다**(`tools/probe345.js`, 수리 전):
 *   `closeModal()` 이 `remove('on','sk8','rl16','q22','ml69','at70')` 로 가시성 스위치와 껍데기 치수를
 *   **한 번에** 떼는데, 60 닫힘 연출(.12s)은 그 뒤에 display 를 되살려 역재생한다 ⇒ 연출 동안 상자가
 *   A5 기본 규격으로 리플로우된 채 축소된다. 실측:
 *     ml69 `.mbox` 1303 → **230**(본문 `.ml69 .mbody{height:1189}` 가 통째로 사라진다) ·
 *     q22 1497 → 230 · at70 940×1077 → 898×1098(딤 패딩 159/70 → 126/91) · sk8 1002 → 1076.
 *
 * ⇒ 이 게이트가 잠그는 것은 «닫힘 연출은 **균등 축소**여야 한다» 는 계약이다:
 *   §1 껍데기 5종 전수 — 연출 중 **레이아웃 박스(offsetW/H)가 열림과 Δ0** · 그려진 박스는 가로세로
 *      **같은 비율**로 준다(찌그러짐 = 두 비율이 갈리는 것) · 딤 패딩·max-height 도 불변 ·
 *      «정말 축소 중인 프레임» 이 최소 1장(연출이 아예 안 돌면 이 절은 공허하다).
 *   §2 뒷정리 — 연출이 끝나면 껍데기·`on` 이 전부 떨어지고 display:none 이다(**되살린 클래스가 안 굳는다**).
 *   §3 가시성 스위치는 되살리지 않는다 — 연출 중 `on` 이 붙어 있으면 안 된다(붙이면 안 닫히는 팝업이 된다).
 *   §4 경합 — 닫힘 연출 도중에 ① 다른 팝업을 열면 그 팝업 껍데기가 온전하고 남의 껍데기가 안 남는다
 *      ② 같은 팝업을 다시 열어도 껍데기가 살아 있다(offC 가 «연 쪽» 의 클래스를 뺏어가지 않는다).
 *   §R 되돌림 시험 — `jzShellBack` 을 무력화하면 §1 이 **수리 전 숫자 그대로**(1303 → 230) 빨개지고,
 *      원복하면 초록으로 돌아온다. LESSONS 307-④ — «고친 뒤 초록» 만으로는 게이트를 증명하지 못한다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — page.evaluate 예외는 게이트를 즉사시키지 말고 그 절만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  NO   ' + m); };
const is = (m, got, want) => (got === want ? ok(m + ' = ' + got) : no(m + ' — 기대 ' + want + ' · 실제 ' + got));
const near = (m, got, want, tol) => (Math.abs(got - want) <= tol
  ? ok(m + ' = ' + (+got).toFixed(3) + ' (기대 ' + (+want).toFixed(3) + ')')
  : no(m + ' = ' + (+got).toFixed(3) + ' — 기대 ' + (+want).toFixed(3) + ' (허용 ' + tol + ')'));

/* 껍데기 — [클래스, 여는 코드, 화면]
   rl16 은 **대조군**이다: 현행 `openRoulette()` 은 껍데기 클래스를 안 붙이므로(A5 기본 규격 그대로)
   되살릴 것이 없고, 수리 전에도 균등 축소였다 — 이 줄이 초록인 것은 «내 수리가 멀쩡한 자리를
   건드리지 않았다» 는 대조다. */
const SHELLS = [
  ['ml69', 'openMail()', '69 우편함'],
  ['q22', 'openQuest()', '22 퀘스트'],
  ['at70', 'openAttend()', '70 출석'],
  ['sk8', 'showSkillDetail(Object.keys(SK)[0])', '08 스킬 세부'],
  ['rl16', 'openRoulette()', '16 룰렛(대조군)'],
];

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };
  const blk = (name, r) => (r && r.__err ? (no(name + ' — 평가 실패: ' + r.__err), true) : false);

  const run = (src) => ev((s) => { try { (0, eval)(s); } catch (e) { return { __err: String(e.message || e) }; } return 1; }, src);

  /* 한 프레임 실측 — 레이아웃 박스(scale 무관) · 그려진 박스(scale 포함) · 껍데기 관련 스타일 */
  const snap = () => ev(() => {
    const m = document.getElementById('modal');
    const b = m && m.querySelector('.mbox');
    if (!m || !b) return { __err: '#modal/.mbox 없음' };
    const cs = getComputedStyle(m), bs = getComputedStyle(b), r = b.getBoundingClientRect();
    const body = m.querySelector('.mbody');
    return {
      cls: [...m.classList].join(' '), on: m.classList.contains('on'),
      w: b.offsetWidth, h: b.offsetHeight,
      rw: r.width, rh: r.height,
      mh: bs.maxHeight, pad: cs.paddingTop + '/' + cs.paddingLeft,
      bodyH: body ? body.offsetHeight : -1,
      disp: cs.display,
    };
  });

  /* ── §1 · §2 · §3 — 껍데기 전수 ── */
  const sweep = async (label) => {
    const out = {};
    for (const [cls, open, name] of SHELLS) {
      console.log('\n[' + label + '] ' + name + ' (.' + cls + ')');
      const o = await run(open);
      if (blk(name + ' 열기', o)) continue;
      await page.waitForTimeout(420);
      const O = await snap();
      if (blk(name + ' 열림 실측', O)) continue;
      if (O.disp === 'none') { no(name + ' — 열리지 않았다'); continue; }

      await ev(() => closeModal());
      /* 연출은 .12s — 40ms·80ms 두 지점이 «연출 한복판» 이다 */
      const F = [];
      for (let i = 0; i < 2; i++) { await page.waitForTimeout(40); F.push(await snap()); }
      if (F.some((f) => f && f.__err)) { no(name + ' — 닫힘 프레임 실측 실패'); continue; }

      let shrunk = 0, worst = 0;
      for (let i = 0; i < F.length; i++) {
        const f = F[i], t = (i + 1) * 40;
        if (f.disp === 'none') continue;                       /* 이미 끝난 프레임은 셈에서 뺀다 */
        is(name + ' t' + t + 'ms 레이아웃 폭', f.w, O.w);
        is(name + ' t' + t + 'ms 레이아웃 높이', f.h, O.h);
        is(name + ' t' + t + 'ms 본문 높이', f.bodyH, O.bodyH);
        is(name + ' t' + t + 'ms max-height', f.mh, O.mh);
        is(name + ' t' + t + 'ms 딤 패딩', f.pad, O.pad);
        const sx = f.rw / O.rw, sy = f.rh / O.rh;
        near(name + ' t' + t + 'ms 균등 축소(가로/세로 배율 차)', sx - sy, 0, 0.004);
        if (sx < 0.999) shrunk++;
        worst = Math.max(worst, Math.abs(sx - sy));
      }
      (shrunk > 0)
        ? ok(name + ' — 실제로 축소 중인 프레임 ' + shrunk + '장(연출이 돈다)')
        : no(name + ' — 두 프레임 다 배율 1.0. 연출이 안 돌아 §1 이 공허하다');

      /* §2 뒷정리 — 연출이 끝나면 껍데기가 전부 떨어진다 */
      await page.waitForTimeout(400);
      const A = await snap();
      if (!blk(name + ' 닫힘 후 실측', A)) {
        is(name + ' 닫힘 후 display', A.disp, 'none');
        is(name + ' 닫힘 후 on 없음', A.on, false);
        is(name + ' 닫힘 후 껍데기 «' + cls + '» 잔여 없음', A.cls.split(' ').includes(cls), false);
      }
      out[cls] = { O, F };
    }
    return out;
  };

  console.log('══ §1 닫힘 연출은 균등 축소다 · §2 연출 뒤 껍데기 뒷정리 · §3 가시성 스위치');
  const base = await sweep('§1');

  /* §3 — 연출 중에 `on` 이 되살아나 있으면 안 된다(붙이면 offC 뒤에도 안 닫히는 팝업이 된다) */
  for (const [cls, , name] of SHELLS) {
    const b = base[cls];
    if (!b) continue;
    const onDuring = b.F.some((f) => f && f.on);
    is('§3 ' + name + ' — 연출 중 on 미복원', onDuring, false);
  }

  /* ── §4 경합 ── */
  console.log('\n══ §4 닫힘 연출 도중 경합');
  await run('openMail()');
  await page.waitForTimeout(420);
  await ev(() => closeModal());
  await page.waitForTimeout(40);
  const r1 = await run('openQuest()');                        /* ① 연출 한복판에 다른 팝업 */
  if (!blk('§4-① 전환', r1)) {
    await page.waitForTimeout(600);
    const S = await snap();
    if (!blk('§4-① 실측', S)) {
      is('§4-① 닫는 중 퀘스트로 전환 — q22 살아 있음', S.cls.split(' ').includes('q22'), true);
      is('§4-① 닫는 중 퀘스트로 전환 — ml69 잔여 없음', S.cls.split(' ').includes('ml69'), false);
      is('§4-① 닫는 중 퀘스트로 전환 — 화면에 떠 있다', S.disp !== 'none', true);
      is('§4-① 퀘스트 껍데기 치수(.mbody 1383)', S.bodyH, 1383);
    }
  }
  await ev(() => closeModal());
  await page.waitForTimeout(600);

  await run('openMail()');
  await page.waitForTimeout(420);
  const MO = await snap();
  await ev(() => closeModal());
  await page.waitForTimeout(40);
  const r2 = await run('openMail()');                         /* ② 연출 한복판에 같은 팝업 재열기 */
  if (!blk('§4-② 재열기', r2)) {
    await page.waitForTimeout(600);
    const S = await snap();
    if (!blk('§4-② 실측', S) && !blk('§4-② 기준', MO)) {
      is('§4-② 닫는 중 재열기 — ml69 살아 있음', S.cls.split(' ').includes('ml69'), true);
      is('§4-② 닫는 중 재열기 — 화면에 떠 있다', S.disp !== 'none', true);
      is('§4-② 재열기 뒤 상자 높이가 열림 규격 그대로', S.h, MO.h);
      is('§4-② 재열기 뒤 본문 높이가 열림 규격 그대로', S.bodyH, MO.bodyH);
    }
  }
  await ev(() => closeModal());
  await page.waitForTimeout(600);

  /* ── §R 되돌림 시험 ──
     `jzShellBack` 을 «아무것도 안 되살리는» 것으로 갈아 끼우면 수리 전 코드와 같아진다. */
  console.log('\n══ §R 되돌림 시험 — 껍데기 복원을 끄면 수리 전 숫자로 돌아간다');
  const R = await ev(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const m = document.getElementById('modal');
    const box = () => { const b = m.querySelector('.mbox'); return { h: b.offsetHeight, bodyH: (m.querySelector('.mbody') || { offsetHeight: -1 }).offsetHeight }; };
    const keep = window.jzShellBack;
    const one = async () => {
      openMail(); await wait(420);
      const o = box();
      closeModal(); await wait(50);
      const c = box();
      await wait(500);
      return { openH: o.h, openBody: o.bodyH, closeH: c.h, closeBody: c.bodyH };
    };
    window.jzShellBack = () => null;                          /* = 수리 전 */
    const before = await one();
    window.jzShellBack = keep;                                /* 원복 */
    const after = await one();
    return { before, after };
  });
  if (!blk('§R', R)) {
    (R.before.closeH !== R.before.openH)
      ? ok('R1 복원을 끄면 닫힘 프레임 상자 높이 ' + R.before.openH + ' → ' + R.before.closeH + ' = 주인이 본 «찌그러짐» → §1 이 빨개진다')
      : no('R1 복원을 꺼도 높이가 안 변한다(' + R.before.closeH + ') — 되돌림 시험이 성립 안 함');
    (R.before.closeBody !== R.before.openBody)
      ? ok('R2 복원을 끄면 본문 높이 ' + R.before.openBody + ' → ' + R.before.closeBody + ' (.ml69 .mbody 가 사라진다)')
      : no('R2 복원을 꺼도 본문 높이가 안 변한다 — 되돌림 시험이 성립 안 함');
    is('R3 원복하면 닫힘 프레임 상자 높이 = 열림', R.after.closeH, R.after.openH);
    is('R3 원복하면 닫힘 프레임 본문 높이 = 열림', R.after.closeBody, R.after.openBody);
  }

  is('콘솔 에러 0건', errs.length, 0);
  if (errs.length) console.log('    ' + errs.slice(0, 3).join('\n    '));
  console.log('\nVERIFY345 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
