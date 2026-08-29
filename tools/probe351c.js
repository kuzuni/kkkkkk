#!/usr/bin/env node
/* 351c 프로브 — «조작» 축 셋(E1·E3·E4). 6회차 신설 · **406 에서 E1 을 «덮임» → «닿음» 으로 갈고 E4 신설.**
 *
 * 실행: node tools/probe351c.js [--only <라벨조각>] [--json <경로>]
 *
 * 왜 또 새 자인가 (5회차가 D7 을 신설한 것과 정확히 같은 이유):
 *   6회차에 비평가 6명(BY·BZ·CA·CB·CC·CD)이 r5 캡처를 채점했는데, 넷 이상이 «각자 1순위» 로
 *   짚은 자리를 `probe351` 이 **한 건도 못 냈다**. 원리적으로 못 본다 —
 *     · D7 의 «고정 내비» 목록이 **`#tabbar` 와 `.pedge` 둘뿐**이다. 좌측 사이드 레일(`.side .ibtn`)·
 *       우상단 `#menub` 은 목록에 없어서, 시트가 그것들을 통째로 덮어도 자는 조용하다.
 *     · D6(포인터)은 딤이 2280 에서도 막으므로 **차분에서 소거된다**(5회차가 D7 을 만든 그 이유).
 *
 * 재는 법은 축마다 다르다 — **묻는 것이 다르기 때문이다**:
 *   · E1·E4 는 «눌리나» 를 물으므로 `elementFromPoint`(단수형) = **포인터가 실제로 가 닿는 하나**.
 *   · E3 는 «읽히나» 를 물으므로 `elementsFromPoint`(복수형)로 스택을 받아 **딤은 통과시키고
 *     불투명 상자만** 센다(딤 뒤의 글자는 읽히지만, 딤 뒤의 버튼은 안 눌린다).
 *
 *   E1 조작 상실 — 고정 조작 요소가 2280 에서는 **닿는데** 1600 에서는 안 닿는다              (ⓑ·ⓓ)
 *   E3 잉크 충돌 — 배경 없는 **글자줄 둘이 서로 겹쳐** 양쪽 다 못 읽는다                       (ⓒ)
 *   E4 탈출 경로 — 열린 오버레이를 **닫는 점**이 1600 에서 하나도 안 닿는다                    (ⓓ)
 *
 * ⚑⚑ **E1 은 406 에서 축을 «덮임» 에서 «닿음» 으로 바꿨다 — 그것이 406 의 본체다.**
 *   6회차의 E1 은 «불투명 상자가 고정 조작 요소를 덮는 %» 를 재서 **88건 · 화면 21개**를 냈고,
 *   비평가 셋이 그 자리에서 갈렸다(CB·CC «1순위» ↔ CD «없음»). 갈린 것이 당연했다 —
 *   **덮임은 조작 상실이 아니다.** 오버레이 대부분은 딤이 이미 2280 에서 포인터를 막고 있어서
 *   그 버튼들은 **두 해상도 모두 안 눌린다**(덮인 그림만 1600 에서 늘어난다).
 *   406 이 `elementFromPoint` 로 88건을 전수 재판정한 결과:
 *     · **76건 / 화면 18개** — 2280 에서도 이미 **0% 닿음**. 1600 에서 «더 덮인다» 는 것은
 *       6회차가 E2 를 통째로 버린 그 이유(«짧은 프레임에서 더 덮이는 것은 짧다의 정의»)와 **같다.**
 *     · **12건 / 화면 3개**(`eqtab:sk`·`eqtab:cos`·`eqtab:pet`) — 2280 **100% → 1600 0%**. 이것만 실재다.
 *   ⇒ 규약: **«덮였나» 가 아니라 «닿나» 를 묻는다.** 2280 에서 이미 안 닿는 요소는 **판정 불가**로
 *      뺀다(기준선이 없으면 «침범 없음» 이 아니다 — LESSONS 351-④ 의 짝, 러너 주석과 같은 규칙).
 *
 * ⚑ **그리고 «닫는 길» 을 새 축으로 세웠다(E4) — 규약이 답을 가지려면 이쪽이 필요하다.**
 *   전체 시트가 열려 있는 동안 배경 레일이 안 눌리는 것은 **설계다**(이 게임의 오버레이 전부가
 *   그렇게 동작한다 · `#panel` 계열은 2280 에서도 이미 아래 두 칸 `coll`·`bless` 를 덮는다 —
 *   프레임이 짧아지면 같은 일이 여섯 칸으로 «연속으로» 늘 뿐 새 결함이 아니다).
 *   조작성이 실제로 깨지는 자리는 그게 아니라 **나갈 길이 막히는 것**이다 ⇒ 그것을 자로 세웠다.
 *
 * ⚑ **첫 판에 유령 546건을 내고 축 하나를 통째로 버렸다 — 그것이 이 자의 교훈이다.**
 *   버린 것은 «불투명 상자가 남의 글자 잉크를 덮는다»(E2, 366건) 였다. 팝업이 열리면 배경 글자는
 *   덮이는 것이 정상이고, **짧은 프레임에서 더 많이 덮이는 것은 «짧다» 의 정의**이지 결함이 아니다
 *   (그래서 차분이 소거해 주지도 않는다 — 2280 에서는 덜 덮으니 1600 쪽에만 남는다).
 *   채점 규칙이 이미 그 선을 그어 뒀다: 감점은 **«고정 내비·고정 조작 요소»** 를 덮을 때뿐이다.
 *   ⇒ 대상을 규칙이 말한 그 목록으로 좁혔다. 546 → 아래 결과.
 *
 * E1·E4 의 판정은 key 차분이 아니라 **같은 요소의 닿음 %를 두 해상도에서 재서 뺀다**.
 *   왜: 막는 상자가 해상도마다 다른 노드일 수 있어(시트 헤더 ↔ 시트 본문) key 차분이 «다른 결함»
 *   으로 갈라 놓는다. 묻는 것은 «누가 막았나» 가 아니라 «이 버튼이 1600 에서 안 눌리나» 다.
 * E3 은 key 차분이되, **양쪽 글자줄이 지금 실제로 보이는 것**일 때만 센다(불투명 상자에 덮인
 *   배경 글자끼리의 겹침은 사람에게 안 보인다 — 첫 판 유령 113건의 태반이 그것이었다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

/* 화면 목록·진입·정착·기준 해상도는 probe351 과 **같은 한 벌**을 쓴다(385 «자매 자 드리프트» 예방). */
const { collectOpeners, drive, fresh, settle, TALL, SHORT } = require('./probe351lib');

