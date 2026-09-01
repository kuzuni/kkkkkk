#!/usr/bin/env node
/* 작업 356 26회차 — «가짜 자식» 축: 의사 요소(`::before`/`::after`)가 그리는 아이콘
 *   (재현·측정 전용 · 판정은 verify356.js [J])
 *
 *   node tools/probe356r26.js              # 전 화면 인구조사 — 의사 아이콘과 그 누적 종횡
 *   node tools/probe356r26.js --all        # 음성항(«아이콘이 아니라서 안 세는» 의사 요소)까지
 *   node tools/probe356r26.js --revert     # 되돌림 — 의사 아이콘을 눌러 이 자와 [A] 를 나란히 물어본다
 *   node tools/probe356r26.js --only <n>   # 화면 수를 n 개로 줄여 빨리 돈다(개발용)
 *
 * ── 왜 이 축인가 (25회차 → 26회차) ─────────────────────────────────────────
 * 스물다섯 회차의 축을 늘어놓으면 이렇다:
 *
 *   | 11·12·15 | 화면   | **어디를** 보는가            |
 *   | 16~20    | 상태   | 어느 상태에서                |
 *   | 21·22    | 문·사건 | 그 화면에 **닿는가**         |
 *   | 23       | 출처   | **무엇이** 그리는가          |
 *   | 24       | 구성물 | 그 출처를 **누가 세는가**    |
 *   | 25       | 시간   | **언제** 보는가              |
 *
 * 여섯 갈래가 전부 **«DOM 노드 하나를 어떻게 볼까»** 다. 그리고 여섯 갈래 전부가
 * 같은 한 줄 위에 서 있다 — `scan356.COLLECT` 의
 *
 *     const all = app.querySelectorAll('*');
 *
 * `querySelectorAll` 은 **의사 요소를 안 돌려준다.** 의사 요소는 DOM 노드가 아니다.
 * 그래서 `::before`/`::after` 가 그리는 아이콘은 스물다섯 회차 동안
 * «비균등 0» 의 **0 안에 한 번도 안 들어 있었다** — 못 봐서 0 이었다.
 * 11·12·15(화면이 목록에 없어서) · 21·22(문이 없어서) · 616(축이 없어서) 에 이은 **네 번째 같은 모양**이다.
 *
 * ⚑ 이것이 «있을 법한 구멍» 이 아니라 **실재하는 구멍**인 근거는 소스에 있다:
 *   `index.html:1060`  `.ibtn.lock::after{content:'🔒'; … font-size:calc(var(--ih,82px)*.66)}`
 *   A2 좌측 사이드의 **잠금 자물쇠**는 순전히 의사 요소로 그려진다. 그 형제 아이콘 `span.si` 는
 *   [A] SCOPE 의 첫 줄부터 감시 중인데, 그 위에 얹히는 🔒 는 **감시 밖**이다.
 *
 * ── 무엇을 세는가 ──────────────────────────────────────────────────────────
 * `#app` 안의 모든 노드에 대해 `getComputedStyle(el, '::before'|'::after')` 를 읽고,
 * `scan356.iconKind` 와 **같은 규율**로 아이콘만 고른다(자를 두 벌로 안 적는다 — 13회차 [R12]):
 *   · `pic`  — `content` 가 그림문자«만» 이다(글자가 한 자라도 섞이면 라벨이라 안 센다)
 *   · `img`  — `content: url(...)` (의사 요소가 이미지를 직접 그린다)
 *   · `bg`   — `content` 는 비었는데 `background-image` 가 `url(...)` 이다
 * 종횡비는 [A] 와 같은 뜻으로 잰다 — **호스트의 조상 누적 × 의사 요소 자신의 변환**.
 *
 * ⚠ 음성항이 이 자의 절반이다. 아래는 **있어도 결함이 아니라서 안 센다**:
 *   · `content:''` + 그라디언트·단색 배경 = 장식 상자다(원본 종횡이 없다 = 찌그러질 것이 없다).
 *     `index.html` 의 의사 요소 126개가 거의 전부 이것이다(테두리·립·구분선·불릿).
 *   · 그림문자에 글자가 섞인 `content` = 라벨(3회차 `u.pr` 선례 — 라벨의 scaleX 는 지시 대상이 아니다).
 *   · 등방 배율(`scale(1.2)`) = 크기 변경은 결함이 아니다(23회차 [G-d] 규율).
 *
 * ⚠ **소스 리터럴로 판정하지 않는다**(25회차가 스스로 기각한 1판의 교훈).
 *   `content` 도 `background-image` 도 화면에서 계산된 값을 읽는다 — `var()` 폴백은 화면의 값이 아니다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS, COLLECT, URL, TOL, STEP } = require('./scan356.js');

const ARG = process.argv.slice(2);
const ALL = ARG.includes('--all');
const REVERT = ARG.includes('--revert');
const ONLY = (() => {
  const i = ARG.indexOf('--only');
  return i >= 0 ? Math.max(1, parseInt(ARG[i + 1], 10) || 1) : 0;
})();

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

/* ── 페이지 안에서 도는 수집기 ──────────────────────────────────────────────
   COLLECT(실 노드)와 **같은 뜻**의 자를 의사 요소에 댄다. 공유할 수 있는 것은 공유하고
   (그림문자 판정·조상 누적), 공유할 수 없는 것만 새로 적는다(의사 요소는 rect 가 없다). */
