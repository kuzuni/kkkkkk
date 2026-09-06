/* 967 게이트 — «활성 주입 → 읽기» 가 두 evaluate 인 자 여덟의 이관(963 의 전수판).
 *
 *   node tools/verify967.js      (1080x2280 · 헤드리스)
 *
 * 963 은 `probe379`·`verify379` 두 자에서 «켜기와 읽기가 두 evaluate» 를 접었다. 같은 꼴이
 * 자 여덟에 더 있었고(등재 967) 여덟이 **똑같은 `SETON` 사본**을 하나씩 들고 있었다.
 *
 * 이 자가 못박는 것 — 절 다섯:
 *   [1] **위험이 실재한다**(결정적) — 제품 렌더를 **직접 한 번** 부르면 심은 활성이 되돌려지는 바가
 *       있고, 되돌아가는 칸은 언제나 칸1 이다. ⚑ **963 의 호스트 표를 정정한다** — 그 표는 벽시계로만
 *       재서 `#rnSubs` 를 «제품 소유 아님(0/10)» 으로 적었지만, `renderRunes()` 를 직접 부르면
 *       `#trSubs` 와 **똑같이** 되돌아간다. 실화는 하나가 아니라 **둘**이다.
 *   [2] **수리가 막는다** — 같은 틱 경로는 어긋남 0. 그리고 «두 evaluate» 는 어긋나도
 *       **완전히 정상으로 보이는 값**(온전한 기하 + onIdx)을 돌려준다 — 그것이 «조용한 대체» 다.
 *   [3] **구조 래칫** — 여덟 자가 다시 «두 evaluate» 로 못 돌아간다(`SETON` 선언 0건 ·
 *       공용 부품을 심는다 · 켠 칸을 그대로 쟀는지 묻는 자리가 있다).
 *   [4] **행동** — `probe378` 을 실제로 돌려 제품 소유 바의 칸이 **하나도 안 빠지고** 재지는지 본다.
 *   [R] **되돌림 시험** — 원자성을 걷어낸 경로가 963 지문(칸3 자리에 칸1)을 그대로 낸다.
 *       ⚑ 964 교훈 — 리터럴로 굳히지 않고 **본체에서 파생**시키며, «사본이 실제로 달라졌다» 를
 *          [R-0] 전제 항으로 먼저 묻는다(본체가 바뀌면 [R] 이 «무엇도 안 재면서 초록» 이 되는 대신
 *          [R-0] 이 빨개진다).
 *
 * ⚠ 문턱·대기시간으로 덮지 않는다 — 되돌림은 **시간의 함수가 아니라 «제품 렌더가 도는지» 의 함수**다
 *   (963 §5-1 · 967 재현). 그래서 이 자의 판정 축은 전부 **제품 렌더 직접 호출**이고, 벽시계는
 *   **점수 없는 관측 줄**로만 찍는다.
 *
 * [3]-(가) 기계적 검증 — DOM·소스 실측 판정이라 비평가를 띄우지 않는다. 재현기는 `node tools/probe967.js`.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { install: stabInstall } = require('./stab967');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (t, c, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : '  FAIL ') + t + (d ? '  — ' + d : '')); };

const N = 30;

/* 여덟 자 — 967 등재문의 목록 그대로. 넷은 캡처가 안 끼고(ⓐ) 넷은 낀다(ⓑ). */
const TOOLS_A = ['probe378.js', 'verify378.js', 'verify389.js', 'verify449.js'];
const TOOLS_B = ['probe462.js', 'probe468.js', 'verify462.js', 'verify468.js'];
const TOOLS = TOOLS_A.concat(TOOLS_B);

/* 호스트 — 다섯째 칸이 **그 화면의 제품 렌더**다(963 이 `renderTrain()` 을 직접 부른 그 손잡이). */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }, () => renderSkill()],
  ['06 장비', '#eqTabs', () => heroSubGo('eq'), () => syncEquipPage()],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }, () => renderDun()],
  ['10 상점', '#shopCats', () => openShopPage(), () => renderShopPage()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, () => renderTrain()],
  ['23 룬', '#rnSubs', () => { goTab('grow'); }, () => renderRunes()],
];
/* 963 호스트 표가 «되돌림 있음» 으로 적은 자리 / 이 자가 더한 자리 */
const OWNED = ['#trSubs', '#rnSubs'];

