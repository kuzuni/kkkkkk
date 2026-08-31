/* ⚠ 613(2026-08-31) — 이 프로브의 대상([충전] 버튼 `.cg` 와 그 두 줄 라벨)이 **기능째 폐지**됐다.
   아래 코드는 «수리 전 한 줄 라벨이 자릿수에서 새는» 재현의 역사 기록으로 보존한다 — 대상 노드가
   없어 실행하면 뜻이 없으므로 즉시 종료한다(재현 수치는 review 577 · verify577 은 부재 게이트로 전환). */
if (!process.env.PROBE577_FORCE) {
  console.log('probe577: 대상([충전] .cg) 폐지 — 613. 역사 기록만 보존, 실행 생략 (PROBE577_FORCE=1 로 강제)');
  process.exit(0);
}
/* 작업 577 — 재현기: «23 훈련 › 단련 탭 헤더 [충전] 버튼 라벨이 2행으로 접혀
 *              2행째가 헤더 밑변 밖으로 새어 나온다».
 *
 * 등재문(491 8회차 비평가 CH·CI·CJ 3인 독립 관측)은 이렇게 적었다 —
 *   「흰 «1,000,000» 이 헤더 카드 하단과 1행 카드 상단 사이 8px 거터(프레임 y135~144)에
 *    x745~877(124~132px 폭)로 남고 **위 4px 만** 보인다」 · CJ 「캡의 13%」.
 * 8회차가 `-idle` 바로 앞에서 `#fxl` 을 비우도록 고쳤는데도 남았으므로 «플로터 잔상» 은 이미 기각됐다.
 *
 * 338 규칙 — 처방 전에 재현한다. 재는 것은 다섯이다:
 *   [1] 그 잉크의 정체가 **제품 DOM(`.cg` 의 2행째)** 인가 (`#fxl` 을 비운 뒤에도 남는가)
 *   [2] **자릿수별로 언제 접히는가** (등재문이 명시적으로 «먼저 재라» 고 요구한 것)
 *   [3] 접힌 2행이 헤더(`.tp-hd` 88px) 밖으로 몇 px 나가고, 그중 몇 px 이 실제로 보이는가
 *        (아래 카드 `.tr-tp.k0` 가 덮는다 — 「캡의 13%」 의 정체)
 *   [4] 한 행으로 그렸을 때의 **자연 폭**이 버튼 안치수(392 − 좌우 테 5×2 = 382)를 언제 넘는가
 *   [5] 처방 후보 ⓑ(버튼 폭 확대)가 왜 막혀 있는지 — `.pv` 잉크 우단 ↔ 버튼 좌단 빈 칸의 실측
 *        (`verify491` [8-d]·[6-h] 가 그 칸으로 사다리 자리를 잡는다)
 *
 * ⚠ **이 재현기는 «수리 전» 을 되살려 놓고 잰다.** 577 이 이미 고쳐진 뒤에도 같은 표가 나와야
 *   다음 세션이 «무엇이 결함이었나» 를 다시 확인할 수 있기 때문이다(고친 뒤 죽는 재현기는
 *   한 번 쓰고 버리는 자다 — 341·350 의 probe 가 수리 뒤에도 도는 것과 같은 이유).
 *   되살리는 것은 둘뿐이다: ⓐ `temperHeadTxt().chg` 를 옛 한 줄 문자열로 ⓑ 577 이 깐 CSS 두 줄 제거.
 *   «지금 제품» 은 [0] 이 대조로 한 줄 찍는다.
 *
 * 실행: node tools/probe577.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };
const r1 = n => Math.round(n * 10) / 10;

/* 헤더 라벨을 «지금 그려진 그대로» 재는 한 벌.
   행 수는 Range 의 클라이언트 사각형 개수로 센다 — 줄바꿈이 실제로 몇 개의 행 상자를
   만들었는지는 그것만이 안다(scrollHeight 는 line-height 64 에 묻힌다). */
