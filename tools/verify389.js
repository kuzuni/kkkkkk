/* 389 게이트 — 4칸 격자 서브탭(`.stab-c1~c4`)의 «칸 격자 기준 상자» 와 «활성 알약 오버행».
 *
 *   node tools/verify389.js      (1080x2280 · 헤드리스)
 *
 * 무엇을 못박나 — 379 가 균등분할 바(`.sp2`/`.sp3`)에 세운 규약 그대로다. 부품이 하나니까 규약도 하나다:
 *   ⓐ **칸은 바 «바깥 상자» 를 4등분한다** — `65 + k×237.5` (측정표 07 §9 «칸 격자» 행, 379 신설).
 *   ⓑ **활성 알약은 자기 칸보다 «면당 11.75» 넓다** — ref 07 활성 알약 291/261 ↔ 자기 칸 302.5..540.
 *   ⓒ **셸 안쪽 변에 닿는 면(c1 좌 · c4 우)은 거기서 멈춘다** — 그 면의 검정은 셸 테두리가 겸한다(378).
 *
 * 왜 4칸 격자가 별도 작업이었나 — 379 는 균등분할 쪽만 고쳤고 4칸 격자는 «이미 맞다» 고 봤다.
 * 실제로 맞았던 것은 **c2 하나**다(`node tools/probe379.js` 수리 전):
 *     칸1 오버행 좌 −6.00 우 −7.50 · 칸2 좌 +11.50 우 +12.00 ✔ · 칸3 좌 −12.00 우 −2.50 · 칸4 좌 −2.50 우 −6.00
 * 뿌리는 옛 CSS 가 측정표 07 §9 「탭 경계 73/295/547/777/1006」 을 그대로 옮겨 적은 것인데,
 * 같은 표의 379 정오표가 **그 다섯 중 칸 경계는 777 하나뿐**이라고 밝혔다(295·547 은 알약 변,
 * 73·1006 은 패딩 변). 그래서 c1·c3·c4 는 «비활성 라벨이 맞는 자리» 였고 활성이 되는 순간
 * **칸 == 알약**이었다 — 379 가 균등분할 쪽에서 고친 것과 **같은 결함**이다.
 *
 * ⚑ **[2] 가 이 게이트의 못이다 — ref 잉크 중심**. 「탭 경계」 에서 파생되지 않은 독립 실측이라
 *    격자 기준 상자를 바깥으로 옮긴 것이 옳은지를 **ref 픽셀이 직접** 말한다(측정표 07 §9 «라벨·아이콘»):
 *      바 바깥 좌변(ref 65) 기준 ref 중심 117.5 / 354.5 / 593 / 831
 *      수리 전 118 / 356.5 / **598.5** / 829.5   (Δ +0.5 +2.0 **+5.5** −1.5 · 합 9.5)
 *      수리 후 118.75 / 356.25 / **593.75** / 831.25 (Δ +1.25 +1.75 **+0.75** +0.25 · 합 4.0)
 *
 * ⚑ **«기대값만 갈지» 않았다**(LESSONS 328-330) — 격자는 **비활성 칸으로만** 재고 활성 알약의
 *    오버행을 **따로** 묻는다. 숫자만 `ow/4` 로 고치면 «칸 == 알약» 이던 옛 그림도 초록이기 때문이다.
 *    그리고 §R 이 «389 를 되돌리면 빨개지는가» 를 옛 네 줄을 실제로 주입해 실행한다.
 *
 * [3]-(가) 기계적 검증 — DOM 실측 판정이라 비평가를 띄우지 않는다. 재현기는 `node tools/probe379.js`.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');   /* 967 — 활성 주입 공용 부품(한 틱) */
const { chromium } = pw();