const COLLECT_PSEUDO = function (opt) {
  const PIC = /\p{Extended_Pictographic}/u;
  const app = document.getElementById('app');
  if (!app) return [];

  function selfScale(cs) {
    let sx = 1, sy = 1, txt = '';
    const t = cs.transform;
    if (t && t !== 'none') {
      txt = t;
      const m = t.match(/^matrix\(([^)]+)\)/);
      const m3 = t.match(/^matrix3d\(([^)]+)\)/);
      if (m) {
        const v = m[1].split(',').map(Number);
        sx = Math.hypot(v[0], v[1]); sy = Math.hypot(v[2], v[3]);
      } else if (m3) {
        const v = m3[1].split(',').map(Number);
        sx = Math.hypot(v[0], v[1], v[2]); sy = Math.hypot(v[4], v[5], v[6]);
      }
    }
    const sc = cs.scale;
    if (sc && sc !== 'none') {
      const v = sc.trim().split(/\s+/).map(Number);
      if (v.length === 1) { sx *= v[0]; sy *= v[0]; }
      else { sx *= v[0]; sy *= v[1]; }
      txt += (txt ? ' + ' : '') + 'scale:' + sc;
    }
    return { sx, sy, txt };
  }

  function pathOf(el) {
    const out = [];
    let e = el, n = 0;
    while (e && e !== document.body && n++ < 6) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; out.unshift(s); break; }
      if (e.classList && e.classList.length) s += '.' + [...e.classList].slice(0, 3).join('.');
      out.unshift(s);
      e = e.parentElement;
    }
    return out.join('>');
  }

  /* `content` 계산값을 «무엇을 그리는가» 로 가른다.
     ⚠ 계산값은 따옴표째 온다(`"🔒"`). `none`·`normal` 은 «의사 요소가 없다» 는 뜻이다. */
  function contentKind(cs) {
    const c = cs.content;
    if (!c || c === 'none' || c === 'normal') return null;
    if (/^url\(/.test(c)) return 'img';
    const m = c.match(/^"([\s\S]*)"$|^'([\s\S]*)'$/);
    const raw = (m ? (m[1] !== undefined ? m[1] : m[2]) : c).replace(/[\s‍️︎]/g, '');
    if (raw) {
      /* 한 글자라도 그림문자가 아니면 라벨이다 (COLLECT.iconKind 와 같은 규율) */
      for (const ch of raw) if (!PIC.test(ch)) return null;
      return 'pic';
    }
    /* 빈 content — 배경 이미지가 있으면 그림이고, 그라디언트·단색이면 장식 상자다 */
    const bg = cs.backgroundImage;
    if (bg && bg !== 'none' && /\burl\(/.test(bg)) return 'bg';
    return 'empty';
  }

  const out = [];
  for (const el of app.querySelectorAll('*')) {
    /* 호스트가 안 보이면 의사 요소도 안 보인다 (COLLECT 의 «rect 0 은 안 센다» 와 같은 규율) */
    const hr = el.getBoundingClientRect();
    if (!hr.width || !hr.height) continue;

    for (const pe of ['::before', '::after']) {
      let cs;
      try { cs = getComputedStyle(el, pe); } catch (e) { continue; }
      const kind = contentKind(cs);
      if (!kind) continue;
      /* ⚠ `empty`(장식 상자)도 **돌려준다**. 판정에서는 빼지만 «이 자가 의사 요소를 실제로 읽고
         있는가» 를 재는 전제 항의 표본이 그것뿐이다 — 아이콘이 0개일 때 «눈이 없어서 0» 과
         «없어서 0» 을 가르는 유일한 수다(11·21회차가 두 번 데인 헛초록의 모양). */

      /* 자기(의사 요소) 배율 + 호스트에서 위로 올라가는 조상 누적 — [A] 와 같은 뜻 */
      const own = selfScale(cs);
      let sx = own.sx, sy = own.sy;
      const chain = [];
      if (Math.abs(own.sx - 1) > 1e-6 || Math.abs(own.sy - 1) > 1e-6) {
        chain.push(pathOf(el) + pe + ' {' + own.txt + '}');
      }
      let e = el;
      while (e && e !== document.documentElement) {
        const s = selfScale(getComputedStyle(e));
        if (Math.abs(s.sx - 1) > 1e-6 || Math.abs(s.sy - 1) > 1e-6) {
          sx *= s.sx; sy *= s.sy;
          chain.push(pathOf(e) + ' {' + s.txt + '}');
        }
        e = e.parentElement;
      }
      if (sy === 0) continue;

      out.push({
        kind, pe, sel: pathOf(el) + pe,
        txt: String(cs.content).slice(0, 16),
        sx: +sx.toFixed(4), sy: +sy.toFixed(4), ratio: +(sx / sy).toFixed(4),
        own: own.txt, chain,
        fs: cs.fontSize, w: cs.width, h: cs.height,
        bg: (cs.backgroundImage && cs.backgroundImage !== 'none')
          ? (cs.backgroundSize + ' | ' + String(cs.backgroundImage).slice(0, 40)) : '',
      });
    }
  }
  return out;
};

/* ── 소스 인구조사 ─────────────────────────────────────────────────────────
   **판정이 아니라 전제**다(25회차 [I-a] 와 같은 규율 · 24회차가 소스 리터럴 판정으로 데인 자리).
   묻는 것은 하나 — «위상 스윕이 훑을 의사 아이콘이 소스에 몇 자리 있는가».
   ⚠ 주석을 먼저 걷는다(24회차 규율: 스물다섯 회차가 남긴 이력이 «현재 결함» 으로 읽히면 안 된다). */
const blank = (s) => s.replace(/[^\n]/g, ' ');
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank);
}
const PIC_SRC = /\p{Extended_Pictographic}/u;

