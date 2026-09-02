#!/usr/bin/env node
/* 게이트 — 작업 325 「34 축복 카드 «받기» 알약: 레드닷(받을 수 있으면) + 알약 초록색」
 *          (저장소 주인 지시 2026-08-28 — «축복도 받기 버튼에 빨간점 알림 뜨게 해주기 받기 버튼 그리고 초록색으로 해줘»)
 *
 *   node tools/verify325.js
 *
 * 지키는 성질: **축복 한 칸을 «지금 켤 수 있으면» 그 칸의 «받기» 알약이 초록이고 레드닷이 붙는다.
 *               켜는 순간 그 칸만 즉시 갈색으로 돌아가고 닷이 꺼진다. 만료되면 다시 켜진다.**
 *   [A] 세 칸 다 만료 — 닷 3개 · 알약 3장 초록 · 사이드 «축복» 아이콘 점등
 *   [B] 섞인 국면(2 만료 / 1 활성) — 닷 정확히 2개 · 활성 칸은 갈색 + 닷 소등(짝이 안 어긋난다)
 *   [C] 세 칸 다 활성 — 닷 0개 · 알약 3장 갈색 · 사이드 소등
 *   [D] 카드 클릭 — **그 칸만** 즉시 소등·갈색, 나머지 유지. 기능 완성 규칙: `S.bless` 저장·
 *       `bonus()` 배율 상승까지 실제로 움직이는지 본다(«만들어 놓음» 이 아니라 «동작함»).
 *   [E] 만료 — 1초 `blessTick()` 이 열려 있는 팝업을 다시 그려 **재점등**한다.
 *   [F] 166 규약 — 부품은 `<s class="updot">` 하나 · 점등은 호스트 `.tm.alert` 로만. 클래스를 떼면 꺼진다.
 *       ⚠ 되돌림 감시: `#blsw` 는 `#blsw s{display:inline-block}`(ID 급)로 `<s>` 를 켜 두는 화면이라
 *       스코프 짝(`#blsw .updot{display:none}`)이 없으면 **조건과 무관하게 상시 점등**이 된다.
 *   [G] 299 규약 — 닷 중심이 호스트(알약) 우상단 사분면 · `.bls-c{overflow:hidden}` 에 안 잘린다.
 *   [H] 34 레이아웃 회귀 — 배지를 넣어도 알약 219×98 · 글자/시계 잉크 자리가 한 픽셀도 안 움직인다
 *       (34 는 이미 통과한 화면이다 — 색·배지만 얹는 것이 이 작업의 범위).
 *
 * 판정은 «논리(class·computed)» 와 «화소(bbox 안 빨강/초록 수)» 를 **같이** 본다 —
 * 292 «열렸는가 ≠ 보이는가» · 189-③ «헛초록» 처방.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → DOM» 판정이라 비평가를 띄우지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

/* 34 가 통과했을 때의 알약 규격(측정표 34 §15 · 325 착수 전 실측) — 회귀 기준선 */
const TM_W = 219, TM_H = 98;
const BASE = {                          /* 카드1 기준. 카드2·3 은 +315 / +630 */
  tm: [116, 1045], ck: [165.79, 1049, 38.8, 97], i_claim: [212.62, 1047, 56.55, 97],
  /* 581 이관 — 옛 `ckLay: [49,4,40,97]` 상수는 여기서 **뺐다.** 그 축은 상수 대조에서
     «배지 있음 ↔ 뺀 뒤» 차분으로 옮겼다(아래 [H]) — 자리를 비운 것이 아니라 옮긴 것이다. */
};
const GREEN = [76, 186, 46];            /* #4CBA2E — 202 «가능=초록» (.ifbtn --gb-mid) */
const BROWN = [146, 106, 36];           /* #926A24 — 활성(시간 표시) 알약, 34 원본 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 100) / 100;
const near = (a, b, t) => Math.abs(a - b) <= t;

/* bbox 안의 «빨강»·«초록» 화소 수 — 안 보이면 0 이다.
   ⚠ 60 쥬시 `jzDotIn`(scale 0→1)이 방금 시작했으면 rect 가 0 으로 잡힌다(104·202 함정) —
   재기 전에 `animation:none` 을 잠깐 강제한다. */
