#!/usr/bin/env node
/* 436 프로브 — «전체 높이 오버레이 하변 ↔ 하단 탭바 상변» 의 **여유**(clearance)를 재는 자.
 *
 * 실행: node tools/probe436.js [--only <라벨조각>[,…]] [--sweep] [--json <경로>]
 *
 * 왜 이 자가 따로 필요한가(등재문·351 11회차 §«눈이 자를 또 앞섰다»):
 *   `probe351` **D7 은 침범(`by > 0`)만 센다.** 여유 0.0 은 D7 에게 «아무 일도 안 일어난 자리» 다.
 *   그런데 같은 축의 아래쪽 끝이 이미 결함으로 등재돼 있다 — `.bls-promo` −164(**414**) ·
 *   `.pf` −149(**415**). ⇒ 여유는 «침범과 같은 자리에서 부호만 다른» 한 축이다.
 *
 * ⚑ **436 이 이 자로 정한 통과선은 «0» 이다 — «여유 0.0 은 결함이 아니다».**
 *   등재문은 «0.0 인 셋은 다음 414·415 다(프레임이 조금만 짧거나 콘텐츠가 한 줄 늘면 침범)» 로
 *   적혀 있었는데 **재현이 그 전제를 기각했다.** 0.0 인 세 자리는 전부 **390 이 만든 띠**
 *   («위 = `.pedge` 하변 142 · 아래 = 탭바 180»)에 상자가 **정확히 꽉 찬** 모습이고,
 *   상자는 셋 다 `max-height:…100%` 로 그 띠에 묶여 있어 **프레임이 짧아지면 같이 줄어든다**:
 *     `side:quest` `.mbox` — 1500·1550·1600·1650·1700 **전부 gap 0.0**(상자 1198→1238→1278→1328→1378)
 *     `menu:conf`  `.cf55` — 1500·1550·1600·1650 **전부 gap 0.0**(상자가 같이 줄어든다)
 *     `side:coll`  `.cl-tabs` — 1600·1841 **gap 0.0**(390 이 `287 = 탭바 180 + 오버행 149 − 42` 로 맞췄다)
 *   ⇒ 0.0 은 **미끄럼틀의 한 칸 앞이 아니라 고정점**이다. 414·415 가 음수로 간 이유는 그 둘이
 *     **높이가 고정**(`.pf` 1396 · `.bls` 1157 + 스트립 249)이라 띠에 안 묶여 있었기 때문이고,
 *     여기 셋은 묶여 있다. **다른 축이다.**
 *   ⚠ 그래서 «≤ 8px 경고» 같은 항을 세우지 않았다 — 0.0 이 정상인 자리가 33군데(대부분 `#stagearea`,
 *     즉 «전투 캔버스 하변 = 탭바 상변» 이라는 레이아웃의 정의 그 자체)라 그 항은 344·372 처럼
 *     회차마다 뒤집히는 잡음이 된다. **부호가 곧 판정선**이고 D7 의 기존 `by > 0` 이 이미 옳다.
 *
 * ⚑ **그 대신 이 자가 찾아낸 진짜 구멍은 «통과선» 이 아니라 «프레임 축» 이다** — `--sweep` 참고.
 *
 * 재는 법은 D7 과 **한 글자도 안 다르게** 맞췄다(같은 자리를 부호만 바꿔 읽어야 대조가 성립한다):
 *   · 딤(`.dim`)은 뺀다 — 규칙상 감점 아님
 *   · 「칠이 있는 상자」만: `background-color` alpha ≥ .9 **또는** `background-image !== none`
 *     (7회차 교훈 — 그라데이션은 `backgroundColor` 가 `rgba(0,0,0,0)` 으로 계산된다)
 *   · 클리핑 조상을 접은 **drawn**(지금 실제로 그려지는) 상자로 잰다 — raw 로 재면 유령이 쏟아진다
 *   · 다이얼로그·시트 급만: w ≥ 300 · h ≥ 200 · 면적 ≥ 120000
 *   · 가로로 40px 넘게 겹치는 짝만(세로로 스쳐 지나가는 남남을 안 센다)
 *
 * 여유의 부호: **gap = nav.top − box.bottom** ⇒ 양수 = 여유 · 음수 = 침범(그 절대값이 D7 의 `by`).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');

/* `--only` 는 쉼표로 여러 개를 받는다 — `--sweep` 은 화면 하나에 프레임 14벌이라 전수가 비싸다
   (45화면 × 14 ≈ 630 로드). 의심 구간만 골라 훑을 수 있어야 회차가 산다. */
