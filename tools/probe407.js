#!/usr/bin/env node
/* 407 프로브 — 33 재화 정보 팝업(`#ciw>.ci`) ↔ 미션 배너(`#tuto`) 의 «앵커가 둘» 충돌 재현.
 *
 * 실행: node tools/probe407.js [--frames 2280,1900,1756,1600]
 *
 * 왜 이 자를 따로 두는가(338 규칙 — 처방 전에 재현):
 *   등재문은 «1600 에서 세로 겹침 +71px» 이라고 적었지만, 351 의 기존 자 둘은 이 자리를
 *   **원리적으로 못 낸다**:
 *     · `probe351` **D7** 은 «불투명 상자가 고정 내비를 덮는다» 를 재는데, 그 `navs` 목록이
 *       `#tabbar` 와 `.pedge` **둘뿐**이다 — 미션 배너는 목록에 없다.
 *     · `probe351c` **E1** 은 «닿나» 를 재는데, `#ciw` 는 딤(`inset:0`)이라 배너는
 *       **2280 에서도 안 닿는다** ⇒ 차분에서 소거된다(D7 주석이 적어 둔 그 함정 그대로).
 *   그래서 이 자는 «닿음» 도 «차분» 도 아니라 **두 상자의 겹침 px 를 프레임별로 직접 잰다.**
 *
 * 재는 것:
 *   [A] 팝업 상자 `.ci` 와 배너 `#tuto` 의 실측 상자 · 세로/가로 겹침 px (프레임별)
 *   [B] 배너 헤더 글자줄(`#tuto .tt`)이 팝업 상자에 **덮인 %** — 3인이 «`]` 한 글자만 남는다» 로 짚은 축
 *   [C] 교차점 — 겹침이 0 을 넘기 시작하는 프레임 높이(이분 탐색)
 *
 * 표본 화면은 `cur:gold`·`cur:dia` 둘이다(`cur:relic` 은 팝업이 안 뜨는 표본 — 등재문 확인).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, FILE } = require('./probe351lib');

const FRAMES = (() => {
  const i = process.argv.indexOf('--frames');
  if (i > 0) return process.argv[i + 1].split(',').map(Number);
  return [2280, 1920, 1800, 1756, 1700, 1600];
})();

/* 페이지 안에서 재는 자 — 상자 둘과 «덮인 글자 %» */
const MEASURE = function () {
  const app = document.getElementById('app');
  const ci = document.querySelector('#ciw.on .ci');
  const tuto = document.getElementById('tuto');
  const vis = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0;
  };
  if (!app || !vis(ci) || !vis(tuto)) return { ok: false, ci: vis(ci), tuto: vis(tuto) };
  const A = app.getBoundingClientRect();
  const rel = (r) => ({
    x1: Math.round((r.left - A.left) * 10) / 10, x2: Math.round((r.right - A.left) * 10) / 10,
    y1: Math.round((r.top - A.top) * 10) / 10, y2: Math.round((r.bottom - A.top) * 10) / 10,
  });
  const rc = ci.getBoundingClientRect(), rt = tuto.getBoundingClientRect();
  const ovY = Math.min(rc.bottom, rt.bottom) - Math.max(rc.top, rt.top);
  const ovX = Math.min(rc.right, rt.right) - Math.max(rc.left, rt.left);

  /* [B] 배너 헤더 글자줄이 팝업 상자에 덮인 % — 잉크 상자의 면적 교차로 잰다.
     팝업은 불투명(#56443A 테 + 크림 본문)이라 겹친 만큼이 그대로 «안 읽히는 만큼» 이다. */
  const covPct = (sel) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!vis(el)) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    const ix = Math.max(0, Math.min(r.right, rc.right) - Math.max(r.left, rc.left));
    const iy = Math.max(0, Math.min(r.bottom, rc.bottom) - Math.max(r.top, rc.top));
    return { rect: rel(r), pct: Math.round(1000 * (ix * iy) / (r.width * r.height)) / 10 };
  };

  /* 배너 안의 «보이는 부품» 을 전부 훑어 덮인 %를 낸다 — 3인이 «헤더가 86~91% 가려» 로 짚은
     자리가 정확히 어느 부품인지는 등재문에 안 적혀 있다. 자가 고르게 두지 않고 전수로 낸다. */
  const parts = [];
  for (const el of tuto.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const c = covPct(el);
    if (c) parts.push({ sel: el.className || el.tagName.toLowerCase(), id: el.id || '', ...c });
  }

  return {
    ok: true,
    frameH: Math.round(A.height),
    ci: rel(rc), tuto: rel(rt),
    ovY: Math.round(ovY * 10) / 10, ovX: Math.round(ovX * 10) / 10,
    tt: covPct('#tuto .tt'), tinfo: covPct('#tuto .tinfo'), trew: covPct('#tuto .trew'),
    parts,
  };
};

