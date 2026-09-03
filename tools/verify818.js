#!/usr/bin/env node
/* 작업 818 게이트 — 「단련 `.tb` · 룬 `.rbt.b1` 의 **수량**도 버스트가 덮지 않는다」
 * (T1 «버그(연출 폐색)» · 816 과 같은 신고 · 다른 밀도 예산 · 상세는 PROGRESS 818 행)
 *
 *   node tools/verify818.js
 *
 * ⚑⚑ 846 — **덮임 축과 밀도 축을 갈라 각자 다른 홀드로 돈다.** 그 전에는 한 홀드에서 벽시계로 표본을
 *   떴는데, 그 자는 러너 속도에 두 겹으로 흔들려 ×4·×6 에서 [R1]·[R2] 가 «≥5% 표본 0개» 로 뒤집혔다
 *   (표본마다 CDP 왕복 + 세대 겹침이 홀드 틱 사슬에 매여 있다). 덮임은 이제 **벽시계로 안 잰다** —
 *   제품이 낳은 알을 잡아 애니메이션을 멈추고 `currentTime` 을 우리가 밀며, 세대 겹침도 제품 상수
 *   (`TR_HOLD_IV0` 160ms)로 다시 만든다(`tools/fxsample846.js`). 표본 수는 우리가 정한 스텝 수로 고정된다.
 *   ⚠ **눈금·문턱은 한 칸도 안 바뀌었다**(1px 격자 · 5%·25% 그대로) — 바뀐 것은 «누가 언제 재는가» 다.
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
const { COV_RUN } = require('./fxsample846');       /* 846 — 애니메이션 시간으로 걷는 덮임 표본기 */
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.V818_HOLD || 2600);   /* 밀도 축 홀드 길이(실시간) */

/* ⚑⚑ 825 — [C] 의 밀도 판정을 «러너가 정하는 값» 에서 «제품이 정하는 값» 으로 옮겼다.
   등재문의 가설(«화소 주사가 rAF 를 밀어 평균이 내려간다»)은 `probe825` 1차 재현에서 **기각**됐다
   (heavy·heavy4·light·inpage 네 표본기가 10.4~10.9알로 전부 겹쳤다 — 주사를 4배로 해도 −4.9%).
   진짜 뿌리는 **홀드 틱 사슬이 setTimeout 이라는 것**이다. 동시 생존 평균은 곱이고
       동시 생존 ≈ (발화 한 번이 낳는 알 수) × (알 수명 ÷ **발화 간격**)
   앞 둘만 제품의 결정(`UPFX_N` 4 · `FXSPARK_MS` 380)이고 발화 간격은 러너가 정한다.
   `probe825` 가 CPU 스로틀 ×6 으로 **제품 0줄 변경**에서 동시 평균 11.5 → 6.9알(문턱 8 아래)을
   찍었다 — 등재문이 본 «7.4 ↔ 8.5» 가 그 얼굴이고, 봉우리 축([C2])도 여유 1알로 같이 붙었다.
   ⇒ **문턱 8 은 한 칸도 안 넓혔다.** 그 값을 러너의 실측 간격 대신 **제품의 가장 성긴 홀드 틱**
     (`TR_HOLD_IV0` 160ms — 350ms 지연 뒤 반복이 시작하는 간격)에서 읽는다. 실측 동시 평균·봉우리·
     발화 간격은 **기록으로만** 남긴다(LESSONS 239-① «흔들리는 양은 표에 기록으로만»). */
const TICK_MS   = Number(process.env.V818_TICK || 160);  /* = index.html `TR_HOLD_IV0` (제품 상수) */
const UPFX_N    = 4;                                     /* = index.html `UPFX_N`      (제품 상수) */
const FXSPARK_MS = 380;                                  /* = index.html `FXSPARK_MS`  (제품 상수) */
const PER_MIN   = 2.5;                                   /* 발화당 스폰 — 무회귀 3.9 ↔ 회귀 1.0 사이 */
const LIFE_MIN  = 300;                                   /* 알 수명    — 무회귀 445 ↔ 회귀 155 사이 */
/* 825 — «느린 러너» 손잡이. 기본 1 = 꺼짐이라 **눈금은 한 칸도 안 바뀐다**(695 `freeze` 선례).
   `V818_CPU=6 node tools/verify818.js` 로 이 자가 러너 속도에 안 흔들리는지 직접 볼 수 있다. */