function sourceCensus(rawHtml) {
  const src = stripComments(rawHtml);
  const rules = [];
  const rx = /([^{}\n;]*::(?:before|after)[^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = rx.exec(src))) {
    const line = src.slice(0, m.index).split('\n').length;
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2];
    const c = body.match(/content\s*:\s*(?:(['"])([\s\S]*?)\1|([^;}]+))/);
    const lit = c ? (c[2] !== undefined ? c[2] : (c[3] || '').trim()) : '';
    let kind = 'deco';
    if (c && /^url\(/.test(lit)) kind = 'img';
    else if (c && /^(var|attr|counter)\(/.test(lit)) kind = 'dyn';   /* 소스로는 못 읽는 꼴 */
    else if (lit && PIC_SRC.test(lit)) kind = 'pic';
    else if (/\burl\(/.test(body)) kind = 'bg';
    rules.push({ line, sel, kind, lit: lit.slice(0, 24) });
  }
  const icons = rules.filter((r) => r.kind !== 'deco');
  return { rules, icons, deco: rules.length - icons.length };
}

/* ── 화면 스윕 ───────────────────────────────────────────────────────────── */
async function sweep(browser, collector, arg, css, only) {
  const list = only || (ONLY ? SCREENS.slice(0, ONLY) : SCREENS);
  const rows = [], errs = [];
  for (const [label, steps] of list) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      for (const s of steps) {
        const found = await STEP(page, s);
        if (!found) errs.push(`${label}: 무음 실패 — '${s}'`);
        await page.waitForTimeout(420);
      }
      await page.waitForTimeout(250);
      /* 되돌림용 주입은 «걷어낼 수 있는 한 장» 으로 — 제품 파일을 안 건드린다 */
      if (css) await page.addStyleTag({ content: css });
      if (css) await page.waitForTimeout(120);
      const got = await page.evaluate(collector, arg);
      for (const g of got) rows.push(Object.assign({ screen: label }, g));
    } catch (e) {
      errs.push(label + ': ' + String(e.message || e).split('\n')[0]);
    }
    await ctx.close();
  }
  return { rows, errs };
}

function fold(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const k = r.sel + '|' + r.ratio;
    if (!byKey.has(k)) byKey.set(k, Object.assign({}, r, { screens: new Set() }));
    byKey.get(k).screens.add(r.screen);
  }
  return [...byKey.values()].map((r) => { r.screens = [...r.screens]; return r; })
    .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));
}

module.exports = { COLLECT_PSEUDO, sourceCensus, stripComments, HOST_LIVE: '.side .ibtn[data-pop="attend"]' };

if (require.main !== module) return;

(async () => {
  const browser = await launch(chromium);

  {
    const fs = require('fs');
    const path = require('path');
    const cen = sourceCensus(fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8'));
    console.log(`[0] 소스 인구조사 — 의사 요소 규칙 ${cen.rules.length}개 (장식 상자 ${cen.deco} · 아이콘이 될 수 있는 것 ${cen.icons.length})`);
    for (const r of cen.icons) console.log(`    ${r.line}행  [${r.kind}] ${r.sel}  «${r.lit}»`);
  }

  console.log('\n[1] 인구조사 — 의사 요소가 그리는 «아이콘»');
  const { rows, errs } = await sweep(browser, COLLECT_PSEUDO, { all: ALL });
  const icons = rows.filter((r) => r.kind !== 'empty');
  const groups = fold(icons);
  const nonUni = groups.filter((g) => Math.abs(g.ratio - 1) > TOL);

  const byKind = {};
  for (const r of icons) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  console.log(`  관측 의사 요소 ${rows.length}개 · 그중 아이콘 ${icons.length}개`
    + ` (${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음'})`
    + ` → ${groups.length}자리`);
  console.log(`  음성항(장식 상자 · content:'' + 비-url 배경) ${rows.length - icons.length}개 — 판정에서 뺀다`);
  for (const g of groups) {
    const pct = ((g.ratio - 1) * 100).toFixed(1);
    const mark = Math.abs(g.ratio - 1) > TOL ? '⚠' : ' ';
    console.log(`  ${mark} ${g.ratio.toFixed(3)} (${pct > 0 ? '+' : ''}${pct}%)  [${g.kind}] ${g.sel}  «${g.txt}»  fs ${g.fs}`);
    console.log(`      화면 ${g.screens.length}곳: ${g.screens.slice(0, 6).join(', ')}${g.screens.length > 6 ? ' …' : ''}`);
    for (const c of g.chain) console.log(`      ← ${c}`);
    if (g.bg) console.log(`      배경: ${g.bg}`);
  }
  /* 전제 — «아이콘 0개» 가 «눈이 없어서 0» 이 아님을 세우는 항. 표본은 장식 상자다. */
  if (rows.length) ok(`의사 요소 ${rows.length}개를 실제로 읽었다 — «아이콘 0개» 가 눈먼 0 이 아니다`);
  else bad('의사 요소 0개 — 수집기가 `getComputedStyle(el, "::before")` 를 한 번도 못 읽었다(헛초록)');
  console.log(`  · 의사 아이콘 ${icons.length}개 (그림문자 ${byKind.pic || 0} · content:url ${byKind.img || 0} · 배경 url ${byKind.bg || 0})`);
  if (!nonUni.length) ok(`비균등(|sx/sy−1| > ${TOL}) 0자리`);
  else bad(`비균등 ${nonUni.length}자리 — ${nonUni.map((g) => g.sel + ' ' + g.ratio).join(' · ')}`);
  if (!errs.length) ok(`스윕 ${(ONLY ? SCREENS.slice(0, ONLY) : SCREENS).length}화면 전부 무음 실패 0`);
  else bad(`무음 실패 ${errs.length}건: ${errs.slice(0, 4).join(' | ')}`);

  if (REVERT) {
    /* ⚑ 되돌림이 이 회차의 본체다 — 새 축이 [A] 의 재탕이 아니라는 것은 말이 아니라 수로 선다.
       같은 주입을 두 자에게 나란히 물어본다:
         · 이 자(의사 축)          → 잡아야 한다
         · scan356.COLLECT([A] 축) → **못 잡는 것이 정상**이다(의사 요소는 DOM 노드가 아니다)
       뒤쪽이 «못 잡는다» 로 나와야 이 축이 새 축이다.

       ⚠ 주입 자리를 `.ibtn.lock::after`(제품에 있는 유일한 그림문자 의사 규칙)로 잡으면 안 된다 —
         그 셀렉터는 **DOM 에 한 번도 안 붙는다**(작업 49 가 `.ibtn[data-lock]` 을 지웠다 · 626 으로 등재).
         호스트가 없으면 의사 요소도 없어서 «주입해도 0자리» 가 나오고, 그건 자가 눈먼 것이 아니라
         **표본이 없는 것**인데 되돌림 시험은 그 둘을 못 가른다. 살아 있는 호스트에 건다. */
    const HOST = '.side .ibtn[data-pop="attend"]';
    const BASE = HOST + '::after{content:"🔒";position:absolute;left:0;top:0;font-size:40px;';
    const ONE = [SCREENS[0]];   /* 02 메인 — 좌측 사이드가 상시 보이는 화면. 한 화면이면 충분하다 */
    console.log('\n[2] 되돌림 — 살아 있는 호스트(' + HOST + ')에 의사 아이콘을 심는다 · 화면 «' + ONE[0][0] + '»');

    const r2 = await sweep(browser, COLLECT_PSEUDO, { all: false }, BASE + 'transform:scaleX(.8)}', ONE);
    const hit = fold(r2.rows.filter((r) => r.kind !== 'empty')).filter((g) => Math.abs(g.ratio - 1) > TOL);
    if (hit.length) ok(`의사 축이 ${hit.length}자리 잡았다 — ${hit.map((g) => g.sel + ' ' + g.ratio.toFixed(3)).join(' · ')}`);
    else bad('의사 축이 주입해도 0자리 — 이 자는 아무것도 못 보는 «헛초록» 이다');

    const r3 = await sweep(browser, COLLECT, { all: false }, BASE + 'transform:scaleX(.8)}', ONE);
    const hit3 = r3.rows.filter((r) => Math.abs(r.ratio - 1) > TOL);
    if (!hit3.length) ok('[A] 축(scan356.COLLECT)은 같은 주입을 **0자리**로 읽는다 — 구조적으로 못 보는 축이 맞다');
    else bad(`[A] 축도 ${hit3.length}건 잡았다 — 새 축이 아니라 기존 축의 재탕이다: ${hit3.slice(0, 3).map((r) => r.sel).join(' · ')}`);

    /* 음성항 둘 — 이 자가 «무엇이든 빨갛게 하는 자» 가 아니라는 것 */
    const r4 = await sweep(browser, COLLECT_PSEUDO, { all: false }, BASE + 'transform:scale(.8)}', ONE);
    const hit4 = fold(r4.rows.filter((r) => r.kind !== 'empty')).filter((g) => Math.abs(g.ratio - 1) > TOL);
    if (!hit4.length) ok('음성항 ⓐ — 등방 `scale(.8)` 주입은 0자리 (크기 변경은 결함이 아니다 · 23회차 [G-d] 규율)');
    else bad(`음성항 ⓐ 실패 — 등방 주입에도 ${hit4.length}자리를 결함이라 부른다`);

    const LBL = HOST + '::after{content:"출석 5";position:absolute;left:0;top:0;transform:scaleX(.8)}';
    const r5 = await sweep(browser, COLLECT_PSEUDO, { all: false }, LBL, ONE);
    const hit5 = fold(r5.rows.filter((r) => r.kind !== 'empty')).filter((g) => Math.abs(g.ratio - 1) > TOL);
    if (!hit5.length) ok('음성항 ⓑ — 글자가 섞인 `content` 는 라벨이라 안 센다 (3회차 `u.pr` 선례)');
    else bad(`음성항 ⓑ 실패 — 라벨의 scaleX 를 결함이라 부른다(${hit5.length}자리)`);
  }

  await browser.close();
  console.log(`\n[probe356r26] ${pass}/${pass + fail} PASS`);
  process.exit(fail ? 1 : 0);
})();