async function shot(page, sel) {
  const s = await page.evaluate(q => {
    const e = document.querySelector(q);
    if (!e) return { exists: false };
    const prevA = e.style.animation; e.style.animation = 'none';
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const out = { exists: true, display: cs.display, opacity: +cs.opacity, visibility: cs.visibility,
      bg: cs.backgroundColor, rect: [r.left, r.top, r.width, r.height] };
    e.style.animation = prevA;
    return out;
  }, sel);
  if (!s.exists) return { exists: false, red: 0, green: 0 };
  const [x, y, w, h] = s.rect;
  s.red = 0; s.green = 0;
  if (w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= W && y + h <= H) {
    const buf = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) } });
    const c = await page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let red = 0, green = 0;
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2];
        if (R > 150 && G < 110 && B < 130) red++;
        if (G > 110 && R < G - 40 && B < G - 40) green++;
      }
      return { red, green };
    }, buf.toString('base64'));
    s.red = c.red; s.green = c.green;
  }
  return s;
}

/* 세 카드의 «논리» 를 한 번에 — 알약 색 · .alert · 닷 display · 글자 */
async function state(page) {
  return page.evaluate(() => {
    const p = n => Math.round(n * 100) / 100;
    const R = el => { const r = el.getBoundingClientRect(); return [p(r.left), p(r.top), p(r.width), p(r.height)]; };
    const out = [];
    document.querySelectorAll('.bls-c').forEach(c => {
      const tm = c.querySelector('.tm'), i = tm.querySelector('i'), ck = tm.querySelector('b.ck');
      const dots = tm.querySelectorAll(':scope > .updot');
      const d = dots[0];
      out.push({
        id: c.id, k: c.dataset.bless, off: c.classList.contains('off'),
        alert: tm.classList.contains('alert'), txt: i.textContent,
        /* 581 이관 — 알약이 공용 부품 `.ifbtn` 이 되면서 초록이 `background-color` 가 아니라
           **베벨 그라디언트**로 온다(색은 그대로 `--gb-mid:#4CBA2E`). 옛 항은 «면 색» 을 묻는데
           읽는 자리가 하나뿐이라 `rgba(0,0,0,0)` 을 보고 빨개졌다 — 물음이 틀린 게 아니라
           **읽는 자리가 한 곳뿐**이었다. 그래서 «지금 이 알약의 면이 무슨 색인가» 를 두 자리에서
           읽어 하나로 돌려준다: 그라디언트면 그 본체 밴드(`--gb-mid`), 아니면 `background-color`.
           ⚠ 무르게 푼 것이 아니다 — 색을 바꾸면 `--gb-mid` 가 달라져 즉시 빨개지고, 부품을 통째로
           떼면 `background-color` 가 투명이라 또 빨개진다. 게다가 같은 절의 **찍힌 화소** 항
           («알약 bbox 안 초록 화소 > 8000»)이 옆에서 같은 것을 원 화소로 다시 묻는다. */
        tmBg: (getComputedStyle(tm).backgroundImage !== 'none'
                 ? getComputedStyle(tm).getPropertyValue('--gb-mid').trim()
                 : getComputedStyle(tm).backgroundColor),
        tmSh: getComputedStyle(tm).boxShadow,
        tm: R(tm), i: R(i), ck: R(ck),
        /* 356 6회차 이관 — [H] «배지가 무엇도 밀지 않았다» 는 **레이아웃** 물음이라
           레이아웃 상자로 잰다. `getBoundingClientRect` 는 transform 이 실린 값이라
           356 이 아이콘 배율을 손볼 때마다 이 자가 같이 빨개졌다(=두 작업이 한 수를 공유). */
        ckLay: [ck.offsetLeft, ck.offsetTop, ck.offsetWidth, ck.offsetHeight],
        /* 581 이관 — 옛 항은 상수 `[49,4,40,97]` 를 박고 있었는데, `offsetLeft/Top` 은
           **offsetParent(= 알약)의 패딩 상자** 기준이다. 581 이 알약에 부품의 검정 테두리 6px 을
           얹자 그 원점 자체가 (+6, +6) 움직여 상수가 (43, −2) 로 읽혔다 — **그려진 자리는 Δ0**
           이고(같은 절의 ««받기» 글자 잉크 자리·폭 불변» 이 `getBoundingClientRect` 로 통과한다)
           움직인 것은 좌표계다. 상수를 새 값으로 갈아 적으면 다음에 테두리가 또 바뀔 때 같은
           헛빨강이 난다. ⇒ [H] 가 묻는 것(«배지가 무엇도 밀지 않았다»)을 **그대로** 묻는다:
           같은 트리에서 배지 노드를 뺐다 넣었을 때 시계 상자가 한 픽셀도 안 움직이는가.
           ⚠ 이것이 더 센 자다 — 상수 판은 «배지를 넣어도 상수와 같다» 였지만 이 판은
             «배지를 넣은 것 때문에 움직였는가» 를 직접 가른다(원점 이동에 면역). */
        ckLayNoDot: (() => {
          if (!d) return [ck.offsetLeft, ck.offsetTop, ck.offsetWidth, ck.offsetHeight];
          const par = d.parentNode, nxt = d.nextSibling;
          par.removeChild(d);
          const v = [ck.offsetLeft, ck.offsetTop, ck.offsetWidth, ck.offsetHeight];
          par.insertBefore(d, nxt);
          return v;
        })(),
        nDot: dots.length, dotDisp: d ? getComputedStyle(d).display : 'none',
        dotRect: d ? R(d) : null, card: R(c),
        /* 822 이관 — 471 규약식의 재료. 좌표 상수를 새로 적지 않는다(«--dot-in 이 몇이냐» 가
           아니라 «그 값대로 앉았느냐» 를 묻는다). `--dot-bw` 는 정의 안 된 var 를 물면 빈 문자열
           = CSS 폴백 0 과 같다. `tmBw` 는 그 되빼기가 진짜 테두리와 짝인지 대조할 실측값. */
        dotIn: d ? (parseFloat(getComputedStyle(d).getPropertyValue('--dot-in-x')) ||
                    parseFloat(getComputedStyle(d).getPropertyValue('--dot-in')) || 0) : 0,
        dotInY: d ? (parseFloat(getComputedStyle(d).getPropertyValue('--dot-in-y')) ||
                     parseFloat(getComputedStyle(d).getPropertyValue('--dot-in')) || 0) : 0,
        dotBw: d ? (parseFloat(getComputedStyle(d).getPropertyValue('--dot-bw')) || 0) : 0,
        tmBw: parseFloat(getComputedStyle(tm).borderRightWidth) || 0,
      });
    });
    /* ⚠ 사이드 아이콘의 점등 클래스는 `.alert` 가 아니라 **`.on`** 이다
       (`sideAlert()` 20514: `SIDEB[k].classList.toggle('on', …)` · 배지 CSS 도 `.ibtn.on .bdg`).
       팝업 안 호스트(`.tm.alert`)와 클래스 이름이 다르다 — 여기서 `.alert` 를 보면 항상 false 다. */
    const sb = document.querySelector('.side .ibtn[data-pop="bless"]');
    return { out, side: sb ? sb.classList.contains('on') : null,
      sideBdgDisp: sb ? getComputedStyle(sb.querySelector('.bdg')).display : null,
      on: { atk: blessOn('atk'), hp: blessOn('hp'), rate: blessOn('rate') }, any: blessAny() };
  });
}

