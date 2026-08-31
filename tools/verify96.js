/* 작업 96 — 서브탭 공용화 게이트
 *
 * 저장소 주인 지시(2026-08-26)의 검증 항목을 그대로 옮긴 것이다:
 *   ① 영웅 4탭 · 던전 2탭 · 상점 2탭의 **활성/비활성 칸 스타일이 동일**
 *      (computed style 비교: 배경·테두리·폰트 Δ0)
 *   ② 영웅 스킬↔장비 전환 연속 8프레임에서 **`#eqw` bbox 이동 0**
 *      (= «장비 탭만 아래에서 다시 등장» 하지 않는다)
 *   ③ 폐기 부품 잔존 0 (`.dns-t.l/.r` 스킨 · `.shp-cat-pill` · `.shp-cs` · `.eqtc>b` · `#herosub`)
 *   ④ 전환이 실제로 동작(본문 교체 · shopCat/dunSub 상태 · 콘솔 에러 0)
 *
 * 실행: node tools/verify96.js  → 마지막 줄이 `VERIFY96 PASS` 여야 한다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log('  ' + (c ? 'PASS' : 'FAIL') + ' ' + n + (d ? ' — ' + d : '')); };

/* 비교 대상 — «배경·테두리·폰트» 축만 본다(위치·폭은 화면별 실측이라 다르다) */
const CELL_PROPS = ['backgroundImage', 'backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderTopColor',
  'borderRadius', 'boxShadow', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight'];
const BAR_PROPS = ['backgroundImage', 'backgroundColor', 'borderTopWidth', 'borderTopColor',
  'borderRadius', 'height', 'boxSizing'];
/* 219 — 잉크 축에서 `textShadow` 를 뺐다. 96 의 «한 부품이면 네 자리가 같다» 는 전제가
   **외곽선 축에서만** 죽었다: 126 ③ 17·18회차가 10 상점 ref 실측으로 `#shopCats .stab>i.ol3/.ol4`
   덧칠(드롭 2항)과 활성 링 −30% 를 얹었고, 그 주석이 «확산은 그 화면 ref 실측이 생긴 뒤에 한다» 로
   범위를 못 박았다. 나머지 다섯 축(크기·굵기·색·보정 transform·stroke)은 네 자리가 그대로 같으므로
   여기서 계속 Δ0 로 지킨다. 외곽선은 지우지 않고 **[1-b] 로 이사**시킨다(LESSONS 168-②·185-④·214-④). */
const INK_PROPS = ['fontSize', 'fontWeight', 'color', 'transform', 'webkitTextStrokeWidth'];
const SH_PROPS = ['textShadow', 'fontSize'];

/* [1-b] 기대값 — **게이트 자기 상수**로 둔다. 페이지의 CSS 변수를 다시 읽어 비교하면 항등식이라
   토큰이 통째로 망가져도 같이 틀려 초록으로 샌다(LESSONS 212-①). */
const RING = { off: { r: 3, d: 2 }, on: { r: 4, d: 3 } };         /* 공용 `.ol3`/`.ol4` 등방 링(직교/대각) */
const SHOP = { off: { r: 3, d: 2 }, on: { r: 2.8, d: 2.1 } };     /* 126 ③ 18회차 — 활성만 ref 실측으로 −30% */
const DROP = 0.053, DROPX = 0.040;                                 /* :root `--sh-drop` / `--sh-dropx` (em) */
const EPS = 0.02;

/* "rgb(0, 0, 0) 3px 0px 0px, …" → [{x,y}] — 괄호 안 쉼표를 피해 자른다 */
const parseSh = ts => (!ts || ts === 'none') ? [] : ts.split(/,(?![^()]*\))/).map(s => {
  const m = s.trim().match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/);
  return m ? { x: +m[1], y: +m[2], b: +m[3] } : { raw: s.trim() };
});
/* 등방 링 8항인가 — 직교 4항 r · 대각 4항 d. 순서는 안 따지고 «집합» 으로 본다 */
const ringOk = (terms, r, d) => {
  const t = terms.slice(0, 8);
  if (t.length !== 8 || t.some(v => v.raw !== undefined)) return false;
  const key = v => v.x.toFixed(2) + '/' + v.y.toFixed(2);
  const want = [[r, 0], [-r, 0], [0, r], [0, -r], [d, d], [d, -d], [-d, d], [-d, -d]]
    .map(([x, y]) => x.toFixed(2) + '/' + y.toFixed(2)).sort().join(' ');
  return t.map(key).sort().join(' ') === want;
};

