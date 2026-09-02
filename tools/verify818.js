#!/usr/bin/env node
/* 작업 818 게이트 — 「단련 `.tb` · 룬 `.rbt.b1` 의 **수량**도 버스트가 덮지 않는다」
 * (T1 «버그(연출 폐색)» · 816 과 같은 신고 · 다른 밀도 예산 · 상세는 PROGRESS 818 행)
 *
 *   node tools/verify818.js
 *
 *   [A] 선언  — 두 버튼이 **자기 수량**을 신고한다(행·카드가 아니라 버튼 자신 — 816 §4) ·
 *               룬 수량이 요소를 갖는다(`<b class="rbn">`) · 816·660 의 원형은 무수정
 *   [B] 그림  — **자릿수 최악**에서 홀드 내내 수량 잉크 덮임 0(전제 항 B1 이 헛초록을 막는다)
 *   [C] 대가  — 660 이 «터진다» 로 세운 눈금(**동시 ≥8알**)을 지킨다 · 스폰은 버튼 안뿐 ·
 *               레이아웃 Δ0px(룬 껍데기는 텍스트 노드와 같은 상자다)
 *   [R] 되돌림 — 신고를 지우면·엉뚱한 잉크(아이콘)를 신고하면 다시 덮인다(무르게 푼 수리가 아니다)
 *
 * ⚠ 338 규칙 — 판정은 «함수를 불렀는가» 가 아니라 **화면에 실제로 놓인 알과 잉크 상자**로 센다.
 * ⚠ 트리거는 실제 사용자 경로(버튼 pointerdown 홀드)다 — `fxBurst` 를 직접 부르지 않는다.
 * ⚠ **기본 자릿수(«1»·«12»)로 재면 이 작업을 헛 닫는다** — 두 버튼이 이고 있는 것은 «지금 누르면
 *   얼마인가» 이고 그 수는 자란다. 그래서 [B]·[C]·[R] 은 전부 **최악 자릿수**에서 잰다
 *   (단련 Lv 10만 ⇒ 501,501 = 686 [5-c] 의 far 표본 · 룬 Lv 400 ⇒ 3자리).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V818_HOLD || 2600);
const STEP_MS = Number(process.env.V818_STEP || 16);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const p1 = n => Math.round(n * 10) / 10;

/* 대상 셋 — `far` 는 «자릿수 최악» 주입(제품 코드가 아니라 세이브만 만진다) */
const T = {
  temper: { name: '단련', sub: 'temper', host: '#trw .tr-tp.k0 .tb', num: '.tbn', keep: '.tbn',
            far: "S.tstone = 1e12; const o = temperObj(); o.alloc = o.alloc || {}; o.alloc.atk = 100000; renderTemper();" },
  rune:   { name: '룬',   sub: 'rune',   host: '#trw .tr-rn .rbt.b1', num: '.rbn', keep: '.rbn',
            far: "S.rstone = 1e12; S.rune = S.rune || {}; S.rune.r1 = 400; renderRunes();" }
};

/* 한 표본 = «살아 있는 알들이 이 잉크 상자를 몇 % 덮는가» — 겹치는 알을 두 번 세지 않게 1px 격자로 훑는다
   (816 의 자를 그대로 쓴다 — 두 작업의 수치가 같은 눈금 위에 있어야 비교가 된다) */
const SAMPLE = (sel) => {
  const host = document.querySelector(sel.host);
  const inkOf = el => {
    if (!el) return null;
    let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); }
    return el.getBoundingClientRect();
  };
  const cov = (ink, eggs) => {
    if (!ink || !ink.width || !ink.height) return 0;
    const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
    const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
    }
    return n / (w * h);
  };
  const L = document.getElementById('fxl');
  const eggs = L ? [...L.children].filter(nd => /fx-spark/.test(nd.className + ''))
                     .map(nd => nd.getBoundingClientRect()) : [];
  const b = host && host.getBoundingClientRect();
  return {
    n: eggs.length,
    num: cov(inkOf(host && host.querySelector(sel.num)), eggs),
    out: b ? eggs.filter(e => {
      const cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
      return cx < b.left || cx > b.right || cy < b.top || cy > b.bottom;
    }).length : 0
  };
};

/* keep = null 이면 인라인 신고를 걷어 **제품 선언 그대로** 본다. 문자열이면 그 값을 주입한다
   ('none' = 아무 요소에도 안 걸리는 타입 셀렉터 = 818 이전의 «구멍 0개»). */
