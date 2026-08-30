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
    const shadowRule = p => !p ? null : [
      (p.L ? BEV + ' 7px' : BEV + ' 14px') + ' 0px 0px 0px inset',
      (p.R ? BEV + ' -7px' : BEV + ' -14px') + ' 0px 0px 0px inset',
    ].join(', ');
    /* 409 이관 — 자리 규칙의 **나머지 반쪽**. 링은 코너 기둥(좌·우 30px = 반경)에만 남고,
       셸에 닿는 면은 그 기둥이 통째로 빠진다. 문자열을 박지 않고 «기둥이 있나» 로 묻는다. */
    const maskHasL = m => /^linear-gradient\(90deg, rgb\(0, 0, 0\) 0px, rgb\(0, 0, 0\) 30px/.test(m);
    const maskHasR = m => /rgb\(0, 0, 0\) calc\(100% - 30px\)\)$/.test(m);
    const posName = p => !p ? '?' : (p.L ? '좌' : '') + (p.R ? '우' : '') || '가운데';
    /* 409 3회차 이관 (2026-08-30) — **자리 규칙에 손잡이가 둘 늘었다.** 아래 두 코너의 베벨 동심 고리는
       부모 `background` 에 깔리고(`::after` 에 얹으면 384 의 바닥 띠 감김을 덮는다), 셸에 닿는 면에서는
       `--pill-bl`/`--pill-br` 가 `none` 이 된다 — `--pill-l`/`--pill-r`·`--pill-mask` 와 **같은 자리에서**.
       ⇒ 그래서 `backgroundImage` 도 boxShadow 처럼 «자리가 다르면 cmp 에서 빼고 [1-c] 가 되받는다».
       ⚠ 무르게 뺀 게 아니다 — 아래 [1-c] 가 ⓐ 층이 셋인지 ⓑ 고리 둘이 자리 규칙과 같은지
          ⓒ **세 띠 그라데이션(층 3)은 네 호스트 전부 Δ0 인지** 를 각각 묻는다. */
    const bgLayers = b => {
      const out = []; let d = 0, cur = '';
      for (const ch of (b || '')) {
        if (ch === '(') d++;
        if (ch === ')') d--;
        if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
      }
      if (cur.trim()) out.push(cur.trim());
      return out;
    };
    const cmp = (label, key, props) => {
      [['06 장비', eq], ['03 던전', dun], ['10 상점', shop]].forEach(([n, o]) => {
        /* 활성 칸끼리 비교할 때, **자리가 다르면** boxShadow 만 빼고 나머지 11개를 그대로 묻는다.
           뺀 한 개는 아래 [1-c] 가 자리별 규칙으로 각 호스트에서 따로 문다 — 무르게 푼 게 아니다. */
        const posDiff = key === 'on' && hero.onPos && o.onPos
          && (hero.onPos.L !== o.onPos.L || hero.onPos.R !== o.onPos.R);
        const d = diff(hero[key], o[key], posDiff ? ['boxShadow', 'backgroundImage'] : []);
        ok(label + ' — 영웅 vs ' + n + ' Δ0' + (posDiff ? ' (자리 ' + posName(hero.onPos) + ' vs ' + posName(o.onPos) + ' — 밴드·코너 고리는 [1-c])' : ''),
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
      /* 409 이관 — 같은 자리 규칙을 **링 쪽에서도** 묻는다. */
      const r = o.onRing;
      ok(n + ' — 검정은 밴드가 아니라 `::after` 등폭 링이다 (부품은 하나)',
        !!r && r.sh === BLK + ' 0px 0px 0px 7px inset', r ? r.sh : '없음');
      ok(n + ' 자리 «' + posName(o.onPos) + '» → 링 코너 기둥이 그 자리 규칙과 같다 (닿는 면은 뺀다)',
        !!r && !!o.onPos && maskHasL(r.mask) === !o.onPos.L && maskHasR(r.mask) === !o.onPos.R,
        r ? ('좌기둥 ' + maskHasL(r.mask) + ' · 우기둥 ' + maskHasR(r.mask)) : '없음');
      /* 409 3회차 이관 — 자리 규칙의 **셋째 반쪽**: 아래 코너 베벨 고리 둘. */
      const bg = bgLayers(o.on.backgroundImage);
      ok(n + ' — 부모 배경이 «아래 코너 고리 둘 + 세 띠» 세 층이다',
        bg.length === 3 && /^linear-gradient\(/.test(bg[2]), bg.length + '층');
      ok(n + ' 자리 «' + posName(o.onPos) + '» → 아래 코너 고리가 그 자리 규칙과 같다 (닿는 면은 뺀다)',
        bg.length === 3 && !!o.onPos
          && (bg[0] !== 'none') === !o.onPos.L && (bg[1] !== 'none') === !o.onPos.R,
        bg.length === 3 ? ('좌고리 ' + (bg[0] !== 'none') + ' · 우고리 ' + (bg[1] !== 'none')) : '층 수 이상');
      ok(n + ' — 세 띠 그라데이션(층 3)은 영웅과 Δ0 (자리와 무관한 부분은 여전히 같다)',
        bg.length === 3 && bg[2] === bgLayers(hero.on.backgroundImage)[2], bg[2] ? bg[2].slice(0, 60) : '없음');
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