const ONLY = (() => {
  const i = process.argv.indexOf('--only');
  return i > 0 ? process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean) : null;
})();
const hitOnly = (label) => !ONLY || ONLY.some((p) => label.includes(p));
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
/* --sweep — **프레임 축**으로 훑는다. 이 자의 본체이고, 실제로 결함을 낸 것도 이 갈래다.
   왜 두 해상도로는 안 되나(436 이 실측으로 못박은 것):
     `probe351` D7 도 이 자의 기본 갈래도 **2280 과 1600 딱 둘**만 잰다. 그런데 351 의 판정은
     차분이라 **양 끝이 둘 다 성한 결함은 원리적으로 소거된다.** 실제로 그런 자리가 있었다 —
     `side:coll` 의 깃발 서브탭(`.cl-tabs`)은 2280 에서 여유 135.5 · 1600 에서 0.0 으로 양 끝이
     둘 다 음수가 아닌데, **그 사이 1842 ≤ h < 2009 에서는 −11px 로 탭바를 파고든다**
     (390 이 그 11 을 `.shortf` **안에서만** 갚았기 때문이다). 그 구간에 **1080×1920(9:16)** 이
     들어 있고 그것은 `smoke.js` 412행이 도는 화면비 4종 중 하나다.
   ⇒ 여유는 프레임 높이의 **구간별 일차식**이라(상자가 상한에 걸리는지에 따라 기울기가 갈린다)
     끝점 둘로는 못 잡는다. 이 갈래는 clamp 구간 경계·`.shortf` 문턱을 포함해 훑는다. */
const SWEEP = process.argv.includes('--sweep');
/* 훑는 프레임 높이 — `#app` 높이 clamp(1600..2600) 의 양 끝 · `.shortf` 문턱(1842) 의 양옆 ·
   smoke 화면비 4종이 만드는 높이 · 상한 전환점(1987·2009)을 일부러 포함한다. */
const SWEEP_HS = [1600, 1700, 1841, 1842, 1900, 1920, 1987, 1998, 2009, 2020, 2100, 2280, 2400, 2600];

const TALL = [1080, 2280];
const SHORT = [1080, 1600];

/* 진입·정착은 351 공용 하네스에서 온다(385 «자매 자 드리프트» 예방 — 진입 경로를 복사하지 않는다). */
const { fresh, settle, collectOpeners, drive } = require('./probe351lib');

const SCAN = function () {
  const app = document.getElementById('app');
  if (!app) return { rows: [] };
  const rows = [];

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
  };
  /* D7 과 같은 「그려지는 상자」 — 클리핑 조상을 전부 접는다. */
  const drawnBox = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (cs.overflowY !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    return d;
  };
  const nm = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (c.length) s += '.' + c.join('.');
    }
    return s;
  };

  /* 고정 내비 — D7 의 `navs` 와 같은 셋. 여유 축의 기준선이다. */
  const navs = [];
  const tabbar = document.getElementById('tabbar');
  if (tabbar && vis(tabbar)) navs.push({ name: 'tabbar', r: tabbar.getBoundingClientRect(), el: tabbar });
  const pedge = document.querySelector('.pedge');
  if (pedge && vis(pedge)) navs.push({ name: 'hud', r: pedge.getBoundingClientRect(), el: pedge });
  const tuto = document.getElementById('tuto');
  if (tuto && vis(tuto)) navs.push({ name: 'tuto', r: tuto.getBoundingClientRect(), el: tuto });
  if (!navs.length) return { rows: [] };

  for (const el of app.querySelectorAll('*')) {
    if (!vis(el)) continue;
    if (el.classList.contains('dim')) continue;
    const cs = getComputedStyle(el);
    const m = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    const parts = m ? m[1].split(',').map((s) => parseFloat(s)) : [];
    const alpha = m ? (parts.length > 3 ? parts[3] : 1) : 0;
    if (!(alpha >= 0.9 || cs.backgroundImage !== 'none')) continue;
    const d = drawnBox(el);
    const w = d.x2 - d.x1, h = d.y2 - d.y1;
    if (w < 300 || h < 200) continue;
    if (w * h < 120000) continue;
    for (const nav of navs) {
      if (el === nav.el || el.contains(nav.el) || nav.el.contains(el)) continue;
      /* 「위에서 내려온 상자」만 본다 — 내비보다 아래에서 시작한 것은 이 축의 짝이 아니다. */
      if (d.y1 >= nav.r.top) continue;
      const ox = Math.min(d.x2, nav.r.right) - Math.max(d.x1, nav.r.left);
      if (ox <= 40) continue;
      rows.push({
        nav: nav.name,
        sel: nm(el),
        gap: Math.round((nav.r.top - d.y2) * 10) / 10,   /* 양수 = 여유 · 음수 = 침범 */
        wide: Math.round(ox),
        boxH: Math.round(h),
      });
    }
  }
  return { rows, frame: { h: app.getBoundingClientRect().height } };
};

const key = (r) => r.nav + '|' + r.sel;

