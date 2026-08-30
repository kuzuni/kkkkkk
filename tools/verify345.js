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
   `rl16` 은 **대조군**이다: `openRoulette()` 은 껍데기 클래스를 안 붙이므로(A5 기본 규격 그대로)
   ⚑ 464(2026-08-30) — 그 이름은 **제품에서 삭제됐다**(remove 목록 5곳). 여기 남은 것은 «룰렛에는
   껍데기가 없다» 를 계속 재는 대조 표본이고, 그래서 아래 «잔여 없음» 단언은 전과 같은 뜻으로 초록이다.
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

  /* 392 — 닫힘 프레임을 페이지 «안» 의 rAF 로 녹화한다(2026-08-29, T1 플레이키 게이트).
     옛 판본은 `closeModal()` 뒤 `waitForTimeout(40)` 두 번으로 «t40ms·t80ms» 를 떴는데,
     그 둘은 **벽시계**이고 연출은 **문서 타임라인**(애니메이션 프레임에서만 전진)을 탄다.
     `tools/probe392.js` 실측 — 이 러너의 닫힘 창은 프레임 간격이 **36~79ms** 라
     연출이 «축소로 보이기 시작하는» 첫 프레임이 t=**76.7~128.1ms** 사이에서 실행마다 떠다니고,
     게이트의 두 표본은 t=**53.5~160.5ms** 에 착지한다. 즉 두 표본이 **창보다 앞에** 설 수 있고
     (22 퀘스트: 표본 53.5·122.6ms vs 창 128.1..174.3ms = 창 «안» 0/2) 그때 [전제] 가 빨개졌다.
     ⚠ 제품은 이 실행에서도 정상이었다 — 다섯 껍데기 전부 살아 있는 프레임 4~5장 · 최심 배율 .940~.951.
     ⇒ 벽시계 표본을 버리고 **연출이 그린 프레임을 전부** 받는다. 창을 넓힌 게 아니라 자를 바꾼 것이라
     허용 오차는 한 칸도 안 넓혔고, 오히려 [전제]·§3 이 두 장이 아니라 **전 프레임**을 센다. */
  const recordClose = () => ev(() => new Promise((res) => {
    const m = document.getElementById('modal');
    const b = m && m.querySelector('.mbox');
    if (!m || !b) return res({ __err: '#modal/.mbox 없음' });
    const rd = () => {
      const cs = getComputedStyle(m), bs = getComputedStyle(b), r = b.getBoundingClientRect();
      const body = m.querySelector('.mbody');
      return {
        cls: [...m.classList].join(' '), on: m.classList.contains('on'),
        w: b.offsetWidth, h: b.offsetHeight, rw: r.width, rh: r.height,
        mh: bs.maxHeight, pad: cs.paddingTop + '/' + cs.paddingLeft,
        bodyH: body ? body.offsetHeight : -1, disp: cs.display,
      };
    };
    const rec = [];
    const t0 = performance.now();
    closeModal();
    const tick = () => {
      const f = rd();
      f.t = +(performance.now() - t0).toFixed(1);
      rec.push(f);
      if (f.disp === 'none' || f.t > 700) return res({ rec, ended: f.disp === 'none' });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));

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

      /* 392 — 닫힘 프레임은 **연출 자신의 시계**로 잡는다(아래 recordClose 주석) */
      const REC = await recordClose();
      if (blk(name + ' 닫힘 녹화', REC)) continue;
      const L = REC.rec.filter((f) => f.disp !== 'none');      /* 이미 끝난 프레임은 셈에서 뺀다 */
      if (!L.length) { no(name + ' — 닫힘 연출 동안 살아 있는 프레임이 0장'); continue; }

      /* 두 표본은 벽시계 40/80ms 가 아니라 **녹화된 프레임 중에서** 고른다 —
         ① 첫 살아 있는 프레임(연출 앞턱) ② 가장 깊이 축소된 프레임(연출 한복판~끝).
         개수는 늘 2 라 셈이 실행마다 흔들리지 않는다. */
      const P = L[0];
      const Q = L.reduce((a, f) => (f.rw < a.rw ? f : a), L[0]);
      for (const [tag, f] of [['첫 프레임', P], ['최심 프레임', Q]]) {
        const lab = name + ' ' + tag + '(t' + f.t + 'ms)';
        is(lab + ' 레이아웃 폭', f.w, O.w);
        is(lab + ' 레이아웃 높이', f.h, O.h);
        is(lab + ' 본문 높이', f.bodyH, O.bodyH);
        is(lab + ' max-height', f.mh, O.mh);
        is(lab + ' 딤 패딩', f.pad, O.pad);
        near(lab + ' 균등 축소(가로/세로 배율 차)', f.rw / O.rw - f.rh / O.rh, 0, 0.004);
      }

      /* [전제] — 녹화한 **모든** 살아 있는 프레임에서 센다(옛 판본은 두 벽시계 표본만 봤다) */
      const shrunk = L.filter((f) => f.rw / O.rw < 0.999).length;
      (shrunk > 0)
        ? ok(name + ' — 실제로 축소 중인 프레임 ' + shrunk + '/' + L.length + '장(연출이 돈다 · 최심 배율 '
          + (Q.rw / O.rw).toFixed(4) + ')')
        : no(name + ' — 살아 있는 ' + L.length + '장이 다 배율 1.0. 연출이 안 돌아 §1 이 공허하다');
      /* [전제 b] — 녹화가 연출의 «끝» 까지 닿았다(잘린 창에서 위를 셌으면 [전제] 가 헛초록이다) */
      is('[전제 b] ' + name + ' — 녹화가 닫힘까지 닿음(display:none 프레임 도달)', REC.ended, true);

      /* §2 뒷정리 — 연출이 끝나면 껍데기가 전부 떨어진다 */
      await page.waitForTimeout(400);
      const A = await snap();
      if (!blk(name + ' 닫힘 후 실측', A)) {
        is(name + ' 닫힘 후 display', A.disp, 'none');
        is(name + ' 닫힘 후 on 없음', A.on, false);
        is(name + ' 닫힘 후 껍데기 «' + cls + '» 잔여 없음', A.cls.split(' ').includes(cls), false);
      }
      out[cls] = { O, F: L };                                  /* 392 — §3 이 두 장이 아니라 «전 프레임» 을 본다 */
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

  /* ── §R2 되돌림 시험(392 신설) — 새 자가 «무르게 푼 자» 가 아님을 못박는다 ──
     프레임 녹화로 갈아 끼운 [전제] 는 «연출이 안 돌면» 여전히 빨개져야 한다.
     연출을 실제로 죽여 보고(박스 애니만 `none`) 축소 프레임이 0장으로 읽히는지,
     원복하면 도로 잡히는지를 잰다. 이게 초록이 아니면 [전제] 는 뜻을 잃은 것이다. */
  console.log('\n══ §R2 되돌림 시험(392) — 연출을 죽이면 [전제] 가 도로 빨개진다');
  await run('openMail()');
  await page.waitForTimeout(420);
  const OR = await snap();
  if (!blk('§R2 기준 실측', OR)) {
    await ev(() => {
      const s = document.createElement('style');
      s.id = 'p392kill';
      s.textContent = '.jz-c.jz-dlg>*{animation:none!important}';
      document.head.appendChild(s);
    });
    const RK = await recordClose();
    await page.waitForTimeout(400);
    await ev(() => { const s = document.getElementById('p392kill'); if (s) s.remove(); });
    if (!blk('§R2 연출 죽인 녹화', RK)) {
      const LK = RK.rec.filter((f) => f.disp !== 'none');
      const shrunkK = LK.filter((f) => f.rw / OR.rw < 0.999).length;
      is('R2-a 박스 애니를 죽이면 축소 프레임 0장 = [전제] 가 빨개진다', shrunkK, 0);
    }
    await run('openMail()');
    await page.waitForTimeout(420);
    const OB = await snap();
    const RB = await recordClose();
    await page.waitForTimeout(400);
    if (!blk('§R2 원복 녹화', RB) && !blk('§R2 원복 기준', OB)) {
      const LB = RB.rec.filter((f) => f.disp !== 'none');
      const shrunkB = LB.filter((f) => f.rw / OB.rw < 0.999).length;
      (shrunkB > 0)
        ? ok('R2-b 원복하면 축소 프레임 ' + shrunkB + '/' + LB.length + '장 = [전제] 가 도로 초록')
        : no('R2-b 원복해도 축소 프레임 0장 — 되돌림 시험이 성립 안 함');
    }
  }

  is('콘솔 에러 0건', errs.length, 0);
  if (errs.length) console.log('    ' + errs.slice(0, 3).join('\n    '));
  console.log('\nVERIFY345 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