/* 재화 아이콘을 눌러 33 팝업을 연다 — `cur:gold` 계열 오프너와 같은 경로다. */
async function openCur(page, cur) {
  const sel = `[data-cur="${cur}"]`;
  const el = await page.$(sel);
  if (!el) return false;
  await el.click({ force: true }).catch(() => {});
  await settle(page);
  return await page.evaluate(() => !!document.querySelector('#ciw.on'));
}

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  let bad = 0, tested = 0;
  try {
    for (const cur of ['gold', 'dia', 'relic']) {
      for (const h of FRAMES) {
        const { ctx, page } = await fresh(browser, 1080, h);
        await settle(page);
        const opened = await openCur(page, cur);
        if (!opened) { rows.push({ cur, h, skip: '팝업이 안 뜬다' }); await ctx.close(); continue; }
        const m = await page.evaluate(MEASURE);
        await ctx.close();
        if (!m.ok) { rows.push({ cur, h, skip: `상자 없음(ci=${m.ci} tuto=${m.tuto})` }); continue; }
        tested++;
        if (m.ovY > 0 && m.ovX > 0) bad++;
        rows.push({ cur, h, ...m });
      }
    }
  } finally { await browser.close(); }

  console.log('[407] 33 재화 정보 팝업 ↔ 미션 배너 — 프레임별 겹침');
  console.log('  화면   프레임 | 팝업 y        | 배너 y        | 세로겹침 | 가로겹침 | 헤더 덮임%');
  for (const r of rows) {
    if (r.skip) { console.log(`  ${r.cur.padEnd(6)} ${String(r.h).padEnd(6)} | — ${r.skip}`); continue; }
    const ov = r.ovY > 0 && r.ovX > 0 ? `${String(r.ovY).padStart(7)} ` : `      —  `;
    console.log(`  ${r.cur.padEnd(6)} ${String(r.h).padEnd(6)} | ${String(r.ci.y1).padStart(6)}..${String(r.ci.y2).padEnd(6)} | `
      + `${String(r.tuto.y1).padStart(6)}..${String(r.tuto.y2).padEnd(6)} | ${ov}| ${String(r.ovX).padStart(7)}  | `
      + `${r.tt ? r.tt.pct + '%' : '—'}`);
  }
  /* 부품별 덮임 — 겹침이 실제로 난 프레임만 편다 */
  for (const r of rows) {
    if (r.skip || !(r.ovY > 0 && r.ovX > 0) || !r.parts) continue;
    const hit = r.parts.filter((p) => p.pct > 0).sort((a, b) => b.pct - a.pct);
    if (!hit.length) continue;
    console.log(`\n  [B] ${r.cur} @${r.h} — 배너 부품 덮임`);
    for (const p of hit) {
      console.log(`      ${String(p.pct).padStart(5)}%  ${(p.id ? '#' + p.id : '.' + p.sel).padEnd(22)}`
        + ` y ${p.rect.y1}..${p.rect.y2}  x ${p.rect.x1}..${p.rect.x2}`);
    }
  }
  const skipped = rows.filter((r) => r.skip).length;
  console.log(`\n[407] 표본 ${tested}건 · 겹침 ${bad}건 · 팝업 없음 ${skipped}건`);
  process.exit(0);
})().catch((e) => { console.error('PROBE407 CRASH', e); process.exit(2); });