const SETTLE = () => {
  const A = document.getAnimations ? document.getAnimations() : [];
  const P = A.filter(a => /^jz(Pg|Sheet)/.test(a.animationName || '')).map(a => a.finished.catch(() => 0));
  return Promise.all(P).then(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(P.length)))));
};

const ONIDX = ([sel]) =>
  [...document.querySelectorAll(sel + ' > .stab')].findIndex(c => c.classList.contains('on'));

/* ⚑ **음성 대조용 «클래스만 심기»** — 옛 `SETON` 이 하던 일 그대로다(verify963 이 같은 이유로
   자기 사본을 하나 들고 있다). 여덟 자에서는 이 꼴이 금지지만(래칫 [3-a]), **위험이 실재함을
   보이려면** 그 꼴이 필요하다. 이것은 판정 대상이 아니라 대조군이다. */
const SET_CLASS = ([sel, i]) => {
  const cells = [...document.querySelectorAll(sel + ' > .stab')];
  if (!cells[i]) return -2;
  cells.forEach((c, j) => c.classList.toggle('on', j === i));
  return cells.findIndex(c => c.classList.contains('on'));
};

/* [2]·[R] — «두 evaluate» 옛 경로가 돌려주던 것과 **같은 모양**의 읽기(기하까지 온전하다).
   요점은 «못 읽는다» 가 아니라 «틀린 칸을 읽고도 멀쩡해 보인다» 는 것이다. */
const READ_ONLY = ([sel]) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const cells = [...bar.querySelectorAll(':scope > .stab')];
  const idx = cells.findIndex(c => c.classList.contains('on'));
  if (idx < 0) return null;
  const b = cells[idx].getBoundingClientRect();
  return { idx, x: b.x, w: b.width, label: (cells[idx].querySelector('i') || {}).textContent || '' };
};

const src = f => fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8');
const count = (s, re) => (s.match(re) || []).length;

