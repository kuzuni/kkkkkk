/* 작업 337 — 공용 서브탭 부품 `.stabs` / `.stab` 회귀 게이트
 *
 *   node tools/verify337.js
 *
 * 무엇을 지키는가 — 337 이 되돌린 것은 값 다섯 개지만, 그 값들이 서 있는 **근거는 둘**이다.
 *
 *   ⓐ **살아 있는 ref 는 03 §4-3 · 07 §9 둘뿐이고, 둘이 같은 말을 한다.**
 *      10·13 의 서브탭 실측치는 96 정오표로 폐기됐고(측정표 10 §3 · 13 §8), 126 이 «활성만 작게»
 *      (`fs 41` + `scaleY(.937)` + `top:8px`) 만든 근거가 바로 그 폐기된 표본이었다.
 *      두 ref 는 **활성과 비활성 라벨을 같은 크기로** 그린다(잉크 높이 둘 다 38).
 *   ⓑ **부품은 하나다**(96 주인 지시 ⓒ). 호스트 7곳이 위치만 정하고 규격은 여기서만 정한다.
 *
 * 그래서 이 게이트는 «숫자가 47 인가» 만 묻지 않는다 — **두 상태가 같은 크기인가**,
 * **일곱 호스트가 같은 부품을 쓰는가**, **알약 아래로 바 면이 드러나지 않는가** 를 같이 묻는다.
 * 잉크 자체의 ref 대조는 픽셀 자(`python3 tools/ink337.py`)가 한다 — 그쪽이 표본 3개 전부
 * 폭 Δ0/Δ0/−1.4% · 높이 Δ0 · 중심 y Δ0 이다. 여기서는 그 결과를 **떠받치는 CSS 손잡이**를 못박는다.
 *
 * §R 되돌림 시험 — 옛 값을 도로 주입하면 위 단언이 **실제로 빨개지는지** 를 건다.
 *   무르게 푼 수리가 아님을 못박는 자리다(334 교훈).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS ' + n + (d ? ' — ' + d : '')); }
  else { fail++; console.log('  FAIL ' + n + (d ? ' — ' + d : '')); }
};
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1.0 : t);

/* 337 이 확정한 부품 규격 — 근거는 파일 머리말 ⓐⓑ */
const BAR_H = 97;          /* ref 검정 테두리 2021~2026 / 2112~2117 → 외곽 2021..2117 (03·07 일치) */
const BORDER = 6, CELL_H = 85;
const FS = 47;             /* 잉크 높이 38 = ref (활성·비활성 **같은 값**) */
const SX = 0.97;           /* 잉크 폭 67/71 = ref */
const TOP = '3px';         /* 잉크 중심 y = ref (활성 2005.5 · 비활성 2010.5, 둘 다 Δ0) */

/* 호스트 7곳 — [이름, 바 선택자, 진입, 바닥앵커인가] */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }, true],
  ['06 장비', '#eqTabs', () => heroSubGo('eq'), true],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }, true],
  ['10 상점', '#shopCats', () => openShopPage(), true],
  ['13 재화', '#shopCats', () => document.querySelector('#shopCats [data-cat="coin"]').click(), true],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, true],
  ['47 룬', '#rnSubs', () => setTrSub('rune'), false],   /* 상단 앵커(top:34) — 23 다음에 돈다 */
];

/* 바 하나를 읽는다. ⚠ 60·122 쥬시의 입장 연출(`jzPgIn scale(.985)`)이 호스트를 통째로 줄인 채
   시작하므로(verify47 머리말) **절대 높이를 그대로 비교하면 안 된다** — 바 폭으로 배율을 역산해
   나눈다. 폭은 호스트가 정하는 값이라 CSS 선언에서 읽어 온다. */
