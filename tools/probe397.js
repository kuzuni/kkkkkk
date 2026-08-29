#!/usr/bin/env node
/* 작업 397 — «스캐너가 정말 그 화면에 도착하는가» 재현기 (측정 전용)
 *
 *   node tools/probe397.js            # scan356 SCREENS 의 단계별 도착 판정
 *   node tools/probe397.js --json
 *
 * 397 등재문의 주장은 «scan356 이 36 출석 패스를 한 번도 본 적이 없다» 였다.
 * 338·341·350 규칙대로 처방을 따르기 전에 **직접 물어서** 확인한다 —
 * 등재문은 자리 하나(SCREENS 55행)를 지목했지만, 스캐너의 단계는
 *   `page.evaluate(q => { const el = document.querySelector(q); if (el) el.click(); })`
 * 라 **셀렉터가 안 맞으면 조용히 아무 일도 안 일어난다**(예외도 안 난다).
 * 그래서 «못 가는 화면» 은 등재문이 지목한 하나가 아닐 수 있다 = 이 자가 세는 것.
 *
 * 각 단계마다 두 가지를 찍는다:
 *   resolved — 그 셀렉터가 DOM 에 있었는가 (없으면 그 단계는 **무음 실패**)
 *   moved    — 누른 뒤 화면이 실제로 바뀌었는가 (#app 의 보이는 노드 서명 변화)
 * 두 화면의 서명이 같으면 «다른 이름의 같은 화면» 을 두 번 스캔한 것이다.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { SCREENS } = require('./scan356');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const JSON_OUT = process.argv.includes('--json');

/* 화면 서명 — «보이는 노드의 선택자 + 상자» 를 접어 해시한다.
   텍스트는 안 쓴다(카운트다운·수치가 매 프레임 달라 서명이 흔들린다). */
const SIG = function () {
  const app = document.getElementById('app');
  if (!app) return 'noapp';
  let s = '';
  for (const el of app.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    s += (el.id || el.className || el.tagName) + ':' + Math.round(r.x) + ',' + Math.round(r.y)
       + ',' + Math.round(r.width) + ',' + Math.round(r.height) + ';';
  }
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return String(h >>> 0) + '/' + s.length;
};

(async () => {
  const browser = await launch(chromium);
  const rows = [];
  for (const [label, steps] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const st = [];
    try {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      let sig = await page.evaluate(SIG);
      for (const s of steps) {
        const found = await page.evaluate((q) => {
          const el = document.querySelector(q);
          if (el) el.click();
          return !!el;
        }, s);
        await page.waitForTimeout(420);
        const now = await page.evaluate(SIG);
        st.push({ sel: s, resolved: found, moved: now !== sig });
        sig = now;
      }
      await page.waitForTimeout(250);
      rows.push({ screen: label, sig: await page.evaluate(SIG), steps: st });
    } catch (e) {
      rows.push({ screen: label, err: String(e.message || e).split('\n')[0], steps: st });
    }
    await ctx.close();
  }
  await browser.close();

  /* 같은 서명 = 같은 화면을 두 번 센 것 */
  const bySig = new Map();
  for (const r of rows) if (r.sig) { if (!bySig.has(r.sig)) bySig.set(r.sig, []); bySig.get(r.sig).push(r.screen); }
  const dup = [...bySig.values()].filter((v) => v.length > 1);
  const dead = rows.filter((r) => r.steps.some((s) => !s.resolved));
  const inert = rows.filter((r) => r.steps.length && r.steps.every((s) => s.resolved) && !r.steps.some((s) => s.moved));

  if (JSON_OUT) { console.log(JSON.stringify({ rows, dup, dead: dead.map(r => r.screen) }, null, 1)); process.exit(0); }

  console.log(`[probe397] 화면 ${rows.length}개 · 무음 실패 단계를 가진 화면 ${dead.length}개 · 서명 중복 ${dup.length}묶음\n`);
  console.log('— 무음 실패(셀렉터가 DOM 에 없어 클릭이 통째로 없던 일이 된 단계) —');
  if (!dead.length) console.log('  없음');
  for (const r of dead) {
    console.log(`  ${r.screen}`);
    for (const s of r.steps) if (!s.resolved) console.log(`      ✗ ${s.sel}   (resolved=false)`);
  }
  console.log('\n— 눌렀는데 화면이 안 바뀐 단계 —');
  const nomove = rows.flatMap((r) => r.steps.filter((s) => s.resolved && !s.moved).map((s) => `  ${r.screen}: ${s.sel}`));
  console.log(nomove.length ? nomove.join('\n') : '  없음');
  console.log('\n— 서명이 같은 화면(= 실제로는 같은 자리를 두 번 스캔) —');
  if (!dup.length) console.log('  없음');
  for (const d of dup) console.log('  ' + d.join('  ==  '));
  if (inert.length) console.log('\n— 단계가 전부 resolve 됐지만 아무 것도 안 움직인 화면 —\n  ' + inert.map(r => r.screen).join('\n  '));
  process.exit(0);
})();