const CPU_RATE  = Number(process.env.V818_CPU || 1);
/* 846 — 덮임 축의 표본 수 손잡이. 겹침은 `TICK_MS`·수명이 정하므로(380 ÷ 160 ⇒ 최대 3겹) 이 수는
   **제비뽑기 횟수**다: 알 방향(`--dx/--dy`)이 발화마다 무작위라 3세대만 보면 «덮는 세대» 를 통째로
   못 뽑는 판이 생긴다(단련 봉우리가 12.5% ↔ 4.0% 로 갈렸다 — 러너가 아니라 제비뽑기다).
   12 는 옛 벽시계 홀드가 ×1 에서 얻던 발화 수(19~24)와 같은 자릿수이고, ×6 에서도 **같은 12** 다. */
const GENS      = Number(process.env.V818_GENS  || 12);
const CSTEP     = Number(process.env.V818_CSTEP || 16);  /* 애니메이션 시간 스텝(ms) */
/* 발화 GENS 개를 «기다리는» 상한. 느린 러너에서는 발화 간격이 340ms 까지 벌어지므로 넉넉히 준다 —
   모자라면 [B1a] 가 «세대를 다 못 잡았다» 로 **빨개진다**(조용히 적은 표본으로 초록이 되지 않는다). */
const COV_TMO   = Number(process.env.V818_CTMO || 20000);

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

/* ⚑ 846 — 덮임 표본기(1px 격자 자 · 세대 겹침 재구성)는 `tools/fxsample846.js` 의 `COV_RUN` 이다.
   여기 있던 «홀드하며 벽시계로 표본을 뜨는» 자는 그 파일 머리말이 적은 두 이유로 걷어냈다. */

/* ── 825 — 페이지 안 관측기. `#fxl` 변이를 직접 보므로 **CDP 왕복이 0회**이고, 재는 것은
      «발화 한 번이 낳는 알 수» 와 «알 수명» 두 제품 값이다(위 머리말).
      ⚑ 846 — 이 관측기가 도는 홀드에는 이제 **다른 아무것도 안 얹힌다**(덮임 축이 제 홀드로 나갔다).
   ⚠ 338 — «함수를 불렀는가» 가 아니라 화면에 실제로 **놓이고 걷힌 노드**를 센다. */
const OBS_START = () => {
  const L = document.getElementById('fxl');
  const st = { bursts: 0, spawned: 0, lives: [], born: new Map() };
  window.__v818 = st;
  const isEgg = nd => nd.nodeType === 1 && /fx-spark/.test(nd.className + '');
  st.mo = new MutationObserver(recs => {
    let add = 0; const now = performance.now();
    for (const r of recs) {
      for (const nd of r.addedNodes) if (isEgg(nd)) { add++; st.born.set(nd, now); }
      for (const nd of r.removedNodes) if (isEgg(nd)) {
        const t0 = st.born.get(nd);
        if (t0 != null) { st.lives.push(now - t0); st.born.delete(nd); }
      }
    }
    if (add) { st.bursts++; st.spawned += add; }   /* 한 콜백 = 한 발화(cnt 알을 동기로 붙인다) */
  });
  st.mo.observe(L, { childList: true });
};
const OBS_STOP = () => {
  const st = window.__v818; window.__v818 = null;
  if (!st) return null;
  try { st.mo.disconnect(); } catch (_) {}
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  return { bursts: st.bursts, spawned: st.spawned,
           per: st.bursts ? st.spawned / st.bursts : 0, life: mean(st.lives), lifeN: st.lives.length };
};

/* keep = null 이면 인라인 신고를 걷어 **제품 선언 그대로** 본다. 문자열이면 그 값을 주입한다
   ('none' = 아무 요소에도 안 걸리는 타입 셀렉터 = 818 이전의 «구멍 0개»).
   want = 'dens'(밀도 축) · 'cov'(덮임 축) · 'both'. **846 — 둘은 서로 다른 홀드다**:
     · 밀도는 실시간이어야 뜻이 있다(«연속으로 터지는가») → 벽시계 홀드 + 페이지 안 관측기(825, 왕복 0회).
     · 덮임은 실시간일 이유가 없다(«궤적이 잉크를 지나는가») → 발화를 잡아 애니메이션 시간으로 건다.
   한 홀드에 얹으면 스텝이 메인 스레드를 붙잡아 밀도 쪽 수명·간격을 오염시킨다(등재문 처방 ⓐ). */
async function hold(page, t, keep, want) {
  want = want || 'both';
  const out = {};
  if (want === 'both' || want === 'dens') Object.assign(out, await holdDens(page, t, keep));
  if (want === 'both' || want === 'cov')  Object.assign(out, await holdCov(page, t, keep));
  return out;
}