(async () => {
  const browser = await launch(chromium);
  const all = [];

  if (SWEEP) {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => hitOnly(o.label));
    console.log(`[436 --sweep] 화면 ${openers.length}개 × 프레임 ${SWEEP_HS.length}종 — 여유의 «부호가 바뀌는 구간» 을 찾는다`);
    const bad = [];
    try {
      for (const o of openers) {
        const series = new Map();
        for (const h of SWEEP_HS) {
          const { ctx, page } = await fresh(browser, 1080, h);
          await drive(page, o);
          await settle(page);
          const r = await page.evaluate(SCAN).catch(() => ({ rows: [] }));
          await ctx.close();
          for (const row of r.rows) {
            const k = key(row);
            if (!series.has(k)) series.set(k, []);
            series.get(k).push({ h, gap: row.gap });
          }
        }
        for (const [k, pts] of series) {
          const neg = pts.filter((p) => p.gap < 0);
          if (!neg.length) continue;
          /* **양 끝이 성한데 가운데가 음수인 것** 이 이 갈래가 존재하는 이유다 — 그것만 따로 표시한다. */
          const ends = [pts[0], pts[pts.length - 1]].filter(Boolean);
          const hidden = ends.every((p) => p.gap >= 0);
          bad.push({ screen: o.label, k, worst: Math.min(...neg.map((p) => p.gap)),
            range: [neg[0].h, neg[neg.length - 1].h], hidden });
        }
      }
    } finally { await browser.close(); }
    for (const b of bad) {
      console.log(`  ${b.screen.padEnd(16)} ${b.k.padEnd(38)} 최악 ${String(b.worst).padStart(7)}px`
        + ` · 구간 ${b.range[0]}..${b.range[1]}${b.hidden ? '   ⚑ 양 끝은 성하다 — 2해상도 차분으로는 원리적으로 못 본다' : ''}`);
    }
    console.log(`\n  ⛔ 침범 짝 ${bad.length}건 (그중 «양 끝이 성한» 것 ${bad.filter((b) => b.hidden).length}건)`);
    if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(bad, null, 1));
    return;
  }

  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => hitOnly(o.label));
    console.log(`[436] 화면 ${openers.length}개 × 2해상도 — «오버레이 하변 ↔ 고정 내비 상변» 여유`);

    for (const o of openers) {
      const scan = async ([w, h]) => {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, o);
        await settle(page);
        const r = await page.evaluate(SCAN).catch((e) => ({ rows: [], err: String(e.message || e) }));
        await ctx.close();
        return r;
      };
      const tall = await scan(TALL);
      const short = await scan(SHORT);
      const tMap = new Map(tall.rows.map((r) => [key(r), r]));
      for (const r of short.rows) {
        const t = tMap.get(key(r));
        all.push({
          screen: o.label, nav: r.nav, sel: r.sel,
          g2280: t ? t.gap : null, g1600: r.gap,
          delta: t ? Math.round((r.gap - t.gap) * 10) / 10 : null,
          wide: r.wide, boxH: r.boxH,
        });
      }
    }
  } finally { await browser.close(); }

  /* 화면·내비별로 «가장 빡빡한 짝» 한 줄만 남긴다 — 같은 상자의 자식이 줄줄이 딸려 나오면 표를 못 읽는다. */
  const best = new Map();
  for (const r of all) {
    const k = r.screen + '|' + r.nav;
    const p = best.get(k);
    if (!p || r.g1600 < p.g1600) best.set(k, r);
  }
  const rows = [...best.values()].sort((a, b) => a.g1600 - b.g1600);

  console.log('\n  화면 / 내비 / 상자 / 2280 여유 / 1600 여유 / Δ');
  for (const r of rows) {
    const mark = r.g1600 < 0 ? '  ⛔침범' : (r.g1600 <= 8 ? '  ⚠붙음' : '');
    console.log(`  ${r.screen.padEnd(16)} ${r.nav.padEnd(7)} ${r.sel.padEnd(30)}`
      + ` ${String(r.g2280 === null ? '—' : r.g2280).padStart(8)} → ${String(r.g1600).padStart(7)}`
      + ` ${String(r.delta === null ? '—' : r.delta).padStart(8)}${mark}`);
  }
  const neg = rows.filter((r) => r.g1600 < 0).length;
  const zero = rows.filter((r) => r.g1600 >= 0 && r.g1600 <= 8).length;
  console.log(`\n  ⛔ 침범(음수) ${neg}건 · ⚠ 여유 ≤ 8px ${zero}건 · 전체 ${rows.length}짝`);
  if (JSONOUT) { fs.writeFileSync(JSONOUT, JSON.stringify({ rows, all }, null, 1)); console.log(`  → ${JSONOUT}`); }
})();
