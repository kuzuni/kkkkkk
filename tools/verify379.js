/* 379 게이트 — 균등분할 서브탭 바(`.sp2`/`.sp3`)의 «칸 격자 기준 상자» 와 «활성 알약 오버행».
 *
 *   node tools/verify379.js      (1080x2280 · 헤드리스)
 *
 * 무엇을 못박나 — 379 가 세운 세 줄이다:
 *   ⓐ **칸은 바 «바깥 상자» 를 N 등분한다.** 종전 `width:50%/33.3333%` 는 절대배치 자식의 %,
 *      곧 **패딩박스**(바깥 − 12)를 나눈 것이라 4칸 격자와 기준이 달랐다.
 *      근거는 ref 07 에서 **픽셀로 확정된 유일한 칸 경계** 하나다 — 세로 구분선 3 = x 775~779,
 *      중심 **777**(측정표 07 §9 «탭 분할»). 나머지 두 «구분선» 은 같은 표가 «활성 알약 좌/우
 *      테두리가 겸함» 이라고 적어 둔 **알약 변**이라 칸 경계가 아니다.
 *      바깥 4등분 경계는 `65 + 3×(950/4) = 777.5` ⇒ **Δ0.5**.
 *   ⓑ **활성 알약은 자기 칸보다 «면당 11.75» 넓다.** ref 07 활성 알약 **291 / 261**(측정표 07 §9)
 *      ↔ 그 칸(바깥 4등분 2번째) **302.5..540** ⇒ 좌 +11.5 · 우 +12.0 = **총 23.5**.
 *      (같은 표의 «탭 폭 222/252/230/229 — 활성 탭이 +22 넓다» 가 같은 말이다.)
 *      좌·우 0.5 차는 352 정오표가 밝힌 **JPEG AA 편향**(양쪽 같은 방향 +0.5)이라 구조가 아니다.
 *   ⓒ **셸 안쪽 변에 닿는 면은 거기서 멈춘다.** 그 면의 검정은 셸 테두리가 겸한다
 *      (측정표 07 §9 «위/아래 테두리는 바 테두리와 공유» · 352 §8 이 좌·우에서 같은 것을 실측 ·
 *      378 이 `--pill-l/--pill-r` 로 구현). 알약이 그 변을 넘으면 **셸 검정을 덮어 378 이 되돌아간다.**
 *
 * ⚑ **왜 «기대값만 갈지» 않았나** (LESSONS 328-330) — `ow/n` 으로 숫자만 바꾸면 «칸 == 알약» 이던
 *    옛 그림도 그대로 초록이다. 그래서 이 게이트는 격자를 **비활성 칸으로만** 재고, 활성 알약의
 *    오버행을 **따로** 묻는다. 그리고 §R 이 «379 를 되돌리면 빨개지는가» 를 직접 실행한다.
 *
 * [3]-(가) 기계적 검증 — DOM 실측 판정이라 비평가를 띄우지 않는다.
 * 재현기는 `node tools/probe379.js`(수리 전후 숫자를 나란히 찍는다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const W = 1080, H = 2280;
const BORDER = 6;
/* ⓑ 의 상수 — 위 머리말의 ref 실측에서 온다. 한 면당. */
const OVER = 11.75;
const TOL = 0.6;

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? TOL : t);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);

/* 살아 있는 균등분할 호스트. verify352·probe378·probe379 와 같은 진입 경로. */
const HOSTS = [
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
];

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* ⚑ probe378 교훈 — «내가 켠 칸» 이 아니라 **지금 실제로 켜져 있는 칸**을 돌려준다.
   renderUI() 가 매 틱 `.on` 을 다시 그리는 바가 있어, 안 그러면 «칸3 을 쟀다» 면서 칸1 을 찍는다.
   ⚑⚑ 963 이관 (2026-09-06) — **그 되읽기만으로는 구멍이 안 닫힌다.** 되읽기는 틀린 칸을
   «조용히 갈아 끼울» 뿐이라, 아래 [1] 은 칸1 을 두 번 채점하고 **칸3 을 한 번도 안 재고도**
   초록이었다(점수 줄 수가 그대로라 눈에 안 띈다). 뿌리는 `SETON` 과 `READ` 가 **두 evaluate** =
   그 사이가 틱 경계라는 것이고, 제품이 그 자리를 소유한다 —
   `renderRunes()`(index.html ~40219)가 `#trSubs` 의 `.on` 을 `trSub` 로 되돌린다.
   실측(963 1회차): 되돌림 **72.5ms** · 틱 넘김 경로 20회 중 **3회** 어긋남 · 같은 틱 **0/20**.
   ⇒ 인자에 `i` 를 받으면 **먼저 켜고 같은 틱에서 읽는다**(`i` 생략 = 읽기만 — [R] 절이 그렇게 쓴다).
   `i < 0` 은 «전 칸 끄기». 전환(transition)이 없는 순수 클래스 기하라 같은 틱 값이 최종값이다. */