const MEASURE = `(() => {
  const cg = document.querySelector('#trTemper .tp-hd .cg');
  const hd = document.querySelector('#trTemper .tp-hd');
  const k0 = document.querySelector('#trTemper .tr-tp.k0');
  if (!cg || !hd) return null;
  /* ⚠ 라벨 <i> **의 내용**을 재야 한다 — .cg 를 재면 <i> 자신의 테두리 상자가
     한 행으로 더 세어져 «2행» 이 «3행» 으로 읽힌다(첫 시안의 오독).
     ⚠ 이 블록은 템플릿 리터럴 안이다 — 주석에도 백틱을 쓰지 마라(리터럴이 거기서 끊긴다). */
  const rg = document.createRange(); rg.selectNodeContents(cg.querySelector('i') || cg);
  const rects = [...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
  /* ⚠ 같은 행 상자 안에서 아이콘(<img class=cic> 34px · vertical-align −4)과 글자 em 상자는
     **top 이 다르다** — top 으로 묶으면 한 행이 둘로 세어져 «1자리도 2행» 이 된다(첫 시안의 오독).
     행은 line-height(64) 의 절반보다 가까운 **중심**으로 묶는다. */
  const rows = [];
  rects.forEach(r => {
    const c = (r.top + r.bottom) / 2;
    const g = rows.find(g => Math.abs((g.top + g.bottom) / 2 - c) < 20);
    if (g) { g.left = Math.min(g.left, r.left); g.right = Math.max(g.right, r.right);
             g.top = Math.min(g.top, r.top); g.bottom = Math.max(g.bottom, r.bottom); }
    else rows.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
  });
  rows.sort((a, b) => a.top - b.top);
  const bh = hd.getBoundingClientRect(), bc = cg.getBoundingClientRect();
  const bk = k0 ? k0.getBoundingClientRect() : null;
  const last = rows[rows.length - 1] || null;
  return {
    text: cg.textContent.trim(),
    lines: rows.length,
    hd: { top: bh.top, bottom: bh.bottom, h: bh.height },
    cg: { left: bc.left, right: bc.right, top: bc.top, w: bc.width, h: bc.height },
    k0Top: bk ? bk.top : null,
    rows: rows.map(r => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })),
    /* 마지막 행이 헤더 밑변 밖으로 나간 양 · 그중 카드에 안 덮여 보이는 양 */
    outPx: last ? Math.max(0, last.bottom - bh.bottom) : 0,
    seenPx: (last && bk) ? Math.max(0, Math.min(last.bottom, bk.top) - Math.max(last.top, bh.bottom)) : 0,
    inkH: last ? last.bottom - last.top : 0
  };
})()`;

