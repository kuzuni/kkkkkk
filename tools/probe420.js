#!/usr/bin/env node
/* 420 프로브 — 33 재화 정보 팝업(`#ciw>.ci`) ↔ 89 유물 페이지 주 CTA(`#rwBasin` 「유물 소환」)의
 * «앵커가 둘» 충돌 재현.
 *
 * 실행: node tools/probe420.js [--frames 2280,1920,1800,1700,1600]
 *
 * 왜 이 자를 따로 두는가(338 규칙 — 처방 전에 재현):
 *   · `probe351` **D7** 의 «고정 내비» 목록은 `#tabbar`·`.pedge` 둘뿐이라 **페이지가 소유한
 *     주 행동 버튼**은 후보에 아예 없다(등재문이 짚은 그대로).
 *   · `probe351c` **E1** 은 «닿나» 를 재는데 `#ciw` 는 딤(`inset:0`)이라 2280 에서도 «닿아» 있다
 *     ⇒ 차분에서 소거된다(407 주석의 함정 그대로).
 *   · **407 이 이미 팝업을 100px 올렸다**(`#ciw` 하단 여백 클램프, 2026-08-29). 등재문의 실측
 *     (팝업 하단 1169 · 가림 128~134px)은 **그 수리 전 값**이므로 그대로 쓰면 안 된다.
 *     이 자는 «지금 트리» 의 값을 다시 낸다.
 *
 * 재는 것:
 *   [A] 팝업 상자 `.ci` ↔ 버튼 `#rwBasin` 의 실측 상자 · 세로/가로 겹침 px(프레임별)
 *   [B] 버튼 안 부품별 덮임 % — 라벨 `<b>유물 소환</b>` · 코스트 알약 `#rwCost` · 레드닷
 *   [C] 교차점 — 겹침이 0 을 넘기 시작하는 프레임 높이(이분 탐색)
 *   [D] 407 이 지금 얼마나 올려 두었는가(팝업 하변 ↔ `1801 - frameH` 클램프 검산)
 *
 * ⚠ 진입 서명: `#ciw@44` 와 `#relw@28` 이 **둘 다** 열려야 이 화면이다(등재문). 한쪽이라도
 *    빈칸이면 «안 열린 화면을 재고 결함 없음으로 읽는» 8·10회차 사고다 ⇒ 그때는 **던진다**.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, FILE } = require('./probe351lib');

const FRAMES = (() => {
  const i = process.argv.indexOf('--frames');
  if (i > 0) return process.argv[i + 1].split(',').map(Number);
  return [2280, 1920, 1800, 1741, 1700, 1600];
})();

/* 페이지 안에서 재는 자 — 상자 둘과 «덮인 부품 %» */
const MEASURE = function () {
  const app = document.getElementById('app');
  const ci = document.querySelector('#ciw.on .ci');
  const btn = document.getElementById('rwBasin');
  const vis = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  if (!app || !vis(ci) || !vis(btn)) return { ok: false, ci: vis(ci), btn: vis(btn) };
  const A = app.getBoundingClientRect();
  const sc = A.width / 1080 || 1;                 /* 프레임 스케일 — 좌표는 언제나 1080 기준 px */
  const rel = (r) => ({
    x1: Math.round(((r.left - A.left) / sc) * 10) / 10, x2: Math.round(((r.right - A.left) / sc) * 10) / 10,
    y1: Math.round(((r.top - A.top) / sc) * 10) / 10, y2: Math.round(((r.bottom - A.top) / sc) * 10) / 10,
  });
  const rc = ci.getBoundingClientRect(), rb = btn.getBoundingClientRect();
  const ovY = Math.min(rc.bottom, rb.bottom) - Math.max(rc.top, rb.top);
  const ovX = Math.min(rc.right, rb.right) - Math.max(rc.left, rb.left);

  /* 부품이 팝업 상자에 덮인 % — 팝업은 불투명(검정 테 + 갈색 링 + 크림 본문)이라
     겹친 만큼이 그대로 «안 읽히는 만큼» 이다. */
  const covPct = (el) => {
    if (!vis(el)) return null;
    const r = el.getBoundingClientRect();
    const ix = Math.max(0, Math.min(r.right, rc.right) - Math.max(r.left, rc.left));
    const iy = Math.max(0, Math.min(r.bottom, rc.bottom) - Math.max(r.top, rc.top));
    return { rect: rel(r), pct: Math.round(1000 * (ix * iy) / (r.width * r.height)) / 10 };
  };

  /* 라벨은 «상자» 가 아니라 «글자 잉크» 로 잰다(Range) — `.rw-basin>b` 는 left:0;right:0 라
     상자가 버튼 전폭이고, 그러면 덮임 %가 실제 글자와 무관해진다. */
  let label = null;
  const b = btn.querySelector('b');
  if (b && b.firstChild) {
    const rg = document.createRange();
    rg.selectNodeContents(b);
    const r = rg.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      const ix = Math.max(0, Math.min(r.right, rc.right) - Math.max(r.left, rc.left));
      const iy = Math.max(0, Math.min(r.bottom, rc.bottom) - Math.max(r.top, rc.top));
      label = { rect: rel(r), pct: Math.round(1000 * (ix * iy) / (r.width * r.height)) / 10 };
    }
  }

  const parts = [];
  for (const el of btn.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const c = covPct(el);
    if (c) parts.push({ sel: el.className || el.tagName.toLowerCase(), id: el.id || '', ...c });
  }
  const cost = covPct(document.getElementById('rwCost'));
  const cap = covPct(document.querySelector('#relw .rw-cap'));

  return {
    ok: true,
    frameH: Math.round(A.height / sc),
    ci: rel(rc), btn: rel(rb),
    ovY: Math.round((ovY / sc) * 10) / 10, ovX: Math.round((ovX / sc) * 10) / 10,
    label, cost, cap, parts,
    sign: {                                  /* 진입 서명 — 둘 다 켜져야 이 화면이다 */
      ciw: !!document.querySelector('#ciw.on'),
      relw: !!document.querySelector('#relw.on'),
    },
  };
};