/* 581 이관 — `rgb(a,b,c)` 뿐 아니라 `#RRGGBB`(부품 토큰이 돌려주는 모양)도 읽는다 */
const rgb = s => {
  const h = String(s).trim().match(/^#([0-9a-f]{6})$/i);
  if (h) return [0, 2, 4].map(i => parseInt(h[1].slice(i, i + 2), 16));
  return (String(s).match(/\d+/g) || []).slice(0, 3).map(Number);
};
const isCol = (s, c) => { const v = rgb(s); return v[0] === c[0] && v[1] === c[1] && v[2] === c[2]; };
/* «닷이 켜져 있다» 의 논리 요약 — 노드가 있고 .alert 이고 computed display 가 none 이 아니다 */
const lit = o => o.nDot === 1 && o.alert && o.dotDisp !== 'none';
const sig = st => st.out.map(o => (o.alert ? '1' : '0') + (o.dotDisp !== 'none' ? '1' : '0')).join(' ');

async function boot(browser, exp) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 1e6, dia: 500, best: 20, totalKills: 500 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openBless === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춰 화소 판정이 흔들리지 않게 한다(다른 게이트와 같은 처방) */
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  await page.evaluate(e => { S.bless.exp = { atk: e[0], hp: e[1], rate: e[2] }; uiDirty = true; renderUI(); }, exp);
  await page.waitForTimeout(300);
  await page.evaluate(() => openBless());
  await page.waitForTimeout(700);
  return { ctx, page, errs };
}
const NOW = () => Date.now();