const READ = (sel) => {
  const bar = document.querySelector(sel);
  if (!bar || !bar.offsetParent) return null;
  const bb = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const cells = [...bar.querySelectorAll('.stab')].filter(c => c.offsetParent).map(c => {
    const cb = c.getBoundingClientRect();
    const i = c.querySelector('i');
    const ics = getComputedStyle(i);
    const rg = document.createRange(); rg.selectNodeContents(i);
    const rb = rg.getBoundingClientRect();
    return {
      t: i.textContent, on: c.classList.contains('on'),
      h: cb.height, bottom: cb.bottom,
      /* ⚠ 60 쥬시의 탭 전환 팝(`.jz-sb`)은 **`transform` 이 아니라 `scale:` 프로퍼티**로 최대 1.06 까지
         칸을 부풀린다(verify96 [7]). Range 상자는 그 배율을 그대로 먹으므로 칸 자기 배율도 같이 읽어
         나눠야 «같은 글자가 호스트마다 같은 폭인가» 가 팝 위상에 따라 흔들리지 않는다. */
      cs: (() => { const v = parseFloat(getComputedStyle(c).scale); return isNaN(v) ? 1 : v; })(),
      fs: parseFloat(ics.fontSize), tr: ics.transform, top: ics.top, lh: ics.lineHeight,
      rw: rb.width, rcy: (rb.top + rb.bottom) / 2,
    };
  });
  return {
    y: bb.y, h: bb.height, w: bb.width,
    bw: parseFloat(cs.borderTopWidth), rad: cs.borderTopLeftRadius, box: cs.boxSizing,
    /* 바 «패딩박스» 하변 = 검정 테두리 안쪽. 알약 하변이 여기와 같아야 바 면이 안 드러난다 */
    innerBottom: bb.bottom - parseFloat(cs.borderBottomWidth),
    cells,
  };
};

/* transform 행렬에서 (a, d) = (scaleX, scaleY) 를 뽑는다 */
const mat = tr => {
  const m = /matrix\(([^)]+)\)/.exec(tr || '');
  if (!m) return null;
  const v = m[1].split(',').map(Number);
  return { a: v[0], d: v[3] };
};