(async () => {
  const browser = await launch(chromium);
  const cerr = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await stabInstall(page);
    page.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });
    page.on('pageerror', e => cerr.push(String(e.message || e)));
    await page.goto('file://' + path.resolve(process.env.V967_SRC || path.join(ROOT, 'index.html')));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });

    console.log('══════ VERIFY 967 — «활성 주입 → 읽기» 원자성 전수 이관 ══════');

    /* ── [1] 위험이 실재한다 — 결정적 축(제품 렌더 직접 호출) ─────────── */
    console.log('\n[1] 위험이 실재한다 — 제품 렌더를 **직접 한 번** 부르면 어느 바가 되돌리는가');
    const owned = [];
    for (const [name, sel, setup, render] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { ok('[1] ' + name + ' 진입', false, e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      await page.evaluate(SETTLE);
      const n = await page.evaluate(([s]) => document.querySelectorAll(s + ' > .stab').length, [sel]);
      if (!n) { ok('[1] ' + name + ' 바를 찾음', false, '없음'); continue; }
      /* 칸2(=index 1)를 **클래스만** 심고 제품 렌더 한 번 — 되돌아가면 언제나 칸1 이어야 한다(963 §2).
         ⚠ 여기서 `__stab967.set` 을 쓰면 안 된다 — 그것은 제품 setter 까지 몰아 «되돌릴 것이 없게»
            만드는 **수리된 경로**라, 위험을 재는 이 절이 통째로 «소유 0곳» 으로 거짓 초록이 된다. */
      await page.evaluate(SET_CLASS, [sel, 1]);
      let after = null, threw = null;
      try { await page.evaluate(render); } catch (e) { threw = e.message.slice(0, 60); }
      after = await page.evaluate(ONIDX, [sel]);
      ok('[1] ' + name + ' — 제품 렌더를 실제로 불렀다 (이름이 틀리면 이 절이 통째로 거짓 초록이다)',
        threw === null, threw || 'ok');
      const rev = threw === null && after !== 1;
      if (rev) owned.push(sel);
      console.log('      ' + name + ' (' + sel + ') — ' + (rev ? '되돌려짐 → 칸' + (after + 1) : '살아남음'));
      if (rev) ok('[1] ' + name + ' — 되돌아가는 칸은 **칸1** 이다 (제품 기본값 · 963 §2)',
        after === 0, '칸' + (after + 1));
    }
    ok('[1-owned] 제품이 소유하는 바가 **' + OWNED.length + '곳**이다 (963 표 정정 — `#rnSubs` 포함)',
      OWNED.every(s => owned.includes(s)) && owned.length === OWNED.length,
      owned.join(' · ') || '0곳');
    ok('[1-live] 위험이 **공허하지 않다** — 소유 바가 한 곳 이상 실재한다', owned.length >= 1, owned.length + '곳');

    /* ── [2] 수리가 막는다 + «조용한 대체» 의 정체 ────────────────────── */
    console.log('\n[2] 수리가 막는다 — 같은 틱 ' + N + '회 · 그리고 두 evaluate 가 «멀쩡해 보이는» 값을 낸다');
    const BAR = owned[0] || '#trSubs';
    await page.evaluate(() => { goTab('grow'); });
    await page.waitForTimeout(700);
    await page.evaluate(SETTLE);
    const nCell = await page.evaluate(([s]) => document.querySelectorAll(s + ' > .stab').length, [BAR]);
    const CELL = Math.max(1, nCell - 1);                 /* 마지막 칸 — 되돌아가면 칸1 이 된다 */
    const renderOf = HOSTS.find(h => h[1] === BAR)[3];

    /* [2-a] — 클래스만 심어도 **같은 틱**이면 어긋나지 않는다(963 처방의 핵심). */
    let atomBad = 0;
    for (let k = 0; k < N; k++) {
      const idx = await page.evaluate(([s, i]) => {
        const cells = [...document.querySelectorAll(s + ' > .stab')];
        cells.forEach((c, j) => c.classList.toggle('on', j === i));   /* 켜기 */
        document.querySelector(s).getBoundingClientRect();            /* 강제 리플로 */
        return cells.findIndex(c => c.classList.contains('on'));      /* 읽기 — 같은 틱 */
      }, [BAR, CELL]);
      if (idx !== CELL) atomBad++;
    }
    ok('[2-a] 같은 틱 경로 — ' + N + '회 어긋남 0 (' + BAR + ' 칸' + (CELL + 1) + ')', atomBad === 0, atomBad + '회');

    /* 두 evaluate + 제품 렌더 = 결정적 어긋남. 그런데 돌려받는 값은 **온전하다**.
       ⚠ 먼저 제품 상태를 칸1 로 되돌려 둔다 — 안 그러면 제품이 이미 이 칸을 들고 있어 되돌릴 것이 없다. */
    await page.evaluate(([s, i]) => window.__stab967.set(s, i), [BAR, 0]);
    await page.evaluate(SET_CLASS, [BAR, CELL]);
    await page.evaluate(renderOf);
    const stale = await page.evaluate(READ_ONLY, [BAR]);
    ok('[2-b] 두 evaluate 경로 — 켠 칸(' + (CELL + 1) + ')이 아니라 칸' + ((stale || {}).idx + 1) + ' 을 읽는다',
      !!stale && stale.idx !== CELL, stale ? '칸' + (stale.idx + 1) + ' «' + stale.label + '»' : '없음');
    ok('[2-c] ⚑ 그 값이 **완전히 정상으로 보인다** — 기하도 라벨도 온전하다 (= «조용한 대체»)',
      !!stale && stale.w > 0 && isFinite(stale.x) && stale.label.length > 0,
      stale ? '폭 ' + stale.w.toFixed(2) + ' · 라벨 «' + stale.label + '»' : '없음');

    /* [2-d] ⚑ **캡처처럼 틱을 넘길 수밖에 없는 자리의 답** — 클래스를 심어 «덮는» 것이 아니라
       **제품에게 같은 값을 넣는다**(967 등재문의 첫 처방). 그러면 제품 렌더가 되돌릴 것이 없다. */
    let ownBad = 0;
    for (let k = 0; k < N; k++) {
      await page.evaluate(([s, i]) => window.__stab967.set(s, i), [BAR, CELL]);   /* 제품 setter 경유 */
      await page.evaluate(renderOf);                                             /* 제품 렌더 한 번 */
      if (await page.evaluate(ONIDX, [BAR]) !== CELL) ownBad++;
    }
    ok('[2-d] 제품 setter 로 고정하면 **제품 렌더를 불러도** 안 되돌려진다 (' + N + '회 어긋남 0)',
      ownBad === 0, ownBad + '회');
    ok('[2-e] 음성 대조 — 같은 자리에 **클래스만** 심으면 그 렌더가 곧바로 되돌린다',
      await (async () => {
        await page.evaluate(([s, i]) => window.__stab967.set(s, i), [BAR, 0]);   /* 제품을 칸1 로 */
        await page.evaluate(SET_CLASS, [BAR, CELL]);
        await page.evaluate(renderOf);
        return await page.evaluate(ONIDX, [BAR]) !== CELL;
      })(), '되돌려짐');

    /* 벽시계는 **점수 없는 관측 줄**이다 — 판마다 갈리므로 판정에 못 쓴다(963 §5-1). */
    let wall = 0;
    await page.evaluate(([s, i]) => window.__stab967.set(s, i), [BAR, 0]);
    for (let k = 0; k < 10; k++) {
      await page.evaluate(SET_CLASS, [BAR, CELL]);
      await page.waitForTimeout(200);
      if (await page.evaluate(ONIDX, [BAR]) !== CELL) wall++;
    }
    console.log('      (관측 · 점수 아님) 클래스만 심고 벽시계 200ms ×10 어긋남 ' + wall + '/10 — 판마다 갈린다');

    /* ── [3] 구조 래칫 ────────────────────────────────────────────── */
    console.log('\n[3] 구조 래칫 — 여덟 자가 다시 «두 evaluate» 로 못 돌아간다');
    const S = {};
    TOOLS.forEach(f => { S[f] = src(f); });
    TOOLS.forEach(f => {
      ok('[3-a] ' + f + ' — `SETON` 선언이 없다 (사본을 남기면 다음 세션이 다시 두 evaluate 로 쓴다)',
        count(S[f], /^const SETON\s*=/m) === 0, count(S[f], /^const SETON\s*=/m) + '건');
      ok('[3-b] ' + f + ' — 공용 부품 `stab967` 을 심는다',
        /require\('\.\/stab967'\)/.test(S[f]) && /stabInstall\(page\)/.test(S[f]), '심음');
      ok('[3-c] ' + f + ' — 자기 핀(`setInterval` 재주입 사본)을 안 갖는다',
        !/window\.__pin4\d\d/.test(S[f]), '0건');
    });
    TOOLS_A.forEach(f => ok('[3-d] ' + f + ' (ⓐ) — 읽기 evaluate **안에서** 켠다 (한 틱)',
      /window\.__stab967\.set\(/.test(S[f]), '한 틱 호출 있음'));
    TOOLS_B.forEach(f => {
      ok('[3-e] ' + f + ' (ⓑ) — 캡처 구간을 `pin` 으로 붙든다', /__stab967\.pin\(/.test(S[f]), '핀 있음');
      ok('[3-f] ' + f + ' (ⓑ) — **캡처 직후 되읽어** «그 사이 안 바뀌었다» 를 묻는다',
        /캡처 사이에 활성이 안 바뀌었다|캡처 사이에 활성이 칸/.test(S[f]), '되읽기 있음');
    });
    ['verify378.js', 'verify389.js', 'verify449.js', 'verify462.js', 'verify468.js'].forEach(f =>
      ok('[3-g] ' + f + ' — «켠 칸을 그대로 쟀다» 가 **점수 줄**이다 (조용한 대체 금지)',
        /켠 칸을 그대로 쟀다|캡처 사이에 활성이 안 바뀌었다/.test(S[f]), '점수 줄 있음'));
    ['probe378.js', 'probe462.js', 'probe468.js'].forEach(f =>
      ok('[3-h] ' + f + ' — 어긋나면 **값을 안 찍고** 신고한다', /못 쟀다/.test(S[f]), '신고 있음'));
    const shared = src('stab967.js');
    ok('[3-i] 공용 부품이 «심는 손잡이» 한 벌뿐이다 (사본 8 → 1)',
      count(shared, /classList\.toggle\('on'/g) === 1, count(shared, /classList\.toggle\('on'/g) + '벌');
    ok('[3-j] 공용 부품이 제품 소유 바 ' + OWNED.length + '곳의 setter 를 알고 있다 (덮지 않고 고정한다)',
      /setTrSub/.test(shared) && /setRuneSub/.test(shared), 'setTrSub · setRuneSub');

    /* ── [4] 행동 — 제품 소유 바의 칸이 하나도 안 빠지고 재진다 ──────── */
    console.log('\n[4] 행동 — probe378 을 실제로 돌려 23 훈련 세 칸이 전부 재지는지 본다');
    const out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'probe378.js')],
      { encoding: 'utf8', timeout: 600000 });
    const sec = out.split(/^── /m).find(b => /^23 훈련/.test(b)) || '';
    const cells = [...sec.matchAll(/활성 칸(\d)/g)].map(m => m[1]);
    ok('[4-a] 23 훈련 세 칸이 각각 한 번씩 재졌다 (전에는 되돌려진 칸이 «건너뜀» 으로 빠졌다)',
      cells.join(',') === '1,2,3', '칸 ' + (cells.join(',') || '없음'));
    ok('[4-b] 어느 호스트에도 «못 쟀다» 가 없다', !/못 쟀다/.test(out),
      (out.match(/못 쟀다/g) || []).length + '건');

    /* ── [R] 되돌림 시험 — 본체에서 **파생**시킨다(964 교훈) ────────── */
    console.log('\n[R] 되돌림 — 원자성을 걷어낸 경로는 963 지문(칸' + (CELL + 1) + ' 자리에 칸1)을 그대로 낸다');
    /* [R-0] 전제 — 사본이 실제로 달라졌다. 본체의 한 틱 함수를 소스에서 뽑아 «켜기» 와 «읽기» 로 가른다.
       리터럴이 아니라 **본체 파생**이므로 본체가 바뀌면 이 항이 먼저 빨개진다. */
    const body = shared.match(/set\(sel, i\) \{[\s\S]*?\n    \},/);
    ok('[R-0] 전제 — 공용 부품에서 «켜기» 본체를 뽑았다 (리터럴이 아니라 파생 · 964 교훈)',
      !!body && /classList\.toggle\('on', on\)/.test(body[0]), body ? body[0].length + '자' : '못 뽑음');
    let revBad = 0, revToOne = 0;
    /* 제품을 칸1 로 두고 시작한다 — 되돌아갈 «제품의 답» 이 칸1 이어야 963 지문이 재현된다. */
    await page.evaluate(([s, i]) => window.__stab967.set(s, i), [BAR, 0]);
    for (let k = 0; k < N; k++) {
      await page.evaluate(SET_CLASS, [BAR, CELL]);   /* evaluate ①: 켜기(옛 SETON 그대로) */
      await page.evaluate(renderOf);                 /* 그 사이 제품 렌더 */
      const g = await page.evaluate(READ_ONLY, [BAR]);  /* evaluate ②: 읽기 */
      if (!g || g.idx !== CELL) revBad++;
      if (g && g.idx === 0) revToOne++;
    }
    ok('[R-a] 되돌린 경로는 ' + N + '회 **전부** 어긋난다 ([2-a] 의 0 과 정반대)', revBad === N, revBad + '/' + N);
    ok('[R-b] 그리고 어긋난 자리는 **언제나 칸1** 이다 (963 지문)', revToOne === N, revToOne + '/' + N);
    ok('[R-c] 음성 대조 — 같은 판에서 수리된 경로(한 틱 + 제품 setter)는 여전히 0회 어긋난다',
      await (async () => {
        let bad = 0;
        for (let k = 0; k < N; k++) {
          const idx = await page.evaluate(([s, i]) => window.__stab967.set(s, i), [BAR, CELL]);
          if (idx !== CELL) bad++;
        }
        return bad === 0;
      })(), '0회');

    console.log('\n[C] 콘솔');
    ok('콘솔·페이지 에러 0건', cerr.length === 0, cerr.length + '건' + (cerr[0] ? ' · ' + cerr[0].slice(0, 90) : ''));
  } finally { await browser.close(); }

  console.log('\nVERIFY967 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  ALL PASS'));
  process.exit(fail ? 1 : 0);
})();
