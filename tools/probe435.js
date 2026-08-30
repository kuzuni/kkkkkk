#!/usr/bin/env node
/* 435 재현 — `probe351.js --selftest`(D2 축의 되돌림 시험)이 **한 번도 빨개진 적이 없다**.
 *
 * 실행: node tools/probe435.js [--only <라벨조각>]
 *
 * 왜 프로브를 먼저 두는가(338·341·350·363·368 규칙): 등재문의 가설을 처방 전에 **찍힌 값**으로
 * 확인하거나 기각한다. 여기서 묻는 것은 딱 하나 —
 *   «심은 자식이 판정 시점까지 살아 있는가».
 *
 * 두 순서를 같은 화면·같은 프레임에서 나란히 잰다:
 *   [SPLIT] 옛 순서 — 주입 `page.evaluate` 한 번 · 판정 `page.evaluate` 또 한 번 (probe351 현행)
 *   [ATOMIC] 원자   — 한 `evaluate` 안에서 심자마자 잰다 (처방 ⓐ)
 *
 * ⚠ 이 자는 «제품» 을 재지 않는다. 제품은 멀쩡하다(432 의 실재 넘침 60px 을 D2 가 정확히 잡았다).
 *    재는 것은 **자의 시험이 성립하는가** 다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { fresh, settle, collectOpeners, drive, SHORT } = require('./probe351lib');

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();

/* probe351 의 주입 규칙과 **같은 조건**으로 대상을 고른다(«overflow-x:hidden · 40px 이상» 앞 2개). */
const PICK = function () {
  const app = document.getElementById('app');
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
  const out = [];
  window.__p435 = [];
  for (const el of app.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.overflowX !== 'hidden' || cs.display === 'none') continue;
    if (el.clientWidth < 40 || el.clientHeight < 40) continue;
    window.__p435.push(el);
    out.push({ path: pathOf(el), cw: el.clientWidth, sw: el.scrollWidth, html: (el.innerHTML || '').slice(0, 40) });
    if (out.length >= 2) break;
  }
  return out;
};

/* 심는다 — probe351 현행과 같은 자식(`<s>` 폭 = 그릇 + 400). */
const INJECT = function () {
  const out = [];
  for (const el of (window.__p435 || [])) {
    const s = document.createElement('s');
    s.className = 'p435';
    s.style.cssText = 'display:block;width:' + (el.clientWidth + 400) + 'px;height:4px';
    el.appendChild(s);
    out.push({ cw: el.clientWidth, sw: el.scrollWidth, d2: el.scrollWidth > el.clientWidth + 2, hasS: !!el.querySelector('s.p435') });
  }
  return out;
};

/* 다시 잰다 — **다음 라운드트립**에서. */
const REMEASURE = function () {
  return (window.__p435 || []).map((el) => ({
    cw: el.clientWidth, sw: el.scrollWidth,
    d2: el.scrollWidth > el.clientWidth + 2,
    hasS: !!el.querySelector('s.p435'),
    html: (el.innerHTML || '').slice(0, 40),
  }));
};

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  try {
    let openers = await collectOpeners(browser);
    if (ONLY) openers = openers.filter((o) => o.label.includes(ONLY));
    else openers = openers.filter((o) => ['tab:box', 'side:quest', 'menu:bag'].includes(o.label));
    console.log(`[435] 화면 ${openers.length}개 × 1600 · 두 순서 대조\n`);

    for (const o of openers) {
      const { ctx, page } = await fresh(browser, ...SHORT);
      await drive(page, o);
      await settle(page);
      const picked = await page.evaluate(PICK);
      const injected = await page.evaluate(INJECT);            /* evaluate #1 */
      const after = await page.evaluate(REMEASURE);            /* evaluate #2 = SCAN 시점 */
      /* [ATOMIC] — 같은 evaluate 안에서 심고 바로 잰다(다시 심는다: 위에서 심은 것은 이미 지워졌다) */
      const atomic = await page.evaluate(() => {
        const out = [];
        for (const el of (window.__p435 || [])) {
          const s = document.createElement('s');
          s.className = 'p435b';
          s.style.cssText = 'display:block;width:' + (el.clientWidth + 400) + 'px;height:4px';
          el.appendChild(s);
          out.push({ cw: el.clientWidth, sw: el.scrollWidth, d2: el.scrollWidth > el.clientWidth + 2, hasS: !!el.querySelector('s.p435b') });
        }
        return out;
      });
      await ctx.close();

      console.log(`  ${o.label}  — 주입 대상 ${picked.length}개`);
      picked.forEach((p, i) => {
        const inj = injected[i] || {}, af = after[i] || {}, at = atomic[i] || {};
        console.log(`    ${p.path.padEnd(28)} client ${p.cw}`);
        console.log(`      [SPLIT ] 심은 직후 scrollW ${p.sw} → ${inj.sw} · D2 ${inj.d2} · <s> ${inj.hasS}`);
        console.log(`               다음 라운드트립  scrollW ${af.sw} · D2 ${af.d2} · <s> ${af.hasS}`
          + `  innerHTML «${(p.html || '').trim()}» → «${(af.html || '').trim()}»`);
        console.log(`      [ATOMIC] 한 evaluate 안   scrollW ${at.sw} · D2 ${at.d2} · <s> ${at.hasS}`);
        rows.push({ label: o.label, path: p.path, splitD2: !!inj.d2, keptD2: !!af.d2, keptS: !!af.hasS, atomicD2: !!at.d2 });
      });
      console.log('');
    }
  } finally { await browser.close(); }

  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
  console.log('판정 ──────────────────────────────────────────────────────');
  ok(rows.length > 0, `[1] 주입 대상이 실재한다 — ${rows.length}자리`);
  ok(rows.every((r) => r.splitD2),
    `[2] 심는 것 자체는 **먹는다** — 심은 직후 D2 조건이 켜진 자리 ${rows.filter((r) => r.splitD2).length}/${rows.length}`);
  ok(rows.every((r) => !r.keptS),
    '[3] ⚑ 뿌리 — **다음 라운드트립에는 심은 <s> 가 없다** '
    + `${rows.filter((r) => !r.keptS).length}/${rows.length}자리 `
    + '(게임 루프가 그 노드의 내용을 통째로 다시 쓴다)');
  ok(rows.every((r) => !r.keptD2),
    `[4] 그래서 SCAN 시점의 D2 는 **0건** — 시험이 «영원히 초록» 이었다 ${rows.filter((r) => !r.keptD2).length}/${rows.length}`);
  ok(rows.every((r) => r.atomicD2),
    `[5] 처방 ⓐ — 한 evaluate 안에서 심고 재면 D2 가 **그대로 켜진다** ${rows.filter((r) => r.atomicD2).length}/${rows.length} `
    + '(축은 살아 있다 · 죽은 것은 시험뿐이다)');

  console.log(`\nPROBE435 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROBE435 CRASH', e); process.exit(2); });
