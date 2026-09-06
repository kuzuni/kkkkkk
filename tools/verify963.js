/* 작업 963 — «`tools/probe379.js` ⓑ 오버행 절이 탭 전환 렌더를 안 기다린다» 게이트.
 *
 *   node tools/verify963.js
 *
 * ⚑ 등재문의 진단은 **절반만 맞았다.** «탭을 누른 다음 프레임에 `.on` 이 옮겨 간다» 가 아니다 —
 *   probe379 는 탭을 **누르지 않는다**(클래스를 심는다). 실제로 일어나는 일은 그 반대다:
 *   심은 활성을 **제품이 되돌린다**. `renderRunes()`(index.html ~40219)가
 *   `el.classList.toggle('on', el.dataset.trsub === trSub)` 로 `#trSubs` 의 `.on` 을
 *   `trSub`(기본 `'train'` = 칸1)로 다시 그린다. 그래서 되돌아가는 칸은 언제나 **칸1** 이고,
 *   그것이 등재문이 적은 지문(«칸1·칸2·칸1»)의 정체다.
 *
 * 실측(963 1회차):
 *   · 되돌림까지 **72.5ms** — 현행 `SETTLE`(rAF 2회 ≈ 32ms)로는 못 넘는다.
 *   · 틱을 넘기는 경로 20회 중 **3회**(15%) 어긋남 · 같은 틱 경로 **0/20**.
 *   · probe379 3회 실행 중 1회에서 ⓑ 가 «칸3 «단련»» 자리에 **칸1 «훈련» 을 한 번 더** 찍었다.
 *
 * 처방은 등재문 후보 ⓑ — **켜기와 읽기를 한 evaluate 안에서**(틱을 안 넘는다). `.stab`/`.stab.on`
 * 은 전환(transition)이 없는 순수 클래스 기하라 같은 틱의 `getBoundingClientRect()` 가 최종값이다.
 * 문턱·허용치는 한 칸도 안 넓혔다 — 수리 뒤 숫자는 수리 전 «정상 판» 과 **한 자도 안 다르다**.
 *
 * ⚠ 이 자가 지키는 것 넷:
 *   [1] 위험이 실재한다 — 틱을 넘기면 제품이 되돌린다(결정적).
 *   [2] 수리가 실제로 막는다 — 같은 틱은 30회 전부 «켠 칸» 을 돌려준다.
 *   [3] 구조 래칫 — 두 자가 다시 «두 evaluate» 로 돌아가지 못한다.
 *   [4] 행동 — probe379 의 ⓑ 표에 같은 칸이 두 번 찍히지 않는다.
 *   [R] 되돌림 시험 — 원자성과 가드를 걷어낸 사본은 **963 지문(같은 칸 두 번)** 을 그대로 낸다.
 *
 * [3]-(가) 기계적 검증 — DOM·소스 실측 판정이라 비평가를 띄우지 않는다.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (t, c, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : '  FAIL ') + t + (d ? '  — ' + d : '')); };

const N = 30;                       /* 반복 횟수 — 15% 짜리 갈림이면 30회에 안 나올 확률은 0.7% */
const CROSS_MS = 140;               /* 되돌림 72.5ms 보다 확실히 큰 대기 = 결정적 «틱 넘김» */
const BAR = '#trSubs';              /* 제품이 `.on` 을 소유하는 바(963 의 유일한 흔들림 호스트) */
const CELL = 2;                     /* 칸3 «단련» — 되돌아가면 칸1 이 된다 */

/* 켜기만 — «두 evaluate» 옛 경로를 재현할 때 쓴다 */
const SETON = ([sel, i]) => {
  const cells = [...document.querySelectorAll(sel + ' > .stab')];
  if (!cells[i]) return false;
  cells.forEach((c, j) => c.classList.toggle('on', j === i));
  return true;
};
const ONIDX = ([sel]) =>
  [...document.querySelectorAll(sel + ' > .stab')].findIndex(c => c.classList.contains('on'));
/* 켜기 + 읽기를 한 틱에 — 수리가 쓰는 경로 */
const SET_READ = ([sel, i]) => {
  const cells = [...document.querySelectorAll(sel + ' > .stab')];
  if (!cells[i]) return null;
  cells.forEach((c, j) => c.classList.toggle('on', j === i));
  cells[i].getBoundingClientRect();                 /* 강제 리플로 — 실제 자와 같은 순서 */
  return cells.findIndex(c => c.classList.contains('on'));
};

/* ── 소스 래칫 도우미 ───────────────────────────────────────────── */
const src = f => fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