const W = 1080, H = 2280;
const OVER = 11.75;          /* ⓑ — 한 면당(ref 총 23.5 를 좌우로 나눈 값 · 379) */
const TOL = 0.6;
/* [2] — 측정표 07 §9 «라벨·아이콘» 잉크 중심, **바 바깥 좌변(ref 65) 기준**.
   c1 «장비» 182.5 · c2 «스킬»(활성) 419.5 · c3 자물쇠 (634+682)/2 = 658 · c4 자물쇠 (872+920)/2 = 896.
   허용 ±2.5 — 같은 표가 스스로 «잉크중심 182.5 vs 탭중심 184 → 가운데 (−1.5)» 라고 적어 둔 폭이다. */
const REF_CENTER = [117.5, 354.5, 593, 831];
const REF_TOL = 2.5;

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); } };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? TOL : t);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);

/* 살아 있는 4칸 격자 호스트 넷. verify47·probe379 와 같은 진입 경로(부품이 하나임을 그 게이트들이 못박았다). */
const HOSTS = [
  ['06 장비', '#eqTabs', () => { goTab('hero', true); heroSubGo('eq'); }],
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['50 코스튬', '#bCos .stabs', () => { goTab('hero', true); heroSubGo('cos'); }],
  ['26 펫', '#bPet .stabs', () => { goTab('hero', true); heroSubGo('pet'); }],
];

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

/* ⚑ probe378·379 교훈 — «내가 켠 칸» 이 아니라 **지금 실제로 켜져 있는 칸**을 돌려준다
   (renderUI() 가 매 틱 `.on` 을 다시 그리는 바가 있다). 좌표는 전부 바 «바깥» 좌변 기준. */
/* ⚑⚑ 967 (2026-09-06) — **켜기와 읽기가 한 evaluate 다.**
   전에는 `SETON` · `SETTLE` · `READ` 세 evaluate 였고 그 사이가 **틱 경계**였다. 제품이 그 바를
   소유하면 심은 활성이 그 틈에 되돌려지는데(963), 이 자는 `g.onIdx` 로 **되읽은 칸을 그대로 채점**했다
   — 칸1 이 두 번 채점되고 칸3 은 한 번도 안 재지면서 **점수 줄 수는 그대로**라 초록이었다.
   ⇒ 심기는 공용 부품 `__stab967.set` 이 이 evaluate **안에서** 한다(`tools/stab967.js`).
      i 를 넘기면 켜기를 겸하고, 생략하면 읽기만 한다. `want` 로 «내가 켠 칸» 을 같이 돌려주므로
      부른 쪽이 «켠 칸을 그대로 쟀는가» 를 **점수 줄로** 물 수 있다. */
const READ = ([sel, i]) => {
  const bar = document.querySelector(sel);
  if (!bar) return { missing: true };
  const want = i == null ? null : window.__stab967.set(sel, i);
  if (want === -2) return { missing: true };
  const cs = getComputedStyle(bar);
  const bb = bar.getBoundingClientRect();
  const s = bb.width / bar.offsetWidth;                 /* 입장 연출 스케일 */
  if (!isFinite(s) || s <= 0) return { missing: true, hidden: true };
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  const seps = [...bar.querySelectorAll(':scope > .stab-sep')];
  return {
    want: i == null ? null : i,      /* 967 — «내가 켠 칸». onIdx 와 다르면 그 판은 못 잰 것이다 */
    ow: bb.width / s,
    bw: parseFloat(cs.borderLeftWidth),
    n: cells.length,
    sp: bar.classList.contains('sp2') ? 2 : bar.classList.contains('sp3') ? 3 : 0,
    /* `'stab-c1'.slice(6)` = '1' — 접두어 `stab-c` 가 6글자다(7 로 자르면 전부 빈 문자열이 된다) */
    grid: cells.map(c => (([...c.classList].find(k => /^stab-c[0-9]+$/.test(k)) || '').slice(6)) | 0),
    onIdx: cells.findIndex(c => c.classList.contains('on')),
    cells: cells.map(c => {
      const r = c.getBoundingClientRect();
      return { l: (r.x - bb.x) / s, w: r.width / s,
        on: c.classList.contains('on'), label: (c.querySelector('i') || {}).textContent || '' };
    }),
    seps: seps.map(e => { const r = e.getBoundingClientRect();
      return { l: (r.x - bb.x) / s, w: r.width / s }; }),
  };
};