/* 줄바꿈을 끄고(한 행 강제) 잰 «자연 폭» — 버튼이 몇 px 부족한지의 자 */
const NATURAL = `(() => {
  const cg = document.querySelector('#trTemper .tp-hd .cg');
  if (!cg) return null;
  const old = cg.style.whiteSpace, ow = cg.style.width;
  cg.style.whiteSpace = 'nowrap'; cg.style.width = 'auto';
  const rg = document.createRange(); rg.selectNodeContents(cg);
  const rects = [...rg.getClientRects()].filter(r => r.width > 0.5);
  let l = Infinity, r = -Infinity;
  rects.forEach(x => { l = Math.min(l, x.left); r = Math.max(r, x.right); });
  cg.style.whiteSpace = old; cg.style.width = ow;
  return r - l;
})()`;

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { setTrSub('temper'); renderTrain(); });
  await page.waitForTimeout(400);

  console.log('\n[0] 지금 제품(수리 후) — 대조 한 줄');
  const now = await page.evaluate(() => {
    S.tstone = 1e6; const w = $('trTemper'); w.dataset.sig = ''; renderTrain();
    const cg = w.querySelector('.tp-hd .cg'), hd = w.querySelector('.tp-hd');
    const lab = cg.querySelector('i');
    const rg = document.createRange(); rg.selectNodeContents(lab);
    let b = -Infinity; [...rg.getClientRects()].forEach(r => { if (r.height > .5) b = Math.max(b, r.bottom); });
    return { html: lab.innerHTML, disp: getComputedStyle(lab).display,
             outHd: Math.max(0, b - hd.getBoundingClientRect().bottom) };
  });
  console.log('       라벨 = «' + now.html + '» · display=' + now.disp + ' · 헤더 밖 ' + r1(now.outHd) + 'px');

  /* ── 수리 전으로 되돌린다 — 아래 [1]~[6] 은 전부 그 상태의 자다 ── */
  const reverted = await page.evaluate(() => {
    temperHeadTxt = function () {                     /* ⓐ 옛 한 줄 라벨 */
      const have = Math.floor(S.tstone) || 0;
      return { pts: '단련 포인트 <b>' + fmt(temperPts()) + '</b>',
               chg: curIc('tstone', 34) + fmt(have) + ' → 포인트 ' + fmt(Math.floor(have / TEMPER_PT_COST)),
               canCharge: have >= TEMPER_PT_COST };
    };
    let killed = 0;                                   /* ⓑ 577 이 깐 CSS 두 줄 */
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (let i = rs.length - 1; i >= 0; i--) {
        const st = (rs[i].selectorText || '').replace(/\s+/g, '');
        if (rs[i].type === 1 && (st === '#trw.tr-temp>.tp-hd>.cg>i' || st === '.tr-temp>.tp-hd>.cg.cic')) {
          sh.deleteRule(i); killed++;
        }
      }
    }
    const w = $('trTemper'); w.dataset.sig = ''; renderTrain();
    return killed;
  });
  console.log('       ⇒ 수리 전으로 되돌렸다(라벨 1줄 + CSS ' + reverted + '줄 제거). 이하 전부 그 상태의 자다.');

  const setStone = async v => {
    await page.evaluate(n => {
      S.tstone = n;
      const w = $('trTemper'); if (w) w.dataset.sig = '';   /* 서명 우회 — 통짜 렌더를 강제한다 */
      renderTrain();
      const L = document.getElementById('fxl'); if (L) L.innerHTML = '';   /* [1] 플로터 배제 */
    }, v);
    await page.waitForTimeout(120);
    return page.evaluate(MEASURE);
  };

  console.log('\n[1] 그 잉크가 제품 DOM 인가 — `#fxl` 을 비운 직후에도 `.cg` 2행째가 남는가');
  const m6 = await setStone(1e6);
  const fxCount = await page.evaluate(() => document.querySelectorAll('#fxl > *').length);
  ok(m6 !== null, '`#trTemper .tp-hd .cg` 를 찾았다');
  console.log('       라벨 = «' + m6.text + '» · 행 ' + m6.lines + ' · #fxl 자식 ' + fxCount + '개');
  ok(fxCount === 0, '#fxl 이 비어 있다(플로터 잔상 배제 — 8회차가 이미 한 실험)');
  ok(m6.lines === 2, 'S.tstone = 1,000,000 에서 라벨이 **2행**으로 접힌다 (등재문 확인)');

  console.log('\n[3] 2행째가 헤더 밖으로 나간 양 · 실제로 보이는 양');
  const last6 = m6.rows[m6.rows.length - 1];
  console.log('       헤더 밑변 y=' + r1(m6.hd.bottom) + ' · 1행 카드 상단 y=' + r1(m6.k0Top)
            + ' (거터 ' + r1(m6.k0Top - m6.hd.bottom) + 'px)');
  console.log('       2행 잉크 y ' + r1(last6.top) + '..' + r1(last6.bottom)
            + ' · x ' + r1(last6.left) + '..' + r1(last6.right) + ' (폭 ' + r1(last6.right - last6.left) + ')');
  console.log('       헤더 밖 ' + r1(m6.outPx) + 'px · 그중 카드에 안 덮여 **보이는** ' + r1(m6.seenPx)
            + 'px = 잉크 높이의 ' + Math.round(m6.seenPx / m6.inkH * 100) + '%');
  ok(m6.outPx > 0, '2행째가 헤더(`.tp-hd`) 밑변 밖으로 나간다');
  ok(m6.seenPx > 0, '나간 잉크의 일부가 거터에서 **실제로 보인다** (= 주인·비평가가 본 그것)');

  console.log('\n[2] 자릿수별로 언제 접히는가 (등재문이 먼저 재라고 한 축)');
  const table = [];
  for (let d = 1; d <= 10; d++) {
    const v = Math.pow(10, d) - 1;                 /* 9 · 99 · 999 … 자릿수 d 의 최악값 */
    const m = await setStone(v);
    table.push({ d, v, lines: m.lines, out: m.outPx, seen: m.seenPx, text: m.text });
    console.log('       ' + String(d).padStart(2) + '자리 ' + String(v).padStart(11)
              + ' → ' + m.lines + '행 · 헤더 밖 ' + String(r1(m.outPx)).padStart(5) + 'px'
              + ' · 보임 ' + String(r1(m.seen || m.seenPx)).padStart(5) + 'px  «' + m.text + '»');
  }
  const firstWrap = table.find(t => t.lines >= 2);
  ok(!!firstWrap, '접히는 자릿수가 실재한다 — 첫 자리 = **' + (firstWrap ? firstWrap.d : '-') + '자리**');
  ok(table[0].lines === 1, '1자리(9)에서는 한 행이다 (= 상시가 아니라 자릿수 축의 결함)');
  ok(table.filter(t => t.lines >= 2).every(t => t.out > 0),
     '접힌 자리는 **예외 없이** 헤더 밖으로 샌다 (`.cg` 는 overflow 를 자르지 않는다)');

  console.log('\n[4] 한 행으로 그렸을 때의 자연 폭 ↔ 버튼 안치수');
  for (const d of [6, 7, 8, 9, 10]) {
    await setStone(Math.pow(10, d) - 1);
    const w = await page.evaluate(NATURAL);
    const cg = await page.evaluate(() => { const b = document.querySelector('#trTemper .tp-hd .cg').getBoundingClientRect(); return b.width; });
    console.log('       ' + d + '자리 → 자연 폭 ' + r1(w) + 'px / 버튼 ' + r1(cg)
              + 'px (안치수 ' + r1(cg - 10) + ') · 초과 ' + r1(w - (cg - 10)) + 'px');
  }
  const w10 = await (async () => { await setStone(9999999999); return page.evaluate(NATURAL); })();
  ok(w10 > 382, '10자리 자연 폭 ' + r1(w10) + 'px > 버튼 안치수 382px — 폭이 모자란 것이 뿌리다');

  console.log('\n[5] 처방 ⓑ(버튼 좌단을 왼쪽으로) 가 물릴 자리 — `.pv` 잉크 우단 ↔ 버튼 좌단');
  await setStone(1e6);
  const gap = await page.evaluate(() => {
    const pv = document.querySelector('#trTemper .tp-hd .pv');
    const cg = document.querySelector('#trTemper .tp-hd .cg');
    const rg = document.createRange(); rg.selectNodeContents(pv);
    let r = -Infinity; [...rg.getClientRects()].forEach(x => { if (x.width > 0.5) r = Math.max(r, x.right); });
    return { pvInkRight: r, cgLeft: cg.getBoundingClientRect().left, hdLeft: document.querySelector('#trTemper .tp-hd').getBoundingClientRect().left };
  });
  console.log('       `.pv` 잉크 우단 x=' + r1(gap.pvInkRight) + ' · 버튼 좌단 x=' + r1(gap.cgLeft)
            + ' (헤더 local ' + r1(gap.cgLeft - gap.hdLeft) + ') · 빈 칸 ' + r1(gap.cgLeft - gap.pvInkRight) + 'px');
  /* ⚠ 빈 칸의 넓이는 «비어 있다» 는 뜻이 아니다 — `verify491` [8-d] 의 사다리가 그 한복판에 산다.
     사다리 우단이 버튼 좌단에 몇 px 까지 붙어 있는지가 ⓑ 의 실제 여유다. */
  const lad = await page.evaluate(() => {
    S.temper.pts = 999999999; S.tstone = 1e6; renderTrain();
    const hd = document.querySelector('#trTemper .tp-hd'), H = hd.getBoundingClientRect();
    const pv = hd.querySelector('.pv'); const rg = document.createRange(); rg.selectNodeContents(pv);
    const rr = rg.getBoundingClientRect();
    const cg = hd.querySelector('.cg').getBoundingClientRect();
    const cs = getComputedStyle(hd);
    const x = parseFloat(cs.getPropertyValue('--hb-x')), mw = parseFloat(cs.getPropertyValue('--hb-mw'));
    const n = parseFloat(cs.getPropertyValue('--hb-slots')), sw = parseFloat(cs.getPropertyValue('--hb-sw'));
    const half = mw / 2 + ((n - 1) / 2) * sw, c = H.width * x;
    return { ink2: rr.x + rr.width - H.x, btn: cg.x - H.x, l: c - half, r: c + half };
  });
  console.log('       [8-d] 최악 자릿수(9) — `.pv` 잉크 우단 ' + r1(lad.ink2)
            + ' · 사다리 ' + r1(lad.l) + '..' + r1(lad.r) + ' · 버튼 좌단 ' + r1(lad.btn)
            + ' ⇒ 사다리 우단 ↔ 버튼 여유 **' + r1(lad.btn - lad.r) + 'px**');
  ok(lad.btn - lad.r < w10 - 392,
     '사다리 여유(' + r1(lad.btn - lad.r) + 'px)가 부족분(' + r1(w10 - 392)
     + 'px)보다 작다 ⇒ 처방 ⓑ(버튼 좌단 확대) 단독으로는 못 푼다 — [8-d] 가 즉시 빨개진다');

  console.log('\n[6] 처방 후보별 «자연 폭» — 무엇을 빼면 392 안에 드는가');
  const CANDS = [
    { id: 'A 현행  «n → 포인트 m»', html: (a, b) => a + ' → 포인트 ' + b },
    { id: 'B      «n → m pt»',      html: (a, b) => a + ' → ' + b + ' pt' },
    { id: 'C      «n → m»',         html: (a, b) => a + ' → ' + b },
    { id: 'D 2행   «n» / «→ m pt»', html: (a, b) => a + '<br>→ ' + b + ' pt', two: true }
  ];
  const measureCand = (html, fs) => page.evaluate(([h, f]) => {
    const cg = document.querySelector('#trTemper .tp-hd .cg');
    const probe = cg.cloneNode(false);
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:auto;white-space:nowrap;'
      + 'font-size:' + f + 'px;line-height:normal;visibility:hidden';
    probe.innerHTML = h;
    document.body.appendChild(probe);
    const rg = document.createRange(); rg.selectNodeContents(probe);
    let l = Infinity, r = -Infinity;
    [...rg.getClientRects()].forEach(x => { if (x.width > 0.5) { l = Math.min(l, x.left); r = Math.max(r, x.right); } });
    /* 2행안은 각 행을 따로 재야 한다 — nowrap 이라 <br> 로만 갈린다 */
    const rows = [];
    [...rg.getClientRects()].forEach(x => {
      if (x.width < 0.5) return;
      const c = (x.top + x.bottom) / 2;
      const g = rows.find(g => Math.abs((g.top + g.bottom) / 2 - c) < f);
      if (g) { g.left = Math.min(g.left, x.left); g.right = Math.max(g.right, x.right);
               g.top = Math.min(g.top, x.top); g.bottom = Math.max(g.bottom, x.bottom); }
      else rows.push({ top: x.top, bottom: x.bottom, left: x.left, right: x.right });
    });
    probe.remove();
    return { w: r - l, rows: rows.length, wmax: Math.max(...rows.map(g => g.right - g.left)) };
  }, [html, fs]);
  const icHtml = await page.evaluate(() => curIc('tstone', 34));
  for (const fs of [29, 26, 24]) {
    console.log('       — font-size ' + fs + 'px');
    for (const c of CANDS) {
      const out = [];
      for (const d of [7, 9, 10, 12]) {
        const n = Number(Math.pow(10, d) - 1).toLocaleString('en-US');
        const m = await measureCand(icHtml + c.html(n, n), fs);
        out.push(d + '자리 ' + String(r1(m.wmax)).padStart(6) + (m.wmax <= 392 ? '  ' : ' ✗'));
      }
      console.log('         ' + c.id.padEnd(24) + ' ' + out.join(' | '));
    }
  }

  await browser.close();
  console.log('\nprobe577: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
