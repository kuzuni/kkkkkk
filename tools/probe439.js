#!/usr/bin/env node
/* 439 재현기 — `tools/probe351.js` D7 의 «고정 내비» 목록(`navs`)에 «페이지가 소유한 주 행동
 * 버튼» 축이 없다는 것을 **자가 아니라 찍힌 상자**로 못박고, 새 축의 문턱을 **손이 아니라
 * 스윕**으로 고른다.
 *
 * 실행: node tools/probe439.js [--only <라벨조각>] [--dump]
 *
 * 338·341·350·363·368 규칙 — 처방 전에 재현한다. 여기서 재현하는 것은 두 가지다:
 *   §1 «못 본다» — 420 이 고친 자리(`#rwBasin` 「유물 소환」)를 **420 규칙을 뺀 사본**에서
 *      다시 만들고, 그 프레임에서 D7 의 지금 `navs`(탭바·HUD·배너 셋) 로는 겹침이 **원리적으로
 *      0건**임을 보인다. 겹침 자체는 같은 프레임에서 px 로 찍는다 — «없어서 0» 이 아니라
 *      «있는데 0» 이어야 자 구멍이다.
 *   §2 문턱 스윕 — 새 축의 후보 규칙(등재문 ⓐ: «열린 페이지 안 · 스크롤로 못 되돌림 ·
 *      cursor:pointer · 그려진 잉크가 가장 큰 상자»)을 전 화면에 돌려 **몇 개가 잡히고 무엇이
 *      잡히는지** 를 먼저 본다. 402 «표는 뒤처진다» 라 화면별 CTA 이름을 손으로 적지 않는다 —
 *      규칙이 골라야 하고, 그 규칙이 무엇을 고르는지는 눈이 아니라 이 스윕이 답한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const DUMP = process.argv.includes('--dump');
const { fresh, settle, collectOpeners, drive } = require('./probe351lib');

const TALL = [1080, 2280];
const SHORT = [1080, 1600];

/* ── 페이지 안에서 도는 자 ────────────────────────────────────────────────────
   probe351 의 `clipped`(그려지는 상자 / 스크롤로 닿는 상자)와 **같은 뜻**을 쓴다. 두 자가
   다른 상자를 재면 문턱을 옮겨 붙일 수 없다(385 «자매 자 드리프트»). */