/* 닿음 통과선 — 5×5 격자에서 이 %% 이상 닿으면 «눌린다» 로 본다. 절반이면 손가락이 확실히 닿는다. */
const REACH = 50;

const SCAN = function () {
  const app = document.getElementById('app');
  if (!app) return { defects: [], cov: {} };
  const A = app.getBoundingClientRect();
  const out = [];
  const seen = new Set();

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
  };
  const pathOf = (el) => {
    const bits = [];
    for (let e = el; e && e !== document.body && bits.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { bits.unshift('#' + e.id); break; }
      const c = (e.className && typeof e.className === 'string') ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      bits.unshift(c ? s + '.' + c : s);
    }
    return bits.join('>');
  };
  const push = (kind, el, detail) => {
    const key = kind + '|' + pathOf(el) + '|' + detail.k;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, path: pathOf(el), key, ...detail });
  };

  /* 클리핑을 접은 «지금 실제로 그려지는» 상자 — D7 이 유령 때문에 배운 것과 같다.
     ⚠ 여기서는 스크롤 그릇을 «건너뛰지 않는다». 이 자가 묻는 것은 «지금 화면에서 덮였나» 이고,
     스크롤로 올려서 볼 수 있는지는 ⓐ(D5)의 질문이지 ⓑⓒ 의 질문이 아니다. */
  const drawnRect = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    d.w = d.x2 - d.x1; d.h = d.y2 - d.y1;
    return d;
  };
  const alphaOf = (el) => {
    const m = (getComputedStyle(el).backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(',').map((s) => parseFloat(s));
    return p.length > 3 ? p[3] : 1;
  };
  /* ⚑ 7회차 — «칠해졌나» 는 `backgroundColor` 하나로 못 묻는다(406 이 E1 에 한 것과 같은 정정).
     이 게임의 띠·패널은 태반이 `background:linear-gradient(...)` 라 **`backgroundColor` 가
     `rgba(0,0,0,0)` 으로 계산된다** — 눈에는 꽉 찬 불투명 초록인데 자에게는 «배경 없음» 이다.
     그래서 6회차 E3 7건 중 **bless 4건이 통째로 유령**이었다: `.bls-promo`(초록 그라데이션,
     952×249)가 탭바 글자를 완전히 덮고 있는데 자는 그 글자를 «아직 읽힌다» 로 세고 그 위의
     띠 글자와 «둘 다 못 읽는 충돌» 이라고 적었다.
     못박은 것은 자가 아니라 **찍힌 픽셀**이다(`tools/probe351d.js`, 350 처방) — 탭바를 숨겨도
     겹침 띠에서 바뀌는 픽셀이 **0 / 13860 · 0 / 1836 · 0 / 3456** 이었다.
     ⇒ 배경 이미지(그라데이션·url)도 «칠» 로 센다. */
  const paints = (el) => {
    if (alphaOf(el) >= 0.9) return true;
    return getComputedStyle(el).backgroundImage !== 'none';
  };
  const related = (a, b) => a === b || a.contains(b) || b.contains(a);

  /* 이 점에서 el 위에 **불투명하게** 얹힌 것이 있는가.
     `elementsFromPoint` 는 위→아래 순서로 스택을 준다 ⇒ el 을 만나기 전에 나온 것이 «위» 다. */
  const coverAt = (el, x, y) => {
    for (const h of document.elementsFromPoint(x, y)) {
      if (related(h, el)) return null;                  /* 자기(또는 부모/자식)를 만났다 = 위엔 없다 */
      if (h.classList && h.classList.contains('dim')) continue;   /* 딤은 규칙상 감점 아님 */
      if (paints(h)) return h;
    }
    return null;
  };
  /* ── E1 — «고정 조작 요소» 가 지금 **닿나** (406 에서 축을 덮임 → 닿음으로 바꿨다) ──────
     `elementFromPoint`(단수형)는 포인터가 실제로 가 닿는 한 개를 준다 — 딤이든 시트든
     **막는 것은 전부 막은 것으로** 세어지고, `pointer-events:none` 은 저절로 통과한다.
     그래서 «덮임» 과 달리 이 값은 «눌리나» 와 같은 말이다. 판정(Δ)은 러너가 한다. */
  const reachPct = (el, r) => {
    if (!(r.w > 3 && r.h > 3)) return null;
    let reach = 0, tested = 0; const who = new Map();
    for (const fx of [0.12, 0.3, 0.5, 0.7, 0.88]) for (const fy of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const x = r.x1 + r.w * fx, y = r.y1 + r.h * fy;
      if (x < A.left + 0.5 || x > A.right - 0.5 || y < A.top + 0.5 || y > A.bottom - 0.5) continue;
      tested++;
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) reach++;
      else if (hit) who.set(pathOf(hit), (who.get(pathOf(hit)) || 0) + 1);
    }
    if (tested < 8) return null;
    let by = null, best = 0;
    for (const [h, n] of who) if (n > best) { best = n; by = h; }
    return { pct: Math.round(100 * reach / tested), by };
  };

  const CONTROLS = '.side .ibtn, #menub, #tabbar .tab, #botleft .ubtn';
  const cov = {};
  for (const el of app.querySelectorAll(CONTROLS)) {
    if (!vis(el)) continue;
    const r = drawnRect(el);
    /* 프레임 밖으로 밀려나 «그려지지 않는» 버튼은 조작 상실이 아니라 잘림이다(D1·D4 몫). */
    if (!(r.w > 3 && r.h > 3)) continue;
    const c = reachPct(el, r);
    if (!c) continue;
    const k = pathOf(el) + '#' + (el.dataset.pop || el.dataset.t || el.dataset.util || el.id || '');
    cov[k] = { pct: c.pct, by: c.by };
  }

  /* ── E4 — «나갈 길» 이 닿나 (406 신설) ────────────────────────────────────────────
     열린 오버레이를 닫는 점은 이 게임에 세 꼴이 있다:
       ① `#panel` 계열 시트 — 열린 탭이 **탭바에서 ✕ 칸으로 치환**된다(`.tab.close`, 마크업 13970)
       ② 공용 모달 — **배경(`#modal` 자신) 클릭이 닫기**다(33092 · 267 이 [닫기] 버튼을 없앤 뒤의 규약)
       ③ 전용 오버레이 — 자기 ✕ 를 갖는다(`#mailX`·`#blsX` 등)
     ②는 «버튼» 이 아니라 «면» 이라 셀렉터로 못 잡는다 ⇒ 오버레이 위의 점 중 **elementFromPoint 가
     그 오버레이 «자신» 을 돌려주는 점**(= 상자 밖 = 눌리면 닫히는 점)을 센다.
     ⚑ **목록은 내가 고른 게 아니라 제품에서 읽은 것이다** — `e.target === 자기 자신이면 닫는다`
        는 꼴을 전수로 훑어 나온 열둘이다(index.html 23436·24535·27442·27558·27633·27726·
        27810·27864·27910·27977·28040·33092). 오버레이가 늘면 여기도 늘려야 한다. */
  const SELFCLOSE = ['modal', 'pfw', 'specw', 'bagw', 'blsw', 'collw', 'cfw', 'dclw', 'dgdw', 'wpnw', 'prbw', 'ciw',
    'mnw'];   /* ▦ 메뉴는 «자기 위 아무 데나» 가 닫기다(30267 — `.mn-col` 만 전파를 끊는다) */
  /* `#tabbar .tab` 이 통째로 탈출 경로인 이유: 다른 탭으로 이동하면 열려 있던 페이지·시트가
     같이 닫히고(29970 «다른 탭으로 이동하면 페이지를 닫는다»), 같은 탭을 다시 누르면 토글로
     닫힌다(29943 `#relw`). 그래서 `.close` 칸으로 치환된 탭만 세면 전체화면 «페이지» 계열이
     통째로 «나갈 길 0» 으로 읽힌다 — 실제로는 탭 하나로 나가진다. */
  const ESC = '#tabbar .tab, #mailX, #blsX, .bls-x, .ml-close, #chBack, #rkBack, [data-pback]';
  let esc = 0; const escBy = [];
  for (const el of app.querySelectorAll(ESC)) {
    if (!vis(el)) continue;
    const c = reachPct(el, drawnRect(el));
    if (c && c.pct >= 50) { esc++; escBy.push(pathOf(el) + ' ' + c.pct + '%'); }
  }
  for (const id of SELFCLOSE) {
    const ov = document.getElementById(id);
    if (!ov || !vis(ov)) continue;
    const r = ov.getBoundingClientRect();
    if (!(r.width > 3 && r.height > 3)) continue;          /* 안 열린 오버레이는 0×0 이다 */
    let back = 0, tested = 0;
    for (const fx of [0.06, 0.5, 0.94]) for (const fy of [0.04, 0.12, 0.5, 0.88, 0.96]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < A.left + 0.5 || x > A.right - 0.5 || y < A.top + 0.5 || y > A.bottom - 0.5) continue;
      tested++;
      if (document.elementFromPoint(x, y) === ov) back++;
    }
    if (tested && back) { esc++; escBy.push('#' + id + ' 배경 ' + back + '/' + tested + '점'); }
  }

  /* ── E3 — 배경 없는 «글자줄 둘» 이 서로 겹쳐 양쪽 다 못 읽는다 ──────────────────────
     E1 은 «불투명 상자» 를 전제한다. 배경이 아예 없는 글자줄 둘이 포개지면 스택에 불투명한 것이
     없어 조용하고, 그러면서 사람 눈에는 가장 심하게 깨진다(하단 앵커 문구가 상단 앵커 카드
     안으로 빨려 들어가는 자리). ⇒ 잉크 상자끼리 직접 잰다.
     ⚠ **양쪽이 지금 실제로 보이는 것일 때만 센다** — 팝업 뒤에 가려진 배경 글자끼리의 겹침을
       세면 첫 판처럼 유령이 쏟아진다(그건 사람에게 안 보인다). */
  const textLeaves = [];
  for (const el of app.querySelectorAll('*')) {
    if (!vis(el)) continue;
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    if (!t.trim()) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 11) continue;
    const r = drawnRect(el);
    if (!(r.w > 8 && r.h > 8) || r.w * r.h > 300000) continue;
    if (paints(el)) continue;                            /* 배경이 있으면 그것은 상자다(E1 의 몫) — 그라데이션 포함(7회차) */
    /* 지금 보이나 — 중심이 불투명한 남에게 덮여 있으면 뺀다 */
    if (coverAt(el, (r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2)) continue;
    textLeaves.push({ el, r, txt: t.trim().slice(0, 14) });
  }
  for (let i = 0; i < textLeaves.length; i++) {
    for (let j = i + 1; j < textLeaves.length; j++) {
      const a = textLeaves[i], b = textLeaves[j];
      if (related(a.el, b.el)) continue;
      const ox = Math.min(a.r.x2, b.r.x2) - Math.max(a.r.x1, b.r.x1);
      const oy = Math.min(a.r.y2, b.r.y2) - Math.max(a.r.y1, b.r.y1);
      if (ox <= 0 || oy <= 0) continue;
      const small = Math.min(a.r.w * a.r.h, b.r.w * b.r.h);
      if (small <= 0) continue;
      const pct = Math.round(100 * ox * oy / small);
      if (pct < 30) continue;
      push('E3', a.el, { k: 'ovl:' + pathOf(b.el), pct, txt: a.txt + ' ↔ ' + b.txt });
    }
  }

  return { defects: out, cov, esc, escBy };
};