(async () => {
  const browser = await launch(chromium);
  const HOUR = 3600e3;

  /* ══ [A] 세 칸 다 만료 — 전부 점등 + 전부 초록 ═════════════════════════ */
  console.log('\n[A] 세 칸 다 «받을 수 있음»');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, 0]);
    const st = await state(page);
    ok(st.out.length === 3, '카드 3장', String(st.out.length));
    ok(st.out.every(o => o.nDot === 1), '칸마다 배지 노드 정확히 1개(부품은 하나)', st.out.map(o => o.nDot).join(','));
    ok(st.out.every(lit), '세 칸 전부 점등', sig(st));
    ok(st.out.every(o => o.txt === '받기'), '세 칸 글자가 «받기»', st.out.map(o => o.txt).join(','));
    ok(st.out.every(o => isCol(o.tmBg, GREEN)), '세 칸 알약이 초록 #4CBA2E', st.out.map(o => o.tmBg).join(' '));
    ok(st.side === true && st.sideBdgDisp !== 'none', '사이드 «축복» 아이콘도 점등(경로 앞칸)',
      'alert=' + st.side + ' bdg=' + st.sideBdgDisp);
    /* 화소 — 닷 안에 빨강이 실제로 찍히는가 / 알약 안에 초록이 실제로 찍히는가 */
    for (let n = 0; n < 3; n++) {
      const id = st.out[n].id;
      const d = await shot(page, '#' + id + ' .tm > .updot');
      ok(d.red > 200, `${id} 닷 bbox 안 빨강 화소 > 200`, String(d.red));
      const t = await shot(page, '#' + id + ' .tm');
      ok(t.green > 8000, `${id} 알약 bbox 안 초록 화소 > 8000`, String(t.green));
    }
    /* [H] 34 레이아웃 회귀 — 배지를 넣어도 알약·글자 자리가 안 움직인다 */
    st.out.forEach((o, n) => {
      ok(o.tm[2] === TM_W && o.tm[3] === TM_H, `[H] ${o.id} 알약 ${TM_W}x${TM_H} 불변`, o.tm[2] + 'x' + o.tm[3]);
      ok(near(o.tm[0], BASE.tm[0] + 315 * n, 0.5) && near(o.tm[1], BASE.tm[1], 0.5),
        `[H] ${o.id} 알약 좌상단 불변`, o.tm[0] + ',' + o.tm[1]);
      ok(near(o.i[0], BASE.i_claim[0] + 315 * n, 0.5) && near(o.i[2], BASE.i_claim[2], 0.5),
        `[H] ${o.id} «받기» 글자 잉크 자리·폭 불변`, o.i.join(','));
      /* 356 6회차 이관 — 옛 항은 `getBoundingClientRect` 로 **그려진** 폭(38.8 = 40 × scaleX .97)을
         박고 있었다. 그런데 [H] 가 묻는 것은 «배지를 넣어도 아무것도 안 밀렸는가» 라는 **레이아웃**
         물음이고, 그려진 폭은 356(«아이콘은 원본 비율»)이 6회차에 등방 `scale(.9167)` 로 바꾼
         **356 의 수**다. 옛 항을 그대로 두면 356 이 배율을 손볼 때마다 325 가 남의 이유로 빨개진다.
         ⇒ [H] 는 레이아웃 상자를 묻고(아래), 그려진 배율은 주인인 356 이 지킨다
            (`verify356` [A] 등방 · [R5] 되돌림 · `probe356r6` [E] 잉크 예측).
         ⚠ 무르게 푼 것이 아니다 — 레이아웃 상자 40×97 은 **배지가 알약을 밀면 즉시 어긋나고**,
            transform 을 통째로 지워도 `verify356` [S] 가 배율 상수를 물고 있어 그쪽이 빨개진다.
            («옮겼으면 옮긴 자리에서 물어야 한다» — 328~330 이 남긴 이관 교훈. 값 49,4,40,97 이
            수리 전·수리 후·transform 없음 **세 상태에서 모두 같다**는 것은 직접 재서 확인했다:
            즉 이 항은 무엇도 무르게 풀지 않았고, 애초에 356 의 축을 안 보던 항이다.) */
      ok(o.ckLay.every((v, j) => near(v, o.ckLayNoDot[j], 0.5)),
        `[H] ${o.id} 시계 ⏱ 레이아웃 상자 불변(배지가 안 민다)`,
        '배지 있음 ' + o.ckLay.join(',') + ' ↔ 뺀 뒤 ' + o.ckLayNoDot.join(','));
    });
    /* [G] 299 + overflow 클립
       ⚠ 319 처방(278) — 배지 노드가 아예 없는 트리(되돌림 시험)에서 `o.dotRect` 가 null 이면
       구조분해가 **게이트를 즉사**시킨다. 없으면 그 항목만 빨갛게 하고 계속 돈다. */
    st.out.forEach(o => {
      if (!o.dotRect) { ok(false, `[G] ${o.id} 배지 노드가 없다 — 자리 판정 불가`, 'dotRect=null'); return; }
      const [dx, dy, dw, dh] = o.dotRect;
      const cx = dx + dw / 2, cy = dy + dh / 2;
      ok(cx > o.tm[0] + o.tm[2] / 2 && cy < o.tm[1] + o.tm[3] / 2, `[G] ${o.id} 299 우상단 사분면`,
        `중심 (${px(cx - o.tm[0])}, ${px(cy - o.tm[1])})`);
      /* ⚑ 822 이관(2026-09-02) — 이 자리를 **재현기만 묻고 게이트는 안 묻고 있었다.**
         `probe325` 가 «링이 알약 219×98 안» 을 단언한 채 471 이후 두 항이 빨갛게 굳었는데,
         `verify325` 는 사분면과 카드 클립만 봐서 69/69 초록이었다 — 즉 이 자리의 «자리» 는
         아무 게이트도 안 지키고 있었다(328 교훈: 초록으로 되돌리는 것만으로 끝내면 그 작업이
         통째로 사라져도 초록인 게이트가 남는다). 재현으로 갈린 답(471 규약이 옳다)을 **게이트가
         묻는 형태로** 옮긴다: «중심 = 호스트(테두리 상자) 우상단 코너 안쪽 `--dot-in`».
         ⚠ `getBoundingClientRect` 는 테두리 상자이고 471 기준도 «테두리 바깥 상자» 라
         CSS 식의 `--dot-bw` 되빼기(절대배치 오프셋이 패딩 상자 기준이라서)는 여기서 상쇄된다 —
         그래서 안쪽 거리는 `--dot-bw` 와 **무관하게** `--dot-in` 이어야 하고, 그 짝이 어긋나면
         (`.ifbtn{--dot-bw:var(--gb-bw)}` 의 6px) 5 나 17 로 나와 즉시 빨개진다. */
      const insetR = (o.tm[0] + o.tm[2]) - cx, insetT = cy - o.tm[1];
      ok(Math.abs(insetR - o.dotIn) <= 0.5 && Math.abs(insetT - o.dotInY) <= 0.5,
        `[G] ${o.id} 471 규약 — 닷 중심이 알약 코너 안쪽 --dot-in`,
        `안쪽 우 ${px(insetR)} 상 ${px(insetT)} / 규약 ${px(o.dotIn)},${px(o.dotInY)}`);
      ok(Math.abs(o.dotBw - o.tmBw) <= 0.5,
        `[G] ${o.id} --dot-bw 가 알약의 실제 테두리 두께와 짝이다`,
        `--dot-bw ${px(o.dotBw)} ↔ border ${px(o.tmBw)}`);
      const ring = 7.5;
      ok(dx - ring >= o.card[0] && dy - ring >= o.card[1] &&
         dx + dw + ring <= o.card[0] + o.card[2] && dy + dh + ring <= o.card[1] + o.card[3],
        `[G] ${o.id} 링이 .bls-c{overflow:hidden} 안 — 안 잘린다`, '');
    });
    ok(errs.length === 0, '[A] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [B] 섞인 국면 — 2 만료 / 1 활성 ═════════════════════════════════ */
  console.log('\n[B] 섞인 국면(공격력·체력 만료 / 획득률 활성)');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, NOW() + HOUR]);
    const st = await state(page);
    ok(sig(st) === '11 11 00', '점등 정확히 2칸 · 활성 칸만 소등(짝이 안 어긋난다)', sig(st));
    const a = st.out.find(o => o.id === 'blsC_rate');
    ok(a.txt !== '받기' && /^\d\d:\d\d:\d\d$/.test(a.txt), '활성 칸 글자는 남은 시간', a.txt);
    ok(isCol(a.tmBg, BROWN), '활성 칸 알약은 34 원본 갈색 #926A24 유지', a.tmBg);
    ok(st.out.filter(o => o.off).every(o => isCol(o.tmBg, GREEN)), '만료 칸 2장만 초록',
      st.out.map(o => o.tmBg).join(' '));
    /* 활성 칸: 노드는 있어도 화소가 0 이어야 한다(«열렸는가 ≠ 보이는가») */
    const d = await shot(page, '#blsC_rate .tm > .updot');
    ok(d.exists && d.display === 'none' && d.red === 0, '활성 칸 닷 — 노드는 있으나 화소 0',
      'display=' + d.display + ' red=' + d.red);
    /* 활성 칸 알약 안에 초록이 안 찍혀야 한다 */
    const t = await shot(page, '#blsC_rate .tm');
    ok(t.green < 500, '활성 칸 알약에 초록 화소 거의 없음', String(t.green));
    ok(st.side === true, '한 칸이라도 받을 수 있으면 사이드 점등', String(st.side));
    /* [H] 활성 국면에서도 알약 규격 불변 */
    ok(a.tm[2] === TM_W && a.tm[3] === TM_H, '[H] 활성 칸 알약 219x98 불변', a.tm[2] + 'x' + a.tm[3]);
    ok(errs.length === 0, '[B] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [C] 세 칸 다 활성 — 전부 소등 ═══════════════════════════════════ */
  console.log('\n[C] 세 칸 다 활성');
  {
    const { ctx, page, errs } = await boot(browser, [NOW() + HOUR, NOW() + HOUR, NOW() + HOUR]);
    const st = await state(page);
    ok(sig(st) === '00 00 00', '닷 0개', sig(st));
    ok(st.out.every(o => isCol(o.tmBg, BROWN)), '알약 3장 전부 갈색', st.out.map(o => o.tmBg).join(' '));
    ok(st.side === false && st.any === false, '사이드 «축복» 아이콘도 소등',
      'alert=' + st.side + ' blessAny=' + st.any);
    let red = 0;
    for (const o of st.out) red += (await shot(page, '#' + o.id + ' .tm > .updot')).red;
    ok(red === 0, '세 칸 닷 화소 합 0', String(red));
    ok(errs.length === 0, '[C] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [D] 클릭 — 그 칸만 즉시 소등 + 실제로 동작(기능 완성 규칙) ═════════ */
  console.log('\n[D] 카드 클릭 — 즉시 소등 + 기능');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, 0]);
    /* ⚠ 만료 시각은 `Date.now()`(13자리 ≈ 1.79e12) 라 `|0` 로 받으면 **32비트로 잘려** 음수가 된다.
       («미래인가» 가 −1786704595534ms 로 나온 자리다 — 시각에는 `|0` 을 쓰지 않는다.) */
    const before = await page.evaluate(() => ({
      atk: bonus().atk, on: blessOn('atk'), prog: S.bless.prog | 0, lv: blessLv(),
      exp: Number(S.bless.exp.atk) || 0,
    }));
    ok(before.on === false, '누르기 전 공격력 축복 꺼짐', String(before.on));
    /* 진짜 포인터 클릭 — 위임(`[data-bless]`)을 그대로 탄다(LESSONS 65-②) */
    await page.click('#blsC_atk');
    await page.waitForTimeout(120);      /* 22 와 달리 지연 재렌더가 없다 — 즉시여야 한다 */
    const st = await state(page);
    ok(sig(st) === '00 11 11', '누른 칸만 즉시 소등 · 나머지 두 칸 유지', sig(st));
    ok(isCol(st.out[0].tmBg, BROWN), '누른 칸 알약이 즉시 갈색으로', st.out[0].tmBg);
    ok(/^\d\d:\d\d:\d\d$/.test(st.out[0].txt), '누른 칸 글자가 남은 시간으로', st.out[0].txt);
    const d = await shot(page, '#blsC_atk .tm > .updot');
    ok(d.red === 0, '누른 칸 닷 화소 0', String(d.red));
    /* 기능 완성 규칙 — «만들어 놓음» 이 아니라 «동작함»: 상태·저장·배율까지 */
    const after = await page.evaluate(() => ({
      atk: bonus().atk, on: blessOn('atk'), prog: S.bless.prog | 0, lv: blessLv(),
      exp: Number(S.bless.exp.atk) || 0,
      saved: (() => { try { const j = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}');
        return Number((j.bless && (j.bless.exp || {}).atk)) || 0; } catch (e) { return -1; } })(),
    }));
    ok(after.on === true, '[기능] 공격력 축복이 실제로 켜졌다', String(after.on));
    ok(after.exp > Date.now(), '[기능] 만료 시각이 미래로 설정', String(after.exp - Date.now()) + 'ms 남음');
    ok(after.atk > before.atk, '[기능] bonus().atk 배율이 올랐다',
      px(before.atk) + ' → ' + px(after.atk));
    ok(after.prog === before.prog + 1 || after.lv > before.lv, '[기능] 축복 경험치 n/4 가 올랐다',
      before.prog + '→' + after.prog + ' lv ' + before.lv + '→' + after.lv);
    ok(after.saved === after.exp, '[기능] 세이브(S)에 반영됐다', 'saved=' + after.saved);
    /* 두 번 눌러도 시간이 덧붙지 않는다(기존 계약) */
    await page.click('#blsC_atk');
    await page.waitForTimeout(100);
    const twice = await page.evaluate(() => Number(S.bless.exp.atk) || 0);
    ok(twice === after.exp, '이미 켜진 칸을 또 눌러도 시간이 안 덧붙는다', String(twice - after.exp));
    ok(errs.length === 0, '[D] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [E] 만료 — 재점등 ═══════════════════════════════════════════════ */
  console.log('\n[E] 만료 후 재점등');
  {
    const { ctx, page, errs } = await boot(browser, [NOW() + HOUR, NOW() + HOUR, NOW() + HOUR]);
    ok(sig(await state(page)) === '00 00 00', '시작은 전부 소등', sig(await state(page)));
    /* 만료를 흉내낸다 — `blessTick()` 이 1초마다 열린 팝업을 다시 그린다 */
    await page.evaluate(() => { S.bless.exp.hp = Date.now() - 1; });
    await page.waitForTimeout(1400);
    const st = await state(page);
    ok(sig(st) === '00 11 00', '만료된 칸만 다시 점등', sig(st));
    ok(isCol(st.out[1].tmBg, GREEN), '재점등한 칸 알약이 다시 초록', st.out[1].tmBg);
    ok(st.out[1].txt === '받기', '재점등한 칸 글자가 «받기» 로', st.out[1].txt);
    const d = await shot(page, '#blsC_hp .tm > .updot');
    ok(d.red > 200, '재점등한 닷 화소 > 200', String(d.red));
    ok((await state(page)).side === true, '사이드 아이콘도 다시 점등', '');
    ok(errs.length === 0, '[E] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  /* ══ [F] 166 규약 + 특이성 되돌림 감시 ═══════════════════════════════ */
  console.log('\n[F] 166 규약 · #blsw 특이성 짝');
  {
    const { ctx, page, errs } = await boot(browser, [0, 0, 0]);
    /* 클래스를 떼면 꺼진다 — 점등은 오직 호스트 `.alert` 로만 갈린다 */
    /* ⚠ 319 처방(278) — 노드가 없는 트리에서도 즉사하지 않고 그 항목만 빨개지게 한다 */
    const off = await page.evaluate(() => {
      const tm = document.querySelector('#blsC_atk .tm');
      if (!tm) return '호스트 없음';
      tm.classList.remove('alert');
      const d = tm.querySelector('.updot');
      return d ? getComputedStyle(d).display : '배지 노드 없음';
    });
    ok(off === 'none', '`.alert` 를 떼면 닷이 꺼진다(점등 축이 하나다)', off);
    await page.evaluate(() => document.querySelector('#blsC_atk .tm').classList.add('alert'));
    /* ⚠ 되돌림 감시 — 스코프 짝을 지우면 상시 점등으로 돌아간다.
       `#blsw .updot{display:none}` 을 무력화해 보고, 그때 «안 켜져야 할 칸» 이 켜지는지 본다. */
    const bad = await page.evaluate(() => {
      S.bless.exp.rate = Date.now() + 3600e3; renderBless();
      const tm = document.querySelector('#blsC_rate .tm'), d = tm && tm.querySelector('.updot');
      if (!d) return { wasNone: false, now: 'none', missing: true };
      const wasNone = getComputedStyle(d).display === 'none';
      /* 스코프 짝만 빼고 클래스 급 규칙만 남긴 상태를 흉내낸다 */
      /* ⚑ 531 이관 — `#blsw .updot`(1,1,0) 만 무력화하면 531 예방 짝(1,1,1)이 그대로 눌러 둔다.
         같은 급(`#blsw s.updot` = 1,1,1)으로 올려 둘 다 걷는다. 식은 tools/dot531.js 참조. */
      const s = document.createElement('style');
      s.textContent = '#blsw .updot,#blsw s.updot{display:revert}';
      document.head.appendChild(s);
      const now = getComputedStyle(d).display;
      s.remove();
      return { wasNone, now };
    });
    ok(bad.wasNone === true, '활성 칸은 꺼져 있다(기준선)', String(bad.wasNone));
    ok(bad.now !== 'none', '스코프 짝을 빼면 상시 점등으로 돌아간다 — 그 두 줄이 실제로 일한다',
      'display=' + bad.now + ' (#blsw s{display:inline-block} 가 클래스 급을 이긴다)');
    /* 부품은 `updot` 한 종류뿐이다 — 34 안에 다른 배지 클래스를 새로 만들지 않았다 */
    const n = await page.evaluate(() => ({
      updot: document.querySelectorAll('#blsw .updot').length,
      bdg: document.querySelectorAll('#blsw .bdg,#blsw .dot,#blsw .nw').length,
    }));
    ok(n.updot === 3 && n.bdg === 0, '배지 부품은 `.updot` 3개뿐(새 클래스 안 만들었다)',
      'updot=' + n.updot + ' 기타=' + n.bdg);
    ok(errs.length === 0, '[F] 콘솔 에러 0', errs.join(' | ') || '없음');
    await ctx.close();
  }

  await browser.close();
  console.log('\nVERIFY325 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
