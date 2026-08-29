#!/usr/bin/env node
/* 404 프로브 — 07 스킬·26 동료·50 코스튬 시트의 **요소별** «스크롤 전 보임» 을 잰다.
 *
 * `tools/probe351b.js` 는 액션 버튼 «한 줄» 만 본다(351 5회차가 그 한 줄을 가리려고 만든 자다).
 * 404 는 «버튼이 보이는가» 로 끝나면 안 된다 — 버튼을 살리려고 격자를 줄였으니 **격자 위아래의
 * 다른 부품이 새로 밀려나지 않았는지**까지 같은 자로 확인해야 한다.
 *
 * 재는 것 (시트 3종 × 2280 / 1920 / 1600):
 *   A 시트·뷰포트·콘텐츠 · 스크롤 여유
 *   B 요소별 «스크롤 전» 보임 비율 — 헤더 · 장착 슬롯 패널 · 격자 · 총효과 · 버튼 2개
 *   C 판정 — 1600 에서 시트 스크롤 여유 0 이고 전 요소 100% 보임인가
 *   D 2280·1920 대조 — 같은 값이 나오나(회귀 기준선)
 *
 * 실행: node tools/probe404.js [--json <경로>]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

const SIZES = [[1080, 2280], [1080, 1920], [1080, 1600]];
const TABS = [
  { key: 'sk', sheet: '#bSk', name: '스킬' },
  { key: 'pet', sheet: '#bPet', name: '펫' },
  { key: 'cos', sheet: '#bCos', name: '코스튬' },
];

async function fresh(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page };
}

async function settle(page) {
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(180);
}

const measure = (sheetSel) => {
  const sheet = document.querySelector(sheetSel);
  if (!sheet) return { err: 'no sheet ' + sheetSel };
  const sc = sheet.querySelector('.shsc');
  if (!sc) return { err: 'no .shsc in ' + sheetSel };
  const bar = sheet.querySelector('.stabs');
  const r = (e) => { const b = e.getBoundingClientRect(); return { y: +b.y.toFixed(1), h: +b.height.toFixed(1), b: +b.bottom.toFixed(1) }; };
  const scR = r(sc), barR = bar ? r(bar) : null;
  const parts = [];
  const push = (name, el) => {
    if (!el) { parts.push({ name, err: 'missing' }); return; }
    const b = r(el);
    const v0 = Math.max(b.y, scR.y), v1 = Math.min(b.b, scR.b);
    const visSc = Math.max(0, v1 - v0);
    const ov = barR ? Math.max(0, Math.min(v1, barR.b) - Math.max(v0, barR.y)) : 0;
    const vis = Math.max(0, visSc - ov);
    parts.push({ name, y: b.y, b: b.b, h: b.h, visPct: +(b.h ? (vis / b.h) * 100 : 0).toFixed(1) });
  };
  push('헤더 .sk-head', sheet.querySelector('.sk-head'));
  push('장착 패널 .sk-eqp', sheet.querySelector('.sk-eqp'));
  push('격자 .sk-gp', sheet.querySelector('.sk-gp'));
  push('총효과 .sk-tot', sheet.querySelector('.sk-tot'));
  [...sheet.querySelectorAll('.sk-btn')].forEach((el, i) => push('액션 버튼 ' + (i + 1) + ' .sk-btn', el));
  return {
    sheet: r(sheet), shsc: scR,
    scrollH: sc.scrollHeight, clientH: sc.clientHeight, slack: sc.scrollHeight - sc.clientHeight,
    gpSlack: (() => { const g = sheet.querySelector('.sk-gp'); return g ? g.scrollHeight - g.clientHeight : null; })(),
    parts,
  };
};

(async () => {
  const browser = await launch(chromium);
  const out = [];
  for (const [w, h] of SIZES) {
    for (const t of TABS) {
      const { ctx, page } = await fresh(browser, w, h);
      await page.click('.tab[data-t="hero"]', { timeout: 4000, force: true }).catch(() => {});
      await page.waitForTimeout(450);
      await page.evaluate((k) => { const el = document.querySelector(`#eqTabs [data-eqtab="${k}"]`); if (el) el.click(); }, t.key);
      await page.waitForTimeout(500);
      await settle(page);
      out.push({ frame: `${w}x${h}`, name: t.name, m: await page.evaluate(measure, t.sheet) });
      await ctx.close();
    }
  }
  await browser.close();

  let pass = 0, tot = 0;
  const ck = (label, cond, detail) => { tot++; if (cond) pass++; console.log(`  ${cond ? 'ok ' : '✗  '} ${label} — ${detail}`); };

  console.log('[A] 시트·뷰포트·콘텐츠');
  for (const o of out) {
    if (o.m.err) { console.log(`  ?? ${o.frame} ${o.name} — ${o.m.err}`); continue; }
    console.log(`  ${o.frame} ${o.name}: 시트 ${o.m.sheet.y}..${o.m.sheet.b}(h${o.m.sheet.h}) · 뷰포트 h${o.m.clientH} · 콘텐츠 ${o.m.scrollH} · 시트 스크롤 여유 ${o.m.slack}px · 격자 스크롤 여유 ${o.m.gpSlack}px`);
  }
  console.log('[B] 스크롤 «전» 요소별 보임 비율');
  for (const o of out) {
    if (o.m.err) continue;
    console.log(`  · ${o.frame} ${o.name}`);
    for (const p of o.m.parts) console.log(p.err ? `      ${p.name}: ${p.err}` : `      ${p.name}: ${p.y}..${p.b} · 보임 ${p.visPct}%`);
  }
  console.log('[C] 판정 — 1600 에서 «시트 스크롤 0 · 전 요소 100% 보임»');
  for (const o of out.filter((x) => x.frame === '1080x1600')) {
    if (o.m.err) continue;
    ck(`1600 ${o.name} 시트 스크롤 여유 0`, o.m.slack === 0, `여유 ${o.m.slack}px (콘텐츠 ${o.m.scrollH} vs 뷰포트 ${o.m.clientH})`);
    const bad = o.m.parts.filter((p) => !p.err && p.visPct < 99.5);
    ck(`1600 ${o.name} 전 요소 100% 보임`, bad.length === 0, bad.length ? bad.map((p) => p.name + ' ' + p.visPct + '%').join(' · ') : '전부 100%');
    ck(`1600 ${o.name} 격자는 그대로 스크롤러다(넘치는 칸은 격자 안에서 본다)`, o.m.gpSlack > 0, `격자 여유 ${o.m.gpSlack}px`);
  }
  console.log('[D] 2280·1920 대조');
  for (const o of out.filter((x) => x.frame !== '1080x1600')) {
    if (o.m.err) continue;
    ck(`${o.frame} ${o.name} 시트 스크롤 여유 0`, o.m.slack === 0, `여유 ${o.m.slack}px`);
    const bad = o.m.parts.filter((p) => !p.err && p.visPct < 99.5);
    ck(`${o.frame} ${o.name} 전 요소 100% 보임`, bad.length === 0, bad.length ? bad.map((p) => p.name + ' ' + p.visPct + '%').join(' · ') : '전부 100%');
  }
  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(out, null, 2));
  console.log(`\nPROBE404 ${pass}/${tot} ${pass === tot ? 'PASS' : 'FAIL'}`);
})();