async function hold(page, t, keep) {
  await page.evaluate(s => { setTrSub(s); }, t.sub);
  await page.waitForTimeout(220);
  await page.evaluate(a => {
    for (const el of document.querySelectorAll(a.host)) {
      if (a.keep === null) el.style.removeProperty('--burst-keep');
      else el.style.setProperty('--burst-keep', a.keep);
    }
  }, { host: t.host, keep });
  /* 앞 상태의 알이 살아 있으면 첫 표본에 섞인다(816 의 함정) — 비고 다 지고 시작한다 */
  await page.waitForFunction(() => {
    const L = document.getElementById('fxl');
    return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
  }, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(120);
  const g = await page.evaluate(s => {
    const h = document.querySelector(s.host); if (!h) return null;
    const b = h.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, t);
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const rows = [];
  const t0 = Date.now();
  while (Date.now() - t0 < HOLD_MS) {
    rows.push(await page.evaluate(SAMPLE, t));
    await page.waitForTimeout(STEP_MS);
  }
  await page.mouse.up();
  await page.waitForTimeout(60);
  const live = rows.filter(r => r.n > 0);
  if (!live.length) return { frames: 0, max: 0, n25: 0, n05: 0, eggs: 0, peak: 0, out: 0 };
  return {
    frames: live.length,
    max: Math.max(...live.map(r => r.num)),
    n25: live.filter(r => r.num >= 0.25).length,
    n05: live.filter(r => r.num >= 0.05).length,
    eggs: live.reduce((a, r) => a + r.n, 0) / live.length,
    peak: Math.max(...live.map(r => r.n)),
    out:  Math.max(...rows.map(r => r.out))
  };
}

(async () => {
  const code = fs.readFileSync(SRC, 'utf8');

  /* ── [A] 선언 ─────────────────────────────────────────────────────── */
  console.log('[A] 선언 — 두 버튼이 «자기 수량» 을 신고한다');
  ok(/\.tr-tp>\.tb\{--burst-keep:\.tbn;/.test(code),
     'A1 단련 **강화 버튼 자신**(`.tr-tp>.tb`)이 `--burst-keep:.tbn`(수량)을 신고한다');
  ok(/\.tr-rn>\.rbt\.b1\{--burst-keep:\.rbn;/.test(code),
     'A2 룬 **강화 버튼 자신**(`.tr-rn>.rbt.b1`)이 `--burst-keep:.rbn`(수량)을 신고한다');
  /* 816 §4 의 함정 — 행에 적으면 `--burst-to` 를 지운 사본에서 행이 호스트가 되어
     행 안 자식이 통째로 구멍이 되고, 되돌림 시험이 «안 덮인다» 로 초록이 돼 버린다. */
  ok(!/\.tr-tp\{[^}]*--burst-keep/.test(code) && !/\.tr-rn\{[^}]*--burst-keep/.test(code),
     'A3 **행**(`.tr-tp`·`.tr-rn`)에는 안 적었다 — 816 §4 가 훈련 카드에서 밟은 그 함정');
  /* 신고할 «요소» 를 만든 것이 룬 쪽 제품 편집의 전부다(686 이 단련에 `.tbn` 을 만든 것과 같은 꼴) */
  ok(/'<b class="rbn">' \+ fmt\(runeCost\(r, l\)\) \+ '<\/b>'/.test(code),
     'A4 룬 수량이 **제 요소**를 갖는다(`<b class="rbn">`) — 그 전에는 `<i>` 안 벌거벗은 텍스트 노드라 가리킬 데가 없었다');
  ok(/\.cb\{--burst-keep:i;/.test(code) && /if\(IC && r\) kh\.push\(\.\.\.fxbKeepHoles\(t, Math\.round\(FXB_KOS \* hsc \* FX_CIC_SC\)\)\);/.test(code),
     'A5 816 의 신고(훈련 `.cb`→`i`)와 부품 호출은 **한 글자도 안 바뀌었다**');
  ok(/const kh = \(r && !IC\) \? fxbTextHoles\(t, strict \? Math\.round\(FXB_KOS \* hsc\) : undefined\) : \[\];/.test(code),
     'A6 660 의 원형(«아이콘 버스트는 자손 글자 구멍을 안 판다»)도 무수정 — 이 작업은 «예외 두 줄» 이지 되돌리기가 아니다');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', e => { if (e.type() === 'error') errs.push(e.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  /* ── 레이아웃 Δ0px — 룬 껍데기를 씌우기 «전» 과 같은 상자인가 ───────────
     자를 «옛 판을 꺼내 비교» 로 짜면 얕은 클론 밖에서 부패한다(756). 대신 **같은 실행 안에서**
     껍데기를 벗긴 사본(텍스트 노드로 되돌린 것)과 지금 판을 나란히 잰다 — 등가가 곧 Δ0 이다. */
  const dlt = await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    openTrain(); setTrSub('rune');
    const rb = document.querySelector('#trw .tr-rn .rbt.b1'), i = rb && rb.querySelector('i');
    if (!i) return null;
    const box = el => { const b = el.getBoundingClientRect(); return [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)]; };
    const now = { i: box(i), ic: box(i.querySelector('.cic')), btn: box(rb) };
    const keep = i.innerHTML;
    i.innerHTML = keep.replace(/<b class="rbn">(.*?)<\/b>/, '$1');   /* 818 이전 = 벌거벗은 텍스트 노드 */
    const bare = { i: box(i), ic: box(i.querySelector('.cic')), btn: box(rb) };
    i.innerHTML = keep;
    const cs = getComputedStyle(rb.querySelector('.rbn'));
    return { now, bare, fw: cs.fontWeight, disp: cs.display };
  });
  ok(dlt && JSON.stringify(dlt.now) === JSON.stringify(dlt.bare),
     'A7 레이아웃 **Δ0px** — `<b class="rbn">` 껍데기가 벌거벗은 텍스트 노드와 같은 상자다',
     dlt ? (dlt.now.i.join('/') + '  ↔  ' + dlt.bare.i.join('/')) : '없음');
  ok(dlt && dlt.fw === '900' && dlt.disp === 'inline-block',
     'A8 그 등가의 근거 — `#trw b` 가 이미 `display:inline-block` · `font-weight:900`(따로 적을 규칙이 0줄이다)',
     dlt ? (dlt.disp + ' · ' + dlt.fw) : '없음');

  /* ── 자릿수 최악 주입 ────────────────────────────────────────────── */
  for (const k of Object.keys(T)) await page.evaluate(src => { new Function(src)(); }, T[k].far);
  await page.waitForTimeout(300);
  const dig = await page.evaluate(t => {
    const out = {};
    for (const k of Object.keys(t)) {
      setTrSub(t[k].sub);
      const h = document.querySelector(t[k].host), el = h && h.querySelector(t[k].num);
      if (!el) { out[k] = null; continue; }
      const rg = document.createRange(); rg.selectNodeContents(el);
      const b = rg.getBoundingClientRect();
      out[k] = { txt: (h.textContent || '').trim(), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    }
    return out;
  }, T);
  console.log('\n[B] 그림 — **자릿수 최악**에서 홀드 ' + HOLD_MS + 'ms · 수량 잉크를 덮는가');
  for (const k of Object.keys(T))
    console.log('       · ' + T[k].name + ' 최악 자릿수: «' + (dig[k] ? dig[k].txt : '?') + '» 잉크 '
                + (dig[k] ? dig[k].w + ' × ' + dig[k].h : '?'));
  ok(dig.temper && /50[0-9],[0-9]{3}/.test(dig.temper.txt),
     'B0 단련 far 표본이 686 [5-c] 와 같은 자리다(Lv 10만 ⇒ 6자리)', dig.temper ? dig.temper.txt : '없음');

  const now = {};
  for (const k of Object.keys(T)) {
    now[k] = await hold(page, T[k], null);                 /* 제품 선언 그대로 */
    const r = now[k], n = T[k].name;
    ok(r && r.frames > 0, 'B1 ' + n + ' 홀드 중 알이 실제로 태어난다(0 이면 아래 초록은 헛초록이다)',
       r ? r.frames + '표본 · 동시 최대 ' + r.peak + '알' : '없음');
    ok(r && r.max < 0.05, 'B2 ' + n + ' 수량 잉크 덮임 **최대 5% 미만**', '최대 ' + p1((r ? r.max : 1) * 100) + '%');
    ok(r && r.n25 === 0, 'B3 ' + n + ' «읽을 수 없다» 급(≥25%) 표본 **0개**', (r ? r.n25 : '?') + '표본');
    ok(r && r.n05 === 0, 'B4 ' + n + ' «스친다» 급(≥5%) 표본도 **0개**', (r ? r.n05 : '?') + '표본');
  }

  /* ── [C] 대가 ─────────────────────────────────────────────────────── */
  console.log('\n[C] 대가 — 660 의 «터진다» 눈금(동시 ≥8알)과 스폰 규약');
  const pre = {};
  for (const k of Object.keys(T)) {
    pre[k] = await hold(page, T[k], 'none');                /* 818 이전 사본 = 구멍 0개 */
    const n = T[k].name;
    ok(now[k] && now[k].out === 0, 'C1 ' + n + ' 660 [C] — 알 중심이 버튼 밖으로 나간 표본 0개',
       (now[k] ? now[k].out : '?') + '개');
    /* ⚑ 816 은 «수리 전의 85%» 를 눈금으로 썼다. 여기서는 그 비가 아니라 **660 자신의 눈금**을 쓴다 —
       단련은 최악 자릿수의 잉크가 181px(버튼 폭의 53%)이라 구멍의 대가가 −28% 로 그 비를 못 넘는데,
       그것은 «연출이 죽었다» 가 아니라 «넓은 숫자를 비우면 그만큼 좁아진다» 는 산수다.
       660 이 «터진다» 라고 못 박은 값(`verify660` [B1][E3] 동시 ≥8알)이 이 자리의 옳은 문턱이다. */
    ok(now[k] && now[k].peak >= 8, 'C2 ' + n + ' 밀도가 660 [E3] 의 눈금 그대로다 — **동시 생존 최대 ≥8알**',
       (now[k] ? now[k].peak : 0) + '알(최대) ↔ 818 이전 ' + (pre[k] ? pre[k].peak : 0) + '알');
    /* ⚑ C2 는 660 의 자를 **글자 그대로** 옮긴 것(그쪽도 «최대 동시»)이고, C2b 는 그보다 **엄한** 읽기다 —
       «봉우리에서만 터진다» 와 «홀드 내내 터진다» 는 다른 말이라 평균도 같이 묻는다.
       ⚠ 단련은 여기가 문턱에 가깝다(3회 실측 8.6 / 8.7 / 9.0 — 여유 0.6~1.0알). 그 이유는 결함이
         아니라 **산수**다: 최악 자릿수의 수량 잉크가 181px 로 버튼 폭 340 의 53% 라, 그걸 비우면
         남는 자리가 그만큼 준다(대가 −33%). 룬은 같은 신고로 −6% 뿐이다(버튼이 420 으로 넓다).
         이 값이 8 아래로 내려가면 **신고를 줄이는 것이 아니라** 잉크·버튼 폭 쪽을 봐야 한다. */
    ok(now[k] && now[k].eggs >= 8, 'C2b ' + n + ' 봉우리뿐 아니라 **평균**도 ≥8알 — 홀드 내내 터진다',
       p1(now[k] ? now[k].eggs : 0) + '알(평균) ↔ 818 이전 ' + p1(pre[k] ? pre[k].eggs : 0) + '알');
  }
  /* 대가는 «크다/작다» 가 아니라 값으로 남긴다 — 다음 세션이 문턱을 다시 고를 때 읽을 수 있게 */
  for (const k of Object.keys(T))
    console.log('       · ' + T[k].name + ' 밀도 대가: ' + p1(pre[k].eggs) + ' → ' + p1(now[k].eggs)
                + '알 (' + p1((now[k].eggs / pre[k].eggs - 1) * 100) + '%)');

  /* ── [R] 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 무르게 푼 수리가 아니다');
  for (const k of Object.keys(T)) {
    const n = T[k].name;
    ok(pre[k] && pre[k].n05 > 0, 'R1 ' + n + ' 신고를 지우면(818 이전) 수량이 다시 덮인다 — [B4] 가 빨개지는 자리',
       '≥5% 표본 ' + (pre[k] ? pre[k].n05 : '?') + '개 · 최대 ' + p1((pre[k] ? pre[k].max : 0) * 100) + '%');
    /* 자가 «신고한 그 잉크» 를 보는가 — 엉뚱한 데(아이콘)를 신고하면 수량은 그대로 덮여야 한다 */
    const r2 = await hold(page, T[k], '.cic');
    ok(r2 && r2.n05 > 0, 'R2 ' + n + ' 엉뚱한 잉크(아이콘 `.cic`)를 신고하면 수량은 그대로 덮인다',
       '≥5% 표본 ' + (r2 ? r2.n05 : '?') + '개');
    const r3 = await hold(page, T[k], null);
    ok(r3 && r3.n05 === 0, 'R3 ' + n + ' 원복하면 다시 0 이다', '≥5% 표본 ' + (r3 ? r3.n05 : '?') + '개');
  }
  ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0');

  await browser.close();
  console.log('\nVERIFY818 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