/* 홀드 한 번을 위한 공통 채비 — 탭·신고 주입 · 앞 세대 배수 · 버튼 중심 좌표 */
async function arm(page, t, keep) {
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
  return g;
}

/* ── 밀도 축(825) — 실시간 홀드. **846 부터 홀드 중 왕복이 0회다**(화소 주사가 여기서 빠졌다). */
async function holdDens(page, t, keep) {
  const g = await arm(page, t, keep);
  if (!g) return { per: 0, life: 0, lifeN: 0, bursts: 0, spawned: 0, iv: 0, dens: 0 };
  await page.evaluate(OBS_START);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const t0 = Date.now();
  await page.waitForTimeout(HOLD_MS);
  await page.mouse.up();
  const wall = Date.now() - t0;
  await page.waitForTimeout(140);                        /* 마지막 세대의 «걷힘» 까지 봐야 수명이 닫힌다 */
  const o = (await page.evaluate(OBS_STOP)) || { bursts: 0, spawned: 0, per: 0, life: 0, lifeN: 0 };
  return { per: o.per, life: o.life, lifeN: o.lifeN, bursts: o.bursts, spawned: o.spawned,
           iv: o.bursts ? wall / o.bursts : 0,
           /* 660 의 «동시 ≥8알» 을 **제품의 가장 성긴 틱**에서 읽은 값 — 러너 간격을 안 쓴다 */
           dens: o.per * o.life / TICK_MS };
}