(async () => {
  const browser = await launch(chromium);
  const results = [];
  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => o.label.includes(ONLY));
    console.log(`[351c] 화면 ${openers.length}개 × 2해상도 — 조작 상실 E1(닿음 ≥${REACH}% → <${REACH}%) · 잉크 충돌 E3 · 탈출 경로 E4`);

    for (const o of openers) {
      const scan = async ([w, h]) => {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, o);
        await settle(page);
        const r = await page.evaluate(SCAN).catch((e) => ({ defects: [], cov: {}, err: String(e.message || e) }));
        await ctx.close();
        return r;
      };
      const tall = await scan(TALL);
      const short = await scan(SHORT);

      /* E1 — 같은 조작 요소의 **닿음 %** 를 뺀다. 2280 에 없던 요소는 판정하지 않고
         (기준선이 없으면 «침범 없음» 이 아니라 «판정 불가» — LESSONS 351-④ 의 짝),
         **2280 에서 이미 안 닿는 것도 판정하지 않는다**(406 규약 — 그건 «시트가 화면을
         소유한다» 는 이 게임 공통 설계이지 1600 이 만든 결함이 아니다. 나갈 길은 E4 가 본다). */
      const regress = [];
      for (const k of Object.keys(short.cov)) {
        if (!(k in tall.cov)) continue;
        if (tall.cov[k].pct < REACH) continue;               /* 2280 에서 이미 안 닿는다 = 판정 불가 */
        if (short.cov[k].pct >= REACH) continue;             /* 1600 에서도 닿는다 = 정상 */
        regress.push({ kind: 'E1', path: short.cov[k].by || '?', key: 'E1|' + k,
          k: 'lost:' + k, reach: short.cov[k].pct, was: tall.cov[k].pct });
      }
      /* E4 — 나갈 길. 2280 에는 있는데 1600 에 하나도 없으면 결함이다. */
      if (tall.esc > 0 && short.esc === 0) {
        regress.push({ kind: 'E4', path: '(없음)', key: 'E4|esc',
          k: 'noexit', esc: short.esc, was: tall.esc, tallBy: tall.escBy.join(' · ') });
      }
      const tallKeys = new Set(tall.defects.map((d) => d.key));
      for (const d of short.defects) if (!tallKeys.has(d.key)) regress.push(d);

      results.push({ label: o.label, regress });
      const mark = regress.length ? `⚠ ${regress.length}` : '·';
      console.log(`  ${mark.padEnd(5)} ${o.label.padEnd(22)} 조작 ${Object.keys(short.cov).length}개 · 나갈길 ${tall.esc}→${short.esc}`);
      for (const d of regress.slice(0, 8)) {
        console.log(`        ${d.kind} ${d.path} ${JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !['kind', 'path', 'key'].includes(k))))}`);
      }
    }
  } finally { await browser.close(); }

  const tot = results.reduce((a, r) => a + r.regress.length, 0);
  const bad = results.filter((r) => r.regress.length);
  console.log(`\n[351c] 1600 에서만 생긴 결함 ${tot}건 · 화면 ${bad.length}/${results.length}`);
  const byKind = {};
  for (const r of results) for (const d of r.regress) byKind[d.kind] = (byKind[d.kind] || 0) + 1;
  console.log('  종류별: ' + (Object.keys(byKind).length ? Object.entries(byKind).map(([k, v]) => `${k}=${v}`).join(' · ') : '없음'));
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify(results, null, 1)); console.log('  JSON → ' + JSONOUT); }
  process.exit(0);
})().catch((e) => { console.error('PROBE351C CRASH', e); process.exit(2); });