/* 89 유물 페이지를 열고 그 안 «유물조각» 알약을 눌러 33 팝업을 연다.
   ⚠ 알약은 `#relw` 안 `.pcb` 에만 있어 메인 화면에서는 상자가 0×0 이다(probe351lib 10회차 주석).
      «표» 로 탭을 적지 않고 **제품에게 묻는다** — 탭을 하나씩 눌러 실제로 그려지는 곳을 찾는다. */
async function openRelicCur(page) {
  const SEL = '[data-cur="relic"]';
  const drawn = () => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }, SEL).catch(() => false);

  if (!await drawn()) {
    const tabs = await page.$$eval('.tab[data-t]', (els) => els.map((e) => e.dataset.t)).catch(() => []);
    let host = null;
    for (const t of tabs) {
      await page.click(`.tab[data-t="${t}"]`, { timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(320);
      if (await drawn()) { host = t; break; }
    }
    if (!host) throw new Error('[420] `[data-cur="relic"]` 이 어느 탭에서도 안 그려진다 — 진입 경로 확인');
  }
  await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, SEL);
  await settle(page);
  return await page.evaluate(() => !!document.querySelector('#ciw.on') && !!document.querySelector('#relw.on'));
}

/* 음성 대조 — 420 클램프만 무효로 돌린다(`padding-bottom` 을 407 값으로 되돌린다).
   되돌림 시험의 «수리 전» 트리를 따로 체크아웃하지 않고도 같은 그림을 얻는다. */
const UNPATCH = () => {
  const st = document.createElement('style');
  st.id = 'probe420-unpatch';
  st.textContent = '#relw.on ~ #ciw{padding-bottom:calc(234px + max(0px, 1801px - var(--frameh, 2280px)))}';
  document.head.appendChild(st);
};

/* #relw 안에서 팝업에 덮인 부품 — «CTA 만 보던 자를 페이지 전체로 넓힌» 축.
   처방이 팝업을 위로 올리므로 «위쪽에 새 피해자가 생기지 않았나» 를 같이 본다. */