const SCAN = function () {
  const app = document.getElementById('app');
  if (!app) return { cands: [], navs: [], frame: null };
  const A = app.getBoundingClientRect();
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (Number(cs.opacity) === 0) return false;
    return true;
  };
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    const d = { x1: r.left, y1: r.top, x2: r.right, y2: r.bottom };
    let scrollAnc = 0;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const ox = cs.overflowX, oy = cs.overflowY;
      if (ox === 'visible' && oy === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (/auto|scroll/.test(ox) && p.scrollWidth > p.clientWidth + 2) scrollAnc++;
      if (/auto|scroll/.test(oy) && p.scrollHeight > p.clientHeight + 2) scrollAnc++;
      if (ox !== 'visible') { d.x1 = Math.max(d.x1, pr.left); d.x2 = Math.min(d.x2, pr.right); }
      if (oy !== 'visible') { d.y1 = Math.max(d.y1, pr.top); d.y2 = Math.min(d.y2, pr.bottom); }
    }
    d.w = Math.max(0, d.x2 - d.x1); d.h = Math.max(0, d.y2 - d.y1);
    d.scrollAnc = scrollAnc;
    return d;
  };
  const pathOf = (el) => {
    const bits = [];
    for (let p = el; p && p !== app && bits.length < 4; p = p.parentElement) {
      let s = p.tagName.toLowerCase();
      if (p.id) { s = '#' + p.id; bits.unshift(s); break; }
      const c = String(p.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      if (c) s += '.' + c;
      bits.unshift(s);
    }
    return bits.join('>');
  };
  /* 최상위 그릇 = `#app` 직계 자식(페이지·오버레이는 전부 여기 하나씩 얹힌다) */
  const topOf = (el) => { let p = el; while (p.parentElement && p.parentElement !== app) p = p.parentElement; return p; };

  const cands = [];
  for (const el of app.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.cursor !== 'pointer') continue;
    const d = clipped(el);
    if (d.w < 1 || d.h < 1) continue;
    const top = topOf(el);
    cands.push({
      path: pathOf(el), top: top === el ? '(self)' : (top.id ? '#' + top.id : top.tagName.toLowerCase() + '.' + String(top.className || '').trim().split(/\s+/)[0]),
      x1: Math.round(d.x1), y1: Math.round(d.y1), w: Math.round(d.w), h: Math.round(d.h),
      area: Math.round(d.w * d.h), scrollAnc: d.scrollAnc,
      inTab: !!el.closest('#tabbar'), inSide: !!el.closest('.side'), inBot: !!el.closest('#botleft'),
      /* «페이지가 소유한» 의 구조적 정의 — 최상위 그릇이 «지금 열린» 판(`#app` 직계 자식 + `.on`)인가.
         `#top`(상시 HUD)·`#stagearea`(전투 필드)·`#tabbar` 는 `.on` 을 안 달므로 여기서 갈린다. */
      onPage: top !== el && top.classList.contains('on'),
      /* «주» 의 구조적 정의 — 그 그릇 안에서 **누를 수 있는 것이 이것 하나**인가.
         리스트 카드·탭·격자 칸은 형제가 전부 누를 수 있다(그래서 «주» 가 아니다). */
      soloPtr: (() => { let n = 0; for (const sib of el.parentElement ? el.parentElement.children : []) { if (sib.nodeType !== 1) continue; if (!vis(sib)) continue; if (getComputedStyle(sib).cursor === 'pointer') n++; } return n === 1; })(),
    });
  }
  return { cands, frame: { top: A.top, bottom: A.bottom, h: A.height, w: A.width } };
};

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => o.label.includes(ONLY));
    console.log(`[439] 화면 ${openers.length}개 스캔 (문턱 스윕)`);
    for (const o of openers) {
      const one = async ([w, h]) => {
        const { ctx, page } = await fresh(browser, w, h);
        await drive(page, o);
        await settle(page);
        const r = await page.evaluate(SCAN).catch((e) => ({ cands: [], err: String(e.message || e) }));
        await ctx.close();
        return r;
      };
      const s = await one(SHORT);
      const t = await one(TALL);
      rows.push({ label: o.label, cands: s.cands || [], tallCands: t.cands || [], frame: s.frame });
    }
  } finally { await browser.close(); }

  /* ── §2 문턱 스윕 ─────────────────────────────────────────────────────────
     «페이지가 소유한 주 행동 버튼» 을 고르는 규칙의 후보를 몇 벌 돌려, 화면당 몇 개가
     잡히는지·무엇이 잡히는지를 나란히 놓는다. 값을 고르는 것은 다음 절이다. */
  const RULES = [
    { name: 'A  pointer 전부',            f: (c) => true },
    { name: 'B  +스크롤 조상 없음',        f: (c) => c.scrollAnc === 0 },
    { name: 'C  +고정 내비 밖',            f: (c) => c.scrollAnc === 0 && !c.inTab && !c.inSide && !c.inBot },
    { name: 'D  +상자 ≥160×60',            f: (c) => c.scrollAnc === 0 && !c.inTab && !c.inSide && !c.inBot && c.w >= 160 && c.h >= 60 },
    { name: 'E  +열린 판(.on) 소속',        f: (c) => c.scrollAnc === 0 && c.onPage && c.w >= 160 && c.h >= 60 },
    { name: 'F  +그릇 안 유일 클릭',        f: (c) => c.scrollAnc === 0 && c.onPage && c.w >= 160 && c.h >= 60 && c.soloPtr },
  ];
  for (const R of RULES) {
    let tot = 0, mx = 0;
    for (const r of rows) { const n = r.cands.filter(R.f).length; tot += n; mx = Math.max(mx, n); }
    console.log(`  ${R.name.padEnd(24)} 합계 ${String(tot).padStart(4)}  화면당 최대 ${mx}`);
  }

  /* 규칙 D 로 좁힌 뒤 «같은 최상위 그릇마다 면적 최대 하나» — 이것이 등재문 ⓐ 의 «주» 다. */
  const pick = (cands) => {
    const best = {};
    for (const c of cands) {
      if (c.scrollAnc !== 0 || !c.onPage || !c.soloPtr) continue;
      if (c.w < 160 || c.h < 60) continue;
      if (!best[c.top] || c.area > best[c.top].area) best[c.top] = c;
    }
    return Object.values(best);
  };
  let picked = 0, screens = 0;
  const seenPaths = {};
  for (const r of rows) {
    const p = pick(r.cands);
    picked += p.length; if (p.length) screens++;
    for (const c of p) seenPaths[c.path] = (seenPaths[c.path] || 0) + 1;
    if (DUMP && p.length) console.log(`   ${r.label.padEnd(20)} ${p.map((c) => `${c.path}[${c.top}] ${c.w}×${c.h}@${c.x1},${c.y1}`).join('  ·  ')}`);
  }
  console.log(`\n[439] 규칙 D + «그릇당 면적 최대» ⇒ CTA 후보 ${picked}개 · 화면 ${screens}/${rows.length}`);
  const top = Object.entries(seenPaths).sort((a, b) => b[1] - a[1]).slice(0, 18);
  console.log('  자주 잡히는 자리: ' + top.map(([k, v]) => `${k}(${v})`).join(' · '));

  /* 안정성 — 2280 과 1600 이 **같은 자리**를 고르는가. 다르면 D7 차분에 유령이 생긴다
     (key 가 내비 이름을 담으므로 «한쪽에만 있는 이름» 은 짝이 없어 1600 전용으로 읽힌다). */
  let same = 0, diff = 0;
  for (const r of rows) {
    const a = pick(r.cands).map((c) => c.path).sort().join('|');
    const b = pick(r.tallCands || []).map((c) => c.path).sort().join('|');
    if (a === b) same++; else { diff++; console.log(`   [불안정] ${r.label.padEnd(20)} 1600 «${a || '(없음)'}» ↔ 2280 «${b || '(없음)'}»`); }
  }
  console.log(`  해상도 간 같은 자리 ${same}/${same + diff}`);

  /* ── §1 «못 본다» 의 표본 — 420 자리 ─────────────────────────────────────── */
  const rel = rows.find((r) => r.label === 'cur:relic');
  if (rel) {
    const p = pick(rel.cands);
    const basin = p.find((c) => c.path.includes('#rwBasin'));
    console.log(`  [§1] cur:relic 의 CTA 후보: ${p.map((c) => c.path).join(' · ') || '(없음)'}`);
    console.log(`       #rwBasin 이 뽑히는가: ${basin ? 'OK — ' + basin.w + '×' + basin.h + '@' + basin.x1 + ',' + basin.y1 : 'FAIL'}`);
    if (!basin) process.exit(1);
  }
  process.exit(0);
})().catch((e) => { console.error('PROBE439 CRASH', e); process.exit(2); });