const READ = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return { missing: true };
  if (i !== undefined) {
    const cc = [...bar.querySelectorAll(':scope > .stab')];
    if (i >= 0 && !cc[i]) return { missing: true };
    cc.forEach((c, j) => {
      const on = i >= 0 && j === i;
      c.classList.toggle('on', on);
      const ink = c.querySelector('i');
      if (ink) { ink.classList.toggle('ol4', on); ink.classList.toggle('ol3', !on); }
    });
  }
  const cs = getComputedStyle(bar);
  const s = bar.getBoundingClientRect().width / bar.offsetWidth;   /* 입장 연출 스케일 */
  if (!isFinite(s) || s <= 0) return { missing: true, hidden: true };
  const bb = bar.getBoundingClientRect();
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  return {
    ow: bb.width / s,
    bw: parseFloat(cs.borderLeftWidth),
    n: cells.length,
    sp: bar.classList.contains('sp2') ? 2 : bar.classList.contains('sp3') ? 3 : 0,
    want: i === undefined ? null : i,        /* 963 — «내가 켠 칸» */
    onIdx: cells.findIndex(c => c.classList.contains('on')),
    /* 바 «바깥» 좌변 기준 상대 좌표 — 절대 x 는 입장 연출 중심 보정이 섞인다(verify47 머리말) */
    cells: cells.map(c => {
      const r = c.getBoundingClientRect();
      return { l: (r.x - bb.x) / s, w: r.width / s,
        on: c.classList.contains('on'), label: (c.querySelector('i') || {}).textContent || '' };
    }),
  };
};

/* 963 — `SETON` 은 선언째 사라졌다. 켜기는 `READ([sel, i])` 가 **같은 틱 안에서** 겸한다
   (사본을 남기면 다음 세션이 다시 두 evaluate 로 쓴다 — 402 «사본을 지운다»). */

