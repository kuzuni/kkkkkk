#!/usr/bin/env node
/* 476 재현 프로브 — «D7 이 낸 겹침은 **아무도 못 보는 요소**와의 겹침인가» 를 숫자로 묻는다.
 *   실행: node tools/probe476.js [--only <라벨조각>]
 *
 * 338 규칙(처방 전에 재현). 등재문의 주장은 둘이다:
 *   ⓐ `probe351` D7 이 `eqslot:*` 3화면에서 `#wpnGrid` → `covers:tuto`(37px)를 낸다
 *   ⓑ 그런데 그 배너(`#tuto`)는 뒤의 06 장비 시트(`#eqw .eqp`)에 **이미 100% 덮여**
 *      2280·1600 **둘 다 보임 0%** 다 ⇒ D7 이 잰 것은 «안 보이는 요소와의 기하 겹침»
 *
 * 그래서 여기서는 화면마다 두 해상도에서 **내비 셋의 보임 %**(`cover351lib` 공용 자)와
 * **D7 이 세는 겹침 px** 를 나란히 찍는다. 둘이 갈리는 자리가 곧 476 이 말하는 유령이고,
 * 안 갈리는 자리(실재하는 D7)는 라벨이 붙으면 **안 되는** 자리다 — 음성 대조가 그 몫이다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, collectOpeners, drive } = require('./probe351lib');
const { COVER_SRC } = require('./cover351lib');

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
/* 기본 표본 — ⓐⓑ 의 3화면 + 실재하는 D7 자리(34 축복 띠가 탭바를 덮는다, 351 7회차 실측) +
   오버레이가 없는 음성 대조(탭 페이지·메인). */
const WANT = ['eqslot:weapon', 'eqslot:shield', 'eqslot:amulet', 'side:bless', 'tab:hero', 'side:quest'];

const SCAN = function (opt) {
  const app = document.getElementById('app');
  const cover = new Function('return (' + opt.coverSrc + ')')();
  const A = app.getBoundingClientRect();
  const vis = (el) => {
    const cs = getComputedStyle(el);
    return !(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0);
  };
  const clipped = (el) => {
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
  const nameOf = (el) => (el.id ? '#' + el.id
    : el.tagName.toLowerCase() + '.' + String(el.className || '').trim().split(/\s+/).slice(0, 2).join('.'));

  const navs = [];
  const tb = document.getElementById('tabbar');
  if (tb && vis(tb)) navs.push({ name: 'tabbar', el: tb });
  const pe = document.querySelector('.pedge');
  if (pe && vis(pe)) navs.push({ name: 'hud', el: pe });
  const tu = document.getElementById('tuto');
  if (tu && vis(tu)) navs.push({ name: 'tuto', el: tu });

  const out = [];
  for (const nav of navs) {
    const r = nav.el.getBoundingClientRect();
    const c = cover(nav.el, r);
    /* 그 내비를 «덮은» 상자들의 이름·겹침 px — D7 이 세는 것과 같은 문턱 */
    const by = [];
    for (const el of app.querySelectorAll('*')) {
      if (el === nav.el || el.contains(nav.el) || nav.el.contains(el)) continue;
      if (!vis(el) || el.classList.contains('dim')) continue;
      const cs = getComputedStyle(el);
      const m = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
      const parts = m ? m[1].split(',').map((s) => parseFloat(s)) : [];
      const alpha = m ? (parts.length > 3 ? parts[3] : 1) : 0;
      if (!(alpha >= 0.9 || cs.backgroundImage !== 'none')) continue;
      const d = clipped(el);
      const w = d.x2 - d.x1, h = d.y2 - d.y1;
      if (w < 300 || h < 200 || w * h < 120000) continue;
      const ov = Math.min(d.y2, r.bottom) - Math.max(d.y1, r.top);
      const ox = Math.min(d.x2, r.right) - Math.max(d.x1, r.left);
      if (ov > 2 && ox > 40) by.push({ el: nameOf(el), ov: Math.round(ov), ox: Math.round(ox) });
    }
    out.push({
      nav: nav.name,
      box: [Math.round(r.left - A.left), Math.round(r.top - A.top), Math.round(r.width), Math.round(r.height)],
      visPct: c.visPct, n: c.n, stub: c.stub, by,
    });
  }
  return { frameH: Math.round(A.height), navs: out };
};

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  try {
    let openers = await collectOpeners(browser);
    openers = openers.filter((o) => (ONLY ? o.label.includes(ONLY) : WANT.includes(o.label)));
    console.log(`[476] 화면 ${openers.length}개 × 2해상도`);
    for (const o of openers) {
      for (const H of [2280, 1600]) {
        const { ctx, page } = await fresh(browser, 1080, H);
        await drive(page, o);
        await settle(page);
        const r = await page.evaluate(SCAN, { coverSrc: COVER_SRC });
        await ctx.close();
        for (const n of r.navs) {
          rows.push({ label: o.label, H, ...n });
          console.log(`  ${o.label.padEnd(16)} ${H}  ${n.nav.padEnd(6)} 상자[${n.box.join(',')}] `
            + `보임 ${String(n.visPct).padStart(5)}%  덮은상자 ${n.n}`
            + (n.by.length ? ` — ${n.by.map((b) => `${b.el}(세로${b.ov}·가로${b.ox})`).join(' · ')}` : ''));
        }
      }
    }
  } finally { await browser.close(); }

  /* 판정 — 유령/실재를 라벨 없이 «값» 으로만 가른다 */
  console.log('\n[476] 요약 — «두 해상도 다 보임 0%» 인데 D7 겹침이 있는 자리 = 유령');
  const key = (r) => r.label + '|' + r.nav;
  const byKey = {};
  for (const r of rows) (byKey[key(r)] = byKey[key(r)] || {})[r.H] = r;
  let ghost = 0, real = 0;
  for (const k of Object.keys(byKey)) {
    const t = byKey[k][2280], s = byKey[k][1600];
    if (!t || !s) continue;
    const hasOv = (s.by.length > 0);
    if (!hasOv) continue;
    const gone = t.visPct <= 0.05 && s.visPct <= 0.05;
    if (gone) ghost++; else real++;
    console.log(`  ${gone ? '유령' : '실재'}  ${k.padEnd(24)} 보임 2280 ${t.visPct}% → 1600 ${s.visPct}%`);
  }
  console.log(`  유령 ${ghost} · 실재 ${real}`);
  process.exit(0);
})().catch((e) => { console.error('PROBE476 CRASH', e); process.exit(2); });