/* 967 — `SETON` 은 **선언째 지웠다**(402 «사본을 지운다»). 남겨 두면 다음 세션이 다시
   «두 evaluate» 로 쓴다(963 이 probe379·verify379 에서 같은 이유로 지웠다).
   심는 손잡이는 `__stab967.set` 하나이고 그것은 `READ` **안에서만** 불린다. */

/* 한 바를 «지금 켜져 있는 칸» 기준으로 채점한다 — verify379.grade 와 **같은 규약**이다. */
function grade(g, tag) {
  const n = g.n, ow = g.ow, C = ow / n;                 /* ⓐ — 나누는 상자는 «바깥» 이다 */
  const padL = g.bw, padR = ow - g.bw;
  const on = g.onIdx;
  const rest = g.cells.map((c, i) => ({ c, i })).filter(o => o.i !== on);

  ok(tag + ' 전제 — 활성 칸 정확히 1개 (알약은 칸과 상자가 다르다)',
    g.cells.filter(c => c.on).length === 1, '활성 idx ' + on);

  /* ⓐ 격자 — 비활성 칸으로만 잰다 */
  ok(tag + ' ⓐ 칸 폭 = 바깥 ÷' + n + ' = ' + f2(C) + '  (패딩 ÷' + n + ' = ' + f2((ow - g.bw * 2) / n) + ' 이 아니다)',
    rest.every(o => near(o.c.w, C)), rest.map(o => f2(o.c.w)).join(' / '));
  rest.forEach(o => ok(tag + ' ⓐ 칸' + (o.i + 1) + ' 왼끝 = 바깥 ' + o.i + '/' + n + ' 지점',
    near(o.c.l, C * o.i), f2(o.c.l) + ' vs ' + f2(C * o.i)));
  if (on !== 0) ok(tag + ' ⓐ 첫 칸 왼끝 = 바 바깥 왼끝 (0)', near(g.cells[0].l, 0), f2(g.cells[0].l));
  if (on !== n - 1) ok(tag + ' ⓐ 끝 칸 오른끝 = 바 바깥 오른끝 (' + f2(ow) + ')',
    near(g.cells[n - 1].l + g.cells[n - 1].w, ow), f2(g.cells[n - 1].l + g.cells[n - 1].w));

  /* ⓑ·ⓒ 활성 알약 */
  if (on >= 0) {
    const p = g.cells[on], gl = C * on, gr = gl + C;
    const first = on === 0, last = on === n - 1;
    ok(tag + ' ⓑ 알약 좌 ' + (first ? 'ⓒ 패딩 왼변에 붙음' : '오버행 +' + OVER),
      first ? near(p.l, padL) : near(gl - p.l, OVER),
      first ? f2(p.l) + ' vs 패딩 ' + f2(padL) : '+' + f2(gl - p.l));
    ok(tag + ' ⓑ 알약 우 ' + (last ? 'ⓒ 패딩 오른변에 붙음' : '오버행 +' + OVER),
      last ? near(p.l + p.w, padR) : near(p.l + p.w - gr, OVER),
      last ? f2(p.l + p.w) + ' vs 패딩 ' + f2(padR) : '+' + f2(p.l + p.w - gr));
    ok(tag + ' ⓑ 알약 폭 = 칸 + 자유로운 면의 오버행',
      near(p.w, C + (first ? -g.bw : OVER) + (last ? -g.bw : OVER), 0.8),
      f2(p.w) + ' vs 칸 ' + f2(C));
    /* ⓒ 는 «378 이 얹혀 있는 자리» 다 — 알약이 패딩을 넘으면 셸 검정을 덮는다 */
    ok(tag + ' ⓒ 알약이 패딩 상자를 안 넘는다 (셸 검정 보존 — 378)',
      p.l >= padL - TOL && p.l + p.w <= padR + TOL,
      f2(p.l) + '..' + f2(p.l + p.w) + ' / 패딩 ' + f2(padL) + '..' + f2(padR));
  }
  /* 칸은 배경이 없어 테두리 밑에 들어가도 되지만 **바 바깥**은 못 넘는다 */
  ok(tag + ' 모든 칸이 바 바깥 안 (돌출 0)',
    g.cells.every(c => c.l >= -TOL && c.l + c.w <= ow + TOL),
    g.cells.map(c => f2(c.l) + '..' + f2(c.l + c.w)).join(' '));
}

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);                                  /* 967 */
    await page.goto('file://' + path.resolve(process.env.V389_SRC || path.join(__dirname, '..', 'index.html')));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });

    /* ── [1] 살아 있는 4칸 호스트 순회 — 칸을 하나씩 켜서 «끝 칸» 과 «가운데 칸» 을 모두 본다 */
    console.log('\n[1] 4칸 격자 호스트 — 칸 격자(ⓐ) · 활성 알약 오버행(ⓑ·ⓒ)');
    let seen = 0;
    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) {
        ok(name + ' 진입', false, e.message.slice(0, 60)); continue;
      }
      await page.waitForTimeout(650);
      await page.evaluate(SETTLE);
      const g0 = await page.evaluate(READ, [sel]);
      if (g0.missing) { ok(name + ' 바를 찾음', false, g0.hidden ? '숨김' : '없음'); continue; }
      seen++;
      console.log('\n── ' + name + ' (' + sel + ', ' + g0.n + '칸, 바깥 ' + f2(g0.ow) + ')');
      /* 전제 — 이 바는 «균등분할 선언이 없는» 4칸 격자다(있으면 379 의 자가 본다). */
      ok(name + ' 전제 — .spN 선언 없음 + 4칸 + `.stab-c1~c4` 가 순서대로 붙어 있다',
        g0.sp === 0 && g0.n === 4 && g0.grid.join(',') === '1,2,3,4',
        '.sp' + g0.sp + ' / ' + g0.n + '칸 / c' + g0.grid.join(',c'));
      for (let i = 0; i < g0.n; i++) {
        const g = await page.evaluate(READ, [sel, i]);
        /* 967 — «켠 칸을 그대로 쟀는가» 를 **점수 줄**로 묻는다. 전에는 어긋나도 조용히
           되읽은 칸을 채점했다(칸1 두 번 · 칸3 0번, 총점은 그대로) — 이제는 빨개진다. */
        ok('[' + name + ' 칸' + (i + 1) + '] 전제 — 켠 칸을 그대로 쟀다 (한 틱 · 967)',
          !g.missing && g.onIdx === i, g.missing ? '바 없음' : '켠 칸 ' + (i + 1) + ' → 잰 칸 ' + (g.onIdx + 1));
        if (g.missing || g.onIdx !== i) continue;
        grade(g, '[' + name + ' 칸' + (g.onIdx + 1) + ' «' + g.cells[g.onIdx].label + '»]');
      }
    }
    ok('4칸 격자 호스트를 ' + HOSTS.length + '곳 모두 쟀다', seen === HOSTS.length, seen + '/' + HOSTS.length + '곳');

    /* ── [2] ref 잉크 중심 — 「탭 경계」 에서 파생되지 않은 **독립 실측**이 격자를 검산한다.
       ref 07 은 «스킬»(c2) 이 활성인 화면이므로 **같은 상태**로 맞춰 놓고 잰다
       (c1·c4 는 알약이 되면 ⓒ 로 한쪽만 붙어 중심이 옮겨간다 — 상태가 다르면 비교가 안 된다). */
    console.log('\n[2] ref 잉크 중심 검산 — 07 스킬 시트, c2 «스킬» 활성 (ref 와 같은 상태)');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(650);
    await page.evaluate(SETTLE);
    const gr = await page.evaluate(READ, ['#bSk .stabs', 1]);   /* 967 — 켜기·읽기 한 틱 */
    ok('전제 — 07 시트 바를 c2 활성으로 잡았다 (켠 칸을 그대로 쟀다 · 967)',
      !gr.missing && gr.onIdx === 1, gr.missing ? '없음' : '활성 idx ' + gr.onIdx);
    if (!gr.missing && gr.onIdx === 1) {
      let sum = 0;
      REF_CENTER.forEach((r, i) => {
        const c = gr.cells[i], cx = c.l + c.w / 2;
        sum += Math.abs(cx - r);
        ok('[2-' + (i + 1) + '] 칸' + (i + 1) + '«' + c.label + '» 중심 = ref ' + r + ' (±' + REF_TOL + ')',
          near(cx, r, REF_TOL), f2(cx) + ' vs ref ' + r + ' → Δ' + f2(cx - r));
      });
      /* 수리 전 합은 9.5 였다(c3 혼자 5.5). 그 값을 문턱으로 박아 «옛 격자면 빨강» 을 한 항으로 남긴다. */
      ok('[2-합] ref 중심과의 |Δ| 합 ≤ 5.0 (수리 전 9.5 — c3 혼자 5.5)', sum <= 5.0, '합 ' + f2(sum));
    }

    /* ── [3] 구분선 — 4칸 격자에만 있다. 그 자리가 곧 c3·c4 칸 경계임을 못박는다.
       (352 가 ref 커버리지 적분으로 확정한 중심은 콘텐츠 706.43 = 바깥 712.43 이고,
        389 의 칸 경계는 바깥 3×237.5 = 712.5 다 — 같은 자리라는 뜻이다.) */
    console.log('\n[3] `.stab-sep` — 3·4칸 경계에 앉아 있는가');
    ok('구분선 1개', gr.seps && gr.seps.length === 1, (gr.seps || []).length + '개');
    if (gr.seps && gr.seps.length === 1) {
      const c = gr.seps[0].l + gr.seps[0].w / 2, edge = gr.ow * 3 / 4;
      ok('구분선 중심 = c3·c4 칸 경계 (바깥 3/4 = ' + f2(edge) + ')', near(c, edge, 0.8),
        f2(c) + ' vs ' + f2(edge));
    }

    /* ── [R] 되돌림 시험 — 389 이전 네 줄(측정표 「탭 경계」 를 옮겨 적은 리터럴)을 주입하면 빨개지는가.
       ⚑ 이 절이 없으면 이 게이트는 «값을 갈아 끼운 자» 와 구별되지 않는다(LESSONS 328-330 · 43-①). */
    console.log('\n[R] 되돌림 시험 — 389 이전 CSS(리터럴 네 쌍)를 주입하면 ⓐ·ⓑ·[2] 가 빨개지는가');
    const before = await page.evaluate(READ, ['#bSk .stabs']);
    const REVERT = `.stab-c1,.stab-c1.on{left:0px!important;width:224px!important}
      .stab-c2,.stab-c2.on{left:220px!important;width:261px!important}
      .stab-c3,.stab-c3.on{left:481px!important;width:223px!important}
      .stab-c4,.stab-c4.on{left:709px!important;width:229px!important}`;
    await page.addStyleTag({ content: REVERT });
    await page.waitForTimeout(120);
    const rev = await page.evaluate(READ, ['#bSk .stabs']);
    const C = rev.ow / rev.n;
    ok('[R-a] 되돌리면 칸 폭이 서로 다르다 (균등 격자가 아니다 — 바깥 ÷4 = ' + f2(C) + ')',
      !rev.cells.every(c => near(c.w, C)),
      rev.cells.map(c => f2(c.w)).join(' / '));
    /* 437 — 기대값 −7.5 는 «주입 리터럴 224 + 테두리 6 − 237.5» 였다. 테두리가 7 이 되자
       −6.5 가 되어 이 항이 빨개졌다(주입도 제품도 옳은데 **상수만 옛 테두리를 물고 있었다**).
       리터럴을 다시 적지 않고 **주입값에서 되돌린다** — `bw + 224 − 바깥/4`. */
    ok('[R-b] 되돌리면 c1 이 «칸 == 알약» 이다 (오버행 좌 −bw · 우 ' + f2(rev.bw + 224 - C) + ')',
      near(rev.cells[0].l, rev.bw) && near(rev.cells[0].l + rev.cells[0].w - C, rev.bw + 224 - C, 0.8),
      '칸1 ' + f2(rev.cells[0].l) + '..' + f2(rev.cells[0].l + rev.cells[0].w) + ' / 칸 0..' + f2(C));
    ok('[R-c] 되돌리면 c3 중심이 ref(593) 에서 5px 넘게 벌어진다',
      Math.abs(rev.cells[2].l + rev.cells[2].w / 2 - REF_CENTER[2]) > REF_TOL,
      f2(rev.cells[2].l + rev.cells[2].w / 2) + ' vs ref ' + REF_CENTER[2]);
    /* 437 — 주입 리터럴 709+229 = **938** 은 «옛 패딩 폭»(950 − 2×6)이다. 테두리가 7 이 되면
       패딩 폭은 936 이라 938 은 2px 넘치고, 끝 칸 오른끝은 `bw + 938` 이 된다 — 옛 기대식
       `ow − bw` 는 테두리 6 에서만 우연히 같았다. 주입값으로 되돌려 적는다. */
    ok('[R-d] 되돌리면 끝 칸 오른끝이 바깥 오른끝에 못 미친다 (−' + f2(rev.ow - (rev.bw + 938)) + ')',
      near(rev.cells[3].l + rev.cells[3].w, rev.bw + 938) && !near(rev.cells[3].l + rev.cells[3].w, rev.ow),
      f2(rev.cells[3].l + rev.cells[3].w) + ' vs 바깥 ' + f2(rev.ow));
    /* 원복 — 주입한 자를 걷으면 다시 389 값이어야 한다(주입이 영구 오염이 아님을 못박는다) */
    await page.evaluate(() => {
      [...document.querySelectorAll('style')].forEach(s => {
        if (s.textContent.includes('224px!important')) s.remove();
      });
    });
    await page.waitForTimeout(120);
    const after = await page.evaluate(READ, ['#bSk .stabs']);
    ok('[R-e] 자를 걷으면 389 값으로 돌아온다 (주입이 영구 오염이 아니다)',
      after.cells.every((c, i) => near(c.w, before.cells[i].w) && near(c.l, before.cells[i].l)),
      after.cells.map(c => f2(c.w)).join('/') + ' vs ' + before.cells.map(c => f2(c.w)).join('/'));
    /* 음성 대조 — 되돌림이 «아무거나 흔들면 빨개지는» 자가 아님을 보인다:
       알약과 무관한 값(높이)을 흔들면 위 항들은 그대로 초록이어야 한다. */
    const noise = await page.addStyleTag({ content: '.stabs>*{top:0px!important}' });
    await page.waitForTimeout(80);
    const nz = await page.evaluate(READ, ['#bSk .stabs']);
    ok('[R-f] 음성 대조 — 가로와 무관한 값을 흔들어도 격자는 초록이다',
      nz.cells.every((c, i) => near(c.w, before.cells[i].w) && near(c.l, before.cells[i].l)),
      nz.cells.map(c => f2(c.l)).join('/'));
    await noise.evaluate(el => el.remove());

    console.log('\n[E] 콘솔');
    ok('콘솔·페이지 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | ') || '0건');

    console.log('\nVERIFY389 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
    process.exit(fail ? 1 : 0);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
