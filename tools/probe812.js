#!/usr/bin/env node
/* 작업 812 재현기 — 「20 종합스탯 리스트의 스크롤 뷰포트 높이가 행 피치의 배수가 아니라
 *                     마지막 행이 글리프 한복판에서 잘린다」(754 4회차 비평 CB·CC 등재)
 *
 *   node tools/probe812.js
 *
 * ⚑ 338 규칙 — **처방 전에 재현**. 등재문은 처방 갈래 셋(ⓐ 피치 배수 스냅 · ⓑ 하단 페이드 ·
 *   ⓒ 스크롤바)을 적어 두었지만, 그중 무엇이 옳은지는 **레퍼런스가 이 자리를 어떻게 끊는가**
 *   에 달려 있다. 그래서 이 자는 두 가지를 같이 찍는다:
 *     [1] 프레임 5종에서 `.spc-list` 뷰포트 높이 · 콘텐츠 높이 · **마지막 행의 남은 높이**
 *     [2] 레퍼런스 자신의 남은 높이 — 측정표 20 §7-1 정오표(`docs/measure/20-*.md`)가 적어 둔
 *         «ref y977–1736(h760) · 상단 패딩 23 · 13행이 16px 노출된 채 클리핑» 을 산수로 재확인
 *
 * ⚠ 이 자는 **판정하지 않는다**(초록/빨강은 «관측에 성공했는가» 다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

const FRAMES = [1600, 1841, 1920, 2280, 2600];
const PITCH = 60;                       /* 측정표 20 §7-2 «행 피치 60px» */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const r1 = v => +v.toFixed(1);

/* 리스트를 «설계 px» 으로 읽는다 — `fit()` 이 뷰포트에 맞춰 스케일하므로 화면 px 을 그대로 쓰면 안 된다 */
const READ = () => {
  const app = document.getElementById('app').getBoundingClientRect();
  const sc = app.width / 1080;
  const el = document.getElementById('spcList');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const rows = [...el.querySelectorAll('.spc-row')];
  const rr = rows.length ? rows[0].getBoundingClientRect() : null;
  return {
    frameH: +(app.height / sc).toFixed(1),
    top: +((r.y - app.y) / sc).toFixed(1),
    h: +(r.height / sc).toFixed(1),
    padTop: +(parseFloat(cs.paddingTop) || 0).toFixed(1),
    rows: rows.length,
    rowH: rr ? +(rr.height / sc).toFixed(1) : null,
    scrollH: +(el.scrollHeight).toFixed(1),
    clientH: +(el.clientHeight).toFixed(1),
  };
};

(async () => {
  console.log('[0] 소스 — 지금 높이를 정하는 한 줄');
  const code = fs.readFileSync(SRC, 'utf8');
  const decl = (code.match(/\.spc-list\{[^}]*\}/) || [''])[0].replace(/\s+/g, ' ');
  ok(!!decl, '0a `.spc-list` 선언', decl.slice(0, 160));
  ok(/height:min\(/.test(decl), '0b 높이가 `min(상수, calc(100% − …))` 꼴이다 — 피치와 무관하다',
     (decl.match(/height:[^;]+/) || [''])[0]);

  console.log('\n[1] 레퍼런스 자신은 이 자리를 어떻게 끊는가 (측정표 20 §7-1 정오표)');
  const mt = fs.readFileSync(path.resolve(__dirname, '../docs/measure/20-프로필팝업스펙정보.md'), 'utf8');
  const hasErr = /y\s*\*\*?977–1736/.test(mt) || /977..1736/.test(mt);
  ok(hasErr, '1a 측정표가 ref 리스트 bbox 를 **y977–1736(h760)** 으로 정정해 두었다',
     hasErr ? '§7-1 정오표' : '못 찾음');
  /* ref 산수 — 1행 밴드 시작 y1000 · 피치 60 · 하변 1736 */
  const refRem = 1736 - (1000 + PITCH * 12);
  ok(true, '1b **ref 의 마지막(13) 행 남은 높이**', `1736 − (1000 + 60×12) = ${refRem}px  (측정표 본문 «16px 노출된 채 클리핑» 과 일치)`);
  ok(true, '1c ref 상단 패딩', `1000 − 977 = ${1000 - 977}px`);
  ok(refRem > 0 && refRem < PITCH, '1d ⚑ **레퍼런스도 마지막 행을 자른다** — «자름 0» 은 ref 가 아니다',
     `${refRem}px / 피치 ${PITCH}`);

  const browser = await launch(chromium, { executablePath: '/opt/pw-browsers/chromium' });
  console.log('\n[2] 우리 — 프레임 5종의 뷰포트 높이와 남은 높이');
  const out = [];
  for (const H of FRAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof openProfile === 'function' && typeof openSpec === 'function');
    await page.waitForTimeout(600);
    await page.evaluate(() => { openProfile(); });
    await page.waitForTimeout(250);
    await page.evaluate(() => { openSpec(); });
    await page.waitForTimeout(400);
    const m = await page.evaluate(READ);
    await ctx.close();
    if (!m) { ok(false, `2-${H} 리스트를 못 읽었다`); continue; }
    const rem = r1((m.h - m.padTop) % PITCH);          /* 마지막 행에서 보이는 높이 */
    const full = Math.floor((m.h - m.padTop) / PITCH); /* 온전히 보이는 행 수 */
    out.push({ H, ...m, rem, full });
    ok(true, `2-${H} 뷰포트 h ${m.h} · 패딩 ${m.padTop} · 온전한 행 ${full} · **남은 높이 ${rem}px**`,
       `${rem === refRem || rem === refRem + 1 ? 'ref 와 같다' : 'ref ' + refRem + 'px 과 ' + r1(rem - refRem) + 'px 어긋난다'}`);
  }

  console.log('\n  프레임 | 뷰포트 h | 온전한 행 | 남은 높이 | ref(16~17) 대비');
  out.forEach(o => console.log('  ' + String(o.H).padStart(6) + ' | ' + String(o.h).padStart(8)
    + ' | ' + String(o.full).padStart(9) + ' | ' + String(o.rem).padStart(9)
    + ' | ' + (Math.abs(o.rem - refRem) <= 1 ? '   Δ0 (ref 와 같은 끊김)' : '  Δ' + r1(o.rem - refRem))));

  const rems = out.map(o => o.rem);
  ok(true, '3a 남은 높이가 프레임마다 **다르다**(= 그릇 높이가 피치에 안 물려 있다)',
     rems.join(' · ') + (new Set(rems).size > 1 ? '  ← 프레임 의존' : '  (한 값)'));
  const off = out.filter(o => Math.abs(o.rem - refRem) > 1);
  ok(true, '3b ref 끊김(16~17px)에서 벗어난 프레임', off.length ? off.map(o => `${o.H}(${o.rem}px)`).join(' · ') : '없음');
  ok(true, '3c ⚑ **결손의 정체** — «자름» 이 아니라 «자르는 양이 프레임마다 다르다»',
     `최대 ${Math.max(...rems)}px(피치의 ${Math.round(Math.max(...rems) / PITCH * 100)}%) ↔ 최소 ${Math.min(...rems)}px`);

  await browser.close();
  console.log(`\n=== probe812: ${pass}/${pass + fail} ===`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