const grab = `(el, props) => { const cs = getComputedStyle(el); const o = {};
  props.forEach(p => o[p] = cs[p]); return o; }`;

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    /* 219 — 되돌림 시험(`tools/neg219.js`)이 «갈아 끼운 사본» 을 새로 열어 재기 위한 문. 기본값은 실물이다.
       LESSONS 191: 레이아웃이 끝난 뒤 `head` 에 규칙을 주입하면 정렬이 다시 안 풀려 게이트가 거짓 초록을 낸다. */
    await page.goto('file://' + path.resolve(process.env.V96_SRC || path.join(__dirname, '..', 'index.html')));
    await page.waitForTimeout(900);

    /* ---------- ③ 폐기 부품 잔존 0 ---------- */
    console.log('\n[3] 폐기 부품 잔존 0');
    const dead = await page.evaluate(() => {
      const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (_) { return []; } })
        .map(r => r.selectorText || '').join(' | ');
      return {
        herosub: !!document.getElementById('herosub'),
        pill: document.querySelectorAll('.shp-cat-pill').length,
        cs: document.querySelectorAll('.shp-cs').length,
        eqtd: document.querySelectorAll('.eqtd').length,
        cssPill: /\.shp-cat-pill/.test(css),
        cssDnsT: /\.dns-t\.(l|r|on|off)/.test(css),
        cssEqtc: /\.eqtc(\.|>|\s|,)/.test(css),
        bars: document.querySelectorAll('.stabs').length,
      };
    });
    ok('#herosub 노드 폐기', dead.herosub === false, String(dead.herosub));
    ok('.shp-cat-pill 노드 0', dead.pill === 0, dead.pill + '개');
    ok('.shp-cs(✦) 노드 0', dead.cs === 0, dead.cs + '개');
    ok('.eqtd(06 구분선) 노드 0', dead.eqtd === 0, dead.eqtd + '개');
    ok('.shp-cat-pill CSS 규칙 0', dead.cssPill === false, String(dead.cssPill));
    ok('.dns-t.l/.r/.on/.off 스킨 CSS 규칙 0', dead.cssDnsT === false, String(dead.cssDnsT));
    ok('.eqtc 스킨 CSS 규칙 0', dead.cssEqtc === false, String(dead.cssEqtc));
    ok('공용 부품 .stabs 바가 DOM 에 있다', dead.bars >= 2, dead.bars + '개');

    /* ---------- ① 세 화면의 칸 스타일 동일 ---------- */
    console.log('\n[1] 활성/비활성 칸 스타일 Δ0 (영웅 4탭 · 던전 2탭 · 상점 2탭)');

    /* 영웅 — 스킬 시트를 연다 */
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(600);
    const hero = await page.evaluate(([g, cp, bp, ip, sp]) => {
      const G = eval(g), bar = document.querySelector('#bSk .stabs');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip),
        offS: G(bar.querySelector('.stab:not(.on)>i'), sp), onS: G(bar.querySelector('.stab.on>i'), sp),
        /* 378 (2026-08-29) — 활성 칸이 **셸 안쪽 변에 닿는가**. 닿는 면은 알약의 검정 7 을
           셸 테두리에 넘기므로(ref 규약 — 352 §8) 같은 부품이라도 boxShadow 가 갈린다.
           «부품이 하나» 라는 이 게이트의 물음은 그대로 두되, 비교를 **같은 자리끼리** 한다. */
        onPos: (() => {
          const b = bar.getBoundingClientRect(), on = bar.querySelector('.stab.on');
          if (!on) return null;
          const c = on.getBoundingClientRect(), bw = parseFloat(getComputedStyle(bar).borderLeftWidth);
          return { L: Math.abs(c.left - (b.left + bw)) <= 0.6, R: Math.abs(c.right - (b.right - bw)) <= 0.6 };
        })(),
        /* 409 이관 (2026-08-30) — 검정은 이제 밴드가 아니라 `::after` 의 **등폭 링**이고,
           «어느 면에 붙는가» 는 그 링의 **코너 기둥 마스크**가 정한다. 378 의 자리 규칙이
           손잡이 둘(밴드·마스크)로 갈렸으므로 **둘 다 읽는다** — 밴드만 물면 마스크를
           통째로 지워도 초록이 된다. */
        onRing: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::after');
          return { sh: cs.boxShadow,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })(),
        /* 409 4회차 이관 — 가로 띠(`::before`)도 이제 **자리 손잡이(`--pill-mask`)를 쓴다**.
           384 때는 상자가 «좌·우만 7 인셋» 이라 자리와 무관했는데, 검정이 동심 링이 되면서
           이 상자가 «검정의 안쪽 윤곽»(사방 7 인셋 · r23)으로 옮겨 갔고 직선 구간 기여를
           지우려고 같은 코너 기둥 마스크를 쓴다 ⇒ 끝 칸에서 기둥 하나가 빠진다. */
        onBand: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::before');
          return { sh: cs.boxShadow, top: cs.top, bottom: cs.bottom, left: cs.left, right: cs.right,
            r: cs.borderRadius,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })() };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS, SH_PROPS]);

    /* 06 장비 — 같은 영웅 탭의 오버레이 */
    await page.evaluate(() => heroSubGo('eq'));
    await page.waitForTimeout(600);
    const eq = await page.evaluate(([g, cp, bp, ip, sp]) => {
      const G = eval(g), bar = document.getElementById('eqTabs');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip),
        offS: G(bar.querySelector('.stab:not(.on)>i'), sp), onS: G(bar.querySelector('.stab.on>i'), sp),
        /* 378 (2026-08-29) — 활성 칸이 **셸 안쪽 변에 닿는가**. 닿는 면은 알약의 검정 7 을
           셸 테두리에 넘기므로(ref 규약 — 352 §8) 같은 부품이라도 boxShadow 가 갈린다.
           «부품이 하나» 라는 이 게이트의 물음은 그대로 두되, 비교를 **같은 자리끼리** 한다. */
        onPos: (() => {
          const b = bar.getBoundingClientRect(), on = bar.querySelector('.stab.on');
          if (!on) return null;
          const c = on.getBoundingClientRect(), bw = parseFloat(getComputedStyle(bar).borderLeftWidth);
          return { L: Math.abs(c.left - (b.left + bw)) <= 0.6, R: Math.abs(c.right - (b.right - bw)) <= 0.6 };
        })(),
        /* 409 이관 (2026-08-30) — 검정은 이제 밴드가 아니라 `::after` 의 **등폭 링**이고,
           «어느 면에 붙는가» 는 그 링의 **코너 기둥 마스크**가 정한다. 378 의 자리 규칙이
           손잡이 둘(밴드·마스크)로 갈렸으므로 **둘 다 읽는다** — 밴드만 물면 마스크를
           통째로 지워도 초록이 된다. */
        onRing: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::after');
          return { sh: cs.boxShadow,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })(),
        /* 409 4회차 이관 — 가로 띠(`::before`)도 이제 **자리 손잡이(`--pill-mask`)를 쓴다**.
           384 때는 상자가 «좌·우만 7 인셋» 이라 자리와 무관했는데, 검정이 동심 링이 되면서
           이 상자가 «검정의 안쪽 윤곽»(사방 7 인셋 · r23)으로 옮겨 갔고 직선 구간 기여를
           지우려고 같은 코너 기둥 마스크를 쓴다 ⇒ 끝 칸에서 기둥 하나가 빠진다. */
        onBand: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::before');
          return { sh: cs.boxShadow, top: cs.top, bottom: cs.bottom, left: cs.left, right: cs.right,
            r: cs.borderRadius,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })() };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS, SH_PROPS]);

    /* 03 던전 */
    await page.evaluate(() => { goTab('adv'); });
    await page.waitForTimeout(600);
    const dun = await page.evaluate(([g, cp, bp, ip, sp]) => {
      const G = eval(g), bar = document.getElementById('dunSub');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip),
        offS: G(bar.querySelector('.stab:not(.on)>i'), sp), onS: G(bar.querySelector('.stab.on>i'), sp),
        /* 378 (2026-08-29) — 활성 칸이 **셸 안쪽 변에 닿는가**. 닿는 면은 알약의 검정 7 을
           셸 테두리에 넘기므로(ref 규약 — 352 §8) 같은 부품이라도 boxShadow 가 갈린다.
           «부품이 하나» 라는 이 게이트의 물음은 그대로 두되, 비교를 **같은 자리끼리** 한다. */
        onPos: (() => {
          const b = bar.getBoundingClientRect(), on = bar.querySelector('.stab.on');
          if (!on) return null;
          const c = on.getBoundingClientRect(), bw = parseFloat(getComputedStyle(bar).borderLeftWidth);
          return { L: Math.abs(c.left - (b.left + bw)) <= 0.6, R: Math.abs(c.right - (b.right - bw)) <= 0.6 };
        })(),
        /* 409 이관 (2026-08-30) — 검정은 이제 밴드가 아니라 `::after` 의 **등폭 링**이고,
           «어느 면에 붙는가» 는 그 링의 **코너 기둥 마스크**가 정한다. 378 의 자리 규칙이
           손잡이 둘(밴드·마스크)로 갈렸으므로 **둘 다 읽는다** — 밴드만 물면 마스크를
           통째로 지워도 초록이 된다. */
        onRing: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::after');
          return { sh: cs.boxShadow,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })(),
        /* 409 4회차 이관 — 가로 띠(`::before`)도 이제 **자리 손잡이(`--pill-mask`)를 쓴다**.
           384 때는 상자가 «좌·우만 7 인셋» 이라 자리와 무관했는데, 검정이 동심 링이 되면서
           이 상자가 «검정의 안쪽 윤곽»(사방 7 인셋 · r23)으로 옮겨 갔고 직선 구간 기여를
           지우려고 같은 코너 기둥 마스크를 쓴다 ⇒ 끝 칸에서 기둥 하나가 빠진다. */
        onBand: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::before');
          return { sh: cs.boxShadow, top: cs.top, bottom: cs.bottom, left: cs.left, right: cs.right,
            r: cs.borderRadius,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })() };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS, SH_PROPS]);

    /* 10 상점 */
    await page.evaluate(() => goTab('shop'));
    await page.waitForTimeout(600);
    const shop = await page.evaluate(([g, cp, bp, ip, sp]) => {
      const G = eval(g), bar = document.getElementById('shopCats');
      return { bar: G(bar, bp),
        off: G(bar.querySelector('.stab:not(.on)'), cp), on: G(bar.querySelector('.stab.on'), cp),
        offI: G(bar.querySelector('.stab:not(.on)>i'), ip), onI: G(bar.querySelector('.stab.on>i'), ip),
        offS: G(bar.querySelector('.stab:not(.on)>i'), sp), onS: G(bar.querySelector('.stab.on>i'), sp),
        /* 378 (2026-08-29) — 활성 칸이 **셸 안쪽 변에 닿는가**. 닿는 면은 알약의 검정 7 을
           셸 테두리에 넘기므로(ref 규약 — 352 §8) 같은 부품이라도 boxShadow 가 갈린다.
           «부품이 하나» 라는 이 게이트의 물음은 그대로 두되, 비교를 **같은 자리끼리** 한다. */
        onPos: (() => {
          const b = bar.getBoundingClientRect(), on = bar.querySelector('.stab.on');
          if (!on) return null;
          const c = on.getBoundingClientRect(), bw = parseFloat(getComputedStyle(bar).borderLeftWidth);
          return { L: Math.abs(c.left - (b.left + bw)) <= 0.6, R: Math.abs(c.right - (b.right - bw)) <= 0.6 };
        })(),
        /* 409 이관 (2026-08-30) — 검정은 이제 밴드가 아니라 `::after` 의 **등폭 링**이고,
           «어느 면에 붙는가» 는 그 링의 **코너 기둥 마스크**가 정한다. 378 의 자리 규칙이
           손잡이 둘(밴드·마스크)로 갈렸으므로 **둘 다 읽는다** — 밴드만 물면 마스크를
           통째로 지워도 초록이 된다. */
        onRing: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::after');
          return { sh: cs.boxShadow,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })(),
        /* 409 4회차 이관 — 가로 띠(`::before`)도 이제 **자리 손잡이(`--pill-mask`)를 쓴다**.
           384 때는 상자가 «좌·우만 7 인셋» 이라 자리와 무관했는데, 검정이 동심 링이 되면서
           이 상자가 «검정의 안쪽 윤곽»(사방 7 인셋 · r23)으로 옮겨 갔고 직선 구간 기여를
           지우려고 같은 코너 기둥 마스크를 쓴다 ⇒ 끝 칸에서 기둥 하나가 빠진다. */
        onBand: (() => {
          const on = bar.querySelector('.stab.on');
          if (!on) return null;
          const cs = getComputedStyle(on, '::before');
          return { sh: cs.boxShadow, top: cs.top, bottom: cs.bottom, left: cs.left, right: cs.right,
            r: cs.borderRadius,
            mask: (cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage) || '' };
        })() };
    }, [grab, CELL_PROPS, BAR_PROPS, INK_PROPS, SH_PROPS]);

    const diff = (a, b, skip) => Object.keys(a).filter(k => !(skip || []).includes(k) && a[k] !== b[k])
      .map(k => k + ': ' + a[k] + ' ≠ ' + b[k]);
    /* 378 이관 — 알약의 좌·우 밴드는 «면이 셸 안쪽 변에 닿는가» 하나로 정해진다.
       규칙을 **여기서 다시 조립**해 둔다 — 문자열을 통째로 박아 두면 값이 바뀔 때 뜻을 잃는다. */
    const BLK = 'rgb(0, 0, 0)', BEV = 'rgb(99, 79, 55)';
    /* 409 이관 (2026-08-30) — **밴드에는 이제 베벨만 남는다.** 검정은 `::after` 의 등폭 링이
       그리므로(384 §6-1 ⓐ 가 되돌린 자리 — 검정을 여기 두면 코너에서 7·cos α 로 깎인다),
       자리 규칙은 «닿는 면은 베벨이 7 에서 시작한다»(= 검정 몫 7 을 셸에 넘겼다) 로 읽는다. */
    /* 409 11회차 이관 (2026-08-31) — 부모 `box-shadow` **첫 항에 바닥 띠**(`#413122`)가 한 겹 올라갔다
       (옆띠가 아래 코너를 감고 올라와 만들던 «밝은 쐐기» 를 덮는다 — 409 §20). 자리 규칙은
       그대로 «옆띠 두 개» 이고, 그 앞에 자리와 **무관한** 한 겹이 붙었을 뿐이라 규칙 문자열에
       그대로 적는다 — 빼면 이 항이 빨개진다(무르게 안 풀었다). */
    const shadowRule = p => !p ? null : [
      'rgb(65, 49, 34) 0px -7px 0px 0px inset',
      (p.L ? BEV + ' 7px' : BEV + ' 14px') + ' 0px 0px 0px inset',
      (p.R ? BEV + ' -7px' : BEV + ' -14px') + ' 0px 0px 0px inset',
    ].join(', ');
    /* 409 이관 — 자리 규칙의 **나머지 반쪽**. 링은 코너 기둥(좌·우 30px = 반경)에만 남고,
       셸에 닿는 면은 그 기둥이 통째로 빠진다. 문자열을 박지 않고 «기둥이 있나» 로 묻는다. */
    /* 463 이관 (2026-08-30) — **기둥 폭은 층마다 다르다. 한 술어로 둘을 물으면 안 된다.**
       마스크는 자기 상자의 국소 좌표로 읽히므로 «알약 x 0..30 을 덮는다» 는 뜻을 지키려면
       기둥 폭 = **30 − 그 층의 가로 인셋** 이어야 한다:
         · `::after`(링)  = 인셋 0 → **30**
         · `::before`(띠) = 인셋 7 → **23**   ← 463 이 고친 자리(수리 전에는 둘 다 30 이라
                                                띠가 직선부 7px 을 더 덮고 있었다)
       ⇒ 값을 두 벌 박지 말고 «인셋 + 기둥 = 30» 이라는 **한 불변식**에서 유도해 묻는다.
       그러면 다음에 어느 층의 인셋이 바뀌어도 이 자가 곧바로 그 층에게 맞는 값을 요구한다. */
    const COL = 30;                                   /* 알약 반경 = 코너 기둥의 폭(352 §10) */
    const maskHasLn = (m, n) => new RegExp('^linear-gradient\\(90deg, rgb\\(0, 0, 0\\) 0px, rgb\\(0, 0, 0\\) ' + n + 'px').test(m);
    /* 409 11회차 이관 — 마스크가 다층이 됐다(기둥 + «어깨» 원판·보호 `radial-gradient`).
       기둥은 **첫 층**이므로 거기서만 읽는다 — 층이 하나 는 것만으로 빨개지던 자를 옮긴다. */
    const maskHasRn = (m, n) => new RegExp('rgb\\(0, 0, 0\\) calc\\(100% - ' + n + 'px\\)\\)$')
      .test(String(m || '').split(/,\s*radial-gradient/)[0].trim());
    /* 링(`::after`)은 인셋 0 이라 30 — 아래 [1-c] 링 항이 이 짝을 쓴다. */
    const maskHasL = m => maskHasLn(m, COL);
    const maskHasR = m => maskHasRn(m, COL);
    const posName = p => !p ? '?' : (p.L ? '좌' : '') + (p.R ? '우' : '') || '가운데';
    const cmp = (label, key, props) => {
      [['06 장비', eq], ['03 던전', dun], ['10 상점', shop]].forEach(([n, o]) => {
        /* 활성 칸끼리 비교할 때, **자리가 다르면** boxShadow 만 빼고 나머지 11개를 그대로 묻는다.
           뺀 한 개는 아래 [1-c] 가 자리별 규칙으로 각 호스트에서 따로 문다 — 무르게 푼 게 아니다. */
        const posDiff = key === 'on' && hero.onPos && o.onPos
          && (hero.onPos.L !== o.onPos.L || hero.onPos.R !== o.onPos.R);
        const d = diff(hero[key], o[key], posDiff ? ['boxShadow'] : []);
        ok(label + ' — 영웅 vs ' + n + ' Δ0' + (posDiff ? ' (자리 ' + posName(hero.onPos) + ' vs ' + posName(o.onPos) + ' — 밴드는 [1-c])' : ''),
          d.length === 0, d.length ? d.slice(0, 3).join(' / ') : (props.length - (posDiff ? 1 : 0)) + '개 속성 일치');
      });
    };
    cmp('바 껍데기', 'bar', BAR_PROPS);
    cmp('비활성 칸', 'off', CELL_PROPS);
    cmp('활성 칸', 'on', CELL_PROPS);
    cmp('비활성 라벨', 'offI', INK_PROPS);
    cmp('활성 라벨', 'onI', INK_PROPS);

    /* ---------- [1-b] 378 — 알약 좌·우 밴드는 «자리» 하나로 정해진다 ----------
       cmp 가 자리 차이로 뺀 boxShadow 를 여기서 **호스트마다** 되받는다. 네 호스트 중
       가운데(영웅·03)와 끝(06·10)이 둘 다 표본에 있어 두 갈래가 모두 살아 있다 —
       한 갈래만 있으면 규칙을 통째로 지워도 초록이 된다(LESSONS 328·334). */
    console.log('\n[1-c] 378 — 활성 알약 좌·우 밴드 = 자리 규칙 (닿는 면은 검정을 셸에 넘긴다)');
    let posEnd = 0, posMid = 0;
    [['영웅', hero], ['06 장비', eq], ['03 던전', dun], ['10 상점', shop]].forEach(([n, o]) => {
      const want = shadowRule(o.onPos);
      if (o.onPos && (o.onPos.L || o.onPos.R)) posEnd++; else posMid++;
      ok(n + ' 활성 칸 자리 «' + posName(o.onPos) + '» → 밴드(베벨)가 그 자리 규칙과 같다',
        !!want && o.on.boxShadow === want, o.on.boxShadow);
      /* 409 이관 — 같은 자리 규칙을 **링 쪽에서도** 묻는다.
         ⚑ **462 이관 (2026-08-30) — 이 층은 이제 «부품 하나» 가 아니다.** 끝 칸의 «셸에 안 닿는»
            면은 세 띠를 그릴 상자가 없어서(세로 인셋을 두 면이 공유한다) 이 `::after` 에
            **스프레드 7 짜리 띠 두 겹**을 얹었다 — 그림자 상자가 «알약 사방 7 인셋»(= 가운데 칸
            `::before` 의 상자)이 되어 같은 띠가 같은 자리에 생긴다.
            값만 넓혀 통과시키면 «462 가 통째로 사라져도 초록» 이 되므로 **묻는 것을 갈았다**:
            ① 검정 링은 여전히 **첫 항**이고 등폭 7(409 그대로) ②그 뒤가 **자리 규칙**을 따른다 —
            가운데 칸은 링 하나뿐 · 끝 칸은 462 두 겹이 정확히 뒤따른다. 어느 쪽이 사라져도 빨갛다. */
      const r = o.onRing;
      const RING = BLK + ' 0px 0px 0px 7px inset';
      /* 409 13회차 이관 (2026-08-31) — 462 의 두 겹도 세로 인셋이 **7/14 → 5/12** 로 내려갔다
         (가운데 칸의 `::before` 와 같은 값이어야 `verify462` [3] 의 «가운데 칸과 ±1.0» 이 산다). */
      const B462 = ', rgb(65, 49, 34) 0px -5px 0px 7px inset, rgb(99, 79, 55) 0px -12px 0px 7px inset';
      const isEnd = !!o.onPos && (o.onPos.L || o.onPos.R);
      ok(n + ' — 검정은 밴드가 아니라 `::after` 등폭 링이고 **첫 항**이다 (409)',
        !!r && (r.sh || '').startsWith(RING), r ? r.sh : '없음');
      ok(n + ' 자리 «' + posName(o.onPos) + '» → 링 뒤의 462 띠 두 겹 (가운데는 없다 · 끝 칸만 있다)',
        !!r && r.sh === RING + (isEnd ? B462 : ''), r ? r.sh : '없음');
      ok(n + ' 자리 «' + posName(o.onPos) + '» → 링 코너 기둥이 그 자리 규칙과 같다 (닿는 면은 뺀다)',
        !!r && !!o.onPos && maskHasL(r.mask) === !o.onPos.L && maskHasR(r.mask) === !o.onPos.R,
        r ? ('좌기둥 ' + maskHasL(r.mask) + ' · 우기둥 ' + maskHasR(r.mask)) : '없음');
      /* 409 4회차 이관 — 자리 규칙의 **셋째 반쪽**: 가로 띠(`::before`)도 같은 기둥 마스크를 쓴다.
         ⓐ 상자가 «검정의 안쪽 윤곽»(사방 7 인셋 · r23)인가 — 좌·우만 인셋한 옛 상자로 되돌아가면
            코너 중심이 가로로 7 어긋나 띠가 호에서 얇아진다(3인 독립 지적의 뿌리).
         ⓑ 세 띠 자체는 네 호스트 Δ0 ⓒ 기둥이 자리 규칙과 같다. */
      const b = o.onBand;
      /* 409 4회차 — 상자는 **자리에 따라 둘**이다: 가운데 칸은 «검정의 안쪽 윤곽»(사방 7 인셋 · r23),
         셸에 닿는 끝 칸은 그 면에 검정이 없어(378) 세로 인셋 0 · r30 짜리 옛 상자다.
         둘을 잇는 불변식은 «가로 인셋 + 반경 = 알약 반경 30» — 코너 중심의 x 가 알약과 같다는 뜻이다
         (`verify384` 가 같은 불변식을 문다).
         ⚑ **449 이관 (2026-08-30) — 끝 칸의 가로 인셋은 이제 «면마다» 다르다.**
            4회차의 이 항은 끝 칸을 «좌·우 둘 다 7» 로 못박아 두었는데, 그 문장은 449 가 닫히는
            순간 «아직 안 고쳐졌는가» 를 지키는 항이 된다. 449 가 밝힌 것은 **닿는 면에는 검정이
            없으니 세 띠가 시작할 자리가 «검정 안쪽» 이 아니라 알약 윤곽 그 자체**라는 것이고,
            그래서 그 면만 인셋 0 이다(= 코너 중심 x 30 = 동심). 반대 면은 검정이 있으니 7 그대로다.
         ⇒ 값을 넓히지 않고 **면마다** 묻는다 — 닿는 면 0 / 안 닿는 면 7, 그리고 코너 중심 x 는
            닿는 면 30(동심) · 안 닿는 면 37(옛 평행이동). 넷 중 하나라도 어긋나면 빨개진다. */
      const endCell = !!o.onPos && (o.onPos.L || o.onPos.R);
      const wantL = endCell && o.onPos.L ? '0px' : '7px';
      const wantR = endCell && o.onPos.R ? '0px' : '7px';
      /* ⚑ **409 8회차 이관 (2026-08-31)** — 가운데 칸의 세로는 이제 «7px / r23» 이 아니라
         «2px / 아래 세로 반경 28» 이다. **자리가 바뀐 게 아니라 호의 모양이 바뀌었다** —
         코너 중심의 y 는 2 + 28 = **30** 으로 4회차의 7 + 23 = 30 과 같은 값이고, 아래 두 코너만
         세로로 늘어난 타원이 됐다(ref 실측 — `tools/probe409e.py --rays`). 그래서 값을 넓히는 대신
         **가로와 같은 불변식**(인셋 + 반경 = 30)을 세로에도 세우고, 그 위에서 «가운데 칸은 아래
         두 코너가 타원(세로 반경 > 가로 반경)» 을 따로 못박는다 — 끝 칸(r30 · 449)과 안 헷갈린다. */
      /* 409 12회차 이관 (2026-08-31) — 위·아래 세로 반경이 갈렸다(위 26 · 아래 28.5 — 12회차가
         아래 호만 어깨 원판에 맞췄다). 한 값으로 위·아래를 같이 묻던 자를 **코너별**로 옮긴다:
         불변식(인셋 + 그 코너 세로 반경 = 30)은 그대로이고, 이제 한쪽만 어긋나도 빨개진다. */
      const vrs = b ? (b.r.split('/')[1] || b.r).trim().split(/\s+/) : [];
      const vrb = vrs.length ? parseFloat(vrs[vrs.length - 1]) : NaN;   /* 아래 */
      const vrt = vrs.length ? parseFloat(vrs[0]) : NaN;                /* 위 */
      ok(n + ' 자리 «' + posName(o.onPos) + '» → 가로 띠 상자가 그 자리의 규격이다'
        + (endCell ? ' (끝 칸 = 닿는 면 0 · r30 · 449)' : ' (가운데 = 동심 윤곽 가로 7인셋·rx23 · 네 코너 타원 · 인셋+반경 = 30)'),
        !!b && b.left === wantL && b.right === wantR
          && (endCell ? (b.top === '0px' && b.bottom === '0px' && /^30px/.test(b.r))
                      : (/^23px/.test(b.r) && vrb > 23.5 && vrt > 23.5 && Math.abs(parseFloat(b.top) + vrt - 30) < 0.6)),
        b ? [b.left, b.right, b.top, b.bottom, b.r].join(' / ') : '없음');
      ok(n + ' 자리 «' + posName(o.onPos) + '» → «세로 인셋 + 세로 반경 = 30» (위·아래 코너 중심 y 가 알약과 같다)',
        !!b && Math.abs(parseFloat(b.bottom) + vrb - 30) < 0.6
          && (endCell || Math.abs(parseFloat(b.top) + vrt - 30) < 0.6),
        b ? ('아래 ' + b.bottom + '+' + (isNaN(vrb) ? '?' : vrb) + '=' + (parseFloat(b.bottom) + vrb)
             + ' · 위 ' + b.top + '+' + (isNaN(vrt) ? '?' : vrt) + '=' + (parseFloat(b.top) + vrt)) : '없음');
      /* 두 상자를 가르는 것은 **코너 중심의 x** 다. 값을 그냥 적지 않고 **자리에서 유도**해 묻는다.
         · 가운데 칸은 사방 7 인셋 · r23 이라 코너 중심 x 가 알약과 같다(7+23 = **30** = 동심).
         · 449 — 끝 칸은 **면마다 다르다**: 닿는 면은 검정이 없어 세 띠가 알약 윤곽에서 시작하므로
           인셋 0 → 중심 **30**(동심), 반대 면은 검정이 있어 인셋 7 → 중심 **37**(옛 평행이동).
           끝 칸의 상자는 r30 이라 테이퍼가 안 걸린다(위 endCell 분기가 그것을 못박는다). */
      const cxL = b ? parseFloat(b.left) + parseFloat(b.r) : NaN;
      const cxR = b ? parseFloat(b.right) + parseFloat(b.r) : NaN;
      const wantCxL = endCell ? (o.onPos.L ? 30 : 37) : 30;
      const wantCxR = endCell ? (o.onPos.R ? 30 : 37) : 30;
      ok(n + ' — 코너 중심 x: 좌 ' + wantCxL + ' · 우 ' + wantCxR
        + (endCell ? ' (닿는 면 30 = 동심 · 반대 면 37 = 옛 평행이동)' : ' (알약과 동심)'),
        !!b && Math.abs(cxL - wantCxL) < 0.6 && Math.abs(cxR - wantCxR) < 0.6,
        b ? ('좌 ' + b.left + '+' + b.r + '=' + cxL + ' · 우 ' + b.right + '+' + b.r + '=' + cxR) : '없음');
      /* ⚑ **409 13회차 이관 (2026-08-31) — 이 항도 «자리» 를 탄다(378·449 와 같은 이유).**
         13회차가 가운데 칸의 세 띠를 7/14 → **5/12** 로 내린 것은 «링의 검정이 띠의 바깥쪽을
         덮는다» 는 전제 위에 있다. 끝 칸의 **닿는 면**에는 그 검정이 없으므로(378) 같은 값을 쓰면
         띠가 그대로 2px 얇아진다(`verify449` [3] 45° 5.5 → 2.5). ⇒ 끝 칸은 7/14 를 그대로 쓴다.
         ⚠ **«영웅과 Δ0» 을 지우지 않았다** — 자리별 기대값을 적어 **둘 다** 문는다:
            가운데는 영웅과 한 글자도 달라선 안 되고, 끝 칸은 «7/14 세 겹» 이어야 한다. */
      const bandEndSh = 'rgb(65, 49, 34) 0px -7px 0px 0px inset, rgb(99, 79, 55) 0px -14px 0px 0px inset, '
        + 'rgb(99, 79, 55) 0px 7px 0px 0px inset';
      ok(n + ' — 세 띠(그림자 3겹) ' + (endCell ? '= 끝 칸 규격(7/14 — 이 면엔 검정이 없다 · 409 13회차)' : '는 영웅과 Δ0'),
        !!b && (endCell ? b.sh === bandEndSh : b.sh === hero.onBand.sh), b ? b.sh.slice(0, 70) : '없음');
      /* ⚠ 이 층의 마스크는 «자리» 손잡이(`--pill-mask`)를 **안 쓴다** — 한 번 그렇게 썼다가
         `verify384` 가 17건으로 빨개졌다(닿는 면에도 바닥 띠 감김은 있어야 한다). 가운데 칸은
         **양쪽 기둥을 늘 켠 고정 마스크**, 끝 칸은 옛 상자라 마스크가 아예 없다. */
      /* 463 이관 — 기둥 폭을 **이 층의 인셋에서 유도**한다(`인셋 + 기둥 = 30`).
         이 상자는 좌·우 7 인셋이라 23 이 맞다. 30 을 도로 적으면 코너가 끝난 뒤
         직선부 7px 까지 이 층이 살아 남아 위 베벨이 두 겹이 된다(`probe463` [C]). */
      const colB = b ? COL - parseFloat(b.left) : NaN;
      const colBr = b ? COL - parseFloat(b.right) : NaN;
      /* ⚑ **409 8회차 이관 (2026-08-31)** — 끝 칸의 이 층에도 마스크가 생겼다: **닿는 면 기둥 하나만**.
         8회차 전에는 마스크가 없어 이 층이 끝 칸의 **반대** 코너에도 띠를 그렸고, 같은 자리를
         462 의 두 겹(`::after` 스프레드)이 다시 그려 **한 코너를 두 층이 겹쳐 칠하고 있었다**.
         링이 타원이 되면서 그 겹침이 1.5px 짜리 면색 이음매로 드러났다(`verify462` [3] D→B 순서).
         ⇒ 반대 코너는 462 한 층에게 넘기고, 이 층은 449 가 맡은 **닿는 면**만 그린다.
         ⚠ 값을 넓힌 게 아니라 **자리에서 유도한 규칙이 하나 늘었다** — 「없음」 이던 칸이
            「닿는 면 기둥만 · 반대 면 기둥 없음」 이 됐고, 어느 쪽이 어긋나도 빨개진다
            (반대 코너를 다시 그리기 시작하면 `verify462` R1 이 같이 빨개진다). */
      const endMaskOK = endCell && b && (o.onPos.L
        ? (maskHasLn(b.mask, COL) && !maskHasRn(b.mask, COL))
        : (maskHasRn(b.mask, COL) && !maskHasLn(b.mask, COL)));
      ok(n + ' 자리 «' + posName(o.onPos) + '» → 가로 띠 마스크가 그 자리의 규격이다'
        + (endCell ? ' (끝 칸 = 닿는 면 기둥 30 하나만 · 409 8회차)'
                   : ' (기둥 = 30 − 인셋 = ' + colB + '/' + colBr + ' · 463)'),
        !!b && (endCell ? endMaskOK
                        : (maskHasLn(b.mask, colB) && maskHasRn(b.mask, colBr))),
        b ? (b.mask && b.mask !== 'none'
          ? ('좌기둥 ' + maskHasLn(b.mask, colB) + ' · 우기둥 ' + maskHasRn(b.mask, colBr)
             + ' · ' + b.mask.slice(0, 64))
          : 'none') : '없음');
    });
    ok('두 갈래가 표본에 다 있다 (끝 ' + posEnd + ' · 가운데 ' + posMid + ')', posEnd >= 1 && posMid >= 1,
      '끝 ' + posEnd + ' / 가운데 ' + posMid);
    /* 활성이 «비활성과 구별» 되기는 해야 한다 — 전부 같아 버리면 위 비교는 무의미하다 */
    ok('활성 ≠ 비활성 (구별은 남아 있다)', diff(hero.on, hero.off).length > 0,
      diff(hero.on, hero.off).length + '개 속성 차이');

    /* ---------- ①-b 라벨 외곽선 — 219 이사분 ----------
       원래 단언은 «네 자리의 `textShadow` 문자열 Δ0» 하나였고, 126 ③ 이 10 상점에만 ref 실측
       덧칠을 얹으면서 등식을 잃었다. 지우지 않고 **살아 있는 규칙 세 벌**로 쪼갠다(LESSONS 214-④):
         ⓐ ref 실측이 없는 세 자리(영웅·06·03)는 여전히 **문자열까지 같다**
         ⓑ 그 세 자리는 «공용 등방 링 8항뿐 · 덧칠 0» 이다 — 근거 없는 덧칠이 번지면 여기서 잡힌다
         ⓒ 10 상점의 갈림은 «링 8항 + 덧칠 2항» 이라는 **정해진 모양** 안에 있고,
            보이는 드롭 = (링+drop) − 링 = drop 이라는 126 의 불변식을 만족한다 */
    console.log('\n[1-b] 라벨 외곽선 — 공용 3자리는 Δ0 · 10 상점 덧칠은 126 ref 실측 모양 안');
    const SHARED = [['영웅', hero], ['06 장비', eq], ['03 던전', dun]];
    [['비활성', 'offS', 'off'], ['활성', 'onS', 'on']].forEach(([st, k, rk]) => {
      /* ⓐ 세 자리 문자열 Δ0 */
      SHARED.slice(1).forEach(([n, o]) => {
        ok(st + ' 외곽선 — 영웅 vs ' + n + ' Δ0', hero[k].textShadow === o[k].textShadow,
          hero[k].textShadow === o[k].textShadow ? '문자열 동일' : o[k].textShadow);
      });
      /* ⓑ 공용 3자리 = 등방 링 8항뿐 (덧칠 0) */
      const bad = SHARED.filter(([, o]) => {
        const t = parseSh(o[k].textShadow);
        return t.length !== 8 || !ringOk(t, RING[rk].r, RING[rk].d);
      }).map(([n]) => n);
      ok(st + ' 외곽선 — 공용 3자리는 등방 링 ' + RING[rk].r + '/' + RING[rk].d + ' 8항뿐(덧칠 0)',
        bad.length === 0, bad.length ? '어긋남: ' + bad.join('·') : '영웅·06·03 3자리');
      /* ⓒ 10 상점 — 링 8항 + 덧칠 2항 */
      const sh = parseSh(shop[k].textShadow), fs = parseFloat(shop[k].fontSize);
      ok(st + ' 외곽선 — 10 상점 = 링 8항 + 덧칠 2항', sh.length === 10, sh.length + '항');
      ok(st + ' 외곽선 — 10 상점 링 = 126 ref 실측 ' + SHOP[rk].r + '/' + SHOP[rk].d,
        ringOk(sh, SHOP[rk].r, SHOP[rk].d),
        sh.slice(0, 8).map(v => v.x + '/' + v.y).join(' '));
      /* 보이는 드롭 = (링 + drop·em) − 링 = drop·em — 링을 얼마로 바꾸든 성립해야 하는 126 의 불변식 */
      const dy = sh[8], dx = sh[9];
      const ey = dy && dy.x === 0 ? (dy.y - SHOP[rk].r) / fs : NaN;
      const ex = dx && dx.y === 0 ? (dx.x - SHOP[rk].r) / fs : NaN;
      ok(st + ' 외곽선 — 10 상점 보이는 드롭 세로 = --sh-drop ' + DROP + 'em',
        Math.abs(ey - DROP) <= EPS, 'fs ' + fs + ' · ' + (dy ? dy.y : '없음') + 'px → ' + (isNaN(ey) ? '측정 불가' : ey.toFixed(4) + 'em'));
      ok(st + ' 외곽선 — 10 상점 보이는 드롭 가로 = --sh-dropx ' + DROPX + 'em',
        Math.abs(ex - DROPX) <= EPS, 'fs ' + fs + ' · ' + (dx ? dx.x : '없음') + 'px → ' + (isNaN(ex) ? '측정 불가' : ex.toFixed(4) + 'em'));
    });

    /* ---------- ② 스킬↔장비 전환 8프레임 — #eqw bbox 이동 0 ---------- */
    console.log('\n[2] 영웅 스킬↔장비 전환 — #eqw 가 아래에서 다시 올라오지 않는다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('eq'); });
    await page.waitForTimeout(700);
    const base = await page.evaluate(() => document.getElementById('eqw').getBoundingClientRect().top);
    /* 스킬로 갔다가 장비로 되돌아오는 «그 순간» 8프레임을 연속으로 읽는다 */
    const frames = await page.evaluate(() => new Promise(res => {
      heroSubGo('sk');
      setTimeout(() => {
        const out = [], eqw = document.getElementById('eqw'), pan = document.getElementById('panel');
        heroSubGo('eq');
        let n = 0;
        const tick = () => {
          const r = eqw.getBoundingClientRect();
          out.push({ top: Math.round(r.top * 10) / 10, h: Math.round(r.height),
            /* `jz-wrap`/`jz-dm`/`jz-sl` 은 한 번 붙으면 안 떼는 **표식**이라 연출 여부와 무관하다.
               개폐 연출 클래스는 `jz-o`/`jz-c` 와 종류(`jz-sh2`/`jz-dlg`/`jz-pg`) 뿐이다. */
            cls: [...eqw.classList].filter(c => /^jz-(o|c|sh2|dlg|pg)$/.test(c)).join(' '),
            pcls: [...pan.classList].filter(c => /^jz-(o|c|sh2|dlg|pg)$/.test(c)).join(' '),
            anims: document.getAnimations().filter(a => /^jzSheet/.test(a.animationName || '')).length });
          if (++n < 8) requestAnimationFrame(tick); else res(out);
        };
        requestAnimationFrame(tick);
      }, 700);
    }));
    const tops = [...new Set(frames.map(f => f.top))];
    ok('8프레임 #eqw top 이동 0', tops.length === 1, 'top ' + tops.join(' / '));
    ok('8프레임 #eqw top = 전환 전과 동일', Math.abs(frames[0].top - base) < 0.5,
      frames[0].top + ' vs ' + base);
    ok('시트 슬라이드 애니메이션(jzSheet*) 0개', frames.every(f => f.anims === 0),
      JSON.stringify(frames.map(f => f.anims)));
    ok('#eqw 에 개폐 연출 클래스 없음', frames.every(f => !f.cls), frames.map(f => f.cls).join('|') || '없음');
    ok('#panel 에 개폐 연출 클래스 없음', frames.every(f => !f.pcls), frames.map(f => f.pcls).join('|') || '없음');

    /* ---------- ④ 전환 실동작 ---------- */
    console.log('\n[4] 전환 실동작 (본문 교체 · 상태)');
    const act = await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const out = {};
      /* 영웅 4탭 — 누른 탭의 본문이 실제로 켜지는가 */
      goTab('hero', true); heroSubGo('sk'); await sleep(400);
      out.sk = document.getElementById('bSk').classList.contains('on');
      document.querySelector('#bSk [data-sktab="pet"]').click(); await sleep(400);
      out.pet = document.getElementById('bPet').classList.contains('on') && heroTab === 'pet';
      document.querySelector('#bPet [data-pttab="cos"]').click(); await sleep(400);
      out.cos = document.getElementById('bCos').classList.contains('on') && heroTab === 'cos';
      document.querySelector('#bCos [data-costab="eq"]').click(); await sleep(500);
      out.eq = document.getElementById('eqw').classList.contains('on') && heroTab === 'eq';
      document.querySelector('#eqTabs [data-eqtab="sk"]').click(); await sleep(500);
      out.back = document.getElementById('bSk').classList.contains('on')
        && !document.getElementById('eqw').classList.contains('on');
      /* 03 던전 2탭 */
      openDungeon(); await sleep(400);
      document.querySelector('#dunSub [data-dsub="raid"]').click(); await sleep(300);
      out.raid = document.querySelector('#dunSub [data-dsub="raid"]').classList.contains('on');
      out.raidInk = document.querySelector('#dunSub [data-dsub="raid"]>i').classList.contains('ol4')
        && document.querySelector('#dunSub [data-dsub="dun"]>i').classList.contains('ol3');
      document.querySelector('#dunSub [data-dsub="dun"]').click(); await sleep(300);
      out.dun = document.querySelector('#dunSub [data-dsub="dun"]').classList.contains('on');
      /* 10 상점 2탭 */
      openShopPage(); await sleep(500);
      document.querySelector('#shopCats [data-cat="coin"]').click(); await sleep(400);
      out.coin = shopCat === 'coin' && document.getElementById('shopList').classList.contains('coin');
      out.coinInk = document.querySelector('#shopCats [data-cat="coin"]>i').classList.contains('ol4')
        && document.querySelector('#shopCats [data-cat="summon"]>i').classList.contains('ol3');
      document.querySelector('#shopCats [data-cat="summon"]').click(); await sleep(400);
      out.summon = shopCat === 'summon' && !document.getElementById('shopList').classList.contains('coin');
      return out;
    });
    ok('영웅 → 스킬 본문', act.sk === true, String(act.sk));
    ok('영웅 → 동료 본문', act.pet === true, String(act.pet));
    ok('영웅 → 코스튬 본문', act.cos === true, String(act.cos));
    ok('영웅 → 장비 오버레이', act.eq === true, String(act.eq));
    ok('장비 → 스킬 복귀 (#eqw 내려감)', act.back === true, String(act.back));
    ok('던전 → 레이드 탭 활성', act.raid === true, String(act.raid));
    ok('던전 탭 라벨 외곽선이 활성 ol4 / 비활성 ol3', act.raidInk === true, String(act.raidInk));
    ok('던전 → 던전 탭 복귀', act.dun === true, String(act.dun));
    ok('상점 → 재화 탭', act.coin === true, String(act.coin));
    ok('상점 탭 라벨 외곽선이 활성 ol4 / 비활성 ol3', act.coinInk === true, String(act.coinInk));
    ok('상점 → 소환 탭 복귀', act.summon === true, String(act.summon));

    /* ---------- ⑥ 03 바의 축·리스트 이음매 ---------- */
    /* 335 (2026-08-28) — **이 두 줄은 «레퍼런스와 반대» 를 지키고 있었다.**
       96 2회차 비평가가 «다른 바는 전부 대칭» · «상점과 같은 14px 여백» 을 요구해 그대로 박혔는데,
       둘 다 레퍼런스 대조가 아니라 다른 화면과의 통일감 논거였다. 그 뒤 72 의 15~17회차 비평가 넷이
       전원 반대로 지적했고(축 −8.5px 좌 · 이음매 0→14px) 픽셀도 레퍼런스 쪽이다:
         `python3 tools/scan335x.py` — ref 바 면 x160~937(중심 548.5) = 화면중심 +8 비대칭
         `python3 tools/scan335.py`  — ref x=200 열에 카드 검정 하변과 바 검정 상변이 겹쳐 바탕 0px
       자를 **레퍼런스 실측 자리로 옮긴다**(333·334 의 게이트 이관과 같은 처방 — 자리를 비우지 않는다).
       상세: `docs/review/335-던전서브탭블록.md`. */
    console.log('\n[6] 03 바 축(ref 비대칭 +8) · 리스트 이음매 0px — 335');
    /* 353 — 이 블록은 대기를 **페이지 안에서** 하므로 291 정착 훅(`page.waitForTimeout` 을 감싼다)이
       한 번도 안 지난다(`probe353` ①: 정착 0회). 그래서 부하가 걸리면 700ms 가 `jzPgIn`(.12s)
       한복판에 떨어져 좌/우가 «157/141»(0% 프레임 scale .985 · 폭 794 → 782.09) 로 읽혔다 — 8회 중 1회.
       ⚠ 허용 오차를 넓히지 않는다(그러면 축이 8px 밀려도 초록이다 — 335 가 되돌린 자리).
       291 의 같은 본체를 페이지 안에서 부른다(`settle291()`) — 연출이 끝난 프레임에서만 잰다. */
    const sym = await page.evaluate(() => new Promise(res => {
      goTab('hero'); openDungeon();
      setTimeout(() => Promise.resolve(window.settle291 ? window.settle291() : 0).then(() => {
        const F = document.getElementById('app').getBoundingClientRect();
        const b = document.getElementById('dunSub').getBoundingClientRect();
        const li = document.querySelector('#dunw .dns-list').getBoundingClientRect();
        const c5 = document.querySelectorAll('#dunList .dnc')[4];
        const c5b = c5 ? c5.getBoundingClientRect().bottom : li.bottom;
        res({ l: Math.round(b.x - F.x), r: Math.round(F.right - b.right),
              gap: Math.round(b.y - li.bottom), cardGap: Math.round(b.y - c5b),
              listB: Math.round(li.bottom - F.y), card5B: Math.round(c5b - F.y) });
      }), 700);
    }));
    ok('03 던전 바 좌 151 (ref 측정표 §4-1, Δ≤1px)', Math.abs(sym.l - 151) <= 1, '좌 ' + sym.l);
    ok('03 던전 바 우 135 (ref 1080−944, Δ≤1px)', Math.abs(sym.r - 135) <= 1, '우 ' + sym.r);
    ok('03 던전 바 축이 화면중심 +8 (ref 비대칭, Δ≤1px)',
      Math.abs((sym.l - sym.r) / 2 - 8) <= 1, '축 ' + ((sym.l - sym.r) / 2).toFixed(1));
    /* 335 2회차 — 이음매는 «0px» 이 아니라 **구조적 24px 몫**이다(ref −8 + 24 = 16 안팎).
       거리를 좁히는 것이 아니라 **클립선이 카드 경계에 있어서 유령 가로줄이 안 생기는 것**을 지킨다. */
    ok('03 리스트 하단선 ~ 바 상단 간격 = 구조적 몫 (12~18px)',
      sym.gap >= 12 && sym.gap <= 18, sym.gap + 'px');
    ok('03 리스트 클립선이 카드 경계에서 끊긴다 (유령 가로줄 방지)',
      Math.abs(sym.gap - sym.cardGap) <= 1,
      '클립선 ' + sym.listB + ' / 카드5 하변 ' + sym.card5B);

    /* ---------- ⑤ 60 쥬시 — 탭 전환 시 활성 칸 1.06 팝 ---------- */
    console.log('\n[7] 60 쥬시 — 탭 전환 팝(.jz-sb)');
    const pop = await page.evaluate(() => new Promise(res => {
      openShopPage();
      setTimeout(() => {
        document.querySelector('#shopCats [data-cat="coin"]').click();
        /* 팝은 rAF 한 틱 뒤에 붙는다 — 두 틱 기다렸다가 «지금 도는 애니메이션» 을 읽는다 */
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
          const on = document.querySelector('#shopCats .stab.on');
          const as = on.getAnimations().filter(a => (a.animationName || '') === 'jzSb');
          const peak = [];
          if (as[0]) { const kf = as[0].effect.getKeyframes(); kf.forEach(k => peak.push(k.scale)); }
          res({ cls: on.classList.contains('jz-sb'), n: as.length, peak,
            /* transform(scaleX 라벨 보정)이 살아 있는지 — 독립 변형 속성이라 덮이면 안 된다 */
            ink: getComputedStyle(on.querySelector('i')).transform });
        }, 30)));
      }, 600);
    }));
    ok('활성 칸에 .jz-sb 가 붙는다', pop.cls === true, String(pop.cls));
    ok('jzSb 애니메이션 1개', pop.n === 1, pop.n + '개');
    ok('팝 최대 1.06 (scale: 로 — transform 아님)', pop.peak.includes('1.06'), JSON.stringify(pop.peak));
    ok('라벨 폭 보정 transform 이 살아 있다', /matrix/.test(pop.ink) && pop.ink !== 'none', pop.ink);

    console.log('\n[8] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '0건');
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY96 ' + (fail ? 'FAIL — ' : 'PASS — ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
