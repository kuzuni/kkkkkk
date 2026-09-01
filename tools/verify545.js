#!/usr/bin/env node
/* 게이트 — 작업 545 「`tools/audit148.js` 오프너 스코프 구멍」
 *
 *   node tools/verify545.js
 *
 * 545 의 본체는 «이름 하나» 가 아니라 **침묵**이다 — `catch (_) {}` 가 죽은 오프너를 삼켜
 * 89 유물 페이지가 한 번도 스캔된 적 없는데도 출력은 «총 0건» 으로 «전수 감사» 처럼 읽혔다.
 * 그래서 이 자는 이름을 문자열로 비교하지 않는다(그러면 다음 개명 때 똑같이 굳는다).
 * **목록에 적힌 오프너를 제품에게 직접 물어보고**, 감사가 자기 스코프를 정직하게 찍는지를 본다.
 *
 *   [A] 목록 파싱 — `audit148.js` 의 오프너 배열을 읽는다(자에 손으로 다시 안 적는다 · 402 «표 두 벌» 방지).
 *   [B] 목록의 오프너가 **전부 제품에서 살아 있다**(호출해도 안 던진다). 개명이 생기면 여기가 빨개진다.
 *   [C] 그 목록이 **유물 페이지(#relw)를 실제로 연다** = 545 가 뚫은 구멍이 다시 막혀 있다.
 *       (이름이 아니라 «열리는가» 로 묻는다 — 다음에 또 개명돼도 뜻이 안 변한다)
 *   [D] `audit148.js` 를 실제로 돌려 «열지 못한 오프너 0건» 을 찍고 **종료 코드 0** 으로 끝난다.
 *   [R] 되돌림 시험 — 오프너 하나를 죽은 이름으로 바꾼 **사본**은 «열지 못한 오프너 1건» 을 찍고
 *       **종료 코드 1** 로 끝난다. 세는 코드가 장식이 아님을 못박는다(무르게 풀지 않았다는 증거).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const AUDIT = path.join(__dirname, 'audit148.js');
const URL = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined ? ' — ' + d : '')); };

/* audit148.js 소스에서 오프너 배열을 읽는다 — 자가 목록을 따로 들고 있으면 그 사본이 또 썩는다. */
function readOpeners(src) {
  const m = src.match(/const\s+openers\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!m) return null;
  return m[1].match(/'([^']*)'|"([^"]*)"/g) ? m[1].match(/'([^']*)'|"([^"]*)"/g).map(s => s.slice(1, -1)) : [];
}

/* audit148 계열 스크립트를 한 번 돌리고 stdout·종료 코드를 돌려준다. */
function run(file) {
  try {
    const out = execFileSync(process.execPath, [file], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

(async () => {
  console.log('== VERIFY545 — audit148 오프너 스코프 정직성 ==\n');
  const src = fs.readFileSync(AUDIT, 'utf8');

  /* [A] */
  const openers = readOpeners(src);
  ok(Array.isArray(openers) && openers.length >= 5, '[A1] audit148.js 에서 오프너 목록을 읽었다',
     openers ? openers.length + '개' : '못 읽음');
  /* ⚠ 소스 전체가 아니라 **목록**만 본다 — 왜 이 자가 생겼는지 적은 주석에는 옛 이름이 나온다
     (이력을 지우면 다음 세션이 같은 함정을 다시 판다. 굳는 것은 «목록» 이지 «설명» 이 아니다). */
  ok(openers && !openers.some(o => /openRelicPage/.test(o)), '[A2] 오프너 목록에 죽은 이름 openRelicPage 가 없다',
     (openers || []).join(' · '));
  ok(/dead\s*\.\s*push|dead\.push/.test(src) && /열지 못한 오프너/.test(src),
     '[A3] 오프너 실패를 세어 보고하는 코드가 있다(침묵 금지)');

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1300);
  await page.evaluate(() => document.fonts.ready);

  /* [B]·[C] — 목록을 제품에게 직접 물어본다. */
  const threw = [];
  let relOpened = false;
  for (const o of (openers || [])) {
    try { await page.evaluate(o); } catch (e) { threw.push(o + ' → ' + String(e.message || e).split('\n')[0]); continue; }
    await page.waitForTimeout(250);
    if (await page.evaluate(() => { const n = document.getElementById('relw'); return !!n && n.classList.contains('on'); }))
      relOpened = true;
    try { await page.evaluate(() => { closeModal(); gmCloseAll(); }); } catch (_) {}
    await page.waitForTimeout(120);
  }
  ok(threw.length === 0, '[B] 목록의 오프너가 전부 제품에서 살아 있다', threw.join(' · ') || (openers || []).length + '개 전부 통과');
  ok(relOpened, '[C] 그 목록이 89 유물 페이지(#relw)를 실제로 연다 = 감사 스코프 안에 있다');
  await browser.close();

  /* [D] 실제 실행 */
  const real = run(AUDIT);
  const line = (real.out.match(/열지 못한 오프너 .*/) || [''])[0].trim();
  ok(/열지 못한 오프너 0건/.test(real.out), '[D1] audit148 이 «열지 못한 오프너 0건» 을 찍는다', line || '(줄 없음)');
  ok(real.code === 0, '[D2] 종료 코드 0', 'code=' + real.code);

  /* [R] 되돌림 시험 — 오프너 하나를 죽은 이름으로 바꾼 사본 */
  const tmp = path.join(__dirname, `.tmp545-deadopener-${process.pid}.js`);
  let r = { code: -1, out: '' };
  try {
    const live = (openers || []).find(o => o !== 'openRelicPageXX()') || 'openRelw()';
    fs.writeFileSync(tmp, src.replace("'" + live + "'", "'openRelicPageXX()'"));
    r = run(tmp);
  } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  const rline = (r.out.match(/열지 못한 오프너 .*/) || [''])[0].trim();
  ok(/열지 못한 오프너 1건/.test(r.out), '[R1] 죽은 이름을 한 개 심으면 «1건» 으로 잡힌다', rline || '(줄 없음)');
  ok(r.code === 1, '[R2] 그 사본은 종료 코드 1 로 끝난다', 'code=' + r.code);
  ok(/전수가 아니다/.test(r.out), '[R3] 그때 «총 n건» 이 전수가 아님을 같이 찍는다');

  console.log(`\nVERIFY545 ${pass}/${pass + fail}` + (fail ? '  ← FAIL ' + fail : ''));
  process.exit(fail ? 1 : 0);
})();