(async () => {
  const browser = await launch(chromium);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
    await page.waitForTimeout(1400);

    const got = {};
    for (const [name, sel, setup, bottomAnchored] of HOSTS) {
      await page.evaluate(setup);
      await page.waitForTimeout(600);
      got[name] = Object.assign({ bottomAnchored }, await page.evaluate(READ, sel) || {});
      got[name].sel = sel;
    }

    /* ── §1 부품 규격 — 일곱 호스트가 같은 부품을 쓴다 ───────────────────── */
    console.log('\n[1] 부품 규격 — 호스트 7곳이 «위치만» 정한다 (96 주인 지시 ⓒ)');
    for (const [name] of HOSTS) {
      const g = got[name];
      if (!g || !g.cells) { ok(name + ' 바가 보인다', false); continue; }
      /* 입장 연출 배율 = 실측 높이 / 규격 높이. 1 또는 .985 여야 한다(그 밖은 진짜 결함) */
      const s = g.h / BAR_H;
      ok(name + ' 바 높이 ' + BAR_H + ' (입장 연출 배율 보정)',
        near(s, 1, 0.02) && near(g.h / s, BAR_H, 0.6), 'h ' + g.h.toFixed(1) + ' (배율 ' + s.toFixed(3) + ')');
      ok(name + ' 테두리 ' + BORDER + ' · radius 43 · border-box',
        near(g.bw / s, BORDER, 0.3) && g.rad === '43px' && g.box === 'border-box',
        g.bw.toFixed(1) + ' / ' + g.rad + ' / ' + g.box);
      ok(name + ' 칸 높이 ' + CELL_H, g.cells.every(c => near(c.h / s, CELL_H, 0.6)),
        g.cells.map(c => (c.h / s).toFixed(1)).join(' '));
    }

    /* ── §2 ③⑤ — 알약 아래로 바 면이 드러나지 않는다 ─────────────────────
       AL·AM 의 «알약 하단에 바 면 2px», AL·AM·AO 의 «셸 외곽 +1~2px» 은 같은 것 하나였다:
       패딩박스(99 − 12 = 87) > 알약(85). 셸을 97 로 내리면 87 → 85 가 되어 둘 다 닫힌다.
       ⚠ 이 항이 **이 작업의 본체 중 하나**다 — 절대 높이가 아니라 «차이» 를 재므로 입장 연출 배율과 무관하다. */
    console.log('\n[2] ③⑤ 알약 하변 ↔ 바 패딩박스 하변 = 0 (드러나는 바 면 0px)');
    for (const [name] of HOSTS) {
      const g = got[name];
      if (!g || !g.cells || !g.cells.length) { ok(name + ' 읽힘', false); continue; }
      const gap = g.innerBottom - Math.max(...g.cells.map(c => c.bottom));
      ok(name + ' 노출 0px', Math.abs(gap) <= 0.6, gap.toFixed(2) + 'px');
    }

    /* ── §3 ① 라벨 크기 — 두 상태가 «같은 크기» 인 것이 ref 다 ─────────────
       126 이 활성만 줄인 근거(10 ref)는 96 정오표로 폐기됐고, 살아 있는 두 ref 는
       활성·비활성 잉크 높이를 **둘 다 38** 로 그린다. 그래서 «활성 fs == 비활성 fs» 를 건다 —
       숫자 47 만 걸면 다음 워커가 «활성만 조금» 줄이는 같은 함정에 다시 빠진다. */
    console.log('\n[3] ① 라벨 규격 — fs ' + FS + ' · scaleX ' + SX + ' · scaleY 없음 · top ' + TOP);
    for (const [name] of HOSTS) {
      const g = got[name];
      if (!g || !g.cells || !g.cells.length) { ok(name + ' 읽힘', false); continue; }
      const s = g.h / BAR_H;
      ok(name + ' 모든 칸 fs ' + FS, g.cells.every(c => near(c.fs / s, FS, 0.6)),
        g.cells.map(c => (c.fs / s).toFixed(1)).join(' '));
      const on = g.cells.find(c => c.on), off = g.cells.find(c => !c.on);
      if (on && off) ok(name + ' ★ 활성 fs == 비활성 fs (ref 는 둘을 같게 그린다)',
        near(on.fs, off.fs, 0.01), on.fs + ' vs ' + off.fs);
      const ms = g.cells.map(c => mat(c.tr)).filter(Boolean);
      ok(name + ' scaleX ' + SX, ms.length === g.cells.length && ms.every(m => near(m.a, SX, 0.005)),
        ms.map(m => m.a).join(' '));
      ok(name + ' ★ scaleY 없음 (126 의 .937 을 되돌렸다)', ms.every(m => near(m.d, 1, 0.005)),
        ms.map(m => m.d).join(' '));
      ok(name + ' 라벨 top ' + TOP + ' (두 상태 공통)', g.cells.every(c => c.top === TOP),
        g.cells.map(c => c.top).join(' '));
    }

    /* ── §4 ④ 세로 — 비활성이 활성보다 «5px 아래» 가 ref 다 ──────────────
       ref 07: 활성 잉크 중심 2005.5 · 비활성 2010.5. 착수 전 우리는 **부호가 반대**(활성이 4px 아래)였다.
       그 5px 은 `line-height` 차(비활성 87 ↔ 활성 77)가 만드는 것이라 여기서 그 관계를 건다. */
    console.log('\n[4] ④ 세로 — 비활성 잉크가 활성보다 아래 (ref +5px)');
    for (const [name] of HOSTS) {
      const g = got[name];
      if (!g || !g.cells) continue;
      const on = g.cells.find(c => c.on), off = g.cells.find(c => !c.on);
      if (!on || !off) continue;
      const s = g.h / BAR_H;
      const d = (off.rcy - on.rcy) / s;   /* 중심 «차» 라 칸 팝(scale:)은 중심을 안 옮긴다 — 나눌 것 없다 */
      ok(name + ' 비활성 − 활성 = +5px', near(d, 5, 1), d.toFixed(2) + 'px');
      ok(name + ' line-height 활성 77 / 비활성 87', on.lh === '77px' && off.lh === '87px',
        on.lh + ' / ' + off.lh);
    }

    /* ── §5 부품 공용성 — 같은 글자는 어느 호스트에서나 같은 폭 ────────────
       «장비»·«스킬» 은 06·07 둘 다에 있다. 한 호스트만 따로 손대면 여기가 빨개진다. */
    console.log('\n[5] 부품 공용성 — 같은 글자는 호스트가 달라도 같은 폭');
    const widths = {};
    for (const [name] of HOSTS) {
      const g = got[name]; if (!g || !g.cells) continue;
      const s = g.h / BAR_H;
      for (const c of g.cells) (widths[c.t] = widths[c.t] || []).push({ h: name, w: c.rw / s / c.cs });
    }
    let shared = 0;
    for (const [t, list] of Object.entries(widths)) {
      if (list.length < 2) continue;
      shared++;
      const lo = Math.min(...list.map(x => x.w)), hi = Math.max(...list.map(x => x.w));
      ok('«' + t + '» 폭이 ' + list.length + ' 호스트에서 같다', hi - lo <= 0.6,
        list.map(x => x.h + ' ' + x.w.toFixed(2)).join(' · '));
    }
    ok('여러 호스트에 걸친 라벨이 실제로 있다 (표본 0개면 위가 헛초록이다)', shared >= 2, shared + '종');

    /* ── §R 되돌림 시험 ─────────────────────────────────────────────────
       옛 값을 도로 주입해 «위 단언이 진짜로 빨개지는지» 를 건다. 초록으로 남으면 그 단언은 죽은 것이다. */
    console.log('\n[R] 되돌림 시험 — 옛 값을 주입하면 빨개져야 한다');
    const revert = async (css) => {
      const h = await page.addStyleTag({ content: css });
      await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
      await page.waitForTimeout(400);
      const g = await page.evaluate(READ, '#bSk .stabs');
      await page.evaluate(el => el.remove(), h);
      await page.waitForTimeout(200);
      return g;
    };

    const r1 = await revert('.stabs{height:99px!important}');
    ok('R1 셸을 99 로 되돌리면 §2(노출 0px)가 깨진다',
      Math.abs(r1.innerBottom - Math.max(...r1.cells.map(c => c.bottom))) >= 1.5,
      '노출 ' + (r1.innerBottom - Math.max(...r1.cells.map(c => c.bottom))).toFixed(2) + 'px');

    const r2 = await revert('.stab{font-size:43px!important}.stab.on{font-size:41px!important}');
    const r2on = r2.cells.find(c => c.on), r2off = r2.cells.find(c => !c.on);
    ok('R2 126 의 «활성만 작게»(43/41)를 되돌리면 §3 ★ 가 깨진다',
      !near(r2on.fs, r2off.fs, 0.01), r2on.fs + ' vs ' + r2off.fs);

    const r3 = await revert('.stab.on>i{transform:scaleX(.893) scaleY(.937)!important}');
    ok('R3 scaleY(.937) 을 되돌리면 §3 ★ 가 깨진다',
      r3.cells.filter(c => c.on).every(c => !near(mat(c.tr).d, 1, 0.005)),
      r3.cells.filter(c => c.on).map(c => mat(c.tr).d).join(' '));

    const r4 = await revert('.stab.on>i{top:8px!important}');
    const r4on = r4.cells.find(c => c.on), r4off = r4.cells.find(c => !c.on);
    /* ⚠ 여기서 «부호가 뒤집힌다» 로 걸면 안 된다 — top 만 8 로 되돌리면 차가 +5 → **0** 이 된다
       (음수가 되던 착수 전 값은 `fs`·`scaleY` 까지 옛 것이었을 때의 합이다). §4 가 거는 것은
       «+5 인가» 이므로 되돌림도 «더 이상 +5 가 아닌가» 로 거는 것이 정확하다. */
    ok('R4 126 의 top:8px 을 되돌리면 §4(비활성 − 활성 = +5)가 깨진다',
      Math.abs((r4off.rcy - r4on.rcy) - 5) >= 1.5, (r4off.rcy - r4on.rcy).toFixed(2) + 'px (기대 +5)');

    const back = await page.evaluate(READ, '#bSk .stabs');
    const bon = back.cells.find(c => c.on), boff = back.cells.find(c => !c.on);
    ok('R5 주입을 걷으면 전부 원래대로',
      near(back.h, BAR_H, 0.6) && near(bon.fs, FS, 0.6) && near(boff.fs, FS, 0.6) &&
      near(mat(bon.tr).d, 1, 0.005) && bon.top === TOP && (boff.rcy - bon.rcy) > 0,
      'h' + back.h + ' fs' + bon.fs + '/' + boff.fs + ' top' + bon.top);

    console.log('\n[6] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  console.log('\nVERIFY337 ' + pass + '/' + (pass + fail) + (fail ? '  FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})();