/* 한 바를 «지금 켜져 있는 칸» 기준으로 채점한다. tag 는 로그용. */
function grade(name, g, tag) {
  const n = g.n, ow = g.ow, C = ow / n;                 /* ⓐ — 나누는 상자는 «바깥» 이다 */
  const padL = g.bw, padR = ow - g.bw;                  /* 패딩(콘텐츠) 상자, 바깥 좌변 기준 */
  const on = g.onIdx;
  const rest = g.cells.map((c, i) => ({ c, i })).filter(o => o.i !== on);

  ok(tag + ' 전제 — 활성 칸 정확히 1개 (알약은 칸과 상자가 다르다)',
    g.cells.filter(c => c.on).length === 1, '활성 idx ' + on);

  /* ⓐ 칸 격자 — 비활성 칸으로만 잰다 */
  ok(tag + ' ⓐ 칸 폭 = 바깥 ÷' + n + ' = ' + f2(C) + '  (패딩 ÷' + n + ' = ' + f2((ow - g.bw * 2) / n) + ' 이 아니다)',
    rest.every(o => near(o.c.w, C)), rest.map(o => f2(o.c.w)).join(' / '));
  rest.forEach(o => ok(tag + ' ⓐ 칸' + (o.i + 1) + ' 왼끝 = 바깥 ' + o.i + '/' + n + ' 지점',
    near(o.c.l, C * o.i), f2(o.c.l) + ' vs ' + f2(C * o.i)));
  if (on !== 0) ok(tag + ' ⓐ 첫 칸 왼끝 = 바 바깥 왼끝 (0)', near(g.cells[0].l, 0), f2(g.cells[0].l));
  if (on !== n - 1) ok(tag + ' ⓐ 끝 칸 오른끝 = 바 바깥 오른끝 (' + f2(ow) + ')',
    near(g.cells[n - 1].l + g.cells[n - 1].w, ow), f2(g.cells[n - 1].l + g.cells[n - 1].w));

  /* ⓑ·ⓒ 활성 알약 오버행 */
  if (on >= 0) {
    const p = g.cells[on], gl = C * on, gr = gl + C;
    const first = on === 0, last = on === n - 1;
    ok(tag + ' ⓑ 알약 좌 ' + (first ? 'ⓒ 패딩 왼변에 붙음' : '오버행 +' + OVER),
      first ? near(p.l, padL) : near(gl - p.l, OVER),
      first ? f2(p.l) + ' vs 패딩 ' + f2(padL) : '+' + f2(gl - p.l));
    ok(tag + ' ⓑ 알약 우 ' + (last ? 'ⓒ 패딩 오른변에 붙음' : '오버행 +' + OVER),
      last ? near(p.l + p.w, padR) : near(p.l + p.w - gr, OVER),
      last ? f2(p.l + p.w) + ' vs 패딩 ' + f2(padR) : '+' + f2(p.l + p.w - gr));
    /* ⓒ 는 «378 이 얹혀 있는 자리» 다 — 알약이 패딩을 넘으면 셸 검정을 덮는다 */
    ok(tag + ' ⓒ 알약이 패딩 상자를 안 넘는다 (셸 검정 보존 — 378)',
      p.l >= padL - TOL && p.l + p.w <= padR + TOL,
      f2(p.l) + '..' + f2(p.l + p.w) + ' / 패딩 ' + f2(padL) + '..' + f2(padR));
  }
}

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });

    /* ── [1] 살아 있는 호스트 순회 — 칸을 하나씩 활성으로 만들어 «끝 칸» 과 «가운데 칸» 을 모두 본다 */
    console.log('\n[1] 균등분할 호스트 — 칸 격자(ⓐ) · 활성 알약 오버행(ⓑ·ⓒ)');
    let seen = 0;
    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) {
        ok(name + ' 진입', false, e.message.slice(0, 60)); continue;
      }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const g0 = await page.evaluate(READ, [sel]);
      if (g0.missing) { ok(name + ' 바를 찾음', false, g0.hidden ? '숨김' : '없음'); continue; }
      seen++;
      console.log('\n── ' + name + ' (' + sel + ', .sp' + g0.sp + ', ' + g0.n + '칸, 바깥 ' + f2(g0.ow) + ')');
      ok(name + ' 전제 — 균등분할 선언(.spN) = 실제 칸 수', g0.sp === g0.n, '.sp' + g0.sp + ' / ' + g0.n + '칸');
      for (let i = 0; i < g0.n; i++) {
        const g = await page.evaluate(READ, [sel, i]);          /* 963 — 켜기·읽기가 한 틱 */
        if (g.missing) { ok(name + ' 칸' + (i + 1) + ' 을 켤 수 있다', false, '칸 없음'); continue; }
        /* ⚑ 963 — **«쟀다고 말한 칸» 을 실제로 쟀는지가 점수 줄이다.** 이 항이 없으면
           틱이 넘어간 판에서 칸1 이 두 번 채점되고 칸3 은 한 번도 안 재지는데 **총점은 같다**
           (전에 실제로 그랬다 — probe379 는 그 판을 표에 찍었다). */
        ok(name + ' 칸' + (i + 1) + ' — 켠 칸을 그대로 쟀다 (제품 렌더가 안 끼어들었다)',
          g.onIdx === i,
          g.onIdx < 0 ? '전부 꺼짐' : '칸' + (g.onIdx + 1) + ' «' + g.cells[g.onIdx].label + '» 로 되돌려짐');
        if (g.onIdx !== i) continue;
        grade(name, g, '[' + name + ' 칸' + (g.onIdx + 1) + ' «' + g.cells[g.onIdx].label + '»]');
      }
    }
    ok('균등분할 호스트를 3곳 모두 쟀다', seen === HOSTS.length, seen + '/' + HOSTS.length + '곳');

    /* ── [2] `.sp2` — 살아 있는 호스트가 하나도 없다. 규칙이 조용히 썩지 않게 «심어서» 잰다.
       209(03 «탑»)·124(10 «이용권»)·210(23 «단련») 이 세 바를 전부 `.sp2` → `.sp3` 로 올렸다.
       그래도 `.sp2` 는 부품의 계약이라 CSS 에 살아 있어야 하고, 살아 있다면 **같은 규칙**이어야 한다. */
    console.log('\n[2] .sp2 — 살아 있는 호스트 0곳. 합성 바를 심어 같은 규칙인지 본다');
    const liveSp2 = await page.evaluate(() =>
      [...document.querySelectorAll('.stabs.sp2')].filter(b => b.offsetParent !== null).length);
    ok('전제 — .sp2 호스트가 0곳이다 (209·124·210 이 전부 .sp3 로 올렸다)', liveSp2 === 0, liveSp2 + '곳');
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.className = 'stabs sp2';
      host.id = '__sp2probe';
      host.style.cssText = 'position:absolute;left:45px;top:300px;width:990px';
      host.innerHTML = '<div class="stab on"><i>가</i></div><div class="stab"><i>나</i></div>';
      document.getElementById('app').appendChild(host);
    });
    await page.waitForTimeout(80);
    for (let i = 0; i < 2; i++) {
      const g = await page.evaluate(READ, ['#__sp2probe', i]);   /* 963 — 켜기·읽기가 한 틱 */
      if (g.missing) { ok('.sp2 합성 바 측정', false, '없음'); break; }
      ok('.sp2 합성 바 칸' + (i + 1) + ' — 켠 칸을 그대로 쟀다', g.onIdx === i,
        g.onIdx < 0 ? '전부 꺼짐' : '칸' + (g.onIdx + 1));
      ok('.sp2 합성 바 — 균등분할 선언 = 2칸', g.sp === 2 && g.n === 2, '.sp' + g.sp + ' / ' + g.n + '칸');
      grade('sp2', g, '[.sp2 칸' + (g.onIdx + 1) + ']');
    }
    await page.evaluate(() => { const e = document.getElementById('__sp2probe'); if (e) e.remove(); });

    /* ── [R] 되돌림 시험 — 379 이전 CSS(패딩박스 균등분할 · 오버행 0)를 덮어씌우면 빨개지는가.
       ⚑ 이 절이 없으면 이 게이트는 «값을 갈아 끼운 자» 와 구별되지 않는다(LESSONS 328-330 · 43-①). */
    console.log('\n[R] 되돌림 시험 — 379 이전 CSS 를 주입하면 ⓐ·ⓑ 가 빨개지는가');
    await page.evaluate(() => { goTab('hero'); openDungeon(); });
    await page.waitForTimeout(700);
    await page.evaluate(SETTLE);
    const before = await page.evaluate(READ, ['#dunSub']);
    const REVERT = `.stabs.sp3>.stab{width:33.3333%!important}
      .stabs.sp3>.stab:nth-of-type(1),.stabs.sp3>.stab.on:nth-of-type(1){left:0!important;width:33.3333%!important}
      .stabs.sp3>.stab:nth-of-type(2),.stabs.sp3>.stab.on:nth-of-type(2){left:33.3333%!important;width:33.3333%!important}
      .stabs.sp3>.stab:nth-of-type(3),.stabs.sp3>.stab.on:nth-of-type(3){left:66.6667%!important;width:33.3333%!important}`;
    await page.addStyleTag({ content: REVERT });
    await page.waitForTimeout(120);
    const rev = await page.evaluate(READ, ['#dunSub']);
    const Crev = rev.ow / rev.n, padRev = (rev.ow - rev.bw * 2) / rev.n;
    ok('[R-a] 되돌리면 칸 폭이 «패딩 ÷3» 으로 돌아간다 (바깥 ÷3 = ' + f2(Crev) + ' 이 아니다)',
      rev.cells.every(c => near(c.w, padRev)) && !near(padRev, Crev),
      rev.cells.map(c => f2(c.w)).join(' / ') + ' vs 패딩÷3 ' + f2(padRev));
    const onR = rev.onIdx;
    ok('[R-b] 되돌리면 활성 알약의 오버행이 0 이 된다 (칸 == 알약)',
      onR >= 0 && near(rev.cells[onR].w, padRev) && !near(rev.cells[onR].w, Crev + OVER * 2, 1),
      onR < 0 ? '활성 없음' : '알약 폭 ' + f2(rev.cells[onR].w) + ' / 칸 ' + f2(padRev));
    ok('[R-c] 되돌리면 끝 칸 오른끝이 바깥 오른끝에 못 미친다 (−' + f2(rev.bw) + ')',
      near(rev.cells[rev.n - 1].l + rev.cells[rev.n - 1].w, rev.ow - rev.bw)
      && !near(rev.cells[rev.n - 1].l + rev.cells[rev.n - 1].w, rev.ow),
      f2(rev.cells[rev.n - 1].l + rev.cells[rev.n - 1].w) + ' vs 바깥 ' + f2(rev.ow));
    /* 원복 — 주입한 자를 걷으면 다시 379 값이어야 한다(주입이 영구 오염이 아님을 못박는다) */
    await page.evaluate(() => {
      [...document.querySelectorAll('style')].forEach(s => {
        if (s.textContent.includes('33.3333%!important')) s.remove();
      });
    });
    await page.waitForTimeout(120);
    const after = await page.evaluate(READ, ['#dunSub']);
    ok('[R-d] 자를 걷으면 379 값으로 돌아온다 (주입이 영구 오염이 아니다)',
      after.cells.every((c, i) => near(c.w, before.cells[i].w) && near(c.l, before.cells[i].l)),
      after.cells.map(c => f2(c.w)).join('/') + ' vs ' + before.cells.map(c => f2(c.w)).join('/'));

    console.log('\n[E] 콘솔');
    ok('콘솔·페이지 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | ') || '0건');

    console.log('\nVERIFY379 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
    process.exit(fail ? 1 : 0);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