/* ── 덮임 축(846) — 발화 GENS 개를 잡아 **애니메이션 시간**으로 건다. 러너는 «얼마나 기다리는가» 만 정한다. */
async function holdCov(page, t, keep) {
  const g = await arm(page, t, keep);
  const zero = { frames: 0, steps: 0, max: 0, n25: 0, n05: 0, eggs: 0, peak: 0, out: 0, gens: 0 };
  if (!g) return zero;
  const pr = page.evaluate(COV_RUN, { sel: { host: t.host, num: t.num },
                                      gens: GENS, tick: TICK_MS, step: CSTEP, timeout: COV_TMO });
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const r = await pr;
  await page.mouse.up();
  await page.waitForTimeout(120);
  if (!r) return zero;
  /* ⚠ 밀도 축과 **이름이 겹치는 값은 접두어를 붙여 돌려준다.** `life`·`per` 를 그대로 얹으면
     [C2b]·[C2c] 가 «측정한 노드 수명·발화당 스폰» 대신 «선언된 애니 길이·세대당 알» 을 묻게 되어
     상수를 상수와 비교하는 **헛초록**이 된다(한 홀드였을 때는 없던 함정이다). */
  return { frames: r.frames, max: r.max, n25: r.n25, n05: r.n05, out: r.out, peak: r.peak,
           eggs: r.eggs, gens: r.gens, covPer: r.per, covLife: r.life, covStep: r.step, covTick: r.tick,
           /* 표본 수는 러너가 아니라 산수가 정한다 — [B1b] 가 이 등식을 직접 묻는다 */
           steps: Math.floor(((r.gens - 1) * r.tick + r.life) / r.step) + 1 };
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
  /* ⚑ 838 3회차 이관 — 「한 글자도 안 바뀌었다」 는 838 이 여유에 `* fitK` 를 붙이면서 거짓이 됐다.
     묻는 것(«816 의 신고와 그 부품 호출이 살아 있는가»)은 그대로 두고 **한 글자** 를 그 배율까지로 넓힌다
     — 619 4회차 «여유는 입자 크기에서» 를 더 지키는 방향의 변경이다(`verify816` [A4] 와 같은 이관). */
  ok(/\.cb\{--burst-keep:i;/.test(code) && /if\(IC && r\) kh\.push\(\.\.\.fxbKeepHoles\(t, Math\.round\(FXB_KOS \* hsc \* FX_CIC_SC( \* fitK)?\)\)\);/.test(code),
     'A5 816 의 신고(훈련 `.cb`→`i`)와 부품 호출이 그대로다(838 의 크기 배율 `fitK` 만 여유에 붙는다)');
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
  if (CPU_RATE > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
    console.log('[i] 825 손잡이 — CPU 스로틀 ×' + CPU_RATE + '(느린 러너 재현 · 눈금은 그대로다)');
  }

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
    now[k] = await hold(page, T[k], null, 'both');          /* 제품 선언 그대로 */
    const r = now[k], n = T[k].name;
    ok(r && r.frames > 0 && r.gens === GENS,
       'B1 ' + n + ' 홀드 중 알이 실제로 태어난다 — 발화 ' + GENS + '세대를 다 잡았다(0 이면 아래 초록은 헛초록이다)',
       r ? r.gens + '세대 · ' + r.frames + '표본 · 동시 최대 ' + r.peak + '알' : '없음');
    /* 846 — 표본 수가 **러너가 아니라 산수**로 정해진다는 것을 직접 묻는다. 이 항이 빨개지는 길은
       «덮임을 다시 벽시계로 재기 시작했다» 뿐이다(그때가 [R1]·[R2] 가 다시 뒤집히는 자리다). */
    ok(r && r.frames === r.steps,
       'B1b ' + n + ' 덮임 표본 수 = ((세대−1)×틱 + 수명) ÷ 스텝 + 1 — **러너가 정하지 않는다**',
       r ? r.frames + ' = ((' + r.gens + '−1)×' + r.covTick + ' + ' + r.covLife + ') ÷ ' + r.covStep
           + ' + 1 = ' + r.steps : '없음');
    ok(r && r.max < 0.05, 'B2 ' + n + ' 수량 잉크 덮임 **최대 5% 미만**', '최대 ' + p1((r ? r.max : 1) * 100) + '%');
    ok(r && r.n25 === 0, 'B3 ' + n + ' «읽을 수 없다» 급(≥25%) 표본 **0개**', (r ? r.n25 : '?') + '표본');
    ok(r && r.n05 === 0, 'B4 ' + n + ' «스친다» 급(≥5%) 표본도 **0개**', (r ? r.n05 : '?') + '표본');
  }

  /* ── [C] 대가 ─────────────────────────────────────────────────────── */
  console.log('\n[C] 대가 — 660 의 «터진다» 눈금(동시 ≥8알)과 스폰 규약');
  const pre = {};
  for (const k of Object.keys(T)) {
    pre[k] = await hold(page, T[k], 'none', 'both');        /* 818 이전 사본 = 구멍 0개 */
    const n = T[k].name;
    ok(now[k] && now[k].out === 0, 'C1 ' + n + ' 660 [C] — 알 중심이 버튼 밖으로 나간 표본 0개',
       (now[k] ? now[k].out : '?') + '개');
    /* ⚑ 816 은 «수리 전의 85%» 를 눈금으로 썼다. 여기서는 그 비가 아니라 **660 자신의 눈금**을 쓴다 —
       단련은 최악 자릿수의 잉크가 181px(버튼 폭의 53%)이라 구멍의 대가가 −28% 로 그 비를 못 넘는데,
       그것은 «연출이 죽었다» 가 아니라 «넓은 숫자를 비우면 그만큼 좁아진다» 는 산수다.
       660 이 «터진다» 라고 못 박은 값(`verify660` [B1][E3] 동시 ≥8알)이 이 자리의 옳은 문턱이다.
       ⚑⚑ **825 — 그 문턱을 «어디서 읽는가» 만 바꿨다(값은 8 그대로).** 실측 동시 수(봉우리·평균)는
         발화 «간격» 에 반비례하는데 그 간격은 홀드 틱 사슬(setTimeout)이라 **러너가 정한다** —
         `probe825` 가 CPU ×6 에서 제품 0줄로 봉우리 17 → 9.3 · 평균 11.5 → 6.9 를 찍었다(둘 다
         문턱에 붙거나 아래로 내려간다). 제품이 정하는 두 인자만으로 같은 말을 한다:
             동시 생존  =  발화당 스폰 알  ×  알 수명  ÷  발화 간격
         간격에 **제품의 가장 성긴 홀드 틱**(`TR_HOLD_IV0` 160ms)을 넣으면 러너가 식에서 빠진다. */
    ok(now[k] && now[k].dens >= 8,
       'C2 ' + n + ' 밀도가 660 [E3] 의 눈금 그대로다 — **동시 생존 ≥8알**(제품의 가장 성긴 틱 ' + TICK_MS + 'ms 에서)',
       p1(now[k] ? now[k].dens : 0) + '알 = 발화당 ' + p1(now[k] ? now[k].per : 0) + '알 × 수명 '
       + p1(now[k] ? now[k].life : 0) + 'ms ÷ ' + TICK_MS + 'ms  ↔ 818 이전 ' + p1(pre[k] ? pre[k].dens : 0) + '알');
    /* C2 의 두 인자를 각각도 묻는다 — 곱이 초록인데 한쪽이 죽어 다른 쪽이 메우는 일을 막는다
       (문턱은 `probe825` 의 «무회귀 최소 ↔ 회귀 최대» 사이에서 골랐다: 발화당 3.9↔1.0 · 수명 445↔155). */
    ok(now[k] && now[k].per >= PER_MIN,
       'C2b ' + n + ' 한 번의 발화가 낳는 알이 `UPFX_N`(' + UPFX_N + ') 급이다 — 밀도가 죽지 않았다',
       p1(now[k] ? now[k].per : 0) + '알/발화 (문턱 ' + PER_MIN + ') · 발화 ' + (now[k] ? now[k].bursts : 0) + '회');
    ok(now[k] && now[k].life >= LIFE_MIN,
       'C2c ' + n + ' 알이 **제 수명 끝까지 산다**(`FXSPARK_MS` ' + FXSPARK_MS + 'ms · 660 보강2 «캔슬 금지»)',
       p1(now[k] ? now[k].life : 0) + 'ms (문턱 ' + LIFE_MIN + ') · 표본 ' + (now[k] ? now[k].lifeN : 0) + '알');
  }
  /* 대가는 «크다/작다» 가 아니라 값으로 남긴다 — 다음 세션이 문턱을 다시 고를 때 읽을 수 있게 */
  for (const k of Object.keys(T))
    console.log('       · ' + T[k].name + ' 밀도 대가: ' + p1(pre[k].dens) + ' → ' + p1(now[k].dens)
                + '알 (' + p1((now[k].dens / pre[k].dens - 1) * 100) + '%)');
  /* 825 — 러너가 정하는 값은 **기록으로만** 남긴다(LESSONS 239-①). 판정은 위 C2·C2b·C2c 가 한다.
     846 — 동시 수는 이제 «재구성한 겹침» 의 값이라 러너와 무관하다(발화 간격만 러너 것이다). */
  console.log('       ── 러너 의존값(기록 전용 · 판정 안 함) ──');
  for (const k of Object.keys(T))
    console.log('       · ' + T[k].name + ' 실측 발화 간격 ' + p1(now[k].iv) + 'ms(제품 최속 60 ~ 최성김 '
                + TICK_MS + 'ms) · 발화 ' + now[k].bursts + '회'
                + '  ── 재구성 겹침(러너 무관): 평균 ' + p1(now[k].eggs) + '알 · 봉우리 ' + now[k].peak + '알');

  /* ── [R] 되돌림 ───────────────────────────────────────────────────── */
  console.log('\n[R] 되돌림 — 무르게 푼 수리가 아니다');
  for (const k of Object.keys(T)) {
    const n = T[k].name;
    ok(pre[k] && pre[k].n05 > 0, 'R1 ' + n + ' 신고를 지우면(818 이전) 수량이 다시 덮인다 — [B4] 가 빨개지는 자리',
       '≥5% 표본 ' + (pre[k] ? pre[k].n05 : '?') + '개 · 최대 ' + p1((pre[k] ? pre[k].max : 0) * 100) + '%');
    /* 자가 «신고한 그 잉크» 를 보는가.
       ⚑⚑ **838 이관(333 처방)** — 종전 항은 «아이콘을 신고하면 **수량**이 그대로 덮인다» 였고,
       그 전제(«신고를 안 한 잉크는 알이 지나간다»)를 838 이 옮겼다: 신고 호스트의 발원이
       **아이콘 자신**(`--burst-from`)이 되면서, 아이콘을 신고하는 순간 구멍이 발원을 덮어
       궤적 자체가 걸러진다 — 그래서 수량이 «덮이지 않는» 것이 이제 정상이고, 항을 그대로 두면
       **제품이 옳은데 빨간** 자리가 된다(실측 ≥5% 표본 0개).
       ⇒ 묻는 것(«자가 신고를 따라가는가»)은 그대로 두고 **재는 잉크를 아이콘으로 옮긴다** —
         짝 두 항이라 어느 쪽도 헛초록이 아니다(816 «코인은 안 신고한다» 가 R2b 의 근거다). */
    const r2 = await hold(page, { ...T[k], num: '.cic' }, '.cic', 'cov');
    const r2b = await hold(page, { ...T[k], num: '.cic' }, null, 'cov');
    /* ⚠ 문턱이 «0» 이 아닌 이유 — 838 뒤 아이콘은 **발원 자신**이라(`--burst-from`) 알이 그 위에서
       태어난다. 구멍은 «지나가지 마라» 는 말이라 태어나는 자리를 0 으로 못 만든다(구조적) —
       그래서 «줄어드는가» 로 묻고, 짝 R2b 가 «안 신고하면 안 준다» 를 재 헛초록을 막는다. */
    ok(r2 && r2b && r2b.eggs > 0 && r2.eggs <= r2b.eggs * 0.6,
       'R2a ' + n + ' **발원 잉크(`.cic`)를 신고하면 그 버스트가 죽는다** — 자가 신고를 따라간다',
       '알 평균 ' + (r2 ? r2.eggs.toFixed(1) : '?') + ' ↔ 안 신고 ' + (r2b ? r2b.eggs.toFixed(1) : '?')
       + ' · 아이콘 ≥5% 표본 ' + (r2 ? r2.n05 : '?') + ' ↔ ' + (r2b ? r2b.n05 : '?')
       + ' (덮임 쪽은 기록만 — 발원은 «태어나는 자리» 라 0 이 구조적으로 불가능하고 실행마다 흔들린다)');
    ok(r2b && r2b.n05 > 0, 'R2b ' + n + ' 제품 선언(수량만)에서는 **아이콘은 덮인다** — R2a 가 헛초록이 아니다',
       '≥5% 표본 ' + (r2b ? r2b.n05 : '?') + '개 · 816 «코인(`s`)은 안 신고한다»');
    const r3 = await hold(page, T[k], null, 'cov');
    ok(r3 && r3.n05 === 0, 'R3 ' + n + ' 원복하면 다시 0 이다', '≥5% 표본 ' + (r3 ? r3.n05 : '?') + '개');
  }
  /* ── 825 — 새 밀도 축의 되돌림 시험. 제품 파일은 **0줄**, `upFx` 를 한 겹 감싸 두 인자를 각각 죽인다.
        (곱 하나만 물으면 «한쪽이 죽고 다른 쪽이 메우는» 초록이 생긴다 — 그래서 둘을 갈라 죽여 본다.) */
  const REG = (mode) => {
    const L = document.getElementById('fxl');
    if (!window.__v818r) window.__v818r = window.upFx;
    window.upFx = function (k, h, c, n, nf, iv) {
      if (mode === 'cnt') return window.__v818r(k, h, c, 1, nf, iv);        /* 밀도를 죽인다 */
      const before = new Set(L.children);
      const r = window.__v818r(k, h, c, n, nf, iv);
      const born = [...L.children].filter(nd => !before.has(nd) && /fx-spark/.test(nd.className + ''));
      setTimeout(() => { for (const nd of born) { try { nd.remove(); } catch (_) {} } }, 120); /* 619 14회차 시절 */
      return r;
    };
    return true;
  };
  const UNREG = () => { if (window.__v818r) { window.upFx = window.__v818r; window.__v818r = null; } return true; };
  {
    const t = T.temper;
    await page.evaluate(REG, 'cnt');
    const rc = await hold(page, t, null, 'dens');
    await page.evaluate(UNREG);
    ok(rc && rc.per < PER_MIN && rc.dens < 8,
       'R4 틱당 스폰을 1 로 묶으면 [C2]·[C2b] 가 **빨개진다** — 밀도 축이 무뎌진 게 아니다',
       p1(rc ? rc.per : 0) + '알/발화 · 동시 ' + p1(rc ? rc.dens : 0) + '알');
    await page.evaluate(REG, 'life');
    const rl = await hold(page, t, null, 'dens');
    await page.evaluate(UNREG);
    ok(rl && rl.life < LIFE_MIN && rl.dens < 8,
       'R5 알을 120ms 에 걷으면(619 14회차 시절) [C2]·[C2c] 가 **빨개진다** — 660 보강2 를 지키는 자다',
       p1(rl ? rl.life : 0) + 'ms · 동시 ' + p1(rl ? rl.dens : 0) + '알');
    const rb = await hold(page, t, null, 'dens');
    ok(rb && rb.dens >= 8 && rb.per >= PER_MIN && rb.life >= LIFE_MIN,
       'R6 두 주입을 걷으면 다시 초록이다(주입이 원인이었다)',
       p1(rb ? rb.dens : 0) + '알 · 발화당 ' + p1(rb ? rb.per : 0) + ' · 수명 ' + p1(rb ? rb.life : 0) + 'ms');
  }

  ok(errs.length === 0, 'F1 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0');

  await browser.close();
  console.log('\nVERIFY818 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
