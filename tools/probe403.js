#!/usr/bin/env node
/* 403 프로브 — «06 장비 시트가 9:13.3 에서 스크롤 없이는 다 안 보인다» 를 자로 못박는다.
 *
 * 338 규칙: 처방 전에 재현부터. 등재문(PROGRESS 403)의 산수는 상수에서 나온 값이고
 * 여기서는 **실제로 찍힌 rect** 로 같은 값을 확인한다.
 *
 * 재는 것 (06 장비 시트 × 2280 / 1920 / 1600):
 *   A 시트·뷰포트·콘텐츠 — .eqp / .eqp>.shsc / .eqp .shsc-in · 스크롤 여유
 *   B 요소별 «스크롤 전» 보임 비율 — 리본 · 부위 슬롯 3칸 · 스탯 알약 2개 · 카드 컨테이너
 *   C 판정 — 1600 에서 스크롤 여유 0(= 스크롤 없이 전부 보임)인가
 *   D 2280·1920 대조 — 원래도 스크롤이 없었나(회귀 기준선)
 *
 * 실행: node tools/probe403.js [--json <경로>]
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const FILE = 'file://' + path.resolve(__dirname, '../index.html');
const JSONOUT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();

const SIZES = [[1080, 2280], [1080, 1920], [1080, 1600]];

async function fresh(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page };
}

/* 60 쥬시 개봉 연출 중에 재면 scale 구간이 잡힌다(probe351b 와 같은 처방) */
async function settle(page) {
  await page.waitForFunction(() => {
    const app = document.getElementById('app'); if (!app) return true;
    return !app.getAnimations({ subtree: true })
      .some((a) => /^jz/.test(a.animationName || '') && a.playState === 'running'
        && a.effect && a.effect.getTiming().iterations !== Infinity);
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(180);
}

const measure = () => {
  const sheet = document.querySelector('.eqp');
  if (!sheet) return { err: 'no .eqp' };
  const sc = sheet.querySelector('.shsc');
  const inn = sheet.querySelector('.shsc-in');
  const bar = document.querySelector('#eqTabs');
  if (!sc) return { err: 'no .shsc in .eqp' };
  const r = (e) => { const b = e.getBoundingClientRect(); return { y: +b.y.toFixed(1), h: +b.height.toFixed(1), b: +b.bottom.toFixed(1) }; };
  const scR = r(sc);
  /* 요소별 «뷰포트 안에 보이는 세로 비율». 서브탭 바가 덮는 부분도 «안 보임» 으로 센다 */
  const barR = bar ? r(bar) : null;
  const parts = [];
  const push = (name, el) => {
    if (!el) { parts.push({ name, err: 'missing' }); return; }
    const b = r(el);
    /* «보이는 구간» 을 먼저 잘라 내고, 그 구간에서만 서브탭 바가 덮는 만큼을 뺀다.
       (요소 전체와 바의 겹침을 빼면 뷰포트 «밖» 에 있는 바까지 이중으로 세어 보임 0% 가 나온다) */
    const v0 = Math.max(b.y, scR.y), v1 = Math.min(b.b, scR.b);
    const visSc = Math.max(0, v1 - v0);
    const ov = barR ? Math.max(0, Math.min(v1, barR.b) - Math.max(v0, barR.y)) : 0;
    const vis = Math.max(0, visSc - ov);
    parts.push({ name, y: b.y, b: b.b, h: b.h, visPx: +vis.toFixed(1), visPct: +(b.h ? (vis / b.h) * 100 : 0).toFixed(1), barOverlap: +ov.toFixed(1) });
  };
  push('이름 리본 .eqrb', sheet.querySelector('.eqrb'));
  [...sheet.querySelectorAll('.eqsl')].forEach((el, i) => push('부위 슬롯 ' + (i + 1) + ' .eqsl', el));
  push('스탯 알약 a .eqst', sheet.querySelector('.eqst.a'));
  push('스탯 알약 b .eqst', sheet.querySelector('.eqst.b'));
  push('카드 컨테이너 .eqc', sheet.querySelector('.eqc'));
  return {
    frameH: window.innerHeight,
    sheet: r(sheet),
    shsc: scR,
    innH: inn ? +inn.getBoundingClientRect().height.toFixed(1) : null,
    scrollH: sc.scrollHeight, clientH: sc.clientHeight,
    slack: sc.scrollHeight - sc.clientHeight,
    bar: barR,
    parts,
  };
};

(async () => {
  const browser = await launch(chromium);
  const out = [];
  for (const [w, h] of SIZES) {
    const { ctx, page } = await fresh(browser, w, h);
    await page.click('.tab[data-t="hero"]', { timeout: 4000, force: true }).catch(() => {});
    await page.waitForTimeout(450);
    await page.evaluate(() => { const el = document.querySelector('#eqTabs [data-eqtab="eq"]'); if (el) el.click(); });
    await page.waitForTimeout(500);
    await settle(page);
    const before = await page.evaluate(measure);
    await page.evaluate(() => { const sc = document.querySelector('.eqp .shsc'); if (sc) sc.scrollTop = sc.scrollHeight; });
    await page.waitForTimeout(260);
    const after = await page.evaluate(measure);
    out.push({ frame: `${w}x${h}`, before, after });
    await ctx.close();
  }
  await browser.close();

  let pass = 0, tot = 0;
  const ck = (label, cond, detail) => { tot++; if (cond) pass++; console.log(`  ${cond ? 'ok ' : '✗  '} ${label} — ${detail}`); };

  console.log('[A] 시트·뷰포트·콘텐츠');
  for (const o of out) {
    const b = o.before;
    if (b.err) { console.log(`  ?? ${o.frame} — ${b.err}`); continue; }
    console.log(`  ${o.frame}: 시트 ${b.sheet.y}..${b.sheet.b}(h${b.sheet.h}) · 뷰포트 ${b.shsc.y}..${b.shsc.b}(h${b.clientH}) · 콘텐츠 ${b.scrollH} · 스크롤 여유 ${b.slack}px · 서브탭바 ${b.bar ? b.bar.y + '..' + b.bar.b : '—'}`);
  }
  console.log('[B] 스크롤 «전» 요소별 보임 비율(서브탭 바가 덮는 부분은 «안 보임»)');
  for (const o of out) {
    if (o.before.err) continue;
    console.log(`  · ${o.frame}`);
    for (const p of o.before.parts) {
      if (p.err) { console.log(`      ${p.name}: ${p.err}`); continue; }
      console.log(`      ${p.name}: ${p.y}..${p.b} · 보임 ${p.visPct}%${p.barOverlap ? ' · 바 겹침 ' + p.barOverlap + 'px' : ''}`);
    }
  }
  console.log('[C] 판정 — 1600 에서 «스크롤 없이 전부 보임» 인가');
  for (const o of out.filter((x) => x.frame === '1080x1600')) {
    if (o.before.err) continue;
    ck('1600 장비 시트 스크롤 여유 0(= 스크롤 자체가 없다)', o.before.slack === 0,
      `여유 ${o.before.slack}px (콘텐츠 ${o.before.scrollH} vs 뷰포트 ${o.before.clientH})`);
    for (const p of o.before.parts) {
      if (p.err) continue;
      ck(`1600 «${p.name}» 스크롤 전 100% 보임`, p.visPct >= 99.5, `보임 ${p.visPct}% (${p.y}..${p.b})`);
    }
  }
  console.log('[D] 2280·1920 대조 — 원래 스크롤이 없었나');
  for (const o of out.filter((x) => x.frame !== '1080x1600')) {
    if (o.before.err) continue;
    ck(`${o.frame} 스크롤 여유 0`, o.before.slack === 0, `여유 ${o.before.slack}px`);
    const bad = o.before.parts.filter((p) => !p.err && p.visPct < 99.5);
    ck(`${o.frame} 전 요소 100% 보임`, bad.length === 0, bad.length ? bad.map((p) => p.name + ' ' + p.visPct + '%').join(' · ') : '전부 100%');
  }
  if (JSONOUT) fs.writeFileSync(JSONOUT, JSON.stringify(out, null, 2));
  console.log(`\nPROBE403 ${pass}/${tot} ${pass === tot ? 'PASS' : 'FAIL'}`);
})();