/* probe379 의 ⓑ 표에서 «칸n» 순서를 뽑는다 — 호스트별 */
function bCells(out) {
  const hosts = {};
  let cur = null, inB = false;
  out.split('\n').forEach(L => {
    const h = L.match(/^── (.+?)\s+\(/);
    if (h) { cur = h[1]; inB = false; hosts[cur] = hosts[cur] || []; return; }
    if (/ⓑ 오버행/.test(L)) { inB = true; return; }
    if (!inB || !cur) return;
    const m = L.match(/^\s+칸(\d+)/);
    if (m) hosts[cur].push(+m[1]);
  });
  return hosts;
}
const dup = arr => arr.length !== new Set(arr).size;

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.evaluate(() => goTab('grow'));
    await page.waitForTimeout(700);

    /* ── [1] 전제 — 위험이 실재한다. 틱을 넘기면 제품이 되돌린다. ─────────── */
    console.log('\n[1] 전제 — 제품이 ' + BAR + ' 의 `.on` 을 소유한다 (틱을 넘기면 되돌아온다)');
    const n = await page.evaluate(([sel]) => document.querySelectorAll(sel + ' > .stab').length, [BAR]);
    ok('[1-0] 전제 — ' + BAR + ' 가 살아 있고 칸이 3개다', n === 3, n + '칸');

    /* ⚑ 되돌림을 **벽시계로** 재는 항은 만들지 않는다 — 그것이 963 이 고치는 병이다.
       기계는 «제품 렌더가 한 번 돌면 되돌아간다» 이므로 그 렌더를 **직접 불러** 결정적으로 묻는다. */
    let back = 0; const backTo = new Set();
    for (let k = 0; k < N; k++) {
      const got = await page.evaluate(([sel, i]) => {
        const cells = [...document.querySelectorAll(sel + ' > .stab')];
        if (!cells[i]) return -9;
        cells.forEach((c, j) => c.classList.toggle('on', j === i));
        renderTrain();                                /* 제품 렌더 한 번 (renderRunes 를 지난다) */
        return [...document.querySelectorAll(sel + ' > .stab')]
          .findIndex(c => c.classList.contains('on'));
      }, [BAR, CELL]);
      if (got !== CELL) { back++; backTo.add(got); }
    }
    ok('[1-a] 제품 렌더가 **한 번만** 돌아도 심은 활성이 ' + N + '회 전부 되돌려진다',
      back === N, back + '/' + N + '회');
    ok('[1-b] 되돌아가는 칸은 언제나 칸1 이다 (`trSub` 기본값 `train` — 963 지문)',
      backTo.size === 1 && backTo.has(0), '칸 ' + [...backTo].map(i => i + 1).join(''));

    /* 관측만 — 벽시계 되돌림률. **점수 줄이 아니다**(판마다 갈리는 값에 점수를 걸면
       이 자 자신이 963 이 된다). 963 1회차 실측: rAF 2회 경로 3/20 · 140ms 12/30. */
    let wall = 0;
    for (let k = 0; k < N; k++) {
      if (!await page.evaluate(SETON, [BAR, CELL])) break;
      await page.waitForTimeout(CROSS_MS);
      if (await page.evaluate(ONIDX, [BAR]) !== CELL) wall++;
    }
    console.log('  (관측) 그냥 ' + CROSS_MS + 'ms 기다리기만 해도 ' + wall + '/' + N
      + '회 되돌려진다 — 점수 줄 아님');

    /* ── [2] 수리 — 같은 틱은 «켠 칸» 을 그대로 돌려준다 ─────────────────── */
    console.log('\n[2] 수리 — 켜기와 읽기가 한 틱이면 안 흔들린다');
    let miss = 0;
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < n; i++) {
        const got = await page.evaluate(SET_READ, [BAR, i]);
        if (got !== i) miss++;
      }
    }
    ok('[2-a] 같은 틱 — ' + (N * n) + '회 전부 «켠 칸» 을 돌려준다 (어긋남 0)',
      miss === 0, miss + '건 어긋남');

    /* 같은 틱 값이 «최종값» 인가 — 이것이 «한 틱이면 충분하다» 의 근거다.
       ⚠ 이 항을 살아 있는 바에서 재면 안 된다 — rAF 2회를 기다리는 동안 **제품이 되돌려**
         알약(288.16)이 맨 칸(264.66)으로 바뀐다. 그러면 이 자가 판마다 갈린다(실측 2/4 회 빨강).
         측정 대상은 «전환이 있는가» 하나이므로, 제품이 소유하지 않는 **합성 바**에서 잰다
         (verify379 [2] 가 `.sp2` 를 심어 쓰는 것과 같은 손잡이). */
    const box = await page.evaluate(async () => {
      const host = document.createElement('div');
      host.className = 'stabs sp3'; host.id = '__t963';
      host.style.cssText = 'position:absolute;left:143px;top:300px;width:794px';
      host.innerHTML = '<div class="stab"><i>가</i></div><div class="stab"><i>나</i></div>'
        + '<div class="stab"><i>다</i></div>';
      document.getElementById('app').appendChild(host);
      const cells = [...host.querySelectorAll(':scope > .stab')];
      cells.forEach((c, j) => c.classList.toggle('on', j === 1));
      const a = cells[1].getBoundingClientRect();
      const now = { l: a.x, w: a.width };
      const cs = getComputedStyle(cells[1]);
      const tr = cs.transitionDuration + ' / ' + cs.animationDuration;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const b = cells[1].getBoundingClientRect();
      const later = { l: b.x, w: b.width };
      host.remove();
      return { now, later, tr };
    });
    ok('[2-b] 같은 틱 상자 = rAF 2회 뒤 상자 (전환이 없다 — 빠른 값이 곧 최종값)',
      Math.abs(box.now.l - box.later.l) < 0.01 && Math.abs(box.now.w - box.later.w) < 0.01,
      box.now.w.toFixed(2) + ' → ' + box.later.w.toFixed(2));
    ok('[2-c] `.stab.on` 에 전환·애니메이션이 선언돼 있지 않다 (같은 틱이 최종값인 이유)',
      /^0s/.test(box.tr) && / 0s$/.test(box.tr), box.tr);

    /* ── [3] 구조 래칫 — 두 자가 «두 evaluate» 로 못 돌아간다 ──────────── */
    console.log('\n[3] 구조 래칫 — 활성 주입과 읽기가 한 evaluate 안에 있다');
    const P = src('probe379.js'), V = src('verify379.js');
    ok('[3-a] probe379 — `SETON`/`SETOFF` 선언이 없다 (사본을 남기면 다시 두 evaluate 가 된다)',
      count(P, /^const SET(ON|OFF)\s*=/m) === 0, count(P, /^const SET(ON|OFF)\s*=/m) + '건');
    ok('[3-b] probe379 — 켜기·읽기를 겸하는 `SET_READ` 로만 읽는다',
      /^const SET_READ\s*=/m.test(P) && count(P, /evaluate\(SET_READ,/g) >= 2
      && count(P, /evaluate\(READ[,)]/g) === 0,
      'SET_READ 호출 ' + count(P, /evaluate\(SET_READ,/g) + '곳');
    ok('[3-c] probe379 — 켠 칸과 읽은 칸이 다르면 **값을 안 찍고** 신고한다',
      /r\.onIdx\s*!==\s*i/.test(P) && /못 쟀다/.test(P), '가드 있음');
    ok('[3-d] verify379 — `SETON` 선언이 없다', count(V, /^const SETON\s*=/m) === 0,
      count(V, /^const SETON\s*=/m) + '건');
    ok('[3-e] verify379 — `READ([sel, i])` 가 켜기를 겸한다 (한 틱)',
      /evaluate\(READ,\s*\[sel,\s*i\]\)/.test(V), '한 틱 호출 있음');
    ok('[3-f] verify379 — «켠 칸을 그대로 쟀다» 가 **점수 줄**이다 (조용한 대체 금지)',
      /켠 칸을 그대로 쟀다/.test(V), '점수 줄 있음');

    /* ── [4] 행동 — probe379 의 ⓑ 표에 같은 칸이 두 번 안 찍힌다 ────────── */
    console.log('\n[4] 행동 — probe379 를 실제로 돌려 ⓑ 표를 본다');
    const nowOut = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'probe379.js')],
      { encoding: 'utf8', timeout: 180000 });
    const nowB = bCells(nowOut);
    const tr = nowB['23 훈련'] || [];
    ok('[4-a] 23 훈련 ⓑ 가 세 칸을 각각 한 번씩 찍는다', tr.join(',') === '1,2,3', '칸 ' + (tr.join(',') || '없음'));
    const anyDup = Object.keys(nowB).filter(h => dup(nowB[h]));
    ok('[4-b] 어느 호스트에도 같은 칸이 두 번 안 찍힌다', anyDup.length === 0, anyDup.join(', ') || '0곳');
    ok('[4-c] 못 잰 칸이 0개다 (가드가 조용히 삼킨 자리가 없다)',
      !/못 쟀다/.test(nowOut), /못 쟀다/.test(nowOut) ? '신고 있음' : '0건');

    /* ── [R] 되돌림 시험 — 원자성·가드를 걷어낸 사본은 963 지문을 낸다 ──── */
    console.log('\n[R] 되돌림 시험 — 963 이전 모양(두 evaluate + 조용한 대체)으로 되돌린 사본');
    const tmp = path.join(os.tmpdir(), 'probe379-revert963.js');
    let R = P, subs = 0;
    /* ⚑ 964 교훈 — 치환문은 리터럴로 굳히지 말고 **본체에서 파생**시키고,
       «사본이 실제로 달라졌다» 를 전제 항으로 먼저 묻는다. */
    const sub = (re, to) => { const before = R; R = R.replace(re, to); if (R !== before) subs++; };
    sub(/require\('\.\/pwlaunch'\)/, JSON.stringify(path.join(ROOT, 'tools', 'pwlaunch')).replace(/^/, 'require(').replace(/$/, ')'));
    sub(/path\.resolve\(__dirname,\s*'\.\.'\)/, JSON.stringify(ROOT));
    /* ① 원자성 제거 — 켜기와 읽기를 두 evaluate 로 가른다.
       ⚠ 그 사이를 **벽시계로 벌리지 않는다** — 그러면 이 자가 963 이 된다(관측 13/30 · 재현율이
       판마다 갈려 [R] 이 3항씩 빨개졌다). 틱 사이에 실제로 일어나는 일 = «제품 렌더 한 번» 을
       직접 불러 결정적으로 재현한다([1-a] 가 그 등가를 30/30 으로 못박아 둔다). */
    sub(/const r = await page\.evaluate\(SET_READ, \[sel, i\]\);/,
      'await page.evaluate(([s, k]) => { const cs = [...document.querySelectorAll(s + " > .stab")];'
      + ' if (cs[k]) cs.forEach((c, j) => c.classList.toggle("on", j === k)); }, [sel, i]);'
      + ' await page.evaluate(() => { try { renderTrain(); } catch (_) {} });'
      + ' const r = await page.evaluate(SET_READ, [sel, -2]);');
    /* ② 가드 제거 — 963 이전처럼 «지금 켜져 있는 칸» 으로 조용히 갈아 끼운다 */
    sub(/if \(r\.onIdx !== i\) \{[\s\S]*?\n\s*continue;\n\s*\}/, 'if (r.onIdx < 0) continue;');
    /* SET_READ 가 i<0 이면 전 칸을 끄므로, 되돌린 사본에서는 «읽기만» 하는 문이 필요하다 */
    sub(/if \(i >= 0 && !cells\[i\]\) return null;/,
      'if (i === -2) { /* 963 되돌림 — 읽기만 */ } else if (i >= 0 && !cells[i]) return null;');
    sub(/cells\.forEach\(\(c, j\) => \{\n    const on = i >= 0 && j === i;/,
      'if (i !== -2) cells.forEach((c, j) => {\n    const on = i >= 0 && j === i;');

    ok('[R-0] 전제 — 사본이 실제로 달라졌다 (치환 6건 전부 적용)', subs === 6, subs + '/6 건');
    let revOut = '', revErr = '';
    if (subs === 6) {
      fs.writeFileSync(tmp, R);
      try {
        revOut = execFileSync(process.execPath, [tmp], { encoding: 'utf8', timeout: 180000 });
      } catch (e) { revErr = String(e.message).slice(0, 120); revOut = (e.stdout || '') + ''; }
    }
    const revB = bCells(revOut);
    const revTr = revB['23 훈련'] || [];
    ok('[R-a] 되돌린 사본이 실행은 된다 (실패로 초록이 되는 자를 만들지 않았다)',
      !revErr && Object.keys(revB).length > 0, revErr || Object.keys(revB).length + '개 호스트');
    ok('[R-b] 되돌린 사본의 23 훈련 ⓑ 가 **963 지문**을 낸다 — 같은 칸을 두 번 찍는다',
      dup(revTr), '칸 ' + (revTr.join(',') || '없음'));
    ok('[R-c] 그 중복은 «칸1»(제품 기본값) 이다', revTr.filter(v => v === 1).length >= 2,
      '칸1 ' + revTr.filter(v => v === 1).length + '회');
    ok('[R-d] 같은 판에서 현행은 중복이 0 이다 (수리가 실제로 그 자리를 막는다)',
      tr.join(',') === '1,2,3' && dup(revTr), '현행 ' + tr.join(',') + ' ↔ 사본 ' + revTr.join(','));
    try { fs.unlinkSync(tmp); } catch (_) {}

    console.log('\n[E] 콘솔');
    ok('[E-a] 콘솔·페이지 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | ') || '0건');

    console.log('\nVERIFY963 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
    process.exit(fail ? 1 : 0);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