const PARTS_RELW = function () {
  const app = document.getElementById('app');
  const ci = document.querySelector('#ciw.on .ci');
  const relw = document.getElementById('relw');
  if (!app || !ci || !relw) return [];
  const A = app.getBoundingClientRect(), sc = A.width / 1080 || 1;
  const rc = ci.getBoundingClientRect();
  const out = [];
  for (const el of relw.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 4 && r.height > 4)) continue;
    const ix = Math.max(0, Math.min(r.right, rc.right) - Math.max(r.left, rc.left));
    const iy = Math.max(0, Math.min(r.bottom, rc.bottom) - Math.max(r.top, rc.top));
    const pct = Math.round(1000 * (ix * iy) / (r.width * r.height)) / 10;
    if (pct <= 0) continue;
    out.push({
      sel: el.id ? '#' + el.id : '.' + String(el.className || el.tagName.toLowerCase()).split(' ')[0],
      pct,
      y1: Math.round(((r.top - A.top) / sc) * 10) / 10,
      y2: Math.round(((r.bottom - A.top) / sc) * 10) / 10,
    });
  }
  return out.sort((a, b) => b.pct - a.pct);
};

async function measureAt(browser, h, opts) {
  const { ctx, page } = await fresh(browser, 1080, h);
  try {
    await settle(page);
    if (opts && opts.unpatch) await page.evaluate(UNPATCH);
    const opened = await openRelicCur(page);
    if (!opened) return { h, skip: '진입 서명 미달(ciw/relw 중 하나가 안 열렸다)' };
    const m = await page.evaluate(MEASURE);
    if (!m.ok) return { h, skip: `상자 없음(ci=${m.ci} btn=${m.btn})` };
    const relwParts = await page.evaluate(PARTS_RELW);
    return { h, ...m, relwParts };
  } finally { await ctx.close(); }
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  let bad = 0, tested = 0, cross = null;
  try {
    for (const h of FRAMES) {
      const r = await measureAt(browser, h);
      rows.push(r);
      if (r.skip) continue;
      tested++;
      if (r.ovY > 0 && r.ovX > 0) bad++;
    }

    /* [C] 교차점 이분 탐색 — 겹침이 처음 0 을 넘는 프레임 높이 */
    let lo = 1600, hi = 2280;
    const ovAt = async (h) => {
      const r = await measureAt(browser, h);
      return r.skip ? null : (r.ovY > 0 && r.ovX > 0 ? r.ovY : 0);
    };
    const loOv = await ovAt(lo), hiOv = await ovAt(hi);
    if (loOv > 0 && hiOv === 0) {
      for (let i = 0; i < 9; i++) {
        const mid = Math.round((lo + hi) / 2);
        const o = await ovAt(mid);
        if (o === null) break;
        if (o > 0) lo = mid; else hi = mid;
      }
      cross = { lo, hi };
    }
  } finally { await browser.close(); }

  console.log('[420] 33 재화 정보 팝업(.ci) ↔ 89 유물 주 CTA(#rwBasin) — 프레임별 겹침');
  console.log('  프레임 | 팝업 y          | 버튼 y          | 세로겹침 | 가로겹침 | 라벨 덮임%');
  for (const r of rows) {
    if (r.skip) { console.log(`  ${String(r.h).padEnd(6)} | — ${r.skip}`); continue; }
    const ov = r.ovY > 0 && r.ovX > 0 ? `${String(r.ovY).padStart(7)} ` : '      —  ';
    console.log(`  ${String(r.h).padEnd(6)} | ${String(r.ci.y1).padStart(6)}..${String(r.ci.y2).padEnd(7)} | `
      + `${String(r.btn.y1).padStart(6)}..${String(r.btn.y2).padEnd(7)} | ${ov}| ${String(r.ovX).padStart(7)}  | `
      + `${r.label ? r.label.pct + '%' : '—'}`);
  }

  for (const r of rows) {
    if (r.skip || !(r.ovY > 0 && r.ovX > 0)) continue;
    console.log(`\n  [B] @${r.h} — 버튼 부품 덮임`);
    if (r.label) console.log(`      ${String(r.label.pct).padStart(5)}%  라벨 잉크 «유물 소환»   `
      + `y ${r.label.rect.y1}..${r.label.rect.y2}  x ${r.label.rect.x1}..${r.label.rect.x2}`);
    for (const p of r.parts.filter((p) => p.pct > 0).sort((a, b) => b.pct - a.pct)) {
      console.log(`      ${String(p.pct).padStart(5)}%  ${(p.id ? '#' + p.id : '.' + p.sel).padEnd(22)}`
        + ` y ${p.rect.y1}..${p.rect.y2}  x ${p.rect.x1}..${p.rect.x2}`);
    }
    if (r.cost) console.log(`      ${String(r.cost.pct).padStart(5)}%  #rwCost(형제)          `
      + `y ${r.cost.rect.y1}..${r.cost.rect.y2}`);
    if (r.cap) console.log(`      ${String(r.cap.pct).padStart(5)}%  .rw-cap(안내문)        `
      + `y ${r.cap.rect.y1}..${r.cap.rect.y2}`);
  }

  /* [D] 407 클램프 검산 — 팝업 하변이 프레임과 어떤 식으로 붙어 있는가 */
  console.log('\n  [D] 407 클램프 검산 — 팝업 하변 vs (frameH − 531)');
  for (const r of rows) {
    if (r.skip) continue;
    const pred = r.h <= 1801 ? r.h - 531 : 369.5 + r.h / 2;
    console.log(`      ${String(r.h).padEnd(6)} 하변 ${String(r.ci.y2).padStart(7)}  예측 ${String(Math.round(pred * 10) / 10).padStart(7)}`
      + `  Δ ${Math.round((r.ci.y2 - pred) * 10) / 10}`);
  }

  if (cross) console.log(`\n  [C] 교차점 — 겹침이 처음 생기는 프레임 높이: ${cross.hi} 이하(≤${cross.lo} 겹침 · ≥${cross.hi} 0)`);
  else console.log('\n  [C] 교차점 — 1600·2280 이 같은 상태라 이분 탐색 생략');

  /* [E] 음성 대조 — 1600 에서 클램프를 407 값으로 되돌린 판과 나란히 놓는다.
     ① 겹침이 되살아나는가(되돌림 시험의 재료) ② 처방이 «위쪽에 새 피해자» 를 만들지 않았는가 */
  {
    const browser2 = await launch(chromium);
    let now, old;
    try {
      now = await measureAt(browser2, 1600, null);
      old = await measureAt(browser2, 1600, { unpatch: true });
    } finally { await browser2.close(); }
    if (!now.skip && !old.skip) {
      console.log('\n  [E] 1600 음성 대조 — «지금» vs «420 클램프를 407 값으로 되돌린 판»');
      console.log(`      팝업 하변   지금 ${now.ci.y2}  ↔ 되돌림 ${old.ci.y2}   (Δ ${Math.round((old.ci.y2 - now.ci.y2) * 10) / 10})`);
      console.log(`      버튼 겹침   지금 ${now.ovY > 0 ? now.ovY : 0}     ↔ 되돌림 ${old.ovY > 0 ? old.ovY : 0}`);
      const key = new Map();
      for (const p of old.relwParts || []) key.set(p.sel + '@' + p.y1, { old: p.pct, now: 0, p });
      for (const p of now.relwParts || []) {
        const k = p.sel + '@' + p.y1;
        if (key.has(k)) key.get(k).now = p.pct; else key.set(k, { old: 0, now: p.pct, p });
      }
      console.log('      #relw 부품 덮임 % (되돌림 → 지금)');
      for (const [, v] of [...key].sort((a, b) => (b[1].now - b[1].old) - (a[1].now - a[1].old))) {
        const arrow = v.now > v.old ? '↑ 새로 덮인다' : (v.now < v.old ? '↓ 회수' : '= 불변');
        console.log(`        ${v.p.sel.padEnd(16)} y ${String(v.p.y1).padStart(7)}..${String(v.p.y2).padEnd(7)}`
          + ` ${String(v.old).padStart(6)}% → ${String(v.now).padStart(6)}%  ${arrow}`);
      }
    }
  }

  console.log(`\n[420] 표본 ${tested}건 · 겹침 ${bad}건 · 건너뜀 ${rows.filter((r) => r.skip).length}건`);
  process.exit(0);
})().catch((e) => { console.error('PROBE420 CRASH', e); process.exit(2); });
